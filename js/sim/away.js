/** Travel to a neighbor lawn and come home. */

import { createLawn, grassCellCount, averageHeight, countOvergrown } from "./lawn.js";
import { createPlayer } from "../entities/player.js";
import { rebuildAtlas } from "../render/lawn.js";
import { jobPay, onTimeMult, starRating } from "./jobs.js";
import { traitValue } from "./traits.js";
import { activeCharacter } from "./xp.js";
import { applyPoints } from "./scoring.js";
import { markAllDirty } from "./lawn.js";

export function beginJob(game, job) {
  const neighbor = game.neighbors.find((n) => n.id === job.neighborId) || game.neighbors[0];
  const [w, h] = job.size || neighbor.size || [20, 14];
  const lawn = createLawn(w, h, game.state.rng, {
    ...game.config,
    lawn: {
      ...game.config.lawn,
      width: w,
      height: h,
      startHeightMin: job.height?.[0] || 3,
      startHeightMax: job.height?.[1] || 5,
    },
  });
  game.state.away = {
    job,
    neighborId: neighbor.id,
    homeLawn: game.state.lawn,
    homePlayer: game.state.player,
  };
  game.state.lawn = lawn;
  game.state.player = createPlayer(game.config.tileSize, Math.floor(w / 2), Math.floor(h / 2));
  if (game.atlas) rebuildAtlas(game.atlas, lawn);
  markAllDirty(lawn);
  return neighbor;
}

export function endJob(game, inspect) {
  const away = game.state.away;
  if (!away) return;
  const job = away.job;
  const neighbor = game.neighbors.find((n) => n.id === away.neighborId) || game.neighbors[0];
  const lawn = game.state.lawn;
  const character = activeCharacter(game.state);
  const avg = averageHeight(lawn);
  const over = countOvergrown(lawn, 4.5);
  const grass = grassCellCount(lawn);
  const quality = Math.max(0, Math.min(1, 1 - over / Math.max(1, grass) - Math.abs(avg - 3) / 6));
  const ot = onTimeMult(
    game.state.clock.hour,
    job.windowStart,
    job.windowEnd,
    neighbor.personality === "rushed"
  );
  const tipRate = (neighbor.tip || 0) * traitValue(character, game.traits, "tipMult", {}, 1);
  const pay = inspect ? jobPay(job.basePay, quality, ot, tipRate) : Math.round(job.basePay * 0.35);
  const stars = inspect ? starRating(quality, ot, neighbor.personality) : 2;
  game.state.economy.coins += pay;
  game.state.economy.bonusCoins = (game.state.economy.bonusCoins || 0) + pay;
  game.state.jobs.ratings.push(stars);
  const last = game.state.jobs.ratings.slice(-10);
  game.state.jobs.reputation = last.reduce((s, n) => s + n, 0) / last.length;
  game.state.jobs.open = game.state.jobs.open.filter((j) => j.id !== job.id);
  if (job.type === "weekly_regular") {
    const rec = game.state.jobs.regulars.find((r) => r.neighborId === job.neighborId);
    if (rec) rec.streak += 1;
    else game.state.jobs.regulars.push({ neighborId: job.neighborId, dayOfWeek: game.state.clock.day % 7, streak: 1 });
  }
  if (stars >= 4 && !game.state.jobs.neighborsUnlocked.includes(neighbor.id)) {
    game.state.jobs.neighborsUnlocked.push(neighbor.id);
  }
  applyPoints(game.state.economy, Math.round(quality * 20));
  game.state.lawn = away.homeLawn;
  game.state.player = away.homePlayer;
  game.state.away = null;
  if (game.atlas) rebuildAtlas(game.atlas, game.state.lawn);
  markAllDirty(game.state.lawn);
  game.save();
  return { neighbor, pay, stars, quality, catchphrase: character.catchphrase };
}
