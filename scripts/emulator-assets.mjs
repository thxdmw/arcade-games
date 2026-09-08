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
