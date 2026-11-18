# 갈래 B — 도감 책 (가지 `lane/6-book` · 상한 40달러)

먼저 `wip/round6/briefs/COMMON.md`. 그다음 참고로: `js/app.js` 의 세트 도감 (`grep -n "LOOK_SETS\|renderSets"`) 과 옷장 시트 (`grep -n "look-sheet\|look-tile"`),
`css/style.css` 의 `.look-tile` · `.sew-sets` · `.week-list`, `js/cook.js` 의 수첩 (`grep -n "book\b\|drawDish"`) · `docs/COOK_PROTO.md` §6,
`js/world.js` 의 souvenirs (16종) · `assets/souvenirs32/`.

## 주인 말 (11-18)

"도감이랑 박물관 좋다. 의상 쪽 도감은 있긴 한데 음식 도감은 없어. 이것도 만들면 좋아 보이고."

## 무엇을 만드나

화면 가득 열리는 **도감 책** 하나. 갈래 탭으로 넘긴다.

| 탭 | 무엇 | 자료가 오는 곳 | 분모 · 빈 칸 |
|---|---|---|---|
| 음식 | 내가 만든 요리 | 부엌 수첩 줄 (`ppolppol_cook_v0.book` 을 **리드가 읽어 넘긴다** — 너는 넘겨받은 배열만 쓴다) → `user.foods` | `sources.recipes` 가 올 때만 보인다 (`n/N` + 못 만든 칸은 `?`) |
| 주운 것 | 줍기 | `user.finds` + 넘겨받은 `CATALOG` | 보인다 |
| 바다 | 헤엄에서 본 것 | `user.sea` + `CATALOG` | 보인다 |
| 손님 | 다녀간 손님 | `user.guests` + `CATALOG` | 보인다 |
| 기념품 | 문어가 산책에서 가져온 것 | 넘겨받은 `souvenirs: [{ id, name, icon, at, by }]` — `by` 는 리드가 넘기는 꼬리 글 (데모 규칙 · 모델 · 사람) | **안 보인다** — 가진 것만. 전체 수 · 빈 칸 · `?` 없음 (문어에게 "더 가져와" 가 되면 안 된다) |

- 타일: 그림 (32px 를 정수 배) + 이름. 누르면 아래에 사실 한두 줄: "11월 18일에 처음 주웠어 · 지금 3개" / "11월 18일에 처음 봤어 · 4번".
  **코드가 쓰는 글은 사실만** (날짜 · 횟수 · 어디서). 취향 · 감정 말 금지.
  기념품 타일의 줄: "11월 18일 산책에서 가져온 것 · 데모 규칙" 꼴 — 집 목소리로 쓰고 (문어 1인칭 아님) '주었다' · '선물' 같은 말을 쓰지 않는다. `by` 가 없으면 꼬리를 비운다.
  (도감은 화면을 덮어 상태 줄의 '데모' 꼬리표가 가려진다 — 그래서 누가 골랐는지를 줄마다 적는다.)
  시험용 쪽의 가짜 기념품 자료에서 `shell` 의 이름은 '조개껍데기' 로 쓴다 (`js/world.js` 에는 아직 '조개' 로 남아 있다 — 고치는 것은 리드).
- 못 찾은 칸 (기념품 탭 제외): 회색 `?` 타일 + 한 조각 힌트 ("해변 · 여름" 처럼 구역 · 계절만). 다 채워도 보상 · 축하 연출 없음.
  탭 머리의 `n/N` 은 세트 도감과 같은 작은 글씨. 주인이 뺄 수 있게 상수 `SHOW_TOTAL = true` · `SHOW_UNFOUND = true`.
- 새로 생긴 것 표시: 탭에 숫자 없는 작은 점 하나 (열면 사라짐). 재촉 문구 없음.
- **음식 탭**: 넘겨받은 수첩 줄을 음식 키로 묶는다 — **음식 키는 요리 id (`recipe`) 하나다.** 변주 (해초 종류 · 굽기 · 썰기) 는 칸을 가르지 않고
  타일의 사실 줄에만 쓴다 ("11월 18일에 처음 만들었어 · 4번 · 노릇노릇"). 해초 종류는 판 시드가 고르는 것이라 칸으로 두면 '나올 때까지 되풀이' 가 된다.
  (`js/cook.js` 를 읽고 수첩 줄의 실제 칸으로 정하되, 부엌은 다른 세션이 고치는 중이라 그 낱말 표를 베껴 넣지 않는다.) 접시 그림은 `opts.drawDish(row) → canvas` 가 오면 그것을, 없으면 네가 그린 16px 그림.
  `COOK.drawDish(recipe, look, seed, w, h)` 는 캔버스가 아니라 `{ w, h, d: Uint8ClampedArray }` 를 준다 → 어댑터 `BOOK.dishFrom(COOK)` → `function (row) → canvas` 를 네가 만든다 (`putImageData`).
  시험용 쪽은 `js/cook.js` · `js/cook-art.js` 를 읽기 전용으로 싣고 이 어댑터를 넘긴다.
  요리에 등급 · 별 · 점수 · 걸린 시간을 붙이지 않는다.
  **요리는 곧 셋이 된다** (다른 세션이 해초전에 둘을 더하는 중 — 주먹밥 · 과일 꼬치 같은 것, 이름은 아직 안 정해졌다). 그래서:
  요리 이름 · 수를 네 코드에 박지 않는다 — 수첩 줄의 요리 칸 (`recipe` 류) 이 모르는 값이어도 그 값으로 묶어 한 칸을 만들고 던지지 않는다.
  음식 탭의 분모 `N` 은 넘겨받은 `sources.recipes: [{ id, name }]` 의 길이다. 없으면 `n/N` 과 `?` 칸을 그리지 않고 만든 것만 보인다. 먹기 · 효과 · 문어가 먹었는지는 다루지 않는다 (그쪽 것).
- **박물관의 첫 조각**: '전시' 표시 — 주운 것 · 바다 것 타일에서 `전시하기` 를 누르면 `user.shown[id] = 날짜` (물건은 없어지지 않는다).
  전시한 것은 책 맨 앞 '내 진열장' 쪽에 받침대 그림과 함께 모인다. (3D 진열장 가구는 리드 · 갈래 D 몫.) 기념품은 전시 대상이 아니다.

## API (전역 `BOOK`, `js/next/book.js`)

```
BOOK.TABS                               ['food', 'find', 'sea', 'guest', 'souvenir']
BOOK.foodKey(cookRow) / BOOK.foodsFrom(cookRows)   수첩 줄 → 음식 키 · [{ key, name, first, n }]
BOOK.applyFoods(user, cookRows)         순수: user.foods[key] = 처음 날 (이미 있으면 그대로) → 새로 생긴 키들
BOOK.show(user, id, day) / BOOK.unshow(user, id)   순수: user.shown
BOOK.view(user, sources)                순수: 탭마다 그릴 자료 { tab, total, found, tiles: [{ id, name, icon, found, line, hint }] }
BOOK.open({ parent, user, sources, tab, drawDish, onChange, onClose })    창
   sources = { find: CATALOG, sea: CATALOG, guest: CATALOG, souvenirs: [...], cookRows: [...], recipes: [{ id, name }] }   (없는 것은 빈 탭 안내 한 줄)
   CATALOG 의 칸: { id, name, icon, hint } — 못 찾은 칸의 힌트는 그 `hint` 를 그대로 쓴다 (없으면 힌트 없이 `?` 만)
```

## 파일

`js/next/book.js` · `css/next/book.css` · `next/book.html` (가짜 자료로 다섯 탭이 다 보이는 시험용 쪽 + 빈 상태) ·
`assets/next/book/` (받침대 · `?` 타일 · 탭 그림) · `tools/next/make-book-art.js` · `tools/next/test-book.js` · `tools/next/test-book-live.js` · `docs/next/book.md`

## 끝난 것으로 보는 조건

- node 시험: `view` 가 기념품 탭에 `total` · 못 찾은 칸을 내지 않음 · `recipes` 없이는 음식 탭에도 `total` · `?` 를 내지 않음 · 모르는 요리 id 의 수첩 줄도 한 칸으로 묶임 ·
  기념품 줄에 `by` 가 그대로 붙고 '주었' · '선물' 낱말 0건 · 모르는 id 가 들어와도 던지지 않고 그대로 둠 · 음식 키가 같은 수첩 줄에서 늘 같음 ·
  `applyFoods` 가 이미 있는 날짜를 덮지 않음 · 코드가 만든 모든 문구에 감정 낱말 (좋아 · 싫어 · 기뻐 · 사랑 …) 0건.
- 화면: 360×740 · 320×568 · 412×915 에서 탭 다섯 · 타일 격자 · 사실 줄 · 빈 상태 · `?` 타일 · 진열장 쪽. 키보드로 탭 이동 (화살표) · 닫기.
- 스크린샷 ≤ 8: 탭마다 하나 + 빈 상태 + 진열장 + 320 폭.

## 리드가 이을 것

들어가는 단추 (앨범 옆) · `S.user` 넘기기 · 부엌 수첩 읽어 넘기기 · 다른 갈래의 `CATALOG` 넘기기 · 저장 호출 (`onChange`) · 두 탭 합치기 규칙에 새 칸 넣기.

## 덧붙임 — 독립 점검에서 나온 것 (위 글과 어긋나면 이 절이 이긴다)

- 힌트는 네가 짓지 않는다. `CATALOG` 항목의 `hint` 가 있으면 글자 그대로 보이고, 없으면 `?` 타일만.
- '새로 생긴 것' 점은 `user.bookSeen = { 탭: 마지막으로 열었을 때 찾은 수 }` 로 기억한다 (모듈의 localStorage 에 적지 않는다). `BOOK.view` 의 탭 자료에 `fresh: true | false`, 탭을 열면 `BOOK.seen(user, tab, n)` 이 적고 `onChange` 를 부른다.
- 전시는 24개까지 — 넘으면 `{ ok: false, full: true }` 이고 단추가 살짝 흔들린다. 시험: `show` 를 두 번 불러도 날짜를 덮지 않음 · 25번째 거절 · 탭을 열면 `fresh` 가 꺼짐.
- 시험용 쪽 가짜 자료의 물건 그림은 새로 그리지 않는다 — 기존 `assets/souvenirs32/*.png` 를 빌려 쓴다 (이름만 가짜로). 네가 그리는 것은 받침대 · `?` 타일 · 탭 그림뿐.
- `BOOK.open` 은 `opts.reduced` 도 받는다 (COMMON 6절).
