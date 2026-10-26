/** Player movement and facing. Needs (energy/hydration/mood) are stored, drained later. */

import { isWalkable } from "../sim/lawn.js";

export function createPlayer(tileSize, startTileX, startTileY) {
  return {
    x: startTileX * tileSize + tileSize / 2,
    y: startTileY * tileSize + tileSize / 2,
    vx: 0,
    vy: 0,
    facing: "down",
    cutProgress: 0,
    cutTarget: null,
  };
}

export function tileAt(player, tileSize) {
  return {
    x: Math.floor(player.x / tileSize),
    y: Math.floor(player.y / tileSize),
  };
}

export function facingTile(player, tileSize) {
  const t = tileAt(player, tileSize);
  switch (player.facing) {
    case "up":
      return { x: t.x, y: t.y - 1 };
    case "down":
      return { x: t.x, y: t.y + 1 };
    case "left":
      return { x: t.x - 1, y: t.y };
    case "right":
      return { x: t.x + 1, y: t.y };
    default:
      return t;
  }
}

function tryMove(player, lawn, tileSize, radius, dx, dy) {
  const nx = player.x + dx;
  const ny = player.y + dy;
  const points = [
    [nx - radius, ny - radius],
    [nx + radius, ny - radius],
    [nx - radius, ny + radius],
    [nx + radius, ny + radius],
  ];
  for (const [px, py] of points) {
    const tx = Math.floor(px / tileSize);
    const ty = Math.floor(py / tileSize);
    if (!isWalkable(lawn, tx, ty)) return false;
  }
  player.x = nx;
  player.y = ny;
  return true;
}

export function movePlayer(player, lawn, tileSize, speed, radius, move, dt) {
  player.vx = move.x * speed;
  player.vy = move.y * speed;
  if (move.x === 0 && move.y === 0) return false;

  if (Math.abs(move.x) > Math.abs(move.y)) {
    player.facing = move.x < 0 ? "left" : "right";
  } else if (move.y !== 0) {
    player.facing = move.y < 0 ? "up" : "down";
  }

  const dx = player.vx * dt;
  const dy = player.vy * dt;
  if (!tryMove(player, lawn, tileSize, radius, dx, dy)) {
    tryMove(player, lawn, tileSize, radius, dx, 0);
    tryMove(player, lawn, tileSize, radius, 0, dy);
  }
  return true;
}
