# Grass Friend Implementation Plan

Oct 26, 2026 · @bc

## Plan at a glance

Grass Friend ships in 5 phases over 16 weeks (Nov 2, 2026 to Feb 20, 2027), about 128 hours of build time at 8 hours a week. Every phase ends with a playable build on GitHub Pages tested on the target Chromebook.

| Phase | Weeks | Hours | Playable result |
| --- | --- | --- | --- |
| 0 Playable lawn | 2 | 16 | Grass grows, scissors cut it, saves work |
| 1 Tools and shop | 3 | 24 | Earn coins, buy tools up to the gas mower |
| 2 Lawn care and weather | 3 | 24 | Water, weeds, seasons, HOA inspections |
| 3 Characters and neighbor jobs | 4 | 32 | Custom characters, job board, reputation |
| 4 Depth and polish | 4 | 32 | Lawn upgrades, top tools, crew mode, touch, sound |

**Approach**

- Build the simulation first and keep it separate from drawing, so rules can be tested without a screen.
- All tuning numbers (tools, traits, jobs, upgrades, difficulty) live in JSON data files, so balancing is an edit, not a code change.
- Placeholder art (colored squares) until Phase 4; gameplay first.
- Pace assumption: 8 hours a week. Using Claude Code for the coding tasks can roughly halve the hours; the timeline stays the same so weekly playtesting with a middle school player sets the rhythm.

## Timeline

&#91;embedded content: phase timeline · 5 phases, 16 weeks\]

Phase 3 runs 4 weeks to absorb the holiday break; if a phase slips, Phase 4 polish is the buffer, not the core systems.

## Repo setup and dev workflow

One public repo, billtf/grass-friend, served from the main branch by GitHub Pages at billtf.github.io/grass-friend; no build step, so a pushed file is live in about a minute.

**Setup (once)**

1. Create the repo with a README, MIT license, and .gitignore.
2. Settings, Pages: deploy from branch main, folder root.
3. Add the folder skeleton from the spec (index.html, css, js, assets) with an index.html that shows "Grass Friend" on a green canvas.
4. Open the Pages URL on the Chromebook and confirm the school filter allows it.
5. Add a dev server for local work: `python3 -m http.server 8000` (ES modules need http, not file://).

**Branches and versions**

| Item | Rule |
| --- | --- |
| main | Always playable; this is what Pages serves |
| Feature branches | `p1-shop`, `p2-watering`, merged by pull request when playable |
| Version tags | `v0.1` end of Phase 0, `v0.2` Phase 1, through `v1.0` at Phase 4 |
| Save schema | Bump `schemaVersion` and add a migration whenever the save shape changes |
| Changelog | One line per merge in CHANGELOG.md, shown in Settings as "What's new" |

**Code conventions**

- Sim modules never touch the canvas or DOM; render modules never change game state.
- One `config` object loaded from `/js/data/*.json` at boot; no magic numbers in code.
- Time is in game hours (float) everywhere; only the clock module converts to real seconds.
- A seeded random number generator (one seed per save) so bugs replay the same way.
- Debug panel behind the backtick key: add coins, skip hours, set weather, show FPS.

## Module architecture

&#91;embedded content: module architecture · sim, render, data, save\]

The sim modules hold all game state and rules and load their numbers from the data files; render only reads that state, and save writes it out and reads it back. Build order follows the arrows: loop and scenes, then sim, then render, then save.

## Phase 0: playable lawn (weeks 1 to 2, 16 h)

Goal: walk around a lawn that grows, cut it with scissors, close the tab, come back, and find it where you left it. Tag `v0.1`.

- [ ] **P0.1 Repo and Pages setup (1 h).** Steps in Repo setup above; green canvas live on the Chromebook.
- [ ] **P0.2 Boot and game loop (2 h).** `main.js` loads config JSON, runs a fixed 30 Hz sim tick and a requestAnimationFrame render; pauses when the tab is hidden.
- [ ] **P0.3 Scene manager (1 h).** Push and pop scenes (title, lawn, pause) with enter, exit, update, draw hooks.
- [ ] **P0.4 Game clock (1 h).** In game hour counter, 6 minute day, day rollover event, fast forward.
- [ ] **P0.5 Lawn grid (2 h).** `lawn.js` with typed arrays for height, moisture, health, weed, fertilizer, lastCut; 32 x 24 start; random 2.5 to 4 in heights.
- [ ] **P0.6 Growth tick (2 h).** Growth formula from the spec with season and water multipliers stubbed at 1.0; runs each in game hour.
- [ ] **P0.7 Lawn renderer (2 h).** Offscreen canvas of cells colored by height and health; redraw only changed cells; 3x pixel scale.
- [ ] **P0.8 Player movement (1.5 h).** WASD and arrows, collision with lawn edges, simple 16 px sprite square.
- [ ] **P0.9 Scissors cutting (1.5 h).** Hold Space to cut the facing cell to 3 in over 2 s; apply the one third rule check.
- [ ] **P0.10 Basic HUD and points (1 h).** Clock, day, points; +2 per clean cut, penalties for overgrown cells.
- [ ] **P0.11 Height overlay (0.5 h).** H toggles green, yellow, red height map.
- [ ] **P0.12 Save and load (0.5 h).** Autosave at day end and on tab hide; load on boot; base64 typed arrays; `schemaVersion: 1`.

**Done when:** grass visibly grows over 2 in game days, cutting changes cells, 60 fps on the Chromebook, and a reload restores the exact lawn.

## Phase 1: tools and shop (weeks 3 to 5, 24 h)

Goal: a new player earns coins and climbs from scissors to the gas push mower in about 2 hours of play. Tag `v0.2`.

- [ ] **P1.1 Tool data (1 h).** `tools.json` with tiers 1 to 8 and the trimmer, matching the spec table.
- [ ] **P1.2 Tool system (3 h).** Equip, switch (Q, 1 to 9), cut width, speed, energy cost, quality roll per cell.
- [ ] **P1.3 Sharpness (2 h).** Sharpness drops per cell; quality scales with it; dull cuts tear (health minus 5, brown for a day).
- [ ] **P1.4 Deck height (2 h).** Z and X set 1.5 to 4 in on mowers; scalping below 1.5 in; reel mower stalls over 5 in.
- [ ] **P1.5 Fuel (1.5 h).** Fuel tank and refuel at the shed for gas tools; empty tank stops the mower.
- [ ] **P1.6 Coins and XP (2 h).** 1 coin per 10 points, daily bonuses, XP to levels, level up toast.
- [ ] **P1.7 Shed scene (3 h).** Walk into the shed; shop list with lock icons, prices, buy confirm.
- [ ] **P1.8 Workbench (2 h).** Sharpen for coins or a 10 second timing minigame; refuel; oil change counter.
- [ ] **P1.9 Trimmer edges (2 h).** Edge cells along fence and beds only the trimmer can cut.
- [ ] **P1.10 Day summary screen (2 h).** Points breakdown by event, coins earned, one tip of the day.
- [ ] **P1.11 Title screen and new game (1.5 h).** Continue, New game, Settings; difficulty picker (Easy, Normal, Hard).
- [ ] **P1.12 Difficulty config (1 h).** `difficulty.json` drives day length, growth, penalties, starting coins.
- [ ] **P1.13 Balance pass (1 h).** Play to the gas mower; adjust prices so it takes about 2 hours on Normal.

**Done when:** every tier 1 to 8 can be bought and feels faster than the last, and the one third rule penalty shows a tip explaining it.

## Phase 2: lawn care and weather (weeks 6 to 8, 24 h)

Goal: the lawn is alive; ignoring water, weeds, or the forecast costs points, and the game explains why. Tag `v0.3`.

- [ ] **P2.1 Moisture model (2 h).** Hourly drying by weather; growth and health tied to the ideal 40 to 70 band; browning and fungus.
- [ ] **P2.2 Watering tools (3 h).** Can, hose, oscillating sprinkler (placed, area of effect), timed sprinkler; time of day efficiency; water bill.
- [ ] **P2.3 Health model (2 h).** Health gains and losses from water, cuts, weeds, fertilizer burn; dead cells at 0.
- [ ] **P2.4 Weeds (2.5 h).** Spawn and spread rules; hand pull, weeder, spot spray with the no rain rule.
- [ ] **P2.5 Fertilizer (1.5 h).** Spreaders, decay, weekly burn limit.
- [ ] **P2.6 Seeding (1.5 h).** Reseed dead cells; 3 day recovery that needs moisture.
- [ ] **P2.7 Weather and forecast (2.5 h).** Daily roll using the save seed; tomorrow shown in the HUD; rain, heat wave, storm effects; forecast accuracy by difficulty.
- [ ] **P2.8 Seasons (2 h).** 14 day seasons, growth multipliers, color shift, winter prep tasks (leaves, aeration).
- [ ] **P2.9 Leaves and aeration (1.5 h).** Rake and blower; leaf cover blocks sun; aerator boosts water uptake.
- [ ] **P2.10 HOA inspections and warnings (2 h).** Weekly inspection, warnings, fine after the limit, notice popup.
- [ ] **P2.11 Moisture and health overlays (1 h).** H cycles height, moisture, health maps.
- [ ] **P2.12 Tips system (1.5 h).** Context tips at a 6th grade reading level the first time each rule bites; logged to the almanac.
- [ ] **P2.13 Balance pass (1 h).** Normal mode lawn survives with about half of each in game day spent on care.

**Done when:** skipping water for 3 in game days browns the lawn and the day summary says why; a full spring to winter run works.

## Phase 3: characters and neighbor jobs (weeks 9 to 12, 32 h)

Goal: players build and restyle their own crew, and earn by mowing for neighbors. Tag `v0.4`.

**Characters (16 h)**

- [ ] **P3.1 Character data (1 h).** Character object per the spec data model; up to 4 per save; `traits.json`.
- [ ] **P3.2 Sprite composer (4 h).** Layered sprites (body, skin, hair, eyes, outfit, hat, shoes) drawn to one cached canvas per character; 4 walk directions.
- [ ] **P3.3 Character creator (3 h).** Name entry (12 characters), look pickers with live preview, pick 2 traits, catchphrase.
- [ ] **P3.4 Profile manager (2 h).** Create, rename, change look, swap traits once per season, duplicate, delete with confirm, set active, stats view.
- [ ] **P3.5 Shed mirror (0.5 h).** Opens the look editor for the active character.
- [ ] **P3.6 Trait modifiers (2 h).** Modifier engine reads `traits.json` (stat, value, when) and applies to speed, quality, energy, prices.
- [ ] **P3.7 Needs (2 h).** Energy, hydration, mood drain and restore (porch, cooler, snacks, sleep); low need effects.
- [ ] **P3.8 Levels and skills (1.5 h).** Per character XP, skill points for Stamina, Precision, Speed, Botany.

**Neighbor jobs (16 h)**

- [ ] **P3.9 Neighbor and job data (1.5 h).** `neighbors.json` (10 neighbors, personality, lawn layout seed) and `jobs.json` (7 job types).
- [ ] **P3.10 Job board (2.5 h).** Shed door board generates daily offers by level and reputation; accept up to 2 (4 at 4 stars).
- [ ] **P3.11 Neighbor lawn scene (3 h).** Reuse the lawn engine with a temporary grid per job; travel by walking out the gate; time window clock.
- [ ] **P3.12 Job tasks and inspection (3 h).** Task checklist per job, inspection scoring, pay formula, tip by personality.
- [ ] **P3.13 Ratings and reputation (1.5 h).** 1 to 5 stars, last 10 average, unlocks and the 2 star limit.
- [ ] **P3.14 Weekly regulars (1.5 h).** Recurring bookings with the 4 visit streak bonus.
- [ ] **P3.15 Neighbor dialogue (1.5 h).** Short lines per personality on arrival and payment.
- [ ] **P3.16 Save migration to v2 (1.5 h).** Add `characters` fields and the `jobs` block; migrate v1 saves; export and import save in Settings.

**Done when:** 4 characters with different traits play measurably differently, a job can be taken, finished, rated, and paid, and an old v1 save loads cleanly.

## Phase 4: depth and polish (weeks 13 to 16, 32 h)

Goal: a full year of play with no dead ends, real art, sound, and touch support. Tag `v1.0`.

**Content (14 h)**

- [ ] **P4.1 Lawn size upgrades (4 h).** Five upgrades from the spec, bought in the shed; grid resize with new zones at 4 in and 60 health; yard sign for the next upgrade.
- [ ] **P4.2 Scrolling camera and minimap (2 h).** Camera follows the character once the lawn passes one screen; HUD minimap.
- [ ] **P4.3 Zone features (2 h).** Tree shade, garden beds with edging bonus, slope that slows riding mowers.
- [ ] **P4.4 Tools 9 to 12 (2 h).** Self propelled, riding, zero turn, robot fleet (auto paths over the lawn while the player does other tasks).
- [ ] **P4.5 Goat crew (1 h).** Fenced zone grazed overnight, eats weeds.
- [ ] **P4.6 Add ons (1 h).** Bagger, mulching blade, striping kit with visible stripes.
- [ ] **P4.7 Pests and breakdowns (2 h).** Grub events, maintenance breakdowns with repair fee.

**Crew mode (6 h)**

- [ ] **P4.8 Assignments (3 h).** Assign idle characters a zone and task, or a neighbor job; simple path to targets.
- [ ] **P4.9 Crew results (3 h).** Off screen job results computed from traits and tools; reported in the day summary.

**Polish (12 h)**

- [ ] **P4.10 Pixel art pass (4 h).** Grass at 4 heights, tools, shed, houses, neighbors, weather effects.
- [ ] **P4.11 Sound (2 h).** Mower loops by tier, snip, water, rain, UI clicks, music toggle.
- [ ] **P4.12 Touch controls (2 h).** Joystick, action and tool buttons shown only on touchscreens.
- [ ] **P4.13 Almanac and guided first day (2 h).** Unlocked tips and tool info; skippable tutorial.
- [ ] **P4.14 Accessibility settings (1 h).** Colorblind palette for overlays, reduced motion, volume.
- [ ] **P4.15 Final balance pass (1 h).** Full year on Normal; check that each lawn upgrade needs the next tool tier.

**Done when:** a full 4 season year plays on Normal without getting stuck, at 60 fps on the biggest lawn on the Chromebook.

## Testing and release

Testing has three layers: sim rule checks in the browser, a fixed Chromebook checklist each phase, and a weekly playtest with a middle school player.

**1. Sim tests (no npm needed).** A `/tests/index.html` page imports the sim modules and runs assertions, showing green and red rows. Run it before every merge.

| Test | Checks |
| --- | --- |
| Growth | 24 hours at ideal water in spring adds about 0.5 in |
| One third rule | Cutting 6 in to 3 in costs 15 health; 4.5 to 3 does not |
| Scalping | Deck at 1.5 in on 4 in grass flags scalped cells |
| Watering time | 7 am water adds full moisture; noon adds 60% |
| Pay formula | Quality 0.9, on time, no tip pays 1.4 x base |
| Traits | Speedster moves 20% faster; Penny Pincher prices 10% lower |
| Save round trip | Save, load, compare every field; v1 save migrates to v2 |
| Seeded weather | Same seed gives the same 30 day forecast |

**2. Chromebook checklist (end of each phase)**

- [ ] Pages URL loads on the school Chromebook through the school network
- [ ] 60 fps for 10 minutes (debug panel FPS), no stutter at day rollover
- [ ] Close the tab mid day, reopen, progress intact
- [ ] Export save, clear site data, import save, progress intact
- [ ] Keyboard only play works end to end; touch works on a touchscreen model
- [ ] No console errors

**3. Playtest (weekly, 20 minutes).** Watch without helping and note where the player gets stuck, bored, or confused. Turn each note into a task in the next phase or a tuning change in the JSON files.

**Release steps per version**

1. Merge the phase branch into main by pull request.
2. Bump the version in `config.json` and add CHANGELOG lines.
3. Tag the release (`git tag v0.x && git push --tags`).
4. Wait about a minute, hard refresh the Pages URL on the Chromebook, run the checklist.
5. If anything breaks, revert the merge on main; Pages serves the last good build again.
