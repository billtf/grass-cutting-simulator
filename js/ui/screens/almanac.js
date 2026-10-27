import { el, showOverlay, hideOverlay } from "../dom.js";
import { pressed } from "../../input.js";
import { TIP_TEXT, TIP_TITLE } from "../../sim/tips.js";

export function createAlmanacScene(game) {
  return {
    id: "almanac",
    transparent: true,
    blocksUpdate: true,
    enter() {
      const unlocked = new Set((game.state?.almanac || []).map((t) => t.id));
      const items = Object.entries(TIP_TEXT)
        .map(([id, text]) => {
          const have = unlocked.has(id);
          return `<li class="${have ? "open" : "locked"}"><strong>${have ? TIP_TITLE[id] || titleCase(id) : "Locked tip"}</strong><p>${have ? text : "Keep playing to unlock this tip."}</p></li>`;
        })
        .join("");
      const card = el(`
        <div class="panel wide">
          <h2>Almanac</h2>
          <p class="fine">Short lawn tips. New ones appear the first time you see a problem.</p>
          <ul class="almanac-list">${items}</ul>
          <div class="btn-col">
            <button class="btn" data-act="back">Back</button>
          </div>
        </div>
      `);
      card.addEventListener("click", (e) => {
        if (e.target.closest("[data-act]")?.dataset.act === "back") game.scenes.pop();
      });
      showOverlay(game.overlayEl, card);
    },
    exit() {
      hideOverlay(game.overlayEl);
    },
    update() {
      if (pressed("pause")) game.scenes.pop();
    },
    draw() {},
  };
}

function titleCase(id) {
  return id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
