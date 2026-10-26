/** Offscreen lawn atlas. Only dirty cells are redrawn. Never writes game state. */

import { cellFill } from "./colors.js";
import { isEdgeCell } from "../sim/cutting.js";
import { drawCharacter } from "./character.js";

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
    const color = cellFill(
      lawn.kind[i],
      lawn.heightArr[i],
      lawn.health[i],
      lawn.moisture[i],
      overlay,
      colorblind
    );
    ctx.fillStyle = color;
    ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
    if (lawn.kind[i] === 0) {
      const h = lawn.heightArr[i];
      if (h > 4.5) {
        ctx.fillStyle = "rgba(0,0,0,0.12)";
        for (let s = 2; s < tileSize; s += 4) {
          ctx.fillRect(x * tileSize + s, y * tileSize + 2, 1, tileSize - 4);
        }
      }
      if (isEdgeCell(lawn, x, y)) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, 2);
      }
      if (lawn.health[i] === 0) {
        ctx.fillStyle = "#6d4c41";
        ctx.fillRect(x * tileSize + 3, y * tileSize + 3, 4, 4);
      }
      if (lawn.weed && lawn.weed[i] > 0) {
        ctx.fillStyle = "#fdd835";
        ctx.fillRect(x * tileSize + 2, y * tileSize + 8, 3, 3);
      }
      if (lawn.leafCover && lawn.leafCover[i] > 0) {
        ctx.fillStyle = "rgba(141, 110, 99, 0.45)";
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      }
    }
    if (lawn.kind[i] === 2) {
      ctx.fillStyle = "#8d6e63";
      ctx.fillRect(x * tileSize + 2, y * tileSize + 2, tileSize - 4, tileSize - 4);
    }
    if (lawn.kind[i] === 3) {
      ctx.fillStyle = "#5d4037";
      ctx.fillRect(x * tileSize + 3, y * tileSize + 3, tileSize - 6, tileSize - 6);
    }
    lawn.dirty[i] = 0;
  }
  lawn.allDirty = false;
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

export function drawPlayer(ctx, player, camera, tileSize, character) {
  const sx = Math.round(player.x - camera.x);
  const sy = Math.round(player.y - camera.y);
  if (character) {
    drawCharacter(ctx, character, sx, sy, player.facing);
    return;
  }
  const r = 6;
  ctx.fillStyle = "#1565c0";
  ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
  ctx.fillStyle = "#bbdefb";
  if (player.facing === "up") ctx.fillRect(sx - 3, sy - r, 6, 3);
  if (player.facing === "down") ctx.fillRect(sx - 3, sy + r - 3, 6, 3);
  if (player.facing === "left") ctx.fillRect(sx - r, sy - 3, 3, 6);
  if (player.facing === "right") ctx.fillRect(sx + r - 3, sy - 3, 3, 6);
}

export function drawCutProgress(ctx, player, camera, tileSize) {
  if (!player.cutTarget || player.cutProgress <= 0) return;
  const { x, y } = player.cutTarget;
  const px = x * tileSize - camera.x;
  const py = y * tileSize - camera.y;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(px + 2, py + 2, tileSize - 4, 3);
  ctx.fillStyle = "#fff59d";
  ctx.fillRect(px + 2, py + 2, (tileSize - 4) * Math.min(1, player.cutProgress), 3);
}
