# Lane F "honest": honesty round 3 (branch `lane/f-honest`)

Read `wip/round4/briefs/COMMON.md` first.

## What to do

HANDOFF item 10: "정직 표기 3차 (주인 답 C3(b)·C4(a)·C6(b)·Q4(b)): 데모가 고른 반응에 pet_happy 표정 안 씀 / '-ㄹ래'
말투는 실제로 고른 경우에만 되살림 / 가만히 있을 때 표정 넣기 / 데모 반응 우쭐·덤덤 숨김 / 앨범 빈 칸 문구."

The full job is written in **`wip/round3/briefs/fix-honest3.md`** — do all five items there (C3 b: no joy squeak
`pet_happy` on the 4th pet, keep squish / strokes, update the docs that describe it · C4 a: bring back '-ㄹ래' / '-ㄹ게'
where the code really does that decision, the small warmth pass, the facts check in `tools/test-brain.js` plus the gap
H1 words · C6 b: every face that code picks for code-written text shows `idle` (sleep stays a state), the model's /
a person's chosen reaction keeps its face · Q4 b: in demo trips the mood words '우쭐' / '덤덤' are not shown anywhere,
'폴짝' / '졸림' stay, saved data unchanged · the album's empty text made true), its docs and its tests. **Ignore** that
brief's paths and environment parts: the `/tmp/…/scratchpad/final/…` folders, `/home/user/ppolppol-fix-honest3`, the
base commit `46d5d5a` (that work is already in your base), "Lanes", "Do not commit" and its probe references — work in
your own checkout as `COMMON.md` says. Line numbers in it are approximate; find the places with grep.

Also two defaults the owner confirmed on 11-15 (`docs/OWNER_DECISIONS.md`, section "주인 답 (11-15 00시 KST …)"):

1. In walk diaries from before 11-10, the line '힌트: …' (the old hint the player typed, shown on the poster's back /
   the diary / the album / exports) is **hidden**. Saved data keeps the hint; only the display hides it (`docs/
   OWNER_DECISIONS.md` decision 18 removed the hint box; find where old trips still print it: grep '힌트' in
   `js/app.js` and the poster / diary code). Keep the follow / ignore / drift marks only if they still make sense
   without the hint text — decide and say.
2. Mood sound effects for a reaction (the 폴짝 / 우쭐 / 덤덤 / 졸림 sounds in `js/audio.js`, find them via the wrap-up
   reaction path) play **only when the model or a person chose the reaction**; when the demo rule chose it, no mood
   sound (other sounds such as UI clicks, footsteps and the door stay). Sound stays off by default.

## Not yours

Furniture, camera, yard, runner, sheets' layout. You change strings, face choices, sound calls, their tests and
docs. Other lanes may shorten unrelated text later; keep your new lines short already.

## Tests and report

As in `fix-honest3.md` (but no mutation tables: one independent check as in `COMMON.md` is enough), plus: a demo
trip from a seeded pre-11-10 save with a hint shows no '힌트' line anywhere; with sound on (a user gesture first), a
demo wrap-up reaction requests no mood sound file and a model-chosen one (the MCP / dev replay path) does. `npm test`,
the font check, smoke `A`, `T` and the letters that cover the wrap-up, the album and petting. Screenshots (360x740):
the log with the greeting and a demo wrap-up row before / after, the album's empty notes text.
