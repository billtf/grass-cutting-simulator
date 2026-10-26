/** Character create / edit helpers. */

export const LOOK_FIELDS = ["body", "skin", "hair", "hairColor", "eyes", "outfit", "hat", "shoes"];

export const LOOK_COUNTS = {
  body: 4,
  skin: 6,
  hair: 8,
  hairColor: 8,
  eyes: 6,
  outfit: 8,
  hat: 6,
  shoes: 6,
};

export const CATCHPHRASES = ["Fresh cut!", "Grass is good.", "On it.", "Nice and even.", "Team lawn!"];

export function defaultLook() {
  return { body: 1, skin: 2, hair: 1, hairColor: 1, eyes: 0, outfit: 2, hat: 0, shoes: 1 };
}

export function createCharacter(id, name = "Player") {
  return {
    id,
    name: String(name).slice(0, 12),
    look: defaultLook(),
    traits: [],
    catchphrase: "Fresh cut!",
    level: 1,
    xp: 0,
    skillPoints: 0,
    skills: { stamina: 0, precision: 0, speed: 0, botany: 0 },
    needs: { energy: 100, hydration: 100, mood: 90 },
    stats: { cellsCut: 0, bestStreak: 0, lawnsMowed: 0 },
    assignment: null,
    lastTraitSwapSeason: null,
  };
}

export function nextCharacterId(list) {
  let n = 1;
  const ids = new Set(list.map((c) => c.id));
  while (ids.has(`c${n}`)) n += 1;
  return `c${n}`;
}

export function duplicateCharacter(src, id) {
  return {
    ...JSON.parse(JSON.stringify(src)),
    id,
    name: `${src.name}`.slice(0, 10) + " 2",
  };
}
