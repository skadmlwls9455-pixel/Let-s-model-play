# 가구 옮기기 살펴보기 결과 (11-14, 읽기만 · 12ba4e9 에서)

두 눈으로 봤다: 폰에서 진짜 터치로 해 보기 (360x740 · 390x844, 목표 14개) + 설계 · 코드 읽기. 원본 결과 JSON 은 scratchpad (`final/furn-ux-merged.json`), 증거 스크립트 · 사진은 `final/furn-ux-play/` · `final/furn-ux-design/`.

## 요약

가구 옮기기가 불편한 가장 큰 이유는 하나야. 스틱에서 엄지를 떼는 순간 캐릭터가 화면 쪽으로 돌아서고, 들고 있던 가구도 같이 돌아서 0.3~1.7 m 옆으로 튀어. 놓기를 누르려면 엄지를 떼야 하니까, 맞춰 둔 자리가 아니라 튄 자리에 놓이는 거야. 26번 떼 봤는데 그중 19번이 그랬어(화면 쪽 칸이 비어 있던 경우만 센 거야). 그래서 창문 벽이나 뒷벽에 붙여 놓는 건 운이 좋을 때만 돼. 기획 쪽 테스트에서도 소파가 1.6 m 튀었어.

그다음 두 가지:
(2) 못 놓는 칸이 화면에 안 보여. 가구는 말없이 멈추는데 캐릭터는 그 가구를 뚫고 계속 걸어가. 문어 둘레 약 2 m × 1.9 m는 통째로 못 놓는 자리야. 그 상태로 놓기를 누르면 캐릭터나 다른 가구랑 겹친 채로 저장되기도 해.
(3) 가구를 든 채 놀이방 문이나 계단 쪽으로 밀면 방을 나가 버리고, 가구는 걷던 중간 자리에 그대로 저장돼. 되돌리기도 없어.

초+상자 문제도 확인했어. 네 말이 맞아. 상자를 0.7로 줄이면 초가 공중에 떠 있고, 1.5로 키우면 초가 상자 속에 묻혀. 코드가 초를 늘 같은 높이(0.72)에 두고 크기는 아예 안 바꿔서 그래. 이건 다른 작업에서 이미 고치고 있어.

추천: 지금 방식(캐릭터가 들고 걷기)은 그대로 두고 작은 것부터 고치자. ① 들고 있는 동안은 손을 떼도 캐릭터가 돌아서지 않게 ② 들고 있을 땐 문·계단으로 못 나가게 ③ 못 놓는 칸은 빨간 테두리로 보여 주고, 그런 칸엔 절대 안 놓이게. 셋 다 작은 수정이고 저장 데이터는 안 건드려. 바닥 톡이나 손가락으로 끌기 같은 방식 자체를 바꾸는 건 네가 정할 일이라 아래 질문으로 남겨 둘게.

## 문제 (큰 것부터)

- **T1** (big, both): Letting go of the stick turns the character to the camera, and the held piece swings to the camera-side cell (d = 0.5 + max half-size: sofa 1.18 m, crate 1.02 m, blanket 1.2 m). 놓기 then places it there, not where the player lined it up. Because the 놓기 tap needs the thumb off the stick, the piece jumps at exactly the moment you confirm.
- **T2** (big, play): Pieces can almost never be set against the window wall or the back wall, the two walls you can see. The piece always lands at least d metres in front of the character on the camera side, and the character can't get closer than 0.35 m to a wall (sofa never below x = -1.32; the wall spot is -1.9). It only works when the camera-side cell happens to be refused.
- **T3** (big, both): Refused cells give no signal. The piece and the yellow mark just stop at the last allowed cell. The mark has one colour, and the character keeps walking into and through the stuck piece, because a carried piece is not an obstacle. Right after picking from the strip at the character's usual rest spot, the piece often does not move at all, because the cell in front is inside the door keep zone; the sofa stays half off-screen.
- **T4** (big, play): The octopus refusal zone is the piece's half-size plus 0.5 m on each side. With the octopus at its centre spot that is about 2.04 × 1.88 m (crate) or 1.84 × 2.36 m (sofa) in a 6 m room, so the middle of the room is closed off.
- **T5** (big, both): Pushing into the play-room door or the stair while carrying leaves the attic. The mode closes and the piece is saved wherever it was mid-walk.
- **T6** (medium, design): 놓기 does not re-check the cell. If the piece got stuck and the character walked into it, or after a resize or rotation next to something, the overlap is saved: the sofa on top of the character, or a 150 % sofa 7.6 cm into the crate.
- **T7** (medium, play): After 놓기, the character is usually behind the piece it just set down. Next to a wall it gets boxed in (once in a 0.22 m gap between the sofa and the window wall). The next carry then means many bumps, and the body is hidden.
- **T8** (medium, both): The piece and the character cover each other. Walking away from the camera, the piece is hidden behind the character, mark included. Walking toward it, or at 150 %, the piece hides the character. The camera only keeps the character on screen, never the piece, and it ignores the panels. At 320×568 the 회전/크기 panel covers the character and the floor where the piece lands. The sofa and the front-left corner start off-screen.
- **T9** (medium, both): 끝내기 and switching pieces in the strip both silently place the held piece, and there is no undo after 놓기, after a switch, or after a door exit. 취소 only works on the piece still in hand. A first-time player can read 끝내기 as 'quit without saving'.
- **T10** (medium, play): Holding the stick with one thumb and tapping 놓기 with the other does nothing. The second finger's tap gives pointerdown but no click, so the only way to place is to lift the stick first, which triggers T1.
- **T11** (medium, design): Tapping the sofa in the room while the mode shows '가구를 골라' makes the character walk over and sit instead of picking it. Tapping the crate or blanket does nothing; only the strip or a 0.48 s long press picks a piece. The long press shows nothing while you hold, and then the piece flies to the character instead of following the finger.
- **T12** (medium, both): The candle does not follow the crate's size. At 0.7 it floats above the crate; at 1.5 it is buried inside. (This is the owner's second report; another lane is fixing it.)
- **T13** (small, both): Nothing lines up on its own. The comments say a 0.25 m grid, but the code snaps to 1/27 m (about 3.7 cm). Rotation is a free 0-345 slider with 15° steps of only 3.7-5 px, size steps of 5.3-6.8 px, and no value shown.
- **T14** (small, play): The first-time hint toast sits on the stick (the only thing showing how to move) for 2.5 s. When the mode is opened by a long press, it also covers 취소 and 놓기. Nothing explains that the piece goes in front of the character, or that letting go turns it.

## 지금 방식 안에서 고칠 것

- **W1** While carrying, keep the character's facing when the thumb lifts; when a piece is picked, turn toward it — 고침 T1, T2, T7 (mostly), T10 (no longer needed, since lifting the thumb is safe) · 품 small
- **W2** No doors or stairs while carrying a piece — 고침 T5 · 품 small
- **W3** Show refused cells and never place on one — 고침 T3, T6 · 품 small
- **W4** Shrink the octopus no-place zone to the octopus's own body — 고침 T4 · 품 small
- **W5** After 놓기 the character hops clear; the mark is always visible — 고침 T7, T8 (partly) · 품 small
- **W6** Clear picking and finishing, plus one undo — 고침 T9, T11 · 품 small
- **W7** Frame the character and the piece together; slimmer tools for 320-360 px — 고침 T8, T13 (rotation steps), T14 · 품 medium
- **W8** Real 0.25 m grid plus snap to the wall — 고침 T13 · 품 small

## 방식을 바꾸는 안 (주인 몫)

- **C1** Tap a floor cell while holding a piece; the character carries it there — 품 medium
- **C2** Drag the piece directly with a finger (a ghost follows the finger); the character watches or walks over afterwards — 품 medium to large (the lenses disagree: the empty furnDragMove/furnDrop slots and furnFloor already exist, but the gesture handling and UI change)
- **C3** 돌리기 and 크기 buttons floating beside the held piece — 품 medium

## 두 눈이 엇갈린 곳

1) Does the camera follow the character? The play lens (F10) says no; the design lens (F5) says it follows the character but never the piece. The code sides with the design lens: plFollow (scene3d.js:547-553) moves the view only while the stick is held, and only to keep the character 1.1 m inside the full canvas edges. It ignores the panels and the piece. What the play lens saw (sofa and front-left corner off-screen at 320/360, panel over the landing floor) fits that, so the merged item T8 uses the design lens's mechanism.

2) How far the piece jumps on release. Design measured one case at 1.6 m and wrote '1.2-1.8 m'. Play measured 26 releases: 0.3-1.7 m in 19 of them, and no jump when the camera-side cell was refused. Play's sample is the stronger one; both name the same cause.

3) Line numbers for the release turn. Play cites 2592/2613, design cites 2601/2611. At 12ba4e9 (the commit both played) the lines are 2592 and 2613, so play is right. Same cause either way.

4) Grid. The brief and the code comments say 0.25 m; design found SNAP_N = 1/27 m. The code (scene3d.js:14) confirms design.

5) Effort for finger-dragging (C2). Play says large: it replaces the 11-10 model, gesture handling and the UI. Design says medium: the slots and furnFloor already exist. Both are code readings with no measurement, so the effort is given as medium to large.

6) Visibility fix. Play proposes carrying closer and drawing the mark on top (W5); design proposes framing the character and the piece together (W7). These do not conflict; they are kept as two steps, the cheap one first.

Seen by one lens only, kept because it has evidence:
- Play: the window/back-wall impossibility (T2), the octopus zone size (T4), the wedge after placing (T7), the second-thumb 놓기 (T10, Chromium only) and the toast over the stick (T14).
- Design: overlaps saved by 놓기 (T6, screenshot plus saved values) and the sofa tap sitting instead of picking (T11, code line only).

The candle report is confirmed by both lenses, with play's screenshot A360-8e-scale-0.7.png the clearest.

