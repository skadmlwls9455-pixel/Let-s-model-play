# Turning the view left and right, so the room feels less boxed in (lane "cam")

Read `/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final/COMMON4.md` first (the project,
the hard lines, how to run things, the SHEET_SETTLE test gotcha). Your label (scratch folder) is in your task message.
You edit only **`/home/user/ppolppol-fix-cam`** (branch `fix-cam`, base **`12ba4e9`** = production `a850175` + notes;
`node_modules` is an untracked symlink, never stage it). Do not commit.

## What the owner said (11-14, on a phone, evening)

"줌인 줌 아웃만 되는 게 불편해서 그런데 좌우로도 회전 기능 넣어줘서 좀 더 입체적으로 볼 수 있게 해줄래? 지금은 뭔가 딱
막힌 느낌이야." — only zoom in and out feels limiting; add turning left and right so the room can be seen more in
3D; right now it feels boxed in.

## What exists (at `12ba4e9`)

- `js/scene3d.js`: an orthographic camera at `TILT` 32° and `YAW` 45° (`placeCamera` ~472). A turn already exists but
  is hidden: `yawDrag` + `yawDelta()` (~450) clamps to **±25°** and snaps to **9°** steps; it is reached only by a
  two-finger **twist** past 15° (`multiMove` ~4215, mode `'twist'`) or, with a mouse, right-drag / shift-drag (mode
  `'yaw'`); the dev panel has a yaw slider (`st.look.yaw`). The owner did not find it. Pinch zooms; one finger pans
  (with momentum and a rubber band, `panBox`); the two-finger midpoint also pans during a pinch.
- The rooms were built for the default view: the attic has no right wall and no front wall (cut-away), the window,
  roof and walls cast the light patches (`LIGHTS`), props sit against walls, and the loft (위층) and the play room
  (놀이방) have their own geometry. Pixel look: `snapScreen` keeps panning crisp; the outline and dither passes.
- Things that depend on the view: `camYaw()` (the octopus and the player character turn to face the camera; the
  salon's `salYawTo`), the player stick (moves relative to the screen: check `_r`), the furniture carry (in front of
  the character), the DOM hotspots anchored to 3D points (doors, stairs, mirror, sofa spot, plots), bubbles above the
  octopus, the tutorial spotlight, tap picking, `panBox` limits, the 2D fallback (no camera).

## What to build

1. **A turn the owner finds without being told**, comfortable with one thumb on a phone. Recommended: two small
   pixel-icon buttons (turn left / turn right) at an edge of the scene where nothing else lives at 360x740 and
   320x568 (check `UIART.avoidCtl` and the existing control groups), each tap turning one step with a short ease,
   holding keeps turning; plus keep the twist and the mouse paths. Icons are pixel images like
   `assets/icons/ctl/*.png` (hard line 6: no arrow characters in text); aria-labels in plain Korean (for example
   '왼쪽으로 돌려 보기' / '오른쪽으로 돌려 보기'); the button press style matches the other scene buttons. If you find a
   better pattern, say why with screenshots.
2. **A wider range where the rooms hold up.** Render each room (attic, loft, play room, the outside yard if the
   turn applies there) from the default view out to ±45° in 5° steps and look at every picture: gaps at the missing
   walls, the void beyond the floor, light leaks, walls blocking the room, the roof, the window light patch, props
   floating off walls, pixel crawl. Pick the widest range per room that looks right, and widen it further only with
   small, safe fixes (for example fading or hiding a wall that comes between the camera and the room, or extending a
   floor edge). Do not rebuild the rooms. Report the range you chose and the pictures that decided it.
3. **Everything that depends on the view keeps working at every angle:** the stick (up on the stick = away on the
   screen), the furniture carry, hotspots and bubbles in the right places, taps hit what they show, pan limits, the
   octopus and the character facing the camera, the salon scenes, the tutorial, reduced motion (steps without
   animation), the 2D fallback (no turn buttons). Decide whether the angle is kept for the session or for good, and
   whether a room change or a cut-scene resets it; say why.
4. Smoothness and the pixel look: smooth while turning, crisp at rest (keep or change the 9° snap; say why).

## Lanes

Other agents work at the same time: lane imp2 (`/home/user/ppolppol-fix-imp2`: import and reset), lane furn
(`/home/user/ppolppol-fix-furn`: the furniture code in `js/scene3d.js` near 1177-1300 and its checks), lane look
(`/home/user/ppolppol-fix-look`: the time-of-day light values `LIGHTS` / `FIRST_LIGHT`), lane honest3
(`/home/user/ppolppol-fix-honest3`: faces and lines), a furniture-UX probe. Stay out of those parts; your area is the
camera, the turn input, the new buttons, what depends on the view, their tests and docs (`docs/SCENE.md` camera
section, `docs/UI_ART.md` for the icons). If the turn needs a change inside another lane's code, keep it minimal and
name it in the report. The load rule in COMMON4.md applies.

## Rules

- Smallest change that does the job well. Match each file's style (comments short, Korean, dated `11-14`, saying why).
- Hard lines: no emoji or symbols in text; sound off by default; saved data unchanged (if you persist the angle, it
  goes in prefs and old saves load).
- Font check if you add Korean text.

## Tests that fail without the fix

Smoke checks (a new part of the scenario that covers the scene controls, or a new letter if none fits): the buttons
exist in 3D and not in 2D, a tap turns by one step and the range clamps, the stick still moves the character away on
screen after a turn, a hotspot stays on its object after a turn, reduced motion turns without easing. Revert each
part alone in a scratch copy and name the check that fails (mutation table).

## Suites

`npm test`; the font check; `node tools/test-scene-perf.js` (taps and frame time); the smoke letters that touch the
camera and the controls (find them with grep: at least `A`, `O`, `Z`) until each passes twice in a row, or explain a
load-only failure with a control run on the base. Keep scratch copies in `/dev/shm` and delete them. Put back every
tracked evidence file you did not mean to change.

## Report

What you built (file:line, before → after), the range per room and the pictures that decided it, the controls with
screenshots at 360x740 and 320x568, a short frame strip or a few frames of a turn, the checks and the mutation
table, suite totals, what you did not verify. Full paths for every picture.
