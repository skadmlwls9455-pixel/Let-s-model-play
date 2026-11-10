# 말만 하고 못 한 것 — 종합 (2026-11-08)

레포 `/home/user/Let-s-model-play` · 브랜치 `ccr-b623fbf9-0rm8dp` (HEAD 7115c1f + 작업 트리) · 베이스 `origin/ccr-38ad393e-15xr9t`.
판정은 문서의 '완료' 표시가 아니라 **코드 grep** 으로 했다. 근거 열의 `0건` 은 HEAD 에서 그 이름·문자열이 하나도 없다는 뜻.
크기: S 반나절 이하 · M 하루 안팎 · L 이틀 이상. 별표는 (C) 안 우선순위 — ★★★ 핵심 루프가 폰에서 재밌게 돌기 · ★★ 지금 진행 중인 캐릭터 축과 바로 이어짐 · ★ 나머지.

---

## (A) 이 세션이 진행 중 / 예정 (빼지 않음)

| # | 일 | 상태 | 코드 근거 |
|---|---|---|---|
| A1 | 내 캐릭터 꾸미기 파츠 (머리·눈·얼굴·옷·신발·장식 · 11-09 부터 설정 › 내 모습 › '모습 바꾸기' 옷장 시트) | **이 세션 진행 중** | `js/app.js:181 PLAYER_CATS` · `:218 settings.player` · `:531 setPlayer` 작업 트리에 있음 (미커밋) · `docs/PLAYER_PARTS.md` WIP 7115c1f. 옷방 문은 아직 (`'왼쪽 옷방(나중)'` 주석뿐) |
| A2 | 움직이기 = 왼쪽 아래 발자국 손잡이(가상 스틱) + 발자국 자국 + 데스크톱 방향키 | **이 세션 예정** | `grep 'ArrowLeft|joystick|스틱|발자국' js/` → 0건. 지금은 문 톡으로만 걷는다 (`js/scene3d.js:1430 playerWalkTo`) |
| A3 | 한 화면 배치 (장면 100dvh · 상태 띠 겹침 · 대사창 아래서 슥 · 오늘의 산책은 시트 + 토스트) | **지음 (11-10)** — `<html data-layout="one">` (3D 만) · DIALOGUE_UI §3.2 고침 · 증거 `tests/evidence/layout/`. 대사창은 자리만 (v1 엔진은 아직). 아래 옛 메모는 지은 뒤 기준으로 낡았다 | `css/style.css:104 #scene height: calc(240px*var(--px))` · `:860 .mode-3d clamp(250px,44vh,400px)`. 100dvh 는 body·모달에만. **주의**: `docs/DIALOGUE_UI.md §3.2` 는 세로 쌓기(장면 325 + 상태 44 + 대사창 130) 를 정해 둬서 문서를 함께 고쳐야 함 |

---

## (B) 다른 세션이 베이스에서 이미 한 것 (base-has-it) — 합칠 때 확인

| # | 일 | 베이스 근거 | 합칠 때 |
|---|---|---|---|
| B1 | 9물결 요리 시제품 (카드 7): `cook.html` · `js/cook.js`(1541줄) · `js/cook-art.js` · `css/cook.css` · `docs/COOK_PROTO.md` · `tools/test-cook*.js` | `git diff --stat HEAD...base` | **시제품만**. 베이스 `index.html`·`app.js` 에 `cook` 0건 → 놀이방 부엌 자리 연결·`[식탁에 차리기]`·조개 지급은 아직 아무 데도 없음 (→ C) |
| B2 | 소리 켜기·끄기를 설정 › 소리 칸 맨 위 '켜기' 체크로, 장면 위 스피커 단추 삭제, 설정 아이콘 톱니바퀴 (주인 11-08) | base `index.html:81` 주석 · `js/audio.js +75` · `OWNER_DECISIONS` 11-08 | HEAD `index.html:94 #btn-sound` 아직 있음 → `index.html`·`audio.js` 충돌 주의. TUTORIAL `sound` 쪽지 줄은 베이스에서 dropped 로 표시됨 |
| B3 | `js/audio.js` 에 `AUDIO.on('cook')` 훅 · `tools/test-audio.js` +191 | 같은 diff | 요리 소리는 시제품 쪽만 |

---

## (C) 말만 하고 안 한 것

각 줄 = 약속 · 출처 · 크기 · **코드 근거 없음 확인** · 선행 조건.

### C-1 핵심 루프 · 대사

| ★ | 약속 | 출처 | 크기 | 코드 근거 없음 확인 | 선행 조건 |
|---|---|---|---|---|---|
| ★★★ | 대사창 본 게임 `js/dialogue.js`(DLG) + `css/dialogue.css`: 한 줄씩 넘기는 `#dbox` · 타자기 · 대사 다시 보기 · `#log` 를 다시 보기 안으로 | ROADMAP 1단계 · DIALOGUE_UI §5 · NIGHT_LOG 결정 13 · 카드 13 | L | `js/dialogue-stub.js` 만 있고 `index.html` 에 `dialogue` 0건(스텁도 안 실림). `js/dialogue.js`·`css/dialogue.css`·`dialogue.html` 없음 | 없음 (스텁 API 표 얼려 둠). A3 '대사창 아래서 슥' 은 배치 몫, 엔진은 이것 |
| ★★★ | 돌아와서 대화 두 차례 (`[어디 갔어?][어땠어?][그만]` 칩 → 문어 대답 → 한 번 더, `DLG.ask` · `S.talk` 저장) | ROADMAP 1단계 v1.1 · DIALOGUE_UI §4.5 · 결정 18 | M | `grep '어땠어|어디 갔어|S\.talk' js/app.js` → 0건 (test-dialogue-stub.js 시험 데이터만) | 대사창 v1 |
| ★★★ | 혼잣말 행 없애기: `say()` 가 로그 행을 안 만들고 말풍선엔 기호만; 창 톡 '비가 와'·기념품 톡 '가져온 날' 은 집 줄로 (결정 10 · A1 murmur) | DIALOGUE_UI §4.1 · NIGHT_LOG 결정 10 · PLAYTEST_FIXES A1 · PHOTO §3.6 | S | `js/app.js:820-826 say()` 가 `logRow('혼잣말', …)` 을 appendLogRow 함 · `:468 souvenirTap`·`:472 windowTap` 문어 말풍선 문장 그대로 · `TAP_SAY='응?'` 글자 | 없음. 결정 10 '기호만' 과 11-07 '이모지·기호 금지' 충돌 → 지금은 글자 '응?' (D 참고) |
| ★★★ | 집 목소리 줄 정리: 출발 '뚜루가 산책 나가' · 귀가 '뚜루가 돌아왔어 · 가져온 것: X'(이유는 다시 보기에만) · 포스터 '벽에 포스터가 붙었어 · 제목' · 집 '뚜루는 이번엔 집에 있어' · 빈 차례 '아무 데도 안 가' · 복구 줄 '네가 없는 동안 뚜루가 다녀왔어'(초상 없음) · 지난 메모는 집이 인용(초상 없음) | DIALOGUE_UI §4.3 · CORE_LOOP_V2 §3.1·§3.5·§3.6 | S | `js/app.js:1386 '돌아왔어'+이유` · `:1397 '벽에 붙였어 · '` · `:1409 '오늘은 집에 있을래'`(데모 차례 코드 문장) · `:1255-1256 '네가 없는 동안 다녀왔어' + 'calm' 초상` · `:1594 memoRow 'calm'` · `tools/test-resume.js:28` 옛 문구 | 없음 — 문자열 고치기. test-resume 같이 |
| ★★★ | 등불 소품 줄 ITEM_LINE 8개를 집 목소리 사실 문장으로 ('이제 진짜 내 다락이야'·'별도 보여' 삭제) | DIALOGUE_UI §4.3 · CORE_LOOP_V2 §3.4 ③′ | S | `js/app.js:115-116 ITEM_LINE` 1인칭 그대로 · `:1070` 'happy' 초상 문어 행 | 없음 |
| ★★★ | 기다리기 동안 산책 줄 봉해 두기 → 귀가 뒤 이야기 시간에 한 줄씩 (sealed) | OWNER_DECISIONS CORE_LOOP_V2 첫 행 · CORE_LOOP_V2 §3.3 C3 · §8 결정 2 (가) | M | `grep 'sealed|봉해' js/` → 0건. `app.js reveal (978~1001)` 이 산책 중 행을 실시간 append | 대사창 v1 |
| ★★ | 같이 가기: 주 버튼 옆 '같이' 아이콘(기본 꺼짐, `S.user.together`) · `js/together.js`(TOGETHER) + app.js 훅 · 헤엄 구간 `SWIM.segment` · 줍기 → 하나만 간직 · 다시 만나기 두 카드 뒤집기(블라인드) · `together.html` 시험대 | OWNER_DECISIONS 11-07 '문 앞 질문 없음' · CORE_LOOP_V2 §3·§5.1·§6 · 카드 8·15 | L | `grep 'TOGETHER|together|SWIM|swim|pocket|keepsake|tray' js/ index.html` → 0건 (test-brain.js 매치만). `together.html`·`swim.html` 없음 | 내 캐릭터(A1) 가 헤엄 모습의 주인 → A1 뒤가 자연스럽다 |
| ★★ | 식탁: 다 된 요리 `[식탁에 차리기]` → 문어가 eat/taste/save/watch/stop (결정 지점 `table`, 8초 fallback, `S.table`) + 놀이방 부엌 자리에 COOK 끼우기 (`S.user.pot`, 냄비 멈춤·이어 하기) | ROADMAP 9물결 · CORE_LOOP_V2 §3.4 ④ · §5.1 | M | HEAD·베이스 모두 `grep '식탁|S\.table|S\.user' js/*.js index.html` → 0건. 베이스 cook.js 는 `createRun/resumeRun/tick/…` API 라 계약의 `COOK.start(el,{seed,resume})` 모양과 다름 | B1 합치기 |
| ★★ | 출발 A2 (다락 문까지 걸어가 반쯤 열고 바깥 보기) · 귀가 C4 (바깥 장면 없이 다락 문 앞 체크무늬 → 보드로 걷기) · v1.2 장면 다듬기 (반짝이·reach·창밖 먹물 점·정류장 사진) | CORE_LOOP_V2 §3.1 A2 · §3.3 C4 · §6 v1.2 | M~L | `grep 'glance|halfOpen|ink|reach' js/scene3d.js` → 먹물은 fx 입자만. `cerQueue('leave')`(:2572) 는 바깥 길 끝 체크무늬만 | 같이 가기 v1 과 묶음 |
| ★ | 모델이 붙으면 꼬리표 '모델' + 톡 말 '지금은 네가 연결한 모델이 골라' + 설정 한 줄 | DIALOGUE_UI §3.2 · CORE_LOOP_V2 §4.2 | S | `js/app.js:851 renderBrainTag` 는 mcp 재생 중 **숨김**. `'연결한 모델'` 0건 | MCP 연결 |
| ★ | 두뇌 호출 실패로 빈 차례 적을 때 `fallback:true` 붙이기 (배지 34 가 오류를 선택으로 안 세게) | ACHIEVEMENTS §3.8 · §9.3 | S | `js/app.js:1249 .catch(... trip.kind='empty' ...)` 에 fallback 표시 없음 | 없음 — 한 줄, 지금 바로 가능 |
| ★ | 자는 동안 주 버튼 아래 '자는 동안에도 앨범이랑 같이 놀기는 열려 있어' · 첫 세션에 '다음에 생길 것' 실루엣 한 줄 · 산책 40~50초 보는 맛 (기웃 방 아이콘·zoom·알약 진행 점) · 60초 가만히면 '놀자?' 말풍선 (A6-1) | PLAYTEST_FIXES A2-3 · A4-5 · A3 · A6-1 | S~M | `grep '자는 동안|실루엣|zoom|놀자' js/app.js` → 0건 (`'다녀오는 중…'` 알약은 글자만 :826) | A6-1 은 주인 결정 (D) |
| ★ | 집에 있는 날 활동 '병뚜껑 굴리기' · 간식 주기 버튼(§16.2) · 선물 고르기(§16.1) | DESIGN §14 · §16 | S~M | `js/brain.js:55-60` 활동 6개에 없음 · `grep 'snack|간식|gift|선물' js/` → 0건 | 선물은 달리기 상·짝 꾸미기 '내밀기' 의 기반 |

### C-2 안내 · 튜토리얼

| ★ | 약속 | 출처 | 크기 | 코드 근거 없음 확인 | 선행 조건 |
|---|---|---|---|---|---|
| ★★★ | 안내 요정 '윤슬' 비춤 엔진 `js/guide.js`(GUIDE.register/ready, 처음 누를 때 가로채기, `ppolppol_ui.tips`, 켬/끔) + `css/guide.css` + 설정 › 안내 두 줄 + 안내 id 표 (box·pet·go·pin·door·settings·album …) | OWNER_DECISIONS 질문 2 '윤슬' · TUTORIAL §3.6·§5 · 카드 14 | L | `grep 'GUIDE\.|윤슬|guide|tut=1|tutorial' js/*.js index.html` → dialogue-stub 매치만. `js/guide.js`·`guide.html` 없음. `ppolppol_ui` 키(app.js:256) 에 tips 칸 없음 | 대사창(DLG) 과 함께 쓰이지만 독립 가능 |
| ★★ | 첫날 흐름 `js/tutorial.js` (눈 맞춤 → 먼저 놀기 → 윤슬·이름 카드(모달 아님) → 첫인사 → 쓰다듬기 → 첫 산책 → **첫 핀 내가 꽂기**(`pinPending`, `S.tut.firstPin`) → 잠), `?tut=1`, `[안내 건너뛰기]`, `[아무 이름이나]` 시드 | ROADMAP 1단계 · TUTORIAL §3.0~3.5 · §5.8 · 카드 15 | L | `grep 'TUT\.|S\.tut|tut-early|pinPending|firstPin|아무 이름' js/ index.html` → 0건. 이름은 아직 모달 `#name-dialog`(app.js openNameDialog) | GUIDE. 첫인사 '환영해' 꼬리는 윤슬 소개 줄로 옮길 것 (TUTORIAL §3.2) |
| ★ | 이미 놀던 사람에게 업데이트 뒤 한 번만 묻기 ('단추마다 처음 누를 때 알려 줄까?', `?who=returning`) | OWNER_DECISIONS 질문 5 (답 없음 → 추천 (가)) | S | `grep 'returning|알려 줄까' js/app.js` → 0건 | 튜토리얼 |

### C-3 방 · 꾸미기 · 가구

| ★ | 약속 | 출처 | 크기 | 코드 근거 없음 확인 | 선행 조건 |
|---|---|---|---|---|---|
| ★★ | 꾸미기 v0-b/c: 자리 표 `js/room-slots.js` · 순수 함수 `js/room-layout.js` (normalize 6규칙·move·undo) · `S.room.layout` 저장 · `setLayout` 으로 문어 자리·양초 빛 따라가기 · `tools/test-layout.js` · 포스터 자리 `attic:board.0~5` 첫날부터 · 2D 벽 6칸 | INTERIOR_MODE §5.1~5.6 · ROADMAP 3단계 카드 19 · ROOM_EXPANSION §5.4 | M | `ls js/ tools/` 에 room-slots/room-layout/test-layout 없음 · `grep 'setLayout(|normalizeLayout|layoutLog|SLOT_POS' js/` → 0건 · `js/scene2d.js:256,262,271` 여전히 5칸 | 없음 (새 파일만). 카드 19 '지금 건넬 수 있음' |
| ★ | 꾸미기 v0-d~g: 방마다 화분 단추 → 서랍 [가구][포스터][기념품] → 고스트(체크무늬) → 놓기·맞바꿈·되돌리기 · 물건 꾹 0.6초 → [돌리기 90°][옮기기] · `on.propTap` · 2D 폴백 꾸미기 · 문어 기호 반응 | ROADMAP '꾸미기는 방이 아니다' · INTERIOR_MODE §2·§3·§6 · DESIGN §19 | L | `grep 'btn-decor|꾸미기|화분|ghostMat|highlightSlots|pickSlot|propTap' index.html js/` → 0건 (`scene3d.js:2189`·`scene2d.js:89` '나중 꾸미기 자리' 주석만). `GEST.hold` 변수 자리만 비어 있음 | v0-b/c |
| ★ | `[크게 보기]`(1×→1.41×→2×) · `[가운데로]` 칩 — 핀치 못 하는 사람 길 (WCAG 2.5.1) | INTERIOR_MODE §3.4·§3.5·§5.4 | S | 장면 API 는 있음 (`js/scene3d.js:3856 zoomTo` · `:3857 recenter`). `grep '크게 보기|가운데로|btn-zoom|btn-center' index.html js/app.js` → 0건 | 없음 |
| ★ | 소파: 첫 산책 때 폴짝 놓임 · 톡=앉기 · 꾹=옮기기 · `sitOn/standUp` · 문어 옆에 앉기 `FURN.pickJoin` (`js/furniture.js`) · 덮개 색만 조개 · 2D 폴백 자리 버튼 | ROADMAP 3단계 · PHOTO §3·§4 · NIGHT_LOG 결정거리 1 · 카드 20 | L | `grep 'sofa|소파|sitOn|standUp|FURN\.|furniture' js/ index.html` → 0건 | 주인 질문 3 (D) · §18 가구 탭 규칙 (D) |
| ★ | 가구 4박 탭 (양초 켜기·상자 덜컹(trauma²)·담요·화분·문·등불, `S.furn`, 하루 3단계) · 빈 곳 탭이면 문어가 1.2초 봄 · 작은 표적 먼저 2단 레이캐스트 · 22px 최근접 | DESIGN §18 (제안) · PHOTO §3.6 · research/furniture-tap-events · polish 8·10 | L | `grep 'setPropState|candleOn|S\.furn|on\.miss|pickNear|trauma' js/` → 0건 · `scene3d.js:2598 tapItems` 포스터·기념품만 | §18 확정 (D) |
| ★ | 벽 꽉 차면 가장 오래된 포스터를 문어가 떼어 서랍에 (처음 3번 보여 줌) + 집 쪽지 | ROOM_EXPANSION §3.2 0단계 · §5.4 3 | M | `js/scene3d.js:1083 setPosters slice(-6)` 말없이 자름 · `grep '서랍|말아' js/` → 0건 | 없음 (넓히기 전에 첫날부터 일어나는 일) |
| ★ | 옆방 넓히기 전체 (똑똑 → 제안 → 공사 → 천 걷기, `room.build`·`room.places`, `room_expand` 결정 지점, `tools/test-expand.js`, 배지 8) | ROADMAP '나중(사람 시험 뒤)' · ROOM_EXPANSION §1~§6 · 결정 12 | L | `PLACES = attic·exterior·play` 뿐 · `grep 'buildSide|room_expand|atticDoneOn|넓히' js/ api/` → 0건 (play.js 'side' 문자열 무관) · `app.js:181~187 defaults()` 에 build/places 없음 | 주인 §8 질문 ①②③ + 넓힐 자리 재결정 (D). 사람 시험 뒤 |

### C-4 내 몫 (옷방 · 조개 · 가게 · 업적)

| ★ | 약속 | 출처 | 크기 | 코드 근거 없음 확인 | 선행 조건 |
|---|---|---|---|---|---|
| ★★ | 옷방 문 (장면 왼쪽 끝, 내 모습 만든 날 생김, 톡 → 캐릭터가 걸어가 끼익 → `SHOP.open('closet')`; 그 전엔 v0-b 임시 문이 옷장 시트) | ROADMAP '그 뒤' · PLAYER_PROGRESSION §7.1·§8.2 · SCENE '방 셋' | M | `grep 'wardrobe|closet|옷방|SHOP\.' js/ index.html` → `app.js:180` 주석 '왼쪽 옷방(나중)' 뿐 · `DOOR_ANCHORS` 놀이방 둘만 | A1 파츠 → 바로 이어짐. walkFirst 흐름 재사용 가능 |
| ★★ | 내 캐릭터 2D 폴백 (2D 화면에서도 캐릭터) | ROADMAP '나중' 표 · SCENE '안 하는 것(v0)' | M | `js/scene2d.js:474 playerWalkTo → resolve({walked:false})` · `:153 DOOR_ANCHORS '(나중의 내 캐릭터)'` | A1 |
| ★★ | 내 캐릭터 앉기·식탁·출발 같이 + 둘이 찍기 · [보여 주기] 때 문어 반응 (시드 40/30/15/15, by:'demo-rules') | ROADMAP '나중' 표 · PLAYER_PROGRESSION §7.4 · PHOTO §4.4 | L | `PL_*` 에 sit/table 상태 없음 · `grep '보여 주기|shownLook|photo' js/` → 0건 | A1 · 소파 · 사진 |
| ★★ | 처음 만들기 시트 ("그럼 너는 어떤 모습이야?" → [이대로 할래]/[나중에], 시드로 한 벌 미리, 내 이름 12자) | PLAYER_PROGRESSION §7.3 · TUTORIAL §3.7 | M | `grep '이대로 할래|나중에\]|내 이름' js/app.js` → 0건. 지금은 설정 시트 칩 7줄(A1) 만 | A1 · 주인 TUTORIAL 질문 3 '언제 묻나' (D) |
| ★ | 조개 지갑·장부 `js/player.js` (PLAYER.earn/buy/refund/wish/balance/nextGoal, 하루 주머니 30 + 쉰 날 덤, 논 날 1·3·6·10 선반, 사진·공유 src 거절) · 놀이 결과 → `PLAYER.earn(출처_판id)` · 결과 카드 '조개 +4 · 이제 11개' · 금빛 조개 동전 아이콘 · `tools/test-wallet.js` | ROADMAP 2단계 · PLAYER_PROGRESSION §3·§7.2·§9 · 카드 16 | L | `ls js/` 에 player.js 없음 · `grep 'PLAYER\.(earn|buy)|ledger|wallet|coin' js/ index.html tools/` → 0건 (app.js PLAYER_CATS 는 파츠). 베이스 cook.js:655 `resultOf {id, by:'user', game:'cook'}` 는 판 id 를 **만들어 줌**(받는 쪽만 없음) | B1 합치기 |
| ★ | 옷장·가게 시트 `js/shop.js` + `css/shop.css` (옷장/가게 탭 · 입어 보기 공짜 · [살래] · [되돌리기] · [찜] · 물건 26개 · 계절 입고 · 다음 선반은 남은 날 숨기기) · 초대 바 아래 '다음 목표' 한 줄 (+설정 끄기) | PLAYER_PROGRESSION §4.2·§6·§8 · OWNER_DECISIONS 11-07 | L | `ls js/ css/` shop.* 없음 · `grep '살래|입어 보|찜|다음 목표|nextGoal' js/ index.html` → 0건 | 지갑 · 옷방 문 |
| ★ | 배지 장부 `js/badges.js`(36개, facts/evaluate/claim) · 수첩 UI `js/badges-ui.js` (`[배지]` 칩 · `dialog#badge-sheet`) · 첫 배지 때 문어 '오!' (조용함 감시 · `data-ui-busy`) · 소리 badge_first/badge_get/coin_get · 배지 소품 자리 `attic:hook.door` · `tools/test-badges.js` | ROADMAP 2단계 카드 17 · ACHIEVEMENTS §6~§9 | L | `grep 'BADGES|badge|배지|before-sleep|badge_get' js/ index.html css/` → 0건 · `assets/badges/` 없음 · `data-ui-busy` 는 dialogue-stub 에만 | 지갑. '함께한 날' 배지는 막대 없이 조용히 (11-07) |
| ★ | 달리기 상(왕관·망토)을 옷장 '가진 것' 으로 읽기 · 받은 상을 방 안 선반에 표시 (외부 리뷰 ⑤) · 업적 옷 2벌(앞치마·목도리) · 짝 꾸미기 7벌 · 가구 11개 | PLAYER_PROGRESSION §4.2 · NIGHT_LOG 외부 리뷰 ⑤ · ACHIEVEMENTS §4.3·§5 | M~L | `js/runner.js:157-162 awards` 저장만 · `grep 'crown|왕관|앞치마|목도리|gift|선물' js/app.js js/scene3d.js` → 0건 | 옷장·선물 시스템 · 주인 §11 질문 1~3 (D) |
| ★ | 이름 겹침: 기념품 '조개' → '조개껍데기', 요리 재료 '조개' → '가리비' | ROADMAP 2단계 표 · PLAYER_PROGRESSION §3.1 · OWNER_DECISIONS 기본값 표 | S | `js/world.js:260 id:'shell', name:'조개'` · `:1213 shell {name:'조개'}` 그대로 (aliases 에만 '조개껍데기'). 베이스 cook.js 에 '가리비|조개' 0건 (재료 아직 전뿐) | 조개가 돈으로 나오기 전에 — 지금 바로 가능 (가리비는 제안 → D) |

### C-5 놀이 (요리 · 헤엄 · 컵 · 낙서 · 지도 · 달리기)

| ★ | 약속 | 출처 | 크기 | 코드 근거 없음 확인 | 선행 조건 |
|---|---|---|---|---|---|
| ★★ | 요리·헤엄·컵 결과 → 조개·배지 (판 id 기록), 같이 가기에 끼우기 (v0.5) · 요리·헤엄 오버레이 때 `scene.pause()`/`resume()` | ROADMAP 2단계 마지막 행 · CORE_LOOP_V2 §5.1 엔진 메모 | M | HEAD `js/app.js` 에 `S.user`·조개 지급 0건 · `grep 'scene\.pause|\.pause()' js/app.js js/runner.js` → 0건 (`scene3d.js:3893` API 만 있음 → 달리기 모달 아래 3D 계속 그려짐) | B1 · 지갑 |
| ★ | 컵 놀이를 본 게임에 (놀이방 진입 · kit → 장면 · 판 결과를 본 게임에 넘기기 · 실제 모델 chooser) | ROADMAP 2단계 · PLAY_PROTO §9·§10·§14 · ACHIEVEMENTS §9.3 | M | `play.html`·`js/play.js`(1425줄) 시제품은 있음 · `index.html` 에 `play.js|컵` 0건 · 기록은 `window.__play.log` 메모리뿐 | 놀이방 자리 하나 (지금은 오락기·부엌만) |
| ★ | 헤엄 미니게임 `swim.html` (SWIM.segment·SWIM.start, 내 모습이 헤엄) | 카드 8 · CORE_LOOP_V2 §3.2 B2 · 결정 21 | L | `grep 'SWIM|swim' js/` → 0건 · swim.html 없음 (HEAD·base) | A1 (내 모습) |
| ★ | 달리기: 소리 연결 (점프·부딪힘·새 최고, `AUDIO` 켜져 있을 때만) · '천천히' 도움 모드 (×0.75, 정직 표기) | PLAYTEST_FIXES D 3행 · NIGHT_LOG 결정거리 6 · research polish 12 | S | `grep -c AUDIO js/runner.js` → 0 · `grep '천천히|slow|assist' js/runner.js` → 0건 | 천천히 모드 랭킹 분리 방식은 결정 (D) |
| ★ | 같이 낙서 (카드 1) · 도서관 지도 (카드 2, 앨범 '지도' 칸) · 계절 포스터·기념일 색인 (§17.4) · 컵 놀이 v1.1 후보 | ROADMAP '나중' · DESIGN §17 · PLAY_PROTO §14 | L | `js/` 에 draw/doodle/map 없음 · `grep '지도|graphMap|기념일|milestone' js/app.js index.html` → 0건 | '나중' (사람 시험 뒤) |

### C-6 사진

| ★ | 약속 | 출처 | 크기 | 코드 근거 없음 확인 | 선행 조건 |
|---|---|---|---|---|---|
| ★ | 사진 모드 1단계 `js/photo.js` ([사진] 단추 · camTilt 3° 계단 · `snap({w,h})` · 셔터·플래시 · [공유] navigator.share · [저장] · [각도] 탭 단추) · 포즈 `js/poses.js`(15개 · PUPPET · '포즈 놀이' 표시) · 내 사진첩 IndexedDB `ppolppol_photos` · 앨범 '내 것' 칩 · 2D 폴백 SVG | ROADMAP 3단계 카드 20 · PHOTO §1·§2·§6 · DESIGN §16.4 | L | `grep 'photo\.js|PHOTO\b|camTilt|snap\(\{|btn-photo|POSES|PUPPET|ppolppol_photos|navigator.share|내 것' js/ index.html tools/` → 0건 (app.js:1655 위키 사진 크레딧만) · `scene3d.js:13 TILT 32°` 상수 고정 | 주인 질문 2 '포즈 놀이 표시' (D). 둘이 찍기는 A1 뒤 |

### C-7 모델 연결 (MCP)

| ★ | 약속 | 출처 | 크기 | 코드 근거 없음 확인 | 선행 조건 |
|---|---|---|---|---|---|
| ★★ | 카드 9: MCP 서버 `mcp/` (도구 9개 ppolppol_look_room/depart/peek/return_home/remember/hang_poster/wrap_up/stay_home/empty_turn + 고정 문장·호출 상한) + 짝꿍 스킬 + 진짜 모델로 산책 10번 + `docs/MCP_PLAYTEST.md` (PROTOCOL 바꿀 제안은 거기에) | ROADMAP 1½단계(7일째쯤) · 4단계 · PROTOCOL §3 · NIGHT_LOG 결정 20 · OWNER_DECISIONS 11-07 마지막 행 | L | `mcp/` 없음 · `grep 'ppolppol_|mcp' api/` → 0건 (api/ 는 runner award·seed·submit·top 뿐) · `.claude/skills` 에 cozy-web-game 만 · `docs/MCP_PLAYTEST.md` 없음. PROTOCOL 머리 '이 저장소에는 MCP 서버가 없다' | 게임 쪽 재생 입구(`APP.importEvents`·noteOut) 는 있음. 로컬 Claude Code 작업이라 레포 밖일 수 있음 |
| ★ | 게임 쪽 잇기: 첫인사 결정 지점 `meet` (say/wave/watch/stop, 8초 fallback) · 대화 `chat` 2번 · 식탁 `table` · 포즈 `pose_ok` · 꾸미기 `room_expand` | ROADMAP 1½단계 · DIALOGUE_UI §4.4 · CORE_LOOP_V2 §4.2 | M | `grep '\bmeet\b|\bchat\b|\btable\b|pose_ok|room_expand' js/` → dialogue-stub API 표 주석·test-brain 매치만 | 카드 9 · 대사창 |
| ★ | 화면↔서버 길 ②③: `trips/*.json + ?trip=` 읽기 · MCP Apps postMessage 어댑터 · MODEL_VOICE 자동 점검 '아직' 2개 (실제 payload 에 그만두기 행동 · 블라인드 순서) | PROTOCOL §4 · MODEL_VOICE 자동 점검 | S | `grep 'trip=|postMessage' js/*.js` → 0건 · `tools/test-model-voice.js:284` 는 문서 문자열만 검사 | 카드 9 |
| ★ | 전 세계 산책 숫자 한 줄 (설정 › 기록 아래, 끌 수 있음, 날짜별 하나) | OWNER_DECISIONS 질문 6 (답 없음, 12일째 다시) · ROADMAP 4단계 | M | `api/` 에 카운트 엔드포인트 없음 · `grep 'count|world' api/` → 0건 | 주인 '그 전엔 만들지 않는다' (D) |

### C-8 소리 · 접근성 · 설정

| ★ | 약속 | 출처 | 크기 | 코드 근거 없음 확인 | 선행 조건 |
|---|---|---|---|---|---|
| ★★★ | 끝없는 반복 멈추기: 하트 5프레임 한 번 · zzz 4프레임(12초 간격) · '다녀오는 중…' 숨쉬기 3번 뒤 멈춤 · 입장 깜빡임 3번 뒤 멈춤 · ▼ next_bob 4프레임 3바퀴 · `.lrow.typing` 멈춘 '…' · 2D 별·등불 투명도 반복 · 앨범 반짝 한 번 | DIALOGUE_UI §5.6·§5.9 (폰 피드백 4) · 카드 12 · 결정 13 | M | `js/ui-art.js:16 FX {heart:2, zzz:3, sparkle:4}` · `:224` 하트 loop · `:261` zzz 2000ms interval · `css/style.css:283 pill-breathe infinite` · `:310 .lrow.typing infinite` · `:124 glow`·`:140 twinkle infinite` · `css/intro.css:72 intro-blink infinite` · `css/ui-art.css:39 ua-next infinite` · `assets/ui/next_bob.png` 없음 | 동작 줄이기 모드에선 이미 꺼짐 — 보통 모드만. UI 아트 세션 몫이던 카드 12 가 아직 안 들어옴 |
| ★ | 안 불리는 소리 연결: 창문 톡 `window_tap` · 발소리 `step` · `rare_sparkle` · `lantern_prop_fade` · 저장 실패 `toast` · 새 소리(발소리·풍덩·바스락·냠·핀 콕·윤슬 종이) · 진짜 문 소리 파일 | PLAYTEST_FIXES D · CORE_LOOP_V2 §5.5 · TUTORIAL §5.11 | S~M | `js/app.js:472 windowTap` 에 AUDIO 호출 없음 · `grep "'step'|rare_sparkle|lantern_prop_fade|바스락|풍덩|footstep" js/audio.js` → 0건 · 문 소리는 합성 `door_creak_*` 대체 중 | 소리 세션 몫 |
| ★ | 소리 접근성 묶음: '말풍선 목소리' 끄기 토글(pref.voice) · `navigator.audioSession='ambient'` + iOS 무음 안내 · 24kHz 디코드 · 안드로이드 진동(옵트인) · 꾹 누르기 '느리게 1.0초' 설정 | NIGHT_LOG 결정거리 5·6 · research a11y 10·12·14·15 · INTERIOR_MODE §3.3 | S | `js/audio.js:51 pref={on,music,sfx}` (voice 없음, `:62 vol.voice=pref.sfx`) · `grep 'audioSession|무음|vibrate|haptic|느리게' js/` → 0건 (개발용 speed 주석만) | 주인 판단 (D) |
| ★ | PWA `manifest.webmanifest` + 아이콘 · 테마 3단 스위치(자동/밝게/어둡게) UI · 설정 '모션 그대로 움직이기' | APPLIED_TIPS §2 R30·§4 R21 · DESIGN §7.5 | S | `grep 'rel="manifest"' index.html` → 0건 (app.js manifest 는 에셋 manifest.json) · `grep 'data-theme|setTheme' js/app.js` → 0건 (css 훅만) | 'GitHub Pages 확정 뒤' 조건이었으나 Vercel 배포는 이미 됨 → 조건 충족 |
| ★ | 라이트 픽셀 테마 대비 CSS 반영 (글자 --amber·--rose 4.5:1, --pip-off) | NIGHT_LOG 결정거리 4 · research/light-contrast/proposal.md · 카드 6 | S | `css/style.css:473-474 --amber #884b2b · --rose #a53030` 제안 전 값 그대로 (시안 A 는 #7a4841 · #752438) | 주인이 시안 A/B/C 고르기 (D) |
| ★ | 설정 색 바꿀 때 문어가 몸을 한 번 흔들며 색이 번짐 · 데브 픽셀 슬라이더가 `stats().pixel` 읽기 | DESIGN §14 · SCENE '공간·카메라' | S | `js/app.js:530 setOctColor` 는 setColor 만 · `grep 'wiggle|shake' js/scene3d.js` → 0건 · `app.js:432 pixelSize:3` 하드코딩 | 없음 (작은 흠) |

### C-9 테스트 · 문서 · 배포 · 모듈화

| ★ | 약속 | 출처 | 크기 | 코드 근거 없음 확인 | 선행 조건 |
|---|---|---|---|---|---|
| ★ | README: 스크린샷 3장 (`tests/evidence/01-light-home.png` 등) · 배포 주소 (Vercel 주소 있음, README 는 'GitHub Pages 예정') · '접근성' 절 6줄 · 라이선스 '아직 미정' | README 19·24·120행 · research a11y 13 | S | `ls tests/evidence` 에 01~03 없음 (3d-*·portrait-* 만) · `README.md:24 '배포 주소는 예정'` · `grep 접근성 README.md` → 0건 · LICENSE 없음 | 라이선스는 주인 (D) |
| ★ | 디렉터리 등록 준비 (HTTPS · 개인정보 처리방침 · 스크린샷) · 접근성·성능 점검 보고서 (카드 5, 12일째쯤) · `tools/lighthouse.sh` · vercel.json 정적 자산 Cache-Control | ROADMAP 4단계 · research a11y 8·9 | M | `grep '개인정보|privacy' js css` → runner 순위 안내만 · `tools/lighthouse.sh` 없음 · `vercel.json headers` 는 `/api/*` no-store 한 줄뿐 · `docs/research/audit-2026-11.md` 없음 | 사람 시험 뒤 |
| ★ | 대사창 v1 때 자리 정리: 낮은 화면(320×568 · 가로 740×360)에선 대사 자리(`#dlg-host`)가 방 아래쪽(문 · 내 캐릭터)을 덮고, 가로 화면에선 개발용 힌트 칸도 덮는다. 지금은 개발 모드의 `APP.dlgDemo` 로만 뜬다 | DIALOGUE_UI §3.2 · `tools/layout-shots.js` 의 '알려진 겹침' | S | `tests/evidence/layout/one-320x568-dlg.png` · `one-landscape-740x360-dlg.png` | 대사창 v1 |
| ★ | 스모크 보강: `forceContextLoss` 검사(컨텍스트를 잃은 뒤 2D 로 바뀌는 길은 smoke O 가 본다 — 11-10. 돌아오는 길 · 놀이방 · 의식 중은 아직) · 포스터 문장 80% 서로 다름 검사 · `test-scene-perf` T6~T9(밀기·줌·누르기·고스트) · smoke K 꾸미기 · 달리기 소리 테스트 | research a11y 3 · PLAYTEST_FIXES A7-2 · INTERIOR_MODE §5.6 | S~M | `grep forceContextLoss tools/smoke.js` → 0건 · `tools/smoke.js:2494~2499` 시나리오에 K 없음 · 80% 검사 없음 | 꾸미기 기능이 먼저 |
| ★ | 모듈화 C1~C6: `js/util.js`(해시·PRNG·dateKey·훅) · `poster.js` · `store.js` · `demo.js` · `color.js` · `scene3d.js init()` 쪼개기 (`SCENE3D_PARTS`) · `tools/check-dup.js` | PLAYTEST §5 · PLAYTEST_FIXES C ('물결 다 끝난 뒤') | L | `grep 2166136261 js/` → app·audio·clouds·scene2d·scene3d 5곳 복사 · `grep 'POSTER\.|STORE\.|COLOR\.|SCENE3D_PARTS|var U\b' js/` → 0건 · `js/runner.js:115-117` 자체 dateKey | 물결이 다 끝난 뒤. C6 은 주인 결정 (D) |
| ★ | 번들 `dist/` 는 커밋 안 됨 — 배포 전 `node tools/bundle.js` 재생성 · UI 아트 후속 그림 (요정·배지 12장·조개 동전·next_bob·nameplate·icon.ui.*) · 입장 연출 다시 (카드 11: 2.5~3초 하강·큰 구름·타이틀 계단) · 픽셀 소품 참고판 (카드 10, Blender 로컬) | NIGHT_LOG 4물결 ⑥ · 카드 10·11·12 · TUTORIAL §5.10 | S~L | `git ls-files dist` 0건 · `ls assets/ui` → bubble_*·frame_*·next*.png·tail_* 만 · `assets/icons/ui/` 없음 · `js/intro.js:40 SKY_DUR=2.2` · `assets/props-next` 없음 | 다른 세션(UI 아트·입장) 몫 |
| ★ | 문서 정합 (주 세션 메모): ROADMAP 1단계 '튜토리얼 4~6일째' ↔ 열쇠 차례표 · '진짜 Claude 는 로컬에서만' 줄 · CORE_LOOP_V2 §3.2 none 상태 줄 · 줍기 목록↔기념품 이름 겹침 · DIALOGUE_UI §3.2 세로 쌓기 ↔ A3 한 화면 · APPLIED_TIPS 사운드 줄 낡음 · 카드 14 '[소리] 가짜 단추' 낡음 · PLAYER_PROGRESSION 2D 종이 인형 기준 ↔ 3D 파츠로 방향 바뀜 | DELEGATION_BRIEFS '주 세션 메모' 외 | S | 코드 대상 아님 (문서끼리) | 주인 확인 (D) |

---

## (D) 주인이 정해야 열리는 것 (질문 그대로)

| # | 질문 | 어디서 | 막히는 일 |
|---|---|---|---|
| D1 | 내 모습 만들기를 언제 묻나 — (가) 첫 산책 뒤 조용한 때 윤슬이 [만들기][나중에] / (나) 이름 바로 뒤? + 쪽지 '그럼 너는 어떤 모습이야?' | TUTORIAL §8 질문 3 (OWNER_DECISIONS 에 답 없음) | A1 파츠 UI 의 첫 진입 · 처음 만들기 시트 |
| D2 | ~~한 화면 배치(A3) 가 DIALOGUE_UI §3.2 세로 쌓기(장면 325 + 상태 44 + 대사창 130) 와 충돌 — 문서를 A3 쪽으로 고쳐도 되나?~~ **닫힘 (주인 11-08 밤: 고친다 · 11-10 고침)** | (이 세션) | A3 · 대사창 v1 |
| D3 | 톡 반응: 결정 10 '기호(? ! ♪ …)만' vs 11-07 '이모지·기호 금지' — 말풍선에 기호 허용(픽셀 그림으로)? 아니면 몸짓·소리만? | NIGHT_LOG 결정 10 · OWNER_DECISIONS 11-07 | 혼잣말 행 없애기 |
| D4 | 이미 놀던 사람에게 업데이트 뒤 한 번만 묻기 ('단추마다 처음 누를 때 알려 줄까?') — 추천 (가) 로 가도 되나? | OWNER_DECISIONS 질문 5 | 튜토리얼 v0b |
| D5 | 전 세계 산책 숫자 한 줄 — 12일째 다시 묻기로 함 (서버일 때) | OWNER_DECISIONS 질문 6 | api 카운트 |
| D6 | 소파는 어떻게 생길까 — 추천: 첫 산책 때 공짜 + 덮개 색만 조개 | PHOTO §8 질문 3 | 소파 |
| D7 | §18 가구 탭 규칙 (4박 구조 · 하루 1회 3단계 · 연타 잠금 · 1px 흔들림) 확정? · 연타 선물 반응 · 총수 분모 | NIGHT_LOG 결정거리 1 · DESIGN §18 '제안(미확정)' | 가구 4박 · 카드 20 |
| D8 | §19 인테리어: ② 놓을 때 문어가 매번 들고 옮길까 (추천 가: 바로 놓이고 끝낸 뒤 써 본다) ③ 처음 화면 1× 밀기 (추천 가: 고무줄만) | INTERIOR_MODE §8 2·3 | 꾸미기 v0-e · v1 |
| D9 | 옆방 넓히기: ① 첫 제안 언제(추천 가: 등불 8칸 다음 날 + 벽 꽉 참) ② 옆방도 날마다 자랄까(추천 가: 전구 줄) ③ 몇 번까지(추천 가: 하나만) + 11-07 뒤 넓힐 자리(왼쪽 벽은 옷방 문) · 거절 뒤 대답 자리 | ROOM_EXPANSION §8 · 맨 위 11-07 고침 | 넓히기 v1b |
| D10 | 라이트 픽셀 테마 대비 시안 A/B/C 중 고르기 | NIGHT_LOG 결정거리 4 · research/light-contrast/proposal.md | CSS 한 줄 |
| D11 | 소리 접근성·새 설정 후보: 목소리만 끄기 토글 · iOS 무음 안내 · 24kHz · 안드로이드 진동(옵트인) · 달리기 '천천히' 모드(랭킹 분리 방식) · 정적 캐시 헤더 | NIGHT_LOG 결정거리 5·6 · polish 12 | 설정 줄들 |
| D12 | 뜻이 둘인 방 별칭('전신 거울'→전신, '내 조수'→조수, '풍경 사진'→풍경) 뺄지 | NIGHT_LOG 결정거리 9 | world.js 데이터 |
| D13 | 요리 재료 '조개' → '가리비' (제안) 받아들일지 | PLAYER_PROGRESSION §3.1 · ROADMAP 카드 7 | cook.js 재료 이름 |
| D14 | 사진: '포즈 놀이' 표시를 늘 넣을까 (끌 수 없게 추천) | PHOTO 질문 2 | 사진첩 |
| D15 | 가게 v1: 산 가구를 어디에 놓나(가·나·다) · 짝 꾸미기는 둘이 한 벌로만 팔까 · 업적 옷은 앞치마·목도리 두 벌로 할까 | ACHIEVEMENTS §11 질문 1·2·3 | 가게 칸 더하기 |
| D16 | 배지 소품을 옆방 전엔 놀이방·옷방 바닥 자리에 두자는 11-07 제안 — OWNER_DECISIONS 기본값을 바꿔도 되나? | ACHIEVEMENTS §3.1 11-07 고침 | 배지 소품 |
| D17 | 문어 60초 가만히 있을 때 세션당 한 번 '놀자?' 말풍선 + 작은 입구 — 넣을까? | PLAYTEST_FIXES A6-1 | — |
| D18 | 컵 놀이 소리 — 시험한 사람들이 아쉬워하면 | PLAY_PROTO §14 | — |
| D19 | scene3d.js init() 클로저 쪼개기(C6) 를 컵 놀이 합친 뒤 할지 | PLAYTEST_FIXES C6 | 모듈화 |
| D20 | 게임 코드 라이선스 ('아직 미정') | README 120행 | LICENSE |
| D21 | 실기기 확인: 걸음·등불 흔들림 rAF · 소리 귀로 · 컵 놀이 공이 쿠키처럼 보이는지 — 폰에서 봐 주기 | LOOK_LOG 패스 10 · NIGHT_LOG 23:35 · PLAY_PROTO §17.4 | 코드로 확인 불가 |

---

## (E) 주인이 뺀 것 (dropped · 참고)

| # | 뺀 것 | 근거 |
|---|---|---|
| E1 | 방 오가기 화살표 ◀ ▶ · 끝까지 밀기 · 키보드 ← → (문 톡으로만) · ◀ ▶ 그림 16×16 | OWNER_DECISIONS 11-07 · ROOM_EXPANSION 맨 위 고침 |
| E2 | '방 보기' 시트 (→ 설정 시트로) | OWNER_DECISIONS 11-07 |
| E3 | 장면 위 스피커 단추 · TUTORIAL `sound` 쪽지 (→ 설정 › 소리 켜기 체크, 베이스) | OWNER_DECISIONS 11-08 (베이스) |
| E4 | 외침 말풍선 가시 · 플레이어 화면 이모지·유니코드 기호 전부 (글자·픽셀 그림만) | OWNER_DECISIONS 11-07 · smoke U |
| E5 | 힌트·주제 칸 (플레이어 화면) · 첫 토스트 '힌트는 비워 둬도 돼' · 첫 실행 안내 push→pull (전제가 사라짐) | 결정 18 · polish 11 |
| E6 | '처음 간 곳' 징글 | 결정 16 |
| E7 | 쪽지도 벽 포스터 수에 포함('포스터 다시 읽기' 가 쪽지만 있어도 나옴) — 의도적 보류 | NIGHT_LOG '알아 둘 것' |
| E8 | 하루 한 번 모드 · `Date.now()-departedAt` 파생 타이머 · 기본 무음 사운드 채널 (소리는 그 뒤 audio.js 로 들어감 → APPLIED_TIPS 갱신 필요) | APPLIED_TIPS '일부러 안 한 것' |
| E9 | 완성률 % 표시 · 친밀도 숫자·코인으로 방 넓히기 | OWNER_DECISIONS 기본값 · 결정 12 |

---

## 추천 다음 3개

1. **집 목소리 줄 + 혼잣말 행 정리 (C-1 ★★★ S 묶음 네 줄)** — `say()` 로그 행 제거 · ITEM_LINE 8개 · 출발/귀가/포스터/집/복구/메모 줄을 집 목소리로 · `fallback:true` 한 줄 · 기념품 '조개껍데기'. 전부 문자열·한두 함수 고치기라 반나절이면 끝나고, 결정 10·11-07 원칙(문어 입에 코드 문장 없음) 위반이 **지금 폰 화면에 그대로 보이는** 상태다. 대사창이 들어오기 전에 글부터 맞춰 두면 대사창 작업이 글 고치기와 섞이지 않는다. D3(기호 허용?) 만 먼저 한 줄 답을 받으면 된다.
2. **대사창 v1 `js/dialogue.js` + A3 한 화면 배치를 한 덩어리로** — 스텁 API 표는 이미 얼려 뒀고 `index.html` 은 스텁조차 안 싣고 있다. 이 세션이 예정한 '대사창 아래서 슥' 은 결국 DLG 엔진이 있어야 자리가 생기므로, 배치(100dvh·상태 띠 겹침·산책 시트) 와 함께 하는 게 두 번 손대는 것보다 싸다. 돌아와서 대화 두 차례·봉해 두기·끝없는 반복 멈추기(폰 피드백 4) 가 모두 여기에 기댄다. D2(DIALOGUE_UI §3.2 와 충돌) 답 필요.
3. **옷방 문 + 2D 폴백 캐릭터 (C-4 ★★)** — 지금 진행 중인 파츠(A1) 가 끝나면 '내 모습' 옷장 시트(11-09)의 입구가 설정 시트 하나뿐이게 된다. 문서가 약속한 "내 모습을 만든 날 왼쪽 문이 생긴다" 는 `walkFirst`·`DOOR_ANCHORS` 를 그대로 재사용해 M 크기로 닫을 수 있고, 2D 폴백은 `scene2d.js:474` 의 `walked:false` 즉시 resolve 를 채우는 일이다. 지갑·가게는 그 다음(선반 비어 있어도 문은 열릴 수 있게 옷장 탭만).

(보류 권고: 같이 가기·사진·꾸미기 v0-e·넓히기는 모두 L 이고 핵심 루프가 폰에서 재밌게 돌기 전엔 손대지 않기로 문서가 적어 둔 것들이라 위 3개 뒤로.)
