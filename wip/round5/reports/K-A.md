# K-A report — kitchen frame, flow and input (round 5, branch `lane/k-a`)

## Conclusion

The kitchen now opens straight into cooking and shows no words at all. One canvas fills the screen edge to edge, with the pan or the board seen up close (the jeon is 70–73 % of the width). Each step change slides the view to the next station: counter → stove → board → plate. The HUD has three pixel-icon chips: a step strip, close, and the quiet chip. The result shows the plate big, with close and again; again works only after 900 ms.

- **K-A alone** (base d88ab74 + this branch): `test-cook-live` passes everything except checks that need the other lanes. Those are N5's carry pixels (K-B's `carry`) and N6's exact vibration numbers (K-C's haptics.js).
- **Merged locally with `lane/k-b` + `lane/k-c`** (clean merge, not pushed):
  - `test-cook-live` passes in full (L1–L13, L15–L19, N1–N7, N10; L14 = N1 plus "0 console errors in the whole run").
  - `test-cook.js` 227/0, TUNE_HASH 2827089308.
  - Smoke Z 106/0.
  - `npm test` all green.

Totals are under "Suites run".

## Changes

### `js/cook.js`, sim half (above the live marker)
- `WORDS.verb`: `back` → `again: '다시'`. `verb()` returns it on the reveal. TUNE is byte-identical.
- `normStore()`: keeps `potOld`, defined as:
  - an array of plain objects, newest first;
  - at most 4 entries, each at most 2048 UTF-8 bytes of JSON;
  - junk entries are dropped;
  - the key is never added when absent;
  - `'{{{'` still gives the 6-key default.
- New small `utf8Len()` (no TextEncoder in the node vm).

### `js/cook.js`, live half (rewritten)
- **`LAY`** holds the spec 2.1 constants.
- **`fit()`** follows spec 2.2:
  - the safe-area probe `.ck-probe` supplies the insets;
  - it computes k, css, W, H, ox, oy, hudB, chipTop and STRIDE;
  - the canvas sits at (0, 0) and `.ck-sim` is the logical box;
  - all HUD boxes are placed on whole device px;
  - the sticker layer is placed per 5.4;
  - it runs on `resize`, on `visualViewport` `resize` and through `COOK.refit()`.
- **`build()`** makes the spec 2.5 DOM. The counter screen and all its code are gone: `refreshCounter`, `renderProps`, `placeProps`, `placeTags`, `calm`, `backToCounter`, `propFor`, `wallBg`, `darkScheme`, `plateOf`, the title and name tags, and the colour-scheme listener. There are no `title` attributes.
- **`begin(isAgain)`** replaces `pick()`:
  - it resumes a valid pot;
  - a pot that cannot be resumed moves byte-identical to the front of `potOld` (at most 4);
  - otherwise it starts a new run and saves its pot at once;
  - `pick` sound and sticker fire;
  - the first station shows with no slide;
  - focus goes to the chip after key input, otherwise to the stage.
- **`again()`** works only from the result chip after 900 ms. It runs `begin(true)` and slides plate → counter with no carry.
- **Slides** (`startSlide`, `slideAt`, `composeSlide`, `layer`):
  - 3 frames at 0.40 / 0.75 / 0.94 of STRIDE, timed from the exact `start` / `reveal` time;
  - the seam rule and base/carry per the spec 4 table;
  - no slide under reduced motion or at open, resume or again's start;
  - the slide frame is part of `frameSig`.
- **`render()`**: stage buffer → view composition → whole-view shake → `putImageData`.
  - The view composition is the `COOK_ART.view` bleed, cached per station, W, H, ox and oy, plus the interior blit.
  - The whole-view shake is `COOK_ART.shake(V, dx, dy, 0)` when the art takes the 4th argument; otherwise a local version with edge repeat.
- **Spec 14 fallbacks**, so it never throws:
  - with no `view`, the bleed repeats the interior's edge rows and columns;
  - with no `base` or `carry`, a slide moves the last painted frame and the live scene, with no carry;
  - an unknown icon becomes 'tap'.
- **`logical()`** maps through the canvas rect, css, ox and oy.
- **Haptics** use `buzz(name)` (`try { HAPTICS.buzz }`), with attempts counted in `stats.buzz`:
  - hit and heat → tap;
  - flip → on the landing frame (t ≥ landAt); under reduced motion at the flip event;
  - cut → cut;
  - plate → done at reveal t 5 (frame based); under reduced motion at the reveal event.
- **Result**:
  - the chip is hidden until 450 ms, then shown and not quiet;
  - it takes focus after key input, otherwise focus goes to the stage;
  - it ignores presses until 900 ms;
  - there is no idle hand and no auto-advance, and pressing the plate does nothing.
- **Strip**: upcoming steps at .45, `.on` raised 2 px with an amber line, `.done` at full opacity; all three done on the result.
- **HUD icons** are canvases with n device px per icon px (strip and close floor(2·dpr), chip floor(3·dpr)). The chip icon follows the verb: tap, heat, flip, slice or again.
- **`onClose({kbd})`**: kbd is true after Esc (`cancel` event), after a key-activated close (`click.detail === 0`), or when the last input was a key.
- **`live()`** adds `screen` (step / reveal / closed), `station`, `slide`, `view`, `verb` (aria-label), `stick`, `stats.buzz`, plus `chip`, `t0` and `revealAt` for tests.
  - `tight` is always false.
  - `pending` is true while the current dish is unfinished.
  - The closed shape carries the last open's `err`.
- **`auto(on)`** plays the current dish on the chip path and stops on the plate.
- Comments are ASCII and there is no `Math.random`.

### `css/cook.css` (rewritten)
- The dialog is fixed, inset 0, 100dvh, background `#a8b5b2`, with no frame and no animation.
- The stage is inset 0 and the canvas sits at (0, 0), pixelated.
- **Paper chips** use fixed Apollo colours. The 2 px border is the first inset shadow: Chrome rounds border widths to whole CSS px, which moved icons off the device grid at DPR 2.625.
- The press is a 2 px translate.
- The quiet chip is opacity 0 until `.ck-shown` or focus.
- Focus rings show under `.ck-kbd` only.
- The notice sits under the HUD; its font fallback is Galmuri11.
- The `.ck-probe` padding is `max(env(), var(--ck-safe-*))`.
- Sticker slots come from `--ck-s0` / `--ck-s1`.
- The reduced-motion block stays last.

### `tools/test-cook-live.js` (rewritten)
- **Helpers:** `T.pt` maps through `.ck-sim`. `T.verb()` reads aria-label, hidden, opacity and shown. New are `T.px`, `T.strip`, `o.vib` (fake vibrator, HAPTICS spy and a phone-like activation model), `o.haptics` and `o.time`.
- **L1–L19** are rewritten per spec 15.2. N1, N2 (with N3 and N4), N5, N6, N7 and N10 are added.
- **Slice drags** start 2 logical px past the guide end (was 10). At the new zoom, 10 lands inside the 24 px edge strip, which the game ignores on purpose.

## Decisions (small choices the spec left open)
1. **Canvas size.** W and H grow by up to 4 art px until the canvas is a whole CSS px. Found by the reviewer: at 360x740 @2, H 165 gives 742.5 px and Chromium doubles one device row through the jeon.
   - Now 360x740 @2 gives H 166, 412x915 @2.625 gives H 189 and 390x844 @3 gives H 183.
   - k, W, ox and oy are unchanged everywhere.
   - The extra rows lie off screen.
2. **H covers the whole dialog** (max of the dialog height and the visualViewport height). vh for the HUD and chip follows the visualViewport, as before.
3. **The result chip is hidden before 450 ms**, not quiet, so before 450 ms `live().verb` is ''.
4. **The closed `live()` carries the last open's error count** (K-C's K4 reads it).
5. **Sticker layer.** It is zoomed by n/dpr/2: the engine draws at 2 CSS px per sticker px and its `scale` option takes integers only. Both slots are placed from the left so they land on device px.
6. **The close hit area is placed from the left**, for the same device-px reason.
7. **N6 user activation.** Playwright's own navigation marks every page as activated, and a CDP touch activates already at pointerdown. The N6 init script therefore models a phone (no activation until the first touch ends), so "no buzz before the first touch ends" is really checked.
8. **N1 and cook.html's credits link.** Until K-C removes it, cook.html still adds its credits link to the dialog. N1 leaves it out of the text and checks separately that it is never rendered there.

## For the owner (flagged, code follows the spec)
- **A bad pot over 2048 bytes, or a pot that is not an object** (a string or an array), is not kept.
  - The spec caps `potOld` entries at 2048 bytes and drops junk, and K-B's `test-cook.js` pins that.
  - An oversized bad pot moves to `potOld` at the first open and is dropped on the next read. A string pot was already dropped before this round.
  - The game never writes either kind (a real pot is about 300 bytes), but strictly this is data that is not kept. Raising the cap or keeping the raw text is the owner's call.

## Player-facing text (before → after)
- Verb chip aria-label on the result: 돌아가기 → **다시**.
- No visible text anywhere in the kitchen. Gone: 해초전 / 이어서 (counter tag), 톡톡 / 뒤집기 / 썰기 (title tag), the verb button's text, the 해초전 name tag and 닫기 (now an icon with aria-label 닫기).
- Dialog aria-label: 부엌 / 해초전 → always 해초전.
- `python3 tools/subset-fonts.py --check`: stale none.

## Outside my area
None. Two notes for lanes that run after the merge:
- K-C's `test-cook-stickers-live` (K1, K7, K9) and `test-cook-audio` (A, C) slice from 10 logical px past the guide ends.
  - At the new zoom that start lands inside the 24 px edge strip, so the drag is ignored and those runs time out.
  - Starting 2 px past the end, as `test-cook-live` now does, fixes it.
- K-C's K2 sticker device-px check passes after decision 5.

## Suites run
- **Merged A+B+C** (local, before the last canvas-size fix):
  - `test-cook-live` 404 passed, 0 failed;
  - `test-cook.js` 227/0;
  - `npm test` all green;
  - smoke Z 106/0;
  - `test-cook-stickers-live` 153/5 and `test-cook-audio` 176/2 (the slice-drag start above; K2 fixed since).
- **After the canvas-size fix:** N2 and N10 pass on the merge; the full reruns are in the final lines below.
- **K-A alone:**
  - `test-cook.js` 190/2: the two checks K-B updates (the '다시' label and VOCAB);
  - `test-cook-live` fails only N5 carry and N6 numbers (other lanes).

- **Final runs** (all fixes in):
  - merged A+B+C `test-cook-live`: **411 passed, 0 failed**;
  - K-A alone `test-cook-live`: 401 passed, 10 failed.
    - The 3 N5 carry checks need K-B's `carry`.
    - The 7 N6 checks need K-C's patterns (14/24/16/[16,80,26]) and its activation guard.
  - K-A alone `npm test` stops at `test-cook.js` (190/2, the two K-B checks above), because the script is an && chain. The suites before it pass.

## Independent check
A fresh agent played the merged tree at 7 phone sizes plus landscape, by touch and keyboard, with reduced motion, the embed, resume, bad saves and rotation mid-slide. Result: 0 must, 3 should.
- **(1) Doubled device row** at 360x740 @2: fixed (decision 1).
- **(2) Oversized bad pot** and **(3) string or array pot**: flagged above. The spec and K-B's test pin the current rule.

## Screenshots (360x740 @2, merged art, `wip/round5/shots/K-A/`)
1. `01-tap-start.png`: opens at the tap step, first-time hand.
2. `02-slide-counter-stove.png`: slide, pan carried.
3. `03-flip-golden.png`: stove, arrow.
4. `04-slice-one-cut.png`
5. `05-result.png`: plate edge to edge, again chip.
6. `06-again-slide.png`
7. `07-result-reduced.png`
8. `08-tap-320x568.png`: no sticker layer at this size.

## Left, and not verified
- The 412x915 @2.625 tap-start and result captures, and the `docs/shots/cook/` set (spec 16.2), were not made. That is a post-merge task, not part of this brief.
- Not tried: real phones (Android vibration, iOS safe areas inside the iframe), and Safari or Firefox.
- `COOK.notice()` is dormant and only checked by the tests.
