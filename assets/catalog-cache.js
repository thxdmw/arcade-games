import { normalizeCatalog } from "./catalog.js";

const CACHE_KEY = "arcade-vault:runtime-catalog:v1";

export function readCatalogCache(storage = globalThis.localStorage) {
  try {
    const value = storage?.getItem(CACHE_KEY);
    if (!value) return null;
    return normalizeCatalog(JSON.parse(value));
  } catch {
    return null;
  }
}

export function writeCatalogCache(catalog, storage = globalThis.localStorage) {
  try {
    storage?.setItem(CACHE_KEY, JSON.stringify(catalog));
  } catch {
    // 隐私模式可能拒绝 localStorage；缓存失败不应阻止游戏运行。
  }
  return catalog;
}

export function upsertCachedGame(game, storage = globalThis.localStorage) {
  const cached = readCatalogCache(storage);
  const games = (cached?.games ?? []).filter((item) => item.id !== game.id && item.runtimeFolder !== game.runtimeFolder);
  return writeCatalogCache(normalizeCatalog({ version: 4, games: [...games, game] }), storage);
}
