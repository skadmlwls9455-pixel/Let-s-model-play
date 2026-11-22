# Lane K notes (kitchen game) — plan, 11-21

Base e7b8507, branch lane/7-k. Session restart: read this + `git status` + `git log --oneline -8`.

## Plan (in order, push after each)
a. Engine: `js/cook-steps.js` (new, loaded before `js/cook.js`): the five new recipes as data + six new kinds
   (stir pour drag rub swipe bake) through an installer that `js/cook.js` calls with its closed helpers. Without that file
   (the old node suites load `js/cook.js` alone) only the three legacy recipes exist, so the old node suites stay as they are.
   Per-step looks for new recipes: `look = { v: 2, s: [look per step], plate, band? }` (legacy looks unchanged).
   `seen` cap 8 -> 16. Own pot hash per new recipe (steps + numbers). TUNE / TUNE_HASH / VERSION unchanged.
b. Live: book screen (canvas-painted, DOM buttons on top for keys and screen readers), step strip removed, two end
   buttons + `serve`, `ctx` (canCall, unlocked), generic painter `js/cook-steps-art.js` (sprites from COOK_SPR with plain
   fallback boxes), ghost hands for new gestures, sticker size.
c. Recipes land in this order: jeon2, gyeran, jumeokbap2, kkochi2, cake (all kinds are written together in the sim; the
   painter is the long part).
d. Tests: new `tools/test-cook-steps.js` (node), `tools/test-cook-book-live.js` (browser); old suites get `recipe=jeon`
   in their open and the again / strip sites updated.
e. Sounds (stir place lift recorded; pour scrub synthesized), cook-shots, docs, report, one independent check.

## Cut first if short
cook-shots rewrite -> synthesized pour/scrub -> open animation polish -> cake -> kkochi2 (never a half-working step).

## Decisions (defaults taken; in the report under "owner should confirm")
- An explicit `recipe` (URL or `open`) starts that dish directly (legacy ids too); no recipe = the book.
- Bookmark tabs sit in a row under the page (5 x 15 art px), not on the side: the dish picture needs the full width.
- End buttons for every dish, legacy ones too; `again` is gone from the live half.
- Look shape v2 (above): lane T reads `look.band` (0..2) for `dish.jeon`'s frame.
- Stickers: start in the HUD row (the strip is gone), up to floor(4 dpr) device px per sticker px, right slot left of the close chip.

## Log
- 11-21: a..e done and pushed; suites green (see reports/K.md). Working tree has lane A's js/cook-sprites.js locally (assume-unchanged; never commit it). Waiting for the independent check, then one round of fixes, final report.
- 11-22 owner rule (via lead): no model name in commits, code, comments, reports. Commit messages end with the Claude-Session line only; write them with git commit -F <file> so no Co-Authored-By line is added. 81ad873 and 5b5971a carry one; left as is (no force push; the lead squash-merges).
