# The evening room is too dark: a little brighter (lane "look")

Read `/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final/COMMON4.md` first (the project,
the hard lines, how to run things). Your label (scratch folder) is in your task message. You edit only
**`/home/user/ppolppol-fix-look`** (branch `fix-look`, base **`12ba4e9`** = production `a850175` + notes;
`node_modules` is an untracked symlink, never stage it). Do not commit.

## What the owner said (11-14, about 20:00 Korea time, on a phone)

"지금 화면이 저녁이라 해도 너무 어두워서 조금 더 밝게 바꿔주고" — even for evening, the screen is too dark; make it a
little brighter.

## What exists (at `12ba4e9`)

- `js/scene3d.js` ~276-293: `LIGHTS` per time of day (`day`, `dawn`, `dusk`, `night`), `FIRST_LIGHT` (an earlier
  fix after the owner could not find the octopus at 22:51 with 0 lantern cells in the rain: an ember for 0 cells, a
  moonlit floor that does not depend on the lantern, fill when the lantern is low, the octopus's faint self-glow),
  `phaseOf(h)`: `h < 6 night · < 9 dawn · < 17 day · < 19 dusk · else night`. So at 20:00 the owner sees `night`, the
  darkest preset, from 19:00. The lantern cells (등불 칸, 0-8 per day) brighten the room by steps. Weather (clear,
  drizzle, rain, snow) changes the window and outside. The loft and the play room have their own wall lamps. The
  2D fallback (`js/scene2d.js`, CSS) has its own night look. History: the look-loop notes (`docs/LOOK_LOOP.md`,
  `docs/LOOK_LOG.md` or similar) and `git log -p` on those lines.

## What to make true

- The room at evening and night reads clearly on a phone: the octopus, the player character, the furniture and
  the posters are easy to see, with every lantern level, in every weather, in the attic, the loft and the play room.
  It still reads as evening or night (warm lamp light, a darker window, the cool sky), not as daytime. A little
  brighter, as the owner asked: change as little as gives that.
- Look at the hours around the change: 17, 18, 19, 20, 21, 22, 23, 0, 3, 5 and 6 — the step from `dusk` to `night`
  at 19:00 should not be a jump (a short blend between the two from 19 to about 21 is one option; decide and say).
- Do not undo the `FIRST_LIGHT` fixes (the 0-cell ember, the moonlit floor); check its cases still hold.
- The 2D fallback: if it is just as dark, brighten it in the same spirit; if not, leave it.
- The intro (`?intro=1`) and the outside yard at night: check they did not get worse.

## How to judge

Render before/after at 360x740 (the owner's screen; also one 320x568 set) with `window.__ppolLook = { hour,
lantern, weather }` and a seeded save, and **look at every pair yourself**. Measure as well (for example the mean
and low percentile luminance of the room region, and the contrast between the octopus and its surroundings), so
the change is not only an opinion. Make one comparison sheet the owner can read at a glance: rows = hours, columns =
before / after, at a middle lantern level (for example 3) in clear weather, plus a second sheet for rain and 0
cells. Full paths in the report.

## Lanes

Other agents work at the same time: lane imp2, lane furn (the furniture code in `js/scene3d.js` ~1177-1300), lane
cam (`/home/user/ppolppol-fix-cam`: the camera and a new turn control), lane honest3 (faces and lines), a
furniture-UX probe. Stay out of those; your area is the light values, `phaseOf` and blending, the 2D night look,
their tests and docs. The load rule in COMMON4.md applies.

## Rules

- Smallest change. Match the file's style (comments short, Korean, dated `11-14`, saying why).
- No new player-facing text expected; if you add any, run the font check.

## Tests that fail without the fix

A check that pins the new behaviour, deterministic (no wall clock): for example the light values the scene uses at
20:00 versus 18:00 (a test getter on the lights), or a luminance floor of the room region at 20:00 with 3 cells in a
render, with the threshold set from your measurements and a margin. Revert the change in a scratch copy and name
the check that fails (mutation table).

## Suites

`npm test`; `node tools/test-scene-perf.js` once; the smoke letters that pin lights or looks (find them with grep:
`LIGHTS`, `lantern`, `hour`, `night`) until each passes twice in a row, or explain a load-only failure with a control
run on the base. Keep scratch copies in `/dev/shm` and delete them. Put back every tracked evidence file you did not
mean to change (render tests may rewrite `tests/evidence/*`: restore them unless the change is the point, and then
say which).

## Report

The change (file:line, before → after) with the reason, the comparison sheets and the measurements, what held for
`FIRST_LIGHT`, the 2D decision, the checks and the mutation table, suite totals, what you did not verify.
