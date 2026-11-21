# Lane T — from the kitchen to the table (`lane/7-t`)

Read `COMMON.md` first, then `ANSWERS.md`, the owner's words (`wip/round7/README.md` A4, A5, E4), `docs/MEAL.md` (the meal
system as built in round 6: read all of it), the kitchen code map `wip/round7/research/07-codebase-map.md` sections 1, 6, 7,
the scene map `wip/round7/maps/world.md` sections 4, 6, 8, and `SPRITES.md` section 1.

## Why

The owner: "다시하기 버튼보다도 문어 불러서 먹을 수 있도록 … 지금은 그냥 바로 부침개가 탁자 위에 띡 올라와있는데 유기적인 연결이
부족한 느낌." Today the finished dish simply appears on the table when the kitchen closes. This lane makes one continuous
chain: **the plate is served in the kitchen → my character carries it to the table → sets it down → sits → the octopus
comes in and sits → its labelled answer → eating → the day effect.** It also owns which recipes are unlocked.

## You own

- `js/app.js`: the kitchen block (`openCook`, `cookMsg`, `cookSrc`, the wait / cannot-load code, `dishPickOpen` and friends,
  `COOK_TUNES`, `cookPot`) and the meal block (everything `meal…`), plus new code under `[7-T]`.
- `js/meal.js`, `tools/test-meal.js`, `docs/MEAL.md`; new `js/recipes.js` (global `RECIPES`), `tools/test-recipes.js`.
- `js/scene3d.js`: the dining block only (the booth, `setTableDish`, `tableInfo`, `playerSitTable` / `playerStandTable`,
  `octToTable`, `octTableBeat`, `mealBite`, `octLeaveTable`, `setAura` and the aura particles) and one new carried-dish
  prop; new API names under `[7-T]`. Lane P owns the character's body and gait, lane W the rooms and camera: call their
  existing functions, do not edit them.
- `index.html`: `#dish-pick` (remove it) and `#cook-overlay`; `css/style.css`: the tray rules (remove) and new rules under
  `[7-T]`; `tools/smoke.js`: the kitchen part of scenario Z and scenario EAT; `tools/meal-stub-scene.js`.

## What to build

1. **Opening the kitchen.** The tray of three chips goes away (`#dish-pick`, its code and CSS, `COOK_TUNES`, `cookPot`): the
   recipe book now lives inside the kitchen frame (lane K), and the frame itself decides whether a half-made pot resumes.
   `openCook` always opens the frame and sends the context of contract C2: `ctx.canCall` (true when pressing the call chip
   right now would bring the octopus: the same conditions as the chip, with no dish needed) and `ctx.unlocked`
   (`recipesUnlocked()`). Answer every `result` with a fresh `{ ppolCook: 'ctx', canCall }`. Keep the wait picture, the 6 s failure toast and the `mealBusy()` guard exactly as they are.
2. **The serve message.** `cookMsg` handles `{ ppolCook: 'serve', id, mode }` (C2). Remember it; when the overlay has
   closed, play the hand-off for the dish with that id (it was already saved to `S.user.table` at `result`, as today):
   - my character, standing at the counter (put it there when the kitchen closes if it is elsewhere: there is no walk
     to the counter today), holds the dish (the new carried prop shows the dish picture), walks to the table (the camera
     follows as in other walks), sets it down (the dish is now on the table; one small settle beat), then: mode `call` →
     sits on its seat and the call starts through the existing `mealCall` path (it needs a seated player and already
     handles asleep, away, busy, another tab; if the octopus can no longer come, nothing more happens and the chip logic
     stays as it is); mode `table` → stays standing by the table, free to move (the dish waits, like today's waiting dish).
   - The code map (section 7) lists what stands in the way: the close listener that pops the dish onto the table must not
     fire for a served dish; the scene exports no walk-to-point and a cancelled walk never resolves (use the `wleg`
     pattern); `mealTick` aborts staging runs that are not seated or older than 30 s; only `mealRun.busy` blocks the
     counter and the arcade. Add what is missing under your markers without editing lane P's or W's functions.
   - closing the kitchen with its close chip sends no `serve`: the dish appears on the table as today.
   - Whatever interrupts the walk (a stick or key input, a room change, an invite, a hidden tab, the scene refusing) ends
     it at once in the end state: the dish on the table, the character where it stands, no call. Reduced motion, the 2D
     fallback and a scene without the new functions skip the walk the same way. Nothing is saved differently: a reload in
     the middle shows the waiting dish on the table.
   - While the hand-off plays, the counter, the arcade machine and the table buttons do nothing (extend `mealBusy()` or add
     a sibling guard used by the same callers).
3. **Dishes old and new** (contract C2). The legacy ids `jeon`, `jumeokbap`, `kkochi` stay known everywhere exactly as
   today (a waiting dish, old meal records and diary rows must keep drawing). Add the new ids `jeon2`, `gyeran`,
   `jumeokbap2`, `kkochi2`, `cake` to `js/meal.js` (names '해초전', '계란말이', '주먹밥', '과일 꼬치', '딸기 케이크'; effects
   sparkle, `bubble` '방울', star, petal, `confetti` '색종이', with the same sentence patterns; the demo answer rule
   untouched: it must not depend on the dish) and to the scene: the table shows a new dish with lane A's picture
   (`COOK_SPR.get('dish.…', frame)` per C2's picture list; for `jeon2` the frame is the saved look's band; load
   `js/cook-sprites.js` in `index.html` under `[7-T] 스크립트`; when the sprite is missing draw the covered plate the
   scene already has for unknown dishes), at a whole number of device pixels per art pixel, readable from the play-room
   camera at 360x740; each of the four bites must visibly take something away (for a sprite: reveal less of it, or step
   through "bitten" masks you derive from the picture); two new aura kinds drawn like the existing three (2 px grains, no
   hearts, no faces).
4. **Recipes.** `js/recipes.js` (DOM-free, node-tested): the five new ids, which are always unlocked (`jeon2`, `gyeran`,
   `jumeokbap2`), `normalize(state)`, `eat(state, id, today)` → `{ state, n, gift }` (gift exactly once, when the count
   reaches 3 and the recipe was locked), `unlocked(state, hadNotebook)` (adds `kkochi2` when the kitchen notebook already
   had a line before this round), `merge(a, b)` for two tabs (higher count, earliest gift date; never lose a gift). The app
   block stores `S.user.recipes` (C8), reads the kitchen notebook (`ppolppol_cook_v0`, read only), and exports
   `APP.recipeEat` and `APP.recipesUnlocked` (C3) plus a test hook `APP.cookServe(mode)` that acts like the frame's `serve`
   for the waiting dish.
5. **Words.** Any new line follows `docs/MEAL.md` section 9 (no feelings, no tastes; decisions as '-기로 했어'). The gift of
   a recipe is announced by lane S / N, not here.

## Checks

`tools/test-meal.js` (new dishes and effects, rows for them, the demo answer unchanged), `tools/test-recipes.js`, scenario Z
(the counter opens the frame directly; the tray checks go), scenario EAT (add: `serve` with `call` → carried → placed →
seated → the call path; `serve` with `table`; an interrupted walk; reduced motion; 2D). Run `npm test`, `SMOKE_ONLY=Z,EAT
node tools/smoke.js`, and look at the hand-off at 360x740 and 412x915 (four screenshots: holding, walking, set down, the
octopus arriving).

## Report

As in `COMMON.md`. Include the beat list with durations, every guard, and what you need from K, A, P or W to be fully tested.
