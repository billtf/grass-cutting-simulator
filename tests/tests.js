import { createRng } from "../js/rng.js";
import { createClock, advanceClock, seasonForDay } from "../js/clock.js";
import {
  createLawn,
  tickGrowth,
  cutCell,
  SEASON_MULT,
  KIND,
  cellNeedsCut,
  ensureTallEnoughLawn,
  averageHeight,
} from "../js/sim/lawn.js";
import { pointsForCut, applyPoints } from "../js/sim/scoring.js";
import { serializeState, migrate, hydrateLawn } from "../js/save.js";
import { applyLayout } from "../js/sim/lawn.js";
import { effectiveQuality } from "../js/entities/tools.js";
import { addXp, xpToNext } from "../js/sim/xp.js";
import { canBuyTool, buyTool, makeOwnedTool } from "../js/sim/shop.js";
import { isEdgeCell, toolCanCutCell, toolBlockedReason, swathTiles, cutAttemptTiles } from "../js/sim/cutting.js";
import { waterEfficiency, applyWater } from "../js/sim/care.js";
import { weatherForDay } from "../js/sim/weather.js";
import { jobPay } from "../js/sim/jobs.js";
import { traitValue } from "../js/sim/traits.js";

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

const hero = { level: 1, xp: 0, skillPoints: 0 };
const gained = addXp(hero, xpToNext(1));
assert("XP: first level-up at 40 points", gained === 1 && hero.level === 2, `level=${hero.level} xp=${hero.xp}`);

const shopState = {
  economy: { coins: 250 },
  inventory: { tools: [makeOwnedTool({ id: "scissors" })] },
};
const knife = { id: "kitchen_knife", unlockLevel: 2, cost: 150 };
assert("Shop locks knife at level 1", !canBuyTool(shopState, knife, { level: 1 }).ok, canBuyTool(shopState, knife, { level: 1 }).reason);
const bought = buyTool(shopState, knife, { level: 2 });
assert("Shop sells knife at level 2", bought.ok && shopState.economy.coins === 100 && shopState.inventory.tools.length === 2, JSON.stringify(shopState.economy));

const edgeLawn = createLawn(8, 8, createRng(3), config);
assert("Fence-adjacent grass is an edge", isEdgeCell(edgeLawn, 1, 4), "col 1 should be edge");
assert("Interior grass is not an edge", !isEdgeCell(edgeLawn, 4, 5), "center should be open");
const mower = { skipsEdges: true, edgesOnly: false };
const trimmer = { skipsEdges: false, edgesOnly: true };
assert("Mower skips edges", !toolCanCutCell(edgeLawn, mower, 1, 4), "mower on edge");
assert("Trimmer cuts edges only", toolCanCutCell(edgeLawn, trimmer, 1, 4) && !toolCanCutCell(edgeLawn, trimmer, 4, 5), "trimmer rules");

const reel = { maxGrassHeight: 5, needsFuel: false };
const tallTiles = [{ x: 4, y: 5 }];
edgeLawn.heightArr[5 * 8 + 4] = 6;
assert(
  "Reel mower stalls over 5 in",
  !!toolBlockedReason(reel, {}, edgeLawn, tallTiles),
  toolBlockedReason(reel, {}, edgeLawn, tallTiles)
);

const swath = swathTiles({ x: 4, y: 5 }, "up", 3);
assert("Width-3 swath is 3 tiles", swath.length === 3 && swath.every((t) => t.y === 4), JSON.stringify(swath));

const attempt = cutAttemptTiles({ x: 4, y: 5 }, "up", 1);
assert(
  "Cut attempt includes standing cell and facing cell",
  attempt.some((t) => t.x === 4 && t.y === 5) && attempt.some((t) => t.x === 4 && t.y === 4) && attempt.length === 2,
  JSON.stringify(attempt)
);

cutLawn.heightArr[gi] = 3;
cutLawn.health[gi] = 100;
const alreadyShort = cutCell(cutLawn, gx, gy, 3, 0.9, 10, {
  minHeight: 0.5,
  scalpHeight: 1.5,
  oneThirdPenalty: 15,
  oneThirdWarningOnly: false,
});
assert("Already-short cell is a no-op", alreadyShort === null, String(alreadyShort));
assert("cellNeedsCut is false at target", !cellNeedsCut(cutLawn, gx, gy, 3, 0.5), "");
cutLawn.heightArr[gi] = 4.2;
assert("cellNeedsCut is true when tall", cellNeedsCut(cutLawn, gx, gy, 3, 0.5), "");

const shortSave = createLawn(8, 8, createRng(5), {
  ...config,
  lawn: { ...config.lawn, startHeightMin: 2.6, startHeightMax: 2.6 },
});
const firstBoost = ensureTallEnoughLawn(shortSave, config, false);
assert(
  "Short save lawns get a visible height boost",
  firstBoost.boosted && firstBoost.average > 4,
  `avg=${firstBoost.average.toFixed(2)} boosted=${firstBoost.boosted}`
);
const skipBoost = ensureTallEnoughLawn(shortSave, config, true);
assert("Height boost does not repeat when flagged", !skipBoost.boosted, `avg=${skipBoost.average.toFixed(2)}`);
assert("averageHeight matches boosted lawn", Math.abs(averageHeight(shortSave) - firstBoost.average) < 1e-6, "");

assert("Watering time: 7am is full, noon is 60%", waterEfficiency(7) === 1 && waterEfficiency(12) === 0.6, `${waterEfficiency(7)} ${waterEfficiency(12)}`);

const wetLawn = createLawn(8, 8, createRng(4), config);
wetLawn.moisture[5 * 8 + 4] = 40;
const morning = applyWater(wetLawn, [{ x: 4, y: 5 }], 20, 7, 0);
const noonLawn = createLawn(8, 8, createRng(4), config);
noonLawn.moisture[5 * 8 + 4] = 40;
const noon = applyWater(noonLawn, [{ x: 4, y: 5 }], 20, 12, 0);
assert("Morning water adds more than noon", morning.count === 1 && wetLawn.moisture[5 * 8 + 4] > noonLawn.moisture[5 * 8 + 4], `${wetLawn.moisture[5 * 8 + 4]} vs ${noonLawn.moisture[5 * 8 + 4]}`);

const table = {
  daysPerSeason: 14,
  types: { sunny: { dry: 5, rain: 0, label: "Sunny" }, rain: { dry: 0, rain: 14, label: "Rain" } },
  weights: { spring: { sunny: 1, rain: 0 }, summer: { sunny: 1, rain: 0 }, fall: { sunny: 1, rain: 0 }, winter: { sunny: 1, rain: 0 } },
};
const a = [];
const b = [];
const ra = createRng(777);
const rb = createRng(777);
for (let d = 1; d <= 30; d++) {
  a.push(weatherForDay(ra, d, 1, table).actual);
  b.push(weatherForDay(rb, d, 1, table).actual);
}
assert("Seeded weather: same seed, same 30 days", a.join() === b.join(), a.slice(0, 5).join(","));

assert(
  "Pay formula: quality 0.9 on time no tip is 1.4x",
  jobPay(100, 0.9, 1, 0) === 140,
  String(jobPay(100, 0.9, 1, 0))
);
const speedster = { traits: ["speedster"] };
const traits = [
  { id: "speedster", modifiers: [{ stat: "moveSpeedMult", value: 1.2 }, { stat: "qualityMult", value: 0.95 }] },
  { id: "penny_pincher", modifiers: [{ stat: "shopPriceMult", value: 0.9 }] },
];
assert("Traits: Speedster +20% move", traitValue(speedster, traits, "moveSpeedMult", {}, 1) === 1.2, String(traitValue(speedster, traits, "moveSpeedMult", {}, 1)));
assert("Traits: Penny Pincher 10% off", traitValue({ traits: ["penny_pincher"] }, traits, "shopPriceMult", {}, 1) === 0.9, "");

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
