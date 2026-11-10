/* 기호와 언어 — 방 8개 (둘째 판) */
'use strict';
var L = require('./lib.js'), K = L.K, sd = L.sd, bez = L.bez, mat = L.mat;
var CLAY = mat('cream', { ramp: ['f', 'e', 'd', 'c', 'b'], ol: 'a' });
module.exports = {
  ink: ['잉크', function (S) {   /* 잉크병 + 번진 얼룩 */
    S.flat(sd.ellipse(22.5, 28.6, 6.4, 1.9), '1', { ol: '0' }).flat(sd.circle(29.4, 26.2, 0.9), '1', { ol: '0' }).flat(sd.circle(4.4, 28.4, 1.1), '1', { ol: '0' });
    var prof = function (v) { return v < 11.5 ? 3 : v < 14.5 ? 3 + (v - 11.5) * 2 : v > 25 ? 9 - Math.pow((v - 25) / 2, 2) * 2 : 9; };
    S.lathe(14.5, 8.6, 27, prof, 'glass');
    S.lathe(14.5, 16, 26.4, function (v) { return prof(v) - 1.3; }, mat('ink', { spec: 0 }), { shadow: false, recv: false });
    S.flat(sd.ellipse(14.5, 16.1, 7.6, 0.9), '3');
    S.stroke([[8.2, 14.6], [8.2, 23.5]], 1, 'Z');
    S.solid(sd.box(14.5, 6.8, 3.6, 2.2, 0.7), 1.1, 'wood');
  }],
  cuneiform: ['설형문자', function (S) {   /* 쐐기 자국이 찍힌 점토판 */
    S.solid(sd.box(16, 16, 11.8, 13.2, 4.6), 2.6, CLAY);
    function wedge(x, y, dir) {
      if (dir === 0) { S.flat(sd.poly([[x - 1.2, y], [x + 1.2, y], [x, y + 1.7]]), 'a'); S.stroke([[x, y + 1.2], [x, y + 4]], 0.8, 'b'); }
      else if (dir === 1) { S.flat(sd.poly([[x, y - 1.2], [x, y + 1.2], [x + 1.7, y]]), 'a'); S.stroke([[x + 1.2, y], [x + 4, y]], 0.8, 'b'); }
      else { S.flat(sd.poly([[x - 0.3, y - 1.5], [x + 1.5, y + 0.3], [x + 1.6, y + 1.6]]), 'a'); S.stroke([[x + 1.2, y + 1.2], [x + 3.2, y + 3.2]], 0.8, 'b'); }
    }
    [[8.5, 6.5, 0], [12.6, 6.5, 0], [16.5, 8, 1], [23, 6.5, 0], [8, 13.6, 1], [14.5, 12, 0], [18, 12, 2], [22.5, 13.6, 0], [8.5, 18.6, 0], [12, 20.2, 1], [18.5, 18.6, 0], [22.6, 18.6, 2], [10, 25, 1], [16, 23.4, 0], [19.6, 25, 1]].forEach(function (w) { wedge(w[0], w[1], w[2]); });
  }],
  braille: ['점자', function (S) {   /* 도드라진 점이 찍힌 종이 (세 칸) */
    S.solid(sd.box(16, 16, 13.6, 9.8, 1.2), 1, 'paper');
    ['101100', '110010', '011101'].forEach(function (bits, n) {
      for (var i = 0; i < 6; i++) { var x = 6 + n * 8 + (i % 2) * 3, y = 12 + Math.floor(i / 2) * 4; if (bits[i] === '1') S.ball(x, y, 1.1, 1.1, mat('navy', { ramp: ['6', '5', '4', '3', '2'] })); else S.flat(sd.box(x - 0.5, y - 0.5, 0.5, 0.5, 0), 'e'); }
    });
  }],
  morse: ['모스 부호', function (S) {   /* 전신 키 + 점·선 종이띠 */
    S.solid(sd.box(16, 6.4, 13.6, 3, 0.6), 0.8, 'paper');
    [[5.4, 0.7], [8.2, 2], [13.8, 0.7], [16.6, 0.7], [19.4, 2], [25.2, 0.7]].forEach(function (q) { S.flat(sd.box(q[0] + q[1], 6.4, q[1], 0.9, 0.3), '1'); });
    S.solid(sd.box(16, 26.4, 13.2, 2.6, 0.9), 1, 'wood');
    S.solid(sd.box(8.6, 22.4, 1.5, 2.4, 0.3), 0.8, 'steel').solid(sd.box(23.4, 23.4, 1.7, 1.3, 0.3), 0.7, 'steel');
    S.rotate(9, 20, -13, function () { S.solid(sd.box(16.5, 20, 10.5, 1.15, 0.5), 0.95, 'gold'); });
    S.stroke([[25.6, 17.6], [25.6, 15.4]], 1.2, 'U');
    S.ball(25.6, 13.6, 3.3, 2.5, 'ink');
  }],
  cipher: ['암호', function (S) {   /* 돌려 맞추는 암호 원판 */
    S.solid(sd.circle(16, 16.5, 14), 2.4, 'gold');
    for (var i = 0; i < 12; i++) { var a = i * Math.PI / 6, sx = Math.sin(a), cy = -Math.cos(a); S.stroke([[16 + sx * 10.6, 16.5 + cy * 10.6], [16 + sx * 12.6, 16.5 + cy * 12.6]], 1, 'C'); }
    S.solid(sd.circle(16, 16.5, 9.2), 1.4, 'paper');
    for (i = 0; i < 12; i++) { a = (i + 0.5) * Math.PI / 6; sx = Math.sin(a); cy = -Math.cos(a); if (i % 2) S.flat(sd.circle(16 + sx * 6.6, 16.5 + cy * 6.6, 0.8), '3'); else S.stroke([[16 + sx * 5.4, 16.5 + cy * 5.4], [16 + sx * 7.6, 16.5 + cy * 7.6]], 0.9, 'b'); }
    S.ball(16, 16.5, 2.2, 2.2, 'amber');
    S.solid(sd.poly([[13.6, 0.8], [18.4, 0.8], [16, 5.2]]), 1, 'crimson');
  }],
  ancient_language: ['라틴어', function (S) {   /* 두루마리 */
    S.solid(sd.box(16, 16, 9.8, 11, 0.4), 0.8, 'paper');
    [[10.5, 12.5, 11], [8.5, 15.5, 14.5], [8.5, 18.5, 11], [8.5, 21.5, 13.5]].forEach(function (l) { for (var x = l[0]; x < l[0] + l[2]; x += 3.6) S.stroke([[x, l[1]], [Math.min(l[0] + l[2], x + 2.4), l[1]]], 1, '3'); });
    S.stroke([[13.5, 9.6], [22.5, 9.6]], 1, '3');
    S.flat(sd.box(9.6, 10.2, 1.6, 1.9, 0.2), 'J');
    [5, 27].forEach(function (y) {
      S.solid(sd.path([[4.6, y], [27.4, y]], 2.7), 2.7, 'cream');
      S.ball(3, y, 1.5, 2, 'wood').ball(29, y, 1.5, 2, 'wood');
    });
  }],
  hangul: ['한글', function (S) {   /* 종이에 쓴 '한' + 붓 */
    S.solid(sd.box(14, 16, 11.2, 13, 0.8), 0.9, 'paper');
    S.grid(7, 6, [
      '....1111........',
      '................',
      '.11111111...11..',
      '............11..',
      '...1111.....11..',
      '..11..11....1111',
      '..11..11....11..',
      '...1111.....11..',
      '............11..',
      '................',
      '...11...........',
      '...11...........',
      '...11...........',
      '...111111111....',
      '...111111111....']);
    S.grid(5, 24, ['JJ', 'JJ']);
    S.solid(sd.path([[29.4, 8], [26.4, 21]], 1.1), 1.1, 'wood');
    S.solid(sd.path([[26.4, 21], [25.4, 25.4]], 1.5, 0.3), 1.5, 'ink');
  }],
  stamp: ['우표', function (S) {   /* 톱니 테두리 우표 + 소인 */
    var perf = function (u, v) {
      var b = sd.box(15, 16, 10.5, 13.5, 0)(u, v), mx = ((u - 15 + 1.5) % 3 + 3) % 3 - 1.5, my = ((v - 16 + 1.5) % 3 + 3) % 3 - 1.5;
      var c = Math.min(Math.hypot(mx, v - 2.5), Math.hypot(mx, v - 29.5), Math.hypot(u - 4.5, my), Math.hypot(u - 25.5, my)) - 1;
      return Math.max(b, -c);
    };
    S.solid(perf, 0.8, 'white');
    S.flat(sd.box(15, 13, 7.6, 8, 0), '6').flat(sd.box(15, 7.4, 7.6, 2.4, 0), '7');
    S.flat(sd.inter(sd.poly([[7.4, 21], [13, 12.4], [18.6, 21]]), sd.box(15, 13, 7.6, 8, 0)), 'u').flat(sd.poly([[13, 12.4], [18.6, 21], [13, 21]]), 't');
    S.flat(sd.circle(19, 9.6, 1.9), 'F');
    S.stroke([[8.4, 24.4], [14, 24.4]], 1, 'W').stroke([[8.4, 26.6], [17, 26.6]], 1, 'X').flat(sd.box(20.6, 25.5, 1.6, 1.6, 0.2), 'J');
    S.flat(sd.ring(25.5, 24.5, 5.6, 0.5), '2', { outline: false });
    S.stroke(bez([20.6, 22.8], [25.5, 21.6], [30.4, 22.8], 6), 0.9, '2', { outline: false }).stroke(bez([20.6, 26.2], [25.5, 25], [30.4, 26.2], 6), 0.9, '2', { outline: false });
  }]
};
