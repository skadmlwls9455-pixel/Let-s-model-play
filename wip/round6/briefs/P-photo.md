# 갈래 P — 사진 (가지 `lane/6-photo` · 상한 40달러)

먼저 `wip/round6/briefs/COMMON.md`. 그다음 **`docs/PHOTO_AND_FURNITURE.md` §1~§5 가 이 갈래의 바탕 설계** 다 (주인 11-05 요청으로 쓴 것) — 통째로 읽되,
아래 '주인 새 말' 과 어긋나는 곳은 새 말을 따른다. 참고: `js/app.js` 의 포스터 PNG 내보내기 (`grep -n "toBlob\|exportPng\|download"`),
`js/scene3d.js` 의 초상 (`grep -n "function portrait\|playerShot\|readRenderTargetPixels"`) — 장면을 작은 타깃에 그려 읽는 선례.

## 주인 말

- (11-05) "카메라 기능도 넣어서 xy축 돌려가면서 딱 사진 찍구 공유해도 좋을 거 같음"
- (11-18) "맵들 돌아다니면서 문어랑 사진 찍기 기능은 꼭 있으면 좋겠네. 모션 조개로 사서 문어랑 사진 찍을 수 있는 거야."

## 무엇을 만드나

**사진 모드의 화면 · 합성 · 저장 · 공유 · 사진첩 · 모션 가게.** 3D 장면을 찍는 일 (렌더 타깃 읽기) 과 캐릭터가 실제로 포즈를 취하는 일은 리드가
`js/scene3d.js` 에 넣는다 — 너는 **약속된 함수 모양 (아래 `host`)** 에 맞춰 만들고, 시험용 쪽에서는 가짜 host (미리 그려 둔 픽셀 장면 캔버스) 로 돌린다.

- **사진 모드**: 카메라 단추 → 다른 UI 가 숨고 (host 가 숨긴다) 셔터 · 틀 · 모션 · 닫기만 남는다. 세계는 멈추지 않는다.
  방 돌리기 · 밀기 · 줌은 본 게임의 손짓 그대로 (네 UI 는 캔버스를 가리지 않는 아래 띠).
- **셔터**: `host.capture()` 가 준 아트 해상도 캔버스를 **정수 배 최근접 확대** (긴 변 1080px 근처, `imageSmoothingEnabled = false`) → 틀을 합성 → PNG.
- **틀**: 없음 / 흰 테 + 아래 한 줄 (날짜 · 장소 이름 · 날씨 — 사실만, host 가 준다) / 필름 띠. 자유 글 · 이름 입력 없음.
- **모션 (포즈) 가게** — 주인 11-18: 모션은 조개로 산다.
  - 내 캐릭터 모션 10개쯤: 처음부터 3개 (서기 · 손 흔들기 · 앉기), 나머지는 조개 값 (`price`) 이 있다 (브이 · 폴짝 · 만세 · 뒷짐 · 쪼그려 앉기 …).
  - 문어와 함께 찍는 모션 4개쯤 (나란히 서기 · 같이 앉기 · 하이파이브 · 등 맞대기) — 값이 있다.
  - **조개를 쓰는 단추는 반드시 확인 한 번** ("브이 · 조개 8 — 살까?" `살래` / `그만`). 한 번의 톡으로 조개가 나가면 안 된다 (주인 11-18).
  - 사고 나면 `user.poses[id] = 날짜`. 값 치르기는 `host.spend(n) → true|false` 가 한다 (모자라면 흔들림 + 조개 그림과 모자란 수).
- **문어와 사진 — 정직 규칙**: 사진 모드에서 문어에게 모션을 시키는 것은 **사람이 시킨 인형 놀이** 다 (바탕 설계 §1).
  그래서 ① 문어가 같이 찍힌 사진에는 틀과 상관없이 작은 픽셀 표시 '포즈 놀이' 가 **늘** 들어간다 (끌 수 없다)
  ② 기록에는 `by: 'user'` ③ 문어 얼굴은 평소 얼굴 (host 몫) ④ 문어가 지금 그 장소에 없으면 부르는 단추 대신 "지금은 여기 없어" 한 줄 —
  `host.octopusHere()` 가 거짓이면 함께 모션은 고를 수 없다. 코드가 문어의 기분 · 말을 사진 글에 넣지 않는다.
- **저장 · 공유**: 미리보기에 `저장` (a[download]) · `공유` (`navigator.canShare({ files })` 가 참일 때만 보임, 탭 핸들러 안에서 await 없이 `navigator.share`).
  둘 다 안 되면 사진을 img 로 띄우고 "길게 눌러 저장" 한 줄. 서버로 올리지 않는다. 공유에 보상 없음.
- **사진첩**: 찍은 사진은 아트 해상도 PNG (작다) 로 IndexedDB `ppolppol_photos` 에. 최근 순 격자, 하나씩 지우기 (확인 한 번), 저절로 지우지 않는다.
  IndexedDB 가 안 되면 사진첩 없이 저장 · 공유만 (조용히).
  사진을 방의 액자에 걸 수 있게 `PHOTO.get(id) → canvas` 를 내놓는다 (거는 일은 리드 · 갈래 D).

## API (전역 `PHOTO`, `js/next/photo.js`)

```
PHOTO.POSES            [{ id, name, icon, price, withOctopus }]      PHOTO.CATALOG = 같은 것
PHOTO.FRAMES           [{ id, name }]
PHOTO.compose(canvas, { frame, line, playMark, scale }) → canvas      순수에 가까운 합성 (node 에서는 건너뛰어도 됨)
PHOTO.buy(user, id, day) → { ok, cost }                               순수: 이미 있으면 ok · cost 0
PHOTO.open({ parent, user, host, onChange, onClose })                 사진 모드 띠
PHOTO.album({ parent, onClose })                                      사진첩 창
PHOTO.list() / PHOTO.get(id) / PHOTO.remove(id)                       Promise
host = { capture() → canvas, info() → { day, place, weather }, hideUi(bool), setPose(id|null), octopusHere() → bool, spend(n) → bool }
```

## 파일

`js/next/photo.js` · `css/next/photo.css` · `next/photo.html` · `assets/next/photo/` (모션 그림 · 틀 · 셔터 · '포즈 놀이' 표시) ·
`tools/next/make-photo-art.js` · `tools/next/test-photo.js` · `tools/next/test-photo-live.js` · `docs/next/photo.md`

## 끝난 것으로 보는 조건

- node 시험: `buy` 가 값 없는 3개는 cost 0 · 두 번 사도 한 번 값 · `POSES` id 유일 · 함께 모션은 `withOctopus` · 화면 글 목록에 감정 낱말 0건.
- 화면 시험 (가짜 host): 셔터 → 미리보기 PNG 의 가로가 아트 폭의 정수 배 · 문어가 찍힌 사진에 '포즈 놀이' 픽셀이 있음 (틀 없음일 때도) ·
  사기 단추를 한 번 눌러서는 `host.spend` 가 안 불림 (확인 뒤에만) · `canShare` 가 없는 환경에서 공유 단추가 안 보임 · 사진첩에 넣고 새로고침 뒤 남아 있음 · 지우기.
- 360×740 · 320×568 에서 띠가 캔버스를 가리지 않고 가로 스크롤 없음. 스크린샷 ≤ 8.

## 리드가 이을 것

`host` 여섯 함수를 장면 · 앱에 구현 (렌더 타깃 읽기 · UI 숨기기 · 포즈 · 조개 치르기) · 카메라 단추 · 사진첩 들어가는 곳 · 액자 가구.
