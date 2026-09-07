import test from "node:test";
import assert from "node:assert/strict";
import { catalogFromDirectory, getGameResourceUrls, normalizeCatalog, probeGameResources, resolveResourcePath, stableNumericId } from "../assets/catalog.js";

const rawCatalog = {
  version: 1,
  resources: { roms: "/roms", bios: "/bios/", covers: "/covers/" },
  games: [
    {
      id: "kof10th",
      title: "拳皇十周年",
      series: "拳皇",
      genre: "格斗",
      platform: "Neo Geo",
      rom: "kof10th.zip",
      parentRom: "kof2002.zip",
      bios: "neogeo.zip",
      cover: "拳皇 10.webp"
    }
  ]
};

test("规范化清单并生成经过编码的站内资源路径", () => {
  const catalog = normalizeCatalog(rawCatalog);
  const urls = getGameResourceUrls(catalog.games[0], catalog.resources);
  assert.equal(catalog.resources.roms, "/roms/");
  assert.equal(urls.rom, "/roms/kof10th.zip");
  assert.equal(urls.parentRom, "/roms/kof2002.zip");
  assert.equal(urls.cover, "/covers/%E6%8B%B3%E7%9A%87%2010.webp");
});

test("拒绝远程地址与目录跳转", () => {
  assert.throws(() => resolveResourcePath("/roms/", "../secret.zip"), /不安全/);
  assert.throws(() => resolveResourcePath("/roms/", "https://example.com/game.zip"), /不安全/);
  assert.throws(() => normalizeCatalog({ ...rawCatalog, resources: { roms: "https://example.com/" } }), /站点内/);
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
  const result = await probeGameResources(catalog.games[0], catalog.resources, fakeFetch);
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

test("从目录索引识别两个预置游戏并隐藏父 ROM", () => {
  const catalog = catalogFromDirectory([
    { name: "kof10th.zip", type: "file" },
    { name: "kof2002.zip", type: "file" },
    { name: "kovplusq.zip", type: "file" },
    { name: "kovplus.zip", type: "file" },
    { name: "readme.txt", type: "file" }
  ]);
  assert.deepEqual(catalog.games.map((game) => game.id), ["kof10th", "kovplusq"]);
  assert.equal(catalog.games[0].parentRom, "kof2002.zip");
  assert.equal(catalog.games[1].bios, "pgm.zip");
  assert.equal(catalog.games[1].parentRom, "kovplus.zip");
});

test("未收录的 ROM 使用文件名并按常见前缀推断平台", () => {
  const catalog = catalogFromDirectory(["kof99hack.zip", "cps-demo.zip"]);
  assert.equal(catalog.games[0].bios, "neogeo.zip");
  assert.equal(catalog.games[0].platform, "Neo Geo");
  assert.equal(catalog.games[1].bios, null);
  assert.equal(catalog.games[1].title, "cps-demo");
});
