import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { configureGameFeatureFiles, getFastPowerFeature } from "../assets/game-features.js";

test("快速集气只对 FBNeo 的三国战纪 v117 主 ROM 开放", () => {
  assert.equal(getFastPowerFeature({ id: "kov", core: "fceumm" }), null);
  assert.equal(getFastPowerFeature({ id: "kovplus", core: "fbneo" }), null);
  assert.equal(getFastPowerFeature({ id: "kov", core: "fbneo" }).optionName, "fbneo-cheat-0-kov-Fast_Charge_PL1");
});

test("启动前把秘籍文件放进 FBNeo 的系统目录且保留其它外部文件", () => {
  const target = { EJS_externalFiles: { "/existing.dat": "/assets/existing.dat" } };
  const feature = getFastPowerFeature({ id: "kov", core: "fbneo" });
  configureGameFeatureFiles(target, feature);

  assert.equal(target.EJS_externalFiles["/existing.dat"], "/assets/existing.dat");
  assert.equal(target.EJS_externalFiles["/fbneo/cheats/kov.ini"], "/assets/cheats/kov.ini?v=fast-charge-v5");
});

test("页面不再提供重复的快速集气按钮", async () => {
  const html = await readFile(new URL("../play.html", import.meta.url), "utf8");
  assert.doesNotMatch(html, /fast-power-toggle/);
  assert.doesNotMatch(html, />快速集气[：<]/);
});

test("秘籍只放大正版 v117 的攻击集气增量且默认关闭", async () => {
  const cheat = await readFile(new URL("../assets/cheats/kov.ini", import.meta.url), "utf8");
  assert.match(cheat, /cheat "Fast Charge PL1"/);
  assert.match(cheat, /type 0/);
  assert.match(cheat, /default 0/);
  assert.match(cheat, /1 "Enabled", 0, 0x1149CF, 0x28, 0, 0x11738F, 0x28/);
  assert.doesNotMatch(cheat, /0x81619D/);
  assert.doesNotMatch(cheat, /0x81619E/);
  assert.doesNotMatch(cheat, /0x81619F/);
  assert.equal((cheat.match(/0x[0-9A-F]+/g) ?? []).length, 4);
});
