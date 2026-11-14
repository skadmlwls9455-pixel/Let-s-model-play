# Companion / pet / idle game design — loop rules for 뽈뽈 문어

Research angle: games where a creature goes off on its own and brings something back (Travel Frog, Finch, Neko Atsume, Pikmin Bloom), games with slow environmental reveal (A Dark Room, Kittens Game), and one-per-day ritual games (Wordle, Spelunky daily, Animal Crossing). Every rule at the end is written for the octopus game's concrete elements: 힌트 입력, 뽈뽈 다녀와 버튼, 로그, 포스터 앞/뒷면, 벽, 등불, 방 서술문, localStorage 기록.

Network note: in this session only GitHub raw files and the search index were reachable; Wikipedia, Quartz, Game Developer, Pocket Gamer, TheNextWeb, etc. were summarised via search snippets, not read in full. Where a claim rests on a snippet rather than the article body it is marked (snippet). Star counts come from the GitHub search API on 2026-11-04.

---

## 1. Sources

| # | Source | Stars / type | What it gave us |
|---|---|---|---|
| S1 | Travel Frog (旅かえる) — Wikipedia article (snippet) | encyclopedic | Player only packs; frog away "up to four days"; "each player can receive slightly different pictures from the frog even from the same destination"; mechanics designed to be posted on social media. |
| S2 | Bloomberg / The Star, "26-year-old woman who doesn't code creates Asia's hottest game" (Mayuko Uemura interview, 2018) (snippet) | interview | Inspiration = "the feeling of waiting for a loved one to return from a trip"; "We are definitely making people wait, and sometimes I worry… aren't we making people wait too long?"; "I don't want to develop games where you have to focus too much." |
| S3 | SCMP Young Post, "How to play Hit-Point's minimalistic Travel Frog" (snippet) | guide | Packing = three categories (food, charm, gear); "players actually play a limited role… apart from preparing food and patiently waiting." |
| S4 | Pocket Gamer, "Tabikaeru review: the secret to a rewarding life" (snippet) | review | Frog at home "reading a book (and dozing off), eating breakfast, sharpening tools, and writing letters." |
| S5 | AP via Inquirer, "Holidaying frog game finds fans among China's harried youth" (snippet) | reportage | Players call the frog their child; "Now I know how my mom felt when she waited for me to come home." Players fear a lingering frog "has lost interest in travel." |
| S6 | TheNextWeb, "This tiny Buddhist frog is haunting me"; Quartz, "…a philosophical lesson about letting go" (snippets) | essays | The pleasure is in *not* controlling; "no control over when and where the frog goes, or when it will return." |
| S7 | YunLambert/TravelFrog_Tool — reverse engineering of the Android build | 112 ★ | Common postcards are composed from "several background templates + several animal pose templates"; rare ones are hand-drawn; destinations are a node/edge graph with pathfinding; terrain and carried items change travel time; trip length depends on previous rest/trip; postcard type tied to place + time. |
| S8 | Neko Atsume — Wikipedia, CEDEC 2015 best game design (snippet); fan wikis | encyclopedic | Cats visit only while the app is closed; mementos arrive after a random number of visits; no end state. |
| S9 | Cutting, Gundry, Cairns, "Busy doing nothing? What do players do in idle games?" (IJHCS 2019, White Rose eprint) (snippet) | peer-reviewed | Neko Atsume as the "extreme" case of "progress while gone"; "there is never a penalty for opening the game, beyond the time it takes to do so." |
| S10 | Alharthi et al., "Playing to Wait: A Taxonomy of Idle Games" (CHI 2018) (snippet) | peer-reviewed | Idle games "feature a balance between rules that encourage players to leave the game and rules that reward them for returning"; foreground vs background engagement. |
| S11 | doublespeakgames/adarkroom — `script/room.js`, `script/outside.js` (read in full) | 8.4k ★ | Exact state strings and timers: fire = dead / smoldering / flickering / burning / roaring; room = freezing / cold / mild / warm / hot; title flips "A Dark Room" → "A Firelit Room" at fire level 2; village title by hut count ("A Silent Forest" → "A Lonely Hut" → "A Tiny Village" → … → "A Raucous Village"); "check traps" button only appears after the first trap; fire drops one level every 5 min; stranger arrives, then "the stranger is standing by the fire. she says she can help." |
| S12 | Pocket Gamer.biz, "Shedding light: the making of A Dark Room"; InformIT "Interface lessons from A Dark Room" (snippets) | interviews | Townsend designed "around potentially distracted users to capture their attention before the first big reveal"; story told "entirely through environmental cues"; Rajan: the constraint "removed the noise." |
| S13 | nuclear-unicorn/kittensgame — README (read in full) | 115 ★ | Design rules: "Encourage active play, but don't require it"; "every solution should introduce a new problem"; reuse existing resources before adding new ones. |
| S14 | candybox2/candybox2.github.io | 614 ★ | Reference point for the progressive-reveal genre A Dark Room cites as inspiration. |
| S15 | Game Developer, GDC 2022 "Josh Wardle reflects on the unconventional road to Wordle's success"; RNZ interview (snippets) | talk coverage | One puzzle/day "creates a sense of scarcity"; "if it was the same word for everyone, there was suddenly this social aspect"; the emoji grid "becomes a way in which you can share that story" of near-misses "without ruining the game for others." |
| S16 | Spelunky Daily Challenge — Game Developer "destined to infuriate, engage players"; Derek Yu via PlayStation Blog (snippets) | design article | Same seed for everyone, one attempt per day: the score "reflects skill and game knowledge rather than luck of the draw." |
| S17 | Pikmin Bloom — Pikipedia "Postcard"; pikminbloom.com launch post (snippets) | wiki / official | Postcards = photo of a nearby place + its name + one of four randomly chosen stamps; "rewards you for walking in new areas… awarding you with unique discoveries"; end-of-day review of steps and routes. |
| S18 | Animal Crossing: New Horizons — GamesRadar developer interview (Aya Kyogoku); pixelpoppers "Nook Miles+ and binge-playing" (snippets) | interview / essay | Real clock, day resets at 5 AM; "largely meant to be played in daily bursts"; fossils once/day, trees once/day; "never punishes players for missing a day." |
| S19 | Finch — Android Authority hands-on; habitbox.app review; Comic Watch (snippets) | reviews | Bird "heads out and returns about six hours later with a discovery to share"; "streaks never penalize missed days"; mission "no guilt, no pressure." |
| S20 | Tamagotchi effect — Wikipedia; Wellcome Collection "Digital pets" (snippets) | essay | Original criticism was "life expectancy of the pet if left unattended"; later models added pause; death imagery sanitised for the West; pets inspire "either attentive care or neglectful guilt." |
| S21 | Project Horseshoe 2017, "Coziness in Games: Safety, Softness, and Satisfied Needs" (Daniel Cook et al.); Kitfox "Designing for Coziness" (snippets) | design report | Coziness = safety + abundance + softness; "no impending loss or threat"; cozy games "don't expect the player to struggle to get basic needs met." |
| S22 | ykhli/AI-tamago — "LLM-generated and LLM-driven virtual pet with thoughts and feelings" | 533 ★ | Closest open-source precedent for an AI-as-pet UI; useful as a positioning reference for the MCP release, not for mechanics. |

---

## 2. What these games actually do (the facts the rules rest on)

### 2.1 Travel Frog: the player packs, the frog decides
Everything the player can do happens before departure: harvest clover, buy food/charms/gear, pack three slots (S3). The frog leaves when it wants, is gone "up to four days" (S1), sends photos mid-trip and brings souvenirs home. At home it reads, dozes, eats breakfast, sharpens tools, writes letters (S4). Players cannot interact during the trip; they only wait (S2/S6).

Three design facts matter most for us:

1. **Items are probability, not command.** Reverse engineering (S7) shows a node/edge destination graph with pathfinding; carried items and terrain shift travel time and reachability, and the trip length depends on how long the frog rested and on the previous trip. The player nudges; the system decides.
2. **Postcards are composed, with a hand-drawn rare tier.** Common photos = background template × frog-pose template (S7); rare photos are individually drawn; type depends on place and time. Wikipedia adds that two players get "slightly different pictures even from the same destination" (S1).
3. **The emotional core is waiting.** Uemura: the game came from "the feeling of waiting for a loved one to return" and she herself worried "aren't we making people wait too long?" (S2). Players literally call the frog their child and fear a frog that lingers at home "has lost interest" (S5). That last point is a warning: a homebody state with no visible activity reads as *loss*, not as *rest*.

### 2.2 Neko Atsume: progress only while you are gone
Cats only visit while the app is closed; you open it to see who came, photograph them, and collect fish and occasional mementos (S8). Academic work calls it the "extreme" case of "progress while gone", and notes "there is never a penalty for opening the game, beyond the time it takes to do so" (S9). Mementos arrive after a random number of visits, so each return is a small, non-punishing lottery.

### 2.3 Finch: the adventure is a story the bird tells you
Completing your own small goals gives the bird energy; when energy is full it "heads out and returns about six hours later with a discovery to share" (S19). Reviews consistently note that streaks "never penalize missed days" and the stated mission is "no guilt, no pressure" (S19). The bird's discoveries belong to the bird; the human's reward is hearing about them.

### 2.4 Pikmin Bloom: a postcard = one place + one random stamp
Postcards are a photo of a nearby location plus its name, with one of four stamps picked at random; seasonal variants exist; friends can exchange them (S17). The game explicitly rewards "walking in new areas" with "unique discoveries" (S17). The end-of-day lifelog is a receipt of the walk.

### 2.5 A Dark Room / Kittens Game: the room tells you its state in one line
From `room.js` (S11): fire has five words (dead, smoldering, flickering, burning, roaring), temperature has five (freezing, cold, mild, warm, hot), and the page *title* flips from "A Dark Room" to "A Firelit Room" when the fire reaches level 2. The outside area's title steps through six village names by hut count. Buttons appear only when meaningful ("check traps" exists only after a trap is built). The fire decays one level every five minutes, but nothing dies; the builder "just shivers" when it is cold. Townsend designed to "capture their attention before the first big reveal" with distracted players in mind (S12). Kittens Game's README (S13) adds "Encourage active play, but don't require it."

### 2.6 Wordle / Spelunky daily / Animal Crossing: one per day, same seed, shareable card
Wordle: one puzzle a day "creates a sense of scarcity"; because it is "the same word for everyone", the result became social; the emoji grid shares "that story" of near-misses "without ruining the game for others" (S15). Spelunky: one attempt per day on a shared seed so results "reflect skill… rather than luck of the draw" (S16). Animal Crossing: real clock, 5 AM reset, "played in daily bursts", one-per-day resources, and "never punishes players for missing a day" (S18).

### 2.7 Tamagotchi: what to avoid
The original critique was death from neglect; later models added pause (S20). The lesson for a welfare-themed companion is unambiguous: no hunger meters, no decay timers, no "you were gone 3 days" screens.

---

## 3. Rules for 뽈뽈 문어

Priority: **must** = clearly better and cheap; **should** = valuable; **nice** = optional polish.

### A. Limited agency is the core pleasure

**R1 (must) — The human has exactly one verb.** Travel Frog's entire input is packing (S3); Uemura explicitly did not want a game "where you have to focus too much" (S2). *Apply:* the main screen shows only the 힌트 input (placeholder: "비워두면 오늘은 네가 골라") and the 뽈뽈 다녀와 button. Move 외출/귀가/포스터/마무리 manual buttons into a collapsed `<details>` labelled 데모 조작, closed by default, and never reference them in the normal flow.

**R2 (must) — Go-or-stay is the octopus's roll, and "stay" is a first-class branch.** Travel Frog's frog sometimes just stays in and reads (S4), and players only panic when the homebody frog shows *nothing* (S5). *Apply:* on 뽈뽈 다녀와, the seeded RNG picks 외출 (~78%) or 집 (~22%). The 집 branch must have its own 6–10 micro-scenes (창가에서 빗소리 듣기, 그물 손질, 어제 포스터 다시 보기, 낮잠), its own log entries, and its own poster. Never render an empty room with no line.

**R3 (should) — The hint is a pack, not a destination.** In Travel Frog items shift probabilities on a node/edge graph (S7). *Apply:* model topics as a small graph (`모자 → 깃털 → 새 → 철새 경로…`). The hint sets the first node with ~60% probability; each subsequent hop follows an edge weighted by **demo-rules weights** (seeded, kept inside the demo chooser, never written as the octopus's taste and never sent to a model; `model-voice-and-play.md` §5) and the "odd rooms" list, so the log reads "모자 보러 갔다가 깃털에 한눈팔았어" with `by: 'demo-rules'`. An empty hint starts from a seeded pick among the start nodes. With a model, the model picks each hop from the menu and these weights are not used.

**R4 (should) — Nudge toward untrodden paths with a visible badge.** Pikmin Bloom rewards "walking in new areas" (S17). *Apply:* keep `visits[nodeId]` in localStorage; multiply edge weight by `1/(1+visits)`; on the receipt, mark a never-visited node with a "처음 가본 곳" chip. Odd rooms start at zero so they surface naturally.

### B. Anticipation and reveal pacing

**R5 (must) — Progress happens while the human is not looking; the reveal is on return.** Neko Atsume's cats only come while the app is closed (S9); Finch's bird returns six hours later with a discovery (S19). *Apply:* after 뽈뽈 다녀와, the room goes to an 외출 중 state (lantern dim, octopus gone, one changing line: "창밖엔 빗소리만", "아직 안 돌아왔어"). Log entries stream in one at a time (1.5–4 s apart, seeded jitter) and the poster is hung only after the 귀가 entry. Never show the poster before the log finishes.

**R6 (should) — Keep the in-session wait short (25–60 s) but real; support a true overnight wait as an option.** Uemura worried her 4-day trips were too long (S2); Finch's six hours works because the app is a background habit (S19). For a web page opened on purpose, a sub-minute wait preserves the "did it come back yet?" feeling without losing the viewer. *Apply:* total log duration 25–60 s. Also persist `pendingTrip = {departedAt, seed}`; if the tab is closed mid-trip, on next open resolve it instantly: play a 다녀왔어 door animation and hang the poster. No 빨리 와 button anywhere.

**R7 (should) — Hold attention before the first reveal.** Townsend designed for "potentially distracted users… before the first big reveal" (S12). *Apply:* the very first trip must be shorter (~20 s) and must end with the moss pot appearing on the windowsill *and* the first poster, so a first-time viewer sees both loops close within half a minute.

### C. Poster composition

**R8 (must) — Front = one scene, one sticker, one line. Not a summary.** Travel Frog common photos are background × pose templates with per-player variation (S1, S7); Pikmin postcards are one place + one random stamp (S17). *Apply:* the octopus picks exactly one `chosenStop` from the receipt (weighted toward the distraction, not the hint), one sticker from a set keyed to that stop's category (깃털, 조개, 톱니바퀴, 물음표 for odd rooms), and one first-person line ≤ 28 Korean characters built from templates with `{hint}` and `{distraction}` slots. Seeded paper tint, ±3° rotation and tape position give "slightly different pictures from the same destination".

**R9 (must) — Back = the receipt, honest to the byte.** Pikmin's lifelog and Spelunky's daily results exist because the walk itself is the record (S16, S17). *Apply:* tap flips the card (CSS `rotateY`, `prefers-reduced-motion` fallback = instant swap). The back lists: 날짜, 힌트 (or "힌트 없음"), 결정 (외출/집), each stop with a status chip — 읽음 (real fetch 2xx), 읽기 실패 (network/4xx/5xx), 모의 방문 (demo, no network) — plus 돌아온 시각 and the short seed id. A 200 is only shown when a real fetch returned one.

**R10 (should) — A rare tier, seeded and infrequent.** Travel Frog hand-draws rare postcards and Neko Atsume's mementos arrive after a random number of visits (S7, S8). *Apply:* ~1 in 6 trips rolls a 특별한 장면: a visitor sticker (달팽이), a two-sticker poster, or an odd-room scene with a distinct frame. Because it is seeded, the same day + hint reproduces it; the human cannot grind for it.

**R11 (should) — The one-liner is the octopus's voice, never a report to the human.** Finch's discoveries belong to the bird (S19); the welfare doc says outputs are the octopus's memory. *Apply:* first person, present or simple past, no "당신을 위해", no stats. Template bank examples: "{hint} 보러 갔다가 {distraction}에 한눈팔았어", "오늘은 창가가 더 좋았어", "{distraction}는 생각보다 조용했어".

### D. Daily seed and ritual

**R12 (must) — Seed = date + hint.** Spelunky: same seed for everyone, one attempt per day (S16); Wordle: same word for everyone makes the result social (S15). *Apply:* `seed = hash(`${YYYY-MM-DD}|${hint.trim().toLowerCase()}`)` through a tiny mulberry32 PRNG used for every decision (go/stay, path, chosen stop, sticker, framing, rare roll). Same theme tomorrow gives a different poster; pressing again today replays the same walk.

**R13 (should) — One invitation per day, framed as rest, not as a lock.** Wordle's scarcity (S15); Animal Crossing's 5 AM daily reset and one-per-day resources (S18). *Apply:* after today's trip, the button text becomes "오늘은 다녀왔어 · 내일 또 올게" (disabled, no countdown timer visible — a timer reads as a cooldown). The 데모 조작 panel keeps a "날짜 넘기기" override for testing. The day boundary can be 05:00 local like Animal Crossing so a late-night session counts as today.

**R14 (nice) — A shareable emoji card with no spoilers.** Wordle's grid tells the story of the attempt without giving the answer (S15). *Apply:* a 복사 button on the receipt producing e.g. `뽈뽈 #37 ☔🐙 → 🎩 → 🪶 → 🏠  집에 걸었어`. Path emojis come from stop categories; no URLs, no hint text, so it is safe to post. **Project override (뽈뽈 문어, owner 11-07):** no emoji in player UI, so the card uses category words instead: `뽈뽈 #3 · 비 오는 날 · 손 · 바다 · 들판` (see SKILL.md §3).

### E. Wall, lantern and room state

**R15 (must) — Persist each trip as one record; render the wall from records.** Neko Atsume's Momentos album and Travel Frog's photo album are the retention hook (S1, S8); the user's bug (album empty after reload) is exactly this. *Apply:* `trips[]` entries `{id, date, seed, hint, decision, stops[{title, url?, status}], chosenStopId, sticker, line, placement{x,y,rot,paper}, rare?, lanternAfter}`. The wall maps over `trips` on load; tapping a poster opens the flip card for that record. Keep a `version` field for migrations.

**R16 (must) — Lantern +1 per invitation (go or stay); trip count only for real outings.** A Dark Room's builder arrives because the room is warm, not because the player clicked more (S11); cozy design means "no impending loss" (S21). *Apply:* `lantern = min(8, invitations)`; `trips = outings`. Furnishings key off `lantern`, not `trips`: 1 이끼 화분(창턱), 2 나무 상자, 3 양초, 4 담요, 5 책 한 권, 6 찻잔, 7 커튼, 8 작은 거울. Staying home therefore furnishes the room at the same rate.

**R17 (must) — One line of room state that changes with the lantern, A Dark Room style.** `room.js` has five fire words and flips the title at level 2 (S11). *Apply:* a `roomLine[lantern]` array and a `roomTitle` that steps 어두운 다락 (0) → 등불 켜진 다락 (2) → 살림이 생긴 다락 (5) → 문어의 다락 (8). Example lines: 0 "등불은 꺼져 있다. 빗소리만 들린다." 1 "등불 한 칸. 창턱에 이끼 화분이 놓였다." 4 "담요가 상자 위에 접혀 있다. 방이 조금 따뜻하다." Update the `<title>` too, like A Dark Room.

**R18 (should) — Reveal UI only when it means something.** A Dark Room creates "check traps" only after the first trap (S11). *Apply:* hide the 벽 section until the first poster exists; show the "톡 눌러 뒤집기" hint only until the first flip; show the 여행 횟수 counter only after the first real outing; keep 데모 조작 folded.

**R19 (should) — The furnish moment is its own tiny reveal.** Townsend's environmental storytelling (S12). *Apply:* when the lantern ticks, add one log entry in the octopus's voice ("창턱에 이끼 화분을 올려뒀어") and fade the new asset in over ~600 ms after the poster is hung, not simultaneously, so each return has two beats: poster, then room.

### F. Zero punishment, staying home as charm

**R20 (must) — No decay, no hunger, no streaks, no "you were away" screen.** Tamagotchi's founding critique was death from neglect (S20); Neko Atsume has "never a penalty for opening the game" (S9); Finch streaks "never penalize missed days" (S19). *Apply:* nothing in state depends on wall-clock gaps. Reopening after a month shows the same room, the octopus doing a home micro-scene, and the normal button. Remove any copy that counts missed days.

**R21 (must) — Staying home gets a poster of equal size and an equal lantern tick.** Travel Frog's at-home frog reads, dozes and writes letters (S4), and the only sadness players report is an *inactive* frog (S5). *Apply:* the 집 branch produces a poster on a different paper tint (e.g. 연한 미색) with a home sticker (찻잔, 빗방울, 책갈피) and a line like "오늘은 창가에서 비 구경했어". Same dimensions, same wall placement rules, receipt reads "결정: 집에 있기 · 들른 곳 없음". No confirm text, no "다음엔 나가볼까?" nudges.

**R22 (should) — Status chips carry the honesty; tone carries the softness.** Cozy = safety + softness (S21); the welfare doc forbids fake success. *Apply:* chip palette: 읽음 (green-ish, muted), 읽기 실패 (grey, never red), 모의 방문 (dotted outline, label "데모"). Failure lines in the octopus's voice are neutral: "문이 잠겨 있었어" rather than "오류".

**R23 (nice) — Occasional visitors while the octopus is away.** Travel Frog's snail/bee/turtle at the door and Neko Atsume's cats make the empty room an event (S1, S8). *Apply:* ~1 in 8 outings, the 외출 중 state shows a seeded 손님 (달팽이) at the attic door leaving a leaf; it appears as one receipt line ("문 앞에 달팽이가 다녀갔어") and, if R10's rare roll hits, as the sticker.

**R24 (nice) — Nothing requires presence; everything resolves on open.** Kittens Game: "Encourage active play, but don't require it" (S13); idle games balance "rules that encourage players to leave… and rules that reward them for returning" (S10). *Apply:* every timer is derived from `Date.now() - departedAt` against the seeded plan, never from `setTimeout` state alone, so a background tab, a refresh or a phone lock all land on the same outcome.

---

## 4. Suggested asset list implied by these rules (for the hand-drawn pass)

- Octopus: 외출 복장 1, 집 micro-scenes 4 (창가, 그물, 낮잠, 책).
- Room layers: lantern 0–8 glow states (CSS can do this), furnishings 8 (이끼 화분, 나무 상자, 양초, 담요, 책, 찻잔, 커튼, 거울).
- Poster frames: 외출 paper, 집 paper, rare frame; tape × 3; stamp/stickers ~12 (깃털, 조개, 톱니바퀴, 물음표, 찻잔, 빗방울, 책갈피, 달팽이, 별, 열쇠, 나뭇잎, 돋보기).
- Scene thumbnails by topic category (~8 categories), composed like Travel Frog's background × pose templates rather than one image per place.
- 손님: 달팽이 at door, one leaf.

---

## 5. Sanity check against the welfare principles

| Principle | Rules that enforce it |
|---|---|
| Human cannot direct (hint only, ignorable) | R1, R3, R12 |
| No confirm-shaming / sulking when staying home | R2, R21, R13 |
| No fake success | R9, R22 |
| Outputs are the octopus's memory | R8, R11, R14 |
| Odd rooms mixed in | R3, R4, R10 |
| Nudge toward less-trodden paths | R4 |
| Persistence so the wall is there tomorrow | R15, R16, R24 |
