# 6차 — 세계 넓히기 (2026-11-18 시작)

주인 말 (11-18): "크기가 너무 작은 느낌, 맵이 좁아서 답답 … 문어 집만 띨롱 있으니까 심심 … 마을에서 이것저것 할 수 있으면 좋겠어.
축제 같은 기간도 있고 … 맵들 돌아다니면서 문어랑 사진 찍기는 꼭."

## 1. 누가 무엇을 하나

| 누구 | 가지 | 맡은 것 | 건드리는 파일 |
|---|---|---|---|
| 리드 세션 | `claude/serene-cannon-awp5y2` | 3D 맵 넓히기 (마당 → 길 → 마을 → 해변) · 따라오는 카메라 · 플레이 불편 고치기 · 갈래 합쳐 본 게임에 잇기 | 기존 파일 전부 (`js/scene3d.js` · `js/app.js` · `index.html` · `css/style.css` · `tools/smoke.js` …) |
| 다른 세션 | `claude/game-launch-completion-hwvre5` | 그쪽의 '6차' (주인 답 11-18, `docs/OWNER_DECISIONS.md`): 달리기 문어 다시 그림 · 로딩 문어 · 부엌 손맛 · **먹기** (놀이방 식탁 + 2인 소파 · 요리 3개 · 문어가 그때 고름 · 효과 그날 하루). 갈래별 세션 동시 | 달리기 · 부엌 · 로딩 · `js/scene3d.js` 의 놀이방 (buildPlayRoom · 앉기) · `js/app.js` 의 부엌 둘레 |
| **크레딧 갈래 7개** (Console 선불 300달러) | `lane/6-<이름>` | 새 모듈 — 헤엄 · 도감 · 줍기와 만들기 · 손님 · 사진 · 집 방문 · 가구 표 | **새 파일만** (`js/next/` · `css/next/` · `next/` · `assets/next/` · `tools/next/` · `docs/next/`) |

크레딧 갈래는 기존 파일을 한 글자도 고치지 않는다 → 갈래끼리도, 리드와도 병합 충돌이 없다. 본 게임에 잇는 일은 리드가 한다.

### 두 세션 사이의 약속 (주인이 다른 세션에 전해 줄 것 — 계정이 달라 서로 말을 못 건다)

- **이름이 겹친다.** 양쪽 다 '6차' 다. 이쪽이 `wip/round6/` 와 `lane/6-*` 를 이미 쓰고 있으니 (크레딧 갈래의 실행 명령이 이 경로를 쓴다), **그쪽은 다른 폴더 · 가지 이름** 을 쓴다 (예: `wip/round6-eat/` · `lane/eat-*`).
- **구역 (열쇠).** 리드: `js/scene3d.js` 의 다락 계단 · 마당 · 위층 마네킹 · 내 캐릭터 색 (물들이기) · 장소 · 카메라 · 바깥, `js/app.js` 의 재봉틀 창 · 모델 산책 받아 오기 (claudeSync), `js/poster-art.js`.
  다른 세션: 달리기 · 부엌 · 로딩 · 놀이방 (식탁 · 소파 · 앉기 · 먹기) · 문어가 고르는 자리 (brain · world · mcp).
  한 줄짜리 표 (`SPOT_KEYS` 등) 는 그 줄을 고치지 말고 바로 아래 새 줄로 덧붙인다 (이쪽은 `SPOT_KEYS.push('sewDoll')` 로 넣었다).
- **저장 칸.** 이쪽이 `S.user` 에 더한 것: `dyed` (물건별 색). 크레딧 갈래가 쓸 칸은 `briefs/COMMON.md` 5절 표. 그쪽 먹기의 칸 이름이 겹치지 않게 (`user.foods` 는 도감의 '처음 만든 날' 이다).
- **요리 · 식탁 · 소파는 그쪽이 만든다.** 이쪽 도감 (갈래 B) 은 부엌 수첩을 읽기만 하고, 가구 표 (갈래 D) 의 22개에는 놀이방 식탁 · 소파가 없다.
- **배포는 한 가지에서만** (`claude/game-launch-completion-hwvre5`). 이쪽의 고침은 작은 커밋으로 올려 두니, 그쪽 가지에 먼저 들이면 (주인 '넣어') 두 쪽이 같은 바탕에서 출발해 뒤 충돌이 준다.

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

- 추천 차례: **S · B · P 를 먼저** (P 는 주인이 '꼭' 이라고 한 것 — 5절의 '문어가 바깥에 있는 법' 답이 있으면 더 좋다), 그다음 F · G, 그다음 D · H.
  동시에 2~3개를 돌려도 된다 (서로 다른 폴더).
- 상한은 "넘기 전에 끊는" 장치다. 실제로 얼마 드는지는 첫 갈래 하나의 결과 (`total_cost_usd`) 를 보고 나머지 상한을 고쳐도 된다
  (어림: 30달러 ≈ 200~290턴 · 40달러 ≈ 260~370턴 · 55달러 ≈ 320~460턴. P · G · F 는 빠듯하고 화면이 없는 H 는 남을 수 있다 — 남으면 P · G 로 옮긴다).
- 예비 25달러: 상한에 걸려 끊긴 갈래를 이어 하는 데 쓴다 (아래 '끊겼을 때').

## 3. 시작하는 법 (주인 컴퓨터 터미널 — Console 크레딧은 웹 세션이 아니라 API 키로 쓴다)

준비 한 번:

```bash
npm i -g @anthropic-ai/claude-code
```

```bash
export ANTHROPIC_API_KEY=여기에_콘솔_키
```

(고르기) 갈래 커밋의 작성자 칸에는 이 컴퓨터의 git 이름 · 메일이 들어간다. 공개 저장소에 남기고 싶지 않으면 저장소 폴더에서 클라우드 세션들과 같은 값으로 맞춘다
(저장소 전체에 듣는다 — 되돌리려면 `git config --unset user.name` · `git config --unset user.email`):

```bash
git config user.name "Claude"
```

```bash
git config user.email "noreply@anthropic.com"
```

갈래 하나 시작 (헤엄 예 — 저장소 폴더에서):

```bash
git fetch origin
```

```bash
git worktree add --no-track ../ppol-swim -b lane/6-swim origin/claude/serene-cannon-awp5y2
```

```bash
cd ../ppol-swim && npm ci --no-audit --no-fund && npm i --no-save --no-audit --no-fund playwright@1.63.0 && npx playwright install chromium
```

(화면 시험에 쓰는 Playwright 를 **미리** 깐다 — 자동 모드의 세션은 스스로 고른 패키지 설치를 거절당할 수 있다. `package.json` 은 바뀌지 않는다.)

```bash
CLAUDE_CODE_PROMPT_CACHE_TTL=1h claude -p "wip/round6/briefs/COMMON.md 와 wip/round6/briefs/S-swim.md 를 읽고 그 갈래를 끝까지 해. Playwright 가 없으면 npm 공식 레지스트리의 playwright 패키지를 npm i --no-save playwright 로, 그 Chromium 을 npx playwright install chromium 으로 깔아도 된다." --model claude-opus-5-5 --effort high --autocompact 300k --strict-mcp-config --max-budget-usd 55 --permission-mode auto --permission-prompts none --output-format json > ../ppol-swim.json
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

끊겼을 때 (상한에 닿음 · 창을 닫음) — 같은 폴더에서 **새 세션으로** 이어 하기 (메모와 커밋을 보고 남은 것만 한다):

```bash
CLAUDE_CODE_PROMPT_CACHE_TTL=1h claude -p "wip/round6/briefs/COMMON.md 와 wip/round6/briefs/S-swim.md 를 읽고, wip/round6/notes 의 메모 · git log · git status 를 보고 남은 것만 끝내. Playwright 가 없으면 npm 공식 레지스트리의 playwright 패키지를 npm i --no-save playwright 로, 그 Chromium 을 npx playwright install chromium 으로 깔아도 된다." --model claude-opus-5-5 --effort high --autocompact 300k --strict-mcp-config --max-budget-usd 12 --permission-mode auto --permission-prompts none --output-format json > ../ppol-swim-2.json
```

참고:
- `--continue` 로 잇지 않는 까닭: 끊긴 대화 전체를 다시 보내 첫 요청부터 몇 달러가 나간다. 새 세션이 같은 돈으로 몇 배 더 일한다.
  (그래도 `--continue` 를 쓰면 그 실행의 `total_cost_usd` 는 앞 실행까지 합친 값이다 — 두 파일을 더하지 않는다.)
- `--autocompact 300k`: 문맥을 30만 토큰에서 요약한다 (기본은 약 100만 — 턴마다 문맥 전체 값을 다시 내서 길어질수록 비싸다).
- `--strict-mcp-config`: 저장소의 `.mcp.json` (문어 방 도구) 을 갈래 세션에 붙이지 않는다 — 갈래 일과 무관하고 돈이 샌다.
- `--no-track`: 갈래 가지가 리드 가지를 따라가지 않게 한다 (인자 없는 `git push` 가 리드 가지로 올라가는 사고를 막는다).
- PowerShell 이면 환경 변수는 `$env:ANTHROPIC_API_KEY="…"` · `$env:CLAUDE_CODE_PROMPT_CACHE_TTL="1h"` 로 먼저 정하고, `&&` 대신 한 줄씩 치고,
  결과는 `… --output-format json | Out-File -Encoding utf8 ../ppol-swim.json` 으로 받는다 (또는 Git Bash 에서 위 줄 그대로).
- 시작 전에 `git push --dry-run origin HEAD` 로 이 컴퓨터에서 GitHub 로그인이 되는지 한 번 본다 (세션은 push 가 거절되면 보고서에 적고 끝낸다).
- `--max-budget-usd` 는 `-p` (창 없는 실행) 에서만 듣는다. 살짝 넘겨 끊길 수 있어 상한 합을 275 로 잡았다.
- 전체 지출은 Console 의 Cost 화면이 정확하다. 워크스페이스에 지출 한도를 걸어 두면 이중 안전장치가 된다.

## 4. 리드가 하는 것 (차례)

1. 플레이 불편 고치기 (주인 11-18): 위층 마네킹에 흰 원피스 · 다락 계단을 마당 문에서 떼기 · 염료는 확인하고 사서 물들일 것을 나중에 고르기 (옷 · 신발 · 머리 장식) ·
   새 주제인데 예전 포스터로 나오는 버그 · 마당 현관 계단을 실제로 오르내려야 집에 들어가게.
2. 끊김 줄이기: 문을 지나도 스틱이 안 끊기게 · 마당에서 캐릭터를 가운데로 따라오는 카메라.
3. 바깥 넓히기: 마당을 화면 끝까지 채운 땅으로 → 길 → 문어 마을 → 해변 · 바다 (세로 화면 아래쪽으로 이어진다).
4. 갈래가 들어오는 대로 본 게임에 잇기 (헤엄은 해변 물가, 손님은 마당 · 해변, 도감은 앨범 옆, 사진은 장면 위 단추).
5. 계절 축제 연출: 갈래 F 의 `SEASON.festival` 이 주는 날짜 · 꾸밈 id 로 마을 광장에 그 계절 꾸밈을 세우고 집 목소리 한 줄 (기간 한정 보상 없음).

## 5. 돌리기 전에 이 표만 보고 답해 줘 — 답이 없으면 기본값으로 만든다

대부분 상수 한 줄로 바뀐다 (`SHOW_CLOCK` · `LEAVES` 는 자리만 있고 켜려면 더 만들어야 한다).

| 물음 | 기본값 (갈래가 이대로 만든다) |
|---|---|
| 헤엄의 '시간당 제한' 이 무슨 뜻이었나 | (가) **시계 없는 45초 물길, 판마다 조개** [기본] · (나) 한 시간에 조개가 나오는 판 수에 상한 (그 뒤는 놀기만 — 리드가 지급 쪽에 넣는다, 갈래는 그대로) · (다) 화면에 남은 시간이 보이는 판 ('압박 없음' 과 부딪혀 따로 정해야 한다) |
| 헤엄 한 판 조개 | 못해도 4 · 많아야 10 (달리기는 한 판 2 안팎이라 헤엄이 훨씬 후하다 — 줄일지) |
| '문어 마을' 에 누가 사나 | 우리 문어의 동네 — 건물 · 가게 · 광장 · 축제 자리만 있고 **다른 문어 (코드가 움직이는 이웃) 는 없다**. 이웃 문어를 두려면 '데모 규칙' 표기를 어떻게 할지부터 정해야 한다 |
| 문어가 바깥 (마당 · 마을 · 해변) 에 있는 법 | 문어가 **스스로 그 자리에 있을 때만** 함께 찍힌다 (지금은 다락 · 산책 무대). 다른 안: 사진 찍자고 초대하면 문어가 정한다 (산책 초대처럼 — 거절도 된다) |
| 모델이 붙은 방에서 함께 모션 | 사진 모드에 들어갈 때 한 번 '포즈 놀이 해도 돼?' 를 묻는다 (11-05 설계의 기본값 — 연결은 리드) |
| 친구 집에 그 집 문어가 보이나 | 안 보인다 (남의 문어를 코드가 움직이지 않는다) |
| 다락 (문어 방) 의 벽지 · 바닥도 사람이 바꾸나 | 사람 공간 (놀이방 · 위층 · 마당) 만. 다락은 그대로 |
| 11-08 의 '가구 조각은 문어가 산책에서 가져온다' · '놀이 점수 주간 순위' | 이번엔 안 한다 — 재료는 사람의 줍기에서 나오고 헤엄에 순위가 없다 |
| 도감에 전체 수와 `?` 칸 | 내 것 (음식 · 줍기 · 바다 · 손님) 은 보인다 · 문어 기념품은 가진 것만 |
| 손님 | 말 없이 몸짓 + 사실 한 줄 · 조개를 주지 않음 · 문어와 무관. 예: 마당에 물그릇 → 맑은 낮에 참새 · 연못 + 비 오는 저녁 → 개구리 · 눈사람 + 눈 오는 날 → 눈토끼 (드묾 — 놓아둔 지 14일 뒤엔 반드시) |
| 철 지난 계절 꾸밈 | 친구 집에서 설계도 받기 + 혼자서도 '지난 철 서랍' 에서 주에 한 장 (재료 2배) + 다음 해 제철 |
| 문어와 사진 | 사진 모드 안의 '사람이 시킨 포즈 놀이' — **함께 모션을 켜고 찍은 사진** 에는 작은 '포즈 놀이' 표시가 늘 들어가고, 켜 둔 동안 화면에도 '포즈 놀이 · 내가 고름' 이 보인다. 문어가 제 일을 하다 찍힌 사진에는 표시가 없다 |
| 멀티 | 먼저 비동기 (친구 집의 멈춘 사본 구경 · 설계도 받기). 이름 · 방명록 · 실시간은 그다음 |

## 6. 합치기

- 갈래가 push 하면 리드가 `lane/6-*` 를 자기 가지에 들인다 (자동 모드가 병합을 막으면 주인에게 "합쳐도 돼" 를 받는다 — HANDOFF §3).
- 새 파일뿐이라 충돌은 없다. **합칠 때 파일을 옮기지 않는다** — `js/next` · `css/next` · `assets/next` 자리 그대로 `index.html` 에 싣고 `tools/export-site.js` 의 LEAVE 에서 그 폴더 줄을 지운다
  (옮기면 갈래 시험의 require 경로 · 시험용 쪽의 주소 · 모듈 안의 그림 주소가 한꺼번에 깨진다).
- 리드 가지는 다른 세션 가지 (`claude/game-launch-completion-hwvre5`) 를 그때그때 받아 온다 (주인 '합쳐도 돼' 뒤에).

### 본 게임에 올리는 날 점검표 (리드)

1. `js/next/<이름>.js` · `css/next/<이름>.css` 를 자리 그대로 `index.html` 에 싣는다 → `tools/export-site.js` 의 LEAVE 에서 `js/next/` · `css/next/` · `assets/next/` 줄을 지우고 (아직 안 실은 모듈 파일이 있으면 '안 쓰는 파일' 검사에 걸린다 — 한꺼번에 싣거나 파일 단위로 남긴다) `tools/test-export.js` 를 맞춘다.
2. 글꼴: `tools/subset-fonts.py` 는 `js/*.js` · `css/*.css` · `index.html` 만 센다 — `js/next/*.js` 의 화면 글도 세게 그 스크립트를 고친 뒤 다시 만들고 `--check` 가 `stale: none` 인지 본다.
   바깥 날씨: 다락 창밖 날씨 (`weatherFor` — 등불 칸에 묶여 있다) 를 갈래에 넘기지 않는다. 등불과 무관한 날짜 시드의 바깥 날씨를 새로 만들어 넘긴다. 시간대는 `phaseOf` 그대로.
3. 저장: 새 `S.user` 칸을 `userState()` 의 기본값 · 두 탭 합치기 (`js/app.js` 의 저장 직전 합치는 곳 — `grep -n "storage\|merge"`) · 내보내기/가져오기 검증에 넣는다. 옛 저장이 그대로 열리는지 스모크.
4. 시험: `tools/next/test-*.js` 를 `package.json` 의 `test` 와 `.github/workflows/test.yml` 빠른 단계에 넣는다. 스모크 글자는 A~Z 가 다 찼다 — 새 시나리오는 두 글자 이름 (`CAM` 처럼).
5. 정직 표시: 문어가 나오는 새 화면마다 '데모' 꼬리표가 가려지지 않는지, 코드가 쓴 글에 문어의 감정 · 취향 말이 없는지 본다.
6. 다른 세션 가지와 겹치는 줄 (`SPOT_KEYS` · `ROOM_SPOT` · `userState`) 은 병합 뒤 스모크 Z · Y · X 로 확인.

## 7. 조사 요약 (11-18)

- **Vercel 에서 멀티**: 된다. 비동기 방문은 지금 구조 (함수 + Blob) 로 충분하다. 실시간도 Vercel Functions 가 2026-10 부터 WebSocket 을 직접 받지만,
  무료 요금제는 연결이 300초마다 끊기고 방 상태를 외부 Redis 에 둬야 하며 한 달 약 180시간이 한도다. 무료 요금제의 다른 한도: 함수 12개 (지금 9개),
  Blob 쓰기 월 2,000회, 요청 월 100만, 넘으면 30일 정지, 약관상 비상업 전용.
- **끊겨 보이는 까닭**: 장소 다섯이 저마다 허공에 뜬 작은 섬이고 한 번에 하나만 그린다 · 문을 지날 때마다 조작이 끊긴다 · 카메라가 캐릭터를 가장자리에서만 따라온다.
  세로 화면은 땅 깊이 약 26m 를 한 번에 보여 주므로, 집 (위) → 길 → 마을 → 해변 (아래) 로 내려가는 한 장의 바깥이 화면을 채운다.
- 자세한 조사 메모는 리드 세션에 있다 (필요하면 `docs/` 로 옮긴다).
