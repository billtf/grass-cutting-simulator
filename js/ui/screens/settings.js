import { el, showOverlay, hideOverlay } from "../dom.js";
import { clearSave, exportSaveJson, parseImportedSave } from "../../save.js";

export function createSettingsScene(game, { fromTitle }) {
  return {
    id: "settings",
    transparent: !fromTitle,
    blocksUpdate: true,
    enter() {
      const current = game.state?.difficulty || "normal";
      const card = el(`
        <div class="panel">
          <h2>Settings</h2>
          <p>Change difficulty anytime. Your lawn and coins stay.</p>
          <label class="field">Difficulty
            <span>Now: ${current}. Day length follows the choice.</span>
          </label>
          <div class="btn-row">
            <button class="btn ${current === "easy" ? "primary" : ""}" data-act="easy">Easy</button>
            <button class="btn ${current === "normal" ? "primary" : ""}" data-act="normal">Normal</button>
            <button class="btn ${current === "hard" ? "primary" : ""}" data-act="hard">Hard</button>
          </div>
          <label class="field">What's new
            <span>v${game.config.version} — crew, job board, save export/import.</span>
          </label>
          <div class="btn-col">
            <button class="btn" data-act="export">Export save</button>
            <button class="btn" data-act="import">Import save</button>
            <button class="btn danger" data-act="wipe">Delete save</button>
            <button class="btn" data-act="back">Back</button>
          </div>
          <input type="file" accept="application/json" data-import class="hidden" />
        </div>
      `);
      card.addEventListener("click", (e) => {
        const act = e.target.closest("[data-act]")?.dataset.act;
        if (act === "back") game.scenes.pop();
        if (act === "easy" || act === "normal" || act === "hard") {
          if (game.state) game.setDifficulty(act);
          game.scenes.pop();
          game.openSettings();
        }
        if (act === "export" && game.state) {
          const blob = new Blob([exportSaveJson(game.state)], { type: "application/json" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "grass-friend-save.json";
          a.click();
        }
        if (act === "import") card.querySelector("[data-import]").click();
        if (act === "wipe") {
          if (confirm("Delete the local save? This cannot be undone.")) {
            clearSave(game.config.saveKey);
            game.state = null;
            game.scenes.clear();
            game.showTitle();
          }
        }
      });
      card.querySelector("[data-import]").addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const saved = parseImportedSave(text);
          localStorage.setItem(game.config.saveKey, JSON.stringify(saved));
          game.continueGame();
        } catch (err) {
          alert("Could not import that file. " + err.message);
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
