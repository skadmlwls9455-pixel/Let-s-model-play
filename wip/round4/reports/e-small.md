# 갈래 E (small) 보고서 — lane/e-small

## 결론

다섯 가지를 다 했다 (차례대로, 하나씩 커밋). 재봉틀은 진짜 손가락 첫 톡에 열리고 열린 채 남으며 그 톡이 염료 칩을 누르지 않는다 (원인: 장면 톡 뒤 브라우저가 같은 손가락의 click 을 한 번 더 보냄 — 장면에서 삼킨다). 재봉틀 시트는 360x740 에서 화면의 0.46 (세트 도감 접힘). 놀이방 조리대를 톡 하면 게임 안에서 화면 가득 부엌이 열리고, 닫으면 놀이방 그대로. 로딩 동안 벡터 문어 대신 게임 3D 문어 옆모습이 가운데를 기어간다. 생각 풍선은 작은 둥근 네모 + 점 둘. 홈 화면에 둘 수 있다 (설치 오류 0).

시험: `npm test` 통과 · 스모크 Z · Y · Q · X 모두 통과, R · J 각각 1개 실패 (R 은 바탕 커밋 5bb3db8 에서도 똑같이 실패 — 원래 있던 것, J 는 부하 때 시간 어긋남: 혼자 다시 돌리면 42/0) · test-cook-live 304/0 · test-play 178/0 · intro-shots 통과 (부하 때 한 번 시간 초과, 다시 돌려 통과) · test-export 47/0 · --crawl 23/0 · 글꼴 stale 없음 · 설치 오류 0. 독립 검사 (새 서브에이전트, 실제 터치로 360x740 · 320x568 · 412x915): must · should 결함 없음.

## 커밋

1. `재봉틀: 장면 톡 뒤따르는 진짜 click 삼키기 · 관성 중 단추 톡 · 시트 작게 (세트 도감 접기)`
2. `놀이방 조리대 톡 → 게임 안에서 바로 부엌`
3. `로딩 화면: 벡터 문어 대신 게임 3D 문어가 가운데를 기어가는 그림`
4. `생각 풍선: 구름 테 대신 작은 둥근 네모 · 꼬리는 둥근 점 둘`
5. `홈 화면에 두기 (PWA): 목록 · 게임 문어 아이콘 · 파비콘 · 메타`
6. 검사 · 보고서 (스모크에 로딩 문어 검사, 이 파일)

## 바꾼 것 (파일 · 함수 · 무엇 · 왜)

### 1. 재봉틀
- `js/scene3d.js` — `spotTap` 바로 아래 새 `tapGuard` · `guardTapClick(x, y)` 와 window 캡처 리스너 둘 (`pointerdown` → 막 풀기, `click` → 삼키기). `pointerEnd` 의 톡 갈래 맨 앞에서 톡이 무언가를 하면 (문어 · 창 · 포스터 · 기념품 · 단추 · 소파) 막을 건다: 800 ms 안 · 30 px 안 · `isTrusted` 인 click 하나만 `preventDefault` + `stopImmediatePropagation`. `el.click()` 같은 합성 click 은 그대로 통과. 다음 `pointerdown` 이 오면 풀린다.
  왜: 장면이 `pointerup` 에서 단추를 눌러 시트가 동기로 열리면, 브라우저가 같은 손가락의 click 을 그 자리에 다시 보낸다 — 시트 밖이면 백드롭 click 으로 닫히고 (첫 톡에 안 열림), 안이면 그 자리의 칩을 누른다 (재현: 고치기 전 시트 안 톡에서 '조개가 3개 모자라…', 시트를 작게 한 뒤엔 늘 닫힘).
- `js/scene3d.js` `pointerdown` — `caught` 줄 다음 한 줄: 관성 중 누름이라도 고른 것이 단추 (`spot`) 면 톡으로 친다 (관성은 그대로 멈춘다). 문어 · 가구 꾹 누르기는 예전 그대로.
- `index.html` 재봉틀 시트: 제목 '재봉틀' · 클래스 `sew-sheet`.
- `js/app.js` `renderSets` — 세트 도감을 `<details class="sew-sets">` (요약 '세트 도감 n/9') 안으로. `sewSetsOpen` 으로 다시 그려도 펼친 채 (다시 입기 · 염료). `openSew` 는 늘 접힌 채로 연다. `renderSew` — 한 줄 설명, '원래 색으로' 는 작은 단추.
- `css/style.css` `.sew-sheet` 묶음 — 픽셀 글꼴은 게임의 또렷한 크기만: 제목 Galmuri11 20/30, 본문 · 칩 · 값 Galmuri7 16, 요약 Galmuri11 20. 칩은 3×2, 색 점 + 이름 한 줄 · 값 아래 (높이 48, 44 이상). 여는 움직임은 다른 시트와 같은 `sheet-in`.

### 2. 조리대 → 부엌
- `js/scene3d.js` — 단추 칸 `counter` (SPOT_KEYS · `spotInfo` 는 `PROOM.counterBox` 의 화면 상자, 오락기와 같은 규칙 · `pick` 의 놀이방 목록).
- `index.html` — `#btn-cook` (`aria-label` '부엌', `scene-spot`) · `<dialog id="cook-overlay">`.
- `js/app.js` — `ROOM_SPOT.counter = 'btn-cook'`, `resetRoomUI` 숨김 목록, `bindRooms` 의 `on('btn-cook')`, 새 `openCook` · `cookMsg`: 처음 열 때 iframe `cook.html?embed=1` 을 만들고, 다시 열면 같은 iframe 에 `{ ppolCook: 'open' }`. 덮개가 이쪽 Esc 로 닫히면 부엌에도 'close' (냄비 저장 · 조용히). 메시지는 그 iframe 의 창에서 온 것만, 원점은 같은 원점 (file:// 은 'null').
- `cook.html` — `?embed=1` 이고 부모 창이 있으면: `html.ck-embed` (문 · '만든 것들' 링크 숨김), 부엌의 `onClose` 에 부모로 'close', 부모의 'open' · 'close' 를 받는다, 열면 'ready'.
- `css/style.css` 끝 — `dialog.cook-overlay` 화면 가득 (테두리 · 여는 움직임 없음, 바탕은 부엌 벽색).

### 3. 로딩 문어
- `js/scene3d.js` — 새 `walkPortrait(위상, o)` (개발 도구 전용, API 에 노출): 걷기 공식 그대로 다리 (내딛는 쪽 들림 · 앞뒤 쓸기) · 걸음 중간 +1px 를 놓고 초상 렌더 길 (`renderPortrait` 에 네 번째 인자 `pw` — 몸 돌림 · 프레이밍만 바꾼다, 없으면 예전 그대로) 로 몸 전체를 찍는다. 다리 자세는 되돌린다.
- `tools/make-loading-oct.js` (새) — 게임을 열고 8칸 (걸음 둘) 을 찍어 공통 상자로 잘라 `assets/ui/loading_oct.png` (56×39 칸 × 8, 투명, 알파 0/255) · `assets/manifest.json` 의 `ui.loading.oct` 한 키.
- `index.html` 머리 — `<style>` 한 덩이 + `<body>` 첫 줄 `#boot`: 장면 허공색 `#090a14` 위 가운데 줄에 2× (112×78) 로 `steps(8)` 걷기 0.8 s + 왼쪽→오른쪽 건너기 5.6 s. 입장 레이어 (z 80) 아래 (z 79). 동작 줄이기 (`prefers-reduced-motion`) 면 가운데 멈춘 한 칸. `html:not(.booted) #oct-svg` 숨김 (벡터 문어가 절대 안 비치게). 앱이 끝내 안 서면 load 뒤 12 s 에 스스로 걷힌다.
- `js/app.js` `boot` — 장면이 두 프레임 그린 뒤 (이미 있던 `PORT.ready` 자리) `html.booted`.

### 4. 생각 풍선
- `tools/ui-art/sprites.js` `ui.bubble.think` — 16×16 둥근 네모 (모서리 2-1-1 계단, 1px 선은 말풍선보다 한 단 옅은 남색 `#253a5e`, 종이흰, 아랫줄 옅은 그늘, 울퉁불퉁 · 가시 없음). `ui.tail.think` — 둥근 점 둘 (위 4칸 · 아래 2칸), 풍선 선에서 떨어져 있다.
- `tools/make-ui-art.js` — FRAMES 크기를 그림 줄 길이로 (16 이면 슬라이스 6, 그 밖 24 · 8 그대로). 다시 구운 결과 바뀐 파일은 `bubble_think.png` · `tail_think.png` · manifest 두 키뿐.
- `css/ui-art.css` — 생각 풍선 테 12px (`6 fill / 12px`) · 여백 0 2px · 꼬리 끝 높이는 말풍선과 같게 (`bottom` 4px 위로) · 점은 풍선 아래 1칸 띄워서.

### 5. PWA
- `manifest.webmanifest` (새, 맨 위) — name · short_name '뽈뽈 문어', `lang` ko, `start_url` './', `scope` './', standalone, portrait, 바탕 `#090a14`, 테마 `#10141f`, 아이콘 192 · 512 · maskable 512.
- `tools/make-app-icons.js` (새) — `walkPortrait(0, { yaw: 0, still: true })` (정면 · 서 있는 몸) 로 `assets/icons/app/` 의 icon-192 · icon-512 · icon-512-maskable (가운데 340 안) · apple-touch-icon 180 · favicon-32 · favicon-16 을 굽는다. 큰 것은 64 칸 한 장을 정수 배 최근접 (×3 · ×8 · ×6 · ×3), 파비콘은 같은 렌더러로 문어를 작게 찍어 1× (줄이면 선이 뭉개진다). 바탕 Apollo 남색 `#172038`. `walkPortrait` 에 `still` 하나 더함.
- `index.html` 머리 — `<link rel="manifest">`, 아이콘 32 · 16, `apple-touch-icon`, `mobile-web-app-capable` · `apple-mobile-web-app-capable` · 상태 줄 `black-translucent` · 앱 이름.
- `tools/export-site.js` TAKE 한 줄 (`manifest.webmanifest`). `vercel.json` headers 에 `/manifest.webmanifest` Content-Type `application/manifest+json`. `tools/test-export.js` — b 의 '실린 종류' 에 그 파일 하나 · c 에서 목록을 읽어 아이콘이 다 있는지 (그래서 아이콘이 '아무도 안 쓰는 파일' 이 아니다).

## 결정 (지시문이 남긴 선택)

- 클릭 막: 장면이 톡으로 무언가를 한 모든 경우 (단추 · 문어 · 창 · 포스터 · 기념품 · 소파) 에 건다 — 빈 바닥 톡에는 안 건다. 800 ms · 30 px · 다음 pointerdown 에 풀림 (지시문 수치 그대로).
- 미용실의 예전 따로 막 (`salonOpeningTap`, `closedby` 'closerequest') 은 그대로 둔다 (고치지 않은 것 · 겹쳐도 해가 없다).
- 재봉틀 칩은 3×2. 세트 도감은 시트를 새로 열 때마다 접힌다 (열어 둔 채 다시 그리기만 펼친 채).
- '원래 색으로 (공짜)' → '원래 색으로' (지시문의 '짧게'). 비용 없음은 그대로.
- 부엌 저장 열쇠: cook.html 따로 열기와 같은 `ppolppol_cook_v0` (게임에 이을 때의 `ppolppol_cook` 으로 옮기지 않았다 — 가장 단순, 따로 열던 부엌의 냄비 · 수첩이 그대로 이어진다). 이번 주 할 일 'kitchen' ('놀이방 들르기') 은 놀이방이 보일 때 세므로 덮개와 상관없이 그대로 센다.
- 부엌 안 '만든 것들' 링크는 덮개 안에선 숨긴다 (iframe 안에서 다른 쪽으로 가면 돌아올 길이 없다 · 게임 설정 맨 아래에 같은 링크가 있다).
- 안드로이드 뒤로: 앱에 뒤로 처리가 없다. 크롬은 맨 위 모달 대화상자를 뒤로 제스처로 닫으므로 (부엌의 dialog → 닫힘 → 'close') 따로 넣지 않았다 — 기기에서는 확인 못 함.
- 로딩 문어 칸: 56×39 (지시문의 48~64 보다 조금 낮다 — 초상 렌더 길이 64×64 한 장이라 옆으로 벌린 다리가 잘리지 않게 넓게 찍었다). 화면엔 2× 로.
- 로딩 문어가 걷히는 때: 3D 든 2D 든 앱의 `boot` 가 두 프레임 뒤. 입장 연출은 그 위 (z 80) 에서 그대로 덮는다.
- 생각 풍선 선 색: 말풍선 (`#172038`) 보다 한 단 옅은 `#253a5e` — 말과 생각을 테두리 모양 대신 색과 꼬리로 가른다.
- PWA: `start_url` './' (주소 꼬리 없이 — 가장 단순). 서비스 워커는 넣지 않았다: 자주 배포하는 게임에서 옛 판에 갇힐 길을 아예 만들지 않으려고. 설치 가능 조건 (크롬) 은 워커 없이도 만족했다.

## 플레이어가 보는 글 (전 → 후)

- 재봉틀 시트 제목: '옷방 재봉틀' → '재봉틀'
- 설명: '기른 염료가 있으면 그걸 하나 쓰고, 없으면 조개 6개로 물들여. 지금 입은 옷의 큰 색이 바뀌어.' → '염료나 조개 6개로 옷을 물들여'
- 단추: '원래 색으로 (공짜)' → '원래 색으로'
- '세트 도감 n/9': 제목 (h3) → 접는 요약 (summary), 글 그대로
- 새: 조리대 단추 이름 '부엌' (화면 낭독기 · title), 부엌 덮개 이름 '부엌', 홈 화면 앱 이름 '뽈뽈 문어'
- 글꼴 확인: `python3 tools/subset-fonts.py --check` → stale: none

## 더한 검사

- `tools/smoke.js` 새 시나리오 `scenarioSceneTap` (글자 Z 에 함께 돈다, 'Z2'):
  - 로딩 문어: 정적 HTML 첫 줄 `#boot` · 벡터 문어 숨김 규칙 · 그림 · 게임이 서면 `html.booted` 로 걷힘
  - 진짜 손가락 (`touchscreen.tap`) 으로 재봉틀 두 자리 톡 → 열린 채 (900 ms 뒤에도) · 칩 알림 없음 · 조개 · 옷 색 그대로 · 시트 높이 ≤ 화면 반 · 제목 '재봉틀' · 세트 도감 접힘
  - 관성 중 톡: 페이지 안 합성 PointerEvent 로 8 ms 간격 밀기 (느린 기계에선 CDP 손가락 사이가 수백 ms 라 관성이 안 생긴다) → `pan().mode === 'coast'` 인 채로 재봉틀 톡 → 열림
  - 조리대: 단추 44px 이상 · '부엌' · 진짜 손가락 톡 → 덮개 · iframe 부엌 열림 (embed · 문 숨김) · 부엌의 닫기 → 덮개 닫힘 · 장면 'play' · 밀기 그대로 · 포커스 `btn-cook` · 다시 열고 Esc → 둘 다 닫힘
- 고친 검사 (지키는 것은 그대로): 세트 도감을 읽던 `#sew-body h3` → `details.sew-sets > summary`; 320 px 44px 누르는 곳 · 키보드 자리 검사는 접힌 도감을 펼친 뒤 잰다.
- `tools/test-export.js`: `manifest.webmanifest` 가 실리고 읽히며 아이콘이 다 있다.
- 탐침 (`wip/round4/probes-e/`): sew-tap · sew-shot · coast-tap(2) · cook · boot (느린 로드) · think · pwa (설치 오류).

## 돌린 시험

- `npm test` — 통과 (exit 0, 끝 묶음 test-export 47 passed 0 failed; 앞 묶음들 547/0 · 26/0 · 568/0 · 225/0 · 192/0 · 235/0)
- `python3 tools/subset-fonts.py --check` — stale: none
- `SMOKE_ONLY=Z,Y,Q,X,R,J node tools/smoke.js` — 358 passed, 2 failed (다른 시험과 함께 돌린 부하 큰 판). 실패 둘:
  - R '게임 오버: 최고 기록 표시 · "또 할래?" 에 포커스' (포커스가 `rn-cv`) — 바탕 커밋 5bb3db8 에서 R 만 돌려도 똑같이 실패 (13/1). 내 변경 전부터. 달리기는 갈래 C 영역이라 건드리지 않았다.
  - J '산책은 놀이방에서도 그대로' — 부하로 산책이 놀이방 들어가기 전에 끝나 버린 것 (w0.running false). 다른 시험 없이 J 만 다시: 42 passed, 0 failed.
- 새 Z2 (장면 톡 · 조리대 · 로딩 문어) 는 모두 통과. 첫 Z 단독 판도 74/0.
- `node tools/test-cook-live.js` — 304 passed, 0 failed (부엌 따로 열기 그대로)
- `node tools/test-play.js` — 178 passed, 0 failed
- `node tools/intro-shots.js` — 부하 판에서 '#intro title' 기다리다 시간 초과 한 번, 혼자 다시 돌려 exit 0 (입장 증거 사진은 커밋하지 않고 되돌렸다)
- `node tools/test-export.js` — 47/0 · `--crawl` — 23/0
- PWA: 내보낸 묶음을 127.0.0.1 에 띄워 `Page.getInstallabilityErrors` = [] · 목록 오류 [] · 4xx 0 (`wip/round4/probes-e/pwa.js`)
- 독립 검사 한 번 (서브에이전트, 실제 터치, 360x740 · 320x568 · 412x915): must · should 없음. 재봉틀 여러 자리 · 느린 누름 · 관성 중 톡 · 접기 · 다시 입기, 부엌 닫기 · Esc 두 갈래 · 다시 열기 · 한 접시 (저장은 부엌 열쇠에만, `ppolppol_v2` 는 놀이방 들르기가 원래 바꾸는 것만) · 소리 요청 0, 느린 로드에서 벡터 문어 0 프레임 · 동작 줄이기 한 칸 · `?intro=1`, 생각 풍선 낮밤 · 두 글꼴 · 긴 글, PWA 아이콘 · maskable 안전 원.

## 스크린샷 (`wip/round4/shots/e-small/`, 360x740)

- `1-sew-before.png` · `2-sew-after.png` 재봉틀 시트 전 / 후
- `3-cook-overlay.png` 놀이방 위 부엌 덮개
- `4-loading-1.png` · `4-loading-2.png` · `4-loading-3.png` 로딩 문어 세 칸 (js 를 2.5 s 늦춘 로드)
- `5-think-day.png` · `5-think-night.png` 새 생각 풍선 (낮 · 밤, 진짜 게임)
- `6-pwa-icon-192.png` 앱 아이콘 192

## 내 영역 밖

- 없음에 가깝다. `js/scene3d.js` 는 지시문이 말한 자리만 (spotTap 옆 · caught 한 줄 · pointerEnd 톡 갈래 한 줄 · SPOT_KEYS / spotInfo / pick 의 counter · renderPortrait 인자 하나와 새 walkPortrait · API 한 줄). `js/app.js` 는 재봉틀 · 부엌 · boot 한 줄. `tools/test-export.js` · `tools/export-site.js` · `vercel.json` 은 PWA 에 필요한 몇 줄.

## 남긴 것 · 확인 못 한 것

- 안드로이드 뒤로 제스처는 앱 어디에도 처리가 없다 (다른 시트와 같다). 부엌도 따로 넣지 않았다 — 실제 폰에서 확인 못 함.
- 포스터 대화상자를 장면 톡으로 여는 것은 독립 검사에서 벽에 포스터를 못 붙여 직접은 못 봤다 (같은 길인 미용실 · 재봉틀 · 오락기는 확인).
- 미용실의 예전 따로 막 (`salonOpeningTap`) 은 이제 장면 막과 겹치지만 그대로 두었다 (지울지는 리드가).
- 로딩 문어 칸 높이 39 px (지시문 48~64 보다 낮음) — 초상 렌더 64×64 안에 벌린 다리까지 넣느라. 더 크게 하려면 `PORT.N` 과 다른 크기의 렌더 타깃이 필요하다.
- `tests/evidence/ui-art/sheet.png` (미리보기 시트) 는 다시 굽지 않았다 (`make-ui-art.js` 의 all 판 — 일러스트도 다시 구워 다른 그림 바이트가 바뀔 수 있어서).
- `docs/COOK_PROTO.md` · `docs/UI_ART.md` 에 embed 판 · 새 생각 풍선 설명을 더하지 않았다.
- R 의 원래 실패 ('또 할래?' 포커스) 는 갈래 C 영역이라 손대지 않았다.
- 실제 폰 · iOS 홈 화면 추가는 확인 못 함 (크롬 설치 조건만).
