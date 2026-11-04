# 룩 로그 (docs/LOOK_LOOP.md 의 패스 기록)

고정 앵글: `node tools/look-shots.js <pass>` → `tests/evidence/look/<pass>-{day,night,close}.png` (360×740 @2x, 14:00 / 22:00, 등불 8, 비, idle at center; close = p2 · 줌 ×2 · 문어 중심).
메트릭: `node tools/look-metrics.js <png>` → 고유 색 · 엣지 픽셀 %(이웃 루마 차 > 0.25) · 평균 루마.

| pass | lever | changed numbers | KEEP/REVERT/PARTIAL | shots |
|---|---|---|---|---|
| 0 | 기준선 (3D 패스 0) | 문어 r 0.85 m(방 폭 17%), 다리 0.9 r 두께 0.2→0.07 r 직선, 눈 흰자 0.19 r 동공 0.095 r, 바닥 틈 0.12 r · day 46색 엣지 1.74% 루마 0.208 · night 29색 0.41% 0.075 · close 30색 0.90% 0.285 | — | look/0-day.png look/0-night.png look/0-close.png |
| 1 | 문어 비율 (레버 8) | r 0.42 m(방 폭 8%), y 찌그림 0.88, 바닥 틈 0.04 r; 다리 8 × 0.9 r 사슬 4마디 두께 0.38→0.13 r 바깥·아래로 말림(밑면 y=0, 끝 들림) 빨판 2/다리; 눈 흰자 0.24 r 동공 0.13 r 글린트 0.055 r 둘 다 정면 y 0.67; 입 `_` 0.3 r (y 0.44); 하이라이트 좌상; 히트 구 r 0.67 m(≈72 CSS px); 접지 데칼 1.34 m; setLook `zoom`·`focus` 추가 · day 44색 엣지 1.65% 루마 0.199 · night 28색 0.40% 0.072 · close 33색 0.58% 0.256 | **KEEP** — 문어가 바닥 마름모 폭의 ≈23%(≤ 1/4), 다리 짧고 통통하게 읽힘, p=3 에서 눈(흰자+동공) 판독 가능, 바닥에 붙음. 드로우콜 67 그대로 | look/1-day.png look/1-night.png look/1-close.png |
