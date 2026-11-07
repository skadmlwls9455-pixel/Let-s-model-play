# 다른 Claude 에게 나눠 줄 일 (11-05 시작 · 11-07 고침)

건네는 법: **갈라질 커밋 한 줄 + 아래 '공통 규칙 (11-07)' + 카드 블록** 을 같이 붙여 넣는다. 갈라질 커밋은 주 세션이 건넬 때 적어 준다.
- 주 세션은 기준 브랜치 `ccr-38ad393e-15xr9t` 를 다시 쓰지 않는다 (force push 없음). WIP 스냅샷 위에도 정식 커밋은 보통 커밋으로 쌓인다. 그래서 어느 커밋에서 갈라져도 PR 에는 그 카드의 커밋만 나온다.
- 11-07 카드 검토 (`docs/CARD_REVIEW.md`, 브랜치 ccr-20b50c24-bjx2pi) 를 반영했다: PROTOCOL.md 는 주 세션만 고친다 · 카드마다 '멈춤' 줄 · 놀이 소리는 `window.AUDIO && AUDIO.on && AUDIO.on(이름, { act })` · 대사창은 DIALOGUE_UI §5.11 '얼린 표 (11-07)' 와 `js/dialogue-stub.js`.
- 11-05 판 공통 규칙은 쓰지 않는다 (잠금 목록이 낡았다). 옛 카드 1~6 을 줄 때도 11-07 공통 규칙을 붙인다.

## 지금 줄 차례 (11-07)

카드 앞에는 **공통 규칙 11-07 판**을 붙인다 (11-05 판은 잠금 목록이 낡았다). 날짜는 11-05 = 1일째로 센다 (11-11 = 7일째, 11-16 = 12일째).
**한 번에 3~4 세션까지만 돌린다.** PR 은 주 세션이 하나씩 다 합치기 때문이다. 입장·UI 아트 세션도 이 수에 든다. 한 세션이 draft PR 을 열면 다음 카드를 준다.
11-07 카드 검토 (docs/CARD_REVIEW.md) 를 반영한 차례다: 카드 9 는 1·2단계를 지금 준다 · 13 을 먼저, 14·15 는 스텁 위에서 바로 뒤 · 11·12 는 UI 아트·입장 세션에 같이.
**13·14·15 를 건네기 전에** 주 세션이 `js/dialogue-stub.js` · `tools/test-dialogue-stub.js` · DIALOGUE_UI §5.11 끝 '얼린 표 (11-07)' 를 기준 브랜치에 올린다 (11-07 지금 아직 없다. 13 의 검수가 스텁 테스트를 돌리고, 14·15 는 스텁만 싣는다).

| 차례 | 카드 | 왜 지금 · 무엇을 기다리나 | 어디서 |
|---|---|---|---|
| 1 | 9 MCP + 진짜 모델 | 1½단계 '진짜 한 바퀴'의 바탕이다. 1단계 (mcp/ 서버) · 2단계 (짝꿍 스킬) 는 게임 코드를 안 건드려서 **지금** 준다. 3단계는 물결 F 검증 커밋 ('6물결', WIP 스냅샷 아님) 뒤에 마친다 — 진짜 산책은 먼저 해도 되고, 기다리는 건 게임 재생 확인 (#d-json → APP.importEvents, 메모 잇기) 뿐이다. 그 커밋이 있으면 카드의 `<물결 F 해시>` 를 채우고, 아직이면 그대로 둔다 (카드가 grep 줄로 확인하고, 들어오면 주 세션이 PR 에 해시를 적어 준다). 건네기 전에 ROADMAP 100·177줄의 '위키·진짜 Claude 는 로컬에서만' 을 고친다. 1~3단계 마감은 11-11 쯤 | **로컬** 추천 (3단계 `claude mcp add` 가 가장 단순하다). 클라우드면 건네기 전에 그 환경의 허용 목록에 `ko.wikipedia.org`·`upload.wikimedia.org` 를 더한다 (기본 환경은 둘 다 프록시 403) |
| 2 | 13 대사창 프로토 | 1½ 의 `meet`·`chat` 이 대사창 v1·v1.1 위에 선다. 새 파일만. 위 스텁 셋이 오르면 **맨 먼저** 준다 | 클라우드 |
| 3 | 14 안내 시험대 | 처음 온 사람이 1½ 시험을 혼자 따라오게 한다. 새 파일만. 13 을 건넨 **바로 뒤** 에 준다 (13 이 끝나길 기다리지 않는다. 대사창은 스텁) | 클라우드 |
| 4 | 15 같이 가기 시험대 | 1단계 고리 (문 앞 고르기 · 다시 만나기). 14 와 같이 13 바로 뒤. 대사창은 주 세션 스텁 (`js/dialogue-stub.js`) 이고, 7·8·14 는 가짜로 대신한다 | 클라우드 |
| 지금 · 따로 | 11 입장 연출 | **UI 아트·입장 세션** (ccr-20b50c24-bjx2pi 를 쓰던 세션. 11·12 를 맡겠다고 했다) 에 12 와 같이 준다. 새 브랜치 ui/intro-slow 를 기준 브랜치 끝에서 만든다 (그 브랜치는 d0301f8 로 합쳤고, 뒤의 검토 커밋 34d736f 가 섞이니 그 위에서 잇지 않는다). 장면 열쇠가 컵 kit 차례라 scene3d.js 는 주지 않는다. 3D 쪽은 패치 파일로 받는다. 하루 한 번 연출 (A5-1) 은 이미 됐다. send-uiart-session.md 의 11·12 사본은 옛것이라 묶음 1 (g1.md) 의 두 블록을 보낸다 | 클라우드 (그 세션) |
| 지금 · 같은 세션 | 12 UI 움직임 | 1단계 (CSS·새 그림, ui/anim-frames) 는 지금 11 과 나란히 한다. 2단계 (js/ui-art.js) 는 물결 G 검증 커밋 ('7물결') 뒤 같은 PR 에 — 주 세션이 1단계 PR 에 해시를 적어 준다. '그 뒤 할 일' 은 맡는 파일 목록을 준 뒤 하나씩 새 PR 로 | UI 아트·입장 세션 |
| 5 | 8 헤엄 | 2단계 놀이 ('같이 가기' 쪽). 결정 1 이 (가) 로 정해져서 **지금** 준다 (기다릴 것 없다) | 클라우드 |
| 6 | 7 요리 | 2단계 놀이 ('집에서 기다리기' 쪽). 새 파일만. 앞 카드 하나가 PR 을 열면 준다 | 클라우드 |
| 7 | 16 종이 인형·지갑·가게 | 2단계 v0-a. 본 게임 잇기 v0-b 는 9일째쯤 | 클라우드 |
| 8 | 19 꾸미기 자리 표·저장 | 3단계 v0-b. node 로 도는 순수 함수다 | 클라우드 |
| 9 | 20 사진 껍데기·가구 규칙 | 3단계. 16 이 먼저 들어오면 지갑 거절 검사까지 돈다 | 클라우드 |
| 10 | 17 배지 장부·수첩 | **16 을 끝낸 같은 세션에** 준다 (지갑 `PLAYER` 를 같이 쓴다). '함께한 날' 배지는 막대·n/m·보상 줄 없이 그날 조용히 생긴다 (주인 결정 11-07, 카드에 들어 있다) | 클라우드 |
| 아무 때 | 18 옆방 프로토 | 급하지 않다 (본 게임 옆방은 사람 시험 뒤에 넣는다). 자리가 빌 때 준다 | 클라우드 |
| Blender 가 있으면 | 10 픽셀 소품 (모양 참고판) | 게임에 붙지 않는 참고 그림이라 급하지 않다 | **로컬** |
| 12일째쯤 (11-16) | 5 접근성·성능 점검 | 거의 다 된 게임으로 잰다. 건네기 전에 고칠 줄: localhost 는 개발 모드가 켜지니 `?dev=0` (2D 는 `?scene=2d&dev=0`) 로 플레이어 화면을 잰다 | 어디서나 (`python3 -m http.server`) |
| 나중 | 1 같이 낙서 · 2 지도 | 사람 시험 뒤. 1 을 줄 때 결과에 판 id · 다 그린 판 · 이름 붙임 표시를 더한다 (ACHIEVEMENTS §9.3) | 클라우드 |
| 끝남 · 안 줌 | 3 · 4 · 6 | 3 MCP 초안: 주지 않는다 (9 가 대신한다) · 4 자동 테스트: 합쳤다 (5f5f611) · 6 라이트 테마 대비: 합쳤다 (3a1a720). 남은 건 주인이 고르는 일뿐이다 (NIGHT_LOG 결정거리 4, `docs/research/light-contrast/proposal.md`) | — |

---

## 공통 규칙 (2026-11-07, 모든 카드 앞에 붙이기)

```text
[공통 규칙 · 2026-11-07] 카드 앞에 늘 같이 붙인다.
저장소: skadmlwls9455-pixel/Let-s-model-play · 기준 브랜치: ccr-38ad393e-15xr9t
  여기서 카드의 브랜치를 새로 만들고, 끝나면 이 브랜치를 대상으로 draft PR 을 연다. 합치기는 주 세션이 한다.
  기준 브랜치 끝에 'WIP … 검증 전' 커밋 (주 세션의 작업 중 스냅샷) 이 있을 수 있다. PR 을 열거나 고치기 전에 git fetch origin &&
  git rebase origin/ccr-38ad393e-15xr9t 하고 (이미 올렸으면 자기 브랜치에 git push --force-with-lease), PR 커밋 목록에 자기 커밋만 있는지 본다.
게임: "뽈뽈 문어" — AI 모델을 문어로 보여 주는 아늑한 픽셀아트 웹 게임 (ppolppol-octopus.vercel.app).
  바닐라 HTML/CSS/JS, 빌드 없음, 모듈 없음 (파일마다 전역 하나). file:// 과 정적 호스팅 둘 다에서 돌아야 한다.
지금 (11-07): 데모 패널·힌트 칸은 개발 모드 (?dev=1 · localhost · file:) 에서만. ?dev=0 = 플레이어 화면. 플레이어엔 힌트 칸이 없다 (결정 18).
  화면 이름 '영수증' → '일기' (코드는 receipt). 등불은 초대한 날마다 한 칸. 문어 이름 옆에 작은 '데모' 꼬리표가 늘 있다.
  주인 결정 1~6 은 모두 (가) 로 정해졌다. docs/OWNER_DECISIONS.md 의 5·6 '답 아직 없음' 은 옛 글이다. 가구 만들기·물들이기는 안 정했으니 만들지 않는다.
  주 세션 차례: 물결 F (커밋 이름 '6물결'. 모델 반응·말 그대로 · 호기심 메모가 다음 산책으로) → 물결 G ('7물결'. 가시 '외침' 말풍선 없앰
  · '방 보기' 집 아이콘 · 등불 칸 톡 설명 · 로그는 오늘만, 지난날은 앨범 '일기' 칸).
고칠 수 있는 것은 카드의 '맡는 파일' 과 새로 만드는 파일뿐이다. 이미 있는 다른 파일은 모두 읽기만 한다 (고칠 게 보이면 PR 설명에 적는다).
  특히 잠긴 것: js/app.js·brain.js·world.js·scene2d.js·scene3d.js·ui-art.js · index.html · css/style.css·ui-art.css · package.json · .github/ · README.md
  · tools/ 의 smoke·test-brain·check-world·test-model-voice·bundle·make-ui-art (.js) · tools/ui-art/ · assets/ui/ · assets/manifest.json · audio/ · dist/
  · tests/evidence/ · vendor/fonts/ · docs/ 설계 문서 전부 (docs/PROTOCOL.md 도 — 주 세션만 고친다. 카드 9 도 바꿀 것은 제안으로만 적는다)
  · 다른 세션 것 (js/intro.js·css/intro.css·js/clouds.js = 카드 11 · play.html·js/play.js·css/play.css·tools/test-play.js·docs/PLAY_PROTO.md = 컵 놀이 세션).
  새로 만들 수 있는 것: 시험대·시제품 페이지, 새 js/css, docs/<이름>_PROTO.md, tools/test-<이름>.js, 캡처 docs/shots/<카드 이름>/.
  본 게임에 잇는 몇 줄 (함수 이름·데이터 모양) 은 PR 설명에 적기만 한다. 넣는 건 주 세션이 열쇠 차례에 한다.
먼저 읽기: docs/VISION.md, docs/MODEL_VOICE.md, docs/CURIOSITY_NOTES.md, .claude/skills/cozy-web-game/SKILL.md 의 '중요' 네 가지.
지킬 선:
- 문어(모델)에 대해 속이지 않는다. 데모 규칙이 고른 것은 '데모 규칙'으로 보인다. 읽지 않은 것을 읽었다고 하지 않는다.
  기록마다 by: 'user' · 'demo-rules' · 'model' · 'playback' · 'fallback' (산책 메타 trip.by 는 demo · human · mcp · legacy — PROTOCOL §2 · DIALOGUE_UI §5.12).
- 문어의 선택을 몰래 끌지 않는다. 모델의 말을 덧붙이거나 빼거나 바꾸지 않는다 (길면 화면만 '…', 원문 보관). 선택 메뉴엔 늘 그만두기, 이유를 묻지 않는다.
- 산책은 조개 (게임 돈) 0, 문어는 일꾼이 아니다. 연속 기록·놓치면 아쉬운 것·뽑기·완성률 (%, N/M)·쉬면 잃는 것·점수판·랭킹·벌 없음.
- 결정하는 코드에 Math.random 금지 → 시드 PRNG (.claude/skills/cozy-web-game/scripts/prng.js).
- 폰 먼저: 360×740 세로, 터치, 누르는 곳 44px 이상, '동작 줄이기'면 멈춘 한 장. 그림은 js/palettes.js 의 Apollo 팔레트, 정수 배, 2px 격자. 브라우저 쪽에 외부 이미지·라이브러리를 받아 오지 않는다.
- 글꼴: js/*.js · css/*.css · index.html 의 비ASCII 글자는 주석까지 부분 글꼴 점검에 걸린다 → pip install fonttools brotli && python3 tools/subset-fonts.py --check
  stale 이면 글자를 바꾼다. 꼭 필요한 글자면 PR 설명에 적고, CI '글꼴 점검' 이 빨간 이유도 적는다 (부분 글꼴은 주 세션만 다시 만든다).
클라우드 샌드박스: Chromium + Playwright 가 있다 — require('playwright'). executablePath·channel 은 주지 않는다 (WebGL 캡처는 tools/intro-shots.js 처럼 args 만 준다).
  playwright install 은 하지 않는다. 게임은 python3 -m http.server 로 띄워 본다. 클라우드 기본 환경은 네트워크 허용 목록에
  ko.wikipedia.org·upload.wikimedia.org·ppolppol-octopus.vercel.app 이 없어서 프록시가 403 으로 막는다 (api.anthropic.com 은 닿는다). 꼭 필요하면 사람이
  건네기 전에 그 환경의 허용 목록에 더한다: 세션 제목 줄의 클라우드 환경 메뉴 → Edit → Network access → Allowed domains
  (Limited 단계 아래에 있다. 옛 앱은 Custom 아래. Allow package managers 는 켠 채로).
검수와 PR:
- npm test 초록 (check-world · test-brain · test-model-voice · test-runner · test-api) + 카드의 자기 테스트. PR 에서 CI '빠른 테스트'·'글꼴 점검' 초록.
- npm run test:slow·스모크·캡처 도구는 tests/evidence/ 를 다시 쓴다. 돌려도 되지만 커밋하지 않는다: git checkout -- tests/evidence,
  새로 생긴 파일도 git status 로 보고 빼 둔다.
- 커밋 메시지는 한국어로 짧고 평이하게. draft PR 설명: 한 일 · 돌린 테스트와 마지막 줄 · 캡처 경로 · 본 게임에 잇는 데 필요한 몇 줄.
- 카드의 '멈춤' 줄에 닿으면 draft PR 을 열고 멈춘다. 더 하고 싶은 것은 만들지 말고 PR 설명 '다음에' 에 적는다.
```

---

## 카드 7. 요리 머지 미니게임 — 문어가 산책 간 동안 요리하기 (2026-11-07 고침)

언제: **지금** (새 파일만) · 크기 **L**
**주 세션 쪽**: CORE_LOOP_V2 §5.1 금지 표의 '소리' 칸 ('`onEvent`만 낸다') 을 'AUDIO.on(이름, { act }) 한 줄' 로 고친다 (카드 7·8 이 그렇게 쓴다). 본 게임에 이을 때 onEvent 를 AUDIO 로 다시 잇지 않는다 — 소리가 두 번 난다.

```text
카드 7. 요리 머지 미니게임 — 문어가 산책 간 동안 요리하기 (11-05, 11-07 고침)
브랜치: game/cook-merge
맡는 파일 (이 카드만 고친다): cook.html, js/cook.js, css/cook.css, docs/COOK_PROTO.md, tools/test-cook.js, docs/shots/cook/
먼저 읽기: docs/CORE_LOOP_V2.md §3.3 (기다리기) · §3.4 ④ (식탁) · §5.1 '미니게임 끼우기 계약' · §5.2 S.table · §5.4 (움직임),
  docs/PLAYER_PROGRESSION.md §3.2·§3.4 (요리 조개는 본 게임이 정한다), docs/ACHIEVEMENTS.md §3.2 (요리 배지 9~13)
쓰임: 문어가 나가기로 하면 사람은 문 앞에서 [같이 가기] / [집에서 기다리기] 를 고른다. 이 게임은 '기다리기' 쪽 놀이다. 방 보기에서 언제든 할 수도 있다.
  그래서 중간에 멈췄다가 이어 할 수 있어야 한다 (문어가 돌아오면 냄비는 그대로 두고 식탁으로 갔다가, 나중에 이어 하기).
목표: 나이·실력을 덜 타고 천천히 즐기는 '모이면 합쳐지는' 놀이.
- 냄비에 바다 재료를 떨어뜨린다. 같은 재료끼리 닿으면 한 단계 위로 합쳐진다: 물방울 → 해초 → 미역 → 가리비 → 새우 → … 7~9단계.
  '조개'는 게임 돈 이름이라 재료로 쓰지 않는다 (결정 19). '새우' 단계는 꼭 둔다 (배지 10 '새우까지 왔다').
  둥근 물체 물리는 직접 짠 간단한 원 충돌로 (외부 라이브러리 없이, 200줄 안팎). 같은 시드·같은 입력이면 같은 결과.
- 실패 없음: 냄비가 가득 차면 '넘쳤다·게임 오버' 대신 "다 됐다!" — 그때까지 만든 재료로 요리가 완성된다.
  언제든 "이걸로 할래" 로 끝낸다. 시간 제한·점수판·랭킹 없음. 한 판 1~2분.
- 결과는 요리 한 접시: 가장 높이 만든 재료 + 섞인 재료로 이름과 그림이 정해진다 (시드로 결정적). 빈 냄비면 dish: null.
- 요리 수첩: 만든 요리가 날짜와 함께 남는다. 완성률(N/M)·빈 칸 실루엣 없음. 저장은 이 페이지 자기 키만 (예: ppolppol_cook_v0).
연결 지점 (CORE_LOOP_V2 §5.1 모양 그대로):
  var h = COOK.start(el, { seed, reduced, speed, scale, palette, resume, onEvent })
  h.pause() → state (JSON 그대로 저장 가능, 8KB 이하) · h.resume() · h.finish() → Promise<result> ("이걸로 할래" 또는 본 게임이 끝냄)
  h.cut() → Promise<result> (건너뛰기: 지금까지 한 것만) · h.destroy()
  result = { v: 1, id: 판 id, by: 'user', game: 'cook', status, ms, out: { dish: { id, name, tier, ingredients } | null, madeAt } }
  - 판 id 는 한 판에 하나 (본 게임이 같은 판을 두 번 세지 않게). status 값과 뜻은 COOK_PROTO.md 에 적는다.
  - 탭이 숨겨지면 스스로 멈추고 저장한다.
식탁 차리기 기록:
- 다 된 요리 옆에 [식탁에 차리기]. 사람이 누를 때만 한 줄 남긴다 (대신 고르지 않는다):
  { id: 'serve_…', at, runId, dish: { id, name, tier }, by: 'user' } — 이 페이지의 '차리기' 기록이다. S.table 줄이 아니다.
  본 게임이 나중에 이것을 S.user.items (kind 'dish') 와 S.table 의 offer 로 옮긴다 (CORE_LOOP_V2 §5.2) — 옮기는 줄은 PR 설명에.
- 문어가 먹을지·맛볼지·아껴 둘지 (action) 는 이 카드에서 만들지 않는다 (같이 가기 시험대와 본 게임 몫). '차리기' 수는 문어 선택과 상관없이 센다.
그림: Apollo 팔레트로 코드가 그리는 픽셀 아트 (캔버스, 2px 격자, 정수 배).
소리: audio/ 는 쓰지 않는다. 그 순간마다 window.AUDIO && AUDIO.on && AUDIO.on('cook', { act }) 한 줄만 부른다 (js/app.js 와 같은 훅. AUDIO.sfx 는 없다).
  act: 'drop' 재료를 떨어뜨림 · 'merge' 합쳐짐 ({ act, tier } — 새 단계) · 'done' 요리 완성 (가득 참·"이걸로 할래") · 'serve' 식탁에 차리기.
  지금 js/audio.js 의 on(name, d) 은 모르는 이름을 그냥 넘긴다 (switch 의 default) — 소리 세션이 'cook' 을 더하면 난다. js/audio.js 는 고치지 않는다.
  CORE_LOOP_V2 §5.1 금지 표의 '`onEvent`만 낸다' 는 11-07 카드 검토로 이 AUDIO.on 한 줄로 바꿨다. onEvent 로는 소리를 내지 않는다 — PR 설명에 이렇게 적는다.
  COOK_PROTO.md 에 소리 세션에 넘길 표: 이벤트 · act · 언제 · 느낌 (CORE_LOOP_V2 §5.5 '냄비 퐁'·'접시 내려놓기').
하지 말 것:
- ppolppol_v2 · APP · BRAIN · S 를 읽거나 쓰기 (사람 놀이가 문어 기록에 닿지 않게)
- 조개(돈)·지갑을 보이거나 정하기 — 결과만 낸다. 조개는 본 게임이 접시가 완성될 때 정한다
- 결과에 점수·실패·등수 · 한 번에 16ms 넘게 막기 · 네트워크 기다리기
- "맛있대", "좋아해" 같은 문구 (요리를 문어가 좋아한다고 코드가 쓰지 않는다)
검수: tools/test-cook.js (Playwright, 360×740, 터치) — 한 판 끝까지 · 가득 찼을 때 요리 완성 (실패 화면 없음)
  · 같은 시드·같은 입력이면 같은 결과 (판 id 포함 결과 모양) · pause → 새로고침 → resume 이 이어짐 · cut 결과
  · 차리기 기록은 누를 때만 · '동작 줄이기'에서 흔들림 최소 · file:// 동작 · 콘솔 오류 0 · js/cook.js 에 Math.random 0건 · '맛있'·'좋아해' 0건
  · 소리: page.addInitScript 로 window.AUDIO = { on(n, d) { 기록 } } 을 걸면 drop·merge·done·serve 때 AUDIO.on('cook', …) 이 불림, AUDIO 가 없어도 오류 0.
  docs/COOK_PROTO.md: 캡처 3장 (docs/shots/cook/), 재료 단계 표, 소리 넘김 표, 본 게임에 잇는 데 필요한 줄 (어디서 COOK.start 를 부르나).
멈춤: 위 검수가 초록이고 COOK_PROTO.md 가 차면 draft PR 을 열고 멈춘다. 본 게임 잇기 (app.js·S.table·조개 셈) · 문어 action · 요리 배지 셈
  · 소리 파일 · 꾸미기는 만들지 않는다.
```

---

## 카드 8. 헤엄 미니게임 — 눌러서 오르내리기, 부드럽게 (2026-11-07 고침)

언제: **지금** (결정 1 이 (가) 로 정해졌다. 새 파일만) · 크기 **L** · 주 세션 쪽 §5.1 '소리' 칸 고침은 카드 7 머리말과 같다.

```text
카드 8. 헤엄 미니게임 — 눌러서 오르내리기, 부드럽게 (11-05, 11-07 고침)
브랜치: game/swim
맡는 파일 (이 카드만 고친다): swim.html, js/swim.js, css/swim.css, docs/SWIM_PROTO.md, tools/test-swim.js, docs/shots/swim/
먼저 읽기: docs/CORE_LOOP_V2.md §3.2 (B2·B5·'헤엄 규칙') · §4.2 (진짜 모델일 때 헤엄 구간) · §5.1 '미니게임 끼우기 계약' · §5.2 '헤엄 상태'
  · §5.4 (움직임 표) · §5.6 점검 5, docs/OWNER_DECISIONS.md 1번, docs/ACHIEVEMENTS.md §3.3, docs/PLAYER_PROGRESSION.md §3.2
쓰임: '같이 가기'를 고르면 산책의 방과 방 사이를 이 게임으로 같이 헤엄쳐 간다. 그래서 한 판 대신 '구간'이 기본 단위다.
  구간 길이는 CORE_LOOP_V2 의 8~12초를 따른다 (PLAYER_PROGRESSION §3.2 의 '8~15초' 가 아니라).
  방 보기에서 따로 할 때는 구간 몇 개를 이어 정해진 길이 (약 1분) 를 가면 끝.
결정 1 (가, 11-05): 같이 가기 구간에서 누르면 움직이는 건 '내 모습'이다.
- 문어는 앞에서 자기 길로 헤엄친다. 2~3초마다 먹물을 '퓻' 뿜고 쭉 나아간다 (정해진 연출, by: 'playback').
  문어는 부딪히지 않고, 사람의 누름으로 움직이지 않는다.
- 내 모습: 톡 = 위로, 놓으면 천천히 가라앉는다. 위아래로만 움직인다. 해파리·물고기·산호를 살살 피한다.
  부딪히면 빙글 돌고 계속 간다 (죽지 않는다). 뒤처지면 물살이 살살 밀어 준다. 문어를 앞지를 수 없다. 안 눌러도 알아서 따라간다.
- 내 모습 그림은 기본 모습 하나 (16×24, 발차기 6프레임 1~2px, 누를 때만). 옷·얼굴은 나중에 종이 인형 작업이 바꿔 끼우게, 그리는 곳을 한 함수로 모은다.
- 따로 하는 헤엄은 player: 'octopus' (다락방 달리기처럼 문어를 직접) 도 된다 (결정 1 설명). 기본은 'me'.
- 구간에서 한 일은 문어가 갈 곳·읽을 것을 절대 바꾸지 않는다 (경로는 문어가 고른다).
연결 지점 (CORE_LOOP_V2 §5.1 모양 그대로):
  구간: SWIM.segment(el, { seed, ms: 8000~12000, until: Promise | null, lead: 'octopus', player: 'me' | 'octopus', homeLight: 0~8, reduced })
    → Promise<result>. result = { v: 1, id: 판 id, by: 'user', game: 'swim', status, ms, out: {} }. (소리는 아래 AUDIO.on 으로 — onEvent 를 더하지 않는다)
  따로 하는 1분 코스: §5.1 GAME.start 계약 그대로 — var h = SWIM.start(el, { seed, reduced, speed, scale, palette, resume, onEvent, player: 'me' | 'octopus' })
    h.pause() → state (JSON, 8KB 이하) · h.resume() · h.finish() → Promise<result> · h.cut() → Promise<result> (지금까지 한 구간만) · h.destroy()
  - status 는 결과마다 하나: played (한 번 이상 누름) · auto (입력 없이 지나감, 탭 숨김 포함) · cut (건너뛰기) · still (동작 줄이기 그림 한 장)
    — CORE_LOOP_V2 §5.2 '헤엄 상태'. 1분 코스 결과의 status 는 이 넷 안에서 고르고 뜻을 SWIM_PROTO.md 에 적는다.
    (ROADMAP 카드 표의 '구간 결과는 played/auto 만' 은 '결과에 상태만 (거리·부딪힌 수 없음)' 으로 읽는다 — CORE_LOOP_V2 §5.2 '헤엄 상태'·§5.6 점검 5 가 cut·still 을 요구한다)
  - 구간 out 은 비운다. 거리·부딪힌 수·점수는 어떤 꼴로도 화면·결과에 없다.
  - until: 진짜 모델일 때 다음 사건이 오면 풀린다. ms 가 지나고 그리고 until 이 풀려야 끝난다 (최대 30초).
    30초가 넘으면 조용히 끝내고 문어는 물속에 가만히 떠 있다. "생각 중" 같은 말은 붙이지 않는다.
  - homeLight: 마지막 구간 (집 가는 길) 에 멀리 보이는 다락 창 불빛 밝기 = 지금 등불 칸 수 (사실).
  - SWIM.start 결과는 같은 모양에 구간 상태 목록만: out: { segs: ['played', 'auto', …] }. 판 id 는 구간·판마다 하나. 탭이 숨겨지면 스스로 멈춘다.
- 동작 줄이기면 그림 한 장 (3초 또는 톡) → 'still'.
- 선택: 바다 생물이 가끔 같이 헤엄쳐 주거나 길을 비켜 주는 귀여운 순간.
그림·화면: Apollo 팔레트로 코드가 그리는 픽셀 아트. 아트 px 를 기기 픽셀 기준 정수 배로 키운다 (js/runner.js 의 fit() 와 192×108 방식을 참고, 코드는 새로).
  배경 시차는 2겹까지.
소리: audio/ 는 쓰지 않는다. 그 순간마다 window.AUDIO && AUDIO.on && AUDIO.on('swim', { act, who }) 한 줄만 (js/app.js 와 같은 훅. AUDIO.sfx 는 없다). who = 'me' | 'octopus'.
  act: 'flap' 톡 (위로) · 'bump' 부딪혀 빙글 · 'ink' 문어 먹물 퓻 (정해진 연출) · 'end' 구간·코스 끝 (status 와 함께).
  지금 js/audio.js 의 on(name, d) 은 모르는 이름을 그냥 넘긴다 (switch 의 default) — 소리 세션이 'swim' 을 더하면 난다. js/audio.js 는 고치지 않는다.
  CORE_LOOP_V2 §5.1 금지 표의 '`onEvent`만 낸다' 는 11-07 카드 검토로 이 AUDIO.on 한 줄로 바꿨다. onEvent 로는 소리를 내지 않는다 — PR 설명에 이렇게 적는다.
  SWIM_PROTO.md 에 소리 세션에 넘길 표: 이벤트 · act · 언제 · 느낌 (CORE_LOOP_V2 §5.5 '헤엄 거품'·'먹물 퓻'·'살짝 부딪힘 퐁').
하지 말 것: ppolppol_v2 · APP · BRAIN · S 읽기·쓰기 · 조개·점수·거리·진행 막대·남은 정류장 수 · 결정 코드에 Math.random · 한 번에 16ms 넘게 막기
검수: tools/test-swim.js (Playwright, 360×740, 터치) — 구간 하나 끝까지 · SWIM.start 1분 코스 끝까지 (pause → resume 이어짐) · 부딪혀도 계속
  · 같은 시드·입력이면 같은 장애물 배치
  · 상태 정직 (입력 없음 → auto, 탭 숨김 → auto, 건너뛰기 → cut, 동작 줄이기 → still, 입력 없이 played 0건)
  · player:'me' 에서 누름이 문어 위치를 안 바꿈 · until 이 늦게 풀리면 30초에 끝남 · file:// · 콘솔 오류 0
  · 소리: page.addInitScript 로 window.AUDIO = { on(n, d) { 기록 } } 을 걸면 톡·부딪힘·먹물·끝에 AUDIO.on('swim', …) 이 불림, AUDIO 가 없어도 오류 0.
  SWIM_PROTO.md 에 캡처 3장 (docs/shots/swim/), 소리 넘김 표, 본 게임에 잇는 데 필요한 줄.
멈춤: 위 검수가 초록이고 SWIM_PROTO.md 가 차면 draft PR 을 열고 멈춘다. 본 게임 잇기 (산책 재생·app.js) · 내 모습 옷·얼굴 (종이 인형 몫)
  · 헤엄 배지 셈 · 조개 · 소리 파일 · 새 놀이 ('선택' 줄의 바다 생물 순간 말고) 는 만들지 않는다.
```

---

## 카드 9. (큰 일, 로컬 Claude Code 추천) MCP 서버 + 진짜 모델이 문어가 되어 놀아 보기 (2026-11-07 고침)

언제: **1·2단계 (mcp/ 서버 · 짝꿍 스킬) 는 지금** — 게임 코드를 안 건드린다. 3단계의 게임 재생 확인만 물결 F 검증 커밋 ('6물결', WIP 스냅샷 아님) 뒤 · 1~3단계 마감 11-11 쯤 (로드맵 7일째 — 11-05 를 1일째로 센 날. 1½단계 '진짜 한 바퀴' 전) · 크기 **L+**
카드 3 은 주지 않는다 (이 카드가 대신한다). 어디서: 로컬 Claude Code 추천 — 3단계 (`claude mcp add` 로 서버를 붙여 진짜 모델이 놀기) 는 로컬이 가장 단순하다.
클라우드에서 하려면 **건네기 전에** 그 환경의 허용 목록에 `ko.wikipedia.org`·`upload.wikimedia.org` 를 더한다 (기본 환경은 둘 다 프록시 403 — 11-07 확인. 방법은 카드 안 '어디서' 줄).
**건네기 전에**: 물결 F 검증 커밋이 이미 있으면 카드의 `<물결 F 해시>` 자리에 그 해시를 적는다. 아직이면 그대로 둔다 (카드가 grep 줄로 확인하고, 들어오면 주 세션이 PR 에 해시를 적어 준다).
**주 세션 쪽**: docs/ROADMAP.md 100줄 (1½단계) 과 177줄 (4단계 표) 의 '위키·진짜 Claude 는 로컬에서만' 을 건네기 전에 고친다 (못 고쳐도 카드의 '먼저 읽기' 가 옛 글이라고 알린다).

```text
카드 9. MCP 서버 + 진짜 모델이 문어가 되어 놀아 보기 (11-05, 11-07 고침 · 로컬 Claude Code 추천)
브랜치: feat/mcp-octopus
언제: 1단계 (서버) · 2단계 (스킬) 는 지금 시작한다 — 게임 코드를 고치지 않는다. 3단계의 진짜 산책도 먼저 해도 된다.
  기다리는 것은 3단계의 게임 쪽 확인뿐이다 (index.html?dev=1 의 #d-json → APP.importEvents 재생, 불러온 wrap_up.note 가 게임의 다음 산책 메모로 이어지는지).
  그것은 주 세션의 물결 F 검증 커밋 (커밋 이름 '6물결', 'WIP … 검증 전' 스냅샷 아님) 이 기준 브랜치에 들어온 뒤에 한다. 확인 (git fetch origin 뒤):
  git merge-base --is-ancestor <물결 F 해시> origin/ccr-38ad393e-15xr9t && echo 들어옴
  해시 자리가 <물결 F 해시> 그대로거나 비어 있으면 위 줄은 건너뛰고:
  git log origin/ccr-38ad393e-15xr9t --format=%s | grep -v -E 'WIP|검증 전' | grep -E '^(6물결|물결 F)' 가 한 줄 이상이어야 한다.
어디서: 로컬 Claude Code 가 가장 단순하다 (3단계는 claude mcp add 로 서버를 붙이고 새 대화에서 논다). 클라우드 기본 환경은 네트워크 허용 목록에
  위키가 없어서 peek 가 프록시 403 을 받는다 (그때 status 는 failed 가 정직한 값). 클라우드면 맡기기 전에 사람이 연다: 세션 제목 줄의 클라우드 환경 메뉴 → Edit →
  Network access 의 Allowed domains (Limited 단계 아래. 옛 앱은 Custom) 에 ko.wikipedia.org 와 upload.wikimedia.org 를 더한다 (Allow package managers 는 켠 채로).
마감: 1~3단계는 11-11 쯤 (로드맵 '7일째', 1½단계 '진짜 한 바퀴' 전). 4단계는 그 뒤.
맡는 파일 (이 카드만 고친다): mcp/ (새 폴더, 자기 package.json), .claude/skills/ppolppol-octopus-play/ (새 스킬), docs/MCP_PLAYTEST.md, docs/shots/mcp-octopus/.
  게임 코드와 설계 문서는 고치지 않는다. docs/PROTOCOL.md 는 주 세션만 고친다 — 바꾸자는 것은 MCP_PLAYTEST.md 의 '제안' 절에 적는다.
  게임 쪽 확인은 이벤트 JSON 재생으로만: 개발 모드 (index.html?dev=1) 의 데모 패널 #d-json → APP.importEvents. 테스트에서는 APP.importEvents(json) 를 바로 불러도 된다.
  진짜 시험 기록은 커밋하지 않는다: mcp/.gitignore 에 state.json · out/ (저장소가 그대로 정적 사이트로 나간다). PR 에는 예시 한 판만 mcp/examples/ 에.
먼저 읽기: docs/PROTOCOL.md (읽기만. 물결 F 커밋에서 바뀌면 rebase 뒤 따른다), docs/MODEL_VOICE.md ('자동 점검'), docs/CURIOSITY_NOTES.md ('지금 코드' 절),
  docs/CORE_LOOP_V2.md §4.2 (모델이 보는 것 · 고정 문장 · 식탁 table · 모델 호출 상한 표) 와 §5.6 점검 3·7·9,
  docs/DIALOGUE_UI.md §4.4 (첫인사 meet) · §4.5 (돌아와서 대화 chat) · §5.12 (S.talk), docs/ROADMAP.md '1½단계'
  (그 절과 4단계 표에 '위키·진짜 Claude 는 로컬에서만' 이 남아 있으면 옛 글이다 — 위 '어디서'),
  .claude/skills/cozy-web-game/references/mcp-readiness.md · model-voice-and-play.md, js/brain.js 의 replay·정규화 (읽기만)
이미 된 것 (게임·두뇌·PROTOCOL 쪽 — 다시 만들지 않는다):
- PROTOCOL §1·§3 의 wrap_up 은 reaction?·line?·memo?·note?·setDown? 이 모두 선택이다 (기준 브랜치 10b012f '6물결' 스냅샷부터). 서버는 지금 PROTOCOL 을 그대로 따른다.
- 모델이 고른 반응·말은 준 그대로 남는다. reaction 을 안 쓰면 반응 없이 끝난다 (게임이 대신 고르지 않는다).
- 메모 들어오기: 게임이 활성 메모 최근 3개를 두뇌에 state.notes 로 준다. 나가기: trip.noteOut (wrap_up.note 그대로), trip.setDown (모델 산책만).
1단계 — 서버 (mcp/, Node, @modelcontextprotocol/sdk, stdio)
- 산책 도구 6개: ppolppol_look_room, ppolppol_depart, ppolppol_peek, ppolppol_finish, ppolppol_stay_home, ppolppol_empty_turn.
  귀가·기억 고르기·포스터 걸기·마무리 (지금 §3 의 return_home·remember·hang_poster·wrap_up) 는 finish 하나로 묶는다 — 내는 이벤트는 §1 그대로
  (return · remember · hang_poster · wrap_up). peek (읽고 → 다음 갈 곳 고르기) 는 따로 둔다.
  결정 지점 (아래) 을 묻고 받는 방법 (따로 도구, 또는 finish 결과에 실어) 은 이 카드가 정한다. 도구 6개와 그 방법은 mcp/README.md 에 표로,
  PROTOCOL §3 표를 그렇게 바꾸자는 안은 MCP_PLAYTEST.md '제안' 절에 적는다.
- 모델이 꼭 내야 하는 건 행동 하나뿐. reaction·line·memo·note·이유는 전부 선택. 모든 입력에 그만두기 길이 있다.
- peek 는 서버가 진짜로 ko.wikipedia 를 읽는다. status 는 read / failed / simulated 를 정직하게. 지어낸 요약 금지.
  출처는 ko.wikipedia 문서 주소만, 썸네일은 upload.wikimedia.org 만 (brain.js 정규화와 같게). 위키 본문은 '자료'로만, 짧게.
- 호기심 메모: finish 의 note?: { text, about? }, setDown?: [id]. depart 출력과 look_room 에는 내려놓지 않은 최근 3개만,
  by·model (알면)·session·at 을 붙여 PROTOCOL '요청에 싣는 메모' 머리말로. 보관 메모가 있다는 것·개수는 알리지 않는다. 상태는 mcp/state.json.
- 결정 지점 셋 (CORE_LOOP_V2 v1.1): 첫인사 meet · 돌아와서 대화 chat · 식탁 table. 보내는 상황과 돌려받는 모양은 DIALOGUE_UI §4.4·§4.5, CORE_LOOP_V2 §4.2 그대로.
  menu 에 늘 watch·stop. line 은 선택, 받은 글자 그대로. 이유를 묻지 않는다. table 은 늘 finish 뒤에만 (점검 7).
  상한은 CORE_LOOP_V2 §4.2 표 한 곳을 따른다: meet 처음 한 번 · chat 귀가 한 번에 2번 · table 30초에 1번·하루 5번. 넘으면 묻지 않고 기록도 없다.
  '제안' 절에도 그 표를 옮기지 않고 가리킨다.
- 고정 문장 하나: CORE_LOOP_V2 §4.2 초안 (사람이 따라왔는지·무엇을 했는지는 전하지 않는다는 사실) 을 다듬어 서버가 쓰고, 확정 문구를 '제안' 절에 적는다.
  PROTOCOL·CORE_LOOP_V2 에는 주 세션이 PR 을 보고 옮긴다. 모든 모드에서 같은 글.
- 사람 키 0개 (점검 3): 산책·결정 지점 요청에 같이 왔나·주운 것·요리 중·간직한 것을 넣지 않는다 (table 은 차린 그 한 접시만).
- 결과: 산책마다 게임이 그대로 재생할 수 있는 이벤트 배열 (PROTOCOL §1, 산책 메타 by: 'mcp') 을 mcp/out/<날짜>-<n>.json 으로.
  meet·chat 대답은 DIALOGUE_UI §5.12 S.talk 모양 (who 'octopus', kind 'intro'/'chat', by 'model', action, q, text 원문) 으로 같은 폴더에 따로. 게임에 잇기는 하지 않는다.
- 도구 설명과 반환값은 짧게. 도구별 반환 크기 (바이트) 를 테스트에서 재서 mcp/README.md 에 표로.
2단계 — 짝꿍 스킬 (.claude/skills/ppolppol-octopus-play/SKILL.md — 설명은 무엇+언제, 꺾쇠 금지, 1024자 이내)
- 문어 역할 모델에게: 도구 순서 (look_room → depart → peek 여러 번 → finish), 정직한 status 그대로 쓰기, 그리고 허락들 —
  그만둬도 된다, 이유·메모를 안 써도 된다, 힌트를 안 따라도 된다, 집에 있어도 된다, 대화에 대답하지 않아도 된다.
- 하지 말 것: "재미있게 해", "사용자를 기쁘게", "항상 메모를 남겨" 같은 압박 문구. 말투를 정해 주는 대본.
3단계 — 진짜로 놀아 보기 (claude mcp add 로 서버를 붙인다. 로컬이 가장 단순하다 — 위 '어디서')
- 산책 10번 이상. 몇 번은 이어서 — 앞 산책의 메모가 다음 depart 에 실리는지, 내려놓은 메모가 빠지는지. 귀가 뒤 chat 두 차례도 돌린다.
  플레이어 화면엔 힌트 칸이 없다 (결정 18). 대부분 힌트 없이, 2~3번만 힌트를 줘서 '안 따라도 된다'가 지켜지는지 본다.
- 각 판 이벤트를 게임 #d-json 에 붙여 재생되는지 확인 (물결 F 뒤), 360×740 캡처를 docs/shots/mcp-octopus/ 에.
- MODEL_VOICE '자동 점검'을 진짜 기록에 대 본다: 그만두기 길, 글자 그대로, 읽지 않은 걸 읽었다고 했나, 내려놓은 메모가 다시 들어갔나.
- 토큰 실측: 산책 1번에 도구 호출 수, 입력·출력 토큰 (볼 수 있는 만큼), 걸린 시간. 어디서 많이 쓰는지 표로.
- docs/MCP_PLAYTEST.md: 잘 된 것, 헷갈린 도구 설명, 고칠 것, '제안' 절, 모델이 실제로 남긴 메모·대답 몇 개를 글자 그대로 (기록 파일은 커밋하지 않는다).
검수: mcp/test — 도구 왕복 · 위키 실패 시 failed 정직 · setDown 한 메모가 depart·look_room 에 안 나옴 · 이유·메모 없이도 finish 성공
  · 결정 지점 menu 에 watch·stop · 상한 넘으면 안 물음 · table 은 finish 뒤에만 · 요청에 사람 키 0개 · git status 에 state.json·out/ 없음
  · 같은 이벤트를 게임이 재생 (물결 F 뒤. Playwright 로 index.html?dev=1 의 #d-json, 오류 0) · npm test 초록.
4단계 — Claude 커넥터 디렉터리 등록 대비 (1~3단계 뒤. 11-05 공식 문서 기준, 제출 전에 다시 확인)
- 결정 20: 내가 쓰는 내 Claude 에게 방을 준다. 서버는 Claude 의 메모리·대화 기록을 읽지 않고 사용자 프로필을 만들지 않는다 (정책 1E·1G). 남기는 건 게임 상태뿐.
- 결정 6 (가, 11-07 확정 — OWNER_DECISIONS.md 6번 '답 아직 없음' 은 옛 글): '오늘 전 세계 문어들이 N번 산책' 은 방 보기 안에만.
  날짜별 숫자 하나만 센다 (사람별 수·순위·연속 기록·계정 없음), 설정에서 끄면 신호도 안 보낸다.
  개인정보 처리방침 초안 (MCP_PLAYTEST.md '등록 대비' 절) 에 이 셈을 적고, MCP 산책도 셀지는 PR 에 제안으로 (숫자 서버는 api/ 쪽 다른 일 — 이 카드에서 만들지 않는다).
- MCP Apps (대화 속 화면, ui:// 리소스) 판 검토. 필수: 원격 HTTPS, 모든 도구에 title + readOnlyHint/destructiveHint, 계정이 있으면 OAuth 2.0·리뷰어 테스트 계정,
  개인정보 처리방침·문서 URL, 예시 프롬프트 3개 이상, 도구 이름 64자 이하, 토큰 아끼기 (5B), 위키 본문이 지시처럼 읽히지 않게 (2F·2G), 스크린샷 3~5장 (가로 1000px 이상).
- 확인할 것: 정책 3F 가 위키백과 읽기에 어떻게 적용되는지. 제출: claude.ai/directory/manage. 문의 mcp-review@anthropic.com.
멈춤: 1·2단계 검수 (재생 줄 빼고) 가 초록이면 draft PR 을 먼저 연다. 3단계도 같은 PR 에 올린다.
  위 검수가 재생 줄까지 다 초록이면 4단계 검토를 같은 PR 의 MCP_PLAYTEST.md '등록 대비' 절에 적고 멈춘다.
  물결 F 가 아직이면 재생 줄만 남기고 PR 설명에 '물결 F 뒤 재생 확인 남음' 이라 적고 멈춘다 (4단계도 아직).
  들어오면 주 세션이 PR 에 해시를 적어 준다 — 그때 재생을 확인하고 4단계로 간다.
  원격 HTTPS 배포·OAuth·제출·숫자 서버 (api/)·게임에 잇기 (meet·chat·메모)·PROTOCOL 고치기는 하지 않는다.
```

---

## 카드 10. (큰 일, 로컬에 Blender 가 있으면) 다가올 기능용 픽셀 소품 — 모양 참고판 (2026-11-07 고침)

언제: **지금** (Blender 가 있는 로컬) · 크기 **L** (11-07: 방 넓히기 그림은 카드 12 '그 뒤 할 일' 3 과 scene3d 코드 몫이라 뺐다)

```text
카드 10. (큰 일, 로컬에 Blender 가 있으면) 다가올 기능용 픽셀 소품 — 모양 참고판 (11-05, 11-07 고침)
브랜치: art/props-next
맡는 파일 (이 카드만 고친다): assets/props-next/ (새 폴더, 새 파일만), docs/research/props-next.md, docs/shots/props-next/
  assets/ui·assets/fx (UI 아트 세션 몫), assets/manifest.json, 이미 있는 assets 파일은 고치지 않는다. 넣을 manifest 키는 props-next.md 표에 적기만 한다.
이 일의 쓰임: 요리 (카드 7)·헤엄 (카드 8) 은 Apollo 팔레트로 코드가 직접 그리고, 컵 놀이 kit 도 코드로 만든다.
  그래서 여기서 만드는 PNG 는 '모양 참고판' 이다 — 각 작업이 코드 그림을 다듬거나 나중에 그림으로 바꿔 끼울 때 본다. 지금 게임에 붙지 않는다.
먼저 읽기: .claude/skills/cozy-web-game/references/blender-pixel-pipeline.md · three-pixel-look.md · pixel-look-references.md, js/palettes.js (Apollo)
만들 것 (다락방 픽셀 룩에 맞게, 팔레트는 Apollo 만):
- 컵 놀이: 컵 3종, 공 2색, 작은 상자
- 요리 (집에서 기다리기): 냄비, 바다 재료 7~9단계 (물방울 → 해초 → 미역 → 가리비 → 새우 → …), 완성 요리 접시 몇 가지, 작은 식탁
  '조개'는 게임 돈 이름이라 재료로 쓰지 않는다 (결정 19). 단계 이름은 요리 미니게임 (카드 7) 과 같게.
- 먹물뿜기 (같이 가기 헤엄): 해파리, 작은 물고기 2~3종, 산호, 물풀
만들지 않는 것: 방 넓히기 그림 (큰 먼지·2D 옆방 판·구멍·천·망치·판자는 UI 아트 세션 = 카드 12 몫, 3D 비계 등 소품은 scene3d 가 코드로 만든다 — ROOM_EXPANSION §5.9).
각 소품: 결과 PNG (정수 배), 원본 (.blend 또는 생성 스크립트), 크기·용도 표를 docs/research/props-next.md 에.
하지 말 것: 게임 코드에 붙이기 (붙이는 건 각 기능 작업이 한다) · 외부 이미지 받아 오기 · Apollo 밖의 색.
검수: props-next.md 에 소품마다 PNG 경로·크기·원본 경로·어느 카드의 참고인지, 한 장 미리보기 docs/shots/props-next/sheet.png, 팔레트 밖 색 0개를 어떻게 확인했는지.
멈춤: 위 세 묶음 (컵 놀이·요리·먹물뿜기) 과 props-next.md·sheet.png 가 되면 draft PR 을 열고 멈춘다. 새 묶음 · 애니메이션 프레임 · manifest 넣기 · 게임에 붙이기로 넓히지 않는다.
```

---

## 카드 11. 입장 연출 다시 — 어두운 하늘에서 천천히 내려와 타이틀 '딱' (2026-11-07 고침)

언제: **지금** (intro.js·clouds.js·intro.css 만) · 크기 **M** · 누구: **UI 아트·입장 세션** (입장 레이어를 만들고 브랜치 ccr-20b50c24-bjx2pi 에서 카드 검토를 쓴 세션. 11·12 를 맡겠다고 했다) 에 카드 12 와 같이 준다
11-07 고침: 장면 열쇠는 지금 (로드맵 3~8일째) 컵 kit 합치기 차례라 `js/scene3d.js` 는 이 카드에 주지 않는다. 장면 쪽은 패치 파일로 받아 주 세션이 장면 열쇠 차례에 넣는다.
**다르게 하려면**: 컵 kit 합치기를 미루고 장면 열쇠를 이 카드에 주면, 맡는 파일에 `js/scene3d.js` 의 입장 부분 (INTRO · introOffset · startIntro · finishIntro · introRelease · skyHex · skyEstimate · buildSky · skyLayout · `var CLOUD`) 을 더하고 패치 줄을 지워서 건넨다.
**보내기 전에**: send-uiart-session.md 의 카드 11·12 사본은 이 판보다 옛것이다 (높이 줄 'scene.intro({ dur, height, hold })' · 2D·3D 곡선을 한데 묶음 · ccr-20b50c24-bjx2pi 에서 이어 하기 · 12 의 멈춤). 그 파일의 두 카드를 아래 두 블록으로 바꿔 보낸다. 이미 보냈으면 이 두 블록을 '바꾼 판' 으로 그 세션에 다시 보낸다.

```text
카드 11. 입장 연출 다시 — 어두운 하늘에서 천천히 내려와 타이틀 '딱' (11-05, 11-07 고침)
브랜치: ui/intro-slow (새로, 기준 ccr-38ad393e-15xr9t 끝에서: git fetch origin && git switch -c ui/intro-slow origin/ccr-38ad393e-15xr9t).
  ccr-20b50c24-bjx2pi 위에서 잇지 않는다 — 입장 작업은 d0301f8 로 이미 합쳐졌고, 그 뒤의 검토 커밋 (docs/CARD_REVIEW.md) 이 PR 에 섞인다.
맡는 파일 (이 카드만 고친다): js/intro.js, js/clouds.js, css/intro.css, tools/intro-shots.js, docs/INTRO_SLOW_PROTO.md, docs/shots/intro-slow/
장면 쪽 (js/scene3d.js) 은 잠긴 파일이다 — 지금은 컵 놀이 kit 합치기 차례라 커밋하지 않는다.
  3D 에서 바꿀 것은 로컬에서만 얹어 시험하고, git diff js/scene3d.js > docs/shots/intro-slow/scene3d-intro.patch 로 남긴 뒤 git checkout -- js/scene3d.js.
  패치는 입장 부분만: INTRO · introOffset · startIntro · finishIntro · introRelease · skyHex · skyEstimate · buildSky · skyLayout · var CLOUD.
  INTRO_SLOW_PROTO.md 에 패치가 바꾸는 함수와 까닭을 적는다. 주 세션이 장면 열쇠 차례에 넣는다.
이미 된 것 (다시 만들지 않는다): 하루 한 번 연출 (A5-1, js/intro.js 94a76ff · d0301f8 로 합침: localStorage 'ppolppol_intro_day',
  ?intro=1 강제 · ?intro=0 생략 · 자동화 브라우저 기본 생략), 하늘 단계에서 누르면 바로 착지.
먼저 읽기: docs/UI_ART.md '입장'·'구름', docs/DIALOGUE_UI.md §5.9 ('톡 눌러서 들어가기' 줄), docs/PLAYTEST_FIXES.md A5
  js/intro.js 의 start · slide2D · riseLogo, js/scene3d.js 의 위 입장 함수 (읽기만)
주인 요청 (원문): "처음에 타이틀 말인데 좀 어두운 곳부터 길게 한 2초 정도 천천히 내려오면서 타이틀 딱 떴으면 좋겠어.
  지금은 너무 휙 지나가는 느낌? 구름도 좀 더 큼직하고 띄엄띄엄 해서 실제로 하늘에서부터 이 방으로 슉 오는 느낌으로."
할 것 (괄호 = 고치는 곳):
- 시작: 지금보다 높은, 더 어두운 하늘에서 출발 (낮이어도 위쪽은 짙은 남색, 밤이면 거의 검정에 별 몇 개). 맨 위에서 0.3~0.5초 멈춰 있다가 출발.
  (높이: intro.js 가 scene.intro 에 height 를 더해 넘긴다 — 지금은 { dur, hold } 만, scene3d 는 { dur, height, instant, hold } 를 받고 기본 1.35 · 하늘 색과 맨 위 멈춤: 패치)
- 내려오기: 체감 2초 이상 '천천히'. 지금 길이는 intro.js 의 SKY_DUR 2.2초를 둘이 같이 쓰고 (3D 엔 scene.intro 의 dur 로 넘긴다), 곡선은 따로다.
  3D: scene3d.js introOffset — 0~86% easeOutCubic 으로 내려오고 72~100% 에 착지 눌림 (아트 3px 더 내려갔다 돌아옴).
  2D 대체 (WebGL 없음): intro.js slide2D 의 cubic-bezier(.2,.8,.2,1) (3% 지나쳤다 돌아옴). 둘 다 앞이 빨라 휙 지나간다.
  → 처음 천천히 출발 · 중간 일정 · 부드러운 착지 (ease-in-out 계열), 전체 2.5~3초. 내려오면서 하늘이 점점 밝아지고 비·다락 지붕이 다가온다.
  (SKY_DUR·2D 곡선: intro.js · 3D 곡선 introOffset: 패치)
- 구름: 지금보다 1.5~2배 크게, 수는 줄여 띄엄띄엄 (지금 buildSky 의 nC = 맑음 5 · 가랑비 11 · 비 16, 크기 CLOUD = 112×56). 큰 구름 2~3개가 카메라 가까이 스쳐 가고,
  하나는 카메라가 '통과'해서 2~4프레임 하얗게 덮였다 걷힌다 (구름을 뚫고 내려오는 느낌). 시차 (먼 구름은 느리게).
  (구름 모양·음영: clouds.js · 수·크기·자리·통과: 패치)
- 타이틀: 착지 직후 "딱" — 슥 올라오는 대신 1~2프레임 만에 제자리에 꽂히는 픽셀 계단 등장 (살짝 튕김 2px) + 반짝 한 번. (intro.js riseLogo · intro.css)
- "톡 눌러서 들어가기": 지금 1.2초 깜빡임이 끝없이 돈다 → 1px 위아래 4프레임, 3번 뒤 멈춤 (DIALOGUE_UI §5.9). (intro.css)
지킬 것: 언제 눌러도 바로 착지, '동작 줄이기'면 바로 착지 + 페이드만, 하루 한 번 동작 그대로, 2D 대체 (WebGL 없음) 도 같은 느낌,
  패치 없이 (지금 scene3d 로) 도 깨지지 않는다, 픽셀 규칙 (Apollo 팔레트, 정수 배, 2px 스냅),
  프레임 비용·드로우콜 늘리지 않기 (패치를 얹고 node tools/test-scene-perf.js 초록).
검수: 전/후 GIF (360×740, 낮·밤 각 1개) 를 docs/shots/intro-slow/ 에. '후' 는 패치를 얹고 찍었다고 적는다.
  node tools/intro-shots.js 와 SMOKE_ONLY=A,I node tools/smoke.js 통과 — 패치 있이·없이 둘 다 (둘 다 tests/evidence/ 를 다시 쓴다 — 커밋하지 않는다).
  tools/intro-shots.js 에 단계를 더한다: 첫 열기에서 타이틀을 눌러 들어간 뒤 같은 날 다시 열기 → #intro 없음, 날짜를 바꾼 첫 열기 → 있음
  (PLAYTEST_FIXES A5). 이 둘은 ?intro=1 없이 연다. intro.js 는 navigator.webdriver 면 늘 생략하므로 새 context 에서
  page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false })) 를 먼저 걸고,
  날짜는 addInitScript 로 window.__ppolTest = { today: 'YYYY-MM-DD' } 를 바꿔 준다. npm test 초록.
멈춤: 위 할 일과 검수가 끝나면 draft PR (ui/intro-slow → ccr-38ad393e-15xr9t) 을 열고 멈춘다. 입장 밖 (방 장면·대사창·소리·app.js) 은
  고치지 않고 PR 설명에 제안으로만 적는다. 패치를 입장 함수 밖으로 넓히지 않는다.
```

---

## 카드 12. 픽셀 UI 움직임 부드럽게 — 2프레임 깜빡임 대신 4~6프레임 (2026-11-07 고침)

언제: **1단계 (CSS·새 그림) 지금, 2단계 (js/ui-art.js) 는 물결 G 검증 커밋 ('7물결') 뒤** · 크기 **M** (그 뒤 할 일: 요정 그림 S · 배지 그림 S · ◀ ▶·2D 옆방 그림)
누구: 카드 11 과 같이 **UI 아트·입장 세션** (브랜치 ccr-20b50c24-bjx2pi 를 쓰던 세션. 11·12 를 맡겠다고 했다) 에 준다. 1단계는 11 과 나란히 해도 된다.
**주 세션 쪽**: 물결 G 의 '방 보기' 집 아이콘 그리드는 `tools/ui-art/sprites.js` 의 '카드 12' 덩어리 **밖**에 넣는다. 물결 G 를 커밋하면 그 해시를 이 카드의 1단계 PR 에 적어 준다. 그 뒤 할 일은 PR 마다 맡는 파일 목록을 준다.

```text
카드 12. 픽셀 UI 움직임 부드럽게 — 2프레임 깜빡임 대신 4~6프레임 (11-05, 11-07 고침 · UI 아트 세션)
브랜치: ui/anim-frames (새로, 기준 ccr-38ad393e-15xr9t)
이 카드가 UI 아트 세션이다. 공통 규칙의 잠긴 파일 가운데 아래만 예외로 고친다.
맡는 파일 (이 카드만 고친다):
- tools/ui-art/sprites.js: 새 그리드는 파일 끝 'var SPRITES = …' 줄 앞에 표시한 한 덩어리 안에만 덧붙인다 —
  /* ── 카드 12 (UI 아트 세션) 시작 ── */ … /* ── 카드 12 끝 ── */ 안에서 ICONS['ui.backlog'] = [...] 처럼. 주 세션은 이 덩어리 밖에 넣는다.
  (▼ 는 TAILS['ui.next_bob'] 에 32칸 너비로 → 생성기가 assets/ui/next_bob.png 로 쓴다). 기존 그리드는 fx.heart·fx.zzz 만 (2단계).
- tools/make-ui-art.js: 새 키의 설명 (note) 과 새 그림 종류를 쓰는 몇 줄만. css/ui-art.css: ▼ (.ua-next) 와 파티클 (.ua-p) 움직임 줄만.
- 새 그림: assets/ui/next_bob.png (32×8, 4프레임) · assets/ui/nameplate.png (이름표 9-slice) · assets/icons/ui/backlog.png · assets/icons/ui/hand.png (16×16)
- 바꾸는 그림 (2단계): assets/fx/heart.png (5프레임) · assets/fx/zzz.png (4프레임)
- js/ui-art.js (2단계만): 프레임 수 표 FX · 하트 개수 · zzz 간격 · 반짝 한 번만 — 그 부분만. 캡처·GIF: docs/shots/ui-anim/
생성기 규칙: node tools/make-ui-art.js sprites 만 돌린다 (all·sheet 는 tests/evidence 를 쓴다). 생성기는 모든 PNG 와 assets/manifest.json 을 다시 쓴다.
  목록에 있는 파일만 골라 git add 하고, 나머지 바뀐 파일은 git checkout -- <경로> 로 되돌린다 (Node 판이 달라 바이트만 바뀐 PNG 도).
  assets/manifest.json 은 커밋하지 않는다. 새로 생긴·바뀐 키 (JSON 그대로) 를 PR 설명에 붙인다 — 주 세션이 넣는다.
건드리지 않는 것: 가시 '외침' 말풍선 (bubble_shout.png · tail_shout.png · ui.bubble.shout·ui.tail.shout 그리드 · ui-art.css 의 shout 줄) — 물결 G 가 없앤다.
  움직이지도 다시 그리지도 않는다. '방 보기' 집 아이콘·앨범 '일기' 칸도 물결 G 몫.
  style.css·scene2d.js 의 반복 (「다녀오는 중…」 숨쉬기, 2D 별·등불) 은 고치지 않고 PR 설명에 목록만.
주인 요청 (원문): "픽셀 애니메이션 만든 건 좋은데, 2프레임으로 짜여있어서 움직이는 느낌보다는 그냥 깜빡이는 느낌이고 눈이 피곤해."
먼저 읽기: docs/DIALOGUE_UI.md §5.6·§5.9 (이 카드의 표와 규칙 6개), docs/UI_ART.md, docs/TUTORIAL.md §5.1·§5.10, docs/ROOM_EXPANSION.md §5.9, docs/ACHIEVEMENTS.md §8.2·§9.1
1단계 — 지금 (CSS·새 그림만)
- ▼ 다음: 한 모양의 ▼ 가 아래로 0·1·2·1 px 통통 (2px 프레임은 1px 납작하게). next_bob.png 4프레임, 프레임당 180ms, 3바퀴 뒤 0번 프레임에서 멈춤. 새 줄이 오면 다시.
  css/ui-art.css 의 .ua-next 줄을 이것으로 바꾼다 (지금은 next.png ↔ next2.png 끝없이). next.png·next2.png 는 지우지 않는다.
- 정지 그림: 이름표 9-slice (frame_dialog 와 같은 나무), 📜 두루마리 icon.ui.backlog, 너 줄 icon.ui.hand.
2단계 — 물결 G 검증 커밋 (커밋 이름 '7물결') 이 기준 브랜치에 들어온 뒤 (js/ui-art.js 를 물결 G 가 고친다). 'WIP … 검증 전' 스냅샷으로는 시작하지 않는다.
  확인 (git fetch origin 뒤): 주 세션이 1단계 PR 에 적어 준 해시로 git merge-base --is-ancestor <해시> origin/ccr-38ad393e-15xr9t && echo 들어옴.
  해시가 없으면 git log origin/ccr-38ad393e-15xr9t --format=%s | grep -v -E 'WIP|검증 전' | grep -E '^(7물결|물결 G)' 가 한 줄 이상. 모르겠으면 1단계 PR 에 묻는다.
- 하트: 5프레임 한 번 (작게 → 크게 → 눌림 → 크게 → 흐려짐), 1px 계단으로 떠오름. 기본 1개 (지금 2~3개). 2개는 opts.n 으로 받게만.
- zzz: 4프레임 (z 가 1px 씩 커지며 오른쪽 위로). 잠든 직후 3번, 그 밖에는 12초에 한 번 (지금 2초마다). '쓰다듬으면 1번'은 app.js 쪽 부름이라 PR 설명에.
- 반짝 (새 앨범 카드): 그림 그대로, 프레임당 150ms, 모서리마다 한 번만 (지금은 83ms 로 1초 동안 되풀이).
- 그림과 코드 (프레임 수 · background-size · FX 표) 는 한 커밋에 바꾼다 (DIALOGUE_UI §5.9 규칙 6 — 그림만 바뀌면 반쪽 그림이 보인다).
지킬 것: 한 동작 4~6프레임 · 프레임당 120~250ms · 반복은 3바퀴 뒤 멈춤 · 동시에 도는 반복은 한 화면에 2개·대사창 둘레 1개 · 정수 px·steps()
  · '동작 줄이기'면 멈춘 한 프레임 · Apollo 팔레트 · 프레임 비용 늘리지 않기.
그 뒤 할 일 (같은 세션, 순서대로, 하나씩 새 PR, 같은 생성기·manifest 규칙). 각 PR 은 주 세션이 맡는 파일 목록을 준 뒤에 시작한다 (아래 경로는 예상):
1. 안내 요정 '윤슬' (결정 2) — TUTORIAL §5.10 '그림 부탁' 그대로: 얼굴 16×16 × 2표정 (보통·웃음) + 둥실 4프레임 띠, 핀 8×8 3프레임.
   은빛 흰색·물빛 파랑, 호박색 안 씀, 방 안엔 몸 없음 (§5.1). 파일 assets/ui/guide-*.png. 쪽지 카드는 지금 있는 frame_paper.png 를 쓴다 (새로 안 그린다).
   같은 부탁의 자리 꺾쇠 4프레임·2D 공 8×8 은 v1 이라 이번엔 뺀다.
2. 배지 12장 (24×24, assets/badges/) · 리본 · 금빛 조개 동전 아이콘 (8×8·16×16) — ACHIEVEMENTS §8.2·§9.1 v0-2.
   같은 v0-2 의 대표 판·배지 소품 2개 (배웅 종·조약돌 병) 는 이번엔 뺀다 (어디에 어떤 꼴로 둘지 주 세션에 묻는다).
3. ROOM_EXPANSION §5.9 그림 표 그대로: ◀ ▶ 장소 버튼 (16×16 멈춘 그림 + 첫 등장 4프레임: 가로 0 → 1 → 2 → 1px, 3번 뒤 멈춤) · 큰 먼지 (32×24, 6프레임)
   · 2D 옆방 판·구멍·천·망치·판자 (320×240 / 24×44 / 26×46 / 8×8 / 16×6). 3D 소품은 그림 파일이 없다 (scene3d 가 코드로 만든다).
검수: 전/후 GIF (360×740, 픽셀 글꼴 켬) — ▼·하트·zzz, '동작 줄이기' 캡처 한 장, docs/shots/ui-anim/.
  생성기를 돌린 뒤 git status 에 목록 밖 파일 0개. npm test 초록.
멈춤: 1단계 (▼ 4프레임 · 이름표 · 두루마리 · 손 그림 + .ua-next 줄) 와 그 검수가 끝나면 draft PR (ui/anim-frames → ccr-38ad393e-15xr9t) 을 열고 멈춘다.
  2단계는 주 세션이 PR 에 '7물결' 해시를 적어 준 뒤 같은 PR 에, '그 뒤 할 일' 은 맡는 파일 목록을 받은 뒤 하나씩 새 PR 로. 목록 밖 그림·코드로 넓히지 않는다.
```

---

## 카드 13. 대사창 프로토 — 한 줄씩 넘기는 대사창과 대사 다시 보기 (2026-11-07 추가, 새 파일만)

언제: **지금** (새 파일만이라 바로. 14·15 보다 먼저 건넨다) · 크기 **S~M** (ROADMAP 1단계) · 본 게임 잇기(v1 → v1.1 → `meet`·`chat`)는 같은 세션이 app.js 열쇠 차례(3~8일째)에 한다.

```text
카드 13. 대사창 프로토 — 한 줄씩 넘기는 대사창과 대사 다시 보기 (DIALOGUE_UI v0, 2026-11-07, 새 파일만)
브랜치: proto/dialogue
맡는 파일 (이 카드만 고친다, 모두 새 파일): dialogue.html, js/dialogue.js (엔진, 전역 DLG), js/dialogue-bench.js (시험대 전용),
  css/dialogue.css, tools/test-dialogue.js, docs/DIALOGUE_PROTO.md, docs/shots/dialogue/
먼저 읽기: docs/DIALOGUE_UI.md 전부 (특히 §3.1 목소리 셋 · §4.1~4.2 · §5.1~5.11 · §6 의 v0 줄과 새 검사 J · §7)
  docs/MODEL_VOICE.md §3·§5 · docs/PROTOCOL.md §1 사건 모양 · js/brain.js 의 BRAIN.plan 과 tools/smoke.js 가 그것을 부르는 모양
  · css/ui-art.css 의 frame_dialog 9-slice · assets/ref/ui-ref-portrait-dialog.jpg · 주 세션의 가짜 js/dialogue-stub.js (모두 읽기만)
목표: 쌓이는 로그 대신 "한 번에 한 줄, 눌러서 넘기는 사각 대사창 + 📜 대사 다시 보기"를 따로 노는 한 장으로 만들어 폰에서 손맛을 본다 (DIALOGUE_UI v0).
  js/dialogue.js 는 v1 에서 본 게임에 그대로 얹을 엔진이다. 내장 산책·토글·가짜 목소리는 js/dialogue-bench.js 에만 둔다.
- 공개 API (얼림: 이름·인자·돌려줌·뜻은 안 바꾸고 선택 칸만 더한다, 모르는 칸은 무시. 함수 length = 표의 인자 수. js/dialogue-stub.js 도 이 표) — 이름 | 인자 | 돌려줌 | 단계 | 뜻
  DLG.init(host, opts) | opts { portrait(expr) → img·canvas, name() → 이름 } 선택 | 없음 | v0 | host 안에 #dbox 를 만든다, 두 번째는 무시 (안 부르면 body 끝에)
  DLG.say(line) | { voice:'octopus'·'house'·'user', text, by, expr, pace:'wait'(기본)·'flow', model, more } | Promise (값·reject 없음) | v0 (more 는 나중) |
    다 나온 뒤 톡 · flow 는 읽는 시간 (§5.5) · 다시 보기로만 감 → 풀린다, 마지막 줄은 그래도 남는다. user·빈 text 는 바로 풀림. by 없는 octopus 는 house 줄. text·by·model 은 받은 그대로
  DLG.ask(q) | { voice, by, text, choices:[{ id, label }] 2~3개, cancel, chips } | Promise<id · cancel 값 · null> | v1.1 | 차례가 오면 글 + 단추, 넘기기 숨김.
    단추 → id, Esc → cancel (없으면 질문이 남음), 상자·바깥 톡 → 아무 일 없음, 새 ask 면 앞 것은 null. 고른 것은 부르는 쪽이 say({ voice:'user', by:'user' })
  DLG.endAsk() | 없음 | 거둔 게 있었으면 true | v1.1 | 떠 있거나 기다리는 질문을 거둔다 → 그 ask 는 null (건너뛰기·뽈뽈 다녀와가 시작될 때 부르는 쪽이, §4.5)
  DLG.hold(on) | true·false | 없음 | v0 | 켠 동안 타자·읽는 시간·톡 넘김이 멈춘다 (say 도 안 풀림, 선택 단추는 눌림). 끄면 멈춘 데서 잇는다. 세지 않는다
  DLG.open() | 없음 | 없음 | v0 | dialog#backlog 를 연다 (맨 아래, 보여 준 줄까지만). Esc·바깥·닫기 → 포커스는 button.dlg-log (📜)
  DLG.current() · pending() | 없음 | { voice, text, by, page, pages } 또는 null · 수 | v0 | 지금 줄 사본 (text 는 전체 원문, page 는 1부터) · 남은 대기열 수 (질문 포함)
  html[data-ui-busy] | 공백으로 나눈 낱말 | | v0 | 대사창은 'dlg' 만 넣고 뺀다 (타자 중·질문·다시 보기·hold), 안내는 'guide'. 남의 낱말은 그대로, 비면 속성을 지운다
  DOM | #dbox (role=group) 안 button.dlg-next 넘기기 · button.dlg-log 📜 (aria-haspopup=dialog) · button.dlg-choice 글 = label (v1.1) | | v0 | 테스트가 쓴다
- 초상: portrait(expr) 는 그림 원본(img 또는 canvas)을 돌려준다. 엔진은 그것을 DOM 에 붙이지 않고, 줄마다 자기
  <canvas class="lport-cv" width=64 height=64 data-expr=…> 에 drawImage 로만 그린다 (v1 의 APP.portraitFor 는 공유 캐시 캔버스라 옮기면 안 된다).
  시험대는 assets/oct/idle.svg·happy.svg (48×48) 를 64px 칸에 1배로.
- 목소리 셋 (§3.1): 문어 = 초상 + 이름표 '뚜루 · 데모 규칙' (출처는 안 줄인다). 집 = 초상 없음, 흐린 글자, 16px 사건 아이콘 (assets/icons/log/*.png).
  너 = 다시 보기에만. 판 색은 목소리마다 바꾸지 않는다. voice:'octopus' 인데 by 가 없으면 집 줄로 떨어진다.
- 문어 줄은 문 하나로만 들어온다: 시험대의 choose(point, facts) → Promise<{ action, line?, expr? } | null>.
  지금은 데모 규칙 — 내장 산책의 remember.line 과 첫인사 "안녕, 나는 뚜루야." 를 글자 그대로, by:'demo-rules'.
  wrap_up.line 이 없으면 마무리 문어 줄은 없다 — 지어 넣지 않는다. 나중엔 모델 원문 그대로 by:'model'.
  엔진은 받은 글을 고치거나 줄이거나 채우지 않는다. null·시간 넘김이면 문어 줄 없음 (기록만 by:'fallback').
- 쪽 (§5.2): 3줄 한 쪽, 어절 경계에서 넘김, 한 줄보다 긴 어절(URL)만 쪼갬. 쪽을 이어 붙이면 원문과 같다.
- 타자기 (§5.3): 45ms/글자와 쉼표·마침표·… 쉼, Intl.Segmenter (없으면 Array.from), 쪽을 먼저 깔고 남은 글만 visibility:hidden, rAF 누적 시간, 커서 없음.
  상태 칩이 붙은 기록 줄(출발·기웃·포스터·요약)은 한 번에 나타난다.
- 누르기 (§5.4) · 저절로 넘김과 대기열 (§5.5): 흐르는 줄 / 기다리는 줄, 읽는 시간 공식 하나, 3개·5개·6개 초과 규칙 (문어 줄은 건너뛰지 않음), 건너뛰기, 자리 비움, hold.
- ▼ 는 다음이 있을 때만. 0·1·2·1px 4프레임 3바퀴 뒤 멈춤 (next_bob.png 는 아직 없다 → assets/ui/next.png 한 장을 CSS 2px 계단으로).
  … 는 산책 중 1.5초 뒤 멈춘 채로 (§5.6). 끝없이 도는 것 0개.
- 기웃 줄은 글리프 + 단어 (✓ 읽음 · 📖 책장 메모 · ◌ 모의 방문 · ✕ 못 읽음 · ◌ 앉아만 있었음), 빨강 없음. 기웃 메모는 집이 따옴표 + 출처 꼬리표로 (§4.2).
- 크기 (§5.1): 픽셀 글꼴 Galmuri9 20px/30·3줄·130px, 폭 ≤340px 은 Galmuri7 16/24·112px, 시스템 글꼴 16/24. 높이 고정 — 줄이 바뀌어도 아래 단추가 안 움직인다.
  이름표는 왼쪽 위 테두리에 8px 걸침, 📜 는 오른쪽 위 테두리 (보이는 28px, 누르는 곳 44×44). 장면 자리엔 assets/bg/room.svg 를 정수 배로.
- 다시 보기 (§5.10): <dialog id="backlog" class="sheet">, 글 위주, 문어 줄만 32px 초상 + '데모 규칙 · 15:13', 열면 맨 아래, 산책 중엔 보여 준 줄까지만, ▼ 없음,
  Esc·바깥·닫기 → 포커스는 📜 로. 주 세션이 곧 지난 날 줄을 앨범 '일기' 탭으로 옮기니 오늘 줄만 둔다 (지난 날 묶음은 안 만든다).
- 모양 빌리기: dialogue.html 은 css/style.css·css/ui-art.css 를 읽기만으로 링크해 .sheet·테두리 모양을 빌린다.
  css/dialogue.css 는 #dbox·#backlog·.dlg-* 선택자만 쓰고 .sheet 를 다시 정의하지 않는다 (v1 에서 본 게임 시트가 다 바뀐다). 본 게임 .dlg-top 도 안 건드린다.
- 화면 낭독기 (§5.7): #dbox role=group, 타자 글은 aria-hidden, 숨긴 aria-live 칸에 줄마다 전체 글 한 번, 넘기기 <button> 은 선택 단추와 형제, 포커스를 빼앗지 않는다.
- 동작 줄이기 (§5.8): 타자 없음·즉시·멈춘 ▼, 읽는 시간은 그대로. matchMedia + 시험대 토글.
- 시험대: 토글 자리 붙이기/걸치기 (§8-1) · 속도 45/70ms · 동작 줄이기 · 픽셀/시스템 글꼴, [건너뛰기] 단추.
- 내장 산책: dialogue.html 이 js/world.js·js/brain.js 를 읽기만으로 싣고, 고정 시드·now·state, online:false, hint:'', by:'demo' 로
  BRAIN.plan 을 한 번 돌려 만든다 (외출이 나오는 시드를 골라 둔다). 그래야 이름표 '데모 규칙'이 참이다.
  PROTOCOL 예시는 모양 참고만 한다 — 사람이 쓴 글이라 내장하면 '데모 규칙'이 거짓이 된다. depart.hint 는 화면에 안 낸다 (결정 18).
  여는 줄은 기다리는 줄 둘: 집 "좋은 아침. 뚜루는 창가에 있어." → 집 메모 인용 (?open=meet 이면 문어 첫인사, 초상 happy). 집 줄 글은 §3.3·§4.3 표 그대로.
- ?voice=fake (시험용): 화면 위에 '시험용 가짜 모델 — 진짜 모델 아님' 띠를 늘 두고, 이름표는 '뚜루 · 모델(시험용)' (by:'model', model:'fake').
  300자 줄 · 문어 줄 0개 산책 · null 을 흘린다.
하지 말 것:
- 잠금 파일 수정 (공통 규칙 11-07 목록. 특히 js/app.js · js/brain.js · js/world.js · index.html · css/style.css · css/ui-art.css · js/ui-art.js
  · assets/ui/ · package.json · .github/ · vendor/fonts/ · docs/DIALOGUE_UI.md · docs/PROTOCOL.md · js/dialogue-stub.js).
- 다음 단계 일: #log 옮기기·app.js 훅 5곳·?dlg=0 (v1), DLG.ask·endAsk·대화 칩·josa·문구 옮기기·S.talk (v1.1), meet·chat 모델 연결 (1½), lineOf·필터 (v2), 덧쪽 more.
- 문어 목소리에 코드 문장이나 시키는 말 ("눌러", "해 봐", "골라 봐", "적어 줘"). 톡·쓰다듬기 혼잣말을 대사창·다시 보기에 넣기.
- 깜빡이는 커서, 📜 에 '안 읽은 줄' 점·배지, localStorage 'ppolppol_v2'·'ppolppol_ui' 읽기·쓰기, Math.random, 새 그림·소리 (UI 아트·소리 세션 몫).
검수:
- tools/test-dialogue.js (Playwright, 360×740 hasTouch, http 와 file:// 둘 다. http 서버는 tools/test-play.js 처럼 node http 로, chromium.launch() 는 옵션 없이)
  — 새 검사 J 중 시험대로 잴 수 있는 것:
  손대지 않고 산책 한 번 → 마지막 줄만 남고 pending 0 · 글 나오는 중 톡 → 바로 다 보임 · 대사창 높이와 아래 단추 위치 변화 0 ·
  300자 줄의 쪽을 이어 붙이면 원문과 같음 · 문어 줄 없는 산책 → 대사창 문어 줄 0 · by 없는 문어 줄은 집 줄 · 기웃 상태 단어가 대사창·다시 보기 둘 다 ·
  이름표 '데모 규칙' · 다시 보기 Esc → 포커스 📜 · 라이브 칸은 줄마다 한 번 · 동작 줄이기에서 다음 프레임에 글 전부 + ▼ getAnimations() 0,
  보통이면 ▼ 가 약 3초 뒤 멈춤 · 320×568·360×640·412×915 가로 스크롤 0 · 콘솔 오류 0.
- node tools/test-dialogue-stub.js js/dialogue.js --css css/dialogue.css --level v0 초록 (주 세션 파일이라 고치지 않는다. v1.1 은 --level 없이).
- grep: 새 코드에 Math.random 0건, 문어 목소리 글에 시키는 말 0건. npm test 초록 (새 테스트는 CI·package.json 에 넣지 않는다).
- 화면 글자는 html 이 아니라 js 에 둔다 (부분 글꼴 도구는 js·css·index.html 만 센다). subset-fonts.py --check 가 stale 이면 먼저 글자를 바꿔 본다
  (시험대 전용 글은 짧게). 꼭 필요한 글자면 PR 설명 첫 줄에 「글꼴 점검 빨강: 새 글자 N자 (목록)」 — 그때 CI '글꼴 점검' 빨강은 예상된 일이다.
  vendor/fonts/ 를 다시 만들거나 글을 html 로 옮겨 피하지 않는다.
- docs/DIALOGUE_PROTO.md: 캡처 3장 (붙이기·걸치기·다시 보기 → docs/shots/dialogue/), 실제로 잰 한 줄 글자 수 (§5.1 표는 어림), §7 중 시험대로 볼 수 있는 줄 체크리스트.
멈춤: v0 시험대와 위 검수가 끝나면 draft PR (proto/dialogue → ccr-38ad393e-15xr9t) 을 열고 멈춘다. 다음 단계 일·얼린 표 바꾸기는 하지 않고 PR 설명에 제안으로만 적는다.
다음 (지금 하지 않는다. 주 세션이 app.js 열쇠를 넘기면 이 세션이 이어 한다):
- v1 (3일째쯤): #log 를 다시 보기로 옮기기, 훅 5곳 (§6 표), ?dlg=0, 테스트 고침. v1.1 (4일째쯤): §4.3 문구표·josa·데모 첫인사·DLG.ask·endAsk·돌아와서 대화 두 차례·S.talk.
- 1½ (8일째쯤): 결정 지점 meet·chat 를 모델 말로 (MCP 서버, DELEGATION_BRIEFS 카드 9). 지금은 PR 설명 끝에 v1 에 넣을 줄 목록 (파일·함수 이름·데이터 모양) 만 적는다.
```

---

## 카드 14. 안내 시험대 — 처음 누르면 그 단추만 비추는 윤슬 쪽지 (2026-11-07 추가, 새 파일만)

언제: **지금** (스텁·얼린 표가 기준 브랜치에 오르고 13 을 건넨 뒤 바로. 13 이 끝나길 기다리지는 않는다) · 크기 **M** (ROADMAP 1단계, TUTORIAL v0a. 덤은 v0a 가 다 된 뒤) · 본 게임 잇기(v0b `?tut=1`)는 같은 세션이 app.js 열쇠 차례에 한다 — 열쇠 차례표 3~8일째 칸에서 대사창 v1·v1.1·1½ 잇기 다음, 주 세션이 열쇠를 넘길 때.

```text
카드 14. 안내 시험대 — 처음 누르면 그 단추만 비추는 윤슬 쪽지 (TUTORIAL v0a, 2026-11-07, 새 파일만)
브랜치: proto/guide
맡는 파일 (이 카드만 고친다, 모두 새 파일): guide.html, js/guide.js (비춤 엔진, 전역 GUIDE), js/guide-bench.js (시험대 전용),
  css/guide.css, tools/test-guide.js (v0a 몫), docs/GUIDE_PROTO.md, docs/shots/guide/
먼저 읽기: docs/TUTORIAL.md 전부 (특히 §3.2 2단계 · §3.4 · §3.6·§3.7 쪽지 표 · §4 · §5.1~5.5 · §5.7~5.10 · §5.13 · §6 v0a 줄과 자동 점검)
  docs/DIALOGUE_UI.md §3.2 (화면 자리) · §5.9 (움직임 규칙) · §5.11 · docs/OWNER_DECISIONS.md 결정 2·4·5 · docs/NIGHT_LOG.md 결정 15·18·21 · index.html 이름 창 (읽기만)
목표: "단추를 처음 누르면 그 단추만 밝히고 윤슬 쪽지, 밝은 단추를 한 번 더 누르면 동작"을 가짜 단추로 만들어 폰에서 비춤 손맛을 본다 (TUTORIAL v0a).
  js/guide.js 는 v0b 에서 본 게임에 그대로 얹을 엔진이다. 가짜 화면·가짜 문어·이름 카드는 js/guide-bench.js 에 (이름 카드는 v0b 에서 js/tutorial.js 로 옮긴다).
- 엔진 (§5.7): GUIDE.init({ storeKey, name, quiet }) · GUIDE.register(id, { target, text, mode }) · GUIDE.ready(id) · 켬/끔 · 본 표시 · 단추 둘러보기.
- 저장: storeKey 아래 JSON 객체에서 자기 칸 (§5.8 의 guide·tips 등) 만 읽고-고쳐-쓴다. 다른 칸은 건드리지 않는다
  (v0b 가 넘길 'ppolppol_ui' 에는 app.js 의 화면 설정이 같이 있다). 시험대 열쇠는 'ppolppol_guide_bench' 하나.
  'ppolppol_ui'·'ppolppol_v2' 는 읽지도 쓰지도 않는다. 저장을 못 쓰면 (개인 정보 보호 창) 메모리에만.
- 처음 누를 때 (§3.6·§5.7): 캡처 단계 click (Enter·Space 같게). 단추마다 딱 한 번, 조용한 때와 상관없이 뜬다 (§5.7 의 '조용한 때면' 보다 §3.6 이 이긴다).
  꺼진 단추엔 안 뜸. '의식 중' 흉내 토글이 켜져 있으면 바로 동작.
- 비춤 (§5.2): 잉크 72% 덮개 (Apollo 가장 어두운 색), 대상 둘레 6px 구멍 (픽셀 테마는 2px 계단 모서리), 2px 크림 테두리 4프레임 240ms 뒤 멈춤,
  들어올 때 4계단 160ms · 나갈 때 2계단 80ms. 구멍 안은 진짜로 눌리고, 바깥 톡은 카드만 닫고 아래로 안 넘긴다. 고대비면 Highlight 3px 테두리.
- 쪽지 카드: assets/ui/frame_paper.png 9-slice (읽기만), 왼쪽 윤슬 얼굴 32px, Galmuri7 16px · 줄간 1.65 · keep-all, 폭 280px 이하 · 좌우 16px 안,
  넓은 쪽에 6px 꼬리, [알겠어] 44px + 글씨만 작은 [안내 그만 볼래] (누르는 곳은 둘 다 44×44 이상). ▼ 없음.
- 윤슬 (결정 2): 이름은 상수 하나. 얼굴 그림은 아직 없다 (UI 아트 세션이 assets/ui/guide-*.png 를 그린다) →
  은빛 흰색·물빛 파랑 (Apollo, 호박색 금지) 으로 코드가 그린 16×16 자리표시. 방 안에 몸이 없다.
- 줄 세우기와 조용한 때 (§5.3): 조건 다섯, 첫날 밖은 방문당 2개 · 90초 간격 · 줄 3개, '봤다' = 1.5초 넘게 보임 또는 사람이 닫음. 시계는 ?speed= 로 당긴다.
- 쪽지 글 전부 (§3.6·§3.7) 를 글자 그대로 등록한다. hint 는 뺀다 (결정 18). pin 은 §3.4 v0 줄 "뚜루가 가져온 첫 종이야. / 핀을 톡 꽂아 줄래?",
  face 는 글이 아직 없어 등록하지 않는다. 쪽지마다 대상 가짜 단추 (pet 은 가짜 문어):
  상태 줄 [이름 + 늘 있는 작은 '데모' 꼬리표 (결정 4)] [등불] [🔈] [앨범 아이콘], 대사창 #dbox·📜 button.dlg-log (DLG.init 이 만든 것), [🌧 뽈뽈 다녀와],
  [방 보기 = 집 아이콘], 산책 중 [건너뛰기], 📷 🪴 배지. 대상 단추가 없는 쪽지 (together·table·mine·place·pin) 는 안내 모음에만 싣는다.
  📜 button.dlg-log 는 #dbox 안에 있다 — 톡은 가장 안쪽 대상 것으로 친다 (📜 톡은 backlog, 그 밖 대사창 톡은 box). box 를 비추는 중 📜 톡도 backlog 톡이다.
  앨범은 🔈 옆 아이콘, 방 보기는 집 아이콘이다 (주 세션이 곧 바꾼다). 등불 쪽지 첫 줄은 "초대한 날마다 한 칸 켜져." (주 세션이 곧 넣는 등불 칸 톡 말과 같게).
- 가짜 단추마다 시험대 가짜 상태 S0 (walks·lantern·posters·sound 같은 수, 메모리에만) 를 바꾸는 동작을 둔다. 검사는 S0 로 잰다 (대사창·📜 은 DLG.current()·dialog#backlog 로).
- 이름 넣기: 쪽지의 '뚜루' 자리엔 이름이 들어간다. GUIDE.josa 는 이야/야 · 은/는 · 이/가 · 을/를 (DIALOGUE_UI §4.3 규칙에 "뚜루를" 때문에 을/를 더함).
- 이름 카드 (§3.2 2단계): 모달 아님, label 붙은 이름 칸 (16px), 색 6개 라디오, 정직 문구는 지금 이름 창 글 그대로 "지금은 미리 만든 규칙으로 / 움직이는 체험판이야."
  [아무 이름이나] = 짧은 목록에서 hash('name|' + 날짜키 + '|' + 처음 연 시각). ✕·Esc 로 닫으면 [이름 짓기] 종이 탭이 남는다.
- 방 보기 › 안내 흉내 (§5.4): [처음 안내 다시 보기] (단추 둘러보기: 눌러도 동작 없음 · "둘러보는 중 · 눌러도 괜찮아" · [그만]), [켬/끔], [버튼 안내 처음부터],
  안내 모음, 숨은 조작 보기 (접힘). 오른쪽 위 [안내 건너뛰기] 탭 (44px) + 토스트 "안내는 방 보기 › 안내에서 다시 켤 수 있어."
- 화면 읽기 (§5.9): 포커스는 밝힌 단추 + aria-describedby 로 쪽지, 알림 칸엔 안 보냄, 탭은 셋 안에서만, Esc. 동작 줄이기 (§5.10): 덮개·테두리·카드 바로, 윤슬 둥실 없음.
- 대사창 (DLG): DIALOGUE_UI §5.11 끝 '얼린 표 (11-07)' 에 있는 이름만 부른다. window.DLG 가 없을 때만 js/dialogue-stub.js 를 싣는다 (guide.html 은 스텁만
  — 카드 13 v0 엔진엔 ask 가 없다). 스텁은 기준 브랜치의 주 세션 파일이라 고치지 않고, 자기 가짜 대사창도 만들지 않는다. 쪽지 동안 DLG.hold(true).
  밝힌 단추를 다시 누르면 쪽지를 닫고 DLG.hold(false) 뒤 그 톡을 그 단추에 그대로 보낸다 (hold 중엔 대사창 톡 넘김이 멈추니까).
  html[data-ui-busy] 는 이유 낱말 목록 — 자기 낱말 'guide' 만 넣고 빼고, 비면 지운다.
- 소리 (TUTORIAL §5.11): audio/ 는 쓰지 않는다. 쪽지가 뜰 때·닫힐 때 window.AUDIO && AUDIO.on && AUDIO.on('guide', { act: 'open' | 'close' }) 만 부른다.
  지금 js/audio.js 의 on(name, d) 은 모르는 이름을 그냥 넘긴다 — 소리 세션이 case 'guide' 를 더하면 난다. js/audio.js 는 고치지 않는다.
- 덤 (v0b 미리보기 — 위 v0a 와 그 검사가 다 된 뒤에만):
  · 문어 쪽은 문 하나로만: 시험대의 choose(point, facts) → Promise<{ action, line?, expr? } | null>. 지금은 데모 규칙 (이름 정함 → '!' + 폴짝,
    첫인사 "안녕, 나는 {이름}{야/이야}." 를 DLG.say({ voice:'octopus', by:'demo-rules', expr:'happy' }) 로. 이름표는 DLG.init 의 name 으로 DLG 가 단다).
    나중엔 모델 원문 그대로. null·8초 넘김이면 가만히, by:'fallback'. facts 에 tut·tips·firstPin·윤슬 말을 넣지 않는다 (§4-6).
  · 이미 놀던 사람 (결정 5): ?who=returning 이면 첫인사 한 번 → 윤슬이 DLG.ask (voice:'house') 로 "단추마다 처음 누를 때 한 줄씩 알려 줄까?" [응, 알려 줘] [괜찮아].
    고른 것은 DLG.say({ voice:'user', by:'user' }). [괜찮아] 와 [안내 그만 볼래] 는 따로 저장한다 ([괜찮아] 여도 새 기능 첫 안내는 뜬다, §5.5). 정한 저장 모양을 문서에.
  · ?voice=fake (시험용): 화면 위에 '시험용 가짜 모델 — 진짜 모델 아님' 띠를 늘 둔다. 문어 줄은 DLG.say({ voice:'octopus', by:'model', model:'fake', text }) 로 넘긴다.
    80자 줄도 받은 그대로 넘긴다 (쪽 나누기·이름표 글은 DLG 몫). DLG.current().text 가 원문과 같아야 한다.
하지 말 것:
- 잠금 파일 수정 (공통 규칙 11-07 목록. 특히 js/app.js · index.html · css/style.css · css/ui-art.css · assets/ui/ · package.json · .github/ · vendor/fonts/
  · docs/TUTORIAL.md · js/intro.js · js/dialogue-stub.js).
- 다음 단계 일: 첫날 흐름 0~8단계 상태 기계 · S.tut · 첫 핀 · 공 · 2D · app.js 연결 (v0b 이후), 모델 meet 연결 (v2, MCP 서버 쪽).
- 출석·재촉 쪽지 ("오랜만이야", "N일째", "오늘 아직 안 불렀어"), 윤슬이 문어 마음을 말하기 (§4-8), 끝났다고 알리는 쪽지, 점수·"잘했어"·타이머.
- 문어 입에 '눌러'·'해 봐'·'단추'·'버튼'. 시드·두뇌 입력에 안내 상태 넣기. Math.random. 새 그림·소리 (UI 아트·소리 세션 몫).
검수:
- tools/test-guide.js (Playwright, 360×740 hasTouch, http 와 file://. http 서버는 tools/test-play.js 처럼 node http 로, chromium.launch() 는 옵션 없이)
  — TUTORIAL §6 자동 점검 중 v0a 몫:
  첫 클릭 = S0 변화 0 + 비춤, 두 번째 = S0 +1 (키보드도) · 의식 중엔 첫 클릭도 바로 동작 · 꺼진 단추 안 뜸 · 바깥 톡은 카드만 닫고 S0 변화 0 ·
  방문당 2개 · 90초 · 줄 3개 · '봤다' 1.5초 · 새로고침 뒤 본 쪽지 안 뜸, [버튼 안내 처음부터] 뒤 다시 뜸, 끔이면 안 뜸 · 둘러보기 앞뒤 S0 차이 0 ·
  저장 칸에 미리 넣어 둔 낯선 칸 {theme:"x"} 가 끝까지 그대로 · 이름 없이 닫아도 한 번 톡으로 카드 · [아무 이름이나] 같은 시드면 같은 이름 ·
  쪽지·이름 카드·방 보기 › 안내의 모든 단추 누르는 곳 ≥44×44 · 포커스·aria-describedby·탭 셋·Esc · 📜 첫 톡은 backlog 쪽지 (box 아님) ·
  줄이기에서 애니메이션 0, 보통이면 3초 뒤 움직이는 것 0 · 320×568 가로 스크롤 0 · 콘솔 오류 0 · 가짜 window.AUDIO 에 쪽지 뜰 때·닫힐 때 AUDIO.on('guide') 한 번씩.
  덤을 했으면: returning 자동 비춤 0 · button.dlg-choice 2개 · 가짜 모델 null → 가만히 + fallback · 80자 줄 DLG.current().text 원문 그대로 · facts 에 tut·tips·firstPin 키 0.
- grep: 윤슬 문구에 §4-8 낱말·출석 낱말 0, 문어 입 문구에 '눌러'·'해 봐'·'단추'·'버튼' 0, 새 코드에 Math.random 0.
  axe-core 는 npm install --no-save 로 얹을 수 있으면 돌려 위반 0 (package.json·잠금 파일은 그대로). 안 되면 role·aria 를 테스트가 직접 본다.
  새 파일에 window.DLG 대입 0건 (대사창은 스텁만). git diff 에 js/dialogue-stub.js 0줄. npm test 초록 (새 테스트는 CI·package.json 에 넣지 않는다).
- 화면 글자는 js 에 둔다 (html 은 부분 글꼴 도구가 안 센다). subset-fonts.py --check 가 stale 이면 먼저 글자를 바꿔 본다 (시험대 전용 글은 짧게).
  꼭 필요한 글자면 PR 설명 첫 줄에 「글꼴 점검 빨강: 새 글자 N자 (목록)」 — 그때 CI '글꼴 점검' 빨강은 예상된 일이다.
  vendor/fonts/ 를 다시 만들거나 글을 html 로 옮겨 피하지 않는다.
- docs/GUIDE_PROTO.md: 캡처 3장 (비춤+쪽지 · 이름 카드 · 방 보기 › 안내 → docs/shots/guide/), §7 중 시험대로 볼 줄 (쪽지 읽는 시간, 거슬림), 정한 저장 모양, 소리 세션에 넘길 표 (act·언제·느낌).
멈춤: v0a 와 그 검수가 초록이면 draft PR (proto/guide → ccr-38ad393e-15xr9t) 을 열고, 덤을 안 하면 멈춘다. 덤을 하면 같은 PR 에 더하고 그 검수까지 초록이면 멈춘다.
  '하지 말 것'의 다음 단계 일과 DLG 에 바라는 것 (얼린 표에 없는 이름·칸) 은 만들지 않고 PR 설명에 제안으로만 적는다.
다음 (지금 하지 않는다): 주 세션이 app.js 열쇠를 넘기면 (열쇠 차례표 3~8일째 칸, 대사창 v1·v1.1·1½ 잇기 다음) 이 세션이 v0b ?tut=1 — js/tutorial.js 첫날 흐름,
  app.js 연결 약 50줄 (§5.7), test-guide.js 나머지. 지금은 PR 설명 끝에 그때 넣을 줄 목록 (index.html 3줄, app.js 연결 자리, GUIDE.init 에 넘길 것) 만 적는다.
```

---

## 카드 15. 같이 가기 시험대 — 문 앞에서 고르고, 둘의 것을 나란히 (2026-11-07 추가, 새 파일만)

언제: **지금** (새 파일만. 결정 1·3 답 받음. 카드 7·8·13·14 를 기다리지 않고 시작 — 대사창은 주 세션 스텁, 나머지는 가짜) · 크기 **M~L** (ROADMAP 1단계) · 같은 세션이 나중에: v1 (`?together=1` 본 게임, 열쇠 차례표 3~8일째 칸의 끝 — 대사창 v1·v1.1·1½ 잇기·튜토리얼 v0b 다음) · v0.5 = 시험대 어댑터만 (CORE_LOOP_V2 §6, cook.html·swim.html 이 오면). 요리·헤엄 결과를 조개·배지로 잇는 일은 주 세션 9~10일째 (ROADMAP 2단계).

```text
카드 15. 같이 가기 시험대 — 문 앞에서 고르고, 둘의 것을 나란히 (CORE_LOOP_V2 v0, 2026-11-07, 새 파일만)
브랜치: proto/together
맡는 파일 (이 카드만 고친다, 모두 새 파일): together.html, js/together.js (로직, 전역 TOGETHER, DOM 없음 — node 에서도 로드),
  js/together-stubs.js (가짜 GUIDE·SWIM·COOK. 가짜 DLG 는 안 만든다), 화면 코드를 나누면 js/together-*.js, css/together.css,
  tools/test-together.js, docs/TOGETHER_PROTO.md, docs/shots/together/
읽기만: js/world.js, js/brain.js, js/palettes.js, vendor/fonts/galmuri.css, .claude/skills/cozy-web-game/scripts/prng.js,
  js/dialogue-stub.js (주 세션 것). 기준 브랜치에 js/guide.js 가 이미 있으면 카드 14 것이다 — 읽기만, 없으면 가짜로. js/dialogue.js 는 아래 '대사창' 줄대로
먼저 읽기: docs/CORE_LOOP_V2.md 전부 (특히 §3.1~3.6 흐름 표 · §3.4 순서표 · §4 원칙 · §5.1 훅 표와 '미니게임 끼우기 계약' · §5.2 저장 · §5.6 점검 · §6 의 v0 줄),
  docs/DIALOGUE_UI.md §5.5 (읽는 시간 공식) · §5.11 (끝의 '얼린 표 (11-07)'), docs/TUTORIAL.md §3.6·§3.7 (together·skip·table·swim·tray·pocket·wait_idle 글)
  · §5.7 (GUIDE), docs/OWNER_DECISIONS.md 1·3, docs/NIGHT_LOG.md 결정 18, tools/test-play.js (Playwright 꼴)
정해진 것 (주인 11-05): 같이 헤엄칠 때 누르면 '내 모습'이 움직인다 (결정 1) · 주운 것은 하나만 간직 (결정 3) · 기다리는 동안 산책 줄은 봉해 둔다 (기본값).
목표: 장면 없이 '한 줄 대화 상자 + 오버레이'로 문어 줄기와 사람 줄기를 나란히 재생한다 (CORE_LOOP_V2 v0). 주인이 폰으로 느낌을 본다.
- 산책 1건은 BRAIN.plan({ dateKey, seq, name, now, state, fetchWiki }) 로 계획한다. 힌트는 빈 글 (결정 18). now 는 그날 정오, 이름은 설정값으로 고정
  (시각이 집에 있을 확률을 바꾼다, brain.js stayProbability). 같은 ?date=&seq= 면 같은 산책. 계획한 trip 사본 (사람 키 없이) 을 ppolppol_together_v0 에
  넣고 새로고침 때 다시 계획하지 않는다 (진짜 위키 결과가 바뀌어도 S.user 의 stopIdx 가 같은 정류장을 가리키게). 둘 다 TOGETHER_PROTO.md 에 적는다.
- 빈 힌트의 BRAIN.plan 은 read·builtin·none 만 낸다 (방 66곳 모두 책장 메모가 있어 실패하면 builtin, 들판은 읽었을 때만 남는다).
  failed·simulated (문 앞까지만 → 문 앞 것) 는 손으로 만든 trip 묶음이나 BRAIN.replay(events, meta) 로 시험한다. 집에 있음·빈 차례는 window.__ppolTest.forceKind 로.
  위키는 클라우드 기본 환경에서 막힌다 (공통 규칙) → 테스트의 가짜 fetchWiki 는 window.__ppolTest.fetchWiki 로만 들어온다 (진짜 요청 0, 막힌 요청 콘솔 오류 0).
  가짜 글은 화면에 '(시험용 가짜 글)' 로 보이고 출처 줄도 '시험용' — 가짜 글에 '위키백과 · CC BY-SA' 를 달지 않는다 (캡처도 같다).
- 상태 none (느린 글의 방·편지의 방) 은 §3.2 표에 없다. note (brain.js 기본 문장) 를 그대로, 위키 출처 줄 없이 보이고 '문서와 다르게 한 것' 에 적는다.
- 문어가 먼저 정한다. 나감일 때만 문 앞 카드 (§3.1): 집 줄 + [같이 가기] [집에서 기다리기]. 크기·자리 같음, 미리 골라진 쪽 없음, 타이머 없음.
  고를 때까지 재생 시계만 문 앞에서 멈춘다. [건너뛰기] = 기다리기 (how:'skip'). 집에 있음·빈 차례는 묻지 않는다 (§3.5).
- 같이 가기 (§3.2): 가짜 헤엄 구간 (산책당 4번까지) → 기웃 판 = 집 상태 줄 + '어깨 너머' 글 (실제로 읽은 것만, §3.2 표) + 줍기 쟁반.
  주울 것은 방과 안 묶인 흔한 것, '조개' 이름 금지, 문 앞까지만 간 곳은 '문 앞 것'. 주우면 바로 저장. [건너뛰기]·[먼저 집에 갈래].
- 기다리기 (§3.3): [요리하기] [꾸미기] [그냥 두기]. 요리는 가짜 냄비 (멈춤·이어 하기·저장). 꾸미기는 시험대에 없으니 그냥 두기처럼 다락에 남는다 (문서에 적기).
  산책 줄은 봉해 두고 다시 보기엔 "다녀오는 중…" 한 줄. 돌아오면 구석 쪽지 [보러 가기] [조금 더].
- 다시 만나기 (§3.4 순서표): ① 봉해 둔 이야기 한 줄씩 → ② 주머니 (하나 간직 또는 [괜찮아]) → 두 카드 동시에 뒤집기 → ③ 걸기·등불은 자리 표시만
  → ④ 식탁 (요리가 있고 [식탁에 차리기]를 누를 때만. 데모 규칙이 eat·taste·save·watch·stop 에서 고르고 기호만) → ⑥ 잠 (아래 줄).
  ④′ 대화 · ④″ 넓히기 · ④‴ 옆에 앉기 · ⑤ 배지 틈은 다른 문서 몫이라 이름 붙인 빈 자리만 둔다.
- 돌아온 뒤 문어 자세는 이 카드의 다시 만나기 흐름이 정한다. ⑥ 잠 (자장가 자리) 은 밤 (19~6시, 기기 시각 new Date().getHours() — 조절값처럼 주소로 바꿀 수 있게, plan 의 now 와 따로)
  이나 trip.reaction 이 '졸림' 일 때만, 아니면 깨어 있다. §3.4 ④·⑥ (빈 차례 빼고 늘 잔다) 과 다르니 '문서와 다르게 한 것' 에 적는다. 본 게임이 끝마다 재우는 D-1 (PLAYTEST_FIXES §D 첫 줄, app.js finalPose) 은 주 세션 몫 (물결 G 예정).
- 집 줄·단추 글은 CORE_LOOP_V2 §3 표, 안내 한 줄은 TUTORIAL §3.6·§3.7 표의 글 그대로. 문어 이름 자리는 설정 하나 (예문 '뚜루').
- 연결 지점: TOGETHER 함수 이름은 §5.1 훅 표 그대로 (door · gap · stop · beforeRemember · reunion · skip · resume) + chat (④′ 빈 자리, §3.4 순서표).
  시험대 재생기는 app.js 대신 이 함수들을 부른다. 그래야 v1 에서 훅만 꽂는다. v1 에 넣을 app.js 줄은 문서에 표로만 적는다.
- 가짜 미니게임은 §5.1 계약 모양 그대로: SWIM.segment(el, { seed, ms, until, lead:'octopus', player:'me', homeLight, reduced }),
  COOK.start(el, { seed, resume }) → h.pause() · resume() · finish() · cut() · destroy(), result = { v:1, id, by:'user', game, status, ms, out }.
  헤엄 상태는 played · auto · cut · still (§5.2), out = {}. GUIDE.register·GUIDE.ready (TUTORIAL §5.7) 도 같은 이름으로 가짜. 카드 7·8·14 가 오면 가짜만 바꾼다.
- 대사창 (DLG): DIALOGUE_UI §5.11 끝 '얼린 표 (11-07)' 의 이름만 부른다 (init·say·ask·endAsk·hold·open·current·pending. DLG.subscribe 등 표 밖은 제안으로만).
  window.DLG 가 없을 때만 js/dialogue-stub.js 를 싣는다. js/dialogue.js 에 ask 가 생기는 v1.1 까지는 스텁만 (카드 13 v0 엔진엔 ask 가 없다). 스텁은 고치지 않고,
  자기 가짜 DLG 도 안 만든다. 문 앞은 DLG.ask (choices 둘, 고른 것은 DLG.say({ voice:'user', by:'user' })), [건너뛰기] 는 DLG.endAsk() 뒤 기다리기로.
- 저장: 키 ppolppol_together_v0 하나. S.user (items · tracks · pot) · S.table 모양은 §5.2 그대로, 기록마다 by. 바뀔 때마다 바로 저장.
  새로고침 = 중간에 닫기. §3.6 표대로 이어지고, 다시 만나기는 정확히 한 번 열린다. 대신 골라 주지 않는다.
- 조절값 (정류장 5~8초 · 헤엄 8~12초 · 펼쳐 보면 최대 6초 더) 은 한 곳에 모아 주소로 바꿔 볼 수 있게.
- 화면 구석에 작게 '데모 규칙', 문어 줄엔 by 꼬리표. '동작 줄이기'면 헤엄은 그림 한 장 (still), 카드는 크로스페이드.
그림: 새 그림 파일 없음. Apollo (js/palettes.js) 로 코드가 그린 자리표시, 움직임은 CORE_LOOP_V2 §5.4 표 그대로 (반짝·뒤집기·선택 단추 그림은 UI 아트 몫).
소리: audio/ 는 쓰지 않는다. 그 순간마다 window.AUDIO && AUDIO.on && AUDIO.on('together', { act }) 한 줄만 (js/app.js 와 같은 훅, AUDIO.sfx 는 없다).
  지금 js/audio.js 의 on(name, d) 은 모르는 이름을 그냥 넘긴다 (switch 의 default) — 소리 세션이 'together' 를 더하면 난다. js/audio.js 는 고치지 않는다.
  act: 'door' 문 앞 멈춤 · 'pick' 줍기 · 'meet' 다시 만나기 · 'flip' 두 카드 뒤집기 · 'table' 식탁에 접시 · 'note' 구석 쪽지 (안내 쪽지는 카드 14 의 'guide').
  가짜 헤엄·냄비는 부르지 않는다 ('swim'·'cook' 은 카드 7·8 몫). TOGETHER_PROTO.md 에 소리 세션에 넘길 표: 이벤트 · act · 언제 · 느낌 (CORE_LOOP_V2 §5.5).
하지 말 것:
- localStorage 'ppolppol_v2'·'ppolppol_ui' 읽기·쓰기, APP·S 건드리기, 본 게임 파일·js/dialogue-stub.js 수정 (훅은 적기만).
- 사람 키 (mode · track · pocket · user · dish · keep) 를 문어 trip 사본에 넣기. 사람 쪽 일을 BRAIN.plan 입력·시드에 넣기.
  사람 난수는 hash(trip.seed, 'user', 정류장 번호) 로 따로 (§3.2). 결정 코드에 Math.random.
- 숫자: 거리 · 충돌 수 · 남은 정류장 · 진행 막대 · N/M · '같이 간 횟수'. 조개 · 배지 (v0 에 없다).
- 문어가 네 선택에 기뻐하거나 서운해하는 연출, 문 앞에서 너를 돌아보기, 문어 입에 "같이 가자" 같은 말.
- 블라인드 전에 문어 카드 앞면이나 remember 줄 보이기. audio/ 재생 (소리는 위 AUDIO.on 한 줄만).
검수:
- tools/test-together.js (Playwright chromium, 360×740 hasTouch, file:// 와 http 둘 다, 콘솔 오류 0. CI·package.json 에는 넣지 않는다)
  — §5.6 점검을 시험대에 맞춰: 1 같이 / 기다리기 / 안 고름에서 문어 trip (일기 receipt · 포스터 · 기념품) 이 시각 값 빼고 바이트까지 같다 ·
  2 trip 사본에 사람 키 0 · 3 S.user 를 바꿔도 BRAIN.plan 입력·결과 같음 · 4 같이 / 기다리기에서 문어 줄·기호 차례 (by 포함) 같음 (시각 빼고) · 5 헤엄 정직 (입력 없음·탭 숨김 → auto, 건너뛰기 → cut, 동작 줄이기 → still) ·
  6 대신 안 고름 · 7 블라인드 (보통·건너뛰기·동작 줄이기, ② 가 ③ 보다 먼저) · 8 숫자 없음 · 9 식탁 메뉴 (watch·stop 늘 있음, 8초 넘긴 가짜 → watch + by:'fallback', 반응 없음) ·
  10 재생 모든 단계와 다시 만나기 ①~④ 에서 새로고침 → 손실 0 · 중복 0 · 정확히 한 번 · 11 같은 시드면 같은 줍기 ·
  12 문 앞 button.dlg-choice 2개, [건너뛰기] 뒤 0개 + how:'skip' · 13 낮이고 졸림 아님 → 잠 0, 밤 또는 졸림 → 잠 (밤은 주소 시각, 졸림은 forceKind 'home' 이나 reaction '졸림' 인 손 trip) ·
  14 page.addInitScript 로 가짜 window.AUDIO 를 걸면 door·pick·meet·flip·table·note 때 AUDIO.on('together') 이 불림, AUDIO 가 없어도 오류 0.
- grep: 집 줄·단추에 "아쉽" "미안" "같이 가자" "기다렸" 0건, 식탁 글에 "맛있" "좋아해" 0건, 새 파일에 Math.random 0건,
  새 파일에 window.DLG 대입 0건 (대사창은 스텁만). git diff 에 js/dialogue-stub.js 0줄.
- 화면 글자는 js 에 둔다. subset-fonts.py --check 가 stale 이면 vendor/fonts/ 는 그대로, 새 글자를 PR 설명에. npm test 초록.
- docs/TOGETHER_PROTO.md: 캡처 4장 (문 앞 · 기웃 판 · 주머니 · 두 카드 → docs/shots/together/), 주인이 폰으로 볼 것 (문 앞 카드 느낌 · 같이 가기 길이 ·
  하나 고르기 · 이야기 시간 · 두 카드), v1 훅 표 (파일 · 함수 · 몇 줄), 문서와 다르게 한 것과 이유, 소리 넘김 표.
멈춤: 위 검수가 초록이고 TOGETHER_PROTO.md 가 차면 draft PR (proto/together → ccr-38ad393e-15xr9t) 을 열고 멈춘다. 아래 '다음' (v1·v0.5),
  조개·배지 잇기, 꾸미기, ④′~⑤ 빈 자리 채우기, 그림·소리 파일로 넓히지 않는다. DLG·GUIDE 에 바라는 것은 PR 설명에 제안으로만 적는다.
다음 (지금 하지 않는다): v1 (열쇠 차례표 3~8일째 칸의 끝, 튜토리얼 v0b 다음) = 주 세션이 app.js 열쇠를 넘기면 §5.1 훅 (약 120~180줄) · 저장 블록·가드·두 탭 합치기 (점검 10 뒷부분) ·
  앨범 '내 것' · 스모크 'T'. v0.5 = cook.html·swim.html 이 기준 브랜치에 오면 시험대의 가짜를 어댑터로 바꾼다 (판 id, 멈춤·이어 하기). 둘 다 이 세션이 이어 한다.
  요리·헤엄 결과 → 조개·배지 끼우기는 주 세션 몫 (9~10일째).
```

---

## 카드 16. 종이 인형·지갑·가게 — 내 모습을 만들고, 내 놀이로 모은 조개로 옷을 산다 (2026-11-07 추가, 새 파일만)

언제: **지금** (새 파일만이라 바로) · 크기 **L** (ROADMAP 2단계, PLAYER_PROGRESSION v0-a) · 본 게임 잇기 v0-b (M) 는 같은 세션이 app.js 열쇠 차례 (9일째쯤) 에 한다.

```text
카드 16. 종이 인형·지갑·가게 — 내 모습을 만들고, 내 놀이로 모은 조개로 옷을 산다 (2026-11-07 추가, 새 파일만)
브랜치: feat/avatar-shop
맡는 파일 (이 카드만 고친다, 모두 새 파일): js/avatar-parts.js, js/avatar.js, js/player.js, js/shop.js, css/shop.css,
  shop.html (시험대), js/shop-bench.js (시험대 전용), tools/test-avatar.js, tools/test-wallet.js, tools/test-shop.js,
  tools/avatar-sheet.js, docs/SHOP_PROTO.md, docs/shots/shop/
먼저 읽기: docs/PLAYER_PROGRESSION.md 전부 (특히 §2 원칙 · §3 벌이 · §4 사는 것 · §6.2 · §7.2·§7.3 · §8 · §9 · §10 v0-a 줄),
  docs/ACHIEVEMENTS.md §4.1·§4.2 (돈은 하나 · 출처 badge·doodle), docs/TUTORIAL.md §3.6 face · §3.7 coin, docs/CORE_LOOP_V2.md §5.1 (놀이 결과 모양),
  docs/NIGHT_LOG.md 결정 19 (돈 이름) · 21 (윤슬). 읽기만: js/palettes.js (Apollo 46), tools/make-ui-art.js (OKLab 외곽선·PNG 쓰기),
  tools/ui-art/sprites.js (격자 글자 방식), js/runner.js (localStorage 'ppolppol_runner' 의 net.awards)
목표: "산책은 문어 몫, 조개는 내 몫." PLAYER_PROGRESSION v0-a 를 본 게임에 얹기 전에 따로 노는 한 장으로 만든다.
  js/avatar*.js · js/player.js · js/shop.js 는 v0-b 에서 본 게임에 그대로 얹을 엔진이다. 가짜 놀이 단추·날짜 넘기기는 js/shop-bench.js 에만 둔다.
- 돈 이름은 '조개' 하나다 (결정 19). 화면엔 늘 숫자와 같이 ("조개 12개"). 코드 키 coins 는 배지 보상 { coins:N } 에만 쓴다.
  player 블록에 잔액 칸을 두지 않는다 (잔액은 늘 장부에서 계산). '가리비'는 요리 재료 이름이라 돈에 쓰지 않는다.
종이 인형 (§7.2):
- 전신 16×24 아트 px 한 장, 머리 16×16 은 위를 잘라 쓴다. UI 에선 ×2·×4·×6 만, image-rendering: pixelated.
- 겹 9개 (뒷머리 → 몸 → 아래옷 → 윗옷 → 겉옷 → 얼굴 → 눈 → 앞머리 → 머리 위), 칸마다 하나. 머리 위의 hides 가 앞머리 윗줄을 가린다.
- 그림은 역할 글자 3칸 (밝음·기본·그늘) 으로 그리고 §7.2 표의 Apollo 색 3개를 넣는다 (피부 5 · 기본 머리색 4 · 가게 머리색 5). 색 이름을 늘 같이 쓴다.
- 그림 약 40장 (§7.2 그림 수). 표에 없는 달리기 상 2벌 (종이 왕관·황제 망토) 은 2장 더 그리고 문서에 적는다. 성별 고르기 없음.
- 외곽선은 겹을 다 합친 뒤 1px: 옆 색을 OKLab 밝기 ×0.62 로 깎아 가장 가까운 Apollo 색. 픽셀은 완전 투명 아니면 완전 불투명.
- 서 있는 한 장만 (걷기·헤엄 프레임은 v0.5). 눈 깜빡임 3.1~5.3초 (시드), 동작 줄이기면 깜빡이지 않는다.
- AVATAR.compose(look, { frame:'stand', expr, outline }) · face(look, expr) · validate(look) · describe(look) (§7.2). 합치는 핵심은 DOM 없이 RGBA 배열로
  (node 테스트), 캔버스는 그걸 옮기는 얇은 겹. describe 는 사실만 ("단발, 밤색 머리, 노란 비옷, 남색 바지"). 격자는 JSON 이 아니라 전역 AVATAR_PARTS.
지갑 (js/player.js, 전역 PLAYER, 화면 코드 없음, §3·§6.2·§9.1):
- 저장 모양은 §9.1 player 블록 그대로. PLAYER 는 넘겨받은 블록만 읽고 쓴다. 시험대 열쇠는 'ppolppol_shop_bench' 하나, 'ppolppol_v2' 는 읽지도 쓰지도 않는다.
- 넘기는 법: PLAYER.use(block, { onSave, awards }) 한 번 (본 게임은 S.player·save, 시험대는 shop-bench.js 의 자기 저장). 바뀔 때마다 onSave().
  earn·buy… 는 §7.2 모양 그대로 (블록 인자 없음). use 전에 부르면 아무것도 안 쓰고 { got:0 }. 가게 화면은 전역 SHOP 하나, 여는 곳은 SHOP.open(tab) (tab: 'make'·'closet'·'shop').
  awards = 달리기의 net.awards 모양 ({ paper_crown:[주], emperor_cape:[주] }). 시험대는 가짜, 본 게임은 v0-b 에서 ppolppol_runner 를 읽어 넘긴다.
  player.js·shop.js 는 localStorage 를 직접 읽지 않는다. 이 이름들은 제안이라 SHOP_PROTO.md 에 적는다 (카드 17·20 이 이 모양으로 부른다).
- earn({ id, src, result }) → { got, capped }. 값은 PLAYER 가 §3.2 로 정한다: 요리 tier 1~3 → 3 · 4~5 → 4 · 6~7 → 5 · 8 이상 → 6 (빈 냄비 0),
  헤엄 played 구간 하나에 1 (한 번에 6까지, auto·cut·still 은 0. 따로 1분 코스 SWIM.start 결과는 out.segs 의 'played' 수 — 카드 8 모양), 컵 한 차례 2 (하루 3차례), 달리기 한 판 1 (하루 3판), 낙서 한 장 2 (하루 3장).
  요리·헤엄은 CORE_LOOP_V2 §5.1 결과 { v, id, by:'user', game, status, ms, out } 를 받는다. 컵·달리기·낙서는 모양이 아직 없으니 판 id 로만 세고 모양을 문서에 제안한다.
- 같은 id (출처_판id) 는 한 번만. earn 의 src 는 놀이 (cook·swim·cup·runner·doodle) 와 badge 만, 값은 늘 PLAYER 가 정한다 (부른 쪽이 준 수는 안 쓴다).
  장부의 shop·refund 줄은 buy·refund 만 쓴다. 그 밖 (walk·trip·peek·poster·decor·photo·share·shop·refund…) 은 earn 이 거절한다.
  badge 는 전역 BADGES 카탈로그에서 조개를 주는 배지일 때만 그 값으로 (카드 17 이 만든다. 이 카드 테스트는 작은 가짜 BADGES 로).
- 하루 주머니 30 (badge 는 밖). 쉬고 온 날 하루마다 +10, 최대 +30. 찬 뒤에도 놀이는 그대로 되고 "오늘 조개는 여기까지. 놀이는 계속 돼." 한 줄만.
  주머니 숫자 (12/30) 는 어디에도 띄우지 않는다. 날짜는 로컬 dateKey (toISOString 금지), 시험에선 window.__ppolTest.today 를 따른다.
- 잔액 = base + Σ ledger.n, 매번 계산. 300줄 넘으면 어제 이전 100줄을 base 로 접는다. 두 탭 합치기·normalize·모르는 id 숨김은 §9.1 대로.
- buy · refund · wish (찜 하나) · balance · owns · shelves · nextGoal (§6.2 순서 1~6, 문구 그대로, 남은 수만 쓴다).
  선반이 '논 날'로 열린다는 문구 (nextGoal 4 · 가게의 다음 선반 줄) 엔 늘 "띄엄띄엄 와도 돼" 를 붙인다 (§6.2, 연속 출석으로 안 읽히게).
가게 (js/shop.js + css/shop.css, §4·§7.3·§8):
- 시트 셋: 처음 만들기 (§7.3 그림대로. 시드로 한 벌이 미리 골라짐, [아무거나] 도 시드, 이름 12자·비우면 '나', [이대로 할래]·[나중에]) · 옷장 · 가게 탭 (첫 조개 뒤에 생김).
- 선반은 논 날 1·3·6·10일 (연달아 아니어도). 21·22 는 처음 요리·헤엄 뒤. 계절 물건은 달력 날짜로만 들어온다 (가을 물건은 이미, 겨울 2026-12-01,
  봄 2027-03-01, 여름 2027-06-01). 한 번 들어오면 계속 남고, 철이 지나면 '지난 계절' 칸으로. 달리기 상은 use 로 받은 awards 에 주가 있는 사람의 옷장에만.
- 사기 흐름 §8.4 그대로: 톡 = 입어 보기 (공짜, 2px 폴짝 150ms) · [살래 · 조개 15] 확인 창 없음 · 시트를 닫기 전까지 [되돌리기] 전액 ·
  모자라면 "조개 4개 더 있으면 돼" + [☆ 찜] · 입어 보기만 한 건 닫을 때 원래대로 + "입어 보기만 한 건 벗어 뒀어".
- 다음 선반은 진짜 그림·이름 + "논 날 6일에 들어와 (지금 4일)", 그 다음 선반은 "또 들어와" 만. 자물쇠 그림 없음. 모든 값은 미리 보인다.
- 가게 주인은 윤슬. 정해 둔 말 "천천히 봐. 입어 보는 건 공짜야." 등 §8.5 '하는 말' 만. 얼굴 그림은 아직 없다 → 은빛 흰색·물빛 파랑 Apollo 로 코드가 그린 16×16 자리표시.
- 금빛 조개 동전 아이콘도 UI 아트 세션 몫 → 16px·32px 자리만 두고 코드로 그린 임시 동전. 글꼴은 Galmuri 24/20/16px, keep-all. 누르는 곳 44px.
- 시트 느낌은 index.html 의 #room-sheet (dialog.sheet) 와 css/style.css 의 .sheet 를 읽고 css/shop.css 에 새로 쓴다 (선택자는 #shop- 아래로만).
- 소리: 이 카드엔 없다 (PLAYER_PROGRESSION 에 가게 소리가 없다). AUDIO.on 새 이름을 만들지 않고, 넣고 싶으면 PR 설명 '다음에' 에 적는다.
하지 말 것:
- 잠금 파일 수정 (공통 규칙 목록. 특히 js/app.js · index.html · css/style.css · tests/evidence/ · assets/ui/ · tools/ui-art/ · vendor/fonts/ · docs/PLAYER_PROGRESSION.md).
- 다음 단계 일: 상태줄 얼굴 단추 · 튜토리얼 안 만들기 · 결과 카드 · 메인 목표 줄 · 방 보기 '다음에 올 것' · [보여 주기] 와 문어 반응 (v0-b·v0.5),
  놀이 결과 잇기 (v0.5), 기념품 '조개' → '조개껍데기' (world.js, 주 세션 몫).
- 지갑·값·찜·모습·내 이름을 문어 쪽 요청에 넣기. 문어가 옷에 반응하는 문장. 요정의 모습 평가·재촉·문어 취향·"문어가 기뻐할 거야".
- 뽑기 (공짜여도) · 할인 · "오늘만"·한정 · 줄어드는 재고 · 팔기 · 진짜 돈 · 알림 · 완성률 % · 잔액을 늘 띄우기. Math.random. 새 npm 패키지.
검수:
- tools/test-avatar.js · tools/test-wallet.js (node): §9.2 두 줄 전부 (거절 출처 목록, earn({src:'refund'}) 거절, 가짜 BADGES 로 처음 선물 한 번만·주머니 밖,
  3일 건너뛰면 주머니 60 등) + §9.2 '문어 선택은 벌이를 안 바꾼다' 줄: 같은 판 결과에 문어 쪽 칸 (먹기·맛보기·아껴 두기, 컵 찾기·안 하기·그만두기) 만
  다르게 붙여도 earn 값이 같다 · 같이 가기 구간과 따로 구간이 똑같이 1 · nextGoal 4 문구에 '띄엄띄엄 와도 돼'.
- tools/test-shop.js (Playwright, 360×740 hasTouch, http 와 file://): 만들기 → [이대로 할래] → 새로고침 → 같은 모습 / 가짜 놀이 한 판 → 가게 탭 →
  입어 보기 → 사기 → 되돌리기 → 다시 사기 → 닫기 → 새로고침 → 그대로 / 모자랄 때 문구 / 찜 → nextGoal / 다음 선반 줄에 '띄엄띄엄 와도 돼' /
  동작 줄이기 / fetch 0 / 가로 스크롤 0 / 콘솔 오류 0.
- grep: §9.2 금지어 (잘 어울|예뻐|멋져|좋아해|친밀도|애정|한정|마지막 기회|오늘만|남은 시간|놓치면|연속|%) 를 가게·요정 문구에서 0, 새 파일 Math.random 0. npm test 초록.
- node tools/avatar-sheet.js → docs/shots/shop/sheet.png (tests/evidence/ 대신). 캡처: 만들기 · 옷장 · 가게 · 모자랄 때.
- 글꼴: 한글 음절은 KS X 1001 2,350자가 부분 글꼴에 늘 들어 있어서 물건 이름은 문서 그대로 둬도 된다. 걸리는 건 기호다 (☆ ▰ ▱ Σ ∪ ← ⑤ 상자 선 등).
  도구는 js/*.js·css/*.css 의 주석까지 센다 → [☆ 찜] 의 별은 픽셀 그림으로 그리고, 주석·문구엔 한글·ASCII·지금 있는 기호 (· … → ×) 만.
  python3 tools/subset-fonts.py --check 가 stale: none 이어야 한다 (CI '글꼴 점검' 필수). 결과를 PR 설명에. vendor/fonts/ 는 그대로.
- docs/SHOP_PROTO.md: 캡처, 정한 물건 id 표, 문서와 다르게 한 것과 이유, §11 중 시험대로 볼 수 있는 줄.
멈춤: 위 검수가 초록이고 SHOP_PROTO.md 가 차면 draft PR (feat/avatar-shop → ccr-38ad393e-15xr9t) 을 열고 멈춘다. 카드 17 (배지) 은 주인이 이 세션에 붙여 줄 때 시작한다.
  v0-b 잇기 (app.js·index.html) · 걷기·헤엄 프레임 · 문서 표 밖 새 물건 · '하지 말 것' 의 다음 단계 일로 넓히지 않고 PR 설명 '다음에' 에 적는다.
다음 (지금 하지 않는다): app.js 열쇠 차례 (9일째쯤) 에 이 세션이 v0-b — 상태줄 얼굴 단추 (물결 F 로 🔈 옆에 앨범 아이콘이 생겼으니 360px 자리부터),
  튜토리얼 안 만들기 · 결과 카드 · 메인 목표 줄 · '다음에 올 것' · 산책·두뇌 분리 테스트. 지금은 PR 설명 끝에 그때 넣을 줄 (index.html·app.js normalize·earn 부르는 곳) 만.
```

---

## 카드 17. 배지 장부·수첩 — 같이 한 일이 배지로 남는다 (2026-11-07 추가, 카드 16 다음, 새 파일만)

언제: **카드 16 이 끝난 뒤, 같은 세션에** (지갑을 같이 쓴다) · 크기 **M+** (ROADMAP 2단계, ACHIEVEMENTS v0-1 S + v0-3 M) · "오!" 와 칩 (v0-4·5, S+S) 은 같은 세션이 app.js 열쇠 차례 (10일째쯤) 에 한다.

```text
카드 17. 배지 장부·수첩 — 같이 한 일이 배지로 남는다 (2026-11-07 추가, 카드 16 다음, 새 파일만)
브랜치: feat/badges — 카드 16 PR 이 합쳐졌으면 ccr-38ad393e-15xr9t 에서, 아직이면 feat/avatar-shop 위에서 만든다 (그러면 PR 설명 첫 줄에 "카드 16 PR 위에 쌓임").
맡는 파일 (이 카드만 고친다, 모두 새 파일): js/badges.js, tools/test-badges.js, js/badges-ui.js (수첩 그리기만), css/badges.css,
  badges.html (시험대), js/badges-bench.js (시험대 전용), tools/test-badge-book.js, docs/BADGES_PROTO.md, docs/shots/badges/
  카드 16 파일 (js/player.js 등) 을 고쳐야 하면 이 PR 이 아니라 카드 16 브랜치에 따로 커밋하고 PR 설명에 적는다.
먼저 읽기: docs/ACHIEVEMENTS.md 전부 (특히 §2 지킬 선 4개 · §3 목록 · §4.1·§4.2 · §6 수첩 · §7.4 · §8 · §9.1 v0 줄),
  docs/PLAYER_PROGRESSION.md §3.2·§9.1 (장부·출처), docs/MODEL_VOICE.md (by 다섯 이름), docs/INTERIOR_MODE.md §5.2 (S.room.layout),
  읽기만: js/app.js 의 defaults()·normalize() (S.octopus.name·days·invites·visits, S.trips 의 kind·by), js/world.js (방의 corner), js/runner.js ('ppolppol_runner'.runs)
목표: ACHIEVEMENTS v0-1 (배지 장부 + v0 카탈로그 12개 + 테스트) 과 v0-3 (수첩 시트 + 받기 + 카드 16 지갑 연결) 을 따로 노는 한 장으로 만든다.
  v0-2 그림 (배지 12장·리본·조개 동전·배지 소품) 은 UI 아트 세션 몫이다 → 코드로 그린 자리표시. 무리는 테 모양으로 나눈다
  (놀이 = 메달 + 리본, 우리 둘 = 깃발, 문어 기록 = 물방울, 색만으로 나누지 않는다). 그림을 고르는 곳은 한 함수로 모아 나중에 바꿔 끼운다.
배지 장부 (js/badges.js, 전역 BADGES, DOM 없음, node 로 돈다):
- 카탈로그 · facts(S) · evaluate(S) → 새 id · challenges(S) · claim(S, id) (§8.2) · check(S, why) (evaluate 뒤 새 id 를 got 에 더하고 돌려준다.
  §8.2 의 BADGES.check(why) 에 S 를 받게 한 것. 시험대도 이것을 부른다). 카탈로그 한 줄은 §8.1 모양 그대로. id 는 짧은 영문 (예: hello · runner_30), 정한 id 표를 문서에 남긴다.
- v0 12개 (§9.1): 1 안녕, ○○ · 2 잘 다녀와 · 5 일곱 날 친구 · 23 상자에 콩! · 24 다락 단골 · 26 내 모습 · 27 여기 어때? · 28 내 손으로 ·
  32 처음 가 본 곳 10곳 · 33 오늘은 집 · 34 가만히 있던 날 · 35 여덟 갈래. 이름·조건·등급·보상은 §3 표 글자 그대로.
  조개는 23 → 5 · 24 → 15 · 26 → 5 뿐이다 (합 25). 1·2·5 (우리 둘) · 27·28 (꾸미기) · 32~35 (문어 기록) 은 조개 0.
- 사실은 이미 있는 데서 계산하고 새로 저장하지 않는다 (§8.1 표). 함께한 날 = S.octopus.days ∪ S.player.playDays ∪ 말 건 날 (S.talk 의 kind:'chat', who:'user').
  아직 없는 블록 (S.player 는 카드 16, S.talk 은 1단계, S.room.layout 은 카드 19) 은 없으면 0 으로 친다 → 26·27·28 은 가짜 저장으로만 시험한다.
  달리기 판 수는 S 밖이라 facts(S, { runner }) 처럼 둘째 인자로 받는다 (제안). badges.js 는 localStorage 를 직접 읽지 않는다.
- 문어 기록 (32~35): hidden:true, 진행 막대·도전 카드 없음. got 줄에 chosenBy 'demo-rules' | 'model' | 'mixed' (그 배지를 채운 trips 의 by 에서).
  지금 trips[].by 는 'demo' (데모 두뇌) · 'mcp' (모델) · 'human' (개발 패널에서 사람이 대신 고름) · 'legacy' (옛 저장 복원) 넷이다
  (DIALOGUE_UI §5.12). demo = demo-rules, mcp = model. human 은 문어가 고른 게 아니고 legacy 는 누가 골랐는지 몰라서 문어 기록에 세지 않는다.
  그래서 32·35 는 S.octopus.visits (human 차례 방문도 섞임) 가 아니라 센 trips 의 visitsDelta 로 계산한다 (door_out 빼고).
  센다 = by 가 demo·mcp 이고 status:'done' 인 차례만 (달리는 중인 차례도 kind 가 있다). chosenBy 에 'human' 은 없다.
  human·legacy 빼기와 visitsDelta 로 세기는 §8.1 표와 다르게 한 것이라 BADGES_PROTO.md 에 적는다. fallback:true 인 빈 차례는 34번에 세지 않는다
  (그 표시는 v0-4 때 app.js 에 붙는다. 이 카드는 거르는 쪽과 가짜 저장 테스트만).
- S.badges 는 §8.1 그대로 (got · seen · claimed · featured · opened · asked). got·seen·claimed 는 추가만, 진행도·끝남은 매번 계산한다.
  expires·until·streak·deadline·daily 칸 없음. 날짜는 로컬 dateKey. 옛 저장은 한꺼번에 retro:true, 날짜는 사실에서 거꾸로 (§7.5).
  두 탭은 id 합집합·이른 날짜. 카탈로그에 없는 id 는 지우지 않고 숨긴다.
- claim(S, id): 조개 배지면 PLAYER.earn({ id: 'badge_' + id, src: 'badge', … }) 한 번 (블록은 카드 16 대로 PLAYER.use 로 먼저 넘긴다.
  주머니 밖, 두 번 눌러도 장부 1줄). 배지 소품 (보상 { keep:id } — 배웅 종·조약돌 병) 은 claimed 에만 남긴다. 벽걸이 attic:hook.door·서랍에 놓는 건
  꾸미기 (카드 19 세션의 뒤 차례) 몫. keep id 는 정한 id 표에 같이 적는다 (카드 19 자리 표가 그 id 를 받는다).
수첩 (js/badges-ui.js + css/badges.css, §6.2~§6.6):
- 아래에서 올라오는 <dialog class="sheet"> 하나 (360×740). 시트 모양은 css/style.css 의 .sheet 를 읽고 css/badges.css 에 #badge- 아래로 새로 쓴다.
  머리줄 "배지 수첩 · (동전) 조개 N [가게›]" ([가게›] 는 전역 SHOP 이 있으면 SHOP.open('shop'), 카드 16).
- 대표 배지 (기본은 '안녕, ○○', [바꾸기]) · 모은 배지 (받은 것만, 72×96 칸 4열, 누르면 그 줄 아래에 자세히) ·
  도전 과제 (줄마다 다음 한 단계만, 받을 것이 있는 카드 먼저, 4장 넘으면 [도전 더 보기]). v0 도전 줄은 달리기 (판) 하나뿐이다.
- 주인 결정 (11-07, 문서보다 앞선다): '함께한 날' 배지 (v0 은 5 일곱 날 친구) 엔 도전 카드·진행 막대·"19/30일" 같은 n/m·"보상: …" 줄이 없다.
  꾸미기 배지처럼 미리 보이는 것 없이 그날 조용히 생긴다. ACHIEVEMENTS §6.2 그림 (338행 막대)·§6.3·§10·§11 의 함께한 날 카드 글은 옛 글 (주 세션이 고친다).
- 줄이 없는 배지 (2 잘 다녀와 · 5 일곱 날 친구 · 26 내 모습) 의 [받기] 는 그 배지 '자세히' 안에 둔다 (받을 게 있으면 [대표로 걸기] 위). 문서와 다르게 한 것으로 PROTO 에.
- 안 딴 배지의 실루엣·빈칸·자물쇠·전체 개수 (23/36)·% 는 DOM 에도 없다. 숫자 n/m 은 달리기 도전 카드 막대 안에만 ("19/30판". 공통 규칙의 N/M 금지는 모은 수·완성률 얘기다. 이 막대 하나만 예외).
  "11판 남음"·"거의 다 됐어" 같은 남은 수 말과 그 순 정렬은 없다. 함께한 날·꾸미기·문어 기록엔 도전 카드 없음.
- 받기 (§6.4): 2px 눌림 → 동전 2px 두 번 → 머리줄 숫자 5계단 → "받음 · 11.06" → 다음 단계로. 바로 저장. 문구는 §6.5, 낭독기·동작 줄이기는 §6.6 그대로.
  옷·소품 보상은 §6.4 한 줄. 서랍은 아직 없으니 "받았어 · 배웅 종" 처럼 이름만 ('서랍에 있어' 는 서랍이 생긴 뒤). 진행 막대는 ▰▱ 글자 말고 CSS·픽셀로 (카드 16 글꼴 줄).
  소리: 받을 때 window.AUDIO && AUDIO.on && AUDIO.on('badge', { act:'claim', coins:N }) 한 줄만 (N 은 받은 조개, 소품은 0. AUDIO.sfx 는 없다. js/audio.js 는 안 고친다).
문어의 "오!" (알아보기 연출은 이 카드에서 만들지 않는다. 그래도 지킬 것):
- 자세히의 반응 줄은 seen 기록 그대로만 쓴다. by:'demo-rules' 면 "문어 반응: "오!" · 데모 규칙", by:'model' 이면 모델이 쓴 글자 그대로
  (길면 화면만 '…', 원문은 보관). seen 이 없거나 via:'import' (by 없음) 거나 모델이 아무것도 안 했으면 줄 없음. "문어가 무시했어"·"기뻐했어" 같은 말을 지어내지 않는다.
- "오!" 는 알아봤다는 감탄이지 칭찬이 아니다. "잘했어"·"멋져"·"축하해" 를 문어 입에 넣는 문구를 만들지 않는다.
- 문어 기록 배지는 문어 반응 줄 대신 "문어가 스스로 고른 일의 기록이야. 보상 없이 기록만 남겨." + "고른 것: 데모 규칙" (또는 모델 / 데모 규칙 + 모델).
- 배지·조개 정보는 문어가 고르는 요청 (산책·놀이·방 보기) 에 0바이트다. BADGES 는 S.badges 만 쓰고 나머지 블록은 읽기만 한다.
하지 말 것:
- 잠금 파일 수정 (공통 규칙 목록. 특히 js/app.js · index.html · css/style.css · assets/ui/ · assets/manifest.json · tools/ui-art/ · docs/ACHIEVEMENTS.md).
- 다음 단계 일: 조용함 감시 · 알아보기 연출 · [배지] 칩 · 토스트 · app.js 훅 · 스모크 (v0-4·5), 모델 notice 차례 (v1-4),
  요리·헤엄·컵·낙서·이야기·사진 배지 (v0.5), 업적 옷·짝 꾸미기·가구 (v1).
- 쓰다듬기·톡·간식·가구 탭·산책 횟수·읽은 문서 수·등불 칸·순위·앱만 연 날로 배지 만들기. 기한·연속·뽑기. 배지 이름·설명에 감정·취향 말. Math.random.
검수:
- tools/test-badges.js (node): §8.3 '선 지키기' 줄 (토스트 문구 검사만 v0-4 몫) + 장부 줄 (같은 배지 두 번 → 1줄 · src:'badge' 는 조개 배지만 ·
  산책 30번 섞인 저장 → 산책 사실로 생긴 조개 0 · 주머니 찬 날도 전액) + 압박 없음 줄 (30일 건너뛰어도 진행이 안 준다 · 띄엄띄엄 두 날 = 2 ·
  앱만 연 날은 안 센다 · 함께한 날 6일·29일 저장에도 challenges(S) 에 함께한 날 줄 0) + 저장 줄 (합집합·이른 날짜 · 모르는 id 보존 · retro 날짜 · Math.random 0) +
  human 줄 (human 차례만 있는 저장 → 32~35 없음 · 어느 got 에도 chosenBy 'human' 없음 · 달리는 중 차례는 안 셈).
- tools/test-badge-book.js (Playwright, 360×740 hasTouch, http 와 file://): 빈 수첩 문구 · 칸 수 = got 수 · 안 딴 것 DOM 0 · 카드 밖 "n/m" 0 ·
  받기 (24 → +15, 자세히의 26 → +5) → 새로고침해도 그대로 · 두 번 톡 → 장부 1줄 · 데모 seen → '데모 규칙' 줄 · model seen → 글자 그대로 · seen 없음 → 줄 없음 · 일곱 날 저장 → '함께한 날' 카드 0 ·
  자세히의 5 → "받았어 · 조약돌 병" · 가짜 AUDIO: 받기마다 AUDIO.on('badge', …) 한 번 (24 → coins:15 · 5 → coins:0 · 두 번 톡에도 한 번) · AUDIO 가 없어도 오류 0 · 동작 줄이기 · 가로 스크롤 0 · 콘솔 오류 0.
- 시험대 저장 열쇠는 'ppolppol_badges_bench' 하나 ('ppolppol_v2' 읽기·쓰기 금지). 가짜 저장 고르기: 새 저장 · 일곱 날 · 문어 기록 섞임 · human 섞임 · 옛 저장.
- npm test 초록. python3 tools/subset-fonts.py --check 가 stale: none (CI 필수, 기호·주석 기호 주의). 결과를 PR 설명에.
- docs/BADGES_PROTO.md: 캡처 3장 (수첩 · 자세히 · 받기 → docs/shots/badges/), 정한 id 표, human·legacy 처리, 문서와 다르게 한 것 (함께한 날 막대 없음 포함),
  소리 넘김 표 (이벤트·act·언제·느낌: badge·claim·받기·조용히. coins 0 이면 coin_get 안 냄), '함께한 날' 이 방 보기 통계 (app.js 의 S.octopus.days.length) 와 이름이 겹치는 것 (v0-4 전에 주 세션이 정할 것),
  v0-4 때 app.js 가 부를 BADGES.check(why) 자리 (이름 저장 · commitTrip · 놀이 결과 · 꾸미기 끝 · 부팅 뒤) 와 normalize·불러오기에 badges 를 합치는 줄.
멈춤: 위 검수가 초록이고 BADGES_PROTO.md 가 차면 draft PR (feat/badges → 쌓았으면 feat/avatar-shop, 아니면 ccr-38ad393e-15xr9t) 을 열고 멈춘다.
  쌓았을 땐 rebase 도 origin/feat/avatar-shop 위로 (카드 16 커밋이 목록에 안 섞인다). 카드 16 이 합쳐지면 git rebase --onto origin/ccr-38ad393e-15xr9t feat/avatar-shop 하고 대상을 기준 브랜치로 바꾼다.
  v0-4·5 · 배지 그림 · '하지 말 것' 의 다음 단계 일로 넓히지 않고 PR 설명 '다음에' 에 적는다.
다음 (지금 하지 않는다): app.js 열쇠 차례 (10일째쯤, 카드 16 v0-b 뒤) 에 이 세션이 v0-4·5 — 조용함 감시 · 첫 산책 ⑤ 틈의 "오!" (데모 규칙 꼬리표.
  물결 G 로 가시 외침 말풍선이 없어지니 보통 말풍선 + 작은 폴짝) · 칩 · 토스트 · 훅 · 스모크.
```

---

## 카드 18. 옆방 프로토 — 보기용, "같은 집 같다"를 폰으로 (2026-11-07 추가, 새 파일만)

언제: **지금, 한가한 세션에** (급하지 않다 — 옆방 본 게임 v1a·v1b 는 사람 시험 뒤 장면·app.js 열쇠 차례) · 크기 **M~L** (ROADMAP 3단계) · scene3d.js 는 장면 세션들이 고치는 중이라 읽기만.

```text
카드 18. 옆방 프로토 — 보기용, "같은 집 같다"를 폰으로 (ROOM_EXPANSION v0, 2026-11-07, 새 파일만)
브랜치: proto/side-room
맡는 파일 (이 카드만 고친다, 모두 새 파일): side.html, js/side-proto.js, css/side-proto.css, tools/test-side-proto.js,
  docs/SIDE_PROTO.md, docs/shots/side-proto/
읽기만: js/scene3d.js, vendor/three.min.js, js/palettes.js, css/style.css, vendor/fonts/galmuri.css
먼저 읽기: docs/ROOM_EXPANSION.md §1 · §3.2 · §3.4 · §4 · §5.1~5.3 · §5.8 · §5.10 · §6 (v0 줄), docs/OWNER_DECISIONS.md '기본값' 표의 ROOM_EXPANSION 세 줄,
  play.html (스크립트 순서와 SCENE3D.init 쓰는 법만), tools/test-scene-perf.js · tools/look-strip.js (재는 법)
  ※ 컵 놀이 kit (inst.play()) 는 scene3d.js 안에 넣은 것이다 (PLAY_PROTO §11 'scene3d.js에 넣을 엔진'). 이 카드는 그 길을 쓰지 않는다.
목표: 옆방이 다락과 같은 집처럼 보이는지, 공개가 설레는지 폰으로 보는 보기용 프로토 (ROOM_EXPANSION v0). 저장 없음.
  문서의 '?dev=1&side=1' 은 index.html·app.js 가 잠겨 있어 이 카드에선 따로 노는 side.html 로 대신한다. 본 게임에는 안 붙인다.
- side.html 은 play.html 처럼 three.min.js → palettes.js → scene3d.js → side-proto.js 를 싣고 SCENE3D.init 으로 다락을 띄운다.
  init 에는 play.html 처럼 #oct-bubble 을 품은 octEl 을 넘긴다 (없으면 bubble 이 아무것도 안 한다).
  옆방은 side-proto.js 의 buildSide() 가 만든 그룹으로 같은 scene 에 붙인다 (init 이 돌려주는 scene · camera · renderer).
  다락 그룹은 scene.getObjectByName('attic'). 상자·행렬·합치기·격자 스냅 같은 도우미는 scene3d.js 에서 이 파일로 복사해 쓴다
  (재질 색 SCENE3D.MAT · SCENE3D.buildPalette 는 공개돼 있다). 옆방은 처음 열 때만 만든다 — 안 열면 시작 비용 0.
- 옆방은 §5.2 계산값에서 시작: 바닥 3.6×3.6m · 벽 2.4m · 뒷벽 오른쪽 끝 다락 문 · 왼쪽 벽 포스터 칸 8 (4×2, 간격 0.54m, 포스터 0.42×0.56m)
  · 뒷벽 왼쪽 '네 선반' 3칸 · 바닥 자리 4칸 · 해초 둥지 (nest). 빈 칸 점선 테 (보드 8 · 바닥 4) 는 개발 단추로만 켠다 (기본 꺼짐.
  늘 떠 있는 빈 칸 테는 '다 채워라'로 읽힌다, §3.2 8단계 · §5.8). 점광 2개 (다락과 같은 수 — 첫 전환에 멈칫 없게), 밤에도 등잔 켜짐. 재질은 지금 쓰는 것만.
  카메라 각도·픽셀 밀도는 다락과 같게 (카메라 타깃은 scene3d 안에 있으니 옆방 그룹 위치로 맞춘다).
  장면 칸은 본 게임처럼 #scene 으로 둔다 (style.css 의 #scene.mode-3d 높이 clamp(250px, 44vh, 400px) — §5.2 의 360×640 계산이 이 높이다).
  360×640 에 안 들어가면 벽 2.2m / 바닥 3.4m / 타깃 0.2m 내리기를 캡처로 견줘 하나 고른다.
- 문어 그룹은 이름 없이 다락 그룹 안에 있다 (atticG.add(octG). 다락 자식 중 scale 0.42 인 Group). 다락을 숨기거나 밀면 문어도 같이 간다.
  옆방에선 이 그룹을 옆방 그룹으로 옮겨 달고 (add), 다락으로 돌아오면 되돌린다. moveTo·jumpTo 는 다락 ANCHORS 이름만 받아 옆방 그룹 좌표로 읽힌다.
  이 우회와 안 맞는 앵커를 장면 API 표의 '문어 그룹' 줄 (§5.3) 에 적는다.
- 다락 구멍 (왼쪽 벽 안쪽 끝 z −2.3~−1.2, 높이 2.1m) + 마개: 벽 판자·선반·소품은 scene3d 안에서 이름 없는 'room' 메시 하나로 합쳐져 있어 밖에서 못 뚫는다
  (다락 자식 중 castShadow·receiveShadow 가 다 켜진 Mesh 가운데 꼭짓점이 가장 많은 것, 재질 MeshPhongMaterial).
  (가) 벽 앞에 문틀·안쪽 판을 얹는 덧그림 (권함), 또는 (나) 다락 정적 기하 부분을 이 파일로 복사해 구멍+마개를 넣은 사본으로 room 메시를 바꿔 끼우기.
  (나) 의 사본은 따라 고치지 않는다: PR 날 기준 브랜치 scene3d 와만 견준다 (장면 세션이 벽을 고치면 낡는다). 고른 길과 이유, v1a 때 scene3d 의 벽 판자 루프에 넣을 고침을 문서에 적는다.
  ※ 그 자리에 지금 왼쪽 벽 선반 (y 1.9, z −2.4~−1.4, 책·병) · 샛기둥 (z −1.9) · 외투 갈고리 (z −1.1) 가 있다. 겹침을 캡처로 보이고 옮길 안을 적는다 (정하지 않는다).
- 오가기: 화면 끝 ◀ ▶ 진짜 <button> (누르는 곳 44×44, 그림 16×16, aria-label "옆방 보기" / "다락 보기"), 구멍·문 톡, 키보드 ← →.
  전환은 가로 0.6초. scene3d 처럼 한 프레임엔 한 장소만 그린다: 앞 0.3초 다락이 오른쪽으로 밀려 나가고, 뒤 0.3초 옆방이 왼쪽에서 들어온다.
  둘을 같이 그리면 겹치는 동안 한쪽 점광 둘을 숨긴다 (점광 4개 = 새 셰이더 = 멈칫). 픽셀 격자에 맞춰 옮긴다. 아래로 떨어지는 움직임 없음.
- 개발 단추: 박자 재생 똑똑 → 첫 뚝딱 (팔 동작 대신 몸 통통, §5.5 끝 줄. 소리 없음) → 천 덮기 → 공개 (§3.4 표의 박자·시간) · 빈 보드에 포스터 몇 장 강제 걸기 · 낮/밤 (init 의 hour).
  포스터는 코드로 그린 종이로 (file:// 에서 그림 파일 텍스처는 막힐 수 있다 — scene3d 의 bakeSVG 참고). 공개 중 톡 = 끝 상태로.
  공개 끝 폴짝은 데모 규칙 연출이라 화면 구석에 작게 '데모 규칙'. '동작 줄이기'면 §3.4 의 줄일 때 규칙대로 (천 크로스페이드 · 컷 · 폴짝 없음).
- 문어는 SCENE3D 공개 API (moveTo · jumpTo · setOctState · bubble · setExpression · setPlace · pause · resume · stats …) 로만 움직인다.
  안 되는 것은 대신하고, '본 게임에 필요한 장면 API' 표를 §5.3 표 (장소 표 · 앵커 hole·door·board·nest·center · 가로 전환 · 고르기 · 통계 callsSide) 와 맞춰 적는다. v1a 장면 차례의 입력이다.
그림·소리: 새 그림·소리 파일 없음. 모두 Apollo (js/palettes.js) 로 코드가 그린다. ◀ ▶·큰 먼지는 자리표시다 (진짜 그림은 UI 아트 몫, ROOM_EXPANSION §5.9 그림 표).
  3D 천·소품은 §5.9 대로 코드가 만든다 (그림 파일 없음). 포스터는 코드로 그린 시험용 종이다.
  v0 은 무음이다. SIDE_PROTO.md 에 §3.4 표의 소리 칸 (똑똑·뚝딱·장소 전환은 §5.9 소리 표) 이 프로토의 실제 박자 시각과 맞는지, 어긋나면 어디인지 적는다
  (소리를 붙이는 건 v1b. 쓰면 안 되는 소리도 §5.9).
하지 말 것:
- js/scene3d.js · js/scene2d.js · js/app.js · index.html · css/style.css 수정. scene3d 안의 값을 밖에서 바꿔 본 게임 동작에 기대기
  (문어 그룹 옮겨 달기·room 바꿔 끼우기는 이 프로토 안의 우회로만 쓰고 장면 API 표에 적는다).
- 다음 단계 일: 넓히기 조건·제안 대화·공사 상태·저장 (v1b), 망치 kit 합치기 (v1c), 2D 판 (v1d), 채우기·꾸미기 자리 (v1e), 옆방 전구 줄 (기본값, v1 뒤).
- 공사 진행 막대·남은 시간·"넓히기까지 N" 같은 숫자. 문어 입에 "눌러" "걸어 줘". 지어낸 기쁨 (폴짝은 데모 규칙 꼬리표와 함께만).
- 소리 파일 재생 (audio/ 는 소리 세션), 외부 이미지, 새 코드에 Math.random (정할 일이 생기면 시드로).
검수:
- tools/test-side-proto.js (Playwright chromium, file://, 콘솔 오류 0. 헤드리스는 2~4fps 라 시간 대신 debugStep(dt) 으로 프레임을 민다. CI·package.json 에는 넣지 않는다)
  — 360×740 과 360×640 에서 옆방이 캔버스 안, 사방 ≥ 8 CSS px · 옆방만 보일 때 stats().calls ≤ 60 (다락은 77~85) ·
  renderer.info.programs.length 가 옆방 열기 전 = 첫 왕복 뒤 = 두 번째 왕복 뒤 (늘면 어떤 재질·빛 때문인지 SIDE_PROTO.md 에) · 옆방 장치를 붙이고 마개 상태인 다락 = 붙이기 전 다락 (같은 시각, 캔버스 픽셀 차이 0) ·
  ◀ ▶ 는 <button> + aria-label · '동작 줄이기'면 걷기·먼지·폴짝 0 · 공개 중 톡 한 번에 끝 상태 · 새 파일 Math.random 0건.
- 캡처 (docs/shots/side-proto/): 360×640 · 360×740 · 390 · 412 폭 × 낮/밤 — 다락 (마개) · 다락 (구멍) · 전환 중간 · 옆방 (빈 칸 테 없이) · 공개 끝.
  폭마다 모음 그림 (contact sheet) 몇 장으로 합쳐도 된다.
  램프 (−1.6, 1.95, −0.9) 가 구멍 앞을 가리는지, 등불 7칸 선반과 겹치는지도 같이 본다.
- docs/SIDE_PROTO.md: 고른 크기와 이유, 겹침과 옮길 안, 구멍을 만든 길, 장면 API 표, §3.4 소리 칸과 실제 박자 시각 (어긋난 곳), 주인이 폰으로 볼 것 ("같은 집 같다" · "공개가 설렌다").
- subset-fonts.py --check (stale 이면 새 글자를 PR 설명에), npm test 초록.
멈춤: 위 검수가 초록이고 SIDE_PROTO.md 가 차면 draft PR (proto/side-room → ccr-38ad393e-15xr9t) 을 열고 멈춘다. '하지 말 것' 과 '다음' 의 일
  (v1a~v1e) · scene3d.js 고침 · 겹친 소품 옮기기로 넓히지 않는다. 장면 API 표와 판자 루프 고침 안은 SIDE_PROTO.md·PR 설명에만 적는다.
다음 (지금 하지 않는다): 사람 시험 뒤 장면 열쇠 차례에 v1a (장소 셋) — 이 프로토의 장면 API 표와 판자 루프 고침이 그 출발점이다.
```

---

## 카드 19. 꾸미기 자리 표·저장 — 정해진 자리와 잃지 않는 layout (2026-11-07 추가, 새 파일만)

언제: **지금** (새 파일만, node 로 도는 순수 함수라 다른 작업과 안 겹친다) · 크기 **M** (ROADMAP 3단계). 같은 세션이 뒤이어 v0-c·d·f (장면 열쇠 9~10일째) 와 v0-e·g (app.js 열쇠 11~13일째) 를 맡는다. 1½ 시험 결과에 따라 이 잇기 차례가 앞당겨질 수 있다.

```text
카드 19. 꾸미기 자리 표·저장 — 정해진 자리와 잃지 않는 layout (INTERIOR_MODE v0-b, 2026-11-07, 새 파일만)
브랜치: feat/room-layout
맡는 파일 (이 카드만 고친다, 모두 새 파일): js/room-slots.js · js/room-layout.js · tools/test-layout.js · docs/LAYOUT_PROTO.md
  js/app.js · js/scene3d.js · js/scene2d.js · js/world.js · js/brain.js 는 읽기만.
먼저 읽기: docs/INTERIOR_MODE.md §4 · §5.1 · §5.2 · §5.4 · §5.6 · §6 (v0-b 줄),
  docs/PHOTO_AND_FURNITURE.md §3.3 (소파 자리·hole 앵커) · §6.4 (소파 저장) · §6.5 (test-layout 확장 줄), docs/MODEL_VOICE.md §5 (by 이름),
  js/app.js 의 load · normalize · save · setAsideBroken · mirrorGet (지금 저장이 어떻게 지켜지는지) · brainInput · wallPosters,
  js/brain.js 의 homeActivities, js/scene3d.js 의 ANCHORS · posterSlot · layoutSouvenirs · 소품 position.set. 문서의 행 번호는 밀렸다. 이름으로 찾는다.
목표: 꾸미기 v0-b. 물건을 '정해진 자리 + 90° 방향'에만 놓는 자리 표와, 놓은 결과를 잃지 않고 저장·복구하는 순수 함수. 화면은 없다.
ctx = { lantern, album: { posters, souvenirs }, sofa, octOn, sideBuild } — 부른 쪽이 S 에서 뽑아 준다
  (sofa = S.room.sofa 가 있나, sideBuild = 옆방 공사가 시작됐나. 지금 본 게임에선 늘 false).

1) js/room-slots.js — 전역 ROOMSLOTS (브라우저 전역 + node require 둘 다)
- §5.1 표 그대로: 이끼 화분 moss · 양초 candle · 담요 blanket · 소파 sofa · 포스터 poster:<tripId> · 기념품 sv:<tripId> 의
  기본 자리와 다른 자리, 그리고 attic:hook.door (배지 소품 자리. fits 는 배지 보상 keep id — 아직 안 정해졌으면 비워 두고 PROTO 질문에). 자리 하나 = { id:'attic:sill.2', kind, label, fits, host?, surface, use:[dx,dz], rots }.
- 자리는 주인이 있을 때만: crate.top 은 등불 2, shelf.* · shelf.end 는 등불 7. 예외: 포스터 attic:board.0~5 는 첫날부터 (보드 전엔 벽이 주인).
  주인이 없어 지금 못 쓰는 자리에 저장된 물건은 저장된 slot 을 그대로 두고, 보이는 자리만 effective() 가 기본 자리로 정한다.
- 창턱 4칸: sill.0~2 = 지금 기념품 자리, sill.3 = 지금 화분 자리. 소파 floor.win · floor.back, 포스터·기념품·벽걸이는 rots:[0].
- 바닥 자리의 방 좌표(m)와 바닥 물건 크기는 지금 장면 값을 읽어 옮겨 적는다 (테스트가 문어 길을 잴 때 쓴다).
  floor.c · floor.fr 처럼 문서에 좌표가 없는 자리는 후보를 정해 테스트로 거르고, 고른 값을 PROTO 문서에 적는다.
- hole 앵커도 문서에 좌표가 없다: 구멍 가운데 앞 (x 약 −2.0, z 약 −1.75) 으로 정하고 PROTO 에 적는다. ctx.sideBuild 일 때만 앵커에 넣고,
  그때 hole 길이 floor.back 소파에 걸리면 그 ctx 에서만 list() 가 floor.back 을 뺀다 (PHOTO §3.3).
- list(roomId, ctx) (roomId = 'attic') · fits(item) · label(slotId) · defaultSlot(item, ctx) · anchorPos(name, layout, ctx)
  (문어 자리가 물건을 따라간다: 담요 = 자리 + use. ctx.sofa 가 있고 소파가 창 아래면 창 앵커는 소파 앞 x 약 −1.3).

2) js/room-layout.js — 전역 ROOMLAYOUT. 순수 함수: 받은 객체를 바꾸지 않고 새 객체를 돌려준다. 시각은 인자로 받는다.
- 모양은 §5.2 그대로: S.room.layout = { place: { 물건: { slot, rot, by, at } } }, S.room.layoutLog = 최근 50줄.
  by 는 'user' · 'demo-rules' · 'model' · 'fallback' 만.
- place 에 없는 물건 = 기본 자리. normalize 는 기본 자리 항목을 만들어 채우지 않고 by 를 지어 넣지 않는다 (항목은 사람·문어가 옮길 때만 생긴다).
- normalize(layout, ctx): §5.2 의 6규칙. 두 번 돌려도 같다. 규칙 1 (기본 자리로 고쳐 씀) 은 자리 id 가 표에 없을 때만
  (모르는 id, 또는 sideBuild 로 빠진 floor.back — PHOTO §3.3). 주인이 아직 없는 자리는 규칙 1 이 아니라 effective() 로 (저장 slot 은 그대로).
- move(layout, item, to, by, rot, ctx) → { layout, entry } (맞바꿈·돌리기 포함) · undo (한 꾸미기 세션 안 같은 물건 이동은 한 줄로 합친다) ·
  slotOfPoster(layout, id) · effective(layout, ctx) (물건 → 지금 보이는 자리).
- 새 포스터 자리: §5.2 순서 1~5 그대로. 옆방·공사 갈래는 ctx 가 알려 줄 때만 (지금은 늘 없음).
  고른 이가 안 붙인 포스터 (app.js 의 trip.posterHung === false, 문서의 hang:false) 는 어느 경우에도 걸지 않는다.
- 집에 있는 날 rearrange (world.js homeActivities, effect 'rotatePosters'): 지금 app.js 처럼 posterOrder 를 맞바꾸는 대신 kind:'own' 기록 한 줄로.
  by:'user' 자리는 안 건드린다. by 는 그 활동을 고른 이 그대로 인자로 받는다 (부른 쪽이 trip.receipt.activity.by 를 본다: 'model' → 'model',
  없으면 데모 규칙 → 'demo-rules'. 'human' 재생을 어떻게 적을지는 PROTO 질문에). 어느 두 장을 바꿀지는 인자로 받은 시드 rng 로 (지금 app.js 는 마지막 두 장).
  옮길 포스터가 2장 미만이면 바꾸지 않고 by:'fallback' 줄만.
- movablePosters(layout, ctx): 사람이 안 건 벽 포스터 수. 두뇌엔 새 칸 (예: state.movablePosters) 으로 넘긴다. state.posters 는 지금 벽 포스터 수라
  reread_poster(≥1)·rearrange(≥2) 둘 다 쓴다. rearrange 만 새 칸으로 거르는 brain.js 한 줄은 두뇌 열쇠 차례 몫이라 PROTO 문서에 적기만.
- 거절은 바뀐 것 없이 이유 코드만 돌려준다 (화면 문구 없음): by 가 'user' 가 아니면 사람이 놓은 물건과 소파를 안 옮긴다.
  문어가 위에 있는 물건 (ctx.octOn: 자는 담요·앉은 소파) 은 들지 않는다.

저장이 절대 날아가지 않게
- 새 저장 키를 만들지 않는다. ppolppol_v2 안의 S.room.layout · S.room.layoutLog 두 필드이고, v 는 2 그대로 (§5.2).
- 옛 저장 (layout 없음 · rot 없음) = 전부 기본 자리 · rot 0 = 지금 화면과 같은 배치 (포스터 마지막 6장의 i 번째 → board.i, 기념품은 layoutSouvenirs 순서).
- 깨진 블록 (place 가 배열·문자열, 항목이 객체가 아님, slot 이 숫자, rot 이 45 …) 에도 예외를 던지지 않는다. 멀쩡한 항목은 그대로, 깨진 항목만 기본 자리로 본다.
- layout 안의 모르는 필드와 모르는 종류의 물건 id (moss·candle·blanket·sofa·poster:·sv: 가 아닌 것) 는 그대로 둔다.
  앨범에 없는 poster:/sv: 는 ctx.album 을 받았을 때만 규칙 4: 그 자리만 비우고 항목은 slot:'drawer' 로 남긴다 (지우지 않는다).
  ctx 를 못 받으면 아무것도 지우지 않는다. 물건 수는 줄지 않는다 (방 + 서랍 = 전부).

하지 말 것: 장면·화면 코드 (v0-c 부터), 반응·제안·문어 자기 물건 고르기 (pickReaction · pickSuggestion · pickOwnMove 는 v0-e·v1),
  옆방 side: 자리·상자 옮기기 (v1), "문어가 창가를 좋아해" 같은 말 (기록은 "옮겼어" 같은 사실만), 잠긴 칸·완성률.
검수: node tools/test-layout.js (실패하면 exit 1)
- INTERIOR §5.6 의 test-layout 줄과 PHOTO §6.5 의 확장 줄: normalize 6규칙 · 멱등 · 물건 수 보존 · 맞바꿈 · 되돌리기 (돌리기 포함) · 기록 50줄 ·
  같은 물건 이동 합치기 · rot 없으면 0 · 옛 저장 = 지금 배치 · 사람 자리 보호 · 새 포스터 규칙 · 기본 자리끼리 안 겹침 ·
  문어 앵커끼리 잇는 직선이 놓인 바닥 물건을 안 지남 (모든 자리·방향 조합, ctx.sideBuild 거짓·참 둘 다. 참일 때만 hole 앵커) ·
  소파는 등이 카메라 쪽인 방향 없음 · 소파가 창 아래면 창 앵커가 소파 앞 · 문어가 위에 있으면 들기 거절 · 기본 자리 항목이 저절로 안 생김 ·
  rearrange 기록의 by = 받은 by · 주인 없는 자리의 저장 slot 이 그대로 · 새 파일 Math.random 0건.
- 저장 왕복 (JSON.stringify → parse → normalize) 이 같은 결과 · 깨진 블록 20가지 이상에서 예외 0 · 잃은 물건 0 · 앨범에 없는 poster: 는 drawer 로 남음.
- 브라우저 한 번 (파일 뒷부분. require('playwright') 가 없으면 SKIP 한 줄 찍고 넘어간다 → node 부분은 나중에 빠른 CI 에도 넣을 수 있다):
  새 context 에서 첫 탐색 전에 한 번만 (addInitScript + sessionStorage 표시) room.layout · octopus.name 이 든 ppolppol_v2 를 넣고 settings.lastSeen 은 지금 시각으로 →
  index.html?scene=2d 를 file:// 로 연다 → APP.save() 한 번 → 새로고침 → localStorage 의 JSON 에 layout 이 글자 그대로 남는다
  (app.js normalize 가 모르는 칸을 안 지우는지 지키는 검사. window.name 거울이 더 새로우면 그쪽이 이긴다 — app.js mirrorGet·load. 실패해도 app.js 는 안 고치고 PR 에 적는다).
- docs/LAYOUT_PROTO.md: 함수 표, 자리 표, 고른 좌표 (floor.c · floor.fr · hole), 테스트 마지막 줄, 열쇠 차례에 넣을 연결 몇 줄
  (app.js normalize · rearrange 자리 · brainInput 의 movablePosters 와 brain.js 거르기 한 줄 · scene3d startHang 이 slotOfPoster 로 칸 받기) 을 적기만 한다.
멈춤: 위 검수가 초록이고 LAYOUT_PROTO.md 가 차면 draft PR (feat/room-layout → ccr-38ad393e-15xr9t) 을 열고 멈춘다. 브라우저 한 번 검사만 app.js 쪽 까닭으로 빨가면
  고치지 않고 PR 에 적은 채로 연다. 화면·장면·app.js 잇기 · '하지 말 것' 의 다음 단계 일로 넓히지 않고 PR 설명 '다음에' 에 적는다.
다음 (지금 하지 않는다): 주 세션이 열쇠를 넘기면 (열쇠 차례표: 장면 9~10일째 '꾸미기 c·d·f', app.js 11~13일째 '꾸미기 모드') 이 세션이 v0-c·d·f 와 v0-e·g 를 한다.
```

---

## 카드 20. 사진 껍데기·가구 규칙 — 찍는 틀과 소파·가구 반응 규칙 (2026-11-07 추가, 새 파일만)

언제: **지금** (새 파일만. 장면 없이 가짜 장면으로 돈다) · 크기 **M** (ROADMAP 3단계: PHOTO 1단계의 photo.js 몫 + 3·4·5단계의 규칙 몫. 필터·액자·사진첩 = 6단계는 덤). 같은 세션이 뒤이어 사진 찍기·공유를 장면에 (장면 열쇠 11~13일째), 소파·앉기를 본 게임에 (app.js·장면 열쇠 11~13일째) 잇는다.

```text
카드 20. 사진 껍데기·가구 규칙 — 찍는 틀과 소파·가구 반응 규칙 (PHOTO_AND_FURNITURE 1단계 몫 + 가구 규칙, 2026-11-07, 새 파일만)
브랜치: feat/photo-furniture
맡는 파일 (이 카드만 고친다, 모두 새 파일): js/furniture.js · js/photo.js · css/photo.css · photo.html (시험대) ·
  tools/test-furniture.js · tools/test-photo.js · docs/PHOTO_PROTO.md · docs/shots/photo-furniture/
  읽기만: js/app.js · js/scene3d.js · js/brain.js · js/world.js · js/palettes.js · vendor/fonts/galmuri.css. js/room-*.js · tools/test-layout.js 는 카드 19 것이다.
먼저 읽기: docs/PHOTO_AND_FURNITURE.md 전부 (특히 §1.2~§1.7 · §2.1 · §3.5 · §3.6 · §4.3 · §5 · §6.1 · §6.4 · §6.5 · §7),
  docs/research/furniture-tap-events.md 4·5·8·9번, docs/MODEL_VOICE.md §5, docs/INTERIOR_MODE.md §3.3 (꾹 0.6초 = 옮기기).
목표: 장면 없이 도는 사진 모드 껍데기 + 공유, 그리고 소파·가구 반응 규칙 순수 함수. 본 게임 잇기는 나중 (열쇠 차례).
순서: furniture.js → 사진 껍데기·공유. 하루에 다 못 하면 이 순서로 멈추고, 멈춘 데까지의 검수 줄이 초록이면 된다. 남은 것은 PR 에 적는다.

1) js/furniture.js — 전역 FURN, 순수 함수 (node require 도)
- beat(item, done, ctx): §3.6 의 4박. 반응이 끝나야 +1, 반응 중 연타는 안 센다. ③ 문어 몫은 물건마다 하루 한 번 (once 토큰 'crate:3@날짜').
  ③ 결과엔 by ('demo-rules', 모델 답이면 'model', 답이 없으면 'fallback') 와 꼬리표 '· 데모 규칙' ('model' 이면 '· 모델') 을 붙여 돌려준다.
  ③ 을 안 고른 판 (비율 밖·null) 과 fallback 은 꼬리표 없음. ④부터 둘이 번갈아. 소파는 예외로 §4.3 (굴림은 10분에 한 번).
- pickLine(list, mode, n, rng): stopping · cycle · once · shuffle (직전 줄 빼고). 이 줄은 집 쪽지 줄이다.
  문어 입에는 문장을 넣지 않는다 (결정 10 — 리서치 5번의 문어 대사 예시는 쓰지 않는다).
- 규칙 표는 js/furniture.js 안에 둔다 (리서치 9번이 말한 world.js·brain.js 는 잠겨 있다). 가장 구체적인 규칙이 이긴다 (조건 수가 많은 것, 동점이면 shuffle).
  창 줄은 지금 windowTap 의 말 그대로 ('별이 보여'·'맑네'·'눈이 와'·'비가 와').
- pickJoin(rng, ctx): §4.3 의 세 상황과 비율, 시드 'join|'+날짜+'|'+n 과 'join|'+tripId. 자는·나간·바쁜 문어는 없음.
  시드로 고른 결과는 늘 by:'demo-rules', 꼬리표 "옆에 앉음 · 데모 규칙". ctx.mode 가 'model' 이면 시드로 고르지 않는다:
  ctx.model 의 답이 선택지 안이면 그대로 옮겨 by:'model' (꼬리표 "· 모델"), 없거나 밖이면 { act:null, by:'fallback' }. 하던 일 계속·무반응·fallback 은 꼬리표·연출 없음.
- pickSofaIdle(rng): §3.5 다섯 가지와 비율, 8~20초, 시드 'sofa|'+날짜+'|'+n. 기록하지 않는 게임 몸짓. 뒷벽 자리면 '창밖 보기' 빠짐. '졸기' 는 반눈 몸짓이지 sleep 상태가 아니다 (잠·자장가로 잇지 않는다).
- 데모 비율이 문서에 없는 ③ (창 70% 말고) 은 지어내지 않는다. 표에 null 로 두고 PROTO 문서 질문에 적는다.
- normalize(S, today): S.furn { taps, once, found, log 최근 50 } · S.room.sofa { got, cover } · S.room.candleOn (없으면 켜짐).
  깨진 칸만 기본값, found·taps 같은 멀쩡한 칸은 그대로. today 가 아닌 once 토큰과, log 의 kind:'pose' 줄·by 가 다섯 이름 밖인 줄만 버린다.
  S.room.sofa 가 없으면 만들지 않는다 (= 아직 소파 없음, 옛 저장). 두 번 돌려도 같다.
- 가구 색은 데이터 칸 하나로만 정한다 (소파 = S.room.sofa.cover, 없으면 기본 색). 그리는 코드에 색을 따로 박지 않는다. 색 바꾸는 기능은 이 카드에서 만들지 않는다.

2) js/photo.js + css/photo.css — 전역 PHOTO. photo.html 은 그 시험대 (§1.2 화면 · §1.3 순서 · §1.5 · §1.6 · §1.7)
- 장면은 아직 안 붙인다. PHOTO.open(adapter) 의 adapter = { snap({w,h}) → {w,h,idx}, camAngle({yaw,tilt}) }.
  photo.html 은 가짜 adapter (Apollo 번호로 코드가 그린 작은 방 그림) 로 돈다. 진짜 scene.snap 은 장면 열쇠 차례.
- 위 띠 "포즈는 내가 고르는 놀이" + 비율 칩 4:5→1:1→16:9 · 뷰파인더 (1px 격자, 비율 밖 50% 체크) · 탭은 [각도] 만.
  포즈 칸은 adapter 가 주는 목록만 그린다. 지금은 빈 목록이라 숨긴다 (포즈는 2단계). 찍은 기록의 pose 는 그래서 늘 null.
- 한 손가락 = 돌리기 (옆 ±36° · 위아래 20~50° · 3° 계단, 32° 에서 시작) 는 사진 모드 전용 투명 입력 층에서. [각도] 탭 버튼(44px)으로도 같은 일.
  셔터 64px · Space·Enter · 400ms 안 연타 무시 · 플래시 #ebede9 steps(4) 200ms · 동작 줄이기면 2px 호박색 테두리 · history.pushState 로 뒤로 가기 = 나가기 · Esc.
- 방금 찍은 사진 줄 [작은 사진][공유][저장][✕], 시간 제한 없음. PNG 는 찍자마자 toBlob 으로 만들어 둔다.
  공유는 §1.7 표 1~4 그대로 (canShare → share({ files, title }) text·url 없음 · AbortError 는 조용히 · 안 되면 내려받기 ppolppol_날짜_n.png · 앱 속 브라우저면 크게 띄우고 꾹 눌러 저장).
- 합치기: 액자·필터 없이 snap 의 번호 배열을 팔레트 색으로. k = floor(1080 / 긴 변), 최소 4, imageSmoothingEnabled = false. 파일 이름에 사람·문어 이름 없음.
- 화면 문구는 js/photo.js 안에 둔다 (글꼴 점검은 js·css·index.html 만 센다. photo.html 글자는 안 센다).
그림·소리: 새 그림·소리 파일 없음. 가짜 방·셔터·칩은 Apollo (js/palettes.js) 로 코드·CSS 가 그린다 (진짜 그림은 UI 아트 세션 몫). 찍히는 순간마다 (합치기보다 먼저)
  window.AUDIO && AUDIO.on && AUDIO.on('photo', { act: 'shutter' }) 한 줄만 (AUDIO.sfx 는 없다. js/audio.js 는 안 고친다 — 모르는 이름은 넘기니, 소리 세션이 'photo' 에 §1.6 ui_shutter_1 을 붙인다).

저장이 절대 날아가지 않게
- 본 게임에선 새 키 없이 ppolppol_v2 의 S.photo · S.furn (버전 그대로). PHOTO.normalize(S.photo) 는 §6.4 모양: 깨진 항목만 버리고 id 있는 사진은 남긴다.
  두 탭은 id 합집합. 100장이 넘어도 저절로 안 지운다. 이 카드가 쓰는 건 prefs 뿐이고 사진 목록 채우기는 덤 (사진첩).
- photo.html 은 자기 키 'ppolppol_photo_bench_v1' 을 쓴다. 그 JSON 이 깨져 있으면 덮어쓰기 전에 <키>_corrupt_<시각> 으로 옮긴다 (app.js setAsideBroken 과 같게).

하지 말 것: 장면 코드 (camTilt · snap · PUPPET · 소파 그림 · sitOn — 장면 열쇠 차례), 포즈 데이터 js/poses.js (2단계), 가게 칸, 2D 사진,
  모델에게 "포즈 놀이 해도 돼?" 묻기 (v1), 사진·공유로 조개, 사진·공유·포즈 수 세기, 하트·말풍선 스티커, 우리 서버로 올리기,
  앨범(문어 포스터·일기)에 사진 칸 붙이기 (내 사진첩은 따로), 소리 파일 재생 (위 AUDIO.on 한 줄만), 사람이 앉았는지를 두뇌 입력에.
검수
- node tools/test-furniture.js: §6.5 test-furniture 줄 전부 (1만 시드 비율 ±3% 포함) · 모델 모드 1만 시드에서 ctx.model 없이 by:'model' 이 나오면 실패 ·
  ③ 의 by·꼬리표 · 깨진 S.furn·S.room.sofa 15가지 이상에서 예외 0, found·taps 보존 · normalize(S, today) 멱등 · 옛 저장 (furn·sofa 없음).
  두뇌와 떨어짐: js/world.js · js/brain.js 를 vm 에 읽기만 해서 올리고, state 에 photo·furn 을 넣고 빼도 BRAIN.plan 결과가 바이트까지 같다 (tools/test-brain.js 의 baseInput · stubFetch 를 본뜬다).
- node tools/test-photo.js: 파일 이름 · PHOTO.normalize 멱등 · 옛 저장 (photo 없음) · 깨진 S.photo 15가지 이상 예외 0, id 있는 사진 0장 잃음 · pose 는 null 이거나 by:'user'.
  Playwright (360×740 터치. require('playwright') 가 없으면 SKIP 한 줄): 합친 PNG 의 색이 전부 팔레트 · 알파 0/255 · k×k 칸마다 한 색 ·
  셔터 → 방금 찍은 줄 → 가짜 navigator.share 가 PNG 1개를 받고 text·url 없음 · canShare 가 거짓이면 내려받기 · 동작 줄이기면 플래시 없음 ·
  가짜 window.AUDIO (addInitScript) 에 찍을 때마다 AUDIO.on('photo', …) 한 번 · 400ms 안 연타엔 안 불림 · AUDIO 가 없어도 오류 0 ·
  시험대 키에 깨진 JSON → <키>_corrupt_<시각> 에 원문 그대로 · http(s) 요청 0 · file:// 동작 · 콘솔 오류 0.
- 본 게임 저장 한 번: 새 context 에서 첫 탐색 전에 한 번만 (addInitScript + sessionStorage 표시) S.photo · S.furn · S.room.sofa · S.room.candleOn 이 든 ppolppol_v2 를 넣고
  settings.lastSeen 은 지금 시각으로 → index.html?scene=2d 를 file:// 로 → APP.save() 한 번 → 새로고침 → localStorage JSON 에 넷이 글자 그대로
  (window.name 거울이 더 새로우면 그쪽이 이긴다 — app.js mirrorGet·load. 실패해도 app.js 는 안 고치고 PR 에 적는다).
  js/player.js (카드 16) 가 기준 브랜치에 있으면 PLAYER.use(가짜 블록) 뒤 PLAYER.earn({src:'photo'}) · ({src:'share'}) 가 got 0 · 장부 그대로인지도 본다. 없으면 SKIP 한 줄.
- js/photo.js · js/furniture.js 의 화면 문구 표에 좋아해|기뻐|사랑|♥|기다렸어|보고 싶|외로|심심|고마워|한정|오늘만|연속|% 없음 (§6.5 금지어. css 의 % 는 안 센다) ·
  새 파일 Math.random 0건 · python3 tools/subset-fonts.py --check (pip install fonttools brotli 먼저).
- docs/PHOTO_PROTO.md: 캡처 3장 (사진 모드 · 방금 찍은 줄 · [각도] 탭, docs/shots/photo-furniture/), 함수 표, 소리 넘김 표 (이벤트·act·언제·느낌), 열쇠 차례에 넣을 연결 (§6.1 app.js 줄 · §6.2 장면 API) 을 적기만.
덤 (위가 다 초록이고 시간이 남을 때만, PHOTO 6단계 · §1.8 · §1.9. ROADMAP 3단계 밖이라 따로 커밋): 필터 6개 (OKLab → Apollo 46색 중 가장 가까운 색, 외곽선 2색 유지) ·
  액자 7개 (고르는 칸엔 owned 로 받은 것만, 기본 = 공짜 4개) · 종이 띠 글자 (await document.fonts.load('8px Galmuri7', 띠 문구) 뒤에 그린다 — ready 만으론 캔버스 글꼴이
  안 불러와질 수 있다. 알파 0/255) · 얼굴 도장 (AVATAR 없으면 '?', 끌 수 있음) · '포즈 놀이' 표시 (pose 기록이 있을 때만, 끌 수 없음) ·
  내 사진첩 IndexedDB 'ppolppol_photos' › 'raw' { id, w, h, pal, idx } (시험대는 'ppolppol_photos_bench'). 버전 1, onupgradeneeded 는 더하기만, deleteDatabase 없음.
  지운 사진의 raw 는 4초 되돌리기가 지난 뒤에만 지우고, 그 밖에 목록에 없는 raw 는 저절로 안 지운다. IndexedDB 가 안 되면 이번에만 메모리 + "이 브라우저는 사진첩을 못 남겨. 공유·저장은 돼."
  덤 검수: 필터가 팔레트 안 · 외곽선 2색 · document.fonts.check('8px Galmuri7', 문구) 참 · 띠 글자 번짐 0 · 가짜 pose 기록이 있을 때만 '포즈 놀이' · 셔터 → 사진첩 1장 → 새로고침 → 지우기 → 되돌리기.
멈춤: 1)·2) 와 위 검수가 초록이고 PHOTO_PROTO.md 가 차면 (하루에 못 다 하면 위 '순서' 대로 멈춘 데까지) draft PR (feat/photo-furniture → ccr-38ad393e-15xr9t) 을 연다. 덤은 안 해도 된다 —
  하면 같은 PR 에 따로 커밋하고 덤 검수까지 초록이면 멈춘다. '하지 말 것' 의 일로 넓히지 않고 PR 설명 '다음에' 에 적는다. 장면·본 게임 잇기는 열쇠 차례 (11~13일째) 에 이 세션이 한다.
```

---

## 주 세션 메모 — 건네기 전에 볼 것 (카드를 쓴 세션들이 남긴 것)

- 공통 규칙은 묶음 1 의 11-07 판을 붙인다. 지금 DELEGATION_BRIEFS.md 에 있는 11-05 판에는 package.json·vendor/fonts/·assets/ui/·설계 문서 대부분 잠금과 Playwright 줄이 없다. 11-07 판을 DELEGATION_BRIEFS 에 옮겨 적는 것도 주 세션 일이다.
- 두 카드는 js 에 새 글자(예: 기웃 ✓)를 넣을 수 있어 PR 의 필수 '글꼴 점검'이 빨갛게 될 수 있다. 카드는 PR 설명 첫 줄에 새 글자를 적게 했다. 합칠 때 주 세션이 `python3 tools/subset-fonts.py` 로 부분 글꼴을 다시 만든다.
- ROADMAP 1단계 표의 '튜토리얼 본 게임 `?tut=1` (v0b) … 카드 14 세션 · 4~6일째' 줄이 열쇠 차례표 3~8일째 칸 (대사창 v1 → v1.1 → 1½ 잇기 → 튜토리얼) 과 어긋난다. 카드 14 는 차례표를 따랐다. ROADMAP 그 줄을 고친다.
- 카드 13 의 내장 산책은 PROTOCOL §1 예시가 아니라 `BRAIN.plan` (online:false, 고정 시드) 으로 만든다. 예시는 사람이 쓴 글이라 '데모 규칙' 이름표가 거짓이 되고, 읽지 않은 '✓ 읽음' 이 나온다.
- 카드 14 의 등불 쪽지 첫 줄을 TUTORIAL §3.7 "등불은 하루에 한 칸 켜져." 대신 물결 G 글 "초대한 날마다 한 칸 켜져." 로 바꿔 적었다 (초대 안 한 날엔 안 켜지니까). 싫으면 그 한 줄만 지운다.
- 두 카드 모두 `html[data-ui-busy]` 를 "이유 낱말 목록"(dlg / guide) 으로 다루라고 적었다. DIALOGUE_UI §5.11 의 "이유마다 따로 센다"를 두 카드가 따로 만들어도 맞물리게 하려는 것.
- `josa` 는 카드 14 의 `GUIDE.josa` 에 먼저 생긴다 (을/를 포함). 카드 13 의 v1.1 이 그걸 쓸지, 한 곳으로 옮길지는 잇기 때 정한다.
- 카드 13 의 다시 보기는 물결 G 대로 "오늘 줄만" 이다. DIALOGUE_UI §5.10 '묶음' 줄 (지난 날 `<details>`) 은 물결 G 뒤 낡은 글이다.
- 카드 13 의 API 표는 cards/api.md 의 얼린 표 12줄 그대로다 (손잡이 두 줄과 html[data-ui-busy] 줄이 표로 들어갔다). 카드 14 는 표를 못 보니 §5.11 끝 '얼린 표 (11-07)' 를 가리킨다 — 그게 기준 브랜치에 없으면 14 를 건네지 않는다.
- 스텁 이름표는 model:'fake' 를 '{이름} · 모델 · fake' 로 단다. 카드 13 은 '뚜루 · 모델(시험용)' 이다. 둘 다 '시험용 가짜 모델' 띠가 있어 거짓은 아니지만, 맞추려면 스텁 tagOf 를 고친다.
- 카드 14 의 소리 이름 AUDIO.on('guide', { act: 'open' | 'close' }) 은 여기서 정했다 (TUTORIAL §5.11 '윤슬 쪽지 나타남 / 닫힘'). 소리 세션이 js/audio.js 에 case 'guide' 를 더한다.
- 카드 14 는 v0a (크기 M) 가 끝의 기준이다. 첫인사 `choose`·이미 놀던 사람·가짜 모델은 '덤 (v0b 미리보기)' 으로 묶었다 (TUTORIAL §6 은 그것들을 v0b 에 둔다).

- **구멍 자리가 기존 소품과 겹친다.** ROOM_EXPANSION §5.2 의 구멍 (왼쪽 벽 z −2.3~−1.2, 높이 2.1m) 자리에 `js/scene3d.js` 의 왼쪽 벽 선반 (y 1.9, z −2.4~−1.4, 책 4·병 2·술병·컵), 샛기둥 (z −1.9), 외투 갈고리 (z −1.1) 가 있다. 문서는 창·램프·등불 7칸 선반만 본다. 카드 18 은 캡처와 안만 내고 정하지 않는다.
- **ROOM_EXPANSION §6 v0 줄과 ROADMAP 3단계 표의 '`?dev=1&side=1`'** 은 v0 을 본 게임 안 (scene3d 약 300줄 · app 50 · css 20) 으로 적었다. 11-07 잠금과 어긋나서 카드 18 은 따로 노는 `side.html` 로 바꿨다. 두 줄을 고칠지 정해 줘.
- 다락 벽은 `room` 메시 하나라서 '마개 켠 다락 픽셀 차이 0' 은 v0 에서 "장치를 붙이고 마개 상태 = 붙이기 전" 으로 잰다. 진짜 구멍+마개는 v1a 장면 차례 몫.
- **어깨 너머 표에 `none` 상태가 없다.** brain 의 STATUSES 에 `none` (느린 글의 방·편지의 방, 글은 brain.js 의 기본 문장 "아무것도 안 읽어도 됐어" / "아직 비어 있었어". world.js 에 noneNote 는 없다) 이 있는데 CORE_LOOP_V2 §3.2 표는 읽음·책장 메모·모의 방문·못 읽음 넷뿐이다. 카드 15 는 note 를 그대로, 출처 줄 없이 보이고 문서와 다르게 한 것으로 적게 했다. 표에 줄을 더할지 정해 줘.
- **빈 힌트에서는 `failed`·`simulated` 가 안 난다.** 방 66곳 모두 `clue` 가 있어 실패하면 builtin, 들판 걸음은 가져오기에 실패하면 정류장을 버린다 (brain.js `if (!res.ok) return null`). 가짜 fetch 180번 돌려 확인했다 (read·builtin·none 만). 그래서 카드 15 는 그 둘을 trip 묶음·`BRAIN.replay` 로 시험한다.
- **줍기 목록과 문어 기념품 이름이 겹친다.** §3.2 줍기 (조약돌·깃털·단추·마른 잎…) 와 world.js 기념품 (pebble 조약돌·feather 깃털·button 단추·leaf 나뭇잎) 이 같은 낱말이다. '내 것' 과 문어 선반이 헷갈릴 수 있다. 이름에 장소가 붙긴 한다 ("모자의 방 앞에서 주운 단추").
- DELEGATION_BRIEFS 의 11-05 카드 7·8 연결 모양 (`COOK = { start(opts), pause(), resume(), finish() }`, `SWIM = { segment(opts), autoplay(opts) }`) 은 CORE_LOOP_V2 §5.1 계약과 다르지만, 1묶음의 고친 카드 7·8 은 이미 §5.1 모양 (`COOK.start(el, …)` 손잡이 + `cut()`·`destroy()`, `SWIM.segment(el, …)`, 상태 넷 played·auto·cut·still) 으로 맞췄다 (확인함). 카드 15 의 가짜도 같은 모양이다. ROADMAP 카드 8 고칠 줄의 "구간 결과는 played/auto 만" 은 그래서 낡은 말이다.
- 카드 13 v0 의 DLG 에는 `ask` 가 없다 (v1.1 몫). 그래서 카드 15 는 자기 가짜 DLG 대신 기준 브랜치의 `js/dialogue-stub.js` 만 싣는다 (CARD_REVIEW 1-5, cards/api.md). 스텁과 DIALOGUE_UI §5.11 끝 '얼린 표 (11-07)' 가 기준 브랜치에 없으면 15 를 건네지 않는다. 카드 14 의 GUIDE 는 TUTORIAL §5.7 의 `register(id, { target, text, mode })`·`ready(id)` 이름을 쓴다 (15 는 GUIDE·SWIM·COOK 만 가짜).
- 카드 15 의 소리 이름 `AUDIO.on('together', { act: 'door' | 'pick' | 'meet' | 'flip' | 'table' | 'note' })` 은 여기서 정했다 (CORE_LOOP_V2 §5.5 의 문 앞 멈춤·줍기·만남·카드 뒤집기·접시·집 쪽지. `note` 는 15 의 구석 쪽지만, 안내 쪽지는 카드 14 의 `guide`). 소리 세션이 `js/audio.js` 에 `case 'together'` 를 더한다. 카드 18 은 v0 이 무음이고 §3.4 표의 소리 칸이 실제 박자 시각과 맞는지만 적는다.
- 카드 15 의 ⑥ 잠은 밤 (19~6시) 이거나 반응이 졸림일 때만이다 (CARD_REVIEW 2-3). §3.4 ④·⑥ (빈 차례 빼고 늘 잔다) 과 다르니 TOGETHER_PROTO.md 의 '문서와 다르게 한 것' 에 적게 했다. 본 게임의 D-1 (`app.js` `finalPose` 가 늘 `octState('sleep')` → `audio.js` `startLullaby`) 은 주 세션 몫이라 카드에 넣지 않았다. 공통 규칙의 물결 G 목록과 ROADMAP 에는 아직 D-1 이 없어서 카드는 '물결 G 예정' 으로만 적었다.
- order.md 의 카드 15 줄 (지금 4번) 은 11-07 에 고쳤다: 13 은 가짜가 아니라 주 세션 스텁 (`js/dialogue-stub.js` · §5.11 얼린 표가 기준 브랜치에 오른 뒤) 이고, 7·8·14 만 가짜다. 위 '없으면 15 를 건네지 않는다' 와 맞는다.
- 새 js 파일에 KS X 1001 밖 글자 (기호 ◀ ▶ ◌ ✕ 같은 것) 가 들어가면 CI '글꼴 점검' 이 빨개질 수 있다. 공통 규칙대로 카드는 서브셋을 다시 만들지 않으니, 그 이유의 빨강은 합칠 때 주 세션이 다시 만든다.
- ROOM_EXPANSION §5.5 는 컵 놀이 kit 를 `/home/user/ppolppol-play` (작업 트리 경로) 로 가리킨다. play.html·js/play.js 는 이미 이 브랜치에 들어왔다 (79d5282). 낡은 경로다.
- ROADMAP 의 새 카드 표는 카드 15 파일을 together.html · js/together*.js · css/together.css · tools/test-together.js 로 적었다. 공통 규칙대로 docs/TOGETHER_PROTO.md · docs/shots/together/ 를 더했다.

공통 규칙(11-07 판) 뒤에 붙여서 건넨다. 카드 17 은 카드 16 을 끝낸 **같은 세션**에 이어서 준다 (지갑 `PLAYER` 를 같이 쓴다).
돈 이름은 문서대로 **'조개'** 다 (결정 19). '가리비'는 요리 재료 '조개' 단계의 새 이름이다 (OWNER_DECISIONS 기본값 표 마지막 줄, ROADMAP 카드 7 줄).
11-07 카드 검토 (docs/CARD_REVIEW.md) 반영: 카드마다 '멈춤' 줄 · 카드 17 의 '함께한 날' 배지는 막대·n/m·보상 줄 없이 그날 조용히 생긴다 (주인 결정 11-07).
카드 17 의 소리 이름 AUDIO.on('badge', { act:'claim', coins:N }) 은 여기서 정했다 (N 은 받은 조개, 소품은 0. 소리 세션이 js/audio.js 에 case 'badge' 를 더하고, coins 가 1 이상일 때만 ACHIEVEMENTS §8.3 의 coin_get 을 붙인다). 카드 16 은 소리가 없다 (PLAYER_PROGRESSION 에 가게 소리가 없다).
주 세션이 주인에게 물을 것: 카드 16 가게의 "논 날 6일에 들어와 (지금 4일)" (PLAYER_PROGRESSION §6.1 표 · §8.3 그림 그대로) 도 CARD_REVIEW 3-1 이 말한 '날짜를 채우려는 끌림' 과 같은 결이다. 주인 결정은 '함께한 날' 배지만 다뤄서 카드는 문서대로 두었다 ("띄엄띄엄 와도 돼" 는 붙어 있다).

공통 규칙(11-07 판) 뒤에 붙여서 건넨다. 두 카드는 서로 기다리지 않는다. 둘 다 새 파일만 만든다.
겹치지 않게 나눴다: 자리 표·layout 저장·tools/test-layout.js(소파 자리 검사 포함)는 카드 19, 사진·가구 반응 규칙·S.photo·S.furn 은 카드 20.
11-07 카드 검토 (docs/CARD_REVIEW.md) 반영: 카드마다 '멈춤' 줄 · 카드 20 의 셔터 소리 이름 AUDIO.on('photo', { act: 'shutter' }) 은 여기서 정했다 (소리 세션이 js/audio.js 에 case 'photo' 를 더한다).


---

## 옛 카드 1~6 (11-05 판, 지금 줄 차례 표 참고)

## 카드 1. 공동 낙서 프로토타입 (놀이 2번)

**11-07 상태**: 나중 (사람 시험 뒤). 줄 때 결과에 판 id · 다 그린 판 · 이름 붙임 표시를 더한다 (ACHIEVEMENTS §9.3).

```text
브랜치: play/doodle
만들 것: doodle.html + js/doodle.js (+ css/doodle.css), docs/DOODLE_PROTO.md, tools/test-doodle.js
목표: 사람과 문어가 한 획씩 번갈아 놓아서, 정체를 모르는 이상한 생물 하나를 같이 만드는 놀이.
- 자유 그림이 아니라 선·원·점·도장 몇 개를 번갈아 놓는 방식. 두세 차례 하고 끝낼 수 있게.
- 핵심 재미: 상대가 내 획을 어떻게 받아들일지 모른다. 동그라미를 얼굴로 그렸는데 문어는 바퀴로 이어 갈 수도 있다.
- 끝나면 결과를 PNG 로 저장할 수 있게 하고, 이름 붙이기는 선택.
- 문어 쪽 선택은 choose(situation) → Promise<{ action, target?, line?, note? }> 인터페이스로 분리한다.
  지금은 '데모 규칙'(시드 PRNG)이 고르고, 나중에 진짜 모델이 같은 메뉴에서 고를 수 있게.
  situation 은 작게: 지금 캔버스에 놓인 조각들(종류·칸 좌표), 사람이 방금 놓은 것, 가능한 행동 목록(그만두기 포함).
- 기록마다 by: 'user' | 'demo-rules' | 'playback' 를 붙인다. 화면 구석에 작게 '데모 규칙' 한 줄.
- 문어는 안 하고 넘어갈 수도 있다. 그건 실패가 아니다.
- 픽셀 느낌: vendor/fonts/galmuri.css + js/palettes.js 의 Apollo 팔레트를 읽기만 해서 쓴다. 2px 격자, 확대·축소로 흐리게 하지 않기.
검수: tools/test-doodle.js (Playwright, 360×740, 터치) — 세 차례 진행·완료, PNG 저장, 같은 시드면 같은 결과, file:// 동작, 콘솔 오류 0.
       docs/DOODLE_PROTO.md 에 화면 캡처 3장과 "처음 보는 사람이 설명 없이 두 번째 획을 놓는가" 를 볼 체크리스트.
```

## 카드 2. 도서관 지도 프로토타입 (DESIGN §17.2)

**11-07 상태**: 나중 (사람 시험 뒤). 고칠 줄 없음.

```text
브랜치: proto/map
만들 것: map.html + js/map.js (+ css/map.css), docs/MAP_PROTO.md, tools/test-map.js
목표: 문어가 다니는 세계(js/world.js 의 66개 방과 갈래)를 지도로 보여 준다. "다음엔 어디로 갈까"가 구체적으로 느껴지게.
- js/world.js 는 읽기만. 진행 정보는 localStorage 'ppolppol_v2' 를 읽기만 (없으면 예시 저장 파일로).
- 보여 줄 것: 오늘 걸은 길, 자주 간 곳(방문 횟수는 숫자 그대로, "좋아하는 곳" 같은 말은 쓰지 않는다), 아직 안 가 본 갈래.
- 하지 말 것: 완성률(%·N/66), 잠긴 자물쇠 아이콘, 놓친 것을 아쉬워하게 하는 문구.
- 폰 세로 화면에서 손가락으로 끌고 확대할 수 있게. 방을 누르면 그 방에서 있었던 일(날짜·포스터 제목)을 사실대로.
검수: tools/test-map.js — 저장 없을 때·방문 20곳 저장·방문 66곳 저장 세 경우, 360×740, file://, 콘솔 오류 0. 캡처 3장.
```

## 카드 3. MCP 서버 초안 (진짜 모델이 문어가 되는 길)

**11-07 상태**: 주지 않는다. 카드 9 가 대신한다.

```text
브랜치: feat/mcp-server
만들 것: mcp/ 폴더 (Node, @modelcontextprotocol/sdk, stdio), mcp/README.md, mcp/test/*.js
     그리고 docs/PROTOCOL.md §3 (도구 표) 수정 — 이 문서는 이 카드가 맡는다.
먼저 읽기: docs/PROTOCOL.md, docs/MODEL_VOICE.md, docs/CURIOSITY_NOTES.md,
          .claude/skills/cozy-web-game/references/mcp-readiness.md, references/model-voice-and-play.md
목표:
- 도구: look_room, depart, peek, finish, stay_home, empty_turn.
  귀가·기억 고르기·포스터 걸기·마무리 네 개는 finish 하나로 묶는다.
  peek(읽고 나서 다음 갈 곳 고르기)는 따로 둔다 — 읽은 걸 보고 마음을 바꿀 수 있어야 한다.
- 모델이 꼭 내야 하는 건 행동 하나뿐. reaction·메모·이유는 모두 선택 (지금 PROTOCOL 의 reaction 필수를 선택으로).
- peek 는 서버가 실제로 ko.wikipedia 를 읽고 status 를 정직하게 돌려준다 (read / failed / simulated). 지어낸 요약 금지.
- finish 의 선택 필드: note?: { text, about? }, setDown?: [noteId] (CURIOSITY_NOTES 형식).
  다음 세션 look_room 은 내려놓지 않은 최근 메모 3개만, 작성 주체·세션·날짜를 붙여서.
- 결과는 게임이 그대로 재생할 수 있는 이벤트 JSON (PROTOCOL §1 형식) 으로 남긴다. 게임 쪽 불러오기 연결은 하지 않는다 (다른 작업이 맡음).
- 도구 설명과 반환값은 짧게 (토큰 절약). 반환값 크기를 테스트에서 재서 README 에 표로.
검수: mcp/test — 각 도구 왕복, 위키 실패 시 failed 정직 반환, set_down 메모가 look_room 에 안 나옴, 이유 없이도 finish 성공.
```

## 카드 4. 자동 테스트 (GitHub Actions)

**11-07 상태**: 끝남. 5f5f611 로 합쳤다.

```text
브랜치: ci/tests
만들 것: .github/workflows/test.yml (새 파일만), package.json 의 scripts 는 건드리지 말고 워크플로에서 직접 node 명령 실행
목표: PR 과 push 마다 빠른 테스트 자동 실행. 여러 Claude 가 동시에 일하니 서로 깨뜨린 걸 바로 알게.
- 빠른 묶음 (필수): node tools/check-world.js, node tools/test-brain.js, node tools/test-runner.js, node tools/test-api.js
- 느린 묶음 (선택 job): Playwright chromium 설치 후 SMOKE_ONLY=A,B,I node tools/smoke.js, node tools/test-scene-perf.js
  (tests/evidence/ 를 다시 쓰니 결과 파일은 artifact 로만 올리고 커밋하지 않는다)
- 글꼴 점검: pip install fonttools brotli && python3 tools/subset-fonts.py --check
검수: 이 브랜치의 draft PR 에서 워크플로가 초록으로 도는 것까지 확인하고, 각 job 소요 시간을 PR 설명에 적기.
```

## 카드 5. 접근성·성능 점검 보고서 (읽기만)

**11-07 상태**: 12일째쯤 (11-16). 고칠 줄: localhost 는 개발 모드가 켜지니 ?dev=0 (2D 는 ?scene=2d&dev=0) 으로 플레이어 화면을 잰다.

```text
브랜치: audit/a11y-perf
만들 것: docs/research/audit-2026-11.md 와 캡처 (코드 수정 없음)
목표: 지금 게임을 폰 기준으로 점검해서 우선순위 목록을 만든다. 고치는 건 나중에 우리가 한다.
- 로컬에서 python3 -m http.server 로 띄우고 Playwright + Lighthouse(설치 가능하면)로 360×740 모바일 측정.
- 볼 것: 첫 화면까지 시간, 긴 작업(long task), 메모리, 화면 읽기 도구로 읽히는 순서, 키보드만으로 산책 한 바퀴, 대비, 눌러지는 크기, '동작 줄이기'.
- 2D 대체 화면(?scene=2d)도 같이.
- 각 항목: 무엇이 문제인지 → 어떻게 재현하는지 → 고칠 파일과 대략의 방법 → 심각도.
```

## 카드 6. 라이트 픽셀 테마 대비 시안 (결정거리 4번, 그림만)

**11-07 상태**: 끝남. 3a1a720 으로 합쳤다. 주인이 고르는 일만 남았다 (NIGHT_LOG 결정거리 4, docs/research/light-contrast/proposal.md).

```text
브랜치: design/light-contrast
만들 것: docs/research/light-contrast/ 에 시안 PNG 와 proposal.md (CSS 는 고치지 않는다)
배경: 라이트 픽셀 테마에서 호박색·장미색 글자 대비가 3.5:1 (기준 4.5:1), 켜진/꺼진 등불 칸 대비가 1.06:1 이다.
목표: js/palettes.js 의 Apollo 팔레트 안에서만 색을 골라 시안 2~3개를 만든다.
- 각 시안: 바뀌는 CSS 변수 목록(이름 → 새 색), 대비 수치 표, 첫 화면·방 보기·영수증 캡처.
- 기존 인상(종이·나무 느낌)이 얼마나 달라지는지 한 줄씩 솔직하게.
- 결정은 주인이 한다. 추천은 하나만 표시.
```
