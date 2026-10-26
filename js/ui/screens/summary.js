import { el, showOverlay, hideOverlay } from "../dom.js";
import { pressed } from "../../input.js";

export function createSummaryScene(game, report) {
  return {
    id: "summary",
    transparent: true,
    blocksUpdate: true,
    enter() {
      const rows = report.lines
        .map((line) => `<li><span>${line.label}</span><strong>${line.value}</strong></li>`)
        .join("");
      const card = el(`
        <div class="panel">
          <h2>Day ${report.day} wrap-up</h2>
          <ul class="score-list">${rows}</ul>
          <p class="tip">${report.tip}</p>
          <p class="fine">Tomorrow: ${report.forecast}</p>
          <div class="btn-col">
            <button class="btn primary" data-act="ok">Start the new day</button>
          </div>
        </div>
      `);
      card.addEventListener("click", (e) => {
        if (e.target.closest("[data-act]")?.dataset.act === "ok") game.scenes.pop();
      });
      showOverlay(game.overlayEl, card);
    },
    exit() {
      hideOverlay(game.overlayEl);
    },
    update() {
      if (pressed("use") || pressed("pause")) game.scenes.pop();
    },
    draw() {},
  };
}

export function pickTip(tips, day) {
  if (!tips?.length) return "Keep the lawn near 3 inches.";
  return tips[(day - 1) % tips.length];
}
