/* 바다와 생물 — 방 8개 */
'use strict';
var SK = require('../sticker-kit.js');
function star5(c, cx, cy, R, r, rot, fn) {   /* 별 모양 채우기 */
  var pts = []; for (var i = 0; i < 10; i++) { var a = rot + i * Math.PI / 5, q = i % 2 ? r : R; pts.push([cx + Math.sin(a) * q, cy - Math.cos(a) * q]); }
  c.S(function (x, y) { var px = x + 0.5, py = y + 0.5, inside = false; for (var i = 0, j = 9; i < 10; j = i++) { var a = pts[i], b = pts[j]; if ((a[1] > py) !== (b[1] > py) && px < (b[0] - a[0]) * (py - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside; } return inside ? fn(x, y) : null; });
}
module.exports = {
  octopus: ['문어', function (c) {   /* 모자 없는 문어 + 물방울 */
    SK.head(c, 0, 0); SK.legs(c, 0, 0, 'down'); SK.face(c, 0, 0, { eyes: 'dot', mouth: 'smile' });
    c.D([[4, 8], [27, 6]], '6').dot(5, 7, '7').dot(28, 5, '7').D([[3, 12], [29, 11]], '6');
    c.S(function (x, y) { return y >= 29 && y <= 30 && x >= 3 && x <= 28 && (x + y) % 5 < 3 ? (y === 29 ? 'e' : 'd') : null; });
  }],
  octopus_nerves: ['문어 신경계', function (c) {   /* 보랏빛 문어 안에 빛나는 신경 줄기 */
    SK.head(c, 0, 0); SK.legs(c, 0, 0, 'down');
    SK.recolor(c, { L: 'P', K: 'O', J: 'N', I: 'M', F: 'O' });
    c.disc(16, 15, 3.2, 'E').disc(16, 15, 1.8, 'F').dot(15, 14, 'Z');                 /* 가운데 뇌 */
    [[9, 25], [13, 26], [17, 27], [21, 26], [25, 25]].forEach(function (p) { c.L(16, 18, p[0], p[1] - 3, 'E').L(p[0], p[1] - 3, p[0], p[1], 'F'); c.dot(p[0], p[1] - 3, 'Z'); });
    c.L(16, 15, 9, 13, 'E').L(16, 15, 23, 13, 'E').D([[9, 13], [23, 13], [12, 10], [20, 10]], 'F');
    c.D([[3, 6], [28, 8], [5, 28]], 'F');
  }],
  shell: ['조개', function (c) {   /* 부채꼴 가리비 */
    c.S(function (x, y) { var dx = x + 0.5 - 16, dy = y + 0.5 - 24, d = Math.hypot(dx, dy); if (dy > 0 || d > 15.5) return null; var a = Math.atan2(-dy, dx), seg = Math.floor(a / Math.PI * 9); return d > 14 ? 'd' : seg % 2 ? (dx + dy < -10 ? 'Z' : 'f') : 'e'; });
    c.G(11, 24, ['dfeeeeeefd', '.dfeeeefd.', '..dccccd..']);
    c.D([[8, 13], [12, 11]], 'Z').D([[26, 28], [5, 27]], '6');
  }],
  pearl: ['진주', function (c) {   /* 벌어진 조개 속 진주 */
    c.S(function (x, y) { var dx = (x + 0.5 - 16) / 14, dy = (y + 0.5 - 15) / 11; return y <= 15 && dx * dx + dy * dy <= 1 ? ((x % 4 === 0) ? 'P' : x + y < 22 ? 'R' : 'Q') : null; });
    c.S(function (x, y) { var dx = (x + 0.5 - 16) / 14, dy = (y + 0.5 - 17) / 10; return y >= 17 && dx * dx + dy * dy <= 1 ? (y < 20 ? 'f' : (x % 4 === 0) ? 'c' : 'd') : null; });
    c.R(3, 15, 26, 2, 'O');
    c.B(16, 17.5, 4.5, 4.5, ['Z', 'Z', 'Y', '7', '6']).dot(14, 15, 'Z');
    c.spark(25, 6, 'Z').dot(6, 7, 'Z');
  }],
  tide: ['밀물과 썰물', function (c) {   /* 달이 끄는 바다: 달 + 물결 + 모래톱 */
    c.B(24, 7, 4.5, 4.5, ['Z', 'f', 'F', 'F', 'E']).D([[23, 6], [26, 8]], 'E');
    c.D([[22, 13], [20, 15], [18, 17]], '7');                                         /* 끌어당기는 점선 */
    c.S(function (x, y) { var top = 19 + Math.round(Math.sin(x / 3.2) * 1.5) - Math.round((x - 4) / 14); if (y < top || y > 27 || x < 1 || x > 30) return null; return y === top ? 'Z' : y === top + 1 ? '7' : (y + x) % 5 === 0 ? '6' : y > 24 ? '4' : '5'; });
    c.S(function (x, y) { return y >= 26 && y <= 30 && x >= 1 && x <= 14 - (y - 26) * 0 && x < 16 - (30 - y) ? (y === 26 ? 'f' : 'e') : null; });
    c.G(4, 27, ['R.R', '.Q.']).dot(10, 29, 'd');
  }],
  starfish: ['불가사리', function (c) {
    star5(c, 16, 17, 14, 6, 0.2, function (x, y) { return x + y < 28 ? 'L' : x + y > 38 ? 'J' : 'K'; });
    [[16, 16], [16, 10], [16, 6], [21, 15], [25, 13], [19, 21], [22, 26], [13, 21], [10, 26], [11, 15], [7, 13]].forEach(function (p) { c.dot(p[0], p[1], 'F'); });
    c.D([[27, 27], [4, 5]], '6');
  }],
  lighthouse: ['등대', function (c) {
    c.S(function (x, y) { if (y < 8 || y > 25) return null; var w = 3 + (y - 8) * 0.14; if (Math.abs(x + 0.5 - 14) > w) return null; var st = Math.floor((y - 8) / 4) % 2; return st ? (x < 14 ? 'Z' : 'Y') : (x < 14 ? 'K' : 'J'); });
    c.R(11, 5, 6, 3, 'F').R(11, 5, 6, 1, 'Z').R(10, 8, 8, 1, 'U').R(12, 2, 4, 3, 'J').dot(13, 1, 'J').dot(14, 1, 'J');
    c.S(function (x, y) { return x >= 18 && y >= 2 && y <= 10 && Math.abs(y - 6) <= (x - 17) * 0.35 ? ((x + y) % 2 ? 'F' : null) : null; });
    c.B(14, 28, 11, 3.5, ['W', 'V', 'V', 'U', 'T']);
    c.S(function (x, y) { return y >= 29 && y <= 30 && (x < 5 || x > 23) && (x + y) % 4 < 3 ? (y === 29 ? '6' : '5') : null; });
    c.R(13, 21, 2, 4, 'a');
  }],
  salt: ['소금', function (c) {   /* 소금 결정 (정육면체 셋) + 낟알 */
    function cube(x, y, s) {
      c.S(function (px, py) { var u = px - x, v = py - y; if (u < 0 || u >= s || v < 0 || v >= s) return null; return 'Y'; });
      c.S(function (px, py) { var u = px - x, v = py - y; return v < 0 && v >= -Math.floor(s / 3) && u + v >= 0 && u + v < s ? 'Z' : null; });
      c.S(function (px, py) { var u = px - x - s, v = py - y; return u >= 0 && u < Math.floor(s / 3) && v + u >= -Math.floor(s / 3) + 1 - 1 && v + u < s ? 'X' : null; });
      c.dot(x + 1, y + 1, 'Z').dot(x + 2, y + 1, 'Z').dot(x + s - 2, y + s - 2, '7');
    }
    cube(4, 15, 11); cube(16, 9, 9); cube(19, 21, 7);
    c.D([[3, 29], [7, 30], [12, 29], [15, 30], [28, 30], [30, 28], [1, 26]], 'Z').D([[10, 28], [26, 6]], 'Y');
    c.spark(27, 4, '7');
  }]
};
