/* 생각하는 것 — 방 7개 (둘째 판) */
'use strict';
var L = require('./lib.js'), K = L.K, sd = L.sd, bez = L.bez, mat = L.mat;
module.exports = {
  dream: ['꿈', function (S) {   /* 생각 구름 속 달과 별 + 방울 */
    S.ball(9.2, 24.6, 2.7, 2.7, 'purple').ball(4.8, 28.8, 1.6, 1.6, 'purple');
    L.cloud(S, [[10, 13, 6.6, 5.6], [23.4, 14, 6, 5.2], [17.4, 10, 8, 6.6], [16.6, 16.6, 11, 4.6]], mat('purple'));
    S.flat(sd.sub(sd.circle(13.4, 12.6, 4.3), sd.circle(15.8, 11.2, 3.7)), 'F');
    S.spark(22.5, 12.5, 2, 'F');
    [[19.5, 17.5], [9.5, 16.5], [25.5, 17.5]].forEach(function (p) { S.flat(sd.box(p[0], p[1], 0.5, 0.5, 0), 'Z'); });
  }],
  memory: ['기억', function (S) {   /* 압정으로 꽂아 둔 사진 두 장 */
    S.rotate(17, 17, 9, function () { S.solid(sd.box(17.5, 17.5, 10.6, 9, 0.6), 0.9, 'cream'); });
    S.rotate(15, 15, -5, function () {
      S.solid(sd.box(14.5, 15, 11, 9.6, 0.6), 0.9, 'white');
      S.flat(sd.box(14.5, 13.6, 8.8, 6, 0), '6').flat(sd.box(14.5, 9.4, 8.8, 1.8, 0), '7');
      S.flat(sd.inter(sd.poly([[6, 19.6], [11.5, 12.6], [17, 19.6]]), sd.box(14.5, 13.6, 8.8, 6, 0)), 'u');
      S.flat(sd.circle(19.4, 11.6, 1.7), 'F');
    });
    S.ball(14.5, 5.6, 2, 2, 'crimson');   /* 압정 */
  }],
  name: ['이름', function (S) {   /* 끈 달린 이름표 (아직 안 적힘) */
    S.solid(sd.path(bez([9.8, 17.5], [2.6, 13], [6.4, 6.4], 8).concat(bez([6.4, 6.4], [9.4, 3], [14, 4.6], 5)), 0.75), 0.75, 'crimson');
    S.solid(sd.sub(sd.grow(sd.poly([[10.4, 10.4], [28, 10.4], [28, 24.6], [10.4, 24.6], [5.2, 17.5]]), 0.8), sd.circle(9.8, 17.5, 1.3)), 1, 'paper');
    S.solid(sd.ring(9.8, 17.5, 2.1, 0.8), 0.8, 'amber', { shadow: false });
    S.stroke([[14.5, 14.5], [25, 14.5]], 1, 'd').stroke([[14.5, 18.5], [22, 18.5]], 1, 'd').stroke([[14.5, 21.5], [24, 21.5]], 1, 'e');
  }],
  time_sense: ['시간 감각', function (S) {   /* 모래시계 */
    var r = function (v) { return 0.9 + 7 * Math.pow(Math.abs(v - 16) / 10, 0.85); };
    S.stroke([[8.5, 6], [8.5, 26]], 1, 'c', { ol: 'a' }).stroke([[23.5, 6], [23.5, 26]], 1, 'c', { ol: 'a' });
    S.lathe(16, 6, 26, r, 'glass');
    S.add(K.flat(function (u, v) { return Math.max(Math.abs(u - 16) - (r(v) - 1.3), 9.6 - v, v - 15.2); }), 'E', { shadow: false });
    S.stroke([[11.4, 9.5], [20.6, 9.5]], 1, 'F');
    S.add(K.flat(function (u, v) { return Math.max(Math.abs(u - 16) - Math.min(r(v) - 1.3, (v - 19.6) * 1.5), v - 25.2, 19.6 - v); }), 'E', { shadow: false });
    S.stroke([[16, 15], [16, 21]], 0.8, 'E');
    S.stroke([[10.5, 8.6], [10, 11.6]], 1, 'Z');
    S.solid(sd.box(16, 4.6, 9.6, 1.6, 0.6), 1, 'wood').solid(sd.box(16, 27.4, 9.6, 1.6, 0.6), 1, 'wood');
  }],
  sleep: ['잠', function (S) {   /* 폭신한 베개 + z z */
    S.solid(sd.box(14.5, 22, 12.8, 6.6, 4.2), 4.4, 'white');
    S.stroke([[9.5, 21.5], [12, 22.5]], 1, 'X').stroke([[19.5, 21.5], [17, 22.5]], 1, 'X');
    function Z(x, y, s, k) { S.stroke([[x, y], [x + s, y], [x, y + s], [x + s, y + s]], Math.max(1, s * 0.27), k, { ol: '3' }); }
    Z(22.5, 2.5, 6, '5'); Z(16.5, 8.5, 4, '6'); Z(12.5, 13.5, 2, '6');
  }],
  riddle: ['수수께끼', function (S) {   /* 물음표가 새겨진 상자 */
    S.solid(sd.inter(sd.ring(16, 8.4, 2.6, 0.95), sd.half(0, 1, -8.8)), 0.95, 'gold');
    S.solid(sd.box(16, 20.8, 10.6, 8, 1.2), 1.5, 'violet');
    S.solid(sd.box(16, 11.4, 11.8, 2.1, 0.9), 1.3, 'purple');
    S.stroke(bez([12.5, 17.5], [12.6, 14.5], [16, 14.5], 5).concat(bez([16, 14.5], [19.6, 14.5], [19.5, 17.5], 5), bez([19.5, 17.5], [19.4, 19.5], [16, 20.5], 4), [[16, 22.2]]), 1.9, 'F');
    S.flat(sd.circle(16, 25.4, 1.15), 'F');
    S.spark(3.5, 6.5, 2, 'F').spark(28.5, 7.5, 2, 'F');
  }],
  slow_room: ['느린 글의 방', function (S) {   /* 펼친 책 위를 지나는 달팽이 */
    S.stroke([[2, 28.6], [16, 30.6], [30, 28.6]], 1.4, 'c', { ol: 'a' });
    S.solid(sd.poly([[2, 22.6], [15.7, 24.6], [15.7, 29.6], [2, 27.6]]), 0.8, 'paper');
    S.solid(sd.poly([[16.3, 24.6], [30, 22.6], [30, 27.6], [16.3, 29.6]]), 0.8, 'cream');
    S.stroke([[4.5, 24.6], [13, 25.8]], 0.9, 'd').stroke([[4.5, 26.6], [10.5, 27.4]], 0.9, 'd').stroke([[19, 25.8], [27.5, 24.6]], 0.9, 'd').stroke([[19, 27.6], [25, 26.8]], 0.9, 'd');
    var BODY = mat('cream', { ramp: ['f', 'f', 'e', 'd', 'c'], ol: 'a' });
    S.stroke([[6.4, 19.6], [5.4, 15.8]], 1, 'd', { ol: 'a' }).stroke([[8.4, 19.6], [8.8, 15.6]], 1, 'd', { ol: 'a' });
    S.flat(sd.circle(5.3, 15.2, 0.9), '1').flat(sd.circle(8.9, 15, 0.9), '1');
    S.solid(sd.path([[7, 22.4], [12, 23], [25.6, 23]], 1.9, 1.1), 1.9, BODY);
    S.ball(7.2, 21, 2.6, 2.4, BODY);
    S.ball(17.6, 16.8, 6.8, 6.6, 'amber');
    var pts = []; for (var th = 0; th < 10.4; th += 0.2) { var rr = 0.65 * Math.exp(0.2 * th); pts.push([17.6 + Math.cos(th) * rr, 16.8 + Math.sin(th) * rr]); }
    S.stroke(pts, 1, 'B');
  }]
};
