import assert from "node:assert/strict";
import test from "node:test";

import { gameEditionLabel, machinePreviewTitle } from "../assets/game-presentation.js";

test("卡片底部展示各自短名称、版本属性和父包依赖", () => {
  assert.equal(gameEditionLabel({ id: "kov", title: "三国战纪_v117_正版", parentRom: null }), "KOV · 原版 · 独立 ROM");
  assert.equal(gameEditionLabel({ id: "kof10th", title: "拳皇十周年_修改版", parentRom: "kof2002.zip" }), "KOF10TH · 修改版 · 需父 ROM");
});

test("街机屏幕预览会清理下划线并限制过长名称", () => {
  assert.equal(machinePreviewTitle("拳皇97_正版"), "拳皇97 正版");
  assert.equal(machinePreviewTitle("三国战纪2_Extend_Magic_Plus_修改版", 12), "三国战纪2 Exten…");
});
