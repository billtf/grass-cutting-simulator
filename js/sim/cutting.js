/** Swath tiles, edge rules, and per-cell upkeep. Sim only. */

import { cutCell, inBounds, isCuttable, KIND, indexOf } from "./lawn.js";

export function isEdgeCell(lawn, x, y) {
  if (!isCuttable(lawn, x, y)) return false;
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (const [dx, dy] of dirs) {
    const nx = x + dx;
    const ny = y + dy;
    if (!inBounds(lawn, nx, ny)) return true;
    const k = lawn.kind[indexOf(lawn, nx, ny)];
    if (k === KIND.fence || k === KIND.house || k === KIND.shed) return true;
  }
  return false;
}

export function facingDelta(facing) {
  if (facing === "up") return { x: 0, y: -1 };
  if (facing === "down") return { x: 0, y: 1 };
  if (facing === "left") return { x: -1, y: 0 };
  return { x: 1, y: 0 };
}

export function swathTiles(origin, facing, width) {
  const d = facingDelta(facing);
  const px = -d.y;
  const py = d.x;
  const tiles = [];
  const mid = Math.floor((width - 1) / 2);
  for (let i = 0; i < width; i++) {
    const offset = i - mid;
    tiles.push({
      x: origin.x + d.x + px * offset,
      y: origin.y + d.y + py * offset,
    });
  }
  return tiles;
}

/** Standing cell plus the facing swath. Click/tap cuts underfoot, not only the tile ahead. */
export function cutAttemptTiles(origin, facing, width) {
  const seen = new Set();
  const tiles = [];
  const add = (t) => {
    const key = `${t.x},${t.y}`;
    if (seen.has(key)) return;
    seen.add(key);
    tiles.push(t);
  };
  add({ x: origin.x, y: origin.y });
  for (const t of swathTiles(origin, facing, width)) add(t);
  return tiles;
}

export function toolCanCutCell(lawn, tool, x, y) {
  if (!isCuttable(lawn, x, y)) return false;
  const edge = isEdgeCell(lawn, x, y);
  if (tool.edgesOnly && !edge) return false;
  if (tool.skipsEdges && edge) return false;
  return true;
}

export function cutQuality(tool, owned, extraMult = 1) {
  const base = tool.baseQuality ?? 0.7;
  const sharp = Math.max(0, Math.min(100, owned.sharpness ?? 100)) / 100;
  let q = base * (0.4 + 0.6 * sharp);
  if (tool.upkeep?.oilEveryMows && (owned.mowsSinceOil || 0) >= tool.upkeep.oilEveryMows) {
    q *= 0.85;
  }
  return Math.max(0, Math.min(1, q * extraMult));
}

export function applyUpkeep(owned, tool, cells) {
  const n = cells;
  const loss = tool.upkeep?.sharpnessLossPerCell ?? 0.01;
  owned.sharpness = Math.max(0, (owned.sharpness ?? 100) - loss * n);
  if (tool.needsFuel) {
    const burn = tool.upkeep?.fuelPerCell ?? 0.8;
    owned.fuel = Math.max(0, (owned.fuel ?? 0) - burn * n);
  }
  if (tool.kind === "trimmer") {
    const line = tool.upkeep?.linePerCell ?? 0.04;
    owned.line = Math.max(0, (owned.line ?? 100) - line * n);
  }
}

export function toolBlockedReason(tool, owned, lawn, tiles) {
  if (tool.needsFuel && (owned.fuel ?? 0) <= 0) return "Empty tank. Refuel at the shed.";
  if (tool.kind === "trimmer" && (owned.line ?? 0) <= 0) return "Out of line. Buy a refill at the shed.";
  if (tool.maxGrassHeight != null) {
    for (const t of tiles) {
      if (!isCuttable(lawn, t.x, t.y)) continue;
      const h = lawn.heightArr[indexOf(lawn, t.x, t.y)];
      if (h > tool.maxGrassHeight) {
        return "Reel mower jammed. Grass over 5 inches is too tall.";
      }
    }
  }
  return null;
}

export function performSwath(lawn, tiles, tool, owned, targetHeight, nowHour, rules, extraMult = 1) {
  const quality = cutQuality(tool, owned, extraMult);
  const results = [];
  for (const t of tiles) {
    if (!toolCanCutCell(lawn, tool, t.x, t.y)) continue;
    const result = cutCell(lawn, t.x, t.y, targetHeight, quality, nowHour, rules);
    if (result) results.push(result);
  }
  if (results.length) {
    applyUpkeep(owned, tool, results.length);
    if (tool.upkeep?.oilEveryMows) owned.mowsSinceOil = (owned.mowsSinceOil || 0) + 1;
  }
  return { results, quality };
}
