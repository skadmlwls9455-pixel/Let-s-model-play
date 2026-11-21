# 02 — Open-source cooking games: how the code implements steps and gestures

Round 7 research, lane 02. Written 2026-11-21. Scope: open-source cooking / food-preparation games and minigame
collections whose **code** shows how recipes, steps and gestures are built. Everything below was read from the source files
named (URL + line range); anything I did not open is marked **(unverified)**.

**We will not copy code.** Every repository here is a source of *ideas* only. We re-implement the ideas in our own vanilla
JS, in our own words and art, and we credit the permissively licensed sources (MIT) in the credits file. Repositories with
no licence file are "all rights reserved": principles only, no code, no art, no layout. Pseudocode in this report is mine,
not a paste.

How to open a file cited below: `KP` = https://raw.githubusercontent.com/TankerALane/kitchenpassport/main/ and
`KCG` = https://raw.githubusercontent.com/yonatan1feldman-prog/kids-cooking-game/master/ (append the path). The others
follow the same pattern, `https://raw.githubusercontent.com/OWNER/REPO/BRANCH/PATH`, with these branches: homemade `main`,
ice-morimori `main`, pancake_shop `main`, Hackerspiele `main`, TeluguCookingGame `develop`, cooking-papa `main`,
burger-builder `master`, Takoyaki `master`, TooManyChefs `master`, octopied-game `main`, js13k2022 `main`, hibachi `master`,
Picnic-Panic `master`, pixel-egg `main`, game-off-2013 `main`. File lists came from
`https://data.jsdelivr.com/v1/packages/gh/OWNER/REPO@BRANCH?structure=flat`.

---

## 0. What changes the build (read this first)

1. **Two open-source games already solved the owner's exact complaint, and both wrote the diagnosis down.** Kitchen Passport's
   design doc lists what was hollow in its first version: mixing was "Tap the bowl 6–15 times" ("Tapping isn't stirring"),
   cooking was "completely passive" (press start, watch a countdown), and plating was a button ("The best moment, the
   reveal, is a button press") (KP `docs/mechanics.md` lines 28–35). Its fix is one sentence: **"Do the real motion"** (line 48)
   plus, after play-testing, **"nothing starts in the bowl or pan"**: the player adds every ingredient in the real order
   (lines 563–564). Our three step kinds (tap marks, wait-then-swipe, drag a line) are the "before" column of that table.
2. **A recipe is a list of `{type, params}` rows; step kinds live in a registry; all numbers live in one tuning table.**
   Both big sources do this (KP `src/steps/index.js` 21–49, 20 type names on 16 modules; KCG `src/steps/registry.ts` 29–54,
   23 type names on 22 classes; KCG `src/core/tuning.ts`). One pizza is 14 listed steps plus 3 inserted prep steps
   (KCG `src/recipes/pizza.ts` 64–207); one grilled cheese is 7 (KP `src/data/recipes/home.js` 20–35). Our `cook.js` has
   3 kinds and 2–3 steps per dish: the gap is the feature.
3. **Gesture recognisers are accumulators, not shape matchers.** Nobody recognises "a circle". Stirring = summed angle
   around the bowl centre (KP) or summed finger travel inside the bowl (KCG). Rolling, grating, washing, spreading =
   travel or grid coverage. Pouring = milliseconds held over the target. Kneading = presses per stage. Cutting = progress
   of a front along a line. All are monotonic 0..1 counters, so **they cannot fail and they are trivially deterministic**
   (fits our DOM-free simulation and node tests).
4. **Progress is drawn in the food, not in a strip.** KCG states it as a rule: "Progress is shown only in the food itself
   (no bars or dots)" (KCG `src/scenes/RecipeScene.ts` line 42). Dough goes through 4 pictures, sauce cross-fades from chunky
   to smooth, the cheese block shrinks while the pile grows, the cut darkens as far as the finger has come. This is the
   design answer to removing our top-left step strip.
5. **Steps hand objects to each other.** KCG keeps a `handoff` map: the kneaded dough ball is *adopted* by the rolling step,
   the stirred sauce bowl by the spreading step, the grated pile by the sprinkling step, "so the food visibly carries on"
   (KCG `src/steps/Step.ts` 41–46, 324–336). KP keeps a `bench` object (bowl contents and mix level, pot contents, stove heat)
   that every later step draws from (KP `src/steps/bench.js` 8–27). This is the fix for "the dish just pops onto the table".
6. **A never-stuck contract replaces fail states.** Idle 8 s -> a ghost hand shows the gesture (looping); 20 s more -> the
   helper does a unit of the work (one cut) or the rest of the motion (the stir) and control returns; 3 misses in a row ->
   the hint comes at once
   (KCG `src/steps/Step.ts` 71–85, 231–275; `src/core/tuning.ts` 18–29). KP: when a 5 s action window is missed the helper does it
   ("Your helper flipped it for you!"), and an over-long cook is taken off the heat by the helper
   (KP `src/steps/cook.js` 17–19, 164–171, 209–216; `docs/mechanics.md` 50–51).
7. **Every drag also works as a tap.** KP's rule "Every drag also works as tap-to-pick, tap-to-place" (KP `docs/mechanics.md`
   line 54) is implemented in three small recognisers (KP `src/ui/Gestures.js`, 177 lines): drag-or-tap, circle sweep with a
   tap worth 1/8 turn, swipe with a tap fallback. One-thumb phone play needs exactly this.
8. **The meal is part of the recipe.** KCG's last steps are `share`/`feed` (drag each piece to a character's mouth; the
   character looks up and opens wide when a piece comes near) and `photo` (KCG `src/steps/FeedStep.ts` 29–35, 78–93;
   `src/steps/ShareStep.ts` 59–74). KP ends with `plate` and a "ta-da" (KP `docs/mechanics.md` 282–287). In both, serving is
   the last *played* step.
9. **Recipe book reference (MIT): cards behind dividers, blank cards for undiscovered recipes, cosmetic mastery at 1 / 3 /
   5 / 10 bakes, "bake again" from the card** (homemade `src/screens/RecipeBookScreen.tsx` 32–39, 173–263;
   `src/domain/mastery.ts` 26–31). KP's book is an open ring binder, two pages, four recipes per spread, tabs per place
   (KP `src/scenes/RecipeBookScene.js` 11, 184).
10. **Anti-pattern confirmed in the wild:** games where every dish runs the same three stages feel like a wrapper. The
    Telugu game hard-codes chop -> mix -> serve for all five dishes (`src/main.py` 280–331); cooking-papa uses
    `step_1/step_2/step_3` booleans. Variety must come from *different step sequences and different visible states per dish*.

---

## 1. Repositories examined

Stars, licence field, language and last push come from the GitHub repository search API on 2026-11-21. "Licence" is what I
confirmed by opening the LICENSE file (or getting a 404 for it). Permissive = MIT / BSD / Apache / CC0 / Unlicense / zlib.

| # | Repo | Stars | Licence | Permissive? | Engine | Depth | What we can learn |
|---|---|---|---|---|---|---|---|
| 1 | [TankerALane/kitchenpassport](https://github.com/TankerALane/kitchenpassport) | 0 | Code MIT (LICENSE opened); **art, music, branding all rights reserved** (README "Licensing") | **yes (code)** | Plain HTML + JS ES modules, **no build step**, Phaser 3.80.1 vendored, SFX made in code | deep | Design doc of "hollow -> real"; 3 gesture helpers; step base class; shared bench state; heat + doneness + action windows; step list per recipe; binder recipe book |
| 2 | [yonatan1feldman-prog/kids-cooking-game](https://github.com/yonatan1feldman-prog/kids-cooking-game) | 0 | **none** (API says NOASSERTION; LICENSE, LICENSE.md, LICENSE.txt, COPYING all 404; only ASSET-LICENSES.md for CC0 sounds) | no | TypeScript, Phaser 4, Vite | deep | **Text-free, no fail, no timer**: the closest match to our rules. Step contract, tuning table, 23 step types, handoff, ghost hand, feeding |
| 3 | [quangshuynh/homemade](https://github.com/quangshuynh/homemade) | 0 | MIT (opened) | **yes** | TypeScript, React 19 | deep | Recipe book: blank cards, dividers, mastery stamps, favourites, "bake again"; recipe `look` descriptor that composes the art |
| 4 | [tanuu5/ice-morimori](https://github.com/tanuu5/ice-morimori) | 0 | MIT (opened) | **yes** | JS, three.js | deep | Phase machine that emits events (sim/presentation split); hold-to-fill with a sweet band; release-all on blur |
| 5 | [jihye21/pancake_shop](https://github.com/jihye21/pancake_shop) | 0 | none (404) | no | Single HTML file, canvas 2D | deep (whole file) | Doneness as a colour ramp with speckles; flip animation maths; haptic tick |
| 6 | [KIT-GameJam/Hackerspiele](https://github.com/KIT-GameJam/Hackerspiele) | 12 | MIT (opened) | **yes** | Godot, GDScript | deep (framework + 1 microgame) | Microgame contract (`finished` signal, per-run storage); hold-to-charge toaster; toastedness drives shader + smoke |
| 7 | [lokitha-muni/TeluguCookingGame](https://github.com/lokitha-muni/TeluguCookingGame) | 1 | MIT (opened) | **yes** | Python, Pygame | deep (minigames) | Smallest possible chop / stir / serve recognisers; also the "same 3 stages for every dish" anti-pattern |
| 8 | [ashleyleal/cooking-papa](https://github.com/ashleyleal/cooking-papa) | 0 | none (404) | no | Python, Pygame | medium | Two reusable mechanics parameterised per dish (slice, timed cooking with raw / cooked / burned pictures) |
| 9 | [lewdev/burger-builder](https://github.com/lewdev/burger-builder) | 1 | MIT (opened) | **yes** | Vanilla JS, canvas 2D | medium | Food drawn by code from a data table of layers; target picture drawn by the same function at 0.55 scale |
| 10 | [ChrisLee2C/Takoyaki](https://github.com/ChrisLee2C/Takoyaki) | not returned by search (unverified) | none (404) | no | Unity, C# | medium | Remake of a Flash griddle game: many pieces, each with its own cook meter and 4 pictures; fill a container, then serve. (Octopus dish: mechanics only, never the dish.) |
| 11 | [navignaw/TooManyChefs](https://github.com/navignaw/TooManyChefs) | 53 | none (API) | no | JS, React | light | "A recipe is a list of json steps": typed steps with `type`, `timer`, hooks |
| 12 | [pderyuga/octopied-game](https://github.com/pderyuga/octopied-game) | 0 | MIT (opened) | **yes** | Python, Pygame | light | An octopus chef: tentacle tip eases toward the pointer; minigame base class |
| 13 | [gheja/js13k2022](https://github.com/gheja/js13k2022) (Cooking for Skully) | 4 | MIT (opened) | **yes** | TypeScript, DOM | light | Recipe = container + ingredient counts + seasoning; recipe card text generated from data; done cards greyed |
| 14 | [Metajake/hibachi](https://github.com/Metajake/hibachi) | 0 | none (404) | no | Phaser 2 | light | Rhythm cooking: actions tied to beat divisions, graded timing |
| 15 | [jamescasia/Picnic-Panic](https://github.com/jamescasia/Picnic-Panic) | 1 | none (404) | no | Cocos Creator JS | light | 4 x 4 grid tap arcade (combo, frenzy); not a cooking process. Juice timings only |
| 16 | [yamin-ohmar/pixel-egg](https://github.com/yamin-ohmar/pixel-egg) | 0 | none (404) | no | Single HTML, canvas | light (whole file) | Pixel art from stacked rectangles; one `drawEgg(colour, x, y)` reused in pan and on plate |
| 17 | [fernjager/game-off-2013](https://github.com/fernjager/game-off-2013) (Turkey Cooking Simulator) | not returned (unverified) | Code GPL-3.0, art CC BY-NC (README) | no (copyleft) | CreateJS canvas | light | Layered doneness (skin / body / core) from a heat model |

Looked at the file list only (not read): [imshota1009/Bartender-EN](https://github.com/imshota1009/Bartender-EN) (Apache-2.0,
8 stars), [d-lowl/echo_ramen](https://github.com/d-lowl/echo_ramen) (MIT), [TriForMine/Delixia](https://github.com/TriForMine/Delixia)
(Apache-2.0, 13 stars, co-op kitchen), `Prakritiswaroop/Sugar-Spice---Kitchen-Dreams` (folder named after a commercial
character: skip), `angelachan64/Relish2.0`, `gdp2112/Cooking-Minigame`, `navignaw/TooManyChefs` other recipes.

---

## 2. Patterns worth re-implementing

Each is an idea to rebuild in our own code. Numbers are the source's; "ours" is my conversion (our stage is 144 x 160 art
px; at 360 CSS px wide one art px is 2.5 CSS px; 7 mm is about 26 CSS px, about 10 art px).

### P1. Step contract with a never-stuck clock (KCG `src/steps/Step.ts`; KP `src/steps/Step.js`)
Every step kind implements the same four things: build, the gesture, a short demo of the gesture, and "helper finishes".
The base class owns the idle clock. Any real progress calls `poke()`. In my words:
```
each frame while the step is waiting on the player:
    if a finger is resting on the screen and no hint is showing: do not count
    idle += dt
    if idle >= 8 s  and no hint yet:  loop the demo hand over the right object
    if idle >= 8 s + 20 s:            helper does it (one unit, or the rest), then control returns
on real progress:   idle = 0, hide the hint
on a try that missed: misses += 1; at 3 in a row show the hint now
```
Sources: contract text KCG Step.ts 71–85; clock 231–250; poke 253–259; miss 261–275; safety net that hands the step back
if the help animation never ends (30 s) 213–220 and tuning.ts 416. After a help with no touch since, the next help comes
after 12 s instead of 28 s (tuning.ts 411–416). KP records "oops" per skill and after 2 on one step pulses the hint button
(KP `src/scenes/CookScene.js` 148–158).
**For us:** put the idle clock in the DOM-free simulation (it is only `dt` arithmetic), so node tests can assert "a step
left alone completes in at most N seconds".

### P2. Recipe = data rows; registry of step kinds; one tuning table (KCG `src/recipes/pizza.ts`, `src/steps/registry.ts`, `src/core/tuning.ts`; KP `src/data/recipes/home.js`, `src/steps/index.js`)
Pizza, as data: wash -> knead (4 stage pictures, 4 presses per stage) -> roll -> crush -> stir -> spread -> find the tool ->
grate -> sprinkle -> choose 3 of 6 toppings -> (the 3 chosen toppings' prep steps are spliced in here: chop, or
open-and-pour) -> decorate -> bake -> share -> photo (pizza.ts 64–207; the splice is RecipeScene.ts 147–150).
Grilled cheese, as data: wash -> spread butter -> bread into the pan -> 2 cheese slices -> top slice -> cook
(skillet, low or medium heat, 10 s, one flip at 0.5) -> slide onto a plate (home.js 20–35).
KCG's tuning header gives the pacing rule: more work means "more repeats and more visible in-between states, never
something harder"; one step is "about 10-20 s of active doing" (tuning.ts 8–11).
**For us:** `STEP_KINDS = {pour, crack, stir, press, cut, spread, sprinkle, place, heat, flip, plate, ...}`, each dish a
6–9 row list, every count and threshold in one exported table that the tests import.

### P3. Stirring by accumulation (KP `src/ui/Gestures.js` 114–153 + `src/steps/whisk.js`; KCG `src/steps/StirStep.ts` 87–124, 181–219)
Two workable recognisers:
```
A. angle sum (KP):   on each move inside the ring rMin..1.25*rMax around the bowl centre:
                        d = wrapped(angle_now - angle_before); ignore if |d| > 90 degrees (a jump, not a stir)
                        progress += |d|          # either direction counts
                     done at turns * 2*pi (default 4 turns); a tap adds 1/8 turn
B. travel sum (KCG): on each move while the finger is near the bowl (the spoon itself is clamped into the opening):
                        progress += distance moved / needed      # "no circles needed, any wiggle counts"
                     needed is about 6 dish widths, "about 2-3 laps"
```
Optional depth without failure: KCG's arrow mode counts only travel in the arrow's direction (arc = angle delta times
radius), the arrows turn round at 50 % (at 34 % and 67 % on the harder level), and wrong-way travel only makes the
contents wobble after 160 units (StirStep.ts 206–219, tuning.ts 208, 225). KP's `gentle` variant ignores sweeps faster
than 16 rad/s (whisk.js 14, 61–67).
Feedback: spoon follows the finger clamped to 85 % of the opening and tilts with its x position (StirStep.ts 162–170);
2 droplets and a squish every 110 units (181–196); contents cross-fade through stage pictures (276–291); KP hides the
dashed circular arrow after the first full turn and draws a progress arc round the bowl (whisk.js 35–48, 91, 98–109).
**For us:** use A (angle) with rMin about 12 % of the bowl radius, 3 turns, either direction, tap = 1/8 turn; show
progress by 3 batter pictures, not by a ring.

### P4. Cutting as a front that follows the finger (KCG `src/steps/lineCut.ts` 15–71, `src/steps/ChopStep.ts` 91–137, 226–260)
```
line from a to b; front = 0
on each finger move (from -> to):
    if 'to' is farther than band from the line, or before -35 % / past 125 % of its length: nothing
    if the move points more than 35 degrees away from the line direction: nothing (opposite way = "wrong")
    if the move starts and ends more than 30 % of the line ahead of the front: nothing
    front = max(front, position of 'to' along the line)
when front >= 0.8: finish the cut by itself, drop the slice, show the cut face
```
Numbers: angle 35 degrees; band 17 % of the dish diameter or 33 % of a vegetable's width, never under 110 units
("about 7 mm on the phone: a small fingertip"); gap 0.3; through 0.8; 90 units of wrong travel in one touch -> one gentle
wobble (tuning.ts 71–80). A stroke may stop and resume. The knife glides sideways onto the line when the finger is within
the band (ChopStep.ts 227–232). A tap without a stroke only wiggles the food (128–135). The dotted guide with arrowheads
shows only while the knife is held or the helper demonstrates (153–158; lineCut.ts 77–101). Each cut: slice tween 380 ms
to a pile, 7 juice particles, a 70 ms dip of the food, a spoken count (239–289).
KP judges the whole stroke on release instead: accept if vertical extent >= min(90, 60 % of the food height), mean x
within 36 px of the nearest uncut line, and wander <= 57.6 px; a tap within 70 px of a line auto-slices
(KP `src/steps/cut.js` 13, 104–136). KP draws the knife 80 px below the touch point so the finger does not hide the blade
(cut.js 43–48, my reading).
**For us:** our `slice` step already drags along a guide; change it to the front model (cut visible up to the finger,
resume allowed, auto-finish at 80 %), band about +/- 10 art px, and add the tap fallback.

### P5. Heat, doneness stages and an action that waits (KP `src/steps/cook.js`, `src/steps/cook/foods.js`; KCG `src/steps/FlipStep.ts`)
KP: `p += rate * slow * dt / seconds`; rate is 1 inside the recipe's heat band, 1.8 above it, 0.35 one notch below, 0.15
lower, 0 when off; `slow` is 0.5 while an action button is open, so the food waits for the player (cook.js 142–155).
Stage tables per food, e.g. pancake: 0 wet batter, 0.35 bubbles on top, 0.6 edges look dry, 1 golden, 1.3 very dark
(foods.js 24–28). Actions `{at: 0.5, kind: 'flip'}` open a pulsing button for 5 s; missed -> the helper does it
(cook.js 199–216). Steam puffs every 420 ms, one per heat level, each rising 110–150 px over 1.3 s (187–196); sizzle
every 1.5 s from medium heat up, louder with heat (106).
KCG's pour-and-flip has phases knob -> ladle -> cook -> flip -> fly: drag the ladle over the pan and hold 3.5 s in all
(a drop every 50 ms, the puddle grows through pictures); 3 s later bubbles appear by themselves; then a swipe up of at
least 90 units that starts within 1.35 pan radii flips it. "Nothing burns, nothing can go wrong, nothing waits on time
but the bubbles" (FlipStep.ts 11–35, 97–154, 216–269; tuning.ts 157). Three pancakes, counted onto a stack.
**For us (no fail, no countdown):** keep `p` and the stage pictures, drop everything above 1.0 (never "very dark"): at
p = 1 the food simply waits, sizzling, until the player acts; after the idle clock the helper acts. The knob can have 3
positions where the wrong ones are only slower, never wrong.

### P6. Pour by holding over the target (KCG `src/steps/OpenPourStep.ts` 55–67, FlipStep.ts 202–257; KP `src/steps/pour.js` 1–28)
Drag the container; while its lip is over the target it tips by itself and time accumulates; moving away pauses, coming
back resumes; letting go sends it home upright. KCG: 2.8 s in all for a can, 1.3–2.5 s for small things (tuning.ts 87,
110–112, 125–126). KP: fill 0.4 per second while tipped at -60 degrees, a tap pours a quarter, "perfect" 0.9–1.1 of the
line, hard stop at 1.25 (pour.js 24–28). Opening first is its own micro-step: 4 taps or one 110-unit swipe for a can lid,
1100 units of sideways rubbing for a jar lid, a tap counting a quarter (tuning.ts 81–87).
**For us:** one `pour` kind = `{source, target, ms}`; in the no-fail form there is no overflow, the stream just stops at
the line with a small bounce.

### P7. Coverage grid for spread / sprinkle / roll (KCG `src/steps/SpreadStep.ts` 48–128; KP `src/steps/coverage.js` 24–26, `docs/mechanics.md` 268–280)
A hidden grid over the paintable disc (KCG: cell = R/9 inside 0.68 R; brush 0.42 R; a stamp covers cells within 0.4 brush;
strokes are interpolated every 0.3 brush so fast drags leave no gaps; strokes outside are clamped onto the dish). At 78 %
covered the game fills the remaining cells by itself over 400 ms, uncovered ones first, so the result always looks
complete (115–128; tuning.ts 63). KP: brush 34 px, cell 22 px, done at 85 %, `leaveRim` so the crust edge does not count,
and "the tap fallback for all four: each tap paints a big circle" (mechanics.md 280).
Rolling and grating are plain travel: 6 dough widths of rubbing while the ball squashes (x 1.9 wide, x 0.4 tall) and
cross-fades into the flat dough (KCG `src/steps/RollStep.ts` 94–120); grating 4200 units with sideways counting a third,
a shred every 60 units, the pile changing picture at 6 %, 40 %, 75 % (KCG `src/steps/GrateStep.ts` 10, 105–118;
tuning.ts 59).

### P8. Presses with stage pictures (KCG `src/steps/PressStep.ts` 23–36, 91–110, 163–197)
One pointer-down on the food (its bounds plus 70 units, not extended downward) is one press; holding or sliding never
counts twice. Each press: squash to 108 % x 86 % then an elastic return over 420 ms, a tinted dent under the finger (at
most two dents on screen), 3 to 6 particles, a squish. Every 4 presses the picture advances; dough has 4 pictures, so 12
presses. The same class crushes tomatoes in a bowl and squeezes a lemon over one. From the third play of a recipe the
counts grow by one per stage (tuning.ts 45–51).
KP's egg is the best two-beat version: drag or tap the egg to the rim -> a 200 ms move and a 90 ms knock -> cracked picture
-> tap to open -> the yolk falls 320 ms into the bowl; a flick faster than 45 px per frame smashes it and leaves a bit of
shell to fish out (KP `src/steps/crack.js` 15, 63–112). Never a fail: a small extra job.

### P9. Drag-or-tap placement with generous targets (KP `src/ui/Gestures.js` 6–108)
Drop targets accept 40 px beyond their box. A movement under 10 px is a tap. Tap an item = it lifts 24 px and grows to
112 %; tap a target = it goes there. A rejected drop slides home in 220 ms with a back-out ease. Picking up cancels any
slide-home still running. KP uses this for "move food there" (`plate` with `to: 'pan'`), tipping a board into the pot
(`transfer`), and plating ("one tap sends a piece to the plate or pan", mechanics.md 583–584).
KCG's motion language for the same moments, as numbers in one place (KCG `src/core/paper.ts` 18–26): lift 106 % and -3
degrees in 120 ms; drop squash 108 % x 88 % for 90 ms then settle 260 ms; button press 92 % for 80 ms, overshoot 104 %,
220 ms back; appear from 60 % in 320 ms with 40 ms stagger; "not here" = a 6-degree wobble in 220 ms, "never a sad sound".

### P10. Ghost-hand demo, first run only (KCG `src/core/hand.ts` 8–72, `src/steps/Step.ts` 136–207; KP `src/steps/Step.js` 99–122)
A demo is keyframes `{x, y, t, press?}` for a hand picture holding a *prop* copy of the tool (the real tool hides
meanwhile). It lasts at most 2.5 s, never changes the dish, and any touch ends it at once and that touch counts
(Step.ts 150–153; tuning.ts 27). Demos play only the first time a recipe is cooked on this device (a localStorage counter;
RecipeScene.ts 23–38). As a hint the same motion loops with 900 ms gaps and a soft glow on the first touch point
(Step.ts 128–134). KP's cheaper version: a white fingertip dot that travels a point list twice in 900 ms each
(Step.js 107–122); for stirring, two laps in 2.4 s (whisk.js 124–133).
**For us:** we already draw a pixel hand; give it these rules. The octopus could be the helper whose arm does the unit of
work (see octopied-game: the arm tip eases toward its target each frame, `pos += (target - pos) * min(k * dt, 1)`,
`tentacle.py` 38–45). That is a picture of help, not a claim about feelings, so it stays inside the honesty rule
(to confirm with the owner).

### P11. Step end and recipe end are two different sizes of reward (KCG `src/core/finale.ts` 8–37, `src/scenes/RecipeScene.ts` 147–184; KP `docs/mechanics.md` 322–328, 282–287)
Step end: the dish itself boings, about 10 paper bits, a ring of light, and **the next note of a rising 5-note scale**
(the scale restarts each recipe); then 800 ms before the next step. No stars: "those are kept for the very end". Recipe
end ("ta-da"): the camera leans in to x 1.12 on the finished dish, a beam of light slides over it, 24 confetti, the
characters cheer; 1.4 s later the camera leans back. Particle budget: 40 alive (finale.ts 19).
KP's table: any touch -> soft click and a 0.92 squash for 80 ms; correct sub-action -> short chime and a sparkle at the
spot; step complete -> rising 3-note chime; oops -> a soft low boop and a +/- 6 px shake three times, never a buzzer.
"Every touch gets a reaction within 100 ms" (mechanics.md 56).
**For us:** our sound is off by default, so each of these needs a visual twin (boing, sparkle, sticker) and a short
haptic; the rising scale is a cheap, strong signal when sound is on.

### P12. Serve and eat as the last steps (KCG `src/steps/ShareStep.ts` 35–38, 59–74; `src/steps/FeedStep.ts` 78–93; `src/steps/PhotoStep.ts` 28–35)
The dish is cut by the player (same line-cut as chopping), the pieces spread 12 units apart so the cuts show, and each
piece is dragged to a mouth. Within about 650–700 units the eater looks surprised and opens wide; a release within 320
units of the mouth (the finger *or* the piece) is eaten, chewing about 1.05 s; anywhere else the piece glides home. "Any
sharing is fine, all to one of them too: nobody is ever sad about not getting one." Then a photo of the dish goes into an
album that has "no empty slots waiting to be filled, no counters" (KCG `src/scenes/AlbumScene.ts` 43–50).
**For us:** the kitchen should end on plate -> ta-da -> one picture button that means "carry it to the table and call the
octopus"; the plate then leaves the kitchen in the player's hands and arrives on the play-room table as a continuation
of the same motion (KCG's `flyTo`, "a picture shrinks and flies into a corner ('it is kept'), without a word",
finale.ts 17, is the minimal version). Whether the octopus eats stays with our labelled demo rule: do not show an
expectant open mouth before that rule has answered.

### P13. Recipe book (homemade `src/screens/RecipeBookScreen.tsx`, `src/domain/recipes.ts`, `src/domain/mastery.ts`; KP `src/scenes/RecipeBookScene.js`)
homemade (MIT): recipes are filed behind family dividers with "found / total" counts; a found card shows the dish art,
name, ingredients, first-baked date, a mastery word and two buttons (favourite, bake again); an undiscovered card is a
blank card with a strip of tape, a question mark, how many ingredients it needs and at most one scribbled clue; secret
recipes are not in the box at all until baked (RecipeBookScreen.tsx 32–39, 173–263). Mastery is cosmetic: 1, 3, 5, 10
bakes, "never more than ten" (mastery.ts 26–31), and the top stage adds a flourish to the art (line 206). "Bake again"
"lays the ingredients out in the bowl; the player still mixes and bakes" (253–256). Each recipe carries a small `look`
descriptor `{dough, topping, shape}` from which the picture is composed (recipes.ts 57, 70, 83).
KP (MIT): an open ring binder, two paper pages, four recipes to a spread with page arrows, tabs down the side per place,
stars per recipe on the card (RecipeBookScene.js 11, 103–128, 184–195, 211–229).
**For us (no words in the kitchen):** a two-page pixel book; one dish per card drawn by the same dish-art code at small
scale; unknown dishes as a taped blank card with a silhouette; mastery as 1–4 small stamps; the card's ingredient
pictures double as the picture-only "what you will do" preview.

### P14. Simulation emits events; presentation listens (ice-morimori `src/game/Counter.js` 1–13, 247–292; `src/core/Input.js` 27–42, 88–92)
The counter is a phase machine (select -> scoop -> carry -> aim -> fall -> settle) driven by abstract `press / release /
move / pick`; everything audible or visible is requested through `onEvent(name, data)` (`scoopStart`, `scoopEnd` with a
quality, `drop`, `pourEnd`...). Hold-to-scoop: a gauge fills in 1.05 s x a per-flavour hardness, capped at 1.08; release
below 0.12 cancels for free; 0.60–0.84 is the sweet band; outside it quality falls off smoothly, never to zero
(Counter.js 27, 276–291, 485–488). The tub is visibly carved as the ball grows (497). Input maps keyboard, mouse, pad and
touch to actions and releases everything on blur, pagehide and hidden tab so nothing stays "held" (Input.js 88–92).
**For us:** this is the shape our DOM-free top half should keep: `step.input(kind, x, y, t)` -> `[events]`; art, stickers,
sound and haptics subscribe. A sweet band may change which sparkle plays, never whether the step completes.

---

## 3. Deep reads, repository by repository

### 3.1 TankerALane/kitchenpassport — MIT code, no build step (the closest to our stack)
https://github.com/TankerALane/kitchenpassport — 0 stars, pushed 2026-11-05, 408 files. A browser cooking game for children
of about 6–10; "plain HTML and JavaScript with no build step" (README). Code MIT ("Copyright (c) 2026 Decoupled Lane
Studio"); art, music, logos and branding are explicitly **not** MIT. We may learn from the code and credit it; we may not
reuse any picture, sound or name.

- **Recipe and step representation.** A recipe is an object with `ingredients`, `tools` and `steps`; each step row is
  `{card, type, ...params, text, sub, hint}` (KP `src/data/recipes/home.js` 6–35). `createStep(scene, step, ctx)` looks the
  type up in `STEP_TYPES`; an unknown type degrades to an info card with a console warning, "so a data typo never blocks a
  recipe" (KP `src/steps/index.js` 1–2, 44–48).
- **How steps advance.** The scene destroys the old step, builds the next, and gives it a context
  `{area, ui, bench, recipe, mistake(skill, detail), complete()}`; on complete: sound, 16 sparkles, 450 ms, next
  (KP `src/scenes/CookScene.js` 87–146).
- **Leak-proof step base.** A step puts everything in one root container and uses its own `delay / every / tween /
  listen` wrappers; `destroy()` cancels them all, so nothing from one step fires in the next (KP `src/steps/Step.js` 3–6,
  44–65, 129–139). The design doc names the bug this fixes: "Timers and tweens can leak between steps"
  (KP `docs/mechanics.md` line 24). **Our engine should have the same rule.**
- **Shared kitchen state.** `bench = {bowl: {contents, mixed, bits}, blender, pot: {liquid, bits}, stove: {heat}}`
  (KP `src/steps/bench.js` 8–15). Adding an ingredient pushes `{id, colour, amount, count}` and **drops `mixed` to at most
  0.3**, so the bowl visibly needs stirring again (21–27); whole pieces (fruit, chopped tomato) stay pieces when stirred
  (29–36); "the pot remembers" what went in and every later view draws the same pieces (mechanics.md 570–572).
- **Gestures.** `DragTap`, `CircleSweep`, `SwipeAcross` (P3, P9). Whisk (P3), cut (P4), cook (P5), pour (P6), coverage
  (P7), crack (P8).
- **Transfer and plate.** `transfer` = tip a board, tray, colander or dish over the pot or bowl and the pieces fall in
  and stay there for later steps (KP `src/steps/transfer.js` 1–10); "a tap tips it in too" (mechanics.md 566–569). `plate` with `to: 'pan' | 'pot' | 'sheet'` only moves food there;
  without `to` it is the final plating with garnish and the ta-da; `serve: 'ladle'` scoops soup into a bowl three times
  (KP `src/steps/plate.js` 1–9; mechanics.md 583–589: pancakes stack, syrup is drizzled along the finger and a tap draws a
  zig-zag, garnish falls in pinches).
- **Feedback, progress, hints.** See P11. Progress: step dots in the header (mechanics.md 65) and a per-step counter such
  as "Cut 2 of 6" (KP `src/steps/cut.js` 57, 145). Hints: level 1 text, level 2 "a ghost hand doing the gesture over the
  right object" (mechanics.md 334–336). The doc also lists what it removed: a harsh buzzer, a red "Try again", long
  sentences, 17 px targets (17–23). Minimum target 64 px "in game space" (54); the step code centres on x = 640, so that
  space looks 1280 wide (my inference).
- **What does not fit us.** It scores stars and logs mistakes per skill for a parent dashboard, and it leans on text
  instructions and a read-aloud voice. We take the motions and the state model, not the scoring or the words.

### 3.2 yonatan1feldman-prog/kids-cooking-game — no licence (principles only), but our rules exactly
https://github.com/yonatan1feldman-prog/kids-cooking-game — 0 stars, pushed 2026-11-14. README: "A small, text-free
cooking game for young children ... There is no text to read, no way to fail and no time limit." Landscape tablet,
Phaser 4. Eight recipes (pizza, salad, cookies, smoothie, pancakes, soup, cake, skewers; KCG `src/recipes/index.ts` 12).
**No LICENSE file: nothing may be copied; the ideas below are re-stated in my words.**

- **Recipe.** `{id, card, board, character, steps: [{type, params}]}` (KCG `src/recipes/pizza.ts` 48–64). Counts come from
  the tuning table by spread (`...TUNING.chop`).
- **Step advance.** `runStep(i)`: create from the registry, `start()`, `intro(withDemo)`; `stepDone(i)`: splice in any
  steps the step queued, celebrate, 800 ms, next; before `share` or `photo` it plays the ta-da first, "when her dish is
  finished and still whole" (KCG `src/scenes/RecipeScene.ts` 137–184).
- **Workspace modes.** A step declares where the main dish is while it works: `dish` (centre), `aside` (small, in a side
  column, while prep happens in the middle) or `none`; the move is a 500 ms tween (KCG `src/steps/Step.ts` 338–358). This is
  how prep steps and the main dish share one screen without a scene cut.
- **One dish object carried through.** `Dish` has layers (base, painted sauce, sprinkles, toppings) and after decorating
  is flattened into one texture, "exactly the pizza the child made", which is then baked, cut and eaten
  (KCG `src/steps/Dish.ts` 16–24). The eaten slices are literally the player's own arrangement.
- **Gestures.** stir (P3), chop (P4), pour-and-flip (P5), open-and-pour (P6), spread / roll / grate (P7), press (P8),
  sprinkle: a touch near the dish or the tool starts it; a burst of 4 pieces on touch and 1 more every 50 units of travel;
  55 pieces finish it; the shaker hovers above the finger, turned over, so the finger does not hide it
  (KCG `src/steps/SprinkleStep.ts` 15–23, 73–119; tuning.ts 65). Bake: drag the dish into the oven; press up / down to move a
  needle in steps of 50 between 50 and 250 until the target glows; the start button only works at the target; "there is no
  wrong value and the pizza never burns"; then drag mitts to the door and pull the dish out: let go past 55 % of the way
  and it lands, earlier and it slides gently back (KCG `src/steps/BakeStep.ts` 26–39; tuning.ts 88–94). Choose: tap to
  pick 3, tap again to put back, "there is no wrong choice" (KCG `src/steps/ChooseStep.ts` 26–33).
- **Feedback.** Every touch anywhere gets a 450 ms paper ring that "never counts as a miss or as progress"
  (KCG `src/core/juice.ts` 13–29). Kitchen props answer taps (a jar hops) but give no progress
  (RecipeScene.ts 109–110). Characters look at the finger, else at the demo hand, else at the dish (192–200).
- **Replay depth without failure.** From the 3rd and the 5th play of a recipe: +1 cut per vegetable, +1 press per stage,
  +10 sprinkles, +1 shake (tuning.ts 45–51). A second level tightens the cut to 26 degrees and 12 % band, adds arrows to
  every stir, and delays the hint to 11 s: "Never a timer, never a failure" (tuning.ts 209–241).
- **Touch.** See section 5.

### 3.3 quangshuynh/homemade — MIT; the recipe book
https://github.com/quangshuynh/homemade — 0 stars, pushed 2026-11-05. The README calls it "a cozy baking game that runs
in your browser" and says "It is **not** an idle or clicker game." MIT, "Copyright (c) 2026 Quang".
- **Recipe.** `{id, name, ingredientIds, description, descriptors, look: {dough, topping, shape}, discoveryText, rarity,
  family, isSecret, clue}`; a recipe is an exact *set* of ingredients, order-free; ids are never renamed because saves
  key on them (homemade `src/domain/recipes.ts` 30–63).
- **Baking rules are pure functions** over a `Bowl` (at most 5 ingredients, at least 2 to mix; each change returns an
  outcome such as `added`, `already-in-bowl`, `bowl-full`) (homemade `src/domain/baking.ts` 35–60). Same shape as our
  DOM-free half.
- **Book.** P13. Also: clues never name an ingredient ("a feeling, a texture, a time of day", recipes.ts 46–47).
- It is a discovery game (pick ingredients, mix, bake), not a gesture game: take the book, not the loop.

### 3.4 tanuu5/ice-morimori — MIT; phase machine and hold-to-fill
https://github.com/tanuu5/ice-morimori — 0 stars, pushed 2026-11-01. A 3D ice-cream stand: hold to scoop, release in the
band, drop the swinging ball on the tower, hold to sprinkle. MIT, "Copyright (c) 2026 たぬ". See P14. Extra detail: the
sprinkle pour uses its own band 0.55–0.85 and cancels below 0.08 (ice-morimori `src/game/Counter.js` 28, 313–319). The game
has scores and a melting timer; we take the mechanics and the event split only.

### 3.5 jihye21/pancake_shop — no licence; doneness you can read
https://github.com/jihye21/pancake_shop — single `index.html` (752 lines), canvas 300 x 300.
- **Doneness.** `time += 0.008 * heat` per frame (heat is a random 0.5–1.5 per round); colour is a 4-stop ramp, cream ->
  tan -> brown -> near black, interpolated by `time`; 12 random speckles fade in at times between 0.2 and 0.7; the
  underside browns at 0.8 x the rate (`index.html` 316–327, 401–412, 582–587).
- **Flip animation.** Over 20 frames: vertical scale = cos(progress x pi), so the disc thins to an edge and comes back
  showing the other side at the half-way point; lift = sin(progress x pi) x 75 px; a small sideways wobble in the first
  30 %; on landing a bounce value decays x 0.85 per frame giving up to 10 px of hop and up to 20 % squash
  (`index.html` 414–432, 595–625).
- **Feedback.** A looping sizzle started at a random offset in the first 70 % of the file at volume 0.4, a scrape sound
  at 3 x speed on the flip, and `navigator.vibrate(10)` (269–294, 739–741).
- It grades the result 0–100 and has a "burnt" outcome: we keep the ramp, the speckles and the flip maths, and stop the
  ramp at "golden".

### 3.6 KIT-GameJam/Hackerspiele — MIT; microgame contract
https://github.com/KIT-GameJam/Hackerspiele — 12 stars, Godot. 32 microgames in one list (`microgames/microgames.gd` 5–42).
Each microgame extends one base class, emits `finished` once, has an exported `time`, and gets a `storage` dictionary that
persists for the run (README 20–35). The manager shuffles indices, preloads the next game during the switch screen, and
shortens time as the run goes on: `factor = base^(-played) * (1 - converge) + converge` with base 1.1 and floor 0.5
(`framework/game_manager.gd` 109–150). Input is restricted to five actions so every game works on any device (README 18).
The toast microgame: hold to charge 0..1 over 1 s while "time toasted" rises; a blink animation starts at 0.75 s and runs
4 x faster from 1.5 s; release pops the toast with an impulse proportional to the charge and a camera tremor of the same
size; toastedness drives a shader parameter and the smoke colour from transparent to white to dark grey
(`microgames/toast/toaster.gd` 6–43, 62–101; `microgames/toast/toast.gd` 9–23). We drop the timer and lives; we keep "one
contract, one list" and "hold, watch the food change, release".

### 3.7 lokitha-muni/TeluguCookingGame — MIT; the minimum, and a warning
https://github.com/lokitha-muni/TeluguCookingGame — 1 star, Pygame. A `MiniGame` base with `handle_event / update / draw /
is_completed` (`src/mini_games.py` 4–18).
- Chopping: three squares, one lit; a click on the lit one counts and a new one lights; 10 hits; the lit square also
  moves every 60 frames (20–48).
- Mixing: while dragging inside the bowl rectangle, compare the angle from the centre with the previous one; count a mix
  when it changed by more than 10 degrees in the wanted direction; 15 counts (75–117).
- Serving: drag a food rectangle from the pot; done when the plate rectangle contains it (143–170).
- **Warning:** `Recipe(name, ingredients, instructions)` is three strings (`src/recipe.py`), and every dish runs the same
  chop -> mix -> serve chain (`src/main.py` 280–331). Different names over identical play is the "wrapper" feeling.

### 3.8 ashleyleal/cooking-papa — no licence; two mechanics, many dishes
https://github.com/ashleyleal/cooking-papa — Pygame school project "inspired by" a commercial cooking series. Three dishes,
three steps each, built from two parameterised functions: `slice(...)` (six slice buttons appear one after another, a
bottom and a top one for each of three cut positions, and a line is drawn when a pair is done, while an arrow crosses a
time bar; how far the arrow got gives 1–3 stars) and `timed_cooking(...)` (an arrow crosses a 135 px bar; the
picture is raw up to 40, cooked up to 90, burned beyond; best band 50–80; the stop button drifts and bounces off the
edges) (`states/gameplay.py` 315–345, 544–646, 655–735). Lesson: the same function with different pictures and positions
is fine, but only if dishes use *different sequences*; here they do (cook-cut-assemble, cut-coat-fry, cut-cut-stew).

### 3.9 lewdev/burger-builder — MIT; food drawn from a table
https://github.com/lewdev/burger-builder — 1 star, vanilla JS + canvas, "compatible across nearly any resolution". MIT,
"Copyright (c) 2020 Lewis Nakao". Each part is a row `{w, h, rounded: top | bottom | both, color, radius}` in abstract
units (bun 50 x 8, patty 48 x 8, lettuce 48 x 3 ...) (`src/js/burgerData.js` 4–26); a burger is an ordered list of part
names; `draw(list, x, y, scale, unitSize)` stacks them (`src/js/Burger.js` 5–23). The order ticket is the *same draw
function at scale 0.55* above the work area (`src/js/screens/ScreenGame.js` 10–15). Lesson for us: recipe-book thumbnails,
the "what you are making" preview and the table dish should all be one dish-art function at different scales and states.

### 3.10 ChrisLee2C/Takoyaki — no licence; a Flash classic rebuilt
https://github.com/ChrisLee2C/Takoyaki — Unity. README: "a mimicry of the Flash Takoyaki cooking game". Click a hollow to
pour (1 s pour animation), each piece then cooks on its own meter that advances at a random speed every frame, with four
pictures (raw below 50, rare to 100, cooked to 150, overcooked beyond); a cooked piece can be dragged to a box; a full box
is clicked to serve (`Assets/Scripts/Takoyaki.cs` 27, 42–49, 110–146; README steps 1–5). Lesson: a *griddle of many small
pieces at slightly different speeds* is lively and readable. **The dish itself is octopus: never use it; the mechanic
transfers to any small griddle food.**

### 3.11 Shorter notes
- **navignaw/TooManyChefs** (53 stars, no licence): "A recipe is a list of json steps"; step fields `type` (`mash` with
  `mashCount`, `ingredients` pick lists, plain waits), `timer`, `onProgress`, `onTimeout`, `onPressSound`; more than a
  dozen recipe files (by the file list) reuse this shape; I read one (`js/recipes/FriedRice.js` 15–74).
- **pderyuga/octopied-game** (MIT, "Copyright (c) 2025 Polina Deryuga"): "A cozy ... game where you play as an octopus
  chef baking pies"; only the filling minigame exists. The arm tip eases to the pointer with factor `8 * dt` capped at 1
  (`tentacle.py` 38–45, `constants.py` 28); `MinigameBase` = start / update / draw / score / summary with a duration
  (`minigame_base.py` 4–46).
- **gheja/js13k2022** (MIT, "Copyright (c) 2022 Gabor Heja"): a recipe is `{containerType, ingredients, seasoning}` and its
  instruction sheet is generated from that data; finished recipe cards turn greyscale (`src/game_object_recipe.ts` 10–21,
  23–101).
- **Metajake/hibachi** (no licence): four actions (add food, turn, trick, serve) each bound to a beat division; a press is
  graded by distance from the beat; icons slide and flash on the beat (`assets/js/inputConductor.js` 8–21, 25–78, 79–101).
- **jamescasia/Picnic-Panic** (no licence): 16 food units in a grid, tap arcade with combos; pump 140 % in 0.1 s and back
  in 0.3 s, skew shake of up to 16 degrees for 0.1 s (`assets/Script/unit.js` 149–160, 336).
- **yamin-ohmar/pixel-egg** (no licence): pixel shapes from 2–5 stacked rectangles; the cooked egg on the plate is the
  same `drawEgg(colour, x, y)` call as in the pan with new coordinates (`index.html` 161–198, 267–285).
- **fernjager/game-off-2013** (GPL-3.0 code): three layers (skin, body, core) read their temperature from a sphere heat
  model each tick and accumulate "water lost", which sets each layer's condition (`js/model.js` 1–66). Idea only: outside
  and inside can be two separate readable states.

---

## 4. Gesture cookbook (numbers in one place)

"Units" are the source's world units. Conversion to ours is my estimate from the sources' own physical hint (110 units is
"about 7 mm"; KP's 36 px tolerance on a 1280-wide tablet layout is about the same): **about 7 mm = about 26 CSS px = about 10
art px at 360 CSS px wide.**

| Gesture | Recogniser (own words) | Source numbers | Suggested for our 144 x 160 stage | Source |
|---|---|---|---|---|
| Stir / whisk | sum of wrapped angle deltas around the bowl centre; ignore inside 12 % of the radius, beyond 1.25 x the outer radius, and jumps over 90 degrees | 4 turns; tap = 1/8 turn; sound every 1.2 rad | 3 turns, either way; 3 batter pictures | KP `src/ui/Gestures.js` 114–153, `src/steps/whisk.js` 13–23, 86–96 |
| Stir (free) | sum of finger travel near the bowl | 4200 units, about 6 dish widths, "2-3 laps" | fallback if angle feels strict | KCG `src/steps/StirStep.ts` 107–117, 181–199 |
| Cut | front along a line; move must be within band and within 35 degrees; resume allowed | band max(110 units, 17 % of dish); finish at 80 %; 6 cuts per vegetable | band +/- 10 art px; 2–4 cuts | KCG `src/steps/lineCut.ts` 55–70; tuning.ts 68–80 |
| Cut (simple) | judge the stroke on release | length >= min(90 px, 60 % of food); within 36 px; wander <= 57.6 px; tap within 70 px | tap fallback | KP `src/steps/cut.js` 114–136 |
| Press / knead | one pointer-down on the food = one press | 4 per stage, 3 stage changes; pad 70 units | 3 per stage, 3 pictures | KCG `src/steps/PressStep.ts` 91–110, 163–178 |
| Crack | drag or tap to the rim -> knock -> tap to open | 200 ms + 90 ms knock; 320 ms yolk fall | same beats, pixel shell halves | KP `src/steps/crack.js` 63–112 |
| Pour | time with the lip over the target; pauses when away | 2.8 s (can), 1.3–2.5 s (small); or 0.4 fill per second, tap = 0.25 | 1.5–2.5 s; tap = a quarter | KCG tuning.ts 87, 110–126; KP `src/steps/pour.js` 24–28 |
| Hold to fill | gauge rises while held; release anywhere above the cancel point | full in 1.05 s; cancel < 0.12; sweet 0.60–0.84 | ladle, scoop | ice-morimori `src/game/Counter.js` 27, 276–291, 485–488 |
| Spread | grid coverage under a brush; auto-fill the rest | cell R/9; brush 0.42 R; done at 78 % (KP 85 %) | done at 75–80 % | KCG `src/steps/SpreadStep.ts` 48–128; KP `src/steps/coverage.js` 24–26 |
| Sprinkle | pieces per travel, counted | 4 on touch + 1 per 50 units; 55 pieces | 12–20 pieces | KCG `src/steps/SprinkleStep.ts` 73–93 |
| Roll / rub / grate | finger travel on the thing | 6 dough widths; 4200 units, sideways a third | 4–5 widths | KCG `src/steps/RollStep.ts` 94–111, `src/steps/GrateStep.ts` 105–118 |
| Flip | swipe up, any length over a small minimum, starting on or near the pan | >= 90 units; start within 1.35 pan radii | >= 10 art px upward | KCG `src/steps/FlipStep.ts` 17–18, 119–135 |
| Swipe across | horizontal travel over min(90 px, 45 % of the box); tap also counts | | levelling, wiping | KP `src/ui/Gestures.js` 159–176 |
| Place / transfer | drag to a target (accepts 40 px beyond its box) or tap item then tap target | drag threshold 10 px; home slide 220 ms | pad 8–10 art px | KP `src/ui/Gestures.js` 6–108 |
| Heat | 3–4 knob positions; doneness rate 1 / 1.8 / 0.35 / 0.15 | 10 s per cook; action window 5 s | 6–8 s; food waits at done | KP `src/steps/cook.js` 142–173 |
| Feed | release with finger or piece near the mouth | accept 320 units; "expect" face at 650–700; chew 1.05 s | table scene | KCG `src/steps/ShareStep.ts` 35–38, `src/steps/FeedStep.ts` 78–93 |

---

## 5. Touch input on phones (what the code actually does)

- **First finger owns the step.** KCG allows 3 touch slots "so a resting palm can't take the only slot", and the first
  finger down owns the gesture until it lifts; other fingers are ignored (KCG `src/main.ts` 46–48; `src/steps/Step.ts` 83–84,
  431–441). We should track one `pointerId` per gesture and ignore the rest.
- **Dead zones.** A press may not *start* in the bottom 8 % of the screen (palm) or the outer 4 % at each side (thumbs),
  nor on a button (KCG `src/core/layout.ts` 15–17, 53–56; Step.ts 436–437). Those numbers are for a landscape tablet held in
  two hands; for our one-hand portrait phone the bottom strip is where the thumb works, so only the idea transfers:
  **decide where a gesture may start**, and keep the system-gesture edges (bottom home bar, side back-swipe) clear.
- **Lost touches are cancels, not drops.** Release outside the canvas or `pointercancel` calls the up handler with
  `cancelled = true`: whatever was held goes home gently and no miss is counted (Step.ts 450–461). Rotating the device
  mid-drag does the same through `cancelGesture()` (465–475; RecipeScene.ts 101–107).
- **Browser gestures blocked** with non-passive listeners: `touchmove`, Safari `gesturestart`, `dblclick`, `contextmenu`,
  `selectstart`, and a second finger's `touchstart` (KCG `src/core/device.ts` 10–28). Background tab: pause the game and
  hold audio; resume audio on the next touch (66–84).
- **A resting finger is not "idle".** While a finger is down and no hint is showing, the idle clock does not run
  (Step.ts 233–234).
- **Tap versus drag.** KP: under 10 px of movement is a tap for items, under 12 px for strokes and circles
  (KP `src/ui/Gestures.js` 26, 149; `src/steps/cut.js` 123). KCG: under 10 units moved without a cut is a tap that only
  wiggles the food (KCG `src/steps/ChopStep.ts` 132).
- **Keep the tool visible.** The shaker floats above the finger (KCG `src/steps/SprinkleStep.ts` 105–109); the knife is
  drawn offset from the touch point (KP `src/steps/cut.js` 43–48); a held knife is kept low enough that its handle stays on
  screen (KCG `src/steps/ChopStep.ts` 230–231).
- **Stuck inputs.** ice-morimori releases every held action on `blur`, `pagehide` and when the tab is hidden
  (`src/core/Input.js` 88–92).
- **Haptics.** In the files I downloaded, only pancake_shop calls the vibration API: 10 ms on the flip (`index.html`
  739–741). (Picnic-Panic's `vibrate()` is a visual shake.) Our short haptics are already ahead; tie them to the same
  events as the sparkles.
- **Multi-touch gestures** (pinch, two-finger rotate): none of the step files I read uses one. Every cooking gesture is
  one finger.

---

## 6. Fitting this to our rules

| Our rule | What the sources show | Consequence |
|---|---|---|
| No visible words in the kitchen | KCG is fully text-free: voice lines + ghost hand + pictures; KP relies on text | Follow KCG: each step needs (a) an obvious tool in a resting place, (b) a ghost-hand demo, (c) state shown in the food. No instruction line. |
| No fail, no score, no countdown | KCG: counters only rise; help after idle. KP: never fails but scores stars and uses a 5 s window | Use KCG's contract. From KP take motions and state, and turn each "window" into "the food waits". |
| Deterministic, DOM-free simulation | Recognisers are sums and thresholds; ice-morimori and homemade keep rules in pure functions that emit outcomes | Each step kind = a reducer `(state, input) -> state + events`; idle clock in the sim; fixed-step `tick(dt)`. |
| Art is code | KP draws food procedurally from doneness `p`, a seed and flip count (KP `src/steps/cook.js` 175–181); burger-builder from a parts table; homemade from a `look` descriptor | One dish-art function per dish with parameters `{stage, p, seed, pieces}` used in kitchen, book and table. |
| Remove the step strip | KCG: no bars or dots at all. KP: dots | Drop the strip; if any progress cue is wanted, make it the recipe card's ingredient pictures ticking off inside the book, not a HUD. |
| Cook -> serve -> eat must connect | KCG: handoff map, one Dish object, share / feed / photo as steps. KP: bench state, transfer and plate steps | End the kitchen on plating; carry the same dish object (same seed, same cut pattern) to the table. |

**A dish as data, in our own shape (illustration only; which dishes we ship is another lane's decision):**
```
pan-fried pancake-like dish, 9 rows:
  place   flour scoop  -> bowl                      (drag or tap)
  pour    water jug    -> bowl, 1.8 s               (hold over; pauses when away)
  crack   1 egg        -> bowl                      (knock, then open)
  stir    3 turns, pictures: lumpy -> streaky -> smooth
  cut     greens, 3 cuts, front model               (slices pile up)
  place   greens pile  -> bowl; stir 1 turn         (bowl "un-mixes" when something is added)
  heat    knob on; pour batter 2 s; wait for bubbles; flip (swipe up); second side
  plate   slide to the plate (drag); cut a cross (2 strokes); sauce dish placed beside
  serve   ta-da -> the one end button: carry to the table and call the octopus
```
Seven different motions in about 60–90 s, every one a rising counter, every state visible in the food.

---

## 7. Do not use / cautions

- `liolu/cooking-mama-decomp` (shows a CC0 label) is a decompilation of a commercial game. Its label does not make the
  original game's code or content free. **Do not open or use it.** (Seen in search results only; not opened.)
- `Prakritiswaroop/Sugar-Spice---Kitchen-Dreams`: the folder is named after a commercial character. Skipped.
- Kitchen Passport's art, music and branding are all rights reserved even though the code is MIT.
- The Flash-game remake (3.10) reproduces a commercial Flash game "according to my vague memory"; treat it as a
  description of a mechanic only, and its dish is one we must never show.
- cooking-papa and octopied-game describe themselves by a commercial series' name; that name must never appear in our
  game or on any public page of it (it appears in this report only inside the search log).
- No web page or file I opened contained instructions aimed at an automated reader. (The search tool appends its own
  reminder to cite sources; that is the tool, not a page.)

## 8. Credits to add if we ship ideas from these (courtesy; we copy no code)

Kitchen Passport (Decoupled Lane Studio, MIT) · Homemade (Quang, MIT) · Ice Mori-Mori (たぬ, MIT) · Häckerspiele
(KIT GameJam, MIT) · Telugu Cooking Game (MIT) · burger-builder (Lewis Nakao, MIT) · Cooking for Skully (Gabor Heja, MIT) ·
Octopied! (Polina Deryuga, MIT). The unlicensed sources (kids-cooking-game, pancake_shop, cooking-papa, the Flash remake,
TooManyChefs, hibachi, Picnic-Panic, pixel-egg) gave principles only and should be listed, if at all, as "studied", not
as code sources.

## 9. Leads not opened (all unverified)

- `kanghwani/takoyaki` (no licence; described as vanilla JS, zero dependencies, no build; a rhythm food-stall game) and
  `opensquilw/cook-with-me-app` (no licence; a home-cooking PWA with a minigame centre): repository metadata only.
- From web search result snippets, not opened: `Platane/js13k-2018` (sushi kitchen, no licence per API), a SourceForge
  student project where you drag ingredients, chop fruit, turn on the pan and stir, `Sedomanai/LD51`,
  `ataboo/godot-recipe-game`, `FigyTuna/HotPotPanic`, a Godot cooking game on tangled.org, itch.io jam pages for
  chop / stir / sear games without linked source.
- GitLab and Codeberg were not searched (time box).

## 10. Search log

Counts for this run: 131 source files fetched, about 100 of them read in whole or in part (the other 30 or so were
downloaded but not read, and nothing here cites them), 21 repository file lists (2 more were refused: see below), 28 calls to the GitHub repository search API, 3 web searches. Could not open: `github.com` HTML pages (blocked
here; raw files and jsDelivr lists were used instead); the jsDelivr file lists of `yonatan1feldman-prog/kids-cooking-game`
and `wangzhao2612/Kitchen-Chaos` (HTTP 403, "Package size exceeded the configured limit of 50 MB"), so the first was read
file by file from its imports without a complete file list and the second was not examined.

GitHub repository search (24 queries, plus 4 metadata look-ups by `repo:`): `cooking game language:javascript` ·
`cooking minigame` · `kitchen game html5` · `recipe game phaser` · `cooking simulator javascript` · `chef game canvas` ·
`cooking game godot` · `cooking game pygame` · `microgame collection` · `sushi game javascript` · `pancake game` ·
`burger game javascript` · `pizza game canvas` · `bartender game` · `topic:cooking-game` · `cooking mama clone` ·
`cooking mama` · `warioware clone` · `cooking game phaser` · `ramen game` · `baking game javascript` ·
`potion brewing game stir` · `cooking game touch mobile html5 canvas` (0 results) · `cooking game love2d`.
Web search (3): open-source canvas cooking game with stir and chop gestures; js13k cooking entries with source; Ludum Dare
/ Godot cooking minigames with source.
A scratch folder for this lane already held notes from an earlier, interrupted run of the same lane; it pointed me to
Kitchen Passport and Octopied. I re-opened every file I cite from those two myself; nothing in this report rests on those
notes alone.

## 11. Open questions (for the lead and the owner)

1. **Length of one dish.** KCG aims at 4–5 minutes and 14–17 steps for a five-year-old on a tablet; KP at 7–15 steps. For
   a side activity on a phone I would guess 6–9 steps and 60–90 s. Is that the intent, or should a dish be a longer sit?
2. **Who helps when the player idles?** A neutral ghost hand, or the octopus's arm doing one unit of the work? The second
   is charming and fits the octopus-chef sticker already in the kitchen, but it shows the octopus acting; it needs a ruling
   under the honest-AI-character rule.
3. **Feeding by hand.** KCG's best moment is dragging each piece to a mouth. With our rule that a labelled demo rule
   decides whether the octopus eats, may the player *offer* a piece by dragging, with the rule deciding the answer? Or
   must eating stay automatic after "call"?
4. **Any optional precision?** The sources keep a soft "sweet band" (hold-to-fill, pour line, heat band) that changes
   only the sparkle. Is even a picture-only "extra nice" result acceptable under "no score", or should every result be
   identical?
5. **Replay growth.** Is it wanted that the 3rd and 5th time a dish is cooked it asks for one more cut or press (KCG), or
   that the book stamps mastery at 1 / 3 / 5 / 10 (homemade)?
6. **Stir recogniser choice.** Angle sum (feels like stirring, needs a centre) versus travel sum (anything counts). I
   recommend angle with a tap fallback; it needs a quick thumb test at 320 x 568.
7. **Sound.** Both big sources lean on sound for "juice" (rising scale, sizzle, chop). With sound off by default, which
   three or four cues deserve a haptic and a sticker so the silent game still answers every touch?

## 12. Sceptic's pass (what I am and am not sure of)

- Verified by opening the file: every line range in sections 0–6 for KP, KCG, homemade, ice-morimori, pancake_shop,
  Hackerspiele, Telugu, cooking-papa, burger-builder, the Flash remake, and the short notes in 3.11.
- Read only in part: KP `pour.js`, `coverage.js`, `plate.js`, `transfer.js` (headers and constants only);
  KP `RecipeBookScene.js` (lines 11, 103–128, 184–229 by search, not end to end: I did **not** confirm how locked recipes
  look there); KCG `BakeStep`, `OpenPourStep`, `ShareStep`, `FeedStep`, `ChooseStep`, `PhotoStep`, `Dish` (class comments
  and constants, plus FeedStep 78–93); KCG `types.ts` was downloaded but not read line by line.
- Not read: KP `docs/mechanics.md` lines 71–261 and 346–544 (so its own sections on whisk, cut and cook are described
  here from the code instead); KP `measure.js` and `bake.js` (never fetched); KP `StepUI.js`, `SoundSystem.js`, `Fx.js`
  (fetched, not read).
- Stars for `ChrisLee2C/Takoyaki` and `fernjager/game-off-2013` were not returned by the search API: unverified.
- "Only pancake_shop uses haptics" and "no multi-touch gesture" are statements about the files I downloaded (about 130),
  not about every file of every repository.
- "Phaser 4", "React 19", "Phaser 3.80.1" are the READMEs' own statements.
- All unit conversions to our stage (art px, CSS px, millimetres) are my arithmetic, not source facts, and need a
  finger test on a real phone.
- Timings quoted for KCG are tuned for a five-year-old on a tablet; ours should be shorter. Treat them as upper bounds.
