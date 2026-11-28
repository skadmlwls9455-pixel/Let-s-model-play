# Lane F — the weekend fashion contest (`lane/7-f`)

Read `COMMON.md` first (hard line 4; contracts C4, C5, C6, C7, C8), then `ANSWERS.md`, the owner's words
(`wip/round7/README.md` E5) and `wip/round7/maps/player-economy.md` sections 1, 3, 4, 10.

## Why

The owner: "주말마다 콘테스트가 열려서 캐릭터 옷 도감 입고 패션 콘테스트 나가면 주제랑 요소에 맞게 점수 받아서 우승하면 조개 받는
식 … 오픈 소스 및 실제 플래시 게임 중에 이런 거 관련 자료 없는지 체킹하고 … 옛 휴대용 게임의 콘테스트 기능 조사해서 참고."
References are for **principles only** (a theme each time; items carry attributes; a visual round where matching the theme
scores; a short show with judges; a ranking against a few rivals). Nothing is copied (hard line 9).

## You own

New files: `js/contest.js` (global `CONTEST`, DOM-free rules), `tools/test-contest.js`, `tools/test-contest-live.js`,
`docs/CONTEST.md`. `js/app.js` under `[7-F]`; `index.html` and `css/style.css` under their `[7-F]` markers. You edit no
existing line of any file.

## What to build

1. **Research, 30 minutes at most**: how dress-up contests in games and open-source dress-up projects score an outfit
   (theme tags, attribute sums, colour harmony, bonus for a matching set, judges with tastes). Write half a page in
   `docs/CONTEST.md` (no game names in code or player text).
2. **Rules (`js/contest.js`)**:
   - `CONTEST.week(dateKey)` → `{ key, open (Saturday or Sunday by the device date), theme }`; twelve themes in a seeded
     yearly order so that a theme does not repeat within eight weeks. A theme = a short Korean title ('바닷가 산책',
     '비 오는 날', '꽃놀이', '별 보는 밤' …), two or three wanted tags and one colour family from the fixed tag list of C4,
     and a small pixel picture.
   - `CONTEST.score(worn, theme, seed)` → `{ total 0..100, parts: [{ what, points }] }`: matching tags on each worn piece,
     the theme's colour family, a bonus when the whole look agrees (one clear style), a small bonus for a dyed piece in the
     theme colour, never a penalty for anything. The same look in the same week always gets the same score.
   - Three rivals per week drawn from the catalogue by seed (free and shop items), scored by the same function, with names
     and colours from lane N's roster when `NPC` exists (else three plain octopus silhouettes).
   - `CONTEST.enter(state, dateKey, worn)` → the result `{ rank 1..4, shells }`: 12, 8, 5, 3 shells (everybody gets
     something). One scored entry per open day; opening the stage again that day replays the stored result (no re-roll).
     `normalize`, `merge` (two tabs: keep both days, never pay twice).
3. **The show** (`#btn-plaza-stage` from lane V; may be missing: guard; also `APP.openContest()` for tests). A full-screen
   sheet in the game's pixel-paper style:
   - any day: this week's theme as a picture with its title, the wanted tags as small pictures, my character as it is
     dressed now (the scene's portrait), and a button to the look sheet ("change clothes");
   - on weekdays the entry button is not there and one plain line says '주말에 열려.' (no countdown, no dates);
   - on a weekend day: "나가기" → a short show of about 12 s that can be skipped: the three rivals and my character walk
     on one by one (portraits), three judges (the shopkeepers if `NPC` exists) hold up picture cards for the parts of the
     score (a tag picture and one to three stars drawn as pixel pictures), the totals count up, the podium, the shells
     arrive through the existing earning helper, and `APP.npcSay('clothes', 'contest.result', …)` is called if it exists.
     Honest labels: the judging is a rule, shown as a small tag '채점 규칙' on the result (the same idea as the '데모 규칙'
     tag); the judges do not express feelings about the player.
   - the result stays visible for the rest of the day in the sheet, and a line goes to the day log through the existing
     log helpers ('콘테스트 2등 · 조개 8').
4. **Fallbacks**: without the wardrobe API (lane P not merged) the stage button does nothing; without the outside (2D)
   nothing shows.

## Words

Titles and one-line results only; plain 반말; no emoji or symbols; no "last chance", no dates or timers; every new line
passes the honesty scan of `js/app.js`.

## Checks

`tools/test-contest.js` (week keys and themes; weekend detection with the `today` hook; determinism; no penalty; rank and
shells; one entry a day; replay; merge), `tools/test-contest-live.js` (weekday and weekend views, the show skipped and
watched to the end, shells credited once, two tabs, reduced motion), `npm test`. Screenshots at 360x740: the theme view,
two frames of the show, the result.

## Report

As in `COMMON.md`, plus the theme table and the scoring table.
