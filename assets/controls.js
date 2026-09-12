const PLAYER_ONE_ARCADE_CONTROLS = Object.freeze({
  // 键位源唯一，页面提示、出招表记法与测试都从这里对齐：J 攻击、K 跳跃、L 选道具、; 用道具，投币 1、开始 2。
  // 索引就是传给 simulateInput 的 RetroPad 按键号。实测依据：索引 0 在三国战纪里是攻击（B 键）、索引 8 是跳跃（A 键）。
  // 别按「A/B/C/D 依次排」去理解这个顺序——三国战纪的按键名与位次是 A=跳、B=攻击、C=道具，
  // 早年页面写的「A = J（攻击）」把游戏内 A/B 说反了；街机同名按键在不同游戏里位次不同，
  // 只认实测动作（按一下看角色做什么），不要按名称重排这四颗键，也不要信面板上的布局标签。
  // 键值写 EmulatorJS keyMap 里的按键名（写成数字同样能解析，但键名可读且写错时调试模式会报警）；
  // 分号必须写 "semi-colon"，'";"' 与 "186" 都无法被 keyLookup 解析，会退化成 -1 而静默失效。
  // 末尾的 value2 不能改着玩：它既要显示在模拟器「控制设置」面板，又是 EmulatorJS 匹配物理手柄
  // 按键的依据（gamepadEvent 里用 controlValue === e.label / e.index 判定），换成中文动作名会让手柄整路失效。
  // 面板上那套「按钮1/按钮2/BUTTON_3/BUTTON_4」因此只能照留，它和游戏内按键名不同名，不是绑定错。
  // 玩家真正要看的键位在「键盘」列，与页面提示、出招表口径一致。
  0: Object.freeze({ value: "j", value2: "BUTTON_2" }),
  8: Object.freeze({ value: "k", value2: "BUTTON_1" }),
  1: Object.freeze({ value: "l", value2: "BUTTON_4" }),
  9: Object.freeze({ value: "semi-colon", value2: "BUTTON_3" }),
  2: Object.freeze({ value: "1", value2: "SELECT" }),
  3: Object.freeze({ value: "2", value2: "START" }),
  4: Object.freeze({ value: "w", value2: "DPAD_UP" }),
  5: Object.freeze({ value: "s", value2: "DPAD_DOWN" }),
  6: Object.freeze({ value: "a", value2: "DPAD_LEFT" }),
  7: Object.freeze({ value: "d", value2: "DPAD_RIGHT" })
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
