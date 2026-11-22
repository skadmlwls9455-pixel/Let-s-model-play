# Lane K report — the kitchen game (`lane/7-k`, base e7b8507)

## Conclusion

Everything in the brief is built, steps (a) to (e), nothing cut: the recipe book is the kitchen's first screen, five new
dishes cook from raw ingredients in four to six small steps with six new gestures, the step strip is gone, the plate ends
on two picture buttons that post `serve`, and the stickers are larger on every phone size. The three legacy dishes, their
numbers, pots, notebook lines and node suites are untouched. All kitchen suites are green (totals below).
The pictures of food come from lane A's `js/cook-sprites.js`; without it every sprite is a plain box and the game still
runs (both paths are tested).

## The recipe table (all five made it; all six kinds made it)

| id | name | steps (kind @ station) | effect |
|---|---|---|---|
| `jeon2` | 해초전 | slice x3 @board → stir x3 @counter → pour @stove → flip @stove (bell at golden) → slice '+' @board | sparkle |
| `gyeran` | 계란말이 | tap (3 eggs x 2) @counter → stir x3 → pour @stove (square pan) → swipe x3 @stove → slice x3 @board | bubble |
| `jumeokbap2` | 주먹밥 | drag x3 @counter (paddle, pot to bowl) → rub @counter (shaker) → stir x2 → tap (3 x 2) @board → drag x1 @board (gim) | star |
| `kkochi2` | 과일 꼬치 | rub @counter (basin) → slice x2 @board → drag x3 in order @board → stir x2 @stove (syrup) | petal |
| `cake` | 딸기 케이크 | tap (eggs) → stir x3 → pour @counter (tin) → bake @oven → rub @board (cream) → drag x3 @board (berries) | confetti |

Kinds: legacy `tap` `flip` `slice`; new `stir` `pour` `drag` `rub` `swipe` `bake` (numbers in `COOK_STEPS.NUM`, outside
`TUNE`). Details: `docs/COOK_BOOK.md`.

## Changes (file, function, what and why)

- **`js/cook-steps.js` (new)** global `COOK_STEPS`: `RECIPES` (the five dishes as data: per step kind, station, word key,
  pictogram id, food box, kind numbers, art descriptor), `NUM`, `WORDS`, `install(h)` (the six kinds, written against the
  helpers `js/cook.js` hands in), `defaultLook` / `validLook` / `validTag` / `between` / `verb` / `hintAt` / `tuneText`,
  `NEXT` (legacy id → its book dish), `FREE`. No DOM, clock or random calls.
- **`js/cook-steps-art.js` (new)** `COOK_ART.dishes[id]` for the five ids (one shared painter: `stepScene`, `revealScene`,
  `base`, `dish`, `dishSmall`) and `COOK_ART.steps` (`spr` / `sprOf` with the fallback box, `book`, `bookLay`, `endIcon`,
  `hand2`, `fxPic`). 18 small scene painters keyed by the step's art type.
- **`js/cook.js`, simulation half** (all additive; `TUNE`, `TUNE_HASH`, `VERSION` unchanged): `EXT` (= `COOK_STEPS` or
  null), `RECIPES` gets the book dishes appended, `WORDS.dish` merged, `tuneOf` (own hash per book dish = steps + NUM),
  `foodOf` (a step's own box), `initStep` (a step's own tap marks), `betweenOf`, `stepWord` / `startEv` / `verb` (per-step
  words), `lookOf` / `defaultLook` / `normLook` / `stepLook` (looks per step for `v2` recipes: `{ v: 2, s, plate, band? }`),
  `describe` (bake band), `hintAt`, `validLook` / `validTag` (delegate), `SEEN_MAX` 16 (was 8, in `normStore` and
  `importData`). Without `js/cook-steps.js` none of this changes anything (the old node suites load `js/cook.js` alone).
- **`js/cook.js`, live half**: the book (`bookOpen`, `bookSync`, `bookTurn`, `bookGo`, `bookFrame`, `bookUpdate`,
  `paintBook`, `bookDown` / `bookUp` / `bookClick`, `pick`), the end buttons (`updEnd`, `fitEnd`, `serve`, `setCtx`),
  `open` (book unless a recipe is asked for or a pot has a finished step; `opts.ctx`, `opts.host`, `opts.onServe`,
  `opts.book`), `handSpec` + `startHand` + `paintStage` (ghost hands of the new gestures), `onEvent` (new events: juice,
  buzz, particles), `onStart` / `onReveal` (book dishes slide with a snapshot of the leaving scene, no carry),
  `paintDish` (one branch hands every book-dish step to `stepScene`), `verbPic` / `updVerb` (the chip shows the step's
  pictogram; hidden on the plate), `fit` (stickers), `bellNow` (bake), `update` (pour sound while held), `live()` (`book`,
  `end`, `canCall`, `served`, bake `band`). Removed: `buildStrip`, `stripOn`, the strip element, `again()`.
- **`css/cook.css`**: strip rules removed; `.ck-end`, `.ck-bk` added.
- **`cook.html`**: loads the two new files; reads `&ctx=`, `open { ctx }`, `ctx { canCall }`; posts `serve`; `?book=0`.
- **`js/audio.js` (cook part only)**: `SYN`, `makeSyn`, `ckSyn` and two lines in `onCook`: synthesized `pour` and `scrub`
  (no files, like the ding). Recorded `stir`, `place`, `lift`, `back`, `clink` are now used. `simmer` is never sent.
- **`tools/cook-shots.js`**: set `book` (16 captures: book, locked page, one step of each of the nine kinds, five plates);
  09 / 10 check the end buttons.
- **docs**: `docs/COOK_BOOK.md` (new), pointers at the top of `docs/COOK_PROTO.md` and in `docs/COOK_STICKERS.md`.

## Existing lines I changed in shared files

None of the marker files (`js/app.js`, `index.html`, `css/style.css`, `js/scene3d.js`, `tools/smoke.js`). `js/audio.js`
is shared but the brief gives me its cook part: one new block before `onCook`, two changed lines inside `onCook`
(`SYN` acts are not kept as "early" acts; they are played through `ckSyn`).

## Contract notes for lane T and the lead

- `result.look` of the five new ids is `{ v: 2, s: [...], plate, band? }` (`band` 0..2 for `jeon2` and `cake`). Largest
  seen: 140 bytes. Legacy looks unchanged.
- The game's `COOK_TUNES` table does not know the new ids; the pot hash of a new id is `COOK.tuneOf(id)` inside the frame.
  A game that gates `&recipe=` or "resume" on that table should let the new ids through (or stop passing `recipe`, which
  shows the book).
- `ctx` may arrive at any time; the kitchen reads the latest when it shows the end buttons and also afterwards.
- With lane A not merged the kitchen shows plain boxes (by design). The captures in `docs/shots/cook/2x-3x` and
  `wip/round7/shots/K/` were made with lane A's pushed sprite file placed locally (not committed here).
- Add to `npm test` / CI `fast`: `node tools/test-cook-steps.js`. Add to CI `suites`: `tools/test-cook-book-live.js`.

## Decisions the owner should confirm

1. Bookmark tabs are a row under the page (five, 15 art px each), not on the side: the dish picture needs the full width.
   On screens shorter than about 600 px the page is the compact form (step pictograms in one overlapping row).
2. An asked-for recipe (`recipe` in the URL or the `open` message) starts at once without the book; so does a pot with a
   finished step. An untouched pot (step 0) shows the book.
3. End buttons for every dish, legacy ones too. Standalone `cook.html` shows both.
4. Stickers: up to `floor(4 x dpr)` device px per sticker px, starting in the HUD row: 128 CSS px at 360 wide (96 before),
   80 at 320x568 (hidden before); they end 8 px above stage row 36 (no touched food stands above that row). Larger than "one step"; the owner said "too small to see".
5. Every outcome is equally good: the bake and flip bands only pick `dish.jeon`'s frame; nothing else in the finished
   picture depends on how the player did (ANSWERS 5).
6. Words (all `aria-label` only): see the list below. '굽기' bands reuse 보들보들 / 노릇노릇 / 바삭바삭 for the cake.
7. The oven sits on the counter station (no separate oven background); the rice pot stays in view during the three
   bowl steps of the rice ball.
8. A press on the plate still does nothing; the last cooking gesture cannot press an end button (shown at 450 ms,
   pressable from 900 ms, as the old chip).

## Every new or changed player-facing line and aria name (no visible text anywhere)

- Dialog: '요리 수첩' (book); dish names 해초전 · 계란말이 · 주먹밥 · 과일 꼬치 · 딸기 케이크 (dialog while cooking, the
  book's dish button and tabs, plate line).
- End buttons: '문어 부르기', '식탁에 두기'. Close stays '닫기'.
- Chip / step start (aria-live): 썰기 · 젓기 · 붓기 · 불 켜기 · 뒤집기 · 달걀 깨기 · 말기 · 밥 담기 · 깨 뿌리기 · 모양 잡기 ·
  김 붙이기 · 씻기 · 꼬치에 끼우기 · 시럽 입히기 · 굽기 · 꺼내기 · 크림 바르기 · 딸기 올리기.
- Unchanged and reused: 반쯤 · 한 줄 · 다 됐어 · 보들보들 · 노릇노릇 · 바삭바삭 and the cooked lines.
- Gone from the live game: the chip label '다시'. Font subset check: no stale subset (no font files changed).

## Checks added, suites run

| suite | result |
|---|---|
| `tools/test-cook-steps.js` (new, node) | 194 ok |
| `tools/test-cook-book-live.js` (new, browser) | 171 ok |
| `tools/test-cook.js` (unchanged by me; 268 after the base merge) | 268 passed |
| `tools/test-cook-dishes.js` (unchanged) | 106 ok |
| `tools/test-cook-stickers.js` (unchanged) | 250 ok |
| `tools/test-cook-live.js` (again → end button + door, strip checks, `recipe=jeon`) | 435 passed |
| `tools/test-cook-dishes-live.js` (D2 again, D3 `?book=0`) | 34 ok |
| `tools/test-cook-stickers-live.js` (new size rule and table, short screens now show) | 232 passed |
| `tools/test-cook-audio.js` (`recipe=jeon`) | 205 passed |
| `npm test` | no failures |
| `python3 tools/subset-fonts.py --check` | stale: none |

Old assertions changed on purpose: "again starts a new dish" (now: an end button closes, the door opens the next dish),
the step strip (now: asserted absent), sticker sizes and the two short screens (now shown), slide count 12 → 9 per dish
plus none after the plate. Nothing else was weakened.

## The independent check (one fresh agent, one round of fixes)

It found no crash, no blocked dish, no console error; sound-off, zero-text, reduced motion, whole-pixel art at 2.625,
saving and the message order held. Eight findings, what I did:

| # | finding | done |
|---|---|---|
| 1 `must` | unknown top-level fields of `ppolppol_cook_v0` were dropped on the first write (already so in the base) | `normStore` keeps them; check added |
| 2 | a fruit dropped on the skewer away from the next slot flew home | `drag` has an optional `zone` (the whole skewer); a drop inside it goes to the next slot; check added |
| 3 | book pictograms overlapped at 320x568 and 1280x800; effect picture and stamp sat on the dish | a packed two-row layout for those sizes; the effect picture closes the second step row; "made before" is a small seal on the tab |
| 4 | at 320x568 the pick sticker covered the middle egg | eggs, bowl and berries moved to stage rows 36 and below; `STICK_ROW` 44 → 36 (short screens: 80 CSS px) |
| 5 | at 320x568 the chip sat over a strawberry | the three berries start above the cake |
| 6 | the book ignored the 24 px edge rule | a touch that starts in the edge band turns no page |
| 7 | rotated (landscape) phone: tabs below touch size | not fixed: the kitchen is laid out for portrait; listed below |
| 8 | the oven's heat-on buzzed | no buzz for `bake` |

Not checked by it: sound actually playing (headless Chromium made no AudioContext for it), a real phone's edge gestures.

## Smoke (whole suite, letter by letter, on the branch merged with base fb279f3)

36 of 40 letters pass. Four fail, none in kitchen code:
- **Z**: one check in the game's cannot-load wait layer (`js/app.js`, '그 닫기 → 놀이방 그대로 · 포커스 조리대',
  `waitHidden: false`). The identical failure happens on the base `9652270` alone (run in a separate worktree).
- **O** (a settings colour preset not visible, click timeout), **FM** (hint count), **S** (a 120 s wait timeout): outside
  the kitchen, and they fail the same way on the base `9652270` alone (FM even one check more there). None is caused by K.

## Screenshots (`wip/round7/shots/K/`)

`1-book` `2-book-locked` `3-stir` `4-pour` `5-drag` `6-bake` `7-plate-gyeran` `8-plate-cake` (360x740 @2, lane A's sprites).

## What needs another lane to be fully tested

- Lane A merged: real food pictures in the committed tree (K's layouts were tuned against A's pushed file).
- Lane T merged: the game sending `ctx`, receiving `serve`, new dishes on the table and their day effects, and the
  `COOK_TUNES` note above. Until then the game's tray still opens the legacy dishes by id (smoke Z2 passes).

## Left out, and not verified

- Landscape phones: the book falls back to the one-row page and its tabs get smaller than 44 px (finding 7).
- The rice pot's rim (not a touch target) can lie under a sticker for its 1.8 s on short screens.
- No per-dish sticker scripts for the new dishes (the common rules fire: stir, place, flip, cut, step, done).
- No "carried object" over the slide for the new dishes (the finished scene slides out, the next slides in).
- The synthesized pour / scrub loudness against the music was not judged by ear; the recorded stir / place / lift /
  clink had never been played in the game before either.
- `tools/cook-shots.js` set `book` is not byte-stable (real time); sets 01-10 still are.
- Not run: the whole smoke suite and the other lanes' suites (the lead's CI).
