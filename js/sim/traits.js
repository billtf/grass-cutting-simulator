/** Trait modifier engine. Reads traits.json (stat, value, when). */

export function findTrait(traits, id) {
  return traits.find((t) => t.id === id) || null;
}

export function evalWhen(when, ctx) {
  if (!when) return true;
  const hour = ctx.hour ?? 12;
  if (when.includes("hour < 10")) return hour < 10;
  if (when.includes("hour >= 18")) return hour >= 18;
  return true;
}

export function traitValue(character, traits, stat, ctx = {}, fallback = 1) {
  let v = fallback;
  const ids = character?.traits || [];
  for (const id of ids) {
    const def = findTrait(traits, id);
    if (!def) continue;
    for (const mod of def.modifiers || []) {
      if (mod.stat !== stat) continue;
      if (!evalWhen(mod.when, ctx)) continue;
      if (stat.endsWith("Mult") || stat === "carePower" || stat === "tipMult") v *= mod.value;
      else v = mod.value;
    }
  }
  return v;
}

export function hasTraitFlag(character, traits, stat) {
  return traitValue(character, traits, stat, {}, 0) >= 1;
}
