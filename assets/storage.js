const DATABASE_NAME = "arcade-vault";
const DATABASE_VERSION = 1;

export class SaveRepository {
  async ready() { throw new Error("SaveRepository.ready 尚未实现"); }
  async saveState() { throw new Error("SaveRepository.saveState 尚未实现"); }
  async getLatestState() { throw new Error("SaveRepository.getLatestState 尚未实现"); }
  async saveNative() { throw new Error("SaveRepository.saveNative 尚未实现"); }
  async recordPlayed() { throw new Error("SaveRepository.recordPlayed 尚未实现"); }
  async getRecent() { throw new Error("SaveRepository.getRecent 尚未实现"); }
}

export async function toUint8Array(value) {
  if (value instanceof Uint8Array) return new Uint8Array(value);
  if (value instanceof ArrayBuffer) return new Uint8Array(value.slice(0));
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
  }
  if (typeof Blob !== "undefined" && value instanceof Blob) return new Uint8Array(await value.arrayBuffer());
  throw new TypeError("存档内容不是受支持的二进制数据");
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error), { once: true });
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", resolve, { once: true });
    transaction.addEventListener("error", () => reject(transaction.error), { once: true });
    transaction.addEventListener("abort", () => reject(transaction.error), { once: true });
  });
}

export class IndexedDbSaveRepository extends SaveRepository {
  constructor(indexedDb = globalThis.indexedDB) {
    super();
    if (!indexedDb) throw new Error("当前浏览器不支持 IndexedDB");
    this.indexedDb = indexedDb;
    this.databasePromise = null;
    this.persistent = true;
  }

  async ready() {
    await this.#database();
    return this;
  }

  async #database() {
    if (this.databasePromise) return this.databasePromise;
    this.databasePromise = new Promise((resolve, reject) => {
      const request = this.indexedDb.open(DATABASE_NAME, DATABASE_VERSION);
      request.addEventListener("upgradeneeded", () => {
        const database = request.result;
        if (!database.objectStoreNames.contains("states")) database.createObjectStore("states", { keyPath: "gameId" });
        if (!database.objectStoreNames.contains("nativeSaves")) database.createObjectStore("nativeSaves", { keyPath: "gameId" });
        if (!database.objectStoreNames.contains("activity")) database.createObjectStore("activity", { keyPath: "gameId" });
      });
      request.addEventListener("success", () => resolve(request.result), { once: true });
      request.addEventListener("error", () => reject(request.error), { once: true });
      request.addEventListener("blocked", () => reject(new Error("IndexedDB 升级被其它页面阻塞")), { once: true });
    });
    return this.databasePromise;
  }

  async #put(storeName, value) {
    const database = await this.#database();
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(value);
    await transactionDone(transaction);
    return value;
  }

  async #get(storeName, key) {
    const database = await this.#database();
    const transaction = database.transaction(storeName, "readonly");
    return requestResult(transaction.objectStore(storeName).get(key));
  }

  async saveState(gameId, payload) {
    const data = await toUint8Array(payload.state);
    return this.#put("states", {
      gameId,
      data,
      screenshot: typeof payload.screenshot === "string" ? payload.screenshot : null,
      format: typeof payload.format === "string" ? payload.format : null,
      updatedAt: Date.now(),
      coreVersion: "fbneo-4.2.3"
    });
  }

  async getLatestState(gameId) {
    return (await this.#get("states", gameId)) ?? null;
  }

  async saveNative(gameId, payload) {
    const data = await toUint8Array(payload.save);
    return this.#put("nativeSaves", { gameId, data, updatedAt: Date.now(), coreVersion: "fbneo-4.2.3" });
  }

  async recordPlayed(gameId) {
    return this.#put("activity", { gameId, playedAt: Date.now() });
  }

  async getRecent(limit = 6) {
    const database = await this.#database();
    const transaction = database.transaction("activity", "readonly");
    const values = await requestResult(transaction.objectStore("activity").getAll());
    return values.sort((left, right) => right.playedAt - left.playedAt).slice(0, limit);
  }
}

export class MemorySaveRepository extends SaveRepository {
  constructor() {
    super();
    this.states = new Map();
    this.nativeSaves = new Map();
    this.activity = new Map();
    this.persistent = false;
  }
  async ready() { return this; }
  async saveState(gameId, payload) { const value = { gameId, data: await toUint8Array(payload.state), updatedAt: Date.now() }; this.states.set(gameId, value); return value; }
  async getLatestState(gameId) { return this.states.get(gameId) ?? null; }
  async saveNative(gameId, payload) { const value = { gameId, data: await toUint8Array(payload.save), updatedAt: Date.now() }; this.nativeSaves.set(gameId, value); return value; }
  async recordPlayed(gameId) { const value = { gameId, playedAt: Date.now() }; this.activity.set(gameId, value); return value; }
  async getRecent(limit = 6) { return [...this.activity.values()].sort((left, right) => right.playedAt - left.playedAt).slice(0, limit); }
}

export async function createSaveRepository() {
  try {
    return await new IndexedDbSaveRepository().ready();
  } catch (error) {
    console.warn("IndexedDB 不可用，本次会话改用内存存档", error);
    return new MemorySaveRepository().ready();
  }
}
