# Fix the garden outside and the redraw after a reset, an import or another tab (round 2, lane "garden")

Read `/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final/COMMON2.md` first for the
project, the hard lines, the reports and how to run things. Your label (scratch folder): `fix-garden`.
You edit only **`/home/user/ppolppol-fix-garden`** (branch `fix-garden`, base `34f77ad`; `node_modules` is an untracked
symlink). Do not commit.

## The situation

The merged "final" branch made the garden visible outside: three plots by the yard fence, drawn in the 3D scene
(`js/scene3d.js`, search `PLOT` and `setGarden`), tappable while the outside is shown (buttons `#btn-plot0..2`
in `index.html`, `spotAt` / `pick` in the scene), and always workable from the 살림 sheet (`gardenAct`,
`applyGarden` and the garden part of `renderBag` in `js/app.js`). Four independent testers went through it; the
list below is what they found there. Read each named entry in the reports completely before you touch its code
(they hold the evidence, screenshots and a runnable script).

Other agents work at the same time, each in its own tree: the weekly lane (`weekState`, `renderWeek`,
`renderBagChip`, `questMark`, `dailyGift`, `checkDay`, `giftOffer`, `setsCheck`, the sew sheet, the `.week-*` and
`.bag-tag` rules in `css/style.css`), the upstairs lane (`octMountLoft`, the stairs, the mirror, `openSalon`,
`scheduleWander`, the scene line) and the salon merge (scenario Y, the salon functions, `takeRemote`,
`importJSON`, `normalize`). **Stay out of those**, even when a finding of yours is next to them: if one of your
items needs a change there, make the smallest possible one and say exactly what and why in your report.

## Already in your base (the other session's commit `66c8110`, no tests)

- The plot pick outside now drops the tap onto the ground plane (y 0) and picks the plot whose soil contains
  that point, before the old 2D-box test (`js/scene3d.js`, search `바깥 텃밭: 톡한 자리를 땅`). That is item A.
- `renderAll` now also calls `renderBagChip`, `applyGarden`, `applyDye` and re-renders an open 살림 sheet. That is
  most of item G.

For A and G your job is first to **check** these: reproduce the original findings on an untouched copy of
`6e3f6f4` with the testers' scripts, show them gone on your tree, look for what was missed (below), fix that,
and add the checks that commit lacks. B to F are not touched by it.

## What to fix

### A. A tap on a plot acts on that plot (C7 = F1, F18) — check `66c8110`'s ground pick

The three plot buttons are 61x67 px and overlap their neighbour by a third; the hit boxes are 0.75 m tall. A tap
on the back-right part of the first plot's soil plants, waters or harvests in the second plot (4 of 27 soil taps
wrong, the same at 320x568, 360x740 and 412x915), and the same from the second to the third. A wrong tap can
spend a seed or harvest a flower the player did not mean. A tap on the place where the octopus stands when it
visits the fence (spot `numbers`, next to the first plot) acts on the first plot.

- A tap on visible soil, or on the plant growing from it, acts on that plot and no other. Test it the way the
  features tester did (`v-features/t-garden2.js`, `PHASE=map`): a grid of points over each plot's soil at the
  three sizes, zero wrong.
- A tap on the octopus is a tap on the octopus (test with the octopus really standing at that spot, which the
  tester did not do).
  The ground pick runs before the octopus test: a tap on the octopus's body standing at the fence projects to
  the ground behind it, possibly inside the first plot. Check it with the octopus really there.
- The keyboard path (the three buttons, Enter) keeps working, and each button's focus ring sits on its own plot.

### B. What is planted can be seen (F13)

A planted seed is an olive dot of about 4x3 px on dark soil: after planting outside, the plot looks empty until
the first watering. And the fence's rail and end post stand inside the soil of the first plot.

- Make a seeded plot read as seeded at phone size, in the scene's pixel style and palette, with the smallest
  drawing change that does it (for example a lighter mound with a marker stick). Sprout and flower stay as they are.
- Get the fence out of the first plot's soil with the smallest change (move the plots a little, or shorten the
  fence), and keep the octopus's fence spot, the walk paths and the plot taps right after it.
- Keep the scene inside its budgets (`node tools/test-scene-perf.js` counts draw calls and shader programs: run
  it once at the end; under load it is slow, give it time, and compare a failure with a control run).
- Pictures before and after at 320x568, 360x740 and 412x915 (and enlarged four times), for empty, seed, sprout
  and flower, by day and at night. The lead looks at them, so make them easy to compare.

### C. The buttons say what is there and what a press does (F14)

The outside buttons are always "텃밭 첫째 칸"; the sheet's plot buttons read as glued words ("씨앗물 주기",
"파랑 꽃거두기") and have no label. Give both an accessible name with the plot, what is in it and what a press
will do (for example "텃밭 첫째 칸, 새싹, 물 주기"; for a plot already watered today say that plainly), kept current
whenever the garden changes. Visible text stays as it is.

### D. The sheet's hint in the 2D fallback (F15)

With `?scene=2d` the sheet still says "문어가 산책 나가 바깥이 보일 때는 밭을 바로 톡 해도 돼", but there are no plots
to tap. Show that sentence only where it is true.

### E. A garden entry the build does not know (F17 = the second half of C16)

A plot whose colour is not in `DYES` (a damaged save, a hand-edited one, or one from a later build with a new
colour) makes `renderBag` throw before the 살림 sheet is shown, so the weekly list and the garden cannot be
opened at all; `gardenAct` throws too. Make the reads tolerant: the sheet opens, the plot shows as a plant, can
be watered and harvested, and nothing is thrown. Do not rewrite or drop the saved colour (a newer build may know
it); only an entry that is not an object at all becomes an empty plot.

### F. The plant geometry is released with the scene (the first part of C18)

The merged plant geometry is disposed on each `setGarden` call but is not in the scene's list of things to
dispose, so it leaks once when the 3D scene is thrown away (`js/scene3d.js`, `mergeParts` without `keep`).
Register it the way the file does for its other rebuilt meshes, and do not let the list grow on each rebuild.

### G. The screen follows the save after a reset, an import or another tab's write (C5 = F4, the end of W8)

The saved state is right but the screen is not:
- after another tab earned shells, planted or claimed, this tab still shows the old "조개 n", the old dot on the
  살림 tag, an old open 살림 sheet, and an empty garden outside;
- after an import, the tag shows the old shell count and no dot although five tasks are done;
- after "전체 초기화", the tag stays visible with the old count on top of the name dialog, and the old plants are
  still drawn outside even after a new octopus is named (the save says the garden is empty).

`66c8110` added these calls to `renderAll`. Check that every path above really goes through it (does `resetAll`?
the name dialog after a reset? an open sew sheet?), that the old plants are gone after a reset and a new name,
and that nothing is drawn twice or slower on every render (renderAll runs often: measure it). Where something is
still stale, add the missing refresh. The lead's earlier wording of the task follows for reference: add one refresh for everything that hangs on `S.user` and is not redrawn by `renderAll` today (the 살림 tag and
its dot, the plants in the scene, the body colour and bottles if they are stale too, an open 살림 or sew sheet),
and call it where the whole state is replaced (`takeRemote`, `importJSON`, `resetAll`; or from `renderAll` if
that is right for every caller). Use the other lane's functions (`renderBagChip`, `renderBag`) as they are; do
not change them.

## Not yours

Left as they are on purpose: whether the plots can be tapped only while the octopus is out (the owner asked for
gardening during a walk); the weekly list, the bag tag's look, the gift box and the sets (other lane); the upper
floor and the salon (other lane); the clock moved back a week (F9).

## Rules for this job

- Player-facing Korean (labels are player-facing): plain, short, the same informal voice as the lines around it;
  no emoji or symbol characters. After any text change run the font check; if it reports stale characters,
  regenerate the subsets with the same tool without `--check` and list the font files among your changes.
- Smallest change that is right. Match each file's style (dense; comments short, Korean, dated `11-11`, saying why).
- Sound stays off by default; nothing you add may play or load a sound.

## Tests that fail without the fix

Add a scenario to `tools/smoke.js` under the free letter `X` (scenarios are registered near the end of the file;
`SMOKE_ONLY=X node tools/smoke.js` then runs it alone), in the style of scenario `Q` (`scenarioWeek`): seeded
`localStorage`, the date hook, waits for a state and never for a duration, positions taken from the page (the
scene's own projection) and not hard-coded pixels. Cover every item above with at least one check: the soil
grid, the octopus at the fence, labels after each change, the 2D sentence, the unknown colour, the refresh after
another tab, an import and a reset. For the drawing, assert what can be asserted without judging looks (for
example that a seeded plot differs from an empty one by a minimum number of pixels in its screen box). Then prove
them: in a scratch copy revert each fix alone and name the check that fails (keep the output). A fix with no
failing check is not finished.

## Suites

`npm test`; the font check; `SMOKE_ONLY=X` until it passes three times in a row on the final code;
`SMOKE_ONLY=A` once; `node tools/test-scene-perf.js` once. Nothing else: the lead runs every suite on a quiet
machine before shipping. The load rule in COMMON2.md applies (one control run on an untouched copy of your base
when something old fails; no loops). Browser suites rewrite evidence under `tests/` and `docs/shots/`: put back
every tracked file you did not mean to change (`git status --short` at the end shows only your edits and
`node_modules`).

## Report

For each item A to G: what you changed (file:line, why) and anything you decided. The new checks and the
mutation table (fix reverted → check that failed). The pictures (full paths). Suite totals with the load note.
What you saw and did not fix. What you did not verify.
