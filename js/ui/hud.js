/** HTML HUD. Reads game state only. */

import { formatClock } from "../clock.js";

export function mountHud(root) {
  root.innerHTML = `
    <div class="hud-bar hud-top">
      <div class="hud-chip" id="hud-clock">Day 1 · 7:00 AM</div>
      <div class="hud-chip" id="hud-weather">Sunny</div>
      <div class="hud-chip" id="hud-points">Pts 0</div>
      <div class="hud-chip" id="hud-coins">Coins 0</div>
      <div class="hud-chip" id="hud-tool">Scissors</div>
    </div>
    <div class="hud-bar hud-bottom">
      <div class="hud-chip" id="hud-hint">WASD move · hold Space to cut · H overlay · Esc pause</div>
      <div class="hud-chip hidden" id="hud-toast"></div>
    </div>
  `;
  return {
    clock: root.querySelector("#hud-clock"),
    weather: root.querySelector("#hud-weather"),
    points: root.querySelector("#hud-points"),
    coins: root.querySelector("#hud-coins"),
    tool: root.querySelector("#hud-tool"),
    hint: root.querySelector("#hud-hint"),
    toast: root.querySelector("#hud-toast"),
  };
}

export function updateHud(nodes, state) {
  if (!nodes) return;
  const clock = formatClock(state.clock);
  nodes.clock.textContent = `Day ${state.clock.day} · ${clock}`;
  nodes.weather.textContent = labelWeather(state.game.weatherToday);
  nodes.points.textContent = `Pts ${Math.round(state.economy.points)}`;
  nodes.coins.textContent = `Coins ${Math.round(state.economy.coins)}`;
  const tool = state.inventory.equippedTool || "scissors";
  const sharpness = (state.inventory.tools.find((t) => t.id === tool) || {}).sharpness;
  nodes.tool.textContent =
    sharpness != null ? `${labelTool(tool)} · ${Math.round(sharpness)}%` : labelTool(tool);
}

export function showToast(nodes, text, ms = 2600) {
  if (!nodes) return;
  nodes.toast.textContent = text;
  nodes.toast.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    nodes.toast.classList.add("hidden");
  }, ms);
}

function labelWeather(id) {
  const map = {
    sunny: "Sunny",
    cloudy: "Cloudy",
    rain: "Rain",
    heat: "Heat wave",
    storm: "Storm",
  };
  return map[id] || "Sunny";
}

function labelTool(id) {
  return id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
