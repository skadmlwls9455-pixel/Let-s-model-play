/* 주제 9개 대표 그림 — 도서관 방이 아닌 곳(모델이 고른 바깥 글 등)을 기억했을 때 그 주제의 그림으로 쓴다 */
'use strict';
module.exports = {
  hands: ['손과 물건', function (c) {   /* 실뭉치 · 바늘 · 단추 */
    c.disc(13, 17, 10, function (x, y) { var b = Math.floor((x - y + 40) / 3) % 2; return x + y < 24 ? (b ? 'L' : 'K') : (b ? 'K' : 'J'); });
    c.S(function (x, y) { var d = Math.hypot(x + 0.5 - 13, y + 0.5 - 17); return d <= 10 && d > 4 && Math.floor((x + y) / 4) % 3 === 0 && x > 10 ? 'I' : null; });
    c.L(21, 23, 26, 27, 'K').L(26, 27, 30, 25, 'K').dot(31, 24, 'J');
    c.L(19, 2, 29, 14, 'Y').L(20, 2, 30, 14, 'X').dot(20, 3, '1').dot(19, 2, 'Z');
    c.disc(25.5, 21.5, 3.5, function (x, y) { return x + y < 46 ? '6' : '5'; }).D([[24, 21], [26, 21]], '2');
    c.spark(4, 5, 'F');
  }],
  sea: ['바다와 생물', function (c) {   /* 말려 올라가는 물결 + 소라 */
    c.S(function (x, y) { var d = Math.hypot(x + 0.5 - 13, y + 0.5 - 16); if (d > 11.5 || d < 5.5) return null; if (x > 13 && y > 14) return null; return d > 10 ? 'Z' : (x + y) % 4 === 0 ? '7' : y < 12 ? '6' : '5'; });
    c.S(function (x, y) { var top = 22 + Math.round(Math.sin(x / 2.6) * 1.2); return y >= top && y <= 28 && x >= 1 && x <= 30 ? (y === top ? 'Z' : y === top + 1 ? '7' : y > 26 ? '4' : '5') : null; });
    c.D([[20, 7], [23, 10], [18, 4], [25, 14]], '7').dot(21, 6, 'Z');
    c.G(22, 23, ['..ef.', '.efed', 'efedc', '.dcc.']);
  }],
  sky: ['하늘과 날씨', function (c) {   /* 구름 뒤 해 */
    c.disc(21, 11, 7, function (x, y) { return x + y < 30 ? 'F' : 'E'; });
    for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4; c.L(Math.round(21 + Math.cos(a) * 9), Math.round(11 + Math.sin(a) * 9), Math.round(21 + Math.cos(a) * 11), Math.round(11 + Math.sin(a) * 11), 'F'); }
    var t = ['Z', 'Z', 'Z', 'Y', 'X'];
    c.B(9, 20, 6, 4.5, t).B(16, 18, 7, 5.5, t).B(23, 21, 5.5, 4, t).B(16, 23, 12, 3.2, t);
    c.D([[7, 28], [14, 29], [21, 28]], '6');
  }],
  signs: ['기호와 언어', function (c) {   /* 펼친 책 + 깃펜 */
    c.S(function (x, y) { if (y < 10 || y > 26 || x < 2 || x > 29) return null; var sag = Math.round((1 - Math.abs(x - 15.5) / 14) * 3); return y >= 10 + sag ? (y > 24 ? 'c' : x === 15 || x === 16 ? 'e' : x < 15 ? 'Z' : 'f') : null; });
    [[4, 14, 9], [4, 17, 7], [4, 20, 9], [19, 14, 8], [19, 17, 9], [19, 20, 6]].forEach(function (l) { for (var i = 0; i < l[2]; i++) if (i % 4 !== 3) c.dot(l[0] + i, l[1], '3'); });
    for (var i = 0; i < 10; i++) c.R(27 - i - 1, 2 + i, i < 2 ? 2 : 4, 1, i % 2 ? 'Y' : 'Z');
    c.L(17, 12, 14, 16, 'c').dot(13, 17, '1');
  }],
  numbers: ['수와 모양', function (c) {   /* 세모 · 동그라미 · 네모 + 삼각자 눈금 */
    c.S(function (x, y) { return y >= 4 && y <= 16 && x >= 3 && x <= 3 + (y - 4) ? (y === 16 || x === 3 ? 'D' : 'E') : null; });
    c.D([[4, 8], [4, 11], [4, 14], [7, 15], [10, 15], [13, 15]], 'C');
    c.disc(23, 9.5, 6, function (x, y) { return x + y < 31 ? '6' : '5'; }).dot(21, 7, 'Z');
    c.R(6, 20, 9, 9, 'P').R(6, 20, 9, 1, 'R').R(14, 21, 1, 8, 'O');
    c.S(function (x, y) { var dx = Math.abs(x + 0.5 - 23), dy = y - 19; return dy >= 0 && dy <= 10 && dx <= dy * 0.6 ? (x < 23 ? 'u' : 't') : null; });
    c.D([[17, 17], [16, 3]], 'F');
  }],
  sounds: ['소리와 리듬', function (c) {   /* 이어진 음표 둘 + 퍼지는 소리 */
    c.R(9, 5, 14, 3, '2').R(9, 5, 2, 17, '2').R(21, 5, 2, 15, '2');
    c.B(7, 23, 4.5, 3.4, ['4', '3', '2', '2', '1']).B(19, 21, 4.5, 3.4, ['4', '3', '2', '2', '1']);
    c.ring(24, 14, 6, 1.1, function (x, y) { return x > 27 ? 'F' : null; }).ring(24, 14, 9, 1.1, function (x, y) { return x > 29 ? 'E' : null; });
    c.D([[4, 6], [3, 12], [27, 27]], 'F');
  }],
  home: ['집과 사람', function (c) {   /* 불 켜진 작은 집 */
    c.S(function (x, y) { return y >= 4 && y <= 14 && Math.abs(x + 0.5 - 16) <= (y - 3) * 1.25 ? (y > 12 ? 'I' : x < 16 ? 'K' : 'J') : null; });
    c.R(6, 15, 20, 13, 'e').R(6, 15, 2, 13, 'f').R(24, 15, 2, 13, 'd').R(6, 27, 20, 1, 'c');
    c.R(9, 18, 6, 6, 'F').R(9, 18, 6, 1, 'Z').R(12, 18, 1, 6, 'c').R(9, 21, 6, 1, 'c');
    c.R(18, 19, 5, 9, 'b').dot(22, 24, 'F').R(21, 5, 3, 5, 'c');
    c.D([[22, 3], [23, 1], [21, 0]], 'Y');
    c.S(function (x, y) { return y >= 28 && y <= 29 && (x * 3 + y) % 4 < 3 ? 'u' : null; });
  }],
  mind: ['생각하는 것', function (c) {   /* 생각 구름 + 반짝 */
    var t = ['Z', 'Z', 'Y', 'X', 'W'];
    c.B(10, 12, 7, 6, t).B(18, 9, 8, 7, t).B(24, 14, 6, 5.5, t).B(16, 16, 11, 5, t);
    c.spark(16, 12, 'F').spark(22, 15, 'E').D([[11, 14], [20, 8]], 'F');
    c.disc(9, 24, 2.4, 'Y').disc(5, 28.5, 1.5, 'X');
  }],
  wild: ['들판', function (c) {   /* 풀밭의 이정표 + 들꽃 */
    c.R(15, 6, 2, 22, 'c').R(16, 6, 1, 22, 'b');
    c.G(7, 8, ['.dddddddddddd', 'dfffffffffffe', 'dffffffffffee', '.eeeeeeeeeee.']).G(13, 15, ['ddddddddddd.', 'dfffffffffed', 'dfffffffffee', '.eeeeeeeee..']);
    c.L(4, 9, 6, 9, 'd').L(4, 10, 6, 10, 'd').L(25, 16, 27, 17, 'd');
    c.S(function (x, y) { return y >= 26 && y <= 30 && c.get(x, y) == null && (x * 5 + y * 3) % 4 < 3 ? (y < 28 ? ((x % 3) ? null : 'v') : y < 29 ? 'v' : 'u') : null; });
    c.G(4, 22, ['.R.', 'RFR', '.R.', '.u.', '.u.']).G(24, 21, ['.Z.', 'ZFZ', '.Z.', '.u.', '.u.', '.u.']).G(9, 24, ['F', 'u']);
  }]
};
