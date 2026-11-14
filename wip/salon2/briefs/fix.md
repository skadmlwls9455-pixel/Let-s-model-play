# Task: fix confirmed findings (you MAY edit WT)

Read `SCRATCH/salon2/v2/COMMON.md` first. Your scratch folder: `SCRATCH/salon2/v2/fix/`.
You are the only agent editing WT now. The confirmed findings (each one reproduced by an
independent verifier unless marked `"verified": false`) are at the end of your prompt,
after the finisher's report (context: what was built and how it was tested).

Rules:
- Fix every `must` and `should` finding. Skip `nit` unless it is a one-line change.
- Keep each fix to what the finding needs. No refactors, no new features, no retuning.
- A fix must not cross a hard line (COMMON): keep stays first, no reason field, no
  re-ask, no taste or pressure words, model words byte-for-byte, the salon gives nothing.
  If the only way to fix a finding crosses one, do not fix it: report it.
- Questions of taste and anything that changes one of the owner defaults (mirror from
  lantern 2; 7-day rest; demo odds; one ask per day; the corner's place) are for the
  owner: do not change them; list them in your report.
- Do not edit kitchen files, anything under `audio/`, or `js/dialogue-stub.js`.
- If a fix changes behaviour, add or adjust a test that would have caught the bug (smoke
  block `Y` / `O` / `S`, `tools/test-model-voice.js`, `tools/test-salon.js`), and update
  `docs/SALON.md` (and any other doc that states the changed fact).
- New player-facing text: KS X 1001 syllables only; run the font check.
- Never commit, push, stash, reset or rebase (COMMON rule 1).

Before you finish, on WT: `npm test`; smoke `Y,S,O` plus every smoke letter whose area
you touched; `tools/test-scene-perf.js` if you touched a scene file; `tools/test-audio.js`
if you touched sound calls (5.5 min: background + poll the log); the font check. All
green; report exact counts. Restore `tests/evidence` after browser runs.

Return: per finding id — fixed / skipped with reason, files and lines changed, how you
verified; the final test counts; open questions for the owner.
