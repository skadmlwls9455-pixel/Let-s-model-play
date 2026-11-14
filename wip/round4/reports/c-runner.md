# Lane C — runner-2 portrait full screen (report)

## Conclusion
Done. The runner is a full-screen portrait run, version `runner-2`. On screen:
- Small score and best at the top left, '닫기' at the top right.
- Two translucent 76 px round buttons in the bottom corners: jump on the left, duck on the right. Taps anywhere else do nothing.
- The octopus is about 91 CSS px (about 2.1× the old 43 px).
- A calm attic picture fills the space above the run band: sloped ceiling, a big window with sun, sunset or stars and the seasonal tree, and shelves.

Saves and server:
- The old best stays as '예전 게임 최고 N'. The new best is `best2` and starts at 0.
- The server replays runner-2 and rejects runner-1 tokens (`old_version`). The client handles that quietly.
- Weekly boards are kept per version, and old entries stay stored.

All suites I ran are green. One independent check found 3 `should` defects and no `must`; all three are fixed.

## Changes
- **`js/runner.js`**
  - **Sim:** `VERSION 'runner-2'`. `OCT_X` 30 → 10. `V0/VMAX/RAMP` 320/704/12 → 224/358/24 (0.875 → 1.4 px/tick, top speed after about 54 s). `KINDS.rain.w` 24 → 20. Everything else is unchanged: physics, obstacles, seed, inputs and scoring.
  - **`buildDialog`:** removed the title h2, the HUD line, the guide line, the memo and the moss HUD. Removed the canvas tap and swipe handlers. New DOM order: stage, top bar (`rn-hud` + `rn-close`), `rn-mid` (award + msg), round pads `rn-jump`/`rn-duck` (aria-label 점프/숙이기), and the end card. IDs are kept for the suites.
  - **`fit`:** the canvas covers the dialog. Integer device px `k = ⌊ZOOM·dpr⌋` with `ZOOM = 3.5`, the one tunable size constant. It shrinks on short screens so the ~84 px run band sits above the pads. It grows so the visible width is ≤ `C.W` 192 (spawn is at 200). The ground line is 10 px above the pads' top. `RUNNER.live().view` and `.duck` are exposed for tests.
  - **`draw`/`drawRoom`/`shelf`/`drawWindow`:** the new full-height picture. Only the band wall and posts have ½ parallax, and that is 0 in reduced motion. Shake, particles and flicker are already off in reduced motion.
  - **Store:** `bestOf` reads `best2`, `oldBestOf` reads `best`. `saveRun` writes `best2` only.
  - **End card:** buttons '다시'/'닫기' sit above the ranking box. Focus uses `preventScroll` and `scrollTop = 0`. '예전 게임 최고 N' shows only when `best > 0`.
  - **Net:** a seed reply with a different `v` falls back to a local seed. A submit `old_version` hides the ranking box with no text.
- **`css/runner.css`:** the full-screen dialog, capped at a centered 430 px column on wide screens. Adds the top overlay, the centered message inside the run band (`--rn-ground`), the round translucent pads with pixel SVG glyphs, and the centered end card. The canvas focus ring is removed (it showed as a line around the whole screen).
- **`api/_lib/core.js`:**
  - `verDir(v)`. runner-2 entries go under `runner2/` and `runner2-ids/`; runner-1 stays at `runner/` and `runner-ids/`.
  - `encodePath`, `weekPrefix`, `idPath` and `board` take an optional `v` (default: current version). `decodePath` returns `dir`.
- **`api/runner/top.js`:** returns the current version's board only, plus `v`.
- **`api/runner/award.js`:** looks in the current board, then the runner-1 board, so old submissions keep their cape.
- **`api/runner/submit.js`:** comment only. It already rejected `tok.v !== VERSION`.
- **Fonts:** subset regenerated (`vendor/fonts/*.sub.woff2`, `galmuri.css`).
- **`docs/MINIGAME.md`:** new runner-2 section; controls, physics, storage and server paths updated.

## Decisions (where the brief left a choice)
- **Octopus size:** I kept the 24/26 px sprite and enlarged the zoom rather than redrawing at a higher resolution. Changing `ZOOM` changes only the picture, not the sim.
  - At dpr 2 the scale is 3.5 CSS px per art px; at dpr 3 it is 3.33; at dpr 1 it is 3.
  - Visible width is about 92 art px at 320, 103 at 360 and 118 at 412.
  - The clear space ahead of the octopus is about 68–94 px. At top speed that is about 0.8–1.1 s from appearing to reaching the octopus; runner-1 gave about 0.9 s.
- **Speed:** lower in art px. On screen the top speed is about 4.9 CSS px per tick, close to runner-1's 4.6.
- **Wide screens:** a centered 430 px column (dark sides) instead of a wider field, to keep phones and desktops roughly fair on the weekly board. Landscape phones get a smaller zoom so the pads stay below the ground line.
- **Old best:** shown on the end card only, not on the start state.
- **Start text:** '점프를 톡 누르면 출발해'. Starting needs the jump button, Space or Up, because taps elsewhere are ignored.
- **Window at night:** fixed stars and the moon, no rain. Weather is not read; I kept it simple.
- **Upper picture:** static. Parallax is only inside the run band.
- **`old_version` from submit:** the ranking box is hidden with no message.
- **Server layout:** a per-version folder prefix. Runner-1 blobs are not touched. `award` falls back to the runner-1 board.
- **Puddle:** narrowed 24 → 20. At the slower speed, a 24 px puddle was not clearable by the test bot (one seed died). With 20 px, 30 of 30 night seeds survive 60 s.

## Player-facing lines (before → after)
- Title '다락방 달리기' (h2) → removed. The dialog keeps `aria-label` '다락방 달리기'.
- HUD '거리 N · 최고 N · 이끼 N' → 'N  최고 N' (small, top left).
- Ready: '탭하거나 스페이스를 누르면 출발해. 꾹 누르면 더 높이 뛰어' → '점프를 톡 누르면 출발해'.
- Pause: '잠깐 쉬는 중이야. 탭하면 이어서 달려' → '잠깐 쉬는 중이야. 점프를 누르면 이어서 달려'.
- Pad text '점프' / '숙이기' → pixel glyphs. aria-label '점프 (꾹 누르면 더 높이)' → '점프'; '숙이기' is unchanged.
- End buttons '또 할래?' / '그만' → '다시' / '닫기'.
- New: '예전 게임 최고 N'.
- Memo '점수는 이 기기에만 남아. 소리는 없어.' (and its http variant) → removed.

## Checks added or changed
- **`tools/test-runner.js`:**
  - Checks the runner-2 numbers.
  - New goldens: no input → crate at tick 247 (27 points); seed 12345 → candle at tick 246.
  - `verify` rejects a runner-1 record.
  - The live evidence must be the current version.
- **`tools/test-api.js`:**
  - Paths per version; runner-1 paths unchanged.
  - Board per version: runner-1 entries are not mixed in, are not deleted, and top returns `v`.
  - A runner-1 token gets `old_version` and nothing is written.
  - The seed token is runner-2.
  - A runner-1 submission still gets its cape.
  - The tie-safe rank check and the 1st-place lookup now work with runner-2's frequent equal scores.
- **`tools/smoke.js`:**
  - R: full-screen integer canvas, '다시'/'닫기', `best2`.
  - New R2 at 360x740 with real touch (CDP):
    - The stage fills the screen; the title, memo and moss HUD are gone.
    - Pads are ≥ 64 px, in the bottom corners, and below the ground line. Close is ≥ 44 px at the top right.
    - Taps elsewhere do nothing. Left jumps and right ducks; inputs are recorded as jd,ju,dd,du.
    - Landscape 740x360: the ground line is above the pads and the column is ≤ 430.
    - Close returns to the play room with focus on the machine.
    - The old best of 345 is kept, `last.version` is runner-2, and `best2` is separate.

## Suites run (final)
- `npm test`: exit 0. test-runner 571/0, test-api 235/0, the rest unchanged and all 0 failed.
- `SMOKE_ONLY=R node tools/smoke.js`: 29 passed, 0 failed (R + R2).
- `SMOKE_ONLY=S,J,U node tools/smoke.js`: 159 passed, 0 failed (run before the check fixes; the fixes touched only runner sizes, speeds and end-card order).
- `python3 tools/subset-fonts.py --check`: stale: none.
- **Independent check** (a fresh agent, read-only) reported 3 `should`, 0 `must`. All are fixed:
  1. Short warning time that depended on the device → slower speed, floored zoom, 430 px column.
  2. The 320x568 end card opened scrolled past the score → buttons above the ranking box, scroll to top. I re-ran its probe: `scrollTop 0`, everything visible.
  3. In landscape the pads covered the ground → zoom limited by height. Smoke checks it.

## Screenshots (`wip/round4/shots/c-runner/`, dpr 2)
- `360-start.png`, `360-duck.png`, `360-mid-jump.png`, `360-end-old-best.png`
- `412-start-night.png`, `412-duck.png`, `412-mid-jump.png`, `412-end-old-best.png`
- `320-mid-jump.png`

They were taken with a probe that freezes the rAF clock at the moment of interest, because headless is slow. The probe script is in the session scratch and not committed.

## Outside my area
- `vendor/fonts/*` regenerated. Other lanes that change text will regenerate too; on merge, regenerate once more with `python3 tools/subset-fonts.py`.
- `tests/evidence/runner-*.png` and `runner-live-run.json` are rewritten by smoke R.

## Left / not verified
- `js/play-stickers.js` still has runner-1 constants (`OCT_X 30`, speed steps 448/576/704) and reads `RUNNER.load().best`. It is not loaded by `index.html` and its tests pass, so I left it. If it is wired in later, it needs `best2` and the runner-2 numbers.
- Device fairness is improved, not perfect. The clear space ahead ranges from about 68 px (320 wide) to about 99–120 px (the 430 column on desktop or landscape).
- Not checked on a real phone: notch safe areas (env() insets are in the CSS), real dpr 2.625 / 3 devices, or iOS Safari's dvh.
- Not run: the full slow suite (`test:slow`) and smoke letters other than R, S, J and U.
- The app's daily-gift toast can sit over the bottom pads for about 2.5 s if the runner is opened right after load. That is not runner code; it is click-through.
