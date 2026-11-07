# UI 아트 — 입장 레이어 · 타이틀·로딩 일러스트 · 대화창 테두리 · 말풍선 · 파티클 · 로그 아이콘

모두 `node tools/make-ui-art.js` 로 다시 만들 수 있다. 미리보기: `tests/evidence/ui-art/sheet.png` (`tools/ui-art/preview.html` 을 찍은 것).
키는 전부 `assets/manifest.json` 에 **추가만** 했다 (`illust.*` `ui.*` `fx.*` `icon.*`). 기존 키는 그대로 두었다.

## 입장 — 하늘에서 내려와 장면 위에 얹히는 타이틀 (`js/intro.js` · `css/intro.css` · `SCENE3D.intro`)

타이틀 화면을 따로 두지 않았다. **게임 화면 위에 얹는 얇은 레이어**다 (레퍼런스: Braid 는 타이틀 글자를 게임 장면 위에 바로 띄우고 바로 플레이로 이어진다).

| 단계 | 시간 (기본 속도) | 무엇이 |
|---|---|---|
| 로드 중 | 스크립트가 다 읽힐 때까지 | `<head>` 의 intro.js 가 `html.intro-on` 을 먼저 붙인다. 페이지 전체를 밤하늘색 `#090a14` 로 칠하고 장면 자리도 비워 두어 베이지 종이나 2D 문어가 한순간 비치지 않게 한다. 앱이 3 s 안에 레이어를 세우지 못하면(스크립트 오류) 덮개를 걷는다 |
| 하늘 | 0 → 2.2 s | 장면 카메라가 **구름층 → 비 → 다락** 순서로 내려온다. 직교 카메라라서 타깃을 위로 올리면 하늘을 보게 되고, 타깃 y 오프셋 하나만 easeOutCubic 으로 움직인다. 착지할 때 아트 3px 만큼 더 내려갔다가 돌아온다. 위치는 매 프레임 `placeCamera` 의 픽셀 격자 스냅을 그대로 거치므로 서브픽셀 크리프가 없다 |
| 하늘 소품 | 연출 동안만 존재 | 구름(`js/clouds.js`, 아래 "구름" 참고. 텍스처 1텍셀 = 아트 1px, 알파 테스트, 깊이에 쓰지 않아 구름끼리 겹친 곳에 외곽선이 생기지 않는다). 먼 층은 카메라를 30 % 따라 내려와 느리게 흐른다(직교에서 만드는 패럴랙스). 하늘 비는 1px 세로줄이고 12 fps 스텝, 지붕 아래로는 들어오지 않는다. 눈 오는 날은 눈송이, 맑은 밤은 별을 쓴다. 구름 색은 날씨 × 시각대를 따른다. 착지 직전 30 % 동안 줄기가 줄어들고, 착지하면 모두 dispose 한다 |
| 덮개 | 내내 | 장면 바깥(아래 UI 자리)을 **장면 허공과 같은 색**으로 덮어 한 화면처럼 잇는다. 그 색은 렌더 직후 캔버스 네 변에서 64점을 읽어(`readPixels`) 정하고, 연출 동안은 비네트를 꺼서 허공을 한 색으로 만든다. 장면 테두리도 감춘다 |
| 타이틀 | 카메라 진행 52 % ~ | 방이 거의 다 내려왔을 때 로고(`illust.logo`)가 장면 아래 가장자리에 걸쳐 **14 아트px 아래에서 슥 올라온다**. easeOutBack 으로 1px 넘쳤다가 제자리에 오고, 움직임은 정수 px 로만 한다. 시점은 벽시계가 아니라 카메라 진행도로 잡는다(느린 기기에서는 프레임 dt 가 0.1 s 로 잘려 카메라가 벽시계보다 늦기 때문이다. 탭이 숨어 멈출 때를 대비해 벽시계 2.5배를 안전판으로 둔다). 문어는 고개를 든다(curious). 빛 알갱이(`fx.mote`) 6개가 깜빡이고, 다 올라오면 반짝(`fx.sparkle`)이 한 번 터진다. 0.7 s 마다 1px 숨쉬기 |
| 안내 | 타이틀 + 0.26 s | "톡 눌러서 들어가기". 크기는 Galmuri9 10px × 로고 배율이라 로고와 픽셀 밀도가 같다. 1.2 s 주기로 깜빡인다 |
| 들어가기 | 탭 · 클릭 · Enter · Space · Esc | 로고가 80 ms 눌렸다가 위로 빠지며 사라지고, 덮개가 0.42 s 동안 걷히고, 상태띠·초대·로그가 60 ms 간격으로 12px 아래에서 올라온다. 문어는 폴짝 두 번(happy) 한 뒤 원래 표정으로 돌아간다. 첫 실행이면 그다음에 이름 짓기 창이 열린다 |

- **하늘 단계에서 누르면** 바로 착지하고 바로 게임으로 들어간다. 기다리게 하지 않는다.
- 장면의 **자동 픽셀 폴백**(첫 2 s 평균이 24 ms/frame 을 넘으면 픽셀 2→3)은 입장 연출이 끝날 때까지 미룬다. 연출 한가운데서 밀도가 바뀌면 구름·로고와 어긋나기 때문이다. 적용은 다음 프레임 렌더 *전에* 한다. 예전에는 렌더 *직후* `resize()` 를 불러서, 캔버스가 비워진 채 한 프레임이 검게 보였다(입장 녹화에서 찾았다).
- 자고 있는 문어는 깨우지 않는다. 표정 반응을 건너뛴다.
- 연출 동안 아래 UI 는 `inert` 라서 레이어만 입력을 받는다. 자동 포커스는 하지 않는다(입력 전에 포커스를 주면 포커스 링이 그려진다). Tab 으로 로고 버튼에 갈 수 있다.
- **모션 감소**: 카메라는 바로 착지하고, 로고·덮개는 페이드만 한다. 알갱이는 한 칸에 멈추고 안내는 깜빡이지 않는다.
- **2D 폴백**(WebGL 없음): `#stage` 를 위에서 내린다(`translate` 개별 속성이라 기존 transform 은 그대로 둔다).
- **하루 한 번**: 그 날짜(로컬, `__ppolTest.today` 훅 따름)에 타이틀을 눌러 들어갔으면, 같은 날 다시 열 때는 연출 없이 바로 게임으로 들어간다(`localStorage['ppolppol_intro_day']`). 연출 도중 닫으면 다음에도 보인다.
- **켜고 끄기**: `?intro=0` 이면 생략, `?intro=1` 이면 강제. 자동화 브라우저(`navigator.webdriver`)에서는 기본 생략한다. 기존 스모크·룩 샷이 첫 화면에서 바로 이름 창을 기다리기 때문이다. `?slow=4` 를 주면 연출 전체가 4배 느려진다.
- 스모크와 스크린샷: `node tools/intro-shots.js [hour] [weather]` → `tests/evidence/intro/`. 첫 실행 흐름, 다시 열기에서 하늘 단계 탭, 카메라 하강 스트립 7장(결정적), 자동화 기본 생략을 확인한다. 같은 폴더에 첫 실행을 실제 속도로 녹화한 `intro.webm`(SwiftShader 라 실기기보다 프레임이 성기다)과 요약 `sheet.png` 도 남긴다.
- 장면 API: `scene.intro({ dur, height, hold })` → Promise(착지), `scene.introSkip()`, `scene.introRelease()`(hold 중이던 비네트 복귀), `scene.skyHex()`(지금 허공이 찍히는 색).

`illust.title`(정지 타이틀)은 이제 화면에 쓰지 않는다. 공유 카드·썸네일·스토어 이미지용으로 남겨 둔다.

### 구름 (`js/clouds.js`, 미리보기 `tests/evidence/ui-art/clouds.png`)

외부 에셋을 받아 오지 않고 코드로 그린다(OpenGameArt·itch.io 는 이 작업 환경의 네트워크 허용 목록 밖이었다). 그리는 법은 픽셀 구름 튜토리얼들이 공통으로 권하는 방식을 따른다. 구름을 큰 3D 덩어리로 보고, 그림자로 빛 방향을 정하고, 단계 사이만 디더로 부드럽게 잇는다.

- **모양** 4종: 솟은 적운, 길쭉한 띠, 작은 몽글, 기본. 아랫줄 덩어리와 윗줄 덩어리를 원으로 두고, **부드러운 합집합**(부호 거리의 log-sum-exp, 폭 3.2px)으로 녹여 붙인다. 밑면은 부드럽게 평평히 자른다.
- **음영** (일러스트식): 덩어리마다 빛(왼쪽 위) 쪽 테두리는 밝은 초승달, 반대쪽 테두리는 그늘 초승달이다. 둘 다 밀린 원 두 개로 판정하므로 띠가 둘레를 따라 휜다. 아랫줄 덩어리가 윗줄을 가린다. 밑면은 그늘 띠 5줄과 맨 밑 2줄. 띠 경계 1줄에만 체크 디더를 넣는다. 처음에는 전면 디더와 공 모양 음영을 썼는데 거칠고 "공을 쌓은" 느낌이라 바꿨다.
- **가장자리**: 윗면 1px 는 림 라이트(은빛/금빛), 밑과 그늘진 오른쪽 가장자리 1px 는 체크로 반쯤 비워 솜털처럼 보이게 한다.
- **색** = 날씨 × 시각대 램프 5색 + 테 (전부 Apollo):

| | 맑음 | 가랑비 | 비 | 눈 |
|---|---|---|---|---|
| 낮 | 흰 몸, 푸른 회색 그늘 | 연회색 | 짙은 회색, 무거운 밑 | 우윳빛, 대비 낮음 |
| 노을·새벽 | 보라 밑, 분홍 몸, 금빛 테 | 베이지, 금빛 테 | 갈색 모브 | 보라 → 분홍 → 흰 윗면 |
| 밤 | 남색 몸, 은빛 테 (달빛) | 남회색 | 하늘에 거의 묻히는 슬레이트 | 눈빛을 되비춰 밝은 회청 |

먼 층은 한 단 어둡고, 테도 몸색으로 낮춰 공기 원근을 준다.

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
| `illust.title` | 180×240 | 배경 + 로고 완성본 (정지 이미지: 공유 카드·썸네일용. 게임 입장은 위의 레이어) |
| `illust.loading` | 160×120 | 노을 무렵 비 오는 다락, 꾸벅 조는 문어(sleepy) 클로즈업 + z. "불러오는 중"은 HTML 로 |

### 테두리·말풍선 `assets/ui/` (9-slice: 24×24, 슬라이스 8)
| 키 | 쓰는 곳 |
|---|---|
| `ui.frame.dialog` | 초상 대화창 (나무 테 + 남색 판 + 호박색 못) |
| `ui.frame.portrait` | 대화창 왼쪽 64×64 초상 둘레 (안으로 파인 인셋) |
| `ui.frame.paper` | 포스터 열람 기록, 영수증 카드 |
| `ui.bubble.say` · `think` · `whisper` | 말풍선 3종: 보통 / 생각·기억(구름 가장자리) / 졸림·잠꼬대(점선, 옅은 청록). 외침(가시) 풍선은 11-07 주인 요청으로 없앴다 — happy·놀람·'찾았다!' 는 보통 풍선 + 효과음 + 2px 통통 두 번 (`data-pop`, 동작 줄이기면 없음) |
| `ui.tail.say` · `think` · `whisper` (8×8) | 풍선 꼬리. 풍선 아랫변 가운데에 붙이고, 위 1줄이 풍선 선과 겹친다 |
| `ui.next` · `ui.next2` (8×8) | 대화창 "다음" ▼. 0.5초마다 번갈아 보여 준다 |

```css
/* ×2 기준: 슬라이스 8px → 테두리 16px */
.dlg   { border: 16px solid; border-image: url(assets/ui/frame_dialog.png) 8 fill / 16px round; image-rendering: pixelated; }
.bub   { border: 16px solid; border-image: url(assets/ui/bubble_say.png) 8 fill / 16px round; image-rendering: pixelated; padding: 0 8px; color: #172038; }
.bub + .tail { width: 16px; height: 16px; margin: -4px auto 0; image-rendering: pixelated; }   /* tail_say.png */
```
`think`·`whisper` 는 가장자리 무늬가 반복되므로 `round` 를 쓴다 (`stretch` 를 쓰면 무늬가 늘어난다).

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
