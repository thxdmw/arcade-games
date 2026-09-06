import test from "node:test";
import assert from "node:assert/strict";
import { MemorySaveRepository, toUint8Array } from "../assets/storage.js";

test("二进制视图只保存自身范围且不共享可变缓冲区", async () => {
  const source = new Uint8Array([9, 1, 2, 8]);
  const result = await toUint8Array(source.subarray(1, 3));
  source[1] = 7;
  assert.deepEqual([...result], [1, 2]);
});

test("内存仓库实现与未来后端共用的存档契约", async () => {
  const repository = await new MemorySaveRepository().ready();
  await repository.saveState("kof97", { state: new Uint8Array([1, 2, 3]) });
  await repository.saveNative("kof97", { save: new Uint8Array([4, 5]) });
  const state = await repository.getLatestState("kof97");
  assert.deepEqual([...state.data], [1, 2, 3]);
  assert.equal(repository.persistent, false);
});

test("最近游玩按时间倒序并遵守数量上限", async () => {
  const repository = new MemorySaveRepository();
  const originalNow = Date.now;
  let now = 100;
  Date.now = () => now++;
  try {
    await repository.recordPlayed("kof97");
    await repository.recordPlayed("kov");
    assert.deepEqual((await repository.getRecent(1)).map((item) => item.gameId), ["kov"]);
  } finally {
    Date.now = originalNow;
  }
});
