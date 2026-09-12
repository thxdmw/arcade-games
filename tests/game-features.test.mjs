import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { configureGameFeatureFiles, getFastPowerFeature } from "../assets/game-features.js";

const originalKovGames = Object.freeze({
  kov: {
    revision: "fast-charge-v5",
    enabled: '1 "Enabled", 0, 0x1149CF, 0x28, 0, 0x11738F, 0x28'
  },
  kovplus: {
    revision: "fast-charge-v1",
    enabled: '1 "Enabled", 0, 0x11A2FD, 0x28, 0, 0x11CCC9, 0x28'
  },
  kovsh: {
    revision: "fast-charge-v2",
    enabled: '1 "Enabled", 0, 0x165624, 0x4E, 0, 0x165625, 0x71, 0, 0x16563F, 0x28, 0, 0x165645, 0x28, 0, 0x165EF0, 0x4E, 0, 0x165EF1, 0x71, 0, 0x165EF6, 0x4E, 0, 0x165EF7, 0x71, 0, 0x165F11, 0x28, 0, 0x165F17, 0x28'
  },
  kovshp: {
    revision: "fast-charge-v2",
    enabled: '1 "Enabled", 0, 0x165B98, 0x70, 0, 0x165B99, 0x28, 0, 0x165BE3, 0x28, 0, 0x165BE9, 0x28, 0, 0x165C05, 0x28, 0, 0x165C0B, 0x28, 0, 0x166762, 0x70, 0, 0x166763, 0x28, 0, 0x166764, 0x4E, 0, 0x166765, 0x71, 0, 0x1667B5, 0x28, 0, 0x1667BB, 0x28, 0, 0x1667D7, 0x28, 0, 0x1667DD, 0x28'
  },
  kovytzy: {
    revision: "fast-charge-v2",
    enabled: '1 "Enabled", 0, 0x165AC8, 0x70, 0, 0x165AC9, 0x28, 0, 0x165AF3, 0x28, 0, 0x165AF9, 0x28, 0, 0x1664D6, 0x70, 0, 0x1664D7, 0x28, 0, 0x166507, 0x28, 0, 0x16650D, 0x28'
  }
});

test("快速集气只对 FBNeo 的三国战纪一代正版 ROM 开放", () => {
  for (const id of Object.keys(originalKovGames)) {
    const feature = getFastPowerFeature({ id, core: "fbneo" });
    assert.equal(feature.gameId, id);
    assert.equal(feature.externalPath, `/fbneo/cheats/${id}.ini`);
    assert.equal(feature.optionName, `fbneo-cheat-0-${id}-Fast_Charge_PL1`);
  }

  assert.equal(getFastPowerFeature({ id: "kov", core: "fceumm" }), null);
  assert.equal(getFastPowerFeature({ id: "kovplus2007", core: "fbneo" }), null);
  assert.equal(getFastPowerFeature({ id: "kov2", core: "fbneo" }), null);
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

test("每个正版 ROM 使用独立的攻击集气补丁且默认关闭", async () => {
  for (const [id, expected] of Object.entries(originalKovGames)) {
    const feature = getFastPowerFeature({ id, core: "fbneo" });
    const cheat = await readFile(new URL(`../assets/cheats/${id}.ini`, import.meta.url), "utf8");

    assert.equal(feature.sourceUrl, `/assets/cheats/${id}.ini?v=${expected.revision}`);
    assert.match(cheat, /cheat "Fast Charge PL1"/);
    assert.match(cheat, /type 0/);
    assert.match(cheat, /default 0/);
    assert.ok(cheat.includes(expected.enabled));
    assert.doesNotMatch(cheat, /0x8[0-9A-F]{5}/);
  }
});
