/* tools/ui-art/pixel-out.js — 픽셀 그림 내보내기 도우미 (PNG 인코더 · 장면 외곽선 규칙). make-badges.js · make-souvenirs32.js 가 쓴다.
 * 외곽선: 투명 칸 중 칠한 4-이웃이 있으면 가장 어두운 이웃 색의 OKLab L×0.62 → Apollo 스냅 (make-ui-art.js 와 같은 식). */
'use strict';
var zlib = require('zlib'), SP = require('./sprites.js');
var CRC = (function () { var t = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { var c = 0xffffffff; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) { var l = Buffer.alloc(4), t = Buffer.from(type, 'ascii'), c = Buffer.alloc(4); l.writeUInt32BE(data.length); c.writeUInt32BE(crc32(Buffer.concat([t, data]))); return Buffer.concat([l, t, data, c]); }
function encodePNG(w, h, px) {
  var ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
  var raw = Buffer.alloc((w * 4 + 1) * h);
  for (var y = 0; y < h; y++) px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
function s2l(v) { return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
function hexRgb(h) { return [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); }
function oklab(hex) {
  var c = hexRgb(hex).map(function (v) { return s2l(v / 255); });
  var l = Math.cbrt(0.412221469470763 * c[0] + 0.5363325372617348 * c[1] + 0.0514459932675022 * c[2]);
  var m = Math.cbrt(0.2119034958178252 * c[0] + 0.6806995506452344 * c[1] + 0.1073969535369406 * c[2]);
  var s = Math.cbrt(0.0883024591900564 * c[0] + 0.2817188391361215 * c[1] + 0.6299787016738222 * c[2]);
  return [0.210454268309314 * l + 0.7936177747023054 * m - 0.0040720430116193 * s, 1.9779985324311684 * l - 2.4285922420485799 * m + 0.450593709617411 * s, 0.0259040424655478 * l + 0.7827717124575296 * m - 0.8086757549230774 * s];
}
var APOLLO = Object.keys(SP.KEY).map(function (k) { return SP.KEY[k]; }), LAB = APOLLO.map(oklab);
function nearest(lab) { var best = 1e9, bi = 0; LAB.forEach(function (p, i) { var d = Math.pow(lab[0] - p[0], 2) + Math.pow((lab[1] - p[1]) * 1.3, 2) + Math.pow((lab[2] - p[2]) * 1.3, 2); if (d < best) { best = d; bi = i; } }); return APOLLO[bi]; }
var OC = {};
function outlineOf(hex) { if (OC[hex]) return OC[hex]; var lab = oklab(hex), k = 0.62, o = nearest([lab[0] * k, lab[1] * 0.9, lab[2] * 0.9]); while (o === hex && k > 0.2) { k -= 0.1; o = nearest([lab[0] * k, lab[1] * 0.9, lab[2] * 0.9]); } return (OC[hex] = o); }
/* keys: 길이 srcW*srcH 의 KEY 글자 배열(빈 칸 null) → 왼쪽 위 w×h 만 잘라 hex 칸 배열 (outline 이면 외곽선을 두른다) */
function cells(keys, srcW, w, h, outline, name) {
  var c = [], x, y;
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) { var k = keys[y * srcW + x]; if (k != null && !SP.KEY[k]) throw new Error((name || '') + ': 모르는 색 글자 ' + k); c.push(k == null ? null : SP.KEY[k]); }
  if (!outline) return c;
  var out = c.slice();
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
    if (c[y * w + x]) continue;
    var nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(function (d) { var X = x + d[0], Y = y + d[1]; return X < 0 || Y < 0 || X >= w || Y >= h ? null : c[Y * w + X]; }).filter(Boolean);
    if (!nb.length) continue;
    nb.sort(function (a, b) { return oklab(a)[0] - oklab(b)[0]; });
    out[y * w + x] = outlineOf(nb[0]);
  }
  return out;
}
function rgba(c) { var px = Buffer.alloc(c.length * 4); c.forEach(function (hex, i) { if (!hex) return; var r = hexRgb(hex); px[i * 4] = r[0]; px[i * 4 + 1] = r[1]; px[i * 4 + 2] = r[2]; px[i * 4 + 3] = 255; }); return px; }
/* 미리보기 시트: items [{ cells, w, h }] 를 한 줄 cols 개, ×scale, 종이 바탕 위 + 밤 바탕 아래 */
function sheet(items, cols, scale, pad) {
  var cw = Math.max.apply(null, items.map(function (i) { return i.w; })) * scale + pad * 2, ch = Math.max.apply(null, items.map(function (i) { return i.h; })) * scale + pad * 2, rows = Math.ceil(items.length / cols);
  var W = cols * cw, H = rows * ch * 2, buf = Buffer.alloc(W * H * 4);
  function fill(x0, y0, w, h, rgb) { for (var y = y0; y < y0 + h; y++) for (var x = x0; x < x0 + w; x++) { var i = (y * W + x) * 4; buf[i] = rgb[0]; buf[i + 1] = rgb[1]; buf[i + 2] = rgb[2]; buf[i + 3] = 255; } }
  fill(0, 0, W, H / 2, hexRgb('#e7d5b3')); fill(0, H / 2, W, H / 2, hexRgb('#253a5e'));
  [0, 1].forEach(function (band) { items.forEach(function (it, n) { var ox = (n % cols) * cw + pad, oy = band * H / 2 + Math.floor(n / cols) * ch + pad; it.cells.forEach(function (c, i) { if (c) fill(ox + (i % it.w) * scale, oy + Math.floor(i / it.w) * scale, scale, scale, hexRgb(c)); }); }); });
  return encodePNG(W, H, buf);
}
module.exports = { encodePNG: encodePNG, hexRgb: hexRgb, cells: cells, rgba: rgba, sheet: sheet };
