# The stairs are hard to see in the dark: make them easy to find (lane "stair")

Read `/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final/COMMON4.md` first (the project,
the hard lines, how to run things). Your label (scratch folder) is in your task message. You edit only the tree
named in your task message (branch `fix-stair`; its base commit is the finished lane "look", which made evening and
night a little brighter on top of `12ba4e9`; `node_modules` is an untracked symlink, never stage it). Do not commit.

## What the owner said (11-14, evening, on a phone)

"계단이 어두울 때는 잘 안 보이는데 눈에 띄게 만들 방법 강구해줘" — when it is dark the stairs are hard to see; find a
way to make them stand out.

## What exists

- The attic stairs to the loft (위층): `js/scene3d.js` `STAIR` (~30: x 2.62-3.46, z -2.42 to -1.72, top 2.5) built
  near 863-869 (7 treads alternating `W[3]` / `W[4]`, two stringers `W[1]`, a handrail `W[2]`) in the dark back-right
  corner; the tap target `#btn-stair` (an invisible `scene-spot` over `STAIR_BOX`, ~2782 / ~2809); walking into the
  stairs with the stick climbs them (~2585). In the loft, the way down is the hatch (`LROOM.hatchBox`, ~3713).
- Lights: `LIGHTS` / `FIRST_LIGHT` (~276-293, already adjusted by the lane "look" in your base), the lamp and
  candle point lights, the emissive / bloom path (`emTwin`, `EM`, the glow sprites like `candleGlow`). **The number of
  point lights is kept the same across rooms on purpose** (no new shader program at the first room change: read the
  comments near 684 and 3498): do not add a real point light unless you also keep that promise and prove no new
  program compiles (`renderer.info.programs`).
- Another lane (cam) is adding left/right turning of the view, up to about ±45° around the default: whatever you
  add must read from those angles too.

## What to make true

At evening and night, with any lantern level and weather, a player sees at a glance that there are stairs in that
corner and where they go, in the attic and (going down) in the loft, while the room stays cozy and dark-ish and
the pixel look holds (palette snap, outlines, dither). By day nothing gets worse.

Compare a few ways on renders before choosing, for example: a small light source that belongs in the room (a
wall sconce or a little lantern at the foot or the top of the stairs) using the emissive / glow path rather than a
real light; pale step edges that catch the light (lighter nosing strips, faintly emissive only at night); a faint
moonlight patch from a small roof window above the stairs; a cue in the UI over the hotspot when dark (last
resort: this game prefers cues inside the scene). Pick what reads best; combine two if one is not enough. No text
labels; no emoji.

## Lanes

Other agents may work at the same time (cam: the camera; furn and a furniture-UX lane: the furniture code ~1177-1300
and the furniture UI; honest3: faces and lines). Stay inside the stairs, the hatch, their light and glow, their
tests and docs (`docs/SCENE.md`). The load rule in COMMON4.md applies.

## Rules

- Smallest change that reads well. Match the file's style (comments short, Korean, dated `11-14`, saying why).
- Performance: `node tools/test-scene-perf.js` stays within its limits; no new shader programs at room changes.

## How to judge and show

Render before/after at 360x740 (and one 320x568 set) at 18, 20, 22 and 2 o'clock, lantern 0, 3 and 8, clear and
rain, in the attic (and the loft's hatch), at the default view and turned ±25° (the twist exists in your base: `st.look.yaw`
via the scene API or the dev panel). Look at every picture yourself, and measure the stairs' contrast against the
corner. Make one comparison sheet the owner can read at a glance. Full paths in the report.

## Tests that fail without the fix

A deterministic check that pins the cue (for example the cue object exists in the attic and the loft, is lit at
night and as before by day, and the stair region's contrast at 20:00 with 0 lantern cells is above a floor set from
your measurements). Revert the change in a scratch copy and name the check that fails (mutation table).

## Suites

`npm test`; `node tools/test-scene-perf.js`; the smoke letters that cover the stairs and the loft (grep `stair`,
`loft` in `tools/smoke.js`; at least `Z`) until each passes twice in a row, or explain a load-only failure with a
control run on the base. Keep scratch copies in `/dev/shm` and delete them. Put back every tracked evidence file you
did not mean to change.

## Report

What you tried and why you chose it, the change (file:line, before → after), the comparison sheet and the
measurements, the checks and the mutation table, suite totals, what you did not verify.
