# 다락방 달리기 (같이 놀기)

크롬 공룡식 아주 작은 러너. 주인공은 문어, 무대는 다락방. 나중에 랭킹 서버가 **입력 리플레이로 점수를 검증**할 수 있게 만들었다.

- 파일: `js/runner.js` (전역 `RUNNER`), `css/runner.css`, 테스트 `tools/test-runner.js`, 스모크 시나리오 `R` (`tools/smoke.js`)
- 입구: 방 보기 시트(`#room-sheet`)의 닫기 버튼 위에 runner.js 가 **"같이 놀기"** 버튼을 런타임에 끼운다 (app.js 수정 없음).
  전체 화면 `<dialog id="runner-dlg">`, 닫으면 그 버튼으로 포커스가 돌아간다.

## 조작
| 입력 | 동작 |
|---|---|
| 탭 / 스페이스 / ↑ / W | 점프. **꾹 누르면 더 높이** (가변 점프) |
| 아래로 쓸기 / ↓ / S | 땅에선 숙이기, 공중에선 빨리 내려오기 |
| 화면 아래 큰 버튼 | ▲ 점프 · ▼ 숙이기 (누르고 있는 동안 유지) |

첫 점프가 곧 출발. 탭이 다른 데로 가면(`visibilitychange`) 저절로 멈추고, 탭하면 이어서 달린다.

## 화면
- 캔버스 192×108 아트 px, 장치 px 기준 **정수 배**(360px 폰 @2x 에서 3배 = 288×162 CSS px), `image-rendering: pixelated`.
- 글자는 전부 DOM (Galmuri 24/20/16px). 틀은 `assets/ui/frame_dialog.png`, 결과판은 `frame_paper.png` 9-slice.
- 낮/저녁/밤 팔레트는 **실제 지역 시각**(6–8·17–20 저녁, 20–6 밤), 창밖 계절(꽃잎·잎·낙엽·눈)은 **달**에서. 색은 Apollo 만.
- 장애물: 상자(낮음) · 상자 둘 · 촛대(가늚) · 책 더미(높음) · 거미줄(숙이기) · 물웅덩이(밤만, 넓어서 꾹 점프). 가끔 이끼(+20).

## 문어 스프라이트
열 때 `APP.scene.portrait(expr, {bg:'transparent'})` 64×64 초상 4장(달리기 curious · 점프 happy · 부딪힘 calm · 대기/숙이기 pet)을 찍어
공통 알파 경계로 잘라 **최근접 축소 24×24** + 1px 외곽선. 손그림 없음. 초상이 없으면 코드로 그린 24×24 문어(둥근 몸·점 눈·뭉툭한 팔 6개,
색은 `localStorage.ppolppol_v2.settings.octColor`, 기본 `#e8463c`).
움직임은 2D 절차: 뒤뚱 기울기 −7°/0/+7° (5틱 ≈ 0.08 s 마다, 최근접 회전 미리 구움), 1px 들썩, 착지 찌그러짐 6틱, 점프 늘어남, 부딪히면 calm + 작은 흔들림.

## 물리 (서브 px = 1/256 px, 60 Hz 틱)
| 값 | 숫자 | 뜻 |
|---|---|---|
| 점프 초속 `JV` | 760 | ≈ 2.97 px/틱 |
| 중력 `G` / 꾹 `GH` / 빨리 내리기 `GF` | 44 / 20 / 140 | 꾹은 최대 12틱 |
| 손 떼면 상승 속도 상한 `CUT` | 680 | 톡 점프 ≈ 17 px, 꾹 점프 ≈ 40 px |
| 속도 `V0 → VMAX` | 320 → 704 | 1.25 → 2.75 px/틱, 12틱마다 +1 (≈ 77 초에 최고) |
| 점프 예약 `BUF` | 6틱 | 착지 직전 누른 점프는 착지하자마자 |
| 점수 | ⌊거리 / 8px⌋ + 이끼 × 20 | 버틴 틱에 대해 단조 증가 |

## 결정성 (검증용)
- **고정 틱**: 화면 프레임과 무관하게 60 Hz `step()` 만 상태를 바꾼다(누적기, 프레임당 최대 250 ms). dt 에 기대는 물리 없음.
- **정수만**: 위치·속도·거리 전부 정수 서브 px. 난수는 `mulberry32` 가 내는 uint32 정수를 `%` 로만 쓴다(나눗셈·`Math.random` 없음).
- **시드**: `hash32(dateKey + '|' + runIndex)` (FNV-1a, runIndex = 그날 몇 번째 판). 서버 시드는 `RUNNER.open({ seed })`.
- **입력 기록**: 틱 t 의 `step` 전에 적용한 것만 `[{t, a}]` (`jd` 점프 누름 · `ju` 뗌 · `dd` 숙임 · `du` 폄). 키 반복·중복은 입력 단계에서 버린다.
- **밤 여부**는 장애물 종류를 바꾸므로 기록에 `night` 로 함께 남긴다.
- `RUNNER.simulate(seed, inputs, { night, until })` → `{ score, ticks, dead, moss, dist, hit }`. DOM 없이 돌고 라이브와 같은 함수(`createSim/applyInput/step`)를 쓴다.
  부딪힌 판은 `until` 없이, 중간에 닫은 판은 `until: ticks`. `RUNNER.verify(run)` 이 둘을 알아서 고른다.
- 물리 숫자나 생성 규칙을 바꾸면 **`VERSION` 을 올린다** (`tools/test-runner.js` 골든 값이 깨져서 알려 준다).

## 저장 (`localStorage.ppolppol_runner`, 전부 try/catch)
```
{ v:1, best, runs, day:'YYYY-MM-DD', dayN,
  last:{ seed, inputs:[{t,a}], score, ticks, end:'hit'|'quit', night, moss, version:'runner-1', day, at } }
```
서버로 보낼 땐 `last` 를 그대로 — 서버는 `simulate` 로 다시 돌려 `score`·`ticks` 가 같은지만 본다.

## 규칙
- 소리 없음(음소거 토글도 없음). 광고·타이머·연속 기록 압박 없음. 실패 문구는 "상자에 콩!" 같은 담담한 말 + "또 할래?" / "그만".
- 모션 줄이기(기기 설정 또는 방 보기 › 모션)면 흔들림·파티클·촛불 깜빡임 없음. 보이는 버튼은 전부 44px 이상.
- 점수는 이 기기에만 남는다고 화면 아래에 적어 둔다.

## 테스트
```
node tools/test-runner.js        # 무작위 200판 ×2 인스턴스 동일 · 봇 4판 40초 생존 · 단조 · 골든 · 라이브 기록 재시뮬
SMOKE_ONLY=R node tools/smoke.js # 실제 브라우저(SwiftShader, 360×740 @2x) 판 → tests/evidence/runner-{start,mid,over}.png, runner-live-run.json
```
