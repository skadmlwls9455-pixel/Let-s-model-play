/* tools/ui-art/poster/kit.js — 포스터 그림 붓 (32×32, Apollo KEY 글자). 스티커 붓(sticker-kit.js)의 Canvas 위에 선·고리·격자·모양 함수를 더한다.
 * 그림 한 장 = function (c) { ... }. 외곽선은 tools/make-poster-art.js 가 장면 규칙으로 두른다. 빛은 위·왼쪽에서. */
'use strict';
var SK = require('../sticker-kit.js');
var W = SK.W, H = SK.H;
var T = {   /* 밝음 → 어두움 다섯 단계 */
  wood: ['f', 'e', 'd', 'c', 'b'], bark: ['d', 'c', 'b', 'a', 'A'], gold: ['F', 'F', 'E', 'D', 'C'], amber: ['F', 'E', 'D', 'C', 'B'],
  blue: ['7', '6', '5', '4', '3'], sky: ['Z', '7', '6', '5', '4'], night: ['4', '3', '2', '1', '0'], gray: ['Z', 'Y', 'X', 'W', 'V'], iron: ['X', 'W', 'V', 'U', 'T'],
  red: ['L', 'K', 'J', 'I', 'H'], pink: ['Z', 'R', 'Q', 'P', 'O'], purple: ['R', 'Q', 'P', 'O', 'N'], green: ['w', 'v', 'u', 't', 's'], moss: ['v', 'u', 't', 's', 'r'],
  paper: ['Z', 'Z', 'f', 'e', 'd'], white: ['Z', 'Z', 'Z', 'Y', 'X'], cream: ['Z', 'f', 'f', 'e', 'd']
};
function make() {
  var c = new SK.Canvas();
  c.R = function (x, y, w, h, k) { c.rect(x, y, w, h, k); return c; };
  c.D = function (list, k) { c.dots(list, k); return c; };
  c.B = function (cx, cy, rx, ry, tones) { c.blob(cx, cy, rx, ry, typeof tones === 'string' ? T[tones] : tones); return c; };
  c.L = function (x0, y0, x1, y1, k) {   /* 브레젠험 선 */
    var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx + dy;
    for (;;) { c.px(x0, y0, k); if (x0 === x1 && y0 === y1) break; var e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
    return c;
  };
  c.G = function (x, y, rows) {   /* 격자 글자 그대로 ('.' = 건너뜀, '_' = 지움) */
    rows.forEach(function (r, j) { for (var i = 0; i < r.length; i++) { if (r[i] === '.') continue; c.px(x + i, y + j, r[i] === '_' ? null : r[i]); } });
    return c;
  };
  c.S = function (fn) { for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) { var k = fn(x, y); if (k) c.px(x, y, k === '_' ? null : k); } return c; };
  c.ring = function (cx, cy, r, th, k) {   /* 고리 (바깥 반지름 r, 두께 th). k 가 함수면 (x,y) → 색 */
    return c.S(function (x, y) { var d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy); return d <= r && d > r - th ? (typeof k === 'function' ? k(x, y) : k) : null; });
  };
  c.disc = function (cx, cy, r, k) { return c.S(function (x, y) { return Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r ? (typeof k === 'function' ? k(x, y) : k) : null; }); };
  c.spark = function (x, y, k) { c.dots([[x, y - 1], [x - 1, y], [x + 1, y], [x, y + 1]], k || 'F'); c.px(x, y, 'Z'); return c; };
  c.dot = function (x, y, k) { c.px(x, y, k); return c; };
  return c;
}
module.exports = { W: W, H: H, T: T, make: make };
