# Task: final — the last full check and the hand-over (you may edit WT only for tiny fixes)

Read `SCRATCH/salon2/v2/COMMON.md` first, then `SCRATCH/salon/SPEC.md` §3, §5, §9, §10.
Your scratch folder: `SCRATCH/salon2/v2/final/`. The reports of everyone before you (the
finisher, the three reviews with their verdicts, the fixer) are at the end of your
prompt. You are the last one before the lead commits and ships to real players, and the
only agent touching WT now.

1. Read the whole change once more with fresh eyes:
   `git -C /home/user/ppolppol-salon2 diff @@K@@ --stat`, then the code diff
   (`-- js css index.html tools`). Check that every confirmed finding marked fixed is
   really fixed (re-run its repro), and that no fix broke something next to it.
2. Full regression on WT, with exact counts and durations (long runs in the background,
   poll the log; one browser suite at a time):
   - `npm test`
   - `tools/smoke.js` — every letter, in groups that fit 600 s
   - `tools/test-audio.js`, `tools/test-scene-perf.js`, `tools/test-play.js`
   - `tools/test-cook.js`, `tools/test-cook-live.js`, `tools/test-cook-audio.js`
   - the font check (`stale: none`)
   - `node tools/bundle.js`, then one whole salon ask inside `dist/ppolppol.html`
     (0 console errors)
   A failure: re-run that one check once; if it fails again find the cause. If it also
   fails on a clean copy of `@@K@@` say so (it is not this job's). Fix only what is small
   and clearly this job's; report everything else. Never loosen a threshold.
   Restore `tests/evidence` afterwards; `git -C /home/user/ppolppol-salon2 status --short`
   must then show only intended files (list them) and `node_modules`.
3. Docs match the code: `docs/SALON.md` status table and §14 (differences from the
   spec), `README.md`, `docs/ROADMAP.md`, `docs/MODEL_VOICE.md`, `docs/OWNER_DECISIONS.md`
   (the two unconfirmed defaults are still listed as questions). Fix small mismatches.
   No model identifiers anywhere in the diff
   (grep the diff `git -C /home/user/ppolppol-salon2 diff @@K@@`, case-insensitive, for the model
   family names and for the product name followed by a hyphen and a version; the audio codec
   name in the kitchen's foley text is not ours and not in this diff anyway; "Claude" as a
   product name is fine).
4. The owner's shot set, into `SCRATCH/salon2/v2/final/shots/`, 360x740 at
   deviceScaleFactor 2 unless said, pixel font, each one looked at by you:
   `01-first-run.png` (name + colour row), `02-mirror.png` (the corner with the mirror
   button, day), `03-sheet.png` (bottle sheet, one bottle picked, octopus visible above),
   `04-ask.png` (row 1 + the pause), `05-splash.png` (the dye moment), `06-dyed.png` (new
   colour + three rows), `07-keep.png` (a keep answer: plain, rows), `08-resting.png` (the
   sheet with a resting bottle and its line), `09-album.png` (the diary of that day),
   `10-settings.png` (the colour line that points to the mirror), plus
   `11-sheet-320-dark.png` (320x568, dark, system font). If you can, a short GIF or a
   numbered frame strip of the dye staging (`dye-*.png`, 12 frames at most).
5. Write the hand-over.

Return:
- `ownerKo`: what the player now sees, for the owner, in casual Korean 반말, 6 lines at
  most, no jargon, no English, outcome first. Include the two defaults as questions.
- `tech`: what changed, by file (function names), in English, compact.
- `tests`: every suite with pass/fail counts and how many times it ran.
- `shots`: absolute paths with one line each on what the picture really shows.
- `changedFiles`: the exact list from `git status --short` (without `node_modules`).
- `commitMsgKo`: a commit message in this repo's style (read `git -C WT log -5` for the
  shape): a Korean subject line, then a body that quotes the owner's request, lists the
  changes as short bullets, then tests and docs. No model identifiers. No trailers (the
  lead adds them).
- `risks`: what could still be wrong on a real phone, and what only the owner can judge.
