# Project Aether: notes for Claude Code

Read `README.md` first, then `docs/GAME_RULES.md`.

## Workflow
- Pushing to `main` deploys to Cloudflare (Workers Builds runs `npx wrangler deploy`). Run the tests before every push.
- `public/pathfinder.html` is generated. Edit `tools/pathfinder/*` and run `python3 tools/pathfinder/build.py`.
- The shared game logic is the block between `/*LOGIC-START*/` and `/*LOGIC-END*/` in `public/index.html`. After changing it, rebuild the Pathfinder so both apps agree.

## Game invariants
1. **Three-way split.** Every node needs a fact from the Pathfinder, one from the Flight Director (hull readings or logged history) and one from a phone (the rule). Never show a seat information that belongs to another seat. Decorative models must not look like readings.
2. **Rounds are deterministic** from the round number via `mulberry32`. `makeRound` draws random numbers in a fixed order: adding or reordering draws changes every round for every device. Add new draws at the end, or use a separately seeded generator (as `jawTeethFor` and `ventGaugesFor` do).
3. **The room is the referee for shared state:** timer, strikes, solved nodes and vent alarms. Devices check answers locally and report the result.
4. **The Flight Director records, never computes.** No automatic solving or flags on the console.
5. **Real words, not codes or acronyms,** in everything players see (node names, seal words, codenames).

## Pathfinder invariants (from the original prototype, keep them)
- Single-file app. The camera request must start synchronously inside the click handler. The webcam video element keeps real dimensions at opacity 0.001; never `display: none`.
- Three-finger rig (thumb, index, middle). One gesture at a time (`gestureMutex` with a lock timer).
- Swipe moves the carousel; [1] (thumb + index) opens or engages; [2] (thumb + middle) releases, or zooms the puzzle when nothing is engaged. While a node is engaged, swipe moves the selection instead of the carousel.
- Taps are judged on MediaPipe world landmarks in metres, with separate engage and release distances, two camera frames in a row, and per-player calibration saved in `localStorage` (`aether-pinch-cal`). The calibration runs inside the 4-step tutorial; [T] reruns it.
- Keep the dirty-signature caching on canvas textures and avoid per-frame allocation in hot loops.

## Phone app notes
- Holograms are anchored to the QR code's corners (`jsQR`) with a homography pose. The focal length is learned per phone from the code itself (`estimateFocal`). Shards must stay version-2 QR codes: version 1 has no alignment pattern and fails at angles.
- No WebXR on the phones (iPhone Safari doesn't support it): camera feed plus a transparent Three.js canvas.
- Every relic follows the cockpit look: white matte forms, fine dark outlines, navy floor, small monospaced uppercase labels.
