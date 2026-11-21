# Lane K-C — Embed safe areas, haptics helper, stickers, sound and smoke tests (branch `lane/k-c`)

Read `wip/round5/briefs/COMMON.md` first, then the full spec `wip/round5/cook-spec.md` (the sections named below).

Owner answers that settle the spec's open questions (docs/OWNER_DECISIONS.md, sections 11-15 06시 and 14시 KST): stickers = (나) keep them but no feeling faces (moved, love, flush, shock, ink, hmm, sweat never cued in the kitchen); work runs as parallel lanes; the runner's 다시/닫기 buttons are NOT changed in this round (kitchen only). Zero visible words in the kitchen; opening starts cooking at once; close-up stations; haechojeon only; no fail/score/timer.

## Files you own

- `cook.html`
- `js/app.js`
- `js/haptics.js`
- `js/cook-stickers.js`
- `css/cook-stickers.css`
- `tools/test-cook-stickers.js`
- `tools/test-cook-stickers-live.js`
- `tools/test-cook-audio.js`
- `tools/smoke.js`
- `tools/test-haptics.js`
- `package.json`
- `.github/workflows/test.yml`

## Instructions (from the spec's work package WP-C)

Read final spec sections 5.4, 7, 8, 12, 14 and 15.3. Then read js/haptics.js, cook.html, js/app.js 3984-4021 (openCook/cookMsg) and 3367-3370 (settings row), js/cook-stickers.js 230-314, and the three test files. Branch from HEAD 5ea9ee8. Live tests are written against WP-A's contract (spec 14) and run after A and B are merged.
1) js/haptics.js: supported() per 7.1 (vibrate is a function, UA not Firefox, any-pointer coarse). buzz() guards: setting off, unsupported, page not visible, no sticky activation (navigator.userActivation.hasBeenActive false). Wrap everything in try/catch and keep the 30 ms merge. Kitchen patterns: tap 14, flip 24, cut 16, done [16,80,26]; leave the other patterns alone. API unchanged.
2) cook.html:
- Handle {ppolCook:'safe', t,r,b,l}: clamp 0..200, set --ck-safe-t/r/b/l on documentElement, then call COOK.refit() if the kitchen is open.
- onClose receives {kbd}; pass it on as tell('close') with kbd.
- Delete creditLink(); the credits link shows only on the standalone closed page.
- Change 'Galmuri7' fallbacks to 'Galmuri11'.
- Keep ?recipe, ?seed, ?slow, ?reduced, ?rec and ?sound.
3) js/app.js: a fixed, invisible probe whose padding is env(safe-area-inset-*). Post {ppolCook:'safe',...} on ready, right before every open, and on resize/orientationchange (debounced 100 ms). Nothing else changes: weekly 'kitchen' task, weekTell, focus return.
4) Stickers per owner Q1, default (나): no feeling stickers (moved, love, flush, shock, ink, hmm, sweat) from any rule cooking moments reach. Jeon script flip becomes ['cheer','thumbs'], global flip ['cheer','thumbs','clap'], done ['heart_plate','star']. Art and engine are unchanged. Under (가) no change; under (다) cook.html stops loading js/cook-stickers.js and css/cook-stickers.css (and K tests change accordingly).
5) Tests per spec 15.3:
- new tools/test-haptics.js (node, stubbed globals);
- tools/test-cook-stickers.js feeling-free rule check;
- test-cook-stickers-live K1-K4 for the new layer and flow;
- test-cook-audio scenes start at open, with H and I rewritten and G limited to the standalone closed page;
- smoke scene Z additions.
Add node tools/test-haptics.js to package.json 'test' and to the fast CI job. Never loosen an assertion to pass.
Run once at the end: npm test, then the three live suites and smoke Z after A and B are merged.

## Acceptance

- node tools/test-haptics.js passes; no vibrate call happens without activation, while hidden, on Firefox, or without a coarse pointer.
- npm test passes.
- The settings vibration row shows only where supported() is true.
- In the embed, the iframe receives --ck-safe-* from the parent, and closing by Esc posts kbd:true.
- After A and B merge: test-cook-stickers-live (K1-K4), test-cook-audio (A-L as rewritten) and smoke Z pass with 0 console errors.
- Under (나), no feeling sticker is ever cued in the kitchen.
- No visible text is added anywhere in the kitchen.
