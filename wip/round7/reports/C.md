# Lane C report — the cafe (`lane/7-c`)

## Conclusion

The cafe works end to end on its own branch: menu with shell prices and the confirm pattern, a served dish eaten in three
touches, the recipe gift on the third serving (through `APP.recipeEat`), and a record shelf of eight public-domain tunes
played by our own synthesizer under the game's sound rule. It opens without the village through `APP.openCafe()` and
`APP.openRecords()`. One line was added to an existing function (see below).

## Changes

| file | what | why |
|---|---|---|
| `js/cafe.js` (new, `CAFE`) | `MENU`, `order`, `bite`, `pending`, `giftDue`, `giftMark`, `dots`, `leave`, `played`, `normalize`, `merge`; fallback pictures `art(id)`; eight record sleeves `sleeve(i)` | DOM-free rules, testable in node |
| `js/cafe-music.js` (new, `CAFE_MUSIC`) | note data for eight tunes (generated), `play(id, { enabled, volume })`, `stop`, `setVolume`, `state`, `timeline`, `seconds`, `list` | electric-piano tone (two sines, low-pass), seeded record crackle loop, slow pitch wobble; own AudioContext made only inside `play` |
| `js/app.js` `[7-C]` block | `renderCafe`, `cafePick`, `cafeBuy`, `cafeServe`, `renderCafeTray`, `cafeBite`, `cafeFly`, `cafeStand`, `openCafe`, `cafeSeatTap`, `renderLp`, `lpTap`, `lpSound`, `lpStop`, `lpTick`, `openRecords`, `cafeInit` | the screens |
| `js/app.js` `[7-C]` exports | `openCafe`, `openRecords`, `cafeStand`, `cafeSeatTap`, getter `cafe` | tests and tools |
| `index.html` `[7-C]` | `#cafe-tray` (scene), `#cafe-sheet`, `#lp-sheet`, two script tags | |
| `css/style.css` `[7-C]` | menu tiles, tray, crumbs, flying card, record sheet | |
| `tools/cafe-midi.js`, `tools/build-cafe-music.js` (new) | MIDI reader; writes the data block of `js/cafe-music.js` (`--check`) | the notes are reproducible from the sources |
| `wip/round7/cafe-src/` (new) | the eight `.ly` + `.mid` sources | licence lines stay next to the data |
| `docs/CAFE.md`, `docs/CAFE_MUSIC.md` (new) | how it works; the owner's list | |

## Existing lines I changed

One added line, at the lead's request (11-21), marked `[7-C]`: `js/app.js` `adoptRemote`, `if (same) cafeAdopt(S, R);`
after the meal merge, so that counts made in this tab are not overwritten by another tab's save (`CAFE.adopt`: larger
counts, union of gifts, the tray of the received side). It sits where lane T's `recipesAdopt` line goes: keep both.
Nothing was added to `renderAll`: both sheets re-read the state when opened and after every tap, and every spending
path re-checks the balance, so a change from elsewhere cannot make them act on stale data; the tray is re-drawn by
`cafeAdopt` when another tab's save arrives.

## Decisions the owner should confirm

1. **Eight tunes** (list below). Gymnopédie No. 1, the most "cafe" piece, is left out because no typeset dedicated to the
   public domain was found; it can be added by transcribing from a public-domain score.
2. **Prices** 2 / 5 / 4 shells as in the brief; the gift at the third finished serving of the same item.
3. **A half-eaten dish is kept**: standing up with food left does not throw it away; the counter serves it again without
   charging. (The brief only said standing up ends the visit.)
4. **The dish is eaten on a small tray panel at the bottom of the scene**, also when lane V's seat exists (the 3D cup is
   only decoration). The tray has one text button, '일어나기'.
5. **The record sheet shows one line of text**, the tune and composer ('달빛 · 드뷔시'); sleeves carry no letters.
6. **The speaker button turns the game's sound setting on** (the same switch as in settings). The home music bus is
   silenced while a record sounds and restored after.
7. **Early jazz**: almost nothing well known passes the strict rule; ragtime (Joplin, played slowly) stands in.

## Player-facing lines and aria names (all new)

- Sheet titles: '카페', '레코드'. Buttons: '닫기', '그만', '시킬래', '일어나기'.
- Menu names: '커피', '딸기 케이크', '과일 꼬치'; group name '메뉴'.
- Question: '<이름> · 조개 N 시킬까?'. Short of shells: '조개 N 모자라' (screen reader: '조개가 N개 모자라').
- Menu tile, screen reader only: ', 세 번 가운데 N번 먹었어'.
- Gift: '<이름> 레시피를 받았어. 집 조리대의 책에 생겼어.'
- aria: '<이름> 먹기' (eat button), '커피' (cup picture), '소리 켜기' (speaker button), '도는 레코드' / '빈 턴테이블',
  group '레코드', sleeves '<곡>, <작곡가>'.
- Record line: '<곡> · <작곡가>' with 자장가 · 브람스, 달빛 · 드뷔시, 트로이메라이 · 슈만, 전주곡 다장조 · 바흐,
  디 엔터테이너 · 조플린, 엘리제를 위하여 · 베토벤, 아라베스크 1번 · 드뷔시, 전주곡 마단조 · 쇼팽.
- `python3 tools/subset-fonts.py --check`: stale none.

## The tunes (sources and licences)

All note data comes from Mutopia Project typesets whose header says "Public Domain" (the typesetter's dedication); the
files are in `wip/round7/cafe-src/`. Composers died before 1956 and every piece was first published before 1930.

| id | piece | composer (died) | published | excerpt | Mutopia id · typesetter | licence line |
|---|---|---|---|---|---|---|
| lullaby | Wiegenlied Op. 49-4 | Brahms (1897) | 1868 | whole arrangement, 39 s | 2014/08/05-481 · Diego Guillen (his own easy arrangement in C) | Public Domain |
| clair | Clair de lune | Debussy (1918) | 1905 | bars 1–8, 39 s | 2010/12/21-1778 · Keith OHara | Public Domain |
| traumerei | Träumerei Op. 15-7 | Schumann (1856) | 1839 | bars 1–8, 37 s | 2005/12/27-504 · Ying-Chun Liu | Public Domain |
| prelude | Prelude in C BWV 846 | Bach (1750) | 1801 | bars 1–11, 40 s | 2011/09/12-5 · Tobias Erbsland | Public Domain |
| entertainer | The Entertainer | Joplin (1917) | 1902 | intro + first strain, 40 s at 60 bpm | 2016/11/25-263 · Chris Sawer | Public Domain |
| elise | Für Elise WoO 59 | Beethoven (1827) | 1867 | first theme, 30 s | 2015/08/18-931 · Stelios Samelis | Public Domain |
| arabesque | Arabesque No. 1 | Debussy (1918) | 1891 | first 27 bars, 49 s | 2011/10/25-1777 · Keith OHara | Public Domain |
| chopin | Prelude Op. 28-4 | Chopin (1849) | 1839 | bars 1–12, 49 s | 2016/10/28-468 · Magnus Lewis-Smith | Public Domain |

Verification: `tools/test-cafe.js` compares every tune note for note (start and pitch) with its source MIDI, so all
eight are verified against the source bar by bar by machine; ranges and lengths are checked too. WAV files can be
rendered with `--wav <dir>`. **Nobody has listened to them**: this session cannot hear. The tone, the loudness
(`LEVEL` 0.2) and the Brahms arrangement (the typesetter's own chords) need the owner's or lead's ears.
In Für Elise the first-ending bar is skipped (the source MIDI plays both endings in a row).

## Checks

- `tools/test-cafe.js` (new, node): 99 passed.
- `tools/test-cafe-live.js` (new, browser, 360x740 @2 and 412x915 @2.625, 3D at 360 and 320): 58 passed.
- `npm test`: exit 0. `python3 tools/subset-fonts.py --check`: stale none.
- `tools/test-audio.js` once: 131 passed, 0 failed.
- Please add to `npm test` and CI: `node tools/test-cafe.js`, `node tools/build-cafe-music.js --check`; to the browser
  suites: `tools/test-cafe-live.js`.

## Independent check

One fresh subagent played the branch at 360x740, 320x568, 412x915 @2.625 and 1280x800. Four findings, all fixed:

1. `must`: in 3D on phones the tray sat under the big '산책 갈래?' button, so '일어나기' could not be tapped. Fixed in
   `renderCafeTray`: the tray is lifted above `#btn-go` when that button lies inside the scene (new check 10 in
   `tools/test-cafe-live.js`, screenshot `10-tray-3d`). Whether `#btn-go` shows in the village is unknown here.
2. `should`: after the tab was hidden, the open record sheet still showed the record as playing. Fixed (`lpHide`).
3. `should`: at 320 wide '딸기 케이크' wraps to two lines and its price sat lower than its neighbours. Fixed with a
   two-line name box below 350 px (no font size changed).
4. `should`: a tray item this build does not know (from a later build) was deleted on the next order. Fixed in
   `CAFE.order` / `CAFE.leave`: it is kept (moved to `held`), with two new node checks.

Not exercised by the check: the home music bus level after a stop (`AUDIO.state()` does not expose bus levels).

## Run against the real lanes (11-21, local trial merge of lane/7-w, 7-v, 7-t on top of this branch; not committed)

- `tools/test-cafe.js` 99 passed, `tools/test-cafe-live.js` 60 passed on the merged tree (the 3D step now travels to
  the village first when the outside map exists: outside the village a visit ends at once, by design).
- Real flow in 3D at 360x740: `goPlace('village')` → `#btn-cafe-counter` (V walks the character there, then the menu
  opens) → order → `scene.cafeSit(true)` walks and sits, `cafeSeated()` true, the cup shows → three touches →
  real `APP.recipeEat('cake')`: n 1, 2, then 3 with `got` set and the gift line → the stick stands the character up
  and the `ppol:cafe-seat` event ends the visit → `#btn-cafe-seat` sits and stands → `#btn-cafe-lp`, a sleeve, the
  speaker button: the tune plays, keeps playing with the sheet closed inside the village, stops after
  `goPlace('home')` (area `road`). No page errors.
- Fixed from this run: the cup was asked for before the character had sat down (V shows it only while seated); it is
  now set when `cafeSit` resolves.
- Seen, not mine: in the screenshot taken while seated the camera showed the plaza signpost, not the cafe deck (the
  character was off screen after the scripted walk from the signpost). Worth a look in the merged build.
- The one textual conflict was the `adoptRemote` line next to lane T's; keeping both lines works.

## Needs another lane to be fully tested

- V: the three buttons, `scene.cafeSit`, `scene.cafeCup` (called only if present; never run here) and the
  `ppol:cafe-seat` event (on: the tray shows; off: the visit ends), added after the lead's message and not run against
  V's code. Whether the tray covers the seated character on the deck. Standing up does not stop the record: it stops
  on leaving the village area, as the brief says.
- W: `scene.area()` (tested with a stub): music and the visit end when it is not `'village'`. If the cafe deck reports
  another area name, the record would stop at once: the name must be `'village'` on the deck.
- T: `APP.recipeEat` (stubbed). Without it nothing is gifted.
- N: `APP.npcSay` (stubbed; the lead says it returns a Promise and shows above an open sheet). `cafe.hello` is said as
  the menu sheet opens, `cafe.serve` after the order, `cafe.gift` with the gift.
- A: `COOK_SPR` pictures (fallback drawings used here; real sprites are 32 px and get scale 2 in the menu).

## Left out, and why

- No change to `js/audio.js`: music uses its own small AudioContext. A hook there would be cleaner (ducking, night
  level); it needs the lead.
- `CAFE.merge` is not wired into `adoptRemote` (that is an existing line). Two tabs: the last tab to save wins.
- The sheets are not re-rendered from `renderAll()` (existing line); they re-render on every open.
- No eating sound and no vibration (no public play call; hard line 8).
- No credit line in `credits.html` (not required for public-domain sources; the lead may want one for Mutopia).
- Not run: the full `tools/smoke.js`; no scenario was added under its `[7-C]` marker.

## Screenshots (`wip/round7/shots/C/`)

01-menu, 02-served, 04-gift, 05-coffee, 06-shelf, 07-playing-silent, 09-menu-412, 10-tray-3d.

## UI pass 2 (11-21, after the owner's "ui가 너무 조잡한데 저거 좀 개선해줘봐", brief `UI2.md`)

Looks only; rules, saves, lines, ids, aria names and test hooks are unchanged.

- **Picture band** on both sheets (`cafeBand`): wall, lamp, a shelf (cups and bottles for the menu, record spines for
  the records), the counter; the keeper's portrait from lane N (`npcFace`, 48 px, own colour and cap) at the left; the
  shell purse on a paper plate at the right (menu only); the title on a sign plate hanging over the band.
- **Menu = chalkboard** in a wooden frame with a chalk line: chalk names, prices as hole-punched tags, the three dishes
  standing on the counter plank, and under each dish a small **stamp card** (three stamp circles and the recipe card
  picture, no words) in place of the three dots. The stamp just earned drops in with a short sparkle the next time the
  menu opens. Tiles pop in 40 ms apart.
- **The question** is an order slip on the board with the dish picture.
- **Records**: a larger turntable whose arm comes down in steps when a record is put on, a wooden speaker box beside
  it (the '소리 켜기' button when sound is off, a still picture that bobs when a tune sounds), and a two-plank wooden
  rack with the sleeves leaning (sheared by whole pixels, a disc showing behind each); the chosen sleeve is lifted.
- The tray over the scene is a wooden tray.
- Reduced motion: none of the animations.
- Not done from the rules: the shell number does not count down on a purchase (the sheet closes at that moment; the
  purse chip on the scene just shows the new number). The frame of `.sheet` itself is lane U's.
- Food pictures: `COOK_SPR` is loaded on the game page by lane T's script tag; until T is merged the page shows my
  fallback drawings. `tools/test-cafe-live.js --sprites` loads the sprite file for pictures.
- Checks after the change: `tools/test-cafe.js` 99, `tools/test-cafe-live.js` 58, `npm test` exit 0, font check not
  stale. Looked at 360x740, 412x915 @2.625, 320x568 and the dark scheme.
- Pictures: `wip/round7/shots/C/ui2-before-menu-360.png` / `ui2-after-menu-360.png`, `ui2-before-menu-412.png` /
  `ui2-after-menu-412.png`, `ui2-before-record-360.png` / `ui2-after-record-360.png`, `ui2-after-ask-320.png`.
- Smoke on the branch before this pass (letters A–I, L–P, V, W ran: all passed; the run was stopped for the base
  merge, the remaining letters were not run).

## Content pass (11-21 late, after the owner's "탭같은 느낌으로 축약하지 말고 … 개별 콘텐츠 같은 느낌", brief `CONTENT.md`)

The cafe now plays in the room when the 3D scene has one (`scene.inRoom() === 'cafe'` with `scene.project` and
`scene.spriteProp`); the sheets and the tray panel stay as the fallback (2D, or any of those functions missing). Rules,
saves and music are unchanged, except that coffee is now three sips (it used to be a still cup).

- Beats (all in `js/app.js` `[7-C]`): chalkboard button → board close-up card `#cafe-card` (`cafeCardOpen('menu')`, a
  plain element in `#scene`, not a dialog) → order and confirm (`cafeBuy`) → the keeper works for 1.5 s with steam
  (`cafeBrew`) → the tray on the pick-up spot (`spriteProp`) → the counter button takes it (`cafeCarry`: `playerCarry`,
  `cafeSit(true)`, set down as `spriteProp('cafe-plate', table, id, frame)`) → each tap on `#btn-cafe-plate` is a bite
  (`cafePlateTap` → `cafeBite`, frame 1..3, crumbs) → the stamp card pops up with the new stamp (`cafeStampCard`), on
  the third the gift line and the flying recipe card → rack button → rack close-up card (`cafeCardOpen('lp')`) → a
  sleeve spins the room's disc (`scene.cafeRecord(on, colour)`) → the seat button, walking or the door end the visit
  (`ppol:cafe-seat`, `ppol:room` → `cafeRoomLeave`); a half-eaten plate is put back on the table on the next entry
  (`cafeRoomEnter`).
- Interruptions tested: leaving while the keeper works, leaving while carrying, standing up mid-meal, tapping the
  plate while standing (sits first), the board while a plate waits (no new order). In every case only saved facts
  remain: what was paid for is in `S.user.cafe.tray`.
- New player-facing names: card aria '메뉴 칠판' / '레코드 선반' / '도장 카드', button '닫기' on the card, plate button
  '<이름> 먹기' or '커피 마시기', counter button '쟁반 가져가기' while a tray stands there.
- New keeper keys used if lane N has them: `cafe.order`, `cafe.stamp`, `cafe.record` (besides hello / serve / gift).
- Sprite ids used if lane A has them, with fallbacks to the menu pictures: `cafe.tray`, `cafe.cup` (frames 0..3),
  `table.cake`, `table.kkochi` (frames 0..3).
- Checks on this branch alone: `tools/test-cafe.js` 100; `tools/test-cafe-live.js` 92 (section 11 plays the chain
  with real taps in the 3D scene with W / V / T scene functions stubbed).
- **Run against the real room** (15:25 UTC, local trial merge of the base + lane/7-w, 7-v, 7-t, 7-a, 7-n on top of this
  branch; merged without conflicts; not committed): `tools/test-cafe-live.js` 86 passed. On such a build the test
  skips the stub section and runs section 12 in the real cafe room: village → `APP.goInside('cafe')` → the board
  button (walk-first, then the card) → order → the keeper's line and the tray on the counter → the counter button →
  carried, seated, plate set down (`scene.debugSprites()` shows `cafe-plate` = `table.cake` frame 0) → three taps on
  the plate → stamp card and N's stamp line, T's recipe count 1 → stand → order a skewer, one bite, leave by the door,
  come back: the plate waits on the table at frame 1 → finish → the rack card, a sleeve, the disc on V's turntable →
  leaving stops the record. No page errors.
- Fixed from the real run: the stamp card was stretched to the bottom of the scene; the keeper's greeting was said
  before the board card opened, so N's dialogue box covered the card's close button (now the card opens first and
  the box moves to the top).
- Bound by me because nobody else had: the terrace door `#btn-in-cafe` → `APP.goInside('cafe')`.
- True room pictures (real scene, no stubs, 360x740): `wip/round7/shots/C/real-r1-inside.png`, `real-r2-board.png`,
  `real-r5-tray.png`, `real-r6-carry.png`, `real-r7-plate.png`, `real-r8-bite.png`, `real-r9-stamp.png`,
  `real-r10-rack.png`, `real-r11-disc.png`.
- Not done yet for this pass: the independent check and the whole smoke suite.
