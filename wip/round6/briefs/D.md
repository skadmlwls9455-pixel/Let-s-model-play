# Lane D — dining in 3D: booth, table dish, sitting and eating, the octopus at the table, the auras (branch `lane/d`)

Read `wip/round6/briefs/COMMON.md` first, then `wip/round6/eat-spec.md` §0, §1, **§4** (all of it), **§5**, §10.3 (the API
you provide), §10.4, §11 (D), §13 (D).

## Owner's words (docs/OWNER_DECISIONS.md, 11-18)

> 자리: **놀이방 식탁** — 조리대 옆에 식탁 하나 + 마주 보는 2인 소파. 다 만든 요리가 식탁에 놓이고 내 캐릭터가 앉아 먹는다.
> 문어를 부르면 맞은편에 앉는다. … 안 먹으면 옆에 앉아만 있고, 먹으면 문어에게도 효과. … 효과 시간: 그날 하루.

Reference picture = a cooking game's dining screen: **principle only** (sit at a table and eat). Our attic's pixel look, our
palette, our furniture style — no tablecloth pattern, no copied layout.

**Read this before anything else**: the booth has **no fixed numbers**. The first draft's one-seat sofas at x −1.38..0.48
could not hold the octopus (its head is 0.84 m wide; seated there it filled the backrest and reached into the tabletop —
spec §4.1). You size and place the booth from the real character envelopes under the seven rules of spec §4.1, and your
**first commit** is that layout (numbers in `wip/round6/notes/D.md` + day and night shots at 360x740@2 and 412x915@2.625,
default view and 180°), pushed to `lane/d` right away (COMMON's one-push rule has this exception), so the lead can look
before anything depends on it. Keep going after the push; do not wait for an answer.

## Files you own

- `js/scene3d.js` — everything this lane needs **except** `walkPortrait` / the `pw` plumbing in `renderPortrait` (lane R).
- `tools/test-scene-perf.js` (T5, T7 additions, new T8)
- `docs/SCENE.md` (play-room booth, the table dish, the octopus at the table, auras, the API)

Not yours: `js/app.js` (M drives the flow), `js/meal.js`, `index.html`, `css/*`, `js/scene2d.js` (dining is 3D-only), the
kitchen files, `js/runner.js`.

## Tasks

1. **Booth: size and place it first** (spec §4.1) in `buildPlayRoom`: one table and **two two-seater sofas** facing each
   other (owner '2인 소파'), next to the counter, the octopus's seat facing the default camera side and mine opposite. Size
   every part from the envelopes in spec §4.1 (octopus head 0.84 m wide, centred 0.386 m above its origin; its legs; my head,
   hair, torso, legs) so that all seven rules hold: nothing overlaps seated, leaning or reaching; the octopus's head clears
   the tabletop by ≥ 0.03 m, leaned too; both faces read; every T7 corridor and the rest spot stay free (prefer a place that
   keeps T7's numbers; only if none does, block one corridor and move that push's start so it still proves the same obstacle
   — never a weaker check — and flag it at the top of your report); both walks and hops are clear; the booth is within
   ≈ 0.3 m of the counter. The spec lists where it may fit (A: the back-wall slot as first drawn, tight; B: the same
   x range pulled off the back wall, ≈ 2.2 m; C: facing along z — check the end gaps) — measure, choose, and record why.
   Merge it into the static room mesh (`pp`, before `cutSplit`), inside a `keep` box you compute. Attic furniture vocabulary:
   chunky boxes, a 1-px lighter cushion top, `PAL` ramps only (cushions from a ramp that is not the attic sofa's orange; wood
   `W[…]`; a small `PAL.paper` mat at the dish spot). Pick the cushion ramp once from day and night screenshots.
   `PROOM.boothBox` (Box3) for obstacles and the hotspot. **Commit this layout first** (numbers in `wip/round6/notes/D.md`,
   shots in `wip/round6/shots/D/`) and expose it as `tableInfo().geom` (spec §10.3).
2. **Obstacles and spots**: `plBoxes()` play branch adds the booth box; all T7 lanes keep their numbers (verify; the one
   exception is task 1's flagged fallback).
   `SPOT_KEYS` + `spotInfo` + the play `pick` list gain `'table'` (the booth box) for `#btn-table` (via `hotspots`).
3. **Table dish** (spec §4.2): `setTableDish(dish, { appear })` builds one merged `lambert` mesh per state (plate colour by
   `look.plate`; 해초전 four quarter slabs with a '+' gap and a fleck, colour by band; 주먹밥 a crusted cake that shrinks per bite;
   과일 꼬치 a skewer with grape · watermelon ×3 · tangerine, the bare stick stays; unknown recipe = covered plate). Remember the
   dish if the play room is not built; queue a new dish while a meal is staging. Appear beat 6 frames; steam points while the
   dish waits (none under reduced motion); the empty plate stays until I stand up or leave the room.
4. **Me at the table**: `playerSitTable()` (walk to my aisle point, the existing 0.34 s hop to my seat, the seated origin =
   seat top − 0.24 (hips), `PL.sitYaw` facing the table) and `playerStandTable()`; make `plStand()` / `playerSitting` / the stick-stands-up
   path place-aware (attic sofa unchanged). Eating pose for `mealBite('me')`: right arm up to the face 2 frames, the piece gone
   on the bite frame with 2–3 crumb pixels, 1-px body bob ×2, settle (8 frames at 12 fps; reduced: no motion, 0.25 s).
5. **The octopus at the table** (spec §4.3, §4.5): `octCanCome()` = exactly the synchronous check `octToTable` makes at its
   start — false when away / asleep / in a ceremony / salon staging / not in the play view / leaving (the post-walk awake
   window is fine — the octopus is awake on the blanket; unlike `octMountLoft`, do not refuse on `octResting()`); true while
   it already sits at the table. `octToTable({ instant })`: already seated → resolves true at once (a second dish, no
   walk-in); refused → false; otherwise re-parent `octG` to the play group at the door anchor, open the play door (4 frames),
   `walkPoint` to its aisle point (check the path clears every box with the octopus's real width), close the door, hop onto
   its seat (0.3 s) facing the table. `octTableBeat('think' | 'ponder' | 'eat' | 'watch')` and `mealBite('oct')` (one front
   arm reaches toward the dish **above the tabletop** (rotation + ×1.2 reach, like the wave) 2 frames, the piece goes, body
   squash 2 frames — never a face change, face stays `idle`). A seated pose with the legs folded or hanging over the seat
   edge (never through the back, arms or table), and the contact decal hidden or fitted while seated. `octLeaveTable({ instant })`
   (hop down, walk to the door, door, dither fade at the doorway, back to the attic group at its anchor via `jumpTo`). While
   at the table: lift `updateOverlay`'s room hide (M lifts the app's bubble guard and the CSS hide — spec §4.5) and
   `octScreenPos()` returns its head (like `octUp()`); the octopus is not a tap target. Departure ceremony start, leaving the
   play room (`showPlace`), scene loss → unmount at once (next to the existing `octUnmountLoft` calls). `octAtTable()`
   exported. **Hold rule**: while `octAtTable()`, `jumpTo` / `moveTo` / `walkPoint` toward an attic anchor do not move `octG`;
   keep the latest such request and apply it right after the unmount (a safety net for any app path M misses).
   **Poses stay out of portraits**: every table pose (seat, lean, bite, legs) goes on `bodyG` (scale, position.y, rotation)
   and the arms' rotation.y / rotation.z / scale.x — what `renderPortrait` saves and restores — or you add the new property to
   that save list (yours; R owns only `walkPortrait` and the `pw` plumbing). Then portraits and R's runner bake never capture
   a table pose, even with the octopus seated under the kitchen or runner overlay.
6. **Event** `on.tableSpot({ seat, call, dish })` emitted on change (spec §10.3), with the same on-screen bounds rule as
   `stepSofaSpot` (hide points too near the edges or under the top bar). `call` = above the octopus's seat at a seated
   octopus's head height whenever I sit at the table, whether or not the octopus is there (M decides whether the chip shows).
7. **Auras** (spec §5): `setAura(who, fx, { bloom })` for `sparkle` · `star` · `petal`, exactly as the table in §5 describes:
   one `THREE.Points` per character (≤ 20 vertices) + a twin (≤ 4 vertices, layer 1) for sparkle/star, children of the
   character's current room group (re-parent when it changes: rooms, exterior walks, loft), base = the pixel-snapped character
   position, offsets in whole pixel rows / columns (`snapC`, `pxUp`, `S.pw`), 12 fps steps, hidden when the character is
   hidden or fading or in furniture mode; bloom 6 frames; reduced motion still pose. Materials = the exterior petal
   `PointsMaterial` variant and the firefly twin variant. **They are new programs in rooms today**: in this three r128 build
   a program cache key includes the light counts (`numPointLights`, `numDirLights`, … `shadowMapEnabled`), the only
   `vertexColors` Points program is `XP.petal`'s (exterior lights), the attic has only non-`vertexColors` points, and
   `prewarm()` compiles only the attic and exterior setups. So prewarm **both** variants under every light set an aura can
   show in — the attic's (check the play room's and the loft's two point lights really give the same key), the yard's and
   the exterior's — e.g. hidden aura objects in each group during `prewarm()`'s compile passes. Where each aura can be: me in
   the attic, the play room, the loft and the yard (I never go outside); the octopus in the attic, at the play-room table, in
   the loft and in the exterior during the departure and return ceremonies (it never follows into the yard).
   `tableInfo().aura` reports both.
8. **Budgets**: play room without a meal ≤ 60 calls and unchanged programs (T5); during a meal ≤ base + octopus calls + 12 and
   ≤ 150; no new shader program at any point (compare cache keys, not only counts); the booth survives every 360° cut.
9. **Tests** (spec §11 D): T5 still green; T7 lanes and numbers unchanged (task 1's flagged fallback aside) + pushes into the booth from each aisle stop at the
   booth's expanded edge (± one step); new **T8**: the §4.1 rules on the real meshes — at the seated pose, the eat lean and
   the bite reach, the octopus's head ellipsoid and each leg's world box, and my head / hair sphere and body boxes, intersect
   no booth or room box (0.01 m); the head clears the tabletop edge by ≥ 0.03 m; the decal stays on the seat; sit / stand;
   `setTableDish` per recipe (+2 calls); `octCanCome()` false ⇔ `octToTable()` resolves false; octopus mount → path with no
   box penetration → seated at `tableInfo().geom.seats.oct` facing the table → beats → bites 4 → 0 alternating → leave →
   back at its attic anchor; a second dish while seated → `octToTable()` resolves at once; an attic-anchor `jumpTo` during
   the meal is held and lands after the unmount (never inside the play group); ceremony start while seated unmounts; a
   `walkPortrait` / `portrait` render taken while the octopus sits leaning equals one taken at its attic anchor; each aura on
   me in the attic, play room, loft and yard and on the octopus in the attic, at the table, in the loft and in the exterior
   during the departure and return ceremonies (dots inside the character's screen box + margin, on pixel centres, step at
   12 fps, still under reduced motion); program cache keys unchanged at the first aura in each place; the draw-call budget;
   `tableInfo()` states.
10. **Docs**: `docs/SCENE.md` sections for the booth, the dish, the octopus at the table, the auras and the §10.3 API.

## Acceptance

- `node tools/test-scene-perf.js` (T1–T8) and `npm test` pass; `SMOKE_ONLY=J,Z,CAM node tools/smoke.js` still pass (play room,
  counter, turning).
- At 360x740 @2, 412x915 @2.625 and 320x568 @2, day and night: the booth reads as a small dining corner next to the counter,
  the dish is readable at 1× and clear at 2×, my character sits and eats, the octopus walks in, sits opposite with nothing
  poking through the sofa, the table or the arcade, eats or just sits, and walks out; every aura follows its character
  crisply in every room; no z-fighting, no floating, no pixel crawl.
- Report the chosen layout (boxes, seat and aisle points, which of the spec's candidate places and why, the clearances you
  measured for each §4.1 rule), the measured draw calls (play room base, with octopus, during a meal) and the program
  counts and keys.
- Shots (≤ 8): **first** the layout — booth default view and turned 180°, day and night, at 360x740@2 and 412x915@2.625 (two
  composite strips are fine); then each dish at 2× zoom; me seated; the octopus seated; a bite frame; auras (me in the attic
  and the yard, the octopus in the attic).

## ~~Added 11-18 after the plan-vs-build check — the loft stair tap~~ (WITHDRAWN 11-18 evening by the owner)

> Withdrawn: the owner's other branch `claude/serene-cannon-awp5y2` moved the stair to the left wall's front corner, which removed
> the overlap (its `tools/test-light.js` L7: stair taps → yard 0). A fix on the old stair position would collide with it on the same
> lines (`pick`, `spotInfo`, smoke `scenarioLoft`), so lane D takes it out again (one new commit, base lines restored).


Audit J3 (must, `wip/round6/audit-11-18.md`): in the attic, a tap on the stair to the loft mostly walks my character to the
yard doorway instead, so the loft (sewing machine, salon, set book) is hard to find. The yard door's hit test runs first and
the stair's screen box is large (`js/scene3d.js`: the tap handler at `if (SPOTS.atticYard && spotInfo('atticYard'))` and
`spotAt(cx, cy, ['atticYard', 'atticStair'])`, and the `atticStair` / `atticYard` spot boxes in the spot layout). Make a tap
that lands on the stair's own geometry (treads, side boards, railing) or on its button go to the stair; the yard door wins
only where the doorway's dark opening is what the player sees at that point (narrow its box to the opening). The octopus in
front still wins first, as now. Measure at 360x740@2 and 412x915@2.625, default view and turned 90° and 180°, day and night:
a grid of taps over the stair goes to the stair ≥ 95 %, over the doorway to the yard ≥ 95 %. Put the grid check in the smoke's
`scenarioLoft` (yours for this; nobody else edits it). A small step marker on the first tread is optional — only if your
shots show the stair still does not read as something to tap. The mirror's refusal words are lane R's (F3), not yours.
Report the before / after hit rates.

## Do not touch

`walkPortrait` (R), `js/app.js`, the attic furniture mode, `FURN`, the kitchen, `js/scene2d.js`, the T7 numbers (task 1's
flagged fallback aside). Do not
re-use the first draft's booth coordinates (spec §4.1 says why they fail).
