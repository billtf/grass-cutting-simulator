/** First-time 6th-grade tips, stored on the save for the almanac. */

export const TIP_TEXT = {
  cut: "Keep the lawn near 3 inches. Click Cut, tap the lawn, or hold Space. Do not cut more than one third of the blade at once.",
  brown: "Brown patches are thirsty or sick grass. Equip the watering can (press Q) and water it in the morning.",
  water: "Water in the morning, from 5 to 10, for the best soak. Noon sun wastes water. Water after 8 at night can grow fungus (a plant sickness).",
  weeds: "Those yellow puffs are weeds, not fire. They steal water. Press Q to Hand pull, then Cut to pull them. Pull them as soon as you see them.",
  onethird: "Do not cut more than one third of the blade at once. The grass gets stressed and turns weak.",
  scalp: "If you cut below 1.5 inches, the sun can burn the patch. Keep the lawn near 3 inches.",
  dry: "Dry grass turns brown. Water in the morning, from 5 to 10, for the best soak.",
  fungus: "Too much water at night can grow fungus (a plant sickness). Water earlier in the day.",
  burn: "Too much fertilizer in one week burns the lawn. A little at a time is better.",
  seed: "Dead brown patches need seed and water for 3 days. Keep the soil damp.",
  hoa: "The HOA checks height each week. Stay near 3 inches to pass.",
  leaves: "Leaves block the sun. Rake them before they sit for 3 days.",
  dull: "Dull blades tear the tips. Sharpen at the shed workbench.",
  shed: "Walk to the brown shed and press E. Buy tools there. Esc, then Almanac, shows tips you already unlocked.",
};

export const TIP_TITLE = {
  cut: "How to cut",
  brown: "Brown patches",
  water: "When to water",
  weeds: "Weeds (yellow puffs)",
  onethird: "One third rule",
  scalp: "Too short",
  dry: "Dry grass",
  fungus: "Fungus",
  burn: "Fertilizer burn",
  seed: "Dead patches",
  hoa: "HOA check",
  leaves: "Leaves",
  dull: "Dull blades",
  shed: "The shed",
};

export function unlockTip(state, id) {
  if (!state) return null;
  if (!state.almanac) state.almanac = [];
  if (state.almanac.some((t) => t.id === id)) return null;
  const text = TIP_TEXT[id];
  if (!text) return null;
  state.almanac.push({ id, text, day: state.clock?.day || 1 });
  return text;
}

export function hasTip(state, id) {
  return !!state?.almanac?.some((t) => t.id === id);
}
