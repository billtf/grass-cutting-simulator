/** Pixel kid + held tool. Look fields pick palettes; no external sprites. */

const SKIN = ["#f6d7b0", "#e0ac69", "#c68642", "#8d5524", "#5c3310", "#ffdbac"];
const HAIR = ["#1b1b1b", "#3e2723", "#6d4c41", "#d7ccc8", "#f9a825", "#6a1b9a", "#1565c0", "#c62828"];
const OUTFIT = ["#1565c0", "#2e7d32", "#f9a825", "#6a1b9a", "#c62828", "#00838f", "#ef6c00", "#37474f"];

export function drawCharacter(ctx, character, sx, sy, facing, toolId, cutting) {
  const look = character.look || {};
  const skin = SKIN[look.skin % SKIN.length];
  const hair = HAIR[look.hairColor % HAIR.length];
  const fit = OUTFIT[look.outfit % OUTFIT.length];
  const ox = Math.round(sx) - 6;
  const oy = Math.round(sy) - 10;

  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(ox + 2, oy + 18, 9, 2);

  ctx.fillStyle = "#37474f";
  ctx.fillRect(ox + 3, oy + 13, 3, 5);
  ctx.fillRect(ox + 7, oy + 13, 3, 5);
  ctx.fillStyle = look.shoes ? "#212121" : "#5d4037";
  ctx.fillRect(ox + 2, oy + 17, 4, 2);
  ctx.fillRect(ox + 7, oy + 17, 4, 2);

  ctx.fillStyle = fit;
  ctx.fillRect(ox + 2, oy + 8, 9, 6);
  ctx.fillStyle = "#fffde7";
  ctx.fillRect(ox + 4, oy + 9, 2, 2);

  ctx.fillStyle = skin;
  ctx.fillRect(ox + 3, oy + 3, 7, 6);
  ctx.fillStyle = hair;
  ctx.fillRect(ox + 2, oy + 1, 9, 4);
  if (look.hair === 2) ctx.fillRect(ox + 1, oy + 4, 2, 4);
  if (look.hat) {
    ctx.fillStyle = "#33691e";
    ctx.fillRect(ox + 1, oy + 0, 11, 3);
    ctx.fillStyle = "#1b5e20";
    ctx.fillRect(ox + 0, oy + 2, 13, 2);
  }

  ctx.fillStyle = "#1b1b1b";
  if (facing === "up") {
    ctx.fillRect(ox + 4, oy + 4, 2, 1);
    ctx.fillRect(ox + 7, oy + 4, 2, 1);
  } else if (facing === "left") {
    ctx.fillRect(ox + 3, oy + 5, 2, 2);
    ctx.fillStyle = "#fff";
    ctx.fillRect(ox + 3, oy + 5, 1, 1);
  } else if (facing === "right") {
    ctx.fillRect(ox + 8, oy + 5, 2, 2);
    ctx.fillStyle = "#fff";
    ctx.fillRect(ox + 9, oy + 5, 1, 1);
  } else {
    ctx.fillRect(ox + 4, oy + 6, 2, 2);
    ctx.fillRect(ox + 7, oy + 6, 2, 2);
    ctx.fillStyle = "#fff";
    ctx.fillRect(ox + 4, oy + 6, 1, 1);
    ctx.fillRect(ox + 7, oy + 6, 1, 1);
  }

  drawHeldTool(ctx, sx, sy, facing, toolId, cutting);
}

export function drawHeldTool(ctx, sx, sy, facing, toolId, cutting) {
  const ox = Math.round(sx);
  const oy = Math.round(sy);
  const bob = cutting ? 1 : 0;
  const id = toolId || "scissors";
  if (id === "scissors" || id === "kitchen_knife") {
    const hx = facing === "left" ? ox - 8 : facing === "right" ? ox + 6 : ox + 5;
    const hy = oy - 1 - bob;
    ctx.fillStyle = "#9e9e9e";
    ctx.fillRect(hx, hy, 5, 2);
    ctx.fillStyle = "#f9a825";
    ctx.fillRect(hx + 1, hy + 2, 2, 2);
    if (id === "kitchen_knife") {
      ctx.fillStyle = "#cfd8dc";
      ctx.fillRect(hx + 4, hy - 1, 5, 2);
    } else {
      ctx.fillStyle = "#b0bec5";
      ctx.fillRect(hx + 3, hy - 2, 4, 2);
      ctx.fillRect(hx + 3, hy + 1, 4, 2);
    }
    return;
  }
  if (id === "watering_can") {
    ctx.fillStyle = "#1976d2";
    ctx.fillRect(ox + 5, oy + 1, 5, 4);
    ctx.fillRect(ox + 9, oy + 0, 3, 2);
    return;
  }
  if (id === "hand_pull") {
    ctx.fillStyle = "#6d4c41";
    ctx.fillRect(ox + 6, oy + 2, 2, 5);
    ctx.fillStyle = "#9e9e9e";
    ctx.fillRect(ox + 5, oy + 1, 4, 2);
    return;
  }
  ctx.fillStyle = "#546e7a";
  ctx.fillRect(ox + (facing === "left" ? -8 : 5), oy + 2, 6, 3);
  ctx.fillStyle = "#37474f";
  ctx.fillRect(ox + (facing === "left" ? -9 : 4), oy + 1, 8, 2);
}
