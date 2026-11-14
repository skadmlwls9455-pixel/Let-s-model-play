# Lane A cam — report (11-15)

## Conclusion

Done. You can turn the attic, the loft and the play room all the way round with a two-finger twist. The turn follows the finger angle 1:1 and has no end. After you let go it coasts a little (no coast with reduced motion). Pinch zoom still works in the same gesture.

From any angle, the walls between the camera and the room are cut down to a knee-height strip. Everything mounted on those walls is cut with them. Each room is now a closed box, so there is no void and no outside face at any angle. At 0° the rooms look as they did before (pixel diff vs the base commit is only animation pixels).

The angle is not saved, and a reload starts at 0°. Lane B gets `APP.scene.setYaw(deg, instant)`, `APP.scene.yaw()`, and the existing `yawDrag` variable. Lane D gets `CUTS` / `cutAdd('yard', …)`.

The independent check found two `should` defects and no `must`. Both are fixed and covered by new checks. Suites: `npm test` all green, `test-scene-perf` 111/0, smoke A·O·Z·X·P·J·T·CAM 382/0. After the two fixes, CAM·P·J·Z re-ran green (P, J and Z all pass, and CAM is 28/0 once one test bug was corrected).

## Changes

`js/scene3d.js` (all edits marked `11-15`):
- **Angle state**:
  - `yawDelta()` no longer clamps to ±25° or snaps to 9° steps. It returns `YAWX.show + look.yaw`.
  - `YAWX` holds the coast velocity `v`, the angle drawn on screen (`show`), the target for Q/E and `setYaw` (`kt`), and the `held` flag.
  - `yawDrag` stays the "turned" angle in radians and has no end.
- **New functions** (after `panReset`):
  - `stepYaw(dt)` handles inertia with τ 0.12 s, max 3.5 rad/s and a start threshold of 0.6 rad/s. It also eases the Q/E / setYaw targets and the hold-to-default. Called from the first line of `stepPan`.
  - `yawHeld()` covers the walk ceremonies outside the rooms, the intro, the exterior, the salon stage, the play kit and the octopus-focus shots. During these the view eases to the nearest full turn (the default framing) and comes back afterwards; `yawDrag` is untouched.
  - `yawPivot()` turns the camera target around the room centre (the xz centre of `PLACE_BOX`), so the framing turns like a photo on a table. At 0° nothing changes.
  - `yawLive()` and `yawMoved()`: when the angle changes, a resting octopus and a resting character turn to face the camera.
  - `setYaw()` sets the angle.
- **Gestures**:
  - `startMulti` / `multiMove(e)`: the finger angle is accumulated frame by frame, so it works past 180° and 360°.
  - The twist engages after 7° and the pinch after a 1.06× distance change. Either or both can run, each starting from its value at the moment it engages.
  - The 7° dead zone is caught up over the next 14°, so a +90° twist ends at exactly 90° without a jump.
  - Samples use event timestamps.
  - `yawRelease(m, e)` computes the coast speed from the last 100 ms (zero if the fingers were still for 80 ms).
  - The mouse right-drag / shift-drag turn now has no end.
  - Q / E turn 15° (eased). They are ignored with a dialog open, in text fields, with modifier keys and on key repeat.
  - Pressing during a coast stops it.
- **Wall cuts** (new section "11-15 돌려 보기: 벽 자르기" before the attic geometry): `CUTS`, `cutAdd`, `applyCuts` (every frame, hysteresis ±0.06), `cutSplit`, `cutBoards`, `cutStuds`, `cutRoom`, `cutMask`, `cutDyn`, `cutOf`.
  - **Old walls (left, back)**: `cutSplit` runs on the `parts` arrays just before each room's own merge line, so the building code is untouched. It moves into a per-wall group:
    - parts within 0.32 m of a wall and above the knee;
    - tall thin posts.
    
    These stay with the room:
    - floor-standing furniture (`keep` boxes): arcade, kitchen counters with what sits on them, sewing desk, fabric shelf with the dye bottles, hatch rail;
    - the board rows below the knee, which stay as the strip.
    
    A few `to` rules assign parts that sit near two walls (books on the left shelf, the stud behind the stairs, the lamp bracket above the fabric shelf).
  - **Roof timber**:
    - Rafters, purlins and logs go with their wall.
    - Long timbers that cross the room (over 3 m) go into an `either` group: hidden as soon as either the left or the back wall is cut.
    - The corner post, cobweb and pulley go into `corner`: hidden only when both walls are cut.
  - **Low strip**: a dark wood cap at knee height (0.6 m; the play room uses its row height, 0.63). In the attic it also fills the back-door gap, and in the play room the door gap.
  - **New walls (right, front)**: the same boards, seams and studs as the old walls. The attic's right wall has a hole for the play-room door; the loft gets a right gable and a front knee wall. At 0° both are on the camera side, so they are hidden, which keeps today's open front.
  - **Light**:
    - Each old wall group has a shadow-only twin (same geometry, shade material, child of the place's shade mesh), so window light patches stay where they are when the wall is cut.
    - A shadow-only "skirt" 0.14 m outside the strips stops their outer faces glowing white in the sun.
    - In the play room the door hole has a shadow-only filler.
    - New walls do not cast shadows; the existing shades already block that side.
  - **Wall-mounted things**: these have their own code controlling `.visible`, so they are hidden with `layers.mask = 0` instead, re-applied every frame. That covers the window glass, outside rain/snow/stars/drops, posters, souvenirs, curtain, board, shelf, moss pot, back door hole, salon corner, loft round window glass, and the play room window and door.
  - **Lamp shades and bulbs** are split per wall and share the original emission material, so `playApplyLight` / `loftApplyLight` still work. The point lights stay where they are (lane G).
  - **The attic stairs** have their own entry. They are cut only around 90° (when both the right and back walls are near), leaving the two lowest steps. While cut, the stairs button covers only those two steps.
- `tapItems()` skips cut things. The salon spot is hidden while its wall is cut. The salon spot test also checks `salG.layers.mask`.
- Dev `setLook({ yaw })` is no longer clamped.
- **New API** (one new line before the `view:` line; the original line is unchanged):
  - `setYaw`, `yaw`;
  - `yawInfo()` (test/tools);
  - `voidAt(x, y)` (test: does that pixel show nothing).

`tools/smoke.js`: new scenario `CAM` (see Checks). `docs/SCENE.md`, `docs/INTERIOR_MODE.md`: the 11-15 rule.

## Decisions (where the brief left a choice)

- **New walls (front/right) have no knee strip.** They are near at 0°, and 0° must look like today's open front. The old walls (left/back) have a strip.
- **Doors**:
  - The attic's door to the play room is never cut. It stands on the attic's new right wall as today's lone door frame, visible and tappable at every angle; cutting it would change the 0° view.
  - The play room's door to the attic is cut with its wall: standing in a cut wall it hid the character who had just come through it. Its button (`playAttic`) and taps on that spot still work, and the strip fills the door gap.
- **Floor furniture stays**: arcade, kitchen, sewing desk, fabric shelf, crates, sofa. The exception is the attic stairs (2.5 m), which are cut to their lowest two steps when the camera looks from their corner (about 45–135°). The stairs button stays usable on those steps.
- **Room change keeps the angle** for the session. The walk ceremonies, the exterior, the intro, the salon stage, the play kit and the octopus-focus shots show the default view (eased) and then return to the turned angle.
- **The exterior / walk scenes do not turn.** The yard (lane D) turns, if lane D registers its parts with `cutAdd`.
- **Q/E keyboard turn is included** (15° steps). It does not clash with the arrow/WASD stick keys.
- **Dead zone caught up**: the 7° twist dead zone is made up over the next 14°, so the total turn equals the finger angle without a jump when the twist engages.
- **Pivot**: the camera target turns about the room centre (photo on a table), not the old target point.

## Player-facing text

No new or changed player-facing lines. The font check (`--check`) reports stale: none.

## Checks added (smoke `CAM`, deterministic: states, event timestamps)

- A +90° two-finger twist (real CDP touch) gives 90° (±2), with zoom unchanged.
- Twists keep going: 90 → 210 → 380°, and −60° turns back.
- A pure pinch zooms without turning. A 5° twist (inside the dead zone) neither turns nor zooms.
- `setYaw(0, true)` gives 0.
- Inertia after a moving release: v > 0, it stops with ≤ 30° extra, and v ends at 0.
- With reduced motion there is no inertia.
- At 180° the stick moves the character away from the camera (direction dot > 0.9).
- Wall cut state:
  - attic at 180°: left, back and corner cut; right and front whole;
  - attic at 0°: only the new walls hidden.
- Void check, in each room at 90°, 180° and 270°: no void inside the room silhouette. The silhouette is the floor plus the uncut walls up to wall height, checked by raycasting through every 3 px with `voidAt`. Isolated single-ray misses on a seam are ignored.
- Arcade button over the arcade at 90° and 180°.
- Play room at 180°: the character standing at the door faces the camera (check fix).
- Attic at 90°: the stairs button shrinks to the low steps, and a tap in the room centre is not the stairs (check fix).
- Exterior holds the default view and returns to 120° in the attic.
- Reload gives 0°, and the save holds no angle.
- Shader programs are unchanged (32 → 32) after turning and visiting all three rooms.
- No page errors.

## Suites

- `npm test`: all green (check-world, brain 547, model-voice 26, runner 568, api, cook 225, salon 192, stickers 235, export 46, …).
- `node tools/test-scene-perf.js`: 111 passed, 0 failed. This includes draw calls ≤ 60, taps, and programs unchanged.
- `SMOKE_ONLY=A,O,Z,X,P,J,T,CAM node tools/smoke.js`: 382 passed, 0 failed.
- After the two check fixes, `SMOKE_ONLY=CAM,P,J,Z`: 153 passed, 1 failed. The failure was my new facing check, which compared against 180° after the loop had already moved the camera to 270°. The fix itself was right; the check now uses the current angle, and `SMOKE_ONLY=CAM` gives 28 passed, 0 failed.
- `python3 tools/subset-fonts.py --check`: stale none.

## Screenshots (`wip/round4/shots/a-cam/`, 360x740)

- `contact-sheet.png`: 4×4 (rows: attic by day, attic at night, loft, play room; columns 0/90/180/270°).
- `twist-mid.png`: two fingers held at +35°.
- `stick-180.png`: the character walking away at 180°.
- Full size: `attic-day-90.png`, `attic-day-180.png`, `attic-night-180.png`, `loft-270.png`, `play-180.png`.

## Outside my area

- `spotInfo('atticStair')` / `spotInfo('salon')` (hotspots): two conditions added.
- `tapItems()`: one condition added.
- `plFaceAfter(null)` is now also called from `yawMoved` (player facing).

Lane E's sewing-machine tap fix (`spotTap`, the `caught` line in `pointerdown`) is untouched; I only added `YAWX.v = 0` next to `zoomFinish()` in `pointerdown`.

## Left / not verified

- **Dev panel yaw slider**: the slider in `index.html` still spans ±25°, which is enough for dev use. Not changed.
- **Sun-lit far walls**: the new far walls now show window light patches where the light used to leave through the open side. This is physically right, but it is new.
- **Strip colour**: the knee strip's outer face is shaded (dark slate), close to the base colour.
- **`HANDOFF.md` item 8**: not edited; that file belongs to the lead.
- **Real-phone checks**: real-phone feel (inertia amount, 7° dead zone) was not verified on a device. Headless Chromium only, with CDP touch.
- **Yard**: lane D's yard is not tested here (it is not on this branch). Its parts only need `cutAdd('yard', …)` and `PLACE_BOX.yard`.
