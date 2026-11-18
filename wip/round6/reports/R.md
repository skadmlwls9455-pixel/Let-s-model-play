# Lane R report — round 6 (11-18): runner octopus, loading crawl, the first minutes

## Conclusion

Done and pushed on `lane/r6` (base `5a6311f`). The runner octopus is now baked from the attic 3D octopus at the attic's 1×
density and drawn at native size on integer positions (no downsampling, rotation or stretch); the loading octopus starts at
the centre and crawls to the right edge at its own gait (52 art px/s, legs 1.0 s) on whole device pixels, bigger by whole
device pixels on big screens, with a 1.0 s minimum cover; after naming, the octopus says the first sentence of its
self-introduction in a bubble before the gift toast; after the first finished walk a pixel hand taps the play-room door,
the yard door and the stair once each; the loft mirror's "downstairs" line now says what to do.
`npm test` passes; smoke R, FM (new) and the Z boot part pass; `node tools/test-runner.js` 583/583 unchanged; the
loading-strip tool render is byte-identical (no `sq`). The independent check found no `must` and four `should`s; three are fixed and one is flagged for the owner (see "Independent check").

## Changes

| file | where | what · why |
|---|---|---|
| `js/scene3d.js` | `renderPortrait` (one line after the pose scale) · `walkPortrait` (passes `sq`) · new `sqOf` next to `portraitColor` | `pw.sq = [sx, sy]` → `bodyG.scale.set(sx, sy, sx)` while rendering; restored by the existing `sv` save. Invalid / missing `sq` → `null` → exactly the old path. |
| `js/runner.js` | sprite section (replaces `EXPR`, `blank/put/alphaAt/outline`, `fromPortraits`, `toCanvas`, old `drawnOctopus`, `buildSprites`) | `BAKE` table (yaw 30, tilt 15, hw 2.82, ty 0.4; run ×4 phases 0/0.5/1/1.5, jump `sq [0.92, 1.10]`, land `[1.10, 0.88]`, duck `[1.20, 0.36]` (lead follow-up, see below), hit, idle — `still`); `cropState` crops one shared alpha box per state (feet on the bottom row, alpha 0/255, ground width from the bottom 3 rows for the shadow); `bakeSprites` caches per `scene.color()` + `scene.paletteName()`; fallback `drawnOctopus(hex, { sx, sy, lp })` draws each state from parameters (idle eyes), `src = 'drawn'`. |
| `js/runner.js` | `drawOct` | picks hit (over) · idle (ready / pause) · duck · jump · land (6 ticks) · run `floor(tick/5) % 4`; `ctx.drawImage(img, dx, dy)` with integers, no width/height; feet at `V.G − height`, centred on `OCT_X + 7` (left edge clamped to 0 so the wider land / duck frames are not cut at the canvas edge — a 2 / 4 px shift); shadow `max(6, groundWidth − (h >> 1))`. |
| `js/runner.js` | API | `RUNNER.sprites()` (test hook: the bake for the current scene colour), `RUNNER.pix(name)` (12×12 guide pictures as SVG — the hand for F2). |
| `index.html` | head boot block | new inline script before the boot `<style>`: reads `"motion":"reduce"` from `ppolppol_v2` → `data-motion="reduce"` early; computes `U = max(round(2·dpr), floor(min(vw, vh)·dpr/200))`, `u = U/dpr`, `x0`, `y0`, `n`, `dx = n·u`, `dur = n/52 s` → `--boot-u/x0/y0/dx/n/dur` (again on resize); adds `boot-min` after 1.0 s (at once under reduced motion). CSS: `56u × 39u`, `background-size 448u 39u`, legs `steps(8)` 1.0 s, cross `translate(x0, y0)` → `translate(x0+dx, y0)` `steps(n)` over `dur`, fallbacks for every variable; reduced motion (device or saved) = no animation (centred, cell 0); hide rule `html.booted.boot-min #boot`. Static `#boot` line, 12 s safety, `html:not(.booted) #oct-svg` rule and the preload unchanged. |
| `js/app.js` | `DOWN_SAY` | F3 line (below). |
| `js/app.js` | name-form submit handler | F1: after the dialog closes, `bubble(firstSentence, 2600, 'say')` (first sentence of `STR.firstGreeting(v)` = up to the first '. ' after the name, so the josa is the row's); the row keeps the full line; `giftWait = true` while the bubble is up, then `dailyGift()` at 2.8 s (was 1.5 s). |
| `js/app.js` | new hints block right after `hideTip` | F2: `hintsAfterWalk(trip)` arms the hints (`ppolppol_ui.hintsArm`) only when the trip is an `out` walk and it is the only finished `out` walk; a 700 ms poll shows the next unseen hint at a quiet moment (name set, tab visible, no open dialog, no toast, no reveal, no ceremony, no intro, not furniture mode, not the play room, the attic in view, no tip); visible spot only (hidden ones wait); after a tap no further hand for 8 s (the run ends there, the rest wait for a later quiet moment); hand = `RUNNER.pix('hand')`, `aria-hidden`, no `title`, `position: fixed`, box on whole device px, art px = `round(2·dpr)` dev px; mirrored (CSS `scaleX(-1)` of the SVG, exact) when the button is too near the right edge; 1.6 s each, then the next; any `pointerdown` (capture, not prevented) or resize ends the run; each shown spot is written to `ppolppol_ui.hints` when it shows. A 3 s boot timer resumes armed hints after a reload, and also arms them when the save has exactly one finished `out` walk, no hint seen yet and no running walk (a first walk that finished without a reveal — reload or close mid-walk → `resumeRunning`). |
| `js/app.js` | `reveal` end (one line) | `hintsAfterWalk(trip);` after `finalPose(trip)` — the homecoming (log, ceremony: poster, lantern, items) is done there. |
| `js/app.js` | boot gift timer (one guard) | `if (greetT) return;` — **outside my named regions**, see below. |
| `css/style.css` | right after the `.tip` rules | `.hint-hand` (fixed, z 11: above scene buttons z ≤ 10, below dialogs/toast which are top layer), `hint-tap` keyframes (two presses of one art px toward the button, `step-end`, no scale), `.flip`, reduced motion (device `auto` and saved `reduce`) = still. |
| `tools/smoke.js` | `scenarioRunner` (R) | `sprites === 'bake'`; per-state sizes (±2), one box per state, alpha 0/255, feet on the bottom row; every octopus `drawImage` during play has 3 arguments and integer `dx, dy`; blue salon colour → most common baked colour is in the scene's `oct` ramp. Canvas integer-scale check unchanged. |
| `tools/smoke.js` | new `bootCrawl` called from the boot block of `scenarioSceneTap` (Z part 0) | static regexes kept; with `js/app.js` held back at 360x740@2, 412x915@2.625, 1280x800@1: centred start ±1 dev px, computed size 56u × 39u (u 4 at 1280x800@1), 0.5 s → 26 art px (±10 %), positions and sizes on whole dev px; early `booted` stays covered until `boot-min`; reduced motion still, centred, cell 0, no minimum; nothing held back (1280x800@1): cover lasts ≥ 1.0 s after it first shows, hides with `booted`. |
| `tools/smoke.js` | new `scenarioFirst`, list entry `['FM', …]` on the `['R', …]` line | fresh save → name → bubble «안녕, 나는 뚜루야.» within 1 s of the dialog closing, gift toast never up with it, row keeps the full line (3D and `?scene=2d`); first walk home → hands over 놀이방 문 → 마당 문 → 위층 계단 in order, once each, crisp, `aria-hidden`, no title, no text, never while a dialog is open, recorded only in `ppolppol_ui`; reload → none; a second walk with the device record cleared → none. (Key `FM` because `F` is taken by `scenarioMigrateExact`.) |
| `tools/smoke.js` | `scenarioLoft` line ~6347 (one string) | the mirror pin follows F3 — **outside my area** (D's scenario), see below. |
| `docs/MINIGAME.md` | '문어 스프라이트' | rewritten for the bake (sizes table, draw rule, idle faces as a lead choice, fallback, hooks). |
| `docs/SALON.md`, `docs/ROOM_EXPANSION.md` | the quoted mirror line | text follows F3 — outside my area (docs quoting the line). |
| `wip/round6/notes/R-cover.js`, `R-shots.js` | new | cover-lifetime measurement and the report pictures. |

## Decisions

- **Lead choice (R13): runner faces are `idle` in every frame** (`EXPR` is gone; the old curious / happy / calm faces were code
  painting a feeling). For the owner notes as a lead choice.
- **Lead choice (R14 a): loading size rule** — one art px = `max(round(2·dpr), floor(short side·dpr / 200))` dev px (phones 2 CSS
  px, 1.905 at 2.625; 1280x800@1 → 4; 1920x1080@1 → 5). **Lead choice (R14 b): minimum cover 1.0 s** (none under reduced motion).
- `ty 0.4` for the bake: at `hw 2.82` every state sits inside 64×64 with ≥ 11 px to spare (measured 0.2 / 0.4 / 0.62).
- Run bob: the bake already lifts the body 1 px at the mid-step phases (0.5 / 1.5, the gait's own lift), so `drawOct` adds no
  extra bob for baked run frames (the result is the brief's 0 / −1 px); the drawn fallback keeps the code bob; ready / pause keep
  the 500 ms 0 / −1 bob.
- Sizes: the spec table is "≈"; measured sizes are 2–3 px larger because the scene outline adds a px on each side. The smoke
  pins run / jump / hit / idle to the spec table ±2 and land / duck to the measured sizes ±2 (land 38×21 vs spec 35×20; duck
  40×13 vs spec 38×15).
- **Duck under the web (lead follow-up 11-18): a flatter duck squash, `sq [1.20, 0.36]`** (fallback drawn duck `sy 0.45` →
  23×11). Why not the web art: its bottom already matches its hit box (art rows end at 13 px above the ground = `KINDS.web.lo`);
  the overlap came from the ducked sprite (18 px tall) being much taller than the duck hit height (10). The lead's suggested
  0.45–0.5 still gives 15–16 px (measured: 0.5 → 41×16, 0.45 → 41×15, 0.42 → 40×14, 0.36 → 40×13), so 0.36 is the largest
  value that leaves the ducked top one clear row below the web at both DPRs. It reads as a flat pancake crawl with the eyes
  low; crisp at 360x740@2 and 412x915@2.625 (shot 9). Sim, `VERSION 'runner-2'` and the server replay unchanged
  (`test-runner` 583/583).
- Pause shows the idle frame (brief: idle when ready / paused), also mid-air.
- Shadow width: from the widest of the bottom 3 rows (the bottom row alone is just two leg tips, 2 px).
- F1 bubble uses kind `'say'` and plays the bubble voice only when sound is on (as every other bubble); the face is untouched
  (idle). The gift waits through `giftWait` (the existing hold the toast line already respects); the boot 2.5 s gift timer now
  skips while the greeting holds it — otherwise a name typed within 2.5 s of loading showed the toast under the bubble.
- F2 order and "first walk": armed only when the homecoming trip is the first and only finished `out` walk (a stay-at-home turn
  is `kind 'home'` and does not count; saves with ≥ 2 walks never arm). Recorded per spot when it shows. "Any tap ends the
  current run": the remaining hints show at the next quiet moment. The hand points left; near the right edge it is mirrored
  (exact flip) and sits left of the button so it is not cut by the screen edge (the yard door sits at the right edge at 360).
- F2 shares the runner's hand through `RUNNER.pix('hand')` (no copy of the grid).

## Player-facing lines and aria names (before → after)

- Loft mirror, octopus awake downstairs: '지금은 아래층에 있어.' → '깨어 있을 때 같이 올라오면 물어볼 수 있어.'
- New bubble right after naming (a sentence that already existed in the log row): '안녕, 나는 ○○이야.' / '안녕, 나는 ○○야.'
- Hand hint: no characters, `aria-hidden="true"`, no `title`. No new aria names.
- `python3 tools/subset-fonts.py --check` → `stale: none`.

## Measured

- Runner sprite sizes (art px, at the default colour): run ×4 34×25 · jump 32×26 · land 38×21 · duck 40×13 (was 42×18 at the spec's 0.62) · hit 34×24 ·
  idle 34×24; ground width 25. Canvas scale unchanged (k 7 at DPR 2 → run 238×175 dev px).
- Loading pass times (n / 52): 360x740@2 2.27 s (n 118) · 412x915@2.625 2.63 s (n 137) · 320x568@2 2.08 s (n 108) ·
  1280x800@1 3.62 s (n 188) · 1920x1080@1 4.23 s (n 220). Smoke: 0.5 s → 26.0 / 26.0 / 25.0 art px at the three sizes.
- Real cover lifetime, first paint → `#boot` hidden, nothing held back, `?intro=0`, 3 runs each, ms (this container: headless
  Chromium with software GL, so loads are slower than a real desktop):

  | | before (base) | after |
  |---|---|---|
  | 1280x800@1 cold | 1493 · 1398 · 1371 | 1454 · 1386 · 1394 |
  | 1280x800@1 warm | 1299 · 1312 · 1259 | 1332 · 1271 · 1294 |
  | 360x740@2 cold | 706 · 1235 · 1246 | 1316 · 1263 · 1333 |
  | 360x740@2 warm | 1155 · 1161 · 1186 | 1220 · 1203 · 1158 |

  Here the app already takes > 1 s, so the minimum cover rarely changes anything in this container; on a fast real desktop
  (the owner's 0.5–1 s) it holds the cover to 1.0 s. The smoke checks the rule directly (an early `booted` stays covered until
  `boot-min`, ≈ 0.59 s after it was forced in that run).
- Loading-strip tool (`tools/make-loading-oct.js`) output md5 `ea2d0a5e…` before and after = the committed PNG.

## Suites run

- `npm test` — pass (all suites; `test-runner` 583 passed).
- `SMOKE_ONLY=R` — pass (65 + new checks; see the log lines `11-18`).
- `SMOKE_ONLY=Z` — boot part all pass (14 new checks), the kitchen part passed; the loft part failed 3 checks on the stale `DOWN` pin, now fixed: rerun after the fix — 100 ok, 0 FAIL through the whole loft part incl. all mirror-line checks (the rest of Z was still running when I wrapped up; the reviewer saw a "Target page… closed" crash later in Z on both base and head, a load issue of this container).
- `SMOKE_ONLY=FM,R` after the review fixes — 80 passed, 0 failed (FM 12 incl. the reworked "several walks" check).
- After the duck follow-up: `SMOKE_ONLY=R` 69 passed, 0 failed (incl. the new duck-under-web check); `npm test` pass;
  `node tools/test-runner.js` 583 passed.

For the lead: add nothing to `npm test` (no new test files); CI smoke lists can add `FM`.

## Shots (`wip/round6/shots/R/`)

1 the baked frames (run ×4, jump, land, duck, idle) at the real scale k = 7 (DPR 2) · 2 the runner screen ready / run / hit at
360x740@2 (smoke R captures) · 3 boot t 0 / 0.5 / 1.0 s 360x740@2 · 4 the same 1280x800@1 · 5 real boot 1280x800@1 (CDP
screencast, a frame every ≥ 100 ms) · 6 real boot 360x740@2 · 7 greeting bubble 360x740@2 · 8 a hint frame (the yard door, hand
mirrored) 360x740@2 · 9 duck under a web in a real run at 360x740@2 and 412x915@2.625 (canvas at the moment, real scale;
`wip/round6/notes/R-duck.js` — a frame-locked clock + autopilot). Missing from the brief's list: in-game jump frame and the 412x915@2.625 run frame — the in-page
capture (`R-shots.js`, `RUNNER_SHOTS=1`) hangs in this container under load; the sizes and crispness at 2.625 are covered by
smoke R2/R3 and the independent check (alpha 0/255, native draws, integer positions at 360@2 and 412@2.625).

## Independent check (fresh reviewer, played at 360@2 / 412@2.625 / 1280@1)

No `must`. `should`s and what I did:
1. The loft scenario pinned the old mirror line in a second place (`DOWN` constant, ~6405) → updated (outside my area, D's
   scenario); the three loft checks it broke are about that string only.
2. A tap hid the hand but the next hint appeared ≈ 0.3 s later (reads as nagging) → fixed: a tap ends the run, no hand for 8 s,
   the rest at a later quiet moment. Probe: tap during the first hand → 0 hands in the next 4 s, only `atticPlay` recorded.
3. A first walk that finished through `resumeRunning` (reload / close mid-walk) never armed the hints → fixed in the hints
   block's boot timer (arms with exactly one finished walk and no hint seen).
4. Land / duck sizes off the spec table, and the ducked sprite top sat ≈ 4 rows into the web while the sim let it pass; land /
   duck started at x −2 / −4 → the left clip is fixed (dx clamped to 0); the overlap is fixed by the lead follow-up (flatter
   duck, above): smoke R now checks duck height ≤ `KINDS.web.lo` (13 ≤ 13, one clear row).

## Needs another lane merged

- "The bake taken while the octopus sits at the play-room table stays standing" needs lane D's table poses (D keeps them
  within what `renderPortrait` saves and restores, spec §10.4). Not testable on this branch.

## Outside my area

- `js/app.js` boot gift timer: one guard `if (greetT) return;` (F1 needs the toast to wait for the bubble).
- `tools/smoke.js` `scenarioLoft`: the mirror pin string updated to the F3 line.
- `docs/SALON.md`, `docs/ROOM_EXPANSION.md`: the quoted mirror line updated.

## Not verified

- Real phones / a real fast desktop (all numbers are headless Chromium with software GL).
- The bake with lane D's seated octopus (above).
