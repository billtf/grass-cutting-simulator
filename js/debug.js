import { el } from "./ui/dom.js";
import { tickGrowth } from "./sim/lawn.js";

export function createDebug() {
  return {
    open: false,
    frames: 0,
    acc: 0,
    fps: 0,
    panel: null,
    tick(game, dt) {
      this.frames += 1;
      this.acc += dt;
      if (this.acc >= 0.5) {
        this.fps = Math.round(this.frames / this.acc);
        this.frames = 0;
        this.acc = 0;
        this.render(game);
      }
    },
    render(game) {
      if (!this.panel) return;
      const s = game.state;
      this.panel.querySelector("[data-fps]").textContent = String(this.fps);
      this.panel.querySelector("[data-hour]").textContent = s.clock.hour.toFixed(2);
      this.panel.querySelector("[data-day]").textContent = String(s.clock.day);
    },
    toggle(game) {
      this.open = !this.open;
      if (this.open) this.mount(game);
      else this.unmount();
    },
    mount(game) {
      this.panel = el(`
        <div class="debug-panel" id="debug-panel">
          <strong>Debug</strong>
          <div>FPS <span data-fps>0</span></div>
          <div>Day <span data-day>1</span> hour <span data-hour>0</span></div>
          <button data-act="hour">Skip 1 hour</button>
          <button data-act="day">Skip to next day</button>
          <button data-act="coins">+100 coins</button>
          <button data-act="grow">Grow all cells</button>
        </div>
      `);
      this.panel.addEventListener("click", (e) => {
        const act = e.target.closest("[data-act]")?.dataset.act;
        if (!act || !game.state) return;
        if (act === "hour") {
          tickGrowth(game.state.lawn, game.config, {
            growthSpeed: game.state.difficultyRules.growthSpeed,
            seasonMult: 1,
            waterMultStub: 1,
          });
          game.state.clock.hour = (game.state.clock.hour + 1) % 24;
          if (game.state.clock.hour < 1) game.state.clock.day += 1;
        }
        if (act === "day") {
          game.state.clock.day += 1;
          game.state.clock.hour = 7;
          game.save();
        }
        if (act === "coins") {
          game.state.economy.coins += 100;
        }
        if (act === "grow") {
          tickGrowth(game.state.lawn, game.config, {
            growthSpeed: 8,
            seasonMult: 1,
            waterMultStub: 1,
          });
        }
        this.render(game);
      });
      game.appEl.appendChild(this.panel);
    },
    unmount() {
      this.panel?.remove();
      this.panel = null;
    },
  };
}
