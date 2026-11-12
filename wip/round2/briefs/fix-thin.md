# Make the entry intro's cloud bank thinner (owner decision 11-12, lane "thin")

Read `/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final/COMMON2.md` first for the
project, the hard lines and how to run things (its base commit is older than yours: yours is named below).
Your label (scratch folder): `fix-thin`. You edit only **`/home/user/ppolppol-fix-thin`** (branch `fix-thin`,
base `b287a11`, the line that ships next; `node_modules` is an untracked symlink). Do not commit.

## The situation

The entry intro (`js/intro.js`, the sky in `js/scene3d.js`: search `startIntro`, `buildSky`, `skyLayout`,
`introFit`, `CLOUD = {`; cloud pictures in `js/clouds.js`; the design and every measured number in
`docs/INTRO_SLOW_PROTO.md`, sections 3, 4 and 8) descends from 2.6 screen heights through sparse clouds and then
through a cloud bank, lands in the room, and the title pops. On 11-11 a bug was fixed: the sky had been built for
a 320x240 stand-in size, so on phones a flat 368 px slab covered 60 % of the screen for three seconds. With the
fix the intro looks as designed again. As designed, the camera passes **through** the bank: for 0.15 to 0.18 s
more than 90 % of the phone is one flat colour (2 to 3 frames fully covered), more than half for about 0.7 s.
The colour is light grey by day, pink at dawn and dusk in clear weather and snow, brown in dusk rain, blue or
grey-teal at night. On wide screens (1280x800, a phone in landscape) only the 600 px scene column is covered, so
the bank reads as a rectangle. The bank covering the whole screen also hides the moment the sky colour switches
from "above the clouds" (dark navy) to "below the clouds".

**The owner looked at it and decided: make the bank thinner** (option b of the question "the pass through the
bank fills the phone with one colour for a moment — keep, or make it thinner?").

## A prototype exists

`/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final/cloud-code/tree-opt2` (an older
tree; compare its `js/scene3d.js` with `…/cloud-code/tree-fix/js/scene3d.js` to see the whole change; notes in
`…/cloud-code/notes.md`, "option 2"). It:
- caps the bank's height (`CLOUD.bankMax: 196` art px), so it no longer covers big screens;
- puts a plain "under-sky" panel (the below-cloud sky colour, `skyEstimate`) under the bank, behind the room
  (depth +20), one and a half screens tall, so that the sky colour switch still happens while something covers
  the view;
- switches the sky band later (`INTRO.pass` lowered by half a screen when the panel exists).
Measured once, day clear, 360x740 only: the bank covered at most 43 % of the screen, at least 25 % for 0.58 s,
never 50 %; after the switch only one dark colour, no seam. Nothing else was checked.

## Your job

1. **Port it onto the current code**, which now rebuilds the sky when the size changes during the intro
   (`introSize`, `introFit`; the old sky is removed and disposed at once). The panel must be built, laid out,
   rebuilt and disposed with the sky (no leak, never two). Keep it the smallest change that gives the result.
2. **The result the owner asked for:** no moment where the phone is mostly one flat colour. Measure the largest
   share of the screen that is bank or panel colour at any frame, and how long it stays above 50 %, 75 %, 90 %.
   Aim for the bank as the prototype measured it (never half the screen); if that cannot hold everywhere, say
   where and why.
3. **Nothing else of the design changes:** start height 2.6 screens, the timeline and easing, the title at about
   2.74 s, the landing, no cloud left after landing, the sparse clouds, the colours. The **sky colour switch must
   stay invisible**: no seam, edge or flash where the above-cloud navy meets the below-cloud colour, in all four
   weathers (clear, drizzle, rain, snow) at dawn, day, dusk and night (`window.__ppolLook = { hour, weather }`),
   at 320x568, 360x740, 412x915, 430x932, 1280x800 and 740x360. Rain and snow start where they did. Reduced
   motion: no sky at all, as now. A size change during the intro still rebuilds correctly (one sky, timeline
   kept).
4. **The 2D fallback** (`?scene=2d&intro=1`, `js/intro.js` builds its own bank near line 200): look at it at
   360x740. If it shows the same full-screen flat moment, give it the same treatment; if not, leave it and say so.
5. **The guard.** `tools/intro-shots.js` step 0 checks, among other things, that at 1.36 s "the middle row is one
   colour edge to edge and that colour is the bank body colour" — the old design. Replace that check with the new
   design's invariants (for example: the largest bank share stays under the bound you reach; at the band switch
   the screen has no seam between the two sky colours, measured on canvas pixels), keep every other check of step
   0, and show that step 0 still fails on the original bug (sky built at 320x240: revert the 11-11 fix in a
   scratch copy) and on two skies at once, a timeline that restarts on a size change, and a missing panel.
   Checks must not depend on wall-clock speed (the step already steps time with `debugStep`).
6. **Pictures for the owner** (they decided from a description; they will look at these): contact sheets of the
   descent, before and after, at 360x740 for day clear, dusk clear and night rain (frames every 0.1 s around the
   pass), plus 1280x800 day clear after. Full paths in your report.
7. **Docs:** a dated section in `docs/INTRO_SLOW_PROTO.md` (Korean, in its style): what changed, why (the owner's
   choice), the numbers before and after.

## Rules

- Do not change design numbers other than the bank's height and what the panel needs; say exactly what you set.
- Smallest change that is right. Match each file's style (dense; comments short, Korean, dated `11-12`, saying why).
- Other agents work in other trees; you touch only the intro, the sky and their test and doc.

## Suites

`npm test`; the font check; `BOOT_ONLY=1 NO_VIDEO=1 node tools/intro-shots.js` until it passes three times in a
row; `NO_VIDEO=1 node tools/intro-shots.js` once (steps 1 to 6 have wall-clock waits that die under load: if
they do, run the same on an untouched copy of `b287a11` and report "no verdict because of load" when it dies
the same way); `SMOKE_ONLY=I node tools/smoke.js` once; `node tools/test-scene-perf.js` once. The load rule in
COMMON2.md applies. Put back every tracked evidence file you did not mean to change (the suites rewrite
`tests/evidence/intro/*`).

## Report

What you changed (file:line, why) and every number you set. The measurements: per size and per weather × hour,
the largest bank share, the time above 50 / 75 / 90 %, the seam measure at the switch, before and after. The
guard: the new check, and the mutation table. The pictures (full paths). Suite totals with the load note. What
you saw and did not fix. What you did not verify.
