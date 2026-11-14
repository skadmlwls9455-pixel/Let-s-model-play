# Lane H "text": shorter text everywhere, one size smaller, a smaller speech bubble (branch `lane/h-text`)

Read `wip/round4/briefs/COMMON.md` first. **This lane starts after lanes A-G are merged** into
`claude/game-launch-completion-hwvre5`: read `git log --oneline -30` and `wip/round4/reports/*.md` so you keep what
they did (honesty lines, furniture words, the yard, the runner, the sewing sheet).

## What the owner wants

HANDOFF item 14 "전체 글자 줄이기 (맨 마지막)". Owner 11-14: "전반적으로 글자가 많은 느낌이라 글자 수 줄이고 축약하되 뜻은
남기는 쪽으로 가자." · "문어가 말풍선 띄울 때 화면이 작아서 전체 화면이 가려지는 느낌이 들어서 이것도 좀 작게 사이즈
조절해주고". Owner 11-15: **both — shorter sentences and the type one step smaller overall.**

## What to make true

1. **Shorter text** everywhere the player reads UI text (`index.html`, `js/app.js` labels / toasts / sheet texts /
   hints / tutorial / quests / album / settings, `js/salon.js` house-voice parts, the play room, the yard, `cook.html`
   / `js/cook.js`, `js/runner.js`): make an inventory (file, text, where it shows), then shorten every line that is
   longer than it needs to be, keeping its meaning, every fact and the warm plain 반말 voice. Cut repeated or obvious
   words, explanations the screen already shows, long hints. Do **not** touch: the model's words (hard line 2); the
   honesty labels and their meaning (who wrote what: '데모', '모델이 쓴 메모', '사람이 쓴', raw-text markers; hard line
   1); the demo lines the honesty lane settled (only if clearly too long, and then keep it a fact); legal text and
   licences in `credits.html`. aria-labels stay meaningful. A before → after table goes in your report.
2. **One step smaller type**, crisp: the pixel font (Galmuri) must stay at its native multiples (Galmuri7: 8 / 16,
   Galmuri9: 10 / 20, Galmuri11: 12 / 24; see `vendor/fonts/galmuri.css` and the `--f-*` variables in
   `css/style.css`). "One step smaller" therefore means moving body / UI text down one rung of that ladder where it
   is readable (for example body 20px Galmuri9 → 16px Galmuri7 where lines are short, headings 24 → 20) — decide a
   consistent ladder, apply it through the variables and the few hard-coded sizes, and keep every text at least as
   large as the smallest text the game already uses for reading (16px pixel / 12px system). The system font
   (non-pixel setting) goes down one step the same way (e.g. 13 → 12, 15 → 14). Touch targets stay ≥ 44 px.
3. **The speech bubble** (`#oct-bubble`: `css/style.css` ~181-188, ~571, ~935; `bubble()` in `js/app.js`;
   `UIART.keepInside` in `js/ui-art.js`) takes clearly less of the screen at 360x740, 320x568 and 412x915 in both
   fonts: smaller type (crisp), a width tied to the scene's width, fewer lines; it stays inside the scene. The
   model's words are never cut silently: keep the existing '…' rule for bubbles and the full text in the log.
4. Run the font check and regenerate subsets (text changes will make them stale); update smoke checks that assert
   exact strings to the new text without weakening them.

## Tests

`npm test`, the font check, and the **full** smoke run (`node tools/smoke.js`) and slow suites you can afford
(`npm run test:slow` parts); fix what text changes broke. Screenshots (360x740 and 320x568): the main screen, the
bubble (day), the settings sheet, the album, the bag sheet, the sewing sheet, before / after.
