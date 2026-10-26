/** HTML HUD. Reads game state only. */

import { formatClock } from "../clock.js";
import { findTool } from "../entities/tools.js";
import { activeCharacter } from "../sim/xp.js";

export function mountHud(root) {
  root.innerHTML = `
    <div class="hud-bar hud-top">
      <div class="hud-chip" id="hud-clock">Day 1 · 7:00 AM</div>
      <div class="hud-chip" id="hud-weather">Sunny</div>
      <div class="hud-chip" id="hud-points">Pts 0</div>
      <div class="hud-chip" id="hud-coins">Coins 0</div>
      <div class="hud-chip" id="hud-level">Lv 1</div>
    </div>
    <div class="hud-bar hud-mid">
      <div class="hud-chip" id="hud-tool">Scissors</div>
      <div class="hud-chip" id="hud-energy">Energy 100</div>
    </div>
    <div class="hud-bar hud-bottom">
      <div class="hud-chip" id="hud-hint">WASD move · Space cut · Q switch tool · E shed · H overlay</div>
      <div class="hud-chip hidden" id="hud-toast"></div>
    </div>
  `;
  return {
    clock: root.querySelector("#hud-clock"),
    weather: root.querySelector("#hud-weather"),
    points: root.querySelector("#hud-points"),
    coins: root.querySelector("#hud-coins"),
    level: root.querySelector("#hud-level"),
    tool: root.querySelector("#hud-tool"),
    energy: root.querySelector("#hud-energy"),
    hint: root.querySelector("#hud-hint"),
    toast: root.querySelector("#hud-toast"),
  };
}

export function updateHud(nodes, state, tools) {
  if (!nodes) return;
  const clock = formatClock(state.clock);
  const character = activeCharacter(state);
  nodes.clock.textContent = `Day ${state.clock.day} · ${clock}`;
  nodes.weather.textContent = labelWeather(state.game.weatherToday);
  nodes.points.textContent = `Pts ${Math.round(state.economy.points)}`;
  nodes.coins.textContent = `Coins ${Math.round(state.economy.coins)}`;
  nodes.level.textContent = `Lv ${character?.level || 1}`;
  const tool = findTool(tools || [{ id: state.inventory.equippedTool, name: "Tool" }], state.inventory.equippedTool);
  const owned = state.inventory.tools.find((t) => t.id === tool.id) || { sharpness: 100 };
  let toolText = `${tool.name || labelTool(tool.id)} · ${Math.round(owned.sharpness)}%`;
  if (tool.deckHeight) toolText += ` · deck ${state.inventory.deckHeight ?? 3}"`;
  if (tool.needsFuel) toolText += ` · fuel ${Math.round(owned.fuel || 0)}`;
  if (tool.kind === "trimmer") toolText += ` · line ${Math.round(owned.line || 0)}`;
  nodes.tool.textContent = toolText;
  const energy = Math.round(character?.needs?.energy ?? 100);
  nodes.energy.textContent = `Energy ${energy}`;
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
