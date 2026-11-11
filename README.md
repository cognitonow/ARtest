# Project Aether

A four-player asymmetric co-op puzzle game, inspired by *Keep Talking and Nobody Explodes*. Nobody can solve a node alone: one player sees it, one holds the hull readings, one holds the rule.

| Seat | Device | Opens |
|---|---|---|
| **Pathfinder** | Laptop browser with webcam hand tracking (headset mode planned) | `/pathfinder` |
| **Flight Director** | Laptop browser | Home → Flight Director |
| **Xenolinguist** | Phone, camera + printed shards | Home → Xenolinguist |
| **Astrophysicist** | Phone, camera + printed shards | Home → Astrophysicist |

**Live:** https://artest.kai-216.workers.dev (Cloudflare). Every push to `main` deploys automatically.

## What's in this repository

```
public/index.html          Home, both phone apps, Flight Director, shard print sheet, test sheet (one file)
public/pathfinder.html     The Pathfinder cockpit. GENERATED: do not edit by hand (see below)
src/worker.js              Room server: one Cloudflare Durable Object per round number
wrangler.jsonc             Cloudflare settings (Worker name "artest", static files from ./public)
index.html                 Redirect for the old GitHub Pages address (offline mode only)
tools/pathfinder/          Builds public/pathfinder.html from the original cockpit prototype
tests/                     Unit tests (Node) and end-to-end browser tests (Playwright)
docs/GAME_RULES.md         Every node's current rules, tables and timings
CLAUDE.md                  Handoff notes for Claude Code: architecture, invariants, workflow
```

## How it fits together

- **Rounds are deterministic.** Every device builds the same round from the 4-digit round number (`makeRound` in the shared logic). Only live state travels over the network.
- **Rooms.** Devices connect to `wss://<host>/room/<round>/ws?role=<director|pathfinder|xeno|astro>&id=<device>`. The room keeps the timer, strikes, solved nodes, the Pressure Vent alarm and a log, and broadcasts the full state after each change. Messages: `hello`, `start`, `reset`, `length`, `strike`, `solved`, `vent`, `ventNow`, `live` (relayed movement such as the rolling ball, never stored), `ping`.
- **Shared game logic** lives once, in `public/index.html` between `/*LOGIC-START*/` and `/*LOGIC-END*/`. The Pathfinder build copies it in. Change it there, then rebuild the Pathfinder.
- **Offline mode.** If the page isn't served by the room server (claude.ai preview, GitHub Pages), the apps work alone: scanning, holograms, rule cards and local strikes.

## Run it locally

```bash
npm install
npx wrangler dev          # http://localhost:8787  (rooms work locally too)
```
Phones need HTTPS for the camera, so test the camera against the deployed address.

## Rebuild the Pathfinder

```bash
python3 tools/pathfinder/build.py
```
It takes `tools/pathfinder/prototype.html` (the original cockpit) and adds three layers: `pf_block.js` (node content, actions, room link), `pf_pinch.js` (real-world tap detection and calibration) and `pf_stage.js` (the 3D puzzle stage and the mini models on the ring). The output is `public/pathfinder.html`.

## Tests

```bash
node tests/logic.test.js      # 10,000 rounds: generation, rules and every maze solvable
node tests/pinch.test.js      # tap detection and calibration with synthetic hands
```
Browser tests (Playwright) are in `tests/e2e/`. See `tests/e2e/README.md`.

## Shards

Open `/#shards` and print at 100% on A4. Each card is a version-2 QR code reading `AETHER-SHARD-<n>`. The game reassigns which node each shard holds every round.

## Status

Built: the room server, Flight Director, both phone apps, and the Pathfinder cockpit with the 3D puzzle stage. Playable nodes: the Conduits, the Resonator, the Jaw, the Descent, the Echo Chamber and the Pressure Vent interrupt.

Not built yet: the Echo Totem, the Star Map (code dial), the Dice Vault, physics versions of the Conduits, Resonator and vent valve on the phones, sound, the debrief screen and a WebXR headset mode.
