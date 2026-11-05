# 다른 Claude 에게 나눠 줄 일 (2026-11-05)

카드 하나를 통째로 복사해서 다른 계정의 Claude Code 세션에 붙여 넣으면 된다.
**맨 위 '공통 규칙'은 모든 카드 앞에 같이 붙인다.**

지금 이 브랜치(`ccr-38ad393e-15xr9t`)에서 다른 작업이 아래 파일들을 고치고 있다. 그래서 카드들은 이 파일들과 겹치지 않는 일만 골랐다.
- 4물결: `css/style.css`, `index.html`, `js/app.js`, `js/ui-art.js`, `tools/bundle.js`, `tools/test-api.js`
- 컵 놀이: `js/scene3d.js`, `play.html`, `js/play.js`
- 5물결: `js/brain.js`, `js/app.js`, `tools/smoke.js`, `tools/test-brain.js`, `README.md`, `docs/DESIGN.md`

---

## 공통 규칙 (모든 카드 앞에 붙이기)

```text
저장소: skadmlwls9455-pixel/Let-s-model-play
기준 브랜치: ccr-38ad393e-15xr9t (여기서 새 브랜치를 만들고, 끝나면 이 브랜치를 대상으로 draft PR)
게임: "뽈뽈 문어" — AI 모델을 문어로 보여 주는 아늑한 픽셀아트 웹 게임. 바닐라 HTML/CSS/JS, 빌드 없음, 모듈 없음.
     file:// 과 정적 호스팅(Vercel) 둘 다에서 돌아야 한다.

먼저 읽기:
- docs/MODEL_VOICE.md — 모델의 선택과 말을 덧붙이거나 빼거나 바꾸지 않는다. 고르기 전에 몰래 끌지 않는다.
- docs/CURIOSITY_NOTES.md — 코드는 사실(횟수)만 쓴다. 취향 말은 모델이 직접 쓴 메모로만, 누가 썼는지 붙여서.
- .claude/skills/cozy-web-game/SKILL.md 의 '중요' 부분 (AI 캐릭터 정직 표기, 벌·연속 기록 압박 없음, 시드 PRNG)

절대 고치지 말 것 (다른 작업이 고치는 중):
js/app.js, js/brain.js, js/scene3d.js, js/scene2d.js, js/world.js, js/ui-art.js, css/style.css, index.html,
tools/smoke.js, tools/bundle.js, tools/test-brain.js, tools/test-api.js, README.md, docs/DESIGN.md, audio/

지킬 것:
- 결정을 내리는 코드에 Math.random 금지. 시드 PRNG 사용 (.claude/skills/cozy-web-game/scripts/prng.js).
- 화면에 새 한국어 문구를 넣으면 픽셀 글꼴 부분 집합 점검:
  pip install fonttools brotli && python3 tools/subset-fonts.py --check  (stale 이면 문구를 바꾸거나 도구로 다시 만든다)
- 폰 우선: 360×740 세로, 터치, 누르는 곳 44px 이상, '동작 줄이기' 존중.
- 점수·승패·연속 기록·"N/66 발견" 같은 완성률 압박을 넣지 않는다.
- 커밋 메시지는 한국어로 짧고 평이하게.
- 기존 테스트가 깨지지 않는지 확인: node tools/check-world.js && node tools/test-brain.js && node tools/test-runner.js
```

---

## 카드 1. 공동 낙서 프로토타입 (놀이 2번)

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

```text
브랜치: design/light-contrast
만들 것: docs/research/light-contrast/ 에 시안 PNG 와 proposal.md (CSS 는 고치지 않는다)
배경: 라이트 픽셀 테마에서 호박색·장미색 글자 대비가 3.5:1 (기준 4.5:1), 켜진/꺼진 등불 칸 대비가 1.06:1 이다.
목표: js/palettes.js 의 Apollo 팔레트 안에서만 색을 골라 시안 2~3개를 만든다.
- 각 시안: 바뀌는 CSS 변수 목록(이름 → 새 색), 대비 수치 표, 첫 화면·방 보기·영수증 캡처.
- 기존 인상(종이·나무 느낌)이 얼마나 달라지는지 한 줄씩 솔직하게.
- 결정은 주인이 한다. 추천은 하나만 표시.
```

## 카드 7. 요리 머지 미니게임 — 문어가 산책 간 동안 요리하기 (2026-11-05 추가)

```text
브랜치: game/cook-merge
만들 것: cook.html + js/cook.js (+ css/cook.css), docs/COOK_PROTO.md, tools/test-cook.js
목표: 나이·실력을 덜 타고 천천히 즐기는 '모이면 합쳐지는' 미니게임.
쓰임(11-05 결정 '같이 가기' 흐름): 산책을 보낼 때 사람은 '같이 가기' 또는 '집에서 기다리기'를 고른다. 이 게임은 '집에서 기다리기' 쪽 놀이다.
     그래서 중간에 멈췄다가 이어 할 수 있어야 한다 (문어가 돌아오면 냄비는 그대로 두고 식탁 장면으로 갔다가, 나중에 이어 하기).
     페이지 안에 COOK = { start(opts), pause(), resume(), finish() → 결과 } 같은 작은 연결 지점을 둔다 (본 게임 연결은 나중에 우리가). 문어가 산책(연구) 간 동안 사람이 요리를 하고,
     돌아오면 같이 먹는 장면으로 이어지게 하는 것이 최종 목표 (본 게임 연결은 이 카드가 아니라 나중에 우리가 한다).
방식(추천, 바꿔도 됨 — 바꾸면 이유를 문서에):
- 냄비에 바다 재료를 떨어뜨린다. 같은 재료끼리 닿으면 한 단계 위 재료로 합쳐진다 (예: 물방울 → 해초 → 미역 → 조개 → 새우 → … 7~9단계).
  수박 게임처럼 둥근 물체 물리. 물리는 직접 짠 간단한 원 충돌로 (외부 라이브러리 없이, 200줄 안팎).
- 실패 없음: 냄비가 가득 차면 '넘쳤다·게임 오버'가 아니라 "다 됐다!" — 그때까지 만든 재료로 요리가 완성된다.
  언제든 "이걸로 할래" 로 끝낼 수 있다. 시간 제한 없음. 점수판·랭킹 없음.
- 한 판은 1~2분 (산책 한 번 길이). 결과: 요리 한 접시 (가장 높이 만든 재료 + 섞인 재료로 이름과 그림이 정해짐, 시드로 결정적).
- 만든 요리는 '요리 수첩'에 날짜와 함께 남는다. 완성률(N/M)·빈 칸 실루엣은 보이지 않는다.
- 그림: js/palettes.js 의 Apollo 팔레트로 코드가 그리는 픽셀 아트 (캔버스 또는 SVG, 2px 격자, 확대는 정수 배만). 외부 이미지 금지.
- 소리: audio/ 는 다른 세션 소유라 쓰지 않는다. 필요한 소리 목록만 문서에 적는다.
- 나중 연결을 위해 결과를 이런 데이터로 내보낸다: { dish: { id, name, tier, ingredients:[…] }, madeAt, by: 'user' }.
  문어가 그걸 먹을지·맛볼지·아껴 둘지는 문어 쪽 선택이다 (이 카드에서는 만들지 않는다). 요리를 문어가 '좋아한다'고 코드가 쓰지 않는다.
검수: tools/test-cook.js (Playwright, 360×740, 터치) — 한 판 끝까지, 가득 찼을 때 요리 완성(실패 화면 없음), 같은 시드·같은 입력이면 같은 결과,
     '동작 줄이기'에서 흔들림 최소, file:// 동작, 콘솔 오류 0. docs/COOK_PROTO.md 에 GIF 또는 캡처 3장.
```

## 카드 8. 헤엄치기 미니게임 — 플래피 버드처럼 눌러서 오르내리기, 부드럽게 (2026-11-05 추가)

```text
브랜치: game/swim
만들 것: swim.html + js/swim.js (+ css/swim.css), docs/SWIM_PROTO.md, tools/test-swim.js
목표: 탭하면 문어가 먹물을 뿜으며 위로 쭉 올라가고(문어의 제트 추진), 놓으면 천천히 가라앉는다.
쓰임(11-05 결정 '같이 가기' 흐름): '같이 가기'를 고르면 산책의 방과 방 사이를 이 게임으로 같이 헤엄쳐 간다 (먹물뿜기).
     그래서 한 판 대신 '구간'이 기본 단위다: 8~15초짜리 구간을 여러 번 이어 붙일 수 있게, 그리고 사람이 안 하면 자동으로 지나가게.
     구간에서 한 일은 문어가 갈 곳·읽을 것을 절대 바꾸지 않는다 (경로는 문어가 고른다).
     SWIM = { segment(opts) → Promise<결과>, autoplay(opts) } 같은 작은 연결 지점을 둔다 (본 게임 연결은 나중에 우리가). 해파리·물고기·산호 사이를 피해 헤엄친다.
- 기존 '다락방 달리기'(js/runner.js)는 반사 신경 게임이라 젊은 층 위주다. 이건 모두가 할 수 있게 부드럽게:
  느린 속도, 넉넉한 충돌 판정, 부딪혀도 죽지 않는다 — 문어가 빙글 돌고 먹물 한 번 뿜고 계속 간다.
- 따로 할 때는 구간 몇 개를 이어서 정해진 거리(예: 1분)를 가면 끝. "부딪히지 않고 간 거리" 같은 사실은 보여 줘도 되지만 랭킹·연속 기록·벌은 없다.
- 선택: 바다 생물이 가끔 같이 헤엄쳐 주거나 길을 비켜 주는 귀여운 순간.
- 그림·소리 규칙은 카드 7과 같다 (Apollo 팔레트, 코드로 그린 픽셀 아트, 정수 배 확대, audio/ 쓰지 않음).
- 화면: 캔버스는 아트 px 기준 정수 배 (runner.js 의 192×108 → 3배 방식을 참고, 코드는 복사하지 말고 새로).
검수: tools/test-swim.js — 한 판 끝까지, 부딪혀도 계속 진행, 같은 시드·입력이면 같은 장애물 배치, 360×740 터치, '동작 줄이기', file://, 콘솔 오류 0.
```

## 카드 9. (큰 일, 로컬 Claude Code 추천) MCP 서버 + 진짜 모델이 문어가 되어 놀아 보기 (2026-11-05 추가)

카드 3을 키운 판이다. 카드 3을 아직 아무에게도 안 줬다면 카드 3 대신 이걸 준다.
로컬이 좋은 이유: 클라우드 샌드박스에서는 위키백과가 막혀 있고 MCP 서버에 진짜 Claude 를 붙여 볼 수 없다. 로컬에서는 둘 다 된다.

```text
브랜치: feat/mcp-octopus
맡는 파일 (이 카드만 고친다): mcp/ (새 폴더), docs/PROTOCOL.md, .claude/skills/ppolppol-octopus-play/ (새 스킬 폴더), docs/MCP_PLAYTEST.md (새 문서)
게임 코드는 고치지 않는다. 게임 쪽 연결은 이미 있는 '이벤트 JSON 붙여넣기' 재생 칸(index.html 의 데모 패널 #d-json → APP.importEvents)으로만 확인한다.
(데모 패널은 곧 일반 플레이어에게서 숨기고 index.html?dev=1 일 때만 보이게 바뀐다. 그 뒤에는 ?dev=1 로 열어서 쓴다. 테스트에서는 APP.importEvents(json) 를 직접 불러도 된다.)

먼저 읽기: docs/PROTOCOL.md, docs/MODEL_VOICE.md, docs/CURIOSITY_NOTES.md,
          .claude/skills/cozy-web-game/references/mcp-readiness.md 와 references/model-voice-and-play.md,
          js/brain.js 의 replay/정규화(읽음 판정·출처 규칙)는 읽기만.

1단계 — 서버 (mcp/, Node, @modelcontextprotocol/sdk, stdio)
- 도구 6개: look_room, depart, peek, finish, stay_home, empty_turn.
  · 귀가·기억 고르기·포스터 걸기·마무리 네 개는 finish 하나로 묶는다. peek(읽고 → 다음 갈 곳 고르기)는 따로 둔다.
  · 모델이 꼭 내야 하는 건 행동 하나뿐. reaction·메모·이유는 전부 선택 (PROTOCOL 의 reaction 필수를 선택으로 고친다).
  · 모든 입력에 '그만두기·아무것도 안 하기' 길이 있다 (finish 를 바로 불러도, empty_turn 을 불러도 된다).
- peek 는 서버가 진짜로 ko.wikipedia 를 읽는다. status 는 read / failed / simulated 를 정직하게. 지어낸 요약 금지.
  출처는 ko.wikipedia 문서 주소만, 썸네일은 upload.wikimedia.org 만 (게임의 brain.js 정규화 규칙과 같게).
- 호기심 메모: finish 의 note?: { text, about? }, setDown?: [noteId]. look_room 은 내려놓지 않은 최근 3개만,
  작성 주체(model)·모델 이름(알면)·세션·날짜를 붙여 "이전 산책에서 남겨진 메모"로. 보관 메모의 존재·개수는 알리지 않는다.
  상태는 mcp/state.json (또는 OS 앱 데이터 폴더)에 저장.
- 결과: 산책마다 게임이 그대로 재생할 수 있는 이벤트 배열(PROTOCOL §1 형식, by: 'mcp')을 mcp/out/<날짜>-<n>.json 으로 남긴다.
- 도구 설명과 반환값은 짧게. 도구별 반환 크기(바이트)를 테스트에서 재서 README 에 표로.

2단계 — 짝꿍 스킬 (.claude/skills/ppolppol-octopus-play/)
- '스킬 만들기 가이드' 형식 (SKILL.md, 설명은 무엇+언제, 꺾쇠 금지, 1024자 이내).
- 문어 역할을 하는 모델에게 알려 줄 것: 도구 순서(look_room → depart → peek 여러 번 → finish), 정직한 status 를 그대로 쓰기,
  그리고 허락들 — 그만둬도 된다, 이유를 안 써도 된다, 메모를 안 남겨도 된다, 사람의 힌트를 안 따라도 된다, 집에 있어도 된다.
- 하지 말 것: "재미있게 해", "사용자를 기쁘게", "항상 메모를 남겨" 같은 압박 문구. 모델의 말투를 정해 주는 대본.

3단계 — 진짜로 놀아 보기 (로컬에서 claude mcp add 로 서버를 붙인다)
- 산책 10번 이상을 진짜 모델로 돌리고, 대화 기록과 mcp/out 이벤트를 남긴다. 힌트 있는 판·없는 판·말이 안 되는 힌트를 섞는다.
- 각 판의 이벤트를 게임의 #d-json 에 붙여 넣어 재생되는지 확인하고 360×740 캡처를 남긴다.
- docs/MODEL_VOICE.md 의 '자동 점검' 목록을 진짜 기록에 대 본다: 그만두기 길이 늘 있었나, 모델의 말이 글자 그대로 나왔나,
  읽지 않은 걸 읽었다고 한 적이 있나, 내려놓은 메모가 다시 들어갔나.
- 토큰 실측: 산책 1번에 도구 호출 수, 입력·출력 토큰(볼 수 있는 만큼), 걸린 시간. 어디서 많이 쓰는지 표로.
- docs/MCP_PLAYTEST.md 에 정리: 잘 된 것, 모델이 헷갈려 한 도구 설명, 고칠 것, 그리고 모델이 실제로 남긴 메모 몇 개를 글자 그대로.

검수: mcp/test — 도구 왕복, 위키 실패 시 failed 정직 반환, set_down 메모가 look_room 에 안 나옴, 이유·메모 없이도 finish 성공,
     같은 이벤트를 게임이 재생 (Playwright 로 index.html 의 #d-json 에 넣고 오류 0).
```

## 카드 10. (큰 일, 로컬에 Blender 가 있으면) 다가올 기능용 픽셀 소품 만들기 (2026-11-05 추가)

```text
브랜치: art/props-next
맡는 파일: assets/ 아래 새 파일만 (기존 파일 덮어쓰기 금지), docs/research/props-next.md
먼저 읽기: .claude/skills/cozy-web-game/references/blender-pixel-pipeline.md, three-pixel-look.md, pixel-look-references.md, js/palettes.js(Apollo)
만들 것 (각각 다락방 픽셀 룩에 맞게, 팔레트는 Apollo 만):
- 컵 놀이: 컵 3종, 공 2색, 작은 상자
- 요리(집에서 기다리기): 냄비, 바다 재료 7~9단계(물방울→해초→미역→조개→새우→…), 완성 요리 접시 몇 가지, 작은 식탁
- 먹물뿜기(같이 가기): 해파리, 작은 물고기 2~3종, 산호, 물풀
- 방 넓히기: 비계(공사 발판), 망치, 먼지 구름, 새로 생길 옆 칸의 벽·바닥 타일
각 소품: 결과 PNG(정수 배), 원본(.blend 또는 생성 스크립트), 크기·용도 표를 docs/research/props-next.md 에.
게임 코드에 붙이는 건 하지 않는다 (붙이는 건 각 기능 작업이 한다).
```
