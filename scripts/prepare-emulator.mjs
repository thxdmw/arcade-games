import { access, cp, mkdir, readdir, readFile, rm, copyFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { emulatorRuntimeScripts, patchEmulatorArchivePath, validateFbneoCoreFiles } from "./emulator-assets.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const runtimeSource = join(projectRoot, "node_modules", "@emulatorjs", "emulatorjs", "data");
const runtimeLicense = join(projectRoot, "node_modules", "@emulatorjs", "emulatorjs", "LICENSE");
const packageCoreSource = join(projectRoot, "node_modules", "@emulatorjs", "core-fbneo");
const customCoreSource = join(projectRoot, "vendor", "core-fbneo");
const outputDirectory = join(projectRoot, "public", "emulatorjs", "data");
const coreOutputDirectory = join(outputDirectory, "cores");
const sourceOutputDirectory = join(outputDirectory, "src");

async function directoryExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

// 定制核心为 kovplus2007 提供独立驱动；缺少定制产物时仍允许上游核心服务其他游戏。
const usesCustomCore = await directoryExists(customCoreSource);
const coreSource = usesCustomCore ? customCoreSource : packageCoreSource;

// 只清理脚本自己生成的固定目录，避免升级依赖后留下已删除的旧核心文件。
if (!outputDirectory.startsWith(join(projectRoot, "public"))) {
  throw new Error("模拟器输出目录越过了 public 边界");
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(coreOutputDirectory, { recursive: true });
await cp(runtimeSource, outputDirectory, { recursive: true });
await copyFile(runtimeLicense, join(outputDirectory, "LICENSE-EmulatorJS.txt"));

// 上游 4.2.3 把完整下载 URL 当作虚拟文件路径，嵌套 runtime 目录会因此触发 Errno 44。
const emulatorSourcePath = join(sourceOutputDirectory, "emulator.js");
const patchedEmulatorSource = patchEmulatorArchivePath(await readFile(emulatorSourcePath, "utf8"));
await writeFile(emulatorSourcePath, patchedEmulatorSource);

// npm 包不携带发布版 min 文件；生成单文件入口，避免加载器先产生两次无意义的 404。
const bundledRuntime = await Promise.all(emulatorRuntimeScripts.map(async (name) => {
  if (name === "emulator.js") return patchedEmulatorSource;
  return readFile(join(sourceOutputDirectory, name), "utf8");
}));
await writeFile(join(outputDirectory, "emulator.min.js"), bundledRuntime.join(";\n"));
await copyFile(join(outputDirectory, "emulator.css"), join(outputDirectory, "emulator.min.css"));

const coreFiles = validateFbneoCoreFiles(await readdir(coreSource));
await Promise.all(coreFiles.map((name) => copyFile(join(coreSource, name), join(coreOutputDirectory, name))));
await cp(join(coreSource, "reports"), join(coreOutputDirectory, "reports"), { recursive: true });

console.log(`已准备 EmulatorJS 运行资源，共 ${coreFiles.length} 个${usesCustomCore ? "定制 " : " "}FBNeo 核心文件，并生成浏览器运行包。`);
