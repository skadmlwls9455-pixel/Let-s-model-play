# Common brief — independent verification of the second deploy ("뽈뽈 문어", 11-13)

## The project in a few lines

"뽈뽈 문어" is a small cozy phone web game: an AI model is shown as an octopus in an attic room; the player only
invites it on walks; it decides. Vanilla HTML/CSS/JS, no bundler. three.js r128 pixel scene in `js/scene3d.js`
(2D fallback `js/scene2d.js`), the app in `js/app.js`, entry intro in `js/intro.js` + `js/clouds.js` +
`css/intro.css`, salon rules in `js/salon.js`, sound in `js/audio.js`, kitchen in `cook.html` / `js/cook.js`.
The player-facing language is Korean, in a warm plain voice. The owner plays it on a phone (portrait).
Docs worth knowing: `docs/VISION.md`, `docs/OWNER_DECISIONS.md`, `docs/MODEL_VOICE.md`, `docs/SALON.md`,
`docs/ROOM_EXPANSION.md`, `docs/UI_ART.md`, `docs/INTRO_SLOW_PROTO.md`.

## What you verify

- **The tree: `/home/user/ppolppol-verify2`**, a checkout of commit **6d03faf** (detached). It is what ships as
  the second deploy unless you find something. **Read-only for you**: to mutate code or to run a suite that rewrites
  evidence files, copy it to your scratch folder first (`git -C /home/user/ppolppol-verify2 archive HEAD | tar -x
  -C <dir>`; link `node_modules` to `/home/user/Let-s-model-play/node_modules`; link `audio/` instead of copying it).
- **Production today is `f2c93f1`** (the first deploy, 11-12 20:38 UTC). Players have saves from it. An untouched
  copy: `git -C /home/user/ppolppol-verify2 archive f2c93f1 | tar -x -C <dir>`.
- What the second deploy adds on top of production (`git -C /home/user/ppolppol-verify2 log --first-parent
  f2c93f1..HEAD`; the `wip/` folder is notes, not shipped). Each lane below was fixed and then checked by an
  independent checker in isolation; nobody has yet looked at **all of them together**. Their reports are in
  `/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final/` (`report-*.json`) and in the
  tree under `wip/round2/reports/`:
  1. `66c8110` (another session): verification fixes in the weekly list, the loft octopus, garden taps, a tab left
     open past midnight, the 살림 sheet after a reset or an import.
  2. Weekly to-do `5d374f6`: the weekly gift is no longer lost at the week change, and polish (scenario `Q`).
  3. Salon `0ff4282`: the mirror corner upstairs, asking the octopus about its colour (scenario `Y`).
  4. Loft `52760a5`: the octopus follows upstairs, wanders there, steps aside (scenario `Z`).
  5. Garden `1437791`: taps on the outside plots, the seed drawing, plot labels, unknown colours (scenario `X`).
  6. Garden nits (lane gnits): stale plot labels, junk dye keys, a plot partly off screen, an import undone by a
     late write from a closed tab (a `lastSeen` guard on the storage listener).
  7. Thin cloud bank `d76d9be` (owner decision 6b): the entry intro's cloud bank covers at most half the screen; a
     panel under it hides the sky-band switch; three extra clouds in the gap; the covers outside the scene in steps.
  8. Owner decisions of 11-12 `a0483dd`: (3b) the octopus does not follow upstairs while it rests after a turn;
     (4b) the weekly task "이번 주에 사흘 들어오기" is removed (an old week that already counted it keeps the point:
     `week.kept`, with one new line); (5b) a press that wakes a sleeping octopus does not count for "산책 갈지 묻기".
  9. **Not in this tree yet:** the owner default OW-3 (lane owner3: when a turn ends while the octopus is upstairs,
     it stays upstairs until the player goes down) is being finished in another tree with its own independent check
     and will be merged after you. In this tree a turn that ends while the octopus is upstairs still moves it to the
     attic blanket at once: that is known, do not report it. OW-4 is kept as it is (the awake window counts only
     while the attic is seen).

Scratch: `/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final/<your label>/`.
Keep `notes.md` there as you go (what you tried, what you saw, file names of evidence). If it already exists
when you start, a restart happened: read it and continue instead of starting over.

## Hard lines of this project (a break of one is a "must")

1. Never deceive about the model: nothing may say or imply what the octopus feels, likes, wants or tastes, or
   that it read, chose or said something it did not. Words like "좋아해", "맛있대", "기뻐해" about the octopus are
   banned. Code-written lines must not pass as the model's words.
2. The model's own words are never altered, cut silently or "corrected".
3. Never steer the octopus. "No" and staying home always work and cost nothing. Walks pay 0 (no reward for the
   octopus going out, no penalty for it staying). The salon gives nothing.
4. A refusal is staged plainly: no sad or sulky face, no jingle, no nag, no retry trick that turns a "no" into a "yes".
5. No streaks, no fear of missing out, no gacha, no countdown pressure, no notifications that push.
6. No emoji or unicode symbol characters in player-facing text (plain Korean, digits, basic punctuation, the
   middle dot). Icons are pixel images.
7. Sound is off by default: nothing plays, no AudioContext, no request under `audio/` or `foley/` without a user gesture.
8. Kitchen: no failure, score, time limit or medals.
9. Reference material: never name or copy any commercial game.
10. Saved data is never lost or corrupted by an update: a player's save from production keeps everything it had.

## How to run things

- Node: `export NODE_PATH=$(npm root -g)` first (Playwright is global: `require('playwright')`, `chromium.launch()`
  needs no path; for WebGL use `args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']` as the
  repo tools do). Do not install anything.
- The game runs from `file://…/index.html` (the repo tools do that) or from a static server
  (`python3 -m http.server <port> --directory <dir>`; pick an unusual port 8300–8999 and stop it when done). Two
  builds served by one server under two paths share one `localStorage` (same origin): that is how a tab left open
  on the old build meets the new build.
- Switches (read the top of `js/intro.js`, `tools/intro-shots.js`, `tools/smoke.js` for more): `?intro=1` forces
  the entry intro (automation skips it by default), `?intro=0` skips it, `?slow=3` slows it, `?scene=2d` forces the
  2D fallback, `?dev=1` shows the dev panel; an init script can set `window.__ppolLook = { hour, lantern, weather,
  octState, anchor }` (weather: clear | drizzle | rain | snow) and `window.__ppolTest = { today: 'YYYY-MM-DD' }`.
  `APP` exposes test getters (search `get ` near the end of `js/app.js`); `APP.scene.stats()`, `debugStep`.
  Saved state lives in `localStorage` (keys start with `ppolppol`).
- Suites, if you need them: `npm test` (fast, node only) · `SMOKE_ONLY=<letters> node tools/smoke.js` · `node
  tools/test-scene-perf.js` · `NO_VIDEO=1 node tools/intro-shots.js` · font check
  `PYTHONPATH=/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/pylib python3 tools/subset-fonts.py --check`
  (must say `stale: none`). Do not loop on the repo's suites: the lead runs all of them on a quiet machine before
  shipping. Your own probes are the point.
- Phone sizes: 360x740 and 320x568 at least; 390x844, 412x915, 430x932 are common real phones. Use touch
  (`hasTouch: true`, `isMobile: true`) where taps matter.
- The machine has 4 CPUs; two verifiers run browsers at once, sometimes more agents. Wall-clock results can be
  wrong from load alone: write probes that do not depend on speed (seeded `localStorage`, the date hook, waits for
  a state, never for a duration). If something fails only under load, run the same probe on an untouched copy of
  `f2c93f1` (or of the lane's base) under the same load before you call it a defect.
- **The disk is shared and filled up once today.** Keep copies few (one copy of the tree, one of production), put
  bulky ones in `/dev/shm`, link `audio/`, delete frame folders and copies when you are done.

## Rules

- Do NOT commit, push, deploy, open or comment on pull requests, or post anywhere. Do not touch other trees under
  `/home/user/`: other agents work there.
- Never put a model identifier or an agent name in anything you write into the repo (you write nothing there).
- Report plainly and completely: what you checked and how, what you found with evidence (file:line, numbers,
  screenshot paths, the probe script path), and what you did not check. If you could not reproduce something, say
  so and what you tried. Do not guess a cause without a test that separates it from the others.
- Severity: `must` = breaks a hard line, loses or corrupts saved data, crashes, or blocks play · `should` = a defect
  a player would notice, or text that misleads · `nit` = small · `owner` = not a defect but a design decision the
  owner should make (say the options and what each costs).
- Your final message is read by the lead engineer, who has not seen your work. Write it for someone arriving cold:
  full sentences, the conclusion first.
