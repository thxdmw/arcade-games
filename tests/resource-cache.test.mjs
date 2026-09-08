import test from "node:test";
import assert from "node:assert/strict";
import { configureEmulatorResourceCache, requestPersistentBrowserStorage } from "../assets/resource-cache.js";

test("关闭 EmulatorJS 调试旁路并允许大型 ROM 写入浏览器缓存", () => {
  const target = { EJS_DEBUG_XX: true };
  configureEmulatorResourceCache(target);
  assert.equal(target.EJS_DEBUG_XX, false);
  assert.equal(target.EJS_CacheLimit, 1024 * 1024 * 1024);
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
