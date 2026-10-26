import { createRng } from "../js/rng.js";
import { createClock, advanceClock, seasonForDay } from "../js/clock.js";
import {
  createLawn,
  tickGrowth,
  cutCell,
  SEASON_MULT,
  KIND,
} from "../js/sim/lawn.js";
import { pointsForCut, applyPoints } from "../js/sim/scoring.js";
import { serializeState, migrate, hydrateLawn } from "../js/save.js";
import { applyLayout } from "../js/sim/lawn.js";
import { effectiveQuality } from "../js/entities/tools.js";

const results = document.getElementById("results");
const summary = document.getElementById("summary");
let passed = 0;
let failed = 0;
let skipped = 0;

function row(ok, name, detail, skip = false) {
  const div = document.createElement("div");
  div.className = `row ${skip ? "skip" : ok ? "pass" : "fail"}`;
  div.textContent = `${skip ? "SKIP" : ok ? "PASS" : "FAIL"}  ${name} — ${detail}`;
  results.appendChild(div);
  if (skip) skipped += 1;
  else if (ok) passed += 1;
  else failed += 1;
}

function assert(name, cond, detail) {
  row(!!cond, name, detail);
}

function skip(name, reason) {
  row(true, name, reason, true);
}

const config = {
  schemaVersion: 1,
  lawn: {
    width: 32,
    height: 24,
    minHeight: 0.5,
    maxHeight: 12,
    idealMin: 2.5,
    idealMax: 3.5,
    overgrownHeight: 6,
    scalpHeight: 1.5,
    startHeightMin: 3,
    startHeightMax: 3,
    startMoisture: 55,
    startHealth: 100,
  },
  growth: { baseRate: 0.02 },
  scoring: { cleanCut: 2, roughCut: 1, overgrownPerHour: 1, scalped: 10 },
};

const rng = createRng(12345);
const lawn = createLawn(8, 8, rng, config);

assert(
  "Seeded RNG is stable",
  createRng(99).next() === createRng(99).next(),
  "same seed, same first value"
);

assert("Lawn layout has grass", lawn.kind[4 * 8 + 4] === KIND.grass, `kind=${lawn.kind[4 * 8 + 4]}`);

const springLawn = createLawn(4, 4, createRng(1), {
  ...config,
  lawn: { ...config.lawn, startHeightMin: 2.5, startHeightMax: 2.5, startHealth: 100 },
});
for (let i = 0; i < 24; i++) {
  tickGrowth(springLawn, config, {
    seasonMult: SEASON_MULT.spring,
    waterMultStub: 1,
    growthSpeed: 1,
  });
}
let sample = 0;
let count = 0;
for (let i = 0; i < springLawn.heightArr.length; i++) {
  if (springLawn.kind[i] !== KIND.grass) continue;
  sample += springLawn.heightArr[i];
  count += 1;
}
const grown = sample / count - 2.5;
assert(
  "Growth: 24h spring ideal is about 0.5 in",
  grown > 0.4 && grown < 0.8,
  `grew ${grown.toFixed(3)} in (formula 0.02 × 1.4 × 24 = 0.672)`
);

const cutLawn = createLawn(8, 8, createRng(2), config);
const gx = 3;
const gy = 5;
const gi = gy * 8 + gx;
cutLawn.kind[gi] = KIND.grass;
cutLawn.heightArr[gi] = 6;
cutLawn.health[gi] = 100;
const third = cutCell(cutLawn, gx, gy, 3, 0.9, 10, {
  minHeight: 0.5,
  scalpHeight: 1.5,
  oneThirdPenalty: 15,
  oneThirdWarningOnly: false,
});
assert(
  "One third rule: 6 in to 3 in costs 15 health",
  third && third.oneThird && cutLawn.health[gi] === 85,
  `oneThird=${third && third.oneThird} health=${cutLawn.health[gi]}`
);

cutLawn.heightArr[gi] = 4.5;
cutLawn.health[gi] = 100;
const okCut = cutCell(cutLawn, gx, gy, 3, 0.9, 10, {
  minHeight: 0.5,
  scalpHeight: 1.5,
  oneThirdPenalty: 15,
  oneThirdWarningOnly: false,
});
assert(
  "One third rule: 4.5 in to 3 in does not penalize",
  okCut && !okCut.oneThird && cutLawn.health[gi] === 100,
  `oneThird=${okCut && okCut.oneThird} health=${cutLawn.health[gi]}`
);

cutLawn.heightArr[gi] = 4;
cutLawn.health[gi] = 100;
const scalp = cutCell(cutLawn, gx, gy, 1.4, 0.9, 10, {
  minHeight: 0.5,
  scalpHeight: 1.5,
  oneThirdPenalty: 15,
  oneThirdWarningOnly: false,
});
assert("Scalping flags cells under 1.5 in", scalp && scalp.scalped, `scalped=${scalp && scalp.scalped}`);

const clock = createClock(24, 23.5);
const step = advanceClock(clock, 15, 6, 1);
assert(
  "Clock rolls the day at midnight",
  clock.day === 2 && clock.hour < 1 && step.dayRolled,
  `day=${clock.day} hour=${clock.hour.toFixed(2)}`
);

assert("Season helper starts in spring", seasonForDay(1) === "spring", seasonForDay(1));

const clean = pointsForCut({ newHeight: 3, quality: 0.85, scalped: false }, config);
assert("Clean cut scores +2", clean.points === 2, `${clean.kind} ${clean.points}`);

const economy = { points: 0, coins: 250 };
applyPoints(economy, 12);
assert("Coins: 1 per 10 points, starting coins kept", economy.points === 12 && economy.coins === 251, JSON.stringify(economy));

const q = effectiveQuality({ baseQuality: 0.7 }, 100);
assert("Scissors quality at full sharpness is 0.70", Math.abs(q - 0.7) < 1e-9, String(q));

skip("Watering time", "Phase 2 — not implemented yet");
skip("Pay formula", "Phase 3 — not implemented yet");
skip("Traits", "Phase 3 — not implemented yet");
skip("Seeded weather 30-day forecast", "Phase 2 — not implemented yet");

const fakeState = {
  schemaVersion: 1,
  createdAt: "2026-10-26T00:00:00Z",
  seed: 1,
  rng: createRng(1),
  difficulty: "normal",
  clock: { day: 2, hour: 8.25 },
  game: {
    season: "spring",
    weatherToday: "sunny",
    weatherTomorrow: "rain",
    dayLengthMinutes: 6,
    zonesOwned: ["front"],
  },
  economy: { coins: 250, points: 20, streakDays: 0, hoaWarnings: 0 },
  lawn: springLawn,
  player: { x: 40, y: 40, facing: "down" },
  overlay: "none",
  activeCharacterId: "c1",
  characters: [],
  inventory: { tools: [{ id: "scissors", sharpness: 80 }], equippedTool: "scissors", supplies: {} },
  settings: { volume: 0.7, colorblind: false, reducedMotion: false },
};

const packed = serializeState(fakeState);
const again = migrate(packed);
const restored = hydrateLawn(again.lawn, applyLayout);
let match = restored.heightArr.length === springLawn.heightArr.length;
for (let i = 0; i < restored.heightArr.length; i++) {
  if (Math.abs(restored.heightArr[i] - springLawn.heightArr[i]) > 1e-5) match = false;
}
assert("Save round trip keeps lawn heights", match, `cells=${restored.heightArr.length}`);
assert("Save carries schemaVersion 1", again.schemaVersion === 1, String(again.schemaVersion));

summary.textContent = `${passed} passed, ${failed} failed, ${skipped} skipped`;
document.title = failed ? `FAIL ${failed}` : `PASS ${passed}`;
