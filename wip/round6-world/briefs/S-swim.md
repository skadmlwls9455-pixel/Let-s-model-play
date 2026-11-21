# 갈래 S — 바다 헤엄 (가지 `lane/6-swim` · 상한 55달러)

먼저 `wip/round6-world/briefs/COMMON.md`. 그다음 참고로: `js/runner.js` (구조의 본보기 — 고정 틱 · 시드 · 입력 기록 · DOM 없는 simulate · 정수 배 캔버스 · 결과 판),
`css/runner.css`, `docs/MINIGAME.md`, `tools/test-runner.js` (시험의 본보기), `js/palettes.js`.

## 주인 말 (11-18)

"해변가 … 들어가서 수영하면서 조개 먹는 게임 … 시간당 제한 있는데 잘하든 못하든 일정 갯수는 주자."

'시간당 제한' 의 뜻은 주인에게 아직 묻지 못했다 (한 판의 길이인지 · 한 시간에 조개를 받는 판 수의 상한인지). 그래서 둘 다 되게 만든다:
한 판은 시계 없는 정해진 길이의 물길이고, **조개를 실제로 몇 개 주는지는 네가 정하지 않고 호출한 쪽 (리드 훅) 이 정한다** (아래 결과 판).

## 무엇을 만드나

해변 물가에서 들어가는 **한 판짜리 바다 헤엄**. 내 캐릭터가 물속을 헤엄치며 조개를 먹고, 판이 끝나면 먹은 만큼 조개 (돈) 를 받는다.

- **주체는 내 캐릭터** (문어가 아니다). 물안경을 쓴 작은 사람 그림을 코드로 그린다 (24×24 안팎).
  나중에 리드가 진짜 내 모습 그림을 넘길 수 있게 `opts.sprite` (캔버스) 가 오면 그것을 쓴다.
- **화면**: 세로 전체 화면 `<dialog>` + 캔버스 (기기 px 정수 배). 바다는 오른쪽으로 흐르는 가로 스크롤.
- **조작**: 화면 어디든 누르고 있으면 위로, 떼면 천천히 가라앉는다 (한 손가락 · 스페이스/위 화살표). 죽지 않는다 — 바위 · 해초에 닿으면 잠깐 빙글 돌고 계속 간다.
- **한 판의 길이**: 정해진 길이의 물길 (기본 `COURSE_TICKS = 2700` = 45초). **화면에 시계 · 남은 시간 · 줄어드는 막대를 두지 않는다.**
  끝은 물살이 해변으로 데려다주는 장면 ("뭍에 닿았어").
- **조개**: 시드로 놓인 줄을 따라 떠 있다. 닿으면 먹는다 (수가 HUD 에 조개 그림 + 숫자로).
- **못해도 주는 수**: 아무것도 누르지 않아도 지나가는 가운데 물살 줄에 조개가 깔려 있어 최소가 채워지고, 지급은 `clamp(먹은 수, PAY_MIN, PAY_MAX)`.
  기본 `PAY_MIN = 4` · `PAY_MAX = 10`. 중간에 닫으면 (`status: 'cut'`) 물길의 3분의 1 (`CUT_PAY_AFTER = COURSE_TICKS / 3`) 을 지난 뒤일 때만 최소를 준다
  (열자마자 닫기를 되풀이해 조개를 받는 길을 막는다 — 그 전에 닫으면 `out.shells = 0`, 탓하는 글 없음).
- **바다에서 본 것**: 물길에 배경 생물 10종쯤 (해파리 · 불가사리 · 거북 · 가오리 · 흰동가리 · 성게 · 해마 · 문어 아님! …) 이 시드로 지나간다.
  가까이 스치면 '봤다' 로 친다 → 결과의 `out.seen`. `SWIM.CATALOG` 로 목록 (`{ id: 's_…', name, icon, hint }`) 을 내놓는다. 해롭거나 무서운 연출 없음.
- **결과 판**: 그림 중심 — 큰 조개 그림 + `+n`, 이번에 처음 본 것 그림 줄 (있을 때만), 단추 `다시` · `닫기`. 점수 · 순위 · 기록 갱신 표시 없음.
  **`+n` 의 n 은 실제로 준 수다**: `onResult(r)` 이 수를 돌려주면 그 수 (리드 훅이 `APP.earnFromPlay` 로 실제 준 수 — `js/runner.js` 결과 판과 같은 방식), 돌려주지 않으면 `out.shells`.
  0 이면 조개 줄을 숨기고 나머지 (처음 본 것 · 단추) 만 그린다. '몇 분 뒤' · 남은 횟수 같은 글은 두지 않는다.
- 주인이 나중에 고를 수 있게 맨 위 상수로: `COURSE_TICKS` · `PAY_MIN` · `PAY_MAX` · `CUT_PAY_AFTER` · `SHOW_CLOCK = false` (true 는 만들지 않는다 — 자리만).

## API (전역 `SWIM`, `js/next/swim.js`)

```
SWIM.VERSION                      'swim-1'
SWIM.simulate(seed, inputs, o)    DOM 없이 한 판을 돈다 → { ticks, eaten, pay, seen: [id…], status }   (inputs = [{ t, a: 'd'|'u' }])
SWIM.open({ parent, seed, n, day, reduced, sprite, onResult, onClose })   창을 열고 판을 시작. seed 가 없으면 hashSeed('swim', day, n)
SWIM.close()
SWIM.apply(user, out, day)        순수 함수: user.sea[id] = { first, n } 갱신 → { firstSeen: [id…] }   (조개는 건드리지 않는다)
SWIM.CATALOG                      [{ id, name, icon, hint }]
onResult({ v: 1, id: 'swim_<n>_<day>', by: 'user', game: 'swim', status: 'done'|'cut', ms, out: { shells, eaten, seen } })
```

- 시뮬은 `js/runner.js` 처럼 60Hz 고정 틱 · 정수 상태 · mulberry32. 같은 seed + 같은 inputs → 같은 결과. 꾸밈 입자도 판 시드에서 가른 난수로.
- 창은 자기 DOM 을 `opts.parent` (없으면 `document.body`) 에 만든다. 탭이 숨으면 멈추고, 돌아오면 누를 때 다시 간다.
- 저장: 판 번호 `n` 은 호출하는 쪽이 준다. 시험용 쪽만 `ppolppol_next_swim` 에 `{ n }` 을 둔다.

## 파일

`js/next/swim.js` · `css/next/swim.css` · `next/swim.html` · `assets/next/swim/` (바다 것 그림 32px 한 벌 — 도감 · 결과 판의 `<img>` 용. 판 안 캔버스에 그리는 바다 것은 js 안의 픽셀 표로 직접 찍는다. 조개는 본 게임의 돈 그림 `assets/icons/souvenir/shell.png` 를 Image 로 읽어 그린다 — 못 읽으면 같은 크기의 네모 대체. 캔버스 픽셀을 읽는 시험은 하지 않는다, 스크린샷으로 본다) ·
`tools/next/make-swim-art.js` · `tools/next/test-swim.js` · `tools/next/test-swim-live.js` · `docs/next/swim.md`

## 끝난 것으로 보는 조건

- `node tools/next/test-swim.js`: 무작위 입력 200판이 두 번 돌려 같은 결과 · 입력 0 인 판의 지급 = `PAY_MIN` 이상 · 어떤 입력으로도 지급 ≤ `PAY_MAX` ·
  3분의 1 전에 닫은 판의 지급 0 · 그 뒤에 닫은 판은 `PAY_MIN` 이상 ·
  판이 `COURSE_TICKS` 에서 반드시 끝남 · 골든 값 3개 · `grep Math.random` 0건.
- 360×740 @2 · 320×568 @2 · 412×915 @2.625 에서: 가로 스크롤 없음, 글자 없는 판 (HUD 는 조개 그림 + 수뿐), 결과 판이 그림 배치, 시계 없음.
  `onResult` 가 3 을 돌려주면 결과 판이 `+3`, 0 을 돌려주면 조개 줄이 안 보임.
- 모션 줄이기: 화면 흔들림 · 입자 없음 (판은 그대로 된다). 키보드만으로 시작 · 조작 · 닫기.
- 스크린샷: 시작 · 헤엄 중 · 부딪힘 · 결과 (처음 본 것 있음 / 없음) · 모션 줄이기.

## 리드가 이을 것 (보고서에 더 정확히 적어 줘)

`index.html` script/link · `js/app.js` 의 `openSwim` (달리기 `openMachine` 꼴) · `APP.earnFromPlay` 에 swim 규칙 · 해변 물가 단추 · `user.sea` 도감 연결.

## 덧붙임 — 독립 점검에서 나온 것 (위 글과 어긋나면 이 절이 이긴다)

- `opts.sprite` = **정면 머리 그림** (정사각 캔버스 32×32 — 리드가 본 게임의 머리 초상으로 만든다). 네가 그린 몸 · 물안경은 그대로 두고 머리 자리에만 정수 배로 얹는다. 없거나 정사각이 아니면 네 그림을 쓴다.
- 판은 **첫 입력 뒤에** 시작한다. 시작 전에 닫으면 `onResult` 를 부르지 않는다 (지급 없음). 하루 · 시간 지급 상한은 리드 훅 몫이라고 `docs/next/swim.md` 에 적고, 모듈 안에 쿨다운 · 기다림을 만들지 않는다.
- 시험에 더한다: `SWIM.apply` 는 `first` 를 덮지 않고, 부를 때마다 본 것마다 `n` +1.
- `SWIM.CATALOG` 의 `hint` 는 빈 글 (바다 것은 헤엄치면 지나간다 — 조건이 없다).
