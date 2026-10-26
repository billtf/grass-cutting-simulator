/** Mulberry32 seeded RNG. One seed per save so bugs replay the same way. */

export function createRng(seed) {
  let s = (seed >>> 0) || 1;

  function next() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    getSeed() {
      return s >>> 0;
    },
    next,
    range(min, max) {
      return min + next() * (max - min);
    },
    int(min, maxInclusive) {
      return Math.floor(min + next() * (maxInclusive - min + 1));
    },
    chance(p) {
      return next() < p;
    },
  };
}

export function randomSeed() {
  return (Math.floor(Math.random() * 0xffffffff) || 1) >>> 0;
}
