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
      F.put(jgShell(), 1, 12, 'Fuu', 0);
      F.put(jgShell().flip(), 11, 8, 'Fuu', 1);
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
    F.put(h, 11, 1, OD, 0);
  });
