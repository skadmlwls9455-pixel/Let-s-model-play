/* js/cook-dishes.js - pixel art for the two dishes of round 6 (11-18): jumeokbap (a grilled rice cake) and kkochi (a
 * fruit skewer). Global COOK_ART.dishes (attached to js/cook-art.js's COOK_ART; loaded right after it). Plain script, no
 * modules, file:// safe, no DOM: node can paint and hash every picture. Comments stay ASCII. No text at all.
 *
 * RULES   the same as js/cook-art.js: integers only, no trig, no random source, no clock (texture noise comes from the
 *         integer hash ih below); alpha 0 / 255 (COOK_ART.put only paints Apollo + FOOD colours); props (pan, board,
 *         plate, skewer) Apollo only, food Apollo + FOOD (F). Same inputs -> same bytes. Static layers are cached.
 * API     COOK_ART.dishes = { jumeokbap: P, kkochi: P }, each P = { tapScene, flipScene | sliceScene, revealScene, base,
 *         carry, dish, dishSmall } with the option shapes of the jeon painters (js/cook.js paintDish passes them):
 *   tapScene(b, o)     o = { shape 0..2, dents (food box px), marks (sim marks { x, y, n } logical), per, flash, squash 0..2,
 *                      dust, f, look (the run's look so far), hit: null | { m, fr } (the mark hit last, 12 fps frames ago) }
 *   flipScene(b, o)    jumeokbap only. o = { heat, band, res, arc: null | { f 0..3, lift }, dents, spatula, arrow, bump,
 *                      flash, still, f, seed, fh, fbc, fl }
 *   sliceScene(b, o)   kkochi only. o = { lines (sim lines), cur, flash (index of the line cut this frame), pop (that cut's
 *                      first frame: the pieces part 2 px instead of 1), hand (logical), f, still }
 *   revealScene(b, o)  o = { look, f, t (12 fps frames since the reveal; null = the rest frame), seed, still }
 *   base(b, o)         a still station for the slides, o = { station, pan, heat, f, still, look } (the dish's own board;
 *                      other stations are COOK_ART.base)
 *   carry(b, o)        o = { what, x, y (food centre in b), lift = 2, shadow = true, look, dents, band }: jumeokbap 'pan'
 *                      (pan + the patted rice) and 'cake' (crust up), kkochi 'skewer' (the finished skewer): exactly the
 *                      pixels of the still scenes, drawn at y - lift with a 50 % checker shadow 3 px right and down
 *   dish(b, look, o) / dishSmall(b, look, o)   the plate picture for COOK.drawDish (GEO.dish 96 x 66 / GEO.small 40 x 26)
 * PLACES  food centre (72, 86) as in the jeon. Reveal plate = GEO.rev2 (x 33..111). jumeokbap: rice radii from js/cook.js
 *         TUNE_R (lump 18 x 13, half 21 x 15, round 24 x 17). kkochi: the bar 48 x 18 in x 48..95, y 77..94, cut at
 *         x 64 and x 80 (+ the guide offsets of the look); the skewer at y 100 on the board (x 36..107).
 */
(function () {
  'use strict';
  if (typeof COOK_ART === 'undefined' || !COOK_ART) return;
  var A = COOK_ART, C = A.PAL, F = A.F, G = A.GEO, W = A.W, H = A.H;
  var put = A.put, get = A.get, blit = A.blit, blank = A.blank, frame = A.frame;
  var CX = 72, CY = 86;

  /* ---------- small integer helpers ---------- */
  function ih(a, b, c) {   /* integer hash of three ints -> uint32 */
    var h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x7f4a7c15, 0xc2b2ae35) ^ Math.imul((c | 0) + 0x165667b1, 0x27d4eb2f);
    h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
    return h >>> 0;
  }
  function inE(dx, dy, rx, ry) { return rx > 0 && ry > 0 && dx * dx * ry * ry + dy * dy * rx * rx <= rx * rx * ry * ry + ((rx * ry) >> 1); }
  function clampI(v, a, b) { v = Math.round(+v || 0); return v < a ? a : v > b ? b : v; }
  function seedOf(dl) { var h = 0x2f1d; (dl || []).forEach(function (d) { h = ih(h, (d[0] | 0) * 64 + (d[1] | 0), 0x5eed); }); return (h & 0x7fffffff) || 7; }
  /* one step darker for the grounds the food sits on (contact shadows); anything else stays */
  var DARK = {};
  [[C.w6, C.w5], [C.w5, C.w4], [C.w4, C.w3], [C.w3, C.w2], [C.w2, C.w1], [C.s6, C.s5], [C.s5, C.s4], [C.s4, C.s3], [C.s3, C.s2],
    [C.s2, C.s1], [C.s1, C.s0], [C.a3, C.a2], [C.a2, C.a1], [C.b4, C.b3], [C.b3, C.b2], [C.p4, C.p3], [C.p3, C.p2]].forEach(function (p) { DARK[p[0]] = p[1]; });
  function shade(b, x, y) { var g = get(b, x, y); if (g && DARK[g]) put(b, x, y, DARK[g]); }
  /* a mask of painted pixels: { x0, y0, w, h, m } */
  function mk(x0, y0, w, h) { return { x0: x0, y0: y0, w: w, h: h, m: new Uint8Array(w * h) }; }
  function mget(M, x, y) { x -= M.x0; y -= M.y0; return x >= 0 && y >= 0 && x < M.w && y < M.h ? M.m[y * M.w + x] : 0; }
  function mset(M, x, y, v) { x -= M.x0; y -= M.y0; if (x >= 0 && y >= 0 && x < M.w && y < M.h) M.m[y * M.w + x] = v; }
  function mEach(M, fn) { for (var j = 0; j < M.h; j++) for (var i = 0; i < M.w; i++) if (M.m[j * M.w + i]) fn(M.x0 + i, M.y0 + j, M.m[j * M.w + i]); }
  function edge(M, x, y) { return !mget(M, x - 1, y) || !mget(M, x + 1, y) || !mget(M, x, y - 1) || !mget(M, x, y + 1); }
  /* a painted sprite (buffer) -> its shadow: 50 % checker, dx right and dy down, only where the sprite is not */
  function dropShadow(b, s, bx, by, d) {
    for (var j = 0; j < s.h; j++) for (var i = 0; i < s.w; i++) {
      if (!s.d[((j * s.w + i) << 2) + 3]) continue;
      var qi = i + d, qj = j + d, X = bx + qi, Y = by + qj;
      if (qi < s.w && qj < s.h && s.d[((qj * s.w + qi) << 2) + 3]) continue;
      if (((X + Y) & 1) === 0) shade(b, X, Y);
    }
  }
  function lru(n) { return { n: n, m: new Map() }; }
  function lruGet(c, k, make) {
    if (c.m.has(k)) { var v = c.m.get(k); c.m.delete(k); c.m.set(k, v); return v; }
    var nv = make(); c.m.set(k, nv); if (c.m.size > c.n) c.m.delete(c.m.keys().next().value); return nv;
  }
  var cache = {};
  function cached(key, paint) { if (!cache[key]) { var c = blank(W, H); paint(c); cache[key] = c; } return cache[key]; }
  function copyIn(b, src) { if (b.w === src.w && b.h === src.h) b.d.set(src.d); else { A.clear(b); blit(b, src, 0, 0); } }
  /* station grounds (still, cached): the bare counter, the counter with the step pan, the board without a knife */
  function bgCounter() { return cached('counter', function (c) { A.base(c, { station: 'counter' }); }); }
  function bgPan() { return cached('pan', function (c) { A.base(c, { station: 'counter' }); A.pan(c, A.PAN_STEP); frame(c); }); }
  function bgBoard() { return cached('board', function (c) { A.base(c, { station: 'counter' }); A.board(c, G.board.x, G.board.y, G.board.w, G.board.h, false); frame(c); }); }
  function markList(list, per) { per = per || 3; return (list || []).map(function (m) { return Array.isArray(m) ? m : [(m.x | 0) >> 1, (m.y | 0) >> 1, per - (m.n | 0)]; }); }
  function pt(p) { return Array.isArray(p) ? [p[0] | 0, p[1] | 0] : [(p.x | 0) >> 1, (p.y | 0) >> 1]; }

  /* particles of these dishes: js/cook.js burst() maps its kinds onto these (COOK_ART.particles colours a kind by age) */
  if (A.PART && typeof A.PART === 'object') {
    if (!A.PART.rice) A.PART.rice = [C.s6, C.s5, C.s4];          /* white rice grains */
    if (!A.PART.juice) A.PART.juice = [F.C2, F.C1, F.C0];        /* watermelon juice and bits */
  }

  /* =====================================================================================
   *  JUMEOKBAP: a rice mound patted round in the pan, grilled to a crust, flipped, plated crust up with nori and sesame
   * ===================================================================================== */
  var RICE_RX = [18, 21, 24], RICE_RY = [13, 15, 17], RICE_TH = [5, 3, 2];   /* lump / half / round: radii and height (side rows) */
  var CRUST = [   /* per band: [top, light, shade, side, outline] (soft / golden / crisp) */
    [F.B1, F.J6, F.B2, F.B2, F.J2],
    [F.J4, F.J5, F.J3, F.J3, F.J1],
    [F.J3, F.J4, F.J2, F.J2, F.J1]];
  /* the rice cake, top face and side, centred (cx, cy). o = { rx, ry, th, face 'rice' | 'crust', band, rim (band colour
     showing at the rim while it grills, or null), dents, seed, flash } -> its mask (for steam and shadows) */
  function riceCake(b, cx, cy, o) {
    var rx = o.rx, ry = o.ry, th = o.th | 0, crust = o.face === 'crust', K = CRUST[clampI(o.band, 0, 2)], seed = o.seed | 0;
    var M = mk(cx - rx - 2, cy - ry - 2, 2 * rx + 5, 2 * ry + th + 5), x, y, k;
    for (k = th; k >= 0; k--) for (y = -ry; y <= ry; y++) for (x = -rx; x <= rx; x++) if (inE(x, y, rx, ry)) mset(M, cx + x, cy + y + k, k ? 2 : 1);
    mEach(M, function (px, py, v) {
      var dx = px - cx, dy = py - cy, col;
      if (edge(M, px, py)) { put(b, px, py, o.flash ? F.G0 : crust ? K[4] : o.rim != null ? CRUST[clampI(o.rim, 0, 2)][4] : C.s3); return; }
      if (v === 2) {   /* the side: grilled when the crust is down, rice when it is up */
        put(b, px, py, crust ? K[3] : o.rim != null ? CRUST[clampI(o.rim, 0, 2)][3] : (dx < -(rx >> 1) ? C.s5 : C.s4));
        return;
      }
      if (crust) {
        var hc = ih(dx, dy, seed + 11) % 23;
        col = hc === 0 ? K[2] : hc === 1 && dx + dy < 0 ? K[1] : K[0];
        if (!inE(dx - 1, dy - 1, rx - 1, ry - 1) && dy < 0) col = K[1];                       /* rim facing the lamp */
        if (o.band === 2 && ih(dx, dy, seed + 13) % 17 === 0) col = F.J2;                    /* crisp specks */
        put(b, px, py, col); return;
      }
      col = C.s6;
      if (!inE(dx, dy, rx - 2, ry - 2) && dy > 0) col = C.s5;                                /* the near edge turns down */
      if (o.rim != null && !inE(dx, dy, rx - 1, ry - 1)) col = CRUST[clampI(o.rim, 0, 2)][0];  /* the crust shows at the rim */
      put(b, px, py, col);
    });
    if (!crust) {   /* grains: 2 x 1 strokes on a 3-px grid, seeded, never on the outline */
      for (y = -ry + 1; y <= ry - 1; y++) for (x = -rx + 1; x <= rx - 1; x += 3) {
        var gx = x + ((y * 2) % 3), h = ih(gx, y, seed);
        if (!inE(gx, y, rx - 2, ry - 2) || !inE(gx + 1, y, rx - 2, ry - 2) || h % 3 === 0) continue;
        var gc = (h >>> 4) % 3 === 0 ? C.w6 : C.s5;
        put(b, cx + gx, cy + y, gc); if ((h >>> 8) & 1) put(b, cx + gx + 1, cy + y, gc); else put(b, cx + gx, cy + y + 1, C.s5);
      }
      if (!o.rim) { put(b, cx - (rx >> 1), cy - (ry >> 1), F.G0); put(b, cx - (rx >> 1) + 1, cy - (ry >> 1), F.G0); }   /* a glint */
    }
    (o.dents || []).slice(0, 9).forEach(function (d) {   /* finger dents (food box px, box = centre - [32, 24]): a soft dimple */
      var px = cx - (G.boxW >> 1) + (d[0] | 0), py = cy - (G.boxH >> 1) + (d[1] | 0), ex = px - cx, ey = py - cy;
      if (!inE(ex, ey, rx - 3, ry - 3)) return;
      var dc = crust ? K[2] : C.s4;
      put(b, px - 1, py, dc); put(b, px, py, dc); put(b, px + 1, py, dc); put(b, px, py - 1, crust ? K[0] : C.s5);
      put(b, px - 1, py + 1, crust ? K[3] : C.s3); put(b, px, py + 1, crust ? K[3] : C.s3);
    });
    return M;
  }
  /* edge-on (the flip arc's frame 1): a thin tilted disc, the rice side on top, one row of crust under it */
  function riceEdge(b, cx, cy, rx, band) {
    var K = CRUST[clampI(band, 0, 2)], M = mk(cx - rx - 2, cy - 8, 2 * rx + 5, 17);
    for (var x = -rx; x <= rx; x++) {
      var yc = cy + Math.floor((-2 * x * 2 + rx) / (2 * rx));
      for (var y = -3; y <= 3; y++) if (inE(x, y, rx, 3)) mset(M, cx + x, yc + y, y < 1 ? 1 : y === 1 ? 2 : 3);
    }
    mEach(M, function (px, py, v) {
      if (edge(M, px, py)) { put(b, px, py, K[4]); return; }
      put(b, px, py, v === 1 ? (mget(M, px, py - 1) ? C.s6 : C.s5) : v === 2 ? K[1] : K[0]);
    });
    return M;
  }
  /* oil around the cake while the heat is on: a dark film ring with bubbles that swell and pop (the pan's own bubbles) */
  var DIRS = [[16, 0], [-8, -14], [8, 14], [-16, 0], [14, -8], [-14, 8], [0, 16], [-8, 14], [8, -14], [14, 8], [-14, -8], [0, -16]];   /* x 16 */
  function oilRing(b, cx, cy, rx, ry, band, f, still) {
    var x, y, n = [5, 8, 12][clampI(band, 0, 2)], list = [];
    for (y = -ry - 2; y <= ry + 2; y++) for (x = -rx - 3; x <= rx + 3; x++) {
      if (inE(x, y, rx, ry) || !inE(x, y, rx + 2, ry + 2)) continue;
      put(b, cx + x, cy + y + 1, (x + y) & 1 ? F.O0 : F.O1);
    }
    for (var i = 0; i < n; i++) {   /* bubbles on the oil ring, fixed directions, phases staggered */
      var d = DIRS[i];
      list.push([cx + Math.floor((rx + 1) * d[0] / 16), cy + 1 + Math.floor((ry + 1) * d[1] / 16), (i * 3) & 3]);
    }
    A.bubbles(b, list, f, still);
  }

  var JB = {};
  /* tap step: the step pan on the counter wood, the rice mound patted lump -> half -> round (hits 3 and 6) */
  JB.tapScene = function (b, o) {
    o = o || {};
    copyIn(b, bgPan());
    (o.dust || []).forEach(function (d) { var q = pt(d); put(b, q[0], q[1], C.w6); put(b, q[0] + 1, q[1] + 1, C.w2); });
    var sh = clampI(o.shape == null ? 0 : o.shape, 0, 2), rx = RICE_RX[sh], ry = RICE_RY[sh], th = RICE_TH[sh], sq = o.squash | 0;
    if (sq === 1) { rx += 2; ry -= 1; } else if (sq === 2) { rx -= 1; ry += 1; }
    var cy = CY - (sq === 2 ? 1 : 0) + (sq === 1 ? 1 : 0);
    riceCake(b, CX, cy - th + 2, { rx: rx, ry: ry, th: th, face: 'rice', dents: o.dents, seed: seedOf(o.dents) ^ 0x51, flash: o.flash });
    A.marks(b, markList(o.marks, o.per), o.f | 0);
    frame(b);
    return b;
  };
  var LIFT = [0, 16, 26, 36];
  /* flip step on the stove: the round rice cake, heat on -> the crust grows at the rim by band; an upward swipe flips it */
  JB.flipScene = function (b, o) {
    o = o || {};
    var f = o.f | 0, still = !!o.still, heat = !!o.heat, flipped = o.res != null, band = clampI(flipped ? o.res : o.band, 0, 2), arc = o.arc;
    var dl = (o.dents || []).slice(0, 9), seed = seedOf(dl) ^ 0x51, rx = RICE_RX[2], ry = RICE_RY[2], fx = o.seed == null ? seed : o.seed | 0;
    A.base(b, { station: 'stove', pan: true, heat: heat, f: f, still: still });
    var food = null, M = null, oy = o.bump ? -1 : 0;
    A.clearSteam();
    if (arc) {
      var af = clampI(arc.f, 0, 3), lift = +arc.lift <= 3 ? LIFT[clampI(arc.lift, 1, 3)] : clampI(arc.lift, 0, 48);
      var RY = [Math.floor(ry * 5 / 8), 3, Math.floor(ry * 5 / 8), ry][af], farRim = G.pan.cy - G.pan.ry;
      var LF = Math.min([lift >> 1, lift, Math.floor(lift * 5 / 8), 0][af], Math.max(0, CY - farRim - RY - 6));
      if (heat) oilRing(b, CX, CY, rx, ry, band, f, still);
      if (af < 3) for (var y = -9; y <= 9; y++) for (var x = -14; x <= 14; x++) if (inE(x, y, 14, 9) && ((x + y) & 1) === 0) shade(b, CX + 4 + x, CY + 4 + y);
      if (af === 1) M = riceEdge(b, CX, CY - LF, rx, band);
      else if (af === 3) M = riceCake(b, CX, CY + 1, { rx: rx + 2, ry: ry - 1, th: 2, face: 'crust', band: band, dents: dl, seed: seed });
      else M = riceCake(b, CX, CY - LF, { rx: rx, ry: RY, th: 1, face: af === 0 ? 'rice' : 'crust', band: band, rim: af === 0 && heat ? band : null, dents: dl, seed: seed });
    } else {
      if (heat) oilRing(b, CX, CY + oy, rx, ry, flipped ? 2 : band, f, still);
      M = riceCake(b, CX, CY + oy, { rx: rx, ry: ry, th: 2, face: flipped ? 'crust' : 'rice', band: band, rim: !flipped && heat ? band : null, dents: dl, seed: seed, flash: o.flash });
      if (!still && flipped) { var tw = (f + 17) % 48; if (tw <= 3) A.twinkle(b, tw, CX - 9, CY - 7 + oy, 2); }
    }
    food = function (px, py) { return M && mget(M, px, py) ? 1 : 0; };
    var sp = o.spatula === undefined ? G.rest.spatula : o.spatula;
    if (sp) A.spatula(b, sp[0], sp[1]);
    if (heat && !arc) {
      if (!still) A.fxSteam(o.fh == null ? f : o.fh | 0, o.fbc == null ? 1e6 : o.fbc | 0, flipped ? 2 : band, fx, CX, CY, rx, ry, { onFood: 1 });
      A.steamPass(b, food, true);
    }
    if (o.arrow === 0 || o.arrow === 1) A.arrow(b, G.flipArrow[0], G.flipArrow[1], o.arrow);
    frame(b);
    return b;
  };
  /* the plated cake: crust up, a nori band across the middle, five sesame seeds */
  var SESAME = [[-12, -6], [-6, 6], [9, -8], [13, 4], [-15, 3]];
  function plated(b, cx, cy, L, seed, land) {
    var rx = RICE_RX[2] + (land ? 2 : 0), ry = RICE_RY[2] - (land ? 1 : 0);
    var M = riceCake(b, cx, cy, { rx: rx, ry: ry, th: 2, face: 'crust', band: L.band == null ? 1 : L.band, dents: L.dents, seed: seed });
    nori(b, M, cx, 4);
    SESAME.forEach(function (s) { var x = cx + s[0], y = cy + s[1]; if (mget(M, x, y) && mget(M, x + 1, y)) { put(b, x, y, C.s6); put(b, x + 1, y, C.s5); } });
    return M;
  }
  function nori(b, M, cx, half) {   /* a sheet of nori, 2 x half px wide, wrapped over the cake (its outline stays) */
    mEach(M, function (px, py) {
      var dx = px - cx; if (dx < -half || dx >= half) return;
      if (!mget(M, px, py - 1)) { put(b, px, py, F.T0); return; }
      put(b, px, py, dx === -half ? F.T1 : (ih(dx, py, 77) % 9 === 0 ? F.T1 : F.T0));
    });
  }
  JB.revealScene = function (b, o) {
    o = o || {};
    var R = G.rev2, t = o.t == null ? null : Math.max(0, o.t | 0), L = A.safeLook(o.look), still = !!o.still || t === null;
    var dl = L.dents, seed = seedOf(dl) ^ 0x51, fx = o.seed == null ? seed : o.seed | 0;
    A.base(b, { station: 'plate', look: L });
    if (t !== null && t <= 4) { JB.carry(b, { what: 'cake', x: R.jcx, y: R.jcy, lift: t <= 3 ? 2 : 1, look: L }); return frame(b); }
    var land = t === 5, M = plated(b, R.jcx, R.jcy, L, seed, land);
    if (land) return frame(b);
    A.clearSteam();
    if (!still) A.fxSteam(t, 1e6, L.band, fx, R.jcx, R.jcy, RICE_RX[2], RICE_RY[2], { n: 3, rmax: 4, ps: [32, 48], sp: 1, life: 32, first: -96, salt: 4400 });
    A.steamPass(b, function (px, py) { return mget(M, px, py) ? 1 : 0; });
    if (!still) { A.twinkle(b, (t + 30) % 48, R.jcx - 12, R.jcy - 9, 3); A.twinkle(b, (t + 7) % 48, R.soy[0] - 3, R.soy[1] - 1, 2); }
    return frame(b);
  };
  JB.base = function (b, o) { return A.base(b, o); };
  var CARRY = lru(6);
  JB.carry = function (b, o) {
    o = o || {};
    var L = o.look ? A.safeLook(o.look) : null, dl = (o.dents || (L ? L.dents : []) || []).slice(0, 9);
    var band = clampI(o.band != null ? o.band : L ? L.band : 1, 0, 2), what = o.what === 'pan' ? 'pan' : 'cake';
    var SP = lruGet(CARRY, 'jb|' + what + '|' + band + '|' + JSON.stringify(dl), function () {
      var s = blank(200, 128), ox = 100, oy = 64, seed = seedOf(dl) ^ 0x51;
      if (what === 'pan') {   /* the step pan and the patted rice, as the cold flipScene paints them */
        var P = {}, k; for (k in A.PAN_STEP) P[k] = A.PAN_STEP[k];
        P.cx = ox + A.PAN_STEP.cx - CX; P.cy = oy + A.PAN_STEP.cy - CY;
        A.pan(s, P);
        riceCake(s, ox, oy, { rx: RICE_RX[2], ry: RICE_RY[2], th: 2, face: 'rice', dents: dl, seed: seed });
      } else riceCake(s, ox, oy, { rx: RICE_RX[2], ry: RICE_RY[2], th: 2, face: 'crust', band: band, dents: [], seed: seed });
      return { buf: s, ox: ox, oy: oy };
    });
    return drawCarry(b, SP, o);
  };
  function drawCarry(b, SP, o) {
    var lift = o.lift == null ? 2 : o.lift | 0, bx = (o.x == null ? CX : o.x | 0) - SP.ox, by = (o.y == null ? CY : o.y | 0) - lift - SP.oy;
    if (o.shadow !== false) dropShadow(b, SP.buf, bx, by, 3);
    blit(b, SP.buf, bx, by);
    return b;
  }
  JB.dish = function (b, look, o) {
    var L = A.safeLook(look), cx = b.w >> 1, cy = (b.h >> 1) - 2;
    A.plate(b, L.plate, { cx: cx, cy: cy + 2, rx: Math.min(44, (b.w >> 1) - 4), ry: Math.min(27, (b.h >> 1) - 6), th: 3, rim: 5 });
    plated(b, cx, cy, L, seedOf(L.dents) ^ 0x51, false);
    return b;
  };
  JB.dishSmall = function (b, look, o) {
    var L = A.safeLook(look), cx = b.w >> 1, cy = (b.h >> 1) - 2, K = CRUST[clampI(L.band, 0, 2)];
    A.plate(b, L.plate, { cx: cx, cy: cy + 1, rx: (b.w >> 1) - 2, ry: (b.h >> 1) - 3, th: 2, rim: 3, deco: false, noShadow: true });
    var M = riceCake(b, cx, cy, { rx: 10, ry: 7, th: 1, face: 'crust', band: L.band, dents: [], seed: 5 });
    nori(b, M, cx, 2);
    put(b, cx - 6, cy - 2, K[1]);
    return b;
  };

  /* =====================================================================================
   *  KKOCHI: a watermelon bar cut in three by two straight cuts, the cubes tapped onto a skewer (grape tip, tangerine end)
   * ===================================================================================== */
  var BAR = { x0: 48, x1: 95, y0: 77, y1: 94 };   /* 48 x 18; rows y0..y1-4 flesh, y1-3 the white rind line, y1-2..y1 green rind */
  var SKEW_Y = 100, SKEW_X0 = 36, SKEW_X1 = 107;
  /* the cut x of line i (the guide: 72 -+ 8, plus the look's offset) */
  function cutX(L, i) { return CX + (2 * i - 1) * 8 + (L && L.offs && typeof L.offs[i] === 'number' ? L.offs[i] | 0 : 0); }
  /* a piece of the bar, columns [a, b] of the bar (stage x), drawn moved by dx, dy; cutL / cutR: that side is a cut face */
  function barPiece(b, a, z, dx, dy, cutL, cutR, sq) {
    var x0 = a + dx - (sq ? 1 : 0), x1 = z + dx + (sq ? 1 : 0), y0 = BAR.y0 + dy + (sq ? 1 : 0), y1 = BAR.y1 + dy, x, y;
    for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) {
      var top = y === y0, bot = y === y1, lft = x === x0, rgt = x === x1, r = y1 - y, col;
      if (lft || rgt || top || bot) col = r <= 2 ? C.g1 : F.C0;              /* outline: dark green on the rind, deep red on the flesh */
      else if (r <= 1) col = (x & 3) === 0 ? C.g2 : C.g3;                    /* green rind with darker stripes */
      else if (r === 2) col = C.g4;
      else if (r === 3) col = C.s6;                                          /* the white rind line */
      else {
        col = y <= y0 + 2 ? F.C2 : F.C1;                                     /* flesh, lighter at the top (the lamp) */
        if ((x === x0 + 1 && cutL) || (x === x1 - 1 && cutR)) col = F.C2;   /* a fresh cut face shines */
        var h = ih(x - dx, y - dy, 0x5eed);
        if (y >= y0 + 3 && y <= y1 - 6 && h % 29 === 0 && !(x === x0 + 1 || x === x1 - 1)) { put(b, x, y, C.coal); put(b, x, y + 1, C.coal); continue; }
        if (y >= y0 + 3 && y <= y1 - 6 && h % 29 === 1) { put(b, x, y, C.coal); put(b, x, y - 1, F.C1); continue; }
      }
      put(b, x, y, col);
    }
    if (!sq) { put(b, x0 + 2, y0 + 1, F.G0); put(b, x0 + 3, y0 + 1, F.C2); }   /* a wet glint */
  }
  function barShadow(b, a, z, dx, dy) { for (var y = BAR.y0 + dy + 1; y <= BAR.y1 + dy + 2; y++) for (var x = a + dx + 1; x <= z + dx + 2; x++) if (x > z + dx || y > BAR.y1 + dy) shade(b, x, y); }
  /* the pieces of the bar after the cuts in 'cut' (an array of booleans per line), moved sep px away from each cut */
  function pieces(L, cut) {
    var xs = [BAR.x0], out = [];
    [0, 1].forEach(function (i) { if (cut[i]) xs.push(cutX(L, i)); });
    xs.push(BAR.x1 + 1);
    for (var k = 0; k + 1 < xs.length; k++) out.push({ a: xs[k], z: xs[k + 1] - 1, cutL: k > 0, cutR: k + 2 < xs.length, k: k, n: xs.length - 1 });
    return out;
  }
  function pieceDx(p, sep) { var n = p.n; if (n === 1) return 0; if (n === 2) return p.k === 0 ? -sep : sep; return p.k === 0 ? -sep : p.k === 2 ? sep : 0; }
  /* the skewer on the board: wood 2 px, a pointed tip at the left, a green grape at the tip, a tangerine segment at the end */
  function skewer(b, y, x0, x1) {
    var x;
    for (x = x0; x <= x1; x++) { put(b, x, y - 1, x === x0 ? C.w1 : C.w1); put(b, x, y, x < x0 + 2 ? C.w3 : C.w4); put(b, x, y + 1, C.w3); put(b, x, y + 2, C.w1); }
    put(b, x0 - 1, y, C.w1); put(b, x0 - 1, y + 1, C.w1); put(b, x0 - 2, y + 1, C.w2);
    for (x = x0; x <= x1 + 1; x++) shade(b, x + 1, y + 3);
  }
  function grape(b, cx, cy) {   /* 7 x 7 */
    for (var y = -3; y <= 3; y++) for (var x = -3; x <= 3; x++) {
      if (!inE(x, y, 3, 3)) continue;
      var ed = !inE(x - 1, y, 3, 3) || !inE(x + 1, y, 3, 3) || !inE(x, y - 1, 3, 3) || !inE(x, y + 1, 3, 3);
      put(b, cx + x, cy + y, ed ? F.P0 : x + y < -1 ? F.P3 : F.P2);
    }
    put(b, cx - 1, cy - 1, F.G0); shade(b, cx + 3, cy + 4); shade(b, cx + 2, cy + 4); shade(b, cx + 4, cy + 3);
  }
  var TANG = ['..ooo..', '.oFFEo.', 'oFFFEEo', 'oFEEEDo', 'oEEEDDo', '.oEDDo.', '..ooo..'];
  function tangerine(b, cx, cy) {   /* a 7 x 7 segment, its skin edge darker */
    var K = { o: F.J2, F: F.J5, E: F.J4, D: F.J3 };
    for (var j = 0; j < TANG.length; j++) for (var i = 0; i < TANG[j].length; i++) { var c = TANG[j][i]; if (K[c]) put(b, cx - 3 + i, cy - 3 + j, K[c]); }
    shade(b, cx + 4, cy + 3); shade(b, cx + 3, cy + 4);
  }
  /* the tap scene's pieces: where the slice left them (sep 1), or dropping / on the skewer */
  function cubes(L) { return pieces(L, [true, true]).map(function (p) { return { a: p.a + pieceDx(p, 1), z: p.z + pieceDx(p, 1), cutL: p.cutL, cutR: p.cutR }; }); }
  var KK = {};
  KK.sliceScene = function (b, o) {
    o = o || {};
    var f = o.f | 0, still = o.still != null ? !!o.still : f === 0, lines = o.lines || [], L = { offs: [] }, cut = [false, false], x, y;
    copyIn(b, bgBoard());
    lines.forEach(function (ln, i) { if (i < 2 && ln) { L.offs[i] = (((ln.ax | 0) >> 1) - cutX(null, i)); cut[i] = !!ln.cut; } });
    var flash = o.flash != null && o.flash !== false ? o.flash | 0 : -1, sep = o.pop ? 2 : 1;
    var ps = pieces(L, cut);
    ps.forEach(function (p) { barShadow(b, p.a, p.z, pieceDx(p, sep), 0); });
    ps.forEach(function (p) { barPiece(b, p.a, p.z, pieceDx(p, sep), 0, p.cutL, p.cutR, false); });
    if (flash >= 0 && cut[flash]) {   /* the opened gap flashes */
      var gx = cutX(L, flash);
      for (y = BAR.y0; y <= BAR.y1; y++) for (x = gx - sep; x < gx + sep; x++) put(b, x, y, C.s6);
      put(b, gx - 1, BAR.y0 - 2, F.C1); put(b, gx, BAR.y1 + 2, F.C2); put(b, gx + 1, BAR.y0 - 3, F.C2);
    }
    lines.forEach(function (ln, i) {   /* kerfs: painted cells of a line not cut yet (the knife marks follow the hand) */
      if (!ln || ln.cut || !ln.bins) return;
      var lx = (ln.ax | 0) >> 1, ya = (ln.ay | 0) >> 1, yb = (ln.by | 0) >> 1, n = ln.bins.length || 40;
      for (y = ya; y <= yb; y++) {
        var cell = Math.min(n - 1, Math.floor((y - ya) * n / (yb - ya + 1)));
        if (!ln.bins[cell]) continue;
        var g2 = get(b, lx, y); if (g2 === F.C1 || g2 === F.C2) put(b, lx, y, F.C0); else if (g2 === C.s6 || g2 === C.g3 || g2 === C.g4 || g2 === C.g2) put(b, lx, y, C.g1);
      }
    });
    var gi = o.cur != null ? o.cur | 0 : -1, GL = lines[gi];
    if (GL && !GL.cut) {
      var lx2 = (GL.ax | 0) >> 1, y0 = (GL.ay | 0) >> 1, y1 = (GL.by | 0) >> 1;
      A.guide(b, lx2, (y0 + y1) >> 1, 90, y1 - y0, f, GL.bins);
    }
    var kn = o.hand ? [(o.hand.x | 0) >> 1, (o.hand.y | 0) >> 1, 90] : G.rest.knife;
    if (kn) A.knife(b, kn[0] | 0, kn[1] | 0, kn[2] | 0);
    if (!still) { var tw = (f + 9) % 48; if (tw <= 3) A.twinkle(b, tw, BAR.x0 + 30, BAR.y0 + 2, 2); }
    frame(b);
    return b;
  };
  function onSkewer(b, c, dy, sq) {   /* a cube threaded on the skewer (its centre row on the skewer) */
    barShadow(b, c.a, c.z, 0, dy);
    barPiece(b, c.a, c.z, 0, dy, c.cutL, c.cutR, sq);
  }
  var DROP_DY = SKEW_Y + 1 - ((BAR.y0 + BAR.y1) >> 1);   /* 15: a cube's centre row lands on the skewer */
  KK.tapScene = function (b, o) {
    o = o || {};
    var per = o.per || 3, mk2 = o.marks || [], cs = cubes(A.safeLook(o.look || null)), hit = o.hit || null;
    copyIn(b, bgBoard());
    skewer(b, SKEW_Y, SKEW_X0, SKEW_X1);
    grape(b, SKEW_X0 + 3, SKEW_Y + 1);
    tangerine(b, SKEW_X1 - 4, SKEW_Y + 1);
    var row = [], on = [];
    cs.forEach(function (c, i) {
      var m = mk2[i], n = m ? (Array.isArray(m) ? per - (m[2] | 0) : m.n | 0) : 0, last = hit && hit.m === i, fr = last ? hit.fr | 0 : 99;
      if (n >= per) { if (fr <= 0) row.push([c, Math.floor(DROP_DY / 2), false]); else on.push([c, DROP_DY, fr === 1 && !o.still]); }   /* 2 frames down */
      else row.push([c, 0, last && fr === 0 && !o.still || (o.squash && last)]);
    });
    on.forEach(function (q) { onSkewer(b, q[0], q[1], q[2]); });
    var sx0 = SKEW_X0, sx1 = SKEW_X1;   /* the skewer shows between the cubes on it */
    on.forEach(function (q) {
      for (var x = q[0].a - 1; x >= sx0 && x >= q[0].a - 2; x--) { put(b, x, SKEW_Y, C.w4); put(b, x, SKEW_Y + 1, C.w3); }
      for (var x2 = q[0].z + 1; x2 <= sx1 && x2 <= q[0].z + 2; x2++) { put(b, x2, SKEW_Y, C.w4); put(b, x2, SKEW_Y + 1, C.w3); }
    });
    row.forEach(function (q) { barShadow(b, q[0].a, q[0].z, 0, q[1]); barPiece(b, q[0].a, q[0].z, 0, q[1], q[0].cutL, q[0].cutR, q[2]); });
    if (o.flash && hit && hit.m != null && cs[hit.m]) { var c = cs[hit.m]; for (var x3 = c.a; x3 <= c.z; x3++) put(b, x3, BAR.y0 - 1, F.G0); }
    A.marks(b, markList(mk2, per), o.f | 0);
    frame(b);
    return b;
  };
  /* the finished skewer as one sprite (food centre at (ox, oy), skewer row at oy + 14), the tap scene's last frame */
  var KCARRY = lru(4);
  function skewerSprite(L) {
    return lruGet(KCARRY, JSON.stringify(L.offs || []), function () {
      var s = blank(200, 128), ox = 100, oy = 64, dx = ox - CX, dy = oy - CY, t = blank(W, H), x, y;
      skewer(t, SKEW_Y, SKEW_X0, SKEW_X1); grape(t, SKEW_X0 + 3, SKEW_Y + 1); tangerine(t, SKEW_X1 - 4, SKEW_Y + 1);
      var cs = cubes(L);
      cs.forEach(function (c) { onSkewer(t, c, DROP_DY, false); });
      cs.forEach(function (c) {
        for (x = c.a - 2; x < c.a; x++) if (x >= SKEW_X0) { put(t, x, SKEW_Y, C.w4); put(t, x, SKEW_Y + 1, C.w3); }
        for (x = c.z + 1; x <= c.z + 2; x++) if (x <= SKEW_X1) { put(t, x, SKEW_Y, C.w4); put(t, x, SKEW_Y + 1, C.w3); }
      });
      for (y = 0; y < H; y++) for (x = 0; x < W; x++) {   /* copy only what the skewer drew (the board's own colours are left out) */
        var i = (y * W + x) << 2; if (!t.d[i + 3]) continue;
        var g = get(t, x, y); put(s, x + dx, y + dy, g);
      }
      return { buf: s, ox: ox, oy: oy };
    });
  }
  KK.revealScene = function (b, o) {
    o = o || {};
    var R = G.rev2, t = o.t == null ? null : Math.max(0, o.t | 0), L = A.safeLook(o.look), still = !!o.still || t === null;
    var ry = R.jcy - 8;   /* the skewer row sits at the plate's middle (food centre - 8 + 14 = y 92) */
    A.base(b, { station: 'plate', look: L });
    if (t !== null && t <= 4) { KK.carry(b, { what: 'skewer', x: R.jcx, y: ry, lift: t <= 3 ? 2 : 1, look: L }); return frame(b); }
    KK.carry(b, { what: 'skewer', x: R.jcx, y: ry + (t === 5 ? 1 : 0), lift: 0, look: L, shadow: true });
    if (t === 5) return frame(b);
    if (!still) {
      A.twinkle(b, (t + 30) % 48, BAR.x0 + 4, ry - 4, 2);
      A.twinkle(b, (t + 22) % 48, R.jcx + 1, ry - 4, 2);
      A.twinkle(b, (t + 7) % 48, R.soy[0] - 3, R.soy[1] - 1, 2);
    }
    return frame(b);
  };
  KK.base = function (b, o) {
    o = o || {};
    if (o.station === 'board') { copyIn(b, bgBoard()); return b; }   /* the board alone: the knife rests in the slice scene only */
    return A.base(b, o);
  };
  KK.carry = function (b, o) {
    o = o || {};
    var L = o.look ? A.safeLook(o.look) : { offs: [0, 0] };
    return drawCarry(b, skewerSprite(L), o);
  };
  function smallSkewer(b, cx, cy, u) {   /* u = cube width (px) */
    var x, y, x0 = cx - 3 * u - 4, x1 = cx + 3 * u >> 0;
    for (x = x0; x <= cx + (3 * u >> 1) + 5; x++) { put(b, x, cy, C.w4); put(b, x, cy + 1, C.w1); }
    for (var k = -1; k <= 1; k++) for (y = -u + 1; y <= u - 1; y++) for (x = 0; x < u; x++) {
      var px = cx + k * (u + 1) - (u >> 1) + x, py = cy + y;
      put(b, px, py, y >= u - 2 ? C.g3 : y === u - 3 ? C.s6 : y <= -u + 2 ? F.C2 : F.C1);
    }
    put(b, x0 + 1, cy - 1, F.P2); put(b, x0 + 2, cy - 1, F.P3); put(b, x0 + 1, cy, F.P2); put(b, x0 + 2, cy, F.P2);
    var xe = cx + (3 * u >> 1) + 3; put(b, xe, cy - 1, F.J4); put(b, xe + 1, cy - 1, F.J3); put(b, xe, cy, F.J3); put(b, xe + 1, cy, F.J2);
    return x1;
  }
  KK.dish = function (b, look, o) {
    var L = A.safeLook(look), cx = b.w >> 1, cy = (b.h >> 1) - 2, s = blank(W, H), x, y;
    A.plate(b, L.plate, { cx: cx, cy: cy + 2, rx: Math.min(44, (b.w >> 1) - 4), ry: Math.min(27, (b.h >> 1) - 6), th: 3, rim: 5 });
    var SP = skewerSprite(L), sx = cx - SP.ox + 0, sy = cy - 14 - SP.oy + 2;
    dropShadow(b, SP.buf, sx, sy, 2); blit(b, SP.buf, sx, sy);
    return b;
  };
  KK.dishSmall = function (b, look, o) {
    var L = A.safeLook(look), cx = b.w >> 1, cy = (b.h >> 1) - 1;
    A.plate(b, L.plate, { cx: cx, cy: cy, rx: (b.w >> 1) - 2, ry: (b.h >> 1) - 3, th: 2, rim: 3, deco: false, noShadow: true });
    smallSkewer(b, cx, cy, 4);
    return b;
  };

  A.dishes = { jumeokbap: JB, kkochi: KK };
})();
