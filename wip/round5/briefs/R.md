# Lane R — runner text to pictures and runner type (branch `lane/r`)

Read `wip/round5/briefs/COMMON.md` first, then in `wip/round5/ui-polish.md` the two runner items:
"[must] Runner text never got the device-pixel sizes, and it ignores the 'pixel font off' setting" and
"[should] Runner: hint sentences float mid-field, and the result shows two messages at once".

## Owner answers (docs/OWNER_DECISIONS.md, 11-15 14시 KST)

- Runner screen text: **(a) hints become pictures** — instead of the mid-field sentences ('점프를 톡 누르면 출발해',
  the pause sentence) the left jump circle's border flashes and a self-drawn tapping hand sits beside it; when
  paused, a pixel pause sign in the middle of the field. Result card: the hit line ('상자에 콩!') + big score digits
  + crown picture with the best + shell picture with '+n' inside the card (the separate coin toast merges into the
  card). The HUD word '최고' becomes the crown picture + digits.
- **'다시' and '닫기' stay text buttons in this round** (the owner chose kitchen-only for icon buttons).
- Controls stay as they are now: the left half of the screen = jump (hold = higher), the right half = duck
  (implemented on 11-15, `js/runner.js` zones). Haptics stay (`HAPTICS.buzz` in `tickOnce`).

## What to do

1. Do both items exactly as written in `ui-polish.md` (type: `--fs-*` tokens in pixel mode, Noto Sans KR in
   system-font mode, line-height 1.5, no size gets smaller; hints/result/HUD to pictures per option a).
2. Pictures: self-drawn on a 12×12 pixel grid as inline SVG or canvas pixels (tapping hand, pause sign, crown); the
   game's own shell picture `assets/icons/souvenir/shell.png` and walk footprints `assets/icons/ctl/walk.png`.
3. Screen readers keep the meaning: `#rn-msg` stays as sr-only live text; aria-labels unchanged.
4. Reduced motion: the circle highlight stays steady instead of flashing; no blinking crown.
5. The coin toast merge: `saveRun` passes `{ quiet: true }` to `APP.earnFromPlay`; `earnFromPlay` in `js/app.js`
   skips its toast when quiet and returns the amount (a few lines in `js/app.js` — list them under "outside my area").
6. The sim and the server replay must not change (`RUNNER.simulate`, `VERSION 'runner-2'`, `tools/test-runner.js`
   golden values). Rendering only.

## Files you own

`js/runner.js`, `css/runner.css`, `tools/test-runner.js` (live harness checks), the R scenario in `tools/smoke.js`,
the few `earnFromPlay` lines in `js/app.js`.

## Acceptance

- At 360x740 @2 and @3, 412x915 @2.625, 320x568 @2 and a landscape phone: no sentence floats in the field (ready,
  pause), the result card shows the picture layout, '다시' / '닫기' stay text, HUD best is crown + digits, all text
  crisp (pixel mode) and in Noto Sans KR with the pixel font off.
- `node tools/test-runner.js`, `npm test`, `SMOKE_ONLY=R node tools/smoke.js` pass; add checks: no visible sentence
  in ready/pause, crown + digits in the HUD, the shell + '+n' in the result card, no separate coin toast after a run.
- Screenshots (≤ 6) at 360x740 @2: ready, running, pause, result (new best and not), landscape.
