# 01 — Genre mechanics: how cooking games turn a dish into small hands-on steps

Round 7 research, agent 1 (2026-11-21). Scope: browser/Flash-era cooking games, the best-known touch cooking minigame
series, and wordless touch kitchens for small children. Principles only; nothing here is to be copied.

Reading guide: tags like [F1] point to the source list in section 9 (every tagged page was actually opened).
"(I)" = my inference, not stated in a source. "(unverified)" = I could not open the page; the line comes from a
search-result summary or from memory. Step statistics are my own counts from two recipe lists ([G1], [F3]).

Names behind the short labels used below (reference only; no name, character, art, layout or level may be reused):
"the 2006 game" = Cooking Mama (DS); "second DS game" = Cooking Mama 2: Dinner with Friends; "Wii spin-off" = Cooking
Mama: Cook Off; "3DS entry (2014)" = Cooking Mama 5: Bon Appetit!; "phone game" = Cooking Mama: Let's Cook!; "sweets
spin-off" = Cooking Mama: Sweet Shop; "Flash restaurant series" = Flipline Studios' Papa's Pizzeria (2007) and its
successors (Pancakeria, Cupcakeria, Donuteria, Wingeria, Cheeseria); "PC series" = Cooking Academy 1 and 3; "kids'
kitchens" = Toca Kitchen, Toca Kitchen 2, Toca Kitchen Sushi, Dr. Panda Restaurant 1 and 2; "microgames" = WarioWare.

## 0. What changes the build (read this first)

1. **A dish is six short, different steps, not two or three repeated ones.** In the series' phone game, all 138 recipes
   I parsed have exactly 6 steps, and only 4 of the 138 repeat a step inside one dish [F3]. The 2006 original averaged
   at least 5.3 listed steps [G1]; later console entries run longer (a 10-step dish in the 2014 one [F7]), so six is
   the phone-sized grain. Each step "usually lasts less than 10 seconds" [W1]; no recipe took more than two or three
   minutes [R1]. Ours: 2 to 3 steps per dish, from 3 step kinds.
2. **We use 3 of the genre's 8 gesture families** (tap, timed flip, guided slice). Missing: circle (stir, wash, roll),
   back-and-forth stroke (grate, whisk, knead), hold-and-release (pour, squeeze), keep-in-zone (heat, stir speed),
   drag-and-place (add, top, plate). Section 1.1.
3. **"Only the wrapper" has a known cause and cure.** The developers of a long-running Flash restaurant series
   wrote that they were "always disappointed with food games where you click a button" and the food finishes itself;
   their answer was that every task is hands-on and involves either a little skill or a little arrangement [P1]. The
   reviewers who called cooking minigames shallow named: the same few steps repeated, steps that are quizzes or
   settings instead of actions, and "no actual food on offer at the end" [R1][R4][R7].
4. **Order is stable: prepare, combine, heat, finish.** By position in the phone game's 6 steps: step 1 is preparation
   in 66% of dishes, steps 3 to 5 are mostly combining, heat appears mainly in steps 4 to 6, and the last step is heat
   (42%) or finishing/plating (29%) [F3]. 43% of dishes have exactly one heat step; 14% have none.
5. **Waiting is never passive.** Heat steps are either a keep-in-zone task, a short command rhythm, or a few seconds of
   visible change that the player ends with their own action (flip at halfway, lift when covered, take off at the
   colour band) [F1][P4][R8].
6. **Without score or failure, consequence lives in the food.** The strongest wordless pattern: "the food appears in
   the dish just the way they prepared it" [K7]; too much batter overflows in the oven later [P4]; a middling result
   is shown as "the meal looking less than appetizing" [F4]. Plus reactions of whoever eats [K5][K6], and collection.
7. **Teaching is done on the food:** guide lines to trace, arrows from a round end to a tip, a utensil outline to follow
   at the right speed, a dotted preview of the cut [R8][R9][P1][F4]. When the player is stuck the helper fixes the step
   and the recipe moves on [W1][R5]. One real finding against us: in wordless kids' kitchens the hard part is not the
   gesture but the chain of screens ("tap here, then there, then do that, then drag") [K2].
8. **The dish must go to someone.** Tasting by a named character, feeding, or carrying to the table follows the
   cooking in the second DS game, the phone game and every kids' kitchen I read about [W2][F2][K5][K7][F7]. The first
   game had none of it and drew the "no actual food on offer at the end" complaint [R1].

## 1. Catalogue of cooking verbs as micro-interactions

### 1.1 Eight gesture families (the real building blocks)

Derived from about 100 action entries on [F1] plus the station pages [P4]. Caveat: [F1] documents the 3DS alternative
controls (circle pad, shoulder buttons, tilt, microphone), so it tells us which *motion* each verb maps to; the touch
form in column 2 is my translation (I), cross-checked with reviews where they describe the stylus version.

| # | Family | One-thumb touch form (I) | Verbs that use it (sources) | In our kitchen today |
|---|---|---|---|---|
| A | Circle | Draw circles on or around the food | stir, mix, wash rice, grind, roll into a ball, spin-dry [F1] | no |
| B | Back-and-forth stroke | Rub left-right or up-down | grate, whisk, knead, shake the pan, peel a husk, pull a cork [F1] | no |
| C | One directed stroke | Swipe along a line or arrow | slice on lines [W1][R2], peel a strip, push a skewer, flip, lift a lid [F1][P1] | yes (slice, flip) |
| D | Tap / alternating taps | Tap, or tap left-right in turn | chop [R4], sift, pound, shaker, stomp-knead [F1] | yes (tap marks) |
| E | Hold and release | Press, watch it fill, let go | pour batter [P4], squeeze, condiments, released "once the desired amount is reached" [F1] | no |
| F | Act at the right moment | One tap or swipe when the food shows it is ready | flip at halfway [P4], lift out when coated or done [F1], pit a cherry when aligned [F1] | partly (flip) |
| G | Keep a marker in a zone | Hold or drag to stay inside a band | popcorn pot "within the blue area", oven temperature, stir speed, yolk gap [F1][R9][R5] | no |
| H | Drag and place | Drag pieces to where you want them | add ingredients, toppings [P1], plate and rotate [K6], thread a skewer [F1] | no |

### 1.2 Verb table

"Sec" is my target length for our build, not a sourced figure. Basis: under 10 s per minigame [W1]; 4 s for a
single-verb microgame [M1]; about 95 to 100 s per recipe in the 2006 game (76 recipes in "a little over two hours" [R1]).

| Verb | Input gesture in the cited games | What the screen shows; how progress shows | Ends when | Sec | What makes it satisfying | Examples |
|---|---|---|---|---|---|---|
| Wash (rice, vegetables) | Three beats: water on, circle to wash, tilt to drain [F1] | Bowl with water; grains swirl; water clouds then clears (I) | Water drained [F1] | 6-9 | Swirl with inertia; colour change. Spilled rice is simply replaced by the helper [R5] | "Wash the rice!" [F1]; 7 recipes in the 2006 game [G1] |
| Peel | Stroke one side, then rotate the item and repeat [F1]; hot potato: pull back four corners while the holding hand reddens [R4]; corn husk: strokes until a gauge fills [F1] | Skin comes off in strips; the bare area is the progress bar (I) | All sides bare | 5-8 | Long strip in one stroke; new colour revealed | Peeler steps [F1]; hot-potato peel [R4]. A peeler line from StrategyWiki (unverified) |
| Chop / mince | Rapid taps [R4]; or two inputs in alternation (mezzaluna) [F1] | Knife advances one cut per tap (I); uncut length left | Whole item cut | 3-6 | One tap = one cut = one sound. For one reviewer the knife tasks were the only satisfying ones [R4]; another praised the chop sounds [R1] | "Chop up" is the most common step: 46 of 404 slots [G1] |
| Slice on lines | Draw parallel strokes along guide lines [W1][R2]; or drag to preview a dotted line, release to cut [P1][P4] | Guide lines on the food; pieces part with a gap | Last line cut | 4-7 | Pieces separate; evenness is what gets graded [P4] and it stays visible on the food (I) | Pizza cutting [P1]; "slice up" 26 slots [G1] |
| Free cutting | Swipe across the food freely (I); a kids' kitchen board "works much like Fruit Ninja" [K4] | Food splits where swiped | Player moves on | 3-8 | Total freedom; no wrong cut. A reviewer wanted more than four pieces [K5] | Kids' kitchen sequel [K4] |
| Cut out shapes | Press a cutter into rolled dough or a slice (step names only) [F3] | Shape lifts out (I) | Sheet used up (I) | 4-6 | Stamp feel; identical cute pieces | "Shape it with the cutter!", "Cut them into stars!" [F3] |
| Crack an egg | Two beats: knock to crack, then pull apart to open [F1] | Egg over a bowl; crack grows (I); yolk drops | Yolk in bowl | 3-5 | Escalating crack then the drop | "Break an egg" 11 slots [G1]; [R3]. "Tap each egg three times" (unverified, speedrun guide) |
| Separate the yolk | Slide one half-shell toward the other and hold the right gap: too close keeps the white, too far drops the yolk [R5] | Two half-shells, white dripping | White has dripped out | 5-8 | A tiny balance skill; called "particularly clever" [R5] | Egg separating [R5][W2] |
| Pour | Press and hold, release at the right level [P4]; tilt, and not too fast [F1] | Level rises in the container; a too-fast pour pushes a meter into red and makes a mess [P5] | Release; told under, perfect or over [P4] | 3-6 | Tension of the last drop; consequence shows later (overflow or flat cake) [P4] | Batter station [P4]; "Pour it!" 9 recipes [F3] |
| Measure / weigh | Add until the mark; hold and release "once the desired amount is reached" [F1] | Scale or level | Amount set | 3-5 | Weak verb unless the amount matters later. Criticised when the target is hidden: "you have to guess the ratio" [R4] | "Measure and add" 16 slots [G1] |
| Add the ingredients | Pick the item matching a silhouette [R8]; or add on the beat [W1] | Obscured picture of the next item [R8] | All added | 4-8 | Low: "little joy" in adding items as they appear [R4]. Better as drag-and-drop with a splash (I) | 26 slots each in [G1] and 22 in [F3] |
| Stir / mix | Circle, either direction [F1]; follow a utensil outline "at just the right speed" [R9]; spilling is the blunder [W2] | Bowl or pot from above; colours blend | Mixture uniform (I) | 5-8 | The mixture visibly changes under the finger | "Mix it!" [F1]. "Don't stir too fast or it'll spill" (unverified, StrategyWiki) |
| Whisk / beat | Fast strokes back and forth in the indicated direction [F1]; hand mixer: low speed first, then high [F1] | Liquid foams, rises (I) | Foamy | 4-6 | Speed and froth | "Mix it up!" [F1]; "beat an egg" [G1] |
| Knead | Strokes following arrows [F1]; trace lines "from rounded edge to arrow tip" [R8]; up-down strokes, then drop the dough [F1] | Dough folds and smooths; a gauge fills (unverified, StrategyWiki) | Dough smooth / gauge full | 6-9 | Squash and rebound. Needs arrows even in the no-help mode [F4] | 12 slots [G1]; 13 recipes [F3] |
| Roll out dough | Rolling pin strokes (I); one Flash series rolls automatically after a drag [P4] | Dough widens toward an outline (I) | Fills the outline (I) | 4-6 | Shape grows under the pin | "Roll the dough!" 10 recipes [F3] |
| Shape by hand | Take a portion, then circle to round it [F1]; rub left-right to form a patty [F1] | Lump becomes a ball or patty | Shape reached | 4-7 | The silhouette of the dish appears here | "Roll it into a ball!" [F1][F7]; "make rice balls" [G1] |
| Season / sprinkle | One press per shake, left or right shaker [F1]; shake sauces and powders on freely at any time [K6] | Grains land where shaken | Player stops | 2-5 | Free amount; the helper gently shakes its head at too much spice [K7] | Shakers [F1]; kids' kitchens [K6][K7] |
| Spread | Rub to cover a surface [F1] | Covered area grows | Surface covered | 4-6 | Painting; amount and centring are what gets graded [P5] | "Spread it!" 9 recipes [F3] |
| Fry / saute | Act when a command reaches a line: add, stir, change heat [R8][W1]; heat slider [R3]; shake the pan up and down [F1] | Pan from above; food colours; commands scroll | Sequence done | 8-12 | Sizzle; colour change [K1] | "Saute" 32 slots [G1]; "Stir fry it!" 33 recipes [F3] |
| Flip | When the food shows halfway, one flip; take off when both sides are done [P4] | Underside colour is revealed | Landed | 2-4 | The reveal of the cooked side; a reviewer missed it where absent [K5] | Pancake station [P4]; our current flip |
| Deep-fry | Drop in; wait until a meter reaches the mark; lift out [P4][F1] | Bubbles; colour; meter on the basket handle [P4] | Lifted out | 5-8 | Lift at the right colour | Fry station [P4]; "deep fry" 11 slots [G1] |
| Simmer / boil | Stir "as much as the hint requests" when asked [F1]; skim scum before it overflows [F1]; blow to calm the pot [R4] | Pot; bubbles; food changes (pasta floats, fish browns) [K7] | Cooked; ladled out [F1] | 8-12 | Small interruptions to react to | "Stew" 17 slots [G1]; "Boil it!" 38 recipes [F3] |
| Grill | Fan the coals; short bursts speed it up, too much burns [F1]; doneness as colour bands (rare, medium, well) [P4] | Coals glow; grill marks (I) | Taken off at the chosen band | 6-10 | Choosing your doneness | Grill station [P4]; charcoal steps [F1][G1] |
| Bake / timer | Open and close the oven [F1]; take out in time [P3] | Oven window (I) | Taken out | 3-6 | Weakest verb when it is only a setting: "little joy in setting an oven timer" [R4] | "Bake in the oven!" is the most common last step, 17 of 138 [F3] |
| Grate | Rub left-right; a second motion unclogs the grater [F1] | Item shortens; pile grows (I) | Item used up | 4-6 | Fast rubbing with instant shavings; singled out as a highlight [R4] | "Grate it!" [F1]; 12 recipes [F3] |
| Mash / pound | Hit the spots marked by a hovering shadow [R8]; press to bring the mallet down [F1] | Lumps flatten | Smooth | 4-6 | Heavy thump | "Pound the mochi!" [F1]; "mash some potatoes" [G1] |
| Wrap / fold / roll up | Trace arrows and tap marked spots [R8]; repeated same-direction strokes wind dough round a cone [F1] | Sheet folds along the arrows | Closed | 5-8 | A flat thing becomes the dish's shape | "Fold the dumplings", "roll the sushi" [G1]; "Wrap it in the leaf!" [F7] |
| Skewer | Choose left, centre or right piece to thread [F1]; push the skewer forward [F1] | Pieces line up on the stick | Stick full | 4-7 | Building a pattern piece by piece | "Put them on a skewer!" [F3][F7] |
| Brush / glaze / dip | Dip and lift out "when it is completely covered" [F1]; brush on (step names) [F7] | Coating creeps over the food | Fully coated | 3-5 | Gloss appears | "Dip it in the sauce!" [F1]; "Spread it on with a brush!" [F7] |
| Squeeze / pipe | Hold to squeeze, release to stop [F1] | Cream or filling comes out | Player releases | 3-5 | Direct amount control | "Squeeze the cream!" [F7] |
| Plate / serve | Place and rotate food on the plate [K6]; ladle: dip, lift the right amount, pour into the bowl [F1] | Empty plate fills | Player is done | 5-10 | The picture is the player's own | "Arrange the plate": always the last step where it occurs [G1] |
| Garnish / decorate | Free placing and free drawing [G1][F7] | Toppings stay where put | Player is done | 4-10 | Ownership; no wrong answer | "Add toppings freely", "draw freely" [G1]; "Draw the face!" [F7] |
| Carry | Tilt left-right to move the plate under a stack ("Balance the pancakes!") [F1]; "Carry it to the table!" is the last step of one dish [F7] | Stack wobbles (I) | Arrives | 3-5 | Links kitchen to table | Pancake tower [F7] |

### 1.3 Verbs the reviews say to avoid or disguise

- Settings that are not actions: setting a timer [R4], rearranging a fridge so things fit [R5][R9].
- Quiz steps: recognising an ingredient from an obscured picture [R4][R8].
- Anything whose input the device reads unreliably: repeated complaints that strokes were not registered and cost a
  medal [R3][R5]; motion controls without tactile feedback [W3]. Make detection generous: one sequel was praised for
  letting the player be "in the same ballpark as perfection" [R9].

## 2. How a dish is sequenced

### 2.1 Numbers

| Game (year, device) | Steps per dish | Source |
|---|---|---|
| Original (2006, stylus) | 1 to "as many as a dozen"; my count of a fan recipe list: 1 step x2, 2 x3, 3 x4, 4 x15, 5 x11, 6 x18, 7 or more x23 (76 dishes; the list seems capped at 7 lines, see section 9) | [W1][G1] |
| Wii spin-off (2007) | "two to more than a dozen" | [W3] |
| 3DS entry (2014) | Its replay mode: "at most 6 steps", each repeatable before moving on [W4]; but the fan wiki lists a 10-step dish for the same game [F7], so the two disagree or the replay mode shortens dishes | [W4][F7] |
| Phone game (2015 on) | exactly 6 in all 138 recipes parsed | [F3] |
| Flash restaurant series (2007 on) | 4 stations per order: take order, build, cook, finish/cut | [P2][P3] |
| Kids' kitchens | free chain: pick food, one or more tools, season, feed | [K2][K6] |

- Variety inside a dish: the 2006 game repeated a step name inside 30 of 76 dishes ("slice up, slice up"); the phone
  game does so in 4 of 138 [G1][F3]. Across the whole game the pool is large (81 names over 404 slots in 2006; 186
  names over 828 slots on the phone), but five names still fill 36% of the 2006 slots, which is exactly what reviewers
  felt: "the same old chopping and grating and boiling and frying over and over" [R1].
- At least one step unique to the dish: "there's normally at least one unique minigame in each recipe" [R7]; the
  surprise steps were what kept the first game lively [R1].

### 2.2 Order (phone game, 138 dishes, my keyword classification of step names, 1 to 2% unclassified)

| Position | Prepare (cut, peel, clean, grate, sift, crack) | Combine (mix, knead, shape, wrap, season) | Heat | Finish (chill, top, serve, plate) |
|---|---|---|---|---|
| 1 | 66% | 16% | 9% | 9% |
| 2 | 54% | 24% | 16% | 4% |
| 3 | 37% | 41% | 17% | 2% |
| 4 | 28% | 38% | 25% | 8% |
| 5 | 11% | 39% | 35% | 13% |
| 6 | 6% | 22% | 42% | 29% |

Heat steps per dish: none 14%, one 43%, two 26%, three 16%. In the 2006 list the last step (dishes not cut off by the
7-line cap, n=45) is stew 9, deep fry 8, arrange the plate 6, saute 5, set the timer 4 [G1].

### 2.3 Transitions between steps

- Card style: between steps the helper shows the next instruction; the no-help mode removes these cards and runs
  "from start to finish right away" [F4][R4]. Each step ends with its own small verdict before the next begins [F4].
- Travel style: the food itself moves on. Cupcakes "slide off" to the next station [P4]; the player drags the food from
  the tool to the plate [K2][K4]. This is the wordless option and it also solves "organic connection".
- A fork: 14 of the 76 original dishes offer a point "between two minigames" where the player may switch to a
  sibling dish (curry becomes stew) [W1][G1]. Variation without failure.
- One reviewer's warning: doing one task at a time makes it "easy to lose sight of the whole picture" [R4]. Keep the
  prepared ingredients visibly waiting at the edge of the next screen (I).

### 2.4 Where waiting is used and how it is made interesting

1. Keep-in-zone: shake the pot so the marker stays in the blue area; keep oven temperature inside a gauge [F1].
2. Command rhythm: do the shown action as it crosses a line (add, stir, change heat) [R8][W1].
3. Interruptions: skim scum as it gathers; calm the pot before it boils over [F1][R4].
4. Readable doneness and a player-made ending: flip at halfway, drag off when both sides are done; colour bands
   for rare/medium/well; a meter on the fryer handle [P4].
5. Pure spectacle, kept short: in the kids' kitchens "it's really neat to watch the food brown and steam" [K1].
6. Multitasking during baking (Flash restaurant series) [P1][P3] does not fit a single-dish, no-pressure kitchen.

### 2.5 The same dish at different grain, and step lists of dishes close to ours

Step names only, to show grain and order. Not for copying; our steps and art must be our own.

| Dish (game) | Steps | Source |
|---|---|---|
| Pancake (second DS game) | 2: mix in the ingredients, flip | [F7] |
| Pancake (phone game) | 6: separate the yolk, measure, mix with the blender, cook, make the cream, squeeze the cream | [F7] |
| Pancake (sweets spin-off) | 8: break the eggs, take out the flour, sift, open the lid, pour while mixing, spread the butter, cook, draw the face | [F7] |
| Savoury pancake (phone game) | 6: grate, tear the cabbage, cut the ingredients, mix with the blender, cook, spread it | [F7] |
| Rice balls (2006 game) | 5: measure and add, measure and add, wash the rice, set the timer, make rice balls | [G1] |
| Dumpling skewer (phone game) | 6: knead, roll into a ball, boil, put them on a skewer, boil it down, put on some sauce | [F7] |
| Fruit sandwich (phone game) | 6: pull off the stems, peel, cut slices, open the can, spread, cut | [F7] |
| Sandwich (2006 game) | 4: tear lettuce, chop, cut, make a sandwich | [F7][G1] |

Our seaweed pancake today (tap, flip, slice) sits at the grain of the 2-step version in the first row. The owner's
"finer steps, like real cooking" is the move from row 1 to rows 2 to 4.

## 3. Teaching each gesture with little or no text; when the player is stuck

- Guides drawn on the food: lines to cut along [R2][F4]; arrows to trace, rounded end to tip [R8]; outline of the
  utensil's path to follow at the right speed [R9]; dotted preview of a cut before release [P1]; optional cut
  guides for 4, 6, 8 pieces [P4].
- Guides are scaffolding: the challenge mode switches them off, except for kneading, where the step cannot be read
  without arrows [F4]. So: guides on until the first success, then faded (I).
- Practice without stakes: practise a dish first [R3]; practise one chosen step [F2]; quit and retry a step without
  penalty [F4]; redo each step as often as wanted before moving on (replay mode of the 3DS entry) [W4]; replay a
  single step for a better result [R9].
- One verb at a time: the microgame format gives a one or two word command and drops the player straight into the
  action, about 4 seconds long [M1][W8]. Wordless equivalent: one tool picture plus a ghost gesture (I).
- No written instructions at all in the kids' kitchens [K3]; what trips children is the navigation chain, and parents
  were advised to help at first [K1][K2]. Lesson: one screen per step, the next thing to touch is the only moving thing.
- Train what you will ask: a Flash developer's retrospective says players were lost by the first case the training had
  not shown (multiple toppings on one pizza) [P1]. Every new gesture needs its own demonstration.
- Stuck: the helper repairs the step and the dish continues ("Mama will fix it") [W1]; even after a burnt dish the
  helper only comforts [R6]; spilled rice is replaced by a new batch [R5]; hard puzzle steps drop the timer "so
  there's no way to fail" [R9].

## 4. How the result is judged and shown; techniques that work without numbers or failure

What the genre does: medals per step and per dish (bronze, silver, gold; a cracked silver; a lead medal) [W1][W2][F5];
one to five stars [R9]; badges per customer [P2]; best medal shown beside the recipe on the selection screen [W1].

Techniques we can use with no score and no fail:

1. **The dish is the record.** Whole vegetables put in a salad arrive as whole vegetables [K7]; overfilled batter
   overflows after baking [P4]; a weak run shows a less appetising picture [F4]. Carry 2 or 3 visible traits from the
   steps into the final picture.
2. **Visible doneness as a choice, not a test:** rare/medium/well as colour bands [P4]; food "gradually browning" [K1].
3. **Neatness dimensions that are purely visual:** amount, centring, evenness, coverage, order, pouring speed. These are
   exactly what the Flash series grades [P5]; we can show them and not grade them.
4. **Reactions instead of ratings:** eaters respond in "a language-neutral way" (delight, "it's...ok", refusal,
   smoke from the ears) and that is the only feedback [K5][K6]; friends taste the dish and answer [W2][F4].
5. **Optional flourishes:** bonus stars that do not change the result but unlock items [W2][R5]; a marker for having
   discovered another way to do a step [F1]; an optional customer preference that only adds a bonus [E1].
6. **Trophies in the room:** golden utensils are "hung up in the background" of the kitchen [F6]; even a lost contest
   gives a decoration [W3].
7. **Generous detection** so that skill is felt as smoothness, not as pass/fail [R9].

## 5. Recipe selection screens (principles only)

- A cookbook or rows of dish pictures [R3][W3]. Per recipe the games show: the finished dish, the best medal so far [W1],
  a small origin flag [W3]. One PC series adds a fact about the dish before cooking [R8].
- After choosing a dish the phone game offers: make, practise one step, look at the finished dish, treat someone,
  decorate [F2]. For a three-dish, wordless book this collapses to: the page is the start button (I).
- Unlocking: 15 open at the start, 76 at the end; finishing one dish opens a related one [R4][G1]; "what sorts of dishes
  are hidden to unlock?" is a pull by itself [R2]. Forcing players through a whole locked group before the next opens
  was criticised as repetitive [R9].
- How a locked or new recipe is drawn: not described in any page I opened (open question; silhouette plus a "new"
  mark is my assumption).
- The step list belongs to the recipe page: the fan recipe list reproduces each dish's ordered steps [G1][F7].

## 6. After the dish is finished

- Hero shot: the finished meal "sitting steaming on a gingham tablecloth framed by blue curtains" [R4]; a look mode
  just to admire the dish [F2]; a photo mode was the praised part of a weak sequel [W5].
- Someone eats it: a friend tastes and reacts [W2][F4]; "Treat Others: Eat the recipe" and feeding the father figure
  give the phone game's coins [F2]; feeding and watching the reaction is the entire loop of the kids' kitchens [K2][K5].
- Serving is a step: carry it to the table [F7]; serve the guest at their table, then clear, wash up, re-lay [K8][K9].
- Decorate afterwards (stamps, drawing) [F2].
- The contrary case, quoted by a critic of the first game: "there's no actual food on offer at the end of the whole
  process, which ... makes the process of cooking an awful lot less rewarding" [R1].
- Keep the serving beat short: players of the first Flash pizzeria said the order and delivery scenes "get pretty old
  pretty fast" (reader comments in [P3]).

## 7. What made the hollow ones hollow

| Criticism | Source |
|---|---|
| The food makes itself after one click; nothing is done by hand | [P1][P3] |
| The same few steps again and again; "there aren't too many ways to cut an onion" | [R1][R7][R9][K9] |
| Dishes differ in name only: "a different meal in a jumbled order"; too little difference to "form favourites" | [R3][R1] |
| "Simply doing what you're told as quickly as possible" | [R2] |
| Steps that are settings or quizzes, not actions | [R4][R5] |
| Input not registered; no tactile feedback | [R3][R5][W3] |
| No structure, no growth, nothing to do with the result; "a straight line with a binary win state"; no creativity | [R1][E1][W5] |
| A "lack of progression and coherence between dishes"; the formula repeated without new mechanics | [W4] |
| Rewards with nowhere to go (tips that could not be spent) | [P1] |
| Losing the whole while doing the parts | [R4] |
| The screen chain, not the cooking, is the difficulty for small children | [K2] |

Seen through this list, our current kitchen has four of the eleven: few step kinds reused across dishes, dishes that
differ mostly in picture, nothing carried from the steps into the result, and the result going nowhere on its own.

## 8. Design implications for us (three dishes, no fail, no words, portrait phone)

1. **Six steps per dish, 4 to 10 s each, about 40 to 60 s of hands-on time, no step kind repeated inside a dish.** With
   transitions and the serving beat a dish takes roughly 90 s (the 2006 game averaged about 95 to 100 s per recipe [R1]).
   Across the three dishes use at least 6 of the 8 gesture families, and give every dish one signature step the other
   two do not have (shape the rice ball, thread the skewer, flip the pancake).
2. **Fixed skeleton: 2 prepare, 2 combine/shape, 1 heat, 1 finish.** Steps 1 and 2 from the knife/peel/crack group (the
   verbs reviewers liked best [R4]), steps 3 and 4 from mix/knead/shape/spread, one heat step in position 4 or 5 (a cold dish swaps it
   for chill or assemble), and the last step is always plating or garnish done by the player, so the final picture is
   their own arrangement.
3. **Extend the engine from 3 step kinds to gesture primitives.** Each primitive is a small deterministic state machine:
   input events in, progress 0..1 out, plus one or two quality traits quantised to three bands. Suggested first set:
   circle, rub, stroke-on-guide, tap, hold-and-release, hit-the-moment, keep-in-zone, drag-and-place. All reachable
   with one thumb in the lower two thirds of the screen; no two-finger, tilt or microphone input.
4. **Carry traits forward into the art.** Per dish pick 2 or 3 traits (evenness of cuts, doneness band, how the topping
   was placed) and draw the next steps and the final plate from them. Every band must still look tasty: pale-golden,
   golden, dark-crisp; never a spoiled dish. This replaces score and makes skill visible.
5. **Heat is active and reads from the food.** Either a flame the thumb keeps inside a band, or 3 to 5 s of visible
   change (same silhouette, three colours) that the player ends by flipping or lifting. No countdown. The "ready"
   window is wide and the food holds at the darkest tasty band, so nobody can burn it.
6. **Teach on the food, in three stages.** At step start a ghost hand performs the gesture once on the real food
   (about 1 s) and a shape guide stays (dotted line, ring, arrow from round end to tip). The guide fades after the first
   correct input. After about 4 s without input the ghost repeats; after about 10 s the helper does one unit of the
   work, and repeats, so the step always completes. Accept sloppy input: "same ballpark" detection.
7. **One input, one visible change, one sound, one haptic tick.** Sound is off by default here, so the picture has to
   carry the hit: squash on contact, a piece that falls away, a colour step, a puff. For players who turn sound on,
   one sound per material is worth the effort: a narrative cooking game recorded every sound while really cooking the
   dish [W7], and the first game's "chop-sizzle-thwack noises" were what charmed its critic [R1]. The top-left strip
   goes; nothing persistent is on screen except close.
8. **Transitions by travel, with a one-second look ahead.** The result of a step slides or is carried into the next
   scene (board to bowl, bowl to pan, pan to plate), and the prepared ingredients wait in view. If a step preview is
   wanted, let the recipe-book page peek in for under a second with the next step picture lit, then leave.
9. **The recipe book is the menu, the map and the memory.** One dish per page: large finished-dish picture, its
   ingredients as pictures, the six steps as small pictures in order (this is where the old step strip belongs), and a
   stamp once cooked. Touching the page starts cooking. With only three dishes, lock nothing; mark a dish "new" until
   first cooked, and after cooking keep the player's own last plate as the page picture (their arrangement, their
   doneness). If time allows, one fork per dish (two toppings or sauces to choose between) gives variants to collect.
10. **End on someone eating, in one unbroken chain.** Player plates and garnishes; short hero shot with steam; one
    picture button that calls the octopus; the plate is carried out of the kitchen to the table rather than appearing
    there; the labelled rule decides whether the octopus eats or watches; each bite changes the dish picture (a cut
    face showing the inside); then the book gets its stamp. Keep the whole serving beat under about 5 s and never
    present the octopus's reaction as taste or feeling.

Illustration only (dishes are another lane's decision): a rice-ball dish as six steps: wash rice (circle), cook rice
(keep-in-zone, lift the lid), season and fold in (tap shaker, rub), shape (circle or press), wrap the seaweed
(stroke on guide), plate and garnish (drag and place).

## 9. Sources, blocked pages, caveats, open questions

### Sources opened (62 pages or records on 21 sites; the 139 recipe pages fetched in bulk count as one)

Encyclopedic and wiki pages
- [W1] https://en.wikipedia.org/wiki/Cooking_Mama_(video_game)
- [W2] https://en.wikipedia.org/wiki/Cooking_Mama_2:_Dinner_with_Friends
- [W3] https://en.wikipedia.org/wiki/Cooking_Mama:_Cook_Off
- [W4] https://en.wikipedia.org/wiki/Cooking_Mama_5:_Bon_App%C3%A9tit!
- [W5] https://en.wikipedia.org/wiki/Cooking_Mama:_Cookstar
- [W6] https://en.wikipedia.org/wiki/Order_Up! (background only)
- [W7] https://en.wikipedia.org/wiki/Venba_(video_game) (background only: recipes as puzzles, sound recorded while cooking)
- [W8] https://en.wikipedia.org/wiki/WarioWare
- [W9] https://en.wikipedia.org/wiki/Cooking_Mama_3:_Shop_%26_Chop (background only)
- [M1] https://www.mariowiki.com/Microgame
- Fan wiki of the touch cooking series. The HTML pages answer 403 here; I read the same pages through the wiki's own
  api.php (action=parse or action=query):
  - [F1] https://cookingmama.fandom.com/wiki/Cooking_Mama_4:_Kitchen_Magic_(Recipe_Actions)
  - [F2] https://cookingmama.fandom.com/wiki/Cooking_Mama:_Let%27s_Cook!
  - [F3] https://cookingmama.fandom.com/wiki/Category:CMLC_Recipes (139 recipe pages fetched in three batches; 138 had a step list)
  - [F4] https://cookingmama.fandom.com/wiki/Let%27s_Cook_(Mode)
  - [F5] https://cookingmama.fandom.com/wiki/Medal
  - [F6] https://cookingmama.fandom.com/wiki/Cooking_Mama
  - [F7] recipe pages read one by one: Pancakes, Cookies, Crepe, Mochi, Dango_Dumplings, Sandwich_(CM), Fruit_Sandwich,
    Okonomiyaki_(LC), Sushi_Balls_(LC), Lemonade (same wiki, /wiki/<name>)
- Fan wiki of the Flash restaurant series (also through api.php):
  - [P4] https://fliplinestudios.fandom.com/wiki/Grill_Station , /Cutting_Station , /Batter_Station , /Fry_Station ,
    /Dough_Station , /Topping_Station
  - [P5] https://fliplinestudios.fandom.com/wiki/Score_Details

Developer writing and design essays
- [P1] https://www.flipline.com/blog/?p=3887 (developer retrospective on their first restaurant game)
- [P2] https://www.flipline.com/games/papaspizzeria/faq.html ; also /games/papassushiria/index.html and
  /games/papaspancakeria/index.html (store blurbs only)
- [E1] https://www.gamedeveloper.com/design/the-unrealized-potential-of-cooking-in-games
- [X1] https://news.xbox.com/en-us/2023/07/19/venba-interview/ (background only)

Reviews that describe controls
- [R1] https://www.eurogamer.net/r-cookingmama-ds
- [R2] https://www.ign.com/articles/2006/09/19/cooking-mama-review
- [R3] https://www.nintendoworldreport.com/review/11902/cooking-mama-nintendo-ds
- [R4] https://www.pocketgamer.com/cooking-mama/review/
- [R5] https://www.pocketgamer.com/cooking-mama-2/review/
- [R6] https://www.pluggedin.com/game-reviews/cookingmama4kitchenmagic/ (helper comforts on mistakes; background)
- [R7] https://www.gamesradar.com/cooking-mama-bon-appetit-review/
- [R8] https://www.gamezebo.com/reviews/cooking-academy-review-2/
- [R9] https://www.gamezebo.com/reviews/cooking-academy-3-recipe-for-success-review/
- [P3] https://games.jayisgames.com/review/papas-pizzeria.php (review plus reader comments)
- [G1] https://www.supercheats.com/nintendods/walkthroughs/cookingmama-walkthrough01.txt (fan recipe list, 76 dishes)

Touch kitchens for small children
- [K1] https://www.commonsensemedia.org/app-reviews/toca-kitchen
- [K2] https://www.commonsensemedia.org/app-reviews/toca-kitchen-2
- [K3] https://childrenandmedia.org.au/app-reviews/apps/toca-kitchen-2
- [K4] https://www.windowscentral.com/toca-kitchen-2-windows-phone-game-review
- [K5] https://www.148apps.com/news/toca-kitchen-review
- [K6] https://www.commonsensemedia.org/app-reviews/toca-kitchen-sushi
- [K7] https://www.commonsensemedia.org/app-reviews/dr-pandas-restaurant-2
- [K8] https://www.148apps.com/reviews/dr-pandas-restaurant-review
- [K9] https://www.gamezebo.com/reviews/dr-pandas-restaurant-review/

Flash archive
- [A1] archive.org Flash library search for "cooking" (7 items) and the item records of "Sue's Cooking Game" and
  "Sandwich Cooking": https://archive.org/details/sues_cooking_game , https://archive.org/details/sandwich_cooking
  (read through archive.org/advancedsearch.php and archive.org/metadata/<id>). Thin: one-line descriptions only, e.g.
  ingredients into the pot, pour water, wait for the boil, pot onto the tray. Not used for any claim above.

Opened but not used: the Wikipedia page of the fourth main entry (no gameplay text survived extraction), a fan page
on camp cooking in a monster-collecting game (one line only), a blog search page of the Flash developer.

No page contained text addressed to an automated reader; nothing had to be ignored.

### Blocked (could not open)

- strategywiki.org (403 with both fetchers) and its copy on web.archive.org (connection reset): the per-step stylus
  instructions for the second DS game. This was the best single source for exact gestures.
- speedrun.com guides (403), gamefaqs.gamespot.com (403), gamespot.com review (403), tvtropes.org (403),
  mobygames.com (403), bulbapedia.bulbagarden.net (403), numuki.com pages of a Flash "cooking class" series (403).
- The Flashpoint archive database API (proxy 502), so no Flash database records beyond archive.org.
- nintendolife.com review of the 2020 sequel (404).

### Sceptic's pass: what is not verified

- Three gesture lines in table 1.2 are marked (unverified): they come from search-result summaries of StrategyWiki and
  speedrun.com pages that I could not open.
- [F1] lists the 3DS alternative controls, not the stylus controls. I use it for "which motion fits which verb"; the
  one-thumb forms in 1.1 are my translation. Cells marked (I) in 1.2 are inference.
- All "Sec" values are my targets, not measurements.
- The 7-line cap in [G1] is inferred: 31 of 76 lists are exactly 7 lines long (including the "option to change" line),
  none is longer, and several stop before an obvious last step (a croquette that is never fried). So "7" means "7 or
  more", and the true mean for the 2006 game is above 5.3.
- The phase table in 2.2 is a keyword classification of step names written by me in a hurry; treat the percentages as
  plus or minus a few points.
- The Flash "cooking class" series (follow the pointing hand, drag and drop each ingredient) is known to me only from
  search-result summaries (unverified); it is not used above.
- Fan wikis and fan FAQs are community-written and may contain errors; reviews describe versions from 2006 to 2015.
- I did not check whether the series' phone game is played in portrait (from memory it is, unverified).

### Open questions (for the lead or the owner)

1. May the result visibly differ by how the player cooked (pale / golden / dark-crisp, even / uneven cuts), as long as
   every variant looks tasty? Implications 4 and 5 depend on it.
2. Redo a step, or always forward? One entry's replay mode lets each step be repeated before moving on [W4];
   forward-only is simpler and suits "no fail".
3. Is one fork per dish (two toppings or sauces) in scope before the deadline, or a later addition?
4. Should the recipe book keep the player's own last plate as the page picture (needs saving a few trait values per dish)?
5. Does the carry-to-table beat play inside the kitchen frame or in the room scene? (integration lane)
6. How locked or new recipes are drawn in the reference games: not found; only relevant if dishes get unlocks later.
7. With sound off by default, is a stronger default haptic acceptable, since the genre leans on sound for the hit?
