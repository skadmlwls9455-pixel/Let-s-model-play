# 오락기 칩 · 미니게임 3종 · 주간 상 코스튬 · 문어 옷 — 설계

> **2026-11-08 저녁. 주인 결정(놀이 물결 1~5)을 코드 사실(HEAD 작업 트리: `js/runner.js` · `api/_lib/core.js` · `api/runner/*.js` · `tools/test-runner.js` 568 통과 · `tools/test-api.js` 225 통과 · `js/scene3d.js` 문어 블록 · `docs/PLAYER_PARTS.md` v1.1)과 맞춰 적은 설계다. 코드는 고치지 않았다.**
> - **주인이 정한 것(그대로)**: ① 오락기 톡 → **칩 고르기**(다락방 달리기 · 플래피 문어 · 카드 짝 맞추기). ② 점수는 달리기처럼 로컬 최고 + 주간 순위 서버 — `api/runner/*` 를 **게임별로 일반화**하되 달리기의 경로·저장 키 `ppolppol_runner` 는 **깨지 않는다**. ③ 주간 상 = 게임과 어울리는 코스튬(달리기 황제 망토 · 플래피 해적 세트 · 카드 점성술사 망토), 상위 10 = 그 게임의 망토 · 1등 = 추가 조각, 기한 없음. ④ 문어도 옷을 입는다 — **같은 기하를 크기만 바꿔** 문어 머리(r 0.42 m · 중심 y 0.92 · 세로 0.88)에 맞춘다. 문어 것은 **둘이 한 벌 · 내밀기**(ACHIEVEMENTS §4.3 · PLAYER_PROGRESSION 원칙 4 · DESIGN §16.1), 입을지는 문어가 고른다(데모 규칙 꼬리표). 문어가 입은 옷은 초상 · 달리기 스프라이트에 따라간다.
> - **달리기 문서 `docs/MINIGAME.md` 는 그대로 유효하다.** 이 문서는 그 위에 얹는다 — 달리기 규칙 중 바뀌는 것은 §5.6(응답 필드 `awards[]` 추가)·§1(진입이 칩을 거침) 둘뿐이고 둘 다 옛 동작을 품는다.
> - 기호·이모지 없음(화면 글은 글자·픽셀 그림만). 숫자는 전부 적었다 — 구현이 그대로 옮긴다. 줄 번호 대신 함수·상수 이름으로 적었다(다른 세션이 같은 파일을 고치는 중).
> - 크기 표기: **S** = 반나절·200행 안 · **M** = 하루·200~600행 · **L** = 이틀 이상·여러 파일.

예문 속 '뚜루'는 네가 지은 문어 이름이 들어갈 자리다.

## 낱말 풀이

| 낱말 | 뜻 |
|---|---|
| 칩 | 오락기에 꽂는 카트리지. 게임 하나 = 칩 하나. 코드 이름 `game` ∈ `runner` · `flappy` · `cards` |
| 공통 틀 | 세 게임이 같이 쓰는 전체 화면 창·점수판·결과판·올리기 칸. `js/arcade.js`, 전역 `ARCADE` |
| 서브 px | 1/256 아트 px. 모든 위치·속도는 이 정수 단위 (`SUB = 256`) |
| 틱 | 60 Hz 고정 걸음. 화면 프레임과 무관하게 `step()` 만 상태를 바꾼다 |
| 판 | 출발부터 끝까지 한 번. 토큰(시드) 하나 = 판 하나 = `runId` 하나 |
| 주 | Asia/Seoul ISO 주 `YYYY-Www`. 월 00:00 KST 새 주, **월 00:30:05 KST** 닫힘(`core.weekClosed`) |
| 상 | 주가 닫힌 뒤 등수로 받는 **코스튬 id**. 꾸미기 전용, 계정 없음, 기한 없음 |
| 옷장 | 내 캐릭터가 가진 코스튬(상으로 받은 것 + 공짜 기본). 바로 입는다 |
| 선물 상자 | 문어 몫 코스튬이 들어가는 곳. 여기 것은 **내밀기**만 한다 |
| 내밀기 | 사람이 선물 상자에서 1~3개를 골라 문어에게 보여 주는 것. 입을지는 문어가 고른다 |
| `by` | 기록 줄 꼬리표 `user` · `model` · `demo-rules` · `playback` · `fallback` (MODEL_VOICE) |
| h | 코스튬 치수 단위 = **머리 반지름 1**. 내 캐릭터는 h × 0.38(머리칼 껍질) 또는 × 0.35(살결), 문어는 h × 1 r(= 0.42 m) · 세로 × 0.88 |

---

## §1 오락기 칩 화면

### 1.1 흐름
```
놀이방 오락기 #btn-machine 톡/Enter
 → APP.openMachine(opener)  (inPlay() && !roomJob — 지금 조건 그대로)
 → ARCADE.open({ opener })  : dialog#runner-dlg 를 showModal (지금 RUNNER.open 이 하던 것) 하고 **칩 화면** 을 보인다
   ├ 칩 '다락방 달리기'  → ARCADE.start('runner')  → RUNNER 가 같은 창 안에서 준비 화면 (지금 RUNNER.open 의 본문)
   ├ 칩 '플래피 문어'    → ARCADE.start('flappy')
   ├ 칩 '카드 짝 맞추기' → ARCADE.start('cards')
   └ '뒤로' / Esc        → 창 닫힘 → 포커스 opener(#btn-machine)
 게임 결과판 '그만' → **칩 화면으로** (창은 열린 채). 칩 화면 '뒤로' 가 창을 닫는 유일한 길 (+ Esc, + #rn-close)
```
- `RUNNER.open({ opener, seed })` 는 **그대로 남는다**(호환): 칩 화면을 건너뛰고 바로 달리기 준비 화면으로 간다. `tools/test-runner.js` §5 와 `tools/smoke.js` 글리프·2D 시나리오가 이것을 쓴다. 앱 진입(`openMachine`)만 `ARCADE.open` 으로 바뀐다.
- 창 id 는 **`#runner-dlg` 그대로**, 결과판 id 도 **`rn-*` 그대로** 쓴다(역사적 접두 — 세 게임이 같은 요소를 공유하므로 충돌이 없다. 568 단언·smoke 가 이 id 를 직접 읽는다 → 바꾸지 않는다). 칩 화면 요소만 새 접두 `ar-`.
- 창 열림 즉시 `#runner-dlg[open]` 이 참이다 → smoke 의 '오락기 톡 → `#runner-dlg[open]`' 단언은 그대로 통과. smoke R 은 칩 한 번 더 톡(§9.3).

### 1.2 칩 화면 DOM (`#ar-chips`, 창 안 `.rn-stage` 자리에 교대로 보임)
| 요소 | 내용 | 비고 |
|---|---|---|
| `h2#rn-title` | '오락기' (게임을 고르면 그 게임 제목으로 바뀜: '다락방 달리기' · '플래피 문어' · '카드 짝 맞추기') | `aria-labelledby` 그대로 |
| `p#ar-award.rn-award[hidden]` | 지난주 상 알림 한 줄. 예 '지난주 3등! 해적 망토를 받았어' · 둘이면 '지난주 1등! 해적 망토를 받았어. 해적 모자도 받았어' | §5.6 `checkAwards` 가 채움. 창을 열 때마다 한 번 |
| `ul#ar-list` > `li` × 3 > `button.ar-chip[data-game]` | 칩 하나 = 픽셀 그림 32×32(각 게임 `chipIcon()` 이 캔버스에 그림 — 달리기: 상자 위 문어 · 플래피: 해초 사이 문어 · 카드: 뒤집힌 카드 둘) + 제목 + 두 줄 숫자 | 높이 ≥ 56 px, 폭 100 %, `aria-label` = '제목, 최고 N, 이번 주 M등' |
| 칩 안 `.ar-best` | '최고 N' (로컬 `best`, 0 이면 '아직 안 해 봤어') | `ppolppol_runner.best` · `ppolppol_games.games[g].best` |
| 칩 안 `.ar-week` | '이번 주 M등' — **이번 주에 올린 기록이 있을 때만**(`net.subs` 중 week = 이번 주 · game = g 의 최고 rank). 없으면 줄 자체가 없다 | 서버 호출 없음(저장된 rank). 압박 줄('N등까지 몇 점') 없음 |
| `button#ar-back` | '뒤로' | 닫고 opener 포커스 |
| `p.rn-note` | NET ? '올리기 전까지 점수는 이 기기에만 남아. 소리는 없어.' : '점수는 이 기기에만 남아. 소리는 없어.' | 지금 문구 그대로 |

- 칩 순서는 고정(달리기 · 플래피 · 카드). 마지막에 한 칩을 기억해 두지 않는다(늘 칩 화면 — 단순).
- 키보드: 칩은 `<button>`, Tab 순서 = 칩 3 → 뒤로. 첫 포커스는 첫 칩. 화살표 ↑↓ 로 칩 사이 이동(선택 사항).
- 포커스 복귀: 어느 길로 닫혀도 `opener` 로(지금 `onClose` 그대로).

---

## §2 공통 틀 `js/arcade.js` (전역 `ARCADE`)

### 2.1 하는 일
| 영역 | 공통 틀이 가짐 | 게임 모듈이 가짐 |
|---|---|---|
| 창 | `dialog#runner-dlg` 생성·showModal·닫기·포커스 복귀·`visibilitychange` 멈춤 알림 | — |
| 화면 맞춤 | `fit()`: 캔버스 192×108 을 장치 px 정수 배 (지금 `availH = innerHeight − 380`), **가로 모드**(§2.4) | 캔버스에 그리기 |
| HUD | `p.rn-hud` 의 `#rn-score` · `#rn-best` · 세 번째 칸 `#rn-moss`(이름 그대로, 뜻은 게임이 정함: 이끼 · 물방울 · 짝) | 값 |
| 조작 버튼 | `#rn-ctrls` 자리. 게임이 `controls()` 로 버튼 목록 `[{ id, label, down, up }]` 을 주면 공통 틀이 44 px 이상 버튼으로 만든다 | 달리기 `rn-jump`·`rn-duck` / 플래피 `rn-swim` 하나 / 카드 없음(캔버스 톡) |
| 결과판 | `#rn-over`(`#rn-final` · `#rn-final-score` · `#rn-final-best` · `#rn-net`(`#rn-net-form` · `#rn-nick` · `#rn-submit` · `#rn-net-msg` · `#rn-top10`) · `#rn-again` · `#rn-stop`) — 지금 runner.js `buildDialog` 의 것을 **옮긴다** | 결과판에 넣을 글귀(§3.6 · §4.6) |
| 네트워크 | `fetchJson` · seed/submit/top/award 호출 · 20분 신선도 · 멱등 재전송 · 오류 문구 `NET_ERR` — 지금 runner.js 의 것을 **옮기고 `game` 을 인자로** | `game` id · `inputs` · `score` · `ticks` |
| 저장 | `ppolppol_runner`(달리기) · `ppolppol_games`(나머지) 읽기/쓰기 (§8) | `last` 에 넣을 게임별 칸 |
| 상 | `checkAwards(curWeek)` — 두 저장소의 `subs` 를 함께 봄(§5.6) | — |
| 문어 그림 | `buildSprites(exprMap)`: 초상 4장 → 24×24 (지금 `fromPortraits` · `drawnOctopus` 를 옮김) | 표정 맵 (달리기 run/jump/hit/idle, 플래피 swim/glide/hit/idle) |

### 2.2 게임 모듈 계약 (`ARCADE.register(def)`)
```
def = {
  id: 'flappy', title: '플래피 문어', VERSION: 'flappy-1', ACTS: { sw: 1 },
  simulate(seed, inputs, { night, until }) → { score, ticks, dead|done, ... },   // DOM 없음, 라이브와 같은 함수
  verify(run) → boolean,
  chipIcon(ctx)                        // 32×32 픽셀 그림
  controls() → [{ id, label, down, up }] | [],
  hud() → { label3: '물방울' },        // 세 번째 HUD 칸 이름 (null 이면 숨김)
  mount(stage) / unmount()             // stage = { cv, ctx, sprites, say(msg), hud(score, best, third), over(copy) , input(a) }
  start(seed, night) / tickOnce() / draw(alpha) / pause() / resume()
  overCopy(sim) → { final, score, best }   // 결과판 글귀
}
```
- 라이브 루프(누적기 60 Hz, 프레임당 최대 250 ms)·입력 기록(`press(a)` → `applyInput` 성공 시 `{ t: tick, a }` push → `step`)·`saveRun` 은 공통 틀이 돈다. 게임은 `applyInput`·`step`·`draw` 만.
- 달리기는 `RUNNER` 를 이 계약으로 **감싼다**(runner.js 안 `buildDialog`·`fetchJson`·`submitRun` 등은 ARCADE 로 옮기고 runner.js 는 시뮬 + 그리기 + 입력 + `open` 호환 껍데기). `RUNNER.simulate/verify/VERSION/C/KINDS/seedFor/hash32/mulberry32/createSim/applyInput/step` 노출은 그대로(서버 `require` · 테스트).
- 새 시뮬 파일은 **`js/games/flappy.js`**(전역 `FLAPPY`) · **`js/games/cards.js`**(전역 `CARDS`) — DOM 없는 로드 계약은 runner.js 와 같다(`typeof document === 'undefined'` 면 API 만, 파일 끝 `module.exports`). 서버 번들 `includeFiles: "js/games/*.js"` 가 이 폴더만 집는다(§5.8).

### 2.3 결과판 공통 글귀
| 자리 | 달리기(지금 그대로) | 플래피 | 카드 |
|---|---|---|---|
| `#rn-final` | HITCOPY (`상자에 콩!` …) | §3.6 | '다 맞췄어!' |
| `#rn-final-score` | 'N만큼 달렸어 · 이끼 M' | 'N점 · 물방울 M' | 'N점 · 틀린 짝 M · S초' |
| `#rn-final-best` | '새 최고야! 최고 N' / '최고 N' | 같음 | 같음 |
| `#rn-net` 아래 | '닉네임과 점수만 저장해. 이번 주 순위는 월요일에 새로 시작해.' | 같음 | 같음 |
| `#rn-again` / `#rn-stop` | '또 할래?' / '그만' | 같음 | 같음 |

### 2.4 가로 모드 (IDEAS §5 — 세 게임 한 번에)
| 상태 | 창 | 캔버스 배율 | 조작 | 안내 |
|---|---|---|---|---|
| 세로(`(orientation: portrait)`) | 지금 틀(frame_dialog 9-slice) | `floor(min((innerWidth − 32) / 192, (innerHeight − 380) / 108) × dpr) / dpr`, 최소 1 | 아래 큰 버튼 | 캔버스 아래 `p.rn-turn` '폰을 돌리면 더 크게' (글자만, 한 줄, 숨길 수 있는 ×는 없음) |
| 가로(`(orientation: landscape)` 이고 `innerWidth ≥ 560`) | 테두리·여백 0, 배경 한 색(`#172038`), `dialog` 100vw × 100dvh | `floor(min(innerWidth / 192, innerHeight / 108) × dpr) / dpr` | 버튼은 캔버스 위 좌우 아래 모서리에 **반투명 겹침**(달리기: 왼쪽 숙이기 · 오른쪽 점프, 플래피: 전체 톡 + 오른쪽 아래 '헤엄' 버튼, 카드: 없음). HUD 는 위 왼쪽 한 줄 | 없음 |
| 결과판(가로) | 캔버스 위에 `#rn-over` 겹침(폭 ≤ 420 px, 가운데) | — | — | — |
- `screen.orientation.lock('landscape')` 는 **시도만**(Android Chrome 전체 화면에서만 된다) — 실패는 조용히(`catch {}`), iOS 는 호출하지 않음(`'orientation' in screen && screen.orientation.lock` 있을 때만).
- 돌리는 순간: `fit()` 다시 + 게임은 `pause()` 상태면 그대로, 달리는 중이면 **멈추지 않는다**(한 프레임 건너뜀만).
- 2D 폴백에서도 그대로(캔버스 2D 게임, WebGL 불필요).

---

## §3 플래피 문어 (`js/games/flappy.js`, 전역 `FLAPPY`, `VERSION = 'flappy-1'`)

### 3.1 한 줄
바닷속을 오른쪽으로 떠내려가는 문어. 탭하면 위로 한 번 헤엄치고, 놓으면 가라앉는다. 해초 기둥·산호·그물 사이 틈을 지나면 10점, 틈 속 물방울을 먹으면 5점. 바닥 모래에 닿거나 장애물에 부딪히면 끝.

### 3.2 화면·팔레트 (Apollo 만)
| 것 | 값 |
|---|---|
| 캔버스 | 192×108 아트 px, 모래선 `GY = 100`, 천장 0 |
| 물 배경 | 낮: 위 `sky[2]` → 아래 `navy[2]` 세로 4 띠 · 저녁(17–20): `dusk[1]` → `navy[3]` · 밤(20–6): `navy[3]` → `navy[5]`. 시각대는 달리기와 같은 실제 지역 시각. **시뮬은 night 를 쓰지 않는다**(팔레트만) |
| 햇살 | 낮에만 위에서 비치는 세로 밝은 줄 3개(`sky[3]`, 알파 없이 디더 2×2), 모션 줄이기면 멈춤 |
| 모래 | `amber[1]` 바닥 8 px + `dusk[2]` 점 |
| 해초 기둥 `kelp` | `moss[1]` 몸 + `moss[2]` 밝은 변 1 px + 잎 끝 `moss[3]` |
| 산호 `coral` | `rose[1]` 몸 + `rose[2]` 변 + 가지 끝 `amber[3]` 점 |
| 그물 `net` | `slate[2]` 격자 2 px, 테두리 `slate[3]` |
| 물방울 | `glass[3]` 원 6 px + 흰 글린트 1 px |
| 문어 | 공통 틀 스프라이트 24×24 (초상 swim:curious · glide:calm · hit:calm · idle:pet). 기울기: `vy < 0` 이면 −12°, `vy > 400` 이면 +12°, 그 사이 0 (미리 구운 3장, 달리기와 같은 방식) |
| 배경 장식(시뮬 밖) | 먼 해초 실루엣 `navy[1]` 2 겹(속도 ×0.5, ×0.25), 떠오르는 작은 거품(모션 줄이기면 없음) |

### 3.3 물리 (서브 px, 60 Hz) — 상수 `FLAPPY.C`
| 상수 | 값 | 뜻 · 환산 |
|---|---|---|
| `OCT_X` · `OCT_W` · `OCT_H` | 40 · 12 · 12 | 히트박스(px). 스프라이트 24×24 는 그림일 뿐 — 모자·망토가 커져도 **상수 그대로** |
| `Y0` | 48 × 256 | 출발 높이 |
| `G` | 30 | 중력(서브 px/틱²) ≈ 0.117 px/틱² |
| `SWIM` | 560 | 탭 한 번에 `vy = −560`(덧셈 아님, 덮어씀) ≈ 위로 2.19 px/틱. 꼭대기까지 18.7 틱, **오르는 높이 20.4 px** |
| `VMAX_FALL` | 620 | 낙하 상한 ≈ 2.42 px/틱 (정지에서 20.7 틱 만에) |
| 천장 | `y < 0 → y = 0, vy = 0` | 죽지 않음 |
| 바닥 | `y + OCT_H·256 > GY·256 → dead, hit = 'sand'` | |
| `V0` → `VMAX` | 288 → 448 | 흐름 1.125 → 1.75 px/틱 (67.5 → 105 px/s) |
| `RAMP` | 20 | 20 틱마다 `speed += 1` → 3200 틱 ≈ 53 초에 최고 |
| `SPACING` | 80 px | 기둥 왼쪽 변 사이 거리(px). `V0` 에서 1.19 초마다 기둥 하나 |
| `FIRST_X` | 200 px | 첫 기둥이 나오는 x(화면 밖 오른쪽) |
| `GAP0` · `GAPMIN` · `GAP_EVERY` | 40 · 30 · 4 | 틈 높이(px) `gap = max(GAPMIN, GAP0 − floor(spawned / 4))` → 40번째 기둥부터 30 |
| 틈 위치 | `gapTop = 8 + rng() % (GY − 16 − gap + 1)` | `gap 40` 이면 8..52, `gap 30` 이면 8..62 (전부 `%`, 나눗셈 없음) |
| 종류 폭 | kelp 12 · coral 16 · net 10 | 풀 `['kelp','kelp','kelp','coral','coral']`, `spawned ≥ 10` 이면 `push('net')` → `pool[rng() % pool.length]` |
| 물방울 | `spawned ≥ 2 && rng() % 3 === 0` | 자리 `(x + w + SPACING/2 − 3, gapTop + gap/2 − 3)` 6×6, 겹치면 `bubbles++`, `got = true` |
| `PT_PASS` · `PT_BUBBLE` | 10 · 5 | 점수 |
| `MAX_TICKS` | 108000 | 달리기와 같음(30분) |

**`step(s)` 순서**(틱마다 한 번, `applyInput` 뒤): ① `speed = min(VMAX, V0 + floor(tick / RAMP))` ② `vy = min(vy + G, VMAX_FALL)`, `y += vy`, 천장 클램프 ③ 기둥·물방울 `x −= speed` ④ `sinceSpawn += speed`; 첫 기둥은 `tick 0` 에 `x = FIRST_X·256`, 그 뒤 `sinceSpawn ≥ SPACING·256` 이면 spawn(`x = SPACING·256 − (sinceSpawn − SPACING·256)` 로 밀림 보정, 달리기 `spawn` 과 같은 방식) ⑤ 충돌: 히트박스 `[OCT_X, OCT_X+12) × [y, y+12)` 가 기둥 `[x, x+w)` 와 x 겹치고 `y < gapTop || y + 12 > gapTop + gap` 이면 `dead, hit = kind` ⑥ 지나감: `x + w ≤ OCT_X·256` 이고 `!passed` → `passed++` ⑦ 바닥 ⑧ `score = passed·10 + bubbles·5` ⑨ `tick++`, 화면 밖(`x + w < −8·256`) 기둥 제거.

### 3.4 입력 기록 · 결정성
| 것 | 값 |
|---|---|
| 알파벳 `ACTS` | `{ sw: 1 }` 하나. 탭/스페이스/↑/W/`#rn-swim` 누름 = `sw`. 뗌은 기록하지 않는다 |
| 출발 | 첫 `sw` 가 곧 출발(`tick 0` 에 적용). 준비 화면에서 문어는 `Y0` 에서 위아래 ±2 px 숨쉬기(그림만) |
| `applyInput(s, 'sw')` | `dead` 면 false. 아니면 `vy = −SWIM`, true. 같은 틱에 두 번 오면 두 번째는 **무시**(`s.swTick === s.tick` → false, 기록 안 됨) |
| 쉬는 중 | 탭을 벗어나면(`visibilitychange`) 멈춤, 탭하면 그 탭이 **이어서 달리기**(달리기와 같음 — 이 탭은 입력으로 안 들어감) |
| 시드 | 서버 토큰 `seed`, 없으면 `hash32(dateKey + '|' + runIndex)` (runner 의 `seedFor` 와 같은 식, 접두 없음 — 게임이 달라 같은 날 같은 번호라도 상관없음) |
| `simulate(seed, inputs, { night, until })` | `{ score, ticks, dead, hit, passed, bubbles, y }`. `night` 는 받되 **무시**(토큰 호환). `until` 규칙 달리기와 같음 |
| `verify(run)` | `run.version === 'flappy-1'` 이고 `simulate(run.seed, run.inputs, { until: run.end === 'hit' ? null : run.ticks })` 의 `score`·`ticks` 일치 |
| 골든(테스트용, 구현이 값을 채움) | `seed 12345`, 입력 없음 → `dead` 틱 ≈ 21(바닥 48→100 px 낙하: 20.7 틱) `hit 'sand'`, `score 0` · `seed 11`, 14 틱마다 `sw` 봇 → 300 틱 생존 |

### 3.5 조작
| 입력 | 동작 |
|---|---|
| 탭(캔버스 전체) / 스페이스 / ↑ / W / `#rn-swim` '헤엄' | `sw` |
| 아무 입력 (준비 화면) | 출발 |
| 결과판 `#rn-again` '또 할래?' / `#rn-stop` '그만' | 다시 / 칩 화면 |

### 3.6 결과판 글귀
| hit | `#rn-final` |
|---|---|
| kelp | '해초에 톡!' |
| coral | '산호에 콩!' |
| net | '그물에 폭!' |
| sand | '모래에 푹!' |
| 준비 문구 | '탭하거나 스페이스를 누르면 헤엄쳐. 놓으면 가라앉아' |
| 시드 대기 | '판을 고르는 중이야…' (달리기와 같은 문구 — smoke `/고르는/`) |
| 쉬는 중 | '잠깐 쉬는 중이야. 탭하면 이어서 헤엄쳐' |

---

## §4 카드 짝 맞추기 (`js/games/cards.js`, 전역 `CARDS`, `VERSION = 'cards-1'`)

### 4.1 한 줄
뒤집힌 카드 20장(10쌍). 두 장을 뒤집어 같은 그림이면 그대로 열리고, 다르면 잠깐 보였다가 닫힌다. 다 맞추면 끝. 점수는 **틀린 짝 수**와 **걸린 시간**으로 — 화면에 시계는 없다.

### 4.2 판 (192×108 캔버스, 가로)
| 것 | 값 |
|---|---|
| 판 크기 | **5열 × 4행 = 20장 (10쌍)** 하나만(순위가 한 판 종류여야 비교가 된다). 4×4 는 §11 질문 |
| 카드 칸 | 20×20 px (테두리 1 px + 안 18) · 칸 사이 2 px → 판 108×86 px, 왼쪽 위 (42, 11) |
| 폰 크기 | 360 px @2x → 배율 3 → 카드 60 CSS px (≥ 44) · 가로 모드 배율 4~5 |
| 카드 뒷면 | `navy[3]` 바탕 + `navy[4]` 테두리 + 가운데 `sky[1]` 작은 물결 4 px (문어 집 느낌) |
| 카드 앞면 | `paper[3]` 바탕 + `paper[1]` 테두리 + **16×16 아이콘**(`assets/icons/souvenir/<name>.png` · `memory/<name>.png`, `UIART` 와 같은 소스, `ASSETS_INLINE` 번들이면 거기서) 가운데 |
| 맞춘 카드 | 앞면 그대로 + 테두리 `moss[2]` (초록 테) — 사라지지 않는다 |
| 아이콘 못 불러오면 | 쌍 번호별 8×8 절차 무늬 10개(동그라미·네모·세모·줄·점·×·+·마름모·물결·별꼴) `ink` 색 — 그림 소스와 무관하게 판은 돈다 |
| 커서(키보드) | 포커스 칸에 `amber[3]` 테 1 px(모션 줄이기와 무관) |

### 4.3 그림 후보 20 → 판마다 10 (시드로 고름, 그림은 시뮬 값이 아님)
`souvenir`: feather · shell · pebble · button · leaf · marble · yarn · stamp · matchbox · key · pinecone · paper_boat · bell · map_piece · chalk · stained_glass (16) + `memory`: sea · sky · home · sounds (4). 뺀 것: memory.hands(실타래 — yarn 과 혼동) · signs(깃펜 — feather) · wild(풀 — leaf) · numbers · mind(예비), `log.*`(UI 상태 아이콘), FX(8×8 스트립).
고르기: 후보 20 배열에서 `i = 0..9` 에 대해 `j = i + rng() % (20 − i)` 로 자리 바꿈(부분 Fisher-Yates) → 앞 10개가 이 판의 그림. **그 다음** 덱 섞기(§4.4). 그림 id 는 `simulate` 결과에 `icons[10]` 로 나오지만 점수와 무관(서버는 비교하지 않음).

### 4.4 시뮬 (60 Hz 틱, 시계는 첫 뒤집기부터) — 상수 `CARDS.C`
| 상수 | 값 | 뜻 |
|---|---|---|
| `N` · `PAIRS` | 20 · 10 | |
| 덱 | `deck[i] = pairId`, `pairId ∈ 0..9` 둘씩 → Fisher-Yates `for i = 19..1: j = rng() % (i + 1); swap` | 그림 고르기 뒤에 돈다(순서 고정) |
| `REVEAL` | 45 틱 (0.75 초) | 틀린 두 장이 보이는 시간. 그동안 뒤집기 **무시** |
| `MAX_TICKS` | 108000 | 다 못 맞추면 `done:false` → 올릴 수 없음 |
| `S_BASE` · `S_MISS` · `S_MISS_CAP` | 1000 · 25 · 500 | 틀린 짝 벌점 `max(0, 500 − 25·miss)` (20번 틀리면 0) |
| `S_TIME` · `S_TIME_CAP` | 4 · 400 | 시간 보너스 `max(0, 400 − 4·floor(ticks / 60))` (100초 넘으면 0) |
| **점수** | `score = 1000 + max(0, 500 − 25·miss) + max(0, 400 − 4·floor(ticks/60))` | 범위 **1000 ~ 1900**. 끝난 판은 늘 ≥ 1000. 동점은 짧은 틱이 위(경로 규칙 그대로) |

**상태** `{ seed, rng, deck[20], icons[10], up: [], matched: [20 bool], miss, pairs, lockUntil: -1, tick, done, ticks }`
**`applyInput(s, 'f<i>')`** (i = 0..19): `done` false · `i` 범위 밖 false · `matched[i]` false · `up.includes(i)` false · `tick < lockUntil` false · `up.length ≥ 2` false. 아니면 `up.push(i)` → `up.length === 2` 이면: 같은 pairId → `matched 둘 = true, pairs++, up = []`; `pairs === 10` 이면 `done = true, ticks = tick` / 다른 pairId → `miss++, lockUntil = tick + REVEAL`. true.
**`step(s)`**: `done` 이면 아무것도 안 함. `tick === lockUntil` 이면 `up = []`. `tick++`. `tick ≥ MAX_TICKS` 면 `done = false` 로 멈춤(`ended = true`).
`simulate(seed, inputs, { until })` → `{ score, ticks, done, miss, pairs, icons, deck }` — `done` 이 아니면 `score = 0`. `until` 은 달리기와 같은 뜻(중간에 닫은 판 저장용).
**끝까지/`until` 두 번 시뮬**(서버 §5.5): 끝난 판은 `ticks` 뒤 틱이 없으니 두 결과가 같다 · 안 끝난 판은 끝까지 돌리면 `MAX_TICKS` 에 멈춰 틱이 달라 422 → **다 맞춘 판만 올라간다**(달리기 '부딪힌 판만' 과 같은 꼴).

### 4.5 입력 기록 · 조작
| 것 | 값 |
|---|---|
| 알파벳 | `a = 'f0' … 'f19'`. 서버 화이트리스트 정규식 `/^f(1?\d)$/` → 게임별 `ACTS` 가 **함수**일 수 있게(§5.3) |
| 기록 | `[{ t, a }]`, 실제로 뒤집힌 것만(`applyInput` true). 무시된 톡은 기록 없음 → 평균 판 입력 30~60개 |
| 출발 | 첫 뒤집기가 `tick 0`. 준비 화면 문구 '카드를 톡 하면 시작해. 같은 그림 둘을 찾아' |
| 톡 | 캔버스 좌표 → 칸 `i = col + row·5`. 칸 밖 톡 무시 |
| 키보드 | ←→↑↓ 커서, Enter/스페이스 뒤집기. 첫 커서 0 |
| HUD | `#rn-score` 는 판 중엔 **'짝 N/10'**(점수는 끝에만 계산), `#rn-best` 최고, `#rn-moss` 자리 = '뒤집기 N'. **시계 없음** |
| 쉬는 중 | 탭 벗어나면 `pause()`(시계 멈춤 — 틱이 안 돈다), 돌아오면 재개 |
| 시드 | 토큰 `seed` / 로컬 `hash32(dateKey + '|' + runIndex)` |

### 4.6 결과판
| 자리 | 글 |
|---|---|
| `#rn-final` | '다 맞췄어!' |
| `#rn-final-score` | 'N점 · 틀린 짝 M · S초' (S = floor(ticks/60), 끝난 뒤에만 보이는 숫자 — 타이머가 아니다) |
| `#rn-final-best` | '새 최고야! 최고 N' / '최고 N' |
| 중간에 '그만' | 결과판 없이 칩 화면으로(저장 `last.end = 'quit'`, 점수 0, best 그대로) |

---

## §5 순위 서버 일반화

### 5.1 고른 길: `?game=` 쿼리 + 새 폴더 `api/games/`
| 후보 | 장점 | 단점 | 결정 |
|---|---|---|---|
| `api/games/{game}/seed.js` × 3 게임 | 경로가 읽기 쉽다 | 함수 파일 12개, `vercel.json` 글롭 3줄 | 안 고름 |
| **`api/games/{seed,submit,top,award}.js?game=flappy`** | 함수 4개, 클라이언트 `pathname.split('/').pop()` 이 그대로 핸들러 이름(test-runner `fetchStub` · smoke 분기 그대로 씀), CDN 캐시 키에 쿼리 포함 | `game` 값 화이트리스트 필수 | **고름** |
| `api/runner/*?game=` 에 얹기 | 파일 추가 0 | 달리기 함수에 새 시뮬 파일을 includeFiles 로 넣어야 하고 이름이 거짓말 | 안 고름 |

- **`api/runner/*.js` 네 파일은 그대로 남는다**(경로·응답·검증 순서·오류 코드 그대로). 본문은 `api/_lib/handlers.js` 의 `seed('runner')` 등 **한 줄 위임**으로 바뀐다 → test-api 가 `require('../api/runner/submit.js')` 로 직접 부르는 것 그대로 통과.
- `api/games/*.js` 는 `game` 쿼리를 `/^(flappy|cards)$/` 로만 받는다. `runner` 는 여기서 **안 받는다**(400 `bad_game`) — 달리기는 제 경로로만(번들에 `js/runner.js` 를 안 넣어도 되게).

### 5.2 게임 등록부 `api/_lib/games.js`
| 필드 | runner | flappy | cards |
|---|---|---|---|
| `file` | `../../js/runner.js` | `../../js/games/flappy.js` | `../../js/games/cards.js` |
| `sim` | **지연 require**(첫 사용 때) — core.js 의 최상위 `require('../../js/runner.js')` 는 없애고 `core.RUNNER` 를 getter 로 남긴다(test-api 가 `core.RUNNER` 를 읽는다) | 지연 | 지연 |
| `VERSION` | `sim.VERSION` ('runner-1') | 'flappy-1' | 'cards-1' |
| `acts(a)` | `a in {jd,ju,dd,du}` | `a === 'sw'` | `/^f(1?\d)$/.test(a)` |
| `MAX_TICKS` | `sim.C.MAX_TICKS` (108000) | 108000 | 108000 |
| `HZ` | 60 | 60 | 60 |
| `prefix` · `idsPrefix` | **`runner/` · `runner-ids/`** (그대로) | `games/flappy/` · `games-ids/flappy/` | `games/cards/` · `games-ids/cards/` |
| `usesNight` | true | false(토큰엔 넣되 시뮬이 무시) | false |
| `tokenG` | **없음**(옛 토큰 호환 — `g` 가 없으면 runner) | `'flappy'` | `'cards'` |
| `awards(rank)` | §5.6 표 | §5.6 표 | §5.6 표 |

### 5.3 core.js 가 바뀌는 곳 (이름 유지 · 기본값 = 달리기)
| 함수 | 지금 | 뒤 |
|---|---|---|
| `signToken(claims, key)` | `{ seed, night, iat, week, v }` | 같음 + `claims.g` 가 있으면 `g` 추가(달리기는 넣지 않음 → 옛 토큰과 바이트 동일, test-api 왕복 단언 그대로) |
| `readToken(token, key)` | seed·night·iat·week·v 검사 | 같음 + `g` 가 있으면 `/^(flappy|cards)$/` 아니면 null |
| `ACTS` | 상수 객체 | 그대로 남김(달리기용) + `games[g].acts` |
| `encodePath(week, d)` / `decodePath(p)` / `weekPrefix(week)` | `runner/` 고정 | 그대로(달리기) + `encodePathFor(game, week, d)` / `decodePathFor(game, p)` / `prefixFor(game, week)`. `PATH_RE` 는 `^(runner|games\/(flappy|cards))\/(\d{4}-W\d\d)\/(\d{8})-(\d{6})-([0-9a-f]{12})~([A-Za-z0-9_-]*)\.json$` — `decodePath('runner/2026-W45/../../x.json') === null` 단언 그대로 |
| `board(store, week)` | `runner/` | 그대로 + `boardFor(store, game, week)` |
| `AWARDS` | `{ PAPER, CAPE }` | 그대로 + §5.6 의 id 상수 추가 |
| `secret()` | `RUNNER_SECRET` → sha256('ppolppol-runner\|' + BLOB 토큰) | **그대로 한 키**(게임은 토큰 `g` 로 갈린다). 이름은 바꾸지 않는다(test-api 단언) |
| `isEventWeek(week)` | `RUNNER_EVENT_WEEKS` | 그대로, **모든 게임 공통**(게임별 이벤트 주는 두지 않는다 — 단순) |
| `weekKey` · `weekClosed` · `sanitizeNick` · `blobStore` · `memoryStore` | | 그대로 |

### 5.4 끝점 표
| 끝점 | 요청 | 응답 | 캐시 |
|---|---|---|---|
| `GET /api/runner/seed?tz=` · `GET /api/games/seed?game=&tz=` | tz 분(비정수·\|tz\|>840 → 540) | `{ ok, token, seed, night, iat, week, v, game }` (`game` 은 새 필드, 달리기 응답에도 `'runner'` 로 추가 — 기존 필드 그대로) | no-store |
| `POST /api/runner/submit` · `POST /api/games/submit?game=` | `{ token, inputs, score, ticks, nick }` | `{ ok, rank, total, week, runId, nick, score, award, awards, game }` — `award` 는 지금처럼 종이 왕관 또는 null, `awards` 는 `award ? [award] : []` | no-store |
| `GET /api/runner/top?week=` · `GET /api/games/top?game=&week=` | | `{ ok, week, total, top:[{rank, nick, score, at}], game }` 상위 20 | `public, s-maxage=15, stale-while-revalidate=30` |
| `GET /api/runner/award?runId=&week=` · `GET /api/games/award?game=&runId=&week=` | | `{ ok, award, awards, rank, week, final, game }` (§5.6) | no-store |
- 오류: `game` 틀림 400 `bad_game`(games 경로만). 나머지 코드·순서는 MINIGAME.md 그대로. 토큰의 `g` 와 끝점의 `game` 이 다르면 401 `bad_token`(다른 게임 토큰으로 올릴 수 없다).
- `vercel.json` headers: `"/api/((?!runner/top|games/top).*)"` 로 no-store 예외 둘.

### 5.5 submit 검증 (게임 인자만 다르고 순서 그대로)
POST → secret → JSON → `readToken` (+ `g` 일치) → `v !== games[g].VERSION` 400 old_version → 30분/멱등 → `score ∈ [0, SCORE_CAP)` · `ticks ∈ [1, games[g].MAX_TICKS]` → `validInputs`(≤ 20000, t 정수 ≥ 0 비감소 ≤ ticks, `games[g].acts(a)`) → **too_fast `ticks / HZ > age/1000 + 3`**(세 게임 다 60 Hz 실시간 틱이라 그대로 뜻이 맞다 — 카드도 시계가 첫 뒤집기부터 60 Hz) → `sim.simulate(seed, inputs, { night })` 끝까지 + `{ night, until: ticks }` 둘 다 `score`·`ticks` 일치 아니면 422 mismatch → 표지 `idsPrefix + week + '/' + runId + '.json'` → 기록 `encodePathFor(game, …)` → 200.
저장 본문 `{ nick, score, ticks, at, runId, inputsLen }` 그대로(게임은 경로가 말한다). IP·UA·입력 본문 없음(그대로).

### 5.6 상 규칙 표 (게임 × 등수 → 코스튬 id) — 주가 **닫힌 뒤**(`weekClosed`)만
| 게임 | 1~10등 | 1~3등 추가 | 1등 추가 | 이벤트 주 통과 판(등수 무관) |
|---|---|---|---|---|
| runner | `emperor_cape` 황제 망토 (지금 그대로) | — | `emperor_crown` 황제 관 (**§11 질문 1** — 기본은 준다) | `paper_crown` |
| flappy | `pirate_cape` 해적 망토 | `pirate_patch` 해적 안대 | `pirate_hat` 해적 모자 | `paper_crown` |
| cards | `astro_cape` 점성술사 망토 | — | `astro_hat` 점성술사 모자 | `paper_crown` |
- 응답 `awards` = 등수에 맞는 id 들(위 열을 왼쪽부터 쌓음, 예 flappy 1등 `['pirate_cape','pirate_patch','pirate_hat']`, 2등 `['pirate_cape','pirate_patch']`, 7등 `['pirate_cape']`) + 이벤트 주면 `'paper_crown'` 맨 뒤. `award` = `awards[0] || null` (단일 필드 호환 — 달리기 1~10등은 지금처럼 `'emperor_cape'`, 이벤트 주 11등 밖은 `'paper_crown'`). `final` 규칙 그대로(닫히기 전 `final:false`, 닫힌 비이벤트 주 11등 밖 404 `no_award`).
- 한 주에 게임당 망토 10 · 안대 3 · 모자 1. 상위 10 안이 아니어도 잃는 건 없다(순위표 밖 등수도 안 보여 준다).
- **클라이언트 `checkAwards`**(공통 틀, 창 열 때 한 번): 두 저장소 `subs` 에서 `!done && week < cur && runId 12hex` 최대 4개(게임 섞어 오래된 것부터) → 각 게임 award 끝점 → 200 `final:true` 또는 404 → `done`; `(j.awards || [j.award]).filter(Boolean)` 마다 `addAward(id, week)` → 달리기 것은 `ppolppol_runner.net.awards[id]`, 나머지는 `ppolppol_games.net.awards[id]` (§8). `final:false`·네트워크 실패면 적지 않고 다음에. 알림 문구: `'지난주 N등! ' + 이름(awards[0]) + '를 받았어'` + (둘 이상이면 `'. ' + 이름(awards[1..]).join('와 ') + '도 받았어'`) — 달리기 1등은 '지난주 1등! 황제 망토를 받았어. 황제 관도 받았어' → test-runner `/1등! 황제 망토/` 그대로 맞는다.
- 코스튬 이름 표(`AWARD_NAME`): `paper_crown` 종이 왕관 · `emperor_cape` 황제 망토 · `emperor_crown` 황제 관 · `pirate_cape` 해적 망토 · `pirate_patch` 해적 안대 · `pirate_hat` 해적 모자 · `astro_cape` 점성술사 망토 · `astro_hat` 점성술사 모자.

### 5.7 블롭 경로
```
runner/{week}/{(10_000_000 − score) 8자리}-{ticks 6자리}-{runId}~{b64u(nick)}.json      ← 달리기, 그대로
runner-ids/{week}/{runId}.json                                                         ← 달리기 표지, 그대로
games/flappy/{week}/{…같은 꼴…}.json        games-ids/flappy/{week}/{runId}.json
games/cards/{week}/{…같은 꼴…}.json         games-ids/cards/{week}/{runId}.json
```
사전순 = 순위(동점은 짧은 틱이 위)는 세 게임 다 같다(카드도 짧은 틱이 위 = 빠른 판). `list(prefix)` 한 번 + 경로 해석, 본문 안 읽음 — 그대로.

### 5.8 `vercel.json`
```json
"functions": {
  "api/runner/*.js": { "regions": ["icn1"], "maxDuration": 10, "includeFiles": "js/runner.js" },
  "api/games/*.js":  { "regions": ["icn1"], "maxDuration": 10, "includeFiles": "js/games/*.js" }
},
"headers": [{ "source": "/api/((?!runner/top|games/top).*)", "headers": [{ "key": "Cache-Control", "value": "no-store" }] }]
```
`core.js` 가 `js/runner.js` 를 지연 require 하므로 `api/games/*` 번들에 runner.js 가 없어도 로드된다(등록부 `file` 경로는 문자열 상수 — nft 가 못 좇아도 `includeFiles` 가 넣는다).

### 5.9 클라이언트 네트워크(공통 틀)
`API_BASE(game) = game === 'runner' ? 'api/runner/' : 'api/games/'`, 쿼리 `game=` 은 games 일 때만. `fetchJson` 타임아웃(seed 2초 · award/top 4초 · submit 8초) · `NET_FRESH_MS` 20분 · `NET_ERR` 문구 · `stuck` 규칙(4xx 408·429 제외 → 버튼 꺼둠) — 전부 그대로, `bad_game` 은 기본 stuck 문구 '이 판은 올릴 수 없어.'.

---

## §6 코스튬 카탈로그

### 6.1 원칙 — 한 기하, 세 앵커, 한 배율
- 모든 코스튬은 **h 단위**(머리 반지름 = 1, 원점 = 머리 중심, +z 얼굴)로 한 번 적고, 캐릭터별 **앵커 3개 + 배율**로 놓는다. 부품 빌더 `COSTUME.build(id, { anchor, scale })` 하나를 내 캐릭터(`mergeParts` 로 plHead/plTorso 에 합침)와 문어(bodyG 자식 메시)가 같이 쓴다.
- 재질은 각자의 것(`toonP` / 문어 `toon`), 정점색만. 새 프로그램 없음(27 유지). 문어 정점색 태그는 **1~5 를 피한다**(octColor 가 태그 1 을 다시 칠한다 — 코스튬엔 태그 0).

| 앵커 | 내 캐릭터 (m, plBody 좌표, v1.1 PLAYER_PARTS 기준) | 문어 (bodyG 로컬 r) | 뜻 |
|---|---|---|---|
| `crown` 머리 | 원점 (0, 0.90, −0.03), 배율 **0.38**(머리칼 껍질 r_h — acc 와 같은 기준) | 원점 (0, 0.92, 0), 배율 **(1, 0.88, 1)**(머리 찌그림을 따라감) | 모자·관·리본·베레모 |
| `eyeL` 왼눈 | (−0.14, 0.86, 0.30), 배율 0.35 | (−0.30, 0.67, 0.90), 배율 (1, 0.88, 1) | 안대 |
| `back` 등 | (0, 0.56, −0.20) 몸통 윗면 뒤(후드 덩어리 자리), 배율 **0.46**(망토 길이 1 = 0.46 m → 밑단 y 0.10) | (0, 1.30, −0.85), 배율 **1.30**(밑단 y 0, 길이 0.546 m) | 망토·목도리 |
- 배율 비(문어/내 캐릭터): 머리 1 r / 0.38 = **1.105 배**(0.42 m / 0.38 m) · 망토 0.546 / 0.46 = **1.19 배**. 가로·세로 다 같은 배율이라 "크기만 바꾼다" 가 맞다(문어만 세로 0.88).
- 6 cm 규칙(1.6 px): 내 캐릭터 기준 0.06 / 0.38 = **h 0.16** 미만 부품 금지(1 px 점·선 의도만 표기). 문어에선 같은 부품이 1.1 배라 자동으로 통과.
- **문어 치수 환산 예**(검산용): 챙 y 0.79 h → 내 캐릭터 0.90 + 0.79×0.38 = 1.20 m · 문어 0.92 + 0.79×0.88 = 1.615 r(그 높이 머리 표면 반지름 √(1 − 0.79²) = 0.61 r). 머리 꼭대기 = 1.0 h ↔ 내 캐릭터 1.28(껍질) · 문어 1.80 r.

### 6.2 표 (h 단위 · 표기는 PLAYER_PARTS 와 같음: `Sphere(r, ws, hs, phiStart°, phiLength°, thetaStart, thetaLength)` · `Cyl(rTop, rBottom, h, seg)` · `box(w,h,d)` · `Torus(R, tube, rs, ts, arc)` · `Cone(r, h, seg)` · `M(x,y,z,rx,ry,rz,sx,sy,sz)`, 각도 규약 PLAYER_PARTS 머리말)
| id | 이름 | 슬롯 | 앵커 | 부품 (h) | 색 → 실광 앞 칸 | 내 캐릭터 꼭대기·px | 문어 꼭대기(r)·초상 | 얻는 길 |
|---|---|---|---|---|---|---|---|---|
| `scarf` | 목도리 | back | **`crown`**(슬롯은 back 이지만 앵커는 머리 — 머리 둘레에 감긴다: 내 캐릭터 목 y 0.56 = 원점 −0.89 h · 문어 머리 바닥 쪽 y 0.20 r = 원점 −0.82 h) | 고리 `Torus(0.78, 0.17, 7, 16, 360°)` `M(0, −0.86, 0, 90°)` (그 높이 머리 반지름 ≈ 0.5 h 라 머리 밖 0.11~0.45 h) + 늘어진 끝 `box(0.26, 0.55, 0.14)` `M(0.42, −1.15, 0.52, 0, 0, −10°)` + 끝 술 `box(0.26, 0.10, 0.14)` `M(0.44, −1.44, 0.56)` | `#c04040` → #a53030 / 그늘 #752438 · 술 `paper[3]` → #ebede9 | 고리 폭 0.34 h = 0.13 m = 3.5 px · 끝 0.10×0.21 m | 고리 y 0.92 − 0.86×0.88 = 0.16 r · 끝 밑 −0.35 r → 바닥 아래 → **문어는 끝 길이 0.38 로 줄임**(밑 y 0.01 r) | **공짜 기본**(둘 다 처음부터) |
| `ribbon` | 리본 | head(문어) / acc(내 캐릭터, 이미 있음) | `crown` | PLAYER_PARTS 2.7 `ribbon` 을 h 로: 고리 `Sphere(0.145, 8, 6)` `M(0.79, 0.37, 0.53)` · `M(0.92, 0.21, 0.50)` + 매듭 `Sphere(0.09, 6, 4)` `M(0.855, 0.29, 0.54)` | `rose[1]` → #7a4841 (밤갈색 머리면 `#c04040`) | 그대로(0.055 m 고리 = 1.5 px 점 둘) | 고리 0.145 r = 6 cm = 1.6 px → 문어에선 r 0.18 로 키움(정면 x 0.79 r 은 머리 표면 z 0.6 라 보임) | **공짜 기본** |
| `beret` | 베레모 | head / acc(있음) | `crown` | 2.7 `beret` 을 h 로: `Sphere(1.105, 16, 8, 0, 360°, 0, 1.25)` `M(0.08, 0.47, 0.03, 0, 0, −0.20, 1, 0.6, 1)` + 꼭지 `Sphere(0.09)` `M(0.08, 1.16, 0.03)` | `rose[0]` → #752438 | 1.33 m (그대로) | 꼭대기 0.92 + 1.16×0.88 = **1.94 r** < 2.15 → 초상 그대로 | **공짜 기본** |
| `pirate_patch` | 해적 안대 | face | `eyeL` | 원판 `Sphere(0.30, 10, 6)` `M(0, 0, 0.30, 0,0,0, 1, 1, 0.35)`(앞면 z +0.40) + 끈 `Torus(1.02, 0.045, 5, 24, 360°)` **머리 원점 기준** `M(0, 0.10, 0, −12°, 0, 22°)`(왼눈을 지나 뒤통수로 감김, 머리 표면 밖 0.02) | 원판 `FIXED.ink` → #10141f · 끈 `#1b1f2e` → #151d28 | 원판 r 0.30×0.35 = 0.105 m = 2.8 px(흰자 0.079 를 다 덮음) · 끈 1 px 선 의도 | 원판 r 0.30 r(눈 0.24 r) · 앞면 z 0.90 + 0.40 = **1.30 r** > 표정 선 1.16 → 그 눈의 눈꺼풀·`^`·큰 눈은 가려진다(의도) | flappy 1~3등 |
| `pirate_hat` | 해적 모자 | head / acc | `crown` | 돔 `Sphere(0.80, 14, 8, 0, 360°, 0, 1.15)` `M(0, 0.58, 0)` (아래 끝 y 0.58 + 0.80·cos 1.15 = 0.91 → 머리 속) · 접힌 앞 챙 `box(1.40, 0.40, 0.14)` `M(0, 0.92, 0.72, −25°)` · 접힌 옆 챙 `box(0.14, 0.36, 1.10)` ×2 `M(±0.82, 0.92, −0.05, 0, 0, ±20°)` · 흰 점(해골 대신) `Sphere(0.09, 5, 4)` `M(0, 1.05, 0.86)` | 돔·챙 `#1e2a44` → #172038 / 그늘 #10141f · 테 `amber[3]` 띠 `Torus(0.82, 0.05)` `M(0, 0.88, 0, 90°)` → #e8c170 · 점 `paper[3]` | 돔 꼭대기 0.58 + 0.80 = 1.38 h → 0.90 + 1.38×0.38 = **1.42 m** < 문 1.68 · 챙 폭 1.40×0.38 = 0.53 m = 14 px | 꼭대기 0.92 + 1.38×0.88 = **2.13 r** < 2.15 → 초상 틀 그대로(여백 0.02 r = 0.5 px, 외곽선 1 px 가 잘릴 수 있음 → §6.4 동적 hw 1.4) | flappy 1등 |
| `pirate_cape` | 해적 망토 | back | `back` | 본체 **닫힌** 납작 원기둥 `Cyl(0.50, 0.85, 1.00, 12)` `M(0, −0.50, −0.30, 0,0,0, 1, 1, 0.42)`(열린 반껍질 금지 — PLAYER_PARTS 0.2 규칙 7, FrontSide 컬링) · 깃 `Torus(0.62, 0.09, 6, 14, 180°)` `M(0, 0.02, −0.05, 0, 0, 180°)`(∪ 를 뒤집어 ∩ 로 어깨 뒤를 감쌈) · 금 테 `Cyl(0.86, 0.86, 0.06, 12)` `M(0, −1.00, −0.30, 0,0,0, 1,1,0.42)` 밑단 | `#7a2a2a` → #752438 / 그늘 #602c2c · 깃·테 `amber[3]` → #e8c170 | 길이 0.46 m = 12 px · 밑단 폭 1.7×0.46 = 0.78 m = 21 px(팔 폭 0.66 보다 넓음, 몸 뒤라 양옆 1.6 px 씩 보임) · 앞면 z: 원점 −0.20 + (−0.30 + 0.42·0.85)×0.46 = −0.17 m → 몸통 r 0.245 뒤에 숨음 | 길이 1.30 r · 밑단 폭 1.7×1.30 = 2.21 r(다리 벌림 1.42 r 보다 넓음 → 뒤에서 양옆 0.4 r = 10 px 씩 보임) · 윗끝 y 1.30 r(머리 뒤 z −0.85 r, 머리 표면 −0.9 → 반 묻힘) · 초상(위 15°)에서 머리 양옆·아래로 어두운 띠 | flappy 1~10등 |
| `astro_cape` | 점성술사 망토 | back | `back` | `pirate_cape` 본체·깃과 **같은 기하**, 테 없음 + 별 점 `Sphere(0.05, 4, 3)` ×7 `(±0.30, −0.25, 뒷면)` `(0, −0.55)` `(±0.55, −0.75)` `(±0.20, −0.90)` z 는 본체 바깥면 −0.30 − 0.42·r(y) − 0.02 | 본체 `#1e2a44` → #172038 / `navy[4]` · 깃 `navy[2]` → #253a5e · 별 `paper[3]` → #ebede9 (1 px 점 의도) | 같음 | 같음 | cards 1~10등 |
| `astro_hat` | 점성술사 모자 | head / acc | `crown` | 고깔 `Cone(0.62, 0.90, 10)` `M(0, 1.40, 0)` (밑 0.95 → 꼭지 1.85) · 챙 `Cyl(0.95, 0.95, 0.07, 14)` `M(0, 0.97, 0)` · 꼭지 구 `Sphere(0.10, 6, 4)` `M(0.10, 1.90, 0)`(살짝 꺾인 끝) · 별 점 `Sphere(0.05)` ×3 고깔 앞면 `(0.12, 1.25, 0.45)` `(−0.15, 1.50, 0.33)` `(0.05, 1.70, 0.20)` | `#1e2a44` → #172038 · 챙 `navy[2]` · 별·꼭지 `amber[3]` → #e8c170 | 꼭대기 0.90 + 1.90×0.38 = **1.62 m** < 1.68 · 챙 지름 1.9×0.38 = 0.72 m = 19 px | 꼭대기 0.92 + 1.90×0.88 = **2.59 r** > 2.15 → **초상 hw 1.85**(§6.4) — 문어 머리 2 r 가 64 px 중 35 px(평소 49) | cards 1등 |
| `emperor_cape` | 황제 망토 | back | `back` | `pirate_cape` 본체·깃과 같은 기하 + 흰 깃을 두껍게 `Torus(0.62, 0.13)` + 검은 점 `Sphere(0.05)` ×5 깃 위(담비 무늬 1 px 점 의도) | 본체 `#a53030` → #a53030 / #752438 · 깃 `paper[3]` → #ebede9 · 점 `FIXED.ink` | 같음 | 같음 | runner 1~10등 (지금 상 id 그대로) |
| `emperor_crown` | 황제 관 | head / acc | `crown` | 띠 `Cyl(0.55, 0.60, 0.26, 8)` `M(0, 1.03, 0)` (0.90~1.16) + 뾰족 점 `Sphere(0.07, 5, 4)` ×4 `(±0.50, 1.22, ±0.20)`·`(0, 1.22, ±0.52)` 중 앞 셋 + 가운데 알 `Sphere(0.08)` `M(0, 1.05, 0.58)` | `amber[3]` → #e8c170 / #de9e41 · 알 `rose[2]` → #a53030 | 1.16+0.07 → 0.90 + 1.29×0.38 = 1.39 m | 0.92 + 1.29×0.88 = **2.06 r** → 초상 그대로 | runner 1등 (**§11 질문 1**) |
| `paper_crown` | 종이 왕관 | head / acc | `crown` | 띠 `Cyl(0.58, 0.58, 0.30, 5)`(오각 — 종이 접은 느낌) `M(0, 1.05, 0)` + 세모 `Cone(0.12, 0.22, 4)` ×5 띠 위 | `paper[2]` → #c7cfcc / `amber[1]` 그늘 · 세모 끝 `amber[3]` | 1.20+0.22 → 1.44 m | 2.17 r → hw 1.42 | 이벤트 주 (지금 상 id 그대로) |

- 슬롯: 내 캐릭터 `acc`(머리, 기존 6 + 모자·관 5) · **새 범주 `face`**(`none` · `pirate_patch`) · **새 범주 `back`**(`none` · `scarf` · `emperor_cape` · `pirate_cape` · `astro_cape`). `PLAYER_PARTS` 가 7 → **9 범주**, `PLAYER_DEFAULT` 에 `face:'none', back:'none'` 추가(CONTEXT 계약은 "바꾸지 않는다" 였으나 망토·안대는 기존 범주에 들어갈 자리가 없다 — **§11 질문 3**, 대안은 acc 에 모자만 넣고 망토·안대는 문어 전용). 메시 배정: acc·face → plHead, back → **plTorso**(후드 덩어리와 같은 자리, 메시 7 그대로).
- 문어 슬롯 `head` · `face` · `back` 각 하나 = **메시 최대 3개 추가**(다락 드로우콜 93 → 96 ≤ 150, 놀이방 0). 시뮬레이션 값은 0개 바뀐다(히트박스 상수 그대로 — ACHIEVEMENTS §4.3 달리기 소품 규칙).
- 잠긴(안 받은) 코스튬은 칩에 **안 보인다**(회색 잠금 칩 없음 — '없는 걸 보여 주며 조르기' 금지). 받은 날 칩이 생긴다.

### 6.3 문어 쪽 코드 사실(구현이 지킬 것)
| 것 | 할 일 |
|---|---|
| 메시 생성 | `octWear(cfg)`: 슬롯별 옛 메시 `bodyG.remove` + `geometry.dispose`, 새 `mergeParts(COSTUME.build(id, 문어 앵커))` → `new T.Mesh(geo, toon)`, `castShadow`(망토만) · `receiveShadow` · **`layers.enable(2)`**(초상) · `userData.slot` |
| 사라짐(FADE) | `octToon`·`octCasters` 목록은 초기화 때 한 번 모으므로 **코스튬 메시를 넣고 빼는 함수가 그 두 배열도 갱신**한다(안 하면 체크 사라질 때 그리기 순서·그림자 어긋남) |
| 초상 캐시 | `portraitKey` 에 `'|' + wearKey`(`head.face.back` id 문자열) 추가 + `octWear` 가 `portraitFlush()` 호출 → 달리기·플래피 스프라이트는 자동으로 따라감(`buildSprites` 가 열 때마다 초상을 다시 찍는다) |
| 초상 틀 | `renderPortrait` 가 **코스튬 꼭대기에 따라 `hw`** 를 정한다: `hw = max(1.3, top_r − 0.75)` (top_r = 머리 1.80 또는 모자 꼭대기 r). 표: 없음·베레모·황제 관 1.3 · 해적 모자 1.4 · 종이 왕관 1.42 · 점성술사 모자 1.85. 타깃 `down` 그대로 | 
| 색 바꾸기 | `setColor(octColor)` 는 태그 1 만 다시 칠한다 → 코스튬(태그 0)은 안 바뀐다 (의도) |
| 2D 폴백 | `scene2d.setOctWear` 는 **무동작**, 2D 초상엔 옷이 없다(계약상 허용). 선택 단계 E2(S): Path2D 로 망토·모자 실루엣 3개만 덧그리기 — **§11 질문 4** |
| API | `SCENE3D.COSTUMES`(정적 목록 `{ id, name, slot }`) · `scene.setOctWear({ head, face, back })`(모르는 id → null) · `scene.octWear()` · 내 캐릭터는 `setPlayer(cfg)` 의 `acc`·`face`·`back` 로 |
| 스프라이트 | `fromPortraits` 는 4장 공통 알파 경계로 자르므로 망토·모자가 크면 24×24 안의 문어 몸이 작아진다(점성술사 모자: 몸 ≈ 14 px). 히트박스는 상수 → 놀이 공정성 영향 0. 못생기면 스프라이트는 `head`·`back` 을 뺀 초상(`portrait(expr, { bg, wear: 'face' })`)으로 찍는 선택지를 남긴다(**§11 질문 5**) |

---

## §7 옷장 · 선물 상자 · 내밀기

### 7.1 흐름
```
주가 닫힘 → 창 열 때 checkAwards → awards[] 도착
 ├ 내 것: wardrobe 에 id 추가 → 설정 › 내 모습 (옷방 전까지의 자리, PLAYER_PARTS §3) 칩이 생김 → 톡 하면 바로 입음 (setPlayer)
 └ 문어 것: gift.box 에 { id, from:{ game, week }, got } 추가 → 설정 › 내 모습 아래 '문어 선물 상자' 줄
       → [내밀기] (문어가 집에 있고 깨어 있을 때만 보임 — [보여 주기] 와 같은 조건, 하루 한 번)
       → 상자에서 1~3개 고름 → '내밀기' 누름
       → 문어 결정 (데모 규칙 / 모델)
            ├ 하나 고름 → setOctWear 그 슬롯 = id, settings.octWear 저장, 상자엔 그대로 남음(다음에 다른 걸 내밀 수 있게) · 기록 줄 by
            └ 고르지 않음 → '오늘은 다 괜찮아' 연출(기호 `…` 또는 고개 돌리기, 시무룩 없음) · 기록 줄 by
       → 내민 것은 사라지지 않는다. 내일 다시 내밀 수 있다
```
- 공짜 기본(목도리·리본·베레모)은 처음부터 **옷장과 선물 상자 둘 다**에 있다(둘이 한 벌 — 문어 혼자 것은 없다).
- 상 코스튬도 늘 **둘이 한 벌**: 같은 id 가 옷장(내 것)과 상자(문어 것)에 같이 들어간다. 내 것은 문어가 안 입어도 남는다(압박 없음의 뼈대, ACHIEVEMENTS §4.3).
- 문어에게 알리는 것은 **'사람이 X·Y·Z 를 내밂'** 뿐 — 등수·점수·게임 이름·'상으로 받았다' 는 보내지 않는다(PLAYER_PROGRESSION 원칙 2·10, §7.4).

### 7.2 문어 결정
| | 데모 규칙 | 모델 |
|---|---|---|
| 시드 | `mkRng(hash('gift|' + 날짜키 + '|' + 그날 몇 번째))` — `Math.random` 0건 | — |
| 결과 | `r < 0.60` → 내민 것 중 `floor(r2 × n)` 번째를 고름 · 아니면 고르지 않음 | 상황 설명에 사실 한 줄 '사람이 선물을 내밂: 해적 모자 · 목도리' + 선택지: 각 물건 · **그냥 두기** · **그만두기**(MODEL_VOICE 장치) |
| 연출 | 고름: 문어가 그 물건 쪽으로 시선(`lookTarget`) 0.6초 → `happy` 없이 `curious` → 입음(메시 등장, 폴짝 없음) · 안 고름: `…` 기호 하나, 자리로 | 모델 말이 있으면 글자 그대로(대화 상자), 없으면 행동만 |
| 기록 줄 | '선물: 문어가 고른 것 — 해적 모자 (내민 것: 해적 모자 · 목도리)' `by:'demo-rules'` 화면에 '데모 규칙' 꼬리표 · 안 고르면 '선물: 문어가 고르지 않음 (내민 것: …)' | 같은 줄 `by:'model'` |
| 말 | 평가·감정 말 없음('예쁘다·좋아' 금지, 음표 기호 금지). 사실 한 줄(15 %)은 §7.4 표와 같은 방식 — 예 '모자네' | 모델이 쓴 그대로, 줄이면 '…' + 원문 보존 |
| 하루 한 번 | `gift.today = { day, n }`; 같은 날 두 번째 [내밀기] 는 버튼이 없다(설명 줄 '오늘은 한 번 내밀었어' 한 줄, 남은 시간 없음) | 같음 |
| 벗기 | 문어가 입은 것은 **사람이 못 벗긴다**. 내밀 때 '아무것도 안 입기' 카드를 함께 내밀 수 있다(문어가 고르면 그 슬롯 비움) — **§11 질문 6** | 선택지에 '벗기' 포함 |

### 7.3 설정 시트 '내 모습' 에 덧붙는 줄 (옷방 전까지)
| 줄 | 내용 |
|---|---|
| acc 칩 줄 | 기존 6 + **받은** 모자·관(없으면 그대로 6) |
| 얼굴 칩 줄 `face` | '없음' + 받은 안대(안대가 없으면 **줄 자체가 없다**) |
| 등 칩 줄 `back` | '없음' · '목도리' + 받은 망토 |
| `h3` '문어 선물 상자' | 상자 안 코스튬 칩(픽셀 그림 + 이름, `aria-pressed` 로 1~3개 선택) + 버튼 '내밀기'(조건 안 맞으면 숨김, 대신 한 줄: '뚜루가 자고 있어' / '뚜루가 나가 있어' / '오늘은 한 번 내밀었어') + 문어가 지금 입은 것 한 줄 '뚜루: 해적 망토' (없으면 줄 없음) |
| 꼬리표 | 결정이 데모 규칙이면 결과 줄 끝에 '데모 규칙' |
- 미리보기(`playerPortrait` 있을 때)는 내 것만. 문어 쪽 미리보기는 장면에서 보인다(초상 캐시 갱신).

---

## §8 저장 스키마

### 8.1 `localStorage.ppolppol_runner` — **그대로**(달리기 전용, 구조 바꾸지 않음)
```
{ v:1, best, runs, day, dayN, last:{ seed, inputs, score, ticks, end, night, moss, version:'runner-1', day, at },
  net:{ subs:[{ runId, week, score, rank, at, done?, final? }], awards:{ paper_crown:[week], emperor_cape:[week], emperor_crown?:[week] }, nick } }
```
`addAward` 는 없는 배열을 만든다(`emperor_crown`). `netState()` 기본 배열 이름 그대로 → test-runner `h.net_().awards.emperor_cape[0]` 그대로.

### 8.2 `localStorage.ppolppol_games` (새, v1, 전부 try/catch)
```json
{ "v": 1,
  "nick": "",
  "games": {
    "flappy": { "best": 0, "runs": 0, "day": "", "dayN": 0,
                "last": { "seed": 0, "inputs": [{ "t": 0, "a": "sw" }], "score": 0, "ticks": 0, "end": "hit", "night": false,
                          "bubbles": 0, "passed": 0, "version": "flappy-1", "day": "", "at": 0 } },
    "cards":  { "best": 0, "runs": 0, "day": "", "dayN": 0,
                "last": { "seed": 0, "inputs": [{ "t": 0, "a": "f3" }], "score": 0, "ticks": 0, "end": "done",
                          "miss": 0, "version": "cards-1", "day": "", "at": 0 } }
  },
  "net": {
    "subs":   [{ "game": "flappy", "runId": "", "week": "", "score": 0, "rank": 0, "at": 0, "done": false, "final": 0 }],
    "awards": { "pirate_cape": ["2026-W45"], "pirate_patch": [], "pirate_hat": [], "astro_cape": [], "astro_hat": [], "paper_crown": [] }
  },
  "gift": {
    "box":    [{ "id": "scarf", "from": null, "got": 0 }, { "id": "pirate_cape", "from": { "game": "flappy", "week": "2026-W45" }, "got": 0 }],
    "today":  { "day": "", "n": 0 },
    "offers": [{ "day": "", "n": 1, "offered": ["pirate_cape", "scarf"], "picked": "pirate_cape", "by": "demo-rules", "at": 0 }]
  }
}
```
| 규칙 | 값 |
|---|---|
| `subs` | 게임 합쳐 최근 30. `end` 는 flappy `'hit'|'quit'`, cards `'done'|'quit'` |
| `awards` | id → 주 목록(달리기와 같은 꼴). 달리기 상은 `ppolppol_runner` 에 그대로 두고 **옷장은 두 키를 읽는다**(읽기 별칭 — 복사하지 않는다, 한 곳에만 진실) |
| `gift.box` | 공짜 기본 3개는 첫 로드 때 채움(`from: null`). 상 id 는 `addAward` 때 같이 넣음(중복 없음) |
| `gift.offers` | 최근 20. 일기(기록 줄)는 기존 로그 체계에 따로 남긴다 — 여기는 재현용 |
| `nick` | 없으면 `ppolppol_runner.net.nick` → `ppolppol_v2.octopus.name` 12자 순 |
| 매번 `load()` 다시 읽고 쓰기 | 달리기 규칙 그대로(사본으로 덮지 않기 — 테스트 #24 와 같은 단언을 새 게임에도) |

### 8.3 `localStorage.ppolppol_v2.settings` 에 더해지는 키 (내보내기/불러오기에 자동 포함)
| 키 | 값 | 복원 규칙 |
|---|---|---|
| `settings.player` | PLAYER_PARTS cfg + `face` · `back` | 모르는 키·id → 기본값(`'none'`). **안 받은 상 id 가 들어 있으면 `'none'`**(옷장과 대조 — 불러오기로 옷을 만들 수 없다) |
| `settings.octWear` | `{ head: id|null, face: id|null, back: id|null }` | 모르는 id → null. 안 받은 상 id → null(같은 대조) |
- 이것이 **놀이 점수·상이 문어 저장에 들어가는 유일한 예외**다: 입은 옷 **id 만**(등수·주·게임 없음). 두뇌 입력(모델 상황 설명·`AVATAR.describe`)엔 '문어가 입은 것: 해적 망토' 처럼 **이름만** 들어갈 수 있고 어디서 났는지는 들어가지 않는다 → smoke 의 '두뇌 입력에 /runner|play|놀이방|오락기|달리기/ 0건' 단언 그대로(코스튬 이름에 그 낱말이 없다 — '해적·점성술사·황제·종이·목도리·리본·베레모').

---

## §9 테스트 계획

### 9.1 `tools/test-games.js` (새, `npm test` 에 추가: `… && node tools/test-runner.js && node tools/test-games.js && node tools/test-api.js`)
| § | 단언 |
|---|---|
| 0 로드 | vm 샌드박스 `{ console, Math, JSON }` 로 `js/games/flappy.js` · `js/games/cards.js` 두 인스턴스씩 로드 → `simulate` 함수, `open` undefined, `VERSION === 'flappy-1'` / `'cards-1'`, `ACTS` 모양 |
| 1 결정성 | 플래피 200판(시드 i, 봇 입력 무작위 간격 8~30틱) × 2 인스턴스 `deepStrictEqual` · 카드 200판(시드 i, 완전 기억 봇 + 무작위 틀림 0~12회) × 2 인스턴스 동일 · 모든 수가 정수 |
| 1b 봇 | 플래피 앞을 보는 봇(틈 중앙 아래면 `sw`) 4판(시드 11·22·33·44) **1800틱 생존**, `coral`·`net` 등장, 수동 `step` 반복 === `simulate` |
| 2 단조·until | 플래피: `until` 늘려 가며 `score` 비감소, `ticks === min(until, 부딪힌 틱)` · 카드: `until < 끝난 틱` 이면 `done:false, score:0`, `until ≥` 이면 끝 결과와 같음 |
| 3 골든 | 플래피 `seed 12345` 입력 없음 → `hit 'sand'`, 틱·점수 고정값(구현이 채우고 바뀌면 VERSION 올림) · 카드 `seed 777` 덱·아이콘 배열 고정값, 완전 기억 봇(틱 0,1,2,… 에 한 장씩, 20번째 뒤집기 = 틱 19 에 끝) → `miss 0`, **`ticks 19`**, `score 1900` · 점수 1900 상한 확인(`miss 0`, `ticks < 60`) · `miss 20` · `ticks 6000` → 정확히 1000 |
| 3b 정크 | 모르는 `a`(`'jd'` 를 플래피에, `'f20'`·`'f-1'`·`'sw'` 를 카드에)·음수·비정수 `t` → `applyInput false`, 결과 결정적, 예외 없음 · 카드 잠금(`lockUntil`) 중 입력 무시 · 같은 틱 두 번째 `sw` 무시 |
| 4 라이브 증거 | `tests/evidence/flappy-live-run.json` · `cards-live-run.json`(smoke 가 씀, `GAMES_LIVE_RUN_DIR` 로 경로 변경) 재시뮬 = 저장 = 화면 |
| 5 가짜 DOM | test-runner §5 의 `h` 하네스를 **공유 모듈 `tools/_fakedom.js` 로 뽑아** 두 테스트가 쓴다. 시나리오: 칩 화면 열림(`#ar-list` 칩 3, `#runner-dlg[open]`) → 칩 톡 → 게임 준비 문구 · 플래피 부딪힘 → 결과판 `/^이번 주 \d+등이야!/` · 카드 완주 → '다 맞췄어!' · `ppolppol_games` 구조 `{ v, nick, games.{flappy,cards}.{best,runs,day,dayN,last}, net.{subs,awards}, gift }` · 출발이 `net` 을 덮지 않음(#24 꼴) · 늦은 200 저장(#25) · 20분 뒤 첫 탭 새 토큰(#30) · `checkAwards` 가 `awards:['pirate_cape','pirate_patch','pirate_hat']` 을 받아 세 배열에 주 추가 + `#ar-award` '지난주 1등! 해적 망토를 받았어. 해적 안대와 해적 모자도 받았어' · 달리기 `awards:['emperor_cape','emperor_crown']` → `/1등! 황제 망토/` 그대로 + `emperor_crown` 배열 생김 |
| 6 코스튬 표 | `COSTUME.build(id, anchor)` 가 모든 id × 두 앵커에서 부품 ≥ 1, 태그 ∈ {0}, 6 cm 규칙(h 0.16) 미만 부품은 '점 의도' 표시된 것만, 문어 꼭대기 r 과 §6.2 표 값 ±0.02 |
| 7 선물 규칙 | `giftDecide(seed, offered)` 가 `Math.random` 0건(소스 grep), 같은 시드 같은 결과, 1000회 중 고름 비율 0.55~0.65, 기록 줄 문자열 꼴 `/^선물: 문어가 (고른 것 — .+|고르지 않음) \(내민 것: .+\)$/`, `by ∈ {demo-rules, model}` |

### 9.2 `tools/test-api.js` 에 더하는 것 (기존 225 그대로)
| 단언 |
|---|
| `api/games/seed.js?game=flappy` 응답에 `game:'flappy'`, 토큰 `readToken` 이 `g:'flappy'` 를 돌려줌 · `game=runner`·`game=x` → 400 `bad_game` · 달리기 토큰(`g` 없음)을 games/submit 에 → 401 `bad_token` |
| `encodePathFor('flappy', '2026-W45', …) === 'games/flappy/2026-W45/09999990-000300-abcdef012345~…json'` · `decodePathFor` 왕복 · `games/flappy/2026-W45/../../x.json` → null · `decodePath`(달리기) 옛 문자열 그대로 |
| 플래피 라이브 기록 통과(1등) · 카드 라이브 기록 통과 · 카드 `done:false` 판(입력을 하나 빼서) → 422 mismatch · 플래피에 `a:'jd'` → 400 bad_inputs · 카드 `a:'f20'` → 400 · too_fast(카드 `ticks 600` 에 `iat` 2초 전) → 400 |
| award: flappy 주 닫힘 뒤 1등 `awards ['pirate_cape','pirate_patch','pirate_hat']` `award 'pirate_cape'` · 2·3등 둘 · 4~10등 하나 · 11등 404(비이벤트) · 이벤트 주 11등 `['paper_crown']` · 닫히기 전 `final:false awards []` · cards 1등 `['astro_cape','astro_hat']` · runner 1등 `['emperor_cape','emperor_crown']` 이고 **`award === 'emperor_cape'`**(옛 단언 그대로) · 망토 정확히 10, 안대 3, 모자 1 |
| top: `games/top?game=cards` 정렬·`s-maxage=15` · 달리기 top 응답에 `game:'runner'` 추가돼도 기존 필드 그대로 |
| `core.RUNNER` getter 가 runner 모듈을 돌려줌(지연 require) · `require('../api/games/submit.js')` 가 `js/runner.js` 없이도 로드(모듈 캐시 지우고 require 경로 가로채기) |

### 9.3 smoke (`tools/smoke.js`, `npm run test:slow`)
| 시나리오 | 바뀜·추가 |
|---|---|
| R(달리기) | 오락기 톡 → `#runner-dlg[open]` 그대로 → **`.ar-chip[data-game=runner]` 톡 한 번 추가** → 이후 그대로(캔버스 정수 배 · `ppolppol_runner.last.version==='runner-1'` · verify · 포커스 복귀) |
| 글리프·2D 시나리오 | `RUNNER.open` 직접 호출 또는 `page.route(O+'/api/runner/**')` 그대로 — 바뀜 없음 |
| **K** 칩 화면 | 칩 3개 보임 · 각 버튼 ≥ 56 px · '최고 N'·'아직 안 해 봤어' · '뒤로' → 포커스 `#btn-machine` · 가로 스크롤 없음 · `tests/evidence/arcade-chips.png` |
| **X** 플래피 | 칩 톡 → 준비 문구 /헤엄/ → 탭 → 부딪힘(봇 없음, 자연 낙하 ≈ 21틱 또는 탭 몇 번) → `#rn-final` ∈ 해초·산호·그물·모래 문구 → `ppolppol_games.games.flappy.last.version==='flappy-1'` · `FLAPPY.simulate` 점수 = 저장 = `#rn-score` · `verify` 통과 · `tests/evidence/flappy-{start,mid,over}.png` · `flappy-live-run.json` |
| **Y** 카드 | 칩 톡 → 20장 → 스크립트로 전부 뒤집어 완주(덱은 `CARDS.simulate(seed,[]).deck` 로 읽음) → '다 맞췄어!' · `score ≥ 1000` · 재시뮬 = 저장 · 카드 CSS 크기 ≥ 44 px · `cards-{board,over}.png` · `cards-live-run.json` |
| **Z** 상·내밀기 | `page.route('/api/games/**')` 가짜 award 응답 `awards:['pirate_cape','pirate_patch','pirate_hat'] final:true` → 창 열면 `#ar-award` /해적 망토/ → 설정 › 내 모습 에 '해적' 칩 3 · 선물 상자 3+3 → 내밀기(가짜 시계로 문어 깨어 있음) → 결정 줄 /^선물: 문어가/ + '데모 규칙' 꼬리표 → 문어가 골랐으면 `scene.octWear()` 슬롯 채워짐 · 초상 캐시 갱신(`portrait('idle')` 픽셀이 바뀜) · 두뇌 입력 JSON 에 /runner\|play\|놀이방\|오락기\|달리기\|등\|점수\|순위/ 0건 · `tests/evidence/costume-{mine,octo}.png` |
| 가로 모드(F 단계) | 뷰포트 740×360 @2x → 테두리 0, 캔버스 배율 = floor(min(740/192, 360/108)) = 3 → 576×324 · 버튼 겹침 · 결과판 ≤ 420 px · `tests/evidence/arcade-landscape.png` |

### 9.4 그 밖에
- `node tools/test-scene-perf.js`: 프로그램 27 그대로 · 다락 드로우콜 ≤ 150(코스튬 +3) · 놀이방 ≤ 60 그대로.
- `node tools/player-shots.js` + 새 `tests/evidence/costume/` 샷(내 캐릭터 × 코스튬 8 · 문어 × 코스튬 8, 1× 와 2×) — 구현자가 Read 로 직접 보고 못생기면 고친다(PLAYER_PARTS 규칙).
- `node --check` 전 파일, `npm test`.

---

## §10 단계 계획

| 단계 | 내용 | 파일 | 크기 | 끝 조건 |
|---|---|---|---|---|
| **A 공통 틀 + 칩 화면** | `js/arcade.js` 로 창·결과판·네트워크·저장·스프라이트 옮김, 달리기를 계약으로 감쌈, `RUNNER.open` 호환, 칩 화면, `ppolppol_games` 기본 로드·저장 | `js/arcade.js`(새) · `js/runner.js`(껍데기화) · `css/runner.css` · `js/app.js openMachine` · `index.html` · `tools/smoke.js` R(칩 톡 1줄) · `tools/_fakedom.js` | **M** | test-runner 568 그대로 · smoke R 통과 · 칩 화면 K |
| **B 플래피** | `js/games/flappy.js` 시뮬 + 그리기 + 입력, 결과 글귀, 골든 | `js/games/flappy.js` · `tools/test-games.js` §0~3b · smoke X | **M** | 200판 결정성 · 봇 1800틱 · 라이브 증거 |
| **C 카드** | `js/games/cards.js` 시뮬 + 판 그리기(아이콘 PNG · 절차 무늬 폴백) + 톡·키보드 | `js/games/cards.js` · test-games · smoke Y | **M** | 결정성 · 완주 봇 · 아이콘 못 불러와도 돈다 |
| **D 서버 일반화** | 등록부 · core 일반화(지연 require · `g` 토큰 · 경로 코덱) · `api/_lib/handlers.js` · `api/games/*.js` 4개 · 달리기 4 파일 위임 · vercel.json · 상 규칙 표 · 클라이언트 `awards[]` | `api/_lib/{core,games,handlers}.js` · `api/runner/*.js` · `api/games/*.js` · `vercel.json` · `tools/test-api.js` · `js/arcade.js checkAwards` | **M** | test-api 225 그대로 + §9.2 · 배포 뒤 `curl /api/games/seed?game=flappy` 200 · `/api/runner/seed` 바이트 동일 응답 꼴 |
| **E 코스튬 + 문어 옷** | `js/costume.js`(h 단위 빌더, 두 장면이 공유) · 내 캐릭터 `face`·`back` 범주 + 모자 5 · 문어 `setOctWear` · 초상 키·hw · FADE 목록 · 옷장/선물 상자 UI · 내밀기 데모 규칙 · 기록 줄 · settings 키 | `js/costume.js`(새) · `js/scene3d.js`(문어 블록·내 캐릭터 블록·portrait) · `js/scene2d.js`(무동작) · `js/app.js renderSettings` · `docs/PLAYER_PARTS.md` §2.7 덧붙임 · test-games §6·7 · smoke Z · evidence | **L** | 프로그램 27 · 드로우콜 ≤ 150 · 초상에 옷 보임 · 달리기 스프라이트에 옷 보임 · 데모 꼬리표 |
| **E2(선택) 2D 초상 옷** | Path2D 망토·모자·안대 실루엣 | `js/scene2d.js` | **S** | 2D 초상 옷 |
| **F 가로 모드** | `matchMedia` · 테두리 0 · 배율 · 버튼 겹침 · '폰을 돌리면 더 크게' · lock 시도 | `js/arcade.js` · `css/runner.css` · smoke | **S** | 가로 증거 샷 |
| 순서 | A → D → B → C → E → F (D 를 B 앞에 두면 플래피 첫 판부터 올릴 수 있다) · E 는 D 뒤 아무 때나 | | 합 **M×4 + L + S×2** | |

---

## §11 주인이 정할 것

1. **달리기 1등 추가 조각** — 황제 관(`emperor_crown`, amber 띠 + 점 4)을 줄까? 주인 말엔 해적·점성술사만 있었다. 기본안: **준다**(세 게임이 같은 규칙 '망토 + 1등 조각').
2. **해적 안대 범위** — 1~3등(기본안)인가, 1등만(모자와 함께)인가? 기본안은 '잘하고 못하고 차이 작게' 안에서 한 단 더 두는 쪽.
3. **`PLAYER_PARTS` 범주 7 → 9**(`face`·`back` 추가) 를 허락할지. 대안: 모자만 `acc` 에 넣고 망토·안대는 문어 전용(그러면 '둘이 한 벌'이 모자·관만 된다).
4. **2D 폴백 초상에 옷**(E2, S) 을 할지 — 안 하면 2D 사용자는 문어 옷을 장면·초상·스프라이트 어디서도 못 본다.
5. **달리기·플래피 스프라이트에 큰 모자·망토를 그대로 둘지**(문어 몸이 24×24 안에서 14~18 px 로 작아짐) 아니면 스프라이트는 `face` 만 입힐지.
6. **문어가 입은 것을 벗기는 길** — 사람이 직접 못 벗기고 '아무것도 안 입기' 카드를 내미는 기본안인가, 사람이 언제든 벗길 수 있게 할까?
7. **카드 4×4 작은 판** — 순위 없는 연습 판으로 둘지(칩 안 토글, 저장만), 아예 뺄지(기본안: 뺀다).
8. **이벤트 주(종이 왕관)를 세 게임 공통으로** 둘지(기본안) — 게임별 `RUNNER_EVENT_WEEKS` 변수는 늘리지 않는다.

---

## §12 자기 점검 표

### 12.1 달리기 호환
| 항목 | 지금 | 이 설계 | 깨지나 |
|---|---|---|---|
| API 경로 `api/runner/{seed,submit,top,award}` | 있음 | 그대로(본문만 위임) | 아니오 |
| 토큰 바이트(`{seed,night,iat,week,v}`) | | 달리기 토큰에 `g` 안 넣음 | 아니오 |
| 응답 필드 | `{ok,rank,total,week,runId,nick,score,award}` | 그대로 + `awards`·`game` 추가 | 아니오(추가만) |
| 블롭 경로 `runner/`·`runner-ids/` | | 그대로 | 아니오 |
| `encodePath`/`decodePath`/`board`/`ACTS`/`RUNNER`/`AWARDS`/`secret` 이름 | | 그대로(새 이름은 `…For`) | 아니오 |
| `VERSION 'runner-1'`·물리 상수 | | 손대지 않음 | 아니오 |
| `localStorage.ppolppol_runner` 구조 | | 그대로(`emperor_crown` 배열만 생길 수 있음) | 아니오 |
| DOM id `#runner-dlg`·`rn-*`·문구 정규식 | | 그대로(공통 틀이 같은 id 사용) | 아니오 |
| `RUNNER.open({opener})` 즉시 달리기 | | 그대로 | 아니오 |
| `#btn-machine` 톡 → `#runner-dlg[open]` | | 그대로(칩 화면이 그 창 안) · smoke R 은 칩 톡 1줄 추가 | smoke 1줄 |
| `tests/evidence/runner-live-run.json` | | 그대로 | 아니오 |
| 환경변수 `RUNNER_SECRET`·`RUNNER_EVENT_WEEKS`·키 파생 문자열 | | 그대로 | 아니오 |

### 12.2 리플레이 검증 — 세 게임
| | runner | flappy | cards |
|---|---|---|---|
| 시드 | 토큰 uint32 / `hash32(날짜\|n)` | 같음 | 같음 |
| 입력 알파벳 | jd·ju·dd·du | sw | f0..f19 |
| 틱 | 60 Hz 정수 서브 px | 같음 | 60 Hz, 첫 뒤집기부터 |
| 난수 | mulberry32 `%` 만 | 같음 | 같음(아이콘 10 → 덱 20 순) |
| 끝 조건 | 부딪힘 | 부딪힘·모래 | 10쌍 다 맞춤 |
| 두 번 시뮬 일치 → 끝난 판만 | 예 | 예 | 예(안 끝나면 MAX_TICKS 까지 돌아 틱 불일치) |
| too_fast `ticks/60 ≤ 경과+3` | 예 | 예 | 예(실시간 틱) |
| 서버가 비교하는 것 | score·ticks | score·ticks | score·ticks(아이콘·덱은 비교 안 함, 시드에서 나옴) |
| 골든·200판 결정성·정크 입력 | test-runner | test-games | test-games |

### 12.3 원칙
| 원칙 | 어디서 지켰나 |
|---|---|
| 압박 없음(타이머·연속·한정·뽑기·완성률) | 카드에 시계 없음(끝난 뒤 초만) · 칩에 '이번 주 N등' 은 내가 올린 기록이 있을 때만 · 잠긴 코스튬 칩 안 보임 · 내밀기 '오늘은 한 번' 에 남은 시간 없음 · 상 기한 없음 · 순위 10/20 만 · 월요일 한 줄은 지금 문구 그대로 |
| 둘이 한 벌 · 내밀기 | §7: 모든 코스튬이 옷장+상자 쌍 · 문어 혼자 것 없음 · 입을지는 문어 · 거절 담담 · 하루 한 번 · 등수·점수는 문어에게 안 감 |
| 정직 표기 | 데모 결정 `by:'demo-rules'` + 화면 꼬리표 · 모델 말 그대로 · 선택지에 그냥 두기·그만두기 · `Math.random` 0건(시드 `gift\|날짜\|n`) |
| 문어 저장에 놀이 0바이트 | `ppolppol_v2.settings.octWear` 에 **입은 id 만**(예외로 명시) · 두뇌 입력엔 코스튬 이름만, 놀이 낱말 없음 |
| 이모지·기호 없음 | 모든 화면 글이 글자·픽셀 그림(칩 그림은 캔버스) · 문어 반응 기호 `…`는 기존 기호 체계(DIALOGUE_UI) 범위 |
| 폰 세로 한 손 | 칩 ≥ 56 px · 카드 60 CSS px · 조작 버튼 ≥ 44 px · 가로 모드는 선택(안내 한 줄) |
| 2D 폴백에서 놀이 | 세 게임 다 캔버스 2D · 문어 그림은 `drawnOctopus` 폴백(옷 없음 — §11 질문 4) |
| 새 셰이더 없음 · 드로우콜 | 코스튬은 toon/toonP 정점색 · 문어 +3 메시(≤ 150) · 놀이방 0 |
| 놀이 소품은 그림만 | 히트박스·속도·점수 상수는 스프라이트 크기와 무관(§3.3 · §6.3) |
