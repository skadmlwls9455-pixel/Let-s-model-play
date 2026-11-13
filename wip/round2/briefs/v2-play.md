# Verify the second deploy, lens 2 — play it on a phone

Read `/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final/COMMON3.md` first.
Your label (scratch folder): `v2-play`.

You are an independent tester who plays. Use Playwright with a phone context (360x740 touch first, then 320x568 and
one of 390x844 / 412x915 / 430x932), the date hook to move days and weeks, and real taps, swipes and pinches. Look
at every screenshot yourself. The other lenses read code, check saves and judge the hard lines; you find what a
player would notice.

## Play these, in order, as a player would

1. **First visit**: the entry intro (3D at 360x740 by day and at night, in rain; `?scene=2d`; reduced motion), the
   name, the first colour, the first day gift. Does the intro look right from start to landing (no flat screen of
   one colour for long, no seam, no flash, the title on time)? Compare one run with production `f2c93f1` side by side.
2. **A walk and the time after it**: invite, the model decides (a stub brain is fine: read `tools/smoke.js` for how
   the scenarios drive a turn and stub the brain), the return, the awake window on the blanket (tap the octopus:
   its line), the nap. Then a turn that stays home.
3. **Upstairs**: climb with the octopus awake and idle (it follows); climb during the awake window after a turn (it
   stays downstairs; the mirror says one line); (climbing while the model is still thinking and a stay-home turn
   ending upstairs is being changed in another lane: skip it); the mirror and the salon sheet when
   it is with you; going down and up again.
4. **The weekly list** (살림 › 이번 주 할 일): do the tasks for real (ask a walk, plant, the loft, the play room,
   the look sheet, the poster diary), swap one, finish five, claim the gift, then move the date to the next Monday.
   Also open a production save from the middle of a week (lens 3 builds them; a simple one of your own is fine).
5. **The garden outside**: during a walk, plant, water, harvest; tap the plots near the screen edge after panning
   and zooming; read the plot labels with a screen reader's eyes (`aria-label`) after a day change without focus.
6. **Two tabs**: the same save in two tabs; a walk in one; the day gift; the weekly claim; a reset in one.
7. **Long session**: leave a tab open across midnight (date hook plus the 1-minute timer) and across a week change.

At each step look for: something that does not respond, a wrong or stale label, overlapping or cut text at 320 px,
a sheet that cannot be closed, an animation that jumps or freezes, the octopus in the wrong place, a number that
does not add up, a console error.

## How to report

Each finding: severity (COMMON3.md), a title, the screen and size, what happens versus what should, exact steps or
the probe script, and screenshot paths. Mark which ones you reproduced twice. List what held in `checked_ok`.
