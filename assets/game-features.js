function createFastPowerFeature(gameId, revision) {
  return Object.freeze({
    gameId,
    externalPath: `/fbneo/cheats/${gameId}.ini`,
    sourceUrl: `/assets/cheats/${gameId}.ini?v=${revision}`,
    optionName: `fbneo-cheat-0-${gameId}-Fast_Charge_PL1`
  });
}

const FAST_POWER_FEATURES = Object.freeze({
  kov: createFastPowerFeature("kov", "fast-charge-v5"),
  kovplus: createFastPowerFeature("kovplus", "fast-charge-v1"),
  kovsh: createFastPowerFeature("kovsh", "fast-charge-v2"),
  kovshp: createFastPowerFeature("kovshp", "fast-charge-v2"),
  kovytzy: createFastPowerFeature("kovytzy", "fast-charge-v2")
});

export function getFastPowerFeature(game) {
  if (game?.core !== "fbneo") return null;
  return FAST_POWER_FEATURES[game.id] ?? null;
}

export function configureGameFeatureFiles(target, feature) {
  if (!feature) return;
  target.EJS_externalFiles = {
    ...(target.EJS_externalFiles ?? {}),
    [feature.externalPath]: feature.sourceUrl
  };
}
