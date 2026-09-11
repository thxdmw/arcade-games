import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { configureGameFeatureFiles, getFastPowerFeature, setFastPowerEnabled } from "../assets/game-features.js";

test("快速集气只对 FBNeo 的三国战纪 v117 主 ROM 开放", () => {
  assert.equal(getFastPowerFeature({ id: "kov", core: "fceumm" }), null);
  assert.equal(getFastPowerFeature({ id: "kovplus", core: "fbneo" }), null);
  assert.equal(getFastPowerFeature({ id: "kov", core: "fbneo" }).optionName, "fbneo-cheat-0-kov-Fast_Power_PL1");
});

test("启动前把秘籍文件放进 FBNeo 的系统目录且保留其它外部文件", () => {
  const target = { EJS_externalFiles: { "/existing.dat": "/assets/existing.dat" } };
  const feature = getFastPowerFeature({ id: "kov", core: "fbneo" });
  configureGameFeatureFiles(target, feature);

  assert.equal(target.EJS_externalFiles["/existing.dat"], "/assets/existing.dat");
  assert.equal(target.EJS_externalFiles["/fbneo/cheats/kov.ini"], "/assets/cheats/kov.ini");
});

test("运行中通过 FBNeo 核心选项开启和关闭快速集气", () => {
  const calls = [];
  const emulator = { gameManager: { setVariable: (...args) => calls.push(args) } };
  const feature = getFastPowerFeature({ id: "kov", core: "fbneo" });

  assert.equal(setFastPowerEnabled(emulator, feature, true), true);
  assert.equal(setFastPowerEnabled(emulator, feature, false), true);
  assert.deepEqual(calls, [
    [feature.optionName, "1 - Enabled"],
    [feature.optionName, "0 - Disabled"]
  ]);
  assert.equal(setFastPowerEnabled({}, feature, true), false);
});

test("秘籍只修改正版 v117 的玩家 1 集气槽且默认关闭", async () => {
  const cheat = await readFile(new URL("../assets/cheats/kov.ini", import.meta.url), "utf8");
  assert.match(cheat, /default 0/);
  assert.match(cheat, /1 "Enabled", 0, 0x81619F, 0x03/);
  assert.equal((cheat.match(/0x[0-9A-F]+/g) ?? []).length, 2);
});
