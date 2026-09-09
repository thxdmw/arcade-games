export function gameEditionLabel(game) {
  const title = game.title.toLocaleLowerCase("zh-CN");
  let edition = "街机版";
  if (title.includes("正版") || title.includes("原版")) edition = "原版";
  else if (title.includes("修改") || title.includes("改版") || title.includes("hack") || title.includes("mugen")) edition = "修改版";

  const dependency = game.parentRom ? "需父 ROM" : "独立 ROM";
  return `${game.id.toUpperCase()} · ${edition} · ${dependency}`;
}

export function machinePreviewTitle(title, maximumLength = 18) {
  const normalized = title.replaceAll("_", " ").trim();
  return normalized.length > maximumLength ? `${normalized.slice(0, maximumLength - 1)}…` : normalized;
}
