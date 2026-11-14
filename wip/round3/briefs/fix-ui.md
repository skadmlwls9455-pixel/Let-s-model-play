# Lighter screens: a smaller speech bubble, a calmer sewing sheet, shorter text everywhere (lane "ui")

Read `/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final/COMMON4.md` first (the project,
the hard lines, how to run things, the SHEET_SETTLE test gotcha). Your label (scratch folder) and your tree are in
your task message. This lane runs **after** the other lanes of this round are merged, so your base already holds
their changes (honesty lines and faces, the furniture fixes and wording, the camera turn buttons, the brighter
evening, the stairs cue): read `git log --oneline -15` in your tree and their briefs in the same folder as this one
(`fix-*.md`) so you do not undo them. Do not commit.

## What the owner said (11-14, about 20:00 Korea time, on a phone in portrait; pixel font)

1. "문어가 말풍선 띄울 때 화면이 작아서 전체 화면이 가려지는 느낌이 들어서 이것도 좀 작게 사이즈 조절해주고" — when the
   octopus shows a speech bubble, the phone screen is small, so the bubble feels like it covers the whole screen;
   make it smaller.
2. "2층 재봉틀 ui가 뭔가 훅 커지는 느낌이라 글자 크기 조절 좀 해줘" — the upstairs sewing machine UI suddenly feels
   big; adjust its text size.
3. "전반적으로 글자가 많은 느낌이라 글자 수 줄이고 축약하되 뜻은 남기는 쪽으로 가자." — overall there is too much
   text: fewer characters, abbreviated, keeping the meaning.

A screenshot of the owner's screen (the attic at night, no bubble showing):
`/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final/owner-shots/1114-2003-attic-night-crate.jpg`.

## Where things are

- The bubble: `#oct-bubble` in `css/style.css` (~181-188; 3D ~935 `font-size 12px · max-width 220px`; pixel font
  ~572 `font-size 16px · line-height 24px`), `bubble()` in `js/app.js` (~1483), `UIART.keepInside` in `js/ui-art.js`
  (keeps it inside the scene), the bubble skins and the tap lines (their length rules in `js/world.js` / the brain:
  the tap line is about 22 characters, a model's 24 + '…').
- The sewing sheet: `#sew-sheet` in `index.html` (~299), `renderSew` / `openSew` in `js/app.js` (~4520-4610), `.sew-*`
  and the shared sheet styles in `css/style.css` (~1585); compare with the other sheets (settings, the salon bottles,
  the album, the week list) — what makes this one feel like it "jumps big" (text size, chip size, the opening motion,
  the sheet height)?
- Player-facing text: `index.html`, `js/app.js` (labels, toasts, sheet texts, hints, the tutorial, quests, album and
  settings texts, aria-labels), `js/salon.js` (the house voice parts), the play room, the kitchen (`cook.html`,
  `js/cook.js`), `js/runner.js`, `credits.html`.

## What to make true

1. **The bubble** takes clearly less of the screen at 360x740 and 320x568 (and on the owner's larger phone,
   about 412x915), in both fonts, in 3D and the 2D fallback: a smaller text size that stays crisp for the pixel font
   (use the font's native sizes: check `vendor/fonts/galmuri.css` and how the other pixel-font texts are sized), a
   width tied to the scene's width, fewer lines. It stays readable (no smaller than the smallest text the game
   already uses for reading) and inside the scene (`keepInside`). The model's words are never cut silently (hard line
   2): if a bubble must stay short, keep the existing '…' rule and the full text in the log.
2. **The sewing sheet** opens at a calm size like the other sheets: text sizes from the same scale the other sheets
   use, compact chips, no sudden big jump; keep touch targets at least 44 px.
3. **Shorter text everywhere the player reads UI text**: make an inventory (file:line, text, where it shows), then
   shorten each line that is longer than it needs to be, keeping its meaning, the warm plain 반말 voice and every
   fact. Prefer cutting repeated or obvious words, explanations the screen already shows, and long hints. Do **not**
   touch: the model's words (hard line 2); the honesty labels and their meaning (who wrote what: '데모', '모델이 쓴
   메모', '사람이 쓴', raw-text markers; hard line 1); the octopus's demo lines and faces that the honesty lanes just
   settled (only if a line is clearly too long, and then keep it a fact); legal text in `credits.html`. Keep aria-labels
   meaningful (they can stay longer than the visible text if that helps a screen reader). Show the owner a
   before → after table of every changed string.

## Rules

- Smallest change for each item. Match each file's style (comments short, Korean, dated `11-14`, saying why).
- Hard lines: no emoji or symbols; sound off by default; saved data unchanged.
- Text changes make the font subsets stale: run the font check and regenerate with the same tool without `--check`;
  list the font files rewritten.
- Many smoke checks assert exact strings: update them to the new text without weakening what they check.

## Tests that fail without the fix

A check that pins the bubble's size limits (for example its rendered box at 360x740 in both fonts is at most a set
share of the scene's area and width), one for the sewing sheet's text sizes (the same scale as the other sheets),
and for the copy pass a check that the shortened strings are what ships (the existing string checks updated plus,
if useful, a length budget for toasts and hints). Revert each part alone in a scratch copy and name the check
that fails (mutation table).

## Suites

`npm test`; the font check; the smoke letters that cover the bubble, the sheets, the loft and the strings you
changed (find them with grep; at least `A`, `T`, `Z`, `U`) until each passes twice in a row, or explain a load-only
failure with a control run on the base. Keep scratch copies in `/dev/shm` and delete them. Put back every tracked
evidence file you did not mean to change.

## Report

The bubble before/after (screenshots at 360x740 and 320x568, both fonts, a long and a short line), the sewing sheet
before/after, the full before → after table of shortened strings, what you left long and why, the checks and the
mutation table, suite totals, what you did not verify. Full paths for every picture.
