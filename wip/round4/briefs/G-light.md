# Lane G "light": evening and night a little brighter, the stairs easy to find in the dark (branch `lane/g-light`)

Read `wip/round4/briefs/COMMON.md` first.

## 1. Brighter evening and night (HANDOFF item 11)

Owner (11-14, 20:00 KST, on a phone): "지금 화면이 저녁이라 해도 너무 어두워서 조금 더 밝게 바꿔주고".
The values were already worked out in the previous round (its result was lost with that container; redo it with
exactly these numbers): **19-21 o'clock blend from dusk to night slowly in 8 steps** (no jump at 19:00 — today
`phaseOf(h)` switches `dusk` → `night` at 19), **night lantern intensity 1.2 → 1.5 and its reach 6 → 7.5**, **the
moonlit floor 0.4 → 0.48**. Find them in `js/scene3d.js` (`LIGHTS` ~279, `EM`, `FIRST_LIGHT` ~292, `phaseOf` ~293,
`applyLight` ~718, `applyFloor` ~742, `setTime` ~750, `applyLamp` ~1038, `lampK`, `nightK`); the loft and the play
room have their own lamps (`loftApplyLight` ~3776, `playApplyLight` ~3782) — apply the same spirit there if their
night is as dark. Keep `FIRST_LIGHT`'s guarantees (the 0-lantern ember, the moonlit floor that does not depend on the
lantern, the octopus's faint self-glow). It must still read as evening / night (warm lamp, darker window, cool sky).
"8 steps": the blend from 19:00 to 21:00 moves in 8 discrete steps (every 15 minutes) so the pixel look does not
shimmer; make the step function testable (a getter for the blend factor at a given hour). Check hours 17, 18, 19,
19:30, 20, 20:30, 21, 22, 0, 3, 5, 6 at lantern 0, 3, 8, clear and rain, in the attic, loft and play room; the 2D
fallback only if it is just as dark; the intro and the walk exterior must not get worse.

## 2. Stairs easy to see in the dark (HANDOFF item 12)

Owner (11-14): "계단이 어두울 때는 잘 안 보이는데 눈에 띄게 만들 방법 강구해줘".
The full brief is **`wip/round3/briefs/fix-stair.md`** (what exists: `STAIR` ~30, built ~863-869, `#btn-stair` over
`STAIR_BOX`, the loft hatch `LROOM.hatchBox`; the rule that the number of point lights stays the same across rooms
— no new real lights unless you prove no new shader program compiles). **Ignore** its paths, trees, "Lanes" and
"Do not commit" parts. Decision for this round (no need to compare many options): **pale tread edges that catch the
light (lighter nosing strips, faintly emissive only at evening / night) plus one small lantern or sconce at the foot
of the stairs drawn with the emissive / glow path** (no real light), and the same cue at the loft's hatch going down.
By day nothing changes. Lane A is adding a full 360° turn: the cue must read from every side (no cue hidden behind a
cut wall only; put the sconce on the stair's own stringer or post, not on a wall that gets cut).

## Not yours

The camera / turn (lane A), furniture (lane B), the yard (lane D: it will reuse the exterior's lighting rig).

## Tests

Deterministic: a getter for the dusk → night blend at 19:00, 19:15 … 21:00 (8 steps, monotonic), the lantern
night intensity 1.5 / reach 7.5 and moon floor 0.48 used by the scene at 22:00, a room-region luminance floor at
20:00 with lantern 3 (set from your measurements with a margin); the stair cue exists in the attic and the loft, is
lit at night and off by day, and the stair region's contrast at 20:00 with lantern 0 is above a floor you measure.
Run `npm test`, `node tools/test-scene-perf.js` (no new programs at room changes, frame time within limits), the
smoke letters that pin lights or looks (grep `LIGHTS`, `lantern`, `hour`, `night`, `stair`, `loft`; at least `Z`).

## Screenshots to commit (360x740)

One comparison sheet (rows = hours 17-23 and 3, columns = before / after) at lantern 3 clear, one for rain and
lantern 0, and the stairs at 20:00 / 02:00 before / after in the attic and the loft.
