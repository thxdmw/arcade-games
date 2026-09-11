import assert from "node:assert/strict";
import test from "node:test";

import { filterMoveList, getMoveList } from "../assets/move-lists.js";

test("仅为已经整理招式的游戏返回出招表", () => {
  assert.equal(getMoveList("kof97"), null);
  assert.equal(getMoveList("kovplus2007").characters.length, 10);
});

test("可以用人物姓名和别名筛选并保留该人物全部招式", () => {
  const moveList = getMoveList("kovplus2007");
  const byName = filterMoveList(moveList, "诸葛亮");
  const byAlias = filterMoveList(moveList, "孔明");

  assert.deepEqual(byName.map((character) => character.name), ["诸葛亮"]);
  assert.equal(byName[0].moves.length, 5);
  assert.deepEqual(byAlias.map((character) => character.name), ["诸葛亮"]);
});

test("也可以按招式名称搜索并只显示匹配招式", () => {
  const results = filterMoveList(getMoveList("kovplus2007"), "神龙摆尾");

  assert.deepEqual(results.map((character) => character.name), ["张飞", "魔法张飞"]);
  assert.ok(results.every((character) => character.moves.every((move) => move.name === "神龙摆尾")));
});
