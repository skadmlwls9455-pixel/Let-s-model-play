# Lane E "small": sewing machine, kitchen counter, loading octopus, thought bubble, home-screen install (branch `lane/e-small`)

Read `wip/round4/briefs/COMMON.md` first. Five separate jobs; do them in this order and commit each one separately.

## 1. Sewing machine upstairs (HANDOFF item 2)

Owner: "재봉틀(2층): 첫 톡에 안 열리는 버그 고치기 … 재봉틀 창 글자 확 줄이기(최우선). 창 크기 차분하게." Earlier: "2층
재봉틀 ui가 뭔가 훅 커지는 느낌이라 글자 크기 조절 좀 해줘". 11-15: the '세트 도감' list is **folded inside the sewing
sheet** (one line '세트 도감 n/9', tap to open).

**The bug, found by the lead (reproduce it first):** the scene handles taps on its pictures itself (the hotspot
buttons have `pointer-events: none`, `js/scene3d.js` `pick` → `pointerEnd` → `spotTap(id)` → `el.click()`), and the
app opens the sheet synchronously (`openSew` → `showDialog` → `showModal`). Then the browser delivers the **same
finger's native `click`** after `pointerup`, hit-tested at the tap point — now on top of the just-opened sheet. If
that point is outside the sheet box, the click lands on the dialog's backdrop and the sheet's own handler
(`bagInit`: `if (clickedOutside(…)) close()`) closes it at once — "doesn't open on the first tap". If it is inside, it
presses whatever is there (in a probe at 360x740 it pressed a dye chip and showed '조개가 3개 모자라…'; with enough
shells it would dye the clothes). Probe: `page.touchscreen.tap()` on `#btn-sew`'s rectangle in the loft (see
`wip/round4/probe-lib.js`; `APP.goRoom('loft')`). Also: a tap that lands while a pan flick is still coasting is eaten
as `caught` (only stops the coast) — for scene buttons (`k === 'spot'`) that should count as a tap.
**Fix in the scene, for every scene tap that triggers something** (spots, posters, souvenirs, the octopus, the
window, the sofa): after `pointerEnd` performs a tap action, swallow the next trusted `click` that arrives within
~800 ms near the tap point (capture listener on `window`, `e.isTrusted`, within ~30 px; cleared by the next
`pointerdown`). The synthetic `el.click()` (not trusted) must still pass. And in `pointerdown`, a `caught` press whose
pick is a spot still stops the coast but counts as a tap. Keep it small; lane A (camera) edits nearby code
(`startMulti` / `multiMove`), so touch only `spotTap`, the `caught` line and a new small listener.
Also check the other sheets opened from scene taps (runner from the arcade, salon from the mirror, poster dialog,
plots) behave the same after the fix.

**The sheet:** make the sewing sheet calm and small: about half the screen or less at 360x740 with the set list
folded. Smaller type from the scale the other sheets use (pixel font: use the crisp sizes the game uses — Galmuri7 at
16px for small text, Galmuri11 at 20/24 for headings; look at `css/style.css` `--f-ui`, `--f-meta`, `--f-body`), a
short title ('재봉틀'), one short line instead of the three-line explanation (e.g. '염료나 조개 6개로 옷을 물들여'), the
six colour chips compact (3×2 or 6×1; each ≥ 44 px to tap; colour swatch + name, the cost / '입는 중' / '염료 n' small),
'원래 색으로' short, the set list in a `<details>` closed by default whose summary is '세트 도감 n/9'. No sudden
"jump": the opening motion like the other sheets. Keep `#sew-body .week-list`, `.week-rr` and the focus behaviour that
`tools/smoke.js` checks (grep `sew` there: update checks that read `#sew-body h3` for '세트 도감' to the new summary
without weakening them; the 320 px checks for 44 px targets must still pass when the details are opened).

## 2. Kitchen counter → cooking (HANDOFF item 3)

Owner: "놀이방 주방 조리대: 톡하면 요리(COOK)가 바로 열리게." Earlier: "요리 기능은 왜 안 추가된 건지".
The cooking game is `cook.html` (+ `js/cook.js`, `js/cook-art.js`, `js/cook-stickers.js`, `css/cook.css`,
`css/cook-stickers.css`, `foley/`), a separate page today (`docs/COOK_PROTO.md`). The play room already has a counter
(`js/scene3d.js` `buildPlayRoom` ~3567, `PROOM.counterBox` ~3653) but no tap target.
Make a tap on the counter open cooking **inside the game** at once: a full-screen overlay dialog in `index.html`
with an `<iframe src="cook.html?embed=1">` (lazy: created on first open), and a way back ('닫기' in the cook page
when embedded, Esc, the Android back gesture if the app handles it) that closes the overlay and returns to the play
room exactly as it was. Add a scene hotspot `counter` (`#btn-cook`, `aria-label` '부엌', ≥ 44 px, `pick` in the play
room, `spotInfo`, `ROOM_SPOT`) like the arcade machine (`machine` / `#btn-machine` / `openMachine`). In embed mode the
cook page hides its own page header / back link and talks to the parent with `postMessage` (same-origin check) for
'close'. Sound: still off by default; the cook page's sounds only when sound is on (it reads the same settings).
Whatever the cook page saves (stickers, the weekly 'kitchen' quest, counts) must keep working when embedded: check
how the weekly quest 'kitchen' is counted today and that it still counts after a dish in the overlay. Hard line 8.
`tools/export-site.js` already ships `cook.html`; `tools/test-export.js` must pass.

## 3. The loading octopus (HANDOFF item 5)

Owner: "로딩 화면: 지금 벡터 문어 대신 게임 속 문어가 오른쪽으로 뽈뽈 기어가는 반복 그림(GIF 느낌)." 11-15: "걍 빨간 문어
아이콘 찰나에 뜨는 거. 중앙에. 로딩 중일 때나 처음에 잠깐 뜨더라고." — i.e. while the game loads (and for an instant at
the start) the static red **vector** octopus picture (the 2D placeholder in `index.html`'s scene markup, `data-asset`
`oct.*` SVGs from `assets/oct/`) shows in the centre. Replace that moment with the in-game pixel octopus crawling
from left to right across the middle and looping, until the game is ready (the 3D scene's first frame or the intro
takes over; the 2D fallback when 3D is not available). The vector octopus must never flash any more.
Make the frames from the real game model: render the 3D octopus's walk cycle side-on with the game's own renderer
(a dev-only tool script under `tools/`, e.g. `tools/make-loading-oct.js` with Playwright + `APP.scene` / the portrait
path) into a small sprite strip PNG (e.g. 6-8 frames, transparent, crisp, ~48-64 px tall at 1×) under `assets/ui/`,
registered in `assets/manifest.json` if that is how assets ship, and animate it with CSS `steps()` (no JS needed
before the scripts load: the loading layer must be in the static HTML/CSS so it shows before `app.js` arrives).
Background: the scene's own night-sky / void colour so the switch to the game is soft. Reduced motion: one still
frame, no movement. Check with a throttled load (CDP network throttling or delayed script routes) that only the
crawling octopus shows, and that it disappears when the game shows.

## 4. The thought bubble (HANDOFF item 9)

Owner: "생각 풍선: 지금 그림 버리고 더 깔끔한 도트로 새로, 크기 작게, 뾰족한 모양 금지 (주인이 싫어함). 실제 게임 화면
스크린샷으로 확인. 무료 라이선스 픽셀 UI 참고 가능 (이름·그림 베끼기 금지)."
Today: the 'think' skin of the octopus's bubble (`css/ui-art.css` ~85-91: `assets/ui/bubble_think.png` 9-slice with
bumpy cloud edges and `tail_think.png`), made by `tools/ui-art/sprites.js` (~939 '생각 풍선') and
`tools/make-ui-art.js`. Draw a new one in the same pipeline: a clean rounded-rectangle pixel bubble (smooth stepped
corners, a 1-2 px outline, no bumps, no spikes, no pointed tail), with a tail of two or three small round dots
getting smaller toward the octopus, and a smaller default size (padding and border-image slice) than today. One
version. Check in the real game at 360x740 (both pixel font and system font), by day and at night, near the scene's
edges (`UIART.keepInside`).

## 5. Home-screen install (owner 11-15: PWA)

Add a web app manifest (`manifest.webmanifest`: name '뽈뽈 문어', short_name '뽈뽈 문어', `display: standalone`,
portrait, theme / background colours from the game, `start_url` '/?source=pwa' or './', icons 192, 512 and a maskable
512 made from the pixel octopus — draw them crisp, nearest-neighbour), `<link rel="manifest">`, `apple-touch-icon`
(180), `apple-mobile-web-app-capable` / status bar meta, a favicon (the pixel octopus, 32 / 16). A service worker is
optional: if you add one, make it safe for a game that deploys often (network-first for pages and scripts, no
precache of old builds, no way for a player to be stuck on an old version; skip waiting + clients claim) — or leave
it out and say why. `tools/export-site.js` must ship the new files (`TAKE` / referenced) and `tools/test-export.js`
must pass; check `vercel.json` headers if the manifest needs a content type. Verify in Chromium that the page is
installable (DevTools protocol `Page.getInstallabilityErrors` returns none) on `http://127.0.0.1` (serve
`node tools/export-site.js` output with `python3 -m http.server`).

## Tests

`npm test`, the font check (text changes), the smoke letters that cover the loft, the sewing sheet, the play room
(grep `sew`, `machine`, `cook`), `node tools/test-play.js`, `node tools/test-cook-live.js` (cook page standalone must
still work), `node tools/intro-shots.js` (the intro must not change), `node tools/test-export.js --crawl`. Add checks:
a real touch tap on the sewing machine opens the sheet and it stays open, and no chip is pressed by that tap; a tap
during a pan coast on a spot works; the counter tap opens the cook overlay and closing returns to the play room; the
loading layer exists in the static HTML and hides once the game is ready; the vector octopus is not visible at load.

## Screenshots to commit (360x740)

The sewing sheet before / after, the cook overlay open over the play room, three frames of the loading octopus, the
new thought bubble in the game (day and night), the PWA icon at 192.
