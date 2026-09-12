const KOV_FAST_POWER = Object.freeze({
  gameId: "kov",
  externalPath: "/fbneo/cheats/kov.ini",
  sourceUrl: "/assets/cheats/kov.ini?v=fast-charge-v5",
  optionName: "fbneo-cheat-0-kov-Fast_Charge_PL1"
});

export function getFastPowerFeature(game) {
  if (game?.id !== KOV_FAST_POWER.gameId || game?.core !== "fbneo") return null;
  return KOV_FAST_POWER;
}

export function configureGameFeatureFiles(target, feature) {
  if (!feature) return;
  target.EJS_externalFiles = {
    ...(target.EJS_externalFiles ?? {}),
    [feature.externalPath]: feature.sourceUrl
  };
}
