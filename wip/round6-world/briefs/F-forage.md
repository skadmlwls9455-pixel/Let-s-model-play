# 갈래 F — 줍기 · 가방 · 계절 달력 · 만들기 규칙 (가지 `lane/6-forage` · 상한 40달러)

먼저 `wip/round6-world/briefs/COMMON.md` (5절의 `user` 칸과 가구 id 22개). 그다음 참고로: `js/app.js` 의 텃밭 (`grep -n "gardenAct\|DYES\|weatherFor\|weekPick"`) —
날짜 시드로 정하고 사실만 알리는 본보기, `js/salon.js` (DOM 없는 규칙 파일 + node 시험의 본보기) · `tools/test-salon.js`,
`js/world.js` 의 souvenirs (겹치면 안 되는 이름 16개), `tools/make-souvenirs32.js` (그림 만드는 도구의 본보기).

## 주인 말 (11-18)

"매일 조금씩 바뀌는 줍기 … 계절 아이템은 놓친 건 친구가 가지고 있는 집 놀러가면 설계도 받아서 재료 모아서 만드는 식 …
계절이면 몇 개월 단위니까 오히려 재밌는 유인. 축제 같은 기간도 있고. 이벤트를 좀 넣어보는 거야 계절마다."

## 무엇을 만드나 — 화면 없는 규칙 셋 + 작은 시험용 쪽

### 1) 줍기 `FORAGE` (`js/next/forage.js`)

- 물건 24개 안팎 (id 는 `f_…` — 도토리는 `f_acorn` 고정, COMMON 5절). 구역 (`yard` · `path` · `village` · `beach`) · 계절 · 날씨에 따라 나오는 표. 흔한 것만 — **드문 것 · 그날만 나오는 것 없음.**
  예: 마당 도토리 · 잔가지 · 토끼풀 · 들꽃 / 길 밤송이 · 버섯 (비 온 다음 날) · 산딸기 (여름) / 해변 유목 · 바다 유리 · 소라 껍데기 · 미역 줄기 · 밧줄 토막.
  이름에 '조개' 금지, 문어 기념품 16종과 같은 이름 금지 (COMMON 4절 11).
- `FORAGE.today(user, day, zone, { season, weather, yesterdayWeather })` → 그날 그 구역에 놓인 자리 목록 `[{ spot: 'beach3', item }]` (`user` 는 읽기만).
  구역마다 하루 3~5개 (시드), 자리 id 는 구역마다 8개쯤 고정 (`yard0…`) — 실제 좌표는 리드가 장면에서 정한다.
- `FORAGE.pick(user, day, spot, ctx)` → 그 자리를 오늘 처음이면 `user.mats[item]++` · `user.finds[item]` (처음 날) · `user.pick` 갱신 → `{ ok, item, first }`.
  어제 안 주운 것은 오늘도 그 자리에 남아 있다 (하루 치까지만 이월 — 상수 `CARRY_DAYS = 1`, 그보다 오래된 것은 조용히 없어지고 놓쳤다는 표시는 없다).
  → `FORAGE.today` 가 오늘 것 + 어제 남은 것을 같이 돌려준다 (`user.pick` 과 `user.pickPrev` 둘을 본다).
  정확한 꼴: `FORAGE.today(user, day, zone, ctx)` → `[{ spot, item, from: 'today' | 'prev' }]` (읽기만). 적는 일은 `FORAGE.visit(user, day, zone, ctx)` 하나가 한다 (리드가 그 구역에 들어설 때 부른다):
  `user.pick = { day, list: { 구역: { 자리 id: 물건 id } }, got: { 자리 id: 1 } }` — 그 구역의 오늘 목록을 처음 낼 때 `list` 에 적는다.
  날이 바뀐 뒤 처음 부르면 먼저 넘긴다: `user.pick.day` 가 **바로 어제** 면 `list` 에서 `got` 에 없는 것을 `user.pickPrev = { day: 어제, left: { 자리 id: 물건 id } }` 로 옮기고 (구역마다 3개까지), 아니면 `pickPrev` 를 비운다 —
  **본 적 없는 날의 것은 이월하지 않는다.** 오늘 목록은 `pickPrev` 가 차지한 자리를 피해 놓는다. 시험의 '구역마다 3~5개' 는 `from` 이 `'today'` 인 것만 센다.
- 주운 것은 전부 가진다 (개수 상한은 물건마다 99).

### 2) 계절 달력 `SEASON` (같은 파일이나 `js/next/season.js`)

- `SEASON.of(day)` → 계절. `SEASON.festival(day)` → `null` 또는 `{ id, name, from, to }` — 계절마다 축제 하나 (기간 3주쯤):
  봄 꽃길 잔치 (4월 둘째~넷째 주) · 여름 바다 잔치 (7월 말~8월 중순) · 가을 거둠 잔치 (10월) · 겨울 등불 잔치 (12월 중순~1월 초).
  날짜 표는 상수로 (주인이 고친다). 축제는 **연출 · 꾸밈의 때** 이지 숙제가 아니다: 남은 날 표시 · 출석 보상 · 축제 한정 화폐 없음.
  축제가 돌려주는 것: `{ id, name, from, to, zone: 'village', props: [그 계절 꾸밈 id 2개 — 리드가 마을에 세운다], line: 집 목소리 사실 한 줄 }`.
  축제 동안 `FORAGE.today(day, 'village', …)` 에 그 계절 물건 자리가 **하나 더** 놓인다. 같은 물건이 축제 밖의 날에도 나오므로 축제에만 얻는 것은 없다.
- 계절 꾸밈 8개 (COMMON 의 계절 id) 는 **제철에는 설계도가 그냥 주어진다** (`SEASON.grant(user, day)` → 제철 설계도 2장을 `user.plans` 에 `from: 'season'`).
  `grant` · `learn` 은 이미 아는 설계도의 날짜를 덮지 않는다. 다만 제철의 `grant` 는 `from` 을 `'season'` 으로 바꾼다 (서랍에서 꺼냈던 것도 그때부터 1배).

### 3) 만들기 `CRAFT` (`js/next/craft.js`)

- 가구 22개마다 만드는 법: 재료 (줍기 물건 · 텃밭 염료 `user.dyes` 는 읽기만 · 조개는 보조로 소액) 2~4가지. 실내 · 마당 14개의 설계도는 처음부터 안다.
  **계절 꾸밈 8개의 재료는 네 계절 모두 주울 수 있는 물건만** 쓴다 (그 철에만 나오는 물건을 재료로 쓰면 설계도를 받아도 철이 아닐 땐 못 만들어 따라잡는 길이 막힌다).
- `CRAFT.recipe(id)` · `CRAFT.can(user, id)` → `{ ok, missing: [{ id, need, have }], shells }` · `CRAFT.make(user, id, day)` → 재료를 빼고 `user.furn[id]++` · `user.made[id]`.
  조개 값은 `{ shells: n }` 로 돌려주기만 한다 (빼기는 리드 훅).
- **철이 지난 계절 꾸밈을 얻는 길** (놓쳐도 영영 못 얻는 것은 없다):
  (가) 그것을 가진 친구 집에서 설계도 받기 — `CRAFT.learn(user, id, 'friend', day)`.
  (나) 혼자서도: 지난 철 서랍 — 끝난 계절의 설계도가 전부 이름으로 보이고, **주마다 한 장을 골라** 꺼낸다 (`CRAFT.drawer(user, day)` · `CRAFT.take(user, id, day)`, `from: 'box'`).
      주 = 월요일 시작 (`js/app.js` 의 `weekKeyOf` 와 같게). 무작위도 기한도 없다. 대신 제철보다 품이 든다:
      **서랍에서 꺼낸 설계도 (`from: 'box'`) 로 만들 때만 재료 2배** (상수 `BOX_COST = 2`). 제철에 받은 것 · 친구에게 받은 것은 언제 만들어도 1배다
      (제철에 받아 두고 철이 지난 뒤 만드는 사람이 손해 보면 '쉬면 잃는 것' 이 된다). 상수 `SOLO_DRAWER = true` (주인이 끌 수 있게).
      서랍 화면은 제목 '지난 철 서랍' 과 이름 · 재료뿐이다 — 놓쳤다는 글 · 지난 날짜를 두지 않는다. 꺼내기는 되돌릴 수 없으니 확인 한 번 (`꺼낼래` / `그만`).
  (다) 다음 해 제철에는 다시 그냥 주어진다.
  어느 길에도 확률 상자 · 남은 시간 · '곧 사라져' 가 없다.

## 파일

`js/next/forage.js` · `js/next/season.js` · `js/next/craft.js` · `css/next/forage.css` · `next/forage.html` · `assets/next/forage/` (물건 32px) ·
`tools/next/make-forage-art.js` · `tools/next/test-forage.js` · `tools/next/test-forage-live.js` · `docs/next/forage.md`

## 시험용 쪽 `next/forage.html`

날짜 · 계절 · 날씨를 고르는 개발용 줄 (이 쪽만의 것) + 구역별 오늘 놓인 것 + 줍기 단추 + 가방 + 만들기 목록 (모자란 재료가 그림 + 수로).
그림: 물건마다 32px PNG 한 장 (`tools/next/make-forage-art.js` 로 찍는다 — 가구 그림은 그리지 않는다, 만들기 목록은 가구를 이름으로 보인다). `FORAGE.CATALOG` (`{ id, name, icon, hint }`) · `CRAFT.CATALOG` 를 내놓는다.

## 끝난 것으로 보는 조건

- node 시험 (`tools/next/test-forage.js`): 같은 날 · 같은 구역 = 같은 목록 · 날이 다르면 달라짐 (30일 중 대부분) · 구역마다 3~5개 ·
  같은 자리를 두 번 주워도 한 번만 · 날이 바뀌면 `user.pick` 이 새로 · 물건 이름에 '조개' 0건 · 기념품 16종과 겹치는 이름 0건 ·
  22개 전부 만드는 법이 있고 재료가 전부 있는 id · `make` 가 재료가 모자라면 아무것도 안 바꿈 · 철 지난 계절 꾸밈을 서랍에서 주에 한 장만 꺼낼 수 있고 8개 전부 꺼낼 수 있음 ·
  서랍에서 꺼낸 것만 재료 2배 (제철 · 친구 것은 철이 지나도 1배) · 어느 계절에도 계절 꾸밈 8개의 재료를 그 계절 줍기 표로 모을 수 있음 ·
  축제 날짜 표가 계절과 맞음 · 축제 날 마을 목록이 평소보다 한 자리 많음 · 그 물건이 축제 밖 날에도 나옴 · `Math.random` 0건.
- 화면 시험 (`tools/next/test-forage-live.js`): 만들기 단추를 한 번 눌러서는 `user.mats` · `user.furn` 이 그대로이고 확인 (`만들래` / `그만`) 뒤에만 바뀜 · 서랍에서 꺼내기도 확인 뒤에만.
- 화면 (시험용 쪽): 360×740 에서 가로 스크롤 없음, 글 대신 그림 + 수, 스크린샷 ≤ 6.

## 리드가 이을 것

장면의 줍기 자리 좌표 · 줍기 단추 · 가방을 살림 시트에 · 만들기 창 · 축제 연출 · `S.user` 넘기기와 저장.

## 덧붙임 — 독립 점검에서 나온 것 (위 글과 어긋나면 이 절이 이긴다)

- 서랍 (`CRAFT.drawer`) 에는 **지금 계절이 아닌 계절 꾸밈 6개 가운데 아직 모르는 것** 이 이름으로 보인다. `CRAFT.take` 는 `user.plans` 에 `from: 'box'` 이고 `at` 이 이번 주 (월요일 시작) 인 것이 있으면 거절한다 — 새 칸을 만들지 않는다 (`user.week` 는 본 게임의 주간 할 일이다).
- 염료 (`user.dyes`) 는 재료로 쓰지 않는다 (읽기만인 칸이라 뺄 수 없다).
- 값을 치르는 함수는 `{ ok, cost }` 로 돌려준다 (칸 이름 `shells` 아님). `CRAFT.make` 는 `user.shells < cost` 여도, 재료가 모자라도 아무것도 바꾸지 않는다.
- `FORAGE.CATALOG` 의 `hint` = 구역 · 계절 한 조각 (예 '해변 · 여름'). 날씨 · 시각 · 확률은 넣지 않는다.
- 리드가 이을 것에 더한다: `SEASON.grant` 를 날이 바뀔 때 한 번 부르기 · 바깥 날씨 (다락 창밖 날씨와 따로) 넘기기.
