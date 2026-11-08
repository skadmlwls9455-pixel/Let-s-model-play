# UI/UX tip dossier for 뽈뽈 문어 (Ppolppol Octopus)

Angle: GitHub-starred UI/UX tip collections and the most-cited practical design writers, distilled into rules for a small, cozy, mobile-first (360px) Korean web game with a lantern, a poster wall, a tool-call-style log, and one big "뽈뽈 다녀와" button.

Research date: 2026-11-04. Star counts were read live through the GitHub search API (`gh api search/repositories`) on that date. Several writer sites (lawsofux.com, anthonyhobday.com, learnui.design, refactoringui.com, nngroup.com, medium.com, m2.material.io, w3c.github.io, web.dev) are outside this session's network allow-list, so their content was taken from web-search snippets, GitHub mirrors (raw READMEs, skill files, gists) and secondary summaries. Where the wording is second-hand it is flagged.

---

## 1. Sources

### GitHub collections (stars verified 2026-11-04)

| Repo | Stars | What it is / what we took |
|---|---|---|
| thedaviddias/Front-End-Checklist | 74.6k | Modern web-dev checklist. Took: viewport without `user-scalable=no`, no horizontal scroll, `prefers-color-scheme` via CSS custom properties on `:root`, visible focus, sufficient touch targets, reduced-motion, transform/opacity-only animation, font loading, favicon/manifest. |
| bradtraversy/design-resources-for-developers | 67.3k | Curated resources. Took: palette tools (Coolors, Huemint, Adobe Color), contrast tools (whocanuse.com, Colorable), Google Fonts/Fontsource for Noto KR, UI Design Daily for card inspiration. |
| goabstract/Awesome-Design-Tools | 41.7k | Tool directory; used for cross-checking accessibility/contrast tooling. Few rules per se. |
| AllThingsSmitty/css-protips | 30.3k | 29 CSS protips. Took: `line-height` on `body`, `:focus` for form elements, SVG icons with fallback for icon-only buttons, lobotomized owl `* + *` spacing, `aspect-ratio` to stop layout shift, 16px inputs to prevent iOS zoom, `pointer-events:none` on disabled, `:empty` to hide empty containers, `margin-inline`/`margin-block` logical props, style broken images. |
| alexpate/awesome-design-systems | 26.3k | Design systems list; used to confirm token/role-layer conventions. |
| Chalarangelo/30-seconds-of-css | 16.0k | Snippet collection (merged into 30-seconds-of-code May 2023, snippets live at 30secondsofcode.org/css). Took: hover-shadow card, toggle switch, system font stack, overflow-scroll gradient, reduced-motion wrapper. |
| phuocng/html-dom | 6.5k | Vanilla-JS DOM task recipes with live demos; the reference for no-framework patterns (drag, scroll into view, clipboard, localStorage). |
| thedaviddias/Front-End-Design-Checklist | 5.4k | Design-handoff checklist. Took: define every button state (normal/hover/focus/pressed/inactive), name colours by function, SVG icons in one square size, build simple graphics in CSS not images. |
| argyleink/gui-challenges | 3.0k | Adam Argyle's accessible component recipes (toast, dialog, switch, tabs, color schemes, theme switch, FAB, settings). Took: toast as `output`/live region, theme switch pattern, color-scheme tokens. |
| Heydon/inclusive-design-checklist | 2.8k | Inclusive design checklist. Took: hide decorative art from AT, don't rely on colour alone, announce state changes via live regions, no time limits, no infinite scroll by default, hidden content hidden from everyone. |
| s0xDk/refactoring-ui-skill | 684 | Faithful rule-ised mirror of Refactoring UI used because refactoringui.com is blocked here. |
| keysjoao/laws-of-ux-skills | 18 | Mirror of the 29/30 Laws of UX with takeaways; used because lawsofux.com is blocked here. |

### Writers / specs (not GitHub; stars n/a)

- **Laws of UX**, Jon Yablonski, https://lawsofux.com (book: O'Reilly, 2nd ed.). Aesthetic-Usability, Doherty Threshold (~400 ms), Fitts, Hick, Jakob, Miller, Peak-End, Goal-Gradient, Zeigarnik, Von Restorff, Tesler, Postel, Serial Position, Common Region, Proximity, Choice Overload, Cognitive Load, Flow, Selective Attention.
- **Refactoring UI**, Adam Wathan & Steve Schoger, https://www.refactoringui.com. Spacing scale (16 base; adjacent values differ by >=25%), shade scales (100-900, pick 500 first, HSL, 8-10 greys starting from near-black), "never grey text on coloured backgrounds", "labels are a last resort", emphasize by de-emphasizing, fewer borders (use shadow/background/spacing), accent border, one radius, max three text colours, line-height 1.5-2 for small text, line length 45-75ch, design in grayscale first, mobile-first at ~400px. (Via s0xDk skill mirror + selcukcihan gist.)
- **Visual design rules you can safely follow every time**, Anthony Hobday, https://anthonyhobday.com/sideprojects/saferules/. Near-black/near-white instead of pure; neutrals under 5% saturation, and if tinted, warm OR cool not both; outer padding >= inner padding; shadow blur = 2x distance; nested radius = outer radius minus gap; elements in order of visual weight; measurements mathematically related; shadows are hard in dark UIs. (Via Tailwind Weekly #225 summary + HN quotes + Hobday quick-start page snippet.)
- **7 Rules for Creating Gorgeous UI**, Erik D. Kennedy, https://www.learnui.design/blog/7-rules-for-creating-gorgeous-ui-part-1.html. Light comes from the sky (inset vs outset); black and white first; double your whitespace; overlay text on images (scrim/gradient); make text pop and un-pop (only the title gets full up-pop; everything else mixes up- and down-pop); only good fonts; steal like an artist.
- **WCAG 2.2 SC 2.5.8 Target Size (Minimum)**, https://w3c.github.io/wcag/understanding/pointer-target-spacing. 24x24 CSS px, or spacing such that a 24px circle centred on each target does not intersect another; AAA 2.5.5 = 44x44. Apple HIG 44x44 pt; Material 48x48 dp.
- **Material Design dark theme**, https://m2.material.io/design/color/dark-theme. Surface #121212; higher elevation = lighter via white overlay (1dp 5%, 2dp 7%, 3dp 8%, 4dp 9%); use the 200 tone of the primary as accent in dark; avoid large saturated areas; shadows don't read on dark. (Via search snippets.)
- **NN/g, Empty states in application design**, https://www.nngroup.com/articles/empty-state-interface-design/. Empty state = communicate system status, teach what belongs here, give a direct path to the key task; don't front-load tutorials. (Via search snippets + PatternFly corroboration.)
- **NN/g, Progressive disclosure**, https://www.nngroup.com/articles/progressive-disclosure/. Show the few most-used options up front, defer the rest behind an obvious control (cited from the well-known article; page blocked here).
- **Apple App Store KR stylesheet**, https://www.apple.com/kr/app-store/styles/main.built.css. `body:lang(ko)` uses line-height ~1.75 and `word-break: keep-all`. Jungshik Shin (W3C, 2015) : `keep-all` suits titles/labels/UI strings; long Korean paragraphs can break at syllables.
- **Grafana UX writing guide**, https://grafana.com/docs/writers-toolkit/write/style-guide/ux-writing/. Buttons start with a verb, 1-2 words, say what happens; friendly not formal; never Yes/No.

---

## 2. Rules for this game

Format: **Rule** - Why (source) - How to apply (names the element).

### A. Hierarchy and the one button

**R1. One primary action per screen, and it is 뽈뽈 다녀와.**
Why: Refactoring UI's action pyramid (one solid high-contrast primary, secondaries outlined, tertiaries as links); Hick's Law (fewer choices, faster decisions); Fitts's Law (big and close = fast).
Apply: The depart button is the only solid-accent button on the home screen, full-width inside the 16px gutters, min-height 52px, pinned low in the thumb zone above the safe-area inset. The hint input sits directly above it as a quiet outlined field. Nothing else on the home screen is filled with the accent colour.

**R2. Fold the demo controls away with real progressive disclosure.**
Why: NN/g progressive disclosure (prioritise correctly, make the mechanism obvious); Tesler's Law (move complexity into defaults); Cognitive Load.
Apply: Put 수동 귀가 / 강제 외출 / 집에 있기 / 시뮬레이션 토글 behind a single `<details>` labelled "데모 조작" rendered as a tertiary (link-style) row at the very bottom, collapsed by default and remembered in localStorage. In the real-use screen the octopus's choices (go/stay/where/when) are never buttons the human can press.

**R3. Emphasize by de-emphasizing.**
Why: Refactoring UI; Selective Attention. Secondary stuff fades, so the primary needs no extra shouting.
Apply: Trip count, lantern notch label, timestamps and the receipt's HTTP codes use the tertiary text colour (lighter grey) at 13px. The octopus's one-liner on the poster is the only place that uses the serif display face at 20px+.

**R4. Labels are a last resort; fold the label into the value.**
Why: Refactoring UI. "12 left in stock" beats "Stock: 12".
Apply: Write "7번째 산책" not "여행 횟수: 7"; "등불 3/8칸" not "진행도: 3"; "방문 4곳 · 못 읽은 곳 1" not "성공: 3 / 실패: 1".

**R5. Von Restorff: exactly one distinctive thing per view.**
Why: The one differing item is the one remembered.
Apply: On the wall, the newest poster is the only one with a tiny "새 포스터" dot and a slightly rotated sticker; older posters are uniform. In the log, only the final "집에 왔어" entry gets the accent-coloured left border.

### B. Spacing and layout

**R6. Use a fixed spacing scale and give more space between groups than within.**
Why: Refactoring UI (4/8/12/16/24/32/48/64; adjacent values >=25% apart); Law of Proximity; Hobday "outer padding >= inner padding".
Apply: `--s1:4px --s2:8px --s3:12px --s4:16px --s6:24px --s8:32px --s12:48px`. Card inner padding 16, gap between cards 24, section gap 32. Page gutter 16px; never let a poster card have less outer margin than its own inner padding.

**R7. Double your whitespace, then subtract.**
Why: Erik Kennedy rule 3; Refactoring UI "start with too much whitespace".
Apply: Log entries get 12px vertical padding, not 4; the poster front has at least 24px around the scene; the hint input is 48px tall with 16px side padding.

**R8. Prevent layout shift with `aspect-ratio` and `:empty`.**
Why: css-protips #9 and #28; Front-End-Checklist CLS < 0.1.
Apply: Poster thumbnails are `aspect-ratio: 3/4` boxes before the sticker/scene loads; the album grid gets `.poster:empty { display:none }`; the lantern SVG is a fixed 64x96 box so the room doesn't jump when a notch lights.

**R9. Fewer borders: separate with background, shadow or space.**
Why: Refactoring UI; Hobday (shadows are hard in dark UIs).
Apply: In light mode the poster card uses a soft two-part shadow (`0 1px 2px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.08)`); in dark mode drop the shadow and lift the surface instead (surface +5% white overlay, Material pattern). Log rows separate with 1px of background-colour difference, not rules.

### C. Typography (Korean + emoji)

**R10. Body line-height 1.6-1.75, headings 1.2-1.3, `word-break: keep-all` on short UI text only.**
Why: Refactoring UI 1.5-2 for small text; Apple's KR stylesheet uses ~1.75 and `keep-all`; Jungshik Shin (W3C): keep-all is right for labels/titles, long prose may break at syllables; `overflow-wrap:anywhere` as safety net.
Apply: `body{line-height:1.65}`. Poster one-liner, button labels, log verbs and empty-state copy get `word-break:keep-all; overflow-wrap:anywhere`. The receipt's URLs get `word-break:break-all` plus ellipsis after ~40 chars.

**R11. Type scale in px/rem, never em; weights 400/500 body, 600/700 emphasis.**
Why: Refactoring UI; css-protips #22 (rem global, em local only).
Apply: 12 (receipt meta), 13 (tertiary), 15 (body), 17 (log verbs), 20/24 (poster one-liner, Noto Serif KR 600), 28 (room title). Nothing below 12px, no weight below 400 in Noto Sans KR (thin Korean strokes break on low-DPI).

**R12. Emoji are decoration, not text.**
Why: Heydon checklist (ornamental art hidden from AT); css-protips #12 (SVG icons, fallback for icon-only buttons); mixed emoji fonts shift baselines.
Apply: Wrap every emoji in `<span aria-hidden="true" class="emo">` with `font-size:1.1em; line-height:1; vertical-align:-0.1em`. Stickers on posters are SVG/PNG from `assets/` with `alt` text that names the sticker ("깃털 스티커"); the lantern and moss pot are `<img>` so they survive high-contrast mode.
Project override (뽈뽈, 11-07): no emoji or decorative symbols in player UI at all — words or pixel icons (`alt=""` + `aria-hidden`, the word beside stays); SKILL.md §3 wins over R12.

**R13. Make text pop and un-pop: only the poster title gets full up-pop.**
Why: Erik Kennedy rule 5.
Apply: Poster front = one-liner big + serif + dark (up-pop); date and place small + grey + more margin (down-pop). Receipt back = monospace 12px rows, all down-pop except a single bold total line.

### D. Colour and theme

**R14. Near-black, near-white, tinted neutrals (one temperature), one accent.**
Why: Hobday (pure black has uncomfortably high contrast; neutrals < 5% saturation; warm OR cool, not both); Erik Kennedy black-and-white first; Refactoring UI 8-10 greys from near-black.
Apply: Light text `#2a2623` (warm near-black), light bg `#faf7f2` (warm paper), dark bg `#17161a` to `#1e1c22` (cool slate at night is fine because the whole dark palette is cool), dark text `#ece8e1`. One accent: lantern amber `hsl(34 85% 55%)`. All neutrals share one hue family per theme.

**R15. Dark mode is not inverted light mode: dim the accent, lift surfaces, no shadows.**
Why: Material dark theme (#121212 base, 200-tone accent, elevation = lighter overlay 5-9%, large saturated areas tire the eye); Hobday on shadows in dark UIs.
Apply: `--accent` in dark becomes `hsl(34 70% 68%)`; poster card surface = bg + 7% white; remove box-shadows under `:root[data-theme=dark]`; the lit lantern glow is a radial-gradient at 25% opacity, not a bright fill.

**R16. Never grey text on a coloured background; pick a hue-matched tint.**
Why: Refactoring UI hard rule 1.
Apply: On the amber "집에 왔어" chip and on any sticker badge, secondary text is a darker/lighter amber (`hsl(34 40% 30%)`), not `#888`.

**R17. Contrast 4.5:1 text, 3:1 UI, in both themes; never colour alone.**
Why: Front-End-Checklist; Heydon; Refactoring UI hard rules 7-8.
Apply: Each lantern notch shows lit vs unlit by fill AND a small tick-mark shape; receipt success/failure uses `✓ 읽음` / `✕ 못 읽음` / `◌ 모의 방문` text plus colour. Verify the three text colours against both bgs with whocanuse.com.

### E. Touch, motion, feedback

**R18. Tap targets 44x44 minimum, 48 preferred; 24px icons get 10px padding each side.**
Why: WCAG 2.5.8 (24 min, 44 AAA), Apple HIG 44pt, Material 48dp.
Apply: Poster thumbnails are at least 96x128; the flip affordance is the whole card, not a corner icon; the theme switch and "데모 조작" disclosure are 44px tall rows; inline log links are exempt but still get 8px padding.

**R19. Respond within 400 ms and keep animation to transform/opacity.**
Why: Doherty Threshold; Front-End-Checklist (INP < 200 ms, compositor-only animation).
Apply: Pressing 뽈뽈 다녀와 immediately swaps the button to a disabled "다녀오는 중…" state and prints the first log line within one frame; log lines fade/slide in with `opacity` + `translateY(4px)` over 180 ms; the poster flip is a `rotateY` with `backface-visibility:hidden`, 350 ms.

**R20. Respect `prefers-reduced-motion`.**
Why: Front-End-Checklist; Heydon; 30-seconds-of-css reduced-motion snippet.
Apply: Under reduced motion the poster flip becomes an instant swap with a cross-fade of 0 ms, the octopus idle bob stops, the lantern lights without the flicker keyframe, log lines appear without slide.

**R21. Status changes are announced; toasts are an `output` live region, bottom-centred, short-lived.**
Why: argyleink toast recipe (`<output>` / `role=status`, auto-dismiss); Heydon "announce state changes".
Apply: One `<output aria-live="polite" class="toast">` fixed above the safe-area inset. Messages: "등불 한 칸 더 켜졌어" , "포스터를 벽에 붙였어", "오늘은 집에 있을래". 2.5 s, max one at a time, never blocks the depart button.

**R22. Light comes from the sky.**
Why: Erik Kennedy rule 1 (outset = cards/buttons, inset = inputs/pressed).
Apply: The depart button has a 1px lighter top edge and shadow below; the hint input is faintly inset (`inset 0 1px 2px rgba(0,0,0,.06)`); the poster card's pin/tape sits at the top edge with its shadow falling downward.

### F. Empty states, microcopy, memory

**R23. Empty wall = status + what belongs here + the next step, in the octopus's voice.**
Why: NN/g empty states (communicate status, teach, give a direct path); Peak-End (good empty state is part of the experience).
Apply: Wall with zero posters shows the bare moss pot and one line: "아직 붙인 포스터가 없어. 힌트를 두고 뽈뽈 다녀와를 눌러봐 (비워둬도 돼)." No tutorial, no 🖼 placeholder glyph. The empty receipt side says "오늘은 아무 데도 안 갔어. 그래도 등불은 켜졌어."

**R24. Buttons start with a verb, 1-2 words, friendly not cute; no Yes/No.**
Why: Grafana UX-writing; button-microcopy research (labels must stand alone).
Apply: "뽈뽈 다녀와", "뒤집어 보기", "벽 보기", "데모 조작 열기". Never "확인/취소" pairs on octopus choices, because the human does not confirm them. Error copy is calm: "그 페이지는 못 읽었어. 그래도 들른 걸로 적어둘게."

**R25. Design the peak and the end: the poster reveal is the peak, the lantern notch is the end.**
Why: Peak-End Rule; Goal-Gradient (progress visible, completion celebrated); Zeigarnik (unfinished things pull people back).
Apply: Order of the return sequence: log finishes -> poster slides onto the wall (peak, 350 ms) -> toast -> lantern notch lights last (end). Show "등불 3/8칸" under the lantern so the gradient is visible; after notch 8 the room gains a piece of furniture and the counter resets with a new piece named ("다음은 담요").

**R26. Chunk the log; collapse history; no infinite scroll.**
Why: Miller's Law (5-7 items), Heydon (no infinite scroll by default, scrollable log focusable).
Apply: Live log shows the latest 7 entries with a "이전 기록 더 보기" button; the log container is `tabindex=0` with `role=log aria-live=polite`; each entry is one verb-first line ("들렀어 · 깃털의 역사", "못 읽었어 · 403").

**R27. Cards for the album: common region, one radius, accent border for the memorable one.**
Why: Law of Common Region; Refactoring UI (one radius, accent border on a card's top edge); Hobday nested radius = outer minus gap.
Apply: Poster card radius 12px, sticker inside radius 12-8=4px when inset 8px. Grid 2-up at 360px (each ~156px), 3-up from 480px. The poster the octopus marked "기억에 남은 곳" gets a 3px amber top border; all others plain.

**R28. Familiar patterns: bottom sheet for the receipt on narrow screens.**
Why: Jakob's Law; Material bottom sheet (full-width on mobile, drag handle, scrim 40% for modal, bottom safe-area inset).
Apply: Tapping a poster on the wall opens a modal bottom sheet with a 32x4px drag handle, the flipped poster at top and the receipt list below, dismissible by swipe-down, scrim tap or a 44px "닫기" row; `padding-bottom: env(safe-area-inset-bottom)`. On >=600px the same content can be a centred dialog.

**R29. Inputs at 16px, visible focus, no pinch-zoom lock.**
Why: css-protips #25 (prevents iOS zoom) and #7 (focus); Front-End-Checklist (no `user-scalable=no`).
Apply: Hint `<input>` font-size 16px; `:focus-visible` ring 2px amber offset 2px on every control including the poster cards; viewport meta `width=device-width, initial-scale=1` only.

**R30. Tokens on `:root`, roles not raw values, theme switch remembered.**
Why: Front-End-Checklist (custom properties for dark mode), Refactoring UI role layer, argyleink theme-switch recipe.
Apply: Components use `--surface`, `--text-1/2/3`, `--accent`, `--lantern-glow`; the dark block overrides only roles under `@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme=light])` and under `:root[data-theme=dark]`; a 44px three-state switch (auto/밝게/어둡게) persists in localStorage.

---

## 3. Quick checklist to paste into the review step

- [ ] Only one filled-accent button on home (뽈뽈 다녀와), >=52px tall, in thumb zone.
- [ ] Demo controls inside collapsed `<details>` "데모 조작", link-styled, at bottom.
- [ ] Spacing uses 4/8/12/16/24/32/48 only; group gaps > inner gaps.
- [ ] body line-height 1.65; keep-all on labels/one-liners; URLs break-all.
- [ ] No pure #000/#fff; one accent; dark accent is lighter and less saturated.
- [ ] No shadows in dark; surfaces lifted instead.
- [ ] All text >= 4.5:1 in both themes; success/fail/simulated have text glyphs.
- [ ] Every tappable >= 44px; poster cards flip on whole-card tap.
- [ ] First log line appears < 400 ms after press; transforms/opacity only; reduced-motion honoured.
- [ ] Toast is `<output aria-live=polite>`; log is `role=log`.
- [ ] Empty wall copy in octopus voice, no tutorial, no 🖼 glyph.
- [ ] Return sequence: log -> poster (peak) -> toast -> lantern (end).
- [ ] Posters: 12px radius, 2-up at 360, one accent-border for the remembered one.
- [ ] Receipt opens as bottom sheet with drag handle + safe-area padding.
- [ ] Hint input 16px, focus-visible rings everywhere, no user-scalable=no.
