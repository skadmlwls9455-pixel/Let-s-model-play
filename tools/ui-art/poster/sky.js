/* 하늘과 날씨 — 방 9개 (둘째 판) */
'use strict';
var L = require('./lib.js'), K = L.K, sd = L.sd, bez = L.bez, mat = L.mat;
var MOON = mat('gold', { ramp: ['Z', 'f', 'F', 'E', 'D'], ol: 'C', spec: 0 });
module.exports = {
  feather: ['깃털', function (S) {   /* 큼직한 푸른 깃털 */
    S.rotate(16, 16, 42, function () {
      S.solid(sd.path([[16, 28], [16, 32.6]], 0.9, 0.4), 0.9, 'cloud');
      S.solid(function (u, v) { var t = (28.6 - v) / 26.6; if (t < 0 || t > 1) return 1; var w = 7.6 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.05 + t * 0.97)), 0.55) * (0.7 + 0.3 * t); return Math.abs(u - 16) - w; }, 4.4,
        function (u) { return u < 16 ? mat('sky', { ramp: ['Z', '7', '7', '6', '5'], ol: '3' }) : mat('blue', { ramp: ['7', '6', '6', '5', '4'], ol: '3' }); },
        { tone: function (u, v, t) { var b = v + Math.abs(u - 16) * 0.9; return Math.abs(b - Math.round(b / 3.2) * 3.2) < 0.42 ? Math.min(4, t + 1) : t; } });
      S.stroke([[16, 2.6], [16, 28.6]], 1, 'Z');
    });
  }],
  rain: ['비', function (S) {
    [[7, 15.5], [12.5, 17.5], [18.5, 15.5], [24.5, 17.5], [9.5, 21.5], [15.5, 23.5], [21.5, 21.5]].forEach(function (p) { S.stroke([[p[0], p[1]], [p[0] - 1.3, p[1] + 3.2]], 1.1, '6', { ol: '3' }); });
    S.solid(sd.ellipse(16, 29.4, 10.5, 1.5), 1, 'blue');
    L.cloud(S, [[9, 10.5, 5.6, 4.2], [23.2, 10.8, 5.4, 4], [16, 8.2, 7, 5.6], [16, 12.6, 11.4, 3.2]], mat('stone', { ol: 'S' }));
  }],
  cloud_names: ['구름 이름', function (S) {   /* 위에서부터 새털구름 · 뭉게구름 · 층구름 */
    [[4, 5.5], [13, 4], [21.5, 6]].forEach(function (p) { S.stroke(bez([p[0], p[1] + 1.6], [p[0] + 3.5, p[1] - 1.6], [p[0] + 8, p[1]], 6), 1.2, 'Z', { ol: 'W' }); });
    L.cloud(S, [[10, 15.5, 4.6, 3.6], [22, 15.8, 4.4, 3.4], [16, 13.4, 6, 4.8], [16, 17.2, 10, 2.8]], mat('cloud', { ol: 'U' }));
    [0, 1, 2].forEach(function (i) { S.solid(sd.box(16 + (i - 1) * 1.5, 23.2 + i * 2.7, 12.5 - i * 1.4, 1.1, 1.1), 1.1, mat('cloud', { ol: 'U' })); });
  }],
  rainbow: ['무지개', function (S) {
    ['J', 'L', 'F', 'u', '5', 'P'].forEach(function (k, i) { S.flat(sd.inter(sd.ring(16, 24.5, 14.2 - i * 1.6, 0.82), sd.half(0, 1, -24)), k, { ol: i === 0 ? 'H' : 'N' }); });
    L.cloud(S, [[3.6, 25.6, 3, 2.6], [9.6, 25.8, 3.2, 2.6], [6.4, 23.8, 4, 3.4]], mat('cloud', { ol: 'U' }));
    L.cloud(S, [[28.4, 25.6, 3, 2.6], [22.4, 25.8, 3.2, 2.6], [25.6, 23.8, 4, 3.4]], mat('cloud', { ol: 'U' }));
  }],
  light: ['빛', function (S) {   /* 프리즘: 흰 빛 한 줄기 → 여섯 빛깔 */
    S.stroke([[0.6, 18.4], [12, 14.6]], 1.7, 'Z', { ol: 'W' });
    ['J', 'L', 'F', 'u', '5', 'P'].forEach(function (k, i) { S.flat(sd.poly([[18.5, 13.4 + i * 0.35], [31.4, 8 + i * 2.9], [31.4, 8 + (i + 1) * 2.9], [18.5, 13.4 + (i + 1) * 0.35]]), k, { ol: i < 3 ? 'H' : 'N' }); });
    S.solid(sd.poly([[15, 4.5], [25.5, 25.5], [4.5, 25.5]]), 2, 'glass');
    S.stroke([[14.6, 8], [8, 22.6]], 1, 'Z');
  }],
  star: ['별', function (S) {
    S.solid(sd.grow(sd.poly(L.starPts(16, 16.8, 12.6, 5.4, 5, 0)), 1.3), 4.6, MOON);
    S.spark(4.5, 6, 2.2, 'F').spark(27.8, 26, 2.2, 'F').spark(27.2, 6, 1.5, 'Z', { ol: 'D' });
  }],
  moon: ['달', function (S) {
    S.solid(sd.sub(sd.circle(14.5, 16, 12.5), sd.circle(20.6, 12.4, 10.8)), 5, MOON);
    S.flat(sd.ellipse(7.2, 15, 1.2, 1.6), 'E').flat(sd.ellipse(10, 23, 1.4, 1), 'E');
    S.spark(23.5, 11.5, 3, 'Z', { ol: 'D' }).spark(27.5, 22.5, 2, 'F').spark(27, 4.5, 1.6, 'F');
  }],
  wind: ['바람', function (S) {   /* 감기는 바람 줄기 셋 + 날리는 잎 */
    function gust(y, len, r) { var pts = [[2, y], [len, y]]; for (var a = 80; a >= -150; a -= 23) { var q = a * Math.PI / 180; pts.push([len + Math.cos(q) * r, y - r + Math.sin(q) * r]); } S.solid(sd.path(pts, 0.95, 0.6), 0.95, mat('cloud', { ol: 'V' })); }
    gust(11.5, 19.5, 3); gust(19.5, 23.5, 3.6); gust(27, 14, 2.4);
    S.rotate(27, 6.5, 30, function () { S.solid(sd.ellipse(27, 6.5, 2.6, 1.4), 1.2, 'green'); });
    S.rotate(6.5, 23, -25, function () { S.solid(sd.ellipse(6.5, 23, 2.2, 1.2), 1.1, 'leaf'); });
    S.rotate(22, 28.6, 20, function () { S.solid(sd.ellipse(22, 28.6, 1.9, 1.1), 1, 'amber'); });
  }],
  snow: ['눈', function (S) {   /* 눈 결정 */
    for (var i = 0; i < 6; i++) {
      var a = i * Math.PI / 3, dx = Math.sin(a), dy = -Math.cos(a);
      [0.5, 0.8].forEach(function (f, n) { [-1, 1].forEach(function (sgn) { var b = a + sgn * Math.PI / 3, x0 = 16 + dx * 13 * f, y0 = 16 + dy * 13 * f, len = n ? 2.6 : 3.8; S.stroke([[x0, y0], [x0 + Math.sin(b) * len, y0 - Math.cos(b) * len]], 1, 'Z', { ol: '5' }); }); });
      S.stroke([[16, 16], [16 + dx * 13.4, 16 + dy * 13.4]], 1.2, 'Z', { ol: '5' });
    }
    S.flat(sd.poly(L.ngon(16, 16, 2.6, 6, 0)), '7').flat(sd.circle(16, 16, 0.9), 'Z');
  }]
};
