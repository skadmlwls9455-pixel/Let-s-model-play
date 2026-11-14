# Round 4 — final independent check of the merged game (read-only) — lane V1 / V2 / V3 / V4

Read `wip/round4/briefs/COMMON.md` first (project, hard lines, setup, probe helper). Then `HANDOFF.md` §2 (the 14
items), `docs/OWNER_DECISIONS.md` section "주인 답 (11-15 00시 KST …)", and `wip/round4/reports/*.md` (what each lane
says it did, decided, left and did not verify).

## Your job

Lanes A-G were built separately and merged into `claude/game-launch-completion-hwvre5` (your checkout). Text
shortening (lane H) is still running and will be merged later: **ignore text length and font size** — everything
else is in scope. Play the merged game like the owner does — a phone in portrait (360x740 first; also 320x568 and
412x915; real touch via CDP where gestures matter; pixel font on, the default) — and find what is broken, missing
against the owner's words, or inconsistent between features that were built apart. You do **not** edit game code.
You may write probe scripts under `wip/round4/verify/<your label>/` and screenshots there (small PNGs).

Report each finding with: severity (`must` / `should` / `nit` as in COMMON.md), a one-line title, exact steps to
reproduce from a fresh seeded save (state the seed: lantern level, days, hour, room), what you saw vs what the owner
asked (quote the brief or decision), evidence (screenshot path, numbers, console errors), and your guess at the
place in the code (file and function) — a guess, marked as such. Do not report text length. Do not report things a
lane report already lists as a deliberate decision unless it breaks a hard line or the owner's words.

Write the report to `wip/round4/verify/<your label>.md` (conclusion first: the list of must / should findings in one
table), commit it with your screenshots and probes, and push once to the branch named in your task message. No
pull request. Your final message is the same table.

## Your slice (your task message names your label)

**V1 — rooms and camera together.** Two-finger 360° turn (item 8) in the attic, loft, play room and the **yard**:
near walls cut to knee height with everything mounted on them, no void or outside faces at any angle and zoom step,
pinch and twist together, inertia, reduced motion, the stick at every angle, hotspots and taps at every angle
(doors, stairs, sewing machine, arcade, kitchen counter, mirror, the yard door and plots), the octopus and the
character facing the camera, the salon scene, a walk departing / returning while turned, room changes while turned.
The stairs cue (item 12) at night from every angle, and the night brightness (item 11) at 19:00-21:00 steps. The
furniture mode (item 7) opened while turned (angle goes to 0), dragging at the walls, red refusal, 90° turns, size
buttons, cancel / save, a walk starting during the mode, the candle on the crate, the octopus never inside a piece.
The yard (item 13) at night and in rain, while turned, the door shared with the octopus's walk (during its
depart / return ceremony), the unlock at 7 / 15 / 30 days.

**V2 — screens and flows.** The sewing machine (item 2: first real-touch tap opens it and presses nothing; the sheet
is calm, about half the screen; the set list folded), the kitchen counter → cooking overlay and back (item 3; the
weekly 'kitchen' task still counts; sound stays off by default), the hammer icon (item 4, at 1× and 3× DPR, light
and dark), the loading octopus (item 5: throttle the network / delay scripts so loading is visible; the red vector
octopus must never flash; it disappears when the game shows; reduced motion), the runner (item 6: portrait full
screen on 320x568 / 360x740 / 412x915 and a landscape phone, the two round buttons, no other UI, old best shown as
'예전 게임 최고', a run that ends and restarts, the close button), the thought bubble (item 9: clean rounded pixel
shape, small, no spikes, near scene edges, both fonts), the home-screen install (PWA: manifest, icons, installable
on http://127.0.0.1 from `node tools/export-site.js` output served with `python3 -m http.server`, no service-worker
trap that keeps an old build), the 2D fallback (`?scene=2d`) still playable for all of the above that exists in 2D.

**V3 — honesty, sound and saves.** Item 10 and the two confirmed defaults: in demo trips no '우쭐' / '덤덤' anywhere
(bubble, log row, diary, album, poster, screen reader text), faces of code-written rows are idle, a model-chosen
reaction keeps its word and face (use the MCP / dev replay path, see `docs/MODEL_VOICE.md`), no joy squeak on the
4th pet, the '-ㄹ래' lines only where the code does that decision, the album's empty notes text, old pre-11-10
'힌트: …' lines hidden, mood sounds only for model / person reactions. Sound off by default: no audio request or
AudioContext before a user gesture in any new screen (yard, cook overlay, runner, furniture mode, loading). Saves:
build production-shaped saves (with a furniture layout using 15° / 0.85 values, three planted plots, a runner-1 best,
dyes and shells, trips with old hints) and load them in the merged build: nothing lost or changed silently, the
garden migrates to six entries without moving the three, the layout loads unchanged. Export / import / reset still
work. No emoji or symbol characters in any new player-facing text (grep the diff `git diff 5bb3db8 -- '*.js'
'*.html' '*.css'` for non-Korean symbols in strings). No console errors over a long session (a walk, the yard, the
runner, cooking, furniture mode, turning).

**V4 — what is missing (completeness critic).** Do not play for long; read. For each of HANDOFF's 14 items and each
line of the owner's 11-15 decisions, find where it is implemented (file and function) and whether every part of the
owner's words is covered (for example item 6's "점수·최고는 무대 위쪽에 작게", item 8's "다락·2층·놀이방·마당 모두", item 13's
"생기는 날 짧은 한 줄"). Then read every lane report's "left" and "not verified" lists and say which of those a player
would notice. Check the docs that describe changed behaviour (README '화면' section, `docs/SCENE.md`,
`docs/MINIGAME.md`, `docs/OWNER_DECISIONS.md`) for statements that are now false. Output a table: item → status
(done / partial / missing) → evidence → what to do. Also run the whole fast suite and the font check once.
