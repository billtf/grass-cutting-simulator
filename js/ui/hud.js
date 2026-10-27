/** HTML HUD. Reads game state only. */

import { formatClock } from "../clock.js";
import { findAnyTool } from "../entities/tools.js";
import { activeCharacter } from "../sim/xp.js";

export function mountHud(root) {
  root.innerHTML = `
    <div class="hud-bar hud-top">
      <div class="hud-chip" id="hud-clock">Day 1 · 7:00 AM</div>
      <div class="hud-chip" id="hud-weather">Sunny · tom. Sunny</div>
      <div class="hud-chip" id="hud-points">Pts 0</div>
      <div class="hud-chip" id="hud-coins">Coins 0</div>
      <div class="hud-chip" id="hud-level">Lv 1</div>
    </div>
    <div class="hud-bar hud-mid">
      <div class="hud-chip" id="hud-tool">Scissors</div>
      <div class="hud-chip" id="hud-energy">Energy 100 · Water 100 · Mood 100</div>
    </div>
    <div class="hud-bar hud-bottom">
      <div class="hud-chip" id="hud-hint">WASD move · click/Space cut · Q tool · E shed · H overlay</div>
      <div class="hud-chip hidden" id="hud-toast"></div>
    </div>
    <div id="hud-coach" class="hud-coach hidden">
      <div class="hud-coach-kicker" id="hud-coach-kicker">Day 1 guide</div>
      <h3 id="hud-coach-title">Walk around</h3>
      <p id="hud-coach-text"></p>
      <div class="hud-coach-btns">
        <button type="button" class="btn primary" id="hud-coach-next">Next</button>
        <button type="button" class="btn" id="hud-coach-skip">Skip guide</button>
      </div>
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
    coach: root.querySelector("#hud-coach"),
    coachKicker: root.querySelector("#hud-coach-kicker"),
    coachTitle: root.querySelector("#hud-coach-title"),
    coachText: root.querySelector("#hud-coach-text"),
    coachNext: root.querySelector("#hud-coach-next"),
    coachSkip: root.querySelector("#hud-coach-skip"),
  };
}

export function updateHud(nodes, state, tools) {
  if (!nodes) return;
  const clock = formatClock(state.clock);
  const character = activeCharacter(state);
  nodes.clock.textContent = `Day ${state.clock.day} · ${clock} · ${state.game.season || "spring"}`;
  nodes.weather.textContent = `${labelWeather(state.game.weatherToday)} · tom. ${labelWeather(state.game.weatherTomorrow)}`;
  nodes.points.textContent = `Pts ${Math.round(state.economy.points)}`;
  nodes.coins.textContent = `Coins ${Math.round(state.economy.coins)}`;
  nodes.level.textContent = `Lv ${character?.level || 1}`;
  const list = tools || [{ id: state.inventory.equippedTool, name: "Tool" }];
  const tool = findAnyTool(list, [], state.inventory.equippedTool);
  const owned = state.inventory.tools.find((t) => t.id === tool.id) || { sharpness: 100 };
  let toolText = tool.role
    ? tool.name || labelTool(tool.id)
    : `${tool.name || labelTool(tool.id)} · ${Math.round(owned.sharpness)}%`;
  if (tool.deckHeight) toolText += ` · deck ${state.inventory.deckHeight ?? 3}"`;
  if (tool.needsFuel) toolText += ` · fuel ${Math.round(owned.fuel || 0)}`;
  if (tool.kind === "trimmer") toolText += ` · line ${Math.round(owned.line || 0)}`;
  nodes.tool.textContent = toolText;
  const n = character?.needs || {};
  nodes.energy.textContent = `Energy ${Math.round(n.energy ?? 100)} · Water ${Math.round(n.hydration ?? 100)} · Mood ${Math.round(n.mood ?? 100)}`;
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

export function showCoach(nodes, step, index, total) {
  if (!nodes?.coach) return;
  if (!step) {
    nodes.coach.classList.add("hidden");
    return;
  }
  nodes.coach.classList.remove("hidden");
  nodes.coachKicker.textContent = `Day 1 guide · ${index + 1} of ${total}`;
  nodes.coachTitle.textContent = step.title;
  nodes.coachText.textContent = step.text;
}

export function hideCoach(nodes) {
  if (nodes?.coach) nodes.coach.classList.add("hidden");
}

export function bindCoach(nodes, handlers) {
  if (!nodes?.coachNext) return;
  nodes.coachNext.onclick = handlers.onNext;
  nodes.coachSkip.onclick = handlers.onSkip;
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
