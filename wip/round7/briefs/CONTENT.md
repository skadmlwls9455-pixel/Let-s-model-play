# Content pass — places you walk into, not sheets (lead, 11-21 23:55 KST)

This replaces the per-lane paragraphs of `UI2.md` for S, C, F and P (its six rules still hold for any card or close-up).
Read `COMMON.md` again for the hard lines; they all still apply.

## The owner's words (11-21 23:40 KST, to the lead)

> "기능들을 단순히 탭같은 느낌으로 축약하지 말고 저기서 더 발전시켜서 개별 콘텐츠 같은 느낌을 내도록 ui와 시스템 다듬어줘.
> 옷가게도 예를 들면 옷가게 맵을 아예 따로 만들고 마네킹에 입혀진 거를 입어보고 살 수 있는 그런 느낌으로. 구현을 세분화해줘.
> 지금은 그냥 형식만 띡 올린 느낌이야."

And earlier the same night, written into lanes: "아 ui가 너무 조잡한데 저거 좀 개선해줘봐." (F) · "저 신사같은 디자인이 별로 마음에
안 들어서 … 꽃덩굴이 얽힌 구조물로 바꿔줘" · "꽃 안 같아 징그러워! 에셋 재활용 말고 꽃 만들어줘" (W).
What that sets as the bar: a feature is a **place with things in it that my character uses**; an asset is made for what it
is (never a tree ball passed off as a flower); nothing may read as a form with a grid of boxes.

## The owner's answers (11-22 00:05 KST)

1. Shops are separate rooms behind a door, like the attic and the play room: **yes — and the cafe and the contest get
   their own separate maps too** ("응. 카페나 콘테스트도 아예 맵을 따로 만드는 걸로."). So there is a fourth room, the
   **contest hall** (`hall`): the show happens inside it, not on the open plaza stage.
2. Trying clothes on and walking about the shop in them: "좋아".
3. Order of protection (clothes shop, cafe, contest, general store, attic wardrobe): "Ok".

## Principles

1. **It happens in the world.** I walk to a thing, the camera frames it, my character does it (walks, picks up, wears,
   carries, sits, eats, poses). A card may appear only as the close-up of an object that stands in the scene (a price tag,
   the chalkboard, the record rack, a receipt). A bottom sheet is never the feature.
2. **Chains of beats.** Every activity is at least five visible beats in a row, like the kitchen-to-table chain lane T
   built (served → carried → set down → sit → the octopus comes). Each beat can be interrupted and ends in a sane state.
3. **Somebody is there.** The keeper stands in the room and speaks at the beats (lane N's scripted lines, label '대본',
   no feeling words).
4. **The place remembers.** Today's stock is what the mannequins wear; a sold mannequin stays bare with a tag until
   tomorrow; a half-eaten plate waits on the cafe table; the stage is dressed on weekends.
5. **Cards are not dialogs.** In-world cards are plain positioned elements inside `#scene`, anchored with
   `scene.project`, never `<dialog>` (lane W found that headless Chromium paints a black band over the WebGL canvas when a
   top-layer dialog is open: such screenshots lie; cards avoid it).
6. **Fallback stays.** With the 2D scene, reduced motion or a missing scene function, the old sheet opens (keep that code).

## Contracts (owners in brackets; feature-detect everything; agree details directly with the owner lane and copy the lead)

Sessions (use `send_message`): K `session_01Tq2y4QZUpNpnV5cRfjKJa2` · A `session_01Tq2y4SQwfkkg9USFewi5UN` ·
T `session_01Tq2y4TbHYmokrSAA7VNooD` · U `session_01Tq2y4RoYgpT5jfRgYAa5sm` · P `session_01Tq2y4Rry4gKkYx9QU9ferB` ·
W `session_01Tq2y4TM4YC1T1S8gH7WyyS` · V `session_01Tq2y4RN5FrCBChDE4gtErh` · S `session_01Tq2y4UyHAQAeqPneYKgSFN` ·
C `session_01Tq2y4QXFsUtLrpN2vY4A4y` · N `session_01Tq2y4Qqoq9WNyhe5zitdEt` · F `session_01Tq2y4SbbcvooKJ5ykn66Da` ·
lead `session_01Tq2y4UPNUfNv1Bsd1UKef2`.

**C9 [W] rooms you walk into.** One registry next to `WIDE_REG`:
`ROOM_REG[key] = { half: [hx, hz], wallH, door: [x, z], outside: <wide spot key or [s, t]>, build(g, kit), boxes, circles,
spots: [{ key, btn, x, y, z, r, stand }], lights: [[x, y, z], [x, y, z]], frame(dt, t) }` with keys `clothes`, `goods`,
`cafe`, `hall` (room-local metres, origin at the floor centre). API: `scene.enterRoom(key)` → Promise<{ ok, reason }> (from the
wide outside: walk to the door, door beat, cover, the room shows at the indoor zoom), `scene.leaveRoom()` → Promise,
`scene.inRoom()` → key or null, `scene.roomSlots(key)`, `scene.project(x, y, z)` → `{ x, y }` in CSS px, and a
`ppol:room` CustomEvent `{ detail: { key } }` on the document (key null when outside again). App side: `APP.goInside(key)`,
`APP.goOutside()`, `APP.inside`. Walk clamp, colliders, taps with walk-first, the camera fit, two lights (same count as
the attic: no new shader program), time-of-day warmth, the perf budget (a room draws at most 60 calls). 2D: `goInside`
answers false. **Step one within 45 minutes: the registry and enter / leave working with a plain box room, pushed and
announced to V, P, S, C, N**; polish after.

**C10 [V] the rooms and the stage.** `js/village.js` gets `ROOMS` (sizes, doors, slots; node-tested) and the builders fill
`ROOM_REG`. Furnish to the standard of the attic and the play room (boards, wall panels, a window with daylight, rugs,
shelves, plants, lamps); every prop is modelled as what it is.
- Outside: door spots `#btn-in-clothes`, `#btn-in-goods`, `#btn-in-cafe` (the stall buttons `#btn-shop-clothes` /
  `#btn-shop-goods` do the same); an open sign.
- `clothes` (about 6.0 x 5.2 m): four mannequin podiums `mq0..mq3` with a hanging tag each, a standing mirror `mirror`, a
  counter `counter` with the keeper slot `keeper`, a rack of hangers, fabric rolls, a shoe bench, a rug, a fitting curtain.
  Buttons `#btn-mq-0..3`, `#btn-room-mirror`, `#btn-room-counter`, `#btn-npc-clothes`, `#btn-room-exit`.
- `cafe` (about 6.4 x 5.2 m): counter with machine and cake stand, `keeper`, a chalkboard on the wall `menu`, a pick-up
  spot `pickup`, three tables with stools (`seat`, `table` for mine), a sideboard with the turntable `turntable` and the
  record rack `lp`, a sea window. Buttons `#btn-cafe-menu`, `#btn-cafe-counter` (pick-up), `#btn-cafe-seat`,
  `#btn-cafe-lp`, `#btn-npc-cafe`, `#btn-room-exit`. `scene.cafeSit` / `cafeCup` / `cafeSeated` now act in this room;
  `scene.cafeRecord(on, colour)` spins the disc and lets notes drift. The deck outside stays as a terrace.
- `goods` (about 5.2 x 4.8 m): shelves `shelf0..shelf5` (seed packets, dye bottles), barrels, a scale on the counter,
  `keeper`. Buttons `#btn-shelf-0..5`, `#btn-room-counter`, `#btn-npc-goods`, `#btn-room-exit`.
- `hall`, the contest hall (about 7.0 x 6.0 m; the owner: its own map): a raised stage with a catwalk into the room,
  curtains, two spot lamps, a judges' table with three seats facing the catwalk, benches for a small audience, a
  backstage corner with a clothes rack and a mirror (`rack`, where lane P's look strip opens), a results board on the
  wall. Buttons `#btn-hall-stage` (enter the show), `#btn-hall-rack`, `#btn-hall-board`, `#btn-room-exit`. Outside, the
  plaza stage keeps its poster stand and gets the hall's entrance (`#btn-in-hall`, a curtained doorway behind it; the old
  `#btn-plaza-stage` does the same).
- In the hall: `scene.stage()` → `{ wait, path: [[x, z] x4], judges: [[x, z, face] x3], podium: [[x, z, h] x4] }`,
  `scene.stageDress(on)` (bunting, a judges' table, lamps; a theme poster stand that is there all week), and for the NPC
  drawing API: ids `judge0..2`, `rival0..2`, `scene.npcPlace(id, x, z, face)`, `scene.npcPose(id, pose)`.
Order: clothes, cafe, hall, goods.

**C11 [P] bodies that wear clothes.**
- `scene.mannequins(key, [{ slot, parts: { outfit, shoes, acc, hair } | null, sold }])`: a plain figure without a face
  (the loft mannequin is the reference) on V's slot, wearing any catalogue item; null parts = bare figure.
- `APP.tryOn(kind, key)`, `APP.tryOff(kind)`, `APP.trying()`: my character wears it now, nothing is saved, it survives
  walking in the room, it is cleared by `APP.goOutside()` unless bought (`APP.ownItem` + `APP.wear(kind, key)` save).
- `scene.playerCloseup(on)` → Promise (the camera comes in to about 2x on my character, who turns to it),
  `scene.playerPose('twirl' | 'pose' | 'bow' | 'cheer')` → Promise, `scene.playerWalkPath(points, { speed })` → Promise.
- The attic wardrobe: a wardrobe with a mirror door on a free attic wall, spot `#btn-wardrobe` ('옷장'). Tapping walks
  there, closes in, and opens the look strip: one row of part pictures and one row of options, at most 200 px tall at the
  bottom; the room and my character stay visible above it and are the preview. `APP.openLook()` and the settings button
  go there in 3D; the 2D scene keeps the sheet.
Order: mannequins and try-on first (S is blocked on them), then close-up and poses, then the wardrobe.

**C12 [T] carrying and table-top pictures.** Export what the kitchen-to-table chain already has:
`scene.playerCarry(spriteId | null, frame)` (my character holds a `COOK_SPR` picture while walking) and
`scene.spriteProp(name, pos | null, spriteId, frame)` (a camera-facing pixel picture at a world or room position, lit like
its place; null removes it). Thirty minutes, after your own suite is green; announce to C, S, F.

**C13 [A] pictures for the new beats.** In `js/cook-sprites.js` style (a second table is fine): a price tag (`ui.tag`,
with a hole and a string), a sold stamp, a stamp card and a stamp, a recipe card, a cafe tray, the cup in three sips, the
cake slice and the skewer in three bites each (`table.cake` / `table.kkochi` frames 0..3 if they are not there), eight
record sleeves at 24 px and a disc, a seed packet and three dye bottles, a judge's placard with one to three stars, a
receipt. Ids, sizes and anchors into `wip/round7/briefs/SPRITES2.md` first (ten minutes), then draw; tell S, C, F.

**C14 [N] lines and people.** New scripted keys (facts only): `shop.enter`, `shop.tryon`, `shop.mirror`, `shop.pay`,
`shop.leave`, `goods.enter`, `cafe.order`, `cafe.serve`, `cafe.stamp`, `cafe.record`, `contest.poster`, `contest.start`,
`contest.judge` (how many theme tags matched, per judge), `contest.podium`. Keepers stand at V's `keeper` slots inside;
one sleeper naps at a cafe corner table, the others on the pier, the beach and under the plaza tree.

## The beats per place

**Clothes shop [S, with W, V, P, N, A].** door → inside, the keeper's line once → the four mannequins wear today's four
(the daily rule is unchanged) → tap a mannequin: I walk to it, its tag card opens above it (picture, name, shells,
`입어 보기` / `살래`, or `입고 있어` when owned) → try on: my character changes on the spot with a twirl and the mannequin
goes bare; I can walk about; the mirror closes in and I pose → pay at the tag or at the counter: I walk to the counter, a
receipt card lists what I am trying on and the total, the existing confirm rule, shells count down, the item is mine and
stays on me, the mannequin keeps a sold tag until tomorrow, the keeper's line → leaving with unpaid things: they return to
their mannequins at the door and my own clothes come back.

**Cafe [C, with W, V, T, N, A].** door → inside → the chalkboard: a close-up of the board is the menu (three items, chalk
prices, the stamp card pinned beside it) → order and confirm → the keeper works for a moment (steam) and a tray stands on
the pick-up spot → I carry it to my table, set it down and sit → each tap on the plate is a bite (three), the cup sips →
the stamp lands on the card; on the third the keeper's line and the recipe card flies to the bag (`APP.recipeEat` as
today) → the record corner: I walk there, the rack close-up, a sleeve is picked, the disc spins in the room and notes
drift, sound only if the setting is on → standing up and the door end the visit; a half-eaten plate waits.

**Weekend contest [F, with V, P, N, A].** all week the plaza shows a poster of the coming theme (tap: poster close-up) and
the hall can be entered (an empty stage, the results board of last time) → on the weekend the hall is dressed and the
three keepers sit at the judges' table → tap the stage: I walk to the wait spot backstage, the entry card (theme, what I wear, `옷 갈아입기` opens P's look strip right there, `나가기`) → the show in the scene,
about 12 to 15 s, skippable: the three rivals cross, then I walk the path, twirl and pose → the judges raise placards
(stars) one after another with N's fact lines → the podium: everyone stands by rank, shells as today, a small result card
(`채점 규칙` stays) → the stage keeps the result for the day.

**General store [S].** door → inside → shelves hold today's goods → tap: I walk there, the tag card, `살래` → the item hops
into the bag, the keeper's line. Smallest of the four: build it last.

**My look [P].** the attic wardrobe as in C11.

## Order of protection if time runs short

Clothes shop, cafe, contest hall, general store, attic wardrobe. A place that is not solid keeps its sheet.

## Time

Lane pushes for this pass by **11-22 05:00 KST (20:00 UTC)**; W's step one 45 minutes from now. The lead merges and runs
the full matrix after that; fixes until 11-22 17:00 KST. Vercel refuses new deployments until about 11-22 21:16 KST (the
free daily limit was used up by preview builds of lane pushes; previews are now switched off), so nothing can be shown on a
phone before then: **your screenshots are how the owner sees your work tonight — make them true and good** (real gestures,
360x740 and 412x915, no dialog open over the canvas).

## Checks

Your node and browser suites, `npm test`, the font check, the whole smoke suite letter by letter before you say done, one
independent check. New browser checks for every chain above with real taps: each beat reached, each interruption ends in
the stated state, nothing saved by a try-on, no double payment in two tabs, reduced motion and the 2D fallback.
