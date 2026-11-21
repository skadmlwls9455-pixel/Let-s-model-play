# Lane C report — the cafe (`lane/7-c`)

## Conclusion

The cafe works end to end on its own branch: menu with shell prices and the confirm pattern, a served dish eaten in three
touches, the recipe gift on the third serving (through `APP.recipeEat`), and a record shelf of eight public-domain tunes
played by our own synthesizer under the game's sound rule. It opens without the village through `APP.openCafe()` and
`APP.openRecords()`. No existing line of any file was changed.

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

None.

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

- `tools/test-cafe.js` (new, node): 90 passed.
- `tools/test-cafe-live.js` (new, browser, 360x740 @2 and 412x915 @2.625): 55 passed.
- `npm test`: exit 0. `python3 tools/subset-fonts.py --check`: stale none.
- `tools/test-audio.js` once: AUDIO_RESULT
- Please add to `npm test` and CI: `node tools/test-cafe.js`, `node tools/build-cafe-music.js --check`; to the browser
  suites: `tools/test-cafe-live.js`.

## Independent check

CHECK_RESULT

## Needs another lane to be fully tested

- V: the three buttons, `scene.cafeSit`, `scene.cafeCup` (called only if present; never run here). Whether the tray
  covers the seated character on the deck.
- W: `scene.area()` (tested with a stub): music and the visit end when it is not `'village'`. If the cafe deck reports
  another area name, the record would stop at once: the name must be `'village'` on the deck.
- T: `APP.recipeEat` (stubbed). Without it nothing is gifted.
- N: `APP.npcSay` (stubbed). `cafe.hello` is said just before the menu sheet opens: if N's box is not in the top layer
  it sits under the sheet.
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

01-menu, 02-served, 04-gift, 05-coffee, 06-shelf, 07-playing-silent, 08-playing, 09-menu-412.
