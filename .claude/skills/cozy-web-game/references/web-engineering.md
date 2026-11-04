# 뽈뽈 문어 — Static single-file web game engineering dossier

Angle: engineering rules for a single `index.html` game that must run from `file://` and GitHub Pages, phone-first (360px), light/dark, Korean fonts, no build, with a wall of posters that must still be there tomorrow.

Research date: 2026-11-04. Star counts were read live through `gh api search/repositories`. Several documentation hosts (developer.mozilla.org, web.dev, webkit.org, css-tricks.com, w3.org, redux.js.org, martinfowler.com) are not reachable from this session, so where possible their content was read from the **GitHub source repositories** (mdn/content, reduxjs/redux, evancz/guide.elm-lang.org, w3c/aria-practices, Modernizr, GoogleChrome/web.dev) instead; those are the same texts that render on the public sites. Anything not read directly is marked *(search summary only)*.

---

## 1. Sources

| Source | URL | Stars | Why it matters here |
|---|---|---|---|
| bryc/code — `jshash/PRNGs.md` (mulberry32, sfc32, splitmix32, xmur3) | https://github.com/bryc/code/blob/master/jshash/PRNGs.md | 345 | The canonical public-domain JS PRNG page; read directly |
| redblobgames gist — sfc32 adapted from bryc, with 12-round warm-up and get/setState | https://gist.github.com/redblobgames/2a48f1b55528a3c23b3824a9a3314fa4 | gist (n/a); redblobgames/mapgen4 948 | Shows seed scrambling + serialisable PRNG state |
| davidbau/seedrandom | https://github.com/davidbau/seedrandom | 2.1k | The widely-used alternative if a library is acceptable (it is not needed here) |
| doublespeakgames/adarkroom — `script/engine.js`, `script/state_manager.js` | https://github.com/doublespeakgames/adarkroom | 8.4k | Real shipped save system: `localStorage.gameState`, `updateOldState()` version chain, try/catch on load, base64 export/import |
| Modernizr — `feature-detects/storage/localstorage.js` | https://github.com/Modernizr/Modernizr/blob/master/feature-detects/storage/localstorage.js | 25.7k | The reference feature-detect (setItem/removeItem inside try/catch) |
| localForage | https://github.com/localForage/localForage | 25.8k | Context only: shows how big the "storage is flaky" problem is; not used |
| MDN (mdn/content) — Storage quotas and eviction | https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria | mdn/content 11.1k | 5 MiB/origin, `QuotaExceededError`, Safari 7-day script-storage eviction, private mode |
| MDN — `Window.localStorage` | https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage | 11.1k | `SecurityError` on `file:`/blocked storage; file: behaviour "undefined and varies" |
| MDN — `storage` event | https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event | 11.1k | Cross-tab sync |
| MDN — ARIA live regions | https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions | 11.1k | `role="log"` + redundant `aria-live="polite"`, region must pre-exist |
| MDN — `<dialog>` | https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog | 11.1k | `showModal()`, `::backdrop`, `autofocus`, `cancel`, `closedby`, `form method=dialog` |
| W3C WAI-ARIA APG — Modal dialog pattern | https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ | w3c/aria-practices 1.4k | Focus return to invoker, Tab trapping, aria-labelledby |
| MDN — `<details>` | https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/details | 11.1k | `toggle` event, `name` exclusive accordion, `::details-content` |
| MDN — `prefers-reduced-motion` | https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion | 11.1k | Replace pulse with dissolve; source-order override |
| web.dev (GoogleChrome/web.dev) — prefers-reduced-motion article (Thomas Steiner) | https://web.dev/articles/prefers-reduced-motion | 3.6k | `matchMedia` + `change` listener; JS animations do not auto-update |
| MDN — `prefers-color-scheme`, `color-scheme`, `light-dark()` | https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme | 11.1k | `<meta name="color-scheme">` before CSS avoids flash; `only` |
| MDN — `env()` | https://developer.mozilla.org/en-US/docs/Web/CSS/env | 11.1k | `calc(1em + env(safe-area-inset-bottom))`, fallback syntax |
| MDN — `touch-action` | https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action | 11.1k | `manipulation` removes double-tap zoom and the click delay |
| WCAG 2.2 — 2.5.8 Target Size (Minimum) *(search summary only)* | https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html | w3c/wcag (unverified) | 24×24 AA, 44×44 AAA (2.5.5); Apple HIG 44pt |
| desandro/3dtransforms — "Card flip" | https://3dtransforms.desandro.com/card-flip | 1.0k | The reference 3D card-flip CSS (file listed in repo; body not fetchable from this session, pattern reproduced from the well-known doc) |
| MDN — `backface-visibility` | https://developer.mozilla.org/en-US/docs/Web/CSS/backface-visibility | 11.1k | Needs `perspective` on container + `transform-style: preserve-3d` |
| web.dev — "How to create high-performance CSS animations" *(search summary only)* | https://web.dev/articles/animations-guide | 3.6k | transform/opacity only; `will-change` sparingly, add/remove via JS |
| MDN — `requestAnimationFrame` | https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame | 11.1k | Timestamp-based progress; paused in background tabs |
| MDN — `visibilitychange` | https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event | 11.1k | Save on hidden, not on unload |
| MDN — `FontFaceSet.load()` / `.ready` | https://developer.mozilla.org/en-US/docs/Web/API/FontFaceSet/load | 11.1k | `document.fonts.load('16px "Noto Serif KR"', '한글')` before canvas text |
| MDN — "SVG as an image" | https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_as_an_Image | 11.1k | No external fonts/CSS/images inside `<img>`/`drawImage`; inline as `data:` |
| MDN — `canvas.toBlob()` | https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob | 11.1k | async PNG, `SecurityError` on tainted canvas, don't revoke object URL too early |
| MDN — `navigator.share()` | https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share | 11.1k | Needs user activation; `canShare({files})`; `AbortError` on cancel |
| MDN — Web app manifest / Making PWAs installable | https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable | 11.1k | name, 192+512 icons, start_url, display; HTTPS; no SW required |
| Chromium blink-dev "Intent to deprecate: SMIL" (2015) + W3C www-svg suspension (Aug 2016) *(search summary)* | https://groups.google.com/a/chromium.org/g/blink-dev/c/5o0yiO440LM | — | SMIL survives but is frozen in time; CSS is the default |
| Redux Style Guide (reduxjs/redux `docs/style-guide/style-guide.md`) | https://redux.js.org/style-guide | 61.4k | "Model actions as events, not setters"; reducers pure, serialisable state |
| The Elm Architecture (evancz/guide.elm-lang.org) | https://guide.elm-lang.org/architecture/ | elm/core 2.8k | Model / View / Update loop for a tiny state module |
| html-to-image / snapdom / dom-to-image | https://github.com/bubkoo/html-to-image | 7.3k / 8.2k / 10.8k | Reference implementations of DOM→SVG `foreignObject`→canvas (and why fonts break there) |
| Smashing Magazine — "S(GH)PA: the single-page app hack for GitHub Pages" *(search summary)* | https://www.smashingmagazine.com/2016/08/sghpa-single-page-app-hack-github-pages/ | — | Project sites live under `/repo/`; use relative paths |
| GitHub docs — What is GitHub Pages (github/docs) | https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages | — | Project sites served at `owner.github.io/repo` |

---

## 2. The rules

Each rule: **WHY** (what the source says / what breaks) and **APPLY** (the exact element in 뽈뽈 문어).

### A. Storage: the wall must still be there tomorrow

**R1. One versioned envelope under one key, parsed in try/catch, migrated by a fall-through chain. (must)**
WHY — A Dark Room (8.4k★) stores the whole game as `localStorage.gameState = JSON.stringify(State)`; on load it does `JSON.parse` inside `try { ... $SM.updateOldState(); } catch(e) { State = {}; ... 'new game' }`. `updateOldState()` reads `version` (defaulting to `1.0` if missing) and applies sequential `if (version == 1.0) {...; version = 1.1} if (version == 1.1) {...}` blocks, ending with `$SM.set('version', 1.3)`. That is the entire migration system of a game that has lived for a decade. The npm/handbook pattern surveyed ("store a version alongside the data, run a migration when older") is identical.
APPLY — Key `ppolppol:v1` (or a single `ppolppol` key whose JSON has `schema: 1`). `load()` returns `migrate(JSON.parse(raw))` or a fresh `initialState()` on any throw. `migrate` is a `while (s.schema < CURRENT) s = MIGRATIONS[s.schema](s)` chain; the first migration turns today's HTML's loose `trips` counter into `{trips: [...], invites: n}`.

**R2. Feature-detect storage with setItem/removeItem in try/catch and degrade to an in-memory store; never let a storage failure block "뽈뽈 다녀와". (must)**
WHY — Modernizr's (25.7k★) detect is literally `try { localStorage.setItem(k,k); localStorage.removeItem(k); return true } catch(e) { return false }`, with comments that iOS Private Browsing throws `QUOTA_EXCEEDED_ERR` on `setItem` while `getItem`/`removeItem` do not throw, and Firefox with cookies disabled throws on *access*. MDN adds `SecurityError` when the origin "is not a valid scheme/host/port tuple (this can happen if the origin uses the `file:` scheme)" and that `file:` behaviour "is undefined and may vary". Search confirms Safari once threw `SecurityError: The operation is insecure` on non-served pages.
APPLY — `const store = (() => { try { const k='__t'; localStorage.setItem(k,'1'); localStorage.removeItem(k); return localStorage } catch { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k,v) => m.set(k,v), removeItem: k => m.delete(k) } } })();`. If the fallback is active, show a tiny line under the wall: "이 브라우저에선 벽이 오늘만 남아요" — no modal, no shaming.

**R3. Wrap every write in try/catch and handle `QuotaExceededError` by trimming the oldest receipts, not by failing the trip. (must)**
WHY — MDN: Web Storage is about 5 MiB per origin and "browsers throw a `QuotaExceededError`" when full; it recommends freeing space first. A Dark Room's `saveGame` has *no* try/catch, which is the one thing not to copy.
APPLY — `save(state)` does `try { store.setItem(KEY, JSON.stringify(state)) } catch (e) { if (isQuota(e)) { state = dropOldestReceipts(state, 10); retry once } }`. The poster front (scene id, sticker id, one-liner) is small; the receipt back (every URL, failures) is what grows, so trim receipts before posters.

**R4. Save on `visibilitychange → hidden`, plus right after each state transition; do not rely on `beforeunload`. (should)**
WHY — MDN: hidden is "the last event that's reliably observable by the page", and it recommends `visibilitychange` over `beforeunload`/`unload`; it also says to pause UI updates while hidden.
APPLY — `document.addEventListener('visibilitychange', () => { if (document.hidden) { save(state); rain.pause() } else rain.resume() })`. Also save at the end of every reducer call (cheap at this size).

**R5. Listen to the `storage` event so two open tabs agree about the wall. (nice)**
WHY — MDN: the `storage` event fires in every *other* same-origin tab when `localStorage` changes, never in the writer.
APPLY — `addEventListener('storage', e => { if (e.key === KEY) { state = load(); render(state) } })`. Prevents the "I hung a poster in tab A and tab B overwrote it" bug.

**R6. Offer base64 export/import of the whole save (a "짐 싸기" line in demo controls). (nice)**
WHY — A Dark Room's `export64/import64` base64-encode `localStorage.gameState`; Cookie Clicker's save is a base64 string with a version prefix. Safari's ITP deletes script-writable storage after 7 days without interaction (MDN), so a long-absent player can lose the wall; export is the escape hatch.
APPLY — `btoa(unescape(encodeURIComponent(JSON.stringify(state))))` → textarea; import validates `schema` and runs `migrate` before replacing.

### B. Determinism: same day + same hint = same walk

**R7. Route every random choice through one seeded PRNG; never call `Math.random` in game logic. (must)**
WHY — bryc's PRNGs.md: use a separate hash to seed the state ("similar seeds can cause correlations in weaker PRNGs"); sfc32 has 128-bit state and is the page's recommendation, mulberry32 is 32-bit and "skips about a third of all 32-bit values" (so prefer sfc32 or splitmix32). Red Blob's gist adds `for (let i=0;i<12;i++) sfc32();` to scramble the seed and exposes `getState/setState`. The procedural-generation guidance surveyed says the single seeded generator "is what makes your world reproducible".
APPLY — Ship bryc's `xmur3` + `sfc32` verbatim (public domain):
```js
function xmur3(str){for(var i=0,h=1779033703^str.length;i<str.length;i++)h=Math.imul(h^str.charCodeAt(i),3432918353),h=h<<13|h>>>19;return function(){h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);return(h^=h>>>16)>>>0}}
function sfc32(a,b,c,d){return function(){a|=0;b|=0;c|=0;d|=0;var t=(a+b|0)+d|0;d=d+1|0;a=b^b>>>9;b=c+(c<<3)|0;c=c<<21|c>>>11;c=c+t|0;return(t>>>0)/4294967296}}
function rngFor(seedStr){const s=xmur3(seedStr);const r=sfc32(s(),s(),s(),s());for(let i=0;i<12;i++)r();return r}
```
`const rng = rngFor(`${dayKey}|${hint.trim()}|${tripIndex}`)`. Every decision — go/stay, hop count, which "odd room", sticker, one-liner — pulls from `rng()`. Store the seed string in the trip record so the receipt back can show "seed: 2026-11-04|모자의 역사|3" and an MCP server can replay it.

**R8. Derive the day key from *local* calendar fields, never from `toISOString()`. (must)**
WHY — The date-pitfall articles surveyed agree: `toISOString()` is always UTC, so a seed built from it rolls over at UTC midnight (09:00 KST) not at the player's midnight; date-only strings (`'2026-11-04'`) parse as UTC while local getters shift the day. Daily-puzzle guides note that local midnight means players in different zones get "different days"; for a private companion that is the *desired* behaviour (the octopus's day is the human's day), unlike Wordle.
APPLY — `const dayKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}``. Never `new Date(dayKey)`; store `dayKey` as a string and compare strings. Test with `TZ=America/Los_Angeles node` and `TZ=Asia/Seoul node` around DST.

**R9. Keep the invitation count, not the date, as the "seed salt" so two invitations on one day give two different walks. (should)**
WHY — The user's feedback explicitly asks that "같은 테마로 두 번 보내도 서로 다른 포스터를 기다리게". Determinism per (day, hint) alone would make a second identical hint produce the identical poster.
APPLY — Seed = `dayKey + '|' + hint + '|' + state.invites.length`. Reproducible, yet every invite differs.

### C. State shape: append-only log, derived view

**R10. Persist an append-only `events` array; derive lantern, trips, furniture and the wall from it with a pure reducer. (must)**
WHY — Redux Style Guide (61.4k★): "treat actions more as 'describing events that occurred', rather than 'setters'"; "put as much of the logic for calculating a new state into the appropriate reducer"; reducers "should only depend on their state and action arguments"; "avoid putting non-serializable values" in state. Event-sourcing summaries (Fowler via secondary sources): current state is "a fold over an append-only log of facts", and "replay rebuilds state by applying events in sequence to a blank starting point"; snapshots are an optional optimisation. The Elm Architecture names the same three parts — Model, Update, View — and notes Redux was inspired by it.
APPLY — Event types: `invited {dayKey, hint, seed}`, `decided {choice:'go'|'stay'}`, `hopped {url, status:'read'|'failed'|'simulated', title}`, `returned {}`, `remembered {sceneIdx, sticker, line}`, `posted {wallPos}`. `function reduce(s, e)` is pure; `state = events.reduce(reduce, initial())`. Lantern notches = `count(invited)` (capped 8), trip count = `count(decided.go)`, moss pot appears at `invites >= 1`. This directly fixes "집에 있기로 한 날에도 등불 한 칸" and "여행 횟수는 실제 외출에만", and gives the later MCP server a protocol: it only has to emit the same events.

**R11. Write a receipt entry for every hop with an explicit `status` of `read | failed | simulated`; never infer success from the URL shape. (must)**
WHY — User bug #3: "존재하지 않는 URL도 https://로 시작하면 ✅ 200". From `file://` and GitHub Pages a browser `fetch()` to arbitrary sites is blocked by CORS, so the page *cannot* really read; honesty requires labelling. Redux: non-serialisable (a Promise, a Response) never goes in state; store the outcome string.
APPLY — Demo mode records `status:'simulated'` and the receipt back renders a dotted "모의 방문" row with no check mark; a real `read` only comes from an MCP/server event. Failures are kept and shown ("읽기 실패 — 그래도 들렀어").

**R12. Structure the single file as six labelled sections, with the state module and pure `render(state)` kept apart from DOM event wiring. (should)**
WHY — The one-file-no-build write-up surveyed says it stays manageable because "the state is small and writes happen in obvious places. Render functions just manipulate the DOM"; the vanilla-SPA sources converge on a single state object + a setter that re-renders; Elm's loop is "view produces messages, update produces new model".
APPLY — `<!-- 1 CSS tokens --> <!-- 2 CSS components --> <!-- 3 markup --> <script> /* 4 data: rooms, stickers, lines */ /* 5 state: events, reduce, load/save/migrate, rng */ /* 6 render: renderLantern, renderWall, renderLog, renderPoster; then wire() */ </script>`. `render*` functions take `state` and return nothing else; handlers call `dispatch(event)` which appends, saves, renders.

### D. Accessibility and touch

**R13. Make the log a `role="log" aria-live="polite"` region that exists in the initial markup, and append `<li>` nodes to it. (must)**
WHY — MDN live regions: "Establish the live region before updating its content"; `role="log"` is an implicit live region and MDN says "To maximize compatibility, add a redundant aria-live='polite'". Polite waits for idle speech, which suits a tool-call log that appends a line every ~700 ms. `aria-atomic` default `false` means only the new entry is read.
APPLY — `<ol id="log" role="log" aria-live="polite"></ol>` present at load; each hop appends `<li>`. The "뽈뽈 다녀와" button gets `aria-busy="true"` during the walk. Do *not* use `aria-live="assertive"` for the octopus's return.

**R14. Use the native `<dialog>` for the poster viewer (front/back) and the receipt; open with `showModal()`, label with `aria-labelledby`, return focus to the tapped poster. (must)**
WHY — MDN `<dialog>`: `showModal()` gives inertness, Escape via `cancel`, `::backdrop`, `aria-modal=true`; put `autofocus` on the control the user will most likely use; never add `tabindex` to `<dialog>`; `closedby="any"` for light dismiss. WAI-APG modal pattern: "When a dialog closes, focus returns to the element that invoked the dialog"; Tab wraps inside; name via `aria-labelledby` pointing at the visible title.
APPLY — `<dialog id="poster-view" closedby="any" aria-labelledby="poster-title">` containing the flip card and a `<form method="dialog"><button autofocus>닫기</button></form>`. On `close`, `lastOpener?.focus()`. Posters on the wall are `<button>`s (not divs) so they are reachable by keyboard.

**R15. Fold demo controls into `<details>`, remember its `open` state via the `toggle` event, and give it a `name` so only one tool drawer opens at a time. (should)**
WHY — MDN `<details>`: native disclosure, keyboard (Space) and screen-reader semantics for free; `toggle` fires after state change (coalesced); the `name` attribute makes an exclusive accordion; `::details-content` lets the open/close animate. User feedback: "지금의 수동 버튼들은 데모 조작으로 접어두고요".
APPLY — `<details class="demo" name="drawer"><summary>데모 조작</summary> …외출/귀가/모의 방문 buttons… </details>`. Persist `open` under a *per-viewer* key (`ppolppol:ui:demoOpen`) separate from the game save, in try/catch (R2).

**R16. Every tappable control is at least 44×44 CSS px, with `touch-action: manipulation`, `-webkit-tap-highlight-color: transparent`, and a transform-only `:active` press. (must)**
WHY — WCAG 2.5.8 (AA, 2.2) requires 24×24 or spacing; 2.5.5 (AAA) and Apple HIG recommend 44×44 pt *(search summary)*. MDN `touch-action: manipulation` "disable[s] additional non-standard gestures such as double-tap to zoom" and "removes the need for browsers to delay the generation of click events". Pressed states via `transform`/`box-shadow` are compositor-friendly (web.dev animations guide).
APPLY — `.btn{min-height:44px;min-width:44px;touch-action:manipulation;-webkit-tap-highlight-color:transparent} .btn:active{transform:scale(.97)}`. The wall's small poster thumbnails stay ≥44px tall; sticker picker (if ever exposed in demo) gets 48px cells.

**R17. `viewport-fit=cover` plus `env(safe-area-inset-*)` padding on the sticky bottom bar that holds "뽈뽈 다녀와". (should)**
WHY — MDN `env()`: insets are 0 on rectangular viewports, px>0 otherwise; the documented footer pattern is `padding: 1em 1em calc(1em + env(safe-area-inset-bottom))`; fallback syntax `env(safe-area-inset-bottom, 0px)`; names are case-sensitive.
APPLY — `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`; `.depart-bar{position:sticky;bottom:0;padding:12px 16px calc(12px + env(safe-area-inset-bottom,0px))}`. Side gutters `max(16px, env(safe-area-inset-left))`.

### E. Theme and motion

**R18. Declare `<meta name="color-scheme" content="light dark">` before any CSS, define tokens on `:root`, override under `prefers-color-scheme: dark` guarded by `:root:not([data-theme=light])`, and again under `:root[data-theme=dark]`. (must)**
WHY — MDN `color-scheme`: putting the meta in `<head>` before CSS lets the UA pick the scheme early and "prevent a flash"; it also recolours form controls, scrollbars and system colours; `light-dark()` compacts two-scheme tokens; `only` blocks Chrome Auto Dark. `prefers-color-scheme: light` also matches "no active preference", so dark must be the override, not the default.
APPLY — `:root{--paper:#f7f3ea;--ink:#2b2a28;--lamp:#f3c66b}` then `@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--paper:#1b1d22;…}}` and `:root[data-theme="dark"]{…}`. The attic's rainy-night palette is the dark set; the lantern token drives the 8-notch glow. A tiny toggle writes `data-theme` and stores it per viewer (try/catch).

**R19. Rain, lantern flicker and poster flip are all `transform`/`opacity`-only, run on `requestAnimationFrame` with timestamp deltas, pause on hidden, and degrade under `prefers-reduced-motion`. (must)**
WHY — web.dev animations guide: restrict animation to `opacity` and `transform` to stay on the compositor; "use `will-change` sparingly, and only if you encounter a performance issue", applying it from JS just before the change. MDN rAF: compute progress from the timestamp or elapsed time, since the callback is one-shot and "most browsers pause these callbacks in background tabs". Canvas-loop sources: cap `dt` (e.g. 0.1 s) and reset the previous timestamp on `visibilitychange`; keep particle counts modest (<100); size the canvas buffer by `devicePixelRatio`. MDN `prefers-reduced-motion`'s own example swaps a scaling pulse for an opacity dissolve; web.dev: CSS updates automatically but JS animations must listen to `matchMedia('(prefers-reduced-motion: reduce)')` `change`.
APPLY — Rain = one `<canvas>` at `dpr` scale, ≤80 drops, `dt = Math.min(0.1, (t-last)/1000)`, `cancelAnimationFrame` on hidden. Under `reduce`: rain becomes a static drizzle texture (opacity 0.4), lantern flicker becomes a slow opacity breathe, the poster flip becomes a 0 ms cross-fade (`.card{transition:none}` + swap `aria-hidden` of faces). Octopus idle bob uses `@media (prefers-reduced-motion:no-preference){ .octo{animation:bob 4s ease-in-out infinite} }` (opt-in form).

**R20. Poster flip: `perspective` on the scene, `transform-style: preserve-3d` on the card, `backface-visibility: hidden` on both faces, back face pre-rotated `rotateY(180deg)`, toggle `.is-flipped` → `rotateY(180deg)`. (should)**
WHY — desandro/3dtransforms (1.0k★) is the canonical card-flip write-up; MDN `backface-visibility` confirms it "has no effect on 2D transforms" so `perspective` on the container is required, and its demo pre-rotates the back face with `rotateY(180deg)`. The user feedback puts the "scene + sticker + one-liner" on the front and the receipt on the back.
APPLY —
```css
.scene{perspective:900px}
.card{position:relative;transition:transform .6s cubic-bezier(.2,.7,.2,1);transform-style:preserve-3d}
.card.is-flipped{transform:rotateY(180deg)}
.face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden}
.face.back{transform:rotateY(180deg)}
```
Set `aria-hidden` on the hidden face and `aria-pressed` on the flip button ("영수증 보기"). Only `transform` animates (R19).

### F. Export and share

**R21. Build the shareable poster as an inline SVG with every font and image inlined as `data:` URIs, wait for `document.fonts.load('… "Noto Serif KR"', '한글')`, draw it to a `dpr`-scaled canvas, then `toBlob` → `navigator.share({files})` or `<a download>`. (should)**
WHY — MDN "SVG as an image": inside `<img>`/`drawImage`, "external resources such as images and stylesheets can't be loaded … though they can be used if inlined through `data:` URLs", and scripts are disabled. MDN `FontFaceSet.load()`: canvas does not trigger font downloads; pass the Korean sample text so the Korean-range face is the one loaded. html-to-image/snapdom issues and a Mozilla bug show the classic failure: `drawImage` snapshots the SVG before the web font arrives, so text falls back. MDN `toBlob`: default `image/png`, throws `SecurityError` on a tainted canvas, do not revoke the object URL immediately. MDN `share()`: requires transient user activation, test `navigator.canShare({files})`, ignore `AbortError`.
APPLY — Poster SVG has `width="1080" height="1350"` (intrinsic size), `<style>@font-face{font-family:"Noto Serif KR";src:url(data:font/woff2;base64,…)}</style>` (subset the Korean glyphs actually used, or draw text with canvas `fillText` after `fonts.load`), sticker `<image href="data:image/svg+xml;…">`. Export button inside the poster dialog: `await document.fonts.load('32px "Noto Serif KR"', line)`; `img.src = URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}))`; on `load`, `ctx.drawImage`; `canvas.toBlob(b => share(new File([b],`ppolppol-${dayKey}.png`,{type:'image/png'})))`. Fallback is an `<a download>`; note that from `file://` the `share` path is unavailable, so the download link is always rendered.

**R22. SMIL only inside standalone exported SVGs; CSS for everything in the page. (nice)**
WHY — Chromium filed an intent to deprecate SMIL in 2015 and suspended it in Aug 2016; it works but has had no investment since. SMIL's one real advantage is that it survives when the SVG is embedded as an `<img>`; CSS animations on inline SVG perform better on mobile and obey `prefers-reduced-motion` (R19).
APPLY — The octopus and lantern in the attic are inline SVG animated with CSS `transform`/`opacity`. If the exported poster wants a tiny blink, put a `<animate>` there only, since the PNG export freezes it anyway.

### G. Hosting

**R23. Only relative URLs (`./assets/...`), no `<base>`, no `fetch()` of local files, and a `404.html` is unnecessary for a one-page game. (must)**
WHY — GitHub docs: project sites are served at `owner.github.io/<repository>`; the Pages SPA write-ups warn that root-absolute `/assets/...` misses the repo directory, and recommend relative paths. From `file://`, `fetch('./data.json')` is blocked in Chrome, so data must be inline `<script>` — which is also why the game is one file.
APPLY — All stickers/rooms/one-liners are inline JS objects; hand-drawn PNG/SVG under `./assets/` referenced relatively; `start_url: "."` in the manifest.

**R24. Ship a minimal `manifest.webmanifest` (name, short_name, 192 and 512 PNG icons, `start_url: "."`, `display: "standalone"`, `theme_color`, `background_color`) and no service worker. (nice)**
WHY — MDN installability: Chromium requires `name` or `short_name`, icons "must contain a 192px and a 512px icon", `start_url`, `display`/`display_override`, served over HTTPS (GitHub Pages is); "While not a requirement for a PWA to be installable, many PWAs use service workers". A service worker cannot register from `file://` and complicates updates, so skip it.
APPLY — `<link rel="manifest" href="./manifest.webmanifest">`; icons are the lantern mark the author will draw; `theme_color` = the dark attic paper so the status bar matches at night.

**R25. Test matrix before each push: `file://` in Chrome and Safari, `python -m http.server`, GitHub Pages URL; private window; `TZ` variants; 360×640 and 390×844 with reduced-motion on. (should)**
WHY — Every storage, origin, timezone and motion rule above has a browser-specific failure mode documented in the sources (file: origin per-file in Firefox ≥92, global in old Chrome, SecurityError in old Safari; ITP 7-day eviction; UTC rollover).
APPLY — A `docs/CHECKLIST.md` row per environment; the Playwright review loop opens the page with `page.emulateMedia({reducedMotion:'reduce', colorScheme:'dark'})` and `context.storageState` cleared, and asserts the wall re-renders from a saved `events` fixture.

---

## 3. Minimal state module sketch (ties R1, R2, R3, R7, R10 together)

```js
const KEY = 'ppolppol', SCHEMA = 2;
const store = detectStorage();                     // R2
const MIGRATIONS = { 1: s => ({ schema: 2, events: legacyToEvents(s) }) }; // R1
function load(){ try { let s = JSON.parse(store.getItem(KEY) ?? 'null'); if (!s) return fresh();
  while (s.schema < SCHEMA) s = MIGRATIONS[s.schema](s); return s } catch { return fresh() } }
function fresh(){ return { schema: SCHEMA, events: [] } }
function save(s){ try { store.setItem(KEY, JSON.stringify(s)) } catch (e) { if (/Quota/i.test(e.name)) { s.events = trimReceipts(s.events); try { store.setItem(KEY, JSON.stringify(s)) } catch {} } } } // R3
function dispatch(ev){ saved.events.push({ t: Date.now(), ...ev }); save(saved); view = saved.events.reduce(reduce, initialView()); render(view) } // R10
```
`reduce(view, ev)` is the only place that knows "stay lights the lantern but does not count as a trip"; the MCP server later emits the same `ev` objects.

---

## 4. Verification notes

- Verified directly: bryc PRNGs.md code and seeding advice; Red Blob sfc32 gist; A Dark Room `engine.js` and `state_manager.js`; Modernizr detect; MDN pages for storage quotas, localStorage, storage event, live regions, dialog, details, prefers-reduced-motion, prefers-color-scheme, color-scheme, env(), touch-action, backface-visibility, rAF, visibilitychange, FontFaceSet.load/ready, SVG as an image, toBlob, share, manifest/installability; web.dev prefers-reduced-motion article (from repo source); Redux style guide (repo source); Elm architecture (repo source); WAI-APG modal dialog (repo source); GitHub Pages overview (repo source).
- Search summary only (hosts blocked): WCAG 2.5.8 wording, Apple HIG 44pt, web.dev animations guide, desandro card-flip body text, Smashing S(GH)PA, Chromium SMIL intent/suspension, date-pitfall articles.
- Stars verified via `gh api search/repositories` on 2026-11-04: bryc/code 345; doublespeakgames/adarkroom 8,379; Modernizr 25,672; localForage 25,803; davidbau/seedrandom 2,131; reduxjs/redux 61,441; elm/core 2,846; mdn/content 11,122; GoogleChrome/web.dev 3,612; whatwg/html 9,435; w3c/aria-practices 1,361; desandro/3dtransforms 1,013; bubkoo/html-to-image 7,272; zumerlab/snapdom 8,225; tsayen/dom-to-image 10,771; canvg 3,836; redblobgames/mapgen4 948.
