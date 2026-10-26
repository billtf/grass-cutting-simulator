import { KIND, applyLayout, markAllDirty } from "./lawn.js";

export function nextUpgrade(ownedIds, upgrades) {
  const have = new Set(ownedIds || ["front"]);
  return upgrades.find((u) => !have.has(u.id) && u.id !== "front") || null;
}

export function resizeLawn(lawn, width, height) {
  const oldW = lawn.width;
  const oldH = lawn.height;
  const copy = (src, Ctor) => {
    const next = new Ctor(width * height);
    for (let y = 0; y < Math.min(oldH, height); y++) {
      for (let x = 0; x < Math.min(oldW, width); x++) {
        next[y * width + x] = src[y * oldW + x];
      }
    }
    return next;
  };
  lawn.heightArr = copy(lawn.heightArr, Float32Array);
  lawn.moisture = copy(lawn.moisture, Uint8Array);
  lawn.health = copy(lawn.health, Uint8Array);
  lawn.weed = copy(lawn.weed, Uint8Array);
  lawn.fertilizer = copy(lawn.fertilizer, Uint8Array);
  lawn.lastCut = copy(lawn.lastCut, Uint16Array);
  lawn.kind = new Uint8Array(width * height);
  lawn.dirty = new Uint8Array(width * height);
  lawn.seedDays = copy(lawn.seedDays || new Uint8Array(oldW * oldH), Uint8Array);
  lawn.leafCover = copy(lawn.leafCover || new Uint8Array(oldW * oldH), Uint8Array);
  lawn.aerateDays = copy(lawn.aerateDays || new Uint8Array(oldW * oldH), Uint8Array);
  lawn.sprayHours = copy(lawn.sprayHours || new Uint8Array(oldW * oldH), Uint8Array);
  lawn.width = width;
  lawn.height = height;
  applyLayout(lawn);
  for (let i = 0; i < width * height; i++) {
    if (lawn.kind[i] === KIND.grass && lawn.heightArr[i] === 0 && lawn.health[i] === 0) {
      lawn.heightArr[i] = 4;
      lawn.health[i] = 60;
      lawn.moisture[i] = 50;
    }
    lawn.dirty[i] = 1;
  }
  lawn.allDirty = true;
  markAllDirty(lawn);
  return lawn;
}

export function buyUpgrade(state, upgrade, character) {
  if ((character.level || 1) < upgrade.unlockLevel) return { ok: false, reason: `Unlocks at level ${upgrade.unlockLevel}.` };
  if (state.economy.coins < upgrade.cost) return { ok: false, reason: "Need more coins." };
  if ((state.game.zonesOwned || []).includes(upgrade.id)) return { ok: false, reason: "Already owned." };
  state.economy.coins -= upgrade.cost;
  state.game.zonesOwned = [...(state.game.zonesOwned || ["front"]), upgrade.id];
  resizeLawn(state.lawn, upgrade.width, upgrade.height);
  return { ok: true };
}
