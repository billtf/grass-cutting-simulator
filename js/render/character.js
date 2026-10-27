/** Pixel kid + held tool. Look fields pick palettes; no external sprites. */

export const SKIN = ["#f6d7b0", "#e0ac69", "#c68642", "#8d5524", "#5c3310", "#ffdbac"];
export const HAIR = ["#1b1b1b", "#3e2723", "#6d4c41", "#d7ccc8", "#f9a825", "#6a1b9a", "#1565c0", "#c62828"];
export const OUTFIT = ["#1565c0", "#2e7d32", "#f9a825", "#6a1b9a", "#c62828", "#00838f", "#ef6c00", "#37474f"];
export const EYES = ["#1b1b1b", "#1565c0", "#2e7d32", "#6d4c41", "#c62828", "#f9a825"];
export const SHOES = ["#5d4037", "#212121", "#1565c0", "#c62828", "#f9a825", "#eceff1"];
export const HATS = ["#33691e", "#1565c0", "#c62828", "#f9a825", "#5d4037", "#eceff1"];

export const PREVIEW_FACING = "down";

export function lookColors(look = {}) {
  const skinI = Math.abs(look.skin | 0) % SKIN.length;
  const hairI = Math.abs(look.hairColor | 0) % HAIR.length;
  const fitI = Math.abs(look.outfit | 0) % OUTFIT.length;
  const eyeI = Math.abs(look.eyes | 0) % EYES.length;
  const shoeI = Math.abs(look.shoes | 0) % SHOES.length;
  const hatOn = (look.hat | 0) > 0;
  const hatI = hatOn ? Math.abs((look.hat | 0) - 1) % HATS.length : 0;
  return {
    skin: SKIN[skinI],
    hair: HAIR[hairI],
    outfit: OUTFIT[fitI],
    eyes: EYES[eyeI],
    shoes: SHOES[shoeI],
    hat: hatOn ? HATS[hatI] : null,
    body: Math.abs(look.body | 0) % 4,
    hairStyle: Math.abs(look.hair | 0) % 8,
  };
}

export function drawCharacter(ctx, character, sx, sy, facing, toolId, cutting) {
  const pal = lookColors(character?.look);
  const wide = pal.body >= 2;
  const tall = pal.body === 1 || pal.body === 3;
  const ox = Math.round(sx) - (wide ? 7 : 6);
  const oy = Math.round(sy) - (tall ? 11 : 10);
  const torsoW = wide ? 11 : 9;

  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(ox + 2, oy + 18, torsoW, 2);

  ctx.fillStyle = "#37474f";
  ctx.fillRect(ox + 3, oy + 13, 3, 5);
  ctx.fillRect(ox + (wide ? 8 : 7), oy + 13, 3, 5);
  ctx.fillStyle = pal.shoes;
  ctx.fillRect(ox + 2, oy + 17, 4, 2);
  ctx.fillRect(ox + (wide ? 8 : 7), oy + 17, 4, 2);

  ctx.fillStyle = pal.outfit;
  ctx.fillRect(ox + 2, oy + 8, torsoW, 6);
  ctx.fillStyle = "#fffde7";
  ctx.fillRect(ox + 4, oy + 9, 2, 2);

  ctx.fillStyle = pal.skin;
  ctx.fillRect(ox + 3, oy + 3, 7, 6);
  ctx.fillStyle = pal.hair;
  if (pal.hairStyle === 0) ctx.fillRect(ox + 3, oy + 1, 7, 3);
  else ctx.fillRect(ox + 2, oy + 1, 9, 4);
  if (pal.hairStyle === 2) ctx.fillRect(ox + 1, oy + 4, 2, 4);
  if (pal.hairStyle === 3) ctx.fillRect(ox + 3, oy + 0, 7, 2);
  if (pal.hairStyle === 4) ctx.fillRect(ox + 3, oy + 4, 7, 2);
  if (pal.hairStyle === 5) ctx.fillRect(ox + 8, oy + 0, 4, 4);
  if (pal.hairStyle === 6) {
    ctx.fillRect(ox + 1, oy + 4, 2, 5);
    ctx.fillRect(ox + 10, oy + 4, 2, 5);
  }
  if (pal.hairStyle === 7) {
    ctx.fillRect(ox + 3, oy + 0, 2, 2);
    ctx.fillRect(ox + 8, oy + 0, 2, 2);
  }
  if (pal.hat) {
    ctx.fillStyle = pal.hat;
    ctx.fillRect(ox + 1, oy + 0, 11, 3);
    ctx.fillStyle = "#1b5e20";
    ctx.fillRect(ox + 0, oy + 2, 13, 2);
  }

  const eye = pal.eyes;
  ctx.fillStyle = eye;
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

  if (toolId !== "none") drawHeldTool(ctx, sx, sy, facing, toolId, cutting);
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

/** Same drawCharacter path as the lawn, on a small canvas. Facing down. */
export function paintCharacterPreview(canvas, character, facing = PREVIEW_FACING) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = "#5a8f32";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#3d6b2a";
  for (let x = 1; x < w; x += 3) ctx.fillRect(x, h - 10, 1, 8);
  const sx = Math.floor(w / 2);
  const sy = Math.floor(h / 2) + 4;
  drawCharacter(ctx, character, sx, sy, facing, "none", false);
}
