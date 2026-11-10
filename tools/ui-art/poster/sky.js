/* 하늘과 날씨 — 방 9개 */
'use strict';
function cloud(c, x, y, s, tones) {   /* 뭉게구름 (왼쪽 위 = x,y, 크기 s) */
  tones = tones || ['Z', 'Z', 'Z', 'Y', 'X'];
  c.B(x + 5 * s, y + 5 * s, 5 * s, 3.4 * s, tones).B(x + 10 * s, y + 3.6 * s, 5.5 * s, 3.8 * s, tones).B(x + 15 * s, y + 5.4 * s, 4.6 * s, 3 * s, tones).B(x + 10 * s, y + 6.6 * s, 9 * s, 2.4 * s, tones);
}
module.exports = {
  feather: ['깃털', function (c) {   /* 큼직한 푸른 깃털 한 장 */
    c.S(function (x, y) { var t = (x - y + 25) / 2, u = (x + y - 31) / 2; if (t < 2 || t > 24) return null; var w = 5.6 * Math.pow(Math.sin(Math.PI * (t - 1.5) / 23), 0.75); if (Math.abs(u) > w) return null; if (Math.abs(u) < 0.6) return 'Z'; var barb = Math.floor(t + Math.abs(u) * 0.7) % 3 === 0; return u < 0 ? (barb ? '6' : '7') : (barb ? '4' : '5'); });
    c.L(4, 27, 8, 23, 'Y').dot(3, 28, 'X');
    c.S(function (x, y) { return (x === 20 && y === 15) || (x === 21 && y === 16) || (x === 14 && y === 11) ? '_' : null; });   /* 갈라진 틈 */
    c.D([[27, 24], [5, 6]], '7');
  }],
  rain: ['비', function (c) {
    cloud(c, 4, 2, 1.2, ['X', 'W', 'W', 'V', 'U']);
    [[7, 15], [13, 17], [19, 15], [25, 17], [10, 21], [16, 23], [22, 21], [7, 25], [27, 24]].forEach(function (p) { c.L(p[0], p[1], p[0] - 1, p[1] + 2, '6'); c.dot(p[0], p[1], '7'); });
    c.B(16, 29.5, 10, 1.5, ['7', '6', '5', '5', '4']).D([[12, 29], [20, 30]], '7');
  }],
  cloud_names: ['구름 이름', function (c) {   /* 위에서부터 새털구름 · 뭉게구름 · 층구름 */
    [[4, 3], [12, 2], [21, 4]].forEach(function (p) { c.L(p[0], p[1] + 2, p[0] + 5, p[1], 'Z').L(p[0] + 5, p[1], p[0] + 8, p[1] + 1, 'Y'); });
    cloud(c, 6, 8, 1);
    c.S(function (x, y) { var r = y - 22; return r >= 0 && r <= 5 && x >= 2 + (r % 2) * 2 && x <= 29 - (r % 3) ? (r % 2 ? 'X' : r < 2 ? 'Z' : 'Y') : null; });
    c.D([[29, 9], [29, 13]], '7').L(1, 20, 30, 20, null);
  }],
  rainbow: ['무지개', function (c) {
    var bands = ['J', 'L', 'F', 'u', '5', 'P'];
    c.S(function (x, y) { var d = Math.hypot(x + 0.5 - 16, y + 0.5 - 24); if (y > 23) return null; var i = Math.floor((15.5 - d) / 1.6); return i >= 0 && i < 6 ? bands[i] : null; });
    cloud(c, 0, 19, 0.62); cloud(c, 19, 19, 0.62);
    c.spark(16, 4, 'F');
  }],
  light: ['빛', function (c) {   /* 프리즘: 흰 빛 한 줄기 → 여섯 빛깔 */
    c.L(0, 18, 12, 14, 'Z').L(0, 19, 12, 15, 'Y');
    c.S(function (x, y) { var t = y - 6; if (t < 0 || t > 19) return null; var half = t * 0.52; return Math.abs(x + 0.5 - 15) <= half ? (x < 15 - half * 0.3 ? '7' : x > 15 + half * 0.4 ? '5' : '6') : null; });
    c.L(15, 7, 6, 25, 'Z').R(5, 25, 21, 1, '4');
    ['J', 'L', 'F', 'u', '5', 'P'].forEach(function (k, i) { c.L(19, 14 + Math.floor(i / 2), 31, 10 + i * 3, k).L(19, 15 + Math.floor(i / 2), 31, 11 + i * 3, k); });
    c.dot(12, 12, 'Z');
  }],
  star: ['별', function (c) {
    var pts = []; for (var i = 0; i < 10; i++) { var a = i * Math.PI / 5, q = i % 2 ? 5.5 : 13; pts.push([16 + Math.sin(a) * q, 16 - Math.cos(a) * q]); }
    c.S(function (x, y) { var px = x + 0.5, py = y + 0.5, inside = false; for (var i = 0, j = 9; i < 10; j = i++) { var a = pts[i], b = pts[j]; if ((a[1] > py) !== (b[1] > py) && px < (b[0] - a[0]) * (py - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside; } return inside ? (x + y < 19 ? 'Z' : x + y < 34 ? 'F' : 'E') : null; });
    c.spark(4, 5, 'F').spark(27, 26, 'F').D([[27, 5], [4, 26], [29, 14]], 'Z');
  }],
  moon: ['달', function (c) {   /* 초승달 + 별 */
    c.S(function (x, y) { var d = Math.hypot(x + 0.5 - 15, y + 0.5 - 16), d2 = Math.hypot(x + 0.5 - 20.5, y + 0.5 - 13); return d <= 12 && d2 > 10.5 ? (x + y < 22 ? 'Z' : x < 9 ? 'f' : 'F') : null; });
    c.D([[7, 14], [8, 20], [11, 25]], 'E');
    c.spark(23, 12, 'Z').D([[27, 5], [28, 22], [20, 20], [25, 27]], 'F');
  }],
  wind: ['바람', function (c) {   /* 감기는 바람 줄기 + 날리는 잎 */
    function gust(y, len, curl) { c.L(2, y, len, y, 'Z'); c.ring(len, y - curl, curl + 0.5, 1.2, function (px, py) { return px >= len - 1 || py < y - curl ? 'Z' : null; }); c.L(2, y + 1, len - 2, y + 1, 'Y'); }
    gust(11, 20, 3); gust(19, 24, 4); gust(27, 14, 2);
    c.G(25, 4, ['.uv.', 'utvv', '.tu.']).G(5, 21, ['vu.', 'tuv', '.t.']).G(20, 27, ['E.', 'DE']);
  }],
  snow: ['눈', function (c) {   /* 눈 결정 */
    for (var i = 0; i < 6; i++) {
      var a = i * Math.PI / 3, dx = Math.sin(a), dy = -Math.cos(a);
      c.L(16, 16, Math.round(16 + dx * 13), Math.round(16 + dy * 13), 'Z');
      [6, 10].forEach(function (r) { [-1, 1].forEach(function (s) { var b = a + s * Math.PI / 3.2; c.L(Math.round(16 + dx * r), Math.round(16 + dy * r), Math.round(16 + dx * r + Math.sin(b) * 3.2), Math.round(16 + dy * r - Math.cos(b) * 3.2), '7'); }); });
    }
    c.disc(16, 16, 2.2, '7').dot(16, 16, 'Z').dot(15, 15, 'Z');
    c.D([[4, 4], [28, 5], [3, 27], [28, 28]], 'Z');
  }]
};
