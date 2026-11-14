# Lane F "honest" — report (11-15)

## Conclusion

All five items from `wip/round3/briefs/fix-honest3.md` are done, plus the two 11-15 defaults from `F-honest.md`:

- **C3 b — no joy squeak.** The 4th quick pet no longer plays `pet_happy`. The squish and stroke sounds stay.
- **C4 a — '-ㄹ래' decisions come back.** Three decision lines are '-ㄹ래' again, each one something the code really does. The facts check now lets '-ㄹ래' through and catches wishes plus the recheck's H1 words.
- **C6 b — the usual face.** Every face that code picks for text it wrote is now `idle`. Sleep stays, because it is a state. A reaction the model or a person chose keeps its face.
- **Q4 b — demo mood words hidden.** When the demo rule chose the reaction, '우쭐' and '덤덤' are not shown anywhere. Saved data and the protocol are unchanged.
- **Album empty text.** It is now a fact in the house voice.
- **Old hints (11-15 default).** The '힌트: …' line of old walks is hidden. Saved data keeps it.
- **Mood sounds (11-15 default).** Mood sound effects play only for a reaction the model or a person chose.

The independent check found **0 must and 1 should**: the departure crouch used the half-lidded `calm` face, even on turns that end at home. It is fixed and has a check.

## Changes

### Sound — `js/audio.js` and the audio catalogue

- **`onPet`:** the `if (petN === 4) play('pet_happy', …)` call is removed. A dated comment says why.
- **`audio/soundboard.html`:** its stroke chip loses the same call.
- **New `reactionGiven(trip, e)`:** it asks whether the model or a person chose the reaction. It follows the same rule as `reactionOf` in app.js: `reactionBy` first, then `trip.by` (`mcp`/`human`).
- **`onRow` `wrap_up`:** plays `mood_*` only when `reactionGiven` is true. The lullaby rule (D-1) and every other sound stay as they were.
- **Description updates** for `pet_happy`, now saying it is not used (11-15, owner C3 b) and keeping the old description:
  - `audio/src/sfx.py`
  - `audio/src/manifest.d/sfx.json`
  - `audio/manifest.json`
  - `audio/CATALOG.md`
  - `audio/docs/research/04-sfx-and-ambience.md`
  - `docs/TUTORIAL.md`

### Display — `js/app.js`

**`reactionOf`:**
- `word` is now `''` when `by === 'demo-rules'` and the reaction is '우쭐' or '덤덤'. `r` is unchanged, so the awake gap, the lullaby and saved data are unaffected.
- Every display site goes through this one place: the wrap-up bubble, the wrap-up row, `reactionSayHTML` (inspect, the poster sheet) and `reactionKV` (diary, album).
- Non-given lines that mention '힌트' are dropped when hints are hidden (see `hintShown`).

**New `reactFace(rx)`:** returns the reaction's face (`REACT_EXPR`) only when `rx.given`; otherwise `idle`. It is used by:
- the wrap-up row (was `REACT_EXPR[r] || 'calm'`);
- the scene state (was `octState(폴짝|우쭐 ? 'happy' : 'idle')`);
- the bubble kind (demo → `'say'`, which also sets the voice blips to normal).

**Face sites changed to `idle`** (before → after):

| Site | Before |
|---|---|
| return row | `calm` |
| remember row | `curious` |
| stay_home row (a nap keeps `sleep`) | `calm` |
| empty_turn row (the octopus is not asleep in an empty turn) | `sleep` |
| boot "네가 없는 동안 다녀왔어 / 집에 있었어" rows | `calm` |
| memo greeting | `calm` |
| `setGreeting` default and the first self-introduction | `happy` |
| `selfWake` | `curious` |
| think bubble | `curious` |
| tap '응?' (bubble shape and sound kind unchanged) | `curious` |
| `souvenirTap` | `happy` |
| window tap '비가 와' | `calm` |
| gift box "looking" | `curious` |
| gift box answer "yes" | `happy` |
| name dialog portrait | `happy` |
| `STATE_EXPR.anticipate` (also in `js/scene3d.js` and `js/scene2d.js`, after the checker's S1) | `calm` |

**Old hints:**
- New `hintShown(trip)` returns `givenTrip(trip) || DEV_EXPLICIT`.
- When it is false, these are not drawn: the depart row's '힌트: …', the `hint.note` under it, and the diary's 힌트 kv including its follow mark.

**Album empty text:** '아직 쪽지는 없어. 집에 있는 날 하나 써 둘게.' → '아직 쪽지는 없어. 집에 있던 날마다 한 장씩 생겨.'

### Lines — `js/world.js`, `js/brain.js`

The world.js / brain.js pairs stay identical.

**Restored '-ㄹ래' lines** (each is true by the code):

| Line | Now | 11-14 version | Why it is true |
|---|---|---|---|
| 졸림 `when.long` | '많이 걸었어. 담요 속으로 들어갈래' | '많이 걸었어. 이제 담요 쪽으로 갈게' | After the wrap-up the octopus walks to the blanket and sleeps sooner on 졸림 |
| `nextNone` (world and brain) | '내일은 어디로 갈지 자고 나서 정할래' | '내일 갈 곳은 아직 안 정했어' | The next place is picked at the next invite. The checker calls "자고 나서" roughly true, since an invite can come during the awake gap before the nap (nit) |
| `homeStay` (also the app.js fallback) | '오늘은 집에 있을래.' | '오늘은 집에 있어.' | The rule really chose home. The old motive tail '그냥 그러고 싶어서' stays out |

**Kept as facts** (each '-ㄹ래' would promise something the code never does):
- brain `failed`: '…이름만 기억해 둘래' and '…다음에 다시 가 볼래'.
- `hintNote`: '…힌트는 다음에 찾아볼래'.

**Warmth pass** (before → after):
- 덤덤: '조용히 다녀왔어. 그게 다야' → '조용히 갔다가 조용히 돌아왔어'.
- 덤덤 home: '이번엔 집에 있었어. 그게 다야' → '이번엔 집에 있었어. 다락에서 지냈어'. A home day is always in the attic.
- brain fallback `swap_posters` detail: '왼쪽 걸 오른쪽으로. 그게 다야.' → '맨 끝 두 장의 자리를 맞바꿨어.' This matches world.js and what app.js does.

### Docs

- **`docs/OWNER_DECISIONS.md`:** new section "주인 답 (11-14 둘째 …)" covering C3, C4, C6, question 4, the two 11-15 defaults and the album text. The last sentence of the 11-14 section is replaced with the decision.
- **`docs/DESIGN.md` §15.2:** new paragraph on row and scene faces. The §5 example is now '오늘은 집에 있을래.'.
- **`docs/DIALOGUE_UI.md`:** the homeStay row, the souvenir face and the first-greeting portrait are updated.
- **`docs/MODEL_VOICE.md`:** new line for the walk wrap-up (face, mood sound, hidden words).
- **`docs/SCENE.md`:** anticipate's face changed in three places.

## Decisions (where the brief left a choice)

1. **`pet_happy` files** stay in the manifest and the export. Only their descriptions changed. This is the smallest change, and `test-audio`, the manifest checks and `test-export` stay green. The cost is 2 tiny unused files (0.15 s each).
2. **Who counts as "the demo"** for hiding 우쭐 and 덤덤: `reactionBy` is 'demo-rules', or a demo trip without `reactionBy`. Legacy (v1) trips are left as they were, because who chose them is unknown.
3. **Demo 졸림 face:** `idle` too (not `sleepy`). The word '졸림' still shows, and the octopus really sleeps sooner.
4. **The hop with 폴짝:** the scene's `happy` state, which carries the hop, now goes only with a given reaction. A demo 폴짝 has no hop. One rule for state and face was simpler than splitting them.
5. **Empty turn row:** `idle`, not `sleep`. Nothing in an empty turn puts the octopus to sleep.
6. **Old hint display:**
   - Hidden by `hintShown = givenTrip || DEV_EXPLICIT` rather than by date. A player has had no hint box since 11-10, so for players this equals "walks before 11-10".
   - A hint the model or a person gave is their own text and stays (hard line 2). The explicit dev mode (`?dev=1`) keeps the old rule for testing.
   - The follow / ignore / drift marks are hidden too. Without the hint text they mean nothing.
   - Also hidden: the hint's `note` and a demo reaction line that talks about the hint ('네가 흘린 힌트, 끝까지 따라갔어').
7. **`DECISION_OK`** in test-brain stays, as documentation plus a check that the lines still exist. It no longer acts as an allow-list.
8. **H2 nit (`portExact` order):** not done. The brief marks it optional.
9. **The name-dialog portrait** was changed to `idle` too. Code picks it, and it was a happy face.

## Left alone (listed for the owner / lead)

- **Owner decisions, unchanged:** the salon faces (`salonRun.face`, `SAL.joy`) and the kitchen stickers.
- **Not in this brief's list:**
  - The play room's choreography faces (`js/play.js` `kit.expr('curious' | 'happy' | 'calm' | 'sleepy')`, scene3d `joy` and `pop`).
  - The outside-peek faces in `js/scene3d.js` ~3992 / 3996: read → curious → happy "찾았다", failed → calm, none → sleepy.

  These are action choreography rather than faces on code-written rows. The "찾았다 → happy" one is the closest to a feeling claim; worth an owner look.

## Player-facing lines (before → after)

| Where | Before | After |
|---|---|---|
| album, 쪽지 empty | 아직 쪽지는 없어. 집에 있는 날 하나 써 둘게. | 아직 쪽지는 없어. 집에 있던 날마다 한 장씩 생겨. |
| home-day row (demo) | 오늘은 집에 있어. | 오늘은 집에 있을래. |
| 졸림 line after a long walk | 많이 걸었어. 이제 담요 쪽으로 갈게 | 많이 걸었어. 담요 속으로 들어갈래 |
| tomorrow memo, none | 내일 갈 곳은 아직 안 정했어 | 내일은 어디로 갈지 자고 나서 정할래 |
| 덤덤 line | 조용히 다녀왔어. 그게 다야 | 조용히 갔다가 조용히 돌아왔어 |
| 덤덤 home line | 이번엔 집에 있었어. 그게 다야 | 이번엔 집에 있었어. 다락에서 지냈어 |
| brain fallback swap detail | 왼쪽 걸 오른쪽으로. 그게 다야. | 맨 끝 두 장의 자리를 맞바꿨어. |
| demo wrap-up (우쭐 / 덤덤) | '우쭐 · …' / '덤덤 · …' | only the fact line (no row if there is no line) |
| old walks | '힌트: 모자의 역사' · '힌트 모자의 역사 · 따라감' | the plain depart line, no 힌트 kv |

The font check (`python3 tools/subset-fonts.py --check`) reports stale: none. No new glyphs.

## Checks added or changed

- **`tools/test-brain.js` 'demo lines say facts':**
  - `CLAIM_RX` drops the '-ㄹ래' group and adds 좋 (all forms), 만족, 다행, 흐뭇, 아늑, 들뜸 (들떴 / 들뜬 / 들뜨), 즐기, 안심, 설렘, 외롭, 그리움, 쓸쓸, 짜릿, 부러움 (부러워 / 부럽 / 부러웠) and 바라. 바라 excludes 바라보- and 해바라기; 부러워 does not match 부러졌.
  - The '갈래' allow-list entries are removed, since they are no longer matched.
  - New unit checks: 6 strings that are not claims, 21 that are, and that homeStay is the plain decision.
- **`tools/test-audio.js`:** new group 11, runnable alone with `AUDIO_ONLY=11`. It covers:
  - 6 hand-speed pets: squish and strokes 1–5, no `pet_happy` played or requested.
  - Demo-rules reactions through the hook: no `mood_*` played or requested.
  - A real demo trip with the plan forced to 폴짝: no `mood_*`, while its other sounds play.
  - A model-chosen 덤덤 through the replay path: `mood_deomdeom` played and requested.
- **`tools/smoke.js`:**
  - A: every demo-trip portrait is `idle`.
  - H: the memo portrait is `idle`.
  - W: the first greeting is `idle`, and waking is `idle`.
  - M3: a raw model reaction gets `idle`.
  - M5: demo, with the word hidden for 우쭐 or 덤덤.
  - **M6 (new):** forced demo 우쭐 / 덤덤 / 폴짝 / 졸림 → word shown or hidden in the bubble, log, diary and inspect; portrait `idle`; no happy, calm, sleepy or curious scene face or `happy` state.
  - **M6b (new):** the anticipate face is `idle`.
  - **M7 (new):** a model-chosen 우쭐 shows its word, a `happy` portrait, a `happy` scene face and the `happy` state.
  - **P-2 (new):** a seeded pre-11-10 hint walk at `?dev=0` shows no '힌트', hint text, follow mark or '우쭐' in the log, album diary, receipt or inspect. The saved hint, reaction and line are unchanged. The 쪽지 empty text is the new line.
  - Q: the gift faces are `idle`.

## Suites

- `npm test`: all green.
  - check-world OK
  - test-brain 572/0
  - test-model-voice 26/0
  - test-runner 568/0
  - test-api 225/0
  - test-cook 192/0
  - test-salon 235/0
  - the rest green
  - test-export 46/0
- Font check: stale none.
- `tools/test-audio.js`:
  - Full run (before the group 11 fixes): 129/2. Both failures were in my new group 11: 6 pets sent at the same instant are merged by the sound group gap, and `return_home` is not played on that path.
  - After the fixes, `AUDIO_ONLY=11`: 6/0.
  - Groups 1–10 were all ok in that full run.
- Smoke `A,M,P,W,H,T,Q` (the letters covering the greeting, wrap-up rows, album, petting (A-2) and the tap lines), final code: **261 passed, 0 failed**.
  - An earlier run on the first commit, under heavy load with 3 browser jobs, had 1 T failure: "톡마다 몸이 작게 톡", where the octopus was already in its nap. It did not recur once load was normal, so I take it as load-only.

## Screenshots (360x740, `wip/round4/shots/f-honest/`)

- `before-log-greeting.png` / `after-log-greeting.png`: the greeting row. Before, a smiling portrait; after, the usual face.
- `before-log.png` / `after-log.png`: a demo wrap-up with the reaction forced to 우쭐. Before: '우쭐 · …' with a smiling portrait, plus the 귀가 calm and 기억 curious rows. After: the line only, every portrait `idle`.
- `before-album-notes.png` / `after-album-notes.png`: the album's 쪽지 empty text.

## Independent check

A fresh agent played the change at 360x740 and 320x568 with real touch, an old-hint save and sound over http. Result: **0 must, 1 should.**

- **S1, fixed:** the departure crouch (`anticipate`) showed half-lidded `calm`, including on stay-home turns. It is now `idle` in app.js, scene3d.js and scene2d.js, with a smoke check (M6b).
- **Confirmed by the checker:**
  - The hidden words are absent everywhere, including `#scene-desc`, the toast and `body.innerText`.
  - Model choices keep their word and face.
  - The old-hint save is byte-identical after the reload.
  - No `audio/` request before the sound gesture; no `mood_*` for demo reactions; `mood_*` for model reactions.
  - The restored '-ㄹ래' lines are true. "자고 나서" is roughly true (nit).

## Outside my area

Three lines, each a one-line map change on the face lane:
- `js/scene3d.js` ~1865: `STATE_EXPR.anticipate` removed.
- `js/scene2d.js` ~343: same.
- `js/app.js` `souvenirTap` and `windowTap`: face argument only.

## Not verified

- The 2D fallback was not played by hand. The scene2d change is a one-line map.
- The loft and play room during a wrap-up.
- Dev-mode human reactions, beyond the existing M4 check.
- The full `npm run test:slow`: only the smoke letters above and test-audio were run.
- No mutation tables, per the F brief.
