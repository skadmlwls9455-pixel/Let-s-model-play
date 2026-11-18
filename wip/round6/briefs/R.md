# Lane R — runner octopus redrawn from the attic octopus; loading crawl centre → right edge (branch `lane/r`)

Read `wip/round6/briefs/COMMON.md` first, then `wip/round6/eat-spec.md` §0 (R13, R14), §1, **§7**, **§8**, §10.4, §11 (R),
§13 (R).

## Owner's words (docs/OWNER_DECISIONS.md, 11-18)

> "달리기 게임에서 문어가 픽셀이 깨져서 보여서 이 문어 그림 다시 원본 참고해서 그리는 게 나을 거 같아" · "로딩중일 때 문어가 …
> 폰이랑 컴퓨터 기준 중앙에서 오른쪽으로 뽈뽈 이동하는 식으로"

Decision: 달리기 문어 — **다락 문어를 원본 삼아 다시 그림** (기기 px 에 맞는 크기로). 로딩 — 폰 · 컴퓨터 같이 **화면 가운데에서
오른쪽 끝으로 뽈뽈**, 반복.

Why it looks broken today (code map `wip/round6/notes/map.md` §6): the 64×64 head portrait is nearest-downsampled by a
non-integer ratio into 24×24, then nearest-rotated ±7° into 26×26 tilt frames, then drawn stretched (30×16, 28×22, 24×28) —
three resamplings; the canvas scale itself is already integer. Why the loading crawl "barely moves" on desktop (map §7): the
cover lives only until the scene's second frame (≈ 0.5–1 s on a warm desktop load — **the main cause**), the path starts at
28.6 %, the duration is fixed (speed scales with width), and 2 CSS px per art px is not crisp at 2.625. A constant gait
speed alone would make the computer crawl *shorter* (104 CSS px/s vs today's 249 at 1280 and 363 at 1920) — hence the lead
choices in spec R14 / §8: a bigger art px on big screens and a 1.0 s minimum cover.

## Files you own

- `js/runner.js`, `tools/test-runner.js` (sim golden values must not change), `docs/MINIGAME.md` ('문어 스프라이트' section)
- `js/scene3d.js`: **only** `walkPortrait` and the `pw` plumbing in `renderPortrait` (new `sq` option)
- `index.html`: the head boot block (a new inline script before the boot `<style>`, the `#boot` CSS incl. the minimum-cover
  class); keep the static `<div id="boot" aria-hidden="true"><i class="boot-oct"></i></div>` line, the 12 s safety script,
  `html.booted` (still added by `js/app.js` — you do not edit `js/app.js`), the `html:not(.booted) #oct-svg { visibility:
  hidden; }` rule and the `loading_oct.png` preload exactly
- `tools/smoke.js`: `scenarioRunner` (R) and the boot block at the top of `scenarioSceneTap` (Z part 0)

Not yours: everything else in `js/scene3d.js` (lane D), `assets/ui/loading_oct.png` (no re-bake needed), the runner sim,
`css/runner.css` (unless the sprite needs nothing there — it should not).

## Tasks

1. **`walkPortrait` squash** (spec §7): new option `sq: [sx, sy]` → `bodyG.scale.set(sx, sy, sx)` while rendering (through
   `renderPortrait`'s `pw`), restored afterwards exactly like the other saved values. Default: no change (the loading tool and
   the app-icon tool render the same as today — check one render byte-for-byte).
2. **Bake** (`js/runner.js`, replaces the portrait path of `buildSprites`): when `APP.scene.walkPortrait` exists, render
   `{ yaw: 30, tilt: 15, hw: 2.82, bg: 'transparent' }` frames (choose `ty` so feet and head are inside the 64×64 frame): run ×4
   (phases 0, 0.5, 1.0, 1.5), jump (`still`, `sq [0.92, 1.10]`), land (`still`, `sq [1.10, 0.88]`), duck (`still`,
   `sq [1.20, 0.62]`), hit and idle (`still`). Crop each state's frames to one shared alpha box with the feet on the bottom
   row; alpha 0/255 only; keep the scene's own outline (do not add another). Cache per body colour + palette; the colour is
   the live scene colour (salon colour). `L.sprites.src = 'bake'`.
3. **Draw natively** (`drawOct`): pick the frame per state (run: `floor(tick / 5) % 4`; jump; land for 6 ticks after landing;
   duck while ducking; hit when over; idle when ready / paused), `ctx.drawImage(img, dx, dy)` with integer `dx, dy` and **no
   width / height**; the 0 / −1 px bob stays; no rotation frames (`toCanvas(img, ±7)` goes). Feet on the ground line `V.G`,
   the body centred over the unchanged hitbox (`C.OCT_X + 7`); the shadow width follows the sprite's ground width. Faces are
   `idle` in every frame — a **lead choice**, not an owner rule (owner C6 b left the play-room games' faces out of scope;
   `walkPortrait` renders only `idle`; the old curious / happy / calm faces were code painting a feeling). `EXPR` goes; list
   it in your report under decisions as a lead choice so the lead can put it in the owner notes.
   (The octopus may be sitting at the play-room table when the runner opens; D keeps its table poses on what
   `renderPortrait` saves and restores, so your bake stays a clean standing octopus — check one bake taken that way.)
4. **Fallback**: no 3D scene or a failed bake → `drawnOctopus` with native per-state variants drawn by parameters (no
   resampling, no rotation); `src = 'drawn'`.
5. **Measure the real cover first** (spec §8): with nothing held back (`?intro=0`), record warm and cold cover lifetimes (from
   the first paint to `#boot` hidden) at 1280x800@1 and 360x740@2, and a real-boot strip (a frame every 100 ms until the cover
   lifts). Put the numbers and the strip in the report — every other boot check holds `js/app.js` back, so this is the only
   look at the real window.
6. **Loading crawl** (spec §8, lead choice R14): a tiny inline head script (before the boot `<style>`) computes the whole dev px
   per art px `U = max(round(2·dpr), floor(min(vw, vh)·dpr / 200))`, `u = U / dpr` (phones keep 2 CSS — 1.905 at 2.625;
   1280x800@1 → 4, 1920x1080@1 → 5), `x0`, `y0`, `n`, `dx = n·u`, `dur = n / 52` s and sets `--boot-u`, `--boot-x0`,
   `--boot-y0`, `--boot-dx`, `--boot-n`, `--boot-dur` on `<html>` (again on `resize`); it also reads `ppolppol_v2` for
   `"motion":"reduce"` like the font line and sets `data-motion="reduce"` early. CSS: size `56u × 39u`, `background-size: 448u
   39u`, legs `steps(8)` over **1.0 s**, the cross from `translate(x0, y0)` to `translate(x0 + dx, y0)` with
   `steps(var(--boot-n))` over `var(--boot-dur)`, infinite; sane fallbacks when variables are missing; reduced motion (device
   or saved setting): still, centred, cell 0. **Minimum cover**: the same script adds a class (e.g. `boot-min`) 1.0 s after it
   runs (at once under reduced motion) and the hide rule becomes `html.booted.boot-min #boot { display: none; }` — a fast
   load still shows ≈ one body length of crawl from the centre; slow loads are unchanged; `#boot` keeps `pointer-events:
   none`. Check every smoke scenario that screenshots right after load still passes. Write both lead choices (the size rule
   and the minimum cover) in your report under decisions, for the owner notes.
7. **Tests**: smoke R — `sprites === 'bake'`; record every octopus `drawImage` for a few seconds of play and check the drawn
   width/height equal the image's own and `dx, dy` are integers; sprite alpha only 0/255; per-state sizes within ±2 px of the
   spec table; with a salon colour (e.g. blue) the baked body's most common colour is that colour's ramp; the integer canvas
   scale check unchanged; R2/R3 still pass. Smoke Z part 0 — keep the static regexes; hold `js/app.js` back with `page.route`
   so the cover stays, then at 360x740@2, 412x915@2.625 and 1280x800@1: the octopus starts centred (±1 dev px), after 0.5 s it
   moved right by 52 art px/s ±10 %, its left edge and size sit on whole dev px, `getComputedStyle` sizes = 56u × 39u (u = 4
   CSS at 1280x800@1); with `reducedMotion: 'reduce'` it stays centred; and with nothing held back the cover lasts ≥ 1.0 s
   after it first shows, then hides once `html.booted` is set. `node tools/test-runner.js` unchanged.

## Acceptance

- `node tools/test-runner.js`, `SMOKE_ONLY=R node tools/smoke.js`, `SMOKE_ONLY=Z node tools/smoke.js` (the boot part; the kitchen
  part is K2's), `npm test` pass; the loading-tool render is byte-identical with no `sq`.
- At 360x740 @2 / @3 and 412x915 @2.625 (and a landscape phone): the runner octopus looks like the attic octopus (same
  palette, outline, eyes, proportions), every pixel crisp and square, no doubled or dropped rows in any state; the loading
  octopus appears at the centre at once and crawls toward the right edge at its own gait on a phone and on a 1280×800
  desktop (bigger there by whole dev px), and on a fast desktop load it is seen crawling for at least 1.0 s.
- Report the measured sprite sizes per state, the pass times you measured, the real warm / cold cover lifetimes (before and
  after the minimum cover) and the lead choices under decisions (the runner's idle faces; the loading size rule and the
  minimum cover).
- Shots (≤ 8): runner ready, run, jump, duck, hit at 360x740@2; run at 412x915@2.625; boot at t 0 / 0.5 / 1.0 s on 360x740@2 and
  1280x800@1 (a strip); the real-boot strip (nothing held back) at 1280x800@1 and 360x740@2.

## Do not touch

The runner sim, `VERSION 'runner-2'`, the server replay, haptics, `css/runner.css` text rules, the rest of `js/scene3d.js`,
`assets/ui/loading_oct.png`, `tools/make-loading-oct.js` (it must still work unchanged).
