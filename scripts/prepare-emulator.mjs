import { cp, mkdir, readdir, rm, copyFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const runtimeSource = join(projectRoot, "node_modules", "@emulatorjs", "emulatorjs", "data");
const runtimeLicense = join(projectRoot, "node_modules", "@emulatorjs", "emulatorjs", "LICENSE");
const coreSource = join(projectRoot, "node_modules", "@emulatorjs", "core-fbneo");
const outputDirectory = join(projectRoot, "public", "emulatorjs", "data");
const coreOutputDirectory = join(outputDirectory, "cores");

// 只清理脚本自己生成的固定目录，避免升级依赖后留下已删除的旧核心文件。
if (!outputDirectory.startsWith(join(projectRoot, "public"))) {
  throw new Error("模拟器输出目录越过了 public 边界");
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(coreOutputDirectory, { recursive: true });
await cp(runtimeSource, outputDirectory, { recursive: true });
await copyFile(runtimeLicense, join(outputDirectory, "LICENSE-EmulatorJS.txt"));

const coreFiles = (await readdir(coreSource)).filter((name) => /^fbneo(?:-thread)?(?:-legacy)?-wasm\.data$/.test(name));
if (coreFiles.length === 0) throw new Error("@emulatorjs/core-fbneo 中没有找到核心数据文件");
await Promise.all(coreFiles.map((name) => copyFile(join(coreSource, name), join(coreOutputDirectory, name))));

console.log(`已准备 EmulatorJS 运行资源，共 ${coreFiles.length} 个 FBNeo 核心文件。`);
