import { createRng, randomSeed } from "./rng.js";
import { SceneManager } from "./scene.js";
import { createClock } from "./clock.js";
import { createLawn, applyLayout, markAllDirty, ensureTallEnoughLawn } from "./sim/lawn.js";
import { seedFirstDayHazards, resumeTutorialStep } from "./sim/tutorial.js";
import { createPlayer } from "./entities/player.js";
import { createCamera, resizeCamera } from "./render/camera.js";
import { createLawnAtlas, rebuildAtlas } from "./render/lawn.js";
import { mountHud } from "./ui/hud.js";
import { createTitleScene } from "./ui/screens/title.js";
import { createLawnScene } from "./ui/screens/lawn.js";
import { makeOwnedTool } from "./sim/shop.js";
import { weatherForDay } from "./sim/weather.js";
import { emptyJobs } from "./sim/jobs.js";
import { createPauseScene } from "./ui/screens/pause.js";
import { createSettingsScene } from "./ui/screens/settings.js";
import {
  writeSave,
  readSave,
  hasSave,
  hydrateLawn,
} from "./save.js";
import { createDebug } from "./debug.js";
import { mountTouch } from "./ui/touch.js";
import { bindPointer, holdVirtual, touchAxis } from "./input.js";
import { createFx } from "./render/fx.js";

export class Game {
  constructor(config, tools, difficulty, shop, tips, care, weather, traits, neighbors, jobTypes, upgrades, els) {
    this.config = config;
    this.tools = tools;
    this.difficultyTable = difficulty;
    this.shop = shop;
    this.tips = tips;
    this.care = care;
    this.weatherTable = weather;
    this.traits = traits;
    this.neighbors = neighbors;
    this.jobTypes = jobTypes;
    this.upgrades = upgrades;
    this.careTools = care.tools || [];
    this.allTools = [...tools, ...(care.tools || [])];
    this.canvas = els.canvas;
    this.ctx = els.canvas.getContext("2d");
    this.hudEl = els.hud;
    this.overlayEl = els.overlay;
    this.appEl = els.app;
    this.scenes = new SceneManager();
    this.camera = createCamera();
    this.atlas = null;
    this.hud = mountHud(this.hudEl);
    this.debug = createDebug();
    this.fx = createFx();
    this.touchEl = null;
    this.state = null;
    this.hidden = false;
    this.lastTime = 0;
    this.acc = 0;
    this.running = false;
  }

  start() {
    this.fitCanvas();
    window.addEventListener("resize", () => this.fitCanvas());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.hidden = true;
        if (this.state) this.save();
      } else {
        this.hidden = false;
        this.lastTime = performance.now();
        this.acc = 0;
      }
    });
    bindPointer(this.canvas);
    this.touchEl = mountTouch(this.appEl, { axis: touchAxis, hold: holdVirtual });
    this.showTitle();
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }

  frame(now) {
    if (!this.running) return;
    const raw = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;
    const step = 1 / this.config.simHz;
    if (!this.hidden) {
      this.acc += raw;
      while (this.acc >= step) {
        this.scenes.update(step, this);
        this.acc -= step;
      }
    }
    this.fitCanvas();
    this.ctx.imageSmoothingEnabled = false;
    this.scenes.draw(this.ctx, this);
    requestAnimationFrame((t) => this.frame(t));
  }

  fitCanvas() {
    const scale = this.config.scale;
    const w = Math.max(160, Math.floor(this.canvas.clientWidth / scale));
    const h = Math.max(120, Math.floor(this.canvas.clientHeight / scale));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    resizeCamera(this.camera, this.canvas, scale);
    this.ctx.imageSmoothingEnabled = false;
  }

  showTitle() {
    this.scenes.clear();
    this.hudEl.classList.remove("active");
    this.scenes.push(createTitleScene(this));
  }

  openPause() {
    if (this.scenes.top()?.id === "pause") return;
    this.scenes.push(createPauseScene(this));
  }

  openSettings() {
    const fromTitle = !this.state || this.scenes.stack.some((s) => s.id === "title");
    this.scenes.push(createSettingsScene(this, { fromTitle }));
  }

  toggleDebug() {
    this.debug.toggle(this);
  }

  startNewGame(difficultyId = "normal") {
    this.state = this.freshState(difficultyId);
    this.afterStateReady();
    this.save();
    this.scenes.clear();
    this.scenes.push(createLawnScene(this));
  }

  continueGame() {
    if (!hasSave(this.config.saveKey)) {
      this.startNewGame("normal");
      return;
    }
    const saved = readSave(this.config.saveKey);
    this.state = this.restoreState(saved);
    this.afterStateReady();
    this.scenes.clear();
    this.scenes.push(createLawnScene(this));
  }

  afterStateReady() {
    const bump = ensureTallEnoughLawn(this.state.lawn, this.config, !!this.state.game.cutVisBoost);
    this.state.game.cutVisBoost = 1;
    if (bump.boosted) this.state.lawn.allDirty = true;
    if (!this.atlas) this.atlas = createLawnAtlas(this.state.lawn, this.config.tileSize);
    else rebuildAtlas(this.atlas, this.state.lawn);
    markAllDirty(this.state.lawn);
    this.fitCanvas();
  }

  freshState(difficultyId) {
    const rules = this.difficultyTable[difficultyId] || this.difficultyTable.normal;
    const seed = randomSeed();
    const rng = createRng(seed);
    const lawn = createLawn(
      this.config.lawn.width,
      this.config.lawn.height,
      rng,
      this.config,
      "front"
    );
    seedFirstDayHazards(lawn, { x: 16, y: 7 });
    const today = weatherForDay(rng, 1, rules.forecastAccuracy, this.weatherTable);
    const tomorrow = weatherForDay(rng, 2, rules.forecastAccuracy, this.weatherTable);
    return {
      schemaVersion: 2,
      createdAt: new Date().toISOString(),
      seed,
      rng,
      difficulty: rules.id,
      difficultyRules: rules,
      clock: createClock(this.config.clock.hoursPerDay, this.config.clock.startHour),
      game: {
        season: today.season,
        weatherToday: today.actual,
        weatherTomorrow: tomorrow.forecast,
        weatherTomorrowActual: tomorrow.actual,
        dayLengthMinutes: rules.dayLengthMinutes,
        zonesOwned: ["front"],
        cutVisBoost: 1,
      },
      economy: {
        coins: rules.startingCoins,
        points: 0,
        streakDays: 0,
        hoaWarnings: 0,
        bonusCoins: 0,
      },
      lawn,
      player: createPlayer(this.config.tileSize, 16, 7),
      overlay: "none",
      activeCharacterId: "c1",
      characters: [
        {
          id: "c1",
          name: "Player",
          look: {
            body: 0,
            skin: 2,
            hair: 1,
            hairColor: 1,
            eyes: 0,
            outfit: 0,
            hat: 0,
            shoes: 0,
          },
          traits: ["speedster"],
          catchphrase: "Fresh cut!",
          level: 1,
          xp: 0,
          skillPoints: 0,
          skills: { stamina: 0, precision: 0, speed: 0, botany: 0 },
          needs: { energy: 100, hydration: 100, mood: 100 },
          stats: { cellsCut: 0, bestStreak: 0, lawnsMowed: 0 },
          assignment: null,
        },
      ],
      inventory: {
        tools: [
          makeOwnedTool(this.tools.find((t) => t.id === "scissors") || { id: "scissors", needsFuel: false }),
          makeOwnedTool({ id: "watering_can" }),
          makeOwnedTool({ id: "hand_pull" }),
        ],
        equippedTool: "scissors",
        deckHeight: 3,
        supplies: { seed: 3, fertilizer: 1, weedSpray: 1, fuel: 0, line: 0 },
      },
      almanac: [],
      care: { sprinklers: [], timed: false },
      jobs: emptyJobs(),
      tutorialStep: 0,
      settings: { volume: 0.7, colorblind: false, reducedMotion: false },
      dayLog: {
        cuts: 0,
        clean: 0,
        rough: 0,
        scalped: 0,
        oneThird: 0,
        overgrown: 0,
        points: 0,
        ontime: 0,
        healthy: 0,
        coinsStart: rules.startingCoins,
      },
    };
  }

  restoreState(saved) {
    const rules = this.difficultyTable[saved.difficulty] || this.difficultyTable.normal;
    const rng = createRng(saved.rngState || saved.seed || 1);
    const lawn = hydrateLawn(saved.lawn, applyLayout);
    const clock = createClock(this.config.clock.hoursPerDay, saved.game.hour);
    clock.day = saved.game.day;
    clock.hour = saved.game.hour;
    return {
      schemaVersion: saved.schemaVersion || 1,
      createdAt: saved.createdAt,
      seed: saved.seed,
      rng,
      difficulty: saved.difficulty || "normal",
      difficultyRules: rules,
      clock,
      game: {
        season: saved.game.season || "spring",
        weatherToday: saved.game.weatherToday || "sunny",
        weatherTomorrow: saved.game.weatherTomorrow || "sunny",
        weatherTomorrowActual: saved.game.weatherTomorrowActual || saved.game.weatherTomorrow || "sunny",
        dayLengthMinutes: saved.game.dayLengthMinutes || rules.dayLengthMinutes,
        zonesOwned: saved.lawn.zonesOwned || ["front"],
        cutVisBoost: saved.game.cutVisBoost || 0,
      },
      economy: {
        coins: saved.economy.coins ?? rules.startingCoins,
        points: saved.economy.points ?? 0,
        streakDays: saved.economy.streakDays ?? 0,
        hoaWarnings: saved.economy.hoaWarnings ?? 0,
        bonusCoins: saved.economy.bonusCoins ?? 0,
      },
      lawn,
      player: {
        x: saved.player?.x ?? 16 * this.config.tileSize,
        y: saved.player?.y ?? 12 * this.config.tileSize,
        vx: 0,
        vy: 0,
        facing: saved.player?.facing || "down",
        cutProgress: 0,
        cutTarget: null,
      },
      overlay: saved.overlay || "none",
      activeCharacterId: saved.activeCharacterId || "c1",
      characters: saved.characters || this.freshState(rules.id).characters,
      inventory: normalizeInventory(saved.inventory, this.tools),
      settings: saved.settings || { volume: 0.7, colorblind: false, reducedMotion: false },
      almanac: saved.almanac || [],
      care: saved.care || { sprinklers: [], timed: false },
      jobs: saved.jobs || emptyJobs(),
      tutorialStep: resumeTutorialStep(saved),
      dayLog: saved.dayLog || {
        cuts: 0,
        clean: 0,
        rough: 0,
        scalped: 0,
        oneThird: 0,
        overgrown: 0,
        points: 0,
        ontime: 0,
        healthy: 0,
        coinsStart: saved.economy?.coins ?? 0,
      },
    };
  }

  setDifficulty(id) {
    if (!this.state) return;
    const rules = this.difficultyTable[id] || this.difficultyTable.normal;
    this.state.difficulty = rules.id;
    this.state.difficultyRules = rules;
    this.state.game.dayLengthMinutes = rules.dayLengthMinutes;
    this.save();
  }

  save() {
    if (!this.state) return 0;
    return writeSave(this.config.saveKey, this.state);
  }
}

function normalizeInventory(inv, tools) {
  const base = inv || {};
  const list = (base.tools || [{ id: "scissors", sharpness: 100 }]).map((t) => ({
    id: t.id,
    sharpness: t.sharpness ?? 100,
    fuel: t.fuel ?? 0,
    line: t.line ?? 0,
    mowsSinceOil: t.mowsSinceOil ?? 0,
  }));
  if (!list.some((t) => t.id === "scissors")) {
    const scissors = tools.find((t) => t.id === "scissors");
    list.unshift(makeOwnedTool(scissors || { id: "scissors" }));
  }
  return {
    tools: list,
    equippedTool: base.equippedTool || "scissors",
    deckHeight: base.deckHeight ?? 3,
    supplies: {
      seed: base.supplies?.seed ?? 0,
      fertilizer: base.supplies?.fertilizer ?? 0,
      weedSpray: base.supplies?.weedSpray ?? 0,
      fuel: base.supplies?.fuel ?? 0,
      line: base.supplies?.line ?? 0,
    },
  };
}

