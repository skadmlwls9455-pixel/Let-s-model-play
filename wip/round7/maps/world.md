# world.md — code map of the 3D scene for round 7 lanes

Read-only map. Line numbers are for commit `f17d1df` (`js/scene3d.js` 7030 lines, `js/app.js` 5499, `index.html` 444). Lines drift, names do not: grep the name.
The working tree already differs (§0): add +11 to `js/scene3d.js` lines ≥ 6935; `index.html` +15 after :208, +30 after :371, +45 after :439; `js/app.js` +23 after :5470; other cited lines are unchanged.
`≈` = line derived by counting, `[nv]` = not verified in this pass (read the cited function before relying on it).
`js/scene3d.js` is ONE closure: module consts (:11-345) + `init(container, opts)` (:346-7026) that holds every function below; the public API object is returned at ≈:6860-7025; module export at :7028.
Units: metres, y up. Abbreviations: S3 = `js/scene3d.js`, APP = `js/app.js`.

## 0. WORKING TREE AND LANE MARKERS (uncommitted, added by the lead 2026-11-21 12:19 UTC while this map was written)

Rule (wip/round7/briefs/COMMON.md "Shared files"): a lane writes new code only directly below its own `[7-<key>]` marker line and never edits marker or blank lines. Keys seen: U screen fixes/empty screen, T cooking → table, P player/run, W outside/village/beach, S shop/cafe, N NPC octopus, F weekend contest, K (smoke only).
Marker lines in the working tree:
| file | where | lines (working tree) | keys |
|---|---|---|---|
| `js/scene3d.js` | scene API object, after the `octTableBeat … debugTableBodies` line; add `name: value,` lines | :6935-6944 | T, P, W, N, U |
| `js/app.js` | code blocks after `boot()` | :5471-5491 | U, T, P, W, S, N, F |
| `js/app.js` | end of the returned `APP` object (`name: value,`), closed by `r7: true` | :5521-5536 | U, T, P, W, S, N, F |
| `index.html` | scene buttons after `#btn-call` | :209-222 | T, P, W, S, N, F, U |
| `index.html` | dialogs/sheets | :387-400 | same |
| `index.html` | script tags before `js/app.js` | :470-483 | same |
| `css/style.css` | end of file | :1780-1799 | U, T, P, W, S, N, F |
| `tools/smoke.js` | scenario functions / list lines (`['W7', …]`) | :8073-8095 / :8117-8131 | U, T, P, W, S, N, F, K |
The in-place tables this map lists (`SPOT_KEYS`, `spotInfo`, `pick`, `ROOM_SPOT`, `resetRoomUI`, `plLim`, …) have no markers: edits there are the conflict points between lanes.

## 1. PLACES

### 1.1 What can be drawn

| place id | group / state var | builder | when built | notes |
|---|---|---|---|---|
| `attic` | `atticG` (S3:781) | inline in `init` (room meshes `room`/`roomHi`, `cutRoom` S3:1077, door `ATTIC_DOOR` S3:1331, furniture `FURN` S3:1537) | boot | octopus room; floor x,z ∈ [-R, RF] = [-2.5, 3.5] (S3:19-22) |
| `exterior` | `extG` (S3:782) | inline: `EXT` (S3:3734), parts list `ep` + `EXT_MARK` (S3:3753), `treeIM`/`coneIM`/`fenceIM` via `instanced` (S3:3891-3892), `EXT_SPOTS` (S3:5158) | boot | the octopus's own "walk stage" diorama, half width `EXT.L` 3.2; player never goes there |
| `play` | `PROOM` (S3:410) | `buildPlayRoom()` (S3:4726) | first enter (`runDoor` S3:4655) | arcade `machineBox`, kitchen `counterBox`/`legBox`, booth `boothBox` (S3:4881-4882); ±`PLAY_R` 2.8, wall `PLAY_H` 2.2 (S3:29) |
| `loft` | `LROOM` (S3:411) | `buildLoft()` (S3:4890) | boot (S3:5486, because the salon corner `salG` lives there via `LSALW`) | ±`LOFT_R` 2.2, knee wall `LOFT_H` 1.5, peak `LOFT_PEAK` 3.15 (S3:30) |
| `yard` | `YROOM` (S3:412) | `buildYard()` (S3:5333) | first exit (`runDoor` S3:4661) | reuses `ep` house/bushes; ±`YARD_L` 4.6 (S3:31); wide variant = §2 |

Not places but drawn: entry sky `buildSky()` (S3:5793, `INTRO` S3:468); cup-play kit `makePlay()` (S3:6133, `PLAY`, play.html only); portraits `renderPortrait` (S3:2452) / `renderPlayerPortrait` (S3:3322) on own targets.
2D fallback `SCENE2D` (`js/scene2d.js`): `PLACES ['attic','exterior','play']` (:720), `goRoom` play/attic only (:649), spot table (:168). APP refuses `yard` in 2D (APP:4010). Loft in 2D [nv].

### 1.2 State and switching

- `PLACE = { cur, vis, trans, fade, room }` (S3:461). `cur` = story place where the octopus is (`attic`|`exterior`); `vis` = group drawn now; `room` = my room (`play`|`loft`|`yard`|null). Exactly one group visible per frame.
- Predicates: `isRoomP(p)` = play|loft|yard (S3:414); `outdoorP(p)` = exterior|yard (S3:415); `groupOf(p)` (S3:4071).
- `showPlace(p)` (S3:4535): sets `.visible` of all five groups, resets group positions, `panReset()`, `PAN.cut = true`, `PAN.arrive`, re-parents `octG` for non-rooms, `applyLight()`, `container.dataset.view = p`, `emit('view', p, prev)`. Also `yardBorrow` (S3:5447) moves weather particles + `extLamp` between `extG` and `YROOM.g`.
- Story switch (octopus leaves/returns): `setPlace` (S3:4552) → `setPlaceNow` (S3:4553) → `PLACE.trans` stepped by `stepTrans` (S3:4572): `TRANS_DUR` 0.6 s, vertical slide `TRANS_DY` 2.6 m (S3:4070), ordered-dither fade through `uFade`/`uFadeOk` (S3:185, :6048). While `PLACE.room` is set only `cur` changes (S3:4556-4559).
- Room switch: `goRoom(room, o)` (S3:4630) → optional walk `o.walkFirst` = `playerWalkTo(anchor)` (S3:3176) with `DQ.pending = true` → `runDoor(enter, o)` (S3:4653) builds a queue for `dqRun` (S3:4589) / `stepDQ` (S3:4593):
  - `doorItem` (S3:4607): door leaf 4 frames at 12 fps (0.333 s) via `setLeaf` (S3:1326) + `emit('door', {act, room, door, from})`; reduced motion = `DOOR_HOLD_REDUCED` 0.15 s (S3:4588).
  - `slideItem` (S3:4618): 0.6 s; axis `x` `TRANS_DX` 3.0 m (play door) or axis `y` `TRANS_DY` (loft stair, yard); swap callback calls `plEnter(to, from)` (S3:3166).
  - `enter` values: `true` (play), `'up'`/`'down'` (loft: slide only, no door frames), `'out'`/`'in'` (yard: `doorItem` with null door = events only), `false` (leave play).
  - Refusals: `'busy'` (`DQ.active||DQ.pending`), `'intro'`, `'here'`, `'far'` (room → room must pass the attic; stairs only from attic, S3:4637), `'ceremony'` (`yardDoorBusy()` S3:4629), `'walk'`.
  - `DQ.instant` (S3:4659) skips door frames only; the walk still runs (README trap).
- Result object `{ ok, reason?, view, room, place }`. APP wrapper `goRoom(name, opener, kbd)` (APP:4005) holds `roomJob` (APP:3973), always passes `{ walkFirst: true }` (APP:4019), then `syncRoomUI()` (APP:3987) and focus to `ROOM_BACK[to]` (APP:3845).
- Walking into a door also switches: `stepPlayer` emits `'playerDoor'` (S3:3255 play door, :3264 stair pad, :3270 yard door) → APP `on.playerDoor` (APP:586) → `goRoom`.

### 1.3 Checklist for a NEW place (e.g. a cafe interior)

S3, every table/switch that enumerates places:
1. Size const (pattern `PLAY_R`/`PLAY_H` S3:29) and `DOOR_ANCHORS` both sides (S3:38-39), `PL_REST` (S3:2584), `PL_FACE` (S3:2585).
2. State var like `PROOM` (S3:410) + `buildX()` (Group, `g.name`, `g.visible = false`, `scene.add(g)`); lazy call in `runDoor` (S3:4655-4656, :4661).
3. `isRoomP` (S3:414) / `outdoorP` (S3:415); `groupOf` (S3:4071).
4. Camera: target var + ternary in `camTargetNow` (S3:425); `FRAME_PT` (S3:443) + `frameView` (S3:449); `PLACE_BOX` (S3:532-534, used by `panBox` S3:537 and `yawPivot` S3:672).
5. Shadow fit box `SHADE_*` (S3:793-796) + ternary in `fitShadow` (S3:807).
6. `showPlace` visibility + position reset lines (S3:4540, :4542).
7. Lights: per-room hook like `playApplyLight` (S3:5032) / `loftApplyLight` (S3:5026) called from `applyLight` (S3:886, hook calls at :902). Keep 2 point lights per room: same count as attic lamp+candle means no new shader variant (comments S3:4692, :4889). `prewarm` (S3:6108) compiles per place.
8. `goRoom` flags and anchor ternary (S3:4632-4640), `'far'` rule (S3:4637); new branch in `runDoor` (S3:4660-4685) setting `PLACE.room` + `container.dataset.room`.
9. Player: `plEnter` anchor ternary (S3:3170); `playerWalkTo` room ternary (S3:3177); `plLim` (S3:2928); `plBoxes` (S3:2938); `plCircles` (S3:2961); door-push table in `stepPlayer` (S3:3253, pad :3259, yard :3267-3270); `plFollow` place test (S3:603).
10. Spots: key in `SPOT_KEYS` (S3:3483, append with `.push` like :3496), branch in `spotInfo` (S3:3499), place branch in `pick` (S3:5527-5574), a `Box3` per tappable.
11. Rotate-view wall cutting: `CUTS` (S3:1011), `cutRoom` (S3:1077), `CUT_DYN`.
12. Frame loop: per-place step in `frame` (S3:6047); normal-pass shade hiding in `draw` (S3:6063, :6070); per-place draw-call log `callsBy`/`framesBy`/`loggedBy` (S3:6087-6090); `stats()` (S3:7007).
13. Sky: `uSky` is on only when `!outdoorP(PLACE.vis)` (S3:6078). `yawHeld` (S3:670) blocks rotation in `exterior`.
14. API list `PLACES` (S3:7023; today lacks `yard`).

APP: name map in `goRoom` (APP:4006); `ROOM_SPOT` (APP:3844, append like :3847); `ROOM_BACK` (APP:3845); hide list in `resetRoomUI` (APP:4000, append like :4003); label in `syncRoomUI` (APP:3991); `sceneDescText` (APP:1176) branch; `on.playerDoor` map (APP:586); `on.view` (APP:579); click handlers in `bindRooms` (APP:4239); `mealRoom(v)` (APP:4534) if the room affects meals.
HTML/CSS: one `<button class="scene-spot" aria-label="…" hidden>` per spot (index.html:164-219); hide lists `#scene.salon-on …` (css/style.css:882), `:root.furn-on .scene-spot` (:1557).
2D: `SCENE2D` spot table (scene2d.js:168) and `goRoom` (:649), or refuse like yard (APP:4010).
Tests: `tools/test-scene-perf.js` T3/T5 (program count equal to boot, play ≤ 60 calls); smoke Z (`scenarioLoft` smoke.js:6204), `scenarioWave8` (:4008), `scenarioTurn` (:7702), `scenarioSceneTap` (:7371); `tools/test-light.js`.

## 2. THE WIDE OUTSIDE (`?wide=1`)

### 2.1 Switch
- `YARD_WIDE` (S3:34): IIFE, true only if `location.search` matches `/[?&]wide=1(?:&|$)/`. Constant for the page life.
- `WIDE = { T: 3.0, S_OUT: 5.0, S1: 16.5, G0: -24, G1: 36, PAN_T: 6.5, PAN_S0: -6.5, PAN_S1: 30, gate: 2.74 }` (S3:35); `wideXZ(sd, td)` (S3:36).
- API probe `scene.wide()` (S3:6917) → `{ on, T, S_OUT, S1, gate, trees:[[shown,total]…], shadow }`.
- Every wide branch is `YARD_WIDE && PLACE.vis === 'yard'` (or `PL.place === 'yard'`); flag off = old yard, pixel-identical (commit e120557 message).

### 2.2 Coordinates
- World x,z in metres; group origin = world origin (groups are pure translations).
- House: `EXT.HX0..HX1` = x -2.3..0.1, `HZ0..HZ1` = z -2.0..-0.2, door axis `HZC` -1.1, porch height `EXT.PL` 0.48 (S3:3734). Porch on the +x face: floor x 0.1..0.48, three steps of 0.12 m to x ≈ 1.2 (`plGroundY` S3:3079). Door anchor `yardAttic` [0.42, 0, -1.1] (S3:39).
- Yard square ±4.6 (`YARD_L`); fence line ±4.3 (`FE = L - 0.3`, S3:5395); walkable square ±3.95 (`YARD_L - 0.3 - PL_MARGIN`, `plLim` S3:2928).
- Garden: `YPLOT = { xs: [0.75, 1.95, 3.15], zs: [1.45, 3.05], w: 0.7 }` (S3:5328), `plotXZ(i)` (S3:5329). Lamp `YARD_LAMP` [0.2, 2.25]. Rest spot `PL_REST.yard` [1.95, 0, 0.55].
- Diagonal axes (comment S3:32-33): `s = (x + z)/√2` = toward the camera = screen DOWN (the direction the road, village and sea continue); `t = (x - z)/√2` = screen RIGHT. Camera yaw is 45° (`YAW` S3:13).

### 2.3 What exists (all inside `buildYard`, S3:5333-5422)
- Ground: one `PlaneGeometry(GW, GW, GN, GN)` with `GW = G1 - G0 = 60` m, centre `GC = 6`, so x,z ∈ [-24, 36]; `GN = round(60 / 1.5) = 40` (vertex-lit, 3200 tris); y -0.004; tag 10 (season ground colour) (≈S3:5338-5340). Replaces the slab strata of the old yard.
- Grass tufts: up to 560 boxes over s ∈ [-22, 34], t ∈ [-10.5, 10.5], skipping the yard square and the path (S3:5359-5363). Merged into the static mesh.
- Stepping-stone path `WPATH`: [2.35,-0.75] → [3.88,-0.35] → [3.88,3.3] → [4.15,4.15] → `wideXZ(S1 + 6.5, 0)` (s 23) (S3:5365-5372).
- Gate: fence on the two front sides stops at `WIDE.gate` 2.74 (gap to the corner 4.3); two thicker posts at [L-0.3, gate] and [gate, L-0.3] (S3:5373-5377, fence gap S3:5396-5399).
- Road-end cross fence: 4 fence pieces at `s = S1 + 0.75` (≈S3:5400). Nothing beyond but ground, path stones to s 23, and forest.
- Forest: `wideTrees()` (S3:5424): up to 190 trees, s ∈ [-21, 33], t ∈ [-10.5, 10.5], min spacing 1.75 m; cleared: yard square + 0.7, the strip (|t| < T + 0.8, s from S_OUT - 1.2 to S1 + 1.7), and |t| < 2.4 for s up to S1 + 9. 45% round (≈770 tris), rest cones (≈120). Appended to the same two `InstancedMesh` as yard trees → no extra draw calls.
- Colliders: `YROOM.boxes` (house body, porch sides, mailbox, lamp, fence stub, and in wide the two front fence runs) and `YROOM.circles` (yard trees, bushes, rocks) (S3:5415-5418). Forest trees have NO colliders (they are outside the walk area).
- No strip/segment/chunk system. Meshes: `stat` (ground+tufts+stones+props), `house`(+`low` cut twin), 2 tree IMs, fence IM, season deco, 2 windows, door, plots.
- Culling: `wideCull()` (S3:855) only refills the tree instance buffers (`WIDE_IM`, `im.count`) when the screen centre moved ≥ 0.75 m or yaw/N/size/sun changed; trees whose shadow reaches the screen stay. Ground/tufts are always drawn.
- Walk area: `yardClamp(x0, z0, x, z)` (S3:2932) = yard square ∪ band `S_OUT ≤ s ≤ S1`, `|t| ≤ T`; you leave the square only toward the front corner (`sd ≥ S_OUT`). `yardOut(x, z)` (S3:2931). `plMove` wide branch (S3:3011-3015) clamps each of three slide candidates.
- Shadows: `fitShadowView()` (S3:816) makes the sun shadow camera follow the visible ground, snapped to texels.

### 2.4 Camera follow
- `placeCamera()` (S3:511): `wide` → distance `WIDE_CAM.dist` 44 and `camDepth(true)` sets `camera.far` 90 + `post.uniforms.uFar` (S3:506-510). Other places: `DIST` 24, near 0.1, far 60.
- Pan bounds `panBox()` (S3:537): wide uses `widePts()` (S3:556) = band `PAN_S0..PAN_S1` × `±PAN_T`, y -0.48..3.3; plus the `_wideKeep` allowance (S3:547-552).
- Follow: `plFollow(arrive)` (S3:600) with `YARD_FOLLOW = [0.8, 1.0]` m dead zone (S3:655) → `followStep` (S3:656) with `FOLLOW = { tau: 0.12, vmax: 3, amax: 8 }` (S3:654). Result is clamped by `panBox` and rounded to art px.
- Rotation: `wideHoldCentre()` (S3:840) runs right after `placeCamera()` in `frame` (S3:6054) and shifts `PAN` so the character stays at the same screen point (rooms rotate about `PLACE_BOX` centre via `yawPivot`). `clampPan()` (S3:567) is called by `yawLive` (S3:681) on every finger event.
- `wideCentre(out)` (S3:839) = ground point under the screen centre.
- Auto-walk to the house door from outside the fence: `playerWalkTo('yardAttic')` wide branch (S3:3180-3196): if remaining path > `WIDE_WALK` 8 m (S3:3175) resolve at once without walking; else three legs gate (3.7, 3.7) → porch foot → door via `wleg`, resolving `ok:false` if a leg is cancelled.

### 2.5 Known problems (wip/round6-world/README.md "넓은 바깥 시험판 검증") vs commit e120557
| # | problem | e120557 |
|---|---|---|
| ① | near plane (24 m) cut ground/trees at s ≈ 30: void band 28 px on 768×1024, hollow trees | FIXED: `WIDE_CAM`, `camDepth`, `placeCamera` |
| ② | after rotating, release / tap / zoom snapped the view back 26-128 px (`clampPan` vs `wideHoldCentre`) | FIXED: `_wideKeep` in `panBox`, `plFollow`, `wideHoldCentre` |
| ③ | from road end, "go for a walk?" / house door = 10.8-12 s unskippable auto-walk, input blocked | FIXED: `WIDE_WALK`, `wleg` chain |
| ④a | at 90° / 270° the character at the band's side edge is hidden by forest | NOT fixed |
| ④b | at the road-end corner, pushing sideways slides 0.15 m when a frame is longer than 0.03 s | NOT fixed |
| — | owner 11-18 night: "too empty" (docs/next/owner-2026-11-18.md §4.3); road ends at a fence, no village/beach | content gap |
e120557 touched only `js/scene3d.js` (+49/-…) and `tools/test-light.js` (+77), adding six L8 checks.

### 2.6 Extending by 40-60 m (village, then beach) — constants and code that bound the map today
- `WIDE.S1` 16.5 (walk end), `WIDE.T` 3.0 (band half width), `WIDE.G1` 36 / `G0` -24 (ground plane), `WIDE.PAN_S1` 30 / `PAN_T` 6.5 (camera range), `plLim` upper bound `(S1 + T)/√2 + 0.05` (S3:2928).
- `WIDE_CAM` (S3:506): comment S3:503-505 requires the whole laid ground (G0..G1) between near and far at any yaw; near stays 0.1 (negative near breaks ray picking). Both grow with the map; `uFar` follows through `camDepth`.
- `yardClamp` is one rectangle in (s, t): a plaza or beach wider than ±3 m needs more areas there and in `plLim`.
- `wideTrees` ranges/cap (190) and clearing rules; tuft loop ranges; `WPATH` end; cross fence at `S1 + 0.75`.
- Ground is one colour tag (10, season recolour `applySeasonYard` S3:5439). Tags in use: 10 ground, 11 tuft, 12 path, 13-16 leaves/bloom, 17 water. Sand/sea need new tags or fixed colours.
- Buildings/NPCs need entries in `YROOM.boxes`/`circles` (S3:5415-5418), `spotInfo` + `SPOT_KEYS`, and the yard branch of `pick` (S3:5543-5547 raycasts plots only, then `spotAt` over `yardAttic` + `plot0..5`).
- Path finding outside the fence does not exist: `plRouteAll` returns null when either end is `yardOut` (S3:3118); `plWalkTo` then walks straight with `plMove` sliding.
- Weather particle volume (`xRows`/`xSpawn` S3:3999-4016) was sized for the diorama [nv]: check rain/snow far from the house.
- `PLACE_BOX.yard`, `FRAME_PT.yard`, `YARD_TARGET (1.0, 1.25, 1.0)` (S3:421) stay house-centred; all travel is `PAN`.
- Budgets asserted with wide on: draw calls ≤ 150 and shader program count unchanged (test-light.js:289).

### 2.7 Making wide the default
- Flip `YARD_WIDE` (S3:34).
- test-light.js L8 "off" block (:204-220) asserts on the DEFAULT url: pan stays 0 in the yard under rotate/zoom (:217); cannot pass x,z 3.96 and the screen corners are void (luma < 0.08) (:220). L9 (:221-263) walks 111 yard spots to the door on the default url. Wide blocks open with `'&wide=1'` (:265, :317, :329).
- `tools/test-scene-perf.js` loads `js/scene3d.js` from `file://` with no query, so it follows the default.
- Yard smoke scenarios (`scenarioGarden` smoke.js:6819 etc.) run on the default url [nv which assert yard pixels/positions].
- docs/next/options-2026-11-18.md §1 and docs/SCENE.md "11-18 바뀐 것" (:271) describe wide as opt-in.

## 3. CAMERA AND FRAMING

- Camera: `THREE.OrthographicCamera` (S3:407), near 0.1, far 60. Dimetric: `TILT` 32°, `YAW` 45°, `DIST` 24 (S3:13). `placeCamera()` (S3:511) = target + offset, then `snapScreen(camera.position, ref)` (S3:716) snaps the target to the art-pixel grid on the camera right/up axes (`_r`, `_u`).
- Render size `resize()` (S3:730): `p = max(look.pixelSize|DEF_P(2), ceil(W/480))`; target `rw = floor(W/p)`, `rh = floor(H/p)`; canvas CSS = `rw·p × rh·p`, centred (`S.offX/offY`). State `S = { W, H, p, rw, rh, cw, ch, N, pw, offX, offY }` (S3:476).
- Scale `applyZoom()` (S3:740): `S.N = round(PX_PER_M · 3 / S.p · st.zoomF)` art px per metre (27 at p=2, 18 at p=3); frustum = `rw/N × rh/N` metres; `S.pw = 1/N`. On-screen size = `N·p` = 54 CSS px per metre × `zoomF`, independent of p and of screen size.
- Zoom: `st.zoomF` starts 1 (S3:351), range 1..2; stops `ZOOM_STEPS` = 2^(k/6), k 0..6 (S3:17); `setZoom` (S3:750), `zoomN` (S3:762), `zoomEase`/`zoomSettle` (S3:764-768), API `zoomStep`/`zoomTo`/`pan()`/`recenter` (S3:6962-6965).
- Passes in `draw()` (S3:6058): beauty → `rt` (Nearest, with `DepthTexture`), normals → `rtN` (`overrideMaterial = normalMat`), emissive layer 1 → `rtE` (+2 blur passes via `rtB`, off when p ≥ 4), then full-screen `post` (FRAG S3:129-191) to the canvas. Targets declared S3:366-377.
- Post uniforms (S3:380-384): `tDiffuse, tDepth, tNormal, tBloom, uBloom, uRes, uNear 0.1, uFar 60, uPalOk/uPalRgb[72], uPalN, uW, uDither, uOutline, uHasNormal, uVig, uSky, uStars, uSkyOk, uBayer, uKeepAlpha, uFade, uFadeOk`.
  - Depth outline: `dei` 2 steps from 6 cm depth difference (S3:169); normal highlight `nei` (S3:170); dither only on tone ramps (S3:173-175), zero for 0.3 s after any camera move (`dither.still`, S3:404).
  - Void pixels = `step(uFar - 0.5, d0)` (`bgk`, S3:176): vignette + sky band (`hz` centred at `vUv.y` 0.46, upper sky, stars) (S3:177-184). Palette snap in OKLab to ≤ 72 colours (S3:186-190).
- Vertical placement: `frameView()` (S3:449) → `liftOf()` (S3:444) puts the floor's front corner (`FRAME_PT[place][0]`) at `FRAME_Y` 0.68 of the scene height, keeping `FRAME_TOP` 48 CSS px above the top point (S3:442-443). Play room: `framePlay()` (S3:434), `PLAY_SPAN_PX`, `PLAY_TOP_PX` (S3:433). `frameY()` (S3:455) reports the result (`stats().frameY`).
- Scene box: `<html data-layout="one">` in 3D (index.html:82, APP:643-649) → `#shell` = 100dvh and `#scene` height 100% (css/style.css:1404-1406); stacked/2D = `clamp(250px, 44vh, 400px)` (:933).

### 3.1 Where the empty space comes from (computed from the constants, not measured)
| screen | p | target (art px) | visible metres (w × h on screen axes) | attic (≈9.1 × 7.8 m projected) | play room (`PLAY_SPAN_PX` 6.69 m) |
|---|---|---|---|---|---|
| 360×740 | 2 | 180×370 | 6.67 × 13.70 | ≈210 px tall = 57% of height; 246 px wide (sides off-screen) | ≈181 px = 49% |
| 412×915 | 2 | 206×457 | 7.63 × 16.93 | ≈46% | ≈40% |
Loft: ≈157 px (floor corner → gable peak) to ≈184 px (full `PLACE_BOX`), i.e. ≈42-50% / ≈34-40%. Attic gaps with `FRAME_Y` 0.68: ≈53 art px (106 CSS px) above the wall top and ≈107 art px (214 CSS px) below the slab at 360×740; ≈112 / ≈135 art px (224 / 270 CSS px) at 412×915. Cause: metric scale is fixed (27 art px/m) while the frustum height grows with the screen; rooms are 6-8 m tall on screen, the phone shows 13.7-16.9 m. `FRAME_Y` then leaves ≈32% of the height below the floor corner (HUD, stick zone = `min(30%, 240px)`, css:1192) and the rest above. What fills it: `scene.background` = `LIGHTS[phase].bg` (S3:778, :899) + the `uSky` band; outdoors `uSky` is 0 (S3:6078).

### 3.2 Levers (what each also touches)
1. `st.zoomF` default (S3:351) or a per-screen base zoom: the only lever that enlarges everything without touching art constants. Also changes: `panBox` (rooms already use full bounds, exterior scales with `zoomF - 1`, S3:546), `touchMode()` switches to `touch-action: none` when `zoomF > 1.001` (S3:712), `cerFollow` activates when `zoomF > 1.001` (S3:591), `zoomTo` chip cycle, `plEyeLod` (S3:2676), spot button rects, the stair edge-button condition (§6.3), every test that assumes N 27 at 360×740 or 412×915 (test-light L7 :198-202, smoke Z, `stats().zoom`). Static props are snapped to `SNAP_N` 27 (S3:14, `snapPos` S3:81): at N 30/34 they are off the pixel grid.
2. `PX_PER_M` (S3:13): `SNAP_N` follows, but literals assume 27: `6 / 27` in `PLAY_YC` (S3:430) and `PLACE_BOX` (S3:533-534), `PL_EYE` (`4 / 27`, `1 / 27`, S3:2598), art sized in 1-px details (octopus mouth 3×1 px, eyes 4×4). Breaks every pixel-count/screenshot check.
3. `FRAME_Y` / `FRAME_TOP` (S3:442): moves the room vertically only; `tools/layout-shots.js` and `stats().frameY` read it.
4. Background fill in the shader (S3:176-184): no draw calls; applies only to void pixels and only indoors. Outdoor/intro have `uSky` 0.
5. Geometry around rooms (ground plane like S3:5339): +1 mesh = +2 calls (beauty + normal) + shadow fit (`SHADE*`); changes `voidAt` (S3:6898) answers and the void-luma assertions (test-light.js:220, :283).
6. Room size consts (`R`/`RF`, `PLAY_R`, `LOFT_R`): move anchors, colliders, saved furniture (`S.room.layout`), T7 wall number 3.15 (test-scene-perf.js:522).
7. `p` (pixel size): no size change, detail only; `Math.ceil(W / 480)` raises it on wide screens.
The "12 art-pixel rules" document was not located in this pass [nv]; pixel rules cited in code: integer N per zoom stop (S3:741), targets/props/particles snapped (`snapScreen`, `snapC` S3:722, `snapDelta` S3:726, `snapUp` S3:720), draw calls ≤ 150 (S3:6087-6090), recipe files named in S3:6.

### 3.3 Two-finger rotate, pinch, pan
- One state machine `GEST = { mode, pts, n, hold, wheelT }` (S3:531): `'' | press | pan | multi | pinch | twist | yaw | done`; grammar comment S3:5568-5574.
- `listen(canvas, 'pointerdown', …)` (S3:5645), `startPan` (S3:5582), `panMove` (S3:5587), `panRelease` (S3:5593), `startMulti` (S3:5607), `multiMove` (S3:5615): angle change > 7° → rotate (1:1, endless), distance ratio > 1.06 → pinch (continuous integer N around the finger midpoint); both can run together. `yawRelease` (S3:5635) → inertia `YAWX.v` (`YAW_TAU` 0.12, `YAW_VMAX` 3.5, S3:669). `pointerEnd` (S3:5680).
- Wheel = one stop (S3:5709); Q/E keys (S3:5730); mouse right-drag or Shift-drag = rotate; `setYaw(deg, instant)` (S3:703); `yawDrag`/`YAWX` (S3:480); `stepYaw` (S3:685); `yawHeld()` (S3:670) forces the base view during intro, exterior, play kit, salon, ceremony, furniture mode. Walls in front are cut by `applyCuts()` (S3:1018).
- Pan: `PAN` (S3:530), rubber band `band` (S3:560), `panSettle` (S3:580), `panLocked` (S3:536).

## 4. PLAYER CHARACTER MOVEMENT

- State `PL` (S3:2908): `place, pos, yaw, wantYaw, walking, pending, phase, moving, antic, stick, held, dir8, sit, hop, tbl, camGap, doorArm, doorCd, yardArm, yardBack, frame, look`. Group `plG`, body `plBody`, 7 meshes `plMeshes` = head, eyes, torso, armL, armR, legL, legR (S3:2905-2906), material `toonP` (S3:957).
- Constants (S3:2583): `PL_SPEED` 1.8 m/s (auto-walk), `PL_RUN` 2.2 m/s (stick/keys), `PL_STRIDE` 0.40, `PL_RUN_STRIDE` 0.55, `PL_TURN` 24, `PL_ANTIC` 0.12 s, `PL_LEG` 0.45, `PL_ARM` 0.4, `PL_SWAY` 0.045, `PL_H` 1.22. `PL_RAD` 0.25, `PL_MARGIN` 0.35, `PL_OCT_R` 0.6 (S3:2917).
- Input: APP stick (`.stick-zone`, APP ≈:4578-4664, `stickShow` APP:4648, `stickSync` :4664) → `setPlayerInput({x, y} | null)` (S3:2918), screen axes, length 0..1 (analog: speed scales with length). `playerInputAllowed()` (S3:2925), `playerInputPause()` (S3:2924). There is NO tap-to-walk on the floor (owner decision 11-08, comment S3:2912); taps walk only to doors/stairs/seats.
- `stepPlayer(dt)` (S3:3229): stick step `PL_RUN * dt / st.speed` (S3:3247) → `plMove(dx, dz)` (S3:3007: clamp to `plLim`, then full / x-only / z-only against `plPen`); door/stair/yard pushes (S3:3253-3270); push-out from the octopus (S3:3272-3280).
- Auto-walk: `plWalkTo(to, face)` (S3:3140) → Promise<bool>; waypoints from `plRoute` (S3:3091, one-box detour) or `plRouteAll` (S3:3114, Dijkstra over obstacle corners; yard and fallback); timeout `dur * 1.5 + 0.3` s; `plStop` (S3:3084) cancels WITHOUT resolving. `playerWalkTo(anchor)` (S3:3176) → `{ ok, walked, anchor, at }`. `plRest` (S3:3165), `plEnter` (S3:3166), `plFinish` (S3:3205).
- Walk areas: `plLim()` (S3:2928) square per place (attic [-2.15, 3.15], play ±2.45, loft ±1.85, yard ±3.95 or wide bound) + `yardClamp`; obstacles `plBoxes()` (S3:2938) and `plCircles()` (S3:2961).
- Animation (S3:3285-3310): phase advances by distance / stride (`stick ? PL_RUN_STRIDE : PL_STRIDE`, S3:3287); 4 frames `f = floor(4u) & 3` = stand, left, stand, right (S3:3298); legs ±`PL_LEG`, arms opposite, body sway, -1 px on step frames; facing quantised to 8 directions with hysteresis (`PL.dir8`, S3:3294-3295); footprints `plFoot` (S3:3053) + `emit('playerStep')`; arrive squash 80 ms; blink.
- Where a run gait goes: speed at S3:3247 (stick) and S3:3148/:3158 (auto-walk), stride at S3:3287, limb amplitudes at S3:3301-3306, a held-time counter next to `PL.held`. Things tied to speed: `FOLLOW.vmax` 3 m/s camera cap (S3:654), `plWalkTo` timeout, `WIDE_WALK` reasoning (S3:3175), T7 asserts 1.1 m in 0.5 s and `STEP = 2.2 / 60 + 0.0011` (test-scene-perf.js:501, :520, :524), footprint count 3-5 per 1.1 m (:504), L9 longest-walk seconds (test-light.js:254).
- Camera during walks: `plFollow` (S3:600): stick → edge margin 1.1 m (rooms) or `YARD_FOLLOW` (yard); auto-walk → `PL.camGap` (0.5 m doors, 1.5 m stair; set in `playerWalkTo` S3:3179); after a room change `PAN.arrive` once (≈S3:628-633).
- Carrying: none for the player (no `PL.carry`/hold state). Existing carry-like code: octopus poster `carry` mesh on `bodyG` (S3:2331, shown by `setOctState('carry')` S3:3430); play-kit arms `hold`/`grab`/`lift` (S3:6366-6418, play.html only).
- Sitting: sofa `playerSit()` (S3:3213): walk to the front, 0.34 s hop (`PL.hop`, S3:3237-3241), `PL.sit`. Table `playerSitTable()` (S3:4194): needs `PROOM`, `PL.place === 'play'`, input allowed; walks to `BOOTH.me.aisle` [0.21, -0.30], hops to seat (`BOOTH.me.x/z`, `seatY - 0.24`), sets `PL.tbl`, faces `BOOTH.me.yaw`; resolves true/false. `playerStandTable()` (S3:4206), `plStand` (S3:3207), `tableStood()` (S3:4215). Pushing the stick while seated stands up (S3:3242). `plEnter` clears sit/hop/tbl (S3:3171).

## 5. THE OCTOPUS MODEL

- One instance: `octG` → `bodyG` (S3:2284), scale `OCT_R` 0.42 m; local unit = head radius; `HEAD_Y` 0.92, `HEAD_SQ` 0.88 (S3:2283).
- Meshes (material `toon`, vertex colours): `head` (merged `headParts`: body sphere tag 1, highlight tag 2, mouth tag 3, eye whites) (S3:2286-2291); 2 `pupils` (S3:2292-2295); face parts `lids, arcs, blush, linesB, linesS, bigEyes, smile` hidden at idle (S3:2299-2306); 8 `arms`, each its own mesh from `armParts()` (S3:2309) with `ARM`/`ARM_ROOT` (S3:2308), suckers tag 4; invisible `hit` sphere (S3:2330); `carry`; ground decal `octDecal` (S3:2332). Idle visible: 1 + 2 + 8 + decal.
- Colour: `octDerived(hex)` (S3:120) → `OC { body, hi, pale, mouth, eye, white, blush }`; `setColor(hex, o)` (S3:2393) rebuilds the snap palette (`buildPalette(hex, st.palette, salExtra())`, S3:95) and recolours by tag (`octColor` S3:2391, `octLook` S3:2392, `recolor` S3:240).
- Poses/faces: `EXPRESSIONS` (S3:40), `FACES` (S3:2401-2410), `setExpression` (S3:2422), `setOctState` (S3:3414), gait `GAIT` (S3:2385) + `stepGait` (S3:3606), `stepOct` (S3:3643), fade `FADE`/`setOctFade` (S3:2371), walking `moveTo`/`jumpTo`/`walkPoint` (S3:2532-2539), anchors `ANCHORS` (S3:24).
- Costumes: `COSTUMES` (S3:337), `OCT_WEAR` part functions in head-radius units (S3:2343), `octWearSlot(slot, id)` (S3:2352), `setOctWear({head, back})` (S3:2362).
- More than one octopus on screen today: no. Only the mirror reflection in the salon (`salReflect` S3:2093) and portraits.
- What NPC octopuses would need: new geometry built from the same part lists (`headParts`, `armParts`, an `OCT_WEAR` function for a hat) baked with another colour via `mergeParts` (S3:221); one merged mesh per NPC costs 1 beauty + 1 normal call (+1 shadow if `castShadow`); a decal like `octDecal` is one more transparent call. Sleeping face = bake the `linesS` boxes (S3:2304) instead of pupils. Colours must exist in the snap palette (`PAL.list`, ≤ `PAL_MAX` 70, shader array 72): add through the `extra` argument of `buildPalette` (accepted only if > 0.02 OKLab from existing colours, S3:108). `toon`/`lambert` on an `InstancedMesh` or with instance colours creates a new shader variant (trees already use instanced `lambert`). Colliders → `YROOM.circles`; taps → §6. The octopus `hit`/`oct` state, `PL_OCT_R` logic and `octTappable` are singletons.
- Design rule on record: docs/next/options-2026-11-18.md §2 C and wip/round6-world/README.md §5 flag code-driven neighbour octopuses as needing the "demo rule" labelling decision; wip/round7/README.md D2 requests them.
- Cost limits asserted: scene `console.error` if calls > 150 per place (S3:6087-6090); test-scene-perf.js: T3 no new programs on first exterior (:66), T5 play ≤ 60 calls (:201) and programs equal to boot (:202, :226), T6 idle ≤ base + 8, dye ≤ base + 16 and ≤ 150, programs equal (:332-334), T7 [play ≤ 60, programs equal per header :11]; test-light.js L8 wide: calls ≤ 150, programs equal (:289). docs/SCENE.md:19 states attic 77 / 85 calls.

## 6. SPOTS AND TAPS

### 6.1 Mechanism
- APP passes real `<button>`s: `bindSpots()` (APP:3979) → `scene.hotspots(map)` = `setHotspots` (S3:3600) keyed by `SPOT_KEYS` (S3:3483 + `push('sewDoll')` :3496): `atticPlay, playAttic, machine, salon, atticStair, loftStair, sew, plot0..5, atticYard, yardAttic, counter, table, sewDoll`. APP table `ROOM_SPOT` (APP:3844, :3847).
- Every frame `updateOverlay` (S3:3467) → `updateSpots()` (S3:3550): for each key `spotInfo(id)` (S3:3499) projects a `Box3` with `boxScreen` (S3:3484), clips to the scene, hides if the visible part < `SPOT_MIN_VIS` 8 px, grows to ≥ 44×44, and writes `left/top/width/height`, `data-spot="over"` (or `"edge"`) and `hidden`. The scene owns `hidden`.
- `data-spot="over"` buttons have `pointer-events: none` (css:1150): fingers hit the canvas. `pick(cx, cy)` (S3:5527) decides per place: play → `playSurface()` (S3:5515, first visible face) then `spotAt`; loft → octopus/mirror raycast then `spotAt(['loftStair','sew','sewDoll','salon'])` (S3:5541); yard → plot raycast then `spotAt` (S3:5543-5547); attic → posters/souvenirs/octopus/door meshes, window `glass`, yard-door darkness, `spotAt(['atticYard','atticStair'])` (S3:5557), `nearItem` (S3:5507). A picked spot → `spotTap(id)` (S3:3586) → `el.click()`; `guardTapClick` (S3:3591) swallows the browser's follow-up click. Keyboard/screen readers use the buttons directly.
- Other scene → APP events (`opts.on`, wired APP:566-587): `tap, pet, windowTap, octUp, place, door, view, playerInput, furnEdit, furnSave, tableSpot, sofaSpot, playerDoor, playerStep`. `emit(name, a, b)` (S3:4074). `tableSpot` = `{ seat, call, dish }` in scene CSS px (S3:4384-4392) → `mealSpots` (APP:4369) positions `#btn-seat`, `#btn-call`. `sofaSpot` → `#btn-sofa` (S3:1837, APP:585).

### 6.2 Adding a tappable object
1. `Box3` in the place's state object (pattern `dollBox` S3:5018). 2. `SPOT_KEYS.push('x')` + `spotInfo` branch. 3. Add the id to the place's `spotAt([...])` list in `pick` (or a raycast before it). 4. index.html: `<button type="button" id="btn-x" class="scene-spot" aria-label="…" hidden></button>` (name only in `aria-label`; `#btn-sew-doll` has no `title`, index.html:201). 5. APP: `ROOM_SPOT.x = 'btn-x'`, handler in `bindRooms` (APP:4239), id in `resetRoomUI` hide list (APP:4000/4003). 6. Hide lists css:882 if it must hide during the salon.

### 6.3 The left-edge stairs button (to remove; stairs stay tappable)
- Element: `#btn-stair` (index.html:192; comment :190-191), `class="scene-spot"`, `aria-label="위층으로"`, child `span.stair-box > svg.stair-ico`.
- When it shows: `spotInfo('atticStair')` (S3:3523-3530). Normal result is `mode:'over'` over `STAIR_BOX` (S3:3481) or `STAIR_LOW` (S3:3482, reset :3498) when the stair is cut. It returns `{ mode:'edge', side:'left'|'right', y }` when the stair box is clipped by a screen edge and the visible width < `STAIR_EDGE_VIS` 40 px (S3:3497) or visible height < 8 px. `y = clamp(round(q.b - 8), 56, H - min(0.3·H, 240) - 48)`. At 360-430 px width in the base view the stair (left wall front corner, `STAIR` S3:37) is off the left edge → the button shows whenever the attic is visible and nothing is busy.
- Positioning: `updateSpots` edge branch (S3:3561) clears inline box styles, sets `style.top = y` and `data-side`; CSS does the rest: `#btn-stair[data-spot="edge"] { left: 4px … z-index: 9 }` and the `.stair-box` 36×36 look (css/style.css:1136-1146; right side :1138).
- Tap path while in edge mode: `pick` fallback (S3:5558-5561) accepts a tap on a visibly drawn tread via `stairRayDist` (S3:1546); S3:5562 lets furniture in front win (`furnRayDist` S3:1553).
- Click: `bindRooms` `on('btn-stair', … goRoom('loft', b, k))` (APP:4251). Walking: push toward -x in the stair foot cell (S3:3259-3264).
- All mentions: S3 :3481-3483, :3497-3498, :3523-3530, :3561, :5557-5562, `DOOR_ANCHORS.atticStair` :38, `STAIR` :37, `plBoxes` stair box :2951, stair push :3259-3264, `plFollow` `atFoot`/`camGap` (:610-611, :3179); APP :586, :3844, :4000, :4251, :4728 (`HINT_SPOTS` third entry = hand hint on `btn-stair`); index.html:190-192; css/style.css:882, :1136-1146; tools/test-light.js :96-97, :128, :147, :183-188, :200-202; tools/smoke.js :2274 (hint order `['btn-door','btn-yard','btn-stair']`), :3095, :6259-6262, :6267, :6276, :6429, :6572, :6579, :7812-7813; docs: docs/SCENE.md "11-18 바뀐 것" (:271), docs/next/owner-2026-11-18.md §2, docs/next/options-2026-11-18.md §8, wip/round6-world/README.md (FM note).
- Tests that pin the edge mode: test-light.js:201 (`g7[180].spot === 'edge'`, 360 wide at 180°), :202 (`g7w.spot === 'edge'`, 412 wide base view), :128 (button vs stick zone), :147 [nv exact assertion]; smoke Z helper :6259 and FM hint (:2262-2274) read the button's real rect.
- Consequence to handle: with the edge mode gone, `spotInfo` falls through to the generic clip (S3:3540-3545) → button hidden when < 8 px is visible → no focusable stair button for keyboard/screen reader at 360 px base view, and `ROOM_BACK`/`HINT_SPOTS` targets that are hidden are skipped (`hintBtn` APP ≈:4743).

## 7. THE LOFT MANNEQUIN

- Built inside `buildLoft` as parts pushed to `pp` (S3:4976-4984) at `mx = -1.8, mz = 0.2`: base/pole `W[1]`, torso cone + shoulder sphere `PAL.amber[3]`, hip `PAL.amber[2]`, neck `PAL.paper[1]` (:4978-4980).
- White dress (:4982-4984): bodice `CylinderGeometry(0.165, 0.215, 0.42, 9)` at y 0.85 and shoulder sphere r 0.17, both `FIXED.white` (`#fbf6ea`, S3:86); waist band `PAL.rose[2]` at y 0.66; flared skirt `CylinderGeometry(0.22, 0.36, 0.42, 10)` at y 0.45 `FIXED.white`; hem ring `PAL.paper[1]` at y 0.245.
- All of it is merged into the loft static mesh `room = mergeParts(pp)` (S3:4996) with material `lambert` (`MeshPhongMaterial({ vertexColors: true })`, S3:936; no texture map). Parts carry no `tag`.
- `pp` passes through `cutSplit(pp, { walls: CUT_LW, keep: […] })` (S3:4994-4995) for rotate-view cutting; the mannequin is not in a `keep` box [nv how it is assigned].
- Dye colours do NOT reach it: dyes go APP → `scene.setPlayerDyes(u.dyed)` (APP:5254) → `PL_DYES` (S3:2867), `plDye` (S3:2878), `setPlayerDyes` (S3:2880), player meshes only.
- Spot: `LROOM.dollBox` (S3:5018) → key `sewDoll` (S3:3496, :3531-3533, :5541) → `#btn-sew-doll` (index.html:201, `aria-label="마네킹 · 옷 물들이기"`) → `openSew()` (APP:4254, :5401). Collider `[mx, mz, 0.3, 0.3]` in `LROOM.boxes` (S3:5019).
- Scale for a print: 1 art px = 3.7 cm at 1× (S3:13); the bodice is ≈9-12 px wide.
- Textured materials that already exist: posters `posterMat` + canvas textures (`setPosters` S3:1881), `decalMat` (S3:962), player eye atlas (`plDrawEyes` S3:2650), footprints `footTex` (S3:3027). A new material variant changes the program count pinned by tests (§5).

## 8. TABLE / DISH

- Geometry only, no texture. `BOOTH` (S3:4090-4093): booth x -1.53..0.66, z -1.92..-0.62; table x -0.47..-0.06, z -1.70..-0.80, top 0.63; `BOOTH_DISH` = [table centre x, 0.63, `dishZ` -0.99] (S3:4100).
- State `TB` (S3:4097-4099): `dish, look, mesh, steam, n` (bites left, 4), `eaten`, `crumbs`, `queued`, `oct` (`none|coming|seated|leaving`), `meBite`.
- `setTableDish(dish, o)` (S3:4146): `dish = null | { id, recipe, look, seed }`, `o.appear`; queued while `TB.busy()`; same `id` keeps bites. APP call: APP:4302 (`{ id, recipe, look, seed }`), clears at APP:4477, room sync `mealRoom` (APP:4534).
- Drawing: `dishParts()` (S3:4113): plate = two cylinders (r 0.17, colour `DISH_PLATE()[look.plate]`), then per `recipe`: `'jeon'` 4 boxes + moss dots (:4117-4121), `'jumeokbap'` shrinking cylinders + seaweed band (:4122-4125), `'kkochi'` skewer + 5 fruit boxes (:4126-4129), else a cloche (:4130-4132); crust tone `dishBand(look)` from `look.band` 0..2 (S3:4112); crumbs. `dishRebuild()` (S3:4136) merges into one mesh `TB.mesh` (`lambert`, name `'tableDish'`, child of `PROOM.g`) and rebuilds on every bite; steam = `T.Points` with `steamMat` (S3:4452). `stepDish` (S3:4161): 6-frame drop-in at 12 fps + steam every 1.5 s.
- Bites: `biteTake(who)` (S3:4182) has per-recipe piece order; `mealBite(who)` (S3:4221); a new recipe needs branches in both `dishParts` and `biteTake`.
- Tap: `playSurface()` returns `'table'` for the dish mesh and seated bodies (S3:5520); spot `table` → `#btn-table` (index.html:206) → `mealTableTap` (APP:4377).
- Counter: `PROOM.counterBox` / `legBox` (S3:4881) on the back wall right side; spot `counter` → `#btn-cook` (index.html:203) → `openCook` (APP:4101) / `dishPickOpen` (APP:4172). Its coordinates (`KX`, `cx`, `cz`) [nv].
- 2D dish pictures used by the kitchen UI are outside this file (cook modules, `tools/test-cook-dishes.js`, `tools/test-cook-stickers.js`) [nv].
- Carried-dish prop: nothing exists. Arm rotations are overwritten every frame in `stepPlayer` (S3:3301-3304); `showPlace` clears an empty plate when leaving play (S3:4539).

## 9. TESTS THAT PIN SCENE BEHAVIOUR

- `npm test` (package.json:11) = node-only suites (`check-world`, `test-brain`, `test-meal`, `test-cook*`, `test-salon`, `test-export`, …). Browser suites run separately: `tools/test-light.js`, `tools/test-scene-perf.js`, `tools/smoke.js` (Playwright).
- `tools/check-world.js`: invariants of `js/world.js` (the wiki-walk graph: no isolated nodes, related/tangents targets exist, memories ≥ 2, clue present, corner ids, sticker/souvenir keys; forbids `import`/`export` and `Math.random`). It does not look at the 3D scene.
- `tools/test-scene-perf.js` (harness 360×326, own rAF, no app): T1 frame caps (idle 30 fps, moving 60); T2 `pickAt` targets; T3 program count; T5 play room (door frame sequence `1234` / `43210`, slide integer art px, calls ≤ 60, hotspot rects, programs equal to boot); T6 salon (calls, programs, timing 4-6 s); T7 movement: 1.1 m per 0.5 s = 2.2 m/s (:501, :520), wall stop x 3.15 = `RF - 0.35` (:522), obstacle stop `STEP` (:524), rest spot (1.65, -0.1) (:528), octopus radius 0.55-0.66 (:530), footprints 3-5 then 0 (:504).
- `tools/test-light.js` (default viewport 360×740, `open()` :38-39): L7 tap grid stairs vs yard door at 360 (0°/90°/180°) and 412 wide incl. edge-button modes (:198-202); L8 off (:217, :220) and wide (:283-289: ground luma > 0.25 at corners, fence x ≤ 3.96, walk s > 10, band `t ≤ T`, end `s ≤ S1`, character y between 90 and `vh - 230`, ±8 px after rotation, calls ≤ 150, programs equal; :304-313 far/near door walk, `goRoom` ≤ 2 s; :325 768×1024 void band 0; :350, :364 rotation hold ±8 px / ≤ 4 px); L9 111 yard spots reach the door, house-back push does not enter (:254, :263).
- `tools/smoke.js` scenarios touching rooms/camera (letter = name in the run list ≈:8098-8116): J `scenarioWave8` (:4008, play room), Z `scenarioLoft` (:6204: stairs helper, salon, sewing) and Z `scenarioSceneTap` (:7371; both carry the letter Z), X `scenarioGarden` (:6819, yard plots), EAT `scenarioEat` (:7844, table), O `scenarioLayoutOne` (:5284), G `scenario2D` (:1175), P `scenarioPlayer` (:1336), I `scenarioCeremony` (:1013), FM `scenarioFirst` (:2219, first run incl. hand hints :2262-2274), Y `scenarioSalon` (:3061), `scenarioTurn` (:7702, rotation and cut walls, stair rect at 90°/270° :7812-7813; letter [nv]). New scenarios use two-character names (`W7` etc., §0).
- Numbers the round-7 changes would break: stair edge-button modes (L7 :201-202, smoke :2274), scene text `sceneDescText` strings ("불씨 하나 켜진 다락", APP:1185; smoke reads `#scene-desc`, e.g. :6267), 2.2 m/s and footprint counts (T7), default-off wide (L8 :217/:220), any 1× framing at 360×740 / 412×915 (L7, smoke Z), program count = boot count and calls ≤ 60 (play) / ≤ 150.

## 10. TRAPS (code references)

1. `DIST`, `near`, `far` are shared by all places: change them only under `YARD_WIDE && PLACE.vis === 'yard'`, and keep `uFar` equal to `camera.far` (`camDepth` S3:507; `bgk` void test S3:176).
2. Negative `near` breaks tap rays (three r128 ray starts at the camera plane) (comment S3:505).
3. `goRoom` `instant` skips door frames, not the walk; a walk promise that never resolves leaves `DQ.pending` true and blocks all input (S3:4645-4650; `plStop` does not resolve, S3:3084; see `wleg` S3:3186).
4. One-line tables are shared between branches: append on a new line (`SPOT_KEYS.push` S3:3496, `ROOM_SPOT.sewDoll` APP:3847, `resetRoomUI` APP:4003) instead of editing the line.
5. Hidden groups still get ray hits: `pick` filters by place and `octTappable()` (S3:5491); add new tappables to the right place branch only.
6. `data-spot="over"` buttons never receive pointer events (css:1150); a spot missing from `pick`'s `spotAt` list is dead for touch but works for keyboard.
7. Shader program count must equal the boot count (T3/T5/T6, L8): new material types, instancing on `toon`, textures on `lambert`, or a different number of lights in a place add variants (`prewarm` S3:6108).
8. Post-process snaps every pixel to `PAL.list` (≤ 70): a new colour not near a palette cell shifts hue; add via `buildPalette` `extra` (S3:108) and note T6's "no pixel outside the corner changes" check.
9. Static props are snapped with `snapPos` to 1/27 m (S3:81); moving things must use `snapScreen`/`snapUp`/`snapC` or they shimmer.
10. `plLim` is a single [lo, hi] used for both x and z (S3:2928); non-square areas need `yardClamp`-style code in `plMove` (S3:3011).
11. `PL.pos.y` stays 0; height is drawn by `plGroundY` (S3:3079) only for the yard porch.
12. `showPlace` resets pan and sets `PAN.cut`/`PAN.arrive` (S3:4542); `wideHoldCentre` ignores frames with `PAN.cut` (S3:844).
13. `playerInputAllowed()` is false in `exterior` and during `DQ`/`PLACE.trans`/intro/furniture mode (S3:2925); APP hides the stick on `on.playerInput` (APP:580).
14. `tools/check-world.js` is about `js/world.js` (wiki graph), not the map; map behaviour is pinned by test-light L7-L9, test-scene-perf, smoke.
15. Yard and the octopus's `exterior` are separate places by owner decision (11-15, options doc §3); the octopus group never enters `yard` (S3:4543, `plCircles` S3:2964-2966).

## Summary (12 lines)

1. Five drawn places: `attic` (inline), `exterior` (octopus walk stage, inline), `play` (`buildPlayRoom`), `loft` (`buildLoft`), `yard` (`buildYard`); one visible at a time via `PLACE` + `showPlace`; rooms switch through `goRoom` → `runDoor` (door 4 frames + 0.6 s slide).
2. A new place touches about 14 enumerations in `js/scene3d.js` (targets, `FRAME_PT`, `PLACE_BOX`, `SHADE_*`, `showPlace`, `groupOf`, `goRoom`/`runDoor`, `plEnter`, `plLim`/`plBoxes`, `spotInfo`/`pick`, cuts, frame loop) plus `ROOM_SPOT`, `resetRoomUI`, `syncRoomUI`, `sceneDescText`, `bindRooms` in `js/app.js` and a button in index.html.
3. Wide outside = `YARD_WIDE` (`?wide=1`) + `WIDE`: one 60×60 m ground plane (x,z -24..36), fence gate at the front corner, a walk band s 5..16.5 × t ±3, 190 culled instanced trees, road ends at a cross fence; no village, no beach, no segments.
4. Outdoor axes: `s = (x+z)/√2` runs from the house toward the camera/screen bottom (the future road → village → sea direction), `t = (x−z)/√2` is screen right; house at x -2.3..0.1, z -2.0..-0.2.
5. Commit e120557 fixed near-plane clipping (`WIDE_CAM` 44/90), snap-back after rotation (`_wideKeep`) and the 11 s forced walk (`WIDE_WALK`); still open: forest hiding the character at 90°/270°, 0.15 m corner slide, and "too empty".
6. Extending 40-60 m means growing `WIDE.S1/G1/PAN_S1`, `WIDE_CAM`, `plLim`, `yardClamp` (single rectangle), tree/tuft ranges, and adding colliders + spots; making it default flips `YARD_WIDE` and breaks test-light L8-off (:217, :220).
7. Camera is orthographic 32°/45° at a fixed 27 art px per metre (54 CSS px/m at 1×); rooms are 5.8-7.8 m tall on screen while a 360×740 phone shows 13.7 m, so they cover ≈42-57% of the height (≈34-46% at 412×915; computed from the constants, not measured); only `st.zoomF` (or `PX_PER_M`) changes size, `FRAME_Y` 0.68 only shifts; the empty area is `scene.background` + the shader sky band (`uSky`, void pixels, indoors only).
8. Player: stick 2.2 m/s (`PL_RUN`), auto-walk 1.8 m/s (`PL_SPEED`), 4-frame distance-driven gait, 8-direction facing, no floor tap-to-walk, no carry state; camera follow capped at 3 m/s (`FOLLOW.vmax`); T7 pins 2.2 m/s.
9. Octopus is a singleton (`octG`: head + 2 pupils + 8 arm meshes, `toon`, tag recolour via `setColor`); NPCs need separately baked merged meshes, palette entries, colliders and spots; budgets: ≤ 150 calls per place, ≤ 60 in play, shader programs equal to boot.
10. Taps: canvas `pick()` → `spotTap` → real buttons positioned by `spotInfo`/`updateSpots`; the left-edge stairs button is the `mode:'edge'` branch of `spotInfo('atticStair')` (S3:3529-3530) + css/style.css:1136-1146, pinned by test-light L7 (:201-202) and the smoke hand-hint order (:2274).
11. Mannequin dress = untagged white parts in the loft static mesh (S3:4982-4984), dyes never reach it; table dish = per-recipe merged geometry in `dishParts` (S3:4113), no texture; no carried-dish prop exists.
12. Basis: line numbers are for commit f17d1df; the lead added `[7-<key>]` lane marker lines to the working tree while this map was written (§0 lists them and the line offsets); not verified and marked `[nv]`: loft in the 2D fallback, counter coordinates, where the kitchen's 2D dish pictures live, weather volume far from the house, mannequin wall-cut assignment, three test details, and the "12 art-pixel rules" document, which was not located.
