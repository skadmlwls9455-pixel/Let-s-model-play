# 5차 UI 다듬기 — 점검 결과와 고칠 것 (UI 워크플로 wf_c7f2525d-fe3, 11-15)

주인 답 (11-15 07시 KST, docs/OWNER_DECISIONS.md) 이 각 항목의 '주인 물음' 을 정했다 — 아래 '주인 답' 을 따른다.

## 주인 답

- 가구 모드 아래: **가구 줄과 한 판 + 크기 눈금 9칸** (작게 · 크게 사이). 돌리기 그림은 직접 그린 둥근 화살표 (Pixelarticons redo 는 '다시 실행' 처럼 읽힌다).
- 가구 모드 위: **제목 '가구 옮기기' 와 판을 빼고, 취소 · 저장하기도 그림 (X · 체크)** — 가구 모드 화면 글자 0 (aria-label 은 남김). 처음 한 번 나오던 '가구를 끌어서 옮겨' 는 손 그림이 소파를 끄는 모양 2초 (읽어 주기 글은 남김).
- 살림 · 재봉틀 · 설정: **전부 그림으로** (조개 그림 + 수 · 했어 → 체크 · 0/1 → 빈 네모 · 바꾸기 그림 + 수 · 재봉틀 색 칸의 반복 '조개 6' 줄임 · 안내 글 짧게). 크기는 그대로.
- 달리기: **안내 글을 그림으로** (시작 · 쉬는 중 안내 → 왼쪽 동그라미 깜빡임 + 손 그림 / 일시정지 그림, 결과 판은 한 줄 + 큰 점수 + 왕관 그림 (최고) + 조개 그림). '다시' · '닫기' 글자 단추는 이번엔 그대로.
- 포스터: **크게 보기 화면의 포스터 위 작은 글과 앨범 작은 카드의 깨알 글을 빼고 큰 글만**. 저장하는 포스터 그림 · 벽 포스터는 그대로.
- 본문 글꼴: **Galmuri9 그대로** (Galmuri11 로 바꾸지 않는다).
- 물음 없이 고칠 것: 아래 must · should · nice 전부 (주인 물음이 붙은 것은 위 답대로).

## 고칠 것 (점검 결과)

### [must] Fake bold on Galmuri9 turns '옮' into a blob (가구 옮기기 · 저장하기 · 살림 title)

- 문제: The broken-looking '옮' the owner sees ('가구 옮기기' reads like '숨') is no longer caused by Galmuri7. It is bold that the browser fakes on Galmuri9, which has no bold face. e310c56 deleted font-synthesis: none from the pixel root (lane H had added it for exactly this case). Three places are hit: #furn-title (a <strong>); #furn-ok (.btn.sm in Galmuri9 plus .btn.primary at weight 700); and #bag-h, which has no title rule and so gets the browser's h2 default, 1.5em bold Galmuri9 at about 30px. The ㅇ ring and the ㄻ block fill in even at whole-pixel scale. A player sees this as soon as they open furniture mode or the bag.
- 고침: 1) css/style.css:469: add `font-synthesis: none;` inside `:root[data-font=pixel] { … }`. Galmuri11 keeps its real bold (Galmuri11-Bold). Bold requests on Galmuri9 or Galmuri7 then draw at regular weight, so '저장하기' and '가구 옮기기' come out clean and regular; the amber fill already marks the main button. 2) css/style.css:800: add `:root[data-font=pixel] .bag-sheet #bag-h` to the sheet-title selector list (Galmuri11 Bold, var(--fs-u24, 24px), line-height 36px). '살림' then matches 설정 · 추억 앨범 · 오늘의 산책. 3) tools/smoke.js, scenario A (main screen), scenario Z-6 (furniture mode) and the bag sheet: assert that no visible text element whose first computed font is Galmuri9 or Galmuri7 has a computed font-weight of 600 or more. No strings change.

### [must] Two broken CSS lines: '했어' is an unreadable smudge and the volume number is the wrong size

- 문제: Two lines read `ffont-size: var(--fs-n16, 16px) line-height: 24px;`: css/style.css:1022 (.snd-val) and css/style.css:1622 (.week-row .week-n). The property name is misspelt and a semicolon is missing, so both properties are dropped. Three things follow. (a) The weekly-quest counters fall back to the 13px system rule in Galmuri7, which is 3.25 to 4.88 device px per font pixel and never crisp. (b) The done word '했어' (js/app.js:4607) is Korean printed in the digits-only Galmuri7 at 13px, and it is a smudge on every phone. (c) The volume '80' in Settings › 소리 inherits about 20px Galmuri7 instead of the intended 16px from before round 4.
- 고침: 1) In css/style.css at :1022 and :1622, change the broken text to `font-size: var(--fs-n16, 16px); line-height: 24px;`. This restores the Galmuri7 16px that lane H and the pre-round-4 rules gave these digit-only cells. 2) Add a new rule directly after :1622: `:root[data-font=pixel] .week-row.done .week-n { font-family: var(--f-meta); font-size: var(--fs-m16, 16px); line-height: 24px; }`. Korean then never renders in Galmuri7; Galmuri7 stays only for digit-only cells such as 2/3 and 80. If the owner picks option a or b in fix 9, '했어' becomes a check-mark picture instead.

### [must] Furniture icon buttons disappear in dark theme, and the 'can't do that' cue appears only on the button

- 문제: .furn-act-ico is coloured var(--ink). That is the paper-ink colour, which stays the same in both themes, and here it sits on the dark --panel. Contrast is 1.12:1 in pixel dark and 1.01:1 in system dark, and the disabled end states add opacity .45 on top. On a phone in dark mode the three buttons look like empty boxes. When turning or resizing is blocked, the only feedback is the button moving 2px, while the player is looking at the room.
- 고침: 1) css/style.css:1512: `.furn-act-ico { display: block; width: 24px; height: 24px; color: currentColor; }`. The icons then take the .btn colour, var(--fg): about 11.8:1 in pixel dark, 9.5:1 in system dark and 11:1 in light. 2) css/style.css:1513: replace the opacity .45 on the whole button with `.furn-act:disabled .furn-act-ico { opacity: .4; }`, so the frame and bevel stay sharp. 3) js/scene3d.js furnTry (:1646): before each `return false`, set `FM.nope = performance.now(); buzz('nope'); dither.still = 0;`. In stepSel (:1568), colour the selected piece's floor outline PAL.rose[1] while `performance.now() - FM.nope < 450`, switching on and off every 150 ms; when st.reduced is set, show it red for a steady 300 ms instead. This is the same red that already means 'can't place it here', so the room now shows why the action failed. Keep the button shake as well. No text is added.

### [must] The furniture button row still floats as a separate framed box above the furniture tray

- 문제: The owner said: '돌리기 작게 크게 ui 너무 구려… 띡 화면 중앙에 박힌 거 너무 이상해'. e310c56 replaced the words with icons and docked the row 8px above the tray, centred, with its own 2px frame and shadow. On phones it still reads as a separate box stuck in the lower middle of the screen, with 100-200px of empty dark space above it. Three more problems: the Pixelarticons 'redo' arrow reads as 'redo' or 'forward', not 'turn'; nothing shows which size step the piece is on; and at the size limits the button just greys out.
- 고침: Option a (recommended).
1) index.html:169-170: put the buttons and the tray into one block at the bottom: `<div id='furn-bottom' class='furn-bottom'><div id='furn-bar' class='furn-bar' role='group'>` + #furn-turn + `<span class='furn-size'>` + #furn-small + `<span id='furn-meter' class='furn-meter' role='img'>` holding nine `<i></i>` + `</span>` + #furn-big + `</span></div>` + the existing #furn-items + `</div>`.
2) CSS: replace css/style.css:1508-1511 with:
- `.furn-bottom { position: absolute; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; background-color: var(--panel); border-top: 2px solid var(--line); pointer-events: auto; }`
- `.furn-strip { position: static; border-top: 2px solid var(--lo-px); }` (the tray keeps its own padding and --safe-b).
- `.furn-bar { display: flex; justify-content: center; align-items: center; gap: 16px; min-height: 56px; padding: 4px 8px; }`
- `.furn-size { display: flex; align-items: center; gap: 6px; }`
- Keep .furn-act at 56×48.
- Size meter: nine bars, each 6px wide with 2px gaps, bottom-aligned, heights 6, 8, … 22px. Bars up to the current step are filled var(--amber-fill), the rest var(--pip-off), each with a 1px var(--line) outline, plus a 2px var(--line) tick under the bar for 1.0. These are the same tokens as the lantern pips, so both themes work.
3) Rotate icon (in every option): replace the 'redo' SVG in #furn-turn with a self-drawn 12×12 clockwise arrow shown at 24×24 (viewBox 0 0 12 12, shape-rendering crispEdges, fill currentColor, like the hammer). Path: M8 1h1v1H8zM3 2h6v1H3zM2 3h1v1H2zM8 3h3v1H8zM1 4h1v1H1zM8 4h2v1H8zM1 5h1v1H1zM8 5h1v1H8zM1 6h1v1H1zM1 7h1v1H1zM10 7h1v1H10zM1 8h1v1H1zM10 8h1v1H10zM2 9h1v1H2zM9 9h1v1H9zM3 10h6v1H3z (preview: icons-x8.png (리드 작업 폴더, 저장소엔 없음)). Keep the Pixelarticons minus and plus.
4) js/app.js: delete furnRow (3854-3864), the furnSel callback (:560) and the resize listener (:3896).
- In furnUI with nothing selected: disable all three buttons and leave the meter empty. The bar never collapses, so the room never jumps.
- With a piece selected: `small.disabled = scale <= 0.7`, `big.disabled = scale >= 1.5`, fill bars where `i <= Math.round((stt.scale - 0.7) * 10)`, set the meter aria-label to `'크기 9단계 중 ' + (step + 1)` and the group aria-label to the piece name + ' 바꾸기'.
5) furnOpen (js/app.js:3800):
- Show #furn-ui with visibility: hidden.
- Measure `top = furn-top bottom - scene top + 8` and `bottom = scene bottom - furn-bottom top + 8`.
- Hide it again and call `scene.furnMode(true, { top, bottom })`, so furnFit (js/scene3d.js:1600) centres the floor between the two.
- Drop the unused furnRects export (js/scene3d.js:6104).
6) Keyboard (R, +, -, arrow keys, Esc), aria and haptics stay as they are.
7) tools/smoke.js Z-6 (:6211-6335): change the #furn-row checks to #furn-bar. Add a check that the bar's bottom touches the tray's top with no gap, and a 412×915 dark-theme pass at DPR 2.625 asserting icon contrast of at least 3:1.
Option b: the same single bottom block, without the meter; the three buttons are centred with 12px between them.
- (주인 물음 — 위 '주인 답' 으로 정해짐) 가구 모드 아래 '돌리기 · 작게 · 크게' 그림 단추를 어떻게 둘까? 미리보기: furn-options.png (리드 작업 폴더에만 있던 그림, 저장소엔 없음) (왼쪽 지금 · 가운데 a · 오른쪽 b). (a) 가구 줄과 한 판으로 딱 붙이고, 작게 · 크게 사이에 계단 모양 크기 눈금 9칸을 둔다. 지금 몇 단계인지 글자 없이 그림으로 보여 — 추천. (b) 한 판으로 붙이기만 하고 단추는 셋 (눈금 없음). (c) 지금처럼 가구 줄 위에 따로 뜬 상자 (어두운 테마에서 그림이 안 보이는 것만 고침). 어느 쪽이든 돌리기 그림은 둥근 화살표로 바꿀게.

### [must] The speech bubble (the model's words) is soft on DPR-2 iPhones and on fractional-DPR Androids because its text is centred

- 문제: The bubble is the text players read most. It is centred with text-align: center plus translateX(-50%). Each line's first glyph lands at about .47 device px at DPR 2 (every non-Pro iPhone and many Androids) and at .56 to .73 at DPR 2.625, which doubles the grey edges on every stroke. Snapping the font size alone cannot fix this.
- 고침: 1) css/style.css:572: add `text-align: left;` to `:root[data-font=pixel] #scene3d #oct-bubble`. The bubble box stays centred over the octopus and one-line bubbles look the same; lines in multi-line bubbles start flush left.
2) js/ui-art.js keepInside, directly after shift is rounded (:187-191): `var d = window.devicePixelRatio || 1, cs = getComputedStyle(b), cl = r.left + shift + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft), fx = Math.round(cl * d) / d - cl;`. Then set `b.style.marginLeft = (shift + fx) + 'px'` whenever shift or fx is non-zero. Work out --ua-tail from the shift before this snap. This runs on every keepInside call: every frame while the octopus moves, five times a second otherwise.
3) Ship this together with fix 6. Without fix 6, snapping alone made DPR 2.625 worse in the test.
4) tools/smoke.js T-2: add one 360×740 pass at deviceScaleFactor 2.625 and one at 3. Assert text-align is left, and that `Range.getClientRects()` left × dpr is within 0.02 of a whole number for every line.
The model's words are not changed.

### [must] Snapped font sizes are a hair too small, so glyphs drift off the device-pixel grid on 2.625 / 2.75 / 2.8125 phones

- 문제: snap() writes toFixed(4), which lands slightly below the exact size (18.2857 instead of 18.285714…). Chrome cuts glyph advances to 1/64 px, so on phones with a fractional DPR the glyphs slide off whole device pixels from about the 4th or 5th syllable on, even when the line starts on a whole pixel. This affects all pixel text on Pixel 7-10, Galaxy A5x / A7x, Fold and S24+.
- 고침: 1) index.html:57: `function snap(g, want, d) { var n = Math.max(1, Math.round(want * d / g)); return (Math.ceil(g * n / d * 64) / 64) + 'px'; }`. Values at DPR 1, 2 and 3 are already whole multiples of 1/64, so they do not change. 2) index.html:61: keep the matchMedia listener. As a backup for browser zoom, also add a 'resize' listener that calls apply() only when window.devicePixelRatio differs from the last value applied. 3) tools/smoke.js:4673: update the copied formula to `bubFs = Math.ceil(12 * Math.max(1, Math.round(17 * r.dpr / 12)) / r.dpr * 64) / 64`.

### [must] Runner text never got the device-pixel sizes, and it ignores the 'pixel font off' setting

- 문제: The runner overlay still uses fixed 24, 20 and 16px.
- Since --f-meta became Galmuri11, the HUD score and best are Galmuri11 at 16px, which is 1.33 CSS px per font pixel. That gives AA 0.87-0.99 at DPR 2, the blurriest text in the game, and 0.39-0.46 at DPR 2.625. The result lines are 5.25 device px per font pixel at DPR 2.625.
- Every font variable in runner.css falls back to a Galmuri font (for example var(--f-meta, 'Galmuri7')). Those variables exist only in pixel mode, so a player who turned the pixel font off still gets Galmuri7 and Galmuri9 in the runner, the opposite of what they chose.
- 고침: Edit css/runner.css.
1) Base rules (used in system-font mode): keep today's sizes and switch the family to 'Noto Sans KR', sans-serif ('Noto Serif KR' 600 for .rn-final). Sizes: 16px for .rn-hud, .rn-final-old, .rn-net-label, .rn-top10 and .rn-net-privacy; 20px for .rn-msg, .rn-final-score, .rn-final-best, .rn-award, .rn-net-msg and #rn-nick; 24px for .rn-final; line-height 1.5 throughout. No text gets smaller.
2) Add pixel rules:
- `:root[data-font=pixel] :is(.rn-hud, .rn-final-old, .rn-net-label, .rn-top10, .rn-net-privacy) { font-family: var(--f-meta); font-size: var(--fs-m16, 16px); line-height: 1.5; }`
- `:root[data-font=pixel] #rn-score { font-family: var(--f-ui); }`
- `:root[data-font=pixel] :is(.rn-msg, .rn-final-score, .rn-final-best, .rn-award, .rn-net-msg, #rn-nick) { font-family: var(--f-body); font-size: var(--fs-b20, 20px); line-height: 1.5; }`
- `:root[data-font=pixel] .rn-final { font-family: var(--f-ui); font-size: var(--fs-u24, 24px); line-height: 1.5; }`
3) Update the header comment at css/runner.css:1.
Line-height 1.5 gives 15 font pixels in Galmuri9 and 18 in Galmuri11, both whole numbers. The runner dialog lives in index.html, so the --fs-* tokens already reach it. The kitchen (cook.css) is out of scope.

### [should] Furniture mode top row: a title that repeats the hammer, a cramped 320 layout, and the '데모' tag sitting on the panel's corner

- 문제: The top panel shows '취소 | 가구 옮기기 | 저장하기', plus '가구를 끌어서 옮겨' the first time. The title repeats what the pressed hammer button already shows. At 320px wide the three items have only 4px between them. At widths up to 449px, the hanging '데모' honesty tag sits on the panel's top-left frame. The '데모' collision should be fixed whatever the owner chooses.
- 고침: Always, with no owner decision needed: `@media (max-width: 449px) { :root[data-layout=one].furn-on .furn-top { top: calc(var(--bar-h, 44px) + var(--safe-t, 0px) + 24px); } }`.
Option a:
- `.furn-top { background: none; border: 0; box-shadow: none; grid-template-columns: auto 1fr auto; }`, with #furn-x '취소' on the left and #furn-ok '저장하기' on the right.
- Give #furn-title class sr-only, so screen readers still announce the mode.
- Replace the visible #furn-hint with a 2-second animation of a self-drawn 12×12 pixel hand shown at 24px: two frames, press and slide, over the sofa.
- Position the hand with a new scene export, furnRectOf(id) (js/scene3d.js:1579), snapped to device pixels. With reduced motion, show a single still frame.
- #furn-hint stays as sr-only text with role=status.
Option b: everything in option a, and the two button words become self-drawn 12×12 X and check icons; the aria-labels '취소 (들어오기 전대로)' and '저장하고 나가기' do not change. Furniture mode then shows no visible text.
- (주인 물음 — 위 '주인 답' 으로 정해짐) 가구 모드 위 줄 글자를 어떻게 할까? (글자 수 얘기야. 크기는 그대로) 미리보기: furn-options.png (리드 작업 폴더에만 있던 그림, 저장소엔 없음) 의 가운데 · 오른쪽 그림 위 줄이 (a). (a) 제목 '가구 옮기기' 와 판을 빼고 '취소' · '저장하기' 두 단추만 위 양쪽 구석에 둔다 (보이는 글자 6자). 처음 한 번 나오던 '가구를 끌어서 옮겨' 는 글 대신 손 그림이 소파를 끄는 모양으로 2초 (읽어 주기 글은 남김) — 추천. (b) (a) 에 더해 두 단추도 그림 (X · 체크) 으로. 가구 모드 화면 글자 0. (c) 지금 그대로 (뭉개진 '옮' 만 고침).

### [should] Bag, sewing and settings sheets: duplicated words, words where a picture would do, and bad wraps at 320

- 문제: Visible characters at 360 wide: settings about 300, bag about 190, sewing about 140; the main screen has only about 12. Specific problems:
- '조개 6' is printed on all six dye chips.
- Words stand in for pictures: '했어', '바꾸기 3', '조개 7'.
- At 320 wide the dye chips wrap to three lines ('빨강 / 조개 / 6') and quests wrap ('위층 옷방 가 / 보기').
- '단발 · 원피스 ·' leaves a dot dangling at the end of a line.
- 고침: Option a (all five items):
1) The word 조개 becomes the shell picture plus the number. #btn-bag becomes `<img data-icon='souvenir/shell' width='32' height='32' alt=''>` + digits. Use the same picture in the bag line and the sewing header. aria-labels such as '살림, 조개 N' stay as they are.
2) Weekly rows (js/app.js:4607-4608):
- Done: a self-drawn 12×12 check shown at 24px, plus sr-only '했어'.
- One-step '0/1': an empty 12×12 box.
- Multi-step tasks keep 'n/N' in digits.
- The '바꾸기 n' chip becomes self-drawn 12×12 swap arrows plus n; the aria-label does not change.
3) Sewing chips (js/app.js:4696-4699):
- Each chip shows a colour block (full chip width, 40px tall) and the colour name (kept for colour-blind players).
- A badge on the block shows a check if the player is wearing it, the count in digits if they own that dye, or shell + 6 otherwise.
- Delete the note '염료나 조개 6개로 옷을 물들여' (js/app.js:4694).
4) Bag notes:
- js/app.js:4725 becomes '달리기 · 선물로 생겨. 쉬어도 잃는 건 없어.'
- js/app.js:4598 becomes '다섯 개 하면 선물' plus five squares in the lantern-pip style, filled up to the done count, with aria-label '주간 선물까지 n/5'.
5) Settings › 내 모습: remove the visible summary '단발 · 원피스 · 리본' (#set-look-sum, js/app.js:3411); the portrait already shows it. Move the summary into the portrait's aria-label.
Never cut: the honesty, privacy and security lines (WHO_LINE at :3165, '내밀기만 할 수 있어…' at :3340, the Claude connector notes at :3206-3240, the runner privacy line).
Option b: items 1 and 2 only.
Option c: no pictures; fix only the wraps. Put white-space: nowrap on .sew-cost so a chip shows two lines, and wrap each look part in a nobr span.
Whatever is chosen, run `python3 tools/subset-fonts.py --check` after the strings change.
- (주인 물음 — 위 '주인 답' 으로 정해짐) 살림 · 재봉틀 · 설정의 글을 그림으로 바꿀까? (글자 수만 줄이고 글자 크기는 그대로) (a) 전부 — 추천: 1) '조개 N' → 조개 그림 + 수 (오른쪽 위 꼬리표 · 살림 · 재봉틀) 2) 할 일 줄: '했어' → 체크 그림, '0/1' → 빈 네모, '바꾸기 3' → 바꾸기 그림 + 3 3) 재봉틀 색 칸: 색 덩어리 + 색 이름 (값 '조개 6' 은 조개 그림 + 6), 쪽지 '염료나 조개 6개로 옷을 물들여' 는 뺌 4) 살림 쪽지 줄임: '조개 · 씨앗은 달리기, 들어온 날 선물, 주간 선물로 생겨. 쉬어도 잃는 건 없어.' → '달리기 · 선물로 생겨. 쉬어도 잃는 건 없어.' / '일곱 가지 중 다섯을 하면 선물이 있어 (2/5). 주마다 바뀌고, 못 해도 잃는 건 없어.' → '다섯 개 하면 선물' + 다섯 칸 그림 5) 설정 '내 모습' 밑 '단발 · 원피스 · 리본' 줄은 뺌 (초상이 보여 줘. 읽어 주기에는 남김). (b) 1) 과 2) 만 (그림으로 바꾸기), 쪽지 글은 그대로. (c) 그대로 두고 줄바꿈 깨짐만 고침. 정직 · 개인정보 줄 ('내밀기만 할 수 있어 …', '누가 고르나', 커넥터 주소 경고) 은 어느 쪽이든 그대로 둬.

### [should] Runner: hint sentences float mid-field, and the result shows two messages at once

- 문제: The start and pause hints are full sentences in a see-through box floating in the middle of the field: '점프를 톡 누르면 출발해' (12 characters) and '잠깐 쉬는 중이야. 점프를 누르면 이어서 달려' (22 characters). This is the same 'stuck in the middle' pattern the owner disliked in furniture mode. The result card has three lines of text, and at the same moment the shell reward appears as a separate toast at the bottom. The HUD spells out '최고 N'.
- 고침: Option a.
1) Ready and pause:
- Keep #rn-msg as sr-only live text and draw no box.
- Instead, the left jump circle's border flashes in two steps, three times; with reduced motion it simply stays highlighted.
- A self-drawn 12×12 tapping hand, shown at 24px, sits beside it.
- When paused, a pixel pause sign (two bars, each 2×6 art px) appears in the middle of the field.
2) Result card:
- Keep the hit line ('상자에 콩!').
- Show the score as big digits (Galmuri11, --fs-u24) next to the existing walk-footprints icon, assets/icons/ctl/walk.png, at 2×.
- Show the best as a self-drawn crown plus digits; on a new best the crown blinks twice.
- Show the reward as the shell picture + '+n' inside the card.
3) Merge the coin toast into the card: js/runner.js saveRun passes {quiet: true} to APP.earnFromPlay, and earnFromPlay (js/app.js:4482) then skips its toast and returns n.
4) HUD: replace the word '최고 ' with the crown picture plus digits; the aria text stays.
Option b: option a, and '다시' / '닫기' also become pictures (a retry arrow and an X), matching the new kitchen, with the aria-labels unchanged.
- (주인 물음 — 위 '주인 답' 으로 정해짐) 달리기 화면 글을 그림으로 바꿀까? (a) 시작 · 쉬는 중 안내 글 ('점프를 톡 누르면 출발해' 등) 대신 왼쪽 점프 동그라미가 깜빡이고 손 그림이 톡 누르는 모양 (쉴 땐 가운데 일시정지 그림). 결과 판은 '상자에 콩!' 한 줄 + 큰 점수 숫자 + 왕관 그림으로 최고 + 조개 그림 +2 (아래 따로 뜨던 조개 알림은 판 안으로). 위쪽 '최고' 글자도 왕관 그림. '다시' · '닫기' 는 글 그대로 — 추천. (b) (a) 에 더해 '다시' · '닫기' 도 그림 (새 부엌처럼 글자 0, 이름은 읽어 주기로). (c) 그대로 (글자 크기 맞춤만).

### [should] Poster viewer shows the same line twice, and album thumbnails carry text too small to read

- 문제: The poster viewer prints the same line twice: in serif on the poster face, then as the big pixel-font line under it. Album thumbnails draw the line and the date as 4-8px serif text that nobody can read on a phone. Which copy to keep matters: on the poster face the line is cut to three lines with '…' (wrapLine, maxLines 3), while .lead shows the whole line exactly as written. So the .lead copy is the one to keep, to respect 'never cut the model's words'.
- 고침: Option a. Give posterSVG(trip, w, hgt, opts) an `opts.noText` flag that skips the caption <text> lines (:2594) and the date/order <text> (:2599). The scene, sticker, 'places visited' trail pictures and tape/pin are still drawn. Call it with {noText: true} at js/app.js:2819 (album cards) and :3022 (viewer front). The exported PNG (:3131), the wall minis and the card aria-label (which carries the line verbatim) are unchanged.
Option b: album cards only.
- (주인 물음 — 위 '주인 답' 으로 정해짐) 포스터 열람 화면에 같은 한 줄이 두 번 나와 (포스터 위 세리프 글 + 아래 큰 픽셀 글). 앨범 작은 카드엔 못 읽을 만큼 작은 글 (한 줄 · 날짜) 이 그려져 있어. (a) 열람 화면의 포스터 위 글과 앨범 작은 카드의 깨알 글을 빼고, 아래 큰 글 (3줄에서 안 잘린 원문 그대로) 만 둔다. 저장하는 그림 · 벽 포스터는 그대로 — 추천. (b) 앨범 작은 카드의 깨알 글만 뺀다. (c) 그대로.

### [should] '재봉틀' title does not match the other sheets, and help lines are sized for the wrong font

- 문제: '재봉틀' is the only sheet title at Galmuri11 20 regular; the others are Galmuri11 Bold 24. In sheets, `.sheet p` (css :746) is more specific than `.help` (css :622), so help paragraphs ('만든 것들', the sound note) get Galmuri11 sized with the Galmuri9 token. That is 3.33 device px per font pixel at DPR 2 and 4.17 at DPR 2.625, so they are never crisp (AA 0.39-0.62).
- 고침: 1) css/style.css:800: add `:root[data-font=pixel] .sew-sheet #sew-h` to the title list, and delete the size/weight override at :1613, so '재봉틀' becomes Galmuri11 Bold var(--fs-u24, 24px) / 36px like 설정 · 앨범 · 살림 (fix 1). 2) Add `:root[data-font=pixel] .sheet p.help { font-family: var(--f-body); }`. This keeps today's ~20px (b20 token) and makes the text crisp Galmuri9; no size goes down.

### [should] Log row label '혼잣말' breaks into '혼잣 / 말' at every width

- 문제: Non-dialog log rows keep the 44px label column from the system theme (base .lrow). In the pixel theme the label is Galmuri11 at about 18px, so '혼잣말' (54px) wraps at every phone width, and '어제 메모' / '지난 메모' would wrap too.
- 고침: After css/style.css:662 add: `:root[data-font=pixel] .lrow:not(.dialog) { grid-template-columns: max-content minmax(0, 1fr); } :root[data-font=pixel] .ltool { white-space: nowrap; }`. Rows that use the icon-label layout (ui-art.css:48, 48px) and the 11px system-theme labels are unchanged. No text changes.

### [should] Line-height smaller than the glyphs in chips, tabs and labels

- 문제: Five rules use the snapped Galmuri11 size (18 / 18.29px on DPR 2 / 2.625) with `line-height: 16px`. Glyphs then overflow their line box: labels crowd the frame and two-line chips overlap. Fixed px line-heights also make line spacing alternate by 1 device px at fractional DPR.
- 고침: In those five rules change `line-height: 16px` to `line-height: 1.25`. That is 15 Galmuri11 font pixels, a whole number of device px at every snapped size. Check that .look-tab still fits its label at 18.29px; if not, make it 48×56. Optionally, later convert the other pixel line-heights to unitless whole-font-pixel values (Galmuri9 1.5 = 15 font pixels, Galmuri11 1.5 = 18).

### [should] Status tips cover the '데모' honesty tag

- 문제: On phones up to 449px wide, the '데모' tag hangs below the top bar. When the lantern tip opens (tap on the lantern pips), it opens right under the bar and covers the '데모' tag (and the bag tag) for 2.5 seconds. The game's rule is that the demo label stays visible while the demo rules are running.
- 고침: In tip(), before setting top (js/app.js:4188): `var bt = $('brain-tag'), bb = bt && !bt.hidden ? bt.getBoundingClientRect() : null, below = Math.max(ar.bottom, bb && bb.top >= hr.bottom - 1 ? bb.bottom : 0);` then `t.style.top = below > hr.bottom ? Math.round(below - hr.top - host.clientTop + 8) + 'px' : '';`. Every tip then starts under the hanging tag. No text changes.

### [should] First-run hint '톡 눌러서 들어가기' is 10px on 320 phones, unsnapped, and ignores the font setting

- 문제: The intro hint is sized as calc(var(--s) * 10px) in hard-coded Galmuri9. On 320-wide phones the scale s is 1, so the first words a new player reads are 10px, below the project's 12px floor. At 360-412 it is 20px, which is not crisp at DPR 2.625. It is also Galmuri9 even with the pixel font turned off.
- 고침: 1) js/intro.js layout() (:92): also set `st.el.style.setProperty('--hint-fs', s >= 3 ? (s * 10) + 'px' : 'var(--fs-b20, 20px)')`. 2) css/intro.css:73: `font: 400 var(--hint-fs, 20px)/1.5 var(--f-body, 'Noto Sans KR', sans-serif)`. 3) Set the text-shadow offset to one font pixel: `calc(var(--hint-fs, 20px) / 10)`. The text itself does not change. The hint becomes about 20px on every phone (bigger at 320, same elsewhere).

### [should] Review screenshots and smoke checks run at DPR 1, so the owner never sees what phones show

- 문제: Most smoke contexts and the owner-facing screenshots use deviceScaleFactor 1. At DPR 1 the snapping gives 12px for meta text and the bubble, and fractional-DPR problems never appear. This is how the dark-theme furniture icons, fake bold and runner blur reached production without being caught. It matters given the owner's request to prevent misunderstandings.
- 고침: 1) In tools/smoke.js, add phone-DPR passes to scenario A (main), Z-6 (furniture) and T-2 (bubble): 360×740 at DPR 3 (light) and 412×915 at DPR 2.625 (dark). They carry the assertions from fixes 1, 4 and 5: no fake bold, bar touches the tray, icon contrast at least 3:1, bubble lines start on whole device pixels. Save main, furniture, bag and runner screenshots at those DPRs. 2) Owner reports use these screenshots, not DPR 1. 3) Before closing, look once on a real 2.625 Android phone (Pixel 7-10 or Galaxy A5x), because headless Linux draws text slightly differently. 4) Note for the owner only if they also play on a PC: at DPR 1, Galmuri11 can only be crisp at 12 or 24px, so small text there is 12px.

### [nice] Body text in Galmuri9 packs syllables with two final consonants into tight clusters

- 문제: Galmuri9 (10px grid) squeezes syllables with two final consonants (옮 앉 읽 낡 많) into 3-font-pixel clusters, even when they are perfectly crisp. Galmuri11 keeps the parts of these syllables apart. Galmuri9 has no pair of identical glyphs (Galmuri7 had 26 pairs), so this is a density issue, not breakage, and the owner chose 'body Galmuri9 20' on 11-15. Galmuri11 at 20px is not crisp, so switching means 20-24px depending on the phone.
- 고침: Option a: no change. Option b: in index.html change the b20 role to [12, 20] with a 'never below 20' rule (n = Math.ceil(want * d / 12)), and set --f-body to 'Galmuri11' (css/style.css:479). Sizes become 24 / 22.86 / 21.82 / 20px at DPR 2 / 2.625 / 2.75 / 3. Set line-height to 1.5, and rerun the smoke no-overflow checks L, S, Y and O at 320 wide.
- (주인 물음 — 위 '주인 답' 으로 정해짐) 본문 · 로그 · 시트 글꼴 얘기야. Galmuri9 은 받침 둘인 글자 (옮 · 앉 · 읽 · 낡) 가 빽빽해 (뭉개지는 건 아님). Galmuri11 은 더 또렷하지만 기기 픽셀에 맞추면 글자 크기가 폰에 따라 20px → 최대 24px 로 커져 (글자 수는 그대로, 한 줄에 들어가는 글자는 줄어). 비교: 06-galmuri9-body-complex-finals.png (리드 작업 폴더, 저장소엔 없음) (Galmuri9) 와 compare.png (리드 작업 폴더, 저장소엔 없음) (Galmuri11). (a) 그대로 Galmuri9 20 — 추천 (11-15 답 그대로). (b) Galmuri11 로 (20~24px).

### [nice] Text still slightly soft on 2.625 phones: toast, tip and name-label positions, plus some container insets

- 문제: After fixes 5 and 6, some text still starts at a fraction of a device pixel at DPR 2.625:
- #toast and #oct-label are centred with translate(-50%), and #tip uses whole-CSS-px left values (at 2.625 a whole device pixel is a multiple of 8 CSS px). The audit measured AA 0.14-0.27.
- Container insets of 18px (8px border + 10px padding on .lrow) put text at .25 device px.
- `letter-spacing: 2px` on the typing row adds 5.25 device px per glyph.
- 고침: 1) Add one helper, UIART.snapLeft(el), in js/ui-art.js that does the same as fix 5 (it nudges marginLeft so the content-box left × dpr is a whole number). Call it from toastPlace, tip() and wherever #oct-label is shown. For the toast, switch the pixel transforms at css/style.css:565-566 to translate(0, 8px) / translate(0, 0), with left computed in JS.
2) In the pixel theme, set .lrow padding-left to 8px, so the text inset is 16 + 8 + 8 = 32 CSS px, which is whole at 2.25 / 2.625 / 2.75 / 2.8125 / 3. Do the same for .cnote and .receipt.
3) Change css/style.css:664 letter-spacing to 0.
4) Check with a DevTools scan under DPR 2.625 that flags text nodes where Range.getClientRects()[0].left × dpr is not a whole number.

### [nice] The credits page (만든 것들) is never crisp and ignores the font setting

- 문제: credits.html hard-codes data-font=pixel and fixed sizes. Body text is Galmuri9 at 16px, which is 1.6× its grid and never crisp; h2 is Galmuri11 at 20px; the credit lines are Galmuri11 at 16px. It is pixel font even for players who turned the pixel font off. It is rarely opened, but it is the licence page.
- 고침: Move the snap function from index.html:53-64 into a small js/fs-snap.js that is loaded synchronously in the <head> of both index.html and credits.html. In credits.html, read the saved font setting with the same localStorage check as index.html:25 and set data-font to match. Use the tokens: `.cr p, .cr li` var(--fs-b20, 20px), `.cr-line` var(--fs-m16, 16px), `h2` var(--fs-u20, 20px), `h1` var(--fs-u24, 24px), line-height 1.5. Credits text stays word for word, as tools/test-cook-audio.js checks.

## 조사 요약 (한국어)

찾은 것과 쓸 것 (요약)
- 글자 깨짐은 크기 탓이 아니었어. 지금 남은 원인은 다섯 가지야.
  - 가짜 굵게: Galmuri9 엔 굵은 글꼴이 없는데 5차에서 font-synthesis: none 이 빠졌어. 그래서 '가구 옮기기 · 저장하기 · 살림' 이 덩어리로 칠해져 ('옮' 이 '숨' 처럼 보임).
  - 오타 두 줄: '했어' 가 숫자 전용 Galmuri7 13px 로 나와.
  - 가운데 정렬 말풍선: 줄 시작이 0.47 px 같은 소수 자리라서 아이폰 (배율 2) 에서도 흐려.
  - 안드로이드 소수 배율 (2.625 · 2.75 · 2.8125): 크롬은 글자를 1/4 기기 px 단위로 놓아. 그래서 글꼴 점이 정수 기기 px 가 아니거나 크기가 1/64 px 모자라면 회색 테가 생겨.
  - 달리기: 아직 기기 맞춤이 안 돼 있어.
- 직접 실험해 봤어 (헤드리스 크롬, 같은 말풍선).
  - 배율 2: 왼쪽 정렬만으로 번짐 0.41 → 0.
  - 2.625: 왼쪽 정렬 + 시작점 맞춤 + 크기 1/64 올림을 같이 해야 0.35 → 0. 시작점 맞춤만 하면 오히려 0.62 로 나빠져서 둘은 꼭 같이 넣어야 해.
  - 그래서 말풍선을 캔버스로 그릴 필요는 없어. 다만 진짜 안드로이드 폰에서 한 번은 봐야 해.
- 픽셀 글꼴 지침 (Godot 문서, Neo둥근모 · 물마루 · HBIOS 안내, 애플 HIG, 머티리얼 3, XAG): 격자의 정수 배로만, 소수 위치 금지, 줄 간격 1.5, 여러 줄은 왼쪽 정렬, 12px 아래 금지.
  - 다른 게임: 셀레스트는 긴 대사에 매끈한 글꼴을 써. FF 픽셀 리마스터는 픽셀/일반 글꼴을 바꾸는 옵션, 스타듀는 UI 크기 옵션을 따로 넣었어. 우리 '픽셀 글꼴 끄기' 와 같은 길이야.
  - Galmuri 그대로가 맞아. 더 굵은 게 필요하면 물마루 (OFL, 같은 12px 눈금) 가 대안이야.
- 가구 조작 레퍼런스 (원리만 봤고 모양은 안 베꼈어): 포켓캠프 · 마이시티 · 와일드스케이프 · 스프링밸리 · 심슨 탭트아웃 · 타운십 · 심즈 프리플레이 · IKEA Kreativ · 플래너 5D.
  - 공통점: 고른 물건의 행동은 글자 없는 아이콘 2~5개 (둥근 화살표 · 체크 · X). 자리는 화면 가장자리에 붙은 판이거나 물건 바로 밑 작은 팝업.
  - 화면 가운데 글자 단추 상자는 하나도 없었어.
  - 원칙: 엄지 자리는 아래 (Hoober · Epic 모바일 지침), 주 행동은 하나, 안 되는 건 단추보다 방 안에서 보여 주기.
- 오픈소스: Galmuri (OFL, 쓰는 중) · 물마루 · Neo둥근모 (OFL) · Pixelarticons (MIT, 지금 − + 그림) · HackerNoon 픽셀 아이콘 (CC BY 4.0, 출처 표기 필수) · game-icons.net (CC BY 3.0) · Kenney 아이콘 · 픽셀 UI (CC0) · NES.css (MIT, 눌림 베벨 뒤집기 기법) · MDN 9-slice 지침.
- 이번 계획에 넣은 것
  - 가구 단추를 가구 줄과 한 판으로 붙이고 계단 모양 크기 눈금을 둠 (시안: furn-options.png (리드 작업 폴더에만 있던 그림, 저장소엔 없음)).
  - 돌리기 그림은 게임 12×12 격자로 직접 그린 둥근 화살표로 바꿈 (Pixelarticons redo 는 '다시 실행' 처럼 읽혀서).
  - 체크 · 바꾸기 · 왕관 · 손 · X 그림도 직접 그려서 출처 표기 의무가 없어. 조개는 게임 안에 있는 조개 그림을 써.
  - 새 글꼴이나 새 외부 그림은 안 넣어서 credits 는 'redo' 만 빼면 돼.
- 나중 후보
  - 고른 가구를 한 번 더 톡하면 돌리기 (스타듀 모바일식).
  - 막은 가구 자체를 빨갛게 깜빡이기 (지금 계획은 고른 가구만).
  - 긴 글만 매끈한 글꼴로 보는 옵션.
  - 설정 선물 상자의 모자 이름을 모자 그림으로.

## 크레딧

- credits.html, the 그림 section, Pixelarticons line: remove "redo" (the rotate button becomes a self-drawn 12x12 icon). Keep "minus" and "plus" with the MIT link and Copyright (c) 2019 Gerrit Halfmann. Change the Korean sentence to '가구 모드의 작게 · 크게 그림은 Pixelarticons 그대로야. 돌리기 그림은 직접 그렸어.'
- No new third-party assets are planned. The check, swap, empty-box, crown, hand, X and pause icons are self-drawn on the game's 12x12 grid. The shell (assets/icons/souvenir/shell.png) and footprints (assets/icons/ctl/walk.png) are the game's own art, so they need no credit line. If an implementer copies Pixelarticons icons instead (for example check, close or reload), add their names to the same Pixelarticons MIT line.
- Fonts: no change (Galmuri OFL line stays). Galmuri14 or Mulmaru would each need an OFL line and licence file, but both are only listed as later options.