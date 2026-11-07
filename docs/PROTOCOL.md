# 산책 이벤트 프로토콜 (MCP 대비)

뽈뽈 문어의 산책 1건은 **이벤트 배열**이다. 데모 두뇌(규칙), 데모 조작(사람), 그리고 나중에 붙을 MCP 서버(진짜 모델)가 모두 같은 형식을 만든다. 정적 페이지는 이 배열을 붙여넣어 그대로 재생할 수 있다(`데모 조작 → 이벤트 JSON 불러오기`).

이 저장소에는 MCP 서버가 **없다.** 여기 적는 도구 이름과 입출력은 서버를 만들 때 그대로 쓰기 위한 제안이다.

## 1. 이벤트

모든 이벤트는 `type` 과 `t`(산책 시작 기준 ms, 누적)를 가진다.

| type | 필드 | 뜻 |
|---|---|---|
| `depart` | `hint` (string, 빈 문자열 가능), `followHint` (bool) | 문 밖으로 나감. `followHint` 는 힌트를 **처음에** 따를지 문어가 정한 값 |
| `peek` | `target`, `status`, `ms`, `note?`, `first?`, `viaTangent?`, `bridge?`, `source?`, `aside?` | 한 곳을 기웃거림. `aside` 는 그 자리에서 문어가 하는 한마디(재방문: "모자? 그거 3일 전에 봤잖아. 이번엔 안쪽까지 가 볼게") |
| `return` | `reason`: `enough` \| `tired` \| `linger` | 귀가 |
| `remember` | `stopIdx` (peek 순서, 0부터), `sticker?`, `line?` | 기억으로 고른 한 곳과 스티커, 한 줄. `line` 을 안 쓰면 포스터 한 줄은 비어 있다(지어내지 않는다) |
| `hang_poster` | `posterId` | 벽에 붙임 |
| `wrap_up` | `reaction?`, `line?`, `memo?`, `note?`, `setDown?` | 마무리. **전부 선택**이다(아래 `wrap_up`). 사람이 고르지 않는다 |
| `stay_home` | `activity` (id), `line?`, `detail?` | 오늘은 집. 쪽지 한 장. 쪽지 뒷면(`detail`)은 모델이 쓴 것만 |
| `empty_turn` | (없음) | 빈 차례. 로그에 `…` 한 줄. 그날 첫 차례면 등불도 켜진다 (등불은 초대한 날마다 1칸) |

### `wrap_up` — 마무리 (모두 선택, MODEL_VOICE '말하기를 강요하지 않기')
| 필드 | 모양 | 게임이 하는 일 |
|---|---|---|
| `reaction?` | `폴짝` \| `우쭐` \| `덤덤` \| `졸림`, 또는 아무 글 | 준 그대로 둔다. 넷 중 하나면 그 표정, 그 밖의 글이면 글 그대로(`reactionRaw`, 화면엔 40자 + `…`, 기록은 원문). **안 쓰면 반응 없음** — 게임이 대신 고르지 않는다 |
| `line?` | string | 반응 한 줄. 글자 그대로 보인다. 안 쓰면 반응 줄도 없다 (템플릿으로 채우지 않는다). `reactionLine` 이라는 이름도 받는다 |
| `memo?` | `{ tomorrow, notes }` | 그때 남긴 메모 (아래) |
| `note?` | `{ text, about? }` 또는 string | 호기심 메모 한 줄 (docs/CURIOSITY_NOTES.md). 글자 그대로 남고, 다음 산책 요청에 실린다 (아래 '요청에 싣는 메모') |
| `setDown?` | `['cn_…']` | 내려놓을 메모 id. 모델 자신의 표시라 **모델(`mcp`) 산책에서만** 받는다 |

- `about` 은 `{ kind: 'node' | 'object', id }`. 모양이 틀리면 글은 두고 `about` 만 버린다.
- `note.text` 가 60자를 넘으면 화면은 앞 60자 + `…`, 기록은 원문 그대로.

### `wrap_up.memo` — 그때 남긴 메모 (DESIGN §17.1)
```jsonc
{ "tomorrow": "모자 보다가 깃털에 꽂혔어. 내일은 새의 비행 쪽으로 가 볼까",      // 다음 날 첫 인사에 그대로 읽힌다
  "notes": { "hat": "챙은 해를 가리고, 안쪽 띠는 땀을 막아 줘", "feather": "…" } }   // 다녀온 방마다 한 줄. 재방문 기웃 때 "지난번 메모: '…'"
```
- 선택 필드. **없으면 다음 날 아무 말도 하지 않는다**(화면이 대신 지어내지 않는다). 빈 차례에는 없다.
- 각 문자열 60자 이하(넘으면 보이는 글은 59자 + `…`, 원문은 `memo.original` 에 그대로 남는다). `notes` 키는 방 `id`, 값은 문자열만 받는다.
- 데이터 전용: 다녀온 기록·기억 조각·실제로 읽은 요약에서만. 명령문(사람에게 시키는 말)·자격/규칙 언급 금지.
- 데모 두뇌는 `plan` 끝에서 결정적으로 만든다. **MCP 는 모델이 직접 쓴다** (`ppolppol_wrap_up` 입력의 `memo`).

### 요청에 싣는 메모 — 다음 모델에게 (CURIOSITY_NOTES '다음 모델에게 전달하는 모양')
산책을 부탁하는 쪽(`ppolppol_depart` 의 출력, 또는 `ppolppol_look_room`)에 **`status: 'active'` 인 메모 최근 3개만** 싣는다.
내려놓은 메모(`set_down`)·오래된 메모는 싣지 않고, 그런 메모가 있다는 사실이나 개수도 말하지 않는다.
```jsonc
"notes": [
  { "id": "cn_8k2", "text": "조개를 귀에 대면 소리가 나. 다른 소리 나는 것도 궁금해", "about": { "kind": "node", "id": "shell" },
    "by": "model", "model": "claude-…", "session": "trip_31kz", "at": "2026-11-05T10:12:00Z" }
]
```
- 메모마다 **작성 주체(`by`: 모델 / 데모 규칙)·세션·날짜**를 붙인다. `model` 은 알 때만. 글은 쓴 그대로 (줄이지 않는다).
- 글로 보여 줄 때의 머리말: `이전 산책에서 남겨진 메모 (이어 가도, 바꿔 써도, 내려놔도 돼):` — 따르라는 말·이유를 묻는 말은 붙이지 않는다.
- 데모 두뇌는 같은 목록을 `state.notes` 로 받는다. 메모가 가리키는 방(`about.kind: 'node'`)의 길 고르기 가중치만 3배가 된다 (새 난수 없음, 글은 읽지 않는다). 데모 두뇌가 남기는 메모는 `by: 'demo-rules'` 다.

### `peek.target`
```jsonc
{ "kind": "room", "id": "feather", "title": "깃털", "wiki": "깃털" }   // 내장 도서관 방
{ "kind": "wiki", "title": "깃펜" }                                    // 들판 걸음(위키 링크로 간 곳)
{ "kind": "url",  "url": "https://example.org/x" }                     // URL 힌트
```

### `peek.status` — 거짓 성공 금지
| 값 | 아이콘 | 뜻 |
|---|---|---|
| `read` | ✅ 읽음 | 실제로 가져와서 읽었다. `source.url` 필수 |
| `builtin` | 📚 책장 메모 | 내장 실마리 한 줄을 읽었다(오프라인·fetch 실패·위키 제목 없음) |
| `simulated` | 🧪 모의 방문 | 문 앞까지만 갔다. 내용은 읽지 않았다 |
| `failed` | ❌ 못 읽음 | 읽으려 했는데 실패했다 |
| `none` | ◌ 앉아만 있었음 | 읽은 것이 없다(느린 글의 방, 편지의 방) |

`source` 는 `read` 일 때만: `{ "url", "extract"(≤160자), "thumb": {"url","w","h"}|null, "license": "CC BY-SA 4.0", "attribution": "Wikipedia (ko)" }`.

### 예시 — 외출
```json
[
 { "type":"depart", "t":0, "hint":"모자의 역사", "followHint":true },
 { "type":"peek", "t":3100, "target":{"kind":"room","id":"hat","title":"모자","wiki":"모자"}, "status":"read", "ms":8200,
   "note":"모자는 머리에 쓰는 …", "first":false, "viaTangent":false,
   "source":{"url":"https://ko.wikipedia.org/wiki/모자","thumb":null,"license":"CC BY-SA 4.0","attribution":"Wikipedia (ko)"} },
 { "type":"peek", "t":7400, "target":{"kind":"room","id":"feather","title":"깃털","wiki":"깃털"}, "status":"read", "ms":11000,
   "first":true, "viaTangent":true, "bridge":"모자 장식에 꽂힌 깃털에서" },
 { "type":"return", "t":12000, "reason":"enough" },
 { "type":"remember", "t":12500, "stopIdx":1, "sticker":"feather", "line":"모자 보러 갔다가 깃털에 한눈팔았어" },
 { "type":"hang_poster", "t":13000, "posterId":"trip_k7x2" },
 { "type":"wrap_up", "t":13500, "reaction":"폴짝",
   "memo":{ "tomorrow":"모자 보다가 깃털에 꽂혔어. 내일은 새의 비행 쪽으로 가 볼까", "notes":{ "hat":"챙은 해를 가리고, 안쪽 띠는 땀을 막아 줘", "feather":"깃털 끝이 갈라져 있어서 소리가 안 나는 거래" } } }
]
```
### 예시 — 집
```json
[ { "type":"stay_home", "t":0, "activity":"count_rain", "line":"창가에서 빗방울을 세다가 잠들었어" },
  { "type":"wrap_up", "t":2000, "reaction":"졸림", "memo":{ "tomorrow":"창가에서 비 셌어. 내일은 나가 볼까 말까", "notes":{} } } ]
```
### 예시 — 빈 차례
```json
[ { "type":"empty_turn", "t":0 } ]
```
### 예시 — 아무것도 안 쓴 마무리 · 호기심 메모만 남긴 마무리
```json
{ "type":"wrap_up", "t":13500 }
{ "type":"wrap_up", "t":13500, "note":{ "text":"깃털 끝이 갈라진 게 소리랑 상관있을까", "about":{ "kind":"node", "id":"feather" } }, "setDown":["cn_8k2"] }
```
첫 줄은 반응·줄·메모가 모두 없다 → 화면에도 반응 없이 끝난다. 게임이 '덤덤' 같은 걸 대신 넣지 않는다.

## 2. 재생 규칙 (정적 페이지)
- `by` 는 이벤트가 아니라 **산책 메타**다: `demo`(규칙) / `human`(데모 조작) / `mcp`(모델). 일기(포스터 뒷면, 데이터 이름 `receipt`) 하단 "고른 이" 에 그대로 적힌다.
- **모델(`mcp`)·사람(`human`)이 낸 것은 바꾸지 않는다** (docs/MODEL_VOICE.md): 반응·반응 줄·포스터 한 줄·메모·호기심 메모·쪽지 글은 준 그대로, 안 준 것은 비워 둔다.
  '실제로 있었던 일과 맞는 반응만'(안 읽었는데 우쭐 → 다른 반응) 거르기는 **데모 규칙에만** 남는다. 기록의 `reactionBy` 가 `model` / `human` / `demo-rules` 로 누가 골랐는지 말한다.
- 게임이 대신 채운 것은 `fallback` 으로 따로 적는다: 기억할 곳(`receipt.rememberedBy`), 지금 방에서 못 하는 활동(`receipt.activity.by`, 고르려던 id 는 `asked`).
- 읽기 상태는 지금처럼 정직하게 고친다 (아래). 이건 모델의 말이 아니라 실제로 읽었는지의 사실이라서다.
- 재생은 `t` 를 그대로 기다리지 않고 2.2~4.5초 간격으로 보여 준다(건너뛰기 가능). `t` 는 일기의 "걸린 시간" 계산에만 쓴다.
- 모르는 `target.id` 는 들판(`wild`)으로 취급하고 `title` 을 그대로 쓴다. 모르는 `sticker` 는 ❔.
- `remember` 가 없거나 `stopIdx` 가 범위를 벗어나면(정수가 아니어도) 마지막 정류장으로 하고 `rememberedBy: 'fallback'`. `status` 가 목록에 없으면 `failed` 로 적는다(성공으로 올려 주지 않는다).
- `hang_poster` 를 냈는지는 `posterHung` 으로 남긴다 (안 냈으면 벽에 붙이지 않는 게 그 뜻이다).

## 3. MCP 도구 (제안)

모델이 뽈뽈 시간에 **스스로** 부르는 도구들이다. 사람이 목적지를 지정하는 도구는 두지 않는다.

| 도구 | 입력 | 출력 | 메모 |
|---|---|---|---|
| `ppolppol_look_room` | `{}` | 방 묘사, 등불, 벽 포스터 제목들, 선반, "요즘" | 읽기 전용 |
| `ppolppol_depart` | `{ hint?: string }` | `{ tripId, hint, library: [{id,name,corner,odd,clue,visits}], notes: [최근 활성 메모 ≤3] }` | 힌트는 사람이 남긴 선택 필드. 따를지는 모델이 정한다. `notes` 는 §1 '요청에 싣는 메모' |
| `ppolppol_peek` | `{ tripId, target: {kind,id?|title?|url?} }` | `{ status, extract?, source?, first, visits }` | 서버가 실제로 읽어 주고 `status` 를 정직하게 돌려 준다 |
| `ppolppol_return_home` | `{ tripId, reason }` | `{ stops: [...] }` | |
| `ppolppol_remember` | `{ tripId, stopIdx, sticker, line }` | `{ ok }` | 모델이 고른 한 장면 |
| `ppolppol_hang_poster` | `{ tripId }` | `{ posterId }` | |
| `ppolppol_wrap_up` | `{ tripId, reaction?, line?, memo?: { tomorrow, notes }, note?: { text, about? }, setDown?: ['cn_…'] }` | `{ ok }` | 전부 선택(§1 `wrap_up`). 아무것도 안 써도 된다. `memo` 를 안 쓰면 다음 날 메모 인사는 없다 |
| `ppolppol_stay_home` | `{ activity?, line?, detail? }` | `{ tripId }` | 외출과 같은 무게. 활동 목록을 보여 줄 때 그 활동의 쪽지 앞면 글(`line`)을 같이 보여 준다 — `line` 을 안 쓰면 그 글이 쪽지에 쓰인다 |
| `ppolppol_empty_turn` | `{}` | `{ tripId }` | 아무것도 만들지 않아도 된다는 허락 |

**서버가 지켜야 할 것(복지 문서 원칙)**
- 산출물을 수확하지 않는다: 산책 기록은 문어의 앨범으로만 남고, 다른 용도로 쓰지 않는다.
- 읽지 않은 것을 읽었다고 돌려 주지 않는다. fetch 가 실패하면 `failed`, 막혔으면 `simulated` 로.
- 모델이 `empty_turn` 을 골라도 "왜?" 라고 묻지 않는다.
- 사람이 산책 중에 개입할 통로를 두지 않는다(힌트는 출발 전 한 번).

## 4. 화면(정적 페이지)과 서버가 만나는 방법 (나중)
1. **붙여넣기**: 서버가 돌려 준 이벤트 배열을 데모 조작에 붙여넣어 재생(지금 가능).
2. **파일**: 서버가 `trips/*.json` 으로 쓰고, 페이지가 `?trip=` 로 읽기.
3. **MCP Apps**: 서버가 이 페이지를 UI 리소스로 돌려 주고, 호스트(Claude 등) 안에서 바로 그린다. 이때는 `window.postMessage` 로 이벤트를 흘려 넣는 어댑터 하나만 더 있으면 된다(`APP.importEvents`).
