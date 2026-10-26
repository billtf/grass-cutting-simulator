import * as input from "../../input.js";
import { advanceClock, formatClock } from "../../clock.js";
import { tickGrowth, countOvergrown, isShed, isCuttable, averageHeight, grassCellCount, cutCell, KIND, SEASON_MULT } from "../../sim/lawn.js";
import { pointsForCut, applyPoints, overgrownPenalty } from "../../sim/scoring.js";
import { movePlayer, tileAt, facingTile } from "../../entities/player.js";
import { findTool, findAnyTool, cycleTool, selectSlot, cutSecondsFor, targetHeightFor, nudgeDeck } from "../../entities/tools.js";
import { follow } from "../../render/camera.js";
import { paintDirty, drawAtlas, drawPlayer, drawCutProgress } from "../../render/lawn.js";
import { updateHud, showToast } from "../hud.js";
import { swathTiles, toolCanCutCell, toolBlockedReason, performSwath } from "../../sim/cutting.js";
import { activeCharacter, addXp } from "../../sim/xp.js";
import { createShedScene } from "./shed.js";
import { endJob } from "../../sim/away.js";
import { beep } from "../../audio.js";
import { traitValue, hasTraitFlag } from "../../sim/traits.js";
import { createSummaryScene, pickTip } from "./summary.js";
import {
  applyWater,
  applyFertilizer,
  applyWeed,
  applySpray,
  applySeed,
  applyLeaves,
  applyAerate,
  diskTiles,
  tickMoistureHealth,
  tickDailyCare,
  tickSpray,
  addFallLeaves,
  ensureExtras,
} from "../../sim/care.js";
import { weatherStats, weatherForDay, labelWeather } from "../../sim/weather.js";
import { inspectLawn, applyInspection } from "../../sim/hoa.js";
import { unlockTip } from "../../sim/tips.js";
import { seasonForDay } from "../../clock.js";

export function createLawnScene(game) {
  return {
    transparent: false,
    blocksUpdate: true,
    enter() {
      game.hudEl.classList.add("active");
      updateHud(game.hud, game.state, game.allTools, game.weatherTable);
      if (game.state.tutorialStep === 0) {
        showToast(game.hud, "Welcome! WASD to walk. Hold Space to cut. E at the shed. Press H for maps. Skip: just play.", 6000);
        game.state.tutorialStep = 1;
      }
    },
    exit() {
      game.hudEl.classList.remove("active");
    },
    update(dt, g) {
      const state = g.state;
      if (input.pressed("pause")) {
        g.openPause();
        return;
      }
      if (input.pressed("overlay")) {
        const order = ["none", "height", "moisture", "health"];
        const i = order.indexOf(state.overlay);
        state.overlay = order[(i + 1) % order.length];
        const labels = {
          none: "Overlay off",
          height: "Height map: green good, yellow tall, red overgrown",
          moisture: "Moisture map: blue is wet, pale is dry",
          health: "Health map: green strong, orange weak, brown dead",
        };
        showToast(g.hud, labels[state.overlay]);
      }
      if (input.pressed("debug")) g.toggleDebug();
      if (input.pressed("switchTool")) {
        const id = cycleTool(state.inventory, g.allTools, 1);
        showToast(g.hud, findAnyTool(g.tools, g.careTools, id).name, 900);
      }
      for (let n = 1; n <= 9; n++) {
        if (input.pressed(`slot${n}`)) {
          const id = selectSlot(state.inventory, g.allTools, n - 1);
          showToast(g.hud, findAnyTool(g.tools, g.careTools, id).name, 900);
        }
      }
      const equipped = findAnyTool(g.tools, g.careTools, state.inventory.equippedTool);
      if (input.pressed("deckDown")) {
        const h = nudgeDeck(state.inventory, equipped, -1);
        if (equipped.deckHeight) showToast(g.hud, `Deck ${h} inches`, 900);
      }
      if (input.pressed("deckUp")) {
        const h = nudgeDeck(state.inventory, equipped, 1);
        if (equipped.deckHeight) showToast(g.hud, `Deck ${h} inches`, 900);
      }

      const moving = input.anyMoveDown();
      const move = input.moveVector();
      const character = activeCharacter(state);
      const tired = (character.needs.energy || 100) < 20;
      const traitSpeed = traitValue(character, g.traits, "moveSpeedMult", { hour: state.clock.hour }, 1);
      const skillSpeed = 1 + 0.03 * (character.skills?.speed || 0);
      const speed = g.config.player.speed * (tired ? 0.5 : 1) * traitSpeed * skillSpeed;
      const moved = movePlayer(
        state.player,
        state.lawn,
        g.config.tileSize,
        speed,
        g.config.player.radius,
        move,
        dt
      );
      if (moved && character.needs) {
        const drain = traitValue(character, g.traits, "energyDrainMult", { hour: state.clock.hour }, 1);
        const heat = state.game.weatherToday === "heat" && !hasTraitFlag(character, g.traits, "heatImmune");
        character.needs.energy = Math.max(0, character.needs.energy - dt * 0.4 * drain * (heat ? 1.4 : 1));
        character.needs.hydration = Math.max(0, character.needs.hydration - dt * (heat ? 0.8 : 0.25));
        if (character.needs.hydration < 20) {
          character.needs.energy = Math.max(0, character.needs.energy - dt * 0.4);
        }
      }

      const idle = !moved && !input.down("use");
      if (input.pressed("fastForward") && idle) {
        state.clock.fastForward = !state.clock.fastForward;
        showToast(g.hud, state.clock.fastForward ? "Time ×8" : "Normal time");
      }
      if (!idle) state.clock.fastForward = false;
      const rate = state.clock.fastForward ? g.config.fastForward : 1;

      if (equipped.role) handleCare(g, dt, equipped);
      else handleCut(g, dt);

      runPlacedWater(g);

      const nearby = facingTile(state.player, g.config.tileSize);
      const here = tileAt(state.player, g.config.tileSize);
      if (input.pressed("interact")) {
        if (state.away) {
          const report = endJob(g, true);
          if (report) {
            const line = report.stars >= 4 && report.catchphrase ? `${report.catchphrase} ` : "";
            showToast(g.hud, `${line}${report.neighbor.linePay} ${report.stars}★ +${report.pay} coins`, 4200);
          }
        } else if (isShed(state.lawn, nearby.x, nearby.y) || nearShed(state, g.config.tileSize)) {
          g.scenes.push(createShedScene(g));
        } else if (here.y >= 4 && here.y <= 5 && here.x >= 14 && here.x <= 17) {
          character.needs.energy = Math.min(100, character.needs.energy + 15);
          character.needs.mood = Math.min(100, character.needs.mood + 8);
          showToast(g.hud, "You sit on the porch. Energy and mood go up.");
        }
      }

      const stepped = advanceClock(state.clock, dt, state.game.dayLengthMinutes, rate);
      for (const hour of stepped.hourTicks) {
        onHour(g, hour);
      }
      if (stepped.dayRolled) {
        onDayEnd(g);
      }

      follow(g.camera, state.player, state.lawn, g.config.tileSize);
      updateHud(g.hud, state, g.allTools, g.weatherTable);
      if (g.debug.open) g.debug.tick(g, dt);
      void here;
      void moving;
    },
    draw(ctx, g) {
      const state = g.state;
      paintDirty(g.atlas, state.lawn, state.overlay, state.settings.colorblind);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "#0d2612";
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      drawAtlas(ctx, g.atlas, g.camera);
      drawCutProgress(ctx, state.player, g.camera, g.config.tileSize);
      drawPlayer(ctx, state.player, g.camera, g.config.tileSize, activeCharacter(state));
      const mw = 48;
      const mh = 36;
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(ctx.canvas.width - mw - 4, 4, mw + 2, mh + 2);
      ctx.drawImage(g.atlas.canvas, ctx.canvas.width - mw - 3, 5, mw, mh);
    },
  };
}

function nearShed(state, tileSize) {
  const t = tileAt(state.player, tileSize);
  for (let y = t.y - 1; y <= t.y + 1; y++) {
    for (let x = t.x - 1; x <= t.x + 1; x++) {
      if (isShed(state.lawn, x, y)) return true;
    }
  }
  return false;
}

function handleCut(game, dt) {
  const state = game.state;
  const character = activeCharacter(state);
  const tool = findTool(game.tools, state.inventory.equippedTool);
  const owned = state.inventory.tools.find((t) => t.id === tool.id);
  if (!owned) return;
  const origin = tileAt(state.player, game.config.tileSize);
  const tiles = swathTiles(origin, state.player.facing, tool.width || 1);
  const any = tiles.some((t) => toolCanCutCell(state.lawn, tool, t.x, t.y));

  if (!input.down("use") || !any) {
    state.player.cutProgress = 0;
    state.player.cutTarget = null;
    return;
  }

  const key = `${tiles[0].x},${tiles[0].y},${state.player.facing}`;
  if (!state.player.cutTarget || state.player.cutKey !== key) {
    state.player.cutTarget = tiles[0];
    state.player.cutKey = key;
    state.player.cutProgress = 0;
  }

  const blocked = toolBlockedReason(tool, owned, state.lawn, tiles);
  if (blocked) {
    state.player.cutProgress = 0;
    if (!handleCut._blockToast || handleCut._blockToast !== blocked) {
      showToast(game.hud, blocked);
      handleCut._blockToast = blocked;
    }
    return;
  }

  const need = cutSecondsFor(tool, game.config);
  state.player.cutProgress += dt / need;
  if (state.player.cutProgress < 1) return;

  const target = targetHeightFor(tool, state.inventory, game.config);
  const nowHour = (state.clock.day - 1) * 24 + state.clock.hour;
  const qMult =
    traitValue(character, game.traits, "qualityMult", { hour: state.clock.hour }, 1) *
    (1 + 0.03 * (character.skills?.precision || 0)) *
    ((character.needs?.mood || 100) < 30 ? 0.9 : 1);
  const { results } = performSwath(
    state.lawn,
    tiles,
    tool,
    owned,
    target,
    nowHour,
    {
      minHeight: game.config.lawn.minHeight,
      scalpHeight: game.config.lawn.scalpHeight,
      oneThirdPenalty: state.difficultyRules.oneThirdPenalty,
      oneThirdWarningOnly: state.difficultyRules.oneThirdWarningOnly,
    },
    qMult
  );
  state.player.cutProgress = 0;
  state.player.cutTarget = null;
  if (!results.length) return;

  let gained = 0;
  let oneThird = false;
  let scalped = false;
  for (const result of results) {
    const scored = pointsForCut(result, game.config);
    applyPoints(state.economy, scored.points);
    gained += Math.max(0, scored.points);
    logCut(state, scored, result);
    if (result.oneThird) oneThird = true;
    if (result.scalped) scalped = true;
    character.stats.cellsCut += 1;
    character.needs.energy = Math.max(0, character.needs.energy - (tool.energyPerCell || 1));
  }
  const levels = addXp(character, gained);
  if (levels) showToast(game.hud, `Level up! You are level ${character.level}.`);
  else if (oneThird) {
    const tip = unlockTip(state, "onethird");
    showToast(game.hud, tip || "Do not cut more than one third of the blade.");
  } else if (scalped) {
    const tip = unlockTip(state, "scalp");
    showToast(game.hud, tip || "Scalped: that patch is too short. Aim for 3 inches.");
  }   else if (gained > 0) {
    showToast(game.hud, `+${gained} from the cut`, 800);
    beep("snip", state.settings.volume ?? 0.7);
  }
}

function logCut(state, scored, result) {
  const log = state.dayLog;
  if (!log) return;
  log.cuts += 1;
  if (scored.kind === "clean") log.clean += 1;
  if (scored.kind === "rough") log.rough += 1;
  if (result.scalped) log.scalped += 1;
  if (result.oneThird) log.oneThird += 1;
  log.points += scored.points;
}

function onHour(game, hour) {
  const state = game.state;
  ensureExtras(state.lawn);
  const season = state.game.season || seasonForDay(state.clock.day);
  const extras = {
    seasonMult: SEASON_MULT[season] ?? 1,
    growthSpeed: state.difficultyRules.growthSpeed,
  };
  const grown = tickGrowth(state.lawn, game.config, extras);
  const weather = weatherStats(state.game.weatherToday, game.weatherTable);
  const careTick = tickMoistureHealth(state.lawn, weather, game.care, state.rng, season);
  tickSpray(state.lawn);
  if (careTick.browned > 40) {
    const tip = unlockTip(state, "dry");
    if (tip) showToast(game.hud, tip);
  }
  if (careTick.fungus > 20) {
    const tip = unlockTip(state, "fungus");
    if (tip) showToast(game.hud, tip);
  }
  const penalty = overgrownPenalty(grown.overgrownCount, game.config);
  if (penalty > 0) {
    applyPoints(state.economy, -penalty);
    if (state.dayLog) {
      state.dayLog.overgrown -= penalty;
      state.dayLog.points -= penalty;
    }
  }
  if (careTick.dead > 0 && state.dayLog) {
    applyPoints(state.economy, -Math.min(25, careTick.dead));
  }
  if (hour === 12) {
    showToast(game.hud, `Noon · ${formatClock(state.clock)}`);
  }
  runRobotsAndGoats(game, hour);
  if (hour === 6 && state.care?.timed) {
    const hose = game.careTools.find((t) => t.auto);
    if (hose) {
      const tiles = diskTiles(16, 12, hose.radius);
      applyWater(state.lawn, tiles, hose.amount, 6, game.care.waterBillPerCell);
    }
  }
}

function onDayEnd(game) {
  const state = game.state;
  const character = activeCharacter(state);
  const over = countOvergrown(state.lawn, game.config.lawn.overgrownHeight);
  const grass = grassCellCount(state.lawn);
  const tall = countOvergrown(state.lawn, 4.5);
  const avg = averageHeight(state.lawn);
  void avg;

  let bonus = 0;
  if (tall / grass < 0.3 && (state.dayLog?.cuts || 0) > grass * 0.15) {
    bonus += 100;
    if (state.dayLog) state.dayLog.ontime = 100;
  }
  let healthSum = 0;
  for (let i = 0; i < state.lawn.health.length; i++) {
    if (state.lawn.kind[i] === 0) healthSum += state.lawn.health[i];
  }
  const avgHealth = grass ? healthSum / grass : 0;
  if (avgHealth >= 80) {
    bonus += 50;
    if (state.dayLog) state.dayLog.healthy = 50;
  }
  if (bonus) applyPoints(state.economy, bonus);
  addXp(character, Math.max(0, bonus));
  const startE = traitValue(character, game.traits, "startEnergy", {}, 0);
  character.needs.energy = startE || 100;
  character.needs.hydration = 100;
  for (const mate of state.characters) {
    if (mate.id === character.id) continue;
    if (mate.assignment === "water") {
      for (let i = 0; i < state.lawn.moisture.length; i += 7) {
        if (state.lawn.kind[i] === 0) state.lawn.moisture[i] = Math.min(100, state.lawn.moisture[i] + 12);
      }
    }
  }
  character.stats.lawnsMowed += 1;

  const season = seasonForDay(state.clock.day, game.weatherTable.daysPerSeason);
  const daily = tickDailyCare(state.lawn, game.care, season);
  if (season === "fall") addFallLeaves(state.lawn, state.rng);
  state.game.season = season;

  const todayActual = state.game.weatherTomorrowActual || state.game.weatherTomorrow;
  state.game.weatherToday = todayActual;
  const next = weatherForDay(
    state.rng,
    state.clock.day + 1,
    state.difficultyRules.forecastAccuracy,
    game.weatherTable
  );
  state.game.weatherTomorrow = next.forecast;
  state.game.weatherTomorrowActual = next.actual;

  let hoaLine = "Not this week";
  if (state.clock.day % 7 === 1 && state.clock.day > 1) {
    const result = inspectLawn(state.lawn, 2.5, 3.5);
    const judged = applyInspection(state, result, {
      passPoints: game.config.scoring.inspectionPass,
      failPoints: game.config.scoring.inspectionFail,
      fineCoins: game.config.scoring.hoaFine,
    });
    if (judged.kind === "pass") {
      hoaLine = `Pass +${judged.points}`;
      applyPoints(state.economy, 0);
    } else {
      hoaLine = `Fail ${judged.points}${judged.fine ? ` and ${judged.fine} coin fine` : ""}`;
      const tip = unlockTip(state, "hoa");
      if (tip) showToast(game.hud, tip, 4000);
    }
  }

  const whyDry =
    avgHealth < 60
      ? "The lawn browned because it stayed dry. Water in the morning."
      : pickTip(game.tips, state.clock.day);

  const coinsNow = state.economy.coins;
  const coinsEarned = coinsNow - (state.dayLog?.coinsStart || coinsNow);
  const lines = [
    { label: "Clean cuts", value: `+${(state.dayLog?.clean || 0) * 2}` },
    { label: "Rough cuts", value: `+${state.dayLog?.rough || 0}` },
    { label: "Scalped", value: `-${(state.dayLog?.scalped || 0) * 10}` },
    { label: "Overgrown hours", value: `${state.dayLog?.overgrown || 0}` },
    { label: "On-time mow", value: state.dayLog?.ontime ? "+100" : "0" },
    { label: "Healthy lawn day", value: state.dayLog?.healthy ? "+50" : "0" },
    { label: "HOA", value: hoaLine },
    { label: "Revived patches", value: String(daily.revived) },
    { label: "Coins now", value: `${coinsNow} (${coinsEarned >= 0 ? "+" : ""}${coinsEarned} today)` },
    { label: "Overgrown cells", value: `${over} / ${grass}` },
  ];

  game.save();
  resetDayLog(state);
  game.scenes.push(
    createSummaryScene(game, {
      day: state.clock.day - 1,
      lines,
      tip: whyDry,
      forecast: `${labelWeather(state.game.weatherTomorrow, game.weatherTable)} (tomorrow)`,
    })
  );
}

function handleCare(game, dt, tool) {
  const state = game.state;
  ensureExtras(state.lawn);
  const origin = tileAt(state.player, game.config.tileSize);
  const face = facingTile(state.player, game.config.tileSize);
  const center = isCuttable(state.lawn, face.x, face.y) ? face : origin;
  if (!input.down("use")) {
    state.player.cutProgress = 0;
    state.player.cutTarget = null;
    return;
  }
  const key = `${tool.id}:${center.x},${center.y}`;
  if (state.player.cutKey !== key) {
    state.player.cutKey = key;
    state.player.cutProgress = 0;
    state.player.cutTarget = center;
  }
  state.player.cutProgress += dt / 0.8;
  if (state.player.cutProgress < 1) return;
  state.player.cutProgress = 0;
  const tiles = diskTiles(center.x, center.y, tool.radius || 0);
  const character = activeCharacter(state);
  const hour = state.clock.hour;
  let message = "";

  if (tool.place) {
    state.care.sprinklers = state.care.sprinklers || [];
    state.care.sprinklers.push({ x: center.x, y: center.y, radius: tool.radius, amount: tool.amount });
    message = "Sprinkler placed. It waters this patch each hour.";
  } else if (tool.auto) {
    state.care.timed = true;
    message = "Timed sprinklers will run at 6 AM.";
  } else if (tool.role === "water") {
    const result = applyWater(state.lawn, tiles, tool.amount, hour, game.care.waterBillPerCell);
    state.economy.coins = Math.max(0, state.economy.coins - result.bill);
    if (result.full) {
      applyPoints(state.economy, game.config.scoring.morningWater);
      if (state.dayLog) state.dayLog.morning = (state.dayLog.morning || 0) + 1;
    }
    if (result.fungus) {
      const tip = unlockTip(state, "fungus");
      message = tip || "Evening water can grow fungus.";
    } else {
      message = `Watered ${result.count} cells. Bill ${result.bill} coins.`;
    }
  } else if (tool.role === "fertilizer") {
    const result = applyFertilizer(state.lawn, tiles, tool.amount, game.care.fertilizerBurnAt, game.care.fertilizerBurn);
    if (result.burned) {
      const tip = unlockTip(state, "burn");
      message = tip || "Too much fertilizer burned some grass.";
    } else message = `Fed ${result.count} cells.`;
  } else if (tool.role === "weed") {
    const result = applyWeed(state.lawn, tiles, tool.amount);
    applyPoints(state.economy, result.cleared * game.config.scoring.weedCleared);
    if (result.cleared) {
      const tip = unlockTip(state, "weeds");
      message = tip || `Pulled weeds on ${result.cleared} cells. +${result.cleared * 5}`;
    } else message = "No weeds here.";
  } else if (tool.role === "spray") {
    applySpray(state.lawn, tiles);
    message = "Spray needs 24 hours with no rain to work.";
  } else if (tool.role === "seed") {
    const result = applySeed(state.lawn, tiles, game.care.seedDays);
    const tip = result.seeded ? unlockTip(state, "seed") : null;
    message = tip || (result.seeded ? `Seeded ${result.seeded} dead patches.` : "Seed only works on dead brown patches.");
  } else if (tool.role === "leaves") {
    const result = applyLeaves(state.lawn, tiles);
    const tip = result.cleared ? unlockTip(state, "leaves") : null;
    message = tip || (result.cleared ? `Raked ${result.cleared} cells.` : "No leaves here.");
  } else if (tool.role === "aerate") {
    const result = applyAerate(state.lawn, tiles, tool.amount);
    message = `Aerated ${result.count} cells. Water soaks in better for a week.`;
  }

  character.needs.energy = Math.max(0, character.needs.energy - (tool.energy || 0.4));
  if (message) showToast(game.hud, message);
}

function runPlacedWater(game) {
  const state = game.state;
  if (!state.care?.sprinklers?.length) return;
  if (runPlacedWater._hour === Math.floor(state.clock.hour)) return;
  runPlacedWater._hour = Math.floor(state.clock.hour);
  for (const s of state.care.sprinklers) {
    applyWater(state.lawn, diskTiles(s.x, s.y, s.radius), s.amount, state.clock.hour, game.care.waterBillPerCell);
  }
}

export function resetDayLog(state) {
  state.dayLog = {
    cuts: 0,
    clean: 0,
    rough: 0,
    scalped: 0,
    oneThird: 0,
    overgrown: 0,
    points: 0,
    ontime: 0,
    healthy: 0,
    coinsStart: state.economy.coins,
  };
}

function runRobotsAndGoats(game, hour) {
  const state = game.state;
  const robot = state.inventory.tools.find((t) => t.id === "robot_fleet");
  const goat = state.inventory.tools.find((t) => t.id === "goat_crew");
  const target = state.inventory.deckHeight || 3;
  if (robot) {
    const def = game.tools.find((t) => t.id === "robot_fleet");
    let n = 0;
    for (let i = 0; i < state.lawn.heightArr.length && n < 12; i++) {
      if (state.lawn.kind[i] !== KIND.grass) continue;
      if (state.lawn.heightArr[i] <= target + 0.2) continue;
      const x = i % state.lawn.width;
      const y = (i - x) / state.lawn.width;
      cutCell(state.lawn, x, y, target, def.baseQuality, hour, {
        minHeight: game.config.lawn.minHeight,
        scalpHeight: game.config.lawn.scalpHeight,
        oneThirdPenalty: 0,
        oneThirdWarningOnly: true,
      });
      n += 1;
    }
  }
  if (goat && hour === 0) {
    for (let i = 0; i < state.lawn.weed.length; i++) {
      if (state.lawn.weed[i] > 0) state.lawn.weed[i] -= 1;
      if (state.lawn.kind[i] === KIND.grass && state.lawn.heightArr[i] > 3.2) {
        state.lawn.heightArr[i] = Math.max(2.5, state.lawn.heightArr[i] - 0.4);
        state.lawn.dirty[i] = 1;
      }
    }
  }
}

export function emptyDayLog() {
  return {
    cuts: 0,
    clean: 0,
    rough: 0,
    scalped: 0,
    oneThird: 0,
    overgrown: 0,
    points: 0,
    ontime: 0,
    healthy: 0,
    coinsStart: 0,
  };
}
