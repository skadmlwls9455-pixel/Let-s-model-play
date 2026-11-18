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
  `garden` (칸 색 · 물) · `lantern` · `souvenirs` (id 만) · `posters` (스티커 id 만, 최대 6) · `shown` (전시한 것 id) · `plans` (가진 계절 꾸밈 id — 설계도로 받아 갈 수 있는 것).
  아직 저장에 없는 칸은 건너뛴다 (리드가 차차 넣는다).
- **담지 않는 것**: 문어가 쓴 말 · 메모 · 포스터 글 · 산책 기록 · 위키 요약 · 조개 수 · 접속 시각 · 이름 · 방 열쇠 (`settings.claudeRoom`). 자유 글 0.
- `VISIT.validate(snap)` → 모양만 엄격히: 키 화이트리스트 · id 는 `/^[a-z0-9_]{1,24}$/` · 색은 `#rrggbb` · 숫자 범위 · 배열 길이 · 전체 4KB 이하. 어긋나면 **거절** (자르지 않는다).
- `VISIT.learn(user, snap, id, day)` → 스냅샷의 `plans` 에 있는 계절 꾸밈이면 `user.plans[id] = { at: day, from: 'friend' }` (하루 한 집에서 3장까지 — 상수).
- `VISIT.CODE_RE` · 코드는 헷갈리는 글자 (0 O 1 I L) 를 뺀 8자.

### 2) 서버 로직 `api/_lib/home.js` (CommonJS, 저장소 · 시계 · 비밀값은 주입)

```
createHome(store, { ip, origin, host })           → { ok, key, code }       key = 주인만 아는 열쇠 (192비트), code = HMAC 로 유도한 읽기 전용 8자
putSnapshot(store, key, snap, { now })            → { ok } | { ok: false, error }   검증 통과한 것만 homes/<code>/snap.json 에 통째로 (주인 하나만 쓰니 경합 없음)
deleteHome(store, key)                            → 공유 끄기 = 서버에서 삭제
getVisit(store, code)                             → { ok, snap } | 404
```

- 남용 막기: Origin 이 있으면 같은 호스트만 · IP 당 시간 5개 (메모리) · **집 하나가 스냅샷을 올리는 것은 하루 3번까지** (블롭 안 `{ day, n }`) —
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

- node 시험: 스냅샷에 금지 칸 (말 · 메모 · 열쇠 · 조개 · 이름) 이 없음 (깊이 훑어 낱말 검사) · 가짜 저장에 `javascript:` · 긴 글 · 모르는 키를 심어도 검증이 거절 ·
  4KB 넘으면 거절 · `createHome` 의 code 가 key 에서만 나오고 code 로 key 를 못 구함 · 하루 4번째 올리기 거절 · 삭제 뒤 방문 404 · 스위치 off 면 503 ·
  `learn` 이 스냅샷에 없는 id 는 거절 · 하루 3장 상한 · 모든 시험이 네트워크 없이 5초 안.
- `npm test` 그대로 초록 (기존 `tools/test-api.js` · `tools/test-export.js` 를 건드리지 않고).

## 리드가 이을 것

얇은 함수 파일 셋과 `vercel.json` · `tools/test-export.js` 의 주소 단언 · 설정의 '우리 집 코드' 줄 · 방문 모드 (장면 setter 로 남의 집 그리기, 저장 잠금) · 설계도 받기 단추.
