/* js/cook-steps-art.js -- round 7 (11-21): the pictures of the recipe book's five dishes, of the book itself and of the
 * two end buttons. Loads after js/cook-art.js, js/cook-dishes.js, js/cook-sprites.js and js/cook-steps.js. No DOM, no
 * clock, no random calls, integer geometry. Food comes from COOK_SPR (js/cook-sprites.js, the art lane); when a sprite
 * is missing a plain box of its listed size is drawn instead, so the kitchen always runs.
 *
 * COOK_ART.dishes[id] (jeon2, gyeran, jumeokbap2, kkochi2, cake) = one shared painter object:
 *   stepScene(b, o)   the 144 x 160 stage of one step. o = { step (recipe data), st (sim state), band (the dish's flip or
 *                     bake band so far), J (juice flags of js/cook.js), hit ({ m, fr } | null), finger ([x, y] art | null),
 *                     f (12 fps frame), still }
 *   revealScene(b, o) the finished dish. o = { id, look, t (frames since the reveal, null = at rest), still }
 *   base(b, o), dish(img, look, o), dishSmall(img, look, o)
 * COOK_ART.steps = { spr, book, bookLay, cover, endIcon, hand2, SIZE }
 *   book(V, o) paints one page of the recipe book into any buffer and returns the touch boxes { go, tabs: [...] } (V px).
 *   hand2(b, spec, u) = the ghost hand of a new gesture at u 0..1 of its loop (circle, hold, carry, rub).
 */
(function () {
  'use strict';
  var A = typeof COOK_ART !== 'undefined' ? COOK_ART : null;
  if (!A || typeof A.base !== 'function') return;
  var ST = typeof COOK_STEPS !== 'undefined' ? COOK_STEPS : null;
  var C = A.PAL, F = A.F, G = A.GEO, put = A.put, rect = A.rect, blit = A.blit, W = A.W, H = A.H;
  var RED = '#a53030', CORAL = '#cf573c', ROSE = '#df84a5';
  function sprSrc() { return typeof COOK_SPR !== 'undefined' && COOK_SPR && typeof COOK_SPR.get === 'function' ? COOK_SPR : null; }

  /* ---------- sprites: COOK_SPR by id and frame, anchored; a plain box when the art is not there yet ---------- */
  /* id -> [w, h, ax, ay, frames] (wip/round7/briefs/SPRITES.md): the size of the fallback box */
  var SIZE = {
    'dish.jeon': [80, 56, 40, 44, 3], 'dish.gyeran': [80, 56, 40, 44, 1], 'dish.jumeokbap': [80, 56, 40, 44, 1], 'dish.kkochi': [80, 56, 40, 44, 1], 'dish.cake': [80, 56, 40, 44, 1],
    'bowl': [88, 68, 44, 40, 1], 'mix.jeon': [60, 40, 30, 22, 4], 'mix.egg': [60, 40, 30, 22, 4], 'mix.rice': [60, 40, 30, 22, 3], 'mix.cake': [60, 40, 30, 22, 4],
    'egg': [24, 28, 12, 22, 3], 'greens': [72, 32, 36, 20, 4], 'jug': [44, 44, 22, 34, 2], 'jeon.pan': [76, 56, 38, 30, 5], 'pan.square': [100, 76, 50, 42, 1],
    'gyeran.pan': [84, 60, 42, 32, 7], 'gyeran.board': [76, 40, 38, 26, 4], 'pot.rice': [76, 60, 38, 38, 4], 'paddle': [28, 36, 14, 30, 2], 'shaker': [20, 32, 10, 28, 1],
    'rice.shape': [60, 48, 30, 32, 5], 'gim': [24, 32, 12, 26, 1], 'basin': [100, 68, 50, 40, 1], 'fruit.wash': [68, 44, 34, 24, 3], 'fruit.board': [76, 44, 38, 26, 3],
    'fruit.piece': [20, 20, 10, 14, 3], 'skewer': [100, 20, 50, 12, 4], 'pot.syrup': [76, 60, 38, 38, 2], 'kkochi.coat': [100, 28, 50, 16, 3], 'tin': [76, 60, 38, 36, 4],
    'oven': [116, 100, 58, 60, 4], 'cake.base': [76, 56, 38, 38, 4], 'berry.top': [16, 18, 8, 14, 1], 'whisk': [28, 44, 14, 40, 1],
    'book.emblem': [32, 32, 16, 16, 1]
  };
  var TONE = [[C.w6, C.w4], [C.a3, C.a1], [C.g4, C.g2], [C.b4, C.b2], [C.s6, C.s3], [ROSE, C.p2]];
  var memo = {};
  function fallback(id, frame) {
    var z = SIZE[id] || [16, 16, 8, 13, 1], w = z[0], h = z[1], b = A.blank(w, h), k = 0, i, x, y;
    for (i = 0; i < id.length; i++) k = (k * 31 + id.charCodeAt(i)) >>> 0;
    var tone = TONE[k % TONE.length], m = w > 20 ? 2 : 1;
    for (y = m; y < h - m; y++) for (x = m; x < w - m; x++) {
      var edge = x === m || y === m || x === w - m - 1 || y === h - m - 1;
      put(b, x, y, edge ? C.r0 : tone[0]);
    }
    for (i = 0; i <= frame && i < 8; i++) rect(b, m + 3 + i * 4, m + 3, 2, 2, tone[1]);   /* one dot per frame: the state shows */
    return { buf: b, ax: z[2], ay: z[3], frames: z[4], plain: true };
  }
  function sprOf(id, frame) {
    frame = frame | 0; if (frame < 0) frame = 0;
    var S = sprSrc(), key = id + '|' + frame + '|' + (S ? S.version || 1 : 0), hit = memo[key];
    if (hit) return hit;
    var out = null;
    try {
      var inf = S ? S.info(id) : null;
      if (inf) {
        var fr = Math.min(frame, Math.max(0, (inf.frames | 0) - 1)), g = S.get(id, fr);
        if (g && g.d && g.w > 0 && g.h > 0) out = { buf: { w: g.w, h: g.h, d: g.d }, ax: inf.ax | 0, ay: inf.ay | 0, frames: inf.frames | 0, plain: false };
      }
    } catch (e) { out = null; }
    if (!out) { var z = SIZE[id]; out = fallback(id, Math.min(frame, z ? z[4] - 1 : 0)); }
    memo[key] = out;
    return out;
  }
  /* draw sprite id at frame with its anchor on (x, y) */
  function spr(b, id, frame, x, y) { var s = sprOf(id, frame); blit(b, s.buf, (x | 0) - s.ax, (y | 0) - s.ay); return s; }
  function frames(id) { return sprOf(id, 0).frames || 1; }
  function byShare(id, share) { var n = frames(id); return Math.max(0, Math.min(n - 1, Math.floor(share * (n - 1) + 1e-6))); }
  function silhouette(b, id, frame, x, y, col) {
    var s = sprOf(id, frame), x0 = (x | 0) - s.ax, y0 = (y | 0) - s.ay, i, j;
    for (j = 0; j < s.buf.h; j++) for (i = 0; i < s.buf.w; i++) if (s.buf.d[(j * s.buf.w + i) * 4 + 3]) put(b, x0 + i, y0 + j, col);
  }

  /* ---------- grounds (cached stills) ---------- */
  var cache = {};
  function cached(key, paint) { if (!cache[key]) { var c = A.blank(W, H); paint(c); cache[key] = c; } return cache[key]; }
  function ground(b, station, heat, round, f, still) {
    if (station === 'stove') { A.base(b, { station: 'stove', pan: !!round, heat: !!heat, f: f, still: still }); return; }
    if (station === 'board') {
      b.d.set(cached('board', function (c) { A.base(c, { station: 'counter' }); A.board(c, G.board.x, G.board.y, G.board.w, G.board.h, false); A.frame(c); }).d);
      return;
    }
    b.d.set(cached('counter', function (c) { A.base(c, { station: 'counter' }); }).d);
  }
  var MIX_DY = -12;   /* a bowl's contents sit this far above the bowl's anchor (its footprint centre) */
  function half(p) { return [(p.x | 0) >> 1, (p.y | 0) >> 1]; }
  function riceMound(b, x, y, n) {   /* plain cooked rice in the bowl while it is being scooped in (n 1..3) */
    if (n <= 0) return;
    var rx = 7 + 4 * n, ry = 3 + 2 * n;
    A.ellipse(b, x, y + 1, rx, ry, C.w5); A.ellipse(b, x, y, rx, ry, C.s5); A.ellipse(b, x - 1, y - 1, rx - 1, ry - 1, C.s6);
  }
  function stream(b, x, y0, y1, f) {   /* the pour: a 2 px column of batter with a moving light bead */
    for (var y = y0; y <= y1; y++) { put(b, x, y, F.B1); put(b, x + 1, y, F.B2); if (((y + (f | 0)) % 5) === 0) put(b, x, y, F.J6); }
  }
  function kerf(b, x0, y0, x1, y1) {   /* a cut through the food: a dark line with a light lip, only over painted food */
    var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)), i, x, y, v = x0 === x1;
    for (i = 0; i <= n; i++) {
      x = x0 + Math.round((x1 - x0) * i / (n || 1)); y = y0 + Math.round((y1 - y0) * i / (n || 1));
      put(b, x, y, F.J0); put(b, x + (v ? 1 : 0), y + (v ? 0 : 1), F.J5);
    }
  }
  function guideOf(b, st, f) {   /* the lit guide and the knife of a slice step */
    var ln = st.lines && st.lines[st.cur], kn;
    if (ln && !ln.cut) {
      var vert = ln.ax === ln.bx, a = half({ x: ln.ax, y: ln.ay }), z = half({ x: ln.bx, y: ln.by });
      A.guide(b, (a[0] + z[0]) >> 1, (a[1] + z[1]) >> 1, vert ? 90 : 0, vert ? z[1] - a[1] : z[0] - a[0], f, ln.bins);
      kn = st.hand ? [st.hand.x >> 1, st.hand.y >> 1, vert ? 90 : 0] : null;
    } else kn = st.hand ? [st.hand.x >> 1, st.hand.y >> 1, 90] : null;
    if (!kn) kn = G.rest.knife;
    A.knife(b, kn[0] | 0, kn[1] | 0, kn[2] | 0);
  }
  function cutsOf(st) { var n = 0; (st.lines || []).forEach(function (l) { if (l.cut) n++; }); return n; }
  function tool(b, id, hand, rest) { var p = hand ? half(hand) : rest; if (p) spr(b, id, 0, p[0], p[1]); }

  /* ---------- one painter per art type ---------- */
  var SCENE = {
    cuts: function (b, o, a, st) {
      ground(b, 'board');
      var n = cutsOf(st), c = o.J && o.J.cut;
      spr(b, a.spr, n, 72, 86 + (c && c.f === 0 ? -1 : 0));
      if (c && c.f === 0 && st.lines[c.i]) { var l = st.lines[c.i], p = half({ x: l.ax, y: l.ay }), q = half({ x: l.bx, y: l.by }); A.line(b, p[0], p[1], q[0], q[1], C.s6); }
      guideOf(b, st, o.f);
    },
    cross: function (b, o, a, st) {
      ground(b, 'board');
      var c = o.J && o.J.cut;
      spr(b, a.spr, a.bands[o.band == null ? 1 : o.band], a.at[0], a.at[1]);
      (st.lines || []).forEach(function (l, i) {
        if (!l.cut) return;
        var p = half({ x: l.ax, y: l.ay }), q = half({ x: l.bx, y: l.by }), vert = l.ax === l.bx, d = 4;
        if (c && c.i === i && c.f === 0) A.line(b, p[0], p[1], q[0], q[1], C.s6);
        else kerf(b, p[0] + (vert ? 0 : d), p[1] + (vert ? d : 0), q[0] - (vert ? 0 : d), q[1] - (vert ? d : 0));
      });
      guideOf(b, st, o.f);
    },
    crack: function (b, o, a, st) {
      ground(b, 'counter');
      (st.marks || []).forEach(function (m, i) {
        var p = half(m), dy = o.hit && o.hit.m === i && o.hit.fr === 1 && !o.still ? 1 : 0;
        spr(b, 'egg', Math.min(2, m.n), p[0], p[1] + 10 + dy);
      });
      spr(b, 'bowl', 0, a.bowl[0], a.bowl[1]);
      if (st.done) spr(b, a.mix, 0, a.bowl[0], a.bowl[1] + MIX_DY);
      else (st.marks || []).forEach(function (m, i) {   /* a cracked egg has dropped into the bowl */
        if (m.n < st.per) return;
        var x = a.bowl[0] - 10 + i * 10, y = a.bowl[1] + MIX_DY + (i === 1 ? 2 : -1);
        A.ellipse(b, x, y, 6, 4, C.s6); A.ellipse(b, x, y, 3, 2, F.J4); put(b, x - 1, y - 1, F.J6);
      });
    },
    bowl: function (b, o, a, st) {
      ground(b, 'counter');
      if (a.pot) spr(b, 'pot.rice', 3, a.pot[0], a.pot[1]);
      spr(b, 'bowl', 0, a.bowl[0], a.bowl[1]);
      var cx = a.bowl[0], cy = a.bowl[1] + MIX_DY, wob = o.J && o.J.flash && !o.still ? 1 : 0;
      spr(b, a.mix, byShare(a.mix, st.progress), cx, cy + wob);
      var deg = Math.round(st.deg || 0) % 360;
      var p = st.hand ? half(st.hand) : [cx + ((12 * A.cos(deg)) >> 12), cy + ((6 * A.sin(deg)) >> 12)];
      spr(b, 'whisk', 0, p[0], p[1]);
    },
    glaze: function (b, o, a, st) {
      ground(b, 'stove', true, false, o.f, o.still);
      spr(b, 'pot.syrup', o.still ? 0 : ((o.f | 0) >> 2) & 1, a.pot[0], a.pot[1]);
      spr(b, a.spr, byShare(a.spr, st.progress), a.at[0], a.at[1] + (st.q & 1));
    },
    pour: function (b, o, a, st) {
      ground(b, a.pan === 'none' ? 'counter' : 'stove', false, a.pan === 'round', o.f, o.still);
      if (a.pan === 'square') spr(b, 'pan.square', 0, 72, 88);
      var fr = st.done ? a.rest : a.frames[Math.min(st.fill, a.frames.length - 1)];
      if (fr >= 0) spr(b, a.spr, fr, a.at[0], a.at[1]);
      var on = !!st.hold && !st.done, jx = 98, jy = 66;
      if (on) stream(b, a.at[0] + 4, jy - 18, a.at[1] - 2, o.f);
      spr(b, 'jug', on ? 1 : 0, jx, jy);
    },
    flip: function (b, o, a, st) {
      ground(b, 'stove', st.heat, true, o.f, o.still);
      var band = st.res === null ? st.band : st.res, arc = o.J && o.J.arc, dy = 0;
      if (arc) dy = -[5, 11, 12, 4][arc.f] - (arc.lift | 0); else if (o.J && o.J.bump) dy = -1;
      spr(b, a.spr, a.bands[band], a.at[0], a.at[1] + dy);
      if (st.heat && st.res === null && !arc) A.arrow(b, G.flipArrow[0], G.flipArrow[1], o.still ? 0 : ((o.f | 0) >> 2) & 1);
      var sp = o.finger && !arc ? o.finger : G.rest.spatula;
      A.spatula(b, sp[0], sp[1]);
    },
    roll: function (b, o, a, st) {
      ground(b, 'stove', true, false, o.f, o.still);
      spr(b, 'pan.square', 0, 72, 88);
      spr(b, a.spr, a.from + st.n, a.at[0], a.at[1] + (o.J && o.J.bump ? -1 : 0));
      if (!st.done) A.arrow(b, 72, 116, o.still ? 0 : ((o.f | 0) >> 2) & 1);
      var sp = st.hand ? [st.hand.x >> 1, (st.hand.y >> 1) - 8] : G.rest.spatula;
      A.spatula(b, sp[0], sp[1]);
    },
    scoop: function (b, o, a, st) {
      ground(b, 'counter');
      spr(b, 'pot.rice', Math.min(3, st.n), a.pot[0], a.pot[1]);
      spr(b, 'bowl', 0, a.bowl[0], a.bowl[1]);
      riceMound(b, a.bowl[0], a.bowl[1] + MIX_DY, st.n);
      var held = st.pen ? st.items[st.pen.i] : null, next = null;
      (st.items || []).forEach(function (it) { if (!it.on && !next && it !== held) next = it; });
      if (held) spr(b, a.item, 1, held.x >> 1, (held.y >> 1) + 4);
      else if (next) spr(b, a.item, 0, next.hx >> 1, (next.hy >> 1) + 6);
    },
    sprinkle: function (b, o, a, st) {
      ground(b, 'counter');
      spr(b, 'pot.rice', 3, a.pot[0], a.pot[1]);
      spr(b, 'bowl', 0, a.bowl[0], a.bowl[1]);
      var cx = a.bowl[0], cy = a.bowl[1] + MIX_DY;
      if (st.done) spr(b, a.mix, 0, cx, cy);
      else {
        riceMound(b, cx, cy, 3);
        for (var k = 0; k < st.bins.length; k++) {   /* sesame and salt where the shaker has been */
          if (!st.bins[k]) continue;
          var x = cx - 15 + (k * 7) % 31, y = cy - 6 + (k * 5) % 11;
          if ((x - cx) * (x - cx) * 64 + (y - cy) * (y - cy) * 324 <= 324 * 64) put(b, x, y, k & 1 ? C.w1 : C.a2);
        }
      }
      tool(b, a.tool, st.hand ? { x: st.hand.x, y: st.hand.y - 20 } : null, [104, 96]);
    },
    press: function (b, o, a, st) {
      ground(b, 'board');
      var fr = Math.min(3, Math.floor(st.hits / st.per)), sq = o.J && o.J.squash === 1 && !o.still ? 1 : 0;
      spr(b, a.spr, fr, a.at[0], a.at[1] + sq);
      if (!st.done) A.marks(b, (st.marks || []).map(function (m) { return [m.x >> 1, m.y >> 1, m.n >= st.per ? 0 : 3 - m.n]; }), o.f);
    },
    wrap: function (b, o, a, st) {
      ground(b, 'board');
      spr(b, a.spr, st.done ? 4 : 3, a.at[0], a.at[1]);
      var it = st.items[0]; if (it && !it.on) spr(b, a.item, 0, it.x >> 1, (it.y >> 1) + 10);
    },
    wash: function (b, o, a, st) {
      ground(b, 'counter');
      spr(b, 'basin', 0, a.basin[0], a.basin[1]);
      var wob = st.hand && !o.still ? ((o.f | 0) & 1) : 0;
      spr(b, a.spr, Math.max(0, Math.min(2, st.third - (st.done ? 1 : 0))), a.at[0], a.at[1] + wob);
      if (st.hand && !o.still) {   /* ripples under the finger */
        var p = half(st.hand), r = 3 + ((o.f | 0) & 3);
        for (var d = -r; d <= r; d += 2) { put(b, p[0] + d, p[1] - 4, C.s6); put(b, p[0] + d + 1, p[1] + 4, C.b4); }
      }
    },
    thread: function (b, o, a, st) {
      ground(b, 'board');
      spr(b, 'skewer', Math.min(3, st.n), a.skewer[0], a.skewer[1]);
      (st.items || []).forEach(function (it, i) { if (!it.on) spr(b, a.item, i, it.x >> 1, (it.y >> 1) + 4); });
    },
    oven: function (b, o, a, st) {
      ground(b, 'counter');
      var band = st.res === null ? st.band : st.res;
      spr(b, a.spr, st.heat ? 1 + band : 0, a.at[0], a.at[1]);
      if (st.heat && st.res === null && !o.still && ((o.f | 0) & 4)) { put(b, a.at[0] - 30, a.at[1] - 52, F.J4); put(b, a.at[0] - 29, a.at[1] - 52, F.J5); }   /* the lamp blinks */
    },
    spread: function (b, o, a, st) {
      ground(b, 'board');
      spr(b, a.spr, Math.min(3, st.third), a.at[0], a.at[1]);
      var sp = st.hand ? [st.hand.x >> 1, (st.hand.y >> 1) - 8] : [104, 120];
      A.spatula(b, sp[0], sp[1]);
    },
    top: function (b, o, a, st) {
      ground(b, 'board');
      spr(b, a.spr, 3, a.at[0], a.at[1]);
      (st.items || []).forEach(function (it) { spr(b, a.item, 0, it.x >> 1, (it.y >> 1) + 6); });
    }
  };

  var P = {};
  P.stepScene = function (b, o) {
    o = o || {};
    var step = o.step, st = o.st, a = step && step.art, fn = a && SCENE[a.type];
    if (!fn || !st) { ground(b, 'counter'); return b; }
    fn(b, o, a, st);
    return A.frame(b);
  };
  P.base = function (b, o) { ground(b, o && o.station === 'stove' ? 'stove' : o && o.station === 'board' ? 'board' : 'counter', false, false, 0, true); return A.frame(b); };

  /* ---------- the finished dish ---------- */
  var DISH = { jeon2: 'dish.jeon', gyeran: 'dish.gyeran', jumeokbap2: 'dish.jumeokbap', kkochi2: 'dish.kkochi', cake: 'dish.cake' };
  var ICON = { jeon2: 'icon.jeon', gyeran: 'icon.gyeran', jumeokbap2: 'icon.jumeokbap', kkochi2: 'icon.kkochi', cake: 'icon.cake' };
  var HOT = { jeon2: 1, gyeran: 1 };
  function dishFrame(id, look) { return id === 'jeon2' && look && typeof look.band === 'number' ? Math.max(0, Math.min(2, look.band | 0)) : 0; }
  function mat(b) {   /* a cloth under the dish: the dish sprites bring their own plates */
    var x0 = 34, y0 = 60, w = 76, h = 60, x, y;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var e = x === 0 || y === 0 || x === w - 1 || y === h - 1, s = x % 8 === 3 || y % 8 === 3;
      put(b, x0 + x, y0 + y, e ? C.b2 : s ? C.b4 : C.s6);
    }
    rect(b, x0 + 2, y0 + h, w, 2, C.w2);
  }
  P.revealScene = function (b, o) {
    o = o || {};
    var id = o.id, t = o.t == null ? 99 : o.t | 0, lift = t <= 3 ? 2 : t === 4 ? 1 : 0, sq = t === 5 ? 1 : 0;
    b.d.set(cached('mat', function (c) { A.base(c, { station: 'counter' }); mat(c); }).d);
    spr(b, DISH[id] || 'dish.jeon', dishFrame(id, o.look), 72, 100 - lift + sq);
    if (!o.still && t >= 6) {
      var k = (t - 6) % 96;
      A.twinkle(b, k - 8, 52, 70, 2); A.twinkle(b, k - 40, 94, 66, 2); A.twinkle(b, k - 70, 76, 60, 1);
      if (HOT[id]) for (var i = 0; i < 3; i++) {   /* three thin wisps of steam */
        var ph = (k + i * 11) % 24, sx = 58 + i * 14 + ((ph >> 2) & 1), sy = 62 - (ph >> 1);
        if (ph < 20) { put(b, sx, sy, C.s6); if (ph < 12) put(b, sx, sy + 1, C.s5); }
      }
    }
    return A.frame(b);
  };
  function centre(img, s) { blit(img, s.buf, (img.w - s.buf.w) >> 1, (img.h - s.buf.h) >> 1); }
  P.dish = function (img, look, o) { var id = o && o.recipe; centre(img, sprOf(DISH[id] || 'dish.jeon', dishFrame(id, look))); return img; };
  P.dishSmall = function (img, look, o) { var id = o && o.recipe; centre(img, sprOf(ICON[id] || 'icon.jeon', 0)); return img; };
  A.dishes = A.dishes || {};
  Object.keys(DISH).forEach(function (id) { A.dishes[id] = P; });

  /* ---------- ghost hands of the new gestures. spec = { kind, ... } in stage art px; u = 0..1 of one loop:
     appear and wait (0..0.15), perform (0.15..0.85), wait (0.85..1). still = one resting pose ---------- */
  function ease(u) { var v = (u - 0.15) / 0.7; return v < 0 ? 0 : v > 1 ? 1 : v; }
  function hand2(b, s, u, still) {
    if (!s) return b;
    var v = still ? 0.5 : ease(u), x, y, deg, i;
    if (s.kind === 'circle') {
      deg = Math.round(v * 360) - 90;
      for (i = 0; i < 360; i += 24) if (still || i <= v * 360) put(b, s.x + ((s.rx * A.cos(i - 90)) >> 12), s.y + ((s.ry * A.sin(i - 90)) >> 12), C.s6);
      x = s.x + ((s.rx * A.cos(deg)) >> 12); y = s.y + ((s.ry * A.sin(deg)) >> 12);
      A.hand(b, { kind: 'tap', x: x, y: y, still: true });
    } else if (s.kind === 'hold') {
      A.hand(b, { kind: 'tap', x: s.x, y: s.y, f: still || (u > 0.15 && u < 0.85) ? 2 : 0, still: still });
      if (!still && u > 0.15 && u < 0.85) for (i = 0; i < 3; i++) if (v * 3 > i) rect(b, s.x - 7 + i * 6, s.y - 8, 3, 2, C.s6);   /* it stays: three beats */
    } else if (s.kind === 'carry') {
      x = s.x0 + Math.round((s.x1 - s.x0) * v); y = s.y0 + Math.round((s.y1 - s.y0) * v);
      for (i = 0; i <= 8; i++) if ((i & 1) === 0 && i / 8 <= v) put(b, s.x0 + Math.round((s.x1 - s.x0) * i / 8), s.y0 + Math.round((s.y1 - s.y0) * i / 8), C.s6);
      A.hand(b, { kind: 'tap', x: x, y: y, still: true });
    } else if (s.kind === 'rub') {
      var tri = still ? 0 : Math.abs(((v * 4) % 2) - 1) * 2 - 1;   /* two passes, back and forth */
      x = s.x + Math.round(tri * s.w); y = s.y + Math.round((v - 0.5) * s.h);
      A.hand(b, { kind: 'tap', x: x, y: y, still: true });
    }
    return b;
  }

  /* ---------- small pictures ---------- */
  function grid(b, rows, key, x, y) {
    for (var j = 0; j < rows.length; j++) for (var i = 0; i < rows[j].length; i++) { var c = key[rows[j].charAt(i)]; if (c) put(b, x + i, y + j, c); }
  }
  var FX = {   /* the day effect of a dish, 12 x 12: a small dusk window with what will follow the player that day */
    sparkle: ['............', '..w.........', '.wWw....w...', '..w....wWw..', '........w...', '....w.......', '...wWw......', '....w...w...', '.......wWw..', '.w......w...', '............', '............'],
    star: ['............', '.....y......', '.....y......', '...yyYyy....', '....yYy.....', '....y.y.....', '........y...', '.......yYy..', '..y.....y...', '.yYy........', '..y.........', '............'],
    petal: ['............', '..pp........', '.pPp....pp..', '.pp....pPp..', '.......pp...', '....pp......', '...pPp......', '...pp.......', '.........pp.', '..pp....pPp.', '..pPp...pp..', '...pp.......'],
    bubble: ['............', '...bb.......', '..b.Wb......', '..b..b..bb..', '...bb..b.Wb.', '.......b..b.', '..bb....bb..', '.b.Wb.......', '.b..b...bb..', '..bb...b.Wb.', '.......b..b.', '........bb..'],
    confetti: ['............', '.r...y....b.', '.r....y...b.', '....g.......', '...g....r...', '.y.......r..', '.y...b......', '......b...g.', '..r......g..', '...r..y.....', '.......y....', '.b..........']
  };
  var FX_KEY = { w: C.s5, W: C.s6, y: C.a2, Y: C.a3, p: C.p3, P: ROSE, b: C.b3, r: CORAL, g: C.g4 };
  function fxPic(b, name, x, y) {
    rect(b, x - 1, y - 1, 14, 14, C.r0); rect(b, x, y, 12, 12, C.b1);
    grid(b, FX[name] || FX.sparkle, FX_KEY, x, y);
  }
  var STAMP = ['...rrrrr...', '..r.....r..', '.r..r.r..r.', 'r..rrrrr..r', 'r.rrrrrrr.r', 'r..rrrrr..r', 'r.rrrrrrr.r', 'r..rrrrr..r', '.r..r.r..r.', '..r.....r..', '...rrrrr...'];
  /* the two end buttons, 20 x 20: a plate of food with the octopus beside it; a plate on the table by an empty seat */
  var END = {
    call: ['....................', '...........ooooo....', '..........oCCCCCo...', '.........oCCCCCCCo..', '.........oCkCCCkCo..', '.........oCkCCCkCo..', '.........oCCCCCCCo..', '.........oCCCCCCCo..', '..........oCCCCCo...', '...ffff..oCoCoCoCo..', '..fFFFFf.oCoCoCoCo..', '.fFFhFFFfoCoCoCoCo..', '.fFFFFFFf.o.o.o.o...', 'wwwwwwwwww..........', 'wPPPPPPPPw..........', '.wPPPPPPw...........', '..wwwwww............', '....................', '....................', '....................'],
    table: ['....................', '....................', '.....ffff...........', '....fFFFFf.....ss...', '...fFFhFFFf....sS...', '...fFFFFFFf....sS...', '..wwwwwwwwww...sS...', '..wPPPPPPPPw...sS...', '...wwwwwwww....sS...', 'tttttttttttttt.sS...', 'tTTTTTTTTTTTTt.sssss', 'tttttttttttttt.sSSSs', '..tt......tt...sssss', '..tt......tt...s...s', '..tt......tt...s...s', '..tt......tt...s...s', '..tt......tt...s...s', '....................', '....................', '....................']
  };
  var END_KEY = { o: C.w0, C: CORAL, k: C.w0, f: C.r1, F: C.a2, h: C.a3, w: C.s3, P: C.s6, t: C.w1, T: C.w3, s: C.w1, S: C.w4 };
  function endIcon(name) { var b = A.blank(20, 20); grid(b, END[name] || END.table, END_KEY, 0, 0); return b; }

  /* ---------- the recipe book ---------- */
  var TAB_W = 15, TAB_H = 19, PAGE_H = 98, PAGE_TALL = 116;   /* tall: the step pictograms get two rows (no overlap) where the screen has the rows */
  /* where the page sits in a view W wide with rows top..bot free: { x0, y0, w, tabs: [[x, y, w, h]...], go: [x, y, w, h] } */
  function bookLay(Wv, top, bot, n) {
    var tall = bot - top >= PAGE_TALL + TAB_H, ph = tall ? PAGE_TALL : PAGE_H;
    var total = ph + TAB_H, y0 = top + Math.max(0, (bot - top - total) >> 1), w = Math.min(Wv - 4, 84), x0 = (Wv - w) >> 1;
    var tw = n * TAB_W, tx = (Wv - tw) >> 1, tabs = [];
    for (var i = 0; i < n; i++) tabs.push([tx + i * TAB_W, y0 + ph - 1, TAB_W, TAB_H]);
    return { x0: x0, y0: y0, w: w, h: ph, tall: tall, tabs: tabs, go: [x0 + 2, y0 + 2, w - 4, 58] };
  }
  function paper(V, x0, y0, w, h) {
    rect(V, x0 + 2, y0 + 2, w, h, C.w1);                    /* its shadow on the counter */
    rect(V, x0, y0, w, h, C.r0); rect(V, x0 + 1, y0 + 1, w - 2, h - 2, C.w6);
    rect(V, x0 + 1, y0 + 1, w - 2, 1, C.s6); rect(V, x0 + 1, y0 + 1, 1, h - 2, C.s6);
    for (var y = y0 + 4; y < y0 + h - 2; y += 6) { put(V, x0 + 3, y, C.r0); put(V, x0 + 4, y, C.w4); }   /* the binding holes */
  }
  function row(V, ids, x0, w, y, frameOf) {   /* small pictures in a row, spread over w */
    var n = ids.length; if (!n) return;
    var pitch = n > 1 ? Math.min(20, Math.floor((w - 16) / (n - 1))) : 0, x = x0 + ((w - (16 + pitch * (n - 1))) >> 1);
    ids.forEach(function (id, i) { spr(V, id, frameOf ? frameOf(i) : 0, x + i * pitch + 8, y + 13); });
  }
  /* o = { ids, sel, locked: { id: true }, made: { id: true }, top, bot, open (0..3, 3 = open), dx (page nudge), f } */
  function book(V, o) {
    var ids = o.ids || [], n = ids.length, L = bookLay(V.w, o.top | 0, o.bot | 0, n), id = ids[o.sel | 0], r = ST ? ST.recipe(id) : null;
    var open = o.open == null ? 3 : o.open | 0, x0 = L.x0 + (o.dx | 0), y0 = L.y0, w = L.w, cx = x0 + (w >> 1);
    if (open <= 0) {   /* the closed cover */
      rect(V, x0 + 2, y0 + 2, w, L.h + 8, C.w0); rect(V, x0, y0, w, L.h + 8, C.w0); rect(V, x0 + 1, y0 + 1, w - 2, L.h + 6, C.r1);
      rect(V, x0 + 1, y0 + 1, 5, L.h + 6, C.r0); rect(V, x0 + 8, y0 + 6, w - 14, 1, C.a1); rect(V, x0 + 8, y0 + L.h, w - 14, 1, C.a1);
      spr(V, 'book.emblem', 0, cx + 2, y0 + (L.h >> 1) + 4);
      return L;
    }
    paper(V, x0, y0, w, L.h);
    if (open === 1) { rect(V, x0, y0, w >> 1, L.h, C.w0); rect(V, x0 + 1, y0 + 1, (w >> 1) - 2, L.h - 2, C.r1); return L; }   /* the cover half way */
    L.tabs.forEach(function (t, i) {
      var on = i === (o.sel | 0), lock = !!(o.locked && o.locked[ids[i]]), x = t[0], y = t[1], h = on ? t[3] : t[3] - 2;
      rect(V, x, y, t[2], h, C.r0); rect(V, x + 1, y + (on ? 0 : 1), t[2] - 2, h - 1 - (on ? 0 : 1), on ? C.w6 : lock ? C.w4 : C.w5);
      if (lock) silhouette(V, ICON[ids[i]], 0, x + 7, y + 15, C.w2); else spr(V, ICON[ids[i]], 0, x + 7, y + (on ? 16 : 15));
    });
    if (open === 2 || !r) return L;
    var locked = !!(o.locked && o.locked[id]), dy = y0 + 2;
    for (var ly = dy + 62; ly < y0 + L.h - 3; ly += 18) rect(V, x0 + 7, ly + 16, w - 12, 1, C.w5);   /* ruled lines under the rows */
    if (locked) {
      silhouette(V, DISH[id], 0, cx, dy + 46, C.w4);
      rect(V, cx - 10, dy + 18, 20, 20, C.r0); rect(V, cx - 9, dy + 19, 18, 18, C.w6); spr(V, 'lock.cup', 0, cx, dy + 33);
      return L;
    }
    spr(V, DISH[id], id === 'jeon2' ? 1 : 0, cx, dy + 46);
    if (o.made && o.made[id]) grid(V, STAMP, { r: RED }, x0 + w - 16, dy + 2);
    var ings = (r.ings || []).map(function (k) { return 'ing.' + k; }), pics = r.steps.map(function (s) { return s.pic; });
    if (L.tall) { row(V, ings, x0 + 6, w - 10, dy + 60); fxPic(V, r.fx, x0 + 9, dy + 4); }   /* the day effect: a small window in the page's top corner */
    else { row(V, ings, x0 + 6, w - 26, dy + 60); fxPic(V, r.fx, x0 + w - 17, dy + 62); }
    if (L.tall && pics.length > 4) {   /* two rows, in reading order */
      var n1 = (pics.length + 1) >> 1;
      row(V, pics.slice(0, n1), x0 + 6, w - 10, dy + 78); row(V, pics.slice(n1), x0 + 6, w - 10, dy + 96);
    } else row(V, pics, x0 + 6, w - 10, dy + (L.tall ? 87 : 78));
    return L;
  }

  A.steps = { spr: spr, sprOf: sprOf, book: book, bookLay: bookLay, endIcon: endIcon, hand2: hand2, SIZE: SIZE, DISH: DISH, ICON: ICON, painter: P, fxPic: fxPic };
})();
