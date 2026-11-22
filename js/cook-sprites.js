/* js/cook-sprites.js -- food sprites for the kitchen, the recipe book and the table (round 7). One global COOK_SPR.
 * No DOM, no dependencies, file:// safe, runs in node. Integers and plain arithmetic only: no clock, no random source.
 *
 *   COOK_SPR.get(id, frame) -> { w, h, d: Uint8ClampedArray RGBA (alpha 0 or 255) } | null   frame defaults to 0, clamps to the last
 *   COOK_SPR.ids()          -> string[]
 *   COOK_SPR.info(id)       -> { w, h, frames, ax, ay } | null     ax, ay = centre of the footprint (where the contact shadow sits)
 *   COOK_SPR.PAL            -> { ch: '#rrggbb' }  every colour a sprite may use (Apollo 46 + the kitchen's FOOD 24 + EXTRA)
 *
 * HOW A SPRITE IS MADE (docs/FOOD_ART.md has the long version)
 *   A sprite is a small painter: def(id, w, h, ax, ay, frames, function (F, f) { ... }) paints frame f on the canvas F.
 *   Everything is painted in palette CHARACTERS (one character = one colour, table PAL below), never in hex.
 *   A painter builds objects on small layers (lay(w, h)), with hand-typed rows (.rows) and plain shapes (.r .rr .e .ln .poly),
 *   then F.put(layer, x, y, outline, shadow) stamps the object back to front: put() draws the 1-px selective outline
 *   (lamp side lighter, ground side darker) and the contact shadow (what is already there goes one ramp step darker).
 *   The colour characters '-' and '^' mean "one ramp step darker / lighter than what is there" (plane shading, doneness).
 *   Light comes from the upper left in every sprite. Outlines are warm browns or the object's own dark tone, never black.
 */
var COOK_SPR = (function () {
  'use strict';

  /* ---------- palette: one character per colour ---------- */
  var PAL = {
    /* FOOD (js/cook-art.js F): J0..J6 fried / egg / bread ramp, G0 glint, B batter, O oil, P bright greens, T seaweed, C reds, S soy, V steam */
    '0': '#6e1c10', '1': '#a8341a', '2': '#db5a1c', '3': '#f68b1f', '4': '#ffb52a', '5': '#ffd95c', '6': '#fff3bd',
    W: '#fffef2', b: '#fde08c', B: '#f6c162', o: '#5a3610', O: '#c47d1c',
    P: '#1b5b2b', G: '#3ea32f', g: '#86d838', q: '#d4f56c', T: '#10160b', t: '#2b4119',
    R: '#a0123a', r: '#ee2b2b', c: '#ff7f4f', S: '#2e0c07', s: '#c2481c', v: '#e0cdb6',
    /* Apollo greys (ceramic, steel) light -> dark */
    w: '#ebede9', l: '#c7cfcc', m: '#a8b5b2', n: '#819796', N: '#577277', d: '#394a50', D: '#202e37', x: '#151d28', X: '#10141f',
    /* Apollo wood light -> dark */
    e: '#e7d5b3', E: '#d7b594', f: '#c09473', F: '#ad7757', u: '#7a4841', U: '#4d2b32', V: '#341c27',
    /* Apollo amber and brown (the outline browns are a k K) */
    y: '#e8c170', A: '#de9e41', a: '#be772b', k: '#884b2b', K: '#602c2c',
    /* Apollo greens light -> dark */
    Y: '#d0da91', J: '#a8ca58', j: '#75a743', '9': '#468232', '8': '#25562e', '7': '#19332d',
    /* Apollo blues light -> dark */
    C: '#a4dddb', z: '#73bed3', H: '#4f8fba', h: '#3c5e8b', i: '#253a5e', I: '#172038',
    /* Apollo reds and purples */
    '@': '#da863e', '&': '#cf573c', '%': '#a53030', '$': '#752438', '#': '#411d31', '~': '#241527',
    p: '#df84a5', '*': '#c65197', '>': '#a23e8c', '<': '#7a367b', ')': '#402751', '(': '#1e1d39',
    /* EXTRA (not in the kitchen palette; at most four): Q warm white shade for rice / cream / egg white, = berry flesh pink */
    Q: '#f7ecd3', '=': '#ffb0a6'
  };
  var EXTRA = ['Q', '='];
  /* ramps, light -> dark: a contact shadow or '-' moves a pixel one step right; '^' one step left. First ramp that lists a character wins. */
  var RAMPS = ['W654321', '10S', 'bB4', 'WQeEfFuUV', 'wCzHhiI', 'lmnNdDxX', 'qgGP7', 'YJj987', 'tT', '=crR$#', '@&%$', 'yAakKV', 'sK', 'Oo', 'p*><)(', 'v E'];
  var DARK = {}, LITE = {}, RGB = {};
  RAMPS.forEach(function (r) {
    for (var i = 0; i + 1 < r.length; i++) {
      var a = r.charCodeAt(i), b = r.charCodeAt(i + 1); if (a === 32 || b === 32) continue;
      if (!DARK[a]) DARK[a] = b; if (!LITE[b]) LITE[b] = a;
    }
  });
  Object.keys(PAL).forEach(function (ch) { var n = parseInt(PAL[ch].slice(1), 16); RGB[ch.charCodeAt(0)] = [n >> 16 & 255, n >> 8 & 255, n & 255]; });
  var MINUS = 45, CARET = 94;

  /* ---------- a layer of palette characters ---------- */
  function Lay(w, h) { this.w = w; this.h = h; this.c = new Uint8Array(w * h); this.m = null; this.sf = null; }
  function lay(w, h) { return new Lay(w, h); }
  var P = Lay.prototype;
  /* one pixel. ch: a palette character, '-' darker, '^' lighter. Respects the clip set by on(). */
  P.p = function (x, y, ch) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return this;
    var i = y * this.w + x, k = ch.charCodeAt(0);
    if (this.m && !this.m[i]) return this;
    if (k === MINUS) { if (DARK[this.c[i]]) this.c[i] = DARK[this.c[i]]; }
    else if (k === CARET) { if (LITE[this.c[i]]) this.c[i] = LITE[this.c[i]]; }
    else { if (!RGB[k]) throw new Error('cook-sprites: no colour for "' + ch + '"'); this.c[i] = k; }
    return this;
  };
  P.at = function (x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : this.c[y * this.w + x]; };
  /* clip: the next shapes only paint pixels that NOW hold one of these characters ('*' = any painted pixel, '.' = empty ones). on() clears it. */
  P.on = function (chars) {
    if (!chars) { this.m = null; return this; }
    var m = new Uint8Array(this.w * this.h), any = chars === '*', i;
    for (i = 0; i < m.length; i++) m[i] = any ? (this.c[i] ? 1 : 0) : (chars.indexOf(this.c[i] ? String.fromCharCode(this.c[i]) : '.') >= 0 ? 1 : 0);
    this.m = m; return this;
  };
  P.r = function (x, y, w, h, ch) { for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) this.p(x + i, y + j, ch); return this; };
  function inE(x, y, w, h) { var X = 2 * x + 1 - w, Y = 2 * y + 1 - h; return X * X * h * h + Y * Y * w * w <= w * w * h * h; }
  /* filled ellipse in the box x, y, w, h */
  P.e = function (x, y, w, h, ch) { for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) if (inE(i, j, w, h)) this.p(x + i, y + j, ch); return this; };
  /* ellipse ring t px thick (the box is the outer edge) */
  P.ring = function (x, y, w, h, t, ch) {
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) {
      if (!inE(i, j, w, h)) continue;
      if (w - 2 * t > 0 && h - 2 * t > 0 && inE(i - t, j - t, w - 2 * t, h - 2 * t)) continue;
      this.p(x + i, y + j, ch);
    }
    return this;
  };
  /* rectangle with round corners of radius c */
  P.rr = function (x, y, w, h, c, ch) {
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) {
      var cx = i < c ? c - i : (i >= w - c ? i - (w - c - 1) : 0), cy = j < c ? c - j : (j >= h - c ? j - (h - c - 1) : 0);
      if (cx && cy && (2 * cx - 1) * (2 * cx - 1) + (2 * cy - 1) * (2 * cy - 1) > 4 * c * c) continue;
      this.p(x + i, y + j, ch);
    }
    return this;
  };
  /* line with a square brush t px (default 1) */
  P.ln = function (x0, y0, x1, y1, ch, t) {
    t = t || 1;
    var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy, e2;
    for (;;) {
      for (var a = 0; a < t; a++) for (var b = 0; b < t; b++) this.p(x0 + b, y0 + a, ch);
      if (x0 === x1 && y0 === y1) break;
      e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  };
  /* filled polygon, points [[x, y], ...] on pixel corners (a pixel is filled when its centre is inside) */
  P.poly = function (pts, ch) {
    var y0 = 1e9, y1 = -1e9, n = pts.length, i, y;
    for (i = 0; i < n; i++) { y0 = Math.min(y0, pts[i][1]); y1 = Math.max(y1, pts[i][1]); }
    for (y = Math.floor(y0); y < Math.ceil(y1); y++) {
      var cy = y + 0.5, xs = [];
      for (i = 0; i < n; i++) {
        var a = pts[i], b = pts[(i + 1) % n];
        if ((a[1] <= cy && b[1] > cy) || (b[1] <= cy && a[1] > cy)) xs.push(a[0] + (cy - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
      }
      xs.sort(function (p, q) { return p - q; });
      for (i = 0; i + 1 < xs.length; i += 2) for (var x = Math.ceil(xs[i] - 0.5); x + 0.5 < xs[i + 1]; x++) this.p(x, y, ch);
    }
    return this;
  };
  /* hand-typed rows: one character per pixel, '.' or ' ' = leave alone. A ragged block throws. */
  P.rows = function (x, y, rows) {
    for (var j = 0; j < rows.length; j++) {
      if (rows[j].length !== rows[0].length) throw new Error('cook-sprites: ragged rows at row ' + j + ' ("' + rows[j] + '")');
      for (var i = 0; i < rows[j].length; i++) { var ch = rows[j].charAt(i); if (ch !== '.' && ch !== ' ') this.p(x + i, y + j, ch); }
    }
    return this;
  };
  /* a lit round form: shade everywhere, base where the ellipse moved up-left by d overlaps, light where it does not reach when moved back */
  P.ball = function (x, y, w, h, light, base, shade, d) {
    d = d || 2; var keep = this.m;
    this.e(x, y, w, h, shade);
    var m1 = new Uint8Array(this.w * this.h), i, j;
    for (j = 0; j < h; j++) for (i = 0; i < w; i++) if (inE(i, j, w, h) && inE(i + d, j + d, w, h)) { var X = x + i, Y = y + j; if (X >= 0 && Y >= 0 && X < this.w && Y < this.h) m1[Y * this.w + X] = 1; }
    for (j = 0; j < h; j++) for (i = 0; i < w; i++) {
      var X2 = x + i, Y2 = y + j; if (X2 < 0 || Y2 < 0 || X2 >= this.w || Y2 >= this.h || !m1[Y2 * this.w + X2]) continue;
      this.p(X2, Y2, inE(i - d, j - d, w, h) ? base : light);
    }
    this.m = keep; return this;
  };
  /* replace characters: map = { from: to } */
  P.map = function (map) {
    for (var i = 0; i < this.c.length; i++) { var k = this.c[i]; if (!k) continue; var t = map[String.fromCharCode(k)]; if (t) this.c[i] = t.charCodeAt(0); }
    return this;
  };
  P.copy = function () { var l = new Lay(this.w, this.h); l.c.set(this.c); return l; };
  P.flip = function () { var l = new Lay(this.w, this.h); for (var y = 0; y < this.h; y++) for (var x = 0; x < this.w; x++) l.c[y * this.w + (this.w - 1 - x)] = this.c[y * this.w + x]; return l; };
  /* stamp layer src at x, y. ol = 'abc' outline characters [lamp side, main, ground side] or '' for none (the outline grows the
     object by 1 px each way). sh = how many px of contact shadow to cast down-right on what is already painted (0 = none). */
  P.put = function (src, x, y, ol, sh) {
    var w = this.w, h = this.h, i, j, k, s = src;
    if (ol) {
      s = new Lay(src.w + 2, src.h + 2);
      for (j = -1; j <= src.h; j++) for (i = -1; i <= src.w; i++) {
        if (src.at(i, j)) { s.c[(j + 1) * s.w + i + 1] = src.at(i, j); continue; }
        var ch = 0;
        if (src.at(i, j + 1)) ch = ol.charCodeAt(0);                                   /* above the object: the lamp side */
        else if (src.at(i + 1, j)) ch = ol.charCodeAt(2 * j < src.h ? 0 : 1);          /* left: lit on the upper half */
        else if (src.at(i - 1, j)) ch = ol.charCodeAt(1);                              /* right */
        else if (src.at(i, j - 1)) ch = ol.charCodeAt(2);                              /* below: grounded */
        if (ch) s.c[(j + 1) * s.w + i + 1] = ch;
      }
      x -= 1; y -= 1;
    }
    if (!this.sf) this.sf = new Uint8Array(w * h);
    if (sh) {
      for (k = 1; k <= sh; k++) for (j = 0; j < s.h; j++) for (i = 0; i < s.w; i++) {
        if (!s.c[j * s.w + i] || s.at(i + k, j + k)) continue;
        var X = x + i + k, Y = y + j + k; if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
        var t = Y * w + X; if (this.sf[t] || !this.c[t]) continue;
        this.sf[t] = 1; if (DARK[this.c[t]]) this.c[t] = DARK[this.c[t]];
      }
    }
    for (j = 0; j < s.h; j++) for (i = 0; i < s.w; i++) {
      var v = s.c[j * s.w + i]; if (!v) continue;
      var X3 = x + i, Y3 = y + j; if (X3 < 0 || Y3 < 0 || X3 >= w || Y3 >= h) continue;
      if (this.m && !this.m[Y3 * w + X3]) continue;
      this.c[Y3 * w + X3] = v; this.sf[Y3 * w + X3] = 0;
    }
    return this;
  };

  /* ---------- the table ---------- */
  var TABLE = {}, CACHE = {};
  function def(id, w, h, ax, ay, frames, fn) { TABLE[id] = { w: w, h: h, ax: ax, ay: ay, frames: frames, fn: fn }; }
  function has(id) { return Object.prototype.hasOwnProperty.call(TABLE, id); }
  function info(id) { var s = has(id) ? TABLE[id] : null; return s ? { w: s.w, h: s.h, frames: s.frames, ax: s.ax, ay: s.ay } : null; }
  function ids() { return Object.keys(TABLE).sort(); }
  function get(id, frame) {
    if (!has(id)) return null;
    var s = TABLE[id], f = Math.max(0, Math.min(s.frames - 1, (frame | 0))), key = id + '#' + f;
    if (CACHE[key]) return CACHE[key];
    var F = new Lay(s.w, s.h); s.fn(F, f);
    var d = new Uint8ClampedArray(s.w * s.h * 4);
    for (var i = 0; i < F.c.length; i++) { var k = F.c[i]; if (!k) continue; var c = RGB[k]; d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255; }
    return (CACHE[key] = { w: s.w, h: s.h, d: d });
  }

  /* shared outline sets: [lamp side, main, ground side] */
  var OW = 'akK',      /* warm food */
    OC = 'hii',        /* white ceramic */
    OG = 'GPP',        /* greens */
    OR = 'R$$',        /* reds */
    OD = 'UVV',        /* dark wood, pans */
    OS = 'NdD';        /* steel */

/*SPRITES-BEGIN*/
  /* ================= finished dishes (80 x 56, anchor 40, 44) ================= */

  /* a white rectangular plate w x h with a colour line inside the rim (line = palette character) */
  function platter(w, h, line) {
    var p = lay(w, h + 2);
    p.rr(0, 2, w, h, 5, 'm').rr(0, 1, w, h, 5, 'l').rr(0, 0, w, h, 5, 'w');
    p.on('w').rr(2, 2, w - 4, h - 4, 4, line).rr(3, 3, w - 6, h - 6, 3, 'w');
    p.rr(6, 5, w - 12, h - 10, 3, 'l').rr(7, 6, w - 13, h - 11, 3, 'w').on();
    return p;
  }
  /* one slice of rolled omelette, standing: skin top plane (5 rows), cut face 13 x 11 with the rolled seam, skin side at the right */
  function eggSlice(fleck) {
    var s = lay(16, 18);
    s.rows(0, 0, [
      '.44555554444433.',
      '4556WW5544444433',
      '4555665444344433',
      '4455544444443433',
      '4444444443444333',
      '3444444444443332']);
    s.r(0, 6, 1, 12, '4').r(1, 6, 13, 11, '6').r(14, 6, 1, 12, '3').r(15, 6, 1, 11, '2').r(1, 17, 13, 1, '3');
    s.r(10, 15, 4, 2, '5').r(12, 12, 2, 3, '5').p(13, 16, 'b').p(12, 16, 'b');
    /* the rolled layers: one seam from the outside in, lamp side golden, shadow side orange */
    s.ln(3, 15, 3, 7, '4').ln(3, 7, 11, 7, '4').ln(12, 7, 12, 15, '3').ln(12, 15, 6, 15, '3').ln(6, 15, 6, 10, '4').ln(6, 10, 9, 10, '4').ln(9, 11, 9, 12, '3');
    if (fleck === 1) s.p(5, 12, 'g').p(5, 13, 'G').p(10, 9, 'c');
    if (fleck === 2) s.p(8, 13, 'g').p(9, 13, 'G').p(4, 9, 'c');
    if (fleck === 3) s.p(10, 13, 'g').p(10, 14, 'G').p(7, 8, 'g');
    s.p(15, 17, '2').p(0, 17, '3');
    return s;
  }
  def('dish.gyeran', 80, 56, 40, 44, 1, function (F) {
    F.put(platter(72, 24, 'z'), 4, 28, OC, 0);
    /* a sprig of green behind the row */
    var leaf = lay(16, 11);
    leaf.rows(0, 0, [
      '..qq....qqg.....',
      '.qqgg..qqggg.gg.',
      'qqgggGqgggggGgg.',
      'qggggGgggggGgggg',
      'gggggGggggGggggg',
      '.ggggGgggGggggG.',
      '..gggGggGgggGG..',
      '...ggGgGgggG....',
      '....GGGGGGG.....',
      '.....GGGG.......',
      '................']);
    F.put(leaf, 5, 19, OG, 2);
    for (var i = 4; i >= 0; i--) F.put(eggSlice(i % 4), 12 + i * 11, 24 - i * 2 - (i > 2 ? 1 : 0), OW, 2);
    /* a dab of ketchup in the free corner */
    var k = lay(8, 5); k.rows(0, 0, ['..rrr...', '.rcWrr..', 'rrrrrrr.', 'rrrrrrRR', '.RRRRRR.']);
    F.put(k, 60, 42, OR, 1);
  });

  /* ---- strawberry cream cake: a wedge on a square plate, the cut face shows sponge / cream and berries / sponge ---- */
  function berry(w, h) {   /* a whole strawberry, tip down, with its green cap */
    var b = lay(w, h + 2);
    b.ball(0, 2, w, h - 2, 'c', 'r', 'R', 2);
    b.on('rR').e(2, h - 5, w - 4, 6, '-').on();
    b.poly([[1, 4], [w - 1, 4], [w / 2 + 2, h + 1], [w / 2 - 2, h + 1]], 'r').on('r');
    b.on();
    return b;
  }
  function strawberry() {   /* 12 x 13 */
    var b = lay(12, 13);
    b.rows(0, 0, [
      '...gG.gg....',
      '.gggGgGGgg..',
      '.crGggGrrrr.',
      'ccrrrGrrrrrR',
      'c=Wrrrr5rrrR',
      'ccWr5rrrrrRR',
      'crrrrrr5rrRR',
      '.rr5rrrrrRR.',
      '.rrrrr5rrRR.',
      '..rrrrrrRR..',
      '...rr5rRR...',
      '....rrRR....',
      '.....RR.....']);
    return b;
  }
  /* remove the pixels of a layer inside any of the circles [cx, cy, r] (a bite) */
  function bite(l, circles) {
    for (var y = 0; y < l.h; y++) for (var x = 0; x < l.w; x++) for (var i = 0; i < circles.length; i++) {
      var dx = x - circles[i][0], dy = y - circles[i][1];
      if (dx * dx + dy * dy <= circles[i][2] * circles[i][2]) l.c[y * l.w + x] = 0;
    }
    return l;
  }
  /* bites: 0 whole, 1 the tip gone, 2 half gone (and the berry), 3 an empty plate with crumbs */
  function cakeDish(F, bites) {
    F.put(platter(66, 26, 'p'), 7, 26, OC, 0);
    if (bites === 3) {
      [[22, 38], [30, 42], [41, 36], [48, 41], [36, 45], [27, 34]].forEach(function (q, i) { F.p(q[0], q[1], i % 2 ? '5' : '4').p(q[0] + 1, q[1], 'b'); });
      F.on('w').e(40, 37, 9, 4, 'W').on();
      var cap = lay(5, 4); cap.rows(0, 0, ['.gGg.', 'gGgGg', '.GgG.', '..G..']); F.put(cap, 52, 38, OG, 1);
      return;
    }
    var c = lay(60, 40), T = [2, 16], B = [54, 4], C = [46, 20], H = 18;
    function band(a, b, ch) { c.poly([[T[0], T[1] + a], [C[0], C[1] + a], [C[0], C[1] + b], [T[0], T[1] + b]], ch); }
    /* the frosted outer side (right) */
    c.poly([C, B, [B[0], B[1] + H], [C[0], C[1] + H]], 'Q');
    c.on('Q').r(51, 0, 4, 40, 'e').r(46, 34, 9, 6, 'e').on();
    /* the cut face */
    band(0, 3, 'W'); band(3, 9, '5'); band(9, 12, 'W'); band(12, 17, '5'); band(17, 18, '4');
    c.on('5');
    [[8, 21], [15, 24], [22, 22], [29, 25], [36, 24], [42, 26], [12, 31], [20, 33], [27, 32], [34, 34], [41, 35], [6, 30], [18, 28], [38, 30]].forEach(function (p) { c.p(p[0], p[1], '4'); c.p(p[0] + 1, p[1], 'b'); });
    c.on();
    c.on('5'); band(8, 9, 'b'); band(3, 4, '6'); band(12, 13, '6'); c.on();
    /* berries in the filling: red pieces with a pale core */
    [[9, 26], [19, 27], [29, 28], [38, 29]].forEach(function (p, i) { c.on('W5b6'); c.r(p[0], p[1], 5, 3, 'r').p(p[0] + 1, p[1] + 1, '=').p(p[0] + 2, p[1] + 1, i % 2 ? '=' : 'c').p(p[0] + 4, p[1] + 2, 'R'); c.on(); });
    /* the top: cream, lit */
    c.poly([T, B, C], 'W');
    c.on('W').poly([[30, 9], [54, 4], [46, 20]], 'Q').on();
    c.ln(T[0] + 1, T[1] + 1, C[0] - 1, C[1] + 1, 'Q');
    /* a cream swirl under the berry */
    c.e(20, 9, 18, 8, 'Q').e(20, 8, 17, 7, 'W');
    if (bites === 1) bite(c, [[3, 20], [8, 30], [2, 34]].map(function (q) { return [q[0], q[1], 9]; }));
    if (bites === 2) bite(c, [[10, 14, 16], [14, 30, 15], [26, 10, 7], [4, 36, 12]]);
    F.put(c, 12, 8, 'EFu', 2);
    if (bites < 2) F.put(strawberry(), 36, 7, OR, 2);
    if (bites) { F.p(17, 44, '5').p(18, 44, 'b').p(24, 47, '4').p(25, 47, 'b').p(13, 40, '5'); return; }
    /* half a berry on the plate, cut face up */
    var hb = lay(9, 8); hb.rows(0, 0, ['..gGg....', '.rrrrrr..', 'rr====rr.', 'r==WW==rR', 'r==W===rR', '.r====rR.', '..rrrrR..', '...RRR...']);
    F.put(hb, 16, 39, OR, 1);
  }
  def('dish.cake', 80, 56, 40, 44, 1, function (F) { cakeDish(F, 0); });
  def('eat.cake', 80, 56, 40, 44, 4, cakeDish);

  /* ---- triangle rice balls on a leaf plate ---- */
  function rot(pts, cx, cy, c, s) { return pts.map(function (p) { var x = p[0] - cx, y = p[1] - cy; return [cx + x * c - y * s, cy + x * s + y * c]; }); }
  function riceBall(c, s) {   /* 34 x 32 layer; c, s = cos and sin of the lean */
    var l = lay(34, 32), ox = 4, oy = 5;
    var tri = [[9, 0], [14, 0], [23, 16], [23, 19], [20, 22], [3, 22], [0, 19], [0, 16]].map(function (p) { return [p[0] + ox, p[1] + oy]; });
    var side = tri.map(function (p) { return [p[0] + 5, p[1] - 2]; });
    function R(pts) { return rot(pts.map(function (p) { return [p[0] + ox, p[1] + oy]; }), 16, 16, c, s); }
    l.poly(rot(side, 16, 16, c, s), 'e');
    l.on('e').poly(R([[16, 11], [29, 11], [29, 24], [16, 24]]), 'T').on();
    l.on('e').poly(R([[5, -3], [20, -3], [27, 9], [21, 9]]), 'Q').on();
    l.poly(rot(tri, 16, 16, c, s), 'W');
    l.on('W').poly(R([[12, 17], [24, 15], [24, 23], [-1, 23], [-1, 20]]), 'Q').on();
    /* the seaweed strip, wrapped over the bottom edge */
    l.on('WQ').poly(R([[7, 12], [16, 12], [16, 23], [7, 23]]), 'T').on();
    l.on('T').poly(R([[8, 13], [10, 13], [10, 21], [8, 21]]), 't').on();
    /* a few grains */
    l.on('W'); [[9, 4], [12, 8], [6, 11], [17, 10], [4, 15], [19, 14]].forEach(function (g) { var q = R([[g[0], g[1]]])[0]; l.p(Math.round(q[0]), Math.round(q[1]), 'Q').p(Math.round(q[0]) + 1, Math.round(q[1]), 'Q'); }); l.on();
    return l;
  }
  def('dish.jumeokbap', 80, 56, 40, 44, 1, function (F) {
    var leaf = lay(72, 26), pts = [[0, 14], [7, 6], [22, 1], [46, 0], [62, 3], [72, 10], [64, 18], [48, 23], [24, 24], [8, 20]];
    leaf.poly(pts.map(function (p) { return [p[0], p[1] + 2]; }), '9');
    leaf.poly(pts.map(function (p) { return [p[0], p[1] + 1]; }), 'j');
    leaf.poly(pts, 'J');
    leaf.on('J').poly([[8, 8], [24, 3], [46, 2], [60, 5], [40, 8], [16, 12]], 'Y').on();
    leaf.on('JY').ln(3, 14, 68, 10, 'j');
    [[14, 13, 20, 6], [26, 12, 33, 4], [40, 11, 47, 3], [53, 11, 59, 5], [16, 14, 24, 20], [30, 13, 38, 21], [44, 12, 52, 20], [56, 11, 62, 16]].forEach(function (v) { leaf.ln(v[0], v[1], v[2], v[3], 'j'); });
    leaf.on();
    F.put(leaf, 4, 28, '988', 0);
    var back = riceBall(0.97, 0.24), front = riceBall(1, 0);
    F.put(back, 34, 6, 'FuU', 2);
    F.put(front, 14, 12, 'FuU', 2);
    /* sesame on the rice */
    [[24, 22], [31, 26], [22, 30], [50, 16], [56, 21]].forEach(function (p) { F.p(p[0], p[1], 'u').p(p[0] + 1, p[1], 'E'); });
    /* two slices of yellow pickled radish */
    var rad = lay(11, 8); rad.e(0, 1, 11, 7, '3').e(0, 0, 11, 7, '5').on('5').e(2, 1, 6, 3, '6').e(4, 3, 6, 3, '4').on().p(3, 2, 'W');
    F.put(rad, 54, 37, OW, 1); F.put(rad, 60, 40, OW, 1);
  });

  /* ---- glazed fruit skewers, crossed on a small round plate ---- */
  function grape() { var g = lay(11, 11); g.ball(0, 0, 11, 11, 'q', 'g', 'G', 2).p(3, 2, 'W').p(4, 2, 'W').p(3, 3, 'W').p(6, 5, 'q').p(8, 8, 'P'); return g; }
  function tang() {
    var t = lay(12, 11); t.ball(0, 0, 12, 11, '5', '4', '3', 2);
    t.on('43').ln(6, 1, 5, 9, '3').ln(9, 2, 9, 8, '2').ln(3, 3, 2, 7, '3').on().p(3, 2, 'W').p(4, 2, 'W').p(7, 4, '6').p(10, 8, '2');
    return t;
  }
  function glaze(l) {   /* a sugar shell: the lamp-side rim one step lighter, a second small glint lower right */
    var g = l.copy(), x, y;
    for (y = 0; y < g.h; y++) for (x = 0; x < g.w; x++) if (l.at(x, y) && (!l.at(x - 1, y) || !l.at(x, y - 1)) && x + y < (g.w + g.h) / 2) g.p(x, y, '^');
    g.p(g.w - 4, g.h - 4, 'W');
    return g;
  }
  /* gone: how many fruits are eaten off the tip of each skewer (0 to 3) */
  function kkochiDish(F, gone) {
    var pl = lay(66, 28);
    pl.e(0, 3, 66, 25, 'H').e(0, 1, 66, 25, 'z').e(0, 0, 66, 24, 'C');
    pl.on('C').ring(5, 3, 56, 18, 1, 'z').e(8, 5, 50, 14, 'w').e(11, 7, 47, 13, 'C').on();
    pl.on('C').e(4, 1, 30, 8, 'w').e(6, 2, 30, 8, 'C').on();
    F.put(pl, 7, 26, 'hii', 0);
    function skewer(dir, fruits) {
      var x0 = dir > 0 ? 48 : 31, x1 = dir > 0 ? 6 : 73, s = lay(80, 56);
      s.ln(x0, 49, x1, 9, 'A', 2).ln(x0, 49, x1, 9, 'y');
      F.put(s, 0, 0, 'akK', 1);
      fruits.forEach(function (f, i) {
        if (i >= 3 - gone) return;
        var cx = 40 - dir * (9 + i * 9), cy = 33 - i * 9;
        F.put(f, cx - 6, cy - 6, f.ol, 2);
      });
    }
    var sb = glaze(strawberry()), gr = glaze(grape()), tg = glaze(tang()); sb.ol = OR; gr.ol = OG; tg.ol = OW;
    skewer(1, [sb, gr, tg]);
    skewer(-1, [tg, sb, gr]);
    /* drops of glaze on the plate */
    F.p(22, 44, 'W').p(23, 44, 'w').p(57, 45, 'W').p(40, 48, 'W').p(41, 48, 'w');
  }
  def('dish.kkochi', 80, 56, 40, 44, 1, function (F) { kkochiDish(F, 0); });
  def('eat.kkochi', 80, 56, 40, 44, 4, kkochiDish);

  /* ---- seaweed pancake: cut pieces stacked on a round wicker tray, one lifted on chopsticks, a dish of soy dip ---- */
  var JEON_PTS = [   /* wedges of a round pancake: a curved crust edge and a cut tip */
    [[1, 4], [8, 1], [18, 0], [26, 3], [15, 12]],
    [[0, 2], [12, 0], [25, 1], [27, 6], [9, 12]],
    [[4, 0], [18, 1], [27, 5], [14, 12], [0, 8]]];
  function jeonPiece(v, band) {
    var l = lay(28, 16), pts = JEON_PTS[v], cx = 0, cy = 0, i;
    function sh(dy) { return pts.map(function (p) { return [p[0], p[1] + dy]; }); }
    pts.forEach(function (p) { cx += p[0] / pts.length; cy += p[1] / pts.length; });
    l.poly(sh(2), '3').poly(sh(1), '6').poly(pts, '2');
    l.on('2').poly(pts.map(function (p) { return [p[0] + (cx - p[0]) * 0.16, p[1] + (cy - p[1]) * 0.3]; }), '4').on();
    /* cut faces: green strands in the pale inside */
    l.on('6'); for (i = 2; i < 27; i += 5) l.p(i + v, 9 + ((i + v) % 4), 'g').p(i + v + 1, 9 + ((i + v) % 4), 'G'); l.on();
    l.on('4');
    l.e(4, 2, 9, 4, '5').p(6, 3, '6').p(7, 3, '6');
    l.e(15 - v, 6, 6, 3, '3').p(17 - v, 7, '2');
    [[8, 7, 11, 5], [18, 3, 21, 4], [12, 8, 14, 9], [20, 7, 22, 5]].forEach(function (s) { l.ln(s[0] + v, s[1], s[2] + v, s[3], 'G'); });
    l.p(9 + v, 8, 't').p(19, 3, 't').p(22, 8, '2').p(5, 8, '2').p(13, 2, '2').p(24, 4, '3');
    l.on();
    if (band === 0) l.map({ '2': '3', '3': '4', '4': '5', '5': '6' });
    if (band === 2) l.map({ '5': '4', '4': '3', '3': '2', '2': '1' });
    return l;
  }
  def('dish.jeon', 80, 56, 40, 44, 3, function (F, f) {
    /* wicker tray */
    var t = lay(60, 28);
    t.e(0, 4, 60, 24, 'k').e(0, 2, 60, 24, 'a').e(0, 0, 60, 24, 'A');
    t.on('A').ring(0, 0, 60, 24, 3, 'y').on();
    t.on('A'); for (var y = 4; y < 21; y += 2) for (var x = 4 + (y % 4); x < 56; x += 4) { t.p(x, y, 'a'); t.p(x + 1, y, 'a'); } t.on();
    t.on('y'); for (x = 2; x < 58; x += 3) { t.p(x, x % 2 ? 1 : 22, 'A'); t.p(x, x % 2 ? 22 : 1, 'A'); t.p(x < 30 ? 1 : 58, 6 + (x % 12), 'A'); } t.on();
    t.on('a'); for (x = 3; x < 58; x += 4) t.p(x, 25 - (x < 12 || x > 47 ? 3 : (x < 20 || x > 39 ? 1 : 0)), 'k'); t.on();
    F.put(t, 2, 26, 'aKK', 0);
    F.put(jeonPiece(0, f), 6, 31, OW, 2);
    F.put(jeonPiece(1, f), 30, 32, OW, 2);
    F.put(jeonPiece(2, f), 19, 26, OW, 2);
    F.put(jeonPiece(1, f), 11, 21, OW, 2);
    /* the dish of soy dip */
    var d = lay(18, 12);
    d.e(0, 2, 18, 10, 'm').e(0, 0, 18, 10, 'w').on('w').e(2, 2, 14, 6, 'S').on().on('S').e(3, 4, 12, 4, 'K').on().p(5, 3, 'W').p(6, 3, 's').p(11, 6, 's');
    F.put(d, 60, 38, OC, 0);
    /* chopsticks holding one piece up */
    var c = lay(40, 22);
    c.ln(8, 16, 35, 2, 'F', 2).ln(8, 16, 35, 2, 'E');
    F.put(c, 40, 2, 'uUV', 0);
    F.put(jeonPiece(2, f), 34, 6, OW, 0);
    var c2 = lay(40, 22);
    c2.ln(6, 12, 35, 6, 'F', 2).ln(6, 12, 35, 6, 'E');
    F.put(c2, 40, 4, 'uUV', 1);
  });

  /* ================= empty dishes (80 x 56, anchor 40, 44): the same container at the same place, everything eaten =================
     The table draws one of these UNDER the dish picture and cuts round bites out of the dish, so the container must be
     complete where the food covered it. Sauce stays in its dish, a few crumbs and smears, utensils rest on a rim. */
  function crumbs(F, list) { list.forEach(function (q) { F.p(q[0], q[1], q[2]); if (q[3]) F.p(q[0] + 1, q[1], q[3]); }); }
  def('empty.jeon', 80, 56, 40, 44, 1, function (F) {
    var t = lay(60, 28), x, y;
    t.e(0, 4, 60, 24, 'k').e(0, 2, 60, 24, 'a').e(0, 0, 60, 24, 'A');
    t.on('A').ring(0, 0, 60, 24, 3, 'y').on();
    t.on('A'); for (y = 4; y < 21; y += 2) for (x = 4 + (y % 4); x < 56; x += 4) { t.p(x, y, 'a'); t.p(x + 1, y, 'a'); } t.on();
    t.on('y'); for (x = 2; x < 58; x += 3) { t.p(x, x % 2 ? 1 : 22, 'A'); t.p(x, x % 2 ? 22 : 1, 'A'); t.p(x < 30 ? 1 : 58, 6 + (x % 12), 'A'); } t.on();
    t.on('a'); for (x = 3; x < 58; x += 4) t.p(x, 25 - (x < 12 || x > 47 ? 3 : (x < 20 || x > 39 ? 1 : 0)), 'k'); t.on();
    F.put(t, 2, 26, 'aKK', 0);
    crumbs(F, [[16, 34, '3', '2'], [27, 37, '4', '3'], [38, 33, '2'], [22, 41, 'g', 'G'], [33, 42, '3', '2'], [45, 38, '4'], [12, 39, '2'], [41, 44, 'G']]);
    /* the dish of soy dip, a little lower */
    var d = lay(18, 12);
    d.e(0, 2, 18, 10, 'm').e(0, 0, 18, 10, 'w').on('w').e(3, 3, 12, 5, 'S').on().on('S').e(4, 5, 10, 3, 'K').on().p(6, 4, 'W').p(11, 6, 's');
    d.on('w').p(2, 4, 'K').p(15, 3, 'K').on();
    F.put(d, 60, 38, OC, 0);
    /* the chopsticks laid down: their tips rest on the soy dish rim, the ends on the table */
    var c = lay(34, 9);
    c.ln(1, 0, 32, 4, 'F', 2).ln(1, 0, 32, 4, 'E');
    c.ln(0, 4, 32, 7, 'F', 2).ln(0, 4, 32, 7, 'E');
    F.put(c, 29, 34, 'uUV', 1);
  });
  def('empty.gyeran', 80, 56, 40, 44, 1, function (F) {
    F.put(platter(72, 24, 'z'), 4, 28, OC, 0);
    /* the sprig is left, lying on the plate */
    var leaf = lay(12, 7);
    leaf.rows(0, 0, [
      '.qqg..qqgg..',
      'qgggGqggggGg',
      'ggggGgggGggg',
      '.gggGggGggG.',
      '..ggGgGggG..',
      '...GGGGGG...',
      '............']);
    F.put(leaf, 10, 33, OG, 1);
    /* a smear of ketchup pulled by the last bite, egg crumbs */
    var k = lay(14, 4); k.rows(0, 0, ['..rr..........', '.rRrrr..r.....', 'rrRRRrrrRr.rr.', '.RRRRRRRRRRRR.']);
    F.put(k, 52, 42, '', 0);
    crumbs(F, [[28, 36, '5', '4'], [38, 40, '4'], [46, 35, '5', '3'], [33, 45, '6', '5'], [22, 42, '4'], [44, 46, 'g']]);
  });
  def('empty.jumeokbap', 80, 56, 40, 44, 1, function (F) {
    var leaf = lay(72, 26), pts = [[0, 14], [7, 6], [22, 1], [46, 0], [62, 3], [72, 10], [64, 18], [48, 23], [24, 24], [8, 20]];
    leaf.poly(pts.map(function (p) { return [p[0], p[1] + 2]; }), '9');
    leaf.poly(pts.map(function (p) { return [p[0], p[1] + 1]; }), 'j');
    leaf.poly(pts, 'J');
    leaf.on('J').poly([[8, 8], [24, 3], [46, 2], [60, 5], [40, 8], [16, 12]], 'Y').on();
    leaf.on('JY').ln(3, 14, 68, 10, 'j');
    [[14, 13, 20, 6], [26, 12, 33, 4], [40, 11, 47, 3], [53, 11, 59, 5], [16, 14, 24, 20], [30, 13, 38, 21], [44, 12, 52, 20], [56, 11, 62, 16]].forEach(function (v) { leaf.ln(v[0], v[1], v[2], v[3], 'j'); });
    leaf.on();
    F.put(leaf, 4, 28, '988', 0);
    /* rice grains, sesame and a scrap of seaweed */
    var g = lay(3, 2); g.rows(0, 0, ['WWQ', '.Qe']);
    [[20, 35], [29, 39], [37, 33], [45, 41], [52, 36], [24, 44]].forEach(function (q) { F.put(g, q[0], q[1], 'EFF', 0); });
    crumbs(F, [[33, 44, 'u', 'E'], [42, 37, 'u', 'E'], [17, 40, 'u'], [56, 43, 'E', 'u']]);
    var gim = lay(5, 3); gim.rows(0, 0, ['TTtT.', 'TtTTT', '.TTT.']);
    F.put(gim, 39, 45, 'tTT', 1);
  });
  def('empty.kkochi', 80, 56, 40, 44, 1, function (F) {
    var pl = lay(66, 28);
    pl.e(0, 3, 66, 25, 'H').e(0, 1, 66, 25, 'z').e(0, 0, 66, 24, 'C');
    pl.on('C').ring(5, 3, 56, 18, 1, 'z').e(8, 5, 50, 14, 'w').e(11, 7, 47, 13, 'C').on();
    pl.on('C').e(4, 1, 30, 8, 'w').e(6, 2, 30, 8, 'C').on();
    F.put(pl, 7, 26, 'hii', 0);
    /* the two bare sticks lying on the plate, a little apart */
    var s = lay(46, 12);
    s.ln(0, 3, 44, 0, 'A', 2).ln(0, 3, 44, 0, 'y');
    s.ln(1, 11, 45, 6, 'A', 2).ln(1, 11, 45, 6, 'y');
    F.put(s, 17, 31, 'akK', 1);
    /* drops of glaze and a little juice */
    crumbs(F, [[22, 44, 'W', 'w'], [57, 45, 'W'], [40, 48, 'W', 'w'], [30, 46, 'r'], [50, 38, '4'], [45, 47, 'g']]);
  });
  def('empty.cake', 80, 56, 40, 44, 1, function (F) { cakeDish(F, 3); });

  /* ================= small pictures typed by hand: icons 16 x 16, table sprites 16 x 12, step pictograms ================= */
  function typed(id, w, h, ax, ay, rows, maps) {
    def(id, w, h, ax, ay, maps ? maps.length : 1, function (F, f) { F.rows(0, 0, rows); if (maps && maps[f]) F.map(maps[f]); });
  }
  var PALE = { '2': '3', '3': '4', '4': '5', '5': '6' }, CRISP = { '5': '4', '4': '3', '3': '2', '2': '1' };
  typed('icon.jeon', 16, 16, 8, 13, [
    '................',
    '................',
    '....kkkkkkk.....',
    '...k5544443k....',
    '..k545G4443kk...',
    '..k4444t4432k...',
    '.kk66g66g6632k..',
    '.k4554444G443k..',
    '.k45G44t44432k..',
    'aak66g66g6g63kaa',
    'ayAkkkkkkkkkkAya',
    'aAyAyAyAyAyAyAAa',
    '.aAAAAAAAAAAAAa.',
    '..kaaaaaaaaaak..',
    '...kkkkkkkkkk...',
    '................']);
  typed('icon.gyeran', 16, 16, 8, 13, [
    '................',
    '................',
    '.......aaaaaaaa.',
    '......a5W544433k',
    '.aaaaaaa4444433k',
    'a5W54443k666653k',
    'a4444433k644463k',
    'k6666653k646463k',
    'k6444653k644463k',
    'k6466653k666653k',
    'k6464653kkkkkkkK',
    'k6444653kCwwwwwh',
    'hKKKKKKKKCwwwwwh',
    'hwwwwwwwwwwwwwwh',
    '.hllllllllllllh.',
    '..hhhhhhhhhhhh..']);
  typed('icon.jumeokbap', 16, 16, 8, 13, [
    '................',
    '......FFFF......',
    '.....FWWWWF.....',
    '.....FWWWWQF....',
    '....FWWWWWQF....',
    '....FWWWWWWQF...',
    '...FWWWWWWWQF...',
    '...FWWuWWWWQQF..',
    '..FWWWTTTTWWQQF.',
    '..FWWWTtTTWuQQF.',
    '.FWWWWTtTTWWQQeu',
    '.FWQQWTtTTQQQeeu',
    '.uQQQQTTTTQQeeu.',
    '9juuuuuuuuuuuuj9',
    '.9jJJJJJJJJJJj9.',
    '..999999999999..']);
  typed('icon.kkochi', 16, 16, 8, 13, [
    '..............ay',
    '..........kkkay.',
    '.........k5W4k..',
    '.........k4443k.',
    '......PPPk4433k.',
    '.....PqWgPk33k..',
    '.....PgggGPkk...',
    '..$$$PgggGP.....',
    '.$cWr$PGGP......',
    '.$rrrr$PP.......',
    '.$rr5rR$........',
    '.$rrrRR$........',
    '..$RRR$.........',
    '.ay$$$..........',
    'ay..............',
    'y...............']);
  typed('icon.cake', 16, 16, 8, 13, [
    '................',
    '........gG......',
    '.......$rr$.....',
    '......$rWrr$....',
    '...FFF$rrrR$F...',
    '.FFWWWW$RR$WWF..',
    'FWWWWWWW$$WWWQF.',
    'F5555555555555k.',
    'k5455545554554k.',
    'kWrWWrWWrWWrWWk.',
    'k5555555555555k.',
    'k5455455545545k.',
    'hkkkkkkkkkkkkkkh',
    'hwwwwwwwwwwwwwwh',
    '.hllllllllllllh.',
    '..hhhhhhhhhhhh..']);
  /* the play-room table: one sprite px = one room px, so only the silhouette and the container speak */
  typed('table.jeon', 16, 12, 8, 10, [
    '................',
    '................',
    '....kkkkkkk.....',
    '...k5444443k....',
    '..k44G4444t3k...',
    '..k6666g6663k...',
    '.kk4454444G3kk..',
    'ak44t44444443ka.',
    'ayk66g666g66kya.',
    'aAykkkkkkkkkyAa.',
    '.aAAAAAAAAAAAa..',
    '..kkkkkkkkkkk...'], [PALE, null, CRISP]);
  typed('table.gyeran', 16, 12, 8, 10, [
    '................',
    '.........aaa....',
    '......aaa5W4k...',
    '...aaa5W4k63k...',
    '..a5W4k63k63k...',
    'hhk664k63kkkkhh.',
    'hwk646kkkCwwwwh.',
    'hwk664kCwwwwwwh.',
    'hwwkkkCwwwwrrwh.',
    'hwwwwwwwwwwwwwh.',
    'hlllllllllllllh.',
    '.hhhhhhhhhhhhh..']);
  typed('table.jumeokbap', 16, 12, 8, 10, [
    '................',
    '........FF......',
    '.......FWWF.....',
    '....FF.FWWQF....',
    '...FWWFWWWQF....',
    '..FWWWQFWWQQF...',
    '..FWWWWQFWQQF...',
    '9FWWTTWWQFuuuJ9.',
    '9FWQTTQQQFJ55j9.',
    '.9uuuuuuuuJjj9..',
    '..99jjjjjjj99...',
    '....9999999.....']);
  function typedFrames(id, w, h, ax, ay, frames) { def(id, w, h, ax, ay, frames.length, function (F, f) { F.rows(0, 0, frames[f]); }); }
  typedFrames('table.kkochi', 16, 12, 8, 10, [[
    '..............y.',
    '..........kkky..',
    '.........k54k...',
    '......PPPk43k...',
    '.....PqgPkkk....',
    '..$$$PgGPhhhhh..',
    '.$crr$PPCCCCCCh.',
    'h$rrR$CCCCCCCCh.',
    'hCy$$$CCwwCCCzh.',
    '.hyCCCCCCCCCzh..',
    '..hhzzzzzzzhh...',
    '....hhhhhhh.....'], [
    '..............y.',
    '.............y..',
    '............y...',
    '......PPP..y....',
    '.....PqgPay.....',
    '..$$$PgGPhhhhh..',
    '.$crr$PPCCCCCCh.',
    'h$rrR$CCCCCCCCh.',
    'hCy$$$CCwwCCCzh.',
    '.hyCCCCCCCCCzh..',
    '..hhzzzzzzzhh...',
    '....hhhhhhh.....'], [
    '..............y.',
    '.............y..',
    '............y...',
    '...........y....',
    '.........ay.....',
    '..$$$..ayhhhhh..',
    '.$crr$ayCCCCCCh.',
    'h$rrR$CCCCCCCCh.',
    'hCy$$$CCwwCCCzh.',
    '.hyCCCCCCCCCzh..',
    '..hhzzzzzzzhh...',
    '....hhhhhhh.....'], [
    '..............y.',
    '.............y..',
    '............y...',
    '...........y....',
    '.........ay.....',
    '.......ayhhhhh..',
    '.hhhhayCCCCCCCh.',
    'hCCCyCCCCCCCCCh.',
    'hCyCCCCCwwCCCzh.',
    '.hyCCCCCCCCCzh..',
    '..hhzzzzzzzhh...',
    '....hhhhhhh.....']]);
  typedFrames('table.cake', 16, 12, 8, 10, [[
    '........g.......',
    '.......$r$......',
    '....FFF$r$FF....',
    '..FFWWWW$WWWF...',
    '.FWWWWWWWWWQF...',
    '.k55555555554k..',
    'hkWrWWrWWrWWWkh.',
    'hk55555555554kh.',
    'hwkkkkkkkkkkkwh.',
    'hwwwwwwwwwwwwwh.',
    'hlllllllllllllh.',
    '.hhhhhhhhhhhhh..'], [
    '........g.......',
    '.......$r$......',
    '.....FF$r$FF....',
    '....FWWW$WWWF...',
    '....FWWWWWWQF...',
    '....k55555554k..',
    'hhhhkrWWrWWWWkh.',
    'hwwwk55555554kh.',
    'hwwwwkkkkkkkkwh.',
    'hwwwwwwwwwwwwwh.',
    'hlllllllllllllh.',
    '.hhhhhhhhhhhhh..'], [
    '................',
    '................',
    '................',
    '.........FFFF...',
    '........FWWWQF..',
    '........k5554k..',
    'hhhhhhhhkWrWWkh.',
    'hwwwwwwwk5554kh.',
    'hwwrwwwwwkkkkwh.',
    'hwwwww5wwwwwwwh.',
    'hlllllllllllllh.',
    '.hhhhhhhhhhhhh..'], [
    '................',
    '................',
    '................',
    '................',
    '................',
    'hhhhhhhhhhhhhhh.',
    'hwwwwwwwwwwwwwh.',
    'hww5wwwwgwwwwwh.',
    'hwwwwwQwwww5wwh.',
    'hwwwwwwwwwwwwwh.',
    'hlllllllllllllh.',
    '.hhhhhhhhhhhhh..']]);
  /* step pictograms: the hand action without words. Arrows are blue (h), things keep their food colours */
  function step(id, rows) { typed('step.' + id, 16, 16, 8, 13, rows); }
  step('slice', [
    '................',
    '.........dd.....',
    '........dwld....',
    '.......dwwld....',
    '......dwwlld....',
    '.....dwwlld.....',
    '....dwwlldUU....',
    '....dllldUFFU...',
    '....dddd.UFFU...',
    '..........UU....',
    '.PPPPPP.PPPPPP..',
    'PqqggggPPqggggP.',
    'PgggggGPPggggGP.',
    'PggggGGPPgggGGP.',
    '.PPPPPP..PPPPP..',
    '................']);
  step('stir', [
    '................',
    '....hhhhh.......',
    '..hh.....hh.....',
    '.h.........h..U.',
    '.h.......hhhhhU.',
    '..........hhhUF.',
    '...........hdUd.',
    '.iiiiiiiiiidndi.',
    'iwwwwwwwwwwdndwi',
    'iw5555555555d5wi',
    'iww5b555555b5wwi',
    '.iww55555555wwi.',
    '.ilwwwwwwwwwwli.',
    '..illlllllllli..',
    '...iiiiiiiiii...',
    '................']);
  step('pour', [
    '................',
    '..iiiiii........',
    '.iwwwwwwii......',
    '.iwwwwwwbbi.....',
    '.ilwwwwwibbk....',
    '..ilwwwi.kbk....',
    '...iiii..kbk....',
    '.........kbk....',
    '.........kbk....',
    '.........kbk....',
    '......kkkkbkkk..',
    '....kkb55bbb5bkk',
    '...kb5555555555k',
    '....kkbbbbbbbkk.',
    '......kkkkkkk...',
    '................']);
  step('flip', [
    '.......h........',
    '......hhh.......',
    '.....hhhhh......',
    '.......h........',
    '.......h........',
    '..kkkkkkkkkk....',
    '.k5544444443k...',
    'k454443444433k..',
    '.k4443444433kd..',
    '..kkkkkkkkkkdld.',
    '..dddddddddddld.',
    '.dwwwwwwlllllld.',
    '..ddddddddddUFU.',
    '............UFFU',
    '.............UFU',
    '..............U.']);
  step('crack', [
    '................',
    '......uuuu......',
    '....uuWWWQuu....',
    '...uWWWWWWQQu...',
    '..uWWWWWWWWQQu..',
    '..uWWWWWWWWQQu..',
    '.uWWWWUWWWWUQQu.',
    '.uWWWUWUWWUWUQu.',
    '.uUWUWWWUUWWWUu.',
    '.uWUWWWWWWWQQQu.',
    '.uWWWWWWWWQQQeu.',
    '.uWWWWWWWQQQQeu.',
    '..uWWWWWQQQQeu..',
    '...uuQQQQQeuu...',
    '.....uuuuuu.....',
    '................']);
  step('roll', [
    '................',
    '...hhhh.........',
    '..h....h........',
    '.......h.h......',
    '.......hhh......',
    '..kkkk.hh.......',
    '.k5544kkkkkkkkk.',
    'k546644555555553',
    'k464464444444443',
    'k466464444444443',
    'k446644444444433',
    '.k4444kkkkkkkkk.',
    '..kkkk..........',
    '................',
    '................',
    '................']);
  step('scoop', [
    '................',
    '....FFFFFF......',
    '..FFWWWWWWFF....',
    '.FWWWQWWWWWQF...',
    '.FWWWWWWQWWQF...',
    'FWQWWWWWWWQQeF..',
    'uEeeQQQQQQeeEu..',
    'uyEEEEEEEEEEAu..',
    '.uyyyyyyyyAAu...',
    '..uuyyyyyAuu....',
    '....uuyyAu......',
    '......uyyAu.....',
    '.......uyyAu....',
    '........uyyAu...',
    '.........uyAu...',
    '..........uu....']);
  step('sprinkle', [
    '................',
    '.........ddd....',
    '.......ddnnld...',
    '.....ddwwlnnd...',
    '....dwwwwwlnd...',
    '...dwwwwwwld....',
    '..dlwwwwwld.....',
    '..dnlwwwld......',
    '...ddlwld.......',
    '..W..ddd........',
    '....W..u........',
    '.u.....W..W.....',
    '...W..u.........',
    '.....W....u.....',
    '..u.....W.......',
    '................']);
  step('press', [
    '................',
    '.......FF.......',
    '......FWWF......',
    '......FWWQF.....',
    '.....FWWWQF.....',
    '.....FWWWWQF....',
    '.h...FWWWWQF..h.',
    '..h..FWWWWQF.h..',
    'hhhhFWWWWWQFhhhh',
    '..h.FWWWWWQQFh..',
    '.h..FWWWWQQQF.h.',
    '....FQQQQQQeF...',
    '.....FFFFFFF....',
    '................',
    '................',
    '................']);
  step('wrap', [
    '................',
    '......FFFF......',
    '.....FWWWWF.....',
    '....FWWWWWQF....',
    '....FWWWWWQF....',
    '...FWWWWWWWQF...',
    '..FWWWWWWWWQQF..',
    '..FWWTTTTTWQQF..',
    '.FWWWTtTTTWQQeF.',
    '.FWWWTtTTTWQQeF.',
    '.FQQQTtTTTQQeeF.',
    '..FFFTTTTTFFFF..',
    'h....TtTTT....h.',
    'hh...TTTTT..hhhh',
    '.hhhhhhhhhhhhhh.',
    '............h...']);
  step('wash', [
    '................',
    '...H.....H......',
    '..HCH...HCH..H..',
    '..HzH...HzH.HCH.',
    '...H..H..H..HzH.',
    '.....HCH.....H..',
    '.....HzGgG......',
    '......HgGGgg....',
    '....$rrGrrr$....',
    '...$crrrrrrr$...',
    '...$cWr5rr5rR$..',
    '...$rrrrrrrrR$..',
    '....$r5rr5rR$...',
    '.....$rrrrR$....',
    '......$rRR$.....',
    '.......$$.......']);
  step('thread', [
    '..............ay',
    '.............ay.',
    '............ay..',
    '......gGg..ay...',
    '....$$GGG$ay....',
    '...$crrGrrr$....',
    '..$cWrrrr5rR$...',
    '..$rr5rrrrrR$...',
    '..$rrrrr5rRR$...',
    '...$rr5rrRR$....',
    '...a$rrrRR$.....',
    '..ay.$$$$$......',
    '.ay.............',
    'ay..............',
    'y...............',
    '................']);
  step('glaze', [
    '................',
    '.....kkkkkk.....',
    '...kk555544kk...',
    '..k55W5444433k..',
    '.k5WW544$$$33k..',
    '.k45554$crr$3k..',
    '.k4444$cWrrr$k..',
    '..k43k$rrrrR$...',
    '..k43k$rr5rR$...',
    '..k44k.$rrR$....',
    '...kk...$R$.....',
    '.........$......',
    '................',
    '...kk...........',
    '..k54k..........',
    '...kk...........']);
  step('bake', [
    '................',
    '.dddddddddddddd.',
    'dllllllllllllllnd'.slice(0, 16),
    'dlnnlllllllnnlnd',
    'dllllllllllllllnd'.slice(0, 16),
    'dlddddddddddddnd',
    'dldSSSSSSSSSSdnd',
    'dldS22333322Sdnd',
    'dldS34555543Sdnd',
    'dldS34455443Sdnd',
    'dldSdddddddSSdnd',
    'dldddddddddddnnd',
    'dlnnnnnnnnnnnnnd',
    '.dddddddddddddd.',
    '..dd........dd..',
    '................']);
  step('spread', [
    '................',
    '............UU..',
    '...........UFFU.',
    '..........UFFU..',
    '.....dddddUFU...',
    '....dwwwwlldd...',
    '...dwwwwlld.....',
    '..FFWWWWdd......',
    '.FWWWWWWWWFFFF..',
    'FWWWWWWWQ555554k',
    'FQWWWWQQ5555544k',
    'k55QQQ555555444k',
    'k55555555554443k',
    'k54555455545443k',
    '.kkkkkkkkkkkkkk.',
    '................']);
  step('top', [
    '......gGg.......',
    '....$$GGG$$.....',
    '...$crrGrrr$....',
    '...$cWrrr5r$....',
    '...$rr5rrrR$....',
    '....$rrrrR$.....',
    '.....$$$$$......',
    '.......h........',
    '.....hhhhh......',
    '......hhh.......',
    '...FFFFhFFFF....',
    '.FFWWWWWWWWQFF..',
    'FWWWWWWWWWWQQQF.',
    'FQQWWWWWWQQQQeF.',
    '.FFFFFFFFFFFFF..',
    '................']);

  /* ================= cooking states: bowl, mixes, egg, greens, jug, pancake in the pan, omelette pan, whisk ================= */

  /* crescents inside an ellipse: character a on the upper-left edge band, b on the lower-right one (d = band width, '' = skip) */
  function jgShade(l, x, y, w, h, d, a, b) {
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) {
      if (!inE(i, j, w, h)) continue;
      if (b && !inE(i + d, j + d, w, h)) l.p(x + i, y + j, b);
      else if (a && !inE(i - d, j - d, w, h)) l.p(x + i, y + j, a);
    }
    return l;
  }
  /* a broken spiral of stirring streaks on a 56 x 32 mix */
  function jgSwirl(l, ch, phase, dash, t) {
    for (var i = 0; i < 150; i++) {
      if (i % dash < dash / 3) continue;
      var a = phase + i * 0.09, r = 2 + i * 0.082;
      l.r(Math.round(28 + r * 1.75 * Math.cos(a)), Math.round(16 + r * Math.sin(a)), t || 1, 1, ch);
    }
    return l;
  }
  function jgCrop(src, x0, x1) {
    var l = lay(x1 - x0, src.h), i, j, k;
    for (j = 0; j < src.h; j++) for (i = x0; i < x1; i++) { k = src.at(i, j); if (k) l.p(i - x0, j, String.fromCharCode(k)); }
    return l;
  }
  function jgEll(cx, cy, rx, ry) { var p = [], i; for (i = 0; i < 20; i++) p.push([cx + rx * Math.cos(i * 0.31416), cy + ry * Math.sin(i * 0.31416)]); return p; }

  /* ---- the mixing bowl: cream ceramic, a blue line on the thick rim, a blue outside ---- */
  def('bowl', 88, 68, 44, 40, 1, function (F) {
    var b = lay(84, 64);
    b.e(8, 15, 68, 49, 'H').e(8, 13, 68, 49, 'z');
    b.on('z').r(0, 0, 30, 64, 'C').r(60, 0, 24, 64, 'H').on();
    b.e(0, 1, 84, 56, 'e').e(0, 0, 84, 56, 'W');
    b.on('W').ring(2, 2, 80, 52, 1, 'z').on();
    jgShade(b, 0, 0, 84, 56, 2, '', 'Q');
    /* the well: far wall in the rim's shadow, near wall lit */
    b.e(5, 5, 74, 46, 'Q');
    jgShade(b, 5, 5, 74, 46, 5, 'e', 'W');
    jgShade(b, 5, 5, 74, 46, 1, 'E', '');
    b.on('Q').e(22, 24, 42, 20, 'W').e(26, 27, 38, 17, 'Q').on();
    F.put(b, 2, 2, OC, 0);
  });

  /* ---- pancake batter in the bowl ---- */
  def('mix.jeon', 60, 40, 30, 22, 4, function (F, f) {
    var l = lay(56, 32), i, x, y;
    if (f === 0) {
      l.e(0, 0, 56, 32, 'C');
      jgShade(l, 0, 0, 56, 32, 3, 'z', 'w');
      l.on('C').ln(28, 25, 38, 27, 'w').ln(18, 26, 23, 27, 'w').ln(40, 4, 46, 6, 'w').on();
      /* the flour heap */
      l.e(5, 6, 30, 20, 'z');
      l.ball(6, 3, 28, 20, 'W', 'Q', 'e', 4);
      l.p(13, 8, 'W').p(22, 12, 'W').p(27, 16, 'e').p(17, 18, 'e');
      /* chopped seaweed and green onion */
      l.e(35, 9, 17, 14, 'P').e(35, 8, 17, 13, 't');
      l.on('t');
      [[37, 12, 41, 10, 'G'], [43, 15, 48, 13, 'G'], [39, 18, 44, 17, 'P'], [45, 10, 48, 11, 'g'], [40, 14, 42, 15, 'g'], [46, 17, 49, 16, 'G']].forEach(function (s) { l.ln(s[0], s[1], s[2], s[3], s[4]); });
      l.p(42, 11, 'q').p(47, 15, 'q').p(38, 16, 'W').p(44, 19, 'W');
      l.on();
      l.p(33, 25, 'G').p(34, 25, 't').p(49, 24, 'G').p(31, 5, 't').p(32, 5, 'G');
    } else {
      l.e(0, 0, 56, 32, 'b');
      jgShade(l, 0, 0, 56, 32, 3, '6', 'B');
    }
    if (f === 1) {
      l.e(29, 10, 10, 5, 'C').p(31, 11, 'w').p(32, 11, 'w').e(20, 24, 10, 4, 'C').p(22, 25, 'w');
      [[9, 5, 10, 7], [23, 3, 9, 6], [16, 14, 11, 8], [36, 18, 9, 7], [6, 16, 8, 6], [41, 5, 8, 6]].forEach(function (b) { l.ball(b[0], b[1], b[2], b[3], 'W', 'Q', 'e', 2); });
      [[44, 13, 7, 5], [12, 24, 6, 4], [31, 4, 6, 4], [28, 18, 6, 4]].forEach(function (b) { l.e(b[0], b[1], b[2], b[3], 't'); l.p(b[0] + 2, b[1] + 1, 'G').p(b[0] + 3, b[1] + 2, 'g'); });
      l.on('b').ln(20, 10, 26, 12, 'B').ln(34, 26, 42, 25, 'B').ln(10, 13, 14, 12, 'B').on();
    }
    if (f === 2) {
      l.on('b6B');
      jgSwirl(l, 'W', 0, 18, 2); jgSwirl(l, 'B', 3.1, 14, 2);
      l.on('b6BW');
      for (i = 0; i < 16; i++) { var a = 1.5 + i * 0.83, r = 3 + i * 0.7; x = Math.round(28 + r * 1.75 * Math.cos(a)); y = Math.round(16 + r * Math.sin(a)); l.p(x, y, i % 3 ? 'G' : 't').p(x + 1, y, i % 2 ? 'g' : 'G'); }
      l.on();
    }
    if (f === 3) {
      l.on('b').e(11, 6, 16, 5, '6').e(13, 8, 16, 4, 'b').on();
      l.on('b6B');
      for (i = 0; i < 17; i++) { x = 5 + (i * 17) % 46; y = 4 + (i * 11) % 24; l.p(x, y, i % 3 ? 'G' : 't').p(x + 1, y + (i % 2), i % 2 ? 'g' : 'G'); }
      l.on();
    }
    F.put(l, 2, 3, OW, 0);
  });

  /* ---- eggs in the bowl ---- */
  def('mix.egg', 60, 40, 30, 22, 4, function (F, f) {
    var l = lay(56, 32);
    if (f < 2) {
      l.e(0, 0, 56, 32, '6');
      jgShade(l, 0, 0, 56, 32, 3, 'W', 'b');
      l.on('6').ln(36, 25, 44, 23, 'W').ln(8, 20, 12, 23, 'W').on();
    } else {
      l.e(0, 0, 56, 32, '5');
      jgShade(l, 0, 0, 56, 32, 3, '6', '4');
    }
    if (f === 0) {
      [[8, 8], [23, 15], [34, 4]].forEach(function (p) {
        l.e(p[0] - 2, p[1] - 1, 18, 14, 'W');
        l.ball(p[0], p[1], 14, 11, '5', '4', '3', 2);
        l.p(p[0] + 3, p[1] + 2, 'W').p(p[0] + 4, p[1] + 2, 'W').p(p[0] + 3, p[1] + 3, 'W');
      });
    }
    if (f === 1) {
      l.e(5, 8, 18, 10, '4').e(17, 13, 22, 12, '4').e(31, 4, 15, 10, '4');
      l.ln(20, 9, 32, 7, '4', 3).ln(36, 12, 44, 20, '4', 3).ln(8, 16, 14, 23, '4', 2);
      l.on('4').e(7, 9, 12, 5, '5').e(21, 15, 12, 5, '5').e(34, 5, 8, 4, '5').ln(38, 22, 30, 23, '3').ln(12, 16, 20, 17, '3').ln(40, 12, 44, 14, '3').on();
      l.ln(24, 11, 30, 10, 'W').ln(28, 21, 34, 20, 'W').p(9, 10, 'W').p(10, 10, 'W').p(36, 6, 'W');
    }
    if (f === 2) {
      l.on('56');
      jgSwirl(l, 'W', 0.6, 16, 2); jgSwirl(l, '4', 3.7, 12, 2);
      l.on();
    }
    if (f === 3) {
      l.on('5').e(11, 6, 16, 5, '6').e(13, 8, 16, 4, '5').on();
      l.p(38, 9, 'W').p(39, 9, '6').p(20, 22, 'W').p(21, 22, '6').p(44, 18, 'W').p(30, 14, '6');
      l.on('5').ln(30, 24, 40, 22, '4').ln(14, 16, 20, 18, '4').on();
    }
    F.put(l, 2, 3, OW, 0);
  });

  /* ---- an egg: whole, cracked, two shell halves ---- */
  function jgShell() {
    var l = lay(12, 12);
    l.e(0, 3, 12, 9, 'E').on('E').e(-1, 2, 11, 8, 'e').on();
    l.poly([[0, 4], [2, 1], [4, 4], [5, 0], [7, 3], [9, 0], [10, 3], [12, 2], [11, 7], [6, 9], [1, 7]], 'W');
    l.on('W').e(2, 3, 8, 5, 'Q').e(3, 4, 6, 3, 'e').on();
    return l;
  }
  def('egg', 24, 28, 12, 22, 3, function (F, f) {
    if (f < 2) {
      var l = lay(18, 23);
      l.e(2, 0, 14, 15, 'E').e(0, 5, 18, 18, 'E');
      l.on('E').e(0, -2, 14, 15, 'e').e(-2, 3, 18, 18, 'e').on();
      l.on('e').e(3, 3, 7, 9, 'Q').on().p(5, 5, 'W').p(5, 6, 'W').p(6, 4, 'W');
      if (f === 1) {
        [[1, 12, 4, 10], [4, 10, 6, 13], [6, 13, 9, 10], [9, 10, 11, 13], [11, 13, 14, 11], [14, 11, 16, 12]].forEach(function (s) { l.ln(s[0], s[1], s[2], s[3], 'u'); });
        l.p(6, 14, 'U').p(9, 9, 'u').p(11, 14, 'u').p(6, 12, 'W').p(11, 12, 'W');
      }
      F.put(l, 3, 3, 'Fuu', 0);
    } else {
      F.put(jgShell(), 2, 13, 'Fuu', 0);
      F.put(jgShell().flip(), 10, 8, 'Fuu', 1);
    }
  });

  /* ---- seaweed and green onion on the board ---- */
  function jgBundle() {
    var l = lay(60, 18), wv = [0, 0, 1, 1, 2, 2, 1, 1, 0, 0, -1, -1], x, y, s;
    for (x = 8; x < 60; x++) { y = 1 + wv[(x + 5) % 12]; l.r(x, y, 1, 4, 't').p(x, y, 'P'); }
    for (x = 2; x < 60; x++) { y = 11 + wv[x % 12]; l.r(x, y, 1, 5, 't').p(x, y, 'P'); if (x % 7 === 3) l.p(x, y + 2, 'G'); }
    for (s = 0; s < 3; s++) for (x = 0; x < 58 - s * 2; x++) {
      y = Math.round(4 + s * 3 + (s - 1) * x / 57 - (s === 0 ? x / 40 : 0));
      var c = x < 14 ? 'WWQ' : (x < 20 ? 'qqg' : 'qgG');
      l.p(x, y, c.charAt(0)).p(x, y + 1, c.charAt(1)).p(x, y + 2, c.charAt(2));
    }
    l.r(0, 5, 1, 7, 'E');
    l.r(16, 3, 2, 12, 'y').r(18, 3, 1, 12, 'A');
    return l;
  }
  def('greens', 72, 32, 36, 20, 4, function (F, f) {
    var b = jgBundle(), i, x, y;
    if (f === 0) F.put(b, 6, 8, OG, 0);
    if (f === 1) { F.put(jgCrop(b, 0, 22), 4, 8, OG, 0); F.put(jgCrop(b, 22, 60), 30, 9, OG, 0); }
    if (f === 2) { F.put(jgCrop(b, 0, 22), 3, 8, OG, 0); F.put(jgCrop(b, 22, 41), 28, 9, OG, 0); F.put(jgCrop(b, 41, 60), 50, 8, OG, 0); }
    if (f === 3) {
      var l = lay(50, 21);
      l.e(0, 5, 50, 16, 'P').e(8, 1, 18, 11, 'P').e(24, 0, 18, 12, 'P');
      l.on('P').e(-1, 4, 49, 15, 'G').e(7, 0, 18, 11, 'G').e(23, -1, 18, 12, 'G').on();
      l.on('*');
      for (i = 0; i < 44; i++) {
        x = 2 + (i * 13) % 45; y = 2 + (i * 7) % 17;
        if (i % 4 === 0) l.r(x, y, 3, 2, 'W').p(x + 2, y + 1, 'Q').p(x, y + 1, 'Q');
        else if (i % 4 === 1) l.r(x, y, 4, 2, 't').p(x, y, 'P').p(x + 1, y, 'P');
        else if (i % 4 === 2) l.r(x, y, 3, 3, 'g').p(x + 1, y + 1, 'q').p(x + 2, y + 2, 'G');
        else l.ln(x, y + 1, x + 3, y, 'q');
      }
      l.on();
      F.put(l, 11, 8, OG, 0);
      F.p(6, 24, 'g').p(7, 24, 'G').p(64, 22, 't').p(65, 22, 'P').p(63, 27, 'W').p(64, 27, 'Q');
    }
  });

  /* ---- the pouring jug ---- */
  function jgJug(c, s, ox, oy, pour) {
    var l = lay(44, 44);
    function R(pts) { return rot(pts, 21, 23, c, s).map(function (p) { return [p[0] + ox, p[1] + oy]; }); }
    function L(a, b, ch, t) { var p = R([a, b]); l.ln(Math.round(p[0][0]), Math.round(p[0][1]), Math.round(p[1][0]), Math.round(p[1][1]), ch, t); }
    L([29, 14], [35, 16], 'c', 3); L([35, 16], [35, 25], 'c', 3); L([35, 25], [29, 28], 'r', 3);
    L([30, 14], [35, 16], '=', 1);
    l.poly(R([[11, 11], [31, 11], [30, 33], [12, 33]]), 'Q').poly(R(jgEll(21, 33, 9, 3.5)), 'Q');
    l.on('Q').poly(R([[5, 22], [37, 22], [37, 27], [5, 27]]), 'c').poly(R([[5, 29], [37, 29], [37, 30.5], [5, 30.5]]), 'c').on();
    l.on('Qc').poly(R([[25, 8], [34, 8], [34, 40], [24, 40]]), '-').on();
    l.on('Q').poly(R([[12.5, 12], [15.5, 12], [15.5, 35], [13.5, 35]]), 'W').on();
    l.poly(R([[12, 7], [4, 8], [12, 16]]), 'W');
    l.poly(R(jgEll(21, 11, 10.5, 4.5)), 'W');
    l.poly(R(jgEll(21, 11.5, 9, 3.3)), 'e');
    if (pour) {
      l.poly(R(jgEll(18, 11.5, 8, 3)), 'b').poly(R([[13, 9], [5, 8.5], [13, 14]]), 'b');
      var t = R([[5, 8.5]])[0], tx = Math.round(t[0]), ty = Math.round(t[1]);
      l.r(tx - 1, ty, 3, 12, 'b').r(tx - 1, ty + 12, 3, 1, 'B').p(tx - 1, ty + 2, '6').p(tx - 1, ty + 3, '6').p(tx - 1, ty + 4, '6').r(tx + 1, ty + 3, 1, 9, 'B');
    } else {
      l.on('e').poly(R(jgEll(21, 12.8, 8, 2.2)), 'b').on();
    }
    return l;
  }
  def('jug', 44, 44, 22, 34, 2, function (F, f) {
    if (f === 0) F.put(jgJug(1, 0, 1, 0, false), 0, 0, OC, 0);
    else F.put(jgJug(0.85, -0.53, 5, 1, true), 0, 0, OC, 0);
  });

  /* ---- the pancake in the round pan: one painter, three colour sets ---- */
  var JG_RAW = ['6', 'b', 'B', 'b', 'B'], JG_GOLD = ['5', '4', '3', '2', '1'], JG_CRISP = ['4', '3', '2', '1', '0'];
  function jgJeon(w, h, C, raw) {   /* C = [light, base, blotch, rim, side] */
    var l = lay(w, h + 2), i, a, cx = w / 2, cy = h / 2, n = w > 40 ? 14 : 8, k = w / 70;
    function blob(ch, dy) {
      l.e(2, 2 + dy, w - 4, h - 4, ch);
      for (i = 0; i < n; i++) {
        a = i * 6.2832 / n + 0.3;
        var bw = Math.round((i % 3 ? 10 : 14) * (0.5 + k / 2)), bh = Math.round(bw * 0.62);
        l.e(Math.round(cx + (cx - bw / 2) * Math.cos(a) - bw / 2), Math.round(cy + (cy - bh / 2) * Math.sin(a) - bh / 2) + dy, bw, bh, ch);
      }
    }
    function E(x, y, bw, bh, ch) { l.e(Math.round(x * w), Math.round(y * h), Math.max(2, Math.round(bw * w)), Math.max(2, Math.round(bh * h)), ch); }
    blob(C[4], 2); blob(C[3], 0);
    l.on(C[3]).e(4, 3, w - 8, h - 7, C[1]).on();
    if (raw) {
      l.on(C[1]);
      E(0.16, 0.16, 0.3, 0.16, C[0]); E(0.2, 0.22, 0.3, 0.14, C[1]); E(0.52, 0.12, 0.2, 0.1, C[0]); E(0.54, 0.17, 0.2, 0.08, C[1]);
      E(0.5, 0.74, 0.34, 0.14, C[2]); E(0.48, 0.7, 0.34, 0.13, C[1]);
      l.on();
      l.p(Math.round(w * 0.3), Math.round(h * 0.26), 'W').p(Math.round(w * 0.3) + 1, Math.round(h * 0.26), 'W');
    } else {
      l.on(C[1]);
      [[0.12, 0.3, 0.24, 0.26], [0.5, 0.14, 0.3, 0.24], [0.3, 0.56, 0.34, 0.28], [0.68, 0.5, 0.2, 0.26], [0.42, 0.36, 0.12, 0.12]].forEach(function (b) { E(b[0], b[1], b[2], b[3], C[2]); });
      l.on(C[1] + C[2]);
      [[0.2, 0.14, 0.22, 0.14], [0.36, 0.34, 0.18, 0.16], [0.66, 0.26, 0.14, 0.16], [0.14, 0.58, 0.14, 0.14], [0.56, 0.7, 0.2, 0.12], [0.8, 0.44, 0.08, 0.14]].forEach(function (b) { E(b[0], b[1], b[2], b[3], C[0]); });
      l.on();
      /* the lacy rim: dark crumbs just inside the edge, light gaps on it */
      for (i = 0; i < 34; i++) {
        a = i * 0.1848 + 0.1;
        l.on(C[1] + C[2] + C[0]).p(Math.round(cx + (cx - 6 - (i % 3)) * Math.cos(a)), Math.round(cy + (cy - 5 - (i % 2)) * Math.sin(a)), C[3]).on();
        if (i % 2) l.on(C[3]).p(Math.round(cx + (cx - 2.5) * Math.cos(a)), Math.round(cy + (cy - 2.5) * Math.sin(a)), C[2]).on();
      }
      l.p(Math.round(w * 0.27), Math.round(h * 0.2), '6').p(Math.round(w * 0.27) + 1, Math.round(h * 0.2), '6');
    }
    /* seaweed strands */
    l.on(C[0] + C[1] + C[2]);
    [[0.25, 0.3, 0.33, 0.24], [0.5, 0.42, 0.6, 0.48], [0.38, 0.72, 0.48, 0.66], [0.7, 0.64, 0.78, 0.6], [0.6, 0.22, 0.67, 0.28], [0.16, 0.6, 0.24, 0.66], [0.82, 0.4, 0.86, 0.5], [0.43, 0.18, 0.5, 0.14], [0.3, 0.48, 0.38, 0.5], [0.58, 0.8, 0.66, 0.78]].forEach(function (s, j) {
      if (w < 40 && j % 2) return;
      var x0 = Math.round(s[0] * w), y0 = Math.round(s[1] * h), x1 = Math.round(s[2] * w), y1 = Math.round(s[3] * h);
      l.ln(x0, y0, x1, y1, raw ? 'G' : 'P').p(x0, y0, raw ? 'g' : 'G').p(x1, y1, 't');
    });
    l.on();
    return l;
  }
  def('jeon.pan', 76, 56, 38, 30, 5, function (F, f) {
    var w = [26, 48, 70, 70, 70][f], h = [16, 30, 42, 42, 42][f];
    F.put(jgJeon(w, h, f < 3 ? JG_RAW : (f === 3 ? JG_GOLD : JG_CRISP), f < 3), 38 - w / 2, 30 - h / 2 - 1, OW, 0);
  });

  /* ---- the rectangular omelette pan ---- */
  def('pan.square', 100, 76, 50, 42, 1, function (F) {
    var p = lay(96, 72);
    p.rr(6, 12, 84, 58, 7, 'D').rr(6, 9, 84, 58, 7, 'N').rr(8, 11, 80, 54, 6, 'D');
    p.on('N').r(6, 9, 84, 1, 'n').r(6, 9, 1, 50, 'n').r(87, 20, 3, 47, 'd').r(10, 65, 80, 2, 'd').on();
    p.rr(12, 16, 72, 48, 4, 'd');
    /* the oiled sheen on the floor */
    p.on('d');
    p.poly([[16, 36], [42, 16], [52, 16], [16, 46]], 'N').poly([[50, 64], [84, 38], [84, 43], [57, 64]], 'N');
    p.ln(20, 36, 40, 20, 'n').ln(24, 36, 34, 28, 'n').ln(62, 60, 80, 46, 'n');
    p.on();
    p.p(30, 26, 'l').p(31, 25, 'l').p(32, 24, 'l');
    p.on('D').r(12, 12, 72, 2, 'd').on();
    F.put(p, 2, 2, OS, 0);
    /* the wooden handle stub, riveted on the near right corner */
    var h = lay(100, 76);
    h.poly([[83, 64], [89, 58], [97, 66], [91, 72]], 'A');
    h.on('A').ln(89, 60, 95, 66, 'y').ln(85, 65, 91, 71, 'a', 2).poly([[83, 64], [89, 58], [91, 60], [85, 66]], 'm').on();
    h.on('m').ln(88, 60, 90, 60, 'l').on();
    F.put(h, 0, 0, OD, 1);
  });

  /* ---- the egg in the square pan ---- */
  function jgSheet(w, raw) {
    var l = lay(raw ? 68 : w, 45), i;
    if (raw) {
      l.rr(0, 0, Math.min(w, 68), 44, 6, '5');
      if (w < 68) l.e(w - 9, 1, 15, 15, '5').e(w - 6, 13, 17, 18, '5').e(w - 10, 28, 15, 15, '5');
      l.on('5');
      for (i = 0; i < 6; i++) l.ln(3 + i * 12, 40 - (i % 2) * 7, 13 + i * 12, 31 - (i % 2) * 7, '4', 2).ln(8 + i * 12, 20 + (i % 3) * 3, 14 + i * 12, 16 + (i % 3) * 3, '4', 2);
      for (i = 0; i < 6; i++) l.ln(4 + i * 12, 10 + (i % 2) * 3, 11 + i * 12, 5 + (i % 2) * 3, '6', 2);
      l.on();
      l.on('6').p(7, 8, 'W').p(8, 7, 'W').p(31, 8, 'W').p(32, 7, 'W').p(55, 8, 'W').p(56, 7, 'W').on();
    } else {
      l.rr(0, 1, w, 44, 5, '3').rr(0, 0, w, 44, 5, '4').rr(1, 1, w - 2, 42, 4, '5');
      l.on('5');
      l.e(4, 4, 20, 11, '6').e(30, 7, 22, 10, '6').e(10, 24, 24, 12, '6').e(42, 25, 20, 11, '6').e(54, 5, 10, 8, '6');
      l.on('56');
      l.e(25, 19, 6, 4, '4').e(47, 19, 5, 3, '4').e(6, 18, 5, 3, '4').e(36, 36, 6, 3, '4').e(58, 16, 5, 4, '4');
      l.p(27, 20, '3').p(8, 19, '3').p(38, 37, '3');
      l.p(14, 10, 'g').p(15, 10, 'G').p(40, 28, 'g').p(41, 28, 'G').p(20, 32, 'c').p(50, 12, 'c').p(60, 34, 'g').p(33, 14, 'c');
      l.on();
    }
    return l;
  }
  function jgRoll(w) {
    var l = lay(w, 49), i;
    l.rr(0, 0, w, 49, 4, '4');
    l.on('4').rr(0, 0, w - 3, 42, 4, '5').on();
    l.on('5').r(2, 3, 3, 35, '6').ln(w - 8, 1, w - 8, 40, '4').on();
    l.p(3, 5, 'W').p(3, 6, 'W').p(3, 7, 'W');
    l.on('4').r(w - 1, 2, 1, 45, '3').on();
    for (i = 0; i < 4; i++) l.on('5').p(6 + (i * 5) % (w - 12), 8 + i * 9, i % 2 ? 'c' : 'g').on();
    /* the near end: rolled layers */
    l.r(0, 40, w, 1, '3');
    l.rr(1, 41, w - 2, 7, 3, '6');
    l.ln(3, 43, w - 4, 43, '4').ln(w - 4, 43, w - 4, 45, '3').ln(w - 4, 45, 5, 45, '3');
    if (w > 15) l.p(3, 44, '4').r(6, 44, w - 13, 1, 'W');
    return l;
  }
  def('gyeran.pan', 84, 60, 42, 32, 7, function (F, f) {
    if (f < 3) F.put(jgSheet([24, 46, 68][f], true), 8, 10, OW, 0);
    if (f === 3) F.put(jgSheet(68, false), 8, 10, OW, 0);
    if (f === 4) { F.put(jgSheet(46, false), 18, 10, OW, 0); F.put(jgRoll(14), 8, 8, OW, 2); }
    if (f === 5) { F.put(jgSheet(24, false), 22, 10, OW, 0); F.put(jgRoll(18), 8, 7, OW, 2); }
    if (f === 6) F.put(jgRoll(22), 8, 6, OW, 0);
  });

  /* ---- the omelette log on the board: oblique pieces, the right-hand cut faces show the spiral ---- */
  function jgLog(w, cut) {
    var l = lay(w + 8, 19);
    function fp(u, v) { return [w + u, Math.round(6 - u * 5 / 8 + v)]; }
    function fl(a, b, ch) { var p = fp(a[0], a[1]), q = fp(b[0], b[1]); l.ln(p[0], p[1], q[0], q[1], ch); }
    l.poly([[0, 6], [w, 6], [w + 8, 1], [8, 1]], '5');
    l.on('5').poly([[5, 4], [w + 2, 4], [w + 5, 2], [8, 2]], '6').on();
    l.r(0, 6, w, 12, '4').r(0, 6, w, 2, '5').r(0, 15, w, 3, '3');
    l.poly([[w, 6], [w + 8, 1], [w + 8, 13], [w, 18]], cut ? '6' : '5');
    fl([0, 0], [7, 0], '4'); fl([7, 0], [7, 11], '3'); fl([0, 11], [7, 11], '3'); fl([0, 0], [0, 11], '4');
    fl([2, 8], [2, 3], '4'); fl([2, 3], [5, 3], '4'); fl([5, 3], [5, 8], '3'); fl([5, 8], [4, 8], '3'); fl([4, 8], [4, 6], '4');
    if (w > 8) l.p(3, 11, 'g').p(w - 3, 9, 'c'); else l.p(2, 10, 'g');
    if (w > 20) l.p(w >> 1, 12, 'g').p((w >> 1) + 1, 12, 'G').p(12, 3, 'c').p(w - 9, 13, 'c').p(w - 12, 3, 'W').p(w - 11, 3, 'W');
    return l;
  }
  def('gyeran.board', 76, 40, 38, 26, 4, function (F, f) {
    var ws = [[56], [14, 41], [14, 14, 26], [10, 10, 10, 10]][f], gap = f === 3 ? 7 : 3, tot = 8 + gap * (ws.length - 1), x, i;
    ws.forEach(function (w) { tot += w; });
    x = (76 - tot) >> 1;
    for (i = 0; i < ws.length; i++) { F.put(jgLog(ws[i], i < ws.length - 1), x, 10 + (f === 3 ? i % 2 : 0), OW, 0); x += ws[i] + gap; }
  });

  /* ---- the whisk: wooden handle up, wire balloon down ---- */
  def('whisk', 28, 44, 14, 40, 1, function (F) {
    var w = lay(22, 26);
    w.ring(0, 0, 22, 26, 1, 'l').ring(5, 0, 12, 26, 1, 'l').ln(11, 0, 11, 25, 'l');
    w.on('l').r(13, 0, 9, 26, 'm').r(0, 16, 22, 10, 'm').r(12, 18, 10, 8, 'n').on();
    w.p(2, 8, 'w').p(2, 9, 'w').p(6, 6, 'w');
    F.put(w, 3, 15, OS, 0);
    var h = lay(6, 17);
    h.rr(0, 0, 6, 17, 2, 'A').r(1, 1, 1, 11, 'y').r(4, 1, 2, 12, 'a').r(0, 13, 6, 4, 'm').r(0, 13, 2, 4, 'l').r(5, 13, 1, 4, 'n');
    F.put(h, 11, 2, OD, 0);
  });

  /* ================= cooking states: rice (jumeokbap) and fruit (kkochi) ================= */

  /* n scattered points in the box (fixed pattern k); the caller sets the clip */
  function rfDots(l, x, y, w, h, n, ch, k) {
    for (var i = 0; i < n; i++) l.p(x + ((i * 37 + k * 11) % 101) * w / 101 | 0, y + ((i * 53 + k * 29) % 97) * h / 97 | 0, ch);
    return l;
  }
  /* a round pot from above: rim ellipse w x h, side wall, two handles. c = [rim light, rim, wall light, wall, wall dark, inside].
     The layer is (w + 14) x (h + wall); the inside is the ellipse (10, 2, w - 6, h - 5) painted c[5]. */
  function rfPot(w, h, wall, c) {
    var l = lay(w + 14, h + wall), x = 7, hy = (h >> 1) - 2;
    l.rr(0, hy, 10, 8, 3, c[3]).r(2, hy + 1, 6, 2, c[2]).rr(w + 4, hy, 10, 8, 3, c[4]).r(w + 6, hy + 1, 6, 2, c[3]);
    l.e(x, wall, w, h, c[3]).r(x, h >> 1, w, wall, c[3]);
    l.on(c[3]).r(x, 0, w / 5 | 0, h + wall, c[2]).r(x + w - (w / 4 | 0), 0, w / 4 | 0, h + wall, c[4]).on();
    l.e(x, 0, w, h, c[1]);
    l.on(c[1]).e(x, 0, w - 7, h - 6, c[0]).on();
    l.e(x + 3, 2, w - 6, h - 5, c[5]);
    return l;
  }

  /* ---- the mixing bowl's contents: rice, then salt and sesame worked in ---- */
  def('mix.rice', 60, 40, 30, 22, 3, function (F, f) {
    var l = lay(56, 32);
    l.e(0, 0, 56, 32, 'e').e(0, 0, 54, 30, 'Q');
    l.on('Q').e(3, 1, 46, 25, 'W').on();
    l.on('W'); rfDots(l, 5, 3, 42, 21, 30, 'Q', 1);
    l.on('Q'); rfDots(l, 2, 3, 52, 27, 26, 'W', 2); rfDots(l, 30, 16, 24, 14, 10, 'e', 3);
    l.on();
    /* grains: short strokes one tone down, staggered */
    l.on('W'); for (var gy = 3; gy < 29; gy += 3) for (var gx = 3 + (gy * 5) % 7; gx < 54; gx += 7) l.p(gx, gy, 'Q').p(gx + 1, gy, 'Q').p(gx + 1, gy + 1, 'Q'); l.on();
    l.on('Q'); for (gy = 4; gy < 31; gy += 3) for (gx = 1 + (gy * 3) % 7; gx < 56; gx += 7) l.p(gx, gy, 'e').p(gx + 1, gy, 'e'); l.on();
    if (f === 0) {
      /* a heap of sesame and salt on top */
      l.e(20, 9, 21, 11, 'E').ball(18, 6, 21, 12, '6', 'y', 'A', 3);
      l.on('6yA'); rfDots(l, 19, 7, 19, 10, 12, 'a', 4); rfDots(l, 19, 6, 16, 8, 9, 'W', 5); l.on();
      l.p(15, 14, 'A').p(41, 12, 'A').p(30, 20, 'y');
    } else if (f === 1) {
      /* half mixed: the heap dragged into a swirl */
      l.on('WQ').ring(12, 5, 32, 19, 2, 'y').ring(20, 9, 16, 10, 2, '6').e(8, 12, 9, 6, 'W').e(34, 4, 10, 6, 'W').on();
      l.on('y6'); rfDots(l, 12, 5, 32, 19, 30, 'A', 6); l.on();
      l.on('WQ'); rfDots(l, 10, 5, 36, 20, 12, 'A', 7); l.on();
    } else {
      /* glossy seasoned rice: sesame everywhere, an oil sheen, glints */
      l.on('W').e(7, 3, 22, 9, '6').e(9, 5, 20, 7, 'W').on();
      l.on('Q').ring(8, 6, 44, 24, 1, '6').on();
      l.on('WQ6'); rfDots(l, 4, 3, 48, 26, 34, 'A', 8); rfDots(l, 6, 4, 44, 24, 12, 'a', 9); l.on();
      l.p(12, 6, 'W').p(13, 6, 'W').p(12, 7, 'W').p(27, 9, 'W').p(28, 9, 'W').p(38, 15, 'W').p(20, 18, 'W');
    }
    F.put(l, 2, 3, 'FuU', 0);
  });

  /* ---- the rice pot: full and steaming, then one, two, three scoops taken ---- */
  def('pot.rice', 76, 60, 38, 38, 4, function (F, f) {
    var p = rfPot(56, 34, 10, 'mnnNdD'), d = 1 + f * 2;
    p.on('D').e(10, 2 + d, 50, 29, 'Q').on();
    p.on('Q').e(11, 2 + d, 45, 24, 'W').on();
    p.on('D').r(10, 0, 24, 20, 'd').on();
    [[35, 14], [17, 9], [25, 19]].slice(0, f).forEach(function (h) {
      p.on('WQ').e(h[0], h[1] + d, 17, 10, 'E').on();
      p.on('E').e(h[0] + 2, h[1] + d + 2, 16, 9, 'e').on();
      p.on('e').e(h[0] + 5, h[1] + d + 4, 12, 6, 'Q').on();
    });
    p.on('W'); rfDots(p, 12, 4, 44, 26, 34, 'Q', 1);
    p.on('Q'); rfDots(p, 12, 6, 48, 26, 22, 'W', 2); p.on();
    F.put(p, 3, 11, OS, 0);
    /* steam, less of it as the pot empties */
    var st = lay(4, 9); st.rows(0, 0, ['.W..', 'W...', 'Wv..', '.Wv.', '..Wv', '..Wv', '.Wv.', 'W...', 'W...']);
    [[36, 3], [22, 6], [50, 5]].slice(0, 3 - f).forEach(function (s) { F.put(st, s[0], s[1], '', 0); });
  });

  /* ---- rice paddle ---- */
  def('paddle', 28, 36, 14, 30, 2, function (F, f) {
    var l = lay(22, 29);
    l.rr(8, 13, 6, 16, 2, 'E').r(8, 14, 2, 13, 'e').r(12, 14, 2, 14, 'f').r(10, 25, 2, 2, 'u');
    l.e(1, 0, 20, 18, 'f').e(1, 0, 19, 17, 'E').e(2, 1, 15, 13, 'e');
    l.on('e').ring(4, 3, 13, 11, 1, 'E').on();
    if (!f) l.p(6, 4, 'W').p(7, 4, 'W').p(6, 5, 'W');
    F.put(l, 3, 3, 'FuU', 0);
    if (f) {
      var r = lay(16, 13);
      r.e(0, 2, 16, 11, 'e').ball(0, 1, 16, 11, 'W', 'W', 'Q', 3).e(3, 0, 8, 6, 'W').e(8, 1, 7, 6, 'W');
      r.on('W'); rfDots(r, 2, 2, 11, 7, 7, 'Q', 3); r.on();
      F.put(r, 6, 4, 'FuU', 2);
    }
  });

  /* ---- salt and sesame shaker ---- */
  def('shaker', 20, 32, 10, 28, 1, function (F) {
    var b = lay(14, 18);
    b.rr(0, 0, 14, 18, 3, 'C');
    b.on('C').r(0, 7, 14, 11, 'Q').r(11, 0, 3, 7, 'z').on();
    b.on('Q').r(10, 7, 4, 11, 'e').r(1, 7, 12, 1, 'W').on();
    b.on('Qe'); rfDots(b, 1, 9, 12, 8, 14, 'a', 2); rfDots(b, 1, 9, 12, 8, 8, 'A', 5); b.on();
    b.r(2, 2, 1, 4, 'W').r(2, 9, 1, 6, 'W').r(1, 17, 12, 1, 'z');
    F.put(b, 3, 11, 'Hhi', 0);
    var c = lay(14, 9);
    c.rr(0, 2, 14, 7, 2, 'm').e(0, 0, 14, 7, 'l');
    c.on('m').r(0, 5, 3, 4, 'l').r(11, 5, 3, 4, 'n').p(4, 7, 'n').p(6, 7, 'n').p(8, 7, 'n').p(10, 7, 'N').on();
    c.on('l').e(1, 0, 9, 4, 'w').on();
    c.p(4, 2, 'N').p(7, 1, 'N').p(9, 3, 'N').p(6, 4, 'N').p(11, 2, 'N');
    F.put(c, 3, 3, OS, 1);
  });

  /* ---- shaping the rice ball on the board ---- */
  function rfTri(tri, dx, dy) {   /* the riceBall() triangle without its seaweed; same 34 x 32 layer */
    var l = lay(34, 32), ox = 4, oy = 5;
    function O(pts) { return pts.map(function (p) { return [p[0] + ox, p[1] + oy]; }); }
    l.poly(O(tri.map(function (p) { return [p[0] + dx, p[1] + dy]; })), 'e');
    l.on('e').poly(O([[5, -3], [20, -3], [27, 9], [21, 9]]), 'Q').on();
    l.poly(O(tri), 'W');
    l.on('W').poly(O([[12, 17], [24, 15], [24, 23], [-1, 23], [-1, 20]]), 'Q').on();
    return l;
  }
  def('rice.shape', 60, 48, 30, 32, 5, function (F, f) {
    var l, g;
    if (f === 0) {
      /* a loose mound, grains straying */
      l = lay(46, 22);
      l.e(2, 9, 43, 13, 'e').e(0, 7, 26, 13, 'Q').e(13, 3, 26, 17, 'Q').e(24, 8, 21, 12, 'Q').e(6, 13, 30, 8, 'Q');
      l.e(1, 7, 20, 9, 'W').e(14, 3, 21, 11, 'W').e(25, 8, 15, 7, 'W').e(9, 11, 22, 6, 'W');
      l.on('W'); rfDots(l, 2, 4, 38, 13, 26, 'Q', 1); l.on('Q'); rfDots(l, 4, 12, 40, 9, 16, 'e', 2); rfDots(l, 4, 12, 40, 9, 10, 'W', 4); l.on();
      F.put(l, 7, 14, 'FuU', 2);
      g = lay(2, 1); g.r(0, 0, 2, 1, 'W');
      [[5, 30], [52, 37], [44, 12], [12, 38], [55, 22]].forEach(function (p) { F.put(g, p[0], p[1], 'FuU', 0); });
    } else if (f === 1) {
      /* pressed into a rounder ball */
      l = lay(34, 26);
      l.e(1, 3, 33, 23, 'e').ball(0, 0, 33, 25, 'W', 'W', 'Q', 5);
      l.on('W'); rfDots(l, 3, 3, 24, 16, 14, 'Q', 1); l.on('Q'); rfDots(l, 8, 14, 22, 10, 8, 'e', 2); l.on();
      F.put(l, 13, 10, 'FuU', 2);
      g = lay(2, 1); g.r(0, 0, 2, 1, 'W');
      F.put(g, 7, 34, 'FuU', 0); F.put(g, 51, 30, 'FuU', 0);
    } else if (f === 2) {
      /* a soft triangle: round corners, bulging sides, still low */
      l = rfTri([[7, 3], [11, 1], [16, 3], [22, 12], [24, 17], [22, 21], [18, 23], [5, 23], [1, 21], [-1, 17], [1, 12]], 3, -1);
      l.on('W'); rfDots(l, 6, 9, 18, 14, 8, 'Q', 3); l.on();
      F.put(l, 13, 7, 'FuU', 2);
    } else if (f === 3) {
      l = rfTri([[9, 0], [14, 0], [23, 16], [23, 19], [20, 22], [3, 22], [0, 19], [0, 16]], 5, -2);
      F.put(l, 13, 7, 'FuU', 2);
    } else {
      F.put(riceBall(1, 0), 13, 7, 'FuU', 2);
    }
  });

  /* ---- one strip of seaweed ---- */
  def('gim', 24, 32, 12, 26, 1, function (F) {
    var l = lay(18, 26);
    l.poly([[3, 0], [18, 2], [16, 26], [1, 24]], 'T');
    l.on('T').poly([[4, 1], [9, 2], [7, 25], [2, 24]], 't').ln(13, 3, 12, 24, 't').on();
    l.on('t').ln(5, 2, 3, 23, '8').p(7, 6, 'T').p(5, 12, 'T').p(6, 19, 'T').p(4, 16, 'T').on();
    l.on('T').p(11, 6, '8').p(14, 12, '8').p(10, 17, '8').p(13, 21, '8').p(15, 5, 't').p(10, 11, 't').on();
    F.put(l, 3, 3, 'P77', 0);
  });

  /* ---- the basin of clear water ---- */
  def('basin', 100, 68, 50, 40, 1, function (F) {
    var l = lay(94, 56);
    l.e(0, 4, 94, 52, 'n').r(0, 26, 94, 4, 'n');
    l.on('n').r(0, 0, 22, 56, 'm').r(71, 0, 23, 56, 'N').on();
    l.e(0, 0, 94, 52, 'l');
    l.on('l').e(0, 0, 87, 46, 'w').on();
    l.e(3, 2, 88, 47, 'm');
    l.on('m').r(52, 0, 44, 28, 'n').r(3, 0, 26, 30, 'l').on();
    l.on('mnl').e(4, 7, 86, 44, 'z').on();
    l.on('z').e(5, 9, 84, 44, 'C').on();
    /* ripples and a glint */
    l.on('C').ring(14, 13, 40, 14, 1, 'w').e(13, 15, 42, 14, 'C').ring(48, 30, 34, 12, 1, 'z').e(46, 28, 35, 12, 'C');
    l.ln(60, 16, 74, 18, 'w').ln(24, 38, 40, 41, 'w').ln(66, 24, 76, 25, 'z').ln(16, 30, 24, 32, 'z').on();
    l.p(22, 17, 'W').p(23, 17, 'W').p(22, 18, 'W').p(27, 16, 'W');
    F.put(l, 3, 9, OS, 0);
  });

  /* ---- fruit ---- */
  function rfMandarin() {   /* a whole tangerine in its peel, 16 x 15 */
    var t = lay(16, 15);
    t.ball(0, 1, 16, 14, '4', '3', '2', 3);
    t.on('3'); rfDots(t, 3, 5, 10, 8, 7, '2', 2); t.on();
    t.rows(5, 0, ['.gG...', 'ggGGg.', '.gGg..']).p(4, 5, 'W').p(5, 5, 'W').p(4, 6, 'W').p(3, 8, '5');
    return t;
  }
  function rfPeeled() {   /* the tangerine out of its peel, 16 x 14: pale segments */
    var t = lay(16, 14);
    t.ball(0, 0, 16, 14, '5', '4', '3', 3);
    t.on('543').ln(8, 1, 3, 11, '3').ln(8, 1, 8, 13, '3').ln(8, 1, 13, 10, '2').on();
    t.p(7, 1, '6').p(8, 1, '6').p(8, 2, '6').p(4, 4, 'W').p(5, 4, 'W').p(4, 5, 'W');
    return t;
  }
  function rfBerryCut() {   /* a strawberry with its top cut off, 12 x 12 */
    var b = lay(12, 12);
    b.rows(0, 0, [
      '..=====rr...',
      '.c==W===rrr.',
      'cc======rrrR',
      'ccrrrrrrrrrR',
      'c=Wrrrr5rrRR',
      'crrr5rrrrrRR',
      '.rrrrrr5rRR.',
      '.rr5rrrrrRR.',
      '..rrrr5rRR..',
      '...rrrrRR...',
      '....rrRR....',
      '.....RR.....']);
    return b;
  }
  function rfBerryHalf() {   /* a bite of strawberry, cut face up, 9 x 8 */
    var b = lay(9, 8);
    b.rows(0, 0, ['..rrrr...', '.rr===rr.', 'rr=====rR', 'r==WW==rR', 'r==W===rR', '.r====rR.', '..rrrrR..', '...RRR...']);
    return b;
  }
  function rfGrapeHalf() {   /* a bite of green grape, cut face up, 9 x 8 */
    var g = lay(9, 8);
    g.e(0, 0, 9, 8, 'G').e(0, 0, 9, 7, 'g').e(1, 1, 7, 5, 'q').p(4, 3, 'g').p(5, 3, 'g').p(2, 2, 'W').p(3, 2, 'W');
    return g;
  }
  function rfTangSeg() {   /* one tangerine segment, 11 x 6 */
    var t = lay(11, 6);
    t.rows(0, 0, ['.4455544...', '45W6555544.', '45565555443', '.455545443.', '..4444433..', '....333....']);
    return t;
  }
  function rfCap() { var c = lay(7, 4); c.rows(0, 0, ['.g.G.g.', 'gggGggg', '.gGGGg.', '..GGG..']); return c; }

  /* dull = 2: dusty, no shine; 1: plain; 0: as painted */
  function rfDull(l, dull, k) {
    l = l.copy();
    if (dull) l.map({ W: '5', '=': 'c' });
    if (dull > 1) { l.map({ c: 'r', q: 'g', '5': '4', '6': '4', g: 'G' }); l.on('*'); rfDots(l, 1, 1, l.w - 2, l.h - 2, 7, 'u', k); rfDots(l, 1, 1, l.w - 2, l.h - 2, 4, 'f', k + 3); l.on(); }
    else if (dull) { l.on('*'); rfDots(l, 1, 3, l.w - 2, l.h - 4, 2, 'u', k); l.on(); }
    return l;
  }
  def('fruit.wash', 68, 44, 34, 24, 3, function (F, f) {
    var dull = 2 - f, list = [
      [rfMandarin(), 27, 5, OW], [strawberry(), 9, 14, OR], [strawberry(), 47, 13, OR],
      [grape(), 20, 25, OG], [grape(), 40, 25, OG], [grape(), 30, 28, OG]];
    list.forEach(function (o, i) {
      var l = o[0], x = o[1], y = o[2], ry = y + l.h - 6;
      /* the water ring around the fruit */
      F.ring(x - 4, ry, l.w + 8, 9, 1, 'z');
      if (f) F.ring(x - 3, ry + 1, l.w + 6, 7, 1, 'w');
      if (f > 1) F.on('z').ring(x - 4, ry, l.w + 8, 9, 1, 'C').on();
    });
    list.forEach(function (o, i) {
      var l = rfDull(o[0], i === 1 || i === 3 ? dull : (dull > 1 ? 2 : (f === 1 && i % 2 ? 1 : 0)), i);
      if (f > 1) {
        /* wet shine: a second glint low on the fruit */
        l.on('*').p(l.w - 4, l.h - 5, 'W').p(l.w - 5, l.h - 4, 'W').p(3, 3, 'W').p(4, 3, 'W').p(3, 4, 'W').on();
      }
      F.put(l, o[1], o[2], o[3], 0);
    });
    if (f > 1) {
      /* sparkles on the water */
      [[6, 10], [44, 6], [61, 26], [16, 34], [54, 37]].forEach(function (s) { F.p(s[0], s[1], 'W').p(s[0] - 1, s[1], 'w').p(s[0] + 1, s[1], 'w').p(s[0], s[1] - 1, 'w').p(s[0], s[1] + 1, 'w'); });
    }
  });

  def('fruit.board', 76, 44, 38, 26, 3, function (F, f) {
    var st = lay(10, 8), i;
    if (f === 0) {
      F.put(strawberry(), 5, 12, OR, 2); F.put(strawberry(), 15, 20, OR, 2);
      /* a little bunch of grapes on its stem */
      st.ln(1, 0, 5, 4, 'a').ln(5, 4, 9, 7, 'a').ln(5, 4, 3, 7, 'k');
      F.put(st, 33, 6, 'kKK', 0);
      F.put(grape(), 30, 12, OG, 2); F.put(grape(), 40, 14, OG, 2); F.put(grape(), 34, 22, OG, 2);
      F.put(rfMandarin(), 54, 15, OW, 2);
    } else if (f === 1) {
      /* tops off: caps beside the berries, grapes off the stem, the tangerine out of its peel */
      F.put(rfCap(), 4, 9, OG, 1); F.put(rfCap(), 20, 12, OG, 1);
      F.put(rfBerryCut(), 6, 16, OR, 2); F.put(rfBerryCut(), 17, 21, OR, 2);
      st.ln(1, 0, 5, 4, 'a').ln(5, 4, 9, 7, 'a').ln(5, 4, 3, 7, 'k');
      F.put(st, 34, 5, 'kKK', 1);
      F.put(grape(), 30, 15, OG, 2); F.put(grape(), 42, 18, OG, 2); F.put(grape(), 35, 24, OG, 2);
      var peel = lay(12, 7); peel.rows(0, 0, ['..3333......', '.34444333...', '3446b444333.', '34b6bb444332', '.3bbb6b44332', '..33bbb3332.', '....33322...']);
      F.put(peel, 58, 9, OW, 1);
      F.put(rfPeeled(), 54, 18, OW, 2);
    } else {
      /* bite pieces, juicy faces up */
      [[4, 14], [14, 20], [8, 27], [20, 12]].forEach(function (p) { F.put(rfBerryHalf(), p[0], p[1], OR, 1); });
      [[31, 11], [41, 15], [32, 21], [43, 26], [33, 30]].forEach(function (p) { F.put(rfGrapeHalf(), p[0], p[1], OG, 1); });
      [[55, 11], [60, 18], [53, 24], [61, 30]].forEach(function (p, k) { F.put(k % 2 ? rfTangSeg().flip() : rfTangSeg(), p[0], p[1], OW, 1); });
      F.p(27, 30, '=').p(51, 19, '5');
    }
  });

  def('fruit.piece', 20, 20, 10, 14, 3, function (F, f) {
    if (f === 0) F.put(strawberry(), 4, 3, OR, 0);
    else if (f === 1) F.put(grape(), 4, 5, OG, 0);
    else F.put(tang(), 4, 5, OW, 0);
  });

  /* ---- the skewer: stick 90 px, point at the right, pieces pushed on from there ---- */
  function rfStick() {
    var s = lay(90, 2);
    s.r(0, 0, 86, 1, 'y').r(0, 1, 86, 1, 'A').r(86, 0, 4, 1, 'y').r(86, 1, 2, 1, 'A').p(0, 0, 'A');
    for (var x = 9; x < 84; x += 13) s.p(x, 0, 'A');
    return s;
  }
  def('skewer', 100, 20, 50, 12, 4, function (F, f) {
    F.put(rfStick(), 5, 10, OW, 0);
    if (f > 0) F.put(strawberry(), 54, 4, OR, 0);
    if (f > 1) F.put(grape(), 67, 6, OG, 0);
    if (f > 2) F.put(tang(), 79, 6, OW, 0);
  });

  /* the sugar shell: a 1 px lighter rim around a piece (part 1 = only the upper half is coated yet) */
  function rfSugar(src, part) {
    var s = lay(src.w + 2, src.h + 2), i, j;
    s.put(src, 1, 1, '', 0);
    if (!part) return s;
    for (j = -1; j <= src.h; j++) for (i = -1; i <= src.w; i++) {
      if (src.at(i, j) || (part < 2 && 2 * j > src.h - 2)) continue;
      if (src.at(i, j + 1) || src.at(i + 1, j)) s.p(i + 1, j + 1, part > 1 ? 'W' : '6');
      else if (src.at(i - 1, j) || src.at(i, j - 1)) s.p(i + 1, j + 1, '5');
    }
    return s;
  }
  def('kkochi.coat', 100, 28, 50, 16, 3, function (F, f) {
    var st = rfStick(), list = [[strawberry(), 53, 7, OR], [grape(), 66, 9, OG], [tang(), 78, 9, OW]];
    if (f) { st.on('A').r(40, 1, 50, 1, 'y').on().on('y').r(44, 0, 46, 1, '6').on(); if (f > 1) st.p(47, 0, 'W').p(48, 0, 'W'); }
    F.put(st, 5, 14, OW, 0);
    list.forEach(function (o, i) {
      var l = o[0].copy(), w = l.w, h = l.h;
      if (f === 0) l.map({ W: i === 1 ? 'q' : (i ? '5' : 'c'), '=': 'c', '6': '5' });
      if (f === 2) {
        /* a long glint down the lit side and a small one opposite */
        l.on('*').ln(3, 2, 2, 5, 'W').p(4, 2, 'W').p(3, 6, 'W').p(w - 4, h - 5, 'W').p(w - 3, h - 6, 'W').p(w - 5, h - 3, '6').on();
      }
      F.put(rfSugar(l, f), o[1] - 1, o[2] - 1, f > 1 ? 'Aak' : o[3], 0);
    });
    if (f === 1) F.p(60, 21, '5').p(60, 22, 'y');
    if (f === 2) {
      /* drops of syrup under the skewer */
      var dr = lay(2, 2); dr.rows(0, 0, ['6y', 'yA']);
      F.put(dr, 59, 23, OW, 0); F.put(dr, 84, 22, OW, 0);
    }
  });

  /* ---- the syrup pot: clear amber, bubbling ---- */
  def('pot.syrup', 76, 60, 38, 38, 2, function (F, f) {
    var p = rfPot(52, 30, 9, 'wllmnN');
    p.on('N').e(10, 7, 46, 25, 'a').on();
    p.on('N').r(10, 0, 22, 14, 'n').on();
    p.on('a').e(10, 9, 46, 25, 'A').on();
    p.on('A').e(13, 12, 30, 12, 'y').e(17, 14, 30, 12, 'A').ring(26, 15, 22, 9, 1, f ? 'y' : 'a').on();
    /* bubbles: ring, glint, a darker foot */
    (f ? [[17, 15, 6], [30, 11, 4], [38, 18, 7], [24, 20, 4], [46, 14, 3], [14, 20, 3]] : [[20, 12, 4], [31, 17, 7], [43, 13, 5], [16, 18, 5], [40, 21, 3], [27, 22, 3]]).forEach(function (b) {
      var w = b[2], h = w > 4 ? w - 1 : w;
      p.on('Aay').e(b[0], b[1] + 1, w, h, 'a').e(b[0], b[1], w, h, '5').on();
      if (w > 3) p.on('5').e(b[0] + 1, b[1] + 1, w - 2, h - 2, 'y').on();
      p.on('5y').p(b[0] + 1, b[1] + 1, 'W').on();
    });
    p.on('Ay').p(14, 13, 'W').p(15, 12, 'W').p(16, 12, 'W').on();
    F.put(p, 5, 14, OS, 0);
  });

  /* ================= cake states, the 16 px ingredient pictures, emblem and cafe pictures ================= */

  /* ---- mix.cake: only the contents of the mixing bowl; footprint = ellipse 56 x 32 at (2, 3) in every frame ---- */
  def('mix.cake', 60, 40, 30, 22, 4, function (F, f) {
    var m = lay(56, 32);
    if (f === 0) {
      /* a bed of flour, a flour heap, a sugar heap and two eggs, apart */
      m.e(0, 0, 56, 32, 'Q').on('Q');
      m.e(2, 14, 52, 18, 'e').e(1, 12, 52, 18, 'Q');
      /* flour heap, upper left */
      m.e(6, 4, 25, 15, 'E').e(5, 2, 25, 15, 'e').e(5, 2, 23, 13, 'W');
      m.p(12, 5, 'Q').p(18, 9, 'Q').p(9, 10, 'Q').p(22, 6, 'Q').p(15, 12, 'Q');
      /* sugar heap, right: cool white, sparkling */
      m.e(33, 5, 20, 14, 'z').e(32, 4, 20, 13, 'C').e(32, 4, 18, 11, 'w').e(33, 4, 13, 7, 'W');
      [[36, 11], [41, 13], [45, 9], [47, 12], [39, 8], [43, 6]].forEach(function (p) { m.p(p[0], p[1], 'C'); });
      /* two eggs in their clear whites, front */
      m.e(13, 17, 30, 14, 'B').e(13, 16, 30, 14, 'b').e(15, 17, 24, 9, '6');
      m.ball(17, 18, 10, 8, '5', '4', '3', 2).p(19, 20, 'W').p(20, 20, 'W');
      m.ball(29, 20, 10, 8, '5', '4', '3', 2).p(31, 22, 'W').p(32, 22, 'W');
      m.on();
    } else if (f === 1) {
      /* lumpy: yellow wet batter with dry flour lumps and yolk streaks */
      m.e(0, 0, 56, 32, 'b').on('b');
      m.e(4, 3, 30, 12, '6');
      [[8, 6, 9, 6], [22, 3, 10, 6], [38, 6, 10, 7], [14, 15, 11, 7], [30, 14, 9, 6], [42, 16, 8, 6], [22, 23, 10, 6], [6, 14, 6, 5], [34, 23, 8, 5]].forEach(function (b) {
        m.e(b[0] + 1, b[1] + 1, b[2], b[3], 'B').e(b[0], b[1], b[2], b[3], 'Q').e(b[0], b[1], b[2] - 3, b[3] - 2, 'W');
      });
      m.on();
      m.on('b6').ln(18, 11, 30, 10, '4', 2).ln(30, 10, 36, 13, '4', 2).ln(10, 22, 20, 24, '4', 2).ln(40, 24, 47, 21, '4', 2).ln(19, 11, 28, 10, '5').on();
    } else if (f === 2) {
      /* streaky: swirls of pale and yolk still showing */
      m.e(0, 0, 56, 32, 'b').on('b');
      m.ring(5, 3, 46, 26, 2, '6').ring(12, 7, 32, 18, 2, 'B').ring(18, 10, 20, 12, 2, '6').e(25, 14, 7, 4, 'B');
      m.on();
      m.on('6').r(28, 0, 28, 16, 'b').on().on('B').r(0, 16, 26, 16, 'b').on();
      m.on('b').ln(8, 20, 14, 25, 'Q', 2).ln(40, 5, 46, 9, 'Q', 2).ln(30, 26, 38, 26, '4').ln(14, 5, 22, 4, '4').on();
    } else {
      /* smooth pale batter */
      m.e(0, 0, 56, 32, 'B').e(0, 0, 54, 30, 'b').on('b');
      m.e(5, 3, 34, 15, '6').e(9, 6, 34, 15, 'b');
      m.ring(16, 10, 24, 12, 1, '6');
      m.on();
      m.p(12, 7, 'W').p(13, 7, 'W').p(14, 6, 'W').p(11, 9, 'W');
    }
    m.on('*').ring(0, 0, 56, 32, 1, '-').on();
    F.put(m, 2, 3, OW, 0);
  });

  /* ---- tin: a round cake tin lined with paper, filling with batter ---- */
  def('tin', 76, 60, 38, 36, 4, function (F, f) {
    var t = lay(70, 52), dy, x;
    for (dy = 12; dy >= 0; dy--) t.e(0, dy, 70, 40, 'm');
    t.on('m').r(5, 0, 12, 52, 'l').r(8, 0, 3, 52, 'w').r(50, 0, 20, 52, 'n').r(64, 0, 6, 52, 'N').on();
    t.on('mlnwN').e(0, 13, 70, 40, '-').e(0, 11, 70, 40, '^').on();
    /* the rolled rim */
    t.e(0, 0, 70, 40, 'l');
    t.on('l').ring(0, 0, 70, 40, 1, 'w').r(36, 20, 34, 20, 'm').on();
    t.on('m').ring(0, 0, 70, 40, 1, 'l').on();
    /* inside: paper on the far wall and on the floor */
    t.e(3, 2, 64, 36, 'E').on('E');
    for (x = 5; x < 66; x += 4) t.ln(x, 2, x + (x < 35 ? 1 : -1), 16, 'f');
    t.ring(3, 2, 64, 36, 1, 'Q');
    t.e(4, 12, 62, 34, 'Q').e(8, 15, 40, 14, 'W').e(12, 17, 44, 16, 'Q');
    t.ln(35, 13, 35, 37, 'e').ln(6, 28, 64, 28, 'e');
    if (f === 1) {
      t.e(13, 18, 46, 19, 'B').e(12, 17, 46, 19, 'b').e(16, 19, 26, 8, '6').e(19, 21, 28, 9, 'b');
      t.p(20, 21, 'W').p(21, 21, 'W');
    } else if (f === 2) {
      t.e(4, 7, 62, 34, 'B').e(4, 7, 59, 31, 'b').e(9, 10, 34, 12, '6').e(13, 12, 36, 13, 'b');
      t.ring(22, 17, 24, 11, 1, '6').p(15, 14, 'W').p(16, 14, 'W').p(17, 13, 'W');
    } else if (f === 3) {
      t.e(3, 3, 64, 35, 'B').e(3, 3, 61, 32, 'b').e(8, 6, 38, 13, '6').e(12, 8, 40, 14, 'b');
      t.ring(20, 12, 28, 13, 1, '6').ring(27, 16, 14, 6, 1, '6').p(14, 10, 'W').p(15, 10, 'W').p(16, 9, 'W').p(13, 12, 'W');
      t.ring(3, 2, 64, 36, 1, 'Q');
    }
    t.on();
    F.put(t, 3, 4, OS, 0);
  });

  /* ---- oven: a small cosy oven from the front; the window shows the tin and the cake rising ---- */
  def('oven', 116, 100, 58, 60, 4, function (F, f) {
    var lit = f > 0, o = lay(108, 86), ft = lay(108, 7);
    ft.rr(12, 0, 14, 7, 2, 'd').rr(82, 0, 14, 7, 2, 'd').r(13, 0, 3, 5, 'N').r(83, 0, 3, 5, 'N');
    F.put(ft, 4, 89, 'DDx', 0);
    o.rr(0, 0, 108, 86, 7, 'z');
    o.on('z').r(0, 0, 108, 3, 'C').r(0, 0, 3, 70, 'C').r(104, 3, 4, 83, 'H').r(0, 82, 108, 4, 'H').on();
    /* control panel: two knobs, a lamp, three vent slots */
    o.rr(6, 6, 96, 15, 3, 'e').rr(6, 6, 96, 14, 3, 'Q');
    [14, 82].forEach(function (x, i) {
      o.e(x, 8, 12, 12, 'u').ball(x, 7, 12, 12, 'e', 'E', 'f', 2);
      if (i === 0) o.ln(x + 5, 12, x + (lit ? 9 : 5), lit ? 9 : 8, 'K', 2); else o.ln(x + 5, 12, x + 2, 9, 'K', 2);
    });
    o.e(35, 10, 7, 7, lit ? 'r' : 'N').p(37, 11, lit ? '=' : 'm').p(38, 12, lit ? 'c' : 'n');
    o.r(50, 10, 22, 1, 'F').r(50, 13, 22, 1, 'F').r(50, 16, 22, 1, 'F');
    /* the door: a lighter face, a steel bar handle, the window */
    o.rr(6, 25, 96, 56, 5, 'H').rr(6, 24, 96, 56, 5, 'C');
    o.on('C').r(6, 24, 96, 2, 'w').r(98, 26, 4, 54, 'z').r(6, 77, 96, 3, 'z').on();
    o.rr(18, 30, 72, 4, 2, 'N').rr(18, 28, 72, 5, 2, 'l').r(20, 29, 68, 1, 'w').r(20, 32, 68, 1, 'm');
    o.r(22, 33, 3, 2, 'n').r(83, 33, 3, 2, 'n');
    o.rr(16, 38, 76, 38, 6, 'd').on('d').r(16, 38, 76, 2, 'N').r(16, 38, 2, 30, 'N').on();
    /* what is behind the glass */
    var w = lay(70, 32), x;
    w.rr(0, 0, 70, 32, 4, lit ? 'k' : 'D').on('*');
    if (lit) {
      w.r(0, 0, 70, 6, 'a').r(0, 28, 70, 4, 'K').e(8, -8, 54, 22, 'a').e(18, -8, 34, 16, 'A');
      w.r(6, 2, 58, 1, '3').r(8, 1, 54, 1, '4');
    } else {
      w.r(0, 28, 70, 4, 'x').r(6, 2, 58, 1, 'd');
    }
    /* the cake above the tin's rim */
    if (f === 1) { w.rr(16, 14, 38, 4, 2, 'b').r(18, 14, 30, 1, '6'); }
    if (f === 2) { w.e(13, 6, 44, 24, '4').e(13, 6, 40, 20, '5').e(17, 8, 22, 7, '6').p(21, 10, 'W').p(22, 10, 'W'); }
    if (f === 3) {
      w.e(12, 2, 46, 30, '2').e(12, 2, 43, 27, '3').e(14, 3, 34, 18, '4').e(18, 5, 18, 6, '5');
      w.ln(26, 6, 34, 8, '2').ln(34, 8, 44, 7, '2').ln(34, 8, 36, 11, '2');
    }
    w.r(0, 17, 70, 11, lit ? 'k' : 'D').r(0, 28, 70, 4, lit ? 'K' : 'x');
    /* rack */
    w.r(0, 27, 70, 1, lit ? 'm' : 'd');
    for (x = 4; x < 70; x += 8) w.p(x, 28, lit ? 'N' : 'd');
    /* the tin from the side, a paper edge peeping over */
    if (lit) {
      w.r(14, 17, 42, 10, 'm').r(14, 17, 42, 1, 'w').r(16, 18, 5, 9, 'l').r(18, 18, 1, 9, 'w').r(45, 18, 11, 9, 'n').r(14, 26, 42, 1, 'N');
      w.r(13, 16, 44, 1, 'Q');
      if (f > 1) for (x = 14; x < 56; x += 3) w.p(x, 15, 'Q');
    } else {
      w.r(14, 17, 42, 10, 'd').r(14, 17, 42, 1, 'N').r(16, 18, 3, 9, 'N').r(13, 16, 44, 1, 'N');
    }
    /* glass shine */
    w.ln(6, 14, 18, 2, '^', 2).ln(12, 16, 26, 2, '^').ln(50, 30, 62, 18, '^');
    w.on();
    o.put(w, 19, 41, '', 0);
    F.put(o, 4, 4, OC, 0);
  });

  /* ---- cake.base: a round sponge on a cake stand, cream spreading over the top ---- */
  def('cake.base', 76, 56, 38, 38, 4, function (F, f) {
    /* the stand: mint ceramic, plate / stem / foot */
    var s = lay(70, 37), dy, i;
    s.e(20, 29, 30, 8, 'H').e(20, 28, 30, 8, 'z').e(22, 28, 24, 5, 'C');
    s.r(30, 16, 10, 15, 'z').r(30, 16, 3, 15, 'C').r(37, 16, 3, 15, 'H').r(30, 21, 10, 3, 'H');
    s.e(0, 3, 70, 20, 'H').e(0, 1, 70, 20, 'z').e(0, 0, 70, 20, 'C');
    s.on('C').ring(3, 1, 64, 17, 1, 'z').e(6, 2, 30, 7, 'w').e(9, 3, 30, 7, 'C').on();
    F.put(s, 3, 16, OC, 0);
    /* the sponge: side (crust) and top */
    var side = lay(54, 32), top = lay(54, 19), b = lay(54, 32);
    for (dy = 12; dy >= 1; dy--) side.e(0, dy, 54, 19, '4');
    if (f < 3) {
      side.on('4').r(0, 0, 9, 32, '5').r(38, 0, 16, 32, '3').r(49, 0, 5, 32, '2').on();
      side.on('*').e(0, 13, 54, 19, '-').e(0, 11, 54, 19, '^').on();
      [[6, 16], [14, 21], [22, 19], [30, 23], [38, 20], [45, 17], [18, 25], [34, 26], [10, 24], [42, 24]].forEach(function (p) { side.p(p[0], p[1], '3'); });
    } else {
      /* frosted side with soft spatula strokes */
      side.on('4').r(0, 0, 54, 32, 'Q').r(0, 0, 12, 32, 'W').r(40, 0, 14, 32, 'e').on();
      side.on('Qe'); for (i = 14; i < 52; i += 5) side.ln(i, 14, i, 30, i < 40 ? 'W' : 'Q'); side.on();
      side.on('*').e(0, 13, 54, 19, '-').e(0, 11, 54, 19, '^').on();
    }
    top.e(0, 0, 54, 19, '5').on('5');
    top.ring(0, 0, 54, 19, 1, '4').e(5, 2, 28, 8, '6').e(9, 4, 28, 8, '5');
    [[10, 9], [18, 13], [27, 7], [35, 12], [42, 8], [30, 15], [46, 11], [22, 4], [38, 4], [14, 5]].forEach(function (p) { top.p(p[0], p[1], '4').p(p[0] + 1, p[1], 'b'); });
    if (f === 1) {
      top.e(-5, 0, 28, 19, 'E').e(-6, -1, 28, 19, 'Q').e(-6, -1, 26, 17, 'W');
      top.ln(4, 6, 14, 4, 'Q').ln(5, 11, 15, 9, 'Q').p(8, 4, 'W');
    } else if (f === 2) {
      top.e(-5, -1, 44, 21, 'E').e(-6, -2, 44, 21, 'Q').e(-6, -2, 42, 19, 'W');
      top.ln(4, 6, 16, 3, 'Q').ln(6, 11, 22, 7, 'Q').ln(14, 15, 30, 10, 'Q').ln(24, 4, 32, 3, 'Q');
    } else if (f === 3) {
      top.r(0, 0, 54, 19, 'W').ring(0, 0, 54, 19, 1, 'Q').e(16, 6, 24, 8, 'Q').e(15, 5, 23, 7, 'W');
      /* a ring of soft peaks */
      for (i = 0; i < 10; i++) {
        var a = i * 0.6283 + 0.3, px = Math.round(26 + 20 * Math.cos(a)), py = Math.round(8.5 + 5.5 * Math.sin(a));
        top.e(px - 2, py - 1, 6, 4, 'e').e(px - 2, py - 2, 5, 4, 'Q').r(px - 2, py - 2, 3, 2, 'W').p(px, py - 3, 'W');
      }
    }
    top.on();
    b.put(side, 0, 0, '', 0).put(top, 0, 0, '', 0);
    F.put(b, 11, 4, f < 3 ? OW : 'EFu', 2);
    /* crumbs or a cream dab on the plate */
    if (f < 3) F.p(13, 33, '4').p(60, 34, '4').p(61, 34, '3'); else F.p(13, 33, 'W').p(14, 33, 'W').p(60, 34, 'W');
  });

  /* ---- berry.top: the strawberry that goes on top ---- */
  def('berry.top', 16, 18, 8, 14, 1, function (F) {
    F.put(strawberry(), 2, 2, OR, 0);
  });

  /* ================= 16 x 16 pictures (anchor 8, 13): hand-typed, standing on row 13 ================= */
  function ckSmall(id, rows, ol) {
    def(id, 16, 16, 8, 13, 1, function (F) {
      var l = lay(rows[0].length, rows.length); l.rows(0, 0, rows);
      F.put(l, (16 - rows[0].length) >> 1, 14 - rows.length, ol, 0);
    });
  }
  /* flour: a paper sack with a wheat ear, flour heaped at the open top */
  ckSmall('ing.flour', [
    '...WWWWWW...',
    '..WWWWWWQQ..',
    '.eeeeeeeeEE.',
    '.eEEEEEEEEf.',
    'eeeeeeeeeEEf',
    'eeeeAeAeeEEf',
    'eeeeeAeeeEEf',
    'eeeeAAAeeEEf',
    'eeeeeAeeeEEf',
    'eeeeAAAeeEEf',
    'eeeeeAeeeEEf',
    'eeeeeAeeeEEf',
    '.EEEEEEEEff.'], 'FuU');
  /* water: a glass tumbler */
  ckSmall('ing.water', [
    'wWwwwwwwwl',
    'wW......wl',
    'wCCCCCCCCl',
    'wWzzzzzzHl',
    'wWzzzzzzHl',
    'wWCzzzzzHl',
    '.wWzzzzHl.',
    '.wWzzzzHl.',
    '.wWzzzzHl.',
    '.wzzzzzHl.',
    '.wwwwwlll.'], OC);
  /* greens: a tied bunch of green onion */
  ckSmall('ing.greens', [
    '.q...gq...G.',
    'qgg..qg..gG.',
    'qgG..qgG.gGG',
    '.gG..qgG.gG.',
    '.gGg.qgGgGG.',
    '..gG.qgGgG..',
    '..gGgqgGgG..',
    '...gGqgGG...',
    '...rrcrrR...',
    '...WWQQe....',
    '...WWQQe....',
    '...WQQe.....',
    '....Qe......'], OG);
  /* oil: a small bottle of golden oil with a cork */
  ckSmall('ing.oil', [
    '..FEEF..',
    '..FFFu..',
    '..6556..',
    '..6554..',
    '.655544.',
    '65555443',
    '6W554443',
    '6W544443',
    '6W5QQQ43',
    '6W5QgQ43',
    '655QQQ43',
    '65444433',
    '.444433.'], OW);
  /* egg */
  ckSmall('ing.egg', [
    '...QQQQ...',
    '..QWWQQe..',
    '.QWWQQQQe.',
    '.QWQQQQQe.',
    'QQWQQQQQeE',
    'QQQQQQQQeE',
    'QQQQQQQeeE',
    'QQQQQQQeeE',
    'QQQQQQeeEE',
    '.QQQQeeEE.',
    '.eeeeeEEE.',
    '..eEEEEE..'], 'FuU');
  /* salt: a glass jar with a blue lid, white grains inside */
  ckSmall('ing.salt', [
    '.zzzzzzzz.',
    '.HHHHHHHh.',
    '..wCCCCl..',
    '.wCCCCCCl.',
    'wCCCCCCCCl',
    'wCWWWWWWCl',
    'wWWWlWWWWl',
    'wWlWWWWlWl',
    'wWWWWlWWWl',
    'wWWlWWWWll',
    'wWWWWWWlWl',
    '.llllllll.'], OC);
  /* rice: an earthen bowl heaped with white rice */
  ckSmall('ing.rice', [
    '....WWWWW.....',
    '..WWWQWWWWW...',
    '.WWQWWWWQWWQ..',
    'WWWWWQWWWWWQQ.',
    'WQWWWWWQWWQWQe',
    '&&&&&&&&&&&&%%',
    '%&&@&&&&&&&%%$',
    '.%&@&&&&&&%%$.',
    '.%&&&&&&&&%%$.',
    '..%&&&&&&%%$..',
    '...%%%%%%%$...',
    '....$$$$$$....'], 'kKK');
  /* gim: a stack of dark seaweed sheets with a paper band */
  ckSmall('ing.gim', [
    '..ttttttttt...',
    '.t8t8ttt8ttt..',
    '.ttttt8ttttTt.',
    '.t8tttttt8tTtt',
    '.tttt8tttttTt8',
    '.tt8ttttt8tTtt',
    '.ttttt8ttttTt8',
    '.t8tttttt8tTtT',
    '.TTTTTTTTTTTtT',
    '..ttttttttttTT',
    '...TTTTTTTTTTT'], '877');
  /* sesame: a small white dish of pale seeds */
  ckSmall('ing.sesame', [
    '.....bybb.....',
    '...ybbAbbyb...',
    '..bbAbybbAbb..',
    '.wybbbAbybbyw.',
    'wwwbybbbAbywwl',
    'wwwwwwwwwwwwll',
    '.wwwwwwwwwwll.',
    '..lwwwwwwlll..',
    '...mmmmmmmm...'], OC);
  def('ing.berry', 16, 16, 8, 13, 1, function (F) { F.put(strawberry(), 2, 1, OR, 0); });
  /* grape: a small bunch of green grapes */
  ckSmall('ing.grape', [
    '......kk....',
    '.....k......',
    'qgPqgPqgPqg.',
    'WgPWgPWgPWgG',
    'gGPgGPgGPgGG',
    'PPqgPqgPqgPP',
    '..WgPWgPWgG.',
    '..gGPgGPgGG.',
    '..PPqgPqgPP.',
    '....WgPWgG..',
    '....gGPgGG..',
    '.....PqgP...',
    '.....GWgG...'], OG);
  /* tangerine with a leaf */
  def('ing.tang', 16, 16, 8, 13, 1, function (F) {
    var l = lay(12, 13);
    l.ball(0, 2, 12, 11, '5', '4', '3', 2).p(3, 4, 'W').p(4, 4, 'W').p(7, 7, '3').p(5, 10, '3').p(8, 5, '3').p(3, 8, '3').p(9, 10, '2');
    l.rows(3, 0, ['..gGG.', '.qgGP.', '..kG..']);
    F.put(l, 2, 1, OW, 0);
  });
  /* sugar: a pink bowl of white cubes */
  ckSmall('ing.sugar', [
    '.....WWWW.....',
    '.WWWWWWWl.....',
    '.WWWlWWWlWWWW.',
    '.WWWlmmmmWWWl.',
    '.mmmmWWWlWWWl.',
    'pppppppppppp**',
    '*pp=pppppp***>',
    '.*p=ppppp***>.',
    '.*ppppppp***>.',
    '..*ppppp***>..',
    '...*******>...',
    '....>>>>>>....'], '$$#');
  /* cream: a swirl of whipped cream in a mint bowl */
  ckSmall('ing.cream', [
    '......W.....',
    '.....WWQ....',
    '....WWWQ....',
    '...WWWWWQ...',
    '..WQQQQQQe..',
    '..WWWWWWQQ..',
    '.WWWWWWWWQe.',
    '.WQQQQQQQQe.',
    'CCCCCCCCCCzz',
    'zCCwCCCCCzzH',
    '.zCCCCCCzzH.',
    '..zzzzzzHH..'], OC);

  /* ---- book.emblem: a red pot with a ladle ---- */
  def('book.emblem', 32, 32, 16, 16, 1, function (F) {
    /* ladle handle, behind the pot */
    var h = lay(14, 14);
    h.ln(1, 12, 10, 1, 'F', 2).ln(1, 12, 10, 1, 'E').e(9, 0, 4, 4, 'E').p(10, 1, 'e');
    F.put(h, 16, 2, 'uUV', 0);
    var p = lay(28, 19);
    /* handles */
    p.rr(0, 5, 5, 4, 1, 'R').rr(23, 5, 5, 4, 1, 'R').r(0, 5, 4, 1, 'r');
    /* body */
    p.rr(3, 4, 22, 15, 5, 'r').r(3, 1, 22, 8, 'r');
    p.on('r').r(19, 0, 6, 19, 'R').r(3, 16, 22, 3, 'R').r(5, 5, 2, 9, 'c').p(5, 6, '=').p(5, 7, '=').on();
    p.on('rR').r(3, 9, 22, 1, '-').on();
    F.put(p, 2, 11, OR, 0);
    /* rim and soup drawn on the canvas so the ellipse sits above the body */
    var t = lay(22, 8);
    t.e(0, 0, 22, 8, 'c').e(1, 1, 20, 6, '3').e(2, 1, 14, 4, '4').p(5, 2, '5').p(6, 2, '5').p(14, 5, 'g').p(9, 5, 'g').p(15, 3, '2');
    t.on('c').r(11, 4, 11, 4, 'r').on();
    F.put(t, 5, 8, OR, 0);
    /* the ladle shaft dips into the soup */
    F.ln(17, 13, 19, 11, 'F', 2).ln(17, 13, 19, 11, 'E');
    /* a curl of steam */
    F.p(8, 5, 'v').p(9, 4, 'v').p(9, 3, 'W').p(8, 2, 'W').p(12, 6, 'v').p(13, 5, 'W').p(13, 4, 'W').p(12, 3, 'v');
  });

  /* ---- lock.cup: a small coffee cup ---- */
  ckSmall('lock.cup', [
    '.wwwwwwwww....',
    'wwkkkkkkkww...',
    'wWwkkKKkwwlll.',
    'wWwwwwwwwwl.ll',
    '.wWwwwwwwll.ll',
    '.wWwwwwwwllll.',
    '..wwwwwwwll...',
    '...wwwwwll....',
    '.wwwlllllmmm..',
    '..llllllmmm...'], OC);

  /* ---- cafe.coffee: a cup of coffee on a saucer, a curl of steam ---- */
  function coffeeCup(F, lvl) {   /* lvl 0 full with steam, 1 lower, 2 low, 3 empty with a ring */
    var s = lay(28, 9);
    s.e(0, 1, 28, 8, 'm').e(0, 0, 28, 8, 'w').on('w').ring(3, 1, 22, 5, 1, 'p').e(14, 3, 14, 5, 'l').on();
    F.put(s, 2, 21, OC, 0);
    var hd = lay(7, 8);
    hd.ring(0, 0, 7, 8, 2, 'w').on('w').r(4, 4, 3, 4, 'l').on();
    F.put(hd, 21, 15, OC, 0);
    var c = lay(18, 15);
    c.rr(0, 2, 18, 13, 6, 'w').r(0, 2, 18, 5, 'w');
    c.on('w').r(13, 0, 5, 15, 'l').r(16, 0, 2, 15, 'm').r(2, 6, 1, 6, 'W').r(4, 13, 10, 2, 'l').r(0, 9, 13, 1, 'p').on();
    c.e(0, 0, 18, 6, 'w');
    if (lvl === 0) c.e(1, 1, 16, 4, 'K').e(2, 1, 13, 3, 'k').p(4, 2, 'a').p(5, 2, 'a').p(6, 2, 'y');
    else {
      c.e(1, 1, 16, 4, 'm').on('m').e(1, 2, 14, 3, 'l').on();
      if (lvl === 1) c.e(3, 2, 13, 3, 'K').e(4, 2, 9, 2, 'k');
      if (lvl === 2) c.e(6, 3, 9, 2, 'K').p(8, 3, 'k').p(9, 3, 'k');
      if (lvl === 3) c.p(7, 4, 'E').p(8, 4, 'E').p(9, 4, 'f').p(11, 3, 'E');
    }
    c.on('w').e(9, 3, 9, 3, 'l').on();
    F.put(c, 5, 11, OC, 1);
    if (lvl) return;
    var st = lay(8, 9);
    st.rows(0, 0, [
      '...WW...',
      '....WW..',
      '....WW..',
      '...WW...',
      '..WW....',
      '.WW.....',
      '.WW.....',
      '..WW....',
      '...W....']);
    F.put(st, 9, 1, 'vvE', 0);
  }
  def('cafe.coffee', 32, 32, 16, 26, 1, function (F) { coffeeCup(F, 0); });
  def('cafe.cup.big', 32, 32, 16, 26, 4, coffeeCup);

  /* ---- cafe.card: a small recipe card: a tiny cake picture and lines ---- */
  ckSmall('cafe.card', [
    'QQQQQQQQQQe.',
    'QWWWWWWWWWQe',
    'QWWrWWWWWWWe',
    'QWWWWWEEEEWe',
    'QW555WWWWWWe',
    'QW444WEEEWWe',
    'QWWWWWWWWWWe',
    'QWEEEEEEEEWe',
    'QWWWWWWWWWWe',
    'QWEEEEEEWWWe',
    'QWWWWWWWWWWe',
    'QWEEEEEEEWWe',
    'eeeeeeeeeeee'], 'FuU');

  /* ================= content pass (wip/round7/briefs/SPRITES2.md): cafe, shops, contest ================= */
  var CUP_ROWS = [
    '................',
    '................',
    '................',
    '................',
    '...hhhhhhhh.....',
    '..hwKKKKKKwh....',
    '..hwwKkkKwwhhh..',
    '..hwwwwwwwlh.wh.',
    '..hwwwwwwwlh.wh.',
    '..hWwwwwwwlhhh..',
    '..hWpppppplh....',
    '...hwwwwwlh.....',
    '.hhhhwwwlhhhh...',
    'hwwwwhhhhwwwlh..',
    '.hllllllllllh...',
    '..hhhhhhhhhh....'];
  def('cafe.cup', 16, 16, 8, 13, 4, function (F, f) {   /* table size: the coffee sinks sip by sip */
    F.rows(0, 0, CUP_ROWS);
    if (f > 0) F.rows(4, 5, ['llllll']);
    if (f === 1) F.rows(5, 6, ['KKKK']);
    if (f === 2) F.rows(5, 6, ['lKKl']);
    if (f === 3) F.rows(5, 6, ['lmEl']);
  });
  def('cafe.tray', 48, 32, 24, 22, 1, function (F) {
    var t = lay(44, 26);
    t.rr(0, 3, 44, 23, 5, 'u').rr(0, 0, 44, 23, 5, 'F');
    t.on('F').rr(1, 1, 42, 3, 2, 'f').rr(3, 3, 38, 17, 4, 'E').on();
    t.on('E').rr(3, 3, 38, 2, 2, 'F').r(3, 5, 2, 15, 'f').r(8, 7, 20, 1, 'e').r(12, 15, 22, 1, 'f').r(30, 10, 8, 1, 'f').on();
    t.on('F').rr(0, 8, 2, 7, 1, 'U').rr(42, 8, 2, 7, 1, 'U').on();
    F.put(t, 2, 3, OD, 0);
  });
  def('cafe.stampcard', 48, 32, 24, 16, 4, function (F, f) {
    var c = lay(44, 28), i;
    c.rr(0, 0, 44, 28, 2, 'e').rr(0, 0, 43, 27, 2, 'W');
    c.on('W').r(3, 3, 37, 1, 'E').r(3, 23, 37, 1, 'E').r(3, 3, 1, 21, 'E').r(39, 3, 1, 21, 'E').on();
    /* a small cup mark and a coffee-brown bar on top */
    c.rows(6, 6, ['kkkkk.', 'kKKkkk', 'kkkk.k', '.kkkk.']).r(15, 7, 22, 2, 'k').r(15, 10, 14, 1, 'E');
    for (i = 0; i < 3; i++) {
      var x = 5 + i * 12;
      if (i < f) { c.ring(x, 12, 10, 10, 2, 'r').on('W').e(x + 3, 15, 4, 4, 'r').on().p(x + 2, 13, 'c').p(x + 7, 20, 'R').p(x + 4, 16, 'c'); }
      else c.ring(x, 12, 10, 10, 1, 'E');
    }
    F.put(c, 2, 2, 'FuU', 0);
  });
  typedFrames('cafe.stamp', 16, 16, 8, 13, [[
    '................',
    '................',
    '......UUUU......',
    '.....UAAAaU.....',
    '.....UyAAaU.....',
    '.....UyAAaU.....',
    '......UAaU......',
    '......UAaU......',
    '.....UUAaUU.....',
    '....UyAAAAaU....',
    '....UAAAAaaU....',
    '...$$$$$$$$$$...',
    '...$rrrrrrrR$...',
    '...$$$$$$$$$$...',
    '................',
    '................']]);
  def('cafe.recipe', 32, 40, 16, 20, 2, function (F, f) {
    var c = lay(28, 36), pic = lay(16, 16), y;
    c.rr(0, 0, 28, 36, 2, 'e').rr(0, 0, 27, 35, 2, 'W');
    c.on('W').r(2, 2, 23, 18, 'Q').r(3, 3, 21, 16, 'e').on();
    TABLE[f ? 'icon.kkochi' : 'icon.cake'].fn(pic, 0);
    c.put(pic, 5, 3, '', 0);
    for (y = 23; y < 33; y += 3) c.r(3, y, y === 32 ? 12 : (y === 26 ? 18 : 21), 1, 'E');
    c.p(13, 0, 'r').p(14, 0, 'r').p(13, 1, 'R').p(14, 1, 'r');
    F.put(c, 2, 2, 'FuU', 0);
  });
  /* eight record sleeves: plain shapes, no letters */
  def('rec.sleeve', 24, 24, 12, 12, 8, function (F, f) {
    var s = lay(22, 22), i;
    if (f === 0) { s.r(0, 0, 22, 22, 'z').r(0, 15, 22, 7, 'H').e(6, 4, 10, 10, '5').on('5').e(8, 6, 4, 3, '6').on(); for (i = 0; i < 4; i++) s.p(4 + i * 5, 17 + (i % 2), 'C').p(5 + i * 5, 17 + (i % 2), 'C'); s.p(3, 8, '4').p(18, 8, '4').p(11, 1, '4').p(5, 3, '4').p(16, 3, '4'); }
    if (f === 1) { s.r(0, 0, 22, 22, 'i'); for (i = 0; i < 22; i++) { var wv = [0, 0, 1, 2, 2, 1][i % 6]; s.p(i, 5 + wv, 'C').p(i, 10 + wv, 'z').p(i, 11 + wv, 'z').p(i, 16 + wv, 'H'); } }
    if (f === 2) { s.r(0, 0, 22, 22, 'y').e(-6, 11, 22, 18, '9').e(7, 9, 22, 20, 'j').on('j').e(9, 10, 12, 6, 'J').on().e(14, 2, 5, 5, 'W'); }
    if (f === 3) { s.r(0, 0, 22, 22, 'Q'); for (i = -22; i < 22; i += 8) { s.ln(i, 21, i + 21, 0, 'r', 2); s.ln(i + 4, 21, i + 25, 0, '4'); } }
    if (f === 4) { s.r(0, 0, 22, 22, '(').e(5, 4, 12, 12, '6').e(9, 3, 11, 11, '(').p(4, 17, 'W').p(16, 16, 'W').p(18, 6, '6').p(8, 19, 'p').p(2, 5, 'W'); }
    if (f === 5) { s.r(0, 0, 22, 22, 'Y').poly([[3, 18], [5, 8], [12, 3], [19, 3], [18, 11], [12, 17]], 'G').on('G').ln(4, 17, 18, 4, 'q').ln(9, 12, 9, 7, 'q').ln(12, 10, 17, 9, 'q').on(); }
    if (f === 6) { s.r(0, 0, 22, 22, 'p'); for (i = 0; i < 16; i++) { var dx = 2 + (i % 4) * 5, dy = 2 + ((i / 4) | 0) * 5; s.r(dx, dy, 3, 3, (i + ((i / 4) | 0)) % 2 ? 'W' : '>'); } }
    if (f === 7) { s.r(0, 0, 22, 22, 'D').poly([[11, 1], [21, 11], [11, 21], [1, 11]], '4').poly([[11, 5], [17, 11], [11, 17], [5, 11]], 'r').poly([[11, 8], [14, 11], [11, 14], [8, 11]], 'W'); }
    s.on('*').r(0, 0, 22, 1, '^').r(21, 0, 1, 22, '-').r(0, 21, 22, 1, '-').on();
    F.put(s, 1, 1, OD, 0);
  });
  def('rec.disc', 24, 24, 12, 12, 2, function (F, f) {
    var d = lay(22, 22);
    d.e(0, 0, 22, 22, 'x').ring(2, 2, 18, 18, 1, 'D').ring(5, 5, 12, 12, 1, 'D').e(7, 7, 8, 8, 'r').on('r').e(8, 8, 4, 3, 'c').on().p(10, 10, 'W').p(11, 10, 'W').p(10, 11, 'W').p(11, 11, 'W');
    d.on('xD');
    if (f === 0) d.ln(4, 5, 7, 8, 'N').ln(3, 7, 6, 9, 'd').ln(14, 14, 17, 17, 'd').ln(15, 12, 18, 15, 'N');
    else d.ln(17, 5, 14, 8, 'N').ln(18, 7, 15, 9, 'd').ln(7, 14, 4, 17, 'd').ln(6, 12, 3, 15, 'N');
    d.on();
    d.p(f ? 12 : 9, f ? 8 : 12, 'y');
    F.put(d, 1, 1, 'dDD', 0);
  });
  /* ---- shops ---- */
  def('ui.tag', 40, 24, 20, 12, 1, function (F) {
    var t = lay(38, 20);
    t.poly([[8, 0], [38, 0], [38, 20], [8, 20], [0, 13], [0, 7]], 'e');
    t.on('e').poly([[8, 0], [37, 0], [37, 19], [8, 19], [1, 12], [1, 7]], 'W').on();
    t.on('W').r(9, 2, 27, 1, 'Q').r(9, 17, 27, 1, 'Q').on();
    t.e(3, 8, 5, 5, 'E').e(4, 9, 3, 3, 'U');
    F.put(t, 1, 3, 'FuU', 0);
    /* the string: through the hole and away to the upper left */
    F.ln(6, 12, 3, 6, 'A').ln(3, 6, 5, 1, 'A').ln(5, 1, 9, 1, 'a').p(6, 13, 'a');
  });
  def('ui.sold', 32, 16, 16, 8, 1, function (F) {   /* stamp ink: a worn frame and a check stroke */
    F.r(3, 1, 26, 2, 'r').r(3, 13, 26, 2, 'r').r(1, 3, 2, 10, 'r').r(29, 3, 2, 10, 'r').p(2, 2, 'r').p(29, 2, 'r').p(2, 13, 'r').p(29, 13, 'r');
    F.ln(9, 7, 13, 10, 'r', 2).ln(13, 10, 21, 4, 'r', 2);
    F.on('r').r(10, 1, 3, 1, 'R').r(22, 14, 4, 1, 'R').r(1, 8, 1, 2, 'R').p(17, 7, 'R').p(30, 6, 'R').p(6, 13, 'R').p(25, 1, 'R').on();
  });
  def('ui.receipt', 32, 40, 16, 20, 1, function (F) {
    var r = lay(26, 36), x;
    r.r(0, 0, 26, 33, 'W');
    for (x = 0; x < 26; x += 4) r.poly([[x, 33], [x + 4, 33], [x + 2, 36]], 'W');
    r.on('W').r(24, 0, 2, 36, 'Q').r(3, 2, 14, 1, 'E').r(3, 4, 8, 1, 'e').r(3, 31, 20, 1, 'E').on();
    F.put(r, 3, 1, 'FuU', 0);
  });
  def('shop.open', 32, 24, 16, 4, 2, function (F, f) {
    var b = lay(26, 13);
    b.rr(0, 0, 26, 13, 2, 'F').on('F').r(1, 1, 24, 1, 'f').r(1, 11, 24, 1, 'u').r(4, 5, 5, 1, 'u').r(18, 8, 4, 1, 'u').on();
    if (f === 0) b.e(10, 3, 6, 7, '5').on('5').e(11, 4, 3, 3, '6').on().p(12, 4, 'W').p(8, 6, 'y').p(17, 6, 'y').p(9, 3, 'y').p(16, 3, 'y').p(9, 9, 'y').p(16, 9, 'y');
    else { b.map({ F: 'u', f: 'F', u: 'U' }); b.ln(9, 3, 16, 9, 'V').ln(16, 3, 9, 9, 'V'); }
    F.ln(16, 4, 6, 9, 'A').ln(16, 4, 25, 9, 'A').p(16, 3, 'a').p(15, 3, 'a').p(16, 2, 'a');
    F.put(b, 3, 10, OD, 0);
  });
  var SEED_ROWS = [
    '................',
    '..uuuuuuuuuuuu..',
    '..uEEEEEEEEEEu..',
    '..uuuuuuuuuuuu..',
    '..uWWWWWWWWWQu..',
    '..uWWWppWWWWQu..',
    '..uWWpp5pWWWQu..',
    '..uWWp555pWWQu..',
    '..uWWpp5ppWWQu..',
    '..uWWWppWWWWQu..',
    '..uWWWWGWWWWQu..',
    '..uWWgWGWgWWQu..',
    '..uWWWgGgWWWQu..',
    '..uWWWWGWWWWQu..',
    '..uWWWWWWWWWQu..',
    '..uyyyyyyyyyAu..',
    '..uyAyAyAyAyAu..',
    '..uuuuuuuuuuuu..',
    '................',
    '................'];
  def('goods.seed', 16, 20, 8, 17, 3, function (F, f) { F.rows(0, 0, SEED_ROWS); if (f === 1) F.map({ p: '5', '5': '2' }); if (f === 2) F.map({ p: 'z', '5': 'W' }); });
  var DYE_ROWS = [
    '................',
    '................',
    '......aaaa......',
    '......ayAa......',
    '.....dddddd.....',
    '.....dCWCCd.....',
    '.....dCWCCd.....',
    '....ddCCCCdd....',
    '...dCCWCCCCCd...',
    '..dCWrrrrrrrCd..',
    '..dCWrrrrrrRCd..',
    '..dCrcrrrrrRCd..',
    '..dCrcrrrrrRCd..',
    '..dCrrrrrrRRCd..',
    '..dCrrrrrRRRCd..',
    '..dCCRRRRRRCCd..',
    '...dCCCCCCCCd...',
    '....dddddddd....',
    '................',
    '................'];
  def('goods.dye', 16, 20, 8, 17, 3, function (F, f) { F.rows(0, 0, DYE_ROWS); if (f === 1) F.map({ r: 'H', R: 'h', c: 'z' }); if (f === 2) F.map({ r: 'g', R: 'G', c: 'q' }); });
  /* ---- contest ---- */
  def('judge.card', 24, 32, 12, 30, 3, function (F, f) {
    var st = lay(2, 13); st.r(0, 0, 2, 13, 'F').r(1, 0, 1, 13, 'u');
    F.put(st, 11, 17, OD, 0);
    var b = lay(20, 15), n = f + 1, i;
    b.rr(0, 0, 20, 15, 2, 'e').rr(0, 0, 19, 14, 2, 'W').on('W').r(2, 2, 15, 1, 'Q').r(2, 11, 15, 1, 'Q').on();
    for (i = 0; i < n; i++) b.rows((n === 1 ? 7 : (n === 2 ? 4 : 1)) + i * 6, 5, ['..5..', '55554', '.544.', '.4.4.']);
    F.put(b, 2, 2, 'FuU', 1);
  });

/*SPRITES*/

  return { get: get, ids: ids, info: info, PAL: PAL, EXTRA: EXTRA, RAMPS: RAMPS, version: 1, _lay: lay, _def: def };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = COOK_SPR;
