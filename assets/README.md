# assets/ — 뽈뽈 문어 에셋

여기 있는 SVG는 전부 **플레이스홀더**야. `node tools/make-placeholders.js` 가 만든 벡터 그림이고,
작성자가 블렌더로 렌더한 **픽셀아트 PNG** 로 **같은 픽셀 밀도(1x, 장면 캔버스 320×240)** 에 맞춰 파일만 바꾸면 된다.
자세한 교체 절차·블렌더 렌더 설정은 [docs/ASSETS.md](../docs/ASSETS.md) 에 있다.

- 목록은 `assets/manifest.json` — `키 → { src, w, h, note }` 평평한 맵. 앱(`js/app.js`)은 이 파일만 본다.
- 교체할 때는 같은 키의 `src` 를 PNG 경로로 바꾸고 `w`,`h` 는 그대로 둔다 (크기가 다르면 장면 배치가 어긋남).
- 단일 파일 번들(`node tools/bundle.js`)은 manifest 의 모든 파일을 `data:` URI 로 넣어 `window.ASSETS_INLINE` 으로 전달한다.
- 모든 플레이스홀더는 `shape-rendering="crispEdges"` + 정수 좌표라 확대하면 투박한 픽셀처럼 보인다. CSS 에서 `image-rendering: pixelated` 로 정수 배 확대할 것.
- 테마: 라이트/다크 어느 쪽에도 어울리도록 살짝 탈색한 **한 가지** 버전만 둔다(두 벌 아님). 팔레트는 v0 프로토타입(`--floor #5a3c1e`, `--panel #e5dfd3`, 호박색 `#cc8030`)에서 가져왔다.
- `assets/ref/octopus-ref.png` 는 작성자가 그린 캐릭터 레퍼런스(DESIGN §7.1). 플레이스홀더 문어도 이 팔레트(몸 `#e8463c`)로 그렸다.

## 키 목록

| 키 | 크기 | 뭐냐 |
|---|---|---|
| `bg.room` | 320×240 | 다락방 모서리 배경. 2:1 다이메트릭, 왼쪽 벽·오른쪽 벽·바닥 마름모·천장 들보·오른쪽 아래 문틀. 창문 자리는 (40,22), 등불 고리는 (48,14) |
| `window.rain` | 72×96 | 창문 틀 + 비 오는 밤하늘 (등불 0~5) |
| `window.drizzle` | 72×96 | 가는 비 (등불 6) |
| `window.stars` | 72×96 | 맑은 밤, 별과 달 (등불 7 이후, 밤이고 맑을 때) |
| `item.moss` | 24×24 | 이끼 화분 — 등불 1, 창턱 위 |
| `item.crate` | 56×44 | 나무 상자 — 등불 2, 바닥 오른쪽 (앵커 crate 옆) |
| `item.candle` | 16×28 | 양초(불꽃 포함) — 등불 3, 상자 위 |
| `item.blanket` | 72×36 | 담요 — 등불 4, 바닥 왼쪽 (앵커 blanket) |
| `item.board` | 110×80 | 코르크 보드 — 등불 5, 오른쪽 벽. 포스터 썸네일이 이 위에 붙음 |
| `item.shelf` | 64×20 | 선반 — 등불 7. 기념품이 위에 놓임 |
| `item.curtain` | 80×40 | 창가 커튼 두 장 — 등불 8 |
| `light.lantern0` … `light.lantern8` | 320×240 | 등불 빛 오버레이. 0 은 완전 투명, 숫자가 클수록 (48,40) 에서 퍼지는 호박색 빛이 커짐. `mix-blend-mode: screen` 권장 |
| `lantern.off`, `lantern.on` | 24×36 | 매달린 등불, 꺼짐/켜짐 |
| `souvenir.feather` `shell` `pebble` `button` `leaf` `marble` `yarn` `stamp` `matchbox` `key` `pinecone` `paper_boat` `bell` `map_piece` `chalk` `stained_glass` | 16×16 | 기념품 16종 (깃털·조개·조약돌·단추·나뭇잎·유리구슬·실뭉치·우표·성냥갑·열쇠·솔방울·종이배·작은 종·지도 조각·분필·색유리). 선반/창턱에 놓이고 포스터 스티커로도 씀 |
| `scene.hands` `sea` `sky` `signs` `numbers` `sounds` `home` `mind` `wild` | 108×144 | 포스터(3:4) 앞면 배경, 코너별 하나. 위 ~35% 와 아래 ~25% 는 스티커·한 줄 글자 자리로 조용하게 비워 둠 |
| `oct.idle` `walk` `carry` `sleep` `happy` `peek` | 48×48 | 문어 단일 프레임. **선택 사항** — 앱은 인라인 SVG 문어(또는 3D 문어)를 쓰고, 진짜 스프라이트 시트가 생기면 그때 교체 |

## 교체 규칙 (요약)

1. 같은 `w×h` 로 렌더한다. 더 크게 그리고 싶으면 2x 로 그리되 manifest 에 `scale: 2` 를 적지 말고 — 1x 로 줄여서 넣는다 (앱은 1x 만 안다).
2. 투명 배경 PNG. 외곽선은 1px, 팔레트는 48~64색 안에서.
3. `light.*` 는 검정 위에 호박색을 얹는 식(스크린 합성)으로 렌더. `light.lantern0` 은 완전 투명.
4. `scene.*` 는 글자가 올라가므로 대비가 낮은 중간톤으로.
5. 바꾼 뒤 `node tools/bundle.js` 로 단일 파일을 다시 만든다.
