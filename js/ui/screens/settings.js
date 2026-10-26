import { el, showOverlay, hideOverlay } from "../dom.js";
import { clearSave } from "../../save.js";

export function createSettingsScene(game, { fromTitle }) {
  return {
    id: "settings",
    transparent: !fromTitle,
    blocksUpdate: true,
    enter() {
      const card = el(`
        <div class="panel">
          <h2>Settings</h2>
          <p>Difficulty and extras unlock in later phases. Your save stays in this browser.</p>
          <label class="field">Day length
            <span>${game.state?.game.dayLengthMinutes ?? 6} minutes (Normal)</span>
          </label>
          <label class="field">What's new
            <span>v${game.config.version} — playable lawn, scissors, save/load.</span>
          </label>
          <div class="btn-col">
            <button class="btn danger" data-act="wipe">Delete save</button>
            <button class="btn" data-act="back">Back</button>
          </div>
        </div>
      `);
      card.addEventListener("click", (e) => {
        const act = e.target.closest("[data-act]")?.dataset.act;
        if (act === "back") {
          game.scenes.pop();
        }
        if (act === "wipe") {
          if (confirm("Delete the local save? This cannot be undone.")) {
            clearSave(game.config.saveKey);
            game.state = null;
            game.scenes.clear();
            game.showTitle();
          }
        }
      });
      showOverlay(game.overlayEl, card);
    },
    exit() {
      hideOverlay(game.overlayEl);
    },
    update() {},
    draw(ctx) {
      if (fromTitle) {
        ctx.fillStyle = "#1b5e20";
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      }
    },
  };
}
