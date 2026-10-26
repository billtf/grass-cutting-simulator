import { el, showOverlay, hideOverlay } from "../dom.js";
import { hasSave } from "../../save.js";

export function createTitleScene(game) {
  let picking = false;
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
          <div class="btn-col" data-main>
            <button class="btn primary" data-act="continue" ${canContinue ? "" : "disabled"}>Continue</button>
            <button class="btn" data-act="new">New game</button>
            <button class="btn" data-act="settings">Settings</button>
          </div>
          <div class="btn-col hidden" data-diff>
            <p>Pick a difficulty. You can change this later in Settings.</p>
            <button class="btn primary" data-act="diff-normal">Normal · 6 min days</button>
            <button class="btn" data-act="diff-easy">Easy · 10 min days, more coins</button>
            <button class="btn" data-act="diff-hard">Hard · 3 min days, faster grass</button>
            <button class="btn" data-act="back">Back</button>
          </div>
          <p class="fine">v${game.config.version} · Chromebook ready · saves stay on this device</p>
        </div>
      `);
      const main = card.querySelector("[data-main]");
      const diff = card.querySelector("[data-diff]");
      const showPick = (on) => {
        picking = on;
        main.classList.toggle("hidden", on);
        diff.classList.toggle("hidden", !on);
      };
      showPick(picking);
      card.addEventListener("click", (e) => {
        const act = e.target.closest("[data-act]")?.dataset.act;
        if (act === "continue" && canContinue) game.continueGame();
        if (act === "new") showPick(true);
        if (act === "back") showPick(false);
        if (act === "settings") game.openSettings();
        if (act === "diff-easy") game.startNewGame("easy");
        if (act === "diff-normal") game.startNewGame("normal");
        if (act === "diff-hard") game.startNewGame("hard");
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
