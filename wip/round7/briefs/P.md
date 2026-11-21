# Lane P — the player's character (`lane/7-p`)

Read `COMMON.md` first, then `ANSWERS.md`, the owner's words (`wip/round7/README.md` B6, B7, C1, C2, E5),
`wip/round7/maps/player-economy.md` sections 1, 2 and 11, `wip/round7/maps/world.md` sections 4 and 7, and the latest dated
notes of `docs/PLAYER_PARTS.md` (the eye rules the owner already corrected three times: no whites, round not tall, colour
sparkle instead of white glints — keep them).

## Why

The owner: "지금은 여캐만 가능한데 남캐도 자유롭게 커스터마이징 가능하도록 … 눈매나 형태가 약간 캐릭터 구현하기에 적합하지 않은
느낌 … 기존 커스터마이징 아이템들 조사해서 사람들이 즐겁게 할 수 있도록." And: "뛰는 모션을 넣어서 일정 시간 이상 꾹 드래그
하거나 오래 누르고 있으면 자동으로 뛰었으면." And the dye corner: "하얀 티셔츠에 문어 그려진 옷을 마네킹 위에."

## You own

- `js/scene3d.js`: the player character block (`PL_*`, `PLAYER_PARTS`, `PLAYER_DEFAULT`, `PLC`, `setPlayer`, the part
  builders, the gait and facing code, `playerPortrait`, speeds `PL_RUN` / `PL_SPEED`), the loft mannequin's clothes; new
  functions under `[7-P]`. Not the walk areas, colliders, camera or follow code (lane W).
- `js/app.js`: the player look code (`PLAYER_*` fallback lists, `normalizePlayer`, `setPlayerPart`, `renderPlayerParts`, the
  look sheet `openLook` / `lookRender*`, `LOOK_SETS` and the set book, `dyeItems`), the `stick` section (the footprint
  handle and keys); new code under `[7-P]`.
- `docs/PLAYER_PARTS.md`, `tools/player-shots.js`, the smoke scenario P and the checks that pin part lists and speeds.

## What to build, in this order (push after each)

1. **Run.** Holding the footprint handle (or a direction key) for 0.6 s switches the character from walking to running:
   about 1.7 times the walk speed, its own gait (longer stride, a small hop in the body, arms swinging; the same 4-frame,
   distance-driven scheme), and back to walking when the input is released or eased below half deflection. Auto-walks
   (door taps, the table) run when the path is longer than 4 m. The camera follow must keep up: tell lane W's contract by
   exporting the two speeds as `scene.playerSpeeds()` → `{ walk, run }` (under `[7-P]`); lane W reads it. Rooms are small:
   check that running indoors does not overshoot doors or stairs or clip furniture.
2. **Looks that are not only a girl.** Spend at most 20 minutes reading how well-liked avatar and dress-up systems group
   their items (silhouette variety, hair as the main identity lever, a few strong eye types, layering) — principles only —
   then build:
   - **Body:** a second torso shape (straighter, slightly broader shoulders) as a free category `body` (`a` the present
     shape, `b` the new one). Every outfit must fit both.
   - **Hair:** at least six new short and medium styles (for example a crop, a side part, a tousled short cut, a centre
     part, curls, an undercut or a low tail) in the existing hair colours, each working with every bangs option or declaring
     its own.
   - **Eyes:** at least four new eye styles with more character (for example a level calm eye, an upturned eye, a
     drooping gentle eye, a narrow smiling eye), inside the existing rules (no whites, no tall ovals, colour sparkle), and a
     new free category `brow` (none, soft, straight, bold) because brows carry most of the masculine / feminine read.
   - **Clothes:** at least eight new outfits that are trouser or shorts based or neutral (for example a white T-shirt with
     an octopus print and jeans, a shirt and slacks, a sailor-collar top with shorts, a fisherman's knit, overalls with a
     tee, a raincoat with boots already exists — add a windbreaker, a cardigan over a tee, a simple suit jacket), plus two
     new shoes and at least six new accessories (cap, bandana, headphones, scarf, square glasses, a small shoulder bag).
     Keep one `outfit` id owning torso, sleeves and legs (do not split saves into top and bottom).
   - Nothing that exists today is removed or renamed; saved looks load unchanged; the default look for a new player becomes
     neutral (your choice; say which).
3. **Catalogue for the shop and the contest** (contract C4): `tags` and `shop` on every wearable item. **Every id that
   exists today stays free for everyone (`shop: null`)**; of the new clothes, shoes and accessories about two thirds are
   shop stock (`shop: { price }`, 12 to 36 shells by how special they are) and the rest free; body, hair, bangs, colours,
   eyes, brows, nose, mouth, cheek are never sold. Export `APP.wardrobe`, `APP.wearing`, `APP.itemThumb`, `APP.ownItem`
   (ownership in `S.user.owned`, union-merged between two tabs of the same octopus, never shrinking). `setPlayerPart` refuses
   an unowned shop item; the look sheet shows unowned shop items as locked tiles with the shell price (touching one says in
   one short line where to get it: '마을 옷가게에서 팔아.'); the sewing machine lists only owned items.
4. **The mannequin.** In the loft's dye corner the mannequin wears **a white T-shirt with a small octopus drawn on the
   chest** (the same T-shirt as your new outfit) instead of the white dress, so that the corner reads as "clothes". The
   `#btn-sew-doll` spot and its label stay.
5. **Look sheet.** With more items the tiles must stay easy: the existing tabs gain `body` and `brow`; long lists scroll
   inside the tile area; locked tiles are visibly different without words.

## Checks

`npm test`, `node tools/test-dye-adopt.js`, `node tools/player-shots.js` (update its pins for new parts: no eye pixel outside
the head outline, no white in eyes, every hair × body × outfit combination renders without holes at 1x and 2x — sample at
least 60 combinations and look at one contact sheet), smoke scenario P, the stick checks that pin 2.2 m/s (now: walk 2.2,
run about 3.7). Screenshots at 360x740: four different characters side by side (two reading masculine, two feminine), the
look sheet with a locked tile, the mannequin, a run frame.

## Report

As in `COMMON.md`, plus the full item table (category, id, name, tags, price or free) for lanes S and F.
