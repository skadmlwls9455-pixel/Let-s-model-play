# Lane K-A — Kitchen frame, flow and input (cook.js, cook.css) + live tests (branch `lane/k-a`)

Read `wip/round5/briefs/COMMON.md` first, then the full spec `wip/round5/cook-spec.md` (the sections named below).

Owner answers that settle the spec's open questions (docs/OWNER_DECISIONS.md, sections 11-15 06시 and 14시 KST): stickers = (나) keep them but no feeling faces (moved, love, flush, shock, ink, hmm, sweat never cued in the kitchen); work runs as parallel lanes; the runner's 다시/닫기 buttons are NOT changed in this round (kitchen only). Zero visible words in the kitchen; opening starts cooking at once; close-up stations; haechojeon only; no fail/score/timer.

## Files you own

- `js/cook.js`
- `css/cook.css`
- `tools/test-cook-live.js`

## Instructions (from the spec's work package WP-A)

Read final spec sections 0-12, 14 and 15.2 first. Then read js/cook.js 860-1723 (live half), css/cook.css and tools/test-cook-live.js. Branch from HEAD 5ea9ee8. Contract with WP-B is spec section 13; with WP-C it is sections 12 and 14. Do not wait for them: feature-detect the new COOK_ART functions and use the section 14 fallbacks.
1) Sim section (above the live marker), only these edits:
- WORDS.verb: replace back with again:'다시'.
- verb(): returns WORDS.verb.again on the reveal.
- normStore(): keeps potOld (array, newest first, at most 4 plain objects, JSON at most 2048 bytes each; drop junk; never add the key when absent).
- TUNE stays byte-identical; COOK.TUNE_HASH must still equal 2827089308.
2) Live half:
- LAY constants and fit() exactly per spec 2.1-2.2, with the safe-area probe (2.6) and COOK.refit().
- Recompute on resize and visualViewport resize.
- New build() DOM per 2.5. Delete the counter screen and its code.
- open(): migrate a bad pot to potOld, then resume the valid pot or start a new run at once (spec 3.1). pick sound and sticker fire at open.
- Station mapping tap→counter, flip→stove, slice→board, reveal→plate.
- render(): stage buffer, then view composition (COOK_ART.view + interior blit, cached per station, W, H, ox, oy), then slides (spec 4: 3 frames at offsets 0.40/0.75/0.94 of STRIDE, seam rule, base/carry), then shake on the whole view (COOK_ART.shake(V,dx,dy,0)), then putImageData. Add the slide frame to frameSig.
- logical() through the canvas rect with ox/oy. Add the .ck-sim box.
- Listeners on .ck-stage (inset 0). Route quiet-chip presses (old onRowDown, now attached to .ck-verb).
- HUD icons: canvases with n device px per icon px (strip floor(2·dpr), close floor(2·dpr), chip floor(3·dpr)). Reuse drawIcon/sizeStrip snapping.
- Strip states: upcoming .45 opacity; .on raised 2 px with an amber line; .done full.
- Result: chip shows 'again' at 450 ms and ignores presses until 900 ms. again() starts a new run and slides plate→counter without a carry.
- REV2 timing via t (spec 3.5).
- Haptic hooks per spec 7.2: hit, heat, flip landing at L.landAt, cut, plate at reveal t 5; reduced-motion variants; count attempts in stats.buzz; never after a timer.
- Sticker layer placement and visibility per 5.4 (STICK_ROW 44, size 32·n/dpr, slots as specified). Notice slot under the HUD (dormant).
- onClose({kbd}) using the dialog cancel event and last-input modality.
- live(), auto() and refit() per spec 14. Reduced motion per 9; keyboard and focus per 10.
- Remove wallBg and the colour-scheme listener. No title attributes anywhere.
- Never throw: open() returns false on internal error, as today.
- Comments ASCII only. No Math.random.
3) css/cook.css: rewrite per spec 2.5. Paper chips use fixed Apollo colours. Use a 2 px press translate, never scale. No CSS animation; the reduced-motion block stays last. Font fallbacks are 'Galmuri11' (the notice is the only text style left).
4) tools/test-cook-live.js: update the helpers. Rewrite L1-L19 as mapped in spec 15.2 and add N1-N7 and N10. Every removed assertion gets a replacement with the same intent; do not loosen tolerances to pass.
5) Run once at the end: node tools/test-cook.js (sim part), then node tools/test-cook-live.js after WP-B is merged. Take 1-2 real screenshots at 360x740 to confirm. No draft variants.

## Acceptance

- node tools/test-cook.js keeps passing every sim check; TUNE_HASH stays 2827089308.
- With WP-B merged, node tools/test-cook-live.js passes in full (L1-L19 as rewritten, N1-N7, N10) with 0 console or page errors.
- live().view matches the spec 2.3 table at all 7 target sizes.
- The dialog's visible text is '' on every screen of a dish.
- No .ck-prop, .ck-title, .ck-name, .ck-verbrow or .ck-head in the DOM.
- The kitchen opens straight into a step (or into the resumed step).
- The result shows the plate edge to edge, plus the close and again icons.
- A bad pot ends up in potOld unchanged.
- js/cook.js comments are ASCII, and grep -n 'Math.random' js/cook.js finds nothing.
