/** Offscreen lawn atlas. Only dirty cells are redrawn. Never writes game state. */

import { cellFill } from "./colors.js";
import { isEdgeCell } from "../sim/cutting.js";
import { drawCharacter, drawHeldTool } from "./character.js";
import { KIND } from "../sim/lawn.js";

function hash2(x, y) {
  let n = (x * 374761393 + y * 668265263) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n ^ (n >>> 16)) >>> 0;
}

export function createLawnAtlas(lawn, tileSize) {
  const canvas = document.createElement("canvas");
  canvas.width = lawn.width * tileSize;
  canvas.height = lawn.height * tileSize;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx, tileSize, overlay: "none" };
}

export function rebuildAtlas(atlas, lawn) {
  atlas.canvas.width = lawn.width * atlas.tileSize;
  atlas.canvas.height = lawn.height * atlas.tileSize;
  atlas.ctx.imageSmoothingEnabled = false;
  lawn.allDirty = true;
  lawn.dirty.fill(1);
}

export function paintDirty(atlas, lawn, overlay, colorblind = false) {
  if (atlas.overlay !== overlay) {
    atlas.overlay = overlay;
    lawn.allDirty = true;
    lawn.dirty.fill(1);
  }
  const { ctx, tileSize } = atlas;
  const n = lawn.width * lawn.height;
  for (let i = 0; i < n; i++) {
    if (!lawn.allDirty && !lawn.dirty[i]) continue;
    const x = i % lawn.width;
    const y = (i - x) / lawn.width;
    const px = x * tileSize;
    const py = y * tileSize;
    const kind = lawn.kind[i];
    if (overlay !== "none" && kind === KIND.grass) {
      ctx.fillStyle = cellFill(kind, lawn.heightArr[i], lawn.health[i], lawn.moisture[i], overlay, colorblind);
      ctx.fillRect(px, py, tileSize, tileSize);
    } else {
      drawTile(ctx, lawn, x, y, tileSize, i);
    }
    lawn.dirty[i] = 0;
  }
  lawn.allDirty = false;
}

function drawTile(ctx, lawn, x, y, ts, i) {
  const kind = lawn.kind[i];
  if (kind === KIND.grass) drawGrass(ctx, lawn, x, y, ts, i);
  else if (kind === KIND.fence) drawFence(ctx, lawn, x, y, ts);
  else if (kind === KIND.house) drawHouse(ctx, x, y, ts);
  else if (kind === KIND.shed) drawShed(ctx, x, y, ts);
  else if (kind === KIND.path) drawPath(ctx, x, y, ts);
  else {
    ctx.fillStyle = "#333";
    ctx.fillRect(x * ts, y * ts, ts, ts);
  }
}

function drawGrass(ctx, lawn, x, y, ts, i) {
  const h = lawn.heightArr[i];
  const health = lawn.health[i];
  const px = x * ts;
  const py = y * ts;
  const soil = health <= 0 ? "#6d4c41" : h < 1.8 ? "#d7c08a" : h < 2.8 ? "#b8a45a" : h <= 3.5 ? "#6d8b3c" : "#2f4f1c";
  ctx.fillStyle = soil;
  ctx.fillRect(px, py, ts, ts);
  ctx.fillStyle = h <= 3.5 ? "#c9b36a" : "#3d5a22";
  ctx.fillRect(px + ((x * 3 + y) % ts), py + ts - 2, 2, 2);

  const seed = hash2(x, y);
  let bladeH;
  let count;
  let colorA;
  let colorB;
  if (h < 1.5) {
    bladeH = 2;
    count = 3;
    colorA = "#dce775";
    colorB = "#c5d67a";
  } else if (h < 2.5) {
    bladeH = 4;
    count = 5;
    colorA = "#c6e05a";
    colorB = "#9ccc65";
  } else if (h <= 3.5) {
    bladeH = 6;
    count = 7;
    colorA = "#8bc34a";
    colorB = "#7cb342";
  } else if (h <= 4.5) {
    bladeH = 9;
    count = 10;
    colorA = "#43a047";
    colorB = "#2e7d32";
  } else if (h <= 6) {
    bladeH = 12;
    count = 13;
    colorA = "#2e7d32";
    colorB = "#145214";
  } else {
    bladeH = 14;
    count = 15;
    colorA = "#1b5e20";
    colorB = "#0d3b12";
  }
  if (health < 40 && health > 0) {
    colorA = "#bca16a";
    colorB = "#8d6e43";
  } else if (health === 0) {
    colorA = "#8d6e63";
    colorB = "#5d4037";
    bladeH = 2;
    count = 3;
  }

  for (let s = 0; s < count; s++) {
    const bx = (seed + s * 37) % (ts - 1);
    const wobble = h > 6 ? ((seed >> (s % 5)) & 1) : 0;
    const hh = Math.max(1, bladeH - (s % 3) - (h > 6 && s % 4 === 0 ? 3 : 0));
    ctx.fillStyle = s % 2 === 0 ? colorA : colorB;
    ctx.fillRect(px + bx + wobble, py + ts - hh, 1, hh);
  }

  if (isEdgeCell(lawn, x, y)) {
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.fillRect(px, py, ts, 1);
  }
  if (lawn.weed && lawn.weed[i] > 0) {
    const n = lawn.weed[i];
    ctx.fillStyle = "#2e7d32";
    ctx.fillRect(px + 7, py + 8, 2, 6);
    ctx.fillStyle = "#fdd835";
    ctx.fillRect(px + 5, py + 4, 6, 5);
    ctx.fillStyle = "#fff59d";
    ctx.fillRect(px + 7, py + 5, 2, 2);
    if (n >= 2) {
      ctx.fillStyle = "#f9a825";
      ctx.fillRect(px + 2, py + 7, 4, 4);
    }
    if (n >= 3) {
      ctx.fillStyle = "#ffeb3b";
      ctx.fillRect(px + 10, py + 8, 4, 4);
    }
  }
  if (lawn.leafCover && lawn.leafCover[i] > 0) {
    ctx.fillStyle = "#8d6e63";
    ctx.fillRect(px + 2, py + 3, 4, 3);
    ctx.fillRect(px + 8, py + 8, 5, 3);
  }
}

function drawFence(ctx, lawn, x, y, ts) {
  const px = x * ts;
  const py = y * ts;
  ctx.fillStyle = "#5a3d22";
  ctx.fillRect(px, py, ts, ts);
  ctx.fillStyle = "#8d6e4a";
  const post = 4;
  ctx.fillRect(px + 6, py + 1, post, ts - 2);
  ctx.fillStyle = "#a1887f";
  ctx.fillRect(px + 1, py + 4, ts - 2, 2);
  ctx.fillRect(px + 1, py + 10, ts - 2, 2);
  ctx.fillStyle = "#3e2723";
  ctx.fillRect(px + 7, py + 1, 2, 3);
  void lawn;
}

function drawHouse(ctx, x, y, ts) {
  const px = x * ts;
  const py = y * ts;
  const relY = y - 1;
  if (relY <= 0) {
    ctx.fillStyle = "#7a2e22";
    ctx.fillRect(px, py, ts, ts);
    ctx.fillStyle = "#a94432";
    for (let i = 0; i < ts; i += 4) ctx.fillRect(px + i, py + 3, 3, 4);
    ctx.fillStyle = "#4e1c16";
    ctx.fillRect(px, py, ts, 3);
    if (x === 9) {
      ctx.fillStyle = "#5d4037";
      ctx.fillRect(px + 10, py + 2, 5, 8);
    }
    return;
  }
  if (relY === 1) {
    ctx.fillStyle = "#b04a38";
    ctx.fillRect(px, py, ts, ts);
    ctx.fillStyle = "#8d3a2a";
    for (let i = 0; i < ts; i += 4) ctx.fillRect(px + i + 1, py + 2, 3, 3);
    ctx.fillStyle = "#6d4c41";
    ctx.fillRect(px, py + ts - 3, ts, 3);
    return;
  }
  ctx.fillStyle = "#e0d0c0";
  ctx.fillRect(px, py, ts, ts);
  ctx.fillStyle = "#cbb8a6";
  for (let by = 1; by < ts; by += 4) {
    const odd = (by >> 2) & 1;
    for (let bx = odd ? 2 : 0; bx < ts; bx += 4) {
      ctx.fillRect(px + bx, py + by, 3, 3);
    }
  }
  const door = x >= 14 && x <= 16;
  if (door) {
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(px + 3, py + 3, ts - 6, ts - 3);
    ctx.fillStyle = "#3e2723";
    ctx.fillRect(px + 4, py + 4, ts - 8, ts - 5);
    ctx.fillStyle = "#f9a825";
    ctx.fillRect(px + ts - 6, py + 9, 2, 2);
  } else if ((x + y) % 3 === 0) {
    ctx.fillStyle = "#4fc3f7";
    ctx.fillRect(px + 4, py + 3, 8, 7);
    ctx.fillStyle = "#01579b";
    ctx.fillRect(px + 7, py + 3, 2, 7);
    ctx.fillRect(px + 4, py + 6, 8, 1);
    ctx.fillStyle = "#fffde7";
    ctx.fillRect(px + 5, py + 4, 1, 1);
  }
}

function drawShed(ctx, x, y, ts) {
  const px = x * ts;
  const py = y * ts;
  const relY = y - 1;
  if (relY <= 0) {
    ctx.fillStyle = "#6d4c41";
    ctx.fillRect(px, py, ts, ts);
    ctx.fillStyle = "#90a4ae";
    for (let i = 0; i < ts; i += 3) ctx.fillRect(px + i, py + 2, 2, 5);
    ctx.fillStyle = "#37474f";
    ctx.fillRect(px, py, ts, 2);
    return;
  }
  ctx.fillStyle = "#8d6e63";
  ctx.fillRect(px, py, ts, ts);
  ctx.fillStyle = "#6d4c41";
  for (let i = 1; i < ts; i += 3) ctx.fillRect(px + i, py, 1, ts);
  if (relY === 2 && x >= 23 && x <= 24) {
    ctx.fillStyle = "#4e342e";
    ctx.fillRect(px + 3, py + 2, ts - 6, ts - 2);
    ctx.fillStyle = "#f9a825";
    ctx.fillRect(px + 5, py + 8, 2, 2);
  } else if (relY === 1 && x === 24) {
    ctx.fillStyle = "#81d4fa";
    ctx.fillRect(px + 5, py + 4, 6, 5);
    ctx.fillStyle = "#01579b";
    ctx.fillRect(px + 7, py + 4, 1, 5);
  }
}

function drawPath(ctx, x, y, ts) {
  const px = x * ts;
  const py = y * ts;
  ctx.fillStyle = "#8d7b6a";
  ctx.fillRect(px, py, ts, ts);
  ctx.fillStyle = "#bcaaa4";
  const odd = (x + y) & 1;
  ctx.fillRect(px + (odd ? 1 : 2), py + 1, 6, 6);
  ctx.fillRect(px + 8, py + 8, 6, 6);
  ctx.fillStyle = "#6d4c41";
  ctx.fillRect(px + 7, py, 1, ts);
  ctx.fillRect(px, py + 7, ts, 1);
}

export function drawAtlas(ctx, atlas, camera) {
  ctx.drawImage(
    atlas.canvas,
    camera.x,
    camera.y,
    camera.w,
    camera.h,
    0,
    0,
    camera.w,
    camera.h
  );
}

export function drawPlayer(ctx, player, camera, tileSize, character, toolId) {
  const sx = Math.round(player.x - camera.x);
  const sy = Math.round(player.y - camera.y);
  if (character) {
    drawCharacter(ctx, character, sx, sy, player.facing, toolId, player.cutProgress > 0);
    return;
  }
  const r = 6;
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(sx - r + 1, sy + r - 1, r * 2 - 2, 2);
  ctx.fillStyle = "#1565c0";
  ctx.fillRect(sx - r, sy - r + 2, r * 2, r * 2 - 2);
  ctx.fillStyle = "#f3c19d";
  ctx.fillRect(sx - 4, sy - r, 8, 6);
  ctx.fillStyle = "#3e2723";
  ctx.fillRect(sx - 4, sy - r - 2, 8, 3);
  ctx.fillStyle = "#212121";
  if (player.facing === "up") ctx.fillRect(sx - 2, sy - r + 1, 4, 2);
  else if (player.facing === "left") ctx.fillRect(sx - 4, sy - r + 2, 2, 2);
  else if (player.facing === "right") ctx.fillRect(sx + 2, sy - r + 2, 2, 2);
  else ctx.fillRect(sx - 2, sy - r + 3, 4, 2);
  drawHeldTool(ctx, sx, sy, player.facing, toolId, player.cutProgress > 0);
}

export function drawCutProgress(ctx, player, camera, tileSize) {
  if (!player.cutTarget || player.cutProgress <= 0) return;
  const { x, y } = player.cutTarget;
  const px = x * tileSize - camera.x;
  const py = y * tileSize - camera.y;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(px + 1, py + 1, tileSize - 2, 4);
  ctx.fillStyle = "#fff59d";
  ctx.fillRect(px + 2, py + 2, (tileSize - 4) * Math.min(1, player.cutProgress), 2);
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fillRect(px + 1, py + 1, tileSize - 2, 1);
}
