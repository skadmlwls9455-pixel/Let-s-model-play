/* 주제 9개 대표 그림 (둘째 판) — 도서관 방이 아닌 곳을 기억했을 때 그 주제의 그림으로 쓴다 */
'use strict';
var L = require('./lib.js'), K = L.K, sd = L.sd, bez = L.bez, mat = L.mat;
var MOON = mat('gold', { ramp: ['Z', 'f', 'F', 'E', 'D'], ol: 'C', spec: 0 }), CL = mat('cloud', { ol: 'U' });
module.exports = {
  hands: ['손과 물건', function (S) {   /* 실뭉치 · 바늘 · 단추 */
    S.stroke(bez([20, 25], [25, 29.6], [30.6, 26], 6), 1.3, 'J', { ol: 'H' });
    S.ball(13, 17.4, 10.4, 10.4, 'red', { tone: function (u, v, t) { return Math.round((u - v) * 0.6) % 2 ? t : Math.min(4, t + 1); } });
    S.add(K.clip(K.ball(13, 17.4, 10.4, 10.4), function (u, v) { return Math.abs((u - 13) * 0.5 + (v - 17.4) * 0.9) < 2.7; }), mat('crimson'),
      { shadow: false, tone: function (u, v, t) { return Math.round((u + v) * 0.6) % 2 ? t : Math.min(4, t + 1); } });
    S.rotate(24.5, 9, 35, function () { S.solid(sd.path([[24.5, 1.5], [24.5, 16.5]], 0.85, 0.3), 0.85, 'iron'); S.flat(sd.ellipse(24.5, 3.4, 0.3, 0.9), '1'); });
    S.solid(sd.circle(26, 22, 3.7), 1.3, 'blue');
    S.flat(sd.box(24.5, 21.5, 0.5, 0.5, 0), '2').flat(sd.box(26.5, 21.5, 0.5, 0.5, 0), '2');
  }],
  sea: ['바다와 생물', function (S) {   /* 말려 올라가는 물결 + 소라 */
    var top = function (u) { return 23.4 + 1.1 * Math.sin(u / 2.7); };
    S.solid(sd.inter(sd.sub(sd.circle(12.5, 17, 11.6), sd.circle(15.8, 19.6, 7.6)), sd.half(0, 1, -25.5)), 2.8, 'blue',
      { tone: function (u, v, t) { var d = Math.hypot(u - 12.5, v - 17); return d > 10.2 ? 0 : t; } });
    L.cloud(S, [[21.2, 10.6, 2.3], [23.4, 12.8, 1.7], [19, 8.8, 1.7]], mat('cloud', { ol: '4' }));
    S.solid(function (u, v) { return Math.max(top(u) - v, v - 29.2, 1.6 - u, u - 30.4); }, 2.2, 'blue');
    var crest = []; for (var u = 1.6; u <= 30.4; u += 0.8) crest.push([u, top(u) + 0.3]);
    S.stroke(crest, 1, 'Z', { ol: '3' });
    L.dot(S, 26.5, 7.5, 0.9, '7', '4'); L.dot(S, 28.5, 12.5, 0.6, '7', '4'); L.dot(S, 24.5, 4.5, 0.6, '7', '4');
    S.solid(sd.ellipse(25.5, 27.2, 3.2, 2.1), 1.5, 'cream'); S.flat(sd.box(25.5, 27.5, 0.5, 0.5, 0), 'd');
  }],
  sky: ['하늘과 날씨', function (S) {   /* 구름 뒤 해 */
    for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4; S.stroke([[21 + Math.cos(a) * 9.4, 11 + Math.sin(a) * 9.4], [21 + Math.cos(a) * 12, 11 + Math.sin(a) * 12]], 1.4, 'F', { ol: 'D' }); }
    S.ball(21, 11, 7.2, 7.2, MOON, { flat: 0.35 });
    L.cloud(S, [[8.6, 21.6, 5.6, 4.4], [22.8, 22.4, 5.4, 3.9], [15.4, 19, 7.2, 5.8], [16, 24.2, 12.2, 3.2]], CL);
  }],
  signs: ['기호와 언어', function (S) {   /* 펼친 책 + 깃펜 */
    S.stroke([[2.5, 25.8], [16, 28], [29.5, 25.8]], 1.6, 'c', { ol: 'a' });
    S.solid(sd.poly([[2.5, 11.8], [15.6, 14], [15.6, 26.4], [2.5, 24.2]]), 0.9, 'paper');
    S.solid(sd.poly([[16.4, 14], [29.5, 11.8], [29.5, 24.2], [16.4, 26.4]]), 0.9, 'cream');
    [[4.8, 15.6, 13.4, 17], [4.8, 18.6, 11.4, 19.7], [4.8, 21.6, 13.4, 23], [18.6, 17, 27.2, 15.6], [18.6, 20, 25.2, 18.9], [18.6, 23, 27.2, 21.6]].forEach(function (l) { S.stroke([[l[0], l[1]], [l[2], l[3]]], 1, '3'); });
    S.rotate(23, 8, 40, function () {
      S.solid(function (u, v) { var t = (15 - v) / 13; if (t < 0 || t > 1) return 1; var w = 3.6 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.05 + t * 0.97)), 0.55) * (0.7 + 0.3 * t); return Math.abs(u - 23) - w; }, 2.2, 'white');
      S.stroke([[23, 2.6], [23, 15]], 1, 'X');
      S.solid(sd.path([[23, 14.6], [23, 18]], 0.8, 0.35), 0.8, 'wood');
    });
  }],
  numbers: ['수와 모양', function (S) {   /* 삼각자 · 동그라미 · 네모 · 세모 */
    S.solid(sd.sub(sd.poly([[2.6, 3.6], [2.6, 17.6], [16.6, 17.6]]), sd.poly([[5.4, 10.2], [5.4, 14.8], [10, 14.8]])), 1, 'gold');
    S.ball(23.6, 9.6, 6.4, 6.4, 'blue', { flat: 0.25 });
    S.solid(sd.box(9.4, 24.4, 5.2, 5, 0.8), 1.5, 'purple');
    S.solid(sd.poly([[23.6, 17.8], [29.8, 29], [17.4, 29]]), 1.5, 'green');
  }],
  sounds: ['소리와 리듬', function (S) {   /* 이어진 음표 둘 */
    S.stroke(bez([3.6, 4.5], [1.8, 8], [3.6, 11.5], 6), 1, 'F', { ol: 'D' }).stroke(bez([6.6, 6], [5.4, 8], [6.6, 10], 4), 1, 'F', { ol: 'D' });
    S.solid(sd.box(12, 14.4, 0.95, 9.4, 0.2), 0.8, 'navy').solid(sd.box(24.4, 12.6, 0.95, 9.2, 0.2), 0.8, 'navy');
    S.solid(sd.poly([[11, 4.6], [25.4, 2.4], [25.4, 6.6], [11, 8.8]]), 0.9, 'navy');
    S.rotate(8.6, 23.8, -20, function () { S.ball(8.6, 23.8, 4.4, 3.3, 'navy'); });
    S.rotate(21, 21.8, -20, function () { S.ball(21, 21.8, 4.4, 3.3, 'navy'); });
  }],
  home: ['집과 사람', function (S) {   /* 불 켜진 작은 집 */
    S.solid(sd.box(16, 29.8, 14.6, 1.3, 0.6), 0.9, 'green');
    S.solid(sd.box(23, 7.4, 1.8, 3.4, 0.3), 0.8, 'wood');
    S.solid(sd.box(16, 22, 10, 7.2, 0.6), 1, 'cream');
    S.solid(sd.poly([[2.4, 15.8], [16, 3.6], [29.6, 15.8]]), 1.7, 'crimson');
    S.grid(9, 19, ['ZFcFF', 'FFcFF', 'ccccc', 'FFcFF', 'FFcFF']);
    S.solid(sd.box(20.6, 24.8, 2.5, 4.4, 0.7), 0.8, 'wood'); S.flat(sd.box(21.5, 25.5, 0.5, 0.5, 0), 'F');
    S.ball(24.4, 2.6, 1.4, 1.2, CL, { shadow: false });
  }],
  mind: ['생각하는 것', function (S) {   /* 생각 구름 + 반짝 */
    S.ball(9.2, 24.6, 2.7, 2.7, CL).ball(4.8, 28.8, 1.6, 1.6, CL);
    L.cloud(S, [[10, 13, 6.6, 5.6], [23.4, 14, 6, 5.2], [17.4, 10, 8, 6.6], [16.6, 16.6, 11, 4.6]], CL);
    S.spark(15.5, 12.5, 3, 'F').spark(22.5, 15.5, 2, 'E');
  }],
  wild: ['들판', function (S) {   /* 풀밭의 이정표 + 들꽃 */
    S.solid(sd.ellipse(16, 29.6, 14.6, 2.3), 1.5, 'green');
    S.solid(sd.box(16, 17.6, 1.3, 11.6, 0.4), 1, 'wood');
    S.solid(sd.poly([[4.4, 9.6], [7.4, 6.8], [22, 6.8], [22, 12.4], [7.4, 12.4]]), 0.9, 'cream');
    S.solid(sd.poly([[11, 14.8], [25, 14.8], [28, 17.6], [25, 20.4], [11, 20.4]]), 0.9, mat('cream', { ramp: ['f', 'e', 'e', 'd', 'c'] }));
    S.stroke([[9.5, 9.5], [18.5, 9.5]], 1, 'c').stroke([[13.5, 17.5], [22.5, 17.5]], 1, 'c');
    L.flower(S, 5.5, 24.5, 'R', 3); L.flower(S, 26.5, 23.5, 'Z', 3.6);
  }]
};
