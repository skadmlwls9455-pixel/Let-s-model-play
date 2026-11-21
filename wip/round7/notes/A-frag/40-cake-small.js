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
    '...tttttWrWt..',
    '..t8tttWrWtt..',
    '.ttttt8WrWttt.',
    'tttttWrWt8ttT.',
    'tt8tWrWttttTT.',
    'ttttWrWttttT8.',
    '8888WrW8888TT.',
    'TTTTTWrWTTTT8.',
    '.8888WrW8888T.',
    '.TTTTTWrWTTTT.',
    '..88888888888.'], '877');
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
    '..qgg.qgg...',
    '.qWgGqWggG..',
    '.gggGgggGG..',
    '..GGqggGqgg.',
    '..qggWgGWgG.',
    '.qWgGggGggG.',
    '.gggGqggGG..',
    '..GGqWgG....',
    '....gggG....',
    '....gGGG....',
    '.....GG.....'], OG);
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
  def('cafe.coffee', 32, 32, 16, 26, 1, function (F) {
    var s = lay(28, 9);
    s.e(0, 1, 28, 8, 'm').e(0, 0, 28, 8, 'w').on('w').ring(3, 1, 22, 5, 1, 'p').e(14, 3, 14, 5, 'l').on();
    F.put(s, 2, 21, OC, 0);
    var hd = lay(7, 8);
    hd.ring(0, 0, 7, 8, 2, 'w').on('w').r(4, 4, 3, 4, 'l').on();
    F.put(hd, 21, 15, OC, 0);
    var c = lay(18, 15);
    c.rr(0, 2, 18, 13, 6, 'w').r(0, 2, 18, 5, 'w');
    c.on('w').r(13, 0, 5, 15, 'l').r(16, 0, 2, 15, 'm').r(2, 6, 1, 6, 'W').r(4, 13, 10, 2, 'l').r(0, 9, 13, 1, 'p').on();
    c.e(0, 0, 18, 6, 'w').e(1, 1, 16, 4, 'K').e(2, 1, 13, 3, 'k').p(4, 2, 'a').p(5, 2, 'a').p(6, 2, 'y');
    c.on('w').e(9, 3, 9, 3, 'l').on();
    F.put(c, 5, 11, OC, 1);
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
  });

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
