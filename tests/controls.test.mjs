import test from "node:test";
import assert from "node:assert/strict";
import { createArcadeDefaultControls, installEmulatorKeyboardBridge } from "../assets/controls.js";

test("街机默认键位与页面提示保持一致", () => {
  const controls = createArcadeDefaultControls();

  assert.deepEqual(
    Object.fromEntries(Object.entries(controls[0]).map(([id, binding]) => [id, binding.value])),
    {
      0: "j",
      1: "u",
      2: "5",
      3: "enter",
      4: "w",
      5: "s",
      6: "a",
      7: "d",
      8: "k",
      9: "i"
    }
  );
  assert.deepEqual(controls[1], {});
  assert.deepEqual(controls[2], {});
  assert.deepEqual(controls[3], {});
});

test("每次生成的键位对象互不影响", () => {
  const first = createArcadeDefaultControls();
  const second = createArcadeDefaultControls();

  first[0][0].value = "x";
  assert.equal(second[0][0].value, "j");
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
