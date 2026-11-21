# Lane K-B report — kitchen close-up art (`js/cook-art.js`, `tools/test-cook.js`)

Branch `lane/k-b`, base `d88ab74`.

## Conclusion

Every item of WP-B is in. The new art is:

- the stove station;
- bleed painting in stage coordinates (`view`);
- the slide bases (`base`) and the carried object (`carry`);
- the close-up plate (`revealScene({geo:'close'})`, REV2);
- the `heat` and `again` icons;
- a margin argument for `shake`.

`node tools/test-cook.js` gives **225 passed, 2 failed**. Both failures are the expected ones: the '다시' verb label and the `normStore` potOld check. They need WP-A's two sim edits in `js/cook.js`. With those two edits applied by hand in a scratch copy, the run was 227 passed, 0 failed (the edits were then reverted).

Results against the brief's acceptance list:

- **Seam:** 0 differing pixels (4 stations x 3 offset pairs).
- **Carry continuity:** 0 mismatching object pixels for pan, jeon and cut, and also for cut against REV2 at t 3.
- **REV2:** bounds hold, and garnish shows only from t 5.
- **Stove:** stove, knob and grate pixels are Apollo only.
- **Existing art checks** (oil ring, heat-on, band change, landing, 96-frame loop) all pass with the flip step on the stove.
- **Icons:** every icon pair differs in at least 25 % of the union of their masks.
- **Determinism:** all new painters give the same bytes in a fresh instance.

## Changes (all in `js/cook-art.js` unless named)

- **GEO**
  - `rest.spatula` moves to [100,112].
  - New: `flipArrow` [72,110], `knob` [96,148], `knob0` [48,148], `knobDot` [106,142], and `rev2` (exactly the spec's values).
  - Unchanged: `food`, `box0`, `markBase`, `cross`, `dish`, `small`, `board`, `pan`.
- **Station backgrounds as pure functions of the stage pixel**
  - New functions: `wallAt`, `trimAt`, `woodAt`, `stoveAt`, `bgAt`, `paintBg`.
  - The wall is a 7-row period anchored at stage row 2. It is unlit and continues upward without end.
  - The trim sits at rows 18-20.
  - The wood uses the bgStep strip list, then 11-row strips, seed 31, and the same lamp pool.
  - `bgStep` now paints through `bgAt`. Its bytes are identical to before: checked with tapScene, sliceScene, the old revealScene and counter against the base file.
- **Stove (13.2):** `stoveAt`, `stoveProps`, `bgStove(b, on)`.
  - Light enamel (s5) with the lamp pool as a 50 % s6 checker, and an s4 line at row 21.
  - Front lip at rows 136-139: s6, s5, s4, s3.
  - Knob panel at rows 140-157: s3, with s2 on the last row.
  - Oven door below row 157 in the bleed: s4, with an s3 seam every 10 rows.
  - Four coal grate bars with an s2 lamp-side column, painted before the pan.
  - Two 11x11 knobs. The right knob's pointer turns to 2 o'clock when the heat is on, and its 2x2 dot goes s2 → a2.
- **`flipScene`**
  - Always on the stove: new `stoveBase(ph)` caches `stove`, `stove-heat-0` and `stove-heat-1`. `prewarmFlip` and `prewarmTap` warm these keys.
  - The arrow is drawn at `GEO.flipArrow`, no longer relative to the spatula.
  - No other input, beat or cache key changed.
- **`view(b, o)`**
  - Paints one station's background over every row of any buffer, columns x0..x1-1, with the stage shifted by (ox, oy).
  - For the stove it adds grates and knobs (off) in stage coordinates.
  - board and plate use the counter wood.
- **`base(b, o)`**
  - counter: bgStep.
  - stove: bgStove, plus the pan, plus flames and the knob on.
  - board: the cached board with the knife at `GEO.rest.knife`.
  - plate: bgStep plus the REV2 plate and the soy dish.
  - Every base includes the frame.
- **`carry(b, o)`**
  - Paints the object from a sprite cached by its inputs:
    - pan: `pan(PAN_STEP)` plus the raw face, as the cold flipScene paints them;
    - jeon / cut: sliceScene's outlined face, with gap w4, both lines cut for 'cut'.
  - Drawn at y - lift. The shadow is a 50 % checker of `shadeAt`, 3 px right and 3 px down of the drawn object, only where the object is not painted. Clipped to any buffer.
- **`revealScene({geo:'close', t})`** (new `revealClose`)
  - t null: the rest frame with still steam.
  - t ≤ 3: `carry('cut')` at lift 2 with its shadow. t 4: lift 1.
  - t 5: the plated look (garnish 8, glints [3,9], seeded nudge, gap J1), squashed rx+2 / ry-1, with a contact shadow.
  - t ≥ 6: rest, with fxSteam, the two twinkles and the flare on the 96-frame loop.
  - Without `geo`, the old REV path is unchanged.
- **Icons:** `heat` (a flame, amber, with a pale core and a side lick) and `again` (a loop arrow with an arrowhead). Both use `ICON_K` colours and are added to `ICON_G`, so they appear in `ICONS`.
- **`shake(b, dx, dy, m)`:** the margin m defaults to 2 (the old behaviour). m 0 moves the whole buffer with edge repeat.
- **Header comment:** updated (ASCII).
- **API:** adds `view`, `base`, `carry`, `bgStove`.

## Decisions

- **Grate bars** are 3 x 8, at rows 40-47 and 127-134 (the brief gives both "3x7" and those row ranges, which are 8 rows). I followed the row numbers.
- **REV2 `prx` / `pry`** are read as the outer half sizes *including* the 1-px outline. The plate ellipse is drawn at rx 38 / ry 25, so outline plus plate fill stage x 33..111 exactly. Its shadow is shifted 1 right and th+2 down, so it also stays in 33..111.
- **Cut geometry in `carry('cut')` and REV2** follows the sim: line 0 at food y + offs[0], line 1 at food x + offs[1]. The old `plated()` puts line 0 one row higher. That is why carry('cut') equals the board's last frame pixel for pixel.
- **REV2 squash at t 5:** pieces at the same cut positions, jeon rx 31 / ry 18, lift 0, contact shadow 2.
- **The plated look stays at t 6 and after,** so the only visible change at t 5 is the landing.
- **No steam or twinkles before t 6.** t 5 is the landing frame and has no steam, matching "at rest from t 6".
- **`carry` defaults:** with `o.dents` / `o.band` missing they come from `o.look`. Without a look the band is 0 for the pan and 1 otherwise. `o.seed` is accepted and changes nothing, because the dents pick the texture as everywhere else.
- **The stove's lamp-pool checker** follows the spec literally (a 50 % s6 checker inside r 40 from (6,10)). On the enamel it reads as a soft dotted light patch at the upper left.

## Player-facing text

None changed in my files. The only text changes are in the tests: the reveal verb label check now expects '다시' (was '돌아가기'), and '다시' is added to VOCAB in test 14.

## Checks added (`tools/test-cook.js`)

- **Load:** `TUNE_HASH === 2827089308` (pin).
- **10. normStore potOld:**
  - a valid potOld is kept: plain objects only, each ≤ 2048 bytes, at most 4, the first valid entry first, order kept;
  - junk entries (number, string, null, array, an oversized object) are dropped;
  - the existing '{{{' → 6-key check stays.
  - Fails until WP-A merges.
- **1:** reveal verb '다시' (fails until WP-A merges). **14:** VOCAB gains '다시'.
- **New section 17 (spec 15.1 a-h):**
  - exports and GEO values;
  - (a) the seam for 4 stations x 3 offsets into 84x190; view paints every pixel and only columns x0..x1;
  - (b) the wall period is 7 above the stage (counter and stove); below row 157 the wood glue lines are 11 apart;
  - (c) carry continuity for pan, jeon and cut against the still scenes, and cut against REV2 at t 3; the shadow is a checker of darker pixels; clipping into a small buffer;
  - (d) REV2:
    - pixels in x 33..111 except the soy dish;
    - t 0 = t 3, and t 3, 4, 5, 6 all differ;
    - chili garnish only from t 5;
    - the t 5 squash is wider;
    - the 96-frame loop;
    - the rest frame animates;
    - the old REV path still paints;
  - (e) stove:
    - Apollo only (stage, bleed, heated base);
    - the arrow's bounding box is at `GEO.flipArrow`;
    - the spatula blade is in x 92..107;
    - the knob dot is s2 → a2, the burner knob turns and the other does not;
    - the grates show;
  - (f) heat and again are listed, 16x16 and Apollo only; every pair among tap, heat, flip, slice, again and close differs ≥ 25 % (closest pair given in the message); an unknown icon gives tap;
  - (g) `shake(b,1,0,0)` shifts the whole buffer; `shake(b,1,0)` is unchanged; m 0 works on an 84x190 buffer;
  - (h) every new painter gives the same bytes in a fresh instance and warm, alpha is 0 or 255, and there is no float trig, random source or clock.
- **Section 16** (oil ring, heat-on, band change, landing, loop, cost) is untouched and passes on the stove.

## Suites run

| suite | result |
|---|---|
| `node tools/test-cook.js` | 225 passed, 2 failed (both expected; 227 / 0 with WP-A's sim edits applied in a scratch copy) |
| `npm test`, up to test-cook (check-world, brain, model-voice, runner, api) | all passed |
| after test-cook: salon, cook-stickers, play-stickers, poster-art, art-extra, export | 235 · 177 ok · 180 ok · 287 ok · 93 ok · 47 passed |
| `node tools/test-cook-live.js` (still the round-4 live kitchen, now with the stove in the flip step) | 304 passed, 0 failed |
| `SMOKE_ONLY=Z node tools/smoke.js` (open and close the kitchen from the play room) | 72 passed, 1 "failed": the 1 is my own 900 s `timeout` killing the browser in the later loft part (CRASH: target closed, exit 124), not a check. Every kitchen line (open, close, Esc) is ok |

## Screenshots (`wip/round5/shots/K-B/`, mock compose at 360x740 @2: 80 x 165 art px, 9 device px per art px, ox -32, oy 2)

- `stove-cold.png`
- `stove-heat-arrow.png`
- `slide-counter-stove.png` (f 1, carrying the pan)
- `slide-stove-board.png` (f 0, carrying the jeon)
- `plate-t3.png`
- `plate-t5-landing.png`
- `plate-rest.png`
- `icons.png` (tap, flip, slice, close, heat, again)

## Independent check

A fresh subagent reviewed the change. It got the briefs and the diff, composed views and slide frames at 80x165, 80x142, 83x183 and 200x214, and checked:

- 389 byte-identity comparisons against the base file;
- carry against real simulator runs (6 seeds);
- edge inputs: huge, NaN and negative offsets, empty buffers, broken looks.

It found **no `must` or `should` defects**. It listed three nits, left as they are:

- **Pan handle on landscape and tablet.** The live pan's handle is cut at stage x 141, while the carried pan shows the whole handle. Landscape is not a target.
- **Shadow checker phase.** The carry shadow's checker is in canvas coordinates, but REV2 at t 3 draws it in stage coordinates. When ox+oy is odd, the dither phase flips at the slide→reveal handoff, on a frame where the background is moving anyway.
- **Counter→stove batter look.** The tap batter becomes the flip scene's raw batter when that slide starts. The spec defines the carried pan this way.

## Left, and why

- **Composing on a real canvas** is WP-A (`js/cook.js` `fit`, `view` cache, slides, shake m 0). I only composed in node.
- **The spatula's handle** at the new rest pose ends near stage x 129 and does not leave the right edge (spec 3.3 says it does). The spatula sprite is shared with the hand-following pose, so I left it unchanged. The blade check (x 92..107) holds.

## Not verified

- No phone-browser look at the real live composition, which doesn't exist yet on this branch.
- Clipping and edge-repeat behaviour of `shake(V, …, 0)` inside the live loop.
