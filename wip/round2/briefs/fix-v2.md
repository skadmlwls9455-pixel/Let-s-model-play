# Fix what the pre-deploy verification found (lane "v2")

Read `/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final/COMMON3.md` first for the
project, the hard lines (number 10: an update never loses what a player's production save had) and how to run
things. Your label (scratch folder): `fix-v2`. You edit only **`/home/user/ppolppol-fix-v2`** (branch `fix-v2`, base
**`6d03faf`** = the second-deploy line that was verified; `node_modules` is an untracked symlink, never stage it).
Do not commit.

## The situation

An independent verification of the merged second deploy (four lenses, then a separate skeptic who re-tested each
must and should) is in `…/scratchpad/final/`: `report-v2-code.json` (C…), `report-v2-saves.json` (S…),
`report-v2-play.json` (P…), `report-v2-welfare.json` (V…), and the skeptics' folders `confirm-C1/`, `confirm-S1/`,
`confirm-V1/`, `confirm-S2/`, `confirm-C2/` (notes, probes, logs). The verdicts are in `report-verify2-all.json`
(keys `confirm:<id>`). Read the entries for every item below completely before you change anything.

## What to fix

### 1. MUST (C1 = S1 = V1, confirmed three times): a done "선물 상자에서 하나 내밀기" slot loses its point

Production `f2c93f1` deals the weekly task `gift` ('선물 상자에서 하나 내밀기', target 1). This deploy removed it
(66c8110). `weekState` replaces an unknown slot with a new task at 0; only the other removed task, `days`, keeps its
earned point (`oldDone`, `week.kept`). So a production week at 5/5 with `gift` done drops to 4/5 (no claim button,
no dot) and the unclaimed weekly gift is not paid at the week change. Make a done `gift` slot count exactly like a
done `days` slot: in the same week (kept, shown done in the count, the claim and the dot) and at the week change
(`due`). A `gift` slot was done when its saved `n` reached its old target (1). The skeptics' one-line patch is a
starting point, not the end: also item 2.

The kept line under the list names only "사흘 들어오기". Make it true for either removed task or both, in plain
Korean (for example '목록에서 빠진 일도 이번 주엔 한 걸로 셌어.' or one line that names the task(s)). Nothing about
what the octopus feels; no symbols; run the font check.

### 2. SHOULD (S2, confirmed): `week.kept` can count the same removed task twice

A tab still on the old build takes in the repaired week (kept included) and its re-roll can deal `days` again; the
next repair adds the same three entry days a second time (kept 2), and the week-change `due` counts both an old
`days` slot and kept. Each removed task may count **at most once per week**, however many times a slot holding it
comes back. With item 1 there are two removed tasks, so remember which ones were counted (deploy 2 has not shipped:
the shape of `kept` may change, but keep reading a plain number written by test builds as "that many, ids unknown"
if that is simpler to reason about; say what you chose).

### 3. Nit (C2, the skeptic rated it nit): the import guard lasts for the whole life of the tab

`importSeen` drops any later write with a smaller `lastSeen`, forever; if the device clock goes back after an
import, a reset in another tab is dropped and then overwritten. The guard exists for a closed tab's last write
arriving milliseconds after the import. Limit it to a short window after the import measured with the monotonic
clock (`performance.now()`), as the skeptic tested (`confirm-C2/`). Keep scenario `X`'s import checks passing.

### 4. Nits, cheap and safe (fix each unless you find it is not)

- **V2:** harvesting an unknown-colour flower says '염료 1개를 얻었어' but the bag shows no dye for that colour. Do
  not claim a dye the player cannot see: keep the saved key (for a later build) but use a neutral toast for an
  unknown colour, e.g. '꽃을 거뒀어'.
- **V3 / P6:** at 320x568 (pixel font) the weekly claim button is half below the fold when the 살림 sheet opens with a
  gift waiting. Make it visible on open (scroll it into view, or another small layout change that does not move it
  on bigger screens).
- **C4:** `importJSON` reaches `save()` during its trial render (renderAll → renderBagChip → weekState) before its
  checks finish and before `lastSeen` is clipped. Make the trial render not write storage (the real save comes
  after the checks).
- **C5:** the toast and the sheet line say '지난주 선물' even when the paid week was several weeks ago. Make the words
  true for any past week (plain wording; font check).
- **C6:** the storage listener parses each record's JSON twice; parse once.
- **S4:** '전체 초기화' leaves the previous octopus's rest countdown in memory; clear it.
- **P4:** a tab left open past midnight keeps yesterday's rows in '오늘의 산책' until something re-renders; re-render
  the log (and the day greeting if that is how the day's rows are built) in the same day-change path that hands out
  the new day's gift.
- **C3:** `js/salon.js` normalize now takes the colour from the last colors line by `at`, which undoes the latest
  answer after the clock went back. Keep `octopus.color` when it is valid and equals the colour of some colors line;
  fall back to the last line only when it matches none (the hand-edited case that change was for). Check with
  `tools/test-salon.js`.

Leave alone (production does the same, or it is the owner's): P1, P2, P3, P5, S3, P7, V4, V5.

## Lanes

Another agent (lane **owner3**, tree `/home/user/ppolppol-fix-owner`) is finishing the upstairs follow-up: `restDown`,
`finalPose`, `syncRest`, `sleepNow`, `on.octUp` in `js/app.js`, scenario `Z` part 5 and checks `Q21` (RO-1, RO-2) in
`tools/smoke.js`. **Stay out of those functions and those checks**; put your weekly checks in their own block (for
example extend `Q` section 13, which already seeds a `gift` week) so the two merge cleanly.

## Rules

- Smallest change that is right. Match each file's style (dense; comments short, Korean, dated `11-13`, saying why).
- Every new or changed player-facing line: plain Korean, nothing about what the octopus feels or wants, no symbols;
  list them all in the report; run the font check (regenerate with the same tool without `--check` if stale and list
  the font files).

## Tests that fail without the fix

In the scenarios' style (seeded `localStorage`, the date hook, waits for a state, never a duration): item 1 (a
production week with `gift` done plus four others: 5/5, claim, dot, the line; the next Monday pays 12 shells and 2
seeds once), item 2 (the old-build re-deal: kept stays one point per removed task; the week change pays only when
five are really done), item 3 (a reset in another tab after the clock goes back is followed; the late closed-tab
write is still ignored), and one check per nit you fix where a check is cheap. Revert each fix alone in a scratch
copy and name the check that fails (keep the output). A fix with no failing check is not finished.

## Suites

`npm test`; the font check; `SMOKE_ONLY=Q` and `SMOKE_ONLY=X` until each passes three times in a row on the final
code (Q section 8, the two-tab week change, is known to fail now and then under load: if only it fails, run Q again
and say so); `SMOKE_ONLY=A` once; `SMOKE_ONLY=Y` once if you changed `js/salon.js`; `node tools/test-salon.js`.
Long runs in the background with a long timeout. The load rule in COMMON3.md applies (another agent runs browsers).
The disk is shared: keep copies few, in `/dev/shm`, and delete them. Put back every tracked evidence file you did
not mean to change.

## Report

For each item: what you found, what you changed (file:line, why), what you decided. The new checks and the mutation
table. Every new or changed player-facing line, exactly. Pictures (full paths): the 살림 sheet at 320x568 with a
gift waiting, and the kept line, before and after. Suite totals with the load note. What you saw and did not fix.
What you did not verify.
