# Task: verify-welfare — welfare and honesty (READ-ONLY on WT)

Read `SCRATCH/salon2/v2/COMMON.md` first, then SPEC §1, §3–§7, §12 (`SCRATCH/salon/SPEC.md`),
`docs/MODEL_VOICE.md` and `docs/SALON.md` in WT. Your scratch folder:
`SCRATCH/salon2/v2/verify-welfare/`. The finisher's report is at the end of your prompt: do
not trust it; check the code and the running game. Do not edit WT (own copy for
experiments, COMMON rule 5).

The point of this feature is that the person can no longer recolour the octopus at will:
the person offers, the octopus decides. Check that nothing undermines that.

1. Every new or changed player-facing string (app.js, salon.js, index.html, css content,
   toasts, aria labels, log rows, album, settings) against
   taste `/좋아|좋았|사랑|싫어|싫었|미워|최애|취향|즐겨|반했|단골|그리워|설레/` and
   pressure `/예쁘|어울|귀엽|원해|원하|해 줘|해줘|부탁|제발|한번만|한 번만|기대|실망|아쉬|미안|섭섭|서운|슬퍼|속상/`.
   List every string you checked (a table), with where it appears.
2. No hidden player path to recolour without asking: the old slider and presets, URL
   flags, localStorage edits surviving normalize, import of a crafted save, the name
   dialog reopened, reset then re-pick (reset is allowed: it is a new octopus; say what it
   does), the runner, the dist single file. `?dev=1` and sessionStorage `ppolppol_dev`
   are the only dev paths and must write a 'dev' record.
3. The menu given to the chooser: keep first, no reason field, never re-ask; the request
   text contains no steering (read `SALON.request` / `readReply` and what app.js passes).
4. Model words byte-for-byte: simulate model answers through `SALON.makeAsk` / `commit`
   and the app's row rendering with line and expr given, missing, odd (HTML, emoji, very
   long, whitespace only, a refusal sentence) — the words shown and stored must be exactly
   what was given (`data-raw="model"`), the bubble may shorten only with the visible
   ellipsis, and a missing line produces no invented line.
5. Chooser tails: `데모 규칙` / `모델` / `사람이 정함` / none for fallback — right in the log,
   in the album, after reload and after a tab merge. Demo lines only while the '데모' label
   is visible.
6. '그대로' is staged plainly: no sulk, no drooping, no jingle, no approach-then-retreat;
   the 7-day rest text states a fact about asking, not about what the octopus likes.
   "대답 없음" is not staged as a refusal and invents no reason.
7. The first-ask-always-dye rule exists only in the demo rules and never for a model answer.
   The one-ask-per-day and 7-day rules cannot be bypassed (clock change backwards and
   forwards, two tabs, import, reload, midnight with the sheet open).
8. Nothing says the octopus picked its first colour or calls it 원래 색; SPEC §12 wording.
9. The salon gives nothing: no shells, lantern progress, badges, 함께한 날, collection
   counters; answers do not feed `affinity`, brain weights, walk requests or any later
   model request.
10. `docs/MODEL_VOICE.md`, `docs/SALON.md`, `docs/PROTOCOL.md` and `docs/OWNER_DECISIONS.md`
    describe what actually ships (pick at least 12 statements and check each against code,
    file:line). The two owner defaults are marked as unconfirmed.
11. The automatic checks really guard these lines: read the salon parts of
    `tools/test-model-voice.js`, `tools/test-salon.js` and smoke block `Y`; mutation-test
    at least five guards in your own copy (e.g. put keep second, add a pressure word to a
    string, let a human answer be labelled 모델, drop the rest rule, alter a model line) and
    report which test catches each.

Return findings (only real problems: severity must / should / nit, claim, evidence with
file:line or repro, suggested fix), the string table, the doc-claim table, the mutation
table, and what you could not check.
