# Lane T notes (kitchen → table)

## Plan (11-21 13:00 UTC)

1. `js/meal.js` + `js/recipes.js` + node tests (done first: no dependencies).
2. `js/app.js`: tray removed, `openCook` sends `ctx`, `cookMsg` answers `result` with `ctx` and remembers `serve`;
   the hand-off run (`serving` stage of `mealRun`), recipe state, `APP.recipeEat / recipesUnlocked / cookServe`.
3. `js/scene3d.js`: dish as a table sprite (points, one sprite px = one room px), carried dish + `playerCarryDish`,
   two aura kinds (`bubble`, `confetti`).
4. Eating close-up panel (big `dish.*` picture, four bite masks).
5. Smoke Z / EAT, stub scene, `docs/MEAL.md`, screenshots, one independent check, report.

Cut first if late: bite masks of the close-up → the two aura kinds. Never: serve chain, saved data.

## Decisions taken (to confirm)

- Reduced motion with mode `call`: no walk, the character is simply seated, the dish is on the table and the call
  follows (the brief's "skip the walk"); mode `table`: the dish is simply on the table.
- `kkochi2` for old players is remembered in `S.user.recipes.kkochi2.old = true` the first time a legacy notebook line is
  seen (the notebook keeps only 300 lines, so reading it every time could lose the unlock later).
- A served dish whose sprite is missing (lane A not merged, legacy dish) is carried and shown as today's geometry.

## State

(see git log)
