/* 수와 모양 — 방 8개 (둘째 판) */
'use strict';
var L = require('./lib.js'), K = L.K, sd = L.sd, bez = L.bez, mat = L.mat;
module.exports = {
  prime: ['소수', function (S) {   /* 체에 걸러 남은 칸 (2 3 5 7 11 13 17 19 23) */
    var primes = { 2: 1, 3: 1, 5: 1, 7: 1, 11: 1, 13: 1, 17: 1, 19: 1, 23: 1 };
    for (var n = 1; n <= 25; n++) {
      var cx = 4 + ((n - 1) % 5) * 6, cy = 4 + Math.floor((n - 1) / 5) * 6;
      S.solid(sd.box(cx, cy, 2.6, 2.6, 0.7), 1, primes[n] ? mat('gold', { spec: 0 }) : mat('cream'));
      if (!primes[n]) S.stroke([[cx - 1.2, cy + 1.2], [cx + 1.2, cy - 1.2]], 0.9, 'c');
    }
  }],
  knot_theory: ['매듭 이론', function (S) {   /* 세잎 매듭 (진짜 곡선: 위아래로 엇갈리는 관) */
    var C = function (t) { return [Math.sin(t) + 2 * Math.sin(2 * t), Math.cos(t) - 2 * Math.cos(2 * t), -Math.sin(3 * t)]; };
    var tube = L.surface(function (t, p) {
      var c = C(t), d = C(t + 0.01), tx = d[0] - c[0], ty = d[1] - c[1], tz = d[2] - c[2], l = Math.hypot(tx, ty, tz); tx /= l; ty /= l; tz /= l;
      var nx = -ty, ny = tx, nz = 0, nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;                       /* 화면 평면 안의 수직 */
      var bx = ty * nz - tz * ny, by = tz * nx - tx * nz, bz = tx * ny - ty * nx, r = 1.75;
      return [16 + c[0] * 4.3 + r * (Math.cos(p) * nx + Math.sin(p) * bx), 17.4 + c[1] * 4.3 + r * (Math.cos(p) * ny + Math.sin(p) * by), c[2] * 3 + r * (Math.cos(p) * nz + Math.sin(p) * bz)];
    }, 900, 28, 2 * Math.PI, 0, 2 * Math.PI);
    S.add(tube, 'blue');
  }],
  mobius: ['뫼비우스 띠', function (S) {   /* 한 번 꼬인 띠 (진짜 곡면을 기울여 본 모습) */
    var ph = 1.02, cp = Math.cos(ph), sp = Math.sin(ph);
    var band = L.surface(function (th, w) {
      var r = 1 + w * Math.cos(th / 2), x = r * Math.cos(th), y = r * Math.sin(th), z = w * Math.sin(th / 2);
      return [16 + x * 10.6, 16.5 + (y * cp - z * sp) * 10.6, (y * sp + z * cp) * 10.6];
    }, 1100, 70, 2 * Math.PI, -0.4, 0.4);
    S.add(band, mat('pink', { ramp: ['Z', 'R', 'Q', 'P', 'O'], ol: 'N' }), { th: [0.9, 0.62, 0.3, 0.05] });
  }],
  tessellation: ['테셀레이션', function (S) {   /* 빈틈없이 맞물린 마름모 (쌓인 정육면체로 보인다) */
    var a = 4.4, hexS = sd.poly(L.ngon(16, 16, 13.6, 6, 0));
    S.add(K.flat(hexS), function (u, v) {
      var x = u - 16, y = v - 16, q = (Math.sqrt(3) / 3 * x - y / 3) / a, r = (2 / 3 * y) / a, s2 = -q - r;
      var rq = Math.round(q), rr = Math.round(r), rs = Math.round(s2), dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s2);
      if (dq > dr && dq > ds) rq = -rr - rs; else if (dr > ds) rr = -rq - rs;
      var cx = a * Math.sqrt(3) * (rq + rr / 2), cy = a * 1.5 * rr, ang = Math.atan2(y - cy, x - cx) * 180 / Math.PI;
      return ang >= -150 && ang < -30 ? 'F' : ang >= -30 && ang < 90 ? 'P' : '5';
    }, { ol: 'M', shadow: false });
  }],
  honeycomb: ['벌집', function (S) {
    var d = 7.6, cells = [[16, 16, 1]];
    for (var i = 0; i < 6; i++) { var an = i * Math.PI / 3; cells.push([16 + Math.cos(an) * d, 16 + Math.sin(an) * d, i === 1 || i === 4 ? 0 : 1]); }
    cells.forEach(function (c) { S.flat(sd.poly(L.ngon(c[0], c[1], 5, 6, 0)), 'D', { ol: 'B' }); });
    cells.forEach(function (c) { S.solid(sd.poly(L.ngon(c[0], c[1], 3.9, 6, 0)), 1.6, c[2] ? 'honey' : mat('amber', { ramp: ['C', 'B', 'B', 'A', 'A'], ol: 'A' }), { shadow: false }); });
    S.ball(21.4, 12.4, 1.9, 1.5, 'glass', { shadow: false }).ball(24, 11.6, 1.9, 1.5, 'glass', { shadow: false });   /* 벌 */
    S.ball(22.6, 14.4, 3, 2.1, function (u) { return Math.floor((u - 19.6) / 1.2) % 2 ? mat('dark', { ramp: ['U', 'T', 'S', '1', '0'] }) : mat('gold', { spec: 0 }); });
  }],
  spiral: ['나선', function (S) {   /* 앵무조개: 로그 나선 + 방을 나누는 칸막이 */
    S.ball(16.5, 16.5, 13.6, 13.6, 'cream', { flat: 0.55 });
    var k = 0.2, pts = [], th;
    for (th = 0.4; th < 13.4; th += 0.12) { var r = 0.9 * Math.exp(k * th); if (r > 13) break; pts.push([16.5 + Math.cos(th) * r, 16.5 + Math.sin(th) * r]); }
    for (th = 3.4; th < 13.2; th += 0.66) { var r1 = 0.9 * Math.exp(k * th), r0 = Math.max(0.9, 0.9 * Math.exp(k * (th - 2 * Math.PI))); if (r1 > 13) break; S.stroke([[16.5 + Math.cos(th) * (r0 + 0.6), 16.5 + Math.sin(th) * (r0 + 0.6)], [16.5 + Math.cos(th + 0.28) * (r1 - 0.6), 16.5 + Math.sin(th + 0.28) * (r1 - 0.6)]], 0.9, 'd'); }
    S.stroke(pts, 1.1, 'b');
  }],
  zero: ['0', function (S) {   /* 큼직한 0 */
    S.solid(sd.sub(sd.ellipse(16, 16, 10.4, 14), sd.ellipse(16, 16, 4.6, 8.4)), 2.9, 'blue');
    S.spark(27.5, 5.5, 2.4, 'Z', { ol: '4' });
  }],
  abacus: ['주판', function (S) {
    for (var i = 0; i < 5; i++) S.stroke([[7.5 + i * 4.25, 6], [7.5 + i * 4.25, 26]], 0.9, 'W');
    S.solid(sd.box(16, 11.4, 12.4, 0.9, 0), 0.8, 'wood');
    S.solid(sd.sub(sd.box(16, 16, 14.2, 12.2, 1.8), sd.box(16, 16, 11.8, 9.8, 0.6)), 1.4, 'wood');
    for (i = 0; i < 5; i++) {
      var x = 7.5 + i * 4.25, n = [3, 1, 4, 2, 0][i];
      S.ball(x, i % 2 ? 7.9 : 9.4, 1.9, 1.25, 'crimson');
      for (var b = 0; b < 4; b++) S.ball(x, b < n ? 14 + b * 2.5 : 15.6 + b * 2.5, 1.9, 1.2, 'gold');
    }
  }]
};
