# lane C runner — notes (11-15)

Plan
- sim runner-2: only OCT_X 30→10, V0 320→256, VMAX 704→448, RAMP 12→20 (slower, octopus at left). Same art units,
  same obstacles/physics. View width varies per screen (cap C.W=192 < SPAWN_X 200) so zoom is a view-only constant.
- view: canvas fills the dialog; zoom ZOOM css px per art px (3.5) → integer device px k; ground just above the pads.
  Room picture above the play band (rafters, big window, shelf, lamp), tie beam over the play band (web hangs there).
- DOM: drop title/HUD-line/note; overlay HUD top-left (score + 최고), close top-right, round pads bottom corners
  with pixel SVG glyph; centered msg; end card '다시'/'닫기' (ids rn-again / rn-stop kept).
- canvas taps do nothing (handlers removed).
- store: best2 for runner-2; best (runner-1) kept, shown as '예전 게임 최고 N' on the end card.
- server: board per version — runner-2 paths under runner2/ and runner2-ids/; runner-1 stays runner/ · runner-ids/.
  award looks in current board, then runner-1 board (old subs keep their cape).
- client: seed reply with v ≠ VERSION → play locally, no ranking; submit old_version → hide the ranking box.
Progress
- [x] sim/view/css/server/tests done, smoke R+R2 28/28, S,J,U 159/159, npm test green, fonts regenerated
- [x] 3 commits (32d738e, da2ea8c, 8ee0829); shots 9 in wip/round4/shots/c-runner (probe: scratch shots.js freezes rAF time)
- [ ] independent check → fixes → report → push
