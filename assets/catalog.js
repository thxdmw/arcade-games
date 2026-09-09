const GAME_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{1,63}$/;
const RUNTIME_ROOT = "/runtime/";
const RESERVED_RUNTIME_DIRECTORIES = new Set(["bios", "covers", "parents", "roms"]);
const COVER_PATTERN = /\.(png|webp|jpe?g)$/i;

function requireText(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`游戏清单字段 ${field} 不能为空`);
  }
  return value.trim();
}

function normalizeRuntimeUrl(value, field) {
  if (typeof value !== "string") return null;
  if (!value.startsWith(RUNTIME_ROOT) || value.includes("..") || value.includes("\\") || /[:?#]/.test(value)) {
    throw new TypeError(`游戏资源 ${field} 不是安全的 runtime 路径`);
  }
  return value;
}

function normalizeGame(game, index) {
  if (!game || typeof game !== "object") {
    throw new TypeError(`第 ${index + 1} 个游戏配置无效`);
  }

  const id = requireText(game.id, `games[${index}].id`);
  if (!GAME_ID_PATTERN.test(id)) {
    throw new TypeError(`游戏 ID 只能包含小写字母、数字、下划线和连字符: ${id}`);
  }

  const resourceUrls = game.resourceUrls ? Object.freeze({
    rom: normalizeRuntimeUrl(game.resourceUrls.rom, `${id}.romUrl`),
    bios: normalizeRuntimeUrl(game.resourceUrls.bios, `${id}.biosUrl`),
    parentRom: normalizeRuntimeUrl(game.resourceUrls.parentRom, `${id}.parentRomUrl`),
    cover: normalizeRuntimeUrl(game.resourceUrls.cover, `${id}.coverUrl`)
  }) : null;

  return Object.freeze({
    id,
    title: requireText(game.title, `${id}.title`),
    runtimeFolder: requireText(game.runtimeFolder ?? game.title, `${id}.runtimeFolder`),
    series: requireText(game.series, `${id}.series`),
    genre: requireText(game.genre, `${id}.genre`),
    platform: requireText(game.platform, `${id}.platform`),
    core: typeof game.core === "string" ? game.core : "fbneo",
    rom: requireText(game.rom, `${id}.rom`),
    bios: typeof game.bios === "string" && game.bios.trim() ? game.bios.trim() : null,
    parentRom: typeof game.parentRom === "string" && game.parentRom.trim() ? game.parentRom.trim() : null,
    cover: typeof game.cover === "string" && game.cover.trim() ? game.cover.trim() : null,
    year: Number.isInteger(game.year) ? game.year : null,
    description: typeof game.description === "string" ? game.description.trim() : "",
    accent: /^#[0-9a-f]{6}$/i.test(game.accent) ? game.accent : "#f1ff3f",
    featured: game.featured === true,
    enabled: game.enabled !== false,
    resourceUrls
  });
}

export function normalizeCatalog(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.games)) {
    throw new TypeError("游戏数据必须包含 games 数组");
  }

  const ids = new Set();
  const games = raw.games.map(normalizeGame).filter((game) => game.enabled);
  for (const game of games) {
    if (ids.has(game.id)) throw new TypeError(`游戏 ID 重复: ${game.id}`);
    ids.add(game.id);
  }

  return Object.freeze({ version: Number(raw.version) || 1, games: Object.freeze(games) });
}

function safeDirectoryName(entry) {
  const name = typeof entry?.name === "string" ? entry.name.trim() : "";
  if (entry?.type !== "directory" || !name || name.startsWith(".") || name.includes("/") || name.includes("\\") || name.includes("..")) return null;
  return name;
}

function safeFileName(entry, pattern) {
  const name = typeof entry?.name === "string" ? entry.name.trim() : "";
  if (entry?.type !== "file" || !pattern.test(name) || name.includes("/") || name.includes("\\") || name.includes("..")) return null;
  return name;
}

function childDirectoryUrl(parentUrl, name) {
  return `${parentUrl}${encodeURIComponent(name)}/`;
}

function childFileUrl(parentUrl, name) {
  return `${parentUrl}${encodeURIComponent(name)}`;
}

async function readDirectory(url, fetchImpl, optional = false, cacheBust = false) {
  const requestUrl = cacheBust ? `${url}${url.includes("?") ? "&" : "?"}_=${Date.now().toString(36)}` : url;
  const response = await fetchImpl(requestUrl, {
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json", "Cache-Control": "no-cache" }
  });
  if (optional && response.status === 404) return [];
  if (!response.ok) throw new Error(`ROM 目录读取失败 (${response.status})`);
  const entries = await response.json();
  if (!Array.isArray(entries)) throw new TypeError(`目录 ${url} 没有返回文件列表`);
  return entries;
}

function singleZip(entries, label, required = false) {
  const files = entries.map((entry) => safeFileName(entry, /\.zip$/i)).filter(Boolean);
  if (files.length > 1) throw new Error(`${label} 只能放一个 ZIP，当前找到：${files.join("、")}`);
  if (required && files.length === 0) throw new Error(`${label} 缺少主游戏 ZIP`);
  return files[0] ?? null;
}

function chooseCover(entries, gameName, romName) {
  const files = entries.map((entry) => safeFileName(entry, COVER_PATTERN)).filter(Boolean);
  const preferredStems = [gameName.toLocaleLowerCase("zh-CN"), romName.replace(/\.zip$/i, "").toLowerCase(), "cover"];
  return preferredStems.map((stem) => files.find((file) => file.replace(/\.[^.]+$/, "").toLocaleLowerCase("zh-CN") === stem)).find(Boolean) ?? files[0] ?? null;
}

function runtimeGameId(romName) {
  const id = romName.replace(/\.zip$/i, "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!GAME_ID_PATTERN.test(id)) throw new Error(`主游戏 ZIP 必须使用 FBNeo 英文短名称：${romName}`);
  return id;
}

function gamePresentation(gameName, id) {
  if (gameName.includes("拳皇") || id.startsWith("kof")) return { series: "拳皇", genre: "格斗", accent: "#6857ff" };
  if (gameName.includes("三国战纪") || id.startsWith("kov")) return { series: "三国战纪", genre: "动作过关", accent: "#ff6948" };
  return { series: "其它街机", genre: "街机", accent: "#2f7cff" };
}

async function scanRuntimeGame(rootUrl, gameName, fetchImpl) {
  const gameUrl = childDirectoryUrl(rootUrl, gameName);
  const gameEntries = await readDirectory(gameUrl, fetchImpl);
  const directories = new Map(gameEntries.map((entry) => [safeDirectoryName(entry), entry]).filter(([name]) => name));
  if (!directories.has("roms")) throw new Error(`${gameName} 缺少 roms 目录`);

  const romsUrl = childDirectoryUrl(gameUrl, "roms");
  const parentsUrl = childDirectoryUrl(gameUrl, "parents");
  const localBiosUrl = childDirectoryUrl(gameUrl, "bios");
  const coversUrl = childDirectoryUrl(gameUrl, "covers");
  const [romEntries, parentEntries, biosEntries, coverEntries] = await Promise.all([
    readDirectory(romsUrl, fetchImpl),
    directories.has("parents") ? readDirectory(parentsUrl, fetchImpl) : [],
    directories.has("bios") ? readDirectory(localBiosUrl, fetchImpl) : [],
    directories.has("covers") ? readDirectory(coversUrl, fetchImpl) : []
  ]);
  const rom = singleZip(romEntries, `${gameName}/roms`, true);
  const id = runtimeGameId(rom);
  const parentRom = singleZip(parentEntries, `${gameName}/parents`);
  const localBios = singleZip(biosEntries, `${gameName}/bios`);
  const cover = chooseCover(coverEntries, gameName, rom);
  const presentation = gamePresentation(gameName, id);

  return {
    id,
    title: gameName,
    runtimeFolder: gameName,
    series: presentation.series,
    genre: presentation.genre,
    platform: "FBNeo",
    core: "fbneo",
    rom,
    bios: localBios,
    parentRom,
    cover,
    description: `主游戏资源：${rom}${parentRom ? `；父 ROM：${parentRom}` : ""}`,
    accent: presentation.accent,
    resourceUrls: {
      rom: childFileUrl(romsUrl, rom),
      bios: localBios ? childFileUrl(localBiosUrl, localBios) : null,
      parentRom: parentRom ? childFileUrl(parentsUrl, parentRom) : null,
      cover: cover ? childFileUrl(coversUrl, cover) : null
    }
  };
}

export async function listRuntimeGameNames(rootUrl = RUNTIME_ROOT, fetchImpl = fetch) {
  const normalizedRoot = rootUrl.endsWith("/") ? rootUrl : `${rootUrl}/`;
  const rootEntries = await readDirectory(normalizedRoot, fetchImpl, true, true);
  return rootEntries.map(safeDirectoryName).filter((name) => name && !RESERVED_RUNTIME_DIRECTORIES.has(name.toLowerCase()));
}

export async function gameFromRuntime(gameName, rootUrl = RUNTIME_ROOT, fetchImpl = fetch) {
  const normalizedName = safeDirectoryName({ name: gameName, type: "directory" });
  if (!normalizedName) throw new TypeError("游戏目录名称无效");
  const normalizedRoot = rootUrl.endsWith("/") ? rootUrl : `${rootUrl}/`;
  return normalizeCatalog({ version: 4, games: [await scanRuntimeGame(normalizedRoot, normalizedName, fetchImpl)] }).games[0];
}

export async function catalogFromRuntime(rootUrl = RUNTIME_ROOT, fetchImpl = fetch) {
  const gameNames = await listRuntimeGameNames(rootUrl, fetchImpl);
  const results = await Promise.allSettled(gameNames.map((gameName) => gameFromRuntime(gameName, rootUrl, fetchImpl)));
  const games = results.filter((result) => result.status === "fulfilled").map((result) => result.value);
  if (gameNames.length > 0 && games.length === 0) throw results[0].reason;

  return normalizeCatalog({ version: 4, games });
}

export async function loadCatalog(url = RUNTIME_ROOT, fetchImpl = fetch) {
  return catalogFromRuntime(url, fetchImpl);
}

export function getGameResourceUrls(game) {
  if (!game.resourceUrls) throw new TypeError(`游戏 ${game.id} 缺少 runtime 资源路径`);
  return game.resourceUrls;
}

async function resourceExists(url, fetchImpl) {
  try {
    const response = await fetchImpl(url, {
      method: "HEAD",
      cache: "no-store",
      credentials: "same-origin"
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function probeGameResources(game, fetchImpl = fetch) {
  const urls = getGameResourceUrls(game);
  const required = [
    ["ROM", urls.rom],
    ...(urls.bios ? [["BIOS", urls.bios]] : []),
    ...(urls.parentRom ? [["父 ROM", urls.parentRom]] : [])
  ];
  const checks = await Promise.all(required.map(async ([label, url]) => ({ label, url, exists: await resourceExists(url, fetchImpl) })));
  return Object.freeze({ ready: checks.every((item) => item.exists), missing: checks.filter((item) => !item.exists), urls });
}

export function stableNumericId(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
