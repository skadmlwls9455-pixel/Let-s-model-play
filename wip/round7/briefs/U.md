# Lane U — screen fixes and filling the screen (`lane/7-u`)

Read `COMMON.md` first, then `ANSWERS.md`, the owner's words (`wip/round7/README.md` B1 to B5, B8, E3 and the owner's four
answers at the end of section E), `wip/round7/maps/player-economy.md` sections 5, 6, 7 and `wip/round7/maps/world.md`
sections 3, 6.3, 9, 10.

## You own

- `js/app.js`: `roomTitle` and its uses (`renderStatus`, the document title, `pipsHead` / `hiddenRoomTitle`), the settings
  sheet builder `renderSettings` (not the builders of each section's content), the poster sticker block in `posterSVG`, new
  code under `[7-U]`.
- `index.html`: the `#status` row; `css/style.css`: the `#status` rules, the settings sheet rules, the stairs edge-button
  rules, new rules under `[7-U]`.
- `js/scene3d.js`: the `mode: 'edge'` branch of `spotInfo('atticStair')`, the post-process shader's treatment of empty
  ("void") pixels and the sky band, pausing the render loop; new functions under `[7-U]`. You do **not** change the camera
  distance, near / far planes, `PX_PER_M`, follow or pan code (lane W) or anything about the outside.
- New files: `js/vista.js` (below), `tools/test-vista.js`. Tests: the scenarios of `tools/smoke.js` and checks of
  `tools/test-light.js` that pin what you change (status row, settings, the stairs edge button L7, the hand-hint order).

## What to build, in this order (push after each)

1. **Status row: 'D+N' instead of the room title.** Remove the visible room title ('불씨 하나 켜진 다락' and its three
   siblings) from the status row and from the browser tab title (the tab title becomes '<name> · 뽈뽈 문어'). In its place
   show the day counter `D+N`, where N is the same number the player already sees as '들어온 날 N일째' (`userState().days.length`;
   before the first day is counted show nothing). It must be visible on phones too (360 px: name, 데모 tag, lantern cells and
   'D+N' all fit with a four-character name; if the lantern label or count must hide earlier to make room, that is fine).
   `aria-label` '들어온 지 N일째'. It updates when the day changes in an open tab. The screen-reader scene description keeps
   describing the room as today. Lantern tooltip: drop the room-title first line.
2. **Settings: sections folded.** Every section of the settings sheet becomes a `details` with its heading as the summary;
   **only '문어 선물 상자' and '내 모습' are open by default**, the rest closed; the open state is remembered while the page
   lives (the sheet is rebuilt on every open). Keep heading order, ids and focus behaviour. A pixel chevron picture, not a
   character, shows open / closed. Fix the tests that click controls inside sections that now start closed (open the
   section first); do not weaken what they check.
3. **The left-edge stairs button goes.** The owner: "문으로 나가려는데 … 문 근처에 가면 계단 버튼이 떠서 어색해." Remove the
   edge mode entirely (scene branch, CSS, the hand-hint step that points at it). The stairs stay tappable on their own
   drawing (the transparent spot over the visible steps) and reachable by keyboard. Check at 360x740 and 412x915 that the
   stairs can be reached by sliding the view, and say in your report how many CSS px of the stairs show in the default view.
4. **Poster stickers larger.** The owner: "지금은 너무 작아서 안 보여." Album cards show the topic sticker at 16 CSS px today.
   Make it 32 CSS px on album cards and about one and a half times today's size on the poster's front, choosing the size from
   the rendered width and the device pixel ratio so that each art pixel is a whole number of device pixels (map 7.2). The
   sticker must not cover the poster's title or room art (keep it in its strip). Runner stickers exist but were never loaded
   by the game (map 7.1): if everything else is done, load them and call `RUNNER_STICKERS.watch()` at a size of at least
   80 CSS px on a 360 px screen, whole device pixels; otherwise leave them and say so.
5. **Stop drawing the room behind full-screen games.** While the kitchen overlay or the runner dialog is open the 3D scene
   keeps rendering (battery, heat). Pause the scene's frame loop while either is open and resume on close with no visible
   jump (clocks that drive animations must not leap).
6. **Fill the empty screen.** The owner: "지금 화면이 비는 느낌이 최대 문제점." On a phone the room covers about half of the
   screen height (map 3.1); the room already spans the full width, so it cannot simply be made larger. Fill what is empty
   with a picture that belongs to the world: **the attic stands high above a seaside village.**
   - New `js/vista.js` (global `VISTA`, DOM-free painter): `VISTA.paint(w, h, { hour, weather, season, seed, t })` →
     `{ w, h, d: Uint8ClampedArray }` in art pixels, palette colours only. Upper part: sky for the hour (day, dusk, night
     with stars and a moon, dawn), a few stepped clouds (see `js/clouds.js` for the house cloud style), weather (rain streaks
     stay the scene's). Lower part, below where the room floats: a far view downhill — treetops, a few village roofs (two or
     three lit windows at night), the beach line and the sea to the horizon with slow stepped waves (2 to 4 frames a
     second, none with reduced motion). Calm and low in contrast so that the room stays the subject.
   - The scene uploads that picture as one texture and the post-process shader shows it **only on void pixels, only
     indoors** (attic, loft, play room), at whole art pixels, moving a little against rotation (a parallax of a few art
     pixels) so that it reads as distance. No new draw calls, no change to the checks that count void pixels unless you
     update them with the same meaning. The outside (yard and beyond) already has ground to the screen edge: leave it.
   - It must look good at 360x740, 412x915 and 1280x800, at noon, dusk and midnight, and at every rotation of the room.
     Look at six screenshots before you call it done.
   If this cannot be made solid in time, leave the code behind `?vista=1` and say so; items 1 to 5 must ship regardless.

## Checks

`npm test`; `SMOKE_ONLY=S,L,O,U,FM,J,Q node tools/smoke.js` (and any other scenario you touched); `node tools/test-light.js`;
`node tools/test-scene-perf.js` (draw calls and shader programs must not grow). Screenshots: the status row on 360, 412 and
1280 widths; the settings sheet as it opens; the album with larger stickers; the vista at three hours.

## Report

As in `COMMON.md`, with the measured sizes (status row widths, sticker sizes in CSS and device px on both phones).
