import { el, showOverlay, hideOverlay } from "../dom.js";
import { pressed } from "../../input.js";
import { createAlmanacScene } from "./almanac.js";
import { createProfilesScene } from "./profiles.js";

export function createPauseScene(game) {
  return {
    id: "pause",
    transparent: true,
    blocksUpdate: true,
    enter() {
      const card = el(`
        <div class="panel">
          <h2>Paused</h2>
          <div class="btn-col">
            <button class="btn primary" data-act="resume">Resume</button>
            <button class="btn" data-act="crew">Crew</button>
            <button class="btn" data-act="almanac">Almanac</button>
            <button class="btn" data-act="settings">Settings</button>
            <button class="btn" data-act="title">Title screen</button>
          </div>
          <p class="fine">Esc or P also resumes. Progress autosaves when you leave the tab.</p>
        </div>
      `);
      card.addEventListener("click", (e) => {
        const act = e.target.closest("[data-act]")?.dataset.act;
        if (act === "resume") game.scenes.pop();
        if (act === "crew") game.scenes.push(createProfilesScene(game));
        if (act === "almanac") game.scenes.push(createAlmanacScene(game));
        if (act === "settings") game.openSettings();
        if (act === "title") {
          game.save();
          game.scenes.clear();
          game.showTitle();
        }
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
