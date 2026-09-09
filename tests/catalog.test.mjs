import test from "node:test";
import assert from "node:assert/strict";
import { catalogFromRuntime, gameFromRuntime, getGameResourceUrls, listRuntimeGameNames, normalizeCatalog, probeGameResources, stableNumericId } from "../assets/catalog.js";

const rawCatalog = {
  version: 1,
  games: [
    {
      id: "kof10th",
      title: "拳皇十周年_修改版",
      series: "拳皇",
      genre: "格斗",
      platform: "Neo Geo",
      rom: "kof10th.zip",
      parentRom: "kof2002.zip",
      bios: "neogeo.zip",
      cover: "cover.png",
      resourceUrls: {
        rom: "/runtime/%E6%8B%B3%E7%9A%87%E5%8D%81%E5%91%A8%E5%B9%B4/roms/kof10th.zip",
        parentRom: "/runtime/%E6%8B%B3%E7%9A%87%E5%8D%81%E5%91%A8%E5%B9%B4/parents/kof2002.zip",
        bios: "/runtime/%E6%8B%B3%E7%9A%87%E5%8D%81%E5%91%A8%E5%B9%B4/bios/neogeo.zip",
        cover: "/runtime/%E6%8B%B3%E7%9A%87%E5%8D%81%E5%91%A8%E5%B9%B4/covers/cover.png"
      }
    }
  ]
};

test("规范化清单并保留独立的 runtime 资源路径", () => {
  const catalog = normalizeCatalog(rawCatalog);
  const urls = getGameResourceUrls(catalog.games[0]);
  assert.equal(urls.rom, rawCatalog.games[0].resourceUrls.rom);
  assert.equal(urls.parentRom, rawCatalog.games[0].resourceUrls.parentRom);
  assert.equal(urls.cover, rawCatalog.games[0].resourceUrls.cover);
});

test("拒绝 runtime 之外的资源地址与目录跳转", () => {
  assert.throws(() => normalizeCatalog({
    ...rawCatalog,
    games: [{ ...rawCatalog.games[0], resourceUrls: { ...rawCatalog.games[0].resourceUrls, rom: "https://example.com/game.zip" } }]
  }), /runtime/);
  assert.throws(() => normalizeCatalog({
    ...rawCatalog,
    games: [{ ...rawCatalog.games[0], resourceUrls: { ...rawCatalog.games[0].resourceUrls, rom: "/runtime/../secret.zip" } }]
  }), /runtime/);
});

test("拒绝重复游戏 ID", () => {
  assert.throws(() => normalizeCatalog({ ...rawCatalog, games: [...rawCatalog.games, { ...rawCatalog.games[0] }] }), /重复/);
});

test("资源探测会报告 ROM、BIOS 和父 ROM 中的缺失项", async () => {
  const catalog = normalizeCatalog(rawCatalog);
  const calls = [];
  const fakeFetch = async (url, options) => {
    calls.push([url, options.method]);
    return { ok: !url.endsWith("kof2002.zip") };
  };
  const result = await probeGameResources(catalog.games[0], fakeFetch);
  assert.equal(result.ready, false);
  assert.deepEqual(result.missing.map((item) => item.label), ["父 ROM"]);
  assert.equal(calls.length, 3);
  assert.ok(calls.every(([, method]) => method === "HEAD"));
});

test("相同游戏 ID 始终得到相同的正整数命名空间", () => {
  assert.equal(stableNumericId("kof97"), stableNumericId("kof97"));
  assert.notEqual(stableNumericId("kof97"), stableNumericId("kov"));
  assert.ok(stableNumericId("kof97") >= 0);
});

test("runtime 游戏文件夹名用于展示并独立加载 ROM、父包、BIOS 和封面", async () => {
  const gameName = "三国战纪风云再起";
  const gameUrl = `/runtime/${encodeURIComponent(gameName)}/`;
  const directories = new Map([
    ["/runtime/", [{ name: gameName, type: "directory" }]],
    [gameUrl, ["roms", "parents", "bios", "covers"].map((name) => ({ name, type: "directory" }))],
    [`${gameUrl}roms/`, [{ name: "kovplusq.zip", type: "file" }]],
    [`${gameUrl}parents/`, [{ name: "kovplus.zip", type: "file" }]],
    [`${gameUrl}bios/`, [{ name: "pgm.zip", type: "file" }]],
    [`${gameUrl}covers/`, [{ name: "cover.png", type: "file" }]]
  ]);
  const fetchImpl = async (url) => {
    const cleanUrl = url.split("?")[0];
    return {
      ok: directories.has(cleanUrl),
      status: directories.has(cleanUrl) ? 200 : 404,
      json: async () => directories.get(cleanUrl)
    };
  };

  const catalog = await catalogFromRuntime("/runtime/", fetchImpl);
  const game = catalog.games[0];
  assert.equal(game.title, gameName);
  assert.equal(game.id, "kovplusq");
  assert.equal(game.series, "三国战纪_v117_正版");
  assert.deepEqual(getGameResourceUrls(game), {
    rom: `${gameUrl}roms/kovplusq.zip`,
    bios: `${gameUrl}bios/pgm.zip`,
    parentRom: `${gameUrl}parents/kovplus.zip`,
    cover: `${gameUrl}covers/cover.png`
  });
});

test("根目录检查绕过缓存且单个游戏可以独立扫描", async () => {
  const gameName = "拳皇97";
  const gameUrl = `/runtime/${encodeURIComponent(gameName)}/`;
  const directories = new Map([
    ["/runtime/", [{ name: gameName, type: "directory" }]],
    [gameUrl, [{ name: "roms", type: "directory" }]],
    [`${gameUrl}roms/`, [{ name: "kof97.zip", type: "file" }]]
  ]);
  const requests = [];
  const fetchImpl = async (url) => {
    requests.push(url);
    const cleanUrl = url.split("?")[0];
    return {
      ok: directories.has(cleanUrl),
      status: directories.has(cleanUrl) ? 200 : 404,
      json: async () => directories.get(cleanUrl)
    };
  };

  assert.deepEqual(await listRuntimeGameNames("/runtime/", fetchImpl), [gameName]);
  assert.match(requests[0], /^\/runtime\/\?_=/);
  requests.length = 0;
  const game = await gameFromRuntime(gameName, "/runtime/", fetchImpl);
  assert.equal(game.id, "kof97");
  assert.equal(game.runtimeFolder, gameName);
  assert.equal(requests.includes("/runtime/"), false);
});
