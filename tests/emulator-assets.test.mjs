import assert from "node:assert/strict";
import test from "node:test";

import {
  emulatorRuntimeScripts,
  fbneoCoreFiles,
  patchEmulatorArchivePath,
  validateFbneoCoreFiles
} from "../scripts/emulator-assets.mjs";

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

test("定制 FBNeo 核心必须同时提供四种浏览器运行模式", () => {
  assert.deepEqual(validateFbneoCoreFiles([...fbneoCoreFiles, "README.md"]), [...fbneoCoreFiles].sort());
  assert.throws(
    () => validateFbneoCoreFiles(fbneoCoreFiles.filter((name) => name !== "fbneo-thread-wasm.data")),
    /核心文件不完整/
  );
});
