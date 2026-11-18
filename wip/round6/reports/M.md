# Lane M report — meal logic and UI (round 6, 11-18)

## Conclusion

Lane M is done and pushed on `lane/m`. That covers the meal rules (`js/meal.js`), the dining flow in the app, the table / seat / call buttons, saves, the day change, two tabs and the docs.

**The flow has only run against a scene stub.** Lanes D and K2 are not merged, so the scene API was replaced by `tools/meal-stub-scene.js`. That stub draws nothing; it keeps state and records calls. The flow runs end to end against it:

> sit → call chip → saved answer → the octopus comes → silent '…' → toast with '데모 규칙' → saved meal → bites → effects → '식탁' rows → day change → eat alone → no call while it sleeps → two tabs → reduced motion → 2D

Test results:

| suite | result |
|---|---|
| `node tools/test-meal.js` | 134 / 0 |
| `node tools/test-brain.js` | 573 / 0 |
| `npm test` | passes |
| `SMOKE_ONLY=EAT` | 56 / 0 after the toast follow-up (55 / 0 three runs in a row before it; against the stub) |
| `SMOKE_ONLY=A,S,Y,J,O` | 451 passed, 0 assertion failures |
| `SMOKE_ONLY=Q` | passes |
| `python3 tools/subset-fonts.py --check` | `stale: none` |

The first A,S,Y,J,O,Q run was cut off by my own 30-minute timeout during Q (the 1 counted failure is that crash). Q then passed in a separate run.

The independent check found no `must` and 5 `should`; all 5 are fixed (see "Independent check").

**Not done (owner check):**
- Smoke EAT must be run again after D and K2 merge.
- The counter-blocked check only runs once K2's `openCook` line is in.

## Changes

### `js/meal.js` (new, global `MEAL`, pure, node-loadable)
- **Constants:** `DISHES`, `FX_NAME`, `P_EAT 0.6`, `FIRST_EAT`, `MINE_MS 60000`, `TAILS`, `TEXT` (every string of spec §9 plus two past-tense meal lines, see decisions).
- **Helpers:** `josa` (the same 받침 rule as `world.js nameJosa`), `fill`.
- **Kitchen message:** `normDish` checks the K2 `result` message (id, recipe, uint32 seed, plain look ≤ 2048 B of JSON, day).
- **`normalize(u)`:** drops only non-objects. A duplicate id keeps the eaten / asked entry. Unknown recipe, fx, by and `ate.oct` values are kept.
- **`canCall`:** reasons `no_dish`, `not_seated`, `away`, `asleep`, `busy`.
- **Answers:**
  - `demoAnswer`: the first call ever eats (rule `first`); after that `hashSeed('meal', dish, name, born)` < 0.6 eats. Only those four inputs.
  - `humanAnswer`: dev path.
  - `makeAsk`: one answer per dish, never re-rolled.
- **Meals:**
  - `eat`: takes an explicit dish id, so the dish being staged is eaten even if another tab put a new dish on the table.
  - `active`: the latest dish eaten today wins, separately for me and the octopus. An unknown fx gives none.
- **Words:** `rows`, `toastParts`, `sceneDesc`, `aria`.
- **Saves:** `merge` (two tabs) and `slim` (drops `seed` / `raw` older than 365 days; never `line`).
- There is no `request` / `readReply` (spec R11).

### `js/app.js`

**Meal block**, placed right before the stick section:
- `mealDish` and `mealBusy`, both also set on `window`.
- `mealTableSync` and `mealApply`.
- `mealOct` and `mealCallOK`.
- `CALL_SVG` and `mealUI` (the seat dot, the chip at whole device px, the table aria name, `#scene.oct-table` / `.meal-busy`).
- `mealSpots`.
- `mealTableTap`: sit, or eat without asking. If the octopus already sits there and this dish has a stored answer, it replays that answer instead.
- `mealCall`: one handler that runs `syncFromStore` → `canCall` → `octCanCome` → `makeAsk` → saves once if the answer is new → stages.
- `mealStage`:
  > `octToTable` → '…' with `silent` → think → ponder → toast → eat / watch → 0.5 s
- `mealEatRun`: saves first, then the decision row, then the bites, all raced against timers.
- `mealFinish`: aura bloom and the meal row.
- `mealAbort`, `mealEnd`, `mealLeave`, `mealDrop`.
- `mealTick`: a 300 ms watchdog that also runs on visibility change.
  - During staging it aborts or finishes on scene loss, leaving the room, a walk, a hidden tab, standing up, or after 30 s.
  - Outside staging, the seated octopus walks out when I stand up and leaves at once when the room changes.
- `mealRoom`, the row DOM helpers, `mealsOn`, `slimMeals`, `mealInit`.

**Touch points:**
- `adoptRemote`: `MEAL.merge` and its save condition.
- The 60-s `timeTimer` callback: `mealApply`.
- `bubble`: an `octAtTable()` exception.
- `openMachine`: the guard line.
- `sceneDescText`: the play branch.
- `ROOM_SPOT`: `table`.
- The `resetRoomUI` hide list.
- `bindRooms`: three `on(...)` lines.
- `WHO_LINE`.
- `userState`: `MEAL.normalize`.
- `dayRows`, `renderLog`, `renderDiary`.
- `slimJSON`.
- Boot: `mealInit`.

**Deferred while `octAtTable()`:**
- `scheduleWander` (gate).
- `scheduleThink` (no thought bubbles at the table).
- `syncRest` (returns early; `mealLeave` calls it again once the octopus is home).
- `lieDown` (retries every 700 ms).
- `sleepNow` (retries every 700 ms, so the 6-s guard cannot fire it at the table).
- `selfWake` (through the `scheduleDreamLabel` condition).
- `windowTap`.
- `pet`.
- `importJSON` / `resetAll` → `octInitial`: `mealDrop` unmounts the octopus first.

**Not guarded, and why:**
- `octInitial` at boot: the octopus cannot be seated at boot.
- `restDown` and `on.octUp`: loft only.
- Ceremonies and `finalPose`: the octopus is away.
- `invite`: it leaves the play room first (`backToOctRoom`), which unmounts the octopus at once.

### `index.html`
- `#btn-table` (class `scene-spot`), `#btn-seat` (`sofa-dot meal-seat`) and `#btn-call` (`meal-call`) right after `#btn-cook`. They have no `title` and no text.
- `<script src="js/meal.js">` right after `js/salon.js`.

### `css/style.css` (appended at the end)
- Chip: paper (inset border = 1 art px), art layer, 2 px press, focus ring, hidden under intro and furniture mode.
- `#scene.meal-busy` hides the three buttons.
- `#scene[data-view="play"].oct-table #oct { visibility: visible; }`
- `.meal-seat` gets `pointer-events: auto`.

### Tests
- `tools/test-meal.js` (new, node).
- `tools/test-brain.js`: `js/meal.js` added to the honesty scan. No allow-list entries were needed.
- `tools/smoke.js`: the new `scenarioEat`, one `['EAT', …]` line (inserted before the CAM line, so that line is untouched), and scenario O's `WHO_LINE` pin.
- `tools/meal-stub-scene.js` (new): attaches only when the scene has no `tableInfo`.

### Docs
- `docs/MEAL.md` (new): the design of record, including the model contract, which lives only there this round.
- `docs/CORE_LOOP_V2.md`: a note that the table decision is now the call (→ MEAL.md).
- `docs/DESIGN.md` is unchanged. It quotes an older '누가 고르나' line, not the salon line.

## Decisions
1. **Past days get a past-tense meal row.** In the album diary a meal row reads '… 그날 하루 {효과}{이/가} 따라다녔어.' (together: '그날 하루 둘 다 …'). The spec only gives '오늘 하루 … 따라다녀', which is untrue the day after (independent check S3). Today's rows are unchanged. **Owner check:** this wording is my addition.
2. **Eating alone also blocks.** Eating alone sets `mealBusy()` during its bites, like a call. The counter and arcade do nothing for those ~3 s, so no overlay opens over the bites.
3. **A stored answer is replayed instead of eaten alone.** If the octopus sits there from an earlier meal and the dish on the table already has a stored answer, a table tap replays that answer without a walk-in. Otherwise `ate.oct: false` would print a decision row that never played out.
4. **Fast-finish clears the plate.** After the meal is saved, a fast-finish (hidden tab, standing up, leaving) calls `setTableDish(null)`. That removes the plate along with the pieces. A normal finish leaves the empty plate to D.
5. **Dev answers are tab-only.** `APP.mealNext('eat'|'watch'|'stop'|'none')` works only in a `?dev=1` tab. There are no panel chips. A 'stop' answer leaves without eating and draws no row.
6. **Chip art.** 16×16: a body-colour head, ink outline and eyes, a light highlight, four leg nubs, and two amber '( )' arcs at the top corners. The chip sits centred 48 px above `tableSpot.call`, clamped 8 px inside the scene and below the status bar.
7. **The seat dot is tappable itself.** Unlike `.sofa-dot`, it gets `pointer-events: auto`, so it works whether or not D forwards seat taps.
   *Lead, after the merge (verification dining-1):* withdrawn — the dot's 44 px box took taps meant for the counter (turned 270°) and the arcade
   (180°). `#btn-seat` now takes no pointer events, like `.sofa-dot`; D's first-visible-surface pick sends taps on my sofa and the table to 'table'.
8. **Merge unions this tab's own records.** `MEAL.merge` unions all of this tab's meal records when the octopus is the same (records are never deleted). `mine` is used only for the table rule.

## Player-facing lines and aria names (before → after)
- **`WHO_LINE`:** '…고른 이는 포스터와 쪽지 뒷면, 미용실 줄에 적혀.' → '…미용실 · 식탁 줄에 적혀.'
- **New, toast and row 1:**
  - '{이름}도 같이 먹기로 했어.'
  - '{이름}{은/는} 보기만 하기로 했어.'
  - Tail: '데모 규칙' / '모델' / '사람이 정함'.
  - '대답이 없었어.' (no tail).
  - '{이름}{은/는} 다락으로 돌아가기로 했어.' (model path, not reachable this round).
- **New, row 2:**
  - '{요리}{을/를} 먹었어. 오늘 하루 {효과}{이/가} 따라다녀.'
  - '{요리}{을/를} 같이 먹었어. 오늘 하루 둘 다 {효과}{이/가} 따라다녀.'
  - The past-tense pair from decision 1.
- **Scene description (play room, 3D):**
  - '식탁에 {요리}{이/가} 있어.'
  - '{이름}{은/는} 식탁 맞은편에 앉아 있어.' (replaces '문어는 다락방에 있어.' while it sits)
  - '{효과}{이/가} 따라다녀.'
- **Aria names:**
  - `#btn-table`: '식탁' / '식탁, 해초전' / '해초전 먹기'.
  - `#btn-seat`: '식탁에 앉기'.
  - `#btn-call`: '{이름} 부르기'.

## Checks added
`tools/test-meal.js`:
- Exact strings; particles for 뚜루 / 문어 / 곰 and for latin and digit names.
- First call → eat; 55–65 % eat over 1000 ids (measured: inside the bound); independent of recipe; deterministic; the only inputs are dish, name, born and the zero count.
- One answer per dish; `canCall`; active effects with replace, the day change, and `ate.oct` true / false / null.
- Rows only for eaten entries; no decision row when `ate.oct === null`; model lines verbatim; unknown dishes hidden; past-tense rows.
- normalize (unknown values kept, duplicate keeps the eaten entry); merge cases; slim keeps lines; no `request` / `readReply`.

Smoke EAT, as in brief task 7, with these changes:
- The kitchen result is injected through `APP.mealDish`.
- The two-tab storage events are dispatched by hand, because headless storage events were late or lost.
- It adds whole-device-px checks for the chip at @2 and @2.625.

## Needs another lane merged
- **D:** run EAT against the real scene. The booth is visible, the auras are drawn, and the bubble is placed by `octScreenPos`. The real `octCanCome`, walk-in, bites and the sleep / attic-anchor safety net take over from the stub. The stub-only `calls` checks are skipped automatically.
- **K2:** the counter-blocked check activates by itself once `openCook` has the `mealBusy` line. The real `result` message → `cookMsg` → `mealDish`, and the appear beat on overlay close.

## For the lead
Add `node tools/test-meal.js` to `npm test` and CI. Smoke EAT is in the scenario list.

## Independent check (one round)
No `must`. Five `should`, all fixed:
- **S1:** the EAT check read yesterday's rows. It now filters to today's section.
- **S2:** an import while the octopus sat at the table put it to sleep there. Fixed with `mealDrop` before `octInitial`.
- **S3:** past-day rows said '오늘 하루'. They now use the past-tense wording.
- **S4:** the chip was off whole device px at 2.625. Positions are now rounded on screen coordinates (the scene's 2 px border is 5.25 dev px).
- **S5:** normalize could drop a duplicate eaten entry and rewrote unknown `ate.oct` values. Both fixed.

It also noted that the scene description was stale during the think beat; that is fixed too.

## Follow-up from the lead (toast tail)
In the answer toast the tail used to wrap in the middle ('… 데모' / '규칙').
- **Fix:** `#toast .lby` is now `display: block; white-space: nowrap` in the tail colour (`--muted` in the pixel theme, `--dim` on the dark system toast). The tail sits on its own line, whole, at the toast's own font size (never smaller).
- **Probe:** eat and watch × tails '데모 규칙' and '사람이 정함' × names '뚜루' and '가나다라마바사아' (8 characters) × 360×740@2, 412×915@2.625 and 320×568@2. All 24 cases: the tail is one client rect, has the same font size as the toast, and stays inside the toast.
- '모델' cannot show this round (no model path); it uses the same rule.
- **Smoke EAT:** new check that the tail is one client rect, same font size, distinct colour. EAT 56 / 0, `npm test` passes.
- Shots 3 and 4 refreshed.

## Known limits / not verified
- **The 2.625 chip is not perfectly crisp.** At @2.625 a CSS box can only land on 1/64 CSS px (≈ 0.04 dev px). The 80-dev-px art comes out as 79.98 dev px, and its right column shows a faint soft edge (shot 7). @2 and @3 are exact. A canvas-drawn chip would fix it if the owner minds.
- **Not verified:** real 3D visuals (booth, octopus seated, bubble position, aura drawing). Those are D's, and my shots show the stub's invisible positions.
- **Not verified:** keyboard-only play beyond focus returning to `#btn-table`.

## Shots (`wip/round6/shots/M/`)
Taken against the stub scene, so there is no booth and no octopus drawn:
1. Seat dot.
2. Call chip, 360×740@2.
3. Eat toast.
4. Watch toast (데모 규칙), 412×915@2.625.
5. After the meal.
6. Day-log rows.
7. Chip, 412×915@2.625.
8. Chip, 320×568@2.

The next-day check is in smoke EAT (both auras null; the scene description loses the effect line).
