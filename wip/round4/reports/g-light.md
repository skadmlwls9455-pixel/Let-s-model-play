# Lane G "light" report (branch `lane/g-light`, base 5bb3db8)

## Conclusion
Evening and night are a little brighter without losing the night look, and the stairs are easy to find in the dark in both the attic and the loft. Day looks the same.
- **Dusk to night is gradual.** 19:00–21:00 now blends from dusk to night in 8 steps of 15 minutes, so there is no jump at 19:00.
- **Night values:** lantern 1.2 → 1.5, reach 6 → 7.5, moonlit floor 0.4 → 0.48. The loft and play room wall lamps are ×1.25 at night.
- **Stairs:** pale tread-edge strips plus a small lantern on the stair's own foot post. The loft hatch gets the same cue: a pale rim, two tread strips and a lantern on the camera-side post. Both use the emissive / glow path only (no new real light), so the shader program count stays the same: 32 before and after every room change.
- **Room brightness at night** (mean luma of the room band, 360x740): attic +12–19%, loft +3% → +19%, play room +1% → +22%. At 19:00 the room is still at its dusk level (+45–90% versus the old instant night).

## Changes
- `js/scene3d.js`
  - `LIGHTS.night`: `lamp` 1.2 → 1.5, `lampD` 6 → 7.5. The pool decal grows with `lampD/6`.
  - `FIRST_LIGHT.hemiI` 0.4 → 0.48 (the moonlit floor).
  - New top-level `duskBlend(h)`: 0 before 19:00, then `floor((h-19)*4)/8`, and 1 from 21:00 and before 06:00.
  - New `lightKey(h)`: `dusk` / `dn0…dn7` / `night` / …
  - New `lightAt(h)`: a fresh dusk/night mix from the current `LIGHTS` values (not cached, so live `LIGHTS` edits still apply). Both functions are exported on `SCENE3D`.
  - `setTime` compares light keys instead of phase objects. Every 15-minute step therefore eases over the existing 60 s transition. `phaseOf` is unchanged (stars, exterior sky and `isNight` still switch at 19).
  - The fade color uses `light.to.bg`.
  - `applyLamp`: with 0 lantern cells, the ember is now on whenever `nightK() > 1e-3`. It used to need `>= 0.5`, which with the blend meant 20:15. Its strength still follows `lampK` × `nightK`. This was found by the independent check.
  - New `roomNightUp()` = 1 + 0.25·`nightK`. `loftApplyLight` and `playApplyLight` multiply their wall lamps' intensity and distance by it.
  - New `stairCue(parent, edges, lanAt)`, `stairCueK()` = clamp((em−0.6)/0.4) (day and dawn 0 → hidden, dusk 0.5, night 1), `cueApply(q)`, and `CUE` strengths. It reuses the existing `lambert` and `basicV` materials, emissive twins, and a glow material with the same parameters as `glowMat`. `ATTIC_CUE` is built inside the stair code. `LROOM.cue` is built in `buildLoft`. Both are applied from `applyLight`, and the glow faces the camera each frame.
  - `stats()` gains `duskK`, `lightKey`, `lampI`, `lampD`, `lampBase`, `moonHemi`, `hemiNow`, `cueK`, `cueAttic` and `cueLoft`.
- `tools/test-light.js` (new). It is added to `test:slow` in `package.json` and as CI matrix entry `light` in `.github/workflows/test.yml`.
- `docs/SCENE.md`: two short paragraphs (evening and night · stair cue).
- `wip/round4/g-probe.js`: the probe (hours × lantern × weather × room → screenshots, luma). Notes are in `wip/round4/notes/g-light.md`.

## Decisions (where the brief left a choice)
1. **The blend is applied through a key, not by changing `phaseOf`.** The phase stays "night" from 19:00, so stars and the exterior sky-object choice are unchanged. Only the light values blend.
2. **Each 15-minute step uses the existing 60 s ease**, not an instant pop. This is the same mechanism phase changes already use. No per-minute blending, so the dither does not shimmer.
3. **The cue shows at dusk and night only (k = clamp((em−0.6)/0.4)).** It is hidden at day and dawn. The lantern object is hidden by day too, because the brief says "by day nothing changes".
4. **The cue does not depend on the lantern level**, so it is just as visible with 0 cells.
5. **The loft lantern is on the hatch's camera-side post (x1, z1)**, not the entry post (x0, z1): the player stands right next to the entry post after coming up.
6. **The loft and play room got the same ×1.25 night lift** (their night was +1–3% without it).
7. **The 2D fallback is not changed.** `js/scene2d.js` has no time-of-day lighting at all, so it is not dark.
8. **The light test is a new standalone file** rather than a smoke letter: all 26 letters are taken, and a separate file merges more cleanly with the other lanes.
9. **The exterior during 19–21 now leans toward dusk.** It shares `light.em` / `out` / `winEm`, so it is a little lighter there, not worse. Exterior night values are unchanged.

## Player-facing lines
None changed. No font regeneration was needed.

## Checks added: `tools/test-light.js` (17 checks, deterministic)
- **L1 blend:**
  - At 19:00, 19:15 … 21:00 the blend is exactly 0, 1/8 … 1.
  - It is 0 before 19, and 19:14 is still the first step.
  - It rises monotonically from 18:45 to 21:15.
  - There are 10 light-key groups (dusk, dn0…dn7, night).
  - Scene em is unchanged from 18:54 to 19:00 (0.8 → 0.8).
- **L2 night values:**
  - The scene uses lamp 1.5 / reach 7.5 at 22:00.
  - Moon hemi is 0.48, and the hemi is 0.48 at 0 cells.
  - The 0-cell ember is on from 19:15 and grows with the blend.
- **L3 room brightness:** attic room band at 20:00, lantern 3, clear is ≥ 0.135 (before 0.117, now 0.147).
- **L4 stair cue:**
  - It is lit at 22:00 and 20:00 and off at 12:00 and 07:00, in the attic and the loft.
  - Attic stair spot at 20:00, lantern 0: luma p95−p50 ≥ 0.4 (before 0.032, now 0.73).
  - Loft hatch spot at 20:00, lantern 0: pixels with luma > 0.6 ≥ 60 (before 0, now about 136–184).
  - Shader programs are unchanged after attic → loft → attic (32 → 32).

### Mutation table
Each mutation was applied to a scratch copy, then `test-light` was run on it:

| mutation | failing checks |
|---|---|
| `duskBlend` always 1 (old instant night) | 4 L1 checks |
| lamp 1.2 / lampD 6 | L2 lamp |
| hemiI 0.4 | L2 moon floor |
| cue never shown | 4 L4 (attic and loft on, attic spread 0.116, loft bright 0) |
| cue always shown (also by day) | 3 L4 (12:00 and 07:00 off) |
| ember threshold back to `nightK >= 0.5` | L2 ember (lampI 0 at 19:15) |

The base commit fails at the first L1 call (`SCENE3D.duskBlend` does not exist).

## Suites
- **`npm test`:** passes (exit 0; 547 + 26 + 568 + 225 + 192 + 235 + 46 … all 0 failed).
- **`node tools/test-scene-perf.js`:** 111 passed, 0 failed. No new programs; frame time is within its limits.
- **`node tools/test-light.js`:** 17 passed, 0 failed.
- **`SMOKE_ONLY=Z node tools/smoke.js`** (loft and stairs):
  - First run: 66 passed, then crashed with "Target page … has been closed" while the independent reviewer and the screenshot jobs were loading the machine.
  - Rerun: 70 passed, 0 failed.
  - The first rerun loaded the scene before the final small ember fix. That fix changes only the ember threshold and is covered by test-light.
- **Other smoke letters:** I grepped smoke for `LIGHTS`, `lantern`, `hour`, `night` and `stair`. No other letter pins light values or the hour switch, so I did not run them separately.

## Screenshots (`wip/round4/shots/g-light/`)
- `sheet-L3-clear.png`: attic, lantern 3, clear. Rows are 17–23 h and 3 h; left column before, right after.
- `sheet-L0-rain.png`: the same sheet at lantern 0, rain.
- `stairs-attic-12-20-02.png`: attic stairs (view panned toward them) at 12:00 / 20:00 / 02:00, before | after, lantern 0, clear. Day is identical; at night the tread edges and the foot lantern show.
- `stairs-loft-12-20-02.png`: loft hatch, same layout.

## Independent check (fresh subagent, one round)
- **No `must`.** Day was unchanged (0–2.8% of pixels differ, all from animation), programs stayed stable at 360x740 and 320x568, and there were no console errors. Transitions worked, the cue reads at yaw ±25° and when panned, and the intro at 22:00 was fine.
- **One `should`, fixed:** the 0-cell ember stayed off from 19:00 to 20:15 (the old `nightK >= 0.5` threshold plus float rounding at 20:00). The fix is described above, and a test now covers it.

## Left, and not verified
- **Tread strips are subtle at the default 360-wide view.** At the default framing most of the attic stairs are off the right edge, so the lantern glow carries the cue there. When panned or turned, the strips read clearly. I did not move the stairs or the camera (that is lane A's camera).
- **Lane A's full 360° turn** is not in this base. The cue sits on the stair's own post and stringer line, not on a wall, and I checked it at yaw ±25° only.
- **Walk exterior and intro.** I did not take a walk to the exterior at 19–21 h. By code it only gets slightly lighter there. The independent check looked at the intro at 19:30 / 20:00 / 22:00 before the ember fix.
- **Real phone GPU:** not checked. Everything was rendered with swiftshader.
