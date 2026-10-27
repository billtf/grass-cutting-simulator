/** Skippable first-day guide. Sim state only; HUD draws it. */

import { KIND, indexOf, inBounds, isCuttable } from "./lawn.js";

export const TUTORIAL_DONE = "done";

export const TUTORIAL_STEPS = [
  {
    id: "move",
    title: "Walk around",
    text: "This is your lawn. Use WASD or the arrow keys to walk. Take a few steps, then click Next.",
    hint: "WASD or arrows to walk",
    doneOn: "moved",
    tipId: null,
  },
  {
    id: "cut",
    title: "Cut the grass",
    text: "Tall grass needs a haircut. Walk onto it. Click Cut, tap the lawn, or hold Space. Keep it near 3 inches.",
    hint: "Click Cut or hold Space",
    doneOn: "cut",
    tipId: "cut",
  },
  {
    id: "brown",
    title: "Brown patches",
    text: "Brown patches are thirsty or sick grass. They are not dirt. Press Q until you have the watering can.",
    hint: "Q switches tools",
    doneOn: "waterTool",
    tipId: "brown",
  },
  {
    id: "water",
    title: "When to water",
    text: "Water in the morning, from 5 to 10. Check the clock at the top. Noon sun wastes water. Stand on brown grass and click Cut to pour.",
    hint: "Morning water soaks best",
    doneOn: "watered",
    tipId: "water",
  },
  {
    id: "weeds",
    title: "Yellow puffs are weeds",
    text: "The little yellow puffs are weeds, not fire. They steal water and spread if you wait. Press Q until you have Hand pull.",
    hint: "Q to Hand pull",
    doneOn: "weedTool",
    tipId: "weeds",
  },
  {
    id: "weedhow",
    title: "Pull the weeds",
    text: "Stand on a yellow puff. Click Cut (Hand pull yanks the weed). Pull them as soon as you see them.",
    hint: "Cut pulls weeds with Hand pull",
    doneOn: "weeded",
    tipId: null,
  },
  {
    id: "shed",
    title: "The shed",
    text: "Walk to the brown shed at the top of the yard. Press E to go in. Shop and jobs are there. Esc, then Almanac, re-reads these tips.",
    hint: "E at the shed · Esc for Almanac",
    doneOn: "shed",
    tipId: "shed",
  },
];

export function isTutorialDone(state) {
  return !state || state.tutorialStep === TUTORIAL_DONE;
}

export function tutorialIndex(state) {
  if (isTutorialDone(state)) return TUTORIAL_STEPS.length;
  const n = Number(state.tutorialStep);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, TUTORIAL_STEPS.length);
}

export function currentTutorialStep(state) {
  if (isTutorialDone(state)) return null;
  return TUTORIAL_STEPS[tutorialIndex(state)] || null;
}

export function skipTutorial(state) {
  if (!state) return;
  state.tutorialStep = TUTORIAL_DONE;
}

export function nextTutorialStep(state) {
  if (isTutorialDone(state)) return null;
  const i = tutorialIndex(state) + 1;
  if (i >= TUTORIAL_STEPS.length) {
    state.tutorialStep = TUTORIAL_DONE;
    return null;
  }
  state.tutorialStep = i;
  return TUTORIAL_STEPS[i];
}

/** Advance if the current step is waiting on this action. Returns the new step or null. */
export function noteTutorialAction(state, action) {
  const step = currentTutorialStep(state);
  if (!step) return null;
  if (step.doneOn !== action) return null;
  return nextTutorialStep(state);
}

export function resumeTutorialStep(saved) {
  if (saved?.tutorialStep === TUTORIAL_DONE) return TUTORIAL_DONE;
  if (typeof saved?.tutorialStep === "number") return saved.tutorialStep;
  const day = saved?.game?.day ?? saved?.clock?.day ?? 1;
  return day <= 2 ? 0 : TUTORIAL_DONE;
}

export function cellLooksBrown(lawn, i) {
  if (lawn.kind[i] !== KIND.grass) return false;
  return lawn.health[i] < 40 || lawn.moisture[i] < 20;
}

export function cellHasWeed(lawn, i) {
  return lawn.kind[i] === KIND.grass && (lawn.weed?.[i] || 0) > 0;
}

/** Nearby brown or weed cells the player can see. */
export function nearbyHazards(lawn, origin, radius = 6) {
  const found = { brown: null, weed: null };
  for (let y = origin.y - radius; y <= origin.y + radius; y++) {
    for (let x = origin.x - radius; x <= origin.x + radius; x++) {
      if (!inBounds(lawn, x, y)) continue;
      const i = indexOf(lawn, x, y);
      if (!found.brown && cellLooksBrown(lawn, i)) found.brown = { x, y };
      if (!found.weed && cellHasWeed(lawn, i)) found.weed = { x, y };
      if (found.brown && found.weed) return found;
    }
  }
  return found;
}

/** Place thirsty patches and weeds near spawn so day 1 has something to point at. */
export function seedFirstDayHazards(lawn, origin = { x: 16, y: 7 }) {
  const brown = [
    { x: origin.x - 3, y: origin.y + 1 },
    { x: origin.x - 4, y: origin.y + 1 },
    { x: origin.x - 3, y: origin.y + 2 },
    { x: origin.x - 2, y: origin.y + 2 },
  ];
  const weeds = [
    { x: origin.x + 3, y: origin.y + 1 },
    { x: origin.x + 4, y: origin.y + 1 },
    { x: origin.x + 3, y: origin.y + 2 },
    { x: origin.x + 2, y: origin.y + 2 },
  ];
  let brownCount = 0;
  let weedCount = 0;
  for (const t of brown) {
    if (!isCuttable(lawn, t.x, t.y)) continue;
    const i = indexOf(lawn, t.x, t.y);
    lawn.moisture[i] = 8;
    lawn.health[i] = 26;
    lawn.dirty[i] = 1;
    brownCount += 1;
  }
  for (const t of weeds) {
    if (!isCuttable(lawn, t.x, t.y)) continue;
    const i = indexOf(lawn, t.x, t.y);
    lawn.weed[i] = 2;
    lawn.dirty[i] = 1;
    weedCount += 1;
  }
  lawn.allDirty = true;
  return { brownCount, weedCount };
}
