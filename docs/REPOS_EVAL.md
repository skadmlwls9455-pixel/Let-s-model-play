# 공유 자료 평가 — 뽈뽈 문어 기준 (repos-eval)

조사일 2026-11-04. 기준은 하나다: **바닐라 HTML/CSS/JS, 빌드 없음, file:// 과 GitHub Pages 에서 돌아감, three.js r128 UMD, 에셋 0(전부 절차적), 사람 버튼 하나·문어가 결정, 패널티 없음, AI 마스코트 정직 표기, 비상업 팬 프로젝트.** 이 기준에 보탬이 되지 않으면 아무리 별이 많아도 "버림"이다.

검증 방법: 스타/라이선스/푸시일은 GitHub Search API(`gh api search/repositories`)로 당일 조회. README·소스는 raw.githubusercontent.com 에서 직접 읽음. **이 세션에서 접속이 막힌 호스트**(kenney.nl, craftpix.net, itch.io, opengameart.org, vercel.app, lospec.com, cdnjs, jsdelivr, wikipedia, bottosson.github.io 등)는 2차 출처(검색 스니펫, 미러, GitHub 저장소)로 보충했고 그 부분은 **[미검증]** 으로 표시했다.

| # | 자료 | 판정 | 가져갈 것 |
|---|---|---|---|
| 1 | Claude-Code-Game-Studios | **일부 적용** | `minimal` 리거 1종만, "돌아가고 스크린샷이 남아야 완료", 플레이테스트 질문 4개, 테스트 케이스 4필드 |
| 2 | VibeGame | **버림** | (코드 아님) 라이브 속성 조절 패널 아이디어만 |
| 3 | PixelSRPG-Forge | **버림** | 없음 (출처 불명 에셋) |
| 4 | craftpix.net/freebies | **버림** | 없음 |
| 5 | kenney.nl/assets | **일부 적용** | CC0 UI 효과음 몇 개만. 3D 모델은 쓰지 않고 원시 도형으로 |
| 6 | broomfield-quidditch 사이트 | **접근 불가 → 대체 조사** | 픽셀 룩 GLSL 조각 4곳 (별도 문서 `three-pixel-look.md`) |
| + | awesome-gamedev-agent-skills | **일부 적용(선택)** | `game-feel` 스킬만 읽어볼 가치 |

---

## 1. Claude Code Game Studios

- URL: https://github.com/Donchitos/Claude-Code-Game-Studios
- ★ **35,203** (2026-11-04; 공유 때 "~28k" 였으니 그 사이 더 올랐다) · 포크 4,652 · 라이선스 **MIT** · 생성 2026-02-12 · 마지막 푸시 **2026-10-19** · 프레임워크 버전 **1.2.0** (CHANGELOG 2026-10-19, `project.yaml` 의 `framework.version`)
- 요약: Claude Code 를 "게임 스튜디오"로 바꾸는 템플릿. 에이전트 **49개**(디렉터 3: creative/technical/producer · 리드 8 · 전문가 ~25 + Godot 4.7 / Unity / Unreal 5.8 엔진 전문가), 스킬 **74개** 폴더(README 는 72 라고 함), 훅·룰·`production/` 산출물 트리. 디렉터는 Opus, 리드 프로그래머+15명은 Sonnet, 나머지 30명은 세션 모델을 상속.
- 리거 모드(`modes.rigor`): `minimal`(기본) / `standard` / `full`. README 표(원문 그대로): `minimal` → 코드 전 문서 **1**(한 장짜리 브리프), 0 min · `standard` → 30 문서, 58 min. "Two blind reviewers and a human playtest then ranked the `standard` build **last**" / "the extra 29 documents bought traceability, not a better game." **주의**: README 는 "네 게임을 만들었다"고 하지만 표에는 `full` 행이 없고 점수도 없다. 즉 "가장 무거운 모드가 꼴찌"는 **standard 가 꼴찌**였다는 뜻이고, full 의 결과는 공개돼 있지 않다 [원문 확인, 수치 없음].
- "완료"의 정의(원문): "a story that changes anything the player sees is not closed until the game has been launched, observed, and a screenshot retained in `production/qa/evidence/`." / "A parse check is not a run." / minimal 에서도 "automated tests are waived but the look is not." `/dev-story` 는 `Run result: OBSERVED — … | NOT VERIFIED — … | N/A — …` 한 줄을 강제하고, 바뀐 파일 해시를 `stamp.txt` 로 남겨 스크린샷이 코드보다 오래됐는지 알려 준다(차단은 안 함). `/story-done` 표: 스크린샷은 **모든 리거 레벨에서 필수**, 유닛/통합 테스트는 minimal 에서 면제.
- 웹/HTML5: **언급 없음**. 엔진 전문가는 Godot/Unity/Unreal 만. 솔로 개발은 `review_mode: solo` 로 부분 대응.

**판정: 일부 적용.** 49개 에이전트·훅·`production/` 트리·GDD 8절·스프린트·게이트체크·로컬라이즈/라이브옵스는 전부 **버림** — 우리 프로젝트는 HTML 1장 + JS 3개이고 저장소를 템플릿으로 clone 할 이유가 없다. 가져갈 것은 **프로세스 4가지**다:

1. **리거는 `minimal` 하나.** 설계 문서는 `docs/DESIGN.md` 한 장으로 끝. 그들의 블라인드 리뷰가 보여 준 대로 문서 29장은 게임을 좋게 만들지 않았다.
2. **완료 = 실행 + 관찰 + 스크린샷 보존.** 우리 Playwright 스모크에 그대로 넣는다: `tests/evidence/<스토리>/` 에 스크린샷(등불 0/4/8, 낮/밤, 쓰다듬기), 커밋/PR 본문에 `Run result: OBSERVED — <무엇이 보였나>` 한 줄, 콘솔 에러 0. "파싱 통과"는 실행이 아니다.
3. **플레이테스트 질문지**(`/playtest-report` 템플릿에서): "Understood the goal? [Yes/No/Partially]", "Understood the controls?", "Would play again? [Yes/No/Maybe]", 감정 상태 5단어(Engaged/Confused/Bored/Frustrated/Excited), "Moments of delight", "Top 3 Priorities". 아늑한 게임용으로 바꾸면: 난이도·사망 수 항목은 삭제, "다시 쓰다듬고 싶었나", "문어가 혼자 결정하는 게 불편했나/좋았나", "밤 장면을 기다릴 마음이 드나" 추가.
4. **테스트 케이스 4필드**(`qa-tester.md`): precondition / steps / expected result / pass criteria. "Skip test steps for speed (every step must be executed)" 금지 목록도 좋다. 저장 관련 케이스는 "덮어쓰기·구버전 데이터·깨진 파일" 세 가지를 반드시 포함 — 우리 localStorage 마이그레이션 테스트에 그대로 적용.

재사용 가능한 에이전트 프롬프트: `level-designer.md` 의 원칙("player always has a clear sense of direction", 랜드마크·시선·휴식 지점)은 다락방 배치에 쓸 만하다 — 창문=랜드마크, 등불=초점, 문어 동선은 두 점 사이. `technical-artist.md` 의 "모든 최적화를 예산 숫자(드로우콜/텍스처 메모리)에 묶어라"도 우리 ≤150 드로우콜 규칙과 같다. 게임 필(juice) 전용 에이전트는 **없다**(README·에이전트 목록 확인).

## 2. VibeGame

- URL: https://github.com/tettethu/VibeGame · 홈 https://vibegame.tettet.org/ [접속 안 함]
- ★ **363** · 포크 37 · **Apache-2.0** · 생성 2026-08-12 · 푸시 2026-10-13
- 요약: "Prompt-to-Game Development with AI-Native Engine and Self-Evolving Adversarial Agent Team." **Python 3.12+ CLI**(uv, tmux) 가 Claude Code/Codex 에이전트 팀을 돌리고, 2D 엔진은 **Phaser 위**(`src/engine/`: `SceneTree.js`, `Node.js`, `Animator.js`, `AnimationPlayer.js`, `ColliderFactory.js`, `PivotResolver.js`, `PhaserHost.js`, `VisualFactory.js`, `UiLayer.js` …). 웹 대시보드 탭: Chat / Assets("Preview animations and adjust sprite bounds") / Objects("Configure character animations and properties") / Play. 데모: Civilization 프로토타입, Hollow Knight 보스, KOF 류 격투, 던전 로그라이크, Fruit Ninja, Aniya Parkour, Pixel Sekiro, AI 마피아. 스프라이트는 이미지 생성 프롬프트로 만든다(agent-sprite-forge 를 영감으로 명시; 모델명 미기재). 상업 배포 시 알려 달라는 요청 조항이 있으나 승인 요건은 아니라고 README 가 명시.
- 엔티티/속성 스키마·애니메이션 시스템은 README 에 문서화돼 있지 않다.

**판정: 버림.** 이유: (a) Phaser 2D 스프라이트 파이프라인 — 우리는 3D 절차 생성이고 스프라이트가 없으니 "스프라이트 바운드 조정/애니메이션 미리보기" 워크벤치가 할 일이 없다. (b) Python+uv+tmux 런타임 — "빌드 없음, file://" 과 정면 충돌. (c) 이미지 생성 에셋 — "그리지 않는다"는 지키지만 "에셋 0"은 깨지고, 생성 이미지의 라이선스/일관성 문제가 생긴다.
가져갈 **아이디어 하나**(코드 아님): "속성을 라이브로 만지며 본다"는 워크벤치 감각을 **20줄짜리 `<details>` 데모 조작 패널**로 — pixelSize(1~4), 디더 세기, 외곽선 임계값, 문어 팔 길이/통통 속도, 팔레트 램프 미리보기 슬라이더, 값은 `localStorage` `dev_*` 키. 프레임워크가 아니라 HTML 폼이다.

## 3. PixelSRPG-Forge

- URL: https://github.com/Huu-Yuu/PixelSRPG-Forge
- ★ **439** · 포크 70 · **MIT (저장소 구조에만)** · 생성 2025-11-03 · 푸시 2026-03-16
- 요약: 중국어 SRPG 픽셀 에셋 모음 — 캐릭터/건물/지형/이펙트/스킬 아이콘/UI/효과음(PNG, WAV), "30,000+ 추가 이미지". README 원문: assets were "collected from various sources including internet downloads and commercial purchases" / "Individual assets may have different licensing terms from their original creators" / "If you intend to use these assets commercially, you must assume full responsibility for any potential copyright issues." 개별 작가·출처 링크 없음. 같은 계정의 `StardewValley-Assets`(게임 리핑 에셋, 112★)가 함께 홍보된다.

**판정: 버림.** 이유: (a) **출처 불명·혼합 라이선스** — 공개 GitHub Pages 저장소에 넣으면 재배포가 되고, 비상업 팬 프로젝트라도 리핑/구매 에셋의 재배포는 변명이 안 된다. (b) 판타지 턴제 전투용 — 우리 장르가 아니다. (c) 우리는 2D 스프라이트를 쓰지 않는다. UI 효과음조차 출처가 불명이므로 Kenney CC0 로 대체. 가져갈 것 **없음**.

## 4. craftpix.net/freebies

- URL: https://craftpix.net/freebies/ · 라이선스 https://craftpix.net/file-licenses/ — **이 세션에서 두 페이지 모두 접속 불가**(DNS 차단). 아래는 itch.io 댓글·CraftPix 직원 답변·OpenGameArt 댓글에 인용된 문구 **[미검증, 2차 출처]**.
- 인용된 조건: 개인·상업 프로젝트 사용 가능, "No attribution or link back to this site is required, however any credit will be highly appreciated", "You can sell and distribute games with our assets", 그러나 "you can NOT resell the art source files (PNG, JPG, EPS, Adobe Illustrator, etc) or slightly modified version of the art", 직원 답변 "Redistribution or reselling of the assets themselves is not allowed". 공개 저장소에 원본 PNG 를 올리는 것이 허용되는지는 **어느 출처도 다루지 않는다** — 원본 파일 재배포 금지 조항에 걸릴 가능성이 높다고 보는 게 안전하다. 다운로드에 계정이 필요한지는 확인 못 함 [미검증].

**판정: 버림.** 이유: (a) 우리 파이프라인에 이미지 파일이 0장 — 쓸 자리가 없다. (b) 재배포 금지 조항과 공개 GitHub 저장소가 충돌한다. (c) 2D 픽셀 스프라이트/UI 는 3D 렌더 픽셀 룩과 **픽셀 밀도가 달라** 섞이면 바로 싸구려로 보인다(스킬 §5 "모든 스프라이트는 같은 픽셀 밀도"). 혹시 2D 아이콘이 필요해지면 Kenney CC0 가 먼저다. 가져갈 것 **없음**.

## 5. kenney.nl/assets

- URL: https://kenney.nl/assets — **이 세션에서 접속 불가.** 라이선스 **CC0** 는 2차 출처로 교차 확인됨: OpenGameArt 미러(Furniture Kit, Interface Sounds), Godot Asset Library 포팅("Kenney UI Audio" CC0 1.0), Kenney 공식 GitHub(`KenneyNL/Starter-Kit-City-Builder` ★1,503, MIT, `models/*.glb` 15개 확인).
- 소리: **Interface Sounds**(https://kenney.nl/assets/interface-sounds, 100개 OGG, CC0) · **UI Audio**(https://kenney.nl/assets/ui-audio, 50개 OGG, CC0) · **Impact Sounds**(부드러운 타격음; 존재는 기억에 의존 [미검증]). 파일명 예(`click_001.ogg`, `select_001`, `switch_001`, `tick_001`, `open_001`, `pluck_001`, `scratch_001`)는 기억에 의존 [미검증]. "종이 스치는 소리"에 딱 맞는 팩은 Kenney 에 **없는 것으로 기억** [미검증] — 영수증 뒤집기 소리는 WebAudio 로 합성(노이즈 버스트 60 ms + 하이패스 2 kHz + 지수 감쇠)하는 편이 "에셋 0" 원칙에도 맞고 라이선스 걱정이 없다.
- 3D: **Furniture Kit**(https://kenney.nl/assets/furniture-kit, 140 파일, CC0; OpenGameArt 미러 기준 OBJ+PNG 텍스처+Unity 패키지 확인, **glTF/FBX 포함 여부 미검증**). Kenney 의 다른 키트(Building Kit: OBJ/FBX/glTF, Retro Urban Kit: OBJ/FBX/DAE/STL/glTF)는 glTF 를 포함하므로 Furniture Kit 도 포함할 가능성이 높다 [미검증].
- three.js r128 에서 .glb 로딩: `examples/js/loaders/GLTFLoader.js` 가 r128 에 **존재**(HTTP 200 확인), UMD 로 `THREE.GLTFLoader` 를 정의하고 필수 의존성 없음(DRACO/KTX2 는 선택). **그러나 file:// 에서 Chrome 은 XHR/fetch 로 로컬 파일을 못 읽는다** → GLTFLoader(FileLoader 기반)는 file:// 에서 실패한다. 우회는 .glb 를 base64 로 JS 에 박는 것(Kenney 모델 하나 20~100 KB → 10개면 ~1 MB 텍스트) 또는 `<audio>` 처럼 요소 로딩이 되는 포맷만 쓰는 것. 즉 "단일 파일/빌드 없음"은 깨지지 않지만 **추해진다**.

**판정: 일부 적용 — 소리만.**
- **적용**: UI 효과음 3~6개(클릭, 토글, 카드 걸기, 등불 블룸, 영수증 뒤집기)를 `assets/sfx/*.ogg` 로 두고 `new Audio('assets/sfx/click.ogg')` 로 재생(요소 로딩은 file:// 에서도 동작). CC0 라 공개 저장소 재배포 OK, 표기 의무 없음(README 크레딧은 예의로). 총 100 KB 이하. 첫 사용자 제스처 전엔 재생하지 않고, 설정에 소리 OFF 기본 ON 여부는 디자인에서 결정. 대안으로 전부 WebAudio 합성(파일 0)도 같은 API 로 두고, 들어 보고 싸구려면 Kenney 로 교체.
- **버림(모델)**: 다락방 소품·기념품은 **원시 도형 조합**으로. 이유 5가지: (1) file:// 에서 GLTFLoader 가 막혀 base64 꼼수가 필요. (2) Kenney 색은 우리 팔레트가 아니다 — 스냅은 되지만 140종 소품이 섞이면 방이 산만해지고, 램프가 충돌해 갈색 가구가 호박색으로 튄다. (3) 스케일·피벗이 모델마다 달라 손봐야 한다. (4) "전부 코드"가 저장소를 작게, 룩을 한 덩어리로 유지한다 — A Short Hike 의 교훈대로 저해상도 가독성은 디테일이 아니라 평면 셰이딩+외곽선에서 나온다. (5) 원시 도형 + 팔레트 스냅 + 1px 외곽선이면 상자·원기둥도 이미 픽셀아트로 읽힌다. 예외: 특정 소품(흔들의자 등)이 도형으로 도저히 안 되면 **그 하나만** glb 를 base64 로 박되, 먼저 도형 키트배시를 시도한다.

## 6. broomfield-quidditch-vibecoded1.vercel.app

- URL: https://broomfield-quidditch-vibecoded1.vercel.app/
- **접근 불가**: WebFetch 는 DNS 차단(`*.vercel.app` 미허용), Vercel MCP `web_fetch_vercel_url` 은 404(사용자 Vercel 계정의 배포가 아님), 웹 검색에도 색인 없음. **렌더 파이프라인 수치는 추출 못 했다.** 사용자가 세션 네트워크에 host 를 허용하거나 HTML 을 붙여 주면 다시 분석 가능.
- 대체 조사(기법 자체): 아래 저장소들에서 GLSL 조각을 모아 `three-pixel-look.md` 에 레시피로 정리했다.

| 저장소 | ★ / 라이선스 / 푸시 | 쓸 것 |
|---|---|---|
| mrdoob/three.js `examples/jsm/postprocessing/RenderPixelatedPass.js` (dev, r150+) https://github.com/mrdoob/three.js/blob/dev/examples/jsm/postprocessing/RenderPixelatedPass.js | 117,553 / MIT | 저해상 타깃 `floor(w/px)`, NearestFilter, DepthTexture; **깊이 외곽선**(4이웃 `clamp(dn-d,0,1)` 합 → `smoothstep(.01,.02)` → 0.5 단위 양자화), **노멀 외곽선**(MeshNormalMaterial 오버라이드 패스, bias `vec3(1)`), 기본 세기 0.3/0.4. ESM 이라 r128 UMD 에 그대로는 못 쓰고 GLSL 만 이식 |
| niccolofanton/dithering-shader https://github.com/niccolofanton/dithering-shader | 294 / MIT / 2026-09 | **Bayer 4×4** 임계값(÷17), 픽셀화 `floor(fragCoord/pixelSize)`; R3F postprocessing 용이라 코드 이식 아닌 행렬만 |
| CBerry22/3d-Pixel-Art-In-Godot-4 `outline.gdshader` https://github.com/CBerry22/3d-Pixel-Art-In-Godot-4 | 198 / MIT / 2024-01 | 깊이+노멀 외곽선 **수치**: depth_threshold 0.05(선형 뷰 깊이), reverse_depth 0.25(바깥 노멀 에지 마스킹), normal_threshold 0.6, 어둡게 0.3 / 밝게 1.5, **빛 방향 기준으로 노멀 에지를 밝힐지 어둡힐지 결정** — 귀여운 셀 룩에 효과 큼 |
| WoodNeck/three-pixelate-showcase https://github.com/WoodNeck/three-pixelate-showcase | 7 / MIT / 2024-04, 미완 | **팔레트를 64×64 LUT 텍스처로**(RGB 4bit 색인 → 4096 항목, 픽셀당 텍스처 1회) 트릭; Lospec 팔레트 사용(sweetie-16, endesga-16 …) |
| pickdani/three-webgpu-pixel-shader https://github.com/pickdani/three-webgpu-pixel-shader | 0 / — / WebGPU(TSL) 전용 | 기본값 참고만: pixelSize 3, dither 0.15, outlines 0.7, rim 0.35, edgeDepth 0.0018, 팔레트 ≤64 "hue-shifted ramps: shadows toward violet, highlights toward warm yellow" |
| DavJCosby/Palette-Matcher https://github.com/DavJCosby/Palette-Matcher | 0 / 라이선스 없음 | 스택 확인용(저해상 조명/깊이 → 1px 에지 → Oklab 톤 보간 → Bayer 4×4 → 업스케일). 라이선스 없음 → 코드 복사 금지 |
| Evercoder/culori `src/oklab/*.js` https://github.com/Evercoder/culori | 1,249 / MIT / 2026-10 | **OKLab 변환 계수**(Ottosson 원문 블로그는 이 세션에서 접속 불가; culori 소스를 그대로 읽음) |

## +. gamedev-skills/awesome-gamedev-agent-skills (검색 중 발견)

- https://github.com/gamedev-skills/awesome-gamedev-agent-skills · ★ 6,768 · Apache-2.0 · 푸시 2026-10-28 · 77개 SKILL.md(Godot/Unity/Unreal/Phaser/PixiJS/three.js/Bevy…), `npx skills add gamedev-skills/awesome-gamedev-agent-skills`.
- 관련 스킬: `threejs-scene-setup`, `threejs-materials-lighting`, `threejs-gltf-loading`, `game-feel`(스크린셰이크·히트스톱·트위닝·스쿼시), `shader-programming`. 픽셀아트·플레이테스트·QA 전용은 없음.
- **판정: 일부 적용(선택).** Game Studios 보다 가볍고 web 엔진이 있다. `game-feel` 하나만 읽고 우리 모션 토큰(`motion-and-feel.md`)과 겹치는지 확인; 저장소 전체 설치는 불필요.

---

## 한 줄 결론

- 프로세스는 Game Studios 의 **`minimal` + "돌아가고 스크린샷이 남아야 완료"** 만 가져온다.
- 에셋은 **Kenney CC0 효과음 ≤6개**(또는 WebAudio 합성)만. 모델·스프라이트·이미지 라이브러리는 전부 버린다 — 라이선스(PixelSRPG, craftpix)나 file:// 제약(glb)이나 룩 일관성(2D 스프라이트 밀도) 중 하나에 반드시 걸린다.
- 픽셀 룩은 외부 사이트 대신 three.js 공식 `RenderPixelatedPass` GLSL + CBerry22 수치 + culori OKLab 계수로 **직접 쓴 ShaderMaterial 한 장**으로 — 레시피는 `three-pixel-look.md`.

## 출처
- GitHub Search API 조회(2026-11-04): Donchitos/Claude-Code-Game-Studios, tettethu/VibeGame, Huu-Yuu/PixelSRPG-Forge, WoodNeck/three-pixelate-showcase, niccolofanton/dithering-shader, DavJCosby/Palette-Matcher, CBerry22/3d-Pixel-Art-In-Godot-4, KenneyNL/Starter-Kit-City-Builder, Evercoder/culori, gamedev-skills/awesome-gamedev-agent-skills, mrdoob/three.js
- README/소스 직접 열람: https://raw.githubusercontent.com/Donchitos/Claude-Code-Game-Studios/main/README.md , …/CHANGELOG.md , …/project.yaml , …/.claude/skills/dev-story/SKILL.md , …/.claude/skills/story-done/SKILL.md , …/.claude/skills/playtest-report/SKILL.md , …/.claude/agents/qa-tester.md , …/.claude/agents/level-designer.md , …/.claude/agents/technical-artist.md ; https://raw.githubusercontent.com/tettethu/VibeGame/main/README.md + `src/`, `src/engine/` 트리 ; https://raw.githubusercontent.com/Huu-Yuu/PixelSRPG-Forge/main/README.md ; https://github.com/KenneyNL/Starter-Kit-City-Builder/tree/main/models ; https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/js/loaders/GLTFLoader.js (존재 확인)
- 2차 출처(접속 차단된 사이트 대체): kenney 라이선스·팩 구성 — https://opengameart.org/content/furniture-kit , https://opengameart.org/content/interface-sounds , https://godotassetlibrary.com/asset/L9Usw7/kenney-ui-audio , https://kenney-assets.itch.io/building-kit , https://kenney-assets.itch.io/retro-urban-kit ; craftpix 라이선스 인용 — https://itch.io/post/2755457 , https://itch.io/post/3844037 , https://itch.io/post/7465260 , https://free-game-assets.itch.io/free-game-icons-potions/comments
