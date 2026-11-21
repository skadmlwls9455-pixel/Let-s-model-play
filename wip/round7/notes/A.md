# Lane A notes (food pixel art)

Plan (11-21 13:00 UTC, deadline 11-22 01:00 UTC)
1. Pipeline: `js/cook-sprites.js` (painters in palette characters: layers, shapes, hand rows, auto outline, contact shadow),
   `tools/make-food-sheets.js`, `tools/test-cook-sprites.js`. Done.
2. Five dishes (first pass done, pushed), then icons and table sprites.
3. Cooking states in recipe order, drawn in parallel as fragments in `wip/round7/notes/A-frag/NN-*.js`
   (`node wip/round7/notes/A-frag/join.js` writes them into `js/cook-sprites.js`), then the 16 px pictures.
4. Second pass on the dishes, one independent check, docs/FOOD_ART.md, report.
Cut first: step.* pictograms, then cake states, then kkochi states. Never cut: dishes, jeon and gyeran states.

Decisions
- Sprites are painter functions (shapes + hand rows) instead of full typed canvases: only `get()` is the contract.
- Two extra colours: Q #f7ecd3 (warm white shade), = #ffb0a6 (berry flesh).
- No question for the owner so far.
