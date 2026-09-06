import { getGameResourceUrls, loadCatalog, probeGameResources } from "./catalog.js";
import { createSaveRepository } from "./storage.js";

const elements = {
  grid: document.querySelector("#game-grid"),
  filters: document.querySelector("#filters"),
  search: document.querySelector("#search"),
  availableCount: document.querySelector("#available-count"),
  notice: document.querySelector("#resource-notice"),
  empty: document.querySelector("#empty-state"),
  featured: document.querySelector("#play-featured"),
  setup: document.querySelector("#setup"),
  storageStatus: document.querySelector("#storage-status")
};

const view = {
  catalog: null,
  availability: new Map(),
  filter: "全部",
  query: "",
  recentIds: []
};

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function navigateToGame(gameId) {
  window.location.href = `/play.html?id=${encodeURIComponent(gameId)}`;
}

function availabilityLabel(status) {
  if (!status) return { className: "checking", text: "检测资源" };
  if (status.ready) return { className: "ready", text: "可以运行" };
  return { className: "missing", text: `缺少 ${status.missing.map((item) => item.label).join(" / ")}` };
}

function createGameCard(game, visibleIndex) {
  const status = view.availability.get(game.id);
  const label = availabilityLabel(status);
  const card = createElement("article", "game-card");
  card.dataset.index = String(visibleIndex + 1).padStart(2, "0");
  card.style.setProperty("--game-accent", game.accent);

  const urls = getGameResourceUrls(game, view.catalog.resources);
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
  footer.append(createElement("span", "", `${game.series} · ${game.genre}`));
  const button = createElement("button", "play-button", "▶");
  button.type = "button";
  button.disabled = !status?.ready;
  button.setAttribute("aria-label", status?.ready ? `运行${game.title}` : `${game.title}资源不完整`);
  button.addEventListener("click", () => navigateToGame(game.id));
  footer.append(button);
  body.append(meta, title, description, footer);
  card.append(cover, body);
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
  const detectionComplete = view.availability.size === view.catalog.games.length;
  elements.availableCount.textContent = String(readyGames.length);
  elements.notice.hidden = readyGames.length > 0 || view.availability.size < view.catalog.games.length;

  const featured = readyGames.find((game) => game.featured) ?? readyGames[0];
  elements.featured.disabled = !featured && !detectionComplete;
  elements.featured.onclick = featured ? () => navigateToGame(featured.id) : () => {
    elements.setup.hidden = false;
    elements.setup.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  if (!featured) elements.featured.textContent = detectionComplete ? "挂载游戏资源 ↘" : "正在检测资源…";
}

async function detectResources() {
  await Promise.all(view.catalog.games.map(async (game) => {
    const status = await probeGameResources(game, view.catalog.resources);
    view.availability.set(game.id, status);
    renderGames();
    updateSummary();
  }));
}

function bindSetupPanel() {
  const show = () => {
    elements.setup.hidden = false;
    elements.setup.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  document.querySelector("#show-setup").addEventListener("click", show);
  document.querySelector("#close-setup").addEventListener("click", () => { elements.setup.hidden = true; });
}

async function init() {
  try {
    const [catalog, repository] = await Promise.all([loadCatalog(), createSaveRepository()]);
    view.catalog = catalog;
    view.recentIds = (await repository.getRecent()).map((entry) => entry.gameId);
    if (!repository.persistent) {
      elements.storageStatus.lastElementChild.textContent = "本地持久存储不可用";
      elements.storageStatus.querySelector(".status-dot").style.background = "#ff5c35";
    }
    renderFilters();
    renderGames();
    updateSummary();
    await detectResources();
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
init();
