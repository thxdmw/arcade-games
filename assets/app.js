import { gameFromRuntime, getGameResourceUrls, listRuntimeGameNames, loadCatalog, normalizeCatalog } from "./catalog.js";
import { readCatalogCache, writeCatalogCache } from "./catalog-cache.js";
import { gameEditionLabel, machinePreviewTitle } from "./game-presentation.js";
import { createSaveRepository } from "./storage.js";
import { installThemeToggle } from "./theme.js";

const elements = {
  grid: document.querySelector("#game-grid"),
  filters: document.querySelector("#filters"),
  search: document.querySelector("#search"),
  availableCount: document.querySelector("#available-count"),
  notice: document.querySelector("#resource-notice"),
  empty: document.querySelector("#empty-state"),
  setup: document.querySelector("#setup"),
  storageStatus: document.querySelector("#storage-status"),
  refresh: document.querySelector("#refresh-games"),
  catalogStatus: document.querySelector("#catalog-status"),
  machineCount: document.querySelector("#machine-game-count"),
  machineScreen: document.querySelector("#machine-screen"),
  machineKicker: document.querySelector("#machine-screen-kicker"),
  machineTitle: document.querySelector("#machine-screen-title"),
  machinePrompt: document.querySelector("#machine-screen-prompt"),
  randomGame: document.querySelector("#random-game")
};

const view = {
  catalog: null,
  availability: new Map(),
  filter: "全部",
  query: "",
  recentIds: [],
  refreshing: false
};

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function navigateToGame(game) {
  window.location.href = `/play.html?id=${encodeURIComponent(game.id)}&folder=${encodeURIComponent(game.runtimeFolder)}`;
}

function availabilityLabel(status) {
  if (!status) return { className: "checking", text: "检测资源" };
  if (status.ready) return { className: "ready", text: "可以运行" };
  return { className: "missing", text: `缺少 ${status.missing.map((item) => item.label).join(" / ")}` };
}

function resetMachinePreview() {
  elements.machineScreen.classList.remove("is-preview");
  elements.machineKicker.textContent = "READY?";
  elements.machineTitle.textContent = "FIGHT!";
  elements.machinePrompt.textContent = "CHOOSE YOUR GAME";
}

function previewGame(game) {
  elements.machineScreen.classList.add("is-preview");
  elements.machineKicker.textContent = game.series;
  elements.machineTitle.textContent = machinePreviewTitle(game.title);
  elements.machinePrompt.textContent = game.id.toUpperCase();
}

function createGameCard(game, visibleIndex) {
  const status = view.availability.get(game.id);
  const label = availabilityLabel(status);
  const card = createElement("article", "game-card");
  card.dataset.index = String(visibleIndex + 1).padStart(2, "0");
  card.dataset.gameId = game.id;
  card.style.setProperty("--game-accent", game.accent);

  const urls = getGameResourceUrls(game);
  const cover = createElement("div", "game-cover");
  if (urls.cover) cover.style.backgroundImage = `url("${urls.cover}")`;

  const body = createElement("div", "game-card-body");
  const meta = createElement("div", "game-meta");
  meta.append(createElement("span", "", `${game.platform} / ${game.year ?? "—"}`));
  const state = createElement("span", `availability ${label.className}`);
  state.append(createElement("i"), document.createTextNode(label.text));
  meta.append(state);

  const title = createElement("h3", "", game.title);
  const description = createElement("p", "", game.description);
  const footer = createElement("div", "game-card-footer");
  footer.append(createElement("span", "game-edition", gameEditionLabel(game)));
  const button = createElement("button", "play-button", "▶");
  button.type = "button";
  button.disabled = !status?.ready;
  button.setAttribute("aria-label", status?.ready ? `运行${game.title}` : `${game.title}资源不完整`);
  button.addEventListener("click", () => navigateToGame(game));
  footer.append(button);
  body.append(meta, title, description, footer);
  card.append(cover, body);
  card.addEventListener("mouseenter", () => previewGame(game));
  card.addEventListener("mouseleave", resetMachinePreview);
  card.addEventListener("focusin", () => previewGame(game));
  card.addEventListener("focusout", (event) => {
    if (!card.contains(event.relatedTarget)) resetMachinePreview();
  });
  return card;
}

function filteredGames() {
  const normalizedQuery = view.query.trim().toLocaleLowerCase("zh-CN");
  return view.catalog.games.filter((game) => {
    const matchesFilter = view.filter === "全部" || (view.filter === "最近游玩" ? view.recentIds.includes(game.id) : game.genre === view.filter);
    const haystack = `${game.title} ${game.series} ${game.platform}`.toLocaleLowerCase("zh-CN");
    return matchesFilter && (!normalizedQuery || haystack.includes(normalizedQuery));
  });
}

function renderGames() {
  if (!view.catalog) return;
  const games = filteredGames();
  elements.grid.replaceChildren(...games.map(createGameCard));
  elements.empty.hidden = games.length !== 0;
}

function renderFilters() {
  const names = ["全部", ...new Set(view.catalog.games.map((game) => game.genre))];
  if (view.recentIds.length) names.push("最近游玩");
  elements.filters.replaceChildren(...names.map((name) => {
    const button = createElement("button", `filter-button${view.filter === name ? " active" : ""}`, name);
    button.type = "button";
    button.addEventListener("click", () => {
      view.filter = name;
      renderFilters();
      renderGames();
    });
    return button;
  }));
}

function updateSummary() {
  const readyGames = view.catalog.games.filter((game) => view.availability.get(game.id)?.ready);
  elements.availableCount.textContent = String(readyGames.length);
  elements.machineCount.textContent = String(readyGames.length);
  elements.notice.hidden = readyGames.length > 0 || view.availability.size < view.catalog.games.length;
}

function selectRandomGame() {
  const games = filteredGames().filter((game) => view.availability.get(game.id)?.ready);
  if (!games.length) return;
  const game = games[Math.floor(Math.random() * games.length)];
  previewGame(game);
  const card = elements.grid.querySelector(`[data-game-id="${CSS.escape(game.id)}"]`);
  if (!card) return;
  card.classList.add("is-random-pick");
  card.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => card.classList.remove("is-random-pick"), 1800);
}

function applyCatalog(catalog) {
  view.catalog = catalog;
  view.availability = new Map(catalog.games.map((game) => [game.id, { ready: true, missing: [] }]));
  writeCatalogCache(catalog);
  renderFilters();
  renderGames();
  updateSummary();
}

function setRefreshState(refreshing, message) {
  view.refreshing = refreshing;
  elements.refresh.disabled = refreshing;
  elements.refresh.classList.toggle("is-loading", refreshing);
  elements.catalogStatus.textContent = message;
}

async function syncRuntimeCatalog(force = false) {
  if (view.refreshing) return;
  setRefreshState(true, force ? "正在重新扫描…" : "正在检查新游戏…");
  try {
    if (force || !view.catalog) {
      applyCatalog(await loadCatalog());
    } else {
      const gameNames = await listRuntimeGameNames();
      const existing = new Map(view.catalog.games.map((game) => [game.runtimeFolder, game]));
      const addedNames = gameNames.filter((name) => !existing.has(name));
      const addedResults = await Promise.allSettled(addedNames.map((name) => gameFromRuntime(name)));
      const addedGames = addedResults.filter((result) => result.status === "fulfilled").map((result) => result.value);
      const games = gameNames.map((name) => existing.get(name) ?? addedGames.find((game) => game.runtimeFolder === name)).filter(Boolean);
      if (games.length !== view.catalog.games.length || addedGames.length > 0) {
        applyCatalog(normalizeCatalog({ version: 4, games }));
      }
    }
    setRefreshState(false, "自动发现已开启");
  } catch (error) {
    console.error(error);
    setRefreshState(false, `检查失败：${error.message}`);
  }
}

function bindSetupPanel() {
  const show = () => {
    elements.setup.hidden = false;
  };
  document.querySelector("#show-setup").addEventListener("click", show);
  document.querySelector("#close-setup").addEventListener("click", () => { elements.setup.hidden = true; });
}

async function init() {
  try {
    const cachedCatalog = readCatalogCache();
    const repositoryPromise = createSaveRepository();
    if (cachedCatalog) applyCatalog(cachedCatalog);
    else applyCatalog(await loadCatalog());
    const repository = await repositoryPromise;
    view.recentIds = (await repository.getRecent()).map((entry) => entry.gameId);
    if (!repository.persistent) {
      elements.storageStatus.lastElementChild.textContent = "本地持久存储不可用";
      elements.storageStatus.querySelector(".status-dot").style.background = "#ff5c35";
    }
    renderFilters();
    renderGames();
    if (cachedCatalog) await syncRuntimeCatalog();
  } catch (error) {
    console.error(error);
    elements.grid.replaceChildren();
    elements.empty.hidden = false;
    elements.empty.textContent = `游戏清单不可用：${error.message}`;
  }
}

elements.search.addEventListener("input", (event) => {
  view.query = event.currentTarget.value;
  renderGames();
});
bindSetupPanel();
elements.refresh.addEventListener("click", () => syncRuntimeCatalog(true));
elements.randomGame.addEventListener("click", selectRandomGame);
window.setInterval(() => {
  if (document.visibilityState === "visible") syncRuntimeCatalog();
}, 15000);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") syncRuntimeCatalog();
});
installThemeToggle(document.querySelector("#theme-toggle"));
init();
