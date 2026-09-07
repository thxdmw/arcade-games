const STORAGE_KEY = "arcade-theme";

export function preferredTheme(storage = globalThis.localStorage) {
  try {
    return storage?.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(theme, root = document.documentElement, storage = globalThis.localStorage) {
  const normalized = theme === "dark" ? "dark" : "light";
  root.dataset.theme = normalized;
  try {
    storage?.setItem(STORAGE_KEY, normalized);
  } catch {
    // 隐私模式可能拒绝存储，但不应该影响本次主题切换。
  }
  return normalized;
}

export function installThemeToggle(button, root = document.documentElement, storage = globalThis.localStorage) {
  if (!button) return () => {};
  const render = (theme) => {
    const dark = theme === "dark";
    button.setAttribute("aria-label", dark ? "切换到亮色模式" : "切换到暗色模式");
    button.setAttribute("aria-pressed", String(dark));
    button.querySelector("span").textContent = dark ? "☀" : "☾";
    button.querySelector("small").textContent = dark ? "亮色" : "暗色";
  };
  const initial = applyTheme(preferredTheme(storage), root, storage);
  render(initial);
  const toggle = () => render(applyTheme(root.dataset.theme === "dark" ? "light" : "dark", root, storage));
  button.addEventListener("click", toggle);
  return () => button.removeEventListener("click", toggle);
}
