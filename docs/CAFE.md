# 카페 (7차 갈래 C, 11-21)

마을 카페에서 커피를 마시고, 케이크나 꼬치를 먹고, 레코드를 튼다. 같은 메뉴를 세 번 다 먹으면 지킴이가 그 레시피를 준다.

## 파일

| 파일 | 하는 일 |
|---|---|
| `js/cafe.js` (전역 `CAFE`) | 규칙: 메뉴와 값, 주문, 한 입, 선물, 기록 고치기 · 합치기. 수수한 대체 그림과 레코드 재킷 여덟 장. DOM · 시계 · 난수 없음 |
| `js/cafe-music.js` (전역 `CAFE_MUSIC`) | 여덟 곡의 음표와 작은 신시사이저. 음표 칸은 `tools/build-cafe-music.js` 가 만든다 |
| `js/app.js` `[7-C]` | 화면: 메뉴 시트 `#cafe-sheet`, 쟁반 `#cafe-tray`, 레코드 시트 `#lp-sheet` |
| `tools/test-cafe.js` · `tools/test-cafe-live.js` | node 검사 · 브라우저 검사 |
| `tools/cafe-midi.js` · `tools/build-cafe-music.js` | MIDI 읽기 · 음표 칸 만들기 (`--check` 로 최신인지 확인) |
| `wip/round7/cafe-src/` | 음표의 원본 (퍼블릭 도메인 조판의 `.ly` 와 `.mid`) |
| `docs/CAFE_MUSIC.md` | 곡 목록, 출처, 라이선스 |

## 카페 방 (11-21 콘텐츠 다듬기 — 주인: "탭같은 느낌으로 축약하지 말고 … 개별 콘텐츠 같은 느낌")

3D 장면에 카페 방이 있으면 (`scene.inRoom() === 'cafe'` 이고 `scene.project` · `scene.spriteProp` 이 있을 때) 창 대신 방에서 일이 벌어진다.
아래 "흐름" 의 시트와 쟁반 판은 방이 없을 때 (2D · 방 함수 없음) 의 대체로 남아 있다. 값 · 세기 · 선물 · 두 탭 · 음악 규칙은 같다.

| 차례 | 플레이어가 하는 일 | 벌어지는 일 | 쓰는 것 |
|---|---|---|---|
| 1 | 벽의 칠판 `#btn-cafe-menu` | 칠판 확대 카드 `#cafe-card` (메뉴 셋 · 분필 값 · 도장 카드). `<dialog>` 가 아니라 `#scene` 안의 요소 | V 의 단추 |
| 2 | 칸 → '시킬래' | 조개가 나가고 카드가 닫힌다. 지킴이가 잠깐 일한다 (김, 1.5초) | `npcSay('cafe.order')` |
| 3 | (기다림) | 받는 자리에 쟁반. 카운터 단추 이름이 '쟁반 가져가기' | `spriteProp('cafe-tray', pickup, …)` · `npcSay('cafe.serve')` |
| 4 | 카운터 `#btn-cafe-counter` | 쟁반을 들고 내 자리로 걸어가 앉고 내려놓는다 | `playerCarry` · `cafeSit(true)` · `spriteProp('cafe-plate', table, id, 0)` |
| 5 | 식탁 위 접시 `#btn-cafe-plate` ×3 | 한 입씩 (그림 프레임 1 · 2 · 3, 부스러기). 커피는 세 모금 | `spriteProp(…, frame)` |
| 6 | (다 먹음) | 도장 카드가 잠깐 뜨고 도장이 찍힌다. 세 번째면 레시피 한 줄 + 카드가 살림으로 | `npcSay('cafe.stamp' / 'cafe.gift')` · `APP.recipeEat` |
| 7 | 레코드 구석 `#btn-cafe-lp` | 선반 확대 카드 (재킷 여덟 · 스피커 단추). 재킷을 누르면 방의 판이 돈다 | `scene.cafeRecord(on, '#rrggbb')` · `npcSay('cafe.record')` |
| 8 | 자리 단추 · 걷기 · 문 | 자리가 끝난다. 먹다 만 접시는 식탁에 남고, 방을 나가면 판도 멈춘다 | `ppol:cafe-seat` · `ppol:room` |

끊겼을 때: 만드는 중이나 들고 가는 중에 방을 나가면 연출만 걷힌다. 값을 낸 음식은 기록의 쟁반 (`S.user.cafe.tray`) 에 그대로 있고,
다음에 방에 들어오면 식탁에 놓여 있다. 서서 접시를 누르면 먼저 앉는다. 먹던 것이 있는 동안 칠판은 새 주문을 받지 않는다.

## 흐름

1. **메뉴.** 카운터 단추 `#btn-cafe-counter` (갈래 V) 또는 `APP.openCafe()`. 커피 2 · 딸기 케이크 5 · 과일 꼬치 4 조개.
   칸을 누르면 물음 줄 ('딸기 케이크 · 조개 5 시킬까?') 이 메뉴 자리에 뜨고, '시킬래' 를 누른 뒤에만 조개가 나간다.
   물음이 뜬 뒤 0.6초 안의 누름은 받지 않는다 (재봉틀과 같은 규칙). 조개가 모자라면 묻지 않고 값이 흔들린다.
2. **자리.** 시키면 `scene.cafeSit(true)` · `scene.cafeCup(true)` (있을 때만) 를 부르고, 화면 아래 쟁반에 그림이 나온다.
   쟁반은 갈래 V 의 자리가 있든 없든 같다. '일어나기', 자리 단추 `#btn-cafe-seat` 를 다시 누르기, 걸어 나가기, 마을을 벗어나기로 끝난다.
3. **먹기.** 케이크와 꼬치는 그림을 세 번 눌러 먹는다 (오른쪽부터 삼분의 일씩 사라지고 부스러기가 튄다). 커피는 잔만 놓인다.
   먹다 만 접시는 기록에 남고, 카운터에 다시 가면 값을 또 받지 않고 그 접시를 다시 낸다.
4. **레시피 선물.** 다 먹으면 `APP.recipeEat('cake' | 'kkochi2')` (갈래 T, 계약 C3) 를 부른다. `gift: true` 면
   `APP.npcSay('cafe', 'cafe.gift', { dish })` (갈래 N, 있을 때만) 와 한 줄 '딸기 케이크 레시피를 받았어. 집 조리대의 책에 생겼어.',
   그리고 레시피 카드 그림이 살림 꼬리표로 날아간다. `APP.recipeEat` 이 없으면 세기만 한다 (없는 레시피를 받았다고 말하지 않는다).
   메뉴 칸의 점 셋이 몇 번 먹었는지 보여 준다 (수 · 재촉 없음).
5. **레코드.** `#btn-cafe-lp` 또는 `APP.openRecords()`. 재킷 여덟 장 (글자 없는 도형) 가운데 하나를 누르면 판이 올라가 돈다.
   같은 재킷을 다시 누르면 내린다. 한 번에 한 곡, 끝나면 잠깐 쉬고 처음부터.

## 소리 규칙

- 음악은 게임의 '소리 켜기' 가 켜져 있을 때만 난다. 꺼져 있으면 판만 돌고, 시트의 스피커 그림 단추 (이름 '소리 켜기') 가 같은 설정을 켠다. 누르는 것은 플레이어다.
- `CAFE_MUSIC.play` 는 재킷이나 스피커 단추를 누른 그 손길 안에서만 불리고, 그때 처음 AudioContext 를 만든다. 그 전에는 아무것도 만들지 않는다. `audio/` · `foley/` 에 요청하지 않는다 (파일이 없다).
- 멈추는 때: 같은 재킷을 다시 누름, 마을을 벗어남 (`scene.area()` 가 `'village'` 가 아님), 부엌이나 달리기가 열림, 탭이 숨음, 설정에서 소리를 끔 (이때는 판만 계속 돈다). 바깥 지도가 없으면 (2D · 시험) 레코드 시트를 닫을 때 멈춘다.
- 크기는 설정의 음악 막대를 따라간다. 기준 크기는 `CAFE_MUSIC.LEVEL` (0.2) 로 효과음보다 한참 작다.
- 레코드가 소리를 내는 동안 집 음악 버스만 `AUDIO.setVolume('bgm', 0)` 으로 내리고 (저장되지 않는 값), 멈추면 음악 막대 값으로 되돌린다. `js/audio.js` 는 고치지 않았다.

## 기록 (`S.user.cafe`, 계약 C8)

```
{ v: 1,
  eaten: { cake: 3, kkochi: 1 },          // 메뉴마다 다 먹은 수
  tray:  { id, left, day } | null,        // 쟁반에 있는 것 (left = 남은 입)
  gifts: { cake: '2026-11-21' },          // 레시피를 받은 날
  lp:    { clair: 2 } }                   // 곡마다 튼 수
```

없는 칸은 빈 값으로 읽고, 모르는 칸과 모르는 메뉴 id 는 그대로 둔다 (`CAFE.normalize`). 두 기록을 합칠 때는 센 것은 큰 쪽,
선물은 합집합 (`CAFE.merge`). 다른 탭의 저장을 받을 때 (`adoptRemote` → `cafeAdopt` → `CAFE.adopt`) 는 이 탭이 센 것을 지키고,
쟁반만 받은 쪽 것을 따른다 (다른 탭에서 다 먹은 접시를 되살리지 않게).

## 다른 갈래와 만나는 곳

| 갈래 | 쓰는 것 | 없을 때 |
|---|---|---|
| V | `#btn-cafe-counter` · `#btn-cafe-seat` · `#btn-cafe-lp`, `scene.cafeSit` · `scene.cafeCup` | 단추가 없으니 `APP.openCafe()` · `APP.openRecords()` 로만 열린다. 쟁반은 그대로 나온다 |
| W | `scene.area()` | 마을을 벗어났는지 모른다 → 레코드 시트를 닫을 때 음악이 멈춘다 |
| T | `APP.recipeEat(id)` | 먹은 수만 센다. 선물 줄 없음 |
| N | `APP.npcSay('cafe', 'cafe.hello' | 'cafe.serve' | 'cafe.gift', { dish })` | 지킴이 말 없음 (대신 지어내지 않는다) |
| A | `COOK_SPR.get('dish.cake' | 'dish.kkochi' | 'cafe.coffee' | 'cafe.card')` | `CAFE.art` 의 수수한 그림 |

## 검사

```
node tools/test-cafe.js                       # 규칙 + 음표를 원본 MIDI 와 하나하나 대조 (--wav <폴더> 로 들어 볼 파일을 굽는다)
NODE_PATH=$(npm root -g) node tools/test-cafe-live.js   # 화면 (--shots <폴더> · --3d)
node tools/build-cafe-music.js --check        # 음표 칸이 원본과 같은가
```
