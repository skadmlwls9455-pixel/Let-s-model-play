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
  def('dish.cake', 80, 56, 40, 44, 1, function (F) {
    F.put(platter(66, 26, 'p'), 7, 26, OC, 0);
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
    F.put(c, 12, 8, 'EFu', 2);
    F.put(strawberry(), 36, 7, OR, 2);
    /* half a berry on the plate, cut face up */
    var hb = lay(9, 8); hb.rows(0, 0, ['..gGg....', '.rrrrrr..', 'rr====rr.', 'r==WW==rR', 'r==W===rR', '.r====rR.', '..rrrrR..', '...RRR...']);
    F.put(hb, 16, 39, OR, 1);
  });

  /* ---- triangle rice balls on a leaf plate ---- */
  function rot(pts, cx, cy, c, s) { return pts.map(function (p) { var x = p[0] - cx, y = p[1] - cy; return [cx + x * c - y * s, cy + x * s + y * c]; }); }
  function riceBall(c, s) {   /* 34 x 32 layer; c, s = cos and sin of the lean */
    var l = lay(34, 32), ox = 4, oy = 5;
    var tri = [[9, 0], [14, 0], [23, 16], [23, 19], [20, 22], [3, 22], [0, 19], [0, 16]].map(function (p) { return [p[0] + ox, p[1] + oy]; });
    var side = tri.map(function (p) { return [p[0] + 5, p[1] - 2]; });
    function R(pts) { return rot(pts.map(function (p) { return [p[0] + ox, p[1] + oy]; }), 16, 16, c, s); }
    l.poly(rot(side, 16, 16, c, s), 'e');
    l.on('e').poly(R([[16, 10], [23, 8], [23, 22], [16, 24]]), 'T').on();
    l.on('e').poly(R([[5, -3], [20, -3], [27, 9], [21, 9]]), 'Q').on();
    l.poly(rot(tri, 16, 16, c, s), 'W');
    l.on('W').poly(R([[12, 17], [24, 15], [24, 23], [-1, 23], [-1, 20]]), 'Q').on();
    /* the seaweed strip, wrapped over the bottom edge */
    l.on('WQ').poly(R([[7, 12], [16, 12], [16, 23], [7, 23]]), 'T').on();
    l.on('T').poly(R([[8, 13], [10, 13], [10, 21], [8, 21]]), 't').on();
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
    F.put(back, 34, 6, 'EFu', 2);
    F.put(front, 14, 12, 'EFu', 2);
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
  function glaze(l) { return l; }
  def('dish.kkochi', 80, 56, 40, 44, 1, function (F) {
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
        var cx = 40 - dir * (9 + i * 9), cy = 33 - i * 9;
        F.put(f, cx - 6, cy - 6, f.ol, 2);
      });
    }
    var sb = strawberry(), gr = grape(), tg = tang(); sb.ol = OR; gr.ol = OG; tg.ol = OW;
    skewer(1, [sb, gr, tg]);
    skewer(-1, [tg, sb, gr]);
    /* drops of glaze on the plate */
    F.p(22, 44, 'W').p(23, 44, 'w').p(57, 45, 'W').p(40, 48, 'W').p(41, 48, 'w');
  });

  /* ---- seaweed pancake: cut pieces stacked on a round wicker tray, one lifted on chopsticks, a dish of soy dip ---- */
  var JEON_PTS = [
    [[2, 1], [25, 0], [27, 10], [1, 11]],
    [[4, 0], [27, 2], [24, 12], [0, 9]],
    [[0, 3], [22, 0], [26, 9], [4, 12]]];
  function jeonPiece(v, band) {
    var l = lay(28, 16), pts = JEON_PTS[v], cx = 0, cy = 0, i;
    function sh(dy) { return pts.map(function (p) { return [p[0], p[1] + dy]; }); }
    pts.forEach(function (p) { cx += p[0] / 4; cy += p[1] / 4; });
    l.poly(sh(3), '3').poly(sh(2), '6').poly(sh(1), '6').poly(pts, '2');
    l.on('2').poly(pts.map(function (p) { return [p[0] + (cx - p[0]) * 0.16, p[1] + (cy - p[1]) * 0.3]; }), '4').on();
    /* cut faces: green strands in the pale inside */
    l.on('6'); for (i = 2; i < 27; i += 5) l.p(i + v, 11 + ((i + v) % 3), 'g').p(i + v + 1, 11 + ((i + v) % 3), 'G'); l.on();
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
    c.ln(8, 16, 38, 1, 'F', 2).ln(8, 16, 38, 1, 'E');
    F.put(c, 40, 2, 'uUV', 0);
    F.put(jeonPiece(2, f), 34, 6, OW, 0);
    var c2 = lay(40, 22);
    c2.ln(6, 12, 38, 6, 'F', 2).ln(6, 12, 38, 6, 'E');
    F.put(c2, 40, 4, 'uUV', 1);
  });
