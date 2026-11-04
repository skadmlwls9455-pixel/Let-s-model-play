# 가구 탭 이벤트 리서치: 누를수록 달라지는 소품 (DESIGN §18 준비)

조사일 2026-11-04. 스타 수는 이날 github.com 페이지에서 본 값이다. 원문이 이 세션 네트워크에서 막힌 출처(gamedeveloper.com, nookipedia.com, medium.com 등)는 검색 스니펫만 보고 썼고, 그런 항목에는 "(검색 요약)"을 붙였다.

**요약**
1. 지금 판정 크기가 너무 작다. 줌 1에서 1 m는 약 54 CSS px라서, 선반 기념품은 약 10–12 px(간격 13 px), 포스터는 약 23×30 px다. 게다가 문어의 히트 구(지름 72 px)가 그 앞을 가리면 탭을 가져간다. 소품을 더 붙이기 전에 판정부터 고친다(1–3).
2. 탭 단계는 "반응이 끝난 횟수"로 센다. 대사는 ink식 stopping → shuffle 꼬리로 고르고, Valve식으로 다 쓴 뒤에야 반복한다. 이렇게 하면 연타로 단계를 건너뛰지 못하고, 아무 반응 없는 탭도 생기지 않는다(4–5, 8).
3. 탭할수록 짜증이 아니라 경이 쪽으로 커지게 한다(Warcraft "Stop poking me" 반대). 다음 단계가 남았다는 신호는 아주 작게 주고, 발견 총수는 보일지 사용자가 정한다(11–15).

---

1. **[small] 탭 판정 우선순위: 큰 문어 프록시가 작은 표적을 가리지 않게** — `js/scene3d.js` `pick()`(≈1824행). 지금은 거리순으로 첫 히트를 고른다. 이를 2단으로 바꾼다. (a) 포스터·기념품·창·소품과 문어의 *실제 몸 메시*(`bodyG`, recursive)를 먼저 레이캐스트한다. (b) 아무것도 맞지 않을 때만 문어 히트 구(r 0.67 m)로 판정한다. 문어가 보드나 선반 앵커에 서 있으면 지금 구조에서는 그 뒤 포스터를 누를 수 없다.
   - 왜: 3D에서는 가까운 것이 먼저 받는다(r3f도 기본이 nearest-first이고 `filter`로 순서를 바꾼다). Hidden Through Time 리뷰에 "사람을 눌렀는데 옆 나무가 흔들린다"는 불만이 있다.
   - 출처: https://github.com/pmndrs/react-three-fiber/blob/master/docs/API/events.mdx (react-three-fiber 33.5k★) · https://www.appunwrapper.com/2020/03/15/hidden-through-time-review/ (검색 요약)

2. **[small] 빗나간 탭은 화면 공간 최근접 표적으로 보정 (bubble cursor 간이판)** — `pick()`이 null이면 후보의 중심을 `Vector3.project(camera)`로 CSS px로 바꾸고, 손가락에서 22 px(지름 44) 안에 있는 가장 가까운 하나를 고른다. 후보가 둘 이상 같은 거리 안에 있으면 고르지 않는다(10번 DOM 목록으로 넘긴다). §18의 "44px 이상 히트 영역"을 프록시 크기로 맞추면 0.81 m가 되어 상자보다 커지고 서로 겹친다. 그래서 프록시는 bbox + 1 아트픽셀로 두고, 44 px는 이 보정으로 채운다.
   - 왜: 활성 영역을 최근접 표적 하나로 넓히는 방식이 점 커서보다 빠르고 Fitts 법칙으로 예측된다는 결과가 있다. three.js Mesh에는 Points/Line 같은 `threshold`가 없다(r128 소스 `params: { Mesh: {}, Line: { threshold: 1 }, Points: { threshold: 1 } }`).
   - 출처: https://www.dgp.toronto.edu/papers/tgrossman_CHI2005.pdf (Grossman & Balakrishnan, CHI 2005, 검색 요약) · https://github.com/mrdoob/three.js/blob/r128/src/core/Raycaster.js (three.js 117.6k★)

3. **[small] 히트 프록시는 레이어 1에 올리고 `Raycaster.layers`로 고른다** — r128 `intersectObject`는 `object.layers.test(raycaster.layers)`를 통과한 것만 검사한다. 그래서 프록시에 `layers.set(1)`, 레이에 `ray.layers.enable(1)`을 주면 카메라(레이어 0)는 그리지 않고 레이만 맞는다. 드로우콜이 0이고, `atticG`를 recursive로 한 번 돌리면 된다. 그러면 1828행의 수동 목록 ("바깥이면 문어만")을 유지할 필요가 없다. 여러 메시로 된 소품은 drei `meshBounds`처럼 bbox만으로 판정하면 싸고 넉넉하다.
   - 왜: §18에서 소품이 13개로 늘면 목록 관리가 곧 버그원이 된다(숨은 그룹도 레이에 걸린다는 주석이 이미 있다).
   - 출처: https://github.com/mrdoob/three.js/blob/r128/src/core/Raycaster.js · https://github.com/pmndrs/drei/blob/master/src/core/meshBounds.tsx (drei 10.1k★)

4. **[small] 반응 중 탭은 단계로 세지 않고, 끝나면 하던 일로 돌아간다** — vscode-pets `swipe()`는 이미 swipe 상태면 `return`한다. 아니면 현재 상태를 `holdState`에 맡기고 15프레임 반응을 재생한 뒤 원래 상태로 돌아간다. 같은 방식으로 `state.props[id].taps`는 *반응 완료* 때만 +1 하고, 반응 중 탭에는 6번의 눌림만 준다. 문어 탭(`js/app.js` 310행 `tap:`)과 `windowTap`(이동 중 재탭)에도 같은 잠금을 건다.
   - 왜: 폰에서 연타하면 1→3단계가 1초 만에 지나가고 문어 걷기 경로가 꼬인다. 잠금은 거절이 아니라 "아직 보고 있어"다.
   - 출처: https://github.com/tonybaloney/vscode-pets/blob/main/src/panel/basepettype.ts (vscode-pets 4.2k★)

5. **[small] 대사 고르기 = ink 시퀀스 의미론 + 다 쓰고 나서 반복** — `js/app.js`에 `pickLine(list, mode, n, rng)` 하나를 둔다. 모드는 `stopping`(마지막에 멈춤), `cycle`, `once`(다 쓰면 빈 값), `shuffle`(시드 PRNG, 직전 줄 제외)이다. 먼저 문어 탭에 적용한다. 지금은 매번 `'?'` 하나뿐이니, 예를 들어 `stopping['?', '응?', '(빤히) …불렀어?']` 뒤에 `shuffle['?', '뽈', '(눈 깜빡)']` 꼬리를 붙인다. 소품 단계표도 같은 함수로 돌린다.
   - 왜: 같은 줄이 연달아 나오면 장면이 기계처럼 보인다. Valve 응답 그룹은 기본이 "deplete before repeat"(`permitrepeats`로 해제)이고, `norepeat`이면 다 쓴 그룹을 끈다. Yarn Spinner 기본 전략도 "best least recently viewed"다.
   - 출처: https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md (ink 5.0k★) · https://github.com/ValveSoftware/source-sdk-2013/blob/master/src/game/server/AI_ResponseSystem.cpp (10.1k★) · https://docs.yarnspinner.dev/write-yarn-scripts/advanced-scripting/saliency (Yarn Spinner 2.9k★, 검색 요약)

6. **[small] 3D 소품의 눌림 피드백은 색이 아니라 1 아트픽셀 내려가기** — `pointerdown`에서 포스터, 기념품, (나중에) 소품을 `position.y -= S.pw`만큼 내리고, `pointerup`/80 ms 뒤 되돌린다. 밝기 틴트는 쓰지 않는다. 모션 감소에서도 1 px라 그대로 둔다.
   - 왜: OKLab 팔레트 스냅(three-pixel-look §4.4)이 +5% 정도의 틴트를 같은 팔레트 색으로 되돌려서 눈에 안 보인다. 1 px 이동은 스냅 뒤에도 남는다. Hidden Folks는 튜토리얼 대신 "누르면 살짝 흔들림"으로 만질 수 있는 것을 알렸다.
   - 출처: https://www.gamedeveloper.com/design/building-thousands-of-tiny-interactions-into-i-hidden-folks-i- (검색 요약)

7. **[small] 빈 곳 탭에도 작은 반응: 문어가 그쪽을 1.2초 본다** — `pointerEnd`에서 `k`가 없으면 `on.miss(point)`를 부르고, 바닥 평면과 만나는 점을 `oct.lookTarget`으로 둔다. 글, 카운트, 효과음은 없다. 지금은 `document` `pointermove`의 시선 추적이 터치를 제외하므로, 폰에서 빗나간 탭은 완전히 무반응이다.
   - 왜: Hidden Folks는 잘못 누른 탭도 벌하지 않고 소리로 보상한다. r3f도 `onPointerMissed`를 1급 이벤트로 둔다.
   - 출처: https://github.com/pmndrs/react-three-fiber/blob/master/docs/API/events.mdx · https://www.killscreen.com/get-lost-found-playful-world-hidden-folks (검색 요약)

8. **[small] "하루 한 번"과 "첫 발견"은 토큰 집합으로 저장 (AGS `DoOnceOnly`)** — `S.once`에 `'box:3@' + localDateKey()` 같은 토큰을 넣는다. 오늘 키가 아닌 토큰은 로드 때 버린다. 첫 발견만 `S.found['box:3'] = dateKey`로 남겨 앨범 "발견" 색인에 쓴다. 모든 소품에 기본 한 줄(fallback)을 둔다(AGS `unhandled_event`처럼). 그래야 정의가 빠진 소품도 무반응이 되지 않는다.
   - 왜: §18의 "하루 1회만 3단계"와 "발견 표시"를 카운터 여러 개 대신 저장 키 하나로 처리한다. AGS는 토큰을 세이브(`do_once_tokens`)에 넣어 이 패턴을 엔진 API로 제공한다.
   - 출처: https://github.com/adventuregamestudio/ags/blob/master/Engine/ac/game.cpp (`Game_DoOnceOnly`, AGS 863★) · https://github.com/adventuregamestudio/ags/blob/master/Engine/script/script.cpp (`run_unhandled_event`)

9. **[small] 소품 반응을 데이터 + "가장 구체적인 규칙이 이긴다"로** — `js/world.js`에 `props: { window: [{when:{night:true, weather:'clear'}, line:'별 몇 개 세어봤어'}, {when:{weather:'rain'}, line:'비 와'}, {when:{}, line:'맑네'}] }`처럼 둔다. `js/brain.js`의 순수 함수는 조건을 모두 만족하는 규칙 가운데 조건 수가 가장 많은 것을 고르고, 동점이면 5번 shuffle로 고른다. 지금 `windowTap`의 삼항 체인(app.js 313행)부터 옮긴다. 순수 함수라 테스트하기 쉽다.
   - 왜: Valve Response System은 모든 규칙에 점수를 매겨 최고점 버킷에서 고른다(`FindBestMatchingRule`). 그래서 대사가 늘어도 분기 코드는 늘지 않는다.
   - 출처: https://github.com/ValveSoftware/source-sdk-2013/blob/master/src/game/server/AI_ResponseSystem.cpp · https://cdn.fastly.steamstatic.com/apps/valve/2012/GDC2012_Ruskin_Elan_DynamicDialog.pdf (Ruskin, GDC 2012, 검색 요약)

10. **[small] 캔버스 표적의 DOM 거울: 키보드·스크린리더 경로 겸 촘촘한 표적 고르기** — `#scene3d`는 `aria-hidden`이라서 지금은 키보드로 문어, 창, 포스터, 기념품을 누를 수 없다. 방 보기 시트에 "방 소품" `<button>` 목록(44 px 행)을 두고, 같은 `on.*Tap`/`on.propTap(id)`을 부른다. 양초는 `aria-pressed`(켜짐)를 단 토글 버튼으로 둔다. 2번에서 표적이 모호할 때도 이 목록으로 연다.
    - 왜: react-three-a11y는 3D 객체를 focus 가능한 role(button / togglebutton / link)로 감싸고, 클릭과 키보드 둘 다에서 `actionCall`을 부른다. 같은 계약을 바닐라로 옮기는 것이다.
    - 출처: https://github.com/pmndrs/react-three-a11y (631★)

11. **[feature] 단계표를 기승전결 4박으로 맞추고, 끝은 조용한 순환으로** — §18 표는 2단계(러그)부터 5단계(거미줄)까지 길이가 들쭉날쭉하다. 다음 4박으로 맞추자고 제안한다. 1 모션만(기), 2 한 줄(승), 3 문어가 와서 무언가 함(전), 4+ 2개짜리 cycle(결, 무반응 없음). 반복할수록 짜증이 아니라 엉뚱함과 경이 쪽으로 커지게 쓴다. Warcraft 유닛의 "piss lines"("Stop poking me!", 많이 누르면 터지는 짐승)와 ACNH에서 그물로 세 번 치면 화내고 우정이 깎이는 것은 정확히 피할 패턴이다.
    - 왜: Hayashida는 새 메커닉 하나를 소개 → 전개 → 비틀기 → 마무리 4단계로 다뤘다. 소품 하나가 미니 레벨이다.
    - 출처: https://en.wikipedia.org/wiki/Koichi_Hayashida · https://www.gamedeveloper.com/design/the-secret-to-i-mario-i-level-design (검색 요약) · https://giantbomb.com/wiki/Concepts/Piss_Lines · https://www.nookipedia.com/wiki/Net (검색 요약)

12. **[feature] "아직 더 있어" 신호는 아주 작게, 다 보면 끄기** — 반응이 끝나고 오늘 다음 단계가 남아 있으면 600 ms 뒤 그 소품이 1 px로 한 번 흔들린다. 오늘 분을 다 봤으면 흔들리지 않는다. 그리고 만질 수 있는 것은 8–10개로 제한하고, 모든 메시를 반응시키지 않는다.
    - 왜: Botanicula 리뷰는 "계속 눌러 보라는 신호가 없어 비밀을 두고 떠나기 쉽다"고 지적했다. 반대로 de Jongh는 너무 많은 것을 반응시키면 "전부 반응할 것"이라는 기대가 생긴다고 경고했다. 어디까지 드러낼지는 사용자가 정할 일이다.
    - 출처: https://images.jayisgames.com/review/botanicula.php (검색 요약) · https://www.gamedeveloper.com/design/building-thousands-of-tiny-interactions-into-i-hidden-folks-i- (검색 요약)

13. **[feature] 문어가 먼저 만져 보인다 (말 없는 튜토리얼)** — 집에 있는 날이나 한가한 배회 중에 가끔(시드 PRNG, 하루 1회 상한) 한 번도 안 눌린 소품으로 가서 1단계 반응을 낸다. 이 반응은 사람의 탭 수에 넣지 않는다. 문어 소품 놀이는 octopus-lore F1(약병을 밀고, 돌아오면 또 민다)과 F14(새것에 끌린다)에 근거한다.
    - 왜: 네코아츠메는 장난감을 놓아 두고 고양이가 노는 모습을 "바라보는" 구조다. 사람이 시키지 않아도 대상이 먼저 쓰는 모습이 가장 자연스러운 어포던스다.
    - 출처: https://www.cnn.co.jp/tech/35067131-2.html (검색 요약) · `.claude/skills/cozy-web-game/references/octopus-lore.md` F1, F14

14. **[feature] 발견 색인에 총수(분모)를 보일까** — Botanicula는 생물 카드 123장의 총수를 끝날 때까지 보여 주지 않았다. "발견 7/26"을 보이면 체크리스트가 되어 재화처럼 굴 수 있다. 추천은 발견한 것만 날짜와 함께 보이고 분모는 없는 쪽이다. 결정은 사용자가 한다.
    - 왜: 복지 원칙의 "재화 파밍 없음"이 수집률 압박에도 해당하는지는 해석에 달린 문제다.
    - 출처: https://www.walkthroughking.com/text/botanicula.aspx (검색 요약) · https://images.jayisgames.com/review/botanicula.php (검색 요약)

15. **[feature] 연타는 하루 한 번만 "선물 반응"으로 받기** — 같은 소품을 1.2초 안에 4번 이상 누르면 4번 잠금을 유지한 채, 하루 한 번 특별 반응 하나를 준다(예: 상자에서 문어가 퐁 튀어나옴). 그 뒤 연타는 보통 반응 하나로 접는다(Valve `respeakdelay`식 쿨다운). Warcraft에서 많이 누르면 짐승이 터지는 것을 뒤집어 기쁨으로 받는 것이다.
    - 왜: 폰에서 가장 흔한 "스팸"이 연타다. 무시만 하면 고장 난 것처럼 보이고, 매번 보상하면 연타를 훈련시키게 된다.
    - 출처: https://github.com/ValveSoftware/source-sdk-2013/blob/master/src/game/server/AI_ResponseSystem.cpp (`respeakdelay`, `speakonce`) · https://tvtropes.org/pmwiki/pmwiki.php/Main/StopPokingMe (검색 요약)

---

검증 메모: 1–3의 px 값은 `PX_PER_M × p = 54 CSS px/m`(줌 1, `js/scene3d.js` 13행)와 메시 크기(기념품 0.18–0.22 m, 포스터 `PlaneGeometry(0.42, 0.56)`)로 계산했다. 등각 45° 요 때문에 벽면 가로는 실제로 더 작다. grumpygamer.com, gamedeveloper.com, nookipedia.com, docs.yarnspinner.dev, developer.valvesoftware.com, medium.com, gameaccessibilityguidelines.com은 이 세션에서 접속이 막혀 있었다. 원문을 다시 확인하려면 네트워크 허용이 필요하다.
