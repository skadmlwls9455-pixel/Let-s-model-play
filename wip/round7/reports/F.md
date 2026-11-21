# F 갈래 보고 — 주말 콘테스트 (`lane/7-f`, BASE 493571b)

## 결론

주말 콘테스트가 돈다: 주마다 주제 하나 (열둘, 9주 안에 안 겹침), 입은 옷의 꼬리표로 0 ~ 100 점 (감점 없음), 경쟁자 문어 셋과 등수, 조개 12 · 8 · 5 · 3 (누구나 받음), 열린 날마다 한 번 · 그날은 적힌 결과 그대로, 약 12초 쇼 (넘기기 가능 · 움직임 줄이기면 바로 결과), 결과에 '채점 규칙' 꼬리표.
기존 줄은 하나도 고치지 않았다 (새 파일과 `[7-F]` 자리만). 옷 목록 (P) · 무대 단추 (V) · 명단 (N) 없이도 오류 없이 조용히 빠지고, 테스트는 작은 대역으로 돈다.

## 바꾼 것

| 파일 | 무엇 | 왜 |
|---|---|---|
| `js/contest.js` (새 파일 · 전역 `CONTEST`) | `week` · `themeAt` · `score` · `cards` · `rivals` · `enter` · `today` · `board` · `normalize` · `merge` · `logLine` · `art` (픽셀 그림 데이터: 주제 12 · 꼬리표 10 · 색 네모 · 별 · 문어 그림자) · `TEXT` | 규칙은 DOM · 시계 · 난수 없이, node 에서 시험 |
| `js/app.js` `[7-F]` 블록 | `ctApi` · `ctCats` · `ctWorn` · `ctDye` (옷 목록 읽기) · `ctArt` · `ctMe` · `ctThumb` · `ctSnap` (또렷한 그림) · `ctRender` (주제 화면 · 결과) · `ctEnter` (나가기 · 조개 한 번) · `ctShow` · `ctStep` · `ctEnd` (쇼) · `ctHeal` (두 탭) · `ctLogSync` (오늘 기록 줄) · `openContest` · `ctInit` | 화면 · 저장 · 조개 |
| `js/app.js` `[7-F]` 공개 줄 | `openContest` · `contestEnter` · `contestSkip` · `contestStage` | 테스트 · 도구 |
| `index.html` `[7-F] 창` | `<dialog id="contest-sheet">` | 시트 |
| `index.html` `[7-F] 스크립트` | `js/contest.js` | 규칙 파일 |
| `css/style.css` `[7-F]` | `.contest-sheet` · `.ct-*` | 시트 모양 (글 크기는 `--fs-*` 만) |
| `docs/CONTEST.md` | 조사 반 쪽 (원리만) · 주제 표 · 채점 표 · 저장 · 다른 갈래와 닿는 곳 | |
| `tools/test-contest.js` · `tools/test-contest-live.js` | 검사 | |

## 기존 줄을 고친 곳

없음.

## 주제 표

| id | 제목 | 바라는 꼬리표 | 색 |
|---|---|---|---|
| beach | 바닷가 산책 | sea fresh | c-blue |
| winter | 따뜻한 겨울 | warm cosy | c-white |
| night | 별 보는 밤 | star cool | c-purple |
| garden | 꽃밭 물 주기 | flower fresh warm | c-green |
| rain | 비 오는 날 | cosy neat | c-yellow |
| run | 달리기 대회 | sporty cool | c-orange |
| flower | 꽃놀이 | flower cute | c-pink |
| book | 가을 책방 | neat warm | c-red |
| forest | 숲길 소풍 | fresh sporty | c-green |
| nap | 다락방 낮잠 | cosy cute | c-brown |
| fest | 여름 축제 | cute star sea | c-yellow |
| neat | 단정한 하루 | neat cool | c-black |

네 개씩 세 묶음 (위에서부터) 을 묶음 안에서만 시드로 섞는다 → 12주에 한 바퀴, 같은 주제 사이 적어도 9주. 이번 주 (11-16 주) 는 '바닷가 산책'.

## 채점 표 (0 ~ 100, 더하기만)

| 칸 | 점수 | 상한 |
|---|---|---|
| 무대 (나가기만 해도) | 8 | 8 |
| 주제: 입은 것마다 맞는 꼬리표 하나에 8 (한 벌에 16까지) | | 56 |
| 색: 주제 색인 것 (또는 주제 색으로 물들인 것) 마다 6 | | 18 |
| 어울림: 같은 느낌 꼬리표가 둘이면 6, 셋 이상이면 12 (주제와 달라도) | | 12 |
| 물들임: 주제 색으로 물들인 것이 하나라도 있으면 | 6 | 6 |

경쟁자 셋: 주마다 옷 목록에서 칸마다 하나, 주제에 맞는 것을 고를 확률 0.8 · 0.55 · 0.3, 같은 함수로 채점. 등수 = 나보다 높은 경쟁자 수 + 1 (동점은 내가 앞). 조개 12 · 8 · 5 · 3. 심사 카드 셋 (주제 · 색 · 어울림) 은 별 1 ~ 3 (가장 낮아도 하나).

## 주인이 확인할 결정

1. **심사 = 가게 문어 셋, 경쟁자 = 이름 없는 마을 문어 그림자 셋.** 브리프는 경쟁자에게도 명단의 이름 · 색을 주라 했지만, 명단에서 깨어 있는 것은 가게 문어 셋뿐이라 심사와 참가를 겸하게 된다. 그래서 경쟁자는 이름 없이 색만 다른 그림자로 했다.
2. **조개 주는 길.** 기존 놀이 보상 함수 (`earnFromPlay`) 는 판마다 2 ~ 8개 고정이고 달리기 주간 과제까지 표시해서 12 · 8 · 5 · 3 을 줄 수 없다. 주간 선물과 같은 방식 (`userState()` → 더하기 → `save()` → `renderBagChip()`) 으로 `[7-F]` 안에서 준다.
3. **토 · 일 각각 한 번** 나갈 수 있다 (같은 주제 · 같은 경쟁자, 일요일엔 옷을 바꿔 다시). 주말 이틀 최대 24개. '주에 한 번' 을 바라면 `CONTEST.enter` 의 그날 검사를 그 주 검사로 바꾸면 된다.
4. **꼴찌도 3개, 쇼는 약 12초.**
5. **평일에도 시트는 열린다** (주제 · 내 차림 · 옷 갈아입기 · '주말에 열려.').
6. **옷가게 문어의 결과 한마디** (`contest.result`) 는 시트를 닫을 때 부른다 (시트가 말상자를 가리지 않게). `contest.open` 은 부르지 않는다 (시트가 바로 덮어서).
7. **오늘 기록 줄은 오늘 칸에만.** 기존 줄을 고치지 않으려고 `#log` 가 다시 그려질 때마다 덧붙인다. 앨범 일기 (지난 날) 에는 없다.
8. 주제 이름 열둘과 그림.

## 새 글 · 읽어 주기 이름 (모두 `js/contest.js` 의 `TEXT` · `THEMES` · `TAG_NAME`)

- 보이는 글: '주말 콘테스트' · 주제 제목 열둘 · '주말에 열려.' · '나가기' · '옷 갈아입기' · '넘기기' · '닫기' · 'N등' · 'N점' · '채점 규칙' · 심사 이름 (N 의 명단이 있을 때만) · 기록 줄 '콘테스트' + 'N등 · 조개 M'.
- 읽어 주기에만: '이번 주 주제에 맞는 것' · '지금 내 차림' · '참가 문어 N' · '심사 N' · '주제' · '색' · '어울림' · '별 N개' · '나' · 꼬리표 이름 (귀여운 · 멋진 · 느긋한 · 운동 · 단정한 · 바다 · 꽃 · 별 · 따뜻한 · 산뜻한 · 색 열 가지).
- `title` 속성 없음. 이모지 · 기호 없음. 날짜 · 남은 시간 없음. 글꼴 부분집합 `stale: none`.

## 검사

- `node tools/test-contest.js` — 187 통과 (주 · 주제 간격 20년 · 채점 결정성 · 감점 없음 2000번 · 경쟁자 · 등수와 조개 · 하루 한 번 · 다시 보기 · normalize · merge · 글 · 그림).
- `NODE_PATH=$(npm root -g) node tools/test-contest-live.js` — 60 통과 (옷 목록 없음 · 2D · 평일 · 토요일 끝까지 · 일요일 넘기기 · 두 탭 둘 · 움직임 줄이기 · 360 · 320 · 1280 · 진짜 2.625 배율 선명도). `--shots <폴더>` 로 사진.
- `npm test` 통과.
- `npm test` 에 넣을 것: `node tools/test-contest.js`. CI 브라우저 단계에 넣을 것: `node tools/test-contest-live.js`.
- `tools/test-brain.js` 1874 줄의 정직 검사 목록에 `js/contest.js` 를 넣으면 좋다 (리드 몫 — 지금은 `test-contest.js` 7 절이 같은 뜻으로 본다).

## 사진 (`wip/round7/shots/F/`, 360x740 @2 · 마지막만 412x915 @2.625)

`1-theme-weekday` · `2-theme-weekend` · `3-show-walk` · `4-show-judge` · `5-show-podium` · `6-result` · `7-result-412-2625`. 경쟁자 밑의 작은 그림 넷은 테스트 대역이 내 캐릭터 사진을 돌려준 것이다 (진짜는 P 의 `itemThumb`).

## 다른 갈래가 합쳐져야 다 볼 수 있는 것

- **P**: 진짜 꼬리표 · `worn` · `itemThumb`. `APP.wardrobe()` 의 `cats[].key` 가 물들임 칸 (`outfit` · `shoes` · `acc`) 과 같아야 물들임 덤이 붙는다. P 가 없으면 무대 단추와 `APP.openContest()` 는 아무것도 하지 않는다.
- **V**: `#btn-plaza-stage` (누르면 `openContest`). 단추가 `ctInit` (DOMContentLoaded) 때 문서에 있어야 한다.
- **N**: `NPC.roster` (배열 또는 id 로 찾는 객체, `name` · `color` '#rrggbb') · `APP.npcSay`.

## 빼거나 못 한 것

- 경쟁자가 옷을 입은 모습은 그리지 않았다 (문어 그림자 + 입은 것 그림 넷).
- `renderAll` 에 시트 다시 그리기를 걸지 않았다 (기존 줄). 다른 탭 저장은 따로 듣고 다시 그린다.
- 쇼에 소리 · 진동 없음 (시트 여닫는 소리만).
