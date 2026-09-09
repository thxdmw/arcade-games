import assert from "node:assert/strict";
import test from "node:test";

import { readCatalogCache, upsertCachedGame, writeCatalogCache } from "../assets/catalog-cache.js";
import { normalizeCatalog } from "../assets/catalog.js";

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
}

const game = {
  id: "kof97",
  title: "拳皇97",
  runtimeFolder: "拳皇97",
  series: "拳皇",
  genre: "格斗",
  platform: "FBNeo",
  rom: "kof97.zip",
  resourceUrls: { rom: "/runtime/%E6%8B%B3%E7%9A%8797/roms/kof97.zip" }
};

test("游戏清单可以跨大厅和游戏页复用", () => {
  const storage = createStorage();
  writeCatalogCache(normalizeCatalog({ version: 4, games: [game] }), storage);
  assert.equal(readCatalogCache(storage).games[0].id, "kof97");
});

test("单游戏直达扫描只更新对应缓存项", () => {
  const storage = createStorage();
  writeCatalogCache(normalizeCatalog({ version: 4, games: [game] }), storage);
  upsertCachedGame({ ...game, title: "拳皇97 新名称", runtimeFolder: "拳皇97 新名称" }, storage);

  const cached = readCatalogCache(storage);
  assert.equal(cached.games.length, 1);
  assert.equal(cached.games[0].runtimeFolder, "拳皇97 新名称");
});
