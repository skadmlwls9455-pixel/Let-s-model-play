I've written docs/SALON.md and updated the other nine docs per SPEC §10. I only touched `docs/*.md` and README.md, made no commits, and left COOK_PROTO.md and the main checkout alone. `npm test` passes with 0 failed (test-model-voice still matches the PROTOCOL.md patterns it checks), the font check reports `stale: none`, and the added lines contain no emoji or scratch paths.

The docs describe part 2 from the spec, because the app code was still being written when I finished. If the part-2 code ends up different on any of these points, the docs need a small follow-up:
- **Tap and nap during staging:** no tap line, no wake-up, and the nap waits until staging ends.
- **Sound calls:** guarded as `window.AUDIO && AUDIO.on && AUDIO.on('salon', …)`, using the §3.9 act names.
- **Anchor fallback:** before lantern 2, the app turns the `salon` anchor into `center`.
- **Runner colour:** `js/runner.js` reads `octopus.color` first.
- **IDs and dev flag:** the new elements are `#btn-salon` and `#salon-sheet`, and the dev controls appear only under `DEV_EXPLICIT`.
- **Smoke test:** the new scenario is called "미용실"; I didn't guess its letter.

PROTOCOL.md is normally edited only by the main session (ROADMAP rule 5). I edited it because your brief asked for it, and labelled the new section as the plan for when the MCP server exists.

**Changes per file**
- **`docs/SALON.md` (new, about 916 lines):** the spec as the repo design doc.
  - Section numbers are unchanged, so references in the code (§2.1, §2.2, §3.1, §8.2, §9.1, §9.4) still point to the right places.
  - A status table near the top says what part 1 (983d436) shipped and what part 2 adds, and each heading carries a (1부)/(2부) tag.
  - Numbers in the body now match the shipped code, for example the mirror at x −1.48 with its bottom at 0.45 and top at 1.27.
  - New §14 lists where the code differs from the spec. Examples: bottles can't be picked without a readable date, an unknown chooser can't change the colour, `offerName` is always rebuilt from the colour, and empty text counts as unreadable.
  - The two owner questions are marked 기본값 (주인 확인 전).
  - Scratch paths are gone; it just says the evidence was kept outside the repo.
- **`docs/OWNER_DECISIONS.md`:** a new section "주인 답 (11-08 밤: 문어 색은 처음 한 번 · 미용실에서 문어에게 묻기)" with the owner's words verbatim, the decision, and the two open questions (mirror corner in the attic; 7-day rest) marked 기본값 (주인 확인 전). Five SALON rows went into the existing defaults table.
- **`docs/DESIGN.md`:** a top note for the 11-08 night change, plus edits to §4 (lantern-2 row), §7.1, §7.5, §7.8, the §8 schema with a note on the colour source, §10 files, §12.3 DOM ids, §13.1 scene contract, the §14 row (색 고르기 becomes 미용실) and one line in §16.1.
- **`docs/SCENE.md`:**
  - The `settings.octColor` line now says the colour comes from `octopus.color`.
  - Smaller additions: `setColor` still/wiggle, `ponder`, `portrait`/`portraitURL` with `color`, the `salon` anchor, the mirror in the raycast list and `hotspots`.
  - A new section "미용실 거울 코너" covers the geometry table, timings, beat events, tap order, draw calls (76 → 82 → 88, 150 or under, 27 shader programs unchanged) and the 2D version.
- **`docs/MINIGAME.md`:** the runner colour reads `octopus.color`, with `settings.octColor` as the backup copy.
- **`docs/MODEL_VOICE.md`:** the four salon auto-check lines. Each one names the test-salon section that covers it; I wrote these in words instead of ✅ marks.
- **`docs/PROTOCOL.md`:**
  - The §3 tool table gets `ppolppol_salon_next` and `ppolppol_salon_answer`, and the `look_room` row gets `salon?`.
  - New §5 covers: the request, fixed context, reply table, the never-re-ask rule, waiting and human approval under sampling, `look`, and what the server must keep to.
- **`docs/ROADMAP.md`:** a 미용실 row in the "다음 물결" table.
- **`docs/DELEGATION_BRIEFS.md`:** card 21 (scene, done in part 1), card 22 (app, part 2, done by the main session) and card 23 (sound). Card 23 carries the 'salon' hook table, since audio/README.md belongs to the sound session. Two rows went into the hand-out table; card 23 is handed out after part 2 is committed and the kitchen job's audio.js work is merged.
- **`README.md`:** one 미용실 feature line, plus a short note in the settings bullet saying the colour is now changed in the salon.