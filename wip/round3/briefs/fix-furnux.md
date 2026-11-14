# Moving furniture that lands where you put it (lane "furnux")

Read `/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final/COMMON4.md` first (the project,
the hard lines, how to run things, the SHEET_SETTLE test gotcha, the load rule). Your label (scratch folder) and your
tree are in your task message. Your base is the finished lane "furn" (on top of `12ba4e9`): it made the candle a
child of the crate (`candleFollow`), moved the octopus's crate and bed spots outside the pieces (`crateSpot`,
`bedSpot`), and made the octopus step aside from covered spots and walk around pieces (`octSpot`, `octRoute`,
`octSettle`, `octPath`). Read its commit first (`git show --stat HEAD`, `git show HEAD -- js/scene3d.js`) and keep
every guarantee it tests (scenario `Z`, its `furn-on` part). `node_modules` is an untracked symlink, never stage it.
Do not commit.

## What the owner said (11-14 evening, on a phone in portrait)

"가구 옮기기 불편하고" — moving furniture is inconvenient. And: "끝내기가 아니라 저장하기 이런 식으로 인테리어 쪽 ui창
글자도 바꿔주고" — not '끝내기' but something like '저장하기': change the wording of the furniture UI that way.

The model of the mode is the owner's (11-10, from their reference screen): "사물은 고정된 상태에서 캐릭터 움직여서
놓아지게 · 사이즈 조절 · 회전" — the piece stays fixed to the character, the player walks the character to place it,
with size and rotation. Walking is the stick (owner 11-08: the stick, not floor taps). Keep that model unless the
owner's answers below say otherwise.

## What a probe found (read-only, two lenses, at `12ba4e9`)

A hands-on play lens (real CDP touch at 360x740 and 390x844, 14 timed targets) and a design / code lens. Their merged
result: `/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final/furn-ux-merged.json`
(`merged.top_friction` T1-T14 with causes and evidence, `merged.plan_within` W1-W8, `merged.plan_change` C1-C3; the
two lenses' full reports under `play` and `design`). Evidence and reusable probe scripts:
`/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final/furn-ux-play/` (`lib.js`, `steer.js`,
`run.js`, `seed.js`, `p1-probe.js` … `p7-layout.js`, `notes.md`, `shots/`) and `…/final/furn-ux-design/`. Line numbers
in it are at `12ba4e9`; lane furn moved `js/scene3d.js` lines after ~1212 by about +120. Read the whole merged result
before you change anything.

In short: (T1) letting go of the stick turns the character to the camera, and the held piece swings 0.3-1.7 m to the
camera-side cell (19 of 26 releases); 놓기 then places it there, and the 놓기 tap needs the thumb off the stick.
(T2) so pieces can almost never be set against the window wall or the back wall. (T3) refused cells give no signal
and the character walks through the stuck piece. (T4) the octopus's no-place zone (half-size + 0.5 m) closes the
middle of the room. (T5) pushing into the play-room door or the stair while carrying leaves the attic and saves the
piece mid-walk. (T6) 놓기 does not re-check, so overlaps get saved. (T7) after 놓기 the character is wedged behind
the piece. (T8) the piece and the character hide each other; the camera ignores the piece and the panels. (T9)
끝내기 and switching pieces place silently. (T10) a second finger's tap on 놓기 while the thumb holds the stick does
nothing. (T11) tapping the sofa in the mode sits instead of picking. (T13) the comments say a 0.25 m grid; the
code snaps to 1/27 m. (T14) the first-time hint toast covers the stick.

## Owner answers (11-14)

OWNER-ANSWERS-HERE

## What to make true

1. **The piece stays where the player put it (T1, T2, T7, T10).** While a piece is held, lifting the thumb (or
   releasing the arrow keys) never moves the piece or turns the character: no turn to the camera while carrying.
   The player can push a piece flush against any wall they can walk toward (the window wall and the back wall
   included) and 놓기 places exactly what is shown. Right after picking (from the strip, by a tap in the room, or by
   a long press), the player sees the piece in hand next to the character at once — no piece frozen across the room
   or half off-screen; choose how (turn toward it, walk to it, or bring it) and say why. A second finger's tap on
   놓기 / 취소 while the thumb holds the stick works (keep keyboard and click working).
2. **Doors and stairs while carrying (T5).** With a piece in hand, the play-room door and the stair act like walls:
   no room change, the piece stays in hand. No new text for it.
3. **Refused cells show, and nothing is ever saved overlapping (T3, T6).** When the cell in front is refused, the
   player can see it at a glance at 360 px (for example the mark turns to a muted-red dithered outline, palette
   colours, no text, no sound) and can tell "not allowed here" from "not following". The held piece blocks the
   character when it is stuck (no walking through it). 놓기 never saves a piece overlapping the character, another
   piece, the octopus, a keep zone or a wall — also after a resize or a rotation (move it to the nearest allowed
   cell, or keep 놓기 unavailable until it fits, and show which). 저장하기 / leaving the mode with a piece in hand
   follows the same rule.
4. **The middle of the room opens up (T4).** The no-place zone around the octopus shrinks to its body plus a small
   gap (lane furn's `OCT_BODY` / `OCT_GAP`), because lane furn already makes the octopus step aside and route around
   pieces. Prove the furn guarantees still hold: the octopus never stands in or walks through a piece after any
   placement next to it, its spots stay outside the pieces, inside the room and reachable (the door route). The
   octopus only moves by lane furn's plain step-aside, no face or line about it (hard lines 1 and 4).
5. **After 놓기 the character is free and visible (T7, T8).** The character is never left wedged between the piece
   and a wall (a short step to the free side is fine); the placement mark stays visible even behind the character;
   while carrying, the camera keeps the character and the piece inside the part of the scene not covered by the top
   row, the tools and the strip at 360x740 and 320x568 (lane cam is adding left/right turning of the view at the same
   time: keep your camera change small, inside the follow code, and say exactly what you changed so the merge is easy).
6. **Picking and finishing are clear (T9, T11, T14).** In the mode, tapping a piece in the room picks it (it does not
   sit on the sofa); outside the mode a tap on the sofa still sits. The first-time hint does not cover the stick or
   the 취소 / 놓기 buttons.
7. **The furniture UI's words (owner).** '끝내기' becomes '저장하기' (the owner's word). Then read every word of the
   furniture UI the same way — the title row ('가구 배치', '가구를 골라', the piece names), '취소', '놓기', the slider
   labels, the strip's aria-label, the first-time hint '가구를 고르고, 캐릭터를 움직여 자리를 잡아', the top-bar button's
   aria-label / title, any toast in this mode — and make each say plainly what happens, short, in the warm plain 반말
   voice (the owner also finds the game's text too long overall: a later lane shortens text everywhere, so make
   these already short). Keep aria-labels meaningful. Show the owner a before → after table.
8. **Grid (T13).** Keep the fine step (after item 1 the wall clamp already gives flush edges). Fix the comments that
   claim a 0.25 m grid so they say what the code does.

Not in this lane: the camera's left/right turning (lane cam), the stairs (lane stair), the text of the rest of the
game (lane ui), the crate's candle and the octopus spots themselves (lane furn, done — only extend them). If you see
a plain bug elsewhere while you work, note it in "left".

## Rules

- Smallest change for each item. Match each file's style (comments short, Korean, dated `11-14`, saying why).
- Hard lines: no emoji or symbol characters (labels are words; icons are pixel images); sound off by default;
  hard line 10: saved layouts (`S.room.layout`, `{id: [x, z, rot, scale]}`) from production load unchanged and keep
  everything (do not re-snap or move a saved piece on load).
- Text changes make the font subsets stale: run the font check and regenerate with the same tool without `--check`;
  list the font files rewritten.
- Many smoke checks assert exact strings ('끝내기', '놓기' …): update them to the new text without weakening them.

## Tests that fail without the fix

Next to the existing furniture checks in scenario `Z` (`grep -n furn tools/smoke.js`), deterministic (wait for states,
not durations; `APP.scene.debugStep` freezes the clock as the probe did): (1) carry, push with the stick input, release
→ the piece and the character's facing do not change (within a small tolerance), for the keyboard path too; (2) a piece
pushed against the window wall and the back wall is placed flush there; (3) pushing into the play-room door and the
stair while carrying keeps the room, the mode and the carry; (4) a refused cell sets the refused mark state, and 놓기 /
저장하기 there, or after a resize / rotation into another piece, never saves an overlap (assert against the footprints);
(5) a piece can be placed at the octopus's body + gap, and afterwards the octopus is outside every piece and its door
route exists; (6) in the mode a tap on the sofa picks it, outside it sits; (7) the new labels ship. Also re-run the
probe's play script (`furn-ux-play/run.js` with `steer.js`, the same 9 + 5 targets and the same seed, at the same two
sizes) on your tree and on the base, and report the before → after table (placed / missed / error / swings / bumps /
exits). Revert each part alone in a scratch copy and name the check that fails (mutation table).

## Suites

`npm test`; the font check; `SMOKE_ONLY=Z` until it passes twice in a row (or explain a load-only failure with a control
run on the base); the smoke letters that assert the furniture strings you changed (grep them); `node
tools/test-scene-perf.js` once (it covers furniture taps). Keep scratch copies in `/dev/shm` and delete them. Put back
every tracked evidence file you did not mean to change.

## Report

Each item: what was wrong (the probe's evidence or your own repro on the base), the change (file:line, before → after),
the check and the mutation table. Screenshots (full paths) at 360x740 and 320x568: the mode right after picking, a
piece pushed against the window wall before and after release, a refused cell, after 놓기. The labels table. The
probe re-run table. What you left and why; suite totals; what you did not verify.
