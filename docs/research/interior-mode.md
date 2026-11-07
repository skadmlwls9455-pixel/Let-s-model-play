# 인테리어 모드 리서치 — DESIGN §19 보강 (2026-11-04)

> **요약 1.** §19의 "아이템 탭 → 슬롯 탭" 슬롯 모델이 맞다. WCAG 2.5.7(드래그 대체 경로)을 그대로 충족하고, 슬롯 모델에는 "놓으면 안 되는 자리"가 없으니 Sims·Stardew·blueprint3d식 빨강 경고도 필요 없다. 남은 일은 **작은 픽셀 슬롯을 잘 맞히게 하는 것**과 **편집 중 제스처 충돌을 없애는 것**이다.
> **요약 2.** 되돌리기·`byHuman`·문어의 "자리 바꾸기"는 따로 만들지 말고 **배치 명령 로그 하나**(three.js editor의 History/Command 구조)로 묶는다. 슬롯별 `by`를 두면 "문어는 사람이 놓은 자리를 안 건드린다"가 저절로 지켜진다.
> **요약 3.** 문어의 주체성은 거부권이 아니라 **분업**에서 나온다. 자리는 사람이 고르고, 놓는 모양은 문어가 정한다(Townscaper). 바람 하나는 말하되 강요하지 않는다(HHP 의뢰). 끝내면 옮긴 가구를 직접 써 본다. 문어가 자기 물건을 만지면 숨기지 않고 로그에 남긴다(A Little to the Left의 고양이를 순하게 바꾼 것).

이미 적용된 규칙은 다시 쓰지 않았다(44px 타깃, 빨강 금지·회색 글리프, 모션 감소, `#toast` live region, 시드 PRNG, append-only 로그). 아래 항목은 그 위에 얹는다. 좌표 수치는 `js/scene3d.js` 기본값 p=2, 줌 1 기준이다(27 아트px/m × 2 = **54 CSS px/m**).

---

1. **[small] 편집 중 슬롯 고르기는 메시 레이캐스트가 아니라 화면 거리 기준 최근접 슬롯으로 (bubble cursor)**
   - 무엇: `js/scene3d.js` `pick()`에서 `st.edit`일 때는 후보 슬롯의 월드 좌표를 `v.clone().project(camera)`로 CSS px로 바꾼 뒤, 탭 지점에서 가장 가까운 슬롯을 반경 32px 안에서 고른다. 이때 문어 히트 구(`hit`, 반지름 약 0.67m ≈ 72px)·`glass`·포스터 메시는 목록에서 **뺀다**. 빼지 않으면 문어 근처 슬롯을 누를 때 `on.tap`/`on.pet`이 가로챈다.
   - 왜: 선반 기념품 간격은 0.24m ≈ **13 CSS px**, 보드 포스터 칸은 0.54m ≈ 29px라서 메시 히트로는 44px 규칙을 지킬 수 없다. 최근접 방식은 아트를 키우지 않고도 판정 영역을 넓혀 준다.
   - 출처: Grossman & Balakrishnan, *The Bubble Cursor*, CHI 2005 — https://www.dgp.toronto.edu/papers/tgrossman_CHI2005.pdf

2. **[small] 편집 모드에서는 한 손가락 드래그로 시점을 돌리지 못하게 하고, 시점을 정면(yaw 0)으로 모은다**
   - 무엇: `scene3d`에 `setEditMode(on)`를 추가한다. 켜지면 `pointermove`의 `yawDrag = …` 분기를 건너뛰고 `yawDrag`를 `--t-ui` 동안 0으로 이징한다(`yawDelta()`의 9° 스냅은 그대로 둔다). 핀치 줌과 휠 줌은 남긴다. 끝내기를 누르면 원래 yaw로 돌아가지 않고 0에서 다시 시작한다.
   - 왜: 지금은 8px 넘게 움직이면 드래그로 판정한다(`press.moved`). 탭하다 손가락이 조금 미끄러져도 시점이 돌아가 슬롯이 손가락 밑에서 빠져나간다. 한 모드에서 한 제스처는 한 가지 뜻만 가져야 한다. 슬롯이 늘 같은 화면 자리에 있으면 사람이 위치를 외울 수도 있다.
   - 출처: SortableJS(31.2k★)는 터치 드래그와 스크롤이 부딪치는 문제 때문에 `delayOnTouchOnly`·`touchStartThreshold`를 따로 둔다 — https://github.com/SortableJS/Sortable

3. **[small] 아이템을 고르면 갈 수 있는 슬롯만 보인다. 이미 찬 칸을 탭하면 서로 자리를 바꾼다 (오류 상태 없음)**
   - 무엇: `highlightSlots(ids)`가 빈 칸은 1px 테두리 2Hz 깜빡임(모션 감소면 점선 고정)으로, 찬 칸은 ⇄ 글리프로 그린다. 찬 칸에 놓으면 원래 있던 물건이 들고 온 물건의 옛 자리로 간다. "자리가 없어" 같은 거절 문구는 아예 만들지 않는다. §19에는 찬 칸을 탭했을 때 동작이 정해져 있지 않으니 이것으로 채운다.
   - 왜: 자유 배치형 편집기는 겹침 때문에 빨강이 필요하다(blueprint3d `errorColor = 0xff0000`, Stardew 빨간 타일). 슬롯형인 네코아츠메는 정해진 자리만 쓰고, 큰 물건은 두 칸을 차지하는 식으로 겹침 문제를 피한다. 맞바꾸기를 쓰면 물건이 사라지지도 않고 거절도 생기지 않는다.
   - 출처: https://raw.githubusercontent.com/furnishup/blueprint3d/master/src/items/item.ts (blueprint3d 2.0k★) · https://nekoatsume.fandom.com/wiki/Goodies

4. **[small] 회전은 "고른 아이템을 한 번 더 탭하면 방향이 바뀌는" 토글로. 방향마다 자리를 미리 계산해 둔 슬롯으로 다룬다**
   - 무엇: 러그(h/v)와 담요(2방향)는 같은 아이템을 다시 탭하면 방향이 바뀐다. 각 방향의 바닥 면적(footprint)은 빌드할 때 `snapPos`로 미리 검증한 고정 슬롯(`rug:h`, `rug:v`)으로 둔다. 실행 중에 겹침을 검사하는 코드는 만들지 않는다. 직교 45° 카메라에서는 90° 회전이 좌우 뒤집기처럼 보이므로, 바뀐 뒤 1px 통통 하나로 바뀐 것을 확인시켜 준다.
   - 왜: Stardew 모바일은 "아이템 탭 = 회전"을 쓴다. blueprint3d는 회전을 π/2 단위로 스냅한다(허용 오차 π/16). 두 방향만 있으면 회전 손잡이 UI가 필요 없다.
   - 출처: https://shockbyte.com/ko/blog/how-to-rotate-furniture-in-stardew-valley · blueprint3d `item.ts` `rotate()`(위 URL)

5. **[small] 되돌리기·`byHuman`·문어의 자리 바꾸기를 배치 명령 로그 하나로 묶는다**
   - 무엇: `js/app.js` `S.room.layoutLog`에 `{item, from, to, by:'human'|'oct', at}`를 append하고, `layout`은 이 로그를 리플레이해 만든다(기존 `B.replay` 방식과 같다. 로그는 최근 50개만 남긴다). 되돌리기는 마지막 명령 하나를 거꾸로 실행한다. 한 번 고른 아이템을 여러 번 옮긴 것은 명령 하나로 합친다. 집에 있는 날 하는 `rearrange` 활동(`js/app.js` 791행, 지금은 `posterOrder`를 바로 바꿈)도 `by:'oct'` 명령으로 기록한다.
   - 왜: three.js editor는 모든 편집을 `execute()/undo()/toJSON()` 명령으로 만들고, 같은 대상을 500ms 안에 연달아 바꾸면 한 단계로 합친다(`timeDifference < 500`). 이 구조 하나면 1단계 되돌리기, "문어가 바꾼 것만 되돌리기", 로그 줄 생성이 모두 해결된다.
   - 출처: https://raw.githubusercontent.com/mrdoob/three.js/dev/editor/js/History.js · https://raw.githubusercontent.com/mrdoob/three.js/dev/editor/js/commands/SetPositionCommand.js (three.js 117.6k★)

6. **[small] `byHuman`은 레이아웃 전체가 아니라 슬롯마다 둔다. 불러올 때 `normalizeLayout()`으로 고친다**
   - 무엇: 저장 형태를 `layout.slots[slotId] = { item, by, at }`로 바꾼다(좌표는 저장하지 않고 슬롯 id만). `normalize()` 안에서 세 가지를 처리한다. 없어진 슬롯 id는 그 아이템의 기본 슬롯으로 옮긴다. 한 슬롯을 두 아이템이 차지하면 뒤의 것을 기본 자리로 보낸다. 앨범에 없는 `tripId` 포스터는 칸을 비운다. **아이템은 절대 사라지지 않는다.**
   - 왜: §19의 "`byHuman`인 자리는 건드리지 않는다"를 지키려면 슬롯 단위 정보가 필요하다. 장면에 슬롯이 늘거나 이름이 바뀌어도 옛 저장이 깨지면 안 된다. three.js editor도 객체를 좌표가 아닌 고정 id(`objectByUuid`)로 다시 찾는다.
   - 출처: 위 `SetPositionCommand.js` `fromJSON` · `History.js` `fromJSON`

7. **[small] 끝내면 "살아 보기": 문어가 방금 옮긴 가구로 걸어가 직접 써 본다 (앵커가 레이아웃을 따라가게)**
   - 무엇: `scene3d` `anchorPos(name)`(1042행)는 지금 고정된 `ANCHORS` 좌표를 읽는다. 이것을 `blanket`/러그/창턱 앵커는 현재 레이아웃 슬롯에서 계산하도록 바꾼다. 끝내기를 누르면 사람이 옮긴 마지막 1~2개로 `moveTo` 해서 그 가구를 쓴다(러그면 털썩, 담요면 눕기, 포스터면 바라보기, 양초면 쬐기). 한마디는 그 다음에 한다. 모션 감소면 즉시 이동한다.
   - 왜: 담요를 옮겼는데 문어가 예전 자리 맨바닥에 눕는다면, 배치가 문어에게 아무 의미 없다는 신호가 된다. HHP에서도 손님은 꾸미는 동안 반응하고 끝나면 소감을 말한다. 배치를 함께 소유한다는 감각은 문어가 그 가구를 쓰는 모습에서 생긴다.
   - 출처: https://www.gfinityesports.com/animal-crossing-new-horizons/how-to-make-perfect-vacation-home/ ("keep an eye on your client") · https://game8.co/games/Animal-Crossing-New-Horizons/archives/296830

8. **[small] 문어의 대안 제안(30%)을 세션당 1회로 줄이고, 두 버튼의 무게를 같게 한다**
   - 무엇: §19의 "음, 창가가 더 좋지 않을까?"에 조건을 붙인다. (a) 편집 세션당 최대 1회, (b) 사람이 이번 세션에 두 번 옮긴 아이템에는 하지 않는다, (c) 버튼 두 개는 같은 크기·같은 스타일로 "그리로" / "여기 둘래", (d) 답하지 않고 다른 아이템을 고르면 그대로 두는 것으로 처리하고 다시 묻지 않는다. "여기 둘래"를 고르면 "여기도 좋아"처럼 긍정하는 한마디만 한다.
   - 왜: Unpacking은 "잘못 놓음" 빨강 표시를 짐을 다 푼 **뒤에만** 보여 주는데도 리뷰에서 "화난 듯 빛난다"는 말을 들었다. 그래서 끄는 옵션(Allow Items Anywhere)까지 넣었다. 판정이 자주 끼어들면 잔소리가 된다.
   - 출처: https://primagames.com/reviews/unpacking-review · https://www.supercheats.com/unpacking-cheats-tips · GDC 2022 *Unpacking a Narrative Through 1,000 Household Items* https://gdcvault.com/play/1027694/Independent-Games-Summit-Unpacking-a

9. **[small] 캔버스 밖 대체 경로: 하단 편집 바에 슬롯 `<button>`을 두고, 들기·놓기·취소를 한국어로 알린다**
   - 무엇: 아이템을 고르면 `index.html`의 편집 바에 그 아이템이 갈 수 있는 슬롯을 진짜 버튼으로 나열한다("상자 위 · 창턱 · 선반", 지금 자리는 `aria-pressed`). 3D 깜빡임과 같은 상태를 공유한다. 기존 `toast()`로 "양초를 들었어. 놓을 자리 3곳" / "창턱에 놓았어" / "그대로 뒀어"를 알린다. 2D 폴백(`scene2d`)도 이 바로 똑같이 동작한다.
   - 왜: 캔버스 안 슬롯에는 포커스가 가지 않는다. 탭-탭 방식은 WCAG 2.5.7(드래그 없는 단일 포인터 경로)을 충족하지만 키보드·스크린리더 경로는 따로 있어야 한다. dnd-kit은 들기·위·놓기·취소 네 가지 안내 문구를 기본으로 제공한다.
   - 출처: https://raw.githubusercontent.com/clauderic/dnd-kit/master/packages/core/src/components/Accessibility/defaults.ts (dnd-kit 17.8k★) · https://www.w3.org/WAI/WCAG22/Understanding/dragging.html

10. **[small] 놓는 소리는 재질 묶음 × 표면 묶음 표로 만든다 (#17 `js/audio.js` 연결 때)**
    - 무엇: 표면 4개(나무 상자, 창턱, 코르크 보드 핀, 천 러그) × 아이템 재질 3개(종이, 도자기·유리, 천)로 12칸 표를 만든다. 두 재질이 만나면 "부드러운 쪽이 이긴다"는 규칙으로 실제 필요한 소리 수를 줄인다. 들 때 소리와 놓을 때 소리는 다르게 한다. 슬롯 정의에 `surface`를 둔다. 기본 무음·옵트인 원칙(GF R22)은 그대로다.
    - 왜: Unpacking은 처음에 75K 파일(500 물건 × 15 표면 × 10 변형)을 예상했지만, 재질을 일반화하고 부드러운 재질이 소리를 정하게 해서 15K 아래로 줄였다. 같은 물건이라도 놓는 표면에 따라 소리가 달라지는 것이 "놓는 손맛"의 대부분이다.
    - 출처: GDC 2022 *'Unpacking': The Fun Behind the Foley* https://gdcvault.com/play/1027728/-Unpacking-The-Fun-Behind · https://www.audiokinetic.com/en/blog/unpacking-the-fun-behind-the-foley

11. **[feature] "자리는 사람이, 모양은 문어가": 놓는 순간의 마무리는 문어가 정한다**
    - 무엇: 사람이 슬롯을 고르면 문어가 들고 가서 놓고(`carryTo`), 마무리는 시드 PRNG로 문어가 정한다. 포스터 기울기 ±3°(이미 GF R15 `--rot`), 양초를 켤지 끌지(시각 기준), 화분 잎을 창 쪽으로 돌리기, 러그 모서리 한 번 접기 같은 것이다. 사람이 이 마무리를 직접 조정할 수는 없고, 옮기기 전체를 되돌리는 것만 할 수 있다.
    - 왜: Stålberg는 Townscaper의 매력을 "사용자와 알고리즘 사이의 분업이 분명한 것"이라고 설명한다. 이렇게 하면 문어가 사람의 선택을 거부하지 않으면서도 놓을 때마다 문어의 손길이 남는다.
    - 출처: https://pcgamer.com/townscapers-developer-on-how-its-radically-casual-design-is-inspiring-a-new-wave-of-low-stress-builders-to-adapt-the-blueprint

12. **[feature] 문어의 "오늘 바람" 한 줄 (HHP 의뢰를 아주 작게)**
    - 무엇: 모드에 들어갈 때 문어가 바람을 하나만 말한다. 최근 여행이나 기념품에서 시드로 고른다. 예: "어제 주운 조개, 창가에 두고 싶어". 해당 아이템에는 작은 ♪ 표시만 붙는다. 체크 표시, 진행도, 보상은 없다. 들어주면 7번 살아 보기 때 그것부터 보러 가고, 안 들어줘도 아무 일도 없다.
    - 왜: HHP는 손님이 테마와 원하는 가구 몇 개를 주고 나머지는 플레이어가 꾸미게 한다. 원하는 쪽과 놓는 쪽이 갈려서 서로의 몫이 분명해진다. 단 HHP의 "요청 가구가 없으면 대성공이 아니다"는 판정은 가져오지 않는다(복지 원칙).
    - 출처: https://www.gfinityesports.com/animal-crossing-new-horizons/how-to-make-perfect-vacation-home/ ("three requested furniture pieces") · https://nookipedia.com/wiki/HHP

13. **[feature] 차례 주고받기: 사람이 끝내면 문어는 자기 물건 하나만 옮기고, 반드시 로그에 남긴다**
    - 무엇: 끝내기 뒤(또는 다음에 집에 있는 날) 문어가 `by!=='human'`인 슬롯 중 하나만 옮긴다. 주로 오늘 가져온 기념품의 선반 순서다. 로그에 "선반 기념품 하나 옮겼어 · 되돌리기"를 남기고, 되돌리기는 5번 로그를 쓴다. 사람이 놓은 자리는 절대 건드리지 않는다.
    - 왜: A Little to the Left에서는 고양이가 정리를 장난스럽게 흐트러뜨린다. 의도된 "제2의 의지"다. 나중에 "Let it Be"로 건너뛰는 길도 생겼다. 우리 문어는 그 고양이를 순하게 바꾼 것이다. 숨겨서 바꾸지 않고(정직), 사람 몫은 침범하지 않으며, 언제든 되돌릴 수 있다.
    - 출처: https://www.gamespew.com/2022/11/a-little-to-the-left-review/ · https://en.wikipedia.org/wiki/A_Little_to_the_Left · https://mcvuk.com/business-news/when-we-made-a-little-to-the-left/

14. **[feature] 드래그는 덤으로만: 길게 눌러 들고, 바닥 평면에 붙여 움직이고, 놓으면 자석처럼 슬롯에 붙는다**
    - 무엇: 1차 경로인 탭-탭은 그대로 둔다. 추가로, 옮길 수 있는 아이템을 350ms 길게 누르면(기존 쓰다듬기 타이머와 같은 값) 들어 올린다. 끌 때는 `new THREE.Plane(up, -surfaceY)`와 `raycaster.ray.intersectPlane()`으로 표면 높이에 붙여 움직인다. 손을 떼면 화면 거리 48px 안의 최근접 슬롯에 붙는다(1번과 같은 함수). 그 밖이면 원래 자리로 미끄러져 돌아간다. "잘못 놓음" 상태는 없다. r128 `THREE.DragControls`는 그대로 쓰지 않는다. 이 컨트롤은 카메라를 향한 평면 위에서 움직여서 기울어진 직교 카메라에서는 물건이 바닥에서 떠오르고, 터치 분기는 `// TODO touch`로 비어 있다.
    - 왜: §19는 "드래그 없이"로 정해져 있으니 사용자가 결정할 일이다. 드래그를 넣더라도 2.5.7 대체 경로를 해치지 않는 덧붙임이어야 한다.
    - 출처: https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/js/controls/DragControls.js · https://github.com/taye/interact.js (12.9k★, snap 모디파이어) · SortableJS `delay`/`touchStartThreshold`(위)

15. **[feature] 인테리어 동안 등불·진행과 완전히 떼어 놓았다는 것을 화면에서도 보이게 한다**
    - 무엇: 편집 바에서 상태줄의 "등불 n/8"과 "여행 n"을 숨기고, "같이 꾸미는 중"이라는 한 줄만 보인다. 끝내기 뒤 토스트도 "방이 바뀌었어"뿐이다. 수치, 칭찬 등급, 체크 표시는 없다.
    - 왜: Stålberg는 "이길 수 있으면 이기려고 하고, 점수를 매기면 점수를 위해 한다"고 말한다. 진행 표시가 보이면 사람은 꾸미기를 진행 수단으로 읽는다. §19의 "인테리어로 등불이 오르지 않는다"를 규칙만이 아니라 화면으로도 보여 준다.
    - 출처: https://pcgamer.com/townscapers-developer-on-how-its-radically-casual-design-is-inspiring-a-new-wave-of-low-stress-builders-to-adapt-the-blueprint · https://www.bloomberg.com/news/articles/2020-07-24/the-video-game-where-you-build-an-empty-town

---

### 참고한 방 편집기 레포 (스타: 2026-11-04 GitHub 페이지 조회)

| 레포 | ★ | 가져올 것 |
|---|---|---|
| https://github.com/mrdoob/three.js `editor/js/History.js`, `commands/*` | 117.6k | 명령 객체(`execute/undo/update/toJSON`), 500ms 병합, 객체를 uuid로 다시 찾기 → 5·6번 |
| https://github.com/SortableJS/Sortable | 31.2k | 터치 전용 지연(`delayOnTouchOnly`), 움직임 임계값 → 2·14번. 선반 순서 시트를 DOM 리스트로 만들 때 그대로 쓸 수 있음 |
| https://github.com/clauderic/dnd-kit | 17.8k | 들기·위·놓기·취소 안내 문구, 키보드 센서 → 9번 |
| https://github.com/taye/interact.js | 12.9k | snap 타깃 + 자석 범위 → 14번 |
| https://github.com/furnishup/blueprint3d | 2.0k | `item.ts`: 호버 emissive `0x444444`, 오류 글로우(빨강 — **가져오지 않음**), π/2 회전 스냅 → 3·4번 |
| https://github.com/laanlabs/openPlan3D | 271 | 묶음 단위 히스토리, JSON 내보내기/가져오기, 자동 저장 스냅샷 |
| https://github.com/ch-bas/threejs-sims-house-builder | 89 | 폰에서 하단 시트 아이템 편집기 + 도킹 터치 HUD(편집 바 배치 참고) |

**조회 한계**: 이 세션 네트워크에서 gamedeveloper.com, pcgamer.com, wikipedia.org, w3.org, nookipedia.com, audiokinetic.com은 WebFetch로 열 수 없었다. 이 도메인을 인용한 문장은 검색 결과 요약으로 확인한 것이다. 원문 직접 대조가 필요하면 네트워크 허용 목록에 추가해야 한다. ACNH 꾸미기 모드의 카메라 동작과 HHP 손님 반응은 1차 출처(닌텐도 매뉴얼, 개발자 인터뷰)를 찾지 못해 팬 가이드로만 확인했다.
