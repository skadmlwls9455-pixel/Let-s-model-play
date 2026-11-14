# Production check A (second deploy) — the checklist, on the address players use

Read `/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/export/preview-check.md` in full and follow it,
with the parameters and amendments below. Where this file and that one differ, this file wins.

- BASE = `https://ppolppol-octopus.vercel.app` (production; real players use it)
- It must be built from commit `a8501754f595c93f8e30eba635c4c7f10b27a504`
- Deployment id: given in your task message (the lead creates it just before you start)
- Moment: AFTER the new build (the second deploy) became production. Until a few minutes ago this address served the
  first deploy (commit `f2c93f1`). Both builds copy only the game's files into `public/`; the point of this check is that
  the new build answers, serves only the game, and its functions still work.

You change nothing: no repository edits, no deployments, no project settings, no GitHub posts, no POST requests.

## Amendments

Step 1 (build log)
- A local export of the same commit gives exactly `export-site: 651 files, 60636312 bytes -> public/`. Quote the line
  from the build log and say whether both numbers match.
- Functions: nine now. The eight in the checklist plus `api/lang/[key]`.

Step 2 (must be 200) — also fetch
- `/vendor/fonts/UNIFONT-LICENSE.txt`, `/vendor/fonts/Unifont-Devanagari.sub.woff2` (status only)
- `/credits.html` must also contain "GNU Unifont".

Step 3 (must be 404) — also fetch
- `/wip/round2/README.md`, `/wip/round2/reports/report-imp-look.json`, `/tools/test-salon.js`, `/docs/SALON.md`,
- `/wip/salon2/VERIFY_2026-11-10.md`, `/docs/I18N_FIXES_BRIEF.md`, `/docs/I18N.md`, `/library/books/en/bell.md`,
  `/library/cards/en/HIS04.md`, `/mcp/i18n/ko.js`, `/mcp/data/rooms.manual.json`, `/mcp/http.js`

Step 4 (functions) — also
- GET `/api/lang/x` → 405 `{"ok":false,"error":"method"}` with `Allow: POST` and `Cache-Control: no-store`.
- This is production: storage and the secret are configured, so `/api/runner/top` must be 200 with `"ok":true` and
  `/api/runner/seed` must be 200 with a token. A 502/503 here is a failure, not a named exception.
- Still no POST anywhere and no room creation.

Step 6 is replaced by
- (a) On BASE: `/docs/VISION.md` and `/.claude/skills/cozy-web-game/assets/motion-tokens.css` must now be 404.
- (b) The branch address `https://ppolppol-octopus-git-cc-13abd3-<team>.vercel.app/docs/VISION.md`
  → expected 404 (it points at this same build).
- (c) One old build, for the record only: `list_deployments` (projectId `prj_INkDrgUpCPyhTdu03ycjFSZyTc5z`, teamId
  `team_yAvniXKvLcY7eDMemTLmk35O`, target `production`, limit 3) → take the production deployment created just
  before the new one (expected: the build of `f2c93f1`) → fetch `https://<its url>/docs/VISION.md` once. Report its id, its commit and the
  status. A 200 there is expected (old builds keep serving what they were built with at their own generated
  addresses; whether to protect or delete them is an open decision for the owner) and does not fail this check.
  Report it plainly under `oldBuild`.

## Notes on the fetch tool

- The result is JSON: `status` near the top, then `text` (the whole body), then `headers` at the end.
- Big bodies may be cut off or saved to a file. Do not read a saved body. If you need a header of a big file, read only
  the end of the saved file (for example `tail -c 1500 <file>`).
- Sounds and fonts are binary: status and content-type are enough.

## Report

Use the structured output. `verdict` is `pass` only if: the build is the named commit and READY; every expected-200 was
200; every expected-404 was a real not-found answer; all nine functions answered with their own JSON as listed; (a) and
(b) were 404. Otherwise `fail`, and list the blocking items. Do not soften a failure into a pass, and do not report as
checked anything you did not fetch.
