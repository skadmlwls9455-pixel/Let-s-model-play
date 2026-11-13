# The octopus stays upstairs when a turn ends there (lane "owner3", owner default for OW-3)

Read `/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final/COMMON2.md` first for the
project, the hard lines and how to run things (its base commit is older than yours). Your label (scratch folder):
`fix-owner3`. You edit only **`/home/user/ppolppol-fix-owner`** (branch `fix-owner`, base **BASE_SHA** = the owner
lane committed: decisions 3b, 4b, 5b of 11-12 and their repair; `node_modules` is an untracked symlink, never stage
it). Do not commit.

## The situation

The owner lane made the octopus not follow the player upstairs while it rests after a turn (the awake window
before its nap, and the nap itself): `on.octResting` in `js/app.js` (asked by `octMountLoft` in `js/scene3d.js`),
and `restDown()` in `js/app.js`, called from `finalPose` (a turn of this tab ends) and from `syncRest` (another
tab's turn ended, or this tab becomes visible). `restDown` moves the octopus from upstairs to the attic blanket at
once (`scene.octDown()` = `octUnmountLoft` + `octPlace('blanket')`).

The independent checker found (OW-3 in `…/scratchpad/final/report-check-owner.json`, evidence in
`…/final/check-owner/`, probe `w/p1.js` case S): if the player climbs while the model is still thinking (a real
model can take many seconds), the octopus follows, because it is awake and idle. When the turn ends as a stay-home
turn, `restDown` takes it to the blanket at once, so **it vanishes from the upstairs room in front of the player**.
The same happens when another tab finishes a turn. The owner's standing answer for upstairs (11-12, decision 1)
is "the octopus stays where it arrived upstairs". The owner was asked and did not answer; the announced default is
option (b) of the checker: **leave it upstairs until the player goes down**.

The checker's other owner item OW-4 (the awake window does not count down while the player is upstairs, the 11-08
rule in `watching()`) stays as it is: the owner's default is to keep it (the window exists so the player can tap
the octopus and read its line after a turn, so it waits until the player can see it). Do not change `watching()`.

## What to change

1. **A turn of this tab ends while the octopus is upstairs with the player** (`finalPose`): it stays upstairs
   where it is, awake and idle, in view, in its rest period (`rest` armed as now; the window does not count down
   upstairs, as now). No walk, no jump, no sound. When the player goes down (`octUnmountLoft`, which already returns
   it to the attic, and every other way the loft is left: a ceremony, the play room, a reload), it is on the
   blanket in its awake window, with at least the existing minimum awake time left (`AWAKE_SEEN`), and then naps as
   usual. Climbing up again during the window: it does not follow (3b, unchanged).
2. **Another tab ends a turn, or this tab becomes visible, while the octopus is upstairs here** (`syncRest`): if
   the octopus should be awake now (its window by the clock), leave it upstairs as in 1. If it should already be
   asleep (the window has passed, or the nap is due), it must not nap upstairs: a sleeping octopus is always on
   the blanket. Keep today's move for that case, or find a gentler honest one; say which and why.
3. **Never a sleeping octopus upstairs**, in any path you find (the test hook `__ppolAwakeMs` = 0 makes the turn
   end straight into the nap; `sleepNow`; a day change while upstairs; a reload while upstairs).
4. **The mirror** while the octopus is upstairs in its awake window: it is present and awake, so `openSalon` works
   as for an awake octopus upstairs (check that it does; no new line). If you find a reason it must not, say so in
   the report instead of changing it.
5. **What the octopus says and shows does not change**: the tap line after a turn (BRAIN.tapLine) still works
   upstairs; nothing new is said about why it stays.

Find the smallest change (for example, `restDown` does nothing while the octopus is awake and upstairs with the
player, and the attic placement happens when the octopus comes down). Read `octUnmountLoft`'s `emit('octUp', false,
anchor)` and the app's `on.octUp` handler before choosing where the blanket placement happens.

## Lanes

Another agent (lane **gnits**, tree `/home/user/ppolppol-fix-gnits`) works at the same time on the outside garden
(`pick`'s exterior branch and `setGarden` in `js/scene3d.js`; `plotView`, `plotLabel`, `plotLabels`, `gardenAct`,
`renderBag`'s garden part, `userState`, `renderBagChip`, the `storage` event listener (a `lastSeen` guard),
`importJSON`; scenario `X` in `tools/smoke.js`). **Stay out of those.** Your area: `restDown`, `finalPose`,
`syncRest`, the rest functions next to them, `on.octUp` / `on.octResting` in `js/app.js`; `octMountLoft` /
`octUnmountLoft` in `js/scene3d.js` only if needed; scenario `Z` (and `Q` only if a check there asserts the old
move); `docs/ROOM_EXPANSION.md`, `docs/SALON.md` and `docs/OWNER_DECISIONS.md` for the decision text.

## Rules

- Smallest change that is right. Match each file's style (dense; comments short, Korean, dated `11-13`, saying why).
- No new player-facing line. If you find one is needed, stop and say so in the report instead.
- Write the two decisions in the docs where the 11-12 decisions are written: OW-3 (b) "a turn that ends while the
  octopus is upstairs leaves it upstairs until the player goes down (owner default 11-13)", and OW-4 kept
  "the awake window counts only while the attic is seen (11-08 rule kept, owner default 11-13)".

## Tests that fail without the fix

Scenario `Z` part 5 (`SMOKE_ONLY=Z SMOKE_Z=5`) checks 5-3 and 5-5 assert the old move to the blanket. Rewrite them
to the new behaviour and add what is missing, in the scenario's style (seeded `localStorage`, the page clock or
`debugStep` where time has to pass, waits for a state and never for a duration, positions from the scene's own
projection, the brain's test hooks for a slow turn). At least: a stay-home turn that ends while the octopus is
upstairs leaves it upstairs, visible, awake (5-3); going down puts it on the blanket in its awake window and
climbing again does not bring it (5-3); another tab's turn end while it is upstairs, inside the window, leaves it
upstairs, and outside the window takes it to the blanket asleep (5-5); with `__ppolAwakeMs` 0 it is never asleep
upstairs. Keep every other check unchanged in strength. Then revert your fix alone in a scratch copy and name the
checks that fail (keep the output). A fix with no failing check is not finished.

## Suites

`npm test`; the font check; `SMOKE_ONLY=Z` until it passes three times in a row on the final code; `SMOKE_ONLY=Q`
once; `SMOKE_ONLY=A` once; `SMOKE_ONLY=Y` once (the mirror); `node tools/test-scene-perf.js` once only if you
changed `js/scene3d.js`. The load rule in COMMON2.md applies (another agent runs browsers too). The disk is shared
and was full once today: keep scratch copies few and delete them when done (or put bulky ones in `/dev/shm`). Put
back every tracked evidence file you did not mean to change.

## Report

What you found (the paths that move the octopus down, and which you changed), what you changed (file:line, why),
the decisions (item 2 and 4), the new and rewritten checks with the mutation table, pictures (full paths) at
360x740: the octopus upstairs right after a stay-home turn ended there, and on the blanket after going down. Suite
totals with the load note. What you saw and did not fix. What you did not verify.
