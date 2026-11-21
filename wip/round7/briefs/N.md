# Lane N — NPC octopuses and the story (`lane/7-n`)

Read `COMMON.md` first (hard lines 1 to 5; contracts C6, C7, C8), then `ANSWERS.md` (the owner's answers about the NPCs and
the story decide the tone), the owner's words (`wip/round7/README.md` D2, D5), `docs/MODEL_VOICE.md`, `docs/MEAL.md`
section 9, `docs/DIALOGUE_UI.md` (skim), and `wip/round7/maps/player-economy.md` section 8 (the dialogue stub and the
honesty scans, with the forbidden-word lists).

## Why

The owner's story: **the octopuses of this village once helped the people so much and so hard that they grew tired and,
one by one, fell asleep. The people lived on with difficulty without them, and left. The player is someone who happened to
settle here: they used to work in the city at a company where everyone but them was a clever octopus, working very hard,
and they came here worn out.** And: "NPC 문어들도 성격별로 다른 애들 만들어 주고."

This game's spine is honesty about its AI character: the attic octopus is moved by a model or by labelled demo rules, and
code never invents its feelings. The village octopuses are different beings in the fiction, but the player must never
confuse them with the model: **they are scripted characters and say so** (a small label '대본' on their name tag, always).
Their personality shows in how they talk, what they notice and what they do, not in claimed feelings (unless ANSWERS.md says
the owner chose otherwise).

## You own

New files: `js/npc.js` (global `NPC`, DOM-free: the roster, the lines, the story notes), `js/dialogue.js` if you replace the
stub (or edit `js/dialogue-stub.js`: it is yours), `tools/test-npc.js`, `tools/test-npc-live.js`, `docs/NPC.md`,
`docs/STORY.md`. `js/app.js` under `[7-N]`; `index.html` and `css/style.css` under their `[7-N]` markers; `js/intro.js`
only for the first-run lines (below). You edit no other existing line.

## What to build, in this order (push after each)

1. **The roster** (`NPC.roster`): three shopkeepers — ids `clothes`, `goods`, `cafe` — each with a short Korean name (no
   real person's or product's name), a body colour from the game's palette clearly different from the six attic-octopus
   colours' defaults, a hat (`beret`, `apron`, `cap`: contract C6), a way of speaking, and a habit. Example directions, to
   make them different people: the clothes keeper is exact and brief and notices details of what you wear; the general
   store keeper talks a lot and keeps lists of everything; the cafe keeper speaks slowly, about the weather and the sea.
   Plus four sleepers `sleep-1` … `sleep-4` (colours only). `NPC.list(dateKey)` → what lane V's `scene.npcSet` needs.
   At boot and on day change the app calls `scene.npcSet(NPC.list(today))` if it exists.
2. **Lines** (`NPC.line(id, key, vars, seed)`), 3 to 5 variants per key, short (two lines of 14 Korean characters at most,
   one or two bubbles): keys of contract C7 (`shop.hello`, `shop.thanks`, `shop.none`, `cafe.hello`, `cafe.serve`,
   `cafe.gift`, `contest.open`, `contest.result`) and `talk` (touching the keeper: small talk; some variants carry the
   story: what the village was like, who slept first, what the keeper does now). Rules for every line: plain 반말, no
   emoji or symbols, nothing about the attic octopus's feelings or wishes, nothing that tells the player to hurry or come
   back, nothing that claims the keeper is a model or "thinks". The keepers may state facts about themselves in the story
   ('나는 작년 겨울에 깼어.').
3. **The dialogue box** (`APP.npcSay(id, key, vars)` → a Promise): a pixel-styled box in the game's paper look at the
   bottom of the scene with the speaker's name tag ('<name> · 대본'), a small portrait if lane V's octopus can be drawn to
   a canvas (else a plain coloured octopus icon you draw), the text, touch to continue, and nothing covering the footprint
   handle or the main button longer than the line needs. The stub's gaps are listed in map 8.2 (speaker field, label,
   the emoji button to remove). `scene.npcMark(id, true)` while that NPC speaks, if it exists. Touching a keeper's button
   (`#btn-npc-clothes`, `-goods`, `-cafe`) says a `talk` line.
4. **Traces of the story.** The notice board (`#btn-plaza-board`) opens a small sheet with four old notices as pictures
   with one short line each, telling the story in order without explaining it (help wanted from the octopuses; a record
   catch thanks to them; "the octopuses are sleeping, please keep quiet near the pier"; the last families leaving and
   asking whoever comes to look after the sleepers). A sleeper touched (if lane V gives them buttons later) says nothing:
   one house-voice line at most ('자고 있어.'). Seen notices are kept in `S.user.story` (C8).
5. **The first minutes.** A new player, after the title and before naming the octopus, sees three short lines, one at a
   time, over the sky (touch to continue, skippable, never shown again): the city company where everyone else was an
   octopus working hard; coming to this quiet seaside village worn out; finding one octopus awake in the attic. Keep the
   existing intro's timing and tests intact; with reduced motion the lines simply appear.
6. Write `docs/STORY.md` (the story as the game tells it, where each trace is) and `docs/NPC.md` (roster, voice rules,
   every line).

## Honesty checks you must build

`tools/test-npc.js` reads the forbidden-pattern source from `tools/test-brain.js` (extract `CLAIM_RX` and `TAP_BAN` from the
file's text so that there is one source of truth) and applies it to every NPC line unless ANSWERS.md allows feeling words
for NPCs; in every case it checks: the label '대본' is on every NPC name tag, no line contains an emoji or symbol, no line
mentions the attic octopus's feelings, no line contains hurry or return-pressure words ('빨리', '놓치', '마지막', '꼭 와'),
every key of C7 has at least three variants for the right ids. `tools/test-npc-live.js`: the box shows the right name and
label, closes, never traps focus, works with the keyboard and a screen reader (`aria-live` polite), and does nothing when the
outside is absent (2D).

## Report

As in `COMMON.md`, plus every line of text you added (the owner will read them all).
