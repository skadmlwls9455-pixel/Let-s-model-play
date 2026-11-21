# 09. Making our code-drawn pixel food look like food: technique, pipeline, and a proof sprite

Research agent report, round 7, 2026-11-21. Topic: why our dishes look flat, what pixel artists do about it, the simplest
authoring pipeline inside our rules, and one sample sprite made with that pipeline.

Proof picture (look at it first): `/home/user/Let-s-model-play/wip/round7/research/foodart/out/omelette-final-6x.png`
Before / after and all sizes on one sheet: `/home/user/Let-s-model-play/wip/round7/research/foodart/out/omelette-sheet.png`

---

## 0. What changes the build (read this part if nothing else)

1. **The flatness is structural, not a palette problem.** Two of the three dishes are an ellipse whose side face is
   2 px tall on a body 49 to 59 px wide (3 to 4 %), the third is three flat rectangles in front view, all on the same
   round plate, all textured by hash noise. The FOOD palette is already a good hue-shifted ramp (cream H 49 to
   red-brown H 8). Tuning the painters will not fix it. Replace the dish pictures with hand-authored sprites.
2. **Author sprites as rows of characters, one character per colour role.** This format is already in the repository
   three times (`tools/make-dish-icons.js` GRIDS, `HAND` and `CHILI` in `js/cook-art.js`, `TANG` in `js/cook-dishes.js`),
   so it is a known quantity. A decoder with the three helper passes is about 120 lines (`foodart/pixmap.js`).
3. **Build a dish from parts and placements, not one big picture.** My plate of rolled omelette is five small parts
   (plate, slice, lying slice, ketchup, leaf); the slice is stamped three times. Contact shadows are computed from the
   colour ramps, so an agent never draws a shadow by hand.
4. **Doneness is a palette re-map, shape change is a new frame.** Re-mapping three skin characters gives pale / golden /
   browned from the same pixels (on the sheet, row 3). This matches the existing `look.band` 0..2.
5. **Five rules did almost all the work in my four passes:** two planes per piece with a different base tone each; a
   warm brown outline that is lighter on the lamp side; one nameable inside (the rolled seam); cool shadows on the
   plate; pieces that overlap and stand at different heights.
6. **The agent must look at its own picture.** Three of my four corrections came from reading the PNG, not from the
   rules (v1 read as fried tofu, v2 as bread rolls, the first table sprite as a face with two eyes). A node contact
   sheet plus the Read tool is the review loop; budget four passes per hero sprite.
7. **A cheap lint finds real faults**: single-pixel noise and touching colours too close to tell apart
   (`foodart/lint.js`). On my final sprite it reports 73 orphan pixels and 8 close pairs, including the carrot fleck
   that I also could not see by eye.
8. **Sizes to author per dish: one hero, one 16 x 16 icon, one small table sprite.** The hero (my sample is 48 x 40;
   the contract written meanwhile says 80 x 56, see 0b) serves both the kitchen plate and the recipe book. Never scale
   a sprite down; draw the small ones.
9. **On the play-room table the plate is about 9 room pixels wide on a phone** (0.34 m at 27 room pixels per metre;
   18 px at zoom 2). No art can be appetising there. The appetising picture has to live where it is big: the kitchen
   plating, the recipe book, and (suggestion) a small picture card when the dish is served.
10. **Choose dishes by form.** Give each dish a different silhouette class and container (section 2.9). Two discs and
    a row of squares is what the owner called "the same form".

---

## 0b. Fit with the contract written while I worked (`briefs/SPRITES.md`, C1 in `briefs/COMMON.md`, `briefs/A.md`)

The lane briefs appeared after I had started, and `A.md` tells the art lane to start from this report and from
`foodart/`. So, for lane A and the lead, the places where my findings touch that contract:

1. **Palette wording.** `SPRITES.md` says "the Apollo colours already used by `js/cook-art.js`". The kitchen's guard
   (`put()`) accepts Apollo 46 **plus the 24 named FOOD colours** (`COOK_ART.F`), and food needs them: the sample uses
   FOOD for every food fill (J2 to J6, G0, B2, P0 to P3, C0 to C2; only the brown outline is Apollo). Apollo alone has
   only a3 / a2 / a1 for yellow
   (S 52 to 77 against 64 to 87). Read the contract as "Apollo + FOOD, by name", and let the node test check the 70.
2. **`COOK_SPR` must carry its own colour table.** Lane T loads `js/cook-sprites.js` in `index.html`, where
   `js/cook-art.js` is not loaded (checked: `index.html` has no such script tag today). So the file cannot read `COOK_ART.PAL` at run time as my `render.js` does. Copy the
   name to hex table into the file and let the node test compare it with `COOK_ART.PAL` and `COOK_ART.F`.
3. **`get(id, frame)` on top of my format.** One id = `{ w, h, ax, ay, frames: [ { list, state } ] }`: a frame is a
   placement list plus an optional state (palette re-map). `dish.jeon` frames 0 / 1 / 2 (pale, golden, crisp) are then
   one placement list with three states: no extra pixels. Decode on first `get`, keep the buffer.
4. **Parts and states are needed to meet the 250 KB limit, not just nice to have.** The work list is 29 state ids with
   88 frames plus 5 dishes, 5 icons and 34 small pictures: 348,064 pixels (computed from the sizes in `SPRITES.md`).
   Typed as one full canvas per frame that is about 380 KB of source. `gyeran.pan` alone is 84 x 60 x 7 = 35 KB, `oven`
   46 KB. With an empty pan as one part and the egg as small parts on top, the seven frames share almost everything.
   The empty base `js/cook-sprites.js` that exists now describes its table as "frames: [rows of palette characters]",
   one full canvas per frame; the inside of the table can change to parts, placement lists and states without touching
   the public contract (`get`, `ids`, `info`).
5. **Do not type the big simple shapes.** A 100 x 76 empty pan or an 88 x 68 bowl is mostly one repeated row. Generate
   those rows (`foodart/gen-rows.js` prints ellipses, rims and rounded rectangles as rows to paste; I made the sample
   plate that way), then hand-draw only what makes it food. Typing them is also where agents make column mistakes.
6. **Dish canvas 80 x 56, anchor (40, 44).** My sample is 48 x 40. Do not enlarge the sample's pixels: redraw with the
   same construction at 1.5 times the size (a slice about 21 x 24, cut face 19 x 13). That gives room for what my
   sample lacks: a second turn of the seam, 2-px flecks that stay visible, a broken skin ring. The kitchen view is 80
   art px across, so keep the food and container within 72 to 76 px.
7. **The table picture is the open risk.** `T.md` puts `COOK_SPR.get('dish.' + id)` on the play-room table "at a whole
   number of device pixels per art pixel". On a phone a room pixel is 2 CSS px (`DEF_P = 2` in `js/scene3d.js`) and
   the room has 27 pixels per metre at zoom 1, 54 at zoom 2 (`applyZoom()`), so today's plate (0.34 m) is 9 room
   pixels = 18 CSS px wide at zoom 1. An 80 x 56 picture at 1 device px per art px is 40 x 28 CSS px at dpr 2: more
   than twice the plate it stands for, with pixels 4 times finer than everything around it. At the room's own pixel
   size it would be 160 CSS px wide. Neither breaks the contract; both will look pasted on. Options: (a) lane A adds a
   `table.<id>` sprite of about 12 x 9 to 16 x 12 drawn for the room's pixel size, shown at 1 room pixel per texel
   (2 at zoom 2). My 12 x 9 sample reads as "yellow pieces and a red dab on a plate", not as a named dish; (b) keep
   today's geometry on the table and show the dish picture as a paper card above it while the player sits; (c) accept
   the pasted look. This needs the lead's decision; I could not test any of the three in the room.
8. **Lane A's test list.** "Every frame has an outline that is not pure black" fits. Add the two lint numbers (orphan
   pixels, touching pairs under 20 luma) to the report as numbers, not as failing checks: some orphans are wanted
   (glints, flecks).
9. **Pass budget.** `A.md` allows two improvement passes per dish and one per state sprite. My sample needed three
   before it stopped reading as another food. If the budget stays at two, spend the first look on one question only:
   "which food is this?".

---

## 1. Why ours looks flat (from the code and the screenshots)

Files read: `js/cook-art.js` (jeon, plate, dish, dishSmall, palette, GEO), `js/cook-dishes.js` (rice cake, skewer),
`tools/make-dish-icons.js`, `js/scene3d.js` (`dishParts`, `setTableDish`). Pictures read:
`docs/shots/cook/09-result-360x740.png`, `wip/round6/shots/K2/*.png`, `wip/round6/shots/D/2-dishes-2x.png`,
`D/1-layout-360.png`, `D/4-bite-oct-2x.png`.

| Cause | Evidence | Effect |
| --- | --- | --- |
| **No height.** | Jeon: `GEO.rev2` jrx 29, jry 19, `thick: 2`. The side face is 2 rows on a body 59 px wide and 39 px tall. Rice cake plated: `th: 2` (`plated()` in cook-dishes). | Top face is 95 % of the picture. It is a disc, whatever is painted on it. |
| **The view angle is fine, and that is the trap.** | Plate pry / prx = 26 / 39 = 0.67, jeon 19 / 29 = 0.66, pan 38 / 60 = 0.63. An ellipse ratio of 0.66 is a camera about 41 degrees above the table: a normal three-quarter view. | The camera is not too high. The food has nothing standing up for that camera to show. |
| **One container.** | Every dish calls `plate(b, color, ...)`: one ellipse, rim 5, thickness 3. Only the colour changes (ivory, sky, rose). | Same outer silhouette for all three. |
| **One body shape.** | Jeon = ellipse 29 x 19. Rice cake = ellipse 24 x 17. Skewer = three 16 x 18 rectangles in pure front view (`barPiece`: no top face, no side face). | Two discs and a row of squares. |
| **Texture is noise, not things.** | Jeon face: browning by hash quantiles, strands by a hashed walk, freckles, lace. Rice crust: `ih(dx, dy, seed) % 23` picks 1 pixel in 23 for a shade. Rice grains: s5 on s6 (luma 205 on 236). Watermelon seeds: `h % 29`. | Nothing a player can name. The biggest named thing on the jeon is a 4 x 3 chili ring. |
| **Fills are one tone plus speckle.** | Plated rice cake top is `K[0]` (J4) everywhere except the 1 in 23 speckles and a 1 px lit rim. Watermelon flesh is C1 with a 3-row C2 band. | No plane changes, so no volume. |
| **Outline is weak or cold.** | Rice in the pan: outline `C.s3` (grey, luma 146) around s6 rice (236). The plated rice cake does get a J1 outline, but around a single-tone disc. The jeon has its J1 / J0 outline only in the plated picture (`ol`). | Pale food has no edge; outlined food is still a flat shape. |
| **Icons repeat the problem at 16 px.** | `tools/make-dish-icons.js`: jeon = 12 px circle with a cross gap, jumeokbap = 12 px circle with a dark band, kkochi = a row of squares. | Two of three chips are the same circle. |
| **3D table: flat-colour geometry.** | `dishParts()`: a cylinder plate r 0.17 m, jeon = four boxes 0.10 x 0.025 x 0.07 m in one amber vertex colour. Room pixels per metre = 18 x 3 / p x zoom (`PX_PER_M`, `DEF_P = 2`, `applyZoom()`, zoom 1 to 2): 27 on a phone at zoom 1, so the 0.34 m plate is 9 room px wide, 18 at zoom 2. (Computed from the code; I did not measure the screenshot.) | A few pixels of one colour. Fine for a room prop, useless as "food". |

What is already good and should be kept: the hue-shifted FOOD ramp, the lamp from the upper left, 1 px lines without
blur, the one-step-darker shadow rule (`DARK` and `shadeAt`), steam and twinkle passes, the 70-colour guard in `put()`.

The measured FOOD jeon ramp (computed from `js/cook-art.js`): J6 H 49 S 26, J5 H 46 S 64, J4 H 39 S 84, J3 H 30 S 87,
J2 H 19 S 87, J1 H 11 S 85, J0 H 8 S 85. Hue turns 41 degrees toward red as it darkens, saturation peaks in the
mid-darks, the light end fades toward cream. That is exactly the ramp shape the tutorials ask for (section 2.2).

---

## 2. Technique: a checklist an artist-agent can follow

Each rule names the source I read it in. The examples are mine. Letters are palette roles: `W` glint, `c` light,
`y` base, `g` shade, `o` deep, `k` outline, `K` grounded outline, `.` empty.

### 2.1 Start from form, not from outline

- [ ] **Block the big shapes in flat colour first, add the outline last.** At 32 px and below, colour does more of the
  work than line; an outline can cost the room you need for shading (Derek Yu, basics, "The 32 x 32 sprite";
  Slynyrd 21 calls it blocking; Lospec outlines part 1, "When to outline").
- [ ] **Reduce the food to two or three solids** (box, cylinder, mound) and shade those. Details go on afterwards and
  must not break the big light and dark clusters. Squint test: a few large clusters must survive (Derek Yu, "Form and
  volume"; common mistakes, "Creating forms with volume").
- [ ] **Nothing essential 1 px thick.** Thin parts cannot be shaded, so they read flat ("chunky pixels rule", Derek Yu,
  common mistakes). For us: a skewer stick is 2 px, a nori sheet 3 px, a noodle 2 px.
- [ ] **One projection for every food sprite.** Slynyrd 3: three-quarter top-down is "as if" seen from 45 degrees
  above, you see about three quarters of both the top and the front; uniformity matters more than realism, and
  viewpoints must not be mixed in one scene. Rule for us: **round rims are ellipses with height = 0.55 x width
  (0.5 to 0.6 allowed), vertical faces are drawn at full height.** I judge that close enough to the pan (0.63) to
  share a scene; nobody has tested it (open question 2).
- [ ] **Give the food height.** At least one element must stand a third of the sprite's height above the container
  rim: a pile, a standing slice, a nori sheet, a strawberry. This is the single biggest difference between our dishes
  and the references.

```
 a piece of food as a box, lamp upper left: TOP plane and FRONT plane get different base tones
   . k k k k k k .
   k c c W c y y k      top:   light tone, one streak, one glint
   k y y y y y g k
   k g g g g g g k      the edge between the planes: one row of the darker tone
   k y y y y y o k      front: base tone, darker toward the lower right
   k y y y y o o K
   . K K K K K K .      the outline gets darker where the piece meets the ground
```

### 2.2 Colour: ramps with a hue shift, few tones

- [ ] **3 to 5 tones per material, each clearly different.** "Too many similar colours" is the first fault Derek Yu
  removes; every colour needs its own job. Lospec part 2: at 1x you must be able to tell apart any two colours that
  touch. My lint flags pairs under 20 luma apart.
- [ ] **A ramp changes hue as well as brightness.** Highlights lean toward yellow, shadows toward a second colour
  (Pixel Joint tutorial, "Hue shifting"; Slynyrd 1: a straight ramp "will lack interest"; he uses up to 20 degrees per
  step and warms as it brightens). The Clip Studio food article suggests cool shadows for warm food, as a habit and
  not a rule (read through a summarising fetch, not as raw text). I used that only for the cast shadow on the white
  plate (cyan), and kept the food's own shade tones warm, toward red-brown, as the owner's references do (brief 1b).
- [ ] **Saturation peaks in the middle of the ramp and drops at the light end**; high saturation together with high
  brightness burns (Slynyrd 1; Pixel Joint, "Saturation"). Food wants more saturation than props: "more saturated
  colors make the food look vibrant" (Clip Studio 9875, same caveat).
- [ ] **Never shade food with grey or black.** Use the ramp's own dark end. (My rule, following from the hue-shift
  sources. A search snippet from a page I did not open said the same: unverified as a citation.)
- [ ] **Reuse colours across the dish** (the seam colour is the skin colour, the outline of the ketchup is the dark
  red of the ramp). Slynyrd 30 reused the same colours across all his food sprites for one look.

Ramps that already exist in our palette (names from `js/cook-art.js`):

| Material | light to dark | Note |
| --- | --- | --- |
| Egg, batter, bread, fried skin | G0, J6, J5, (B2), J4, J3, J2 | B2 sits only 10 luma from J4: use one or the other, not both side by side |
| Outline for warm food | a1 (lamp side), r1 (main), r0 (grounded) | Apollo browns. J1 as outline made v1 look red |
| Greens (scallion, leaf, herb) | P3, P2, P1, P0 | |
| Reds (chili, ketchup, berry, watermelon) | C2, C1, C0 | C2 next to J3 is invisible (3 luma apart) |
| Seaweed | T1, T0 | |
| Dark sauce, soy, broth | S2, J1, J0, S0 | |
| White ceramic | s6, s5, s4 with cast shadow b4, b3 | cool shadows make warm food pop |
| Rice, egg white, tofu, cream | G0, s6, then ? | **gap**: s5 and s4 are cool grey-green (H 158 to 166). Try w6 as the first shade. Untested. |

### 2.3 Light and shading

- [ ] **One lamp, upper left** (ours already). Decide it before the first pixel (OpenGameArt chapter 4).
- [ ] **Shade by plane, not by distance from the edge.** Darker bands that follow the outline inward are pillow
  shading: it ignores the lamp and flattens the form (Pixel Joint, "Pillow shading"; Derek Yu, common mistakes;
  OpenGameArt chapter 4).
- [ ] **A flat plane has one tone.** Do not run a gradient across a flat face "because the lamp is on the left"; a far
  lamp lights a flat surface evenly (OpenGameArt chapter 4, mistake b). Change tone where the plane turns.
- [ ] **Depth comes from contrast where planes meet** (Slynyrd 3, "Lighting"). Put the lightest tone of the top next to
  the darker tone of the front.
- [ ] **Cast shadows: short and subtle** (Slynyrd 21), **one step darker on whatever they fall on** (our engine's
  existing rule). In the sample: 2 px down and right. They are what makes pieces sit on the plate instead of floating.
- [ ] **Check without colour and mirrored**: desaturate and flip to find shading that does not read (Derek Yu, "Final
  touches").

```
 pillow shading (wrong)          plane shading (right, lamp upper left)
   . o o o o .                     . g g g o .
   o g g g g o                     g c c g g o
   o g c c g o                     g c g g o o
   o g c c g o                     g g g o o o
   o g g g g o                     g g o o o K
   . o o o o .                     . o o K K .
```

### 2.4 Outline

- [ ] **Outline in a darker shade of the object, not black** (Lospec part 2). Black gives a flatter, more symbolic
  look (Pixel Parmesan).
- [ ] **The outline must be darker than both the object and the background** or it lowers contrast instead of raising
  it (Lospec part 2). Our grounds: wood w4 (luma 155), paper w6 (214), night s0 (44). r1 (86) passes on wood and
  paper; on a night ground the white plate carries the sprite (checked on the sheet, row 2).
- [ ] **Selective outline: lighter where the lamp hits, darker in shadow and at the ground.** The practical recipe:
  take the pixel next to the border and go one shade darker for the outline (itch.io tutorial by imonk). Derek Yu: at
  the top the lightest outline colours, or none where the sprite meets empty space.
- [ ] **Sel-out is not "make the corners dark"** and broken outlines can make jaggies; use it to show form (Pixel
  Parmesan; Pixel Joint lists sel-out under things to avoid unless the background is known).
- [ ] **Inner lines one shade darker than their own area**; between two parts use the colour of the part nearer the
  viewer, or of the darker one; a broken inner line reads as a thinner line (Lospec part 2; Pixel Parmesan).
- [ ] **No outline where the food rests on something** (Lospec part 1: an outlined base looks like it floats). Let the
  contact shadow do that job.
- [ ] **1 px wide, segments joined only at corners, segment lengths on a curve change in one direction**: 5, 2, 2, 1, 1
  is a curve, 5, 2, 1, 2, 1 is a lump (Lospec part 1).
- [ ] **Avoid a second line hugging the outline** (banding, section 2.6). My slice still does this on its left side.

### 2.5 Highlights and gloss

- [ ] **Material is told by how it takes light**: glossy things get a hard, very bright highlight that goes quickly
  to white; rough things get few tones and no highlight (OpenGameArt chapter 7, its glass and watermelon against its
  clay; Clip Studio 9875: glossy = bright sharp highlights, matte = soft transitions). Keeping the glint small is my
  addition for our sizes.
- [ ] **One hard glint per glossy element**, 1 to 3 pixels of G0, on the lamp side, about a quarter of the way in,
  never touching the outline and never in the centre. A single isolated pixel is allowed here: specular highlights are
  one of the two justified uses of a lone pixel (Pixel Joint, "Noise").
- [ ] **A second, smaller glint 2 or 3 px along the same diagonal sells "wet"** (sauce, yolk, glaze, fruit).
- [ ] Highlights are the last step, after the shading reads (Derek Yu, "Final touches").

```
 glint shapes                           where it goes
   W      W W      . W                    k k k k k k
          W .      W W W                  k c W W c y     upper left third, 1 px in from the outline
                   . W                    k y c y y g
```

### 2.6 Clusters, noise, banding, anti-aliasing

- [ ] **Think in clusters.** A lone pixel of a colour is noise unless it is a glint or a tiny essential detail (Pixel
  Joint, "Pixel clusters" and "Noise"). Flecks are 2 px: a light pixel and its darker partner.
- [ ] **No banding**: do not let two colour edges run parallel with the same step lengths; do not let a row of shade
  hug the outline (Pixel Joint lists hugging, fat pixels, skip-one and 45-degree banding; Pixel Parmesan: banding
  reinforces the grid and leads to pillow shading).
- [ ] **Anti-alias only inside the sprite**, never on the outer edge, because the background changes (Derek Yu; Pixel
  Parmesan). Our alpha is 0 or 255, so outer anti-aliasing is impossible anyway.
- [ ] **At our sizes, anti-alias very little.** "If a sprite is too small, AA might read as noise" (Pixel Parmesan). One
  in-between pixel where a curve steps is enough. The longer the run, the longer the in-between run.
- [ ] **No dithering inside a food sprite.** It needs space and is unnecessary for sprites (OpenGameArt chapter 7);
  use it sparingly (Derek Yu). Our 50 % checker stays for ground shadows and ghost hands only.

```
 noise (wrong): single specks                    clusters (right): 2-px flecks, fewer of them
   y y p y y y a y                                 y y y y y y y y
   y a y y p y y y                                 y p q y y y a o
   y y y a y y p y                                 y y y y y y y y
```

### 2.7 Marks that say "this is food"

Draw the thing a person would name. Slynyrd 30: he chose foods that are "easily recognizable", used photo references,
kept outlines so the sprites do not look like shrunken photos, and built the ramen by filling the bowl ingredient by
ingredient.

**Caveat:** no page I could open describes grill marks, crumbs or glaze in words (the food tutorials teach them in
pictures I could not see). The recipes in this table are mine, built from the rules above and from the description of
the owner's references in the brief. Only the cut face, the browning patch, the flecks and the glint are tested (in my
sample); the rest is untested.

| Mark | How, at 32 to 64 px |
| --- | --- |
| **Cut face** | A cut or bitten piece shows the inside in a lighter, paler tone than the skin, with a 1 px skin ring. Layers are 2 px bands with 1 px seams. Best single trick: it turns a blob into a named food. |
| **Browning** | A patch of 3 to 5 px of the deep tone with one darker core pixel, on the top plane, away from the glint. Two patches, not ten. |
| **Grill marks** | 2 or 3 parallel strokes on a 1:1 or 2:1 diagonal in the deep tone, a lighter pixel on the lamp side of each, stopping 1 px short of the edge. |
| **Glaze and sauce** | A pool with a dark far edge and a light near rim, one drip over the side ending in a round 2 x 2, one glint. |
| **Crumbs, sesame** | 2-px clusters (light + its shadow), 3 to 5 pieces, some fallen on the plate. |
| **Scallion** | 3 x 3 ring (P2 with a P1 or dark centre) or a 2 x 1 sliver P2 P1. |
| **Egg half** | White ellipse, yolk off-centre in J4 with a J3 crescent below and one glint. |
| **Steam, sparkle** | Not in the sprite. Use the existing `steamPass` and `twinkle` with the sprite's alpha as the mask. |

```
 grill marks                    browning patch            sauce drip
   y y y y y y y y                g g g g g g               k k k k k k
   y c o y y c o y                g g o o g g               k R R W R k
   y y c o y y c o                g o r o g g               k D R R R k k
   y y y c o y y c                g g o g g g               . k k k D R k
   y y y y y y y y                                              . k D k
```

### 2.8 Containers in three-quarter view

(My own constructions from the projection rule in 2.1. Only the rectangular plate is tested.)

| Container | Construction (art px for a 48 px wide sprite) |
| --- | --- |
| Round plate | Ellipse 44 x 24, lip 2 px, one shade line inside the far rim, side 2 rows under the near rim. |
| Deep bowl | Rim ellipse 30 x 16. Far inner wall visible as a 2 to 3 px crescent in shade. Body 10 to 14 rows below the rim, narrowing to a foot 60 % of the rim width. Food mounds 3 to 5 px above the rim line. |
| Wide bowl | Rim ellipse 40 x 20, body 6 to 8 rows, food nearly level with the rim plus toppings above it. |
| Rectangular plate | Rounded rectangle 48 x 22, corners cut 3 px, front face 2 rows, optional 1 px colour line inside the rim (my sample). |
| Board | Rectangle with a handle breaking the silhouette, wood ramp w6 to w3, front face 3 rows. |
| Paper sheet | A rhombus or a rectangle with one folded corner, no thickness, 1 px shade under the food. |
| Skewer | On a 2:1 diagonal, pieces overlapping each other, the stick 2 px with a lit upper edge. |

```
 deep bowl, 3/4 view (J outline, w lit ceramic, l shade, m darker, F food)
       . . . . J J J J J J J J J . . . .
       . . J J l l l l l l l l l J J . .         far inner wall, in shade
       . J l l F F F F F F F F F l l J .         the food mounds above the rim line
       J w F F F F F F F F F F F F F w J
       J w w F F F F F F F F F F F w w J         near rim: the lightest ceramic tone
       J w w w w w w w w w w w w w w l J
       . J w w w w w w w w w w w w l J .         body: light upper left, darker lower right
       . . J w w w w w w w w w l l J . .
       . . . J J l l l l l l m J J . . .
       . . . . . J J J J J J J . . . . .         foot, about 60 % of the rim width
```

### 2.9 A different silhouette per dish

Before drawing, fill this in for every dish, and make no two rows alike in the first two columns:

| Silhouette class | Container | Breaks the outline | Nameable inside |
| --- | --- | --- | --- |
| low row of blocks | rectangular plate | lettuce leaf, a slice lying down | rolled seam (egg roll) |
| tall mound | deep bowl | halved egg, standing nori sheet | noodles, scallion rings |
| wide dome | wide bowl | yolk on top, sesame | wedges of different toppings |
| long log, cut | board | end piece tipped over | spiral or filling section |
| stack | paper sheet or small plate | syrup drip, butter pat | layers seen from the side |
| diagonal line | none, or a paper cone | the stick itself | glossy fruit, one bitten |

(Constraint from the brief: nothing in any dish may show or contain octopus, squid or other cephalopods; prefer no
visible animal at all. Which dishes to pick is another agent's topic; this table is only the art test.)

The five dishes now listed in `briefs/SPRITES.md` pass it on paper: a stack of cut pieces on a round wicker tray, a row
of blocks on a rectangular plate, two leaning triangles on a leaf plate, two crossed diagonals on a small round plate,
a tall wedge on a square plate. Where each can still go wrong, judging from my own misreadings:

- **Stacked jeon**: flat golden pieces in a pile read as pancakes or toast. The cut edges (a paler inside with green
  strands) and the lacy dark rim are what say "jeon"; draw the pieces as wedges, not discs.
- **Rolled omelette**: without a pale face against a golden skin it reads as bread (my v2).
- **Triangle rice ball**: rice needs the warm white the palette lacks (2.2); with s5 / s4 shading it will look grey.
  The seaweed strip and the triangle carry it; keep grain marks to a few 2-px strokes.
- **Fruit skewer**: glaze = one hard glint per fruit plus a second small one; without them it is three coloured balls.
- **Cake slice**: the side must show the layers (sponge, cream, sponge) as bands of different tone; a wedge seen from
  the front corner shows two side planes, so give them two tones.

### 2.10 The review loop

1. Render at 6x and Read the PNG. Ask: "what food is this?" If the honest answer is another food, the planes or the
   material contrast are wrong (my v1 and v2).
2. Render at 1x, 2x, 3x on wood, paper and a dark ground. The silhouette must still read at 1x.
3. Run the lint: orphans, close pairs, colour count.
4. Fix the biggest fault only, render again. Stop after four passes: Derek Yu warns that pixel art invites endless
   tweaking, and one sprite is one small piece of the game.

---

## 3. The pipeline

All sample code: `/home/user/Let-s-model-play/wip/round7/research/foodart/`

| File | What it is |
| --- | --- |
| `pixmap.js` | The decoder and passes. Plain script, no DOM, no dependencies, integers only, ASCII only. Global `PIXMAP` in the browser, `module.exports` in node. About 120 lines. |
| `omelette.js` | The sample sprite (data only). 6.5 KB as text, 2.1 KB gzipped, for five hero parts plus icon and table parts. |
| `render.js` | Node script: reads the palette from `js/cook-art.js`, builds frames, writes PNG files with a hand-written PNG encoder (CRC table + `zlib.deflateSync`, the same method as `tools/make-dish-icons.js`). |
| `lint.js` | Node script: colour count, orphan pixels, touching pairs under 20 luma. |
| `gen-rows.js` | Node script: prints rows for ellipses, rims and rounded rectangles (plates, bowls, pans) to paste into a part. |
| `history/omelette-v1.js` to `v3.js` | The earlier passes, so the before / after sheet can be rebuilt. |
| `out/*.png` | The pictures. |

Run: `node wip/round7/research/foodart/render.js` then `node wip/round7/research/foodart/lint.js`.

### 3.1 The data format (exact)

```js
var SPRITE = {
  name: 'gyeran-mari',
  light: [1, 1, 2],                 // contact shadow: dx, dy, steps walked
  pal:   { W: 'G0', c: 'J6', ... }, // character -> palette NAME (COOK_ART.PAL for Apollo roles, COOK_ART.F for FOOD)
  ramps: ['WcybgorkK', 'whi'],      // characters from light to dark; a shadow moves a pixel one step to the right
  states: { pale: { g: 'J5', o: 'J4', r: 'J3' }, golden: {}, browned: { g: 'J3', o: 'J2', r: 'J1' } },
  parts: { slice: [ '...ttttttttt...', '.ttggyyygggokk.', ... ] },   // rows of equal length, '.' = empty
  outlined: { leaf: ['q', 'Q'] },   // parts drawn without an outline: [lamp-side ring, shadow-side ring]
  frames: { served: { w: 48, h: 40, list: [ ['plate', 0, 14], ['slice', 22, 4, 's'], ... ] } }
  //                                          part, x, y, flags ('s' = cast a contact shadow first), back to front
};
```

Rules of the format:

- **One character per colour role, not per colour.** Skin base `g` and seam `u` are both J4 today, but only the skin
  changes when the dish browns. I learned this the hard way: v1 to v3 shared the characters and could not be re-mapped
  cleanly.
- **Palette by name, never by hex in a sprite.** One name to hex table per file (0b.2), checked against the kitchen's
  Apollo 46 + FOOD 24, which `COOK_ART.put()` enforces today. Props (plate, board, stick) use Apollo roles only, food
  may use both, as today.
- **A ragged row or an unknown character throws** at decode time, with the part name, row and column. A typo fails
  the build instead of painting a hole.
- **Rows stay ASCII** (the art files are tested for it in `tools/test-cook-dishes.js`).
- **Parts are small.** Largest hand-written part in the sample is 15 x 17. The 48 x 25 plate is mostly one repeated
  row. An agent edits a 15-character row far more reliably than a 48-character one.
- **Authoring order inside a part**: silhouette as outline characters, then the plane base tones, then the plane edge
  row, then light and shade clusters, then the nameable inside, then flecks, then glints.

### 3.2 The decoder and the passes (`pixmap.js`)

| Function | Does |
| --- | --- |
| `decode(rows, pal, name)` | rows to a buffer `{ w, h, d: Uint8ClampedArray }`: the same shape as `COOK_ART` buffers, so `COOK_ART.blit`, `hash`, `imageData`, `toCanvas` work on it unchanged |
| `frame(S, name, pal)` | builds a frame: decodes each part once, runs the outline pass where asked, casts shadows, stamps back to front |
| `castShadow(dst, part, x, y, dark, dx, dy, n, shaded)` | contact shadow: pixels already painted under the part's silhouette moved by (dx, dy) go one ramp step darker. The `shaded` flags stop two parts darkening the same surface twice (found on the icon: the plate under two slices went two steps darker) |
| `outline(buf, pick)` | selective outline for a part drawn without one: ring pixels above or left of the part get the lamp-side colour, the others the shadow-side colour |
| `groundShadow(buf, dx, dy, hex, checker)` | flat or checker shadow for previews; in the game use `shadeAt` on the real ground as today |
| `darkMap(pal, ramps)` | hex to "one step darker", built from the ramps (the generalised `DARK` table of `js/cook-art.js`) |
| `scale(buf, k)` | whole-number upscale for previews |

For `ImageData` in the browser: `ctx.putImageData(COOK_ART.imageData(buf), 0, 0)` on a canvas of the sprite's own size,
then show that canvas scaled by CSS (next section). Decode once and keep the buffer (`remember()` / `lruGet()` already
exist in the art files).

Where it lives is now fixed by contract C1: `js/cook-sprites.js`, one global `COOK_SPR` (`get`, `ids`, `info`); see
0b for how my format sits under it. Two notes for the lanes that use it: `COOK.drawDish(recipe, look, seed, w, h)` in
`js/cook.js` is the door the notebook's dish pictures go through today, and it still has to draw the old `jeon`,
`jumeokbap` and `kkochi` looks (`briefs/K.md`); and the kitchen tests list the files they scan by name (the `files`
array in `tools/test-cook.js`).

Per-player variation without procedural painting (the saved `look`): `band` 0..2 picks a state, `plate` 0..2 re-maps
the plate characters (ivory, sky, rose: the existing `PLATE` table), cuts pick a frame, and a garnish can be stamped
at one of a few fixed anchor points chosen by the seed.

### 3.3 Frames and cooking states

| Change | Mechanism | Cost |
| --- | --- | --- |
| Doneness (raw, set, golden, browned) | `states`: re-map the skin characters | one line per state |
| Shape (sheet, half rolled, log, sliced, plated) | a frame = another list of placements, mostly reusing parts | one part per new shape |
| Progress between two frames | per-pixel choice with the 4 x 4 ordered matrix that `js/cook-art.js` already has (`bay(x, y) < t` shows frame B): 16 steps, integers, palette-safe | no authoring. **Not built or tested in this sample.** |
| Bites on the table | 5 frames: 4 pieces, 3, 2, 1, empty plate with crumbs | 5 placement lists |
| Squash on landing | drop one row of the part and stamp it 1 px lower | a 5-line helper. Not built. |

For the rolled omelette the kitchen would need about eight parts: beaten egg in a bowl, a thin sheet in the pan (wet
streak, then matte), the roll at three lengths, the log on the board, the slice, the lying slice.

### 3.4 Sizes to author

| Name | Canvas (art px) | Where | Shown at |
| --- | --- | --- | --- |
| **HERO** | 80 x 56 by the contract (my sample: 48 x 40) | kitchen plating and reveal; the recipe book page | kitchen: `k` device px per art px, `k = floor(vw x dpr / 80)` capped by the free height and by `floor(6 x dpr)` (`fit()` in `js/cook.js`): 8 on 320 x 568 @2, 9 on 360 x 740 @2, 13 on 412 x 915 @2.625 (computed from the formula with no safe-area padding, not measured). An 80 px canvas is then 320, 360 or 396 CSS px wide: the whole width of the two smaller phones. Book (not built yet, my proposal): `floor(2 x dpr)` device px per art px (160 CSS px wide at dpr 2). |
| **ICON** | 16 x 16 | recipe tabs, tray chips, stickers | `floor(3 x dpr)` device px per art px, as `tools/make-dish-icons.js` notes for the current chips |
| **TABLE** | 12 x 9 (sample) to 16 x 12 | play-room table (today's plate is 9 room px wide at zoom 1 on a phone) | 1 texel = 1 room pixel at zoom 1, 2 at zoom 2; the stops between are the table lane's problem (untested) |
| existing `GEO.small` | 40 x 26 | counter plate, notebook | use the ICON on a plate strip, or the HERO if it fits; do not shrink |

The view of the kitchen close-up is 80 art px across (`LAY.VIEW_W`), and the current plate fills all of it (79 px).
A hero up to 72 px wide leaves a 4 px margin each side.

### 3.5 Keeping whole device pixels

The kitchen already does this correctly; new surfaces (the recipe book) must copy it.

1. The canvas has the sprite's own size in art px (`canvas.width = 48`). Never draw a sprite scaled or rotated with
   `drawImage` into a bigger canvas with smoothing; never use a fractional scale.
2. `n = max(1, floor(s x dpr + 1e-6))` device px per art px, where `s` is the wanted CSS px per art px (2 or 3).
3. CSS size = `artPx x n / dpr` px. It may be fractional in CSS px (91.4 px on dpr 2.625); that is fine because it is
   whole in device px.
4. Every offset is rounded to device px: `dev(v) = Math.round(v x dpr) / dpr` (`sizeIcons()` in `js/cook.js`).
5. CSS: `image-rendering: pixelated; image-rendering: crisp-edges;` (as `.ck-cv` in `css/cook.css`).
6. A canvas sized by layout to a non-whole CSS px gets one device row doubled; the kitchen grows its canvas by up to
   4 art px until the size is whole (the comment inside `fit()`). A fixed-size picture avoids the problem.

### 3.6 The 3D table

Facts: the dish is geometry today (`dishParts()`), 9 room pixels wide on a phone at zoom 1 and 18 at zoom 2; the room
can be turned (the yaw code); the scene has `snapScreen()` to pin a point to the low-res pixel grid, the camera axes
`_r` and `_u`, the pixel size `S.pw`, and several places that already make a `CanvasTexture` or `DataTexture` with
`NearestFilter` (search for `NearestFilter`; the footprints are one). Another lane is editing `js/scene3d.js` right
now, so I give names, not line numbers.

Options:

- **A. Keep geometry, change the shapes per dish.** Cheapest. Looks like today.
- **B. A camera-facing quad with a small table sprite** (12 x 9 to 16 x 12) as a `DataTexture` (`NearestFilter`, alpha
  test), sized `w x S.pw` by `h x S.pw` along `_r` and `_u`, its anchor passed through `snapScreen()`; frames for the
  bites. Because the sprite is drawn in the same three-quarter view and always faces the camera, turning the room does
  not break it. `S.pw` halves at zoom 2, so double the quad there (2 room pixels per texel) or the dish shrinks on the
  table. **I did not build or test this**; whether the look pass (outline and palette snap of the room) treats a
  textured quad well, and what happens at the zoom stops between 1 and 2, is unknown.

My advice: B only if a lane has spare time. The table picture cannot carry the appeal at 12 px either way. Spend the
effort on the hero, and consider a small picture card (the hero at 2 CSS px per art px on a paper chip) when the dish
is set down, so the appetising picture is seen in the play room too. That is a design suggestion for the flow lanes,
not something this topic can decide.

### 3.7 Preview and checks

- `render.js` writes `out/omelette-sheet.png`: row 1 the versions, row 2 the final at 1x, 2x, 3x on wood, on paper, on
  a dark ground, row 3 the three states, row 4 the icon and the table sprite. Labels are a 3 x 5 pixel font in the
  script. The agent then opens the PNG with the Read tool.
- For production (`tools/make-food-sheets.js` in `briefs/A.md`), add a `--check` mode like `tools/make-dish-icons.js`
  has (same input, same bytes: zlib level fixed, no clock, no random).
- Tests that cost little (the art files are already tested for these): every frame of every sprite decodes; colours
  are a subset of Apollo + FOOD; alpha is 0 or 255; the hash (`COOK_ART.hash`) of each frame is stable across two
  loads; the source has no `Math.random`, no clock, no float trig, no DOM, ASCII only.
- Lint thresholds I would start with: orphans under 3 % of painted pixels not counting glint and fleck roles; no
  touching pair under 20 luma; at most 24 colours in a hero, 12 in an icon.

---

## 4. The proof: a rolled omelette on a rectangular plate

- Final picture, 6x on a wood ground: `/home/user/Let-s-model-play/wip/round7/research/foodart/out/omelette-final-6x.png`
  (336 x 288 = the 48 x 40 sprite with a 4 px margin, times 6)
- Contact sheet: `/home/user/Let-s-model-play/wip/round7/research/foodart/out/omelette-sheet.png`
- Icon and table sprite at 12x: `/home/user/Let-s-model-play/wip/round7/research/foodart/out/omelette-small-12x.png`
- Each pass at 6x: `out/omelette-v1-6x.png`, `out/omelette-v2-6x.png`, `out/omelette-v3-6x.png`
- Sprite source: `/home/user/Let-s-model-play/wip/round7/research/foodart/omelette.js` (below, complete)

48 x 40 art px, 1462 painted pixels, 22 colours, all from the game palette (the script stops otherwise). Plate in
Apollo only; food in Apollo + FOOD. This is evidence for the pipeline, not final art.

### 4.1 What each pass fixed

| Pass | What I saw when I opened the PNG | Rule broken | Fix |
| --- | --- | --- | --- |
| v1 | Volume was there at once (two planes, overlap, shadows). But it read as fried tofu or cheese toast: everything orange and red, heavy double border, the plate a flat white tile with a stray grey line. | outline colour (J1 is red); a rim line hugging the outline; too little difference between skin and inside | brown outline a1 / r1 / r0; paler face; seam in the lighter tone; plate corners rounded; top plane 5 px deep; 2 px shadows; ketchup dab in the empty corner |
| v2 | Softer, but now bread rolls: the seam had almost vanished and top and front were the same yellow. Corners rounded by 3 px made buns. | planes need different base tones; the nameable inside must survive | skin golden (J4), cut face cream (J6), seam in two tones (lamp side J4, shadow side J3), corners back to 2 px, a blue line on the plate rim, a peak on the ketchup |
| v3 | Reads as rolled omelette. The lying slice still looked like a bun: its cut face was 4 rows and half in shade. | the most lit plane must be the lightest | lying slice redrawn: cut face 6 rows, mostly cream; the seam got its own characters so states leave it alone; icon and table sprites added |
| final | See the picture. First table sprite read as a face (two blocks side by side, one glint each): redrawn staggered with one glint. The icon showed a two-step cyan shadow: fixed in the shadow pass (flags). | | |

### 4.2 Honest list of what is still wrong with the sample

- **Lint: 73 orphan pixels of 1462 (5 %)**, 15 of them J5 and 8 J4 inside the egg: the top planes are noisier than my
  own rule allows.
- **Lint: 8 touching pairs under 20 luma.** B2 / J4 (10) and B2 / J5 (19): the face shade `b` does no work at 1x.
  C2 / J3 (3): the carrot fleck is invisible beside the seam. a1 / P1 (4): the lamp-side outline of the egg disappears
  against the leaf. Three of the eight are harmless (the glint on cream, and two dark outlines that touch).
- The skin ring on the left of each slice runs parallel to the outline for 8 rows (hugging).
- The two rear slices show only the right 60 % of their cut face; a 10 px stagger instead of 9 would show more seam.
- The leaf is a soft blob; it reads as "something green", not clearly lettuce.
- The plate's blue line hugs the outline all the way round. It is charming at 6x and busy at 1x.
- At 1x (48 px wide, as on a 1x thumbnail) the seam is gone; the dish reads as yellow blocks on a white plate.
- I did not test the sprite inside the real kitchen scene, in a browser, or on a phone. I did not run the game's tests.

### 4.3 The sprite source (`foodart/omelette.js`, complete)

```js
/* omelette.js - RESEARCH SAMPLE (round 7, topic 09): a rolled omelette (gyeran-mari) on a small rectangular plate,
 * three-quarter view, 48 x 40 art px, game palette only (Apollo 46 + FOOD 24 by name). Evidence for the pipeline, not final art.
 * Light from the upper left. One character = one pixel, '.' = empty. See pixmap.js for the format.
 * History: history/omelette-v1.js -> v2 -> v3 -> this file (the lying slice redrawn with a bigger, lighter cut face; the
 * seam got its own two characters so a doneness palette swap can leave it alone; a 16-px icon and a 12 x 9 table sprite added). */
(function (root) {
  'use strict';
  var S = {
    name: 'gyeran-mari', w: 48, h: 40,
    light: [1, 1, 2],                     /* contact shadows fall 1 right, 1 down, walked 2 steps */
    /* character -> palette NAME (js/cook-art.js: PAL = Apollo by role, F = FOOD). One character per ROLE, not per colour:
       g o r = skin (base, shade, deep), u v = the seam between the rolled layers (lit side, shadow side), c y b = cut face
       (light, base, shade), W = hard glint, t k K = outline (lamp side, main, grounded). u and g are the same colour today. */
    pal: { W: 'G0', c: 'J6', y: 'J5', b: 'B2', g: 'J4', o: 'J3', r: 'J2', u: 'J4', v: 'J3', t: 'a1', k: 'r1', K: 'r0',
      P: 'P3', p: 'P2', q: 'P1', Q: 'P0', a: 'C2', e: 'C2', R: 'C1', D: 'C0',
      w: 's6', l: 's5', m: 's4', n: 's3', h: 'b4', i: 'b3', j: 'b2', J: 'b1' },
    ramps: ['WcybgorkK', 'PpqQ', 'eRD', 'whi', 'lmn', 'jJ'],          /* light -> dark; a shadow moves one step right */
    states: {                             /* cooking states of the same pixels: only the skin roles are re-mapped */
      pale: { g: 'J5', o: 'J4', r: 'J3' },
      golden: {},
      browned: { g: 'J3', o: 'J2', r: 'J1' }
    },
    parts: {
      plate: [
        '...JJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ...',
        '..JwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ..',
        '.JwjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjwJ.',
        'JwjwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwjwJ',
        'JwjwllllllllllllllllllllllllllllllllllllllllwjwJ',
        'JwjwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwjwJ',
        'JwjwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwjwJ',
        'JwjwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwjwJ',
        'JwjwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwjwJ',
        'JwjwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwjwJ',
        'JwjwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwjwJ',
        'JwjwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwjwJ',
        'JwjwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwjwJ',
        'JwjwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwjwJ',
        'JwjwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwjwJ',
        'JwjwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwjwJ',
        'JwjwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwjwJ',
        'JwjwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwjwJ',
        'JwjwlwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwjwJ',
        'JwjwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwjwJ',
        'JwjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjwJ',
        'JwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwJ',
        'JllllllllllllllllllllllllllllllllllllllllllllllJ',
        '.JmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmJ.',
        '..JJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ..'],
      /* one slice standing on its skin: rows 1-5 the browned top (skin), row 6 the skin seen edge-on, rows 7-14 the cut
         face with the rolled layers (a 1.5-turn seam), flecks of scallion (p q) and carrot (a) */
      slice: [
        '...ttttttttt...',
        '.ttggyyygggokk.',
        'tgyccWWcygggook',
        'tyycccyygooggok',
        'tgyyygggggogork',
        'tggyyyygggggork',
        'kggggggggggoook',
        'kgccccccccyyyok',
        'kgcccccccyyyyok',
        'kgccuuuuuvvyyok',
        'kgccuccyyyvyyok',
        'kgccucyvayvybok',
        'kgcyuvvvyyvybok',
        'kgypyyyyyyvbboK',
        'kooqyyybbbvbooK',
        '.KKoooooooooKK.',
        '...KKKKKKKKK...'],
      /* one slice lying down: the cut face on top (the most lit plane, 6 rows), the skin in front (3 rows) */
      flat: [
        '...ttttttttt...',
        '.ttgggggggggkk.',
        'tgcccccccccyyok',
        'tgccccccccyyyok',
        'tgccuuuuuvvyyok',
        'kgccuccyyyvyyok',
        'kgccucyvayvybok',
        'kgcyuvvvyyvybok',
        'kggggggggggoook',
        'kyccyyygggggook',
        'kgyyggggooggorK',
        '.KKgggggooooKK.',
        '...KKKKKKKKK...'],
      ketchup: [
        '...DD...',
        '..DeRD..',
        '.DeWRRD.',
        'DRRRRRRD',
        'DRRRRRDD',
        '.DDDDDD.'],
      leaf: [
        '..PP...PPp...',
        '.PPpp.PPppp.p',
        'PPpppqPppppqp',
        'PppppqpppppqP',
        'pppppqppppqpp',
        '.ppppqpppqppp',
        '..pppqppqppq.',
        '...ppqpqppq..',
        '....qqqqqq...'],
      /* 16-px icon parts: a 9 x 9 slice (the seam shrinks to a square ring) and a plate strip */
      mini: [
        '.ttttttt.',
        'tyWcygggk',
        'tgyggggok',
        'kcccccyok',
        'kcuuuvyok',
        'kcuccvyok',
        'kcuvvvybK',
        'kyyyyybbK',
        '.KKKKKKK.'],
      plate16: [
        '.JJJJJJJJJJJJJJ.',
        'JwwwwwwwwwwwwwwJ',
        'JwwwwwwwwwwwwwwJ',
        'JwwwwwwwwwwwwwwJ',
        'JllllllllllllllJ',
        '.JJJJJJJJJJJJJJ.'],
      /* the play-room table: 12 x 9, one texel = one room pixel (today's plate is 9 room px wide on a phone). Two slices staggered
         (side by side with one glint each they read as a face with two eyes: first try, see the report) */
      table: [
        '......ttt...',
        '.....tgWgk..',
        '..tttkccyk..',
        'JtycgkcvykJJ',
        'JkccykyybkhJ',
        'JkcvykKKKhwJ',
        'JwKKKhwRRwwJ',
        'JllllllllllJ',
        '.JJJJJJJJJJ.']
    },
    outlined: { leaf: ['q', 'Q'] },       /* parts drawn without an outline: [lit ring, shadow ring] for the outline pass */
    frames: {                             /* back to front; 's' = cast a contact shadow on what is already painted */
      served: { w: 48, h: 40, list: [['plate', 0, 14], ['leaf', 0, 7, 's'], ['slice', 22, 4, 's'], ['slice', 13, 7, 's'], ['slice', 4, 10, 's'], ['flat', 30, 18, 's'], ['ketchup', 6, 27, 's']] },
      icon: { w: 16, h: 16, list: [['plate16', 0, 9], ['mini', 6, 2, 's'], ['mini', 1, 4, 's']] },
      table: { w: 12, h: 9, list: [['table', 0, 0]] }
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = S; else root.OMELETTE = S;
})(this);
```

The decoder it needs is `foodart/pixmap.js` (`PIXMAP.frame(SPRITE, 'served', pal)` with `pal` = characters resolved to
hex). The core of it:

```js
function decode(rows, pal, name) {
  var h = rows.length, w = rows[0].length, b = blank(w, h);
  for (var y = 0; y < h; y++) {
    if (rows[y].length !== w) throw new Error((name || 'part') + ' row ' + y + ': ' + rows[y].length + ' columns, want ' + w);
    for (var x = 0; x < w; x++) {
      var ch = rows[y].charAt(x); if (ch === '.') continue;
      if (!pal[ch]) throw new Error((name || 'part') + ' row ' + y + ' col ' + x + ': no colour for "' + ch + '"');
      put(b, x, y, pal[ch]);
    }
  }
  return b;
}
```

---

## 5. Sources

Opened and read as page text (through the fetch script) unless marked.

| # | URL | Used for |
| --- | --- | --- |
| 1 | https://lospec.com/articles/pixel-art-outlines | 1 px lines, curve segment lengths, where to leave the outline out |
| 2 | https://lospec.com/articles/pixel-art-outlines-part-2-using-color | coloured and selective outlines, contrast against the background, inner lines |
| 3 | https://pixelparmesan.com/anti-aliasing-fundamentals-for-pixel-artists | hand anti-aliasing, banding, sel-out as AA on the outline, when not to anti-alias |
| 4 | https://www.slynyrd.com/blog/2018/1/10/pixelblog-1-color-palettes | ramps in HSB, hue shift of up to 20 degrees per step, saturation peak |
| 5 | https://slynyrd.com/blog/2020/9/30/pixelblog-30-food | food sprites at about 32 px, ramen at about 48 px, outlines and limited colours for food. The teaching is mostly in its images, which I could not see; only the text was read. |
| 6 | https://www.slynyrd.com/blog/2019/9/18/pixelblog-21-top-down-objects | blocking, one projection for all objects, short cast shadows |
| 7 | https://www.slynyrd.com/blog/2018/3/14/pixelblog-3-graphical-projections-1 | three-quarter top-down view, depth from lighting, uniformity over realism |
| 8 | https://www.derekyu.com/makegames/pixelart.html | process, form and volume, AA, selective outlining, dithering, the 32 x 32 sprite |
| 9 | https://www.derekyu.com/makegames/pixelart2.html | too many similar colours, pillow shading, cardboard designs, chunky pixels |
| 10 | https://pixeljoint.com/forum/forum_posts.asp?TID=11299 | clusters, noise, the kinds of banding, pillow shading, sel-out caution, hue shifting |
| 11 | https://opengameart.org/content/chapter-4-shadow-and-light | light source, planes, flat faces lit evenly, pillow shading |
| 12 | https://opengameart.org/content/chapter-7-textures-and-dithering | material = surface pattern + reaction to light; dithering not for sprites |
| 13 | https://itch.io/t/2422252/pixel-tutorial-selective-outlines | outline = the bordering pixel one shade darker |
| 14 | https://pixeljoint.com/forum/forum_posts.asp?TID=15138 | why highlights warm and shadows cool (forum opinions) |
| 15 | https://tips.clip-studio.com/en-us/articles/9875 | saturation, shadow colour, glossy against matte. **Read only as a summary made by the fetch tool's small model, not as raw text.** |
| 16 | https://tips.clip-studio.com/en-us/articles/3732 | choosing the view angle per dish. **Same caveat.** It had little that was concrete. |
| 17 | https://www.slynyrd.com/pixelblog-catalogue | index only, to find 5, 6 and 7 |

Could not open (so nothing from them is used):

- https://medium.com/pixel-grimoire/how-to-start-making-pixel-art-4-f57f51dcfa02 (HTTP 403, both tools)
- https://design.tutsplus.com/tutorials/create-a-series-of-breakfast-pixel-art-icons-in-adobe-photoshop--cms-21346 (HTTP 403)
- a Slynyrd "texture" post (my guessed URL returned "page not found"; I did not look for the right one)
- the direct fetch of the two Clip Studio articles (HTTP 403; only the summarising tool got through)

Not used on purpose: asset packs that the searches returned. They are other artists' sprites; nothing was downloaded
or looked at.

No page gave instructions to me as a reader beyond normal tutorial text; nothing was followed.

## 6. Open questions

1. **Palette wording in the contract.** `SPRITES.md` says Apollo; the kitchen allows Apollo 46 + FOOD 24 and the food
   ramps are all FOOD. I assume "Apollo + FOOD" is meant (0b.1). The lead should confirm.
2. **Warm whites.** Rice, egg white, tofu and cream have no warm shade tone: after s6 the palette offers s5 and s4
   (cool grey-green) or w6 (paper cream). May FOOD grow by two to four colours, or should w6 be used? Untested, and it
   matters for the triangle rice ball and the cake's cream.
3. **Which projection for bowls and pans**: rim height 0.55 of the width is my recommendation; the pan is 0.63 and the
   current plate 0.67. Nobody has checked a new 0.55 container next to the existing 0.63 pan in one scene.
4. **The picture on the play-room table** (0b.7): the 80 x 56 dish at 1 device px per art px, a small `table.<id>`
   sprite at the room's pixel size, or today's geometry plus a picture card. Not tested in the room; needs the lead.
5. **How much of the 80 x 56 canvas the food should fill.** At k = 9 the canvas is the whole width of a 360 px phone.
   My sample fills 48 x 40; the same dish redrawn for the contract would be about 72 x 52.
6. **Time against the work list.** 348,064 pixels in `SPRITES.md`; my 1,462-pixel hero took four look-and-fix passes.
   Parts, states and generated containers cut the typing by perhaps two thirds (my estimate, not measured), but the
   looking does not shrink. The priority order in `A.md` (five dishes first, then jeon and gyeran states) is the right
   cut line; I would expect the last recipe's states and the 16 px step pictograms to be the ones at risk.
7. **Progress between frames by ordered dither** (3.3) and **the squash helper** are ideas only; neither is built.
