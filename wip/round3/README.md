# 3차 고침 진행 상황 (2026-11-14 06:55 UTC, 처음 저장)

사용량 한도나 컨테이너 재시작으로 세션이 멈춰도 이어서 할 수 있게 남겨 둔다. 이 폴더는 배포에 나가지 않는다 (`wip/`).

## 지금 production

`a850175` (2차 배포, 11-14 06:12 UTC). 자세한 것은 `wip/round2/README.md`.

## 도는 것 (둘 다 `12ba4e9` 에서, 갈래마다 제 트리)

- **honest2** (주인 답 11-14: O1 → b, O2 → c): 데모 두뇌 문구 중 문어 마음 ('궁금했어 · 끌렸어 · 좋아 · 재밌었어 ·
  됐다 싶었어 · 그러고 싶어서') 을 사실 문장으로 · 쓰다듬기 하트 파티클은 두고 얼굴 (눈 웃음 · 입 · 볼 · 몸 홍조) 은
  평소대로. 트리 `/home/user/ppolppol-fix-honest2`, 지시문 `briefs/fix-honest2.md`.
- **imp2** (2차 배포 뒤로 미룬 nit): 산책 중 내보낸 파일 불러오기 (C-b · P-1) · 다른 탭 낮잠 기록 (C-a) · 내 파일을 깨어
  있는 틈에 다시 불러오기 (P-2) · 위층에서 전체 초기화. 트리 `/home/user/ppolppol-fix-imp2`, 지시문 `briefs/fix-imp2.md`.
- 흐름: `briefs/lane.js` (고침 → 독립 검증 → must · should 가 있으면 보수 → 재검증), 공통 `briefs/COMMON4.md`,
  검증 `briefs/check-c.md`, 인자 `briefs/args-lane-*.json`.

## 그다음

두 갈래가 must · should 없이 끝나면: 갈래마다 커밋 → merge-2 → 이 브랜치에 합침 → 빠른 시험 · 글꼴 · 갈래의 스모크 →
푸시 → 전체 시험 (두 줄 게이트) → production 배포 → production 확인 → 주인 보고.
