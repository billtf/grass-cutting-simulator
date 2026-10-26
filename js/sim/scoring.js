/** Points, coins, and HOA stubs. No canvas, no DOM. */

export function pointsForCut(result, config) {
  if (!result) return { points: 0, kind: "none" };
  if (result.scalped) {
    return { points: -config.scoring.scalped, kind: "scalped" };
  }
  const idealMin = 2.5;
  const idealMax = 3.5;
  const inBand = result.newHeight >= idealMin && result.newHeight <= idealMax;
  if (!inBand) return { points: 0, kind: "offband" };
  if (result.quality >= 0.8) {
    return { points: config.scoring.cleanCut, kind: "clean" };
  }
  if (result.quality >= 0.5) {
    return { points: config.scoring.roughCut, kind: "rough" };
  }
  return { points: 0, kind: "torn" };
}

export function overgrownPenalty(overgrownCount, config) {
  return overgrownCount * config.scoring.overgrownPerHour;
}

export function applyPoints(economy, delta) {
  const before = Math.floor(Math.max(0, economy.points || 0) / 10);
  economy.points = Math.max(0, (economy.points || 0) + delta);
  const after = Math.floor(economy.points / 10);
  economy.coins = Math.max(0, (economy.coins || 0) + (after - before));
  return { points: economy.points, coins: economy.coins, kindDelta: after - before };
}
