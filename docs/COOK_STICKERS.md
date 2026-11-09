# 요리 반응 스티커 (COOK_STICKERS)

> 11-08. 요리 놀이(카드 7, 놀이방 부엌) 하는 동안 판 가장자리에 **요리사 모자 쓴 문어 스티커**가 톡 떴다 사라진다. 방송 이모트 세트처럼 따봉·감동·만세 같은 반응 19종.
> 요리 순간(재료 떨어뜨림·합쳐짐·가득·완성·차리기…)마다 **자동으로** 뜬다. 요리마다 '요리 스크립트'를 두어 그 요리의 특정 순간에 특정 스티커가 뜨게 할 수 있다.

## 파일

| 경로 | 역할 |
|---|---|
| `tools/ui-art/cook-stickers.js` | 그림 정의 (32×32, Apollo 팔레트, 작은 붓으로 몸·모자·얼굴·소품을 겹침) |
| `tools/make-cook-stickers.js` | PNG 생성 + 장면 외곽선 규칙 + manifest `sticker.cook.*` + 미리보기 `tests/evidence/cook-stickers/sheet.png` |
| `assets/stickers/cook/*.png` | 결과 19장 (1x). ×2 · ×3 정수 배로만 띄운다 |
| `js/cook-stickers.js` | 전역 `COOK_STICKERS` — 규칙 · 요리 스크립트 · 시드 고르기 · 띄우기 |
| `css/cook-stickers.css` | 등장·퇴장 모션, 모션 줄이기 |
| `tools/ui-art/cook-stickers.html` | 개발용 시험대 (act 단추 · 요리 고르기 · 자동 재생). 캡처 `tests/evidence/cook-stickers/demo.png` |
| `tools/test-cook-stickers.js` | 검사 (`npm test` 에 들어 있음) |

그림을 고치면 `node tools/make-cook-stickers.js` → `node tools/test-cook-stickers.js`.

## 스티커 19종

| id | 라벨 | 그림 | 기본으로 뜨는 순간 |
|---|---|---|---|
| `thumbs` | 따봉 | 다리 하나로 엄지 척 | 3단계 이상 합쳐짐 |
| `moved` | 감동 | 반짝 눈 + 눈물 | 완성 |
| `heart_plate` | 한 접시 | 하트 얹은 접시 내밀기 | 식탁에 차리기 |
| `star` | 다 됐다 | 별 높이 들기 | 완성 (가득 차서) |
| `shock` | 깜짝 | 눈 휘둥그레 | 5단계 이상 합쳐짐 |
| `taste` | 맛보기 | 숟가락 입에 | 합쳐짐 · 냠 |
| `stir` | 휘휘 | 냄비 젓기 + 김 | 시작 · 재료 몇 개마다 |
| `sweat` | 진땀 | 진땀 > < | 냄비 가득 (실패 아님) |
| `cheer` | 만세 | 다리 둘 번쩍 | 완성 |
| `peek` | 빼꼼 | 냄비 위로 빼꼼 | 시작 · 첫 재료 |
| `clap` | 짝짝 | 빨판 쪽 다리 둘을 앞에서 V자로 맞대고 짝 | 3단계 이상 합쳐짐 |
| `munch` | 냠 | 볼 빵빵 | 네 그릇 톡 |
| `sleepy` | 꾸벅 | 졸기 + zz | 한참 손 안 댐 (판마다 한 번) |
| `hmm` | 갸웃 | 물음표 | 재료 몇 개마다 |
| `love` | 뿅 | 하트 눈 | 5단계 이상 합쳐짐 |
| `sprinkle` | 솔솔 | 양념병 기울이기 | 재료 몇 개마다 |
| `busy` | 바빠 | 다리 넷으로 국자·거품기·뒤집개·양념병을 한꺼번에 | 재료 몇 개마다 |
| `ink` | 퓻 | 놀라서 먹물 뿜기 | 5단계 이상 합쳐짐 |
| `flush` | 두근 | 몸 색이 분홍으로 (문어 색 바뀜) | 완성 |

## 자동 발동

요리 놀이는 소리 훅을 부르는 자리에서 한 줄을 더 부른다:

```js
window.COOK_STICKERS && COOK_STICKERS.cue(act, detail);
// 또는 이 파일을 몰라도: window.dispatchEvent(new CustomEvent('ppol:cook', { detail: { act, ...detail } }))
```

| act | 언제 | detail |
|---|---|---|
| `start` | 새 판 | `{ runId, recipe? }` — 판 id 가 시드가 된다 |
| `drop` | 재료 떨어뜨림 | `{ ingredient? }` |
| `merge` | 같은 것끼리 합쳐짐 | `{ tier, ingredient? }` |
| `full` | 냄비 가득 | — |
| `done` | 요리 완성 (가득 · "이걸로 할래") | `{ dish, reason: 'full' \| 'chosen' }` |
| `serve` | 식탁에 차리기 | — |
| `eat` | 네 그릇 톡 '냠' | — |
| `idle` | 한참 손 안 댐 | — |

고르는 순서:

1. **요리 스크립트** `RECIPES[요리].cues` — 위에서부터 보고 먼저 맞는 줄 하나.
2. 없으면 **공통 규칙** `RULES`.
3. 줄의 `pick` 이 배열이면 판 시드(FNV-1a + mulberry32)로 고른다. `chance` 도 같은 시드.

조건 키: `on`(act) · `tier`(정확히) · `minTier` · `ingredient` · `reason` · `nth`(그 act 의 n번째) · `every`(n번마다) · `once`(판에 한 번) · `force`(쉬는 틈 무시).
스티커 사이 쉬는 틈 0.9초, 화면에 최대 3장. `full` · `done` · `serve` 는 틈과 상관없이 뜬다.
요리 스크립트는 `begin({ recipe })` · `setRecipe(id)` · `done` 의 `detail.dish.id` 로 정해진다.

### 요리 스크립트 예

```js
seafood_pancake: { name: '해물 파전', cues: [
  { on: 'merge', tier: 2, pick: 'clap' },
  { on: 'merge', tier: 4, pick: 'shock', force: true },
  { on: 'full', pick: 'sweat', force: true },
  { on: 'done', pick: ['cheer', 'star'] },
  { on: 'serve', pick: 'heart_plate' }
] }
```

지금 든 요리 6개(미역국 · 가리비 구이 · 해물 파전 · 조개탕 · 새우 볶음밥 · 별 젤리)와 재료 id(`seaweed` · `scallop` · `shrimp` · `clam`)는 **자리표시**다. 카드 7 이 실제 `dish.id` · 재료 id 를 정하면 `RECIPES` 키만 맞춘다. 새 요리를 더할 땐 `RECIPES` 에 한 덩이를 더하면 끝 (검사가 act 이름·스티커 id 를 확인한다).

## 지키는 것

- **글자 없음.** 스티커는 그림뿐. 맛 평가·취향 말을 코드가 쓰지 않는다 (카드 7 금지 낱말 검사를 이 파일에도 건다). 대체 글은 그림 설명("엄지 척 하는 요리사 문어 스티커")이지 문어의 말이 아니다.
- **장식이지 문어의 반응 기록이 아니다.** 요리는 주로 문어가 산책 간 동안 하므로, 스티커를 '문어가 지금 이렇게 느꼈다'로 쓰지 않는다. 기록(`COOK_STICKERS.log()`)은 `by: 'demo-rules'` 이고 문어 기록(`trips`) · 두뇌 입력 · 모델 요청에 넣지 않는다 (CORE_LOOP_V2 약속 2).
- **벌 없음.** 가득 차도 '진땀' 정도. 우는 그림은 '감동'(반짝 눈물)뿐.
- **시드.** 같은 판 id + 같은 순간 순서 = 같은 스티커. 시드 없는 난수 0건 (검사).
- **모션.** 등장 250 ms (6px 아래 → 2px 넘침 → 제자리) · 머묾 1.4 s · 퇴장 180 ms. 픽셀 그림이라 배율 대신 이동. 모션 줄이기(`data-motion="reduce"` 또는 OS 설정)면 투명도만.
- 그림이 안 오면 그 스티커를 지운다 (이모지로 대신하지 않는다). 번들(`dist/`)은 `ASSETS_INLINE['sticker.cook.*']` 를 쓴다.
