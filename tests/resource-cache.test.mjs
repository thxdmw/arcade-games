import test from "node:test";
import assert from "node:assert/strict";
import { configureEmulatorResourceCache, EMULATOR_ASSET_REVISION, requestPersistentBrowserStorage, versionedEmulatorAsset } from "../assets/resource-cache.js";

test("关闭 EmulatorJS 调试旁路并允许大型 ROM 写入浏览器缓存", () => {
  const target = { EJS_DEBUG_XX: true };
  configureEmulatorResourceCache(target);
  assert.equal(target.EJS_DEBUG_XX, false);
  assert.equal(target.EJS_CacheLimit, 1024 * 1024 * 1024);
  assert.equal(target.EJS_paths["fbneo.json"], versionedEmulatorAsset("/emulatorjs/data/cores/reports/fbneo.json"));
  assert.match(target.EJS_paths["fbneo-thread-wasm.data"], new RegExp(EMULATOR_ASSET_REVISION));
});

test("保留已有自定义资源路径并只覆盖项目维护的核心文件", () => {
  const target = { EJS_paths: { "zh-CN.json": "/custom/zh-CN.json", "fbneo-wasm.data": "/stale-core.data" } };
  configureEmulatorResourceCache(target);

  assert.equal(target.EJS_paths["zh-CN.json"], "/custom/zh-CN.json");
  assert.notEqual(target.EJS_paths["fbneo-wasm.data"], "/stale-core.data");
});

test("浏览器尚未持久化时主动申请持久存储", async () => {
  let requested = false;
  const result = await requestPersistentBrowserStorage({
    persisted: async () => false,
    persist: async () => { requested = true; return true; }
  });
  assert.equal(result, true);
  assert.equal(requested, true);
});
