# 적용한 팁 목록 (APPLIED_TIPS)

리서치 레퍼런스(`.claude/skills/cozy-web-game/references/*.md`)의 규칙 중 **실제 코드에 들어간 것만** 골라, 어디에 들어갔는지 grep 가능한 앵커(파일:식별자)와 함께 적었다. 상태는 2026-11-04 기준 `grep` 으로 확인한 것만 ✅ 로 표시한다.

## 출처 레포 · 글 (스타 수는 레퍼런스 파일에 적힌 2026-11-04 조회값)

| 출처 | 스타 | 레퍼런스 파일 |
|---|---|---|
| https://github.com/thedaviddias/Front-End-Checklist | 74.6k | ui-rules.md |
| https://github.com/AllThingsSmitty/css-protips · https://github.com/argyleink/gui-challenges · https://github.com/Heydon/inclusive-design-checklist | 30.3k · 3.0k · 2.8k | ui-rules.md |
| https://www.refactoringui.com (s0xDk/refactoring-ui-skill 미러 684) | — | ui-rules.md |
| https://lawsofux.com (keysjoao/laws-of-ux-skills 미러 18) | — | ui-rules.md |
| https://www.nngroup.com/articles/empty-state-interface-design/ · https://www.nngroup.com/articles/progressive-disclosure/ · https://www.apple.com/kr/app-store/styles/main.built.css · https://w3c.github.io/wcag/understanding/pointer-target-spacing | — | ui-rules.md |
| https://github.com/emilkowalski/skills (review-animations/STANDARDS.md) | 53.4k | motion-and-feel.md |
| https://github.com/emilkowalski/sonner · https://github.com/material-components/material-web | 13.1k · 11.4k | motion-and-feel.md |
| https://github.com/mdn/content (prefers-reduced-motion, animation performance) | 11.1k | motion-and-feel.md / web-engineering.md |
| https://www.youtube.com/watch?v=AJdEqssNZ-U (Art of Screenshake) · https://www.youtube.com/watch?v=Fy0aCDmgnxg (Juice It or Lose It) | talk | motion-and-feel.md |
| https://github.com/doublespeakgames/adarkroom | 8.4k | companion-loops.md / web-engineering.md |
| https://github.com/YunLambert/TravelFrog_Tool · https://github.com/nuclear-unicorn/kittensgame | 112 · 115 | companion-loops.md |
| https://github.com/bryc/code/blob/master/jshash/PRNGs.md (mulberry32) | 345 | web-engineering.md |
| https://github.com/Modernizr/Modernizr/blob/master/feature-detects/storage/localstorage.js | 25.7k | web-engineering.md |
| https://redux.js.org/style-guide | 61.4k | web-engineering.md |
| https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog · …/Accessibility/ARIA/Guides/Live_regions · …/API/Document/visibilitychange_event · …/CSS/touch-action · …/CSS/env | 11.1k | web-engineering.md |
| https://3dtransforms.desandro.com/card-flip | 1.0k | web-engineering.md |
| https://github.com/mrdoob/three.js/blob/dev/examples/jsm/postprocessing/RenderPixelatedPass.js | — | pixel-look-references.md / three-pixel-look.md |
| https://github.com/KodyJKing/hello-threejs · https://github.com/sloemo01/diorama | 449 · 327 | pixel-look-references.md |
| https://github.com/niccolofanton/dithering-shader | 294 | pixel-look-references.md / three-pixel-look.md |
| https://github.com/WoodNeck/three-pixelate-showcase | 7 | three-pixel-look.md |
| https://github.com/Evercoder/culori (OKLab 계수) · https://github.com/CBerry22/3d-Pixel-Art-In-Godot-4 (외곽선) | — | three-pixel-look.md |

## 규칙별 적용 표

범례: ✅ 적용(grep 확인) · ⚠️ 일부 · ⏳ 예정. "어디에 적용" 칸의 식별자는 그대로 `grep -n` 하면 나온다.

### 1. 루프 · 정직 표기 (companion-loops.md, web-engineering.md)

| 규칙 | 출처 | 어디에 적용(파일:기능) | 상태 |
|---|---|---|---|
| 모든 선택은 시드 PRNG 하나로, `Math.random` 금지 (WE R7, CG R12) | https://github.com/bryc/code/blob/master/jshash/PRNGs.md | `js/brain.js` `function rng(seed)` mulberry32, `hashSeed(dateKey, hintRaw, seq, name)` | ✅ |
| 날짜 키는 로컬 달력 필드로 (WE R8) · 초대 횟수를 시드 소금으로 (WE R9) | https://github.com/doublespeakgames/adarkroom | `js/brain.js` `localDateKey(now)`, `seq` 가 `hashSeed` 인자 | ✅ |
| 가다/집에 있기는 문어의 롤, 집 브랜치는 1급 (CG R2) | TravelFrog_Tool 112★ · https://github.com/YunLambert/TravelFrog_Tool | `js/brain.js` `stayProbability(state, hour)`, `homeActivities(lantern)`, 이벤트 `stay_home` / `empty_turn` | ✅ |
| 힌트는 목적지가 아니라 짐: 노드/엣지 그래프, 한눈팔기 (CG R3) | https://github.com/YunLambert/TravelFrog_Tool | `js/brain.js` `pDistract`, `viaTangent`, `js/world.js` 템플릿 `'{hint} 보러 갔다가 {mem}에 한눈팔았어'` | ✅ |
| 안 가본 길 가중 `1/(1+visits)` + "처음 가본 곳" 표시 (CG R4) | Pikmin Bloom 엽서 (companion-loops S17) | `js/brain.js` `weight(id) { return 1 / (1 + (state.visits[id] || 0)); }`, `first:` 플래그 → `js/app.js` `'처음 온 곳이야'` | ✅ |
| 선호(affinity)는 쌓이되 감쇠 (CG R3, Kittens "reuse resources") | https://github.com/nuclear-unicorn/kittensgame | `js/brain.js` `affinityDelta`, `affinityDecay: 0.9` → `js/app.js` `commitTrip` | ✅ |
| 영수증 상태는 `read / failed / simulated` 명시, URL 모양으로 성공 추정 금지 (WE R11, CG R9) | https://redux.js.org/style-guide | `js/brain.js` `STATUSES = ['read','builtin','simulated','failed','none']`, `applyFetch` → `js/app.js` `STATUS_LABEL` '모의 방문'/'못 읽음' | ✅ |
| 실패·모의는 회색, 빨강 금지, 글리프로 구분 (CG R22, UI R17) | Project Horseshoe "Coziness" (companion-loops S21) | `js/app.js` `STATUS_ICON`, `cls = … 'c-mute'` 주석 "빨강 없음" | ✅ |
| 한 줄은 문어 1인칭, 통계 없음 (CG R11) | Finch (companion-loops S19) | `js/world.js` `lines` 템플릿 뱅크 (`'{hint}, 끝까지 봤어. {memory}'`) | ✅ |
| 등불은 초대마다 +1(가든 집이든), 여행 횟수는 외출만 (CG R16) | https://github.com/doublespeakgames/adarkroom | `js/app.js` `commitTrip`: `if (trip.kind === 'out') o.trips++`; `octopus.invites` | ✅ |
| 방 상태 한 줄 + 방 제목 단계 + `document.title` 반영 (CG R17) | adarkroom `script/room.js` | `js/world.js` `roomLevels[]`, `js/app.js` `roomTitle(lv)` '불씨 하나 켜진 다락→등불 켜진 다락→살림이 생긴 다락→문어의 다락' (0칸에도 등불 속 불씨, 결정 14), `document.title =` | ✅ |
| 등불 칸 켜질 때 문어 목소리로 가구 한 줄 (CG R19) | adarkroom 환경 서사 (companion-loops S12) | `js/app.js` `ITEM_LINE` ('창턱에 이끼 화분을 올려뒀어') | ✅ |
| 의미 있을 때만 UI 노출: 첫 포스터 전 앨범 숨김, 첫 뒤집기까지만 힌트, 여행 수는 첫 외출 후 (CG R18) | adarkroom "check traps" | `index.html` `#album-sec hidden`, `js/app.js` `sec.hidden = !all.length`, `pd-hint`, `stat-trips.hidden` | ✅ |
| 진행 중 여행은 다음 열기에 즉시 해소, 대기 강요 없음 (CG R6, R24) | Neko Atsume (companion-loops S9) | `js/app.js` `resumeRunning()` → `status === 'running'` 트립을 `online:false` 로 완결, '네가 없는 동안 다녀왔어' | ⚠️ 해소는 되지만 타이머가 `Date.now()-departedAt` 파생이 아니라 `setTimeout` 체인; `#btn-skip` 건너뛰기 버튼이 있음 |
| 감쇠·굶주림·스트릭·"자리 비움" 화면 없음 (CG R20) | Tamagotchi 비판 (companion-loops S20) | `js/app.js` `S.octopus.days[]` 는 누적만; `streak`/`decay` 식별자 없음(grep 0건) | ✅ |
| 저장 = 버전 봉투 하나, try/catch, 마이그레이션 체인 (WE R1) | https://github.com/doublespeakgames/adarkroom | `js/app.js` `KEY = 'ppolppol_v2'`, `migrateV1(raw)`, `normalize(`, `js/world.js` `version: 2` | ✅ |
| 저장소 기능 감지 → 메모리 폴백, 쿼터 초과는 오래된 이벤트 비우기 (WE R2, R3) | https://github.com/Modernizr/Modernizr/blob/master/feature-detects/storage/localstorage.js | `js/app.js` `storeOK` probe(setItem/removeItem), `isQuota(e)`, `QuotaExceededError` | ✅ |
| 포스터 정면 = 장면·스티커·한 줄, 뒷면 = 영수증 (CG R8, R9) | TravelFrog_Tool · Pikmin Bloom | `js/app.js` `posterSVG(`, `.flipper .face.back` 영수증 `receipt` | ✅ |
| 스포일러 없는 공유 한 줄 + 복사 (CG R14) | Wordle (companion-loops S15) | `js/app.js` `shareLine(trip)`, `navigator.clipboard.writeText`, `legacyCopy` | ✅ |

### 2. UI (ui-rules.md)

| 규칙 | 출처 | 어디에 적용(파일:기능) | 상태 |
|---|---|---|---|
| 화면에 채운 버튼은 하나, 데모 조작은 `<details>` 뒤로 (UI R1, R2) | https://www.refactoringui.com · https://www.nngroup.com/articles/progressive-disclosure/ | `index.html` `#btn-go class="btn primary"`, `<details id="demo">`; `js/app.js` `demoEl.addEventListener('toggle'` → `setUiPref('demoOpen'` | ✅ |
| 한글 `word-break: keep-all` + `overflow-wrap: anywhere`, body line-height 1.65 (UI R10) | https://www.apple.com/kr/app-store/styles/main.built.css | `css/style.css` `line-height: 1.65`, `.lbl, .help, .ltext, .big-line … { word-break: keep-all; overflow-wrap: anywhere; }` | ✅ |
| ~~이모지는 장식: `aria-hidden` span (UI R12)~~ **옛** → 이모지 없이 글자나 픽셀 그림만 (주인 11-07). 그림은 장식이라 `alt=""` + `aria-hidden`, 옆 글자는 남긴다 | https://github.com/Heydon/inclusive-design-checklist | `js/ui-art.js` `iconSrc` / `icon` / `iconHTML` (못 불러오면 지움); `js/app.js` `ico` / `icoH`; `tools/smoke.js` U (화면 글자 지킴이) | ✅ (11-07) |
| 토스트는 `<output aria-live=polite>` 하나, 2.5초 (UI R21) | https://github.com/argyleink/gui-challenges | `index.html` `<output id="toast" aria-live="polite">`, `js/app.js` `toast(msg)` `2500` | ✅ |
| 로그는 초기 마크업에 있는 `role="log" aria-live="polite"` (UI R21, WE R13) | https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions | `index.html` `<div id="log" role="log" aria-live="polite" tabindex="0">` | ✅ |
| 탭 타깃 44px, 입력 16px(iOS 줌 방지), 보이는 포커스, `user-scalable=no` 금지 (UI R18, R29) | https://w3c.github.io/wcag/understanding/pointer-target-spacing · css-protips 30.3k | `css/style.css` `min-height: 44px; … font-size: 16px`, `:focus-visible { outline: 2px solid var(--amber)`; `index.html` viewport 에 `user-scalable` 없음 | ✅ |
| 빈 상태는 문어 목소리로 "상태 + 다음 할 일" (UI R23) | https://www.nngroup.com/articles/empty-state-interface-design/ | `js/app.js` `.lempty` '아직 붙인 포스터가 없어. 힌트를 두고 뽈뽈 다녀와를 눌러 봐 (비워 둬도 돼).' | ✅ |
| 레이아웃 시프트 방지 `aspect-ratio` (UI R8) | css-protips 30.3k · Front-End-Checklist 74.6k | `css/style.css` `.pcard … aspect-ratio: 3 / 4`, `.flipper … aspect-ratio: 3 / 4` | ✅ |
| 눌렀을 때 400ms 안에 첫 반응 (UI R19, Doherty) | https://lawsofux.com | `js/app.js` 주석 "누른 지 400ms 안에 로그에 첫 반응 (UI R19)" → `logRow('…','…','typing pre'` | ✅ |
| 네이티브 `<dialog>` + `showModal` + 포커스 복귀 + `closedby` (UI R28, WE R14) | https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog | `index.html` `<dialog id="poster-dialog"`, `<dialog id="settings-sheet" class="sheet settings-sheet"`, `<dialog id="album-sheet" class="sheet album-sheet"`; `js/app.js` `dlg.showModal()`, `setAttribute('closedby', 'any')`, `o.focus({ preventScroll: true })` | ✅ |
| 좁은 화면은 바텀 시트(손잡이, safe-area), 넓은 화면은 중앙 다이얼로그 (UI R28) | Jakob's Law · https://lawsofux.com | `css/style.css` `.sheet … border-radius: 16px 16px 0 0 … env(safe-area-inset-bottom`, `index.html` `.handle aria-hidden` | ✅ |
| 토큰은 `:root`, 다크는 `prefers-color-scheme` + `data-theme` 2중 가드 (UI R30, WE R18) | Front-End-Checklist 74.6k · https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme | `index.html` `<meta name="color-scheme" content="light dark">`; `css/style.css` `:root:not([data-theme="light"])`, `:root[data-theme="dark"]` | ⚠️ CSS 훅만 있고 `js/app.js` 에 테마 3단 스위치(자동/밝게/어둡게) 없음 |
| 라벨은 마지막 수단: "등불 3/8", "여행 7" (UI R4) | https://www.refactoringui.com | `js/world.js` `lanternLabel: function (n) { return '등불 ' + n + '/8'; }`, `js/app.js` `'여행 ' + S.octopus.trips` | ✅ |
| Von Restorff: 최신 포스터만 표시·회전 (UI R5) | https://lawsofux.com | `js/app.js` `' newest'` 클래스, `setProperty('--rot'` | ✅ |

### 3. 모션 (motion-and-feel.md)

| 규칙 | 출처 | 어디에 적용(파일:기능) | 상태 |
|---|---|---|---|
| 토큰 시트 하나: `--t-press/--t-ui/--t-scene/--t-ceremony` + 4개 이징, 컴포넌트에 생 ms 없음 (GF R1) | https://github.com/emilkowalski/skills · https://github.com/material-components/material-web | `css/style.css` `--t-press: calc(150ms * var(--speed))`, `--t-ui`, `--t-scene`, `--t-ceremony`, `--ease-out/--ease-enter/--ease-exit` | ✅ |
| 들어올 땐 ease-out, 나갈 땐 가속·더 짧게 (GF R2) | https://github.com/emilkowalski/sonner | `css/style.css` `#toast … var(--ease-exit) … /* 나갈 땐 짧게 */`, `#toast.show … var(--ease-enter)` | ✅ |
| transform/opacity 만 애니메이션 (GF R3, WE R19) | https://github.com/mdn/content (animation performance) | `css/style.css` 헤더 주석 "transform/opacity 만 애니메이션"; `.pressable { transition: transform …}`, `.pip … opacity` | ✅ |
| 모션 감소 = 줄이되 없애지 않기, JS 는 `matchMedia` + `change` (GF R5) | https://github.com/mdn/content (prefers-reduced-motion) | `css/style.css` `@media (prefers-reduced-motion: reduce) { :root:not([data-motion="auto"]) { --t-press: 0ms; --t-ui: 120ms …`; `js/app.js` `matchMedia('(prefers-reduced-motion: reduce)')`, `mq.addEventListener('change', applyMotion)`, 설정 `S.settings.motion` | ✅ |
| 누름 피드백 `scale(.97)` 150ms, hover 는 `(hover:hover) and (pointer:fine)` 게이트 (GF R7) | https://github.com/emilkowalski/skills | `css/style.css` `.pressable:active { transform: scale(.97); }`, `@media (hover: hover) and (pointer: fine)` | ✅ |
| 출발 전 예비 동작(움츠림) → 집에 있으면 1.03 오버슛 settle (GF R8) | Disney 12원칙 · Juice It or Lose It | `css/style.css` `#oct.settle #oct-inner { animation: settle … }` 주석 "1.03 overshoot"; `js/app.js` `settleOct()` | ✅ |
| 버튼은 비활성 회색 대신 "다녀오는 중…" 알약으로 변신 (GF R10) | https://github.com/emilkowalski/skills | `js/app.js` `go.classList.toggle('away', on)`, `'다녀오는 중…'`; `css/style.css` `--t-morph` | ✅ |
| 로그 행 opacity+translateY 250ms, 60ms 스태거(상한) (GF R11) | https://github.com/juliangarnier/anime (stagger) | `css/style.css` `.lrow.in { animation: row-in var(--t-ui) … animation-delay: calc(var(--i, 0) * var(--t-stagger)) }`; `js/app.js` `Math.min(burst.n + 1, 5)` | ✅ |
| 자동 스크롤은 읽는 사람이 40px 넘게 올려두지 않았을 때만, 러프 (GF R13) | Art of Screenshake (camera lerp) · https://www.youtube.com/watch?v=AJdEqssNZ-U | `js/app.js` `scrollLog()`, `logStick = … <= 40` | ✅ |
| 포스터 걸기: 상승 500ms → 최종 ±3° → 스티커 150ms 뒤 (GF R15) | Juice It or Lose It · https://www.youtube.com/watch?v=Fy0aCDmgnxg | `css/style.css` `.pcard.in { animation: card-in var(--t-scene) … rotate(var(--rot` , `.pcard.in svg .stk { animation: stk-in …}`; `js/app.js` `--rot` ±3° 주석 "GF R15" | ✅ |
| 뒤집기 `rotateY` 500ms, `preserve-3d`, `backface-visibility`, 두 번째는 300ms (GF R16, R6) | https://3dtransforms.desandro.com/card-flip | `css/style.css` `.flipper … perspective: 900px`, `backface-visibility: hidden`, `.flipper.flip .face.front { transform: rotateY(-180deg) }`; `js/app.js` `flippedOnce` "GF R6" | ✅ |
| 영속성: 저장된 포스터는 리로드 때 애니메이션 없음, 최신 것만 (GF R17) | Art of Screenshake "permanence" | `js/app.js` `isNew = t.id === lastNewPoster` 에만 `' in'` 클래스 | ✅ |
| 등불 칸: 500ms ease-enter, 8번째는 더 긴 bloom (GF R18) | https://github.com/emilkowalski/skills | `css/style.css` `.pip … transition … var(--ease-enter)`, `.pip.bloom`, `--t-bloom`; `js/app.js` `p.classList.toggle('last', i === 7)` | ✅ |
| 공개 순서: 로그 끝 → 포스터(절정) → 토스트 → 등불 칸(끝) (UI R25 Peak-End) | https://lawsofux.com | `js/app.js` 세레모니 체인 `revealing.ceremony` → `toast('새 포스터 · ' …)` → `wait(400)` | ✅ |
| 데모용 느리게 보기(`--speed` 배수) (GF R21) | https://github.com/emilkowalski/skills | `css/style.css` 모든 토큰이 `calc(… * var(--speed))`; `js/app.js` `speed()` | ✅ |

### 4. 엔지니어링 (web-engineering.md)

| 규칙 | 출처 | 어디에 적용(파일:기능) | 상태 |
|---|---|---|---|
| `visibilitychange → hidden` 에 저장, `beforeunload` 의존 금지 (WE R4) | https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event | `js/app.js` `document.addEventListener('visibilitychange', function () { if (document.hidden && S.octopus.name) save(); })` | ✅ |
| `storage` 이벤트로 탭 간 동기화 (WE R5) | https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event | `js/app.js` `S = normalize(JSON.parse(e.newValue))` (storage 리스너) | ✅ |
| 이벤트 로그(append-only) + 순수 리듀서/리플레이 (WE R10) | https://redux.js.org/style-guide · https://guide.elm-lang.org/architecture/ | `js/brain.js` `replay(events, meta)`, 트립 `events[]`; `js/app.js` `B.replay(demo.events, meta)` | ✅ |
| 모든 컨트롤 `touch-action: manipulation`, transform 전용 `:active` (WE R16) | https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action | `css/style.css` `button, input, textarea, select { … touch-action: manipulation; }` | ✅ |
| `viewport-fit=cover` + `env(safe-area-inset-*)` (WE R17) | https://developer.mozilla.org/en-US/docs/Web/CSS/env | `index.html` `viewport-fit=cover`; `css/style.css` `padding-bottom: max(12px, env(safe-area-inset-bottom, 0px))` | ✅ |
| 상대 경로만, `file://` 에서 `fetch` 금지 (WE R23) | https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages | `js/app.js` `location.protocol === 'file:'` 이면 매니페스트 fetch 생략, `'assets/manifest.json'` 상대 경로 | ✅ |
| 공유 이미지: SVG → canvas → `toBlob` → `navigator.share` (WE R21) | https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share | `index.html` `#pd-save` '이미지로 저장' 버튼 존재; `navigator.share` 식별자는 `js/app.js` 에 없음 | ⚠️ 저장만, share 시트 없음 |
| `manifest.webmanifest` + 아이콘 (WE R24) | https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable | 없음 (`index.html` 에 `rel="manifest"` 0건) | ⏳ |

### 5. 픽셀 룩 (three-pixel-look.md, pixel-look-references.md — 자세한 패스 기록은 docs/LOOK_LOG.md)

| 규칙 | 출처 | 어디에 적용(파일:기능) | 상태 |
|---|---|---|---|
| 저해상 렌더 타깃 `floor(W/p)` + Nearest 업스케일, `setPixelRatio(1)`, `antialias:false` (3PL §1, §8) | https://github.com/mrdoob/three.js/blob/dev/examples/jsm/postprocessing/RenderPixelatedPass.js · https://github.com/KodyJKing/hello-threejs | `js/scene3d.js` `rw = Math.max(8, Math.floor(W / p))`, `NearestFilter`, `renderer.setPixelRatio(1)`, `antialias: false … powerPreference: 'low-power'`, `imageRendering = 'pixelated'` | ✅ |
| 깊이 텍스처 + 노멀 패스로 외곽선(멀면 어두운 선, 꺾이면 밝은 선) (3PL §4.5) | RenderPixelatedPass · https://github.com/CBerry22/3d-Pixel-Art-In-Godot-4 | `js/scene3d.js` `new T.DepthTexture(`, `tNormal`, 주석 "RenderPixelatedPass 규칙", `uOutline` | ✅ |
| OKLab 팔레트 스냅, 팔레트는 코드로 생성 (3PL §4.2, §6) | https://github.com/Evercoder/culori · https://github.com/sloemo01/diorama | `js/scene3d.js` `hexToOklab`, `oklabToLin`, `uPalOk`, `uPalN`, `buildPalette`, `ramp` | ✅ |
| Bayer 4×4 게이트 디더 (3PL §4.3) | https://github.com/niccolofanton/dithering-shader · https://github.com/WoodNeck/three-pixelate-showcase | `js/scene3d.js` `function bayerTex()`, GLSL `bayer(ap) * uDither * mix(0.12, 1.0, gate)` | ✅ |
| 직교 카메라 + 픽셀 스냅 (3PL §5) | RenderPixelatedPass | `js/scene3d.js` `new T.OrthographicCamera(`, `snapPos(v) … PX_PER_M` | ✅ |
| 낮/밤은 조명 비율만 바꾸고 색 정리는 팔레트에 맡김 (3PL §7, PLR "낮=따뜻한 키+차가운 헤미") | https://github.com/sloemo01/diorama | `js/scene3d.js` `day/dawn/dusk/night` 프리셋, `HemisphereLight`, `lerpC(` | ✅ |
| 성능: 섀도 1024 하나, idle 30fps, `document.hidden` 이면 멈춤, dt 상한 0.1s (3PL §8) | https://github.com/sloemo01/diorama | `js/scene3d.js` `shadow.mapSize.set(1024, 1024)`, `if (idle && (frameNo & 1)) return; /* 30fps */`, `Math.min(0.1, (ts - lastT) / 1000)`, `visibilitychange` | ✅ |
| 모션 감소: 디더 0, 먼지 끄기 (3PL §9) | https://github.com/mdn/content | `js/scene3d.js` `ditherNow() { return st.reduced ? 0 : …}`, `dust.visible = on && !st.reduced`, `setReducedMotion` | ✅ |
| WebGL 없음 → 2D 폴백, `webglcontextlost` 처리, `destroy()` dispose (3PL §9) | https://github.com/mdn/content | `js/scene3d.js` `supported()`, `'webglcontextlost'` / `'webglcontextrestored'`, `renderer.forceContextLoss()`; `js/app.js` `SCENE3D … SCENE2D` 브리지 | ✅ |
| 드로우콜 ≤ 150 단언 + 스크린샷 증거 (3PL §8, §10) | https://github.com/sloemo01/diorama | `js/scene3d.js` `renderer.info.render.calls`; `tools/evidence3d.js`, `tests/evidence/look/` | ✅ |

## 일부러 안 한 것

- **하루 한 번 모드** (CG R13, Wordle/동물의 숲): 데모·시연 단계에서는 여러 번 눌러 봐야 루프가 보인다. 시드가 날짜+힌트+회차라서 "같은 날 같은 힌트 = 같은 산책" 재현성은 이미 있다. 설정으로 켜는 형태로 보류.
- **희귀 티어·달팽이 손님** (CG R10, R23): `js/brain.js`·`js/world.js` 에 `rare`/`손님` 식별자 없음. 희귀는 에셋(손그림 포스터 프레임, 손님 스프라이트)이 먼저 있어야 티가 난다. 손그림 패스 뒤로.
- **사운드** (GF R22): 기본 무음·옵트인이 원칙이라 지금은 채널 자체를 넣지 않았다. 토스트·등불 bloom 이 두 번째 채널 역할을 대신한다.
- **테마 3단 스위치** (UI R30): CSS 훅(`data-theme`)은 두었지만 UI 는 모션 설정만 먼저 넣었다. 다크 팔레트가 한 번 더 다듬어진 뒤에 노출.
- **`Date.now()-departedAt` 파생 타이머** (CG R24): 지금은 `setTimeout` 체인 + 리로드 시 즉시 해소로 충분하다고 판단. 백그라운드 탭에서 결과가 달라지지는 않는다(계획은 시드로 미리 정해짐).
- **PWA 매니페스트 / `navigator.share`** (WE R21, R24): GitHub Pages 배포 확정 뒤에.

## 더 보기

- `docs/LOOK_LOOP.md` — 픽셀 룩을 올리는 반복 절차(한 패스에 레버 하나)
- `docs/LOOK_LOG.md` — 패스별 전/후 스크린샷·메트릭 기록
- `docs/DESIGN.md` — 설계 명세(루프·상태·정직 표기 원칙)
