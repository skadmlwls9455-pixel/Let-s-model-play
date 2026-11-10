# Task: finish-b — assess the interrupted salon build and finish it (you MAY edit WT)

Read `SCRATCH/salon2/v2/COMMON.md` first, then `SCRATCH/salon/SPEC.md` (all of it),
`SCRATCH/salon2/REPORT_A.md` and `SCRATCH/salon2/REPORT_DOCS.md`.
Your scratch folder: `SCRATCH/salon2/v2/finish-b/`. You are the only agent editing WT now.

BUILD B was cut off before it could report. **Do not start over.** The code is probably
complete. Your job is to find out what is really there, finish what is missing, and write
the report it never wrote.

## The brief BUILD B was given (the checklist to assess against)

THE SALON: SPEC §3 all, §3.7 log + album diary, §7.5 other tabs via `SALON.merge`, the dev
'next salon answer' control (`DEV_EXPLICIT` only), the sound hooks of §3.9, the smoke
'미용실' block, the test-model-voice additions of §9.2, and the test-audio salon check of §9.5.

- `#btn-salon` comes from the scene hotspots (`setSalonOpen` rules of §3.1). `#salon-sheet`
  is a `dialog.sheet` like the settings and album sheets (handle drag, Esc, outside tap);
  no backdrop for the salon sheet only, both themes; bottles 36 px visible / 44 px hit,
  8 px gap, one row for 6 at 320 px, 4 + 3 for 7; the name line is `role=status` and keeps
  one line of height; [물어보기] is `aria-disabled` until a pick; every close path writes 0
  records and calls `salonOffer(null)`.
- salonAsk: re-read storage and merge, then `SALON.canAsk`; if false close and show that
  toast. Decide the answer and save in one `save()` (the scene keeps the old colour until
  staging ends). The sheet closes; `salonActive` pauses wander, think bubbles, petting, tap
  reactions and window walks. Rows appear on the beat (house / octopus / house voices,
  chooser tail always). Staging per §3.4 through the scene API; a guard like `runCeremony`
  (hidden tab, timeout, WebGL context loss); the main button finishes staging first;
  reload never replays (rows already there, new colour).
- Pass lines: the mirror button box bottom and the octopus by the mirror stay above the
  sheet's top edge at 320x568, 360x640, 412x780 x pixel/system fonts x light/dark; no
  horizontal scroll; no emoji or symbols anywhere in the sheet.
- BUILD A's "Notes for BUILD B" (in REPORT_A.md) list what was left for B: `ITEM_LEVEL.salon`,
  `ANCHORS.salon`, `anchorName`, `allowedIdleAnchors`, `SPOT_DESC.salon` and the scene
  description colour line, `ROOM_SPOT.salon`, `#btn-salon`, `#salon-sheet` in `bindDialogs`
  and `bindSheetDrag`, '대답' in `VOICE_LABELS`, `renderLog` / `dayRows` / `diaryDays`,
  `goTap` calling `salonFinish` first, guarded `AUDIO.on('salon')`, the dev control, §9.2, §9.5.

## Steps

1. Read the whole salon change (`git -C /home/user/ppolppol-salon2 diff @@K@@ -- js css index.html tools`).
   Build a table: each requirement above and each SPEC §3 / §3.7 / §7.5 / §3.9 / §9.2 /
   §9.3 / §9.5 item → done / partly / missing, with file:line. Write it to your notes.
2. Play it once yourself in a phone-sized browser (first run → lantern-2 save → mirror →
   sheet → ask → staging → rows → next day → a keep answer) before changing anything.
   The probe scripts in `SCRATCH/salon2/` show how the builder drove it.
3. Finish what is partly done or missing. Fix bugs you hit. Keep changes small; this is
   not a rewrite. If the code deliberately differs from the spec for a welfare reason,
   keep the code and note it for the docs.
4. Docs: check the six points in REPORT_DOCS.md against the final code and correct
   `docs/SALON.md` and the other docs where they differ (small edits; the smoke letter is
   `Y`). Do not touch `docs/COOK_PROTO.md`.
5. Regression on WT (the base moved under this code, so earlier green logs do not count):
   `npm test`; smoke `Y,S,O` first, then every other smoke letter in groups that fit the
   600 s limit (background + poll the log); `test-audio`; `test-scene-perf`; `test-play`;
   the font check; `node tools/bundle.js` and one salon ask inside `dist/ppolppol.html`.
   Also the kitchen suites once (`node tools/test-cook.js`, `tools/test-cook-live.js`,
   `tools/test-cook-audio.js`) to show this work did not disturb them. Restore
   `tests/evidence` after browser runs. Report exact counts; for a failure say whether it
   also fails on a clean copy of `@@K@@`.
6. Re-take the review shots into `SCRATCH/salon2/v2/finish-b/shots/` at deviceScaleFactor
   2: mirror corner day and night with the button; a bottle offered; the splash frame; the
   sheet at 320 / 360 / 412 wide x pixel/system x light/dark; first run at 320x460 and
   320x568; the three log rows; a resting bottle; the album diary of a day with only an
   ask. Look at every shot yourself and say what you see (anything clipped, overlapping,
   unreadable, off-palette).

## Return

The requirement table (done / fixed now / still missing), what you changed (file,
function, why), test counts, shot paths with one line each on what they show, the doc
edits, every judgement call, and anything unsure. Plain and specific.
