# 갈래 H — 친구 집 방문의 서버 쪽과 스냅샷 (가지 `lane/6-home` · 상한 30달러)

먼저 `wip/round6/briefs/COMMON.md`. 그다음 참고로: `api/_lib/core.js` (서명 토큰 · 닉네임 정리 · 메모리 저장소 · 주입 시계), `api/room.js` (방 만들기의 남용 막기),
`mcp/store.js` (Blob 어댑터), `api/runner/submit.js` (덮어쓰기 금지 블롭 패턴), `tools/test-api.js` (서버 시험의 본보기), `docs/PROTOCOL.md` §3.

## 주인 말 (11-18)

"계절 아이템은 놓친 건 친구가 가지고 있는 집 놀러가면 설계도 받아서 … 멀티 고려하고 있는데 이거 vercel 에서는 못하나?"

## 정해진 방향

실시간 (같은 곳에서 서로 걷기) 은 나중이다. 먼저 **비동기 방문**: 친구가 올려 둔 집의 **멈춘 사진 같은 사본 (스냅샷)** 을 코드로 찾아가 구경하고, 놓여 있는 것의 설계도를 받는다.

## 무엇을 만드나 — 함수 파일이 아니라 **라이브러리와 시험**

새 `api/*.js` 함수 파일은 만들지 않는다 (Vercel 무료 요금제는 함수 12개 한도, 지금 9개 — 얇은 함수 파일과 `vercel.json` 은 리드가 붙인다).
밑줄로 시작하는 `api/_lib/` 아래는 함수로 배포되지 않는다.

### 1) 스냅샷 규격과 검증 `js/next/visit.js` (브라우저 + node 둘 다에서 도는 순수 코드, 전역 `VISIT`)

- `VISIT.snapshot(state, day)` → 본 게임 저장 `S` (넘겨받는다) 에서 **꾸밈만** 골라 담는다. 담는 것 (전부 id · 수 · 색):
  `v` · `day` · `season` · `player` (모습 12범주 id) · `dyed` · `layout` (가구 자리) · `skin` (벽지 · 바닥 id) · `furn` (놓인 가구 id 와 자리) ·
  `garden` (칸 색 · 물) · `lantern` · `souvenirs` (id 만) · `posterN` (벽에 걸린 포스터 장수 0~6 — 스티커 · 장면 id 는 담지 않는다: 문어가 다녀온 곳이다) · `shown` (전시한 것 id).
  친구가 설계도로 받아 갈 수 있는 것은 따로 담지 않는다 — **집에 놓여 있는 것 (`furn`) 이 곧 받을 수 있는 것** 이다 (주인: "친구가 가지고 있는 집").
  아직 저장에 없는 칸은 건너뛴다 (리드가 차차 넣는다).
- **담지 않는 것**: **문어에 관한 것 전부** — 몸 색 · 이름 · 모습 · 지금 있는 곳 · 취향 값 · 미용실 대답 (`S.octopus` · `S.salon` · `S.notes` · `S.curiosityNotes` · `S.trips` 는 읽지 않는다.
  예외는 벽에 걸린 포스터의 **장수** 와 선반의 기념품 id 뿐). 그리고 문어가 쓴 말 · 메모 · 포스터 글 · 산책 기록 · 위키 요약 · 조개 수 · 접속 시각 · 이름 · 방 열쇠 (`settings.claudeRoom`). 자유 글 0.
- `VISIT.validate(snap)` → 모양만 엄격히: 키 화이트리스트 · id 는 `/^[a-z0-9_]{1,24}$/` · 색은 `#rrggbb` · 숫자 범위 · 배열 길이 · 전체 4KB 이하. 어긋나면 **거절** (자르지 않는다).
- `VISIT.learn(user, snap, id, day)` → id 가 스냅샷 `furn` 에 **놓여 있는** 계절 꾸밈 (COMMON 의 계절 8개) 이면 `user.plans[id] = { at: day, from: 'friend' }`.
  이미 아는 것은 그대로 둔다 (쓰는 모양은 갈래 F 의 `CRAFT.learn` 과 같다). 상한은 **하루 통틀어 3장** (상수 `LEARN_PER_DAY = 3`) — `user.visitDay = { day, n }` 로 센다 (친구 집 코드는 저장하지 않는다).
- `VISIT.CODE_RE` · 코드는 헷갈리는 글자 (0 O 1 I L) 를 뺀 8자.

### 2) 서버 로직 `api/_lib/home.js` (CommonJS, 저장소 · 시계 · 비밀값은 주입)

`store` 는 `mcp/store.js` 어댑터 꼴 (`read(path) → 글 | null` · `write(path, 글)` 덮어쓰기 · `list(prefix)`) 에 **`del(path)` 하나를 더한 것** 으로 한다.
기존 어댑터에는 `del` 이 없으니 시험은 `tools/next/test-home.js` 안의 네 메모리 저장소로 하고, Blob 지우기를 `mcp/store.js` 에 더하는 일은 '리드가 이을 것' 에 적는다.
`api/_lib/core.js` 의 `memoryStore` 는 같은 경로 덮어쓰기를 막으니 쓰지 않는다. 비밀값과 시계는 `opts.secret` · `opts.now` 로 받는다 (아래 함수 넷 모두의 마지막 인자).

```
createHome(store, { ip, origin, host })           → { ok, key, code }       key = 주인만 아는 열쇠 (192비트), code = HMAC 로 유도한 읽기 전용 8자
putSnapshot(store, key, snap, { now })            → { ok } | { ok: false, error }   검증 통과한 것만 homes/<code>/snap.json 에 통째로 (주인 하나만 쓰니 경합 없음)
deleteHome(store, key)                            → 공유 끄기 = 서버에서 삭제
getVisit(store, code)                             → { ok, snap } | 404
```

- 남용 막기 (아래 '덧붙임' 의 숫자가 이긴다): Origin 이 있으면 같은 호스트만 · IP 당 시간 5개 (메모리) · 집 하나가 스냅샷을 올리는 횟수 상한 —
  Vercel 무료 요금제의 Blob 쓰기는 **월 2,000회** 뿐이라 쓰기를 아끼는 것이 설계의 중심이다. 읽기 응답은 CDN 에 60초 실을 수 있게 (헤더는 리드가).
- 전체를 끄는 스위치: 환경 변수 `PPOLPPOL_HOMES=off` 면 전부 503.
- 저장 경로는 `homes/` 아래만 — `rooms/` (모델 쪽 상태) 와 섞지 않는다. IP · UA · 방문 기록을 저장하지 않는다. 로그에 열쇠 · 내용을 남기지 않는다.
- 방명록 · 선물 · 방문 수는 **만들지 않는다** (쓰기 상한 · 검열 부담 — 다음 단계. 문서에 '항목당 블롭 하나' 설계만 반 쪽으로 적어 둔다).

### 3) 문서 `docs/next/home.md`

끝점 모양 (리드가 만들 `POST /api/home` · `POST|DELETE /api/home/<key>` · `GET /api/visit/<code>`), 스냅샷 칸 표, 개인정보 선, 무료 요금제 한도와 그에 맞춘 수치,
실시간으로 갈 때의 길 (Vercel Functions 가 2026-10 부터 WebSocket 을 받지만 300초마다 끊기고 방 상태는 외부 Redis 가 필요하다는 것 — 조사 요약은 `wip/round6/README.md`).

## 파일

`js/next/visit.js` · `api/_lib/home.js` · `tools/next/test-home.js` (스냅샷 · 검증 · 서버 로직을 메모리 저장소로) · `next/visit.html` (가짜 저장으로 스냅샷을 만들어 JSON 과 크기를 보여 주는 쪽) · `docs/next/home.md`

## 끝난 것으로 보는 조건

- node 시험: 스냅샷에 금지 칸 (말 · 메모 · 열쇠 · 조개 · 이름) 이 없음 (깊이 훑어 낱말 검사) · 가짜 저장의 문어 이름 · 몸 색 · 미용실 말 · 메모에 심은 표식 글자가 스냅샷 JSON 에 0건 · 가짜 저장에 `javascript:` · 긴 글 · 모르는 키를 심어도 검증이 거절 ·
  4KB 넘으면 거절 · `createHome` 의 code 가 key 에서만 나오고 code 로 key 를 못 구함 · 하루 2번째 올리기 거절 · 삭제 뒤 방문 404 · 스위치 off 면 503 ·
  `learn` 이 놓여 있지 않은 id · 계절 꾸밈이 아닌 id 는 거절 · 하루 통틀어 3장 상한 · 모든 시험이 네트워크 없이 5초 안.
- `npm test` 그대로 초록 (기존 `tools/test-api.js` · `tools/test-export.js` 를 건드리지 않고).

## 리드가 이을 것

얇은 함수 파일 셋과 `vercel.json` · `tools/test-export.js` 의 주소 단언 · 설정의 '우리 집 코드' 줄 · 방문 모드 (장면 setter 로 남의 집 그리기, 저장 잠금) · 설계도 받기 단추.
`docs/next/home.md` 의 이 절 첫 줄로 적는다: **방문 화면에는 문어가 나오지 않는다** — 남의 문어를 코드가 움직이지 않는다 (주인 답이 오면 바뀔 수 있다).

## 덧붙임 — 독립 점검에서 나온 것 (위 글과 어긋나면 이 절이 이긴다)

- **쓰기 한도가 설계의 중심이다.** 월 2,000회는 모델 방 · 달리기 순위와 같이 쓴다 — 넘으면 게임의 서버 쪽 전체가 30일 선다. 그래서:
  ① **열쇠는 서버가 만든 것만**: key = 무작위 18바이트 + HMAC(secret, 그 18바이트) 의 앞 6바이트 (base64url 32자). `putSnapshot` · `deleteHome` 은 저장소를 건드리기 **전에** 서명부터 본다 (지어낸 key 는 저장소 호출 0번으로 거절).
  ② 집 하나는 **하루 1번**, 올린 것이 저장된 것과 같으면 쓰지 않는다 (`{ ok: true, same: true }`).
  ③ 전체 쓰기 상한 `HOMES_WRITES_PER_DAY` (상수, 기본 20 — 셈 블롭 `homes/_day.json` 의 `{ day, n }` 을 고쳐 쓰는 것도 n 에 넣는다). 넘으면 `{ ok: false, error: 'busy' }`.
  `docs/next/home.md` 에 월 최대 쓰기 수와 '방 · 달리기와 한도를 같이 쓴다' 를 적는다.
  시험: 서버가 만들지 않은 key 는 저장소 호출 0번으로 거절 · 같은 내용 다시 올리면 쓰기 0번 · 하루 2번째 올리기 거절 · 하루 전체 상한을 넘으면 거절.
- **끝점은 함수 파일 하나로** (한도 12개 가운데 지금 9개): `POST /api/home` — 몸 `{ op: 'create' | 'put' | 'delete', key, snap }`, 읽기는 `GET /api/home?code=`. **열쇠는 주소에 넣지 않는다** (요청 기록에 남는다). 3) 문서의 끝점도 이 꼴로 적는다.
- `del` 이 없는 저장소가 오면 `deleteHome` 은 빈 묘비 `{ gone: 1 }` 를 덮어쓰고 `getVisit` 은 그것을 404 로 본다.
- 스냅샷이 읽는 자리 (본 게임 저장의 실제 꼴 — `js/app.js` 에서 `function defaults` · `function userState` · `room.layout` 을 grep 으로 찾아 그 둘레만 읽는다. 시험의 가짜 저장은 이 꼴 그대로):
  `player` ← `S.settings.player` (모습 범주들, 값은 id) · `dyed` ← `S.user.dyed` (`{ outfit | shoes | acc: { 물건 id: '#hex' } }`) · `layout` ← `S.room.layout` (`{ id: [x, z, 도, 배율] }`) ·
  `garden` ← `S.user.garden` (6칸, 칸 = null 또는 `{ color, water }` — `wateredDay` 는 담지 않는다) · `lantern` ← `S.room.lantern` (0~8) · `souvenirs` ← `S.room.souvenirs` 의 id ·
  `shown` ← `S.user.shown` 의 키 · `furn` ← `S.user.placed` · `skin` ← `S.user.skin` (COMMON 5절).
  담지 않는 것에 이름으로 더한다: `S.user.days` · `S.octopus.days` · `S.settings.lastSeen` (들어온 날 · 시각) · `S.octopus.name`.
- `VISIT.snapshot` 은 **어떤 저장에서도 `validate` 를 통과하는 것** 을 돌려준다 — 넘치면 snapshot 이 덜어 낸다 (`furn` 은 앞에서 60개 · `shown` 24개 · `dyed` 는 지금 입은 것 먼저). 상한 수치는 상수로 두고 문서 표에 적는다.
  시험: 큰 가짜 저장 (가구 200개 · 전시 100개) 에서도 snapshot → validate 통과 · 4KB 이하.
- `VISIT.learn`: 이미 아는 설계도면 `{ ok: true, known: true }` 이고 바꾸지 않는다 — 단 `from` 이 `'box'` 였으면 `'friend'` 로 고친다 (그때부터 재료 1배). `user.plans` 에 적는 일은 `VISIT.learn` 이 하고 리드는 이것만 부른다.
- **이 갈래는 화면 시험 · 스크린샷을 만들지 않는다** (COMMON 7절의 화면 시험은 건너뛴다 — `next/visit.html` 은 열어서 콘솔 오류가 없는지만). 독립 점검은 폰 화면 대신 `api/_lib/home.js` · `js/next/visit.js` · 시험을 주고 남용 길 · 새어 나가는 칸을 찾게 한다.
- 리드가 이을 것에 더한다: 함수의 `includeFiles` 에 `js/next/visit.js` · `tools/test-export.js` 의 INCLUDE 표 한 줄 · `mcp/store.js` 의 Blob 어댑터에 `del`.
