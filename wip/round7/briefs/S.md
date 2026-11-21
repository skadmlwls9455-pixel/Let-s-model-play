# Lane S — the shops (`lane/7-s`)

Read `COMMON.md` first (contracts C4, C5, C6, C7, C8), then `ANSWERS.md`, the owner's words (`wip/round7/README.md` D1) and
`wip/round7/maps/player-economy.md` sections 2, 3, 4, 10, 11.

## Why

The owner: "마을 … 옷가게, 상점 등을 만들고 거기서 옷을 살 수 있게 해줘. 매일 아이템이 달라지는 식으로." A well-loved life game's
shop is the reference **for the principle only**: a small shelf that is different every day, so that dropping by is a little
event. Nothing is copied from it (hard line 9), and our own line 4 holds: no timers, no "last chance", nothing that can be
missed for ever.

## You own

New files: `js/shop.js` (global `SHOP`, DOM-free rules), `tools/test-shop.js`, `tools/test-shop-live.js`, `docs/SHOP.md`.
`js/app.js` under `[7-S]`; `index.html` under the three `[7-S]` markers (the script tag, the sheet); `css/style.css` under
`[7-S]`. You edit no existing line of any file.

## What to build

1. **Rules (`js/shop.js`).** `SHOP.stock(kind, dateKey, catalogue, owned)` → today's shelf.
   - `clothes`: 4 items a day from the catalogue's shop items (contract C4), chosen by a seeded shuffle cycle so that every
     item comes round again within about a week and a half; an item the player owns is replaced by the next in the cycle
     (if everything is owned the shelf shows what it has with an "owned" stamp). Same day → same shelf on every device with
     the same catalogue.
   - `goods`: seeds (2 shells each, at most 3 a day) and three dye colours of the day at the sewing machine's price
     (the existing `DYE_COST`; reuse the existing dye and seed fields, never new ones).
   - `SHOP.buy(state, kind, item, dateKey)` → `{ ok, state, why }` (pure; re-checks the price and the balance);
     `SHOP.normalize`, `SHOP.merge` for two tabs (purchases are a union; shells follow the existing two-tab behaviour).
   - Prices come from the catalogue (clothes) and one table here (goods). An active player earns about 15 to 22 shells a day
     (map 3.3): a day's shelf should usually hold one thing they can afford today and one to save for.
2. **The shop sheet** (one sheet for both shops, opened by `#btn-shop-clothes` and `#btn-shop-goods` from lane V; the
   buttons may be missing: guard). Pictures first: a shelf of tiles (the item's picture from `APP.itemThumb`, the shell
   price as a picture and a number), my shells at the top, the shopkeeper's small picture if lane N provides one.
   Touching a clothes tile shows it **on my character** (a try-on preview from the scene's portrait with that item
   swapped in) with the two buttons of the existing confirm pattern ('그만' / '살래', map 3.5, including the 0.6 s
   double-tap guard and the shake when shells are short). Buying: shells go down through the existing helper, the item
   becomes owned (`APP.ownItem`), a short line says what happened ('체크 셔츠를 샀어. 내 모습에서 입어 봐.'), the tile shows
   the "owned" stamp, and `APP.npcSay(kind, 'shop.thanks')` is called if it exists. An "입어 보기" shortcut may put it on at
   once through `APP.setPlayerPart`.
   Goods tiles work the same way without the try-on.
   If the wardrobe API is missing (lane P not merged) the clothes shelf is empty and the sheet says nothing false: show
   the goods shop only.
3. **Shells from the beach.** Lane W draws up to five shell spots (`scene.beachShells(indexes)`, buttons
   `#btn-beach-shell-N`). You decide which are there today (a seeded 3 of 5 per day), handle a tap (the shell is picked,
   +1 shell through the earning helper, the spot hides until tomorrow), store picks in `S.user.beach` (C8), and call
   `scene.beachShells` at boot, on day change and after each pick. No counter on screen, no "3 left".
4. **Bag chip and the look sheet** stay lane U's and P's: after a purchase call the existing refresh helpers (map 3.5).

## Words

Few. Every new line goes through the honesty scan like the rest of `js/app.js`: facts only ('샀어', '조개가 모자라',
'오늘은 이게 다야'); no feelings, no urging, no countdown. No emoji or symbols.

## Checks

`tools/test-shop.js` (the same date gives the same shelf; the cycle returns every item; owned items are replaced; prices and
balance; buying twice cannot double-spend; merge keeps every purchase; unknown items from a later build are kept),
`tools/test-shop-live.js` (open each sheet through its button or `APP.openShop(kind)`, try on, buy, short of shells, day
change with the `today` hook, two tabs), `npm test`. Screenshots at 360x740: both shelves, the try-on, the stamp.

## Report

As in `COMMON.md`, plus the price table and a seven-day sample of shelves.
