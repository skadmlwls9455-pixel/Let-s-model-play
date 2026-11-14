# Why moving furniture feels awkward — a hands-on look and proposals (read-only)

Read `/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final/COMMON4.md` first (the project,
the hard lines, how to run things). Your label (scratch folder) and your lens are in your task message.

**You change nothing in any tree.** Make your own copy to play in:
`mkdir /dev/shm/<label> && git -C /home/user/Let-s-model-play archive 12ba4e9 | tar -x -C /dev/shm/<label>`, then
`ln -s /home/user/Let-s-model-play/node_modules /dev/shm/<label>/node_modules` (remove the copied `audio/` and link
`/home/user/Let-s-model-play/audio` instead if you need sound files; you should not). Delete the copy when done.
`12ba4e9` = production `a850175` + notes: what you play is what the owner plays.

## The owner's words (11-14, on a phone)

"가구 옮기기 불편하고" — moving furniture is inconvenient. Nothing more specific. (In the same message: the candle on
the crate keeps its size when the crate is resized — another lane is fixing that one; note it if you see it, but it
is not your question.)

## What exists

- The placement mode (11-10, from the owner's reference screen: "사물은 고정된 상태에서 캐릭터 움직여서 놓아지게 ·
  사이즈 조절 · 회전" — the object stays fixed in front of the character and you move the character to place it;
  size; rotation). Enter by the sofa icon in the top bar (`#btn-furn`) or by a long press (0.48 s) on a piece. The
  strip of pieces (소파 · 상자 · 담요, as unlocked), the 회전 and 크기 sliders, 취소 · 놓기, 끝내기, the toast
  '가구를 고르고, 캐릭터를 움직여 자리를 잡아'. The held piece floats in front of the player character on a 0.25 m
  grid and refuses cells where it cannot stand (walls, doors' fronts, other pieces, the octopus, the character).
- Code: `js/app.js` `furnOpen` / `furnUI` / `bindFurn` (near 3767), the player stick (`stick*`), `js/scene3d.js` the
  furniture section (near 1177-1300: `FURN`, `furnOk`, `furnCarry`, `stepCarry`, `furnHoldStart`), `index.html`
  `#furn-ui`, `css/style.css` `.furn-*`. Docs: `docs/INTERIOR_MODE.md` (the older, larger design), `docs/BACKLOG.md`
  (꾸미기 rows, D8), `docs/OWNER_DECISIONS.md` (11-10 rows).

## Report

Structured output. Every friction point: what the player tries, what happens, why (file:line), how often it
bites (always / sometimes / edge), a screenshot path, and a severity for the owner's experience (big / medium /
small). Then proposals, ranked by how much they help for how much change, each marked **within the owner's model**
(the character carries the piece) or **a change of model** (for example dragging the piece with a finger), with what
it would look like on a 360 px screen and which hard lines or saved data it touches. Name no commercial game in
anything you write (hard line 9): describe patterns generically.
