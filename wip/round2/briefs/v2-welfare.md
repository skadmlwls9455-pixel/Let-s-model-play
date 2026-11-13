# Verify the second deploy, lens 4 — the hard lines

Read `/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final/COMMON3.md` first.
Your label (scratch folder): `v2-welfare`.

You judge the second deploy against the project's hard lines (COMMON3.md 1–10) and its voice. You are the last
reader before players see it: be strict, and give evidence for every finding.

## What to check

1. **Every player-facing line that is new or changed** since production: `git -C /home/user/ppolppol-verify2 diff
   f2c93f1 HEAD -- js css index.html` (strings, `aria-label`s, `title`s, toasts, sheet notes, mirror lines, plot
   labels, the new weekly line "사흘 들어오기는 목록에서 빠졌지만, 이번 주엔 한 걸로 셌어."). Collect them in a
   table (where, exact text, when it shows) and judge each: does it say or imply what the octopus feels, likes,
   wants? Does it pass as the model's words? Pressure, praise that pushes, fear of missing out? Symbols or emoji?
   Plain, warm Korean? Then see each one on screen at 360x740 and 320x568 in both font themes (fit, no cut).
2. **The weekly list as a system**: does anything now reward the octopus going out or penalise it staying, steer
   the player to push the octopus, or create streak or countdown pressure (the week change, the gift, `kept`)?
   "산책 갈지 묻기" counts asking, not going: check that a "no" counts the same as a "yes" and that waking a sleeping
   octopus no longer counts (decision 5b).
3. **The octopus's rest and upstairs**: is the octopus ever woken, moved in view, made to follow, or shown in a way
   that implies a feeling? Is the mirror line honest ("지금은 아래층에 있어." when it is downstairs)?
4. **The salon**: still gives nothing; a "no" is staged plainly; nothing new pressures the player to ask.
5. **The intro**: nothing implies what the octopus feels; no flashing (count frames where most of the screen
   changes brightness sharply; reduced motion skips the descent).
6. **Sound off by default**: load the new build, play through the intro, a walk, the weekly claim, the garden and
   upstairs with no user gesture on the sound switch: no AudioContext created, no request under `audio/` or
   `foley/` (record the network log). Then turn sound on and check nothing new plays at a surprising moment.
7. **Credits** (CC BY) still reachable from the settings; nothing commercial named or copied.
8. The font check on a copy: `stale: none`.

## How to report

Each finding: severity (COMMON3.md), the hard line it touches (number), where (file:line and screen), the exact
text or behaviour, evidence (screenshot, log), and the fix you suggest. Put the full table of new lines in
`checked_ok` (one line per string: text → verdict).
