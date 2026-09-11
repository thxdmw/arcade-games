import assert from "node:assert/strict";
import test from "node:test";

import { clampPlayerHelpWidth } from "../assets/player-layout.js";

test("右侧工具栏宽度限制在桌面可用范围内", () => {
  assert.equal(clampPlayerHelpWidth(100, 1920), 280);
  assert.equal(clampPlayerHelpWidth(500, 1920), 500);
  assert.equal(clampPlayerHelpWidth(900, 1920), 720);
});

test("较窄桌面限制右栏最多占视口约一半", () => {
  assert.equal(clampPlayerHelpWidth(720, 1000), 480);
  assert.equal(clampPlayerHelpWidth(null, 1000), 280);
});
