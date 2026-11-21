# F 갈래 노트 — 주말 콘테스트 (lane/7-f, BASE 493571b)

## 계획 (11-21 12:55 UTC)
1. `js/contest.js` (전역 CONTEST, DOM 없음): 주 · 주제 · 채점 · 경쟁자 · 참가 · normalize · merge · 픽셀 그림 데이터. `tools/test-contest.js`.
2. 앱 `[7-F]`: 시트 (주제 화면 · 쇼 · 결과), `APP.openContest()`, `#btn-plaza-stage` 누름 (없으면 넘어감), 조개, 오늘 기록 줄, 두 탭.
3. `tools/test-contest-live.js`, 화면 사진 360x740, `docs/CONTEST.md`, 독립 점검 1회, 보고서.
- 시간이 모자라면 먼저 뺄 것: 경쟁자 걸어 나오기 연출 → 물들인 옷 덤. 안 빼는 것: 감점 없음 · 하루 한 번 다시 보기 · '채점 규칙' 꼬리표.

## 정한 것 (주인 확인 거리)
- 심사 = 가게 문어 셋 (NPC 가 있으면 이름 · 색). 경쟁자 = 이름 없는 마을 문어 그림자 셋 (가게 문어가 심사와 참가를 겸하지 않게 · 자는 문어는 잔다).
- 조개는 기존 놀이 보상 함수 (2~8개 · 달리기 과제 표시) 로는 12 · 8 · 5 · 3 을 못 줘서, 주간 선물과 같은 방식 (userState → 더하기 → save → renderBagChip) 의 작은 함수로 준다. 하루 한 번만.
- 토 · 일 따로 한 번씩 나갈 수 있다 (같은 주 = 같은 주제 · 같은 경쟁자).
- 오늘 기록 줄은 오늘 칸에만 (앨범 일기에는 안 남는다 — 기존 줄을 못 고쳐서).
- 주제 순서: 4개씩 세 묶음을 묶음 안에서만 시드로 섞는다 → 같은 주제는 적어도 9주 뒤.

## 주제 표
| id | 제목 | 바라는 꼬리표 | 색 |
|---|---|---|---|
| beach | 바닷가 산책 | sea fresh | c-blue |
| rain | 비 오는 날 | cosy neat | c-yellow |
| flower | 꽃놀이 | flower cute | c-pink |
| night | 별 보는 밤 | star cool | c-purple |
| forest | 숲길 소풍 | fresh sporty | c-green |
| winter | 따뜻한 겨울 | warm cosy | c-white |
| run | 달리기 대회 | sporty cool | c-orange |
| neat | 단정한 하루 | neat cool | c-black |
| nap | 다락방 낮잠 | cosy cute | c-brown |
| book | 가을 책방 | neat warm | c-red |
| fest | 여름 축제 | cute star sea | c-yellow |
| garden | 꽃밭 물 주기 | flower fresh warm | c-green |

## 채점 표 (0..100 · 감점 없음)
| 칸 | 점수 |
|---|---|
| 무대 (나가기만 해도) | 8 |
| 주제: 입은 것마다 맞는 꼬리표 하나에 8 (한 벌에 16까지) | 최대 56 |
| 색: 주제 색인 것마다 6 | 최대 18 |
| 어울림: 같은 느낌 꼬리표가 둘이면 6, 셋 이상이면 12 | 최대 12 |
| 물들임: 주제 색으로 물들인 것이 있으면 | 6 |
등수 12 · 8 · 5 · 3 조개. 동점은 내가 앞.
