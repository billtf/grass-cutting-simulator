/** Weekly HOA inspection, warnings, and fines. */

import { KIND } from "./lawn.js";
import { applyPoints } from "./scoring.js";

export function inspectLawn(lawn, idealMin, idealMax) {
  let inBand = 0;
  let grass = 0;
  const n = lawn.width * lawn.height;
  for (let i = 0; i < n; i++) {
    if (lawn.kind[i] !== KIND.grass) continue;
    grass += 1;
    if (lawn.heightArr[i] >= idealMin && lawn.heightArr[i] <= idealMax) inBand += 1;
  }
  const ratio = grass ? inBand / grass : 1;
  return { grass, inBand, ratio, pass: ratio >= 0.7 };
}

export function applyInspection(state, result, scoring) {
  state.economy.hoaWarnings = state.economy.hoaWarnings || 0;
  if (result.pass) {
    applyPoints(state.economy, scoring.passPoints);
    return { kind: "pass", points: scoring.passPoints, fine: 0 };
  }
  applyPoints(state.economy, -scoring.failPoints);
  state.economy.hoaWarnings += 1;
  let fine = 0;
  if (state.economy.hoaWarnings >= state.difficultyRules.hoaWarningsBeforeFine) {
    fine = scoring.fineCoins;
    state.economy.coins = Math.max(0, state.economy.coins - fine);
    state.economy.hoaWarnings = 0;
  }
  return { kind: "fail", points: -scoring.failPoints, fine, warnings: state.economy.hoaWarnings };
}
