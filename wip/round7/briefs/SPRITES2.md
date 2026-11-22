# Pictures for the content pass (C13) — lane A draws, lanes S, C, F (and T) use

Same file and same global as the food: `js/cook-sprites.js` → `COOK_SPR.get(id, frame)` / `info(id)` / `ids()` (contract C1,
unchanged). Same palette, outline and light as the dishes. No letters or digits in any picture. A consumer that gets `null`
keeps its own plain fallback. Every picture is shown at a whole number of device px per art px.
`ax, ay` = the centre of the footprint (for flat cards: the centre of the card).

## Cafe (drawn first) — lane C

| id | size | anchor | frames | picture |
|---|---|---|---|---|
| `cafe.tray` | 48 x 32 | (24, 22) | 1 | an empty wooden tray with two grips, seen like the dishes (things are drawn on it by the lane) |
| `cafe.cup` | 16 x 16 | (8, 13) | 4 | the coffee cup at table size: full (0), one sip (1), two sips (2), empty (3) |
| `cafe.cup.big` | 32 x 32 | (16, 26) | 4 | the same cup on its saucer as a close-up: full with steam (0), lower (1), low (2), empty with a ring (3) |
| `eat.cake` | 80 x 56 | (40, 44) | 4 | the cake slice of `dish.cake` as a close-up: whole (0), one bite gone (1), two (2), an empty plate with crumbs and the berry stalk (3) |
| `eat.kkochi` | 80 x 56 | (40, 44) | 4 | the skewers of `dish.kkochi`: whole (0), two fruits gone (1), four gone (2), bare sticks on the plate (3) |
| `table.cake` | 16 x 12 | (8, 10) | 4 (was 1) | table size: whole (0, unchanged), bitten (1), a last piece (2), empty plate (3) |
| `table.kkochi` | 16 x 12 | (8, 10) | 4 (was 1) | table size: whole (0, unchanged), one fruit less (1), one fruit left (2), a bare stick on the plate (3) |
| `cafe.stampcard` | 48 x 32 | (24, 16) | 4 | a paper stamp card with three round fields: no stamp (0), one, two, three stamps (1 to 3) |
| `cafe.stamp` | 16 x 16 | (8, 13) | 1 | the stamp tool (wooden knob, red rubber) |
| `cafe.recipe` | 32 x 40 | (16, 20) | 2 | a recipe card as a close-up: a small picture on top and ruled lines; the cake (0), the fruit skewer (1) |
| `rec.sleeve` | 24 x 24 | (12, 12) | 8 | eight record sleeves, each its own colours and plain shapes (sun, waves, hill, stripes, moon, leaf, dots, diamond) |
| `rec.disc` | 24 x 24 | (12, 12) | 2 | a record seen from above, two turn phases (swap them to spin) |

## Shops — lane S

| id | size | anchor | frames | picture |
|---|---|---|---|---|
| `ui.tag` | 40 x 24 | (20, 12) | 1 | a paper price tag, a hole and a string at the left end. **Free area for the lane: x 13..36, y 6..17** (24 x 12: a shell picture and two digits) |
| `ui.sold` | 32 x 16 | (16, 8) | 1 | a red stamp mark (a ring-cornered frame with a check stroke, no letters), drawn over a tag or a mannequin card |
| `ui.receipt` | 32 x 40 | (16, 20) | 1 | a receipt: a paper strip with a torn zigzag foot and faint ruled lines. **Free area: x 5..26, y 6..30** |
| `shop.open` | 32 x 24 | (16, 4) | 2 | a small wooden sign hanging on a string for a shop door: open (0: a lit lantern mark), closed (1: turned, dark) |
| `goods.seed` | 16 x 20 | (8, 17) | 3 | a seed packet with a flower picture: pink (0), yellow (1), blue (2) |
| `goods.dye` | 16 x 20 | (8, 17) | 3 | a corked dye bottle: red (0), blue (1), green (2) |

## Contest — lane F

| id | size | anchor | frames | picture |
|---|---|---|---|---|
| `judge.card` | 24 x 32 | (12, 30) | 3 | a judge's placard on a short stick: one star (0), two (1), three (2) |

Rules: lane A may add ids; an id listed here is not removed or resized without telling the lead. Ask lane A directly
(session id in `CONTENT.md`) for another size, frame or colour.
