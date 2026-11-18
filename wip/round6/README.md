# 6차 — 세계 넓히기 (2026-11-18 시작)

주인 말 (11-18): "크기가 너무 작은 느낌, 맵이 좁아서 답답 … 문어 집만 띨롱 있으니까 심심 … 마을에서 이것저것 할 수 있으면 좋겠어.
축제 같은 기간도 있고 … 맵들 돌아다니면서 문어랑 사진 찍기는 꼭."

## 1. 누가 무엇을 하나

| 누구 | 가지 | 맡은 것 | 건드리는 파일 |
|---|---|---|---|
| 리드 세션 | `claude/serene-cannon-awp5y2` | 3D 맵 넓히기 (마당 → 길 → 마을 → 해변) · 따라오는 카메라 · 플레이 불편 고치기 · 갈래 합쳐 본 게임에 잇기 | 기존 파일 전부 (`js/scene3d.js` · `js/app.js` · `index.html` · `css/style.css` · `tools/smoke.js` …) |
| 다른 세션 (사용량 조금 남은 쪽) | `claude/game-launch-completion-hwvre5` | 지금 화면의 작은 다듬기만. `js/scene3d.js` 의 장소 · 카메라 · 마당 · 계단, `js/app.js` 의 재봉틀 · 염료 쪽은 리드가 고치는 중이라 피한다 | 달리기 · 부엌 쪽, 문서 |
| **크레딧 갈래 7개** (Console 선불 300달러) | `lane/6-<이름>` | 새 모듈 — 헤엄 · 도감 · 줍기와 만들기 · 손님 · 사진 · 집 방문 · 가구 표 | **새 파일만** (`js/next/` · `css/next/` · `next/` · `assets/next/` · `tools/next/` · `docs/next/`) |

크레딧 갈래는 기존 파일을 한 글자도 고치지 않는다 → 갈래끼리도, 리드와도 병합 충돌이 없다. 본 게임에 잇는 일은 리드가 한다.

## 2. 크레딧 갈래 (합 275달러 + 예비 25달러)

| 갈래 | 지시문 | 무엇이 나오나 | 상한 |
|---|---|---|---|
| S 헤엄 | `briefs/S-swim.md` | 바다에 들어가 헤엄치며 조개 먹는 한 판 (시계 없이 정해진 길이 · 못해도 최소 지급) + 바다에서 본 것 목록 | 55 |
| B 도감 | `briefs/B-book.md` | 도감 책: 음식 · 주운 것 · 바다 · 손님 · 기념품 탭 + 전시 (박물관의 첫 조각) | 40 |
| F 줍기 | `briefs/F-forage.md` | 매일 조금 바뀌는 줍기 · 가방 · 계절 달력과 축제 날짜 · 설계도와 만들기 규칙 (철 지난 것 따라잡는 길 포함) | 40 |
| G 손님 | `briefs/G-guests.md` | 놓아둔 것 · 날씨 · 시간에 따라 오는 동물 손님 12종의 규칙과 그림 | 35 |
| P 사진 | `briefs/P-photo.md` | 사진 모드 화면 · 틀 · 저장과 공유 · 사진첩 · 조개로 사는 모션 가게 (문어와 함께 찍기 포함) | 40 |
| H 집 방문 | `briefs/H-home.md` | 친구 집 스냅샷 규격 · 검증 · 서버 로직과 시험 (실시간 아님) | 30 |
| D 가구 표 | `briefs/D-decor.md` | 가구 22개 (실내 8 · 마당 6 · 계절 8) 의 모양 표 · 벽지와 바닥 프리셋 · 미리보기 쪽 | 35 |

- 추천 차례: **S · B · F · G 를 먼저** (주인이 직접 말한 것들), 그다음 P · D · H. 동시에 2~3개를 돌려도 된다 (서로 다른 폴더).
- 상한은 "넘기 전에 끊는" 장치다. 실제로 얼마 드는지는 첫 갈래 하나의 결과 (`total_cost_usd`) 를 보고 나머지 상한을 고쳐도 된다.
- 예비 25달러: 상한에 걸려 끊긴 갈래를 이어 하는 데 쓴다 (아래 '끊겼을 때').

## 3. 시작하는 법 (주인 컴퓨터 터미널 — Console 크레딧은 웹 세션이 아니라 API 키로 쓴다)

준비 한 번:

```bash
npm i -g @anthropic-ai/claude-code
```

```bash
export ANTHROPIC_API_KEY=여기에_콘솔_키
```

갈래 하나 시작 (헤엄 예 — 저장소 폴더에서):

```bash
git fetch origin
```

```bash
git worktree add ../ppol-swim -b lane/6-swim origin/claude/serene-cannon-awp5y2
```

```bash
cd ../ppol-swim && npm ci --no-audit --no-fund
```

```bash
CLAUDE_CODE_PROMPT_CACHE_TTL=1h claude -p "wip/round6/briefs/COMMON.md 와 wip/round6/briefs/S-swim.md 를 읽고 그 갈래를 끝까지 해." --model claude-opus-5-5 --effort high --max-budget-usd 55 --permission-mode auto --permission-prompts none --output-format json > ../ppol-swim.json
```

다른 갈래는 이름 · 지시문 · 상한만 바꾼다:

| 갈래 | 폴더 · 가지 | 지시문 파일 | `--max-budget-usd` |
|---|---|---|---|
| S | `../ppol-swim` · `lane/6-swim` | `S-swim.md` | 55 |
| B | `../ppol-book` · `lane/6-book` | `B-book.md` | 40 |
| F | `../ppol-forage` · `lane/6-forage` | `F-forage.md` | 40 |
| G | `../ppol-guests` · `lane/6-guests` | `G-guests.md` | 35 |
| P | `../ppol-photo` · `lane/6-photo` | `P-photo.md` | 40 |
| H | `../ppol-home` · `lane/6-home` | `H-home.md` | 30 |
| D | `../ppol-decor` · `lane/6-decor` | `D-decor.md` | 35 |

끝나면 (갈래 폴더에서):

```bash
node -e "var r=require('../ppol-swim.json'); console.log(r.total_cost_usd, r.subtype || r.is_error)"
```

```bash
git push -u origin lane/6-swim
```

(세션이 스스로 push 했으면 둘째 줄은 '이미 최신' 이라고 나온다.)

끊겼을 때 (상한에 닿음 · 창을 닫음) — 같은 폴더에서 이어 하기:

```bash
CLAUDE_CODE_PROMPT_CACHE_TTL=1h claude -p "이어서 해. wip/round6/notes 의 네 메모와 git status 를 먼저 봐." --continue --model claude-opus-5-5 --effort high --max-budget-usd 12 --permission-mode auto --permission-prompts none --output-format json > ../ppol-swim-2.json
```

참고:
- 화면 시험에 Playwright 가 필요하다. 없으면 세션이 `npm i --no-save playwright && npx playwright install chromium` 를 한 번 돌린다 (지시문에 적혀 있다).
- PowerShell 이면 환경 변수는 `$env:ANTHROPIC_API_KEY="…"` · `$env:CLAUDE_CODE_PROMPT_CACHE_TTL="1h"` 로 먼저 정하고 `claude -p …` 줄만 돌린다.
- `--max-budget-usd` 는 `-p` (창 없는 실행) 에서만 듣는다. 살짝 넘겨 끊길 수 있어 상한 합을 275 로 잡았다.
- 전체 지출은 Console 의 Cost 화면이 정확하다. 워크스페이스에 지출 한도를 걸어 두면 이중 안전장치가 된다.

## 4. 리드가 하는 것 (차례)

1. 플레이 불편 고치기 (주인 11-18): 위층 마네킹에 흰 원피스 · 다락 계단을 마당 문에서 떼기 · 염료는 확인하고 사서 물들일 것을 나중에 고르기 (옷 · 신발 · 머리 장식) ·
   새 주제인데 예전 포스터로 나오는 버그 · 마당 현관 계단을 실제로 오르내려야 집에 들어가게.
2. 끊김 줄이기: 문을 지나도 스틱이 안 끊기게 · 마당에서 캐릭터를 가운데로 따라오는 카메라.
3. 바깥 넓히기: 마당을 화면 끝까지 채운 땅으로 → 길 → 문어 마을 → 해변 · 바다 (세로 화면 아래쪽으로 이어진다).
4. 갈래가 들어오는 대로 본 게임에 잇기 (헤엄은 해변 물가, 손님은 마당 · 해변, 도감은 앨범 옆, 사진은 장면 위 단추).

## 5. 주인이 답하면 바뀌는 것 (지금은 기본값으로 시작해도 된다 — 전부 상수 한 줄)

| 물음 | 기본값 (갈래가 이대로 만든다) |
|---|---|
| 헤엄의 '시간 제한' | 화면에 시계 없이 정해진 길이의 물길 45초. (한 시간에 받을 수 있는 조개 상한을 뜻한 것이면 리드가 지급 쪽에 넣는다) |
| 헤엄 한 판 조개 | 못해도 4 · 많아야 10 |
| 도감에 전체 수와 `?` 칸 | 내 것 (음식 · 줍기 · 바다 · 손님) 은 보인다 · 문어 기념품은 가진 것만 |
| 손님 | 말 없이 몸짓 + 사실 한 줄 · 조개를 주지 않음 · 문어와 무관 |
| 철 지난 계절 꾸밈 | 친구 집에서 설계도 받기 + 혼자서도 '지난 철 서랍' 에서 주에 한 장 (재료 2배) + 다음 해 제철 |
| 문어와 사진 | 사진 모드 안의 '사람이 시킨 포즈 놀이' — 문어가 찍힌 사진엔 작은 '포즈 놀이' 표시가 늘 들어감 |
| 멀티 | 먼저 비동기 (친구 집의 멈춘 사본 구경 · 설계도 받기). 이름 · 방명록 · 실시간은 그다음 |

## 6. 합치기

- 갈래가 push 하면 리드가 `lane/6-*` 를 자기 가지에 들인다 (자동 모드가 병합을 막으면 주인에게 "합쳐도 돼" 를 받는다 — HANDOFF §3).
- 새 파일뿐이라 충돌은 없다. 리드가 `js/next/…` 를 `index.html` 에 싣고 (`tools/export-site.js` 의 `js/next/` 줄에서 꺼내며) 장면 · 저장에 잇는다.
- 리드 가지는 다른 세션 가지 (`claude/game-launch-completion-hwvre5`) 를 그때그때 받아 온다.

## 7. 조사 요약 (11-18)

- **Vercel 에서 멀티**: 된다. 비동기 방문은 지금 구조 (함수 + Blob) 로 충분하다. 실시간도 Vercel Functions 가 2026-10 부터 WebSocket 을 직접 받지만,
  무료 요금제는 연결이 300초마다 끊기고 방 상태를 외부 Redis 에 둬야 하며 한 달 약 180시간이 한도다. 무료 요금제의 다른 한도: 함수 12개 (지금 9개),
  Blob 쓰기 월 2,000회, 요청 월 100만, 넘으면 30일 정지, 약관상 비상업 전용.
- **끊겨 보이는 까닭**: 장소 다섯이 저마다 허공에 뜬 작은 섬이고 한 번에 하나만 그린다 · 문을 지날 때마다 조작이 끊긴다 · 카메라가 캐릭터를 가장자리에서만 따라온다.
  세로 화면은 땅 깊이 약 26m 를 한 번에 보여 주므로, 집 (위) → 길 → 마을 → 해변 (아래) 로 내려가는 한 장의 바깥이 화면을 채운다.
- 자세한 조사 메모는 리드 세션에 있다 (필요하면 `docs/` 로 옮긴다).
