/* js/cook-art.js - pixel art for the kitchen corner (wave 9 cooking, slice 1 = haecho-jeon). Global COOK_ART.
 * Plain script, no modules, file:// safe. Painting needs no DOM, so node can paint and hash every picture.
 * Comments stay ASCII (tools/subset-fonts.py scans js/*.js). This file holds no player-facing text at all.
 *
 * BUFFER   { w, h, d }   d = Uint8ClampedArray(w * h * 4), RGBA, alpha is 0 (empty) or 255 (painted), never partial.
 *          Same shape as js/runner.js sprites and as canvas ImageData:  ctx.putImageData(COOK_ART.imageData(buf), 0, 0)
 *          on a 144 x 160 offscreen canvas, then drawImage it at an integer scale with imageSmoothingEnabled = false.
 *          Painters draw INTO a buffer you pass (they never resize it). put() only accepts the 46 Apollo colors (it
 *          ignores anything else), so a painted buffer can only hold Apollo colors.
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
 *                      before the flip the raw side is up and its rim shows the band; after it the cooked face is up.
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
 *          marks(b, list, f) jeon(b, { cx, cy, rx, ry, face: 'top' | 'bottom', band, herb, dents, cuts, flash })
 *          bubbles(b, list, f, still) spatula(b, x, y) arrow(b, x, y, f) guide(b, x, y, deg, len, f, cells)
 *          knife(b, x, y, deg) (x, y = edge point under the finger; handle always to the right / below)
 *          plate(b, color, o) dish(b, look, o) (o = { herb, x, y }; GEO.dish 96 x 66, centred in b unless x / y given)
 *          dishSmall(b, look, o) (GEO.small 40 x 26). js/cook.js drawDish() calls these two with o = { herb, ... }.
 *          hand(b, o)  ghost hand (solid slate outline, 50 % checker fill). o = { kind: 'tap', x, y, f } |
 *                      { kind: 'flick', x, y (start), f } | { kind: 'line', x0, y0, x1, y1, f }   f 0..3 at 12 fps,
 *                      o.still = true for the reduced-motion pose. The hot spot is the index fingertip.
 *          icon(name) -> 16 x 16 buffer   names: 'tap' (pointer hand pressing), 'flip' (spatula), 'slice' (knife), 'close'
 *          particles(b, list)   list = [{ x, y, k, a, life }]  k = 'crumb' | 'drop' | 'steam' | 'dust' | 'spark' | 'herb'
 *                               1 x 1 art px each, color by age (PART[k][0] young .. [2] old); old steam thins out.
 * MOTION   f = frame counter at 12 fps (83 ms). Reduced motion: pass f: 0, still: true, squash 0, no arc (swap faces),
 *          no shake, no particles; flash rims, dents, kerfs and band colors stay (design 5.4).
 * SIM      GEO (all geometry, incl. food radii per stage, markBase, rest poses, button boxes), toFood(x, y),
 *          fromFood(fx, fy), inFood(stage, x, y) -> bool, pullIn(stage, x, y) -> [x, y] (nearest point well inside).
 */
var COOK_ART = (function () {
  'use strict';
  var VERSION = 'cook-art-1';
  var W = 144, H = 160;

  /* ---------- palette: Apollo 46 only (js/palettes.js) ---------- */
  var APOLLO = ['#172038', '#253a5e', '#3c5e8b', '#4f8fba', '#73bed3', '#a4dddb', '#19332d', '#25562e',
    '#468232', '#75a743', '#a8ca58', '#d0da91', '#4d2b32', '#7a4841', '#ad7757', '#c09473',
    '#d7b594', '#e7d5b3', '#341c27', '#602c2c', '#884b2b', '#be772b', '#de9e41', '#e8c170',
    '#241527', '#411d31', '#752438', '#a53030', '#cf573c', '#da863e', '#1e1d39', '#402751',
    '#7a367b', '#a23e8c', '#c65197', '#df84a5', '#090a14', '#10141f', '#151d28', '#202e37',
    '#394a50', '#577277', '#819796', '#a8b5b2', '#c7cfcc', '#ebede9'];
  var RGB = {};
  APOLLO.forEach(function (h) { var n = parseInt(h.slice(1), 16); RGB[h] = [n >> 16 & 255, n >> 8 & 255, n & 255]; });
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
    [-36, 30, 3], [-8, 24, 4], [16, 34, 0], [30, -40, 1], [-24, -24, 3], [2, 44, 2], [48, 22, 0]];
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
  function batter0(b, o) {
    var stage = clampI(o.shape == null ? o.stage : o.shape, 0, 2), sq = clampI(o.squash, 0, 2), cx = o.cx == null ? GEO.food.cx : o.cx, cy = o.cy == null ? GEO.food.cy : o.cy;
    var bm = batterMask(cx, cy, stage, sq), M = bm.M, rx = bm.rx, ry = bm.ry, ccy = bm.cy;
    var tall = stage === 0 ? 4 : stage === 1 ? 2 : 1;
    /* thickness: the batter's own side under its front edge */
    var T = mk(M.x0, M.y0, M.w, M.h + tall);
    mEach(M, function (x, y) { for (var k = 0; k <= tall; k++) mset(T, x, y + k, 1); });
    mOutline(b, T, o.flash ? C.s6 : C.w4, o.flash ? null : function (x, y) { return mhas(T, x, y - 1) || mhas(T, x - 1, y) ? C.w3 : C.w4; });
    mEach(T, function (x, y) { if (!mhas(M, x, y)) put(b, x, y, mhas(T, x, y + 1) ? C.w5 : C.w4); });
    /* body: highlight cap toward the lamp, shade toward the lower right */
    var hx = cx - (rx >> 2) - 2, hy = ccy - (ry >> 2) - 1, hrx = 2, hry = 1;   /* a small wet glint, not a flat white cap */
    mEach(M, function (x, y) {
      var col = C.w6;
      if (!mhas(M, x + 1, y + 1) || !mhas(M, x + 1, y)) col = C.w5;
      else if (stage < 2 && (!mhas(M, x + 2, y + 2) || !mhas(M, x + 3, y + 2))) col = C.w5;
      if (!mhas(M, x - 1, y - 1) && !(!mhas(M, x + 1, y + 1))) col = C.s6;
      if (stage < 2 && inE(x - hx, y - hy, hrx, hry)) col = C.s6;
      put(b, x, y, col);
    });
    if (stage < 2) { put(b, hx - (hrx >> 1), hy - (hry >> 1), C.s6); }
    var clip = function (x, y) { return mhas(M, x, y) && mhas(M, x + 1, y + 1) && mhas(M, x - 1, y - 1) && mhas(M, x + 1, y) && mhas(M, x, y + 1); };
    flecks(b, cx, ccy, rx, ry, o.herb, false, clip, stage === 0 ? 8 : stage === 1 ? 12 : 16);
    dents(b, (o.dents || []).slice(0, 9).map(function (d) { return [cx - 32 + (d[0] | 0), cy - 24 + (d[1] | 0) + (ccy - cy)]; }), C.w5, C.w4, C.s6, function (x, y) { return mhas(M, x, y); });
    if (o.flash) mOutline(b, T, C.s6);
    return M;
  }
  function clampI(v, a, b) { v = Math.round(+v || 0); return v < a ? a : v > b ? b : v; }

  /* jeon face palettes. top = raw side up while it cooks (the rim shows the browning; tiny bubbles open up),
     bottom = cooked face after the flip (soft #e8c170 / golden #de9e41 / crisp #be772b, edge #884b2b). */
  var FACE = {
    raw: { body: C.w6, lite: C.s6, pit: C.w5, edge: C.w5, line: C.w3, side: C.w4, holes: 0 },   /* cold pan: nothing cooks yet */
    top: [
      { body: C.w6, lite: C.s6, pit: C.w5, edge: C.a3, line: C.w4, side: C.a3, holes: 3 },
      { body: C.w6, lite: C.s6, pit: C.w5, edge: C.a2, line: C.a1, side: C.a2, holes: 6 },
      { body: C.a3, lite: C.w6, pit: C.a2, edge: C.a1, line: C.r1, side: C.a1, holes: 9 }],
    bottom: [
      { body: C.a3, lite: C.w6, pale: C.w6, brown: C.a2, edge: C.a2, line: C.r1, side: C.a1, pit: C.a2, pitD: C.a1 },
      { body: C.a2, lite: C.a3, pale: C.a3, brown: C.a1, edge: C.a1, line: C.r1, side: C.r1, pit: C.a1, pitD: C.r1 },
      /* crisp: lacy golden-brown, never charred: no #602c2c anywhere, patches lighter than the body, golden lace on the rim */
      { body: C.a1, lite: C.a2, pale: C.a3, brown: C.a2, edge: C.a1, line: C.r1, side: C.r1, pit: C.a1, pitD: C.r1, lace: C.a3 }]
  };
  /* designed browning patches / bubble holes, in 1/64 of the radius: [x, y, size] */
  var BLOB = [[-34, -22, 2], [12, -36, 1], [36, -6, 2], [-48, 12, 1], [-12, 6, 2], [22, 24, 1], [-28, 34, 1], [44, 26, 2], [4, -14, 1],
    [-18, -42, 1], [30, -28, 1], [-4, 38, 2]];
  function blob(b, x, y, n, c, clip) {
    var P = n >= 2 ? [[0, 0], [1, 0], [-1, 0], [0, -1], [1, -1], [0, 1]] : [[0, 0], [1, 0]];
    P.forEach(function (q) { if (!clip || clip(x + q[0], y + q[1])) put(b, x + q[0], y + q[1], c); });
  }
  /* render one jeon face into its own buffer. o = { rx, ry, face 'top'|'bottom', band, herb, dents [[dx, dy]] (from centre),
     flash, thick } -> { buf, cx, cy } (centre inside buf) */
  function jeonBuf(o) {
    var rx = o.rx, ry = Math.max(1, o.ry), th = o.thick == null ? 2 : o.thick, pad = 3, band = clampI(o.band, 0, 2), raw = o.face === 'raw', top = raw || o.face === 'top';
    var bw = 2 * rx + 1 + 2 * pad, bh = 2 * ry + 1 + 2 * pad + th, cx = rx + pad, cy = ry + pad;
    var b = blank(bw, bh), F = raw ? FACE.raw : FACE[top ? 'top' : 'bottom'][band], crisp = !top && band === 2;
    var M = mk(0, 0, bw, bh), k;
    for (k = 0; k <= th; k++) mEll(M, cx, cy + k, rx, ry, 1);
    var lace = [];
    if (crisp) {   /* lacy crisp rim: small bites out of the edge, golden lace just inside */
      for (var i = 0; i < 18; i++) {
        var a = i * 20 + 9 + (ih(i, 3, 5) % 7), ex = cx + iround(isin(a + 90) * rx, 4096), ey = cy + iround(isin(a) * ry, 4096);
        if (i % 3 !== 1) mset(M, ex, ey, 0);
        lace.push([cx + iround(isin(a + 90) * (rx - 2), 4096), cy + iround(isin(a) * (ry - 2), 4096)]);
      }
    }
    mOutline(b, M, o.flash ? C.s6 : F.line);
    mEach(M, function (px, py) {
      var dx = px - cx, dy = py - cy, col;
      if (!inE(dx, dy, rx, ry)) { put(b, px, py, F.side); return; }
      var r1 = inE(dx, dy, rx - 1, ry - 1), r2 = inE(dx, dy, rx - 2, Math.max(0, ry - 2));
      if (!r1) col = (dy < 0 && dx < (rx >> 1)) ? (top ? F.edge : F.lite) : F.edge;
      else if (!r2) col = (dy < 0 && dx < 0) ? F.lite : F.edge;
      else col = F.body;
      put(b, px, py, col);
    });
    var clip = function (px, py) { return inE(px - cx, py - cy, rx - 2, Math.max(0, ry - 2)); };
    if (ry > 6) {
      if (top) {   /* bubble holes: a dark pit with a light lip below it */
        for (var h = 0; h < F.holes && h < BLOB.length; h++) {
          var hx = cx + idiv(BLOB[h][0] * rx, 64), hy = cy + idiv(BLOB[h][1] * ry, 64);
          if (clip(hx, hy) && clip(hx, hy + 1)) { put(b, hx, hy, F.pit); put(b, hx, hy + 1, F.lite); }
        }
      } else {     /* browning patches and paler spots */
        BLOB.forEach(function (q, n) {
          var bx = cx + idiv(q[0] * rx, 64), by = cy + idiv(q[1] * ry, 64);
          blob(b, bx, by, q[2], n % 3 === 2 ? F.pale : F.brown, clip);
        });
      }
      flecks(b, cx, cy, rx, ry, o.herb, !top, clip, o.herb === 'tot' ? 11 : 16);
      dents(b, (o.dents || []).map(function (d) { return [cx + (d[0] | 0), cy + (d[1] | 0)]; }), top ? C.w5 : F.pit, top ? C.w4 : F.pitD, top ? C.s6 : F.lite, clip);
    }
    if (crisp) lace.forEach(function (q) { put(b, q[0], q[1], F.lace); });
    if (o.flash) mOutline(b, M, C.s6);
    return { buf: b, cx: cx, cy: cy, M: M };
  }
  /* jeon on the stage. o = { cx, cy, rx, ry, face, band, herb, dents (food-box px), flash, thick, cuts: [{ deg, x, y }], sep,
     cutFlash }. Cut points x, y are stage px (default: the jeon centre). The composite is memoised by its inputs. */
  function jeon(b, o) {
    var rx = o.rx || GEO.food.rx[2], ry = o.ry || GEO.food.ry[2], cx = o.cx == null ? GEO.food.cx : o.cx | 0, cy = o.cy == null ? GEO.food.cy : o.cy | 0;
    var ds = (o.dents || []).slice(0, 9).map(function (d) { return [(d[0] | 0) - 32, (d[1] | 0) - 24]; });
    if (ry !== GEO.food.ry[2]) ds = ds.map(function (d) { return [d[0], idiv(d[1] * ry, GEO.food.ry[2])]; });
    var cuts = (o.cuts || []).map(function (c) { return [Math.round(+c.deg || 0), c.x == null ? 0 : (c.x | 0) - cx, c.y == null ? 0 : (c.y | 0) - cy]; });
    var face = o.face === 'top' || o.face === 'raw' ? o.face : 'bottom', band = clampI(o.band, 0, 2), herb = o.herb === 'tot' ? 'tot' : 'parae', th = o.thick == null ? 2 : o.thick | 0;
    var sep = o.sep == null ? 1 : o.sep | 0, key = ['J', rx, ry, face, band, herb, o.flash ? 1 : 0, th, JSON.stringify(ds), JSON.stringify(cuts), sep, o.cutFlash ? 1 : 0].join('|');
    var R = remember(key, function () {
      var J = jeonBuf({ rx: rx, ry: ry, face: face, band: band, herb: herb, dents: ds, flash: o.flash, thick: th });
      return cuts.length ? cutBuf(J, cuts, sep, o.cutFlash) : { buf: J.buf, ox: -J.cx, oy: -J.cy };
    });
    blit(b, R.buf, cx + R.ox, cy + R.oy);
    return R;
  }
  /* split a jeon buffer by straight cuts: every piece moves `sep` px away from each cut (normal snapped to 8 directions),
     cut faces darken, flash lights the opened gap for one frame. cuts = [[deg, dx, dy]] (cut point from the jeon centre).
     Integer math only. Returns { buf, ox, oy } with (ox, oy) = buffer origin relative to the jeon centre. */
  function cutBuf(J, cuts, sep, flash) {
    var src = J.buf, P = 4, out = blank(src.w + 2 * P, src.h + 2 * P), W2 = out.w, occ = new Uint8Array(out.w * out.h), i, j;
    var L = cuts.map(function (c) {
      var s = isin(c[0]), co = icos(c[0]);
      var nx = -s > 1567 ? 1 : -s < -1567 ? -1 : 0, ny = co > 1567 ? 1 : co < -1567 ? -1 : 0;
      return { s: s, c: co, x: J.cx + c[1], y: J.cy + c[2], nx: nx * sep, ny: ny * sep };
    });
    for (j = 0; j < src.h; j++) for (i = 0; i < src.w; i++) {
      var si = (j * src.w + i) << 2; if (!src.d[si + 3]) continue;
      var mx = 0, my = 0;
      for (var k = 0; k < L.length; k++) {
        var X = 2 * (i - L[k].x) + 1, Y = 2 * (j - L[k].y) + 1;
        if (X * L[k].s - Y * L[k].c < 0) { mx += L[k].nx; my += L[k].ny; } else { mx -= L[k].nx; my -= L[k].ny; }
      }
      var tx = i + mx + P, ty = j + my + P, ti = (ty * W2 + tx) << 2;
      out.d[ti] = src.d[si]; out.d[ti + 1] = src.d[si + 1]; out.d[ti + 2] = src.d[si + 2]; out.d[ti + 3] = 255; occ[ty * W2 + tx] = 1;
    }
    var inSil = function (x, y) { x -= P; y -= P; return x >= 0 && y >= 0 && x < src.w && y < src.h && src.d[((y * src.w + x) << 2) + 3] > 0; };
    var faces = [], N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (j = 0; j < out.h; j++) for (i = 0; i < W2; i++) {
      if (!occ[j * W2 + i]) continue;
      for (var q = 0; q < 4; q++) { var gx = i + N4[q][0], gy = j + N4[q][1]; if (gx >= 0 && gy >= 0 && gx < W2 && gy < out.h && !occ[gy * W2 + gx] && inSil(gx, gy)) { faces.push([i, j, gx, gy]); break; } }
    }
    faces.forEach(function (f) { put(out, f[0], f[1], C.r1); });
    if (flash) faces.forEach(function (f) { put(out, f[2], f[3], C.s6); });
    return { buf: out, ox: -J.cx - P, oy: -J.cy - P };
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
  var PLATE = [   /* paper, sky, pink: [light, mid, dark, outline] */
    [C.s6, C.s5, C.s4, C.s3],
    [C.b4, C.b3, C.b2, C.b1],
    [C.p4, C.p3, C.p2, C.p1]];
  /* plate seen from slightly above. o = { cx, cy, rx, ry } (defaults: dish geometry inside a dish buffer) */
  function plate(b, color, o) {
    o = o || {};
    var P = PLATE[clampI(color, 0, 2)], cx = o.cx == null ? GEO.dish.cx : o.cx, cy = o.cy == null ? GEO.dish.cy : o.cy;
    var rx = o.rx || 42, ry = o.ry || 26, th = o.th == null ? 3 : o.th, rim = o.rim || Math.max(3, rx >> 3);
    var M = mk(cx - rx - 2, cy - ry - 2, 2 * rx + 5, 2 * ry + th + 5), x, y;
    for (var k = 0; k <= th; k++) mEll(M, cx, cy + k, rx, ry, 1);
    /* shadow on the counter */
    for (y = -ry; y <= ry + th + 3; y++) for (x = -rx; x <= rx + 4; x++) { var px = cx + x, py = cy + y; if (!mhas(M, px, py) && (inE(x - 3, y - th - 3, rx, ry)) && !o.noShadow) put(b, px, py, (bay(px, py) & 1) ? C.w2 : C.w3); }
    mOutline(b, M, P[3]);
    var wrx = rx - rim, wry = ry - Math.max(2, (rim * 2) / 3 | 0);
    mEach(M, function (px2, py2) {
      var dx = px2 - cx, dy = py2 - cy, col;
      if (!inE(dx, dy, rx, ry)) { col = mhas(M, px2, py2 + 1) ? P[2] : P[3]; put(b, px2, py2, col); return; }
      if (!inE(dx, dy, wrx, wry)) {          /* rim */
        col = P[0];
        if (!inE(dx + 1, dy + 1, rx, ry)) col = P[1];
        if (!inE(dx - 1, dy - 1, rx, ry) && dy < 0) col = C.s6;
        if (inE(dx + 1, dy + 1, wrx, wry) && dy > 0) col = P[1];                 /* inner lip, near side */
        if (inE(dx - 1, dy - 1, wrx + 1, wry + 1) && !inE(dx - 1, dy - 1, wrx, wry) && dy < 0) col = P[2];   /* lip line far side */
        put(b, px2, py2, col); return;
      }
      /* well: shaded on its upper-left wall (light from the upper left), flat bottom */
      col = P[0];
      if (!inE(dx - 2, dy - 2, wrx, wry)) col = P[1];
      if (!inE(dx - 1, dy - 1, wrx, wry)) col = P[2];
      put(b, px2, py2, col);
    });
    return M;
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
  /* the finished jeon as the player's hands left it. b = any buffer (centred in it unless o.x / o.y given). o = { herb, x, y } */
  function dish(b, look, o) {
    o = o || {};
    var L = safeLook(look), D = GEO.dish, ox = o.x == null ? (b.w - D.w) >> 1 : o.x | 0, oy = o.y == null ? (b.h - D.h) >> 1 : o.y | 0;
    var herb = o.herb === 'tot' ? 'tot' : 'parae';
    blit(b, remember('dish|' + herb + '|' + JSON.stringify(L), function () { return dish0(blank(D.w, D.h), L, herb); }), ox, oy);
    return b;
  }
  function dish0(b, L, herb) {
    var D = GEO.dish, cx = D.cx, cy = D.cy;
    plate(b, L.plate, { cx: cx, cy: cy, rx: 44, ry: 28, th: 3 });
    var cuts = GEO.cross.map(function (g, i) { return { deg: g + L.cuts[i], x: cx + (i === 1 ? L.offs[i] : 0), y: cy - 1 + (i === 0 ? L.offs[i] : 0) }; });
    jeon(b, { cx: cx, cy: cy - 1, rx: GEO.food.rx[2], ry: GEO.food.ry[2], face: 'bottom', band: L.band, herb: herb, dents: L.dents, cuts: cuts, sep: 1 });
    return b;
  }
  /* small dish for the counter (display only): plate + mini jeon with the cross, band color and herb */
  function dishSmall(b, look, o) {
    o = o || {};
    var L = safeLook(look), sm = GEO.small, ox = o.x == null ? (b.w - sm.w) >> 1 : o.x | 0, oy = o.y == null ? (b.h - sm.h) >> 1 : o.y | 0;
    var herb = o.herb === 'tot' ? 'tot' : 'parae';
    blit(b, remember('small|' + herb + '|' + JSON.stringify(L), function () { return dishSmall0(blank(sm.w, sm.h), L, herb); }), ox, oy);
    return b;
  }
  function dishSmall0(b, L, herb) {
    var cx = GEO.small.w >> 1, cy = 10, o = { herb: herb };
    plate(b, L.plate, { cx: cx, cy: cy, rx: 17, ry: 9, th: 2, rim: 3 });
    var J = jeonBuf({ rx: 11, ry: 6, face: 'bottom', band: L.band, herb: o.herb === 'tot' ? 'tot' : 'parae', dents: [], thick: 1 });
    flecks(J.buf, J.cx, J.cy, 11, 6, o.herb === 'tot' ? 'tot' : 'parae', true, function (x, y) { return inE(x - J.cx, y - J.cy, 9, 4); }, 6);
    /* at this size the pieces stay together: each cut is a 1-px scored line (no plate-coloured gap, so no white cross) */
    GEO.cross.forEach(function (g, i) {
      var d = g + L.cuts[i], c = icos(d), s2 = isin(d);
      for (var u = -12; u <= 12; u++) {
        var px = J.cx + iround(u * c, 4096), py = J.cy + iround(u * s2, 4096);
        if (inE(px - J.cx, py - J.cy, 10, 5)) put(J.buf, px, py, C.r1);
      }
    });
    blit(b, J.buf, cx - J.cx, cy - 1 - J.cy);
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
    crumb: [C.a2, C.a1, C.r1], drop: [C.s6, C.w4, C.w3], steam: [C.s6, C.s5, C.s4],
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
  var BUBBLES = [[34, 96, 0], [109, 80, 2], [86, 112, 1]];
  function flipScene(b, o) {
    o = o || {};
    var f = o.f | 0, flipped = !!o.flipped || (o.res != null), band = clampI(o.res != null ? o.res : o.band, 0, 2);
    var ph = o.still ? 0 : (f >> 1) & 1;
    copy(b, o.heat ? stepBase('pan-heat-' + ph, function (c) { panHeat(c, PAN_STEP, ph * 2); }) : stepBase('pan'));
    if (o.heat && (band < 2 || !flipped)) bubbles(b, BUBBLES, f, o.still);
    var cx = GEO.food.cx, cy = GEO.food.cy + (o.bump ? -1 : 0), rx = GEO.food.rx[2], ry = GEO.food.ry[2];
    var arc = o.arc;
    if (arc) {
      var af = clampI(arc.f, 0, 3), lift = +arc.lift <= 3 ? LIFT[clampI(arc.lift, 1, 3)] : clampI(arc.lift, 0, 48);
      var RY = [idiv(ry * 5, 8), 3, idiv(ry * 5, 8), ry][af], farRim = GEO.pan.cy - GEO.pan.ry;
      var LF = Math.min([idiv(lift, 2), lift, idiv(lift * 5, 8), 0][af], Math.max(0, cy - farRim - RY - 6));   /* stays clear of the far rim */
      var face = af < 2 ? 'top' : 'bottom';
      /* shadow on the floor, smaller when high */
      var srx = rx - idiv(LF, 3), sry = ry - idiv(LF, 4);
      for (var y = -sry; y <= sry; y++) for (var x = -srx; x <= srx; x++) if (inE(x, y, srx, sry) && ((x + y) & 1) === 0) put(b, cx + x, cy + 2 + y, C.s0);
      if (af === 1) {   /* edge-on, turning: a narrow tilted disc, the raw side on top, one row of the cooked face under it */
        var E = mk(cx - rx - 2, cy - LF - 7, 2 * rx + 5, 15), F1 = FACE.bottom[band], yc;
        for (x = -rx; x <= rx; x++) {
          yc = cy - LF + iround(-2 * x, rx);   /* tilted: the left edge a little lower (it is turning over toward the viewer) */
          for (y = -RY; y <= RY; y++) if (inE(x, y, rx, RY)) mset(E, cx + x, yc + y, y < 1 ? 1 : y === 1 ? 2 : 3);
        }
        mOutline(b, E, F1.line);
        mEach(E, function (px, py, v) {
          var up = !mhas(E, px, py - 1);
          put(b, px, py, v === 1 ? (up ? C.s6 : C.w6) : v === 2 ? F1.edge : F1.body);
        });
      } else {
        var sq = af === 3 ? [rx + 2, ry - 1] : [rx, RY];
        jeon(b, { cx: cx, cy: cy - LF + (af === 3 ? 1 : 0), rx: sq[0], ry: sq[1], face: face, band: band, herb: o.herb, dents: o.dents, thick: af === 3 ? 2 : 1, flash: o.flash });
      }
    } else {
      jeon(b, { cx: cx, cy: cy, rx: rx, ry: ry, face: flipped ? 'bottom' : o.heat ? 'top' : 'raw', band: band, herb: o.herb, dents: o.dents, flash: o.flash });
    }
    var sp = o.spatula === undefined ? GEO.rest.spatula : o.spatula;   /* undefined = resting in the pan, null = hidden */
    if (sp) spatula(b, sp[0], sp[1]);
    if (o.arrow === 0 || o.arrow === 1) arrow(b, (sp ? sp[0] : GEO.rest.spatula[0]) + 1, (sp ? sp[1] : GEO.rest.spatula[1]) - 18, o.arrow);
    frame(b);
    return b;
  }
  var LIFT = [0, 16, 26, 36];   /* the sim's flip lift level 1..3 -> arc height in art px */

  /* a slice line: { x, y, deg, len, cells, cut, cutDeg, flash } in art px, or the sim's { ax, ay, bx, by (logical),
     bins, cut, ang, off } (off is already inside A and B). The guide angle comes from A -> B by integer search. */
  function lineOf(L) {
    if (!L || typeof L.ax !== 'number') return L;
    var dx = (L.bx | 0) - (L.ax | 0), dy = (L.by | 0) - (L.ay | 0), d0 = degOf(dx, dy), deg = d0 % 180;
    var len = iround(dx * icos(d0) + dy * isin(d0), 4096) >> 1;
    return { x: ((L.ax | 0) + (L.bx | 0)) >> 2, y: ((L.ay | 0) + (L.by | 0)) >> 2, deg: deg, len: len || 64, cells: L.bins, cut: !!L.cut, cutDeg: deg + clampI(L.ang, -30, 30), flash: L.flash };
  }
  function sliceScene(b, o) {
    o = o || {};
    var f = o.f | 0, band = clampI(o.band, 0, 2), G = GEO.board;
    copy(b, cached('board', function (c) { bgStep(c); board(c, G.x, G.y, G.w, G.h, false); }));
    var lines = (o.lines || []).map(lineOf), cuts = [];
    lines.forEach(function (L) { if (L && L.cut) cuts.push({ deg: L.cutDeg == null ? L.deg : L.cutDeg, x: L.x, y: L.y }); });
    var anyFlash = lines.some(function (L, i) { return L && L.cut && (L.flash || o.flash === i); });
    jeon(b, { cx: GEO.food.cx, cy: GEO.food.cy, face: 'bottom', band: band, herb: o.herb, dents: o.dents, cuts: cuts, sep: 1, cutFlash: anyFlash });
    /* kerfs: painted cells of a line not yet cut (the knife marks follow the hand along the guide) */
    lines.forEach(function (L) {
      if (!L || L.cut || !L.cells) return;
      var c = icos(L.deg), s2 = isin(L.deg), n = L.cells.length || 40, len = L.len || 64;
      for (var u = -(len >> 1); u <= (len >> 1); u++) {
        var cell = Math.min(n - 1, idiv((u + (len >> 1)) * n, len + 1));
        if (!L.cells[cell]) continue;
        var px = L.x + iround(u * c, 4096), py = L.y + iround(u * s2, 4096), g = get(b, px, py);
        if (g === C.w6 || g === C.w5 || g === C.s6) put(b, px, py, C.w5); else if (g) { put(b, px, py, C.r1); shadeAt(b, px + 1, py + 1); }
      }
    });
    (o.trail || []).forEach(function (p, i, a) { if (i) { /* knife trail on the food only */
      var q = a[i - 1]; lineIf(b, q[0] | 0, q[1] | 0, p[0] | 0, p[1] | 0, function (g) { return g === FACE.bottom[band].body || g === FACE.bottom[band].pale || g === FACE.bottom[band].lite; }, C.r1); } });
    var gi = o.guide != null ? o.guide | 0 : o.cur != null ? o.cur | 0 : -1, GL = lines[gi];
    if (GL && !GL.cut) guide(b, GL.x, GL.y, GL.deg, GL.len || 64, f, GL.cells);
    var kn = o.knife !== undefined ? o.knife : o.hand ? [(o.hand.x | 0) >> 1, (o.hand.y | 0) >> 1, GL ? GL.deg : 0] : GEO.rest.knife;
    if (kn) knife(b, kn[0] | 0, kn[1] | 0, kn[2] | 0);
    frame(b);
    return b;
  }
  function lineIf(b, x0, y0, x1, y1, ok, c) {
    var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1, e = dx + dy;
    for (var n = 0; n < 512; n++) { if (ok(get(b, x0, y0))) put(b, x0, y0, c); if (x0 === x1 && y0 === y1) break; var e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }
  function revealScene(b, o) {
    o = o || {};
    copy(b, cached('reveal', function (c) { bgStep(c); }));
    var f = clampI(o.f == null ? 5 : o.f, 0, 5), up = (5 - f) * 2;
    var d = blank(GEO.dish.w, GEO.dish.h);
    dish(d, o.look, { herb: o.herb });
    blit(b, d, GEO.food.cx - GEO.dish.cx, GEO.food.cy - GEO.dish.cy + up);
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
    particles: particles, safeLook: safeLook, shake: shake,
    toFood: toFood, fromFood: fromFood, inFood: inFood, pullIn: pullIn,
    PAN_STEP: PAN_STEP, PAN_COUNTER: PAN_COUNTER, BUBBLES: BUBBLES
  };
  return API;
})();
if (typeof module !== 'undefined' && module.exports) module.exports = COOK_ART;
