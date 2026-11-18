# Round 6 code map (뽈뽈 문어) — facts about the code at `ada2967`

> Shared with the lanes (11-18). This is what the code **was** at `ada2967` (`file:line`; line numbers drift once lanes edit, function names do not). Where it suggests a design (for example §5 "where new state fits" or §6 "keep or ask"), `wip/round6/eat-spec.md` decides instead.

Requirement source: `docs/OWNER_DECISIONS.md:155-167` ("주인 답 (11-18 KST: 6차 …)"). Hard lines: `HANDOFF.md:30-33`, `wip/round5/briefs/COMMON.md` "Hard lines" (1-11).
All refs are `file:line` at ada2967. "art px" = the drawing grid; "dev px" = device pixels; CSS px = dev px / DPR.

---------------------------------------------------------------------------------------------------------------------
## 0. Facts that change the plan (read first)

1. **The game never receives a finished dish.** `cook.js` calls `L.onResult(res)` (`js/cook.js:1161`), but `cook.html` never passes `onResult` (`cook.html:93-105`) and only posts `ready`/`close` (`cook.html:88-92,97,157`); `app.js cookMsg` handles only `ready`/`close` (`js/app.js:4052-4059`). The only record is the book line in `localStorage['ppolppol_cook_v0']` (`js/cook.js:1160`). A dish-to-table flow needs a new `{ppolCook:'result', …}` message (or app.js reading the kitchen key on close).
2. **Only one recipe is reachable.** `begin()` always uses `RECIPES[0]` (`js/cook.js:1422`); `opts.recipe`/`?recipe=` is accepted by `cook.html:103` but ignored by `COOK.open` (doc: `docs/COOK_PROTO.md:54`). Stations, slides, art, words, look validation and stickers are all jeon-specific (§1.10).
3. **The octopus never enters the play room today.** `js/scene3d.js:28,2452,3833` ("문어는 놀이방에 안 간다"), overlay hidden in rooms (`js/scene3d.js:3221`), `octScreenPos()` returns null in rooms (`js/scene3d.js:6124`), app scene description says "문어는 다락방에 있어" for play (`js/app.js:1169-1170`). The loft has the only precedent of the octopus following the player into a room: `octMountLoft/octUnmountLoft` (`js/scene3d.js:3813-3826`).
4. **Sitting is attic-sofa-only.** `playerSit` requires `PL.place==='attic'` and uses `FURN.sofa` (`js/scene3d.js:2989-3004`); `plStand` is hard-wired to the attic sofa axis (`js/scene3d.js:2984-2988`).
5. **Cuts are diagonal on purpose today**: drag angle is kept (±30°), guides are offset ±4 art px, and the reveal deliberately prevents a perfect cross (`js/cook-art.js:1160-1161,1186-1193`). See §1.5.
6. **No bell/ding sound asset exists** (foley/ has 27 cook sounds, audio/ has chiptune jingles; nothing bell-like for a timer). See §1.8.
7. **No live model channel in the game.** The salon's model path is a plan (`docs/SALON.md:479-557`); the game answers with demo rules. MCP decisions are pull-based (the model must call a tool). An MCP `table` decision already exists server-side (§3.4).
8. **Runner sprite is resampled three times** (portrait 64→~22 px at a non-integer ratio, ±7° nearest rotation, non-native stretches) — that is the "pixel-broken" look; the canvas scale itself is integer (§6).
9. **Boot crawl** has a fixed 5.6 s cross time, starts at 28.6 % of the path, uses 2 CSS px per art px and continuous `translateX` — not crisp at DPR 2.625 and only visible until the app's second scene frame (§7).

---------------------------------------------------------------------------------------------------------------------
## 1. Kitchen

### 1.1 cook.html (standalone vs embed) and the game side
| what | where |
|---|---|
| font pref read (only allowed `ppolppol_v2` read in cook files) | `cook.html:20` (test-cook.js 14 allows exactly this line) |
| embed detect in head (`ck-embed`, `ck-boot` hides door) | `cook.html:52` |
| scripts: haptics → cook-art → cook → cook-stickers; audio.js injected | `cook.html:59-62,118-127` |
| `tell(what, extra)` → `parent.postMessage({ppolCook:…})` | `cook.html:88-92` |
| `opts(first)`: opener, `storeKey:'ppolppol_cook_v0'`, `onClose`→`tell('close',{kbd})`, seed/slow/reduced/kbd/rec; `recipe` only on first open; **no onResult** | `cook.html:93-105` |
| incoming: `safe` (insets → `--ck-safe-*`, `COOK.refit()`), `motion`, `open` (+kbd), `close` | `cook.html:110-116,129-138` |
| `go(true)` at load; `tell('ready')` | `cook.html:139,157` |
| game: `cookFrame`, `cookSafe*`, `cookSrc(kbd)` (`cook.html?embed=1&reduced=1&kbd=1`), `cookMsg` (ready/close only), `openCook(opener,kbd)` (play room only, builds iframe once, `showDialog`) | `js/app.js:4017-4082` |
| counter button binding | `js/app.js:4122` (`#btn-cook`), `index.html:178-179`; overlay `index.html:339`, css `css/style.css:1683-1686` |
| weekly toasts wait while overlay open | `js/app.js:4631` |
| message table (doc) | `docs/COOK_PROTO.md:267-288` |

### 1.2 js/cook.js — simulation half (node-safe, ends at the live marker `js/cook.js:867`)
- Contract comment (units, clock, loop, run/step/look/event shapes): `js/cook.js:6-68`.
- `TUNE` (all numbers): `js/cook.js:76-140` — stage 288×320 logical = 144×160 art (`:77`); food batter/jeon centre (72,86), rx/ry (`:79-82`); gate 250 ms (`:84`); flip bands 3000 ms (`:106`); slice `jitter: 4` (`:134`), `angStep 6`, `slant 12`, `angMax 30` (`:131-133`), `cross`, `bins 40`, `cover 0.8` (`:116-135`).
- `TUNE_HASH = hash32(JSON.stringify(TUNE))` (`:165`); stored in every pot (`:694`); a pot with another hash is not resumed (`:730`) → moved byte-for-byte to `potOld` (§1.4). **Pinned**: `tools/test-cook.js:37` and `:567` (`2827089308`). Any TUNE edit = update pin + saved half-dishes drop to potOld (allowed: "at most one step").
- `WORDS` (aria-only words; vocabulary checked) `:143-152`; `RECIPES` (jeon only: tap→flip→slice) `:156-161`; `PROPS` `:163`; `BANDS ['soft','golden','crisp']` `:164`.
- KIND.tap `:237-302` (3 marks × 3 hits, hold auto-tap, dents ≤9). KIND.flip `:304-348`. KIND.slice `:350-480`.
- **Golden — how/when**: first press = heat on (`heatOn :308-312`, emits `heat` band 0 + `snd {act:'sizzle',band:0}`); `KIND.flip.tick` raises `st.band` every `bandMs` (0-3 s soft, 3-6 s golden, 6 s+ crisp, waits) and emits `band` `{band, say, snd:{act:'sizzle',band}}` (`:340-344` — **band 1 at heat-on + 3000 ms step clock = the "perfectly cooked" moment**). The kept tag is the band **at the moment the flip stroke was pressed** (`st.stroke.b0`, `:335`, used in `flick :318-325`), chip path flips at the band now (`:345`). Tag `BANDS[res]` (`:314,347`). No failure/miss events exist by contract (`:58`).
- Run machine `:482-578` (`settle` emits `step` + `quiet` `:504-514`; `advance` → `reveal` `{snd:{act:'done'}}` `:515-525`); `simulate` `:620-638`.
- `describe()` (aria plate line) `:647-656`; `verb()` `:657-663`; `hintAt()` `:664-669`.
- **Result envelope** `resultOf(run,{madeAt,day})` `:671-683`: `{v,id,by:'user',game:'cook',status:'done',ms:null,out:{dish:{id,name,tier,ingredients},recipe,seed,swaps,steps[{kind,status,tag}],look,madeAt,day}}`. `bookLine()` `:684-688` → `{id,recipe,seed,swaps,look,day,madeAt}`.
- **Store** (`localStorage['ppolppol_cook_v0']` via cook.html; key regex `^ppolppol_cook(_[a-z0-9]{1,16})?$` `:882-883`): `{v,day,dayN,seen,pot,potOld?,book}` — `normStore` `:746-767` (potOld: objects only, newest first, ≤4, any size `:755-761`), `bookAdd` (newest first, ≤300) `:768-773`, `potOf` (finished steps only) `:691-696`, `resumeRun` (ver/tune/recipe/seed/swaps/looks/tags/runId checks) `:726-744`, `validLook` `:704-718`.
- Dish picture: `drawDish(recipe,look,seed,w,h)` → COOK_ART.dish/dishSmall or `stubDish` (jeon-only, `TAN6` gaps) `:775-855`.
- Seeds/ids: `seedFor(day,dayN)`, `runIdFor(day,dayN,nonce)` (no clock), `fxSeed` `:198-203`.

### 1.3 js/cook.js — live half (`:867-1817`)
- Layout consts `LAY` (VIEW_W 80 art px, ROWS [28,132], ZMAX 6, HUD 64, CHIP 64, STICK_ROW 44) `:886`; `STATION {tap:'counter',flip:'stove',slice:'board'}` `:890`; `SLIDE_AT` `:891`; `SND_FREE` `:893`.
- Routing of every sim event (`handle` `:1068-1081`): `sound(e.snd)` → `AUDIO.on('cook',snd)` with 120 ms per-act gate except SND_FREE (`:944-952`); `sticker(e.snd)` (`:968-981`); aria `say()` (`:983-990`); `onEvent` juice (`:1083-1122`). **`band` events have no onEvent case** (only sound + sticker; art pulses from `fbc`, `:1557`).
- Haptics: `buzz()` counts into `L.stats.buzz` then `HAPTICS.buzz(name)` (`:957-961`); calls: `hit` → tap (`:1089`), `heat` → tap (`:1096`), flip → on landing frame (`:1108,1525`), `cut` → cut (`:1114`). Nothing on the plate.
- Stations/slides: `onStart` (tap→stove slide carries 'pan'; flip→board carries 'jeon') `:1123-1136`; reveal slide board→plate carries 'cut' `:1145-1153`; `startSlide/slideAt` `:1186-1198`; compose `:1200-1268`.
- `finish()` (book line + `L.onResult`) `:1154-1162`; `savePot()` `:1163-1167`.
- `begin(isAgain)` `:1421-1456`: **RECIPES[0]** (`:1422`), bad pot → potOld (`:1427-1430`), new dish `dayN+1`, seed `seedFor(day,dayN)` (`:1434-1436`), `sound/sticker({act:'pick',dish})` (`:1441,1444`), `?rec=1` recorder (`:1445-1448`).
- `fit()` (one canvas; art px = k dev px; `k = min(floor(vw·dpr/80), floor(usable·dpr/104), floor(6·dpr))` `:1475`; sticker layer zoom/hide `:1502-1509`) `:1466-1512`.
- `paintStage` (tap/flip/slice scenes; spatula follows finger `L.finger` `:1571-1573`, knife follows `st.hand` `:1575`) `:1563-1596`; `follow()` sets `L.finger=[x/2, y/2-6]` `:1350-1354`.
- `open(opts)` (L state incl. `stats {parts,squash,shake,arc,hints,idle,flips,teach,rowPress,slides,potOld,buzz{tap,flip,cut}}`, `onResult`, `onClose`) `:1713-1750`; `close/isOpen/refit` `:1711-1712,1513`.
- `exportData/importData` (book+seen only; **the main game's export/import/reset never touch the kitchen key**, `docs/COOK_PROTO.md:272`) `:1777-1793`.
- `COOK.live()` test snapshot (screen, station, slide, view{k,css,W,H,ox,oy,hudB,chipTop,safe}, stick, chip, stats, look, st, seen, key…) `:1796-1810`; `COOK.auto(on)` chip-path driver `:1811`.

### 1.4 Kitchen store summary (`ppolppol_cook_v0`)
`{ v:1, day:'YYYY-MM-DD', dayN, seen:['tap','flip','slice'], pot:null|{ver:'cook-1',tune,runId,seed,recipe,swaps,si,looks,tags,at}, potOld?:[…≤4], book:[{id,recipe,seed,swaps,look,day,madeAt}…≤300] }` — doc `docs/COOK_PROTO.md:203-228`. Pot is written at step boundaries, hidden, pagehide, close (`js/cook.js:1143,1163,1676,1684,1690`).

### 1.5 Slice geometry — why cuts look diagonal; how pieces are made
- Guides: `KIND.slice.init` `js/cook.js:455-466`: jeon (cross, 2 lines): line 0 horizontal through `(cx±hx, cy+off0·2)`, line 1 vertical through `(cx+off1·2, cy±hy)`; centre (144,172) logical; `hx=64`, `hy=44` logical; `off = rng%9 − 4` → **±4 art px off centre** (`TUNE.slice.jitter`).
- Cut angle: drag → least-squares principal axis of in-band samples per stroke part (`subAdd/subEnd :363-379`), weighted mean → `quantAng` (6° steps, clamp ±30°) (`:380-383`, applied `:400`); slash-across (`'cross'`) and chip (`'b'`) cut straight (ang 0). Tag `slant` if ≥ half the lines have |ang| ≥ 12° (`:404-407`) → aria "어슷하게 썰었어". Look stores `cuts[ang0,ang1]`, `offs[off0,off1]` (`:478`).
- Drawing during the step: `lineOf()` turns sim lines into `{x,y,deg,len,cells,cut,cutDeg=deg+clamp(ang,±30)}` (`js/cook-art.js:2296-2301`); `sliceScene` (`js/cook-art.js:2306-2362`) → `jeonComp({cuts:[{deg:cutDeg,x,y}], sep:1, gap:C.w4})` (`:2315`) → `cutBuf` (`js/cook-art.js:1166-1221`): each pixel is assigned to a side of every cut line through (x,y) at its angle (`neg = X·s − Y·c < 0`, `:1179`); each piece moves `sep`=**1 art px** away from each cut along the cut normal snapped to 8 directions (`:1171,1180-1184`); opened gaps painted as food walls/shadow (`:1205-1219`). Kerf dashes while dragging `:2335-2344`; end crumbs `:2323-2334`; dashed guide `guide()` `:1655-1664`; knife at hand `:2350-2351`.
- Plate (reveal close-up): `revealClose` `js/cook-art.js:2492-2526` uses `cutsOf(L)` (deg 0/90 + `L.cuts[i]`, shifted by `L.offs`) `:2413-2415` with **`half:1`** (only the up/left piece moves → 1-px gap, `:1183`) and **`nudge:1`** (one seeded piece slides 2 px, the others 0..1 px "so four pieces never line up into a perfect cross", `:1160-1161,1186-1193`); landing squash t=5 rx+2/ry−1 (`:2500-2503`). Same in `plated()`/`dish()` (`:1837-1862`, DISHG `nudge:1` `:1855`) and the old REV path (`REV.nudge 1` `:2372`). `dishSmall` draws no cuts (`:1863-1886`). `stubDish` gaps `js/cook.js:832-836`.
- So "+ clean" needs: ang 0 and off 0 (sim or art), symmetric outward split (no `half`, no `nudge`), a visible split beat (today: 2-frame gap flash `J.cut` `js/cook.js:1010`, crumbs `:1116`, step-end shake `:1139`). Sim-side changes alter TUNE (hash pin) and `validLook` ranges (`js/cook.js:711-716`: old book looks with non-zero cuts would then fall back to default parts in `normLook :797-808`); art-only changes keep saves.

### 1.6 Tool sprites (sizes)
Scale (from `tools/test-cook-live.js:28-36` FIT): 360×740@2 k=9 dev px/art px (4.5 CSS); @3 k=13 (4.33); 320×568@2 k=8 (4.0); 412×915@2 k=10 (5.0); @2.625 k=13 (4.95); desktop @1 ~k=6 (height-limited).
| sprite | code | art px | at 360@2 | notes |
|---|---|---|---|---|
| spatula | `SPATULA` 16×9 blade + 30-px wooden handle at 40°, 4 px thick (`js/cook-art.js:1611-1638`); rest `GEO.rest.spatula [100,112]` (`:158`) → blade x 92..107; drawn `flipScene :2276-2277`; follows finger 6 art px above it (`js/cook.js:1353`) | blade 16×9; whole ≈36×30 | blade 144 dev (72 CSS) | jeon on stove is 59 art px wide → blade ≈27 % of it |
| knife | `knife(b,x,y,deg)` stick len 36, blade u0..22 (1-4 px tall), bolster u23-24, handle u25..36 (3 px) (`:1665-1687`); rest `[100,124,0]`; tip 12 px left of the finger point | ≈37×4 | 333×36 dev (166×18 CSS) | thin; angle = guide deg (0/90) |
| ghost hand | `HAND` 16×17 (`:1890-1946`) | 16×17 | 144×153 dev | |
| HUD icons | `ICON_G` tap/flip/slice/close/heat/again 16×16 (`:1947-2061`); drawn at n2=floor(2·dpr) (strip, close) / n3=floor(3·dpr) (chip) dev px per px (`js/cook.js:1298-1330`) | 16×16 | 64 / 96 dev | `ICONS = Object.keys(ICON_G)` (`:2560`) |
Pins: `tools/test-cook.js:979-981` (GEO rest/flipArrow/knobs/rev2), `:1062-1064` (spatula blade x 92..107, >60 px), `:833-840` (sprite determinism), `:1073-1082` (icons 16×16, Apollo only, unknown→tap).

### 1.7 Stickers (js/cook-stickers.js, css/cook-stickers.css)
- Engine `PPOL_STICKERS.make` `js/cook-stickers.js:33-213` (GAP 900 ms, ≤3 on screen, life 250+1400+180 ms `:54-56`; `cue` `:103-131`; `show` size `round(32·scale·dpr)/dpr` `:149-194`).
- Kitchen set: 19 pictures, 32×32 PNG `assets/stickers/cook/*.png` (`CATALOG :220-240`); rules `:250-267` (already has `serve`/`eat`/`idle` acts for the main game, unused); per-dish scripts `RECIPES` (jeon only) `:272-279`; 2 slots (left/right of a strip) `:289-290`; `FEELINGS` never cued `:294`; `listenAudio` (not used — cook.js cues directly) `:304-319`.
- Mounted by cook.js on `.ck-stick` with `{scale:2}` (`js/cook.js:972`); one per corner (`:976-979`). `fit()`: n = floor(2·dpr) dev px per sticker px → **64 CSS at @2/@3, 60.95 CSS at @2.625**; strip at `hudB+4`; shown only if `hudB+4+s+8 ≤ (STICK_ROW 44 + oy)·css` (hidden at 320×568) (`js/cook.js:1502-1509`). CSS `css/cook.css:35-43`; anim `css/cook-stickers.css:4-46`.
- Owner rule (11-15): top wall corners only, never over food/hands, not at 320×568 (`docs/OWNER_DECISIONS.md:175`). Pins: `tools/test-cook-stickers-live.js` K2 (s = 32n/dpr, slots, show/hide at 8 sizes, `:273`), K3 (nothing covered, hidden 320×568/360×560), K1/K8; node rules `tools/test-cook-stickers.js`.

### 1.8 Audio acts (js/audio.js kitchen layer)
- Block `js/audio.js:927-1135`; dispatch `case 'cook': onCook(d)` `:1162`. Map lives in `foley/manifest.json` `map.cook`: pick→cook_pick, tap→cook_pat (rate rises with i), sizzle{heat_on,0,1,2} (loops), flip→cook_flip (sync land_s), quiet (stop loops), cut→cook_cut, step→cook_step, done{plate,steam}, stir/clink/simmer/place/lift/back (unused). Files `foley/cook/*.ogg|.m4a` (27 ids).
- `ckDo` (unknown act → silent) `:1098-1112`; `ckSizzle` (band crossfade + pop) `:1056-1064`; `COOK_NEXT` prefetch table `:958-961`; `onCook` state `:1114-1130`.
- **No bell/ding.** Options: (a) new foley recording → `foley/manifest.json` + `foley/CREDITS.md` + `credits.html` (test-cook-audio G pins credits text); (b) synthesized chiptune via `audio/src/sfx.py` → `audio/sfx/*` + `audio/manifest.json` (+ `audio/CATALOG.md`); a foley map entry may point to an audio/ id because both share `byId/groups` (`mergeFoley :977-986`). Sound must stay off by default (`AUDIO` gates; cook.html `?sound=1` page-only).
- Pins: `tools/test-cook-audio.js` A (whole-dish sequence incl. sizzle_1 crossfade `:248-251`), B, C (sound off: zero requests), H, I, M; `tools/test-audio.js`.

### 1.9 Haptics
`js/haptics.js:11-23` patterns (tap 14, flip 24, cut 16, done unused by the kitchen); `buzz()` `:50-58`. Owner: vibration only for runner jump/hit, kitchen tap/flip/cut, furniture pick/drop — **no buzz for the ding**. Pins: `tools/test-haptics.js:11-12` (kitchen calls tap/flip/cut only), `tools/test-cook-live.js:1259` (N6 `stats.buzz` exactly `{tap:10,flip:1,cut:2}` for a jeon run — new recipes change counts).

### 1.10 Adding two dishes — every jeon-specific spot
- Sim: `RECIPES` `js/cook.js:156-161` (comment plans miyeok/jumeokbap with stir/place — owner now wants tap/flip/slice mixes only); `TUNE.food` keyed by `step.food`/recipe id (`:78-82`, `initStep :485-488`; adding foods inside TUNE changes TUNE_HASH); `WORDS.dish/cooked/cut` (`:143-152`) + `describe()` (`:647-656`); `validLook` per step kind (`:704-718`); `defaultLook/normLook` (`:786-808`); `stubDish` (jeon branch `:816-836`); `begin()` recipe choice (`:1422-1426`: resume must match `r.id`).
- Live: `STATION` and slide carries (`:890,1131-1135`) assume tap→flip→slice; `paintStage` calls jeon scenes (`:1563-1577`); dialog aria-label `WORDS.dish.jeon` (`:1648`).
- Art: every scene is jeon/pan/board (`tapScene :2139`, `flipScene :2197`, `sliceScene :2306`, `revealScene/revealClose :2380,2492`, `base :2434`, `carry :2471`, `dish :1856`, `dishSmall :1866`); GEO is one food (`:150-169`).
- Stickers `RECIPES` per dish (`js/cook-stickers.js:272-279`); audio prefetch order `COOK_NEXT` assumes jeon (`js/audio.js:958-961`).
- Recipe choice UI: kitchen shows zero visible words (pictures + aria only). Plug points: `?recipe=`/`opts.recipe` (`cook.html:103`), embed `open` message could carry a recipe id (`cook.html:135`, `js/app.js:4078`).
- Text rules for new names: `tools/test-cook.js:729-782` — BANNED words (`:744`) in cook.js/cook-art.js/cook.css/cook.html incl. **'완벽' '맛있' '성공' '실패' '점수' '탔'** (whole file incl. comments); every WORDS string must be in `VOCAB` (`:770-771`, currently has '톳 주먹밥', '미역국', not '주먹밥' alone or '과일 꼬치') and inside KS X 1001; cook.js comments/code ASCII-only (`:769`).

### 1.11 Kitchen tests that pin today's behaviour
`tools/test-cook.js` (fast CI): `:35-42` (VERSION cook-1, TUNE_HASH, 1 recipe/1 prop, jeon = tap→flip→slice, `createRun('miyeok')===null`); §5 bands `:297-365`; §6 slice angle/slant/slash `:366-414`; §10 pots `:520-576` (hash at `:567`); §11 envelope `:577-610` (`steps tags [null,'golden','slant']` `:583`, describe text `:601`); §12 drawDish `:611-682` (GEO.cross `:667`); §14 static `:729-782`; §16/§17 art `:784+, :964+`.
`tools/test-cook-live.js` (L1-L19, N1-N10; FIT `:28-36`; L1 station/look `:218,231`; slides `:1190,1194`; N6 `:1259`). `tools/test-cook-audio.js`, `tools/test-cook-stickers-live.js`, `tools/test-cook-stickers.js`, `tools/test-haptics.js`, smoke **Z** kitchen-in-game (`tools/smoke.js:7252-7325`), capture tool `tools/cook-shots.js` (docs).

---------------------------------------------------------------------------------------------------------------------
## 2. Play room 3D (js/scene3d.js)

### 2.1 Geometry (play-room group coords; camera looks from +x+z; walls at x=−2.8 (left) and z=−2.8 (back))
| item | code | world box (x / z), height |
|---|---|---|
| room | `PLAY_R 2.8, PLAY_H 2.2` `:29`; `buildPlayRoom` `:3993-4150` | floor ±2.8; walkable ±2.45 (`PL_MARGIN .35`, `plLim :2781`) |
| arcade | `PLAY_MX −1.8` `:3991`, parts `:4040-4052`, `machineBox` `:4147` | x −2.16..−1.44, z −2.74..−2.20, h 1.66 |
| kitchen group | `KX = Rp−2.4 = 0.4` added to all kitchen parts `:4053,4107`; `zb=−2.74`, `cz=−2.47` | |
| counter (pot, pan on top) | `:4055-4067`; top `:4060` | body x 0.65..2.05, z −2.74..−2.20; top 0.87 |
| oven + hood + kettle | `:4075-4085` | x 2.09..2.75 |
| L-leg (sink, cutting board, fruit) | `:4086-4094` | x 2.20..2.74, z −2.20..−0.20 |
| rail + tools, shelves (back wall) | `:4095-4106` | y 1.3 / 1.55 / 1.92 |
| `counterBox` / `legBox` (obstacles + tap spot) | `:4147` | x 0.62..2.77, z −2.75..−2.15 / x 2.17..2.77, z −2.20..−0.14 |
| door to attic | left wall, `PLAY_DOOR_Z = snapPos(−0.33)` `:3991`, `makeDoor` `:4115`; anchor `DOOR_ANCHORS.playAtticDoor [−2.45,0,−0.33]` `:33` | rug x −2.38 (`:4039`) |
| window | left wall z 0.72..1.52, y 0.9..1.8 `:3991,4032-4037` | |
| wall lamps (+2 point lights) | `:4109-4113,4131-4136` | back x −0.3; left z 0.39 |
| player rest spot | `PL_REST.play [0.15,0,0.45]` `:2456` | |
| free floor | everything else; centre kept empty "나중 꾸미기 자리" `:3984` | ≈ x −2.45..1.9, z −1.9..2.45 |
- Static parts are merged into ONE mesh `room` (`:4118`) → a new static prop pushed into `pp` costs no draw call. Room cut for 360° turning: `cutSplit(pp,{walls, keep:[…]})` `:4116-4117` — floor furniture must be inside a `keep` box or it gets cut with the wall; `cutRoom(...)` `:4141-4145`.
- `PROOM` object (boxes, lights, screen) `:4146-4147`; built lazily on first entry (`runDoor :3944`).

### 2.2 Bounds, obstacles, routing (player)
`plBoxes()` play branch = machineBox, counterBox, legBox (+r 0.25) `:2793-2795`; `plCircles()` has **no play branch** (octopus obstacle only attic/loft) `:2805-2816`; `plPen/plMove` (slide along walls) `:2817-2859`; `plRoute` (one/two box corners) `:2923-2941`; `plWalkTo(to, face)` → Promise (1.8 m/s, reduced/hidden = instant) `:2942-2966`; `plRest` `:2967`; `plEnter(to,from)` (door swap; stands at the door) `:2968-2975`; `playerWalkTo(anchor)` `:2976-2981`; stick input `setPlayerInput/playerInputAllowed` `:2772-2780`; `stepPlayer` `:3005-3089`.

### 2.3 Adding a static prop + seat (what to touch)
1. parts → `pp` in `buildPlayRoom` (before `cutSplit`), add its box to `keep` (`:4116-4117`);
2. obstacle → new Box3 in `PROOM` (`:4146-4147`) + `plBoxes` play branch (`:2793-2795`);
3. tap target → `SPOT_KEYS` (`:3234`), `spotInfo` branch (`:3252-3254`), `pick` play list (`:4734`), app `ROOM_SPOT` (`js/app.js:3808`), a `<button class="scene-spot">` in `index.html` (like `#btn-cook` `:178-179`), hide list in `resetRoomUI` (`js/app.js:3962`), binding in `bindRooms` (`js/app.js:4107-4127`);
4. seat → today only `playerSit()` (attic sofa: walk to front, 0.34 s hop to `seat` y 0.22·sc, `PL.sit/PL.sitYaw` `:2989-3004`), `plStand()` uses `FURN.sofa` axis (`:2984-2988`), stick input stands up (`:3017-3018`), seated pose: legs −1.35 rad (`:3073`), yaw `PL.sitYaw` (`:3062`), yellow dot `stepSofaSpot` → `on.sofaSpot` (`:1705-1713`, app `js/app.js:575`, `#btn-sofa index.html:154`), scene tap on sofa `:4895`. A play-room seat needs a place-aware variant of all of these.
5. The play-room sofa is NOT furniture-mode furniture (mode is attic-only, §2.6).

### 2.4 Octopus (scene)
- Attic anchors `ANCHORS`/`ANCHORS0` (attic coords) `:24-26`; `anchorPos` (blanket y 0.12 hack) `:2403`; `jumpTo(anchor)` `:2406`; `moveTo(anchor)` `:2407-2411`; **`walkPoint(to, done, val)`** (any point, 1.2 m/s waddle + arrival hop; reduced = instant) `:2412-2435`; `octRoute` (furniture detours, attic only) `:1506-1522`; `octSpots` `:1494-1499`.
- Group: `octG` (scale `OCT_R 0.42`) `:2158-2159`; logical `oct` `:2208`; states `setOctState` (idle/stay/walk/away/sleep/carry/hang/pet/happy/anticipate/ponder/peek) `:3185-3197`; `STATE_EXPR` `:2287`; `setExpression` (EXPRESSIONS `:35`) `:2297-2303`; body animation `stepOct` `:3381-3460` (squash/hop/tilt per state; salon hook `SAL.body {sx,sy,by,lean}` `:3416` = the pattern for an "eating" body beat). No sit or eat pose exists.
- Room following precedent: `octMountLoft` (conditions: not away/sleep/ceremony/salon/resting; re-parent `octG` to the room group; place; `emit('octUp',true)`) / `octUnmountLoft` (back to attic anchor) `:3813-3826`; called on stairs swap `:3961`, on leaving `showPlace :3829`, on ceremony start `:4339`. App side: `octWithMe()` `js/app.js:3940`, `on.octResting` gate `:3814`, wander skipped while up `js/app.js:1474`.
- Things that assume "no octopus in play": `showPlace :3833`, `updateOverlay` hide `:3221`, `octScreenPos` API `:6124`, `plAvoidOct` attic-only `:2823-2834`, `plCircles` `:2805-2816`, tap `pick` play branch has no octopus hit `:4734` (loft branch shows how `:4735-4741`), app `sceneDescText` `js/app.js:1169-1170`, app `openSalon` guard `js/app.js:845`, smoke J (oct overlay hidden in play, `tools/smoke.js:3873`).

### 2.5 Counter tap → kitchen
spot `counter` box = `PROOM.counterBox` (`:3252-3254`), scene tap in play → `spotAt(['playAttic','machine','counter'])` (`:4734`) → clicks `#btn-cook` → `openCook` (`js/app.js:4122,4060`).

### 2.6 Furniture system / mode limits
`FURN` = sofa/crate/blanket in the attic only (`:1440-1441`; sofa mesh `:1429-1439`, `SOFA` `:23`); `furnModeCan()` requires attic view + player in attic (`:1597`); `furnOk` (walls, keep-zones `FURN_KEEP :1460`, other furniture, octopus body/bed) `:1470-1484`; layout saved by app (`on.furnSave` → `S.room.layout`). Owner: only the attic three pieces move (`docs/OWNER_DECISIONS.md:209`).

### 2.7 Scene API used by the app (`:6065-6201`)
`goRoom/view/room/player/playerWalkTo` `:6097`; `playerSit/playerSitting` `:6101`; `octUp/octDown/octScreenPos` `:6124`; `screenOf(x,y,z)` (world → container CSS px) `:6178`; `portrait/portraitURL/walkPortrait` `:6080`; `hotspots/spotRect` `:6111-6112`; `setReducedMotion` `:6125`; `motion()/stats()` (tests) `:6181-6183`.

### 2.8 2D fallback (js/scene2d.js)
Has a play-room picture with spots incl. `counter` (`js/scene2d.js:170`) but **no player character** (`:722-724`) and octopus hidden in play (`:455`). Table/eating needs a reduced 2D path or a 3D-only rule (cf. yard is 3D-only, `js/app.js:3971`).

### 2.9 Tests that pin the play room
`tools/test-scene-perf.js` T5 `:155-235` (lazy build, play draw calls ≤60 — today 21/22, programs unchanged after visits) and **T7 `:533-562`** (pushes at `:544-547`, checks `:557-562`): pushes from (0.95,−0.3) toward −z must stop at counter z −1.90; from (−1.8,−0.3) arcade z −1.95; from (1.0,−1.0) toward +x must stop at L-leg x 1.92; door anchor (−2.45,−0.33) reachable; start (0.15,0.45). **A table/sofa placed in those lanes breaks T7.** Smoke J (`scenarioWave8 :3856`), Z (`:7166`), R (`:2020`).

---------------------------------------------------------------------------------------------------------------------
## 3. Octopus decisions

### 3.1 Salon pattern (pure module + app staging)
- `js/salon.js` (DOM-free, node-tested): constants `P_YES 0.625`, `FIRST_DYE`, `REST_DAYS`, `LINE_SHOW 24` `:93-107`; `LINES` (decision-only lines) `:47-50`; `CONTEXT` (model fixed context) `:53-55`; `TEXT`/`TAILS {'demo-rules':'데모 규칙', model:'모델', human:'사람이 정함'}`/`BY_TEXT` `:58-91`; `canAsk` `:311-322`; **`demoAnswer({dateKey,name,born,asksBefore})`** seeded, never by colour/history `:328-335`; `readReply` (model answer parser, never re-ask) `:357-383`; `makeAsk` `:412-449`; `commit/settle` `:462-507`; `request()` (≤400 B, menu keep-first) `:509-521`; `rows()` (log rows + tail) `:527+`; `merge()` two-tab `:567` (exported `:732`); `normalize()` `:646`.
- App: `openSalon` `js/app.js:841-860`, `salonAsk` (sync → canAsk → makeAsk → commit → save once → stage) `:925-951`, `salonStage` `:999+`, log rows with `.lby` tail `:965-976`, `mineAsks` `:808-809`.
- Doc: `docs/SALON.md` §4 demo rule `:391`, §6 model protocol `:479-557` (8 s wait → `waiting` until midnight, fallback; never re-ask; `via sampling|tool`).

### 3.2 Gift box — closest analog for "octopus decides each time"
`giftOffer` `js/app.js:3322-3353`: answer seeded by `hashSeed('gift', todayKey(), itemId, name)` (`:3337`), **same item same day = same answer** (`S.settings.giftAsked {day, ids}` `:3333-3335`), saved before staging (`:3345`), `…` think bubble 1.3 s, idle face, log row "… (데모 규칙이 고름)" (`:3350`).

### 3.3 Honest-label infrastructure
`#brain-tag` '데모' (`index.html:204`; logic `js/app.js:1707,1533,1577`), settings "누가 고르나" `WHO_LINE` (`js/app.js:3182,3408-3409`), log tail `span.lby` (`js/app.js:971`). Language check: `tools/test-brain.js` honest suite `:1852-1905` scans string constants of `js/app.js`, `js/salon.js`, `js/play.js`, `js/brain.js`, `js/world.js` with `CLAIM_RX` (`:1808`: 좋아/싫/맛있/싶/즐거/… ) — **a new module (e.g. js/meal.js) must be added to that scan**; decision lines ("-기로 했어", "-ㄹ래") pass, feelings/tastes fail. Faces: code-written rows use `idle` (`docs/OWNER_DECISIONS.md:149`).

### 3.4 MCP / server path (where a new decision kind plugs in)
- `mcp/core.js`: `MENU` incl. **existing `table: ['eat','taste','save','watch','stop']`** `:33`; `TABLE_GAP_MS 30000`, `TABLE_DAY_MAX 5` `:39`; state `table {offer, asked}` `:279`; `offer/dropPending/talkRecord/writeTalk` (talk.json keeps intro/chat/table) `:339-369`; `tableSituation()` `:404-415`; `putDish(name,tier)` `:416-419`; decisions attach to `look_room` results `:441-443` and after `answer` `:740`; `answer({id,action,line?,expr?,note?})` `:722-743`.
- Tool schema `ppolppol_answer` `mcp/tools.js:86,98,108` (expr enum happy/idle/curious/calm); strings `mcp/i18n/*.js`; CLI `mcp/cli.js:3,11` (`table <name> <tier>`); tests `mcp/test/run.js:272-282` (**not in root CI**; run `cd mcp && npm test`).
- Hosted room: `api/mcp/[key].js` → `mcp/http.js` (blob store `mcp/store.js`); game pulls `GET /api/walks/<key>` (returns walks + `far` proposal + lang) `api/walks/[key].js`; human answers go through `POST /api/far/<key>` (`api/far/[key].js`, pattern for a game→room POST like "put dish"). Game client: `claudeRoom/claudeSync/farAsk` `js/app.js:3214-3314` (sync on open +2.5 s, on visibility `:4448-4449`).
- Doc for the planned table decision: `docs/CORE_LOOP_V2.md:202-216` (menu, symbols-only demo, 8 s → `watch` + `by:'fallback'`), `:280-322` (what the model sees, caps), `:430-434` (`S.table` record shape).

---------------------------------------------------------------------------------------------------------------------
## 4. Effects

### 4.1 What exists
- **UIART.fx** (DOM sprites over #scene, 8×8 cells shown ×2 CSS px = 16 CSS, 12 fps steps): `js/ui-art.js:232-306` — kinds `FX {heart:2, question:1, zzz:3, sparkle:4, ink:4}` (`:16`), anchored only at the octopus head via `octScreenPos()` (`:240-247`); **disabled when reduced motion or pixel font off** (`:271`). Sprites `assets/fx/*`, css `css/ui-art.css`. Not dev-px exact at 2.625.
- **scene3d pixel particles**: exterior 1-px `Points`/`LineSegments` per kind, 12 fps integer-row steps, pixel-snapped (`extPoints/extLines/XP/xLayout/stepExt` `js/scene3d.js:3715-3801` — kinds rain, snow, **petal**, leaf, fly (+ emissive twin on layer 1 for bloom `:3734`)); attic dust motes `dustLayout` `:1381-1389`; salon sparkle `salSpark` `:2040-2059`; footprints InstancedMesh (16, re-parented to the current room group by `fpClear(g)`, 12 fps fade, off when reduced) `:2860-2906`.
- Kitchen-only fx (cook-art twinkle/sparkle/particles) are canvas-local, not reusable in the room.

### 4.2 Following a character every frame
- 3D: parent the effect to `plG` (player group; re-parented by `plEnter :2970`) or to the room group and update from `PL.pos` in `stepPlayer` (`:3005-3089`, same place footprints are emitted `plFoot :2891-2898`); octopus: parent to `octG`/`bodyG` or read `oct.pos` in `stepOct :3381`. Snap with `snapScreen/snapC` like `xBase` (`:3754`).
- DOM: there is no `playerScreenPos()`; use `screenOf(x,y,z)` (`:6178`) with `player().at` per rAF (ui-art bubble `follow` rAF pattern `js/ui-art.js:223-227`).

### 4.3 Reduced motion
App setting → `applyMotion()` (`js/app.js:3732`: html `data-motion`, `scene.setReducedMotion`, kitchen `motion` message); scene checks `st.reduced` (ext particles freeze `:3797`, footprints off `:2893`, walks instant `:2946,2417`); UIART.fx returns 0; kitchen `L.reduced` (no particles/shake/slides `js/cook.js:995,1187`). A day-long aura needs an explicit still/hidden variant.

### 4.4 Performance budget (tools/test-scene-perf.js)
Play room draw calls ≤60 (T5 `:201`, T7 `:558`); whole scene ≤150 (T6); **shader program count must not grow** after boot / first room visit (T3 `:61-65`, T5 `:202,226`, T7 `:562`) → reuse an existing material variant (e.g. same `PointsMaterial({vertexColors:true,size:1,sizeAttenuation:false,depthWrite:false})` as `XP.petal`, or `lambert`/`basicV`) or prewarm at boot; each extra Points/Mesh = +2 calls (beauty + normal pass, cf. footprints note `:2864`).

---------------------------------------------------------------------------------------------------------------------
## 5. Saves

- Main key `ppolppol_v2` (`js/app.js:73`); `defaults()` = `{v:2, octopus, room, trips, notes, curiosityNotes, salon, settings}` — **no `user` here** (`:260-274`). `S.user` is created lazily by `userState()` (`{shells, seeds, dyes, days, earned, garden[6], plotTold, giftDay, giftTell?, week…}`, normalized in place) `:4540-4548`. Settings incl. `motion, pixelFont, player, octWear, giftAsked, giftN, claudeRoom, lastSeen` (`:272`, `:3333,3345`).
- `save()` (monotonic `lastSeen`, window.name mirror, quota slimming) `:304-322`; `load()` (mirror vs storage, broken copy kept as `_corrupt_<t>`, v1 migrate) `:331-342`; `normalize()` `:369-412`; `migrateV1` `:415+`. Nothing is silently deleted (rule 10).
- Day/week: `todayKey()` (local date or `__ppolTest.today`) `:161-166`; `checkDay(soon)` (new day: greeting, log, album) `:2482-2488`, called from `dailyGift` and visibility; `dailyGift()` per day `:4556-4563` (1-min interval + visibility `:4835-4836`); `weekKeyOf/weekState` `:4575,4604-4621`; per-day pattern `S.settings.giftAsked {day, ids}` `:3333`.
- Where new state fits (suggestion, not code): a waiting **table dish** `S.user.table = { id(runId), recipe, seed, look, herb, day, at }` (one dish max, `docs/CORE_LOOP_V2.md:215`); **today's effect** `S.user.meal = { day, dish, fx, octAte, by, rule?, seed?, model?, line? }` read as "active only if day === todayKey()" (old values kept, not deleted); normalize both inside `userState()`. Scene/aura reset must also hook the day change (`checkDay`/`dailyGift`), since `checkDay` only runs on the minute tick/visibility.
- Two tabs: storage event → `takeRemote` → `adoptRemote` replaces `S` wholesale (trips and salon asks are merged; everything else last-writer-wins) `:2092-2123`, listener `:4453-4458`; `syncFromStore()` before a decision `:2126-2130` (salon does this). A meal decision written in tab A can be lost if tab B saves an older copy — use the `mineAsks`/`SALON.merge` pattern if it must survive.
- Export/import/reset: `exportJSON/importJSON/resetAll` `:3743-3797` (S.user rides along; kitchen key untouched).

---------------------------------------------------------------------------------------------------------------------
## 6. Runner octopus sprite (js/runner.js)

- Pipeline: `buildSprites()` `:246-260` → if `APP.scene.portrait` exists, takes the **64×64 head-only portrait** per `EXPR {run:'curious', jump:'happy', hit:'calm', idle:'idle'}` (`:185`), crops to its alpha box and **nearest-downsamples by a non-integer s = max(bw/22, bh/23)** into a 24×24 buffer (`fromPortraits :200-215`), adds a 1-px #241527 outline (`outline :192-199`); else `drawnOctopus()` (hand-made 24×24 blob, `:216-233`). Then `toCanvas(img, ±7°)` **nearest-rotates** into 26×26 tilt frames (`:234-245`). `drawOct` (`:742-758`) draws with `ctx.drawImage(img, dx, dy, w, hh)` at **26×26, 30×16 (duck), 28×22 (land), 24×28 (jump)** → non-native stretches drop/double rows.
- Canvas scale is integer: `ZOOM 3.5`, `k = max(floor(3.5·dpr), ceil(w·dpr/192))` capped by height (`fit :403-424`) → dpr1 k3 (desktop wide: up to ~10), dpr2 k7, 2.625 k9, dpr3 k10; `--rn-px`/`--rn-px4` are only for HUD SVG pictures (`:422`). So the breakage is in the sprite content (downsample + rotate + stretch), magnified at large k.
- "Original attic octopus" sources: the 3D octopus itself (`OCT_R 0.42`, ~0.76 m tall ≈ 20 px at the attic's 1× 27 px/m); `portrait(expr,o)` (head close-up, `PORT {N:64, hw:1.3}` `js/scene3d.js:2308`, `renderPortrait :2327`, `portrait :2392`); **`walkPortrait(ph,{yaw,hw,ty,tilt,still,bg,color})`** (whole body, walk phase, `:2372-2389`), already used to bake the loading strip (`tools/make-loading-oct.js`, hw 1.75 → 56×39 cells). hw ≈ 2.8 gives the attic 1× density (64/(2·27·0.42)). Body colour must follow `octopus.color` (salon) — the runner reads it for the fallback (`:256`); portraits use the live scene colour.
- Honesty note for a redraw: today's run/jump/hit faces are curious/happy/calm (`:185`); C6/O2 decisions only changed the ready frame to idle (`docs/OWNER_DECISIONS.md:141`) — keep or ask.
- Pins: smoke R `info.sprites === 'portrait'` (`tools/smoke.js:2050`), R canvas integer-multiple check (`:2049`), runnerTouch/runnerCrisp (`:1800,1894`); `tools/test-runner.js:24` (sim numbers); `RUNNER.live().sprites` = `L.sprites.src` (`:781`).

---------------------------------------------------------------------------------------------------------------------
## 7. Loading / boot crawl

- All in `index.html`: comment `:33-35`, preload `:36`, CSS `:38-45`, 12 s safety `:47`, element `:64` (`<div id="boot"><i class="boot-oct">`). Not in intro.js/app.js except `html.booted` (added 2 rAFs after boot `js/app.js:4855`). Intro layer `.intro` is z-index 80 above `#boot` (z 79) (`css/intro.css:32`).
- Sprite `assets/ui/loading_oct.png` 448×39 = 8 cells of 56×39 (manifest `ui.loading.oct`), baked from the 3D octopus by `tools/make-loading-oct.js` (walkPortrait, hw 1.75, default red).
- Motion today: `.boot-oct { left:0; top:50%; width:112px; height:78px; background-size:896px 78px }` = **2 CSS px per art px**; `boot-walk .8s steps(8)` legs; `boot-cross 5.6s linear -1.6s infinite` from `translateX(-112px)` to `translateX(100vw)`; reduced motion = static centre (`:43`).
- Why it "barely moves" (esp. desktop): the cover lives only until the scene's 2nd frame (fast on desktop, often <1 s) and starts at 28.6 % of the path (x ≈ 23 px on a 360 phone, ≈ 469 px on 1920 desktop); duration is fixed, so speed scales with width (84 px/s on 360, 363 px/s on 1920) while the 0.8 s leg cycle does not (skating). Crispness: 2 CSS px per art px = 5.25 dev px at DPR 2.625 (uneven), and the continuous translate lands on fractional dev px.
- Plug points for "centre → right edge, repeat, same on phone and desktop": the CSS block `:38-45`; a dev-px scale var can be set from the head script `js/fs-snap.js` (runs synchronously, exposes `PPOL_FS_SNAP`); keep the static `#boot` markup and `html:not(.booted) #oct-svg` rule (smoke Z regex `tools/smoke.js:7190-7194`).

---------------------------------------------------------------------------------------------------------------------
## 8. Tests round 6 will likely touch

| change | tests to update |
|---|---|
| ding + bell picture | test-cook-audio A/B/H/I sequences; test-cook-live (stats, frames); test-cook-stickers-live K1 (cue order if a new act is cued); test-haptics (no new kitchen buzz name) |
| bigger spatula/knife | test-cook.js `:979-981`, `:1062-1064`, art determinism `:833-840`; test-cook-live L6 (knife follows) |
| bigger stickers | test-cook-stickers-live K2 `:273` (s = 32n/dpr), K3 (hidden sizes); `js/cook.js:1502-1509` rule |
| straight '+' cut | test-cook.js §6 `:366-414`, §11 tags `:583,601`, TUNE_HASH `:37,:567` (if TUNE), art §16/§17; test-cook-live L1 `:231` |
| new recipes | test-cook.js `:38-42` (1 recipe, createRun('miyeok') null), VOCAB `:770`, BANNED `:744`; test-cook-live N6 `:1259` buzz counts, L1/L8 stations; test-cook-stickers (RECIPES scripts) |
| dish result to game | smoke Z message log (`tools/smoke.js:7266-7296` records `ppolCook` messages) |
| table/sofa in play room | test-scene-perf T5 (≤60 calls, programs) and T7 lanes `:544-547` / checks `:557-562`; smoke J play-room spots/oct overlay `:3873` |
| octopus in play room | smoke J (`oct` hidden), Y (salon guard `inPlay && !octWithMe`), test-scene-perf T5/T7 (programs, obstacles), scene description |
| demo decision lines | test-brain honest suite `:1852-1905` (+ add new module to scan list) ; test-model-voice |
| MCP decision kind | `mcp/test/run.js` (manual), `tools/test-api.js` if api/ changes, `tools/test-export.js` (new top-level paths) |
| runner sprite | smoke R `:2049-2050`, R2/R3 |
| boot crawl | smoke Z `:7190-7194` |
| any Korean text | `python3 tools/subset-fonts.py --check` (CI 'fonts'); smoke U glyph rules |

## 9. Lane-boundary hints (shared files)
Shared hot files: `js/app.js`, `js/scene3d.js`, `tools/smoke.js`, `index.html`, `css/style.css`. Kitchen work stays in `cook.html`, `js/cook.js`, `js/cook-art.js`, `css/cook.css`, `js/cook-stickers.js`, `css/cook-stickers.css`, `foley/`, kitchen tests; the dish→game message needs one small edit on each side (`cook.html:93-105` + `js/app.js:4052-4059`). Runner: `js/runner.js` (+ maybe a bake tool like `tools/make-loading-oct.js`). Boot: `index.html:33-47` only. Eating: `js/scene3d.js` buildPlayRoom/player/octopus + `js/app.js` new block near `openCook` + new pure module + `index.html` button; MCP/api only if the model path is built now.
