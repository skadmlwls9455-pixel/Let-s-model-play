# Furniture that carries other things: the candle on the crate keeps its size (lane "furn")

Read `/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final/COMMON4.md` first (the project,
the hard lines, how to run things, the SHEET_SETTLE test gotcha). Your label (scratch folder) is in your task message.
You edit only **`/home/user/ppolppol-fix-furn`** (branch `fix-furn`, base **`12ba4e9`** = production `a850175` + notes;
`node_modules` is an untracked symlink, never stage it). Do not commit.

## What the owner saw (11-14, on a phone)

"초+상자는 초가 사이즈 고정된 채로 상자만 사이즈 줄어드는 거 같은데" — in the furniture placement mode
(가구 배치: the sofa icon in the top bar, or a long press on a piece; `js/app.js` `furnOpen` / `furnUI` near 3767,
`js/scene3d.js` near 1177-1300), changing the crate's size (the 크기 slider, 0.7-1.5) shrinks or grows only the crate;
the candle standing on it keeps its size. The owner expects the candle to go with the box.

## What the code does (at `12ba4e9`)

- The candle is its own prop (`candleG`, `addProp('candle', candleG)`, its own unlock level), not a child of the crate.
  `furnApply('crate')` puts it at `(x + 0.05, 0.72 + crate.y, z - 0.05)`: a fixed size, a fixed height (0.72 = the
  crate's top at scale 1) and an offset that ignores the crate's rotation. So on a 0.7 crate the candle floats about
  0.2 m above the lid, on a 1.5 crate it sinks into it, and turned crates put it off-centre. The candle's point light
  sits at a fixed 1.15. While the crate is carried (lifted, bobbing, tilting toward the pull) and during the drop
  bounce (`FU.bounce` squashes `m.scale`), the candle does not follow those either. Reproduce each of these first,
  on a phone viewport, with screenshots, and say which ones are real.
- Other things that hang off a piece and may have the same fault (check each; fix the real ones the same way):
  the crate's shadow decal (`decalR` 0.8 in `addProp`), the octopus's "beside the crate" spot `ANCHORS.crate`
  (`x - 0.75, z - 0.25`: a 1.5 crate is 0.78 half-wide, so the octopus may stand inside it; a turned crate changes
  which side is free), the blanket's bed spot `ANCHORS.blanket` (`x, z - 0.1`) and the octopus lying on a 0.7 or
  turned blanket, the sofa's sit spot and the player sitting on a scaled or turned sofa (`stepSofaSpot`, `plSit`),
  and the placement mark `furnMark`. Saved layouts (`S.room.layout`: `[x, z, rot, scale]`, restored by
  `setLayout`) from production must load with everything in place.

## Added at 11:10 (the owner, on a phone, with a screenshot): the octopus goes through furniture

"사이즈 줄였을 때 문어가 뚫리는 버그 있어. 이거 고쳐줘." — after making a piece smaller, the octopus goes through it.
Screenshot (production `a850175`, 20:03 Korea time, attic at night):
`/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final/owner-shots/1114-2003-attic-night-crate.jpg`
— look at it: the owner moved the crate from its corner to the left, near the window, and shrank it; the octopus
stands inside or behind it (the crate's front covers its lower body) and the candle floats at the octopus's head.
Likely cause (verify): `furnOk` refuses a cell only where the octopus stands *at that moment*, so a piece can be put
on one of the octopus's other spots (the window spot, the centre, the door spot, the wander points; see `ANCHORS`
and the wander code), and the octopus later walks into it; a smaller piece fits in more such places. Also check
the octopus's walking paths against pieces (there is path code that knows about furniture near ~2346 and ~2399) and
every size and rotation. **Make it true that the octopus never stands inside or walks through a piece** after any
placement, size or rotation, and that a saved production layout that already covers one of its spots (the owner's
save may be exactly that) is handled at load without moving or losing the player's furniture (hard line 10): move
the octopus's spot to the nearest free place, or refuse placements over its spots with clear feedback while the
piece is held (the placement mark could show a refused cell) — decide which (or both, with the move as the safety
net for old saves) and say why. Reproduce the owner's case first (a crate shrunk to 0.7 next to the window).

## What to make true

- At every allowed size and rotation, at rest, while carried and during the drop bounce, the candle stands on the
  crate's lid, centred where it stands at scale 1, and scaled with the crate (flame, glow and light included:
  the light follows the flame). The simplest robust way is to make the candle follow the crate's whole transform
  (for example as a child of the crate mesh, or by copying the crate's matrix); keep its own unlock level and
  visibility, its flame flicker, its bloom twin (`emTwin`) and its shadow, and check the twin really follows a
  parent's scale.
- The octopus's spots that belong to a piece stay outside that piece's footprint, inside the room and reachable,
  for every allowed size and rotation; the octopus never stands in or on a piece it should stand beside.
- Nothing else about placing furniture changes: the interaction (carry in front of the character, the 0.25 m grid,
  the sliders, 놓기 / 취소 / 끝내기) is being studied separately right now because the owner also said moving furniture
  is inconvenient. Do not redesign it in this lane; if you see a plain bug in it while you work, note it in "left".

## Lanes

Other agents work at the same time: lane imp2 (`/home/user/ppolppol-fix-imp2`: import and reset), a read-only
furniture-UX probe (copies in `/dev/shm`), and possibly lane honest3 (`/home/user/ppolppol-fix-honest3`: faces,
lines, the petting sound). Stay inside the furniture code in `js/scene3d.js` (and `js/app.js` `furn*` only if you must)
plus its tests and docs. The load rule in COMMON4.md applies.

## Rules

- Smallest change. Match the file's style (comments short, Korean, dated `11-14`, saying why).
- Hard line 10: a production save keeps everything it had (layouts with scale and rotation included).
- No new player-facing text unless needed; if you add Korean text, run the font check.

## Tests that fail without the fix

Add smoke checks next to the existing furniture checks (scenario `Z` part with `furn-on`, near
`tools/smoke.js:5738`; `grep -n furn tools/smoke.js`): drive the scene's test API (`APP.scene.furnCarry`,
`furnSetScale`, `furnSetRot`, `furnConfirm`, `layout`, `setLayout` — add a small read-only getter if you need world
positions) and assert, at scale 0.7, 1 and 1.5 and rotation 0, 90 and 45, at rest and while carried, that the
candle's base is on the crate's lid (within a small tolerance), its size matches the crate's scale, the light is at
the flame, and the octopus's crate and blanket spots are outside the pieces' footprints. Also one check that a
production-shaped saved layout loads with the candle on the crate. Deterministic: no waiting for durations, only
for states. Revert the fix alone in a scratch copy and name the check that fails (mutation table).

## Suites

`npm test`; the font check; `SMOKE_ONLY=Z` until it passes twice in a row (or explain a load-only failure with a
control run on the base); `node tools/test-scene-perf.js` once (it covers furniture taps). Keep scratch copies in
`/dev/shm` and delete them. Put back every tracked evidence file you did not mean to change.

## Report

Each fault: reproduced on the base (how, screenshot), the change (file:line, before → after), the check and the
mutation table. Screenshots (full paths) of the crate with its candle at 0.7, 1 and 1.5 and turned 90°, before and
after, at 360x740. Faults left and why; suite totals; what you did not verify.
