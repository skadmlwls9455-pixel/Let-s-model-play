# Lane K-B — Close-up art: stove, bleed painter, station bases, carry, REV2, icons (cook-art.js) + node art tests (branch `lane/k-b`)

Read `wip/round5/briefs/COMMON.md` first, then the full spec `wip/round5/cook-spec.md` (the sections named below).

Owner answers that settle the spec's open questions (docs/OWNER_DECISIONS.md, sections 11-15 06시 and 14시 KST): stickers = (나) keep them but no feeling faces (moved, love, flush, shock, ink, hmm, sweat never cued in the kitchen); work runs as parallel lanes; the runner's 다시/닫기 buttons are NOT changed in this round (kitchen only). Zero visible words in the kitchen; opening starts cooking at once; close-up stations; haechojeon only; no fail/score/timer.

## Files you own

- `js/cook-art.js`
- `tools/test-cook.js`

## Instructions (from the spec's work package WP-B)

Read final spec sections 2.4, 3, 4 and 13, and 15.1. Then read js/cook-art.js: the header contract, bgStep/wallPlanks/counterWood/trim/frame (296-383), pan/panHeat (384-476), flipScene (2030-2125), sliceScene (2139-2195), REV/plated/revealScene (1700-1745, 2205-2240), hand/icons (1766-1905) and shake (2242). Branch from HEAD 5ea9ee8.
1) GEO: add rest.spatula [100,112] (move it), flipArrow [72,110], knob [96,148], knob0 [48,148], knobDot [106,142] and rev2 {pcx 72, pcy 89, prx 39, pry 26, rim 5, pth 3, jcx 72, jcy 86, jrx 29, jry 19, soy [98,54,9,5], glints [3,9], garnish 8, shadow 2, thick 2}. Leave food, box0, markBase, cross, dish, small, board and pan as they are.
2) Stove station per spec 13.2: light enamel, grates painted before the pan, front lip, knob panel with two knobs (right one off/on with its dot), oven-door bleed. flipScene always paints the stove base. Draw the arrow at GEO.flipArrow rather than relative to the spatula. Keep every existing flipScene input, beat and cache behaviour.
3) view(b,o): station backgrounds for any buffer size and any offsets. Internal planks, wood and lamp-pool helpers take stage coordinates, so bleed and stage match pixel for pixel: wall period 7 anchored at stage row 2 and extended upward; trim at rows 18-20; wood strips continue at height 11 after the bgStep list; seed 31; the same lamp pool.
4) base(b,o) and carry(b,o) per 13.3, with the continuity rules: carry pixels equal the still scenes' food pixels. Shadow: a checker of shadeAt, 3 px right and 3 px down, only where the object is not painted.
5) revealScene geo 'close' per 13.3, driven by t (null = rest frame): board look at t 3-4, plated look (nudge + garnish 8) and squash at t 5, rest with steam, twinkles and flare on the 96-frame loop from t 6. All plate and jeon pixels stay in stage x 33..111. The old REV path stays unchanged.
6) Icons 'heat' (flame) and 'again' (loop arrow), 16x16, ICON_K colours, distinct silhouettes; add both to ICONS.
7) shake(b,dx,dy,m): margin m, default 2 (the old behaviour); m 0 moves the whole buffer with edge repeat.
8) Update the header comment (ASCII). Determinism rules: no trig, random or clock; alpha 0 or 255; props Apollo only.
9) tools/test-cook.js: change the reveal verb label to '다시' and add '다시' to VOCAB in test 14. Pin TUNE_HASH 2827089308. Add the normStore potOld check (it passes once WP-A merges). Add the art section from spec 15.1 (a)-(h); keep every existing art check passing on the stove.
Run node tools/test-cook.js once at the end. Take one 360x740 render of each new picture (mock compose is fine) to eyeball it. No variants.

## Acceptance

- node tools/test-cook.js passes, except the potOld and '다시' checks, which pass once WP-A is merged.
- Seam test: 0 differing pixels for all 4 stations at 3 offset pairs.
- Carry continuity: 0 mismatching object pixels.
- REV2 bounds hold, and garnish pixels appear only from t 5.
- Stove, knob and grate pixels are Apollo only.
- The existing oil-ring, heat-on, band-change, landing and 96-frame-loop checks still pass with the stove.
- Every icon pair differs in at least 25 % of the union of their masks.
- All new painters are deterministic in a fresh instance.
