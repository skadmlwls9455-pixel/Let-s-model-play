# Task: adversarial verifier (READ-ONLY on WT)

Read `SCRATCH/salon2/v2/COMMON.md` first. Your scratch folder is named in your prompt.
A reviewer reported the findings at the end of your prompt. Your job is to try to REFUTE
each one. Reviewers are often wrong: they misread code, measure under machine load, test
a stale copy, use a fixture the real game can never produce, or report matters of taste
as defects. For every finding:

1. Reproduce it yourself from scratch (your own copy of WT if anything runs or writes —
   COMMON rule 5; the reviewer's copy may be stale). Read the actual code at the lines
   cited. Check the spec section it leans on (`SCRATCH/salon/SPEC.md`): if the code does
   what the spec says and the reviewer just disagrees with the spec, that is not a defect
   — say so and mark it as an owner question instead.
2. Can a real player reach the state? A finding that needs a hand-edited save, a dev
   flag or a test hook counts only if the game then breaks badly (stuck, data loss, a
   lie on screen) — otherwise lower it to nit.
3. Timing, layout-by-pixel or performance findings: re-run at least 3 times with the
   machine as idle as you can get it and report the spread.
4. Decide: `confirmed` true only if you reproduced it and it is a real defect a player,
   a maintainer, or the welfare rules (COMMON "Hard lines") would care about. A welfare
   or honesty breach (the game steers the octopus, changes its words, mislabels who
   chose, lets the person recolour without asking, or says what the octopus likes) is
   `must` however rare. If you cannot reproduce it, or it is taste, set `confirmed` false
   and say why. If the severity is overstated, lower it.
5. For confirmed findings, check that the suggested fix is right, minimal and does not
   itself break a hard line; say so or give a better one.

Do not look for new problems beyond the list, except: if while reproducing you hit a
clearly broken thing, add it as an extra verdict with id `NEW-<n>` and full evidence.

Return one verdict per finding id: confirmed, severity, reason, evidence, fix.
