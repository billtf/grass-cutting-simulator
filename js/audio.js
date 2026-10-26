/** Tiny Web Audio beeps. No files, no CDN. */

let ctx = null;

function ac(volume) {
  if (volume <= 0) return null;
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function beep(kind, volume = 0.7) {
  const audio = ac(volume);
  if (!audio) return;
  const o = audio.createOscillator();
  const g = audio.createGain();
  const now = audio.currentTime;
  const table = {
    snip: { f: 880, t: 0.06, type: "square" },
    click: { f: 520, t: 0.04, type: "triangle" },
    water: { f: 220, t: 0.12, type: "sine" },
    rain: { f: 140, t: 0.3, type: "sawtooth" },
    win: { f: 660, t: 0.18, type: "triangle" },
  };
  const s = table[kind] || table.click;
  o.type = s.type;
  o.frequency.value = s.f;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.09 * volume, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + s.t);
  o.connect(g);
  g.connect(audio.destination);
  o.start(now);
  o.stop(now + s.t + 0.02);
}
