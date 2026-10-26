/** Tool lookup and player-facing helpers. Numbers come from tools.json. */

export function findTool(tools, id) {
  return tools.find((t) => t.id === id) || tools[0];
}

export function findAnyTool(cutTools, careTools, id) {
  return (
    cutTools.find((t) => t.id === id) ||
    careTools.find((t) => t.id === id) ||
    cutTools[0]
  );
}

export function ownedIds(inventory) {
  return inventory.tools.map((t) => t.id);
}

export function cycleTool(inventory, tools, dir) {
  const owned = ownedIds(inventory);
  if (!owned.length) return inventory.equippedTool;
  const order = tools.map((t) => t.id).filter((id) => owned.includes(id));
  const i = Math.max(0, order.indexOf(inventory.equippedTool));
  const next = order[(i + dir + order.length) % order.length];
  inventory.equippedTool = next;
  return next;
}

export function selectSlot(inventory, tools, slotIndex) {
  const owned = ownedIds(inventory);
  const order = tools.map((t) => t.id).filter((id) => owned.includes(id));
  const id = order[slotIndex];
  if (!id) return inventory.equippedTool;
  inventory.equippedTool = id;
  return id;
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

export function targetHeightFor(tool, inventory, config) {
  if (tool.deckHeight) return inventory.deckHeight ?? tool.deckHeight.current ?? 3;
  if (tool.targetHeight != null) return tool.targetHeight;
  return config.cut.scissorsTarget;
}

export function nudgeDeck(inventory, tool, dir) {
  if (!tool.deckHeight) return inventory.deckHeight;
  const { min, max, step } = tool.deckHeight;
  const cur = inventory.deckHeight ?? tool.deckHeight.current ?? 3;
  const next = Math.max(min, Math.min(max, +(cur + dir * step).toFixed(2)));
  inventory.deckHeight = next;
  return next;
}
