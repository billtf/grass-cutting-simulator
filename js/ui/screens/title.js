import { el, showOverlay, hideOverlay } from "../dom.js";
import { hasSave } from "../../save.js";

export function createTitleScene(game) {
  return {
    id: "title",
    transparent: false,
    blocksUpdate: true,
    enter() {
      const canContinue = hasSave(game.config.saveKey);
      const card = el(`
        <div class="panel title-panel">
          <div class="logo-mark" aria-hidden="true"></div>
          <h1>Grass Friend</h1>
          <p class="tagline">Keep your lawn happy. Cut it on time. Grow from scissors to a robot crew.</p>
          <div class="btn-col">
            <button class="btn primary" data-act="continue" ${canContinue ? "" : "disabled"}>Continue</button>
            <button class="btn" data-act="new">New game</button>
            <button class="btn" data-act="settings">Settings</button>
          </div>
          <p class="fine">v${game.config.version} · Chromebook ready · saves stay on this device</p>
        </div>
      `);
      card.addEventListener("click", (e) => {
        const act = e.target.closest("[data-act]")?.dataset.act;
        if (act === "continue" && canContinue) game.continueGame();
        if (act === "new") game.startNewGame("normal");
        if (act === "settings") game.openSettings();
      });
      showOverlay(game.overlayEl, card);
    },
    exit() {
      hideOverlay(game.overlayEl);
    },
    update() {},
    draw(ctx) {
      ctx.fillStyle = "#1b5e20";
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    },
  };
}
