# Lane C — the cafe (`lane/7-c`)

Read `COMMON.md` first (contracts C1, C3, C5, C6, C7, C8), then `ANSWERS.md`, the owner's words (`wip/round7/README.md` D4,
E4) and `wip/round7/maps/player-economy.md` sections 3, 4, 9, 10.

## Why

The owner: "마을 기관 중에 카페를 만들어서 그 안에서 커피 마시면서 조용히 LP 판 노래 듣는 기능 … 유명한 재즈나 클래식 사람들에게
사랑받는 것들 중에 저작권 만료된 곡들 리스트업해서 게임 분위기와 맞는 것 위주로 추려 주라." and "카페에서 음식을 몇 번 이상 먹고
나면 NPC 가 요리 레시피를 선물해 줘서 각 메뉴를 집에서도 요리할 수 있었으면."

## You own

New files: `js/cafe.js` (global `CAFE`, DOM-free rules), `js/cafe-music.js` (global `CAFE_MUSIC`: the tunes as note data
and a small synthesizer on the game's audio context), `tools/test-cafe.js`, `tools/test-cafe-live.js`, `docs/CAFE.md`,
`docs/CAFE_MUSIC.md`. `js/app.js` under `[7-C]`; `index.html` and `css/style.css` under their `[7-C]` markers. You edit no
existing line of any file (if `js/audio.js` must expose something, add a wrapper in your own file and tell the lead).

## What to build, in this order (push after each)

1. **The menu.** `#btn-cafe-counter` (lane V; may be missing: guard) opens a small menu sheet: coffee (2 shells), a slice
   of strawberry cake (5), a fruit skewer (4). Pictures (`COOK_SPR` `dish.cake`, `dish.kkochi`, `cafe.coffee`; draw a plain
   cup yourself if the sprite is missing), shell prices, the existing confirm pattern (map 3.5). Ordering spends shells and
   seats my character (`scene.cafeSit(true)`, `scene.cafeCup(true)` if they exist; without them the order is served in a
   small picture panel at the bottom of the screen).
2. **Eating and the recipe gift.** A served cake or skewer is eaten in three touches (the picture loses a third each time;
   a soft crumb burst; no sound unless sound is on). When it is finished: `APP.recipeEat(id)` with the recipe id `cake`
   or `kkochi2` (contract C3; the pictures are `dish.cake` and `dish.kkochi`). If it returns
   `gift: true`, the cafe keeper gives the recipe: `APP.npcSay('cafe', 'cafe.gift', { dish })` if it exists, and in any
   case one plain line in the house voice ('딸기 케이크 레시피를 받았어. 집 조리대의 책에 생겼어.') and a small recipe-card
   picture flying to the bag chip. Before that, the menu tile shows quietly how far along it is with three small dots
   filled in (no numbers, no urging). Coffee is just coffee: the cup sits on the table while seated. Records in
   `S.user.cafe` (C8). Standing up (`#btn-cafe-seat` again, or walking away) ends the visit.
3. **The record player.** `#btn-cafe-lp` opens the record shelf: six to eight sleeves (pixel pictures you draw: plain
   shapes and colours, no letters), one per tune. Touching a sleeve puts the record on: a turning disc, the arm coming
   down, and the tune plays through the game's audio **only if the game's sound setting is on**. If it is off, the disc
   still turns and a speaker picture button in the sheet offers to turn sound on (the same setting as in the settings
   sheet; touching it is the player's own choice). Leaving the cafe area, opening a full-screen game or hiding the tab
   stops the music. One tune at a time; it loops gently; a second touch stops it.
4. **The music itself.** Compositions whose copyright has ended, **played by our own synthesizer** (no recordings: a
   recording has its own rights). Research first (30 minutes at most), then write `docs/CAFE_MUSIC.md` for the owner: a
   list of about 20 well-loved classical and early jazz or ragtime pieces with composer, year of death, year of first
   publication and why each is free of copyright for a game served worldwide (use the strictest common rule: the composer
   died more than 70 years ago **and** the piece was published before 1930), marked with the eight you chose for the cafe's
   quiet mood (for example slow piano pieces, a lullaby, a gentle rag played slowly). Note data: take it from a source
   that is itself dedicated to the public domain (check each file's licence line and record it in the document), or
   transcribe the famous opening section yourself from a public-domain score; 30 to 60 seconds per tune, melody plus a
   simple accompaniment. The synthesizer: a soft plucked or electric-piano tone with a little vinyl crackle and wow, well
   below the game's effects in loudness; nothing is created before the first gesture with sound on.
   Listen with your own checks: render each tune to a WAV with a node script and at least confirm note counts, key and
   range against the source; say in your report which tunes you could verify bar by bar.
5. **Words and honesty.** Lines in the house voice state facts. The cafe keeper's own lines belong to lane N (`cafe.hello`,
   `cafe.serve`, `cafe.gift`): call `APP.npcSay` if it exists and show nothing in its place if it does not.

## What to cut first if time runs short

Tunes beyond four, the flying recipe card, the wow effect. Never cut the confirm pattern, the sound rule or the recipe gift.

## Checks

`tools/test-cafe.js` (prices, the eating count through a stub of `recipeEat`, the gift exactly once per recipe, records
kept, merge), `tools/test-cafe-live.js` (order, eat, gift line, record on and off with sound off and on, music stops when
leaving, no audio request before a gesture with sound on — reuse the recording stub used by `tools/test-audio.js`),
`npm test`, and `tools/test-audio.js` once (your music must not break its rules). Screenshots at 360x740: the menu, a
served cake, the gift line, the record shelf.

## Report

As in `COMMON.md`, plus the tune list with sources and licences.
