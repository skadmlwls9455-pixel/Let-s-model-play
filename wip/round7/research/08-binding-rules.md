# 08 — Binding rules for the rebuilt cooking game (project documents and tests only)

Research agent 08, 2026-11-21. No web research. Line numbers are those of commit `f17d1df` (the lead merged the other
branch while I was reading; that merge touched only `js/scene3d.js`, `tools/test-light.js`, `.gitignore` and one wip file).
Other lanes were already editing the working tree when I finished (uncommitted changes in `js/app.js`, `tools/smoke.js`,
`index.html`, `css/style.css`, `js/scene3d.js`): the lines I cite in `js/app.js` and `tools/smoke.js` still matched, except
the smoke scenario list, which had moved from line 8078 to 8103. I edited nothing except this file and ran no project test.

Source short names: **OD** `docs/OWNER_DECISIONS.md` · **HO** `HANDOFF.md` · **CP** `docs/COOK_PROTO.md` · **CS**
`docs/COOK_STICKERS.md` · **ME** `docs/MEAL.md` · **MV** `docs/MODEL_VOICE.md` · **UA** `docs/UI_ART.md` · **C5**
`wip/round5/cook-spec.md` · **ES** `wip/round6/eat-spec.md` · **CM** `wip/round6/briefs/COMMON.md` · **AU**
`wip/round6/audit-11-18.md` · **SK** `.claude/skills/cozy-web-game/SKILL.md` · **R7** `wip/round7/README.md` · **BR**
`wip/round7/briefs/RESEARCH.md`. "(unverified)" = I read the claim in a document but did not open the code or test it names.

## 0. What changes the build (read this first)

1. **The octopus is usually not there when a dish is finished.** The kitchen is "what you do while waiting for the octopus"
   (OD:21, CS:151), a sleeping octopus is never woken, and the call chip is simply not shown when it cannot come (ES:479-485,
   ME:117). So the end screen cannot be a bare "call the octopus": in the most common case there is nobody to call. It
   needs a button that works without the octopus ("to the table"), and a calling button may show only when a call is
   really possible (section 3, C2; the lane briefs do this, see W1 and W13 in section 0b).
2. **Three pins fix today's three dishes byte for byte**: `TUNE_HASH 2827089308` (`tools/test-cook.js`, C5:42, ES:109),
   `tuneOf` 1403436335 and 3381042548 (CP:63), and `COOK_TUNES` in `js/app.js:4162`. Finer steps or new dishes change them.
   That is allowed only as a deliberate change that keeps the save rule: an old pot moves to `potOld` byte-identical, book
   lines and meal records stay, unknown recipe ids are kept (CP:84, CP:227, ME:78).
3. **Old dishes do not vanish from saves when the dish list changes.** `S.user.table` may hold a waiting 해초전 at deploy
   time, `S.user.meals[]` holds eaten ones for ever, and the diary draws a meal row only "when this build knows the dish"
   (ME:98). Retired recipe ids therefore need to stay known to `js/meal.js` (name + effect) and drawable on the table, or
   old diary rows and a waiting dish silently disappear (S5, S6).
4. **Zero visible characters includes digits and pixel-drawn letters.** The tests only read DOM text (`tools/test-cook-live.js`
   N1: text `''`, `title` 0, `::before/::after` empty, "no digits in the kitchen at all", line 1086), so a recipe book with
   page numbers, step numbers, a lettered cover or "1/3" is a rule break whether or not a test catches it (CP:13, C5:48).
5. **The word scans are file lists, and new files are outside them until someone adds them.** `tools/test-cook.js:780`
   scans exactly five kitchen files; `tools/test-brain.js:1864-1879` scans `js/world.js`, `js/brain.js`, `js/app.js`,
   `js/salon.js`, `js/play.js`, `js/meal.js`. A new `js/cook-book.js` or `js/cook-steps.js` is scanned by nothing (T10).
6. **Every Korean string constant in `js/app.js` and `js/meal.js` goes through the feeling-word regex**, aria-labels
   included (`CLAIM_RX`, `tools/test-brain.js:1808`). Innocent labels fail: anything with 싶, 좋, 맛있, 기분, 재미, 궁금, 충분,
   다행, 반가 … (section 4.3). The kitchen files have a second, shorter list that also bans 성공, 실패, 점수, 완벽, 최고, 잘했,
   탔, 등급, 메달 (section 4.2).
7. **Result data may not carry a key containing `star`, `time`, `best`, `rank`, `fail`, `grade`, `score`, `percent`,
   `accuracy` or `duration`** (`tools/test-cook.js:609`). `start`, `startedAt`, `timer`, `stars` all match.
8. **Vibration is an owner list, not a design lever**: kitchen tap · flip · cut only; nothing for the bell, the plate, the
   tray, the table, eating or effects (OD:200, CM:127, ES:115-116). New gestures need the owner's word or must reuse those
   three patterns at counted moments.
9. **Removing the step strip also removes a tested state display** (`.ck-strip`, `T.strip` in `tools/test-cook-live.js:172`,
   four more references there and one in `tools/test-cook-stickers-live.js`). A resumed dish must now show "what is already
   done" on the food itself. The lesson generalises: the strip was drawn on the same paper chip as the real buttons, so it
   read as a button. Nothing non-interactive may use the paper-chip frame again.
10. **Sound for finer steps already exists and is already credited**: `cook_stir` (3 variants), `cook_clink`, `cook_simmer`
    (loop) and `cook_lift` sit unused in `foley/` (CP:271, CP:419); `cook_place` (2) is used only by the fruit skewer's taps
    (CP:63). Any new sound file needs a licence check and a credits line; a synthesized sound (like the ding) needs neither
    (ES:44-46).
11. **Round 6's rule for tests applies to every replaced check**: "Never weaken a check; a removed check is replaced by
    one that guards the same intent where it now lives" (ES:733). The tray, the again chip and the strip are each pinned by
    name in several suites (section 2).
12. **The 11-21 request is not yet in `docs/OWNER_DECISIONS.md`** (no "11-21" line there). Its written forms are BR §1-1c,
    R7 (A1-A6, E1-E5) and, since this evening, the lane briefs (section 0b). R7 says the lead sent the owner 24 questions;
    the file that should hold the answers (`wip/round7/briefs/ANSWERS.md`) did not exist when I looked.

## 0b. Checked against the lead's round-7 lane briefs (they appeared while this report was being written)

Read in the working tree, uncommitted: `wip/round7/briefs/COMMON.md` (223 lines), `K.md` (122), `T.md` (73), `A.md` (46),
`SPRITES.md` (first 30 lines). `K.md:5` names this report as reading for the kitchen lane. `ANSWERS.md`, which the briefs
tell every lane to read (`COMMON.md:27-28`), was not in the folder when I looked.

**Already settled by the briefs** (so no longer open in section 6): the book lives inside the kitchen frame (`K.md:26`); a
pot with a finished step still resumes straight into cooking and skips the book (`K.md:29-30`); the game-side tray,
`COOK_TUNES` and `cookPot` go (`T.md:28-29`); two end buttons, the calling one only when `ctx.canCall`, no "again"
(`K.md:97-101`); the game checks again at the moment of the call and does nothing more if the octopus cannot come
(`T.md:37-38`); the three old recipe ids stay, `gyeran` and `cake` are added with effects `bubble` 방울 and `confetti` 색종이
(`COMMON.md:139-140`, `T.md:47-49`); old notebook lines must still read and draw (`K.md:77-78`); new steps may use the
existing buzz names (`COMMON.md:62-63`); commit messages end with only a `Claude-Session:` line (`COMMON.md:70-72`); checks
that assert old behaviour are rewritten "without weakening what they guard" (`COMMON.md:207-208`). Round 7 also checks one
desktop size, 1280 × 800 @1 (`COMMON.md:196`).

**Watch list: where a brief touches a standing rule or a test pin.** None of these is caught by a test today.

- **W1 · The calling button's name can be read as promising the answer.** `K.md:98` gives the `aria-label` '문어 불러 같이
  먹기' ("call the octopus and eat together"). The octopus may answer "watch" (OD:164; '{이름}{은/는} 보기만 하기로 했어.',
  ME:105), and the existing chip says only '{이름} 부르기' (ME:108). Read as the player's wish the label is harmless; read as
  what will happen it names an outcome the octopus has not chosen, which hard line 1 guards ("or that it read, chose or
  said something it did not", `COMMON.md:48-50`), and it makes a plain "watch" look like a broken promise (H5). The
  cautious form is '문어 부르기' (the kitchen cannot know the name, S2; '문어' is the nameless fallback, `js/meal.js:60`). I
  ran both labels through the kitchen word list, `CLAIM_RX` and KS X 1001 with a small script of my own: all pass, so only
  a reader can judge this. The lead should rule.
- **W2 · "Skill shows in how good the result looks."** `K.md:45-46`: "doneness band, neat cuts → steam, glints and garnish
  on the reveal". Two standing rules: doneness is a choice, not right or wrong ("굽기는 고르는 것이지 맞고 틀림이 아니다", CS:153;
  "굽기 셋 다 좋은 결과", CP:330), and a cut lands exactly on the guide whatever the hand does (OD:160, CP:78). If golden gets
  more glints or garnish than soft or crisp, or a wobbly stroke gets a duller plate, the reveal is a grade without a
  number. Safe reading: the dish shows what the player did (three different looks, as `dish.jeon` frames 0-2 in
  `SPRITES.md:22`), never a better and a worse version; stickers and sounds stay the same across bands (CS:79-80).
- **W3 · "A half-made pot from the old build may be dropped quietly"** (`K.md:78-79`). The engine does not drop it: it moves
  it to `potOld` byte-identical, newest first, at most 4 (CP:227-228), and `COMMON.md:66-68` says the kitchen key keeps
  everything it had. Keep the move and the L9 check; "dropped" must not turn into a delete.
- **W4 · 과일 꼬치 becomes locked by default** (`COMMON.md:134`: defaults `jeon`, `gyeran`, `jumeokbap`). Since the round-6
  deploy (11-19) every player could cook it. `recipesUnlocked()` adds "any recipe already in the kitchen's notebook" (`COMMON.md:145-146`,
  `T.md:57-58`), which keeps it for a player who finished one. A player who never finished one, the owner perhaps included,
  will find a dish they saw on the tray now shown as a locked silhouette. Whether that is wanted is an owner question.
  Side effect to know: the standalone page unlocks everything (`K.md:39`) and shares the notebook key with the game (CP:17,
  CP:291), so cooking a cake at `/cook.html` unlocks it in the game.
- **W5 · Locked pages** (`K.md:36-37`: dark silhouette, `lock.cup`, "a small shake"). No counter, no "N more", no days-left
  (OD:18-19): none is planned, good. Still needed: an `aria-label` and `aria-disabled` for the locked page (new words go in
  VOCAB), a still cue under reduced motion where the shake is off (F6), and no buzz or sound for the refusal (K14, F3).
- **W6 · "Bookmark tabs on the page edge" and sideways swipes** (`K.md:34`). The stage ignores a non-mouse press that starts
  within 24 CSS px of the left or right screen edge (`js/cook.js:1421`, P7): that band is the OS back gesture, and "back"
  closes the kitchen (CP:297; the Android gesture itself is still an unverified phone check, HO:28). Tabs must sit at least 24 px inside and be ≥ 44 px (A2); the swipe
  cannot be the only way to turn a page (it is not: tabs and arrow keys).
- **W7 · The book is a new screen of the frame**, so N1 has to cover it (text `''`, `title` 0, no pseudo-element content,
  no digit). The dialog needs a name there: '요리 수첩' is already in VOCAB; '요리 고르기' (the tray's label) is not. N1's pin
  "the dialog is named 해초전" (`tools/test-cook-live.js:1085`) becomes a per-screen check. '요리 수첩에 넣었어' is still banned
  from the kitchen files (`tools/test-cook.js:801`).
- **W8 · One dish, two name lists.** `WORDS.dish` is K's, `MEAL.DISHES` is T's. `T.md:48` keeps '해초전' · '주먹밥' ·
  '과일 꼬치' and adds '계란말이' · '딸기 케이크'; `K.md:63-65` heads its rows '해초 부침개' and '삼각 주먹밥'. If those become
  `aria-label`s the kitchen and the table call the same dish two names. Contract C2 fixes ids and effects, not the Korean
  names.
- **W9 · New code files fall out of three checks.** `K.md:20` suggests `js/cook-steps.js`. The "no DOM, storage, timers,
  Date or clock in the simulation" check reads only the top half of `js/cook.js` (`tools/test-cook.js:770-779`); the word
  and `Math.random` scans read five named files (`:780`); the haptics test reads `js/cook.js` for buzz names (CP:374,
  unverified). Simulation code in another file leaves all three unless the file is added to each. Likewise lane A's
  `js/cook-sprites.js` (its own test checks palette and size, `A.md:19-21`; nothing checks it for `Math.random`) and T's
  `js/recipes.js` (the honesty scan list, `tools/test-brain.js:1874`, if it holds player-facing Korean).
- **W10 · Sound act names that are already taken.** `K.md:92-93`: "add at most three synthesized ones: stir, pour, scrub".
  `foley/manifest.json` `map.cook` already maps `stir` → `cook_stir`, `place` → `cook_place`, `simmer` → `cook_simmer`, and
  `lift`, `clink`, `back`, to recorded and already credited sounds (I read the file); `pour` and `scrub` are free. Sending
  act `stir` plays the recording unless `js/audio.js` catches it first, as it does `ding` (`js/audio.js:1155`). Choose one
  on purpose; the recordings cost nothing new and `drag` could use `place`.
- **W11 · Stickers follow the sound acts.** Every sound act is handed to the sticker engine (CS:72), which already has
  `stir` → 휘휘 (every third), `place` → 솔솔, `simmer` → **맛보기** `taste`, `eat` → 냠 · 맛보기
  (`js/cook-stickers.js:261-266`). `taste` is the picture the owner said reads as "it tasted" (CS:153): do not send
  `simmer` for the syrup or the oven without changing that rule. Add every new act name to the `KITCHEN` list of the
  feeling-face check (`tools/test-cook-stickers.js:125`), or the check says nothing about them.
- **W12 · `pour` is a 2.4 s hold with a sound loop** (`K.md:53`). A long press is where phones show a magnifier or a menu
  (an unverified phone check, CP:408); the loop must stop on `quiet` (step end, hidden tab, close) like the sizzle
  (CP:269); nothing starts with sound off (F1); the verb button must finish the pour without a hold (A1).
- **W13 · `ctx.canCall` is a snapshot from the moment the kitchen opens** (`T.md:30-32`). Cooking takes a while; the
  octopus can come home or fall asleep meanwhile. `T.md:37-38` makes a stale "yes" harmless. A stale "no" hides the calling
  button although a call would work, and a stale "yes" shows an octopus picture for a call that will not happen. A `ctx`
  update at the `result` moment would keep the button true; the contract has no such message.
- **W14 · The 900 ms guard.** Today the end chip appears at 450 ms and ignores presses until 900 ms (CP:91, CP:164), so the
  last cooking gesture cannot fall through. Both new buttons need it, the calling one most. Keyboard order becomes close →
  button → button; which one takes focus at 450 ms should be chosen (the non-calling one is safer against a stray Enter).
- **W15 · Progress dots** (`K.md:88-90`): drawn shapes only (no '•' character, no CSS `content`, no digit: N1), never on a
  paper chip, and not under the larger stickers or the bell (K8).
- **W16 · Stickers "larger on every phone size"** (`K.md:106-107`). OD:175 is an owner sentence that they sit only in the
  top wall corners and do not show at 320 × 568; `K.md:108` keeps "never cover the food or the hand". Larger is the new
  wish; showing them where they would cover the food is still excluded.
- **W17 · `bake`** (`K.md:57`): the ding is once per step, only with sound on, with no vibration, and turning crisp is
  silent (K9). For `flip` "a tap never flips" protects against a stray tap (CP:77); for `bake` a touch takes the food out,
  so a double tap on heat-on ends the step at "soft". Soft is a valid dish, so no rule breaks; the 250 ms gate (CP:90) is
  the only guard.
- **W18 · Where game names may be written.** `COMMON.md:64-65` allows them in `wip/` only; rounds 5 and 6 allowed docs.
  `docs/COOK_PROTO.md` §11 and §13 name commercial games today and K will rewrite that file.
- **W19 · Pins that sit in the other lane's file.** The tray pins and the `COOK_TUNES` = `COOK.tuneOf` check are in smoke Z,
  which T owns (`T.md:24`, `T.md:66`); `tools/cook-shots.js` is K's, and its embed capture walks through the tray today
  (ES:344-345).

## 1. Checklist of standing rules

Each row: the rule, where it comes from, how it is checked. Tests I did not open are marked.

### 1.1 Owner decisions on the kitchen (rounds 5 and 6)

| # | Rule | Source | How it is checked |
|---|---|---|---|
| K1 | The kitchen is a portrait full-screen close-up: the working surface fills the screen edge to edge, a step change slides the view sideways to the next station, a ghost hand shows the gesture. | OD:192, OD:198, C5:8 | N2/N3/N5 in `tools/test-cook-live.js` (fit table, food ≥ 69 % of the width, slide frames) (N2-N5 bodies unverified, described in CP:366-367); eyes on the shots (C5:664-673) |
| K2 | No visible words anywhere in the kitchen: no glyph, digit, emoji or symbol; close and every action are picture buttons; names live only in `aria-label` and the hidden aria-live line; no `title` attributes. | OD:192, C5:9, C5:48, CP:13, CP:100, ES:111-114 | N1 (`tools/test-cook-live.js:1040-1087`); smoke Z (`tools/smoke.js:7684`: text `''`, titles 0, credits link 0); `test-cook-dishes-live.js` "글자 0" (unverified, CP:348) |
| K3 | No fail state, no score, no time limit, no medals; every dish completes; progress only rises; waiting never burns the food; all three doneness bands are good results. | OD:198, C5:11, CP:14, CP:70, CS:153, CM:126 | `tools/test-cook.js` (monotonic progress, 60 s wait; key ban line 609; word ban line 782); reviewer reads the result screen |
| K4 | The result is the dish itself shown as a picture, never text, grades or stars; no name tag such as '해초전' is shown. | OD:198, C5:11, CP:333 | N1; eyes on `09-result` |
| K5 | A commercial cooking game may teach principles only: no name, character, art, music, step titles, screen layout, palette or recipe is taken. Not taken by name: title bar, guide character, plate clock, speech panel, gingham, pink and sky palette, blue arrows, realistic first-person hands, grades, medals, star ratings, 'Perfect', failure faces, tablecloth and curtain staging, flags, fanfare. | OD:198, OD:156, C5:52, C5:680-688, CP:336, ES:842-848, CM:128-129 | review against the "not taken" lists; `tools/test-cook.js:782` bans '마마' and 'Mama' in the kitchen files; no commercial screenshot goes into the repo (CP:383) |
| K6 | Benchmark notes go in docs only, never in code comments. | C5:48, CM:128-129 | review; the '마마'/'Mama' ban above |
| K7 | Kitchen stickers (chef-hat octopus pictures) stay, without feeling faces: 감동 `moved`, 뿅 `love`, 두근 `flush`, 깜짝 `shock`, 퓻 `ink`, 갸웃 `hmm`, 진땀 `sweat` never show in the kitchen. | OD:175, CS:152, C5:352 | `tools/test-cook-stickers.js:122-146` (the seven ids are in no rule reachable from kitchen acts; 0 in 1,200 runs) and `:150-172` per dish; live K1 (unverified) |
| K8 | Stickers are decoration, not the octopus's reaction: pictures only, no words, recorded `by: 'demo-rules'`, never fed to octopus records, the brain or a model request; they never cover food, marks, guides, the hand, close or the chip; they take no touch and are `aria-hidden`; a missing picture is removed, never replaced by an emoji. | CS:143, CS:150-156, CP:167 | `tools/test-cook-stickers.js:103` (`by`), `:193`; live K2/K3 (unverified) |
| K9 | When the food is properly cooked it goes '띵': the sound only when sound is on, the bell picture always, no vibration; the bell is a picture, not a timer dial or countdown; turning crisp is not a failure and has no signal. | OD:160, ES:44-46, CP:168, ES:845 | N11 and audio test A/C (unverified, ES:744-749) |
| K10 | Slicing cuts exactly on the guide: a clean '+' through the centre, vertical first, then horizontal, into four equal pieces, however slanted the finger. | OD:160, ES:40-43, CP:78, CP:169 | `tools/test-cook.js` §6 (unverified beyond the header; CP:375) |
| K11 | Tools and stickers must be big enough to read (spatula blade 24×12 art px, knife 49×7); owner 11-21 now wants **all** stickers bigger still (R7 line 42). | OD:160, CP:134-135, R7 | art pins in `tools/test-cook.js` 'round 6 K1' (unverified); live K2 sizes (unverified) |
| K12 | Three dishes, each with one effect and a slightly different mix of steps (round 6). Superseded in part by 11-21 (the list may change), but "one effect per dish, lasting the day" stands. | OD:163, OD:165, ES:24-26 | `tools/test-meal.js` (unverified); ME:79 |
| K13 | Nobody hosts or judges: no presenter, no praise or scolding; the octopus character does not appear in the kitchen. | CP:327, CP:336 | review |
| K14 | Haptics are on by default with a settings switch; in the kitchen only at a counted tap, heat-on, the flip landing and each cut; not at the plate, the bell, slides, open or close. | OD:200, C5:33, CP:172-183, ES:115-116 | N6 (fake `navigator.vibrate`) and `tools/test-haptics.js` "cook.js calls only tap · flip · cut" (both unverified, CP:368, CP:374) |

### 1.2 Text and fonts

| # | Rule | Source | How it is checked |
|---|---|---|---|
| T1 | "Reduce text" means fewer characters, never smaller type. No font size shrinks. | OD:188, C5:15, CM:22 | review; `js/fs-snap.js` sizes are not touched |
| T2 | Persuade with the screen, not with text: as few words as possible everywhere; people dislike reading and choosing. | OD:20, OD:196 (owner quote), BR §3 | review of every new string |
| T3 | Player-facing text (buttons, labels, tabs, rows, chips, bubbles, sheets, `title`, `aria-label`, `placeholder`, SVG text, CSS `content`) is letters or pixel pictures only: no emoji, no decorative symbols; plain punctuation is fine. If a picture fails to load, leave it empty or use a word, never an emoji. | OD:41-42, UA:114, SK:74, CM:122-123 | smoke **U** (`tools/smoke.js:4294-4303`): allowed set `[^\sA-Za-z0-9.,!?:;'"()\/%+~\-` Hangul `·…‘’“”—–]`, emoticons `zZ ^^ <3 :) T_T >_<` fail, attributes `aria-label title placeholder alt aria-valuetext aria-roledescription data-share` are scanned, `::marker` must be a counter style |
| T4 | Text written by others (the model, a person, Wikipedia, another player's nickname) is shown byte for byte and marked `data-raw`. | OD:43, UA:135, MV:32 | smoke U skips `[data-raw]`; `tools/test-model-voice.js` §1 |
| T5 | Pixel fonts stay (Galmuri11 titles 24, Galmuri9 body 20; system font 15/13 when the player turns the pixel font off). Galmuri renders crisply only at whole device px per font px; use the `--fs-*` properties; never Galmuri7 for Korean; never fake bold (`font-synthesis: none`). At DPR 2.625 crisp body is about 19 and title about 23. | OD:188-190, OD:184, C5:13, CM:26-27, HO:27, SK:73, UA:164 | font-size smoke checks (not opened); eyes on 2.625 shots |
| T6 | Every Hangul character in the kitchen files is inside KS X 1001 (2,350 syllables). | CP:356, C5:370, ES:670 | `tools/test-cook.js:783-803`, `:817` |
| T7 | Every string in `COOK.WORDS` is a word from the fixed vocabulary list; no digits, no N/M counts, no emoji. | CP:356 | `tools/test-cook.js:808-817` (VOCAB of 40 entries, section 4.1) |
| T8 | When Korean text changes, the font subset must be current: `python3 tools/subset-fonts.py --check` reports `stale: none`. The check counts every non-ASCII character in `js/*.js`, `css/*.css` and `index.html`, comments included; `cook.html` is not counted, so new HTML body text is inserted by JS. | HO:39, SK:186, `tools/subset-fonts.py:9,89-91`, `wip/round6/README.md:96` | CI job `fonts` |
| T9 | Code comments in `js/cook.js` are ASCII; Korean only inside strings. | C5:49 | `tools/test-cook.js:805-807` |
| T10 | A new kitchen file joins the scans by hand: add it to the file list of test 14 and, if it writes octopus-side lines, to the honesty scan. | ES:750, CM:84 | `tools/test-cook.js:780`; `tools/test-brain.js:1874` |
| T11 | UI pictures are language-neutral (there are no per-language UI images), so no letters are drawn into art. | `docs/I18N.md:55`, CP:13 | eyes on shots (no test reads canvas pixels for glyphs) |
| T12 | `COOK.notice()` (a text slot under the HUD) stays dormant; using it needs an owner decision because it shows words. | CP:250, CP:305, C5:354 | L12 (unverified); review |

### 1.3 Honesty about the octopus

| # | Rule | Source | How it is checked |
|---|---|---|---|
| H1 | Nothing may say or imply what the octopus feels, likes, wants or tastes, or that it chose or said something it did not. Code-written lines state facts only: what was done, where, what happened. | OD:137-143, OD:145-153, HO:46, SK:17-19, CM:113-115, MV:5-6 | `tools/test-brain.js` 'demo lines say facts' (`:1852-1905`, `CLAIM_RX` at `:1808`); `tools/test-model-voice.js:221-262` (`PREF`) |
| H2 | When rules move the octopus, the screen always shows the '데모' tag, and every decision row carries who decided ('데모 규칙' · '모델' · '사람이 정함'). A demo answer is never recorded as the model's. | OD:12, ME:47, ME:116, SK:17, MV:52 | smoke EAT (toast with tail), `tools/test-meal.js` (both unverified); `tools/test-model-voice.js` §2 |
| H3 | Code-chosen moments use the `idle` face: call, think, a demo answer, eating. Only a model's own `expr` may change the face, on the model path. No hearts, blush or smile from code. | OD:149, ES:124-125, ME:35, ME:86 | smoke EAT / T8 (unverified); eyes on shots ("the octopus's face is idle in every code-written moment; no aura hearts", ES:833) |
| H4 | The model's words are never altered, trimmed silently or corrected: a bubble may show 24 characters + '…', the record keeps the whole text. | HO:46, MV:32-33, ME:62, CM:116-117 | `tools/test-model-voice.js` §1 |
| H5 | Never steer the octopus. "No" always works, costs nothing and is staged plainly: no sad face, no jingle, no nag, no reason asked, never asked twice. | OD:126 (salon), ME:117, MV:23, CM:118-119, SK:18 | smoke EAT, `tools/test-salon.js` (unverified); review |
| H6 | A decision is a fact and may be written as one: '-기로 했어'; '-ㄹ래' only where the code really does it. Want forms ('-고 싶', '-면 좋겠', '바라') are always caught. | OD:148, ME:115 | `tools/test-brain.js:1854-1855` |
| H7 | No joy sound or mood sound from code; mood sounds only for a reaction the model or a person chose. | OD:147, OD:151 | `tools/test-audio.js` 11 (unverified) |
| H8 | Nothing is invented on the octopus's behalf: no thanks, letters, favourites or promises. | SK:17, SK:64, OD:152 | review; `CLAIM_RX` |

### 1.4 Meal rules

| # | Rule | Source | How it is checked |
|---|---|---|---|
| M1 | The finished dish goes to the play-room table; my character sits and eats; the octopus, when called, sits opposite. | OD:162, ES:20-23 | smoke EAT (unverified) |
| M2 | The octopus decides each time whether to eat: the model when one is attached, demo rules now. Who decided is shown. No feeling word ('싫어서' and the like). If it does not eat it just sits; if it eats it gets the effect too. | OD:164, ME:5-7 | `tools/test-meal.js`, smoke EAT (unverified) |
| M3 | The player may think about whether to call at all: eating alone is a full option (tap the table), the call is a separate picture chip. | OD:156 (owner: "같이 먹을지 말지도 고민할 수 있게"), ME:19, ES:453-454 | smoke EAT "eat alone (meal row only)" (unverified) |
| M4 | The demo answer uses four inputs only: dish id, octopus name, born, number of earlier asks. Never the dish kind, effect, colour, time, earlier answers or petting, because a rule that turned some foods down would invent a taste. First call ever = eat; after that about 3 in 5 (`P_EAT 0.6`). | ES:55-58, ME:42-45, CM:115 | `tools/test-meal.js` 3 (unverified); `js/meal.js:66-67` |
| M5 | One answer per dish: calling again replays the stored answer, never re-rolls, never asks again. | ES:59, ME:46 | `tools/test-meal.js` (unverified) |
| M6 | Staging only replays saved facts: the answer is saved at the call press (after `MEAL.canCall` and the scene's `octCanCome()` both say yes), the meal at the first bite. A reload, another tab or the album draw from the records. | ES:59-64, ME:26, ES:584-586 | smoke EAT reload / two tabs (unverified) |
| M7 | A call never wakes the octopus; when it cannot come the chip is simply not shown: no words, no nag. | ES:479-485, ME:117 | smoke EAT "asleep: no chip, nothing saved" (unverified) |
| M8 | While a call is staging (`mealBusy()`: call press to last bite) the counter and the arcade do nothing and the table buttons hide. | ES:94-98, ME:27-28, `js/app.js:4281` | smoke Z "counter does nothing while mealBusy" and EAT (unverified) |
| M9 | Day log rows come only from eaten entries; the decision row only when the octopus sat at that meal. An aborted visit leaves no row. | ES:587-591, ME:96-99 | `tools/test-meal.js` rows (unverified) |
| M10 | Effects last the day: derived from the meal records, gone when the day changes, replaced by the next dish eaten that day; never a remaining-time display, a streak or anything to miss. No stat boost. | OD:165, ES:65-66, ME:83-86, ME:118, ES:848 | `tools/test-meal.js` active effects; smoke EAT next day (unverified) |
| M11 | One dish waits at a time; a new finished dish replaces a waiting one (the old one stays in the kitchen book). | ES:475-476, ME:17 | `tools/test-meal.js` (unverified) |
| M12 | Table buttons are pictures only, names in `aria-label`, no `title`: '식탁' · '식탁, {요리}' · '{요리} 먹기' · '식탁에 앉기' · '{이름} 부르기'. | ES:111-114, ME:108 | `tools/smoke.js:7905` |
| M13 | No sound and no vibration in dining; the think bubble is silent. (Round 6 scope: "dining sounds are later".) | ES:90-91, ME:34 | smoke EAT (unverified) |
| M14 | Dining is 3D only; the 2D fallback keeps the dish waiting and shows no table or buttons, without errors. | ES:89, ME:36 | smoke EAT `?scene=2d` (unverified) |
| M15 | While the octopus sits at the table nothing autonomous moves it (wander, thoughts, rest, self-wake); it never falls asleep at the table. | ES:517-525, ME:31-33 | smoke EAT, `tools/test-scene-perf.js` T8 (unverified) |
| M16 | Model path (not built): send ≤ 400 B with menu `['eat','watch','stop']`, no past answers, odds, taste or mood; wait at most 8 s; `stop` always in the menu; no answer = `by: 'fallback'`, the octopus sits, row '대답이 없었어.' with no tail. | ME:55-64, ES:494-503, SK:19 | docs only this far (ES:67-69) |

### 1.5 Motion, sound and haptics

| # | Rule | Source | How it is checked |
|---|---|---|---|
| F1 | Sound is off by default and nobody is nagged to turn it on. With sound off nothing plays, no `AudioContext` is made and nothing under `audio/` or `foley/` is requested; with it on, sound starts only after the first gesture. Opened from `file://` the game is always silent. | OD:102-104, C5:14, CP:278, CM:124-125 | `tools/test-cook-audio.js` A, C, E (unverified, CP:371) |
| F2 | The game must feel right with sound off: every counted input changes the stage on the very next frame (rim flash, squash, crumbs, a lasting mark); reaction animation runs in 12 fps steps; the hand-held tool follows the finger at screen rate on whole art px. | CP:15, CP:171, CP:95 | L6 (unverified); eyes on shots |
| F3 | There is no failure or miss sound. Sound has one call site, `AUDIO.on('cook', { act })`, called inside the input handler; `js/cook.js` only calls, `js/audio.js` decides what plays. | CP:258 | audio test A-N (unverified) |
| F4 | Press feedback on pixel UI is a 2 px translate, never a scale; entrances move in 2 px steps. Only characters bounce: buttons, sheets and logs never do. | C5:50, CM:29, SK:89, SK:92, SK:185 | review; N4 (unverified) |
| F5 | Animate `transform` and `opacity` only in DOM; the kitchen dialog itself has no CSS animation (stickers: 250 ms in, 1.4 s hold, 180 ms out, by position not scale). | SK:88, CP:170, CS:155 | review; `css/cook.css` |
| F6 | Reduced motion (`opts.reduced`, `prefers-reduced-motion`, or the game's `data-motion="reduce"`): reduce, do not remove. Off: slides, the plate drop, squash, particles, shake, arcs, hand motion, steam motion, arrow bob. Kept: rim flashes, marks, kerfs, colours, knob state, still arrow, chip. The reduced block sits last in the CSS. | CP:170, C5:401-412, SK:95, SK:187 | L7, smoke Z K-5, K6 (unverified) |
| F7 | Haptic patterns stay ≤ 3 pulses and ≤ 250 ms; kitchen `tap` 14 ms, `flip` 24 ms, `cut` 16 ms; single pulses within 30 ms merge; never before the first user activation, never on a hidden page, never from a timer; `supported()` is honest (false on Firefox, on desktop, on iPhone). Every haptic moment also has a visible flash, squash or shake, because iPhone has no web vibration. | CP:27, CP:172-183, C5:376-392, C5:19 | `tools/test-haptics.js`, N6 (unverified) |
| F8 | No time pressure of any kind: no countdown, no streak, no fear of missing out, no pushy notice. Invisible clocks are fine (first hand after 600 ms, idle hint after 5 s). | CM:120-121, SK:18, CP:162-163, BR §3 | review; L16/L17 (unverified) |
| F9 | Help is shown, then steps aside: a ghost hand once for a step kind this device has not seen, once more after 5 s without progress, and after three presses that change nothing; never on the result. Hints answer, they do not hurry. | CP:162-163, C5:686 | L3, L16, L17 (unverified) |

### 1.6 Pixel rendering and device sizes

| # | Rule | Source | How it is checked |
|---|---|---|---|
| P1 | Phone portrait first, one hand, touch. Reference 360 × 740 CSS px; 320 × 568 and 412 × 915 at DPR 2.625 must work. Landscape and tablets are not targets (only "no overflow"). | BR §3, CP:118-127, CP:413 | N2 at seven sizes, L5 (unverified) |
| P2 | Every art px is a whole number of device px: canvas backing store at an integer scale, `imageSmoothingEnabled = false`, `image-rendering: pixelated`, boxes rounded to `round(v·dpr)/dpr`; HUD icons too. | C5:50, CM:28-29, CM:132, CP:108-116, CP:148 | N2/N4 (unverified); K2 block check (unverified) |
| P3 | The canvas always covers the whole window, under the notch and the home bar: no letterbox, frame or empty page colour. Safe-area insets move only the HUD, the chip and the stage's vertical place. | CP:116, CP:166, C5:668-669 | N2, N10 (unverified) |
| P4 | Colours: props use the Apollo 46 palette only; food, oil, glints and steam use the `FOOD` table (24 colours today); alpha is 0 or 255. | CP:24, CP:214, C5:50, UA:55 | `tools/test-cook.js` §16/§17 (section header at `:822`; bodies unverified) |
| P5 | Art is drawn by code and is deterministic: the same inputs give the same bytes; no `Math.random`, no clock, no trig in `js/cook-art.js` (integer angle tables, integer hash patterns). Loops repeat every 96 frames. | CP:24, CP:187, CP:209 | `tools/test-cook.js` §16 determinism (unverified) |
| P6 | Fractional DPR crispness is measured on the real paint path (`--force-device-scale-factor=2.625`, viewport null), not with Playwright's `deviceScaleFactor` emulation, which misreports blur. | HO:18-19, `wip/round6/README.md:101-103` | sticker live test does this (unverified) |
| P7 | Nothing pressable sits within 24 CSS px of the left or right edge (non-mouse presses starting there are ignored as OS back swipes); marks and guide ends stay ≥ 32 CSS px from the edges at all target sizes. | CP:166 | L17, N4 (unverified) |
| P8 | Light comes from the top-left; outlines are a darkened neighbour colour, not black. | UA:56-57 | eyes on shots |

### 1.7 Accessibility

| # | Rule | Source | How it is checked |
|---|---|---|---|
| A1 | Every gesture has a single-action alternative: the verb chip (picture + `aria-label`) does the step on a tap, Enter or Space; held keys do not repeat. Mashing is never required (hold works), precise timing is never required, and clocks start only after the person acts. | CP:16, CP:165, CP:399 (WCAG 2.5.1 · 2.5.7 · 2.5.8) | L2 keyboard-only dish, L11, L15 (unverified) |
| A2 | Touch targets ≥ 44 × 44 CSS px: close shows 48 × 48 with a 56 × 56 hit area; the chip is 64 × 64; tray chips 64 × 64 with 16 px gaps. | SK:75, CP:150-152, ES:332 | N4, smoke Z tray (`tools/smoke.js:7655`), L5 (unverified) |
| A3 | Keyboard: tab order close → chip; Esc closes; focus rings only after key input; focus returns to the opener (`#btn-cook` in the game). The opener's last input decides whether the chip takes focus. | CP:165, C5:414-425 | L2, smoke Z K-11 (unverified) |
| A4 | Screen reader: one hidden `aria-live="polite"` line speaks the step word at each start, '반쯤', '한 줄', the doneness word when it changes, '다 됐어' and the plate description; not every frame. The dialog's `aria-label` is the dish name. | CP:80, C5:369, C5:424 | L4 reads the live node; N1 `:1085` (label) |
| A5 | State is never told by colour alone, and never by red or shaking for a "bad" outcome. | SK:63, SK:72, UA:60 | review |
| A6 | `user-scalable=no` is never used; inputs are 16 px. | SK:75 | review |

### 1.8 Save data and two tabs

| # | Rule | Source | How it is checked |
|---|---|---|---|
| S1 | A save is never lost or silently deleted. Unknown values from a later build are kept, not removed. | HO:46, CM:130-131, ME:78 | L9, `tools/test-meal.js` normalize (unverified) |
| S2 | The kitchen keeps its own key (`ppolppol_cook_v0`, also in the embed) and never reads or writes the main save; the game reads the kitchen key read-only in one place (`cookPot()`). Kitchen files contain no `ppolppol_v2`, `APP.`, `S.` or `BRAIN`. | CP:17, CP:231, C5:47, ES:355-356 | `tools/test-cook.js:798` |
| S3 | A pot that cannot resume (other `ver`, other tune, broken) moves to `potOld` byte-identical (newest first, at most 4) and a new dish starts; the book (≤ 300 lines) is untouched. | CP:227-228, C5:431 | L9 (unverified) |
| S4 | The pot is written only at step boundaries (new dish, step end, tab hidden, `pagehide`, close); resuming restarts the current step and keeps finished steps' looks. A pot with a finished step (`si ≥ 1`) wins over any requested recipe; an empty pot of another recipe is set aside to `potOld`. | CP:225-226, ES:117-119 | `tools/test-cook-dishes-live.js` pot rules, smoke Z tray rule (unverified) |
| S5 | `ppolppol_v2` gained `S.user.table` (one waiting dish) and `S.user.meals` (oldest first, never deleted); nothing is removed or renamed. Unknown `recipe`, `fx` and `by` values are kept but not drawn. | ES:117-120, ME:66-78 | `tools/test-meal.js` (unverified) |
| S6 | The result message is `{ ppolCook: 'result', v: 1, id, recipe, seed, look, day }`, posted once per finished dish at the reveal; `MEAL.normDish` accepts id `ck_[0-9a-z]{1,13}`, recipe ASCII ≤ 16, seed uint32, look a plain object with JSON ≤ 2048 B. | ES:347-357, ME:76-77 | `tools/test-cook-dishes-live.js` "exactly one result message" (unverified) |
| S7 | Two tabs: meal entries merge by id (an entry with `ate` beats one without, then one with `ask`); a dish eaten in either copy leaves the table; `syncFromStore()` runs before the call press. Elsewhere the last writer wins. | ME:120-128, ES:594-597, HO:30 | `tools/test-meal.js` merge, smoke EAT two tabs (unverified) |
| S8 | No time data that could reveal how long a dish took: the dish id carries no clock, the envelope's `ms` is always `null`, the book line has only `madeAt` and `day`. | CP:229, CP:234 | `tools/test-cook.js:604`, `:622` |
| S9 | A storage failure (private mode, quota) never blocks play and shows no error text. | CP:232 | L10 (unverified) |
| S10 | Dates are local calendar dates (`todayKey()`, test hook `__ppolTest.today`), never `toISOString()`. | SK:192, ES:592 | `tools/test-meal.js` day change (unverified) |

### 1.9 Engineering

| # | Rule | Source | How it is checked |
|---|---|---|---|
| E1 | Vanilla HTML/CSS/JS: no framework, no bundler, no build step, no `type="module"`, no new library; a few globals connect the files. | SK:100, C5:49, CM:7, BR §3 | review; `tools/test-export.js` (unverified) |
| E2 | Everything works from `file://` (relative URLs only, no `fetch()` of local files). | SK:100, SK:144, CM:148 | smoke runs from `file://` (`.github/workflows/test.yml` smoke job comment) |
| E3 | The kitchen simulation is the top half of `js/cook.js`, above the single `/* ───────── live ───────── */` marker: no DOM, storage, timers, `Date`, `Date.now` or `performance.now`; it runs in node. The live half declares no function name the simulation uses. | CP:23 | `tools/test-cook.js:771-779` |
| E4 | No `Math.random` in any kitchen, meal or decision code; randomness is seeded (FNV-1a + mulberry32); particles use their own seed. The same input sequence gives the same dish at any tick rate. | SK:20, C5:49, ES:109-110 | `tools/test-cook.js:797`; `tools/test-cook-stickers.js:192`; determinism checks at 30/60/120/240 Hz (CP:356) |
| E5 | The kitchen never throws at the game: `COOK.open` returns `false` on an internal error; missing sticker or sound files never break play. | CP:248, CS:73 | K9, K10, audio D (unverified) |
| E6 | The game page does not load `js/cook.js`; the kitchen runs in `cook.html?embed=1` inside a full-screen dialog and talks by `postMessage` (`ready`, `open`, `close`, `result`, `motion`, `safe`), with the parent only and with the origin checked. | CP:286-302 | smoke Z (unverified beyond `:7471-7684`) |
| E7 | A kitchen that cannot load shows the crawling octopus and a close button after 300 ms, and after 6 s closes with the toast '부엌을 못 열었어. 다시 눌러 줘.'; saves are untouched. | CP:289, AU:26, `js/app.js:4142` | smoke Z (unverified) |
| E8 | Scene budgets hold: play room ≤ 60 draw calls without a meal, whole scene ≤ 150, and the shader program count never grows after boot (auras are prewarmed). | ES:121-123, ES:70-72 | `tools/test-scene-perf.js` T3/T5/T7/T8 (unverified) |
| E9 | A deployed file must be listed or referenced: `tools/export-site.js` ships only known folders and file types (`.css .js .json .svg .png .woff2 .ogg .m4a`); a new top-level file or folder must be put in `TAKE` or `PRIVATE`; an unreferenced shipped file is reported. | `tools/export-site.js` header, OD:77 | `tools/test-export.js` in `npm test` and CI (unverified) |
| E10 | Third-party code is never pasted. Permissive code was only re-expressed, GPL and unlicensed code only read, so no `docs/THIRD_PARTY.md` exists; pasting any line would require one. Sounds from others keep their exact CC BY credit lines in `foley/CREDITS.md` and `credits.html`. | CP:402, CP:404, BR §3 | audio test G (unverified); review |

### 1.10 Process

| # | Rule | Source | How it is checked |
|---|---|---|---|
| X1 | A word that can be read two ways is asked before work starts; owner 11-21 repeats it ("ask as much as possible before starting, tell the lanes too"). | OD:193, HO:37, R7 E2 | lead |
| X2 | Small things get one careful version and one or two real screenshots: no rounds of variants. | HO:38, CM:34 | lead |
| X3 | Verification is not repeated: careful code, `npm test` once at the end, the font check once if Korean changed; the browser suites run in GitHub CI on push. | HO:39 | lead |
| X4 | Lanes work on their own branches and files; merging another branch into this one needs the owner's '넣어' (the auto-mode check blocks it). | OD:166, HO:42, CM:41-43 | lead |
| X5 | Push only `claude/game-launch-completion-hwvre5`; no force push; stage files one by one (never `node_modules`); deploy only from this branch. | HO:23, HO:48 | lead |
| X6 | Never put the owner's name, nickname or e-mail in anything committed or sent out (the Vercel team address contains the e-mail). No model or agent name in code, comments, docs or commit messages you write (round 6 accepted the harness's own attribution trailer; existing commits carry one). | HO:47-48, CM:133-134 | review of the diff |
| X7 | Never commit: `node_modules/`, `/public/` (export output), `dist/`, `.claude/worktrees/`, reference pictures (the root `*-ref.*` files are git-ignored), screenshots of commercial games, other artists' sprites. | `.gitignore`, CP:383, BR §1b | review of the diff |
| X8 | After the merges: one independent check (several lenses, each finding with evidence and one rebuttal), one round of fixes, CI all green, then production once (Vercel project `ppolppol-octopus`, the branch's commit sha); passing tests count as deploy approval; the deployment id is written into the round's README. | OD:176, OD:206, HO:43, ES:834-836 | `wip/round6/README.md:99-111` shows the pattern |
| X9 | Reports to the owner: conclusion first, 반말, short, with 360 × 740 phone screenshots. | HO:41, C5:678 | lead |
| X10 | `package.json`, `.github/workflows/test.yml`, `README.md`, `HANDOFF.md` and `docs/OWNER_DECISIONS.md` are lead-owned; lanes list the test files to add. | ES:92-93, CM:88 | lead |

## 2. Earlier decisions that the 11-21 request changes

The new words are quoted from BR §1 and §1b (the lead's transcription of the owner); the old words from the files named.

### D1. "The kitchen opens straight into cooking" → "a recipe book opens first"
- **Old**: "**열자마자 바로 요리 시작** (조리대 화면 없이, 다 만들면 접시가 크게 + '다시' · '닫기' 그림)" (OD:192). "Opening starts
  cooking at once: no counter or menu screen" (C5:10). "The dish is chosen in the play room, not in the kitchen. Tapping the
  counter shows a small tray of three dish pictures; the kitchen still opens straight into cooking" (ES:33-34). In the
  round-5 table of what was deliberately not taken: "요리 아이콘 메뉴판 → 메뉴 없음. 열면 바로 해초전" (CP:332).
- **New**: "각 음식은 딱 조리대 누르면 레시피 북부터 펼쳐지면서 어떤 요리를 만들지 눌러서 시작하는 걸로 해줘."
- **Replaced**: the three-chip tray `#dish-pick` as the chooser, and the "no menu" stance. The owner now asks for a menu in
  our own form.
- **Still stands**: zero visible characters and no `title` (K2); names only in `aria-label`; items ≥ 44 px with a 2 px press
  translate; pictures on whole device px; closing by backdrop, Esc or back returns focus to `#btn-cook`; opened by key →
  focus on the first item; the counter does nothing while `mealBusy()`; the cannot-load fallback (E7); after a dish is
  picked, cooking starts at once (no second confirm, no counter screen in between); a half-made dish is never thrown away
  (S3, S4); no commercial recipe-menu layout is copied (K5).
- **Pinned today, to be replaced with a check of the same intent**: `tools/smoke.js:7655` (dialog '요리 고르기', chips
  '해초전,주먹밥,과일 꼬치', text `''`, titles 0) and the tray rule block around `:7592-7649`; 15 references to
  `dish-pick`/`dp-chip` in `tools/smoke.js`, 3 in `tools/cook-shots.js`; `tools/make-dish-icons.js --check` runs in CI
  (`fast` job); CP:288 documents the tray.

### D2. The 'again' picture chip → "call the octopus and eat"
- **Old**: "다 만들면 접시가 크게 + '다시' · '닫기' 그림" (OD:192). "At 450 ms … the chip shows the **again** icon. … It ignores
  presses until 900 ms" (C5:278). "The loop arrow is reserved for 'again', in the HUD only" (C5:29). `WORDS.verb.again:
  '다시'` (`js/cook.js:152`).
- **New**: "다시하기 버튼보다도 문어 불러서 먹을 수 있도록 버튼 기능 수정해줘."
- **Replaced**: what the end chip does (start the same dish again → go and eat).
- **Still stands**: it is a picture button with an `aria-label`; close stays a picture button top-right; the result has no
  auto-advance, no timer and no hand hint, and pressing the plate does nothing (CP:164); the chip appears at 450 ms and
  ignores presses for 900 ms so that a cooking tap cannot fall through onto it (C5:278, CP:91); the octopus still decides
  each time, labelled (M2); the player may still eat alone (M3); one answer per dish (M5); a sleeping octopus is not woken
  (M7); dining has no sound and no vibration (M13). Cooking the same dish again remains possible through the counter.
- **Pinned today**: `verb()` returns '다시' on the reveal (sim half, C5:44); VOCAB contains '다시'; L2 (Enter at 450/900 ms),
  L16, N5 ("again" slide plate → counter), N7, K4, the dishes test "again repeats the recipe", the audio test's `pick` at
  again, and capture `09-result` "again chip" (CP:360-369, CP:380) (all unverified in code). `again|다시` occurs 16 times in
  `tools/test-cook.js`, 28 in `tools/test-cook-live.js`, 24 in `tools/test-cook-audio.js`, 10 in
  `tools/test-cook-stickers-live.js`. Sticker and sound act `pick` fire at open **and at again** (C5:30), so stickers lose
  one trigger.

### D3. The step strip (top-left "finger and spatula") → removed
- **Old**: "At most three items during a step: strip (top-left), close (top-right) and the quiet chip (bottom-centre)"
  (C5:320). "단계는 옆 자리로 미끄러짐 · 음식 위 신호 하나 · **단계 띠** · 처음 손 그림이 알린다" (CP:329). "단계 띠는 그림 셋뿐
  (숫자 없음)" (CP:331).
- **New**: "왼쪽 위에 손가락 모양이랑 뒤집개 버튼은 뭘 위한 건지 모르겠으니 빼주고".
- **Replaced**: `.ck-strip` goes away entirely (it is `aria-hidden` and takes no press, so assistive technology loses
  nothing: the step word is still spoken at each step start, A4).
- **Still stands**: no numbered progress bar; progress is read from the food (CP:331); the HUD during a step is now at most
  close + chip; the slide between stations, the one cue drawn on the food and the first-time hand still tell the step.
- **Follow-on rule** (my reading of the owner's reason): the strip sat on the same paper chip as close and the verb chip
  (see `docs/shots/cook/01-tap-start-360x740.png`), so it looked pressable. The bell, stickers, hand hints and any progress
  picture must not use the paper-chip frame.
- **Pinned today**: `tools/test-cook-live.js:172` (`T.strip`, used by L8 "띠는 첫 단계 끝남 · 둘째 단계 지금"), `:1129`, `:1138`,
  `:1335` (HUD geometry); one reference in `tools/test-cook-stickers-live.js`; the eyes-on line "only strip, close and chip
  in the HUD" (C5:667); the sticker layer's top edge is defined from the HUD row (`hudB + 4`, CP:167).

### D4. The dish list and the look of the food
- **Old**: "요리: **3개** — 해초전 + 둘 (예: 주먹밥 · 과일 꼬치). 요리마다 효과 하나 …, 단계 (톡톡 · 뒤집기 · 썰기) 를 조금씩 다르게
  섞는다" (OD:163). "단계마다 팬 · 도마를 **위에서** 가까이 화면 가득" (OD:192).
- **New**: "각 단계를 조금 더 세분화해서 진짜 요리하듯이" and "형태감이 일정하고 실제 음식을 안 닮아서 먹음직스럽지 않고 … 종류를
  바꾸거나 해도 좋으니까 좀 개선해줄래?" with three-quarter-view references (style only, BR §1b).
- **Replaced**: the fixed list of three, the three step kinds, the flat top-down discs.
- **Still stands**: one day effect per dish (K12, M10); no cephalopod in any dish and preferably no visible animal (BR §1b);
  art by code, deterministic, Apollo props + `FOOD` food colours, alpha 0/255, whole device px (P2, P4, P5); every dish
  completes (K3); the close-up that fills the screen and slides between stations (K1).
- **Pinned today**: the three recipes and their steps in the header of `tools/test-cook.js`; `TUNE_HASH`, both `tuneOf`
  numbers, `COOK_TUNES`; per-dish haptic counts (해초전 tap 10 · flip 1 · cut 2; 주먹밥 10 · 1 · 0; 과일 꼬치 9 · 0 · 2, CP:63);
  per-dish sticker scripts (≥ 5 reachable stickers, ≥ 3 per dish, `tools/test-cook-stickers.js:150-172`); `MEAL.DISHES`
  (`js/meal.js:30-32`); the dish icons `assets/icons/dish/*.png`; the food size check "jeon ≥ 69 % of the width" (N3).

### D5. The dish "just appears" on the table → a connected cook → serve → eat chain
- **Old**: "부엌이 닫히면 요리가 식탁에 나타난다 (나타나기 박자)" (ME:17); "kitchen closes → the dish appears on the table (appear
  beat) 0.5 s" (ES:451).
- **New**: "지금은 그냥 바로 부침개가 탁자 위에 띡 올라와있는데 유기적인 연결이 부족한 느낌."
- **Replaced**: the bare appear beat as the only link.
- **Still stands**: the dish is recorded at the reveal by the `result` message and staging only replays saved facts (M6,
  S6); one dish waits at a time (M11); sit → choose → call order and `mealBusy()` blocking (M3, M8); the 2D fallback keeps
  the dish waiting (M14); nothing autonomous drags the octopus (M15).

### D6. Sticker size
- **Old**: one sticker px = the largest whole `n` in `floor(2·dpr) .. floor(3·dpr)` that still fits above stage row 44: "1.5×
  where there is room, never smaller than today, never shown where it is hidden today" (ES:87-88); hidden at 320 × 568.
- **New** (R7 line 42, owner answer ④): "스티커는 **전부** 크게 ('너무 작아서 안 보여')".
- **Replaced**: the size cap (and, with the strip gone, the top-left corner is free).
- **Still stands**: K7 and K8 in full; whole device px per sticker px; at most two at once in the kitchen (CS:97, CS:130).
- **Pinned today**: K2/K3 sizes (96 CSS px at 360 × 740 @2, 85.33 at 412 × 915 @2.625, hidden at 320 × 568 and 360 × 560)
  (CS:127-145, unverified in code).

### D7. "TUNE stays byte-identical"
- **Old**: "**TUNE** in `js/cook.js` stays byte-identical: `TUNE_HASH === 2827089308`" (C5:42); "R2 TUNE stays byte-identical"
  (ES:38). Both were lines for their own round.
- **New**: finer, more real steps cannot be built without new numbers.
- **Replaced**: possibly the hash and the recipes. **Still stands**: the reason for the pin, which is S1/S3: nothing saved is
  lost. Changing a value moves an old half-made dish to `potOld` ("많아야 한 단계라 놀이로는 잃는 것이 없다", CP:84); the book
  lines of old dishes must still read and draw (old `slant` looks are still read today, CP:78).

## 3. Where the new request can collide with a standing rule, and a safe reading

**C1. A recipe book normally has words; the kitchen has none.**
Safe reading: the book is pictures only. A page = the dish picture + its steps as gesture pictograms + ingredient pictures.
No page numbers, no step numbers, no "1/3", no lettered cover, no letters drawn into the art (T11); page position, if shown,
is drawn dots (not a '•' glyph, not `::before` content: N1 rejects any pseudo-element content). Dish and step names go in
`aria-label` (the dialog needs one too, today '요리 고르기'). If the book lives in the game page its labels are scanned by
`CLAIM_RX` (`js/app.js`) and by smoke U; if it lives in the kitchen files its strings must be in VOCAB and KS X 1001
(T6, T7). Pseudo-writing (squiggle lines that are not letters) is not covered by any rule I found; the cautious form is
pictures instead. (Lead ruling since: the book is inside the kitchen frame, pictures only, `K.md:26-33`; see W7.)

**C2. "Call the octopus and eat" against "the octopus decides each time, labelled, and the player may think about
whether to call".**
Three standing facts constrain the button: the octopus is often out or asleep when the dish is done (finding 0.1); the
player must stay free not to call (M3); the answer may be "watch" (M2). Safe reading: the end button means **"to the
table"**: the kitchen closes, the dish is carried to the table, my character sits; there the existing call chip (octopus
picture, '{이름} 부르기') is offered when `MEAL.canCall` and `octCanCome()` allow it, and tapping the dish eats alone. The
button's picture must not promise the octopus when it cannot come (H1): either a serving picture (plate and table) always,
or the octopus picture only when the game has told the kitchen that a call is possible. The kitchen cannot find that out
itself (S2): the game must send it by `postMessage`. The thinking beat (1.0 s, '…'), the plain "watch" and the '데모 규칙'
tail stay exactly as they are (ME:21-22). Not safe: a button that calls automatically, a button that waits for the octopus,
any line that says the octopus is coming to eat, re-asking after "watch". (Lead ruling since: two picture buttons on the
result, the calling one only when `ctx.canCall`, `K.md:97-101`, `T.md:33-39`; see W1, W13 and W14.)

**C3. Feelings.**
- Stickers: the seven feeling faces stay out (K7). Two non-feeling stickers are risky in the new chain: `munch` (냠,
  cheeks full) and `taste` (맛보기, spoon in mouth) are wired to the acts `eat` and `simmer` (CS:85-86); the owner already
  ruled that `taste` "reads as having tasted" and took it off the doneness change (CS:153). Safe reading: never show an
  eating or tasting octopus picture for something the octopus did not do; if finer steps add `simmer`/`stir`/`place` acts,
  add them to the `KITCHEN` list in `tools/test-cook-stickers.js:125`, or the feeling-face check does not cover them.
- At the table: face `idle`, no hearts, no "맛있어", the aura is a gift of the day and not a mood (H3, M10).
- In the book: no "favourite" marks, no ranking of what the octopus eats, nothing derived from its answers (M4, and the
  salon rule that an answer never becomes a taste score, OD:128).
- A guide character presenting the book or praising a step is on the "not taken" list (K5, K13).

**C4. "No fail, no score, no timer" against "a real game".**
The owner's complaint is "only the wrapper", not "too easy". Inside the rules, depth can come from: more distinct verbs
per dish, state the player reads from the food itself (the owner's own reference: raw → seared → sliced), choices whose
every outcome is good (doneness), the player's hand left visible in the finished dish (`look`), seeded variety, and the
serve → eat pay-off. Outside the rules: grades, medals, stars, 'Perfect', combo counts, a countdown or timer dial, a target
zone with a miss, burnt food, a fail face, a fail sound (K3, K5, F3, F8). A meter is not forbidden by an owner sentence,
but round 5 chose "게이지 없음 … 진행은 음식에 보인다" (CP:330-331); if one is needed it should only ever rise and carry no
number. Real recipes are full of waiting ("simmer ten minutes"): waiting may never be a clock to beat (the heat-band
pattern: three good states, a bell picture, nothing lost by waiting, CP:77, K9). Result data: no key with `star`, `time`,
`best`, `rank`, `fail`, `grade`, `score`, `percent`, `accuracy`, `duration` (finding 0.7).

**C5. Finer steps against the vibration list.** The owner's moments are "요리 톡 · 뒤집기 · 썰기" (OD:200), and round 6 wrote
"Nothing new" (CM:127). Safe reading: new step kinds reuse the three pattern names (`tap`, `flip`, `cut`) at their own
counted moments (a placed ingredient = `tap`, a turn or toss landing = `flip`, a cut = `cut`); nothing continuous, nothing
for timers, the book, serving or eating. A truly new moment needs the owner. The per-dish counts are test pins and must be
re-pinned. (Lead ruling since: new steps may use the kitchen's existing buzz names, `COMMON.md:62-63`.)

**C6. Finer steps against one-finger, no-precision play.** Circles (stirring), drags (adding ingredients) and holds are
path or drag gestures: each needs the chip alternative that does the step by a tap or Enter (A1), must accept any speed and
direction, must not punish a lifted finger (CP:70), and must stay ≥ 32 px from the side edges (P7). The loop arrow picture
is reserved for "again" and must not become the stir glyph ("use a ladle with a curved trail", C5:29); if "again" leaves
the kitchen, that reservation should be re-decided rather than silently reused.

**C7. A book that opens first against "a pot with a finished step wins".** Today a dish with `si ≥ 1` skips the tray and
resumes, and `begin()` resumes it whatever recipe was requested (S4). With a book that always opens first, the player could
pick dish B and be given half-made dish A. Safe reading: the book opens on the half-made dish and shows its state; starting
it resumes. Whether another dish may be started instead (setting a pot with progress aside to `potOld`) is a rule change:
nothing is lost under S1, but ES:119 says "a pot with a finished step is never set aside", so it needs a decision.
(Lead ruling since: a pot with a finished step resumes and skips the book, `K.md:29-30`.)

**C8. New or renamed dishes against old saves.** See findings 0.2 and 0.3. Safe reading: recipe ids are never reused for a
different dish; retired ids stay in `MEAL.DISHES` with their name and effect; `setTableDish` and `drawDish` still draw
them; a new dish gets a new id, a new `tuneOf` number and an effect. An effect the build does not know draws nothing
(ME:84), and a new aura must not add a shader program (E8).

**C9. Three-quarter food against the top-down working view.** The gestures were designed on a surface seen from above
(K1). Safe reading: keep the working surface readable for the hand, give the food volume at every stage (side face,
height, overlap, cut faces), and use the three-quarter view for the plated result, the book pictures and the table icon.
The `FOOD` table has 24 colours and is pinned by test 16 (unverified in code); more tones per material means extending it
on purpose. (`SPRITES.md:3-5` limits the new sprites to the palette colours `js/cook-art.js` already uses.)

**C10. The standalone kitchen.** `cook.html` is deployed on its own address (`tools/export-site.js` TAKE list) with no
table and no octopus. The end button needs a defined meaning there (close, or cook again), and N1 runs on that page.
(Lead ruling since: the buttons close the kitchen, everything is unlocked there, `K.md:39`, `K.md:102`.)

**C11. Recipes as gifts (R7 E4: after eating at the café a few times an NPC gives a recipe).** The standing pattern for
things that arrive is "quietly, no bar, no days-left" (OD:18-19) and no gacha, limited stock or countdown (OD:58, F8).
Safe reading: a recipe the player does not have is not shown as a locked slot with a counter; it appears in the book when
given, as a fact. (Lead ruling since: it is shown, as a dark silhouette with a lock picture and no counter, `K.md:36-37`;
see W4 and W5.)

**C12. The dish arrives while a meal is staging or from another tab.** Already ruled: it waits (ES:471-472). A carry
animation must not bypass `mealBusy()`.

## 4. Vocabulary and forbidden-word lists

### 4.1 Words that exist today (plain Korean, no digit, no emoji; the kitchen's own words are all inside KS X 1001)

**Kitchen `COOK.WORDS`** (`js/cook.js:148-157`), the only strings the kitchen may show or speak:

| key | words |
|---|---|
| top level | `kitchen` 부엌 · `close` 닫기 · `back` 돌아가기 · `resume` 이어서 · `go` 보러 가기 |
| `dish` (dialog `aria-label`, plate line) | 해초전 · 주먹밥 · 과일 꼬치 |
| `title` (aria-live at step start) | 톡톡 · 뒤집기 · 썰기 |
| `verb` (chip `aria-label`) | 톡톡 · 불 켜기 · 뒤집기 · 썰기 · 다시 |
| `band` (aria-live when doneness changes) | 보들보들 · 노릇노릇 · 바삭바삭 |
| progress (aria-live) | `half` 반쯤 · `line` 한 줄 · `done` 다 됐어 |
| `cooked` (plate line) | 보들보들하게 구웠어 · 노릇노릇 구웠어 · 바삭바삭하게 구웠어 |
| `cut` (plate line) | 반듯하게 썰었어 · 어슷하게 썰었어 |

Plate description = dish name + the facts of how it was made, e.g. "해초전. 노릇노릇 구웠어. 반듯하게 썰었어." (CP:80).

**The allowed vocabulary `VOCAB`** (`tools/test-cook.js:808-809`, 40 entries; a `WORDS` string outside it fails). It
already holds words kept for later steps and a notebook: 부엌, 닫기, 다시, **요리 수첩**, 돌아가기, 이어서, 미역국, 해초전, 톳
주먹밥, 썰기, 톡톡, **젓기**, 불 켜기, 뒤집기, **올리기**, 보들보들, 노릇노릇, 바삭바삭, 반쯤, 한 줄, **하나 올렸어**, 다 됐어,
**요리 수첩에 넣었어**, **아직 비어 있어**, 반듯하게 썰었어, 어슷하게 썰었어, **꾹꾹 눌렀어**, 보들보들하게 구웠어, 노릇노릇 구웠어,
바삭바삭하게 구웠어, **세 개 올렸어**, 보러 가기, 두부, 바다포도, 김, 깨, 파래, 톳, 주먹밥, 과일 꼬치. New step or dish words are
added to this list on purpose (round 6 added 주먹밥 and 과일 꼬치). One phrase is listed but currently banned from the five
kitchen files: '요리 수첩에 넣었어' (`tools/test-cook.js:801`, "slice 1 has no notebook").

**Game-side kitchen labels** (`aria-label` only unless noted): counter button 부엌 (CP:290); dish dialog 요리 고르기 with
chips 해초전 · 주먹밥 · 과일 꼬치 (ES:330-331); cannot-load close button 닫기; the one visible sentence, a toast: '부엌을 못
열었어. 다시 눌러 줘.' (`js/app.js:4142`).

**Meal words** (`js/meal.js:30-60`; visible text = screen-reader text):

| where | text |
|---|---|
| log row label | 식탁 |
| decision (toast and row 1) | '{name}도 같이 먹기로 했어.' · '{name}{은/는} 보기만 하기로 했어.' |
| model path, later | the model's line verbatim · '{name}{은/는} 다락으로 돌아가기로 했어.' · '대답이 없었어.' |
| tails (who decided) | 데모 규칙 · 모델 · 사람이 정함 |
| meal (row 2), today | '{dish}{을/를} 먹었어. 오늘 하루 {fx}{이/가} 따라다녀.' · '{dish}{을/를} 같이 먹었어. 오늘 하루 둘 다 {fx}{이/가} 따라다녀.' |
| meal, a past day | '… 그날 하루 {fx}{이/가} 따라다녔어.' · '… 그날 하루 둘 다 {fx}{이/가} 따라다녔어.' |
| scene description | '식탁에 {dish}{이/가} 있어.' · '{name}{은/는} 식탁 맞은편에 앉아 있어.' · '{fx}{이/가} 따라다녀.' |
| button labels | 식탁 · '식탁, {dish}' · '{dish} 먹기' · 식탁에 앉기 · '{name} 부르기' |
| effect names | 반짝이 (`sparkle`) · 별 (`star`) · 꽃잎 (`petal`) |
| no name | 문어 |
| settings › 누가 고르나 | '지금은 모델이 아니라 미리 만든 규칙이 골라. 고른 이는 포스터와 쪽지 뒷면, 미용실 · 식탁 줄에 적혀.' (ME:109; pinned exactly by smoke O, ES:665, unverified) |

Sentence shapes that pass: a decision as '-기로 했어'; something that happened as '-었어/-았어'; a present fact as '-어/-아';
'-ㄹ래' only for a decision the code really carries out. Particles follow the final consonant through `MEAL.josa`.
Sticker alt texts describe the picture ("엄지 척 하는 요리사 문어 스티커"), never the octopus's words (CS:150).

### 4.2 Forbidden in the kitchen files
`tools/test-cook.js:782`, plain substring search over the **whole text, comments included**, of `js/cook.js`,
`js/cook-art.js`, `js/cook-dishes.js`, `css/cook.css`, `cook.html` (`:780`):

> 맛있 · 좋아해 · 좋아하 · 먹고 싶 · 기다렸 · 아쉽 · 미안 · 실패 · 성공 · 점수 · 완벽 · 최고 · 잘했 · 탔 · 등급 · 메달 · 마마 · Mama

Same test: no `Math.random` (`:797`); no `ppolppol_v2`, `APP.`, `S.`, `BRAIN` (`:798`); no '요리 수첩에 넣었어' (`:801`); Hangul
outside KS X 1001 fails (`:803`); result keys matching `/score|grade|rank|fail|best|star|percent|accuracy|time|duration/i`
fail at any depth and the envelope keys follow a whitelist (`:607-620`); `WORDS` strings may not contain a digit, an N/M
count, or anything outside the smoke-U character set, or the emoticons `zZ Zz ^^ <3 :) ;) T_T >_<` (`:810-816`).
`tools/test-cook-stickers.js:193`: 맛있 and 좋아해 never appear in `js/cook-stickers.js` or `tools/ui-art/cook-stickers.js`;
`:122`: the feeling ids `moved love flush shock ink hmm sweat`.

### 4.3 Forbidden in code-written lines about the octopus (`CLAIM_RX`, `tools/test-brain.js:1808`)
Applied to every Hangul string constant outside comments in `js/brain.js`, `js/app.js`, `js/salon.js`, `js/play.js`,
`js/meal.js`, every string in `js/world.js`, and the lines of 600 generated plans (`:1864-1900`):

> 좋아 · 좋았 · 좋은 · 제일 좋 · 그냥 그런 · 재밌 · 재미 · 싶 · 궁금 · 끌렸 · 끌려 · 꽂혔 · (그걸로/그거면/이만하면/이걸로) 됐 · 됐다 싶 ·
> 어도 됐 · 충분 · 설레 · 신나 · 신났 · 기뻐 · 기쁘 · 기뻤 · 행복 · 편안 · 편해 · 포근 · 반가 · 반갑 · 심심 · 외로 · 그리워 · 그립 · 신기 ·
> 놀랐 · 맛있 · 즐거 · 즐겁 · 맘대로 · 마음대로 · 잘한 것 · 들썩 · 일 것 같 · 설렜 · 아쉬 · 아쉽 · 뿌듯 · 두근 · 편했 · 마음에 들 · 맘에 들 ·
> 반했 · 반하 · 사랑 · 그리웠 · 무서 · 무섭 · 싫 · 슬프 · 슬펐 · 슬퍼 · 부끄 · 지루 · 귀찮 · 고마 · 고맙 · 기대돼 · 기대된 · 흥미 · 미안 ·
> 속상 · 서운 · 섭섭 · 실망 · 짜증 · 화났 · 화가 나 · 감동 · 좋겠 · 원해 · 바랐 · 바래 · 즐겼 · 신이 나 · 든든 · 후련 · 개운 · 상쾌 · 기분 ·
> (어/아/여)야 해 · (어/아/여)야지 · **좋** (any form) · 만족 · 다행 · 흐뭇 · 아늑 · 들떴 · 들뜬 · 들뜨 · 즐기 · 안심 · 설렘 · 외롭 · 그리움 ·
> 쓸쓸 · 짜릿 · 부러워 · 부럽 · 부러웠 · 바라 (not 해바라… and not 바라보/봤/봐/본/볼) · 다리가 무거 · 무거워졌 · 피곤 · 지쳤 · 지쳐 · 기억나 ·
> 기억났

Exceptions are exact strings only. `HONEST_OK` (`:1812-1816`): '보울라인은 당겨도 안 조여서 뱃사람들이 좋아했대', '큰 날개깃이어야
해', '좋은 아침', '좋은 오후'. `DECISION_OK` (`:1817-1820`): `js/salon.js` '응, 해 볼래.' · '그래, 바꿔 볼래.' · '이 색 해 볼래.' ·
'이대로 있을래.' · '지금 색 그대로 있을래.'; `js/play.js` '지금은 구경할래' · '지금은 안 할래' · '이따 할래'. `js/meal.js` has no
exception list: its '-기로 했어' lines pass on their own (`:1874`).

Two more lists: tap lines (`TAP_BAN`, `:1604`) 좋아 · 좋았 · 사랑 · 싫어 · 싫었 · 미워 · 최애 · 취향 · 즐겨 · 반했 · 단골 · 그리워 ·
설레 · 맛있 · 재밌 · 재미있 · 신나 · 신났 · 행복 · 즐거 · 기뻐 · 기뻤 · 슬퍼 · 아쉬 · 미안 · 외로 · 심심 · 내일 · 여기까지 · 기다렸 ·
보고 싶 · 오늘 · 아까 · 방금; brain templates (`PREF`, `tools/test-model-voice.js:222`) 좋아 · 좋았 · 사랑 · 싫어 · 싫었 · 미워 ·
최애 · 취향 · 즐겨 · 반했 · 단골 · 그리워 · 설레.

### 4.4 What the scans do not see (so a reviewer must)
- `js/cook.js` and the other kitchen files are **not** under `CLAIM_RX`, only under the 18-word list: '싶', '기분', '좋은'
  would pass there.
- `index.html` and `cook.html` markup is not under `CLAIM_RX` (smoke U checks characters, not meanings).
- Letters or digits painted into a canvas or a PNG are seen by no test.
- A new file is seen by no word scan until it is added to `tools/test-cook.js:780` or `tools/test-brain.js:1874`.
- The feeling-face check covers only the acts in its `KITCHEN` list (`pick tap sizzle flip cut step done quiet`).

## 5. Device and test matrix, and the definition of done used in rounds 5 and 6

### 5.1 Screens

| screen @DPR | role | kitchen fit today (CP:118-125): device px per art px · CSS px per art px · canvas in art px · food width |
|---|---|---|
| 360 × 740 @2 | **the reference**; every owner report uses it (HO:41) | 9 · 4.5 · 80 × 166 · 261 px (72.5 %) |
| 360 × 740 @3 | target | 13 · 4.33 · 84 × 171 · 251 px (69.8 %) |
| 320 × 568 @2 and @3 | smallest target: stickers are hidden here, the pan bottom must stay above the chip | 8 / 12 · 4 · 80 × 142 · 232 px (72.5 %) |
| 412 × 915 @2 and @3 | target | 10 / 15 · 5 · 83 × 183 · 290 px (70.4 %) |
| 412 × 915 @2.625 | the common Android fractional DPR: the crispness case | 13 · 4.95 · 84 × 189 · 287 px (69.7 %) |
| 390 × 844 @3, safe areas 47 top / 34 bottom | notch case (N10): HUD bottom 111, chip top 730 | 14 · 4.67 · 84 × 183 · 271 px (69.4 %) |
| 360 × 560 @2, 360 × 640 @2 | low screens used by the sticker and layout checks | sticker strip hidden / 64 px |
| landscape, tablets | not targets in rounds 5-6: only "nothing overflows" (L5) | 568 × 320 @2: 1.5 CSS px per art px |
| 1280 × 800 @1 (desktop) | new in round 7: "the owner plays … also on a computer", one desktop size is checked (`COMMON.md:15`, `:196`) | no kitchen pin exists; by the fit formula (CP:108) 6 device px per art px, the same picture continuing sideways |

Fixed layout numbers that tests read: stage 144 × 160 art px (288 × 320 logical), about 80 art px visible across; HUD row
= safe top + 64 (8 + 48 + 8); close 48 × 48 (hit 56 × 56) at 8 px from the top-right; chip 64 × 64, 16 px above the safe
bottom; HUD icons at `floor(2·dpr)` device px per icon px, chip icon at `floor(3·dpr)`; side edge band 24 CSS px.

Modes every screen is checked in: sound off (the default) and on; reduced motion (three sources, F6); keyboard only;
touch through CDP `Input.dispatchTouchEvent` (Playwright's touchscreen only taps, CP:376); light scheme for captures (the
kitchen has no night variant, CP:100); standalone `cook.html` and the embed `cook.html?embed=1`; `file://` and `http`;
the game's 2D fallback (`?scene=2d`) without errors. Automated runs are Chromium only; iOS Safari, WebKit, a real
vibration motor and the sound mix by ear are owner phone checks (CP:408, CP:416, CP:421).

### 5.2 Suites

- **`npm test`** = 17 node commands (`package.json`): `check-world`, `test-brain`, `test-model-voice`, `test-runner`,
  `test-api`, `test-cook`, `test-salon`, `test-cook-stickers`, `test-cook-dishes`, `test-meal`, `test-haptics`,
  `test-play-stickers`, `test-poster-art`, `test-art-extra`, `test-claude-sync`, `test-dye-adopt`, `test-export`.
- **`npm run test:slow`** = 11 commands: `test-scene-perf`, `test-light`, `test-play`, `test-audio`, `test-resume`,
  `smoke`, `test-cook-live`, `test-cook-audio`, `test-cook-stickers-live`, `test-cook-dishes-live`, `test-export --crawl`.
- **Fonts**: `python3 tools/subset-fonts.py --check` → `stale: none`.
- **CI** (`.github/workflows/test.yml`, every push, every branch): `fast` 1 + `fonts` 1 + `plan` 1 + `smoke` one runner
  per scenario name (29 today: A B C D E F G H I W V P L N M O Y R FM S J U T K Q Z X EAT CAM) + `suites` 11 (scene-perf,
  light, play, audio, resume, cook-live, cook-audio, cook-stickers-live, cook-dishes-live, export-crawl, intro) = **43
  jobs**, all green at `96e4722` before the round-6 deploy (`wip/round6/README.md:110`). Round 5 ended at 40
  (`wip/round5/README.md:32`). A failed job uploads its captures.
- Kitchen and meal coverage sits in: `fast` (`test-cook`, `test-cook-stickers`, `test-cook-dishes`,
  `make-dish-icons --check`, `test-meal`, `test-haptics`, `test-brain`, `test-model-voice`, `test-export`), `fonts`, smoke
  **Z** (counter → chooser → embed kitchen; two scenario functions share the letter), **U** (characters), **EAT** (table),
  **O** (the exact '누가 고르나' line), **FM** (first minutes), and suites cook-live, cook-audio, cook-stickers-live,
  cook-dishes-live, scene-perf, export-crawl.
- Adding a test: a new smoke scenario name is picked up by the `plan` job's grep by itself; a new suite needs a line in the
  `suites` matrix and in `test:slow`; a new node test needs a line in `fast` and in `npm test`. Those files are lead-owned
  (X10).
- Every kitchen browser test counts console and page errors: the count must be 0 (L14, C5:19).

### 5.3 Captures
- `docs/shots/cook/` holds 23 PNG made by `tools/cook-shots.js` (seed 12, a fake clock frozen before the page loads, sound
  off, light scheme; a shot is not written if `COOK.live()` or zero-text does not match, CP:383). At 360 × 740 @2 and
  320 × 568 @2: `01-tap-start` (700 ms after open, first-time hand), `02-tap-mid` (4 hits, squash frame), `03-slide`
  (counter → stove, frame 0), `04-flip-cold`, `05-flip-golden`, `06-flip-landed`, `07-slice-start`, `08-slice-mid`,
  `09-result` (t ≥ 6, again chip), `10-result-reduced`. At 412 × 915 @2.625: `01` and `09`. Embed: `11-embed-360x740`.
  Three of these names describe things the new request removes or replaces (the strip in every shot, the again chip in 09
  and 10, the tray step inside the embed capture).
- Lane shots: at most 8 PNG per lane in `wip/roundN/shots/<KEY>/`, looked at before reporting (ES:815). Round 6 examples:
  the chooser at 360 × 740 @2, 412 × 915 @2.625 and 320 × 568 @2; one strip per dish; the call chip, the answer toast with
  its tail, the log rows, after the meal, the next day; the room layout first (default view and 180°, day and night, at
  360 × 740 @2 and 412 × 915 @2.625).
- No commercial game screen is ever stored (CP:383).

### 5.4 Definition of done (C5:650-678, ES:827-840, as carried out in `wip/round6/README.md:91-111`)
1. `npm test`, the slow suites, and the font check with `stale: none`.
2. Eyes on every shot: zero characters in the kitchen and on the chooser, table and chip; food ≥ 69 % of the width at 360
   and 412; HUD holds only what the spec lists; no letterbox, frame or empty page colour; nothing pressable under the
   status bar or the home inset; crisp pixels at 2.625; stickers never over food or guides and absent at 320 × 568; pan and
   stove read as separate shapes; at 320 × 568 the pan bottom stays above the chip; the octopus's face is idle in every
   code-written moment; no aura hearts.
3. One independent check after the merges, by lenses (round 6: kitchen · dishes · dining and honesty · effects and saves ·
   runner and loading), every finding with evidence and one rebuttal pass per lens; then one round of fixes. Round 6 ended
   "must 0 · should 1 (fixed)".
4. CI all green, then production once; the deployment id and commit go into the round README; the deployed build is opened
   at 360 × 740 @2 (status 200, console errors 0, the new features present).
5. Owner phone pass, sound off first: Android buzz at tap, heat-on, flip landing and each cut and none at the plate;
   Settings › 화면 › 진동 silences it; on iPhone nothing feels missing; the first counter tap after the deploy shows the
   chooser; sound on → the ding at golden, sound off → the bell only; call the octopus a few times (it sometimes eats);
   effects are gone the next morning.
6. Docs follow the code: `docs/COOK_PROTO.md` (§2 recipes, §3 judgments, §5 screen, §6 save, §7 API, §8 sound, §9 embed,
   §12 tests and captures), `docs/COOK_STICKERS.md`, `docs/MEAL.md`, `docs/SCENE.md`, and by the lead `README.md`,
   `HANDOFF.md`, `docs/OWNER_DECISIONS.md` (lead choices marked as lead choices).
7. The owner report: conclusion first, 반말, short, with 360 × 740 screenshots.

## 6. Open questions I could not settle from the files

Items 1 to 5 were open when I wrote sections 1 to 5; the lane briefs have since answered them as lead rulings (section
0b). They are listed so that the owner can still overturn them.

1. **Where does the recipe book live?** Lead: inside `cook.html` (`K.md:26`). Consequence: the kitchen's word rules apply
   to it (T6, T7), not `CLAIM_RX`.
2. **Half-made dish and the book.** Lead: a pot with a finished step resumes and skips the book (`K.md:29-30`). The owner's
   sentence says the book opens when the counter is pressed; whether "always" was meant is the owner's call.
3. **The end button when the octopus cannot come.** Lead: only "to the table" is shown; no "again"; the standalone page
   just closes (`K.md:97-102`). Still open: W1 (the label), W13 (the stale snapshot).
4. **Do the old dishes stay?** Lead: all three ids stay with new steps and new pot numbers; two are added. Still open: W4
   (과일 꼬치 locked for players who never finished one).
5. **May new gestures vibrate?** Lead: yes, with the existing buzz names (`COMMON.md:62-63`). Dining sound stays as in
   round 6 as far as the briefs say (T.md adds none).
6. **May the cooking view itself turn three-quarter** (C9)? The briefs fix three-quarter pictures for the finished dishes
   (`SPRITES.md:7-18`); I did not read how the cooking states are to be seen (the rest of `SPRITES.md`).
7. **Is pseudo-writing allowed** in a recipe book picture (C1)? Not needed as briefed: the page is pictograms (`K.md:31-33`).
8. **How does an unowned recipe look in the book?** Lead: a dark silhouette with a lock picture (`K.md:36-37`). Open part: W4.
9. **One day effect per dish?** Lead: yes, five dishes, five effects (`COMMON.md:139-140`). Each new effect still needs its
   name in `js/meal.js`, a known `fx` value and an aura that adds no shader program (E8); `T.md:47-53` assigns this.
10. R7 E5 (a weekend fashion contest with points) is a new owner wish for scores elsewhere; I found nothing saying it
    relaxes the kitchen's no-score rule, and BR §3 restates that rule on the same day.
11. The commit trailer: HO:48 says no model name in commits; round 6 accepted the harness's attribution lines and the
    existing history has them; round 7 says only a `Claude-Session:` line (`COMMON.md:70-72`). Settled for lanes by the
    last one.
12. R7 mentions 24 questions sent to the owner; `ANSWERS.md` was not there, so I could not check any rule above against
    the owner's newest answers.

## 7. What I read, and what I did not

**Opened and read in full or in the cited parts (42 text files)**: the five round-7 lane briefs named in section 0b
(`COMMON.md`, `K.md` and `T.md` in full, `A.md`, the first 30 lines of `SPRITES.md`), `foley/manifest.json` (the `map.cook`
keys, read with a script), and: `wip/round7/briefs/RESEARCH.md`, `wip/round7/README.md`
(twice: it changed while I worked), `HANDOFF.md`, `wip/NEXT.md` (an 11-10 memo; its kitchen item is done, nothing binding),
`docs/OWNER_DECISIONS.md` (all 354 lines), `docs/COOK_PROTO.md` (all 422 lines, the longest lines cut at about 1,000
characters), `docs/COOK_STICKERS.md`, `docs/MEAL.md`, `docs/MODEL_VOICE.md`, `docs/UI_ART.md` (lines cut at 330 characters),
`docs/I18N.md` (lines cut), `wip/round5/cook-spec.md` (§0, §1, §3.5-3.6, §5-12, §16-18), `wip/round6/eat-spec.md` (§0, §1,
§3.5-3.7, §4.3-4.5, §6, §9, §11-16), `wip/round6/audit-11-18.md` (to line 76), `wip/round6/briefs/COMMON.md` (to line
151), `wip/round6/README.md`, the skill `SKILL.md` and its references `ui-rules.md`, `motion-and-feel.md`,
`model-voice-and-play.md`, `companion-loops.md`, `web-engineering.md` (rule headings and the cited passages),
`tools/test-brain.js` (lines 1600-1612 and 1804-1905), `tools/test-model-voice.js` (section list and line 222),
`tools/test-cook.js` (lines 600-622 and 770-830), `tools/test-cook-stickers.js` (lines 100-196), `tools/smoke.js` (the
glyph guard 4294-4308, the scenario list 8070-8104, and grep hits for the tray and table checks), `tools/test-cook-live.js`
(grep hits and N1's lines), `js/cook.js` (the `WORDS` table and the strip references), `js/meal.js` (its Korean strings),
`js/app.js` (grep hits only), `.github/workflows/test.yml`, `package.json`, `tools/export-site.js` (first 60 lines),
`tools/subset-fonts.py` (grep hits), `.gitignore`.

**Screenshots looked at (10)**: `docs/shots/cook/01-tap-start-360x740.png`, `05-flip-golden-360x740.png`,
`07-slice-start-360x740.png`, `09-result-360x740.png`; `wip/round6/shots/K2/tray-360x740@2.png`,
`jumeokbap-strip-360x740@2.png`, `kkochi-strip-360x740@2.png`; `wip/round6/shots/D/1-layout-360.png`;
`wip/round6/shots/M/2-call-chip-360x740@2.png`, `3-toast-eat-360x740@2.png`. What they show for this topic: the strip is
three icons on the same paper chip as the close button; the result has stickers under the HUD row, a '+'-cut dish on a
plate and one loop-arrow chip; the tray is three paper chips over the play room; the answer toast reads '뚜루도 같이 먹기로
했어.' with a smaller '데모 규칙' under it. All three dishes are flat ellipses seen from above, as BR §1b says.

**Not opened, so every statement about them above rests on the documents and is marked (unverified)**:
`tools/test-cook-dishes.js`, `tools/test-cook-dishes-live.js`, `tools/test-meal.js`, `tools/test-cook-audio.js`,
`tools/test-cook-stickers-live.js`, `tools/test-haptics.js`, `tools/test-scene-perf.js`, `tools/test-export.js`,
`tools/cook-shots.js`, `docs/SCENE.md`, `README.md`, the round-6 lane briefs (K1, K2, D, M, R), `wip/round5/README.md`
(one grep line), `js/cook-art.js`, `js/cook-dishes.js`, `js/cook-stickers.js` (grep only), `js/audio.js` (grep only),
`css/cook.css` (one grep line), `cook.html`, `index.html`, the rest of `SPRITES.md`, the other research reports in this
folder (01, 06, 07), `wip/round7/maps/`. Most of `tools/smoke.js` (8,104 lines) and of `tools/test-cook-live.js` (1,438 lines) was not
read; the L- and N-numbered checks are quoted from CP §12.

**Sceptic's notes on my own claims**
- The counts of `again|다시` per file are plain grep counts; in `tools/smoke.js` the word '다시' is common and unrelated, so I
  gave no number for it.
- "29 smoke scenario names" and "43 jobs" are my count of the workflow and the scenario list, and they match the recorded
  "CI 43" in `wip/round6/README.md:110`; a lane that adds a scenario changes the number.
- The follow-on rule in D3 (nothing non-interactive on a paper chip) and every "safe reading" in section 3 are my
  inferences from the cited rules, not owner sentences.
- Line numbers in `docs/COOK_PROTO.md`, the two specs and the tests were taken with `awk`/`grep -n` at `f17d1df`; they drift
  as soon as a lane edits those files. The function, section and test names are what counts.
