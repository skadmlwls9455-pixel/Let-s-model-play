# Launch steps for the salon v2 workflow (lead only; do this AFTER the kitchen shipped)

K = the kitchen's final commit on `ccr-38ad393e-15xr9t` (pushed, CI green, deployed).

1. In the worktree `/home/user/ppolppol-salon2` (branch `salon2-wip`, local only, never pushed):
   - DONE 11-09 20:1x UTC: the WIP is committed locally as `e577d3a` ("WIP 미용실 2부 (검증 전 · 로컬에만 둔다)",
     17 files, on top of 983d436). `git status --short` there shows only `?? node_modules`.
   - Still to do: `git -C /home/user/ppolppol-salon2 rebase <K>` (expected overlaps: `js/app.js` bottom of `renderSettings`
     ('만든 것들' link), `README.md`, `docs/*.md`). Resolve by keeping both sides.
   - After the rebase: `npm test` in the worktree as a sanity check; `node_modules` symlink still there.
2. Fill the placeholders:
   - `sed -i "s/@@K@@/<K short sha>/g" SCRATCH/salon2/v2/*.md`
   - Replace `@@STATE@@` in `COMMON.md` with: branch `salon2-wip` = K + one local WIP commit holding BUILD A +
     DOCS + BUILD B (rebased from 983d436 onto K on <date>; conflicts resolved in: …); working tree clean
     except `node_modules`; nothing of the salon is pushed.
   - `grep -n '@@' SCRATCH/salon2/v2/*.md` must print nothing.
3. Launch: `Workflow({ scriptPath: SCRATCH/salon2/v2/workflow.js })` (or pass its text inline). 9 agents at most.
4. Afterwards (lead): read the result; all suites on the worktree; restore evidence;
   `git -C WT add <explicit paths>`; `git -C WT reset --soft <K>` then one proper commit (commitMsgKo + trailers);
   in MAIN `git merge --ff-only salon2-wip`; push `ccr-38ad393e-15xr9t`; CI; deploy; report to the owner and
   re-ask the two defaults (mirror corner in the attic; "그대로" rests 7 days).
