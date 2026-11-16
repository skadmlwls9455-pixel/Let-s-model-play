# Kitchen close-up redo (해초전): final spec

Lead judge, 2026-11-14. Winner: **close-up**, with the rulings in §0.2. Base: HEAD `5ea9ee8`; the working tree was clean when this was written. Code was read, not edited. Numbers come from `js/cook.js`, `js/cook-art.js`, `css/cook.css`, `cook.html`, `js/haptics.js`, `js/app.js` and the tests at that commit. The fit tables were computed by `fit.js (리드 작업 폴더, 저장소엔 없음)` and `pos.js (리드 작업 폴더, 저장소엔 없음)`.

## 0. Decisions

### 0.1 Owner decisions implemented here (11-15 06시 KST)
1. **Close-up.** Each step shows the pan or the board from above, close, filling the portrait screen edge to edge. A step change slides the view sideways to the next station. A ghost hand shows the gesture; there are no words.
2. **Zero visible words** anywhere in the kitchen. Close and again are pixel icon buttons. Names live only in aria-labels and in the hidden aria-live line.
3. **Opening starts cooking at once**: no counter or menu screen. When the dish is done, the finished plate is shown big with again and close icons.
4. **Scope.** Only haechojeon (tap-tap, flip, cut). No fail, no score, no timer. The dish always completes and the result is a picture.
5. **Haptics** are on by default and can be turned off in settings: `js/haptics.js`, `HAPTICS.buzz(name)`.
6. **No Galmuri7 for Korean.** No glyph renders at all.
7. **Sound** stays off by default. The embed (`cook.html?embed=1` inside `#cook-overlay`, `js/app.js openCook`) keeps working, and the weekly 'kitchen' task still counts.
8. **Standing rule (11-15).** A word that can be read two ways is asked before work starts (see §0.3). "Reduce text" means **fewer characters, never smaller type**. No font size in this spec shrinks.

### 0.2 Judge's rulings on the proposal
- **R1 Stove slide is decided, not asked.** "단계가 바뀌면 옆으로 넘어감" covers tap→flip, so every step change slides. The pan is carried from the counter to a new **stove** station. Closeness is decided too: `VIEW_W` 80, so the jeon is 69-73 % of the width. Button places are decided: close top-right, again bottom-centre.
- **R2 The haptics activation guard is required.** Chromium refuses `vibrate()` without sticky activation and reports it through `Intervention::GenerateReport` at console level **ERROR** (verified in `core/frame/intervention.cc`). The first counted tap in a fresh iframe happens on pointerdown, before activation (a finger activates on pointerup/touchend). Every kitchen test counts console errors.
- **R3 Two sim-section edits, neither touching TUNE.** `normStore()` passes `potOld` through, and `verb()` returns '다시' on the reveal. TUNE stays byte-identical.
- **R4 The stove is light enamel** (Apollo s4/s5/s6). A slate pan on slate enamel would lose its outline.
- **R5 Vertical placement.** Stage rows 28..132 (the band of interest) are centred between the HUD bottom and the chip top. The proposal's screen-midpoint rule pushed the pan bottom under the chip by 12-16 px at 320x568 and 360x560.
- **R6 Bleed is painted, not repeated.** The station painters run in stage coordinates over the whole canvas. Wood strips are 10-11 rows tall and do not repeat from row 147, so "repeat rows 147-157" would show a seam.
- **R7 Shake moves the whole view** with edge repeat. Shaking only the stage would tear at the stage/bleed seam.
- **R8 No arrival squash on step slides.** No scene supports one; the carried object sets down 2 px instead. The plate landing keeps its squash (REV2 t 5).
- **R9 Carry continuity.** Carried sprites equal the scenes' own food pixels. REV2 adds garnish and pulls the pieces apart only on the landing frame. REV2 prx is 39 because 40 overflows the 80-column window by one column.
- **R10 The flick demo starts at the arrow** (`GEO.flipArrow` 72,110), so glyph and hand agree.
- **R11 Sticker layer limit is stage row 44** (above the flip zone with margin). The layer is shown at 360x740 and 412x915 and hidden at 320x568 and 360x560.
- **R12 The loop arrow is reserved for "again"**, in the HUD only. A later stir glyph must not be a loop arrow; use a ladle with a curved trail.
- **R13 'pick' still fires at open and at again.** The sticker engine starts a run on it. Its sound is dropped by `js/audio.js`'s 0.3 s early window while audio is locked, which is intended. Sound test I is rewritten.
- **R14 Text sweep.** No `title` attributes in the dialog. `creditLink()` no longer injects the credits link into the dialog. 'Galmuri7' fallbacks in cook.css and cook.html become 'Galmuri11'.
- **R15 Kitchen haptic patterns move into the felt range.** tap 14, flip 24, cut 16, done [16, 80, 26]; all still "아주 짧게". Runner and furniture patterns are untouched.
  - 5차 검증 O-5 (11-15): 접시 진동 `done` 은 뺐다. 부엌 진동은 톡 · 불 켜기 · 뒤집기 착지 · 썰기뿐 (주인: 요리 톡 · 뒤집기 · 썰기). 아래 §7.2 plate 줄 · N6 · §16.4 의 접시 진동은 옛 설계.
- **R16 `HAPTICS.supported()` is honest.** It is false on Firefox (returns true, never vibrates) and without a coarse pointer (desktop), so the settings row no longer promises vibration that cannot happen.

### 0.3 Owner questions still open (each has a default, so no package waits)
- **Q1 Stickers.** Default **(나)**: keep them, minus feeling faces. Only WP-C rules and tests depend on it.
- **Q2 How to run the work.** Default **(가)**: parallel branch sessions, as in round 4.
- **Q3 Runner's '다시' and '닫기' text buttons.** Default **(나)**: kitchen only now. This spec does no runner work.

## 1. Lines that must not break
- **TUNE** in `js/cook.js` stays byte-identical: `TUNE_HASH === 2827089308`. All thresholds stay in logical px (stage 288x320 = art px x 2).
- **Sim** (above `/* ───────── live ───────── */`) stays unchanged except two edits:
  - `verb()`: reveal → `WORDS.verb.again`.
  - `normStore()`: keeps `potOld`.
  - In `WORDS`, `verb.back` is replaced by `verb.again: '다시'`.
- **Save key** stays `ppolppol_cook_v0`; cook.html passes it, including in the embed. Nothing saved is ever deleted (bad pots move to `potOld`).
- **Visible text** in the kitchen: none (no glyph, digit, emoji or symbol). The banned words in test 14 ('마마', 'Mama', …) stay banned in the four cook files. Benchmark notes go only in docs, never in code comments.
- **cook.js comments** stay ASCII. No `Math.random` (particles keep `mulberry32(fxSeed)`). No new libraries, no modules, no build step.
- **Pixels**: Apollo 46 for props and FOOD 24 only for food, oil, glints and steam. Alpha is 0 or 255. Each art px is exactly k device px, with `imageSmoothingEnabled=false` / `image-rendering: pixelated`. Press feedback is a 2 px translate, never scale.
- **Sound** is off by default. Reduced motion, keyboard play and the screen reader line keep working.
- **Octopus**: no feelings are claimed for it (see Q1). Copy no commercial game's name, character, art, music, step titles or screen layout.
- **Work style** (HANDOFF §3): one pass, real screenshots, no draft variants. Run each test once at the end. No model names in code, commits or PRs. Stage files one by one, on the current branch.

## 2. Screen geometry

### 2.1 Live constants (in cook.js `LAY`, not in TUNE)
```
VIEW_W = 80        target visible art width (jeon 58 art px ~ 70-73 %)
ROWS   = [28,132]  stage rows that must sit between the HUD and the chip (104 rows)
MID    = 80        centre of that band
ZMAX   = 6         CSS px per art px cap (desktop / tablet)
HUD    = 64        8 pad + 48 row + 8 gap      -> hudB    = safeT + 64
CHIP   = 64, CHIPB = 16                        -> chipTop = vh - safeB - 16 - 64
STICK_ROW = 44     sticker layer must end 8 px above this stage row (sec. 5.4)
```

### 2.2 Fit (on open, `resize`, `visualViewport` `resize`, `COOK.refit()`)
```
vw, vh   = dialog clientWidth / clientHeight (vh = visualViewport.height if smaller, as today)
safeT/R/B/L = computed padding of the .ck-probe (sec. 2.6); 0 when unknown
usable   = chipTop - hudB
k   = max(1, min(floor(vw*dpr/80 + .01), floor(usable*dpr/104 + .01), floor(6*dpr + .01)))
css = k / dpr                                   one art px = k device px
W   = ceil(vw/css - 1e-9),  H = ceil(vh/css - 1e-9)       canvas backing store (art px)
ox  = round(vw/2/css) - 72                      stage origin in the canvas (food centre x 72 -> screen centre)
oy  = round((hudB + chipTop)/2/css) - 80        stage row 80 -> midway between HUD and chip
STRIDE = W + 8                                  slide distance (art px)
canvas: left 0, top 0, CSS W*css x H*css (whole device px; overshoot < 1 art px, clipped by the dialog)
logical.x = ((clientX - canvasRect.left)/css - ox) * 2 ; logical.y = ((clientY - canvasRect.top)/css - oy) * 2
.ck-sim box: left ox*css, top oy*css, 144*css x 160*css (invisible; tests map logical px through it)
```

### 2.3 Results (CSS px; "old" is the current stage, 288x320, with the jeon 116 px = 32 % of 360)

| viewport @DPR | k | css/art | canvas W x H (art) | ox, oy | jeon width (% vw) | jeon centre | pan rim top / bottom | chip | flick 16 art | guide-0 ends from edges |
|---|---|---|---|---|---|---|---|---|---|---|
| 360x740 @2 | 9 | 4.5 | 80x165 | -32, 0 | 261 (73 %) | 180, 387 | 207 / 576 | 660-724 | 72 | 36 / 36 |
| 360x740 @3 | 13 | 4.333 | 84x171 | -30, 4 | 251 (70 %) | 182, 390 | 217 / 572 | 660-724 | 69 | 43 / 39 |
| 320x568 @2 | 8 | 4.0 | 80x142 | -32, -11 | 232 (73 %) | 160, 300 | 140 / 468 | 488-552 | 64 | 32 / 32 |
| 320x568 @3 | 12 | 4.0 | 80x142 | -32, -11 | 232 (73 %) | 160, 300 | 140 / 468 | 488-552 | 64 | 32 / 32 |
| 412x915 @2 | 10 | 5.0 | 83x183 | -31, 10 | 290 (70 %) | 205, 480 | 280 / 690 | 835-899 | 80 | 45 / 47 |
| 412x915 @3 | 15 | 5.0 | 83x183 | -31, 10 | 290 (70 %) | 205, 480 | 280 / 690 | 835-899 | 80 | 45 / 47 |
| 412x915 @2.625 | 13 | 4.952 | 84x185 | -30, 11 | 287 (70 %) | 208, 480 | 282 / 688 | 835-899 | 79 | 50 / 46 |
| 390x844 @3, safe 47/34 | 14 | 4.667 | 84x181 | -30, 10 | 271 (69 %) | 196, 448 | 261 / 644 | 730-794 (hudB 111) | 75 | 47 / 45 |
| 360x740 @1 | 4 | 4.0 | 90x185 | -27, 11 | 232 (64 %) | 180, 388 | 228 / 556 | 660-724 | 64 | 52 / 52 |
| test only: 320x460 @2 | 6 | 3.0 | 107x154 | -19, -6 | 174 (54 %) | 159, 240 | 120 / 366 | 380-444 | 48 | 63 / 65 |
| test only: 360x560 @2 | 8 | 4.0 | 90x140 | -27, -12 | 232 (64 %) | 180, 296 | 136 / 464 | 480-544 | 64 | 52 / 52 |
| test only: 568x320 @2 (landscape) | 3 | 1.5 | 379x214 | 117, 21 | 87 (15 %) | 284, 161 | 101 / 224 | 240-304 | 24 | - |

Landscape and tablets are not targets. They still get no letterbox: the counter continues sideways.

Positions at 360x740@2 (X = (x+ox)·css, Y = (y+oy)·css):
- **Tap marks** (base, ±13 CSS seeded): (117, 365), (248, 360), (185, 423).
- **Flip**: arrow (180, 495); spatula blade (306, 504); knobs (72, 666) and (288, 666).
- **Slice**: guide 0 runs x 36..324 at y 387; guide 1 runs y 288..486 at x 180; knife (306, 558).
- **Result**: plate centre (180, 401), x 5..356; soy dish (297, 243).

Same items at 320x568@2:
- **Tap marks**: (104, 280), (220, 276), (164, 332).
- **Flip**: arrow (160, 396); knobs (64, 548) and (256, 548).
- **Slice**: guide 0 runs x 32..288 at y 300.
- **Result**: plate centre (160, 312).

### 2.4 What fills the canvas (one canvas, no frame, no page colour)
Every layer is painted by COOK_ART in **stage coordinates**, shifted by (ox, oy), so the bleed and the stage meet with no seam:
1. **Wall planks** (play-room slate wall): a 7-row period anchored at stage row 2, continuing upward without end. It runs under the status bar (`viewport-fit=cover`), and the HUD sits on it.
2. **Wood trim** at stage rows 18-20, full width.
3. **Station surface** from stage row 21 to the canvas bottom.
   - Counter wood for the counter, board and plate stations. Strip heights follow the bgStep list and then stay 11 rows; seed 31; the lamp pool comes from the upper left.
   - Stove for the stove station (§13.2).
4. **The stage interior** (stage x 2..141, y 2..157) is blitted from the scene painter's 144x160 buffer. The scene's 2-px frame is never shown.
5. **Columns outside stage x 2..141** (landscape or tablet only) are the same painters continuing sideways.

The kitchen is always lit; there is no night variant. `wallBg()` and the colour-scheme listener go.

### 2.5 DOM (built by `build()`)
```
dialog#cook-dlg.ck-dlg [aria-label=해초전]
  div.ck-stage [tabindex=-1]       inset 0; every pointer listener; touch-action none
    canvas.ck-cv [aria-hidden]     W x H art px at (0,0)
    div.ck-sim [aria-hidden]       invisible logical box (sec. 2.2)
    div.ck-stick [aria-hidden]     sticker layer (sec. 5.4)
  div.ck-hud                       pointer-events none
    div.ck-strip [aria-hidden]     paper chip with 3 step icons (pointer-events none: touches fall to the stage)
    button.ck-close [aria-label=닫기]   pointer-events auto; icon canvas 'close'
  button.ck-verb [aria-label=<verb>]    the chip (bottom centre); icon canvas
  div.ck-note [hidden]             dormant notice slot (COOK.notice)
  p.ck-say [aria-live=polite]      visually hidden, as today
  div.ck-probe                     invisible safe-area probe
```
These go: `.ck-sky`, `.ck-head`, `.ck-verbrow`, `.ck-foot`, `.ck-props`, `.ck-prop`, `.ck-tag`, `.ck-title`, `.ck-name`. The counter-screen code goes with them: the counter UI in `refreshCounter`, `renderProps`, `placeProps`, `placeTags`, `calm`, `backToCounter`, `propFor`, `wallBg`, `darkScheme`.

CSS (`css/cook.css`, fully rewritten; the reduced-motion block stays last):
- **Dialog.**
  - Position and size: `position: fixed; inset: 0; width: 100%; height: 100%` (100dvh). No max-width or max-height; margin, padding and border all 0.
  - Behaviour: `overflow: hidden; touch-action: none; overscroll-behavior: none`. No box-shadow frame, no animation.
  - Background and `::backdrop` are `#a8b5b2`.
  - `html.ck-open` keeps `overflow: hidden; overscroll-behavior: none`.
- **Paper chips** (strip, close, verb chip):
  - Fill `#e7d5b3`, 2 px border `#602c2c`.
  - Box-shadow `inset 2px 2px 0 #ebede9, inset -2px -2px 0 #c09473, 2px 2px 0 #602c2c`.
  - `:active` moves by `translate(2px,2px)` and drops the outer shadow.
  - Focus ring (2 px `#341c27`, inset 6 px) shows only under `.ck-kbd`.
  - Fixed Apollo colours, no theme tokens. Every box sits on whole device px (`round(v·dpr)/dpr`).
- **Strip.**
  - Position: left `max(8, safeL+8)`, top `max(8, safeT+8)`; height 48, padding 8, gap 8.
  - Icons are 16x16 at n = floor(2·dpr) device px per icon px (32 CSS at DPR 1/2/3, 30.5 at 2.625).
  - States: `.ck-step` (upcoming) opacity .45; `.on` is raised 2 px with an amber `#de9e41` underline 2 px thick; `.done` opacity 1.
- **Close.**
  - A visible 48x48 paper chip at right `max(8, safeR+8)`, top `max(8, safeT+8)`.
  - The button is 56x56 (a 4 px transparent ring around the chip).
  - Icon 'close' at n = floor(2·dpr).
- **Verb chip** `.ck-verb`.
  - 64x64 paper chip at left `round((vw-64)/2)`, bottom `16 + safeB`.
  - Icon at n = floor(3·dpr) (48 CSS at DPR 1/2/3, 42.7 at 2.625).
  - Quiet rule as today: `opacity 0` on touch until shown; shown when it has focus; `.ck-shown` sets opacity 1.
- **Notice** `.ck-note` (dormant): left `max(8, safeL+8)`, right `max(8, safeR+8)`, top hudB + 8, height 44. Font `var(--f-meta, 'Galmuri11')`.
- No CSS animation in the kitchen. The sticker engine's own CSS obeys reduced motion as today.

### 2.6 Safe areas
- **Probe.** `.ck-probe { position: fixed; width: 0; height: 0; visibility: hidden; pointer-events: none; padding: max(env(safe-area-inset-top, 0px), var(--ck-safe-t, 0px)) … }`, with right, bottom and left the same way. `fit()` reads its computed paddings.
- **Embed.** `--ck-safe-*` come from the parent's 'safe' message (§12), because `env()` inside an iframe is probably 0 (unverified on iOS).
- **What uses the insets.** The canvas always runs under the notch and the home indicator. Only the HUD, the chip and the notice use the insets.
- **Edge rule** unchanged (`TUNE.edgeCss` 24): a non-mouse press that starts within 24 CSS px of the window's left or right edge is ignored. Tap marks and guide ends stay ≥ 32 CSS px from both edges at every target size (table above).

## 3. Stations and steps
| step | station | scene painter | background outside the stage |
|---|---|---|---|
| tap | counter | `tapScene` (unchanged) | counter wood |
| flip | stove | `flipScene` (now on the stove) | stove |
| slice | board | `sliceScene` (unchanged) | counter wood |
| result | plate | `revealScene({geo:'close'})` | counter wood |

All sim thresholds are unchanged; the sizes below are physical sizes at 4-5x. Every juice beat runs on the 12 fps grid (83.3 ms frames). Sound, haptic and visual fire in the same event handler or on the same frame, never after a timer.

### 3.1 Open and resume
- `open()`:
  1. `build()` the dialog.
  2. Read the store.
  3. Migrate an unresumable pot to `potOld` (§11).
  4. If the pot is valid, `resumeRun` it: its step restarts from the beginning and the looks of earlier steps are kept.
  5. Otherwise create a new run as `pick()` did: dayN+1, seed `hash32(day|cook|dayN)`, run id from crypto, pot saved immediately.
- `sound({act:'pick'})` and `sticker({act:'pick'})` fire for the run.
- The first frame shows the current step's station. There is no slide, no counter and no menu.
- Focus: the chip if the last input was a key (and the chip shows), otherwise the stage.
- `opts.recipe` and `?recipe=` are still accepted and change nothing (there is one recipe).

### 3.2 Counter: tap the batter
- **Composition** (stage art px). Pan `PAN_STEP` (cx 72, cy 84, rx 60, ry 38, depth 6) sits on the wood with its sides cropped. The batter is at (72,86), with rx/ry of 21/14, then 25/16, then 29/19 (189x126 → 261x171 CSS at 360x740@2), plus herb strands. Three amber rings sit at `markBase` (-14,-5), (15,-6), (1,8) with ±3 seeded jitter. Each ring is about 11 art px wide (50 CSS).
- **Input** (sim, unchanged).
  - Every pointerdown counts, multi-touch included.
  - The nearest unfinished mark within 80 logical px (180 CSS at 4.5x) gets the hit; farther presses leave a dust speck with no penalty.
  - Two counted taps within 90 ms count as one.
  - Holding auto-taps at 400 ms, then every 250 ms.
  - The chip gives the next mark 3 hits.
- **Feedback.**
  - Frame 0: bright rim. Frames 1-2: squash (wide, then tall).
  - 3-6 batter drops, life 4-6 frames.
  - The hit arc sinks and the dimple stays. The batter spreads at hits 3 and 6.
  - In the same handler: sound `tap{i}` and haptic `tap`.
- **Guide.** The rings with their blinking centres are the glyph.
  - First time this device sees the step: the ghost hand (16x17 art = 72 CSS) taps the first unfinished ring at `titleMs` 600 ms, kept as an invisible timer.
  - After 5 s idle: the hand again, and the chip shows the tap icon.
- **Exit.** 9 hits → `step` → 400 ms → next `start` → slide counter→stove, carrying the pan (§4).

### 3.3 Stove: heat and flip
- **Composition.**
  - The stove (§13.2) with the same pan at the same spot, and the round raw batter carrying the player's dents.
  - The spatula rests at `GEO.rest.spatula = [100,112]`; its blade is visible at the lower right and the handle leaves the right edge.
  - Two knobs at (48,148) and (96,148). The right one is the burner.
- **Heat on.** The first press anywhere, or the chip, turns the heat on:
  - flames lick the pan front, the right knob turns to "on" with its amber dot lit, and the oil ring, bubbles and steam start;
  - a 1-frame flash;
  - sound `sizzle{band:0}` with heat_on, haptic `tap`, aria '보들보들'.
- **Flip input** (sim, unchanged).
  - After heat-on, an upward stroke flips if it rises ≥ 32 logical px (16 art = 64/72/80 CSS at 4/4.5/5x) and stays within ±45° of straight up. It can start anywhere on the screen.
  - The band judged is the one at the moment the stroke began. Speed only sets the arc height.
  - A press that doesn't flip makes the jeon hop for 1 frame (a nudge). Three nudges with no hand showing replay the up-swipe hand (at most twice per step) and show the chip.
- **Doneness is colour only**: soft 0-3 s, golden 3-6 s, crisp from 6 s, and it waits there. There is no timer, and every band is a good result.
- **Glyph.**
  - The amber up-arrow is drawn at `GEO.flipArrow = (72,110)`, on the pan floor under the jeon. It bobs 1 px every 4 frames and shows only after heat-on and before the flip.
  - The flick demo hand starts at the same point and sweeps up 32 art px.
- **Feedback.**
  - The arc takes 4 frames: tilt raw, edge-on, tilt cooked, landing squash.
  - Landing (frame 3, 250 ms after the flip):
    - the oil ring floods, 56-76 drops fly, and the steam blooms;
    - the whole view shakes 1 art px down for 2 frames;
    - haptic `flip` fires on that landing frame.
  - Sound `flip` is unchanged; its splat is already at 0.256 s.
  - Reduced motion: no arc, and the haptic fires at the flip event.
- **Exit.** Step done → 1000 ms in the pan (landing burst and steam) → `start` slice → slide stove→board carrying the jeon.

### 3.4 Board: cut
- **Composition.**
  - The board `GEO.board` (x 10..134, y 36..136) fills the width, cropped at the sides.
  - The cooked jeon (face 'bottom', band, herb, dents) sits at (72,86), steaming.
  - Guide 0 is horizontal at y 86±4 (seeded), x 40..104 (64 art = 288 CSS). Guide 1 is vertical at x 72±4, y 64..108.
  - The knife rests at `[100,124,0]` with its handle off the right edge.
- **Input** (sim, unchanged).
  - Drag along the lit guide in any direction and at any speed; lifting and resuming is fine.
  - The stroke must stay inside ±32 logical (±72 CSS at 4.5x) and within ±40° of the guide's axis. Painting 80 % of the 40 bins cuts the line.
  - Or slash across the guide inside its middle 15-85 % at ≥ 50°, with a chord ≥ 16 logical (36 CSS). That cuts the line straight.
  - The knife follows the finger.
- **Feedback.**
  - The kerf follows the knife.
  - On a cut: a 2-frame white kerf, the pieces part 1 px, crumbs fly at both ends; sound `cut{i}` and haptic `cut`; the next guide lights.
  - At step end: the whole view shakes 1 px sideways for 2 frames.
- **Guide.** The dashed amber line is the glyph. The first-time demo hand slides along it; after 5 s idle the hand repeats.
- **Exit.** 400 ms → the `reveal` event → slide board→plate carrying the cut jeon.

### 3.5 Plate: result
- **Composition** (`GEO.rev2`, stage art px).
  - Plate: centre (72,89), prx **39**, pry 26, rim 5, thickness 3, colour from `look.plate`.
  - Jeon: centre (72,86), jrx 29, jry 19 (the same size as while cooking), with dents, band, herb and cuts.
  - Soy dish at (98,54), rx 9, ry 5.
  - Steam rises to stage row 26, with twinkles and the rare flare, as in REV.
  - Every REV2 pixel except the soy dish and the steam lies in stage x 33..111. At 360x740@2 the plate covers x 5..356 CSS.
- **Timeline** (t = 12 fps frames since the reveal event).

  | t | what shows |
  |---|---|
  | 0-2 | slide, with the cut jeon carried at lift 2 |
  | 3 | jeon on the plate at lift 2, with a checker shadow; it looks exactly like the board's last frame (sep 1, no nudge, no garnish) |
  | 4 | lift 1 |
  | 5 (417 ms) | landing: the plated look (pieces nudged by the seed, garnish 8); a 1-frame squash (rx+2, ry-1); the whole view shakes 1 px down for frames 5-6; haptic `done`; the existing `done` sound lands here (`COOK_LAND` 0.4 s) |
  | ≥ 6 | at rest; steam, twinkles and flare on the 96-frame loop |
- **Chip.** At 450 ms (`TUNE.reveal.focusMs`) the chip shows the **again** icon. It is visible, not quiet, and takes keyboard focus. It ignores presses until 900 ms.
- **Close** stays top-right.
- There is no idle hand, no auto-advance and no timer. Pressing the plate does nothing.
- **Strip.** All three icons are done.
- **Save.** The book line is written and the pot cleared at the reveal event, as today (`finish()`).

### 3.6 Again
1. The chip, after 900 ms, triggers 'again'.
2. Sound and sticker `pick` fire.
3. A new run starts (dayN+1) and its pot is written immediately.
4. The view slides plate→counter without carrying anything: the plate leaves with the dish and a fresh pan with a new lump of batter arrives.
5. The tap step's 250 ms gate equals the slide.

## 4. Transitions
- **When.** Slides happen on every station change except:
  - at open or resume;
  - under reduced motion, where the station changes on the next frame;
  - on a tab returning from hidden.
- **Timing.** t0 is the `start` or `reveal` event time on the sim clock.
  - Frame `f = floor((t - t0)/83.33)`. Frames f = 0/1/2 use offset `s = round(STRIDE × 0.40 / 0.75 / 0.94)`.
  - From f ≥ 3 the slide is over and the live scene is shown.
  - Arrival at 250 ms equals `TUNE.gateMs`, so the sim already ignores new pointers for the whole slide.
- **Composition per slide frame** (view buffer V, W x H):
  ```
  seam = ox + 72 + floor(STRIDE/2) - s                      columns < seam: outgoing, >= seam: incoming
  view(V, {station: from, ox: ox - s,          oy, x0: 0,    x1: seam})  + blit interior of OUT at (ox - s, oy), x < seam
  view(V, {station: to,   ox: ox - s + STRIDE, oy, x0: seam, x1: W})     + blit interior of IN  at (ox - s + STRIDE, oy), x >= seam
  carry (if any) at food centre (ox + 72, oy + 86), lift 2, with shadow: fixed on screen, never moves
  ```
- **Slide table.**

  | slide | OUT | IN | carried |
  |---|---|---|---|
  | counter→stove | `base({station:'counter'})` (wall and wood, no pan) | `base({station:'stove', pan:false})` | `carry({what:'pan'})` (pan with the raw batter) |
  | stove→board | `base({station:'stove', pan:true, heat:true})` | `base({station:'board'})` (board and resting knife) | `carry({what:'jeon'})` |
  | board→plate | `base({station:'board'})` | `base({station:'plate'})` (REV2 plate and soy, no jeon) | `carry({what:'cut'})` |
  | plate→counter (again) | snapshot of the last reveal frame | the live tap scene | none |
- During a slide there is no hand, no particles and no steam (the bases are still pictures), and no sound or haptic.
- `frameSig` includes the slide frame.
- Arrival: on step slides the carried object sets down 2 px as the live scene takes over. On the plate, REV2 continues from lift 2 (t 3).

## 5. HUD
At most three items during a step: strip (top-left), close (top-right) and the quiet chip (bottom-centre).
- **5.1 Strip.**
  - Icons `tap`, `flip` and `slice`. The current icon is raised with the amber line, done icons are at full opacity, upcoming ones at 45 %.
  - On a resumed dish, earlier steps show as done. On the result, all are done.
- **5.2 Close.**
  - Always present. Its click calls `close()`, which saves the pot.
  - Esc is the native dialog cancel. A `cancel` event marks the close as by key.
- **5.3 Chip** (`.ck-verb`).

  | key | icon | aria-label |
  |---|---|---|
  | tap | `tap` (pointer hand) | 톡톡 |
  | heat | `heat` (new flame) | 불 켜기 |
  | flip | `flip` (spatula) | 뒤집기 |
  | slice | `slice` (knife) | 썰기 |
  | again | `again` (new loop arrow) | 다시 |

  - Quiet rules are kept as today:
    - invisible on touch until the first idle or teach hint, or a press on it;
    - a finger press on the quiet chip only reveals it, and its stroke is routed to the stage (`onRowDown` → `onDown(e, true)`), so a flick that starts on the chip still flips;
    - a click with no pointer press (keyboard or screen reader) acts at once;
    - held Enter and Space repeats are swallowed.
  - `live().verb` returns the aria-label.
- **5.4 Stickers** (owner Q1).
  - **Layer placement.** `.ck-stick` is a strip at top hudB + 4, full width, height s = 32·n/dpr CSS (n = floor(2·dpr), so 64 CSS at DPR 2 and 3 and 61 at 2.625). One sticker px equals n device px; the old zoom (sticker px = art px) would give 144 px stickers.
  - **Slots.** Slot 0 is at left `max(8, safeL+8)`, slot 1 at right `max(8, safeR+8)`.
  - **Visibility.** The layer shows only when `hudB + 4 + s + 8 <= (44 + oy)·css`:
    - shown at 360x740 (140 ≤ 198), 412x915 (140 ≤ 270) and 390x844 (187 ≤ 252);
    - hidden at 320x568 (140 > 132) and 360x560.
  - **Rules.** It never covers food, marks, guides, the hand, the HUD or the chip. `pointer-events: none` and `aria-hidden`.
  - **Options.**
    - (가) all 19 stickers, as now;
    - (나) **default**: no feeling faces. Never cue 감동 `moved`, 뿅 `love`, 두근 `flush`, 깜짝 `shock`, 퓻 `ink`, 갸웃 `hmm` or 진땀 `sweat`. The jeon script flip becomes `['cheer','thumbs']`, global flip `['cheer','thumbs','clap']` and done `['heart_plate','star']`;
    - (다) cook.html stops loading the sticker files and the layer stays empty.
- **5.5 Notice.** `COOK.notice()` keeps working (placed under the HUD; it never moves the canvas or takes focus), but nothing calls it. Any future use needs an owner decision, because it shows words.

## 6. Text inventory after the change
| place | before | after (visible) | screen reader |
|---|---|---|---|
| close | '닫기' text button floating above the stage | pixel X chip, top-right | aria-label 닫기 |
| counter pan tag | 해초전 / 이어서 | gone (no counter; a resumed dish simply shows its half-made state) | - |
| step title tag (600 ms) | 톡톡 / 뒤집기 / 썰기 | gone; the station slide, the glyph on the food, the strip and the first-time hand replace it (`titleMs` kept as an invisible timer) | aria-live says the step word at each start, as now |
| verb button | 톡톡 / 불 켜기 / 뒤집기 / 썰기 / 돌아가기 | icon chip | aria-label 톡톡 / 불 켜기 / 뒤집기 / 썰기 / **다시** |
| dish name at the reveal | 해초전 paper tag | gone; the plate is the name | dialog aria-label 해초전 + aria-live plate description |
| notice slot | host text + 보러 가기 | dormant (never called) | - |
| cook.html credits link | 만든 것들 on the counter and the closed page | closed page only (standalone, never in the game) | link text |
| cook.html closed page | 부엌 door | unchanged (outside the kitchen, standalone only) | - |
| `title` attributes | none | none (tested) | - |

- The aria-live lines are unchanged: the step word at each start, 반쯤, 보들보들 / 노릇노릇 / 바삭바삭, 한 줄, 다 됐어, and the plate description, e.g. "해초전. 노릇노릇 구웠어. 반듯하게 썰었어.".
- The only new string is 다시 (KS X 1001; add it to VOCAB).
- Run `python3 tools/subset-fonts.py --check` once.

## 7. Haptics

### 7.1 `js/haptics.js` changes (API kept: `buzz`, `on`, `set`, `supported`, `PATTERNS`, `KEY`)
- **`supported()`** is true only when all hold: `typeof navigator.vibrate === 'function'`; the UA does not match `/Firefox\//`; and `matchMedia('(any-pointer: coarse)').matches`.
- **`buzz(name)`** returns false without calling `vibrate()` when the setting is off, when `!supported()`, when `document.visibilityState !== 'visible'`, or when `navigator.userActivation && !navigator.userActivation.hasBeenActive`. Wrap everything in try/catch. Keep the 30 ms merge for single pulses.
- **Kitchen patterns:** tap 14, flip 24, cut 16, done [16, 80, 26]. They stay ≤ 3 pulses and ≤ 250 ms, with gaps ≥ 70 ms. Leave tick, jump, land, hit, pick, drop and nope unchanged.

### 7.2 Hooks in `js/cook.js` (beside `sound()`, outside the sim)

| event | pattern | exactly when |
|---|---|---|
| `hit` (finger, hold auto-tap, chip) | tap | in `onEvent` (same handler as the frame change and the sound) |
| `heat` | tap | in `onEvent` |
| flip landing | flip | the frame where `t >= L.landAt` (250 ms after the flip event), once per flip; reduced motion: at the `flip` event |
| `cut` | cut | in `onEvent` |
| plate landing | done | the frame where reveal t reaches 5 (417 ms), once; reduced motion: at the `reveal` event |

- The call is `try { if (typeof HAPTICS !== 'undefined') HAPTICS.buzz(name); } catch (e) {}`. Count attempts in `L.stats.buzz`.
- Never: dust, `pat`, nudges, band changes, slides, DOM button presses themselves, opening or closing.
- iPhone has no web vibration. Every haptic moment above also has a flash, squash or shake, so nothing is lost there.
- README.md:47 becomes true.

## 8. Sound
- No change to `js/audio.js`, `foley/` or the act names. Sound stays off by default.
- `pick` fires at open and at again. While audio is still locked it is dropped (the 0.3 s early window), and the first tap plays its own pat.
- `done` lands at t 5.
- `quiet` fires on close and on hidden.

## 9. Reduced motion
Sources: `opts.reduced`, `data-motion=reduce`, or `prefers-reduced-motion`.
- **Off:**
  - slides (the station switches on the next frame);
  - the reveal drop, squash and shake (the plate is at rest at t 0);
  - squash, particles and shake everywhere;
  - the arc (the faces swap instead);
  - hand motion (still pose);
  - steam motion (still picture);
  - the arrow bob.
- **Kept:** rims, dents, kerfs, band colours, the knob state, the arrow (still), the strip states and the chip.
- Haptics follow their own switch, with timings as in §7.2.

## 10. Keyboard, focus and screen reader
- **Tab order:** close, then the chip. The stage has tabindex -1 and is only a focus target.
- **Keys.** Enter or Space on the chip performs the step:
  - tap: 3 hits on the next mark;
  - heat: turns the heat on;
  - flip: flips at the band now;
  - slice: cuts the lit line straight;
  - result: again (after 900 ms).
  - Esc closes.
- **Focus.** On open, resume and again: the chip if the last input was a key, otherwise the stage. Step to step: unchanged. Result: the chip at 450 ms if by key, otherwise the stage. Close: the opener (in the game, the parent focuses `#btn-cook`).
- Rings show only after key input (`ck-kbd`). The dialog aria-label is 해초전. The aria-live line is unchanged.
- **Closing by key.** `opts.onClose` is called with `{kbd: true}` when the dialog closed by Esc or by keyboard activation of close.

## 11. Save, resume and potOld
- **Store:** `{v, day, dayN, seen, pot, book}`, plus an optional `potOld` (array, newest first, ≤ 4 plain objects, each with JSON ≤ 2048 bytes).
  - `normStore()` keeps a valid `potOld` and drops junk entries.
  - `'{{{'` still normalises to the 6-key default.
- **Migration on open:** if `o.pot` exists and `resumeRun(o.pot)` fails, `potOld = [o.pot].concat(potOld).slice(0, 4)` and `pot = null`. The pot is kept byte-identical. It is never resumed, never exported, and import is unchanged.
- **Pot writes:** at step boundaries, on hidden, on pagehide, on close and at again. The book gets one line per finished dish, at most 300, newest first, as now.

## 12. Embed overlay
| direction | message | when |
|---|---|---|
| iframe → parent | `ready` | load (unchanged) |
| iframe → parent | `{ppolCook:'close', kbd}` | `onClose`; kbd is true when closed by key (`app.js cookMsg` already reads `d.kbd`) |
| parent → iframe | `open` / `close` | unchanged |
| parent → iframe | `{ppolCook:'safe', t, r, b, l}` (CSS px numbers, clamped 0..200) | on `ready`, right before every `open`, and on `resize` / `orientationchange` (debounced 100 ms) |

- **`js/app.js`.** Measures with a fixed probe div that has `padding: env(safe-area-inset-*)` and reads its computed padding. Nothing else changes: the weekly `kitchen` task, the `weekTell` wait for an open overlay, the focus return, `#btn-cook` and the iframe title.
- **`cook.html`.**
  - On `safe`: set `--ck-safe-t/r/b/l` on `documentElement`, then call `COOK.refit()` if the kitchen is open.
  - Pass `kbd` through to the parent.
  - Delete `creditLink()`; the credits link shows on the standalone closed page only.
  - Font fallbacks become 'Galmuri11'.

## 13. Art contract (`js/cook-art.js`)

### 13.1 GEO
- **Add:**
  - `rest.spatula: [100,112]` (was [112,92]);
  - `flipArrow: [72,110]`;
  - `knob: [96,148]` (the burner) and `knob0: [48,148]` (decorative);
  - `knobDot: [106,142]` (2x2: `C.s2` off, `C.a2` on);
  - `rev2: { pcx:72, pcy:89, prx:39, pry:26, rim:5, pth:3, jcx:72, jcy:86, jrx:29, jry:19, soy:[98,54,9,5], glints:[3,9], garnish:8, shadow:2, thick:2 }`.
- **Unchanged:** `food`, `box0`, `boxW/H`, `markBase`, `cross`, `dish`, `small`, `board`, `pan` (test 12b).

### 13.2 Stove station (stage art px, Apollo only)

| rows | what |
|---|---|
| 2-17 | wall, identical to bgStep |
| 18-20 | trim, identical to bgStep |
| 21-135 | light enamel top: base `s5`; the lamp pool (from (6,10), r 40) as a 50 % `s6` checker; a 1-px `s4` shadow line at row 21 |
| 136-139 | front lip: `s6`, `s5`, `s4`, `s3` |
| 140-157 | knob panel: `s3`, bottom row `s2`; two 11x11 knobs |
| ≥ 158 | oven door (view bleed only): `s4`, with an `s3` seam every 10 rows |

- **Grates:** four coal bars (3x7, with an `s2` highlight on the lamp side) at x 52 and 92, rows 40-47 and 127-134. They are painted before the pan, so they peek out above and below its rim.
- **Knobs:** `ink` outline, `s5` face, `s6` arc at the upper left, `s2` at the lower right. The pointer is a 1x4 `ink` line, pointing up when off; the right knob points to 2 o'clock when on.
- **Pan shadow:** `shadeAt` already maps `s6`→`s5`→`s4`.
- **Flames:** the existing `panHeat` tongues and glow, amber on light enamel.

### 13.3 New or changed exports
- **`view(b, o)`.**
  - `o = {station, ox, oy, x0 = 0, x1 = b.w}`. Paints columns x0..x1-1, every row of `b`, with that station's background only (no pan, board or plate) in stage coordinates shifted by (ox, oy), for any `b` size and any offsets.
  - The pattern functions (planks, wood grain, lamp pool) take stage coordinates, so x and y may be negative or past 144/160.
  - **Contract:** inside the stage interior, the pixels equal `bg(station)`, where bg is bgStep for counter, board and plate, and bgStove (knobs off) for stove.
- **`base(b, o)`** (b is 144x160). `o = {station, pan, heat, f, still}`.

  | station | paints |
  |---|---|
  | counter | bgStep |
  | stove | bgStove, plus `pan(PAN_STEP)` when `o.pan`, plus `panHeat` and the knob on when `o.heat` |
  | board | the cached board base with the knife at `GEO.rest.knife` |
  | plate | bgStep, the REV2 plate and the soy dish (no jeon) |

  Each base includes the 2-px frame, which the live code never shows.
- **`carry(b, o)`.**
  - `o = {what, x, y, lift = 2, shadow = true, herb, dents, band, look, seed}`. (x, y) is the food centre in `b`; the object is drawn at y - lift.
  - What each kind looks like:
    - `pan` is the pan with the cold raw batter exactly as `flipScene({heat:false})` paints them;
    - `jeon` is the cooked jeon exactly as `sliceScene` paints it before any cut;
    - `cut` is the jeon exactly as `sliceScene` paints it with both lines cut (sep 1, no crumbs or steam).
  - Shadow: a 50 % checker of `shadeAt`, 3 px right and 3 px down, only where the object is not painted.
  - The result is clipped to any buffer.
- **`revealScene(b, o)`.** With `o.geo === 'close'` it uses `GEO.rev2`, driven by `o.t`:
  - `t` null paints the rest frame (reduced motion and tests);
  - `t ≤ 3` paints lift 2 with a shadow, in the board's cut look;
  - `t 4` paints lift 1;
  - `t 5` paints the plated look with garnish 8 and the nudge, plus the squash rx+2 / ry-1;
  - `t ≥ 6` paints the rest frame with steam, twinkles and the flare on the 96-frame loop.

  Without `geo` the old REV path is unchanged. It stays in the tests and is unused live.
- **`flipScene`.** Always paints the stove base. The arrow is drawn at `GEO.flipArrow`; the right knob and its dot follow `o.heat`. Every existing input and beat is unchanged.
- **`icon('heat')`** is a flame and **`icon('again')`** a loop arrow with an arrowhead. Both are 16x16 in `ICON_K` colours with silhouettes distinct from `tap`, `flip`, `slice` and `close`. `ICONS` lists them.
- **`shake(b, dx, dy, m)`.** `m` is the margin, default 2, which is today's behaviour (the frame stays). With `m = 0` the whole buffer moves with edge repeat.
- **Rules.** Deterministic: no trig, random or clock. Caches are keyed by their inputs. No text in the file. Props are Apollo only; FOOD colours only on food, oil, glints and steam. Alpha is 0 or 255.

## 14. `js/cook.js` contract (for WP-C's tests)
- **DOM classes** as in §2.5; `.ck-close`, `.ck-verb`, `.ck-cv`, `.ck-stage` and `.ck-say` keep their names.
- **`COOK.live()`** returns everything it returns today, plus:
  - `screen` ∈ {'closed', 'step', 'reveal'};
  - `station` ∈ {'counter', 'stove', 'board', 'plate'};
  - `slide`: null or `{from, to, f, s}`;
  - `view`: `{k, css, W, H, ox, oy, hudB, chipTop, safe:[t,r,b,l]}`;
  - `verb`: the chip's aria-label, or '' when hidden;
  - `stick`: whether the layer is shown;
  - `stats.buzz`: `{tap, flip, cut, done}`.
  The old `k`, `css`, `tight` and `pending` remain. `tight` is now always false.
- **`COOK.refit()`** re-runs `fit()`.
- **`COOK.auto(on)`** plays the current dish through the chip path and stops on the reveal (it does not press again).
- **`opts.onClose({kbd})`.** `COOK.open` never throws. `notice`, `exportData` and `importData` are unchanged.
- **The render loop:**
  1. Paint the stage scene into `L.buf` (144x160), then particles and the hand.
  2. Compose the view: `view(V, …)` (cached per station, W, H, ox, oy), then blit the interior; or compose a slide frame (§4).
  3. If there is a shake: `shake(V, dx, dy, 0)`.
  4. `putImageData(V)`.
- **Fallbacks** (must never throw):
  - if `COOK_ART.view` is missing, the bleed repeats the edge rows and columns;
  - if `base` or `carry` is missing, slides move whole scenes without a carry;
  - an unknown icon falls back to `'tap'`.

## 15. Tests
Never weaken a test: every removed check is replaced by one that checks the same intent where it now lives.

### 15.1 `tools/test-cook.js` (WP-B)
- **Changed checks.**
  - The verb-label check expects '다시' on the reveal (was '돌아가기').
  - Test 14: VOCAB gains '다시'.
- **New checks.**
  - **Pins:** `TUNE_HASH === 2827089308`. `normStore` keeps a valid `potOld` (≤ 4, ≤ 2048 bytes each), drops junk, and `'{{{'` still gives the 6-key default.
  - **Close-up art:**
    - (a) **Seam.** For each station and the offset pairs (-32,0), (-32,-11), (-31,10), `view()` into an 84x190 buffer equals `bg(station)` inside the interior, with zero differing pixels.
    - (b) **Bleed periods.** Wall rows above stage row 2 repeat every 7 rows; below row 157 the glue lines of the wood are 11 rows apart.
    - (c) **Carry continuity.** Every pixel `carry()` paints at lift 0 without a shadow equals the matching still scene (pan → cold flipScene; jeon → sliceScene before cuts; cut → sliceScene with both lines cut). `carry('cut')` also equals REV2 at t 3, allowing for the lift.
    - (d) **REV2.** At rest, its pixels lie in x 33..111 except the soy dish and the steam. Frames t 3, 4, 5 and 6 differ as specified, and garnish pixels appear only from t 5. The 96-frame loop holds (t 400+f equals t 496+f).
    - (e) **Stove.**
      - Stove, knobs and grates are Apollo only.
      - The oil-ring, heat-on, band-change and landing tests (16) still pass on the stove.
      - The arrow pixels are at `GEO.flipArrow` and the spatula blade lies in x 92..107.
      - The knob dot is `s2` with heat off and `a2` with heat on.
    - (f) **Icons.** `heat` and `again` exist, are 16x16 and Apollo only. Every pair among tap, heat, flip, slice, again and close differs in ≥ 25 % of the union of their alpha masks.
    - (g) **Shake.** `shake(b,1,0,0)` shifts the whole buffer with edge repeat; `shake(b,1,0)` is unchanged.
    - (h) **Determinism.** Every new painter gives the same bytes in a fresh instance, with alpha 0 or 255 only.

### 15.2 `tools/test-cook-live.js` (WP-A)
- **Helpers.** `T.pt` maps through the `.ck-sim` rect (288x320). `T.verb()` reads `aria-label`, hidden, opacity and shown. There is no `.ck-prop`. `T.hash` hashes the full `.ck-cv`.
- **Mapping of today's tests:**
  - L1 touch dish open → tap → flip → slice → reveal → again (after 900 ms) → new run at tap: si 0, new id, book +1. Runs at DPR 2 and 2.625. Captures go to `COOK_SHOTS`.
  - L2 keyboard only.
    - Tab order is close → chip, and every step is done with Enter on the chip.
    - At ≥ 450 ms the result chip `다시` has focus. Enter before 900 ms does nothing; after that it starts a new dish.
    - Esc closes. `activeElement` is checked after every move.
  - L3 quiet chip. Opacity 0 on touch, yet `getByRole('button',{name:'톡톡'})` finds it. After 5 s idle, the hand and the chip show.
  - L4 unchanged.
  - L5 becomes layout: no horizontal scroll at the 7 L5 sizes. `notice()` does not move the canvas; the notice sits under the HUD with a button ≥ 44 px and takes no focus.
  - L6 unchanged. Every counted input changes the next frame, and the AUDIO acts start with `pick` at open.
  - L7 reduced motion.
    - `live().slide` is always null, and the station changes between two consecutive frames.
    - The reveal is at rest on its first frame.
    - Still hand. No squash, particles, shake or arc.
  - L8 reload in step 2: the kitchen opens straight at the flip on the stove, with step 1's dents. No text at all. The strip shows step 1 done and step 2 current.
  - L9 bad pots (old tune, wrong si, junk): each moves byte-identical into `potOld` (newest first, ≤ 4), and a new dish starts. The book is untouched; there are no errors.
  - L10, L11 (with the chip), L12 (notice under the HUD), L13 (start at open) and L18 (auto starts at once) keep their meaning.
  - L14 becomes N1 plus "console errors 0 across the whole run".
  - L15 chip routing.
    - A stray tap on the quiet chip only shows it, with no progress.
    - A flick that starts on the chip flips.
    - A click with no pointer press acts.
  - L16 hints.
    - A first demo is not wiped by presses that change nothing.
    - Three nudges bring the re-teach.
    - On the result there is no hand for 6 s. The chip shows from 450 ms and ignores presses until 900 ms.
  - L17 edge strip and demo timing.
    - A touch starting at x 20 in the tap step counts nothing; one at x 26 at the first mark's height counts a hit.
    - The first-seen demo hand starts 600 ms ±1 frame after the step start (2400 ms under `?slow=4`). There is no title element.
  - L19 also checks that `revealScene` receives `geo:'close'` and `t`.
- **New checks:**
  - **N1 zero visible text.** On every screen of a dish (open, each step at 300 ms and mid-step, every slide frame, the result at 1 s and at 6 s, after again):
    - `textContent` of the dialog minus `.ck-say` is '';
    - no element in the dialog has `title`;
    - every `::before` and `::after` has content none or '';
    - `document.body` of the embed page shows no text.
  - **N2 fit.** At 360x740 @2/@3, 320x568 @2/@3 and 412x915 @2/@3/@2.625:
    - `live().view` equals §2.3;
    - the canvas box is (0, 0, W·css, H·css) on whole device px and covers the dialog (no letterbox);
    - stage rows 28..132 lie in [hudB - css, chipTop + css].
  - **N3 hero size.** The jeon spans ≥ 69 % of vw at those 7 sizes, and ≥ 2.2x the old 116 px at 360x740@2.
  - **N4 HUD.**
    - The close chip is 48x48 inside a 56x56 hit area, and the verb chip is 64x64.
    - Both are inside the safe rectangle, and neither overlaps the food box or any guide.
    - Strip and HUD icons sit on whole device px, with a whole number of device px per icon px.
    - Marks and guide ends are ≥ 32 CSS px from the left and right edges.
  - **N5 slides.**
    - counter→stove: `slide.f` is 0/1/2 at 0/83/167 ms, with `s = round(STRIDE·0.40/0.75/0.94)`, and null from 250 ms.
    - A press at 100 ms is not counted.
    - The carried pan's centre 3x3 art px keep their colours on every slide frame.
    - The same holds for stove→board and board→plate.
    - Again slides plate→counter without a carry. Under reduced motion there is no slide.
  - **N6 haptics.** A fake `navigator.vibrate`, installed by an init script, records the calls. With the default setting:
    - no call happens before the first touch ends;
    - each counted tap gives 14, merged within 30 ms;
    - heat-on gives 14;
    - flip gives 24, between 230 and 300 ms after the flip event;
    - each line cut gives 16;
    - the plate gives [16,80,26], between 400 and 470 ms after the reveal event;
    - dust, nudges, bands, slides and chip presses that do not progress give nothing.
    - With `ppolppol_haptics` set to `{on:false}` there are 0 calls. Under reduced motion, flip fires at the flip event and done at the reveal event.
  - **N7 resume and again.** Closing mid-step 2 and reopening gives step 2 of the same run id. After again: a new run id, the book +1, and a pot for the new run.
  - **N10 safe insets.** Setting `--ck-safe-t: 47px; --ck-safe-b: 34px` and calling `COOK.refit()` gives hudB 111 and chipTop vh-114. The HUD and chip are inside, and the canvas still covers the dialog.

### 15.3 WP-C test files
- **`tools/test-haptics.js`** (new, node, with stubbed navigator, document, matchMedia and localStorage):
  - default on; `set(false)` stops all calls;
  - no activation, hidden page, a Firefox UA, or no coarse pointer → no call and `supported()` false where §7.1 says so;
  - the 30 ms merge;
  - exact kitchen patterns, each ≤ 3 pulses and ≤ 250 ms, with gaps ≥ 70 ms in `done`.
  Add it to `npm test` (package.json) and to the fast CI job (`.github/workflows/test.yml`).
- **`tools/test-cook-stickers.js`.** Under (나), no feeling id appears in any rule or in the jeon script that cooking moments reach. The "≥ 5 stickers per dish" check stays.
- **`tools/test-cook-stickers-live.js`.**
  - K1: the stage child order is `ck-cv ck-sim ck-stick`. `pick` reaches the stickers at open, before any touch. The save keys are still exactly book, day, dayN, pot, seen, v.
  - K2: box s = 32·n/dpr, at the slots of §5.4.
  - K3: no overlap with the food box, marks, guides, hand, HUD or chip. The layer is hidden at 320x568 and 360x560.
  - K4: reopen resumes with no counter; a second dish via again; nothing after close.
- **`tools/test-cook-audio.js`.**
  - Every scene starts at open; no `.ck-prop`.
  - H: a pot at the flip step, so the first touch is heat-on, giving the heat sound and sizzle 0.
  - I: with sound on, the first touch 2 s after open lands on a mark, and the first sound is `cook_pat`, not `cook_pick`.
  - G: the credits link appears only on the standalone closed page (≥ 44 px tall, on screen), never inside the dialog.
- **`tools/smoke.js` scene Z.** Keep every check. Also check:
  - the kitchen is in a step right after opening (`screen 'step'`, `kind 'tap'`);
  - the dialog text is '';
  - `.ck-close` has aria-label 닫기, is ≥ 48 px and has no text;
  - reopen resumes the same run id;
  - the iframe has `--ck-safe-t` set from the parent's 'safe' message.

## 16. Verification checklist
1. Run `npm test`, then `npm run test:slow` (or GitHub CI), then `python3 tools/subset-fonts.py --check`, which must report `stale: none`.
2. Capture at DPR 2, sound off, light scheme, into `docs/shots/cook/`, at **360x740** and at **320x568**. Replace the old 01-09 captures (counter and title tags).
   - `01-tap-start` at 700 ms, first-time demo hand visible;
   - `02-tap-mid`, 4 hits, a squash frame;
   - `03-slide` counter→stove, frame 1;
   - `04-flip-cold`;
   - `05-flip-golden`, arrow visible;
   - `06-flip-landed`, landing frame;
   - `07-slice-start`, guide with the demo;
   - `08-slice-mid`, one line cut;
   - `09-result`, t ≥ 6, again chip visible;
   - `10-result-reduced`.
   Plus `412x915@2.625` tap-start and result, and the embed (`index.html` play room → kitchen) at 360x740.
3. Eyes-on check of every capture:
   - [ ] zero characters anywhere;
   - [ ] jeon ≥ 69 % of the width at 360 and 412;
   - [ ] only strip, close and chip in the HUD;
   - [ ] no letterbox, no frame, no empty page colour;
   - [ ] nothing interactive under the status bar or home inset;
   - [ ] crisp pixels at 2.625 (no half-pixel blur);
   - [ ] stickers never over food or guides, and absent at 320x568;
   - [ ] pan and stove clearly separate (silhouette);
   - [ ] at 320x568 the pan bottom stays above the chip top.
4. Owner phone pass, sound off:
   - [ ] Android: a light buzz on tap, heat, flip landing and each cut (no buzz on the plate, O-5); Settings › 화면 › 진동 off silences them;
   - [ ] iPhone: nothing feels missing;
   - [ ] the flick distance feels natural (if not, tune `flip.flick` in a later change; the hash changes and pots go to `potOld`).
5. Report to the owner: conclusion first, 반말, short, with 360x740 screenshots.

## 17. Benchmark: what was borrowed and what was not
| principle (general) | our form | not taken |
|---|---|---|
| small "look" band over a big "do" surface | 64 px HUD on our plank wall over a full-bleed counter | no title bar, guide character, plate-clock timer, speech panel, gingham or pink and sky palette |
| the ingredient is the screen | our pixel jeon at 69-73 % of the width | no copied art, recipes or layout |
| cue drawn on the food at the hit spot | amber rings, up-arrow, dashed line (one glyph per gesture) | no blue arrows, no shake or tilt |
| show, then step aside | our pointer hand on first sight, on 5 s idle, after 3 nudges | no realistic first-person hands |
| short one-verb chain that always finishes | 3 steps with carry slides, no fail | no grades, medals, stars, stamps, 'Perfect', failure faces or catchphrases |
| the result is the dish | REV2 plate edge to edge, built from the player's own marks | no tablecloth or curtain staging, flag, points, fanfare or mascot thumbs-up |

## 18. Out of scope
- Runner end-card buttons (Q3).
- Runner and furniture haptic patterns: land 8 ms may be too short on ERM motors, and hit [40,30,40] smears.
- New dishes and the stir glyph (slice 2).
- A view of past dishes (the book is still recorded).
- A night variant of the kitchen.
