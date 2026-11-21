# 04 — A touch minigame the player follows with no text (research, 2026-11-21)

Scope: how to make each cooking step explain itself, how to demonstrate gestures, how to show progress without a HUD
strip, picture-only buttons, feedback ("juice"), pacing, first play versus tenth play, anti-patterns, accessibility.
About 60 pages were opened (list in section 11). Numbers marked **[proposal]** are my design judgement built on the
sources, not figures a source gives. Anything not opened is marked "(unverified)".

How strong the evidence is: three sources are experiments (NN/g tutorial study, 70 users; Hiniker et al., 34 children
aged 2 to 5; Kao's juiciness study, read only through a survey paper, its sample of about 3,000 players known only
from a search snippet, unverified). The rest are platform guidelines and
practitioner talks. Studies with pre-readers are used as a lower bound: a screen a four-year-old can follow without
words is a screen a tired adult can follow with one thumb. That step is an inference, not a finding.

## 0. What changes the build (read this first)

1. **Delete the step strip and do not replace it with another strip.** Its three tool icons sit in the same paper frame
   as the real close button, so they signal "press me" (NN/g: borders, shape and placement are what tell people something
   is pressable; in NN/g's studies children expected pictures and characters to respond to a tap). Show progress in the world instead: the
   food changes state, ingredients are used up, the food travels from station to station, and the empty serving dish
   waits in view. Show the number of steps once, in the recipe book, before cooking starts.
2. **One step = one real kitchen motion, and the first few pixels of the gesture already change the food.** Today's
   "touch three marks three times each" is nine identical taps with no kitchen meaning; that is probably the main source
   of the "wrapper only" feeling (my reading). Cut = a stroke, stir = circles, flip = an upward flick, pour = hold. Apple: feedback
   during a gesture should let people predict the result and see how far they still have to move.
3. **Draw the tool where the finger must start, and let it follow the finger.** In the slice screen the knife lies at
   the bottom right while the gesture is on the food; the tool and the gesture are not connected.
4. **Keep the existing contextual ghost hand (first time, idle, after failed tries) but stage it slower and clearer.**
   Today the whole demo is about 1 s (a 4-frame motion three times). A path gesture is hard to read at 0.33 s a loop (my judgement; no source gives a figure).
   Use: appear, pause, perform at a human speed, pause, leave; two loops the first time, one loop on idle.
5. **A wiggling or pulsing object alone does not teach a gesture.** In the only controlled study found, such "visual
   state change" prompts were not understood even by the oldest children, although 41 % of the 100 reviewed apps
   used them; an animated cartoon hand worked from age three and a half. Use motion to say *where*, the hand to say *how*.
6. **Result screen: one large picture button that shows the outcome (the dish and the octopus together), one smaller
   quiet button (dish goes to the table, nobody is called), no "again".** Abstract symbols need labels; pictures of
   the thing itself are the icon class people understand best.
7. **Spend juice on the physical event, in a medium dose.** Per-action squash, crumbs, steam, a 1 art-px bump of
   the pan or board (not the whole screen), a short buzz. In the one large study, extreme juice and no juice both scored worse than a medium or high dose.
8. **Give every sound a visual twin.** Sound is off by default, so sizzle, chop, ring and "done" must each be visible.
9. **A dish is 5 to 7 steps and 45 to 90 s the first time [proposal]; no two neighbouring steps use the same gesture;
   one or two "care points" change how the dish looks, with no grade.**
10. **Tenth play: no demos, shorter and skippable transitions, small seeded variations, the looks you have made are
    kept in the recipe book.**
11. **Every step must also be finishable by plain taps on one helper button or a key** (WCAG 2.5.1 and 2.5.7: path
    gestures and drags need a single-pointer alternative). The kitchen already has a verb button that appears after an
    idle hint; keep that idea in every new step kind.

## 1. What makes a step self-explanatory

Rules a screen can be checked against (evidence after each):

- **R1 One obvious target.** Exactly one object or group of marks stands out at step start. Sesame Workshop (over 50
  touch studies with preschoolers): the steps to the goal should be obvious on each screen, the more fundamental the
  action the more eye-catching the element, and interactive elements should differ from the scene in colour, line
  weight or style, with subtle animation. George Fan (Plants vs. Zombies) used blinking icons and a big arrow and
  credits preschool toys: people press "the bright shiny object". NN/g on hint overlays: one hint about one primary
  action works; several at once are dismissed.
- **R2 The tool is the signifier.** A knife with its handle toward the thumb, a spatula tucked under the edge, a
  whisk standing in the bowl say what to do before any hand appears. Fan: "use visuals to teach" and "leverage what
  people already know". Swink: a familiar metaphor sets up how a thing should feel and behave. NN/g: icons and
  pictures that *resemble* the object are understood best.
- **R3 The gesture is the real motion.** Apple HIG: a custom gesture must be discoverable, straightforward, distinct
  from the others, and not the only way to do an important thing. Sesame ranks gestures for small children: tap is the
  most intuitive; tracing and dragging are liked but fingers lift, so "support partial completion"; swipe is intuitive
  *if the screen shows where to swipe*; flick is unfamiliar (accept a tap or a drag too); double tap, pinch and
  multi-touch should not be required. NN/g: swiping, tapping big targets and dragging are easy even for the youngest;
  let a drag also be done by tapping the destination.
- **R4 Motion hints say where, not how.** Hiniker et al. 2015 (34 children, 2 to 5): prompts that only changed the
  object (it moved sideways to say "swipe me", pulsed to say "tap me") were ineffective at every age; audio and a
  cartoon-hand demonstration were understood by under a third at age 3 and about two thirds at 3.5.
- **R5 Feedforward: the gesture shows its own result early.** Apple HIG Gestures: respond as people perform a gesture,
  in a way that helps them predict the result and shows the extent and type of movement needed. In the kitchen: at
  touch-down the knife bites and a 2-px cut starts; the pancake edge lifts under the finger before the flick distance
  is reached; the batter swirls after the first quarter turn.
- **R6 The first reaction is immediate.** NN/g: 0.1 s is the limit for feeling you are moving the object yourself;
  simple feedback animations should take about 100 ms. On our 12 fps reaction grid one frame is 83 ms, so the first
  visible change must come on the very next frame.
- **R7 No dead touches.** Apple HIG: show when a gesture is not available, or people think the app froze. Sesame's
  three-level scaffold: first miss, gentle reaction; second, a hint; third, highlight the right thing. The kitchen's
  "dust speck" for a tap in the wrong place and the "three useless presses, then show the hand" rule already follow this.
- **R8 Forgive.** The game-feel survey (Pichlmair and Johansen) calls this streamlining: act on what the player meant.
  Wide bands, partial strokes that add up, accepting either a flick or a drag, no double taps.
- **R9 Things that are not buttons must not look like buttons.** NN/g: people need to tell static content from
  pressable content at a glance; Game Accessibility Guidelines: give a clear indication that interactive elements are
  interactive; Supersonic: what can be used and what cannot need different visual cues. This is the owner's complaint
  about the strip. Check the stove knobs in the flip screen the same way: a knob is a strong "turn me" signal, so it
  should either be the heat control or react when touched.

A quick test for R1 to R3: show a first-time person a screenshot of the step for five seconds and ask them to point
where they would touch and to mime the movement.

## 2. Demonstration hands

**When to show.** Only in context, one gesture at a time, when needed. NN/g's experiment: people who read up-front
tutorials were not more successful (91 % against 94 %), not faster, and rated the same tasks *harder* (4.92 against
5.49 of 7). Apple HIG Onboarding: teach through interactivity, prefer context-specific tips shown near the thing, and
do not show a skipped tutorial again on later launches. Fan: get the player to do it once; give tips only to players who are doing the wrong
thing so the others can "feel smart". Sesame: after inactivity give a short suggestion, 6 to 8 s for games (3 to 5 s
for stories). So the three triggers the kitchen already has are the right ones:

| Trigger | Today | Recommendation |
| --- | --- | --- |
| First time this device meets a gesture kind | one hand 600 ms after step start | keep; cancel it if the player makes progress first; play two loops [proposal] |
| No progress | one hand after 5 s | 6 s (Sesame's lower bound for games) [proposal]; one loop; again every 6 s, at most three times, then leave the helper button visible |
| Touches that change nothing | hand after 3 such presses (flip only) | same rule for every gesture kind |

**How it should move.** Hiniker's hand prompts, which worked: the hand fades in over the target, *pauses*, performs
the motion, *pauses*, fades out; for a tap the hand shrinks as if moving toward the screen and a dot shows for a
moment under the fingertip at contact. Earlier work cited there (Nacher et al.) found an animated hand beat a static
hand with arrows for two- to three-year-olds (unverified: read only as cited by Hiniker). One loop on the 12 fps grid
[proposal]: appear 2 frames, rest 3 frames, perform 8 frames for drag, slice and circle (about 0.67 s; 2 frames for a
flick; a tap is down 1, contact 2, up 1, done twice), rest 3 frames, leave 2 frames. That is about 1.5 s for a path
gesture and about 1 s for a tap or flick, against about 0.33 s per loop today.

**When to stop.** On the first progress event (already so). Never start while a finger is down. Never block input
for it: Apple HIG Motion says not to make people wait for an animation, least of all one they see more than once; NN/g
says an overlay that must be read before acting forces people to memorise.

**Not covering the food [proposal; no source measures this].** The fingertip, not the palm, sits on the target; the
hand body lies below or beside the food and enters from the bottom edge, where a thumb comes from; it stays
translucent (the present dithered hand is right); it covers less than a quarter of the food at any frame; after the
loop it leaves instead of resting on the food. In screenshot 01 the hand sits on one of the three marks and partly hides it.

**Five gestures that read differently in pixel art [proposal].** What tells them apart is contact, speed and whether
something is attached to the finger. The definitions follow Wroblewski's reference guide: a tap is a quick down-and-up,
a flick a quick stroke, a drag a move without lifting, a press a finger held still.

| Gesture | Hand | Mark on the scene |
| --- | --- | --- |
| Tap | dips 1 to 2 px smaller, back up; twice with a gap | contact ring flashes for 2 frames |
| Hold | dips and stays still | contact ring stays and fills or thickens; the stream or heat visibly continues |
| Drag (carry) | dips, moves slowly at even speed, lifts at the end | the object sticks to the fingertip; three fading dots behind |
| Swipe or flick | dips, 2 to 3 fast frames in a straight line, lifts while still moving | speed streaks; nothing attached at the start |
| Circle (stir) | dips, 1.5 turns at even speed | dotted oval path; the spoon follows the fingertip; the liquid swirls the same way |

A cut is a drag along a line with the slit opening behind the finger. Keep one gesture for one kitchen verb in every
dish: NN/g found people struggle when the same gesture means different things in different places.

## 3. Progress without a HUD strip

Two questions: "where am I in the recipe?" and "how far along is this step?".

| Option | For | Against | Verdict |
| --- | --- | --- | --- |
| **The food itself changes** (raw, mixed, golden, cut, plated) | The owner's reference art already reads this way. Sesame: make the goal visually explicit. Cozy Games (Cook et al.): an activity is cosy when the doing is satisfying in itself. Apple HIG Feedback: put status next to the thing it describes. | Needs clearly different states per step (art cost). | **Use for both questions.** |
| **Ingredients and tools used up** (three eggs become shells; the bowl empties; used tools go to the sink) | Goal-gradient effect: people speed up as the visible goal nears, so show what is left. No frame, so not a button. | Objects in a scene invite touching (NN/g: children expect pictures to respond), so make the next ingredient the real control and let the others give a small wobble. | **Use for "where am I".** |
| **The food travels between stations** (bowl, pan, board, plate; always the same direction) | Gives the rest between steps a job; Sesame: people scan left to right, top to bottom. | None found. | **Use.** |
| **Recipe card on the wall that fills in** | Game Accessibility Guidelines: allow a reminder of the current objective. | It is the old strip again unless it shows *food states* (not tools or hands), is drawn flat on the back wall with no button frame, and stays out of the corners where the real buttons are. Marcus Andrews (DICE): if an in-world display needs a HUD to prop it up, rethink it. | Optional, only if play tests show people feel lost. |
| **Dots** | Familiar from page indicators; NN/g notes such dots are seen but are far too small to tap, which is harmless for a display that is not a control. | Say nothing about what comes next; abstract. | Only as a fallback. |
| **Nothing** | Fine for 5 to 7 short steps when the end is in view. | Cozy Games: a safe ritual is "known", it will not eat an unexpected amount of time. | Acceptable if the recipe book showed the steps first. |

For "how far along is this step" use the food plus a faint ghost of the finished state (the outline the batter must
fill, the notches where the cuts go), never a bar. By analogy with NN/g's rule for waiting (a percent indicator only for
operations longer than about 10 s), a step this short needs no bar.

## 4. Picture-only buttons

**When they are understood.** NN/g: almost no icons are universal (home, print, search); a clock used for "history"
got zero clicks in testing; pictures that *resemble* the object do best, pictures that stand for an idea by analogy do
worse, arbitrary signs worst; pictures of a *change of state* are notoriously hard. Their rule: always pair an icon
with a visible text label. We cannot, so compensate five ways:

1. **Draw the outcome, not a symbol.** Primary: the finished dish (the real sprite) with the octopus's face and one
   arm reaching toward it. Secondary: the same dish on the table with an empty seat. Do not rely on a bell, a heart or a
   speech bubble alone (NN/g lists the heart and the star among the icons people misread most; the bell and bubble
   are my caution).
2. **Let the picture move a little** (the arm reaches every 3 s or so). Apple HIG suggests animated symbols where they
   make sense; Sesame lists an example animation among its visual cues (there, for hidden content); stop it under
   reduced motion.
3. **One clear primary.** Largest, warmest colour, bottom centre where "again" was. NN/g: primary actions deserve
   larger targets.
4. **Make a wrong guess free.** Both buttons end with the dish on the table, and the octopus can still be called
   from the table. Fan: one try teaches a control when its result is seen at once.
5. **Test it.** Supersonic: ask players what they believe each icon is for. Pass mark [proposal]: three of four
   first-time people say it before pressing. (ISO 9186 uses a 67 % comprehension mark: from memory, unverified.)

Honesty rule: the picture shows the octopus *coming to the dish*. Whether it eats stays with the labelled demo rule.

Recipe-book cards for dishes not yet received (for example those a cafe resident will give later) [proposal, no
source]: show the dish as a dark silhouette with a small mark of where it comes from (a cafe cup), not a padlock; a
padlock says "forbidden", the cup says "you get this there".

**Sizes.** Apple: 44 x 44 pt default, 28 pt absolute minimum. Google: 48 x 48 dp, about 9 mm, at least 8 dp apart.
NN/g: at least 1 cm x 1 cm, more for primary actions; 2 cm for young children. WCAG 2.2: 24 CSS px minimum (AA), 44
for the enhanced criterion (its AAA level is from memory). Hoober: 7 mm is enough at the screen centre, about 12 mm in corners. Game Accessibility Guidelines: 0.96 cm on
phones. 1 cm is roughly 53 to 63 CSS px (my arithmetic, assuming 0.16 to 0.19 mm per CSS px). In the kitchen the
buttons are DOM elements sized in CSS px: today the result chip is 64, the close button is drawn at 48 with a 56 px hit
area, and one art px is 4.5 CSS px at 360 x 740 (4 at 320 x 568, about 5 at 412 x 915; from the layout code). So
[proposal]:

| Control | Size at 360 x 740 | At 320 x 568 | Place |
| --- | --- | --- | --- |
| Primary "call the octopus" | 80 x 80 CSS px | 72 px | bottom centre, where the chip is today; at least 24 px above the bottom safe area (today 16) |
| Secondary "to the table" | 60 x 60 | 56 px | to its left, 16 px or more away |
| Close | drawn 48, hit area 64 (today 56) | hit area 56 | top right (a corner, hence the larger hit area) |
| Recipe-book dish cards | 96 px or more wide, two per row | 88 px | middle of the page |

**Thumbs.** Hoober's 2013 field counts: 49 % of observed phone use was one-handed, 36 % cradled; people change grip constantly and
prefer to look at and touch the *centre*; put the main content there and secondary actions along the top and bottom
edges. So the food and all gesture start points belong between about 30 % and 80 % of the height (y 220 to 590 of
740) and at least 24 px from the sides (the engine already ignores touches that start there). Sesame warns (about children holding tablets) that
controls on the bottom edge get touched by accident. The result button already ignores presses for 900 ms; keep that
guard (Game Accessibility Guidelines suggest about 0.5 s between accepted inputs).

## 5. Feedback and juice

- **What polish is for.** Swink: polish is the impression of physicality made by animation, sound and effects moving
  in step with the player's input; choose effects that tell the material (squishy, crisp, wet). Jonasson and Purho's
  "Juice it or lose it" demo lists its layers in its settings file: tweened entrances, stretch and squash, particles,
  trails, sounds for each kind of contact, screen shake, a short freeze on impact, and a face whose eyes follow the
  action.
- **Dose.** Kao's study, as summarised in the game-feel survey: medium and high juice beat both none and extreme on
  play time, experience, motivation and performance. Folmer Kelly: polish can cost immersion and context. Game Developer's juicing
  article: juice must echo the core action ("we can't get a good juice without a good fruit"). Apple HIG Motion:
  purposeful, brief, precise. NN/g: the more often an animation plays, the shorter and subtler it should be; 100 ms
  for simple feedback, 200 to 300 ms for large changes, 500 ms already drags.
- **Per action [proposal].** Chop: knife flash 1 frame, board dips 1 art px, 2 to 4 crumbs, the slice slides 1 to 2 px
  away. Stir: the swirl follows the finger's angle, colours blend step by step (that is the progress), a ripple line
  behind the spoon. Flip: 1 frame squash before take-off, stretch on the way up, about 250 ms in the air, 2 frames of
  squash on landing with oil dots and a steam puff. Pour: the stream lasts as long as the hold, the level rises, the
  surface wobbles when it stops. Crack: tap makes a crack line, pulling apart drops a wobbling yolk.
- **Squash and stretch at pixel scale.** One or two art px, on the food and the tool, for 1 to 2 frames.
- **Screen shake limits [proposal].** Move the pan or the board, not the camera; 1 art px (4.5 CSS px at 360 wide)
  for at most 2 frames (170 ms), with 2 art px as the hard ceiling; only for heavy events (landing, lid, the plate set down); never while a finger is drawing a
  path, because it moves the target under the finger; none under reduced motion. Xbox guideline 117 asks that screen and
  camera movement can be switched off, and WCAG 2.3.3 asks the same of motion animation triggered by interaction; the
  shake in the Vlambeer write-up is slight and directional.
- **Sound off: visual twins.** Xbox guideline 103 and Game Accessibility Guidelines: no essential information by
  sound alone. Without letters: impact bursts for chops, flickering edge pixels and rising squiggles for sizzle,
  thicker steam and a colour band change for "golden", ring arcs for "done", plus the octopus sticker reacting.
  Never tell golden from crisp by colour alone: add texture or steam.
- **Haptics.** Apple: one haptic for one cause, used the same way every time, short, in step with the animation,
  not overused, optional. Android: "less is more". MDN: `navigator.vibrate` takes a duration or pattern and does
  nothing where unsupported, so it can never be the only channel. (iOS Safari does not support it: from memory,
  unverified.) Budget [proposal]: 10 to 20 ms for a discrete contact, at most about four a second, 30 to 40 ms for
  a landing or "done", nothing continuous while stirring.

## 6. Flow and pacing

- **Lengths.** WarioWare microgames last about three to five seconds each; a Cooking Mama dish is one to about a
  dozen minigames (both from Wikipedia). NN/g: about 10 s is the limit for holding attention on one exchange (measured for waiting; used here by analogy). Cozy
  Games: a cosy ritual is safe, *known* (bounded) and relaxed (hands busy, mind free). [Proposal] 5 to 7 steps a dish;
  4 to 12 s a step; 45 to 90 s the first time, 35 to 60 s later; 3 to 8 inputs or one 3 to 6 s continuous motion a step.
- **Rests.** A hands-off beat between steps in which the food travels to the next station: 0.6 to 1.0 s on early
  plays [proposal] (today 0.4 s, 1.0 s after the flip), skippable by touch after the first 250 ms.
- **Variety.** No two neighbouring steps with the same gesture; at least three gesture kinds a dish; alternate
  discrete (chop, crack), continuous (stir, pour) and one watch-and-wait (heat) that has something to look at. The Game
  Developer gestures article praises a minigame collection in which nearly every minigame has its own gesture.
- **Not a tapping chore.** Each input must change the picture, and not by the same amount each time. Keep the
  hold-to-repeat that exists (Game Accessibility Guidelines: avoid forced repeated inputs).
- **End strong.** Peak-end rule: an experience is judged by its peak and its end. The last step (plating, garnish)
  and the serve should carry the best feedback of the dish, and the button after it must pay off.
- **Mastery without failure.** Cooking Mama rates each dish from its minigames, awards medals, runs time limits and
  shows an angry face on a failed step before carrying on (Wikipedia): the pressure our rules exclude. Cozy Games: once the reward outweighs the pleasure of the act, the act stops being
  cosy. Pixel Poppers: punished failure turns a *learning* challenge into a *mastery* challenge; without it the
  learning stays. A no-fail developer write-up reports responsive animation gives a sense of progress without points.
  So [proposal]: **variants, not grades.** One or two care points a dish change how it looks (soft, golden or crisp;
  thick or thin slices; where the garnish lands), every variant is drawn appetising, the recipe book keeps the looks
  you have made, and a deft input earns a flourish (the higher flip for a faster flick already exists). Toca Boca goes to the
  far end of this scale, toys rather than games: no set goals, things to pick up and play with (Kill Screen). A garnish step
  with free placement borrows that.

## 7. First play versus tenth play

(The table is a proposal; its sources are named under it.)

| | First play | Tenth play |
| --- | --- | --- |
| Demonstration hand | first meeting of each gesture kind, two loops | never, except after 6 s idle or three useless touches |
| Transitions | 0.6 to 1.0 s, all shown | 0.4 to 0.5 s, skippable by touch |
| Helper button | appears after the first idle hint | stays where the player last used it |
| Variation | fixed layout | seeded per day: ingredient spots, garnish, sticker reactions |
| Goal | "I made it" | fill the dish's page with its variants; try the other care-point outcome |
| Juice | full | the same events with small randomness in particles, so they do not go stale |

Do not change the gesture for a verb, the place of the buttons or the order of stations: consistency is what makes
the tenth play fast. Sources: Fan (adaptive messaging), Apple HIG Onboarding (do not show again) and Motion (let people
cancel motion), NN/g (frequent animation should be shorter), the Vlambeer write-up (its example gives a repeated event a random one-in-three variation).

## 8. Anti-patterns: what makes a minigame a hollow imitation

1. **One gesture for everything** (tap, tap, tap) with no relation to the kitchen action.
2. **A canned animation after a threshold** instead of the food following the finger. Swink lists real-time response
   to input among the ingredients of game feel.
3. **Juice on nothing**: sparkles on an action with no weight. Extreme juice, like none, scored worse than a medium dose.
4. **HUD pieces that look pressable and are not** (the strip), and icons nobody can name (NN/g: an obscure icon is a
   wasted feature).
5. **The same plate whatever the player did.** The dish should carry traces: where the cuts fell, how brown it got.
6. **A hard cut** from the kitchen to the room with the dish simply present. The serve must be one continuous motion
   of the same sprite.
7. **Reading before doing**: tutorial cards, overlays, a demo that must finish before input is accepted.
8. **A hand that hides the food, lingers, or returns while the player is already doing the right thing.**
9. **Waiting with nothing to watch**, or a progress bar laid over the food.
10. **Borrowed pressure**: timers, grades, sad faces in a game that cannot be lost.
11. **Dead touches**: a touch that does nothing and says nothing.
12. **Shake and flash as decoration**, and motion that ignores the reduced-motion setting.
13. **A dead-end reward screen** whose only exit is "again".

## 9. Accessibility notes that touch the build

- **Reduced motion.** `prefers-reduced-motion` (MDN): replace movement with frame swaps, colour or fades. WCAG 2.3.3
  does not count colour or opacity changes as motion animation. Apple: animation that tracks the finger directly is
  acceptable. The kitchen already swaps squash and bump for a flash; hold every new effect to that.
- **Single-pointer and one-switch play.** WCAG 2.5.1 (A): flicks and traced shapes need a tap alternative; 2.5.7
  (AA): so do drags; both allow an exception where the gesture is essential, but the alternative is cheap here. Game Accessibility Guidelines: avoid required holds and repeated
  mashing, do not make precise timing essential, keep controls simple enough for a switch. One helper button plus
  Enter or Space that advances the current step by one unit per press (and auto-repeats while held) covers all of it.
- **Screen readers.** MDN: a canvas is a bitmap and exposes nothing to assistive tools. Keep real DOM buttons with
  aria-labels, a label on the canvas, and the polite live line; announce events the player did not cause.
- **Haptics and sound** each need an off switch (Game Accessibility Guidelines, Xbox guideline 110).

## 10. Checklist: 20 testable rules for the kitchen

(S = check on a screenshot, P = check in a play session.)

1. (S) At the start of every step exactly one object or group of marks stands out; a newcomer shown the screenshot
   for 5 s points at it.
2. (S) The step's tool is drawn where the finger must start, handle toward the bottom of the screen, and in play it
   follows the finger; no tool lies apart from its gesture.
3. (S) Nothing carries a button frame unless pressing it does something; during a step the top-left corner is empty
   and there is no strip, bar or row of icons anywhere.
4. (S) Start, middle and end screenshots of any step can be put in the right order by someone who has not played.
5. (S) From a mid-recipe screenshot a newcomer can tell roughly how much is left (ingredients remaining, the
   station, the waiting serving dish).
6. (P) The frame after any touch-down shows a change (within 100 ms), including a touch in the wrong place.
7. (P) In the first quarter of a gesture the food already moves toward the result; stopping halfway leaves a halfway
   result, and partial strokes add up.
8. (P) The demonstration hand appears only on the first meeting of a gesture kind, after 6 s without progress, or
   after three touches that changed nothing; never while a finger is down; it is gone on the first progress.
9. (S/P) The hand is translucent, its fingertip is on the target, its body is below or beside the food, it covers
   less than a quarter of the food in any frame, and it does not rest on the food after its loop.
10. (P) With sound off a tester can name each demonstrated gesture (tap, hold, drag, swipe, circle) from the hand alone.
11. (P) Input is never refused because a demonstration, sticker or transition is playing; a touch skips a
    between-step transition after its first 250 ms.
12. (P) No two neighbouring steps use the same gesture; a dish uses at least three gesture kinds; no step needs more
    than eight identical inputs; one gesture means the same kitchen verb in every dish.
13. (P) A first play takes 45 to 90 s, a step 4 to 12 s, and between steps there is a 0.4 to 1.0 s beat in which the
    food visibly travels to its next place.
14. (P) Each dish has one or two care points that change how it looks; every outcome looks good to eat; no number,
    grade, cross, timer or sad face appears anywhere.
15. (S) Result screen: one primary button of 72 CSS px or more at the bottom centre showing the dish and the octopus
    together; one quieter secondary of 56 px or more, at least 16 px away; no "again".
16. (P) Three of four first-time testers say, before pressing, that the primary brings the octopus to the dish and
    the secondary puts the dish on the table without calling it.
17. (P) After either button the same dish sprite travels to the table in one continuous motion; at no moment does
    the dish simply appear.
18. (S) At 320 x 568 every target is at least 48 x 48 CSS px with 8 px between targets, corner targets have a 56 px
    hit area, and no gesture has to start within 24 px of a side edge or 32 px of the bottom edge.
19. (P) With sound and vibration off a tester can still point out each moment that has a sound: contact, cut done,
    heat on, golden, flipped, dish done. With reduced motion on there is no shake, bump, zoom or slide and the game
    is fully playable; otherwise a shake is 1 art px (never more than 2) for at most 2 frames and never occurs during a path gesture.
20. (P) Every step can be finished by single presses of one visible helper button or the Enter or Space key (no drag,
    hold or timing), and a screen reader hears one short line per step and per result.

## 11. Sources opened (all on 2026-11-21)

Experiments and research
- Hiniker et al., "Touchscreen Prompts for Preschoolers", IDC 2015 (PDF text read): https://faculty.washington.edu/alexisr/TouchscreenPrompts.pdf ; lab page https://depts.washington.edu/chilllab/?p=186
- Sesame Workshop, "Best Practices: Designing Touch Tablet Experiences for Preschoolers" (PDF text read): https://joanganzcooneycenter.org/wp-content/uploads/2020/02/SesameWorkshop-2012.pdf ; landing page https://joanganzcooneycenter.org/?p=19607
- NN/g, "Mobile Tutorials: Wasted Effort or Efficiency Boost?": https://www.nngroup.com/articles/mobile-tutorials/
- Pichlmair and Johansen, "Designing Game Feel. A Survey" (abstract and PDF text; source for Kao's result): https://arxiv.org/abs/2011.09201
- Hoober, "Design for Fingers, Touch, and People, Part 1": https://www.uxmatters.com/mt/archives/2017/03/design-for-fingers-touch-and-people-part-1.php ; "How Do Users Really Hold Mobile Devices?": https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php

Nielsen Norman Group
- Icon usability: https://www.nngroup.com/articles/icon-usability/ ; icon classes: https://www.nngroup.com/articles/classifying-icons/
- Touch targets: https://www.nngroup.com/articles/touch-target-size/ ; clickable elements: https://www.nngroup.com/articles/clickable-elements/
- Contextual swipe (gesture discoverability): https://www.nngroup.com/articles/contextual-swipe/ ; instructional overlays: https://www.nngroup.com/articles/mobile-instructional-overlay/
- Response-time limits: https://www.nngroup.com/articles/response-times-3-important-limits/ ; animation duration: https://www.nngroup.com/articles/animation-duration/ ; visibility of system status: https://www.nngroup.com/articles/visibility-system-status/
- Children: https://www.nngroup.com/articles/children-ux-physical-development/ ; https://www.nngroup.com/articles/childrens-websites-usability-issues/

Platform guidelines
- Apple HIG, opened as the data files behind the public pages (the pages need scripts): https://developer.apple.com/tutorials/data/design/human-interface-guidelines/gestures.json and, in the same folder, accessibility.json, playing-haptics.json, feedback.json, onboarding.json, designing-for-games.json, motion.json (public page: https://developer.apple.com/design/human-interface-guidelines/gestures and so on)
- Google, Android accessibility help, touch target size (cites Material's 48 dp): https://support.google.com/accessibility/android/answer/7101858?hl=en ; Android haptics principles: https://developer.android.com/develop/ui/views/haptics/haptics-principles
- W3C WCAG 2.2 Understanding pages (read through a summarising fetch, not raw text): https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html ; https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html ; https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html ; https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
- MDN: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion ; https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API ; https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas ; web.dev https://web.dev/articles/prefers-reduced-motion (opened; nothing used beyond what MDN says)
- Game Accessibility Guidelines: full list https://gameaccessibilityguidelines.com/full-list/ and five detail pages: https://gameaccessibilityguidelines.com/ensure-interactive-elements-virtual-controls-are-large-and-well-spaced-particularly-on-small-or-touch-screens/ ; https://gameaccessibilityguidelines.com/avoid-provide-alternatives-to-requiring-buttons-to-be-held-down/ ; https://gameaccessibilityguidelines.com/avoid-repeated-inputs-button-mashing-quick-time-events/ ; https://gameaccessibilityguidelines.com/provide-very-simple-control-schemes-that-are-compatible-with-assistive-technology-devices-such-as-switch-or-eye-tracking/ ; https://gameaccessibilityguidelines.com/ensure-screenreader-support-for-mobile-devices/ (other guidelines are cited by their titles in the full list only)
- Xbox Accessibility Guidelines: https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/103 ; https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/110 ; https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/117

Game design practice
- Game Developer, "GDC 2012: 10 tutorial tips from Plants vs. Zombies creator George Fan": https://www.gamedeveloper.com/design/gdc-2012-10-tutorial-tips-from-i-plants-vs-zombies-i-creator-george-fan
- Steve Swink, "Game Feel: The Secret Ingredient": https://www.gamedeveloper.com/design/game-feel-the-secret-ingredient
- "Squeezing more juice out of your game design!": https://www.gamedeveloper.com/design/squeezing-more-juice-out-of-your-game-design-
- Folmer Kelly, "Don't Juice It or Lose It" (write-up): https://www.gamedeveloper.com/design/video-indies-resist-the-urge-to-juice-it-or-lose-it-
- Vlambeer, "The Art of Screenshake" (write-up): https://www.gamedeveloper.com/design/vlambeer-co-founder-shares-advice-on-building-better-action-games
- Jonasson and Purho, "Juice it or lose it" demo, settings file and licence (zlib; principles only): https://cdn.jsdelivr.net/gh/grapefrukt/juicy-breakout@master/src/com/grapefrukt/games/juicy/Settings.as ; https://cdn.jsdelivr.net/gh/grapefrukt/juicy-breakout@master/LICENSE
- Marcus Andrews, "Game UI Discoveries: What Players Want": https://www.gamedeveloper.com/design/game-ui-discoveries-what-players-want
- "Using gestures in mobile game design": https://www.gamedeveloper.com/design/using-gestures-in-mobile-game-design ; Supersonic on tutorial UI: https://supersonic.com/?p=102709 ; Luke Wroblewski, Touch Gesture Reference Guide: https://www.lukew.com/ff/entry.asp?1071
- Cook et al., "Cozy Games": https://lostgarden.com/2018/01/24/cozy-games/
- Toca Boca, "give them a toy, not a game" (Kill Screen): https://www.killscreen.com/secret-smart-kids-entertainment-give-them-toy-not-game/
- No-fail: https://pixelpoppers.com/2022/07/all-hail-no-fail/ ; https://dev.to/tatomamo_games/designing-against-stress-why-we-built-a-mobile-game-without-timers-ads-or-fail-states-m6p
- Laws of UX: https://lawsofux.com/goal-gradient-effect/ ; https://lawsofux.com/peak-end-rule/
- Wikipedia: https://en.wikipedia.org/wiki/Cooking_Mama_(video_game) ; https://en.wikipedia.org/wiki/WarioWare

Could not open
- Material Design pages (m2.material.io gestures, m3.material.io structure): empty without scripts. The 48 dp figure comes from Google's Android help page above.
- Sesame PDF at its original sesameworkshop.org address: 404 (read from the Cooney Center copy).
- MDN "Hit regions and accessibility": 404. Eurogamer's Miyamoto piece on World 1-1: 404 at the address tried.
- Kao 2020, "The effects of juiciness in an action RPG": full text not opened; its result is quoted from the survey above.
- The talks themselves ("Juice it or lose it", "The Art of Screenshake", Fan's GDC talk) were not watched; only write-ups and the demo's source were read.
- Nacher et al. (animated hand against static hand): known only as cited by Hiniker.

Notes
- No opened page tried to give instructions to the reader.
- Nothing was copied from any game; the juice demo's file was read for its list of effect names only.
- Kitchen code read for context only (`js/cook.js` tuning block and hint logic); no file other than this report was changed.

## 12. Open questions

1. Is a single helper button per step acceptable to the owner as the tap alternative for drags and flicks, and should
   it be visible from the start or only after the first idle hint (as now)?
2. Does the owner want a wall recipe card at all? The evidence supports going without if the recipe book shows the
   steps first, but only a play test with two or three newcomers can settle "do people feel lost".
3. Will a picture of "dish + octopus" be read as "call it to eat" and "dish + empty seat" as "just put it on the
   table"? Needs the four-person test in rule 16; the pictures should be tried on paper first.
4. The hand timings in section 2 and the shake limits in section 5 are proposals; they need one tuning pass on a real
   phone at 320 px wide.
5. Which side should the hand enter from for left-thumb players? No source settles it; entering from the bottom
   centre avoids the question.
6. Are the stove knobs in the flip screen meant to be controls? If not, they need to react or be drawn less like knobs.
