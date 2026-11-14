# Four small import and reset defects left from the second deploy (lane "imp2")

Read `/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final/COMMON4.md` first (the project,
the hard lines, how to run things, the SHEET_SETTLE test gotcha). Your label (scratch folder) is in your task message.
You edit only **`/home/user/ppolppol-fix-imp2`** (branch `fix-imp2`, base **`12ba4e9`** = production `a850175` +
notes; `node_modules` is an untracked symlink, never stage it). Do not commit.

## The situation

Before the second deploy, an independent look at the import path (report: `wip/round2/reports/report-imp-look.json`
in your tree; probes and logs in
`/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final/imp-code/` and `…/imp-play/`, each
with a `notes.md`) found four small defects. Three behave the same on the first deploy `f2c93f1`; none blocks play.
They were left for this round. Read the report's findings C-a, C-b, P-1, P-2 and the probes before you change
anything, and reproduce each on the base first.

1. **C-b = P-1 — a file exported during a walk.** '내보내기' works while a turn runs, so a file can hold a trip with
   status `running`. Importing that file later (this tab not busy) keeps the trip `running`: unlike a reload
   (boot runs `resumeRunning` and then `finalPose`), the import does not finish it. The octopus stands idle; after
   the next turn ends, `lieDown` sees another running trip and the octopus never naps (awake on the blanket while the
   record says sleep), and other tabs' `syncRest` is blocked too, until a reload finishes the old trip ('네가 없는
   동안 집에 있었어'). Expected: the import finishes the running turn the way boot does (same rule, same wording, no
   new walk, nothing lost), or another way the checker can't break. Probe: `imp-code/probe3.js`.
2. **C-a — another open tab after an import.** Tab B has already seen the record's last turn (`restSeen`); tab A
   imports a napping file whose last turn is that same trip. B adopts the record (state sleep, `restPhase()` 'nap')
   but `syncRest` returns early on `t.id === restSeen`, so B's octopus stays awake (even upstairs, then on the blanket)
   while the record and A say it is asleep, until a reload. Expected: B lies down on the attic blanket like A
   (through the normal path: `sleepNow` / `restDown`, never asleep upstairs). Probe: `imp-code/probe2.js`.
3. **P-2 — re-importing your own file during an awake window.** Importing a file just exported in the same awake
   window recomputes the window from the clock and drops the time paused upstairs (33 s left became 15 s). Small;
   fix only if the fix is clear and does not bring back the stale window the 11-13 fix removed (C-2: a window that
   belongs to the replaced record must not survive). If you leave it, say why.
4. **Reset upstairs (unverified).** `resetAll` calls `octInitial()` without first bringing the octopus down; if the
   player resets while the octopus has followed them upstairs, the new octopus may stand upstairs at attic
   coordinates (the same bug `importJSON` had before 11-13). Reproduce first; if real, fix it the way `importJSON`
   does now (11-14: an awake record keeps a following octopus beside the player; for a reset the new octopus belongs
   in the attic — decide and say why), and keep the name dialog flow.

The current `importJSON` (11-14, `b09e671`): `clearRest()`; if `octWithMe()` and the imported octopus is awake it
stays beside the player; otherwise `scene.octDown()` (when up) and `octInitial()`. Scenario `Z` part 5 checks 5-8
and 5-9 guard that; keep them passing.

## Lanes

Another agent edits **`/home/user/ppolppol-fix-honest2`** at the same time (lane honest2: demo-brain strings in
`js/world.js` / `js/brain.js`, the petting face in `js/scene3d.js` / `js/scene2d.js` / `STATE_EXPR` / `css`, scenario
`A`/`T` checks about them). **Stay out of those.** Your area: `importJSON`, `exportJSON`, `resetAll`,
`resumeRunning`, `finalPose`, `syncRest`, `lieDown`, the storage listener, and their tests.

## Rules

- Smallest change. Match the file's style (comments short, Korean, dated `11-14`, saying why).
- Hard line 10: a save from production (`a850175` or `f2c93f1`) keeps everything it had. A finished trip keeps its
  receipt, souvenirs, poster, lantern and weekly counts exactly as boot would have given them; nothing is counted
  twice across tabs.
- Font check if you add Korean text (prefer reusing existing wording).

## Tests that fail without the fix

Add one smoke check per fixed item (scenario `Z` part 5 if it is about upstairs, otherwise next to the existing
import checks — find them with `grep -n importJSON tools/smoke.js`), deterministic under load (the date hook, seeded
`localStorage`, the clock hooks the scenario already uses; wait for states, never for durations). Revert each change
alone in a scratch copy and name the check that fails.

## Suites

`npm test`; the font check; `SMOKE_ONLY=Z SMOKE_Z=5`, and the letters that hold import checks (at least `Q`, `X`,
`Y`) until each passes twice in a row; `node tools/test-resume.js` once (boot's resume path). The load rule in
COMMON4.md applies (another agent runs browsers). Keep scratch copies in `/dev/shm` and delete them. Put back every
tracked evidence file you did not mean to change.

## Report

Each item: reproduced on the base (how), the change (file:line, before → after), the check and the mutation table;
items left and why; suite totals; what you did not verify.
