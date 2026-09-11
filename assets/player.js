import { gameFromRuntime, getGameResourceUrls, loadCatalog, probeGameResources, stableNumericId } from "./catalog.js";
import { readCatalogCache, upsertCachedGame } from "./catalog-cache.js";
import { createArcadeDefaultControls, installEmulatorKeyboardBridge } from "./controls.js";
import { configureEmulatorResourceCache, requestPersistentBrowserStorage } from "./resource-cache.js";
import { createSaveRepository } from "./storage.js";
import { installThemeToggle } from "./theme.js";
import { installMoveListPanel } from "./move-list-panel.js";

const elements = {
  shell: document.querySelector("#emulator-shell"),
  boot: document.querySelector("#boot-panel"),
  bootTitle: document.querySelector("#boot-title"),
  bootMessage: document.querySelector("#boot-message"),
  resume: document.querySelector("#resume-panel"),
  resumeTime: document.querySelector("#resume-time"),
  error: document.querySelector("#error-panel"),
  errorTitle: document.querySelector("#error-title"),
  errorMessage: document.querySelector("#error-message"),
  title: document.querySelector("#game-title"),
  platform: document.querySelector("#game-platform"),
  saveIndicator: document.querySelector("#save-indicator")
};

let stateObjectUrl = null;
const removeKeyboardBridge = installEmulatorKeyboardBridge(document, () => window.EJS_emulator);

function showError(title, message) {
  elements.boot.hidden = true;
  elements.resume.hidden = true;
  elements.errorTitle.textContent = title;
  elements.errorMessage.textContent = message;
  elements.error.hidden = false;
}

function updateSaveIndicator(message, active = true) {
  elements.saveIndicator.lastChild.textContent = message;
  elements.saveIndicator.classList.toggle("active", active);
}

function chooseResume(state) {
  if (!state?.data) return Promise.resolve(null);
  elements.boot.hidden = true;
  elements.resume.hidden = false;
  elements.resumeTime.textContent = `保存于 ${new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(state.updatedAt)}`;
  return new Promise((resolve) => {
    document.querySelector("#resume-game").addEventListener("click", () => resolve(state), { once: true });
    document.querySelector("#fresh-start").addEventListener("click", () => resolve(null), { once: true });
  }).finally(() => {
    elements.resume.hidden = true;
    elements.boot.hidden = false;
  });
}

function installEmulator(game, urls, repository, resumeState) {
  configureEmulatorResourceCache(window);
  window.EJS_player = "#game";
  window.EJS_core = game.core;
  window.EJS_gameName = game.id;
  window.EJS_gameID = stableNumericId(game.id);
  window.EJS_gameUrl = urls.rom;
  // FBNeo 需要按 romset 文件名查找 BIOS/父 ROM；保留 ZIP 比解压成散文件更可靠。
  window.EJS_biosUrl = urls.bios ?? "";
  window.EJS_gameParentUrl = urls.parentRom ?? "";
  window.EJS_dontExtractBIOS = true;
  window.EJS_pathtodata = "/emulatorjs/data/";
  window.EJS_controlScheme = "arcade";
  window.EJS_defaultControls = createArcadeDefaultControls();
  window.EJS_language = "zh-CN";
  window.EJS_disableAutoLang = true;
  window.EJS_startOnLoaded = true;
  // 4.2.3 的 FBNeo 首次启动部分街机 ROM 会停在黑屏，一次延迟软重置可正常进入主板启动画面。
  window.EJS_softLoad = 1;
  window.EJS_threads = globalThis.crossOriginIsolated === true;
  window.EJS_color = game.accent;
  window.EJS_backgroundColor = "#050607";
  window.EJS_defaultOptions = {
    "retroarch_core": "fbneo",
    "save-state-location": "browser",
    "save-save-interval": "30"
  };

  if (resumeState?.data) {
    stateObjectUrl = URL.createObjectURL(new Blob([resumeState.data], { type: "application/octet-stream" }));
    window.EJS_loadStateURL = stateObjectUrl;
  }

  window.EJS_ready = () => {
    elements.boot.hidden = true;
    updateSaveIndicator(repository.persistent ? "本地存档已连接" : "仅在本次会话保存", repository.persistent);
  };
  window.EJS_onGameStart = () => {
    elements.boot.hidden = true;
    repository.recordPlayed(game.id).catch(console.error);
  };
  window.EJS_onSaveState = (payload) => {
    repository.saveState(game.id, payload)
      .then(() => updateSaveIndicator("即时存档已保存"))
      .catch((error) => updateSaveIndicator(`保存失败：${error.message}`, false));
  };
  window.EJS_onSaveSave = (payload) => {
    repository.saveNative(game.id, payload)
      .then(() => updateSaveIndicator("游戏原生存档已备份"))
      .catch((error) => updateSaveIndicator(`备份失败：${error.message}`, false));
  };

  const loader = document.createElement("script");
  loader.src = "/emulatorjs/data/loader.js";
  loader.addEventListener("error", () => showError("模拟器资源缺失", "请先运行 npm run prepare:emulator，或重新构建 Docker 镜像。"), { once: true });
  document.body.append(loader);
}

async function init() {
  const parameters = new URLSearchParams(window.location.search);
  const gameId = parameters.get("id");
  const runtimeFolder = parameters.get("folder");
  if (!gameId) {
    showError("没有选择游戏", "请返回大厅并选择一个已经挂载资源的游戏。");
    return;
  }

  try {
    await requestPersistentBrowserStorage();
    const repositoryPromise = createSaveRepository();
    const cachedCatalog = readCatalogCache();
    let game = cachedCatalog?.games.find((item) => item.id === gameId);
    if (runtimeFolder && (!game || game.runtimeFolder !== runtimeFolder)) {
      game = await gameFromRuntime(runtimeFolder);
      if (game.id !== gameId) throw new Error("游戏目录与请求的游戏 ID 不一致");
      upsertCachedGame(game);
    }
    if (!game) game = (await loadCatalog()).games.find((item) => item.id === gameId);
    const repository = await repositoryPromise;
    if (!game) {
      showError("游戏不存在", `清单中没有 ID 为“${gameId}”的游戏。`);
      return;
    }

    document.title = `${game.title} · Arcade Vault`;
    elements.title.textContent = game.title;
    elements.platform.textContent = `${game.platform} / ${game.core.toUpperCase()}`;
    elements.bootTitle.textContent = `正在装载 ${game.title}`;
    installMoveListPanel(game.id);

    const status = await probeGameResources(game);
    if (!status.ready) {
      const missing = status.missing.map((item) => `${item.label}：${item.url}`).join("；");
      showError("游戏资源不完整", `请检查 Docker 映射目录。缺少 ${missing}`);
      return;
    }

    const selectedState = await chooseResume(await repository.getLatestState(game.id));
    elements.bootTitle.textContent = `正在启动 ${game.title}`;
    elements.bootMessage.textContent = "首次装载会下载并缓存游戏资源，之后启动将优先读取本机缓存。";
    installEmulator(game, getGameResourceUrls(game), repository, selectedState);
  } catch (error) {
    console.error(error);
    showError("启动失败", error.message || "发生未知错误，请查看浏览器控制台。");
  }
}

document.querySelector("#fullscreen").addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await elements.shell.requestFullscreen();
  } catch (error) {
    console.warn("浏览器拒绝了全屏请求", error);
    updateSaveIndicator("浏览器拒绝了全屏请求", false);
  }
});

window.addEventListener("beforeunload", () => {
  removeKeyboardBridge();
  if (stateObjectUrl) URL.revokeObjectURL(stateObjectUrl);
});

installThemeToggle(document.querySelector("#theme-toggle"));
init();
