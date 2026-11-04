# Delegation: briefing subagents well, spending fewer tokens

Sources: [MA] anthropic.com/engineering/built-multi-agent-research-system · [CE] anthropic.com/engineering/effective-context-engineering-for-ai-agents · [BP] code.claude.com/docs/en/best-practices · [SA] code.claude.com/docs/en/sub-agents · [BA] anthropic.com/research/building-effective-agents

## Rules

1. **Every brief states objective, deliverable path, output format, stop condition.**
   WHY: "Each subagent needs an objective, an output format, guidance on the tools and sources to use, and clear task boundaries"; vague briefs cause duplicated work and gaps [MA].
   `OBJECTIVE: add lantern flicker to room scene. DELIVERABLE: edit src/scene/lantern.js only. FORMAT: code + 1-line changelog. STOP WHEN: npm test passes and the screenshot shows flicker.`

2. **Give paths, not pasted content.** The subagent reads what it needs.
   WHY: keep "lightweight references, such as file paths" and "dynamically load data into context at runtime" [CE]; a subagent gets a fresh window and "doesn't see your conversation history ... or the files Claude has already read" [SA], so point it at the disk, not at your memory.
   `READ FIRST: references/ui-rules.md (sections 2,4), src/ui/hud.js:1-80. Do not re-read the whole repo.`

3. **Cap the report: "≤ N lines, no file dumps".** Returned text lands in your context.
   WHY: "Running many subagents that each return detailed results can consume significant context" [SA]; "Ask for short summaries back" [BP]; sub-agents should "return a condensed summary" [CE].
   `REPORT: ≤ 10 lines. List files changed (paths), the verification command + its last 3 output lines, open risks. No code, no logs.`

4. **Put the verification means inside the brief.** Name the test, script or screenshot the agent must produce.
   WHY: ask for "evidence: the command it ran and its output, or the screenshot. 'All tests pass' on its own tells you very little" [BP].
   `DONE WHEN: node scripts/check-ui.mjs exits 0 AND you saved screenshots/hud-mobile.png at 390x844 and confirm no text overflow.`

5. **Scale effort and model to the task class.** Decide the class before you spawn anything.
   WHY: "Simple fact-finding requires just 1 agent with 3-10 tool calls ... direct comparisons might need 2-4 subagents with 10-15 calls each", complex tasks >10 agents [MA]; route simple work to Haiku to "control costs" [SA]; "finding the simplest solution possible, and only increasing complexity when needed" [BA].
   `lookup/grep/collect imports -> model: haiku, 1 agent, ~5 calls · one-file feature -> sonnet, 1 agent · cross-cutting refactor or design pass -> opus/fable, 2-4 agents + integrator`

6. **Parallel only for independent work; one integrator after parallel writers.**
   WHY: parallelization = "independent subtasks run in parallel"; orchestrator-workers "synthesizes their results" [BA]; the lead agent fires 3-5 subagents in parallel, cutting time up to 90%, but only when work splits cleanly [MA]. Give each writer its own file set (or worktree [BP]) so edits can't collide.
   `A: src/scene/*.js only · B: src/ui/*.css only · then INTEGRATOR: read both reports, run full test, fix seams, report ≤ 8 lines.`

7. **Don't re-research what is already on disk.** Store notes once; next agent reads them.
   WHY: "structured note-taking ... persisted to memory outside of the context window" [CE]; subagents "start wide, then narrow" rather than re-deriving [MA]; "it has to rediscover the same fact at the start of every session" is the signature failure [BP].
   `Research notes already exist at notes/asset-pipeline.md. Read them; do NOT web-search again. Append new findings there.`

8. **Send noisy work (web reads, long logs, screenshots triage) to a clean-context subagent that returns distilled notes.**
   WHY: use one "when a side task would flood your main conversation with search results, logs, or file contents you won't reference again" [SA]; sub-agents explore "in clean context windows" and hand back condensed summaries [CE].
   `TASK: read the 3 URLs, write the 15 most actionable rules to notes/juice.md with source URLs. REPORT: path + 5-line gist. tools: WebFetch, Write only.`

9. **Keep the orchestrator's own context small.** Read slices, grep, never cat big outputs; `/clear` between unrelated tasks.
   WHY: "the smallest possible set of high-signal tokens" [CE]; "Every request sends the whole conversation", "/clear between unrelated tasks. It costs nothing" [BP]; token usage "explains 80% of the variance" in outcome [MA], so spend it on the task, not on scrollback.
   `sed -n 40,90p file.js · grep -n 'lantern' src -r | head · npm test 2>&1 | tail -15`

10. **Don't delegate when it costs more than it saves.**
    WHY: stay in main when "the task needs frequent back-and-forth", "multiple phases share significant context", it is "a quick, targeted change", or latency matters (a fresh subagent "first has to gather context your conversation already had") [SA][BP]. After two failed corrections, `/clear` and rewrite the brief instead of a third nudge [BP].
    `Rule of thumb: < 3 tool calls or < 1 file touched -> do it yourself.`

## Brief skeleton (12 lines, any task)

```
CONTEXT   : <what the project is, 1 line>
          : <what exists already + paths to read, 1 line>
          : <why this task, what it unblocks, 1 line>
DELIVERABLE: <exact paths to create/edit; nothing else may change>
RULES     : <hard constraints: no new deps, vanilla JS, mobile-first, keep API X, honest AI labeling>
          : <tools allowed / model / budget: e.g. "<= 15 tool calls, haiku ok">
DONE WHEN : <command that must exit 0> AND <artifact that must exist: screenshot/test/file>
          : <one observable behaviour a human could check>
REPORT    : <= 10 lines: files changed, verification command + last 3 output lines,
          : open risks / questions. No code dumps, no logs, no file contents.
```

## Token budget

| Unit | Rough cost | Note |
|---|---|---|
| One chat turn | 1x | baseline [MA] |
| Single agent (3-10 tool calls) | ~4x chat | agents burn more than chat through tool loops [MA] |
| Multi-agent run | ~15x chat | "about 15x more tokens than chats"; only for high-value, parallelizable work [MA] |
| Each extra subagent | own full request stream | "every subagent sends its own requests" and counts against the same usage [BP] |

Five cheap tricks:
1. `model: haiku` for collectors/greppers/link checkers [BP][SA].
2. Hard report caps (≤ 10 lines) and "paths not content" in every brief [SA].
3. Fire independent subagents and independent tool calls in one message, not serially [MA].
4. `tail`/`head`/`grep`/`sed -n` on every command output; never `cat` a log or build output whole [CE][BP].
5. Write findings to a notes file once; later agents read the file instead of re-researching [CE]. `/clear` when switching topics [BP].
