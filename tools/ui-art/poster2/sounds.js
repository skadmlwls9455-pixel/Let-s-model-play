/* 소리와 리듬 — 방 7개 (둘째 판) */
'use strict';
var L = require('./lib.js'), K = L.K, sd = L.sd, bez = L.bez, mat = L.mat;
var MOON = mat('gold', { ramp: ['Z', 'f', 'F', 'E', 'D'], ol: 'C', spec: 0 });
function arcs(S, cx, cy, radii, side, key, ol) {   /* 퍼지는 소리 호: side 1 = 오른쪽, -1 = 왼쪽 */
  radii.forEach(function (R) { S.add(K.clip(K.flat(sd.ring(cx, cy, R, 0.55)), function (u, v) { return side * (u - cx) > Math.abs(v - cy) * 1.15; }), key, { ol: ol, shadow: false }); });
}
module.exports = {
  lullaby: ['자장가', function (S) {   /* 요람처럼 누운 초승달 + 음표 */
    S.solid(sd.sub(sd.circle(14, 16, 12.2), sd.circle(17.4, 11, 10.6)), 5, MOON);
    S.flat(sd.ellipse(7.4, 19.5, 1.1, 1.5), 'E').flat(sd.ellipse(13.5, 25.6, 1.5, 0.9), 'E');
    L.note(S, 19.5, 11.5, 'navy', 0.95); L.note(S, 26, 19.5, 'navy', 0.75);
    S.spark(27.5, 5, 2, 'F').spark(4.5, 5, 1.5, 'F');
  }],
  metronome: ['메트로놈', function (S) {
    S.solid(sd.box(16, 28.2, 11, 1.7, 0.6), 0.9, 'bark');
    S.solid(sd.poly([[12, 3.2], [20, 3.2], [25.6, 27], [6.4, 27]]), 1.7, 'wood');
    S.solid(sd.poly([[13.7, 6.6], [18.3, 6.6], [21.3, 22.6], [10.7, 22.6]]), 0.8, 'cream', { shadow: false });
    [10, 13, 16, 19].forEach(function (y) { S.stroke([[14.6, y], [17.4, y]], 0.8, 'd'); });
    S.rotate(16, 24, 17, function () { S.stroke([[16, 24], [16, 4.2]], 1, 'U'); S.solid(sd.box(16, 10.6, 2.1, 1.6, 0.4), 0.8, 'gold'); });
    S.ball(16, 24, 1.3, 1.3, 'steel');
  }],
  whale_song: ['고래의 노래', function (S) {
    S.solid(sd.path(bez([23, 18.5], [27.4, 16.5], [28.2, 11], 7), 2.5, 1.2), 2.5, 'blue');
    S.rotate(26.4, 9, -32, function () { S.ball(26.4, 9, 3.6, 1.6, 'blue'); });
    S.rotate(30, 10.8, 42, function () { S.ball(30, 10.8, 2.8, 1.4, 'blue'); });
    S.ball(13.5, 19.5, 12.6, 7.4, function (u, v) { return v > 21.6 - 0.014 * Math.pow(u - 13.5, 2) ? mat('white') : mat('blue'); },
      { tone: function (u, v, t) { return v > 22.4 - 0.014 * Math.pow(u - 13.5, 2) && ((u % 2.6) + 2.6) % 2.6 < 0.55 ? Math.min(4, t + 1) : t; } });
    S.flat(sd.circle(6.6, 18, 1), '0').flat(sd.circle(6.3, 17.7, 0.4), 'Z');
    [[12.4, 8.6, 1.2], [15, 5.8, 1], [10, 5.6, 0.85]].forEach(function (d) { L.drop(S, d[0], d[1], d[2], 'glass'); });
    L.note(S, 21, 6.5, 'navy', 0.8);
  }],
  bell: ['종', function (S) {
    S.solid(sd.ring(16, 4.4, 2.3, 1.05), 1.05, 'gold');
    S.ball(16, 27.4, 2.2, 2.2, 'amber');
    S.lathe(16, 6.2, 24.6, function (v) { var t = (v - 6.2) / 18.4; return 3 + 6.2 * Math.sin(Math.min(1, t * 1.25) * Math.PI / 2) + 2.6 * Math.pow(Math.max(0, t - 0.72) / 0.28, 2); }, 'gold');
    S.solid(sd.ellipse(16, 24.6, 11.9, 1.7), 1.2, 'gold', { shadow: false });
    S.stroke(bez([3.2, 12], [1.6, 16], [3.2, 20], 6), 1, 'F', { ol: 'D' }).stroke(bez([28.8, 12], [30.4, 16], [28.8, 20], 6), 1, 'F', { ol: 'D' });
  }],
  echo: ['메아리', function (S) {   /* 산과 산 사이를 오가는 소리 */
    S.solid(sd.poly([[13, 27.5], [24.5, 6], [31.4, 27.5]]), 1.8, 'leaf');
    S.solid(sd.poly([[24.5, 6], [27.6, 12.4], [25.2, 11.2], [23.6, 13.2], [21.4, 11.8]]), 0.8, 'white', { shadow: false });
    S.solid(sd.poly([[0.6, 27.5], [9.6, 8.5], [20, 27.5]]), 1.8, 'green');
    S.solid(sd.poly([[9.6, 8.5], [12.4, 13.8], [10.2, 12.8], [8.8, 14.8], [6.9, 13.6]]), 0.8, 'white', { shadow: false });
    S.solid(sd.box(16, 28.6, 15.4, 1.6, 0.6), 0.9, 'leaf');
    arcs(S, 13, 15.5, [3.2, 5.8, 8.4], 1, 'Z', '4');
  }],
  thunder: ['천둥', function (S) {
    [[6, 17], [26.5, 16.5], [5, 22.5], [27.5, 22]].forEach(function (p) { S.stroke([[p[0], p[1]], [p[0] - 1.2, p[1] + 3]], 1.1, '6', { ol: '3' }); });
    S.solid(sd.poly([[16.5, 11.5], [22, 11.5], [18, 18.6], [21.6, 18.6], [12.6, 30.5], [15.4, 21.6], [11.8, 21.6]]), 1.2, MOON);
    L.cloud(S, [[9, 10, 5.6, 4.2], [23.2, 10.2, 5.4, 4], [16, 7.6, 7, 5.6], [16, 12, 11.4, 3.2]], mat('dark', { ramp: ['W', 'V', 'U', 'T', 'S'], ol: '0' }));
  }],
  heartbeat: ['심장 박동', function (S) {   /* 하트 + 뛰는 줄 */
    S.solid(sd.union(sd.circle(10.8, 12, 6.9), sd.circle(21.2, 12, 6.9), sd.poly([[4.6, 15], [27.4, 15], [16, 28.8]])), 5.2, mat('pink', { ramp: ['Z', 'R', 'Q', 'P', 'O'], ol: 'N' }));
    S.stroke([[0.8, 17.6], [8.6, 17.6], [10.8, 14.2], [13.2, 21.4], [16, 8.6], [18.8, 24], [21, 17.6], [31.2, 17.6]], 1.5, 'Z', { ol: 'N' });
  }]
};
