# Round 6 — kitchen feel, three dishes, the dining table, day effects, runner octopus, loading crawl: final spec

Lead design, 2026-11-18. Base: branch `claude/game-launch-completion-hwvre5` at **`ada2967`** (clean). Requirement:
`docs/OWNER_DECISIONS.md` section "주인 답 (11-18 KST: 6차 — 캐릭터 방향 · 달리기 문어 · 로딩 · 부엌 손맛 · 먹기)". Code was read,
not edited. "art px" = a pixel of the drawing grid; "dev px" = a device pixel; CSS px = dev px / DPR. Line numbers are at
`ada2967` and drift once lanes edit; the function names are what counts. The code map these references come from is
`wip/round6/notes/map.md` (facts at `ada2967`; where it suggests a design, this spec decides). Lanes: **K1** kitchen feel,
**K2** new dishes and the dish choice, **D** dining scene and effects (3D), **M** meal logic and UI (app), **R** runner
octopus and loading crawl. Revised 11-18 after the design review (booth sizing, tray rule, the octopus at the table,
loading cover, aura programs).

## 0. Decisions

### 0.1 Owner decisions implemented here (11-18)
1. **Runner octopus**: redrawn from the attic octopus, crisp at whole device pixels.
2. **Loading**: the octopus crawls from the **centre of the screen to the right edge**, repeating, the same on phone and computer.
3. **Kitchen feel**: when the food is properly cooked it goes **'띵'** — the sound only when sound is on (it is off by default),
   a **bell picture always**, **no new vibration**. **Spatula, knife and octopus stickers bigger.** Slicing cuts a clean
   **'+'** (centre vertical · centre horizontal) into **four** pieces with a satisfying split.
4. **Eating**: a **play-room table next to the counter with two sofas facing each other**. The finished dish is put on the
   table, **my character sits and eats**. I can **call the octopus**; it sits **opposite** and **decides each time** whether
   to eat (model when attached, **demo rules now**). Who decided is shown. No feeling words ('싫어서' and the like). If it
   does not eat it just sits there; if it eats it gets the effect too.
5. **Three dishes**: 해초전 + 주먹밥 + 과일 꼬치, **one effect each** (반짝이 · 별 · 꽃잎), each with a slightly different mix of
   톡톡 · 뒤집기 · 썰기.
6. **Effects last the day**: gone when the day changes; eating another dish that day replaces it.
7. **Process**: parallel cloud lanes, one branch each; the lead merges only after the owner says '넣어'; then one independent
   check, CI, production.
8. The Cooking Mama dining screen is a **principle-only** reference (sit at a table and eat). No shape, art or name is taken.
   (The 11-18 "character keeps its last facing" change is already in `e40a3f3`.)

### 0.2 Lead rulings (design choices; each is final for this round)
- **R1 The dish is chosen in the play room, not in the kitchen.** Tapping the counter shows a small tray of three dish
  pictures; the kitchen still opens straight into cooking (owner 11-15: no counter or menu screen inside the kitchen). If a
  half-made dish **with at least one finished step** waits (a pot that would really resume: `ver 'cook-1'`, its recipe's
  tune, `si ≥ 1`), the counter opens straight into it and no tray shows. An empty pot (`si 0` — `begin()` writes one the
  moment a dish starts, and closing saves it) or a pot that cannot resume does not hide the tray (§3.5).
- **R2 TUNE stays byte-identical** (`TUNE_HASH 2827089308`). New dish numbers live in a separate frozen `TUNE_R`; each recipe
  has its own pot hash (`tuneOf(recipe)`), and 해초전 keeps `TUNE_HASH`, so every saved 해초전 pot still resumes.
- **R3 '+' is a sim rule, not a TUNE edit.** Every slice step cuts exactly on its guide (offset 0, angle 0). `TUNE.slice.jitter /
  angStep / slant / angMax` stay only to validate old book looks. The slice step is always the last step or followed by a
  step that does not read the cut angle, and a pot holds finished steps only, so no saved pot changes meaning.
- **R4 Cut order: vertical first, then horizontal** ("가운데 세로 · 가로"; a portrait thumb swipes down first).
- **R5 The ding is synthesized at runtime** in `js/audio.js` (like the door creak buffer): no new file, no new credit, no
  request. It plays once per flip step, at the golden band event. The bell is a stage picture that pops and rings at that
  moment and stays while the food is golden.
- **R6 The booth = one table + two two-seater sofas facing each other, next to the counter** (owner '조리대 옆에 식탁 하나 +
  마주 보는 2인 소파'). Its size and place are **not fixed numbers**: D sizes and places it from the real character sizes
  under the rules of §4.1 (nothing overlaps seated or eating, the octopus's head clears the tabletop, both faces read, every
  `test-scene-perf` T7 corridor and the rest spot stay free), checks the rules in T8 and shows day and night shots before
  anything depends on the layout. (The first draft's one-seat 0.50 m sofas at x −1.38..0.48 could not hold the octopus —
  §4.1 says why.)
- **R7 Seats**: the octopus's seat faces the default camera side, so its face is seen three-quarters; mine is opposite (my
  back three-quarters to the camera). The octopus's choice is the thing the player watches.
- **R8 Demo decision**: seeded by the dish id + octopus name + born. The **very first call ever is 'eat'** (it shows what
  calling does — the same pattern as the salon's first dye, recorded as rule 'first'); after that **about 3 in 5 eat**
  (`P_EAT 0.6`). It never depends on the dish kind, the effect, the time or past answers: a rule that turned down some foods
  would invent a taste the octopus does not have.
- **R9 One answer per dish**: calling again for the same dish replays the same answer (never re-asked, never re-rolled). The
  answer is saved at the press of the call — only after the rules (`MEAL.canCall`) and the scene (`octCanCome()`, the exact
  check `octToTable` makes) both say the octopus can come, in the same handler; the meal (dish consumed + effects) is saved
  the moment eating starts; staging only replays saved facts. The day log draws an entry's rows only once it is eaten, and
  the decision row only if the octopus sat at that meal (§6), so an aborted visit never leaves a decision row for a visit
  that did not happen.
- **R10 Effects are derived** from the meal records ("latest dish eaten today wins", separately for me and for the octopus),
  so the day change and the replace rule need no extra state and survive two tabs.
- **R11 Model path = contract in docs only** this round (payload, menu, 8 s wait, reply rules, fallback — written in
  `docs/MEAL.md`, §4.4); no `request` / `readReply` code, no network change (nothing would call them yet; the salon's model
  path is unbuilt too). The records and rows still know every `by` value, so a later build's model answers display honestly.
- **R12 Effects are 3D pixel points** that follow each character in every room: the existing `PointsMaterial` variants,
  prewarmed under every light set an aura can show in (a program cache key includes the light counts, so "existing variant"
  alone is not enough — §5), 12 fps steps, pixel-centre snapped. No new shader program at any point.
- **R13 Runner sprite is baked natively** from the 3D octopus (`walkPortrait` + a new squash option) at the attic's 1× density
  (27 px/m): no downsampling, no rotation, no stretched `drawImage`. Faces stay `idle` — a **lead choice**, not an owner rule
  (owner C6 b covered code-written rows and left the play-room games' faces out of scope; `walkPortrait` renders only
  `idle`, and the old curious/happy/calm run/jump/hit faces were code painting a feeling). R lists it under decisions and the
  lead writes it in the owner notes as a lead choice.
- **R14 Loading crawl at the octopus's own gait**: 52 art px/s, legs 1.0 s per cycle, whole dev px per art px, starting
  centred, crawling to the right edge, repeating — on phone and computer alike (the owner asked for centre → right on both,
  not for equal size). Why it "barely moved" on a computer: the cover lifts two frames after the scene's first draw
  (`js/app.js` `booted`, ≈ 0.5–1 s on a warm desktop load), so speed alone cannot fix it. **Lead choice** (written in the
  owner notes as such): (a) on big screens the art px grows by whole dev px — one art px = max(round(2·dpr), floor(short
  side·dpr / 200)) dev px; phones keep 2 CSS px (1.905 at 2.625), 1280×800@1 gets 4, 1920×1080@1 gets 5 — so each pass takes
  about the same 2–4 s and every step is a visible 4–5 px; (b) the cover stays at least 1.0 s after it first shows (≈ one body length
  of crawl from the centre on a fast load; slow loads are unchanged; reduced motion has no minimum). R measures the real
  warm and cold cover lifetimes first (§8).
- **R15 Stickers**: one sticker px = `n` dev px with `n` the largest integer in `floor(2·dpr) .. floor(3·dpr)` that still fits
  above stage row 44 → 1.5× where there is room, never smaller than today, never shown where it is hidden today.
- **R16 Dining is 3D-only** (like the yard). The 2D fallback keeps the dish waiting and shows no table; the kitchen still works.
- **R17 No sound and no vibration in dining** this round (the owner's vibration list is unchanged; dining sounds are later).
  The think bubble goes through `bubble(…, { silent: true })` (otherwise it plays the bubble voice when sound is on).
- **R18 Five lanes**; `package.json`, `.github/workflows/test.yml`, `README.md`, `HANDOFF.md` and `docs/OWNER_DECISIONS.md`
  are lead-owned (lanes list what to add in their reports).
- **R19 The table and the other play-room games** (§4.3): while a call is staging (from the call press to the last bite,
  `mealBusy()`), the counter and the arcade do nothing (`openCook` / `openMachine` return false), so no overlay opens over
  the beats and no toast pops over the kitchen. After the meal the octopus stays seated while I sit; if I cook another dish
  from the seat, it lands on the table and the call chip shows above the seated octopus — tapping it asks about the new dish
  without a second walk-in (one answer per dish still holds).

### 0.3 Owner questions still open
None. Every choice above follows the owner's words or an earlier owner rule, or is a small lead choice that the lead writes
in the owner notes as a lead choice (R6's two-seaters as the reading of '2인 소파', R13's idle runner faces, R14's loading
size and minimum cover), so the owner can overturn it after seeing it.

## 1. Lines that must not break
- **Hard lines** (`wip/round6/briefs/COMMON.md` §Hard lines). In short: never claim the octopus feels, likes, wants or tastes;
  the model's words are never changed; no emoji or symbol characters in player text; sound off by default; never lose a
  save; fewer words; crisp pixels on whole device px; no copying of commercial games; vibration only at the owner's moments.
- **`TUNE_HASH === 2827089308`.** `COOK.VERSION` stays `'cook-1'`. No `Math.random` in `js/cook.js`, `js/cook-art.js`,
  `js/cook-dishes.js`, `js/meal.js` or any decision code.
- **The kitchen shows zero visible characters** on every screen (names only in `aria-label` and the hidden aria-live line; no
  `title` attributes). The dish tray, the table buttons and the call chip in the game are pictures only too: the
  `#dish-pick` chips, `#btn-table`, `#btn-seat` and `#btn-call` get **no `title` attribute** (the older scene buttons such as
  `#btn-cook` / `#btn-machine` / `#btn-sofa` carry one, which shows hover text on a computer — do not copy that).
- **Vibration**: kitchen `tap` / `flip` / `cut` (counted hits, heat-on, flip landing, each cut), runner jump / hit, furniture
  pick / drop. Nothing for the ding, the bell, the tray, the table, eating or effects. `tools/test-haptics.js` stays as is.
- **Saves**: `ppolppol_v2` gains `S.user.table` and `S.user.meals` (inside the lazily created `S.user`; nothing removed or
  renamed). `ppolppol_cook_v0` keeps its shape (`pot.tune` per recipe; bad pots still move to `potOld` byte-identical, and so
  does an empty pot set aside when another dish is picked on the tray; a pot with a finished step is never set aside).
  `ppolppol_runner` is untouched.
- **Scene budgets**: the play room without a meal stays ≤ 60 draw calls (T5); the whole scene ≤ 150; **shader program count
  never grows** after boot (T3/T5/T7 + the new T8, which also compares program cache keys). All T7 lanes and anchors keep
  their numbers (§4.1 rule 5 has the one flagged fallback).
- **Faces**: every code-chosen moment (call, think, answer by demo rules, eating) uses `idle`. Only a model's own `expr` may
  change the face, and only on the model path.

## 2. Kitchen feel (lane K1)

### 2.1 '띵' at golden
- **Trigger (exact).** The sim already emits `{type:'band', band:1, say:'노릇노릇', snd:{act:'sizzle',band:1}}` from
  `KIND.flip.tick` when the step clock passes `heatAt + bandMs` (3000 ms after heat-on), once per flip step
  (`js/cook.js` ~343). That event is the moment. It happens in every flip step (해초전 and 주먹밥), again after a resume (a
  resumed flip step restarts with the heat off). It never happens if the player flipped while still soft.
- **Live (`js/cook.js` `onEvent`, new `case 'band'`).** On `band === 1`: `L.bell = { at: L.lastT, si: e.si }`, then
  `sound({ act: 'ding' })`. No sticker call (the band event already cues stickers through `handle`), no `buzz`, no new aria
  word (the line already says '노릇노릇').
- **Bell picture (`js/cook-art.js`, new `bell(b, x, y, f, still)` + `GEO.bell = [102, 44]`, the sprite centre).** A 13×13
  art px desk bell, Apollo only: dome `a3` light / `a2` mid / `a1` shade, `r1` outline, 2-px `s6` shine at the upper left, a
  3×2 `a1` button on top, an 11×2 `w1`/`w2` base. Two swing frames: rows 0–6 shifted 1 px left (A) or right (B); ring marks =
  two 1×3 `a3` strokes 2 px outside the dome on each side plus one dot above, on alternate frames.
  - **Where**: stage x 96..108, y 38..50 — on the stove, just behind the pan's upper-right rim, inside the visible columns at
    every target size, below the HUD and clear of the sticker strip (checked: 360×740@2 CSS (288..342, 171..225); 412×915@2.625
    (327..386, 243..302); 360×740@3 (286..338, 182..234); 320×568@2 (256..304, 108..156); stickers end above y 164 / 153).
  - **Painted** in `render()` right after `paintStage(L.buf, …)` on non-slide frames (so it sits on top of the stage scene and
    the scene painters stay untouched), only while `run.st.kind === 'flip' && run.st.band === 1 && run.st.res === null`.
  - **Timeline** (12 fps frames since `L.bell.at`): f0 = pop (bell 2 px higher, 1-frame bright rim); f1–f7 = swing A/B
    alternating every frame + ring marks; f ≥ 8 = still bell, no marks. It disappears on the `band` 2 event or the flip —
    quietly (no sound, no mark, no colour cue): crisp is as good a result as golden (owner 11-15: no failure), the bell only
    says "golden now".
  - **Reduced motion**: still bell from f0 (no pop, no swing); ring marks drawn still for f0–f7.
  - `frameSig` includes the bell frame while f < 8.
- **Sound (`js/audio.js`).** In `onCook`, right after the `active()` check and **before** the foley queue: `act === 'ding'`
  → `ckDing(e)` (no foley map entry, no file). The ding needs no file, so it never waits for `foley/manifest.json` and still
  plays when that file fails to load (`ckDo` only runs after the manifest arrives — a ding placed there would vanish with
  it). `ckDing(e)` applies the same late rule as the other one-shots (`Date.now() − e.wall > COOK_LATE · 1000` → drop).
  It builds once and caches a mono `AudioBuffer` (0.9 s at the context rate): partials C6 1046.5 Hz (a 1.0, decay τ 0.32 s),
  C7 2093 Hz (a 0.35, τ 0.18 s), 2888 Hz (a 0.15, τ 0.08 s); 2 ms linear attack; 30 ms tail fade; one-pole low-pass 7 kHz;
  level like `cook_step` (rel −16 dB through the same RMS normalisation the creak uses, peak ≤ −3 dBFS); played through the
  kitchen one-shot path (sfx bus, kitchen ducking). Gated by `active()`: **sound off ⇒ no buffer, no context, no request**.
  Played at the event (no delay). The bell picture is the same with sound off.
- **Prefetch (`COOK_NEXT`, K1 owns these lines).** `open` gains `'cut'` (과일 꼬치 starts with a cut, its first cut must not
  be dropped as late), and a new `cut: ['place', 'step', 'done']` (K2's request: 과일 꼬치's cube taps play `place`, which
  nothing prefetches today — only `stir` does — and `done` is prefetched only after `flip`, which 과일 꼬치 has none of).

### 2.2 Bigger spatula and knife
| sprite | today (art px) | round 6 (art px) | 360×740@2 (k 9) | 412×915@2.625 (k 13) | 360×740@3 (k 13) | 320×568@2 (k 8) |
|---|---|---|---|---|---|---|
| spatula blade | 16×9 | **24×12** (5 slots) | 216×108 dev = 108×54 CSS | 312×156 dev = 119×59 CSS | 312×156 dev = 104×52 CSS | 192×96 dev = 96×48 CSS |
| spatula handle | 30 long, 2 thick + outline | **38 long, 3 thick + outline**, 40° | — | — | — | — |
| knife (whole) | ≈37×4 | **49×7** (blade 30, heel 6 tall → tip 2; bolster 3×7; handle 16×5 with 2 rivets) | 441×63 dev = 221×32 CSS | 637×91 dev = 243×35 CSS | 637×91 dev = 212×30 CSS | 392×56 dev = 196×28 CSS |
| bell (new) | — | 13×13 | 117 dev = 59 CSS | 169 dev = 64 CSS | 169 dev = 56 CSS | 104 dev = 52 CSS |

- Every art px is exactly k dev px (the stage buffer is blitted at integer k, `imageSmoothingEnabled = false`).
- **Spatula rest** `GEO.rest.spatula = [100, 114]` → blade x 88..111, y 108..119: below the jeon (bottom row 105) and clear of
  the flip arrow (x 68..76). The handle leaves the view at the lower right. While following the finger the blade centre sits
  **8** art px above the finger (`follow()`: `y/2 − 8`, was 6) so the blade is not under the thumb.
- **Knife**: the edge point under the finger is 14 art px from the tip (was 12); rest `[100, 124, 0]` (handle off the right
  edge). Cuts are now exact, so the live knife is drawn at 0° or 90°; keep the any-angle path for old callers.
- Deterministic, Apollo only, alpha 0/255, cached per angle (as today).

### 2.3 Bigger stickers
- Rule (`js/cook.js` `fit()`, sticker block): `n0 = floor(2·dpr)`; the layer shows only if it fits with `n0` (unchanged rule
  `hudB + 4 + s + 8 ≤ (STICK_ROW + oy)·css`, `s = 32·n/dpr`). When shown, `n` = the largest integer in `n0 .. floor(3·dpr)`
  that still fits. The layer zoom stays `n / dpr / 2` (the engine draws 2 CSS px per sticker px); slots unchanged.
- Results: 360×740@2 **96 CSS** (n 6, was 64); 360×740@3 **96** (n 9, was 64); 412×915@2.625 **85.3** (n 7, was 61);
  412×915@2 96; 390×844@3 with 47/34 insets 96; 360×640@2 stays 64 (n 4 — 5 and 6 do not fit); 320×568 and 360×560 hidden
  (owner rule, unchanged).
- Never over food, marks, guides, hand, HUD, chip or the bell (the bell is below the strip at every shown size).

### 2.4 '+' slicing
- **Sim (`KIND.slice.init`, `cutLine`).** Cross steps (`cross: true, lines: 2`): **line 0 vertical** through the food centre
  (`x = cx`, `y` from `cy − hy` to `cy + hy`), **line 1 horizontal** (`y = cy`). Offsets are always 0 (the seeded `rng()` for
  offsets is no longer drawn). Parallel steps (`cross` false) sit at `cx + (2i − (n−1))·gap/2` exactly. On every cut
  `L.ang = 0` (the drawn cut is the guide, however the finger wandered); the step tag is always `'straight'`; the look stays
  `{ cuts: [0…], offs: [0…] }` in the existing canonical order (index 0 = horizontal line for cross steps — all zeros, so old
  book looks keep their meaning; the sim's vertical-first line order is mapped onto it, and `tools/test-cook.js` §12b checks
  that mapping). The least-squares angle code may stay (unused) or go; the `cut` event keeps `ang: 0`.
- **Input tolerance (unchanged numbers).** Follow the lit guide anywhere inside ±32 logical px (±16 art px ≈ ±72 CSS at
  4.5×) moving within ±40° of its axis, 80 % of 40 bins; or slash across it inside 15–85 % at ≥ 50° with a chord ≥ 16 logical.
  Lift and continue is fine. The guide ends stay ≥ 32 CSS px from the screen edges (36 / 36 at 360×740@2).
- **Guides**: the existing dashed amber guide; line 0 (vertical, y 64..108 at x 72) lights first, then line 1 (horizontal,
  x 40..104 at y 86). The first-time / idle ghost hand slides down the vertical one first.
- **The split (art, `sliceScene` + `cutBuf`).** Cuts are symmetric: every piece moves `sep` px away from each cut, nothing
  else (no `half`, no `nudge`).
  - Cut frame (12 fps frame 0 of the cut): the pieces on both sides of the **new** cut jump to `sep 2` (a 4-px gap), the
    opened gap flashes `s6` (the existing 2-frame kerf flash), 3–4 crumbs burst from the line's middle (existing `burst`) and
    the art's crumbs sit at both ends (existing), sound `cut`, haptic `cut` (16 ms, unchanged).
  - Frame 1: back to `sep 1` (2-px gap) — the "딱" settle. After the second cut the four quarters rest at (±1, ±1).
  - Step end (both lines cut): the whole view shakes 1 px sideways for 2 frames (existing).
  - To know frame 0 from frame 1, K1 changes the juice value `J.cut` from a line index to `{ i, f }` (f 0|1) and passes
    `pop: J.cut && J.cut.f === 0` with `flash: J.cut ? J.cut.i : null` in the jeon `sliceScene` call (see §10.1).
- **Plate (`revealScene` geo 'close', `plated`, `dish`)**: t ≤ 4 = the board look (`sep 1`, unchanged carry continuity);
  t 5 landing = `sep 2` + the existing squash (rx+2, ry−1) + garnish; t ≥ 6 rest = **`sep 1`, four equal quarters, symmetric
  2-px '+' gap**. `plated()` / `dish()` drop `nudge` (DISHG) and `half`. The old `REV` path (tests only) may stay.
- `describe()` now always says '반듯하게 썰었어' for a slice; `'어슷하게 썰었어'` stays in `WORDS` (old looks, vocabulary).

## 3. Three dishes and the dish choice (lane K2)

### 3.1 The dishes
| id | name (aria) | steps (kind → station) | effect | food |
|---|---|---|---|---|
| `jeon` | 해초전 | 톡톡 → counter · 뒤집기 → stove · 썰기 → board | 반짝이 `sparkle` | unchanged (batter → jeon, '+' cut) |
| `jumeokbap` | 주먹밥 | 톡톡 → counter · 뒤집기 → stove | 별 `star` | a rice mound patted into a round cake in the pan, grilled until a golden crust, flipped (구운 주먹밥); plate: crust up + a nori band + sesame |
| `kkochi` | 과일 꼬치 | 썰기 → board · 톡톡 → **board** | 꽃잎 `petal` | a watermelon bar cut by **two exact vertical cuts** into three cubes, then each cube tapped onto a wooden skewer that already holds a green grape (tip) and a tangerine segment (end) |

- Each dish keeps the owner's verbs only (톡톡 · 뒤집기 · 썰기), each mix differs (3 / 2 / 2 steps, different order), and the
  ding (§2.1) comes with every 뒤집기. No new step kind.
- The dish → effect table lives in `js/meal.js` (`MEAL.DISHES`), the kitchen does not know about effects.

### 3.2 Sim (`js/cook.js` above the live marker)
- `WORDS.dish` gains `jumeokbap: '주먹밥'`, `kkochi: '과일 꼬치'` (both added to `VOCAB` in `tools/test-cook.js` test 14).
- `RECIPES` (pure data, frozen):
  ```
  { id: 'jeon', … unchanged … },
  { id: 'jumeokbap', tier: 1, at: 'pan', ings: ['rice'], steps: [
      { kind: 'tap', marks: 3, hits: 3, food: 'rice' },
      { kind: 'flip', band: 3000, food: 'rice' }] },
  { id: 'kkochi', tier: 1, at: 'board', ings: ['watermelon', 'grape', 'tangerine'], steps: [
      { kind: 'slice', lines: 2, cross: false, food: 'fruit' },
      { kind: 'tap', marks: 3, hits: 3, food: 'fruit', station: 'board' }] }
  ```
- `TUNE_R` (new, frozen, **outside TUNE**):
  ```
  jumeokbap: { food: { rice:  { cx: 72, cy: 86, w: 64, h: 48, rx: [18, 21, 24], ry: [13, 15, 17], inset: 3 } } },
  kkochi:    { food: { fruit: { cx: 72, cy: 86, w: 64, h: 48, rx: [24], ry: [9], inset: 2 } },
               tapAt: [[-16, 0], [0, 0], [16, 0]], tapJitter: 0 }
  ```
  `foodOf(r, step)` = `TUNE_R[r.id].food[step.food]` → `TUNE.food[step.food]` → `TUNE.food[r.id]` → `TUNE.food.jeon`, used by
  `initStep` and `validLook`. Every new step names its `food` (주먹밥's flip too: a step without one falls through to
  `TUNE.food.jeon` and gets the jeon's box); 해초전's flip keeps none (it resolves to `TUNE.food.jeon` as today). Recipe
  data, so `TUNE` is untouched. `KIND.tap.init` takes the per-recipe mark layout `TUNE_R[r.id].tapAt` and `tapJitter` when
  given (else `TUNE.tap.at` / `TUNE.tap.jitter`, i.e. 해초전 unchanged) — `initStep` passes them in. (Do not reuse the name
  `at` on a step: `at` is the recipe's place.) The kkochi marks land on the cube centres (stage x 56 / 72 / 88, y 86).
- **Pot hash per recipe**: `tuneOf(id) = id === 'jeon' ? TUNE_HASH : hash32(TUNE_HASH + '|' + JSON.stringify(TUNE_R[id]))`;
  `potOf` writes `tune: tuneOf(run.recipe)`, `resumeRun` requires `pot.tune === tuneOf(pot.recipe)`. Export `TUNE_R` and
  `tuneOf`. A 해초전 pot written by `ada2967` resumes unchanged (test with a golden pot JSON).
- `createRun('miyeok') === null` stays; `drawDish` dispatches to `COOK_ART.dishes[recipe].dish/dishSmall` when present;
  `stubDish` draws only the plate for non-jeon recipes (unchanged branch).
- Swaps: only 해초전 has one (herb). `describe('jumeokbap', [null,'golden'])` = '주먹밥. 노릇노릇 구웠어.';
  `describe('kkochi', ['straight', null])` = '과일 꼬치. 반듯하게 썰었어.'

### 3.3 Live (`js/cook.js` below the live marker)
- `open(opts)`: `L.recipe = recipe(opts.recipe) ? opts.recipe : null` (the sim's own lookup). `begin(isAgain)` (not
  `isAgain`): a pot with **progress** (`si ≥ 1`) that resumes always wins, whatever recipe was asked (a two-tab race or a
  typed `?recipe=` never sets progress aside). Otherwise, with `L.recipe` set (picked on the tray): a resumable empty pot of
  that recipe resumes (same seed); an empty pot of another recipe moves to `potOld` unchanged (the existing rule for pots that
  are not resumed: newest first, at most 4) and the picked dish starts. Without `L.recipe` (the straight-in path, standalone
  `cook.html` without `?recipe=`): any resumable pot wins, else 해초전. A pot that cannot resume moves to `potOld` as today.
  `again` repeats the current recipe. The dialog `aria-label` is set in `begin()` to `WORDS.dish[r.id]`. `pick` sound /
  sticker carry `dish: r.id` (as now).
- Stations: `stationOf(step) = step.station || STATION[step.kind]`; `onStart` slides only between different stations and
  carries per recipe (`jumeokbap` counter→stove carries `'pan'`; `kkochi` has no slide between its two board steps);
  `onReveal` slides from the last step's station with that recipe's reveal carry (`jeon` board→plate `'cut'`, `jumeokbap`
  stove→plate `'cake'`, `kkochi` board→plate `'skewer'`).
- `paintStage`: one inserted line directly after `if (!run) return;` — `if (paintDish(b, J, t, f, fx)) {} else` (its `else`
  is the existing `if (run.phase === 'reveal') …` chain, left as it is) — and a new function `paintDish` that returns false
  for 해초전 and otherwise calls `COOK_ART.dishes[recipe]` painters with the same option shapes as the jeon painters (shape,
  dents, marks, per, flash, squash, dust, f, heat, band, res, arc, spatula, arrow, bump, still, seed, fh, fbc, fl, lines,
  cur, hand, pop). **The jeon calls are not edited by K2** (K1 edits them; the untouched reveal line keeps the two edits
  apart, §10.1).
- Particles: per-recipe colours through a small map at the top of `burst()` (`drop` → white rice grains / red juice;
  `crumb` → rice / fruit bits); `onEvent` stays untouched by K2.
- Sound act per recipe in `sound()`: 과일 꼬치's tap hits play `place` (`cook_place`, an existing foley file) instead of
  `tap` — mapped **after** the 120 ms per-act gate (the gate keys on `tap`, which is in `SND_FREE`), so counted taps 90–120 ms
  apart are never dropped; `place` is prefetched by K1's `COOK_NEXT.cut` (§2.1). Everything else unchanged.
- Fallbacks: if `COOK_ART.dishes` or a painter is missing, the step still runs (paint the station background only) and
  `open()` never throws.

### 3.4 Art (`js/cook-dishes.js`, new, K2-owned; loaded by `cook.html` right after `js/cook-art.js`)
- Attaches `COOK_ART.dishes = { jumeokbap: {…}, kkochi: {…} }`; uses only exported `COOK_ART` helpers (`blank, put, rect,
  line, ellipse, dither, blit, board, plate, pan, panHeat, bubbles, arrow, spatula, guide, knife, hand, marks, particles,
  view, base, carry, shake, soyDish, twinkle, steamPass, clearSteam, fxSteam, F, PAL, GEO`). If a private helper is truly
  needed, K2 may add **one** line `API.kit = { … };` directly before `return API;` in `js/cook-art.js` and nothing else in that
  file.
- Rules as in `cook-art.js`: integer only, no trig/random/clock, alpha 0/255, props Apollo only, food may use Apollo + `F`
  (FOOD) colours; new FOOD entries only if needed, each a brighter sibling of an Apollo colour; caches keyed by inputs;
  ASCII comments; no text.
- **주먹밥**: counter scene = `PAN_STEP` pan on the counter wood with a rice mound (`s6` base, `s5`/`w6` 2×1 grains in a seeded
  pattern, `s3`/`s4` soft edge) that spreads lump → half → round at hits 3 and 6 (radii from `TUNE_R`), amber tap rings
  (`marks`), finger dents `s4`. Stove scene = stove base (via `base({station:'stove', pan:true, heat})`) + rice cake + the
  existing heat FX; crust colour by band: soft `F.B1`, golden `F.J5`/`F.J4`, crisp `F.J3` with `F.J2` specks (visible on the
  flip arc and after the flip); flip arc = the same four frames as the jeon (tilt raw, edge-on, tilt crust, landing squash),
  the flip arrow and the (K1-bigger) spatula as on the jeon stove. Reveal = REV2 plate geometry (`GEO.rev2` plate), cake crust
  up, an 8-px `F.T0`/`F.T1` nori band across the middle, 5 sesame dots `s6`, soy dish, steam; all inside stage x 33..111.
  Carry `'pan'` (pan + raw mound) and `'cake'` (crust-up cake) equal the still scenes' pixels.
- **과일 꼬치**: board scene = the existing board; a watermelon bar 48×18 at the food centre (`F.C1` flesh, `F.C2` light,
  `coal` 1×2 seeds, a 1-row `s6` rind line and a 2-row `g3`/`g2` rind along the bottom). Guides at x 64 and x 80 (exact),
  y 74..98. Cuts split into three 16-px cubes (`sep 1`, pop `sep 2` on the cut frame like §2.4). Tap scene (same board, no
  slide): the three cubes in a row at y 86 with amber rings on their centres; a wooden skewer (`w3`/`w4`, 2 px) lies below at
  y 100 holding a green grape (`F.P2`/`F.P3`, 7 px) at its left tip and a tangerine segment (`F.J3`/`F.J4`) at its right end.
  Each hit squashes that cube 1 frame; at its third hit the cube drops onto the skewer in 2 frames (y 86 → 100). Reveal = the
  finished skewer across the REV2 plate. Carry `'skewer'` equals the last board frame.
- `dish(b, look, o)` / `dishSmall(b, look, o)` for both (used by `COOK.drawDish`; the game shows no book yet).

### 3.5 The dish choice in the play room (the tray)
- **When**: tapping the counter (`#btn-cook`, or the scene tap on the counter that clicks it). `openCook(opener, kbd)` (K2)
  returns false at once while a call is staging (`typeof mealBusy === 'function' && mealBusy()`, R19), then reads
  `localStorage['ppolppol_cook_v0']` **read-only**. `cookPot()` returns `pot.recipe` only for a pot that would really resume
  **with progress**: a plain object, `ver === 'cook-1'`, a known recipe, `tune === COOK_TUNES[recipe]` and `si ≥ 1`
  (`COOK_TUNES` = a three-entry table in `js/app.js` next to `cookPot()`: `jeon: 2827089308` and K2's two pinned `tuneOf`
  numbers — the game page does not load `js/cook.js`, so smoke Z checks the table equals the frame's `COOK.tuneOf(id)`).
  Such a pot → open the kitchen straight away (resume). Anything else → show the tray: no pot, an **empty pot** (`si 0`), a
  pot from another build or tune, a broken one.
- **Why the empty pot does not count**: `begin()` writes a pot (`si 0`) the moment a dish starts, `again()` starts a fresh one
  and `settle0()` saves it on close — so open → pick → close, or plate → 다시 → close, leaves a pot behind. Counting it would
  skip the tray after almost every visit, and the owner's phone very likely still holds a round-5 해초전 pot (TUNE is
  unchanged, so it would resume): the first counter tap after the deploy would go straight into 해초전 and the two new dishes
  would look missing. Picking a dish then follows `begin()`'s rule (§3.3): the empty pot of the picked recipe resumes, an
  empty pot of another recipe moves to `potOld` unchanged, an old-tune pot moves to `potOld` as today.
- **Tray** (`<dialog id="dish-pick" class="dish-pick" aria-label="요리 고르기">` next to `#cook-overlay` in `index.html`): three
  paper chips in a row, **zero visible text** (no `title` either), `aria-label` '해초전' / '주먹밥' / '과일 꼬치' in that order.
  Each chip 64×64 CSS (≥ 44 hit), the kitchen's paper style (fill `#e7d5b3`, 2-px `#602c2c` border, inset light/shade, 2-px
  press translate, no scale), 16 px gap; the tray sits centred at the bottom of the scene, its bottom edge at `max(16, safe-bottom + 16)` px,
  all edges on whole device px; transparent backdrop; a tap on the backdrop, Esc or back closes it (no kitchen); focus goes to
  the first chip when opened by key and back to `#btn-cook` on close.
- **Pictures**: 16×16 pixel icons `assets/icons/dish/{jeon,jumeokbap,kkochi}.png` (manifest keys `icon.dish.*`), drawn by a
  deterministic tool `tools/make-dish-icons.js` from fixed grids (Apollo + FOOD): a golden round 전 with a dark fleck and a
  '+' cut; a white rice cake with a dark nori band; a skewer with three red cubes, a green grape and an orange tip. Shown at
  `n = floor(3·dpr)` dev px per icon px (48 CSS at DPR 2 and 3, 42.7 at 2.625), `image-rendering: pixelated`, whole dev px.
- Picking a chip closes the tray and calls `openCook(opener, kbd, recipe)`: a first open builds the iframe with
  `cook.html?embed=1&recipe=<id>…`; later opens post `{ ppolCook: 'open', kbd, recipe }`. `cook.html` passes `recipe` to
  `COOK.open` on **every** open (today only the first).
- Standalone `cook.html` (no game) keeps `?recipe=`; without it 해초전.
- `tools/cook-shots.js`'s embed capture (`setEmbed`, a fresh kitchen key) taps the counter and waits for `#cook-overlay`; with
  the tray it would wait forever. K2 adds the tray step there (pick 해초전) — that block only; the rest of the file is K1's.

### 3.6 The result message (K2 → M)
On the reveal the kitchen already calls `L.onResult(res)` once per dish (`finish()`, idempotent by run id). In the embed,
`cook.html` sets `opts.onResult` and posts to the parent (same origin rules as `tell`):
```
{ ppolCook: 'result', v: 1, id: 'ck_…', recipe: 'jeon'|'jumeokbap'|'kkochi', seed: <uint32>,
  look: { v: 1, dents?, band?, cuts?, offs?, plate }, day: 'YYYY-MM-DD' }
```
`js/app.js` `cookMsg` (K2) adds one case: `else if (d.ppolCook === 'result') { if (typeof mealDish === 'function') mealDish(d); }`.
`mealDish(d)` is M's function (it validates with `MEAL.normDish`, sets `S.user.table`, saves). Nothing else in the game reads
the kitchen key except K2's read-only `cookPot()`. If the page dies between the reveal and the message, the dish stays in
the kitchen book only (documented; not a lost save).

### 3.7 Stickers, sound, haptics per dish
- `js/cook-stickers.js` `RECIPES` gains `jumeokbap` (`tap i8 → clap force`, `flip → ['cheer','thumbs']`, `done →
  ['heart_plate','star']`) and `kkochi` (`cut i1 → thumbs`, `tap i8 → clap force`, `done → ['heart_plate','star']`). Never a
  feeling face (`FEELINGS`); ≥ 5 stickers reachable per dish (test).
- Haptic counts per whole dish: 해초전 `{tap 10, flip 1, cut 2}` (unchanged), 주먹밥 `{tap 10, flip 1, cut 0}`, 과일 꼬치
  `{tap 9, flip 0, cut 2}`.
- Sounds: `pick`, `tap`/`place`, `sizzle`, `ding` (K1), `flip`, `cut`, `step`, `done` — existing acts only.

## 4. Dining (lane D = scene, lane M = app)

### 4.1 The booth — rules from the real characters; D sizes and places it (play-room group coordinates, metres; floor y 0; camera from +x+z)

**The characters, measured from `js/scene3d.js` at `ada2967`:**
| who | envelope |
|---|---|
| octopus (`OCT_R` 0.42, `HEAD_Y` 0.92, `HEAD_SQ` 0.88) | head = ellipsoid centred 0.386 m above the `octG` origin, semi-axes 0.42 (x, z) × 0.37 (y): **0.84 m wide**; half-width 0.375 m at 0.22 m above the origin (a 0.62 tabletop over a 0.40 seat), 0.174 m at 0.05 m above it; 8 legs reach ≈ 0.60–0.62 m from the body axis at rest (`ARM_ROOT` 0.60 r + 0.82 r), 0–0.13 m above the origin; contact decal (`octDecal`) a 1.34 m square at the origin |
| me (`PL_H` 1.22) | head sphere r 0.35 (`PL_HEAD_R`) centred 0.87 above the origin; hair shell r 0.38 at (0, 0.90, −0.03) (hat ≤ 1.38 high); torso y 0.24–0.56; 0.66 wide with the arms; hips 0.24 above the origin (seated origin = seat top − 0.24); seated legs swing forward (−1.35 rad) |

**Why the first draft's numbers are withdrawn** (so nobody re-uses them): seated at (−1.05, 0.40, −2.15) the octopus's head
spans x −1.47..−0.63 and y 0.42..1.16 — the whole west backrest (x −1.38..−1.23, up to y 0.80) sat inside it; around y 0.6
the head reached x ≈ −0.69, ≈ 0.11 m into the tabletop (from x −0.80, top 0.62); it touched the arcade's side panel (x
−1.49..−1.45, z −2.74..−2.20); and each "sofa" was one 0.50 × 0.70 m seat (0.35 m cushion) against the attic two-seater's
0.80 × 1.36 m (0.56 m cushions). The slot between the arcade box (x −1.44) and the counter box (x 0.62) is only 2.06 m.

**Rules** (D checks every one in T8 with the real meshes at the seated pose, the eat lean and the bite reach; tolerance
0.01 m):
1. **Two two-seater sofas** (owner '2인 소파') facing each other across one table, in the attic sofa's size class (≈ 1.1–1.4 m
   long, seat top ≈ 0.40–0.46). Each character sits on its own sofa; D picks the exact spot under rules 2–4 (the octopus's
   head is wider than one cushion, so it may need the middle); the room beside each stays empty.
2. **Nothing overlaps.** The octopus's head ellipsoid and legs, and my head (hair shell), torso, arms and legs, intersect none
   of: each sofa's seat, back and arms; the tabletop and its legs; the arcade, the counter, the L-leg, the walls, the door
   swing, the lamps. Legs may rest on a seat top or hang over its front edge: the seated octopus folds or hangs its legs (a
   pose, §4.5), and its contact decal never sticks out past the seat or into the air (hide or fit it while seated).
3. **The octopus's head clears the tabletop**: ≥ 0.03 m between the head and the tabletop edge at the tabletop's height, also
   leaned 8° (the lean pushes the head's front to 0.438 m from the seated origin at that height). Rule of thumb for a 0.40 seat
   and a 0.62 tabletop: octopus backrest face → seated origin ≥ 0.45 m, origin → table edge ≥ 0.47 m; me: backrest face →
   origin ≥ 0.31 m (hair), origin → table edge ≥ 0.20 m (torso, measure it). With a 0.45 m table and 0.12 m backs that is ≈
   2.1 m along the facing axis. A lower tabletop shrinks the octopus's side fast (the head is 0.75 m wide at 0.22 m above the
   seat but 0.35 m at 0.05 m) — D may trade heights as long as every rule holds.
4. **Both faces read** (R7): the octopus's seat faces the default camera side; mine is opposite.
5. **T7 corridors stay free** — the booth box + `PL_RAD` 0.25 touches none of: the door lane z −0.33 from x −1.0 to −2.45; the
   counter lane x 0.95 from z −0.3 to −1.90; the arcade lane x −1.8 from z −0.3 to −1.95; the L-leg lane z −1.0 from x 1.0
   to 1.92; the rest spot (0.15, 0.45) and the 30-step walk from it to ≈ (0.93, −0.33). Prefer a place that keeps every
   corridor, so T7's numbers do not change. Only if none does may D block one corridor, and then only by moving that push's
   start so it still proves the same obstacle stops the player (never a weaker check), flagged at the top of the report.
6. **Paths**: my walk to my aisle point and the octopus's walk from the play door anchor (−2.45, −0.33) to its aisle point
   clear every box with the walker's real width (the octopus's head is 0.84 m wide, legs wider unless folded), and each hop
   from an aisle point to a seat crosses nothing but that seat.
7. **Next to the counter** (owner '조리대 옆'): the booth's nearest edge within ≈ 0.3 m of the counter box (touching is fine).
   Its keep box goes into `cutSplit` `keep` so turning never cuts it.

**Where it may fit** (D measures and picks with day and night shots; none of these is pre-approved): (A) the back-wall slot
between the arcade and the counter, sofas facing along x as first drawn — 2.06 m wide, enough only with thin backs, a
narrow table or a lower tabletop; (B) the same slot pulled off the back wall so the octopus's sofa clears the arcade's front
(z > −2.20) — then the booth may span x ≈ −1.53..0.68 (≈ 2.2 m) between the arcade and counter lanes; (C) sofas facing
along z against the back wall — the back sofa (the octopus, facing the camera) is then reachable only from its ends, so the
gaps arcade ↔ booth and booth ↔ counter must each pass the octopus (rule 6). The free floor in front of the counter and the
L-leg sits on the counter and L-leg lanes (rule 5).

**What D records and returns**: the chosen boxes (table, each sofa's seat / back / arms, the obstacle box, the keep box),
each seat point (with yaw) and aisle point — in the report and in `tableInfo().geom` (§10.3). No other lane uses booth
coordinates: M places its buttons from `on.tableSpot` and the `'table'` hotspot only. D's **first commit** is the layout:
360×740@2 and 412×915@2.625 shots, day and night, default view and turned 180°, in `wip/round6/shots/D/`, plus the numbers
in `wip/round6/notes/D.md`, so the lead can look before anything else depends on it.

- **Look**: the attic's own vocabulary — chunky boxes, a 1-px lighter top on cushions (like the attic sofa's `OL` strip),
  `PAL` ramps only, lambert vertex colours, **merged into the static room mesh** (0 extra draw calls). Cushions from one ramp
  that is not the attic sofa's orange (moss or sky; D picks by day/night screenshots so the booth reads apart from the floor,
  the wall and the counter), frames `W[2]`, table top `W[3]` with a `W[2]` edge, legs `W[1]`, a small `PAL.paper` mat under
  the dish spot. No tablecloth pattern, no gingham, no pink-and-sky palette (§15).
- **Scene description, spots**: hotspot key `'table'` (booth box) → `#btn-table`; the play `pick` list becomes
  `['playAttic', 'machine', 'counter', 'table']`.

### 4.2 The dish on the table (3D)
- One merged mesh (`lambert`, vertex colours; +2 draw calls) rebuilt on each bite; position: the table centre on the
  tabletop (D's numbers, §4.1). Plate: cylinder r 0.17 × 0.02 with a lighter inner disc (it must fit the table D chose);
  colour by `look.plate` (0 `PAL.paper`, 1 `PAL.sky`, 2 `PAL.rose`).
- Four "pieces" per dish (bites):
  - 해초전: four quarter slabs (0.10 × 0.025 × 0.07) at (±0.06, ±0.045) with a 1-art-px '+' gap at 1× zoom; colour by band
    (soft/golden/crisp from `PAL.amber`), one dark `PAL.moss` fleck each.
  - 주먹밥: one crusted rice cake (cylinder r 0.10 × 0.06, `PAL.paper` side, crust top by band, a dark nori band); each bite
    shrinks it (r ×0.8, ×0.6, ×0.4, gone).
  - 과일 꼬치: a skewer (0.30 × 0.012) with grape · watermelon · watermelon · watermelon · tangerine cubes (0.05); bites take
    the fruit nearest the eater; the bare stick stays on the plate after the fourth.
  - Unknown recipe (a later build's dish): a plain covered plate (the data stays).
- **Appear beat** (`o.appear`): 6 frames at 12 fps — the plate drops 2 px onto the table (2 frames), a 1-frame squash, two
  1-px steam points rising for 3 frames, then 2 steam points rise every 1.5 s while the dish waits (still under reduced
  motion: no steam). The empty plate stays until I stand up or leave the room.

### 4.3 Flow and timings (M drives, D stages; all beats on the scene clock, `?slow=4` slows them)
| step | what the player sees | time |
|---|---|---|
| dish arrives | kitchen closes → the dish appears on the table (appear beat) | 0.5 s |
| sit | tap the table (or the seat dot) → my character walks (1.8 m/s) to my aisle point, hops onto my seat (0.34 s hop, existing), faces the table | ≈ 1–2 s |
| choose | seated with a dish: the dish steams; the **call chip** shows above the octopus's seat if the octopus can come (`MEAL.canCall` and the scene's `octCanCome()`); tapping the table now = eat | — |
| eat alone | tap the table → 0.25 s → 4 bites (each 8 frames: reach 2, bite 1 (one piece gone + 2–3 crumb pixels), chew 3 (1-px body bob ×2), settle 2) → aura bloom | ≈ 3.4 s |
| call | tap the chip → chip hides → `syncFromStore()` → `canCall` + `octCanCome()` (either says no → nothing saved, the chip stays hidden) → **answer saved** → `octToTable()` in the same handler → the play-room door opens (4 frames) → the octopus walks in from the door anchor (−2.45, −0.33) to its aisle point (1.2 m/s, 0.12 s antic) → door closes → hop onto its seat (0.3 s) facing the table. Already seated (a second dish, see 'after') → no walk-in, straight to think | ≈ 2.2 s |
| think | still 1.0 s, eyes on the dish, think bubble '…' (1.2 s, silent — R17) | 1.0 s |
| answer | ponder squash 0.12 s (the same for both answers) → **eat**: lean 8° toward the table over 3 frames and hold; **watch**: settle upright, eyes follow my bites. Toast with who decided (the '식탁' rows follow when the meal is saved, §6) | 0.4 s |
| meal | **meal saved** → 4 bites: eat = me, octopus, me, octopus; watch = me ×4 | ≈ 2.7 s |
| effects | aura bloom on me (+ the octopus if it ate): 6 frames, dots burst out from the body centre to their places | 0.5 s |
| after | the octopus stays seated (idle breathing) while I sit. If I cook another dish from the seat, it lands on the table (appear beat) and the call chip shows above the seated octopus: tapping it asks about the new dish — think → answer → meal as above, no walk-in. When I stand up (stick) it hops down, walks to the door, leaves (door 4 frames, dither fade at the doorway), and is back at its attic anchor; leaving the room first unmounts it at once | — |

- **Reduced motion**: walks and hops are instant (the octopus appears seated right after one open-door frame), think 1.0 s
  still, answer instant, bites = 4 steps 0.25 s apart without motion, aura appears still.
- **Abort rules**: before the meal is saved (approach, think, answer) → standing up, leaving the room, a walk invitation, a
  hidden tab or a lost context cancels: the octopus leaves (instantly if the room changes), the dish stays, the saved answer
  stands for that dish. After the meal is saved → the same events jump to the end state (pieces gone, auras on).
- **Blocking**: while staging runs (`mealBusy()`: from the call press to the last bite), the table button and the call chip
  are hidden, and the counter and the arcade do nothing — `openCook` (K2) and `openMachine` (M) return false while
  `typeof mealBusy === 'function' && mealBusy()` (the scene owns `#btn-cook` / `#btn-machine`'s `hidden` every frame, so
  hiding them is not an option). No kitchen or runner opens over the walk-in, think or answer beats, no toast pops over the
  kitchen, and the runner never bakes a leaning octopus. The stick still works (stand = abort/end as above). A kitchen result
  arriving during staging (another tab) waits (D queues the new dish until the meal ends).
- **Kitchen or runner from the seat after the meal**: allowed; the octopus stays seated under the overlay (its table poses
  never leak into portraits or the runner's bake, §4.5); a new dish then follows the 'after' row.
- **Many dishes**: one dish waits at a time (`S.user.table`); a new finished dish replaces a waiting one (the old one stays in
  the kitchen book).

### 4.4 The call and the octopus's decision
- **Who can be called** (`MEAL.canCall`): a dish waits, I sit at the table, and the octopus is home and awake, not in a
  ceremony, the salon staging or another meal (sitting at the table after a meal counts as home — R19). The scene then
  confirms with `octCanCome()` before anything is saved. Asleep (night sleep or the post-walk nap) → not callable: a call never wakes
  it (the salon's rule). The post-walk **awake window counts as awake**: a call is an invitation like the main button, not
  the loft's autonomous following (W3 b), and the rest timer only runs while the attic is visible, so a meal in the play room
  pauses it and the nap comes after, as today. Otherwise the chip is simply not shown (no nag, no words). This keeps the
  owner's loop working: cook while the octopus is out, then call it to the table when it is back.
- **Demo rule** (`MEAL.demoAnswer({ dish, name, born, asksBefore })`): `asksBefore === 0` → `{ action: 'eat', rule: 'first' }`;
  else `seed = hashSeed('meal', dish, name, String(born || 0))`, `rng(seed)() < 0.6 ? 'eat' : 'watch'`, `rule: 'seed'`.
  Inputs are only those four (never recipe, effect, colour, time, earlier answers or petting). `by: 'demo-rules'`.
- **One answer per dish**: `MEAL.makeAsk` returns the stored answer if this dish already has one (no new row, no re-roll).
- **Who decided, on screen**: at the answer beat a toast `[line, ' ', <span class="lby">데모 규칙</span>]` (same tail style as
  the salon rows); when the meal is saved, a day-log row (label '식탁') with the same tail, then the meal row after the bites
  (§6: rows come only from eaten entries the octopus sat at). The always-visible '데모' tag in the status line stays. The
  octopus's face stays `idle`; no sound (the think bubble is silent); no feeling word.
- **Model path (contract only, in `docs/MEAL.md`; no code this round — R11; built later together with the salon's)**: when a
  model room is attached, the game would send
  `{ v: 1, point: 'table', id: <meal id>, offer: { kind: 'dish', name: '해초전', steps: ['톡톡','뒤집기','썰기'],
  fx: '반짝이', by: 'user' }, oct: { place: 'play', seat: true }, menu: ['eat', 'watch', 'stop'] }` (≤ 400 B), wait up to 8 s
  with the octopus thinking, and read `{ action, line?, expr? }` (`action` required; unknown → fallback). eat → eats (gets the
  effect); watch → sits; stop → goes back to the attic plainly; no answer in 8 s → `by: 'fallback'`, sits, row '대답이 없었어.'
  with no tail. The model's `line` is shown verbatim (bubble ≤ 24 characters + '…', the full text kept in the record), tail
  '모델'. Never re-asked. Server mapping when built: the existing MCP `table` menu `eat · taste → eat`, `save · watch → watch`,
  `stop → stop` (`mcp/core.js` `MENU.table`). When built, a 'stop' answer (the octopus leaves before any meal) draws its
  row at that beat; a fallback sits, so its row comes with the meal like the others. This round no code writes model answers.

### 4.5 The octopus in the play room
- New scene state "at the table" (like the loft's `octUp`): `octG` re-parented to the play group for the meal only; the
  overlay (name tag, bubble) is allowed and `octScreenPos()` returns its head while at the table; it is **not** a tap target
  there (no tap line at the table).
- **The overlay has three gates, one per lane**: (D) the scene's `updateOverlay` room hide is lifted while at the table;
  (M) `bubble()` in `js/app.js` returns early in a room (`if (text && inPlay() && !octWithMe()) return;`) — M adds an
  `octAtTable()` exception; (M) `css/style.css` hides `#oct` in the play view (`#scene[data-view="play"] #oct { visibility:
  hidden }`, and `#oct` holds `#oct-label` and `#oct-bubble`) — M sets a class on `#scene` while the octopus sits (e.g.
  `oct-table`) and appends an override in its own CSS region (`#scene[data-view="play"].oct-table #oct { visibility:
  visible; }` — the 2D octopus inside stays `display: none` in 3D). Smoke EAT checks the think bubble is visible.
- Departure ceremony start, leaving the play room, scene loss → unmount at once (back to the attic anchor) — the same places
  that call `octUnmountLoft` today. `octAtTable()` is exposed.
- **Nothing autonomous moves it while it sits.** In `js/app.js`, M defers these while `octAtTable()` (they run after the
  octopus is home): `scheduleWander` (skip), `scheduleThink` (no thought bubbles at the table — the bubble gate above would
  otherwise let them through), `syncRest` / `armRest` / `restTick` → `lieDown` → `sleepNow` → `restDown` / `octPlace('blanket')`
  (a rest ending in another tab's storage event or on a visibility change waits; it never falls asleep at the table and is
  never placed at an attic anchor while parented to the play group), `selfWake`, and any other `octPlace` / `walkTo` caller
  (window tap, pet, `octInitial`, two-tab adoption). The departure ceremony is the exception: the scene unmounts first.
  Safety net (D): while `octAtTable()`, `jumpTo` / `moveTo` / `walkPoint` toward an attic anchor do not move `octG`; the
  latest such request is held and applied right after the unmount, so a caller M missed can never teleport it inside the
  play group.
- **Poses stay out of portraits**: D applies the seated pose, the eat lean, the bite reach and the folded / hanging legs on
  `bodyG` and the arms' rotation / scale — exactly what `renderPortrait` saves and restores (`bodyG` scale, position.y,
  rotation; each arm's rotation.y / rotation.z / scale.x; the pupils) — or adds the new property to that save list. Then
  `portrait()`, `walkPortrait()` and the runner's bake (R) never capture a table pose, even with the octopus seated under
  the kitchen or the runner overlay.
- `sceneDescText` (play): '{이름}{은/는} 식탁 맞은편에 앉아 있어.' while at the table; otherwise unchanged ('문어는 다락방에
  있어.' / '문어는 산책 나갔어.').

## 5. Effects (auras: D draws, M decides when)
| fx | name | dish | look (1 dot = 1 render px, pixel-centre snapped) | glow |
|---|---|---|---|---|
| `sparkle` | 반짝이 | 해초전 | 3 slots; each cycles 8 steps: core → '+' (core + four 1-px arms) ×2 → core → off ×4; slots staggered by 3 steps; respawn at a seeded spot on a ring r 0.28–0.38 m, height 0.3–1.1 m (octopus 0.2–0.8 m); colours core `#ebede9`, arms `#a4dddb` / `#73bed3` | cores: emissive twin (size 3, layer 1) |
| `star` | 별 | 주먹밥 | 4 small stars ('+' of 5 points) orbiting the head on a ring r 0.32 m (player at y 1.05, octopus at 0.65), 6° per step (one orbit ≈ 5 s), each twinkling full ↔ core every 6 steps; behind-the-head stars hidden by depth; colours `#e8c170`, `#ebede9` | cores |
| `petal` | 꽃잎 | 과일 꼬치 | 6 two-dot petals spawn on a ring r 0.2–0.4 m at y 1.3 (octopus 0.9), fall 1 row per step with ±1 column sway every 3 steps, respawn on reaching the floor; colours `#f2a6c0`, `#df84a5`, `#fbe0ea` (the exterior petal palette) | none |

- **Following**: the aura object (one `THREE.Points`, ≤ 20 vertices, + an optional twin ≤ 4 vertices) is a child of the
  character's current room group; each frame its base = the character's pixel-snapped position, offsets are whole pixel rows
  / columns along the camera axes (`snapC`, `pxUp`, `S.pw`, like the exterior particles). Re-parented when the character's
  group changes. Where each can be: **me** in the attic, the play room, the loft and the yard (I never go outside — `plEnter`
  → `groupOf`); **the octopus** in the attic, at the play-room table, in the loft and in the exterior during the departure and
  return ceremonies (it never follows into the yard). Hidden when the character is hidden or fading
  (`FADE.d < 0.5`), in furniture mode for the player, and in the 2D fallback.
- **Steps** at 12 fps; positions recomputed on a new step or when the snapped base moved. **Reduced motion**: still pose (2
  sparkles at shoulder height left/right; 3 stars above the head 120° apart; 3 petals at three heights), updated only when
  the character moves.
- **Materials**: the aura uses `new PointsMaterial({ vertexColors: true, size: 1, sizeAttenuation: false, depthWrite: false })`
  (the exterior petal variant) and the twin `PointsMaterial({ color, size: 3, sizeAttenuation: false, depthWrite: false })` (the
  firefly twin variant).
- **Programs (prewarm per light set)**: in this three r128 build every program cache key also holds the light counts
  (`numDirLights`, `numPointLights`, `numHemiLights`, … `shadowMapEnabled` — the parameter list in `vendor/three.min.js`), so
  "the same material variant" is a new program under another light set. Today the only `vertexColors` Points program is
  `XP.petal`'s, compiled under the exterior's lights; the attic has only non-`vertexColors` points (`points()`); `prewarm()`
  compiles the attic and the exterior setups only. The first sparkle or petal aura in the attic, play room, loft or yard would
  therefore compile a new program. D prewarms **both** aura variants under **every light set an aura can show in** — the
  attic's (the play room and the loft also have two point lights; D checks the counts really match), the yard's (no point
  light of its own) and the exterior's — e.g. hidden aura objects placed in each group for `prewarm()`'s compile passes, the
  yard's set compiled the same way. **No new program when an aura first shows**: T8 compares the renderer's program cache
  keys (`renderer.info.programs[i].cacheKey`) before and after, not only the count.
- **Budget**: ≤ 3 draw calls per aura (beauty, normal pass, twin), ≤ 6 for both; ≤ 40 vertices updated per step.
- **Lifetime** (M): active effects are derived from `S.user.meals` (§6): me = the fx of the latest entry eaten today with
  me; octopus = the fx of the latest entry eaten today where the octopus ate. Applied on boot, after every save/merge, on the
  60-s tick and on visibility; at the day change both become null (the records stay).
- **Bloom** on the meal: 6 frames — the dots start at the body centre and step out to their places (reduced: appear at once).
- Honesty: the aura is the dish's effect (same picture family as the dish), never a heart, never a face change.

## 6. Save, day change, two tabs (lane M)
```
S.user.table = null | { v: 1, id: 'ck_…', recipe, seed, look, day, at }          // the one waiting dish
S.user.meals = [ { id: 'ml_<hash>', dish: 'ck_…', recipe, date, at,                // oldest first, never deleted
                   ask: null | { at, action: 'eat'|'watch'|'stop'|null, by: 'demo-rules'|'model'|'human'|'fallback',
                                 rule?, seed?, model?, line?, raw? },
                   ate: null | { at, date, me: true, oct: true|false|null, fx: 'sparkle'|'star'|'petal' } } ]
```
- `ate.oct`: `true` = the octopus sat at this meal and ate (it gets the effect), `false` = it sat there and did not eat
  (it chose to watch, or it was still seated from an earlier meal when I ate without asking), `null` = it was not at the
  table (I ate alone). A decision row needs an `ask` too, so eating without asking never draws one.
- Normalised inside `userState()` via `MEAL.normalize(u)`: junk entries dropped only if not objects; unknown `fx` / `recipe`
  values kept (a later build may know them) but never displayed.
- **Writes**: the call press writes the entry's `ask` (`save()` once, only after `canCall` and `octCanCome()` both said yes);
  the meal start writes `ate` and `table = null` (`save()` once). Staging after a write is a replay. `mealDish` writes
  `table` (replacing a waiting dish).
- **Rows come from eaten entries only**: the day log (and the album diary for past days) draws an entry once it has `ate` —
  the decision row first, but only when `ate.oct !== null` (the octopus sat at that meal, so its answer was acted out), then
  the meal row. An answer saved at a press whose visit was then aborted, or refused by a scene race, draws nothing; calling
  again for that dish replays the same answer and the rows come with that meal. (Eating alone after such an abort draws only
  the meal row.)
- **Day**: `todayKey()` (local date, test hook `__ppolTest.today`). Active effects need `ate.date === todayKey()`. The 60-s
  `timeTimer` tick and the visibility path call `mealApply()`.
- **Two tabs**: `adoptRemote` calls `MEAL.merge(S, R, mineMeals, now)` next to `SALON.merge`: union of entries by id (for the
  same id an entry with `ate` beats one without, then one with `ask`); this tab's `table` write survives if it is newer and
  that dish is not eaten in `R`; a `table` whose dish is eaten in either copy becomes null. `mineMeals` keeps this tab's meal
  writes for `MEAL.MINE_MS` (60 s) like `mineAsks`. `syncFromStore()` runs before the call press.
- **Quota slimming**: the save copy drops `seed` / `raw` from entries older than 365 days (never `line`), like `slimAsks`.
- **Export / import / reset**: `S.user` rides along as today (no new top-level key).

## 7. Runner octopus (lane R)
- **Source**: `APP.scene.walkPortrait(ph, { yaw: 30, tilt: 15, hw: 2.82, ty, still?, sq: [sx, sy], bg: 'transparent' })` at
  the attic's 1× density (`hw 2.82` → 27 px/m, the same pixel size as the octopus in the room). New option `sq` (R adds it to
  `walkPortrait` → `renderPortrait`'s `pw`): `bodyG.scale = (sx, sy, sx)` while baking, restored after. The colour is the live
  scene colour (salon colour), the palette the live palette, outline and toon shading the scene's own — the "original".
- **Frames** (each a separate native render, cropped to one shared alpha box per state with the feet on the bottom row):
  | state | bake | approx. size (art px) |
  |---|---|---|
  | run ×4 | walk phases 0, 0.5, 1.0, 1.5 | ≈ 32×23 |
  | jump | still, `sq [0.92, 1.10]` | ≈ 30×25 |
  | land | still, `sq [1.10, 0.88]` | ≈ 35×20 |
  | duck | still, `sq [1.20, 0.62]` | ≈ 38×15 |
  | hit · idle (ready) | still | ≈ 32×23 |
  (R records the measured sizes.) Faces: `idle` in every frame (a lead choice, R13 — not an owner rule).
- **Draw**: `ctx.drawImage(img, dx, dy)` with integer `dx, dy` and **no width/height arguments** (native size). No rotated
  frames (`toCanvas(img, ±7)` goes); the run bob stays an integer 0/−1 px. Feet on the ground line; the head stays over the
  unchanged hitbox (`OCT_X 10, OCT_W 14`); the shadow width follows the sprite's ground width. The canvas scale is unchanged
  (integer `k`: DPR 2 → 7, 2.625 → 9, 3 → 10) → 32×23 art px = 224×161 dev px (112×81 CSS) at DPR 2.
- **Fallback** (no 3D scene / bake fails): `drawnOctopus` drawn natively (state variants drawn by parameters, never resampled).
  `RUNNER.live().sprites` = `'bake'` or `'drawn'`.
- **Cache** per colour + palette; bake once per open (≈ 9 renders). The sim, `VERSION 'runner-2'` and `tools/test-runner.js`
  golden values do not change.

## 8. Loading crawl (lane R)
- **First, measure the real cover** (R, before tuning): the cover (`#boot`) lifts when `js/app.js` adds `html.booted`, two
  frames after the scene's first draw — on a warm desktop load that is ≈ 0.5–1 s, which (not the speed) is why the crawl
  "barely moved" on a computer: today it moves 249 CSS px/s at 1280 and 363 px/s at 1920, and a constant 104 CSS px/s alone
  would make the computer crawl shorter, not longer. R records warm and cold cover lifetimes at 1280×800@1 and 360×740@2
  with nothing held back (`?intro=0`), and puts a real-boot strip (a frame every 100 ms until the cover lifts) in the report.
- **Scale (lead choice, R14)**: `u` CSS px per art px = `U / dpr` with `U` = max(round(2·dpr), floor(min(vw, vh)·dpr / 200))
  whole dev px. Phones keep today's size: 360×740@2 → 2 CSS, 412×915@2.625 → 1.905, 320×568@2 → 2, 360×740@3 → 2; big
  screens grow: 1280×800@1 → 4, 1366×768@1 → 3, 1920×1080@1 → 5, 1440×900@2 → 4.5. The sprite `assets/ui/loading_oct.png`
  (8 cells of 56×39) shows at 56u × 39u (112×78 CSS at 360@2; 224×156 at 1280×800@1).
- **Path**: start with the octopus centred (`x0 = round((vw/2 − 28u)·dpr)/dpr`, `y0 = round((vh/2 − 19.5u)·dpr)/dpr`), crawl
  right until its left edge reaches the right edge (`dx = n·u`, `n = ceil((vw − x0)/u)`), then start again at the centre.
- **Speed**: the octopus's own gait: 1.2 m/s with a 0.6 m stride at the bake density (43.5 px/m) = **52 art px/s**; legs
  **1.0 s per 8-cell cycle** (`steps(8)`, was 0.8 s); the cross animation uses `steps(n)` so every step is exactly one art
  px (= whole dev px). Pass times: 360×740@2 2.27 s · 412×915@2.625 2.63 s · 320×568@2 2.08 s · 1280×800@1 3.6 s ·
  1920×1080@1 4.2 s. The first frame already shows the octopus at the centre.
- **Minimum cover (lead choice, R14)**: `#boot` stays at least 1.0 s after it first shows — on a fast load the octopus still
  crawls ≈ 52 art px (one body length) from the centre (208 CSS px at 1280×800@1). Done in R's head block alone: the inline
  script adds a class (e.g. `boot-min`) after 1.0 s — at once under reduced motion — and the hide rule becomes `html.booted.boot-min
  #boot { display: none; }`; `html.booted` itself still comes from `js/app.js` unchanged (and from the 12 s safety). `#boot`
  keeps `pointer-events: none`. Slow loads are unchanged. R checks every smoke scenario that screenshots right after load.
- **How**: a tiny inline head script (before the `<style>`) sets `--boot-u, --boot-x0, --boot-y0, --boot-dx, --boot-n,
  --boot-dur` on `<html>` and again on `resize`; the CSS uses them with fallbacks. The same script reads the saved motion
  setting like the font line (`'"motion":"reduce"'` in `ppolppol_v2` → `data-motion="reduce"` early).
- **Reduced motion** (device or saved setting): still, centred, cell 0; no minimum cover.
- Unchanged: the static `#boot` markup line, `html.booted` (still added by `js/app.js` two frames after the first draw — R
  does not edit `js/app.js`), the 12 s safety, `html:not(.booted) #oct-svg` rule, `loading_oct.png` (smoke Z regexes).

## 9. Words (visible and screen reader) and honesty
| where | visible | screen reader | lane |
|---|---|---|---|
| kitchen dialog | none | `aria-label` 해초전 / 주먹밥 / 과일 꼬치; plate line e.g. '주먹밥. 노릇노릇 구웠어.', '과일 꼬치. 반듯하게 썰었어.' | K2 |
| bell / ding | none (picture) | none (the band line '노릇노릇' already speaks) | K1 |
| dish tray | none (pictures; no `title`) | dialog '요리 고르기'; buttons '해초전' · '주먹밥' · '과일 꼬치' | K2 |
| table spot `#btn-table` | none (no `title`) | '식탁' · with a waiting dish '식탁, 해초전' · seated with a dish '해초전 먹기' | M |
| seat dot `#btn-seat` | none (yellow dot; no `title`) | '식탁에 앉기' | M |
| call chip `#btn-call` | none (octopus picture; no `title`) | '{이름} 부르기' (e.g. '뚜루 부르기') | M |
| decision toast (answer beat) + row ('식탁', when the meal is saved, only for meals the octopus sat at — §6) | eat: '{이름}도 같이 먹기로 했어.' · watch: '{이름}{은/는} 보기만 하기로 했어.' + tail '데모 규칙' | same | M |
| model path (later; docs only this round) | the model's own line verbatim (+ '모델'); no answer: '대답이 없었어.'; stop: '{이름}{은/는} 다락으로 돌아가기로 했어.' | same | M |
| meal row ('식탁') | alone / watch: '{요리}{을/를} 먹었어. 오늘 하루 {효과}{이/가} 따라다녀.' · together: '{요리}{을/를} 같이 먹었어. 오늘 하루 둘 다 {효과}{이/가} 따라다녀.' | same | M |
| scene description (play) | — | '식탁에 {요리}{이/가} 있어.' · '{이름}{은/는} 식탁 맞은편에 앉아 있어.' · '{효과}{이/가} 따라다녀.' | M |
| settings '누가 고르나' | '…고른 이는 포스터와 쪽지 뒷면, 미용실 · 식탁 줄에 적혀.' (adds '· 식탁'; smoke O pins the old line exactly at `tools/smoke.js` ~2855 — M updates that one line) | same | M |
| runner, loading | no change | no change | R |

- Effect names: 반짝이 · 별 · 꽃잎. Particles after `{이름}`, `{요리}`, `{효과}` follow 받침 (a 4-line helper in `js/meal.js`, the
  same rule as `js/world.js` `nameJosa`).
- Every string is plain Korean, KS X 1001, no digits, no emoji or symbols; `js/meal.js` joins the honesty scan in
  `tools/test-brain.js` ('demo lines say facts'): '-기로 했어' decisions and facts pass; no 좋아/싫/맛있/싶/배불러…
- Run `python3 tools/subset-fonts.py --check` (the toast and row strings are new glyph users).

## 10. Contracts between lanes

### 10.1 K1 ↔ K2 (`js/cook.js`, `js/cook-art.js`, tests)
- `J.cut` becomes `null | { i, f }` (f 0 = the cut frame, 1 = the next). K2's `paintDish` reads `J.cut` and must accept a
  plain number too until K1 is merged (`typeof J.cut === 'object' ? J.cut.i : J.cut`).
- `paintStage`: K1 may edit only the three jeon scene calls; K2 only inserts its single dispatch line directly after
  `if (!run) return;` (§3.3) and writes `paintDish` elsewhere. K1 owns `render`, `onEvent`, `juiceAt`, `fit`, `follow`,
  `frameSig`, `live`; K2 owns `open`, `begin`, `again`, `onStart`, `onReveal`, `startSlide`/`baseOf`/`composeSlide`,
  `burst`, `sound`, `stationNow`.
- **Merge hygiene**: in every shared block (`paintStage`, the `js/cook.js` CONTRACT header comment, the `js/cook-art.js`
  header) leave at least one untouched line between a K1 edit and a K2 edit — git conflicts on adjacent hunks. The lead
  resolves whatever still conflicts at merge.
- `GEO.rest.spatula` and the tool sprites are K1's; K2's stove/board painters call `spatula()`, `knife()`, `arrow()`, `guide()`
  and get the new sizes for free.
- The '+' split pop: K2 passes `pop` to its kkochi slice painter exactly like K1 does for the jeon.
- `COOK_ART` API: K1 adds `bell` inside the API literal; K2 touches only one line before `return API;` if it must.
- Audio: K1 owns `js/audio.js` (`ckDing`, the `onCook` ding line, `COOK_NEXT` incl. the `cut` entry K2 needs); K2 maps
  `tap → place` for 과일 꼬치 after the 120 ms gate in its `sound()` and does not touch `SND_FREE`.
- Tests: K1 edits `tools/test-cook.js` §2 (the "same drag at 60/120/240 Hz keeps its tags" check), §6, §11, §12 (the
  "different hands leave different dishes" bound), §12b (the "cut order = `GEO.cross`" pin) and the named art pins, and
  appends its own section at the end; K2 edits only the header pins (recipe count/steps), test 14's file list and `VOCAB`,
  and puts every new check in new files. `tools/cook-shots.js` is K1's except the embed capture block (`setEmbed`), where K2
  adds the tray step.

### 10.2 K2 ↔ M (game side)
- The result message (§3.6) — exact fields. Recipe ids `'jeon' | 'jumeokbap' | 'kkochi'`.
- `mealDish(d)` is defined by M inside `js/app.js`; K2 calls it only through `typeof mealDish === 'function'`.
- M listens to `#cook-overlay`'s `close` event in its own init (to play the appear beat); K2's `openCook` close listener is
  untouched.
- `mealBusy()` is M's global function in `js/app.js`: true from the call press until the last bite (staging). K2's `openCook`
  starts with `if (typeof mealBusy === 'function' && mealBusy()) return false;`; M puts the same line at the top of
  `openMachine` (R19).
- `cookPot()` and its `COOK_TUNES` table are K2's (§3.5); M never reads the kitchen key.

### 10.3 D ↔ M (scene API, all on the 3D scene object; the 2D scene has none of them → M feature-detects)
| call | returns | behaviour |
|---|---|---|
| `setTableDish(dish, { appear })` | bool | `dish` = null or `{ id, recipe, look, seed }`; shows / clears the 3D dish (remembered if the play room is not built yet; queued while a meal is staging) |
| `tableInfo()` | `{ built, dish, pieces, me: 'none'|'walking'|'seated', oct: 'none'|'coming'|'seated'|'leaving', aura: { me, oct }, geom }` with `geom = { table, sofas, obstacle, keep, seats: { me: [x, y, z, yawDeg], oct: [x, y, z, yawDeg] }, aisles: { me: [x, z], oct: [x, z] } }` (D's chosen layout, §4.1) | read-only, tests |
| `playerSitTable()` | Promise<bool> | walk to my aisle point, hop, face the table; false if not in the play room / blocked |
| `playerStandTable()` | Promise | hop down to my aisle point (also what a stick push does) |
| `octCanCome()` | bool | exactly the synchronous check `octToTable` makes at its start (not away / asleep / in a ceremony / salon staging; the play room shown; not leaving). True while it already sits at the table |
| `octToTable({ instant })` | Promise<bool> | already seated → resolves true at once (no walk-in); else mount at the play door, walk in, hop onto its seat; false if the octopus cannot come (`octCanCome()` false) |
| `octTableBeat(name)` | Promise | `'think'` 1.0 s still, eyes on the dish · `'ponder'` 0.12 s squash · `'eat'` lean 8° and hold · `'watch'` settle upright |
| `mealBite(who)` | Promise<bool> | `who` `'me'|'oct'`: one bite (8 frames; reduced 0.25 s), removes one piece; false if none left |
| `octLeaveTable({ instant })` | Promise | hop down, walk out the play door, unmount to the attic anchor; `instant` = unmount now |
| `octAtTable()` | bool | while true, attic-anchor moves (`jumpTo` / `moveTo` / `walkPoint`) are held and applied after the unmount (§4.5) |
| `setAura(who, fx, { bloom })` | — | `who` `'me'|'oct'`, `fx` `'sparkle'|'star'|'petal'|null` |
| event `on.tableSpot({ seat, call, dish })` | — | each `{ x, y }` in scene CSS px or null, emitted on change: `seat` above my seat when I am in the play room, not seated, the booth on screen; `call` above the octopus's seat at a seated octopus's head height while I sit at the table — **whether or not the octopus is there** (M decides whether the chip shows); `dish` the dish centre while a dish is on the table |
| hotspot `'table'` | — | the booth box → `#btn-table` through `hotspots({ … table })` |

M never uses booth coordinates: buttons come from `on.tableSpot` and the `'table'` hotspot, tests read `tableInfo().geom`.

### 10.4 R ↔ D
- R adds the `sq` option to `walkPortrait` (and passes it through `renderPortrait`'s `pw`); nobody else edits `walkPortrait`.
- D's table poses use only what `renderPortrait` saves and restores (or D adds the property to that save list), so R's bake
  never captures a seated, leaning or reaching octopus (§4.5).

## 11. Tests
Never weaken a check; a removed check is replaced by one that guards the same intent where it now lives.
- **K1**: `tools/test-cook.js` — §6 rewritten (a slanted drag, a jittery drag and a slash all cut exactly, `ang 0`, tag
  `'straight'`; line 0 vertical through (144, 172) logical, line 1 horizontal; offsets 0 for every seed); §11 envelope tags
  `[null, 'golden', 'straight']` and the describe text; art: spatula blade 24×12 at rest x 88..111, knife 49×7 (±1), bell
  13×13 Apollo-only with A ≠ B frames, `cutBuf` symmetric (the four quarters' bounding boxes mirror each other; equal gaps),
  REV2 rest `sep 1` and t 5 `sep 2`, no `nudge`; determinism; `TUNE_HASH 2827089308`. Three older checks lose their meaning
  under '+' and are rewritten to guard the new intent (K1's): §2 "the same drag at 60/120/240 Hz keeps its tags" (always
  `'straight'` now) → the same drag gives identical cut events in the same order at every rate; §12 "different hands leave
  different dishes (≥ 25/30)" (its variety came partly from cut angles, offsets and the nudge) → a bound re-measured with only
  dents · band · plate varying, pinned with a margin (record the number); §12b "cut order: line 0 horizontal = `GEO.cross`"
  (the sim now cuts vertical first) → a look → `GEO.cross` index check (look index 0 = horizontal however the sim orders
  its lines). `tools/test-cook-live.js` — new N11: the bell appears on the frame of the band-1 event, swings f1–f7,
  rests, hides at band 2 or the flip; reduced: still; one `AUDIO.on('cook', {act:'ding'})` per flip step; no `vibrate` call at that moment; N6 counts unchanged; L6 knife follow with
  the new size. `tools/test-cook-stickers-live.js` K2/K3 — the new `n` rule at all sizes, hidden list unchanged.
  `tools/test-cook-audio.js` A — the ding plays once after the sizzle_1 crossfade starts; C — sound off: no context, no request,
  no ding; a new case — `foley/manifest.json` fails to load: the ding still plays (no file needed); `COOK_NEXT.cut` prefetches
  `place` / `step` / `done`.
- **K2**: `tools/test-cook.js` header pins (three recipes, their steps), test 14 (`js/cook-dishes.js` scanned, `VOCAB` plus
  '주먹밥', '과일 꼬치'); new `tools/test-cook-dishes.js` (node): full runs per recipe (touch and chip paths), looks valid,
  describe lines, envelopes, book lines, `tuneOf` pins for the two new recipes (deliberate numbers), a golden `ada2967` 해초전
  pot resumes, a pot with another recipe's tune is refused, per-recipe art determinism, Apollo/FOOD rules, carry continuity,
  reveal bounds, `drawDish` never throws; new `tools/test-cook-dishes-live.js`: open per recipe (`opts.recipe`, `?recipe=`),
  stations and slides (no slide between kkochi's board steps), zero visible text, haptic counts per recipe, again repeats
  the recipe, reload resumes, `begin()`'s pot rules (an `si ≥ 1` pot wins over a requested recipe; an empty pot of another
  recipe goes to `potOld` byte-identical), the embed posts exactly one `result` message with the exact fields; `tools/test-cook-stickers.js`
  per-dish scripts; smoke **Z** kitchen part (tray: three chips, names, zero text, no `title`, ≥ 44 px; pick 주먹밥 → the
  frame's `COOK.live().recipe === 'jumeokbap'`; result message recorded; the tray rule: a fresh `si 0` pot → the tray; an
  `si ≥ 1` pot → straight in, no tray; an old-tune pot → the tray, and picking moves it to `potOld` byte-identical; picking
  another recipe with an empty pot → that pot in `potOld` byte-identical; `COOK_TUNES` equals the frame's `COOK.tuneOf(id)`
  for all three; the counter does nothing while `mealBusy()` returns true (a stub)); `tools/cook-shots.js` embed capture runs
  through the tray.
- **D**: `tools/test-scene-perf.js` — T5 unchanged (booth merged, ≤ 60 calls, programs unchanged); T7 unchanged lanes and
  numbers (§4.1 rule 5) + new pushes into the booth from each aisle stop at the booth's expanded edge (± one step); new
  **T8**: the §4.1 rules on the real meshes — at the seated pose, the eat lean and the bite reach, the octopus's head
  ellipsoid (from `OCT_R` / `HEAD_Y` / `HEAD_SQ`) and each leg's world box, and my head / hair sphere and body boxes, intersect
  no booth or room box (0.01 m), the head clears the tabletop edge by ≥ 0.03 m, the decal does not stick out past the seat;
  sit/stand; `setTableDish` per recipe; octopus mount → walk (no box penetration) → seated at `tableInfo().geom.seats.oct`
  facing the table → leave → back at its attic anchor; a second dish while seated: `octToTable` resolves at once (no
  walk-in); bites 4 → 0; an attic-anchor `jumpTo` during the meal is held and lands after the unmount (never inside the play
  group); ceremony start while seated unmounts; auras for each fx on **me in the attic, play room, loft and yard** and on
  **the octopus in the attic, at the play-room table, in the loft and in the exterior during the departure and return
  ceremonies** (dots inside the character's screen box + margin, on pixel centres, 12 fps steps, still under reduced
  motion); the program **cache keys** unchanged (not only the count) at the first aura in each place; meal draw calls
  ≤ base + octopus + 12 and ≤ 150; the booth survives every 360° cut; `walkPortrait` / `portrait` renders taken while the octopus
  sits leaning equal the ones taken at its attic anchor; reduced motion.
- **M**: new `tools/test-meal.js` (node): `normDish`, `demoAnswer` (first → eat; 55–65 % eat over 1000 dish ids; independent
  of recipe; deterministic), one answer per dish, `canCall`, active effects (replace, day change; `ate.oct` true / false /
  null), `merge` (two-tab cases), rows and toasts (exact strings, particles for names with and without 받침; no rows for an
  entry without `ate`; no decision row when `ate.oct === null`), slimming keeps lines (no `request` / `readReply` — R11);
  `tools/test-brain.js` honesty scan includes `js/meal.js`; smoke **O**'s exact `WHO_LINE` pin (`tools/smoke.js` ~2855)
  updated to the new line; new smoke **EAT** (seeded dish → play room → sit → chip → call → the think bubble visible above
  the seated octopus and silent → answer toast with '데모 규칙' → meal → rows → auras → the counter and the arcade do nothing
  while staging → a second dish cooked from the seat: the chip above the seated octopus asks without a walk-in → reload keeps
  the auras → next day clears them → eat alone (meal row only) → `octCanCome()` false (asleep): no chip, nothing saved →
  another tab finishes a rest during a meal, then this tab is hidden and shown: the octopus stays seated (or follows the
  abort rules), never lands on an attic anchor inside the play room, and naps only once home → two tabs → reduced motion →
  `?scene=2d` no errors).
- **R**: smoke **R** (`sprites === 'bake'`, every octopus draw native size and integer position, sprite alpha 0/255, sizes per
  state ±2 px, the baked body colour follows a salon colour, the integer canvas scale check unchanged); smoke **Z** boot part
  (static markup regexes kept; at 360×740@2, 412×915@2.625 and 1280×800@1 with the app held back: starts centred ±1 dev px,
  `getComputedStyle` size = 56u × 39u with `u` from §8 (4 CSS at 1280×800@1), moves right ≈ 52 art px/s ±10 %, every position
  and size on whole dev px; reduced motion still; and with nothing held back: the cover lasts ≥ 1.0 s after it first shows,
  then hides once `html.booted` is set). The real warm / cold cover lifetimes (§8) go in the report.
- **All**: `npm test`; `python3 tools/subset-fonts.py --check` when Korean text changed.

## 12. Docs
- K1 (`docs/COOK_PROTO.md` at `ada2967`: §3 판정 요약, §5 화면 · 배치, §8 소리, §12 시험): §3 (the '+' slice rule: exact
  cuts, vertical then horizontal), §5 (tool sizes, the bell, the stickers rule), §8 (the ding, `COOK_NEXT`), §12 (N11 and the
  rewritten checks); `docs/COOK_STICKERS.md` (size).
- K2: `docs/COOK_PROTO.md` §2 (recipes, `TUNE_R`, `tuneOf`), §6 (pots per recipe; the empty-pot and picked-recipe rules of
  §3.3 / §3.5), §7 (the API row: `recipe` now picks the dish — it still says "`recipe` 는 받아도 바뀌는 것이 없다" — and
  `onResult`), §9 (the message table: the tray, `recipe` in `open`, the `result` message), §12 (the new test files);
  `docs/COOK_STICKERS.md` (scripts).
- D: `docs/SCENE.md` (play-room booth, table dish, the octopus at the table, auras, the API of §10.3).
- M: new `docs/MEAL.md` (flow, decision rule, the model contract — the only place it lives this round, R11 — data, honesty,
  words); `docs/CORE_LOOP_V2.md` (the table decision is now the meal call → link); `docs/DESIGN.md` if it quotes the '누가
  고르나' line.
- R: `docs/MINIGAME.md` ('문어 스프라이트') and the loading notes in `index.html`'s head comment.
- Lead (after merges): `README.md`, `HANDOFF.md`, `docs/OWNER_DECISIONS.md` ('한 것' notes, with the lead choices marked as
  lead choices: the loading size and minimum cover (R14), the runner's idle faces (R13), two-seater sofas read from '2인 소파'
  (R6)), `wip/round6/README.md` log, `docs/shots/cook/` captures via `tools/cook-shots.js`.

## 13. Shots (PNG, read before reporting; ≤ 8 per lane in `wip/round6/shots/<KEY>/`)
- K1: 360×740@2 — flip golden bell f0 and rest; spatula at rest and following; knife at rest and mid-cut; after cut 1 (pop
  frame and settled); after cut 2 ('+'); plate t ≥ 6. 412×915@2.625 stickers + bell; 320×568@2 tools, no stickers.
- K2: tray at 360×740@2, 412×915@2.625, 320×568@2; 주먹밥 tap / golden crust / plate; 과일 꼬치 cut / skewer / plate.
- D: **first, before the rest of the lane** (the layout commit, §4.1): the play room with the booth, default view and 180°,
  day and night, at 360×740@2 and 412×915@2.625 (these may count as two composite strips). Then each dish on the table at 2×
  zoom; me seated; the octopus seated (no overlap visible); a bite frame; each aura (on me in the attic and the yard, on the
  octopus in the attic).
- M: the call chip; the answer toast with its tail; the day log rows; after the meal (auras); the next day (none).
- R: runner ready / run / jump / duck / hit at 360×740@2 and 412×915@2.625; boot at t 0 / 0.5 / 1.0 s on 360×740@2 and
  1280×800@1; the real-boot strip (nothing held back) at 1280×800@1 and 360×740@2.

## 14. Verification checklist (lead, after the merges)
1. `npm test`, the slow suites (`tools/test-cook-live.js`, `tools/test-cook-dishes-live.js`, `tools/test-cook-stickers-live.js`,
   `tools/test-cook-audio.js`, `tools/test-scene-perf.js`, `node tools/smoke.js`), `python3 tools/subset-fonts.py --check`
   (`stale: none`).
2. Eyes on every lane shot: zero characters in the kitchen and on the tray / table / chip; crisp pixels at 2.625; the booth
   reads as furniture day and night and nothing pokes through it (D's layout shots are looked at as soon as D commits them,
   before the merges); the octopus's face is idle in every code-written moment; no aura hearts.
3. One independent check (several lenses: kitchen, dishes, dining + honesty, effects + saves, runner + loading), each finding
   with evidence, one round of fixes.
4. CI green → production (the lead records the deployment in `wip/round6/README.md`).
5. Owner phone pass: the first counter tap after the deploy shows the tray of three dishes (unless a half-made dish with a
   finished step waits — then the kitchen resumes it and the tray comes once it is plated); sound on → the ding at golden;
   sound off → the bell only; Android vibration unchanged (no buzz at the ding); call the octopus a few times (it sometimes
   eats); effects gone the next morning; on a computer the loading octopus visibly crawls right from the centre.

## 15. Benchmark: what was borrowed and what was not
| principle | our form | not taken |
|---|---|---|
| a timer bell tells "now" | a pixel desk bell on our stove + an optional synthesized ding | no timer dial, no countdown, no "Perfect", no grade |
| the cut is the reward | exact '+' with a 1-frame pop and a settle | no slow-motion, no stars, no score |
| sit at a table and eat together | our booth in our play room; the octopus decides | no restaurant layout, no tablecloth, no mascot cheering, no plate rating |
| the dish changes your day a little | a gentle aura for the rest of the day | no stat boosts, no timers, no streaks |

## 16. Out of scope (later)
The model path's code and network part (`request` / `readReply`, with the salon's); dining sounds; a book of past dishes; more dishes or steps (stir, place);
eating in the 2D fallback; tapping the octopus at the table; the runner's text buttons; moving the booth in furniture mode.
