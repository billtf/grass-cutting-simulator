/** Camera follows the player and stays inside the lawn. Units are 1x game pixels. */

export function createCamera() {
  return { x: 0, y: 0, w: 160, h: 120 };
}

export function resizeCamera(camera, canvas, scale) {
  camera.w = Math.max(1, Math.floor(canvas.clientWidth / scale));
  camera.h = Math.max(1, Math.floor(canvas.clientHeight / scale));
}

export function follow(camera, player, lawn, tileSize) {
  const worldW = lawn.width * tileSize;
  const worldH = lawn.height * tileSize;
  let x = Math.round(player.x - camera.w / 2);
  let y = Math.round(player.y - camera.h / 2);
  x = Math.max(0, Math.min(x, Math.max(0, worldW - camera.w)));
  y = Math.max(0, Math.min(y, Math.max(0, worldH - camera.h)));
  camera.x = x;
  camera.y = y;
}
