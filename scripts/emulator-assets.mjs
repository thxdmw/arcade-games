export const emulatorRuntimeScripts = Object.freeze([
  "emulator.js",
  "nipplejs.js",
  "shaders.js",
  "storage.js",
  "gamepad.js",
  "GameManager.js",
  "socket.io.min.js",
  "compression.js"
]);

export const fbneoCoreFiles = Object.freeze([
  "fbneo-wasm.data",
  "fbneo-legacy-wasm.data",
  "fbneo-thread-wasm.data",
  "fbneo-thread-legacy-wasm.data"
]);

const archiveWriteStatement = "this.gameManager.FS.writeFile(assetUrl, new Uint8Array(input));";
const safeArchiveWriteStatement = [
  "const archiveName = assetUrl.split(\"/\").pop().split(\"#\")[0].split(\"?\")[0];",
  "                    this.gameManager.FS.writeFile(archiveName, new Uint8Array(input));"
].join("\n");

export function patchEmulatorArchivePath(source) {
  const occurrences = source.split(archiveWriteStatement).length - 1;
  if (occurrences !== 1) {
    throw new Error(`EmulatorJS 压缩包写入逻辑与预期不一致：找到 ${occurrences} 处`);
  }
  return source.replace(archiveWriteStatement, safeArchiveWriteStatement);
}

const externalFileWriteStatement = "this.writeFile(path, res.data);";
const safeExternalFileWriteStatement = "this.writeFile(path, new Uint8Array(res.data));";

export function patchEmulatorExternalFileData(source) {
  const occurrences = source.split(externalFileWriteStatement).length - 1;
  if (occurrences !== 1) {
    throw new Error(`EmulatorJS 外部文件写入逻辑与预期不一致：找到 ${occurrences} 处`);
  }
  return source.replace(externalFileWriteStatement, safeExternalFileWriteStatement);
}

export function validateFbneoCoreFiles(fileNames) {
  const actual = fileNames.filter((name) => /^fbneo(?:-thread)?(?:-legacy)?-wasm\.data$/.test(name)).sort();
  const expected = [...fbneoCoreFiles].sort();

  if (actual.length !== expected.length || actual.some((name, index) => name !== expected[index])) {
    throw new Error(`FBNeo 核心文件不完整：需要 ${expected.join("、")}，实际为 ${actual.join("、") || "空"}`);
  }

  return actual;
}
