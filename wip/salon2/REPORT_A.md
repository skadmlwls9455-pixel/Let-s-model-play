BUILD A is finished in `/home/user/ppolppol-salon2`. Nothing is committed or pushed. All tests are green except test-resume, which fails the same 5 checks on a clean copy of HEAD, so that failure predates this work.

**Heads-up:** another agent is editing `docs/*`, `docs/SALON.md` (new) and `README.md` in this same worktree right now. I didn't touch those, the kitchen files, `audio/`, `salon.js` or the scenes.

## What changed (approx +/− lines)

**`js/app.js`** (+215/−45)
- **Loading:** `salon.js` is now loaded and used (fallbacks kept if it's missing).
- **`defaults()`:** adds `octopus.color` (red), `octopus.colors: []`, `salon: { asks: [] }`, and `settings.octColor` as a copy.
- **`normalize()`:** calls `SALON.normalize(s, { todayKey })`. It first drops the default red when the old record had no `octopus.color`, so an old `settings.octColor` survives as the "first" colour with `by: 'migrated'`. The old octColor regex line is gone.
- **`load()`:** the v1 migration result now goes through `normalize`.
- **Quota copy:** `slimJSON` plus a new `slimAsks()` remove `seed`/`raw` from asks older than 365 days, in the saved copy only. `line` is never removed.
- **`DEV_EXPLICIT`:** true with `dev=1` in the URL or `ppolppol_dev` in this tab's sessionStorage, false with `dev=0`. The automatic file:// / localhost dev mode does not turn it on.
- **`sceneOpts().color`** reads `S.octopus.color`. `renderScene()` ends with `applyLook({ still: true })`, which covers name save, import, reset and the 2D redraw after a lost context.
- **New colour path:**
  - `setOctColor(hex, meta)`: one-argument calls become a dev record. It pushes one `colors` line, sets the colour and the copy, saves once, then calls `applyLook`.
  - Also new: `hasFirstColor()`, `mirrorUp()`, `mineAsks` and `rememberAsk(ask)`.
- **`applyLook(opts)`:** recolours the scene and portraits only if they differ from the record. While `salonActive` it waits instead.
- **`setSalonActive(on)`:**
  - `true` also cancels an in-progress walk to the blanket.
  - `false` applies whatever `applyLook` was holding.
- **Blocked during staging:** tap line, pet, window walk, wander, think bubble, starting a nap, `syncRest` and self-wake.
- **Other tabs:** `adoptRemote` runs `SALON.merge` (with `mineAsks`), saves if anything changed, then calls `applyLook`. The storage handler body moved into `takeRemote(raw)`. New `syncFromStore()` re-reads localStorage on demand, for the moment someone presses 물어보기.
- **Settings:**
  - `COLOR_PRESETS` now comes from `SALON.PRESETS`, and `WHO_LINE` is the §1.2 text.
  - New `colorRows(frag)` at the top of the sheet:
    - Before the mirror there is no colour block.
    - After it: h3 '문어 색' plus "거울 앞에서 {이름}에게 물어볼 수 있어." (name inserted exactly as typed).
    - With `DEV_EXPLICIT`: '개발용 · 바로 바꾸기', the slider and 6 presets. Slider `input` only previews; `change` or a preset writes one dev record.
  - Closing the sheet calls `applyLook`, which undoes an unsaved preview.
- **First run:**
  - `buildNameColors`, `markNameColor`, `drawNamePortrait(hex)`, rewritten `openNameDialog`.
  - The colour row only shows when no 'first' line exists.
  - Focus goes to the title on touch devices and to the name field with `(pointer: fine)`.
  - Saving the name calls `setOctColor(namePick || red, { how: 'first', by: player|default })` in the same single save.
- **Import/reset** clear `mineAsks`.
- **APP exports added:** `applyLook`, `setSalonActive`, `salonActive`, `devExplicit`.

**Other files**
- **`js/runner.js` (+3/−2):** the drawn fallback reads `octopus.color` first, then `settings.octColor`.
- **`index.html` (+12/−6):** `salon.js` loads after `brain.js`. The name dialog is reordered: title, one line, 64 px portrait canvas (the old img is only a fallback), `#name-colors` group, name field, save, honesty line.
- **`css/style.css` (+18/−5):**
  - Name dialog `max-width: calc(100vw - 24px)`, no focus outline on the title.
  - Colour row is one line: 36 px buttons, 44 px hit area, 6 px gap.
  - Dark system theme gets button borders; `.set-color` is styled like `.set-who`.
- **`tools/smoke.js` (+197/−15):**
  - S, settings block: before the mirror there is no colour block; after it, the exact line and no controls. Preset clicks removed.
  - S, other-tab block: checks the dev record line and that tab B's `scene.color()` follows.
  - New scenario O covers the §9.3 first-run checks, plus migration, reset and `?dev=1` vs file://.

## Tests
| Check | Result |
|---|---|
| `npm test` | exit 0 (world OK, brain 505, model-voice 20, runner 568, api 225, cook 169, salon 225) |
| smoke O / S | 26/0 / 57/0, re-run on the final code |
| smoke A, D, F, G, L, V | 133/0 |
| smoke U, T, K, I | 114/0 (I-4 passed this time) |
| smoke R | 14/0 |
| test-audio | 116/0 |
| test-resume (ITER=1) | 43 ok / 5 fail — clean HEAD export also 43/5 |
| font check | `stale: none` |
| bundle | `dist/ppolppol.html` built; first run, save and settings lock work, 0 errors |

- **test-resume failures:** all five are "문어 상태 유효 … st-walk". `0f584fd` didn't update test-resume, and it doesn't set `window.__ppolAwakeMs = 0` the way smoke does, so the octopus is still walking home when the check runs. I left that test alone.
- **First-run layout:** fits at 320×568 in both fonts and 412×780 with no scroll. At 320×460 the save button is visible, but the pixel-font dialog scrolls 12 px.
- **tests/evidence:** restored after every run; `tests/` is clean.

## Judgement calls to confirm
- With `DEV_EXPLICIT`, the dev colour block shows even before the mirror; players still see nothing until lantern 2.
- `WHO_LINE` mentions "미용실 줄" even before the mirror exists (spec text as given).
- If a record has a 'first' line but no name, the dialog hides the colour row.
- `load()` doesn't re-save after normalising; the migrated line is recomputed the same way each load until the next save.
- `ITEM_LEVEL.salon` isn't added yet, so on A alone the settings line appears at lantern 2 without a visible mirror.

## Notes for BUILD B
1. Call `setSalonActive(true)` when staging starts and `false` at the end, on skip, on finish and on lost context. Don't use `oct.busy`.
2. For 물어보기:
   1. `syncFromStore()`
   2. `SALON.canAsk(S, todayKey(), …)`
   3. `SALON.makeAsk(S, { at: Date.now(), today: todayKey(), offer, answer })`
   4. `SALON.commit(S, ask)`, then one `save()`, then `rememberAsk(ask)`
   
   Don't also call `setOctColor` for salon asks; `commit` already writes the colour line and the copy.
3. Still yours: `ITEM_LEVEL.salon` (use `mirrorUp()` / `SALON.MIRROR_LEVEL`), `ANCHORS.salon`, `anchorName`, `allowedIdleAnchors`, `SPOT_DESC.salon` and the `sceneDescText` "몸은 …이야." line, `ROOM_SPOT.salon` and `#btn-salon`.
4. Also yours: `#salon-sheet` (add it to the `bindDialogs` list and `bindSheetDrag`), '대답' in `VOICE_LABELS`, `renderLog`/`dayRows`/`diaryDays`, `goTap` calling `salonFinish` first, guarded `AUDIO.on('salon')`, the '다음 미용실 대답' dev control (`DEV_EXPLICIT`), §9.2 and §9.5.
5. `importJSON`, `resetAll` and `sceneLost` don't check `salonActive`; finish the staging first.
6. Smoke letter O is taken; pick another letter for the 미용실 block. O's `open()`, `dlg()` and `rec()` helpers can be reused. `drawNamePortrait` shows how to draw a portrait in a given colour.
7. My settings changes are at the top of the sheet; the kitchen job's link goes at the very bottom of `renderSettings`, so stay away from there.

Probe scripts are in `/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/salon2/` (`probe-name.js`, `probe-active.js`, `probe-dist.js`); screenshots are in its `shots/` folder.