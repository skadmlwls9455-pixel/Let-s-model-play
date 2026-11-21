# Lane A report — food pixel art (`lane/7-a`)

## Conclusion

Every id of `SPRITES.md` is drawn and pushed: **78 ids, 141 frames, 90 KB** in `js/cook-sprites.js` (limit 400 KB).
No canvas was grown, no id was added, removed or resized. `node tools/test-cook-sprites.js` passes, `npm test` passes.
Only new files plus the empty base `js/cook-sprites.js` were touched; no shared file, no existing line elsewhere.

The five dishes at 4x: `wip/round7/shots/A/dishes-4x.png` (cake, gyeran, jeon pale / golden / crisp, jumeokbap, kkochi).

| dish | what makes it readable |
| --- | --- |
| `dish.jeon` (3 bands) | cut pieces **stacked** on a round wicker tray, pale cut edges with green strands under a browned top, one piece lifted on chopsticks, a dish of soy dip; the band re-maps the skin colours only |
| `dish.gyeran` | five standing slices in a rising row on a long white plate with a blue line, the rolled seam on every cut face, golden skin on top, a green sprig and a dab of ketchup |
| `dish.jumeokbap` | two white triangles leaning on each other on a green leaf plate, a dark seaweed strip on each, sesame, two yellow radish slices |
| `dish.kkochi` | two skewers crossed as a V on a pale blue round plate; strawberry, green grape, tangerine with a sugar shell (lighter lamp-side rim, two glints each) |
| `dish.cake` | a wedge on a square white plate with a pink line: cream top, sponge / cream with berry pieces / sponge on the cut face, a whole strawberry on top, half a berry on the plate |

## What was built

- `js/cook-sprites.js` — global `COOK_SPR` (contract C1: `get`, `ids`, `info`; also `PAL`, `EXTRA`, `RAMPS`, `version`).
  Sprites are small painter functions in **palette characters** (layers, plain shapes, hand-typed rows), stamped with an
  automatic 1-px selective outline (lamp side lighter, ground side darker, never black) and a contact shadow. Decoded on the
  first `get`, then cached. No DOM, no clock, no random source, ASCII only. Only what `get()` returns is the contract.
- `tools/make-food-sheets.js` — contact sheets to `tests/evidence/food/` (`dishes`, `jeon`, `gyeran`, `jumeokbap`,
  `kkochi`, `cake`, `small`: every id, every frame, 4x, on paper and on dark); `--check` compares bytes; `--one <ids>` is the
  review sheet used while drawing.
- `tools/test-cook-sprites.js` — every listed id with size, anchor, frame count; frame clamping; palette only (Apollo 46 +
  FOOD 24 checked against `js/cook-art.js`, at most four extra); alpha 0 / 255; no black outline pixel; at least 60 % of the
  edge pixels dark (40 % for `fruit.wash`, whose water rings are meant to melt into the basin); no empty frame; frames of one
  id differ; two loads paint the same bytes; file size; ASCII; no random / clock / DOM. `--lint` lists orphan pixels and
  close colour pairs as warnings (78 frames warn today; most are flecks, seeds and glints).
- `docs/FOOD_ART.md` — the format, how to add a sprite, the checklist, the sheets and the test.

## For lanes K and T

- `mix.jeon`, `mix.egg`, `mix.rice`, `mix.cake` are the **contents only**: footprint ellipse 56 x 32 at (2, 3) of the canvas.
  Put the mix anchor on the `bowl` anchor.
- `jeon.pan` is the batter / pancake only (the full pancake is 70 x 44), `gyeran.pan` the egg only (full sheet 68 x 44, the
  roll grows at the left end): put their anchor on the pan's cooking-floor centre (`pan.square` anchor).
- `fruit.wash` is the fruit with water rings only: anchor on the `basin` anchor.
- `greens`, `gyeran.board`, `rice.shape`, `fruit.board`, `skewer`, `kkochi.coat` are the food only (the board is the kitchen's).
- `tin`, `oven`, `cake.base`, `pot.rice`, `pot.syrup`, `basin`, `bowl`, `pan.square`, `jug` include their container.
- `rice.shape` frame 4 is the same triangle as in `dish.jumeokbap`; the fruits of `fruit.piece`, `skewer`, `kkochi.coat` are
  the fruits of `dish.kkochi`.

## Palette

Apollo 46 + FOOD 24, plus **two extra colours** (four allowed): `#f7ecd3` (warm white shade for rice, cream, egg white) and
`#ffb0a6` (berry flesh).

## Existing lines I changed

None outside `js/cook-sprites.js` (the empty base written for this lane).

## Decisions the owner should confirm

- The look of the five dishes (`wip/round7/shots/A/dishes-4x.png`).
- `dish.gyeran` carries a small dab of ketchup, `dish.jumeokbap` two slices of yellow pickled radish: both are garnish only.

## Player-facing text

None. No sprite contains a letter or a digit.

## Tests

- New: `node tools/test-cook-sprites.js`, `node tools/make-food-sheets.js --check`. **Please add both to `npm test` and CI.**
- Run: `npm test` (all green), the two above. No slow suite was run: this lane changes no runtime behaviour until K and T
  draw the sprites.

## Screenshots (`wip/round7/shots/A/`)

`dishes-4x.png`, `dishes-2x-wood.png`, `small-6x.png` (icons, table sprites, step pictograms). All frames: `tests/evidence/food/`.

## Needs another lane

How the sprites look inside the kitchen stage, the recipe book and on the play-room table can only be judged once K and T
draw them there.

## Left out / weak / not verified

- Not verified in the running game (no consumer yet), on a real phone, or at 2.625 device ratio: the sprites are data, the
  consumer chooses the scale.
- Weakest reads (by my own look): `ing.gim`, `ing.sugar`, the early frames of `rice.shape` (plain white mounds),
  `gyeran.board` (the spiral on the cut faces is only a hint), `greens` (reads as green onion more than seaweed),
  `kkochi.coat` frame 1 (half glazed is subtle).
- The drawing helpers and state groups were drawn by three parallel artists and reviewed once by me; the dishes got two passes.
