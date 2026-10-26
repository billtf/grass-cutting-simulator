/** Placeholder layered sprite: colored blocks per look field. */

const SKIN = ["#f6d7b0", "#e0ac69", "#c68642", "#8d5524", "#5c3310", "#ffdbac"];
const HAIR = ["#1b1b1b", "#3e2723", "#6d4c41", "#d7ccc8", "#f9a825", "#6a1b9a", "#1565c0", "#c62828"];
const OUTFIT = ["#1565c0", "#2e7d32", "#f9a825", "#6a1b9a", "#c62828", "#00838f", "#ef6c00", "#37474f"];

export function drawCharacter(ctx, character, sx, sy, facing) {
  const look = character.look || {};
  const skin = SKIN[look.skin % SKIN.length];
  const hair = HAIR[look.hairColor % HAIR.length];
  const fit = OUTFIT[look.outfit % OUTFIT.length];
  ctx.fillStyle = fit;
  ctx.fillRect(sx - 6, sy - 3, 12, 10);
  ctx.fillStyle = skin;
  ctx.fillRect(sx - 5, sy - 8, 10, 7);
  ctx.fillStyle = hair;
  ctx.fillRect(sx - 5, sy - 10, 10, 4);
  if (look.hat) {
    ctx.fillStyle = "#33691e";
    ctx.fillRect(sx - 6, sy - 12, 12, 3);
  }
  ctx.fillStyle = "#fff";
  if (facing === "up") ctx.fillRect(sx - 2, sy - 8, 4, 2);
  else if (facing === "left") ctx.fillRect(sx - 5, sy - 6, 2, 2);
  else if (facing === "right") ctx.fillRect(sx + 3, sy - 6, 2, 2);
  else ctx.fillRect(sx - 2, sy - 5, 4, 2);
}
