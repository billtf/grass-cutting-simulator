/** Neighbor jobs: offers, pay, ratings. */

export function jobPay(basePay, quality, onTimeMult, tipRate) {
  const q = Math.max(0, Math.min(1, quality));
  return Math.round(basePay * (0.5 + q) * onTimeMult + basePay * tipRate);
}

export function onTimeMult(hour, windowStart, windowEnd, rushed) {
  const mid = (windowStart + windowEnd) / 2;
  if (hour <= mid) return rushed ? 2.4 : 1.2;
  if (hour <= windowEnd) return 1;
  return 0.5;
}

export function reputation(ratings) {
  if (!ratings.length) return 3;
  const last = ratings.slice(-10);
  return last.reduce((s, n) => s + n, 0) / last.length;
}

export function maxOpenJobs(rep) {
  return rep >= 4 ? 4 : 2;
}

export function generateOffers(rng, jobs, neighbors, unlocked, level, rep, day) {
  const types = jobs.filter((j) => j.unlockLevel <= level);
  if (rep < 2) {
    return types
      .filter((j) => j.id === "quick_trim")
      .slice(0, 2)
      .map((j, i) => makeOffer(rng, j, neighbors[i % neighbors.length], day));
  }
  const pool = neighbors.filter((n) => unlocked.includes(n.id));
  const offers = [];
  const count = 3 + (rep >= 4 ? 1 : 0);
  for (let i = 0; i < count; i++) {
    const job = types[rng.int(0, types.length - 1)];
    const neighbor = pool[rng.int(0, pool.length - 1)] || neighbors[0];
    offers.push(makeOffer(rng, job, neighbor, day, i));
  }
  return offers;
}

function makeOffer(rng, job, neighbor, day, i = 0) {
  const start = 8 + rng.int(0, 4);
  const pay = Math.round(job.basePay * (neighbor.payMult || 1));
  return {
    id: `j${day}-${i}-${job.id}-${neighbor.id}`,
    type: job.id,
    name: job.name,
    neighborId: neighbor.id,
    neighborName: neighbor.name,
    personality: neighbor.personality,
    windowStart: start,
    windowEnd: start + job.hours,
    day,
    basePay: pay,
    tasks: job.tasks.slice(),
    height: job.height,
    size: neighbor.size,
    assignedTo: null,
  };
}

export function starRating(quality, onTime, personality) {
  let stars = Math.round(1 + quality * 4);
  if (onTime < 1) stars -= 1;
  if (personality === "easygoing") stars = Math.max(3, stars);
  if (personality === "picky" && quality < 0.85) stars = Math.min(stars, 3);
  return Math.max(1, Math.min(5, stars));
}

export function emptyJobs() {
  return {
    reputation: 3,
    ratings: [],
    open: [],
    offers: [],
    regulars: [],
    neighborsUnlocked: ["n1", "n2", "n3"],
    lastOfferDay: 0,
  };
}
