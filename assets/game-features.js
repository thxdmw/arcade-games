const KOV_FAST_POWER = Object.freeze({
  gameId: "kov",
  externalPath: "/fbneo/cheats/kov.ini",
  sourceUrl: "/assets/cheats/kov.ini",
  optionName: "fbneo-cheat-0-kov-Fast_Power_PL1",
  disabledValue: "0 - Disabled",
  enabledValue: "1 - Enabled"
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

export function setFastPowerEnabled(emulator, feature, enabled) {
  if (!feature || typeof emulator?.gameManager?.setVariable !== "function") return false;
  emulator.gameManager.setVariable(feature.optionName, enabled ? feature.enabledValue : feature.disabledValue);
  return true;
}
