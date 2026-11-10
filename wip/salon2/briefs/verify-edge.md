# Task: verify-edge — code review and edge cases (READ-ONLY on WT)

Read `SCRATCH/salon2/v2/COMMON.md` first, then SPEC §3, §7, §8 (`SCRATCH/salon/SPEC.md`).
Your scratch folder: `SCRATCH/salon2/v2/verify-edge/`. The finisher's report is at the end of
your prompt: do not trust it. Do not edit WT (own copy for experiments, COMMON rule 5).
Prefer reproductions over opinions.

## A. Line-by-line review

Read `git -C /home/user/ppolppol-salon2 diff @@K@@ -- js css index.html tools` in full (it
is large: go file by file, do not skim). Look for: state that can get stuck
(`salonActive` left true after an error, a rejected promise, a closed dialog, a lost
context, a hidden tab); double saves or a save that splits one decision across two
writes; listeners or timers added on every open and never removed; staging promises that
never settle; anything that runs before the scene exists or in the 2D fallback; reads of
fields that old saves lack; XSS through names or model lines (innerHTML); CSS that
affects other sheets; anything that changes behaviour outside the salon by accident
(compare with the base: tap line, nap and self-wake, walk invitation, bring-back, play
room door, settings, album, runner colour).

## B. Reproduce in a browser

1. Two tabs ask on the same day: the earliest wins, the other is dropped and not drawn,
   the colour follows in both tabs; no duplicate rows; `mineAsks` behaviour.
2. Local midnight passes while the sheet is open, and during staging.
3. Reload mid-staging; close the tab mid-staging and reopen.
4. Hidden tab during staging (visibilitychange), then visible again.
5. WebGL context loss mid-staging → the 2D scene; and a session that starts in 2D.
6. Export / import / reset: reset shows the first-run dialog with colours again; an
   import during staging; an import of a save with broken or huge `salon.asks`.
7. v1 migration and old saves with a custom slider colour (`by: 'migrated'`, the 7th
   'first colour' bottle, 4 + 3 layout at 320 px).
8. The tap line and the 90 s awake window during and after staging; the nap that was due
   during staging starts afterwards; a pet in progress when the ask is pressed.
9. The walk invitation and bring-back while the sheet is open; the play-room door while
   the sheet is open; the main button during every staging beat.
10. Open and close the sheet 50 times: listener count, DOM node count, timers, memory.
11. Draw calls and shader program counts with the corner and during the splash
    (`tools/test-scene-perf.js` T6; the limits in `docs/SCENE.md`).
12. The dist single file (`node tools/bundle.js` in your own copy): one whole ask works,
    0 console errors.
13. Storage quota: thousands of asks (`slimAsks`), and `save()` failing mid-ask.
14. Rapid input: double tap on [물어보기], tapping bottles during the close animation,
    Esc during staging, the Android back gesture (dialog cancel).

## C. Tests

Do the new tests test what they say? Read smoke block `Y` and the first-run block `O`, the
salon additions in `tools/test-model-voice.js` and `tools/test-audio.js`. Mutation-test in
your own copy at least six behaviours (e.g. skip the storage re-read before `canAsk`;
save twice; let a close path write a record; replay staging on reload; forget
`setSalonActive(false)` on skip; draw a dropped ask) and report which test catches each;
a mutation nothing catches is a finding (a missing test), with the test you would add.
Are the new suites wired into `package.json` and `.github/workflows/test.yml` where they
should be?

Return findings (only real, reproduced problems: severity must / should / nit, claim,
evidence with file:line + repro + numbers, suggested fix), a result line for each item
in B, the mutation table, and what you could not check.
