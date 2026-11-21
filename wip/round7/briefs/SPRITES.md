# Food sprites — the contract between lane A (draws) and lanes K, T (use) — round 7

`js/cook-sprites.js` → global `COOK_SPR` (contract C1 in `COMMON.md`). Hand-authored, palette-indexed pixel maps (rows of
characters, one character per colour), decoded to RGBA. Only the game's fixed palette (the Apollo colours already used by
`js/cook-art.js`). Transparent background. No text in any sprite.

**Look** (the owner's complaint and references are in `RESEARCH.md` section 1b — read it): three-quarter view with volume
(a lit top and a darker side face), a silhouette no other dish shares, a different container per dish, nameable ingredients,
3 to 5 tones per material with hue shift, small specular pixels on glossy parts, a warm dark-brown outline (never pure
black), the light from the upper left. Food must read as that food at 2x on a phone without a caption.

Frames of one id share one canvas size and one anchor, so a consumer can swap frames without moving anything.
`ax, ay` = the centre of the object's footprint on the surface it stands on (where its contact shadow would be).

## 1. Finished dishes (priority 1: these are what the owner looks at)

All 80 x 56 px, anchor (40, 44). Used big on the kitchen's reveal screen and in the recipe book, and as the picture on the
play-room table.

| id | frames | picture |
|---|---|---|
| `dish.jeon` | 3 (0 pale, 1 golden, 2 crisp) | seaweed pancake cut into pieces and **stacked overlapping** on a round wicker tray (a jeon is flat by nature, so height comes from the stack): lacy crisp brown edges, green seaweed strands on the cut faces, one piece lifted on chopsticks, a small dish of soy dip beside it |
| `dish.gyeran` | 1 | five slices of rolled omelette lined up on a rectangular plate, the spiral layers visible on the cut faces, a sprig of green |
| `dish.jumeokbap` | 1 | two triangle rice balls leaning on each other on a leaf-shaped plate, a dark seaweed strip on each, sesame, two yellow radish slices |
| `dish.kkochi` | 1 | two fruit skewers (strawberry, green grape, tangerine) crossed on a small round plate, a clear sugar glaze with glints |
| `dish.cake` | 1 | one slice of strawberry cream cake on a square plate: two sponge layers, cream and strawberry pieces between, a whole strawberry on top |

Small versions, each 16 x 16, anchor (8, 13): `icon.jeon`, `icon.gyeran`, `icon.jumeokbap`, `icon.kkochi`, `icon.cake`
(redrawn by hand for the size, not scaled down).

## 2. Cooking states (priority 2, in recipe order: jeon, gyeran, jumeokbap, kkochi, cake)

Seen from above at a slight tilt, like the existing pan and board. The kitchen stage is 144 x 160 art px; the food sits
around the stage point (72, 86). Sizes are canvas sizes; keep 2 px of transparent margin.

| id | size | anchor | frames | picture |
|---|---|---|---|---|
| `bowl` | 88 x 68 | (44, 40) | 1 | an empty mixing bowl with a thick rim (its contents are separate sprites drawn on top) |
| `mix.jeon` | 60 x 40 | (30, 22) | 4 | in the bowl: flour heap, water and chopped seaweed apart (0) → lumpy (1) → streaky (2) → smooth batter with green flecks (3) |
| `mix.egg` | 60 x 40 | (30, 22) | 4 | three yolks in clear whites (0) → yolks broken (1) → streaky (2) → even yellow (3) |
| `mix.rice` | 60 x 40 | (30, 22) | 3 | white rice with a salt and sesame heap on top (0) → half mixed (1) → glossy seasoned rice (2) |
| `mix.cake` | 60 x 40 | (30, 22) | 4 | eggs, sugar and flour apart (0) → lumpy (1) → streaky (2) → smooth pale batter (3) |
| `egg` | 24 x 28 | (12, 22) | 3 | a whole egg (0), cracked (1), two open shell halves (2) |
| `greens` | 72 x 32 | (36, 20) | 4 | a bundle of seaweed and green onion on the board: whole (0), cut once (1), twice (2), a chopped pile (3) |
| `jug` | 44 x 44 | (22, 34) | 2 | a pouring jug, upright (0) and tilted with a lip of batter (1) |
| `jeon.pan` | 76 x 56 | (38, 30) | 5 | in the round pan: a small puddle of batter (0), half spread (1), a full round raw pancake (2), golden with a crisp rim (3), deep golden crisp (4) |
| `pan.square` | 100 x 76 | (50, 42) | 1 | an empty rectangular omelette pan with a handle toward the lower right |
| `gyeran.pan` | 84 x 60 | (42, 32) | 7 | in the square pan: egg poured a third (0), two thirds (1), full raw sheet (2), set sheet (3), rolled one third (4), two thirds (5), a full roll (6) |
| `gyeran.board` | 76 x 40 | (38, 26) | 4 | the omelette log on the board: whole (0), 1 cut (1), 2 cuts (2), 3 cuts with the pieces a little apart and their spirals showing (3) |
| `pot.rice` | 76 x 60 | (38, 38) | 4 | a rice pot seen from above, full of steaming rice (0), then one, two, three scoops taken (1 to 3) |
| `paddle` | 28 x 36 | (14, 30) | 2 | a rice paddle, empty (0) and holding a scoop of rice (1) |
| `shaker` | 20 x 32 | (10, 28) | 1 | a small salt and sesame shaker |
| `rice.shape` | 60 x 48 | (30, 32) | 5 | on the board: a loose rice mound (0), pressed rounder (1), a soft triangle (2), a clean triangle (3), the triangle with its seaweed strip (4) |
| `gim` | 24 x 32 | (12, 26) | 1 | one strip of dark seaweed |
| `basin` | 100 x 68 | (50, 40) | 1 | a basin of clear water |
| `fruit.wash` | 68 x 44 | (34, 24) | 3 | strawberries, grapes and a tangerine in the water: dull with specks (0), half clean (1), shiny wet (2) |
| `fruit.board` | 76 x 44 | (38, 26) | 3 | the three fruits on the board: whole (0), tops cut off (1), cut into bite pieces with juicy faces (2) |
| `fruit.piece` | 20 x 20 | (10, 14) | 3 | one bite piece: strawberry (0), green grape (1), tangerine (2) |
| `skewer` | 100 x 20 | (50, 12) | 4 | a wooden skewer lying flat: empty (0), one, two, three fruit pieces threaded (1 to 3) |
| `pot.syrup` | 76 x 60 | (38, 38) | 2 | a small pot of clear amber syrup, two bubbling frames |
| `kkochi.coat` | 100 x 28 | (50, 16) | 3 | the threaded skewer: matte (0), half glazed (1), glossy with glints (2) |
| `tin` | 76 x 60 | (38, 36) | 4 | a round cake tin from above: empty with paper (0), a third of batter (1), two thirds (2), full (3) |
| `oven` | 116 x 100 | (58, 60) | 4 | an oven front with a window: dark (0), lit with pale batter in the tin (1), risen golden cake (2), deep golden (3) |
| `cake.base` | 76 x 56 | (38, 38) | 4 | a sponge on a stand: bare (0), cream on a third of the top (1), two thirds (2), fully creamed with soft peaks (3) |
| `berry.top` | 16 x 18 | (8, 14) | 1 | one strawberry for the top |
| `whisk` | 28 x 44 | (14, 40) | 1 | a whisk (the stirring tool; chopsticks for the egg may reuse it) |

## 3. Small pictures for the recipe book (priority 3)

Each 16 x 16, anchor (8, 13). Ingredients: `ing.flour`, `ing.water`, `ing.greens`, `ing.oil`, `ing.egg`, `ing.salt`,
`ing.rice`, `ing.gim`, `ing.sesame`, `ing.berry`, `ing.grape`, `ing.tang`, `ing.sugar`, `ing.cream`.
Step pictograms (the hand action, readable without words): `step.slice` (knife over a cut line), `step.stir` (a whisk with a
round arrow), `step.pour` (a tilted jug with a stream), `step.flip` (a spatula with an up arrow), `step.crack` (an egg with
a crack), `step.roll` (a curled sheet with an arrow), `step.scoop` (a paddle with rice), `step.sprinkle` (a shaker with
dots), `step.press` (two hands around a triangle), `step.wrap` (a strip going round), `step.wash` (drops over a berry),
`step.thread` (a stick through a berry), `step.glaze` (a shiny drip), `step.bake` (an oven window), `step.spread` (a
spatula with cream), `step.top` (a berry going down onto cream).
Others: `book.emblem` 32 x 32 anchor (16, 16) (a pot with a ladle, for the book cover), `lock.cup` 16 x 16 anchor (8, 13)
(a small coffee cup: "this recipe comes from the cafe").
For the cafe menu (lane C): `cafe.coffee` 32 x 32 anchor (16, 26) (a cup of coffee on a saucer with a curl of steam),
`cafe.card` 16 x 16 anchor (8, 13) (a small recipe card).

## 4. Rules for both sides

- A may add ids; A never removes or resizes an id listed here without telling the lead.
- K and T look sprites up by id and frame and draw a plain fallback when `COOK_SPR` or an id is missing.
- K owns where things are drawn on the stage; A owns what they look like. If a listed size is too small to make the food
  read well, A may grow a canvas by up to 16 px each way and must list the change at the top of its report.
- Every sprite is shown at a whole number of device pixels per art pixel.
