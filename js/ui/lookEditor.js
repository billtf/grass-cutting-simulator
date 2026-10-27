/** Shared look sliders + live sprite preview. Uses drawCharacter via paintCharacterPreview. */

import { LOOK_COUNTS, LOOK_FIELDS } from "../entities/characters.js";
import { paintCharacterPreview } from "../render/character.js";

export const LOOK_LABELS = {
  body: "Body",
  skin: "Skin",
  hair: "Hair style",
  hairColor: "Hair color",
  eyes: "Eyes",
  outfit: "Shirt",
  hat: "Hat",
  shoes: "Shoes",
};

export function lookEditorHtml() {
  const sliders = LOOK_FIELDS.map((f) => {
    return `<label class="field">${LOOK_LABELS[f] || f}
      <input type="range" min="0" max="${LOOK_COUNTS[f] - 1}" value="0" data-look="${f}" />
    </label>`;
  }).join("");
  return `
    <div class="look-preview-wrap">
      <div class="look-preview-stage">
        <canvas class="look-preview" width="48" height="56" aria-label="How you look"></canvas>
        <p class="fine look-preview-caption">This is you on the lawn</p>
      </div>
      <div class="look-grid">${sliders}</div>
    </div>
  `;
}

export function bindLookEditor(root, draft, onLookChange) {
  const canvas = root.querySelector(".look-preview");
  function paint() {
    paintCharacterPreview(canvas, draft, "down");
  }
  root.querySelectorAll("[data-look]").forEach((input) => {
    const field = input.dataset.look;
    input.value = String(draft.look?.[field] ?? 0);
    input.addEventListener("input", () => {
      if (!draft.look) draft.look = {};
      draft.look[field] = Number(input.value);
      paint();
      onLookChange?.(field, draft.look[field]);
    });
  });
  paint();
  return { paint, canvas };
}
