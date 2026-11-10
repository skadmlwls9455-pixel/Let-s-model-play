# Common brief — salon part 2 (read this first, every agent)

SCRATCH = `/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad`
WT = `/home/user/ppolppol-salon2` (a git worktree; all salon work happens here)
MAIN = `/home/user/Let-s-model-play` (the lead's checkout; never touch it)
Your own scratch folder is `SCRATCH/salon2/v2/<your name>/`.

## The project

"뽈뽈 문어": a cozy pixel-art phone web game in which an AI model is shown as an octopus.
Vanilla JS globals (APP, BRAIN, SCENE3D, SCENE2D, UIART, AUDIO, RUNNER, SALON, COOK), no
modules, file:// safe. Players are real people on phones: nothing developer-facing may
show; no emoji or unicode symbols in player-facing text; few choices, few words.

## The owner's request (11-08 night, verbatim)

"글고 지금 생각해봤는데 물론 게임이긴 하지만 문어 외관을 내 멋대로 슥슥 염색시키는 게 좀 다소...
어색하고 우리 복지 방향이랑 안 맞게 느껴져서 그런데 처음에 선택한 이후로는 사용자가 못 바꾸게
픽스하는 건 별로일까? 흠...... 대신 이 색으로 염색해볼까? 이런 식으로 미용실 컨텐츠 추가하는 거야."

One line: 몸 색은 사람이 처음 한 번만 고른다. 그 뒤로는 미용실에서 사람이 색을 내밀고 묻고,
바꿀지는 문어가 정한다.

## The contract

`SCRATCH/salon/SPEC.md` (829 lines, Korean; the final spec — read all of it; the evidence
it cites is under `SCRATCH/salon/`). `docs/SALON.md` in WT is the same spec as a repo doc.

- Part 1 shipped earlier (commit 983d436): `js/salon.js` (the SALON rules: read its header
  and API; where code and spec differ, the code's welfare guards win),
  `tools/test-salon.js`, and the scene side in `js/scene3d.js` + `js/scene2d.js` (mirror
  corner, `ANCHORS.salon`, hotspot `salon`, `setSalonOpen`, `salonOffer`, `salonDye`,
  `salonKeep`, `salonFinish`, `ponder`, `setColor` still, portrait colour, `color()`,
  `motion().salon`, T6 in `tools/test-scene-perf.js`).
- This job is part 2 = SPEC §11 steps 3, 4, 5: §1, §3, the app side of §7, §8.3, §9.2,
  §9.3, §9.5, §10. Not the v2 tub dive. Not a real model connection (pure functions only,
  as §6 says).

## Where the job stands (it was interrupted once)

1. BUILD A (data + lock) finished. Its report: `SCRATCH/salon2/REPORT_A.md`.
2. DOCS finished (written from the spec while the code was still being built). Its
   report: `SCRATCH/salon2/REPORT_DOCS.md`. It lists six points where the docs must be
   checked against the final code.
3. BUILD B (the salon itself: mirror button, bottle sheet, ask flow, staging, log rows,
   album diary, dev control, sound hooks, smoke block `Y`, test additions) worked for
   about 94 minutes and was cut off by a usage limit during its final regression run,
   **before it could report and without notes**. Nobody has reviewed or verified its
   code. Treat it as unreviewed work by someone else.
4. Evidence the interrupted builder left in `SCRATCH/salon2/`: `shots/` (57 review
   shots), probe scripts (`probe-salon.js`, `probe-lost.js`, `probe-reduced.js`,
   `probe-kbd.js`, `probe-dist-salon.js`, `probe-active.js`, `probe-name.js`,
   `shots-salon.js` — reuse them, read first), and its last logs, all green at the time:
   smoke `Y` 40/0, `Y,S,O` 123/0, `Y,J,A,G` 153/0, `U,T,K,I,L,V,D,F` 162/0,
   `Y,H,W,N,M,P,E,B,C,R` 151/0 (the run in progress when it died), test-audio 118/0,
   scene-perf 84/0, npm test green (salon 225/0, model-voice 568/0). Those runs predate
   the rebase below. Smoke letters other than the ones listed were never run.

## What is in WT now

@@STATE@@

`git -C /home/user/ppolppol-salon2 diff @@K@@` is the whole salon change (code, tests,
docs). The kitchen (`cook.html`, `js/cook*.js`, `js/audio.js` kitchen section, `foley/`,
`credits.html`, `tools/test-cook*.js`, a '만든 것들' link at the very bottom of the
settings sheet) shipped in `@@K@@` and is not part of this job: do not edit kitchen
files. `cook.html` is a separate page that the game does not link yet.

Changes that landed after the spec was written (already in the base):
(a) tapping the octopus shows a one-line story of its last walk (`BRAIN.tapLine`),
bring-back has a short homecoming, and the octopus stays awake 90 s (25 s after 졸림)
using sessionStorage `ppolppol_rest`; salon staging must integrate with these (no tap
line, no wake-up, no nap start during staging). (b) The house button `#btn-door` is
bottom-left (left 4px, bottom 4px).

## Defaults in effect (the owner has not confirmed them; keep them as named constants)

Mirror from lantern 2; a colour answered '그대로' rests 7 days; demo dye about 5 in 8
(`P_YES` 0.625) and the very first ask is always dye; one ask per local day whatever the
answer.

## Hard lines

- MODEL_VOICE: never steer the octopus before it chooses; never alter what it chose
  (action, line, face). keep is first in every menu; no reason field; never re-ask.
- '그대로' is shown plainly (no sulk, no guilt, no change-of-heart staging).
- Code-written text states facts only (no 좋아해, 맛있대, 예뻐, 어울려, 원해, 부탁). Demo
  lines appear only under the always-visible '데모' label.
- Seeded; no `Math.random` in the rules.
- The salon gives nothing (no shells, lantern, badges, 함께한 날, no collection grid).
  Walks pay 0; no streak, FOMO or gacha.
- `js/dialogue-stub.js` stays separate. Sound calls are guarded
  (`window.AUDIO && AUDIO.on && AUDIO.on(...)`), following app.js's existing pattern.
  Never edit anything under `audio/` (another session's).
- No model identifiers anywhere (code, comments, docs, commit text). "Claude" as a
  product name already appears in docs and is fine.
- All new player-facing text must be KS X 1001 syllables (the pixel font is subset).

## Git and file rules

1. Never run `git commit`, `git push`, `git stash`, `git reset`, `git checkout`,
   `git restore`, `git rebase`, `git clean` or anything that rewrites history, in WT or
   anywhere. The lead owns git state. Agents that may edit just edit files in WT.
2. Never edit, or run anything that writes, in MAIN.
3. Never stage or delete `WT/node_modules` (a symlink).
4. Keep your shell cwd at `/home/user`; use `git -C /home/user/ppolppol-salon2 …`,
   absolute paths, or a subshell `(cd /home/user/ppolppol-salon2 && …)`.
5. If your task says "read-only": do not modify WT at all. For experiments that write
   (mutations, patched builds), make your own copy first:
   `mkdir -p DEST && cd /home/user/ppolppol-salon2 && git ls-files -co --exclude-standard -z | grep -zv '^node_modules' | xargs -0 cp --parents -t DEST`
   (`rsync` is not installed; Playwright is global, so no node_modules is needed.)
6. Screenshots, logs and scratch files go under your scratch folder, never into WT.
7. Write `notes.md` in your scratch folder **as you go** (what you checked, commands,
   results, what is left). If you are cut off, the notes are what survives.

## Tools

```
export NODE_PATH=$(npm root -g)          # Playwright; Chromium is preinstalled, never install
(cd /home/user/ppolppol-salon2 && npm test)                 # fast suites (world, brain, model-voice, runner, api, cook, salon)
node /home/user/ppolppol-salon2/tools/test-model-voice.js
node /home/user/ppolppol-salon2/tools/test-salon.js
SMOKE_ONLY=Y,S,O node /home/user/ppolppol-salon2/tools/smoke.js   # Y = 미용실, S = settings, O = first run; the full run is long
node /home/user/ppolppol-salon2/tools/test-audio.js         # about 5.5 min
node /home/user/ppolppol-salon2/tools/test-scene-perf.js
node /home/user/ppolppol-salon2/tools/test-play.js
node /home/user/ppolppol-salon2/tools/bundle.js             # dist/ is gitignored; check the single file runs the salon
PYTHONPATH=SCRATCH/pylib python3 /home/user/ppolppol-salon2/tools/subset-fonts.py --check   # must say stale: none
```

- `tools/test-resume.js` fails the same 5 checks ("문어 상태 유효 … st-walk") on a clean
  copy of the base commit (it does not set `window.__ppolAwakeMs = 0`). That predates
  this work; do not chase it.
- Browser suites rewrite `tests/evidence/*`. After each run on WT restore:
  `for f in $(git -C /home/user/ppolppol-salon2 status --short tests/ | awk '{print $2}'); do git -C /home/user/ppolppol-salon2 show HEAD:$f > /home/user/ppolppol-salon2/$f 2>/dev/null; done`
  and delete untracked files the run created under `tests/`.
- The machine has 4 CPUs and is shared with one other agent that also runs browsers:
  one browser at a time, targeted `SMOKE_ONLY` runs, re-run a single timeout flake once
  before chasing it, and say how many runs passed and failed. Never loosen a threshold
  to pass.
- A foreground command is limited to 600 s: put longer runs in the background and poll
  their log file. Do not start a command with a bare `sleep N;`.
- Take shots a person will look at with deviceScaleFactor 2 (360×740 unless told).

## Output

Return the structured result your task asks for. Be concrete: file, line, command,
numbers. Report what you did not manage to check as plainly as what you did.
