# Lane V — what stands in the village (`lane/7-v`)

Read `COMMON.md` first (contract C6 is your layout and your API), then `ANSWERS.md`, the owner's words
(`wip/round7/README.md` D1, D2, D4, D5, E3; `docs/next/owner-2026-11-18.md` section 4.3: the wide outside looked "too
empty"), and `wip/round7/maps/world.md` sections 2, 5, 6, 9, 10.

## Why

The owner wants a village outside the house with a clothes shop, a general store and a cafe, octopus shopkeepers, and a
story: the octopuses of this village once helped the people so hard that they grew tired and fell asleep one by one; the
people struggled without them and left. The player settled here by chance. Lane W lays the ground (road, street, plaza,
beach). **You build everything that stands on it**, so that the street looks like a small seaside village that was loved,
went quiet, and is waking up a little: three open shops among shuttered houses.

## You own

- `js/scene3d.js`: **new functions only**, under `[7-V]` (the code region before `function pick(` and the API slot). You
  fill the registry `WIDE_REG` (builders, spots, boxes, circles, segments, frame callbacks) and never edit lane W's
  functions, `buildYard`, the camera or the walk areas. If you need something from W that the registry cannot express,
  write it in your notes and tell the lead at once.
- `index.html` under `[7-V] 단추`: the buttons of C6. `css/style.css` under `[7-V]` if a button needs a rule.
- New files as you like for data (`js/village.js` → global `VILLAGE`: lot table, prop lists, NPC spots; DOM-free).
- `tools/test-village.js` (node: the tables), `tools/test-village-live.js` (browser), `docs/VILLAGE.md`.

## What to build, in this order (push after each)

1. **Lots and shells of buildings** on the C6 layout, each as one merged static mesh per building where possible
   (budgets: the whole outside must stay ≤ 150 draw calls with lane W's ground; aim for ≤ 40 calls for everything of
   yours on screen at once; no new shader programs; reuse the house and prop materials and the palette). Pixel look as the
   house in the yard: chunky forms, 2 to 3 tones, readable silhouettes at 27 art px per metre, snapped like other static
   props.
   - **Clothes shop** (left, s 22–28): a shopfront with a striped awning, a window with a mannequin wearing a T-shirt, a
     hanging sign with a pixel T-shirt (no letters), a small counter outside or in the doorway where the shopkeeper stands.
   - **General store** (right, s 22–28): crates and baskets in front, hanging tools and a sign with a pixel basket, a
     counter for the shopkeeper.
   - **Cafe** (right, s 30–37): an open deck toward the street under a roof whose front is open (the camera must see the
     inside from every rotation: cut the roof or walls away like the rooms do, or keep them low): a counter with a coffee
     machine and the cafe keeper's spot behind it, two small tables with chairs, a shelf with a record player and a few
     record sleeves, a sign with a pixel cup, warm lamps at dusk and night.
   - **Empty houses** (left s 30–36 and one or two more outlines behind the lots): shuttered windows, a faded sign, a
     porch with a blanket where an octopus sleeps (`sleep-2`), a mailbox with old letters. Quiet, not ruined: cared for.
   - **Plaza** (s 38–46): a notice board, a low wooden stage with two lamp posts (the weekend contest happens here), a
     bench, a well or fountain basin, bunting between posts.
   - **Street props** that make it lived in: lamp posts, flower pots, a bicycle, laundry on a line, a cat-sized crate
     stack, nets and buoys nearer the beach. Enough that no screenful of the street is bare ground, never so much that the
     walk area is cramped (colliders only where a player would expect to bump).
2. **Spots and buttons** (C6): shop counters, cafe counter, a cafe seat, the record player, the stage, the notice board,
   and the three shopkeepers. Buttons are invisible `scene-spot`s with `aria-label`s ('옷가게', '잡화점', '카페 주문',
   '카페 자리', '레코드', '콘테스트 무대', '마을 게시판', and the NPC buttons named by lane N later: give them '가게 문어').
   A tap from farther than 1.5 m walks the character to the spot first (use the existing auto-walk), then clicks.
3. **NPC octopuses** (C6 API): `npcSpots`, `npcSet`, `npcMark`. Bake a small merged octopus mesh (head, eyes, arms) from the
   same shapes as the attic octopus but as static geometry with a per-instance colour (the attic octopus object itself must
   not be reused or moved; it never comes outside). Poses: `stand` (a slow 2-frame bob, still with reduced motion) and
   `sleep` (flattened, eyes closed, a slow breath). Hats: `none`, `beret`, `apron`, `cap`. Each NPC has a collider circle.
   `npcSet([])` removes them all. They never show a feeling face: eyes open or closed only.
4. **The cafe seat**: `scene.cafeSit(true)` walks the player's character to the free chair and seats it facing the table
   (like the play-room table does); `cafeSit(false)` stands it up. While seated, a cup can be shown on the table:
   `scene.cafeCup(on)`.
5. **Night and weather**: windows of the three shops glow at dusk and night; the empty houses stay dark; lamps along the
   street. Rain and snow look right on the roofs (no floating particles inside the deck).

## What to cut first if time runs short

Street props beyond lamp posts and pots, the second and third empty house outlines, hats, the cup. Never cut the three
shops, their buttons, the NPC API or the budgets.

## Checks

`npm test`, `node tools/test-scene-perf.js`, `node tools/test-light.js` (must still pass with your builders registered),
your two new tests (tables consistent with C6; with the page open on the village: every button is positioned on screen when
its spot is, a tap walks and clicks, NPCs appear and disappear with `npcSet`, draw calls within budget at s 25, 34 and 42 at
four rotations, no errors with `wide=0` and with the 2D fallback). Until lane W's branch is merged your builders are not
called: test with a tiny stub in your test page that calls `WIDE_REG.builders` on a plain ground, and say so. Screenshots at
360x740: each shop, the cafe deck at night, the plaza, a sleeping octopus.

## Report

As in `COMMON.md`, plus: the lot table as built, every collider, the draw-call count per stretch, the exact API you export.
