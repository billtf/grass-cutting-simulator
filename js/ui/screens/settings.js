import { el, showOverlay, hideOverlay } from "../dom.js";
import { clearSave, exportSaveJson, parseImportedSave } from "../../save.js";
import { activeCharacter } from "../../sim/xp.js";
import { defaultLook } from "../../entities/characters.js";
import { bindLookEditor, lookEditorHtml } from "../lookEditor.js";

export function createSettingsScene(game, { fromTitle }) {
  return {
    id: "settings",
    transparent: !fromTitle,
    blocksUpdate: true,
    enter() {
      const current = game.state?.difficulty || "normal";
      const character = game.state ? activeCharacter(game.state) : null;
      if (character && !character.look) character.look = defaultLook();
      const lookBlock = character
        ? `<h3 class="settings-look-title">How you look</h3>
          <p class="fine">Tweaks show on the lawn right away. Closing still saves like usual.</p>
          ${lookEditorHtml()}`
        : "";
      const card = el(`
        <div class="panel ${character ? "wide" : ""}">
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
          <label class="field">Volume
            <input type="range" min="0" max="1" step="0.05" value="${game.state?.settings.volume ?? 0.7}" data-vol />
          </label>
          <label class="trait"><input type="checkbox" data-cb ${game.state?.settings.colorblind ? "checked" : ""}/> Colorblind overlay colors</label>
          <label class="trait"><input type="checkbox" data-motion ${game.state?.settings.reducedMotion ? "checked" : ""}/> Reduced motion</label>
          ${lookBlock}
          <label class="field">What's new
            <span>v${game.config.version} — live player look preview in Settings. Tweaks show as you drag.</span>
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
      card.querySelector("[data-vol]")?.addEventListener("input", (e) => {
        if (game.state) game.state.settings.volume = Number(e.target.value);
      });
      card.querySelector("[data-cb]")?.addEventListener("change", (e) => {
        if (game.state) game.state.settings.colorblind = e.target.checked;
      });
      card.querySelector("[data-motion]")?.addEventListener("change", (e) => {
        if (game.state) {
          game.state.settings.reducedMotion = e.target.checked;
          document.body.classList.toggle("reduced-motion", e.target.checked);
        }
      });
      if (character) bindLookEditor(card, character);
      card.addEventListener("click", (e) => {
        const act = e.target.closest("[data-act]")?.dataset.act;
        if (act === "back") {
          if (game.state) game.save();
          game.scenes.pop();
        }
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
