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
- 점수는 이 기기에만 남는다고 화면 아래에 적어 둔다 (http(s) 에선 "올리기 전까지"). 올리기는 사람이 버튼을 눌러야만.

## 랭킹 서버 (주간 · 리플레이 검증)
정적 사이트는 그대로(빌드 없음), Vercel Node 함수 4개만 `api/runner/` 에 있다. 저장소는 **private Vercel Blob** (icn1).
공통 부품 `api/_lib/core.js`, 테스트 `npm test` (= `tools/test-api.js`, 네트워크 없음 · 메모리 저장소 · 주입 시계).

| 끝점 | 하는 일 |
|---|---|
| `GET /api/runner/seed?tz=<분>` | `{ token, seed, night, iat, week, v }`. seed = crypto uint32, night = 현지 시각 ∈ [20, 6) (`tz` = UTC 에 더할 분, 서울 540, 없으면 540). 토큰 = `b64u(JSON{seed,night,iat,week,v})` + `.` + `b64u(HMAC-SHA256)` |
| `POST /api/runner/submit` | 몸 `{ token, inputs, score, ticks, nick }` → `{ ok, rank, total, week, runId, nick, award }` |
| `GET /api/runner/top?week=` | 그 주(기본 이번 주) 상위 20 `{ rank, nick, score, at }`, `s-maxage=15` |
| `GET /api/runner/award?runId=&week=` | 주가 끝났고 상위 10 → `emperor_cape`, 기록만 있으면(이벤트 주) `paper_crown`, 없으면 404 |

**키**: `RUNNER_SECRET` 이 있으면 그것, 없으면 `sha256('ppolppol-runner|' + BLOB_READ_WRITE_TOKEN)`. 둘 다 없으면 503 (로그에 남기지 않음).
**주**: Asia/Seoul ISO 주 (`2026-W45`). 월요일 00:00 KST 에 새 주. 이벤트 주는 기본 "모든 주", `RUNNER_EVENT_WEEKS=2026-W45,2026-W46` 로 좁힐 수 있다.

### submit 검증 (순서대로, 하나라도 어긋나면 거절 · 거절은 아무것도 저장하지 않는다)
1. 서명 (timingSafeEqual) → 401 `bad_token`. 토큰 `v` ≠ `RUNNER.VERSION` → 400 `old_version`.
2. `iat` 가 30분 안 (미래 5초 이상이면 거절) → 401 `expired`.
3. `score`·`ticks` 정수 범위, `inputs` ≤ 20000개, 각 `{t 정수 ≥ 0 비감소, t ≤ ticks, a ∈ jd|ju|dd|du}` → 400.
4. **실시간보다 빠를 수 없음**: `ticks / 60 ≤ (지금 − iat) / 1000 + 3` → 400 `too_fast`.
5. 토큰의 seed·night 로 `simulate` 를 **끝까지** 한 번, **`until = ticks`** 로 한 번 → 둘 다 주장한 `score`·`ticks` 와 같아야 → 422 `mismatch`.
   그래서 **부딪혀 끝난 판만** 올라간다 (중간에 닫은 판은 끝까지 돌리면 틱이 달라진다).
6. **시드(토큰)당 한 번**: `runId` = sha256(token) 앞 12 hex. `runner-ids/{week}/{runId}.json` 을 덮어쓰기 금지로 먼저 쓴다 → 이미 있으면 409 `duplicate`.

### 저장되는 것
```
runner/{week}/{(10_000_000 − score) 8자리}-{ticks 6자리}-{runId}~{base64url(nick)}.json   ← 사전순 = 순위 (동점이면 짧은 틱이 위)
  { nick, score, ticks, at, runId, inputsLen }
runner-ids/{week}/{runId}.json   { runId, at }   ← 중복 막기 표지
```
IP·UA·입력 내용은 저장하지 않는다. 순위표는 `list(prefix)` 한 번 + 경로 해석뿐 (블롭 본문을 읽지 않음).
닉네임: NFC, 한글·라틴·숫자·공백·`_-` 만, 1–12자, URL·7자리 넘는 숫자·금칙어(한/영 29개, 공백 무시 부분 일치) → `익명 문어`.

### 상 (꾸미기 전용 · 계정 없음)
- 이벤트 주에 검증을 통과한 판 → **종이 왕관** (`paper_crown`).
- 주가 끝난 뒤 그 주 상위 10 → **황제 망토** (`emperor_cape`). 판을 올린 기기가 `runId` 로 물어봐야 받는다.
- 클라이언트는 `localStorage.ppolppol_runner.net = { subs:[{runId, week, score, rank, at, done?}], awards:{ paper_crown:[week], emperor_cape:[week] }, nick }` 에만 적는다.
  문어에게 입히는 건 §16 선물 시스템 몫 (여기선 저장만).

### 클라이언트 (`js/runner.js`)
- `location.protocol` 이 http(s) 일 때만. 판마다 `seed` 를 받아(2 초, 기다리는 동안 "판을 고르는 중이야…", 출발 막음) 그 seed·night 로 달린다. 실패하면 조용히 로컬 시드 (올리기 칸이 안 보임).
- 부딪혀 끝나면 결과판에 닉네임 칸(기본 = `ppolppol_v2.octopus.name`, 12자) + **기록 올리기** + 이번 주 10위 + "닉네임과 점수만 저장해. 이번 주 순위는 월요일에 새로 시작해."
- 열 때 지난 주 기록(아직 안 물어본 것, 최대 4개)을 `award` 로 확인 → 망토면 "지난주 N등! 황제 망토를 받았어".
- `file://` 이면 네트워크 호출 0, 화면도 예전 그대로.

### 알려진 한계
- 시뮬레이터가 공개라서 **봇이 좋은 입력을 찾아 올릴 수 있다** (시드를 여러 번 받아 고르는 것도). 실시간 규칙이 속도만 막는다. 그래서 상은 꾸미기뿐.
- 레이트 리밋 없음. `tz` 는 클라이언트가 정한다 (밤 장애물만 바뀜).
- 수동 검토: Blob 스토어에서 `runner/{week}/` 를 나열하면 경로만으로 점수·틱·닉네임이 보인다. 지울 블롭은 대시보드나 `del()` 로.
- 물리·생성 규칙을 바꾸면 `VERSION` 을 올린다 → 옛 토큰은 `old_version` 으로 거절.

## 테스트
```
npm test                         # 랭킹 API (서명·만료·실시간·재시뮬·중복·순위·주 경계 상·닉네임), 네트워크 없음
node tools/test-runner.js        # 무작위 200판 ×2 인스턴스 동일 · 봇 4판 40초 생존 · 단조 · 골든 · 라이브 기록 재시뮬
SMOKE_ONLY=R node tools/smoke.js # 실제 브라우저(SwiftShader, 360×740 @2x) 판 → tests/evidence/runner-{start,mid,over}.png, runner-live-run.json
```
