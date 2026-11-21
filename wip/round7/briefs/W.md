# Lane W — the outside as one continuous map (`lane/7-w`)

Read `COMMON.md` first (contract C6 is your layout), then `ANSWERS.md`, the owner's words (`wip/round7/README.md` D1, D3, E3;
`docs/next/owner-2026-11-18.md` sections 1 and 4; `docs/next/options-2026-11-18.md` section 1, choice A), and
`wip/round7/maps/world.md` — all of sections 1, 2, 3, 4, 6, 9, 10: it is the map of the code you are about to extend, with
the earlier session's warnings about the camera.

## Why

The owner: "맵이 뚝 나뉘어진 채로 끊겨있어서 답답 … 맵 끝까지 가려면 어려워서 답답한 느낌을 덜어주고", "새로운 맵인 마을을 집
바깥과 연결해서 … 해안가 맵도 구현". An earlier session built a "wide outside" test behind `?wide=1`: the yard continues as
ground to the screen edge, a gate, a short road through trees, a camera that follows. The owner accepted the direction and
called it "too empty". This lane turns that test into the real outside: **one continuous walk from the house door through
the forest road and the village to the beach and the sea**, comfortable to cross. Lane V puts the buildings on your ground.

## You own

- `js/scene3d.js`: everything about the outside's ground and movement — `YARD_WIDE`, `WIDE`, `WIDE_CAM`, `buildYard` (the
  ground, path, gate, fences, trees, tufts), `wideTrees`, `wideCull`, `yardClamp` / `yardOut` / `plLim` (walk areas),
  `plMove`'s wide branch, the outdoor colliders (`YROOM`), `placeCamera` / `camDepth` / `panBox` / `widePts` / `plFollow` /
  `followStep` / `wideHoldCentre` for the outside, `fitShadowView`, the yard branches of `spotInfo` / `pick`, the weather
  volume outdoors, season colours for new ground; new functions under `[7-W]`. You read `WIDE_REG` (C6) and never edit lane
  V's functions. Indoors, the camera constants stay as they are (lane U owns how empty indoor pixels are filled; lane P the
  character's speed and gait).
- `js/app.js`: the room code for the yard (`goRoom` callers, `ROOM_SPOT` yard entries, the house-door button outdoors),
  new code under `[7-W]` (signposts, quick travel, shells on the beach as scene spots only).
- `index.html` under `[7-W]`: `#btn-sign-0` … `-2`, `#btn-beach-shell-0` … `-4`, the dialog `#travel-pick`.
- `tools/test-light.js` (the yard and wide checks L7 to L9 and new ones), `tools/test-scene-perf.js` budgets for the
  outside, the yard smoke scenarios (X, I and others that pin yard positions), `docs/SCENE.md` (the outside section).

## What to build, in this order (push after each)

1. **Wide on by default.** `YARD_WIDE` is true unless the address has `wide=0`. Move the tests that assumed the old yard to
   `&wide=0` where they test the old yard on purpose, and to the new default otherwise.
2. **The long map** (the layout table in C6): grow the ground, the walk areas (several areas in (s, t), not one band: road
   ±3, street ±3 plus the cafe deck, plaza ±8, beach ±12), the camera range and depth, tree and tuft ranges (forest along
   the road, gardens and low walls suggested behind the lots, dune grass before the sand), the stepping-stone road
   continuing as a paved street through the village to the plaza, the arch at the village gate, the steps down to the
   beach, sand, rocks, a wooden pier, the sea to the horizon with a stepped shoreline wave (4 to 6 frames a second, still
   with reduced motion) and new ground colours for sand and water that follow the hour like the rest. Path finding for
   auto-walks outdoors may stay "straight with sliding" if signposts make long auto-walks unnecessary.
3. **The registry** (C6): call `WIDE_REG.builders`, make `WIDE_REG.spots` tappable (position the named button over the
   spot while it is on screen, hidden otherwise; a tap on the canvas over the spot clicks the button), merge `boxes` and
   `circles` into the outdoor colliders, hide `segments` that are off screen, call `frame` callbacks. Lane V will push about
   12 builders, 10 spots, 40 colliders and 8 segments: keep the whole outside inside the budgets (draw calls ≤ 150, no new
   shader programs) and say in your report how many calls your own ground uses in each stretch.
4. **Comfort.** The follow camera keeps up with the run (read `scene.playerSpeeds()` if it exists, else assume walk 2.2 and
   run 3.8 m/s) with a small look-ahead in the direction of travel; no snapping when rotating or zooming anywhere on the
   map (the earlier session's fixes must still hold at s 55). The forest must never hide the character at 90° and 270°
   (clear or lower the trees next to the walk areas). Fix the 0.15 m corner slide at the road end if it still exists.
5. **Signposts and quick travel.** Three signposts (C6: s 6, s 39, s 50), each a tappable spot that opens `#travel-pick`:
   three picture buttons (a house, the village arch, a wave; `aria-label`s '집', '마을', '바닷가'; the one for where you
   stand is hidden). Choosing one fades the view for about 0.3 s and puts the character at that place's arrival point
   facing along the road (`APP.goPlace('home' | 'village' | 'beach')`; `home` = the yard just outside the gate). The house
   door button outdoors keeps working from anywhere: beyond 8 m it uses the same fade instead of a long walk.
6. **The beach.** Five shell spots on the sand (`#btn-beach-shell-N`, `aria-label` '조개'), shown or hidden by
   `scene.beachShells(indexes)`: lane S decides which are there today and what a tap gives; you draw a small shell at each
   shown spot and make it tappable when the character is within 1.5 m (farther away the tap walks there first).
   `scene.area()` as in C6.
7. Docs: rewrite the outside section of `docs/SCENE.md` for the new default.

## What to cut first if time runs short

The look-ahead, the weather volume tuning, dune grass and rocks, the pier (keep the beach, the sea and the wave). Never cut
items 1 to 3 or the budgets.

## Checks

`npm test`, `node tools/test-light.js`, `node tools/test-scene-perf.js`, `SMOKE_ONLY=X,I,CAM,Z node tools/smoke.js` (and any
scenario that enters the yard). New checks: the character can walk from the gate to the water's edge and back without
leaving the walk areas (a seeded random walk of at least 200 000 frames stays inside, as the earlier session did); no void
pixels on screen anywhere along the map at 0°, 90°, 180°, 270° on 360x740 and 768x1024; quick travel lands inside a walk
area; draw calls and programs within budget at five points of the map. Screenshots at 360x740: the road, the empty village
ground (before lane V), the plaza, the beach at noon and at dusk.

## Report

As in `COMMON.md`, plus: the final `WIDE` numbers, the walk-area list, the arrival points, your draw-call counts per stretch
and how many calls are left for lane V in the village.
