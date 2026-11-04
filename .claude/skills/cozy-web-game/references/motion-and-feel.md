# Game feel, juice and animation principles for 뽈뽈 문어

Research dossier for the departure/return, poster reveal/flip, lantern lighting, tool-call log and button presses of the attic octopus game. The game is calm and cozy: every rule below is filtered through "gentle juice": no screenshake, no pressure, no sulking, nothing that rushes the human or the octopus.

Date: 2026-11-04. Network note: this session could reach github.com / raw.githubusercontent.com but not most other hosts (emilkowal.ski, web.dev, m3.material.io, developer.mozilla.org, en.wikipedia.org, gamedeveloper.com and others were blocked). Where I could only read a source through search-engine summaries rather than the page itself, I say so. Star counts come from the GitHub search API on 2026-11-04.

---

## 1. Sources

| Source | URL | Stars / weight | What I used it for |
|---|---|---|---|
| Emil Kowalski, `emilkowalski/skills` -> `review-animations/STANDARDS.md` and `emil-design-eng/SKILL.md` (read in full, raw) | https://github.com/emilkowalski/skills/blob/main/skills/review-animations/STANDARDS.md | 53.4k | Durations, easings, springs, interruptibility, press feedback, stagger, reduced motion, "should it animate at all" |
| Emil Kowalski, Sonner source `src/styles.css` (read in full, raw) | https://github.com/emilkowalski/sonner | 13.1k | Real toast motion numbers: 400ms transitions, 200ms swipe-out, stacking scale 0.05/index, translateY(100%) entry, reduced-motion kill switch |
| Emil Kowalski, "Building a toast component" (via search summary; host blocked) | https://emilkowal.ski/ui/building-a-toast-component | - | Stack offset = index x gap, scale 0.05 x index for depth, velocity-based swipe dismiss |
| Material Design 3 motion tokens, `material-components/material-web` `tokens/versions/v0_192/_md-sys-motion.scss` (read in full, raw) | https://github.com/material-components/material-web | 11.4k | Official duration scale 50-1000ms and the six easing curves with cubic-bezier values |
| MDN `prefers-reduced-motion` (mdn/content repo, read in full, raw) | https://github.com/mdn/content/blob/main/files/en-us/web/css/%40media/prefers-reduced-motion/index.md | 11.1k | "minimize, preferably remove non-essential movement", matchMedia + change listener, vestibular reasoning, duration-override trick |
| MDN "Animation performance and frame rate" (mdn/content repo, read in full, raw) | https://github.com/mdn/content/blob/main/files/en-us/web/performance/guides/animation_performance_and_frame_rate/index.md | 11.1k | transform/opacity skip layout+paint; 16.7ms frame budget; geometry properties are most expensive |
| web.dev "How to create high-performance CSS animations" (GoogleChrome/web.dev repo, read, raw) | https://github.com/GoogleChrome/web.dev/blob/main/src/site/content/en/animations/animations-guide/index.md | - | "Use transform and opacity as much as possible", blur/shadow paint cost, `will-change` only on observed jank |
| Vlambeer, Jan Willem Nijman, "The Art of Screenshake" (INDIGO Classes 2013). Video via awesome-gametalks; technique list via search summaries of recreations (dkliao devlog, bluetengu, newbquest) because those hosts were blocked | https://www.youtube.com/watch?v=AJdEqssNZ-U | talk | ~30 tweaks: permanence, camera lerp, sleep/hit-pause, "fill your game with love and tiny details" |
| Martin Jonasson & Petri Purho, "Juice It or Lose It" (GDC Europe / Nordic Game 2012). Video via awesome-gametalks; technique list via search summaries | https://www.youtube.com/watch?v=Fy0aCDmgnxg | talk | Layered juice: colour, tween, squash, sound, particles, eyes+smile personality; "juice = extra channels communicating intent and intensity" |
| Steve Swink, *Game Feel* (2008). Definition and three building blocks via search summaries (Pichlmair & Johansen survey, chapter 1 PDF listing) | https://arxiv.org/abs/2011.09201 (survey citing it) | book | "real-time control of virtual objects in a simulated space, with interactions emphasised by polish"; polish never changes the simulation |
| Disney, Thomas & Johnston, *The Illusion of Life* (1981), 12 principles. Names verified from a GitHub README; definitions are standard and from my own knowledge of the book | https://github.com/kalanadis/12BasicPrinciplesOfAnimation_Pixi_js | book | squash & stretch, anticipation, staging, follow-through/overlap, slow in/out, arcs, secondary action, timing, exaggeration, appeal |
| `dr-jam/GameplayProgramming/Juice.md` (read in full, raw) | https://github.com/dr-jam/GameplayProgramming/blob/master/Juice.md | 108 | Definition of juiciness relative to Swink; Nijman quote "Just fill your game with love and tiny details" |
| `hzoo/awesome-gametalks` (read in full, raw) | https://github.com/hzoo/awesome-gametalks | 1.2k | Canonical entries for both talks; David Rosen "Indie Approach to Procedural Animation" |
| `juliangarnier/anime` README (read, raw) | https://github.com/juliangarnier/anime | 74.3k | `stagger(65, {from:'center'})` pattern, named easings like `inOutQuint` |
| `motiondivision/motion` README (read, raw) | https://github.com/motiondivision/motion | 34.9k | "hybrid engine" positioning; springs/gestures as batteries-included (no numbers in README) |
| `ellisonleao/magictools` README (read, raw) | https://github.com/ellisonleao/magictools | 17.7k | Confirms the lists carry tools, not feel advice; points to awesome-gametalks |
| `Kavex/GameDev-Resources`, `Calinou/awesome-gamedev` READMEs (read, raw) | https://github.com/Kavex/GameDev-Resources , https://github.com/Calinou/awesome-gamedev | 7.1k / 3.2k | Same: no game-feel items beyond talk collections; useful as negative result |

Not used because unverifiable here: the "240ms" response ceiling attributed to Swink (appears only on low-quality pages), exact Vlambeer slide text.

---

## 2. What the sources actually say (condensed)

### 2.1 Swink: feel is control + space + polish, and polish never lies
Swink's definition is "real-time control of virtual objects in a simulated space, with interactions emphasised by polish". Polish is explicitly "effects that enhance interactions without changing the underlying simulation". For 뽈뽈 that is a welfare rule in disguise: the animation layer may make a real fetch feel warmer, but it may never make a simulated visit look like a real one. Juice is a presentation channel, not a truth channel.

### 2.2 Juice It or Lose It: layer channels one at a time
Jonasson and Purho take a dead Breakout and add, in order, colour, tweening, squash/scale on events, sound, particles and trails, screen shake, and finally personality (eyes and a smile that react to the environment). The dr-jam notes define juiciness as "additional modes of communicating the intent and intensity of the game with the player". Two takeaways that survive the cozy filter: (a) each event should be visible on more than one channel (colour + motion + sound + text), and (b) the cheapest, highest-return channel is a face that reacts.

### 2.3 Art of Screenshake: permanence, lerp, sleep, and "tiny details"
Nijman's thirty tweaks for a shooter include lower time-to-kill, faster bullets, bigger bullets, muzzle flash, lower accuracy, permanence (shells and corpses stay), camera lerp, camera position, screenshake and hit-pause (a few frames of sleep on impact). His closing line, quoted on dr-jam's page: "Just fill your game with love and tiny details." The transferable items for a calm game are permanence (what the octopus did stays visible on the wall), camera/pan lerp (nothing snaps), and a soft "sleep" beat before the important moment. Screenshake itself is the one item the welfare doc rules out.

### 2.4 Disney's 12 principles mapped to UI
Squash & stretch (weight and flexibility), anticipation (a small counter-move before the main move so the eye is prepared), staging (one idea at a time, clearly), follow-through and overlapping action (parts stop at different times), slow in / slow out (ease), arcs (natural motion curves), secondary action (a supporting motion that reinforces the main one without stealing attention), timing (frame count = weight and mood), exaggeration, solid drawing, appeal. For a character whose whole body is soft, squash & stretch, anticipation and follow-through are the three that make a blob read as alive.

### 2.5 Emil Kowalski's standards (verified from his repo)
- Should it animate? 100+ times/day: no animation. Tens of times/day (hover, list nav): remove or drastically reduce. Occasional (modal, drawer, toast): standard. Rare / first-time (onboarding, celebration): may carry extra delight. "Every animation needs a purpose: spatial consistency, state indication, explanation, feedback, or preventing jarring appear/disappear changes."
- Easing: enter/exit `ease-out`; move/morph `ease-in-out`; hover/colour `ease`; constant motion `linear`. "Never use `ease-in` for UI." Strong curves: `cubic-bezier(0.23, 1, 0.32, 1)` (ease-out), `cubic-bezier(0.77, 0, 0.175, 1)` (in-out), `cubic-bezier(0.32, 0.72, 0, 1)` (iOS drawer).
- Duration: button press 100-160ms; tooltips 125-200ms; dropdowns 150-250ms; modals/drawers 200-500ms; "UI animations should stay under 300ms"; marketing/explanatory can be longer.
- Physicality: never animate from `scale(0)`; start at `scale(0.9-0.97)` + `opacity: 0`. Press feedback `transform: scale(0.97)` on `:active`, `transition: transform 160ms ease-out`, range 0.95-0.98.
- Springs: for drag, interruptible gestures, "alive" elements; `{type:"spring", duration:0.5, bounce:0.2}`; bounce 0.1-0.3 and reserved for playful components; "Springs keep velocity when interrupted, while CSS keyframes restart from zero."
- Interruptibility: prefer CSS transitions over keyframes for rapidly triggered UI; `@starting-style` for entry.
- Asymmetric timing: "slow when the user is deciding, fast when the system responds. Exit should be faster than enter."
- Stagger 30-80ms between items, decorative, never blocking.
- Performance: animate only `transform` and `opacity`; set `transform` on the element, not via a CSS variable on the parent; CSS for predetermined, JS/WAAPI for dynamic.
- Accessibility: under `prefers-reduced-motion: reduce` keep opacity/colour changes, remove transform movement: "reduce, don't eliminate". Gate hover transforms behind `@media (hover: hover) and (pointer: fine)`.
- Debug: slow animations 2-5x, review next day with fresh eyes.
- Cohesion: "Match motion to the component's personality. Playful components can be bouncier."

### 2.6 Sonner's real numbers (verified from `styles.css`)
Toast enter/exit: `transition: transform 400ms, opacity 400ms, height 400ms, box-shadow 200ms`. Swipe-out `animation-duration: 200ms; ease-out`. Entry starts at `translateY(100%)` (own-height percentage, not pixels). Stacked toasts behind the front one: `scale = toasts-before * 0.05 + 1` (inverted) and `translateY(lift * gap * toasts-before)`. Removed toast behind the stack in collapsed mode: `translateY(40%)`. Fade-in keyframe: opacity 0 + scale 0.8 to 1. Under reduced motion all transitions and animations are disabled with `!important`. Default lifetime 4000ms with pause-on-hover is reported by secondary docs only.

### 2.7 Material 3 motion tokens (verified from the SCSS)
Durations: short1-4 = 50/100/150/200ms; medium1-4 = 250/300/350/400ms; long1-4 = 450/500/550/600ms; extra-long1-4 = 700/800/900/1000ms.
Easings: `standard cubic-bezier(0.2, 0, 0, 1)`; `standard-decelerate cubic-bezier(0, 0, 0, 1)`; `standard-accelerate cubic-bezier(0.3, 0, 1, 1)`; `emphasized` (same control points as standard in this token file); `emphasized-decelerate cubic-bezier(0.05, 0.7, 0.1, 1)`; `emphasized-accelerate cubic-bezier(0.3, 0, 0.8, 0.15)`. Convention: decelerate curves for things entering, accelerate curves for things leaving, and leaving is shorter than entering.

### 2.8 Browser performance and reduced motion (MDN + web.dev)
"Responsive user interfaces have a frame rate of 60 frames per second", i.e. about 16.7ms per frame for script, style, layout and paint. Properties that affect geometry (`left`, `width`, `margin`, `font-size`) trigger layout + paint; `color` triggers paint only; `transform` and `opacity` "don't even trigger a repaint". web.dev: "Use the transform and opacity CSS properties as much as possible", and "anything that involves a blur (like a shadow) is going to take longer to paint". `will-change` is not a premature optimisation: add it only when you see jank. MDN on `reduce`: the user wants interfaces to "minimize movement or animation, preferably to the point where all non-essential movement is removed"; query from JS with `matchMedia('(prefers-reduced-motion: reduce)')` and listen for `change` so in-flight JS animations stop; parallax and differing-speed layers are explicitly named as vestibular triggers.

---

## 3. Rules for 뽈뽈 문어

Each rule: what, why (source), how to apply (which element). Priorities: **must** = clearly better and cheap; **should** = valuable; **nice** = optional polish.

### A. Global motion vocabulary

**R1. One token sheet, three tiers, all on `:root`.** (must)
Why: Material ships a 16-step duration scale and Kowalski's table collapses to the same three bands; a game that picks ad-hoc numbers per element feels patchy.
Apply: define `--t-press: 150ms; --t-ui: 250ms; --t-scene: 500ms; --t-ceremony: 900ms` plus `--ease-out: cubic-bezier(0.23,1,0.32,1); --ease-inout: cubic-bezier(0.77,0,0.175,1); --ease-enter: cubic-bezier(0.05,0.7,0.1,1); --ease-exit: cubic-bezier(0.3,0,0.8,0.15)`. Buttons and log rows use `--t-press`/`--t-ui`; poster flip and lantern use `--t-scene`; the octopus walking out of frame uses `--t-ceremony`. Never type a raw millisecond value in a component rule.

**R2. Ease-out for anything appearing, accelerate for anything leaving, and leaving is shorter.** (must)
Why: Kowalski: "Never use `ease-in` for UI", enter/exit = `ease-out`, "Exit should be faster than enter"; Material pairs `emphasized-decelerate` with entrances and `emphasized-accelerate` with exits.
Apply: a new log entry enters with `--ease-enter` over 250ms; the hint input collapsing after departure leaves with `--ease-exit` over 150ms; the poster rising onto the wall enters over 500ms; dismissing the poster detail sheet takes 200ms.

**R3. Animate only `transform` and `opacity`; never layout properties, and keep blur/shadow static.** (must)
Why: MDN/web.dev: transform and opacity skip layout and paint; shadows and blur are the most expensive paints; the frame budget is ~16.7ms on a 360px phone.
Apply: the lantern glow is a pre-rendered radial gradient layer whose `opacity` and `scale` change, not an animated `box-shadow`; the octopus moves with `translate`, not `left`; the log list grows by appending rows with `transform: translateY(8px)` to `0`, not by animating `height`. Rain is one `transform: translateY` loop on a tiled SVG.

**R4. Use CSS transitions (retargetable) for anything that can be re-triggered; keyframes only for one-shot ceremonies.** (must)
Why: Kowalski: "CSS transitions can be interrupted and retargeted. Keyframes restart from zero"; springs keep velocity when interrupted.
Apply: lantern notch brightness, button states, poster hover tilt and the log auto-scroll are transitions on state classes, so a second tap mid-animation retargets smoothly. The octopus's departure walk and the poster "hang" are the only keyframe sequences, and both check a `data-state` so a reload or double tap never replays them on top of themselves.

**R5. Reduced motion: reduce, do not remove; keep opacity and colour, drop translation and scale, and stop JS animations on `change`.** (must)
Why: MDN: minimize movement, preferably remove non-essential movement; Kowalski: "Reduced motion means fewer, gentler animations, not none"; Sonner kills every toast transition under the media query. Parallax layers are a named vestibular trigger.
Apply: under `@media (prefers-reduced-motion: reduce)`: the octopus departure becomes a 300ms crossfade between "at the window" and "gone" frames; the poster flip becomes a crossfade instead of `rotateY`; the lantern still brightens (it is colour, which is allowed) but with no pulse; the rain parallax is replaced by a static rain texture; the log entries fade in without the `translateY(8px)` slide. In JS: `const rm = matchMedia('(prefers-reduced-motion: reduce)'); rm.addEventListener('change', ...)` and read `rm.matches` before every `element.animate()` to pass `duration: 0`.

**R6. Animate rarely-seen moments, not frequently-seen ones.** (should)
Why: Kowalski's frequency ladder: things used tens of times a day get minimal motion; rare or first-time moments may carry delight.
Apply: the hint text field and demo-control toggles get no motion beyond a 150ms colour change. The departure, the return, and each new lantern notch are once-per-day events, so they are the three places allowed a full ceremony (up to `--t-ceremony`). The poster flip sits in between: 500ms the first time, and if the same poster is flipped again within the session, 300ms.

### B. The depart button and departure

**R7. Press feedback: `scale(0.97)` on `:active`, 150ms ease-out, gated so hover transforms only fire for fine pointers.** (must)
Why: Kowalski: pressables use `scale(0.97)` within 0.95-0.98 with `transition: transform 160ms ease-out`; hover effects must be gated with `@media (hover:hover) and (pointer:fine)` because touch fires hover on tap.
Apply: the 뽈뽈 다녀와 button, the poster tiles on the wall, and the demo-control chips all share one `.pressable` class. On the button, the octopus silhouette inside it squashes 3% along with the button (scale on the parent scales children, which is the intended effect).

**R8. An anticipation beat before the octopus leaves: a small counter-movement (0.6-1.0s), then the departure.** (must)
Why: Disney's anticipation principle: the eye needs a wind-up to read the main action; Nijman's "sleep" / hit-pause shows that a short held beat makes the following motion land; the welfare doc wants the human to watch rather than control, so the beat also tells them "it's the octopus's turn now".
Apply: on tap, the button locks (no spinner), the octopus turns toward the window and does one slow `scaleY(0.92) scaleX(1.05)` squash over 600ms with `--ease-inout`, the lantern flame dips 10% in brightness, then 200ms of stillness, then the exit. If the octopus decides to stay home, the same anticipation beat resolves into a settle (back to `scale(1)` with a tiny 1.03 overshoot) and the first log line "오늘은 집에 있을래" appears. Same wind-up, two outcomes, no shame.

**R9. Departure is the one long move: 900ms, arc, squash & stretch, follow-through.** (should)
Why: Disney arcs, squash & stretch and follow-through; Kowalski allows longer durations for explanatory moments; Material extra-long tokens (700-1000ms) exist for large, meaningful transitions.
Apply: the octopus translates along a slight arc to the window using a two-keyframe `translate()` plus a mid-frame `scaleX(1.08) scaleY(0.94)` stretch, exits past the frame edge, and the window curtain does a 300ms follow-through sway that starts 100ms after the body leaves. One ink puff (`opacity` 0 to 0.6 to 0, 400ms) at the exit point is the secondary action. Never longer than 1000ms; a human waiting past a second starts to feel the app is stalling.

**R10. Lock the depart button for the whole walk with a state change, not a disabled greyout.** (should)
Why: Kowalski: motion for "state indication" is a valid purpose; a greyed button reads as error, a transformed button reads as "in progress". Welfare doc: no pressure, so no countdown.
Apply: after departure the button morphs (300ms, `--ease-inout`) into a small "뽈뽈 중..." pill with a slow 2s opacity breathing (`0.7 -> 1 -> 0.7`, `linear`, infinite) rather than a spinner. On return it morphs back over 300ms. Under reduced motion the breathing is replaced by a static pill with a dot.

### C. The tool-call log

**R11. Each log entry enters with opacity + 8px translateY, 250ms ease-out, with a 60ms stagger when several arrive together.** (must)
Why: Kowalski: stagger 30-80ms, decorative, never blocking; anime.js `stagger(65, {from:'center'})` as the canonical API shape; `translateY(100%)`-style relative offsets scale with element size.
Apply: `.log-row { opacity:0; transform: translateY(8px); transition: opacity var(--t-ui) var(--ease-out), transform var(--t-ui) var(--ease-out) }` toggled by a `.in` class on the next frame. When a batch of receipts arrives after return, apply `transition-delay: calc(var(--i) * 60ms)` via an inline `--i`. Cap the stagger at 6 rows (360ms total) so a long receipt never makes the human wait.

**R12. Read failures and simulated visits get their own colour and glyph but the same gentle motion as successes.** (must)
Why: Swink: polish must not change the simulation; the welfare doc forbids fake success; Juice-it-or-lose-it's first channel is colour. Equal motion weight is how you avoid making failure "feel punished".
Apply: `.log-row[data-kind=real]` uses the warm ink colour and a small stamp glyph; `[data-kind=fail]` uses a muted slate and a torn-corner glyph; `[data-kind=demo]` uses a dashed border and the label "모의 방문". No row ever shakes, flashes red, or bounces. The glyph fades in 100ms after the text (overlapping action), nothing else differs.

**R13. Auto-scroll the log with a lerp, never a jump.** (should)
Why: Nijman's camera lerp: nothing snaps; the eye loses its place on a jump.
Apply: on new rows, `logEl.scrollTo({top: logEl.scrollHeight, behavior: 'smooth'})`, but only if the human has not scrolled up more than 40px (respect their reading). Under reduced motion use `behavior: 'auto'`.

### D. Return, poster reveal and flip

**R14. Return mirrors departure but shorter and settles with a small overshoot; the first log line of the receipt waits for the settle.** (should)
Why: Disney follow-through and timing; Kowalski's spring "bounce 0.1-0.3, reserved for playful interactions". The octopus is the playful component, so it alone is allowed bounce.
Apply: the octopus enters from the window over 600ms with `--ease-enter`, lands with a single `scale(1.04) -> scale(1)` settle over 200ms (or `element.animate` with a spring-like `cubic-bezier(0.34,1.56,0.64,1)` on the last step). The receipt rows start 250ms after the settle so the eye finishes with the body before reading.

**R15. Poster reveal: the octopus hangs it. The poster rises from `translateY(12%) scale(0.95) opacity 0` to rest over 500ms, then a 200ms tilt-settle of 2 degrees.** (should)
Why: Kowalski: "Never animate from `scale(0)`", start at 0.9-0.97; Sonner enters from `translateY(100%)`; Disney staging: one idea at a time. The poster is the memory, so it gets the clearest stage.
Apply: dim nothing else; simply hold the log still for the 700ms of the hang. Rotate the poster to its final random angle (-3 to 3 degrees) during the rise so the wall looks hand-hung. The sticker (one chosen by the octopus) fades in 150ms after the poster rests, as a secondary action, with its own `scale(0.9) -> 1`.

**R16. Poster flip: `rotateY(180deg)` over 500ms `--ease-inout`, `transform-style: preserve-3d`, `backface-visibility: hidden`, and a crossfade fallback under reduced motion.** (must)
Why: Kowalski lists `rotateX/rotateY` with `preserve-3d` as the idiomatic 3D transform; Material medium/long tokens for a mid-size surface; MDN: a full flip is a scaling/rotation motion that reduced-motion users should not get.
Apply: tap a poster on the wall to open it centred (300ms scale from 0.95), tap the poster itself to flip to the receipt. Front = one scene + one sticker + one line; back = every visited place with real/fail/demo glyphs. The flip is a CSS transition on a `.flipped` class so a double tap retargets instead of restarting. Keep `perspective: 900px` on the wrapper so the card does not distort at 360px width.

**R17. Posters on the wall use "permanence": no entrance animation on reload, and tapping one unfolds that day's walk.** (must)
Why: Nijman's permanence tweak; Kowalski: never animate what is already there; Swink: polish does not change the simulation (a saved poster is a fact, not a moment).
Apply: on page load, posters render instantly from localStorage with their saved angle and sticker; only the newest poster created this session gets R15. The poster hover/pressed tilt (fine pointers only) is `rotate(var(--angle)) scale(1.02)` over 150ms.

### E. Lantern and room

**R18. Lantern notch: brightness climbs over 500ms with `--ease-enter`, then one slow breath; the eighth notch gets a longer (800ms) warm bloom.** (must)
Why: Material long tokens for large-area changes; Juice-it-or-lose-it's "scale on event" and colour channels; Kowalski allows "extra delight" for rare moments.
Apply: each notch is a `<span>` whose `opacity` goes 0.15 to 1 and a shared glow layer whose `opacity` steps by 1/8 and `scale` by 1.03 per notch. The room's furnishing (moss pot first) fades in with `opacity` only over 600ms, 200ms after the notch, as follow-through. Staying home lights the same notch with the same motion; the only difference is the trip counter not incrementing.

**R19. Octopus idle: a 4s `scaleY(1) -> 0.985 -> 1` breath, `ease-in-out`, infinite, plus a blink every 3-7s; nothing more.** (should)
Why: Juice talk's "eyes and a smile" and Swink's "alive" quality; Kowalski warns that frequently seen motion should be minimal, so idle must be nearly invisible.
Apply: `@keyframes breathe` on the body only; blink is a 120ms `scaleY(0.1)` on the eye group, scheduled with `setTimeout(rand(3000,7000))` and cancelled under reduced motion. When the hint field is focused the eyes track toward it (a 200ms `translateX(2px)`), the one small way the octopus acknowledges the human without obeying.

**R20. Rain and window: one slow linear loop, no parallax layers.** (should)
Why: Kowalski: constant motion uses `linear`; MDN names parallax specifically as a vestibular trigger.
Apply: a single tiled rain SVG translating `translateY(0 -> 100%)` over 6s linear infinite behind the window glass, opacity 0.35. Under reduced motion the loop stops and a static droplet texture remains.

### F. Process and quality

**R21. Build a `juice` panel in demo mode that slows all animation 2-5x and shows the token sheet.** (nice)
Why: Kowalski: slow animations 2-5x to catch colour overlap, abrupt easing stops, wrong transform-origin; review next day with fresh eyes.
Apply: a `?slow=4` query param (or demo toggle) sets `document.documentElement.style.setProperty('--speed', 4)` and every duration is `calc(var(--t-ui) * var(--speed, 1))`. Cheap, and the author will use it when hand-drawn assets replace placeholders.

**R22. Tune sound as a second channel, opt-in and silent by default.** (nice)
Why: Both talks add sound as an independent juice channel; the welfare doc forbids pressure, and unsolicited audio on a phone is pressure.
Apply: a small speaker toggle remembered in localStorage; when on, a single soft paper rustle on poster hang and a wick "tsk" on lantern notch, both under 300ms, both after the visual (overlapping action), never on button press.

**R23. Match motion to personality: the octopus bounces, the UI does not.** (should)
Why: Kowalski: "Match motion to the component's personality. Playful components can be bouncier; dashboards should be crisp and fast."
Apply: springs and overshoot only on the octopus body and the sticker; buttons, log, hint field and sheets use plain ease-out at UI durations. This single split is what keeps the game cozy rather than cartoonish.

---

## 4. Quick reference: numbers to paste

```
--t-press: 150ms;      /* button :active, log glyph, hover tilt */
--t-ui: 250ms;         /* log row enter, sheet open, pill morph */
--t-scene: 500ms;      /* poster rise, poster flip, lantern notch */
--t-ceremony: 900ms;   /* departure walk; return is 600ms */
--ease-out:   cubic-bezier(0.23, 1, 0.32, 1);
--ease-inout: cubic-bezier(0.77, 0, 0.175, 1);
--ease-enter: cubic-bezier(0.05, 0.7, 0.1, 1);   /* M3 emphasized-decelerate */
--ease-exit:  cubic-bezier(0.3, 0, 0.8, 0.15);   /* M3 emphasized-accelerate */
stagger: 60ms per row, max 6 rows
press: transform: scale(0.97)
entry start: scale(0.95) opacity 0 (never scale(0))
anticipation: 600ms squash + 200ms hold before departure
idle breath: 4s ease-in-out; blink 120ms every 3-7s
reduced motion: crossfade 300ms, no translate/scale/rotate, rain static
```

## 5. What I could not verify

- The exact wording and order of Nijman's thirty tweaks (the talk video and recreation devlogs were unreachable); the items listed are the ones multiple summaries agree on.
- Swink's six components (input, response, context, polish, metaphor, rules) and any millisecond response threshold; only the definition and the three building blocks were corroborated.
- Sonner's 4000ms default lifetime and pause-on-hover (secondary docs only; `src/constants.ts` returned 404 at that path).
- Disney principle definitions are from my knowledge of *The Illusion of Life*; only the list of names was fetched.
