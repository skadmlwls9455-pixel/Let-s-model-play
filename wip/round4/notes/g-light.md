# G light — notes
Plan:
1. probe (wip/round4/g-probe.js): render attic/loft/play at hours × lantern × weather, measure room luma + stair contrast. Baseline before edits.
2. scene3d: lightAt(h) blended dusk→night 19-21 in 8 steps (cached objects per step so setTime's identity check holds); night lamp 1.5 / lampD 7.5; FIRST_LIGHT.hemiI 0.48.
3. loft/play night: check measurements, lift a little if as dark.
4. stair cue: pale nosing strips (separate mesh, emissive twin, night only) + small lantern on the stair's bottom post (emissive + glow sprite, no light). Loft hatch: nosing on hatch rail + same lantern on hatch post.
5. tests in smoke (new letter?) or existing Z; npm test; perf.
