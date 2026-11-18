# Lane D report — dining in 3D and auras (round 6, branch `lane/d`)

## Conclusion

The play-room booth, the table dish, my character sitting and eating, the octopus walking in, sitting, eating and leaving,
the auras, `on.tableSpot` and the whole §10.3 scene API are built in `js/scene3d.js`.
- **Tests:** `tools/test-scene-perf.js` passes 150/0, with the new T8 (39 checks) and T1–T7 unchanged. `npm test` is all green.
- **Layout:** candidate **B**. Every T7 corridor and number is unchanged — **no fallback was needed**. The lead approved the layout after the first push (d3720d9).
- **Loft stair tap (audit J3): dropped at the owner's request.** The owner's other branch (`claude/serene-cannon-awp5y2`) solved J3 by moving the stair to the left wall's front corner, so it no longer overlaps the yard doorway on screen. My fix assumed the old stair position and edited the same lines, so it is removed: the attic tap pick, `spotInfo` and smoke `scenarioLoft` are back to the base `5a6311f` lines, and `tapSurface`, `STAIR_HIT`, `debugTapTruth` and `wip/round6/notes/d-stair.js` are gone. My before/after numbers are not kept here, since they measured the old stair.
- **Play-room tap targets** (lead's extra check): the arcade, counter and table each get 100 % of taps at both phone sizes and all four turns.
- **Independent check:** one must and three shoulds; the must and two shoulds are fixed. The third (the stair grid's ground truth) went away with the J3 fix.
- **Smoke:** `SMOKE_ONLY=J,Z,CAM` gave one failure on its first run: Z2 "a tap on the sewing machine while the view still glides" (`spot:sew`). It did not reproduce: a rerun of `SMOKE_ONLY=Z` on this branch, after the last code change, passed 132/0, and the base commit also passes. I read it as a timing flake, not a code change of mine (the loft pick is untouched).

## Changes (all in files I own, except the one smoke region the brief gives me)

`js/scene3d.js`:
- **`BOOTH` + `boothParts()` (in `buildPlayRoom`):** one table and two two-seater sofas, merged into the static room mesh (0 extra draw calls). The booth is in the `cutSplit` keep list. `PROOM.boothBox` is the obstacle and the `'table'` hotspot.
- **`plBoxes()` play branch:** adds the booth.
- **Hotspot `'table'`:** added to `SPOT_KEYS`, `spotInfo` and the play pick list.
- **New `playSurface()` in the play-room pick:** the arcade, counter and table spot boxes overlap on screen now, so a tap goes to the first visible surface. Other taps fall back to the widened spot boxes as before.
- **Table dish (`setTableDish`, `dishParts`, `dishRebuild`, `stepDish`, `biteTake`):** one merged lambert mesh (+2 calls). The plate colour follows `look.plate`, and each of the three recipes has its own shape (unknown recipe = covered plate).
  - Each bite removes the piece nearest the eater and adds 2–3 crumbs.
  - The appear beat is 6 frames; steam shows while the dish waits (none under reduced motion).
  - A dish set before the room is built is remembered. During a meal a new dish is queued.
  - The empty plate is cleared when I stand up or leave the room.
- **Me at the table (`playerSitTable` / `playerStandTable` / `mealBite('me')` / `stepMeBite`):**
  - `plStand(done)` is now place-aware: the attic sofa works as before, and at the table I hop to my aisle. The stick stand-up takes the same path.
  - Hops carry a `done` callback.
  - Standing up makes the octopus leave (§4.3 'after').
- **The octopus at the table (`octCanCome`, `octToTable`, `octSeatNow`, `octTableBeat`, `mealBite('oct')`, `octLeaveTable`, `octTableUnmount`, `tablePose`, `tableLook`):**
  - Seated pose: legs folded (front ×0.66 drooping over the seat edge, sides ×0.55, back ×0.42); the contact decal is hidden.
  - The eat beat leans the body 8°. The bite reaches one front arm over the tabletop toward the dish (body upright and 1 px up for those 2 frames), then squashes. The face stays `idle`.
  - Leaving: hop down, walk to the door, door opens, 8-step dither fade, then `jumpTo` its attic anchor.
- **Hold rule (`tableHold`):** while the octopus is at the table, `jumpTo`, `moveTo` and anyone else's `walkPoint` are held; the latest one is applied after the unmount and its Promise resolves then.
- **Unmount at once:** on leaving the play room (`showPlace`), at ceremony start (`cerRun`), when the story place changes (`setPlaceNow`), and on context loss (`tableLost`, which also resolves beats and bites).
- **Overlay:** the `updateOverlay` room hide is lifted while the octopus is at the table, and `octScreenPos()` returns its head.
- **Portraits:** `renderPortrait` treats "at the table" like `salClean`, so the arms' `scale.x` and the pupils are washed back to the rest pose. A portrait or walk portrait taken while it leans equals the one taken at home (T8).
- **`on.tableSpot({ seat, call, dish })` (`stepTableSpot`):** uses the same on-screen rule as `stepSofaSpot`.
- **`tableInfo()` with `geom`.** Test hooks: `debugTableBodies`, `auraInfo`, `debugBoothVisible`, `debugTapTruth`, `debugPlayTruth`.
- **Auras (`setAura`, `auraLayout`, `stepAura`):**
  - Each character has one `Points` (≤ 20 vertices, the vertexColors variant) and a layer-1 twin (≤ 4 vertices), attached to the character's current group.
  - Positions are snapped to pixel centres and step at 12 fps. Bloom takes 6 frames; reduced motion shows a still pose.
  - **Programs:** the new layer-1 twin variant was the only new program (the bloom pass collects no lights). It is now compiled in `prewarm()` with a light-less scene into `rtE`, which also covers the summer firefly twin. Boot programs go from 33 to 34, and the cache keys do not change at the first aura in the attic, play room, loft, yard or exterior (T8).

Other files:
- `tools/test-scene-perf.js`: new T8 (below).
- `docs/SCENE.md`: a new section.
- `wip/round6/notes/`: D.md and the probe scripts `d-shots.js`, `d-playtap.js`.

## Chosen layout (play-room group, m; spec §4.1)

| item | value |
|---|---|
| obstacle (`boothBox`) | x −1.53..0.66, y 0..0.82, z −1.92..−0.62 (+0.25 → x −1.78..0.91, z ≤ −0.37) |
| keep box | x −1.58..0.71, y −1..0.92, z −1.97..−0.57 |
| octopus sofa | back x −1.53..−1.41 (top 0.82), seat x −1.41..−0.79 (top 0.42), arm x −1.53..−0.79, z −1.92..−1.80 (top 0.58) |
| my sofa | back x 0.54..0.66, seat x 0.00..0.54, arm z −1.92..−1.80 |
| table | x −0.47..−0.06, z −1.70..−0.80, top 0.63 (rim 0.57); dish spot (−0.265, 0.63, −0.99) on a paper mat |
| seats | octopus (−0.95, 0.42, −1.04) yaw 70° · me (0.21, 0.18, −1.36) yaw −90° |
| aisles | octopus (−0.95, 0.02), entered from the door anchor via (−2.0, 0.02) · me (0.21, −0.30) |

**Why B:**
- The T7 lanes fix x ∈ (−1.55, 0.70).
- The door lane and the rest-spot walk fix z_max < −0.58.
- The arcade front (−2.20) and the counter front (−2.15) fix the back; 0.23 m to the counter satisfies rule 7.
- A is 6 cm short of the x budget. C leaves the octopus 0.28 m end gaps, narrower than its body.

**Measured clearances (T8, real meshes):**
- Octopus head to the table edge at tabletop height: 0.120 m seated, 0.101 m leaned 8°, 0.193 m during the reach (all ≥ 0.03).
- No overlap at 0.01 m in any of the seated, lean, reach-frame-0 or reach poses, checking the octopus's head ellipsoid, the 8 legs' keypoint spheres, and my head, hair and limb boxes against the sofas, table top, table legs, arcade, counter, L-leg and walls.
- The octopus's whole walk-in path (58 sampled frames) clears every box.
- My hair clears my backrest, and my torso clears the table edge by 0.011 m.

## Follow-up from the lead: auras readable at a glance

The first build drew 1-render-px dots; the sparkle on me at night and the petals in the yard were hard to find. Now:
- **Grains:** each one is a 2×2 render px bright core in the effect's own colour, with a 1 px darker edge (four 2 px blocks offset 1 px, drawn first). `PointsMaterial` size is 2, a uniform, so the program and its cache key are unchanged. Points snap to pixel corners, so a 2 px point covers exactly 2×2 pixels. There is no bloom twin any more (it is hidden; its prewarmed variant stays and still covers the firefly twin).
- **Alive at once:** sparkle 7 (8 slots on an 8-step cycle — small, normal, '+', normal, small, normal, small, off — drifting up 1 px every 2 steps); star 6 (a halo above the head turning 8° per step, each one flashing to '+' in turn); petal up to 8 (falling 1 row per step, swaying 1 column every 3 steps).
- **Placement:** grains stay around the head and shoulders. Columns within the face's width are avoided at face height; the spread is set in metres (0.22 m beyond the face), so it holds at any pixel size.
- **Reduced motion:** still pose — 8 sparkles, 6 stars, 6 petals; no drift, no twinkle.
- **Budget:** one `Points` per aura (beauty + normal pass), at most 64 vertices (the spec's 20 / 40-vertex numbers are superseded by the lead's 6–10 grains).
- **Bug found while doing this:** the per-slot seed used a signed shift (`>>`), so about half the petal slots spawned far to the left of the character at the test's pixel size. It is now `>>>`.
- **T8 pins:** point size 2, 6–10 grains in every place sampled, twin hidden, points on pixel corners, inside the character's screen box. Cache keys are unchanged at the first aura in each place.

## Decisions (small choices I made)

- **Seat yaw and dish spot (lead may overturn):**
  - The octopus sits at yaw 70°, not 90°. At 90° the face read as a side view and my head covered it (first shots), so 70° shows three-quarters while still facing the table.
  - The seats are staggered in z (octopus −1.04, me −1.36) so the two heads do not overlap on screen.
  - The dish sits at the table's near end so neither head hides it.
- **Dining sofas:** the open front end (+z) is where each character hops on; one arm only, at the back-wall end.
- **Stand-up makes the octopus leave:** standing up (stick or `playerStandTable`) is handled by the scene (§4.3 'after'). M may still call `octLeaveTable`; it is idempotent.
- **Dish queue:** a new dish waits while the octopus is walking in or out, while a bite runs, or while I or the octopus sit at the table with pieces left and either a beat started or a bite eaten. A new dish clears the previous beat, so the octopus sits upright again.
- **Bite reach:** the front arm aims at the dish. For its 2 frames the body straightens and lifts 1 px, because with the 8° lean the arm passed through the tabletop.
- **T8 tolerances:**
  - My seated legs' boxes may sink into my own cushion by up to 0.14 m (the thigh thickness of the existing −1.35 rad sit pose — "legs may rest on a seat top"); arms 0.03.
  - Leg collisions are checked with keypoint spheres, not AABBs: the AABB of a raised diagonal arm covers air over the table.
- **Cushion ramp:** `PAL.sky`.

## Player-facing text

None added or changed. No visible text, no aria names (the buttons are lane M's).

## Checks added

- **T8 in `tools/test-scene-perf.js`:**
  - Layout and booth: layout geometry; the booth visible at all 12 turns; pushes into the booth stop at its +0.25 edge (−z from both aisles, and from the east and west).
  - Dish: +2 calls per recipe, 4 pieces each.
  - Sitting and the octopus's arrival: sit at my seat; `octCanCome` false ⇔ `octToTable` false (asleep); the door opens over 4 frames (`012343210`); the octopus sits at its seat facing the table with the decal hidden.
  - §4.1 rules: checked on the seated, lean, reach0 and reach poses, plus the walk-in path.
  - Beats and bites: a second dish resolves at once; think lasts 1.0 s; lean is 8°; bites go 4 → 0 alternating, and a fifth returns false.
  - Portraits: the portrait and walk portrait while leaning equal the ones taken at home.
  - Auras:
    - Placement: 2-px grains (6–10 alive, no bloom twin) stay inside the character's screen box + 4 px and sit on pixel corners — at the table, in the play room, in the exterior during the departure and return ceremonies, in the attic, in the loft and in the yard.
    - Behaviour: the parent group is correct; bloom runs 6 frames; steps run at 12 fps; reduced motion is still.
    - Programs: cache keys unchanged and the program count unchanged.
  - Draw calls: during a meal 80 ≤ base 50 + octopus 25 + 12, and ≤ 150.
  - Hold rule: a held `jumpTo('crate')` lands on the crate anchor after the unmount.
  - Stand-up and abort paths: the octopus leaves to the attic and the empty plate is cleared; an instant sit works and a ceremony start unmounts the octopus; a new dish mid-meal is queued; standing mid-bite resolves the bite false; the run ends in the attic.

## Suites run

| suite | result |
|---|---|
| `node tools/test-scene-perf.js` (final, after the aura follow-up) | 150 passed, 0 failed |
| `npm test` (all node suites, after the aura follow-up) | exit 0, all 0 failed |
| `SMOKE_ONLY=J,Z,CAM node tools/smoke.js` | 202 passed, 1 failed (Z2 sew tap during the glide) |
| same smoke Z at the base commit `5a6311f` | 118 passed, 0 failed |
| `SMOKE_ONLY=Z` rerun on this branch (before the J3 removal, with the stair grid) | 132 passed, 0 failed |

For the lead: no new test files. T8 is inside `tools/test-scene-perf.js` (`tools/smoke.js` is unchanged from the base), so CI needs nothing new as long as it already runs those two.

## Measured numbers

- **Draw calls (T8 harness, 360x326 @1, p=3):** play room base 50, during a meal 80 (octopus 25), ≤ 150.
- **Draw calls (independent check, real app):** base 50–51, meal 67.
- **Dish:** +2 calls.
- **Programs:** boot 34 (was 33: +1 for the prewarmed layer-1 twin variant). Unchanged after every visit and aura; cache keys compared.
- **Play-room taps** (`wip/round6/notes/d-playtap.js`, truth = first visible surface; stand-in buttons because `#btn-table` is lane M's) — arcade / counter / table:

| view | 360x740@2 | 412x915@2.625 |
|---|---|---|
| 0° | 219/219 · 346/346 · 525/525 | 220/220 · 443/443 · 523/523 |
| 90° | 154/154 · 232/232 · 431/431 | 166/166 · 232/232 · 434/434 |
| 180° | 181/181 · 262/262 · 334/334 | 177/177 · 301/301 · 338/338 |
| 270° | 211/211 · 334/334 · 509/509 | 246/246 · 330/330 · 510/510 |

  The seat and call chips are lane M's buttons placed from `on.tableSpot`. Seat sits above my seat and call above the octopus's seat, both inside the booth; M should check their 44 px chips against `#btn-machine` and `#btn-cook`.

## Shots (`wip/round6/shots/D/`)

1. `1-layout-360.png`, `1-layout-412.png`: booth day 0°, day 180°, night 0°, night 180° (regenerated with the final table).
2. `2-dishes-2x.png`: 해초전 · 주먹밥 · 과일 꼬치 on the table at 2× zoom, the octopus seated.
3. `3-seated-412.png`: me and the octopus seated, 412x915@2.625.
4. `4-bite-oct-2x.png`: the octopus's bite reach over the tabletop.
5. `5-auras-360.png`, `5-auras-412.png` (after the lead's follow-up): day (top) and night (bottom) — attic (me sparkle, octopus star), play room (me star, octopus sparkle at the table), loft (both petal), yard (me sparkle).

## Needs another lane merged to be fully tested

- **M:** the flow (`mealBusy`, chips, toasts, the app's bubble and CSS gates, `#btn-table` / `#btn-seat` / `#btn-call` wired through `hotspots`, the scene description line) and smoke EAT. I drove the scene API directly with stand-in buttons.
- **R:** `walkPortrait`'s `sq` option. The portrait-equality check uses today's `walkPortrait`.
- **K2:** the real `look` shape of the new dishes. I read only `look.band` (0..2, default 1) and `look.plate` (0..2).

## Left, and not verified

- 320x568@2 was looked at only by the independent check (no defects reported), not in my own shots.
- The play-room tap-target numbers come from a probe, not from a CI check.
- I did not check the 360x740@3 size.
