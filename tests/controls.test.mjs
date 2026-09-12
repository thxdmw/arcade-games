import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createArcadeDefaultControls, installEmulatorKeyboardBridge } from "../assets/controls.js";

const playPagePath = fileURLToPath(new URL("../play.html", import.meta.url));

test("街机四个动作键落在实测的按键号上", () => {
  const controls = createArcadeDefaultControls();

  // 索引是 EmulatorJS 的 RetroPad 按键号，取值来自实机验证：索引 0 = 攻击（三国战纪 B 键）、
  // 索引 8 = 跳跃（三国战纪 A 键）。不要再按「A/B/C/D 依次排」重排这四颗键。
  assert.deepEqual(
    Object.fromEntries(Object.entries(controls[0]).map(([id, binding]) => [binding.value, Number(id)])),
    {
      j: 0,
      k: 8,
      l: 1,
      "semi-colon": 9,
      1: 2,
      2: 3,
      w: 4,
      s: 5,
      a: 6,
      d: 7
    }
  );
  assert.deepEqual(controls[1], {});
  assert.deepEqual(controls[2], {});
  assert.deepEqual(controls[3], {});
});

test("每次生成的键位对象互不影响", () => {
  const first = createArcadeDefaultControls();
  const second = createArcadeDefaultControls();

  // 改的是索引 0（三国战纪的攻击键）；断言另一个实例没被带着改，防止两次调用共享同一批对象。
  first[0][0].value = "x";
  assert.equal(second[0][0].value, "j");
});

test("页面提示与出招表记法跟键位源同步", async () => {
  const page = await readFile(playPagePath, "utf8");

  // 提示文案写死在 HTML 里，改了键位却忘了改文案会让玩家照着错的按。
  const actionLabels = ["J", "K", "L", ";"];
  const expectedActionRow = `<dd>${actionLabels.join(" ")}</dd>`;

  assert.ok(page.includes(expectedActionRow), `快捷提示缺少动作键行 ${expectedActionRow}`);
  assert.match(page, /<dd>1<\/dd>/);
  assert.match(page, /<dd>2<\/dd>/);
  assert.deepEqual(createArcadeDefaultControls()[0][2].value, "1");
  assert.deepEqual(createArcadeDefaultControls()[0][3].value, "2");
  for (const [index, action] of ["攻击", "跳跃", "选道具", "用道具"].entries()) {
    assert.ok(
      page.includes(`${action} = ${actionLabels[index]}`),
      `出招表键位说明缺少「${action} = ${actionLabels[index]}」`
    );
  }
  // 三国战纪的 A/B/C/D 与本站键位是错位的（A 是跳跃），说明里必须点明对应关系。
  for (const button of ["A", "B", "C", "D"]) {
    assert.ok(page.includes(`出招表里的 ${button}`), `出招表键位说明缺少街机按键 ${button} 的对应关系`);
  }
});

test("页面级输入至少保持数帧再释放", () => {
  const eventTarget = new EventTarget();
  const received = [];
  const scheduled = [];
  let currentTime = 100;
  const removeBridge = installEmulatorKeyboardBridge(
    eventTarget,
    () => ({
      started: true,
      controls: { 0: { 2: { value: 53 } } },
      controlMenu: { style: { display: "none" } },
      settingsMenu: { style: { display: "none" } },
      isPopupOpen: () => false,
      gameManager: { simulateInput: (...args) => received.push(args) }
    }),
    {
      now: () => currentTime,
      schedule: (callback, delay) => {
        const timer = { callback, delay };
        scheduled.push(timer);
        return timer;
      },
      cancelSchedule: () => {}
    }
  );
  const keyDown = new Event("keydown", { cancelable: true });
  const keyUp = new Event("keyup", { cancelable: true });
  Object.defineProperty(keyDown, "keyCode", { value: 53 });
  Object.defineProperty(keyUp, "keyCode", { value: 53 });

  eventTarget.dispatchEvent(keyDown);
  currentTime = 120;
  eventTarget.dispatchEvent(keyUp);
  assert.deepEqual(received, [[0, 2, 1]]);
  assert.equal(scheduled[0].delay, 60);

  scheduled[0].callback();
  removeBridge();

  assert.deepEqual(received, [[0, 2, 1], [0, 2, 0]]);
});

test("模拟器已处理或尚未启动时不重复转发", () => {
  const eventTarget = new EventTarget();
  let started = false;
  let received = 0;
  installEmulatorKeyboardBridge(eventTarget, () => ({
    started,
    controls: { 0: { 2: { value: 53 } } },
    gameManager: { simulateInput: () => received++ }
  }));

  const stoppedEvent = new Event("keydown", { cancelable: true });
  Object.defineProperty(stoppedEvent, "keyCode", { value: 53 });
  eventTarget.dispatchEvent(stoppedEvent);
  started = true;
  const handledEvent = new Event("keydown", { cancelable: true });
  Object.defineProperty(handledEvent, "keyCode", { value: 53 });
  handledEvent.preventDefault();
  eventTarget.dispatchEvent(handledEvent);

  assert.equal(received, 0);
});

test("控制菜单打开时保留 EmulatorJS 自己的改键流程", () => {
  const eventTarget = new EventTarget();
  let received = 0;
  installEmulatorKeyboardBridge(eventTarget, () => ({
    started: true,
    controls: { 0: { 2: { value: 53 } } },
    settingsMenu: { style: { display: "none" } },
    isPopupOpen: () => true,
    gameManager: { simulateInput: () => received++ }
  }));
  const event = new Event("keydown", { cancelable: true });
  Object.defineProperty(event, "keyCode", { value: 53 });

  eventTarget.dispatchEvent(event);

  assert.equal(received, 0);
  assert.equal(event.defaultPrevented, false);
});
