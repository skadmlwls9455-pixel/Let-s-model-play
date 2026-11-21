# UI pass 2 — every new sheet (lead, 11-21 23:20 KST)

The owner, 11-21 22:57 KST, written into lane F's session while looking at its screens: **"아 ui가 너무 조잡한데 저거 좀
개선해줘봐."** The same plain look is in the shop, the cafe menu, the record shelf, the notice board, the dialogue box and the
look sheet: a beige panel, thin outlined boxes in a grid, small labels, and an empty band above the sheet. The bar is a
commercial cozy pixel game. This pass is about looks only: rules, saves, messages and test hooks stay as they are.

## Rules for every sheet

1. **A place, not a form.** The top of the sheet is a pixel picture band about 96 CSS px tall that shows where we are (a
   shelf wall, the cafe counter, the stage curtain, a cork board), with the keeper's portrait (48 px or larger, the keeper's
   own colour and hat) at its left and the shell purse at its right. The title sits on a sign plate in Galmuri11 Bold 24 px.
   A small text label alone is not a title.
2. **Things are objects, not boxes.** Items stand on shelf planks, hooks, plates or a table (a 4 px plank with a 2 px
   shadow under each row). Item pictures are at least 64 CSS px on a 360 px screen, at a whole number of device px per art
   px. Prices hang as tags (tag shape with a hole: shell picture and number). Owned or sold out is a stamp across the tag.
   No thin 1 px rectangle around every item: a card is paper tone, a 2 px bevel (light top-left, dark bottom-right) and a
   4 px hard shadow.
3. **One frame language.** Panels: outer 2 px dark line, inner 2 px highlight, square corners, 8 px rhythm for every gap.
   Dividers are dotted pixel lines. Buttons are the existing `.btn.pressable` only: one amber primary per view, the rest
   paper. Nothing smaller than 16 px; body text 20 px; numbers bold.
4. **Fill the phone.** Sheet plus the scene above it fill 360x740 with no black or empty band. Outdoors the scene above the
   sheet must still show the place and the keeper (lane W fixes the view going black when a sheet opens in the wide
   outside). Without a 3D scene the picture band grows to fill.
5. **Small motion.** Sheet rises in 180 ms; cards pop in 40 ms apart; a purchase or a stamp gets a 6-frame sparkle and the
   shell number counts down. Reduced motion: none of it.
6. **Keep working.** Same ids, same `aria-label`s, same test hooks; your node and browser suites, `npm test`, the font check
   (`python3 tools/subset-fonts.py --check`, regenerate if stale) and the smoke letters you touch stay green.

## Per lane

- **S (shop):** a shelf wall with two planks, two items each, lit from above; the keeper behind a counter strip at the
  bottom of the band; try-on in a standing mirror frame with my character at 4x; the confirm is a paper receipt with the
  price tag and two buttons. General store: jars and seed packets on the planks.
- **C (cafe):** the menu is a chalkboard with a chalk frame and the three items served on plates on the counter; the three
  progress dots become a small stamp card (three stamp circles and a recipe card at the end; no words). The record shelf is
  a wooden rack with the sleeves leaning, a larger turntable with a moving arm and the speaker button beside it.
- **N (talk, board, story):** the dialogue box gets a framed portrait (56 px), the name tag as a tab standing on the box
  edge (label '대본' stays), 20 px text and a blinking marker; the board is a cork board with pinned paper notes (pins, a
  1 px tilt, a torn edge), each note with its picture; the three first lines sit on a full-screen pixel vignette (city
  office, the road to the sea, the attic window), one picture per line.
- **F (contest):** already redrawn after the owner's note: check it against rules 1–5 (wider stage, judges at 32 px with
  their placards, result ribbon) and stop there.
- **P (look sheet):** my character at 4x on a pedestal or in a mirror frame, taking the upper half (today the upper half
  is flat grey); part tabs as picture buttons in a row; tiles at 64 px with a clear chosen state; locked tiles show the
  shop's sign so the player knows where to get them.
- **U (base):** the frame of `.sheet` itself (rule 3) for every sheet, old ones included; settings sections as cards.

## How

Two hours at most. Before and after at 360x740 and 412x915 in `wip/round7/shots/<lane>/ui2-before-*.png` and
`ui2-after-*.png`. Look at your own pictures with the Read tool and compare them with the rules before you push. Push, then
send the lead the sha and the two pictures' paths.
