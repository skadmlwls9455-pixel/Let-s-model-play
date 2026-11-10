# 미용실 2부 — 하다 만 작업 보관 (11-10)

주인이 한 주쯤 자리를 비운다. 그동안 작업 컨테이너가 사라질 수 있어서, 로컬에만 있던 미용실 2부를 잃지 않게 여기 넣어 둔다.

**이 폴더는 게임이 읽지 않는다. 미용실 2부는 아직 게임에 들어가 있지 않다.** 지금 게임에 있는 것은 1부까지다 (규칙 모듈 `js/salon.js` 와 다락 거울 코너 장면. 화면에서 부르는 곳은 없다).

## 들어 있는 것

| 파일 | 무엇 |
|---|---|
| `salon2-wip.patch` | 커밋 하나 (기준 `983d436` 미용실 1부). 17 파일, +2458 −124. 첫 실행에서 색 한 번 고르기 · 설정의 색 잠금 · 거울 단추 `#btn-salon` · 물감 병 시트 · 묻기 → 대답 연출 · 로그와 앨범 일기 줄 · 모델 요청과 대답 읽기 · 문서 (`docs/SALON.md` 새로) · smoke `Y` 블록 |
| `SPEC.md` | 설계 계약 (§0~§13). 구현이 따르는 문서 |
| `REPORT_A.md` · `REPORT_DOCS.md` | 앞 두 작업 (색 잠금 · 문서) 의 보고. 세 번째 작업 (미용실 화면) 은 마지막 회귀 시험 도중 끊겨서 보고가 없다 |
| `briefs/` | 마무리 · 검증 지시문 한 벌 (`finish-b` → `verify-phone` · `verify-welfare` · `verify-edge` → `refute` → `fix` → `final`) 과 `workflow.js` · `LAUNCH.md` |

## 상태

- 만들기는 거의 끝났다. 끊기기 전에 `983d436` 위에서 통과한 기록: npm test · smoke · test-audio · test-scene-perf.
- **독립 검증을 아직 하지 않았다** (폰으로 해 보기 · 복지와 정직 · 코드와 엣지, 세 갈래). 검증 전에는 배포하지 않는다.
- 부엌 마무리 커밋 위로 옮겨 보지 않았다. 겹칠 곳: `js/app.js` (설정 맨 아래 '만든 것들' 링크) · `README.md` · `docs/*.md`. 양쪽을 다 살린다.

## 이어 하기

```
git worktree add ../ppolppol-salon2 -b salon2-wip 983d436
git -C ../ppolppol-salon2 am "$PWD/wip/salon2/salon2-wip.patch"
git -C ../ppolppol-salon2 rebase <그때의 head>
```

그 다음은 `briefs/LAUNCH.md` 순서다: 지시문을 작업 폴더로 옮기고 (안에 적힌 `SCRATCH/salon2/v2/` 경로에 맞춰), `@@K@@` · `@@STATE@@` 를 채우고, `workflow.js` 를 돌린다. `SPEC.md` 는 `SCRATCH/salon/SPEC.md` 자리에, 보고 둘은 `SCRATCH/salon2/` 에 둔다. 끝나서 게임에 들어가면 이 폴더를 지운다.

## 주인에게 다시 물을 것

답이 없어서 아래대로 만들었다.

1. 미용실 자리: 다락 뒷벽 등불 아래 거울 코너.
2. '그대로' 라고 한 색은 7일 동안 다시 묻지 못한다.
