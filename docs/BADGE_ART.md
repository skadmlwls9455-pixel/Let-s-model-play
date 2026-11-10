# 배지 · 조개 동전 그림 (BADGE_ART)

> 11-10. docs/ACHIEVEMENTS.md §9.1 의 v0-2 ("그림: 배지 12장(24×24), 리본·조개 동전 아이콘, 배지 소품 2개") 를 그렸다. 그림만이다 — 배지 장부(`js/badges.js`)·수첩 시트는 아직 없다.

| 무엇 | 파일 | manifest 키 | 크기 |
|---|---|---|---|
| 배지 12장 (v0) | `assets/badges/<id>.png` | `badge.<id>` | 24×24 (×2 = 48px) |
| 등급 리본 4 | `assets/badges/ribbon_<등급>.png` | `ribbon.bronze` · `silver` · `gold` · `hidden` | 16×16 |
| 조개 동전 | `assets/badges/coin.png` · `coin8.png` | `icon.coin` · `icon.coin8` | 16×16 (지갑 머리 32px) · 8×8 (글줄 안 16px) |
| 배지 소품 2 | `assets/badges/prop_bell.png` · `prop_pebble_jar.png` | `prop.badge.bell` · `prop.badge.pebble_jar` | 24×24 (2D 그림 — 3D 소품은 장면 쪽) |

미리보기 `tests/evidence/badges/sheet.png`. 다시 만들기 `node tools/make-badges.js` (그림 `tools/ui-art/badges.js`, 내보내기 도우미 `tools/ui-art/pixel-out.js`), 검사 `node tools/test-art-extra.js`.

## 규칙 (ACHIEVEMENTS §6.2 그대로)

- **테 모양 = 무리** (색만으로 나누지 않는다): 우리 둘 = 깃발 · 놀이·내 일 = 둥근 메달 + 리본 두 갈래 · 문어 기록 = 물방울.
- **테 색 = 등급**: 동 · 은 · 금 금속색. 숨김(문어 기록)은 청록.
- 조개 동전은 금빛 동전 테 안에 골 있는 조개 무늬 — 문어가 가져오는 기념품 조개껍데기(`icon.souvenir.shell`)와 다른 그림이다 (검사).

| id | # | 이름 | 테 · 등급 | 가운데 무늬 |
|---|---|---|---|---|
| `hello` | 1 | 안녕, ○○ | 깃발 · 동 | 문어 얼굴 |
| `send_off` | 2 | 잘 다녀와 | 깃발 · 동 | 배웅 종 |
| `days_7` | 5 | 일곱 날 친구 | 깃발 · 은 | 조약돌 일곱 |
| `runner_first` | 23 | 상자에 콩! | 메달 · 동 | 상자 + 별 |
| `runner_30` | 24 | 다락 단골 | 메달 · 은 | 다락 지붕 집 |
| `my_look` | 26 | 내 모습 | 메달 · 동 | 종이 인형 |
| `place_first` | 27 | 여기 어때? | 메달 · 동 | 화분 |
| `place_10` | 28 | 내 손으로 | 메달 · 은 | 의자 · 화분 · 상자 |
| `first_10` | 32 | 처음 가 본 곳 10곳 | 물방울 · 숨김 | 발자국 |
| `stay_home` | 33 | 오늘은 집 | 물방울 · 숨김 | 집 |
| `still_day` | 34 | 가만히 있던 날 | 물방울 · 숨김 | 점 셋 |
| `eight_ways` | 35 | 여덟 갈래 | 물방울 · 숨김 | 여덟 갈래 별 |

id 는 ACHIEVEMENTS §8 의 예(`hello` · `runner_30`)를 따라 지었다. 배지 장부를 만드는 쪽이 다른 id 를 쓰면 `tools/ui-art/badges.js` 의 `BADGES` 첫 칸만 바꾸고 다시 만든다.
남은 것: 나머지 배지 24장 (v0.5~v1 — 놀이가 붙을 때) · 대표 판은 있는 종이 테(`ui.frame.paper`)를 쓰면 된다.
