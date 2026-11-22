# Lane T report — from the kitchen to the table (`lane/7-t`, base 493571b)

## Conclusion

The chain is built and tested on this branch: **kitchen `serve` → my character holds the dish at the counter → walks to the
table (camera follows) → sets it down → (`call`) sits → the existing call path → labelled answer → eating with a close-up
picture → day effect.** The tray is gone; the counter opens the kitchen frame directly with `ctx`. Five new dishes, two new
effects (방울, 색종이), recipe unlock state with `APP.recipeEat` / `APP.recipesUnlocked`. Saved data: nothing renamed or
removed; one new optional field `S.user.recipes`.

Not testable on this branch alone: the real end buttons (lane K's kitchen sends `serve`; here the old kitchen is driven by
a posted message in smoke Z) and lane A's pictures inside the suites (the base `js/cook-sprites.js` is empty; the suites
use a small stand-in, the screenshots use lane A's pushed file dropped in by a route).

## Changes

| file | what | why |
|---|---|---|
| `js/meal.js` | `DISHES` + `jeon2 gyeran jumeokbap2 kkochi2 cake`, `FX_NAME` + `bubble` '방울', `confetti` '색종이'; new pure helpers `MEAL.pic(recipe, look)` → `{ id, frame }`, `MEAL.biteLine(spr)`, `MEAL.biteMask(spr, eaten, line, amp)` | C2 dishes and effects; one bite rule shared by the table sprite and the close-up. The demo answer is untouched |
| `js/recipes.js` (new, global `RECIPES`) | `normalize`, `eat`, `unlocked`, `hadNotebook`, `merge`, `same` | C3 |
| `js/app.js` kitchen block | `cookSrc` adds `&ctx=`; `cookMsg` answers `result` with `ctx` and remembers `serve`; `openCook` no longer picks a recipe or opens a tray, sends `ctx` in `open`; tray code (`dishPick*`, `COOK_TUNES`, `cookPot`) removed | brief 1, 2 |
| `js/app.js` meal block | `mealInit` close listener asks `mealServeOnClose()` first; `mealTick` / `mealDrop` know the `serving` stage; `mealTableSync` passes `pic`; `mealEatRun` opens / bites the close-up; `mealEnd` hides it | brief 2, 3 |
| `js/app.js` `[7-T]` | recipes (`recipesRead`, `recipesUnlocked`, `recipeEat`, `recipesAdopt`), `mealCanCallNow`, `cookCtx`, `cookCtxSend`, `cookServeMsg`, `mealServeOnClose`, `mealServe`, `mealServeCut`, `cookServeTest`, close-up (`mealCloseOpen / Bite / Hide / Draw`); exports `recipeEat, recipesUnlocked, cookServe, cookCtx, cookMsgTest, mealClose` | brief 2 – 4 |
| `js/scene3d.js` dining block | `setTableDish` keeps `dish.pic`; `dishRebuild` / `dishParts` / `stepDish` / `biteTake` draw a pictured dish as a sprite and follow the hands while carried; `tableInfo()` adds `carry`, `sprite`; `setAura` accepts every key of `AURA_C`; two new aura layouts; `stepTable` calls `stepCarry` | brief 3 |
| `js/scene3d.js` `[7-T]` | `dishPicOf`, `dishSprGet`, `dishSprLayout` (one `Points`, one point per sprite px, snapped to pixel centres, same material variant as the aura grains, dimmed at night), `CARRY`, `carryLeg` (the `wleg` pattern), `dishAt`, `carryEnd`, `playerCarryDish`, `playerCarryCut`, `stepCarry`; API `playerCarryDish`, `playerCarryCut`, `debugDishSprite` | brief 2, 3 |
| `index.html` | `#dish-pick` removed; `#meal-close` under `[7-T] 단추`; `js/recipes.js` and `js/cook-sprites.js` under `[7-T] 스크립트` | |
| `css/style.css` | tray rules removed (the shared paper rule now names only `.cw-close`); `.meal-close` under `[7-T]` | |
| `tools/smoke.js` | Z kitchen part: tray checks → direct open, `ctx` in URL and `open`, `ctx` answer to `result`, `serve` → carried, counter blocked, end state; new `scenarioEatServe` under `[7-T]`, listed as a second `EAT` entry | |
| `tools/test-meal.js`, `tools/test-recipes.js` (new), `tools/meal-stub-scene.js`, `docs/MEAL.md` §11 | | |

## Beats and guards

| beat | length | |
|---|---|---|
| `hold` | 0.35 s | placed at the counter spot (1.30, −1.80), both arms forward, dish in the hands |
| `walk` | about 1.3 s at 1.8 m/s | to the table aisle (0.21, −0.30), `PL.camGap` 0.5 m |
| `put` | 0.25 s (3 frames at 12 fps) | hands → table, then one squash frame |
| `sit` (`call` only) | 0.34 s hop | existing `playerSitTable`, then existing `mealCall` |

Guards: `mealServe` starts only with `MEAL`, no other run, in the play room, no door job, no furniture mode, no walk
invitation, visible tab, a 3D scene with `playerCarryDish`; the serve id must be the waiting dish's id. The scene refuses
(`'no'`) when not in the play room, hopping, seated on the attic sofa, input not allowed, or a meal is staged. During the
hand-off `mealBusy()` is true (counter, arcade, table buttons, chip do nothing). Cut to the end state (dish on the table,
character where it stands, no call) by: stick / keys, room change, invitation, hidden tab, lost context, furniture mode,
15 s (app) / 30 s (watchdog), import / reset (`mealDrop`). Reduced motion: no walk (`call` = seated at once and the call
follows; `table` = the dish is on the table). 2D / a scene without the function / `'no'`: the old appear beat.
`ctx.canCall` is false in 2D.

## Existing lines I changed in shared files (outside my own blocks)

- `js/app.js` `adoptRemote`: one added line `if (same) recipesAdopt(S, R);` after the `MEAL.merge` lines (two tabs must not
  lose a gifted recipe).
- Everything else is inside the kitchen block, the meal block, the scene's dining block, `#dish-pick` / tray CSS (mine to
  remove) or under `[7-T]` markers.

## Decisions the owner should confirm

1. Reduced motion + "문어 부르기": the character is simply seated and the call follows (not "dish on the table, no call").
2. The close-up panel sits at the top centre of the scene, 2 CSS px per art px on 360 (one step smaller on 320-wide
   screens so it never reaches the table), with no words.
3. One bite = a quarter of the food's width above the container line (me from the right, the octopus from the left); the
   eaten place shows the container. It is derived from the picture, not hand-drawn per dish.
4. The character appears at the counter when the kitchen closes (there was never a walk to the counter).
5. Old players keep the fruit skewer through a remembered mark `S.user.recipes.kkochi2.old = true`.
6. The night dimming of the table sprite is one flat step (×0.7 at night), not real lighting.

## Player-facing words and names

- New dish and effect names (rows, toasts' rows, scene description, table button names): '계란말이', '딸기 케이크', '방울',
  '색종이'; '해초전', '주먹밥', '과일 꼬치' for the new ids. Sentence patterns unchanged, e.g. '계란말이를 같이 먹었어. 오늘
  하루 둘 다 방울이 따라다녀.' No new sentence. `#meal-close` has no words and is `aria-hidden` (the meal row is read from
  the log). No new `aria-label`. Font subsets are unchanged (`subset-fonts.py --check`: stale none).

## Checks added / changed

- `tools/test-meal.js` 188 → 205: sections 12 (five dishes: result accepted, names, the demo answer ignores the dish, fx,
  rows today / past, no feeling words) and 13 (pictures, bite line, masks, round plate).
- `tools/test-recipes.js` new, 53.
- smoke Z (kitchen part): tray checks replaced (see table). **After lane K merges** the old-kitchen assumptions in that
  part (`COOK.live().kind === 'tap'` right after opening, `COOK.auto`, `.ck-close`) need K's names; the `serve` there is
  posted by the test, K's real buttons should replace it.
- smoke EAT: `scenarioEatServe` (64 checks): call chain, blocked buttons, close-up size / device px / no text / not over
  the table, bubble grains, seated `table` serve, standing `table` serve, stick cut, hidden tab, reload, room change, no
  pictures, legacy dish, reduced motion, 2D, recipes (gift once, saved, unknown fields kept, old notebook, read-only).

## Suites run

`npm test` green (all 17) · `node tools/test-recipes.js` 53/0 · `SMOKE_ONLY=Z` 151/0 · `SMOKE_ONLY=EAT` 108/0 ·
`tools/test-scene-perf.js` see "not verified" below · `python3 tools/subset-fonts.py --check` stale none.

**Add to `npm test` and CI:** `node tools/test-recipes.js`.

## Screenshots (`wip/round7/shots/T/`, taken with lane A's pushed `js/cook-sprites.js` routed in)

`360-1-hold` · `360-2-walk` · `360-3-down` · `360-4-arrive` · `360-5-eat` · `360-6-after` (bubble effect) ·
`412-1-hold` · `412-2-eat` (real 2.625 path).

## Needs another lane

- **K**: the real `serve` buttons, the book reading `ctx.unlocked`, `ctx` answers; recipe ids in `result` (`jeon2` …).
  K's per-step look must keep `look.band` (0..2) for `jeon2` or the picture stays the golden frame.
- **A**: `table.*` and `dish.*` pictures (already on `lane/7-a`; the bite masks were looked at with all five).
- **C**: calls `APP.recipeEat`. **U**: if the 3D scene is paused behind the kitchen, it must run again by the time the
  overlay's `close` listeners have returned (the hand-off starts in that listener).

## Left out / not verified

- `assets/icons/dish/{jeon,jumeokbap,kkochi}.png`, their `assets/manifest.json` entries, `tools/make-dish-icons.js` and
  `tools/cook-shots.js` still mention the tray (not mine to edit; unused by the game now).
- No walk to the counter before cooking. No sound or vibration at the hand-off (the table has none).
- Not verified: a real phone; the hand-off with lanes P (new body / gait) and W (camera) merged; K's kitchen.
