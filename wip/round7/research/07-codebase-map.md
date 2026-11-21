# 07 — Codebase map: the kitchen, the table, and their tests (round 7 research)

Scope: code reading only (no web research, 0 URLs). Everything below was read in this checkout on 2026-11-21.

**Line references are `file:line` in the committed files at `2ed1134`** (= `f17d1df` for all code; the newer commit adds
only `wip/round7` documents). To read a cited line whatever the working tree looks like:
`git show 2ed1134:js/app.js | sed -n '4101,4133p'`.
**The working tree is moving while lanes work.** During this research a merge (`f17d1df`) added 35 lines to
`js/scene3d.js`, and after it the lead inserted empty lane slots (`[7-T]`, `[7-P]`, ...) as uncommitted edits in
`js/app.js` (near the end, after every line cited here), `js/scene3d.js` (after line 34: +4; near 5524: +16; near 6932:
+13), `index.html` (after line 208: +17; after 369: +17 more; after 437: +17 more), `css/style.css` (after 1776) and
`tools/smoke.js` (after 8070). So in the working tree my `js/scene3d.js` numbers are 4 too small between lines 35 and
5523, and `index.html` numbers after 208 are 17 (or 34) too small. When in doubt search by the function name.

What "(unverified)" means here: I did not open that part of the file; the claim comes from a header comment, a document
or a grep hit. Section 10 lists exactly what was and was not opened.

---

## 0. Findings that change the build (read this first)

Written before the lane briefs existed; 0b then checks the briefs against these facts.

1. **A recipe cannot repeat a step kind today without losing data.** `lookOf` merges every step's look into one flat
   object by key (`js/cook.js:674-679`), and `normLook` / `validLook` / `defaultLook` map look keys by *kind*, not by
   step index (`js/cook.js:819-841`, `:737-751`). Two `tap` steps both write `dents`; the later one overwrites the earlier.
   "Finer steps like real cooking" (chop, chop again, stir, season, flip ...) needs a new look shape (per-step, or
   step-named keys) before any recipe gets longer. The result whitelist in the node test pins the six keys
   `v, dents, band, cuts, offs, plate` (`tools/test-cook.js:607-608`).
2. **Every number in `TUNE` is hashed into every saved pot, and the hash is pinned in five places.** `TUNE_HASH =
   hash32(JSON.stringify(TUNE))` (`js/cook.js:185`) = 2827089308, pinned in `tools/test-cook.js:37` and `:590`,
   `tools/test-cook-dishes.js:26-29` (plus the two derived hashes 1403436335 and 3381042548), `js/app.js:4162`
   (`COOK_TUNES`) and `tools/smoke.js:7667`. New step kinds must keep their numbers **outside** `TUNE` (the `TUNE_R`
   pattern, `js/cook.js:177-181`) or all of these change and every player's half-made dish moves to `potOld`.
3. **Rewriting the three recipes in place costs almost every kitchen test; adding beside them costs none.** About
   1,300 dynamic assertions drive `jeon`, `jumeokbap` and `kkochi` step by step (`jeon` = tap, flip, slice is asserted
   in `tools/test-cook.js:38-41`, and a "golden" pot written by the `ada2967` build must still resume,
   `tools/test-cook-dishes.js:100-110`). Section 8, case ii lists what goes. The lane brief (K.md) rewrites in place
   and rewrites the suites; that is a choice, but note the cheap alternative the code offers: `RECIPES` is a list
   looked up by id (`js/cook.js:235`), so the old three can stay under legacy ids that the book never offers. Then
   the old suites keep guarding the engine (clock, pointers, slides, saving, layout) with an id rename instead of a
   rewrite, old notebook lines keep their painters, and new tests cover only the new kinds and dishes.
   (Counts: 263 + 106 + 250 + 134 ran here in node; 432, 217, 205 and 33 for the four browser suites are the numbers
   in the round-6 lane reports, not re-run.)
4. **The FOOD palette is full.** `COOK_ART.put` silently ignores any colour that is not one of the 46 Apollo colours or
   the 24 FOOD colours (`js/cook-art.js:222-226`, FOOD at `:128-138`; I ran `COOK_ART.FOOD.length` = 24), and the node
   test asserts `food.length <= 24` (`tools/test-cook.js:843`). "Make the food look like food" with new hues means
   raising that bound and the "Apollo + FOOD only" checks on purpose, not by accident (a wrong colour paints nothing
   and throws nothing). `SPRITES.md` keeps lane A's sprites to the Apollo colours, which stays inside every palette
   test; sprites are drawn with `blit`, which copies any bytes (`js/cook-art.js:253-264`), so only the tests would
   notice an off-palette pixel.
5. **Removing the step strip is small.** It is built, sized, placed and updated in 8 places in `js/cook.js` and 6 CSS
   lines (section 3.3 lists every line). Only 6 test sites touch `.ck-strip`
   (`tools/test-cook-live.js:172, 584, 1129-1144, 1169, 1335-1336`; `tools/test-cook-stickers-live.js:500` tolerates
   its absence). Keep `LAY.HUD = 64` (`js/cook.js:922`): the close chip still needs that row, and every pinned layout
   number (k, W, H, ox, oy, hudB, chipTop at seven sizes, `tools/test-cook-live.js:30-37`) depends on it.
6. **"again" is used by about 25 assertions, mostly as a way to start a second dish.** Every browser test of the
   result chip opens `cook.html` standalone (no table exists there). The lane brief removes `again` everywhere; then
   the sites in section 8, case iv change. If instead the end buttons appeared only when the host passes a callback
   (as `opts.onResult` is passed, `js/cook.js:1848`), standalone would keep `again` and none of them would break.
7. **The dish is already on the table record before the plate is shown.** `result` is posted when the *last step*
   finishes (`onStepEnd` -> `finish()`, `js/cook.js:1198`, `:1211-1219`), 400 ms (1000 ms after a flip) *before* the
   reveal. `mealDish` writes `S.user.table` at once (`js/app.js:4286-4296`); the 3D dish pops onto the table in the
   `close` listener of `#cook-overlay` registered at boot (`js/app.js:4570`). A carry animation has to suppress that
   listener's `mealTableSync(true)` or the dish appears on the table before the character has moved.
8. **Nothing in the scene can carry.** The player API is: `playerWalkTo(anchor)` for door anchors only
   (`js/scene3d.js:3176`), `playerSitTable()` (`:4194`), `playerStandTable()` (`:4206`), `setPlayerInput` (`:2918`).
   The general walker `plWalkTo(to, face)` (`:3140`) is internal. There is no counter stand spot, no hold pose, no
   held-dish mesh, and the kitchen opens without the character walking to the counter at all (`js/app.js:4255`).
   The only "carry" in the scene is the octopus's poster (`js/scene3d.js:2331`, `:3421`).
9. **`plWalkTo` never resolves when a walk is cancelled** (stick push, another walk). The code says so itself (the
   Korean comment at `js/scene3d.js:3182`) and shows the fix pattern (`wleg`, `:3186`).
   Any "carry to the table" promise chain must use that pattern or the dish stays in the hands forever.
10. **The meal watchdog would abort a serving run.** `mealTick` (every 300 ms) aborts any staging run whose stage is not
    `'coming'` when the player is not seated (`js/app.js:4525`). A new `'serving'` stage needs an exemption there, and
    it needs `mealRun.busy` so that `mealBusy()` blocks the counter and the arcade during the walk (`js/app.js:4281`,
    `:4102`, `:4048`).
11. **The call must reuse `mealCall`** (`js/app.js:4390-4405`). It already re-reads the store, checks
    `MEAL.canCall` (needs a dish, a *seated* player, the octopus home, awake and not busy, `js/meal.js:191-199`) and
    the scene's `octCanCome()` (`js/scene3d.js:4247-4252`), saves the answer once per dish and labels who decided
    ("demo rule" tail). So the order is fixed: close -> carry -> sit -> *then* call. If the octopus cannot come the
    honest outcome already exists: nothing is saved, the player sits with the dish, the call chip appears later when
    `mealCallOK()` turns true (`js/app.js:4322-4326`, polled by `mealTick`), and a tap on the table eats alone.
12. **In the 2D fallback the kitchen opens but there is no table.** `js/scene2d.js:170` has a `counter` spot and no
    table API; `mealDish` still records the dish (`js/app.js:4286-4296`, smoke EAT `tools/smoke.js:8068`). The host must
    tell the kitchen whether serving is possible (a field on `open`), or the serve chip lies.
13. **Recipes are listed in eight places.** A new dish that is only added to `js/cook.js` shows on the table as a
    covered plate (`js/scene3d.js:4130-4132`), gets no meal row and no day effect (`js/meal.js:29-33`, `:320-321`,
    `:276`), has no tray chip, and cannot resume from the counter (`COOK_TUNES`, `js/app.js:4162`). Section 5.3 has the
    full list.
14. **Recorded sounds for new step kinds already ship and are unused:** `stir` (3 variants), `simmer` (loop),
    `clink`, `lift`, `back`, plus `place` (used by the skewer only). They are in `foley/manifest.json` `map.cook` and
    `foley/cook/` and `js/audio.js` handles them (`:1099-1113`); `js/cook.js` never sends them
    (`docs/COOK_PROTO.md:271`, `:419`). The sticker rules already know `stir`, `simmer`, `place`, `serve`, `eat`
    (`js/cook-stickers.js:261-265`).

### 0b. The lane briefs versus the code (K.md, T.md, COMMON.md were written while this map was in progress)

I skimmed the three briefs after they appeared (12:24 to 12:31 UTC). The plan there: the book is the frame's first
screen, `jeon` and the other dishes are rewritten with five or six steps and six new kinds (`stir pour drag rub swipe
bake`), the strip goes, two end buttons post a new `serve { id, mode }` message, lane T carries the dish and calls the
octopus. These code facts bear directly on that plan:

**For lane K (kitchen)**

1. **The planned recipes repeat kinds inside one dish** (`jeon`: `slice` to chop, later `slice` '+'; `jumeokbap`: `drag`
   twice). That is exactly the look collision of finding 1. Make looks per step before writing the recipes.
2. **Nine kinds, eight slots.** `tap flip slice stir pour drag rub swipe bake` is 9 names; `normStore` keeps at most 8
   in `seen` (`js/cook.js:786`). The ninth kind would show its first-time hand on every dish forever. Raise the cap.
3. **"A half-made pot from the old build may be dropped quietly (the engine already does this when the tuning hash
   changes)"**: the hash will *not* change unless `TUNE` or `TUNE_R` changes, and it does not cover the step list
   (section 2.5). Old pots would be judged only by `validLook` per position. The clean switch is `VERSION`
   (`'cook-1'` -> `'cook-2'`, `js/cook.js:77`; `resumeRun` refuses another version, `:763`); it is pinned in
   `tools/test-cook.js:35` and mirrored in `js/app.js:4166` (which lane T deletes).
4. **"Old notebook lines must still read and draw"**: a book line is `{ id, recipe, seed, swaps, look, day, madeAt }`
   with no version (`:717-721`), and `normLook` maps the old flat look through the *current* steps (`:830-841`). With
   the new `jeon` an old look's `dents` has no tap step to validate against and is dropped; its two `cuts` fail a
   3-line slice step and pass the last one. Decide the old-look path by shape, on purpose. The same holds for a dish
   from the old build still waiting in `S.user.table`.
5. **"`result` is still posted once at the reveal, as today"**: today it is posted when the last step ends, before
   the reveal (`:1198`, finding 7). Either keep that (then a kitchen closed during the last `between` has delivered
   the dish with no plate shown) or move it; lane T should not assume the plate was seen.
6. **`bake` "the same heat bands as flip, the bell rings at golden"**: the bell, the heat frame counters, the
   sizzle-after-hidden-tab resend, the idle rule, the two-label chip and `live().band` are all written as
   `st.kind === 'flip'` (`:1632`, `:1637`, `:1799-1800`, `:700`, `:694`, `:1923`).
7. **Hold-to-pour must be time based, not tick based.** The only time-driven input today is tap's hold, caught up on
   a fixed schedule inside `tick` (`:317-323`) so that 30 Hz and 240 Hz give the same run; `simulate` also keeps
   ticking 3 s after the last event (`simTail`), which a recorded hold with no release will use.
8. **Sounds:** recorded `stir` (3 variants), `place` (2), `lift`, `clink` and a `simmer` loop already ship
   (finding 14); only `pour` and `scrub` have no file. A loop started by an act runs until a `quiet` act
   (`js/audio.js:1101`, `:1111`); the sim sends `quiet` only at a step's end, so a loop that should stop when the
   finger lifts needs the kitchen to send `quiet` itself (it already does on hidden and on close, `js/cook.js:1796`,
   `:1811`).
9. **A separate `js/cook-steps.js`:** `COOK.KIND` is exported and is the live object (`:894`), so another file can
   add kinds, but `base`, `rise`, `emit`, `boxOf`, `clampInt` and the look validators are closed inside `cook.js` and
   not exported; the node tests load `js/cook.js` alone (`tools/test-cook.js:16, 23`); the static guard scans a fixed
   file list (`:780`). All three need widening for a second file.
10. **Function names:** the live half may not declare a function whose name the sim half uses
    (`tools/test-cook.js:773-776`; declarations hoist over the whole IIFE). Taken sim names include `paint`, `put`,
    `blank`, `base`, `rise`, `emit`, `clone`, `dist`, `proj`, `drop`, `pid`, `recipe`, `verb`, `input`, `tick`, `feed`,
    `settle`, `advance`, `summary`.
11. **The screen is 80 art px wide.** The 80 x 56 dish sprites of `SPRITES.md` fill the whole width at 320 and 360
    (stage x 32..111 is what is visible, section 4.2) at the stage's scale; "the largest whole scale that fits" is 1.
    The old plate was kept inside x 33..111 for that reason.
12. **Stickers "one step larger, the strip is gone so there is more room":** the sticker strip sits *under* the HUD
    row (`top = hudB + 4`, `js/cook.js:1583`) and is shown only if `hudB + 4 + 32 n0 / dpr + 8 <= (STICK_ROW + oy) *
    css` (`:1576`). Removing the step strip frees the left half of the HUD row, not the row under it; the right
    sticker slot would meet the close chip.
13. **`ctx` in the URL:** `cook.html` reads options with `URLSearchParams` (`:68`) and opens at load (`:148`); the
    book must not create a run or write a pot before a dish is picked (`begin` writes one at once, `js/cook.js:1502`).

**For lane T (kitchen to table)**

1. **Suppress the pop.** The `close` listener that plays the appear beat was registered at boot (`mealInit`,
   `js/app.js:4570`) and runs before `openCook`'s (`:4119`). A remembered `serve` has to stop its
   `mealTableSync(true)`.
2. **`ctx.canCall` "the same conditions as the chip, with no dish needed":** `MEAL.canCall` returns `no_dish` and
   `not_seated` first (`js/meal.js:193-194`); use `mealOct()`'s `away / asleep / busy` (`js/app.js:4318-4321`) and
   `scene.octCanCome()` directly. The answer is a snapshot taken at open; the octopus can come home or fall asleep
   while the player cooks and the frame is not told (no such message), so the `call` button can be stale either way.
   The serve handler's own re-check is what keeps it honest.
3. **Mode `call` must sit first.** `mealCall` (`:4390`) goes through `MEAL.canCall`, which needs the player seated.
4. **Standing at the counter:** nothing puts the character there today (finding 8); section 7.2 has the box
   numbers. Lane P owns the body: the override point after `stepPlayer` that `stepMeBite` uses is at
   `js/scene3d.js:4235-4244`.
5. **The walk promise:** `plWalkTo` does not resolve when the stick cancels it (finding 9); "whatever interrupts the
   walk ends it at once in the end state" needs the `wleg` wrapper (`js/scene3d.js:3186`).
6. **Camera follow** is opt-in per walk: `PL.camGap` is set by `playerWalkTo` (`js/scene3d.js:3179`) and read by
   `plFollow` (`:600-602`, which I read only at those lines); `playerSitTable` does not set it.
7. **The guard and the watchdog:** if the hand-off uses `mealRun`, `mealTick` aborts it at the next 300 ms tick
   because the player is not seated (`js/app.js:4525`), and after 30 s in any case.
8. **The table dish is geometry, not a picture.** `dishParts()` builds boxes and cylinders per recipe
   (`js/scene3d.js:4113-4135`), `biteTake` removes a named piece per bite for jeon and kkochi (`:4185-4186`), four
   bites per dish (`:4152`), and `playSurface` treats `TB.mesh` as "the table" for taps (`:5520`). A sprite on the
   table needs its own answer for "one bite gone".
9. **New effects `bubble`, `confetti`:** `setAura` accepts only `sparkle star petal` (`js/scene3d.js:4457`);
   `MEAL.active` returns `null` for an effect `FX_NAME` does not know (`js/meal.js:292`); `tools/test-meal.js:54-55`
   pins both tables exactly.
10. **`cookSrc` drops an unknown recipe** because it checks `COOK_TUNES` (`js/app.js:4087`); with that table gone it
    needs another id check.
11. **2D:** the counter works there (`js/scene2d.js:170`), the table does not exist; `ctx.canCall` is false and a
    `serve` can only fall back to the record.

---

## 1. Architecture in one page

### 1.1 Files

| file | lines | what |
|---|---|---|
| `js/cook.js` | 1938 | global `COOK`. `:1-901` DOM-free deterministic simulation (returns at `:901` in node). `:903` live marker. `:904-1938` the dialog: layout, stations and slides, input plumbing, juice, sound / haptic / sticker hooks, saving, test hooks |
| `js/cook-art.js` | 2651 | global `COOK_ART` (`VERSION 'cook-art-2'`). Pixel buffers only, integer maths. Jeon painters, station backgrounds, tools, hand, icons, particles (section 4) |
| `js/cook-dishes.js` | 475 | attaches `COOK_ART.dishes = { jumeokbap, kkochi }` (`:474`); one painter object per extra dish |
| `js/cook-stickers.js` | 333 | globals `PPOL_STICKERS` (engine, `:33-213`) and `COOK_STICKERS` (catalog 19, rules, per-dish scripts, `:216-332`) |
| `css/cook.css` | 127 | the full-screen dialog, paper chips, strip, close, verb chip, notice slot, safe-area probe, reduced-motion block |
| `css/cook-stickers.css` | 46 | sticker in / out / frame-strip animations |
| `cook.html` | 170 | the kitchen page. Loads `haptics, cook-art, cook-dishes, cook, cook-stickers` (`:59-63`), then injects `js/audio.js` (`:132-136`). Opens the kitchen at load (`:148`). `?embed=1` = inside the game |
| `js/app.js` | 5499 | game side. Kitchen block `:4057-4214` (overlay, messages, wait layer, tray). Meal block `:4265-4574` |
| `js/meal.js` | 427 | global `MEAL`: pure table rules (dish check, who can be called, demo answer, eat, day effect, rows, two-tab merge) |
| `js/scene3d.js` | 7030 | 3D rooms. Table block `:4090-4460`; player walking `:3084-3215`; play-room counter build `:4786-4812`; API export `:6905-6934` |
| `js/scene2d.js` | - | fallback without WebGL: has a `counter` spot (`:170`), no table |
| `js/audio.js` | 1489 | kitchen sound layer `:927-1180` (`onCook :1142`, `cookAct :1092`, `ckDo :1099`, `COOK_NEXT :958`) |
| `js/haptics.js` | 60 | `HAPTICS.buzz(name)`; kitchen patterns `tap 14`, `flip 24`, `cut 16` ms (`:11-23`) |
| `foley/` | - | 27 recorded sounds x (`.ogg`, `.m4a`) in `foley/cook/`, act table `foley/manifest.json` `map.cook` |
| `index.html` | 444 | `#btn-cook :203`, `#btn-table :206`, `#btn-seat :207`, `#btn-call :208`, `#cook-overlay` + `#cook-wait` + `#cook-close :368`, `#dish-pick :370`. Loads `js/meal.js` (`:430`) but **not** `cook.js`, `cook-art.js` or `cook-dishes.js` (script list `:425-442`) |
| `assets/icons/dish/*.png` | - | 4 files, 16 x 16: `jeon`, `jumeokbap`, `kkochi`, `close`; written by `tools/make-dish-icons.js` |

### 1.2 Globals and who calls whom

```
game page (index.html)                               kitchen frame (cook.html?embed=1)
----------------------------------                   ------------------------------------------
scene3d  --tap on counter-->  #btn-cook.click()      COOK_ART  <- painters (cook-art.js, cook-dishes.js)
  (pick -> spotTap, scene3d.js:5701, :3586)          COOK      <- sim + live (cook.js)
app.js openCook(opener, kbd, recipe)  :4101          COOK_STICKERS, HAPTICS, AUDIO (its OWN instances)
  mealBusy() guard            :4102
  cookPot() -> resume / tray  :4104-4106              cook.html inline script:
  dishPickOpen -> chip -> openCook(.., recipe) :4188    opts() -> COOK.open(opts)            :97-115
  iframe src = cookSrc(kbd, recipe)  :4087, :4116       onClose  -> tell('close', {kbd})     :101
  showDialog(#cook-overlay)   :4129                     onResult -> tell('result', {...})    :109-112
  cookWaitStart() 300 ms / 6 s :4137-4144               'message' -> safe/motion/open/close  :139-147
        <------------- postMessage {ppolCook: ...} ------------->
cookMsg(e)  :4092-4100
  'ready'  -> cookReady, cookWaitEnd, send safe + motion
  'close'  -> #cook-overlay.close()
  'result' -> mealDish(d)  :4286  -> S.user.table = dish, save()
#cook-overlay 'close' -> mealInit listener :4570 -> mealTableSync(true) -> scene.setTableDish(dish, {appear:true})
#btn-table / #btn-seat -> mealTableTap :4377 -> scene.playerSitTable()  (seated + dish + tap again = eat alone)
#btn-call -> mealCall :4390 -> MEAL.canCall + scene.octCanCome -> MEAL.makeAsk (saved) -> mealStage :4421
   -> scene.octToTable -> octTableBeat('think'|'ponder'|'eat'|'watch') -> toast (who decided) -> mealEatRun :4453
   -> MEAL.eat (saved) -> scene.mealBite x4 -> mealFinish :4474 -> scene.setAura(.., {bloom})
```

Inside the kitchen, per frame: `frame()` (`js/cook.js:1733`) -> `update()` (`:1591`: `tick(run, t)`, `handle(drain(run))`,
demo / idle hands, reveal chip) -> `render()` (`:1715`: `paintStage` -> `layer` or `composeSlide` -> shake ->
`putImageData`). Per pointer sample: `onDown/onMove/onUp/onCancel` -> `send(ev)` (`:1394`) -> `input(run, ev)` ->
`handle(drain(run))`. Every sim event goes through `handle` (`:1118`): `sound(e.snd)` + `sticker(e.snd)` + aria words +
`onEvent(e)` (`:1133`).

### 1.3 The message protocol (all messages are `{ ppolCook: <name>, ... }`)

| direction | name | fields | sent at | handled at |
|---|---|---|---|---|
| kitchen -> game | `ready` | - | `cook.html:166`, last line of the inline script, after `go(true)` opened the kitchen | `js/app.js:4097`: `cookReady = true`, `cookWaitEnd()`, sends `safe` + `motion` |
| kitchen -> game | `close` | `kbd` (closed by key) | `cook.html:101` (`opts.onClose`), from `onClosed` (`js/cook.js:1828`) | `js/app.js:4098`: `cookKbd = !!d.kbd; ov.close()` |
| kitchen -> game | `result` | `v: 1, id, recipe, seed, look, day` | `cook.html:109-112` (`opts.onResult`), from `finish()` (`js/cook.js:1218`), once per dish, at the end of the last step | `js/app.js:4099`: `mealDish(d)` if defined |
| game -> kitchen | `safe` | `t, r, b, l` CSS px, clamped 0..200 | `js/app.js:4082` (on `ready`, before every `open`, on resize after 100 ms) | `cook.html:142` -> `--ck-safe-*` on `<html>`, `COOK.refit()` |
| game -> kitchen | `motion` | `reduce` (bool) | `js/app.js:4090` (on `ready`, before `open`, when the setting changes) | `cook.html:143` -> `data-motion` + next `open`'s `reduced` |
| game -> kitchen | `open` | `kbd`, `recipe` | `js/app.js:4127` (every open after the first) | `cook.html:144` -> `go(false)` |
| game -> kitchen | `close` | - | `js/app.js:4122` (the overlay's own `close` event) | `cook.html:145` -> `COOK.close()` (saves the pot) |

First load passes the same things in the URL: `cook.html?embed=1[&reduced=1][&kbd=1][&recipe=<id>]` (`js/app.js:4087`).
Checks: the frame accepts only `e.source === window.parent` and origin `'null'` or its own (`cook.html:140`); the game
accepts only its own frame and the same origins (`js/app.js:4093-4094`). The frame posts to `location.origin` (or `'*'`
under `file://`, `cook.html:95`); the game posts with `'*'` (`js/app.js:4082, 4090, 4122, 4127`).
There is **no** message for "serve", "book", "host can serve" or "the octopus is home": all would be new.

### 1.4 Save keys and formats

`localStorage['ppolppol_cook_v0']` (the kitchen's own key, `cook.html:98`; read-only on the game side, `js/app.js:4165`).
Shape from `normStore` (`js/cook.js:779-800`):

```js
{ v: 1, day: 'YYYY-MM-DD', dayN: 3,
  seen: ['tap', 'flip', 'slice'],      // step kinds whose first-time demo has played; names /^[a-z]{2,8}$/, AT MOST 8 (:786)
  pot: null | { ver: 'cook-1', tune: <uint32>, runId: 'ck_...', seed, recipe, swaps, si, looks: [...], tags: [...], at },  // potOf :724-729
  potOld: [ pot, ... ],                // only when present: pots that could not resume, byte-identical, newest first, max 4 (:788-794)
  book: [ { id, recipe, seed, swaps, look, day, madeAt }, ... ] }   // newest first, max 300 (bookLine :717-721, bookAdd :801-806)
```

- A pot holds **finished steps only** (`si = looks.length`); resuming restarts the current step (`resumeRun :759-777`).
- Written at: a new dish (`begin :1502`), each step end (`onStepEnd -> savePot :1198`), tab hidden (`:1796`),
  `pagehide` (`:1804`), close (`settle0 :1810`). Cleared when the last step ends (`finish :1217`).
- `book` is never shown anywhere yet: it is the natural data for "dishes you have made" stamps in a recipe book
  (each line can be redrawn at any size with `COOK.drawDish(recipe, look, seed, w, h)`, `:871-891`).

`localStorage['ppolppol_v2']` -> `S.user` (game save; format header `js/meal.js:14-18`):

```js
user.table = null | { v: 1, id: 'ck_...', recipe, seed, look, day, at }       // ONE waiting dish; a new one replaces it (app.js:4290)
user.meals = [ { id: 'ml_...', dish: 'ck_...', recipe, date, at,
                 ask: null | { at, action: 'eat'|'watch'|'stop'|null, by: 'demo-rules'|'model'|'human'|'fallback', rule?, seed?, ... },
                 ate: null | { at, date, me: true, oct: true|false|null, fx } } ]   // oldest first, never deleted
```

`MEAL.normDish` (`js/meal.js:137-148`) accepts a `result` only if `id` matches `/^ck_[0-9a-z]{1,13}$/`, `recipe` is
1..16 printable ASCII, `seed` is a uint32 and `look` is a plain object of at most 2048 JSON bytes. A richer look
(per-step data for longer recipes) must stay under 2 KB or the dish never reaches the table.

---

## 2. The simulation (`js/cook.js:1-901`)

### 2.1 The run object

`newRun` (`:522-526`). Plain JSON; a JSON round trip gives an equal object (asserted after every event,
`tools/test-cook.js` section 9). Keys (I printed them from a live run): `v 1`, `ver 'cook-1'`, `id 'ck_...'`, `recipe`,
`seed` (uint32), `swaps` (per-seed ingredient picks, `swapsFor :236-241`), `plate 0..2` (`plateFor :242`), `n` (step
count), `si`, `phase 'step' | 'between' | 'reveal'`, `done`, `t0 / t / doneAt` (caller clock ms), `looks[]`, `tags[]`
(one per finished step), `st` (current step state), `ptr { live, prim }` (pointer bookkeeping), `ev` (event queue).

Units: logical px 288 x 320 for input and `st` geometry; art px = logical / 2 (stage 144 x 160) for drawing and every
look value; integer ms; degrees, clockwise positive (`:7-9`).

### 2.2 The life of a step

1. **Start.** `createRun(recipeId, seed, opts)` (`:528-535`) or `resumeRun(pot)` (`:759-777`) -> `initStep(run, si)`
   (`:517-521`) calls `KIND[kind].init(step, stepSeed(run.seed, si), foodOf(r, step), lay)` -> `startEv` emits
   `start { si, kind, say: WORDS.title[kind] }` (`:527`).
2. **Clock.** The first `tick` sets `run.t0` (`:569`). A caller clock that jumps backwards is re-based (`:563-567`).
   The step clock is `t - t0`.
3. **Gate.** New pointers and the verb button are ignored for the step's first `TUNE.gateMs` = 250 ms (`:593`, `:605`).
   The live slide between stations is 3 frames at 12 fps = 250 ms on purpose (`SLIDE_AT`, `:938`), so nothing pressed
   during a slide counts.
4. **Input.** `input(run, ev)` (`:579-610`) ticks first, then routes `k`: `'d'` -> `K.down`, `'m'` -> `K.move`, `'u'` ->
   `K.up`, `'c'` -> `K.cancel` (no id = cancel all), `'b'` -> `K.alt` (the verb button). Rules applied here: only
   pointers pressed in this step count (`:598`); kinds with `multi: false` follow the first finger only (`:594`).
   Returns a record `{ si, t, k, x, y, p, id }` for `?rec=1`.
5. **Progress.** Kind code calls `rise(st, to, t)` (`:257-264`): progress never falls; `half` fires once at 0.5 (with a
   `say` word only if `KIND.sayHalf`), `done` once at 1 (`say: WORDS.done`). Kind code calls `emit(st, type, extra)`
   (`:220-225`; `undefined` and `null` extras are dropped so the JSON round trip stays exact).
6. **Done.** `settle(run)` (`:537-547`) moves step events to `run.ev` tagged with `si`; when `st.done` it pushes
   `K.look(st)` and `K.tag(st)`, sets `phase 'between'`, `doneAt = t0 + doneT`, sets `run.done` on the last step and
   emits `step { kind, tag, snd: { act: 'step', kind } }` then `quiet { snd: { act: 'quiet' } }`.
7. **Between.** Inputs are ignored (`:590`). It lasts `betweenOf(kind)` (`:516`): `TUNE[kind].betweenMs` if present
   (flip: 1000), else `TUNE.betweenMs` (400).
8. **Next.** `tick` -> `advance(run)` (`:548-558`) when `t >= doneAt + betweenOf`: the next step starts with the exact
   origin `t0 = doneAt + between` (frame-rate free), or, after the last step, `si = n`, `phase 'reveal'` and
   `reveal { dish, say: describe(...), snd: { act: 'done', dish } }`.

`drain(run)` (`:611`) hands the queue to the host. `tick` is idempotent.

### 2.3 The three kinds

| | `tap` (`:268-333`) | `flip` (`:335-379`) | `slice` (`:381-512`) |
|---|---|---|---|
| idea | 3 marks x 3 hits, any finger, hold auto-taps | first press = heat on; colour band rises every 3 s and waits at crisp; an upward stroke flips | follow the lit guide (any direction, lift and continue) or slash across it |
| state (besides shared) | `box, rx, ry, inset, marks[{x,y,n}], per 3, need 9, hits, dents[[x,y]] (max 9), shape 0..2, last, press{id,x,y,next}` | `box, bandMs 3000, heat, heatAt, band 0..2, res, stroke{id,x0,y0,t0,b0}` | `box, lines[{ax,ay,bx,by,len,ux,uy,off,bins[40],n,cut,how,ang,ws,as}], cur, band (half width 32), hand{x,y}, pen, cross` |
| `multi` / `sayHalf` | true / true | false / false | false / false |
| counted input | every pointerdown within `reach` 80 logical px of the nearest unfinished mark (`tapHit :279-297`); two within 90 ms merge; a held finger auto-taps at 400 ms then every 250 ms on a fixed grid caught up in `tick` (`:317-323`) | `down` with heat off = heat on (`:364`); with heat on = `nudge` and a stroke start; `move/up` call `flick` (`:349-356`): >= 32 px up within +-45 deg flips at the band **of the moment the stroke was pressed** (`b0`) | resampled every 4 px (`sliceSample :463-472`); a segment inside the band moving within +-40 deg of the guide paints bins (`sliceSeg :437-462`); 80 % of 40 bins = cut; or a crossing chord >= 16 px at >= 50 deg inside 15..85 % cuts at once |
| time-driven | hold schedule only | `tick` raises `band` (`:371-375`) | none (`tick` is empty, `:503`) |
| verb button (`alt`) | next unfinished mark gets all its hits (`:324-330`) | 1st = heat on, 2nd = flip at the band now (`:376`) | cuts the lit line (`:504`) |
| events | `hit {i, m, x, y, auto, b, snd tap}`, `pat`, `dust`, `shape {n}`, `half {say}`, `done` | `heat {band 0, say, snd sizzle}`, `band {band, say, snd sizzle}`, `nudge`, `flip {band, lift 1..3, snd flip}`, `half`, `done` | `score {i, n}`, `cut {i, ang 0, how, say?, snd cut}`, `line {i}`, `half`, `done` |
| `look` | `{ dents: [[x, y], ...] }` food-box px 64 x 48 | `{ band: 0..2 }` | `{ cuts: [deg, ...], offs: [px, ...] }` (all 0 since 11-18; a `cross` step reverses line order so index 0 = horizontal, `:507-510`) |
| `tag` | `null` | `'soft'`, `'golden'` or `'crisp'` | `'straight'` (old book lines may hold `'slant'`) |
| progress | `hits / need` | 0.5 at heat on, 1 at flip | `(cuts + painted share of the lit line) / lines` (`sliceRise :416-420`) |

Nothing can fail: off-target taps are `dust`, wrong strokes do nothing, crisp waits forever, `pointercancel` keeps
progress. The idle hint time is `hintAt(run)` (`:697-702`): `st.prog + 5000`, except a heated flip: only 5 s after
crisp.

### 2.4 How a recipe lists its steps

`RECIPES` (`:162-173`), frozen pure data:

```js
{ id: 'jeon', tier: 1, at: 'pan', ings: ['batter'], swap: { herb: ['parae', 'tot'] }, steps: [
  { kind: 'tap', marks: 3, hits: 3, food: 'batter' }, { kind: 'flip', band: 3000 }, { kind: 'slice', lines: 2, cross: true, food: 'jeon' }] }
{ id: 'jumeokbap', ..., steps: [{ kind: 'tap', marks: 3, hits: 3, food: 'rice' }, { kind: 'flip', band: 3000, food: 'rice' }] }
{ id: 'kkochi', at: 'board', ..., steps: [{ kind: 'slice', lines: 2, cross: false, food: 'fruit' }, { kind: 'tap', ..., food: 'fruit', station: 'board' }] }
```

Per step: `kind`, kind parameters (`marks`, `hits`, `band`, `lines`, `cross`), `food` (which food box: `foodOf :193-196`
looks in `TUNE_R[id].food[step.food]`, then `TUNE.food[step.food]`, `TUNE.food[id]`, `TUNE.food.jeon`), optional
`station` (live half only). Per recipe extras in `TUNE_R[id]`: `food` boxes, `tapAt`, `tapJitter` (`:177-181`).
`run.n = r.steps.length` (`:524`): nothing in the sim limits the count; the loop guard in `tick` is `run.n` (`:570`).

### 2.5 What `TUNE_HASH` and `tuneOf` protect

- `tuneOf('jeon') = TUNE_HASH`; another recipe = `hash32(TUNE_HASH + '|' + JSON.stringify(TUNE_R[id]))`; unknown = `null`
  (`:187-191`). `potOf` writes it (`:727`); `resumeRun` requires `pot.tune === tuneOf(recipe)` (`:764`).
- Also required to resume: `ver === 'cook-1'`, a known recipe, a uint32 seed, `0 <= si <= steps - 1`, `looks` and `tags`
  of length `si`, the same swaps for that seed, every look passing `validLook(r, i, look)` and every tag `validTag`
  (`:763-771`).
- **When numbers change:** `resumeRun` returns `null`; `begin()` moves the pot byte-identical to `potOld[0]`
  (`[pot].concat(potOld).slice(0, 4)`, `js/cook.js:1493`) and starts a new dish. No message, the book is untouched, the
  player loses at most the finished steps of one dish. On the game side `cookPot()` stops seeing it as resumable
  (`js/app.js:4167`), so the counter shows the tray.
- **Gap:** the hash covers numbers, not the step list. If a recipe's `steps` change while `TUNE` / `TUNE_R` do not, an
  old pot is still judged step by step by `validLook`; it resumes whenever the finished steps happen to have the same
  kinds in the same positions. Hash the steps too for any recipe that changes (and update `COOK_TUNES`).

### 2.6 `simulate` and replay

`feed(run, evs, opts)` (`:614-643`) plays one step's events on that step's own clock at a fixed tick cadence (1..1000
Hz, default 60) and keeps ticking `TUNE.simTail` = 3000 ms after the last event (a held finger keeps tapping).
`simulate(recipeId, seed, steps, { cadence, until, pot, run })` (`:653-671`) loops the steps and returns
`{ done, si, steps: [{ kind, status, tag }], look }`; with `opts.pot` it starts from `resumeRun(pot)`.
The live half records with `?rec=1` into `window.__cookRec = { recipe, seed, steps: [[rec...] per si], pot }`
(`:1397-1400`, `:1510-1513`); test L13 replays a touch session in node and compares looks.

### 2.7 What must stay deterministic

- The sim half has no `Date.now`, `performance.now` (comments included), DOM, storage, timers or `new Date`
  (`tools/test-cook.js:778-779`); no `Math.random` in any kitchen file (`:797`).
- Same events -> same run at 30 / 60 / 120 / 240 Hz tick cadence and any input sample rate, in two separate instances
  (section 2 of the node test, 200 random paths).
- Seeds: `seedFor(day, dayN)` (`:229`), `stepSeed(seed, si)` (`:233`), `fxSeed(seed, si)` for particles (`:234`, a
  separate stream so juice never changes play). The run id uses a random nonce, never a clock (`runIdFor :232`,
  `nonce :1476-1479`): "no time anywhere in the result or the book".
- Looks are integers only; `drawDish` uses integer geometry (`TAN6` table, `:811`) so a saved dish paints the same
  pixels on every engine.
- The result envelope (`resultOf :704-716`) has `ms: null`, `status: 'done'` only, and no key matching
  `score|grade|rank|fail|best|star|percent|accuracy|time|duration` at any depth (`tools/test-cook.js:609-620`).

---

## 3. The live half (`js/cook.js:903-1938`)

### 3.1 Screens and states

- One modal `<dialog id="cook-dlg" class="ck-dlg">` built once by `build()` (`:1749-1805`). Children: `.ck-stage`
  (all pointer listeners; holds `canvas.ck-cv`, the invisible logical box `.ck-sim`, the sticker strip `.ck-stick`),
  `.ck-hud` (`.ck-strip`, `button.ck-close`), `button.ck-verb`, `.ck-note` (dormant), `p.ck-say` (aria-live),
  `.ck-probe` (safe-area probe).
- `L` is the per-open state object (`open()`, `:1843-1856`); `D` the DOM handles. `L.screen` is `'step'` or `'reveal'`
  only; `live().screen` adds `'closed'` (`:1918`). **There is no state without a run:** `open()` calls `begin(false)`
  and throws `'no dish'` if it fails (`:1864`); `paintStage` returns at once when `L.run` is null (`:1681`). A book
  screen is a new screen with its own painter, its own input branch in `onDown` (`:1414-1429`) and its own entry in
  `live()`.
- `open(opts)` (`:1833-1871`) options: `opener, reduced, kbd, palette, day, storeKey, recipe, seed, slow, rec, onResult,
  onClose`. It never throws (returns `false`).
- `begin(isAgain)` (`:1484-1521`) decides the dish. Not "again": a resumable pot **with progress (`si >= 1`) always
  wins**; with a picked recipe an empty pot (`si 0`) of that recipe resumes and an empty pot of another recipe moves to
  `potOld`; with no picked recipe any resumable pot wins, else `RECIPES[0]` (jeon). A new run: `dayN + 1`, seed
  `seedFor(day, dayN)`, id from a crypto nonce, the pot written at once (`:1497-1504`). Then `sound pick`, the dialog's
  `aria-label` = dish name (`:1506`), `sticker pick`, `buildStrip`, first `tick`, focus (verb chip if the last input
  was a key, else the stage, `:1519`).

### 3.2 Layout: `fit()`, `LAY`, and the device-pixel rules

`LAY` (`:922`): `VIEW_W 80` art px across, `ROWS [28, 132]` (the stage rows that must be visible), `MID 80`, `ZMAX 6`
CSS px per art px at most, `HUD 64` (8 + 48 + 8), `CHIP 64`, `CHIPB 16`, `STICK_ROW 44`, `PAD 8`, `CLOSE 48`, `HIT 56`,
`NOTE 44`. These are **not** in `TUNE` (no pot hash change).

`fit()` (`:1532-1587`), run at open, `resize`, `visualViewport` resize and `COOK.refit()`:

```
hudB    = safeTop + 64;   chipTop = vh - safeBottom - 16 - 64
k       = max(1, min(floor(vw*dpr/80), floor((chipTop-hudB)*dpr/104), floor(6*dpr)))   // one art px = k DEVICE px   (:1541)
css     = k / dpr;   W = ceil(vw/css), H = ceil(vh/css)        // the canvas covers the whole dialog, edge to edge  (:1542)
ox      = round(vw/2/css) - 72;   oy = round((hudB+chipTop)/2/css) - 80                 // food centre on screen     (:1543)
W, H grow by up to 4 art px until W*css and H*css are whole CSS px (else a device row is doubled)   (:1546-1549)
stride  = W + 8                                                                         // slide distance (:1555)
```

Measured results are pinned in the browser test (`tools/test-cook-live.js:30-37`), e.g. 360 x 740 @2: k 9, css 4.5,
W x H 80 x 166, ox -32, oy 0, chipTop 660; 412 x 915 @2.625: k 13, 84 x 189, ox -30, oy 11.

Device-pixel rules that any new HUD or book element has to follow (they exist because DPR 2.625 blurred things):
1. Every HUD box position and size goes through `dev(v) = round(v * dpr) / dpr` (`:1375`, `:1550`, `:1560-1567`).
2. Icons are 16 x 16 art, redrawn into a canvas of `16 n` backing px where one icon px = `n` device px:
   `n = floor(2 dpr)` for strip and close, `floor(3 dpr)` for the verb chip (`drawIcon :1357-1369`,
   `sizeIcons :1372-1389`). Never a CSS upscale of a 16 x 16 canvas.
3. The 2 px chip border is an inset `box-shadow`, not a `border` (Chrome rounds border widths to whole CSS px),
   driven by `--ck-px2 = dev(2)` (`css/cook.css:46-50`, `js/cook.js:1561`).
4. Safe areas come from `.ck-probe` padding = `max(env(safe-area-inset-*), var(--ck-safe-*))` (`css/cook.css:99-101`,
   read at `js/cook.js:1537-1539`). Inside the frame `env()` may be 0, so the game measures and sends `safe`.
5. Anything drawn **on the canvas** gets exact pixels for free (one art px = k device px). A recipe book painted into
   the canvas avoids rules 1 to 3 entirely.
6. A touch that starts within `TUNE.edgeCss` = 24 CSS px of the left or right screen edge is ignored (OS back swipe,
   `:1421`).

### 3.3 The HUD

**Step strip (the "finger and spatula buttons" the owner wants removed). Every line that touches it:**

| what | where |
|---|---|
| element created (`div.ck-strip.ck-paper`, `aria-hidden`) | `js/cook.js:1756` |
| put into `.ck-hud` | `js/cook.js:1760` |
| emptied at open | `js/cook.js:1858` (`D.strip.textContent = ''`) |
| built per dish: one 16 x 16 canvas per step, icon = the step's **kind** | `buildStrip(r)` `js/cook.js:1348-1356`, called from `begin` `:1514` |
| icon size, top margin, left margin, right padding | `sizeIcons` `js/cook.js:1381-1386` |
| position and height (left `max(8, safeL + 8)`, top `max(8, safeT + 8)`, height 48) | `fit` `js/cook.js:1562` |
| state classes (`done` before `si`, `on` at `si`) | `stripOn(si)` `js/cook.js:1391`; called at step start `:1183` and at the reveal `:1205` |
| header comment mentioning it | `js/cook.js:908-909` |
| CSS | `css/cook.css:52` (`.ck-strip`), `:53-56` (`.ck-step`, `.done`, `.on`, the amber underline), `:57` (canvas rule shared with the chips), comments `:1-3`, `:45` |
| tests | `tools/test-cook-live.js:172, 584, 1129, 1133, 1136, 1138-1144, 1169, 1335-1336`; `tools/test-cook-stickers-live.js:500` |
| docs | `docs/COOK_PROTO.md:149` and the captures in `docs/shots/cook/` |

The strip takes no pointer events (`css/cook.css:52`). It is not a progress input for anything else: removing it needs
no sim change. If the per-kind icons stay only on the verb chip, `buildStrip`'s `iconOf(s.kind)` is the only reader of
a kind icon besides `verbKey`.

**Close chip.** `button.ck-close` with a 48 x 48 paper chip inside a 56 x 56 hit area (`build :1757-1759`; click
`:1772`; `fit :1563-1564`; icon `:1858` + `sizeIcons :1387`; CSS `css/cook.css:60-66`). `aria-label` `WORDS.close`
('닫기'). A click with `detail === 0` (key or screen reader) and Esc (`cancel`, `:1775`) mark the close as keyboard.

**Verb chip.** `button.ck-verb.ck-paper` 64 x 64 at the bottom centre (`build :1761-1762`, `fit :1565-1566`,
`sizeIcons :1388`). `updVerb()` (`:1340-1347`):
- `hidden` unless there is a run and (`screen !== 'reveal'` or `L.chipOn`);
- `aria-label = verb(run)` (sim, `:690-696`): 톡톡 / 불 켜기 / 뒤집기 / 썰기 / 다시;
- icon = `verbKey(run)` (`:1330-1335`): `tap`, `heat`, `flip`, `slice`, `again`;
- class `ck-shown` when `L.shown`.

It is always in the DOM, the tab order and the accessibility tree, but **quiet** (`opacity: 0`) on touch
(`css/cook.css:71-74`). It becomes visible (`L.shown = true`) when: the idle ghost hand fires (`checkIdle :1114`), the
flip re-teach fires (`:1152`), it is pressed (`onVerb :1459`), a finger lands on its quiet spot (`onRowDown :1470`:
that press only reveals it and the stroke goes to the stage, so a stray tap never flips and a thumb flick starting
there still flips), the dish started by keyboard (`:1519`), or the reveal chip turns on (`:1603`). It is also visible
whenever it has focus (CSS). A press sends `{ k: 'b' }` (`onVerb :1454-1462`).

### 3.4 Stations and the slide

`STATION = { tap: 'counter', flip: 'stove', slice: 'board' }` (`:926`); `stationOf(step)` = `step.station` or the
kind's (`:929`); the reveal is `'plate'` (`stationNow :1227-1233`). Background per station: `COOK_ART.view(b, { station,
ox, oy })` paints the bleed around the 144 x 160 stage for any canvas size, cached per station and offsets
(`bgFor :1260-1267`); `layer()` (`:1270-1290`) copies the stage interior (x 2..141, y 2..157) on top.

Slide (`onStart :1177-1191` when the previous and current stations differ; `onReveal :1206-1208`):
`startSlide(from, to, t0, outO, inO, carry, snapshot)` (`:1245-1251`) takes still pictures of both stations from
`COOK_ART.base` (`baseOf :1235-1242`), then `composeSlide` (`:1300-1312`) draws 3 frames at 12 fps with offsets
`SLIDE_AT = [0.40, 0.75, 0.94]` x stride (`:938`), a seam between the two, and the carried object painted fixed at the
food centre by `<art>.carry(V, { what, x, y, lift: 2, shadow: true, look, ... })`. What rides is per recipe:
`CARRY_R = { jeon: { between: ['pan', 'jeon'], reveal: 'cut' }, jumeokbap: { between: ['pan'], reveal: 'cake' }, kkochi:
{ between: [], reveal: 'skewer' } }` (`:930`), indexed by `si - 1`. No slide on open, resume, again-start (`L.noSlide`)
or under reduced motion (`:1246`). `again` slides plate -> first station with a snapshot and no carry (`:1528`).

### 3.5 Ghost hands (first-time demonstration, idle hint, the `seen` list)

- `handSpec(kind)` (`:1068-1085`) -> `{ kind: 'tap', x, y }` (first unfinished mark), `{ kind: 'flick', x, y }` (starts
  at `GEO.flipArrow`), `{ kind: 'line', x0, y0, x1, y1 }` (the lit guide). Drawn by `COOK_ART.hand` on top of the scene
  (`paintStage :1708-1713`), 4 frames looping 3 times (`startHand :1086-1091`, `dur = 12 * FMS`), a still pose when
  reduced.
- **First time:** `maybeDemo()` (`:1097-1104`) shows one hand `TUNE.titleMs` = 600 ms after the step start if the kind
  is not in `L.seen` and nothing has progressed. Flip: first the heat-on tap; the up-swipe demo follows the `heat`
  event (`:1147`).
- **Seen:** `markSeen(kind)` (`:1092-1096`) when the demo played to its end (`update :1599`) or the step finished
  (`onStepEnd :1195`); saved in the store's `seen`. `normStore` keeps at most **8** names matching `/^[a-z]{2,8}$/`
  (`:786`): a ninth kind would demo on every dish, and a kind named with a digit, a dash or 9+ letters is never
  remembered.
- **Idle:** `checkIdle(run)` (`:1105-1115`): when `run.t - run.t0 >= hintAt(run)` one hand, once per `si | due`, and
  the verb chip shows from then on.
- **Re-teach (flip only):** 3 presses after heat-on that do not flip -> the up-swipe hand again, at most twice a step
  (`:1152`).
- A hand gives way only to progress events (`PROGRESS = { hit, heat, flip, score, cut }`, `:1132`, `:1135`), not to
  presses that change nothing.

### 3.6 Juice (all on a 12 fps grid, `FMS = 1000 / 12`)

`fxAdd(o, si, at)` (`:1042`) queues a reaction; `juiceAt(t)` (`:1051-1067`) turns the queue into the frame's flags:
`hit` (flash on frame 0, squash 1 and 2), `flash` (1 frame), `bump` (1 frame hop), `arc` (frames 0..3 with `lift`),
`cut` (2 frames `{ i, f }`), `shake` (2 frames from `from`), `rise` (reveal). A reaction never leaks into the next step
(`q.si !== si`, `:1055`). `burst(kind, x, y, lo, hi, spread)` (`:1043-1050`) adds 1 x 1 px particles (max 48) with
integer velocities from `L.prng = mulberry32(fxSeed(seed, si))` (`:1179`); kinds map per recipe through
`PART_R` (`:937`). The view shake moves the whole canvas (`shakeView :1291-1299`). `frameSig` (`:1614-1626`) hashes
every 12 fps counter so each frame is painted exactly once.

### 3.7 Sound, haptic and sticker calls per event

`handle()` (`:1118-1131`) calls `sound(e.snd)` and `sticker(e.snd)` for every sim event that carries `snd`, collects
`say` words into one aria-live line, then `onEvent(e)`.

| event | picture | sound act (`AUDIO.on('cook', ...)`) | haptic | sticker act | aria word |
|---|---|---|---|---|---|
| `start` | slide to the station; strip; demo timer | - | - | - | step verb (`WORDS.title`) |
| `hit` | flash + 2 squash frames, 3..6 drops (`:1139-1141`) | `tap { i }` (kkochi: renamed `place`, `:999`) | `buzz('tap')` | `tap` | - |
| `pat` / `dust` | 1-frame flash / a speck that stays (max 12) | - | - | - | - |
| `half` | - | - | - | - | '반쯤' (tap only) |
| `heat` | flash; up-swipe demo if flip unseen (`:1146-1147`) | `sizzle { band: 0 }` | `buzz('tap')` | `sizzle` | '보들보들' |
| `band` | the desk bell at band 1 (`L.bell`, `:1165`) | `sizzle { band }`; plus a live-only `ding` at band 1 | none | `sizzle` | band word |
| `nudge` | 1-frame hop; re-teach after 3 | - | - | - | - |
| `flip` | arc 4 frames, crumbs, shake at landing (`:1154-1161`) | `flip { band }` | `buzz('flip')` on the landing frame (`L.landBuzz`, `:1158`, `:1600`; at once when reduced) | `flip` | - |
| `score` | kerf follows the hand | - | - | - | - |
| `cut` | gap pops 2 frames, 3..4 crumbs (`:1167-1170`) | `cut { i }` | `buzz('cut')` | `cut` | '한 줄' (not after the last) |
| `done` | - | - | - | - | '다 됐어' |
| `step` | slice: 1 px shake; pot saved or dish finished | `step { kind }` | - | `step` | - |
| `quiet` | - | `quiet` (stops loops) | - | none | - |
| `reveal` | plate screen (3.8) | `done { dish }` | none (owner: tap, flip, slice only) | `done` | plate description |
| open / again (live) | - | `pick { dish }` (`:1505`) | - | `pick` (`:1509`) | - |
| tab hidden / shown | clock frozen | `quiet` (`:1796`); back: `sizzle { band }` if the pan is on (`:1800`) | - | - | - |
| close | loop stopped | `quiet` (`:1811`) | - | strip cleared | - |

- `sound()` (`:991-1001`): the same act is dropped within `TUNE.sndGapMs` = 120 ms unless it is in
  `SND_FREE = { tap, step, done, pick, quiet }` (`:940`).
- `buzz(name)` (`:1006-1010`) counts attempts only for `stats.buzz = { tap, flip, cut }` (`:1854`); the browser tests
  compare those three counts exactly per dish. `HAPTICS.PATTERNS` has more names (`js/haptics.js:11-23`).
- `sticker(snd)` (`:1017-1030`) mounts `COOK_STICKERS` on `.ck-stick` and calls `cue(act, detail)`; rules and per-dish
  scripts are in `js/cook-stickers.js:250-290`. The strip is hidden where it would reach the food and its size is
  `32 n / dpr` CSS px (`fit :1575-1584`).
- Sound that exists on the audio side but is never sent: `stir`, `simmer`, `clink`, `lift`, `back`
  (`js/audio.js:942`, `foley/manifest.json`). A looped act (`simmer`) stops on `quiet`, which `settle` emits after
  every step; the "tab shown again" resend exists only for the flip's sizzle (`:1799-1800`).

### 3.8 The reveal screen and the "again" chip: every line

| step | where |
|---|---|
| sim emits `reveal` after the last step's `between` | `js/cook.js:551-554` |
| `onReveal(e)`: `L.screen = 'reveal'`, `revealAt`, `chipAt = at + TUNE.reveal.focusMs` (450 ms), `againAt = at + AGAIN_MS` (900 ms), `chipOn = false`, pointers cleared, hand and particles cleared | `:1200-1203` |
| reveal juice: `rise` fx and a 1 px shake at frame 5 | `:1204` |
| strip marked all done | `:1205` |
| slide from the last station to `'plate'` with the recipe's reveal carry | `:1206-1208` |
| safety: `finish()` if the dish was not finished yet | `:1209` |
| chip appears at 450 ms: `chipOn = true`, `shown = true`, focus the chip if keyboard else the stage | `update :1601-1606` |
| chip visibility rule | `updVerb :1342` |
| label `WORDS.verb.again` = '다시' | `verb :692`, `WORDS :152` |
| icon key `'again'` | `verbKey :1332`; art `js/cook-art.js:2107-2126` |
| press: ignored until `againAt`, then `again()` | `onVerb :1458` |
| `again()`: snapshot the plate, clear stickers, `begin(true)` (same recipe, new run and pot), slide plate -> first station | `:1522-1529` |
| the plate itself is inert | `onDown :1419`, `onUp :1442` |
| constants | `AGAIN_MS = 900` `:939`; `TUNE.reveal = { frames: 6, stepPx: 2, focusMs: 450 }` `:95` |
| painting | jeon: `A.revealScene(b, { geo: 'close', look, herb, f: J.rise, t, seed, still })` `:1683`; other dishes `P.revealScene` `:1659-1660`; `t` = 12 fps frames since the reveal (`fxNow :1643`) |
| test hook stops here | `autoStep :1745` |

The art contract for the plate: `t <= 3` the food is carried in at lift 2, `t 4` lift 1, `t 5` landing squash,
`t >= 6` at rest with steam and twinkles on a 96-frame loop; the plated food stays in stage x 33..111.
The plate sound is timed to `t 5` on the audio side (`COOK_LAND = 0.4`, `js/audio.js:954`).

### 3.9 Keyboard and screen reader

- Modality: any non-modifier `keydown` sets `kbd` and the class `ck-kbd` (focus rings show only then); any
  `pointerdown` clears it (`:955-957`). The host can force it with `opts.kbd` (`:1861`).
- Tab order: close, then the verb chip. The stage has `tabindex="-1"` and is only a script focus target.
- Enter / Space on the chip = the step's `alt` action; a held key presses once (`:1777-1779`). Esc = the dialog's
  `cancel` -> close.
- Screen reader: the hidden polite live line `.ck-say` (`say() :1032-1039`, cleared first so repeats are read); the
  dialog's `aria-label` is the dish name; buttons have `aria-label` only. No `title` attributes and no visible text
  anywhere (the browser tests read the dialog's text and expect `''`).
- Focus after close: opener, else `#btn-play-door`, else `#btn-go` (`onClosed :1824-1827`); in the embed the game
  refocuses `#btn-cook` (`js/app.js:4123`).

### 3.10 Reduced motion

`wantReduced` (`:972-978`): `opts.reduced`, or `data-motion="reduce"` on `<html>`, or the media query. Off under it:
slides (`:1246`), particles (`:1044`), squash / bump / arc / shake (`:1056-1061`), the plate's carry-in (`:1062`,
`fxNow :1643`), hand motion (`:1711`), flame and steam motion (`f = 0`, `still: true`, `:1680`), the bell swing. Kept:
flash rims, dents, kerfs, band colours, the chips, haptics (the flip buzzes at once). CSS: no animation or transition
inside the dialog except a sticker's own fade (`css/cook.css:124-127`).

### 3.11 A hidden tab

`visibilitychange` (`:1793-1803`): hidden -> `cancelAll()` (a `'c'` with no id), `freeze()` the visible clock, save
the pot, `quiet`; shown -> `thaw()`, cancel again, repaint, resend the sizzle if the pan is on. The sim clock is
`vis / slow` and never runs backwards (`simT :982`). `pagehide` saves the pot (`:1804`). So a flip's colour band does
not advance while the tab is hidden.

### 3.12 Test hooks

`COOK.live()` (`:1917-1931`) returns a read-only snapshot (`screen, recipe, si, kind, phase, progress, done, band,
quiet, fx, verb, hint, station, slide, view, stick, chip, t0, revealAt, stats, seed, id, look, st, key, seen, bell,
err, ...`); `COOK.auto(on)` (`:1932`, `autoStep :1739-1746`) plays the current dish through the verb chip (one press
every 300 ms) and stops on the plate. `COOK.notice()` (`:1875-1895`) is a dormant text slot nobody calls; its
`noticeGo` shows the one existing pattern for "save, close, then run a host function at the end of the close event,
skipping the opener focus" (`L.after`, `:1893`, used in `onClosed :1824`, `:1829`).

---

## 4. The art (`js/cook-art.js`, `js/cook-dishes.js`)

I read the header contract, palette, `GEO`, the station backgrounds, the hand / icon / particle code, the scene entry
points and `base` / `carry` / `revealClose` in full. The jeon texture internals (`jeonBuf :921-1127`), the heat effects
(`:1242-1405`) and the steam (`:1406-1568`) I read as an outline only (unverified in detail).

### 4.1 How `js/cook-art.js` is organised

| lines | block |
|---|---|
| `1-110` | the contract comment: buffer, units, look, helpers, scenes, close-up, pieces, motion, FOOD |
| `117-150` | `APOLLO` (46), `F` (24 named FOOD colours, `FOOD` list), `C` (short Apollo names: `ink coal soot s0..s6 w0..w6 r0 r1 a1..a3 g0..g4 b1..b4 p1..p4`) |
| `153-173` | `GEO`: all geometry in art px |
| `176-216` | integer trig (`SIN90` table, `isin`, `icos`, `degOf`), integer hash `ih`, Bayer dither, `DARK` (one step darker) |
| `218-311` | buffers (`blank clone clear copy put get rect dither line ellipse blit hash colors`), browser-only `imageData` / `toCanvas`, `remember` memo, masks |
| `315-404` | straight tools (`stick`), wall planks, lamp, `sprite(b, G, K, x, y)` (string-grid sprites), wood, `frame`, `trim` |
| `405-507` | station backgrounds as pure functions of the stage pixel (`wallAt woodAt stoveAt ovenAt bgAt paintBg stoveProps bgStep bgStove`) and `view(b, o)` |
| `512-605` | the pan (`pan`, `panHeat`) |
| `606-781` | raw batter (`batter`, masks, flecks, dents) |
| `782-1241` | the cooked jeon (`jeonBuf`, `jeonComp`, `jeon`, `flashRim`, `cutBuf`), LRU caches |
| `1242-1568` | heat effects (`heatKit`, bubbles, spatter, specks, band beat, landing burst) and steam (`fxSteam`, `steamPass`, `clearSteam`) |
| `1570-1958` | `twinkle`, `sparkle`, `marks`, `bubbles`, `spatula`, `bell`, `arrow`, `guide`, `knife`, `board`, `plate`, `soyDish`, garnish, `safeLook`, `plated`, `dish` (96 x 66), `dishSmall` (40 x 26) |
| `1963-2148` | ghost `hand`, `ICON_G` + `icon(name)`, `PART` + `particles` |
| `2153-2613` | scenes: `counter` (unused live), `tapScene :2212`, `flipScene :2270`, `sliceScene :2379`, `revealScene :2454`, `base :2508`, `carry :2545`, `revealClose :2567`, `shake :2604` |
| `2616-2651` | sim helpers (`toFood fromFood inFood pullIn`), the `API` object, `module.exports` |

### 4.2 Buffers, sizes and coordinate systems

- Buffer `{ w, h, d: Uint8ClampedArray(w * h * 4) }`, RGBA, alpha 0 or 255 only. Painters draw into a buffer they are
  given and never resize it.
- **Stage** 144 x 160 art px including a 2 px frame the live view never shows. Food centre `(72, 86)`; food box 64 x 48
  at `GEO.box0 = [40, 62]` (dents live there); jeon footprint radii `rx [21, 25, 29]`, `ry [14, 16, 19]`.
- **What is actually on screen:** only about 80 art px across (`LAY.VIEW_W`): on a 360 px phone `ox = -32`, so stage
  x 32..112 is visible; rows 28..132 are guaranteed between the HUD and the chip. One art px = 4 CSS px (320 wide),
  4.5 (360 @2) or about 5 (412). The jeon (about 58 art px) is 232 to 290 CSS px wide, about 70 % of the screen. Tap marks and
  guide ends must stay >= 32 CSS px from the screen edges (test N4, `tools/test-cook-live.js:1146`).
- **Close-up plate** `GEO.rev2` (`:166-167`): plate centre (72, 89) radii 39 x 26, food centre (72, 86), a soy dish at
  (98, 54); the plated food must stay in stage x 33..111.
- **Dish picture** for `COOK.drawDish`: `dish` 96 x 66, `dishSmall` 40 x 26 (`GEO.dish`, `GEO.small`); `drawDish` accepts
  any size 8..256 and picks `dishSmall` when the buffer is smaller than 96 x 66 (`js/cook.js:871-891`).
- Coordinates passed to painters: arrays `[x, y]` are art px; objects straight from the sim (`st.marks`, `st.lines`,
  `st.hand`, dust) are logical px (art = logical >> 1); dents are food-box px.
- Angles: integer degrees, clockwise; only the `SIN90` table. No float trig, no random, no clock anywhere in the art
  files (`tools/test-cook.js:1153`, `tools/test-cook-dishes.js:223`).

### 4.3 Palettes

- `APOLLO` 46 colours (`:117-122`), used for every prop (pan, board, plate, tools, stove, HUD icons).
- `F` / `FOOD` 24 colours (`:128-138`), for food, sauce, oil, glints and steam only: `J0..J6` the jeon ramp (deep red
  brown to cream), `G0` hard glint, `B1 B2` raw batter, `O0 O1` hot oil, `P0..P3` bright seaweed green, `T0 T1` dark
  seaweed, `C0..C2` chili red, `S0 S2` soy, `V0` steam. Each ramp is hue-shifted (shadows toward red, lights toward
  yellow), which is exactly the shading the owner's reference pictures use.
- `put()` accepts only these 70 colours and ignores anything else. The list is full at 24 (finding 4).
- Light comes from the upper left; 1 px lines, no anti-aliasing; contact shadows are "one step darker" of the ground
  colour (`DARK`, `shadeAt :210`) or a 50 % checker.

### 4.4 The painter API, per station and step

What `js/cook.js` calls and passes (jeon: `paintStage :1679-1714`; other dishes: `paintDish :1655-1678`):

| moment | jeon painter (`COOK_ART`) | other dish (`COOK_ART.dishes[id]`) | options passed |
|---|---|---|---|
| tap step (counter) | `tapScene(b, o)` `:2212` | `P.tapScene(b, o)` | `shape, dents, marks, per, flash, squash, dust, f` (+ jeon `herb`; + dishes `look, hit: { m, fr } or null, still`) |
| flip step (stove) | `flipScene(b, o)` `:2270` | `P.flipScene(b, o)` | `heat, band, res, arc: null or { f 0..3, lift }, dents, spatula (undefined = rest, null = hidden, [x, y]), arrow: null, 0 or 1, bump, flash, still, f, seed, fh, fbc, fl` (+ jeon `herb`) |
| slice step (board) | `sliceScene(b, o)` `:2379` | `P.sliceScene(b, o)` | `lines, cur, flash (line index), pop, hand, f, seed, still` (+ jeon `band, herb, dents, fl`) |
| plate | `revealScene(b, { geo: 'close', look, herb, f, t, seed, still })` `:2454` -> `revealClose :2567` | `P.revealScene(b, o)` | `t` = frames since the reveal (null = rest frame) |
| bleed around the stage | `view(b, { station, ox, oy, x0, x1 })` `:500` | (always `COOK_ART.view`) | station `'stove'` or anything else = counter wood |
| still station for a slide | `base(b, { station, pan, heat, f, still, look })` `:2508` | `P.base(b, o)` | stations: `stove`, `board`, `plate`, else counter |
| carried object | `carry(b, { what: 'pan', 'jeon' or 'cut', x, y, lift, shadow, herb, dents, band, look, seed })` `:2545` | `P.carry(b, o)` with its own `what` names (`pan`, `cake`, `skewer`) | must equal the still scenes pixel for pixel |
| ghost hand | `hand(b, { kind: 'tap', 'flick' or 'line', x, y or x0, y0, x1, y1, f 0..3, still })` `:1997` | (shared) | hot spot = fingertip |
| particles | `particles(b, [{ x, y, k, a, life }])` `:2139` | (shared) | kinds: `crumb drop steam dust spark herb` (+ `rice`, `juice` added by `js/cook-dishes.js:79-82`) |
| golden bell | `bell(b, x, y, f, still)` `:1692` | (shared) | painted by `render` over the stove scene |
| HUD icon | `icon(name)` `:2130` -> 16 x 16 | (shared) | names: `tap flip slice close heat again` (`ICONS`) |
| dish picture | `dish(b, look, o)` `:1929`, `dishSmall` `:1939` | `P.dish`, `P.dishSmall` | via `COOK.drawDish` |

Frame counters: `f` = global 12 fps frame; `fh` frames since heat-on; `fbc` frames since the last band change; `fl`
frames since the flip landed; `t` frames since the reveal; effects loop every 96 frames. Reduced motion: `f: 0`,
`still: true`.

A missing painter does not crash: `paintDish` falls back to the station background (`:1675-1676`); `drawDish` falls
back to a stub plate (`js/cook.js:886-888`), and the stub draws food **only for jeon** (`:849`).

### 4.5 How `js/cook-dishes.js` adds a dish

One object per dish with the same option shapes (`:8-22`): `JB = {}` at `:163` (`tapScene :165`, `flipScene :179`,
`revealScene :227`, `base :241`, `carry :243`, `dish :265`, `dishSmall :271`), `KK = {}` at `:340` (`sliceScene :341`,
`tapScene :380`, `revealScene :424`, `base :439`, `carry :444`, `dish :460`, `dishSmall :467`), exported as
`A.dishes = { jumeokbap: JB, kkochi: KK }` (`:474`). It reuses `COOK_ART` pieces through the public API (`A.base`,
`A.pan`, `A.board`, `A.marks`, `A.guide`, `A.knife`, `A.spatula`, `A.arrow`, `A.plate`, `A.twinkle`, `A.fxSteam`,
`A.steamPass`, `A.bubbles`) and adds particle colours to `A.PART`. Food shapes are small integer functions
(`riceCake :94`, `barPiece :288`, `grape :324`, `tangerine :333`). The rice cake is about 115 lines, the skewer about 190.
A second file (`js/cook-dishes2.js`, loaded after it) can add more dishes the same way without touching either file,
if it merges into `A.dishes` instead of replacing it.

### 4.6 What a NEW step kind needs painted

1. A scene painter `<kind>Scene(b, o)` for the 144 x 160 stage: cached static ground, then food by progress, tool,
   guides, flash rim, squash frames, `frame(b)` last. Must paint something sensible for `f: 0, still: true`.
2. A station: reuse `counter`, `stove`, `board`, or add a branch to `bgAt` / `view` (`:461-507`) and `base` (`:2508`).
   `view()` knows only "stove" versus "wood"; a sink, a pot of water or a mixing bowl on the wood counter needs no new
   station background, only the prop drawn in the scene and in `base`.
3. Food states driven by the step state (the references' "raw -> seared -> sliced": same silhouette, the surface
   changes), plus the cut or bitten face.
4. The tool: a rest pose in `GEO.rest` and the pose that follows the finger (`st.hand` or `L.finger`).
5. A ghost-hand pose for the gesture. `hand()` has `tap`, `flick`, `line` only (`:1997-2019`); a circle (stir), a hold,
   a drag-and-drop or a shake needs a new `kind` there and in `handSpec` (`js/cook.js:1068-1085`).
6. Particles: a `PART` kind if the food needs its own colour (`:2135-2138`) and a `PART_R` entry.
7. A `carry` sprite for the slide into and out of the step, pixel-equal to the still scene.
8. A 16 x 16 Apollo-only icon for the verb chip (`ICON_G :2020`), different from every other icon in at least 25 % of
   the union of their masks (`tools/test-cook.js:1120`).
9. If it ends the dish: `revealScene` frames (`t <= 3`, 4, 5, `>= 6`), `dish`, `dishSmall`.

### 4.7 How the art is tested

- `tools/test-cook.js` section 12b (12 checks): `GEO.food` = `TUNE.food`, `GEO.box0`, `GEO.markBase` = `TUNE.tap.at`,
  `GEO.dish` = `TUNE.dish`, the painter hook. Section 16 (22): palette, alpha, the same bytes in a fresh instance, the
  96-frame loop, measured liveliness of heat and landing effects, glints, thumbnails, steam, warm frames under 2 ms.
  Section 17 (33): the view / stage seam, bleed periods, carry = still-scene pixels, plate frames, stove props, icons,
  shake. Section "round 6 K1" (26): bell, knife 49 x 7, spatula, the '+' gaps. These are property checks, not pixel
  hashes, but they pin jeon geometry (`GEO.rest.spatula [100, 114]`, `GEO.bell [102, 44]`, `GEO.flipArrow [72, 110]`).
- `tools/test-cook-dishes.js` art sections: determinism (second instance, warm caches), Apollo + FOOD only, carry =
  still scenes, reveal inside x 33..111, `drawDish` never throws, no random / clock / float trig, ASCII only.
- Browser: L19 (what `cook.js` hands the painters, frame by frame), N2 / N3 (pixels on screen), N11 (bell pixels) in
  `tools/test-cook-live.js`.
- `tools/cook-shots.js` writes 23 PNGs to `docs/shots/cook/` for a person to look at (not in CI).
- No test can tell whether the food looks appetising (`docs/COOK_PROTO.md:415` says so).

---

## 5. Checklists

### 5.1 How to add a new step kind (every place to touch)

**Simulation (`js/cook.js` above `:901`)**

1. `KIND.<kind> = { multi, sayHalf, init, down, move, up, cancel, tick, alt, look, tag }`. `alt`, `look` and `tag` are
   called unguarded (`:606`, `:542`); the node test asserts the full interface for the three old kinds
   (`tools/test-cook.js:43`).
2. State through `base(kind, { box: boxOf(food), ... })` (`:251-255`); progress only through `rise` (`:257`); events
   only through `emit` (`:220`); set `st.prog = t` on progress (idle hints count from it).
3. Numbers: a new frozen table **outside `TUNE`** (like `TUNE_R :177`). If the kind needs its own pause after the
   step, teach `betweenOf` (`:516`) to read that table (it reads only `TUNE[kind].betweenMs`).
4. `WORDS.title[kind]` and `WORDS.verb[kind]` (`:151-152`), plus any result words. Every string must be in the
   `VOCAB` list of `tools/test-cook.js:808-809` (already there for later use: '젓기', '올리기', '하나 올렸어',
   '세 개 올렸어', '꾹꾹 눌렀어', '미역국', '두부', '김', '깨'), inside KS X 1001, no digits (`:815`), none of the
   banned words (`:782`, which include '탔', '완벽', '최고', '실패', '성공', '점수').
5. `validLook` (`:737-751`: without a branch every pot past this step is refused), `validTag` (`:752-757`),
   `defaultLook` (`:819-828`), `normLook` (`:836`), and the look-key collision of finding 1 (`lookOf :674-679`).
6. `describe` (`:680-689`) if the step should add a sentence to the plate description; `verb` (`:690-696`) if the
   label changes mid-step (as heat -> flip does); `hintAt` (`:697-702`) if the 5 s idle rule does not fit (anything
   that waits on purpose, like simmering).
7. Recipe: add steps with `kind`, parameters, `food`, optional `station` (`:162-173`).

**Live (`js/cook.js` below `:903`)**

8. `STATION[kind]` (`:926`) and `CARRY_R[recipe]` (`:930`).
9. `onEvent` cases (`:1133-1176`) for the new event types: `fxAdd`, `burst`, `buzz`; add the progress events to
   `PROGRESS` (`:1132`); new fx names need a branch in `juiceAt` (`:1051-1067`).
10. `handSpec` (`:1068-1085`) + the mappings in `maybeDemo` (`:1103`) and `checkIdle` (`:1112`).
11. `verbKey` (`:1330-1335`) + an icon name that exists in `COOK_ART.ICONS` (an unknown name silently draws `tap`,
    `iconOf :1336-1339`).
12. The scene call: a branch in `paintStage` (`:1686-1693`, jeon path) and/or `paintDish` (`:1661-1672`).
13. Finger-following tools: `follow` (`:1409-1413`) is flip-only today.
14. Sound: `snd: { act }` on the sim event. Acts the audio side already plays: `pick tap sizzle flip cut step quiet
    done stir clink simmer place lift back` (`foley/manifest.json` `map.cook`); an unknown act is silent
    (`js/audio.js:1103`). Check `SND_FREE` (`:940`) for acts that fire faster than 120 ms. Add the preload hint to
    `COOK_NEXT` (`js/audio.js:958-962`). The node test's act whitelist is `tools/test-cook.js:628`
    (`tap cut stir sizzle flip quiet lift place back step done`).
15. Haptics: `buzz(name)` with a `HAPTICS.PATTERNS` name; the earlier owner decision was "only tap, flip, slice";
    counts are compared exactly in N6 and D1.
16. Stickers: a rule or script line per act in `js/cook-stickers.js:250-290`; the act must be in `ACTS` of
    `tools/test-cook-stickers.js:63` (`stir simmer place serve eat idle` are already there).
17. `live()` (`:1917-1931`) if a test needs to read kind-specific state.

**Art:** section 4.6. **Game side:** nothing (the game never sees step kinds).

**Tests and docs:** `tools/test-cook.js` load pins (`:35-45`), section 1 (the chip path: `<= 3` presses per step),
section 11 whitelists (`:607-608` look keys, `:628` acts), section 14 `VOCAB`; a new section for the kind (determinism
at 30 / 60 / 120 / 240 Hz, progress never falls, 60 s idle finishes nothing, resume at the boundary, JSON round trip);
`docs/COOK_PROTO.md` sections 2, 3, 5, 8.

**The smallest example (a `stir` kind: drag in circles, either direction, 3 turns):**

```js
var TUNE_K = deepFreeze({ stir: { turns: 3, rMin: 16, rMax: 110 } });       // outside TUNE: TUNE_HASH stays 2827089308
function angOf(st, s) {                                                     // degrees round the food centre, or null
  var dx = s.x - st.cx, dy = s.y - st.cy, r = Math.sqrt(dx * dx + dy * dy);
  return r < TUNE_K.stir.rMin || r > TUNE_K.stir.rMax ? null : Math.atan2(dy, dx) * 180 / Math.PI;
}
function stirBy(st, deg, t) {
  st.deg = Math.min(st.need, st.deg + deg); st.prog = t;
  var n = Math.floor(st.deg / 360);
  while (st.turn < n) { emit(st, 'turn', { i: st.turn, snd: { act: 'stir', i: st.turn } }); st.turn++; }
  rise(st, st.deg / st.need, t);
}
KIND.stir = { multi: false, sayHalf: true,
  init: function (step, seed, food) { return base('stir', { box: boxOf(food), cx: food.cx * 2, cy: food.cy * 2,
    need: clampInt(step.turns, 1, 9, TUNE_K.stir.turns) * 360, deg: 0, turn: 0, pen: null }); },
  down: function (st, s) { if (!st.done) st.pen = { id: s.id, a: angOf(st, s) }; },
  move: function (st, s) { var p = st.pen, a; if (!p || p.id !== s.id || st.done || (a = angOf(st, s)) === null) return;
    if (p.a !== null) { var d = a - p.a; if (d > 180) d -= 360; else if (d < -180) d += 360; stirBy(st, Math.abs(d), s.t); }
    p.a = a; },
  up: function (st, s) { if (st.pen && st.pen.id === s.id) st.pen = null; },
  cancel: function (st) { st.pen = null; },
  tick: function () {},
  alt: function (st, t) { if (!st.done) stirBy(st, 360, t); },              // one chip press = one turn
  look: function (st) { return { turns: st.turn }; },
  tag: function () { return null; } };
```

plus: `WORDS.title.stir` / `WORDS.verb.stir` = '젓기' (already in `VOCAB`); a `validLook` branch
(`sameKeys(lk, ['turns']) && isIntIn(lk.turns, 0, 9)`), `validTag` (`null`), `defaultLook`, `normLook`; `STATION.stir`;
`handSpec` + a `'circle'` pose in `COOK_ART.hand`; `verbKey` + a `stir` icon; a `stirScene`; `onEvent case 'turn'`
(`fxAdd({ k: 'flash' })`, a small `burst`); `PROGRESS.turn = 1`. Sound and stickers work with no further change
(`stir` is in the manifest and in `RULES`). This is an illustration of the touch points, not tested code.

### 5.2 How to change a recipe's steps

1. Edit `RECIPES[i].steps` (`js/cook.js:162-173`); `run.n` follows.
2. Decide what happens to saved pots of that recipe: change its pot hash on purpose (add the step list to the hash in
   `tuneOf :187-191`), then mirror the number in `COOK_TUNES` (`js/app.js:4162`) and in `tools/smoke.js:7667`,
   `tools/test-cook-dishes.js:26-29`. Without that, old pots are filtered only by `validLook` per position.
3. Per-recipe live tables: `CARRY_R[id].between` has one entry per station change, indexed by `si - 1`, and a
   `reveal` name (`:930`); the art's `carry` must know each `what`.
4. Each step's `food` must resolve (`foodOf :193-196`); add boxes to `TUNE_R[id].food` (this also changes that
   recipe's hash, which is what you want).
5. Looks: `normLook` rebuilds old book lines and the waiting table dish against the **current** steps (`:830-841`);
   parts that no longer validate fall back to defaults, so old pictures of that dish change. `MEAL.normDish` caps the
   look at 2048 bytes.
6. The art object needs a scene for every kind the recipe now uses, in the station the step names.
7. Stickers: the per-dish scripts key on counts that assume today's steps (`tap i: 8` = the ninth hit, `cut i: 1` =
   the second line, `js/cook-stickers.js:273-289`).
8. Audio: `COOK_NEXT` preloads in jeon order (`js/audio.js:958-962`).
9. Tests that hard-code the three recipes' step lists: `tools/test-cook.js:38-41` and sections 1, 2, 9, 10, 11, 15;
   `tools/test-cook-dishes.js` (all sim sections and the golden pot); every test in `tools/test-cook-live.js`;
   `tools/test-cook-dishes-live.js` D1 (expected stations, slides and haptic counts per dish), D3, D5;
   `tools/test-cook-audio.js` (act order of a jeon); `tools/test-cook-stickers*.js`; smoke Z (`tools/smoke.js:7667`,
   `:7683`, `:7694`); `tools/cook-shots.js` (capture times keyed to jeon's three steps).
10. Docs: `docs/COOK_PROTO.md` sections 2 and 3; `docs/COOK_STICKERS.md`.

### 5.3 Where a dish is listed (add or rename a dish = all of these)

| place | what |
|---|---|
| `js/cook.js:150` | `WORDS.dish[id]` (name; also the dialog's aria-label and the plate description) |
| `js/cook.js:162-173`, `:177-181` | `RECIPES`, `TUNE_R[id]` (-> `tuneOf(id)`) |
| `js/cook.js:930`, `:937`, `:999` | `CARRY_R[id]`, `PART_R[id]`, the per-recipe sound rename |
| `js/cook-dishes.js:474` | `COOK_ART.dishes[id]` painters |
| `js/cook-stickers.js:272-290` | sticker script |
| `js/app.js:4162` | `COOK_TUNES[id]` (resume from the counter; also gates `cookSrc`'s `&recipe=`, `:4087`) |
| `index.html:370` | tray chip (`data-recipe`, `aria-label`, icon) |
| `tools/make-dish-icons.js:23-117` + `assets/manifest.json` `icon.dish.*` | 16 x 16 tray icon; `--check` runs in CI |
| `js/meal.js:29-33` | `DISHES[id] = { name, fx }`; `fx` must be `sparkle`, `star` or `petal` (`FX_NAME :34`; the scene accepts only those three, `js/scene3d.js:4457`) |
| `js/scene3d.js:4113-4135`, `:4185-4186` | the 3D dish on the table and the order pieces vanish per bite (4 bites, `:4152`); unknown id = covered plate |
| tests | `tools/test-cook.js:38` (ids and order), `tools/test-meal.js:54` (`DISHES exact`), `tools/test-cook-stickers.js:157`, `tools/smoke.js:7655` (chip names) |

Assumptions that `jeon` is special: default recipe `RECIPES[0]` (`js/cook.js:1485`), `tuneOf('jeon') === TUNE_HASH`
(`:188`), `foodOf`'s last fallback (`:195`), `paintDish` returning `false` for jeon (`:1656`), `dishArt('jeon')` =
`COOK_ART` itself (`:933`), `CARRY_R.jeon` as the fallback (`:1187`, `:1208`), the dialog's initial label (`:1768`),
`stubDish` (`:849`). Hiding jeon from the book is safe; deleting it is not.

---

## 6. The dish picker today, and replacing it with a recipe book

### 6.1 Today: the tray (`#dish-pick`, in the game page)

- Markup: `index.html:370`: `<dialog id="dish-pick" aria-label="요리 고르기" tabindex="-1">`, one `.dp-row`, three
  `button.dp-chip[data-recipe]` (`aria-label` 해초전 / 주먹밥 / 과일 꼬치), each a 16 x 16 PNG
  (`assets/icons/dish/<id>.png`, from fixed character grids in `tools/make-dish-icons.js:23-90`, **not** from the dish
  painters). No visible text, no `title`.
- Style: `css/style.css:1734-1753`: paper chips copied from the kitchen's, transparent backdrop (`:1744`), and
  `html.dish-picking` hides `#btn-go` and `#stick` (`:1751`).
- Logic (`js/app.js`): `openCook` (`:4101-4133`) -> `mealBusy()` guard -> no recipe given -> `cookPot()` (`:4163-4170`).
  **Resume rule:** a pot that is a plain object with `ver 'cook-1'`, a recipe in `COOK_TUNES`, `tune ===
  COOK_TUNES[recipe]` and `si >= 1` opens the kitchen straight into that dish; anything else (no pot, an empty pot
  `si 0`, an old or broken pot) opens the tray (`:4104-4106`). The kitchen applies its own, stricter version in
  `begin` (`js/cook.js:1487-1496`).
- `dishPickOpen` (`:4172-4205`): `showModal()`; a chip -> `openCook(opener, kbd, recipe)` (`:4186-4188`); a tap outside
  the chips closes, except on the counter button's own rectangle, so a double tap on the counter does not blink the
  tray shut (`:4179-4184`); Esc / Android back = `cancel` (`:4190`); on close without a pick, focus returns to the
  counter button with or without a ring (`:4194`); opened by key -> the first chip gets focus (`:4202-4203`).
- `dishPickFit` (`:4206-4214`): chip 64, gap 16, bottom `max(16, safeBottom + 16)`, icon = 16 x `floor(3 dpr)` device
  px, every edge on a device px.

### 6.2 Load timing of the kitchen frame (matters for where the book lives)

First open (`js/app.js:4111-4131`): the iframe is created with `src = cook.html?embed=1...`, the overlay dialog opens
at once (a flat `#d7b594`), and `cookWaitStart()` (`:4137-4144`) arms two timers: **300 ms** -> show `#cook-wait`
(the crawling octopus and a picture-only close button); **6000 ms** without `ready` -> close the overlay and toast
'부엌을 못 열었어. 다시 눌러 줘.'. Closing before `ready` sets the frame to `about:blank` so a late load cannot write a
pot (`cookAbort :4146`).

Inside the frame, before `ready`: render-blocking CSS `css/style.css` (198 KB, the whole game stylesheet),
`vendor/fonts/galmuri.css` (71 KB), `css/cook.css` (12 KB), `css/cook-stickers.css` (2 KB) (`cook.html:22-25`), then
five blocking scripts in order: `haptics` 4 KB, `cook-art` 190 KB, `cook-dishes` 32 KB, `cook` 127 KB, `cook-stickers`
24 KB (`cook.html:59-63`; sizes are uncompressed bytes from `wc -c`). Then the inline script opens the kitchen
(`go(true)`, `:148`: build, fit, **begin = a run exists and an `si 0` pot is written**, `js/cook.js:1502`), and only
then posts `ready` (`:166`). `js/audio.js` (110 KB) is injected without waiting (`:132-136`).

Every later open is instant: the frame is kept, and `safe`, `motion`, `open` are posted before the dialog shows
(`js/app.js:4127-4129`).

### 6.3 Option (a): the book lives in the game page, before the frame opens

Evidence for:
- It shows at once: nothing has to load (the dialog is in `index.html`), and the play room stays visible behind it
  through the transparent backdrop, so "the counter opens a book" reads as part of the room.
- The dialog mechanics already exist and are tested in smoke Z: modal, focus in and out, Esc / back, the double-tap
  guard, the `dish-picking` class, device-pixel placement. A book can reuse `dishPickOpen` almost as is.
- Nothing changes inside the kitchen: `cook.html` still opens straight into a step, so the standalone browser suites
  (`test-cook-live`, `test-cook-audio`, `test-cook-stickers-live`, `test-cook-dishes-live`) and `cook-shots` are
  untouched.
- The frame can load behind the open book. Today its load starts only after the pick.

Evidence against:
- The game page has no recipes and no painters (`index.html:425-442` loads neither `cook.js` nor `cook-art.js`).
  Pictures must be files. A page-size, appetising dish picture needs a new node tool that paints with
  `COOK.drawDish` (possible: `tools/test-cook-dishes.js:21-23` loads `cook-art` + `cook-dishes` + `cook.js` in a node
  vm) and writes PNGs, manifest keys and a `--check` step in CI, as `tools/make-dish-icons.js` does for the icons.
- Recipe facts get a third and fourth copy: ids, names, order, what the steps are, and the pot hashes
  (`COOK_TUNES`, already cross-checked against the kitchen only by smoke, `tools/smoke.js:7667`).
- "What I have cooked" (the kitchen's `book`, with a look per dish) and `seen` live under the kitchen's key; the game
  would re-implement `normStore`'s validation to read them (it reads only `pot` today, `js/app.js:4165`).
- Standalone `cook.html` gets no book.
- A DOM book has to do the DPR 2.625 snapping by hand for every element (as `dishPickFit` does for one row).

### 6.4 Option (b): the book is the kitchen frame's first screen

Evidence for:
- Everything it needs is already in the frame: `COOK.RECIPES`, `WORDS.dish`, `COOK.drawDish(recipe, look, seed, w, h)`
  at any size from the same painters as the plate (`js/cook.js:871-891`), the saved `book` and `seen`
  (`readStore :960`). One source of truth; `COOK_TUNES` and `cookPot` in `js/app.js` could go.
- Painted on the kitchen canvas it is pixel-exact at every DPR with no extra rules (section 3.2 rule 5), at the same
  4 to 5 CSS px per art px as the stations, and it can **slide** into the first station with the existing slide code
  (a snapshot as the outgoing picture is exactly what `again()` does, `js/cook.js:1524-1528`). "Book closes, the
  counter slides in" is nearly free.
- `pick` (sound and sticker) already fires when a dish starts (`:1505`, `:1509`).
- Standalone `cook.html` gets the book too.

Evidence against:
- The book cannot appear before the frame is ready. On the first open the player gets the flat colour, then the wait
  picture, then the book (section 6.2). Fix: create the frame early (on entering the play room) with a "load, do not
  open" switch, because `cook.html` opens the kitchen at load (`:148`) and that creates a run, writes a pot and cues
  `pick`. `ready` today means "opened"; it would have to mean "loaded".
- It breaks "open goes straight into a step", which the live code assumes (`open()` needs `begin()`, `:1864`; `L.run`
  is never null while open; `L.screen` is `'step'` or `'reveal'`) and which tests assert: smoke Z
  (`tools/smoke.js:7683`, `z.screen === 'step' && z.kind === 'tap'`), every standalone test that opens without
  `?recipe=`, the audio suite ("every scene starts in an open step", header of `tools/test-cook-audio.js`), stickers
  K1 ("pick reaches the stickers at open"). **An explicit opt-in removes this risk:** show the book only when the host
  asks (`open { book: true }` / `&book=1`); with no flag `cook.html` behaves exactly as today.
- No visible words: pictures only, names in `aria-label`s. A canvas book still needs one real focusable button per
  recipe laid over the picture (the pattern of `.ck-verb`: a DOM button positioned by `fit`), or keyboard and screen
  reader users cannot pick.
- A pot must not be written until a dish is picked (today it is written at `begin`, `:1502`); otherwise the
  "empty pot of another dish" rules (`:1489-1495`) fire on every book visit and fill `potOld`.

### 6.5 Common to both

| topic | what the code says |
|---|---|
| resume | a pot with `si >= 1` wins over any pick in the kitchen (`js/cook.js:1489`) and skips the tray in the game (`js/app.js:4104-4106`). With finer steps this case becomes common (a 6-step dish closed after step 1 resumes on the next tap). "Book first" and "resume" pull against each other: section 10, question 1 |
| focus and keyboard | opened by key -> the first choice has focus and rings show; closed without a pick -> focus back to `#btn-cook`; the `kbd` fact is passed into the frame (`&kbd=1`, `open { kbd }`) because the kitchen's own last input may be the Esc that closed it (`js/app.js:4085-4087`) |
| `mealBusy()` | the counter does nothing during a meal staging (`js/app.js:4102`); the book must keep that guard |
| the cannot-load path | 300 ms wait picture, 6 s toast, `about:blank` (section 6.2); with (b) this is the book's loading state |
| weekly task and notices | the weekly notice waits while `#cook-overlay` is open (`js/app.js:5148`); a game-page book dialog is not in that selector |
| fonts | any new Korean string in `js/*.js`, `css/*.css` or `index.html` is scanned by `tools/subset-fonts.py --check` (CI job `fonts`); aria-only strings count too |

The lane briefs choose (b). My reading of the evidence agrees, with two conditions the code makes necessary:
(b) with the opt-in flag and an early-loaded frame gives the better book (real dish
pictures, the player's own cooked dishes, a continuous slide into the first step, one recipe table); (a) is the
smaller change and has no load risk. If the lanes are short of time, (a) with pre-rendered `drawDish` pictures is the
fallback that cannot break the kitchen suites.

---

## 7. The result today, and what "serve and call the octopus" needs

### 7.1 Today, in order (function names)

1. **The last step finishes** -> `onStepEnd` -> `finish()` (`js/cook.js:1198`, `:1211-1219`): a book line is added, the
   pot is cleared, `opts.onResult(result)` runs once per run id. This is 400 ms (1000 ms after a flip) **before** the
   plate shows.
2. `cook.html:109-112` posts `result { v: 1, id, recipe, seed, look, day }`.
3. `cookMsg` (`js/app.js:4099`) -> `mealDish(d)` (`:4286-4296`): `MEAL.normDish` -> `user.table = dish` (it **replaces**
   a waiting dish) -> `save()` -> remembered in `mineMeals` -> because the overlay is open, `mealAppear = true`.
4. The plate, the `again` chip. A second dish made with `again` posts a second `result` and replaces the first on the
   table record; both are in the kitchen's book.
5. **The kitchen closes** (close chip, Esc, back) -> `close { kbd }` -> `#cook-overlay.close()` -> the `close` listener
   registered at boot by `mealInit` (`:4570`) runs first: `mealAppear = false; if (inPlay()) mealTableSync(true)` ->
   `scene.setTableDish({ id, recipe, look, seed }, { appear: true })` (`:4302`). The scene plays 6 frames at 12 fps:
   the dish 2 px up for 2 frames, a squash, 2 steam dots (`js/scene3d.js:4153`, `stepDish :4161`); under reduced motion
   it is just there. Then `openCook`'s own listener runs (`:4119-4125`: tell the frame, fix focus).
   This is the "dish just pops onto the table" the owner describes: the character has not moved and may be standing
   anywhere in the room, because the counter tap never walked it to the counter (`:4255`).
6. **Sit**: `#btn-table` (the booth hotspot) or `#btn-seat` (yellow dot at `mealSpot.seat`) -> `mealTableTap`
   (`:4377-4387`) -> `scene.playerSitTable()` (`js/scene3d.js:4194-4205`): walk to the aisle point
   `BOOTH.me.aisle = [0.21, -0.30]` at 1.8 m/s, hop 0.34 s onto the seat, face the table. Seated with a dish, a second
   tap on the table eats alone (`mealEatRun(my, null)`).
7. **Call**: `mealUI` (`:4338-4368`) shows `#btn-call` over the octopus's seat only while `mealCallOK()`
   (`:4322-4326`). Press -> `mealCall` (`:4390-4405`): hide the chip, `syncFromStore()`, `MEAL.canCall`,
   `scene.octCanCome()`, `MEAL.makeAsk` (one answer per dish; the demo rule: the very first call eats, later calls eat
   with probability 0.6 from a seed of dish id, name and birth, `js/meal.js:205-210`), `save()`, then `mealStage`
   (`:4421-4451`): `scene.octToTable()` -> silent think bubble '...' -> `think` 1.0 s -> `ponder` -> a toast with the
   decision and who decided ('데모 규칙') -> `eat` or `watch` -> `mealEatRun` (`:4453-4472`): `MEAL.eat` saves the meal
   and clears the table, four bites (`scene.mealBite`), `mealFinish` (`:4474-4484`): the day effect blooms, log rows.
8. **`mealBusy()`** (`:4281`) = `mealRun && mealRun.busy`: true from the call press (or the eat tap) to `mealEnd`.
   While true the counter and the arcade do nothing (`:4102`, `:4048`) and `#scene.meal-busy` hides the table buttons
   (`css/style.css:1773`).

Every guard on this path:

| guard | where |
|---|---|
| `MEALR` loaded | `:4287`, `:4378`, `:4391` |
| a 3D scene with the table API (`mealApi`) | `:4279`; each call site checks its own function |
| `inPlay()` (in the play room), `!roomJob` (no door job), `!furnMode` | `:4378`, `:4323` |
| `!mealBusy()` | `:4378`, `:4391`, `:4323`, `:4102`, `:4048` |
| the store re-read before a call | `syncFromStore()` `:4393` |
| `MEAL.canCall`: a dish waits, **I am seated**, the octopus is not away, not asleep, not busy | `js/meal.js:191-199`; inputs from `mealOct()` `js/app.js:4318-4321` (`busy` = a walk invitation in flight, a ceremony, the salon, furniture mode, another meal) |
| `scene.octCanCome()`: play room shown and entered, no transition, the octopus parented to the attic, not up in the loft, not away / asleep, no ceremony, no salon, no play kit, fade done, context alive; or already seated | `js/scene3d.js:4247-4252` |
| the scene refuses in `playerSitTable` when not in the play room, sitting, hopping, or input is not allowed (intro, door job, transition, furniture mode) | `js/scene3d.js:4195`, `:2925` |
| watchdog every 300 ms: scene lost, left the room, a walk invitation, hidden tab -> abort; stood up (unless stage `coming`) -> abort; over 30 s -> abort | `mealTick` `js/app.js:4520-4533` |
| a new dish arriving while a meal is staged is queued by the scene | `js/scene3d.js:4149`, `:4156-4160` |

### 7.2 What a "serve" button on the result screen needs

**(a) Close the kitchen with a reason.**
- Kitchen: a host option (for example `opts.onServe`, set only in the embed and only when the host says serving is
  possible). At the reveal the chip's icon and label change (`verbKey :1332`, `updVerb :1342-1345`; the sim's
  `verb()` can stay as it is and keep `again` for standalone), and `onVerb`'s reveal branch (`:1458`) calls a new
  `serve()` instead of `again()`: remember the run id, `close()`, and hand `{ kbd, serve: id }` to `onClose`
  (`onClosed :1828`). The 900 ms guard (`AGAIN_MS`) should stay: it stops the last cutting stroke from pressing the chip.
- `cook.html`: add the field to the `close` message (`:101`) and read the host's capability from the URL and from
  `open` (`:88-91`, `:144`).
- The new `aria-label`s (K.md names '문어 불러 같이 먹기' and '식탁에 두기') must be added to `WORDS` and to `VOCAB`
  (`tools/test-cook.js:808-809`), and the pictures to `ICON_G` or the sprite set.
- `COMMON.md` contract C2 makes this a separate message, `serve { id, mode: 'call' | 'table' }`, posted right before
  the kitchen closes itself. Messages from one frame arrive in order, so the game sees `serve` and then `close`; what
  matters on the game side is only that the boot-time close listener knows about the pending serve (below).
- The close chip keeps today's meaning: close without serving -> the dish appears on the table as now.

**(b) The character carries the dish from the counter to the table and sits.** What exists:

| need | exists? | where |
|---|---|---|
| walk to a point with routing round the arcade, counter and booth boxes | yes, internal | `plWalkTo(to, face)` `js/scene3d.js:3140-3164`, `plRoute :3091`, obstacle boxes `:2949-2951` |
| walk to the table aisle, hop onto the seat | yes, exported | `playerSitTable()` `:4194` |
| a point in front of the counter | **no** | the counter is `PROOM.counterBox` (`:4881`): x 0.62..2.77, z -2.75..-2.15 in play-room metres for `PLAY_R = 2.8`; with the body radius 0.25 a stand spot near (1.35, -1.85) is free (computed from the constants, not tested) |
| the character walks to the counter when it is tapped | **no** | `on('btn-cook', ...)` opens at once (`js/app.js:4255`); doors do walk first (`goRoom(..., { walkFirst: true })`, `:4019`) |
| a hold pose | **no** | limbs are set in `stepPlayer` (`:3229`; the arm swing at `:3303`, the rest pose at `:3333`); `stepMeBite` (`:4235-4244`) shows the accepted way to override an arm after `stepPlayer` (its comment says those values are saved and restored by the portrait renderer) |
| a dish in the hands | **no** | the table dish is one merged mesh built by `dishParts()` / `dishRebuild()` (`:4113-4145`) and placed at `BOOTH_DISH` each frame in `stepDish` (`:4161`); the same mesh could follow `PL.pos` while carried |
| putting it down with a beat | yes | `setTableDish(dish, { appear: true })` `:4146-4155` |
| a walk promise that survives a cancel | **no** | `plWalkTo` never resolves after `plStop()` (`:3084`, comment `:3182`); `wleg` (`:3186`) wraps `cancel` to resolve `null` |
| placing the player somewhere without a walk | debug only | `debugPlayerAt(x, z)` `:6918` |

So the scene needs one new exported function (say `playerServeTable(dish, { instant })` -> `Promise<bool>`) that: checks
the same guards as `playerSitTable`; if the player is already seated at the table (the kitchen can be opened from the
seat, `wip/round6/eat-spec.md:473`) skips the walk and just plays the appear beat; otherwise stands the character
at the counter spot (instantly: the overlay has just uncovered the room), sets the carry state, walks to the aisle
with the cancel-safe wrapper, puts the dish down (`appear`), hops onto the seat. On any cancel (stick, room change,
hidden tab, lost context) and under reduced motion it must place the dish on the table at once and resolve: the dish
is a saved fact and the walk is only staging (the rule the meal code follows everywhere, `docs/MEAL.md:26`).
Distance counter spot -> aisle point is about 1.9 m (a little more round the sofa corner), so roughly 1.1 to 1.3 s of
walking at 1.8 m/s plus the 0.12 s anticipation and the 0.34 s hop (computed, not measured).

Game side (`js/app.js`):
1. Suppress the pop: when the `close` message carries `serve`, the `mealInit` close listener (`:4570`) must not call
   `mealTableSync(true)`; it starts the serve run instead.
2. A staging run that makes `mealBusy()` true during the carry (`mealRun = mealNewRun('serving', ...)`, `:4388`), so a
   tap on the counter, the arcade or the table cannot start something over the walk.
3. `mealTick` must not treat `'serving'` as "stood up" (`:4525`).
4. After the scene resolves: set `mealDishKey` to the dish id (the scene already shows it), `mealEnd`, then (c).
5. If any guard fails (not in the play room, `roomJob`, `furnMode`, the scene lacks the function): fall back to
   today's `mealTableSync(true)`. Nothing is lost.

**(c) Call the octopus through the existing path.** After the sit promise resolves `true`, call
`mealCall(btn, kbd)` (`:4390`). It needs the player seated (that is why the order is fixed) and it does all the honest
work: one stored answer per dish, the labelled demo rule, the toast with who decided. `mealCallOK()` also asks for
`mealSpot.call` (the chip's on-screen position); `mealCall` itself does not, so a programmatic call works even when
the chip would be off screen.

**When the octopus cannot come** (each case is already detected; none needs a new rule):

| case | detected by | what the code does on a call today | honest result for "serve" |
|---|---|---|---|
| asleep (night, or the nap after a walk) | `oct.state === 'sleep'` -> `canCall` `'asleep'` (`js/app.js:4320`, `js/meal.js:196`); scene `:4251` | returns `false`, nothing saved, the chip stays hidden | the character serves and sits; no call. The chip appears by itself when `mealCallOK()` turns true (polled every 300 ms). A tap on the table eats alone |
| away on a walk | `oct.state === 'away'` or the depart ceremony -> `'away'` (`js/meal.js:195`) | same | same; when it comes back the play room already shows the corner note (`noteBack`, `js/app.js:4218`) and then the chip |
| busy (a walk invitation in flight, a ceremony, the salon, furniture mode) | `mealOct().busy` (`js/app.js:4320`) | same | same |
| up in the loft, or mid transition | `octCanCome()` (`js/scene3d.js:4250`) | `false` | same |
| already seated from an earlier dish | `TB.oct === 'seated'` (`js/scene3d.js:4248`) | `octToTable` resolves at once, no walk-in | the call goes straight to "think" |
| 2D fallback (no WebGL) | `sceneMode !== '3d'` -> `mealApi()` false (`js/app.js:4279`); `js/scene2d.js:170` has a counter and no table | no table UI; the dish waits in the save | the host reports "cannot serve" at open; the kitchen keeps `again` / close. Never show a serve chip that does nothing |
| another tab ate or replaced the dish | `syncFromStore()` (`js/app.js:2144`), then `mealTable()` is null or has another id; `MEAL.merge` keeps this tab's fresh dish for 60 s unless it was eaten (`js/meal.js:363-376`) | - | nothing to carry: close only. The other meal's rows are drawn from the record as today |
| `mealBusy()` | `js/app.js:4281` | `mealCall` returns `false` (`:4391`) | should not happen (the counter is blocked while busy); if it does, fall back to the plain appear |
| the room is not the play room when the overlay closes | `inPlay()` | - | no staging; the dish is placed without a beat on entering the room (`mealRoom`, `js/app.js:4534-4535`) |
| reduced motion | `reduced()` / `st.reduced` | walks and hops are instant (`js/scene3d.js:4202`, `:4268`) | the dish and the character are simply at the table; the call follows |

Two things a design must decide, because the code cannot (section 10, questions 2 and 3): what the chip shows when
the octopus cannot come (the frame does not know the octopus's state unless the host sends it), and whether cooking
again from the seat should make the character stand up first (standing makes a seated octopus leave,
`tableStood`, `js/scene3d.js:4215-4220`).

---

## 8. Tests

### 8.1 What each file asserts (counts)

"Ran" = I ran it here in node. "Static" = the number of `check(` / `ok(` call sites I counted in the source; loops over
phone sizes and dishes make the real number larger. The dynamic totals for the four browser suites are the ones the
round-6 lane reports give (`wip/round6/reports/K1.md`, `K2.md`); I did not run browser tests.

| file | kind | CI job | total | groups |
|---|---|---|---|---|
| `tools/test-cook.js` | node, 12 s | `fast` | **263 passed (ran)** | load pins 13 · 1 chip path 6 · 2 determinism (two instances, 30 / 60 / 120 / 240 Hz, 200 random paths) 10 · 3 progress never falls 3 · 4 idle 60 s 8 · 5 flip bands, taps never flip 11 · 6 slice '+' 19 · 7 tap, two fingers, hold 11 · 9 resume at every boundary + JSON round trip 5 · 9b host clocks 2 · 10 pot rules 11 · 11 result envelope 12 · 12 drawDish 9 · 12b shared geometry 12 · 15 verifier fixes 12 · 14 static checks 38 · 16 art look 22 · 17 close-up art 33 · round 6 K1 26 |
| `tools/test-cook-dishes.js` | node | `fast` | **106 ok (ran)** | recipes, `TUNE_R`, `tuneOf` 15 · full runs by chip and by touch 31 · pots per recipe (incl. the golden `ada2967` pot) 13 · art 34 · drawDish 9 · static 4 |
| `tools/test-cook-stickers.js` | node | `fast` | **250 ok (ran)** | pictures 32 x 32 and manifest; animated strips; every rule and script picks a catalog sticker and a known act; same run id = same stickers; big moments ignore the gap; scripts before rules; no feeling face in 1,200 runs; listenAudio; no `Math.random` |
| `tools/test-meal.js` | node | `fast` | **134 passed (ran)** | 0 load 19 · 1 words 9 · 2 normDish 23 · 3 demoAnswer 8 · 4 makeAsk 12 · 5 canCall 7 · 6 eat / active 12 · 7 rows, toast, desc, aria 21 · 8 normalize 8 · 9 merge 11 · 10 slim 3 · 11 no model code 1 |
| `tools/test-haptics.js` | node | `fast` | 59 ok (ran; source not read) | on / off, honest `supported()`, activation, patterns |
| `tools/make-dish-icons.js --check` | node | `fast` | "up to date" (ran) | the four PNGs equal the grids byte for byte; `close.png` equals `COOK_ART.icon('close')` |
| `tools/test-cook-live.js` | Playwright | `suites` (cook-live) | 247 static, 432 dynamic (K1 report) | L1 touch run + again 10 · L2 keyboard only 12 · L3 quiet chip 10 · L4 flip with a fake clock 9 · L5 layout at seven sizes 8 · L6 sound-off feedback and act order 20 · L7 reduced motion 9 · L8 reload in step 2 6 · L9 bad pots to `potOld` 9 · L10 full storage 4 · L11 held Enter 3 · L12 notice slot 7 · L13 `?rec=1` replay in node 2 · L15 quiet chip strokes 10 · L16 hints and the result timing 12 · L17 edge strip, first demo, no old elements 10 · L18 run id, keys, hidden tab, auto 8 · L19 what the painters receive 20 · N1 zero text on every screen 10 · N2 (+N3, N4) fit numbers, HUD boxes, icons on device px 17 · N5 slides 7 · N6 haptics 15 · N7 resume and again 4 · N10 safe-area insets 5 · N11 bell and ding 19 · L14 no console errors 1 |
| `tools/test-cook-audio.js` | Playwright + real Web Audio | `suites` (cook-audio) | 134 static, 205 dynamic (K1 report) | scenarios A full dish by touch 31 · B reduced + chip 6 · C sound off 5 · O ding without the manifest 4 · D missing files 7 · E `file://` 4 · F hidden tab 6 · H resume at the flip 5 · I first touch 6 · J missing variant 3 · K sfx 0 4 · M flip variants and timing 16 · N manifest 503 12 · L 1 · G 20 (bodies not read) |
| `tools/test-cook-stickers-live.js` | Playwright | `suites` (cook-stickers-live) | 134 static, 217 dynamic (K1 report) | K1 wiring 29 · K2 where and how long 26 · K3 touches pass through 18 · K4 reopen, again, nothing after close 15 · K5 hidden tab 6 · K6 reduced 8 · K7 sound off 6 · K8 words 8 · K9 13 · K10 4 (bodies not read) |
| `tools/test-cook-dishes-live.js` | Playwright | `suites` (cook-dishes-live) | 33 (K2 report) | D1 per dish: stations, slides, zero text, aria-label, haptic counts · D2 again · D3 pot rules · D4 exactly one `result` with exactly 7 fields · D5 kkochi plays `place` · D6 bell in jumeokbap |
| `tools/smoke.js` scenario Z (`scenarioSceneTap`, kitchen part `:7464-7695`) | Playwright, `index.html` | `smoke` (letter Z) | about 40 `ok(` lines | tray (label, chips, backdrop, hidden big button, double tap), cannot-load path, `COOK_TUNES` = the kitchen's `tuneOf`, resume rules, one `result`, embed boot without the door, safe insets, message order `safe, motion, open`, kbd flag, reduced motion reaching the frame |
| `tools/smoke.js` scenario EAT (`scenarioEat`, `:7844-8070`) | Playwright, `index.html` | `smoke` (letter EAT) | about 60 `ok(` lines | first call eats, toast with the tail, rows, effects, second dish while seated, reload, next day, eating alone, a sleeping octopus, two tabs, reduced motion, 2D |
| `tools/cook-shots.js` | Playwright | not in CI | its own `[condition, message]` lists | 23 PNGs into `docs/shots/cook/` |
| `python3 tools/subset-fonts.py --check` | python | `fonts` | - | every non-ASCII character in `js/*.js`, `css/*.css`, `index.html` is in the font subset |
| `tools/test-export.js` | node (+ `--crawl`) | `fast`, `suites` (export-crawl) | (not read) | only game files ship; `js/` ships whole (`tools/export-site.js:33`) |

CI (`.github/workflows/test.yml`): `fast` (`:31-69`, 10 min) runs the node tests in order; `fonts` (`:71-81`); `plan`
(`:83-96`) greps the scenario letters out of `tools/smoke.js`; `smoke` (`:98-127`) runs one runner per letter with
`SMOKE_ONLY`; `suites` (`:129-174`) runs one runner per browser suite. Every job fails the run. A new test file is
**not** picked up automatically: add a line to `fast` or an entry to the `suites` matrix (`:136-155`).

### 8.2 Which assertions break, per change

**(i) The step strip is removed**

| where | what |
|---|---|
| `tools/test-cook-live.js:172` | helper `T.strip()` |
| `:584` (L8) | `'done,on,up'` after a reload in step 2 |
| `:1129`, `:1133`, `:1136` (N4) | `T.rect('.ck-strip')` returns `null` (`:131`) and the next lines read `strip.x`: a TypeError fails the whole of N2 |
| `:1138-1144` (N4) | `icons.length === 5` (3 strip + close + chip) and the index rule `j === 4` = chip, `j === 0` = raised icon |
| `:1169` (N4) | "no HUD item overlaps a guide" uses `strip` |
| `:1335-1336` (N10) | `strip.y >= 47 + 8`: TypeError on `null` |
| `tools/test-cook-stickers-live.js:500` | tolerant (`if (x)`) |

Nothing else, provided `LAY.HUD` stays 64. If the HUD row is made smaller, `hudB`, `k`, `oy`, `H` change and with them
the fit table (`tools/test-cook-live.js:30-37`), N2, N10 (`:1333-1334`), sticker placement K2 and the documented
table in `docs/COOK_PROTO.md:118-125`.

**(ii) Recipes get more steps and new kinds** (in place, as the lane brief plans)

- `tools/test-cook.js`: load pins `:38-43` (ids, step kinds, the kinds' interface list); section 1 (labels
  `['톡톡', '불 켜기', '뒤집기', '썰기']`, "tap 3 / flip 2 / slice 2 presses", `si < 3`, `:137-168`); section 2 (the
  path makers read `steps[0]` and `steps[2]` of jeon, `:47-51`); sections 3 to 9b (all drive jeon); 10 (fixtures such
  as "si 3 (past the end)" and `looks[1].band`, `:549-559`); 11 (tags `[null, 'golden', 'straight']`, the look-key
  whitelist, the description strings, the act whitelist, `:604-632`); 12 (30 jeon dishes); 12b (cut order); 15
  (guide lengths, replay with a pot). The art sections 16, 17, K1 (81 checks) stay valid only while the jeon painters
  stay as they are.
- `tools/test-cook-dishes.js`: all three sim sections (59 checks), including the golden `ada2967` pot (`:100-110`),
  which by design cannot resume once jeon changes.
- `tools/test-cook-live.js`: every test. The helpers assume tap -> flip -> slice (`verbThrough(T, 'tap', 3)`,
  `toFlipQuiet`, `toGolden`), step indexes 0, 1, 2, the stations counter -> stove -> board -> plate (N5) and the haptic
  counts (N6).
- `tools/test-cook-audio.js`: the act order of a jeon (A, B and others, unverified in detail).
- `tools/test-cook-stickers.js` and `-live.js`: the scripts' `tap i: 8` and `cut i: 1` moments; K1 "every cooking
  moment in order".
- `tools/test-cook-dishes-live.js`: D1 expectations per dish (`w.st`, `w.sl`, `w.buzz`), D3 (`kind === 'tap'` at
  `si 1`), D5 (nine `place` acts).
- `tools/smoke.js`: `:7667` (`live.si === 1` after a one-step pot), `:7683` (`kind === 'tap'`), `:7694` (tap then
  stove under reduced motion).
- `tools/cook-shots.js`: all capture times.
- `tools/test-meal.js:54-55` only if dish names or effects change.

**(iii) The tray becomes a book**

- `tools/smoke.js` Z: `:7473-7475`, `:7489-7498`, `:7611`, `:7627` (taps on `#dish-pick .dp-chip[...]`), `:7647-7649`
  (double tap, backdrop tap), and the assertions `:7655-7661` (label '요리 고르기', three names, transparent backdrop,
  hidden big button, chips 44 px with 16 x 16 art), `:7666-7673` (resume rules, `COOK_TUNES`).
- If the book is the frame's first screen: also `:7683` and every standalone test that opens with no `?recipe=` and
  expects a step (unless the book is opt-in, section 6.4).
- `tools/cook-shots.js:404` (taps the jeon chip in the embed capture).
- `tools/make-dish-icons.js --check` if the icon set changes (`close.png` is still used by `#cook-close`,
  `index.html:368`).
- `tools/test-cook-dishes-live.js` D3 / D4 use `?recipe=` and `opts.recipe`, which should keep working.

**(iv) The "again" chip becomes "serve"**

If `again` leaves the kitchen altogether: `tools/test-cook.js:154` (`verb(run) === '다시'`), `:1113` (`ICONS` has
`again`); `tools/test-cook-live.js` L1 (`:241-249`), L2 (`:286`, `:294`), L3 (`:344-348`), L6 (`:510-512`), L10
(`:651`), L16 (`:805-819`), L18 (`:905`), L19 (`:1016-1019`), N1 (`:1076`), N5 (`:1211`), N6 (`:1267-1270`), N7
(`:1322`); `tools/test-cook-stickers-live.js` K4, K5; `tools/test-cook-dishes-live.js` D2 (`:82-87`);
`tools/test-cook-audio.js` F, H, N (mentions of again, unverified); `tools/cook-shots.js:339`, `:352`. Several of
these use `again` only as the cheapest way to start a second dish in one page (L3, L6, L19, N7, K4).
If `serve` is added only when the host passes a callback and `again` stays otherwise: none of them.

**(v) `TUNE` changes**

`tools/test-cook.js:37` and `:590` (the pinned hash), `:36` (the formula), `:764` (keys that must exist), 12b
(`GEO` = `TUNE.food` / `TUNE.tap.at` / `TUNE.dish`, `:689-692`, `:706`), 15 (guide lengths 128 and 88, `:725`);
`tools/test-cook-dishes.js:26-29` (all three hashes: the two `TUNE_R` hashes are derived from `TUNE_HASH`) and the
golden pot (`:109`, `tune === 2827089308`); `js/app.js:4162` with `tools/smoke.js:7667`; numbers quoted in
`docs/COOK_PROTO.md` (`:58`, `:63`, `:84`, `:288`). On players' devices: every half-made dish moves to `potOld`.

### 8.3 Hard-coded numbers and names that mirror the kitchen elsewhere

| mirror | where |
|---|---|
| the three pot hashes | `js/app.js:4162` (`COOK_TUNES`), `tools/smoke.js:7667`, `tools/test-cook-dishes.js:26-29`, `docs/COOK_PROTO.md:63`, `:288` |
| the pot version `'cook-1'` and the key `'ppolppol_cook_v0'` | `js/app.js:4165-4166`; the key also in `cook.html:98` and the tests |
| recipe ids and names | `index.html:370`, `js/meal.js:29-33`, `js/cook-stickers.js:272-290`, `js/scene3d.js:4117-4129`, `tools/make-dish-icons.js:23-117` |
| effect names | `js/meal.js:34`, `js/scene3d.js:4457` |
| reveal timing | `js/audio.js:954` (`COOK_LAND = 0.4` s = plate frame 5 at 12 fps); the flip's landing at 0.256 s inside the sound files (`js/audio.js:937`) against `L.landAt = +3 frames` (`js/cook.js:1157`) |
| the sound order of a jeon | `js/audio.js:958-962` (`COOK_NEXT`) |
| haptic patterns | `js/haptics.js:11-23`, `docs/COOK_PROTO.md:27`, `tools/test-haptics.js` |
| layout numbers at seven phone sizes | `tools/test-cook-live.js:30-37`, `docs/COOK_PROTO.md:118-125` |
| palette names used by the icon tool | `tools/make-dish-icons.js:17-21` (copies of `F` and Apollo values) |
| `--check` of the icons | byte compare of 4 PNGs and their `assets/manifest.json` keys (`tools/make-dish-icons.js:120-126`) |
| the wait picture sizes | `js/app.js:4147-4156` (56 x 39 frame of the loading strip) |

---

## 9. Risks and traps (things that look simple and are not)

1. **Flat looks.** Two steps of one kind in a recipe overwrite each other's look (`js/cook.js:674-679`, `:836`).
2. **`TUNE` is a hash input.** Adding one key for a new kind changes every pot hash (`js/cook.js:185`); the comment at
   `:79-80` says so. Put numbers beside `TUNE_R` instead.
3. **The pot hash does not cover the step list** (`js/cook.js:187-191`); `VERSION` (`:77`, checked at `:763`) is the
   blunt, reliable switch.
4. **The `seen` list holds 8 names** matching `/^[a-z]{2,8}$/` (`js/cook.js:786`).
5. **`put()` drops unknown colours silently** (`js/cook-art.js:222-226`) while `blit()` copies any bytes (`:253-264`):
   a sprite with an off-palette colour paints fine and then fails "Apollo + FOOD only" in the node tests
   (`tools/test-cook.js:862`, `tools/test-cook-dishes.js:156`). FOOD is full at 24 (`tools/test-cook.js:843`).
6. **Static guards over the kitchen files** (`tools/test-cook.js:776-817`): no `S.` (the regex `\bS\.` also matches a
   variable named `S` and a sentence ending in "S." in a comment), no `APP.`, no `BRAIN`, no `Math.random` even in
   comments, ASCII-only comments in `js/cook.js`, every `WORDS` string in `VOCAB`, no digits in `WORDS`, banned
   syllables (for example '탔'), no function name shared between the two halves. The list of scanned files is fixed
   (`:780`): a new file is not guarded until it is added.
7. **`result` precedes the plate** (`js/cook.js:1198`). Closing the kitchen during the last `between` still delivers
   the dish.
8. **The appear beat fires from a boot-time listener** (`js/app.js:4570`), before `openCook`'s close listener.
9. **`plWalkTo` promises can hang** (`js/scene3d.js:3140-3164`, `:3084`, `:3182`). `playerSitTable` already has this
   problem in a small way: a stick push during the walk leaves `TB.meWalk = true` (`:4197-4199`), so
   `tableInfo().me` reads `'walking'` until the next successful sit (`:4396`).
10. **`mealTick` aborts runs that are "not seated"** (`js/app.js:4525`) and anything older than 30 s.
11. **The frame is another document.** Its own `AUDIO` and `HAPTICS` instances, its own user activation (the first
    touch inside the frame unlocks sound; the `pick` at open is normally dropped, `docs/COOK_PROTO.md:262`), its own
    `document.hidden`. Sound for anything that happens after the overlay closes (carry, set down) belongs to the
    game page; `docs/MEAL.md` says the table has no sound or haptics at all this round.
12. **`env(safe-area-inset-*)` is 0 inside the frame**; insets arrive by message (`js/app.js:4067-4084`,
    `cook.html:120-125`). New kitchen layout must read `.ck-probe`, never `env()` directly.
13. **Fractional DPR.** Everything in the HUD is snapped by hand (section 3.2). A DOM book page with borders,
    centred images or percentage positions will blur at 2.625; the canvas will not.
14. **Zero visible characters is tested on every frame** (N1, D1 `r.txt === ''`, smoke `z.text === ''`), including
    `title` attributes. A recipe book inside the frame cannot use a text node anywhere, not even a page number.
15. **`open()` equals "a dish is running".** `L.run` is never null while open (`:1864`, `:1681`), `ready` is posted
    after the kitchen opened (`cook.html:148`, `:166`), `begin` writes a pot at once (`js/cook.js:1502`), and the
    pot rules move "an empty pot of another dish" to `potOld` (`:1489-1495`, max 4 kept): a book that starts runs
    eagerly will churn `potOld`.
16. **The 250 ms gate is the slide.** `TUNE.gateMs` (`:89`) and `SLIDE_AT.length` x 83 ms (`:938`) are equal on
    purpose; lengthening a slide lets presses land during it.
17. **`settle` emits `quiet` after every step** (`:546`), which stops any sound loop; a step that hands a simmering
    pot to the next step loses its loop there.
18. **The verb chip can finish any step** (`K.alt`) and the test hook `COOK.auto` depends on it (`:1739-1746`); a
    kind without a bounded `alt` path hangs every suite that uses `auto` (audio B, stickers).
19. **Haptic counts are compared exactly** per dish (N6, D1) and only `tap`, `flip`, `cut` are counted
    (`js/cook.js:1854`); a new `buzz` name is invisible to `live().stats` unless added.
20. **A dish the game does not know** is drawn as a covered plate (`js/scene3d.js:4130-4132`), gets no day effect
    (`js/meal.js:276`, `:292`) and no meal row (`:320-321`), silently.
21. **`MEAL.normDish` rejects a look over 2048 bytes** (`js/meal.js:144`), silently: the dish never reaches the
    table. The pot has the same budget (`TUNE.pot.maxBytes`, asserted at `tools/test-cook.js:573`; today's largest
    pot is 255 bytes).
22. **`js/audio.js:1394`** skips the UI click sound for buttons inside `#scene, .ck-stage, .ck-verbrow`.
    `.ck-verbrow` no longer exists (round 5 removed it), and the close chip and the verb chip are not inside
    `.ck-stage`, so with sound on they presumably also play the generic UI tap (unverified: I did not read the audio
    test that would show it). New end buttons would behave the same.
23. **The sticker strip's visibility rule** depends on `hudB`, `STICK_ROW` and `oy` (`js/cook.js:1575-1584`); at
    320 x 568 it is hidden today (K3 asserts that).
24. **Fonts.** New Korean strings in `js/*.js` (even aria-only ones in `WORDS`) can make `subset-fonts.py --check`
    report a stale subset (CI job `fonts`); regenerating needs `fonttools` and `brotli`.
25. **Shared files are moving.** `js/scene3d.js` changed twice under this research (a merge, then lane slots). The
    lane slots keep edits apart, but line numbers in briefs and reports go stale within the hour.
26. **The recorded sounds for later kinds have never been played** by the game or by a test: `stir` (3), `clink`,
    `simmer`, `lift` (`docs/COOK_PROTO.md:419`). `place` is the exception since round 6 (the skewer). Their loudness
    against the music is unjudged.

---

## 10. What I opened, what I did not, and open questions

**Read in full:** `js/cook.js`, `js/cook-dishes.js`, `js/cook-stickers.js`, `css/cook.css`, `css/cook-stickers.css`,
`cook.html`, `js/haptics.js`, `tools/test-cook-stickers.js` (assertion lines), `tools/test-cook-dishes.js` (assertion
lines), `.github/workflows/test.yml`, `js/app.js:4040-4640`, `js/meal.js:1-390`, `wip/round7/briefs/RESEARCH.md`.

**Read in part:** `js/cook-art.js` (contract, palette, `GEO`, backgrounds, hand, icons, particles, scene entry points,
`base`, `carry`, `revealClose`; not the jeon texture, heat or steam internals); `js/scene3d.js` (the table block,
the player walk and input code, the counter build, the spot code, the API export; nothing else of its 7,030 lines);
`js/scene2d.js` (the spot table and API lines only); `js/audio.js` (`:927-968`, `:1092-1114`, `:1142-1159`,
`:1388-1400`); `index.html` and `css/style.css` (the kitchen and table lines); `docs/COOK_PROTO.md` (sections 0 to
10, the head of 12, 14; not 5.1, 11, 13); `docs/MEAL.md` (sections 1 and 6); `wip/round6/eat-spec.md` (4.3 to 4.5,
10.2, 10.3); `wip/round6/reports/K1.md` (first 70 lines), `K2.md` (first 120); `wip/round6/briefs/K1.md`, `K2.md`
(ownership sections); `tools/test-cook.js` (header, sections 1, 10, 11, 12, 12b, 15, 14, and every assertion message
of 16, 17, K1); `tools/test-cook-live.js` (header, helpers, N4, N10, N11, and grep hits for strip / again / chip);
`tools/smoke.js` (assertion lines of Z's kitchen part and of EAT); `tools/make-dish-icons.js`, `tools/cook-shots.js`
(headers and grep hits); `foley/manifest.json` (`map.cook` and the sound ids); the round-7 briefs `K.md`, `T.md`,
`COMMON.md` C1 to C3, `SPRITES.md` (first 30 lines), skimmed late.

**Headings or grep only (treat claims about them as unverified):** `wip/round5/cook-spec.md`, `docs/COOK_STICKERS.md`,
`tools/test-cook-audio.js` (header and scenario list), `tools/test-cook-stickers-live.js` (header),
`tools/test-cook-dishes-live.js` (assertion lines only), `tools/export-site.js`, `tools/subset-fonts.py`,
`tools/test-export.js`, `tools/test-haptics.js` (ran, not read), `foley/README.md`, `foley/CREDITS.md`.

**Pictures looked at:** `docs/shots/cook/01-tap-start`, `05-flip-golden`, `07-slice-start`, `09-result` (360 x 740);
`wip/round6/shots/K2/tray-360x740@2`, `kkochi-strip-360x740@2`; `wip/round6/shots/M/2-call-chip-360x740@2`;
`wip/round6/shots/D/3-seated-412`.

**Not run:** any browser test. Ran in node: `test-cook.js` (263), `test-cook-dishes.js` (106),
`test-cook-stickers.js` (250), `test-meal.js` (134), `test-haptics.js` (59), `make-dish-icons.js --check`.

**Open questions the code cannot settle**

1. A half-made dish and "the book opens first": resume silently as today, or open the book on that dish with a
   visible "continue" state? With five or six steps per dish a half-made pot will be common.
2. What do the end buttons show when the octopus cannot come, given that the frame learns `canCall` only at open and
   the octopus's state can change while cooking? (Send an update message when it changes, or accept a stale button and
   let the game decide at press time.)
3. If the player cooks from the seat (allowed today, with the octopus still seated): does the character stand up and
   walk to the counter first? Standing makes a seated octopus leave (`js/scene3d.js:4215-4220`).
4. Should the character walk to the counter when the counter is tapped (up to about 2.3 s from the door at 1.8 m/s),
   or appear there when the kitchen closes?
5. Old notebook lines and a dish waiting on the table from the old build: draw them with the new sprites, keep an old
   painter for them, or accept a default picture?
6. Is `result` meant to move to the reveal, or stay at the end of the last step?
7. With the 3D table dish replaced by a sprite, what shows "one bite gone" (four bites per meal)?
