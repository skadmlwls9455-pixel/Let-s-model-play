# Lane A — food pixel art (`lane/7-a`)

Read `COMMON.md` first, then `SPRITES.md` (your work list and the contract), `RESEARCH.md` section 1b (the owner's complaint
and the description of the reference pictures), and `wip/round7/research/09-food-pixel-art.md` with its sample under
`wip/round7/research/foodart/` (the authoring pipeline and a technique checklist; start from that code).

## Why

The owner: "음식 … 형태감이 일정하고 실제 음식을 안 닮아서 먹음직스럽지 않고 이게 뭐지? 싶은 느낌." Every dish today is a flat
ellipse on a round plate. The owner sent references of appetising pixel food (described in `RESEARCH.md` 1b). This lane
draws every food picture of the new kitchen so that a player recognises the dish at a glance and wants to eat it.

## You own (new files only — you edit no existing file)

- `js/cook-sprites.js` — global `COOK_SPR` (contract C1): the palette, the sprite table (rows of characters), the decoder,
  `get` / `ids` / `info`. No DOM, no dependencies, works in node and from `file://`. ASCII-only comments.
- `tools/make-food-sheets.js` — renders contact sheets (every id, every frame, at 4x, on a light and on a dark background)
  to `tests/evidence/food/` as PNG without dependencies (see how `tools/make-dish-icons.js` writes PNG files).
- `tools/test-cook-sprites.js` — node checks: every id of `SPRITES.md` exists with the listed size, anchor and frame count;
  only palette colours; every frame has an outline that is not pure black; no fully empty frame; frames of one id differ
  from each other; file size under 250 KB.
- `docs/FOOD_ART.md` — one page: the format, how to add a sprite, the technique checklist, how to render the sheets.

## How to work

1. Lock the pipeline in the first half hour (format, palette letters, decoder, sheet renderer, the node check).
2. Draw in the priority order of `SPRITES.md`: **the five finished dishes first**, then cooking states recipe by recipe
   (jeon, gyeran, jumeokbap, kkochi, cake), then the 16 px pictures. Push after each group so that lanes K and T can load
   your file while you continue.
3. Every sprite: author it, render it at 4x and 6x, **look at the PNG with the Read tool**, compare against the checklist
   (three-quarter volume, own silhouette, own container, nameable ingredients, 3 to 5 tones with hue shift, specular
   pixels, warm dark outline, upper-left light), and improve it. Two improvement passes per finished dish, one per state
   sprite. Stop polishing a sprite when a stranger would name the food from the 2x picture.
4. You may run two or three subagents in parallel for the drawing (one per dish family), each with `SPRITES.md`, the
   checklist and the pipeline; you review their sheets and fix what does not read. Keep one hand on style: same outline
   colour, same light direction, same plate and shadow treatment across all sprites.
5. Never copy a sprite from the references or from anywhere else; draw from the description of the real food.
   No octopus, squid or other cephalopod, and no visible animal, in any picture.

## Done means

- `node tools/test-cook-sprites.js` passes; the sheets are committed under `tests/evidence/food/`.
- Your report shows the five dishes at 4x in one picture and says, for each, what makes it readable; it lists any canvas you
  had to grow (allowed up to 16 px each way) and any id you added.
- If time runs short: all of priority 1 and the states of `jeon` and `gyeran` must be good; say exactly which ids are
  missing so that lane K keeps its fallback for them.
