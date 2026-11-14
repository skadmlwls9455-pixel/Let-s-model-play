# lane A cam — notes (11-15)

Plan
1. yaw: yawDelta() endless, no snap; YAWX state (coast inertia, hold-to-0 for ceremonies/salon/exterior/intro/play kit). setYaw/yaw API.
2. gestures: multi = twist (dead zone 7 deg) + pinch (1.06) together, each starts from its value at engage. Mouse right/shift drag endless. Q/E 15 deg eased.
3. cuts: CUTS {place: [{full, low, nx, nz, cx, cz, th}]}; cutAdd; applyCuts() each frame (cheap). Old walls split post-hoc from merged `parts` by
   band classification (cutSplit) right before the room mesh is built; KEEP boxes for floor furniture (stairs, arcade, kitchen, sewing desk, shelf).
   New walls (front + right) per room: low = null (at angle 0 they are near -> hidden = today's look). Old walls: low = trim cap at knee 0.6.
   Corner pieces: entry with diagonal normal, th 0.707 (cut only when both walls cut). Dynamic wall things (glass, weather, posters, souvenirs,
   curtain, board, shelf, moss, salon) by layer mask 0 (do not fight .visible), recomputed per frame.
   Shadows: shade twin (shade.material, same geometry) of each lower wall mesh as child of the place's shade -> window light patch stays.
4. panBox rotates with _r/_u (already generic). fitShadow box fine (whole room). Hotspots: hide spot when its object is cut.
Baseline shots: wip/round4/shots/a-cam/base-*.png (angle 0 before change)
