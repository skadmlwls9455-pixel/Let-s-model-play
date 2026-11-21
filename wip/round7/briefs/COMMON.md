# Common brief — round 7 ("뽈뽈 문어", 11-21) — read this first, then your lane brief

Deadline: **everything merged, tested and deployed by 2026-11-22 18:00 KST**. Lanes must push their finished work by
**2026-11-22 10:00 KST (01:00 UTC)**; the lead merges, runs CI and deploys. A lane that is not solid by then is left out of
this deploy (the code stays on its branch). Build the essential path first, polish second, extras last.

## The project in a few lines

"뽈뽈 문어" is a small cosy phone web game. An AI model is shown as an octopus in an attic room; the player invites it on
walks and it decides. The player has their own little character, a play room (arcade runner, a kitchen counter, a dining
table), a loft (salon mirror, sewing machine, mannequin) and a yard garden. Vanilla HTML/CSS/JS, no bundler, no modules,
`file://` safe. three.js r128 pixel scene in `js/scene3d.js`, the app in `js/app.js` (one IIFE, global `APP`), pixel UI in
`js/ui-art.js` + `css/ui-art.css` + `css/style.css`, kitchen in `cook.html` / `js/cook*.js` (full-screen iframe), meal rules
`js/meal.js`, salon rules `js/salon.js`, sound `js/audio.js`, haptics `js/haptics.js`. Player-facing language is Korean, warm
plain 반말. The owner plays on a phone in portrait and also on a computer.

Read for your lane: your brief, the owner's words in `wip/round7/README.md` (sections A to E; they are the source of truth),
the code maps in `wip/round7/maps/` and the research in `wip/round7/research/` that your brief names. Older decisions:
`docs/OWNER_DECISIONS.md`, the world-expansion notes `docs/next/owner-2026-11-18.md` and `docs/next/options-2026-11-18.md`.

## What the owner wants from this round (every lane, read twice)

- "깔끔하고 문제 없이 … S급 시판 게임과 비교했을 때도 압도적으로 재밌고 예뻐 보여야 해." Clean, no bugs, and it must look and
  feel good. A smaller thing that is finished and pretty beats a bigger thing that is rough.
- "토큰 덜 소비하고 정확하고 빠르게." Work lean: read the maps instead of re-reading whole files, do not run research the
  brief already did, no rounds of variants, one independent check at the end (below).
- Questions: the lead asked the owner 24 questions before the lanes started; the answers (or the defaults) are in
  `wip/round7/briefs/ANSWERS.md`. **Read it.** If you hit something that changes what the player sees and neither your brief
  nor ANSWERS.md settles it: take the simplest version that fits the owner's words, write it in your report under
  "decisions the owner should confirm", and tell the lead in your final message. Do not stop to wait.

## Owner rules learned the hard way

- **"글자 줄이기" means fewer characters, never smaller type.** Do not shrink any font size.
- Persuade with pictures, not text. New screens: pixel-art pictures first, as few words as possible. The kitchen frame shows
  **zero** visible characters (names live in `aria-label`; no `title` attributes).
- Pixel text: Galmuri fonts are crisp only at whole device pixels per font pixel; use the `--fs-*` custom properties
  (`js/fs-snap.js`); never Galmuri7 for Korean; never let the browser fake bold (`font-synthesis: none`). If you add or change
  player-facing Korean text, run `python3 tools/subset-fonts.py --check`; if stale, regenerate and commit the font files.
- Pixel art: every art px is a whole number of device px (canvas backing store at integer scale, `imageSmoothingEnabled =
  false` / `image-rendering: pixelated`, boxes rounded to `round(v*dpr)/dpr`). Press feedback is a 2 px translate, never scale.
- Measure crispness at real phone ratios. Playwright's `deviceScaleFactor` emulation lies at 2.625: use
  `chromium.launch({ args: ['--force-device-scale-factor=2.625', '--window-size=412,915'] })` with `newContext({ viewport: null })`.
- Small things get one careful version and one or two real screenshots that you actually look at.

## Hard lines (a break of one is a "must")

1. Never deceive about the model. The attic octopus is driven by a model or, today, by labelled demo rules: nothing may say
   or imply what it feels, likes, wants or tastes, or that it read, chose or said something it did not. Code-written lines
   never pass as the model's words. Code-chosen moments use the `idle` face. See ANSWERS.md for the NPC octopuses (scripted
   characters, always labelled).
2. The model's own words are never altered or cut silently.
3. Never steer the attic octopus. "No" always works and costs nothing; a "no" is staged plainly.
4. No streaks, no fear of missing out, no gacha, no countdown pressure, no pushy notifications. Daily shop stock and the
   weekend contest are allowed only without timers, without "last chance" wording and without anything that can be missed
   forever.
5. No emoji or unicode symbol characters in player-facing text (plain Korean, digits, basic punctuation, the middle dot,
   and 'D+N' in the status row). Icons are pixel images.
6. Sound is off by default: nothing plays, no AudioContext, no request under `audio/` or `foley/` without a gesture and the
   setting on.
7. Kitchen: no failure, no score numbers, no time limit, no medals; zero visible characters.
8. Vibration only at the existing moments (runner jump / hit, kitchen actions, furniture pick / drop). New kitchen steps may
   use the kitchen's existing short buzz names.
9. Never name or copy any commercial game (names, characters, art, UI layouts, palettes, music recordings). Principles are
   fine. Reference notes that name a game stay in `wip/` documents, never in code, comments or player text.
10. Saved data is never lost or corrupted: `ppolppol_v2`, `ppolppol_cook_v0`, `ppolppol_runner` keep everything they had;
    unknown values from a later build are kept, not deleted. A new field gets a safe default when it is missing. Whatever a
    player wears, owns or has cooked today must still be there after the update.
11. Crisp pixels everywhere you draw.
12. Never put the owner's name, nickname or e-mail in anything. Never put a model or agent name in code, comments, docs or
    commit messages. Commit messages end with the one line `Claude-Session: <your session URL>` if your harness gives you one,
    and nothing else about tools or models.
13. No octopus, squid or other cephalopod as food, anywhere.

## Lanes (eleven, each its own session and branch, all from the same base commit)

Base: branch `claude/game-launch-completion-hwvre5` at the commit named in your first message (`BASE`). Create your branch
`lane/7-<key>` from it. Push only your lane branch. Never merge or cherry-pick another lane. Never push to the base branch.

| key | branch | area |
|---|---|---|
| U | `lane/7-u` | screen fixes: status row 'D+N', settings sections folded, left-edge stairs button removed, poster and runner stickers larger, the 3D scene paused behind full-screen games; the room drawn larger with sky and ground filling the screen |
| A | `lane/7-a` | food pixel art: dishes, ingredients, tools and cooking states as hand-authored sprites (new files only) |
| K | `lane/7-k` | the kitchen game inside `cook.html`: recipe book first, data-driven recipes with finer steps and new step kinds, no step strip, the end buttons, kitchen stickers larger |
| T | `lane/7-t` | cooking to table: the game side of the kitchen (open with context, the serve message), carrying the dish to the table, sitting, calling the octopus, new dishes on the table and their day effects, recipe unlock state |
| P | `lane/7-p` | the player's character: masculine and feminine looks freely mixed, better eyes, more hair and clothes, item tags and prices for the shop and contest, the run gait, the mannequin's octopus T-shirt |
| W | `lane/7-w` | the outside as one continuous map (the ground and how you move on it): wide yard on by default, road, village ground, beach and sea, walk areas, follow camera, culling, signposts for quick travel, shells on the beach |
| V | `lane/7-v` | what stands in the village: the clothes shop, the general store, the cafe with its open deck, empty houses, the plaza with a notice board and a stage, street props; the buttons over them; drawing NPC octopuses |
| S | `lane/7-s` | the shops: a clothes shelf that changes every day and a general store, paid with shells; shells picked up on the beach |
| C | `lane/7-c` | the cafe: menu, coffee, eating that leads to a gifted recipe, the record player and its music |
| N | `lane/7-n` | NPC octopuses and the story: three shopkeepers and the sleeping octopuses (look, spots, scripted lines with a label), the dialogue box, traces of the story in the village, the first-run lines |
| F | `lane/7-f` | the weekend fashion contest: weekly theme, scoring the worn outfit by item tags, the show, shells for the result |

Suggested merge order for the lead: U, A, K, T, P, W, V, S, C, N, F.

## Shared files: how eleven lanes edit them without conflicts

The base commit contains **marker lines** `[7-<key>]` in the shared files. A lane writes **new** code only directly below its
own marker line and never touches the marker lines or the blank lines between them:

- `js/app.js`: block markers before the "공개" banner (`/* [7-U] … */` etc.) and export markers at the end of the returned
  object (`/* [7-U] */`: add `name: value,` lines, comma included).
- `css/style.css`: markers at the end of the file.
- `index.html`: three marker groups (scene buttons after `#btn-call`; dialogs and sheets before `#sew-sheet`; script tags
  for DOM-free rule files before `js/app.js`).
- `js/scene3d.js`: new-function markers inside `init` directly before `function pick(` (T, P, W, V, U) and export markers
  inside the scene API object (after the `octTableBeat …` line).
- `tools/smoke.js`: scenario function markers before `main()` and list markers before the `CAM` entry.

Edits to **existing** lines of a shared file are allowed only where your brief's ownership table gives you that region, and
must stay small and local: no re-formatting, no renames, no moving blocks, no "while I am here" clean-ups. Prefer a new
function under your marker plus a one-line call at the existing place. List every edit to existing lines in your report under
"existing lines I changed" (file, function, why).

Put as much as possible into **new files**: DOM-free rule modules as one global each (`js/shop.js` → `SHOP`, `js/cafe.js` →
`CAFE`, `js/npc.js` → `NPC`, `js/contest.js` → `CONTEST`, `js/recipes.js` → `RECIPES` …), written like `js/meal.js`
(pure functions, no clock or random calls inside rules: pass the date and a seed in; testable in node), their node tests as
`tools/test-<name>.js`, their browser tests as `tools/test-<name>-live.js`, documents as `docs/<NAME>.md`.

**Nobody edits** `package.json`, `.github/workflows/test.yml`, `README.md`, `HANDOFF.md`, `docs/OWNER_DECISIONS.md`,
`wip/round7/README.md`, `wip/round7/briefs/*`: the lead does. Write in your report which test files to add to `npm test` and CI.

## Shared contracts (code against these, not against another lane's branch)

Until the other lane is merged, use the fallback written here or a stub in your own tests, and say in your report which
checks need the other lane.

**C1 · A → K, T (food sprites).** New file `js/cook-sprites.js`, one global `COOK_SPR`, no DOM, works in node:
`COOK_SPR.get(id, frame)` → `{ w, h, d: Uint8ClampedArray (RGBA) } | null` (frame defaults to 0, clamps to the last frame),
`COOK_SPR.ids()` → string[], `COOK_SPR.info(id)` → `{ w, h, frames, ax, ay } | null` (`ax, ay` = the anchor px: the centre
of the food's footprint). Ids and sizes are fixed in `wip/round7/briefs/SPRITES.md`. A consumer that gets `null` draws its
own plain fallback (so every lane runs without A).

**C2 · K ↔ T (kitchen frame messages; `{ ppolCook: … }` both ways, same origin rules as today).**
- **Recipe ids.** The three old recipes keep their ids and code as **legacy** (`jeon`, `jumeokbap`, `kkochi`: not shown in
  the book, but a saved pot still resumes, old notebook lines and old meal records still draw, and the old test suites keep
  guarding the engine). The book's recipes have new ids: `jeon2` (해초전), `gyeran` (계란말이), `jumeokbap2` (주먹밥, now
  a triangle), `kkochi2` (과일 꼬치, now glazed), `cake` (딸기 케이크). Korean names are these everywhere (kitchen
  `aria-label`s, the table, the log). Day effects: `jeon2` sparkle, `jumeokbap2` star, `kkochi2` petal (as their
  predecessors), `gyeran` `bubble` ('방울'), `cake` `confetti` ('색종이') — the last two are new (T adds them to
  `js/meal.js` and the scene). Pictures: `dish.jeon` for `jeon2`, `dish.jumeokbap` for `jumeokbap2`, `dish.kkochi` for
  `kkochi2`, `dish.gyeran`, `dish.cake`; legacy dishes keep today's drawings.
- game → kitchen `open`: `{ ppolCook: 'open', kbd, recipe?: id, ctx: { canCall: boolean, unlocked: string[] } }` (also as
  `&ctx=` URL-encoded JSON on the first load). `unlocked` = the new recipe ids the book may start; the book shows the others
  as locked. Missing `ctx` = `{ canCall: false, unlocked: ['jeon2', 'gyeran', 'jumeokbap2'] }`.
- kitchen → game `result` (unchanged shape and moment, once per finished dish):
  `{ ppolCook: 'result', v: 1, id, recipe, seed, look, day }`.
- game → kitchen `ctx` (new): `{ ppolCook: 'ctx', canCall }`, sent in answer to every `result` (and whenever the game
  likes). The kitchen uses the latest value when it shows the end buttons. The game still re-checks at press time.
- kitchen → game `serve` (new, when an end button is pressed, right before the kitchen closes itself):
  `{ ppolCook: 'serve', id, mode: 'call' | 'table' }`. Closing with the close chip sends no `serve` (the game then puts the
  dish on the table as today).

**C3 · T ← C (recipes).** T owns `js/recipes.js` (global `RECIPES`, DOM-free) and the app block that stores
`S.user.recipes = { <id>: { n: <times eaten at the cafe>, got: 'YYYY-MM-DD' | null } }`. T exports on `APP`:
`recipeEat(id)` → `{ n, gift: boolean }` (counts one cafe serving of `cake` or `kkochi2`; `gift` is true exactly once, when
`n` reaches 3 and the recipe was locked), `recipesUnlocked()` → string[] (always `jeon2`, `gyeran`, `jumeokbap2`; plus gifted
ones; plus `kkochi2` for anyone whose kitchen notebook already has a line from before this round, because they could cook a
fruit skewer until now). C calls `APP.recipeEat` only if it is a function.

**C4 · P → S, F (wardrobe catalogue).** P owns the item tables. Every wearable item (hair, outfit top, bottom, one-piece,
shoes, accessory) has `id`, a Korean `name`, and new fields `tags: string[]` (from this fixed list: `cute`, `cool`, `cosy`,
`sporty`, `neat`, `sea`, `flower`, `star`, `warm`, `fresh`, plus one colour family `c-red` `c-orange` `c-yellow` `c-green`
`c-blue` `c-purple` `c-pink` `c-brown` `c-white` `c-black`) and `shop: { price: <shells> } | null` (`null` = everyone has
it). P exports on `APP`: `wardrobe()` → `{ cats: [{ key, name, items: [{ id, name, tags, shop, owned, worn }] }] }`,
`wearing()` → the worn item ids with their tags, `itemThumb(cat, id, sizePx)` → a canvas or data URL of the item's picture.
Ownership lives in `S.user.owned = { '<cat>:<id>': 'YYYY-MM-DD' }`, written only through `APP.ownItem(cat, id)` (P). **Every
item id that exists before this round stays free for everyone** (`shop: null`); only new ids can be shop stock, so nothing a
player wears can disappear. S and F call these only if they are functions.

**C5 · shells.** Spend and earn only through the existing helpers named in `wip/round7/maps/player-economy.md` (never write
the number directly), with the dye sheet's confirm-before-spending pattern.

**C6 · the outside (W, V → S, C, N, F).** One continuous outdoor map; nothing outdoors is a separate place. Diagonal axes as in
the code: `s = (x + z)/√2` runs from the house toward the bottom of the screen and the sea, `t = (x − z)/√2` to the right.
Layout (metres; both lanes build to this table):

| stretch | s | walkable t | what is there |
|---|---|---|---|
| yard and house | up to 5 | the existing yard square | as today (garden, porch, gate at the front corner) |
| forest road | 5 – 18 | ±3 | stepping stones, trees; signpost 0 at s 6 |
| village gate | 18 – 20 | ±3 | an arch instead of today's cross fence; sleeping octopus `sleep-1` on a bench at (s 19, t −4) |
| village street | 20 – 38 | ±3 (street) | left lots t −10…−3.5: clothes shop s 22–28, empty house s 30–36 · right lots t 3.5…10: general store s 22–28, cafe with open deck s 30–37 (the deck t 3.5–7 is walkable) |
| plaza | 38 – 46 | ±8 | notice board at (s 40, t −6), low stage at (s 43, t 5), signpost 1 at (s 39, t 0), `sleep-2` on the empty house porch at (s 33, t −4.5) |
| steps to the beach | 46 – 49 | ±3 | a short stair or slope down |
| beach | 49 – 60 | ±12 | sand, rocks, five shell spots, signpost 2 at (s 50, t 0), `sleep-3` on a rock at (s 55, t −9), a pier from (s 56, t 7) out over the water, `sleep-4` at the pier's foot |
| sea | from 60 | — | water to the horizon, stepped waves at the shore |

- **W owns** the ground, sea, walk areas, colliders merge, camera, culling, signposts and quick travel
  (`APP.goPlace('home' | 'village' | 'beach')`), `scene.area()` → `'yard' | 'road' | 'village' | 'plaza' | 'beach'`, the
  shell buttons `#btn-beach-shell-0` … `-4` with `scene.beachShells(list of indexes to show)`, and the generic plumbing that
  reads the registry `WIDE_REG` (declared in the base, next to `WIDE` in `js/scene3d.js`): W calls every
  `WIDE_REG.builders[i](yardGroup)` at the end of the wide part of `buildYard`, turns every `WIDE_REG.spots` entry
  `{ key, btn, x, y, z, r }` into a tappable spot that positions and clicks the button with id `btn`, adds `WIDE_REG.boxes`
  `[x0, z0, x1, z1]` and `WIDE_REG.circles` `[x, z, r]` to the outdoor colliders, hides every `WIDE_REG.segments` entry
  `{ s0, s1, obj }` whose stretch is off screen, and calls `WIDE_REG.frame[i](dt, now)` each frame while the outside shows.
- **V owns** everything that stands on that ground in the village and plaza, and fills the registry (never edits W's
  functions): buildings, props, the cafe deck (counter, two tables, the record player on a shelf; the roof is cut away or
  open at the front so the camera sees in), their colliders and segments, the buttons (in `index.html` under `[7-V] 단추`,
  class `scene-spot`, `hidden`, with `aria-label`, no `title`): `#btn-shop-clothes`, `#btn-shop-goods`, `#btn-cafe-counter`,
  `#btn-cafe-seat`, `#btn-cafe-lp`, `#btn-plaza-stage`, `#btn-plaza-board`, and `#btn-npc-clothes`, `#btn-npc-goods`,
  `#btn-npc-cafe`; and the scene API (under `[7-V]`): `scene.npcSpots()` → `[{ id, x, z, face }]` for ids `clothes`,
  `goods`, `cafe`, `sleep-1` … `sleep-4`; `scene.npcSet(list)` with
  `list = [{ id, color: '#rrggbb', hat: 'none' | 'beret' | 'apron' | 'cap', pose: 'stand' | 'sleep' }]` draws those octopuses
  at their spots; `scene.npcMark(id, on)` shows a small plain mark over one; `scene.cafeSit(on)` → Promise, seats the
  player's character at the cafe table and stands it up again.
- S, C, N and F only add click handlers to those buttons (`document.getElementById(id)` may be null: guard it) and call the
  scene API only after `typeof scene.x === 'function'`. With the 2D fallback there is no outside: nothing of S, C, N, F shows.

**C7 · N ↔ S, C, F (who speaks).** N owns `js/npc.js` (roster: ids `clothes`, `goods`, `cafe`; names, colours, hats, lines) and
the dialogue box. N exports `APP.npcSay(id, key, vars)` → shows that NPC's scripted line for `key` (keys S, C and F may use:
`shop.hello`, `shop.thanks`, `shop.none`, `cafe.hello`, `cafe.serve`, `cafe.gift`, `contest.open`, `contest.result`) with the
NPC's name and the label '대본'. If `APP.npcSay` is missing, S, C and F show nothing (never a toast pretending to be an NPC).

**C8 · saved fields added this round** (all under `S.user`, each lane only its own): `recipes` (T), `owned` (P), `shop`
(S: purchases by day), `beach` (S: shells picked by day), `cafe` (C: servings, records played), `contest` (F: entries by
week), `story` (N: traces seen). `S.settings`: nothing new. Every new field is optional when read, survives export and
import untouched, and has a `normalize` that keeps values it does not know.

## Setup in your session

```bash
git fetch origin claude/game-launch-completion-hwvre5
git checkout -b lane/7-<key> <BASE from your first message>
npm ci --no-audit --no-fund
export NODE_PATH=$(npm root -g)   # Playwright is pre-installed globally; never run "playwright install"
```

- WebGL in headless Chromium: `chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] })`.
- The game runs from `file://…/index.html`. `?intro=0` skips the intro, `?scene=2d` forces 2D, `?dev=1` dev tab. Init-script
  hooks: `window.__ppolLook = { hour, lantern, weather, octState }`, `window.__ppolTest = { today }`. `APP` exposes test
  getters; `APP.scene` is the scene API. The kitchen runs alone at `cook.html` (`?recipe=`, `?seed=`, `?slow=`, `?reduced=1`).
- Probe helper: `wip/round4/probe-lib.js`. Test gotcha: `#btn-go` ignores a tap within 600 ms after a dialog closes.
- Check on phone sizes: 360x740 @2, 412x915 @2.625 (real path above), 320x568 @2, and one desktop size 1280x800 @1.

## How to work

1. Read your brief and what it points to. Keep notes in `wip/round7/notes/<KEY>.md` (if your session restarts, read them
   plus `git status` and continue).
2. In your first 20 minutes write a short plan at the top of your notes: the steps in order, what you will cut first if time
   runs short, and any question that would change what the player sees (then decide it as said above and go on).
3. Write the code carefully the first time. Match each file's style: short Korean comments dated `11-21` saying why (the
   kitchen files keep ASCII-only comments).
4. Look at your change on the phone sizes with screenshots you actually read.
5. Run `npm test` and the suites your brief names. Update checks that assert old behaviour you were asked to change, without
   weakening what they guard; add checks for the new behaviour (states, not durations). Do not run the whole slow suite more
   than once: the lead's CI runs everything.
6. **One independent check:** start one fresh subagent that has not seen your reasoning, give it your brief, this common
   brief and the diff, and ask it to play the change on the phone sizes, try to break it, and report only `must` / `should`
   defects with evidence (no edits). Fix the real ones. One check, one round of fixes.
7. Commit in a few meaningful commits (stage files one by one, never `node_modules`, never force-push). **Push your branch
   early and often** (after each working step): the lead may merge a finished part before you are done, and a pushed branch
   survives a restart.
8. Write `wip/round7/reports/<KEY>.md` (commit it on your branch): conclusion first; each change (file, function, what and
   why); existing lines you changed in shared files; decisions the owner should confirm; every new or changed player-facing
   line and aria name; checks added; suites run with totals; up to 8 small PNG screenshots in `wip/round7/shots/<KEY>/`;
   what needs another lane merged to be fully tested; what you left out and why; what you did not verify. Your final message
   is the same summary.

Severity: `must` = breaks a hard line, loses saved data, crashes, or blocks play · `should` = a defect a player would notice,
or misleading text · `nit` = small (skip).
