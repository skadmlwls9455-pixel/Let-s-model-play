# Check one lane of the second round of fixes (independent)

Read `/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final/COMMON2.md` first for the
project, the hard lines, the reports and how to run things. Your task message names: your label (scratch
folder), the tree to check and its base commit, the brief the fix agent followed, and the fix agent's report.

## The situation

An independent verification of the merged tree produced a list of defects. A fix agent has changed the code for
one group of them, following the brief named in your task (read it completely: it says what was to be fixed,
what was deliberately left alone, and which functions belong to other lanes). Its changes are uncommitted in the
tree named in your task (`git diff` there; `git diff --stat` first), its working notes are in its scratch folder
(`…/scratchpad/final/<its label>/notes.md`), and its report is given to you with your task.

You are an independent checker, and this goes to players if you find nothing. You are read-only on that tree:
copy it to your scratch folder to mutate it or to run suites that rewrite evidence files. Assume every claim in
the report is unverified until you have seen it yourself.

## Your job

1. **Read the diff** line by line against the surrounding code and against the brief. For each item of the
   brief: is the defect gone by construction, or only for the tester's exact steps? What did the change do to
   the neighbouring paths (a reload in the middle, two tabs, a save from before the change, a damaged save, the
   2D fallback, reduced motion, the entry intro, a name not set yet, the octopus asleep or out)? Did the agent
   touch a function that belongs to another lane, or change something the brief said to leave?
2. **Reproduce and re-test by playing** on a phone-sized screen (360x740 and 320x568, touch; the date hook where
   days matter): for each item, the original repro on the base commit (the reports' scripts; make an untouched
   copy of the base with `git -C <tree> archive <base> | tar -x -C <scratch>/base` and link `node_modules`), then
   your own probe on the fixed tree. Do not reuse the fix agent's test as your only evidence. Look at the
   screenshots yourself: placement at 320 px, overflow, both font themes, light and dark where looks changed.
3. **Hard lines** (COMMON2.md) on every new or changed player-facing line and label: no pressure, no praise that
   pushes, nothing about the octopus's feelings, no emoji or symbols; the font check says `stale: none`; nothing
   plays or loads a sound; a refusal is still staged plainly.
4. **The tests.** Revert each fix alone in a scratch copy: which check fails? Add mutants of your own where a fix
   has more than one line that matters. A fix or a line with no failing check is a finding. Are the new checks
   deterministic: do they pass five times in a row on this loaded machine? Did any existing check lose strength
   (`git diff <base> -- tools/`)?
5. **Suites on a copy:** `npm test`, the font check, the lane's new or extended smoke scenario, `SMOKE_ONLY=A`
   once, and at most one more old suite that the change is closest to. The load rule in COMMON2.md applies: one
   control run on the untouched base when something old fails; no loops; do not wait for a quiet machine.

## How to report

Findings with severity (`must` / `should` / `nit`; `owner` for design decisions), where (file:line and screen),
steps or script path, evidence, suggested fix. Then: the per-item table (item → reproduced on the base → gone on
the fixed tree → guarding check that fails on revert), your own mutants, suite totals with the load note and the
control result, screenshots (full paths), what held, what you did not check. Reproduce a problem twice before
reporting it.
