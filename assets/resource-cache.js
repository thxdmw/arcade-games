const DEFAULT_CACHE_LIMIT = 1024 * 1024 * 1024;
export const EMULATOR_ASSET_REVISION = "fbneo-kovplus2007-b2ee0885-v1";

const VERSIONED_EMULATOR_FILES = Object.freeze({
  "emulator.min.js": "/emulatorjs/data/emulator.min.js",
  "emulator.min.css": "/emulatorjs/data/emulator.min.css",
  "fbneo.json": "/emulatorjs/data/cores/reports/fbneo.json",
  "fbneo-wasm.data": "/emulatorjs/data/cores/fbneo-wasm.data",
  "fbneo-legacy-wasm.data": "/emulatorjs/data/cores/fbneo-legacy-wasm.data",
  "fbneo-thread-wasm.data": "/emulatorjs/data/cores/fbneo-thread-wasm.data",
  "fbneo-thread-legacy-wasm.data": "/emulatorjs/data/cores/fbneo-thread-legacy-wasm.data"
});

export function versionedEmulatorAsset(path) {
  return `${path}?revision=${encodeURIComponent(EMULATOR_ASSET_REVISION)}`;
}

export function configureEmulatorResourceCache(target = globalThis) {
  // EmulatorJS 的调试模式会无条件重新下载 ROM；生产和本地调试都必须关闭这条旁路。
  target.EJS_DEBUG_XX = false;
  target.EJS_CacheLimit = DEFAULT_CACHE_LIMIT;
  // nginx 会长期缓存模拟器文件；核心升级必须换 URL，否则旧报告会让 IndexedDB 继续命中旧核心。
  target.EJS_paths = {
    ...target.EJS_paths,
    ...Object.fromEntries(Object.entries(VERSIONED_EMULATOR_FILES).map(([name, path]) => [name, versionedEmulatorAsset(path)]))
  };
}

export async function requestPersistentBrowserStorage(storage = globalThis.navigator?.storage) {
  if (!storage?.persist) return false;
  try {
    if (typeof storage.persisted === "function" && await storage.persisted()) return true;
    return await storage.persist();
  } catch {
    return false;
  }
}
