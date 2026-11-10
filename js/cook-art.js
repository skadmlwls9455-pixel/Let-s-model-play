/* js/cook-art.js - pixel art for the kitchen corner (wave 9 cooking, slice 1 = haecho-jeon). Global COOK_ART.
 * Plain script, no modules, file:// safe. Painting needs no DOM, so node can paint and hash every picture.
 * Comments stay ASCII (tools/subset-fonts.py scans js/*.js). This file holds no player-facing text at all.
 *
 * BUFFER   { w, h, d }   d = Uint8ClampedArray(w * h * 4), RGBA, alpha is 0 (empty) or 255 (painted), never partial.
 *          Same shape as js/runner.js sprites and as canvas ImageData:  ctx.putImageData(COOK_ART.imageData(buf), 0, 0)
 *          on a 144 x 160 offscreen canvas, then drawImage it at an integer scale with imageSmoothingEnabled = false.
 *          Painters draw INTO a buffer you pass (they never resize it). put() only accepts the 46 Apollo colors and the
 *          24 FOOD colors (it ignores anything else), so a painted buffer can only hold those 70 colors.
 * UNITS    art px, integers. Stage = 144 x 160 art px (input space 288 x 320 logical px = art px x 2: art = floor(logical / 2)).
 * ANGLES   integer degrees in screen space (x right, y down): +deg turns clockwise on screen, 0 = horizontal, 90 = down.
 *          Only the integer table SIN90 is used for angles (no float trig at all), so a saved dish paints the same on
 *          every engine. No random source anywhere: texture noise comes from the integer hash ih(). Same input -> same bytes.
 * LIGHT    from the upper left (warm wall lamp, same side as the play-room lamp). 1 art px lines, no anti-aliasing.
 *
 * LOOK     (design 4.1 + js/cook.js)  look = { v: 1, dents: [[x, y], ...], band: 0..2, cuts: [deg, deg], offs: [px, px], plate: 0..2 }
 *          dents  food-box px (ints): the food box is 64 x 48 art px centred on the food, origin GEO.box0 = [40, 62] in
 *                 the stage, so box = stage - box0. Up to 9. toFood(x, y) / fromFood(fx, fy) convert.
 *          band   0 soft, 1 golden, 2 crisp  (face colors #e8c170 / #de9e41 / #be772b, edge #884b2b).
 *          cuts   per cut line: signed deviation from that line's guide angle, a multiple of 6, drawn clamped to +-30.
 *                 jeon guides are GEO.cross = [0, 90] (horizontal line first, then vertical): the dish shows a cross.
 *          offs   per cut line: its seeded guide offset in art px (-4..4), down for line 0, right for line 1.
 *          plate  0 paper, 1 sky, 2 pink.     herb ('parae' | 'tot') comes from the run's swaps and is passed as o.herb.
 *          Unknown look.v or broken fields fall back to the default look (dish() and dishSmall() never throw).
 *
 * HELPERS  blank(w, h) clone(b) copy(dst, src) clear(b) put(b, x, y, hex) get(b, x, y) -> hex | null
 *          rect(b, x, y, w, h, hex) line(b, x0, y0, x1, y1, hex) ellipse(b, cx, cy, rx, ry, hex)
 *          dither(b, x, y, w, h, hex, phase) (50 % checker)   blit(dst, src, x, y) (painted pixels only, clipped)
 *          shake(b, dx, dy) moves everything inside the frame by 1..2 px (slice end, flip, reveal jiggle), frame stays
 *          hash(b) -> uint32 (FNV-1a over w, h, bytes)   colors(b) -> [hex]   sin(deg) cos(deg) -> integer x 4096
 *          imageData(b) / toCanvas(b, scale)   browser only (the only DOM users in this file)
 *
 * SCENES   paint the whole 144 x 160 stage incl. the 2-px frame. Static layers are cached, so calling every frame is cheap.
 *          Coordinates: [x, y] arrays are art px; objects straight from the sim's run.st ({ x, y } marks, dust, hand, slice
 *          lines) are logical px (art = logical >> 1). All dents are food-box px, exactly as in st.dents and look.dents.
 *   counter(b, o)      o = { plate: null | { look, herb }, pending: null | { si, band, herb } }
 *                      plank wall + lamp, wood counter, paper cutting board, the pan (the one live prop in slice 1, button
 *                      box GEO.spot.pan) with half-made food when pending, the last plate beside it (GEO.spot.plate).
 *                      pot / jar shelf / book are NOT drawn; their boxes in GEO.spot are only reserved for later.
 *   tapScene(b, o)     cold pan + raw batter. o = { shape 0..2 (lump / half / round flat; st.shape), dents (st.dents),
 *                      marks (st.marks: { x, y, n } logical + o.per, or [x, y, left] art px; a finished mark is not drawn),
 *                      herb, flash (1-frame #ebede9 rim), squash 0 | 1 (wide) | 2 (tall) (the 2 pre-drawn frames, bottom
 *                      anchored), dust ([x, y] art px or { x, y } logical: a crumb that stays), f }
 *   flipScene(b, o)    o = { heat (st.heat), band (st.band), res (st.res: band it was flipped at, or null) | flipped,
 *                      arc: null | { f: 0..3, lift: 1..3 (the flip event's level; > 3 = art px) }, herb, dents,
 *                      spatula: undefined (rest pose) | null (hidden) | [x, y] art px (blade centre, follows the hand),
 *                      arrow: null | 0 | 1 (bob frame; drawn above the spatula), bump (1-frame hop), flash, still, f }
 *                      heat off: the raw batter palette (nothing browns yet); heat on, before the flip: the raw side is
 *                      up and its rim shows the band; after the flip the cooked face is up.
 *                      arc frames: 0 tilt (raw side), 1 edge-on, 2 tilt (cooked side), 3 landing squash.
 *   sliceScene(b, o)   board + cooked jeon. o = { band (the flip look), herb, dents, lines (st.lines: { ax, ay, bx, by, bins,
 *                      cut, ang } logical, or { x, y, deg, len, cells, cut, cutDeg } art px), cur | guide (lit line index,
 *                      -1 = none), flash (index of the line cut this frame: its gap lights up), hand (st.hand, logical)
 *                      | knife ([x, y, deg] art px; null = hidden; neither = resting on the board), trail [[x, y]], f }
 *                      painted bins become the kerf and drop their guide dashes; a cut line splits the jeon at
 *                      guide angle + ang through the line's centre and the pieces part 1 art px each way.
 *   revealScene(b, o)  o = { look, herb, f 0..5 }: the plate rises 2 px per frame (6 frames at 12 fps), f >= 5 = at rest.
 *   frame(b)           2-art-px stage frame (the scenes already call it last).
 * PIECES   pan(b, P) panHeat(b, P, f) (P = PAN_STEP | PAN_COUNTER) board(b, x, y, w, h, small, handle) batter(b, o)
 *          marks(b, list, f) (each mark stays a whole ring: arcs still wanted amber, arcs already hit sunk in)
 *          jeon(b, { cx, cy, rx, ry, face: 'raw' | 'top' | 'bottom', band, herb, dents, cuts, flash })
 *          dents: hits within 3 px are one round dimple that grows with its count; herbs: wavy strands + clumps
 *          bubbles(b, list, f, still) spatula(b, x, y) arrow(b, x, y, f) guide(b, x, y, deg, len, f, cells)
 *          knife(b, x, y, deg) (x, y = edge point under the finger; handle always to the right / below)
 *          plate(b, color, o) dish(b, look, o) (o = { herb, x, y }; GEO.dish 96 x 66, centred in b unless x / y given)
 *          dishSmall(b, look, o) (GEO.small 40 x 26). js/cook.js drawDish() calls these two with o = { herb, ... }.
 *          hand(b, o)  ghost hand (solid slate outline, 50 % checker fill). o = { kind: 'tap', x, y, f } |
 *                      { kind: 'flick', x, y (start), f } | { kind: 'line', x0, y0, x1, y1, f }   f 0..3 at 12 fps,
 *                      o.still = true for the reduced-motion pose. The hot spot is the index fingertip.
 *          icon(name) -> 16 x 16 buffer   names: 'tap' (pointer hand pressing), 'flip' (spatula), 'slice' (knife), 'close'
 *          wallTile(dark) -> 8 x 7 buffer: the dialog's backdrop (the play room's plank wall; dark = at night)
 *          particles(b, list)   list = [{ x, y, k, a, life }]  k = 'crumb' | 'drop' | 'steam' | 'dust' | 'spark' | 'herb'
 *                               1 x 1 art px each, color by age (PART[k][0] young .. [2] old); old steam thins out.
 * MOTION   f = frame counter at 12 fps (83 ms). Reduced motion: pass f: 0, still: true, squash 0, no arc (swap faces),
 *          no shake, no particles; flash rims, dents, kerfs and band colors stay (design 5.4).
 * FOOD     (cook-art-2) food, sauce, oil, glints and steam may also use the 24 named FOOD colours (F / FOOD below); props
 *          stay Apollo. put() accepts APOLLO + FOOD. Optional scene inputs, all integers: seed (fx seed), fh (frames since
 *          heat-on), fbc (frames since the last band change), fl (frames since the flip landed: arc frame 3 = fl 0), t
 *          (frames since the reveal began), still (reduced motion). Without them every scene still paints: fh = f, the
 *          heat-on beat plays on the 'heat' flash frame, the landing burst on arc frame 3, the board steams fresh until
 *          the first stroke, and a reveal without t is its own still frame. Effects repeat every LOOP = 96 frames.
 *          The texture seed of a dish comes from its dents, so every view of one dish is the same picture.
 * SIM      GEO (all geometry, incl. food radii per stage, markBase, rest poses, button boxes), toFood(x, y),
 *          fromFood(fx, fy), inFood(stage, x, y) -> bool, pullIn(stage, x, y) -> [x, y] (nearest point well inside).
 */
var COOK_ART = (function () {
  'use strict';
  var VERSION = 'cook-art-2';
  var W = 144, H = 160;

  /* ---------- palette: Apollo 46 only (js/palettes.js) ---------- */
  var APOLLO = ['#172038', '#253a5e', '#3c5e8b', '#4f8fba', '#73bed3', '#a4dddb', '#19332d', '#25562e',
    '#468232', '#75a743', '#a8ca58', '#d0da91', '#4d2b32', '#7a4841', '#ad7757', '#c09473',
    '#d7b594', '#e7d5b3', '#341c27', '#602c2c', '#884b2b', '#be772b', '#de9e41', '#e8c170',
    '#241527', '#411d31', '#752438', '#a53030', '#cf573c', '#da863e', '#1e1d39', '#402751',
    '#7a367b', '#a23e8c', '#c65197', '#df84a5', '#090a14', '#10141f', '#151d28', '#202e37',
    '#394a50', '#577277', '#819796', '#a8b5b2', '#c7cfcc', '#ebede9'];
  /* ---------- FOOD palette: 24 named colours for food, sauce, oil, glints and steam only (props stay Apollo) ----------
   * Every ramp is hue-shifted: shadows lean red and stay saturated, lights lean yellow and fade toward cream. Each colour is
   * a brighter, more saturated sibling of an Apollo colour, so the food pops and still belongs in the room.
   * J jeon ramp, G0 hard glint, B raw batter, O hot oil, P parae (bright seaweed), T tot (dark seaweed), C red chili,
   * S soy dip, V0 steam over the warm wood (lighter and half as saturated). */
  var F = {
    J0: '#6e1c10', J1: '#a8341a', J2: '#db5a1c', J3: '#f68b1f', J4: '#ffb52a', J5: '#ffd95c', J6: '#fff3bd',
    G0: '#fffef2',
    B1: '#fde08c', B2: '#f6c162',   /* raw batter: egg-yellow, one step warmer than plain cream */
    O0: '#5a3610', O1: '#c47d1c',
    P0: '#1b5b2b', P1: '#3ea32f', P2: '#86d838', P3: '#d4f56c',
    T0: '#10160b', T1: '#2b4119',
    C0: '#a0123a', C1: '#ee2b2b', C2: '#ff7f4f',
    S0: '#2e0c07', S2: '#c2481c',
    V0: '#e0cdb6'
  };
  var FOOD = Object.keys(F).map(function (k) { return F[k]; });
  var RGB = {};
  APOLLO.concat(FOOD).forEach(function (h) { var n = parseInt(h.slice(1), 16); RGB[h] = [n >> 16 & 255, n >> 8 & 255, n & 255]; });
  var C = {
    ink: '#172038', coal: '#10141f', soot: '#151d28',
    s0: '#202e37', s1: '#394a50', s2: '#577277', s3: '#819796', s4: '#a8b5b2', s5: '#c7cfcc', s6: '#ebede9',
    w0: '#341c27', w1: '#4d2b32', w2: '#7a4841', w3: '#ad7757', w4: '#c09473', w5: '#d7b594', w6: '#e7d5b3',
    r0: '#602c2c', r1: '#884b2b', a1: '#be772b', a2: '#de9e41', a3: '#e8c170',
    g0: '#19332d', g1: '#25562e', g2: '#468232', g3: '#75a743', g4: '#a8ca58',
    b1: '#3c5e8b', b2: '#4f8fba', b3: '#73bed3', b4: '#a4dddb',
    p1: '#7a367b', p2: '#a23e8c', p3: '#c65197', p4: '#df84a5'
  };

  /* ---------- geometry (art px) ---------- */
  var GEO = {
    W: W, H: H,
    wallH: 16,                                                  /* step scenes: plank wall strip y 2..17 */
    pan: { cx: 72, cy: 84, rx: 60, ry: 38, depth: 6, rim: 4 },  /* step scenes (tap / flip): outer rim ellipse */
    food: { cx: 72, cy: 86, rx: [21, 25, 29], ry: [14, 16, 19] },   /* batter footprint per tap stage; 2 = round flat */
    box0: [40, 62], boxW: 64, boxH: 48,                         /* food box (dents live here) = food centre - [32, 24] */
    board: { x: 10, y: 36, w: 124, h: 100 },                    /* slice scene board (top face) */
    cross: [0, 90],                                             /* jeon guide angles, in order */
    rest: { spatula: [112, 92], knife: [100, 124, 0] },        /* tools at rest: spatula blade centre, knife [x, y, deg] */
    markBase: [[-14, -5], [15, -6], [1, 8]],                   /* suggested tap marks (from the food centre), sim may jitter +-3 */
    dish: { w: 96, h: 66, cx: 48, cy: 30 },                     /* dish() buffer size and jeon centre inside it */
    small: { w: 40, h: 26 },                                    /* dishSmall() buffer */
    spot: { pan: [58, 56, 82, 52], plate: [84, 112, 40, 26],   /* counter buttons [x, y, w, h]; pot / jar / book are */
      pot: [10, 50, 50, 40], jar: [80, 6, 58, 32], book: [12, 138, 30, 14] }   /* reserved, not drawn in slice 1 */
  };

  /* ---------- integer trig (no float trig) ---------- */
  var SIN90 = [0, 71, 143, 214, 286, 357, 428, 499, 570, 641, 711, 782, 852, 921, 991, 1060, 1129, 1198, 1266, 1334,
    1401, 1468, 1534, 1600, 1666, 1731, 1796, 1860, 1923, 1986, 2048, 2110, 2171, 2231, 2290, 2349, 2408, 2465, 2522,
    2578, 2633, 2687, 2741, 2793, 2845, 2896, 2946, 2996, 3044, 3091, 3138, 3183, 3228, 3271, 3314, 3355, 3396, 3435,
    3474, 3511, 3547, 3582, 3617, 3650, 3681, 3712, 3742, 3770, 3798, 3824, 3849, 3873, 3896, 3917, 3937, 3956, 3974,
    3991, 4006, 4021, 4034, 4046, 4056, 4065, 4074, 4080, 4086, 4090, 4094, 4095, 4096];
  function isin(d) {
    d = Math.round(+d || 0) % 360; if (d < 0) d += 360;
    if (d <= 90) return SIN90[d]; if (d <= 180) return SIN90[180 - d]; if (d <= 270) return -SIN90[d - 180]; return -SIN90[360 - d];
  }
  function icos(d) { return isin((Math.round(+d || 0)) + 90); }
  function degOf(dx, dy) {          /* integer degrees 0..359 of a vector, by search over the table */
    if (!dx && !dy) return 0;
    var best = 0, bv = -Infinity;
    for (var d = 0; d < 360; d++) { var v = dx * icos(d) + dy * isin(d); if (v > bv) { bv = v; best = d; } }
    return best;
  }
  function idiv(a, b) { return Math.floor(a / b); }               /* integer floor division */
  function iround(a, b) { return Math.floor((2 * a + b) / (2 * b)); }   /* round(a / b), b > 0 */

  /* ---------- tiny deterministic hash for texture (no random source) ---------- */
  function ih(a, b, c) {
    var h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul((b | 0) + 0x165667b1, 0x85ebca6b) ^ Math.imul((c | 0) + 0x61c88647, 0xc2b2ae35);
    h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
    return h >>> 0;
  }
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function bay(x, y) { return BAYER[((y & 3) << 2) | (x & 3)]; }
  /* one step darker inside the same Apollo ramp: cast shadows keep the texture under them */
  var DARK = {};
  [['#e7d5b3', '#d7b594'], ['#d7b594', '#c09473'], ['#c09473', '#ad7757'], ['#ad7757', '#7a4841'], ['#7a4841', '#4d2b32'], ['#4d2b32', '#341c27'],
    ['#ebede9', '#c7cfcc'], ['#c7cfcc', '#a8b5b2'], ['#a8b5b2', '#819796'], ['#819796', '#577277'], ['#577277', '#394a50'], ['#394a50', '#202e37'],
    ['#202e37', '#151d28'], ['#151d28', '#10141f'], ['#e8c170', '#de9e41'], ['#de9e41', '#be772b'], ['#be772b', '#884b2b'], ['#884b2b', '#602c2c'],
    ['#602c2c', '#341c27'], ['#a4dddb', '#73bed3'], ['#73bed3', '#4f8fba'], ['#4f8fba', '#3c5e8b'], ['#df84a5', '#c65197'], ['#c65197', '#a23e8c'],
    ['#a23e8c', '#7a367b'], ['#a8ca58', '#75a743'], ['#75a743', '#468232'], ['#468232', '#25562e'], ['#25562e', '#19332d']].forEach(function (p) { DARK[p[0]] = p[1]; });
  function shadeAt(b, x, y) { var g = get(b, x, y); if (g && DARK[g]) put(b, x, y, DARK[g]); }
  /* light pool: 2 inside r1, 1 on a one-checker ring up to r2, 0 outside (no wide dither fields) */
  function pool(x, y, lx, ly, sy, r1, r2) {
    var dx = x - lx, dy = (y - ly) * sy, d2 = dx * dx + dy * dy;
    return d2 < r1 * r1 ? 2 : d2 < r2 * r2 ? (((x + y) & 1) ? 2 : 0) : 0;
  }

  /* ---------- buffers ---------- */
  function blank(w, h) { w = Math.max(1, w | 0); h = Math.max(1, h | 0); return { w: w, h: h, d: new Uint8ClampedArray(w * h * 4) }; }
  function clone(b) { return { w: b.w, h: b.h, d: new Uint8ClampedArray(b.d) }; }
  function clear(b) { b.d.fill(0); return b; }
  function copy(dst, src) { if (dst.w === src.w && dst.h === src.h) dst.d.set(src.d); else { clear(dst); blit(dst, src, 0, 0); } return dst; }
  function put(b, x, y, c) {
    if (x < 0 || y < 0 || x >= b.w || y >= b.h) return;
    var p = RGB[c]; if (!p) return;
    var i = ((y | 0) * b.w + (x | 0)) << 2; b.d[i] = p[0]; b.d[i + 1] = p[1]; b.d[i + 2] = p[2]; b.d[i + 3] = 255;
  }
  function hex2(n) { return (n < 16 ? '0' : '') + n.toString(16); }
  function get(b, x, y) {
    if (x < 0 || y < 0 || x >= b.w || y >= b.h) return null;
    var i = (y * b.w + x) << 2; if (!b.d[i + 3]) return null;
    return '#' + hex2(b.d[i]) + hex2(b.d[i + 1]) + hex2(b.d[i + 2]);
  }
  function rect(b, x, y, w, h, c) { for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) put(b, x + i, y + j, c); }
  function dither(b, x, y, w, h, c, ph) { for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) if (((x + i + y + j + (ph | 0)) & 1) === 0) put(b, x + i, y + j, c); }
  function line(b, x0, y0, x1, y1, c) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1, e = dx + dy;
    for (var n = 0; n < 1024; n++) {
      put(b, x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      var e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }
  /* pixel (dx, dy) from the centre pixel is inside an ellipse of width 2rx+1, height 2ry+1 (pixel-centre test) */
  function inE(dx, dy, rx, ry) {
    if (rx < 0 || ry < 0) return false;
    var a = 2 * rx + 1, b = 2 * ry + 1, X = 2 * dx, Y = 2 * dy;
    return X * X * b * b + Y * Y * a * a <= a * a * b * b;
  }
  function ellipse(b, cx, cy, rx, ry, c) { for (var y = -ry; y <= ry; y++) for (var x = -rx; x <= rx; x++) if (inE(x, y, rx, ry)) put(b, cx + x, cy + y, c); }
  function blit(dst, src, x, y) {
    x |= 0; y |= 0;
    for (var j = 0; j < src.h; j++) {
      var ty = y + j; if (ty < 0 || ty >= dst.h) continue;
      for (var i = 0; i < src.w; i++) {
        var tx = x + i; if (tx < 0 || tx >= dst.w) continue;
        var s = (j * src.w + i) << 2; if (!src.d[s + 3]) continue;
        var t = (ty * dst.w + tx) << 2; dst.d[t] = src.d[s]; dst.d[t + 1] = src.d[s + 1]; dst.d[t + 2] = src.d[s + 2]; dst.d[t + 3] = 255;
      }
    }
    return dst;
  }
  function hash(b) {
    var h = 0x811c9dc5, i;
    h = Math.imul(h ^ (b.w & 255), 0x01000193); h = Math.imul(h ^ (b.w >> 8), 0x01000193);
    h = Math.imul(h ^ (b.h & 255), 0x01000193); h = Math.imul(h ^ (b.h >> 8), 0x01000193);
    for (i = 0; i < b.d.length; i++) h = Math.imul(h ^ b.d[i], 0x01000193);
    return h >>> 0;
  }
  function colors(b) {
    var seen = {}, out = [];
    for (var i = 0; i < b.d.length; i += 4) if (b.d[i + 3]) { var k = '#' + hex2(b.d[i]) + hex2(b.d[i + 1]) + hex2(b.d[i + 2]); if (!seen[k]) { seen[k] = 1; out.push(k); } }
    return out;
  }
  function imageData(b) { return new ImageData(new Uint8ClampedArray(b.d), b.w, b.h); }   /* browser only */
  function toCanvas(b, scale) {                                                             /* browser only */
    var k = Math.max(1, scale | 0), cv = document.createElement('canvas'), x = cv.getContext('2d');
    cv.width = b.w * k; cv.height = b.h * k;
    var src = document.createElement('canvas'); src.width = b.w; src.height = b.h;
    src.getContext('2d').putImageData(imageData(b), 0, 0);
    x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, b.w * k, b.h * k);
    return cv;
  }

  /* ---------- memo: deterministic pieces are painted once and blitted (output is identical, only faster) ---------- */
  var memo = {}, memoN = 0;
  function remember(key, make) {
    if (memo[key]) return memo[key];
    var v = make();                                   /* make() may itself remember smaller pieces */
    if (memoN >= 48) { memo = {}; memoN = 0; }
    memoN++; memo[key] = v;
    return v;
  }

  /* ---------- masks (shape helpers) ---------- */
  function mk(x0, y0, w, h) { return { x0: x0, y0: y0, w: w, h: h, m: new Uint8Array(w * h) }; }
  function mhas(M, x, y) { x -= M.x0; y -= M.y0; return x >= 0 && y >= 0 && x < M.w && y < M.h && M.m[y * M.w + x] > 0; }
  function mset(M, x, y, v) { x -= M.x0; y -= M.y0; if (x >= 0 && y >= 0 && x < M.w && y < M.h) M.m[y * M.w + x] = v; }
  function mEll(M, cx, cy, rx, ry, v) { for (var y = -ry; y <= ry; y++) for (var x = -rx; x <= rx; x++) if (inE(x, y, rx, ry)) mset(M, cx + x, cy + y, v); }
  function mEach(M, fn) { for (var j = 0; j < M.h; j++) for (var i = 0; i < M.w; i++) if (M.m[j * M.w + i]) fn(M.x0 + i, M.y0 + j, M.m[j * M.w + i]); }
  /* outline ring: empty pixels touching the mask (4-neighbour) */
  function mOutline(b, M, c, fnC) {
    for (var j = -1; j <= M.h; j++) for (var i = -1; i <= M.w; i++) {
      var x = M.x0 + i, y = M.y0 + j;
      if (mhas(M, x, y)) continue;
      if (mhas(M, x - 1, y) || mhas(M, x + 1, y) || mhas(M, x, y - 1) || mhas(M, x, y + 1)) put(b, x, y, fnC ? fnC(x, y) : c);
    }
  }

  /* ---------- straight tools along an axis (knife, handles, guide) ----------
   * (x0, y0) = axis start pixel, deg = axis direction, len = length. prof(u, v) -> hex | null with u = 0..len along the
   * axis and v = signed px across (+v = axis turned 90 deg clockwise on screen). ol = outline color (or null). */
  function stick(b, x0, y0, deg, len, half, prof, ol, each) {
    var c = icos(deg), s = isin(deg), r = len + half + 2, M = mk(x0 - r, y0 - r, 2 * r + 1, 2 * r + 1), cols = {};
    for (var py = y0 - r; py <= y0 + r; py++) for (var px = x0 - r; px <= x0 + r; px++) {
      var X = 2 * (px - x0), Y = 2 * (py - y0);
      var u = iround(X * c + Y * s, 8192), v = iround(-X * s + Y * c, 8192);
      if (u < 0 || u > len || v < -half - 1 || v > half + 1) continue;
      var col = prof(u, v); if (!col) continue;
      mset(M, px, py, 1); cols[py * 4096 + px] = col;
    }
    if (each) { mEach(M, each); return M; }
    if (ol) mOutline(b, M, ol);
    mEach(M, function (x, y) { put(b, x, y, cols[y * 4096 + x]); });
    return M;
  }

  /* =====================================================================================
   *  BACKGROUNDS: plank wall (play-room wall) + wood counter seen from slightly above
   * ===================================================================================== */
  function wallPlanks(b, x0, y0, x1, y1, lx, ly, r1, r2) {
    for (var y = y0; y < y1; y++) {
      var r = (y - y0) % 7;
      for (var x = x0; x < x1; x++) {
        var lit = pool(x, y, lx, ly, 2, r1, r2), col;
        if (r === 6) col = lit ? C.s3 : C.s2;                                  /* seam */
        else if (r === 0) col = C.s5;                                           /* plank top edge catches the light */
        else if (r === 5) col = lit ? C.s4 : C.s3;                              /* underside of the plank */
        else col = lit ? C.s5 : C.s4;
        put(b, x, y, col);
      }
    }
  }
  /* backdrop tile for the whole kitchen dialog (js/cook.js repeats it at the stage's own integer scale): the play room's
     slate plank wall, quieter than the stage's wall strip so the stage stays in front. dark = the same wall at night. */
  function wallTile(dark) {
    var t = blank(8, 7), rows = dark ? [C.s2, C.s1, C.s1, C.s1, C.s1, C.s1, C.s0] : [C.s5, C.s4, C.s4, C.s4, C.s4, C.s4, C.s3];
    for (var y = 0; y < 7; y++) for (var x = 0; x < 8; x++) put(t, x, y, rows[y]);
    return t;
  }
  function lamp(b, x, y) {           /* small amber wall sconce like the play-room lamp: bracket, shade, warm bulb */
    var G = [
      '....oooo....',
      '....oUUo....',
      '.....oo.....',
      '...oooooo...',
      '..oFFEEEDo..',
      '.oFEEEEEDDo.',
      'oFEEEEEEDDDo',
      'ooooooooooooo',
      '..oWWWWWWo..',
      '...oooooo...'];
    var K = { o: C.w1, U: C.s1, F: C.a3, E: C.a2, D: C.a1, W: C.s6 };
    sprite(b, G, K, x, y);
  }
  function sprite(b, G, K, x, y, flipX) {
    for (var j = 0; j < G.length; j++) for (var i = 0; i < G[j].length; i++) {
      var ch = G[j].charAt(flipX ? G[j].length - 1 - i : i), c = K[ch];
      if (c) put(b, x + i, y + j, c);
    }
  }
  /* butcher-block worktop seen from slightly above: long strips running the whole width (no end joints, no odd dark
     boards, so it never reads as a floor or a brick wall). L = { x, y, sy, r1 } lamp pool: the strip edge under each
     groove catches the light only inside r1 (no checker ring on 1-px rows). A groove per strip, sparse grain streaks;
     every third strip is a shade deeper (the grain of a glued block), the strips nearest the viewer a little taller. */
  function counterWood(b, x0, y0, x1, y1, heights, seed, L) {
    var y = y0, k = 0;
    while (y < y1) {
      var ph = heights[Math.min(k, heights.length - 1)], deep = (ih(k, seed, 5) % 3) === 0;
      var g1 = 2 + ih(k, seed, 11) % Math.max(1, ph - 3), off = ih(k, seed, 7) % 61;
      for (var r = 0; r < ph && y < y1; r++, y++) {
        for (var x = x0; x < x1; x++) {
          var lit = pool(x, y, L.x, L.y, L.sy, L.r1, L.r1) === 2, body = deep ? C.w3 : C.w4, col;
          if (r === 0) col = deep ? C.w2 : C.w3;                                       /* glue line (soft; deeper by a darker strip) */
          else if (r === 1) col = lit ? C.w5 : body;                                   /* strip edge, lit near the lamp */
          else if (r === g1 && (ih(k * 7 + r, (x + off) >> 3, seed) & 3) === 0) col = deep ? C.w2 : C.w3;   /* grain streak */
          else col = body;
          put(b, x, y, col);
        }
      }
      k++;
    }
  }
  function frame(b) {
    for (var x = 0; x < b.w; x++) { put(b, x, 0, C.ink); put(b, x, b.h - 1, C.ink); put(b, x, 1, C.w1); put(b, x, b.h - 2, C.w1); }
    for (var y = 0; y < b.h; y++) { put(b, 0, y, C.ink); put(b, b.w - 1, y, C.ink); if (y > 0 && y < b.h - 1) { put(b, 1, y, C.w1); put(b, b.w - 2, y, C.w1); } }
    return b;
  }
  function trim(b, y) {              /* wood trim where the wall meets the counter */
    for (var x = 2; x < W - 2; x++) { put(b, x, y, C.w4); put(b, x, y + 1, C.w2); put(b, x, y + 2, C.w1); }
  }

  /* close stage background for the step scenes: wall strip + counter planks (lamp off-stage, upper left) */
  function bgStep(b) {
    wallPlanks(b, 2, 2, W - 2, 2 + GEO.wallH, 6, -10, 0, 0);   /* the lamp is off stage: no light pool on this strip */
    trim(b, 2 + GEO.wallH);
    counterWood(b, 2, 5 + GEO.wallH, W - 2, H - 2, [7, 7, 7, 8, 8, 8, 8, 9, 9, 9, 9, 10, 10, 10, 10, 11, 11, 11, 11], 31, { x: 6, y: 10, sy: 1, r1: 40 });
  }

  /* =====================================================================================
   *  PAN (slate) - parametric: P = { cx, cy, rx, ry, depth, rim, hlen, hdeg }
   * ===================================================================================== */
  function panMask(P) { return remember('pm|' + P.cx + ',' + P.cy + ',' + P.rx + ',' + P.ry + ',' + P.depth, function () { return panMask0(P); }); }
  function panMask0(P) {
    var M = mk(P.cx - P.rx - 2, P.cy - P.ry - 2, 2 * P.rx + 5, 2 * P.ry + P.depth + 5);
    for (var k = 0; k <= P.depth; k++) mEll(M, P.cx, P.cy + k, P.rx, P.ry, 1);
    return M;
  }
  function pan(b, P) {
    var cx = P.cx, cy = P.cy, rx = P.rx, ry = P.ry, d = P.depth, rim = P.rim, rimY = Math.max(2, rim - 1);
    var M = panMask(P), x, y;
    /* cast shadow down-right: the surface under it goes one step darker (grain stays visible) */
    var shM = mk(cx - rx, cy - ry, 2 * rx + 12, 2 * ry + d + 12);
    for (var k = 0; k <= d; k++) mEll(shM, cx + 4, cy + 4 + k, rx, ry, 1);
    mEach(shM, function (px, py) { if (!mhas(M, px, py)) shadeAt(b, px, py); });
    /* handle: metal neck then wood grip, going down-right */
    if (P.hlen) {
      var hx = cx + rx - 3, hy = cy + 2;
      stick(b, hx + 3, hy + 4, P.hdeg, P.hlen, 3, function (u, v) {     /* its shadow */
        return v < -2 || v > 2 || u < 4 ? null : '#000';
      }, null, function (px, py) { if (!mhas(M, px, py)) shadeAt(b, px, py); });
      stick(b, hx, hy, P.hdeg, P.hlen, 3, function (u, v) {
        if (u < 7) return v < -1 || v > 1 ? null : v === -1 ? C.s3 : v === 0 ? C.s2 : C.s1;
        if (v < -2 || v > 2) return null;
        if (u > P.hlen - 1 && (v === -2 || v === 2)) return null;
        if (u > P.hlen - 5 && u < P.hlen - 2 && v === 0) return C.w1;           /* hanging hole */
        return v === -2 ? C.w4 : v === 2 ? C.w1 : v === -1 ? C.w3 : C.w2;
      }, C.ink);
    }
    /* body: side band (depth) under the rim, lit on the left */
    mOutline(b, M, C.ink);
    mEach(M, function (px, py) {
      if (inE(px - cx, py - cy, rx, ry)) return;
      var deep = !mhas(M, px, py + 1), lx = px - cx;
      put(b, px, py, deep ? C.soot : lx < -(rx >> 1) ? C.s1 : lx < (rx >> 3) ? C.s1 : C.s0);
      if (!deep && lx < -(rx >> 1) && !mhas(M, px, py - 1 - d)) put(b, px, py, C.s2);
    });
    /* rim top */
    var irx = rx - rim, iry = ry - rimY;
    for (y = -ry; y <= ry; y++) for (x = -rx; x <= rx; x++) {
      if (!inE(x, y, rx, ry) || inE(x, y, irx, iry)) continue;
      var col = C.s3;
      if (y < 0 && x < (rx >> 2)) col = C.s4;
      if (!inE(x - 1, y - 1, rx, ry) && y < 0) col = C.s5;                      /* outer edge facing the lamp */
      if (y > 0 && x > -(rx >> 2)) col = C.s2;
      if (!inE(x + 1, y + 1, rx, ry) && y > 0) col = C.s1;
      if (inE(x + 1, y + 1, irx, iry) && y < 0) col = C.s2;                     /* inner lip, far side, in shade */
      put(b, cx + x, cy + y, col);
    }
    /* specular glints on the lit rim */
    var gl = [[-(rx * 7 >> 3), -(ry * 3 >> 3), 2], [-(rx * 5 >> 3), -(ry * 6 >> 3), 1]];
    gl.forEach(function (g) { for (var i = -g[2]; i <= g[2]; i++) { var px = cx + g[0] + i, py = cy + g[1]; if (inE(px - cx, py - cy, rx, ry) && !inE(px - cx, py - cy, irx, iry)) put(b, px, py, C.s6); } });
    /* interior: far inner wall + floor */
    var frx = irx - 1, fry = iry - 1, fdy = Math.max(2, (rim >> 1) + 1);
    var shx = -(frx >> 1), shy = fdy - (fry >> 1) + 1, shrx = Math.max(3, frx >> 2), shry = Math.max(2, fry >> 2);
    for (y = -iry; y <= iry; y++) for (x = -irx; x <= irx; x++) {
      if (!inE(x, y, irx, iry)) continue;
      var px2 = cx + x, py2 = cy + y;
      if (!inE(x, y - fdy, frx, fry)) { put(b, px2, py2, x > (irx >> 2) ? C.s1 : C.s0); continue; }
      var c2 = C.s1;
      if (!inE(x - 1, y - fdy - 1, frx, fry)) c2 = C.s0;                       /* floor meets the far wall */
      else if (inE(x - shx, y - shy, shrx, shry) && !inE(x - shx - 1, y - shy - 1, shrx, shry) && x - shx < (shrx >> 1) && y - shy < 1) c2 = (x - shx < -(shrx >> 1)) && y - shy < 0 ? C.s3 : C.s2;   /* lamp sheen: a thin reflected arc */
      put(b, px2, py2, c2);
    }
    return M;
  }
  /* heat: the lowest two rows of the pan's side band glow, and five small flame tongues lick up the front of the pan from
     under it, their tips over the dark side band (2-frame flicker, f = frame). */
  var TONGUE = [   /* 5 x 7, bottom row first: orange edge (1 = a1), body (2 = a2), yellow core (3 = a3); two flicker shapes */
    ['.121.', '12321', '12321', '.132.', '.12..', '..2..', '..1..'],
    ['.121.', '12321', '.2321', '.231.', '..21.', '..2..', '...1.']];
  var TONGUE_K = { 1: 'a1', 2: 'a2', 3: 'a3' };
  function panHeat(b, P, f) {
    var cx = P.cx, cy = P.cy, rx = P.rx, ry = P.ry, d = P.depth, ph = (f >> 1) & 1, M = panMask(P), x, y;
    function bottom(px) { for (var yy = ry + d; yy >= -ry; yy--) if (mhas(M, px, cy + yy)) return cy + yy; return -1; }
    for (x = -rx + 4; x <= rx - 4; x++) {   /* glow on the side band, just above the outline */
      var yb = bottom(cx + x); if (yb < 0) continue;
      if (inE(x, yb - cy, rx, ry)) continue;            /* only where the side band shows under the rim */
      put(b, cx + x, yb, C.a1);
      if (!inE(x, yb - 1 - cy, rx, ry)) put(b, cx + x, yb - 1, ((x + ph * 3) % 6) === 0 ? C.a2 : C.r1);
    }
    var n = 4, half = rx - 16, span = idiv(half * 2, n - 1);
    for (var i = 0; i < n; i++) {   /* tongues licking up the front of the pan */
      var fx = cx - half + i * span, fb = bottom(fx); if (fb < 0) continue;
      var G = TONGUE[(i + ph) & 1], baseY = fb + 2 - ((i === 1 || i === 2) ? 0 : 1);   /* the base under the pan, the tip over its side band */
      for (var r = 0; r < G.length; r++) for (var c = 0; c < 5; c++) {
        var k = TONGUE_K[G[r].charAt(c)]; if (!k) continue;
        x = fx - 2 + c; y = baseY - r;
        if (y > cy && (!mhas(M, x, y) || !inE(x - cx, y - cy, rx, ry))) put(b, x, y, C[k]);   /* never over the rim or the pan floor */
      }
    }
  }

  /* =====================================================================================
   *  FOOD: raw batter (tap) and the jeon faces (flip / slice / dish)
   * ===================================================================================== */
  var LOBES = [   /* [dx, dy, rx, ry] in 1/64 of the stage radius; organic edge for the lump and the half-spread batter */
    [[-40, 10, 30, 36], [36, 14, 32, 34], [-10, 34, 40, 30], [14, -30, 34, 30]],
    [[-46, -24, 22, 26], [42, -32, 24, 24], [-36, 30, 24, 28], [48, 18, 20, 28], [2, 44, 28, 22], [-6, -46, 30, 20]],
    []];
  /* herb flecks: positions in 1/64 of the radius (inside 0.8), shape by index */
  var FLECK = [[-40, -18], [-14, -36], [14, -30], [38, -10], [-50, 8], [-24, 6], [2, -8], [24, 12], [46, 16], [-34, 30],
    [-6, 26], [18, 36], [36, -30], [-26, -24], [8, 46], [-44, -38]];
  var PARAE = [[[0, 0], [1, 0]], [[0, 0]], [[0, 0], [0, 1]], [[0, 0], [1, 1]]];
  var TOT = [[[0, 0], [1, 0], [2, -1]], [[0, 0], [0, 1], [1, 1]], [[0, 0], [1, 0]], [[0, 0], [1, -1], [1, -2]]];
  function herbCol(herb, cooked, end) {
    if (herb === 'tot') return end ? C.g0 : C.g1;
    return end ? (cooked ? C.g3 : C.g4) : (cooked ? C.g2 : C.g3);
  }
  /* seaweed through the batter: short wavy strands (3-5 px) and a few 2 x 2 clumps, about 5 % of a full-size face, so it
     reads as haecho-jeon and not as a plain pancake with pepper. Each strand: lit end (upper left), body, shaded end.
     parae = bright green ramp, tot = the dark ramp. Positions are in 1/64 of the radius (inside 0.8). */
  var STRAND = [
    [-44, -14, 0], [-20, -38, 1], [8, -30, 2], [34, -20, 3], [-52, 10, 4], [-28, 4, 2], [-4, -10, 0], [18, 8, 1], [42, 4, 4],
    [-36, 30, 3], [-8, 24, 4], [16, 34, 0], [30, -40, 1], [-24, -24, 3], [2, 44, 2], [48, 22, 0], [-14, 40, 1], [36, 32, 2],
    [-44, -20, 0], [24, -14, 3]];
  var STRAND_G = [
    [[0, 0], [1, 0], [2, -1], [3, -1]], [[0, 0], [1, 1], [2, 1], [3, 2]], [[0, 0], [0, 1], [1, 2], [1, 3]],
    [[0, 0], [1, -1], [2, -1], [3, 0], [4, 0]], [[0, 0], [1, 0], [2, 1], [3, 1], [4, 2]]];
  var CLUMP = [[-14, -24], [26, -4], [-40, -4], [8, 18]];
  function strandCol(herb, cooked, j, n) {   /* j = pixel index along the strand */
    if (herb === 'tot') return j === n - 1 ? C.g0 : C.g1;
    if (j === 0) return cooked ? C.g3 : C.g4;
    return j === n - 1 ? (cooked ? C.g1 : C.g2) : (cooked ? C.g2 : C.g3);
  }
  function flecks(b, cx, cy, rx, ry, herb, cooked, clip, n) {
    var i, j, x, y;
    if (rx < 16) {   /* tiny pictures (counter, small dish): 1-2 px specks still read best */
      var shapes = herb === 'tot' ? TOT : PARAE, cnt = n == null ? (herb === 'tot' ? 11 : 16) : n;
      for (i = 0; i < cnt && i < FLECK.length; i++) {
        var fx = cx + idiv(FLECK[i][0] * rx, 64), fy = cy + idiv(FLECK[i][1] * ry, 64), sh = shapes[i % shapes.length];
        for (j = 0; j < sh.length; j++) { x = fx + sh[j][0]; y = fy + sh[j][1]; if (!clip || clip(x, y)) put(b, x, y, herbCol(herb, cooked, j === sh.length - 1 && sh.length > 1)); }
      }
      return;
    }
    var ns = n == null ? STRAND.length : Math.min(STRAND.length, n), nc = Math.min(CLUMP.length, Math.max(1, ns >> 2));
    for (i = 0; i < ns; i++) {
      var s = STRAND[i], g = STRAND_G[s[2]], sx = cx + idiv(s[0] * rx, 64), sy = cy + idiv(s[1] * ry, 64);
      for (j = 0; j < g.length; j++) { x = sx + g[j][0]; y = sy + g[j][1]; if (!clip || clip(x, y)) put(b, x, y, strandCol(herb, cooked, j, g.length)); }
    }
    for (i = 0; i < nc; i++) {
      var q = CLUMP[i], qx = cx + idiv(q[0] * rx, 64), qy = cy + idiv(q[1] * ry, 64);
      [[0, 0, 0], [1, 0, 1], [0, 1, 1], [1, 1, 3]].forEach(function (p) { if (!clip || clip(qx + p[0], qy + p[1])) put(b, qx + p[0], qy + p[1], strandCol(herb, cooked, p[2], 4)); });
    }
  }
  /* fingertip dimples. Hits within 3 px of each other are one press spot (a finger lands 2-3 px apart each time): each
     spot is one round pit that grows with its hit count (1: 4 x 3, 2: 5 x 4, 3 or more: 6 x 4). Light from the upper
     left: the pit's upper-left inner wall is in shade (1 px), the floor is the core colour, the lower-right rim outside
     the pit catches the light (1 px). Integer only; the spot centre is the rounded mean of its hits. */
  var PIT = [null, ['.##.', '####', '.##.'], ['.###.', '#####', '#####', '.###.'], ['.####.', '######', '######', '.####.']];
  function dents(b, list, core, dark, lite, clip) {
    if (!list || !list.length) return;
    var pts = list.map(function (d) { return [d[0] | 0, d[1] | 0]; }), grp = pts.map(function (p, i) { return i; }), i, j;
    function root(i) { while (grp[i] !== i) i = grp[i] = grp[grp[i]]; return i; }
    for (i = 0; i < pts.length; i++) for (j = i + 1; j < pts.length; j++) {
      var dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1];
      if (dx * dx + dy * dy <= 9) grp[root(j)] = root(i);
    }
    var spots = {};
    pts.forEach(function (p, k) { var r = root(k), s = spots[r] || (spots[r] = { sx: 0, sy: 0, n: 0 }); s.sx += p[0]; s.sy += p[1]; s.n++; });
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    pts.forEach(function (d) { x0 = Math.min(x0, d[0]); y0 = Math.min(y0, d[1]); x1 = Math.max(x1, d[0]); y1 = Math.max(y1, d[1]); });
    var M = mk(x0 - 6, y0 - 6, x1 - x0 + 13, y1 - y0 + 13);
    Object.keys(spots).forEach(function (k) {
      var s = spots[k], G = PIT[Math.min(3, s.n)], cx = iround(s.sx, s.n), cy = iround(s.sy, s.n), ox = cx - ((G[0].length - 1) >> 1), oy = cy - ((G.length - 1) >> 1);
      for (var r = 0; r < G.length; r++) for (var c = 0; c < G[r].length; c++) if (G[r].charAt(c) === '#') mset(M, ox + c, oy + r, 1);
    });
    for (var y = M.y0; y < M.y0 + M.h; y++) for (var x = M.x0; x < M.x0 + M.w; x++) {
      if (clip && !clip(x, y)) continue;
      if (mhas(M, x, y)) { put(b, x, y, mhas(M, x - 1, y) && mhas(M, x, y - 1) ? core : dark); continue; }   /* shaded wall, then the floor */
      if (mhas(M, x - 1, y) || mhas(M, x, y - 1)) put(b, x, y, lite);                                       /* lit lower-right rim */
    }
  }
  /* squash frames (bottom anchored, pre-drawn as two radius sets): 0 rest, 1 wide + short, 2 narrow + tall */
  function squashR(rx, ry, sq) { return sq === 1 ? [rx + Math.max(2, rx >> 3), ry - Math.max(1, ry >> 3)] : sq === 2 ? [rx - Math.max(1, rx >> 4), ry + Math.max(1, ry >> 4)] : [rx, ry]; }

  var maskCache = {};
  function batterMask(cx, cy, stage, sq) {
    var key = cx + ',' + cy + ',' + stage + ',' + sq;
    if (!maskCache[key]) maskCache[key] = batterMask0(cx, cy, stage, sq);
    return maskCache[key];
  }
  function batterMask0(cx, cy, stage, sq) {
    var rx0 = GEO.food.rx[stage], ry0 = GEO.food.ry[stage], R = squashR(rx0, ry0, sq), rx = R[0], ry = R[1];
    var ccy = cy + (ry0 - ry), M = mk(cx - rx - 8, ccy - ry - 8, 2 * rx + 17, 2 * ry + 17);
    mEll(M, cx, ccy, rx, ry, 1);
    LOBES[stage].forEach(function (L) { mEll(M, cx + idiv(L[0] * rx, 64), ccy + idiv(L[1] * ry, 64), idiv(L[2] * rx, 64), idiv(L[3] * ry, 64), 1); });
    return { M: M, cx: cx, cy: ccy, rx: rx, ry: ry };
  }
  /* raw batter on the cold pan. o = { cx, cy, shape 0..2, herb, dents (food-box px), flash, squash }.
     Memoised: painted once per distinct input on an empty stage, cropped, then blitted (it only changes on a hit). */
  function batter(b, o) {
    o = o || {};
    var key = ['B', o.cx == null ? '' : o.cx | 0, o.cy == null ? '' : o.cy | 0, clampI(o.shape == null ? o.stage : o.shape, 0, 2), clampI(o.squash, 0, 2),
      o.herb === 'tot' ? 't' : 'p', o.flash ? 1 : 0, JSON.stringify((o.dents || []).slice(0, 9).map(function (d) { return [d[0] | 0, d[1] | 0]; }))].join('|');
    var R = remember(key, function () { var full = blank(W, H); batter0(full, o); return crop(full); });
    if (R) blit(b, R.buf, R.x, R.y);
    return b;
  }
  function crop(full) {   /* painted bounding box of a buffer -> { buf, x, y } (null if empty) */
    var x0 = full.w, y0 = full.h, x1 = -1, y1 = -1, x, y;
    for (y = 0; y < full.h; y++) for (x = 0; x < full.w; x++) if (full.d[((y * full.w + x) << 2) + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null;
    var out = blank(x1 - x0 + 1, y1 - y0 + 1);
    for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) { var si = (y * full.w + x) << 2, ti = ((y - y0) * out.w + (x - x0)) << 2; out.d[ti] = full.d[si]; out.d[ti + 1] = full.d[si + 1]; out.d[ti + 2] = full.d[si + 2]; out.d[ti + 3] = full.d[si + 3]; }
    return { buf: out, x: x0, y: y0 };
  }
  /* raw batter on the cold pan (FOOD palette, egg-yellow): a glossy wet dome (sheen cap, a rim light and broken white
     dashes along the lamp-side rim, a hard streak glint with a cream halo), a thin greasy contact line under the lower
     right, bright fresh wavy seaweed strands (tot: dark sprigs with a glossy tip toward the lamp), and round dimples
     grouped by press spot like the dents. The strands use a fixed seed while the player pats, so nothing jumps between hits. */
  function batter0(b, o) {
    var stage = clampI(o.shape == null ? o.stage : o.shape, 0, 2), sq = clampI(o.squash, 0, 2), cx = o.cx == null ? GEO.food.cx : o.cx, cy = o.cy == null ? GEO.food.cy : o.cy;
    var bm = batterMask(cx, cy, stage, sq), M = bm.M, rx = bm.rx, ry = bm.ry, ccy = bm.cy, seed = 7, i, h, t;
    var tall = stage === 0 ? 4 : stage === 1 ? 2 : 1;
    var T = mk(M.x0, M.y0, M.w, M.h + tall);
    mEach(M, function (x, y) { for (var k = 0; k <= tall; k++) mset(T, x, y + k, 1); });
    mOutline(b, T, C.s6, o.flash ? null : function (x, y) { return mhas(T, x, y + 1) || mhas(T, x + 1, y) ? F.B2 : F.O0; });
    mEach(T, function (x, y) { if (!mhas(M, x, y)) put(b, x, y, mhas(T, x, y + 1) ? F.B2 : F.J5); });
    /* erosion depth (1 = edge ring .. 4) for the rim light and the wet streak */
    var D = mk(M.x0, M.y0, M.w, M.h);
    mEach(M, function (x, y) { mset(D, x, y, 9); });
    var dep = function (x, y) { x -= D.x0; y -= D.y0; return x < 0 || y < 0 || x >= D.w || y >= D.h ? 0 : D.m[y * D.w + x]; };
    for (var d = 1; d <= 4; d++) {
      var ringD = [];
      mEach(D, function (x, y, v) { if (v === 9 && (dep(x + 1, y) < d || dep(x - 1, y) < d || dep(x, y + 1) < d || dep(x, y - 1) < d)) ringD.push([x, y]); });
      ringD.forEach(function (p) { mset(D, p[0], p[1], d); });
    }
    var hx = cx - (rx >> 2) - 2, hy = ccy - (ry >> 2) - 1, hrx = Math.max(3, (rx * (stage === 0 ? 4 : 3)) >> 3), hry = Math.max(2, (ry * (stage === 0 ? 3 : 2)) >> 3);
    mEach(M, function (x, y) {
      var dd = dep(x, y), col = 'B1';
      var lr = !mhas(M, x + 1, y + 1) || !mhas(M, x + 2, y + 2) || (stage < 2 && !mhas(M, x + 3, y + 2));
      var ul = !mhas(M, x - 1, y - 1) || !mhas(M, x - 2, y - 2) || !mhas(M, x - 3, y - 2);
      if (lr) col = 'B2';
      else if (ul && dd >= 2) col = 'J6';                                    /* wet rim light inside the lamp-side edge */
      if (inE(x - hx, y - hy, hrx, hry) || (inE(x - hx, y - hy, hrx + 1, hry + 1) && (ih(x, y, 77) & 3) === 0)) col = 'J6';   /* dome sheen */
      put(b, x, y, F[col]);
    });
    /* wet streak: broken white dashes along the lit rim (the thick lump shows the most) */
    mEach(M, function (x, y) {
      if (dep(x, y) !== 2 || mhas(M, x - 2, y - 2) && mhas(M, x - 3, y - 2)) return;
      if ((x - cx) * 3 + (y - ccy) * 4 > 0) return;
      if ((ih(x, y, seed + 31) % 5) < (stage === 0 ? 3 : 2)) put(b, x, y, F.G0);
    });
    /* fresh seaweed strands (the same wavy, tangled strands as the faces), clipped well inside the edge */
    var clip = function (x, y) { return dep(x, y) >= 3; };
    strands(cx, ccy, rx, ry, [10, 14, 18][stage], seed, false, clip, function (x, y, id) { put(b, x, y, F[id]); },
      function (n, t2, last) { return t2 === 0 ? 'P3' : t2 === last ? 'P1' : (ih(n, t2, seed + 503) % 5 === 0 ? 'P1' : 'P2'); });
    if (o.herb === 'tot') {   /* tot sprigs sit on the batter too, each with a glossy tip toward the lamp */
      for (i = 0; i < [5, 7, 9][stage]; i++) {
        h = ih(i, seed, 503);
        var tx = cx + hoff(h, rx, 7), ty = ccy + hoff(h >>> 10, ry, 7), sh = TOTS[(h >>> 20) % 3];
        sh.forEach(function (p, j) { if (clip(tx + p[0], ty + p[1])) put(b, tx + p[0], ty + p[1], F[p[1] > 0 && j > 1 ? 'T0' : 'T1']); });
        if (clip(tx, ty)) put(b, tx, ty, F.P3);
        if (clip(tx - 1, ty - 1)) put(b, tx - 1, ty - 1, F.P3);
      }
    }
    dimples(b, (o.dents || []).slice(0, 9).map(function (dd) { return [cx - 32 + (dd[0] | 0), cy - 24 + (dd[1] | 0) + (ccy - cy)]; }), ['B2', 'B1', 'J6', 'G0'], function (x, y) { return dep(x, y) >= 2; });
    /* the wet streak glint on the dome (5 hard white px along the rim tangent, cream halo) + a few wet sparks */
    var gx0 = hx - (hrx >> 2), gy0 = hy - (hry >> 2), gs = {};
    STREAK_G.m.forEach(function (p) { gs[(p[0] + 8) * 32 + p[1] + 8] = 1; });
    STREAK_G.m.forEach(function (p) { for (var dy2 = -1; dy2 <= 1; dy2++) for (var dx2 = -1; dx2 <= 1; dx2++) { var X = gx0 + p[0] + dx2, Y = gy0 + p[1] + dy2; if (!gs[(p[0] + dx2 + 8) * 32 + p[1] + dy2 + 8] && dep(X, Y) >= 2) put(b, X, Y, F.J6); } });
    STREAK_G.m.forEach(function (p) { if (dep(gx0 + p[0], gy0 + p[1]) >= 2) put(b, gx0 + p[0], gy0 + p[1], F.G0); });
    for (i = 0, t = 0; i < 40 && t < [3, 4, 5][stage]; i++) {
      h = ih(i, seed, 913);
      var gx = cx + hoff(h, rx, 8), gy = ccy + hoff(h >>> 10, ry, 8);
      if (dep(gx, gy) < 3 || get(b, gx, gy) !== F.B1 && get(b, gx, gy) !== F.J6) continue;
      put(b, gx, gy, F.G0); t++;
    }
    if (o.flash) mOutline(b, T, C.s6);
    return M;
  }
  function clampI(v, a, b) { v = Math.round(+v || 0); return v < a ? a : v > b ? b : v; }

  /* =====================================================================================
   *  JEON FACES (FOOD palette): hue-shifted ramps, a sheen cap round the hero glint, browning that gathers toward the
   *  crisp rim, lace, bright seaweed strands, hard white glints and a wet shine line on the lamp side. No checker
   *  gradients inside the food: every transition is a cluster edge (noise-wobbled), so it never turns into a screen door.
   * ===================================================================================== */
  var JR = ['J0', 'J1', 'J2', 'J3', 'J4', 'J5', 'J6'];
  function js(id, k) { var i = JR.indexOf(id); if (i < 0) return id; i += k; return JR[i < 0 ? 0 : i > 6 ? 6 : i]; }
  function fc(id) { return F[id] || id; }
  /* small LRU caches (a full cache drops only its oldest entry, never everything at once) */
  function lru(cap) { return { cap: cap, m: new Map() }; }
  function lruGet(c, k, make) {
    var v = c.m.get(k);
    if (v !== undefined) { c.m.delete(k); c.m.set(k, v); return v; }
    v = make(); c.m.set(k, v);
    if (c.m.size > c.cap) c.m.delete(c.m.keys().next().value);
    return v;
  }
  var FACES = lru(40), CUTS = lru(24), KITS = lru(16);
  /* tones per state (FOOD ids). raw = cold batter; top = raw side up while it cooks; bottom = the cooked face.
     tooth = lace teeth outside the rim [lit, shade]. J6 is never a cooked body tone.
     top: a golden setting band grows in from the rim (gw px: 2 / 4 / 7, ramp gold[] outer -> inner, goldLit[] on the
     lamp side), a broken matte ring (set) just inside it, then the wet egg-yellow centre with its sheen streak.
     bottom, crisp: a continuous 2-px deep-brown crust ring (crust[]), denser lace, dark freckles (freck, fcol). */
  var TR = { base: 'B1', sheen: 'J6', shade: 'B2', edge: 'B2', edgeLit: 'J6', side: ['B2', 'B2'], streak: 1 };
  var TT = [
    { base: 'B1', sheen: 'J6', shade: 'B2', gw: 2, gold: ['J4', 'J5'], goldLit: ['J5', 'J5'], set: 'B2', side: ['J4', 'J3'], tooth: null, holes: 3, streak: 1 },
    { base: 'B1', sheen: 'J6', shade: 'B2', gw: 4, gold: ['J3', 'J4', 'J4', 'J5'], goldLit: ['J4', 'J4', 'J5', 'J5'], set: 'B2', side: ['J3', 'J2'], tooth: ['J4', 'J3'], holes: 6, streak: 1 },
    { base: 'B1', sheen: 'J6', shade: 'B2', gw: 7, gold: ['J2', 'J3', 'J3', 'J4', 'J4', 'J5', 'J5'], goldLit: ['J3', 'J3', 'J4', 'J4', 'J5', 'J5', 'J5'], set: 'B2', side: ['J2', 'J1'], tooth: ['J4', 'J2'], holes: 9, streak: 1 }];
  var TB = [
    { base: 'J5', sheen: 'J6', shade: 'J4', mot: 'J4', core: 'J3', mshare: 0.12, cshare: 0.30, edge: 'J4', edgeLit: 'J5', side: ['J3', 'J2'], tooth: null, cap: 0.62, freck: 0 },
    { base: 'J4', sheen: 'J5', shade: 'J3', mot: 'J3', core: 'J2', mshare: 0.18, cshare: 0.32, edge: 'J3', edgeLit: 'J5', side: ['J2', 'J1'], tooth: ['J4', 'J2'], cap: 1, freck: 2, fcol: 'J2', nlace: 10 },
    { base: 'J4', sheen: 'J5', shade: 'J3', mot: 'J3', core: 'J2', mshare: 0.34, cshare: 0.30, edge: 'J1', edgeLit: 'J1', crust: ['J1', 'J2'], side: ['J1', 'J0'], tooth: ['J3', 'J1'], cap: 0.9, deep: 'J1', freck: 8, fcol: 'J1', nlace: 26 }];
  function tz(a) { return a < 0 ? Math.ceil(a) : Math.floor(a); }                                   /* truncate to 0 */
  function hoff(h, r, k10) { return tz(((h & 1023) * 2 * k10 - k10 * 1023) * r / 10230); }       /* hash -> [-k, k] x r */
  /* integer value noise (bilinear on a g-px grid, 0..255) and the browning field (5-px blobs + 3-px detail + grain) */
  function vnoise(x, y, g, seed) {
    var gx = idiv(x, g), gy = idiv(y, g), fx = x - gx * g, fy = y - gy * g;
    var a = ih(gx, gy, seed) & 255, b = ih(gx + 1, gy, seed) & 255, c = ih(gx, gy + 1, seed) & 255, d = ih(gx + 1, gy + 1, seed) & 255;
    return idiv((a * (g - fx) + b * fx) * (g - fy) + (c * (g - fx) + d * fx) * fy, g * g);
  }
  function noise(x, y, seed) { return idiv(vnoise(x, y, 5, seed) * 15 + vnoise(x, y, 3, seed + 1) * 4 + (ih(x, y, seed + 2) & 255), 20); }
  /* flat disc lit from the upper left: 1 = sheen cap (an offset ellipse round the hero glint, its edge wobbled by the
     noise so it is a cluster, not a stamped oval), -1 = the outer rings of the lower-right arc, 0 = mid tone */
  function lightOf(x, y, rx, ry, cap, nv) {
    var ax = 0.46 * rx * cap, ay = 0.42 * ry * cap, ex = (x + 0.36 * rx) / ax, ey = (y + 0.40 * ry) / ay, q = ex * ex + ey * ey;
    if (q < 1 + (nv - 128) / 420) return 1;
    if (x / rx + y / ry > 0.35) {
      var u = x / (rx + 0.5), v = y / (ry + 0.5);
      if (u * u + v * v > 0.76 + (nv - 128) / 1400) return -1;
    }
    return 0;
  }
  var HERO = {   /* the hero glint: G glint white, c cream halo, d one step darker partner below-right (reads as a bump) */
    s: ['Gc'],
    m: ['.cc..', 'cGGc.', 'cGc..', '.c...', '...d.'],
    l: ['.ccc...', 'cGGGc..', 'cGGc...', '.cc....', '....d..']
  };
  var CLUSTER = [[4, -1], [6, 1], [2, 3]];   /* a small cluster of single glints beside the hero (x, y from the hero) */
  var TOTS = [[[0, 0], [1, 0], [2, 0], [3, 1], [2, -1]], [[0, 0], [1, 1], [2, 1], [3, 2]], [[0, 0], [1, 0], [2, 1], [3, 1], [1, -1]]];
  /* fingertip dimples, grouped exactly like the press spots of the batter (hits within 3 px are one spot that grows with
     its count, PIT shapes): the upper-left inner wall in shade, the floor, the lower-right rim lit, a wet glint in a third.
     On a cooked face the pit holds a little oil (lighter, glossy), so a dent never reads as a burnt spot.
     T = [wall, floor, lit rim, glint] (FOOD ids) */
  function pressSpots(list) {
    var pts = list.map(function (d) { return [d[0] | 0, d[1] | 0]; }), grp = pts.map(function (p, i) { return i; }), i, j, out = [];
    function root(i) { while (grp[i] !== i) i = grp[i] = grp[grp[i]]; return i; }
    for (i = 0; i < pts.length; i++) for (j = i + 1; j < pts.length; j++) {
      var dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1];
      if (dx * dx + dy * dy <= 9) grp[root(j)] = root(i);
    }
    var spots = {};
    pts.forEach(function (p, k) { var r = root(k), s = spots[r] || (spots[r] = { sx: 0, sy: 0, n: 0 }); s.sx += p[0]; s.sy += p[1]; s.n++; });
    Object.keys(spots).forEach(function (k) { var s = spots[k]; out.push([iround(s.sx, s.n), iround(s.sy, s.n), s.n]); });
    return out;
  }
  function dimples(b, list, T, clip, pf) {
    if (!list || !list.length) return;
    var spots = pressSpots(list), x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    spots.forEach(function (s) { x0 = Math.min(x0, s[0]); y0 = Math.min(y0, s[1]); x1 = Math.max(x1, s[0]); y1 = Math.max(y1, s[1]); });
    var M = mk(x0 - 6, y0 - 6, x1 - x0 + 13, y1 - y0 + 13), x, y;
    spots.forEach(function (s) {
      var G = PIT[Math.min(3, s[2])], ox = s[0] - ((G[0].length - 1) >> 1), oy = s[1] - ((G.length - 1) >> 1);
      for (var r = 0; r < G.length; r++) for (var c = 0; c < G[r].length; c++) if (G[r].charAt(c) === '#') mset(M, ox + c, oy + r, 1);
    });
    var paint = pf || function (px, py, id) { put(b, px, py, fc(id)); };
    for (y = M.y0; y < M.y0 + M.h; y++) for (x = M.x0; x < M.x0 + M.w; x++) {
      if (clip && !clip(x, y)) continue;
      if (mhas(M, x, y)) { paint(x, y, mhas(M, x - 1, y) && mhas(M, x, y - 1) ? T[1] : T[0]); continue; }
      if (mhas(M, x - 1, y) || mhas(M, x, y - 1)) paint(x, y, T[2]);
    }
    spots.forEach(function (s, i) { if (i % 3 === 0 && (!clip || clip(s[0], s[1] + 1))) paint(s[0], s[1] + 1, T[3]); });
  }
  /* the wet sheen streak of raw batter: a crescent on the lamp side (upper left), about 4 px thick and 15 px long, that
     follows the rim; its edges are wobbled by the noise and it breaks once near its lower end. 1 inside, 0 outside. */
  function streakOf(x, y, rx, ry, nv) {
    var u = x / rx, v = y / ry, e = u * u + v * v, w = (nv - 128) / 1600;
    if (e < 0.33 + w || e > 0.55 + w || v >= 0 || u >= 0) return 0;
    var a = pang(u, v);   /* upper left = 2..3, the diagonal is 2.5 */
    return a < 2.16 || a > 2.86 || (a > 2.26 && a < 2.31) ? 0 : 1;
  }
  /* the glint inside the streak: hard white pixels along the rim tangent (up to the right), a cream halo all round */
  var STREAK_G = { s: [[0, 0]], m: [[-2, 1], [-1, 1], [0, 0], [1, 0], [2, -1]], l: [[-3, 1], [-2, 1], [-1, 0], [0, 0], [1, 0], [2, -1]] };
  /* a seaweed strand (parae): a short walk in 8 directions that bends every 2..4 px, one way or the other, so the strands
     come out wavy and tangled (never straight flakes, never tight hooks). n = index, len = pixels. Lit end first. */
  var SDX = [1, 1, 0, -1, -1, -1, 0, 1], SDY = [0, 1, 1, 1, 0, -1, -1, -1];
  function strandPts(n, seed, len) {
    var h = ih(n, seed, 601), d = [0, 7, 1, 0, 4, 3, 5, 4][h & 7], turn = (h >>> 3) & 1 ? 1 : -1, x = 0, y = 0, pts = [[0, 0]], run = 0, gap = 2;
    for (var t = 1; t < len; t++) {
      var r = ih(n, t, seed + 602);
      if (++run >= gap) { run = 0; gap = 2 + (r % 3); d = (d + turn) & 7; if ((r >>> 4) & 1) turn = -turn; }
      if ((d === 2 || d === 6) && (r >>> 8) & 1) d = (d + turn) & 7;   /* seen from above at a slant: few straight vertical steps */
      x += SDX[d]; y += SDY[d]; pts.push([x, y]);
    }
    if (pts[0][0] + pts[0][1] > x + y) pts.reverse();
    return pts;
  }
  /* paint strands of parae into a face or the batter: cnt tries at hashed spots, each 6..12 px (3..4 on a thumbnail), a
     third with a short second strand crossing it (a tangle). ok(x, y) clips, paint(x, y, id, i) writes, col(i, t, last) -> id */
  function strands(cx, cy, rx, ry, cnt, seed, small, ok, paint, col) {
    var starts = [], i, q, t;
    for (i = 0; i < cnt; i++) {
      var h = ih(i, seed, 501), px = cx + hoff(h, rx, 8), py = cy + hoff(h >>> 10, ry, 8), crowd = false;
      if (!ok(px, py)) continue;
      for (q = 0; q < starts.length; q++) if (Math.abs(starts[q][0] - px) + Math.abs(starts[q][1] - py) < (small ? 3 : 5)) crowd = true;
      if (crowd) continue;
      starts.push([px, py]);
      var len = small ? 3 + ((h >>> 20) & 1) : 7 + ((h >>> 20) % 6), P = strandPts(i, seed, len), last = P.length - 1;
      for (t = 0; t <= last; t++) if (ok(px + P[t][0], py + P[t][1])) paint(px + P[t][0], py + P[t][1], col(i, t, last), i);
      if (!small && (h >>> 27) % 3 === 0) {   /* a tangle: a short strand crossing the middle of this one */
        var mid = P[last >> 1], Q = strandPts(i + 97, seed, 4 + ((h >>> 24) % 3)), qx = px + mid[0] - Q[Q.length >> 1][0], qy = py + mid[1] - Q[Q.length >> 1][1];
        for (t = 0; t < Q.length; t++) if (ok(qx + Q[t][0], qy + Q[t][1])) paint(qx + Q[t][0], qy + Q[t][1], col(i, t + 1, Q.length), i);
      }
    }
  }
  /* one jeon face in its own buffer. o = { rx, ry, face 'raw' | 'top' | 'bottom', band, herb, dents [[dx, dy]] (from the
     centre), thick, seed (texture), ol (sel-out outline for light surfaces), glints [mid, single], garnish n, nolace }
     -> { buf, cx, cy, K (1 top, 2 side, 3 lace tooth, 4 lace hole), ID (FOOD id per pixel), rx, ry, th, hero, face, band } */
  function jeonBuf(o) {
    var rx = o.rx, ry = Math.max(1, o.ry), th = o.thick == null ? 2 : o.thick, pad = 4, band = clampI(o.band, 0, 2);
    var face = o.face === 'top' || o.face === 'raw' ? o.face : 'bottom', seed = o.seed == null ? 7 : o.seed | 0, herb = o.herb === 'tot' ? 'tot' : 'parae';
    var bw = 2 * rx + 1 + 2 * pad, bh = 2 * ry + 1 + 2 * pad + th, cx = rx + pad, cy = ry + pad, b = blank(bw, bh);
    var K = new Uint8Array(bw * bh), LT = new Int8Array(bw * bh), NV = new Uint8Array(bw * bh), DP = new Uint8Array(bw * bh), ID = new Array(bw * bh);
    var T = face === 'bottom' ? TB[band] : face === 'top' ? TT[band] : TR, small = rx < 16, x, y, i, k, h, q, t;
    var gw = T.gw ? (small ? band + 1 : T.gw) : 0;   /* golden setting band width (raw side up) */
    var cap = o.cap || (small ? 0.4 : T.cap) || 1;   /* a thumbnail gets a pin-point sheen, never a flat cream block */
    function at(px, py) { px += cx; py += cy; return px < 0 || py < 0 || px >= bw || py >= bh ? -1 : py * bw + px; }
    function kd(px, py) { var qq = at(px, py); return qq < 0 ? 0 : K[qq]; }
    function pf(px, py, id) { var qq = at(px, py); if (qq < 0) return; ID[qq] = id; put(b, cx + px, cy + py, fc(id)); }
    var SPAN = new Int16Array(2 * ry + 1);   /* half width of the ellipse per row (the silhouette, filled by spans) */
    for (y = -ry; y <= ry; y++) { var hw = -1; while (hw < rx && inE(hw + 1, y, rx, ry)) hw++; SPAN[y + ry] = hw; }
    for (k = th; k >= 0; k--) for (y = -ry; y <= ry; y++) { var row = (cy + y + k) * bw + cx; for (x = -SPAN[y + ry]; x <= SPAN[y + ry]; x++) K[row + x] = k ? 2 : 1; }
    /* lace: teeth just outside the silhouette (at the pan level on the near side) and, crisp, oil holes inside the rim */
    var lace = face === 'raw' || small || o.nolace || !T.tooth ? 0 : band;
    if (lace) {   /* lace: small clusters of crisp teeth just outside the rim (at the pan level on the near side), never single
                     hairs all round; crisp grows a denser, double-rowed lace and opens oil holes just inside the crust */
      var per = (13 * (rx + ry)) >> 1, nbl = T.nlace || (lace >= 2 ? 15 : 8);   /* about 2.3 deg per rim pixel */
      for (i = 0; i < nbl; i++) {
        var hh = ih(i, seed, 71), a0 = idiv(i * 360, nbl) + (hh % 11) - 5, wd = 2 + (hh >>> 4) % (lace >= 2 ? 3 : 2);
        for (var u = 0; u < wd; u++) {
          var dg = a0 + idiv(u * 360, per), c = icos(dg), s = isin(dg), dyb = s > 0 ? th : 0;
          var ex = iround(c * (rx + 1), 4096), ey = iround(s * (ry + 1), 4096) + dyb;
          if (at(ex, ey) >= 0 && !kd(ex, ey)) K[at(ex, ey)] = 3;
          var second = s > 0 ? (hh >>> 7) % 3 !== 0 : T.crust && (hh >>> 7) % 3 === 0;
          if (lace >= 2 && second && u === (wd >> 1)) { var e2x = iround(c * (rx + 2), 4096), e2y = iround(s * (ry + 2), 4096) + dyb; if (at(e2x, e2y) >= 0 && !kd(e2x, e2y)) K[at(e2x, e2y)] = 3; }
          var ix = iround(c * (rx - 3), 4096), iy = iround(s * (ry - 3), 4096);
          if (lace >= 2 && face === 'bottom' && u === (wd >> 1) && (hh >>> 9) % 2 === 0 && kd(ix, iy) === 1) K[at(ix, iy)] = 4;
        }
      }
    }
    /* depth from the rim (1 = outermost face pixel, capped at 9): a two-pass city-block distance transform */
    for (q = 0; q < K.length; q++) DP[q] = K[q] === 1 || K[q] === 4 ? 9 : 0;
    for (y = 0; y < bh; y++) for (x = 0; x < bw; x++) {
      q = y * bw + x; if (!DP[q]) continue;
      var up = y > 0 ? DP[q - bw] : 0, lf = x > 0 ? DP[q - 1] : 0, m1 = (up < lf ? up : lf) + 1;
      if (m1 < DP[q]) DP[q] = m1;
    }
    for (y = bh - 1; y >= 0; y--) for (x = bw - 1; x >= 0; x--) {
      q = y * bw + x; if (!DP[q]) continue;
      var dn = y < bh - 1 ? DP[q + bw] : 0, rt = x < bw - 1 ? DP[q + 1] : 0, m2 = (dn < rt ? dn : rt) + 1;
      if (m2 < DP[q]) DP[q] = m2;
    }
    function dep(px, py) { var qq = at(px, py); return qq < 0 ? 0 : DP[qq]; }
    /* the raw side's setting band needs a round width: a 3-4 chamfer distance (thirds of a px), only for that face */
    var DE = null;
    if (face === 'top' && !small) {
      DE = new Uint16Array(bw * bh);
      for (q = 0; q < K.length; q++) DE[q] = K[q] === 1 || K[q] === 4 ? 999 : 0;
      for (y = 1; y < bh - 1; y++) for (x = 1; x < bw - 1; x++) { q = y * bw + x; if (DE[q]) DE[q] = Math.min(DE[q], DE[q - 1] + 3, DE[q - bw] + 3, DE[q - bw - 1] + 4, DE[q - bw + 1] + 4); }
      for (y = bh - 2; y > 0; y--) for (x = bw - 2; x > 0; x--) { q = y * bw + x; if (DE[q]) DE[q] = Math.min(DE[q], DE[q + 1] + 3, DE[q + bw] + 3, DE[q + bw + 1] + 4, DE[q + bw - 1] + 4); }
    }
    /* browning thresholds: quantiles of the field over this face (biased toward the rim), so the browned share is exact */
    var TM = -1e9, TC = -1e9, TD = -1e9, TL = 1e9, HIST = face === 'bottom' ? new Uint32Array(400) : null, nv1 = 0;
    for (y = 0; y < bh; y++) for (x = 0; x < bw; x++) {
      q = y * bw + x; if (!K[q]) continue;
      var X0 = x - cx, Y0 = y - cy;
      NV[q] = noise(X0 + 64 + (Y0 >> 1), Y0 + 64, seed);
      if (HIST && K[q] === 1) { HIST[NV[q] - (((X0 * X0) / (rx * rx) + (Y0 * Y0) / (ry * ry)) * 70 | 0) + 100]++; nv1++; }
    }
    if (HIST && nv1) {   /* thresholds are quantiles of the field over this face (counted, not sorted) */
      var qv = function (fr) { var want = (nv1 * fr) | 0, acc = 0; for (var v = 0; v < 400; v++) { acc += HIST[v]; if (acc > want) return v - 100; } return 299; };
      TM = qv(T.mshare); TC = qv(T.mshare * T.cshare); TL = qv(0.88); if (T.deep) TD = qv(0.03);
    }
    var wet = face !== 'bottom' && T.streak && !small;   /* raw batter, either side: the sheen is a streak, not a cap */
    for (var yy = 0; yy < bh; yy++) for (var xx = 0; xx < bw; xx++) {
      q = yy * bw + xx; var kk = K[q]; if (!kk) continue;
      x = xx - cx; y = yy - cy;
      var nv = NV[q], L = lightOf(x, y, rx, ry, cap, nv), col, lit = x / rx + y / ry < -0.15;
      if (wet && L > 0) L = 0;
      LT[q] = L;
      if (kk === 2) col = yy + 1 < bh && K[q + bw] === 2 ? T.side[0] : T.side[1];
      else if (kk === 3) col = lit || L > 0 ? T.tooth[0] : T.tooth[1];
      else if (kk === 4) col = face === 'bottom' ? 'O1' : 'J4';
      else {
        col = L > 0 ? T.sheen : L < 0 ? T.shade : T.base;
        if (wet && streakOf(x, y, rx, ry, nv)) { col = T.sheen; LT[q] = 1; }
        if (face === 'top') {   /* the raw side sets from the rim inward: a golden band (gw px, darker outside) and a broken
                                   matte ring just inside it; the wet egg-yellow centre keeps its streak */
          var de = DE ? ((DE[q] + 1) / 3 | 0) + (nv > 168 ? 1 : nv < 88 ? -1 : 0) : DP[q];
          if (de <= gw) { var gi = Math.max(0, Math.min(gw - 1, de - 1)) + T.gw - gw; col = lit ? T.goldLit[gi] : T.gold[gi]; LT[q] = 0; }
          else if (de === gw + 1 && nv > 120 && !lit) col = T.set;
        } else if (face === 'bottom') {
          var nb2 = nv - ((((x * x) / (rx * rx) + (y * y) / (ry * ry)) * 70) | 0);
          if (nb2 < TD) col = T.deep;
          else if (nb2 < TC) col = L > 0 ? T.mot : T.core;
          else if (nb2 < TM) col = L > 0 ? js(T.mot, 1) : T.mot;
          else if (nb2 > TL && L >= 0) col = T.sheen;
          if (T.crust && DP[q] === 2 && !small) col = nv < 104 ? T.crust[0] : T.crust[1];   /* the crisp crust: 2 px, unbroken */
        }
        if (DP[q] === 1 && face !== 'top') col = lit ? T.edgeLit : T.edge;
      }
      ID[q] = col; put(b, xx, yy, fc(col));
    }
    var area = rx * ry / 551;   /* 551 = 29 x 19, the pan size the counts were tuned on */
    var inner = function (px, py) { return kd(px, py) === 1 && dep(px, py) >= (small ? 2 : 3); };
    if (T.freck && ry > 4) {   /* crisp freckles: small dark spots where the batter fried hardest, never in the sheen */
      for (i = 0, k = 0; i < 80 && k < (small ? (T.crust ? 2 : 0) : Math.max(1, Math.round(T.freck * area))); i++) {
        h = ih(i, seed, 717);
        var fx = hoff(h, rx, 8), fy = hoff(h >>> 10, ry, 8);
        if (!inner(fx, fy) || dep(fx, fy) < (small ? 2 : 4) || LT[at(fx, fy)] > 0) continue;
        pf(fx, fy, T.fcol);
        if (!small && (h >>> 20) % 3 === 0 && inner(fx + 1, fy)) pf(fx + 1, fy, T.fcol);
        if (!small && (h >>> 22) % 2 === 0 && inner(fx, fy + 1)) pf(fx, fy + 1, js(T.fcol, 1));
        k++;
      }
    }
    if (ry > 4) {
      if (herb === 'parae') {   /* bright wavy tangled strands: a lit end, a body, a tail; 30 % sink under the crust when cooked */
        var hb = face !== 'bottom' ? ['P2', 'P3', 'P1'] : ['P1', 'P2', 'P0'], cnt = small ? 9 : Math.max(3, Math.round((face === 'bottom' ? 24 : 22) * area));
        strands(0, 0, rx, ry, cnt, seed, small, function (px, py) { return inE(px, py, rx - 3, ry - (small ? 2 : 3)) && inner(px, py); },
          function (px, py, id, n) {
            var emb = face === 'bottom' && (ih(n, seed, 502) % 10) < 3;
            pf(px, py, emb ? (id === hb[1] ? hb[2] : 'P0') : id);
          },
          function (n, t2, last) { return t2 === 0 ? hb[1] : t2 === last ? hb[2] : (ih(n, t2, seed + 503) % 5 === 0 ? hb[2] : hb[0]); });
        if (!small) for (q = 0; q < bw * bh; q++) {   /* a wet glint on a few strands in the sheen */
          if (ID[q] !== hb[1] || LT[q] <= 0) continue;
          var gx0 = (q % bw) - cx, gy0 = ((q / bw) | 0) - cy - 1;
          if (inner(gx0, gy0) && !/^P/.test(ID[at(gx0, gy0)] || '')) pf(gx0, gy0, 'P3');
        }
      } else {                  /* tot (hijiki): short glossy near-black sprigs, 3-5 px with a bend now and then, never crowded;
                                   the lamp-side end dark green, and on half of them a hard white glint there (wet and shiny) */
        var tn = small ? 7 : Math.max(4, Math.round(20 * area)), tsp = [];
        for (i = 0, k = 0; i < 3 * tn && k < tn; i++) {
          h = ih(i, seed, 503);
          var tx = hoff(h, rx, 8), ty = hoff(h >>> 10, ry, 8), crowd = false;
          if (!inE(tx, ty, rx - 4, ry - 3) || !inner(tx, ty)) continue;
          for (q = 0; q < tsp.length; q++) if (Math.abs(tsp[q][0] - tx) + Math.abs(tsp[q][1] - ty) < (small ? 3 : 4)) crowd = true;
          if (crowd) continue;
          tsp.push([tx, ty]); k++;
          var TP = strandPts(i + 211, seed + 7, small ? 2 + ((h >>> 20) & 1) : 3 + ((h >>> 20) % 3)), gl = !small && ((h >>> 23) & 1) === 0;
          for (t = 0; t < TP.length; t++) {
            var sx2 = tx + TP[t][0], sy2 = ty + TP[t][1];
            if (inner(sx2, sy2)) pf(sx2, sy2, t === 0 ? (gl && LT[at(sx2, sy2)] >= 0 ? 'G0' : 'T1') : t === 1 && gl ? 'T1' : 'T0');
          }
        }
      }
      /* bubble holes on the raw side while it cooks: a small pit with a lit lip below it, in the wet part only */
      if (face === 'top' && !small) {
        for (i = 0, k = 0; i < 80 && k < T.holes; i++) {
          h = ih(i, seed, 333);
          var bx = hoff(h, rx, 8), by = hoff(h >>> 10, ry, 8), bid = ID[at(bx, by)];
          if (!inner(bx, by) || !inner(bx, by + 1) || /^P/.test(bid || '') || /^P/.test(ID[at(bx, by + 1)] || '')) continue;
          var wt = bid === 'B1' || bid === 'J6' || bid === 'B2';
          pf(bx, by, wt ? 'B2' : 'J3'); pf(bx, by + 1, 'J6'); k++;
        }
      }
    }
    if (o.dents && o.dents.length && ry > 8) dimples(b, o.dents.map(function (dd) { return [dd[0] | 0, dd[1] | 0]; }),
      face === 'bottom' ? [T.base, T.base, T.sheen, 'G0'] : ['B2', 'B1', 'J6', 'G0'], function (qx2, qy2) { return kd(qx2, qy2) === 1 && dep(qx2, qy2) >= 2; }, pf);
    if (o.garnish) garnish(cx, cy, rx, ry, o.garnish | 0, function (qx3, qy3) { return kd(qx3 - cx, qy3 - cy) === 1 && dep(qx3 - cx, qy3 - cy) >= 2; },
      function (qx4, qy4, id) { pf(qx4 - cx, qy4 - cy, id); });
    /* glints: the hero (a cluster on the cooked face, a streak glint on raw batter), mid 2x1 and single sparks biased to
       the lit side (never on a dark tone), and a wet shine line just inside the rim on the lamp side: hard white dashes */
    var nm, ns;
    if (face === 'bottom') { nm = 3; ns = 8; } else if (face === 'top') { nm = band ? 2 : 3; ns = band ? 4 : 6; } else { nm = 2; ns = 5; }
    if (o.glints) { nm = o.glints[0]; ns = o.glints[1]; }
    var hx = wet ? -tz(rx * 0.47) : -tz(rx * 0.42), hy = wet ? -tz(ry * 0.47) : -tz(ry * 0.48), G = [[hx, hy]], tries = 0, placed = 0;
    var DARKID = { J0: 1, J1: 1, J2: 1, P0: 1, P1: 1, T0: 1, T1: 1, O0: 1, O1: 1, C0: 1, C1: 1 };
    while (placed < nm + ns && tries < 400) {
      tries++;
      var hg = ih(tries, seed, 911), gx = hoff(hg, rx, 9), gy = hoff(hg >>> 10, ry, 9);
      if (!inner(gx, gy)) continue;
      var Lg = LT[at(gx, gy)];
      if (((hg >>> 20) % 100) >= (Lg > 0 ? 100 : Lg === 0 ? 30 : 4)) continue;
      if (DARKID[ID[at(gx, gy)]]) continue;
      if (face !== 'bottom' && ID[at(gx, gy)] !== 'B1' && ID[at(gx, gy)] !== 'J6' && ID[at(gx, gy)] !== 'J5') continue;
      var near = false; for (q = 0; q < G.length; q++) if (Math.abs(gx - G[q][0]) + Math.abs(gy - G[q][1]) < 4) near = true;
      if (near) continue;
      G.push([gx, gy]);
      if (placed < nm) { pf(gx, gy, 'G0'); if (inner(gx + 1, gy)) pf(gx + 1, gy, 'G0'); if (inner(gx, gy + 1) && face === 'bottom') pf(gx, gy + 1, js(T.base, 1)); } else pf(gx, gy, 'G0');
      placed++;
    }
    if (!small && ry > 8) {   /* wet shine line on the lamp side: dashes just inside the rim (raw side up: just inside the
                                 golden band, where the wet batter meets the set edge; crisp: just inside the crust) */
      var dl = face === 'top' ? gw + 1 : T.crust ? 3 : 2, arc = [];
      for (y = -ry; y <= ry; y++) for (x = -rx; x <= rx; x++) if (dep(x, y) === dl && kd(x, y) === 1 && x / rx + y / ry < -0.62) arc.push([x, y]);
      arc.sort(function (p1, p2) { return pang(p1[0] * ry, p1[1] * rx) - pang(p2[0] * ry, p2[1] * rx); });
      var DASH = face === 'bottom' ? ['G0', 'G0', 'J6', null, null, 'G0', null, null, null] : ['G0', 'J6', null, null, 'G0', 'G0', null, null];
      arc.forEach(function (p, n2) { var id = DASH[(n2 + (seed & 3)) % DASH.length]; if (id && !DARKID[ID[at(p[0], p[1])]] && (ID[at(p[0], p[1])] || '').charAt(0) !== 'P') pf(p[0], p[1], id); });
    }
    if (ry > 3 && wet) {   /* raw batter: the streak glint, 5-6 hard white px along the rim tangent with a cream halo */
      var SG = STREAK_G[rx >= 36 ? 'l' : 'm'], gset = {};
      SG.forEach(function (p) { gset[(p[0] + 8) * 32 + p[1] + 8] = 1; });
      SG.forEach(function (p) { for (var dy2 = -1; dy2 <= 1; dy2++) for (var dx2 = -1; dx2 <= 1; dx2++) { var X = hx + p[0] + dx2, Y = hy + p[1] + dy2; if (!gset[(p[0] + dx2 + 8) * 32 + p[1] + dy2 + 8] && inner(X, Y)) pf(X, Y, 'J6'); } });
      SG.forEach(function (p) { if (inner(hx + p[0], hy + p[1])) pf(hx + p[0], hy + p[1], 'G0'); });
    } else if (ry > 3) {
      var HS = HERO[rx >= 36 ? 'l' : rx >= 16 ? 'm' : 's'], partner = face === 'bottom' ? js(T.base, -1) : 'B2';
      for (y = 0; y < HS.length; y++) for (x = 0; x < HS[y].length; x++) {
        var ch = HS[y].charAt(x), X3 = hx - 1 + x, Y3 = hy - 1 + y;
        if (ch === '.' || !inner(X3, Y3)) continue;
        pf(X3, Y3, ch === 'G' ? 'G0' : ch === 'c' ? 'J6' : partner);
      }
      if (!small) CLUSTER.forEach(function (g, n3) { var X2 = hx + g[0], Y2 = hy + g[1]; if (inner(X2, Y2) && (face === 'bottom' || n3 === 0)) pf(X2, Y2, 'G0'); });
    }
    if (o.ol) {   /* sel-out outline on light surfaces: the food's own dark crust, darkest only on the lower right */
      for (y = -cy; y < bh - cy; y++) for (x = -cx; x < bw - cx; x++) {
        if (kd(x, y) || at(x, y) < 0) continue;
        if (kd(x + 1, y) || kd(x - 1, y) || kd(x, y + 1) || kd(x, y - 1)) pf(x, y, x / rx + y / ry > 0.55 ? 'J0' : 'J1');
      }
    }
    return { buf: b, cx: cx, cy: cy, K: K, ID: ID, rx: rx, ry: ry, th: th, hero: [cx + hx, cy + hy], face: face, band: band, seed: seed };
  }
  /* the texture seed of a dish comes from what the player's hands did (the dents), so the pan, the board, the reveal, the
     counter plate and the notebook all show the same jeon without anyone passing a seed */
  function texSeed(ds) { var h = 0x9e37; (ds || []).forEach(function (d) { h = ih(h, (d[0] | 0) * 64 + (d[1] | 0), 0x5eed); }); return (h & 0x7fffffff) || 7; }
  function faceKey(rx, ry, face, band, herb, th, ds, seed, o) {
    return [rx, ry, face, band, herb, th, JSON.stringify(ds), seed, o.ol ? 1 : 0, o.cap || 0, o.glints ? o.glints.join(',') : '', o.garnish | 0, o.nolace ? 1 : 0].join('|');
  }
  /* jeon on the stage. o = { cx, cy, rx, ry, face, band, herb, dents (food-box px), flash, thick, cuts: [{ deg, x, y }], sep,
     cutFlash, seed, ol, gap (colour of an opened cut), nudge (pull the pieces apart by the seed), half, glints, garnish }.
     The face and the cut composite are cached by their inputs (never by frame); flash and cutFlash are drawn on top. */
  function jeonComp(o) {
    var rx = o.rx || GEO.food.rx[2], ry = o.ry || GEO.food.ry[2], cx = o.cx == null ? GEO.food.cx : o.cx | 0, cy = o.cy == null ? GEO.food.cy : o.cy | 0;
    var dl = (o.dents || []).slice(0, 9);
    var ds = dl.map(function (d) { return [idiv(((d[0] | 0) - 32) * rx, GEO.food.rx[2]), idiv(((d[1] | 0) - 24) * ry, GEO.food.ry[2])]; });
    var cuts = (o.cuts || []).map(function (c) { return [Math.round(+c.deg || 0), c.x == null ? 0 : (c.x | 0) - cx, c.y == null ? 0 : (c.y | 0) - cy]; });
    var face = o.face === 'top' || o.face === 'raw' ? o.face : 'bottom', band = clampI(o.band, 0, 2), herb = o.herb === 'tot' ? 'tot' : 'parae', th = o.thick == null ? 2 : o.thick | 0;
    var sep = o.sep == null ? 1 : o.sep | 0, seed = o.seed == null ? texSeed(dl) : o.seed | 0;
    var fk = faceKey(rx, ry, face, band, herb, th, ds, seed, o);
    var J = lruGet(FACES, fk, function () { return jeonBuf({ rx: rx, ry: ry, face: face, band: band, herb: herb, dents: ds, thick: th, seed: seed, ol: o.ol, cap: o.cap, glints: o.glints, garnish: o.garnish, nolace: o.nolace }); });
    if (!cuts.length) return { buf: J.buf, ox: -J.cx, oy: -J.cy, J: J, gaps: [] };
    return lruGet(CUTS, fk + '#' + JSON.stringify(cuts) + '|' + sep + '|' + (o.half ? 1 : 0) + '|' + (o.gap || '') + '|' + (o.nudge ? 1 : 0), function () {
      var r = cutBuf(J, cuts, sep, o.gap, seed, o.half, o.nudge); r.J = J; return r;
    });
  }
  function jeon(b, o) {
    var R = jeonComp(o), cx = o.cx == null ? GEO.food.cx : o.cx | 0, cy = o.cy == null ? GEO.food.cy : o.cy | 0;
    blit(b, R.buf, cx + R.ox, cy + R.oy);
    if (o.flash) flashRim(b, R.J, cx - R.J.cx, cy - R.J.cy);
    if (o.cutFlash && R.gaps) R.gaps.forEach(function (g) { put(b, cx + R.ox + g[0], cy + R.oy + g[1], C.s6); });
    return R;
  }
  /* one-frame bright rim (a hit, a pat, a nudge in reduced motion): the ring of empty pixels round the silhouette */
  function flashRim(b, J, ox, oy) {
    var K = J.K, w = J.buf.w, h = J.buf.h;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      if (K[y * w + x]) continue;
      if ((x + 1 < w && K[y * w + x + 1]) || (x > 0 && K[y * w + x - 1]) || (y + 1 < h && K[(y + 1) * w + x]) || (y > 0 && K[(y - 1) * w + x])) put(b, ox + x, oy + y, C.s6);
    }
  }
  /* split a jeon by straight cuts: every piece moves `sep` px away from each cut (normal snapped to 8 directions); with
     `nudge` each piece also slides 0..1 px further out by the seed, so four pieces never line up into a perfect cross.
     Cut faces read as food, never as a plate-coloured line: the piece above a gap shows its soft inside (batter with a
     seaweed fleck) and, if the gap is wide, the crust under it; the piece below shows a crust line; the left piece a
     shaded column, the right piece a lit one. The rest of an opened gap is `gap` (the surface under it, in shadow).
     Returns { buf, ox, oy, gaps } (gaps = opened pixels, for a one-frame flash). Integer math only. */
  function cutBuf(J, cuts, sep, gap, seed, half, nudge) {
    var src = J.buf, P = 6, out = blank(src.w + 2 * P, src.h + 2 * P), W2 = out.w, occ = new Uint8Array(out.w * out.h), i, j, k;
    var T = J.face === 'bottom' ? TB[J.band] : TR;
    var L = cuts.map(function (c) {
      var s = isin(c[0]), co = icos(c[0]);
      var nx = -s > 1567 ? 1 : -s < -1567 ? -1 : 0, ny = co > 1567 ? 1 : co < -1567 ? -1 : 0;
      return { s: s, c: co, x: J.cx + c[1], y: J.cy + c[2], nx: nx, ny: ny };
    });
    var piece = new Uint8Array(src.w * src.h), NUD = {};
    for (j = 0; j < src.h; j++) for (i = 0; i < src.w; i++) {
      var si = (j * src.w + i) << 2; if (!src.d[si + 3]) continue;
      var mx = 0, my = 0, key = 0, ox2 = 0, oy2 = 0;
      for (k = 0; k < L.length; k++) {
        var X = 2 * (i - L[k].x) + 1, Y = 2 * (j - L[k].y) + 1, neg = X * L[k].s - Y * L[k].c < 0;
        var vx = neg ? L[k].nx : -L[k].nx, vy = neg ? L[k].ny : -L[k].ny;
        if (neg) key |= 1 << k;
        ox2 += vx; oy2 += vy;
        if (half && vx + vy >= 0) continue;   /* half: only the piece moving up / left moves -> a 1-px gap */
        mx += vx * sep; my += vy * sep;
      }
      if (nudge) {
        var nd = NUD[key];
        if (!nd) {   /* one loose piece (by the seed) slides 2 px out, the others 0..1 px along one axis: served, not a pizza */
          var hn = ih(key, seed, 4747), ax = hn % 3, sx2 = ox2 > 0 ? 1 : ox2 < 0 ? -1 : 0, sy2 = oy2 > 0 ? 1 : oy2 < 0 ? -1 : 0;
          nd = NUD[key] = key === (ih(seed, 77, 4748) % (1 << L.length)) ? [2 * sx2, sy2] : [ax === 0 ? sx2 : 0, ax === 1 ? sy2 : 0];
        }
        mx += nd[0]; my += nd[1];
      }
      piece[j * src.w + i] = key + 1;
      var tx = i + mx + P, ty = j + my + P, ti = (ty * W2 + tx) << 2;
      out.d[ti] = src.d[si]; out.d[ti + 1] = src.d[si + 1]; out.d[ti + 2] = src.d[si + 2]; out.d[ti + 3] = 255; occ[ty * W2 + tx] = 1;
    }
    var inSil = function (x, y) { x -= P; y -= P; return x >= -2 && y >= -2 && x < src.w + 2 && y < src.h + 2 && (x >= 0 && y >= 0 && x < src.w && y < src.h ? J.K[y * src.w + x] > 0 : false); };
    var N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], faces = [], gaps = [], below = {};
    for (j = 0; j < out.h; j++) for (i = 0; i < W2; i++) {
      if (!occ[j * W2 + i]) continue;
      for (var q = 0; q < 4; q++) { var gx = i + N4[q][0], gy = j + N4[q][1]; if (gx >= 0 && gy >= 0 && gx < W2 && gy < out.h && !occ[gy * W2 + gx] && inSil(gx, gy)) { faces.push([i, j, q]); break; } }
    }
    for (j = 0; j < out.h; j++) for (i = 0; i < W2; i++) if (!occ[j * W2 + i] && inSil(i, j)) gaps.push([i, j]);
    /* the opened cut: a 1-px crack is the gap colour (J1); a wider opening shows the far piece's cut wall (its soft inside,
       a seaweed fleck, then its bottom crust) and, where the opening is wider still, a warm dark shadow (never the plate) */
    var isOcc = function (x, y) { return x >= 0 && y >= 0 && x < W2 && y < out.h && occ[y * W2 + x] === 1; };
    if (gap) gaps.forEach(function (g) {
      var x = g[0], y = g[1], col;
      if ((isOcc(x - 1, y) && isOcc(x + 1, y)) || (isOcc(x, y - 1) && isOcc(x, y + 1))) col = gap;
      else if (isOcc(x, y - 1)) col = fc(ih(x, y, seed + 9) % 5 === 0 ? 'P1' : 'J5');
      else if (isOcc(x, y - 2) && !isOcc(x, y - 1)) col = fc(T.side[0]);
      else col = C.w1;
      put(out, x, y, col);
    });
    faces.forEach(function (f) {
      var q2 = f[2], col = q2 === 0 ? T.side[1] : q2 === 1 ? js(T.base, 1) : q2 === 3 ? T.side[0] : (ih(f[0], f[1], seed + 9) % 5 === 0 ? 'P1' : 'B1');
      put(out, f[0], f[1], fc(col));
    });
    return { buf: out, ox: -J.cx - P, oy: -J.cy - P, gaps: gaps };
  }

  /* =====================================================================================
   *  HEAT FX (stateless, 12 fps): oil ring, bubbles, spatter, rim specks, steam (curls + puffs), flip burst, twinkles.
   *  Every effect is a pure function of (frame counters, band, seed): repeating emitter slots hashed with ih(). Every
   *  period divides LOOP = 96 frames (8 s), so steady frames repeat exactly every 96 frames.
   * ===================================================================================== */
  var LOOP = 96;
  var NB = [5, 11, 16], NS = [1, 4, 7], NK = [3, 7, 10], NW = [1, 3, 4], RMAX = [3, 4, 5];   /* per band 0 / 1 / 2 */
  var PBB = [[8], [8, 12], [8, 8, 12]], PK = [6, 8, 12], PSB = [[12], [8, 12], [8, 12, 16]], PWB = [[32, 48], [32, 48], [24, 32]];
  function pang(dx, dy) { if (!dx && !dy) return 0; var p = dx / (Math.abs(dx) + Math.abs(dy)); return dy < 0 ? 3 + p : 1 - p; }   /* pseudo-angle */
  /* oil ring (1 px for band 0, 2 px for bands 1-2; solid, golden dashes and three lamp reflections on the lit arc) + fx
     anchors, cached per face: ring = outside pixels touching the silhouette, edge = outermost food pixels, lit = the edge's
     lamp side, litRing = the ring's lamp side */
  function heatKit(J) {
    var bw = J.buf.w, bh = J.buf.h, K = J.K, cx = J.cx, cy = J.cy, rx = J.rx, ry = J.ry, x, y, q, n = bw * bh;
    var inS = function (px, py) { return px >= 0 && py >= 0 && px < bw && py < bh && K[py * bw + px] > 0; };
    var oil = [blank(bw, bh), blank(bw, bh)], ring = [], ring2 = [], edge = [], D1 = new Uint8Array(n), D2 = new Uint8Array(n);
    for (y = 0; y < bh; y++) for (x = 0; x < bw; x++) {   /* D1 = within one pixel of the food (8-neighbour), D2 = within two */
      if (!K[y * bw + x]) continue;
      for (var dy = -2; dy <= 2; dy++) { var yy = y + dy; if (yy < 0 || yy >= bh) continue; for (var dx = -2; dx <= 2; dx++) { var xx = x + dx; if (xx < 0 || xx >= bw) continue; q = yy * bw + xx; if (dx >= -1 && dx <= 1 && dy >= -1 && dy <= 1) D1[q] = 1; D2[q] = 1; } }
    }
    for (y = 0; y < bh; y++) for (x = 0; x < bw; x++) {
      q = y * bw + x;
      if (K[q]) { var kk = K[q]; if ((kk === 1 || kk === 3) && (!inS(x + 1, y) || !inS(x - 1, y) || !inS(x, y + 1) || !inS(x, y - 1))) edge.push([x, y]); continue; }
      if (!D2[q]) continue;
      var X = x - cx, Y = y - cy, litArc = (X < 0 && Y < 0) || (X < -0.75 * Math.abs(Y));
      if (D1[q]) {
        put(oil[0], x, y, F.O0);
        put(oil[1], x, y, litArc && ((((3 * X + 5 * Y) % 3) + 3) % 3) === 0 ? F.O1 : F.O0);
        if (litArc && ((((3 * X + 5 * Y) % 5) + 5) % 5) === 0) put(oil[0], x, y, F.O1);
        if (inS(x + 1, y) || inS(x - 1, y) || inS(x, y + 1) || inS(x, y - 1)) ring.push([x, y]);
      } else { put(oil[1], x, y, F.O0); ring2.push([x, y]); }
    }
    var ang = function (p) { return pang((p[0] - cx) * ry, (p[1] - cy) * rx); };
    ring.sort(function (a, b) { return ang(a) - ang(b); }); edge.sort(function (a, b) { return ang(a) - ang(b); }); ring2.sort(function (a, b) { return ang(a) - ang(b); });
    var lit = edge.filter(function (p) { return (p[0] - cx) / rx + (p[1] - cy) / ry < 0.3; });
    var litRing = ring.filter(function (p) { return (p[0] - cx) / rx + (p[1] - cy) / ry < -0.6; });
    [0.2, 0.55, 0.85].forEach(function (q) { var p = litRing[(q * litRing.length) | 0]; if (p) { put(oil[0], p[0], p[1], F.G0); put(oil[1], p[0], p[1], F.G0); } });
    return { oil: oil, ring: ring, ring2: ring2, edge: edge, lit: lit.length ? lit : edge, litRing: litRing.length ? litRing : ring, cx: cx, cy: cy, rx: rx, ry: ry };
  }
  /* emitter slot i: age a in its cycle, its period, the frame its cycle began, a hash that changes every cycle (and
     repeats every LOOP frames). With n (the slot count), the phases are spread evenly instead of hashed, so a band never
     has a moment with no bubble alive. */
  function slot(i, f, PS, seed, salt, n) {
    var h0 = ih(i, seed, salt), P = PS[n ? i % PS.length : h0 % PS.length], ph = n ? idiv(i * P, n) % P : (h0 >>> 8) % P;
    var a = (f + ph) % P, cyc = Math.floor((f + ph) / P), nc = LOOP / P;
    if (a < 0) a += P;
    return { a: a, P: P, start: f - a, h: ih(i * 131 + (((cyc % nc) + nc) % nc), seed, salt + 1) };
  }
  /* emitters that join on a band change only start cycles after it (no pop-in mid-life); all wait for heat-on */
  function gateOf(fh, fbc, band) { return function (i, tab) { return band > 0 && i >= tab[band - 1] ? fh - fbc : 0; }; }
  /* a bubble in the oil (12 fps frames): it swells for two frames, then pops with a white speck and throws two drops */
  var BUB = [
    [[0, 0, 'J5'], [1, 0, 'O1']],                                                              /* a0 nucleus: a 2-px bead */
    [[0, 0, 'G0'], [1, 0, 'J5'], [0, 1, 'O1'], [1, 1, 'O1']],                                  /* a1 swell: a 2 x 2 dome */
    [[0, -1, 'J6'], [1, -1, 'J5'], [-1, 0, 'J6'], [0, 0, 'G0'], [1, 0, 'J5'], [-1, 1, 'O1'], [0, 1, 'O1'], [1, 1, 'O0']],   /* a2 swell: 3 x 3 */
    [[0, 0, 'G0'], [-1, -1, 'J6'], [1, -1, 'J6'], [-1, 1, 'O1'], [1, 1, 'O1'], [0, -2, 'G0']], /* a3 pop: a white speck and a burst */
    [[-2, -2, 'J4'], [2, -2, 'J5'], [0, -3, 'J6']]];                                           /* a4 drops */
  var BIG = [BUB[0], BUB[1], BUB[2],                                                          /* band 2: a fat 5 x 5 boil */
    [[-1, -1, 'O0'], [0, -1, 'O0'], [1, -1, 'O0'], [-1, 0, 'O0'], [0, 0, 'O0'], [1, 0, 'O0'], [-1, 1, 'O0'], [0, 1, 'O0'], [1, 1, 'O0'],
     [-1, -2, 'J6'], [0, -2, 'G0'], [1, -2, 'J6'], [-2, -1, 'J6'], [-2, 0, 'J6'], [2, -1, 'O1'], [2, 0, 'O1'], [-2, 1, 'O1'], [2, 1, 'O1'],
     [-1, 2, 'O1'], [0, 2, 'O1'], [1, 2, 'O1'], [-1, -1, 'G0']],
    [[0, 0, 'G0'], [0, -1, 'G0'], [-2, -2, 'J6'], [2, -2, 'J6'], [-2, 1, 'J5'], [2, 1, 'J5'], [0, -3, 'J5']],
    [[-3, -4, 'J4'], [3, -4, 'J4'], [0, -5, 'J5'], [-1, -6, 'J6']]];
  function drawBub(b, fr, x, y) { for (var q = 0; q < fr.length; q++) put(b, x + fr[q][0], y + fr[q][1], F[fr[q][2]]); }
  /* band 0 (thin oil, pale golden rim): the bubbles sit one px further out, in the oil with a dark gap to the rim, so the
     few soft bubbles read as bubbles in the oil, not as sparkle on the golden rim */
  function fxBubbles(b, kit, ox, oy, fh, band, seed, gate, front) {
    var R = kit.ring, N = NB[band], out = band === 0 ? 2 : 1;
    for (var i = 0; i < N; i++) {
      var s = slot(i, fh, PBB[band], seed, 1000, N), seq = band === 2 && (s.h % 3) === 0 ? BIG : BUB;
      if (s.a >= seq.length) continue;   /* new slots join at once on a band change: the boil is part of the beat */
      var sec = idiv(R.length, N), p = R[(idiv(i * R.length, N) + s.h % Math.max(1, sec - 2)) % R.length], X0 = p[0] - kit.cx, Y0 = p[1] - kit.cy;   /* each slot owns a sector of the ring */
      if ((p[1] > kit.cy) !== !!front) continue;
      drawBub(b, seq[s.a], ox + p[0] + (2 * X0 > kit.rx ? out : 2 * X0 < -kit.rx ? -out : 0), oy + p[1] + (2 * Y0 > kit.ry ? out : 2 * Y0 < -kit.ry ? -out : 0));   /* sits on the oil, not on the crust */
    }
  }
  /* a flick of hot oil: up 2-3 px per frame, out 1-2 px, gravity 1; white, white, cream, yolk, gold, oil; short tail */
  function spat(b, kit, ox, oy, p, a, h) {
    var x0 = p[0] - kit.cx, nx = x0 * 4 > kit.rx ? 1 : x0 * 4 < -kit.rx ? -1 : 0;
    var vx = nx * (1 + ((h >>> 9) % 2)), vy = -(2 + ((h >>> 11) % 2));
    var X = function (t) { return ox + p[0] + vx * t; }, Y = function (t) { return oy + p[1] + vy * t + ((t * (t - 1)) >> 1); };
    put(b, X(a), Y(a), F[['G0', 'G0', 'J6', 'J5', 'J4', 'O1'][a]]);
    if (a >= 1 && a <= 3) put(b, X(a - 1), Y(a - 1), F[a === 1 ? 'J6' : a === 2 ? 'J5' : 'J4']);
  }
  function fxSpatter(b, kit, ox, oy, fh, band, seed, gate) {   /* band 0: one flick a second; more and faster per band */
    for (var i = 0; i < NS[band]; i++) {
      var s = slot(i, fh, PSB[band], seed, 2000, band ? 0 : 1);
      if (s.a > 5 || s.start < gate(i, NS)) continue;
      spat(b, kit, ox, oy, kit.ring[s.h % kit.ring.length], s.a, s.h);
    }
  }
  function fxSpecks(b, kit, ox, oy, fh, band, seed, gate) {   /* sizzle specks blink on the rim, 80 % on the lamp side */
    for (var i = 0; i < NK[band]; i++) {
      var s = slot(i, fh, PK, seed, 3000);
      if (s.a > 1 || s.start < gate(i, NK)) continue;
      var litp = ((s.h >>> 7) % 10) < 8, pool = litp ? kit.lit : kit.edge, p = pool[s.h % pool.length], X = ox + p[0], Y = oy + p[1];
      put(b, X, Y, F[s.a ? 'J6' : 'G0']);
      if (!s.a && band === 2 && litp && ((s.h >>> 12) % 4) === 0) { put(b, X - 1, Y, F.J6); put(b, X + 1, Y, F.J6); put(b, X, Y - 1, F.J6); }
    }
  }
  /* heat on (fw = frames since heat-on, 0..7): the whole oil ring wakes up at once (frame 0: a broken gold ring, domes,
     rim specks), frame 1 the domes open, frames 2..6 pops and two flicks. Lines up with the first sizzle. */
  function fxWake(b, kit, ox, oy, fw, seed) {
    var R = kit.ring, n = R.length, i, h, a;
    if (fw === 0) {   /* the hot oil flashes all round: a bright ring, a dashed second ring, a few white sparks */
      R.forEach(function (p, j) { var lt = (p[0] - kit.cx) / kit.rx + (p[1] - kit.cy) / kit.ry < -0.2; put(b, ox + p[0], oy + p[1], F[lt ? 'J6' : (j & 1) ? 'J4' : 'J5']); });
      kit.ring2.forEach(function (p, j) { if ((j >> 1) % 3 === 0) put(b, ox + p[0], oy + p[1], F.O1); });
      for (i = 0; i < 6; i++) { var g = R[idiv((2 * i + 1) * n, 12)]; put(b, ox + g[0], oy + g[1], F.G0); }
    } else if (fw === 1) R.forEach(function (p, j) { if (j % 3 === 0) put(b, ox + p[0], oy + p[1], F.J4); else if (j % 3 === 1) put(b, ox + p[0], oy + p[1], F.O1); });
    for (i = 0; i < 8; i++) { h = ih(i, seed, 5600); a = fw + 1 - (h % 3); if (a >= 1 && a <= 4) { var p2 = R[(idiv(i * n, 8) + (h >>> 4) % 5) % n]; drawBub(b, BUB[a], ox + p2[0], oy + p2[1]); } }
    if (fw < 2) for (i = 0; i < 7; i++) { var pk = kit.lit[idiv((2 * i + 1) * kit.lit.length, 14)]; put(b, ox + pk[0], oy + pk[1], F[fw ? 'J6' : 'G0']); }
    if (fw >= 2 && fw <= 7) { spat(b, kit, ox, oy, R[(n * 3 / 8) | 0], fw - 2, 0x2a2a2a); spat(b, kit, ox, oy, R[(n * 7 / 8) | 0], fw - 2, 0x5a5a5a); }
  }
  /* band change (fbc = frames since it, 0..5): a pop all round the oil on the same frame as the new sizzle loop: the ring
     flares gold, 10 / 12 swollen bubbles burst in four waves (fbc 0, 1, 2, 3), each with a white speck and drops, and
     oil flicks (the steam puff of the beat is in fxBandPuff). */
  function fxBandBeat(b, kit, ox, oy, fbc, band, seed) {
    var R = kit.ring, n = R.length, nb = band === 1 ? 10 : 12, i, h, a;
    if (fbc > 5) return;
    if (fbc === 0) {   /* the oil flares round the ring with the new sizzle: gold dashes, the far ring too */
      R.forEach(function (p, j) { if ((j >> 1) % 3 !== 2) put(b, ox + p[0], oy + p[1], F[(p[0] - kit.cx) / kit.rx + (p[1] - kit.cy) / kit.ry < -0.2 ? 'J6' : (j & 1) ? 'J4' : 'J5']); });
      kit.ring2.forEach(function (p, j) { if ((j >> 1) % 3 === 0) put(b, ox + p[0], oy + p[1], F.O1); });
    } else if (fbc === 1) R.forEach(function (p, j) { if (j % 4 === 0) put(b, ox + p[0], oy + p[1], F.J4); });
    for (i = 0; i < nb; i++) {
      h = ih(i, seed + band, 5200);
      var big = band === 2 && (i & 1) === 1, seq = big ? BIG : BUB, at0 = i % 4;   /* pop frame */
      a = fbc - at0 + (big ? 4 : 3); if (a < 2 || a >= seq.length) continue;
      var p = R[(idiv(i * n, nb) + (h >>> 4) % 7) % n];
      drawBub(b, seq[a], ox + p[0], oy + p[1]);
    }
    for (i = 0; i < (band === 1 ? 3 : 5); i++) { h = ih(i, seed + band, 5300); a = fbc - (h % 2); if (a >= 0 && a <= 5) spat(b, kit, ox, oy, R[(h >>> 4) % n], a, h); }
  }
  /* flip landing (fl = frames since the landing frame), front-loaded: on the landing frame itself the oil ring floods
     gold and 70 / 80 / 80 hot drops are already flying out (half of them 2 px), each with a 1-frame streak; they
     reach 6..14 px past the rim over frames 1..3 and fall away. The oil pushed out from under it runs outward as a
     dashed ring, and a boil runs round the ring meanwhile. */
  var DROPH = ['G0', 'G0', 'J6', 'J5'], DROPT = ['J6', 'J5', 'J4', 'O1'];
  function fxBurst(b, kit, ox, oy, fl, band, seed) {
    var R = kit.ring, n = R.length, i, h;
    if (fl === 0) {
      R.forEach(function (p, j) { if ((j >> 1) % 4 !== 3) put(b, ox + p[0], oy + p[1], F[(p[0] - kit.cx) / kit.rx + (p[1] - kit.cy) / kit.ry < -0.2 ? 'J5' : (j & 1) ? 'O1' : 'J4']); });
      kit.ring2.forEach(function (p, j) { if (j % 3 !== 2) put(b, ox + p[0], oy + p[1], F[(j >> 1) % 3 ? 'O1' : 'J4']); });
    } else if (fl === 1) { R.forEach(function (p, j) { if (j % 2 === 0) put(b, ox + p[0], oy + p[1], F[j % 6 ? 'J4' : 'J5']); }); kit.ring2.forEach(function (p, j) { if (j % 4 === 0) put(b, ox + p[0], oy + p[1], F.O1); }); }
    if (fl > 4) return;
    if (fl <= 3) {   /* the oil pushed out from under the jeon: a dashed ring that runs outward and thins (fl 0..3) */
      var d = 3 + 2 * fl, ex = kit.rx + d, ey = kit.ry + ((d * 2) / 3 | 0) + 1, RC = [['G0', 'J5'], ['J5', 'J4'], ['J4', 'O1'], ['O1', 'O1']][fl];
      for (var dg = 0; dg < 360; dg += 2) {
        var k3 = (dg >> 1) % (fl < 2 ? 3 : 4); if (k3 === 2 || (fl === 3 && k3 !== 0)) continue;
        var wx = ox + kit.cx + iround(ex * icos(dg), 4096), wy = oy + kit.cy + iround(ey * isin(dg), 4096);
        put(b, wx, wy, F[RC[(dg > 180 && dg < 270) ? 0 : 1]]);
        if (fl < 2 && k3 === 1) put(b, ox + kit.cx + iround((ex - 2) * icos(dg + 1), 4096), oy + kit.cy + iround((ey - 1) * isin(dg + 1), 4096), F[RC[1]]);   /* a thicker wave front at first */
      }
    }
    var m = [70, 80, 80][band], rx = Math.max(1, kit.rx);
    for (i = 0; i < m; i++) {
      h = ih(i, seed, 5000);
      var a = fl; if (a > 3) continue;
      var p = R[(idiv(i * n, m) + ((h >>> 20) % 9)) % n], X0 = p[0] - kit.cx, Y0 = p[1] - kit.cy;
      var s10 = 18 + (h % 19), up = 1, t = a + 1;   /* outward 1.8..3.6 px per frame, with a 1-px hop up */
      var xs = function (tt) { return ox + p[0] + iround(s10 * X0 * tt, 10 * rx); };
      var ys = function (tt) { return oy + p[1] + iround(s10 * Y0 * tt * 4, 50 * Math.max(1, kit.ry)) - up * tt + ((tt * (tt - 1)) >> 1); };
      var x = xs(t), y = ys(t);
      line(b, xs(t - 1), ys(t - 1), x, y, F[DROPT[a]]);   /* the streak: where it was one frame ago */
      put(b, x, y, F[DROPH[a]]);
      if ((h >>> 12) & 1) put(b, x + (X0 > 0 ? 1 : -1), y, F[DROPH[a]]);   /* a fat drop (half of them) */
    }
    for (i = 0; i < 12; i++) { h = ih(i, seed, 5100); var a2 = fl + 2 + h % 3; if (a2 >= 2 && a2 <= 4) { var q = R[(idiv(i * n, 12) + (h >>> 4) % 5) % n]; drawBub(b, BUB[a2], ox + q[0], oy + q[1]); } }
  }

  /* ---- steam: curls and puffs are marked into one mask, then each marked pixel steps lighter (STEP1 / STEP2 tables),
     once, so overlapping puffs merge into one cloud. Mask values: 1 ribbon body, 2 soft rim of a puff, 3 curl core line,
     4 puff body, 5 fading fringe ---- */
  var MASK = new Uint8Array(W * H);
  var PRI = [0, 3, 2, 5, 4, 1];          /* core > puff body > ribbon > soft rim > fading fringe */
  function mdisc(x, y, r, v) {            /* round pixel disc: dx^2 + dy^2 <= r^2 + r / 2; clipped inside the 2-px frame */
    for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
      if (2 * (dx * dx + dy * dy) > 2 * r * r + r) continue;
      var px = x + dx, py = y + dy; if (px < 2 || py < 2 || px > W - 3 || py > H - 3) continue;
      var i = py * W + px; if (PRI[v] > PRI[MASK[i]]) MASK[i] = v;
    }
  }
  /* a soft disc: body r - 1 with a 1-px soft rim; fading (late > 0): it shrinks and its rim turns into a checker fringe */
  var STEAM_TOP = 26;                    /* puffs fade out as they rise past this row (before the wall strip at the top) */
  function blob(x, y, r, late) {
    var over = STEAM_TOP - (y - r);
    if (over > 0) { var hl = (over + 1) >> 1; r -= hl; late = Math.max(late, hl); }
    if (r < 1) { if (r === 0) mdisc(x, y, 0, 5); return; }
    if (r === 1) { var v1 = late > 0 ? 2 : 4; mdisc(x, y, 0, v1); mdisc(x + 1, y, 0, v1); mdisc(x, y - 1, 0, v1); mdisc(x + 1, y - 1, 0, v1); return; }   /* a 2x2 wisp, never a plus */
    if (r === 2) { mdisc(x, y, 2, late > 0 ? 2 : 4); return; }   /* small: one flat tone (a two-tone 5-px disc reads as a sparkle) */
    if (late > 0) { mdisc(x, y, r, 5); mdisc(x, y, r - 1, 4); }
    else { mdisc(x, y, r, 2); mdisc(x, y, r - 1, 4); }
  }
  var SW12 = [0, 2, 3, 4, 3, 2, 0, -2, -3, -4, -3, -2];   /* sine x 4 over 12 steps */
  function riseOf(a, sp) { return sp ? a >> 1 : a; }
  /* a puff (ref3): a round flat disc that rises, sways a little, grows to rmax over most of its life, then fades and
     shrinks away. (x0, y0) birth point (the disc's bottom), h per-puff hash. */
  function puff(x0, y0, a, L, h, rmax, sp) {
    var s = riseOf(a, sp), dir = (h >>> 20) & 1 ? 1 : -1, sw = SW12[(a + ((h >>> 21) % 12)) % 12];
    var grow = Math.max(1, (L * 5) >> 3), r = Math.min(rmax, 1 + (((a * (rmax - 1)) / grow) | 0)), late = a - ((L * 13) >> 4);
    if (late > 0) r -= (late + 1) >> 1;
    blob(x0 + dir * ((a / 7) | 0) + (sw >> 2), y0 - s - Math.max(r, 0), r, late);
  }
  /* a curl: an S-ribbon (a core line on a body that thickens upward) whose x follows a travelling wave, capped by a puff.
     After 5/8 of its life the ribbon is eaten from below and the head puff breaks away, keeps rising and fades on its
     own: that is what carries the steam up out of the pan and over the wall. */
  function wisp(x0, y0, a, L, h, rmax, sp) {
    var sh = riseOf(a, sp), dir = (h >>> 20) & 1 ? 1 : -1, ph = (h >>> 21) % 12, amp0 = 3 + ((h >>> 25) & 1);
    var letGo = (L * 5) >> 3, gone = a > letGo ? ((a - letGo) * 3) >> sp : 0, RL = Math.min(sh, 8 + 3 * rmax) - gone;
    var xs = function (q) { var amp = Math.min(amp0, 1 + (q >> 2)); return x0 + dir * (q >> 3) + ((SW12[(sh - q + ph) % 12] * amp) >> 2); };
    var rr = function (q) { return q < 3 ? 0 : q < 9 ? 1 : Math.min(2, rmax - 2); };
    for (var q = Math.max(0, sh - RL); q <= sh && RL > 0; q++) {
      if (y0 - q < STEAM_TOP) break;
      var xc = xs(q); mdisc(xc, y0 - q, rr(q), 1);
      if (q >= 2) { var xp = xs(q - 1), st = xp < xc ? 1 : -1; for (var xq = xp; xq !== xc; xq += st) mdisc(xq + st, y0 - q, 0, 3); mdisc(xc, y0 - q, 0, 3); }
    }
    var fadeAt = (L * 7) >> 3, late = a > fadeAt ? (a - fadeAt) >> sp : 0, rp = Math.min(rmax, 2 + ((sh / 5) | 0)) - late;
    blob(xs(sh), y0 - sh - Math.max(rp, 0) + 1, rp, late);
  }
  /* lanes across the far half of the food (1/100 of rx): one per emitter, wide apart, so curls never knit together */
  var LANES = [null, [-14], [-46, 30], [-58, -6, 46], [-66, -26, 14, 56]];   /* degrees along the far rim (0 = the far point) */
  /* steady steam: N emitters in fixed lanes, phases staggered (never a row of same-age puffs); each cycle is a curl or a
     puff, alternating per emitter. o = { n, rmax, ps, sp, first, salt, life (x16), curlOnly, onFood }; emitters that
     joined on the last band change wait for it. onFood adds one more curl that starts on the food's own surface (left
     of the centre), so the steam visibly rises off the jeon, not only from its far rim. */
  function fxSteam(fh, fbc, band, seed, cx, cy, rx, ry, o) {
    o = o || {};
    var N = o.foodOnly ? 0 : o.n || NW[band], rmax = o.rmax || RMAX[band], PS = o.ps || PWB[band], sp = o.sp | 0, salt = o.salt || 4000, life = o.life || 24;
    for (var i = 0; i < N + (o.onFood ? 1 : 0); i++) {
      var fd = i === N, h0 = ih(fd ? 7 : i, seed, salt), P = fd ? 48 : PS[h0 % PS.length], L = (P * life) >> 4, nc = LOOP / P;
      var first = (o.first == null ? 6 : o.first) + (fd ? 11 : idiv(i * P, N)) + ((h0 >>> 8) % 4), gate = -1e9;
      if (!fd && !o.n && band > 0 && i >= NW[band - 1] && fbc < 1e5) {   /* joined on the band change: its first cycle starts with it */
        var bc = fh - fbc; gate = bc; first = bc + 2 + (i - NW[band - 1]) * 7;
      }
      if (fd) L = P;   /* band 0 (foodOnly): its one curl rises off the food itself */
      if (fh < first) continue;
      var a0 = (fh - first) % P, c0 = idiv(fh - first, P);
      for (var k = 0; k < 3; k++) {
        var a = a0 + k * P, cyc = c0 - k; if (a >= L || cyc < 0 || fh - a < gate) continue;
        var cm = ((cyc % nc) + nc) % nc, h = ih((fd ? 7 : i) * 131 + cm, seed, salt + 1);
        if (fd) { wisp(cx - tz(rx * 0.22) + ((h >>> 2) % 7) - 3, cy - tz(ry * 0.2) - ((h >>> 10) % 3), a, L, h, Math.max(3, rmax - 1), sp); continue; }
        var ang = LANES[Math.min(4, N)][Math.min(i, 3)] + ((h >>> 2) % 9) - 4;   /* born on the far rim, right over the hot pan */
        var x0 = cx + tz(rx * isin(ang) / 4096), y0 = cy - tz((ry + 1) * icos(ang) / 4096) - ((h >>> 10) % 3);
        if (o.curlOnly || ((cm + i) & 1) === 0) wisp(x0, y0, a, L, h, rmax, sp); else puff(x0, y0 - 1, a, L, h, rmax + 1, sp);
      }
    }
  }
  /* band change: one extra puff of steam rises from the far rim with the pop (fbc 0..19) */
  function fxBandPuff(fbc, band, seed, cx, cy, rx, ry) {
    if (band < 1 || fbc < 0 || fbc >= 20) return;
    var h = ih(band, seed, 5250), ang = band === 1 ? -30 : 24;
    puff(cx + tz(rx * isin(ang) / 4096), cy - tz((ry + 1) * icos(ang) / 4096) + 2, fbc + 5, 25, h, band === 2 ? 7 : 6, 0);
  }
  /* flip landing steam: on the landing frame 3-4 big round discs (r 6..9) already stand over the far rim; they rise fast,
     then slowly, sway apart and thin away over ~12 frames. Behind them the slow swell: separate round puffs launched
     from the far half of the rim, fanning out with gaps between them (never one fog bank), plus two curls that carry the
     rest upward. */
  var BIGD = [[-60, 0], [-22, 7], [20, 0], [62, 5]], BIGR = [[7, 6, 8], [8, 7, 9, 8], [9, 7, 9, 8]];   /* [lane deg, extra rise]; r per band: all stand there on the landing frame */
  /* rcap (optional): the largest disc radius (the light board: 5, so the carried-over bloom stays a haze, never big balls) */
  function fxBloom(fl, band, seed, cx, cy, rx, ry, rcap) {
    var n = band === 2 ? 6 : 5, rm = band === 2 ? 8 : 7, cap = rcap || 99, i, h;
    for (i = 0; i < (band ? 4 : 3); i++) {
      h = ih(i, seed, 5450);
      var D = BIGD[i], ab = fl; if (ab >= 14) continue;
      var ang2 = D[0] + (h % 9) - 4, r0 = BIGR[band][i], dir2 = ang2 < 0 ? -1 : 1;
      var bx = cx + tz(rx * isin(ang2) / 4096) + dir2 * (ab >> 1), by = cy - tz((ry + 1) * icos(ang2) / 4096);
      var rise = (ab < 4 ? 2 * ab + 2 : 8 + (ab - 4)) + D[1], rr = Math.min(cap, r0 - (ab >= 6 ? (ab - 5) >> 1 : 0)), late2 = ab - 8;
      blob(bx, by - rise - rr + 2, rr, late2);
    }
    for (i = 0; i < n; i++) {
      h = ih(i, seed, 5400);
      var a = fl - 1 - (h % 4), L = 18 + ((h >>> 4) % 7); if (a < 0 || a >= L) continue;
      var ang = -78 + idiv((2 * i + 1) * 156, 2 * n) + ((h >>> 8) % 9) - 4;   /* spread along the far half of the rim */
      var x0 = cx + tz(rx * isin(ang) / 4096), y0 = cy - tz(ry * icos(ang) / 4096) - 1 - ((h >>> 12) % 7), dir = ang < 0 ? -1 : 1;
      var v = 2 + ((h >>> 14) & 1), up = a < 4 ? v * a : 4 * v + (a - 4), r = Math.min(cap, i & 1 ? rm - 3 : rm - ((h >>> 16) % 2), 2 + ((a * 2) / 3 | 0)), late = a - (L - 7);
      if (late > 0) r -= (late + 1) >> 1;
      blob(x0 + dir * ((a * 2) / 3 | 0), y0 - up - Math.max(r, 0), r, late);
    }
    for (i = 0; i < 2; i++) { h = ih(i, seed, 5500); var aw = fl - 1 - i * 3; if (aw >= 0 && aw < 40) wisp(cx + (i ? 1 : -1) * tz(rx * 0.35), cy - tz(ry * 0.6), aw, 40, h, Math.min(4, cap), 0); }
  }
  /* reduced motion: three static puffs in ref3's rising diagonal (biggest lowest) and one frozen curl */
  function stillSteam(band, cx, cy, rx, ry) {
    var rm = RMAX[band] + 1;
    blob(cx - tz(rx * 0.34), cy - tz(ry * 1.30), Math.max(2, rm - 1), 0);
    blob(cx - tz(rx * 0.12), cy - tz(ry * 1.95), Math.max(2, rm - 2), 0);
    blob(cx + tz(rx * 0.08), cy - tz(ry * 2.45), Math.max(1, rm - 3), 0);
    wisp(cx + tz(rx * 0.36), cy - tz(ry * 0.6), 20, 48, 0x5a5a5a5, RMAX[band], 0);
  }
  /* STEP1 = one step lighter within the same ramp (a translucent veil without alpha); STEP2 = the denser body of steam:
     two steps on the slate, the steam veil V0 on the warm wood. Food stays food (FOOD to FOOD). Unlisted colours stay.
     CLS: 0 dark, 1 mid, 2 light (by luma). */
  var STEP1 = {}, STEP2 = {}, CLS = {}, FOODK = {};
  (function () {
    var P = [[C.ink, C.s0], [C.coal, C.s0], [C.soot, C.s0], [C.s0, C.s1], [C.s1, C.s2], [C.s2, C.s3], [C.s3, C.s4], [C.s4, C.s5], [C.s5, C.s6], [C.s6, F.G0],
      [C.w0, C.w1], [C.w1, C.w2], [C.w2, C.w3], [C.w3, C.w4], [C.w4, C.w5], [C.w5, C.w6], [C.w6, C.s6], [F.V0, C.s6],
      [C.r0, C.w2], [C.r1, C.w3], [C.a1, C.a2], [C.a2, C.a3], [C.a3, F.J6], ['#a53030', '#cf573c'], ['#cf573c', '#da863e'], ['#da863e', C.a3], ['#752438', '#a53030'],
      [C.g0, C.g1], [C.g1, C.g2], [C.g2, C.g3], [C.g3, C.g4], [C.g4, '#d0da91'],
      [C.b1, C.b2], [C.b2, C.b3], [C.b3, C.b4], [C.b4, C.s6], [C.p1, C.p2], [C.p2, C.p3], [C.p3, C.p4], [C.p4, C.s6],
      [F.J0, F.J1], [F.J1, F.J2], [F.J2, F.J3], [F.J3, F.J4], [F.J4, F.J5], [F.J5, F.J6], [F.J6, F.G0], [F.B1, F.J6], [F.B2, F.B1],
      [F.O0, C.s2], [F.O1, F.J4], [F.P0, F.P1], [F.P1, F.P2], [F.P2, F.P3], [F.P3, F.J6], [F.T0, F.T1], [F.T1, F.P0],
      [F.C0, F.C1], [F.C1, F.C2], [F.C2, F.J5], [F.S0, F.J0], [F.S2, F.C2], [F.G0, F.G0]];
    var n = function (hx) { return parseInt(hx.slice(1), 16); };
    P.forEach(function (p) { var k = n(p[0]), r = k >> 16, g = (k >> 8) & 255, bl = k & 255, lu = r * 299 + g * 587 + bl * 114; STEP1[k] = n(p[1]); CLS[k] = lu >= 192000 ? 2 : lu >= 110000 ? 1 : 0; });
    Object.keys(STEP1).forEach(function (k) { var a = STEP1[k]; STEP2[k] = STEP1[a] !== undefined ? STEP1[a] : a; });
    [[C.w2, C.w4], [C.w3, C.w5], [C.w4, F.V0], [C.w5, F.V0]].forEach(function (p) { STEP2[n(p[0])] = n(p[1]); });
    FOOD.forEach(function (hx) { FOODK[n(hx)] = 1; });
    CLS[n(F.V0)] = 1;
  })();
  var LUT = STEP1;
  /* apply the steam mask. food(x, y) -> 0 not food, 1 cooked food, 2 raw batter. Per surface:
     dark and mid ground (pan, oil, pan rim, wood, wall): the body two steps lighter (V0 on the wood), the soft rim and the
     ribbon one step, the curl core like the body; a fading fringe is a checker on dark ground only;
     light ground (plate, paper): only a thin white curl, never a ball;
     with lightDisc (the light board): a veil, never solid white balls or white zigzags: the curl core one step lighter
     (the board's w6 -> s6, its grain w5 -> w6, never the hard white G0), the ribbon and the puff bodies a 50 % checker of
     that step, rims and fringes nothing, so the board shows the pan's soft curls and discs as a see-through haze;
     food (cooked or raw): only the curl's core line, one step lighter in the food's own ramp (never a dull veil). */
  function steamPass(b, food, lightDisc) {
    for (var i = 0; i < W * H; i++) {
      var v = MASK[i]; if (!v) continue; MASK[i] = 0;
      var x = i % W, y = (i / W) | 0, o = i << 2; if (!b.d[o + 3]) continue;
      var fk = food ? food(x, y) : 0;
      var key = (b.d[o] << 16) | (b.d[o + 1] << 8) | b.d[o + 2], tone = CLS[key] | 0, to = STEP1[key];
      if (to === undefined) continue;
      if (fk || (FOODK[key] && key !== 0x5a3610 && key !== 0xc47d1c)) { if (v !== 3) continue; }   /* over food: the curl only */
      else if (tone === 2 && lightDisc) { if (v === 2 || v === 5 || (v !== 3 && ((x + y) & 1))) continue; }   /* the board: a checker veil, one step */
      else if (tone === 2) { if (v === 3) to = 0xfffef2; else continue; }   /* light ground: a white curl only */
      else if (v === 5) { if (tone === 1 || ((x + y) & 1)) continue; }                              /* fading fringe: dark only */
      else if (v === 4 || v === 3) to = STEP2[key];
      b.d[o] = to >> 16; b.d[o + 1] = (to >> 8) & 255; b.d[o + 2] = to & 255;
    }
  }
  function clearSteam() { MASK.fill(0); }
  /* twinkle on a glint, hard cuts: a = 0 plus, 1-2 star (arm px), 3 plus */
  function twinkle(b, a, x, y, arm) {
    if (a < 0 || a > 3) return;
    put(b, x, y, F.G0);
    if (a === 0 || a === 3) { put(b, x - 1, y, F.J6); put(b, x + 1, y, F.J6); put(b, x, y - 1, F.J6); put(b, x, y + 1, F.J6); return; }
    for (var k = 1; k <= arm; k++) { var c = F[k < arm ? 'G0' : 'J6']; put(b, x + k, y, c); put(b, x - k, y, c); put(b, x, y + k, c); put(b, x, y - k, c); }
  }
  /* a white flare on the food (reveal only, rare): grows and shrinks over 5 frames, no outline, nothing off the food */
  var FLARE = [
    ['..c..', '..G..', 'cGGGc', '..G..', '..c..'],
    ['...c...', '...G...', '..cGc..', 'cGGGGGc', '..cGc..', '...G...', '...c...']];
  var FLARE_SEQ = [0, 1, 1, 0];
  function sparkle(b, x, y, a) {
    if (a < 0 || a >= FLARE_SEQ.length) return;
    var s = FLARE[FLARE_SEQ[a]]; sprite(b, s, { c: F.J6, G: F.G0 }, x - (s[0].length >> 1), y - (s.length >> 1));
  }
  /* =====================================================================================
   *  MARKS, BUBBLES, TOOLS, GUIDE
   * ===================================================================================== */
  var ARC = [[0, -4096], [3547, 2048], [-3547, 2048]];   /* arc centres at 12, 4 and 8 o'clock (unit x 4096) */
  /* list = [[x, y, left]] left = hits still wanted (3..1, 0 = finished -> not drawn). Three arcs, one per hit, always
     drawn as one ring: the arcs still wanted are amber, the ones already hit sink into the batter (raw-batter tone), so a
     mark never turns into a horseshoe or a hook. A hit takes the arc at 12 first, then 4, then 8. f = frame counter
     (the centre blinks slowly, 0 = still). */
  function marks(b, list, f) {
    (list || []).forEach(function (m) {
      var x = m[0] | 0, y = m[1] | 0, left = clampI(m[2], 0, 3); if (!left) return;
      var r = 5, ring = mk(x - r - 2, y - r - 2, 2 * r + 5, 2 * r + 5);
      for (var dy = -r - 1; dy <= r + 1; dy++) for (var dx = -r - 1; dx <= r + 1; dx++) {
        var q = 4 * (dx * dx + dy * dy); if (q < (2 * r - 1) * (2 * r - 1) || q >= (2 * r + 1) * (2 * r + 1)) continue;
        var arc = -1, best = -1e9;
        for (var a2 = 0; a2 < 3; a2++) { var dot = dx * ARC[a2][0] + dy * ARC[a2][1]; if (dot > best) { best = dot; arc = a2; } }
        if (best > 0 && best * best >= 2400 * 2400 * (dx * dx + dy * dy)) mset(ring, x + dx, y + dy, arc >= 3 - left ? 1 : 2);
      }
      var lit = mk(ring.x0, ring.y0, ring.w, ring.h);   /* outline only the arcs still wanted */
      mEach(ring, function (px, py, v) { if (v === 1) mset(lit, px, py, 1); });
      mEach(ring, function (px, py, v) { if (v === 2) put(b, px, py, C.w5); });
      mOutline(b, lit, C.r1);
      mEach(lit, function (px, py) { put(b, px, py, (px - x) + (py - y) < -3 ? C.a3 : C.a2); });
      var blink = ((f | 0) >> 3) & 1;
      put(b, x - 1, y, C.r1); put(b, x + 1, y, C.r1); put(b, x, y - 1, C.r1); put(b, x, y + 1, C.r1);
      put(b, x, y, blink ? C.s6 : C.a3);
    });
  }
  /* oil bubbles while the heat is on. list = [[x, y, phase]]; 4-frame cycle at 12 fps; still = reduced motion */
  function bubbles(b, list, f, still) {
    (list || []).forEach(function (q) {
      var st = still ? 2 : (((f | 0) >> 1) + (q[2] | 0)) & 3, x = q[0] | 0, y = q[1] | 0;
      if (st === 0) { put(b, x, y, C.s3); }
      else if (st === 1) { put(b, x, y, C.s6); put(b, x + 1, y, C.s4); put(b, x, y + 1, C.s4); put(b, x + 1, y + 1, C.s3); }
      else if (st === 2) {
        [[0, -1], [1, -1], [-1, 0], [2, 0], [-1, 1], [2, 1], [0, 2], [1, 2]].forEach(function (p, i) { put(b, x + p[0], y + p[1], i < 3 ? C.s5 : C.s4); });
        put(b, x, y, C.s6);
      } else { [[-1, -1], [2, -1], [-1, 2], [2, 2]].forEach(function (p) { put(b, x + p[0], y + p[1], C.s3); }); }
    });
  }
  /* spatula (turner): slotted blade with its centre at (x, y), handle down-right */
  var SPATULA = [
    '.oooooooooooooo.',
    'oWWWWWWWWWWWWWYo',
    'oWYYYYYYYYYYYYXo',
    'oWYVYYVYYVYYVYXo',
    'oWYVYYVYYVYYVYXo',
    'oWYVYYVYYVYYVYXo',
    'oYYYYYYYYYYYYYXo',
    '.oXXXXXXXXXXXXo.',
    '..ooooooXXoooo..'];
  function spatula(b, x, y) {
    x |= 0; y |= 0;
    var sp = remember('spatula', function () {
      var R = 40, spr = blank(2 * R + 1, 2 * R + 1), sh = [];
      stick(spr, R + 3, R + 8, 40, 30, 2, function (u, v) { return v < -2 || v > 1 || u < 3 ? null : '#000'; }, null, function (px, py) { sh.push([px - R + 2, py - R + 3]); });
      stick(spr, R + 2, R + 5, 40, 30, 2, function (u, v) {
        if (u < 9) return v < -1 || v > 0 ? null : v === -1 ? C.s3 : C.s2;
        if (v < -2 || v > 1) return null;
        if (u > 28 && (v === -2 || v === 1)) return null;
        return v === -2 ? C.w4 : v === 1 ? C.w1 : v === -1 ? C.w3 : C.w2;
      }, C.ink);
      sprite(spr, SPATULA, { o: C.ink, W: C.s6, Y: C.s5, X: C.s4, V: C.s1 }, R - 8, R - 4);
      return { spr: spr, sh: sh, R: R };
    });
    sp.sh.forEach(function (q) { shadeAt(b, x + q[0], y + q[1]); });
    blit(b, sp.spr, x - sp.R, y - sp.R);
  }
  /* pixel up-arrow, 2-frame bob (f 0 | 1) */
  var ARROW = [
    '....o....',
    '...oFo...',
    '..oFEDo..',
    '.oFEEEDo.',
    'oFEEEEEDo',
    'oooFEDooo',
    '..oFEDo..',
    '..oFEDo..',
    '..oFEDo..',
    '..ooooo..'];
  function arrow(b, x, y, f) { sprite(b, ARROW, { o: C.r1, F: C.a3, E: C.a2, D: C.a1 }, (x | 0) - 4, (y | 0) - ((f | 0) & 1)); }
  /* amber dotted guide line: len px centred on (x, y) at deg. 2-px dashes every 5 px with a dark drop shadow, so the line
     reads on the paper board and on every face color. cells (optional, 0|1 per cell along the line) = parts already cut
     by the knife: no dash there, the kerf shows instead. f = frame counter (slow shimmer on one dash in two; 0 = still). */
  function guide(b, x, y, deg, len, f, cells) {
    var L = len || 64, h = L >> 1, c = icos(deg), s2 = isin(deg), D = mk(x - h - 3, y - h - 3, L + 7, L + 7), lit = ((f | 0) >> 3) & 1, n = cells ? cells.length : 0;
    for (var u = -h; u <= h; u++) {
      var t = (u + h) % 5; if (!(t < 2 || u === -h || u === h)) continue;
      if (n && cells[Math.min(n - 1, idiv((u + h) * n, L + 1))]) continue;
      mset(D, x + iround(u * c, 4096), y + iround(u * s2, 4096), t === 0 ? 2 : 1);
    }
    mEach(D, function (px, py) { [[1, 0], [0, 1], [1, 1]].forEach(function (q) { if (!mhas(D, px + q[0], py + q[1])) put(b, px + q[0], py + q[1], C.w1); }); });
    mEach(D, function (px, py, v) { put(b, px, py, v === 2 && lit ? C.a3 : C.a2); });
  }
  /* kitchen knife along deg; (x, y) = point of the edge under the finger. The handle always points right / down. */
  function knife(b, x, y, deg) {
    deg = Math.round(+deg || 0) % 180; if (deg < 0) deg += 180;
    if (deg > 100) deg -= 180;                       /* keep the handle on the right / lower side */
    var c = icos(deg), s2 = isin(deg), tipx = (x | 0) - iround(12 * c, 4096), tipy = (y | 0) - iround(12 * s2, 4096), R = 42;
    var spr = remember('knife|' + deg, function () {
      var k = blank(2 * R + 1, 2 * R + 1);
      stick(k, R, R, deg, 36, 3, function (u, v) {
        if (u <= 22) {
          var top = u < 3 ? 0 : -1, bot = u < 2 ? 0 : u < 5 ? 1 : 2;
          if (v < top || v > bot) return null;
          if (v === bot && u > 1) return C.s6;
          return v === top ? C.s3 : C.s5;
        }
        if (u <= 24) return v < -1 || v > 2 ? null : C.s2;
        if (v < -1 || v > 1) return null;
        if ((u === 28 || u === 33) && v === 0) return C.s5;
        return v === -1 ? C.w2 : C.w1;
      }, C.ink);
      return k;
    });
    blit(b, spr, tipx - R, tipy - R);
  }

  /* =====================================================================================
   *  BOARD, PLATE, DISH
   * ===================================================================================== */
  function board(b, x, y, w, h, small, handle) {
    var r = small ? 3 : 5, th = small ? 2 : 4;
    var inBoard = function (px, py, yy) {   /* rounded rect */
      var lx = px - x, ly = py - yy;
      if (lx < 0 || ly < 0 || lx >= w || ly >= h) return false;
      var cx2 = lx < r ? r - lx : lx >= w - r ? lx - (w - r - 1) : 0, cy2 = ly < r ? r - ly : ly >= h - r ? ly - (h - r - 1) : 0;
      return cx2 * cx2 + cy2 * cy2 <= r * r + 1;
    };
    var M = mk(x - 2, y - 2, w + 4, h + th + 4);
    for (var py = y; py < y + h + th; py++) for (var px = x; px < x + w; px++) {
      for (var k = 0; k <= th; k++) if (inBoard(px, py, y + k)) { mset(M, px, py, 1); break; }
    }
    var hy0 = y + (h >> 1) - 5, hole = [];
    if (handle) for (py = hy0; py < hy0 + 10 + th; py++) for (px = x - 7; px < x; px++) {
      var ly2 = py - hy0, lx2 = px - (x - 7);
      if ((lx2 === 0 && (ly2 === 0 || ly2 >= 9 + th)) ) continue;
      if (lx2 >= 2 && lx2 <= 3 && ly2 >= 4 && ly2 <= 5) { hole.push([px, py]); continue; }
      mset(M, px, py, 1);
    }
    var topOf = function (px2, py2) { return inBoard(px2, py2, y) || (handle && px2 >= x - 7 && px2 < x && py2 >= hy0 && py2 < hy0 + 10 && !(px2 === x - 7 && (py2 === hy0 || py2 === hy0 + 9))); };
    /* shadow */
    for (py = y + 3; py < y + h + th + 4; py++) for (px = x + 3; px < x + w + 4; px++) if (!mhas(M, px, py) && (mhas(M, px - 3, py - 3) || mhas(M, px - 2, py - 4))) shadeAt(b, px, py);
    mOutline(b, M, C.w2);
    mEach(M, function (px, py) {
      var top = topOf(px, py), col;
      if (!top) { col = mhas(M, px, py + 1) ? (px < x + (w >> 2) ? C.w4 : C.w3) : C.w2; put(b, px, py, col); return; }
      var lx = px - x, ly = py - y;
      col = C.w6;
      if (!topOf(px - 1, py - 1)) col = C.s6;
      else if (!topOf(px + 1, py + 1)) col = C.w5;
      else {
        var gr = ih(ly >> 1, (lx + (ly * 7)) >> 4, 99);
        if ((ly % 5) === 2 && (gr & 3) === 0) col = C.w5;                      /* grain */
        if (!small && (lx === 5 || lx === w - 6 || ly === 5 || ly === h - 6) && lx >= 5 && lx <= w - 6 && ly >= 5 && ly <= h - 6) col = C.w5;   /* juice groove */
        if (!small && ((lx === 6 && ly > 5 && ly < h - 6) || (ly === 6 && lx > 5 && lx < w - 6))) col = C.s6;
      }
      put(b, px, py, col);
    });
    hole.forEach(function (q) { put(b, q[0], q[1], q[1] === hy0 + 4 ? C.w2 : C.w3); });
    return M;
  }
  /* warm-tinted plates (all Apollo): [hi, rim, rimShade, well, wellWall, outline, side, sideDark, gap, glaze line] */
  var PLATE = [
    [C.s6, C.s6, C.w6, C.w6, C.w5, C.w3, C.w5, C.w4, C.w5, '#cf573c'],   /* 0 ivory (was paper): cream ceramic, red-orange glaze line */
    [C.s6, C.b4, C.b3, C.b4, C.b3, C.b1, C.b3, C.b2, C.b3, C.s6],        /* 1 sky, cream glaze line */
    [C.s6, C.p4, C.p3, C.p4, C.p3, C.p1, C.p3, C.p2, C.p3, C.s6]];       /* 2 rose (pink), cream glaze line */
  function onRing(dx, dy, a, c) { return inE(dx, dy, a, c) && !(inE(dx - 1, dy, a, c) && inE(dx + 1, dy, a, c) && inE(dx, dy - 1, a, c) && inE(dx, dy + 1, a, c)); }
  /* plate seen from slightly above. o = { cx, cy, rx, ry, th, rim, noShadow, deco (false = no glaze line) } */
  function plate(b, color, o) {
    o = o || {};
    var P = PLATE[clampI(color, 0, 2)], cx = o.cx == null ? GEO.dish.cx : o.cx, cy = o.cy == null ? GEO.dish.cy : o.cy;
    var rx = o.rx || 42, ry = o.ry || 26, th = o.th == null ? 3 : o.th, rim = o.rim || Math.max(3, rx >> 3);
    var M = mk(cx - rx - 2, cy - ry - 2, 2 * rx + 5, 2 * ry + th + 5), x, y;
    for (var k = 0; k <= th; k++) mEll(M, cx, cy + k, rx, ry, 1);
    if (!o.noShadow) {   /* cast shadow on the counter, down-right, one step darker so the wood grain stays */
      var sd = Math.max(2, th);
      for (y = -ry; y <= ry + th + sd + 1; y++) for (x = -rx; x <= rx + sd + 1; x++) { var px = cx + x, py = cy + y; if (!mhas(M, px, py) && inE(x - sd, y - th - sd + 1, rx, ry)) shadeAt(b, px, py); }
    }
    mOutline(b, M, P[5]);
    var wrx = rx - rim, wry = ry - Math.max(2, (rim * 2 / 3) | 0), grx = rx - (rim >> 1), gry = ry - Math.max(1, (rim / 3) | 0);
    mEach(M, function (px2, py2) {
      var dx = px2 - cx, dy = py2 - cy, col;
      if (!inE(dx, dy, rx, ry)) { put(b, px2, py2, mhas(M, px2, py2 + 1) ? (dx < -(rx >> 2) ? P[6] : P[7]) : P[5]); return; }
      if (!inE(dx, dy, wrx, wry)) {
        col = P[1];
        if (!inE(dx + 1, dy + 1, rx, ry)) col = P[2];                                         /* outer edge turning away */
        if (o.deco !== false && rim >= 4 && onRing(dx, dy, grx, gry) && dy > -gry + 1) col = P[9];   /* glaze line */
        if (!inE(dx - 1, dy - 1, rx, ry) && dy < 0) col = P[0];                               /* edge facing the lamp */
        if (inE(dx + 1, dy + 1, wrx, wry) && dy > 0) col = P[2];                              /* inner lip, near side */
        if (inE(dx - 1, dy - 1, wrx + 1, wry + 1) && !inE(dx - 1, dy - 1, wrx, wry) && dy < 0) col = P[4];   /* lip, far side */
        put(b, px2, py2, col); return;
      }
      col = P[3];                                                                             /* well: flat floor */
      if (!inE(dx - 2, dy - 2, wrx, wry) || !inE(dx - 1, dy - 1, wrx, wry)) col = P[4];       /* far inner wall in shade */
      put(b, px2, py2, col);
    });
    return M;
  }
  /* little glossy dip dish (cho-ganjang): red enamel side, cream rim, dark red soy that glows orange at its thin far edge,
     a big soft glint, sesame seeds, a chili bit and a scallion bit. Centre (cx, cy), rx ~12, ry ~7. Returns the glint px. */
  function soyDish(b, cx, cy, rx, ry, seed) {
    var th = 2, M = mk(cx - rx - 2, cy - ry - 2, 2 * rx + 5, 2 * ry + th + 5), x, y, k;
    for (k = 0; k <= th; k++) mEll(M, cx, cy + k, rx, ry, 1);
    for (y = -ry; y <= ry + th + 3; y++) for (x = -rx; x <= rx + 3; x++) { var px = cx + x, py = cy + y; if (!mhas(M, px, py) && inE(x - 2, y - th - 1, rx, ry)) shadeAt(b, px, py); }
    mOutline(b, M, '#752438');
    var srx = rx - 2, sry = ry - 2;
    mEach(M, function (px2, py2) {
      var dx = px2 - cx, dy = py2 - cy, col;
      if (!inE(dx, dy, rx, ry)) { put(b, px2, py2, mhas(M, px2, py2 + 1) ? (dx < -(rx >> 2) ? '#cf573c' : '#a53030') : '#752438'); return; }
      if (!inE(dx, dy, srx, sry)) {
        col = C.s6;
        if (!inE(dx + 1, dy + 1, rx, ry)) col = C.w6;
        if (dy < 0 && inE(dx, dy + 1, srx, sry)) col = C.w5;                                  /* inner wall above the sauce */
        put(b, px2, py2, col); return;
      }
      col = F.J0;
      if (!inE(dx, dy - 1, srx, sry)) col = dx < -(srx >> 1) ? F.J1 : F.S2;                   /* thin far edge glows */
      else if (!inE(dx, dy - 2, srx, sry) && dx > -(srx >> 2)) col = F.J1;
      else if (dy > 0 && dx > -(srx >> 1)) col = F.S0;                                        /* deep near side */
      put(b, px2, py2, col);
    });
    var sx = [-3, 1, 3, -1, 4], sy = [0, 1, -1, 2, 1];
    for (k = 0; k < 5; k++) { var qx = cx + sx[k] + ((ih(k, seed, 61) % 3) - 1), qy = cy + sy[k]; if (inE(qx - cx, qy - cy, srx - 1, sry - 1)) put(b, qx, qy, k === 4 ? F.J4 : F.J6); }
    put(b, cx + 2, cy - 1, F.C1); put(b, cx + 3, cy - 1, F.C0); put(b, cx - 1, cy + 1, F.P2);
    var gx = cx - (srx >> 1) - 1, gy = cy - (sry >> 1);   /* big soft glint, up-left */
    put(b, gx - 1, gy, F.J6); put(b, gx, gy - 1, F.J6); put(b, gx, gy, F.G0); put(b, gx + 1, gy, F.G0); put(b, gx + 2, gy, F.J6); put(b, gx, gy + 1, F.J6);
    put(b, gx + 4, gy + 1, F.G0);
    return [gx, gy];
  }
  /* garnish on the cooked face (painted into the face before it is cut, so a sliver on a cut splits with it):
     [u, v] in 1/100 of (rx, ry), kind 0 = red chili ring, 1 = green scallion sliver, 2 = scallion with its white part.
     paint(x, y, id) writes a FOOD id at buffer px; ok(x, y) clips. */
  var GARN = [[-46, -38, 0], [-18, -66, 1], [32, -44, 2], [60, -12, 0], [-64, 16, 1], [-30, 48, 0], [44, 36, 0], [12, 62, 1], [-6, -20, 2], [22, 14, 1]];
  var CHILI = ['.ab.', 'a.sc', '.cd.'], SCAL = [['ab.', '.bc'], ['.ab', 'bc.'], ['wa', '.b']];
  function garnish(cx, cy, rx, ry, n, ok, paint) {
    for (var i = 0; i < n && i < GARN.length; i++) {
      var g = GARN[i], x = cx + idiv(g[0] * rx, 100), y = cy + idiv(g[1] * ry, 100);
      if (rx < 16) { if (!ok || ok(x, y)) paint(x, y, g[2] === 0 ? 'C1' : 'P2'); continue; }   /* thumbnail: one pixel each */
      var HS = g[2] === 0 ? CHILI : g[2] === 2 ? SCAL[2] : SCAL[i % 2];
      var K2 = g[2] === 0 ? { a: 'C2', b: 'C1', c: 'C1', d: 'C0', s: 'J6' } : { a: 'P3', b: 'P2', c: 'P1', w: 'J6' };
      for (var yy = 0; yy < HS.length; yy++) for (var xx = 0; xx < HS[yy].length; xx++) {
        var ch = HS[yy].charAt(xx); if (ch === '.' || !K2[ch]) continue;
        if (!ok || ok(x + xx, y + yy)) paint(x + xx, y + yy, K2[ch]);
      }
    }
  }
  var DEFAULT_LOOK = { v: 1, dents: [], band: 1, cuts: [0, 0], offs: [0, 0], plate: 0 };
  function safeLook(look) {
    try {
      if (!look || typeof look !== 'object' || look.v !== 1) return DEFAULT_LOOK;
      var dents = Array.isArray(look.dents) ? look.dents.filter(function (d) { return Array.isArray(d) && d.length >= 2 && isFinite(d[0]) && isFinite(d[1]); }).slice(0, 9).map(function (d) { return [clampI(d[0], 0, 63), clampI(d[1], 0, 47)]; }) : [];
      var cuts = Array.isArray(look.cuts) ? look.cuts.slice(0, 2).map(function (c) { return isFinite(c) ? clampI(Math.round(c / 6) * 6, -30, 30) : 0; }) : [0, 0];
      var offs = Array.isArray(look.offs) ? look.offs.slice(0, 2).map(function (c) { return isFinite(c) ? clampI(c, -4, 4) : 0; }) : [0, 0];
      while (cuts.length < 2) cuts.push(0);
      while (offs.length < 2) offs.push(0);
      return { v: 1, dents: dents, band: clampI(look.band, 0, 2), cuts: cuts, offs: offs, plate: clampI(look.plate, 0, 2) };
    } catch (e) { return DEFAULT_LOOK; }
  }
  /* the face a plated look needs (no cuts): shared by plated() and the slice step's pre-warm */
  function platedFace(L, herb, G) {
    return { rx: G.jrx, ry: G.jry, face: 'bottom', band: L.band, herb: herb, dents: L.dents, ol: G.ol == null ? 1 : G.ol, glints: G.glints, garnish: G.garnish, thick: G.thick, nolace: G.nolace };
  }
  /* a plated jeon on any buffer: plate, contact shadow, cut + garnished jeon, optional soy dish. G = geometry (REV, DISHG,
     SMALLG). The texture seed comes from the look's dents, so every view of one dish matches. Returns anchors { hero,
     soy, food (Uint8Array W*H of jeon pixels when b is a stage), jcx, jcy, jrx, jry }. */
  function plated(b, L, herb, G) {
    plate(b, L.plate, { cx: G.pcx, cy: G.pcy, rx: G.prx, ry: G.pry, th: G.pth, rim: G.rim, deco: G.deco });
    var soy = G.soy ? soyDish(b, G.soy[0], G.soy[1], G.soy[2], G.soy[3], texSeed(L.dents)) : null;
    var cuts = GEO.cross.map(function (g, i) { return { deg: g + L.cuts[i], x: G.jcx + (i === 1 ? idiv(L.offs[i] * G.jrx, 29) : 0), y: G.jcy - 1 + (i === 0 ? idiv(L.offs[i] * G.jry, 19) : 0) }; });
    var o = platedFace(L, herb, G); o.cx = G.jcx; o.cy = G.jcy; o.cuts = cuts; o.sep = 1; o.half = G.half == null ? 1 : G.half; o.nudge = G.nudge; o.gap = G.gap || F.J1;
    var R = jeonComp(o);
    var x0 = G.jcx + R.ox, y0 = G.jcy + R.oy, rb = R.buf, i, j;
    for (j = 0; j < rb.h; j++) for (i = 0; i < rb.w; i++) {   /* contact shadow: down-right, one step darker */
      if (!rb.d[((j * rb.w + i) << 2) + 3]) continue;
      for (var s = 1; s <= G.shadow; s++) { var qi = i + s, qj = j + s; if (qi < rb.w && qj < rb.h && rb.d[((qj * rb.w + qi) << 2) + 3]) continue; shadeAt(b, x0 + qi, y0 + qj); }
    }
    blit(b, rb, x0, y0);
    var food = null;
    if (b.w === W && b.h === H) { food = new Uint8Array(W * H); for (j = 0; j < rb.h; j++) for (i = 0; i < rb.w; i++) if (rb.d[((j * rb.w + i) << 2) + 3]) { var X = x0 + i, Y = y0 + j; if (X >= 0 && Y >= 0 && X < W && Y < H) food[Y * W + X] = 1; } }
    return { hero: [G.jcx - R.J.cx + R.J.hero[0], G.jcy - R.J.cy + R.J.hero[1]], soy: soy, food: food, jcx: G.jcx, jcy: G.jcy, jrx: G.jrx, jry: G.jry };
  }
  /* the finished jeon as the player's hands left it (96 x 66, no soy dish). b = any buffer. o = { herb, x, y } (o.seed is
     ignored for the picture: the dents pick the texture, so this matches the reveal and the counter) */
  var DISHG = { pcx: 48, pcy: 31, prx: 44, pry: 27, pth: 3, rim: 5, jcx: 48, jcy: 29, jrx: 29, jry: 19, glints: [3, 9], garnish: 8, shadow: 2, thick: 2, nudge: 1 };
  function dish(b, look, o) {
    o = o || {};
    var L = safeLook(look), D = GEO.dish, ox = o.x == null ? (b.w - D.w) >> 1 : o.x | 0, oy = o.y == null ? (b.h - D.h) >> 1 : o.y | 0;
    var herb = o.herb === 'tot' ? 'tot' : 'parae';
    blit(b, remember('dish|' + herb + '|' + JSON.stringify(L), function () { var d = blank(D.w, D.h); plated(d, L, herb, DISHG); return d; }), ox, oy);
    return b;
  }
  /* small dish for the counter and the notebook (40 x 26, display only): no lace, no steam, no twinkle, no cut lines (at
     this size any cut reads as a cross); a crisp jeon shows its dark crust ring; the outline only on the lower right */
  var SMALLG = { pcx: 19, pcy: 11, prx: 18, pry: 10, pth: 2, rim: 3, deco: false, jcx: 19, jcy: 10, jrx: 12, jry: 7, glints: [0, 1], garnish: 2, shadow: 1, thick: 1, nolace: 1, ol: 0 };
  function dishSmall(b, look, o) {
    o = o || {};
    var L = safeLook(look), sm = GEO.small, ox = o.x == null ? (b.w - sm.w) >> 1 : o.x | 0, oy = o.y == null ? (b.h - sm.h) >> 1 : o.y | 0;
    var herb = o.herb === 'tot' ? 'tot' : 'parae';
    blit(b, remember('small|' + herb + '|' + JSON.stringify(L), function () { var d = blank(sm.w, sm.h); dishSmall0(d, L, herb); return d; }), ox, oy);
    return b;
  }
  function dishSmall0(b, L, herb) {
    var G = SMALLG, T = TB[L.band];
    plate(b, L.plate, { cx: G.pcx, cy: G.pcy, rx: G.prx, ry: G.pry, th: G.pth, rim: G.rim, deco: false });
    var R = jeonComp((function () { var o = platedFace(L, herb, G); o.cx = G.jcx; o.cy = G.jcy; return o; })()), J = R.J;
    var x0 = G.jcx - J.cx, y0 = G.jcy - J.cy, w = J.buf.w, h = J.buf.h, x, y;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) if (J.K[y * w + x] && !(x + 1 < w && y + 1 < h && J.K[(y + 1) * w + x + 1])) shadeAt(b, x0 + x + 1, y0 + y + 1);
    blit(b, J.buf, x0, y0);
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {   /* a 1-px rim on the shaded lower right only */
      if (J.K[y * w + x]) continue;
      var dx = x - J.cx, dy = y - J.cy, nb = (x > 0 && J.K[y * w + x - 1]) || (y > 0 && J.K[(y - 1) * w + x]);
      if (nb && dx / G.jrx + dy / G.jry > 0.2) put(b, x0 + x, y0 + y, F[T.side[1]]);
    }
    return b;
  }
  /* =====================================================================================
   *  GHOST HAND (hint), ICONS, PARTICLES
   * ===================================================================================== */
  var HAND = [            /* pointer hand, index finger up on the left, thumb low left. Hot spot = fingertip (5, 0) */
    '.....oo.........',
    '....oWWo........',
    '....oWYo........',
    '....oWYo........',
    '....oWYooo......',
    '....oWYoWYoo....',
    '....oWYoYYoYo...',
    '.oo.oWYoYYoYYo..',
    'oWYooWYYYYYYYYo.',
    'oWYYoWYYYYYYYYo.',
    '.oYYYYYYYYYYYXo.',
    '..oYYYYYYYYYYXo.',
    '..oYYYYYYYYYXo..',
    '...oYYYYYYYYXo..',
    '....oYYYYYYXo...',
    '....oXXXXXXXo...',
    '.....ooooooo....'];
  /* ghost hand: the outline is solid slate (reads on light batter and on the dark pan), the fill is a 50 % checker */
  function handAt(b, x, y, ph) {
    var K = { o: C.s2, W: C.s6, Y: C.s5, X: C.s4 };
    for (var j = 0; j < HAND.length; j++) for (var i = 0; i < HAND[j].length; i++) {
      var ch = HAND[j].charAt(i), c = K[ch], px = x - 5 + i, py = y + j;
      if (!c) continue;
      if (ch === 'o' || ((px + py + (ph | 0)) & 1) === 0) put(b, px, py, c);
    }
  }
  function pressRing(b, x, y, r) {
    for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
      var q = 4 * (dx * dx + dy * dy);
      if (q >= (2 * r - 1) * (2 * r - 1) && q < (2 * r + 1) * (2 * r + 1) && ((x + dx + y + dy) & 1) === 0) put(b, x + dx, y + dy, C.s6);
    }
  }
  /* o = { kind: 'tap' | 'flick' | 'line', x, y (tap point / flick start), x0, y0, x1, y1 (line), f 0..3, still } */
  function hand(b, o) {
    if (!o) return b;
    var f = clampI(o.f, 0, 3), k = o.kind;
    if (k === 'tap') {
      var x = o.x | 0, y = o.y | 0;
      if (o.still) { pressRing(b, x, y, 4); handAt(b, x, y + 1, 0); return b; }
      var dy = [6, 2, 0, 3][f];
      if (f === 2) pressRing(b, x, y, 3);
      if (f === 3) pressRing(b, x, y, 6);
      handAt(b, x, y + dy, 0);
    } else if (k === 'flick') {
      var fx = o.x | 0, fy = o.y | 0, up = o.still ? 14 : [0, 10, 22, 32][f];
      for (var t = 3; t < up; t += 3) { put(b, fx, fy - t + 1, C.s5); put(b, fx, fy - t + 2, C.s6); }   /* streak under the hand */
      if (o.still || f === 0) pressRing(b, fx, fy, 3);
      handAt(b, fx, fy - up, 0);
    } else if (k === 'line') {
      var n = o.still ? 2 : f, x0 = o.x0 | 0, y0 = o.y0 | 0, x1 = o.x1 | 0, y1 = o.y1 | 0;
      var hx = x0 + idiv((x1 - x0) * n, 3), hy = y0 + idiv((y1 - y0) * n, 3);
      for (var i = 0; i <= 16; i++) { var tx = x0 + idiv((hx - x0) * i, 16), ty = y0 + idiv((hy - y0) * i, 16); if ((i & 1) === 0) { put(b, tx, ty, C.s6); put(b, tx, ty + 1, C.s3); } }
      handAt(b, hx, hy, 0);
    }
    return b;
  }
  var ICON_G = {
    tap: [            /* pointer hand pressing down: index finger on the left, small grey press lines under the tip (the
                         strip's only amber is the current-step line) */
      '.....ooooooo....',
      '....oWWWWWWYo...',
      '...oWYYYYYYYXo..',
      '..oWYYYYYYYYXo..',
      '..oYYYYYYYYYYXo.',
      '.oYYYYYYYYYYYXo.',
      'oWYYoWYYYYYYYYo.',
      'oWYooWYYYYYYYYo.',
      '.oo.oWYoYYoYYo..',
      '....oWYoYYoYo...',
      '....oWYoWYoo....',
      '....oWYooo......',
      '....oWYo........',
      '..X.oWWo.X......',
      '.X...oo...X.....',
      '....XYYX........'],
    flip: [
      '................',
      '.ooooooooo......',
      'oWWWWWWWWYo.....',
      'oWVYVYVYVXo.....',
      'oWVYVYVYVXo.....',
      'oYYYYYYYYXo.....',
      '.oXXXXXXXo......',
      '..oooooWXo......',
      '.......oWXo.....',
      '........oWXo....',
      '.........odbo...',
      '..........odbo..',
      '...........odbo.',
      '............odbo',
      '.............oao',
      '..............o.'],
    slice: [
      '................',
      '..........ooo...',
      '.........odbbo..',
      '........odbbo...',
      '.......odbbo....',
      '......oVVVo.....',
      '.....oYWWo......',
      '....oYWWo.......',
      '...oYWWo........',
      '..oYWWo.........',
      '.oYWWo..........',
      '.oWWo...........',
      'oWWo............',
      'ooo.............',
      '................',
      '................'],
    close: [
      '................',
      '................',
      '..oo........oo..',
      '.oWYo......oWYo.',
      '.oYXYo....oYXXo.',
      '..oYXYo..oYXXo..',
      '...oYXYooYXXo...',
      '....oYXXXXXo....',
      '....oYXXXXXo....',
      '...oYXXooYXXo...',
      '..oYXXo..oYXXo..',
      '.oYXXo....oYXXo.',
      '.oXXo......oXXo.',
      '..oo........oo..',
      '................',
      '................']
  };
  var ICON_K = { o: C.ink, W: C.s6, Y: C.s5, X: C.s4, Z: C.s6, V: C.s1, b: C.w2, c: C.w3, d: C.w4, a: C.w1, F: C.a3, E: C.a2, D: C.a1 };
  var iconCache = {};
  function icon(name) {
    if (!ICON_G[name]) name = 'tap';
    if (!iconCache[name]) { var b = blank(16, 16); sprite(b, ICON_G[name], ICON_K, 0, 0); iconCache[name] = b; }
    return clone(iconCache[name]);
  }
  var PART = {
    crumb: [F.J4, F.J3, F.J2], drop: [F.J6, F.B1, F.B2], steam: [C.s6, C.s5, C.s4],
    dust: [C.w5, C.w4, C.w3], spark: [C.s6, C.a3, C.a2], herb: [C.g4, C.g3, C.g2]
  };
  function particles(b, list) {
    (list || []).forEach(function (p) {
      var k = PART[p.k] ? p.k : 'crumb', life = Math.max(1, p.life | 0 || 6), a = clampI(p.a, 0, life), x = Math.round(p.x), y = Math.round(p.y);
      var i = Math.min(2, idiv(a * 3, life + 1));
      if (k === 'steam' && i === 2 && ((x + y + a) & 1)) return;
      if (k === 'drop') put(b, x, y + 1, C.w3);   /* batter drops: a dark underside, so they read on the cream batter and on the pan */
      put(b, x, y, PART[k][i]);
    });
    return b;
  }

  /* =====================================================================================
   *  SCENES
   * ===================================================================================== */
  var cache = {};
  function cached(key, paint) { if (!cache[key]) { var c = blank(W, H); paint(c); cache[key] = c; } return cache[key]; }
  var PAN_STEP = { cx: GEO.pan.cx, cy: GEO.pan.cy, rx: GEO.pan.rx, ry: GEO.pan.ry, depth: GEO.pan.depth, rim: GEO.pan.rim, hlen: 30, hdeg: 22 };
  var PAN_COUNTER = { cx: 94, cy: 80, rx: 30, ry: 18, depth: 4, rim: 3, hlen: 14, hdeg: 36 };

  function counter(b, o) {
    o = o || {};
    copy(b, cached('counter', function (c) {
      wallPlanks(c, 2, 2, W - 2, 42, 18, 12, 22, 30);
      lamp(c, 12, 4);
      trim(c, 42);
      counterWood(c, 2, 45, W - 2, 141, [6, 6, 7, 7, 7, 7, 8, 8, 8, 8, 9, 9, 9], 7, { x: 20, y: 44, sy: 2, r1: 34 });
      /* front lip of the worktop, then the cabinet front (play-room cabinet colours): four doors, seams, amber knobs */
      var x, y;
      for (x = 2; x < W - 2; x++) {
        put(c, x, 141, C.w5); put(c, x, 142, C.w3); put(c, x, 143, C.w3); put(c, x, 144, C.w2); put(c, x, 145, C.w1);
        for (y = 146; y < H - 2; y++) put(c, x, y, y === 146 ? C.r0 : C.r1);
      }
      [[2, 37], [37, 72], [72, 107], [107, W - 2]].forEach(function (d, i) {
        for (y = 147; y < H - 2; y++) { put(c, d[0], y, C.r0); }                                   /* seam */
        for (x = d[0] + 3; x < d[1] - 2; x++) { put(c, x, 149, C.r0); put(c, x, H - 5, C.a1); }   /* panel: shade on top, light below */
        for (y = 149; y < H - 4; y++) { put(c, d[0] + 3, y, C.r0); put(c, d[1] - 3, y, C.a1); }
        var kx = i % 2 === 0 ? d[1] - 6 : d[0] + 5;                                               /* knobs meet at the pair's centre seam */
        put(c, kx, 151, C.a2); put(c, kx, 152, C.a1);
      });
      board(c, 16, 96, 46, 36, true, true);
      pan(c, PAN_COUNTER);
      frame(c);
    }));
    prewarmTap();
    var pend = o.pending;
    if (pend) {
      var si = clampI(pend.si, 0, 2);
      var J = si === 0 ? jeonBuf({ rx: 9, ry: 5, face: 'raw', band: 0, herb: pend.herb, dents: [], thick: 1 })   /* a raw lump of batter */
        : jeonBuf({ rx: 13, ry: 8, face: si === 1 ? 'top' : 'bottom', band: pend.band | 0, herb: pend.herb, dents: [], thick: 1 });
      blit(b, J.buf, PAN_COUNTER.cx - J.cx, PAN_COUNTER.cy + 2 - J.cy);
    }
    if (o.plate && o.plate.look) {
      var s = blank(GEO.small.w, GEO.small.h);
      dishSmall(s, o.plate.look, { herb: o.plate.herb });
      blit(b, s, GEO.spot.plate[0], GEO.spot.plate[1]);
    }
    return b;
  }

  function stepBase(key, extra) {
    return cached(key, function (c) { bgStep(c); pan(c, PAN_STEP); if (extra) extra(c); });
  }
  /* marks: [x, y, left] in art px, or the sim's { x, y (logical px), n (hits so far) } with o.per (default 3) */
  function markList(list, per) {
    per = per || 3;
    return (list || []).map(function (m) { return Array.isArray(m) ? m : [(m.x | 0) >> 1, (m.y | 0) >> 1, per - (m.n | 0)]; });
  }
  function pt(p) { return Array.isArray(p) ? [p[0] | 0, p[1] | 0] : [(p.x | 0) >> 1, (p.y | 0) >> 1]; }   /* [x, y] art px | { x, y } logical */
  function tapScene(b, o) {
    o = o || {};
    copy(b, stepBase('pan'));
    (o.dust || []).forEach(function (d) { var q = pt(d); put(b, q[0], q[1], C.w6); put(b, q[0] + 1, q[1] + 1, C.w2); });   /* reads on wood and pan */
    batter(b, { shape: o.shape == null ? o.stage : o.shape, herb: o.herb, dents: o.dents, flash: o.flash, squash: o.squash });
    marks(b, markList(o.marks, o.per), o.f);
    frame(b);
    return b;
  }
  var BUBBLES = [[34, 96, 0], [109, 80, 2], [86, 112, 1]];   /* legacy export only (the old three fixed pan bubbles) */
  var LIFT = [0, 16, 26, 36];   /* the sim's flip lift level 1..3 -> arc height in art px */
  /* the pan-size face and its heat kit (oil ring + fx anchors), cached per face */
  function kitFor(face, band, herb, dl, seed, noKit) {   /* noKit: the face only (a cold pan has no oil ring) */
    var o = { face: face, band: band, herb: herb, dents: dl, seed: seed };
    var R = jeonComp(o), J = R.J;
    if (noKit) return { J: J, kit: null };
    return lruGet(KITS, faceKey(J.rx, J.ry, face, band, herb, J.th, dl, seed, o), function () { return { J: J, kit: heatKit(J) }; });
  }
  /* fill the caches the flip step will need next (one face per call, only while nothing is being built): the raw side at
     every band, the cooked face, the tilted arc faces. Output bytes never change; it only moves the work off the beats. */
  function prewarmFlip(band, herb, dl, seed) {
    if (!cache['pan-heat-0']) { stepBase('pan-heat-0', function (c) { panHeat(c, PAN_STEP, 0); }); return; }
    if (!cache['pan-heat-1']) { stepBase('pan-heat-1', function (c) { panHeat(c, PAN_STEP, 2); }); return; }
    var need = [['top', band], ['top', Math.min(2, band + 1)], ['bottom', band], ['bottom', Math.min(2, band + 1)]];
    for (var i = 0; i < need.length; i++) {
      var o = { face: need[i][0], band: need[i][1], herb: herb, dents: dl, seed: seed }, k = faceKey(GEO.food.rx[2], GEO.food.ry[2], o.face, o.band, herb, 2, scaleDents(dl, GEO.food.rx[2], GEO.food.ry[2]), seed, o);
      if (!FACES.m.has(k)) { kitFor(o.face, o.band, herb, dl, seed); return; }
    }
    var ry5 = idiv(GEO.food.ry[2] * 5, 8), arcs = [['top', ry5], ['bottom', ry5], ['bottom', GEO.food.ry[2] - 1]];
    for (i = 0; i < arcs.length; i++) {
      var rx2 = arcs[i][1] === GEO.food.ry[2] - 1 ? GEO.food.rx[2] + 2 : GEO.food.rx[2], th = arcs[i][1] === GEO.food.ry[2] - 1 ? 2 : 1;
      var o2 = { face: arcs[i][0], band: band, herb: herb, dents: dl, seed: seed, rx: rx2, ry: arcs[i][1], thick: th };
      if (!FACES.m.has(faceKey(rx2, arcs[i][1], o2.face, band, herb, th, scaleDents(dl, rx2, arcs[i][1]), seed, o2))) { jeonComp(o2); return; }
    }
    /* the landing frame's oil ring round the squashed jeon, then the board: its background and the outlined face */
    var sq = { cx: GEO.food.cx, cy: GEO.food.cy + 1, rx: GEO.food.rx[2] + 2, ry: GEO.food.ry[2] - 1, face: 'bottom', band: band, herb: herb, dents: dl, thick: 2, seed: seed };
    var JS = jeonComp(sq).J, sk = 'sq|' + faceKey(JS.rx, JS.ry, 'bottom', band, herb, JS.th, dl, seed, sq);
    if (!KITS.m.has(sk)) { lruGet(KITS, sk, function () { return heatKit(JS); }); return; }
    if (!cache.board) { cached('board', function (c) { bgStep(c); board(c, GEO.board.x, GEO.board.y, GEO.board.w, GEO.board.h, false); }); return; }
    var bo = { cx: GEO.food.cx, cy: GEO.food.cy, face: 'bottom', band: band, herb: herb, dents: dl, cuts: [], sep: 1, seed: seed, ol: 1, gap: C.w4 };
    if (!FACES.m.has(faceKey(GEO.food.rx[2], GEO.food.ry[2], 'bottom', band, herb, 2, scaleDents(dl, GEO.food.rx[2], GEO.food.ry[2]), seed, bo))) jeonComp(bo);
  }
  /* the counter screen idles before a dish starts: build the tap step's background and its first lump of batter there,
     one item per frame, so the step opens without a cold build (output bytes never change) */
  var TAPWARM = blank(1, 1);
  function prewarmTap() {
    if (!cache.pan) { stepBase('pan'); return; }
    batter(TAPWARM, { shape: 0, dents: [] });
  }
  function scaleDents(dl, rx, ry) { return dl.slice(0, 9).map(function (d) { return [idiv(((d[0] | 0) - 32) * rx, GEO.food.rx[2]), idiv(((d[1] | 0) - 24) * ry, GEO.food.ry[2])]; }); }
  /* flip step. o = { heat, band, res | flipped, arc: null | { f 0..3, lift }, herb, dents, spatula, arrow, bump, flash, still, f,
     seed (fx), fh (frames since heat-on), fbc (frames since the last band change), fl (frames since the flip landed) }.
     All new inputs are optional. Without them: fh = f, no band-change beat, the heat-on beat plays on the frame cook.js
     flashes for 'heat', and the landing burst plays on arc frame 3 (fl 0).
     Heat on: oil ring + bubbles that swell and pop + rim specks + spatter + steam (curls and puffs, one curl rising off the
     food), busier per band (about 1 : 2 : 3.5); a band change pops 9 / 12 bubbles over four frames and sends up a puff;
     the landing floods the ring, sprays 56..76 drops and stands big steam discs over the rim on the landing frame itself. */
  function flipScene(b, o) {
    o = o || {};
    var f = o.f | 0, flipped = !!o.flipped || (o.res != null), band = clampI(o.res != null ? o.res : o.band, 0, 2);
    var still = !!o.still, heat = !!o.heat, herb = o.herb === 'tot' ? 'tot' : 'parae', arc = o.arc;
    var dl = (o.dents || []).slice(0, 9), tseed = texSeed(dl), seed = o.seed == null ? tseed : o.seed | 0;
    var fh = o.fh == null ? f : Math.max(0, o.fh | 0), fbc = o.fbc == null ? 1e6 : Math.max(0, o.fbc | 0);
    var fl = o.fl != null ? o.fl | 0 : arc ? (clampI(arc.f, 0, 3) === 3 ? 0 : -1) : flipped && heat ? 1 : -1;   /* today's cook.js shows the rest frame right after the landing */
    var fw = o.fh != null ? fh : heat && o.flash && !flipped && !arc ? 0 : -1;   /* heat-on beat frame */
    var ph = still ? 0 : (f >> 1) & 1;
    copy(b, heat ? stepBase('pan-heat-' + ph, function (c) { panHeat(c, PAN_STEP, ph * 2); }) : stepBase('pan'));
    var cx = GEO.food.cx, cy = GEO.food.cy, rx = GEO.food.rx[2], ry = GEO.food.ry[2];
    var face = flipped ? 'bottom' : heat ? 'top' : 'raw';
    var HK = kitFor(face, band, herb, dl, tseed, !heat), J = HK.J, kit = HK.kit, ox = cx - J.cx, oy = cy - J.cy, gate = gateOf(fh, fbc, band);
    var food = null, x, y;
    clearSteam();
    if (arc) {
      var af = clampI(arc.f, 0, 3), lift = +arc.lift <= 3 ? LIFT[clampI(arc.lift, 1, 3)] : clampI(arc.lift, 0, 48);
      var RY = [idiv(ry * 5, 8), 3, idiv(ry * 5, 8), ry][af], farRim = GEO.pan.cy - GEO.pan.ry;
      var LF = Math.min([idiv(lift, 2), lift, idiv(lift * 5, 8), 0][af], Math.max(0, cy - farRim - RY - 6));   /* stays clear of the far rim */
      if (af < 3) {   /* where it sat: a thin oil film (pan tone), its 1-px oil ring still bubbling, a lamp-side sheen */
        if (heat) {
          blit(b, kit.oil[0], ox, oy);
          for (y = -ry + 3; y <= ry - 3; y++) for (x = -rx + 4; x <= rx - 4; x++) {   /* lamp-side sheen on the oil film */
            if (!inE(x, y, rx - 4, ry - 3) || x / rx + y / ry > -0.45 || ih(x, y, 91) % 13) continue;
            put(b, cx + x, cy + y, ih(x, y, 92) % 4 ? F.O1 : F.G0);
          }
          if (!still) { fxBubbles(b, kit, ox, oy, fh, band, seed, gate, false); fxBubbles(b, kit, ox, oy, fh, band, seed, gate, true); }
        }
        var srx = idiv(rx * 5, 9) - idiv(LF, 4), sry = idiv(ry * 4, 9) - idiv(LF, 6);   /* a small soft shadow, down-right */
        for (y = -sry; y <= sry; y++) for (x = -srx; x <= srx; x++) if (inE(x, y, srx, sry) && ((x + y) & 1) === 0) put(b, cx + 4 + x, cy + 4 + y, C.s0);
      }
      if (af === 1) {   /* edge-on, turning: a narrow tilted disc, the raw side on top, one row of the cooked face under it */
        var E = mk(cx - rx - 2, cy - LF - 7, 2 * rx + 5, 15), T1 = TB[band], yc;
        for (x = -rx; x <= rx; x++) {
          yc = cy - LF + iround(-2 * x, rx);   /* tilted: the left edge a little lower (it is turning over toward the viewer) */
          for (y = -RY; y <= RY; y++) if (inE(x, y, rx, RY)) mset(E, cx + x, yc + y, y < 1 ? 1 : y === 1 ? 2 : 3);
        }
        mOutline(b, E, F.J1);
        mEach(E, function (px, py, v) {
          var up = !mhas(E, px, py - 1);
          put(b, px, py, F[v === 1 ? (up ? (px < cx ? 'J6' : 'B1') : ((px * 5) % 11 === 0 ? 'P2' : 'B1')) : v === 2 ? T1.edge : T1.base]);
        });
      } else {
        var sq = af === 3 ? [rx + 2, ry - 1] : [rx, RY], jo = { cx: cx, cy: cy - LF + (af === 3 ? 1 : 0), rx: sq[0], ry: sq[1], face: af < 2 ? 'top' : 'bottom', band: band, herb: herb, dents: dl, thick: af === 3 ? 2 : 1, flash: o.flash, seed: tseed };
        var SQ = null;
        if (af === 3 && heat) {   /* the landing frame: the oil ring round the squashed jeon, boiling hard */
          var JS = jeonComp(jo).J; SQ = { kit: lruGet(KITS, 'sq|' + faceKey(JS.rx, JS.ry, 'bottom', band, herb, JS.th, dl, tseed, jo), function () { return heatKit(JS); }), ox: cx - JS.cx, oy: jo.cy - JS.cy };
          blit(b, SQ.kit.oil[1], SQ.ox, SQ.oy);
          if (!still) fxBubbles(b, SQ.kit, SQ.ox, SQ.oy, fh, 2, seed, gate, false);
        }
        jeon(b, jo);
        if (SQ && !still) fxBubbles(b, SQ.kit, SQ.ox, SQ.oy, fh, 2, seed, gate, true);
      }
      if (!still && heat && af < 3) [[-9, 0, 'J5'], [6, 1, 'G0'], [14, 2, 'J5']].forEach(function (d) {   /* oil drips off the flying jeon */
        var yy = cy - LF + RY + 3 + d[1] * 2 + af * 3; put(b, cx + d[0], yy, F[d[2]]); if (af) put(b, cx + d[0], yy - 1, F.J4);
      });
      if (SQ && !still && fl >= 0 && fl <= 4) fxBurst(b, SQ.kit, SQ.ox, SQ.oy, fl, band, seed);
    } else {
      if (o.bump) oy -= 1;
      var bb = fl >= 0 && fl < 8 ? 2 : band;   /* just after the landing the oil boils hard whatever the band */
      if (heat) blit(b, kit.oil[band ? 1 : 0], ox, oy + (o.bump ? 1 : 0));
      if (heat && !still) fxBubbles(b, kit, ox, oy, fh, bb, seed, gate, false);
      if (heat && still) [8, 40, 70].slice(0, band ? 3 : 1).forEach(function (pc) { var p = kit.ring[idiv(pc * kit.ring.length, 100)]; drawBub(b, BUB[2], ox + p[0], oy + p[1]); });
      blit(b, J.buf, ox, oy);
      if (heat && !still) {
        fxBubbles(b, kit, ox, oy, fh, bb, seed, gate, true);
        fxSpecks(b, kit, ox, oy, fh, bb, seed, gate);
        fxSpatter(b, kit, ox, oy, fh, bb, seed, gate);
        if (fw >= 0 && fw < 8) fxWake(b, kit, ox, oy, fw, seed);
        if (band > 0 && fbc < 8) fxBandBeat(b, kit, ox, oy, fbc, band, seed);
        if (fl >= 0 && fl <= 5) fxBurst(b, kit, ox, oy, fl, band, seed);
      }
      if (o.flash && !(heat && !still && fw === 0)) flashRim(b, J, ox, oy);
      if (!still && (heat || flipped)) {   /* the hero glint twinkles: 8 frames after the landing, then every 48 frames */
        var tw = fl >= 0 && fl < 20 ? fl - 8 : (f + 17) % 48;
        twinkle(b, tw, ox + J.hero[0], oy + J.hero[1], 2);
      }
      food = function (px, py) { var X = px - ox, Y = py - oy; return X < 0 || Y < 0 || X >= J.buf.w || Y >= J.buf.h || !J.K[Y * J.buf.w + X] ? 0 : face === 'bottom' ? 1 : 2; };
    }
    var sp = o.spatula === undefined ? GEO.rest.spatula : o.spatula;   /* undefined = resting in the pan, null = hidden */
    if (sp) spatula(b, sp[0], sp[1]);
    if (heat) {
      if (still) stillSteam(band, cx, cy, rx, ry);
      else {
        var bs = flipped || (arc && clampI(arc.f, 0, 3) === 3) ? 2 : band;   /* once it has landed, the raw side on the hot oil steams hard */
        fxSteam(fh, fbc, bs, seed, cx, cy, rx, ry, bs === 0 ? (arc ? { curlOnly: 1, life: 16 } : { foodOnly: 1, onFood: 1 }) : { onFood: !arc });
        if (!flipped && !arc) fxBandPuff(fbc, band, seed, cx, cy, rx, ry);
        if (fl >= 0 && fl < 36) fxBloom(fl, band, seed, cx, cy, rx, ry);
      }
      steamPass(b, food);
    }
    if (o.arrow === 0 || o.arrow === 1) arrow(b, (sp ? sp[0] : GEO.rest.spatula[0]) + 1, (sp ? sp[1] : GEO.rest.spatula[1]) - 18, o.arrow);
    frame(b);
    if (!arc && !still) prewarmFlip(band, herb, dl, tseed);
    return b;
  }

  /* a slice line: { x, y, deg, len, cells, cut, cutDeg, flash } in art px, or the sim's { ax, ay, bx, by (logical),
     bins, cut, ang, off } (off is already inside A and B). The guide angle comes from A -> B by integer search. */
  function lineOf(L) {
    if (!L || typeof L.ax !== 'number') return L;
    var dx = (L.bx | 0) - (L.ax | 0), dy = (L.by | 0) - (L.ay | 0), d0 = degOf(dx, dy), deg = d0 % 180;
    var len = iround(dx * icos(d0) + dy * isin(d0), 4096) >> 1;
    return { x: ((L.ax | 0) + (L.bx | 0)) >> 2, y: ((L.ay | 0) + (L.by | 0)) >> 2, deg: deg, len: len || 64, cells: L.bins, cut: !!L.cut, cutDeg: deg + clampI(L.ang, -30, 30), flash: L.flash };
  }
  var CRUMB = [[[0, 0, 'J3'], [-1, -1, 'J5']], [[0, 0, 'J2']], [[0, 0, 'J4'], [1, 0, 'J2']], [[0, 0, 'J3']], [[0, 0, 'J1']]];
  /* the slice step: board + cooked jeon. New optional inputs: seed, fl (frames since the flip landed: the landing bloom
     carries on here), still. While no line is cut or scored yet the jeon is fresh off the pan: fuller steam. f = 0 with no
     still given reads as reduced motion (that is what js/cook.js passes then). The money-shot face is pre-built here. */
  function sliceScene(b, o) {
    o = o || {};
    var f = o.f | 0, band = clampI(o.band, 0, 2), G = GEO.board, still = o.still != null ? !!o.still : f === 0;
    var cx = GEO.food.cx, cy = GEO.food.cy, rx = GEO.food.rx[2], ry = GEO.food.ry[2], herb = o.herb === 'tot' ? 'tot' : 'parae';
    var dl = (o.dents || []).slice(0, 9), tseed = texSeed(dl), seed = o.seed == null ? tseed : o.seed | 0;
    copy(b, cached('board', function (c) { bgStep(c); board(c, G.x, G.y, G.w, G.h, false); }));
    var lines = (o.lines || []).map(lineOf), cuts = [], fresh = true;
    lines.forEach(function (L) { if (L && L.cut) cuts.push({ deg: L.cutDeg == null ? L.deg : L.cutDeg, x: L.x, y: L.y }); if (L && (L.cut || (L.cells && L.cells.some(function (v) { return v; })))) fresh = false; });
    var anyFlash = lines.some(function (L, i) { return L && L.cut && (L.flash || o.flash === i); });
    var R = jeonComp({ cx: cx, cy: cy, face: 'bottom', band: band, herb: herb, dents: dl, cuts: cuts, sep: 1, seed: tseed, ol: 1, gap: C.w4 });
    var x0 = cx + R.ox, y0 = cy + R.oy, rb = R.buf, i, j, s;
    for (j = 0; j < rb.h; j++) for (i = 0; i < rb.w; i++) {   /* contact shadow on the board: 2 px down-right */
      if (!rb.d[((j * rb.w + i) << 2) + 3]) continue;
      for (s = 1; s <= 2; s++) { var qi = i + s, qj = j + s; if (qi < rb.w && qj < rb.h && rb.d[((qj * rb.w + qi) << 2) + 3]) continue; shadeAt(b, x0 + qi, y0 + qj); }
    }
    blit(b, rb, x0, y0);
    if (anyFlash) R.gaps.forEach(function (g) { put(b, x0 + g[0], y0 + g[1], C.s6); });
    cuts.forEach(function (c, n) {   /* crumbs where the knife left the jeon, both ends of each cut */
      var co = icos(c.deg), si = isin(c.deg);
      [-1, 1].forEach(function (sgn) {
        var u = 0; while (u < 60 && inE(iround(sgn * u * co, 4096) + c.x - cx, iround(sgn * u * si, 4096) + c.y - cy, rx + 1, ry + 1)) u++;
        for (var k = 0; k < 3; k++) {
          var h = ih(n * 7 + k, sgn + 3, tseed + 77), d = u + 1 + (h % 4), w = ((h >>> 4) % 5) - 2;
          var px = c.x + iround(sgn * d * co - w * si, 4096), py = c.y + iround(sgn * d * si + w * co, 4096);
          CRUMB[(h >>> 8) % CRUMB.length].forEach(function (q) { var g = get(b, px + q[0], py + q[1]); if (g === C.w6 || g === C.w5 || g === C.s6) put(b, px + q[0], py + q[1], F[q[2]]); });
          shadeAt(b, px + 1, py + 1);
        }
      });
    });
    lines.forEach(function (L) {   /* kerfs: painted cells of a line not yet cut (the knife marks follow the hand) */
      if (!L || L.cut || !L.cells) return;
      var c = icos(L.deg), s2 = isin(L.deg), n = L.cells.length || 40, len = L.len || 64;
      for (var u = -(len >> 1); u <= (len >> 1); u++) {
        var cell = Math.min(n - 1, idiv((u + (len >> 1)) * n, len + 1));
        if (!L.cells[cell]) continue;
        var px = L.x + iround(u * c, 4096), py = L.y + iround(u * s2, 4096), g = get(b, px, py);
        if (g === C.w6 || g === C.w5 || g === C.s6) put(b, px, py, C.w5); else if (g) { put(b, px, py, F.J1); shadeAt(b, px + 1, py + 1); }
      }
    });
    var cooked = {}; JR.forEach(function (id) { cooked[F[id]] = 1; });
    (o.trail || []).forEach(function (p, k, a) { if (k) { var q = a[k - 1]; lineIf(b, q[0] | 0, q[1] | 0, p[0] | 0, p[1] | 0, function (g) { return g && cooked[g] && g !== F.J0 && g !== F.J1; }, F.J1); } });
    if (!still) twinkle(b, (f + 9) % 48, x0 - R.ox - R.J.cx + R.J.hero[0], y0 - R.oy - R.J.cy + R.J.hero[1], 2);
    var gi = o.guide != null ? o.guide | 0 : o.cur != null ? o.cur | 0 : -1, GL = lines[gi];
    if (GL && !GL.cut) guide(b, GL.x, GL.y, GL.deg, GL.len || 64, f, GL.cells);
    var kn = o.knife !== undefined ? o.knife : o.hand ? [(o.hand.x | 0) >> 1, (o.hand.y | 0) >> 1, GL ? GL.deg : 0] : GEO.rest.knife;
    if (kn) knife(b, kn[0] | 0, kn[1] | 0, kn[2] | 0);
    clearSteam();
    if (still) { wisp(cx - 8, cy - ry - 1, 26, 60, 0x1234567, 3, 0); wisp(cx + 12, cy - ry, 16, 60, 0x2345678, 3, 0); blob(cx + 2, cy - ry - 14, 3, 0); }
    else {   /* the board steams like the pan did: curls and round discs (pale on the light wood), one curl off the jeon */
      fxSteam(f, 1e6, 0, seed, cx, cy, rx, ry, fresh ? { n: 3, rmax: 4, ps: [32, 48], sp: 0, first: -48, salt: 4100, onFood: 1 } : { n: 2, rmax: 3, ps: [48], sp: 1, first: -48, salt: 4200 });
      if (o.fl != null && o.fl >= 0 && o.fl < 36) fxBloom(o.fl | 0, band, seed, cx, cy, rx, ry, 5);
    }
    steamPass(b, function (px, py) { var X = px - x0, Y = py - y0; return X >= 0 && Y >= 0 && X < rb.w && Y < rb.h && rb.d[((Y * rb.w + X) << 2) + 3] ? 1 : 0; }, true);
    frame(b);
    if (!still) prewarmReveal(band, herb, dl);
    return b;
  }
  function lineIf(b, x0, y0, x1, y1, ok, c) {
    var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1, e = dx + dy;
    for (var n = 0; n < 512; n++) { if (ok(get(b, x0, y0))) put(b, x0, y0, c); if (x0 === x1 && y0 === y1) break; var e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }
  /* the money shot: a bigger plate (rx 60), the jeon at about 1.45x (rx 42) cut in four, the pieces pulled a little apart
     by the seed, chili rings and scallion, a glossy soy dish, slow steam (curls and puffs) rising onto the wall, twinkles
     on the glints and now and then a white flare on the food. Everything ends above y 120 (the dish-name tag sits at 124).
     o = { look, herb, f 0..5 (rise), t (frames since the reveal began; optional), still }. Without t the reveal is a
     still frame (static puffs, no twinkle), which is also its reduced-motion picture. */
  var REV = { pcx: 72, pcy: 83, prx: 60, pry: 33, pth: 3, rim: 7, jcx: 72, jcy: 80, jrx: 42, jry: 26, soy: [121, 52, 12, 7], glints: [5, 14], garnish: 10, shadow: 2, thick: 3, nudge: 1 };
  var REVC = lru(8);
  function prewarmReveal(band, herb, dl) {   /* the slice step already knows band, herb and dents: build the big face early */
    if (!cache.reveal) { cached('reveal', function (cc) { bgStep(cc); }); return; }
    var o = platedFace({ band: band, dents: dl }, herb, REV);
    var k = faceKey(REV.jrx, REV.jry, 'bottom', band, herb, REV.thick, scaleDents(dl, REV.jrx, REV.jry), texSeed(dl), o);
    if (!FACES.m.has(k)) jeonComp(o);
  }
  function revealScene(b, o) {
    o = o || {};
    var f = clampI(o.f == null ? 5 : o.f, 0, 5), up = (5 - f) * 2, t = o.t == null ? null : o.t | 0, still = !!o.still || t === null;
    var L = safeLook(o.look), herb = o.herb === 'tot' ? 'tot' : 'parae', seed = o.seed == null ? texSeed(L.dents) : o.seed | 0;
    var key = herb + '|' + JSON.stringify(L) + '|' + f;
    var RV = lruGet(REVC, key, function () {   /* one stage per rise frame, painted once */
      var c = blank(W, H), G = {}, k;
      copy(c, cached('reveal', function (cc) { bgStep(cc); }));
      for (k in REV) G[k] = REV[k];
      G.pcy += up; G.jcy += up; G.soy = [REV.soy[0], REV.soy[1] + up, REV.soy[2], REV.soy[3]];
      return { buf: c, A: plated(c, L, herb, G) };
    });
    var A = RV.A;
    copy(b, RV.buf);
    clearSteam();
    if (still) {
      mdisc(A.jcx - 15, A.jcy - A.jry - 12, 4, 4); mdisc(A.jcx - 9, A.jcy - A.jry - 23, 3, 4); mdisc(A.jcx - 4, A.jcy - A.jry - 31, 2, 4);
      wisp(A.jcx + 14, A.jcy - tz(A.jry * 0.4), 30, 64, 0x2345671, 4, 0);
    } else fxSteam(t, 1e6, L.band, seed, A.jcx, A.jcy, A.jrx, A.jry, { n: 3, rmax: 4, ps: [32, 48], sp: 1, life: 32, first: -96, salt: 4300 });
    steamPass(b, function (px, py) { return A.food[py * W + px] ? 1 : 0; });
    if (!still && f >= 5) {
      twinkle(b, (t + 30) % 48, A.hero[0], A.hero[1], 3);
      if (A.soy) twinkle(b, (t + 7) % 48, A.soy[0], A.soy[1], 2);
      sparkle(b, A.jcx + tz(A.jrx * 0.18), A.jcy - tz(A.jry * 0.2), (t + 53) % 96);   /* a white flare on the food, rarely */
    }
    frame(b);
    return b;
  }
  /* 1-art-px jiggle (slice end, flip, plate reveal): moves everything inside the frame by (dx, dy), edges repeat, frame stays */
  function shake(b, dx, dy) {
    dx = clampI(dx, -2, 2); dy = clampI(dy, -2, 2); if (!dx && !dy) return b;
    var src = new Uint8ClampedArray(b.d), x0 = 2, y0 = 2, x1 = b.w - 3, y1 = b.h - 3;
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
      var sx = Math.min(x1, Math.max(x0, x - dx)), sy = Math.min(y1, Math.max(y0, y - dy)), si = (sy * b.w + sx) << 2, ti = (y * b.w + x) << 2;
      b.d[ti] = src[si]; b.d[ti + 1] = src[si + 1]; b.d[ti + 2] = src[si + 2]; b.d[ti + 3] = src[si + 3];
    }
    return b;
  }

  /* ---------- sim helpers (pure, integer) ---------- */
  function toFood(x, y) { return [(x | 0) - GEO.box0[0], (y | 0) - GEO.box0[1]]; }
  function fromFood(fx, fy) { return [(fx | 0) + GEO.box0[0], (fy | 0) + GEO.box0[1]]; }
  function inFood(stage, x, y) {
    stage = clampI(stage, 0, 2);
    var M = batterMask(GEO.food.cx, GEO.food.cy, stage, 0).M;
    return mhas(M, x | 0, y | 0) && mhas(M, (x | 0) + 1, (y | 0) + 1) && mhas(M, (x | 0) - 1, (y | 0) - 1);
  }
  /* nearest point inside the (shrunk) food outline along the line to the centre */
  function pullIn(stage, x, y) {
    stage = clampI(stage, 0, 2);
    var cx = GEO.food.cx, cy = GEO.food.cy, px = x | 0, py = y | 0;
    for (var k = 0; k <= 32; k++) {
      var qx = px + iround((cx - px) * k, 32), qy = py + iround((cy - py) * k, 32);
      if (inFood(stage, qx, qy) && inE(qx - cx, qy - cy, GEO.food.rx[stage] - 3, Math.max(1, GEO.food.ry[stage] - 3))) return [qx, qy];
    }
    return [cx, cy];
  }

  var API = {
    VERSION: VERSION, W: W, H: H, APOLLO: APOLLO.slice(), PAL: C, GEO: GEO, PART: PART, ICONS: Object.keys(ICON_G),
    sin: isin, cos: icos,
    blank: blank, clone: clone, copy: copy, clear: clear, put: put, get: get, rect: rect, line: line, ellipse: ellipse,
    dither: dither, blit: blit, hash: hash, colors: colors, imageData: imageData, toCanvas: toCanvas,
    counter: counter, tapScene: tapScene, flipScene: flipScene, sliceScene: sliceScene, revealScene: revealScene, frame: frame,
    pan: pan, panHeat: panHeat, board: board, batter: batter, marks: marks, jeon: jeon, bubbles: bubbles, spatula: spatula,
    arrow: arrow, guide: guide, knife: knife, plate: plate, dish: dish, dishSmall: dishSmall, hand: hand, icon: icon,
    particles: particles, safeLook: safeLook, shake: shake, wallTile: wallTile,
    toFood: toFood, fromFood: fromFood, inFood: inFood, pullIn: pullIn,
    PAN_STEP: PAN_STEP, PAN_COUNTER: PAN_COUNTER, BUBBLES: BUBBLES,
    F: F, FOOD: FOOD.slice(), LOOP: LOOP, REV: REV, texSeed: texSeed, jeonBuf: jeonBuf, jeonComp: jeonComp, heatKit: heatKit,
    soyDish: soyDish, twinkle: twinkle, steamPass: steamPass, clearSteam: clearSteam, fxSteam: fxSteam, LUT: LUT
  };
  return API;
})();
if (typeof module !== 'undefined' && module.exports) module.exports = COOK_ART;
