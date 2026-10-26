/** First-time 6th-grade tips, stored on the save for the almanac. */

export const TIP_TEXT = {
  onethird: "Do not cut more than one third of the blade at once. The grass gets stressed and turns weak.",
  scalp: "If you cut below 1.5 inches, the sun can burn the patch. Keep the lawn near 3 inches.",
  dry: "Dry grass turns brown. Water in the morning, from 5 to 10, for the best soak.",
  fungus: "Too much water at night can grow fungus. Water earlier in the day.",
  weeds: "Weeds move into tall or sick grass. Pull them before they spread.",
  burn: "Too much fertilizer in one week burns the lawn. A little at a time is better.",
  seed: "Dead patches need seed and water for 3 days. Keep the soil damp.",
  hoa: "The HOA checks height each week. Stay near 3 inches to pass.",
  leaves: "Leaves block the sun. Rake them before they sit for 3 days.",
  dull: "Dull blades tear the tips. Sharpen at the shed workbench.",
};

export function unlockTip(state, id) {
  if (!state.almanac) state.almanac = [];
  if (state.almanac.some((t) => t.id === id)) return null;
  const text = TIP_TEXT[id];
  if (!text) return null;
  state.almanac.push({ id, text, day: state.clock.day });
  return text;
}
