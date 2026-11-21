# Map: player look · ownership · economy · settings/status · stickers · dialogue · audio (round 7)

Read-only map for the round-7 lanes. Nothing in the source was changed to make it.
Line numbers = the **committed files at HEAD `2ed1134`** (check any of them with `git show 2ed1134:js/app.js | sed -n '5294p'`). The working tree was being edited while this map was written (the lead is inserting "7차 갈래 자리" slot markers), so working-tree lines are shifted from the points listed in **Appendix A** (generated last; it sits just before the closing summary) — that appendix also lists the slot marker lines. When in doubt re-find by name: `grep -n "function renderSettings" js/app.js`; the function and variable names here are exact.
Short names: `app` = `js/app.js`, `s3d` = `js/scene3d.js`, `css` = `css/style.css`, `smoke` = `tools/smoke.js`.

---

## 1. Player look — data model

### 1.1 Where it lives

| What | Where |
|---|---|
| Catalogue (owner of ids + Korean names) | `PLAYER_PARTS` `s3d`:321–333, exported as `SCENE3D.PLAYER_PARTS` `s3d`:7029 |
| Defaults | `PLAYER_DEFAULT` `s3d`:334 |
| Lookup / normalise (scene) | `plPart(cat, id)` `s3d`:339 · `normalizePlayer(cfg)` `s3d`:340–344 (iterates `Object.keys(PLAYER_DEFAULT)`; unknown category dropped, unknown id → default) |
| App copy used when the scene build has no table (2D etc.) | `PLAYER_CATS` `app`:233 · `PLAYER_FALLBACK` `app`:234–247 · `PLAYER_FALLBACK_DEFAULT` `app`:248 · `playerParts()` `app`:249–256 · `normalizePlayer(cfg)` `app`:257–265 · `playerDefault()` `app`:266 |
| Geometry builders | `PL_PARTS` `s3d`:2713–2856 (`hair` 2714, `acc` 2747, `eyes` 2757, `nose` 2788, `mouth` 2791, `cheek` 2797, `outfit` 2799, `shoes` 2851) · bangs `PL_BANGS` `s3d`:2702 |
| Colours fixed in code | `PLC` `s3d`:2586 (skin, pupil, lid, red, orange, straw, nose, mouth …) · `plSkin(look)` `s3d`:2645 recomputes face-line colours from the chosen skin |
| Assembly | `plHeadParts` `s3d`:2857 · `plEyeParts` 2863 · `plTorsoParts` 2892 · `plArmParts` 2893 · `plLegParts` 2894 · `plGeos(cfg)` 2899 (7 merged meshes) · `setPlayer(cfg)` `s3d`:3070 (swaps geometry only) |
| One-part change from UI | `setPlayerPart(cat, id)` `app`:1142–1150 → `normalizePlayer` → `save()` → `scene.setPlayer(S.settings.player)`; exported `APP.setPlayerPart`, `APP.playerParts` `app`:5479 |
| 2D fallback | `js/scene2d.js`:723 `setPlayer` only remembers the look (draws nothing) |

### 1.2 Categories, ids, Korean names (complete, in chip order)
`PLAYER_CATS` order (= save key order, pinned by `smoke`:2386 `PARTS_CATS`): `hair 머리, bangs 앞머리, hairColor 머리 색, skin 피부색, eyes 눈, eyeColor 눈 색, nose 코, mouth 입, cheek 볼, outfit 옷, shoes 신발, acc 악세사리`.

| cat | items (`id` name) | default |
|---|---|---|
| hair (6) | `bob` 단발 · `short` 숏컷 · `long` 긴생머리 · `twin` 양갈래 · `pony` 포니테일 · `wave` 웨이브 | bob |
| bangs (5) | `spiky` 삐죽 · `full` 일자 · `side` 옆가르마 · `center` 가운데 · `see` 시스루 | spiky |
| hairColor (6) | `blonde` 금발 #e8a93a · `brown` 밤갈색 #9a5a3a · `ink` 먹남색 #1e2a44 · `silver` 은빛 #cfc9c0 · `pink` 분홍 #de8fa9 · `lime` 연두 #a0d070 | blonde |
| skin (5) | `peach` 살구 #ffd096 · `fair` 밝은 #ffe2c4 · `honey` 꿀빛 #e9b27c · `chestnut` 밤빛 #c48a5c · `cocoa` 카카오 #8f5d3e | peach |
| eyes (6) | `round` 동그란 · `sparkle` 반짝 · `sleepy` 졸린 · `almond` 또렷 · `smile` 웃는 · `dot` 점 | round |
| eyeColor (6) | `dark` 흑갈색 #6a3a30 · `hazel` 호두색 #884b2b · `sea` 바다색 #3c5e8b · `leaf` 잎새색 #468232 · `honey` 꿀색 #be772b · `violet` 제비꽃 #7a367b (each also has `hi` lighter iris and `sh` sparkle dot) | dark |
| nose (3) | `none` 없음 · `dot` 콩코 · `tri` 세모코 | tri |
| mouth (6) | `none` 없음 · `smile` 미소 · `line` 새침 · `pout` 뾰로통 · `open` 활짝 · `o` 오 | smile |
| cheek (2) | `none` 없음 · `freckle` 주근깨 (`blush` was removed 11-10; a saved `blush` becomes `none`) | none |
| outfit (9) | `dress` 원피스 · `knit` 니트 · `hoodie` 후드 · `overall` 멜빵 · `raincoat` 비옷 · `hanbok` 한복 · `uniform` 교복 · `varsity` 야구점퍼 · `flannel` 체크셔츠 | dress |
| shoes (4) | `flat` 단화 · `boot` 부츠 · `sneaker` 운동화 · `loafer` 로퍼 | flat |
| acc (6) | `none` 없음 · `ribbon` 리본 · `beret` 베레모 · `glasses` 동글안경 · `catears` 고양이귀 · `strawhat` 밀짚모자 | ribbon |

The app fallback list differs in one hex (`blonde` `#ffc16a`, `app`:237) — keep both lists in step when adding ids.
Separate thing, not the player: octopus costumes `COSTUMES` `s3d`:337–338 (`ribbon, beret, strawhat, gat 갓, partyhat 고깔모자` + award-only `paper_crown 종이 왕관`, `emperor_cape 황제 망토`).

### 1.3 Colours
- Hair / eye / skin colour = a catalogue entry with `hex` (albedo). The hexes were chosen so that, after the cool fill light + toon steps + palette snap, each lands in a *different palette cell* from its neighbours (PLAYER_PARTS.md "두 가지 사실", `s3d`:2575–2576).
- Outfit / shoes / acc colours are literals inside each builder. **Dye** recolours only the "main" colours of an item: `OUTFIT_MAIN` `s3d`:2867–2868, `SHOES_MAIN` 2869, `ACC_MAIN` 2870; `plDyeList(L, from, mains, dye, allMain)` 2872 matches part colour `c` **by exact hex string** (first main → dye, other mains → `mixHex(dye, ink, .28)`); `plDyeable(cat, id)` 2879 = "has an entry in a *_MAIN table"; `setPlayerDyes(map)` 2880; legacy `setPlayerDye(hex)` 2886.
- Dye colours (app): `DYES` `app`:5050 = `red 빨강 #c8323a, yellow 노랑 #e8a93a, green 초록 #4fa868, blue 파랑 #4a86d8, purple 보라 #9a5cc8, pink 분홍 #f07aa8`; dyeable categories `DYE_CATS = ['outfit','shoes','acc']` `app`:5052.
- Some accessory colours depend on hair colour (`beret` 2750, `catears` 2753); twin/pony hair ties are hard-coded `PLC.red` (2732, 2741).

### 1.4 What is saved where
- `S.settings.player` = `{ hair, bangs, hairColor, skin, eyes, eyeColor, nose, mouth, cheek, outfit, shoes, acc }` ids (`defaults()` `app`:279; `normalize()` `app`:419 runs `normalizePlayer`).
- `S.user.dyed = { outfit: { id: '#hex' }, shoes: {…}, acc: {…} }` (`userState()` `app`:5057–5058). Legacy mirror `S.user.dye` (colour of the outfit worn now) + `S.user.dyeFor` (that outfit id): `dyeMirror()` `app`:5236 runs inside every `save()` (`app`:314), `dyeAdopt()` `app`:5242 runs after every read (boot 5447, `load()` mirror path 344, `adoptRemote` 2116, `importJSON` 3797), `applyDye()` `app`:5250 pushes to the scene.
- `S.user.dyes = { colourId: n }` owned dye bottles; `S.user.sets = { setId: 'YYYY-MM-DD' }` found outfit sets (`setsFound()` `app`:5263).
- `S.settings.octWear` / `S.settings.giftN` = octopus costume state / number of offers (`app`:3357, 3381).

### 1.5 The look sheet (`#look-sheet`, index.html:379–384)
- Open: settings › `#set-look-open` → `openLook()` `app`:3623 (also `questMark('look')`). Render: `renderLook()` `app`:3596, tabs `LOOK_TABS` `app`:3482–3489 (six: 머리 hair+bangs+hairColor · 눈 eyes+eyeColor · 얼굴 skin+nose+mouth+cheek · 옷 · 신발 · 장식; each `secs` row = `[category, section label, shot frame]`), items `lookRenderItems()` `app`:3550–3576, pick `lookPick(cat, id)` `app`:3542.
- **Listing is ungated**: `P[cat].forEach(...)` (`app`:3560) draws every catalogue item; there is no owned/locked concept anywhere.
- Colour categories render as `.preset.pl-color` circles; the others as `.look-tile` with a 32×32 `canvas.look-thumb` + `.look-name`. Names of 4 syllables need a break point in `LOOK_WBR` `app`:3507 or they split mid-word.
- Thumbnails: `lookQueueThumbs()` 3531 → `lookThumbStep()` 3515: `scene.playerShot({ look: { [cat]: id }, frame, shared: true })` = "my current character with only that one part changed", budget 6 ms per frame; all visible tiles are redrawn after each pick. Stage: `lookDrawStage()` 3509, 64×96 canvas, `frame: 'full' | 'back'`.
- Scene side: `playerPortrait(o)` `s3d`:3364 (64×64, front view, framing `PPORT` 3069), `playerShot(o)` `s3d`:3400 with frames `PSHOT.frames` `s3d`:3376 (`full`/`back` 64×96, `head`/`hair`/`face`/`body`/`feet` 32×32), `plWithLook(look, fn)` 3384 swaps geometry temporarily; cache of 200 shots keyed by look+frame+octopus colour+palette+bg.
- Settings row: `renderPlayerParts(frag)` `app`:3458–3477 (h3 `내 모습`, `canvas#set-pl-port` 64×64 shown at 96 px, sr-only `#set-look-sum` = `lookSummary()` 3496, button `#set-look-open`); `LOOK.onChange` redraws it when the sheet closes (`app`:4921).
- 2D: no canvases, text tiles, note `2D 장면엔 미리보기가 없어. 고른 건 저장돼.` (`app`:3555).

### 1.6 Why it reads as a girl today
1. Default look = `bob` + navy A-line `dress` (white collar, ribbon knot) + red `ribbon` (`PLAYER_DEFAULT` `s3d`:334); the code also assumes it: `wornOf('outfit')` falls back to `'dress'` (`app`:5232), set `attic` = dress/flat/ribbon (`app`:5260), the loft mannequin wears the dress (`btn-sew-doll`, `app`:4254).
2. Hair: five of six styles are long or tied (`bob` 2719 chin-length bell, `long` 2726, `twin` 2730 with red bobbles, `pony` 2737 with red tie, `wave` 2742); only `short` 2722 is short. No cropped, side-part-short, or undercut shapes.
3. Outfits: five of nine include a skirt or flare built into `torso` — `dress`, `knit` (flared grey skirt, 2806), `hanbok` (chima), `uniform` (check skirt), `raincoat` (flared trapezoid). Trousers exist only as a leg colour on `hoodie`, `overall`, `varsity`, `flannel` (`leg`/`legR`, 2811–2846). Top and bottom cannot be mixed: one `outfit` id owns torso + sleeves + leg colour.
4. Body: one silhouette for everyone — A-line torso `Cyl(0.20, 0.245, 0.32)` (PLAYER_PARTS.md §1), puff sleeves (`plPuff` `s3d`:2689) on dress/overall/hanbok, no neck, no body category.
5. Face: all six eye styles are "cute bean" drawings; brows were removed (PLAYER_PARTS.md §0.4); accessories are ribbon/beret/cat ears/straw hat/round glasses.

### 1.7 Steps to add things
**(a) New hair style**
1. Add `{ id, name }` to `PLAYER_PARTS.hair` (`s3d`:322) and to `PLAYER_FALLBACK.hair` (`app`:235).
2. Add `PL_PARTS.hair.<id> = function (L, cfg, hex) { … }` next to `s3d`:2719–2746. Push parts `{ g: geometry, m: Matrix, c: hex }` into `L`. Reuse `PL_PARTS.hair._cap(L, hex)` (top shell + chosen bangs + crown pole), `Sph(PL_HR, …)` shell slices centred with `HM()`, `plLock(L, a, b, r0, r1, hex)` strands, `plHem(L, y, rt, rb, h, hex, zs)` back hem, `plHP(phi, theta, R)` points on the hair sphere, `plHairDk(hex)` darker under-layer. Bangs come from the separate `bangs` category via `_fringe` — call `_cap` or `_fringe` yourself (as `short` does).
3. Name ≤ 3 syllables or add it to `LOOK_WBR` (`app`:3507).
4. Tests: `smoke`:1228 pins the 2D hair tab at `tiles === 11` (6 hair + 5 bangs) → update. `tools/player-shots.js`:86 (evidence tool, not in `npm test`) wants 3–6 items per category — it is already stale for `outfit` (9).

**(b) New outfit (today's single `outfit` category)**
1. `PLAYER_PARTS.outfit` (`s3d`:331) + `PLAYER_FALLBACK.outfit` (`app`:245).
2. `PL_PARTS.outfit.<id> = { torso: function (L) {…}, arm: function (L) {…}, leg: '#hex', legR: [rTop, rBottom] (optional, default [0.07, 0.068]), cuff: true (optional) }` (`s3d`:2799–2850). Sleeves: `plSleeve(L, hex, cuffHex)` long, or `plPuff(L, hex)` + `plArmTube(L, PLC.skin, -0.05, -0.185)` short. The hand is added for you (`plArmParts` 2893).
3. `OUTFIT_MAIN.<id> = [mainHex, secondHex]` (`s3d`:2867–2868) using the *same literal hex strings* as the parts, or the item cannot be dyed (`plDyeable`).
4. Optional set row in `LOOK_SETS` (`app`:5260–5262; tuple `[id, name, outfit, shoes, acc]`).
5. **Splitting into top + bottom** is a category change, touch all of: `PLAYER_PARTS` + `PLAYER_DEFAULT` (`s3d`:321–334; the scene normaliser only knows keys of `PLAYER_DEFAULT`), `PLAYER_CATS` / `PLAYER_FALLBACK` / `PLAYER_FALLBACK_DEFAULT` (`app`:233–248), `LOOK_TABS` (`app`:3482), `plTorsoParts` / `plArmParts` / `plLegParts` (`s3d`:2892–2898: top → upper torso + sleeves, bottom → lower torso/skirt + `leg`/`legR`/`cuff`), dye plumbing (`PL_DYES` keys `s3d`:2867, `setPlayerDyes` `next` 2881, `DYE_CATS` `app`:5052, `u.dyed[c]` 5058, `dyeMirror`/`dyeAdopt`/`wornOf` which are outfit-only `app`:5232–5255), `LOOK_SETS` + `setsCheck()` `app`:5264 + the regex `/^(outfit|shoes|acc)$/` in `lookPick` (`app`:3548), `lookSummary()` keys (`app`:3498), `smoke`:2386 (`PARTS_CATS`, `LOOK_PARTS`), and a migration mapping each old `outfit` id to a top/bottom pair (old saves and old-build tabs still write `outfit`).

**(c) New eye style**
1. `PLAYER_PARTS.eyes` (`s3d`:325) + `PLAYER_FALLBACK.eyes` (`app`:238).
2. `PL_PARTS.eyes.<id> = [rows2x2, rows4x4, rows8x8]` (`s3d`:2757–2787) — three dot drawings, one per LOD (`PL_ATLAS.lod = [[2,2],[4,4],[8,8]]` `s3d`:2636). Symbols (`plEyePal` `s3d`:2639): `.` skin · `I` iris · `H` lighter iris · `*` sparkle dot (eye colour brightened, never white) · `P` pupil · `S`/`K` iris shade · `D` dark dot/arc · `L` lid line. Unknown symbol = skin.
3. Eye *size and position* are global, not per style: `PL_EYE` `s3d`:2598 (4×4 px at 1×, centre x ±4 px, y 0.93) and the patch geometry `plEyePatch` 2620. A new *shape* must be drawn inside the 4×4 / 8×8 cell; a different footprint (wider, taller) needs per-style patch size plus atlas cell changes (`plEyeUV` 2667, `plDrawEyes` 2650).
4. If the style hides the iris colour, add it to `lookEyeNote()` (`app`:3501). Blink reuses `PL_PARTS.eyes.closed` (2781).

**(d) Second body shape** (nothing exists; this is the plan the code allows)
1. New category, e.g. `body: [{ id:'a', name:… }, { id:'b', name:… }]`, in every list named in (b)5 first paragraph (catalogue, default, cats, fallback, `LOOK_TABS`, `smoke` strings).
2. Torso geometry lives inside each outfit's `torso(L)` and receives no `cfg` (`plTorsoParts` `s3d`:2892 calls `.torso(L)`). Pass `cfg` through and route the shared trunk through one helper (radii top/bottom, shoulder width) so nine outfits do not each fork.
3. Limb anchors are fixed at mesh creation: shoulders `(±0.24, 0.50)`, hips `(±0.115, 0.24)` (`plArmL … plLegR` `s3d`:2905). `setPlayer` must set `position.x` per body; walking uses `PL_LEG`, `PL_ARM`, `PL_SWAY` (`s3d`:2583).
4. Keep: 7 meshes, no new material, total width ≤ 0.66 m (door 0.72), height constants `PL_H` etc. Shot cache keys include the whole look, so a new key is picked up automatically.

### 1.8 Constraints from docs/PLAYER_PARTS.md that new parts must obey
- Scale: 27 px per metre at 1×; character 33 px tall (`PL_H` 1.22; hair silhouette 1.28; **hat top ≤ 1.38**; door 1.68), head r 0.35 centre y 0.87 (57 % of height), torso y 0.24–0.56 (8 px visible), total width with arms 0.66 = 18 px (§1).
- **Nothing smaller than 6 cm** except intended 1 px dots/lines (buttons, glasses rim, sleeve band) (`s3d`:2568).
- **No ink line between parts**: the depth outline only appears at ≥ 0.28 m depth difference, so every edge between face/hair/clothes must come from *different palette cells* — pick colours by where they land under the fill light, not by hex distance (doc lines 9–11).
- Hair: every piece is a thin shell slice of radius `PL_HR` 0.38 around `PL_HC`; no spheres stacked on the skull (spheres only for knots, strand tips, curls); the front window of 104° (phi 38–142°) stays open so side hair does not cover the eyes and 2 px of cheek skin remain; bang ends must not cover the eye top line (theta ≤ 1.22, `s3d`:2698); back masses must be **closed** solids (material is FrontSide; `DoubleSide` is forbidden, §4).
- Face: features are texture patches on the head surface, never geometry (11-09 "face surgery"); eye 4×4 px at 1×, **width = height**, corner texels skin, **no white anywhere in the eye** (no sclera, no white glint — owner 11-10), no light ring around the pupil; nose/mouth/cheek art widths must be even numbers of px; mouth rows 13–12 only (row 11 merges with the chin shadow); eye centres on integer px.
- Budget (§4): mesh count stays 7 + decal; `setPlayer` swaps geometry and disposes the old one; **no new shader program** (boot count 30 is asserted by `tools/test-scene-perf.js`), `toonEye.map` must never be null; texture count constant (one 64×64 atlas redrawn).
- Shoes: width ≤ 0.16 so the gap between shoes stays 0.07 (2 px) (`s3d`:2851).
- Portrait framing: front view, half-width 0.525 m, target y 0.95 — hats and ears must stay inside (`PPORT` `s3d`:3069).
- UI contract (§3): `setPlayer(cfg)` returns the normalised cfg; unknown ids fall back; names are chip text of about 4 Korean characters; no emoji.

---

## 2. Ownership today

- **Everything is wearable from the first second.** No `owned`, `unlock`, `wardrobe` or price exists for player parts; `lookRenderItems` lists the whole catalogue and `setPlayerPart` accepts any known id.
- Things that *are* gated today (for reference, none are clothes): octopus award costumes need a weekly runner rank (`giftAwards()` `app`:3355 reads localStorage `ppolppol_runner`, `giftList()` 3356); garden plots 4–6 open at 7 / 15 / 30 days in `S.octopus.days` (`GARDEN_AT` `app`:5047, `gardenOpen()` 5048); the `문어 색` settings row appears only after the mirror exists (`colorRows` `app`:3207–3209); loft, furniture and sewing machine exist only in 3D (`questCan` `app`:5094). I found no lantern/progress gate on the loft stair in `app` (scene side not checked).
- The set book (`LOOK_SETS` `app`:5260, `setsCheck()` 5264, `renderSets()` 5274, toast `세트 도감에 적었어: …` 3548) only *records* matching outfit+shoes+acc; it gives no reward and locks nothing. `setWear(q)` 5272 re-wears a found set through `setPlayerPart`.
- The old paper design (docs/PLAYER_PROGRESSION.md §4.1, §4.2, §9.1: `player.owned`, `ledger`, daily pocket cap 30, 26 shop items, "skin is never sold") was **not built**; the real wallet is the integer `S.user.shells`.

### What a clothes shop has to add
1. **Owned list**: put it in `S.user` (e.g. `S.user.owned = { outfit: [...], shoes: [...], acc: [...], hair: [...] }`), initialised in `userState()` `app`:5053. `S.user` is created lazily (not in `defaults()` `app`:267), survives `normalize()` (it returns the same object and never touches `s.user`, `app`:378–421), is exported/imported whole (`exportJSON` `app`:3779, `importJSON` 3789) and vanishes on `resetAll()` (`S = defaults()` `app`:3829).
2. **Base items are always owned**: decide ownership by rule (`isOwned(cat, id) = BASE[cat].includes(id) || owned[cat].includes(id)`), not by copying base ids into the save.
3. **Migration (nothing a player wears may disappear)**: the safe rule is "every id that exists in today's catalogue (section 1.2) is base for everyone; only new ids are shop stock". If any existing id becomes paid, then on first run grant: all ids in `S.settings.player`, every key in `S.user.dyed.*`, and the three parts of every set in `S.user.sets`. Do it once inside `userState()` behind a flag, before the first `save()`.
4. **Choke point**: `setPlayerPart()` `app`:1142 is the only writer of `S.settings.player` (look sheet, `setWear`, tests through `APP.setPlayerPart`). Check ownership there. Do **not** put the ownership test into `normalizePlayer` — it runs on every load and would silently reset the look.
5. **Look sheet**: in `lookRenderItems()` `app`:3560 either filter or draw a locked tile (`.look-tile` + `aria-disabled` + `shellAmt(price)` badge). Thumbnails already render any item on the current character without wearing it (`playerShot({ look })`), so a "try on" preview in the shop is free.
6. **Sewing sheet**: `dyeItems(cat)` `app`:5298 lists every dyeable catalogue item, worn or not → filter by owned, or players dye clothes they do not have.
7. **Two tabs / old builds**: `adoptRemote()` `app`:2106 replaces the whole state with the other tab's (`S = R`), merging only salon asks (`SAL.merge` 2111) and meals (`MEALR.merge` 2113). A purchase can be undone by a stale tab saving later (true for shells and dyes today as well). For `owned`, add a union merge when `same` (same `S.octopus.born`), following the `mineMeals` pattern (`app`:4272). An old-build tab does not know new part ids: its `normalizePlayer` resets them to defaults and saves that back — ownership must not depend on "currently worn".
8. Expose test handles in the `[7-S]` API slot (Appendix A).

---

## 3. Economy

### 3.1 State
`S.user = { shells, seeds, dyes: { colour: n }, dyed, dye, dyeFor, days: [date keys the app was opened], giftDay, giftTell, garden: [plot|null ×6], plotTold, earned: [last 50 play ids], week: { key, q: [{id,n,rr,seen?}]×7, claimed, prev?, kept?, keptIds? }, sets, table/meals (js/meal.js) }` — comment `app`:5044, guard/repair `userState()` `app`:5053–5065. `shells` and `seeds` are clamped to non-negative 32-bit ints (5055); there is **no ledger and no upper cap**.

### 3.2 Sources and sinks

| Currency | Event | Amount | Limit | Code |
|---|---|---|---|---|
| shells + | Daily gift (first open of a calendar day; also the 60 s tick and tab-visible) | +3 | once per `todayKey()` (`u.giftDay`) | `dailyGift()` `app`:5073–5080 |
| shells + | Every 5th *opened day* (`u.days.length % 5 === 0`) | +10 extra | same call | `app`:5076–5077 |
| shells + | Attic runner, per finished run | `clamp(2 + floor(score / 150), 2, 8)` → 2 at 0–149 … 8 at ≥ 900 | **no daily cap**; one payout per run id `runner_<runs>_<day>` | `earnFromPlay(r, o)` `app`:5066–5072, called from `js/runner.js`:571 |
| shells + | Weekly gift (5 of 7 weekly tasks) | +12 | once per Monday-week; if five tasks were done but the gift was not collected it is credited at the week change | `WEEK_GIFT` `app`:5090, `weekClaim()` 5175, rollover `weekState()` 5135 |
| shells − | Buy one dye bottle at the sewing machine | −6 | needs confirm | `DYE_COST` `app`:5294, `sewDo` 5309–5311 |
| seeds + | Daily gift | +1 | once per day | `app`:5077 |
| seeds + | Weekly gift | +2 | weekly | `app`:5090 |
| seeds − | Plant in an empty plot | −1 | plots open: 3, +1 at 7/15/30 octopus days | `gardenAct(i)` `app`:5223–5230 |
| dye + | Harvest a bloomed flower (colour fixed by seed at planting; water twice, once per plot per day) | +1 of that colour | ≥ 2 calendar days per flower | `gardenAct` 5227 |
| dye + | Buy | +1 | 6 shells | `sewDo` 5311 |
| dye − | Dye one item (outfit / shoes / acc) | −1 | "back to original" is free, no refund | `sewDo` 5312–5317 |

Not sources: octopus walks, gift-box offers, the cook game and the table give no shells (comment `app`:5039; `questMark('gift')` was removed on purpose, `app`:3381).

### 3.3 Typical income
- Opening the app only: 3/day + 10 every fifth opened day = **5/day average**.
- Plus the weekly gift when five tasks are done: +12/week ≈ **+1.7/day**.
- Plus runs: 2–8 each. Three runs at assumed scores of 150–599 (3–5 shells each; the real score spread was not measured) ≈ **+9 to +15/day**.
- So an active player earns roughly **15–22 shells/day (about 110–150 a week)**; a player who grinds the runner is unbounded (8 per run at score ≥ 900). Today's only sink is 6 per dye, so long-time players may already hold large balances — price the shop with that in mind or add a per-day earning cap to the runner.

### 3.4 Where prices are defined
Only three places: `DYE_COST = 6` (`app`:5294), `WEEK_GIFT = { shells: 12, seeds: 2 }` (`app`:5090), and the literals in `dailyGift` (5076–5077) and `earnFromPlay` (5068). There is no price table; a shop should add one constant table (id → price) in its own rule file or lane slot.

### 3.5 Confirm-before-spending pattern (reuse it; owner complaint 11-18 at `app`:5289–5293)
1. Tap on an item → `sewDye(id, btn)` `app`:5321 spends nothing; it sets `sewAsk = { kind: 'buy' | 'dye' | 'undo', color }` and `sewAskAt = performance.now()`, then re-renders.
2. Not enough shells → no question: `furnShake(el)` (`app`:3895) on the price badge + toast built from `shellAmt(miss)` with an sr-only sentence (`app`:5325).
3. `renderSew()` `app`:5328 draws the question **in place of the grid** (`div.sew-ask[role=group]`, line `p#sew-ask-line`, buttons in the order `그만` (`.sew-no`) then `살래` / `물들일래` / `돌릴래` (`.sew-yes`), both `aria-describedby="sew-ask-line"`); focus goes to the first button = `그만` (`sewFocus('#sew-body .sew-ask', 0)`).
4. Double-tap guard: `sewEarly(e)` `app`:5367 ignores pointer clicks within `SHEET_SETTLE` (600 ms, `app`:1681) of the question appearing; keyboard activations (`e.isTrusted && e.detail === 0`) are exempt. Time source `tapTime(e)` `app`:1682.
5. Yes → `sewDo(ask)` `app`:5307 **re-checks the balance**, mutates, `save()`, `renderSew()`, `renderBagChip()`, `toast(...)`, restores focus.
6. Opening the sheet clears any pending question (`openSew()` `app`:5401).
Helpers to reuse: `shellAmt(n, cls)` `app`:106 (shell picture + number, sr-only `조개 `), `eulReul(w)` / `euro(w)` particles `app`:5296–5297, `partName(cat, id)` 5270, `renderBagChip()` 5205 (updates the `#btn-bag` tag and its aria-label).

---

## 4. UI building blocks for a new sheet

- **Markup** (copy `#bag-sheet`, index.html:360–365; put yours in your lane's dialog slot, Appendix A):
  `<dialog id="shop-sheet" class="sheet bag-sheet" aria-labelledby="shop-h"><div class="handle" aria-hidden="true"></div><h2 id="shop-h" class="set-h dlg-top" tabindex="-1">…</h2><div id="shop-body"></div><button type="button" class="btn wide pressable" id="shop-close">닫기</button></dialog>`
- **Open**: `showDialog(dlg)` `app`:3089 — stores `dlg._opener`, `showModal()`, moves focus to `.dlg-top` (so the heading is read first and the sheet opens at the top), resets `scrollTop`, lifts a visible toast into the dialog.
- **Close**: close button; backdrop tap via `clickedOutside(d, e)` `app`:3103; Esc natively. `bindDialogs()` `app`:3108 adds `closedby="any"` and bookkeeping only for the ids in its list (`poster-dialog, settings-sheet, album-sheet, look-sheet, log-sheet, salon-sheet, name-dialog`); bag and sew sheets bind themselves in `bagInit()` `app`:5435–5437 — do the same. Optional drag-to-close: `sheetDragReset(d)` `app`:3663 and `d._openedAt` (see `openSettings` 3630).
- **Sound comes free**: any `dialog.sheet` whose `open` attribute changes plays sheet_open/sheet_close (`js/audio.js`:1381, 1404). Keep the class `sheet`.
- **After a re-render keep keyboard focus**: `focusIn(sel, i)` `app`:5182, `sewFocus(sel, i)` 5295.
- **Element helper**: `h(tag, attrs, children)` `app`:76 (`class`, `text`, `html`, `on…`, other attrs; null children skipped).
- **Pictures**: `ico(path, cls)` `app`:92 → `UIART.icon` (16×16 PNG from `assets/icons/<path>.png`, folders `app ctl dish log look memory souvenir`; removed silently if it fails to load) · `icoH(path)` 107 for HTML strings · `pxIco('check' | 'box' | 'swap')` `app`:99 (12×12 grid → 24 CSS px, `currentColor`; add paths to `PX_ICO` 94) · `<img data-icon="souvenir/shell">` in static HTML is filled by `fillIcons()` (`js/ui-art.js`:323).
- **UIART API** (`js/ui-art.js`:345–346): `snapLeft, onRow, onBubble, onState, onInspect, fx, bubbleSkin, syncLog, syncRecent, avoidCtl, topBand, ctlYield, liftY, iconSrc, icon, iconHTML, iconBad`. `UIART.snapLeft(el)` aligns a text start to a device pixel (used by `toastSnap` `app`:193 and `snapBagN` 5424).
- **Chips and rows** (existing classes): `.filters` group + `.fchip` (+ `.on`), selection via `chipOn(b, on)` `app`:152 (class `on` + `aria-pressed`); `.btn.sm.pressable`, `.btn.wide.pressable`, `.btn-row`; `.set-note` small note; `.bag-line` wallet line; `.week-list > .week-row > .week-txt + .week-n` list rows; `.preset` colour circle; `.sr-only`, `.nobr`; collapsible `details.sew-sets > summary` (`css`:1685–1690).
- **Toast**: `toast(msg)` or `toast([text, node, …])` `app`:183 — one at a time, 2.5 s, `aria-live=polite`.
- **Text sizes**: pixel-font sizes come from `js/fs-snap.js` (CSS variables `--fs-m16, --fs-b20, --fs-u20, --fs-u24, --fs-n16, --fs-u12, --fs-h20, --fs-b20f, --fs-u24f, --bub-fs`; `window.PPOL_FS_SNAP(grid, want, dpr, up)`), each snapped so one font dot = a whole number of device pixels. Write `font-size: var(--fs-b20, 20px)`, never a raw px size, under `:root[data-font="pixel"]`. Floors pinned by `smoke` "A-글자" 534–552: `#set-body h3` 20, `.snd-val` 16, `#bag-sheet h3` 20, `.week-n` 16, `.sew-sets > summary` 20 (CSS px, at dpr 2 and 2.625).
- **"Pictures first, few words"** (docs/OWNER_DECISIONS.md:181 — 살림 · 재봉틀 · 설정 "전부 그림으로": shell picture + number, check, empty box, swap picture + number, short notes; sizes unchanged) and **no emoji or decorative glyphs in player-facing text** (docs/UI_ART.md §"이모지 없음", checked by `smoke` scenario U 4482 and the settings-row check at `smoke`:2392). Every picture-only control needs an `aria-label` or an sr-only text.
- **Minimal example** (shape of `renderBag` `app`:5402–5423 and `bagInit` 5425–5437):
```js
function renderShop() {
  var body = $('shop-body'); if (!body) return; var u = userState(), frag = document.createDocumentFragment();
  frag.appendChild(h('p', { class: 'bag-line' }, [shellAmt(u.shells)]));
  frag.appendChild(h('h3', { text: '오늘 들어온 옷' }));
  var row = h('div', { class: 'filters', role: 'group', 'aria-label': '오늘 들어온 옷' });
  stockToday().forEach(function (it) {
    var b = h('button', { type: 'button', class: 'fchip' }, [h('span', { text: it.name }), shellAmt(it.price)]);
    b.addEventListener('click', function () { shopAsk(it, b); });   // ask first, spend in the confirm handler (section 3.5)
    row.appendChild(b);
  });
  frag.appendChild(row);
  body.textContent = ''; body.appendChild(frag);
}
function openShop() { renderShop(); showDialog($('shop-sheet')); }
// once, at init: $('shop-close').addEventListener('click', function () { $('shop-sheet').close(); });
//                $('shop-sheet').addEventListener('click', function (e) { if (clickedOutside(e.currentTarget, e)) e.currentTarget.close(); });
```
`renderAll()` (`app`:3043) re-renders open bag/sew sheets after imports, resets and other-tab saves — add your sheet there or it shows stale balances.

---

## 5. Settings sheet

`openSettings()` `app`:3630 → `renderSettings()` `app`:3408–3455 rebuilds `#set-body` (index.html:348–354) from scratch on every open. Sections in order:

| # | Heading (`h3` text) | Builder | Main ids |
|---|---|---|---|
| 1 | `문어 선물 상자` | `renderGift(frag)` `app`:3390–3407 | `.filters.gift-chips`, `#gift-go` 내밀기, `#gift-off` |
| 2 | `문어 색` (`#set-color-h`) — only once the mirror exists (lantern ≥ 2) or in explicit dev mode | `colorRows(frag)` `app`:3207 | `#set-color` |
| 3 | `내 모습` (inside `div.set-parts-h`) | `renderPlayerParts(frag)` `app`:3458 | `#set-pl-port`, `#set-look-sum`, `#set-look-open` |
| 4 | `소리` (`#rs-sound`) | `AUDIO.on('room_sheet', { frag })` `app`:3414 → `roomSheet(frag)` `js/audio.js`:1372 | `#set-sound-row`, `#set-sound`, `#set-music`, `#set-sfx` |
| 5 | `화면` | inline `app`:3415–3428 | `#set-motion`, `#set-haptics` (only if supported), `#set-pixel`, `#set-thumbs` |
| 6 | `내 Claude 와 연결` | `claudeSection(frag)` `app`:3240 | `#set-claude-make` … |
| 7 | `기록` | inline `app`:3432–3443 | `#set-stats` (`statsLine()` 3231), `#set-export`, `#set-import`, `#set-reset` |
| 8 | `누가 고르나` (`#set-who-h`) | inline `app`:3444–3445 | `#set-who` = `WHO_LINE` `app`:3203 |
| 9 | `팔레트` (dev only) | `paletteChips('set-pal')` `app`:519 | |
| — | link `만든 것들` | `app`:3452 | `#set-credits` |

### Making sections collapsible, two open by default (gift box and my look)
- Precedent: `details.sew-sets` with remembered state `sewSetsOpen` (`app`:5273–5279, re-read before each re-render at 5330, reset when the sheet opens 5401; styles `css`:1685–1690, pixel-font summary size checked at `smoke`:550).
- Suggested shape that keeps existing selectors alive: `<details class="set-sec" data-sec="gift" open><summary><h3>…</h3></summary>…</details>` — `#set-body h3` queries (`smoke`:544, 2376, 2388, 2668) keep working and the heading order stays the same.
- The sheet is rebuilt on every open and several controls re-render it, so keep the open/closed state in a module variable (per section key) exactly like `sewSetsOpen`; default `{ gift: true, look: true }`, everything else closed.
- The sound section is built by `js/audio.js` (`roomSheet` appends its own `h3#rs-sound` and rows into the `frag` you pass; the checkbox is named by `aria-labelledby="rs-sound set-sound-lbl"`). Pass a temporary fragment and move the nodes into your `<details>`, keeping the id `rs-sound`.
- **What breaks when a section starts closed**: Playwright only clicks visible elements, and closed `<details>` content is not visible. Controls used by tests inside would-be-closed sections: `#set-sound` (`tools/test-audio.js` 25 uses, `smoke` 2, `tools/test-export.js` 1), `#set-music` (test-audio 7, smoke 2), `#set-sfx`, `#set-motion` (smoke 4), `#set-pixel`, `#set-thumbs`, `#set-export`, `#set-import` (smoke 2), `#set-reset` (smoke 5), `#set-claude*` (smoke 2), `#set-credits` (test-export 1). Tests that read `textContent` (`smoke`:385, 1463) still see closed content; tests that read `innerText` (`smoke`:2376 `text`) do not.
- Content assertions to keep true: `hs.indexOf('내 모습') === 1` before the mirror (`smoke`:2382); `문어 색` comes before `내 모습` after the mirror (`smoke`:2669); `#set-stats` = `산책 N · 함께한 날 N · 읽음 N` (`smoke`:387); `#set-who` exact sentence (`smoke`:2996) and no `MCP` (`smoke`:1464, 2657); focus lands on `#set-h` on open (`smoke`:2657); the my-look row: summary text, `aria-haspopup=dialog`, button height ≥ 32 px, portrait 64 px pixelated, no emoji (`smoke`:2388–2399); closing the look sheet returns focus to `#set-look-open` (`smoke`:1235, 2532, 2631); gift chips/`#gift-go` (smoke scenario Q 5482).

---

## 6. Status row

### 6.1 Room title today
- Text: `roomTitle(lv)` `app`:155 — lantern 0–1 `불씨 하나 켜진 다락`, 2–4 `등불 켜진 다락`, 5–7 `살림이 생긴 다락`, 8 `문어의 다락`.
- Visible row: `renderStatus(bloom)` `app`:2813–2829 writes it into `span#room-title.room-title` (index.html:233, inside `#status .srow .who` after `#oct-name` and `button#brain-tag`); the lantern button `#pips` is index.html:234.
- Document title: `renderScene()` `app`:764 → `<octopus name> · <room title> · 뽈뽈 문어`.
- Screen-reader / hidden fallback: when CSS hides the title, `hiddenRoomTitle()` `app`:4784 feeds `pipsHead()` `app`:4778, which becomes the first line of the lantern tooltip (`bindTip` 4786).
- CSS: `.room-title` `css`:233–234 (`::before` draws the `·` separator), 238; pixel theme 589–590; one-screen layout 1564 (`order: 4; flex: 0 1000 auto`).
- **Widths where it is hidden**: `@media (max-width: 419px) { #status .room-title { display: none } }` `css`:962, and in the one-screen 3D layout (`html[data-layout="one"]`, the default — set at index.html:82) `@media (max-width: 439px)` `css`:1566. So on 360 and 412 px phones the room title is already invisible; it is seen only on wide screens, in the tooltip, and in the tab title.
- Also hidden by width in the one-screen layout: `.pips-lbl` ≤ 469 px (`css`:1567), `.pips-n` ≤ 499 px (1568); order there is name 1 · pips 2 · 데모 tag 3 · room title 4 (`css`:1560–1564). Space is tight: at 360 px the bar holds a 4-character pixel-font name 80 + tag 23 + lantern cells 94 inside 224 px (`css`:1450).
- Tests: `smoke`:1195 (2D, lantern 0 title string), `smoke`:1368–1369 (`#room-title` text + no `어두운/꺼진` in scene description and document title), `smoke` scenario S lantern tooltip (`tipNow` 2688), scenario L "좁은 폭 이름" 1448 (name truncation), scenario U 4384 (emoji scan includes `document.title`), scenario O 5285 (one-screen layout). Owner's wording for the change: remove the `불씨 하나 켜진 다락` text after the name and lantern cells (wip/round7/README.md:42).

### 6.2 Day counter
- There is **no "day N since arrival" value computed today**. Raw material:
  - `S.octopus.born` — ms timestamp set when the octopus is named (`app`:4970; v1 migration 430; `null` before naming).
  - `S.user.days` — date keys of days the app was opened; `S.user.days.length` is what the player already sees as `들어온 날 N일` (bag line `app`:5405) and `들어온 날 N일째` (gift toast `app`:5149). It never drops and does not punish breaks (the owner's no-streak rule, `app`:5040).
  - `S.octopus.days` — days with an invite; shown as `함께한 날 N` (`statsLine` `app`:3233) and used for garden plots.
- `D+N` by calendar: `Math.round((new Date(todayKey().replace(/-/g, '/')) - new Date(dateKey(new Date(S.octopus.born)).replace(/-/g, '/'))) / 86400000) + 1` — use `todayKey()` (`app`:165), not `new Date()`, so the test hook moves it. `D+N` by opened days: `userState().days.length` (0 until the first `dailyGift`, which runs 2.5 s after boot and needs a name, `app`:5438).
- Where to show it: replace the text written at `app`:2827 (and decide what `document.title` and `pipsHead()` say). It must be visible on phones, so it cannot keep the `.room-title` hide rules (`css`:962, 1566). Refresh points: `renderStatus` is called from `renderAll` and boot only — also call it from `checkDay()` (`app`:2502) / `dailyGift()` (5073) so an open tab updates at midnight.

---

## 7. Stickers

### 7.1 Runner reaction stickers
- Engine `PPOL_STICKERS` = `js/cook-stickers.js`; runner catalogue `RUNNER_STICKERS` = `js/play-stickers.js` (9 stickers: dash, hop, duck, phew, moss, fire, trophy, bonk, again; art `assets/stickers/runner/*.png`, 32×32 source, some with 2-frame `_anim` strips).
- **Not wired into the game yet**: `index.html` loads neither `js/cook-stickers.js`, `js/play-stickers.js` nor `css/cook-stickers.css` (only `cook.html`:25, 63 do), `js/runner.js` has no sticker call, and `tools/export-site.js`:52 lists `js/play-stickers.js` as "not loaded by any page". To show them: load the CSS + both scripts in `index.html` and call `RUNNER_STICKERS.watch()` once (it polls `RUNNER.live()` and mounts on `#runner-dlg .rn-stage`).
- **Size decision**: `api.mount(st, { scale: 2 })` `js/play-stickers.js`:94 → `show()` in `js/cook-stickers.js`:154–159: `scale = opts.scale || (host.clientWidth < 420 ? 2 : 3)`, `size = Math.round(32 * scale * dpr) / dpr` CSS px (inline width/height; `css/cook-stickers.css` sets no size, only position/animation, `image-rendering: pixelated`). Slots: two top corners, `SLOTS` `js/play-stickers.js`:52 (`top: -44px`, `left/right: -8px`).
- **Current size (computed from the code, not measured)**: 360×740 @2 → 64 CSS px = 128 device px (4 device px per art px). 412×915 @2.625 → 64 CSS px = 168 device px (5.25 per art px — not a whole number, so art pixels are uneven).
- Device-pixel rule in the engine (`js/cook-stickers.js`:142): scale may be fractional so that one art pixel = n whole device pixels — pass `scale = n / devicePixelRatio`. Example for 2.625: n = 6 → 73.1 CSS px, n = 7 → 85.3 CSS px; for dpr 2: n = 5 → 80, n = 6 → 96.
- Tests: `tools/test-play-stickers.js` (180 ok; rules, determinism, art files — no size pin). The cook stickers' on-screen size and device-pixel alignment are measured in `tools/test-cook-stickers-live.js` (slow suite, real `--force-device-scale-factor=2.625`, see its lines 420–464); nothing pins the runner size because it is not mounted anywhere.

### 7.2 Poster stickers
- One sticker per poster, drawn inside the poster SVG: `posterSVG(trip, w, hgt, opts)` `app`:2576, sticker block `app`:2602–2616. Source = 16×16 icon (`stickerIcon` 2659, `stickerSrc` 2666, preloaded as data URIs by `STICKER_KEYS` 2669).
- **Size rule** (`app`:2606, 2609), in SVG user units: `want = w × 0.2` (notes `× 0.18`); `ss = 16 × max(1, round(want / 16))` when `want ≥ 12`, `8` when `want ≥ 6`, else `want`. When the poster has room art: `ss = 16 × max(1, round(w × 0.107 / 16))`, placed in the right-hand strip, rotation 0. Mini posters that have room art get no sticker at all (`app`:2612).
- Position/tilt come from saved `poster.stickerPos { x, y, rot }`; the tilt sits on the `<image>` not on `g.stk` (asserted `smoke`:4671–4677).
- **Current sizes (computed, pixel theme; ± 1 px)**:

| Where | call | units | 360×740 @2 | 412×915 @2.625 |
|---|---|---|---|---|
| Album card (`.pcard` 108 px, `css`:327) | `posterSVG(t, 108, 144)` `app`:2856 | 16 | 16 CSS px (32 device px) | 16 CSS px (42 device px) |
| Album note card (84 px) | `posterSVG(t, 84, 112)` | 16 | 16 | 16 |
| Poster dialog front, with room art | `posterSVG(t, 300, 400, { noText })` `app`:3060 | 32 | ≈ 31 CSS px | ≈ 36 CSS px |
| Poster dialog front, no room art | same | 64 | ≈ 61 CSS px | ≈ 73 CSS px |
| PNG export | `posterSVG(t, 600, 800)` `app`:3169 | 64 with art / 128 without | file pixels | file pixels |

  The dialog front is scaled by CSS: front height = `min(62dvh, var(--ip-cw) × 4/3)` (`css`:379; `--ip-cw` = `min(100vw − 32px, 760px) − 32px` in the pixel theme, `css`:711) and the dialog content box is 292 / 344 px wide, so the 300-unit SVG is shown at ≈ 0.96× (360) or ≈ 1.13× (412).
- **The "whole-number multiple" rule holds only in SVG units.** Album cards are 1:1 with CSS px (fine at dpr 2, 42 device px at 2.625 = 2.625 per art px); the dialog front is rescaled by a fractional factor, so today's poster sticker is not on the device-pixel grid there. To enlarge honestly, choose `ss` from the *rendered* width and `devicePixelRatio`, or size the front face so that SVG unit = whole device pixels.
- Tests: `smoke`:4671–4677 (structure), 4804–4817 (no broken-image icon when the icon 404s); `tools/test-poster-art.js` (295 ok) covers the room art data, not sticker size. **No test pins the poster sticker size.**

---

## 8. Dialogue

### 8.1 What `js/dialogue-stub.js` provides (117 lines; global `DLG`, defined only if `window.DLG` is missing)
- API (frozen table, docs/DIALOGUE_UI.md:457–474 — names, arguments, return values and meaning may not change; only optional fields may be added; `function.length` is checked): `DLG.init(host, opts{ name(), portrait })`, `DLG.say(line{ voice: 'octopus' | 'house' | 'user', text, by, model, pace: 'wait' | 'flow' })` → Promise resolved when the line is dismissed, `DLG.ask(q{ voice, by, text, choices: [{ id, label }], cancel, chips })` → Promise of id, `DLG.endAsk()`, `DLG.hold(on)`, `DLG.open()` (backlog dialog `#backlog`), `DLG.current()`, `DLG.pending()`, and the word `dlg` in `html[data-ui-busy]`.
- DOM: `#dbox` (`role=group`, `aria-label="대사"`) containing `.dlg-tag` (name tag), `p.dlg-text`, full-box `button.dlg-next`, `.dlg-choices`, `button.dlg-log`. Plain inline-styled box: no art, no typing effect, one page per line. `pace: 'flow'` auto-advances after `1.5 s + 65 ms per character`, clamped 2.5–6 s, ×1.25 for the octopus voice (`readMs`, `js/dialogue-stub.js`:28).
- Host: `#dlg-host` (index.html:241); the app initialises it lazily with `DLG.init(hst, { name: function () { return S.octopus.name || ''; } })` (`app`:741–742), shows/hides with `dlgShow(on)` (`app`:745), and has a dev-only demo `dlgDemo(text, pace)` (`app`:751, exported `APP.dlgDemo`) that says `{ voice: 'octopus', by: 'demo-rules', text, pace }`.
- Test: `node tools/test-dialogue-stub.js` (63 passed; not part of `npm test`).

### 8.2 What is missing for an NPC to say two or three scripted lines
1. **Speaker name**: `tagOf(l)` (`js/dialogue-stub.js`:22–27) prints a tag only for `voice: 'octopus'`, and the name always comes from `nameFn()` = the *player's* octopus. There is no per-line speaker field; an NPC line would be tagged with the player's octopus's name. Needs an optional field (e.g. `who`) honoured by `tagOf`.
2. **"Scripted" label**: `LABEL = { 'demo-rules': '데모 규칙', model: '모델' }` (`js/dialogue-stub.js`:8). Any other `by` is printed raw (`by: 'scripted'` would show the English word). Add a label entry for the scripted source.
3. **Voice fallbacks**: `voice: 'octopus'` without `by` silently becomes `house` (`js/dialogue-stub.js`:91) and loses its tag — always pass `by`.
4. **Sequencing**: nothing built in; chain `await DLG.say(...)` calls. With `pace: 'wait'` each line waits for a tap on `.dlg-next`.
5. **Portrait**: `opts.portrait` is accepted and ignored.
6. **Log row**: lines do not reach the day log by themselves; use `logRow(label, text, cls, animate, expr)` `app`:2229 + `appendLogRow(ensureTodaySection(), row)` `app`:2245 / 2394 if they should be kept.
7. The backlog button text is an emoji (`js/dialogue-stub.js`:47) — the stub is the only place; do not copy it into new UI.

### 8.3 Honesty rules enforced by tests (NPC lines and every new string must pass)
`tools/test-brain.js` `honestDemoSuite` (line 1851) applies `CLAIM_RX` to: every Korean string in `js/world.js` (all keys except `keywords`, `wiki`, `emoji`), **every quoted Korean string literal outside comments in `js/brain.js`, `js/app.js`, `js/salon.js`, `js/play.js`, `js/meal.js`** (`brainSourceStrings` 1821), and the lines of 600 generated demo plans. Allow-lists: `HONEST_OK` (1812, whole-phrase facts such as `좋은 아침`) and `DECISION_OK` (1817, exact decision lines per file). A new rule file is not scanned by this suite until someone adds it to the list at line 1874 — but **any label, toast or menu name written inside `js/app.js` is scanned**.
`CLAIM_RX` (verbatim, `tools/test-brain.js`:1808) and `TAP_BAN` (verbatim, `tools/test-brain.js`:1604, applied to tap-line templates and results):
```js
var CLAIM_RX = /좋아|좋았|좋은|제일 좋|그냥 그런|재밌|재미|싶|궁금|끌렸|끌려|꽂혔|(그걸로|그거면|이만하면|이걸로) 됐|됐다 싶|어도 됐|충분|설레|신나|신났|기뻐|기쁘|기뻤|행복|편안|편해|포근|반가|반갑|심심|외로|그리워|그립|신기|놀랐|맛있|즐거|즐겁|맘대로|마음대로|잘한 것|들썩|일 것 같|설렜|아쉬|아쉽|뿌듯|두근|편했|마음에 들|맘에 들|반했|반하|사랑|그리웠|무서|무섭|싫|슬프|슬펐|슬퍼|부끄|지루|귀찮|고마|고맙|기대돼|기대된|흥미|미안|속상|서운|섭섭|실망|짜증|화났|화가 나|감동|좋겠|원해|바랐|바래|즐겼|신이 나|든든|후련|개운|상쾌|기분|(어|아|여)야 해|(어|아|여)야지|좋|만족|다행|흐뭇|아늑|들떴|들뜬|들뜨|즐기|안심|설렘|외롭|그리움|쓸쓸|짜릿|부러워|부럽|부러웠|(?<!해)바라(?!보|봤|봐|본|볼)|다리가 무거|무거워졌|피곤|지쳤|지쳐|기억나|기억났/;
var TAP_BAN = /좋아|좋았|사랑|싫어|싫었|미워|최애|취향|즐겨|반했|단골|그리워|설레|맛있|재밌|재미있|신나|신났|행복|즐거|기뻐|기뻤|슬퍼|아쉬|미안|외로|심심|내일|여기까지|기다렸|보고 싶|오늘|아까|방금/;
```
Whole-phrase allow-list `HONEST_OK` (`tools/test-brain.js`:1812–1816): `보울라인은 당겨도 안 조여서 뱃사람들이 좋아했대`, `큰 날개깃이어야 해`, `좋은 아침`, `좋은 오후`. Exact decision lines `DECISION_OK` (1817–1820): `js/salon.js` → `응, 해 볼래.` `그래, 바꿔 볼래.` `이 색 해 볼래.` `이대로 있을래.` `지금 색 그대로 있을래.`; `js/play.js` → `지금은 구경할래` `지금은 안 할래` `이따 할래`. Decision endings in `-ㄹ래` are allowed; wishes (`-고 싶`, `-면 좋겠`, `바라`) are not. Note that bare `좋`, `기분`, `충분`, `재미`, `맛있`, `기대돼`, `고마`, `반가`, `든든`, `편해`, `신기`, `사랑`, `(어|아|여)야 해` all match.

Second, wider net — `smoke` scenario "A-2" (`smoke`:568–581), both regexes verbatim:
```js
var FEEL_RX = /좋아|신나|기뻐|기쁘|행복|즐거|싫어|슬퍼|외로|심심|맛있|꿈/;
var WANT_RX = /싶대|싶어|싶었|싶다|싶은|궁금했|궁금해|끌렸/;
```
- `WANT_RX` is run on **every line (comments included) of every `js/*.js` file except `brain.js` and `world.js`** — a new `js/npc.js` or `js/shop.js` is scanned automatically, and so are code comments quoting the owner.
- `WANT_RX` and `FEEL_RX` are run on the visible text and `alt`/`title`/`aria-label`/`placeholder` of `index.html`, `cook.html`, `play.html`, `credits.html` (`맛있` and `꿈` are in `FEEL_RX` — relevant to café menus written in HTML).
- Practical rule for NPC lines: state facts, offers and decisions; no feeling, liking, wanting or bodily state for any octopus; show the source label on the name tag; keep the log/receipt provenance (`by`) truthful — `WHO_LINE` (`app`:3203) tells the player that rules, not a model, are choosing.

---

## 9. Audio (`js/audio.js`, global `AUDIO`; file not touched by the slot edits)

- **Public API** (`js/audio.js`:1480–1485): `AUDIO.init(opts)`, `AUDIO.on(name, data)`, `AUDIO.setEnabled(bool)`, `AUDIO.enabled()`, `AUDIO.setVolume(bus, v)`, `AUDIO.state()`. There is **no public "play this sound"**.
- **Hooks** `on(name, d)` 1178–1196: `state, bubble, pet, ceremony, peek, row, lantern, busy, door, cook, room_sheet` (= `settings_sheet`); unknown names are ignored silently. The app calls them as one-liners, e.g. `AUDIO.on('lantern', { n })` `app`:2828, `AUDIO.init({ hour, weather, lantern, season })` `app`:5453.
- **Inside**: one-shots `play(x, o)` 355 (id or group from the manifest; buses `bgm, amb, sfx_event, sfx_ui, voice` line 39; max 6 at once; jingles queue); loops `startSlot(slot, id, o)` 490 / `stopSlot(slot, fade)` 533 with slots `bgm, amb, layer, warm, season, cook`; the music choice is recomputed by `desired()` 557 → `applyBgm(o)` 587, driven by `tick()` 710 and `bandChange()` 623 (home theme = time band × weather, place theme while away, lullaby while asleep); ducking `duck()` 418; `pauseBgm()` 428.
- **Files**: `audio/manifest.json` — 168 sounds (`bgm` 14, `place` 11, `special` 2, `jingle` 47, `sfx` 80, `amb` 10, `layer` 4), all original chiptune rendered by `audio/src` (Python). Loaded with `fetch` + `decodeAudioData` (`fetchBuf` 194, `decode` 185, `.ogg` or `.m4a` by `pickFmt` 181), cached in an LRU capped at 128 MB decoded (`BUDGET` 40; a 3.5-minute theme ≈ 40 MB). A second set is merged the same way: `foley/manifest.json` via `loadFoley()` 965 / `mergeFoley()` 978 — the precedent for adding a record-player set.
- **Synthesis**: `makeSound(id, sp)` 239 builds an `AudioBuffer` in code (door creak, seeded noise pulses), `makeDing()` 1119 likewise. So code-generated buffers can be played, but there is **no note sequencer** — music is pre-rendered files. A synthesized tune would be new code (oscillators scheduled on `ctx.currentTime`, routed into the `bgm` bus; node graph is built in `ensureCtx()` 274, nodes in `nd`, e.g. `nd.master`, `nd.duckBgm`).
- **Off by default — how it is enforced**: `pref = { on: false, music: 0.8, sfx: 0.8 }` (line 53), persisted under localStorage `ppolppol_audio` (`loadPref` 57, `savePref` 66). Before the player turns sound on, **no request goes to `audio/` at all** (header lines 9–12) and no `AudioContext` exists. The only switch is the settings checkbox `#set-sound` built by `toggleRow()` 1346 inside `roomSheet(frag)` 1372 → `onToggle()` 1337 → `setEnabled(on, fromUser)` 1272 → `start(fromUser)` 1199. If sound was left on and the page reloads, nothing plays until the first user gesture: `arm()` 1311 listens for `UNLOCK = ['pointerup','keydown','touchend','mousedown']` 1287 → `onUnlock` 1298. Hidden tab → suspended (`bindVisibility` 1418). `file://` → silent by design (header 19–20; `<audio loop>` fallback is explicitly rejected). Every failure is swallowed with at most one `console.warn` (`guard` 71).
- Tests: `tools/test-audio.js` and `tools/test-cook-audio.js` (slow suite) drive `#set-sound` and read `AUDIO.state()` (`enabled, started, bgm, played, requests …` — `snapshot()` 1462); not run for this map.

### What a record-player feature needs
1. A new hook, e.g. `AUDIO.on('record', { act: 'play' | 'stop', id })` (new `case` in `on()` 1178) — adding a case is the established way for other modules to reach sound.
2. A state flag that `desired()` 557 respects (e.g. `gs.record = id`), otherwise the next `tick()`/band or weather change cross-fades back to the home theme. On stop, clear the flag and call `applyBgm()`.
3. Start **only from the player's tap** on the record player and only if `active()` (321: `pref.on && started && ctx running`). If sound is off, do not turn it on behind the player's back: show the record spinning silently plus a short pointer to settings › 소리.
4. Stop on leaving the café (place change / sheet close), on `setEnabled(false)` (`stopAll()` 1245 already kills slots — make it clear the flag too) and when the tab hides.
5. Route through the `bgm` bus so the 음악 slider (`pref.music`), night −3 dB master and ducking apply.
6. Tracks: none of the 168 sounds is jazz/classical. New audio files need a manifest entry, a credit line in `credits.html`, and registration for export/crawl tests (`tools/test-export.js`, `tools/export-site.js`). Keep them short/mono to fit the 128 MB decode budget; loop with `loopStart/loopEnd` like the themes.

---

## 10. Day and week logic

| Need | Use | Where |
|---|---|---|
| Today's key `YYYY-MM-DD` (local time, test-hook aware) | `todayKey()` | `app`:165 (`hookToday()` 164, `dateKey(d)` 161) |
| Shift a key by n days | `keyAdd(key, n)` | `app`:166 |
| Monday of a key's week | `weekKeyOf(dk)` | `app`:5092 |
| Weekday of today | `var p = todayKey().split('-'); new Date(+p[0], +p[1] - 1, +p[2]).getDay()` → 0 Sun … 6 Sat; Saturday/Sunday of this week = `keyAdd(weekKeyOf(todayKey()), 5)` / `…, 6)` | — |
| String → 32-bit seed | `hash(s)` | `app`:170 (→ `BRAIN.hashSeed(...)` `js/brain.js`:193, variadic; FNV-1a fallback) |
| Seeded PRNG | `mkRng(seed)` → function returning [0, 1) | `app`:171 (→ `BRAIN.rng(seed)` `js/brain.js`:205; mulberry32 fallback) |
| Same helpers elsewhere | `mulberry32` / `hashStr` in `js/audio.js`:77–78; `mulberry32` / `dateKey` in `js/cook-stickers.js`:60–61 | |

- Existing seeded picks to copy: weekly tasks `mkRng(hash(['week', key, slot, rr, S.octopus.name || ''].join('|')))` (`weekPick` `app`:5096–5099); flower colour `mkRng(B.hashSeed('seed', dk, i, u.days.length, u.seeds))` (`app`:5226); gift-box answer (`app`:3373). Project rule: decisions never use unseeded randomness (`uiRng` `app`:172 is for decoration only).
- **Daily stock**: make it a pure function of the date — `mkRng(hash(['shop', todayKey(), S.octopus.born || 0].join('|')))` then pick k items from the catalogue. Store only what was bought (`S.user.shop = { day, bought: [ids] }`), so two tabs and reloads agree and nothing has to be "rolled".
- **Weekend contest**: theme = seeded on `weekKeyOf(todayKey())`; open when the weekday is 6 or 0; store `{ week, entered, score, paid }` so it pays once per week (the weekly-gift bookkeeping `w.claimed` / rollover `w.prev` at `app`:5121–5141 is the model, including "pay what was earned if the player comes back later").
- **Day change while the tab is open**: `bagInit()` starts `setInterval(…dailyGift…, 60000)` (`app`:5440) and a `visibilitychange` listener (5441); `dailyGift()` 5073 calls `checkDay(true)` 5078; `checkDay(soon)` `app`:2502 rebuilds the day log, album, shelf and `renderBagChip()` (which runs `weekState()` and so rolls the week). New daily things should hang off `checkDay`/`dailyGift` or be computed lazily on render.
- **Test hook**: `window.__ppolTest = { today: 'YYYY-MM-DD', forceKind: 'out' | 'home', hint }` (`app`:162–165; also honoured by `js/runner.js` and `js/audio.js`:79). In `smoke`: `dayAfter(n)` line 47, and `setDay(pg, d)` line 3083 (local to one scenario; it also writes `sessionStorage.__y_day`). Typical use: `page.addInitScript({ content: "window.__ppolTest = { today: '2026-11-21' };" })` then later `page.evaluate(d => { window.__ppolTest.today = d; }, next)`.

---

## 11. Tests touching these areas

`npm test` (fast, `package.json`:11) and `npm run test:slow` (browser). Counts are from runs made for this map at about 12:10 UTC, all green; suites without a count were not run.

| File | In | What it pins here | Count |
|---|---|---|---|
| `tools/test-brain.js` | fast | honesty word lists over `js/app.js`, `brain`, `salon`, `play`, `meal`, `world` strings (section 8.3); tap lines | 573 passed |
| `tools/test-dye-adopt.js` | fast | `dyeMirror` / `dyeAdopt` / `load()` mirror path. It **evaluates source text sliced out of `js/app.js`**: from the line `^  function wornOf(cat)` up to `^  function applyDye()`, plus `load()`, `isObj`, `parseState`, `seenOf` (its lines 10–13) | 12 ok |
| `tools/test-play-stickers.js` | fast | runner/swim sticker rules, determinism by run id, art files exist | 180 ok |
| `tools/test-cook-stickers.js` | fast | sticker engine rules | 250 ok |
| `tools/test-poster-art.js` | fast | poster room art data | 295 ok |
| `tools/test-meal.js` | fast | `js/meal.js` table rules, merge, slim | 134 passed |
| `tools/test-salon.js` | fast | salon asks, merge of two tabs | 235 passed |
| `tools/test-runner.js` | fast | runner simulation, scores, awards | 583 passed |
| `tools/test-haptics.js` | fast | vibration setting | 59 ok |
| `tools/test-export.js` | fast (+ `--crawl` slow) | every referenced asset/script exists in the exported site; lists of private/unused files (`tools/export-site.js`) | 47 passed |
| `tools/check-world.js`, `test-model-voice.js`, `test-api.js`, `test-cook.js`, `test-cook-dishes.js`, `test-art-extra.js`, `test-claude-sync.js` | fast | world data, model-voice rules, API, cook rules, art | not run |
| `tools/test-dialogue-stub.js` | not in npm scripts | the frozen `DLG` table against `js/dialogue-stub.js` | 63 passed |
| `tools/test-audio.js`, `test-cook-audio.js` | slow | sound off by default, `#set-sound`, sliders, state snapshot | not run |
| `tools/test-scene-perf.js` | slow | draw calls, shader program count (player parts must not add programs) | not run |
| `tools/test-cook-stickers-live.js` | slow | on-screen sticker size and device-pixel alignment in the cook page | not run |
| `tools/player-shots.js` | evidence tool | part sheet, eye pixel checks, 3–6 items per category (stale for `outfit`) | not run |
| `tools/smoke.js` | slow | see below | not run |

`smoke` scenarios that matter (line of the `==` header): settings in dark mode 379 (`#set-body` text, `#set-stats`) · "A-폰" first screen and bag at phone scales 505 (`#btn-bag` shell picture + number) · "A-글자" text-size floors 534 · "A-2" no-feeling words 568 · G 2D fallback 1176 (look sheet in 2D: 6 tabs, 11 tiles, no canvases; room title at lantern 0) · L narrow-width name 1448 · R attic runner 2050 · S settings/look sheet/sound toggle/lantern tooltip 2298 (heading order 2376–2382, my-look row 2384–2399, look sheet layout, keyboard, persistence 2449–2631, sound checkbox name 2642) · O first-run colour 2890 · U no emoji in player text 4482 · O one-screen layout 5285 (status bar) · Q weekly tasks and gift box 5482 · Z loft 6205 · X garden 6820 · Z2 sewing machine sheet 7372 · EAT table 7845. New scenario bodies and list rows go in the `[7-x]` slots at the end of the file (Appendix A).

---

## 12. TRAPS

1. Any Korean string literal added to `js/app.js` (or `brain`/`salon`/`play`/`meal`) is checked against `CLAIM_RX` (`tools/test-brain.js`:1808, 1870–1878): a menu name or toast containing `좋`, `맛있`, `싶`, `기분`, `재미`, `충분`, `고마`, `기대돼` fails `npm test`.
2. `smoke`:578–580 greps **every line, comments included, of every `js/*.js`** (except `brain.js`, `world.js`) for `싶대|싶어|싶었|싶다|싶은|궁금했|궁금해|끌렸`; HTML visible text is also checked for `맛있` and `꿈` (`smoke`:566, 572–577).
3. `tools/test-dye-adopt.js`:11–13 slices `js/app.js` by exact line starts (`  function wornOf(cat)` … `  function applyDye()`, `  function load() {`, `  function save() {`): do not rename, re-indent or insert unrelated code between `wornOf` and `applyDye`.
4. `normalizePlayer` (`app`:257, `s3d`:340) turns unknown ids/categories into defaults on every load, and an old-build tab then saves that back — never delete or rename an id, add a mapping instead; never put ownership checks inside it.
5. Two tabs: `adoptRemote` (`app`:2106) takes the other tab's whole state (`S = R`); shells have no ledger. A purchase can be lost or paid twice unless `owned` is union-merged the way meals are (`app`:2113, 4272).
6. `earnFromPlay` (`app`:5066) has no daily cap and existing players may hold large balances (the only sink so far is 6 shells per dye).
7. Dye matches part colours by exact hex against `OUTFIT_MAIN` / `SHOES_MAIN` / `ACC_MAIN` (`s3d`:2867–2876): a new item without an entry, or with a different literal, cannot be dyed and `dyeItems` (`app`:5298) hides it.
8. Player parts may not add meshes, materials, textures or shader programs, and `DoubleSide` is forbidden (PLAYER_PARTS.md §4; program count asserted in `tools/test-scene-perf.js`); open half-shells show the background through the back.
9. Eye size and position are global (`PL_EYE` `s3d`:2598): "better eye shapes" must fit the 4×4 / 8×8 cell, with no white texels (owner 11-10), or the patch/atlas code must change for all styles.
10. `renderSettings` rebuilds everything on each open and tests click controls that would sit in closed `<details>` (`#set-sound` ×25 in `tools/test-audio.js`); `smoke`:2382 pins `내 모습` as the second `h3`; the sound section is appended by `js/audio.js`:1372, not by `app`.
11. `.room-title` is hidden below 440 px in the default layout (`css`:1566) and below 420 px otherwise (`css`:962): a day counter placed in that span is invisible on phones; the bar at 360 px is nearly full (name 80 + tag 23 + lantern 94 of 224 px, before gaps — `css`:1450).
12. Use `todayKey()` (`app`:165), never `new Date()`, for stock, contest and day counter; the 60 s `dailyGift` tick (`app`:5440) can fire between a test's date change and its read (the cause fixed in commit `96e4722`).
13. `AUDIO` has no public play call and the BGM is re-decided by `desired()` / `tick()` (`js/audio.js`:557, 710): a tune started on the side gets cross-faded away; nothing may be fetched from `audio/` before the player turns sound on (header lines 9–12).
14. Runner stickers are not loaded by `index.html` at all (`tools/export-site.js`:52); poster stickers are whole multiples only in SVG units — the dialog front is CSS-scaled (`css`:379) and album-card stickers are 16 CSS px (`app`:2606, 2856).
15. `DLG` tags every octopus line with the *player's* octopus name (`js/dialogue-stub.js`:22–27) and its API table is frozen (docs/DIALOGUE_UI.md:459): add optional fields only. Also: `S.user` does not exist until `userState()` (`app`:5053) and is wiped by `resetAll()` (`app`:3824); new sheets must be re-rendered from `renderAll()` (`app`:3043).

---

## Appendix A — working-tree drift and lane slot lines (generated 2026-11-21 12:32 UTC; the lead was still editing, so re-run the two commands)

Uncommitted insertions relative to HEAD `2ed1134` (`git diff -U0 | grep "^+++\|^@@"`). Read `@@ -A,0 +B,N @@` as "N lines inserted after HEAD line A": every working-tree line after that point is N higher than the HEAD number used in this map.

```
+++ b/css/style.css
@@ -1778,0 +1779,26 @@
+++ b/index.html
@@ -208,0 +209,17 @@
@@ -371,0 +389,17 @@
@@ -439,0 +474,17 @@
+++ b/js/app.js
@@ -5470,0 +5471,26 @@
@@ -5497 +5523,19 @@
+++ b/js/scene3d.js
@@ -36,0 +37,4 @@
@@ -5526,0 +5531,16 @@
@@ -6934,0 +6955,13 @@
+++ b/tools/smoke.js
@@ -8072,0 +8073,28 @@
@@ -8091,0 +8120,18 @@
```

Lane slot marker lines in the working tree (`grep -n "\[7-[A-Z]\]" <file>`): write only directly under your own marker.

```
== js/app.js
5473:  /* [7-U] 화면 고침 · 빈 화면 */
5476:  /* [7-T] 요리 → 식탁 잇기 · 레시피 */
5479:  /* [7-P] 내 캐릭터 · 뛰기 */
5482:  /* [7-W] 바깥 한 장 · 해안가 · 이동 */
5485:  /* [7-V] 마을 건물 · NPC 그리기 */
5488:  /* [7-S] 가게 · 카페 */
5491:  /* [7-N] NPC 문어 · 세계관 */
5494:  /* [7-F] 주말 콘테스트 */
5525:    /* [7-U] */
5527:    /* [7-T] */
5529:    /* [7-P] */
5531:    /* [7-W] */
5533:    /* [7-V] */
5535:    /* [7-S] */
5537:    /* [7-N] */
5539:    /* [7-F] */
== js/scene3d.js
5532:    /* [7-T] 식탁 · 들고 가기 · 새 효과 */
5535:    /* [7-P] 내 캐릭터 · 뛰기 · 마네킹 */
5538:    /* [7-W] 바깥 한 장 · 해안가 · 이동 */
5541:    /* [7-V] 마을 건물 · NPC 그리기 */
5544:    /* [7-U] 화면 채우기 · 계단 단추 */
6956:      /* [7-T] */
6958:      /* [7-P] */
6960:      /* [7-W] */
6962:      /* [7-V] */
6964:      /* [7-N] */
6966:      /* [7-U] */
== css/style.css
1781:/* [7-U] 화면 고침 · 빈 화면 */
1784:/* [7-T] 요리 → 식탁 잇기 · 레시피 */
1787:/* [7-P] 내 캐릭터 · 뛰기 */
1790:/* [7-W] 바깥 한 장 · 해안가 · 이동 */
1793:/* [7-V] 마을 건물 · NPC 그리기 */
1796:/* [7-S] 가게 · 카페 */
1799:/* [7-N] NPC 문어 · 세계관 */
1802:/* [7-F] 주말 콘테스트 */
== index.html
210:  <!-- [7-T] 단추 -->
212:  <!-- [7-P] 단추 -->
214:  <!-- [7-W] 단추 -->
216:  <!-- [7-V] 단추 -->
218:  <!-- [7-S] 단추 -->
220:  <!-- [7-N] 단추 -->
222:  <!-- [7-F] 단추 -->
224:  <!-- [7-U] 단추 -->
390:<!-- [7-T] 창 -->
392:<!-- [7-P] 창 -->
394:<!-- [7-W] 창 -->
396:<!-- [7-V] 창 -->
398:<!-- [7-S] 창 -->
400:<!-- [7-N] 창 -->
402:<!-- [7-F] 창 -->
404:<!-- [7-U] 창 -->
475:<!-- [7-T] 스크립트 -->
477:<!-- [7-P] 스크립트 -->
479:<!-- [7-W] 스크립트 -->
481:<!-- [7-V] 스크립트 -->
483:<!-- [7-S] 스크립트 -->
485:<!-- [7-N] 스크립트 -->
487:<!-- [7-F] 스크립트 -->
489:<!-- [7-U] 스크립트 -->
== tools/smoke.js
8074:/* [7-U] */
8077:/* [7-T] */
8080:/* [7-P] */
8083:/* [7-W] */
8086:/* [7-V] */
8089:/* [7-S] */
8092:/* [7-N] */
8095:/* [7-F] */
8098:/* [7-K] */
8120:      /* [7-U] 목록 줄: ['U7', function () { return scenario…(browser); }], */
8122:      /* [7-T] 목록 줄: ['T7', function () { return scenario…(browser); }], */
8124:      /* [7-P] 목록 줄: ['P7', function () { return scenario…(browser); }], */
8126:      /* [7-W] 목록 줄: ['W7', function () { return scenario…(browser); }], */
8128:      /* [7-V] 목록 줄: ['V7', function () { return scenario…(browser); }], */
8130:      /* [7-S] 목록 줄: ['S7', function () { return scenario…(browser); }], */
8132:      /* [7-N] 목록 줄: ['N7', function () { return scenario…(browser); }], */
8134:      /* [7-F] 목록 줄: ['F7', function () { return scenario…(browser); }], */
8136:      /* [7-K] 목록 줄: ['K7', function () { return scenario…(browser); }], */
```

---

## Summary (12 lines)

1. The player look is 12 categories / 64 items in `PLAYER_PARTS` (`js/scene3d.js`:321) with an app-side copy (`js/app.js`:233–248); saved as ids in `S.settings.player`, dye colours per item in `S.user.dyed`.
2. It reads as a girl because of the defaults (bob + dress + ribbon), five long/tied hair styles of six, skirts baked into five outfits of nine, one A-line body, and no top/bottom split.
3. Adding a hair style, outfit or eye style = one catalogue row (two files) + one builder in `PL_PARTS`; top/bottom split and a second body shape are category changes touching about ten named places (section 1.7).
4. New parts must obey: 27 px/m, nothing under 6 cm, edges by palette cell not ink line, closed hair solids, eyes 4×4 px with no white, 7 meshes, no new shader program.
5. Nothing is owned or locked today — every item is wearable from the start; a shop needs `S.user.owned`, a check in `setPlayerPart` (`js/app.js`:1142), locked tiles in `lookRenderItems` (3550), and "all current ids stay free" as migration.
6. Shell income: 3/day + 10 every fifth opened day, 2–8 per runner run with no cap, 12 per week; the only sink is 6 per dye; prices live in three literals (section 3.4).
7. Reuse the sewing-machine confirm flow (`sewDye` → question in place of the grid → 600 ms double-tap guard → `sewDo` re-checks and spends) and `shellAmt` for every purchase.
8. Sheets: `<dialog class="sheet">` + `.handle` + `h2.dlg-top` + body + close button, opened with `showDialog`; pictures via `ico`/`pxIco`, text sizes via `--fs-*` variables, no emoji.
9. Settings has seven headed sections (eight once the mirror exists) built in `renderSettings` (`js/app.js`:3408); collapsing them needs remembered `<details>` state and breaks tests that click hidden controls (`#set-sound` and others).
10. The room title is one function (`roomTitle`, `js/app.js`:155) used in the status row, `document.title` and the lantern tooltip, already hidden under 440 px; no day counter exists — build it from `S.octopus.born` or `S.user.days.length` with `todayKey()`.
11. Runner stickers are 64 CSS px by code but are not wired into the game; poster stickers are 16 CSS px on album cards and about 31–36 (with room art) or 61–73 CSS px in the poster dialog; no test pins either size.
12. `DLG` cannot name an NPC or label a line "scripted" yet; `AUDIO` has no public play call and is off until the player ticks settings › 소리; all new strings must pass the feeling-word scans in `tools/test-brain.js`:1808 and `tools/smoke.js`:566–581.
