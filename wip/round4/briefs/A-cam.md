# Lane A "cam": turn the room all the way round with two fingers (branch `lane/a-cam`)

Read `wip/round4/briefs/COMMON.md` first.

## What the owner wants (HANDOFF item 8 + 11-15 answer)

"방 돌리기: 단추 없이 두 손가락 비틀기로 360° 전부 (손가락 각도 1:1, 끝 없음, 살짝 관성, 동작 줄이기 설정이면 관성
없음). 핀치 줌은 그대로, 둘이 안 싸우게 작은 데드존. 한 손가락 = 밀기, 톡 = 톡. 어느 쪽에서 봐도 카메라와 방 사이의 벽
(벽에 붙은 창·문·선반 포함)은 숨기거나 잘라 보이게 하고, 모델 바깥면·빈 바닥이 안 보이게. 다락·2층·놀이방·마당 모두.
각도는 저장 안 함. 가구 모드에 들어가면 각도 0."
Owner 11-15: the near walls are **cut to knee height** (only a low strip of that wall stays; the rest is cut away —
like the attic's open front today), not hidden entirely and not see-through.

Earlier (11-14) the owner said: "줌인 줌 아웃만 되는 게 불편해서 … 좌우로도 회전 기능 넣어줘서 좀 더 입체적으로 볼 수 있게
… 지금은 뭔가 딱 막힌 느낌이야." No buttons for turning (the old lane-cam idea of turn buttons is dropped).

## What exists (at the base commit)

- `js/scene3d.js`: orthographic camera at `TILT` 32° and `YAW` 45° (`placeCamera` ~472). A hidden turn exists:
  `yawDrag` + `yawDelta()` (~450) clamps to ±25° and snaps to 9° steps; reached by a two-finger twist past 15°
  (`startMulti` / `multiMove` ~4209-4265, mode `'twist'`, decided once per gesture against `'pinch'`), or with a
  mouse right-drag / shift-drag (mode `'yaw'`), or the dev panel yaw slider (`st.look.yaw`).
  Pinch zooms (`zoomN`, continuous, settles to `ZOOM_STEPS` on release); one finger pans with momentum and a rubber
  band (`panBox`, `PAN`, `stepPan`); the two-finger midpoint also pans during a pinch.
- Gesture grammar comment above `gPts()` (~4170) and `docs/INTERIOR_MODE.md` §3.
- The rooms were built for the default view: the attic (`atticG`, built ~800-1000; no right wall and no front wall —
  a cut-away), the loft (`buildLoft` ~3660, gable roof `LOFT_PEAK`), the play room (`buildPlayRoom` ~3506), the outside
  (`extG`, walks). Light patches through windows (`LIGHTS`), props against walls, posters on the board, the
  window rain, the outline and dither passes, `snapScreen` (pixel-crisp panning).
- Things that depend on the view: `camYaw()` (the octopus and the player character turn to face the camera; the
  salon's `salYawTo`), the player stick (moves relative to the screen: check `_r`), the furniture carry, the DOM
  hotspots anchored to 3D points (`spotInfo` / `boxScreen`: doors, stairs, machine, sewing, mirror, sofa dot, plots),
  bubbles above the octopus (`octScreen`), the tutorial spotlight, tap picking (`pick`), `panBox` limits, light
  shadows (`fitShadow`), the sky and clouds seen through windows, the 2D fallback (no camera).

## What to make true

1. **Two-finger turn, 1:1, endless.** In the attic, the loft and the play room (and the yard: see "Yard" below),
   a two-finger gesture turns the view by exactly the change of the angle between the two fingers (sign so that the
   room turns *with* the fingers, like turning a photo on a table), any amount, all the way round and further (no
   clamp, no steps while turning). On release, a little inertia (decays in about 0.3-0.5 s, capped); with
   `st.reduced` (reduced motion) no inertia. Pinch zoom keeps working in the same gesture: use small dead zones
   (for example the angle must change ~6-8° before turning starts, the distance ratio ~1.06 before zooming starts),
   then both may run together (map-app style) — neither jumps when it engages (start from the value at the moment it
   engages, as the current code does for the 15° / 1.1× thresholds). One finger still pans; a tap is still a tap;
   long-press behaviour is unchanged (lane B replaces the furniture long-press; leave that code where it is).
   Mouse: keep right-drag / shift-drag turning (now endless). Keyboard: Q / E turn by 15° steps (eased) when the
   scene has focus or no text field is focused — small, optional, skip it if it fights existing keys.
2. **The angle is not saved** (session only, not in `localStorage`); a page reload starts at the default view.
   Decide whether a room change keeps or resets the angle (simplest: keep it per session; reset to 0 for cut-scenes
   that need the default framing, such as the walk ceremonies and the salon stage, then restore). Expose a tiny API
   for lane B: `APP.scene.setYaw(deg, instant)` / `APP.scene.yaw()` (degrees, 0 = default view), and keep the state in
   the existing variable `yawDrag` (radians) so lane B's "angle 0 when the furniture mode opens" works by setting it.
3. **Near walls cut to knee height, from every side.** For every room, for whatever angle, a wall that stands
   between the camera and the room (its outward normal points toward the camera's side) is shown cut down to a low
   strip (knee height, about 0.45-0.6 m, with a clean top edge in the room's trim colour), together with everything
   mounted on it above that height (windows, the round window, doors, shelves, posters, lamps, the board, curtains,
   the mirror corner, the hatch frame …). Walls on the far side are shown whole. Decide per wall by the dot product of
   the camera's horizontal view direction with the wall's outward normal, with a little hysteresis so a wall at the
   edge does not flicker; switch instantly (no fade) to keep the pixel look. Keep it cheap (precomputed groups per
   wall; no per-frame geometry rebuild; no new shader programs at a room change — read the comments near 684 and
   3498 about keeping the number of point lights and programs stable; check `renderer.info.programs` before/after).
4. **Closed rooms, no void.** Today the attic is open at the front and the right (cut-away). Seen from behind, the
   player would look past the floor edge into nothing. Add the missing walls (and roof pieces / beams where the roof
   would show its outside) in the same style as the existing ones so that each room is a closed box that looks right
   from any side: far walls whole, near walls cut. At the default angle (0) the room must look **exactly like
   today** (the open front and right are exactly the walls that are "near" at 0 — they show as knee-height strips or
   not at all, as now: compare screenshots at angle 0 before/after and keep them the same or nearly). The roof and
   rafters must not block the view at any angle (cut or hide roof parts on the camera's side the same way). No
   outside faces of the model, no empty floor edge, no void, at any angle, at every zoom step, after panning to the
   pan limits. Light patches from windows stay correct (they come from the window's position, not the view).
5. **Everything that depends on the view keeps working at every angle:** the stick (pushing up on the stick moves
   the character away from the viewer on screen, at every angle), hotspots over their objects, taps hit what they
   show (cut walls and what was on them are not tappable while cut; a door on a cut wall stays usable through its
   hotspot or the button — decide and say), bubbles over the octopus, the tutorial spotlight, `panBox` limits
   follow the rotated room (no panning into the void), the octopus and the character still face the camera, the
   salon scenes, shadows (`fitShadow` covers the room at any angle), the dither stays stable at rest
   (`dither.still`), pixel-crisp at rest (`snapScreen` works in the rotated basis). The 2D fallback is unchanged.
6. **The sewing-machine tap fix is lane E's**, not yours, but do not undo it when merging later (it touches
   `spotTap` and the `caught` line in `pointerdown`).

## Yard (lane D builds it at the same time)

Lane D adds a new place `'yard'` (group `yardG`, built by `buildYard()`), reached through the attic's walk door.
Make your turn and cut code **generic**: a per-place list of cuttable parts, so lane D can register the yard's
parts in the same structure. Use exactly this shape (lane D's brief says the same):

```js
/* 11-15 돌려 보기: 장소마다 카메라 쪽이면 무릎 높이로 자르는 것들 — { place: [{ full: Object3D, low: Object3D|null, nx, nz, cx, cz }] }
   full = 벽 + 거기 붙은 것 전부 (자를 때 숨김) · low = 무릎 높이 띠 (자를 때만 보임, 없으면 아무것도) · (nx, nz) = 바깥쪽 법선 · (cx, cz) = 벽 가운데 (장소 좌표) */
var CUTS = { attic: [], loft: [], play: [], yard: [] };
function cutAdd(place, full, low, nx, nz, cx, cz) { … }
```

and apply it for `PLACE.vis` every frame the angle or the place changes (`applyCuts()`). Lane D only calls
`cutAdd('yard', …)` and needs nothing else from you. Also apply your "no void / pan limits" logic to any place in
`PLACE_BOX` (lane D adds `PLACE_BOX.yard`).

## Not yours

Furniture mode (lane B), the yard itself (lane D), light values and the stairs cue (lane G: if you rebuild a wall
that holds a lamp, keep its light where it is), the sewing sheet and its tap fix (lane E). Exterior walk scenes
(`extG`): the turn may stay off outside (keep the default view during walks) — simplest; say what you did.

## Tests (deterministic)

Smoke checks (a new letter or a new part next to the scene-control checks; grep `twist`, `yaw`, `pinch` in
`tools/smoke.js`): a two-finger twist of +90° turns the view by 90° (±2°), past 180° and past 360° keeps going (no
clamp); a pure pinch does not turn (dead zone) and a pure twist does not zoom; after a turn the stick moves the
character away on screen; a hotspot stays over its object after 90° and 180°; at 180° in each room the near walls
are cut and the far walls whole, and a render's room region has no void-coloured pixels beyond the walls (sample a
few pixel rows); reduced motion turns without inertia; reload starts at 0; `APP.scene.setYaw(0)` works.
Update old checks that asserted the ±25° clamp or the 9° steps. Run `npm test`, `node tools/test-scene-perf.js`
(frame time and taps must stay within its limits) and the smoke letters that touch the camera and controls (at
least `A`, `O`, `Z`).

## Screenshots to commit (360x740)

Each room at 0°, 90°, 180°, 270° (attic by day and at night, loft, play room), a twist mid-gesture, the stick
moving at 180°. Put a 4×N contact sheet in `wip/round4/shots/a-cam/`.
