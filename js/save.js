/** localStorage save/load with schemaVersion and typed-array packing. */

function bytesToBase64(bytes) {
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function encodeTyped(arr) {
  const bytes = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
  return {
    t: arr.constructor.name,
    b: bytesToBase64(bytes),
  };
}

const TYPED = {
  Float32Array,
  Uint8Array,
  Uint16Array,
  Uint32Array,
};

function decodeTyped(packed) {
  const Ctor = TYPED[packed.t];
  if (!Ctor) throw new Error(`Unknown typed array ${packed.t}`);
  const bytes = base64ToBytes(packed.b);
  const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return new Ctor(copy);
}

export function serializeState(state) {
  const lawn = state.lawn;
  return {
    schemaVersion: state.schemaVersion,
    createdAt: state.createdAt,
    seed: state.seed,
    rngState: state.rng.getSeed(),
    difficulty: state.difficulty,
    game: {
      day: state.clock.day,
      hour: state.clock.hour,
      season: state.game.season,
      weatherToday: state.game.weatherToday,
      weatherTomorrow: state.game.weatherTomorrow,
      dayLengthMinutes: state.game.dayLengthMinutes,
    },
    economy: { ...state.economy },
    lawn: {
      width: lawn.width,
      height: lawn.height,
      layout: lawn.layout,
      zonesOwned: state.game.zonesOwned,
      cells: {
        height: encodeTyped(lawn.heightArr),
        moisture: encodeTyped(lawn.moisture),
        health: encodeTyped(lawn.health),
        weed: encodeTyped(lawn.weed),
        fertilizer: encodeTyped(lawn.fertilizer),
        lastCut: encodeTyped(lawn.lastCut),
      },
    },
    player: {
      x: state.player.x,
      y: state.player.y,
      facing: state.player.facing,
    },
    activeCharacterId: state.activeCharacterId,
    characters: state.characters,
    inventory: state.inventory,
    settings: state.settings,
    overlay: state.overlay,
    dayLog: state.dayLog || null,
  };
}

export function hydrateLawn(savedLawn, applyLayout) {
  const lawn = {
    width: savedLawn.width,
    height: savedLawn.height,
    layout: savedLawn.layout || "front",
    heightArr: decodeTyped(savedLawn.cells.height),
    moisture: decodeTyped(savedLawn.cells.moisture),
    health: decodeTyped(savedLawn.cells.health),
    weed: decodeTyped(savedLawn.cells.weed),
    fertilizer: decodeTyped(savedLawn.cells.fertilizer),
    lastCut: decodeTyped(savedLawn.cells.lastCut),
    kind: new Uint8Array(savedLawn.width * savedLawn.height),
    dirty: new Uint8Array(savedLawn.width * savedLawn.height),
    allDirty: true,
  };
  lawn.dirty.fill(1);
  applyLayout(lawn);
  return lawn;
}

const MIGRATIONS = {
  // Future: 1 -> 2 lives here.
};

export function migrate(save) {
  let data = save;
  let v = data.schemaVersion || 1;
  while (MIGRATIONS[v]) {
    data = MIGRATIONS[v](data);
    v = data.schemaVersion;
  }
  return data;
}

export function writeSave(key, state) {
  const json = JSON.stringify(serializeState(state));
  localStorage.setItem(key, json);
  return json.length;
}

export function readSave(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return migrate(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function hasSave(key) {
  return !!localStorage.getItem(key);
}

export function clearSave(key) {
  localStorage.removeItem(key);
}

export function exportSaveJson(state) {
  return JSON.stringify(serializeState(state), null, 2);
}

export function parseImportedSave(text) {
  const data = migrate(JSON.parse(text));
  if (!data || !data.lawn || !data.game) throw new Error("Not a Grass Friend save");
  return data;
}
