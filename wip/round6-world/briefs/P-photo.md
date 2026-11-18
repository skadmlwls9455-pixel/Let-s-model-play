# 갈래 P — 사진 (가지 `lane/6-photo` · 상한 40달러)

먼저 `wip/round6-world/briefs/COMMON.md`. 그다음 **`docs/PHOTO_AND_FURNITURE.md` 의 §1 · §2 · §5 가 이 갈래의 바탕 설계** 다 (주인 11-05 요청으로 쓴 것 — §3 · §4 는 소파 · 같이 앉기라 읽지 않는다).
**이 지시문과 어긋나면 이 지시문이 이긴다.** 바탕 설계에서 그대로 가져오는 것: §1.4 문어 상태 표 · §1.7 공유 차례 · §2.1 규칙 표 · §5.
이번에 만들지 않는 것: 문어 혼자 하는 포즈와 그 값 · 필터 · 비율 칩 · 격자 · 구도 프리셋 · 액자 7종 · 셀프 타이머 · GIF · 소리 · 진동 · 요정 쪽지 · `S.photo` 저장 (§6.4)
(나중에 문어 혼자 포즈를 더할 수 있게 `POSES` 에 `who: 'me' | 'both'` 칸을 둔다 — `'octopus'` 는 자리만). 참고: `js/app.js` 의 포스터 PNG 내보내기 (`grep -n "toBlob\|exportPng\|download"`),
`js/scene3d.js` 의 초상 (`grep -n "function portrait\|playerShot\|readRenderTargetPixels"`) — 장면을 작은 타깃에 그려 읽는 선례.

## 주인 말

- (11-05) "카메라 기능도 넣어서 xy축 돌려가면서 딱 사진 찍구 공유해도 좋을 거 같음"
- (11-18) "맵들 돌아다니면서 문어랑 사진 찍기 기능은 꼭 있으면 좋겠네. 모션 조개로 사서 문어랑 사진 찍을 수 있는 거야."

## 무엇을 만드나

**사진 모드의 화면 · 합성 · 저장 · 공유 · 사진첩 · 모션 가게.** 3D 장면을 찍는 일 (렌더 타깃 읽기) 과 캐릭터가 실제로 포즈를 취하는 일은 리드가
`js/scene3d.js` 에 넣는다 — 너는 **약속된 함수 모양 (아래 `host`)** 에 맞춰 만들고, 시험용 쪽에서는 가짜 host (미리 그려 둔 픽셀 장면 캔버스) 로 돌린다.

- **사진 모드**: 카메라 단추 → 다른 UI 가 숨고 (host 가 숨긴다) 셔터 · 틀 · 모션 · 닫기만 남는다. 세계는 멈추지 않는다.
  다만 상태 줄의 **'데모' 꼬리표는 host 가 숨기지 않는다** (규칙이 움직이는 문어가 꼬리표 없이 보이면 안 된다 — `docs/next/photo.md` 의 '리드가 이을 것' 에 적는다).
  방 돌리기 · 밀기 · 줌은 본 게임의 손짓 그대로 (네 UI 는 캔버스를 가리지 않는 아래 띠).
- **셔터**: `host.capture()` 가 준 아트 해상도 캔버스를 **정수 배 최근접 확대** (긴 변 1080px 근처, `imageSmoothingEnabled = false`) → 틀을 합성 → PNG.
  합성에 들어가는 그림 (틀 · '포즈 놀이' 표시 · 가짜 host 의 장면) 은 **PNG 파일을 그리지 말고 js 안의 픽셀 표나 코드로 직접 찍는다** — `file://` 에서는 파일 그림을 그린 캔버스가
  오염돼 내보내기가 막힌다. PNG 자산은 단추 · 가게 그림 (`<img>`) 에만 쓴다.
- **틀**: 없음 / 흰 테 + 아래 한 줄 (날짜 · 장소 이름 · 날씨 — 사실만, host 가 준다) / 필름 띠. 자유 글 · 이름 입력 없음.
- **모션 (포즈) 가게** — 주인 11-18: 모션은 조개로 산다.
  - 내 캐릭터 모션 10개쯤: 처음부터 3개 (서기 · 손 흔들기 · 앉기), 나머지는 조개 값 (`price`) 이 있다 (브이 · 폴짝 · 만세 · 뒷짐 · 쪼그려 앉기 …).
  - 문어와 함께 찍는 모션 4개쯤 (나란히 서기 · 같이 앉기 · 하이파이브 · 등 맞대기) — 값이 있다.
  - **조개를 쓰는 단추는 반드시 확인 한 번** ("브이 · [조개 그림] 8 — 살까?" `살래` / `그만`). 한 번의 톡으로 조개가 나가면 안 된다 (주인 11-18).
  - 사고 나면 `user.poses[id] = 날짜`. 값 치르기는 `host.spend(n) → true|false` 가 한다 (모자라면 흔들림 + 조개 그림과 모자란 수).
- **문어와 사진 — 정직 규칙**: 사진 모드에서 문어에게 모션을 시키는 것은 **사람이 시킨 인형 놀이** 다 (바탕 설계 §1).
  그래서 ① **함께 모션 (`who: 'both'`) 을 켠 채 찍은 사진** 에는 틀과 상관없이 작은 픽셀 표시 '포즈 놀이' 가 **늘** 들어간다 (끌 수 없다).
  함께 모션 없이 찍힌 문어에는 넣지 않는다 (그건 문어가 스스로 하던 일이다 — 사람이 시켰다는 딱지를 붙이면 반대 방향의 거짓이다). 기록은 그때 `pose: null`
  ② 기록에는 `by: 'user'` ③ 문어 얼굴은 평소 얼굴 (host 몫)
  ④ 함께 모션은 `host.octopus().state` 가 `'ok'` 일 때만 고를 수 있다. 아니면 host 가 준 `line` 한 줄만 그린다 — **문어에 대한 글은 네가 짓지 않는다**
  (가짜 host 의 글: away '지금은 여기 없어' · asleep '자는 중엔 포즈 놀이 안 해' · busy '하던 게 끝나면 돼' · asking '물어보는 중' · no '이번엔 안 한대')
  ⑤ 함께 모션이 켜져 있는 동안 네 띠에 **'포즈 놀이 · 내가 고름'** 글이 늘 보인다 (끌 수 없다, 320 폭에서도 잘리지 않는다) — 화면 캡처 · 녹화로도 사람이 시킨 것임이 읽히게.
  코드가 문어의 기분 · 말을 사진 글에 넣지 않는다.
- **저장 · 공유**: 미리보기에 `저장` (a[download]) · `공유` (`navigator.canShare({ files })` 가 참일 때만 보임, 탭 핸들러 안에서 await 없이 `navigator.share`).
  둘 다 안 되면 사진을 img 로 띄우고 "길게 눌러 저장" 한 줄. 서버로 올리지 않는다. 공유에 보상 없음.
- **사진첩**: 찍은 사진은 아트 해상도 PNG (작다) 로 IndexedDB 에 — 이름은 `opts.db` (시험용 쪽 기본 `ppolppol_next_photo`, 본 게임 이름은 리드가 넘긴다). 최근 순 격자, 하나씩 지우기 (확인 한 번), 저절로 지우지 않는다.
  IndexedDB 가 안 되면 사진첩 없이 저장 · 공유만 (조용히).
  사진을 방의 액자에 걸 수 있게 `PHOTO.get(id) → canvas` 를 내놓는다 (거는 일은 리드 · 갈래 D).

## API (전역 `PHOTO`, `js/next/photo.js`)

```
PHOTO.POSES            [{ id, name, icon, price, who: 'me' | 'both' }]   PHOTO.CATALOG = 같은 것 (id 는 `p_…`)
PHOTO.FRAMES           [{ id, name }]
PHOTO.compose(canvas, { frame, line, playMark, scale }) → canvas      순수에 가까운 합성 (node 에서는 건너뛰어도 됨)
PHOTO.buy(user, id, day) → { ok, cost }                               순수: 이미 있으면 ok · cost 0
PHOTO.open({ parent, user, host, db, onChange, onClose })             사진 모드 띠
PHOTO.album({ parent, db, onClose })                                  사진첩 창
PHOTO.list() / PHOTO.get(id) / PHOTO.remove(id)                       Promise
host = { capture() → canvas, info() → { day, place, weather }, hideUi(bool), setPose(id|null), spend(n) → bool,
         octopus() → { state: 'ok' | 'away' | 'asleep' | 'busy' | 'asking' | 'no', line } }
```

## 파일

`js/next/photo.js` · `css/next/photo.css` · `next/photo.html` · `assets/next/photo/` (모션 그림 · 틀 · 셔터 · '포즈 놀이' 표시) ·
`tools/next/make-photo-art.js` · `tools/next/test-photo.js` · `tools/next/test-photo-live.js` · `docs/next/photo.md`

## 끝난 것으로 보는 조건

- node 시험: `buy` 가 값 없는 3개는 cost 0 · 두 번 사도 한 번 값 · `POSES` id 유일 · 함께 모션은 `who: 'both'` · 화면 글 목록에 감정 낱말 0건.
- 화면 시험 (가짜 host): 셔터 → 미리보기 PNG 의 가로가 아트 폭의 정수 배 · 함께 모션을 켜고 찍은 사진에 '포즈 놀이' 픽셀이 있음 (틀 없음일 때도) · 켜지 않고 찍은 사진에는 없음 ·
  함께 모션을 고른 동안 띠에 '포즈 놀이 · 내가 고름' 이 보이고 끄면 사라짐 · `octopus().state` 가 'ok' 가 아니면 함께 모션이 안 골라지고 host 의 line 이 그대로 보임 ·
  사기 단추를 한 번 눌러서는 `host.spend` 가 안 불림 (확인 뒤에만) · `canShare` 가 없는 환경에서 공유 단추가 안 보임 · 사진첩에 넣고 새로고침 뒤 남아 있음 · 지우기.
- 360×740 · 320×568 에서 띠가 캔버스를 가리지 않고 가로 스크롤 없음. 스크린샷 ≤ 8.

## 리드가 이을 것

`host` 여섯 함수를 장면 · 앱에 구현 (렌더 타깃 읽기 · UI 숨기기 — '데모' 꼬리표는 남긴다 · 포즈 · 조개 치르기 · 문어 상태) · 카메라 단추 · 사진첩 들어가는 곳 · 액자 가구.
모델이 붙은 방에서 함께 모션 전에 문어에게 묻는 일 (바탕 설계 기본값: 들어갈 때 한 번) 은 주인 답을 받은 뒤 host 가 `'asking'` · `'no'` 로 잇는다.
사진과 모션 기록은 두뇌 입력과 MCP 상황에 넣지 않는다.

## 덧붙임 — 독립 점검에서 나온 것 (위 글과 어긋나면 이 절이 이긴다)

- **사진 모드 띠는 모달이 아니다.** 띠가 떠 있는 동안 장면이 손짓 (돌리기 · 밀기 · 줌) 을 받아야 한다 — `showModal()` 금지 (밖이 inert 가 된다). 그냥 요소이거나 `dialog.show()`.
  미리보기 · 사기 확인 · 사진첩만 모달 `<dialog>`.
- 본 게임의 장면은 화면을 다 쓴다 → 띠는 캔버스 아래쪽을 덮는다. host 를 `hideUi(on, { bottom: 띠가 덮는 높이 CSS px })` 로 부르고, `capture()` 는 **띠에 가리지 않은 부분만** 준다고 약속한다.
  시험용 쪽의 가짜 host 도 화면 가득 캔버스 위에 띠가 얹히는 꼴로 만든다. 시험: 띠가 떠 있는 동안 가짜 장면 캔버스를 끌면 가짜 장면이 한 칸 돈다 · 미리보기에 띠 밑에 깔려 있던 부분이 들어 있지 않다.
- '포즈 놀이' 표시는 **확대 전에 아트 해상도 그림에 먼저** 찍는다. 사진첩에는 표시가 찍힌 그림과 `{ day, place, weather, pose, who }` 를 같이 넣는다 → 사진첩에서 다시 꺼낸 함께 사진에도 표시 픽셀이 있다 (시험).
- 사기 차례: `PHOTO.buy(user, id, day)` — `user.shells < price` 면 `{ ok: false, cost, short }` 이고 아무것도 안 바꾼다. 넉넉하면 `user.poses[id] = day` 를 적고 `{ ok: true, cost }`.
  창은 확인 뒤 `buy` 가 ok 일 때만 `host.spend(cost)` 를 부르고, `false` 가 오면 `user.poses[id]` 를 지운다.
- `PHOTO.get(id)` 는 `Promise<canvas>` (한 가지로). 액자에 거는 일과 액자 가구는 리드 몫이다 (갈래 D 의 22개에는 액자가 없다).
- `host.info()` 의 `place` · `weather` 는 그대로 찍을 한국어 글 (host 가 만든다), `day` 는 `'YYYY-MM-DD'` (네가 '11월 18일' 로 바꾼다).
- 값 · 모자란 수의 조개 그림은 `assets/icons/souvenir/shell.png` (`<img>`). `PHOTO.open` · `PHOTO.album` 은 `opts.reduced` 도 받는다.
- 문어 상태가 `'no'` 일 때의 `line` 은 host 가 준 글을 글자 그대로 (모델이 쓴 말일 수 있다 — 고치거나 자르지 않는다).
