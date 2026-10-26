# Changelog

## v1.0.1 — Cut UX and pixel art

- Click, tap, or hold Space to cut standing + facing grass in about half a second
- HUD tip when a cut is blocked or the patch is already short; snip particles on a real cut
- New lawns start taller (4.5–6.2 in); old short saves get a one-time grow so the first cut shows
- Pixel-art lawn, house, shed, player, tools, and HUD chrome (no CDN, no build step)

## v1.0.0 — Phase 4 depth and polish

- Lawn size upgrades, top tools through the robot fleet and goats
- Touch joystick on coarse pointers, generated Web Audio beeps
- Volume, colorblind overlays, reduced motion
- Robot auto-mow, overnight goats, first-day tip

## v0.4.0 — Phase 3 characters and neighbor jobs

- Up to 4 characters, traits, needs, skill points, shed mirror
- Job board with 10 neighbors and 7 job types, pay/tips/stars
- Save schemaVersion 2 with v1 migration; export and import in Settings

## v0.3.0 — Phase 2 lawn care and weather

- Moisture, health, weeds, fertilizer, seed, leaves, aeration
- Watering can through timed sprinklers, time-of-day efficiency, water bill
- Seeded daily weather and 14-day seasons; tomorrow on the HUD
- Weekly HOA inspection, warnings, and a coin fine
- H cycles height / moisture / health maps; tips log to the almanac

## v0.2.0 — Phase 1 tools and shop

- Tools 1–8 plus the string trimmer from `tools.json`
- Shed shop, workbench (sharpen / fuel / oil / line), Q and 1–9 switch
- Deck height, fuel tanks, reel-mower stall, edge-only trimmer
- XP, levels, day summary, Easy/Normal/Hard picker

## v0.1.0 — Phase 0 playable lawn

- Static GitHub Pages site (no build step)
- Fixed 30 Hz sim / requestAnimationFrame render loop
- Title, lawn, and pause scenes
- 32×24 lawn grid with hourly growth
- WASD player, scissors cut, height overlay, HUD
- Autosave and reload with schemaVersion 1
