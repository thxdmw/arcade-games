import assert from "node:assert/strict";
import test from "node:test";

import { emulatorRuntimeScripts, patchEmulatorArchivePath } from "../scripts/emulator-assets.mjs";

test("嵌套 runtime URL 写入虚拟文件系统时只保留压缩包名称", () => {
  const source = "before; this.gameManager.FS.writeFile(assetUrl, new Uint8Array(input)); after;";
  const patched = patchEmulatorArchivePath(source);

  assert.match(patched, /assetUrl\.split\("\/"\)\.pop\(\)/);
  assert.match(patched, /FS\.writeFile\(archiveName,/);
  assert.doesNotMatch(patched, /FS\.writeFile\(assetUrl,/);
});

test("上游写入逻辑变化时拒绝生成可能失效的运行包", () => {
  assert.throws(() => patchEmulatorArchivePath("没有目标语句"), /找到 0 处/);
});

test("单文件运行包包含 EmulatorJS 加载器要求的全部脚本", () => {
  assert.deepEqual(emulatorRuntimeScripts, [
    "emulator.js",
    "nipplejs.js",
    "shaders.js",
    "storage.js",
    "gamepad.js",
    "GameManager.js",
    "socket.io.min.js",
    "compression.js"
  ]);
});
