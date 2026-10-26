# Grass Friend

A top-down 2D lawn care sim for middle schoolers. Keep a living lawn healthy, cut it on schedule, and work your way up from scissors to a robot mower fleet.

This repo is named `grass-cutting-simulator`. The game name on screen is **Grass Friend**.

**Play (GitHub Pages):** https://billtf.github.io/grass-cutting-simulator/

No install, no login, no server. It is meant to run in Chrome on a school Chromebook. Touch controls appear on touchscreens.

## Open locally

ES modules need `http://`, not `file://`.

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000/

## Controls

| Action | Key |
| --- | --- |
| Move | WASD or arrow keys |
| Cut (hold) | Space |
| Open shed | E (stand next to the brown shed) |
| Sit on the porch | E on the path in front of the house |
| Switch tool | Q or 1–9 |
| Deck height | Z / X (mowers) |
| Overlays (height / moisture / health) | H |
| Fast forward (when standing still) | F |
| Pause | Esc or P |
| Debug panel | Backtick (`) |

## Project layout

```
index.html          game shell
css/style.css
js/main.js          boot and loop
js/sim/             rules only — no canvas, no DOM
js/render/          drawing only — does not change game state
js/data/*.json      tuning numbers
tests/index.html    sim smoke tests (open the same way as the game)
```

## Deploy

GitHub Pages: **Settings → Pages → Deploy from a branch → `main` → folder `/` (root).**

A push to `main` is live in about a minute. Hard-refresh the Pages URL after a release.
