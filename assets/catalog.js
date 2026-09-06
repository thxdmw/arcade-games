const DEFAULT_RESOURCES = Object.freeze({
  roms: "/roms/",
  bios: "/bios/",
  covers: "/covers/"
});

const GAME_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{1,63}$/;

function requireText(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`游戏清单字段 ${field} 不能为空`);
  }
  return value.trim();
}

function normalizeBasePath(value, fallback, field) {
  const candidate = typeof value === "string" && value.trim() ? value.trim() : fallback;
  if (!candidate.startsWith("/") || candidate.includes("..") || candidate.includes(":")) {
    throw new TypeError(`资源目录 ${field} 必须是站点内绝对路径`);
  }
  return candidate.endsWith("/") ? candidate : `${candidate}/`;
}

export function resolveResourcePath(basePath, fileName) {
  const file = requireText(fileName, "资源文件名");
  if (file.startsWith("/") || file.includes("..") || file.includes("\\") || /[:?#]/.test(file)) {
    throw new TypeError(`不安全的资源路径: ${file}`);
  }

  const encodedFile = file.split("/").map((part) => encodeURIComponent(part)).join("/");
  return `${basePath}${encodedFile}`;
}

function normalizeGame(game, index) {
  if (!game || typeof game !== "object") {
    throw new TypeError(`第 ${index + 1} 个游戏配置无效`);
  }

  const id = requireText(game.id, `games[${index}].id`);
  if (!GAME_ID_PATTERN.test(id)) {
    throw new TypeError(`游戏 ID 只能包含小写字母、数字、下划线和连字符: ${id}`);
  }

  return Object.freeze({
    id,
    title: requireText(game.title, `${id}.title`),
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
    enabled: game.enabled !== false
  });
}

export function normalizeCatalog(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.games)) {
    throw new TypeError("games.json 必须包含 games 数组");
  }

  const resources = Object.freeze({
    roms: normalizeBasePath(raw.resources?.roms, DEFAULT_RESOURCES.roms, "roms"),
    bios: normalizeBasePath(raw.resources?.bios, DEFAULT_RESOURCES.bios, "bios"),
    covers: normalizeBasePath(raw.resources?.covers, DEFAULT_RESOURCES.covers, "covers")
  });
  const ids = new Set();
  const games = raw.games.map(normalizeGame).filter((game) => game.enabled);
  for (const game of games) {
    if (ids.has(game.id)) throw new TypeError(`游戏 ID 重复: ${game.id}`);
    ids.add(game.id);
  }

  return Object.freeze({ version: Number(raw.version) || 1, resources, games: Object.freeze(games) });
}

export async function loadCatalog(url = "/config/games.json", fetchImpl = fetch) {
  const response = await fetchImpl(url, { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) throw new Error(`游戏清单加载失败 (${response.status})`);
  return normalizeCatalog(await response.json());
}

export function getGameResourceUrls(game, resources) {
  return Object.freeze({
    rom: resolveResourcePath(resources.roms, game.rom),
    bios: game.bios ? resolveResourcePath(resources.bios, game.bios) : null,
    parentRom: game.parentRom ? resolveResourcePath(resources.roms, game.parentRom) : null,
    cover: game.cover ? resolveResourcePath(resources.covers, game.cover) : null
  });
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

export async function probeGameResources(game, resources, fetchImpl = fetch) {
  const urls = getGameResourceUrls(game, resources);
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
