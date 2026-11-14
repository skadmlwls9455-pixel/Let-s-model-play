# Owner decisions O1 (b) and O2 (c): demo lines say facts, petting keeps an idle face (lane "honest2")

Read `/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final/COMMON4.md` first (the project,
hard line 1, how to run things). Your label (scratch folder) is in your task message. You edit only
**`/home/user/ppolppol-fix-honest2`** (branch `fix-honest2`, base **`12ba4e9`** = production `a850175` + notes;
`node_modules` is an untracked symlink, never stage it). Do not commit.

## The situation

Hard line 1: nothing may say or imply what the octopus feels, likes, wants or tastes; code-written lines must not
pass as the model's words. The last honesty lane (11-13) fixed the petting bubble ('…좋아' → '…'), a scene
description and the nap label, and its checker raised two owner items
(`…/scratchpad/final/report-check-honest.json`, ids O1 and O2). **The owner answered on 11-14:**

- **O1 → (b):** the demo brain's lines (rule-written, shown under the '데모' tag) that claim a feeling, a liking, a
  want, curiosity or contentment are rewritten as **plain facts**: what the octopus did, where it went, what was
  there, what happened. They stay short, warm and plain, in the same 반말 voice; they may still be first person about
  actions ("~했어", "~에 갔어", "~가 있었어"). No new feeling words.
- **O2 → (c):** after petting, **keep the heart particle** (`UIART.fx('heart')` in `pet()` — the player's own act)
  and the '…' bubble, but **the octopus's face stays its idle face** while being petted: no closed happy eye arcs,
  no smile, no blush, no whole-body flush — in the 3D scene, the 2D fallback and the dialogue/log portrait. A purely
  physical squish (the body pressed by the hand: squash/stretch, a small wobble) may stay; say in the report what you
  kept and why.

## O1 — the lines (find them all; this list is where to start, not the end)

`js/world.js` (line numbers at `12ba4e9`): 109 '비 오는 날엔 우산 위 소리가 제일 좋아' · 985 '찻잎이 펴지는 걸 보는 게
좋아' · 1141 '수수께끼는 답보다 질문이 재밌어' · 1251 detail '…빗소리가 좋아서 집에 있었어.' · 1255 detail '…그게
좋았어.\n오늘은 그걸로 충분했어.' · 1290 '모르는 데로 한 발 디뎠어. 그게 재밌었어' · 1340 '{hint} 보는 건 다음에. 오늘은
{mem} 쪽이 궁금했어' · 1370 enough '{l}까지 가니 이만하면 됐다 싶었어' · 1488 ignoredHintLine '오늘은 그쪽 말고 다른 데가
궁금했어' · 1494 homeStay '오늘은 집에 있을래. 그냥 그러고 싶어서.' · 1514 affinityNone '아직 어디가 좋은지 모르겠어. 더
다녀 봐야 알겠어'. `js/brain.js`: 40 IGNORED_NOTE · 47 ignored (…'궁금했어', '{hint} 말고 {mem} 쪽이 끌렸어. {memory}')
· 841 enough. The two files hold copies of some lines (world.js is the data, brain.js has fallbacks): keep each pair
identical.

Then **sweep** every player-facing code-written string in `js/` and `index.html` (and the strings the MCP server
code in `mcp/` puts on the player's screen, if any — not the text it sends to the model) for the same kind of claim:
liking (좋아, 좋았, 제일 …), fun (재밌, 재미), wanting (싶어, -ㄹ래 as a wish), curiosity (궁금, 끌렸), contentment
(됐다 싶, 충분했), and the like (설레, 신나, 기뻐, 행복, 편안, 포근, 반가, 심심, 외로, 그리워, 신기했, 놀랐, 맛있). Judge
each hit: a fact about the world ("뱃사람들이 좋아했대" is about sailors, fine), the model's own words (never touched —
hard line 2: the model voice path is separate, see `js/brain.js` near 1101 and `docs/MODEL_VOICE.md`), a label the
player reads as a stat name (fine if it does not claim a feeling), or a claim (rewrite). List every hit with your
verdict in the report. Keep the line's job: an `ignored` note still says the hint was not followed, `enough` still
says the walk ended there, `homeStay` still says it stays home today, `affinityNone` still says there is no
favourite yet — in facts (e.g. "아직 여러 번 가 본 곳이 없어").

## O2 — where the petting face lives

- `js/scene3d.js`: the face table near 1858 (`pet: { lid, pupil, arcs, smile, blush, pose }`), the portrait colour
  near 1914 (`expr === 'pet' ? mixHex(base, OCp.hi, 0.35)` — the portrait's flush), the body flush near 2986
  (`oct.flushK`), the pet motion near 2939; `STATE_EXPR` near 1865.
- `js/scene2d.js`: the state → expression map near 343, the 'pet' face (arcs, blush ovals, brighter body) near
  363-381.
- `js/app.js`: `STATE_EXPR` near 34 (the dialogue portrait's resting face), `pet()` near 1612, `relaxFace`.
- `css/style.css` near 213: `.st-pet .blush { opacity: .9; }`.
- Decide the cleanest way (for example: the 'pet' state maps to the idle face everywhere, or the 'pet' face's
  entries become the idle values), keep `EXPRESSIONS` and saved data compatible (an old save or a test hook may still
  name 'pet'), and do not touch the salon's faces (the salon stage picks its own faces; `salonRun.face`).

## Docs

Update the docs that quote the old lines or describe the petting face (`grep -rn` the old strings and "홍조",
"blush", "pet" in `docs/`; at least `docs/DESIGN.md`, `docs/MODEL_VOICE.md`, `docs/UI_ART.md`, `docs/SCENE.md` if
they describe it), with a short dated note (11-14, owner O1 b / O2 c, hard line 1). Add the two decisions to
`docs/OWNER_DECISIONS.md` in its format.

## Lanes

Another agent edits **`/home/user/ppolppol-fix-imp2`** at the same time (lane imp2: `importJSON`, `syncRest`,
`resetAll`, `resumeRunning`, scenario Z part 5 and import checks in Q/X). **Stay out of those**; your area is the
strings above, the petting face, their tests and the docs.

## Rules

- Smallest change. Match each file's style (comments short, Korean, dated `11-14`, saying why).
- New Korean characters in `js/`, `index.html` or `css/` can make the subset fonts stale: run the font check and, if
  stale, regenerate with the same tool without `--check` and list the font files it rewrote.
- No emoji or symbol characters (hard line 6).

## Tests that fail without the fix

Find every test that asserts the old strings or the pet face (`grep -rn` the old lines, "pet", "blush", "arcs" in
`tools/`) and update it to the new behaviour without weakening it. Add checks that fail if an old line comes back:
for O1 a check over the demo text data (every string the demo brain can produce, including templates after
filling) that none contains the claim words above (keep an explicit allow-list for the fact hits you judged fine);
for O2 a check that after a pet the 3D face (`APP.scene` test getters or the face table), the 2D face and the
portrait show no arcs, no smile, no blush and no flush while the heart particle still fires. Revert each change
alone in a scratch copy and name the check that fails.

## Suites

`npm test` (includes `tools/test-brain.js` and `tools/test-model-voice.js`, which quote some old lines); the font
check; the smoke letters that cover petting and the demo lines (find them with grep; at least `A` and `T`) until
each passes twice in a row; `node tools/test-play.js` once if the demo text it reads changed. The load rule in
COMMON4.md applies (another agent runs browsers). Keep scratch copies in `/dev/shm` and delete them. Put back every
tracked evidence file you did not mean to change.

## Report

Each change (file:line, before → after), the docs changed, the full sweep list with verdicts, what you kept of the
petting motion and why, the checks and the mutation table, suite totals, what you did not verify. Screenshots
(full paths) of the 3D and 2D petting face before and after at 360x740.
