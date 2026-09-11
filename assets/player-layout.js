const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 280;
const MAX_WIDTH = 720;
const STORAGE_KEY = "arcade-vault:player-help-width";

export function clampPlayerHelpWidth(width, viewportWidth = globalThis.innerWidth ?? 1920) {
  const responsiveMaximum = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.floor(viewportWidth * 0.48)));
  return Math.round(Math.min(responsiveMaximum, Math.max(MIN_WIDTH, Number(width) || DEFAULT_WIDTH)));
}

export function installPlayerHelpResize(handle, root = document.body, storage = globalThis.localStorage) {
  if (!handle || !root) return () => {};
  let width = clampPlayerHelpWidth(storage?.getItem(STORAGE_KEY));
  let startX = 0;
  let startWidth = width;
  let frame = 0;

  function apply(nextWidth, persist = false) {
    width = clampPlayerHelpWidth(nextWidth);
    root.style.setProperty("--player-help-width", `${width}px`);
    handle.setAttribute("aria-valuenow", String(width));
    if (persist) storage?.setItem(STORAGE_KEY, String(width));
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => globalThis.dispatchEvent(new Event("resize")));
  }

  function onPointerMove(event) {
    apply(startWidth + startX - event.clientX);
  }

  function onPointerUp(event) {
    handle.releasePointerCapture?.(event.pointerId);
    globalThis.removeEventListener("pointermove", onPointerMove);
    globalThis.removeEventListener("pointerup", onPointerUp);
    root.classList.remove("is-resizing-help");
    apply(width, true);
  }

  function onPointerDown(event) {
    startX = event.clientX;
    startWidth = width;
    handle.setPointerCapture?.(event.pointerId);
    root.classList.add("is-resizing-help");
    globalThis.addEventListener("pointermove", onPointerMove);
    globalThis.addEventListener("pointerup", onPointerUp);
  }

  function onKeyDown(event) {
    if (!["ArrowLeft", "ArrowRight", "Home"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") apply(DEFAULT_WIDTH, true);
    else apply(width + (event.key === "ArrowLeft" ? 24 : -24), true);
  }

  function onWindowResize() {
    const nextWidth = clampPlayerHelpWidth(width);
    if (nextWidth === width) return;
    width = nextWidth;
    root.style.setProperty("--player-help-width", `${width}px`);
    handle.setAttribute("aria-valuenow", String(width));
    storage?.setItem(STORAGE_KEY, String(width));
  }

  handle.addEventListener("pointerdown", onPointerDown);
  handle.addEventListener("keydown", onKeyDown);
  globalThis.addEventListener("resize", onWindowResize);
  apply(width);

  return () => {
    cancelAnimationFrame(frame);
    handle.removeEventListener("pointerdown", onPointerDown);
    handle.removeEventListener("keydown", onKeyDown);
    globalThis.removeEventListener("pointermove", onPointerMove);
    globalThis.removeEventListener("pointerup", onPointerUp);
    globalThis.removeEventListener("resize", onWindowResize);
  };
}
