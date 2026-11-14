# Common brief — round 4 ("뽈뽈 문어", 11-15) — read this first, then your lane brief

## The project in a few lines

"뽈뽈 문어" is a small cozy phone web game: an AI model is shown as an octopus in an attic room; the player only
invites it on walks; it decides. The player also has their own character (walks with a stick at the bottom left),
a play room (arcade runner, a small kitchen), a loft upstairs (salon mirror, sewing machine). Vanilla HTML/CSS/JS,
no bundler. three.js r128 pixel scene in `js/scene3d.js` (2D fallback `js/scene2d.js`), the app in `js/app.js`,
entry intro in `js/intro.js` + `js/clouds.js` + `css/intro.css`, pixel UI in `js/ui-art.js` + `css/ui-art.css`,
runner in `js/runner.js` + `css/runner.css` + `api/runner/`, kitchen in `cook.html` / `js/cook.js`, sound in
`js/audio.js`. Player-facing language is Korean, warm plain 반말. The owner plays on a phone in portrait.
Docs worth knowing: `docs/VISION.md`, `docs/OWNER_DECISIONS.md` (read the section "주인 답 (11-15 00시 KST …)" —
it is the source of truth for this round), `docs/MODEL_VOICE.md`, `docs/SCENE.md`, `docs/UI_ART.md`, `HANDOFF.md`.

## This round

The owner answered every open design question at once (see that 11-15 section) and is asleep. **Nobody will
answer questions.** Where your brief leaves a choice, take the simplest option that fits the brief and the
owner's words, and write it in your report under "decisions". Do not stop to ask.

Lanes (each one is a separate cloud session on its own branch, all starting from the same commit of
`claude/game-launch-completion-hwvre5`; the lead merges them in this order of finishing):

| lane | branch | area |
|---|---|---|
| A cam | `lane/a-cam` | two-finger 360° turn, near walls cut to knee height, closed rooms from every side (scene3d camera · gestures · room walls) |
| B furn | `lane/b-furn` | new furniture mode (scene3d furniture code, app.js `furn*`, the hammer icon on the furniture button) |
| C runner | `lane/c-runner` | runner-2 portrait full screen (`js/runner.js`, `css/runner.css`, `api/runner/*`, runner tests) |
| D yard | `lane/d-yard` | the yard garden: new yard place, six plots, door, unlock (scene3d new place, app.js garden/bag) |
| E small | `lane/e-small` | sewing machine first tap + calm sheet, kitchen counter → cook, loading octopus, thought bubble art, PWA |
| F honest | `lane/f-honest` | honesty round 3 (faces, demo mood words, -ㄹ래 lines, pet sound, album empty text, hint lines) |
| G light | `lane/g-light` | evening / night a little brighter, stairs easy to see in the dark |

Stay inside your area. If you must touch another lane's code, keep it to the few lines you need and list them in
the report under "outside my area" so the lead can merge. Many lanes edit `js/scene3d.js` and `js/app.js`: keep
your edits local (new functions near the code they belong to, no mass re-formatting, no renames of things you do
not own, no moving blocks around) so git can merge the lanes.

## Hard lines (a break of one is a "must")

1. Never deceive about the model: nothing may say or imply what the octopus feels, likes, wants or tastes, or
   that it read, chose or said something it did not. Code-written lines must not pass as the model's words.
2. The model's own words are never altered, cut silently or "corrected".
3. Never steer the octopus. "No" and staying home always work and cost nothing. Walks pay 0.
4. A refusal is staged plainly: no sad or sulky face, no jingle, no nag.
5. No streaks, no fear of missing out, no gacha, no countdown pressure, no pushy notifications, no "coming soon"
   teasers, no locked-item displays that make the player wait.
6. No emoji or unicode symbol characters in player-facing text (plain Korean, digits, basic punctuation, the
   middle dot). Icons are pixel images.
7. Sound is off by default: nothing plays, no AudioContext, no request under `audio/` or `foley/` without a user gesture.
8. Kitchen: no failure, score, time limit or medals.
9. Never name or copy any commercial game (names, art, UI). General layouts are fine.
10. Saved data is never lost or corrupted by an update: a production save (`localStorage` key `ppolppol_v2`) keeps
    everything it had. New fields get defaults; old fields keep their meaning.
11. Never put the owner's name, nickname or e-mail in anything; never put a model name or agent name in code,
    comments, docs or commit messages you write (the attribution lines your harness adds are fine).

## Setup in your session

```bash
npm ci --no-audit --no-fund
pip install fonttools brotli
export NODE_PATH=$(npm root -g)   # Playwright is pre-installed globally; never run "playwright install"
```

- WebGL in headless Chromium: `chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] })`.
- The game runs from `file://…/index.html` (the repo tools do that). Switches: `?intro=0` skips the entry intro,
  `?intro=1` forces it, `?dev=1` shows the dev panel, `?scene=2d` forces the 2D fallback. An init script can set
  `window.__ppolLook = { hour, lantern, weather, octState, anchor }` (weather: clear | drizzle | rain | snow) and
  `window.__ppolTest = { today: 'YYYY-MM-DD' }`; `window.__ppolAwakeMs = 0` skips the awake gap after a walk.
  `APP` exposes test getters (search `get ` near the end of `js/app.js`); `APP.scene` is the scene API
  (`APP.goRoom('loft' | 'play' | 'attic')`, `APP.scene.stats()`, `APP.scene.pan()`, `debugStep` …).
- Seeding a save: see `wip/round4/probe-lib.js` (a small helper: opens the game at 360x740 with touch and a seeded
  save at a lantern level, waits until the big button is idle). Copy and adapt it for your probes.
- **Test gotcha:** the big button `#btn-go` ignores a tap within 600 ms after any dialog closes (`SHEET_SETTLE`).
  Before tapping it after a sheet or the name dialog closes, wait for `!APP.goResting` (`waitIdle(page)` in
  `tools/smoke.js`).
- Phone sizes: 360x740 (the owner), 320x568, 390x844, 412x915. Use touch (`hasTouch: true, isMobile: true`) where
  taps matter; for real finger gestures (two-finger twist, drags) use CDP `Input.dispatchTouchEvent`.
- Write probes that do not depend on speed (seeded saves, the date hook, waits for a state, never for a duration).

## How to work

1. Read your brief and the code it points to. Make a short plan in `wip/round4/notes/<lane>.md` (keep notes as you
   go: if your session restarts, read them and `git status` / `git diff` and continue instead of starting over).
2. Write the code carefully the first time (the owner asked for "code it well, then test in big steps", not
   endless debugging loops). Match each file's style: short Korean comments dated `11-15` saying why.
3. Check it yourself on phone sizes with screenshots you actually look at.
4. Run the fast suite `npm test`; if you changed any player-facing Korean text, run the font check
   `python3 tools/subset-fonts.py --check` and, if it says stale, regenerate with `python3 tools/subset-fonts.py`
   and commit the rewritten font files. Run the smoke letters that cover your area (`SMOKE_ONLY=<letters> node
   tools/smoke.js`; find them with grep) and fix what you broke; update checks that assert old text or old
   behaviour you were asked to change, without weakening what they guard. Add checks for the new behaviour
   (deterministic: states, not durations).
5. **One independent check:** start a fresh subagent (Agent tool) that has not seen your reasoning. Give it your
   brief, this common brief and the diff (`git diff <base>`), and ask it to play the change on phone sizes (real
   touch where it matters), try to break it, and report only `must` / `should` defects with evidence (it must not
   edit files). Fix the real ones. Do not loop: one check, one round of fixes.
6. Commit in a few meaningful commits (stage files one by one, never `node_modules`, never force-push) and push
   to your lane branch **once at the end** (a second push only if you fix something after). Every push runs the
   whole GitHub CI on this public repo; the lead runs the full gate after merging.
7. Write `wip/round4/reports/<lane>.md` (commit it on your branch): the conclusion first; each change (file and
   function, what and why); every decision you took where the brief left a choice; every new or changed
   player-facing line (before → after); the checks you added; suites run with totals; screenshots (≤ 10 PNG at
   360x740, committed under `wip/round4/shots/<lane>/`, small files); what you left and why; what you did not
   verify. Your final message is the same summary.

Severity words for the check: `must` = breaks a hard line, loses or corrupts saved data, crashes, or blocks play ·
`should` = a defect a player would notice, or text that misleads · `nit` = small (do not spend time on nits).
