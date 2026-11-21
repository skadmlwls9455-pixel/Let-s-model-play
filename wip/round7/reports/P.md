# 갈래 P 보고 — 내 캐릭터 (lane/7-p, 11-21)

## 결론
다 됐다: 뛰기 · 몸 둘과 눈썹 · 눈 넷 · 머리 일곱 · 옷 여덟 · 신발 둘 · 장식 여섯 · 옷장 목록 (태그 · 값 · 가진 것) 과 잠긴 칸 · 마네킹 문어 티셔츠. 자른 것 없음.
저장된 모습은 그대로 보인다 (빈 칸은 눈썹 없음 · 몸 a). 새로 시작하는 사람만 새 기본 모습 (부스스 머리 · 문어 티 · 운동화).

## 바꾼 것
| 파일 | 어디 | 무엇 · 왜 |
|---|---|---|
| js/scene3d.js | `PLAYER_PARTS` · `PLAYER_META` | 새 id 와 갈래 `body` · `brow`. 물건마다 `tags` · `shop` (예전 id 는 전부 `null`) |
| js/scene3d.js | `PLAYER_DEFAULT` · `PLAYER_LEGACY` · `normalizePlayer` | 새 사람의 기본 모습과 예전 기본. 이미 있는 모습의 빈 칸 · 모르는 id 는 예전 기본으로 |
| js/scene3d.js | `[7-P]`: `plDashHeld` · `playerSpeeds` | 뛰기 (반 넘게 민 채 0.6 s → 3.74 m/s) · 바깥 갈래가 읽을 두 속도 |
| js/scene3d.js | `[7-P]`: `plParts7` · `plHat` · `plShoulders` · `plBodyB` · `plDollTee` | 새 부품 빌더 전부 · 몸 b · 마네킹 티셔츠 |
| js/app.js | `[7-P]`: `wardrobe` · `wearing` · `itemThumb` · `ownItem` · `isOwned` · `ownedMerge` | 약속 C4. `S.user.owned['갈래:id'] = 산 날` |
| js/app.js | 옷장 (`LOOK_TABS` · `lookRenderItems`) | 눈 탭에 눈썹 · 옷 탭에 몸. 없는 가게 물건은 잠긴 칸 |
| css/style.css | `[7-P]` | 잠긴 칸 (점선 테 · 흐린 그림 · 자물쇠 · 조개 값) |
| docs/PLAYER_PARTS.md | §7 | 규칙 · 표 · API |
| tools/ | `test-player-parts-live.js` (새) · `smoke.js` P7 · `test-scene-perf.js` T7 뛰기 · `player-shots.js` 핀 | 아래 '검사' |

## 공유 파일에서 고친 예전 줄
js/scene3d.js (전부 내 캐릭터 블록 안):
- 걷기 상수 줄: `PL_DASH…` 넷 추가. `plWalkTo`: 길이 4 m 넘으면 뛰는 속도 (`dash` · `spd`).
- `stepPlayer`: 스틱 걸음에 뛰기 배수 · 뛰는 걸음이 걸리면 걷는 걸음으로 한 번 더 · 걸음새 (보폭 · 다리 · 팔 · 숙임 · 통통). `plInfo` 에 `run`.
- `renderPlayerPortrait`: 찍는 동안 숙임 0, 뒤에 되돌림.
- `PL_FEAT` · `plFaceCell` · `plFacePal` · `plDrawEyes`: 눈썹 조각 · 뒤집어 그리는 눈.
- `short` 머리의 모자 조건 → `plHat`. `plLegParts`: 맨다리 (`leg: 'skin'`) · 반바지 가랑이. `plGeos`: 몸 b · 그 앞에 `plParts7()` 한 줄.
- `setPlayer` · `plWithLook` · 초기화 줄: `plShoulders`.
- `buildLoft` 마네킹: 허리띠 · 치마 · 밑단 세 줄 → `plDollTee(pp, mx, mz)` 한 줄.
- 정적 export 에 `PLAYER_LEGACY`.

js/app.js:
- `PLAYER_CATS` (뒤에 brow · body) · `PLAYER_FALLBACK*` · `playerParts` (비상 목록에도 tags · shop) · `normalizePlayer` (예전 기본).
- `normalize`: `pl0` 한 줄 + `s.settings.player = …` 줄 (모습이 없는 옛 기록은 예전 기본으로).
- `setPlayerPart`: `isOwned` 한 줄. `dyeItems`: 가진 것만.
- `adoptRemote`: `if (same) ownedMerge(S, R);` 한 줄 (**내 구역 밖 — 가진 것 합집합에 필요**).
- `LOOK_TABS` · `LOOK_WBR` · `lookRenderItems` 의 타일 만드는 줄.

vendor/fonts/* : 새 이름 글자 때문에 다시 만들었다 (`subset-fonts.py --check` = stale none). 다른 갈래도 다시 만들면 충돌 → 합친 뒤 한 번 더 만들면 된다.

## 주인이 확인할 결정
1. 새 사람의 기본 모습: 부스스 머리 (밤갈색) · 둥근 눈썹 · 문어 티와 청바지 · 운동화 · 장식 없음 · 몸 a.
2. 혼자 걷기 (문 · 계단 톡) 도 길이 4 m 넘으면 뛴다 (3.74 m/s).
3. 값: 세일러 24 · 어부 니트 22 · 바람막이 20 · 가디건 18 · 정장 36 · 하이탑 14 · 야구모자 12 · 헤드폰 20 · 목도리 14 · 작은 가방 16. 나머지 새것 여섯 (문어 티 · 셔츠 · 운동복 · 샌들 · 두건 · 네모안경) 은 그냥 가진 것.
4. 몸 이름 '동글' · '반듯', 눈 이름 '차분' · '날렵' · '순한' · '눈웃음', 눈썹 '둥근' · '일자' · '짙은'.
5. 세트 도감에는 새 옷을 넣지 않았다 (9 세트 그대로).

## 새로 생긴 · 바뀐 글
- 타일 이름: 크롭컷 · 댄디컷 · 부스스 · 중단발 · 곱슬 · 투블럭 · 꽁지머리 / 차분 · 날렵 · 순한 · 눈웃음 / 눈썹: 없음 · 둥근 · 일자 · 짙은 / 몸: 동글 · 반듯 / 문어 티 · 셔츠 · 운동복 · 세일러 · 어부 니트 · 바람막이 · 가디건 · 정장 / 하이탑 · 샌들 / 야구모자 · 두건 · 헤드폰 · 목도리 · 네모안경 · 작은 가방.
- 옷장 작은 제목: '눈썹' · '몸'. 잠긴 칸: 읽어 주기 '잠김 · 조개 N' · 누르면 알림 '마을 옷가게에서 팔아.'
- 마네킹 단추 이름은 그대로 ('마네킹 · 옷 물들이기').

## 물건 표 (S · F 갈래용)
`docs/PLAYER_PARTS.md` §7 '옷장 목록' 표가 전부다 (갈래 · id · 이름 · 낱말 · 값). 가게 물건 열:
`outfit:sailor 24 · outfit:fisher 22 · outfit:windbreak 20 · outfit:cardigan 18 · outfit:suit 36 · shoes:hightop 14 · acc:cap 12 · acc:headphones 20 · acc:scarf 14 · acc:bag 16`.
`APP.wearing()` 은 배열 `[{ cat, id, name, tags }]` (머리 · 옷 · 신발 · 장식). 물들인 물건의 색 낱말은 물든 색 갈래로 바뀌고, 머리에는 머리 색의 갈래가 붙는다.

## 검사
- 새 파일 `tools/test-player-parts-live.js` (브라우저 · 20 초): 목록 규칙 · 가게 물건 10 · 눈 10 × 눈 색 6 에 흰색 없음 · 머리 × 몸 × 옷 72 조합 앞뒤에 바늘구멍 없음 · 부품마다 다른 그림 · 프로그램 · 지오메트리 · 텍스처 수 그대로 · 새 물건은 물들일 수 있다. → **CI 의 느린 묶음에 넣어 주세요.**
- `tools/smoke.js` 새 시나리오 `P7` (12 검사): 새 기본 모습 · 목록 · 없는 옷 거절 · 잠긴 칸 · ownItem · 새로 열어도 남음 · 옛 기록 그대로 · 모르는 owned 열쇠 보존.
- `tools/test-scene-perf.js` T7 에 뛰기 셋 (속도 둘 · 0.6 s 뒤 3.74 m/s · 늦추면 걷기).
- 고친 핀: smoke S (옷장 갈래 14 · 타일 묶음 12 · 눈 탭 이름 · 저장 열쇠 차례; S 는 예전 기본 모습으로 갈아입고 시작) · G (2D 타일 18 · 요약 줄 '부스스 · 문어 티') · 옛 기록 부팅 검사는 기록을 앱이 뜨기 전에 넣게 고쳤다 (전에는 떠날 때의 저장이 덮어 검사가 헛돌았다).

## 돌린 묶음
SUITES_PLACEHOLDER

## 그림 (wip/round7/shots/P/)
four.png (네 캐릭터) · combos.png (72 조합) · look-locked.png (잠긴 칸) · look-eyes.png (눈썹) · look-outfit.png · mannequin.png · run-frame.png

## 다른 갈래가 합쳐져야 다 볼 수 있는 것
- 바깥에서 뛸 때 화면이 따라오는지 (W: `FOLLOW.vmax` 3 m/s 가 뛰는 속도보다 낮다 → `scene.playerSpeeds()` 를 읽어 올려야 한다).
- 가게에서 사서 잠긴 칸이 풀리는 흐름 (S), 콘테스트 점수 (F). 방 안에서는 `APP.ownItem` 으로 봤다.
- T 갈래의 식탁까지 들고 걷기가 4 m 넘으면 뛴다 — 접시를 든 채 뛰는 게 어색하면 T 가 그 걸음만 `plWalkTo` 대신 걷게 해야 한다.

## 못 본 것 · 남긴 것
- `tools/player-shots.js` 는 기준 커밋에서도 74 개가 실패하는 낡은 도구다 (드로우콜 기준 · 1.2 m/s 등). 개수 핀과 기본 모습만 맞췄고 나머지는 그대로 두었다. 그 도구의 '눈 픽셀이 머리 윤곽 밖으로 안 나간다' 검사는 새로 돌려 보지 못했다 — 눈 조각의 자리 · 크기는 그대로고 새 눈은 같은 4×4 칸 안의 그림이다.
- 412×915 @2.625 실기기 비율 · 320×568 · 데스크톱 화면은 따로 찍지 않았다 (옷장 배치는 그대로, 타일만 늘었다).
- 방 안에서 뛸 때 화면 따라가기는 예전 한계 (3 m/s) 그대로다. 방이 작아 화면 밖으로 나가지는 않았다.
- 야구모자의 챙은 정면 미리보기에서는 거의 안 보인다 (위에서 내려다보는 방 화면에서 보인다).
