# Carry out three owner decisions of 11-12 (lane "owner")

Read `/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final/COMMON2.md` first for the
project, the hard lines and how to run things (its base commit is older than yours: yours is named in your task).
Your label (scratch folder): `fix-owner`. You edit only the tree your task names. Do not commit.

## The situation

Independent testers of the merged "final" branch raised design questions the lead put to the owner. The owner
answered on 11-12. Three answers need code; the others keep what is there (the octopus stays where it arrived
upstairs; the mirror says one plain line when the octopus is downstairs). Your tree already holds the weekly
lane's work (scenario `Q`, `weekState`, `weekSwapTo`, `questCan`, …) and the upstairs lane's work (scenario
`Z`, `octMountLoft`, `octEndWalk`, …): read both before you change anything, and keep their checks passing.
The testers' entries: `report-verify-welfare.json` W3, W4, W5 (with evidence and scripts in `v-welfare/`).

## The three decisions

### 1. The octopus does not follow upstairs in its awake window before a nap (W3, option b)

After a turn the octopus stays awake for a while on its blanket, then naps (`rest`, `restTick`, `syncRest` in
`js/app.js`; the window is counted only while the player watches the attic). Today, if the player climbs the
stairs in that window, the octopus is mounted upstairs (`octMountLoft` in `js/scene3d.js`) and its nap waits as
long as the player stays up. The owner chose: **in that window it does not follow** — treat it like sleep for
this purpose. It stays on its blanket downstairs and naps on its own schedule. Upstairs the mirror then says the
existing plain line for "awake downstairs" (or the sleeping line once it naps). Nothing else about following
changes (awake and idle at home: it follows as now). Never wake it, never move it, no log row, no sound.
Find the cleanest way for the scene to know about the window (the scene does not know `rest` today), and make
sure every way into the window and out of it is covered (a turn ends while the player is upstairs; the window
ends while the player is upstairs; a reload during the window; another tab).

### 2. Remove the task "이번 주에 사흘 들어오기" from the weekly list (W4, option b)

It only counts page loads (an attendance task). Remove it from the pool. A saved week that holds it must load
without losing anything else: the slot is replaced by another task the way the code already replaces an unknown
slot (keep the replacement deterministic and saved, like the rest of the list). Remove what only served that task
(its special cases in dealing and swapping, its progress reading) if nothing else needs it, but keep the day
record `user.days` and the day gift's "들어온 날 N일째" exactly as they are. Update the comment above `QUESTS`.

### 3. A press that wakes a napping octopus does not count as "문어한테 산책 갈지 묻기" (W5, option b)

Pressing "산책 갈래?" on a sleeping octopus wakes it (that stays). The press now also counts for the weekly task.
The owner chose: **a press that wakes it does not count**. A press on an awake octopus counts as now (after the
plan comes back). Make sure the count cannot be gained another way by the same press (for example a second press
during the wake-up).

## Rules

- Hard lines: never steer the octopus; refusals and staying home cost nothing; nothing pays for the octopus going
  out. Do not add any player-facing line unless one is needed; if you do, plain Korean, no emoji or symbols, and
  run the font check.
- Smallest change that is right. Match each file's style (dense; comments short, Korean, dated `11-12`, saying
  why, quoting the decision: "주인 11-12").
- Update the docs that describe these behaviours (`docs/SALON.md` and `docs/ROOM_EXPANSION.md` for 1; the
  comment block of the weekly list for 2 and 3).

## Tests that fail without the change

Extend scenario `Z` (upstairs) for 1 and scenario `Q` (weekly) for 2 and 3, in their style: seeded state, the
date hook, stepped time, waits for a state and never for a duration. Cover every entry and exit of the window for
1, an old save holding the removed task for 2, and the waking press and the second press for 3. Then revert each
change alone in a scratch copy and name the check that fails (keep the output).

## Suites

`npm test`; the font check; `SMOKE_ONLY=Q` and `SMOKE_ONLY=Z` each until they pass three times in a row;
`SMOKE_ONLY=A` and `SMOKE_ONLY=Y` once each. The load rule in COMMON2.md applies. Put back every tracked evidence
file you did not mean to change.

## Report

For each decision: what you changed (file:line, why), how the scene learns about the window (for 1), and the
checks with the mutation table. Suite totals with the load note. What you saw and did not fix. What you did not
verify.
