/** Moisture, watering, weeds, fertilizer, seed, leaves, aeration. No DOM. */

import { KIND, clamp, indexOf, inBounds, isCuttable } from "./lawn.js";

export function waterEfficiency(hour) {
  if (hour >= 5 && hour < 10) return 1;
  if (hour >= 11 && hour < 15) return 0.6;
  if (hour >= 20) return 1;
  return 0.85;
}

export function eveningWater(hour) {
  return hour >= 20;
}

export function diskTiles(cx, cy, radius) {
  const tiles = [];
  const r = radius || 0;
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r + 0.1) {
        tiles.push({ x, y });
      }
    }
  }
  return tiles;
}

function eachGrass(lawn, fn) {
  const n = lawn.width * lawn.height;
  for (let i = 0; i < n; i++) {
    if (lawn.kind[i] === KIND.grass) fn(i, i % lawn.width, (i - (i % lawn.width)) / lawn.width);
  }
}

export function ensureExtras(lawn) {
  const n = lawn.width * lawn.height;
  if (!lawn.seedDays) lawn.seedDays = new Uint8Array(n);
  if (!lawn.leafCover) lawn.leafCover = new Uint8Array(n);
  if (!lawn.aerateDays) lawn.aerateDays = new Uint8Array(n);
  if (!lawn.sprayHours) lawn.sprayHours = new Uint8Array(n);
  return lawn;
}

export function applyWater(lawn, tiles, amount, hour, billPerCell) {
  const eff = waterEfficiency(hour);
  const add = Math.round(amount * eff);
  let count = 0;
  let fungus = false;
  for (const t of tiles) {
    if (!isCuttable(lawn, t.x, t.y)) continue;
    const i = indexOf(lawn, t.x, t.y);
    lawn.moisture[i] = clamp(lawn.moisture[i] + add, 0, 100);
    if (eveningWater(hour) && lawn.moisture[i] > 70) {
      lawn.health[i] = clamp(lawn.health[i] - 2, 0, 100);
      fungus = true;
    }
    lawn.dirty[i] = 1;
    count += 1;
  }
  return { count, bill: Math.max(1, Math.round(count * billPerCell * 10)), fungus, full: eff >= 1 && hour < 10 };
}

export function applyFertilizer(lawn, tiles, amount, burnAt, burnLoss) {
  let burned = 0;
  let count = 0;
  for (const t of tiles) {
    if (!isCuttable(lawn, t.x, t.y)) continue;
    const i = indexOf(lawn, t.x, t.y);
    const next = clamp(lawn.fertilizer[i] + amount, 0, 100);
    if (next >= burnAt && lawn.fertilizer[i] < burnAt) {
      lawn.health[i] = clamp(lawn.health[i] - burnLoss, 0, 100);
      burned += 1;
    }
    lawn.fertilizer[i] = next;
    lawn.dirty[i] = 1;
    count += 1;
  }
  return { count, burned };
}

export function applyWeed(lawn, tiles, amount) {
  let cleared = 0;
  for (const t of tiles) {
    if (!isCuttable(lawn, t.x, t.y)) continue;
    const i = indexOf(lawn, t.x, t.y);
    const before = lawn.weed[i];
    lawn.weed[i] = clamp(before - amount, 0, 3);
    if (before > 0 && lawn.weed[i] === 0) cleared += 1;
    lawn.dirty[i] = 1;
  }
  return { cleared };
}

export function applySpray(lawn, tiles) {
  let marked = 0;
  for (const t of tiles) {
    if (!isCuttable(lawn, t.x, t.y)) continue;
    const i = indexOf(lawn, t.x, t.y);
    lawn.sprayHours[i] = 24;
    marked += 1;
  }
  return { marked };
}

export function applySeed(lawn, tiles, days) {
  let seeded = 0;
  for (const t of tiles) {
    if (!isCuttable(lawn, t.x, t.y)) continue;
    const i = indexOf(lawn, t.x, t.y);
    if (lawn.health[i] > 0) continue;
    lawn.seedDays[i] = days;
    lawn.dirty[i] = 1;
    seeded += 1;
  }
  return { seeded };
}

export function applyLeaves(lawn, tiles) {
  let cleared = 0;
  for (const t of tiles) {
    if (!isCuttable(lawn, t.x, t.y)) continue;
    const i = indexOf(lawn, t.x, t.y);
    if (lawn.leafCover[i] > 0) {
      lawn.leafCover[i] = 0;
      cleared += 1;
      lawn.dirty[i] = 1;
    }
  }
  return { cleared };
}

export function applyAerate(lawn, tiles, days) {
  let count = 0;
  for (const t of tiles) {
    if (!isCuttable(lawn, t.x, t.y)) continue;
    const i = indexOf(lawn, t.x, t.y);
    lawn.aerateDays[i] = days;
    count += 1;
  }
  return { count };
}

export function tickMoistureHealth(lawn, weather, care, rng, season) {
  ensureExtras(lawn);
  const dry = weather.dry || 0;
  const rain = weather.rain || 0;
  let browned = 0;
  let fungus = 0;
  let dead = 0;
  eachGrass(lawn, (i, x, y) => {
    let lose = dry;
    if (lawn.aerateDays[i] > 0 && lose > 0) lose = Math.max(1, Math.round(lose * 0.7));
    if (lawn.leafCover[i] > 0) lose += 1;
    lawn.moisture[i] = clamp(lawn.moisture[i] - lose + rain, 0, 100);
    if (rain > 0 && lawn.sprayHours[i] > 0) lawn.sprayHours[i] = 0;

    if (lawn.moisture[i] < 20) {
      lawn.health[i] = clamp(lawn.health[i] - care.dryBrownHealth, 0, 100);
      browned += 1;
    } else if (lawn.moisture[i] > 90) {
      lawn.health[i] = clamp(lawn.health[i] - care.fungusHealth, 0, 100);
      fungus += 1;
    } else if (lawn.moisture[i] >= 40 && lawn.moisture[i] <= 70 && lawn.health[i] > 0 && lawn.health[i] < 100) {
      lawn.health[i] = clamp(lawn.health[i] + care.idealHealthGain, 0, 100);
    }

    if (lawn.weed[i] > 0) {
      lawn.health[i] = clamp(lawn.health[i] - lawn.weed[i], 0, 100);
    }

    if (lawn.seedDays[i] > 0 && lawn.moisture[i] >= 40) {
      // counted at day rollover
    }

    if (lawn.health[i] === 0) dead += 1;

    if (
      (lawn.heightArr[i] > care.weedSpreadHeight || lawn.health[i] < care.weedSpreadHealth) &&
      rng.chance(0.08)
    ) {
      lawn.weed[i] = clamp(lawn.weed[i] + 1, 0, 3);
    }

    lawn.dirty[i] = 1;
    void x;
    void y;
    void season;
  });

  eachGrass(lawn, (i, x, y) => {
    if (lawn.weed[i] < 2) return;
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (const [dx, dy] of dirs) {
      if (!inBounds(lawn, x + dx, y + dy)) continue;
      const j = indexOf(lawn, x + dx, y + dy);
      if (lawn.kind[j] !== KIND.grass) continue;
      if (lawn.heightArr[j] > care.weedSpreadHeight || lawn.health[j] < care.weedSpreadHealth) {
        if (rng.chance(0.2)) lawn.weed[j] = clamp(lawn.weed[j] + 1, 0, 3);
      }
    }
  });

  return { browned, fungus, dead };
}

export function tickDailyCare(lawn, care, season) {
  ensureExtras(lawn);
  let revived = 0;
  let leafKill = 0;
  eachGrass(lawn, (i) => {
    lawn.fertilizer[i] = clamp(lawn.fertilizer[i] - 8, 0, 100);
    if (lawn.aerateDays[i] > 0) lawn.aerateDays[i] -= 1;
    if (lawn.seedDays[i] > 0 && lawn.moisture[i] >= 40) {
      lawn.seedDays[i] -= 1;
      if (lawn.seedDays[i] === 0) {
        lawn.health[i] = 55;
        lawn.heightArr[i] = 2.2;
        revived += 1;
      }
    }
    if (season === "fall" && lawn.leafCover[i] < 3) {
      // chance applied by caller via addLeaves
    }
    if (lawn.leafCover[i] >= care.leafKillDays) {
      lawn.health[i] = clamp(lawn.health[i] - 25, 0, 100);
      leafKill += 1;
    }
    lawn.dirty[i] = 1;
  });
  return { revived, leafKill };
}

export function addFallLeaves(lawn, rng) {
  let added = 0;
  eachGrass(lawn, (i) => {
    if (rng.chance(0.18)) {
      lawn.leafCover[i] = clamp(lawn.leafCover[i] + 1, 0, 3);
      added += 1;
      lawn.dirty[i] = 1;
    }
  });
  return added;
}

export function tickSpray(lawn) {
  eachGrass(lawn, (i) => {
    if (lawn.sprayHours[i] > 0) {
      lawn.sprayHours[i] -= 1;
      if (lawn.sprayHours[i] === 0 && lawn.weed[i] > 0) {
        lawn.weed[i] = 0;
        lawn.dirty[i] = 1;
      }
    }
  });
}

export function findCare(careTools, id) {
  return careTools.find((t) => t.id === id) || null;
}
