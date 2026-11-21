# Lane M — meal logic and UI: `js/meal.js`, the dining flow in the app, table / seat / call buttons, saves (branch `lane/m`)

Read `wip/round6/briefs/COMMON.md` first, then `wip/round6/eat-spec.md` §0 (R9, R11, R17, R19 above all), §1, §4.1 (its last
paragraph: what D returns), **§4.3–§4.5**, **§5 (lifetime)**, **§6**, **§9**,
§10.2, §10.3 (the scene API you call), §11 (M), §13 (M). Then read how the salon does the same things: `js/salon.js`
(`demoAnswer`, `makeAsk`, `commit`, `rows`, `merge`, `normalize`; `request` / `readReply` only as the model contract's
pattern — this round it goes into `docs/MEAL.md`, not code) and `js/app.js` (`openSalon`,
`salonAsk`, `salonStage`, `salonRowDOM`, `mineAsks`, `adoptRemote`, `syncFromStore`, `slimAsks`), and the gift box
(`giftOffer`: one answer per item, saved before staging, think bubble, '(데모 규칙이 고름)').

## Owner's words (docs/OWNER_DECISIONS.md, 11-18)

> 문어와 같이 먹기: **문어가 그때 고른다** — 미용실처럼 모델이 붙으면 모델, 지금은 데모 규칙. 누가 골랐는지 표시하고, '싫어서'
> 같은 감정 말은 쓰지 않는다. 안 먹으면 옆에 앉아만 있고, 먹으면 문어에게도 효과. · 효과 시간: **그날 하루** — 날이 바뀌면
> 사라지고, 그 사이 다른 요리를 먹으면 그 효과로 바뀐다.

## Files you own

- `js/meal.js` (new, DOM-free, global `MEAL`, node-testable like `js/salon.js`), `tools/test-meal.js` (new), `docs/MEAL.md` (new)
- `js/app.js`: a new meal block placed right before the `stick` section, plus these touch points only: `adoptRemote` (one
  merge call next to `SALON.merge` and the save condition), the 60-s `timeTimer` callback (`mealApply()`), `bubble()` (one
  `octAtTable()` exception in its play-room guard), the octopus's autonomous paths deferred while it sits at the table
  (`scheduleWander` gate `|| octAtTable`, `scheduleThink`, `syncRest` / `armRest` / `restTick` → `lieDown` / `sleepNow` /
  `restDown`, `selfWake`, and any other `octPlace` / `walkTo` caller — task 2), `openMachine` (one `mealBusy()` guard line at
  the top), `sceneDescText` (play branch), `ROOM_SPOT` (`table: 'btn-table'`), the `resetRoomUI` hide list (`btn-table`,
  `btn-seat`, `btn-call`), `bindRooms` (three new `on(...)` lines), `WHO_LINE` (adds '· 식탁'), boot and play-room entry calls
  (`mealApply()`, `setTableDish`), `userState()` (one `MEAL.normalize(u)` call), `dayRows` and its two callers `renderLog` /
  `renderDiary` (meal rows interleaved by time exactly like the salon asks), and `slimJSON` (the meal slimming next to
  `slimAsks`)
- `index.html`: `#btn-table`, `#btn-seat`, `#btn-call` right after `#btn-cook` (no `title` attributes); `<script
  src="js/meal.js">` right after `js/salon.js`
- `css/style.css`: your rules appended at the end of the file — including the override that shows `#oct` (its `#oct-label`
  and `#oct-bubble`) in the play view while the octopus sits at the table (`css/style.css` ~1139 hides it there today)
- `tools/smoke.js`: new `scenarioEat` + one `['EAT', …]` line in the scenario list + scenario O's exact `WHO_LINE` pin (~2855,
  that one line; the regex checks in A / S still match); `tools/test-brain.js`: add `js/meal.js` to the honesty scan list
- `docs/CORE_LOOP_V2.md` (a short note: the table decision is now the meal call → `docs/MEAL.md`), `docs/DESIGN.md` if it quotes
  the '누가 고르나' line

Not yours: `js/scene3d.js` (lane D provides the API), the kitchen (`cookMsg`/`openCook`/`cookPot` are K2's; you only provide
`mealDish` and `mealBusy`), `js/runner.js`. The booth's size and place are D's (spec §4.1) — never use booth coordinates:
buttons come from `on.tableSpot` and the `'table'` hotspot, tests read `scene.tableInfo().geom`.

## Tasks

1. **`js/meal.js`** (pure; no DOM, storage, timers or `Math.random`; FNV-1a + mulberry32 like `js/salon.js`):
   - `DISHES = { jeon: { name: '해초전', fx: 'sparkle' }, jumeokbap: { name: '주먹밥', fx: 'star' }, kkochi: { name: '과일 꼬치',
     fx: 'petal' } }`, `FX_NAME = { sparkle: '반짝이', star: '별', petal: '꽃잎' }`, `P_EAT = 0.6`, `FIRST_EAT = true`,
     `MINE_MS = 60000`, `TAILS = { 'demo-rules': '데모 규칙', model: '모델', human: '사람이 정함' }`, `TEXT` (every string of
     spec §9), `josa(word, particle)` (받침 rule as `js/world.js` `nameJosa`).
   - `normDish(d)` (validates the kitchen `result` message: id `/^ck_[0-9a-z]{1,13}$/`, recipe ASCII ≤ 16, seed uint32, look a
     plain object with JSON ≤ 2048 bytes, day `YYYY-MM-DD` or '') → `{ v: 1, id, recipe, seed, look, day }` or null.
   - `normalize(u)` for `u.table` and `u.meals` (spec §6; keep unknown values, drop only non-objects; `ate.oct` may be
     `true`, `false` or `null`).
   - `canCall(state, today, oct)` → `{ ok, reason }` (`no_dish`, `not_seated`, `away`, `asleep`, `busy`). The post-walk awake
     window counts as awake (spec §4.4); a sleeping or napping octopus is never woken by a call; sitting at the table after a
     meal counts as home (R19).
   - `demoAnswer({ dish, name, born, asksBefore })` exactly as spec §4.4 (first ever → eat, rule 'first'; else seeded 0.6;
     inputs only those four); `humanAnswer(action)` for the dev path (`DEV_EXPLICIT` tab only, like the salon).
   - `makeAsk(state, { at, today, dish, answer })` → the meal entry with `ask` (returns the stored answer if the dish already
     has one — never re-rolled); `eat(state, { at, today, oct })` → sets `ate { at, date, me: true, oct, fx }` (`oct`: true =
     sat and ate, false = sat and watched, null = not at the table), clears `table` when it is that dish; `active(state,
     today)` → `{ me, oct }` derived from entries eaten today (latest wins per side; the octopus only from `ate.oct === true`).
   - `rows(entry, name)` / `toastParts(entry, name)` (house voice, tail only when someone chose: demo-rules / model / human;
     fallback = '대답이 없었어.' with no tail). `rows` returns nothing for an entry without `ate`, and the decision row only
     when `ate.oct !== null` (the octopus sat at that meal) — then the meal row (spec §6). `rows` still knows every `by` value,
     so a later build's model answers display honestly. `sceneDesc(state, today, name, inTable)`.
   - `merge(S, R, mine, now)` → `{ state, mine, changed }` (spec §6: union by id, `ate` beats none, then `ask`; this tab's newer
     table survives unless eaten; a table whose dish is eaten anywhere becomes null; drop `mine` older than `MINE_MS`; another
     octopus (`born` differs) → mine dropped).
   - `slim(meals, today)` (save copy only: drop `seed` / `raw` older than 365 days, never `line`).
   - **No model-path code this round** (spec R11): no `request` / `readReply` — nothing would call them. The contract
     (payload ≤ 400 B, menu `['eat', 'watch', 'stop']`, 8 s wait, `action` required / unknown → fallback, `line` kept raw,
     `expr` in `idle | happy | curious | calm`) is written in `docs/MEAL.md` only.
2. **App flow** (spec §4.3) — one state object `mealRun` (`stage`: walking · seated · coming · thinking · answer · eating ·
   after) and these functions in the meal block:
   - `mealDish(d)` (called by K2's `cookMsg`): `normDish` → `S.user.table = { …, at: Date.now() }` → `save()` once →
     remember in `mineMeals`. The appear beat plays when `#cook-overlay` closes (`close` listener added in your init) if the
     table changed while it was open; on entering the play room the dish is placed without the beat.
   - `mealBusy()` (global): true from the call press until the last bite. K2's `openCook` and your `openMachine` start with
     `if (typeof mealBusy === 'function' && mealBusy()) return false;` — the scene owns `#btn-cook` / `#btn-machine`'s
     `hidden` every frame, so they stay visible but do nothing while the call stages (spec R19, §4.3 Blocking).
   - `#btn-table` / `#btn-seat` → not seated: `scene.playerSitTable()`; seated with a dish and no staging: eat without asking
     (`ate.oct: null` — or `false` if the octopus is still sitting there from an earlier meal; it gets no effect either way).
   - `#btn-call` (one synchronous handler) → `syncFromStore()` → `canCall` → `scene.octCanCome()` — either says no: save
     nothing, hide the chip → `makeAsk` (save once if new) → `scene.octToTable()` (already seated → resolves at once, no
     walk-in) → think bubble '…' (1.2 s, `bubble('…', 1200, 'think', { silent: true })` — R17: no dining sound) +
     `octTableBeat('think')` → `'ponder'` → toast with the tail → `'eat'` / `'watch'` → 0.5 s → meal.
   - **The bubble must show at the table**: today `bubble()` returns early in a room (`if (text && inPlay() && !octWithMe())
     return;`) and `css/style.css` ~1139 hides `#oct` (which holds `#oct-label` and `#oct-bubble`) in the play view. Add an
     `octAtTable()` exception to that guard, set a class on `#scene` while the octopus sits (e.g. `oct-table`), and append
     `#scene[data-view="play"].oct-table #oct { visibility: visible; }` in your CSS region (D lifts the scene's own overlay
     hide).
   - Meal: `MEAL.eat` + `save()` once **before** the bites (spec R9) → the '식탁' decision row (only when the octopus sits at
     this meal) → bites (`mealBite`: alone me ×4; together me, oct, me, oct) → `setAura('me', fx, { bloom: true })` (+ octopus
     if it ate) → meal row → stage 'after'.
   - After: the octopus stays seated while I sit. A new dish cooked from the seat lands on the table; the chip shows above the
     seated octopus (`tableSpot.call` is reported whether or not it is there — you decide with `canCall`) and asks about the
     new dish without a walk-in. When I stand up or leave the room, `scene.octLeaveTable()` (instant when the room changes).
     Abort / finish rules of spec §4.3 for standing up, leaving, a walk invitation (departure), a hidden tab, scene loss. Use
     `scene.tableInfo()` / the `tableSpot` event to notice standing up.
   - `mealApply()` = `MEAL.active` → `setAura` both; call it on boot, after every meal save, in `takeRemote` after the merge,
     in the 60-s `timeTimer` callback and when the tab becomes visible. The day change needs nothing else (derived).
   - **Nothing autonomous moves the octopus while it sits** (spec §4.5): while `octAtTable()`, defer — so they run once it is
     home — `scheduleWander` (skip), `scheduleThink` (no thought bubbles at the table; your bubble exception would otherwise
     let them through), `syncRest` / `armRest` / `restTick` → `lieDown` → `sleepNow` → `restDown` / `octPlace('blanket')` (a
     rest that ends in another tab's storage event or on a visibility change must not jump it to the attic blanket inside the
     play group; it never falls asleep at the table), `selfWake`, and every other `octPlace` / `walkTo` caller you find
     (window tap, pet, `octInitial`, two-tab adoption). The departure ceremony is the exception: the scene unmounts it first.
     D's scene also holds attic-anchor moves while it sits (a safety net), but do not rely on it. List every deferred path in
     your report.
3. **Buttons** (zero visible text, **no `title` attribute**; spec §9 aria names): `#btn-table` (`scene-spot`, positioned by
   the scene's hotspot `'table'`), `#btn-seat` (the `sofa-dot` look: 10 px dot, 44 px hit, at `tableSpot.seat`), `#btn-call`
   (a 40×40 paper chip with a 44 px hit, a 16×16 inline-SVG octopus head in the current body colour with ink eyes and two
   small amber call arcs, at `n = floor(2·dpr)` dev px per px; centred above `tableSpot.call`, clamped 8 px inside the
   scene, whole device px; 2 px press translate; shown only when `canCall` is ok, `scene.octCanCome()` is true and no
   staging runs). Reduced motion: no chip movement. Keyboard: all three are real buttons in the scene's tab order; focus
   returns sensibly after staging.
4. **Words** (spec §9): the decision toast `[line, ' ', <span class="lby">tail</span>]` at the answer beat; the '식탁' rows in
   the day log, rendered from `S.user.meals` the same way the salon rows are rendered from `S.salon.asks` (so they come back
   after a reload and in the album diary for past days) — **only for eaten entries, the decision row only when `ate.oct !==
   null`** (spec §6: an aborted visit leaves no decision row); `sceneDescText` play branch; `WHO_LINE` '…미용실 · 식탁 줄에
   적혀.' (and smoke O's exact pin of it); aria names. Face stays `idle` everywhere (no `expressRow` other than idle). Run the
   font subset check.
5. **Saves / two tabs** (spec §6): `userState()` calls `MEAL.normalize(u)`; `adoptRemote` calls `MEAL.merge` next to
   `SALON.merge` (and saves when `changed`); `syncFromStore()` before the call press; the save copy uses `MEAL.slim` the way
   `slimAsks` is used; export / import / reset carry `S.user` as today.
6. **2D fallback / no WebGL**: none of the dining buttons show, `mealDish` still records the dish, no errors.
7. **Tests**: `tools/test-meal.js` (spec §11 M — exact strings, particles for names with and without 받침 ('뚜루', '문어', '곰'),
   first → eat, 55–65 % eat over 1000 ids, independent of recipe, deterministic, one answer per dish, `canCall`, active effects
   with replace and day change, `ate.oct` true / false / null, rows only for eaten entries and no decision row for `ate.oct
   === null`, merge cases, slim keeps lines); `tools/test-brain.js` scans `js/meal.js` (no allow-list entries needed for
   '-기로 했어' lines — if the scan flags one, change the line, not the scan); smoke **O**'s `WHO_LINE` pin updated; smoke
   **EAT**: seed a save with a waiting 해초전 → play room → booth visible → tap the table → seated → the call chip with its aria
   name → tap → the octopus comes, sits; **the think bubble is visible above it and makes no sound** → answers → toast with
   '데모 규칙' → rows → bites → auras on both (first call = eat) → `S.user.table` null and one `S.user.meals` entry with `ask` and
   `ate` → **the counter and the arcade do nothing during the staging** → **a second dish cooked from the seat: the chip shows
   above the seated octopus and asks without a walk-in** → reload: auras back → `__ppolTest.today` + 1 day → tick → auras
   gone, records kept → a dish eaten alone (meal row only) → **the octopus asleep: no chip, nothing saved** → **another tab
   finishes a rest during a meal, then this tab is hidden and shown: the octopus never lands on an attic anchor inside the
   play room and naps only once home** → two tabs (the other tab shows the auras after the storage event) → reduced motion
   run → `?scene=2d` with a waiting dish: no dining UI, no errors. Until D is merged, test the flow against a stub scene
   object in node and run EAT after the lead merges D.
8. **Docs**: `docs/MEAL.md` (the design of record: flow, beats, the demo rule and why it ignores the dish kind, **the model
   contract — the only place it lives this round**, data shapes, rows from eaten entries, two-tab merge, words, honesty), the
   `CORE_LOOP_V2` note.

## Acceptance

- `node tools/test-meal.js`, `node tools/test-brain.js`, `npm test` pass; `SMOKE_ONLY=EAT node tools/smoke.js` passes once D
  and K2 are merged (or the lead runs it after the merges); `SMOKE_ONLY=A,S,Y,J,Q,O node tools/smoke.js` still pass;
  `python3 tools/subset-fonts.py --check` is `stale: none`.
- At 360x740 @2, 412x915 @2.625 and 320x568 @2: the buttons are pictures only, ≥ 44 px, crisp, never over the status bar; the
  answer toast shows who decided; no feeling words; the octopus's face is idle; the effect follows for the rest of the day and
  is gone the next day; a reload never re-asks and never loses a meal.
- Shots (≤ 8): the seat dot; the call chip; the answer toast (eat and watch); the day-log rows; after the meal; next day.

## Do not touch

`js/scene3d.js`, the kitchen files, `cookMsg` / `openCook` / `cookPot` (K2), `js/salon.js`, `package.json`, CI. No booth
coordinates anywhere in your code or tests (read them from `tableInfo().geom`).
