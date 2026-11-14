# 4차 (11-15) — 남은 14개를 갈래별 클라우드 세션으로 한 번에

주인 결정: `docs/OWNER_DECISIONS.md` '주인 답 (11-15 00시 KST …)'. 이 폴더는 배포에 나가지 않는다 (`wip/`).

## 갈래 (모두 `claude/game-launch-completion-hwvre5` 의 같은 커밋에서 출발, 갈래마다 제 가지)

| 갈래 | 가지 | HANDOFF 할 일 | 지시문 |
|---|---|---|---|
| A cam | `lane/a-cam` | 8 두 손가락 360° · 가까운 벽 무릎 높이로 · 닫힌 방 | `briefs/A-cam.md` |
| B furn | `lane/b-furn` | 7 가구 모드 · 4 망치 아이콘 | `briefs/B-furn.md` |
| C runner | `lane/c-runner` | 6 달리기 세로 풀샷 runner-2 | `briefs/C-runner.md` |
| D yard | `lane/d-yard` | 13 마당 텃밭 (여섯 칸 · 함께한 날) | `briefs/D-yard.md` |
| E small | `lane/e-small` | 2 재봉틀 · 3 조리대 → 요리 · 5 로딩 문어 · 9 생각 풍선 · PWA | `briefs/E-small.md` |
| F honest | `lane/f-honest` | 10 정직 표기 3차 · 힌트 줄 · 기분 소리 | `briefs/F-honest.md` |
| G light | `lane/g-light` | 11 저녁·밤 밝기 · 12 계단 | `briefs/G-light.md` |
| H text | `lane/h-text` | 14 글자 줄이기 · 크기 한 단계 · 말풍선 (A~G 합친 뒤) | `briefs/H-text.md` |

HANDOFF 1 (배포) 은 끝에 한 번 (주인 11-15). 공통 규칙 `briefs/COMMON.md`, 탐침 도우미 `probe-lib.js`.

## 흐름

갈래: 짜기 → 스스로 폰 화면 확인 → `npm test` · 글꼴 · 관련 스모크 → 독립 검증 1번 → 고침 → 커밋 · 제 가지에 push →
`reports/<갈래>.md` · `shots/<갈래>/`.
리드: 끝난 갈래부터 이 가지에 합침 (충돌 해결 · `npm test`) → A~G 가 다 들어오면 H → 빠진 것 점검 (HANDOFF 14개 ·
주인 결정 하나하나) → push → GitHub CI 전체 초록 → Vercel production → 360x740 스크린샷과 짧은 보고.

## 진행 (리드가 갱신)

- 11-14 15:00 UTC: 시험 고침 둘 (`b3a6617`: 배포 묶음 목록 HANDOFF.md · 스모크 T 이름 창 뒤 기다림). PR #13 (초안).
- 11-14 15:40 UTC: 지시문 · 주인 결정 기록 · 갈래 A~G 띄움.
- 11-14 16:40~17:20 UTC: C · D · G · F · E · B 합침 (fb8f228, 충돌 여덟 곳은 양쪽을 합쳐 풂). npm test · 글꼴 통과, 합친 판을 360x740 에서 한 바퀴 (재봉틀 첫 톡 · 조리대 → 요리 · 가구 모드 · 마당 · 밤 다락, 콘솔 오류 없음). H 를 fb8f228 에서 띄움 (A 는 따로 합친다).
- 11-14 17:30~18:00 UTC: A 합침 (835f92b). 합치며 생긴 결함 하나 — A 의 inBox 와 B 의 inBox 이름이 겹쳐 3D 가 2D 로 떨어짐 → cutInBox (658b642). 계단 표시를 계단 자르기에 묶음 · 가구 모드 각도 0 은 바로. CI 시험 고침 둘 (S 말풍선 비키기 무리 · R 가로 배치). 로컬 스모크 Z2 · Z · CAM 125/0.
- 11-14 18:00 UTC: 최종 독립 검증 V1~V4 (`briefs/V-verify.md`, 읽기만) 를 A~G 합친 판에서 띄움. H 는 따로 합친다.
