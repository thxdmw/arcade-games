import { cp, mkdir, readdir, readFile, rm, copyFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { emulatorRuntimeScripts, patchEmulatorArchivePath } from "./emulator-assets.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const runtimeSource = join(projectRoot, "node_modules", "@emulatorjs", "emulatorjs", "data");
const runtimeLicense = join(projectRoot, "node_modules", "@emulatorjs", "emulatorjs", "LICENSE");
const coreSource = join(projectRoot, "node_modules", "@emulatorjs", "core-fbneo");
const outputDirectory = join(projectRoot, "public", "emulatorjs", "data");
const coreOutputDirectory = join(outputDirectory, "cores");
const sourceOutputDirectory = join(outputDirectory, "src");

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

const coreFiles = (await readdir(coreSource)).filter((name) => /^fbneo(?:-thread)?(?:-legacy)?-wasm\.data$/.test(name));
if (coreFiles.length === 0) throw new Error("@emulatorjs/core-fbneo 中没有找到核心数据文件");
await Promise.all(coreFiles.map((name) => copyFile(join(coreSource, name), join(coreOutputDirectory, name))));
await cp(join(coreSource, "reports"), join(coreOutputDirectory, "reports"), { recursive: true });

console.log(`已准备 EmulatorJS 运行资源，共 ${coreFiles.length} 个 FBNeo 核心文件，并生成浏览器运行包。`);
