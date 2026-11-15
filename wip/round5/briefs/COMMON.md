# Common brief — round 5 ("뽈뽈 문어", 11-15 afternoon) — read this first, then your lane brief

## The project in a few lines

"뽈뽈 문어" is a small cozy phone web game: an AI model is shown as an octopus in an attic room; the player only
invites it on walks; it decides. The player also has their own character, a play room (arcade runner, a kitchen),
a loft (salon mirror, sewing machine) and a yard garden. Vanilla HTML/CSS/JS, no bundler. three.js r128 pixel
scene in `js/scene3d.js`, the app in `js/app.js`, pixel UI in `js/ui-art.js` + `css/ui-art.css` + `css/style.css`,
runner in `js/runner.js` + `css/runner.css`, kitchen in `cook.html` / `js/cook.js` / `js/cook-art.js` /
`js/cook-stickers.js`, haptics in `js/haptics.js`, sound in `js/audio.js`. Player-facing language is Korean, warm
plain 반말. The owner plays on a phone in portrait.

Source of truth for this round: `docs/OWNER_DECISIONS.md` sections "주인 답 (11-15 05시 KST …)", "(11-15 06시 KST …)"
and "(11-15 14시 KST …)". Specs: kitchen `wip/round5/cook-spec.md`, UI polish `wip/round5/ui-polish.md`.

## Owner rules learned the hard way (read twice)

- **"글자 줄이기" means fewer characters, never smaller type.** Do not shrink any font size. Replace words with
  pictures where the specs say so; keep sizes.
- Pixel text: Galmuri fonts render crisply only at whole device pixels per font pixel. Use the `--fs-*` custom
  properties (set by the head script in `index.html`) for pixel-font sizes; never use Galmuri7 for Korean words
  (only for digits); never let the browser fake bold on Galmuri9 (`font-synthesis: none`).
- The owner already answered every open question for this round. **Nobody will answer questions now.** Where a
  brief leaves a small choice, take the simplest option that fits the owner's words and write it in your report
  under "decisions". If something is truly ambiguous in a way that changes what the player sees, do the safest
  minimal version and flag it in the report for the owner.

## This round's lanes (separate cloud sessions, each on its own branch from the same commit)

| lane | branch | area |
|---|---|---|
| K-A | `lane/k-a` | kitchen frame, flow and input (`js/cook.js`, `css/cook.css`, `tools/test-cook-live.js`) |
| K-B | `lane/k-b` | kitchen close-up art (`js/cook-art.js`, `tools/test-cook.js`) |
| K-C | `lane/k-c` | kitchen embed safe areas, haptics helper, stickers, sound and smoke tests (`cook.html`, `js/haptics.js`, cook part of `js/app.js`, sticker files, cook tests, `tools/smoke.js` kitchen checks) |
| U | `lane/u` | UI polish outside the kitchen and runner (type fixes, furniture panel, sheets to pictures, poster text, bubble, tips, intro hint, credits) |
| R | `lane/r` | runner text to pictures and runner type (`js/runner.js`, `css/runner.css`, runner tests, smoke R) |

Stay inside your area. Shared files (`js/app.js`, `tools/smoke.js`, `css/style.css`, `index.html`) are edited by
more than one lane: keep your edits local (new functions near the code they belong to, no re-formatting, no renames
of things you do not own, no moving blocks) so git can merge the lanes. List any edit outside your area in your
report under "outside my area".

## Hard lines (a break of one is a "must")

1. Never deceive about the model: nothing may say or imply what the octopus feels, likes, wants or tastes, or that
   it read, chose or said something it did not. Code-written lines must not pass as the model's words.
2. The model's own words are never altered, cut silently or "corrected".
3. Never steer the octopus. "No" and staying home always work and cost nothing.
4. A refusal is staged plainly: no sad or sulky face, no jingle, no nag.
5. No streaks, no fear of missing out, no gacha, no countdown pressure, no pushy notifications.
6. No emoji or unicode symbol characters in player-facing text (plain Korean, digits, basic punctuation, the middle
   dot). Icons are pixel images (inline SVG pixel grids or PNG).
7. Sound is off by default: nothing plays, no AudioContext, no request under `audio/` or `foley/` without a gesture.
8. Kitchen: no failure, score, time limit or medals.
9. Never name or copy any commercial game (names, art, UI). Principles are fine.
10. Saved data is never lost or corrupted: a production save (`localStorage` key `ppolppol_v2`, kitchen
    `ppolppol_cook_v0`, runner `ppolppol_runner`) keeps everything it had.
11. Never put the owner's name, nickname or e-mail in anything; never put a model or agent name in code, comments,
    docs or commit messages you write (the attribution lines your harness adds are fine).

## Setup in your session

```bash
npm ci --no-audit --no-fund
pip install fonttools brotli
export NODE_PATH=$(npm root -g)   # Playwright is pre-installed globally; never run "playwright install"
```

- WebGL in headless Chromium: `chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] })`.
- The game runs from `file://…/index.html`. `?intro=0` skips the intro, `?scene=2d` forces 2D. Init script hooks:
  `window.__ppolLook = { hour, lantern, weather }`, `window.__ppolTest = { today }`, `window.__ppolAwakeMs = 0`.
  `APP` exposes test getters; `APP.scene` is the scene API (`APP.goRoom('loft'|'play'|'attic'|'yard')`, `APP.openMachine()`).
- Probe helper: `wip/round4/probe-lib.js` (`REC`, `launch`, `open(browser, { w, h, dpr, lantern, look })`).
- Test gotcha: `#btn-go` ignores a tap within 600 ms after a dialog closes; wait for `!APP.goResting`.
- **Check on phone DPRs, not only DPR 1:** 360x740 @2 and @3, 412x915 @2.625, 320x568 @2. Text crispness and
  pixel icons only show their problems at real phone ratios.

## How to work

1. Read your brief and the code it points to. Keep notes in `wip/round5/notes/<lane>.md` (if your session restarts,
   read them plus `git status` / `git diff` and continue).
2. Write the code carefully the first time. Match each file's style: short Korean comments dated `11-15` saying why.
3. Look at your change on phone sizes with screenshots you actually read.
4. Run `npm test`; if you changed player-facing Korean text, run `python3 tools/subset-fonts.py --check` and, if
   stale, regenerate with `python3 tools/subset-fonts.py` and commit the font files. Run the smoke letters that
   cover your area (`SMOKE_ONLY=<letters> node tools/smoke.js`) and the suites named in your brief; update checks
   that assert old text or old behaviour you were asked to change, without weakening what they guard. Add checks
   for the new behaviour (states, not durations).
5. **One independent check:** start a fresh subagent that has not seen your reasoning, give it your brief, this
   common brief and the diff (`git diff <base>`), and ask it to play the change on phone sizes, try to break it, and
   report only `must` / `should` defects with evidence (no edits). Fix the real ones. One check, one round of fixes.
6. Commit in a few meaningful commits (stage files one by one, never `node_modules`, never force-push) and push to
   your lane branch once at the end (a second push only if you fix something after).
7. Write `wip/round5/reports/<lane>.md` (commit it on your branch): conclusion first; each change (file, function,
   what and why); decisions; every new or changed player-facing line (before → after); checks added; suites run
   with totals; up to 8 small PNG screenshots at 360x740 @2 under `wip/round5/shots/<lane>/`; what you left and
   why; what you did not verify. Your final message is the same summary.

Severity: `must` = breaks a hard line, loses saved data, crashes, or blocks play · `should` = a defect a player
would notice, or misleading text · `nit` = small (skip).
