# Finish the garden: the checker's four nits and two loose ends (lane "gnits")

Read `/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final/COMMON2.md` first for the
project, the hard lines and how to run things (its base commit is older than yours). Your label (scratch folder):
`fix-gnits`. You edit only **`/home/user/ppolppol-fix-gnits`** (branch `fix-gnits`, base **`db86dd9`** = the
deploy-2 line with the weekly, salon, upstairs and garden lanes merged; `node_modules` is an untracked symlink,
never stage it). Do not commit.

## The situation

The garden lane (commit `1437791`, merged in `beb5de1`) fixed the plot taps (a 3D raycast in `pick`, octopus body
first), the seed drawing, the fence, the plots' accessible labels (`plotView`, `plotLabel`, `plotLabels` in
`js/app.js`), the 2D sheet sentence, garden entries with an unknown colour, the plant geometry's disposal, and the
redraw after another tab, an import or a reset. Scenario `X` in `tools/smoke.js` (`scenarioGarden`, 33 checks)
guards it. Its fix report: `…/scratchpad/final/report-fix-garden.json`, notes and scripts in `…/final/fix-garden/`.

An independent checker found no must and no should, and four nits. Its report:
`…/scratchpad/final/report-check-garden.json` (problems G1, E1, T1, E2; evidence and probes in
`…/final/check-garden/`, for example `probe/daylabel.js`, `probe/state.js`). The owner wants them fixed too.

## What to fix

### 1. G1: the outside plot buttons' labels go stale

The labels are set by `applyGarden` and on focus only. A tab left open over midnight keeps yesterday's labels
("…새싹, 오늘은 물을 줬어", "…빈 칸, 씨앗이 없어") after the day changes and the day gift brings a seed, while a press
now waters and plants. A screen-reader user who swipes (no DOM focus) hears the wrong action. Make the labels true
**without a focus**: within a minute of the day change, and right after anything that changes the seed count or the
garden (the day gift from the minute timer or from the tab becoming visible, the weekly gift's claim, another tab's
write, an import, a reset). Find the smallest single place that covers all of these (for example the place that
already shows the seed or shell count, or the 1-minute tick) rather than adding a call to each path; say which
paths you checked.

### 2. E1: a garden entry with no colour is harvested into `dyes["undefined"]`

`userState` keeps every object entry (an unknown colour is kept for a later build). An object without a string
colour is not such data: every planted entry gets a colour at planting. Never write a junk key into the save, and
never tell the player they got something they did not get. Choose the smallest honest behaviour (for example:
`userState` turns an object entry without a non-empty string colour into an empty plot, the way it already treats
non-objects; or the harvest credits nothing and says nothing about a dye). Say what you chose and why.

### 3. T1: two changed lines have no failing check

The water clamp in `gardenAct` (`g.water = v.w + 1`; a damaged water of -3 needed four presses before a sprout) and
the sheet's `u.garden.slice(0, 3)` in `renderBag` (a fourth entry showed a fourth button "텃밭 undefined 칸"). Add
checks to `X` that fail without each: a damaged water value (negative, too large, not a number) is watered once
and shows the right stage; a garden with more than three entries shows three sheet buttons and three outside
plots, and loses nothing else of the save.

### 4. E2: an unknown-colour flower looks like a known one

Outside it is drawn in the scene's default `#e8a93a` (exactly 노랑 in `DYES`); in the 살림 sheet in the CSS default
`--fl` `#f07aa8` (exactly 분홍). Its label says "꽃" and its harvest keeps the saved colour key. Draw it in **one
neutral colour that is no `DYES` colour**, the same in the scene and in the sheet, chosen from the existing
palettes (`PAL` in `js/scene3d.js`; the sheet's CSS uses plain hex: use the same value). It must still read as a
flower on the soil by day and at night. Check every `DYES` colour is visibly different from it (say the distance).

### 5. Probe P1: a plot partly off screen

The checker read in the code (not reproduced): when the ray hits a plot's soil or plant but that plot's button is
not up (`SPOTS['plot' + pi] && spotInfo('plot' + pi)` false, for example the plot is panned or zoomed partly off
screen), `pick` falls through to the octopus hit sphere and then to the 2D button boxes (`spotAt`), which could act
on the **neighbour** plot. Reproduce it at 360x740 and 320x568 by panning and zooming the outside view with real
gestures (the scene has swipe pan and pinch or wheel zoom). If a tap on one plot's drawn soil can act on another
plot, fix it in the smallest way (for example a soil or plant hit whose plot is not available returns nothing
instead of falling through) and add a check to `X`. If it cannot happen, show why (measured) and change nothing.

### 6. Probe P2: "import a save without a garden leaves the old garden"

The garden fix agent saw, in a tester's script, that importing a save without a `user` block (its `REC(3)` case)
left the old garden in the save on both base trees; scenario `X`'s own import of a save without `user` worked
(shells 0, empty garden), so it stayed unexplained. The script: `…/final/fix-garden/repro/f-sync.js` (outputs
`f-sync-*.out` next to it; it does not record `importJSON`'s return value). Find out what happened: a rejected
import (then the old garden staying is right; say what rejected it and whether the player is told), or a real
import that keeps the old garden (then fix it in the smallest way in `importJSON` or `userState` and add a check
to `X`). `importJSON` was the salon lane's; that lane is finished, so you may edit it, minimally.

## Lanes

Two agents work at the same time in other trees, on code that will be merged after yours:
- the **owner** lane (base `ae505a3`): in `js/app.js` the octopus's pre-nap window (`rest`, `restTick`,
  `syncRest`), the weekly list (`QUESTS`, dealing and swapping, `weekState`, `weekSwapTo`, progress reading, the
  "산책 갈지 묻기" count where the walk invitation is pressed), in `js/scene3d.js` the following upstairs
  (`octMountLoft`), in `tools/smoke.js` scenarios `Q` and `Z`, and `docs/SALON.md`, `docs/ROOM_EXPANSION.md`;
- the **thin** lane: the entry intro and the sky (`js/intro.js`, `css/intro.css`, the sky and intro code in
  `js/scene3d.js`, `tools/intro-shots.js`, `docs/INTRO_SLOW_PROTO.md`).
**Stay out of those.** Your area: the garden code in `js/app.js` and `js/scene3d.js` (`pick`'s exterior branch,
`setGarden`), `userState`, `importJSON` if P2 needs it, the bag sheet's garden part and its CSS, scenario `X`. If
G1's single place is `dailyGift`, `renderBagChip` or `weekClaim`, a one-line call there is fine: say so.

## Rules

- Smallest change that is right. Match each file's style (dense; comments short, Korean, dated `11-13`, saying why).
- No new player-facing line unless one is needed; if any, plain Korean, no emoji or symbols, nothing about what
  the octopus feels or wants, and run the font check (regenerate with the same tool without `--check` if stale and
  list the font files).

## Tests that fail without the fix

Extend scenario `X` (`SMOKE_ONLY=X node tools/smoke.js`) in its style: seeded `localStorage`, the date through
`window.__ppolTest.today`, the page clock or `debugStep` where time has to pass, waits for a state and never for a
duration, positions from the scene's own projection. Keep its 33 checks passing and unchanged in strength. Then
revert each of your fixes alone in a scratch copy and name the check that fails (keep the output). A fix with no
failing check is not finished.

## Suites

`npm test`; the font check; `SMOKE_ONLY=X` until it passes three times in a row on the final code; `SMOKE_ONLY=A`
once; `SMOKE_ONLY=Q` once (the weekly claim gives seeds); `node tools/test-scene-perf.js` once only if you changed
`js/scene3d.js`. The load rule in COMMON2.md applies (two other agents run browsers too). Put back every tracked
evidence file you did not mean to change.

## Report

For each item 1 to 6: what you found, what you changed (file:line, why), what you decided. The new checks and the
mutation table. Pictures (full paths): the unknown-colour flower outside (day and night) and in the sheet, at
360x740. Suite totals with the load note. What you saw and did not fix. What you did not verify.
