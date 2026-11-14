# Owner answers C3 (b), C4 (a), C6 (b), Q4 (b): no joy squeak, decision -ㄹ래 is fine, code-written rows keep the usual face, the demo hides 우쭐 · 덤덤 (lane "honest3")

Read `/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final/COMMON4.md` first (the project,
hard line 1, how to run things). Your label (scratch folder) is in your task message. You edit only
**`/home/user/ppolppol-fix-honest3`** (branch `fix-honest3`, base **`46d5d5a`** = `12ba4e9` + lane honest2's commit;
`node_modules` is an untracked symlink, never stage it). Do not commit.

## Where this comes from

Lane honest2 (commit `46d5d5a`, read it: `git show --stat 46d5d5a`, `git diff 12ba4e9 46d5d5a`) applied the owner's
O1 (b) (demo-brain lines say plain facts) and O2 (c) (petting keeps the idle face; the heart stays). Its checkers
raised three owner items and one test gap. The owner answered on 11-14:

1. **C3 → (b): no joy squeak.** With sound on, the 4th quick pet plays `pet_happy` ('뀨', described as '3번 넘게
   쓰다듬은 뒤 기뻐함'): `js/audio.js` `onPet`, `if (petN === 4) play('pet_happy', …)`. Remove that call. **Keep** the
   squish and stroke sounds (`pet_squish`, `pet_stroke_N`): they are the body being pressed, not a feeling. Then the
   places that describe `pet_happy` as something the game plays (`grep -rn pet_happy` outside `node_modules`: audio
   catalogue and research notes, `audio/src/sfx.py` description, the manifest descriptions, `audio/soundboard.html`,
   `docs/TUTORIAL.md`): say it is no longer played (11-14, owner C3 b) without deleting history. Whether the sound
   files stay in the manifest and the export: choose the smallest change that keeps `tools/test-audio.js`, the
   manifest checks and `tools/test-export.js` passing and ships nothing that is never used if that is easy; say what
   you chose. Test: sound on (a user gesture), N quick pets request no `pet_happy*` file and still request the squish
   and the strokes.
2. **C4 → (a): '-ㄹ래' that states a decision is fine.** The owner: "너무 과하게 딱딱한 인상 줄까봐... 굳이 싶긴 해"
   (rewriting them would make the octopus sound stiff; not needed). So:
   - The salon and play-room decision lines stay as they are.
   - Lines honest2 rewrote **only** for '-ㄹ래' come back to a '-ㄹ래' (or '-ㄹ게') form when the decision is true
     by the code (the game then does it, or it is exactly what the rule decided), without any separate want or
     motive clause. Start from these and check each against the code: world.js 졸림 `when.long` (now '많이 걸었어.
     이제 담요 쪽으로 갈게', was '…담요 속으로 들어갈래'), `nextNone` (now '내일 갈 곳은 아직 안 정했어', was '내일은
     어디로 갈지 자고 나서 정할래'), `homeStay` (now '오늘은 집에 있어.', was '오늘은 집에 있을래. 그냥 그러고 싶어서.'
     — '그냥 그러고 싶어서' is a motive and a want: it stays out), brain.js `failed` templates (now '…이름만 보고 왔어'
     / '…문이 안 열렸어', were '…이름만 기억해 둘래' / '…다음에 다시 가 볼래') and `hintNote` (now '…힌트 쪽엔 못
     갔어', was '…힌트는 다음에 찾아볼래'). A '-ㄹ래' that promises something the code never does (for example "next
     time I'll try again" when nothing makes the next walk go there) is not a decision: keep the fact line and say why.
     Keep every world.js / brain.js pair identical.
   - **Warmth pass, small:** read every line honest2 rewrote. Where one now reads curt or like a report (for example
     the '…그게 다야' endings), make it warmer with facts (what was seen, heard, done, where) or a true decision
     ending — never a feeling word, never a made-up motive. Only the few that need it; list each before → after.
   - Tests: the facts check in `tools/test-brain.js` (`CLAIM_RX`, `HONEST_OK`, `DECISION_OK`, near 1800) follows the
     rule: '-ㄹ래' alone is not a claim; wishes still are ('-고 싶', '-면 좋겠', '바라', …). Also close the recheck's
     gap H1: plain 좋- forms (좋다, 좋더라, 좋네, 좋던 — or 좋 in general, with the allow-list for '좋은 아침' etc.),
     만족, 다행, 흐뭇, 아늑, 들떴 / 들뜬, 즐기, 안심, 설렘, 외롭, 그리움, 쓸쓸, 짜릿, 부러. Its evidence and mutants:
     `/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final/recheck-honest2/` (mutation-fix.txt,
     probe/rx.js, probe/lrae.js). `DECISION_OK` may go or stay as documentation; say which.
3. **C6 → (b): rows that code wrote keep the usual face.** "평소 얼굴" = the `idle` expression. Find every place where
   code picks a face that shows a feeling or a mood (happy, curious, sleepy, calm — the half-lidded calm reads as
   sulky, see the comment near `js/app.js` 3319 — and any other) for a dialogue/log row, a bubble or the scene, and
   who wrote the text it goes with. Known places (line numbers at `46d5d5a`, approximate):
   - the greeting row: `setGreeting(…, 'happy')` (~2464, ~4268): `idle` while awake; `sleep` while asleep stays (a
     state, not a feeling);
   - wrap-up: `REACT_EXPR` (폴짝 / 우쭐 → happy, 졸림 → sleepy, 덤덤 → calm, ~33), the wrap-up bubble (~1959) and
     `octState(rx.r === '폴짝' || rx.r === '우쭐' ? 'happy' : 'idle')` (~1960, the scene's happy face). When the demo
     rule chose the reaction: the usual face. When the model (or a person in dev mode) chose it: keep rendering
     their choice — `docs/MODEL_VOICE.md` (~77) already says joy shows only when the chooser gave it;
   - log rows (~2270-2296): return (calm), remember (curious), stay_home (calm; sleep for a nap), empty_turn (sleep):
     code-written text → `idle`; a real nap or sleep keeps `sleep`;
   - tap and think bubbles with code lines: `expressRow('curious')` (~1432, ~1476, ~1548), `souvenirTap` `say(…,
     'happy')` (~534);
   - a physical motion that goes with a reaction (a hop for 폴짝) may stay if it is an action, not a face: decide and
     say.
   - **Leave alone and list:** the salon's faces (`salonRun.face`, the salon stage) and the kitchen stickers (owner
     decisions in `docs/COOK_STICKERS.md`). Keep `EXPRESSIONS`, saved data and test hooks compatible.
   - Tests: a smoke check that, with the octopus awake, the greeting row's portrait is idle, a demo 폴짝 / 우쭐
     wrap-up row's portrait and the scene face are idle, and a reaction the model chose still shows its face (find
     a way through the existing MCP or human test paths; if none exists, say so and test the mapping directly).
4. **Owner question 4 → (b): the demo hides the mood words '우쭐' and '덤덤'.** When the demo rule chose the
   wrap-up reaction, the words '우쭐' (proud) and '덤덤' (unmoved) are not shown anywhere the player reads them (the
   wrap-up bubble, the wrap-up log row, the diary / album, the poster or note text, the scene description, the
   screen-reader line, the share or export text if it shows them): the row keeps its fact line ('들른 데를 끝까지 다
   읽었어' etc.) and the usual face. '폴짝' (a movement) and '졸림' (the octopus really goes to sleep sooner) stay. A
   reaction the model (or a person in dev mode) chose itself is shown as they gave it (hard line 2). Keep the reaction
   values in saved data and in the protocol unchanged (old saves, the MCP contract): this is a display rule, not a
   data change. Find every place the reaction word reaches the screen (`grep -n "rx.word\|reaction" js/app.js`,
   `REACT`, the album and poster code). Test: a demo trip with 우쭐 and one with 덤덤 show neither word in the bubble,
   the row and the diary; a model-chosen 우쭐 still shows it; 폴짝 and 졸림 still show.
5. **Also (no owner decision needed):** the album's empty text '아직 쪽지는 없어. 집에 있는 날 하나 써 둘게.'
   (`js/app.js` ~2797) is code speaking for the octopus and promising an action a connected model may never take.
   Make it true or say it in the house voice as a fact. And H2 from the recheck (optional nit): `portExact`
   records the portrait colour before painting; fix only if it is small.

## Docs

`docs/OWNER_DECISIONS.md`: add C3 / C4 / C6 in the format of the 11-14 section honest2 wrote, and replace its last
sentence ('…같은 꼴을 어떻게 볼지는 주인 몫') with the decision. `docs/MODEL_VOICE.md` / `docs/DESIGN.md` (§15.2 row
faces) / `docs/DIALOGUE_UI.md` / audio docs where they describe what changed, each with a short dated note (11-14,
owner C3 b / C4 a / C6 b).

## Lanes

Other agents work at the same time: lane imp2 (`/home/user/ppolppol-fix-imp2`: `importJSON`, `syncRest`, `resetAll`,
scenario Z part 5 and import checks), lane furn (`/home/user/ppolppol-fix-furn`: the furniture code in `js/scene3d.js`
and its Z checks), a read-only furniture-UX probe. Stay out of those. Your area: the strings above, the faces code
picks, `js/audio.js` `onPet`, their tests and docs. The load rule in COMMON4.md applies.

## Rules

- Smallest change. Match each file's style (comments short, Korean, dated `11-14`, saying why).
- Font check if Korean text changes; regenerate with the same tool without `--check` if stale and list the files.
- No emoji or symbol characters (hard line 6). Sound stays off by default (hard line 7).
- The model's words are never touched (hard line 2).

## Tests that fail without the fix

For each item, a check that fails if the old behaviour comes back; revert each change alone in a scratch copy and
name the check that fails (mutation table). Deterministic under load.

## Suites

`npm test` (test-brain, test-model-voice, test-audio, test-export); the font check; the smoke letters that cover the
greeting, the wrap-up rows, petting and the demo lines (find them with grep; at least `A` and `T`) until each passes
twice in a row, or explain a load-only failure with a control run on the base `46d5d5a`. Keep scratch copies in
`/dev/shm` and delete them. Put back every tracked evidence file you did not mean to change.

## Report

Each change (file:line, before → after) with its reason; every face site you found with its verdict; the lines
brought back to '-ㄹ래' and the ones kept as facts with why; the warmth-pass list; docs changed; the checks and the
mutation table; suite totals; what you did not verify. Screenshots (full paths) at 360x740 of the log with the
greeting and a demo wrap-up row, before and after.
