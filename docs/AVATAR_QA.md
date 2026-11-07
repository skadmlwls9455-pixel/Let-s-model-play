# Avatar verification — 2026-11-07

## Passed

`node tools/test-avatar.js`: **4,680 frames**.

- All 3,600 combinations of hair shape, hair colour, eye colour, skin, top and bottom in the outlined standing view.
- All 36 geometric hair/top/bottom combinations across five frames, three expressions and both outline modes: 1,080 additional frames.
- Every occupied pixel is fully opaque, every other pixel fully transparent.
- All RGB colours are in the existing Apollo palette.
- Transparent margins remain at all four edges.
- Each character is one connected silhouette, with no isolated pixels or enclosed transparent holes.
- Every eye colour produces a distinct raster; malformed IDs fall back by slot; caller mutation cannot corrupt cached pixels; cache remains bounded.

The checks caught two small collar gaps during walking and a ponytail gap. Those were corrected in the art/body geometry, including the unoutlined Three.js version.

Shared Chromium browser, `tools/avatar-browser.html`: **10 checks passed**.

1. No horizontal overflow in 320px and 360px iframe viewports.
2. Hair, eye colour and clothing controls update the preview.
3. Explicit save stores validated appearance.
4. Reload restores the saved appearance.
5. Undo returns to the last saved appearance.
6. Three.js texture uses nearest filtering without mipmaps, alpha cutout/depth writing, and one reusable texture across 120 appearance updates.
7. Three.js orthographic camera snapping lands on integer pixels without changing the host's world anchor.
8. Disposal fires once for both texture and material even when called twice.
9. Browser Canvas output has only alpha 0 or 255.
10. A throwing save callback displays failure; destroying the editor removes its DOM.

Manual browser review: enlarged character, short/bob/long/ponytail thumbnails, blonde hair, blue eyes and navy hoodie, plus desktop and narrow layouts. Pixel edges are drawn with integer scaling; the fallback room also uses integer rectangles.

## Not verified here

The managed Chromium reports **`Error creating WebGL context.`**. The fallback Canvas view renders correctly, and Three.js object/material/texture/camera logic passed browser checks, but **actual WebGL rendering and forced context-loss recovery were not visually verified**.

The supplied review page will use Three.js automatically where WebGL is available. The QA report explicitly records `webglRendered: false` in this environment; it does not call the fallback a successful GPU render.

The avatar has not been inserted into the existing game's private `SCENE3D` scene. Its normal/depth post-processing needs a separate visual check when attaching the actor, as described in `AVATAR_MODULE.md`.
No existing game files are modified, so the original game's broad test suite was not run on this partial source checkout.

## Scope of the pixel guarantee

The checks cover source rasters and integer Canvas scaling. Browser zoom, perspective cameras, arbitrary CSS transforms or non-integer render-target scaling can resample pixels. Keep host output on an integer grid; this change does not claim every possible third-party renderer configuration is artifact-free.
