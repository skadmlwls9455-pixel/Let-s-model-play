# 3D(Blender) → 픽셀아트 스프라이트 파이프라인 조사 (Pixel3D dossier)

Project: isometric rainy attic, small octopus, lantern with 9 lighting stages, 8 props appearing one by one, 5 anchors (door, window, crate, cork board, blanket), 8 poster "dioramas" (3:4). Runtime: browser, layered PNG sprites, `image-rendering: pixelated`.

Question: does modelling in Blender and pixelating the render save time versus hand-drawing?

Short answer: **yes for the room, the 9 lighting stages and the props; probably no for the octopus; a toss-up for the posters.** The 3D route wins where you need *many consistent variants of the same thing* (lighting stages, per-stage prop renders, zoom/thumbnail pairs of the posters). It loses where the subject is tiny and organic (a 32-px octopus with 8 tentacles). The recommended plan is a hybrid, validated with a 1-day spike before committing (section 4).

Research note: docs.blender.org, MDN, gamedeveloper.com, 80.lv, YouTube, Gumroad and Superhive were outside this session's network allowlist; facts from them come from search-engine summaries, marked "(via search)". GitHub stars: GitHub Search API, 2026-11-04.

---

## 1. 알려진 기법 (Known techniques)

### 1.1 t3ssel8r's real-time 3D pixel art (Unity)
t3ssel8r is the reference point for the "3D pixel art" look (isometric, chunky, quantized lighting, 1-px outlines, grass/trees that still read as pixel art). What is verifiable:

- Channel: https://www.youtube.com/c/t3ssel8r (link taken from his GitHub profile https://github.com/t3ssel8r, which has no public repos). He works in Unity; the 2021 Cascadeur interview confirms a 3D pixel-art game with a technical designer doing modelling/animation: https://cascadeur.com/blog/general/making-an-animation-for-a-3d-pixel-art-game (via search). I could not resolve the exact URL/title of his "pixel art 3D" devlog video from inside this session; treat the video title as unverified and find it on the channel page.
- Technique, as reconstructed by people who re-implemented it (David Holland's Godot write-up https://davidholland.netlify.app/articles/3d-pixel-art-rendering, via search; Robert-K/godot-3d-pixel-art, 22 stars, https://github.com/Robert-K/godot-3d-pixel-art):
  - Render to a **low-resolution orthographic buffer**, upscale nearest-neighbour (or "sharp bilinear").
  - **Pixel-perfect camera**: snap the camera to the low-res pixel grid and apply the sub-pixel remainder when blitting, so motion is smooth without texture shimmer (Godot demo: https://github.com/BradFitz66/Godot-3D-pixel-art-camera, 17 stars).
  - **Quantized ("toon") lighting**: N-step ramps; Holland: "nothing particularly special about the lighting setup".
  - **Outlines** from depth/normal buffers at the low resolution, hence exactly 1 px, plus convex-edge highlights; Holland doubts a universal outline shader exists for all models/angles.
  - **Stepped animation playback** (8-12 fps) to mimic sprite sheets (Robert-K README).
  - Hard problem: screen-space effects (bloom, god rays) shimmer with the camera; the 2026 "Texel Splatting" paper (arXiv 2603.14587) cites his video for exactly this.
- A commercial Unreal plugin on Fab reproduces the look (ortho pixel rendering, sharp-bilinear upscale, silhouette vs crease outlines): https://www.fab.com/listings/816f34f2-1a2e-4910-b3dd-009b5da0873b.

Relevance: all of this is *real-time* machinery. With **pre-rendered PNGs and a fixed camera** you get the pixel-perfect camera for free and need no shader work. That is the single biggest simplification.

### 1.2 Blender-native "render it as pixel art"
The offline version of the same idea. The standard recipe (BNPR "Pixel Art Basics" guide https://bnpr.gitbook.io/bnpr/pixel-art/pixel-art-basics, via search; int-ua templates https://github.com/int-ua/blender-pixelart, 35 stars, CC-BY-4.0, Blender 2.8x/2.9x era):

1. **Orthographic camera** at rotation X=60°, Y=0°, Z=45°: the classic **2:1 dimetric** projection (cos 60° = 0.5 foreshortens the floor exactly 2:1, so edges are clean 26.565° pixel staircases). **True isometric** (X=54.736° = 90° − atan(1/√2)) gives 1:√3 lines that never land on a clean staircase, so pixel artists avoid it. Sources: GameFromScratch (60/45, 64×32 frame) https://gamefromscratch.com/creating-isometric-tiles-in-blender/; Blender3DArchitect on 54.736° https://www.blender3darchitect.com/architectural-visualization/create-true-isometric-camera-architecture/; the archived `create-isocam` add-on (146 stars) creates TrueIsocam 54.736°, GameIsocam 60° (64×32 tiles) and GameIso4to3cam 41.5° (64×48 tiles) https://github.com/jasonicarter/create-isocam.
2. **Render at the final pixel resolution** (320×240 at 100%); no upscaling in Blender. Alternative: render 3-4× and shrink with compositor **Scale → Pixelate** (the manual describes Pixelate as the non-smoothed companion to Scale; current versions add a **Pixel Size** property: https://docs.blender.org/manual/en/latest/compositing/types/filter/pixelate.html, via search).
3. **Kill anti-aliasing**: Film → **Filter Size 0** (default 1.50 px), EEVEE samples = 1; no bloom/motion blur/DOF. Caveat: issue #130669 reports that since 4.3 filter 0 blurs the *viewport* while the *render* stays pixelated (https://projects.blender.org/blender/blender/issues/130669, via search); the paid Pixel Kit add-on uses 0.01 plus a few TAA samples instead (via search).
4. **Colour quantization**: compositor **Posterize** node (Steps per channel; 8 steps = 512 colours; manual via search https://docs.blender.org/manual/en/4.1/compositing/types/filter/posterize.html) for a coarse clamp, or **Color Ramp (Constant)** on Shader-to-RGB for N-step toon ramps per material. Lock the final 24-32 colour palette *after* rendering in Aseprite (load palette → Sprite → Color Mode → Indexed; "More Options" picks the dither; https://community.aseprite.org/t/color-reduction-in-aseprite/21606 via search) or in PixelOver.
5. **Ordered (Bayer) dithering**: free Eevee dither node group with 2×2-8×8 Bayer patterns (https://blenderartists.org/t/sharing-eevee-dither-material/1145338); rule from that thread: dither resolution must equal render resolution or pixels stop being square. Lucas Roedel's free "Pixel Art rendering" add-on bundles Bayer dithering, multi-light support and indexed/dynamic materials (Gumroad $0+, >100k downloads, via search https://lucasroedel.gumroad.com/l/pixel_art; fork https://github.com/Tramshy/pixel-art-addon-mod, 9 stars). Caveat from the fork: EEVEE output in 4.5+ produced discoloured pixels; 4.1 was clean. Pin your Blender version once the spike works.
6. **Outlines**: (a) compositor edge detection on Normal + Depth passes (Filter Sobel → threshold → multiply) gives exactly 1-px lines because it runs at output resolution; (b) **inverted hull** (Solidify, flipped normals, backface-only material) is cheap in EEVEE/Cycles but world-unit thick, so ≥ 3 cm at 32 px/m; (c) **Freestyle** is controllable but anti-aliased and slow to iterate. Overview: https://www.blendernation.com/2023/09/12/10-outline-techniques-i-wish-i-knew-sooner/. A Godot experimenter found inverted hulls "not consistent" and Blender outlines hard to match to an engine camera (https://github.com/astrellon/godot-3d-pixel-art, 31 stars); a fixed camera removes the second problem.
7. **Bloom**: removed from EEVEE in 4.2 in favour of the compositor **Glare (Bloom)** node (https://developer.blender.org/docs/release_notes/4.2/eevee_migration/, via search). At 320×240 it is a chunky blob; make glow its own layer (section 6).
8. **Isometric diorama workflow** in the wild: IsoCam + BlenderKit assets (Archademia course, via search); "Santorini by Night", an iso scene built as a lighting test bed https://www.blendernation.com/2022/02/21/behind-the-scenes-santorini-by-night/; Maciej Drabik's pixel-style 3D rainy scene (80.lv, via search) is the closest aesthetic match to your attic.

Sprite-sheet add-ons (only if you render the octopus): Spritify (61 stars) https://github.com/FreezingMoon/Spritify; Blender-Spritesheet-Renderer (30) https://github.com/chrishayesmu/Blender-Spritesheet-Renderer; AUTeddy's free 8-Directions Render plugin https://auteddy.itch.io/8-directions-render-plugin-for-blender (via search). For pixel-art *textures* on 3D meshes: Pixel-Unwrapper (436 stars) https://github.com/noio/Pixel-Unwrapper.

### 1.3 Engine-side pixel shaders (comparison only; a PNG game needs none of them)
- Godot 4: CBerry22's post-process shader tutorial source (198 stars) https://github.com/CBerry22/3d-Pixel-Art-In-Godot-4; Dead Cells-style 3D→2D in Godot (14) https://github.com/YouhuaUncle/Pixel-art-3D-to-2D-rendering-in-Godot; CC0 colored Bayer dither shader https://godotshaders.com/shader/colored-dithering/.
- Unity: **ProPixelizer** (URP; per-object pixelization, palette reduction, dithering, outlines, camera/object snapping against "pixel creep"; v1.8.2 Oct 2024, $15-30) https://sites.google.com/view/propixelizer/home (via search). Free: https://github.com/Kitbashery/3D-Pixel-Graphics-Toolkit (13 stars).
- Web: three.js `RenderPixelatedPass` (pixel size + normal/depth edge strengths 0.3/0.4) https://threejs.org/docs/pages/RenderPixelatedPass.html, relevant only if you ever render the attic live instead of shipping PNGs.

### 1.4 Standalone tools
- **PixelOver** (Godot-based, Windows/macOS/Linux, itch $19-30 with Steam key, demo available): imports .obj/.vox and multi-object .gltf/.glb/.fbx/.dae (developer recommends glTF), auto-rotates models to export multi-direction sprites, has palette indexation, dithering, "pixel-perfect lines", bone animation, sprite-sheet export. Still "in development" (0.18.x, Nov 2025). https://deakcor.itch.io/pixelover, https://docs.pixelover.io/manual/import/ (via search). This is the most direct "drop a glTF in, get a palette-locked sprite out" tool and a good fallback if Blender's compositor feels heavy.
- **Aseprite** (40,646 stars, source-available) https://github.com/aseprite/aseprite: indexed-mode conversion with dithering, palette management, onion-skin, sprite-sheet export. Essential as the *last* step regardless of pipeline. Free alternative **Pixelorama** (10,979 stars) https://github.com/Orama-Interactive/Pixelorama.
- **Pixel Composer** (1,433 stars; node-based pixel VFX editor with some 3D nodes, import reported flaky) https://github.com/Ttanasart-pt/Pixel-Composer: rain/glow effects, not the main pipeline. **Asset Forge** (Kenney; kit-bash + 2D sprite export, default preset 45° not iso, flat lighting) https://kenney.itch.io/assetforge: quick prop block-outs. **SpriteKiln** (81 stars; YAML procedural models → palette-locked 8-direction sprites, no Blender) https://github.com/LucasJRamos/spritekiln: simple props only.

---

## 2. 3D→2D 스프라이트를 쓴 게임들과 교훈 (Games and lessons)

- **Dead Cells (Motion Twin, 2017-18).** Characters and monsters are 3D models (3ds Max, one artist: Thomas Vasseur, sole artist for about a year) rendered to 2D frames by a small in-house tool. A developer said in a 2020 Reddit AMA that artists do **not** paint over the renders and that swapping/adding animations is far faster than hand-drawing. Vasseur's "Art Design Deep Dive: Using a 3D pipeline for 2D animation in Dead Cells" (Gamasutra, Jan 2018; reprint https://www.jikguard.com/news/art-design-deep-dive-using-a-3d-pipeline-for-2d-animation-in-dead-cells; interview https://80.lv/articles/interview-with-the-developers-of-dead-cells; via search) stresses animation is still *planned like 2D*: keys first, in-betweens once the motion reads. Lessons: the saving is in **re-use and iteration**, not the first asset; models were designed to render clean at low res (flat ramps, strong silhouettes); and, correcting a common assumption, the verifiable statements say *no* per-frame hand touch-up.
- **Octopath Traveler / HD-2D (Square Enix, UE4).** The opposite split: hand-made 2D pixel sprites on fully 3D environments. Developers note the sprites "resemble flat sheets of paper", so camera rotation had to be limited (Unreal interview, via search https://www.unrealengine.com/developer-interviews/octopath-traveler-ii-builds-a-bigger-bolder-world-in-its-stunning-hd-2d-style; https://en.wikipedia.org/wiki/HD-2D). Lesson: mixed densities survive only with a locked camera and engine-side lighting.
- **A Short Hike (2019).** Plain 3D rendered to a small texture with flat shading, no AA, soft outlines, reduced palette; "Pixel Size" became a player option because some disliked the chunkiness (via search https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/). Lesson: low-res readability comes from flat shading + outlines, not detail.
- **Return of the Obra Dinn (2018).** 3D through 1-bit dithering. Pope's TIGSource devlog (topic 40832, Oct 2017; via search https://setsideb.com/?p=5672, https://www.pcgamer.com/uk/lucas-pope-on-the-challenge-of-creating-obra-dinns-1-bit-aesthetic/) documents the core pitfall: dither crawls whenever the camera moves; he pinned the pattern to a sphere around the camera. Lesson: dithering is safe only because your camera is fixed; never dither the moving octopus.
- **Donkey Kong Country (1994)** pre-rendered SGI models to SNES sprites; Diablo II, Fallout and Jagged Alliance 2 are commonly cited pre-rendered isometric games (community wiki https://vsrecommendedgames.gametechwiki.com/index.php/Games_with_Pre-rendered_Isometric_Graphics; developer confirmation not verified here). Diablo II's layered-equipment sprites are the precedent for "props as separate layers".
- **Community time anecdotes** (unverified): claims range from "<3 h rendered vs ~20 h by hand" (a tool seller) to "the 3D route took far longer" (r/blender, 2021). Forum veterans agree hand-drawing is faster *for small sprites* and 3D pays off only with many angles/variants (via search https://gamedev.net/forums/topic/539529-3d-models-and-isometric-sprites-which-takes-more-time/).

---

## 3. 이 프로젝트를 위한 권장 파이프라인 (Recommended pipeline, with numbers)

### 3.1 Canvas and density
- **Internal canvas: 320×240 at 1×** (4:3 suits a room diorama). Alternative if you want more detail: 384×288. Decide once; every sprite shares this density.
- **World scale: 32 px per metre** → camera **Ortho Scale = 320 / 32 = 10** (ortho scale is the world width across the frame's long side). A 1 m floor tile then draws as a 45×23 px diamond; a 30 cm lantern ≈ 10 px; a ~1 m octopus ≈ 32 px tall. If you want textbook 64×32 tiles instead, use 45.25 px/m (ortho scale 7.07).
- **Integer scaling in the browser**: `S = floor(min(innerWidth*DPR/320, innerHeight*DPR/240))` in *device* pixels, then CSS size = `320*S/DPR × 240*S/DPR`. Examples: 1080p at DPR 1 → S=4 (1280×960); 1440p → S=6; a 390-px-wide phone at DPR 3 → S=3 (960 device px). Recompute on `resize` (browser zoom changes DPR).

### 3.2 Camera and render settings (Blender 4.2+ EEVEE, or Cycles)
- Camera: Orthographic, rotation **(60°, 0°, 45°)**; pick the Z (45/135/225/315) that looks into the attic's back corner. Lock the camera object; never move it after the spike. Resolution 320×240, 100%.
- Film: **Filter Size 0** (0.01 if your version misbehaves); **Transparent ON** for every layer except the base room.
- EEVEE: samples **1** for hard aliased edges (or 16-64 plus the alpha threshold in 3.5). Cycles: 64-128 samples, filter 0.01, **denoise OFF**; 320×240 frames take seconds, so Cycles is fine if you want softer lantern shadows.
- Colour management: View Transform **Standard** (not AgX/Filmic), Look None, so quantization is predictable. Off: motion blur, DOF, screen-space refraction, glare.
- Pin the Blender version that passes the spike (4.1 clean, 4.5+ discoloured in the Roedel fork's tests).

### 3.3 Lighting for the 9 lantern stages
- **One Point light** (radius 0.05-0.1 m) inside the lantern + an **Emission** shader on the lantern glass. Add a constant cool **window light** (Area light, bluish ~#6B8CFF, low power) so stage 0 is "rainy night", not black.
- Keyframe lantern **Power** on frames 1-9 with a roughly geometric ramp so every step crosses at least one palette band after quantization, e.g. **0, 2, 5, 10, 20, 35, 60, 100, 160 W** (tune on the spike), and Emission Strength **0 → 8** in the same frames (warm colour ~#FFB462). Tie both to one custom property with drivers if you want a single slider.
- Render **Animation, frames 1-9** to `room_L##.png`. That is the whole cost of 9 lighting stages: one keyframe ramp and a few minutes of render time. Hand-drawing nine lighting variants is the single most expensive item in the 2D alternative, which is the main argument for 3D here.

### 3.4 Props as separate layers with the same camera
- One **Collection per prop** (8) + `Room`. In the View Layer set `Room` to **Holdout** (and, in Cycles, Indirect Only) while rendering a prop, so the prop is correctly occluded by walls/furniture and still receives the room's shadows, but the room itself renders transparent. Film Transparent ON.
- Because props are lit by the lantern, render **props × stages = 8 × 9 = 72 PNGs** plus 9 room PNGs; at 320×240 each is a few KB and the whole batch is minutes. Drive it with a small `bpy` loop: for each stage frame, for each collection, toggle `hide_render`/`exclude`, set `scene.render.filepath`, `bpy.ops.render.render(write_still=True)` (pattern confirmed in community scripts, e.g. https://gist.github.com/robert-wallis/cd0d547f36121d9e151d9eb6cab0b736, via search). Keep full 320×240 frames (do not crop) so layers align by construction; crop later with a script if download size matters.
- Tinting neutrally-lit props per stage with CSS `filter: brightness()` is the cheap alternative, but it breaks the locked palette; prefer the 72 renders.

### 3.5 Palette, dithering, outline, alpha
- **Palette: 24-32 colours** for the whole scene including all 9 stages (a lantern ramp needs 4-5 shades of wood, 3-4 of wall, 3 of blue rain-light). Build it in Aseprite from the brightest and darkest stage renders, then lock *every* PNG to it: Sprite → Color Mode → Indexed with the palette loaded, dither "ordered" (Bayer) at low strength, or Floyd-Steinberg OFF (error diffusion crawls between frames).
- **Dithering**: Bayer 4×4 at roughly 25-50% only in the lantern falloff on walls/floor; **none** on props smaller than ~24 px and none on the octopus.
- **Outline**: 1 px dark outline on props and octopus from compositor edge detection on the Normal + Depth passes (threshold the Sobel result, multiply); none on walls/floor. Alternatively inverted hull ≥ 3 cm thick on the octopus only.
- **Alpha**: with 1 sample and filter 0 the alpha is already binary; if you use more samples, threshold it (`Math > Greater Than 0.5` on alpha → `Set Alpha`) so no half-transparent fringe pixels reach the browser. Pixel Kit's "Sharp Edges" option does the same (via search).

### 3.6 The octopus
Honest take: at 32 px tall each tentacle is 2-3 px wide. A 3D render will be mush unless you spend real rigging time, and rigging 8 tentacles is the hardest thing in this project.

- Needed frames: idle 4, walk 6 × 2 facings (mirror NE/NW and SE/SW; accept that lantern shading is mirrored too), sit-on-blanket 2-4, window-look 2, board-read 2, door 2, crate 2 → **~30-40 frames of 32×32**, 6-8 fps via `steps()`. Lighting: do **not** render the octopus per stage/anchor (5 anchors × 9 stages × 40 frames = 1,800 renders); instead make **3 palette variants** (dark/mid/bright) of one sheet and switch by stage.
- If you do go 3D: body + 8 chains of 3 bones (24 bones), FK or Spline IK, with **Noise F-curve modifiers** on tentacle rotations (strength ~0.05-0.1 rad, scale 20-40 frames, phase offset per tentacle) for free idle wiggle, or a **Wave modifier** on the mesh as the "fast and dirty" option (https://blenderartists.org/t/octopus-rigging-wavy-tentacle-rigging/1287021). Softbody/cloth tentacles look best and are a rabbit hole.
- Recommended: **hand-draw the octopus in Aseprite**, using a grey 3D block-out as onion-skin reference for the walk if useful. Mixed pipelines are normal; the only rule is same density, same palette.

### 3.7 Posters (8 dioramas, 3:4)
- In-room they are ~**18×24 px**, where a rendered room is noise. If posters are zoomable, add a second **poster canvas** at **120×160 (×S)** with its own integer scale; 3D pays off because each diorama is built once and rendered at both sizes by changing Ortho Scale (real renders, not downscales). If never zoomed, hand-draw eight 18×24 thumbnails (minutes each).

### 3.8 Keeping motion crisp in the browser
- Most robust: one `<canvas width=320 height=240>` sized by CSS to `320*S/DPR` px, `image-rendering: pixelated`, `ctx.imageSmoothingEnabled = false`, every sprite drawn at **integer** canvas coordinates (MDN guide, via search https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look).
- DOM layers: size each `<img>` to natural×S CSS px; do **not** `transform: scale()` a parent (GPU-scaled animated layers resample bilinearly; Safari has had `pixelated`+`transform` bugs, via search https://kiwix.lema.org/stackoverflow.com_en_all_2023-11/questions/75590028/scaled-canvas-pixelated-bug-on-safari). Declare `image-rendering: crisp-edges; image-rendering: pixelated;`. Position in **multiples of S**: `x_css = Math.round(x_px) * S / DPR`; never animate fractional px.
- Sprite sheets: `animation: walk 1s steps(6) infinite` on `background-position`. Anchor walks: rAF with rounding, or `transition: left 2s steps(N)` with N = distance in 1× pixels (one pixel per step).
- No `will-change: transform` on pixel layers; recompute S on `resize`; UI text outside the canvas (section 6).

---

## 4. 1일 스파이크 계획 (One-day validation spike, ~8 h)

Goal: a block-out attic with one lantern in two lighting states, one prop layer, dropped into the real web page at integer scale, judged against a hand-drawn reference of the same corner.

1. **0:00-0:45 Setup.** New .blend, units metres. Add camera: Orthographic, rotation (60, 0, 45), Ortho Scale 10, resolution 320×240, Filter Size 0, Transparent film, View Transform Standard, EEVEE samples 1. Save as `attic_rig.blend`. (Optional: install `create-isocam` or Roedel's add-on.)
2. **0:45-2:15 Block-out.** Cubes only: two walls + sloped roof, floor, door, window, crate, cork board, blanket lump, lantern (cube + small sphere). Flat colours with 3-step Constant Color Ramps on a Diffuse→Shader-to-RGB chain (EEVEE) so lighting quantizes.
3. **2:15-3:15 Lights.** Point light in the lantern + Emission on the sphere; cool window Area light. Keyframe Power 0 W on frame 1 and 60 W on frame 2 (two stages are enough for the spike). Render both to PNG. Check: can you tell the stages apart after 24-colour indexing in Aseprite? Do walls band nicely or need dither?
4. **3:15-4:15 Layers.** Move the crate to its own collection, set Room to Holdout, render crate alone with transparent film in both stages. Overlay in Aseprite: alignment must be pixel-exact; alpha must be binary.
5. **4:15-5:15 Web drop-in.** Load `room_L1.png`, `room_L2.png`, `crate_L1/2.png` into the game page with the integer-scale code from 3.8; toggle stages; place a 32×32 placeholder octopus and move it 40 px with `steps(40)`. Check on one phone.
6. **5:15-6:15 Hand-drawn control.** Draw the same corner (one stage) in Aseprite with the 24-colour palette. Compare side by side at ×4: which one has the charm you want? Time both honestly.
7. **6:15-7:00 Octopus test.** Render a sphere with 8 cylinders through the rig at 32 px; look at it. This usually settles the "render or draw the octopus" question in a minute.
8. **7:00-8:00 Decide and write down.** Go/no-go per asset class, pinned Blender version, palette file, camera numbers. If the room reads as a blurry 3D screenshot rather than pixel art, try fewer ramp steps, outlines and a smaller canvas (256×192) before abandoning.

Kill criteria: if after 8 h you cannot get a two-stage room that looks like intentional pixel art, go all-2D and use palette-swap + overlay tricks for lighting (see 5).

---

## 5. 정직한 시간 추정 (Honest time estimates, beginner)

Assumptions: "beginner" = comfortable with Aseprite basics, has opened Blender a few times, follows tutorials; working alone. Ranges are wide on purpose. Blender numbers *exclude* a one-time learning tax of **15-30 h** (navigation, modifiers, materials, compositor basics) and the spike day.

| Asset | 3D → pixel (after rig exists) | Hand-drawn (Aseprite) | Notes |
|---|---|---|---|
| Attic room, base | 8-16 h (model, UV-free flat materials, light rig, compositor) | 10-20 h for a 320×240 iso room at this quality | Roughly even for the first state |
| Room × 9 lighting stages | **+1-2 h** (keyframe ramp, render, index) | Palette-swap + light-cone overlay layers: +4-10 h; repainting each stage: +30-60 h | 3D's decisive win; the 2D palette-swap trick is cheaper than people assume but gives flat, shadow-less steps |
| 8 props (with per-stage renders) | 8-16 h modelling (1-2 h each) + ~1 h scripted batch | 6-12 h (45-90 min each) + 3-6 h to re-shade for stages | Even; 3D only wins if props must match 9 stages exactly |
| Octopus, ~6 states / 30-40 frames | 15-40 h (rig 8 tentacles, animate, render, clean-up); high failure risk for a beginner | 10-20 h | Hand-draw. Use 3D only as motion reference |
| 8 poster dioramas (3:4) | 8-16 h (1-2 h per mini-scene) + minutes for thumbnail + zoom pairs | 18×24 thumbnails: 2-4 h total; if zoomable 120×160 pieces: 12-24 h | Even; 3D wins only if posters are zoomable |
| Glow, rain, UI polish | 4-8 h either way (hand-drawn glow rings; CSS rain) | same | Do not try to render rain |
| **Total** | **~45-100 h + 15-30 h learning** | **~45-100 h** | The totals overlap; the 3D path buys consistency and cheap variants, not raw speed |

Takeaway: for a first-time Blender user the full-3D path is **not** faster in wall-clock terms; it is roughly even and front-loaded with learning. The hybrid is the only configuration where 3D clearly wins, because the 9 stages and 72 prop variants are nearly free once the rig exists, and every later change (move the crate, add a prop, re-light) costs minutes.

---

## 6. 함정 (Pitfalls)

1. **Tooling rabbit-hole.** Dither node groups, custom outline passes, Spline IK tentacles, Freestyle tuning: each is a weekend. If "cubes + two lights + Aseprite indexing" is not already charming in the spike, more tools will not fix it. One add-on at most (Roedel's or PixelOver).
2. **Mixed pixel densities.** Every sprite on the room canvas comes from the *same* camera (same ortho scale and resolution); never rescale a rendered sprite; zoomed posters get their own canvas.
3. **Non-integer scaling / moiré.** Fractional CSS scales, fractional `devicePixelRatio` (1.25/1.5 Windows laptops), browser zoom and `transform: scale()` on animated layers all give uneven pixels or shimmer. Compute S in device pixels, size CSS as S/DPR, recompute on resize.
4. **Transparent edges after pixelation.** Multi-sample renders leave half-alpha fringes that read as dirty halos; threshold alpha at 0.5 (or EEVEE samples = 1) and Set Alpha so premultiplied black does not darken edges.
5. **Emissive glow at low res.** EEVEE Next has no Bloom; compositor Glare→Bloom is coarse at 320×240 and can black out on out-of-range values (user reports, via search). Keep the lantern's *light* in the room render; ship the *glow halo* as its own transparent layer (rendered or 2-3 hand-dithered rings per stage) composited with `mix-blend-mode: screen`.
6. **Dithering + motion.** Ordered dither on a moving sprite crawls between frames (Obra Dinn's problem). Dither static layers only; the octopus gets flat ramps.
7. **Text readability.** Keep UI text out of the pixel canvas: normal DOM over it, either a true pixel font at integer multiples of its native size or an ordinary font on a solid/dimmed panel.
8. **Version drift.** 4.3+ viewport blurs at filter 0 (render fine); 4.5+ EEVEE changes broke an add-on's colours. Pin the version; keep the spike .blend as a golden file and re-render after upgrades.
9. **Expecting Dead Cells' speed-up on asset #1.** Their win came from retakes and reuse after the pipeline existed. Your reuse is the 9 stages and 72 prop variants; budget the pipeline build as its own task.

---

## 요약 (Summary, plain-text JSON-like)

{
  "verdict": "Hybrid. 3D in Blender for the attic room (x9 lantern stages) and the 8 props (x9 stages, scripted); hand-draw the octopus in Aseprite (3D block-out as motion reference at most); posters by hand unless zoomable, in which case render each mini-scene twice (18x24 and 120x160). Run the 1-day spike first. For a Blender beginner, total hours are roughly even with all-2D; the gain is consistency and near-free variants, not raw speed.",
  "top_sources": [
    {"title": "t3ssel8r (YouTube channel; Unity 3D pixel art devlogs)", "url": "https://www.youtube.com/c/t3ssel8r", "note": "video URL not resolvable in-session; approach reconstructed via Holland/Robert-K"},
    {"title": "David Holland - 3D pixel art rendering in Godot (t3ssel8r reconstruction)", "url": "https://davidholland.netlify.app/articles/3d-pixel-art-rendering"},
    {"title": "CBerry22/3d-Pixel-Art-In-Godot-4 (post-process shader tutorial source)", "url": "https://github.com/CBerry22/3d-Pixel-Art-In-Godot-4", "stars": 198},
    {"title": "jasonicarter/create-isocam (true-iso 54.736 / 2:1 game-iso 60 / 4:3 iso 41.5 cameras)", "url": "https://github.com/jasonicarter/create-isocam", "stars": 146},
    {"title": "BNPR - Pixel Art Basics (Eevee low-res, Filter Size 0, samples 1, Scale+Pixelate)", "url": "https://bnpr.gitbook.io/bnpr/pixel-art/pixel-art-basics"},
    {"title": "Lucas Roedel - Pixel Art rendering add-on (free; Bayer dither, multi-light) + Tramshy fork with 4.5 EEVEE caveat", "url": "https://lucasroedel.gumroad.com/l/pixel_art", "fork": "https://github.com/Tramshy/pixel-art-addon-mod", "fork_stars": 9},
    {"title": "PixelOver (3D glTF/OBJ to palette-locked sprites, dithering, sprite sheets)", "url": "https://deakcor.itch.io/pixelover"},
    {"title": "Thomas Vasseur - Using a 3D pipeline for 2D animation in Dead Cells (Gamasutra, Jan 2018; reprint)", "url": "https://www.jikguard.com/news/art-design-deep-dive-using-a-3d-pipeline-for-2d-animation-in-dead-cells"},
    {"title": "Blender issue #130669 - Filter Size 0 viewport blur since 4.3 (render still pixelated)", "url": "https://projects.blender.org/blender/blender/issues/130669"},
    {"title": "MDN - Crisp pixel art look with image-rendering", "url": "https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look"},
    {"title": "aseprite/aseprite", "url": "https://github.com/aseprite/aseprite", "stars": 40646},
    {"title": "Ttanasart-pt/Pixel-Composer", "url": "https://github.com/Ttanasart-pt/Pixel-Composer", "stars": 1433}
  ],
  "pipeline_numbers": {
    "canvas_1x": "320x240 (alt 384x288), integer scale S = floor(min(W*DPR/320, H*DPR/240)) device px; CSS size = 320*S/DPR",
    "world_scale": "32 px per metre -> camera Ortho Scale 10; 1 m tile = 45x23 px diamond; octopus ~32 px tall",
    "camera": "Orthographic, rotation X 60, Y 0, Z 45 (2:1 dimetric; true iso 54.736 avoided); locked forever",
    "render": "Blender 4.2+ EEVEE (or Cycles 64-128 spp, denoise off); Filter Size 0 (0.01 fallback); samples 1; Film Transparent for layers; View Transform Standard; no bloom/DOF/motion blur",
    "lantern_stages": "1 Point light r=0.05-0.1 m + Emission on glass; Power keyframed frames 1-9 ~ 0,2,5,10,20,35,60,100,160 W; Emission 0->8; constant cool window Area light; render Animation 1-9",
    "layers": "1 collection per prop, Room collection as Holdout (+Indirect Only in Cycles); bpy loop -> 9 room PNGs + 72 prop PNGs (8 props x 9 stages), full 320x240 frames",
    "palette": "24-32 colours total; Aseprite Indexed with palette loaded; Bayer 4x4 ~25-50% only on static lantern falloff; none on props <24 px or octopus; no Floyd-Steinberg",
    "outline": "1 px from compositor Sobel on Normal+Depth passes (props/octopus only) or inverted hull >= 3 cm; none on walls",
    "alpha": "binary: samples 1, or Math Greater Than 0.5 -> Set Alpha",
    "octopus": "hand-drawn 32x32, ~30-40 frames (idle 4, walk 6x2 mirrored, 5 anchor poses 2-4 each), 6-8 fps steps(); 3 palette-swapped sheets for dark/mid/bright stages; if 3D: 24 bones + Noise F-curve modifiers or Wave modifier",
    "posters": "in-room 18x24 px; if zoomable, separate canvas 120x160 with own integer scale; render each mini-scene twice via Ortho Scale",
    "browser": "canvas 320x240 + image-rendering: pixelated + imageSmoothingEnabled=false, integer coords; or DOM imgs sized natural*S, positions in multiples of S, no transform:scale on animated layers, steps(N) with N = pixel distance; UI text outside the pixel canvas"
  },
  "spike_plan_8h": [
    "0:00-0:45 rig: ortho cam (60,0,45), ortho scale 10, 320x240, filter 0, transparent, Standard view, EEVEE samples 1; save attic_rig.blend",
    "0:45-2:15 cube block-out of attic + door/window/crate/board/blanket/lantern; 3-step Constant Color Ramp toon materials",
    "2:15-3:15 lantern Point light + Emission, window Area light; keyframe 0 W / 60 W on frames 1-2; render; index to 24 colours in Aseprite; judge stage separation and banding",
    "3:15-4:15 crate as own collection, Room = Holdout, render crate alone in both stages; verify pixel-exact overlay and binary alpha",
    "4:15-5:15 drop PNGs into the web page with integer-scale code; toggle stages; move a 32x32 placeholder 40 px with steps(40); test on a phone",
    "5:15-6:15 hand-draw the same corner in Aseprite with the same palette; compare charm and time",
    "6:15-7:00 render a sphere + 8 cylinders at 32 px through the rig to decide render-vs-draw for the octopus",
    "7:00-8:00 go/no-go per asset class; pin Blender version; save palette and camera numbers; kill criterion: if the two-stage room does not read as intentional pixel art, go all-2D with palette-swap lighting"
  ]
}
