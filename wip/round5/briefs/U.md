# Lane U — UI polish outside the kitchen and the runner (branch `lane/u`)

Read `wip/round5/briefs/COMMON.md` first, then `wip/round5/ui-polish.md` (the audit: every item has a problem,
evidence and an exact change; its "주인 답" section at the top settles every owner question).

## Your items in `wip/round5/ui-polish.md` (do all of them)

| # | item (heading in ui-polish.md) | owner answer |
|---|---|---|
| 1 | [must] Fake bold on Galmuri9 turns '옮' into a blob | no question — restore `font-synthesis: none` on the pixel root, sheet titles to Galmuri11 Bold |
| 2 | [must] Two broken CSS lines ('ffont-size' at `.snd-val` and `.week-row .week-n`) | no question — fix both, plus the Korean '했어' cell |
| 3 | [must] Furniture icon buttons disappear in dark theme · refusal cue only on the button | no question |
| 4 | [must] The furniture button row still floats as a separate framed box | **(a) one panel with the tray + a 9-step size meter between 작게 and 크게**; the rotate icon becomes a self-drawn round arrow (12×12 grid, like the hammer) |
| 5 | [must] Speech bubble text centred → soft | no question — left-align lines, snap the content-box left to whole device px |
| 6 | [must] Snapped font sizes a hair too small (toFixed(4)) | no question — round up to 1/64 px; also re-apply on DPR change / zoom |
| 7 | [should] Furniture mode top row | **(b) no title, no panel, and 취소 · 저장하기 become icons too — owner update: 취소 = red X (like ❌), 저장하기 = floppy disk (like 💾), drawn as 12×12 pixel art, never the emoji characters** — zero visible words in furniture mode (aria-labels stay: 취소 (들어오기 전대로) / 저장하고 나가기). The first-time hint '가구를 끌어서 옮겨' becomes a 2 s hand picture dragging the sofa (the sr-only text stays) |
| 8 | [should] Bag, sewing and settings sheets: words where a picture would do | **(a) all**: shell picture + number for '조개 N' (top-right tag, bag, sewing), weekly rows '했어' → check picture, '0/1' → empty box, '바꾸기 3' → swap picture + 3, sewing dye chips: colour block + colour name (cost as shell picture + 6, not repeated text), drop the sewing note '염료나 조개 6개로 옷을 물들여', shorten the bag notes as written in the item |
| 9 | [should] Poster viewer shows the same line twice; album thumbnails carry tiny text | **(a)**: `posterSVG(..., { noText: true })` for the viewer front and album cards; the exported PNG and wall posters keep their text |
| 10 | [should] '재봉틀' title / help lines font | no question |
| 11 | [should] Log label '혼잣말' wraps | no question |
| 12 | [should] Line-height smaller than glyphs | no question |
| 13 | [should] Status tips cover the '데모' tag | no question (the demo tag must stay visible) |
| 14 | [should] First-run hint 10px on 320 phones | no question |
| 15 | [should] Smoke checks at DPR 1 only | add phone-DPR passes to smoke A (main), Z-6 (furniture) and T-2 (bubble) as described |
| 16 | [nice] Toast / tip / name-label fractional positions | do it (UIART.snapLeft) |
| 17 | [nice] Credits page never crisp | do it (move the snap script to `js/fs-snap.js` loaded in both heads) |
| — | [nice] Body text Galmuri9 → Galmuri11 | **owner: keep Galmuri9** — do not change |

Not yours: the runner items ("Runner text never got the device-pixel sizes", "Runner: hint sentences float") go to
lane R; the kitchen (cook.html, js/cook*.js, css/cook*.css) is lanes K-A/K-B/K-C.

## Files you own

`css/style.css`, `css/ui-art.css`, `index.html`, `js/ui-art.js`, `js/intro.js`, `css/intro.css`, `credits.html`,
new `js/fs-snap.js`, the furniture / sheets / tips / poster parts of `js/app.js` (lane K-C edits only the kitchen
embed part: `openCook` / `cookMsg` and the settings vibration row), the furniture parts of `js/scene3d.js` (only if
the refusal cue needs it), the smoke scenarios you touch in `tools/smoke.js` (A, L, S, Y, O, Q, X, Z-6, T-2 —
lane R owns R, lane K-C owns the kitchen checks), `vendor/fonts/*` if the subset goes stale, `vendor/PIXELARTICONS-LICENSE.txt`.

## Icons

Draw new icons yourself on the game's 12×12 pixel grid as inline SVG (see `#btn-furn` / `#btn-settings` in
`index.html` for the style, and `FURN_ICON` / `furnIcon` in `js/app.js` for a grid-to-SVG helper): rotate (round
arrow), X, check, empty box, swap, hand (for the furniture first-time hint). Use the game's own shell picture
(`assets/icons/souvenir/shell.png`) for '조개'. Keep Pixelarticons minus / plus (MIT, credited) or replace them with
self-drawn ones; update `credits.html` to match exactly what ships (remove 'redo' if it is no longer used).

## Acceptance

- Every item above done; furniture mode shows zero visible words at 360x740 / 320x568 / 412x915 (pixel and system
  fonts, light and dark); the size meter shows the current scale step; dark theme icons have ≥ 3:1 contrast.
- No Korean text in Galmuri7; no fake bold (`font-synthesis: none`); no font size smaller than before this round.
- Screenshots at 360x740 @2, 412x915 @2.625 and 320x568 @2 of: main screen, bubble, furniture mode (selected piece),
  bag sheet, sewing sheet, settings sheet, poster viewer, album.
- `npm test`, font check, smoke A, L, S, Y, O, Q, X, Z, T pass locally (the kitchen part of Z may fail until lane K
  merges — note it).
