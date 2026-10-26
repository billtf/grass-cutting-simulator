import { el, showOverlay, hideOverlay } from "../dom.js";
import { pressed } from "../../input.js";
import { findTool } from "../../entities/tools.js";
import { activeCharacter } from "../../sim/xp.js";
import {
  buyTool,
  buySupply,
  canBuyTool,
  ownedTool,
  sharpenForCoins,
  changeOil,
  refuelFromCans,
  refillLine,
} from "../../sim/shop.js";
import { showToast } from "../hud.js";

export function createShedScene(game) {
  let tab = "shop";
  let minigame = null;

  const scene = {
    id: "shed",
    transparent: true,
    blocksUpdate: true,
    enter() {
      render();
    },
    exit() {
      hideOverlay(game.overlayEl);
    },
    update() {
      if (pressed("pause") || pressed("interact")) game.scenes.pop();
      if (minigame) tickMini(minigame, game);
    },
    draw() {},
  };

  function render() {
    const state = game.state;
    const character = activeCharacter(state);
    const equipped = findTool(game.allTools, state.inventory.equippedTool);
    const owned = ownedTool(state, equipped.id);
    const card = el(`
      <div class="panel wide">
        <h2>Shed</h2>
        <p class="fine">Level ${character.level} · ${state.economy.coins} coins · ${equipped.name}</p>
        <div class="tabs">
          <button class="btn ${tab === "shop" ? "primary" : ""}" data-act="tab-shop">Shop</button>
          <button class="btn ${tab === "bench" ? "primary" : ""}" data-act="tab-bench">Workbench</button>
        </div>
        <div class="shed-body"></div>
        <div class="btn-col">
          <button class="btn" data-act="leave">Walk back out (E)</button>
        </div>
      </div>
    `);
    const body = card.querySelector(".shed-body");
    if (tab === "shop") body.appendChild(shopList(game, character));
    else body.appendChild(bench(game, equipped, owned));

    card.addEventListener("click", (e) => {
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (!act) return;
      if (act === "leave") game.scenes.pop();
      if (act === "tab-shop") {
        tab = "shop";
        minigame = null;
        render();
      }
      if (act === "tab-bench") {
        tab = "bench";
        render();
      }
      if (act.startsWith("buy-")) {
        const id = act.slice(4);
        const tool = findTool(game.allTools, id);
        const result = buyTool(state, tool, character);
        showToast(game.hud, result.ok ? `Bought ${tool.name}!` : result.reason);
        if (result.ok) {
          state.inventory.equippedTool = tool.id;
          render();
        }
      }
      if (act === "buy-fuel") {
        const result = buySupply(state, game.shop, "fuel");
        showToast(game.hud, result.ok ? "Fuel can added." : result.reason);
        render();
      }
      if (act === "buy-line") {
        const result = buySupply(state, game.shop, "line");
        showToast(game.hud, result.ok ? "Trimmer line added." : result.reason);
        render();
      }
      if (act === "sharpen") {
        const result = sharpenForCoins(state, owned, game.shop.sharpenCost);
        showToast(game.hud, result.ok ? "Blades are sharp." : result.reason);
        render();
      }
      if (act === "minigame") {
        minigame = startMini();
        render();
      }
      if (act === "oil") {
        const result = changeOil(state, owned, equipped, game.shop.oilCost);
        showToast(game.hud, result.ok ? "Oil changed." : result.reason);
        render();
      }
      if (act === "refuel") {
        const result = refuelFromCans(state, owned, equipped);
        showToast(game.hud, result.ok ? "Tank filled." : result.reason);
        render();
      }
      if (act === "line") {
        const result = refillLine(state, owned, equipped);
        showToast(game.hud, result.ok ? "Line reloaded." : result.reason);
        render();
      }
    });
    showOverlay(game.overlayEl, card);
    if (minigame) {
      const host = card.querySelector("[data-mini]");
      if (host) drawMini(host, minigame);
    }
  }

  function shopList(game, character) {
    const wrap = el(`<div class="shop-list"></div>`);
    for (const tool of game.allTools) {
      const owned = !!ownedTool(game.state, tool.id);
      const check = canBuyTool(game.state, tool, character);
      const lock = (character.level || 1) < tool.unlockLevel;
      const detail = tool.role
        ? `${tool.role} · ${tool.cost ? tool.cost + " coins" : "free"} · Lv ${tool.unlockLevel}`
        : `Tier ${tool.tier} · width ${tool.width} · ${tool.cost ? tool.cost + " coins" : "free"} · Lv ${tool.unlockLevel}`;
      const row = el(`
        <div class="shop-row">
          <div>
            <strong>${lock ? "🔒 " : ""}${tool.name}</strong>
            <div class="fine">${detail}</div>
          </div>
          <button class="btn ${owned ? "" : "primary"}" data-act="buy-${tool.id}" ${owned || !check.ok ? "disabled" : ""}>
            ${owned ? "Owned" : lock ? "Locked" : "Buy"}
          </button>
        </div>
      `);
      wrap.appendChild(row);
    }
    wrap.appendChild(
      el(`
        <div class="shop-row">
          <div><strong>Fuel can</strong><div class="fine">${game.shop.fuelCanCost} coins · fills a gas tank</div></div>
          <button class="btn" data-act="buy-fuel">Buy</button>
        </div>
      `)
    );
    wrap.appendChild(
      el(`
        <div class="shop-row">
          <div><strong>Trimmer line</strong><div class="fine">${game.shop.lineCost} coins</div></div>
          <button class="btn" data-act="buy-line">Buy</button>
        </div>
      `)
    );
    return wrap;
  }

  function bench(game, equipped, owned) {
    const sharp = owned ? Math.round(owned.sharpness) : 0;
    return el(`
      <div>
        <p>Equipped: <strong>${equipped.name}</strong> · sharpness ${sharp}%</p>
        <p class="fine">Fuel cans: ${game.state.inventory.supplies.fuel || 0} · Line: ${game.state.inventory.supplies.line || 0}</p>
        <div class="btn-col">
          <button class="btn primary" data-act="sharpen">Sharpen for ${game.shop.sharpenCost} coins</button>
          <button class="btn" data-act="minigame">Sharpen minigame (free if you hit the green)</button>
          <button class="btn" data-act="refuel">Refuel from cans</button>
          <button class="btn" data-act="oil">Oil change (${game.shop.oilCost} coins)</button>
          <button class="btn" data-act="line">Reload trimmer line</button>
        </div>
        <div data-mini class="mini-host"></div>
      </div>
    `);
  }

  function startMini() {
    return { t: 0, dur: 10, pos: 0, done: false };
  }

  function tickMini(mini, game) {
    if (mini.done) return;
    mini.t += 1 / 30;
    mini.pos = (Math.sin(mini.t * 3.2) + 1) / 2;
    const host = game.overlayEl.querySelector("[data-mini]");
    if (host) drawMini(host, mini);
    if (pressed("use")) {
      const hit = Math.abs(mini.pos - 0.5) < 0.12;
      const owned = ownedTool(game.state, game.state.inventory.equippedTool);
      if (owned) owned.sharpness = hit ? 100 : Math.min(100, (owned.sharpness || 0) + 25);
      showToast(game.hud, hit ? "Perfect sharpen!" : "A bit off. Blades are better, not perfect.");
      mini.done = true;
      tab = "bench";
      render();
    }
    if (mini.t >= mini.dur) {
      mini.done = true;
      showToast(game.hud, "Too slow. Try again.");
      render();
    }
  }

  function drawMini(host, mini) {
    host.innerHTML = `
      <div class="mini-bar"><i class="mini-green"></i><b style="left:${Math.round(mini.pos * 100)}%"></b></div>
      <p class="fine">Press Space when the mark is in the green. ${Math.max(0, Math.ceil(mini.dur - mini.t))}s</p>
    `;
  }

  return scene;
}
