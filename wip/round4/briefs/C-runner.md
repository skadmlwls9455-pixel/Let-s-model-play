# Lane C "runner": runner-2, a portrait full-screen run (branch `lane/c-runner`)

Read `wip/round4/briefs/COMMON.md` first.

## What the owner wants (HANDOFF item 6, settled with the owner on 11-14)

"달리기 (js/runner.js, css/runner.css, 놀이방 오락기): 세로 화면을 꽉 채운다. 제목 줄·HUD 줄·안내 줄·메모는 없앤다.
점수·최고는 무대 위쪽에 작게, 닫기는 오른쪽 위. 점프(왼쪽)·숙이기(오른쪽)는 아래 구석의 큰 반투명 동그라미(64px 이상).
가로 게임처럼 보이되 세로에서 되는 크기(시야를 넓히고 남는 높이는 방 풍경). 문어는 작게 하되 주인 마지막 말 '후보 B에서
문어 좀 더 크게': 장애물이 잘 보이는 선에서 조금 키운다. '곧 와' 같은 예고 표시 없음, 압박 장치 없음. 시뮬이 바뀌니
`RUNNER.VERSION` 'runner-2': 서버(api/runner/submit.js)가 새 버전을 재생하고 옛 토큰은 거절, 주간 순위는 버전별로 따로.
옛 최고 점수는 '예전 게임 최고'로 남긴다."
Earlier owner words (11-14, with a screenshot of a commercial runner): "화면이 작아서 눈 아픈데 다른 ui 제거하고 세로형
풀 샷 런게임으로". Candidate B that the owner picked then: a portrait stage, the octopus 2-3× larger than today, a
somewhat lower speed, using the height. Borrow only the general layout idea (hard line 9: never copy a commercial
game's look).

## What exists (at the base commit)

- `js/runner.js` (global `RUNNER`): a 192×108 art-px landscape strip (`C.W`, `C.H`, `C.GY`), deterministic sim (60 Hz
  fixed ticks, integer sub-px, mulberry32 seed, inputs `[{t, a}]`), `RUNNER.simulate(seed, inputs, { night, until })`
  must match live play bit for bit; obstacles `KINDS`; the dialog UI built in `buildUI` (~270: `rn-hud`, final
  score, best); local store key `ppolppol_runner` (`st.best`, `net`, awards); `VERSION = 'runner-1'`.
- `css/runner.css`; the play room's arcade machine opens it (`openMachine` in `js/app.js` ~3882).
- Server: `api/runner/seed.js` (signs a token with `v: core.RUNNER.VERSION`, week, night), `submit.js` (rejects
  `tok.v !== core.RUNNER.VERSION` with `old_version`, replays the inputs with the shared sim and stores the score),
  `top.js` (weekly board), `award.js`; shared code `api/_lib/core.js` (loads `js/runner.js`). Tests:
  `tools/test-runner.js` (sim determinism, golden runs), `tools/test-api.js` (server), evidence
  `tests/evidence/runner-*.png` and `runner-live-run.json`. Docs: `docs/MINIGAME.md`.
- Rewards: runs give shells (조개) and sometimes seeds through the existing award path; weekly quest 'run'. Keep
  those working with the new version.

## What to make true

1. **Full-screen portrait stage**: the runner dialog covers the whole screen on phones (safe areas respected),
   no title line, no HUD line under the stage, no guide line, no memo. The stage is a landscape-feeling run (the
   ground line, the obstacles coming from the right) drawn big: widen the field of view in art px so the run is
   comfortable on a 360-430 px wide portrait screen, scaled by an integer factor for crisp pixels, and use the
   remaining height above (and a little below) for a calm picture of the attic room (beams, window, shelves, the
   rain or stars outside at night: painted in the same pixel style; static or very slow parallax).
2. **Small top overlay**: score and best in small pixel text at the top of the stage (left), the close button at the
   top right (≥ 44 px target, pixel icon or the word '닫기'). Nothing else on top.
3. **Two big round buttons** at the bottom corners, translucent (the run shows through), ≥ 64 px (72-80 px is
   fine): left = jump (hold = higher, as today), right = duck. Pixel-art glyphs inside (no arrow characters in text;
   `aria-label` '점프' / '숙이기'). Keyboard as today (Space / Up = jump, Down = duck). Touches anywhere else do
   nothing (no accidental jumps when the thumb rests).
4. **The octopus a bit bigger than candidate B** while obstacles stay easy to read: choose the art sizes so the
   octopus is clearly the main figure and an obstacle is always visible early enough to react at the chosen speed.
   Keep one constant for the octopus scale so it can be tuned later; write the numbers you chose in the report.
5. **No pressure**: no countdown, no "coming soon" warnings, no flashing danger hints, no streak bonus. Start is a
   calm "톡 해서 시작" style state, end shows the score and best briefly with '다시' and '닫기'.
6. **runner-2**: `VERSION = 'runner-2'`. The sim changes (field size, speeds, sizes) are allowed only in the new
   version; the server replays `runner-2` runs with the same shared sim, rejects tokens from `runner-1` (`old_version`,
   the client handles that quietly: no error text that blames the player), and keeps the **weekly board per version**
   (`top.js` returns only the current version's board; old entries stay stored but are not mixed). Golden runs in
   `tools/test-runner.js` are regenerated for runner-2 and the determinism check (live = simulate) still passes.
7. **Old best**: the local best from runner-1 is kept and shown as '예전 게임 최고 N' (small, on the end screen or
   the start state, only if it exists); the new best starts at 0 for runner-2. Saved data stays compatible (hard line
   10): do not delete the old fields; add `best2` (or a per-version map) next to them.
8. **Reduced motion**: no screen shake, no parallax; the game itself still runs.
9. **Sound** stays as today (off by default; runner sounds only when sound is on).

## Not yours

The play room scene and the arcade's 3D model (leave `js/scene3d.js` alone unless a hook is needed), the rest of the
app text.

## Tests

`node tools/test-runner.js` (update goldens for runner-2, keep the old-version rejection case),
`node tools/test-api.js` (submit with a runner-1 token → `old_version`; runner-2 replay accepted; boards per
version), `npm test`, the font check if text changed, and the smoke / suite parts that open the runner (grep
`machine`, `runner`, `rn-` in `tools/smoke.js` and `tools/test-play.js`). Add a smoke check: at 360x740 the stage
fills the screen, the two buttons are ≥ 64 px and do not overlap the stage's ground line area where obstacles are,
a tap on the left button jumps and the right one ducks, the close button closes back to the play room.

## Screenshots to commit

360x740 and 412x915: start state, mid-run (an obstacle in view, mid-jump), duck, end screen with '예전 게임 최고'.
320x568 mid-run.
