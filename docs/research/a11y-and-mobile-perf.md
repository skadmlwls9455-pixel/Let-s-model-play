# 접근성 · 모바일 성능 리서치 — 캔버스/WebGL 웹게임 (2026-11-04)

> **요약 1.** 이미 들어간 것(모션 감소, 44px 탭 타깃, live region 로그, 숨김 탭 정지, idle 30fps, `low-power`, 소리 기본 꺼짐, LRU 디코드 캐시, 숨김 시 `ctx.suspend()`)은 다시 적지 않았다. 남은 구멍은 **프레임 상한이 "프레임 수" 기준**이라는 점(120Hz 폰에선 두 배로 그리고, iOS 저전력 모드에선 15fps가 됨)과 **장면이 화면 밖에 있어도 계속 그린다**는 점이다.
> **요약 2.** 실측: Galmuri woff2 네 개 **1,381 KB → 170 KB**(KS X 1001 2,350자 + ASCII + 코드에 쓰인 모든 비ASCII 글자로 서브셋, 원본은 unicode-range 폴백). 라이트 픽셀 테마에서 `--amber`·`--rose` 글자는 `--bg` 위에서 **3.5:1**(기준 4.5:1), 켜진/꺼진 등불 칸은 **1.06:1**이다. 다크 테마는 전부 통과.
> **요약 3.** 소리: 실제 BGM은 205–273초라 한 곡을 디코드하면 **39–52 MB**(48 kHz 모노 float32)다. `audio/docs/research/03`의 "90초 루프 = 16.5 MiB" 예산은 지금 파일과 맞지 않는다. iOS 무음 스위치, `interrupted` 상태, 말풍선 목소리 따로 끄기는 아직 코드에 없다. 햅틱은 안드로이드 전용 옵트인으로만 넣는 것이 맞다.

범례: **[small]** = 1시간 안, 설계 결정 필요 없음 · **[feature]** = 사용자 판단 필요.
DESIGN §18/§19의 접근성(캔버스 표적의 DOM 거울 버튼, 키보드 경로, 슬롯 깜빡임)은 `docs/research/furniture-tap-events.md` 10번과 `interior-mode.md` 9번에 이미 있어서 여기서는 뺐다.

---

1. **[small] 프레임 상한을 프레임 수가 아니라 시간으로 건다**
   - 무엇: `js/scene3d.js:2042` `if (idle && (frameNo & 1) && !st.force) return;`을 바꾼다. `time`·`dt` 갱신은 지금처럼 매 콜백마다 하고, **렌더만** `ts - lastDraw >= (idle ? 1000/30 : 1000/60) - 1`일 때 한다. 선택: 문어가 `sleep` 상태로 20초 넘게 있으면 15fps(숨쉬기 사인파는 15fps에서도 부드럽다).
   - 왜: rAF는 화면 주사율을 따른다. 120Hz 안드로이드 크롬에서는 지금 코드가 active 120fps, idle 60fps로 그린다. 반대로 iOS 저전력 모드(WebKit이 일부러 rAF를 30Hz로 묶는다)나 cross-origin iframe(MCP Apps로 넣을 때)에서는 "한 프레임 건너뛰기" 때문에 **15fps**가 된다.
   - 출처: https://bugs.webkit.org/show_bug.cgi?id=215745 (저전력 30fps는 의도된 동작) · https://forum.babylonjs.com/t/capping-fps-at-60/8488 (크롬 120Hz rAF) · https://popmotion.io/blog/20180104-when-ios-throttles-requestanimationframe (iframe 30fps, 2018 글)

2. **[small] 장면이 화면 밖이면 렌더를 멈춘다**
   - 무엇: `js/scene3d.js` `init`에서 `new IntersectionObserver(cb, { threshold: 0 })`로 `#scene`을 지켜보고, `st.offscreen`을 `st.hidden`처럼 쓴다. `loop()` 첫 줄에 `|| st.offscreen`을 넣고, 다시 보이면 `lastT = 0; loop();`(1868행 visibility 패턴과 똑같이). 2D 폴백(`js/scene2d.js`)의 CSS 애니메이션은 브라우저가 알아서 멈춘다.
   - 왜: 모바일에서는 로그와 앨범이 장면 아래에 있다. 앨범을 읽는 동안에도 보이지 않는 캔버스를 30–60fps로 그리고 있다. 지금 `visibilitychange`는 탭 전환만 잡는다.
   - 출처: three.js 매뉴얼 "Rendering on Demand" https://threejs.org/manual/en/rendering-on-demand.html (mrdoob/three.js, ★100k+, 이번 세션에서는 GitHub API가 막혀 재조회 못 함)

3. **[small] 컨텍스트가 돌아오지 않으면 2D로 넘어가고, 스모크로 확인한다**
   - 무엇: `js/scene3d.js:1866` `webglcontextlost`는 지금 `st.lost = true`만 한다. 그래서 `frame()`이 영원히 return하고 장면이 검게 멈춘다. lost에서 3초 타이머를 걸고, `webglcontextrestored`가 안 오면 콜백(`opts.onLost`)으로 알려서 `js/app.js` `initScene`의 `SCENE2D.init` 경로로 바꾼다. `tools/smoke.js`에는 `renderer.forceContextLoss()` → 1초 뒤 `forceContextRestore()`(둘 다 r128 `vendor/three.min.js`에 있음)를 넣고, 복구 뒤 `renderer.info.render.calls > 0`이고 화면이 검지 않은지 확인한다.
   - 왜: iOS는 백그라운드에 가거나 메모리가 모자라면 GPU 컨텍스트를 회수하고, 복구가 늘 오지는 않는다. `three-pixel-look.md` §9가 요구한 `showFallback()`이 코드에는 없다.
   - 출처: https://registry.khronos.org/webgl/extensions/WEBGL_lose_context/ · https://bugs.webkit.org/show_bug.cgi?id=227636 (iOS 메모리 압박으로 탭이 죽는 사례)

4. **[small] 3D 모드에서 스크린리더용 장면 설명 한 줄**
   - 무엇: `index.html` `#scene` 안에 `<p id="scene-desc" class="sr-only"></p>`를 둔다(`.sr-only`는 `css/style.css:80`에 이미 있다). `js/app.js` `renderScene()`과 문어 상태가 바뀔 때 고친다. 예: "등불 3칸 켜진 다락, 비 오는 밤. 문어는 창가에서 자고 있어." live region으로 만들지는 않는다. 사건은 `#log`가 이미 읽어 준다.
   - 왜: 3D 모드에서는 `#stage`가 `display:none`(`css/style.css:721`)이고 `#scene3d`는 `aria-hidden`이다. 그래서 스크린리더에는 "문어의 다락방" 섹션이 **비어 있다**. 캔버스는 고정 이름 하나에, 바뀌는 상태는 따로 둔 DOM 글자로 전하는 것이 표준 패턴이다.
   - 출처: https://html.spec.whatwg.org/multipage/canvas.html#the-canvas-element (fallback content) · https://www.chartjs.org/docs/latest/general/accessibility.html · https://pauljadam.com/demos/canvas.html

5. **[small] 라이트 픽셀 테마 대비 두 곳 고치기 (실측)**
   - 무엇: WCAG 상대휘도 공식으로 `css/style.css` 픽셀 토큰을 계산했다.

     | 쌍 (라이트 픽셀) | 대비 | 기준 |
     |---|---|---|
     | `--amber #884b2b` / `--bg #d7b594` | **3.54** | 4.5 (20px 보통 굵기) ✗ |
     | `--rose #a53030` / `--bg` | **3.56** | 4.5 ✗ |
     | `--amber`·`--rose` / `--panel #e7d5b3` | 4.72 · 4.75 | ✓ |
     | 켜진 칸 `--amber-fill #be772b` / 꺼진 칸 `--pip-off #ad7757` | **1.06** | 3.0 (1.4.11) ✗ |
     | 다크 픽셀 전 글자 쌍 | ≥ 5.29 | ✓ |

     호박색·장미색 글자가 `--bg`에 바로 놓이는 곳(`.ltool`, `.sheet .stats b`, `.btn.danger`가 패널 밖에 있는 경우)을 찾아, 글자 전용 토큰 `--amber-text: #5d2c28`(5.89:1), `--rose-text: #6e2727`(5.51:1)을 쓴다. 둘 다 Apollo 팔레트 색이다. 라이트 `--pip-off`는 `#602c2c`(켜진 칸과 3.10:1)나 `#4d2b32`(3.43:1)로 바꾸고, 바꾼 뒤 상태바를 눈으로 확인한다.
   - 왜: "3/8" 숫자가 있어서 색만으로 정보를 전하는 것은 아니다. 그래도 켜진 칸과 꺼진 칸이 둘 다 주황 갈색이라 색각 이상이 있으면 한눈에 구별하기 어렵다.
   - 출처: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html · https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html

6. **[small] `prefers-contrast: more`이면 질감을 걷어 낸다**
   - 무엇: `css/style.css` 픽셀 테마 뒤에 `@media (prefers-contrast: more) { :root[data-font="pixel"] { --dither-page: none; --dither-panel: none; --grain: none; --muted: var(--fg); } }`를 넣는다.
   - 왜: 글자 뒤 2px 체커 디더와 종이 알갱이는 저시력 사용자에게 잡음이다. OS 고대비 설정 하나로 바로 꺼지게 하면 메뉴를 추가할 필요가 없다. GAG Basic의 "Provide high contrast between text/UI and background"에 해당한다.
   - 출처: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast · https://gameaccessibilityguidelines.com/basic/

7. **[small] Galmuri 서브셋: 1,381 KB → 170 KB (실측)**
   - 무엇: `tools/subset-fonts.py`(fontTools `pyftsubset`)로 `vendor/fonts/Galmuri*.sub.woff2`를 만든다. 넣을 글자는 KS X 1001 한글 2,350자, ASCII, 호환 자모, U+2000–206F, 그리고 `js/*.js`와 `index.html`에 나오는 모든 비ASCII 글자 1,027개다. 실측 결과 11은 492→46 KB, 11-Bold는 162→41 KB, 9는 419→45 KB, 7은 308→38 KB였다. 코드 글자 중 KS X 1001 밖은 "힣" 하나라 위 집합에 포함된다. `vendor/fonts/galmuri.css`에는 원본 `@font-face`를 **먼저**, 서브셋(`unicode-range` 명시)을 **뒤에** 선언한다. 브라우저는 뒤에 선언한 면부터 보기 때문에, 원본은 사용자가 이름이나 힌트에 드문 글자를 칠 때만 내려받는다. 위험이 전혀 없는 중간안도 있다. 한글 11,172자를 다 두고 한자·가나만 빼면 525 KB다. 라이선스는 OFL이고 Reserved Font Name이 없다(`GALMURI-LICENSE.txt` 확인).
   - 왜: 첫 로드에서 `three.min.js`(589 KB)보다 큰 단일 덩어리가 폰트다.
   - 출처: https://github.com/fonttools/fonttools (★≈5.3k, 2026-10 스냅샷) · https://developers.googleblog.com/2018/04/google-fonts-launches-korean-support.html (한국어 unicode-range 슬라이스)

8. **[small] Lighthouse 13 모바일 점검 스크립트 하나 + 먼저 고칠 것**
   - 무엇: `tools/lighthouse.sh`를 만든다. 정적 서버를 띄우고 `npx lighthouse@13 http://localhost:8080 --form-factor=mobile --only-categories=accessibility,performance,best-practices --chrome-flags=--headless --output=json`을 돌린다(샌드박스에 `/usr/bin/google-chrome`이 있고, Node 22.23은 L13 요구 사항 22.19 이상을 만족한다). 합격선은 a11y ≥ 95, `color-contrast`·`target-size` 실패 0. 첫 수정으로 예상되는 것은 `index.html:11`의 Noto Sans/Serif KR 구글 폰트 CSS다. 픽셀 글꼴이 기본인데도 렌더를 막는다. 픽셀 글꼴을 끌 때만 `<link>`를 주입하거나 `media="print" onload="this.media='all'"`로 바꾼다.
   - 왜: L12에서 `tap-targets`가 접근성 쪽 `target-size`(WCAG 2.5.8)로 바뀌었다. L13은 `render-blocking-resources`·`font-display`·`uses-long-cache-ttl`을 `*-insight` 감사로 대체했으니 옛 이름으로 단언하면 안 된다.
   - 출처: https://developer.chrome.com/blog/lighthouse-13-0 · https://github.com/GoogleChrome/lighthouse/releases · https://github.com/GoogleChrome/lighthouse-ci (★≈7.0k, gittrend 스냅샷)

9. **[small] 정적 자산 캐시 헤더**
   - 무엇: 먼저 `curl -sI <preview>/vendor/three.min.js | grep -i cache-control`로 지금 값을 본다. `max-age=0`이면 `vercel.json` `headers`에 `/vendor/(.*)`, `/audio/(.*)`, `/assets/(.*)`를 `public, max-age=86400, stale-while-revalidate=604800`로 추가한다. 파일 이름에 해시가 없으니 `immutable`은 쓰지 않는다.
   - 왜: 다시 열 때마다 three(589 KB), 폰트, 오디오를 재검증 왕복한다. 모바일 회선에서 체감되고, L13 `use-cache-insight`가 잡는 항목이다.
   - 출처: https://vercel.com/docs/headers/cache-control-headers · https://vercel.com/docs/caching/cdn-cache

10. **[small] iOS 무음 스위치를 정직하게 알린다 + `audioSession` 명시**
    - 무엇: `js/audio.js` `start()`에서 `if (navigator.audioSession) navigator.audioSession.type = 'ambient';`를 둔다. 기본값 `auto`에 맡기지 않고 03 문서의 결정을 코드로 고정하는 것이다. iOS라면 소리 토글 아래 도움말에 "아이폰이 무음 모드면 안 들려"를 넣는다. 웹에서는 링어 스위치 상태를 읽을 수 없으니 늘 보여 준다.
    - 왜: 무음 모드에서 "소리 켜기"를 눌렀는데 아무것도 안 들리면 토글이 고장 난 것처럼 보인다. "가짜 성공 없음" 원칙에 걸린다. WebKit은 ambient 계열이 무음 스위치에 꺼지는 것을 정상 동작으로 본다.
    - 출처: https://w3c.github.io/audio-session/ · https://bugs.webkit.org/show_bug.cgi?id=264473 · https://developer.apple.com/design/human-interface-guidelines/playing-audio

11. **[small] AudioContext `interrupted`/멈춤에서 다음 탭에 되살리기**
    - 무엇: `js/audio.js` `ensureCtx()`에 `ctx.onstatechange`를 단다. `pref.on && started && !document.hidden`인데 상태가 `interrupted`나 `suspended`면 `arm()`으로 첫 탭 해제 리스너를 다시 건다. `onUnlock`에서 `resume()`이 reject되면 `suspend().then(resume)`을 한 번 더 시도한다. 지금 `bindVisibility()`(815행)는 제스처 밖에서 `resume()`만 부르고 실패를 삼킨다.
    - 왜: iOS Safari에서는 전화, 시리, 다른 앱 오디오가 끼면 컨텍스트가 `interrupted`가 된다. 그런 뒤 사용자 동작 없이 부른 `resume()`이 거부되거나 멈춘 채로 남는 사례가 보고돼 있다. 그러면 토글은 켜져 있는데 소리가 안 난다.
    - 출처: https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state · https://bugs.webkit.org/show_bug.cgi?id=273511 · https://forum.playcanvas.com/t/ios-audio-playback-does-not-resume-when-minimizing-and-bringing-the-web-browser-back-into-focus/41643

12. **[small] 소리 설정에 "말풍선 목소리" 끄기를 넣는다**
    - 무엇: `js/audio.js` `pref`에 `voice: true`를 추가하고 `syncVol()`에서 `vol.voice = pref.voice ? pref.sfx : 0`으로 한다. 설정 시트의 음악·효과음 슬라이더(795–796행) 아래에 체크박스 하나를 둔다. 슬라이더를 늘리지는 않는다. 다른 값은 지금 그대로 괜찮다. 우리 기본 0.8/0.8은 스타듀(음악 75, 효과 100, 환경 75)와 비슷하고, 파일이 이미 모노라서 XAG 105의 모노 요구도 공짜로 충족한다.
    - 왜: GAG Basic은 "효과음, 말소리, 배경음악을 따로 조절하거나 끌 수 있게"를 요구한다. 스타듀도 대사 타이핑 소리 토글을 따로 둔다. 블립은 가장 자주 반복되는 소리다. `audio/docs/research/04`의 구현 메모에 "목소리 토글"이 적혀 있지만 코드에는 아직 없다.
    - 출처: https://gameaccessibilityguidelines.com/basic/ · https://stardewvalleywiki.com/Options · https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/105

13. **[small] README에 "접근성" 절 하나**
    - 무엇: `README.md`에 6줄을 넣는다. 모션 감소(OS 따라감 + 설정), 소리는 기본 꺼짐이고 음악·효과·목소리를 따로 조절, 모든 사건은 텍스트 로그로 읽힘, 키보드·스크린리더로 산책 가능, 실패는 색이 아닌 글리프로 표시, 정밀한 타이밍이 필요한 것은 선택 미니게임(달리기)뿐이라 본편 진행과 무관.
    - 왜: GAG Basic의 "Provide details of accessibility features on packaging and/or website" 항목이다. 비용이 거의 없고, 이미 한 일을 사용자가 알 수 있게 된다.
    - 출처: https://gameaccessibilityguidelines.com/basic/

14. **[feature] 디코드 메모리를 반으로: `AudioContext({ sampleRate: 24000 })`**
    - 무엇: `js/audio.js:183` `new AC()`를 `new AC({ sampleRate: 24000 })`로 바꾼다(지원하지 않으면 try/catch로 기본값). 그러면 `decodeAudioData`가 모든 버퍼를 24 kHz로 리샘플해서 집 테마 한 곡이 39.5 → 19.7 MB가 된다. 지금 `BUDGET` 128 MB는 장소 크로스페이드 중(BGM 2곡 + 환경음 + 덧층) 가득 찰 수 있고, 여기에 three.js 메모리가 더 붙는다. 마스터는 LPF 5–8 kHz라 12 kHz 나이퀴스트에서 잃는 것이 적다. 다만 노이즈 틱과 반짝임 층은 귀로 A/B 해야 한다(폰 스피커와 이어폰 둘 다). 사용자 귀로 판단할 일이다. 대안은 iOS에서만 `BUDGET`을 64 MB로 낮추는 것이다.
    - 왜: iOS는 남은 메모리를 알려 주는 API가 없고, 디코드를 많이 하면 탭을 그냥 죽인다(jetsam). `<audio>` 스트리밍은 iOS가 `element.volume`을 무시해서 덕킹이 안 되므로 `audio.js` 헤더가 이미 배제했다.
    - 출처: https://caniuse.com/mdn-api_audiocontext_audiocontext_options_samplerate_parameter (iOS 14.5+) · https://bugs.webkit.org/show_bug.cgi?id=227636 · https://bugs.webkit.org/show_bug.cgi?id=218261 (비기본 레이트 음질 버그, 수정됨) · howler.js의 "큰 파일은 html5 스트리밍" 권고 https://github.com/goldfire/howler.js (★≈24k)

15. **[feature] 햅틱은 안드로이드 전용 옵트인으로만**
    - 무엇: 설정 시트에 "진동" 체크박스를 두고 기본값은 꺼짐으로 한다. `'vibrate' in navigator`일 때만 보이게 한다. 켜면 두 순간에만 울린다. 포스터가 벽에 붙을 때 `navigator.vibrate(12)`, 등불 한 칸이 켜질 때 `vibrate([8, 60, 8])`. iOS의 `<input type="checkbox" switch>` 클릭 꼼수는 쓰지 않는다. 문서화되지 않은 부작용이라 언제 막힐지 모른다.
    - 왜: Apple HIG는 "햅틱은 끌 수 있어야 하고, 없어도 즐길 수 있어야 한다"고 한다. 복지 원칙상 청하지 않은 자극도 하지 않는다. 사실상 안드로이드에서만 동작하는 기능이라 넣을지 말지는 사용자가 정할 일이다.
    - 출처: https://developer.apple.com/design/human-interface-guidelines/playing-haptics · https://azukiazusa.dev/en/blog/ios-safari-web-haptics

---

**확인 한계.** 이 세션 네트워크에서 `gameaccessibilityguidelines.com`, `developer.mozilla.org`, GitHub API(`gh api`)가 막혀 있었다. GAG Basic 문구는 검색 스니펫으로만 확인했고, MDN 링크는 페이지가 있는 것으로 알려진 주소다. ★ 수는 서드파티 스냅샷(ecosyste.ms, gittrend)이라 근사치다. 대비 수치와 폰트 크기는 이 저장소 파일로 직접 계산했다(서브셋 스크립트는 세션 스크래치패드에서만 돌렸고 저장소는 건드리지 않았다).
