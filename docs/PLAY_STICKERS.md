# 놀이 반응 스티커 — 다락방 달리기 · 헤엄 (PLAY_STICKERS)

> 11-09. 요리 스티커(docs/COOK_STICKERS.md)와 같은 엔진 · 같은 규칙으로 놀이마다 스티커 세트를 하나씩 둔다.
> 세트마다 머리에 쓰는 것이 다르다: 요리 = 요리사 모자 · **달리기 = 파란 머리띠** · **헤엄 = 이마에 올린 물안경** (눈이 보여서 표정이 산다).

## 파일

| 경로 | 역할 |
|---|---|
| `tools/ui-art/sticker-kit.js` | 세 세트가 같이 쓰는 붓 (몸·다리·얼굴·소품·몸 색 바꾸기) |
| `tools/ui-art/runner-stickers.js` · `swim-stickers.js` | 세트 그림 정의 |
| `tools/make-stickers.js` | 세트 전부 (또는 `node tools/make-stickers.js runner`) → `assets/stickers/<세트>/` + manifest `sticker.<세트>.*` + 미리보기 `tests/evidence/<세트>-stickers/sheet.png` |
| `js/cook-stickers.js` | 엔진 `PPOL_STICKERS.make(cfg)` + 요리 세트 (먼저 싣는다) |
| `js/play-stickers.js` | `RUNNER_STICKERS` · `SWIM_STICKERS` + 달리기 자동 감지 |
| `css/cook-stickers.css` | 세 세트 모두 이 css (등장·퇴장·칸 넘김) |
| `tools/ui-art/play-stickers.html` | 개발용 시험대 — 진짜 `runner.js` 를 열어 자동 발동을 본다. 캡처 `tests/evidence/runner-stickers/live.png` |
| `tools/test-play-stickers.js` | 검사 (`npm test` 에 들어 있음) |

## 다락방 달리기 — 머리띠 문어 9종

| id | 라벨 | 그림 | 뜨는 순간 |
|---|---|---|---|
| `dash` | 쌩 (움직임 2칸 · 6 fps) | 다리를 번갈아 달림 + 속도선 | 출발 · 또 하기 |
| `hop` | 폴짝 (움직임 2칸 · 4 fps) | 공중 ↔ 웅크려 착지 | 첫 점프 · 점프 몇 번마다 |
| `duck` | 납작 | 납작 엎드려 거미줄 밑 | 첫 숙이기 · 숙이기 몇 번마다 |
| `phew` | 휴 | 다리로 이마 훔치기 | 장애물을 2px 이하 틈으로 지나감 |
| `moss` | 이끼 득 | 이끼 한 줌 번쩍 | 첫 이끼 · 세 번마다 |
| `fire` | 활활 (움직임 2칸 · 6 fps) | 뒤로 불꽃 | 빨라짐 (속도 단계 셋을 넘을 때) |
| `trophy` | 최고! | 트로피 | 새 최고 기록 (첫 판은 빼고) |
| `bonk` | 콩 (움직임 2칸 · 4 fps) | 어질어질 별이 빙글 | 부딪힘 — 벌 그림 아님 |
| `again` | 한 판 더 | 주먹 불끈 | 또 하기 |

### 자동 발동 (runner.js 를 고치지 않는다)

`RUNNER_STICKERS.watch()` 한 줄. 0.5초마다 달리기 창(`#runner-dlg`)이 열렸는지만 보고, 열려 있으면 그리기 고리마다 `RUNNER.live()` (읽기 전용 복사본) 의 앞뒤 모습을 견준다:

| 순간 | 알아채는 법 |
|---|---|
| `start` · `again` | `state` 가 `run` 이 됨 (`over` 에서 오면 또 하기도) · `over → ready` 도 또 하기 |
| `jump` | `ground` 가 true → false |
| `duck` | 새 입력 중 `dd` |
| `moss` | `moss` 가 늘어남 |
| `speed` | `speed` 가 448 · 576 · 704 (서브 px/틱) 를 넘음 |
| `pass` `{ clear }` | 문어 칸(x 30~44)을 지나간 바닥 장애물의 가장 좁은 틈 (문어 높이 − 장애물 높이, px) |
| `over` · `best` | `state` 가 `over` 가 됨 · 그때 점수가 판 시작 때의 최고보다 높음 |

스티커는 달리기 화면(`.rn-stage`) **틀 위로 걸터앉는 양쪽 모서리**에 ×2 (64px) 로 뜬다. 화면 안(장애물·거미줄·문어)은 거의 가리지 않는다.
본 게임에 켜는 법 (app.js 묶음 열쇠 차례에): `index.html` 에 `css/cook-stickers.css` · `js/cook-stickers.js` · `js/play-stickers.js` 를 `js/runner.js` 뒤에 싣고 `RUNNER_STICKERS.watch()` 한 줄.

## 헤엄 — 물안경 문어 9종 (카드 8 용)

| id | 라벨 | 그림 | 뜨는 순간 |
|---|---|---|---|
| `splash` | 풍덩 | 물에 뛰어듦 + 물보라 | 시작 |
| `flap` | 톡 (움직임 2칸 · 4 fps) | 다리 쫙 밀기 ↔ 모으기 | 내 첫 톡 · 톡 몇 번마다 |
| `bubble` | 보글 (움직임 2칸 · 3 fps) | 거품이 올라감 | 톡 몇 번마다 |
| `bump` | 퐁 | 눈 질끈 + 퐁 고리 | 살짝 부딪힘 |
| `pickup` | 주웠다 | 조개껍데기 줍기 | 줍기 |
| `jet` | 쓩 | 먹물 뒤로, 앞으로 쓩 | 먹물 퓻 (문어) |
| `wave` | 같이 가자 (움직임 2칸 · 3 fps) | 다리 흔들기 | 문어의 톡 몇 번마다 |
| `float` | 둥둥 (움직임 2칸 · 2 fps) | 눈 감고 떠 있음 | 끝: 저절로 · 그만 · 가만히 (벌 없음) |
| `arrive` | 도착 | 깃발 | 끝: 직접 헤엄침 (`played`) |

카드 8 의 소리 훅 옆에 한 줄: `window.SWIM_STICKERS && SWIM_STICKERS.cue(act, { who, status })` (또는 `ppol:swim` 이벤트).
코스 스크립트(`SCRIPTS`, `begin({ course })`)는 `reef` 산호초 · `kelp` 다시마 숲 두 개가 자리표시로 있다. 카드 8 이 코스 id 를 정하면 키만 맞춘다.

## 엔진에 더한 조건

요리 세트의 조건(`on` · `tier` · `minTier` · `ingredient` · `reason` · `nth` · `every` · `once` · `force` · `chance`)에 더해
`who` · `status` · `is: { 키: 값 }` · `atLeast: { 키: 수 }` · `atMost: { 키: 수 }`. 세트마다 `big`(쉬는 틈 무시하는 순간) 과 `slots`(놓는 자리)를 따로 둔다.
요리 세트의 이름(`COOK_STICKERS.cue` · `setRecipe` · `RECIPES` · `current().recipe` · 로그 `from: 'recipe:…'`)과 시드는 그대로라 같은 판이면 전과 같은 스티커가 나온다.

## 지키는 것 (요리 세트와 같다)

그림뿐·글자 없음 · 기록은 `by: 'demo-rules'` 이고 문어 기록·두뇌·모델 요청에 넣지 않는다 · 부딪혀도 벌 그림 없음 ('콩' = 어질어질, '퐁' = 질끈, 끝이 어떻든 '둥둥' 또는 '도착') · 같은 판 id = 같은 스티커 · 시드 없는 난수 0건 · 모션 줄이기면 멈춘 그림.
