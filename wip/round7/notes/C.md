# Lane C notes (cafe) — 11-21

## Plan (in order, push after each)
1. docs/CAFE_MUSIC.md (owner's list) — first.
2. js/cafe.js (CAFE: menu, prices, eating, records, normalize/merge) + tools/test-cafe.js.
3. js/cafe-music.js (CAFE_MUSIC: 8 tunes from public-domain typesets, own synth) + tools/build-cafe-music.js (MIDI -> note data) + check against source.
4. app.js [7-C]: menu sheet (#cafe-sheet), serving tray (#cafe-tray), record sheet (#cafe-lp-sheet), APP.openCafe / APP.openRecords.
5. tools/test-cafe-live.js, screenshots, one independent check, report.

## Cut first
tunes beyond four -> flying recipe card -> wow.

## Decisions (defaults taken)
- Music runs on a small AudioContext of its own, made only on the player's touch of a sleeve (or the speaker button) with the sound setting on.
  js/audio.js keeps its context private and is silent on file://; I may not edit it. While a record plays the home music bus is turned to 0
  through the public AUDIO.setVolume('bgm', 0) (not saved) and put back on stop.
- The served dish is always eaten on a small picture tray at the bottom of the screen (works with and without lane V's seat).
- Sources: Mutopia typesets marked Public Domain only (CC BY / BY-SA ones left out).

## State
(see git log)
