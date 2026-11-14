# Three code-written lines that say what the octopus feels (lane "honest")

Read `/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final/COMMON3.md` first (the project,
hard line 1, how to run things). Your label (scratch folder): `fix-honest`. You edit only
**`/home/user/ppolppol-fix-honest`** (branch `fix-honest`, base **`6d03faf`**; `node_modules` is an untracked symlink,
never stage it). Do not commit.

## The situation

Hard line 1: nothing may say or imply what the octopus feels, likes, wants or tastes; code-written lines must not
pass as the model's words. The pre-deploy verification (`…/scratchpad/final/report-v2-welfare.json` V4 and
`report-v2-play.json` P7) found three lines that do, all already in production since 11-07, when emoji were replaced
by words (docs/UI_ART.md lines 127-128 record the replacements):

1. **Petting bubble '…좋아'** (`js/app.js` near 1619, `say('…좋아', 'pet', 1800)`, 70 % of pets): a code-written line
   in the octopus's voice saying it likes it. The owner's own rule bans '좋아해'.
2. **Scene description '신나 있어'** (`DOING_DESC.happy` near `js/app.js` 1144; the screen-reader `#scene-desc`), shown
   when the model's wrap-up reaction is 폴짝 or 우쭐: code adds a feeling the model did not state.
3. **Nap label '꿈꾸는 중'** (`DREAM_LABEL` near `js/app.js` 1176, alternating with '자는 중'): claims an inner
   experience.

The owner was asked; the default until they answer is to fix all three as below (they can still say keep).

## What to change

1. Petting: the bubble text becomes '…' (no words). Keep the heart particle and everything else about petting (the
   70 % draw, the timing, the salon's clearing of a pending pet bubble, the awake-window rule). Do not add a new line.
2. `DOING_DESC.happy`: describe what is visible, not a feeling, e.g. '통통 뛰고 있어' (check what the happy state's
   animation actually shows in `js/scene3d.js` and the 2D scene, and describe that).
3. The nap label: only '자는 중' (drop the alternation with '꿈꾸는 중'; keep the label's other behaviour).
4. Update the docs that quote these (docs/UI_ART.md table rows 127-128, docs/DESIGN.md where '꿈꾸는 중' is described,
   any other doc that quotes '…좋아' or '신나 있어'), with a short dated note (11-13, hard line 1).
5. Search the whole player-facing code (js/, index.html, css content) for any other code-written line that says what
   the octopus feels, likes, wants or tastes (words like 좋아, 신나, 기뻐, 행복, 싫어, 슬퍼, 외로, 심심, 맛있, 꿈) and list
   every hit with your verdict in the report. Do not change other lines; report them.

## Lanes

Two other agents edit other trees at the same time: lane **owner3** (`restDown`, `finalPose`, `syncRest`, `sleepNow`,
`on.octUp`, scenario Z part 5, Q21) and lane **v2** (weekly code `oldDone` / `weekState`, the import guard, the bag
sheet, `js/salon.js` normalize, scenario Q section 13, X). **Stay out of those**; your area is the three strings,
the tests that assert them, and the docs.

## Rules

- Smallest change. Match each file's style (comments short, Korean, dated `11-13`, saying why).
- Run the font check (regenerate with the same tool without `--check` if stale and list the font files).

## Tests that fail without the fix

Find every test that asserts the old strings (`grep -rn "…좋아\|신나 있어\|꿈꾸는 중" tools/`) and update it to the new
behaviour without weakening it. Add one check per change that fails if the old string comes back (for example the
petting bubble text is exactly '…', the happy description contains no feeling word, the nap label never reads
'꿈꾸는 중' across several label cycles). Revert each change alone in a scratch copy and name the check that fails.

## Suites

`npm test`; the font check; the smoke letters that cover petting, the scene description and the nap label (find them
with grep; at least `A` and `Y`) until each passes twice in a row. The load rule in COMMON3.md applies (two other
agents run browsers). Keep scratch copies in `/dev/shm` and delete them. Put back every tracked evidence file you did
not mean to change.

## Report

Each change (file:line, before → after), the docs changed, the full list from item 5 with verdicts, the checks and
the mutation table, suite totals, what you did not verify.
