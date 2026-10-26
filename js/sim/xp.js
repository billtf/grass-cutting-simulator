/** Character XP and shop-tier levels. */

export function xpToNext(level) {
  return 40 + Math.max(0, level - 1) * 35;
}

export function addXp(character, amount) {
  if (!character || amount <= 0) return 0;
  character.xp = (character.xp || 0) + Math.round(amount);
  let gained = 0;
  while (character.xp >= xpToNext(character.level || 1)) {
    character.xp -= xpToNext(character.level || 1);
    character.level = (character.level || 1) + 1;
    character.skillPoints = (character.skillPoints || 0) + 1;
    gained += 1;
  }
  return gained;
}

export function activeCharacter(state) {
  return (
    state.characters.find((c) => c.id === state.activeCharacterId) || state.characters[0]
  );
}
