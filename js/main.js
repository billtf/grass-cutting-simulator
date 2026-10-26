import { bindInput, beginFrame, endFrame } from "./input.js";
import { Game } from "./game.js";

async function loadJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  return res.json();
}

async function boot() {
  const dataUrl = (name) => new URL(`./data/${name}`, import.meta.url);
  const [config, tools, difficulty, shop, tips, care, weather, traits, neighbors, jobTypes, upgrades] = await Promise.all([
    loadJson(dataUrl("config.json")),
    loadJson(dataUrl("tools.json")),
    loadJson(dataUrl("difficulty.json")),
    loadJson(dataUrl("shop.json")),
    loadJson(dataUrl("tips.json")),
    loadJson(dataUrl("care.json")),
    loadJson(dataUrl("weather.json")),
    loadJson(dataUrl("traits.json")),
    loadJson(dataUrl("neighbors.json")),
    loadJson(dataUrl("jobs.json")),
    loadJson(dataUrl("upgrades.json")),
  ]);

  bindInput();

  const game = new Game(config, tools, difficulty, shop, tips, care, weather, traits, neighbors, jobTypes, upgrades, {
    canvas: document.getElementById("game"),
    hud: document.getElementById("hud"),
    overlay: document.getElementById("overlay"),
    app: document.getElementById("app"),
  });

  const originalUpdate = game.scenes.update.bind(game.scenes);
  game.scenes.update = (dt, g) => {
    beginFrame();
    originalUpdate(dt, g);
    endFrame();
  };

  game.start();
}

boot().catch((err) => {
  const overlay = document.getElementById("overlay");
  overlay.classList.add("active");
  overlay.innerHTML = `<div class="panel"><h2>Could not start</h2><p>${err.message}</p><p class="fine">Open this folder over http (python3 -m http.server 8000), not as a file.</p></div>`;
  console.error(err);
});
