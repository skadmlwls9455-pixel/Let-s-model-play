# Lane D notes (round 6)

## Booth layout (spec §4.1) — first commit

> Updated after the first commit (what the code has now): table x −0.47..−0.06 (was −0.01 — my torso box reaches 0.26 forward), z −1.70..−0.80; the dish spot is the table's front (x −0.265, z −0.99) so neither head hides it; seats are staggered in z so my head does not cover the octopus's face: octopus (−0.95, 0.42, −1.04) yaw 70°, me (0.21, 0.18, −1.36) yaw −90°. The rest below is the first commit's text.

Play-room group coordinates, metres; floor y 0; camera from +x+z. Code: `BOOTH` + `boothParts()` next to `buildPlayRoom` in
`js/scene3d.js`; `PROOM.boothBox` is the obstacle / hotspot box; the keep box goes into `cutSplit` `keep`.

**Place: candidate B** (the back-wall slot between the arcade and the counter, pulled off the back wall, sofas facing along x).
Why B:
- The T7 corridors fix the x range: booth + `PL_RAD` 0.25 must stay off the arcade lane x −1.8 and the counter lane x 0.95 →
  booth x ∈ (−1.55, 0.70). Chosen x −1.53 .. 0.66 (expanded edges −1.78 / 0.91, 2 cm and 4 cm inside the lanes).
- The door lane (z −0.33 for x −2.45 .. −1.0) and the rest-spot walk ((0.15, 0.45) → (0.93, −0.33)) fix the front: booth max z
  < −0.58. Chosen z1 = −0.62 (expanded −0.37; the rest walk passes x 0.91 at z −0.31, 6 cm clear).
- The arcade's front (z −2.20) and the counter's front (z −2.15) fix the back: chosen z0 = −1.92 (0.28 m to the arcade box,
  0.23 m to the counter box → rule 7 "within ≈ 0.3 m of the counter" holds).
- A (against the back wall, 2.06 m between the arcade and counter boxes) is 6 cm too narrow for the x budget below. C (facing
  along z) puts the octopus's sofa against the back wall, reachable only from its ends, and the 0.84 m head + legs do not pass
  the 0.28 m end gaps. So B: every T7 corridor and the rest spot stay free, T7 numbers unchanged (no fallback).

**x budget (facing axis)** — 2.19 m:

| part | x from | x to | note |
|---|---|---|---|
| octopus sofa back (0.12) | −1.53 | −1.41 | backrest face −1.41 |
| octopus seat (0.62 deep) | −1.41 | −0.79 | seat top 0.42 |
| octopus seated origin | −0.95 | | face → origin 0.46 (head back −1.37, 0.04 clear) |
| table (0.46) | −0.47 | −0.01 | origin → table edge 0.48 |
| my seat (0.54 deep) | 0.00 | 0.54 | seat top 0.42; front edge under the table edge |
| my seated origin | 0.21 | | table edge → origin 0.22, origin → backrest face 0.33 |
| my sofa back (0.12) | 0.54 | 0.66 | |

**z**: sofas z −1.92 .. −0.62 (1.30 m long two-seaters, two cushions each 0.58 m), one arm at the back-wall end (z −1.92 ..
−1.80, top 0.58), open front end (+z) — that is where each character hops on. Back top 0.82. Table z −1.52 .. −0.72 (0.80),
top 0.63 (rim W[2] 0.57..0.618 + face W[3]), four W[1] legs, `PAL.paper[2]` mat 0.30 × 0.40 at the table centre.
Seats: both at z −1.12.

| item | value |
|---|---|
| obstacle box (`PROOM.boothBox`) | x −1.53..0.66, y 0..0.82, z −1.92..−0.62 |
| keep box (cutSplit) | x −1.58..0.71, y −1..0.92, z −1.97..−0.57 |
| seat oct | (−0.95, 0.42, −1.12), yaw +90° (faces +x → camera 3/4) |
| seat me | (0.21, 0.18, −1.12) (origin = seat top − 0.24), yaw −90° |
| aisle oct | (−0.95, 0.02), reached from the door anchor (−2.45, −0.33) via (−2.0, 0.02) |
| aisle me | (0.21, −0.30) |
| dish centre | (−0.24, 0.63, −1.12) |

**Rules, analytic (T8 measures on the real meshes)**:
- Octopus head at the tabletop height (0.21 above the origin): half-width 0.369 → clearance to the table edge 0.48 − 0.369 =
  0.11 upright; leaned 8° the front at that height ≈ 0.438 → 0.042 ≥ 0.03.
- Octopus head back: −0.95 − 0.42 = −1.37 vs backrest face −1.41 → 0.04.
- My hair shell (centre 0.24 behind the origin when facing −x, r 0.38): at the backrest top (0.82, 0.08 below the hair centre
  1.08 … ) — measured in T8.
- Octopus walk-in: legs reach 0.62 m; path door → (−2.0, 0.02) → (−0.95, 0.02) stays ≥ 0.64 m from the booth box.

**Cushion ramp**: `PAL.sky` (sky[2] cushions, sky[1] back/arms, sky[3] 1-px tops). It reads apart from the brown floor, the
grey-green wall and the wood/paper counter by day; at night it goes slate-blue and still separates from the warm floor. Moss
would sit close to the wall's green-grey by day.

Shots: `wip/round6/shots/D/1-layout-360.png`, `1-layout-412.png` (day 0°, day 180°, night 0°, night 180° each).


## J3 (loft stair tap) — dropped

Removed at the owner's request: the owner's other branch moved the stair to the left wall's front corner, which solves J3 there. The attic pick and smoke `scenarioLoft` are back to the base lines.
