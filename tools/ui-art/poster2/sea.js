/* 바다와 생물 — 방 8개 (둘째 판) */
'use strict';
var L = require('./lib.js'), K = L.K, sd = L.sd, bez = L.bez, mat = L.mat;
var WHITE = mat('white'), RED = mat('crimson');
var LEGS = [[[9, 22], [4.5, 23.5], [3.4, 27.2]], [[12.5, 23.5], [10, 27], [7.6, 29.2]], [[16, 24], [16, 27.5], [15.4, 30]], [[19.5, 23.5], [22, 27], [24.4, 29.2]], [[23, 22], [27.5, 23.5], [28.6, 27.2]]];
module.exports = {
  octopus: ['문어', function (S) {
    L.oct(S, {});
    [[4.6, 7.4, 1.5], [27.6, 5.6, 1.9], [29.2, 11, 1.1]].forEach(function (b) { S.ball(b[0], b[1], b[2], b[2], 'glass'); });
  }],
  octopus_nerves: ['문어 신경계', function (S) {   /* 보랏빛 문어 속에 빛나는 신경 줄기 — 뇌 하나와 다리마다 작은 뇌 */
    L.oct(S, { m: mat('violet'), eyes: 'none', mouth: 'none', blush: false, shine: false, sucker: 'O' });
    LEGS.forEach(function (l) { S.stroke([[16, 15]].concat(bez(l[0], l[1], l[2], 6)), 1, 'E'); S.flat(sd.circle(l[2][0], l[2][1], 0.9), 'F'); S.flat(sd.circle(l[0][0], l[0][1], 1.1), 'F'); });
    S.stroke([[16, 15], [9.5, 12.5]], 1, 'E').stroke([[16, 15], [22.5, 12.5]], 1, 'E').flat(sd.circle(9.5, 12.5, 1), 'F').flat(sd.circle(22.5, 12.5, 1), 'F');
    S.flat(sd.circle(16, 15, 3.4), 'E').flat(sd.circle(16, 15, 2.2), 'F').flat(sd.circle(15.4, 14.4, 0.9), 'Z');
    S.spark(4.5, 6, 2, 'F').spark(28, 8, 1.6, 'F');
  }],
  shell: ['조개', function (S) {   /* 가리비: 골 여덟 줄 · 물결 가장자리 */
    var ang = function (u, v) { return Math.atan2(24.5 - v, u - 16); }, R = function (a) { return 13.2 + 1.3 * Math.abs(Math.sin(a * 8)); };
    S.solid(sd.poly([[9.5, 24], [12, 22.5], [20, 22.5], [22.5, 24], [21, 27.6], [11, 27.6]]), 1.2, mat('cream', { ramp: ['f', 'e', 'd', 'c', 'b'] }));   /* 귀 */
    S.solid(function (u, v) { return Math.max(Math.hypot(u - 16, v - 24.5) - R(ang(u, v)), v - 24.5); }, 4.5,
      function (u, v) { return Math.floor(ang(u, v) / Math.PI * 8) % 2 ? mat('paper') : mat('cream'); },
      { tone: function (u, v, t) { var a = ang(u, v), d = Math.hypot(u - 16, v - 24.5); return (Math.abs(Math.sin(a * 8)) < 0.2 && d > 3) ? Math.min(4, t + 1) : t; } });
  }],
  pearl: ['진주', function (S) {   /* 벌어진 조개 속 진주 */
    var groove = function (u, v, t) { return Math.abs(Math.sin((u - 16) * 0.62)) < 0.16 ? Math.min(4, t + 1) : t; };
    S.solid(sd.inter(sd.ellipse(16, 16.5, 14, 11.5), sd.half(0, 1, -17.5)), 3.5, 'pink', { tone: groove });
    S.flat(sd.ellipse(16, 18, 12.6, 2.4), 'N');
    S.ball(16, 17.4, 4.5, 4.5, mat('white', { ramp: ['Z', 'Z', 'Y', '7', '6'], ol: '4', spec: 0.985 }));
    S.solid(sd.inter(sd.ellipse(16, 20.2, 14, 8.6), sd.half(0, -1, 18.6)), 4, 'cream', { tone: groove });
    S.spark(26.5, 6, 2.2, 'Z', { ol: 'X' });
  }],
  tide: ['밀물과 썰물', function (S) {   /* 달이 끄는 바다 */
    S.ball(24, 7.6, 4.8, 4.8, mat('gold', { ramp: ['Z', 'f', 'F', 'E', 'D'], ol: 'C', spec: 0 }));
    S.flat(sd.circle(22.6, 6.6, 0.8), 'E').flat(sd.circle(25.6, 8.8, 1), 'E');
    [[20.6, 13.6], [18.8, 16], [17, 18.4]].forEach(function (p) { S.flat(sd.circle(p[0], p[1], 0.7), 'Z', { ol: '5' }); });
    var top = function (u) { return 21.2 + 1.5 * Math.sin(u / 3.3) - (u - 4) / 13; };
    S.solid(function (u, v) { return Math.max(top(u) - v, v - 28.6, 1.6 - u, u - 30.4); }, 2.4, 'blue', { tone: function (u, v, t) { return Math.abs(v - top(u) - 3.2 - Math.sin(u / 2.2)) < 0.4 ? Math.max(0, t - 1) : t; } });
    var crest = []; for (var u = 1.6; u <= 30.4; u += 0.8) crest.push([u, top(u) + 0.3]);
    S.stroke(crest, 1, 'Z', { ol: '3' });
  }],
  starfish: ['불가사리', function (S) {
    var pts = L.starPts(16, 17, 13.4, 5.6, 5, 0.2);
    S.solid(sd.grow(sd.poly(pts), 1.5), 4.2, mat('red', { ramp: ['F', 'L', 'K', 'J', 'I'], ol: 'H' }));
    for (var i = 0; i < 5; i++) { var a = 0.2 + i * 2 * Math.PI / 5; [0.3, 0.55, 0.8].forEach(function (f) { S.flat(sd.circle(16 + Math.sin(a) * 13.4 * f, 17 - Math.cos(a) * 13.4 * f, 0.7), 'F'); }); }
    S.flat(sd.circle(16, 17, 0.9), 'F');
  }],
  lighthouse: ['등대', function (S) {
    S.ball(15, 28.6, 12, 3.6, 'stone', { flat: 0.3 });
    S.stroke(bez([1.5, 30.2], [4, 28.8], [6.5, 30.2], 5), 1, '7', { ol: '4' }).stroke(bez([24, 30.2], [26.5, 28.8], [29.5, 30.2], 5), 1, '7', { ol: '4' });
    S.lathe(15, 9.4, 26.8, function (v) { return 3.3 + (v - 9.4) * 0.19; }, function (u, v) { return Math.floor((v - 9.4) / 3.5) % 2 ? WHITE : RED; });
    S.flat(sd.union(sd.box(15, 24.8, 1.2, 2, 0), sd.circle(15, 22.9, 1.2)), 'a');
    S.solid(sd.box(15, 9, 4.8, 0.9, 0.3), 0.7, 'dark');
    S.flat(sd.poly([[17.6, 6.7], [31, 2.6], [31, 10.8]]), 'F', { ol: 'E' }).flat(sd.poly([[17.6, 6.7], [31, 5.2], [31, 8.2]]), 'f');   /* 불빛 */
    S.lathe(15, 5.2, 8.2, function () { return 2.9; }, mat('gold', { ramp: ['Z', 'Z', 'f', 'F', 'E'], spec: 0 }));
    S.flat(sd.box(15, 6.7, 0.35, 1.5, 0), 'D');
    S.lathe(15, 1.8, 5.2, function (v) { return 0.5 + (v - 1.8) * 1.0; }, RED);
    S.ball(15, 1.5, 0.9, 0.9, RED);
  }],
  salt: ['소금', function (S) {   /* 소금 결정 셋 */
    function cube(x, y, s) {
      var d = s * 0.42, W2 = mat('white');
      S.face(sd.poly([[x, y], [x + d, y - d], [x + s + d, y - d], [x + s, y]]), 0, W2, { shadow: false });
      S.face(sd.poly([[x + s, y], [x + s + d, y - d], [x + s + d, y + s - d], [x + s, y + s]]), 4, W2, { shadow: false });
      S.face(sd.box(x + s / 2, y + s / 2, s / 2, s / 2, 0), 2, W2, { shadow: false });
      S.flat(sd.box(x + 1.6, y + 1.6, 0.8, 0.8, 0), 'Z');
    }
    cube(16.5, 9.5, 8.5); cube(4, 15.5, 10.5); cube(19.5, 21, 6.5);
    [[3, 29.6], [8, 30.2], [14.5, 29.4], [17, 30.4], [28.5, 30], [30, 27]].forEach(function (p) { S.flat(sd.box(p[0], p[1], 0.6, 0.6, 0), 'Z', { ol: 'W' }); });
    S.spark(28, 5, 2.2, 'Z', { ol: 'X' });
  }]
};
