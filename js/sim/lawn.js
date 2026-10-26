/** Lawn grid and growth. No canvas, no DOM. */

export const KIND = {
  grass: 0,
  fence: 1,
  house: 2,
  shed: 3,
  path: 4,
};

export const SEASON_MULT = {
  spring: 1.4,
  summer: 0.9,
  fall: 1.0,
  winter: 0.1,
};

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function indexOf(lawn, x, y) {
  return y * lawn.width + x;
}

export function inBounds(lawn, x, y) {
  return x >= 0 && y >= 0 && x < lawn.width && y < lawn.height;
}

export function createLawn(width, height, rng, config, layout = "front") {
  const n = width * height;
  const lawn = {
    width,
    height,
    layout,
    heightArr: new Float32Array(n),
    moisture: new Uint8Array(n),
    health: new Uint8Array(n),
    weed: new Uint8Array(n),
    fertilizer: new Uint8Array(n),
    lastCut: new Uint16Array(n),
    kind: new Uint8Array(n),
    dirty: new Uint8Array(n),
    allDirty: true,
  };
  applyLayout(lawn);
  seedGrass(lawn, rng, config);
  lawn.seedDays = new Uint8Array(n);
  lawn.leafCover = new Uint8Array(n);
  lawn.aerateDays = new Uint8Array(n);
  lawn.sprayHours = new Uint8Array(n);
  return lawn;
}

export function applyLayout(lawn) {
  const { width, height, kind } = lawn;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = indexOf(lawn, x, y);
      const border = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      if (border) {
        kind[i] = KIND.fence;
      } else if (y >= 1 && y <= 3 && x >= 8 && x <= 20) {
        kind[i] = KIND.house;
      } else if (y >= 1 && y <= 3 && x >= 22 && x <= 25) {
        kind[i] = KIND.shed;
      } else if (y === 4 && x >= 14 && x <= 17) {
        kind[i] = KIND.path;
      } else {
        kind[i] = KIND.grass;
      }
    }
  }
}

export function seedGrass(lawn, rng, config) {
  const { minHeight, maxHeight, startHeightMin, startHeightMax, startMoisture, startHealth } =
    config.lawn;
  const n = lawn.width * lawn.height;
  for (let i = 0; i < n; i++) {
    if (lawn.kind[i] === KIND.grass) {
      lawn.heightArr[i] = clamp(rng.range(startHeightMin, startHeightMax), minHeight, maxHeight);
      lawn.moisture[i] = startMoisture;
      lawn.health[i] = startHealth;
    } else {
      lawn.heightArr[i] = 0;
      lawn.moisture[i] = 0;
      lawn.health[i] = 0;
    }
    lawn.weed[i] = 0;
    lawn.fertilizer[i] = 0;
    lawn.lastCut[i] = 0;
    lawn.dirty[i] = 1;
  }
  lawn.allDirty = true;
}

export function isWalkable(lawn, x, y) {
  if (!inBounds(lawn, x, y)) return false;
  const k = lawn.kind[indexOf(lawn, x, y)];
  return k === KIND.grass || k === KIND.path;
}

export function isCuttable(lawn, x, y) {
  if (!inBounds(lawn, x, y)) return false;
  return lawn.kind[indexOf(lawn, x, y)] === KIND.grass;
}

export function isShed(lawn, x, y) {
  if (!inBounds(lawn, x, y)) return false;
  return lawn.kind[indexOf(lawn, x, y)] === KIND.shed;
}

export function waterMult(moisture) {
  if (moisture < 20) return 0.2;
  if (moisture > 90) return 0.8;
  if (moisture >= 40 && moisture <= 70) return 1.0;
  if (moisture < 40) return 0.2 + ((moisture - 20) / 20) * 0.8;
  return 0.8 + ((90 - moisture) / 20) * 0.2;
}

export function growthForCell(cell, opts) {
  const {
    baseRate,
    seasonMult = 1,
    sunMult = 1,
    growthSpeed = 1,
  } = opts;
  const wMult = opts.waterMultStub != null ? opts.waterMultStub : waterMult(cell.moisture);
  const fert = 1 + 0.5 * (cell.fertilizer / 100);
  return (
    baseRate *
    seasonMult *
    wMult *
    sunMult *
    fert *
    (cell.health / 100) *
    growthSpeed
  );
}

/**
 * Apply one in-game hour of growth. Phase 0 stubs season and water at 1.0
 * unless callers pass real multipliers.
 */
export function tickGrowth(lawn, config, extras = {}) {
  const baseRate = config.growth.baseRate;
  const minH = config.lawn.minHeight;
  const maxH = config.lawn.maxHeight;
  const overgrown = config.lawn.overgrownHeight;
  const seasonMult = extras.seasonMult ?? 1;
  const waterMultStub = extras.waterMultStub;
  const growthSpeed = extras.growthSpeed ?? 1;
  const sunMult = extras.sunMult ?? 1;
  let overgrownCount = 0;
  const n = lawn.width * lawn.height;

  for (let i = 0; i < n; i++) {
    if (lawn.kind[i] !== KIND.grass) continue;
    const cell = {
      moisture: lawn.moisture[i],
      fertilizer: lawn.fertilizer[i],
      health: lawn.health[i],
    };
    const g = growthForCell(cell, {
      baseRate,
      seasonMult,
      sunMult,
      growthSpeed,
      ...(waterMultStub != null ? { waterMultStub } : {}),
    });
    const before = lawn.heightArr[i];
    const after = clamp(before + g, minH, maxH);
    if (after !== before) {
      lawn.heightArr[i] = after;
      lawn.dirty[i] = 1;
    }
    if (after > overgrown) overgrownCount += 1;
  }
  return { overgrownCount };
}

export function cutCell(lawn, x, y, targetHeight, quality, nowHour, rules) {
  if (!isCuttable(lawn, x, y)) return null;
  const i = indexOf(lawn, x, y);
  const oldHeight = lawn.heightArr[i];
  const minH = rules.minHeight;
  const next = clamp(targetHeight, minH, oldHeight);
  if (oldHeight - next < 0.05) return null;

  const removed = oldHeight - next;
  const oneThird = removed > oldHeight / 3 + 1e-6;
  const scalped = next < rules.scalpHeight;
  let healthLoss = 0;
  if (oneThird && !rules.oneThirdWarningOnly) {
    healthLoss += rules.oneThirdPenalty;
  }
  if (quality < 0.5) {
    healthLoss += 5;
  }
  lawn.heightArr[i] = next;
  lawn.health[i] = clamp(lawn.health[i] - healthLoss, 0, 100);
  lawn.lastCut[i] = Math.max(0, Math.floor(nowHour));
  lawn.dirty[i] = 1;
  return {
    x,
    y,
    oldHeight,
    newHeight: next,
    oneThird,
    scalped,
    quality,
    torn: quality < 0.5,
  };
}

export function markAllDirty(lawn) {
  lawn.allDirty = true;
  lawn.dirty.fill(1);
}

export function clearDirty(lawn) {
  lawn.allDirty = false;
  lawn.dirty.fill(0);
}

export function averageHeight(lawn) {
  let sum = 0;
  let count = 0;
  const n = lawn.width * lawn.height;
  for (let i = 0; i < n; i++) {
    if (lawn.kind[i] !== KIND.grass) continue;
    sum += lawn.heightArr[i];
    count += 1;
  }
  return count ? sum / count : 0;
}

export function countOvergrown(lawn, overgrownHeight) {
  let n = 0;
  const total = lawn.width * lawn.height;
  for (let i = 0; i < total; i++) {
    if (lawn.kind[i] === KIND.grass && lawn.heightArr[i] > overgrownHeight) n += 1;
  }
  return n;
}

export function grassCellCount(lawn) {
  let n = 0;
  const total = lawn.width * lawn.height;
  for (let i = 0; i < total; i++) {
    if (lawn.kind[i] === KIND.grass) n += 1;
  }
  return n;
}
