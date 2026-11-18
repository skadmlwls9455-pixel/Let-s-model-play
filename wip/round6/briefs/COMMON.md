# Common brief — round 6 ("뽈뽈 문어", 11-18) — read this first, then your lane brief

## The project in a few lines

"뽈뽈 문어" is a small cozy phone web game: an AI model is shown as an octopus in an attic room; the player only invites it on
walks and it decides. The player also has their own character, a play room (arcade runner, a kitchen counter), a loft
(salon mirror, sewing machine) and a yard garden. Vanilla HTML/CSS/JS, no bundler, no modules, `file://` safe. three.js r128
pixel scene in `js/scene3d.js`, the app in `js/app.js`, pixel UI in `js/ui-art.js` + `css/ui-art.css` + `css/style.css`,
runner in `js/runner.js` + `css/runner.css`, kitchen in `cook.html` / `js/cook.js` / `js/cook-art.js` / `js/cook-stickers.js`
(opened in a full-screen iframe from the play-room counter), haptics in `js/haptics.js`, sound in `js/audio.js`, the salon's
pure rules in `js/salon.js`. Player-facing language is Korean, warm plain 반말. The owner plays on a phone in portrait.

Source of truth for this round: `docs/OWNER_DECISIONS.md` section **"주인 답 (11-18 KST: 6차 — …)"** and the spec
**`wip/round6/eat-spec.md`** (read §0 and §1, then the sections your brief names, then §10 contracts). The code map the spec was
built from is **`wip/round6/notes/map.md`** (`file:line` references at `ada2967`; line numbers drift, function names do not;
where the map suggests a design, the spec decides).
The plan-vs-build check of 11-18 (`wip/round6/audit-11-18.md`) added must-fix items to R, D and K2 — each brief has an
"Added 11-18" section; nothing else in that file is in scope this round.

## Owner rules learned the hard way (read twice)

- **"글자 줄이기" means fewer characters, never smaller type.** Do not shrink any font size.
- **The kitchen shows zero visible characters.** This round the same goes for the dish tray, the table buttons and the call
  chip: pictures only, names only in `aria-label` — and no `title` attribute (older scene buttons carry one, which shows hover
  text on a computer; do not copy that).
- Pixel text: Galmuri fonts render crisply only at whole device pixels per font pixel; use the `--fs-*` custom properties;
  never Galmuri7 for Korean; never let the browser fake bold (`font-synthesis: none`).
- Pixel art: every art px is a whole number of device px (canvas backing store at integer scale, `imageSmoothingEnabled =
  false` / `image-rendering: pixelated`, boxes rounded to `round(v·dpr)/dpr`). Press feedback is a 2 px translate, never scale.
- The owner already answered everything for this round (spec §0.3: no open questions). **Nobody will answer questions now.**
  Where your brief leaves a small choice, take the simplest option that fits the owner's words and write it in your report
  under "decisions". If something is truly ambiguous in a way that changes what the player sees, do the safest minimal
  version and flag it for the owner.
- Small things (an icon, a colour) get one careful version and one or two real screenshots — no rounds of variants.

## This round's lanes (separate cloud sessions, each on its own branch from the same commit)

Base: branch `claude/game-launch-completion-hwvre5`, code at **`ada2967`** plus one test-only fix (`9bb58e0`, `tools/smoke.js`
scenario T). The lead commits `wip/round6/` (this brief, the spec, the README, the audit) on top; the lead's latest docs commit
is your base: `git checkout -b lane/<key>` from it, check `git diff --stat ada2967 HEAD` lists only `wip/round6/` files and
`tools/smoke.js`, and note `BASE=$(git rev-parse HEAD)` — your diffs are against `$BASE`. Push only your lane branch. Never merge or cherry-pick another
lane; never push to `claude/game-launch-completion-hwvre5`. The lead merges the lanes after the owner says '넣어' (the
auto-mode check blocks merging other branches without the owner's approval).

| key | branch | area | brief |
|---|---|---|---|
| K1 | `lane/k1` | kitchen feel: '띵' + bell picture, bigger spatula / knife / stickers, '+' slicing | `briefs/K1.md` |
| K2 | `lane/k2` | two new dishes (주먹밥, 과일 꼬치), per-recipe sim/art/slides, the dish tray in the play room, the `result` message; a kitchen that cannot load (audit rel-01) | `briefs/K2.md` |
| D | `lane/d` | dining scene in 3D: booth (table + two sofas), the table dish, my character sitting/eating, the octopus coming/sitting/eating, the auras; the loft stair tap (audit J3) | `briefs/D.md` |
| M | `lane/m` | meal logic and UI: `js/meal.js` (decision, records, merge, words), the app flow, table/seat/call buttons, saves, day change, two tabs | `briefs/M.md` |
| R | `lane/r` | runner octopus redrawn natively from the 3D octopus; loading crawl centre → right edge; the first minutes (audit J1 greeting bubble, J2 hand hints, J3 mirror line) | `briefs/R.md` |

Suggested merge order for the lead: R, K1, K2, D, M (M last: it uses K2's message and D's scene API).

## File ownership

Only the owner lane edits a file, except the shared files below, where each lane edits **only its named region** and keeps the
edits local (new functions near the code they belong to, no re-formatting, no renames, no moving blocks). List any edit
outside your area in your report under "outside my area".

| file | owner | others (exact region only) |
|---|---|---|
| `js/cook-art.js` | K1 | K2: at most one line `API.kit = { … };` directly before `return API;` |
| `js/cook.js` sim half | K2 (`WORDS.dish`, `RECIPES`, new `TUNE_R`/`tuneOf`, `initStep`, `KIND.tap.init` mark layout, `potOf`, `resumeRun`, `validLook`, `drawDish`, `stubDish`, API export) | K1: `KIND.slice` (`init`, `look`, `tag`) and `cutLine` only |
| `js/cook.js` live half | K1 (`onEvent` new `case 'band'`, `juiceAt`, `render`, `frameSig`, `fit` sticker block, `follow`, `live`, the three jeon scene calls in `paintStage`) | K2: `open`, `begin`, `again`, `onStart`, `onReveal`, `startSlide`/`baseOf`/`composeSlide`/`overSeam`, `stationNow`, `burst`, `sound`, new `paintDish` + one dispatch line in `paintStage` directly after `if (!run) return;` |
| `js/cook-dishes.js` (new) | K2 | — |
| `cook.html` | K2 | — |
| `js/cook-stickers.js`, `tools/test-cook-stickers.js` | K2 | — |
| `tools/test-cook-stickers-live.js` | K1 | — |
| `js/audio.js` | K1 (`ckDing`, the `onCook` ding line, `COOK_NEXT`) | — |
| `tools/test-cook.js` | K1 (§2 the Hz tag check, §6, §11, §12 the distinct-dishes bound, §12b the cut-order pin, the art pins named in K1, a new section at the end) | K2: header pins (recipe count / steps), test 14 file list + `VOCAB` only |
| `tools/test-cook-live.js` | K1 | — |
| `tools/cook-shots.js` | K1 | K2: the embed capture block (`setEmbed`) only — the tray step |
| `tools/test-cook-audio.js` | K1 | — |
| `tools/test-cook-dishes.js`, `tools/test-cook-dishes-live.js`, `tools/make-dish-icons.js` (new) | K2 | — |
| `assets/icons/dish/*`, `assets/manifest.json` (`icon.dish.*` keys only) | K2 | — |
| `js/scene3d.js` | D | R: `walkPortrait` / the `pw` plumbing in `renderPortrait` only |
| `tools/test-scene-perf.js` | D | — |
| `js/meal.js`, `tools/test-meal.js`, `docs/MEAL.md` (new) | M | — |
| `js/app.js` | M (new meal block before the `stick` section; touch points: `adoptRemote`, the 60-s `timeTimer` callback, `bubble()` (one `octAtTable()` exception), the octopus's autonomous paths deferred while it sits at the table (`scheduleWander`, `scheduleThink`, `syncRest` / `armRest` / `restTick` → `lieDown` / `sleepNow` / `restDown`, `selfWake`, other `octPlace` / `walkTo` callers — spec §4.5), `openMachine` (one `mealBusy()` guard line), `sceneDescText` play branch, `ROOM_SPOT`, `resetRoomUI` list, `bindRooms` new `on(...)` lines, `WHO_LINE`, `userState`, `dayRows` + `renderLog` / `renderDiary`, `slimJSON`, boot / room-entry calls) | K2: `cookSrc`, `cookMsg` (one `result` case), `openCook` (the `mealBusy()` guard line, tray + recipe, the cannot-load fix), the `ready` case of `cookMsg`, new `cookPot` + `COOK_TUNES` and tray functions right after `openCook`; R: the name-form submit handler, `DOWN_SAY` (line ~38) only, one new hints block directly after the tip section, one call line where the walk's homecoming finishes |
| `index.html` | — | R: the head boot block (inline script + `<style>` for `#boot`, the minimum-cover class included); K2: `<dialog id="dish-pick">` next to `#cook-overlay`; M: `#btn-table`, `#btn-seat`, `#btn-call` after `#btn-cook` (no `title` attributes), and `<script src="js/meal.js">` after `js/salon.js` |
| `css/style.css` | — | K2: tray and cannot-load rules right after the `dialog.cook-overlay` rules; R: hint rules directly after the `.tip` rules; M: its rules appended at the end of the file (incl. the play-view override that shows `#oct` while the octopus sits at the table) |
| `tools/smoke.js` | — | K2: the kitchen part of `scenarioSceneTap` (Z); R: `scenarioRunner` (R), the boot block at the top of `scenarioSceneTap`, a new `scenarioFirst` with its list entry on the `['R', …]` line; D: `scenarioLoft` (the stair grid); M: new `scenarioEat` + one `['EAT', …]` entry in the scenario list + the exact `WHO_LINE` pin in scenario O (~2855, that one line) |
| `tools/test-brain.js` | M (add `js/meal.js` to the honesty scan) | — |
| `js/runner.js`, `tools/test-runner.js` | R | — |
| docs | each lane its sections (spec §12) | — |
| header comments (`js/cook.js` CONTRACT block, `js/cook-art.js` header) | — | K1 and K2 each edit only the lines about their own area (slice / look / tools / bell vs. recipes / foods / `tuneOf` / dishes), leaving at least one untouched line between a K1 edit and a K2 edit (git conflicts on adjacent hunks; the lead resolves the rest) |
| `package.json`, `.github/workflows/test.yml`, `README.md`, `HANDOFF.md`, `docs/OWNER_DECISIONS.md`, `wip/round6/README.md` | lead | lanes write in their report which test files to add to `npm test` / CI |

## Shared contracts (exact; see spec §10)

- **K1 ↔ K2**: `J.cut` = `null | { i, f }`; the `paintStage` edit rule above (K2's line directly after `if (!run) return;`,
  at least one untouched line between K1 and K2 edits); `GEO.rest.spatula` and the tool sprites are K1's; the '+' split `pop`
  option; `COOK_NEXT.open` includes `'cut'` and `COOK_NEXT.cut = ['place', 'step', 'done']` (K1, for K2's 과일 꼬치); K2 maps
  `tap → place` after the 120 ms gate in `sound()`.
- **K2 → M**: the kitchen posts `{ ppolCook: 'result', v: 1, id, recipe, seed, look, day }` once per finished dish (embed only);
  `cookMsg` calls `mealDish(d)` only if `typeof mealDish === 'function'`; recipe ids `'jeon' | 'jumeokbap' | 'kkochi'`.
- **M → K2**: `mealBusy()` (M's global, true from the call press to the last bite); `openCook` starts with
  `if (typeof mealBusy === 'function' && mealBusy()) return false;` (K2), `openMachine` with the same line (M).
- **D ↔ M**: the scene API in spec §10.3 — `setTableDish`, `tableInfo` (incl. `geom`), `playerSitTable`, `playerStandTable`,
  `octCanCome`, `octToTable`, `octTableBeat`, `mealBite`, `octLeaveTable`, `octAtTable`, `setAura`, event
  `on.tableSpot({ seat, call, dish })` (`call` = above the octopus's seat whenever I sit, M decides the chip), hotspot `'table'`
  → `#btn-table`. M feature-detects every call (`typeof scene.x === 'function'`) and **never uses booth coordinates** (the
  booth's size and place are D's, spec §4.1). While `octAtTable()`, the scene holds attic-anchor moves and M defers the
  octopus's autonomous paths (spec §4.5).
- **R ↔ D**: `walkPortrait(ph, { …, sq: [sx, sy] })` (R). D's table poses use only what `renderPortrait` saves and restores,
  so R's bake never captures a seated octopus.
- Code against the contract, not against another lane's branch. Until the other lane merges, use the documented fallback or a
  test stub; say in your report which checks need the other lane merged.

## Hard lines (a break of one is a "must")

1. Never deceive about the model: nothing may say or imply what the octopus feels, likes, wants or tastes, or that it read,
   chose or said something it did not. Code-written lines must not pass as the model's words. Code-chosen moments use the
   `idle` face. The demo decision never depends on the dish kind (a pattern would invent a taste).
2. The model's own words are never altered, cut silently or "corrected" (a bubble may show 24 characters + '…'; the record
   keeps the whole text).
3. Never steer the octopus. "No" always works and costs nothing; a "no" is staged plainly: no sad or sulky face, no jingle,
   no nag, no reason asked.
4. No streaks, no fear of missing out, no gacha, no countdown pressure, no pushy notifications. Effects are gifts of the day,
   not a timer to beat.
5. No emoji or unicode symbol characters in player-facing text (plain Korean, digits only where already used, basic
   punctuation, the middle dot). Icons are pixel images.
6. Sound is off by default: nothing plays, no AudioContext, no request under `audio/` or `foley/` without a gesture and the
   setting on. The ding is synthesized only when sound is active.
7. Kitchen: no failure, score, time limit or medals; zero visible characters.
8. Vibration only at the owner's moments: runner jump / hit, kitchen tap / flip / cut, furniture pick / drop. Nothing new.
9. Never name or copy any commercial game (names, art, UI, palettes, layouts). Principles are fine; benchmark notes go in docs
   only, never in code comments (the kitchen files ban 'Mama', '마마').
10. Saved data is never lost or corrupted: `ppolppol_v2`, `ppolppol_cook_v0` (pots, `potOld`, book) and `ppolppol_runner` keep
    everything they had; unknown values from a later build are kept, not deleted.
11. Crisp pixels: whole device px per art px everywhere you draw.
12. Never put the owner's name, nickname or e-mail in anything; never put a model or agent name in code, comments, docs or
    commit messages you write (the attribution lines your harness adds are fine).

## Setup in your session

```bash
git checkout -b lane/<key>          # from the lead's latest round-6 docs commit (code = ada2967 + smoke T fix 9bb58e0)
git diff --stat ada2967 HEAD        # only wip/round6/ files and tools/smoke.js
BASE=$(git rev-parse HEAD)          # your diffs are against this
npm ci --no-audit --no-fund
pip install fonttools brotli
export NODE_PATH=$(npm root -g)   # Playwright is pre-installed globally; never run "playwright install"
```

- WebGL in headless Chromium: `chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] })`.
- The game runs from `file://…/index.html`. `?intro=0` skips the intro, `?scene=2d` forces 2D, `?dev=1` dev tab. Init-script
  hooks: `window.__ppolLook = { hour, lantern, weather }`, `window.__ppolTest = { today }`, `window.__ppolAwakeMs = 0`. `APP`
  exposes test getters; `APP.scene` is the scene API (`APP.goRoom('loft'|'play'|'attic'|'yard')`, `APP.openMachine()`).
  The kitchen runs alone at `cook.html` (`?recipe=`, `?seed=`, `?slow=`, `?reduced=1`, `?rec=1`, `?sound=1`) or embedded.
- Probe helper: `wip/round4/probe-lib.js` (`REC`, `launch`, `open(browser, { w, h, dpr, lantern, look })`).
- Test gotcha: `#btn-go` ignores a tap within 600 ms after a dialog closes; wait for `!APP.goResting`.
- **Check on phone DPRs, not only DPR 1:** 360x740 @2, 412x915 @2.625, 320x568 @2 (plus 360x740 @3 where your brief says).
  Crispness problems only show at real phone ratios.

## How to work

1. Read your brief, the spec sections it names and the code it points to. Keep notes in `wip/round6/notes/<KEY>.md` (if your
   session restarts, read them plus `git status` / `git diff $BASE` and continue).
2. Write the code carefully the first time. Match each file's style: short Korean comments dated `11-18` saying why (the
   kitchen files `js/cook.js`, `js/cook-art.js`, `js/cook-dishes.js` keep ASCII-only comments).
3. Look at your change on the phone sizes with screenshots you actually read.
4. Run `npm test` and the suites your brief names. If you changed player-facing Korean text, run
   `python3 tools/subset-fonts.py --check` and, if stale, regenerate with `python3 tools/subset-fonts.py` and commit the font
   files. Update checks that assert old behaviour you were asked to change, without weakening what they guard; add checks for
   the new behaviour (states, not durations). New test files: run them directly and list them in your report for the lead to
   add to `npm test` / CI.
5. **One independent check:** start a fresh subagent that has not seen your reasoning, give it your brief, this common brief,
   the spec sections and the diff (`git diff $BASE`), and ask it to play the change on the phone sizes, try to break it, and
   report only `must` / `should` defects with evidence (no edits). Fix the real ones. One check, one round of fixes.
6. Commit in a few meaningful commits (stage files one by one, never `node_modules`, never force-push) and push to your lane
   branch once at the end (a second push only if you fix something after). Exception: lane D pushes its first commit (the
   booth layout: numbers + day / night shots, spec §4.1) as soon as it exists, so the lead can look early.
7. Write `wip/round6/reports/<KEY>.md` (commit it on your branch): conclusion first; each change (file, function, what and
   why); decisions; every new or changed player-facing line and aria name (before → after); checks added; suites run with
   totals; measured numbers your brief asks for; up to 8 small PNG screenshots in `wip/round6/shots/<KEY>/`; what needs another
   lane merged to be fully tested; what you left and why; what you did not verify. Your final message is the same summary.

Severity: `must` = breaks a hard line, loses saved data, crashes, or blocks play · `should` = a defect a player would notice, or
misleading text · `nit` = small (skip).
