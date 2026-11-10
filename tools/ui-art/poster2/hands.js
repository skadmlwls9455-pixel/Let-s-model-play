/* 손과 물건 — 방 10개 (둘째 판: sculpt.js) */
'use strict';
var L = require('./lib.js'), K = L.K, sd = L.sd, bez = L.bez, mat = L.mat;
var RED = mat('crimson'), STRAW = mat('straw');
function featherVane(len, wid) { return function (u, v) { var t = (27.5 - v) / len; if (t < 0 || t > 1) return 1; var w = wid * Math.pow(Math.sin(Math.PI * Math.min(1, 0.04 + t * 0.98)), 0.55) * (0.72 + 0.28 * t); return Math.abs(u - 16) - w; }; }
module.exports = {
  hat: ['모자', function (S) {   /* 밀짚모자: 챙 + 둥근 머리 + 빨간 띠 */
    S.solid(sd.ellipse(16, 22.5, 14, 5), 3, 'straw', { tone: function (u, v, t) { return (t === 2 && Math.round(u * 0.8 + v * 2.2) % 5 === 0) ? 3 : t; } });
    var bow = function (u) { return 1.6 * (1 - Math.pow((u - 16) / 8.2, 2)); };
    S.add(K.clip(K.ball(16, 17, 8.2, 9.5), function (u, v) { return v < 21.6 + 0.75 * bow(u); }),
      function (u, v) { var vb = v - bow(u); return vb > 17.2 && vb < 20.2 ? RED : STRAW; },
      { tone: function (u, v, t) { return v - bow(u) <= 17.2 && t === 2 && Math.round(u * 0.9 - v * 1.7) % 5 === 0 ? 3 : t; } });
    S.solid(sd.path(bez([23.6, 19.6], [26.6, 19], [27.6, 16], 6), 1.3, 0.7), 1.3, RED);
  }],
  quill: ['깃펜', function (S) {   /* 흰 깃펜 + 잉크병 */
    S.lathe(24.5, 21.6, 29.4, function (v) { return v < 23.2 ? 2.3 : 4.6 - 0.9 * Math.pow((v - 26.4) / 3, 2); }, 'ink');
    S.solid(sd.box(24.5, 21.2, 3, 0.9, 0.4), 0.7, 'navy');
    S.rotate(15, 16, 40, function () {
      S.solid(function (u, v) { var t = (28 - v) / 24; if (t < 0 || t > 1) return 1; var w = 6.2 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.05 + t * 0.97)), 0.55) * (0.7 + 0.3 * t); return Math.abs(u - 15) - w; }, 3.4,
        function (u) { return u < 15 ? mat('cloud') : mat('white'); },
        { tone: function (u, v, t) { var b = v + Math.abs(u - 15) * 0.9; return Math.abs(b - Math.round(b / 2.8) * 2.8) < 0.36 ? Math.min(4, t + 1) : t; } });
      S.stroke([[15, 4.5], [15, 28]], 1, 'X');
      S.solid(sd.path([[15, 27.6], [15, 31.6]], 0.95, 0.35), 0.95, 'wood');
    });
  }],
  button: ['단추', function (S) {
    S.solid(sd.circle(16, 16, 12.4), 2.6, 'blue');
    S.solid(sd.ring(16, 16, 8.4, 0.8), 0.8, mat('blue', { ramp: ['6', '5', '4', '3', '3'] }), { shadow: false, recv: false });
    [[13.2, 13.2], [18.8, 13.2], [13.2, 18.8], [18.8, 18.8]].forEach(function (p) { S.flat(sd.circle(p[0], p[1], 1.25), '2'); });
    S.stroke([[13.2, 13.2], [18.8, 18.8]], 1, 'f').stroke([[18.8, 13.2], [13.2, 18.8]], 1, 'e');
  }],
  umbrella: ['우산', function (S) {
    S.solid(sd.path([[16, 14], [16, 27.2]], 0.85), 0.85, 'wood');
    S.solid(sd.path(bez([16, 27.2], [16.2, 30.6], [12.4, 29.6], 6), 0.95), 0.95, 'wood');
    var edge = function (u) { return 15.4 + 1.5 * Math.abs(Math.sin((u - 2) / 28 * Math.PI * 4)); };
    S.add(K.clip(K.ball(16, 16.5, 14, 13), function (u, v) { return v < edge(u); }), function (u, v) { var k = (u - 16) / (14 * Math.sqrt(Math.max(0.02, 1 - Math.pow((v - 16.5) / 13, 2)))); return Math.floor((k + 1) * 2) % 2 ? mat('red') : RED; });
    S.ball(16, 3.2, 1, 1, 'iron');
    [[6, 22], [10, 25.5], [25.5, 21.5], [22, 26]].forEach(function (p) { L.drop(S, p[0], p[1], 1.05, 'glass'); });
  }],
  thread: ['실', function (S) {   /* 실패 + 바늘 */
    S.solid(sd.box(13.5, 25.2, 8.2, 1.9, 0.9), 1.2, 'wood');
    S.lathe(13.5, 8.6, 23.6, function () { return 5.9; }, RED, { tone: function (u, v, t) { return Math.round(v * 1.45 + (u - 13.5) * 0.12) % 2 ? t : Math.min(4, t + 1); } });
    S.solid(sd.box(13.5, 7, 8.2, 1.9, 0.9), 1.2, 'wood');
    S.stroke(bez([19, 15], [23, 17.5], [21.5, 22.5], 6).concat(bez([21.5, 22.5], [20.6, 26], [25, 28.6], 5)), 1, 'J', { ol: 'H' });
    S.rotate(26, 9, 28, function () { S.solid(sd.path([[26, 2.5], [26, 15.5]], 0.85, 0.3), 0.85, 'iron'); S.flat(sd.ellipse(26, 4.2, 0.3, 0.9), '1'); });
  }],
  knot: ['매듭', function (S) {   /* 8자 매듭 밧줄 */
    var rope = mat('cream', { ramp: ['f', 'e', 'd', 'c', 'b'], ol: 'a' }), tw = function (u, v, t) { return Math.round((u + v) * 0.9) % 3 === 0 ? Math.min(4, t + 1) : t; };
    S.solid(sd.path([[3, 25.5], [9.5, 19.5]], 1.9), 1.9, rope, { tone: tw });
    S.solid(sd.ring(12, 13.5, 6.2, 1.9), 1.9, rope, { tone: tw });
    S.solid(sd.ring(20, 19, 6.2, 1.9), 1.9, rope, { tone: tw });
    S.add(K.clip(K.solid(sd.ring(12, 13.5, 6.2, 1.9), 1.9), function (u, v) { return u > 14 && v > 14 && v < 20.5 && u < 19; }), rope, { tone: tw });   /* 위로 넘어가는 가닥 */
    S.solid(sd.path([[22.6, 12.8], [29, 6.5]], 1.9), 1.9, rope, { tone: tw });
  }],
  key: ['열쇠', function (S) {
    S.solid(sd.path([[13.5, 13.5], [25.5, 25.5]], 1.7), 1.7, 'gold');
    S.solid(sd.path([[21.3, 21.3], [18.6, 24]], 1.35), 1.35, 'gold');
    S.solid(sd.path([[24.8, 24.8], [22.1, 27.5]], 1.35), 1.35, 'gold');
    S.solid(sd.ring(10, 10, 5.2, 2.3), 2.3, 'gold');
    S.spark(25.5, 7, 2.6, 'F');
  }],
  lock: ['자물쇠', function (S) {
    S.solid(sd.union(sd.inter(sd.ring(16, 11.5, 5.9, 1.9), sd.half(0, 1, -11.5)), sd.path([[10.1, 11.5], [10.1, 16]], 1.9), sd.path([[21.9, 11.5], [21.9, 16]], 1.9)), 1.9, 'iron');
    S.solid(sd.box(16, 21.6, 10.2, 7.4, 2.2), 1.8, 'gold');
    S.flat(sd.union(sd.circle(16, 20.2, 2.1), sd.poly([[15, 21], [17, 21], [17.8, 25.6], [14.2, 25.6]])), '1');
  }],
  glass: ['유리', function (S) {   /* 유리병 + 담긴 물 */
    var prof = function (v) { return v < 10 ? 3.1 : v < 13.5 ? 3.1 + (v - 10) * 1.7 : v > 27 ? 9 - Math.pow((v - 27) / 1.6, 2) * 2.4 : 9.05; };
    S.lathe(16, 6.6, 28.6, prof, 'glass');
    S.lathe(16, 17.5, 27.9, function (v) { return prof(v) - 1.2; }, mat('blue', { spec: 0 }), { shadow: false, recv: false });
    S.flat(sd.ellipse(16, 17.6, 7.8, 0.9), '7');
    S.stroke([[9.6, 12.6], [9.6, 24]], 1, 'Z');
    S.solid(sd.box(16, 5, 3.6, 2.1, 0.7), 1.1, 'wood');
  }],
  chalk: ['분필', function (S) {   /* 분필 세 자루 + 칠판 */
    S.solid(sd.box(16, 25, 13.2, 4.6, 1), 1.1, 'dark');
    S.stroke([[6.5, 24.2], [13, 24.2]], 1, 'Y').stroke([[15.5, 26.2], [23.5, 26.2]], 1, 'X').stroke([[8, 26.6], [11, 26.6]], 1, 'X');
    [[9, 'white'], [15.5, 'pink'], [22, 'sky']].forEach(function (q, i) {
      S.rotate(q[0], 14, 34, function () { S.solid(sd.box(q[0], 12.5 + i * 0.8, 1.95, 6.8, 0.7), 1.5, q[1]); });
    });
  }]
};
