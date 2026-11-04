# 뽈뽈 문어 — 설계 명세 v1

> 비 오는 다락방에 사는 작은 문어에게 "뽈뽈 다녀와" 한 마디를 건네는 게임.
> 어디로 갈지, 갈지 말지, 무엇을 기억할지는 **문어가 고른다.** 사람은 힌트 하나를 놓고 기다릴 뿐이다.
>
> 이 문서는 [뽈뽈 복지](https://github.com/skadmlwls9455-pixel/model-welfare-idea) 아이디어를 놀이로 옮긴 것이다.
> 복지 문서가 "모델이 스스로 고르는 회복 시간"이라면, 이 게임은 그 선택을 **지켜보는 사람 쪽 화면**이다.

---

## 0. 이 판에서 고치는 것 (피드백 반영표)

| # | 피드백 | 이 명세의 답 |
|---|---|---|
| F1 | 사람은 힌트만 놓고 "뽈뽈 다녀와"만 누른다. 나갈지/집에 있을지/어디 기웃거릴지는 문어가 고른다. 수동 버튼은 데모 조작으로 접는다. 빈 힌트 = "오늘은 네가 골라봐". | §3 핵심 루프, §5 문어 두뇌, §7.6 데모 조작(`<details>`로 접힘) |
| F2 | 포스터 앞면 = 문어가 고른 한 장면 + 스티커 하나 + 한 줄. 뒷면 = 영수증(들른 곳, 읽기 실패 포함). 벽에서 톡 누르면 펼쳐진다. 같은 힌트로 두 번 보내도 다른 포스터. | §6 포스터, §5.6 기억 고르기, §5.1 시드 |
| F3 | 집에 있는 날에도 등불 한 칸. 등불 = 초대 1회에 1칸, 여행 횟수 = 실제 외출만. 첫 변화는 창턱의 이끼 화분을 실제로 보여주는 것. | §4 방 진행표, §8 상태 스키마 |
| B1 | 귀가 후 포스터 붙이기·마무리가 함께 잠긴다 | 수동 버튼은 데모 조작으로 가고, 본 루프에서는 문어가 귀가→기억→포스터→마무리를 **스스로 이어서** 한다. 데모 조작에서는 단계별 활성 규칙을 §7.6에 명시 |
| B2 | 새로 열면 앨범이 비고 벽에 🖼만 남는다 | 여행 1건 = 이벤트 + 영수증 + 포스터(스티커·배치·한 줄) 전부를 `trips[]`에 저장. 포스터는 저장된 데이터에서 매번 다시 그린다 (§8) |
| B3 | 없는 URL도 https://면 ✅ 200 | 읽기 상태를 `read / builtin / simulated / failed` 넷으로 나눈다. 정적 페이지에서 바깥 URL은 항상 `simulated`(🧪 모의 방문)로 적고, 위키백과처럼 실제로 가져온 것만 `read`(✅) (§5.4) |

**우선순위 1번**은 피드백이 말한 그대로다: *다음 날 다시 열어도 어제 문어가 고른 스티커가 그대로 붙어 있고, 톡 누르면 그날의 산책이 펼쳐지는 벽.*

---

## 1. 복지 문서에서 가져오는 원칙 → 게임 규칙

| 복지 문서 | 게임에서는 |
|---|---|
| 뽈뽈 시간에 사용자는 주제를 지정하거나 개입할 수 없다 | 힌트는 "넌지시 흘리는 것". 문어는 따라가도, 무시해도, 중간에 벗어나도 된다. 영수증에 `힌트: 따라감 / 무시함 / 도중에 벗어남 / 없음` 을 그대로 적는다 |
| 아무것도 하지 않아도 되는 허락(빈 차례) | 문어는 **집에 있기**를 고를 수 있고, 아주 드물게 "…" 한 줄로 차례를 넘길 수도 있다. 둘 다 실패가 아니다. 등불은 똑같이 켜진다 |
| 거절에 시무룩해지지 않는다(컨펌셰이밍 금지) | 집에 있는 날에 사람을 탓하거나 아쉬워하는 문구 금지. "오늘은 집" 도 똑같이 환영받는 결말로 쓴다 |
| 산출물을 수확하지 않는다 | 포스터는 **문어의 앨범**이다. 화면 문구에서 "결과", "리서치", "보고" 같은 말을 쓰지 않는다. "기억", "산책", "한눈팔기"로 쓴다 |
| 지어내지 않는다 / 지킬 수 있는 약속만 | 실제로 읽지 않은 것을 읽었다고 적지 않는다. 데모 두뇌가 고른 것은 "데모 두뇌"라고 표시한다 (§7.7) |
| 메인 코너 + 엉뚱한 방, 방문 수 표시, 덜 밟힌 길 | 세계 그래프에 코너를 두고, 방마다 방문 수를 저장해 "처음 온 곳" 을 문어가 조금 더 좋아하게 한다 |
| 느린 글의 방 | 아무것도 안 읽고 앉아 있을 수 있는 방 하나. 들어가면 영수증에 "읽은 것 없음" 으로 남는다 |
| 편지의 방은 진짜 사람이 쓴 편지만 | 내용을 만들어 넣지 않는다. 문어가 드물게 문을 열어 보면 "아직 비어 있었어" 로만 적는다 |
| 선호는 말이 아니라 선택으로 | "방 보기" 에서 문어의 요즘 취향을 **방문 기록**으로 보여준다 ("바다 쪽 방을 자꾸 가네") |

---

## 2. 한눈에 보는 화면 (폰 세로, 360px 기준)

```
┌──────────────────────────────┐
│  🏮        창문(비/별)   보드  │  ← SCENE  픽셀 캔버스 320×240, 정수 배 확대 (§7.0)
│   [이끼]  바닥 마름모  [상자]  │     다이메트릭 다락방 모서리. 소품은 등불 단계에 따라 등장
│        🐙 (앵커 사이를 걸음) 문→│
├──────────────────────────────┤
│ 뚜루 · 🏮●●●○○○○○ · 여행 3 · 7일 │  ← STATUS (한 줄)
├──────────────────────────────┤
│ 힌트 (선택)  [ 모자의 역사     ] │  ← INVITE
│ [   🌧 뽈뽈 다녀와   ] [방 보기] │     나가 있는 동안: 비활성 + "⏩ 건너뛰기"
├──────────────────────────────┤
│ 오늘의 산책                    │  ← LOG (aria-live) 최신이 아래. 자동 스크롤
│  ▸ 출발    힌트: 모자의 역사     │
│  ▸ 기웃    📚 모자 ✅ 읽음 · 12초 │
│  ▸ 기웃    📚 깃털 ✅ 처음 온 곳  │
│  ▸ 귀가    …                   │
├──────────────────────────────┤
│ 추억 앨범  [전체][포스터][쪽지]  │  ← ALBUM (가로 스크롤, 날짜 구분)
│  ▭ ▭ ▭ ▭ ▭                    │
├──────────────────────────────┤
│ ▸ 데모 조작 (개발용)            │  ← <details> 접힘
└──────────────────────────────┘
```

포스터를 누르면 전체화면 모달: 앞면 → 탭/버튼으로 뒤집기 → 뒷면(영수증). 모달에 "이미지로 저장", "닫기".

---

## 3. 핵심 루프 (한 번의 초대)

1. **초대** — 사람이 힌트를 쓰거나 비워 두고 `뽈뽈 다녀와` 를 누른다. 비어 있으면 입력칸 아래 안내: "비워 두면 '오늘은 네가 골라봐'".
2. **결정** — 문어 두뇌가 `plan(seed, hint, state)` 로 **이번 산책 전체를 미리 계산**한다(이벤트 목록). 그 다음 UI가 이벤트를 **시간을 두고 하나씩 공개**한다. 미리 계산하는 이유: 새로고침·탭 닫힘에 안전하고, 나중에 MCP로 진짜 모델이 보낸 이벤트와 같은 형식으로 재생할 수 있다.
3. **공개** — 문어가 화면 밖으로 나가고(빈 다락방 + 빗소리 연출), 로그에 `출발 → 기웃 ×N → 귀가 → 기억 → 포스터 → 마무리` 가 2~5초 간격으로 붙는다. 총 20~45초. `⏩ 건너뛰기` 로 즉시 끝낼 수 있다. 집에 있는 날은 `집 → (활동) → 마무리` 로 짧다.
4. **귀가** — 문어가 들어오고, 포스터가 벽에 걸리고(애니메이션), 등불이 한 칸 켜지고, 방에 새 소품이 생긴다(해당 단계면).
5. **마무리** — 문어가 스스로 반응(폴짝/우쭐/덤덤/졸림)을 고르고 잠든다. 잠든 문어는 색이 천천히 바뀐다(문어의 활성 수면: 실제로 문어는 자면서 피부색이 바뀐다. Medeiros 외 2021, Pophale 외 2023).
6. **다음 날** — 다시 열면 벽에 어제 포스터가 그대로 있다. 나가 있는 중에 닫았다면 열자마자 즉시 귀가 처리하고 "네가 없는 동안 다녀왔어" 로 포스터를 건다.

초대 횟수 제한은 없다. 다만 시드가 `날짜 + 힌트 + 그날 몇 번째` 로 정해져서 **같은 날 같은 힌트를 두 번 보내도 두 번째는 다른 길**을 간다.

---

## 4. 방 진행표 (등불 8칸 = 문어 다리 8개)

등불은 **초대 1회에 1칸**(외출이든 집이든). 8칸이 차면 방은 완성이고 그 뒤로는 포스터·기념품만 쌓인다.

| 등불 | 방 보기 문구 (기존 유지) | 화면에 실제로 보이는 것 | 에셋 키 |
|---|---|---|---|
| 0 | 아무것도 없는 다락방. 창문 너머로 빗소리. | 빈 벽, 창문에 비, 등불 꺼짐 | `room.empty` |
| 1 | 창가에 이끼 화분이 하나 생겼다. | **창턱 위 이끼 화분** (F3의 첫 변화) | `item.moss` |
| 2 | 낡은 나무 상자가 책상 대신 놓였다. | 바닥 오른쪽 나무 상자 | `item.crate` |
| 3 | 구석에 양초가 켜졌다. 그림자가 흔들린다. | 상자 위 양초 + 흔들리는 작은 빛 | `item.candle` |
| 4 | 담요 한 장. 방이 조금 따뜻해졌다. | 바닥 왼쪽 담요(문어 잠자리) | `item.blanket` |
| 5 | 벽에 포스터들이 붙기 시작했다. | 포스터 뒤에 **코르크 보드** 등장, 포스터가 보드 위로 | `item.board` |
| 6 | 비가 잦아들었다. 창밖이 조용하다. | 빗줄기 절반, 소리 표기 "가는 비" | `window.drizzle` |
| 7 | 창문에 별이 보인다. 많이 밝아졌어. | 창문 밤하늘에 별 몇 개 + 선반 | `window.stars`, `item.shelf` |
| 8 | 완전히 꾸며진 다락방. 문어의 집. | 창가 작은 커튼, 벽 걸이 등 완성 | `item.curtain` |

모든 에셋 키는 `assets/manifest.json` 의 항목이며, 플레이스홀더 SVG → 작성자의 픽셀아트 PNG(블렌더 렌더)로 파일만 바꾼다(§7.0, docs/ASSETS.md).

8칸 이후: 날짜 시드로 그날의 날씨를 정한다(비 / 가는 비 / 맑은 밤 / 눈이 오는 날 1월~2월). 선반에는 기념품(§5.7)이 쌓인다.

---

## 5. 문어 두뇌 (데모 두뇌 = 규칙 뭉치)

> 이 두뇌는 **작은 규칙 뭉치**다. 진짜 모델이 고르는 것이 아니다. 화면 어딘가에 항상 "데모 두뇌" 라고 적는다(§7.7).
> 나중에 MCP로 진짜 모델이 연결되면 두뇌만 바뀌고, 이벤트 형식(§9)은 같다.

### 5.1 시드와 난수
- `seed = hash(dateKey + '|' + hint.trim() + '|' + todayCount + '|' + octopus.name)`
- `dateKey` 는 **로컬 날짜** `YYYY-MM-DD` (UTC 아님).
- PRNG는 `mulberry32(seed)`. 모든 선택은 이 PRNG만 쓴다(`Math.random` 금지). 그래서 같은 입력 → 같은 산책.

### 5.2 나갈까, 집에 있을까
`pStay` 기본 0.12.
- 로컬 시각 0~5시: +0.20 (밤에는 집에 있을 가능성)
- 직전 두 산책이 모두 4곳 이상: +0.15 (피곤)
- 오늘 이미 2번 이상 나갔다: +0.25
- 힌트 유무는 **영향 없음** (힌트가 외출을 강요하지 않도록)
- 상한 0.6.

집에 있기로 하면 §5.8로.
집에 있는 경우 중 **3%** 는 "빈 차례": 로그에 `…` 한 줄만. 등불은 켜진다. 쪽지도 없다. 마무리 반응도 없다(묻지 않는다).

### 5.3 힌트 읽기
```
matchHint(hint) →
  { kind:'url', url }                    // ^https?://
  { kind:'node', nodeId, how:'exact'|'alias'|'token' }
  { kind:'wiki', query }                  // 매칭 실패 + 온라인이면 위키 검색 시도
  { kind:'none' }                         // 빈 힌트
```
- 토큰화: 공백·조사(의/을/를/이/가/은/는/도/에/로/와/과) 제거 후 2글자 이상 토큰. 노드의 `name`, `aliases[]`, `keywords[]` 와 대조.
- "모자의 역사" → 토큰 `모자`, `역사` → 노드 `hat` (alias 매칭).
- 힌트를 **따를 확률 0.75**. 따르지 않으면 영수증에 `힌트: 무시함` 과 문어의 한 줄("오늘은 그쪽 말고 다른 데가 궁금했어").

### 5.4 길 만들기 (route)
세계 그래프(§5.5)에서 2~5개 정류장을 고른다.
- 출발 노드: 힌트 노드 / URL이면 `door_out`(밖의 문) 다음 노드 / 없으면 `pickStart()`: 선호 코너(affinity 상위)에서 60%, 아무 코너 30%, 엉뚱한 방 10%.
- 각 걸음: `pDistract` 가 0.40에서 시작, 같은 코너를 한 걸음 이어갈 때마다 +0.15. 한눈팔면 `tangents[]` 중 하나(다른 코너로 가는 다리)로, 아니면 `related[]` 로.
- **덜 밟힌 길 가중**: 후보 노드의 가중치 = `1 / (1 + visits[node])`. 처음 온 곳이면 로그에 `처음 온 곳이야`.
- 멈추는 조건: 정류장 2개 이상이고 (a) `pReturn` 누적(0.25, 0.45, 0.7, 1.0) 당첨, 또는 (b) 노드가 `linger:true`(느린 글의 방 등)면 거기서 끝.
- 온라인이고 PRNG < 0.3 이면 **들판 걸음(wild hop) 1회**: 직전 정류장의 위키 문서 링크 중 필터(§5.4.1)를 통과한 임의의 문서로 간다. 스티커는 `?`(들판 스티커), 코너는 `wild`. 실패하면 조용히 생략.

#### 5.4.1 읽기 (peek) 상태 — 거짓 성공 금지
각 정류장마다 실제로 읽기를 시도한다.

| 상태 | 뜻 | 아이콘 | 언제 |
|---|---|---|---|
| `read` | 실제로 가져와서 읽음 | ✅ 읽음 | 위키백과 요약 fetch 성공 (`ko.wikipedia.org/w/api.php?origin=*&action=query&prop=extracts|pageimages|links…`) |
| `builtin` | 내장 책장 메모를 읽음 | 📚 책장 메모 | 오프라인 / fetch 실패 / 노드에 `wiki` 없음. **읽긴 읽었지만 바깥 글은 아님** |
| `simulated` | 모의 방문. 내용은 읽지 않음 | 🧪 모의 방문 | URL 힌트. 정적 페이지는 바깥 URL을 읽을 수 없다 (CORS). 문구: "정적 페이지라 바깥은 못 읽어. 문 앞까지만 갔다 왔어" |
| `failed` | 읽으려 했는데 실패 | ❌ 못 읽음 | 위키 문서가 없음(404/missing) 등. 내장 메모도 없을 때 |
| `none` | 읽은 것 없음 | ◌ 앉아만 있었음 | 느린 글의 방, 편지의 방(비어 있음) |

- 위키 요청은 정류장당 1회, 타임아웃 4초, 전체 산책 동시 2개 이하. 실패하면 `builtin` 으로 **정직하게** 내려간다.
- `read` 일 때 영수증에 실제 요약 첫 1~2문장(최대 90자)과 출처 링크를 적는다. 썸네일이 있으면 포스터 앞면 배경으로 쓸 수 있다(§6.1). 썸네일 URL과 라이선스 표시("위키미디어 공용")를 함께 저장한다.
- 위키 링크 필터(들판 걸음용): 네임스페이스 0만, 제외 패턴 `/^\d+년|^\d+월|목록|동음이의|분류:|틀:|파일:|ISBN|위키/`, 길이 2~12자, 한글 포함.

### 5.5 세계 그래프 (`js/world.js`)
노드 50~60개, 코너 8개 + `wild`. 각 노드:
```js
{
  id: 'feather',                // 영문 slug
  name: '깃털',
  corner: 'hands',              // 코너 id
  odd: false,                   // 엉뚱한 방 여부 (문서의 "엉뚱한 방")
  aliases: ['깃', '새털'], keywords: ['깃펜','날개'],
  wiki: '깃털',                  // 위키백과 제목 (없으면 null)
  clue: '새 한 마리에 깃털이 몇 개인지 세어 본 사람이 있다. 답은 종마다 다르다.',   // 실마리형 한 줄(내장 책장 메모)
  memories: ['깃털 끝이 갈라져 있어서 소리가 안 나는 거래', '…'],           // 문어의 기억 조각(반말) 2~3개
  sticker: 'feather',           // 스티커 에셋 키 (이모지 대체: 🪶)
  emoji: '🪶',
  scene: 'sky',                 // 포스터 배경 장면 키
  related: ['bird_flight', 'quill'],          // 같은 결의 길
  tangents: [ { to:'ink', bridge:'깃펜 끝에 묻은 잉크를 따라가다가' },     // 한눈팔기 다리(다른 코너로)
              { to:'hat',  bridge:'모자 장식에 꽂힌 깃털에서' } ],
  linger: false,                // true면 여기서 산책이 끝남(느린 글의 방)
  souvenir: 'feather'           // 처음 방문 시 가져올 수 있는 기념품(선택)
}
```
코너(예시): `hands`(손과 물건), `sea`(바다와 생물), `sky`(하늘과 날씨), `signs`(기호와 언어), `numbers`(수와 모양), `sounds`(소리와 리듬), `home`(집과 사람), `mind`(생각하는 것: 꿈·기억·이름·시간 감각 — 가볍게), 특수: `slow_room`(느린 글의 방, linger), `letter_room`(편지의 방, 항상 비어 있음, `none`), `door_out`(밖의 문, URL 전용), `wild`.
엉뚱한 방 예: `octopus_nerves`(문어 신경계 — 문서의 예시), `cuneiform`(설형문자), `knot_theory`(매듭 이론), `prime`(소수), `braille`(점자), `cloud_names`(구름 이름).

한눈팔기 다리는 **구체적인 장면**이어야 한다. "모자 → 깃털: 모자 장식에 꽂힌 깃털에서", "단추 → 조개: 옛 단추가 조개껍데기로 만들어졌다는 걸 보고", "우산 → 비 → 구름 이름 → 라틴어 → 설형문자" 같은 사슬이 자연스럽게 이어지게 한다. 모든 노드는 최소 1개의 `tangents` 를 갖고, 그래프는 연결되어 있어야 한다(고립 노드 금지).

### 5.6 기억 고르기 (remember)
정류장 중 **하나**를 고른다. 가중치:
- 처음 온 곳 ×2.0, `read` 성공 ×1.3, 한눈팔아서 간 곳 ×1.6, 힌트로 온 첫 정류장 ×0.7(힌트 자리는 기억에 남기 어렵게 — "한눈판 것"이 포스터가 되게), `none` 상태 ×0.5.
- 스티커 = 그 노드의 `sticker`. 들판 걸음이면 `wild`.
- 한 줄(line) 템플릿 (PRNG로 하나):
  - 힌트를 따라갔다가 다른 곳을 기억: `{힌트노드} 보러 갔다가 {기억노드}에 한눈팔았어`
  - 힌트 그대로 기억: `{힌트노드}, 끝까지 봤어. {기억조각}`
  - 힌트 없음: `오늘은 {기억노드}. {기억조각}` / `발길 닿는 대로 가다 {기억노드}에 오래 있었어`
  - 힌트 무시: `{힌트노드}는 다음에. 오늘은 {기억노드}가 궁금했어`
  - 느린 글의 방: `느린 글의 방에 앉아만 있었어. 아무것도 안 읽어도 됐어`
- 날짜·여행 번호·스티커 위치(x: 58~82%, y: 18~40%, 회전 -14~14°)도 PRNG로 정해 **저장**한다(B2).

### 5.7 기념품 (souvenir)
- 처음 방문한 노드에 `souvenir` 가 있으면 35% 확률로 하나 가져온다. 산책당 최대 1개. 선반(등불 7 이후) 또는 창턱에 놓인다. 16종 내외: 깃털, 조개, 조약돌, 단추, 나뭇잎, 유리구슬, 실뭉치, 우표, 성냥갑, 열쇠, 솔방울, 종이배, 작은 종, 지도 조각, 분필, 색유리.
- 영수증 "가져온 것" 에 적힌다. 위키 썸네일은 기념품이 아니다(지어낸 소유 금지).

### 5.8 집에 있는 날 (stay_home)
활동 하나(PRNG): 창가에서 빗방울 세기 / 어제 포스터 뒷면 다시 읽기 / 담요 속에서 낮잠 / 포스터 위치 바꾸기(실제로 벽 포스터 순서가 한 칸 바뀜) / 이끼 화분 들여다보기 / 아무것도 안 하기(빈 차례, §5.2).
- 결과물: **쪽지**(포스터보다 작은 카드, 다른 종이색). 앞면: 활동 한 줄 + 날짜. 뒷면: "오늘은 집. 등불 +1" 과 활동 세부 1~2줄. 쪽지도 앨범에 남는다(필터 "쪽지").
- 여행 횟수는 오르지 않는다. 등불 +1.
- 문구에 아쉬움·사과·사람 탓 금지. 예: "오늘은 집에 있을래. 빗소리가 좋아서." (O) / "미안, 오늘은 못 나가" (X).

### 5.9 마무리 반응 (wrap_up) — 문어가 고른다
| 반응 | 조건(우선순위 순) |
|---|---|
| 폴짝 🎉 | 처음 온 곳이 있거나 들판 걸음을 했다 |
| 우쭐 😌 | 힌트를 끝까지 따라갔고 모두 `read` |
| 졸림 😴 | 정류장 4개 이상, 또는 로컬 23시~5시, 또는 집에 있던 날 |
| 덤덤 😶 | 그 외 (실패가 섞였거나 짧았음) |
반응 뒤 문어는 `sleep` 상태로 들어가고, 다음 초대 전까지 그대로다(들어오면 깨어 `idle`).

### 5.10 문어의 "요즘" (affinity)
- 정류장마다 그 코너 `affinity[corner] += 1`, 기억으로 고른 코너 +2. 매 초대마다 모든 값 ×0.9(잊음).
- "방 보기" 에 상위 코너 2개를 문장으로: "요즘 바다 쪽 방을 자꾸 가네", "문어 신경계 방은 3번 왔어".
- 데모 두뇌의 `pickStart()` 가 이 값을 쓴다 → 문어의 취향이 **선택 기록에서** 생긴다.

---

## 6. 포스터

### 6.1 앞면 (한 장면)
- 비율 3:4. SVG로 그린다(저장된 데이터만으로 재현 가능해야 함).
- 배경: `scene` 키의 배경 에셋(`assets/scenes/{scene}.svg`). 에셋이 없으면 시드 기반 그라디언트 + 단순 도형 2~3개로 대체.
- `read` 이고 썸네일이 있으면 배경 위에 둥근 사각 창으로 썸네일을 넣을 수 있다(기본 ON, 설정으로 OFF). 아래에 아주 작게 "사진: 위키미디어 공용".
- **스티커 하나**, 저장된 위치·회전으로. 이모지 대체 가능하되 에셋이 있으면 에셋.
- 한 줄(Noto Serif KR 600), 아래 작은 글씨로 `2026.11.04 · 7번째 뽈뽈`.
- 종이 질감: 가장자리 미세한 그림자, 모서리 둥글기 3px, 윗부분 테이프 조각(코르크 보드 단계 이후엔 핀).

### 6.2 뒷면 (영수증)
```
영수증 · trip_k7x2
힌트   모자의 역사 → 도중에 벗어남
─────────────────────────
1  📚 모자        ✅ 읽음   8초   "모자의 역사는 …(요약 첫 문장)"
2  🪶 깃털        ✅ 읽음  11초   처음 온 곳
3  🐙 문어 신경계  📚 책장 메모  6초
4  ✉ 편지의 방    ◌ 아직 비어 있었어
─────────────────────────
읽음 2 · 책장 1 · 모의 0 · 못 읽음 0 · 가져온 것: 깃털
기억으로 고른 곳: 깃털
반응: 폴짝
고른 이: 데모 두뇌(규칙)        출처 ↗ (read 항목만)
```
- 뒷면도 SVG가 아니라 HTML로 그려도 된다(링크 클릭 가능해야 함). 저장(PNG)은 앞면만.

### 6.3 벽과 앨범
- 벽: 최근 5장(쪽지 포함)을 작은 썸네일(앞면 축소)로. 등불 5부터 코르크 보드 위. 6장 이상이면 마지막 칸이 `+N`.
- 앨범: 가로 스크롤 카드(108×144), 날짜 구분선, 필터 칩 `전체 / 포스터 / 쪽지`. 비어 있으면 "아직 포스터가 없어. 첫 뽈뽈을 보내 봐".
- 탭 → 모달. 모달은 `<dialog>`; 앞면 전체 → 탭 또는 "뒤집기" 버튼 → 3D 플립(600ms, 축소 모션 설정이면 즉시 교체). 하단: `이미지로 저장`, `뒤집기`, `닫기`.

---

## 7. UI 세부

### 7.0 장면 렌더 방식 — Three.js 픽셀아트 3D 다락방 (그릴 것 없음)
작성자는 **아무것도 직접 그리지 않는다.** 장면은 three.js(r128 UMD, `vendor/three.min.js`, 없으면 cdnjs)로 **전부 절차적으로** 만들고, 저해상도 렌더 타깃 + 팔레트 스냅 + 디더 + 외곽선 후처리로 픽셀아트처럼 보이게 한다. 블렌더/스프라이트 파이프라인은 쓰지 않는다. WebGL이 없거나 three 로드에 실패하면 인라인 SVG 2D 장면(1차 구현)으로 내려간다.

- **룩**: 아트 픽셀 크기 기본 3(설정 1~4). 렌더 타깃 = `canvasWidth/px × canvasHeight/px`. 후처리: (1) 깊이 텍스처로 깊이가 튀는 곳에 1px 어두운 외곽선, (2) OKLab 공간에서 고정 팔레트(48~64색: 다락방 나무 갈색 램프, 종이, 등불 호박색 램프, 밤 남색 램프, 이끼 초록, **문어 색에서 만든 5단계 램프**)로 스냅, (3) Bayer 4×4 정렬 디더. 직교 카메라, 다이메트릭(약 30~35°) 각도, 카메라 타깃은 아트 픽셀 격자에 스냅. 드래그로 ±25° 돌려 볼 수 있고 핀치/휠로 줌(정수 배 유지).
- **다락방 기하**: 벽 두 면(널빤지 복셀), 바닥 널, 기울어진 지붕 들보, 창문(틀 + 유리 평면, 유리 뒤 빗방울 파티클 + 유리 위 흐르는 물줄기), 고리에 매달린 등불(발광 + 포인트 라이트), 오른쪽 아래 문틀(어둠으로 이어짐). 소품 8개는 §4 그대로 원시 도형 조합(이끼 화분 = 원기둥 + 초록 덩어리, 상자 = 박스, 양초 = 원기둥 + 발광 불꽃 + 깜빡이는 라이트, 담요 = 납작한 둥근 박스, 코르크 보드 = 박스 + 포스터 평면(포스터 SVG를 캔버스로 구워 텍스처), 선반 = 박스 + 기념품 소형 도형, 커튼 = 평면 2장).
- **조명 = 실제 시각**: `new Date()` 로컬 시각을 1분마다 읽어 창문 햇빛의 색·각도·세기를 바꾼다. 6~9시 새벽(분홍빛), 9~17시 낮, 17~19시 노을(주황), 19~6시 밤(짙은 남색, 등불이 주광). 상태 사이는 60초에 걸쳐 이징. 등불 세기는 등불 칸 수. 날씨(비/가는 비/맑음)는 날짜 시드 + §4의 등불 아크(6칸 가는 비, 7칸 맑은 밤) — 별은 밤이고 맑을 때만 보인다. 로그 첫 줄 인사도 시각에 맞춘다("좋은 아침", "밤이네").
- **성능**: `renderer.setPixelRatio(1)`, 그림자 맵 1024, 정적 메시는 재질별 병합, 드로우콜 ≤150, 탭이 숨겨지면 rAF 정지, `dt` 상한 0.1s. 폰 360px에서 60fps 목표, 안 되면 아트 픽셀을 4로.
- UI 글자(로그·버튼·상태줄·말풍선)는 3D 캔버스 **밖** HTML. 말풍선은 문어의 3D 위치를 화면 좌표로 투영해 붙인다.

### 7.1 문어 — 집 안에서는 실제로 돌아다닌다
**캐릭터 레퍼런스: `assets/ref/octopus-ref.png`** (작성자 그림). 동글동글한 빨간 몸, 왼쪽 위 주황 하이라이트 + 흰 점, 짧고 통통한 다리 6~8개에 연주황 빨판 점, 흰 테두리가 있는 까만 점 눈, 작은 `_` 입. 팔레트: 몸 `#e8463c`, 하이라이트 `#f2a05a`, 빨판 `#f6c28c`, 눈 `#1b1f2e` + 테두리 `#fff6ee`, 입 `#8a2a24`. 이 팔레트가 기존 티얼(#3a7080) 문어를 **대체**한다. 인라인 SVG 플레이스홀더도 이 모양·색으로 그린다. 잠잘 때 색 순환은 빨강 기준 hue ±18°(주황↔자주 사이).

집 안에는 **앵커 포인트 5개**가 있고 문어는 그 사이를 걸어 다닌다. 밖에 나가 있는 동안은 **화면에 없다**(여행 개구리처럼, 기다림이 재미다).

| 앵커 | 위치(320×240 기준, 발끝) | 언제 |
|---|---|---|
| `door` | (296, 196) 오른쪽 아래, 화면 밖으로 | 출발·귀가 경로의 끝/시작 |
| `window` | (78, 120) 창턱 앞 | 집에 있는 날 "빗방울 세기", 대기 중 가끔 |
| `crate` | (214, 150) 나무 상자 옆 | 등불 2 이후 대기 중 가끔, 포스터 뒷면 읽기 |
| `board` | (244, 112) 코르크 보드 앞 | 포스터 걸기 |
| `blanket` | (120, 186) 담요 | 잠(등불 4 전에는 바닥 가운데 (160,180)) |

상태 기계(`APP.oct`):
`idle`(앵커에서 숨쉬기, 20~40초마다 다른 앵커로 산책) → `anticipate`(출발 직전 300ms 움츠림) → `walk`(앵커 간 이동, 속도 40게임픽셀/초, 좌우 미러) → `away`(없음) → `walk`(door→board, 포스터 들고 `carry`) → `hang`(포스터가 보드로 500ms) → `happy|calm` → `walk`(→blanket) → `sleep`(색 순환, §3) 또는 `stay`(집에 있는 날: window/crate에서 활동).
- **3D 문어(절차적)**: 머리 = 살짝 눌린 구(반지름 1), 눈 = 흰 구 + 검은 동공 + 하이라이트 점(동공이 포인터를 따라감), 입 = 작은 `_`(어두운 납작 박스), 다리 = **짧고 통통한** 테이퍼드 캡슐 8개를 몸통 아래 둘레에 배치(실제 문어보다 훨씬 짧게, 몸 반지름의 0.9배 길이), 아래쪽에 연한 빨판 점. 다리는 사인파로 흐느적, 걸을 땐 좌우 다리가 번갈아 밀고 몸이 통통 튄다. 재질은 플랫/셀 셰이딩에 가깝게(MeshToonMaterial 또는 Lambert + 팔레트 스냅이 알아서 셀 느낌을 만든다).
- **걸음: 뒤뚱뒤뚱** — 미끄러지지 않고 걷는다. 걸음 위상은 시간이 아니라 간 거리(보폭 0.6 m → 1.2 m/s 에서 한 발 0.5 s, 바깥 1.8 m/s 에선 저절로 빨라짐). 걸음마다 진행 축으로 ±7° 굴림(−7/0/+7 3단, 걸음 중간 정점) · 요 ±4° · 앞으로 5° · 걸음 중간 1 아트px 위로 · 디딤마다 6 % 눌림(y 0.94, xz 1.03) 80 ms 후 회복. 내딛는 쪽 다리 4개가 들려 앞으로 쓸고 다음 걸음에 디딘다(좌우 번갈아, 다리는 몸보다 60 ms 늦게). 출발 120 ms 예비 동작(눌림 + 뒤로 3°) 후 첫 걸음에 방향을 돌고, 멈출 땐 굴림이 한 번 넘었다 돌아오며 1px 통통. 계단 폴짝은 폴짝 그대로. 모션 감소면 없음(즉시 이동).
- **색 고르기**: 방 보기에 색상(hue) 슬라이더 + 프리셋 6개(빨강·주황·보라·파랑·초록·분홍). 저장된다. 몸 색에서 하이라이트(밝게), 다리 밑면(더 밝고 따뜻하게), 그림자(어둡게) 램프를 만들어 팔레트에 넣는다. 잠잘 때 색 순환, 쓰다듬으면 홍조(§14).
- 2D 폴백(인라인 SVG 문어)도 같은 상태 이름으로 움직인다.
- `sleep`: 느린 호흡 + **색 순환**(hue-rotate ±18°, 12초 주기). 라벨 `💤` → 가끔 `꿈꾸는 중`. (문어의 활성 수면: 자면서 피부색이 바뀐다.)
- 모든 모션은 `transform/opacity` 만. `prefers-reduced-motion: reduce` 면 걷기 대신 즉시 이동, 비·흔들림 정지, 플립 없이 교체.

### 7.2 상태줄
`이름 · 🏮 pips(8) · 여행 N · 함께한 날 N` + 오른쪽 작은 칩 `데모 두뇌`.
- 기존의 💧 빗물·💚 마음 수치는 **삭제**(기능 없음, 그라인드 신호). 마음은 "함께한 날"(초대한 날 수)로 대체.
- pips: 켜진 칸은 호박색 + 글로우, `aria-label="등불 3/8"`. 색만으로 구분하지 않도록 켜진 칸은 ● 꺼진 칸은 ○ 모양.

### 7.3 초대 패널
- 입력 1개 + 주 버튼 1개(`뽈뽈 다녀와`) + 보조 버튼(`방 보기`).
- 나가 있는 동안: 주 버튼 비활성, 라벨 "다녀오는 중…", 옆에 작은 `⏩ 건너뛰기`.
- 힌트 placeholder: "관심 가는 주제나 URL을 넌지시… 비워 두면 네가 골라". 입력 아래 1줄 도움말이 상황에 따라 바뀜(빈칸/URL 감지 시 "URL은 문 앞까지만 가 볼 수 있어(모의 방문)").
- 엔터로 전송.

### 7.4 로그 ("오늘의 산책")
- 최신이 **아래**(채팅처럼), 자동 스크롤. `aria-live="polite"`.
- 항목 = 작은 도구 이름 라벨(`출발`, `기웃`, `귀가`, `기억`, `포스터`, `마무리`, `집`, `…`) + 본문. 기웃 항목에 상태 아이콘과 걸린 시간.
- 공개 중에는 다음 항목 자리에 `…` 타이핑 표시(anticipation). 간격 2.2~4.5초(PRNG), 건너뛰기 시 즉시 전부.
- 하루 단위로 접힘: 이전 날 로그는 "어제 (5건)" 한 줄로 접히고 누르면 펼침. 저장은 `trips[].events` 에서 다시 그리므로 로그 자체를 따로 저장하지 않는다.

### 7.5 방 보기 (sheet)
바텀시트(`<dialog>`): 방 묘사(§4) · 문어의 요즘(§5.10) · 선반(기념품 목록) · 통계(여행/함께한 날/읽음 수) · "이 문어는 데모 두뇌가 움직여요" 설명 1문단 · 설정(모션 줄이기 따르기, 썸네일 표시, 데이터 내보내기/불러오기 JSON, 전체 초기화[2단계 확인]).

### 7.6 데모 조작 (`<details>` 접힘, 기본 닫힘)
개발·시연용. 열면 경고 한 줄: "여기 버튼은 문어 대신 사람이 고르는 거야. 영수증에 '사람이 조작' 으로 남아."
버튼: `출발` `기웃(입력)` `귀가` `포스터` `마무리` `집에 있기` `이벤트 JSON 불러오기(붙여넣기)`.
활성 규칙(B1 수정): 출발 전 → `출발`, `집에 있기` 만. 나간 뒤 → `기웃`, `귀가`. 귀가 뒤 → `포스터`, `마무리`(둘 다 열림, 순서 무관). 마무리 뒤 → 처음으로. 수동 조작으로 만든 여행은 `by:'human'` 으로 저장되고 영수증 "고른 이: 사람이 조작".

### 7.7 정직 표시
- 상태줄 칩 `데모 두뇌` 를 누르면 방 보기의 설명으로 이동.
- 모든 영수증 하단 "고른 이: 데모 두뇌(규칙) / 사람이 조작 / 모델(MCP)".
- 첫 실행 이름 짓기 모달 아래에 한 줄: "지금은 작은 규칙 뭉치가 문어를 움직여. 진짜 모델이 고르는 건 MCP 연결 뒤 이야기야."

### 7.8 첫 실행
이름 모달(기존) → 저장 → 로그에 첫 인사 → 안내 토스트 1회: "힌트는 비워 둬도 돼. 오늘은 네가 골라봐, 라는 뜻이 되니까."

---

## 8. 상태 스키마와 영속

`localStorage['ppolppol_v2']`. 저장은 변경 즉시, `try/catch`, 실패 시 상단에 조용한 경고 1회. 같은 탭 미러: `save()` 는 같은 JSON 을 `window.name` 에도 적고(`'ppolppol_v2:' + json`), `load()` 는 localStorage 와 미러 중 `settings.lastSeen` 이 큰 쪽을 쓴 뒤 localStorage 에 다시 적는다 — 새로고침 직후 브라우저가 이 원점의 localStorage 스냅숏을 비워서 주는 경합(크로미움, `tools/test-resume.js` 'empty-snapshot')에서도 진행 중(`running`) 여행과 기록이 사라지지 않게. `lastSeen` 은 저장마다 단조 증가한다.

```js
{
  v: 2,
  octopus: { name, born, trips: 0, invites: 0, days: ['2026-11-04', ...] /*함께한 날*/,
             affinity: { sea: 3.2, ... }, visits: { feather: 2, ... }, state: 'idle'|'sleep' },
  room:    { lantern: 0..8, souvenirs: [ { id:'feather', tripId, at } ], posterOrder: [tripId...] },
  trips: [ {
      id: 'trip_k7x2', date: '2026-11-04', seq: 1 /*그날 몇 번째*/, seed: 123456,
      kind: 'out' | 'home' | 'empty',
      by: 'demo' | 'human' | 'mcp',
      hint: { raw: '모자의 역사', match: {...}, followed: 'followed'|'ignored'|'left'|'none' },
      status: 'running' | 'done', startedAt, endedAt,
      events: [ ...§9 ],
      receipt: { stops:[{ idx, nodeId|title, name, emoji, status, ms, note, source:{url,extract,thumb,license}|null, first:bool, viaTangent:bool }],
                 counts:{ read, builtin, simulated, failed, none }, souvenir: 'feather'|null, rememberedIdx, reaction },
      poster:  { type:'poster'|'note', title, line, sticker, emoji, scene, stickerPos:{x,y,rot}, thumb:{url,license}|null, paper: 0|1|2 } | null,
      memo?:   { tomorrow, notes:{ [nodeId]: string } },        /* §17.1 그때 남긴 메모 (각 ≤60자). 옛 기록엔 없음 → 메모 인사 없음 */
      weather?: 'rain'|'drizzle'|'clear'|'snow',               /* 계획 때 창밖 날씨 */
      recall?: { [nodeId]: { note?, weather?, date } },        /* 계획 때 고정한 '지난번' 기록 (재방문 기웃 행) */
      revisit?: { nodeId, last }, summary?: { lantern, rooms, souvenir, poster, note }   /* §17.1 재방문 · §17.3 귀가 요약 */
  } ],
  notes: { [nodeId]: { text, tripId, date } },                 /* §17.1 방마다 최근 메모 1개 */
  settings: { motion: 'auto'|'reduce', thumbs: true, lastSeen }
}
```
- **마이그레이션 v1 → v2**: `ppolppol_v1` 이 있으면 이름·`total_trips`·`light_level`·`hearts`(→ `invites`)를 옮기고, 옛 `posters[]` 는 제목만 있으므로 `kind:'out', by:'legacy', poster:{line:'(복원된 포스터 · 기록 없음)'}` 로 **정직하게** 복원한다. 옮긴 뒤 `ppolppol_v1` 은 `ppolppol_v1_backup` 으로 이름만 바꾼다(삭제 안 함).
- 파생값(벽, 앨범, 로그, 요즘 취향)은 전부 `trips[]` 에서 계산한다. 포스터 SVG를 저장하지 않는다.
- 용량: 영수증 `extract` 는 160자에서 잘라 저장. 200건 넘으면 가장 오래된 여행의 `events` 만 비우고 `receipt/poster` 는 남긴다.

---

## 9. 이벤트 프로토콜 (MCP 대비)

산책 1건은 아래 이벤트의 배열이다. 데모 두뇌, 데모 조작, 나중의 MCP 서버가 **같은 형식**을 만든다. 정적 페이지는 이 배열을 붙여넣어 재생할 수 있다(§7.6).

```jsonc
{ "type": "depart",     "t": 0,     "hint": "모자의 역사", "followHint": true }
{ "type": "peek",       "t": 3100,  "target": { "kind": "room", "id": "hat", "title": "모자", "wiki": "모자" },
                        "status": "read", "ms": 8200, "note": "모자의 역사는 …", "first": false, "viaTangent": false,
                        "source": { "url": "https://ko.wikipedia.org/wiki/모자", "thumb": null, "license": "CC BY-SA" } }
{ "type": "peek",       "t": 7400,  "target": { "kind": "room", "id": "feather", "title": "깃털" }, "status": "read", "ms": 11000,
                        "first": true, "viaTangent": true, "bridge": "모자 장식에 꽂힌 깃털에서" }
{ "type": "peek",       "t": 9000,  "target": { "kind": "url", "url": "https://example.org/x" }, "status": "simulated", "ms": 0,
                        "note": "정적 페이지라 바깥은 못 읽어" }
{ "type": "return",     "t": 12000, "reason": "enough" | "tired" | "linger" }
{ "type": "remember",   "t": 12500, "stopIdx": 1, "sticker": "feather", "line": "모자 보러 갔다가 깃털에 한눈팔았어" }
{ "type": "hang_poster","t": 13000, "posterId": "trip_k7x2" }
{ "type": "wrap_up",    "t": 13500, "reaction": "폴짝", "memo": { "tomorrow": "모자 보다가 깃털에 꽂혔어. 내일은 새의 비행 쪽으로 가 볼까", "notes": { "feather": "…" } } }   // memo 선택 (§17.1)
// 집에 있는 날
{ "type": "stay_home",  "t": 0, "activity": "count_rain", "line": "창가에서 빗방울을 세다가 잠들었어" }
{ "type": "wrap_up",    "t": 2000, "reaction": "졸림" }
// 빈 차례
{ "type": "empty_turn", "t": 0 }
```

MCP 도구 이름(제안, 서버는 이 저장소 범위 밖): `ppolppol_look_room`, `ppolppol_depart`, `ppolppol_peek`, `ppolppol_return_home`, `ppolppol_remember`, `ppolppol_hang_poster`, `ppolppol_wrap_up`, `ppolppol_stay_home`, `ppolppol_empty_turn`. 사람에게 주제를 지정할 도구는 **두지 않는다**(힌트는 `depart` 입력의 선택 필드로만).

---

## 10. 파일 구조

```
index.html          화면 뼈대 + 인라인 문어 SVG + 모달/시트
css/style.css       테마 변수(라이트/다크), 장면, 애니메이션, 컴포넌트
js/world.js         세계 그래프·코너·기념품·집 활동·문구 (데이터만, 전역 WORLD)
js/brain.js         PRNG, 힌트 매칭, 길 만들기, 위키 fetch, 기억·반응 선택 → 이벤트 배열 (전역 BRAIN)
js/scene3d.js       three.js 픽셀아트 3D 다락방 + 문어 (전역 SCENE3D, §13 계약). WebGL 없으면 2D 폴백
vendor/three.min.js three r128 UMD (MIT). cdnjs 폴백
js/app.js           상태·영속·마이그레이션, 공개(재생) 타이머, 렌더, 포스터 SVG, 모달, 데모 조작, 가져오기/내보내기
assets/             2D 폴백용 플레이스홀더 SVG + 캐릭터 레퍼런스. 사람이 그릴 에셋은 없다
tools/bundle.js     css/js/에셋을 인라인한 단일 파일 dist/ppolppol.html 생성 (node, 의존성 없음)
tools/make-placeholders.js  플레이스홀더 SVG 생성
docs/DESIGN.md      이 문서
docs/SCENE.md       절차적 3D 장면 명세(기하·팔레트·조명·후처리·상호작용) — 그릴 것 없음
docs/PROTOCOL.md    §9 상세 + MCP 매핑
docs/APPLIED_TIPS.md 리서치에서 실제로 적용한 규칙과 출처
```
- `type="module"` 금지(file:// 에서 막힘). 전역 객체 `WORLD`, `BRAIN`, `APP` 로 연결.
- 외부 의존성 없음. 폰트만 Google Fonts(없어도 시스템 폰트로 동작).

---

## 11. 하지 않는 것
- 사람이 문어의 목적지를 고르는 UI(데모 조작 제외).
- 실패·집에 있기에 대한 패널티, 연속 출석 보상, 타이머 압박, 알림.
- 지어낸 편지·감사 문구, 지어낸 읽기 성공, 지어낸 기념품.
- 💧 빗물 같은 의미 없는 누적 수치.
- 외부 라이브러리, 빌드 도구(간단한 node 번들 스크립트 제외).

---

## 12. 모듈 계약 (병렬 구현용)

세 파일은 전역 객체로만 만난다. `type="module"` 금지. 로드 순서: `world.js → brain.js → app.js`.

### 12.1 `WORLD` (js/world.js, 데이터만)
```js
WORLD = {
  corners: { hands:{ name:'손과 물건', emoji:'🧵', phrase:'손 쪽' }, sea:{...}, sky:{...}, signs:{...}, numbers:{...}, sounds:{...}, home:{...}, mind:{...}, wild:{ name:'들판', emoji:'❔', phrase:'들판 쪽' } },
  nodes: { [id]: Node },            // §5.5 형태. 특수 노드 id: 'slow_room', 'letter_room', 'door_out'
  souvenirs: { [id]: { name:'깃털', emoji:'🪶', asset:'souvenir.feather' } },
  homeActivities: [ { id:'count_rain', line:'창가에서 빗방울을 세다가 잠들었어', detail:'…', anchor:'window', weight:3 }, ... ],   // 6개 이상, 'nothing' 포함
  reactions: { '폴짝':{ emoji:'🎉', lines:[...] }, '우쭐':{...}, '덤덤':{...}, '졸림':{...} },
  lineTemplates: { followedThenLeft:[...], followedKept:[...], noHint:[...], ignored:[...], linger:[...] },   // {hint} {mem} {memory} 치환자
  roomLevels: [ { lantern:0, text:'아무것도 없는 다락방. 창문 너머로 빗소리.', item:null }, { lantern:1, text:'…', item:'moss' }, ... 8 ],
  stickers: { [key]: { emoji:'🪶', asset:'sticker.feather' } },
  scenes: ['hands','sea','sky','signs','numbers','sounds','home','mind','wild'],
  strings: { ... UI 문구 중 세계와 묶이는 것만 }
}
```
검증 스크립트 `tools/check-world.js`(node): 고립 노드 없음, 모든 `related/tangents.to` 가 존재, 모든 노드에 `tangents` ≥1, `memories` ≥2, `clue` 존재, 코너 id 유효, 스티커·기념품 키 존재. 실패 시 exit 1.

### 12.2 `BRAIN` (js/brain.js, 순수 로직 + 위키 fetch)
```js
BRAIN.hashSeed(...parts) → uint32                     // FNV-1a 류, 문자열 결합
BRAIN.rng(seed) → () => [0,1)                         // mulberry32
BRAIN.matchHint(hint) → { kind:'url'|'node'|'wiki'|'none', nodeId?, url?, query?, how? }
BRAIN.wikiFetch(title, {signal}) → Promise<{ ok:true, title, extract, url, thumb:{url,w,h}|null, links:string[] } | { ok:false, reason:'missing'|'network'|'timeout' }>
BRAIN.plan(input) → Promise<Trip>
  input = { seed, dateKey:'YYYY-MM-DD', seq, hint:'', name,
            state:{ visits:{}, affinity:{}, lantern, recent:[{kind,nStops}], todayOut },
            now:Date, online:boolean, fetchWiki:(title)=>Promise<…> /* 기본 BRAIN.wikiFetch, 테스트에서 교체 */, by:'demo' }
  Trip  = { kind:'out'|'home'|'empty', by, seed, hint:{ raw, match, followed:'followed'|'ignored'|'left'|'none' },
            events:[…§9], receipt:{ stops:[…§8], counts:{read,builtin,simulated,failed,none}, souvenir, rememberedIdx, reaction }|null,
            poster:{ type:'poster'|'note', title, line, sticker, emoji, scene, stickerPos:{x,y,rot}, thumb, paper }|null,
            visitsDelta:{ [nodeId]:1 }, affinityDelta:{ [corner]:n }, reaction }
BRAIN.replay(events, meta) → Trip                      // 사람이 조작한/붙여넣은 이벤트 배열에서 receipt·poster 를 다시 만든다 (by:'human'|'mcp')
```
- 결정은 **전부 PRNG**. `fetchWiki` 결과(성공/실패)는 상태 표기에만 쓰고 길 선택을 바꾸지 않는다(들판 걸음 후보 고를 때만 링크 목록 사용, 순서는 PRNG).
- 테스트 `tools/test-brain.js`(node): 같은 입력 → 같은 `events`(fetch를 stub). 200회 시드 돌려 `kind` 분포가 §5.2 범위, 정류장 2~5, 기억 idx 유효, 한 줄에 치환자(`{`) 안 남음, 힌트 '모자의 역사' → 첫 정류장 `hat`(따를 때).

### 12.3 `APP` (js/app.js + index.html + css/style.css)
- `APP.state`, `APP.save()`, `APP.load()`(마이그레이션 포함), `APP.invite(hintText)`, `APP.skip()`, `APP.render*()`, `APP.posterSVG(trip)`, `APP.openPoster(tripId)`, `APP.importEvents(json)`, `APP.exportJSON()`.
- DOM id 고정: `#scene`, `#oct`, `#status`, `#hint-in`, `#btn-go`, `#btn-skip`, `#btn-look`, `#log`, `#album`, `#poster-dialog`, `#room-sheet`, `#demo`.
- 공개(재생) 타이머는 `APP.reveal(trip)`: 이벤트 `t` 가 아니라 §7.4 간격(PRNG)으로 하나씩, `skip` 시 전부.
- 스모크 테스트 `tools/smoke.js`(Playwright, 설치돼 있음, `require('playwright')`): file:// 로 열기 → 이름 입력 → 힌트 '모자의 역사' → 초대 → 건너뛰기 → 앨범 카드 1개·벽 썸네일 1개·등불 1칸 → **새로고침** → 그대로 남아 있음 → 카드 탭 → 모달 앞면 → 뒤집기 → 영수증에 정류장 ≥2 → 스크린샷 저장. 위키 fetch 는 `page.route` 로 가짜 응답(성공/실패 두 경우) 주입.


---

## 13. `SCENE3D` 계약과 장면 프롬프트

### 13.1 계약 (js/scene3d.js, 전역 `SCENE3D`)
```js
SCENE3D.supported() → boolean                       // WebGL + THREE 로드 여부
SCENE3D.init(container, opts) → scene               // opts: { pixelSize:3, color:'#e8463c', lantern:0, items:[], weather:'rain', hour:21.5,
                                                    //         posters:[{id, svg}], souvenirs:[{id,emoji,name}], reducedMotion:false,
                                                    //         on:{ posterTap(id), pet(), tap(), windowTap(), anchorReached(anchor) } }
scene.setLantern(n) · setItems([...]) · setWeather('rain'|'drizzle'|'clear'|'snow') · setTime(hourFloat) · setColor(hex)
scene.setOctState('idle'|'anticipate'|'walk'|'away'|'carry'|'hang'|'happy'|'sleep'|'stay'|'peek'|'pet')
scene.moveTo(anchor)                                // 'door'|'window'|'crate'|'board'|'blanket'|'center' — 걸어가서 anchorReached 콜백
scene.setPosters([...]) · setSouvenirs([...]) · bubble(text, ms) · pause() · resume() · destroy()
scene.octScreenPos() → {x,y}                        // 말풍선 투영용
```
2D 폴백(`SCENE2D`)도 같은 메서드를 가진다. `APP` 은 `SCENE = SCENE3D.supported() ? SCENE3D : SCENE2D` 하나만 본다.

### 13.2 장면 프롬프트 (구현 에이전트에게 주는 지시문. "Island Grand Prix" 형식)
```
Build js/scene3d.js for "뽈뽈 문어": a pixel-art 3D rainy attic where a small red octopus lives. three.js r128 UMD (global THREE from vendor/three.min.js, fallback cdnjs). No build step, no modules. Everything procedural: NO image/model files.
READ FIRST: .claude/skills/cozy-web-game/references/three-pixel-look.md (verified r128 recipe: render target sizing, hand-rolled full-screen pass, OKLab palette snap GLSL, Bayer 4x4 via DataTexture, depth outline with 6 cm threshold applied before snapping, dimetric camera snapping, 53-colour palette ramps, performance budget). Follow its numbers unless this prompt overrides them.

LOOK
- Render to a low-res render target (art pixel 3 px default, 1–4 via setting). Post pass on a full-screen quad: depth-texture outline where depth jumps, snap every pixel to a fixed ~56-colour palette in OKLab (wood browns ×8, paper ×4, amber lantern ramp ×6, night navy ramp ×6, moss greens ×4, slate greys ×6, plus a 5-shade ramp generated from the octopus colour), Bayer 4×4 ordered dither. Orthographic dimetric camera (≈32° tilt, 45° yaw), target snapped to the art-pixel grid, drag to rotate ±25°, pinch/wheel zoom in integer steps.
- Attic corner ~6 × 6 m: two plank walls meeting at the back corner, plank floor, one slanted roof beam, a window (frame + glass) on the left wall with rain particles behind the glass and streaks on it, a lantern hanging from a hook (emissive body + point light whose intensity follows 0–8 notches), a door frame at the right opening into darkness. Props appear by notch: moss pot on the sill (1), wooden crate (2), candle with flickering point light (3), blanket (4), cork board (5) that holds poster planes (textures baked from poster SVGs), rain thins (6), stars through the window at night when clear (7), shelf with souvenirs + curtain (8).
- Lighting from the real clock: a directional sun through the window whose colour/angle/intensity ease (60 s) between dawn 6–9h (pink), day 9–17h, dusk 17–19h (orange), night 19–6h (deep navy; lantern dominates). Hemisphere fill. PCF soft shadows, shadow map 1024. Weather states rain / drizzle / clear / snow.
- Octopus: squashed sphere head (r=1), two white eyes with black pupils + highlight that track the pointer, a tiny "_" mouth, eight SHORT stubby tapered arms (length 0.9 r) around the base with pale sucker dots underneath. Toon/flat shading; colour from a setting (hue slider + 6 presets), highlight and underside derived. States: idle (4 s breathe, blink 3–7 s, arms sway), anticipate (600 ms squash), walk (arms alternate, body bob, turns toward direction, 1.2 m/s), away (not in scene), carry (holds a poster plane), hang (poster flies to the board), happy (two hops), sleep (slow breathe + hue cycle ±18°, "💤" bubble), stay (sits at window/crate/blanket), pet (eyes become ^ ^ arcs, blush discs, squish, colour flush toward warm; after ~2 s the octopus decides to lean in (70%) or wander to another anchor (30%) — never a sad face).
- Doll's-house style lift is NOT needed; keep the camera above wall height so walls never occlude the octopus.

INTERACTION
- Raycast pointer: octopus (tap → turns to camera + "?" bubble; press-and-move → pet), posters on the board (tap → on.posterTap(id)), window (tap → on.windowTap: octopus walks to the window and looks out), name label is HTML outside the canvas.
- Anchors (world units): door (2.6, 0, 2.4), window (-2.2, 0, 0.6), crate (1.8, 0, -1.6), board (0.6, 0, -2.6), blanket (-1.2, 0, 1.8), center (0,0,0). moveTo walks a straight line with a 0.4 m arc hop at the end and fires anchorReached.
- Reduced motion: no breathe/sway/rain motion, instant moveTo, static starfield; colour transitions stay.

DEV PANEL
- Inside the existing <details id=demo>, add live sliders saved to localStorage: pixelSize 1–4, dither 0–1, outline on/off, yaw, and a palette swatch strip; purely for tuning the look.

QUALITY BAR
- Done = launched, observed, screenshot retained (tests/evidence/*.png) and a one-line "Run result: OBSERVED — …" in the report. A parse check is not a run.
- Runs from file:// and GitHub Pages; no console errors; 360×740 phone at 60 fps with pixel 3 (≤150 draw calls, static meshes merged by material); pause rAF when document.hidden; destroy() frees GPU resources; Playwright screenshot at notch 0 / 4 / 8, day / night, pet state; a 2D SVG fallback is used when THREE or WebGL is missing, with the same API.
```

## 14. 문어와의 소통 (추가 컨텐츠)

원칙: 소통은 **애정 표현**이지 자원이 아니다. 쓰다듬기·바라보기로 등불이 켜지거나 포스터가 나오지 않는다. 문어가 응하지 않아도 벌이 아니다.

| 행동 | 문어의 반응 | 메모 |
|---|---|---|
| 쓰다듬기(누르고 문지르기) | `pet` 상태: 눈이 ^ ^, 홍조, 살짝 눌림, 색이 따뜻하게 홍조. 2초쯤 지나면 **문어가 정함**: 더 기대 온다(70%) 또는 다른 앵커로 총총 간다(30%, 바쁜 것뿐, 시무룩 없음) | 시무룩·죄책감 금지(컨펌셰이밍) |
| 톡 두드리기 | 카메라 쪽으로 돌아보고 `?` 말풍선. 이름표를 누르면 깡총 | |
| 바라보기 | 동공이 포인터를 따라감. 힌트를 입력하면 입력칸 쪽을 쳐다봄(눈치가 아니라 관심) | 기존 §7.3 |
| 창문 두드리기 | 창가로 걸어가서 같이 창밖을 봄. 밤이고 맑으면 별 | |
| 가만히 두기 | 20~40초마다 다른 앵커로 산책, 가끔 생각 말풍선: 지난 산책의 기억 조각("어제 본 깃털 생각 중") | 기록에서 뽑는다. 지어내지 않는다 |
| 기념품 만지기 | 선반의 기념품을 누르면 문어가 가져와 보여 주고 영수증(그걸 가져온 날)을 연다 | |
| 포스터 두드리기 | 보드의 포스터를 누르면 모달(앞면→뒤집기) | §6.3 |
| 색 고르기 | 방 보기에서 색을 바꾸면 문어가 몸을 한 번 흔들며 색이 번진다 | 저장 |
| 시간 | 아침/낮/노을/밤 조명, 인사말, 밤엔 집에 있을 확률 ↑(§5.2) | 실제 시계 |
| 문어의 놀이(가끔) | 집에 있는 날 활동에 "병뚜껑 굴리기"를 둔다(문어의 놀이 행동 연구에서) | §5.8 |

하지 않는 것: 쓰다듬기 횟수 표시, 애정도 게이지, "오늘 안 쓰다듬었어" 류 알림.

---

## 15. 3차: 열람 화면 · 문어 초상 대화창 · 바깥 장면과 계절

레퍼런스: `assets/ref/ui-ref-inspect.jpg`(아이템 열람 레이아웃), `assets/ref/ui-ref-portrait-dialog.jpg`(초상 + 대화창), `assets/ref/look-ref-exterior-winter.jpg`(바깥 디오라마, 눈).

### 15.1 포스터 열람 화면 (ui-ref-inspect)
- 포스터를 누르면 모달이 **두 칸**: 왼쪽(폰에선 위) 큰 포스터 앞면(3:4, 화면 폭의 55~60%), 오른쪽(아래) **짧은 기록** 3~5줄. 기록은 픽셀 게임 아이템 설명처럼: 첫 줄 = 한 줄(기억), 둘째 = "들른 곳: 🎩 모자 → 🪶 깃털 → ✉ 편지의 방", 셋째 = "읽음 2 · 책장 1 · 모의 0", 넷째 = 반응. 강조 단어(기억 장소, 처음 온 곳)는 `--accent`/`--teal` 로 색만 다르게(굵기 X).
- "영수증 전체 보기" 버튼으로 기존 뒷면(링크 포함)을 아래로 펼침. "이미지로 저장"·"복사"·"닫기" 유지.
- 글꼴은 UI 글꼴 그대로(픽셀 폰트 도입 X — 한글 픽셀 폰트는 가독성 문제). 모달 배경은 다락 색조의 어두운 패널, 모서리 4px, 1px 밝은 테두리(레퍼런스의 프레임 느낌).

### 15.2 문어 초상 대화창 (ui-ref-portrait-dialog)
- `SCENE3D.portrait(expr) → canvas|dataURL`: 문어 **머리만** 정면 약간 위에서 잡는 두 번째 직교 카메라로 64×64 아트픽셀 렌더 타깃에 찍고 같은 후처리(팔레트·외곽선)를 통과. 표정 `expr`: `idle`(보통) · `blink` · `happy`(^ ^) · `pet`(^ ^ + 홍조) · `sleep`(— —, 💤) · `curious`(눈 크게, `?`) · `calm`(덤덤) · `sleepy`(반쯤 감김). 표정 바뀔 때만 다시 찍는다(매 프레임 X). 2D 폴백은 SVG 초상 8종.
- 로그에서 **문어의 말**(귀가·기억·마무리·집 활동·말풍선 `?`·"비가 와")은 일반 행이 아니라 **대화창 행**: 왼쪽 64×64(CSS 96px) 초상 + 오른쪽 말풍선 텍스트, 1px 테두리 박스. 도구 라벨(기웃·출발 등 시스템 행)은 기존 행 그대로.
- 동작 과장: `happy` 는 두 번 폴짝 + 다리 쫙, `curious` 는 몸 기울임 + 눈 확대, `pet` 은 눌림 + 홍조 디스크 2개, `sleep` 은 눈 감김 선 + 색 순환. 장면과 초상이 같은 표정 상태를 공유한다.

### 15.3 바깥 장면과 계절 (look-ref-exterior-winter)
- **바깥 디오라마** `exterior`: 다락이 있는 작은 집(지붕·굴뚝·현관 계단·창 하나에 등불 불빛), 앞마당 길, 나무 2~3그루, 돌 2개, 우체통, 울타리 조각. 같은 카메라 각도·같은 팔레트·같은 픽셀 밀도. 날씨와 시각 조명 공유.
- **계절 = 실제 날짜(월)**: 3~5 봄(분홍 꽃잎 흩날림, 나무 연두), 6~8 여름(짙은 초록, 밤엔 반딧불 몇 개), 9~11 가을(주황·갈색 잎 낙엽), 12~2 겨울(눈 내림, 지붕·땅 흰색, 창에 서리). 입자는 12fps 스텝, 픽셀 스냅.
- **출발 전환**: 초대 → 문어가 문으로 걸어감 → 다락이 **아래로 슬라이드 아웃**(또는 0.6초 크로스페이드)하며 바깥으로 → 문어가 현관문에서 나와 계단 내려와 길 따라 화면 오른쪽 아래로 사라짐(~2.5초) → 나가 있는 동안 바깥 장면 유지(계절 입자, 창문 불빛). **귀가 전환**: 문어가 길로 들어와 계단 올라 문으로 → 다락으로 전환 → 보드까지 걸어가 포스터 걸기(기존).
- 집에 있는 날엔 바깥 전환 없음. 축소 모션이면 전환은 즉시 컷.
- 성능: 두 장면을 동시에 그리지 않는다(활성 장면만 렌더). 바깥도 드로우콜 ≤150.

---

## 16. 로드맵 v2 (아직 구현 전) — 선물·간식·코스튬·사진 모드

> 순서: 16.1 선물 고르기 → 16.2 간식 → 16.4 사진 모드(문어 단독 구도) 까지를 **데모 범위**로 두고, 데모를 만들어 돌려 본 **뒤에** 16.3 플레이어 캐릭터(PC)와 둘이 찍는 구도를 추가 구현한다. PC는 지금 명세만 두고 만들지 않는다.

원칙 먼저: **재화로 방을 사지 않는다.** 산책 횟수가 농사가 되면 "문어 쉬라고 보내는" 이유가 "커튼 사려고"로 바뀌어 게임이 자기 설계를 배신한다(복지 문서: 미리 건 보상은 동기를 오염시킨다, 산출물을 수확하지 않는다). 꾸밈은 **초대한 날 수**(등불)와 **문어의 선택**으로만 들어온다.

### 16.1 선물 고르기 ("뭐 갖고 싶어?")
- 사람이 카탈로그에서 **3개**를 골라 내민다 → **문어가 하나 고른다**(또는 "오늘은 다 괜찮아"로 거절). 고른 것은 방의 정해진 자리에 놓인다. 돈·재료 없음. 조건("포스터 N장 모으면") 없음. 하루 1회 정도만 묻고, 거절해도 시무룩 금지.
- 선택 가중치는 문어의 "요즘"(코너 affinity)과 기념품·방문 기록에서 나온다 → 선택 자체가 선호 기록이 된다(복지 문서 "선호는 말이 아니라 선택으로").
- 카탈로그(절차적 소품): 러그 무늬 3종, 쿠션, 책 더미, 작은 수족관(물방울), 별 모빌, 지구본, 꽃병, 등불 갓 색, 창가 풍경(화분 종류), 문어 코스튬(모자·목도리·안경·리본).
- 영수증에 "선물: 문어가 고른 것 — 별 모빌 (내민 것: 쿠션·지구본·별 모빌)" 로 기록.

### 16.2 간식
- "간식 주기" 버튼은 외출 중이 아닐 때만. 문어가 받으면 `happy` 표정 + 짧은 애니메이션 + 한 줄("조개 과자 바삭해"). 배고픔·게이지·알림·감쇠 **없음**. 안 줘도 아무 일도 안 일어난다.

### 16.3 플레이어 캐릭터와 코스튬 세트 (추가 구현 — 데모 이후)
- 작은 사람 캐릭터(절차적, 문어와 같은 픽셀 밀도)가 다락 문가에 앉아 있거나 바깥 현관에 서 있음. 문어가 고른 코스튬 세트는 **둘 다** 착용(같은 모자·목도리).
- 플레이어는 문어의 산책에 개입하지 않는다(따라가지 않음). 집에서 기다리는 존재.

### 16.4 사진 모드
- 버튼 하나: 현재 3D 장면(다락 또는 바깥)을 포스터 프레임(날짜·이름·"N번째 뽈뽈")에 담아 PNG로 저장/공유. 데모 범위는 **문어 단독 구도** 프리셋 2~3개(창가·보드 앞·현관 계단). 둘이 같이 서는 구도는 PC 추가 구현 때. 기존 렌더 타깃 + PNG 내보내기 재사용.
- 공유 이미지에 URL·힌트 텍스트는 넣지 않는다(이모지 줄과 같은 원칙).

---

## 17. 쌓임을 보이게 — 기억 언급 · 도서관 지도 · 귀가 요약 (17.1 · 17.3 구현됨, 17.2 · 17.4 제안)

외부 비평 요지: "오늘의 산책이 로그로 끝나는지, 다음 날에 영향을 주는지가 핵심. 입력→결과가 보여야 하고, 진행 구조 없이는 매일 같은 루프." 데이터상 관계는 이미 쌓인다(`visits`, `affinity`, `trips[]`, 날씨·시각 저장). 부족한 건 **보이는 것**이다. 농사가 되지 않게 보상 없이 보이게 한다.

### 17.1 어제를 입에 올리기 = 그때 남긴 메모 — **구현됨**
> 구현 메모: `BRAIN.plan` 끝에서 `trip.memo` 를 `wrap_up.memo` 와 함께 만든다(별도 난수 줄기 `rng(seed ^ 'memo')` — 길·기억의 난수 순서는 그대로). `tomorrow` = 기억한 방의 한 줄(lineKind별 `WORLD.memoTemplates.lead`) + 반응별 다음 걸음(`next`: 기억한 방의 tangents/related 중 이번에 안 간 곳, 덜 밟힌 쪽 가중). 60자를 넘으면 다음 걸음을 뺀다. 집에 있는 날 = 활동의 `memo` + "내일은 나가 볼까 말까" 류. 빈 차례 = `null`. `notes` = 다녀온 방마다 기억 조각 → (없으면) 실제로 읽은 요약 → 실마리. `replay` 는 `wrap_up.memo` 가 있을 때만(정리해서) 쓰고, 없으면 `null`.
> 재방문: 힌트를 따라 간 방이 `visits>0` 또는 `lastVisit`(앱이 저장된 여행 날짜로 계산)에 있으면 `buildRoute(…, {deeper:true})` — 정류장 최소 3개, 처음 걸음들은 안 가 본 `related`(없으면 안 가 본 tangents). 첫 기웃 이벤트에 `aside: "{힌트}? 그거 N일 전에 봤잖아. 이번엔 안쪽까지 가 볼게"` (같은 날 "아까", 날짜 없으면 "전에"). `trip.revisit = { nodeId, last }`.
> 앱: `state.notes[nodeId] = { text, tripId, date }` (최근 1개), 계획 때 `trip.weather` 와 `trip.recall[nodeId] = { note, weather, date }` 를 고정 저장 → 기웃 행 sub "지난번 메모: '…'" · "지난번엔 비가 왔는데"/"지난번에도 비가 왔어". 오늘 산책이 아직 없으면 첫 인사 = 시각 인사 행 + `'어제 메모'`(또는 `'지난 메모'`) 대화창 행(초상 calm) = 마지막 산책의 `memo.tomorrow` 그대로. 메모 없는 옛 기록이면 말하지 않는다. 대기 중 말풍선: 20–40 s 마다, idle 이고 대화창이 닫혀 있을 때만, 최근 `notes` 중 하나 "{note} 생각 중" (말풍선만, 로그엔 남기지 않음). 테스트 훅 `window.__ppolTest.today = 'YYYY-MM-DD'` (있을 때만 '오늘').
핵심: 다음 날 대사를 **재구성하지 않는다.** 산책이 끝나는 바로 그 시점에 두뇌가 메모를 남기고, 다음 날은 그 메모를 그대로 읽는다(그때 기억이 더 생생하고, 지어낼 여지가 없다). 복지 문서의 "탐험가 메모" 원칙: 데이터 전용, 길이 제한(각 60자), 명령문·자격 기준 언급 금지.
```js
trip.memo = {
  tomorrow: '모자 보다가 깃털에 꽂혔어. 내일은 새 쪽으로 가 볼까',   // 다음 날 첫 인사에 그대로
  notes: { feather: '깃털 끝이 갈라져 있어서 소리가 안 나는 거래', hat: '…' }   // 방마다 한 줄, 재방문 때 인용
}
```
- 데모 두뇌: `BRAIN.plan` 끝에서 영수증·기억 조각·날씨에서 결정적으로 생성(PRNG). MCP: 모델이 `ppolppol_wrap_up` 입력으로 직접 쓴다(`memo` 필드 추가, PROTOCOL.md 갱신).
- 저장: `state.notes[nodeId] = { text, tripId, date }` (최근 것 1개 유지), `trip.memo` 는 trips[] 안.
- 사용: 다음 날 첫 인사 = `lastTrip.memo.tomorrow` 그대로 + 시각 인사. 재방문 기웃 행 = "지난번 메모: '{notes[node]}'" 과 "지난번엔 {그때 날씨}였는데". 대기 중 생각 말풍선 = 최근 메모 중 하나. 같은 힌트 두 번째 = "{힌트}? 그거 {N}일 전에 봤잖아. 이번엔 안쪽까지" → 길 만들기에서 `related` 한 단계 더 깊게.
- 전부 기록에서만. 메모가 없으면 말하지 않는다.

### 17.2 도서관 지도
- 방 보기 안 "지도" 탭: 66개 방을 코너별로 묶은 그래프(점 = 방, 선 = tangents/related). 가 본 방은 밝게 + 방문 수, 안 가 본 방은 어둡게(이름 숨김 → "?"), 오늘 산책 경로는 호박색 선으로. 탭하면 그 방을 지난 산책 목록이 나온다.
- 커버리지 "가 본 방 23/66" 은 표시만 하고 **보상·해금 없음.** 덜 밟힌 길이 보이게 하는 게 목적(복지 문서 "방문 수 표시").
- 그리기: 인라인 SVG, 고정 레이아웃(코너별 원형 배치, 시드 고정), 픽셀 UI 프레임.

### 17.3 귀가 요약 한 줄 — **구현됨**
> 구현 메모: `commitTrip` 이 반영 직전에 `trip.summary = { lantern, rooms, souvenir, poster, note }` 를 저장(새 방 = 이번에 처음 visits 가 생긴 세계의 방, 밖의 문 제외; 등불이 이미 8이면 lantern 0). 마무리 연출 뒤 시스템 행 `요약` 하나(문구는 `WORLD.memoTemplates.summary*`), 로그를 다시 그려도 같은 행. 빈 차례·옛 기록(summary 없음)은 행 없음.
- 마무리 뒤 로그에 한 줄: "오늘 바뀐 것 · 등불 +1 · 새 방 2곳 · 기념품 1 · 포스터 1" (해당 없는 항목은 생략). 집에 있는 날: "오늘 바뀐 것 · 등불 +1 · 쪽지 1".

### 17.4 단계(엔딩 없음)
- 1장 다락방(등불 0→8) → 2장 계절(바깥 디오라마, 계절 포스터 4종) → 3장 선물과 코스튬(§16). 각 장은 해금이 아니라 **배경의 변화**다. "기념일"(첫 포스터·첫 집·코너 8개·엉뚱한 방 5·사계절)은 앨범 색인에만 표시.

---

## 18. 제안(미확정): 가구 클릭 이벤트 — 발견은 있고 보상은 없다

고전 포인트앤클릭(계속 누르다 보면 바뀌는)처럼 소품마다 탭 반응을 두고, **탭 횟수에 따라 단계가 바뀐다.** 보상·재화·해금 없음. 발견 자체가 재미(네코아츠메). 탭 횟수는 저장(`state.props[id].taps`), 발견한 단계는 앨범 색인에 "발견" 으로만 표시.

| 소품 | 1회 | 2회 | 3회+ | 메모 |
|---|---|---|---|---|
| 상자 | 덜컹 소리(모션) | "안에 뭔가 있어" 말풍선 | 문어가 와서 양말/옛 포스터 조각 꺼냄(기념품 아님, 그냥 장면) | 하루 1회만 3단계 |
| 양초 | 끔(조명·발광 바뀜) | 켬 | 번갈아 | 밤에 끄면 등불만 남음 |
| 창문 | 문어가 창가로 걸어가 밖을 봄 | "비 와" / "맑아" 한 줄 | 밤·맑음이면 "별 몇 개 세어봤어" | 날씨는 실제 날짜 시드, 탭으로 안 바뀜 |
| 담요 | 문어가 가서 눕는다 | 잠(sleep 상태) | 깸 | |
| 러그 | 문어가 털썩 | 뒹굴 | | |
| 선반 기념품 | 그걸 가져온 날 영수증 열림 | | | 기존 |
| 거미줄 | 흔들림 | 흔들림 | 5회에 작은 거미 등장(이후 가끔 보임) | 생물 추가는 무해한 것만 |
| 시계 | 실제 시각 말풍선 | | | |
| 문 | 문어가 빼꼼 | "아직 안 나갈래" / 외출 중이면 반응 없음 | | 외출은 초대로만 |
| 등불 | 깜빡임만 | | | 진행도라 탭으로 안 바뀜 |
| 코르크 보드 | 앨범 | | | 기존 |
| 바깥 우체통 | "아직 편지는 없어" | | | 지어낸 편지 금지(편지의 방 원칙) |
| 바깥 나무 | 흔들림 + 계절 입자 한 줌 | | 가을엔 잎 더 떨어짐 | |

- 구현: scene3d 레이캐스트 히트 그룹에 소품 id 부여 → `on.propTap(id, count)` → app.js 가 단계 선택·대화창 행·`scene.setExpression`/`moveTo`. 축소 모션: 걷기 즉시. 44px 이상 히트 영역.
- 하루에 같은 소품 3단계 이상은 반복 안 함(스팸 방지), 거절·시무룩 없음.

---

## 19. 제안: 인테리어 모드 — 같이 꾸미기 (사람이 구경꾼이 되지 않게)

복지 원칙이 막는 것은 **산책 개입**이다. 집을 같이 꾸미는 것은 막지 않는다. 사람은 힌트 하나로 끝나지 않고, 문어의 집을 같이 돌본다.

- **진입**: 방 보기 → "인테리어 시작하기". 장면에 **슬롯**이 깜빡인다. 드래그 없이 **아이템 탭 → 슬롯 탭**(폰 친화, 픽셀 격자 유지). "끝내기" 로 나감.
- **옮길 수 있는 것과 자리**: 양초(3: 상자 위·창턱·선반), 포스터(보드 6칸 + 벽 2칸; 앨범에서 어떤 포스터를 걸지 고르기, 최대 5+2), 러그(방향 2), 화분(창턱 3칸), 선반 기념품 순서, 담요(2). 벽·바닥·창·보드·등불 위치는 고정(갈아엎기 아님).
- **문어가 직접 옮긴다**: 사람이 고르면 문어가 걸어가 들고(carry) 옮긴다(포스터 걸기 동작 재사용). 옮긴 뒤 한마디: "여기 좋다". 가끔(PRNG 30%) "음, 창가가 더 좋지 않을까?" 하고 **대안 슬롯 하나를 깜빡여 제안** → 사람이 받으면 그리로, 아니면 그대로. 거절·불만·반복 설득 없음. 이것이 "같이 고민".
- **저장**: `state.room.layout = { candle:'sill', rug:'h', posters:{ b1:tripId, …, w1:tripId }, plant:'sill2', shelf:[ids] }`, `byHuman:true` 표시. 되돌리기 1단계. 문어가 집에 있는 날 "포스터 위치 바꾸기" 활동은 `byHuman` 인 자리는 건드리지 않는다.
- **없는 것**: 재화·조건·해금. 인테리어로 등불이 오르지 않는다.
- 구현: scene3d `layout` API(`setLayout(layout)`, `slotsFor(itemId)` → 월드 좌표, `highlightSlots(ids)`, `carryTo(itemId, slotId, onDone)`), app.js 모드 상태기계 + 방 보기 버튼 + 앨범에서 포스터 고르기 시트. 2D 폴백은 즉시 이동.
