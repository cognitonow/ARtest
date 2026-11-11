# Browser tests

End-to-end tests in Playwright (Python) with headless Chromium. They play the game the way people do: phones scanning shards through a fake camera, the Flight Director running a room, the Pathfinder cutting and pressing, all against a local copy of the room server.

## Setup
```bash
pip install playwright pillow numpy
python3 -m playwright install chromium        # or point CHROMIUM at an existing Chromium
npx wrangler dev --port 8787 --ip 127.0.0.1   # in another terminal, from the repository root
python3 tests/e2e/make_camera_video.py 1      # fake camera showing shard 1 (about 30 MB, not committed)
python3 tests/e2e/make_camera_video.py 6
```
`vendor/` holds local copies of three.js r128, jsQR 1.4.0 and qrcode-generator 1.4.4: the tests serve them in place of the CDN copies so they run without internet. Set `VENDOR` to use another folder.

## Tests
| File | What it checks | Needs |
|---|---|---|
| `phone.py` | Phone app offline: scanning, the Jaw, Resonator, wrong-specialist and empty shards, print sheet | camera video 1 |
| `phone_holo.py` | Hologram tracking and touch controls | camera video 1 |
| `ball_maze.py` | The Descent: the ball reaches the core on six mazes; the obvious route hits a trapdoor | |
| `jaw.py` | The Jaw: right order, wrong tooth, turning, the 20-second timer | |
| `room.py` | Laptop + two phones: clock sync, strikes, solving, reset, three strikes, reconnecting | wrangler dev |
| `pathfinder.py` | Pathfinder: joining, cutting the Conduits, the Echo Chamber | wrangler dev |
| `four_devices.py` | All four seats in one round: vent alarms, the live ball and Jaw in VR | wrangler dev |
| `vent_timeout.py` | Alarm schedule and the timeout strike (takes about a minute) | wrangler dev |
| `round_timer.py` | The round ending when the clock runs out (needs a 5-second test length temporarily allowed in `src/worker.js`) | wrangler dev |

`phone.py`, `phone_holo.py`, `ball_maze.py` and `jaw.py` serve `public/` themselves; the others use `http://127.0.0.1:8787`. Some tests reuse helpers from each other, so run them from this folder or by path.
