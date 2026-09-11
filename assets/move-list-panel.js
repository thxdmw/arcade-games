import { filterMoveList, getMoveList } from "./move-lists.js";

function appendMoveRow(container, move) {
  const row = document.createElement("div");
  row.className = "move-row";

  const heading = document.createElement("div");
  const name = document.createElement("strong");
  const category = document.createElement("span");
  name.textContent = move.name;
  category.textContent = move.category;
  heading.append(name, category);

  const command = document.createElement("code");
  command.textContent = move.command;
  const note = document.createElement("small");
  note.textContent = move.note;
  row.append(heading, command, note);
  container.append(row);
}

function appendCharacterCard(container, character) {
  const card = document.createElement("article");
  card.className = "move-character";
  const title = document.createElement("h3");
  title.textContent = character.name;
  card.append(title);
  character.moves.forEach((move) => appendMoveRow(card, move));
  container.append(card);
}

export function installMoveListPanel(gameId, root = document) {
  const moveList = getMoveList(gameId);
  const trigger = root.querySelector("#move-list-trigger");
  const dialog = root.querySelector("#move-list-dialog");
  const desktopHost = root.querySelector("#move-list-desktop");
  if (!moveList || !trigger || !dialog || !desktopHost) return false;

  const sheet = dialog.querySelector(".move-list-sheet");
  const title = sheet.querySelector("#move-list-title");
  const description = sheet.querySelector("#move-list-description");
  const input = sheet.querySelector("#move-list-search");
  const shortcuts = sheet.querySelector("#move-list-shortcuts");
  const results = sheet.querySelector("#move-list-results");
  const resultCount = sheet.querySelector("#move-list-result-count");
  const mobileLayout = globalThis.matchMedia?.("(max-width: 900px)");
  title.textContent = moveList.title;
  description.textContent = moveList.description;
  trigger.hidden = false;

  function render(query = "") {
    const characters = filterMoveList(moveList, query);
    results.replaceChildren();
    characters.forEach((character) => appendCharacterCard(results, character));
    resultCount.textContent = characters.length ? `找到 ${characters.length} 名人物` : "没有匹配的人物或招式";
    results.classList.toggle("is-empty", characters.length === 0);
  }

  moveList.characters.forEach((character) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = character.name;
    button.addEventListener("click", () => {
      input.value = character.name;
      render(character.name);
    });
    shortcuts.append(button);
  });

  function openMobilePanel() {
    if (!(mobileLayout?.matches ?? false) || dialog.open) return;
    dialog.append(sheet);
    dialog.showModal();
    trigger.setAttribute("aria-expanded", "true");
    render(input.value);
    input.focus();
  }

  trigger.addEventListener("click", () => {
    if (dialog.open) dialog.close();
    else openMobilePanel();
  });
  dialog.querySelector("#move-list-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => trigger.setAttribute("aria-expanded", "false"));
  function mountForLayout() {
    if (mobileLayout?.matches ?? false) {
      title.textContent = moveList.title;
      desktopHost.hidden = true;
      if (!dialog.contains(sheet)) dialog.append(sheet);
      return;
    }

    if (dialog.open) dialog.close();
    title.textContent = "人物出招表";
    desktopHost.append(sheet);
    desktopHost.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
  }

  mobileLayout?.addEventListener("change", mountForLayout);
  input.addEventListener("input", () => render(input.value));
  render();
  mountForLayout();
  return true;
}
