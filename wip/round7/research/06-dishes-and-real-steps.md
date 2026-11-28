# 06 — Which dishes, and how each is really made (round 7 research, 2026-11-21)

Scope: choose the kitchen's dishes (part 1) and turn their real preparation into touch steps (part 2).
Method: looked at the current screenshots (`wip/round6/shots/K2/*`, `wip/round6/shots/D/2-dishes-2x.png`,
`docs/shots/cook/*`), then read 22 recipe and reference pages in Korean and English (list in section 8).
Source tags like [G1] point to that list. Anything not opened is marked "(unverified)" or "(from memory, unverified)".
Scores and pixel sizes are my own judgement, offered as a starting point, not measurements.

## 0. What changes the build (read this first)

1. **Replace the forms of all three dishes.** Recommended set:
   - savoury griddle: **김 계란말이** (rolled omelette with a seaweed swirl), on an oblong plate, as a row of cut slices;
   - noodle: **냄비 라면** (pot ramyeon with an egg and scallion), served in its yellow two-handled pot;
   - sweet: **씨앗호떡** (seed-stuffed sweet pancake), standing in a paper cup with seeds spilling out.
   - spares: **딸기 탕후루** (candied fruit skewer; a re-skin of today's 과일 꼬치) and **삼각 주먹밥** (triangle rice ball
     with a seaweed band; a re-skin of today's 주먹밥).
2. **Five containers, five outlines**: oblong plate + stepped row / pot with ear handles + lifted noodles / paper cup + stuffed
   half-moon / diagonal beaded skewer / triangles on a leaf. None is a disc on a round plate.
3. **Six gesture primitives cover every step of all five dishes.** Three exist (`tap`, `flip` = swipe, `slice` = drag along a
   line). Three are new: **hold** (pour / press), **circle** (whisk / stir / twirl), **drag-to-target** (place / drop / skewer).
   Section 5 has the matrix. If only two new primitives fit the schedule, build hold and drag-to-target (no path recognition).
4. **Each dish: 6 to 7 steps of 4 to 9 s each (lead-in and settle animation included), 27 to 38 s in total**, no two neighbouring steps with the same gesture, one signature
   moment (roll / egg crack and lid lift / press / dip-and-twirl / press-and-rotate).
5. **Real cooking has timing windows; the game should latch them.** "Roll when 90 % set" [G3] becomes: the egg reaches a
   glossy just-set look and waits there. Nothing burns, nothing overflows (pours stop at a line by themselves). Section 6.
6. **Progress must be readable from the food itself** (the owner's steak reference). Each dish below lists 6 to 9 food states.
7. **Countable pieces give the eating scene its bite states for free**: 5 omelette slices, 3 fruits per skewer, a noodle heap
   that sinks, a triangle with a bite. Worth using when the octopus eats.
8. **Reuse is better than it looks.** Today's pan scene (a white lump patted flat, flipped golden) is, in form, a hotteok on a
   griddle. Today's skewer scene is a tanghulu minus the syrup. Only the rectangular omelette pan and the ramyeon pot are new scenes.
   Ramyeon needs one scene only (pot on the stove) for all seven steps and only two of the new primitives (hold, circle): the cheapest new dish.
9. **붕어빵 would be top three on fun** (mould, flip, reveal, paper bag) **but it is fish-shaped.** It contains no fish, yet it
   depicts an animal. Held back as an owner question, not recommended by default.
10. **Palette warning**: omelette, ramyeon pot and hotteok are all yellow-gold-brown. Give each a contrast accent (ketchup red,
    red broth and green scallion, striped cup and green pumpkin seeds). Tanghulu is the only cool, glassy, jewel-coloured dish:
    the best fourth dish if time allows.
11. If the cafe recipe gift (README E4) is built, the two spares are natural "gifted recipes"; the three above are the starters.

## 1. Verdict on today's three dishes against criterion (a)

| Today | What the picture shows | Passes (a)? | Recommendation |
|---|---|---|---|
| 해초전 | flat golden disc with a '+' cut on a round blue plate, seen from above | No. A jeon is flat by nature; it is the "same form" the owner means | Retire from the first three. If kept later as a cheap fourth dish (its steps exist): draw 6 cut pieces stacked and overlapping on a round wicker tray (채반) with lacy brown edges, a sauce dish, chopsticks lifting one piece |
| 주먹밥 | flat golden disc with a dark band, same plate | No. Reads as "a second pancake" | Redesign as 삼각 주먹밥 (white triangle, black-green band): passes easily. Its pan scene is better reused for hotteok |
| 과일 꼬치 | three square watermelon blocks on a horizontal stick | Half. The skewer is a distinct outline, the square blocks look abstract and the skewer lies flat | Redesign as 탕후루: round fruit, drawn on the diagonal, glass shell with white specular pixels: passes |

## 2. Candidates, ranked

Scores 1 to 5 (my judgement): (a) outline and own container, (b) 5 to 7 different hand actions, (c) visible transformation,
(d) no cephalopod / no visible animal, (e) familiar Korean home or street food, plus build cost (5 = cheap, reuses what exists).

| # | Dish | Slot | (a) | (b) | (c) | (d) | (e) | Build | Container | Why this rank |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 김 계란말이 (seaweed-swirl rolled omelette) | savoury griddle | 5 | 5 | 5 | 5 | 5 | 4 | oblong plate | Richest real process (crack, whisk, pour, lay, roll x3, press, slice); the cut face shows the inside; keeps the game's seaweed identity [G1][G2] |
| 2 | 냄비 라면 (pot ramyeon, egg, scallion) | noodle | 5 | 5 | 4 | 5 | 5 | 4 | yellow pot + lid | The pot is the outline; every player has made it; one scene for all steps; fits a rainy attic. The owner's reference pictures include a ramen bowl (README E1) |
| 3 | 씨앗호떡 (seed hotteok, Busan style) | sweet | 4 | 5 | 5 | 5 | 5 | 4 | paper cup | Best tactile verb (the press); dough ball to golden disc to stuffed pocket; tied to the seaside city of Busan (one recipe writer's remark [H1]); reuses today's pan scene |
| 4 | 딸기 탕후루 (candied fruit skewer) | sweet | 5 | 3 | 4 | 5 | 4 | 4 | skewer in a glass / on paper | Prettiest (glass shine); diagonal skewer matches the owner's references; the syrup boil is passive, so fewer active verbs |
| 5 | 삼각 주먹밥 (triangle rice ball) | rice | 5 | 3 | 3 | 5 | 5 | 4 | bamboo leaf on a tray | The most icon-like outline of all; no heat, modest transformation |
| 6 | 붕어빵 (fish-shaped red-bean pastry) | sweet | 5 | 5 | 5 | 2 | 5 | 3 | paper bag | Mould work is new and delightful (oil, half-fill, bean, cover, close, flip, open [B1]); held back only by the fish shape |
| 7 | 김밥 | rice | 4 | 5 | 4 | 4 | 5 | 3 | bamboo mat / foil | Excellent process (from memory, unverified: season rice, spread, lay fillings, roll, oil, slice) but "roll then slice a row" duplicates the omelette in gesture and outline. Use it only if the omelette is dropped |
| 8 | 떡볶이 | rice cake | 4 | 3 | 4 | 4 | 5 | 4 | green speckled plate | White cylinders turning glossy red is a good change; mostly pour and stir; fish cake must be left out (from memory, unverified) |
| 9 | 길거리 토스트 (street toast) | savoury griddle | 4 | 4 | 4 | 5 | 5 | 2 | paper sleeve | Fun stack (egg-cabbage patty, buttered bread, sugar, ketchup zigzag) but many art states (from memory, unverified) |
| 10 | 해초전 / 파전 drawn properly | savoury griddle | 2 | 4 | 4 | 5 | 5 | 5 | wicker tray | Steps exist and the big flip is good, but the form stays flat: the owner's main complaint |

Considered and dropped: **비빔밥** (assembly is one gesture repeated; usually has beef; mixing destroys the pretty top),
**팬케이크 stack** (clear outline, but the generic cooking-game staple and not Korean; a possible cafe dish later),
**딸기 케이크** (oven wait, few different touch verbs; a possible cafe dish later). All three: from memory, unverified.

### Recommended set and why these three together

- **김 계란말이 + 냄비 라면 + 씨앗호떡.** Three different heat vessels (rectangular pan, pot, round griddle), three different
  signature gestures (swipe-roll, tap-crack, hold-press), three containers (plate, pot, cup), and all three show the inside or
  the ingredients (swirl, yolk and scallion, seeds and syrup).
- **Spare 1: 탕후루** replaces hotteok if the owner prefers "pretty" over "more cooking", or becomes dish four.
- **Spare 2: 삼각 주먹밥** replaces ramyeon if instant noodles do not count as cooking for the owner.
- Trade-off stated plainly: hotteok has more and better verbs; tanghulu looks better and is the only non-warm colour.

## 3. What each looks like in three-quarter view (art brief, about 48 x 40 px)

Common rules from the owner's references: top face plus a darker side face, food piled with height, pieces overlapping,
3 to 5 tones per material with hue shift, warm dark-brown outline, 1 or 2 white specular pixels on glossy parts.
Colours below are indicative, to be mapped to the project palette.

### 3.1 김 계란말이
- **Outline**: a stepped loaf. 5 thick slices in a diagonal row (back-left to front-right), each overlapping the one behind
  by about 3 px like fallen dominoes; the front slice lies flat and shows its whole face. Row peak about 16 px above the plate.
- **Container**: oblong pale plate (rounded parallelogram about 46 x 14 px, 2 px rim face at the front).
- **Slice**: face about 10 x 11 px rounded rectangle; 3 px strip of browned skin on top and side.
- **Colours**: face yellow in 3 tones (light warm yellow top-left, mid egg yellow, orange-ochre shade bottom-right); a 1 px
  dark green-black spiral of about 1.5 turns on every face (the gim [G1][G2]); skin golden-brown with one darker toasted patch.
- **Toppings**: ketchup squiggle (3 to 4 red px with one white pixel) across the front slices [G2 serves it with ketchup];
  optional green leaf under the row to break the outline.
- **Appetising detail**: the swirl on each cut face, a light line along each top edge, two steam wisps.
- **At 20 px on the table**: four yellow blocks with dark dots on a white strip and a red dot. Reads.
- **Bite states**: 5, 3, 1 slices.

### 3.2 냄비 라면
- **Outline**: a low pot with two ear handles, noodles heaped above the rim, chopsticks lifting a ribbon of noodles 10 to 12 px
  higher (this is what breaks the outline), steam.
- **Container**: yellow nickel-silver pot (양은냄비; from memory, unverified as a cultural detail). Body about 36 x 14 px, opening
  ellipse 36 x 12, handles 4 x 3, one or two dents. Gold ramp: pale yellow highlight, gold mid, orange-brown shade.
  Lid upside-down beside it as a side plate (optional).
- **Colours and toppings**: orange-red broth showing as a crescent at the front; wavy noodles in two yellows with 1 px brown
  gaps; one whole egg (white blob about 9 x 6, orange yolk dome 5 x 4 with one white pixel); 4 or 5 green scallion rings;
  a few red flake pixels.
- **Appetising detail**: the yolk highlight, glossy noodle highlights, steam, the shine on the broth rim.
- **At 20 px**: gold pot with handles, red and yellow top, a white-orange dot. The handles carry it.
- **Bite states**: heap high with egg, heap low without egg, broth only.
- **No brand**: the packet in the kitchen is a plain red-orange bag with a noodle pictogram, no letters, no real design.

### 3.3 씨앗호떡
- **Outline**: a cup with a golden dome and a crown of seeds; a dark drip down the cup.
- **Container**: white paper cup with one coloured band, trapezoid 16 px (top) to 12 px (bottom) x 15 px
  (vendors fold hotteok into a small paper cup [H3]; [H1] serves seed hotteok in paper cups).
- **Food**: golden-brown half-moon standing in the cup, about 24 x 14 px above the rim, 4 px thick edge showing a cream inner
  line of dough, 2 or 3 darker blisters; the top edge snipped open, heaped with seeds: sunflower kernels (cream-grey 2 x 1),
  pumpkin seeds (green 2 x 1), peanuts (tan 2 x 2), sesame dots (mix from [H1]).
- **Colours**: crust in 4 tones (light gold, orange-brown, toasted brown, deep brown); syrup very dark brown with an
  orange-brown highlight and one white pixel.
- **Appetising detail**: the syrup drip, the seed crown, steam. A bitten variant shows the dark molten centre inside a cream rim.
- **At 20 px**: white cup, brown dome, speckled top. The band colour helps.
- **Bite states**: whole, one bite showing the dark centre, cup with crumbs and a seed or two.

### 3.4 딸기 탕후루 (spare)
- **Outline**: a beaded diagonal line. Two skewers crossed on a square of paper, or standing in a clear glass.
- **Food**: 3 fruits per skewer: strawberry (about 7 x 8, tapered, 3 reds, 3 yellow seed pixels), green grape (6 x 6, 3 pale
  greens), strawberry. Stick 1 px pale wood, 5 px showing below, tip hidden inside the top fruit (the skewer goes only
  half-way into the firm base [T1]).
- **Glass shell**: 1 px lighter keyline on the lit side of each fruit, two white specular pixels per fruit, a flat hardened
  syrup "foot" under each fruit, one pale-blue rim pixel on the shadow side.
- **At 20 px**: three red-green beads on a diagonal with white dots. Reads.
- **Bite states**: 3, 2, 1 fruits; bare stick.

### 3.5 삼각 주먹밥 (spare)
- **Outline**: two rounded triangles, one upright in front, one leaning behind.
- **Container**: a dark green bamboo leaf on a small wicker tray or wooden board; two yellow pickled-radish half-moons beside.
- **Food**: triangle base 18 to 20 px, height 16 to 18, 6 px side face; rice in 3 or 4 tones (warm white, light warm grey,
  lavender-grey shade), outline slightly scalloped with single-pixel grain bumps, 3 or 4 sesame specks; seaweed band 8 x 9 px
  at the bottom centre, black-green with a 1 px sheen line and a ragged top edge (a strip cut from a half sheet [J1]).
- **Appetising detail**: grain texture, band sheen, steam when fresh, a bite at the top corner showing the filling.
- **At 20 px**: white triangle, black rectangle. The most iconic of all.

## 4. Real steps and their touch versions

Table columns for the real process: step / why / the cue that it is done / what the hands do.
Table columns for the game: gesture kind / what changes on screen / how it ends / seconds.
Rules kept: no fail, no timer, wordless. Every "wait" latches at its ready look. The next tool wiggles; the existing ghost hand shows the gesture.
Seconds include about 0.5 s of lead-in (the tool arrives, the hint shows) and 0.5 to 1 s of settle animation. "My inference" and "my reading" mark reasons or cues that no opened page states.

### 4.1 김 계란말이 — savoury griddle

Sources: [G1] [G2] [G3] [G4] [G5].
Ingredients: 4 or 5 eggs, 1 to 3 pinches of salt, 2 sheets of gim, a little oil; optional milk 2 tbsp and cooking wine [G1];
optional finely chopped scallion, onion, pepper [G4][G5].
Tools: bowl, whisk or chopsticks, optional sieve, pan (the rectangular omelette pan is the recognisable one), spatula or two
spoons [G1], bamboo mat (김발) [G4], board, knife, plate.

| Real step | Why | Done cue | Hands |
|---|---|---|---|
| Crack the eggs, add salt, beat | An even mix sets evenly and rolls without tearing | No visible strings of white [G5]; optional: strain to remove the stringy bits for a smoother roll [G1][G3] | Tap the shell on the rim, open with two thumbs, small fast circles |
| Heat the pan gently, wipe on a thin coat of oil | Too much heat gives tough eggs that break when folded [G5]; a thin film of oil is enough [G1][G3] | Pan feels hot with a hand 5 to 8 cm above it [G5]; the oil film shimmers (my reading) | Wipe with a folded paper towel [G5] |
| Pour about a third, tilt to spread thinly | Thin layers, repeated, build a thick roll [G3] | Egg reaches the pan edges | Tilt the pan left-right, back-forth [G1] |
| Lay a sheet of gim when the bottom has just set, leaving a gap at the far end | The gap is what lets it roll up well [G2]; the still-wet top holds the gim (my inference) | Bottom just set [G1]; about 80 % set [G3]. Seen as: edges opaque, top still glossy (my reading) | Lay the sheet flat with fingertips |
| Roll while the top is still slightly wet | Fully cooked egg does not roll well [G3] | About 90 % set [G3]; "top begins to set but is still slightly wet" [G5] | Lift the edge with a spatula or two spoons, fold over, repeat [G1][G5] |
| Oil again, pour the next third at the end of the roll, lay gim, roll; repeat | Joins a new layer to the roll [G1][G2]; lifting the edge a little helps it roll thick [G4]. Letting the new egg run under the lifted roll is common practice (from memory, unverified) | Each new layer just set | Lift the roll edge slightly, pour, wait, roll |
| Leave the last half hand-span without gim | With gim to the very end it will not roll shut [G2] | Seam closed | - |
| Brown lightly front and back [G1]; leave it on the hot pan a few seconds more [G5] | Sets the seam, gives colour (my inference) | Pale gold; if the bottom browns, lower the heat or lift the pan [G5] | Turn the log |
| Wrap in a bamboo mat and rest | The mat squares the shape; resting lets it firm up [G4] | Steam dies down, about 5 minutes [G5]; cut hot and it may burst [G1] | Roll the mat around it and squeeze gently |
| Slice thick | Shows the swirl | Clean faces; wipe the knife when gim sticks to it [G2] | Straight downward cuts, even widths |

Interactive sequence (7 steps, about 38 s; a 5-step version drops steps 4 and 6):

| # | Step | Gesture | On screen | Ends when | s |
|---|---|---|---|---|---|
| 1 | Crack 3 eggs | tap | Tap an egg: hairline crack and a "tok"; tap again: it opens, yolk and white drop into the bowl, shell halves fly to a side dish | Third yolk lands | 5 |
| 2 | Whisk | circle | Chopsticks follow the finger. Whole yolks, then broken streaks, then marbled, then one even pale yellow with small bubbles at the rim. A pinch of salt falls by itself on the first turn | About 5 turns in any direction; pauses are fine | 6 |
| 3 | Pour a third | hold | (0.5 s intro: a towel wipes oil, a shimmer line sweeps the pan.) Hold the bowl: it tilts, a ribbon of egg falls and spreads to the pan edges; first sizzle | Sheet reaches the edges; the pour stops by itself | 4 |
| 4 | Lay the gim | drag-to-target | The sheet's rim turns opaque from the edge inward (1.5 s), the centre stays glossy. Drag the gim on; it snaps into place with a gap at the far end and darkens slightly | Gim placed | 4 |
| 5 | **Roll (signature)** | swipe | Each swipe folds one turn. 3 swipes make a thin log. Then by itself: the bowl pours the next third under the lifted log, a new gim slides on; 2 swipes; last third with no gim on the final stretch; 2 swipes. The log grows 8, 12, 16 px. A double pat browns its sides | Bowl empty, log at the pan's end | 9 |
| 6 | Shape and rest | hold | The log slides onto a bamboo mat. Hold: the mat wraps and squeezes, steam puffs from both ends, the lumpy oval becomes a neat rounded bar; then the steam fades (the rest) | Released by itself after about 1.5 s | 4 |
| 7 | Slice | slice (x4) | Four guide lines. Each stroke cuts; the piece tips over and shows the yellow face with the dark swirl; a wisp of steam; the knife is wiped on a towel by itself between cuts | Fourth cut; five pieces fan onto the oblong plate | 6 |

Gesture order: tap, circle, hold, place, swipe, hold, slice. To save 3 s, use two pour-and-roll rounds instead of three.
Food states: eggs / yolks in bowl / beaten / wet sheet / set sheet with gim / thin log / thick log / squared bar / slices.

Art and sound notes: oil shimmer as 2 or 3 lighter streaks drifting on the dark pan; egg sets from the edge inward (opaque
pale rim creeping in, centre darker and glossy); small bubbles lifting the sheet; a soft steady sizzle, never a crackle
(the heat is low [G3][G5]); the seam side of the log shows thin layers; steam puff when squeezed in the mat; the cut face is
the money shot. Sounds: tok, wet whisking, "fsss" on the pour, soft sizzle, a papery crackle when gim meets egg, knife thunk.
Conflict noted: [G1] preheats at medium-high, [G3] and [G5] insist on low or medium-low; the majority (low) is used here.

### 4.2 냄비 라면 — noodle

Sources: [R1] [R2] [R3] [R4].
Ingredients: one packet (noodle brick, powder soup, dried flakes), water 500 to 550 ml, one egg, half a scallion.
Tools: pot with lid, chopsticks, knife and board (or scissors), burner.

| Real step | Why | Done cue | Hands |
|---|---|---|---|
| Measure the water into the pot | The packet's amount already allows for evaporation; with an egg use slightly less [R1] | 550 ml for the best-known brand, 500 ml for another [R1] | Pour to a known mark |
| Bring to a boil on high heat [R2]; meanwhile cut the scallion and get the egg ready [R3] | Everything goes into boiling water [R1]; the wait is the prep time | Rolling boil (팔팔 [R4]): large bubbles breaking across the whole surface (my description) | Turn the knob; chop the scallion into small rings (쫑쫑) [R3][R4] |
| Open the packet | - | - | Tear at the notch |
| Add the noodle brick, the powder and the flakes to the boiling water | Packet order: noodles, powder soup, flakes, then about 4 min 30 s more [R1] (some cooks add the soup first [R4]) | Water turns orange-red; flakes swell | Drop the brick in, shake the sachets empty |
| Turn the brick over once, then leave it about 2 minutes | Over-stirring roughens the noodles and clouds the broth with starch [R2] | The brick loosens into waves by itself | One flip with chopsticks, then loosen gently [R4] |
| Add the egg and do not stir | Left alone, the egg sets in soft curds [R3][R4] | Soft curds float up [R4] | Recipes pour beaten egg in one circle [R2][R3][R4]; many people crack a whole egg in (from memory, unverified) |
| Scallion: half with the soup, the rest on top at the end [R3]; turn off the heat | Fragrance in the broth [R2]; the late half stays bright green (my inference) | Green rings on top | Scatter |
| Eat straight away | Noodles swell as they sit [R4] | Springy noodles | Lift with chopsticks |

Interactive sequence (7 steps, about 30 s; one scene, the pot on the stove with a small board at the side):

| # | Step | Gesture | On screen | Ends when | s |
|---|---|---|---|---|---|
| 1 | Pour water | hold | Hold the kettle: a stream fills the yellow pot up to an embossed line inside | Line reached; the stream stops by itself | 4 |
| 2 | Light the burner, cut the scallion | slice (x3) | One tap on the knob: tick-tick-foom, a blue flame ring. Pinhead bubbles gather on the pot bottom while three strokes on the board turn the scallion into rings | Third cut; the water is at a rolling boil at that moment (latched, not timed) | 5 |
| 3 | Tear the packet, tip the noodles in | swipe | Swipe across the top of the bag: it rips, the bag tips and the brick slides out into the pot. Splash, the boil calms for a beat and comes back; the soup sachet stays behind | Brick in the water | 4 |
| 4 | Shake in the soup | tap (x3) | The sachet hangs over the pot. Each tap shakes out a third: a red cloud blooms and tints the water orange-red; green flakes swell | Sachet empty | 4 |
| 5 | Loosen the noodles | circle | The brick turns over once by itself (the "one flip" [R2]); three circles with chopsticks untangle it into glossy yellow curls | 3 turns | 5 |
| 6 | **Crack the egg (signature)** | tap (x2) | Tap: crack on the pot rim. Tap: it opens, the yolk settles on the noodles, the white turns from clear to white from the rim inward (1.5 s). Scallion rings rain in, the lid goes on, rattles, steam jets from the gap | Lid on | 4 |
| 7 | Lift the lid | swipe | Swipe up: a steam cloud fills the stage and clears onto the finished pot. This is also the serve moment that leads to the table | Steam clears | 4 |

Gesture order: hold, slice, swipe, tap, circle, tap, swipe. (Optional eighth beat if wanted: drag the brick in by hand instead of the tip.)
Food states: empty pot / water / boiling / brick in water / red broth / loose curls / egg and scallion / lidded.

Art and sound notes: three boil stages (pinhead bubbles on the bottom, bubble strings, rolling boil); the brick softens at
its edges first; powder bloom spreads from where it lands; the lid rattle; a kelp-green flake or two; yolk highlight; the
steam should briefly fog the whole stage on the lid lift. Sounds: water pour, tick-tick-foom, knife taps, a plastic rip, plop,
dry shake, simmer, shell tok, lid clink. Carry to the table in the pot on a trivet, lid as a side plate (from memory, unverified).
Choice to confirm: whole egg (reads far better in pixels: white and a yolk dome) versus beaten egg poured in a circle (what
the opened recipes do [R2][R3][R4]; needs an extra bowl and gives pale ribbons that are hard to read).

### 4.3 씨앗호떡 — sweet

Sources: [H1] [H2] [H3] [H4] [H5].
Ingredients: risen dough (bread flour, glutinous rice flour, warm milk, sugar, yeast, salt [H1]); filling of dark brown
sugar with sesame and crushed nuts [H1], often cinnamon and chopped peanuts [H3][H4][H5]; seed mix of sunflower seeds,
pumpkin seeds, peanuts, almond slices, walnuts [H1]; plenty of oil, optional butter [H1].
Tools: bowl, oiled hands or glove, spoon, pan or griddle, hotteok press (a flat stainless disc with a handle [H3][H4]) or a
wide spatula or the palm [H2], scissors, paper cup.

| Real step | Why | Done cue | Hands |
|---|---|---|---|
| Mix the dough and let it rise in a warm place | A risen dough is soft and elastic enough to wrap the filling (my inference); glutinous rice flour adds the chew [H1][H3] | 2 to 2.5 times bigger in 30 to 60 min [H1]; doubled, puffy, web-like when pulled, 1 to 2 h [H3] | Knead 10 to 15 min [H1] (the game starts after this) |
| Oil the hands, pull off a lump, flatten it into a shallow cup | The dough is sticky and oil stops it sticking; the cup holds the filling [H2][H3] | A palm-sized cupped disc | Pinch off, flatten in the palm |
| Spoon the filling into the centre, edges kept free of filling [H3] | So the seal holds (my inference) | About 1.5 tbsp [H3] | Spoon [H2] |
| Gather the edges over the filling and pinch shut | A tight seal keeps the molten sugar inside [H1][H3] | No filling visible | Pleat around and pinch at the top [H2][H3] |
| Lay it seam side down in a generously oiled pan, gentle heat [H1][H3] | Low heat gives the dough time to cook and the sugar time to melt before the outside burns [H2][H3]; seam down so it sets shut (my inference) | About 30 s [H3] | Place |
| Flip, then press flat, gradually | A thin disc cooks through (my inference); pressing too hard tears the dough and squeezes the filling out [H3] | About 1.3 cm thick [H3] | Press with the round press or a spatula [H3][H4], or the palm before frying [H2] |
| Fry both sides | Crisp edges, melted filling [H3] | Golden brown on both sides, 1 to 2 min per side [H3] | Flip |
| Cut it open with scissors and fill with the seed mix | This is what makes it a seed hotteok [H1] | Pocket full, seeds spilling | Snip, spoon seeds in |
| Serve in a paper cup | Catches the drips; the syrup is very hot [H3] | - | Fold or stand it in the cup [H1][H3] |

Interactive sequence (7 steps, about 29 s, plus a 3 s serve):

| # | Step | Gesture | On screen | Ends when | s |
|---|---|---|---|---|---|
| 1 | Pull off the dough | drag-to-target | Drag from the puffy dough in the bowl to the oiled board: it stretches in strands, snaps free and is patted into a cupped disc | Disc on the board | 4 |
| 2 | Spoon the filling | tap (x3) | Each tap drops a spoon of dark brown sugar with specks into the centre; the edge stays clean | Three spoons | 4 |
| 3 | Gather the rim | circle | One circle around the rim pleats the edge up and over as the finger passes; the top twists shut. By itself: the ball lands seam down on the oiled griddle, sizzle, a ring of small bubbles | One turn | 5 |
| 4 | First flip | swipe | A pale gold ring appears at the bottom edge. Swipe up: the ball turns over, showing a small seared patch | Flipped | 4 |
| 5 | **Press (signature)** | hold | Hold the round press on the ball: it squashes into a disc (radius about 12 to 22 px), the sizzle gets louder, bubbles race around the edge, a darker patch of sugar shows through the middle | Released by itself at the right thickness | 4 |
| 6 | Second flip | swipe | The edge colour climbs from cream to gold. Swipe up: the golden-brown face with darker blisters and an oil sheen; a bead of syrup leaks and bubbles (decoration only) | Flipped | 4 |
| 7 | Snip it open | slice (x1) | On the board, scissors follow one guide line along the top edge: the pocket opens, steam, a glint of molten syrup | Cut done | 4 |
| - | Serve (shared ending gesture) | drag-to-target | Drag the seed scoop into the pocket: seeds overflow; the hotteok drops into the paper cup | - | 3 |

Gesture order: place, tap, circle, swipe, hold, swipe, slice.
Food states: dough bowl / cupped disc / filled / ball / ball on the griddle / pressed pale disc / golden disc / cut pocket / stuffed in the cup.

Art and sound notes: dough strands when pulled; oil shimmer on the griddle; the sizzle jumps when the press comes down;
fine bubbles ring the disc; the crust goes cream, gold, brown with a darker rim; blisters; a syrup bead caramelising at a leak;
seeds in three colours. Sounds: soft dough stretch, spoon tick, sizzle (soft then loud), a metallic press clack, scissor snip,
a dry seed rattle. Notes on sources: [H3] sears 30 s, flips, then presses; [H4] says only "pressed flat on the griddle".
The flip-then-press order is used here; the likely reason (the press meets a seared surface, so it does not stick)
is my inference (unverified). The sugar showing through the dough is from memory (unverified). [H1] fries between medium
and high; [H2] and [H3] insist on low heat; low is used. The dough-making itself is left to a recipe-book picture.

### 4.4 딸기 탕후루 — sweet (spare 1)

Sources: [T1] [T2] [T3] [T4].
Ingredients: strawberries (also green grapes, mandarin segments [T3][T4]), white sugar and water 2 : 1 (200 g : 100 g [T1];
1 cup : half a cup [T2]; 3 cups : 1.5 cups [T3]), ice water. Tools: towel, skewers, small steel pot, glass of ice water.

| Real step | Why | Done cue | Hands |
|---|---|---|---|
| Wash, remove the caps, dry completely | Syrup will not stick to or harden on wet fruit [T1][T4] | No shine of water | Pluck the caps, pat with a towel |
| Skewer | 1 to 3 pieces per stick; more is hard to dip [T3][T4] | Stick enters the firm base and stops half-way, tip not through the top [T1] | Push and twist gently |
| Sugar and water into the pot, medium heat, do not stir [T2][T3][T4] | Stirring makes the syrup crystallise and turn cloudy [T4]; swirl the pot instead [T2] | Sugar dissolved, liquid clear | Hands off |
| Boil the water off | The shell only hardens at the hard-crack stage | Fast small bubbles turn slow and thick [T1][T2]; 300 to 310 F (about 150 C) after 10 to 20 min [T3][T4] | Wait |
| Ice-water test | Tells readiness without a thermometer | A drop hardens at once and snaps; if sticky, keep boiling [T1][T2] | Drip a little from a spoon |
| Low heat, tilt the pot, dip and turn once | A pooled syrup coats cleanly; spooning makes bubbles and clouds the shell [T4]; a second coat is too thick [T1] | Thin, even, glassy coat | One quick roll of the skewer [T1] |
| Set | - | Hard in 2 to 3 min on paper [T4], or straight into ice [T3] | Lift, let the thread break, stand it up |
| Eat soon | The shell softens as it sits [T3] | Shell cracks when bitten | - |

Interactive sequence (6 steps, about 28 s):

| # | Step | Gesture | On screen | Ends when | s |
|---|---|---|---|---|---|
| 1 | Pluck the caps | tap (x3) | Strawberries on a towel; a tap pops each green cap off | Three caps off | 4 |
| 2 | Skewer | drag-to-target (x3) | Drag fruit onto the stick in any order; each slides to the next slot; the tip stays hidden in the top fruit | Three fruits on | 5 |
| 3 | Sugar and water | hold | One hold, two phases: a white cascade builds a mound, then water wets it to slush | Stops by itself | 4 |
| 4 | Bead test | tap (x3) | The burner lights by itself and no stirring tool is offered. The syrup clears; bubbles go from fast and small to slow and large. Each tap drips a bead into the ice-water glass: a soft blob, a bendy thread, a hard bead with a "tink" | Third bead | 6 |
| 5 | **Dip and twirl (signature)** | circle | The pot tilts so the syrup pools. One circle with the skewer: the coat climbs each fruit, gloss and white pixels appear as it turns, a hair-thin thread trails | One turn | 5 |
| 6 | Lift and set | swipe | Swipe up: the thread snaps, a frosty flash, tiny cracking ticks as the shell hardens; it stands in the glass | Standing | 4 |

Gesture order: tap, place, hold, tap, circle, swipe.
Food states: fruit with caps / without / skewered and matte / sugar slush / clear syrup with slow bubbles / wet glaze / hard glass.
Art and sound notes: matte fruit before, glass after (that contrast is the whole dish); bubble size and speed are the readable
cue; pale straw colour, never dark amber (from memory, unverified); the thread; sparkles. Sounds: sugar hiss, slow thick bubbling, tink, a crisp crack.

### 4.5 삼각 주먹밥 — rice (spare 2)

Sources: [J1] [J2] [J3].
Ingredients: warm rice (550 g makes 6 [J1]), salt, sesame oil, sesame seeds [J1][J2], gim, a filling. For this game a
filling with no animal: for example fried kimchi (my suggestion, unverified); the opened recipes use tuna-mayo or tiny
shrimp [J1][J2], which this kitchen should avoid. Tools: bowl, rice paddle, hands (or a triangle mould [J1][J2]), scissors.

| Real step | Why | Done cue | Hands |
|---|---|---|---|
| Season the warm rice: salt, sesame oil, sesame | Plain rice tastes flat inside gim; season on the firm side [J1] | Glossy grains | Sprinkle, drizzle |
| Mix it through | Even seasoning [J1]; a cut-and-fold motion keeps the grains whole (from memory, unverified) | Specks evenly spread | Mix with the paddle [J1] |
| Wet the hands and rub on a little salt [J3] | So the rice does not stick (my inference) | Palms glisten | - |
| Half the rice on the palm, a dent, the filling, the other half on top | The filling stays in the centre [J2][J3] | About 50 g, 1 to 2 tsp filling, 50 g [J3] | Thumb makes the dent |
| Press and rotate | The lower hand flattens the sides, the upper hand bent like a mountain makes a corner; three corners, then 2 or 3 more turns [J3] | Holds together but stays airy, not packed [J3] | Press, toss-turn a third, press |
| Wrap a strip of gim around the base | A dry handle; wrap just before eating to keep it crisp [J3] | Band stuck on | A half sheet cut in three lengthwise, then halved [J1] |

Interactive sequence (6 steps, about 27 s):

| # | Step | Gesture | On screen | Ends when | s |
|---|---|---|---|---|---|
| 1 | Scoop the rice | drag-to-target | Paddle from the rice pot to the bowl: a steaming white heap | Rice in the bowl | 4 |
| 2 | Season | tap (x3) | A pinch of salt, golden drops of sesame oil, a shake of sesame | Three taps | 4 |
| 3 | Fold | circle | The paddle cuts and folds; grains turn glossy, specks spread | 3 turns | 5 |
| 4 | Fill | drag-to-target | A mound sits on a wet palm with a thumb dent; drag the filling in; a second scoop covers it by itself | Filling in | 4 |
| 5 | **Press and rotate (signature)** | hold (x3) | Each hold: the upper hand presses a corner, the lower hand squeezes the sides; on release the ball turns a third. Ball, then one, two, three corners | Third press | 6 |
| 6 | Wrap | swipe | Swipe up: the gim strip under the base folds up the front with a dry crackle | Wrapped; set on the leaf | 4 |

Gesture order: place, tap, circle, place, hold, swipe.
Food states: rice in the pot / in the bowl / seasoned / mixed / mound with filling / ball / triangle / banded.

## 5. Shared implementations

| Primitive | Exists? | 계란말이 | 라면 | 호떡 | 탕후루 | 주먹밥 |
|---|---|---|---|---|---|---|
| tap (N marks or N taps) | yes (`tap`) | crack x3 | shake soup x3; crack egg | spoon filling x3 | pluck caps x3; bead test x3 | season x3 |
| swipe | yes (`flip`) | roll x7 | tear packet; lift lid | flip x2 | lift and set | wrap gim |
| drag along a guide line | yes (`slice`) | slice x4 | scallion x3 | snip x1 | - | - |
| hold (fills or squeezes, stops by itself) | new | pour egg; mat press | pour water | press | pour sugar and water | shape x3 |
| circle (accumulated turning around a centre, any direction) | new | whisk | loosen noodles | gather rim | dip and twirl | fold rice |
| drag-to-target (snaps when near) | new | lay gim | - (optional: drop the brick by hand) | pull dough; stuff seeds | skewer x3 | scoop; fill |

- **hold** needs two skins on one implementation: "pour" (a stream, a level or a spreading sheet, stop at a line) and
  "press" (squash, release at a thickness). Progress grows only while the finger is down; letting go pauses, never punishes.
- **tap** gets a "crack" skin shared by omelette and ramyeon: one egg sprite set (whole, cracked, two halves, yolk and white).
- **swipe**: the existing flip covers roll, flip, tear, lift and wrap; only the art differs.
- **One shared ending gesture per dish** (lift the lid, fan onto the plate, drop into the cup) can be the bridge to
  "call the octopus": the served container is the thing carried to the table.
- Shared art and sound: steam (exists), sizzle loop in two strengths, three boil stages (ramyeon and syrup differ only in
  bubble size and speed), a pour stream with a colour parameter (yellow egg, clear water, white sugar), burner and knob
  (exist), knife (exists), sparkle (exists).

Minimum viable cut if time runs short: omelette as 5 steps (crack, whisk, pour, roll, slice), ramyeon as 6 (the scallion
arrives already cut), hotteok as 5 (pull, spoon, gather, press, flip) with the snip and seeds in the serve animation.

## 6. Real mistakes, translated to a game with no fail state

| In a real kitchen | In the game |
|---|---|
| Egg cooks through before rolling and no longer rolls well [G3] | The sheet stops at "just set, still glossy" and waits for the swipe |
| Heat too high: tough eggs that break when folded [G5], burnt hotteok [H2] | Heat is fixed and gentle; colour only moves forward to the target look |
| Pouring too much | Every pour stops by itself at a line or at the pan edge |
| Stirring the syrup makes it crystallise and turn cloudy [T4] | No stirring tool exists; the only action is the bead test |
| Pressing hotteok too hard tears it [H3] | The press releases by itself; a syrup bead is decoration |
| Cutting the omelette hot bursts it [G1] | The mat step contains the cooling beat |
| Over-stirring noodles [R2] | Three circles and the step ends |
| Wet fruit: syrup will not set [T1][T4] | The towel is in the art; fruit is always dry |

## 7. Open questions

1. Is 붕어빵 acceptable although it is fish-shaped? (If yes it is the strongest sweet for mechanics; real steps in [B1].)
2. Does instant ramyeon count as "real cooking" for the owner? If not, the rice spare takes the slot.
3. Sweet slot: hotteok (more cooking verbs, warm colours) or tanghulu (prettier, the only cool colour, fewer verbs)?
4. Does the old 해초전 stay as a fourth dish in a new stacked drawing, or is it retired?
5. Omelette: three pour-and-roll rounds (true to life, about 9 s) or two (about 6 s)?
6. Ramyeon egg: whole (reads better) or beaten and poured in a circle (what the opened recipes do)?
7. Rice-ball filling: fried kimchi, none, or something else without a visible animal?
8. Should the two spares be the recipes that cafe characters give (README E4)?

## 8. Sources

Opened and read (22):
- [G1] https://www.10000recipe.com/recipe/7086289 — gim-swirl rolled omelette: thirds, gim when the bottom sets, two spoons, cool before cutting
- [G2] https://www.10000recipe.com/recipe/7035498 — gim rolled omelette: gap at the end, no gim on the last stretch, wipe the knife, ketchup
- [G3] https://www.10000recipe.com/recipe/6586700 — gim at about 80 % set, roll at about 90 %, always low heat
- [G4] https://www.10000recipe.com/recipe/6911234 — vegetables, lift the edge, shape in a bamboo mat and rest
- [G5] https://www.koreanbapsang.com/gyeran-mari-rolled-omelette/ — no strings of white, medium-low, "set but still slightly wet", rest 5 min
- [R1] https://news.tf.co.kr/read/economy/2173937.htm — packet directions: 550 ml, noodles, powder, flakes, 4 min 30 s; less water with an egg
- [R2] https://www.wikitree.co.kr/articles/1123603 — flip the brick once, leave about 2 min; egg in a circle; scallion
- [R3] https://www.10000recipe.com/recipe/6979354 — 500 ml, chop scallion, egg in one circle and do not touch, scallion on top
- [R4] https://www.10000recipe.com/recipe/6995343 — soup first then noodles at a rolling boil, loosen with chopsticks, egg not stirred
- [H1] https://www.10000recipe.com/recipe/5490089 — seed hotteok from scratch: dough, rise, filling, seam down, snip and stuff, paper cup; "once seen only in Busan"
- [H2] https://www.10000recipe.com/recipe/6628176 — seed hotteok from a mix: oiled glove, gather the edges, palm press, low heat
- [H3] https://www.beyondkimchee.com/hotteok — 30 s seam down, flip, press to 1.3 cm, 1 to 2 min per side, the press, paper cup
- [H4] https://en.wikipedia.org/wiki/Hotteok — pressed flat on a greased griddle with a steel disc on a wooden handle; fillings
- [H5] https://ko.wikipedia.org/wiki/호떡 — brown sugar and cinnamon filling, nuts added so the sugar runs less
- [T1] https://www.10000recipe.com/recipe/7017421 — strawberry tanghulu: 200 g : 100 g, half-way skewer, bubble cue, ice-water test, one roll
- [T2] https://www.10000recipe.com/recipe/6950980 — mandarin tanghulu: do not stir, swirl the pot, sluggish bubbles, cold-water test
- [T3] https://www.acozykitchen.com/wprm_print/tanghulu-recipe — no stirring, 300 F in 15 to 20 min, dunk then ice, 1 to 3 fruits per skewer
- [T4] https://www.tasteofhome.com/recipes/tanghulu/ — 300 to 310 F hard crack, tilt the pan and dip, 2 to 3 min to harden
- [J1] https://www.10000recipe.com/recipe/7039210 — triangle rice ball with a mould: seasoning amounts, gim strip cut
- [J2] https://www.10000recipe.com/recipe/7080552 — triangle gimbap: rice, filling, rice, press; oil the mould
- [J3] https://www.justonecookbook.com/onigiri-rice-balls/ — hand shaping: wet salted hands, 50 g + filling + 50 g, mountain hand, press and rotate
- [B1] https://www.10000recipe.com/recipe/6924373 — bungeoppang: thin batter, oil the mould, half-fill, bean, cover, 5 min, flip, 5 min; opening early spoils it

Could not open: https://www.maangchi.com/recipe/gyeran-mari and https://www.maangchi.com/recipe/hotteok (HTTP 403),
https://sgsg.hankyung.com/article/2023120172491 (HTTP 403), https://mykoreankitchen.com/hotteok-korean-sweet-pancake/ (HTTP 403).
Two guessed koreanbapsang.com addresses (hotteok, gimbap) returned 404 and were not pursued.

Not verified by an opened page (also marked where they appear): the steps of 김밥, 떡볶이, 길거리 토스트, 비빔밥, pancakes and
cake in section 2; the yellow pot, trivet and lid-as-plate habit; cracking a whole egg into ramyeon; the sugar showing through
pressed hotteok; why vendors flip before pressing; fried kimchi as a rice-ball filling; new egg running under the lifted
roll; the pale straw colour of ready syrup; cut-and-fold rice mixing; every cell marked "my inference" or "my reading". [G5] and [J3] were read through a
summarising fetcher and their key sentences then checked in the raw page text. No page tried to give instructions to the reader.
