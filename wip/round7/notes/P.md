# 갈래 P 메모 (11-21)

## 계획 (차례대로, 단계마다 push)
1. 뛰기: 장면 쪽에서만 (plDashHeld · PL_DASH 3.74 · 보폭 0.85 · 혼자 걷기 4 m 넘으면 뜀 · scene.playerSpeeds). [완료]
2. 목록 틀 먼저: 새 갈래 body · brow, 물건마다 tags · shop, S.user.owned, APP.wardrobe / wearing / itemThumb / ownItem,
   setPlayerPart 의 가게 물건 거절, 옷장 잠금 칸, 재봉틀은 가진 것만. (S · F 갈래가 기다린다)
3. 새 부품 그리기: 몸 b → 눈 넷 · 눈썹 → 머리 여섯 → 옷 여덟 → 신발 둘 · 장식 여섯.
4. 마네킹: 흰 문어 티셔츠.
5. 검사 (player-shots 핀 · smoke P7 · T7 뛰기) · 독립 확인 한 번 · 보고서.

## 시간이 모자라면 먼저 자를 것
장식 셋 넘는 것 → 둘째 신발 → 옷 다섯 넘는 것. (뛰기 · 중립 기본 모습 · 목록 API · 저장된 모습 그대로는 안 자른다)

## 주인이 확인할 결정 (기본값으로 진행)
- 새 플레이어 기본 모습: 짧은 머리 `crop` + 문어 티셔츠 `octee` + 운동화 + 장식 없음 + 몸 a.
  저장된 모습은 그대로 (body · brow 가 없으면 a · none).
- 혼자 걷기 (문 톡) 도 4 m 넘으면 뛰는 속도 3.74 m/s.
