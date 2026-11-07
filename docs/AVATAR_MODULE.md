# Modular player avatar

Built against `ee6a25741a13d2765105d02a9828b5fcede6243f` on `ccr-38ad393e-15xr9t`.
Work branch: `codex/modular-player-avatar`.

## What this adds

A 16×24 pixel character shared by the wardrobe, 2D games and a Three.js r128 billboard.
The art uses the repository's Apollo palette and the slot IDs in `PLAYER_PROGRESSION.md`.
`eyeColor` is a new slot; the planned `eyes` slot remains reserved for glasses/goggles.

- Four hair shapes and four hair colours.
- Five eye colours and five skin tones.
- Cream tee, striped tee and navy hoodie.
- Navy trousers, brown shorts and checked skirt.
- Standing, four walking frames, idle/blink/happy expressions.
- Standalone wardrobe, explicit save, undo, transparent PNG and JSON export.
- Canvas 2D fallback for devices without WebGL.

All files are additions. No changes to `app.js`, `scene3d.js`, `index.html`, the existing save data, wallet, model behaviour or build system.
The demo is a review page; adding the modules does not automatically change the live game's UI.

## Files to merge

| File | Responsibility |
| --- | --- |
| `js/avatar-parts.js` | Frozen art layers, colour ramps, item IDs and defaults |
| `js/avatar.js` | Pure raster composition, validation, descriptions, bounded cache; Canvas helpers |
| `js/avatar-three.js` | Three.js texture/material/group, pixel snapping and disposal |
| `js/avatar-editor.js` | Optional editor with host callbacks; no persistence |
| `css/avatar.css` | Styles scoped under `.avatar-editor` |
| `avatar.html`, `js/avatar-demo.js`, `css/avatar-demo.css` | Standalone review page only |
| `tools/test-avatar.js`, `tools/avatar-browser.html` | Pixel and browser checks |

There are no new npm dependencies. Use the existing `vendor/three.min.js` (r128).
Scripts are ordinary scripts, so `avatar.html` also works when opened as a local file.
Browser QA uses iframes and should be served over HTTP.

## Try it

Open `avatar.html`. It uses a separate `ppolppol_avatar_demo_v1` storage key.
Changes preview immediately; only **이 모습으로 할래** persists them.
The PNG is 128×192 with transparency; JSON contains only version and validated appearance.
This demo has front-facing pixel art, not a rotatable volumetric human model.

For a single offline review file, run `node tools/bundle-avatar.js` and open `dist/avatar-preview.html`.
The bundle embeds the existing Three.js and its MIT license, plus all local styles/scripts; it needs no CDN.
`exports/player-avatar-module.zip` contains the source additions and this one-file preview.

## 2D integration

Load `avatar-parts.js` and then `avatar.js`. No Three.js is required for this path.

```html
<script src="js/avatar-parts.js"></script>
<script src="js/avatar.js"></script>
```

```js
var look = AVATAR.validate(state.player && state.player.look);
var image = AVATAR.compose(look, {
  frame: 'stand',       // stand, walk0, walk1, walk2, walk3
  expr: 'idle',         // idle, blink, happy
  outline: true
});
ctx.imageSmoothingEnabled = false;
ctx.drawImage(image, Math.round(x), Math.round(y), 16 * 4, 24 * 4);

var portrait = AVATAR.face(look, 'idle'); // 16 x 16
var words = AVATAR.describe(look);      // factual appearance only
```

`AVATAR.pixels(look, options)` returns `{width, height, data}` in browsers or Node.
Returned pixel buffers and canvases are owned by the caller; mutating them does not corrupt the cache.
The internal cache holds at most 96 raster frames. It has no timers, DOM listeners, storage or network.

## Wardrobe integration

Also load `css/avatar.css` and `js/avatar-editor.js`.

```js
var wardrobe = AVATAR_EDITOR.mount(container, {
  look: state.player.look,
  onChange: function (look) {
    // Preview only. Do not write the game save on every radio-button change.
    renderPlayerPreview(look);
  },
  onSave: async function (look) {
    // Supply the real host save function here. The editor never owns game state.
    await commitPlayerLook(look);
  },
  onCancel: function () {
    // Optional: close the host sheet. The preview has already been reset.
  }
});

wardrobe.getLook();
wardrobe.setLook(newLook); // updates controls; deliberately does not fire onChange
wardrobe.destroy();       // removes listeners and its own form, not the container
```

`renderPlayerPreview` and `commitPlayerLook` above are callbacks supplied by the host, not existing APP APIs.
Use the app's normal save/migration/export path to update `state.player.look`; do not copy the demo's storage key into the game.
A rejected/throwing save callback displays failure and does not advance the undo baseline.
The editor uses real radio inputs, focus rings, labels and a polite status message.
Multiple editors have unique input group names and independent state.

## Three.js integration

Load the repository's Three.js, the two core scripts, then `js/avatar-three.js`.

```js
var actor = AVATAR_THREE.create({
  THREE: THREE,
  look: state.player.look,
  pixelWorldSize: 1 / 27,
  outline: false // existing scene supplies its own outline; true in a plain scene
});
scene.add(actor.object);           // THREE.Group, stable host/world anchor
actor.object.position.set(0.8, 0, 0.5);

// Use the existing loop. The adapter creates no renderer or requestAnimationFrame.
actor.setPose({frame: reducedMotion ? 'stand' : 'walk' + frameIndex, expr: 'idle'});
actor.snapToCamera(camera, renderTarget.width, renderTarget.height);
// Then render the host scene as usual.

actor.setLook(nextLook);           // reuses the same CanvasTexture object
actor.object.visible = false;    // hide outside player activities
actor.dispose();                  // removes group; disposes owned texture/material once
```

`actor.object` is the host anchor; `actor.sprite` is the camera-facing visual child.
Pixel snapping moves only the child, so camera changes cannot accumulate changes in the saved world position.
Use a non-mirrored, non-sheared ancestor transform. An unscaled scene parent is the simplest integration.
The orthographic camera's aspect must match the render target. Pass **low-resolution target dimensions**, not CSS or device-pixel dimensions.
Perspective cameras return `false` from `snapToCamera`; this adapter does not promise a fixed pixel grid in perspective.

`scene3d.js` currently keeps `scene`, `camera` and render targets inside `init`.
Add the actor inside that closure and expose narrow methods such as `setPlayerLook`, `setPlayerVisible` and `setPlayerPosition` on its returned controller.
Call `snapToCamera` before its colour pass and `dispose` in its existing `destroy` method.
Keep the host's activity rules: the player need not stand in the octopus's room permanently.

**Post-processing integration still needs a visual check.** The current room also renders normals using `scene.overrideMaterial`.
Verify that this pass preserves the sprite's alpha silhouette; a generic override can turn an alpha sprite into a rectangle.
Use an alpha-aware actor normal pass or exclude it from the normal-edge contribution if required.
The adapter's colour/depth material uses `alphaTest: 0.5`, `depthWrite: true`, `transparent: false`, nearest filtering and no mipmaps.
The normal-pass hook is intentionally not patched into the large shared scene file in this module-only change.

## Add an item

Add a catalogue entry and the corresponding grid in `avatar-parts.js`; keep all coordinates within 16×24 and colours in Apollo.
Grid tokens map to the chosen three-shade ramps. Hair back, body, clothes, face and hair front compose in that order.
The 1px outline is applied once to the finished silhouette, using OKLab lightness ×0.62 and nearest Apollo colour.
Run the checks below after adding art. New supported IDs need the host's own ownership/unlock rules if they are sold later.
The current validator renders unknown IDs as per-slot defaults; it does not mutate the incoming object.
Preserve unsupported future inventory entries in the host save, as the progression spec requires.

## Verification

```sh
node tools/test-avatar.js
# Serve the repository with its usual static server, then open:
# /tools/avatar-browser.html
```

See `AVATAR_QA.md` for results and the exact remaining rendering limitation.
