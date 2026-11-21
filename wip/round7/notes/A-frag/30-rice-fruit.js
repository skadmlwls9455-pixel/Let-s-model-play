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
    F.put(l, 2, 3, 'EFu', 0);
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
      F.put(r, 6, 4, 'EFu', 2);
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
      F.put(l, 7, 14, 'EFu', 2);
      g = lay(2, 1); g.r(0, 0, 2, 1, 'W');
      [[5, 30], [52, 37], [44, 12], [12, 38], [55, 22]].forEach(function (p) { F.put(g, p[0], p[1], 'EFu', 0); });
    } else if (f === 1) {
      /* pressed into a rounder ball */
      l = lay(34, 26);
      l.e(1, 3, 33, 23, 'e').ball(0, 0, 33, 25, 'W', 'W', 'Q', 5);
      l.on('W'); rfDots(l, 3, 3, 24, 16, 14, 'Q', 1); l.on('Q'); rfDots(l, 8, 14, 22, 10, 8, 'e', 2); l.on();
      F.put(l, 13, 10, 'EFu', 2);
      g = lay(2, 1); g.r(0, 0, 2, 1, 'W');
      F.put(g, 7, 34, 'EFu', 0); F.put(g, 51, 30, 'EFu', 0);
    } else if (f === 2) {
      /* a soft triangle: round corners, bulging sides, still low */
      l = rfTri([[7, 3], [11, 1], [16, 3], [22, 12], [24, 17], [22, 21], [18, 23], [5, 23], [1, 21], [-1, 17], [1, 12]], 3, -1);
      l.on('W'); rfDots(l, 6, 9, 18, 14, 8, 'Q', 3); l.on();
      F.put(l, 13, 7, 'EFu', 2);
    } else if (f === 3) {
      l = rfTri([[9, 0], [14, 0], [23, 16], [23, 19], [20, 22], [3, 22], [0, 19], [0, 16]], 5, -2);
      F.put(l, 13, 7, 'EFu', 2);
    } else {
      F.put(riceBall(1, 0), 13, 7, 'EFu', 2);
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
    var l = lay(96, 56);
    l.e(0, 4, 96, 52, 'n').r(0, 26, 96, 4, 'n');
    l.on('n').r(0, 0, 22, 56, 'm').r(72, 0, 24, 56, 'N').on();
    l.e(0, 0, 96, 52, 'l');
    l.on('l').e(0, 0, 89, 46, 'w').on();
    l.e(3, 2, 90, 47, 'm');
    l.on('m').r(52, 0, 44, 28, 'n').r(3, 0, 26, 30, 'l').on();
    l.on('mnl').e(4, 7, 88, 44, 'z').on();
    l.on('z').e(5, 9, 86, 44, 'C').on();
    /* ripples and a glint */
    l.on('C').ring(14, 13, 40, 14, 1, 'w').e(13, 15, 42, 14, 'C').ring(48, 30, 34, 12, 1, 'z').e(46, 28, 35, 12, 'C');
    l.ln(60, 16, 74, 18, 'w').ln(24, 38, 40, 41, 'w').ln(66, 24, 76, 25, 'z').ln(16, 30, 24, 32, 'z').on();
    l.p(22, 17, 'W').p(23, 17, 'W').p(22, 18, 'W').p(27, 16, 'W');
    F.put(l, 2, 9, OS, 0);
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
      if (f > 1) F.ring(x - 6, ry - 1, l.w + 12, 11, 1, 'w');
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
    if (f) { st.on('A').r(40, 1, 50, 1, 'y').on().on('y').r(44, 0, 46, 1, '6').on(); if (f > 1) st.map({ A: 'y', y: '6' }).p(20, 0, 'W').p(21, 0, 'W').p(36, 0, 'W'); }
    F.put(st, 5, 14, OW, 0);
    list.forEach(function (o, i) {
      var l = o[0].copy(), w = l.w, h = l.h;
      if (f === 0) l.map({ W: i === 1 ? 'q' : (i ? '5' : 'c'), '=': 'c', '6': '5' });
      if (f === 2) {
        /* a long glint down the lit side and a small one opposite */
        l.on('*').ln(3, 2, 2, 5, 'W').p(4, 2, 'W').p(3, 6, 'W').p(w - 4, h - 5, 'W').p(w - 3, h - 6, 'W').p(w - 5, h - 3, '6').on();
      }
      F.put(rfSugar(l, f), o[1] - 1, o[2] - 1, f > 1 ? 'yAa' : o[3], 0);
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
