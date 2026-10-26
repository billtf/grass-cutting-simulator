/** Buy tools and supplies. No DOM. */

export function ownedTool(state, id) {
  return state.inventory.tools.find((t) => t.id === id) || null;
}

export function canBuyTool(state, tool, character) {
  if (ownedTool(state, tool.id)) return { ok: false, reason: "You already own this." };
  if ((character.level || 1) < tool.unlockLevel) {
    return { ok: false, reason: `Unlocks at level ${tool.unlockLevel}.` };
  }
  const price = Math.round((tool.cost || 0) * (state.shopPriceMult || 1));
  if ((state.economy.coins || 0) < price) {
    return { ok: false, reason: `Need ${price} coins.` };
  }
  return { ok: true };
}

export function buyTool(state, tool, character) {
  const check = canBuyTool(state, tool, character);
  if (!check.ok) return check;
  const price = Math.round((tool.cost || 0) * (state.shopPriceMult || 1));
  state.economy.coins -= price;
  state.inventory.tools.push(makeOwnedTool(tool));
  return { ok: true };
}

export function makeOwnedTool(tool) {
  return {
    id: tool.id,
    sharpness: 100,
    fuel: tool.needsFuel ? 100 : 0,
    line: tool.kind === "trimmer" ? 100 : 0,
    mowsSinceOil: 0,
  };
}

export function buySupply(state, shop, kind) {
  if (kind === "fuel") {
    if (state.economy.coins < shop.fuelCanCost) return { ok: false, reason: "Need more coins." };
    state.economy.coins -= shop.fuelCanCost;
    state.inventory.supplies.fuel = (state.inventory.supplies.fuel || 0) + shop.fuelCanAmount;
    return { ok: true };
  }
  if (kind === "line") {
    if (state.economy.coins < shop.lineCost) return { ok: false, reason: "Need more coins." };
    state.economy.coins -= shop.lineCost;
    state.inventory.supplies.line = (state.inventory.supplies.line || 0) + 100;
    return { ok: true };
  }
  return { ok: false, reason: "Unknown item." };
}

export function sharpenForCoins(state, owned, cost) {
  if (!owned) return { ok: false, reason: "No tool." };
  if (state.economy.coins < cost) return { ok: false, reason: "Need more coins." };
  state.economy.coins -= cost;
  owned.sharpness = 100;
  return { ok: true };
}

export function changeOil(state, owned, toolDef, cost) {
  if (!owned) return { ok: false, reason: "No tool." };
  if (!toolDef.upkeep?.oilEveryMows) return { ok: false, reason: "This tool does not need oil." };
  if (state.economy.coins < cost) return { ok: false, reason: "Need more coins." };
  state.economy.coins -= cost;
  owned.mowsSinceOil = 0;
  return { ok: true };
}

export function refuelFromCans(state, owned, toolDef) {
  if (!owned || !toolDef.needsFuel) return { ok: false, reason: "This tool has no tank." };
  const have = state.inventory.supplies.fuel || 0;
  if (have <= 0) return { ok: false, reason: "Buy a fuel can first." };
  const room = 100 - (owned.fuel || 0);
  if (room <= 0) return { ok: false, reason: "Tank is full." };
  const used = Math.min(have, room);
  state.inventory.supplies.fuel -= used;
  owned.fuel = (owned.fuel || 0) + used;
  return { ok: true, used };
}

export function refillLine(state, owned, toolDef) {
  if (!owned || toolDef.kind !== "trimmer") return { ok: false, reason: "Not a trimmer." };
  const have = state.inventory.supplies.line || 0;
  if (have <= 0) return { ok: false, reason: "Buy trimmer line first." };
  owned.line = 100;
  state.inventory.supplies.line = Math.max(0, have - 100);
  return { ok: true };
}
