# 작은 다듬기 (polish): 별 많은 레포·토크에서 고른 것 (2026-11-04)

**요약**
1. `docs/APPLIED_TIPS.md` 와 `references/*.md` 에 이미 있는 것(누름 scale·translate, idle 숨쉬기·깜빡임, 빈 상태, 토스트, 모션 감소, 스텝 파티클, theme-color 등)은 뺐다. 코드에서 grep 으로 빈틈을 확인한 12개만 남겼다.
2. 바로 해도 되는 [small] 8개: iOS `:active` 켜기, 스크롤 안 카드의 누름 타이밍, 픽셀 테마 계단식 이징, 셰이더 예열, 첫 화면 글꼴 preload, 앰비언트 루프 소수 주기, 시트 손잡이 스와이프, 장면 속 작은 표적 고르기.
3. [feature] 4개는 사용자가 정해야 한다: 햅틱 옵트인, §18 상자 덜컹(trauma² 모델), 첫 실행 안내를 push 에서 pull 로, 달리기 "천천히" 모드.

---

1. **[small] iOS Safari 에서 누름 피드백이 실제로 보이게 하기**
   - 할 일: `js/app.js` boot 에 한 줄 넣는다. `window.addEventListener('touchstart', function () {}, { passive: true });` (또는 `<body ontouchstart="">`). 이 한 줄로 픽셀 테마의 `.btn:active`, `.pcard:active`, `.fchip:active`, `.receipt .copy:active`, `.sound-btn:active` (모두 `translate(2px,2px)`) 가 아이폰에서도 켜진다. 샌드박스에서는 못 봤으니 실기기에서 확인해야 한다.
   - 이유: 모바일 Safari 는 터치 리스너가 없으면 `:active` 를 적용하지 않는다. 그래서 GF R7 누름 피드백이 iPhone 에서는 안 보였을 수 있다.
   - 출처: undergroundwires/privacy.sexy ★6.2k `MobileSafariActivePseudoClassEnabler.ts` (빈 passive touchstart, 주석 "Last tested: iPhone with iOS 17.1.1") https://github.com/undergroundwires/privacy.sexy/blob/master/src/presentation/bootstrapping/Modules/MobileSafariActivePseudoClassEnabler.ts · WebKit bug 138816 https://bugs.webkit.org/show_bug.cgi?id=138816

2. **[small] 스크롤 안의 카드는 누름을 150ms 늦게 켜고, 켜지면 최소 225ms 유지**
   - 할 일: `#album` (가로 스크롤) 안의 `.pcard` 에서만 `:active` 대신 `.down` 클래스를 쓴다.
     - 터치 pointerdown 뒤 150ms 가 지나면 `.down` 을 붙인다. 그 전에 pointercancel 이나 스크롤이 일어나면 붙이지 않는다. 150ms 전에 손을 떼면 뗄 때 붙인다.
     - 붙인 뒤에는 최소 225ms 유지한 다음 뗀다.
     - 마우스와 펜은 바로 붙인다.
     - 큰 버튼 `#btn-go` 는 지금처럼 `:active` 를 그대로 쓴다.
   - 이유: 앨범을 엄지로 훑을 때 지나가는 카드마다 눌림이 번쩍이는 것을 막는다. 아주 짧은 탭에서 눌림이 한 프레임도 안 보이는 것도 같이 막는다.
   - 출처: material-components/material-web ★11.4k `ripple/internal/ripple.ts` — `TOUCH_DELAY_MS = 150` ("so that we do not show the ripple for a swipe or scroll interaction"), `MINIMUM_PRESS_MS = 225` https://github.com/material-components/material-web/blob/main/ripple/internal/ripple.ts

3. **[small] 픽셀 테마의 등장 모션을 "계단식 ease-out" 으로**
   - 지금 상태: 픽셀 테마에서 움직임이 세 갈래로 따로 논다.
     - dialog, sheet, 새 포스터는 `fade-only` 라서 아래에서 올라오는 공간 단서가 없다.
     - `.lrow.in` (`row-in` 8px), `#toast`, `#oct-bubble` (`bubble-in` 4px) 은 서브픽셀로 미끄러진다.
     - `.wall-mini:active` 의 `scale(.94)` 와 `.wall-mini.landed` 의 `scale(1.2)` 는 2px 베벨을 리샘플해서 흐리게 만든다.
   - 할 일: `css/style.css` 픽셀 블록에 아래 토큰을 넣는다. 8px 이동이면 0→4→6→8px 로 움직여서 모두 2px 격자 위에 떨어진다. 이 토큰으로 sheet/dialog 의 `translateY(8px)` 이동을 되살리고, 로그 행·토스트·말풍선도 같은 토큰을 쓴다. `.wall-mini` 의 scale 은 `translate(2px,2px)` 로 바꾼다.
     ```css
     :root[data-font="pixel"] { --ease-px: steps(4, jump-end); }
     @supports (animation-timing-function: linear(0, 1)) {
       :root[data-font="pixel"] { --ease-px: linear(0, 0 10%, .5 10% 35%, .75 35% 65%, 1 65%, 1); }
     }
     ```
     커스텀 속성은 파싱 때 검사되지 않는다. 그래서 대체값을 두 번 선언하면 안 되고, 위처럼 `@supports` 로 나눠야 한다.
   - 이유: 장면은 픽셀 스냅인데 UI 만 매끈하게 미끄러지거나 아예 안 움직이면 두 층이 어긋나 보인다. `linear()` 에서 같은 입력 위치에 값을 둘 두면 그 자리에서 값이 뛴다(canonicalization 3단계). 그래서 격자에 떨어지는 계단 이징을 CSS 만으로 만들 수 있다.
   - 출처: w3c/csswg-drafts ★4.9k `css-easing-2/Overview.bs` ("linear() canonicalization") https://github.com/w3c/csswg-drafts/blob/main/css-easing-2/Overview.bs · mdn/browser-compat-data ★5.8k: `linear()` 는 Chrome 113 · Firefox 112 · Safari 17.2 https://github.com/mdn/browser-compat-data/blob/main/css/types/easing-function.json · 곡선 생성기 jakearchibald/linear-easing-generator ★164 https://github.com/jakearchibald/linear-easing-generator

4. **[small] 셰이더 예열로 첫 출발 때 끊김 막기**
   - 할 일: `js/scene3d.js` 에서 `atticG`/`extG` 를 다 만든 직후, 첫 렌더 전에 한 번 실행한다.
     ```js
     extG.visible = true; atticG.visible = false; renderer.compile(scene, camera);
     extG.visible = false; atticG.visible = true; renderer.compile(scene, camera);
     ```
     장소마다 한 번씩 부르는 이유: r128 의 `compile` 은 재질을 숨은 것까지 `traverse` 하지만 조명은 `traverseVisible` 로만 모은다(`vendor/three.min.js` 에서 확인). 장소별 조명 구성에 맞는 프로그램을 만들려면 장소마다 따로 불러야 한다. 나중에 `new` 하는 메시가 있으면 부팅 때 숨긴 채 미리 만들어 둔다.
   - 이유: `extG` 는 처음 보이는 순간(출발 의식 한가운데) 셰이더를 컴파일한다. 그래서 저사양 폰에서는 그 프레임이 멈출 수 있다. 첫 출발의 long task 를 DevTools Performance 로 재서 전후를 비교할 것.
   - 출처: mrdoob/three.js ★117.6k r128 docs `WebGLRenderer.compile` — "Compiles all materials in the scene with the camera. This is useful to precompile shaders before the first rendering." https://github.com/mrdoob/three.js/blob/r128/docs/api/en/renderers/WebGLRenderer.html

5. **[small] 첫 화면 픽셀 글꼴 preload + 틀린 크기 주석 고치기**
   - 할 일: `index.html` `<head>` 에 Galmuri9 와 Galmuri11 preload 를 한 줄씩 넣는다. 예: `<link rel="preload" href="vendor/fonts/Galmuri9.woff2" as="font" type="font/woff2" crossorigin>`.
   - 주석도 고친다. `vendor/fonts/galmuri.css` 첫 주석(7/9/11px → 14/18/22px)과 `css/style.css` 픽셀 블록 머리 주석(18/22/14px)을 README 의 em 크기 기준으로 바꾼다: Galmuri7 8px · Galmuri9 10px · Galmuri11 12px → 16/20/24px. 실제 CSS 는 이미 16/20/24px 라 맞다. 주석만 틀려서, 다음 수정자가 흐릿한 18/22px 로 "고칠" 위험이 있다.
   - 이유: 지금 글꼴은 style.css → galmuri.css 를 다 읽은 뒤에야 발견된다. 게다가 `font-display: swap` 이라 Noto 로 한 번 그렸다가 Galmuri 로 바뀌면서 줄 높이가 뛴다(입장 레이어를 건너뛸 때 보인다). 같은 출처라도 `crossorigin` 이 없으면 preload 가 재사용되지 않는다.
   - 출처: mdn/content (★11.1k) rel=preload — "`font` and `fetch` preloading requires the `crossorigin` attribute to be set" https://github.com/mdn/content/blob/main/files/en-us/web/html/reference/attributes/rel/preload/index.md · quiple/galmuri ★470 README 표 "Galmuri11 (12px, 9pt) · Galmuri9 (10px, 7.5pt) · Galmuri7 (8px, 6pt)" https://github.com/quiple/galmuri

6. **[small] 앰비언트 루프 주기를 서로소로 (cicada principle)**
   - 할 일: `css/style.css` 의 2D 폴백·UI 루프 주기를 바꾼다.
     - `.layer.candle svg .flame` 의 `flicker 1.6s alternate` (실제 주기 3.2s)와 `.layer.lantern svg .glow` 의 `3.2s` 는 주기가 똑같다. 그래서 양초와 등불이 한 몸처럼 숨쉰다. flicker 는 `1.3s alternate` (2.6s), glow 는 `3.7s` 로 바꾼다.
     - `.legs .leg` sway 는 2.4s → 2.3s, `.star` twinkle 은 3s → 2.9s.
     - 3D 쪽은 이미 `hash('flk'+fk)` 지터가 있으니 건드리지 않는다.
   - 이유: 서로소 주기는 다시 맞물리는 일이 거의 없다. 그래서 JS 없이도 살아 있는 듯한 무작위감이 난다. 주기가 같은 루프가 둘이면 방 전체가 맥박 치듯 보인다.
   - 출처: Lea Verou gist "The cicada principle in animations" (소수/10 초: 1s · .7s · 1.1s · 1.3s) https://gist.github.com/LeaVerou/ea53f3bee9a7f1439aa7 · Alex Walker, SitePoint 2011 https://www.sitepoint.com/the-cicada-principle-and-why-it-matters-to-web-designers/

7. **[small] 방 보기 시트 손잡이를 실제로 끌 수 있게**
   - 지금 상태: `index.html` 의 `#room-sheet > .handle` (`aria-hidden`) 은 그림일 뿐이다. `js/app.js` 에 드래그 코드가 없다. UI R28 은 "swipe-down 으로 닫기" 라고 적어 두었다.
   - 할 일: 손잡이와 시트 머리에만 pointer 핸들러를 단다.
     - 아래로 끌면 `translateY` 가 손가락을 따라온다. 위로 끌면 감쇠한다.
     - 놓았을 때 시트 높이의 25% 이상 끌었거나 속도가 0.4px/ms 를 넘으면 `close()` 한다. 아니면 500ms `cubic-bezier(.32,.72,0,1)` 로 제자리에 돌아간다.
     - 연 뒤 500ms 동안과 안쪽 `scrollTop !== 0` 일 때는 끌기를 무시한다(스크롤이 먼저).
     - 모션 감소면 바로 돌아간다.
     - `closedby="any"` (바깥 탭·Esc) 는 그대로 둔다.
   - 이유: 보이는 손잡이가 안 끌리면 거짓 단서다. 폰 시트는 아래로 쓸어 닫는 게 익숙한 관례다.
   - 출처: emilkowalski/vaul ★8.7k (리포가 "unmaintained" 라서 코드는 가져오지 말고 수치만 쓴다) `src/constants.ts`: `VELOCITY_THRESHOLD = 0.4`, `CLOSE_THRESHOLD = 0.25`, `SCROLL_LOCK_TIMEOUT = 100`, `TRANSITIONS {DURATION: 0.5, EASE: [0.32,0.72,0,1]}`. 열고 500ms·`scrollTop` 조건은 `src/index.tsx` `shouldDrag`. https://github.com/emilkowalski/vaul/blob/main/src/constants.ts

8. **[small] 장면 속 작은 표적: 레이캐스트가 빗나가면 근처 하나를 고른다**
   - 할 일: `js/scene3d.js` `pick(e)` 에서 레이캐스트가 아무것도 못 맞혔을 때 이렇게 한다. 탭 가능한 메시(문어·포스터·기념품·창문)의 화면 투영 중심 가운데, 탭 지점에서 22 CSS px 안에 **딱 하나**만 있으면 그것을 고른다. 둘 이상이면 아무것도 고르지 않는다. §18 소품 탭도 같은 함수를 쓴다. 기존 8px 이동 판정과 350ms 쓰다듬기는 그대로 둔다.
   - 이유: 선반 기념품처럼 화면에서 24px 보다 작은 표적은 엄지로 맞히기 어렵다. WCAG 2.5.8 의 간격 예외("24 CSS pixel diameter circle … do not intersect")를 코드로 옮긴 것이라, 잘못 누르는 일 없이 너그러워진다.
   - 출처: w3c/wcag ★1.5k `guidelines/sc/22/target-size-minimum.html` (SC 2.5.8) https://github.com/w3c/wcag/blob/main/guidelines/sc/22/target-size-minimum.html

9. **[feature] 햅틱은 옵트인으로, 안드로이드에서만, 의식 순간에만**
   - 할 일: `js/app.js` 에 `buzz()` 를 하나 만든다.
     - 조건: `S.settings.haptics === true` (기본은 꺼짐. 방 보기 › 설정의 소리 토글 옆에 둔다) 이고 `'vibrate' in navigator` 일 때만 `navigator.vibrate(12)`.
     - 쓰는 곳: 포스터가 걸릴 때와 등불 칸이 켜질 때, 이 두 군데뿐이다. 한 의식에 최대 1번.
     - 안 쓰는 곳: 버튼 누름, 실패·모의 방문, 달리기 충돌. 벌로 느껴지는 채널을 만들지 않는다.
     - iOS: Safari 에는 Vibration API 가 없다. 대안인 `<input type=checkbox switch>` 꼼수(tijnjh/ios-haptics ★141)는 신뢰된 탭에서만 울려서 의식 타이밍에 못 쓴다. 그래서 iOS 는 진동 없이 둔다.
   - 이유:
     - Android 가이드는 키클릭이 10~20ms 라고 한다. 웹이 쓸 수 있는 건 "레거시 one-shot" 진동뿐이라, 잦은 누름에 쓰면 웅웅거린다. 가이드 원문: "Given the choice of buzzy haptics or no haptics for touch feedback, choose no haptics."
     - 화면과 어긋난 진동은 고장처럼 느껴진다.
     - Chrome 은 사용자 활성화 전 호출을 막는다. MDN 은 sticky activation 이 필요하다고 적었으니, 첫 탭 이후 의식 시점에 부르는 건 된다.
   - 결정할 것: 설정 항목을 하나 추가할지, 기본값을 꺼짐으로 둘지.
   - 출처: https://developer.android.com/develop/ui/views/haptics/haptics-principles · mdn/content `navigator/vibrate` https://github.com/mdn/content/blob/main/files/en-us/web/api/navigator/vibrate/index.md · Chromium "Remove navigator.vibrate without user gesture" https://codereview.chromium.org/2778693004 · https://github.com/tijnjh/ios-haptics

10. **[feature] §18 "상자 덜컹" 을 trauma² 모델로**
    - 할 일: §18 이 확정되면, 흔들림은 카메라가 아니라 소품 그룹에 준다.
      - 탭마다 `trauma = min(1, trauma + 0.4)`. 실제 흔들림 양은 `k = trauma * trauma`.
      - 오프셋은 `round(2 * k * n(t))` 아트 px. `n` 은 시드 해시로 만든 값노이즈(-1..1, 20Hz)이고 `Math.random` 은 쓰지 않는다(CG R12).
      - 회전은 최대 `4° * k`.
      - `trauma -= 3 * dt` 라서 약 0.3s 면 0 이 된다.
      - 모션 감소면 흔들지 않고 한 프레임만 2px 기울인다.
    - 이유: 제곱이라 첫 탭은 살짝, 연달아 누르면 점점 세게 흔들린다. 그래서 §18 의 "탭 횟수 따라 단계" 감각을 새 그림 없이 얻는다. 정수 px 라서 픽셀 룩도 지켜진다.
    - 출처: bevyengine/bevy ★49.5k `examples/camera/2d_screen_shake.rs` (`TRAUMA_DECAY_PER_SECOND = 0.5`, `TRAUMA_EXPONENT = 2.0`, `MAX_ANGLE = 10°`, `MAX_TRANSLATION = 20`, `NOISE_SPEED = 20`, 주석 "follows the GDC talk …") https://github.com/bevyengine/bevy/blob/main/examples/camera/2d_screen_shake.rs · Squirrel Eiserloh, GDC 2016 "Math for Game Programmers: Juicing Your Cameras With Math" https://www.youtube.com/watch?v=tu-Qe66AvtY

11. **[feature] 첫 실행 안내를 push 에서 pull 로**
    - 지금 상태: 이름을 저장하자마자 토스트가 뜬다(`js/app.js` `toast('힌트는 비워 둬도 돼. …')`, §7.8). 그런데 같은 순간 로그 빈 상태(`.lempty`)에도 "(비워 둬도 돼)" 가 있다. 같은 말이 두 번, 아무것도 안 하고 있을 때 나온다.
    - 할 일: 토스트를 빼고, 같은 문장을 힌트 입력칸이 **처음 포커스될 때** `.help` 줄로 한 번만 보여 준다. 코치마크·오버레이·화살표는 쓰지 않는다. 선택 사항: 첫 세션에 10초 동안 아무 입력이 없으면 문어가 버튼 쪽을 한 번 쳐다본다(`setExpression('curious')`, 평생 1회).
    - 이유: NN/g 에 따르면 시작할 때 밀어 넣는 안내(push)는 건너뛰거나 잊힌다. 필요해진 순간 끌어다 보는 도움말(pull)이 남는다. §7.8 스펙을 바꾸는 일이라 결정이 필요하다.
    - 출처: https://www.nngroup.com/articles/onboarding-tutorials/ · https://www.nngroup.com/articles/help-and-documentation/ (이 세션에서는 호스트가 막혀 검색 요약으로만 확인했다)

12. **[feature] 다락방 달리기 "천천히" 도움 모드**
    - 할 일: `js/runner.js` 설정에 "천천히" 토글을 단다(`V0`/`VMAX` × 0.75).
      - 결과에는 "천천히 달렸어" 라고 정직하게 적는다.
      - 주간 랭킹 제출 폼은 숨긴다. 서버는 기본 상수로 리플레이해 검증하므로(`docs/MINIGAME.md`) 천천히 모드 기록이 섞이면 안 된다.
      - 문구에 "쉬운", "약한" 같은 낙인을 쓰지 않는다.
    - 이유: 복지 원칙(벌 없음)과 맞는다. Celeste 는 무적·무한 스태미나 같은 도움 옵션을 아무 판단 없이 1급 옵션으로 둔다. 랭킹 분리와 표기를 어떻게 할지는 결정이 필요하다.
    - 출처: NoelFB/Celeste ★4.0k `Source/Player/Player.cs` (`SaveData.Instance.Assists.Invincible`, `Assists.InfiniteStamina`, `Assists.DashMode`) https://github.com/NoelFB/Celeste/blob/master/Source/Player/Player.cs

---

**확인했고 이미 있어서 뺀 것**
- 이미 들어간 것: 누름 `translate(2px,2px)`, idle 숨쉬기 8fps 스텝, 빈 상태 문구, 토스트, 모션 감소, theme-color (`index.html` 7–8행), 스텝 파티클 (`ui-art.css`), 장면 탭 판정(8px 이동·350ms 쓰다듬기), 달리기 충돌 220ms 흔들림·점프 예약 6틱, Galmuri 정수배 크기(16/20/24px).
- 큰 awesome 목록: ellisonleao/magictools 에는 game feel·juice·haptics·onboarding 항목이 없다(UI 에셋·사운드 팩뿐). grapefrukt/juicy-breakout ★690 README 에는 토글 목록이 없다. 그래서 수치는 컴포넌트 라이브러리(material-web, vaul)와 엔진 예제(bevy)의 소스에서 가져왔다.

**이 세션에서 접속이 막힌 곳**: developer.mozilla.org, nngroup.com, developer.chrome.com, w3.org, bevy.org, lea0.verou.me. MDN·W3C·bevy 는 GitHub 원본(mdn/content, w3c/wcag, w3c/csswg-drafts, bevyengine/bevy)에서 직접 읽었고, NN/g 는 검색 요약만 봤다. 스타 수는 2026-11-04 GitHub 페이지 기준이다.
