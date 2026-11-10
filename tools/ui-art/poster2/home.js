/* 집과 사람 — 방 8개 (둘째 판) */
'use strict';
var L = require('./lib.js'), K = L.K, sd = L.sd, bez = L.bez, mat = L.mat;
var MOON = mat('gold', { ramp: ['Z', 'f', 'F', 'E', 'D'], ol: 'C', spec: 0 }), FLAME = mat('gold', { ramp: ['Z', 'f', 'F', 'E', 'D'], ol: 'C', spec: 0 });
var PATCH = [mat('crimson'), mat('blue'), mat('gold', { spec: 0 })];
function patch(ox, oy) { return function (u, v) { return PATCH[(((Math.floor((u - ox) / 4.4) + Math.floor((v - oy) / 4.4)) % 3) + 3) % 3]; }; }
function seam(ox, oy) { return function (u, v, t) { var a = (((u - ox) % 4.4) + 4.4) % 4.4, b = (((v - oy) % 4.4) + 4.4) % 4.4; return a < 0.55 || b < 0.55 ? Math.min(4, t + 1) : t; }; }
module.exports = {
  window: ['창문', function (S) {   /* 밤하늘이 보이는 창 + 커튼 */
    S.flat(sd.box(16, 14.5, 10.2, 10.4, 0), '2').flat(sd.box(16, 9, 10.2, 5, 0), '3');
    [[9.5, 7.6], [13.4, 11.4], [22.6, 6.8], [19, 18], [10.4, 19.4], [23, 21]].forEach(function (p) { S.flat(sd.circle(p[0], p[1], 0.6), 'Z'); });
    S.ball(21.2, 11.6, 2.7, 2.7, MOON, { shadow: false });
    S.solid(sd.box(16, 14.5, 0.8, 10.4, 0), 0.6, 'wood').solid(sd.box(16, 14.5, 10.2, 0.8, 0), 0.6, 'wood');
    S.solid(sd.sub(sd.box(16, 14.5, 12.6, 12.8, 1), sd.box(16, 14.5, 10.2, 10.4, 0.3)), 1.3, 'wood');
    var fold = function (u, v, t) { return Math.abs(Math.sin(u * 1.5)) < 0.35 ? Math.min(4, t + 1) : t; };
    S.solid(sd.poly([[5.6, 4], [11, 4], [9, 12], [8, 19], [5.6, 22.6]]), 1, 'crimson', { tone: fold });
    S.solid(sd.poly([[26.4, 4], [21, 4], [23, 12], [24, 19], [26.4, 22.6]]), 1, 'crimson', { tone: fold });
    S.solid(sd.box(16, 28.6, 14.4, 1.7, 0.5), 1, 'wood');
  }],
  candle: ['양초', function (S) {
    S.solid(sd.ring(26.2, 24.4, 2.7, 0.95), 0.95, 'gold');
    S.solid(sd.ellipse(16, 27.2, 9.8, 2.7), 1.5, 'gold');
    S.lathe(16, 13.6, 26.4, function () { return 4; }, mat('paper', { ramp: ['Z', 'Z', 'f', 'e', 'd'] }));
    S.solid(L.dropSdf(13.4, 17.6, 1.1), 1.1, mat('paper', { ramp: ['Z', 'Z', 'Z', 'f', 'e'] }), { shadow: false });
    S.flat(sd.ellipse(16, 13.7, 4, 1), 'f');
    S.stroke([[16, 13.6], [16, 11.2]], 0.9, '1');
    S.solid(L.dropSdf(16, 8.8, 3), 3, FLAME, { shadow: false });
    S.flat(L.dropSdf(16, 9.6, 1.3), 'Z');
    S.spark(6, 7, 1.7, 'F').spark(26.5, 9.5, 1.7, 'F').spark(7, 16, 1.2, 'F');
  }],
  blanket: ['담요', function (S) {   /* 개어 놓은 조각 담요 */
    S.solid(sd.box(16, 22.6, 13.4, 5.4, 2.4), 2.6, patch(2.6, 17.2), { tone: seam(2.6, 17.2) });
    S.solid(sd.box(16, 13.4, 12.4, 5.2, 2.4), 2.6, patch(3.6, 8.2), { tone: seam(3.6, 8.2) });
    for (var x = 4; x <= 28; x += 2) S.stroke([[x, 28], [x, 30]], 0.9, 'f', { ol: 'd' });
  }],
  tea: ['차', function (S) {
    S.solid(sd.ellipse(15, 26.4, 13, 2.9), 1.6, 'white');
    S.solid(sd.ring(24.3, 17.6, 3.7, 1.15), 1.15, 'white');
    S.lathe(15, 12.6, 25.4, function (v) { var t = (v - 12.6) / 12.8; return 9 - 3.8 * t * t; }, function (u, v) { return v > 17.2 && v < 18.6 ? mat('blue') : mat('white'); });
    S.solid(sd.ellipse(15, 12.6, 9, 2.3), 0.9, 'white', { shadow: false });
    S.flat(sd.ellipse(15, 12.8, 7.6, 1.5), 'C').flat(sd.ellipse(13.6, 12.5, 4, 0.7), 'D');
    S.stroke(bez([11, 9.5], [9.2, 7], [11.2, 4.8], 6), 1, 'Z', { ol: 'X' }).stroke(bez([17, 9], [15.2, 6.4], [17.4, 3.6], 6), 1, 'Z', { ol: 'X' });
  }],
  moss: ['이끼', function (S) {   /* 이끼 낀 돌 + 물방울 */
    S.ball(16, 22, 13.2, 7.6, 'stone', { flat: 0.15 });
    var speck = function (u, v, t) { return (Math.round(u * 1.3) + Math.round(v * 1.7)) % 4 === 0 ? Math.max(0, t - 1) : t; };
    [[9, 16, 4.8, 3.6], [23.2, 16.2, 4.8, 3.4], [16, 14, 6.4, 4.6], [16, 17.6, 11.4, 3.2]].forEach(function (b) { S.ball(b[0], b[1], b[2], b[3], 'green', { shadow: false, flat: 0.2, tone: speck }); });
    L.drop(S, 25.6, 7.6, 1.8, 'glass');
  }],
  pinecone: ['솔방울', function (S) {
    [[25, 1.6], [26.6, 4.6], [25, 8]].forEach(function (p) { S.stroke([[17, 4.6], p], 1, 't', { ol: 'r' }); });
    S.solid(sd.path([[16, 7], [16, 3]], 1.1), 1.1, 'bark');
    S.solid(sd.ellipse(16, 17.8, 9, 11.4), 7, 'bark', { tone: function (u, v, t) {
      var row = Math.floor((v - 6) / 3.1), lx = (((u + (row % 2 ? 2.2 : 0)) % 4.4) + 4.4) % 4.4, ly = (((v - 6) % 3.1) + 3.1) % 3.1;
      if (ly > 2.3 || lx > 3.7) return Math.min(4, t + 2); if (ly < 0.9 && lx > 0.7 && lx < 2.6) return Math.max(0, t - 1); return t; } });
  }],
  lantern: ['등불', function (S) {   /* 매달린 등불 */
    S.stroke([[16, 0.4], [16, 3.2]], 1, 'V', { ol: 'T' });
    S.solid(sd.ring(16, 4.7, 1.9, 0.75), 0.75, 'steel');
    S.solid(sd.box(16, 16.6, 5.6, 7.6, 0.8), 2.6, mat('gold', { ramp: ['Z', 'Z', 'f', 'F', 'E'], ol: 'D', spec: 0 }));
    S.flat(sd.circle(16, 17.2, 3.3), 'f').flat(L.dropSdf(16, 18, 1.9), 'Z');
    S.stroke([[10.7, 9], [10.7, 24.2]], 1.1, 'T').stroke([[21.3, 9], [21.3, 24.2]], 1.1, 'T');
    S.solid(sd.poly([[9.2, 9.4], [12.4, 6.4], [19.6, 6.4], [22.8, 9.4]]), 1, 'dark');
    S.solid(sd.box(16, 25, 7.4, 1.4, 0.5), 0.9, 'dark').solid(sd.box(16, 27.5, 3, 1.2, 0.4), 0.7, 'dark');
    S.spark(4.5, 13, 1.8, 'F').spark(27.5, 15.5, 1.8, 'F').spark(5.5, 22.5, 1.3, 'F').spark(26.5, 23.5, 1.3, 'F');
  }],
  letter_room: ['편지의 방', function (S) {   /* 열린 봉투와 아직 빈 편지지 */
    S.solid(sd.poly([[3.4, 15], [28.6, 15], [16, 4.6]]), 1, mat('cream', { ramp: ['f', 'e', 'd', 'c', 'b'] }));
    S.solid(sd.box(16, 12, 7.8, 9, 0.5), 0.8, 'paper');
    [7, 10, 13].forEach(function (y) { S.stroke([[11, y], [21, y]], 0.9, 'e'); });
    S.solid(sd.box(16, 21.8, 12.8, 7.2, 0.8), 1, 'cream');
    S.stroke([[3.6, 15.2], [16, 23.6], [28.4, 15.2]], 0.9, 'c').stroke([[3.8, 28.6], [12.4, 21.2]], 0.9, 'c').stroke([[28.2, 28.6], [19.6, 21.2]], 0.9, 'c');
    S.ball(16, 23.6, 2.6, 2.6, 'crimson');
  }]
};
