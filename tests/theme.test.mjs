import test from "node:test";
import assert from "node:assert/strict";
import { applyTheme, preferredTheme } from "../assets/theme.js";

function memoryStorage(initial) {
  const values = new Map(Object.entries(initial ?? {}));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
}

test("没有保存偏好时默认使用亮色", () => {
  assert.equal(preferredTheme(memoryStorage()), "light");
});

test("主题只接受亮色和暗色并保存选择", () => {
  const root = { dataset: {} };
  const storage = memoryStorage();
  assert.equal(applyTheme("dark", root, storage), "dark");
  assert.equal(preferredTheme(storage), "dark");
  assert.equal(applyTheme("unexpected", root, storage), "light");
  assert.equal(root.dataset.theme, "light");
});
