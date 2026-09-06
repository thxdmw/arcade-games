const PLAYER_ONE_ARCADE_CONTROLS = Object.freeze({
  // FBNeo 使用 RetroPad 编号；按 Neo Geo 的 A/B/C/D 顺序映射为 J/K/U/I。
  0: Object.freeze({ value: "j", value2: "BUTTON_2" }),
  1: Object.freeze({ value: "u", value2: "BUTTON_4" }),
  2: Object.freeze({ value: "5", value2: "SELECT" }),
  3: Object.freeze({ value: "enter", value2: "START" }),
  4: Object.freeze({ value: "w", value2: "DPAD_UP" }),
  5: Object.freeze({ value: "s", value2: "DPAD_DOWN" }),
  6: Object.freeze({ value: "a", value2: "DPAD_LEFT" }),
  7: Object.freeze({ value: "d", value2: "DPAD_RIGHT" }),
  8: Object.freeze({ value: "k", value2: "BUTTON_1" }),
  9: Object.freeze({ value: "i", value2: "BUTTON_3" })
});

export function createArcadeDefaultControls() {
  // EmulatorJS 会把配置当成可变对象，返回新对象可避免多个实例互相污染。
  return {
    0: Object.fromEntries(
      Object.entries(PLAYER_ONE_ARCADE_CONTROLS).map(([id, binding]) => [id, { ...binding }])
    ),
    1: {},
    2: {},
    3: {}
  };
}

function isEditableTarget(target) {
  const tagName = target?.tagName?.toLowerCase();
  return target?.isContentEditable === true || tagName === "input" || tagName === "textarea" || tagName === "select";
}

function isEmulatorMenuOpen(emulator) {
  return (emulator.settingsMenu && emulator.settingsMenu.style.display !== "none")
    || emulator.isPopupOpen?.() === true;
}

function findKeyboardBindings(emulator, keyCode) {
  const bindings = [];
  for (let player = 0; player < 4; player++) {
    for (let input = 0; input < 30; input++) {
      if (emulator.controls?.[player]?.[input]?.value === keyCode) bindings.push([player, input]);
    }
  }
  return bindings;
}

export function installEmulatorKeyboardBridge(eventTarget, getEmulator, options = {}) {
  const minimumPulseMs = options.minimumPulseMs ?? 80;
  const now = options.now ?? Date.now;
  const schedule = options.schedule ?? setTimeout;
  const cancelSchedule = options.cancelSchedule ?? clearTimeout;
  const activeKeys = new Map();
  const releaseTimers = new Set();

  const handleKeyboardEvent = (event) => {
    if (event.defaultPrevented || isEditableTarget(event.target)) return;

    const emulator = getEmulator();
    if (!emulator?.started || !emulator.gameManager) return;

    const keyCode = event.keyCode;
    const activeKey = activeKeys.get(keyCode);
    if (event.type === "keydown" && isEmulatorMenuOpen(emulator)) return;
    const bindings = event.type === "keydown"
      ? findKeyboardBindings(emulator, keyCode)
      : activeKey?.bindings ?? [];
    if (bindings.length === 0) return;

    options.onInput?.({ type: event.type, keyCode, bindings });

    event.preventDefault();
    event.stopPropagation();

    if (event.type === "keydown") {
      if (event.repeat || activeKeys.has(keyCode)) return;
      activeKeys.set(keyCode, { bindings, pressedAt: now() });
      for (const [player, input] of bindings) emulator.gameManager.simulateInput(player, input, 1);
      return;
    }

    if (!activeKey) return;
    activeKeys.delete(keyCode);
    const delay = Math.max(0, minimumPulseMs - (now() - activeKey.pressedAt));
    const timer = schedule(() => {
      releaseTimers.delete(timer);
      for (const [player, input] of activeKey.bindings) emulator.gameManager.simulateInput(player, input, 0);
    }, delay);
    releaseTimers.add(timer);
  };

  // 捕获阶段接管游戏按键，避免 EmulatorJS 容器监听器收到同一事件而重复触发。
  eventTarget.addEventListener("keydown", handleKeyboardEvent, true);
  eventTarget.addEventListener("keyup", handleKeyboardEvent, true);

  return () => {
    eventTarget.removeEventListener("keydown", handleKeyboardEvent, true);
    eventTarget.removeEventListener("keyup", handleKeyboardEvent, true);
    for (const timer of releaseTimers) cancelSchedule(timer);
    releaseTimers.clear();
    const emulator = getEmulator();
    for (const activeKey of activeKeys.values()) {
      for (const [player, input] of activeKey.bindings) emulator?.gameManager?.simulateInput(player, input, 0);
    }
    activeKeys.clear();
  };
}
