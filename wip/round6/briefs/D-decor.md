# 갈래 D — 가구 · 벽지 표와 미리보기 (가지 `lane/6-decor` · 상한 35달러)

먼저 `wip/round6/briefs/COMMON.md` (5절의 가구 id 22개). 그다음 참고로: `js/scene3d.js` 의 소파 (`grep -n "var sofaM"` 둘레 20줄 — 가구 하나가 '상자 · 원기둥 조각 목록' 인 모양),
`mergeParts` · `box` · `M` (`grep -n "function mergeParts\|function box\|function M("`), 색 표 `RAMPS` · `FIXED` · `MAT` (`grep -n "var RAMPS\|var FIXED\|var W = PAL\|var MAT"`), 벽 · 바닥 조각 (`grep -n "벽 2면"` 둘레),
`js/app.js` 의 가구 아이콘 (`grep -n "FURN_ICON"` — 17×13 픽셀 격자), `js/palettes.js`, `docs/INTERIOR_MODE.md` 머리말.

## 주인 말 (11-18)

"옷장 말고도 뭔가 벽지라거나 … 기타 인테리어가 좀 자유로우면 좋을 거 같아."

## 무엇을 만드나

3D 장면 코드 (`js/scene3d.js`) 는 리드만 고친다. 너는 리드가 그대로 읽어 쓸 **자료 표** 와, 그 표를 눈으로 확인하는 **미리보기 쪽** 을 만든다.

### 1) 가구 표 `js/next/furniture.js` (전역 `FURNITURE`, node 에서도 require)

22개 (COMMON 의 id 그대로) 마다:

```
{ id, name, where: ['in'] | ['yard'] | ['yard', 'beach'] | ['in', 'yard'],   놓을 수 있는 곳 (COMMON 의 구역 낱말 + 실내 `in`). `bench` · `parasol` · `swim_ring` · `picnic_mat` 은 ['yard', 'beach'], `cushion` 은 ['in', 'yard']
  season: null | 'spring' | …,
  w, d, h,                      발자국 반폭 (m) 과 높이 — 실내 가구는 w·d 0.2~0.8, 높이 ≤ 1.6 (창 · 포스터를 가리지 않게)
  flat: true|false,             납작 (깔개 · 방석 · 돗자리 — 밟고 지나간다)
  parts: [ { s: 'box'|'cyl'|'sph'|'cone', size: […], at: [x, y, z], rot: [rx, ry, rz], scale: [sx, sy, sz], c: '색 이름' , dye: true } … ],
  glow: [ { at, r } ],          불빛이 나는 자리 (스탠드 등 · 모닥불 · 난로) — 점광을 새로 켜지 않는다. 발광 조각 자리만 적는다
  use: [dx, dz],                사람 · 손님이 그 가구에 와서 서는 발치
  icon: [ '17칸 글자열' × 13 ]  가구 줄 그림 (FURN_ICON 과 같은 꼴: 글자 = 색 열쇠, '.' = 빔) }
```

- 조각 수는 가구 하나에 8~20. 치수는 m, 가구 가운데 바닥이 원점. 소파 (0.8 × 1.36 × 0.66) 와 내 캐릭터 (키 1.22) 에 견줘 크기를 잡는다.
- 색은 **색 이름** 으로: 램프 이름 + 0부터의 칸 번호 (`wood3` = `PAL.wood[3]` — `js/scene3d.js` 의 `var RAMPS` · `var FIXED`, `grep -n "var RAMPS\|var FIXED\|var W = PAL\|var MAT"`).
  허용 목록: `wood0~7` · `paper0~3` · `amber0~5` · `navy0~5` · `moss0~3` · `slate0~5` · `sky0~3` · `dusk0~3` · `glass0~3` · `rose0~2` · `ink` · `white` · `night`
  (칸 수는 그 파일에서 다시 세어 맞춘다 — 시험이 이 목록 밖의 이름을 잡게 한다). 천 부분 (방석 · 파라솔 천 · 돗자리) 에는 `dye: true` — 나중에 염료로 물들인다.
- 픽셀 장면에서 읽히는 모양: 덩어리를 크게, 3cm 보다 가는 것은 1px 선이 된다 (0.045m 근처로). 납작한 것은 바닥과 색 대비로만 읽힌다.

### 2) 벽지 · 바닥 프리셋 `FURNITURE.SKINS`

벽 6 · 바닥 6. 하나마다 `{ id, name, a, b, seam }` (판자 두 톤 + 이음 색, `#rrggbb`).
지금 값 (`MAT.wallA/B` · `floorA/B`) 을 첫째 프리셋으로. 나머지는 **Apollo 팔레트에서 서로 다른 칸에 앉는 색** 으로 —
`js/palettes.js` 의 색 목록을 읽어, 후보의 a · b 가 OKLab 거리로 가장 가까운 팔레트 칸이 서로 다르고 지금 가구색 (소파 주황 · 나무) 과도 다른지 node 로 계산해 표에 적는다
(실제 화면은 빛을 받은 뒤 스냅되므로 리드가 장면에서 다시 본다 — 너는 계산 근거를 문서에 남긴다). 너무 어두운 벽은 빼라 (주인이 저녁이 어둡다고 한 적이 있다).

### 3) 미리보기 `next/decor.html`

`../vendor/three.min.js` (r128) 를 읽어, 게임과 같은 구도 (직교 카메라 · 요 45° · 틸트 32°) 로 가구 22개를 격자에 늘어놓고, 벽 · 바닥 프리셋을 바꿔 보는 쪽.
조각 목록 → 메시로 바꾸는 작은 함수 (`FURNITURE.build(THREE, def, colorOf)`) 를 만들어 미리보기와 리드가 같이 쓰게 한다.
낮은 해상도 렌더 타깃 (27px/m) 에 그려 정수 배로 확대하면 게임의 픽셀 느낌에 가깝다 (외곽선 · 팔레트 스냅 · 디더까지 흉내 낼 필요는 없다).
가구 줄 아이콘 22개도 한 줄로 보여 준다.

## 파일

`js/next/furniture.js` · `css/next/decor.css` · `next/decor.html` · `tools/next/test-decor.js` · `tools/next/test-decor-live.js` · `docs/next/decor.md`

## 끝난 것으로 보는 조건

- node 시험: id 가 COMMON 의 22개와 정확히 같음 · 계절 꾸밈 8개의 `season` 이 맞음 · `bench` · `parasol` · `swim_ring` · `picnic_mat` 의 `where` 에 beach · 모든 조각이 발자국 (w · d · h) 안 (여유 2cm) · 조각 수 8~20 ·
  색 이름이 허용 목록 안 · 아이콘이 17×13 · `flat` 인 것의 높이 ≤ 0.2 · 프리셋 12개의 a ≠ b 팔레트 칸 · `build` 가 가짜 THREE 로도 던지지 않음.
- 미리보기 스크린샷 ≤ 8 (360×740 @2): 실내 8 · 마당 6 · 계절 8 · 벽지 바꿈 2 · 아이콘 줄. **네가 직접 보고** 무엇인지 한눈에 읽히지 않는 가구는 고친다.

- 놀이방 식탁 · 2인 소파 · 다락 소파는 만들지 않는다 (22개에 없다 — 식탁과 2인 소파는 다른 세션이 놀이방에 만드는 중).

## 리드가 이을 것

`scene3d.js` 에 `buildFurn(def)` (네 `FURNITURE.build` 를 불러 `FURN` 에 등록) · 벽 · 바닥 조각에 tag 달고 `setSkin` · 가구 모드 줄에 새 가구와 서랍 · 저장 칸.

## 덧붙임 — 독립 점검에서 나온 것 (위 글과 어긋나면 이 절이 이긴다)

- `FURNITURE.build(THREE, def, colorOf)` 는 **본 게임의 `mergeParts` 에 그대로 넣을 조각 배열** `[{ g: BufferGeometry, m: Matrix4, c: '#rrggbb', tag }]` 을 돌려준다 (`m` 은 `js/scene3d.js` 의 `M(…)` 과 같은 차례 — 위치 · 회전 · 배율, `dye: true` 조각은 tag 1 · 나머지 0).
  조각마다 Mesh 를 단 Group 을 돌려주지 않는다 — 본 게임은 가구 하나 = 정점색 한 덩어리 = 드로우콜 1 이고 예산이 150 이다. 합치는 일은 미리보기가 `FURNITURE.merge(THREE, parts)` 로 하고 리드는 자기 `mergeParts` 를 쓴다.
  시험: build 결과의 모든 항목에 g · m · c 가 있고 c 가 `#rrggbb` · 미리보기에서 가구 하나 = 드로우콜 1.
- 미리보기의 `colorOf` (색 이름 → 색) 는 `js/scene3d.js` 의 `RAMPS` 표와 그 위의 OKLab 램프 식을 옮겨 적어 계산한다 (`scene3d.js` 를 싣지 않는다).
- 표에 두 칸을 더한다: `perch: [x, y, z]` — 작은 손님이 올라앉는 자리 (`birdbath` · `feeder` · `bench` · `picnic_mat` · `pond` · `haybale` · `snowman` · `scarecrow` 는 반드시) · `slots: [[x, y, z] …]` — `showcase` 의 진열 칸 6개. 액자는 이번에 만들지 않는다.
- 아이콘 색: `FURNITURE.ICON_PAL = { 글자: '#rrggbb' }` 를 따로 낸다 — `js/app.js` 의 `FURN_ICON.pal` 글자 뜻은 그대로 두고, 없는 색 (연못 · 화분 · 눈) 은 새 글자로.
- 벽지 · 바닥 프리셋 12개는 전부 처음부터 고를 수 있다 (값 · 잠금 없음) 고 문서에 적는다.
- `CATALOG` 는 내지 않는다 — 가구 목록은 `FURNITURE.ITEMS` (22개) 하나.
- 고쳐 찍기는 **두 바퀴까지** (처음 한 번 + 고친 뒤 한 번). 그 뒤에도 안 읽히는 가구는 id 와 까닭을 보고서 '못 한 것' 에 적고 넘어간다.
- 미리보기는 WebGL 이다 — 화면 시험은 `tools/look-shots.js` 와 같은 인자로 크로미움을 띄운다 (`--use-gl=swiftshader` · `--enable-webgl` · `--ignore-gpu-blocklist`). 그래도 캔버스가 비면 아이콘 줄 · 색 계산 표만 찍고 보고서 '확인 못 한 것' 에 적는다.
