# Lane A, round 7 pass 5 (11-24): the gift line, award items in my wardrobe, locked wardrobe tiles

Base `21df2c7`. Commits on `lane/7-a` (one per job; SHAs in the lead message):
1. the gift line names the octopus and the demo rule;
2. locked wardrobe tiles show the name only, and the wardrobe can only put on what I own;
3. the weekly award items (paper crown, emperor cape) go into my wardrobe.

## 1. The emperor cape line read as if my character refused

**Cause:** `js/app.js` `giftOffer`, old lines 3401-3402 and 3413:
- The line's subject was the octopus's given name alone (`name + '는 ' + c.name + ' 안 두르기로 했어.'`). The particles were fixed, so a name ending in a consonant gave '말랑는' and '말랑가'.
- The toast, the only thing that appears over the scene, dropped '(데모 규칙이 고름)'; only the log row kept it.
- The octopus's '…' bubble shows for 1.2 s before the answer and is hidden again by the time the toast appears.

Result: the screen showed a bare sentence 'X는 황제 망토 안 두르기로 했어.' with my own character standing in the middle of the room. Nothing in the line said it was the octopus, or that a rule had chosen. I found no code path that names or poses the player character on this line: the misreading comes from the wording and from where the line appears.

**Fix:**
- The subject is always '문어 <이름>', with the particle chosen by the last syllable (은/는, 이/가, 을/를; `giftJosa`, using the brain's `josa` when it is exported).
- The toast carries '(데모 규칙이 고름)' like the log row. Example before: '말랑는 황제 망토 안 두르기로 했어.' After: '문어 말랑은 황제 망토를 안 두르기로 했어. (데모 규칙이 고름) 내 옷장엔 있어.'
- The octopus still decides by the same seeded demo rule; nothing about the choice changed.

## 2. Award items in my character's wardrobe

The owner asked that the emperor cape go into my character's wardrobe even when the octopus refuses it ("문어가 거절하면 사실상 입어볼 길도 없는 거잖아").

**Decision (owner to confirm):** my character owns the paper crown and the emperor cape as soon as the weekly runner award has been earned, **whatever the octopus answers** (yes, no, or not asked yet). The octopus's answer never closes the way to wearing them.
- `awardWardrobe()` writes them into `S.user.owned` (`acc:paper_crown`, `acc:emperor_cape`) with the day they came in.
- It runs at start, when the wardrobe opens and after a gift answer.
- Players whose octopus refused earlier get them at the next start.

**Parts (scene3d `PLAYER_PARTS.acc` and P's `PL_PARTS.acc` block):**
- `paper_crown` 종이 왕관: a yellow paper band on the crown of the head, five points and a red jewel in front.
- `emperor_cape` 황제 망토: a red half-cape from the shoulders down the back, with a darker lining, a gold collar and two gold clasps. It is clearly visible from the back; from the front only the red edges show.
- Tags: crown `cute star c-yellow`, cape `cool star warm c-red`. Colours are in `ACC_MAIN`, so dye and contest colour judging work. `PLAYER_META` gains a `!award` marker: `x.award = true`, `shop: null`, never sold.
- `isOwned` treats award items as owned only once they are in `owned`. `wardrobe()` items carry `award: true`.

**Limit:** both are `acc` items, so either one replaces a hat or other accessory: the crown and the cape cannot be worn together, and the cape cannot go over a beret. A separate back slot would change the saved look's key order (`PLAYER_CATS`) and every lane that reads it, so I did not add one.

A log row '옷장 · 황제 망토는 내 옷장에도 있어. 나도 입어 볼 수 있어.' follows an award gift answer.

## 3. Wardrobe: items I do not own show their name only

- Locked tiles have no picture and no price: a lock mark centred above the name. The tile is still 44 px or taller and dashed. Pressing it gives one line: '마을 옷가게에서 팔아.' for shop items, '다락방 달리기 주간 상으로 받아.' for award items.
- `lookPick` refuses an item I do not own, with the same line, so nothing unowned can be put on from the wardrobe.
- Trying on (`APP.tryOn`) and buying stay with the shop. `setPlayerPart` is unchanged, because the shop's wear after paying and the sets ('다시 입기', all free items) use it.

## Existing lines I changed
- `js/app.js`: `giftOffer` (the lines, the toast, the award log row), `isOwned`, `wardItem` (+`award`), `LOOK_FRAME` (+cape), `lookRenderItems` (locked tile), `lookPick` (guard), `openLook` (+`awardWardrobe()`), boot (+one `setTimeout`). New: `giftJosa`, `awardWardrobe`.
- `js/scene3d.js`: `PLAYER_PARTS.acc` (+2), `PLAYER_META` (+2 and the `!award` parse), `PL_PARTS.acc` (+2 builders in P's block), `ACC_MAIN` (+2).
- `css/style.css`: the `.look-tile.locked` rules (lock mark centred, padding for the name).
- `tools/smoke.js`:
  - P7 catalogue: 14 accessories; award items are not owned until earned.
  - Q gift: the answer regex now expects '문어 뚜루는 …을/를 안 …기로 했어. (데모 규칙이 고름)'.
  - P7 locked tiles: no price, no picture, name shown.
  - P7 new award check: locked before, owned and wearable after the award.
- `tools/test-player-parts-live.js`: 14 accessory pictures (was 12); a new check that the two award items are accessories and are never sold.

## Player-facing lines (new or changed)
- '문어 <이름>은/는 <물건>을/를 안 쓰기로 / 안 두르기로 했어. (데모 규칙이 고름)' and the yes forms '문어 <이름>이/가 … 쓰기로 / 두르기로 했어.'
- '문어 <이름>이/가 옷장에 넣어 두기로 했어.' / '문어 <이름>은/는 그대로 쓰고 있기로 했어.'
- '… 내 옷장엔 있어.' (toast tail, award refused)
- Log row '옷장': '<상 이름>은/는 내 옷장에도 있어. 나도 입어 볼 수 있어.'
- '다락방 달리기 주간 상으로 받아.'
- Item names '종이 왕관', '황제 망토' (already in the font subset as costume names).

## Checks
- `npm test`: passes. `python3 tools/subset-fonts.py --check`: stale none (no font regeneration needed).
- `node tools/test-player-parts-live.js`: 10 passed, 0 failed.
- `SMOKE_ONLY=P7,Q node tools/smoke.js`: 91 passed, 1 failed on the first run. The failure was the P7 catalogue check, which still expected 12 accessories and every unpriced item to be owned. I updated it: 14 accessories, and award items are owned only once earned. After that, `SMOKE_ONLY=P7` gave 17 passed, 0 failed (Q was not rerun: its checks passed in the first run and nothing it covers changed).

## Screenshots (360 x 740 @2, `wip/round7/r5/A/`)
- `1-gift-before-360.png` / `1-gift-after-360.png`
- `2-crown-front-360.png` / `2-cape-back-360.png`
- `3-locked-before-360.png` / `3-locked-after-360.png`

## Not verified / needs others
- Lane S's shop: award items have `shop: null` but are not everyone's. If the shop treats `shop === null` as "owned by everyone" instead of reading `owned`, it should read `owned` or `award`. I did not change shop code.
- The contest scores tags only; with the crown or cape worn, the colour family comes from `ACC_MAIN` and I checked one look (`c-yellow` for the crown).
- No independent subagent check this pass; looked at the screenshots myself.
