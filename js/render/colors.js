/** Placeholder palette. Overlay colors match the spec teaching maps. */

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpHex(a, b, t) {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(lerp(ar, br, t));
  const g = Math.round(lerp(ag, bg, t));
  const bl = Math.round(lerp(ab, bb, t));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl
    .toString(16)
    .padStart(2, "0")}`;
}

export function heightBandColor(height) {
  if (height < 2.5) return "#7cb342";
  if (height <= 3.5) return "#43a047";
  if (height <= 6) return "#fdd835";
  return "#e53935";
}

export function moistureColor(moisture) {
  if (moisture < 20) return "#efebe9";
  if (moisture < 40) return "#90caf9";
  if (moisture <= 70) return "#1e88e5";
  if (moisture <= 90) return "#1565c0";
  return "#4a148c";
}

export function healthColor(health) {
  if (health <= 0) return "#5d4037";
  if (health < 40) return "#ef6c00";
  if (health < 80) return "#fdd835";
  return "#43a047";
}

export function grassColor(height, health) {
  let base;
  if (height < 1.5) base = "#c8b27a";
  else if (height < 2.5) base = "#9ccc65";
  else if (height <= 3.5) base = "#66bb6a";
  else if (height <= 4.5) base = "#43a047";
  else if (height <= 6) base = "#2e7d32";
  else base = "#1b5e20";

  const brown = "#8d6e63";
  const t = health >= 80 ? 0 : (80 - health) / 80;
  return lerpHex(base, brown, t * 0.85);
}

export const KIND_COLOR = {
  1: "#6d4c41",
  2: "#bcaaa4",
  3: "#8d6e63",
  4: "#a1887f",
};

export function cellFill(kind, height, health, moisture, overlay) {
  if (kind !== 0) return KIND_COLOR[kind] || "#333";
  if (overlay === "height") return heightBandColor(height);
  if (overlay === "moisture") return moistureColor(moisture);
  if (overlay === "health") return healthColor(health);
  return grassColor(height, health);
}
