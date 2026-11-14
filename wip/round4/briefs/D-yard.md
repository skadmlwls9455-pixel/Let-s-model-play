# Lane D "yard": a yard garden outside the attic door, six plots that open slowly (branch `lane/d-yard`)

Read `wip/round4/briefs/COMMON.md` first.

## What the owner wants

HANDOFF item 13: "마당 텃밭: 방에서 나가는 문(언제든), 외출 맵 일부를 재활용·넓혀 텃밭으로. 씨앗 심기는 2층에서 빼서
마당으로. 6칸, 함께한 날에 따라 열림 (처음 3칸, 7일·15일·30일에 1칸씩)."
Owner 11-14: "씨앗 심기가 윗층에 같이 있는 게 불편한데 나가는 방문 만들고 농사 게임처럼 문어 외출할 때 쓰던 맵 중 일부
재활용하거나 더 넓게 해서 텃밭 느낌으로" · "여섯칸으로 해주고 같이 지낸 날짜에 따라서 텃밭 해금될 수 있도록 느린
컨텐츠 가자". The unlock is quiet: no remaining-days counter, no locked-plot display, no teaser; on the day a plot
opens, one short line (the same way as the 11-07 "함께한 날" badge line).
Owner 11-15 answers: **a separate yard place** (built from the walk map's house-front picture, widened; it does not
mix with the octopus's walk screens) · **the door is the octopus's walk door, shared** (the attic door the octopus
leaves by) · **the garden buttons leave the bag sheet** (garden only in the yard; the bag sheet keeps the dye counts)
· **the octopus does not follow** the player into the yard.

## What exists (at the base commit)

- Garden rules in `js/app.js` (~4330-4500): `S.user.garden` (three entries `{ color, water, watered… }` or null),
  `plotView`, `plotLabel`, `gardenAct(i)` (plant with a seed → water twice, once per plot per day → flowers → harvest
  gives one dye of that colour; never withers), `applyGarden` → `scene.setGarden(list)`; weekly quests 'plant',
  'water', 'harvest'; `renderBag` (~4583) shows the three plots as buttons (`.bag-plot`) and the note '밭은 집
  앞마당에 있어…'. Seeds come from the runner, the daily gift and the weekly gift. Dyes are used by the loft's sewing
  machine (`sewDye`).
- Scene: the walk exterior `extG` (`js/scene3d.js` ~3000-3340): ground slab `EXT.L` 3.2, the house box
  (`EXT.HX0..HX1`, `HZ0..HZ1`), path, trees, puddle, seasons (`applySeason`), weather (`extApplyWeather`), the front
  door `DOOR_EXT`; the three plots `PLOT` / `plotG` / `setGarden` (~4071-4110) in front of the house, tappable only
  while the octopus is out (`pick` ~4149, `spotInfo` 'plot0..2', `#btn-plot0..2` in `index.html` ~137).
- Rooms and doors: `PLACE`, `PLACE_BOX` (~492), `goRoom` (~3445), `runDoor`, door queue (`DQ`), slide transitions
  (`slideItem`), the attic ↔ play room door (`ATTIC_DOOR`, `makeDoor`), the attic ↔ loft stairs; the player
  character (`PL`, `plEnter`, `plWalkTo`, `stepPlayer`, `plLim`, `plBoxes`), the stick. The octopus's walk door:
  `ANCHORS.door` and the depart / return ceremonies (`departCeremony` ~3848, `returnCeremony` ~3871).
- `js/app.js` rooms: `goRoom`, `ROOM_SPOT` (~3771), the hotspot ids, `roomNow()`, room titles, scene descriptions
  for screen readers (~1150).
- "함께한 날": `S.octopus.days` (dates the player asked the octopus for a walk, played, or talked) — use its length.

## What to make true

1. **A yard place** `'yard'`: a new group `yardG` built by `buildYard()` from the exterior's pieces (ground, grass,
   path, trees, the house's front wall with its door, fence) and wider, with **six plot beds** laid out like a small
   farm (two rows of three, or a gentle arc — decide by what reads best at 360x740). The player character walks
   there with the stick (limits, obstacles: the beds are walkable around, not through; the house is solid). It must
   look right from every angle because lane A adds a 360° two-finger turn: no void at the edges at any angle (a
   generous ground with a ring of trees / bushes / fence fading into the background), and register the house wall
   (and anything tall that can stand between the camera and the yard) as cuttable parts with
   `cutAdd('yard', full, low, nx, nz, cx, cz)` — lane A creates `CUTS` / `cutAdd` / `applyCuts`. Because lane A is
   not merged yet, add this small shim near your yard code so your branch works alone and merges cleanly:
   `if (typeof cutAdd !== 'function') { /* 11-15: 갈래 A 가 오면 그쪽 것을 쓴다 */ }` — i.e. keep your list in
   `YARD_CUTS = [{ full, low, nx, nz, cx, cz }]` and call `cutAdd` for each only if it exists; the lead wires it at
   merge. Add `PLACE_BOX.yard`.
   Light: the yard follows the hour and weather like the exterior (day / dusk / night, rain, snow, seasons); at night
   the plots and the path are readable (a small lantern by the door or soft moonlight — no new point-light count
   change; reuse the exterior's lighting rig).
2. **The door**: the attic's walk door (where the octopus leaves) gets a hotspot for the player: tap it (or walk into
   it with the stick) → the player goes out to the yard with the same door / slide transition style as the other
   rooms; in the yard, the house door leads back to the attic. "언제든": allowed whenever the player could change rooms
   now — but while the octopus's depart or return ceremony uses that door, the yard door waits (the button is hidden
   or the tap is ignored until the ceremony ends; no text needed). While the octopus is out on a walk, the player can
   still go to the yard from the attic (find how the attic is reached during a walk today: the away screen's home
   button / the play room; keep that path working, and make sure the yard never shows the octopus walk scene and
   vice versa). The octopus never follows into the yard and never appears there.
3. **Six plots, slow unlock**: plots 1-3 open from the start (the player's existing three plots keep their exact
   state: hard line 10 — migrate `S.user.garden` from 3 to 6 entries by appending nulls; never drop or reorder),
   plot 4 when `S.octopus.days.length >= 7`, plot 5 at 15, plot 6 at 30. A locked plot is **not drawn at all** (no
   fence, no lock, no counter); the day it opens, show one short line once (toast style like the "함께한 날" badge
   line; e.g. '마당에 밭 한 칸이 새로 생겼어') and remember it was told. Plot actions are the same as today (plant →
   water ×2 on different days → flowers → harvest → one dye), in the yard by tapping the bed (a hotspot per open plot,
   ≥ 44 px, accessible names like today's `plotLabel`), and the weekly quests 'plant' / 'water' / 'harvest' still count.
4. **Remove the garden from elsewhere**: the bag sheet keeps shells, seeds, days, the week list and the dye counts,
   but no plot buttons (replace its '텃밭' section with one short line where the garden is, e.g. '텃밭은 마당에 있어' —
   short). Remove the plot taps and hotspots from the walk exterior (`#btn-plot0..2` there, `pick`'s exterior plot
   branch); either stop drawing the plots outside or keep drawing the same state read-only — decide (simplest: stop
   drawing them outside) and say. Remove every other place that says planting happens elsewhere ('2층', '바깥 밭을 톡',
   tutorials, the bag note, toasts): grep '텃밭', '씨앗', '밭'.
5. **Text**: room title '마당', the scene description for screen readers, the door's `aria-label`s ('마당으로' /
   '집으로'), the unlock line, plot labels. Short, warm 반말, no emoji. Font check after.
6. **2D fallback** (`js/scene2d.js`): no yard scene there; the garden must still be usable in 2D — simplest: in 2D the
   bag sheet keeps the plot buttons (all open plots). Decide and say.

## Not yours

The 360° turn and the cut mechanism (lane A — you only register parts), furniture (lane B), lights of the rooms
(lane G). Keep your scene3d edits in new functions near the exterior code plus the few hooks in `PLACE`, `pick`,
`spotInfo`, `goRoom`.

## Tests (deterministic)

A smoke part (new letter or next to the garden checks; grep `plot`, `garden` in `tools/smoke.js`): the walk door
takes the player to the yard and back; in the yard three plots at 0-6 days, four at 7, five at 15, six at 30 (via the
seeded save's `S.octopus.days`); the unlock line shows once; plant / water / harvest work in the yard and give the
dye; the bag sheet has no plot buttons; the exterior has no plot hotspots; a production save with three planted plots
keeps them; the octopus is not in the yard; during the octopus's depart ceremony the door does not take the player
out. Update old garden checks (they tap plots outside or in the bag sheet) to the new place without weakening them.
Run `npm test`, the font check, and the smoke letters that cover the garden, the bag sheet and the doors.

## Screenshots to commit (360x740)

The attic with the door hotspot, the yard by day with 3 plots, the yard with 6 plots (30 days) and some flowers,
the yard at night in the rain, the bag sheet after, the unlock line.
