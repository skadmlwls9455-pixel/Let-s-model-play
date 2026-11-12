# Common brief — second round of fixes after merging the "final" branch ("뽈뽈 문어", 11-11)

## The project in a few lines

"뽈뽈 문어" is a small cozy phone web game: an AI model is shown as an octopus in an attic room; the player only
invites it on walks; it decides. Vanilla HTML/CSS/JS, no bundler. three.js r128 pixel scene in `js/scene3d.js`
(2D fallback `js/scene2d.js`), the app in `js/app.js`, entry intro in `js/intro.js` + `js/clouds.js` +
`css/intro.css`, salon rules in `js/salon.js`, sound in `js/audio.js`, kitchen in `cook.html` / `js/cook.js`.
The player-facing language is Korean, in a warm plain voice. The owner plays it on a phone (portrait).
Docs worth knowing: `docs/VISION.md`, `docs/OWNER_DECISIONS.md`, `docs/MODEL_VOICE.md`, `docs/SALON.md`,
`docs/ROOM_EXPANSION.md`, `docs/UI_ART.md`, `docs/INTRO_SLOW_PROTO.md`, `docs/COOK_PROTO.md`.

## The trees

- `/home/user/Let-s-model-play` is the main checkout (what is in production). Never touch it.
- `/home/user/ppolppol-merge` (branch `merge-final`) is the line that ships next. It is production plus another
  session's "final" branch (a weekly to-do list, a set collection for the player's clothes, a visible garden
  outside, the gift box answer standing for the day, the salon's mirror corner moved to the upper floor ("loft")
  with the octopus following upstairs, a lift of the scene when the salon sheet covers it), plus fixes made since.
  Read-only for everyone except the lead.
- The second round of fixes is built on **`34f77ad`** (branch `merge-2`, checkout `/home/user/ppolppol-base2`,
  read-only): `6e3f6f4` (what ships first: the "final" branch, kitchen-sound fixes, the intro-cloud fix and a
  test fix in smoke scenario J) plus commit **`66c8110`** from the other session that wrote the "final" branch.
  That commit fixes part of the findings in its own features, in 41 lines and **without any test**: the weekly
  gift lost at the week change (its version is replaced by the lead's, see the weekly lane), the task "선물
  상자에서 하나 내밀기" removed from the weekly list, the day gift given every minute and when a tab becomes
  visible, `renderAll` also redrawing the bag tag, the garden outside, the body colour and an open 살림 sheet,
  upstairs: a walk finished (not dropped) when the octopus is moved between floors, no wandering to attic spots
  upstairs, the player stepping aside from the octopus's path and from the tub and mirror spots, the round
  stool in front of the mirror removed, one line on the mirror when the octopus is downstairs awake or out, and
  a ground-plane pick for the garden plots. Read it with `git -C /home/user/ppolppol-base2 show 66c8110`.
  **Each lane verifies the part of `66c8110` in its own area** (reproduce the original finding on `6e3f6f4`,
  show it gone on `34f77ad`, and add the checks that commit lacks).
- **Your task names your own tree.** A fix agent edits only that tree. A checker is read-only on the tree it
  checks: to mutate code or to run a suite that rewrites evidence files, copy the tree to your scratch folder
  first (`cp -r` without `.git` is fine; `node_modules` is a symlink to `/home/user/Let-s-model-play/node_modules`).
- An independent verification of the merged tree was done on 11-11. Its four reports are the source of the
  finding ids used in the briefs (read the entries you are given completely; each has evidence and a runnable
  repro script):
  `/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final/report-verify-code.json` (C…),
  `…/final/report-verify-welfare.json` (W…), `…/final/report-verify-features.json` (F…),
  `…/final/report-verify-loft.json` (L…). The scripts are in `…/final/v-code/`, `v-welfare/`, `v-features/`,
  `v-loft/`. Line numbers in the reports are for commit `c451d09`; the code has moved a little since.

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

## How to run things

- Node: `export NODE_PATH=$(npm root -g)` first (Playwright is global: `require('playwright')`, `chromium.launch()`
  needs no path; for WebGL use `args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']` as the
  repo tools do). Do not install anything.
- The game runs from `file://…/index.html` (the repo tools do that) or from any static server
  (`python3 -m http.server <port> --directory <tree>`; pick an unusual port such as 8300–8999 and stop it when done).
- Useful switches (read the top of `js/intro.js`, `tools/intro-shots.js`, `tools/smoke.js` for more):
  `?intro=1` forces the entry intro (automation skips it by default), `?intro=0` skips it, `?slow=3` slows the
  intro, `?scene=2d` forces the 2D fallback, `?dev=1` shows the dev panel; an init script can set
  `window.__ppolLook = { hour, lantern, weather, octState, anchor }` (weather: clear | drizzle | rain | snow) and
  `window.__ppolTest = { today: 'YYYY-MM-DD' }`. `APP` exposes test getters (search `get ` near the end of `js/app.js`).
  Saved state lives in `localStorage` (keys start with `ppolppol`).
- Suites, if you need them: `npm test` (fast, node only) · `SMOKE_ONLY=Y node tools/smoke.js` (letters select
  scenarios; Y is the salon) · `node tools/test-scene-perf.js` · `node tools/intro-shots.js` (set `NO_VIDEO=1`) ·
  font check `PYTHONPATH=/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/pylib python3 tools/subset-fonts.py --check`
  (must say `stale: none`: every character a player can see must be inside the pixel font subset).
- Phone sizes to use: 360x740 and 320x568 at least; 390x844, 412x915 and 430x932 are common real phones. Use touch
  (`hasTouch: true`, `isMobile: true`) when the behaviour depends on taps.
- The machine has 4 CPUs and up to three agents run browsers at once (load average 8 to 25). Wall-clock results can
  be wrong from load alone. So: write checks that do not depend on speed (seeded `localStorage`, the date hook,
  waits for a state, never for a duration); when an old suite fails, run it once on an untouched copy of your
  base commit under the same load, and if the control fails the same way report "no verdict because of load" and
  move on. **Do not wait for a quiet machine and do not loop on old suites**: the lead runs every suite of the
  repo on a quiet machine before shipping. Never weaken a check or lengthen a timeout to get green. Keep your own
  load low: one browser run at a time, no parallel batches.

## Rules

- Do NOT commit, push, deploy, open or comment on pull requests, or post anywhere (unless your task explicitly
  tells you to make one local commit). Do not touch other trees under `/home/user/`: other agents work there.
- Never stage or commit `node_modules`, evidence files under `tests/` or `docs/shots/`, or anything under `audio/`.
  Never put a model identifier or an agent name in code, comments, docs or commit messages.
- Report plainly and completely: what you checked and how, what you found with evidence (file:line, numbers,
  screenshot paths), and what you did not check. A failure is reported as a failure. If you could not reproduce
  something, say so and say what you tried. Do not guess a cause without a test that separates it from the others.
- Severity: `must` = breaks a hard line, loses or corrupts saved data, crashes, or blocks play · `should` = a defect
  a player would notice, or text that misleads · `nit` = small · `owner` = not a defect but a design decision the
  owner should make (say the options and what each costs).
- Your final message is read by the lead engineer, who has not seen your work. Write it for someone arriving cold:
  full sentences, the conclusion first, no private labels.
