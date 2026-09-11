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
  if (!moveList || !trigger || !dialog) return false;

  const title = dialog.querySelector("#move-list-title");
  const description = dialog.querySelector("#move-list-description");
  const input = dialog.querySelector("#move-list-search");
  const shortcuts = dialog.querySelector("#move-list-shortcuts");
  const results = dialog.querySelector("#move-list-results");
  const resultCount = dialog.querySelector("#move-list-result-count");
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

  trigger.addEventListener("click", () => {
    dialog.showModal();
    trigger.setAttribute("aria-expanded", "true");
    render(input.value);
    input.focus();
  });
  dialog.querySelector("#move-list-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => trigger.setAttribute("aria-expanded", "false"));
  input.addEventListener("input", () => render(input.value));
  render();
  return true;
}

