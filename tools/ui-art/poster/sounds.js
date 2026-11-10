/* 소리와 리듬 — 방 7개 */
'use strict';
function note(c, x, y, k) { c.R(x, y + 5, 3, 2, k || '1').dot(x + 1, y + 7, k || '1').R(x + 2, y, 1, 6, k || '1').R(x + 3, y, 2, 1, k || '1').dot(x + 4, y + 1, k || '1'); }
function arcs(c, cx, cy, list, k, side) {   /* 퍼지는 소리 호 (side 1 = 오른쪽, -1 = 왼쪽, 0 = 위) */
  list.forEach(function (r) { c.ring(cx, cy, r, 1.1, function (x, y) { var dx = x + 0.5 - cx, dy = y + 0.5 - cy; if (side === 0) return dy < -Math.abs(dx) * 0.9 ? k : null; return side * dx > Math.abs(dy) * 1.1 ? k : null; }); });
}
module.exports = {
  lullaby: ['자장가', function (c) {   /* 초승달 요람 + 음표 + 별 */
    c.S(function (x, y) { var d = Math.hypot(x + 0.5 - 14, y + 0.5 - 15), d2 = Math.hypot(x + 0.5 - 17, y + 0.5 - 10.5); return d <= 12 && d2 > 10.5 ? (y > 22 ? 'E' : x < 8 ? 'f' : 'F') : null; });
    c.G(10, 19, ['.RRRR.', 'RRQQQR', '.QQQQ.']).dot(11, 19, 'Z');   /* 달에 덮은 작은 이불 */
    note(c, 19, 5, '3'); note(c, 25, 12, '4');
    c.spark(27, 4, 'F').D([[4, 4], [29, 24], [22, 27]], 'F');
  }],
  metronome: ['메트로놈', function (c) {
    c.S(function (x, y) { if (y < 4 || y > 27) return null; var w = 3 + (y - 4) * 0.36; return Math.abs(x + 0.5 - 16) <= w ? (x < 13 ? 'd' : x > 19 ? 'b' : 'c') : null; });
    c.S(function (x, y) { if (y < 7 || y > 22) return null; var w = 1.5 + (y - 7) * 0.3; return Math.abs(x + 0.5 - 16) <= w ? 'f' : null; });
    for (var y = 9; y <= 21; y += 3) c.R(15, y, 2, 1, 'e');
    c.L(16, 23, 21, 6, 'W').L(17, 23, 22, 6, 'V').R(18, 11, 4, 3, 'E').dot(18, 11, 'F');
    c.R(6, 27, 20, 2, 'b').R(6, 27, 20, 1, 'c');
    c.D([[25, 5], [27, 8], [8, 6], [6, 9]], 'F');
  }],
  whale_song: ['고래의 노래', function (c) {
    c.S(function (x, y) { var dx = (x + 0.5 - 14) / 12, dy = (y + 0.5 - 18) / 7; if (dx * dx + dy * dy > 1) return null; return y > 20 ? (x % 3 === 0 ? 'Y' : 'Z') : y < 14 ? '5' : '4'; });
    c.G(23, 12, ['....44', '...444', '..44..', '.44...', '44....', '44....']).G(26, 9, ['4..4', '44.4', '.444', '..4.']);   /* 꼬리 */
    c.dot(7, 16, '0').dot(7, 15, 'Z').L(4, 20, 9, 21, '2');
    c.D([[12, 9], [13, 7], [11, 6], [14, 5]], '7');   /* 물뿜기 */
    arcs(c, 3, 17, [5, 8, 11], '7', -1);
    note(c, 20, 2, '3');
  }],
  bell: ['종', function (c) {
    c.S(function (x, y) { if (y < 6 || y > 24) return null; var w = y < 12 ? 4 + (y - 6) * 0.7 : y < 21 ? 8.2 + (y - 12) * 0.12 : 9.5 + (y - 21) * 1.3; return Math.abs(x + 0.5 - 16) <= w ? (x < 12 ? 'F' : x > 20 ? 'D' : 'E') : null; });
    c.R(14, 3, 4, 3, 'D').R(15, 2, 2, 1, 'E').R(4, 24, 24, 2, 'D').R(4, 24, 24, 1, 'E');
    c.disc(16, 28, 2, 'C').dot(15, 27, 'E');
    c.R(11, 9, 1, 10, 'Z').dot(12, 8, 'Z').R(8, 20, 16, 1, 'D');
    arcs(c, 16, 15, [15], 'F', 1); arcs(c, 16, 15, [15], 'F', -1);
  }],
  echo: ['메아리', function (c) {   /* 산골짜기 사이로 되돌아오는 소리 */
    c.S(function (x, y) { var h1 = 24 - Math.max(0, 14 - Math.abs(x - 6) * 1.3), h2 = 24 - Math.max(0, 17 - Math.abs(x - 25) * 1.4); var top = Math.min(h1, h2, 24); if (y < top || y > 27) return null; return y < top + 2 && top < 14 ? 'Z' : (x < 16 ? (x < 6 ? 'u' : 't') : (x < 25 ? 't' : 's')); });
    c.R(0, 27, 32, 2, 's');
    arcs(c, 10, 14, [4, 7, 10], '7', 1);
    arcs(c, 24, 10, [3, 6], '6', -1);
    c.G(6, 12, ['..F', '.FE', 'FEE', '.FE', '..F']);   /* 소리 낸 자리 */
  }],
  thunder: ['천둥', function (c) {
    var tn = ['W', 'V', 'V', 'U', 'T'];
    c.B(9, 9, 6, 4, tn).B(16, 7, 7, 5, tn).B(23, 9, 6, 4, tn).B(16, 11, 12, 3, tn);
    c.G(12, 13, ['....FFFF', '...FFFF.', '..FFFF..', '.FFFFFFF', '....FFF.', '...FFF..', '..FFF...', '.FFF....', '.FF.....', 'FF......', 'F.......']);
    c.S(function (x, y) { return c.get(x, y) === 'F' && c.get(x + 1, y) !== 'F' && y > 12 ? 'E' : null; });
    c.dot(16, 13, 'Z').dot(15, 14, 'Z');
    c.D([[6, 17], [5, 21], [26, 16], [27, 20], [24, 24]], '6');
  }],
  heartbeat: ['심장 박동', function (c) {   /* 하트 + 뛰는 줄 */
    c.S(function (x, y) { var X = (x + 0.5 - 16) / 12, Y = -(y + 0.5 - 15) / 12, v = Math.pow(X * X + Y * Y - 0.55, 3) - X * X * Y * Y * Y; return v <= 0 ? (x + y < 22 ? 'R' : x + y > 36 ? 'P' : 'Q') : null; });
    c.D([[9, 9], [10, 8], [9, 10]], 'Z');
    var pts = [[1, 17], [9, 17], [11, 14], [13, 20], [16, 8], [19, 23], [21, 17], [30, 17]];
    for (var i = 0; i < pts.length - 1; i++) { c.L(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 'Z'); c.L(pts[i][0], pts[i][1] + 1, pts[i + 1][0], pts[i + 1][1] + 1, 'N'); }
  }]
};
