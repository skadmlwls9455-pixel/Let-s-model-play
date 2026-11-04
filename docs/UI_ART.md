# UI 아트 — 타이틀·로딩 일러스트 · 대화창 테두리 · 말풍선 · 파티클 · 로그 아이콘

모두 `node tools/make-ui-art.js` 로 다시 만들 수 있다. 미리보기: `tests/evidence/ui-art/sheet.png` (`tools/ui-art/preview.html` 을 찍은 것).
키는 전부 `assets/manifest.json` 에 **추가만** 했다 (`illust.*` `ui.*` `fx.*` `icon.*`). 기존 키는 그대로 두었다.

## 장면 룩과 맞춘 규칙

| 무엇 | 어떻게 |
|---|---|
| 팔레트 | **Apollo 46** (장면 기본 스냅 팔레트, `js/palettes.js`)에 있는 색만 쓴다. 그리드 글자 → 색 표는 `tools/ui-art/sprites.js` 의 `KEY` |
| 외곽선 | 아이콘은 그리드에 선을 그리지 않는다. 생성기가 1px 선을 두르는데, 그 색은 **이웃 색의 OKLab L 을 ×0.62 로 낮춘 뒤 Apollo 에 스냅한** 색이다. 장면 후처리 깊이 외곽선과 같은 규칙이라, 물건마다 선 색이 다르고(나무는 진갈색, 유리는 남색) 검정 테두리는 생기지 않는다 |
| 빛 | 위·왼쪽에서 비춘다. 하이라이트는 왼쪽 위, 그림자는 오른쪽 아래 |
| 밀도 | 1x 원본이다. CSS 에서 **정수 배**(×2 권장)로 키우고 `image-rendering: pixelated` 를 준다. 장면 아트 픽셀(p=2)과 같은 밀도가 된다 |
| 일러스트 | 그리지 않았다. **게임 장면 렌더러(`js/scene3d.js`)를 그대로** 띄우고 시각·날씨·자세·표정·줌만 고정해 찍었다. 그래서 팔레트 스냅, Bayer 디더, 외곽선, 블룸이 게임 화면과 같다 |
| 정직 표기 | 읽기 상태 아이콘에서 `failed` 도 빨강을 쓰지 않는다. 회색 닫힌 문이고, 모양 언어는 성공과 같다 (DESIGN §1, SKILL §2) |

## 목록

### 일러스트 `assets/illust/`
| 키 | 크기 | 내용 |
|---|---|---|
| `illust.title_bg` | 180×240 | 밤 22시, 비, 등불 8칸이 모두 켜진 다락. 창가의 문어(curious). 글자 없음 |
| `illust.logo` | 160×41 | "뽈뽈"은 문어 빨강 램프, "문어"는 호박색 램프. Galmuri11(OFL) 12px ×3, 1px 테와 아래 2px 그림자, 투명 배경 |
| `illust.title` | 180×240 | 배경 + 로고 완성본. 시작 버튼과 그 밖의 글자는 HTML 로 올린다 |
| `illust.loading` | 160×120 | 노을 무렵 비 오는 다락, 꾸벅 조는 문어(sleepy) 클로즈업 + z. "불러오는 중"은 HTML 로 |

### 테두리·말풍선 `assets/ui/` (9-slice: 24×24, 슬라이스 8)
| 키 | 쓰는 곳 |
|---|---|
| `ui.frame.dialog` | 초상 대화창 (나무 테 + 남색 판 + 호박색 못) |
| `ui.frame.portrait` | 대화창 왼쪽 64×64 초상 둘레 (안으로 파인 인셋) |
| `ui.frame.paper` | 포스터 열람 기록, 영수증 카드 |
| `ui.bubble.say` · `think` · `shout` · `whisper` | 말풍선 4종: 보통 / 생각·기억(구름 가장자리) / happy·놀람(가시) / 졸림·잠꼬대(점선, 옅은 청록) |
| `ui.tail.say` · `think` · `shout` · `whisper` (8×8) | 풍선 꼬리. 풍선 아랫변 가운데에 붙이고, 위 1줄이 풍선 선과 겹친다 |
| `ui.next` · `ui.next2` (8×8) | 대화창 "다음" ▼. 0.5초마다 번갈아 보여 준다 |

```css
/* ×2 기준: 슬라이스 8px → 테두리 16px */
.dlg   { border: 16px solid; border-image: url(assets/ui/frame_dialog.png) 8 fill / 16px round; image-rendering: pixelated; }
.bub   { border: 16px solid; border-image: url(assets/ui/bubble_say.png) 8 fill / 16px round; image-rendering: pixelated; padding: 0 8px; color: #172038; }
.bub + .tail { width: 16px; height: 16px; margin: -4px auto 0; image-rendering: pixelated; }   /* tail_say.png */
```
`think`·`shout`·`whisper` 는 가장자리 무늬가 반복되므로 `round` 를 쓴다 (`stretch` 를 쓰면 무늬가 늘어난다).

### 파티클 `assets/fx/` (8×8 칸 가로 스트립, 외곽선 없음)
`fx.dust`(먼지 4종) · `fx.mote`(빛 알갱이 4f 깜빡임) · `fx.sparkle`(반짝 4f) · `fx.splash`(빗방울 튐 4f) · `fx.ink`(출발 먹물 퍼프 4f) · `fx.zzz`(3f) · `fx.heart`(2f) · `fx.note`(2f) · `fx.question`(1f) · 계절 `fx.petal` · `fx.leaf`(4f) · `fx.snow`(3종) · `fx.firefly`(2f).
manifest 에 `frames`, `cell: 8` 이 적혀 있다.

```css
/* 12fps 스텝 (장면 입자와 같은 박자), ×2 */
.mote { width: 16px; height: 16px; background: url(assets/fx/mote.png) 0 0 / 64px 16px; image-rendering: pixelated; animation: mote .333s steps(4) infinite; }
@keyframes mote { to { background-position: -64px 0; } }
@media (prefers-reduced-motion: reduce) { .mote { animation: none; } }
```
`fx.dust` 와 `fx.snow` 는 애니메이션 프레임이 아니라 **종류**다. 알갱이마다 칸 하나를 시드로 골라 쓴다.

### 아이콘 `assets/icons/` (16×16)
- `icon.log.*` (산책 로그 행): `depart` 출발 · `peek` 기웃 · `return` 귀가 · `remember` 기억 · `poster` 포스터 · `wrapup` 마무리 · `home` 집에 있기, 읽기 상태 `read` · `builtin` · `simulated` · `failed` · `none`
- `icon.memory.*` (기억 코너 9개): `hands` `sea` `sky` `signs` `numbers` `sounds` `home` `mind` `wild`
- `icon.souvenir.*` (기념품 16종): `souvenir.*` SVG 플레이스홀더의 픽셀 버전. 2D 폴백 `.souv img` 는 8px 로 그리기 때문에 기존 `souvenir.*` 키는 바꾸지 않았다. 16px 의 정수 배로 쓰는 UI(로그·앨범·열람)에서 이 키를 쓴다

## 다시 만들기 · 고치기

```sh
node tools/make-ui-art.js            # 전부 (스프라이트 → 일러스트 → manifest → 시트)
node tools/make-ui-art.js sprites    # 그리드만 고쳤을 때 (브라우저 없이)
node tools/make-ui-art.js illust     # 일러스트만 (Playwright + SwiftShader)
node tools/make-ui-art.js sheet      # 미리보기 시트만
```
- 그리드는 `tools/ui-art/sprites.js` 에 있다. 한 글자가 한 칸이고 `.` 은 투명이다. 짧은 행은 오른쪽이 투명으로 채워진다. 모르는 글자를 쓰거나 크기를 넘기면 생성기가 멈춘다.
- 일러스트 구도는 `tools/ui-art/illust.js` 의 `scene({...})` 인자(시각·날씨·앵커·상태·표정·줌)로 정한다. 장면 렌더러가 바뀌면 다시 찍기만 하면 같은 룩이 따라온다.
- `tools/make-placeholders.js` 는 manifest 를 통째로 다시 쓴다. 그걸 돌렸다면 `node tools/make-ui-art.js sprites illust` 를 이어서 돌려 키를 다시 넣는다.
- 참고로 **Galmuri11 의 실제 픽셀 격자는 12px** 이다 (11px 에서는 획이 반투명 두 줄로 번진다. 생성기에서 16가지 오프셋으로 측정했고, 12px 에서 반투명 칸이 0개였다). 로고는 12px 로 찍고, 글자 첫 줄이 잘리지 않게 3칸 내려서 그린다.
