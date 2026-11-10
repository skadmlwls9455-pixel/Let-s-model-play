/* 수와 모양 — 방 8개 */
'use strict';
module.exports = {
  prime: ['소수', function (c) {   /* 체에 걸러 남은 칸 (2 3 5 7 11 13 17 19 23) */
    var primes = { 2: 1, 3: 1, 5: 1, 7: 1, 11: 1, 13: 1, 17: 1, 19: 1, 23: 1 };
    for (var n = 1; n <= 25; n++) { var gx = 2 + ((n - 1) % 5) * 6, gy = 2 + Math.floor((n - 1) / 5) * 6, p = primes[n]; c.R(gx, gy, 5, 5, p ? 'E' : 'e').R(gx, gy, 5, 1, p ? 'F' : 'f').R(gx, gy + 4, 5, 1, p ? 'D' : 'd'); if (p) c.dot(gx + 2, gy + 2, 'Z'); else c.L(gx + 1, gy + 3, gx + 3, gy + 1, 'c'); }
  }],
  knot_theory: ['매듭 이론', function (c) {   /* 세잎 매듭 */
    var tube = function (hi, lo) { return function (x, y) { return x + y < 30 ? hi : lo; }; };
    c.ring(16, 11, 8, 2.6, tube('6', '5')).ring(10.5, 20.5, 8, 2.6, tube('7', '6')).ring(21.5, 20.5, 8, 2.6, tube('5', '4'));
    /* 위·아래 엇갈림: 겹치는 자리 세 곳을 다시 덮어 그린다 */
    c.ring(16, 11, 8, 2.6, function (x, y) { return x < 14 && y > 13 ? (x + y < 30 ? '6' : '5') : null; });
    c.ring(10.5, 20.5, 8, 2.6, function (x, y) { return y > 22 && x > 13 ? '7' : null; });
    c.ring(21.5, 20.5, 8, 2.6, function (x, y) { return y < 17 && x > 19 ? '5' : null; });
    c.D([[4, 4], [28, 5]], '7');
  }],
  mobius: ['뫼비우스 띠', function (c) {   /* 한 번 꼬인 띠 */
    c.S(function (x, y) { var dx = (x + 0.5 - 16) / 14, dy = (y + 0.5 - 16) / 9, d = dx * dx + dy * dy; var din = Math.pow((x + 0.5 - 16) / 8.5, 2) + Math.pow((y + 0.5 - 16) / 4, 2); if (d > 1 || din < 1) return null; return y < 16 ? (x < 16 ? 'R' : 'Q') : (x < 16 ? 'P' : 'O'); });
    /* 꼬임: 앞쪽 가운데에서 색이 뒤집힌다 */
    c.S(function (x, y) { return y >= 20 && y <= 25 && x >= 12 && x <= 19 && c.get(x, y) ? (x + (y - 20) < 17 ? 'R' : 'O') : null; });
    c.L(13, 25, 19, 20, 'Z').L(3, 16, 5, 12, 'Z').dot(9, 9, 'Z');
    c.L(12, 20, 12, 25, 'N').L(20, 20, 20, 25, 'N');   /* 꼬인 자리의 접힌 선 */
  }],
  tessellation: ['테셀레이션', function (c) {   /* 빈틈없이 맞물린 마름모 (정육면체로 보이는 무늬) */
    c.S(function (x, y) {
      if (x < 2 || x > 29 || y < 2 || y > 29) return null;
      var u = x - 2, v = y - 2, row = Math.floor(v / 7), ox = row % 2 ? 4 : 0, lx = ((u + ox) % 8 + 8) % 8, ly = v % 7;
      if (ly < 3) { var half = ly + 1; return Math.abs(lx - 3.5) < half * 1.4 ? 'F' : (lx < 4 ? '5' : 'P'); }
      return lx < 4 ? 'P' : '5';
    });
    c.R(2, 2, 28, 1, 'Z');
  }],
  honeycomb: ['벌집', function (c) {
    function hex(cx, cy, full) { c.S(function (x, y) { var dx = Math.abs(x + 0.5 - cx), dy = Math.abs(y + 0.5 - cy); if (dy > 4.2 || dx > 5 - dy * 0.55) return null; var edge = dy > 3.2 || dx > 4 - dy * 0.55; return edge ? 'D' : full ? (y < cy ? 'F' : 'E') : 'B'; }); }
    [[8, 7, 1], [18, 7, 1], [13, 15, 1], [23, 15, 0], [3, 15, 1], [8, 23, 0], [18, 23, 1], [28, 23, 1], [28, 7, 0]].forEach(function (h) { hex(h[0], h[1], h[2]); });
    c.G(20, 12, ['.ZZ.', 'F1F1', 'F1F1', '.11.']).dot(19, 13, 'Y');   /* 벌 */
    c.D([[9, 6], [19, 22]], 'Z');
  }],
  spiral: ['나선', function (c) {   /* 앵무조개: 로그 나선 한 줄 + 방을 나누는 칸막이 */
    c.disc(17, 17, 14, function (x, y) { return x + y < 26 ? 'f' : x + y > 42 ? 'd' : 'e'; });
    var k = 0.2, prev = null;
    for (var th = 0; th < 13.2; th += 0.03) { var r = 0.9 * Math.exp(k * th), x = Math.round(16.5 + Math.cos(th) * r), y = Math.round(16.5 + Math.sin(th) * r); if (r > 14) break; c.dot(x, y, 'b'); if (r > 4) c.dot(x, y + 1, 'c'); prev = [x, y]; }
    for (var t2 = 3.2; t2 < 13; t2 += 0.62) { var r1 = 0.9 * Math.exp(k * t2), r0 = 0.9 * Math.exp(k * (t2 - 2 * Math.PI)); if (r0 < 0.9) r0 = 0.9; if (r1 > 14) break; c.L(Math.round(16.5 + Math.cos(t2) * (r0 + 1)), Math.round(16.5 + Math.sin(t2) * (r0 + 1)), Math.round(16.5 + Math.cos(t2 + 0.25) * (r1 - 1)), Math.round(16.5 + Math.sin(t2 + 0.25) * (r1 - 1)), 'c'); }
    c.S(function (x, y) { return Math.hypot(x + 0.5 - 17, y + 0.5 - 17) > 14 ? '_' : null; });
    c.D([[9, 8], [10, 7]], 'Z');
  }],
  zero: ['0', function (c) {   /* 큼직한 0 — 가운데는 비어 있다 */
    c.S(function (x, y) { var dx = (x + 0.5 - 16) / 10, dy = (y + 0.5 - 16) / 14, d = dx * dx + dy * dy, ix = (x + 0.5 - 16) / 5, iy = (y + 0.5 - 16) / 9; if (d > 1 || ix * ix + iy * iy < 1) return null; return x + y < 26 ? '7' : x + y > 40 ? '4' : '5'; });
    c.D([[14, 14], [18, 14], [16, 17], [14, 20], [18, 20]], 'Y');   /* 빈 자리 점 */
    c.spark(27, 5, '7').dot(4, 27, '6');
  }],
  abacus: ['주판', function (c) {
    c.R(2, 4, 28, 24, 'c').R(2, 4, 28, 1, 'd').R(4, 6, 24, 20, 'f').R(4, 11, 24, 2, 'c').R(4, 12, 24, 1, 'b');
    for (var i = 0; i < 5; i++) {
      var x = 6 + i * 5; c.R(x, 6, 1, 20, 'W');
      c.R(x - 1, i % 2 ? 6 : 8, 3, 2, 'J').dot(x - 1, i % 2 ? 6 : 8, 'K');
      var n = [3, 1, 4, 2, 0][i];
      for (var b = 0; b < 4; b++) { var by = b < n ? 13 + b * 3 : 15 + b * 3 - 1; c.R(x - 1, by, 3, 2, 'E').dot(x - 1, by, 'F'); }
    }
    c.R(2, 27, 28, 1, 'b');
  }]
};
