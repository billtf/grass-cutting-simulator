import { seasonForDay } from "../clock.js";

export function rollFromWeights(rng, weights) {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let pick = rng.next() * total;
  for (const [id, w] of entries) {
    pick -= w;
    if (pick <= 0) return id;
  }
  return entries[0][0];
}

export function forecastPair(rng, season, accuracy, table) {
  const weights = table.weights[season] || table.weights.spring;
  const actual = rollFromWeights(rng, weights);
  if (rng.next() <= accuracy) return { actual, forecast: actual };
  let other = actual;
  for (let i = 0; i < 8 && other === actual; i++) {
    other = rollFromWeights(rng, weights);
  }
  return { actual, forecast: other };
}

export function weatherForDay(rng, day, accuracy, table) {
  const season = seasonForDay(day, table.daysPerSeason);
  return { season, ...forecastPair(rng, season, accuracy, table) };
}

export function weatherStats(id, table) {
  return table.types[id] || table.types.sunny;
}

export function labelWeather(id, table) {
  return (table.types[id] && table.types[id].label) || "Sunny";
}
