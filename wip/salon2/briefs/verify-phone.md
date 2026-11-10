# Task: verify-phone — play it like a phone player (READ-ONLY on WT)

Read `SCRATCH/salon2/v2/COMMON.md` first, then SPEC §1, §3 and §5 (`SCRATCH/salon/SPEC.md`).
Your scratch folder: `SCRATCH/salon2/v2/verify-phone/`. The finisher's report is at the end
of your prompt: do not trust it; check the game. Do not edit WT. Serve WT with a local
static server or file://, or use your own copy (COMMON rule 5).

Play the game the way a real player would, in Playwright Chromium with `isMobile`,
`hasTouch`, at 360x740, 320x568 and 412x780; pixel and system fonts; light and dark.

1. First run: name + colour row (six buttons, one row at 320 px), portrait-only preview
   (the scene octopus changes once, on save), focus, the honesty line visible at 320x568
   in both fonts, the save button visible at 320x460.
2. Settings after the first pick: no way to change the colour; before lantern 2 no colour
   block at all; from lantern 2 the one line that points to the mirror.
3. With a save fixture at lantern 2: find the mirror, open the sheet, pick a bottle, close
   (nothing recorded, the bottle goes back), pick again, ask, watch the staging to the
   end at normal speed (do not skip): row 1, the pause, the answer, the tub and splash or
   the plain keep, row 3 with the chooser tail.
4. Tap the mirror again the same day (toast, no sheet). Next day (`__ppolTest.today` or the
   test hook the smoke block uses): a keep answer, then the resting bottle line for that
   colour on following days, and that it opens again after 7 days.
5. Octopus asleep: the mirror answers "쿨쿨…" only and does not wake it. Octopus away on a
   walk: no mirror button.
6. Reduced motion: staging without movement, same rhythm, same rows.
7. The main button pressed mid-staging: staging finishes at once (new colour, tub gone,
   rows complete), then the walk invitation behaves as usual.
8. Reload mid-staging and after: no replay, rows already there, new colour.
9. The album diary for a day that has only an ask; the day header count.
10. Layout pass lines at 320x568, 360x640, 412x780 x pixel/system x light/dark: the mirror
    button box bottom and the octopus by the mirror stay above the sheet's top edge; no
    horizontal scroll; nothing clipped; buttons at least 44 px; text readable.
11. Screen reader names: `#btn-salon`, each bottle state, the status line, the rows, the
    scene description with the colour sentence.
12. Anything developer-facing, any emoji or unicode symbol, any English, any jargon.
13. Is it clear without instructions, cozy, quick? Where would a first-time player be
    confused? (Mark these as taste unless something is actually broken.)

Save shots (deviceScaleFactor 2 for ones worth showing a person) in your scratch folder
and LOOK at them: describe what you actually see, not what the code should draw.

Return findings (only real problems: severity must / should / nit, a concrete claim,
evidence = repro steps + shot path or measured numbers + file:line, suggested fix), a
checklist with a result for each numbered item above, shot paths, and what you could not check.
