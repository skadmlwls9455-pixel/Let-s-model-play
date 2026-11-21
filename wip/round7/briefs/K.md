# Lane K — the kitchen game (`lane/7-k`)

Read `COMMON.md` first, then `ANSWERS.md`, `SPRITES.md`, the owner's words (`wip/round7/README.md` A1 to A6, E1, E4), the
kitchen code map `wip/round7/research/07-codebase-map.md` (read all of it: it tells you every place a new step kind touches),
the rules `wip/round7/research/08-binding-rules.md`, and skim `01-genre-mechanics.md`, `02-open-source-games.md`,
`04-intuitive-ux.md`, `06-dishes-and-real-steps.md` in the same folder (those that exist when you start).

## Why

The owner played the kitchen and said it "only mimics the wrapper of a cooking game": three trivial gestures, food that is
already batter in a pan, three look-alike discs. This lane makes it a real little game: **a recipe book opens first, the
player picks a dish, cooks it from raw ingredients in five or six small true-to-life steps, and ends by serving it.**

## You own

`cook.html`, `js/cook.js`, `js/cook-art.js`, `js/cook-dishes.js`, `js/cook-stickers.js`, `css/cook.css`,
`css/cook-stickers.css`, `tools/test-cook.js`, `tools/test-cook-live.js`, `tools/test-cook-audio.js`,
`tools/test-cook-stickers.js`, `tools/test-cook-stickers-live.js`, `tools/test-cook-dishes.js`,
`tools/test-cook-dishes-live.js`, `tools/cook-shots.js`, `docs/COOK_PROTO.md`, `docs/COOK_STICKERS.md`, the kitchen sound
acts in `js/audio.js` (the `cook` part only). New files as you need (`js/cook-steps.js` for the new step kinds is a good
idea: keep `js/cook.js` readable). You do **not** edit `js/app.js`, `index.html`, `js/meal.js`, `js/scene3d.js` (lane T
owns the game side) and you do not draw food (lane A; you draw scene backgrounds, tools' motion, hands, particles).

## What to build

### 1. The recipe book (first screen of the frame)

- Opening the kitchen with no half-made pot shows a **book** instead of step 1: a short open animation (cover → open, about
  4 frames at 12 fps; none with reduced motion), then one recipe per page. A half-made pot (a step already finished) still
  resumes straight into cooking, as today.
- A page shows, with pictures only: the finished dish big (`dish.<id>` at the largest whole scale that fits), its
  ingredients (`ing.*`), its steps as a row of pictograms (`step.*`) in order, the day effect's little picture, and a small
  stamp if the notebook says this dish was made before. No words anywhere (names in `aria-label`).
- Moving between recipes: swipe sideways, or touch the bookmark tabs on the page edge (one tab per recipe with its
  `icon.<id>`), or arrow keys. **Touching the dish picture starts that recipe** (first time only: one ghost hand on the
  picture). Locked recipes (`ctx.unlocked` does not list them) show the dish as a dark silhouette with `lock.cup`; touching
  one does nothing but a small shake. Recipes in the book: `jeon2`, `gyeran`, `jumeokbap2`, `kkochi2`, `cake` (contract C2).
  The dialog's `aria-label` on this screen is '요리 수첩' (already in the allowed vocabulary). No digits or letters are painted
  into the book either (no page numbers). Bookmark tabs and sideways swipes must work with the standing rule that touches
  starting within 24 CSS px of the left or right screen edge are ignored: keep the tabs inside that band.
- The book opens on the recipe cooked last (else `jeon`). Close chip (picture) top right as today. Escape / back closes.
- Standalone `cook.html` (no parent): everything unlocked.

### 2. Recipes as data, finer steps, new step kinds

Keep the engine's shape: a DOM-free deterministic simulation (same events → same run at any frame rate, runs in node), the
live half draws and feeds pointer samples. **No fail, no score, no timer**: progress never falls, generous thresholds, the
verb button (and keyboard) can always advance, every dish completes. What the player did may show in the finished picture
(the doneness band, toppings where they were placed), but **every outcome is drawn equally appetising: never a better and a
worse dish**, no stars, no praise words (standing owner rule: all doneness bands are good results, cuts land on the guide).

**Legacy and new** (contract C2, and the code map's sections 2, 5 and 8 explain why): leave the three old recipes
`jeon`, `jumeokbap`, `kkochi` and their numbers, looks, painters and tests **as they are**, hidden from the book. Add the
five new recipes under new ids with their own data. So: `TUNE` and `TUNE_HASH` do not change; new kinds keep their numbers in
their own frozen tables with their own pot hash per recipe (the `tuneOf` pattern); looks become **per step** for the new
recipes (today `lookOf` / `normLook` / `validLook` merge looks by kind, so a recipe cannot use a kind twice); the `seen` list
must hold all kinds (its cap is 8 today); an old half-made pot keeps resuming as it does now. The old suites stay green
with at most id-neutral edits; the new flow gets new checks.

Step kinds: keep `tap`, `flip`, `slice`; add

| kind | gesture | ends when | notes |
|---|---|---|---|
| `stir` | drag in circles around the bowl centre, either direction | accumulated angle reaches N turns (2 or 3) | angle accumulation from pointer samples about a fixed centre, ignore samples closer than 8 logical px to the centre, wobble and ellipses are fine; emits a `turn` event every quarter turn; the mix sprite frame follows progress |
| `pour` | press and hold anywhere | the fill reaches 100 % (about 2.4 s of holding in total); letting go only pauses | emits `pour` on/off (a sound loop while held) and `fill` at each third; the target sprite frame follows the fill |
| `drag` | drag each of N items from its start slot to its target slot | all N are placed | snap within 28 logical px of the target; a drop elsewhere lets the item glide home; items are picked in any order unless the step says `order: true`; the verb button moves the next item |
| `rub` | move the finger back and forth over the food | 80 % of a grid of bins over the food is covered (then the rest fills itself) | bins about 8 x 6; a finger marks every bin within 14 logical px; used for washing, sprinkling, spreading |
| `swipe` | N short strokes in one direction (up, or as the step says) | N strokes counted (3) | the existing flick test (length and cone) once per stroke; each stroke advances one frame of the roll |
| `bake` | wait, then touch | touched after heat-on | the same heat bands as `flip` (soft, golden, crisp; the bell rings at golden); a touch takes it out at the band it has reached; never burns |

Recipes (the real steps come from `06-dishes-and-real-steps.md`; adjust details there, keep the count and the variety):

| recipe | steps (kind @ station, what the hands do) |
|---|---|
| `jeon2` 해초전 | slice x3 @board (chop the seaweed and green onion, `greens`) → stir x3 @counter (flour, water and greens into batter, `bowl` + `mix.jeon`) → pour @stove (batter into the oiled pan, `jug` + `jeon.pan` 0-2) → flip @stove (as today, with the bell; `jeon.pan` 2-4) → slice '+' @board → reveal `dish.jeon` (frame by band) |
| `gyeran` 계란말이 | tap @counter (crack three eggs into the bowl: each `egg` takes two touches) → stir x3 (beat, `mix.egg`) → pour @stove (`pan.square` + `gyeran.pan` 0-2, then it sets: 3) → swipe x3 @stove (roll it up, `gyeran.pan` 4-6) → slice x3 @board (`gyeran.board`) → reveal `dish.gyeran` |
| `jumeokbap2` 주먹밥 (triangle) | drag x3 @counter (three scoops with the `paddle` from `pot.rice` to the `bowl`) → rub @counter (sprinkle salt and sesame with the `shaker`) → stir x2 (`mix.rice`) → tap @board (press it into a triangle: three marks, two touches each, `rice.shape` 0-3) → drag x1 @board (the `gim` strip onto it, `rice.shape` 4) → reveal `dish.jumeokbap` |
| `kkochi2` 과일 꼬치 (glazed) | rub @counter (wash the fruit in the `basin`, `fruit.wash`) → slice x2 @board (`fruit.board`) → drag x3 @board in order (thread `fruit.piece`s onto the `skewer`) → stir x2 @stove (turn it in the `pot.syrup`, `kkochi.coat`) → reveal `dish.kkochi` |
| `cake` 딸기 케이크 | tap @counter (crack eggs) → stir x3 (`mix.cake`) → pour @counter (into the `tin`) → bake @stove (`oven`) → rub @board (spread the cream, `cake.base`) → drag x3 @board (`berry.top` onto the cream) → reveal `dish.cake` |

Build in this order and push after each: (a) the book, the end buttons, the strip gone, per-step looks, and `jeon2` running
on the three existing kinds only (slice, tap as a stand-in for stir, flip, slice) so that the whole chain works early;
(b) `stir`, `pour` → `jeon2` complete; (c) `swipe` → `gyeran`; (d) `drag`, `rub` → `jumeokbap2`, `kkochi2`; (e) `bake` →
`cake`; (f) polish. **If time runs short, cut from the end** (a recipe whose kinds are not finished is left out
of the table; never ship a half-working step).

Food comes from `COOK_SPR` (contract C1, `SPRITES.md`). Until lane A's file exists, draw a plain fallback box of the listed
size in the listed colours so that you can build and test; never block on A.

Saved data: `ppolppol_cook_v0` keeps everything it has (notebook lines with old looks, `seen`, a half-made pot, `potOld`).
Nothing is dropped or rewritten; new recipes add new lines.

Sound and buzz stay inside the owner's lists: buzz only at a counted tap, a flip landing and a cut (new kinds reuse these
three patterns at their counted moments: a quarter turn of stirring = tap, a roll = flip, a placed item = tap; nothing at
the bell, the plate or the book). Recorded, already credited sounds exist unused in `foley/` for stir, place, clink, lift and
simmer: use them for the new acts on purpose (check which sticker each act name triggers: `simmer` fires the tasting
sticker that the owner ruled out) and add at most two synthesized ones (pour, scrub).

### 3. Teaching without words, and progress

- Each step kind has its own ghost-hand demonstration, shown the first time that kind is met on this device and again after
  5 s without progress, as today: `stir` a hand tracing one circle, `pour` a hand pressing and staying, `drag` a hand
  carrying the first item to its slot, `rub` a hand going back and forth, `swipe` the upward flick, `bake` a hand touching
  when the bell rings.
- **Remove the step strip** (the paper chip with three icons, top left) and put **nothing** in its place: the owner read it
  as buttons with no purpose, and the UX research (`04-intuitive-ux.md`) is clear that framed icons say "press me". Progress
  is shown by the world: the food changes state with every touch, ingredients are visibly used up, the food travels to the
  next station, and the step row was already seen in the recipe book. Nothing that is not a button may sit on a paper chip.
- The tool is drawn where the finger should start and follows the finger (the knife on the cut line, the whisk in the bowl,
  the jug over the pan). The first few pixels of a correct motion already change the food.
- Ghost hand staging from the research: appear, short pause, perform, short pause, leave (about 1.5 s for a path gesture),
  two loops the first time, one loop on idle, gone at the first progress, the fingertip on the target and the hand's body
  off the food.
- Each step should take 4 to 10 s and feel like the real action: the food reacts to every touch (squash, splash, crumbs,
  steam), a short buzz on the key beat (existing buzz names), a sound when sound is on (reuse the existing acts where they
  fit: tap, cut, sizzle, flip, step, done; add at most three synthesized ones: stir, pour, scrub).

### 4. The end of a dish

- The plate is revealed as today, with the new dish sprite. Then **two picture buttons** replace the "again" chip, at the
  bottom centre: the primary, large (about 80 CSS px at 360 wide, 72 at 320), shows the plate with the octopus beside it
  (`aria-label` '문어 부르기' — not "eat together": the octopus decides whether it eats); the secondary, quieter (about
  60 px), shows the plate on the table with an empty seat (`aria-label` '식탁에 두기'). The kitchen uses the latest
  `ctx.canCall` (the game answers every `result` with a fresh `ctx`): when it is false only the table button is shown,
  large. Both keep today's guards for the old chip (shown 450 ms after the reveal, pressable from 900 ms) so that a last
  cooking gesture cannot press them. Touch targets at least 48 CSS px with 8 px between them.
- Pressing one posts `serve` (contract C2) and closes the kitchen. `result` is still posted once at the reveal, as today.
  There is no "again": the counter opens the book again.
- Standalone page: the buttons close the kitchen; the door page is behind it as today.

### 5. Stickers

The owner: stickers are "too small to see" — all of them. Make the kitchen reaction stickers one step larger again on every
phone size (the strip is gone, so there is more room under the wall), keeping whole device pixels and the rule that they
never cover the food or the hand. No feeling faces (the existing list stays).

## Checks

Rewrite the kitchen suites for the new behaviour without weakening what they guard (zero visible characters, determinism,
no failure events, saved data round trips, whole-pixel art, sound off by default, keyboard and screen-reader paths).
Add: every recipe completes by touch, by the verb button only, and by keyboard only; replay determinism for each new kind;
the book (locked and unlocked, tabs, resume skips the book); the `serve` message for both buttons and none for the close
chip; old notebook lines still draw. Update `tools/cook-shots.js` so that it captures the book, one frame of every step kind
and every reveal at 360x740. Run `npm test`, the kitchen live suites once, and look at the captures.

## Report

As in `COMMON.md`. Include: the final recipe table, which kinds and recipes made it, every aria-label, and screenshots of the book, three steps and two reveals.
