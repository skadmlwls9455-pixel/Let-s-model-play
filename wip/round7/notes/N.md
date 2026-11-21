# N 갈래 메모 (11-21)

## 차례
1. `js/npc.js` 명단 · 대사 · 쪽지 · 처음 세 줄 + `tools/test-npc.js` (끝)
2. 대사창 `APP.npcSay` (app.js [7-N], index.html, style.css) → 밀어 올리고 리드에게 알림
3. 게시판 시트 (#btn-plaza-board) · 자는 문어 한 줄 · S.user.story
4. 처음 세 줄 (js/intro.js go() 에 갈고리, APP.storyIntro)
5. tools/test-npc-live.js, 문서 (docs/NPC.md, docs/STORY.md), 독립 점검 한 번, 보고서

## 시간이 모자라면 먼저 버릴 것
대사창 초상 → talk 갈래 (셋까지만). '대본' 이름표 · 정직 검사 · 처음 세 줄 건너뛰기/한 번만은 안 버린다.

## 정한 것 (주인 확인)
- 이름: 시침 (옷가게, 청록 #2f6f7a, 베레) · 모아 (잡화점, 겨자 #a89a2e, 앞치마) · 느루 (카페, 갈색 #7a5a48, 캡)
- 대사창은 DLG 가짜를 안 쓰고 따로 지었다 (#npc-box, 장면 아래쪽). DLG 는 얼린 표라 건드리지 않음.
- TAP_BAN 때문에 '오늘' · '내일' 도 대사에 안 쓴다.
- 처음 세 줄은 '나' 로 쓴다. 자동화 브라우저에선 ?story=1 일 때만 (기존 입장 테스트 그대로).
- contest.* 는 세 문어 모두에게 있다 (F 가 누구를 부를지 몰라서).
