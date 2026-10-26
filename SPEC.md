# Grass Friend Spec

Oct 25, 2026 · @bc

## Overview

A top down 2D lawn care sim where you keep a living lawn healthy, cut it on schedule, and upgrade from scissors to a robot mower fleet. It runs as a static HTML5 site on GitHub Pages, so it plays in Chrome on a school Chromebook with no install, no login, and no server.

**Game name:** Grass Friend

**Design pillars**

- **Living lawn:** grass grows every in game hour based on water, sun, season, and care. Neglect shows.
- **Realistic, not punishing:** real lawn rules (the one third rule, morning watering, sharp blades) drive scoring, explained in plain tips.
- **Earned upgrades:** every tool tier is a visible jump in speed and cut quality.
- **Your crew, your way:** players create and manage characters whose personalities change how they play.

**In scope for v1:** one home lawn that expands, 12 tool tiers, watering and care systems, weather and seasons, up to 4 character profiles, local saves.

**Out of scope for v1:** online play, accounts, leaderboards, ads, purchases, 3D graphics.

**Audience and difficulty:** middle school players (ages 11 to 14). Normal mode is tuned for them:

| Setting | Easy | Normal (default) | Hard |
| --- | --- | --- | --- |
| Day length | 10 min | 6 min | 3 min |
| Grass growth speed | 0.7x | 1.0x | 1.3x |
| One third rule penalty | Warning only | Health minus 15 | Health minus 25 |
| HOA warnings before a fine | 5 | 3 | 2 |
| Weather surprises | Forecast always right | 90% right | 75% right |
| Starting coins | 500 | 250 | 100 |

- Tips, tool descriptions, and the almanac written at a 6th grade reading level: short sentences, no lawn jargon without a one line explanation.
- A guided first day teaches moving, cutting, watering, and the shed, with skip available.
- Numbers on screen stay simple: whole points and coins, heights in inches, no decimals in the HUD.
- Difficulty can be changed anytime in Settings without losing progress.

## Core gameplay loop

Every in game day the player plans, waters, mows, cares for the lawn, rests their character, then spends earnings in the shed, while the grass keeps growing in the background.

&#91;embedded content: daily loop · 6 steps\]

Skipping any step shows up later: dry grass browns, tall grass triggers HOA warnings, a tired character cuts slowly, and dull blades tear the lawn.

## Grass simulation

The lawn is a grid of cells (starting at 32 x 24), and each cell tracks its own height, moisture, health, and weeds. The sim ticks once per in game hour; one in game day lasts 6 real minutes by default (setting: 3, 6, or 10).

**Cell state**

| Field | Range | Notes |
| --- | --- | --- |
| height | 0.5 to 12 in | Ideal band 2.5 to 3.5 in |
| moisture | 0 to 100 | Ideal 40 to 70; below 20 browns, above 90 grows fungus |
| health | 0 to 100 | Drives color; 0 = dead patch, must be reseeded |
| weed | 0 to 3 | 0 none, 3 fully overrun |
| fertilizer | 0 to 100 | Decays daily |
| lastCut | game hour | Used for tear and recovery effects |

**Growth per tick**

```latex
growth = baseRate \cdot seasonMult \cdot waterMult \cdot sunMult \cdot (1 + 0.5 \cdot fertilizer / 100) \cdot health / 100
```

- baseRate: 0.02 in per hour (about 0.5 in per day in peak spring).
- seasonMult: spring 1.4, summer 0.9, fall 1.0, winter 0.1 (dormant).
- waterMult: 0.2 when dry, 1.0 in the ideal band, 0.8 when soggy.
- sunMult: 1.0 full sun, 0.6 under the tree shade zone.

**Realism rules**

- **One third rule:** cutting more than one third of blade height in a single pass stresses the cell (health minus 15) and counts as scalping when height drops below 1.5 in.
- **Watering time matters:** 5 to 10 am waters at full efficiency; noon loses 40% to evaporation; after 8 pm raises fungus risk.
- **Dull blades tear:** cut quality below 50% leaves ragged tips that cost 5 health and show brown for a day.
- **Weeds spread** to neighbors when a cell sits above 5 in or below 30 health.

**Weather and seasons:** each day rolls a forecast (sunny, cloudy, rain, heat wave, storm) shown a day ahead. Rain adds moisture; heat waves double drying. A season lasts 14 in game days, and winter skips cutting in favor of prep tasks (leaves, aeration, tool maintenance).

## Scoring and economy

Points reward keeping the lawn in the ideal band on schedule; coins (earned 1 per 10 points, plus daily bonuses) buy tools and supplies. XP from points raises player level, which unlocks shop tiers.

**Earning**

| Event | Points | Trigger |
| --- | --- | --- |
| Clean cut cell | +2 | Cell cut into the 2.5 to 3.5 in band, quality 80%+ |
| Rough cut cell | +1 | Cut into band, quality 50 to 79% |
| On time mow | +100 | Whole lawn mowed before 30% of cells pass 4.5 in |
| Healthy lawn day | +50 | End of day with average health 80+ |
| Morning watering | +20 | Watering done 5 to 10 am |
| Weed cleared | +5 | Weed level reduced to 0 |
| Streak bonus | x1.1 per day, cap x2.0 | Consecutive Healthy lawn days |
| Inspection pass | +300 | Weekly HOA inspection average height in band |

**Penalties**

| Event | Points | Trigger |
| --- | --- | --- |
| Overgrown cell | minus 1 per hour | Cell above 6 in |
| Scalped cell | minus 10 | Cut below 1.5 in |
| Dead patch | minus 25 | Cell health hits 0 |
| Missed mow | minus 150 and HOA warning | 30% of cells above 6 in at day end |
| Inspection fail | minus 300 | Weekly HOA inspection out of band |

Three HOA warnings in one season trigger a fine (lose 500 coins) instead of a game over, so younger players can recover.

**Coin sinks:** tools, sharpening, fuel and batteries, water bill (per watering), seed, fertilizer, weed killer, character gear, lawn expansions.

## Tool progression

Twelve tiers take the player from scissors to an autonomous mower fleet, each roughly doubling lawn coverage per minute. Width is cells cut per pass; energy is character energy spent per cell.

| Tier | Tool | Unlock level | Cost (coins) | Width (cells) | Speed | Energy per cell | Base quality | Upkeep |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Scissors | 1 | Free | 1 (one cell per 2 s) | Slow | 1.0 | 70% | Sharpen every 2 days |
| 2 | Kitchen knife | 2 | 150 | 1 | Slow | 0.9 | 60% | Sharpen daily |
| 3 | Machete | 4 | 400 | 1 (sweep) | Medium | 0.8 | 65% | Sharpen daily |
| 4 | Sickle | 6 | 800 | 2 | Medium | 0.7 | 70% | Sharpen daily |
| 5 | Scythe | 8 | 1,500 | 3 | Medium | 0.6 | 75% | Sharpen daily |
| 6 | Push reel mower | 10 | 3,000 | 3 | Medium | 0.5 | 90% | Sharpen weekly; fails on grass over 5 in |
| 7 | String trimmer | 12 | 4,500 | 1 (edges only) | Fast | 0.3 | 80% | Line refills |
| 8 | Gas push mower | 14 | 7,500 | 4 | Fast | 0.4 | 85% | Fuel, blade, oil |
| 9 | Self propelled mower | 17 | 12,000 | 4 | Fast | 0.2 | 88% | Fuel, blade, oil |
| 10 | Riding mower | 21 | 25,000 | 6 | Very fast | 0.1 | 85% | Fuel, blade, belt |
| 11 | Zero turn mower | 26 | 50,000 | 8 | Very fast | 0.1 | 92% | Fuel, blades |
| 12 | Robot mower fleet | 32 | 100,000 | Auto | Runs while you do other tasks | 0 | 95% | Charging, firmware, boundary wire |

**Bonus unlock:** Goat crew (level 20, 10,000 coins) grazes a fenced zone overnight, quality 50%, but also eats weeds. A real practice and a crowd pleaser.

**Tool rules**

- Every tool has a sharpness value (100 to 0) that lowers quality as it drops; sharpening costs coins or a minigame at the workbench.
- Powered mowers have a deck height setting (1.5 to 4 in) the player must choose, which is where the one third rule bites.
- Owned tools stay owned; the trimmer is a companion tool for edges along beds and the fence that mowers cannot reach.
- Add ons: bagger (no clippings penalty), mulching blade (+5 health on cut cells), striping kit (cosmetic stripes, +10% inspection score).

## Lawn care systems

Care is the second half of the game: a lawn cut perfectly but left dry still browns and loses points.

| System | Tools (upgrade path) | What it does | Realistic rule |
| --- | --- | --- | --- |
| Watering | Watering can, hose, oscillating sprinkler, timed sprinkler system | Adds moisture to cells in range | Best 5 to 10 am; about 1 in of water per week in summer |
| Fertilizing | Hand toss, drop spreader, broadcast spreader | Raises fertilizer level, speeds growth | Too much in one week burns cells (health minus 20) |
| Weed control | Hand pull, weeder tool, spot spray | Lowers weed level | Spray needs 24 hours with no rain to work |
| Seeding | Hand seed, seed spreader | Revives dead patches over 3 days | Seed must stay moist; best in spring and fall |
| Aeration | Spike shoes, core aerator | Boosts water uptake for 7 days | Fall task |
| Leaf cleanup | Rake, leaf blower | Clears leaf cover that blocks sun | Fall task; leaves left 3 days kill grass under them |
| Pests | Grub treatment | Stops spreading brown patches | Random event, mostly summer |

**Equipment maintenance** happens at the shed workbench: sharpen blades, refuel, change oil every 10 mows, replace belts. Skipping it lowers quality and can cause a breakdown that costs a repair fee and a day.

**Lawn size upgrades:** players buy land in the shed to grow their lawn from a small front yard to a big lot, five upgrades in all. A bigger lawn pays more per mow but grows faster than hand tools can keep up with, which is what pushes players up the tool ladder.

| Upgrade | Adds | Total size (cells) | Unlock level | Cost (coins) | New feature |
| --- | --- | --- | --- | --- | --- |
| Starter front yard | Front lawn | 32 x 24 (768) | 1 | Free | Basic flat lawn |
| Side yard | Strip beside the house | 40 x 24 (960) | 5 | 1,000 | Narrow path, trimmer helps |
| Backyard | Lawn behind the house | 48 x 36 (1,728) | 10 | 5,000 | Tree shade zone, slower growth there |
| Garden beds | Flower beds with edges | 48 x 36 (1,728) | 13 | 3,000 | Edging bonus, scalping a bed costs points |
| Back slope | Hill at the back | 56 x 42 (2,352) | 18 | 15,000 | Riding mowers slow down; hand tools tire you faster |
| Big lot | Open field next door | 64 x 48 (3,072) | 24 | 40,000 | Room for a robot mower fleet and goat pen |

**Lawn size rules**

- Points for On time mow and Healthy lawn day scale with lawn size (+10% per upgrade owned), so upgrading always pays off for players who keep up.
- Water bill, seed, and fertilizer costs scale with cells covered.
- New zones arrive at 4 in grass height and 60 health, so the first mow is a challenge.
- The camera scrolls to follow the character once the lawn is bigger than one screen, and a minimap appears in the HUD corner.
- A sign in the yard shows the next upgrade and its price, so players always know what they are saving for.
- 64 x 48 is the hard cap to protect performance on low end Chromebooks.

## Neighbor jobs

Players can take paid jobs mowing and caring for neighbors' lawns, the main way to earn coins beyond their own lawn. Jobs unlock at level 3 and appear on a job board on the shed door (and later a phone app at level 12).

**How a job works**

1. Pick a job from the board: neighbor name, lawn size, grass height, tasks, time window, and pay.
2. Accept it (max 2 open jobs at a time, 4 once Reputation hits 4 stars).
3. Walk or drive to the neighbor's house during the time window; the job uses its own lawn map.
4. Do the tasks with your own tools, fuel, and energy.
5. The neighbor inspects, pays, tips, and rates you 1 to 5 stars.

**Job types**

| Job | Unlock level | Base pay (coins) | Tasks |
| --- | --- | --- | --- |
| Quick trim | 3 | 60 | Mow a small front lawn |
| Full mow | 6 | 150 | Mow front and back, trim edges |
| Overgrown rescue | 9 | 300 | Grass over 6 in; needs a scythe or mower and several passes |
| Weekly regular | 11 | 120 per visit | Same neighbor every week; bonus for 4 visits in a row |
| Vacation sitter | 14 | 400 | Water and mow for 3 days while they are away |
| Lawn makeover | 18 | 800 | Weeds, seed dead patches, fertilize, mow, stripes |
| Big estate | 24 | 1,500 | 64 x 48 lawn, riding or zero turn mower needed |

**Pay formula**

```latex
pay = basePay \cdot (0.5 + quality) \cdot onTimeMult + tip
```

- quality: average cut quality and lawn health at inspection, 0 to 1.
- onTimeMult: 1.2 if finished early in the window, 1.0 on time, 0.5 if late.
- tip: 0 to 25% of base pay, set by the neighbor's personality.

**Neighbors:** 10 neighbors, each with a name, house, lawn layout, and personality.

| Personality | Example | What they care about |
| --- | --- | --- |
| Picky | Mr. Alvarez | Perfect stripes, no missed spots; big tips if happy |
| Easygoing | Ms. Patel | Just mowed; small tips, never rates below 3 stars |
| Rushed | The Kims | Must be done before they get home; early bonus doubled |
| Garden lover | Grandma Rose | Never touch her flower beds; pays extra for weeding |
| Bargain hunter | Dave | Haggles pay down 10%, but books weekly regulars |

**Reputation:** an average of your last 10 star ratings. Higher stars unlock better paying jobs, more open job slots, and word of mouth (new neighbors appear). Below 2 stars, the board offers only Quick trims until you recover.

**Balancing your own lawn:** jobs use the same in game clock and the same character energy, so taking too many lets your own lawn get overgrown and earns HOA warnings. In Crew mode, other characters can take jobs on their own with their traits applied (a Perfectionist pleases Picky neighbors; a Speedster suits Rushed ones).

**Save data addition**

```json
"jobs": {
  "reputation": 4.2,
  "ratings": [5, 4, 4, 5, 3],
  "open": [
    { "id": "j17", "type": "full_mow", "neighborId": "n3", "windowStart": 9, "windowEnd": 13, "day": 12, "basePay": 150, "assignedTo": "c1" }
  ],
  "regulars": [{ "neighborId": "n5", "dayOfWeek": 3, "streak": 2 }],
  "neighborsUnlocked": ["n1", "n2", "n3", "n5"]
}
```

## Characters and profiles

Each save holds up to 4 characters the player creates, edits, and switches between; personality traits change gameplay, not just looks.

**Character creator**

- Name: type any name up to 12 characters (stays on the device, never sent anywhere); rename anytime
- Look: body shape, skin tone, hair style and color, eye color, outfit, hat, shoes (8+ options each); change the look anytime for free from the profile manager or the mirror in the shed
- Pick 2 personality traits from the list below
- Favorite catchphrase shown in a speech bubble on big wins (pick from a list, or type one)

**Personality traits**

| Trait | Bonus | Drawback |
| --- | --- | --- |
| Perfectionist | +10% cut quality | 15% slower |
| Speedster | +20% move speed | minus 5% quality |
| Early Bird | +25% points before 10 am | Energy drains 20% faster after 6 pm |
| Night Owl | No fungus penalty from evening watering | Starts each day at 70 energy |
| Green Thumb | Seed and fertilizer 25% stronger | Weeds bother them (mood drops faster) |
| Gearhead | Maintenance costs 30% less | Hand tools use 20% more energy |
| Penny Pincher | Shop prices 10% lower | Earns 5% fewer coins from bonuses |
| Tough Cookie | Heat waves drain no extra energy | Mood recovers slower |
| Chatterbox | Neighbor events give extra tips and coins | Gets distracted (random 5 s pause) |

**Character needs**

| Need | Drains from | Restored by | When low |
| --- | --- | --- | --- |
| Energy | Tool use, walking, heat | Sleep, snacks, sitting on the porch | Below 20: moves at half speed |
| Hydration | Hot days, hand tools | Water bottle, cooler | Below 20: energy drains double |
| Mood | Missed mows, HOA warnings, weeds | Wins, music on the radio, pet the dog, days off | Below 30: quality minus 10% |

**Profile management screen:** create, rename, change look, swap traits (once per season), duplicate, delete (with confirm), set active, view stats (lawns mowed, best streak, tools owned, total points). Each character levels up on their own and earns a skill point per level for Stamina, Precision, Speed, or Botany (+3% each per point).

**Crew mode (Phase 4):** idle characters can be assigned a zone and a task (water the backyard, trim edges) and work alongside the active character, using their own traits.

## Controls, UI and screens

Keyboard first, since Chromebook touchpads are imprecise; touch controls appear automatically on touchscreen models.

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | WASD or arrow keys | Left thumb joystick |
| Use tool | Space (hold) | Right action button |
| Interact (shed, cooler, porch) | E | Tap object |
| Switch tool | Q / 1 to 9 | Tool wheel button |
| Deck height | Z / X | Plus and minus buttons |
| Lawn health overlay | H | Overlay button |
| Fast forward time | F (only when idle) | Clock button |
| Pause and menu | Esc or P | Pause button |

**HUD:** clock and day, weather icon and tomorrow's forecast, coins, points, streak, active tool with sharpness and fuel bars, character energy, hydration, mood bars.

**Overlays (H cycles):** height map (green good, yellow tall, red overgrown), moisture map (blue scale), health map. This is the main teaching tool for realism.

**Screens**

| Screen | Purpose |
| --- | --- |
| Title | Continue, new game, load, settings |
| Profile manager | Create, edit, switch characters |
| Character creator | Name, look, traits, catchphrase; reopens to edit an existing character |
| Lawn (main) | Gameplay |
| Shed | Shop, workbench, inventory |
| Day summary | Points breakdown, tips, tomorrow's forecast |
| Almanac | Unlocked lawn care tips and tool info |
| Settings | Day length, volume, colorblind palette, reduced motion, export and import save |

## Technical architecture

Plain HTML, CSS, and JavaScript modules on one HTML5 Canvas, no build step and no external CDNs, deployed from a GitHub repo to GitHub Pages. This matches the Doodle Zoomies and Linebreak setup and survives school web filters that block third party script hosts.

**Stack**

| Layer | Choice | Why |
| --- | --- | --- |
| Rendering | Canvas 2D, 16 px tiles scaled 3x, pixel art | Cheap on low end Chromebooks |
| Game loop | requestAnimationFrame, fixed 30 Hz sim tick, 60 fps render | Stable sim on slow CPUs |
| Code | ES modules, no framework | Edits right in GitHub, no npm |
| Audio | Web Audio, short OGG files | Small download |
| Saves | localStorage, plus JSON export and import | Managed Chromebooks may wipe browser data |
| Hosting | GitHub Pages from main branch | Free, HTTPS, one URL |

**Performance budget:** under 5 MB total download, under 150 MB memory, 60 fps on a 4 GB Celeron Chromebook. Only redraw dirty grass cells; batch the overlay into an offscreen canvas.

**File structure**

```
/index.html
/css/style.css
/js/main.js            boot, loop, scene manager
/js/sim/lawn.js        cell grid, growth tick
/js/sim/weather.js     forecast, seasons
/js/sim/scoring.js     points, coins, HOA
/js/entities/player.js movement, needs
/js/entities/tools.js  tool defs and cutting
/js/ui/hud.js
/js/ui/screens/*.js    title, profiles, creator, shed, summary, almanac, settings
/js/data/tools.json    tool table
/js/data/traits.json   trait table
/js/save.js            save, load, export, import, schema versioning
/assets/sprites/
/assets/audio/
```

**Save system:** autosave at the end of each in game day and on tab close (visibilitychange). Every save carries a schemaVersion with a migration function per version, so older saves keep loading after updates. Settings has Export save (downloads a .json file) and Import save, so a wiped Chromebook never loses progress.

## Data model

One save object in localStorage under the key `grassfriend.save.v1`; the lawn grid is stored as typed arrays encoded to base64 to stay well under the 5 MB localStorage limit.

```json
{
  "schemaVersion": 1,
  "createdAt": "2026-10-25T09:00:00Z",
  "game": {
    "day": 12,
    "hour": 7.5,
    "season": "spring",
    "weatherToday": "sunny",
    "weatherTomorrow": "rain",
    "dayLengthMinutes": 6
  },
  "economy": {
    "coins": 1840,
    "points": 12650,
    "streakDays": 4,
    "hoaWarnings": 1
  },
  "lawn": {
    "width": 32,
    "height": 24,
    "zonesOwned": ["front"],
    "cells": {
      "height": "<base64 Float32Array>",
      "moisture": "<base64 Uint8Array>",
      "health": "<base64 Uint8Array>",
      "weed": "<base64 Uint8Array>",
      "fertilizer": "<base64 Uint8Array>",
      "lastCut": "<base64 Uint16Array>"
    }
  },
  "activeCharacterId": "c1",
  "characters": [
    {
      "id": "c1",
      "name": "Jake",
      "look": { "body": 2, "skin": 3, "hair": 5, "hairColor": 1, "eyes": 0, "outfit": 4, "hat": 2, "shoes": 1 },
      "traits": ["speedster", "early_bird"],
      "catchphrase": "Fresh cut!",
      "level": 6,
      "xp": 340,
      "skills": { "stamina": 2, "precision": 1, "speed": 2, "botany": 0 },
      "needs": { "energy": 82, "hydration": 64, "mood": 90 },
      "stats": { "cellsCut": 9120, "bestStreak": 7, "lawnsMowed": 14 },
      "assignment": null
    }
  ],
  "inventory": {
    "tools": [
      { "id": "scissors", "sharpness": 64 },
      { "id": "machete", "sharpness": 91 }
    ],
    "equippedTool": "machete",
    "supplies": { "seed": 3, "fertilizer": 1, "weedSpray": 0, "fuel": 0 }
  },
  "settings": { "volume": 0.7, "colorblind": false, "reducedMotion": false }
}
```

**Tool definition (tools.json entry)**

```json
{
  "id": "gas_push_mower",
  "name": "Gas push mower",
  "tier": 8,
  "unlockLevel": 14,
  "cost": 7500,
  "width": 4,
  "speed": 1.6,
  "energyPerCell": 0.4,
  "baseQuality": 0.85,
  "deckHeight": { "min": 1.5, "max": 4.0, "step": 0.5 },
  "upkeep": { "fuelPerCell": 0.002, "sharpnessLossPerCell": 0.01, "oilEveryMows": 10 },
  "maxGrassHeight": null
}
```

**Trait definition (traits.json entry)**

```json
{
  "id": "early_bird",
  "name": "Early Bird",
  "modifiers": [
    { "stat": "pointsMult", "value": 1.25, "when": "hour < 10" },
    { "stat": "energyDrainMult", "value": 1.2, "when": "hour >= 18" }
  ]
}
```

## Build phases, risks and open questions

Five phases, each ending in a playable build pushed to GitHub Pages so it can be tested on the real Chromebook.

1. **Phase 0, playable lawn:** grid, growth tick, player movement, scissors, height overlay, basic points.
   - Done when: grass visibly grows, cutting changes cells, 60 fps on the target Chromebook, autosave and reload work.
2. **Phase 1, tools and shop:** tiers 1 to 8, coins, shed shop, sharpness, deck height, one third rule, day summary.
   - Done when: a new player can reach the gas mower in about 2 hours of play.
3. **Phase 2, lawn care:** watering, moisture and health, fertilizer, weeds, seeding, weather forecast, HOA inspections.
   - Done when: ignoring water for 3 in game days browns the lawn and the summary explains why.
4. **Phase 3, characters and neighbor jobs:** creator, profile manager, traits, needs, skills, save export and import, job board, 10 neighbors, reputation.
   - Done when: 4 characters with different traits play measurably differently on the same lawn.
5. **Phase 4, depth:** tiers 9 to 12, goats, seasons, lawn expansions, crew mode, almanac, touch controls, sound.
   - Done when: a full 4 season year plays without dead ends.

**Risks**

| Risk | Impact | Mitigation |
| --- | --- | --- |
| School IT wipes browser data | Lost progress | JSON export and import, reminder every 7 days |
| School filter blocks github.io | Game unreachable | Confirm Doodle Zoomies URL loads on the same device first |
| Low end CPU stutters with large lawns | Unplayable | Dirty cell redraw, cap grid at 64 x 48, profile on target device each phase |
| Realism makes it a chore | Players quit | Default 6 minute days, generous early growth, forecast and tips |
| Scope creep from crew mode | Delays v1 | Crew mode held to Phase 4 |

**Open questions**

- Grass Friend logo and title screen look (mascot, colors)?
- Should Hard mode give a points multiplier (for example 1.5x) so it is worth choosing?
- Should players be able to name their lawn business (shown on the job board and a truck decal)?
- Pixel art style vs simple flat shapes for the first build?
- Repo name under billtf (suggested: billtf/grass-friend).

Build steps and task list: Implementation plan
