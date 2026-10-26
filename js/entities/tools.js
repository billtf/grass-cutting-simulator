/** Tool definitions and cut quality. Numbers come from tools.json. */

export function findTool(tools, id) {
  return tools.find((t) => t.id === id) || tools[0];
}

export function effectiveQuality(tool, sharpness) {
  const base = tool.baseQuality ?? 0.7;
  const sharp = (sharpness ?? 100) / 100;
  return Math.max(0, Math.min(1, base * (0.4 + 0.6 * sharp)));
}

export function cutSecondsFor(tool, config) {
  if (tool.cutSeconds != null) return tool.cutSeconds;
  return config.cut.scissorsSeconds;
}

export function targetHeightFor(tool, config) {
  if (tool.targetHeight != null) return tool.targetHeight;
  if (tool.deckHeight && tool.deckHeight.current != null) return tool.deckHeight.current;
  return config.cut.scissorsTarget;
}
