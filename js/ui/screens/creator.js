import { el, showOverlay, hideOverlay } from "../dom.js";
import { CATCHPHRASES, createCharacter } from "../../entities/characters.js";
import { bindLookEditor, lookEditorHtml } from "../lookEditor.js";

export function createCreatorScene(game, { character, onSave }) {
  const draft = JSON.parse(JSON.stringify(character));
  return {
    id: "creator",
    transparent: true,
    blocksUpdate: true,
    enter() {
      render();
    },
    exit() {
      hideOverlay(game.overlayEl);
    },
    update() {},
    draw() {},
  };

  function render() {
    const traits = game.traits
      .map((t) => {
        const on = draft.traits.includes(t.id);
        return `<label class="trait ${on ? "on" : ""}"><input type="checkbox" data-trait="${t.id}" ${on ? "checked" : ""}/> <strong>${t.name}</strong> — ${t.blurb}</label>`;
      })
      .join("");
    const phrases = CATCHPHRASES.map(
      (p) => `<option ${draft.catchphrase === p ? "selected" : ""}>${p}</option>`
    ).join("");
    const card = el(`
      <div class="panel wide">
        <h2>${character.name ? "Edit character" : "New character"}</h2>
        <label class="field">Name (12 letters)
          <input type="text" maxlength="12" data-name value="${draft.name || ""}" />
        </label>
        ${lookEditorHtml()}
        <p class="fine">Pick 2 traits. They change how you mow, not just how you look.</p>
        <div class="trait-list">${traits}</div>
        <label class="field">Catchphrase
          <select data-phrase>${phrases}</select>
        </label>
        <div class="btn-col">
          <button class="btn primary" data-act="save">Save</button>
          <button class="btn" data-act="cancel">Cancel</button>
        </div>
      </div>
    `);
    card.querySelector("[data-name]").addEventListener("input", (e) => {
      draft.name = e.target.value.slice(0, 12);
    });
    bindLookEditor(card, draft);
    card.querySelectorAll("[data-trait]").forEach((box) => {
      box.addEventListener("change", () => {
        const id = box.dataset.trait;
        if (box.checked) {
          if (draft.traits.length >= 2) box.checked = false;
          else draft.traits.push(id);
        } else {
          draft.traits = draft.traits.filter((t) => t !== id);
        }
        render();
      });
    });
    card.querySelector("[data-phrase]").addEventListener("change", (e) => {
      draft.catchphrase = e.target.value;
    });
    card.addEventListener("click", (e) => {
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (act === "cancel") game.scenes.pop();
      if (act === "save") {
        draft.name = (draft.name || "Player").slice(0, 12);
        onSave(draft);
        game.scenes.pop();
      }
    });
    showOverlay(game.overlayEl, card);
  }
}

export function blankDraft(id) {
  return createCharacter(id, "");
}
