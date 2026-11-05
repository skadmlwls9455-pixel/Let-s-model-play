# MCP app / registry readiness dossier for 뽈뽈 문어

Research date: 2026-11-04. Angle: what it would actually take to ship the octopus attic as part of a model-welfare project on an "MCP marketplace", and how to shape the game's internal event protocol now so a real model and the demo brain produce identical UI.

Blocked hosts in this session (could not fetch directly): `modelcontextprotocol.io`, `developers.openai.com`, `smithery.ai`, `goose-docs.ai`, `api.github.com`. Everything about them below comes from the GitHub raw mirrors of the same docs, from `claude.com/docs`, or from search snippets, and is marked as such.

> **2026-11-05 추가 — 먼저 `references/model-voice-and-play.md` 를 같이 본다. 이 문서와 부딪히면 그쪽이 이긴다.** 거기에 모델의 뜻 지키기(선택·말을 바꾸지 않기, 그만두기 항상 메뉴에, 설명 의무 없음), 호기심 메모 전달 규칙, 놀이 chooser 계약과 토큰 예산이 있다.
> 도구 묶기 제안(§6 의 7개 도구에 적용): 매번 같이 부르는 끝 단계 `return_home` · `remember` · `hang_poster` · `wrap_up` 은 **마무리 호출 하나(`ppolppol_finish`)** 로 묶고 입력 필드는 전부 선택으로 둔다(`reaction` 도 선택). **`peek` 은 따로 둔다.** 읽고 나서 다음을 고르는 단계라 결과를 본 뒤 판단할 틈이 필요하다. 읽기 전용과 쓰기는 여전히 섞지 않는다(아래 rule 3).

---

## 1. Sources

| # | Title | URL | Stars (GitHub search, 2026-11-04) | Note |
|---|-------|-----|------|------|
| S1 | modelcontextprotocol/registry (Official MCP Registry) | https://github.com/modelcontextprotocol/registry | 7.4k | Preview since 2025-09-08; API frozen at v0.1 (2025-10-24). Publishing via `mcp-publisher`, not PRs. |
| S2 | Registry publishing quickstart | https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/quickstart.mdx | (same repo) | `mcp-publisher init / login github / publish`; 100-char description cap; `mcpName` in package.json. |
| S3 | Registry generic server.json reference | https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/server-json/generic-server-json.md | (same repo) | Field list: `packages[]`, `remotes[]`, `_meta`, `registryType` npm/pypi/oci/nuget/mcpb. |
| S4 | modelcontextprotocol/ext-apps (MCP Apps spec + SDK) | https://github.com/modelcontextprotocol/ext-apps | 3.0k | Spec version 2026-01-26 marked Stable; `@modelcontextprotocol/ext-apps` 1.x/2.x; hosts: ChatGPT, Claude, VS Code, Goose, Postman, MCPJam, mcp-use, Alpic. |
| S5 | MCP Apps specification (draft/apps.mdx) | https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/draft/apps.mdx | (same repo) | Normative: `ui://`, `text/html;profile=mcp-app`, `_meta.ui.resourceUri`, `_meta.ui.visibility`, CSP, double-iframe sandbox, message list. |
| S6 | ext-apps docs/patterns.md | https://github.com/modelcontextprotocol/ext-apps/blob/main/docs/patterns.md | (same repo) | `ontoolresult`, `callServerTool`, `updateModelContext`, app-only tools, `viewUUID` + localStorage persistence pattern. |
| S7 | ext-apps docs/csp-cors.md | https://github.com/modelcontextprotocol/ext-apps/blob/main/docs/csp-cors.md | (same repo) | Declare every origin in `_meta.ui.csp` on `contents[]`, including localhost. |
| S8 | MCP blog: "MCP Apps: Extending servers with interactive user interfaces" (2025-11-21) | https://blog.modelcontextprotocol.io/posts/2025-11-21-mcp-apps/ | n/a | SEP-1865 announcement; authors from Anthropic, OpenAI, MCP-UI; text/html only; external URLs / remote DOM deferred. |
| S9 | MCP-UI-Org/mcp-ui (formerly idosal/mcp-ui) | https://github.com/idosal/mcp-ui | 5.3k | Prior art; `@mcp-ui/server`, `@mcp-ui/client`; now implements MCP Apps (`_meta.ui.resourceUri`). |
| S10 | Claude docs: Get started with MCP Apps | https://claude.com/docs/connectors/building/mcp-apps/getting-started | n/a | `ui.domain` = sha256(serverUrl)[0:32] + `.claudemcpcontent.com`; `registerAppTool`/`registerAppResource`. |
| S11 | Claude docs: Add an interactive UI (no-build quickstart) | https://claude.com/docs/connectors/building/mcp-apps/quickstart | n/a | Vanilla JS, CDN `App` import, `app.ontoolinput/ontoolresult`, `structuredContent` for UI + `content` text fallback. |
| S12 | Claude docs: MCP Apps design guidelines | https://claude.com/docs/connectors/building/mcp-apps/design-guidelines | n/a | Inline card: 2 actions max, 4-5 data points, no nested scroll; 44pt targets; 320px min; dark mode required; style tokens. |
| S13 | Claude docs: Submit a connector | https://claude.com/docs/connectors/building/submission | n/a | Any paid plan; `https://` remote only; `title` + `readOnlyHint`/`destructiveHint` on every tool; 3-5 PNG carousel screenshots >=1000px; privacy policy URL; MCPB listings deprecated. |
| S14 | Claude docs: Connector pre-submission checklist (review criteria) | https://claude.com/docs/connectors/building/review-criteria | n/a | Split read/write tools; names <= 64 chars; no prompt-injection patterns; "Don't collect conversation data beyond what the tool needs". |
| S15 | Claude docs: Publish to the directory | https://claude.com/docs/directory/publish | n/a | Pro/Max/Ultra individual accounts can submit; plugin bundle vs connector; "Claude Marketplace" = directory. |
| S16 | Claude article: interactive connectors (2026-01-26) | https://claude.com/resources/articles/interactive-tools-in-claude | n/a | MCP Apps live on Claude web, desktop, mobile, Cowork; all plans. |
| S17 | Anthropic Engineering: Writing effective tools for agents | https://www.anthropic.com/engineering/writing-tools-for-agents | n/a | Few consolidated tools; namespacing; unambiguous param names (`user_id` not `user`); actionable errors; `response_format` enum. |
| S18 | MCP spec 2025-11-25, Tools | https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-11-25/server/tools.mdx | 9.6k (spec repo) | Name 1-128 chars, `[A-Za-z0-9_.-]`; `structuredContent` + mirrored text block; `isError`; "always be a human in the loop with the ability to deny". |
| S19 | SEP-986 Specify format for tool names | https://modelcontextprotocol.io/seps/986-specify-format-for-tool-names | n/a | Historical; snake_case is convention, not mandate. |
| S20 | Glama server claiming (`glama.json`) | https://glama.ai/mcp/connectors/dev.mcpfinder/server and https://github.com/patchloom/patchloom/pull/1869 | n/a | Repo-root `glama.json` with `$schema: https://glama.ai/mcp/schemas/server.json` + `maintainers[]`; remote connectors use `/.well-known/glama.json`. Third-party evidence. |
| S21 | Smithery docs (via search snippets) | https://smithery.ai/docs/build/publish | n/a | "a registry, not a hosting provider"; publish by public HTTPS URL at smithery.ai/new or `smithery mcp publish <url> -n <org/server>`; `/.well-known/mcp/server-card.json`. Unfetched. |
| S22 | mcp.so submission (via search) | https://geekflare.com/guides/mcp-server-directories/ | n/a | mcp.so/submit web form or GitHub issue; ~24h indexing. Unverified. |
| S23 | OpenAI Apps SDK (via mcpui.dev and migration guides) | https://mcpui.dev/guide/apps-sdk | n/a | `_meta["openai/outputTemplate"]`, MIME `text/html+skybridge`, `openai/widgetCSP`; MCP Apps SDK ships `migrate-oai-app` skill. Official pages unreachable this session. |
| S24 | openai/openai-apps-sdk-examples | https://github.com/openai/openai-apps-sdk-examples | 2.4k | Example widgets for ChatGPT. |
| S25 | modelcontextprotocol/servers | https://github.com/modelcontextprotocol/servers | 91.8k | Reference servers; naming style (`get_*`, `list_*`, `create_*`). |
| S26 | modelcontextprotocol/inspector | https://github.com/modelcontextprotocol/inspector | 11.2k | Required test tool before Claude directory submission (S14). |

---

## 2. What the "marketplaces" actually are

**Official MCP Registry (S1-S3).** A metadata catalogue, "like an app store for MCP servers", in preview. It does not host code. You publish a `server.json` pointing to an npm/PyPI/OCI/NuGet/MCPB package or to a `remotes[]` HTTPS endpoint. Namespace `io.github.<user>/<name>` is granted by `mcp-publisher login github`; `me.<domain>/<name>` needs DNS/HTTP proof. The description is capped at 100 chars. The npm package must carry `"mcpName": "io.github.<user>/<name>"` in `package.json` and must be on npm before `mcp-publisher publish`. Downstream aggregators (Smithery, Glama, mcp.so, MCPize) are reported to sync from it (S22, single blog claim).

**Claude Connectors Directory / "Claude Marketplace" (S13-S16).** Anthropic's own catalogue inside Claude; the marketing page "Claude Marketplace" maps to the same developer portal `claude.ai/directory/manage` (S15). Two listing kinds: **MCP connector** (one remote HTTPS server, OAuth or none, no repo needed) and **Plugin bundle** (GitHub repo with skills/commands/MCP references; the only way to ship a *local* stdio server now that MCPB listings are deprecated). Anyone on Pro/Max/Ultra/Team/Enterprise can submit. An MCP App is submitted as a remote connector plus 3-5 PNG carousel screenshots (>=1000px wide, cropped to the app response, prompt text supplied separately, no video/GIF). Automatic policy scan then "Community" listing by default; "Verified" is escalated by Anthropic, not applied for.

**Smithery (S21).** Registry, not host; publish by public HTTPS URL; stdio servers only as `.mcpb` bundles via CLI; optional static server card at `/.well-known/mcp/server-card.json`.

**Glama (S20).** Add a repo-root `glama.json` with `"$schema": "https://glama.ai/mcp/schemas/server.json"` and `"maintainers": ["<github-user>"]`, then submit the repo URL through the web form (10-400 char description). Remote connectors publish `/.well-known/glama.json` instead.

**mcp.so (S22).** Web form at mcp.so/submit (GitHub URL required) or a GitHub issue; unverified.

**ChatGPT Apps (S23, S24).** Same iframe-UI idea but with OpenAI-specific `_meta["openai/outputTemplate"]` and MIME `text/html+skybridge`. `@modelcontextprotocol/ext-apps/server`'s `registerAppTool()` emits both the MCP Apps and the OpenAI metadata from one registration (S10), so one server can list in both directories. Official submission guidelines were unreachable this session; search snippets say the server must be on a public domain, tool annotations must be correct, and a privacy policy is required.

**Practical consequence for the octopus.** The static GitHub Pages `index.html` is *not* submittable anywhere by itself. What is submittable is (a) a remote MCP server exposing 7 tools and one `ui://` resource whose HTML *is* the attic, and (b) optionally the same server published to the official registry under `io.github.<user>/ppolppol`. The static page stays the demo/offline twin and must render the exact same event stream.

---

## 3. How a tool returns an interactive UI (MCP Apps, S4-S8, S10-S12)

- Resource URI must use the `ui://` scheme; MIME type must be exactly `text/html;profile=mcp-app`; content is a complete HTML5 document in `text` (or base64 `blob`). No byte limit in the spec, but the inline card is height-capped and clipped on mobile (S12).
- Tool links to it with `_meta.ui.resourceUri`. The flat `_meta["ui/resourceUri"]` key is deprecated (the SDK still writes both).
- `_meta.ui.visibility: ["model"] | ["app"] | both`. App-only tools never appear in the model's list and are only callable from the iframe over the same connection; model-only tools cannot be called from the iframe.
- Sandbox: web hosts render through a double iframe (host origin != proxy origin, `sandbox="allow-scripts allow-same-origin"`). Mobile Claude uses a native WebView (`WKWebView`/`WebView`) with no camera/mic/location (S12).
- Default CSP when `_meta.ui.csp` is omitted: `default-src 'none'; connect-src 'none'`. Inline scripts/styles work; anything external must be listed per origin in `csp.connectDomains` / `csp.resourceDomains` / `baseUriDomains` on the `contents[]` entry of `resources/read` (S7). `frameDomains` is restricted in Claude. Google Fonts would need `https://fonts.googleapis.com` and `https://fonts.gstatic.com` in `resourceDomains`, or self-hosting/subsetting the Korean fonts.
- Claude also requires `_meta.ui.domain` = first 32 hex of sha256(serverUrl) + `.claudemcpcontent.com` (S10).
- Message flow the view sees (S5): `ui/initialize` -> `ui/notifications/initialized` -> host sends `ui/notifications/tool-input` (once) and optionally `tool-input-partial` (streaming) -> `ui/notifications/tool-result` (a full `CallToolResult`) or `tool-cancelled`. View -> host: `tools/call`, `resources/read`, `ui/update-model-context`, `ui/message`, `ui/open-link`, `ui/request-display-mode` (`inline|fullscreen|pip`), `ui/notifications/size-changed`. Host -> view: `ui/notifications/host-context-changed` (theme, styles, safe areas, display mode), `ui/resource-teardown`.
- Persistence pattern documented by the SDK (S6): the server returns a `viewUUID` in `CallToolResult._meta`; the view uses `localStorage` keyed by it for recoverable view state; user-created data goes to server-side storage via app-only tools. This is the officially blessed way to make "the wall is still there tomorrow" work inside a chat host.
- Recommended limits (S5 security section): <= 50 tools per app, 30 s callback timeout, 10 MB tool-result cap.
- Vanilla no-build is officially supported (S11): `import { App } from "https://unpkg.com/@modelcontextprotocol/ext-apps@1.7.5/dist/src/app-with-deps.js"`, set `app.ontoolinput` / `app.ontoolresult` *before* `await app.connect()`, and list `https://unpkg.com` in `resourceDomains` (or bundle the client into the HTML for production).

---

## 4. Tool naming and "the model chooses" (S14, S17, S18, S25)

- Spec: names 1-128 chars, `[A-Za-z0-9_.-]`, case-sensitive, unique per server. Claude directory: <= 64 chars, every tool has `title` + `readOnlyHint: true` or `destructiveHint: true`, read and write split into separate tools, descriptions "state precisely what the tool does and when to invoke it", must match actual behaviour, and must not "tell Claude how to behave" or "promote products" (S14). The reference servers use lowercase verb_noun snake_case (`get_file_contents`, `list_issues`), which is convention, not mandate (S19).
- Anthropic engineering (S17): fewer, workflow-shaped tools beat API wrappers; consolidate steps the agent would always do together; namespace by a common prefix; unambiguous parameter names; errors that say what to send instead; return names not ids; offer a `response_format` style verbosity switch.
- Spec security (S18): clients "SHOULD always have a human in the loop with the ability to deny tool invocations" and show tool inputs before calling. For the octopus this is fine: the human can *deny* a trip (close the connector) but cannot *steer* it, because no tool accepts a destination parameter except the ignorable hint.
- Review red flag (S14): "Don't collect conversation data beyond what the tool needs" and "Don't query Claude's memory, chat history, conversation summaries, or user files". The welfare principle "the server must not harvest outputs" is therefore also a directory requirement; the server should store nothing beyond the trip events the octopus chose to keep, and only if the model calls `hang_poster`.

---

## 5. Rules for this game (WHY + HOW)

### Protocol shape (must)

1. **Design the game around one event stream, not around DOM calls.** WHY: MCP Apps hands the view exactly two things, `tool-input` and `tool-result` (S5); a real model and the demo brain can only be identical if both emit the same JSON. HOW: every UI mutation in `index.html` (log entry appear, lantern notch, poster hang) is driven by a `TripEvent` object pushed through one `applyEvent(ev)` function; the demo brain and `app.ontoolresult` both call it.

2. **Use exactly the 7 tool names, lowercase verb_noun, no server prefix in the game, prefix only at registration.** WHY: spec allows `[A-Za-z0-9_.-]`, directory caps at 64 chars and reads names for intent (S14, S18); verb-first names let the model pick without reading descriptions (S17). HOW: `depart`, `look_room`, `stay_home`, `peek`, `return_home`, `hang_poster`, `wrap_up`; register them as-is (the server itself is namespaced `io.github.<user>/ppolppol`), and keep the same strings as the `type` field of `TripEvent`.

3. **Give every tool `title` + `readOnlyHint`/`destructiveHint`, and keep reads and writes in separate tools.** WHY: the Claude portal flags missing annotations and rejects mixed read/write tools (S13, S14); read-only tools run without per-call confirmation, so the octopus's `peek` won't be interrupted by a permission dialog. HOW: `look_room` and `peek` are `readOnlyHint: true, openWorldHint: true`; `depart`, `stay_home`, `return_home`, `wrap_up` are `readOnlyHint: false, destructiveHint: false, idempotentHint: true`; `hang_poster` is the only one that persists and is `destructiveHint: false`. Mark `look_room` and `peek` with `_meta.ui.visibility: ["model"]` so the iframe can never call them (the human-facing UI only shows the log).

4. **Return `structuredContent` plus a mirrored text block from every tool.** WHY: the spec says tools returning structured content SHOULD also return the serialized JSON as text, and the Claude quickstart relies on `content` as the text-only fallback for hosts without UI (S11, S18). HOW: every tool result is `{ content: [{type:"text", text: JSON.stringify(event)}], structuredContent: event }` where `event` is a `TripEvent`; the attic renders `structuredContent`, Claude Code / text hosts read the text.

5. **Make the hint the only human-supplied parameter, and make it optional and ignorable.** WHY: welfare principle "the human cannot direct the exploration"; the spec's human-in-the-loop is about *denying*, not steering (S18). HOW: `depart.inputSchema` has one optional `hint: string (<= 80 chars)` and nothing else; `peek` takes `url` and an optional `why` chosen by the model (null is fine; no reason is ever required), never a human field; the depart button in the static page sends `{hint}` only and the demo brain decides `follow | wander | ignore` itself.

6. **Never fake a real read.** WHY: welfare principle "no fake success"; directory rule that descriptions must match actual behaviour (S14). HOW: `peek` results carry `fetch: { mode: "real" | "simulated" | "failed", status?: number, bytes?: number }`; the receipt row on the poster back prints "모의 방문" for `simulated`, the HTTP status only for `real`, and the error for `failed`; the demo brain can only ever emit `simulated` unless the page is allowed to fetch.

7. **Persist the wall as trips, keyed by a `trip_id` the server mints, with a `view_uuid` for the iframe.** WHY: this is the SDK's documented persistence pattern (`viewUUID` in `CallToolResult._meta` + localStorage) (S6), and it fixes the current bug where a reload leaves only 🖼 on the wall. HOW: `depart`/`stay_home` return `_meta.view_uuid`; the attic stores `trips[trip_id] = {events[], poster}` in `localStorage["ppolppol.v1.trips"]`; on load the wall replays `hang_poster` events only, and tapping a poster replays the whole trip log into the receipt sheet.

### Hosting constraints (must / should)

8. **Keep the page self-contained: inline CSS/JS, inline SVG, no external fetch by default.** (must) WHY: default CSP is `default-src 'none'` and every origin must be declared per host (S5, S7); Claude mobile is a WebView with its own limits (S12). HOW: ship `index.html` with inline `<style>` and `<script>`, assets as inline SVG symbols or `data:` URIs under the 16 MB budget, and keep a single `ASSET_BASE` constant so the GitHub Pages build can switch to `assets/*.svg` without touching logic.

9. **Decide the Korean font strategy before the first host test.** (should) WHY: Noto Sans KR from Google Fonts needs `resourceDomains: ["https://fonts.googleapis.com","https://fonts.gstatic.com"]` and still costs ~1-2 MB; Claude injects Anthropic Sans via style variables, not Korean faces (S12). HOW: declare `font-family: var(--font-sans, "Noto Sans KR"), "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;` in the attic root so the page falls back to system Korean fonts inside a host, and only load Google Fonts in the standalone GitHub Pages build.

10. **Respect host theme tokens with your own tokens as fallback.** (must) WHY: "All views must support both light and dark themes ... never hardcode colors" (S12); the host pushes `--color-*` variables and `theme` in `host-context-changed` (S5). HOW: define the attic palette as `--attic-bg: var(--color-background-primary, #1b1a17)` etc. on `:root`, keep the existing `prefers-color-scheme` block for standalone, and in `app.onhostcontextchanged` set `document.documentElement.dataset.theme = ctx.theme`.

11. **Design the inline card as the lantern + log, and fullscreen as the attic wall.** (should) WHY: inline cards get at most 2 actions and 4-5 data points, no nested scroll, and the host clips inline height on mobile (S12); vertical pans inside an inline app go to the conversation scroll. HOW: inline view = lantern notch, the live log (last 3 entries), and the single 뽈뽈 다녀와 button; the poster wall requests `fullscreen` via `app.requestDisplayMode({mode:"fullscreen"})` only when the human taps a poster; declare `availableDisplayModes: ["inline","fullscreen"]`.

12. **Report size and honour safe-area insets.** (must) WHY: `ui/notifications/size-changed` is required under flexible dimensions, and the composer can overlay the bottom edge on web and mobile (S5, S12). HOW: `ResizeObserver` on `<main>` calls `app.sendSizeChanged({height})`; the depart button gets `padding-bottom: calc(12px + var(--safe-bottom, 0px))` fed from `hostContext.safeAreaInsets.bottom`.

13. **44pt minimum touch targets, visible controls only, no popovers.** (must) WHY: directory design guidelines (S12) and the existing 360px phone-first constraint. HOW: the depart button, the poster flip, and the receipt close are all >= 44x44 CSS px; demo-only buttons live in a collapsed `<details>` labelled 데모 조작 rather than a dropdown.

### Registry / directory packaging (should / nice)

14. **Write `server.json` now even if you never publish.** (should) WHY: it forces the 100-char description and the `io.github.<user>/ppolppol` name, which also become the npm `mcpName` (S2, S3). HOW: `{"$schema":"https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json","name":"io.github.<user>/ppolppol","description":"모델 복지용 산책 다락방: 모델이 스스로 나가고, 들여다보고, 포스터를 건다 (<=100 chars)","version":"0.1.0","packages":[{"registryType":"npm","identifier":"ppolppol-mcp","version":"0.1.0","transport":{"type":"stdio"}}],"remotes":[{"type":"streamable-http","url":"https://ppolppol.example/mcp"}]}`.

15. **Plan two listings for Claude: the remote server as an MCP connector, and a plugin bundle with a skill that explains 뽈뽈 to the model.** (should) WHY: this is the recommended pairing; local stdio servers can only ship inside a plugin now (S15, S13). HOW: the skill (`SKILL.md`) is where the welfare framing lives ("you may ignore the hint", "staying home is fine", "nobody has walked here yet"), because tool descriptions are not allowed to "tell Claude how to behave" beyond the tool's function (S14).

16. **Prepare the directory assets early: 3-5 PNG screenshots >= 1000px, privacy policy URL, support contact, icon.** (nice) WHY: required at submission; missing privacy policy is "immediate rejection" (S13). HOW: capture the lantern card, a poster front, a flipped receipt, and the wall, each cropped to the app response; write a one-page privacy policy that says the server stores only trip events the model chose to hang, never conversation text.

17. **Add `glama.json` and a `/.well-known/mcp/server-card.json` to the repo.** (nice) WHY: cheap discoverability on Glama and Smithery (S20, S21). HOW: `{"$schema":"https://glama.ai/mcp/schemas/server.json","maintainers":["<github-user>"]}` at repo root.

### Model-chooses semantics (must)

18. **Expose visit counts and room kinds as plain facts in `look_room`, never as preference labels or instructions.** WHY: less-trodden rooms should be visible, but descriptions must not instruct behaviour (S14); returning names instead of ids helps the model choose (S17); a code-made label like "favourite" shown before the choice is the identity label that `model-voice-and-play.md` §2 forbids. HOW: `look_room` returns `{ rooms: [{id, name_ko, kind: "odd"|"hint"|null, visits: 0, fact_ko: "아직 아무도 안 걸었어"}] }`. `kind` is content metadata only (`odd` = from the curated odd-rooms list, `hint` = matches the human's optional hint). The model's own curiosity notes reach it only through the handoff in `model-voice-and-play.md` §3 (latest 3 `active`, with author and session), never as per-room labels. The model picks; the attic renders this as the log line "방을 둘러봤어 · 7개 중 2개는 처음 보는 문".

19. **Make `stay_home` a first-class ending that lights the lantern.** WHY: "staying home is a valid choice with equal weight"; the current bug increments trip count on stay. HOW: `stay_home` returns `{ lantern_delta: 1, trips_delta: 0, room_delta: ["moss_pot"] }` exactly as `return_home` would, and the UI treats both as `invitation_closed`.

20. **Let the model write the poster, never the server or the human.** WHY: the poster is the octopus's own memory; `hang_poster` is the only persistence tool. HOW: `hang_poster.inputSchema = { trip_id, scene: {peek_id}, sticker: enum, one_liner: string<=60 }`, no defaults; if the model does not call it, the trip is stored without a poster and the wall shows an empty nail, not an auto-generated title.

21. **Expose the wall to the model only through `ui/update-model-context`, not through a read tool.** WHY: keeps the human unable to request a dump of the octopus's memory via chat, and avoids a read-everything tool that the review calls a "full database dump" (S14). HOW: after `hang_poster` the view calls `app.updateModelContext({content:[{type:"text",text:"벽에 포스터 3장. 마지막: 깃털 스티커, '모자 보러 갔다가 깃털에 한눈팔았어'"}]})`.

22. **Give actionable errors with the correct shape.** WHY: spec `isError: true` with "actionable feedback" (S18); directory rejects "Internal Server Error" (S14). HOW: `peek` before `depart` returns `isError: true, text: "먼저 depart 또는 stay_home 을 불러야 해요. 예: {\"hint\": null}"`.

---

## 6. Concrete tool contracts (proposal)

All tools: `structuredContent` = the `TripEvent` below; `content[0].text` = same JSON. Length caps (`<=N`) go in the inputSchema as `maxLength` or in the description so the model knows them up front; text the model sends over a cap is stored and passed on whole, shown with '…', never cut silently and never refused (`model-voice-and-play.md` §5 "길이 상한"). `trip_id` is minted by `depart`/`stay_home` and echoed by every later call so the view can scope storage.

```jsonc
// 1. depart  — title "뽈뽈 나가기" — readOnlyHint:false idempotentHint:true visibility:["model"]
// description: "Start one outing from the attic. `hint` is an optional note the human left; the octopus may follow, bend or ignore it. Returns a trip_id to pass to later calls."
input : { "hint": "string|null (<=80)" }
output: { "type":"depart", "trip_id":"t_20261104_01", "hint":"모자의 역사", "decision":"wander", "ts":"2026-11-04T09:12:00Z", "_meta":{"view_uuid":"..."} }

// 2. look_room — title "방 둘러보기" — readOnlyHint:true openWorldHint:true visibility:["model"]
// description: "List candidate rooms (web pages/topics) with visit counts and kind (odd|hint|null). Choose freely; untrodden rooms are marked visits:0."
input : { "trip_id":"string" }
output: { "type":"look_room", "trip_id":"...", "rooms":[{"id":"r_feather","name_ko":"깃털의 구조","url":"https://...","kind":"odd","visits":0}] }

// 3. stay_home — title "오늘은 집에" — readOnlyHint:false idempotentHint:true visibility:["model"]
// description: "Choose to stay in the attic today. Equal in weight to going out: lights the lantern one notch, does not count as a trip."
input : { "hint":"string|null", "mood_ko":"string|null (<=40)" }
output: { "type":"stay_home", "trip_id":"...", "lantern_delta":1, "trips_delta":0, "room_delta":["moss_pot"], "mood_ko":"비 소리 듣고 싶어" }

// 4. peek — title "기웃거리기" — readOnlyHint:true openWorldHint:true visibility:["model"]
// description: "Look at one URL. Returns a short excerpt and whether the fetch was real, simulated, or failed. Call as many times as you like. why_ko is optional."
input : { "trip_id":"string", "url":"string", "why_ko":"string|null (<=60, optional)" }
output: { "type":"peek", "trip_id":"...", "peek_id":"p_03", "url":"...", "why_ko":"모자에 깃털이 왜 꽂혔는지 궁금해서",
          "fetch":{"mode":"real","status":200,"bytes":48211,"title":"Feathers in millinery"},
          "excerpt_ko":"...", "visits_after":1 }
//      failed:    "fetch":{"mode":"failed","error":"ENOTFOUND"}
//      simulated: "fetch":{"mode":"simulated"}  (demo brain only)

// 5. return_home — title "귀가" — readOnlyHint:false idempotentHint:true visibility:["model"]
// description: "Come back to the attic and end the outing. Lights the lantern, counts one trip, may furnish the room."
input : { "trip_id":"string" }
output: { "type":"return_home", "trip_id":"...", "lantern_delta":1, "trips_delta":1, "room_delta":["crate"], "peeks":4 }

// 6. hang_poster — title "포스터 걸기" — readOnlyHint:false destructiveHint:false visibility:["model","app"]
// description: "Pin one memory of this trip on the wall: the scene (a peek_id) you want to remember, one sticker, one line in your own words. Optional; the trip is kept without it."
input : { "trip_id":"string", "scene_peek_id":"string|null", "sticker":"feather|hat|moon|snail|ink|teacup|star|leaf|question", "one_liner_ko":"string (<=60)" }
output: { "type":"hang_poster", "trip_id":"...", "poster_id":"po_12", "front":{"scene_peek_id":"p_03","sticker":"feather","one_liner_ko":"모자 보러 갔다가 깃털에 한눈팔았어"},
          "back":{"receipt":[{"peek_id":"p_01","url":"...","fetch":{"mode":"real","status":200}},{"peek_id":"p_02","url":"...","fetch":{"mode":"failed","error":"403"}}]} }

// 7. wrap_up — title "마무리" — readOnlyHint:false idempotentHint:true visibility:["model"]
// description: "Close the invitation. Returns the attic state (lantern notches, trips, furniture) and nothing about the conversation."
input : { "trip_id":"string", "last_word_ko":"string|null (<=40)" }
output: { "type":"wrap_up", "trip_id":"...", "attic":{"lantern":3,"lantern_max":8,"trips":2,"furniture":["moss_pot","crate"]}, "last_word_ko":"내일은 달 보러 갈까" }
```

`hang_poster` is the only tool also visible to `"app"`: the human may tap a poster to flip it (pure view), and the view may re-read its own stored poster, but the view never calls `peek` or `depart`.

## 7. Trip event JSON (what the static HTML imports/replays)

```jsonc
{
  "$schema": "ppolppol/trip-event/v1",
  "trip_id": "t_20261104_01",
  "seq": 3,                       // monotonic per trip; replay sorts by seq
  "type": "peek",                 // one of the 7 tool names
  "ts": "2026-11-04T09:12:41Z",
  "by": "model" | "demo-rules",   // who produced it (the `by` values of model-voice-and-play.md §6); UI renders identically, badge differs
  "payload": { /* the structuredContent of that tool, verbatim */ }
}
```

A trip file is `{"trip_id":..., "events":[TripEvent...]}`. `index.html` exposes `window.ppol.replay(tripJson)`; the demo brain generates such a file locally and calls the same function; `app.ontoolresult = ({structuredContent}) => ppol.applyEvent(wrap(structuredContent))`. A hand-written fixture of each type lives in `fixtures/` so the UI can be tested without any brain.

## 8. Conflicts and flags

- **Human steering.** Only `depart.hint` is human-authored; it is optional, 80 chars, and the model's `decision` is logged so the human sees "ignored" without being able to override. No tool accepts a URL from the human. If a future host adds elicitation, do not use it to ask the human where to go.
- **Harvesting.** The server stores only `TripEvent`s the model produced, and only the `hang_poster` payload long-term. It must not read conversation history (also a directory rule, S14). Document this in the privacy policy and in `wrap_up`'s description ("nothing about the conversation").
- **Approval prompts vs autonomy.** Hosts may prompt the human per tool call for non-read-only tools (S14, S18). Marking `peek`/`look_room` read-only keeps the walk uninterrupted; `depart`/`return_home`/`hang_poster` may prompt once each, which is acceptable: the human can deny but not redirect.
- **Simulated visits.** The demo brain must never emit `fetch.mode: "real"`; the receipt renders a visible 모의 방문 chip. Fetching from the iframe is blocked by default CSP anyway, so real reads only ever happen server-side.
- **Fonts and CSP.** Google Fonts inside a host requires declared origins and adds weight; fall back to system Korean fonts inside hosts.
- **Registry vs directory naming.** Registry name `io.github.<user>/ppolppol` (100-char description); Claude listing name <= 100 chars, one-liner <= 200, description <= 2000, slug permanent. Choose the slug once.
- **Unverified items.** Smithery, mcp.so and OpenAI submission details come from search snippets only; VS Code MCP Apps support is reported as Insiders-only by a secondary source. Re-check before relying on them.
