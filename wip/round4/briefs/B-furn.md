# Lane B "furn": a furniture mode where only the furniture moves (branch `lane/b-furn`)

Read `wip/round4/briefs/COMMON.md` first.

## What the owner wants

HANDOFF item 7: "가구 모드 새로: 단추 → 가구 모드. 문어·캐릭터를 숨기고 가구만 손가락으로 바로 옮기기·돌리기·크기 조절 (옛
'들고 다니기' 방식 대체). '끝내기' → '저장하기'. 같이 고칠 흠: 손 떼면 가구가 0.3~1.7 m 튐, 양초가 상자 크기·방향을 안
따라감, 줄인 가구를 문어가 뚫고 섬."
Owner 11-14 12:50 UTC: "아예 가구 모드로 들어가서 문어나 캐릭터 없애고 가구만 딱딱 바꿀 수 있게". The shape that was
described to the owner then: 문어 · 캐릭터 안 보임 · 가구 톡 = 고르기 · 손가락으로 끌면 칸에 딱딱 · 못 놓는 데는 빨갛게,
떼면 제자리로 · 고른 가구 밑에 '돌리기' '작게' '크게' · 위에 '취소' (들어오기 전대로) · '저장하기' · 담요에서 자던 문어는
담요 따라 · 모드 중 문어가 나가거나 돌아오면 저장하고 닫힘.
Owner 11-15: **돌리기 = 90° per tap**; **size = '작게' / '크게' buttons, 0.1 per tap, range 0.7-1.5**; **only the
attic's three pieces** (sofa · the crate with its candle · the blanket).
HANDOFF item 4 (also yours, the button this mode lives on): "가구 단추 그림: 소파(차처럼 보임) → 🔨 이모지를 그대로
픽셀로. 색 있는 망치(주황 자루 대각선, 회색 머리 왼쪽 위). 다른 위쪽 단추처럼 12×12 viewBox, 24px, crispEdges.
Twemoji 1f528(CC-BY 4.0)을 본뜨면 credits.html 에 표기. 시안 여러 개 금지, 한 번에."

## What exists (at the base commit)

- The top-bar button `#btn-furn` (`index.html` ~98, a 12×12 sofa path) toggles `furnOpen()` in `js/app.js` (~3776);
  `furnUI()` (~3781) shows `#furn-ui` (`index.html` ~121-130: '끝내기', title '가구 배치', rotation and size sliders,
  '취소' / '놓기', the strip `#furn-items` of pieces). Long-press 0.48 s on a piece (`furnHoldStart`) also starts
  carrying. Leaving the attic ends the mode (`goRoom` ~3853).
- `js/scene3d.js` ~1177-1300: `FURN` (sofa, crate, blanket with `w`, `d`, `rot`, `sc`, getter `hw`), `furnFloor`,
  `furnAt`, `furnLim`, `furnOk`, `furnApply` (the crate's candle is a separate prop placed at a fixed height and
  offset: wrong for scale and rotation), `furnCarry` / `furnEnd` / `furnConfirm` / `furnCancel` / `furnSetRot` /
  `furnSetScale`, `stepCarry` (the piece follows the player character: the cause of the 0.3-1.7 m jump on release),
  `setLayout` / `layoutNow` (saved layout `S.room.layout = { id: [x, z, rot, scale] }`), `ANCHORS` (octopus spots:
  crate side, blanket bed, window, center, door …), the octopus walking code (`moveTo`, `walkPoint`, wander), the
  player's sofa sit (`stepSofaSpot`, `playerSit`), decals (`rebuildDecals`).
- A read-only study of the old mode's problems (worth a skim): `wip/round3/furn-ux-probe.md`, and the older briefs
  `wip/round3/briefs/fix-furn.md` (candle, octopus spots) and `fix-furnux.md` (old carry model — superseded).
- Tests: scenario `Z` in `tools/smoke.js` (`grep -n furn tools/smoke.js`).

## What to make true

1. **Entering**: the hammer button (and nothing else: remove the long-press carry) opens the mode in the attic. The
   octopus and the player character are hidden while the mode is open (the octopus's state is untouched; if it
   sleeps on the blanket it is simply not drawn), the stick and other room buttons are hidden, the view goes to the
   default angle (lane A adds a free turn: set `yawDrag = 0` and call `placeCamera()`; lane A will also expose
   `APP.scene.setYaw`, use it if it exists) and a framing that shows the whole attic floor at 360x740 and 320x568.
   The mode is only available in the attic; switching rooms is not possible while it is open.
2. **Pick and move with a finger**: tap a piece = select it (a clear selection outline in palette colours). Drag a
   piece (selected or not) with one finger = it moves under the finger on the floor, snapping to a 0.25 m grid
   ("칸에 딱딱"), and clamping flush to the walls (a piece can stand flush against any wall). While dragging over a
   place where it cannot stand (overlapping another piece, a wall, a keep zone such as the stairs, the doors' paths,
   the salon spots, the octopus's body + small gap), the piece shows red (a muted-red dithered tint or outline,
   palette colours, no text, no sound) and **letting go there puts it back where it was before this drag**. Letting
   go on a good place leaves it exactly where it is shown (no jump). One finger on empty floor pans as before; two
   fingers turn / zoom as lane A makes them (do not change the pinch / twist code; just make sure a drag on a piece
   does not pan). Keyboard: arrow keys move the selected piece one cell; R turns; + / - resize; Esc = 취소.
3. **Below the selected piece**: a small floating row of three buttons '돌리기' (90° per tap) · '작게' · '크게' (0.1
   per tap, 0.7-1.5; the button that hits the limit is disabled). Any change that would make the piece overlap is
   not applied (the button gives a short shake or stays put; no text). The row follows the piece on screen and stays
   inside the scene at 360x740 and 320x568 (flip above the piece if there is no room below).
4. **Top of the mode**: '취소' (everything goes back to how it was when the mode opened) and '저장하기' (save the
   layout and close). Remove the old sliders, '놓기' and '끝내기'. Keep the strip of pieces only if it helps find a
   piece (a tap there selects it); otherwise remove it — decide. Title: short, plain, e.g. '가구 옮기기'. A first-time
   hint (one line, shown once, not covering buttons): e.g. '가구를 끌어서 옮겨'. Make all labels short warm 반말;
   aria-labels meaningful.
5. **The octopus and the walk**: if the octopus departs for a walk or comes back while the mode is open, save and
   close the mode first (no lost changes, no overlap). If the octopus was asleep on the blanket and the blanket
   moved, after closing it is on the blanket's new place (its bed spot follows the blanket; same for the crate-side
   spot). The octopus never stands in or walks through a piece afterwards at any size and rotation (its spots and
   paths avoid the pieces' footprints; if a saved production layout already covers a spot, move the spot to the
   nearest free place at load — never move the player's furniture: hard line 10).
6. **The candle follows the crate** (position, rotation, scale; flame, glow, its light and the bloom twin `emTwin`
   included): make it a child of the crate or copy the crate's matrix. Check at 0.7, 1.0, 1.5 and every 90°.
7. **Saved data**: `S.room.layout` keeps its shape `{ id: [x, z, rot, scale] }`; production layouts (any rotation
   such as 15° or 45° steps from the old slider, any scale step of 0.05) load unchanged and keep their values until
   the player moves that piece (do not re-snap on load). '저장하기' writes the same shape.
8. **The hammer icon**: replace the sofa path in `#btn-furn` with a colored pixel hammer in a 12×12 viewBox at 24px,
   `shape-rendering="crispEdges"`: orange handle on the diagonal, grey head at the top left, a dark outline that
   reads on both themes, like the other top-bar icons (look at how they use `fill="currentColor"`; this one is in
   colour on purpose). If you follow Twemoji 1f528's shape, add a line to `credits.html` (Twemoji, CC-BY 4.0, link).
   One version, no alternatives. `aria-label` / `title`: '가구 옮기기'. Check it at 1× and 3× (DPR) next to the
   other icons.

## Not yours

The two-finger turn itself and wall cutting (lane A), the yard (lane D), the text everywhere else (a later lane).

## Tests (deterministic)

Replace the old carry checks in scenario `Z` with checks for the new mode: opening hides the octopus and the
character and resets the view angle; a drag moves the piece to the cell under the finger and the release keeps it
(within a pixel); a drag onto another piece shows red and the release puts it back; '돌리기' turns 90°, '작게' /
'크게' change by 0.1 and stop at the limits; a change that would overlap is refused; '취소' restores the opening
layout; '저장하기' saves `S.room.layout` in the same shape and a production-shaped layout with 15° / 0.85 values loads
unchanged; the candle stays on the crate's lid at 0.7 / 1.0 / 1.5 × 0/90/180/270°; the octopus's crate and bed spots
are outside the footprints after any placement; a walk starting while the mode is open saves and closes it. Run
`npm test`, the font check (text changes), `SMOKE_ONLY=Z` and the letters that assert the old furniture strings
(grep '끝내기', '놓기', '가구 배치'), and `node tools/test-scene-perf.js` once.

## Screenshots to commit (360x740 and one 320x568)

The mode open (nothing selected), a piece selected with its button row, a red refused drag, after '저장하기' with the
octopus back, the crate with its candle at 0.7 and 1.5 turned 90°, the hammer icon in the top bar (crop at 3×).
