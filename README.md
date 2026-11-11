# Project Aether

A four-player asymmetric co-op puzzle game. One player is inside the Monolith (the **Pathfinder**, on a laptop with webcam hand tracking, headset mode planned), one runs mission control on a laptop (the **Flight Director**), and two field specialists use phones to scan printed cards and work holographic puzzles (the **Xenolinguist** and the **Astrophysicist**). It started from *Keep Talking and Nobody Explodes*, but every rule, table and puzzle here is original.

The core design rule: **nobody can solve a node alone.** Each node needs one fact the Pathfinder can see, one the Flight Director holds, and one rule a phone holds. The crew wins by talking.

This document records everything known about the project as of 11 November 2026: the game, the apps, the architecture, how to run and change it, the decisions made along the way, and what's still to build.

---

## Contents

1. [Quick links](#1-quick-links)
2. [The concept](#2-the-concept)
3. [The four seats](#3-the-four-seats)
4. [How a session runs](#4-how-a-session-runs)
5. [Game rules](#5-game-rules)
6. [The apps](#6-the-apps)
7. [Architecture](#7-architecture)
8. [Tracking technology](#8-tracking-technology)
9. [Visual design system](#9-visual-design-system)
10. [Repository, build, deploy and tests](#10-repository-build-deploy-and-tests)
11. [Hosting, accounts and access](#11-hosting-accounts-and-access)
12. [Decisions log](#12-decisions-log)
13. [Known limitations](#13-known-limitations)
14. [Roadmap](#14-roadmap)
15. [Design principles for the Pathfinder](#15-design-principles-for-the-pathfinder)

---

## 1. Quick links

| What | Where |
|---|---|
| Live game (home screen, pick a seat) | https://artest.kai-216.workers.dev |
| Pathfinder cockpit | https://artest.kai-216.workers.dev/pathfinder |
| Flight Director | Home screen → Flight Director, or `/#director` |
| Print the shards | `/#shards` (A4, 100% scale) |
| Test sheet (stands in for missing seats) | `/#test` |
| Source code | https://github.com/cognitonow/ARtest (public) |
| Download everything as a zip | https://github.com/cognitonow/ARtest/archive/refs/heads/main.zip |
| Old GitHub Pages address (offline mode only) | https://cognitonow.github.io/ARtest/ |
| Claude preview of the phone app (no camera, offline) | https://claude.ai/artifact/KJYPm2ESDxoUSBRdXgtWZp |
| First design doc in Claude Docs (**out of date**) | https://claude.ai/artifact/2jnaYUoYUsAUkFSuj5JfhG |

Every push to the `main` branch on GitHub deploys to Cloudflare automatically within about a minute.

---

## 2. The concept

### Origin
The project began as a reverse-engineering exercise of *Keep Talking and Nobody Explodes* (KTANE) in Gemini, which produced a module-by-module breakdown and a 4-player idea. Reviewing that plan surfaced real problems: a 4-hop voice relay per puzzle that couldn't fit in 5 minutes, contradictions about who finishes each puzzle, a console that solved puzzles for the player, errors in the worked examples, and rule tables copied directly from the KTANE manual (Steel Crate Games' copyrighted material). The decision was to keep the asymmetric co-op idea and **redesign every puzzle with original rules**.

### Lore: Project Aether, the Monolith Protocol
A deep-space crew has found a dormant alien construct, the Monolith. The only way in is to project one crew member's consciousness into it. That diver, the Pathfinder, must breach the Monolith's nodes before the neural link fails (the timer) or three system faults occur (strikes). Mission control (the Flight Director) logs everything and relays between the diver and two specialists in the field, who decode alien relics: the Xenolinguist (symbols, mazes and memory) and the Astrophysicist (energy, signals and pressure).

### Three rules that shape everything
1. **Three-way information split.** Every node needs one fact from the Pathfinder (what it looks like), one from the Flight Director (hull readings or logged history) and one from a specialist (the rule). No seat ever sees another seat's information, and decorative visuals must never look like readings.
2. **The Flight Director records, never computes.** The console has blank fields and directories, never automatic answers.
3. **Real words, not codes.** Everything players see uses real words: node names, seal words, codenames and crew titles. No acronyms.

---

## 3. The four seats

| Seat | Device | Sees | Does |
|---|---|---|---|
| **Pathfinder** | Laptop browser with webcam hand tracking (mouse and keyboard fallback). Headset mode planned | The cockpit: a ring of 8 node orbs with mini models, the 3D puzzle in the central well, hull readings, seal words, the room clock | Reads everything out. Cuts the Conduits, presses the Echo Chamber pads. Reads gauges during vent alarms |
| **Flight Director** | Laptop browser | Mission control: join code, crew status, timer, strikes, node directory (seal word → shard → node → specialist), hull log, comms log | Opens and runs the room. Logs readings and history by hand. Relays between seats |
| **Xenolinguist** | Phone with camera, printed shards | Relic holograms anchored to the shards, rule cards | Works the Jaw and the Descent. Holds the Echo Chamber rules |
| **Astrophysicist** | Phone with camera, printed shards | Relic holograms, rule cards, the vent alarm | Holds the Conduits colours and rule, tunes the Resonator, vents the Pressure Vent |

---

## 4. How a session runs

1. **Lobby.** The Flight Director opens the site on a laptop and chooses Flight Director. That creates a room under a 4-digit round number and shows a join QR code. Phones scan it (it opens the site with `?round=NNNN`), and each phone picks a role. The Pathfinder opens `/pathfinder`, which joins the same round automatically when linked from the home screen, or types the round number into the cockpit's room panel.
2. **Calibration.** The Pathfinder runs the 4-step tutorial: camera on, three-finger posture, a left tap, a right tap. This also calibrates their personal tap distances. They read the hull readings out, and the Flight Director logs them.
3. **Breach.** The Flight Director chooses a length and presses Start round. The clock runs on every screen. Specialists scan shards as the Pathfinder reads out seal words and the Flight Director looks them up. The Pressure Vent fires alarms during the round.
4. **End.** Five nodes open means "Core breached" on every device. Three strikes or the clock running out means "Link lost". The Flight Director can reset for another go or start a new round.

Every device builds the same round from the round number, so devices only exchange live state.

---

## 5. Game rules

### The round
| Rule | Value |
|---|---|
| Length | Chosen in the lobby: 8, 10 (default), 12 or 15 minutes |
| Strikes | Three strikes and the link is lost |
| Strike penalty | The clock runs 15% faster after strike 1, 30% faster after strike 2 |
| Win | The Conduits, the Resonator, the Jaw, the Descent and the Echo Chamber all open |
| Lose | The clock reaches zero, or the third strike |
| Before the round starts | Actions are practice: strikes don't count, and the Pathfinder can't engage nodes |

### Hull telemetry
The Pathfinder reads these from the cockpit; the Flight Director logs them by hand.

| Reading | Values | Used by |
|---|---|---|
| Case number | A codename (Heron, Osprey, Marlin, Cypress, Granite, Vesper, Pelican, Linden) and four digits | Last digit: the Resonator and the Pressure Vent |
| Power cells | Four capsules, 1 to 4 of them charged | The Conduits and the Echo Chamber |
| Sector sigil | Spiral, Eye, Crown or Wave. The Pathfinder sees the symbol, not the name | The Jaw |

### Shards and seal words
There are eight printed shards. Each round assigns six of them to the six nodes; the other two show "no signal". Each node shows the Pathfinder a seal word from: Harbour, Falcon, Meridian, Thistle, Juniper, Orchid, Summit, Willow, Quarry, Tundra, Beacon, Cinder. The Flight Director's directory turns a seal word into a shard number and the specialist who owns it. Only the owning specialist's phone opens a shard; the other phone shows "wrong specialist".

### The nodes
| Ring slot | Node | Phone owner | Finished by |
|---|---|---|---|
| 01 | The Conduits | Astrophysicist | Pathfinder (cuts) |
| 02 | The Resonator | Astrophysicist | Astrophysicist (transmits) |
| 03 | The Jaw | Xenolinguist | Xenolinguist (presses teeth) |
| 04 | The Descent | Xenolinguist | Xenolinguist (rolls the ball) |
| 05 | The Echo Chamber | Xenolinguist | Pathfinder (presses pads) |
| 06 | The Pressure Vent (interrupt) | Astrophysicist | Astrophysicist (vents) |
| 07 | The Star Map | Not built yet | |
| 08 | The Dice Vault | Not built yet | |

#### The Conduits
The Pathfinder sees 4 to 6 strands, each with a cap (hollow ring or solid dot); some flicker. They have no colour. The Astrophysicist sees each strand's colour. The Flight Director has the charged power cell count.

**Rule:** charge = colour value (Amber 3, Violet 2, Teal 1, Grey 0), plus 1 for a solid dot, then doubled if the strand flickers. Sever every strand whose charge equals the number of charged cells. Every round has 1 to 3 such strands. Example: Violet, solid dot, flickering = (2 + 1) × 2 = 6.

**Action:** the Pathfinder engages the node, swipes to a strand and cuts it with [1]. Cutting a strand that isn't a target is a strike.

#### The Resonator
The Pathfinder sees the crystal flash four pulses, each short (0.3 s) or long (0.9 s), then go dark for 2 seconds, on a loop. The Flight Director has the case number's last digit (zero counts as even). The Astrophysicist has this table, a tuner from 400 to 600 kilohertz, and Transmit. A wrong frequency is a strike.

| Pulse pattern | Last digit even | Last digit odd |
|---|---|---|
| short, short, short, long | 412 | 538 |
| short, short, long, long | 426 | 571 |
| short, long, short, long | 449 | 503 |
| short, long, long, short | 463 | 594 |
| long, short, short, long | 478 | 517 |
| long, short, long, short | 485 | 552 |
| long, long, short, short | 491 | 529 |
| long, long, long, short | 507 | 586 |

#### The Jaw (replaced the Glyph Lock)
The Pathfinder sees the round's four glyphs on plates, with no names. The Flight Director has the sector sigil. The Xenolinguist has the lexicon, the reading orders, and a stone jaw with eight glyph teeth: the four glyphs plus four decoys, in an order that's the same on every device.

**Rule:** press the four teeth in the order you meet those glyphs when reading the lexicon the sigil's way. The first correct tooth starts the jaw closing: 20 seconds to finish. A wrong tooth, or the timer running out, snaps it shut. That's a strike, and the teeth reset.

| | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| Row 1 | Comet | Fork | Almond | Ladder |
| Row 2 | Twin Moons | Knot | Arrowhead | Broken Ring |
| Row 3 | Spine | Hourglass | Lantern | Hook |
| Row 4 | Gate | Star Seed | Ripple | Claw |

| Sigil | Reading order |
|---|---|
| Spiral | Clockwise spiral inward from the top left: row 1, down column 4, back along row 4, up column 1, then the inner four clockwise |
| Eye | Column by column, left to right, each top to bottom |
| Crown | Row by row, bottom to top, each left to right |
| Wave | Snake: row 1 left to right, row 2 right to left, row 3 left to right, row 4 right to left |

#### The Descent
A new maze every round: three rings of twelve sectors (named by clock hours) around a core, with a two-sector opening into the core. There are two hidden trapdoors. One always sits on the obvious route, and a safe detour always exists. Only the Pathfinder sees the trapdoors (glowing red); the Flight Director relays them as a ring and an hour, such as "Middle 4". The Xenolinguist rolls the ball into the hole at the core by tilting the printed card (real gravity), tilting the phone in preview mode, or dragging. Rolling onto a trapdoor is a strike and sends the ball back to the start. The ball's position is mirrored live into the Pathfinder's maze.

The generator was checked over 10,000 rounds: every maze generated, the first trapdoor was always on the obvious route, and a safe route always existed. The safe route is about 10 moves on average and the detour costs about 3 extra.

#### The Echo Chamber
Each of four stages shows the Pathfinder a shape (Triangle, Square, Circle or Cross) and four pads labelled 1 to 4 in a shuffled order. The Flight Director keeps the history of every press (position and label) and has the power cell count. The Xenolinguist has the rule table. "Position N" means the pad in slot N from the left; "Label N" means the pad showing N. The Pathfinder engages, swipes to a pad and presses with [1]. A wrong press is a strike, and the node restarts at stage 1 with new shapes and labels.

| Shape | Stage 1 | Stage 2 | Stage 3 | Stage 4 |
|---|---|---|---|---|
| Triangle | Position 2 | Same label as stage 1 | Position = stage 2's label | Same position as stage 2 |
| Square | Label 4 | Position 1 | Same label as stage 1 | Label = charged cell count |
| Circle | Position 4 | One position right of stage 1 (4 wraps to 1) | Position 3 | Position = stage 1's label |
| Cross | Label 1 | Label 3 | Label = stage 2's position | Same label as stage 3 |

#### The Pressure Vent (interrupt)
The first alarm fires 90 seconds into the round, then 60 to 120 seconds after each alarm ends. Each alarm lasts 45 seconds, and the Flight Director can trigger one manually. The Pathfinder sees three gauge levels (1 to 5) only while an alarm is live. The Flight Director has the case number's last digit. The Astrophysicist gets a pulsing alarm banner and three Vent buttons. A wrong gauge or a timeout is a strike; either way the vent goes back to sleep.

| Gauges | Vent |
|---|---|
| All three equal | Centre |
| Exactly two equal | The odd one out |
| All different, last digit 0 to 4 | The highest |
| All different, last digit 5 to 9 | The lowest |

---

## 6. The apps

All four seats are on one website. The home screen and three seats are a single file, `public/index.html`; the Pathfinder is `public/pathfinder.html`.

### 6.1 Home screen and routes
| Address | Opens |
|---|---|
| `/` | Home: round number, the four seat cards, links to the shard sheet and test sheet |
| `/#xenolinguist`, `/#astrophysicist` | The phone apps |
| `/#director` | Flight Director |
| `/#shards` | Print sheet: eight version-2 QR codes reading `AETHER-SHARD-1` to `AETHER-SHARD-8`, four per A4 page at 80 mm |
| `/#test` | Test sheet: the hull readings, directory and everything the Pathfinder would see for a round, with answers hidden behind reveal buttons |
| `/pathfinder` | Pathfinder cockpit |
| `?round=NNNN` | Prefills the round number on any page (used by the join QR) |

### 6.2 Phone apps (Xenolinguist and Astrophysicist)
**Scanning.** Tap Start the scanner and allow the camera. The app reads shard codes with jsQR. The first scan of one of your shards opens its relic; scanning someone else's shard says "wrong specialist", and an unassigned shard says "no signal". If the camera isn't available, a "Shard number" button lets you type the number in.

**Relics.** Each node rises out of its shard as a 3D hologram, anchored to the code's four corners. Without a camera (or inside the Claude preview), relics show as a 3D preview on a light grid. Controls: drag sideways to turn, drag up to tilt it toward you, pinch to zoom, double-tap or Reset view to reset. Rule card opens the node's rules at a reduced height so the relic stays visible. Done returns to the scanner.

| Node | Phone relic |
|---|---|
| The Conduits | A loom of strands in the round's colours, numbered and labelled |
| The Resonator | A wireframe crystal inside a grey ring; a waveform ring follows your tuner |
| The Jaw | A stone jaw with eight glyph teeth you press directly, a hinged upper jaw, a countdown, and a snap with a buzz on mistakes |
| The Descent | The ball maze: walls, rim, a hole at the core and a white ball. Turn on tilt (iPhone asks once) and Level the board (preview mode) |
| The Echo Chamber | Four numbered pads under an orbit of the four rule shapes (decorative) |
| The Pressure Vent | Three steaming stacks labelled Left, Centre and Right (decorative, no levels) |

**Live round.** When the page is served by the room server, the top bar shows the mission clock and strikes. Strikes and opened nodes sync to everyone, a reset from the Flight Director clears progress, and the end screen appears on every device. The Astrophysicist's phone shows a pulsing alarm banner during vent alarms; tapping it opens the Pressure Vent if it's been scanned.

**Mirroring to the Pathfinder.** Over the room's live channel, the phone sends the Descent ball (about ten times a second), the Jaw's pressed teeth, jaw angle and snaps, and the Resonator tuner value.

**Offline mode.** If the page isn't served by the room server (Claude preview, GitHub Pages), the apps still work alone with local strikes. The browser console then shows failed connection attempts, which is expected.

### 6.3 Flight Director
A laptop console with three panels:
- **Crew and join:** a QR code and the big round number, plus Xenolinguist, Astrophysicist and Pathfinder shown as Connected or Waiting.
- **Round control:** phase (Lobby, Live, Core breached, Link lost), round length, Start round, Reset (asks to confirm), New round, Trigger vent alarm. Below that, the node directory (seal word, shard, node, specialist, status) and the hull log (case number, charged cells, sector sigil). The hull log is typed by hand and saved per round on that laptop.
- **Comms log:** every join, start, strike, opened node and vent, timestamped by mission time.

The header shows the mission clock (it turns pink under a minute) and the strike count.

### 6.4 Pathfinder
Built on Kai's own cockpit prototype ("AETHER // Spatial Architectural Studio"): a white rotunda with a ring pedestal around a central well, webcam hand tracking, a procedural audio synth, and a 4-step calibration tutorial that ends in a cinematic intro.

**Controls**
| Input | Action |
|---|---|
| Open-hand horizontal flick | Turn the carousel one orb (or two on a long flick). While a node is engaged, move the selection instead |
| Thumb + index tap, or key [1] | Open the front orb's node. On a node you can act on (Conduits, Echo Chamber), engage it. While engaged, act on the selection (cut or press) |
| Thumb + middle tap, or key [2] | While engaged, release. Otherwise zoom the puzzle in or out |
| Arrow keys | Step between orbs, or move the selection while engaged |
| Esc | Release an engaged node |
| C | Turn the webcam on or off |
| T | Restart the calibration tutorial (also recalibrates taps) |
| M | Collapse or expand the sensor panel |
| Z | Toggle the cockpit rings and arch headers |
| S | Skip calibration (during the tutorial) |
| Mouse | Click acts as a tap; the wheel turns the carousel (or moves the selection while engaged) |

**The cockpit, after the clean-up**
- **The ring** holds eight orbs, each showing a small live model of its puzzle on a white plinth instead of a numbered disc. The plinth edge shows state: green when open, amber and flashing during a vent alarm, green when it's the front orb.
- **The puzzle stage:** the node at the front rises out of the central well in 3D, and the planetary core steps aside.
  - **Conduits:** a loom with caps and flickering strands; cut strands drop, and a green frame marks the selection.
  - **Resonator:** the crystal flashing its pulses; the ring spins with the Astrophysicist's tuner.
  - **Jaw:** the four glyph plates above a jaw that mirrors the phone (teeth going down, the upper jaw closing, red on a snap). Its teeth are blank, because which glyph is on which tooth belongs to the Xenolinguist.
  - **Descent:** the maze tilted toward you with red trapdoors and the live ball.
  - **Echo Chamber:** the stage's shape above four labelled pads.
  - **Pressure Vent:** three gauge columns that fill during an alarm, with a countdown.
- **The title strip** above the puzzle replaces all the screens. It shows the node name and state (Sealed, Open, Engaged, Alarm), the seal word, the room clock and strikes, the hull readings (case number, cells, sigil symbol), and one line of guidance or controls.
- **Removed:** the Center Stage screen, the four side bays and their frames, and the arch header outside the tutorial. The floor grid was thinned and the wall wireframe and louvres faded. The swipe rail only shows during the tutorial.
- **The sensor panel** (bottom left) holds the room link: round number, Join, link status, mission clock and strikes, plus the camera preview and log.

**Debug handle.** `window.__aether` gives read-only access to the round state, the room link and the selected orb. The automated tests use it.

---

## 7. Architecture

### One platform on Cloudflare
A single Cloudflare Worker named `artest` serves the static files from `./public` and runs the rooms. Each room is a Durable Object (class `Room`, binding `ROOMS`, SQLite-backed so it runs on the free plan), addressed by its round number. Any device can reach it at `wss://<host>/room/<round>/ws?role=<role>&id=<device>`, where role is `director`, `pathfinder`, `xeno` or `astro`. `GET /room/<round>/state` returns the room state as JSON.

### Room state
| Field | Meaning |
|---|---|
| `round`, `epoch` | Round number; `epoch` goes up on every reset so devices clear their progress |
| `phase` | `lobby`, `live`, `won` or `lost` |
| `durationMs`, `remainingAtMark`, `markAt`, `rate` | The clock: remaining time at the last change, when that was, and the speed (1, 1.15 or 1.3) |
| `strikes`, `solved`, `outcome` | Strike count, opened nodes, and why the round ended |
| `vent` | `active`, `index` (alarm number), `endsAt`, `nextAt` |
| `log` | The last 80 events with mission time, who and what |
| `players` | Connected devices and their roles (computed on each broadcast) |
| `serverNow` | Server time, so devices can correct for clock differences |

### Messages from devices
| Message | Sender | Effect |
|---|---|---|
| `hello` | Any | Logs the join |
| `length` | Flight Director, lobby | Sets the round length (8, 10, 12 or 15 minutes) |
| `start` | Flight Director, lobby | Starts the clock and schedules the first vent alarm |
| `reset` | Flight Director | New epoch: back to lobby, same length |
| `strike` | Any, live | Adds a strike, speeds the clock, ends the round on the third |
| `solved` | Any, live | Marks a node open; all five ends the round as won |
| `vent` | Astrophysicist, during an alarm | Records the vent (right or wrong) and puts the vent to sleep |
| `ventNow` | Flight Director, live | Fires a vent alarm immediately |
| `live` | Any | Relayed straight to the other devices and never stored (ball, Jaw, tuner) |
| `ping` | Any | Replies with server time |

After every change the room broadcasts the full state to every device. One Durable Object alarm drives both the round clock and the vent schedule. A device reconnecting with the same id replaces its old connection. Devices retry dropped connections with backoff (0.7 s doubling up to 8 s) and reconnect when the page becomes visible again.

### Deterministic rounds
`makeRound(roundNumber)` builds the whole round on every device from a seeded generator (`mulberry32`): case number, cells, sigil, the shard and seal assignment, strands, pulse pattern, glyphs, the Echo stages, the first vent gauges and the Descent maze. The order of random draws is fixed. **Adding or reordering draws changes every round for every device**, so new random content uses its own seeded generator: `jawTeethFor` (the Jaw's teeth), `ventGaugesFor` (gauges for each alarm) and the Pathfinder's Echo restart stages.

### Shared logic
The game logic lives once, in `public/index.html` between `/*LOGIC-START*/` and `/*LOGIC-END*/`. The Pathfinder build copies that block in, so change it there and rebuild the Pathfinder.

### Browser storage keys
| Key | Holds |
|---|---|
| `aether-round` | The last round number used on this device (shared between the phone app and the Pathfinder) |
| `aether-device` | A random device id for reconnecting |
| `aether-focal-<width>x<height>` | The phone camera's learned focal length for that video size |
| `aether-hull-<round>-<field>` | The Flight Director's hand-typed hull log |
| `aether-pinch-cal` | The Pathfinder player's tap calibration |

### Libraries
| Library | Version | Used for |
|---|---|---|
| three.js | r128 (cdnjs) | All 3D: phone holograms and the cockpit |
| jsQR | 1.4.0 (jsDelivr) | Reading shard codes and their corners |
| qrcode-generator | 1.4.4 (jsDelivr) | The shard sheet and join codes |
| MediaPipe Tasks Vision (HandLandmarker) | 0.10.14 (jsDelivr) | Pathfinder hand tracking |
| Tailwind CSS | Play CDN | The Pathfinder's HUD panels (from the prototype) |
| Fonts | Google Fonts | IBM Plex Sans and Mono (phones, Flight Director); Inter and JetBrains Mono (Pathfinder) |
| Wrangler | 4.x | Cloudflare local dev and deploy |

---

## 8. Tracking technology

### Phone AR
- **No WebXR on phones:** Safari on iPhone doesn't support it. The app shows the camera feed (`getUserMedia`) with a transparent Three.js canvas on top, and tracks in JavaScript, so it works the same on iPhone and Android.
- **Pose from the code:** jsQR returns the QR code's four corners. A homography gives the card's position and orientation in 3D, smoothed between frames. The hologram hides about 1.2 seconds after the card leaves view.
- **Version-2 QR codes:** version 1 codes have no alignment pattern, and testing showed they stopped decoding at any real angle. Version 2 decoded at every tested tilt up to 50°, with corners accurate to under a pixel.
- **Learning each phone's lens:** the focal length is estimated from the code's perspective while scanning. The median of recent estimates is saved per video size. Without it, the hologram sat right on the card but its 3D depth was off on some phones.
- **Real gravity for the ball:** the phone's motion sensor gives gravity, which is turned into the card's frame using the tracked pose. Tilting the card rolls the ball; tilting only the phone doesn't. The sensor's sign convention is detected automatically. iPhones need one permission tap (Turn on tilt).
- **Touch on relics:** the Jaw's teeth are picked by nearest tooth on screen with a forgiving radius; touches elsewhere turn and tilt the relic.
- **One code at a time:** jsQR reads one code per frame, so puzzles that need two cards tracked together aren't possible with the current approach.

### Pathfinder hand tracking
- **MediaPipe HandLandmarker** on the GPU (CPU fallback), one hand, detection and presence confidence 0.6, tracking confidence 0.5, video mode.
- **Taps are measured in real-world distance** using MediaPipe's world landmarks in metres. A tap starts when the thumb and fingertip are within the engage distance for two camera frames in a row, and ends only once they open past a wider release distance, so a held pinch doesn't flicker. Defaults: index 2.5 cm engage and 4.0 cm release; middle 2.8 cm and 4.4 cm.
- **Calibration in the tutorial:** step 2 measures the open hand, steps 3 and 4 measure how far each tap closes. Engage = closed + 25% of the gap, limited to between 1.6 and 3.5 cm; release = the larger of engage + 1.2 cm and closed + 50% of the gap. The result is saved per computer and printed in the sensor log as `[CAL]` lines. Press T to redo it.
- **From the original prototype (kept):** a three-finger rig (thumb, index, middle), one gesture at a time with a lock timer, a swipe measured over a 145 ms window on the wrist and knuckles (10.5% of the frame for one orb, 21% for two), and a mouse simulation mode when there's no camera.
- **Fixed during integration:** pressing [1] on the keyboard used to fire twice (once from the key, once from the simulated hand), so taps of the same kind within 250 ms are now ignored. Skipping the tutorial used to let the simulated hand fire a stray tap.

---

## 9. Visual design system

The look is taken from Kai's cockpit: white matte architecture, fine dark outlines, a navy well, grey hairline rings, small uppercase monospaced labels with `//` separators, and thin light titles.

| Element | Specification |
|---|---|
| Phone and laptop UI | Light grid background (`#EEF0F2`, 44 px squares), white panels with 1 px hairline borders, 6 to 8 px corner radius, no heavy shadows. Dark mode has its own values |
| Type | IBM Plex Sans 300 for titles, IBM Plex Sans for body, IBM Plex Mono for labels, buttons and readouts (uppercase, wide letter-spacing) |
| Colour | Ink `#1B2230`, success green `#138A50`, alert pink `#D2386B` (strikes, alarms) |
| Holograms | White `#F3F5F7` matte solids with dark outlines, navy `#2B3446` floors, wireframe octahedra, white pill labels in IBM Plex Mono |
| Pathfinder | Inter and JetBrains Mono, as in the prototype |

---

## 10. Repository, build, deploy and tests

### Layout
```
public/index.html          Home, both phone apps, Flight Director, shard sheet, test sheet
public/pathfinder.html     Pathfinder cockpit. GENERATED: never edit by hand
src/worker.js              Room server (Durable Object)
wrangler.jsonc             Cloudflare settings: Worker "artest", static files from ./public
package.json               Wrangler as a dev dependency
index.html                 Redirect for the old GitHub Pages address
tools/pathfinder/
  prototype.html           Kai's original cockpit prototype
  pf_block.js              Node content, actions, room link
  pf_pinch.js              Real-world tap detection and calibration
  pf_stage.js              3D puzzle stage, mini models, title strip
  build.py                 Combines them into public/pathfinder.html
tests/logic.test.js        10,000 rounds: generation, rules, every maze solvable
tests/pinch.test.js        Tap detection and calibration with synthetic hands
tests/e2e/                 Browser tests (Playwright), local library copies, camera video maker
docs/GAME_RULES.md         The game rules on their own
docs/screens/              Screenshots
CLAUDE.md                  Handoff notes for Claude Code
```

### Commands
```bash
npm install
npx wrangler dev                    # play locally at http://localhost:8787, rooms included
python3 tools/pathfinder/build.py   # rebuild the Pathfinder after changing tools/pathfinder/* or the shared logic
node tests/logic.test.js
node tests/pinch.test.js
```
Phones need HTTPS for the camera, so camera testing is done against the deployed address.

### Deploy
Push to `main`. Cloudflare Workers Builds (connected to the GitHub repository) runs `npx wrangler deploy`. The Worker name in the dashboard must stay `artest` to match `wrangler.jsonc`.

### Browser tests (`tests/e2e/`)
| Test | Checks |
|---|---|
| `phone.py` | Offline phone app: scanning, the Jaw, the Resonator, wrong-specialist and empty shards, print sheet |
| `phone_holo.py` | Hologram tracking and touch controls |
| `ball_maze.py` | The ball reaches the core on six mazes; the obvious route hits a trapdoor |
| `jaw.py` | Right order, wrong tooth, turning, the 20-second timer |
| `room.py` | Laptop plus two phones: clock sync, strikes, solving, reset, three strikes, reconnecting |
| `pathfinder.py` | Joining, cutting the Conduits, the Echo Chamber |
| `four_devices.py` | All four seats: vent alarms, the live ball and Jaw in VR |
| `vent_timeout.py` | Alarm schedule and the timeout strike |
| `round_timer.py` | The round ending when time runs out (needs a 5-second length temporarily allowed in `src/worker.js`) |

Setup and the fake-camera videos are described in `tests/e2e/README.md`. All of these passed on the final build.

---

## 11. Hosting, accounts and access

| Service | Details |
|---|---|
| **Cloudflare** | Free plan. Worker `artest` at `artest.kai-216.workers.dev`, connected to the GitHub repository with automatic builds on push. Durable Objects on the free plan are SQLite-backed, with 100,000 requests a day free. Going over makes requests fail until 00:00 UTC rather than creating a bill; the paid plan ($5/month) is only needed for much larger scale |
| **GitHub** | `cognitonow/ARtest`, public. The old GitHub Pages site still serves the redirect at the root, which opens the apps in offline mode |
| **Claude** | Claude has pushed directly to the repository using Kai's fine-grained token (Contents: read and write on this repository only, set to never expire at Kai's choice). The token is not stored in any file. Anyone with the token can change the site, so keep it private and revoke it if it leaks. The Cloudflare connector in Claude can read the account but can't create Workers or link GitHub |
| **Claude artifacts** | A preview of the phone app and the first design doc. Claude-hosted pages can't use the camera, which is why the game moved to its own hosting |

---

## 12. Decisions log

| Decision | Why |
|---|---|
| Original rules instead of the KTANE manual | The manual's tables are copyrighted, and original rules could be designed for four seats instead of retrofitted |
| Three-way information split | Stops one fast reader carrying the team, which is KTANE's known weakness with large groups |
| Two parallel tracks (Xenolinguist and Astrophysicist) | A single relay chain was too slow; parallel work keeps everyone busy |
| Real words for all names | Kai's request: no acronyms or codes in anything players see |
| Web apps, not native | No installs, one codebase, iPhone and Android alike. Holograms sit on a card on a table, which marker tracking handles well; native only pays off for room-scale AR |
| Version-2 QR shards | Version 1 failed at angles in testing |
| A maze generated per round | The original four mazes were dead-end trees with one route each, so a trapdoor on the route made them unsolvable for a rolling ball |
| Every phone puzzle physical and touchable | Kai's direction: tilt-to-roll maze, crocodile-teeth jaw, a dice game and a four-level totem |
| Cockpit look on every app | Kai's direction, from a screenshot of the cockpit |
| Cloudflare (Workers and Durable Objects), not laptop-hosted peer-to-peer | Works on locked-down office Wi-Fi and mobile data, survives reloads, free plan. Laptop hosting was the no-account fallback |
| Pathfinder built on Kai's prototype | Kai's request: the prototype is the foundation |
| One hand, real-world tap distances, calibration | Taps used to fire at 92% of palm length (a relaxed hand reaches that), and two hands could swap mid-gesture |
| 8 orbs on the ring | Matches the 8-node plan |
| The Pathfinder keeps cutting the Conduits and pressing the Echo Chamber | Gives the headset seat hands-on moments (the Star Map dial will add a third) |
| Live mirroring of phone actions into VR | Makes it one shared space: the Pathfinder can warn as the ball nears a trapdoor |
| Eight teeth on the Jaw, not ten | Ten made each tooth too small to read on a phone |
| No screens in the cockpit; mini models on the ring; one title strip | Kai's direction: the cockpit had too much on it |
| [2] zooms the puzzle when nothing is engaged | Its old job (pinning cards to side bays) went with the screens |

---

## 13. Known limitations

- **Real hardware is untested for the newest input:** webcam tap calibration and the ball's real-gravity tilt were tested with synthetic data and simulated input, not real hands or phones.
- **The Claude preview can't use the camera,** and the Pathfinder there can't load MediaPipe. Use the Cloudflare address.
- **The design doc in Claude Docs is out of date** (it describes the Glyph Lock, fixed mazes and six orbs). `docs/GAME_RULES.md` and this README are current.
- **Timings are first guesses:** the Jaw's 20 seconds, the round lengths and the vent schedule all need playtesting.
- **The Pathfinder loads Tailwind from its Play CDN,** which is meant for prototyping, not production.
- **Shared logic is copied into the Pathfinder at build time,** so forgetting to rebuild after a logic change leaves the two apps disagreeing.
- **The first vent alarm can arrive while the crew is still finding shards,** and the Astrophysicist must have scanned the vent shard to answer it.
- **Answers are checked on the device that acts;** the room trusts the result it's sent.
- **The cockpit's front-of-pedestal log** (three log lines) was kept; it wasn't part of the clean-up request.
- **GitHub Pages** still opens the apps, but only in offline mode.

---

## 14. Roadmap

The eight-node set and build phases agreed so far:

| Node | Phone (hands) | Pathfinder (eyes) | Status |
|---|---|---|---|
| The Descent | Tilt-to-roll ball maze | Trapdoors, live ball | Built |
| The Jaw | Crocodile teeth before the snap | Glyph plates, live jaw | Built |
| The Echo Totem | Four stacked rings to flick and set | The shape on each level | Planned (replaces the Echo Chamber's flat pads) |
| The Star Map | Walk around the card until stars line up into four digits | Beacon direction; dials the code into a lock | Planned |
| The Conduits | Pluck strands to reveal colour; cut by swiping (planned) | Caps and flicker; cuts (current) | Built (pluck and swipe-cut planned) |
| The Resonator | Flick a ring to spin it; transmit as it passes your frequency (planned) | Pulses, live ring | Built as a tuner slider (spin planned) |
| The Dice Vault | Roll four dice, hold some, match the vault total | The vault number | Planned |
| The Pressure Vent | Turn the right valve wheel (planned) | Alarm, gauge levels | Built with three buttons (valve planned) |

Still to do after the nodes: a sound for each node, the debrief screen (time per node, strikes and where they happened, who finished what), timer tuning from playtests, a WebXR headset mode for the Pathfinder (Quest hand tracking is far more accurate than a webcam), a "Join this round" flow for the headset, and moving answer checking to the room server.

---

## 15. Design principles for the Pathfinder

Kai's rules for VR experiences, to apply as the Pathfinder moves into a headset:

1. **A transition from reality.** Every experience needs a beginning that moves the player from the real world into VR, such as fading from black or a series of orienting actions. The calibration tutorial and its cinematic intro do this today.
2. **Seated, with a virtual seat.** Experiences are seated, so the scene should include a seat and the player should be told about it. The cockpit doesn't have one yet.
3. **Scale for wow.** Size and scale are the quickest way to impress in VR, which suits the Monolith setting.
