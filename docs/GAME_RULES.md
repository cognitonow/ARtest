# Project Aether: game rules

The current rules, taken from the code (`public/index.html` and `src/worker.js`). Every round is generated from its 4-digit round number, so all four devices see the same round.

## The round

| Rule | Value |
|---|---|
| Length | Chosen by the Flight Director in the lobby: 8, 10 (default), 12 or 15 minutes |
| Strikes | Three strikes and the link is lost |
| Strike penalty | The clock runs 15% faster after strike 1 and 30% faster after strike 2 |
| Win | The Conduits, the Resonator, the Jaw, the Descent and the Echo Chamber all open: "Core breached" |
| Lose | Time runs out, or the third strike |

## Hull telemetry (the Pathfinder reads it; the Flight Director logs it)

| Reading | Values | Used by |
|---|---|---|
| Case number | A codename (Heron, Osprey, Marlin, Cypress, Granite, Vesper, Pelican, Linden) and four digits | Last digit: the Resonator, the Pressure Vent |
| Power cells | Four capsules, 1 to 4 of them charged | The Conduits, the Echo Chamber |
| Sector sigil | Spiral, Eye, Crown or Wave (the Pathfinder sees the symbol, not the name) | The Jaw |

## Shards and seal words

Eight printed shards. Each round assigns six of them to the nodes; the other two show "no signal". Each node shows a seal word to the Pathfinder (from Harbour, Falcon, Meridian, Thistle, Juniper, Orchid, Summit, Willow, Quarry, Tundra, Beacon, Cinder). The Flight Director's directory turns the seal word into a shard number and the specialist who owns it. Only the owner's phone opens a shard.

## The nodes

| Ring slot | Node | Phone owner | Finished by |
|---|---|---|---|
| 01 | The Conduits | Astrophysicist | Pathfinder (cuts) |
| 02 | The Resonator | Astrophysicist | Astrophysicist (transmits) |
| 03 | The Jaw | Xenolinguist | Xenolinguist (presses teeth) |
| 04 | The Descent | Xenolinguist | Xenolinguist (rolls the ball) |
| 05 | The Echo Chamber | Xenolinguist | Pathfinder (presses pads) |
| 06 | The Pressure Vent (interrupt) | Astrophysicist | Astrophysicist (vents) |
| 07, 08 | The Star Map, the Dice Vault | Not built yet | |

### The Conduits
- **Pathfinder:** 4 to 6 strands, each with a cap (hollow ring or solid dot); some flicker. No colours.
- **Astrophysicist:** each strand's colour.
- **Flight Director:** the charged power cell count.
- **Rule:** charge = colour value (Amber 3, Violet 2, Teal 1, Grey 0), plus 1 for a solid dot, then doubled if the strand flickers. Sever every strand whose charge equals the number of charged cells. Every round has 1 to 3 such strands.
- **Action:** the Pathfinder engages the node, swipes to a strand and cuts it with [1]. Cutting a wrong strand is a strike.

### The Resonator
- **Pathfinder:** the crystal flashes four pulses, each short (0.3 s) or long (0.9 s), then goes dark for 2 s.
- **Flight Director:** the case number's last digit (zero counts as even).
- **Astrophysicist:** this table, a tuner (400 to 600 kilohertz) and Transmit. A wrong frequency is a strike.

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

### The Jaw
- **Pathfinder:** the round's four glyphs on plates, no names.
- **Flight Director:** the sector sigil.
- **Xenolinguist:** the 4 × 4 lexicon and the reading orders, and a jaw with eight glyph teeth (the four plus four decoys).
- **Rule:** press the four teeth in the order you meet those glyphs when reading the lexicon the sigil's way. The first correct tooth starts the jaw closing: 20 seconds to finish. A wrong tooth or the timer running out snaps it shut: a strike, and the teeth reset.

Lexicon, row by row:

| | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| Row 1 | Comet | Fork | Almond | Ladder |
| Row 2 | Twin Moons | Knot | Arrowhead | Broken Ring |
| Row 3 | Spine | Hourglass | Lantern | Hook |
| Row 4 | Gate | Star Seed | Ripple | Claw |

| Sigil | Reading order |
|---|---|
| Spiral | Clockwise spiral inward from top-left: row 1, down column 4, back along row 4, up column 1, then the inner four clockwise |
| Eye | Column by column, left to right, each top to bottom |
| Crown | Row by row, bottom to top, each left to right |
| Wave | Snake: row 1 left to right, row 2 right to left, row 3 left to right, row 4 right to left |

### The Descent
- A new maze every round: three rings of twelve sectors (named by clock hours) around a core, with a two-sector opening into the core.
- **Two trapdoors:** one always sits on the obvious route; a safe detour exists. Only the Pathfinder sees them (glowing red). The Flight Director relays them as ring and hour, for example "Middle 4".
- **Xenolinguist:** tilts the printed card (or the phone in preview, or drags) to roll the ball into the hole at the core. A trapdoor is a strike and the ball returns to the start.
- The ball's position is mirrored live into the Pathfinder's maze.

### The Echo Chamber
- **Pathfinder:** each stage shows a shape (Triangle, Square, Circle or Cross) and four pads labelled 1 to 4 in a shuffled order. The Pathfinder presses: engage, swipe to a pad, [1].
- **Flight Director:** keeps the history of each stage's press (position and label) and the power cell count.
- **Xenolinguist:** this rule table. "Position N" is the pad in slot N from the left; "Label N" is the pad showing N.
- **A wrong press** is a strike, and the node restarts at stage 1 with new shapes and labels.

| Shape | Stage 1 | Stage 2 | Stage 3 | Stage 4 |
|---|---|---|---|---|
| Triangle | Position 2 | Same label as stage 1 | Position = stage 2's label | Same position as stage 2 |
| Square | Label 4 | Position 1 | Same label as stage 1 | Label = charged cell count |
| Circle | Position 4 | One position right of stage 1 (4 wraps to 1) | Position 3 | Position = stage 1's label |
| Cross | Label 1 | Label 3 | Label = stage 2's position | Same label as stage 3 |

### The Pressure Vent (interrupt)
- **Timing:** the first alarm fires 90 seconds into the round, then 60 to 120 seconds after each alarm ends. Each alarm lasts 45 seconds. The Flight Director can also trigger one.
- **Pathfinder:** the three gauge levels (1 to 5), shown only during an alarm.
- **Flight Director:** the case number's last digit.
- **Astrophysicist:** the rule and three Vent buttons. A wrong gauge or a timeout is a strike; either way the vent goes back to sleep.

| Gauges | Vent |
|---|---|
| All three equal | Centre |
| Exactly two equal | The odd one out |
| All different, last digit 0 to 4 | The highest |
| All different, last digit 5 to 9 | The lowest |
