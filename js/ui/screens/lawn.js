import * as input from "../../input.js";
import { advanceClock, formatClock } from "../../clock.js";
import { tickGrowth, cutCell, countOvergrown, isShed, isCuttable } from "../../sim/lawn.js";
import { pointsForCut, applyPoints, overgrownPenalty } from "../../sim/scoring.js";
import { movePlayer, tileAt, facingTile } from "../../entities/player.js";
import { findTool, effectiveQuality, cutSecondsFor, targetHeightFor } from "../../entities/tools.js";
import { follow } from "../../render/camera.js";
import { paintDirty, drawAtlas, drawPlayer, drawCutProgress } from "../../render/lawn.js";
import { updateHud, showToast } from "../hud.js";

export function createLawnScene(game) {
  return {
    transparent: false,
    blocksUpdate: true,
    enter() {
      game.hudEl.classList.add("active");
      updateHud(game.hud, game.state);
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

      const moving = input.anyMoveDown();
      const move = input.moveVector();
      const moved = movePlayer(
        state.player,
        state.lawn,
        g.config.tileSize,
        g.config.player.speed,
        g.config.player.radius,
        move,
        dt
      );

      const idle = !moved && !input.down("use");
      if (input.pressed("fastForward") && idle) {
        state.clock.fastForward = !state.clock.fastForward;
        showToast(g.hud, state.clock.fastForward ? "Time ×8" : "Normal time");
      }
      if (!idle) state.clock.fastForward = false;
      const rate = state.clock.fastForward ? g.config.fastForward : 1;

      handleCut(g, dt);

      const nearby = facingTile(state.player, g.config.tileSize);
      if (input.pressed("interact") && isShed(state.lawn, nearby.x, nearby.y)) {
        showToast(g.hud, "The shed shop opens in the next update.");
      }

      const stepped = advanceClock(state.clock, dt, state.game.dayLengthMinutes, rate);
      for (const hour of stepped.hourTicks) {
        onHour(g, hour);
      }
      if (stepped.dayRolled) {
        onDayEnd(g);
      }

      follow(g.camera, state.player, state.lawn, g.config.tileSize);
      updateHud(g.hud, state);
      if (g.debug.open) g.debug.tick(g, dt);
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

function handleCut(game, dt) {
  const state = game.state;
  const tool = findTool(game.tools, state.inventory.equippedTool);
  const owned = state.inventory.tools.find((t) => t.id === tool.id) || { sharpness: 100 };
  const tile = facingOrStandingCutTile(state, game.config.tileSize);

  if (!input.down("use") || !tile || !isCuttable(state.lawn, tile.x, tile.y)) {
    state.player.cutProgress = 0;
    state.player.cutTarget = null;
    return;
  }

  const same =
    state.player.cutTarget &&
    state.player.cutTarget.x === tile.x &&
    state.player.cutTarget.y === tile.y;
  if (!same) {
    state.player.cutTarget = tile;
    state.player.cutProgress = 0;
  }

  const need = cutSecondsFor(tool, game.config);
  state.player.cutProgress += dt / need;
  if (state.player.cutProgress < 1) return;

  const quality = effectiveQuality(tool, owned.sharpness);
  const target = targetHeightFor(tool, game.config);
  const nowHour = (state.clock.day - 1) * 24 + state.clock.hour;
  const result = cutCell(state.lawn, tile.x, tile.y, target, quality, nowHour, {
    minHeight: game.config.lawn.minHeight,
    scalpHeight: game.config.lawn.scalpHeight,
    oneThirdPenalty: state.difficultyRules.oneThirdPenalty,
    oneThirdWarningOnly: state.difficultyRules.oneThirdWarningOnly,
  });
  state.player.cutProgress = 0;
  state.player.cutTarget = null;
  if (!result) return;

  const scored = pointsForCut(result, game.config);
  applyPoints(state.economy, scored.points);
  const character = state.characters[0];
  if (character) character.stats.cellsCut += 1;

  if (result.oneThird) {
    showToast(
      game.hud,
      "One third rule: do not cut more than one third of the blade. The grass is stressed."
    );
  } else if (result.scalped) {
    showToast(game.hud, "Scalped: that patch is too short. Aim for about 3 inches.");
  } else if (scored.kind === "clean") {
    showToast(game.hud, "+2 clean cut", 900);
  } else if (scored.kind === "rough") {
    showToast(game.hud, "+1 cut", 800);
  }
}

function facingOrStandingCutTile(state, tileSize) {
  const face = facingTile(state.player, tileSize);
  if (isCuttable(state.lawn, face.x, face.y)) return face;
  const here = tileAt(state.player, tileSize);
  if (isCuttable(state.lawn, here.x, here.y)) return here;
  return null;
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
  if (penalty > 0) applyPoints(state.economy, -penalty);
  if (hour === 12) {
    showToast(game.hud, `Noon · ${formatClock(state.clock)}`);
  }
}

function onDayEnd(game) {
  game.save();
  const over = countOvergrown(game.state.lawn, game.config.lawn.overgrownHeight);
  const cells = game.state.lawn.width * game.state.lawn.height;
  showToast(
    game.hud,
    `A new day. ${over} overgrown cells out of ${cells}. Progress saved.`
  );
}
