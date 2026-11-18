# 계획 대 구현 점검 (11-18) — 결과와 주인이 고를 목록

주인 요청: "계획해둔 컨텐츠 다 완성 된 거 맞아?! 보강할 점 없는지 점검해줘." · 주인 답: **꼭 고칠 것만 6차에**, 나머지는 목록으로.
점검 대상: 코드 `ada2967` (= 배포 `9bb58e0` 와 게임 코드 같음) · 문서 전부 (ROADMAP · OWNER_DECISIONS · 핵심 루프 · 세계 · 놀이 문서들).
방법: 다섯 렌즈가 계획 항목을 하나씩 코드와 화면으로 확인 → 아직 / 일부라고 한 196 개를 따로 반박 검사 → 새 사람처럼 첫 주
놀기 (360x740 @2, 시계 11-18 → 11-28) · 출시 품질 (production + 로컬).

## 결론

- 계획 항목 343 개: **다 됨 129 · 일부 48 · 아직 123 · 바뀜 / 뺌 43** (반박 검사로 '아직' 30 개가 주인 결정으로 바뀌었거나 뺀
  것으로 바뀜 · 놀이 문서 줄 41 개는 반박 검사 없이 첫 판정 그대로).
- 큰 줄기 (산책 · 포스터 · 앨범 · 다락이 날마다 자람 · 달리기 · 부엌 · 미용실 · 재봉틀 · 마당 텃밭 · 정직 표기 · 저장) 는 다
  됐다. 아직인 것은 대부분 로드맵 뒷단계의 새 기능이다: 대사창 v1 · 안내 요정 · 같이 놀기 · 배지 · 가게 · 계절 상자 · 다른 언어.
- 새 사람 첫 주 렌즈의 칭찬: 다락이 8일 동안 매일 눈에 띄게 자라고, 산책 의식이 짧고 정확하고, 포스터 완성도가 높고, 정직
  장치가 놀이를 해치지 않는다. 출시 렌즈: 기록이 잘 안 깨지고, 두 탭이 맞고, 망이 끊겨도 정직하게 버티고, 10분 놀아도
  메모리가 안 샌다.

## 6차에 넣은 '꼭 고칠 것' (갈래 지시문에 덧붙임)

| 점검 | 무엇 | 갈래 |
|---|---|---|
| J1 | 이름을 지어도 문어의 첫인사가 화면에 안 뜬다 (닫힌 '오늘의 산책' 줄에만) → 말풍선으로 첫 문장, 선물 토스트는 그 뒤 | R (F1) |
| J2 | 첫 10분 안내가 없다 (놀이방 문 · 마당 문 · 위층 계단) → 첫 산책 뒤 손 그림이 한 번씩 톡 (글자 0, 기기마다 한 번) | R (F2) |
| J3 | 위층 계단을 눌러도 대부분 마당 문으로 간다 → 계단 그림을 누르면 계단 | D |
| J3 | 위층 거울 거절 줄 '지금은 아래층에 있어.' → '깨어 있을 때 같이 올라오면 물어볼 수 있어.' | R (F3) |
| rel-01 | 부엌을 처음 열 때 망이 끊기면 빈 화면에 갇히고 그 세션 내내 부엌이 안 열린다 → 닫기 · 6초 뒤 알림 · 다시 부르기 | K2 |

다섯째 '꼭' **J4 조개가 쌓이기만 하고 쓸 데가 없다** (옷 · 머리 · 장식 64 가지가 첫날부터 다 열려 있음) 는 고침이 아니라 가게라는
새 기능 (L) 이라 6차에 안 넣고 아래 목록 맨 위에 둔다.

## 주인이 고를 것

### A. 작은 고침 (S) — 고르면 6차 고침 단계에 같이 넣는다

| # | 점검 | 무엇 | 고치는 법 |
|---|---|---|---|
| 1 | J13 | 선물 상자 대사 조사가 틀린다: '뽈뽈가 베레모 쓰기로 했어.' | 여섯 줄 모두 이름 조사 (이 / 가 · 은 / 는) |
| 2 | J12 | 집에 있던 날 쪽지 그림의 문어가 늘 빨강 (고른 몸 색과 다름) | 그릴 때 그날 몸 색으로 바꿔 칠함 |
| 3 | J11 | 첫 초대가 12% (밤 0~5시 32%) 로 '집에 있기 + 바로 낮잠' — 첫 판에 바깥 · 포스터를 못 봄 | 데모 규칙에 '맨 처음 한 번은 나간다' (미용실과 같은 방식) |
| 4 | J9 | 바깥 위키 글 포스터가 다 같은 '들판 표지판' 그림 (9일 포스터 14장 중 9장) | 앞 정류장의 주제 그림을 물려받기 · 제목으로 2~3장 돌려쓰기 |
| 5 | J10 | 내 모습 · 선물 상자 입구가 설정 시트 안에만 | 이름 지은 뒤 옷장 한 번 · 위층 옷방에 옷장 · 모자 상자 단추 |
| 6 | J14 | 미용실 시트를 열면 장면 위쪽에 흰 띠 (어두운 테마는 검은 띠) — 실기기 확인이 먼저 | 띠가 보이면 뒤 막 색을 아주 옅게 |
| 7 | rel-03 | 망이 끊긴 뒤 처음 그리는 대화 행 · 말풍선 글자가 거의 안 보임 (어두운 판을 그림 테두리에만 맡김) | 같은 색 바탕을 깔고 작은 UI 그림 몇 장을 미리 받음 |
| 8 | rel-04 | 첫 화면이 구글 글꼴 CSS (114 KB) 를 기다림 — 픽셀 글꼴에선 쓰지도 않음, 구글이 막힌 망에선 빈 화면 | 픽셀 글꼴을 끈 사람에게만 넣기 (느린 망에서 첫 그림 약 2초 빨라짐) |
| 9 | rel-06 | 내보내기 파일에 달리기 상 · 최고 점수 · 부엌 수첩이 빠지고, 전체 초기화는 그 둘을 남김 | 내보내기에 같이 넣고 되살리기 · 초기화는 다 지우거나 남는다고 적기 |
| 10 | rel-07 | 달리기 · 부엌이 화면을 다 덮어도 뒤에서 3D 방을 계속 그림 (배터리 · 발열) | 열려 있는 동안 장면 그리기 멈춤 |

### B. 중간 (M)

| # | 점검 | 무엇 |
|---|---|---|
| 11 | rel-02 | 아이폰 사파리는 오래 안 열면 기록이 지워질 수 있고, 홈 화면 앱은 기록이 따로라 새 문어로 시작 (막는 장치 · 안내 없음) → 기록 지키기 요청 · 아이폰에서만 한 줄 안내 · '사파리에서 키우던 문어 불러오기' |
| 12 | rel-05 | 달리기 순위 서버에 요청 횟수 제한이 없음 (스크립트 하나로 저장소 사용량을 태울 수 있고 'Claude 와 연결' 도 같은 저장소) → CDN 캐시 · 방화벽 한도 · 주마다 요약 하나 |
| 13 | J8 | 배지 (업적) 가 없다 — 배지 그림 12장은 이미 있음 → v0 12개: 사실만 세는 장부 + 살림 시트 아래 배지 칸 |

### C. 큰 새 기능 (L) — 다음 차례 후보

| # | 점검 | 무엇 |
|---|---|---|
| 14 | J4 (꼭) | 조개 쓸 데: 가게 (새 옷 · 머리 · 장식이 논 날에 조용히 들어옴 · 다음 선반은 남은 날 숨김 — 주인 결정 있음) |
| 15 | J5 | 계절 상자 (8일째 등불이 다 차면 방이 더 안 바뀜 — 하루 하나 공짜 · 안 사라짐) |
| 16 | J6 | 문어와 같이 하는 놀이 (컵 놀이 시제품을 놀이방에 → 오락기 칩 · 카드 짝 맞추기 · 플래피 문어) |
| 17 | S1-2 · L-DU-01 | 대사창 v1 + 돌아와서 대화 두 차례 (칩 [어디 갔어?] [어땠어?] [그만]) |
| 18 | S1-4 · O-01 | 안내 요정 '윤슬' (6차 손 그림 안내가 그 전 다리) |
| 19 | L-CL-01 · 05 | 같이 가기 · 집에서 기다리기 ('같이' 아이콘) |
| 20 | L-MP-04 | 모델의 인사 · 대답을 게임 화면에 ('Claude 와 연결' 쪽) |
| 21 | W-PF5 | 문어가 소파에 와서 옆에 앉기 |
| 22 | J7 | 요리를 끝낸 기록 (이번 주 할 일 '요리 한 접시' · 일기 한 줄 · 조개) — 먹은 기록은 6차 먹기에 들어감 |

### D. 사람 시험

| 23 | S15-4 | 처음 보는 사람 3~5명이 놀아 보기 (주인 몫 — 지시문은 `docs/PLAYTEST.md`) |
|---|---|---|

## 부록 — 아직 · 일부 전체 (반박 검사 반영)

크기 S · M · L, 영향 high · mid · low. '바뀜' 으로 판정된 것은 뺐다. 원본 (근거 · 파일:줄) 은 리드의 점검 기록에.

| 렌즈 | id | 무엇 | 상태 | 크기 | 영향 |
|---|---|---|---|---|---|
| roadmap | S0-8 | UI 움직임 4~6프레임 (▼·하트·zzz) · 끝없는 반복 멈추기 (카드 12, C-8 ★★★) | 일부 | S | low |
| roadmap | S1-1 | 대사창 본 게임 (한 줄씩 넘기기 · 타자기 · 다시 보기) + 프로토 dialogue.html (카드 13) | 아직 | L | med |
| roadmap | S1-2 | 돌아와서 대화 두 차례 (칩 [어디 갔어?][어땠어?][그만] → 문어 대답, S.talk) | 아직 | M | high |
| roadmap | S1-3 | 목소리 정리: 집 목소리 줄 · 혼잣말 행 없애기 · 첫인사 | 일부 | S | low |
| roadmap | S1-4 | 안내 요정 '윤슬' + 첫날 흐름(?tut=1) + 단추 처음 누를 때 비춤 + 이미 놀던 사람에게 한 번 묻기 | 아직 | L | high |
| roadmap | S1-5 | 같이 가기 (주 버튼 옆 '같이' 아이콘 · 먹물 헤엄 구간 · 줍기 하나만 · 다시 만나기 두 카드) + together.html | 아직 | L | med |
| roadmap | S15-2 | 게임 쪽 잇기: 첫인사 meet · 돌아와서 chat 을 모델 말로 | 일부 | M | med |
| roadmap | S15-4 | 사람 시험 (1½ 작은 시험 3~5명 + 4단계 처음 보는 3~5명) | 아직 | M | high |
| roadmap | W-7 | 식탁에 차리기 → 문어가 먹기/맛보기/두기 (결정 지점 table, S.table) | 아직 | M | high |
| roadmap | S2-2 | 헤엄 미니게임 (카드 8, 내 모습이 헤엄) | 아직 | L | med |
| roadmap | S2-3 | 가게 (옷장·가게 시트 · 물건 26개 · 계절 입고 · 다음 선반 · 다음 목표 줄) | 아직 | L | med |
| roadmap | S2-4 | 배지 (v0 12개 → 36 · 수첩 · 첫 배지에 문어 '오!') + 배지 그림 12장 | 아직 | L | med |
| roadmap | S2-5 | 놀이 결과 → 조개 (요리·헤엄·컵, 판 id) | 일부 | S | med |
| roadmap | S2-6 | 기념품 '조개' → '조개껍데기' · 재화 아이콘은 금빛 조개 동전 | 아직 | S | med |
| roadmap | S2-7 | 컵 놀이 (시제품 마무리 → 본 게임 놀이방에) | 일부 | M | med |
| roadmap | S3-2 | 벽이 차면 오래된 포스터를 문어가 떼어 서랍에 (0단계 넓히기 전) | 아직 | S | low |
| roadmap | S3-3 | 소파: 톡 = 앉기 · 문어가 오고 싶으면 옆에 앉기 · 덮개 색만 조개 | 일부 | M | med |
| roadmap | S3-4 | 사진 모드 (찍기 · 공유 · 포즈 놀이 · 둘이 찍기 · 앨범 '내 것') | 아직 | M | med |
| roadmap | S3-5 | 가구 톡 반응 4박 (양초 켜고 끄기 · 상자 덜컹 · 담요 · 시계 …) | 아직 | M | med |
| roadmap | S3-6 | [크게 보기] [가운데로] 칩 (핀치 못 하는 사람 길) | 아직 | S | low |
| roadmap | S4-3 | 디렉터리 등록 준비 (개인정보 처리방침 · 예시 · 넓은 스크린샷) | 일부 | S | low |
| roadmap | S4-4 | 접근성·성능 점검 보고서 (카드 5) | 아직 | M | low |
| roadmap | L-1 | 옷방 (옷장 · 가게 · 거울 앞에서 내 모습 바꾸기) | 일부 | S | med |
| roadmap | O-2 | 처음 만들기 ('그럼 너는 어떤 모습이야?' — 이름 짓기 바로 뒤) | 아직 | S | med |
| roadmap | O-5 | 계절 상자 (가구 세트가 계절마다 · 하루 하나 공짜 · 안 사라짐) | 아직 | L | med |
| roadmap | O-6 | 가구 조각 → 가구 (문어가 산책에서 조각을 가져옴) | 아직 | M | low |
| roadmap | O-7 | 오락기 칩 고르기 + 플래피 문어 + 카드 짝 맞추기 (게임별 주간 순위) | 아직 | L | med |
| roadmap | O-8 | 주간 상 코스튬 (달리기 왕관·망토 · 플래피 해적 · 카드 점성술사) · 받은 상을 내 캐릭터도 입기 | 일부 | M | low |
| roadmap | V-2 | 문어가 먼저 말·장난 걸기 (60초 가만히면 '놀자?') | 아직 | S | med |
| roadmap | D-1 | 선물 고르기 — 방 소품 카탈로그에서 내밀면 문어가 하나 고름 (§16.1) | 일부 | M | med |
| roadmap | D-3 | 집에 있는 날 '병뚜껑 굴리기' (§14 · §5.8) | 아직 | S | low |
| roadmap | D-9 | 11-08 뒤 새 놀이들의 소리 (달리기 · 미용실 · 발소리 · 텃밭 · 재봉틀 · 가구 모드 · 선물 상자) | 아직 | M | med |
| roadmap | D-10 | 설정 덧줄: 안내 켬/끔 · 테마 자동/밝게/어둡게 · 목소리만 끄기 · 모션 그대로 | 아직 | S | low |
| roadmap | B-1 | 기다리는 동안 산책 줄 봉해 두기 → 귀가 뒤 한 줄씩 | 아직 | M | low |
| roadmap | B-2 | 두뇌 오류로 생긴 빈 차례에 fallback 표시 | 아직 | S | low |
| roadmap | B-3 | 놀이 창이 떠 있을 때 뒤 3D 멈추기 (scene.pause) | 아직 | S | low |
| owner | O-01 | 안내 요정 '윤슬' (단추를 처음 누를 때 비춤 · 설정 › 안내) | 아직 | L | high |
| owner | O-02 | 이미 놀던 사람에게 업데이트 뒤 한 번만 묻기 | 아직 | M | med |
| owner | O-03 | 내 모습 만들기를 이름 짓기 바로 뒤에 | 아직 | S | med |
| owner | O-04 | 같이 가기 (출발 단추 옆 작은 '같이' 아이콘) · 같이 가서 주운 것은 하나만 | 아직 | L | med |
| owner | O-05 | 헤엄 놀이 (같이 헤엄칠 때 누르면 내 모습이 움직임) | 아직 | L | low |
| owner | O-12 | 거울 앞에서 내 모습 바꾸기 · '옷방이 생기면 그리로' | 아직 | S | med |
| owner | O-15 | 대사창 v1 (한 줄씩 넘김 · 다시 보기 · 산책 중 대사 자동 넘김) | 아직 | L | med |
| owner | O-16 | 기다리는 동안 산책 줄 봉해 두기 → 돌아오면 한 줄씩 | 아직 | M | med |
| owner | O-17 | 돌아와서 대화 두 차례 ([어디 갔어?] [어땠어?]) | 일부 | M | med |
| owner | O-25 | 오락기 칩 고르기 + 플래피 문어 + 카드 짝 맞추기 (놀이 물결) | 아직 | L | high |
| owner | O-26 | 주간 상 = 게임마다 어울리는 코스튬 (달리기 황제 망토 · 플래피 해적 · 카드 점성술사, 1등 추가 조각) | 일부 | M | low |
| owner | O-28 | 달리기 가로 전체 화면 (폰을 돌리면) | 일부 | S | low |
| owner | O-30 | 달리기 끝 '다시' · '닫기' 를 그림 단추로 | 아직 | S | low |
| owner | O-31 | 달리기 문어 다시 그림 (다락 문어 원본 · 기기 px) | 아직 | S | med |
| owner | O-32 | 놀이 스티커 (달리기 머리띠 문어 9 · 헤엄 물안경 문어 9) | 아직 | S | low |
| owner | O-34 | 부엌 손맛: 알맞게 익으면 '띵' · 뒤집개 · 칼 · 스티커 크게 · '+' 로 넷으로 썰기 | 아직 | M | med |
| owner | O-35 | 먹기: 놀이방 식탁 + 2인 소파 · 요리 3 · 문어가 같이 먹을지 고름 · 효과 그날 하루 (옛 9물결 '식탁에 차리기') | 아직 | L | high |
| owner | O-37 | 계절 상자 (계절마다 가구 세트 · 하루 하나 공짜 · 안 사라짐 · 타이머 · 한정 없음) | 아직 | L | high |
| owner | O-38 | 가구 조각 → 가구 (문어가 산책에서 조각을 가져옴) | 아직 | M | med |
| owner | O-39 | 소파: 첫 산책 때 공짜로 놓임 · 톡 = 앉기 · 덮개 색만 조개 (4색 × 12) | 일부 | S | med |
| owner | O-40 | 가구 톡 4박 (양초 켜기 · 상자 덜컹 · 담요 …, 하루 3단계, 분모 숨김) | 아직 | M | med |
| owner | O-41 | 가게 (조개로 옷 사기 · 다음 선반은 남은 날 숨기기) | 아직 | M | high |
| owner | O-42 | 배지 (함께한 날은 막대 없이 그날 조용히) | 아직 | M | med |
| owner | O-46 | 씨앗 → 꽃 → 염료 → 둘이 한 벌 물들이기 | 일부 | M | low |
| owner | O-55 | 로딩: 게임 픽셀 문어가 기어가는 반복 → 11-18 '가운데에서 오른쪽 끝으로' | 일부 | S | low |
| owner | O-60 | 기념품 '조개' → '조개껍데기' (재화 '조개' 와 따로) · 요리 재료 '가리비' | 아직 | S | low |
| owner | O-62 | 부엌 · 달리기 창이 떠 있는 동안 뒤 3D 방 멈추기 | 아직 | S | med |
| owner | O-63 | 두 탭 동시 저장 | 일부 | M | low |
| owner | O-65 | 옛 코드 정리 (js/app.js lookNow 두 번 · salonOpeningTap · 옛 /tmp 경로) | 아직 | S | low |
| owner | O-66 | 컵 놀이 시제품 (play.html) 을 본 게임에 | 아직 | M | med |
| owner | O-67 | 사진 모드 + 공유 사진 '포즈 놀이' 표시 | 아직 | M | med |
| owner | O-68 | 소리 접근성 묶음 · 달리기 '천천히' · 정적 캐시 헤더 | 일부 | S | low |
| owner | O-70 | 콘텐츠 양 (계획 대 지금) | 일부 | M | high |
| loop | L-CL-01 | '같이' icon next to the main button (default off, persisted) | 아직 | M | high |
| loop | L-CL-02 | Swim segments while walking together (player avatar follows, ≤4 per walk, no score) | 아직 | L | med |
| loop | L-CL-03 | Peek panel 'over the shoulder' + pick-up tray (7 common items, 1-2 per stop) | 아직 | M | med |
| loop | L-CL-04 | Pocket → keep one + blind two-card reveal + album '내 것' filter | 아직 | M | med |
| loop | L-CL-05 | Wait at home (default): screen stays in the attic, walk lines sealed, told as a story on return | 아직 | M | high |
| loop | L-CL-06 | Reunion order table (① story ② two cards ③ poster ③′ wrap/lantern/item/summary ④ table ④′ chat ④″ expand ④‴ sit beside ⑤ badge gap ⑥ sleep) | 일부 | M | high |
| loop | L-CL-07 | Table decision (octopus picks eat/taste/save/watch/stop, S.table, 8 s fallback) → now 6차 eating system | 아직 | L | high |
| loop | L-CL-08 | Cook in the play-room kitchen any time (1 recipe now; 6차 → 3) | 일부 | L | med |
| loop | L-CL-11 | Home day / empty turn house lines ('…이번엔 집에 있어' / '…아무 데도 안 가') | 일부 | S | med |
| loop | L-CL-12 | Departure door glance (A2) + v1.2 scene polish (walk out the attic door, ground sparkles, pointing, ink dot outside the window, photo per stop) | 아직 | L | low |
| loop | L-CL-13 | Together/eating sounds (splash ×2, swim bubbles, ink puff, rustle pick-up, nyam, pot pop, meeting chime, my footsteps) | 아직 | S | low |
| loop | L-CL-14 | Pause the 3D scene under full-screen overlays (cook, runner) | 아직 | S | low |
| loop | L-DU-01 | Dialogue box proper (one line at a time, tap to advance, portrait + name tag '뚜루 · 데모 규칙', ▼, typewriter 45 ms, pages, reading-time formula, DLG.ask) | 아직 | L | high |
| loop | L-DU-06 | When a model is connected: tag reads '모델', tip '지금은 네가 연결한 모델이 골라', settings line updated | 일부 | S | med |
| loop | L-DU-07 | Octopus first greeting '안녕, 나는 뚜루야.' right after naming (idle face, hop + wave, saved) | 일부 | S | high |
| loop | L-DU-08 | On reopen: house greeting + quote of yesterday's memo (wait lines, tap to advance) | 일부 | S | high |
| loop | L-DU-09 | Talk twice after return (chips [어디 갔어?][어땠어?][그만] → [뭐 봤어?]; demo answers from trip facts; S.talk saved) | 아직 | M | high |
| loop | L-DU-10 | Voice clean-up to house-voice facts (item lines, greetings, depart/return/poster/home/recovery, peek-memo source tag, window & souvenir taps) | 일부 | S | low |
| loop | L-DU-11 | Stop endless loops (▼ 4 frames × 3, heart 5 frames once, zzz 3 then every 12 s, away pill 3 breaths, still '…', 2D stars) | 일부 | S | med |
| loop | L-TU-01 | Guide fairy '윤슬' (face icon 16 px on note cards and house lines, silver white / water blue, no body in the room) | 아직 | S | med |
| loop | L-TU-02 | First-day flow steps 0-8 (eye contact → play first → fairy + name card → greeting → pet spotlight → walk-button spotlight → first walk → first pin → talk/sleep; skip tab; S.tut) | 아직 | L | high |
| loop | L-TU-03 | Per-button first-press explanation (pet, go, skip, door, settings, album, decor/hammer, face/mirror, photo, badge, together, table, mine) | 아직 | M | high |
| loop | L-TU-04 | One-time contextual notes ('앱을 닫아도 산책은 이어져', '조개는 네가 놀아서 모아', sofa '뚜루 기다리며 앉을 자리야', lantern one per day, chat chips) | 아직 | S | med |
| loop | L-TU-05 | Name card (6 colours, honesty lines, [아무 이름이나], non-modal) | 일부 | S | low |
| loop | L-TU-06 | I pin the first poster myself (pinPending; v1 choose a top-row board slot) | 아직 | M | med |
| loop | L-TU-07 | Ask 'and what do you look like?' right after naming | 아직 | S | med |
| loop | L-TU-08 | Settings › 안내 (replay intro tour, button tips on/off) + ask returning players once | 아직 | S | low |
| loop | L-CN-03 | Same note slot at the end of play (cup play) | 아직 | M | low |
| loop | L-MV-03 | Blind-order check (a person's pick never reaches the model before it chooses) | 아직 | S | low |
| loop | L-PR-04 | Salon decision point on the MCP server (salon_next / salon_answer, look in look_room) | 아직 | M | med |
| loop | L-MP-04 | Show the model's meet greeting and chat answers in the game (talk.json → game rows) | 아직 | M | high |
| loop | L-MP-05 | Game save and remote room keep separate facts (lantern, wall posters, visits) | 일부 | M | med |
| loop | L-MP-07 | 8 owner-written books (currently ChatGPT drafts) | 일부 | M | low |
| loop | L-MP-08 | Route in-game questions (salon, gift box, 6차 eating) to the connected Claude | 아직 | L | med |
| loop | L-MP-09 | Directory submission prep (privacy page, 3+ example prompts, wide screenshots, policy 3F question) | 일부 | M | low |
| loop | L-LK-02 | Human-loop dev panel (pixel, dither, outline, key/fill, time of day, palette, screenshot button) | 일부 | S | low |
| loop | L-LK-03 | Real-device check (GPU ms/frame, 24 ms auto p=3 fallback, gait and lantern sway on rAF) | 아직 | S | low |
| loop | L-IN-02 | Loading octopus crawl: start from screen centre to the right edge, repeat (phone and PC) | 일부 | S | low |
| world | W-RE2 | 벽이 꽉 차면 가장 오래된 포스터를 보이게 서랍(앨범)으로 + 집 쪽지 한 줄, 다른 칸은 제자리 | 아직 | M | med |
| world | W-RE5 | 문어가 내가 간 방으로 따라오기 (v1.1) | 일부 | M | med |
| world | W-IM4 | [크게 보기] 칩 (1× → 1.41× → 2×) · [가운데로] 칩 · 키보드 + − 0 (핀치 못 하는 사람 길) | 아직 | S | low |
| world | W-PF1 | 사진 모드 (카메라 그림 단추 · 각도 돌리기 · 줌 +4멈춤 · 셔터 · 플래시 · 비율 4:5/1:1/16:9 · 공유 navigator.share · 저장) | 아직 | M | med |
| world | W-PF2 | 포즈 15개 (공짜 5 · 조개 10, 147조개) — 사람이 시킨 포즈, '포즈 놀이' 표시 | 아직 | M | low |
| world | W-PF3 | 내 사진첩 (IndexedDB) · 앨범 '내 것' 칩 · 필터 · 액자 7 | 아직 | S | low |
| world | W-PF5 | 문어가 소파에 와서 옆에 앉기 (기다리며 같이 앉기, 데모 규칙 꼬리표, 소파만 10분에 한 번) | 아직 | M | high |
| world | W-PF6 | 소파 덮개 색 4가지 (각 조개 12) | 아직 | S | med |
| world | W-PF7 | 다른 가구 톡 반응 4박 (양초 켜기·끄기 · 상자 덜컹 · 담요 펴짐 · 화분 물방울 · 문 삐걱 · 등불 깜빡, 문어 몫은 하루 한 번) | 아직 | M | med |
| world | W-PF8 | 창 톡 · 기념품 톡 고침 (날씨 줄 · '가져온 날' 을 집 목소리로, 창엔 닦인 줄 반응) | 일부 | S | low |
| world | W-PF10 | 식탁에 요리 차리기 · 내 캐릭터가 앉아 먹기 · 문어 몫 (ACHIEVEMENTS 식탁 차리기 배지의 바탕) | 아직 | L | high |
| world | W-PP2 | 놀이별 벌이 (요리 3-6 · 헤엄 · 컵 2 · 달리기 · 낙서 2 · 처음 해 본 놀이 +5) + 하루 주머니 30 · 쉰 날 덤 | 일부 | S | med |
| world | W-PP5 | 처음 내 모습 만들기 (이름 짓기 바로 뒤, 시드로 한 벌 미리 · [이대로 할래]/[나중에]) | 아직 | S | med |
| world | W-PP6 | 옷방 · 거울에서 내 모습 바꾸기 (설정 '내 모습' 은 옷방이 생기기 전까지) | 아직 | S | med |
| world | W-PP7 | [보여 주기] — 바꾼 모습을 문어에게 보여 주고 문어가 쳐다보기 · 기호 · 사실 한 줄 (데모 규칙) | 아직 | S | low |
| world | W-PP8 | 달리기 상 (종이 왕관 · 황제 망토) 을 내 옷장에도 (둘이 한 벌) | 일부 | M | low |
| world | W-PP9 | 내 이름 (선택 12자 · 모델에 기본으로 안 보냄) | 아직 | S | low |
| world | W-PP10 | 계절 상자 (가구 세트가 계절마다 들어와 안 사라짐 · 하루 하나 공짜) · 가구 조각 → 가구 (문어가 산책에서 조각) | 아직 | L | high |
| world | W-AC1 | 배지 장부 · 배지 수첩 · 첫 배지 때 문어가 돌아보는 '오!' (v0 12개 / 전체 36개: 동 14 · 은 13 · 금 4 · 숨김 5, 조개 주는 배지 18) | 아직 | L | high |
| world | W-AC4 | 돈 '조개' 와 기념품 '조개' 나누기 — 금빛 조개 동전 아이콘 · 기념품 이름 '조개껍데기' | 아직 | S | med |
| world | W-BA1 | 배지 그림 12 · 등급 리본 4 · 조개 동전 2 · 배지 소품 2 (나머지 배지 24장은 v0.5~v1) | 일부 | - | low |
| world | W-BA2 | 기념품 큰 판 32×32 16종 | 일부 | S | low |
| world | W-SA5 | 진짜 모델이 미용실 물음에 답하기 (§6 프로토콜) | 아직 | M | low |
| world | W-SC4 | 2D 폴백 (3D 가 안 되는 폰) — 내 캐릭터 · 위층 · 마당 · 가구 모드 · 벽 6칸 | 일부 | S | low |
| play | P01 | Arcade chip screen (오락기 칩 고르기: 달리기 · 플래피 · 카드) | 아직 | M | med |
| play | P02 | Flappy octopus minigame (플래피 문어, 바닷속) | 아직 | M | high |
| play | P03 | Card matching minigame (카드 짝 맞추기, 20장) | 아직 | M | med |
| play | P04 | Leaderboard server generalized per game (api/games/*?game=) | 아직 | M | low |
| play | P05 | Weekly prize costumes per game (해적 세트 · 점성술사 세트 · 황제 관) | 일부 | M | med |
| play | P07 | Prize costumes for my character too (둘이 한 벌) | 아직 | M | med |
| play | P08 | Landscape full-screen arcade (폰 돌리면 가로 전체 화면) | 일부 | S | low |
| play | P09 | Export/import carries prizes and kitchen book (내보내기에 상 · 요리 수첩) | 아직 | S | low |
| play | P12 | Runner octopus sprite redraw (6차) | 아직 | S | med |
| play | P13 | Runner sounds (점프 · 부딪힘 · 새 최고) | 아직 | S | low |
| play | P14 | Runner 'slow' assist mode (천천히) | 아직 | S | low |
| play | P15 | Runner result buttons as pictures (다시 · 닫기 그림 단추) | 아직 | S | low |
| play | P16 | Runner reaction stickers (머리띠 문어 9종) | 아직 | S | low |
| play | P18 | Kitchen feel (6차): 'ding' when done · bigger spatula/knife/sticker · crisp '+' cut | 아직 | M | med |
| play | P19 | More recipes (조각 2 미역국 · 톳 주먹밥 → 11-18 '요리 3개') | 아직 | M | high |
| play | P20 | Cooking result reaches the game (조개 · 요리 수첩 화면 · 식탁에 차리기) | 아직 | M | high |
| play | P21 | Eating system (놀이방 식탁 + 2인 소파 · 문어가 같이 먹을지 고름 · 요리별 하루 효과) | 아직 | L | high |
| play | P22 | 'Octopus is back' note while a full-screen game is open (COOK.notice) | 일부 | S | med |
| play | P25 | Cup play inside the main game (놀이를 본 게임에) | 아직 | L | high |
| play | P26 | Cup play v1.1 candidates (눈 가리기 · 역할 바꾸기 · 3컷 만화 · 실제 모델 호출) | 아직 | L | low |
| play | P29 | Loading screen pixel octopus crawl | 일부 | S | low |
| play | P31 | Smoother UI motion 4–6 frames, stop endless loops (카드 12) | 아직 | M | med |
| play | P32 | Theme switch auto/light/dark (테마 3단) | 아직 | S | low |
| play | P33 | Share (navigator.share 포스터 · 공유 미리보기 카드) | 아직 | S | low |
| play | P36 | Game screen UI in other languages (영어판) | 아직 | L | low |
| play | P37 | I18N fix A-1: non-Korean rooms get no wiki links | 아직 | S | med |
| play | P38 | I18N fix A-3: 'more' returns the same 160 chars | 아직 | S | low |
| play | P39 | I18N fix A-4: injection/privacy filters only ko/en, English false positives | 아직 | M | med |
| play | P40 | I18N server rest: A-2 pin race · A-5 walk language · A-6 per-request load · C-1 room data | 아직 | M | low |
| play | P41 | I18N owner questions B-1…B-15 + game-side small fixes (먼 바다 문 글 등) | 아직 | S | low |
| play | P44 | A3 walk viewing pleasure (기웃 그림 · 줌 · 진행 점) | 일부 | S | med |
| play | P45 | A4 lantern once per day + 'next thing' hint | 일부 | S | low |
| play | P47 | A6 octopus invites play after 60 s idle ('놀자?') | 아직 | S | low |
| play | P48 | A7 poster one-line variety (20장 80 % 다름) | 일부 | S | low |
| play | P50 | C modularization C1–C6 (util · poster · store · demo · color · scene3d 쪼개기) | 아직 | L | low |
| play | P51 | D sound mapping: window tap · footsteps · rare sparkle · lantern prop · toast | 일부 | S | low |
| play | P53 | Swim minigame (카드 8: 같이 헤엄 구간 · 1분 코스, 내 모습이 헤엄) + swim stickers | 아직 | L | med |
| play | P54 | Pixel prop reference sheets (카드 10, Blender) | 아직 | L | low |
| play | P55 | Shared doodle prototype (카드 1 같이 낙서) | 아직 | L | low |
| play | P56 | Library map prototype (카드 2 도서관 지도) | 아직 | L | low |
