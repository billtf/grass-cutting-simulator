import * as input from "../../input.js";
import { advanceClock, formatClock } from "../../clock.js";
import { tickGrowth, countOvergrown, isShed, isCuttable, averageHeight, grassCellCount } from "../../sim/lawn.js";
import { pointsForCut, applyPoints, overgrownPenalty } from "../../sim/scoring.js";
import { movePlayer, tileAt, facingTile } from "../../entities/player.js";
import { findTool, cycleTool, selectSlot, cutSecondsFor, targetHeightFor, nudgeDeck } from "../../entities/tools.js";
import { follow } from "../../render/camera.js";
import { paintDirty, drawAtlas, drawPlayer, drawCutProgress } from "../../render/lawn.js";
import { updateHud, showToast } from "../hud.js";
import { swathTiles, toolCanCutCell, toolBlockedReason, performSwath } from "../../sim/cutting.js";
import { activeCharacter, addXp } from "../../sim/xp.js";
import { createShedScene } from "./shed.js";
import { createSummaryScene, pickTip } from "./summary.js";

export function createLawnScene(game) {
  return {
    transparent: false,
    blocksUpdate: true,
    enter() {
      game.hudEl.classList.add("active");
      updateHud(game.hud, game.state, game.tools);
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
        state.overlay = state.overlay === "height" ? "none" : "height";
        showToast(
          g.hud,
          state.overlay === "height"
            ? "Height map: green good, yellow tall, red overgrown"
            : "Height map off"
        );
      }
      if (input.pressed("debug")) g.toggleDebug();
      if (input.pressed("switchTool")) {
        const id = cycleTool(state.inventory, g.tools, 1);
        showToast(g.hud, findTool(g.tools, id).name, 900);
      }
      for (let n = 1; n <= 9; n++) {
        if (input.pressed(`slot${n}`)) {
          const id = selectSlot(state.inventory, g.tools, n - 1);
          showToast(g.hud, findTool(g.tools, id).name, 900);
        }
      }
      const equipped = findTool(g.tools, state.inventory.equippedTool);
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
      const speed = g.config.player.speed * (tired ? 0.5 : 1);
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
        character.needs.energy = Math.max(0, character.needs.energy - dt * 0.4);
      }

      const idle = !moved && !input.down("use");
      if (input.pressed("fastForward") && idle) {
        state.clock.fastForward = !state.clock.fastForward;
        showToast(g.hud, state.clock.fastForward ? "Time ×8" : "Normal time");
      }
      if (!idle) state.clock.fastForward = false;
      const rate = state.clock.fastForward ? g.config.fastForward : 1;

      handleCut(g, dt);

      const nearby = facingTile(state.player, g.config.tileSize);
      const here = tileAt(state.player, g.config.tileSize);
      if (input.pressed("interact") && (isShed(state.lawn, nearby.x, nearby.y) || nearShed(state, g.config.tileSize))) {
        g.scenes.push(createShedScene(g));
      }

      const stepped = advanceClock(state.clock, dt, state.game.dayLengthMinutes, rate);
      for (const hour of stepped.hourTicks) {
        onHour(g, hour);
      }
      if (stepped.dayRolled) {
        onDayEnd(g);
      }

      follow(g.camera, state.player, state.lawn, g.config.tileSize);
      updateHud(g.hud, state, g.tools);
      if (g.debug.open) g.debug.tick(g, dt);
      void here;
      void moving;
    },
    draw(ctx, g) {
      const state = g.state;
      paintDirty(g.atlas, state.lawn, state.overlay);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "#0d2612";
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      drawAtlas(ctx, g.atlas, g.camera);
      drawCutProgress(ctx, state.player, g.camera, g.config.tileSize);
      drawPlayer(ctx, state.player, g.camera, g.config.tileSize);
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
  const { results } = performSwath(state.lawn, tiles, tool, owned, target, nowHour, {
    minHeight: game.config.lawn.minHeight,
    scalpHeight: game.config.lawn.scalpHeight,
    oneThirdPenalty: state.difficultyRules.oneThirdPenalty,
    oneThirdWarningOnly: state.difficultyRules.oneThirdWarningOnly,
  });
  state.player.cutProgress = 0;
  state.player.cutTarget = null;
  if (!results.length) return;

  const character = activeCharacter(state);
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
    showToast(
      game.hud,
      "One third rule: do not cut more than one third of the blade. The grass is stressed."
    );
  } else if (scalped) {
    showToast(game.hud, "Scalped: that patch is too short. Raise the deck or aim for 3 inches.");
  } else if (gained > 0) {
    showToast(game.hud, `+${gained} from the cut`, 800);
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
  const extras = {
    seasonMult: 1,
    waterMultStub: 1,
    growthSpeed: state.difficultyRules.growthSpeed,
  };
  const grown = tickGrowth(state.lawn, game.config, extras);
  const penalty = overgrownPenalty(grown.overgrownCount, game.config);
  if (penalty > 0) {
    applyPoints(state.economy, -penalty);
    if (state.dayLog) {
      state.dayLog.overgrown -= penalty;
      state.dayLog.points -= penalty;
    }
  }
  if (hour === 12) {
    showToast(game.hud, `Noon · ${formatClock(state.clock)}`);
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
  character.needs.energy = 100;
  character.stats.lawnsMowed += 1;

  const coinsNow = state.economy.coins;
  const coinsEarned = coinsNow - (state.dayLog?.coinsStart || coinsNow);
  const lines = [
    { label: "Clean cuts", value: `+${(state.dayLog?.clean || 0) * 2}` },
    { label: "Rough cuts", value: `+${state.dayLog?.rough || 0}` },
    { label: "Scalped", value: `-${(state.dayLog?.scalped || 0) * 10}` },
    { label: "Overgrown hours", value: `${state.dayLog?.overgrown || 0}` },
    { label: "On-time mow", value: state.dayLog?.ontime ? "+100" : "0" },
    { label: "Healthy lawn day", value: state.dayLog?.healthy ? "+50" : "0" },
    { label: "Coins now", value: `${coinsNow} (${coinsEarned >= 0 ? "+" : ""}${coinsEarned} today)` },
    { label: "Overgrown cells", value: `${over} / ${grass}` },
  ];

  game.save();
  resetDayLog(state);
  game.scenes.push(
    createSummaryScene(game, {
      day: state.clock.day - 1,
      lines,
      tip: pickTip(game.tips, state.clock.day),
      forecast: "Sunny (forecasts arrive in the weather update)",
    })
  );
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
