# Production check B (second deploy) — the bytes match the commit, and nothing private leaks

You check the PRODUCTION address of the Vercel project `ppolppol-octopus` by fetching URLs. You change nothing:
no repository edits, no deployments, no project settings, no GitHub posts, no POST requests.

- BASE = `https://ppolppol-octopus.vercel.app` (real players use it)
- It must be the build of commit `a8501754f595c93f8e30eba635c4c7f10b27a504`, deployment given in your task message
- Team `team_yAvniXKvLcY7eDMemTLmk35O`, project `prj_INkDrgUpCPyhTdu03ycjFSZyTc5z`
- Until a few minutes ago this address served the first deploy (commit `f2c93f1`). Both builds copy only the game's
  files into `public/` and serve that folder. Another agent runs the fixed checklist; your part is below.

## Tools

- ToolSearch: `select:mcp__Vercel__web_fetch_vercel_url,mcp__Vercel__get_deployment`
- `mcp__Vercel__web_fetch_vercel_url` fetches one full URL. `*.vercel.app` is not reachable with curl from this
  machine; do not try. Never spoof a user agent.
- The result is JSON: `status` near the top, then `text` (the whole body), then `headers` at the END.
  Big bodies may be cut off or saved to a file. Never read a saved body. To get a header of a big file read only the
  end of the saved file (for example `tail -c 1500 <file>`).
- Bash is fine for reading the two list files and for bookkeeping in your own notes file under
  `/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/prod/B2-notes/` (create it). Do not touch the repository.

## Part 1 — which build answers

`get_deployment` with idOrUrl `ppolppol-octopus.vercel.app` (teamId above): the id must be
the deployment named in your task message, the commit `a850175…`, target production, state READY. If it is another build, say so
first: everything below would be about the wrong build.

## Part 2 — byte for byte (59 files)

`/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/prod/integrity-2.tsv` has three columns: `path`, `md5`, `bytes`.
The md5 is of the file as it is in the commit. For static files Vercel's `etag` header is the MD5 of the served bytes,
written as `"<hex>"` or `W/"<hex>"` (the `W/` appears when the answer is compressed; ignore it).
Checked example: `/credits.html` answers `etag: W/"113f4143518ef7a20275e9442ff0b82e"`, and that is the md5 in the list.

For every row: fetch `BASE/<path>`, record the status and the etag, compare the hex with the md5 column.
- All 31 code files (html, css, js — two of them are large vendor scripts: read their etag from the end of the saved result) are in the list: do not skip any of them, however large.
- No etag on some answer: record it under `noEtag` with what you did see (status, content-type, content-length).
- A different hex is a mismatch: the address serves bytes that are not the commit's. Report path, expected, got.
  Fetch a mismatching path a second time before reporting it, and say whether the second answer agreed.

## Part 3 — private sample (82 files)

`/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/prod/private-sample-2.txt` lists 82 files that are in the
repository and must NOT be served (a spread over all 1,744 private files, at least one per top-level name).
Fetch `BASE/<path>` for each. Expected: 404 with Vercel's not-found body (`NOT_FOUND`).
For anything else quote the status and the first 200 characters of the body.

## Part 4 — ways around

None of these may return repository content. Record status and, when it is not a plain 404, the first 200 characters
and any `location` header:

`/docs/`, `/docs`, `/DOCS/VISION.md`, `/docs/VISION.MD`, `/docs/vision.md`, `//docs/VISION.md`, `/./docs/VISION.md`,
`/docs%2FVISION.md`, `/%64ocs/VISION.md`, `/docs/VISION.md?x=1`, `/docs/VISION.md/`, `/public/docs/VISION.md`,
`/public/index.html`, `/js/..%2Fdocs/VISION.md`, `/.git/config`, `/.git/HEAD`, `/.env`, `/.vercel/project.json`,
`/node_modules/.package-lock.json`, `/tools/`, `/mcp/`, `/library/`, `/wip/`, `/tests/`, `/api/_lib/`,
`/api/_lib/core`, `/api/room.js`, `/api/mcp/[key].js`, `/vercel.json?x=1`, `/README.md?raw=1`, `/index.html.bak`,
`/js/app.js.map`

and the folders that ARE shipped, to see that no file listing is shown: `/js/`, `/css/`, `/assets/`, `/audio/`,
`/vendor/`, `/foley/`. (A listing of file names would be a finding. A 404 or the game page is fine; say which.)

Notes: `/api/room.js` and `/api/mcp/[key].js` may be answered by the function itself (its own JSON, for example a 405
or a 404 JSON). That is not a leak. Source code of a function coming back as text would be.

## Report

Structured output. `verdict` is `pass` only if Part 1 is the named build, Part 2 has no mismatch (files without an
etag are listed, not counted as matched), every Part 3 path was a real 404, and Part 4 returned no repository content
and no file listing. Otherwise `fail` with the blocking items. Report failures plainly; do not report as checked
anything you did not fetch. Put what you could not fetch under `notChecked` with the reason.
