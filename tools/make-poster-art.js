#!/usr/bin/env node
/* tools/make-poster-art.js — 포스터용 픽셀 그림 생성 (docs/POSTER_ART.md).
 *
 *   node tools/make-poster-art.js     # assets/poster/<방 id>.png · assets/poster/corner_<주제>.png (32×32) + js/poster-art-data.js + 미리보기
 *
 * 그림: tools/ui-art/poster/<주제>.js (방마다 한 장) · corners.js (주제마다 한 장). 붓은 poster/kit.js. 색은 Apollo 만, 외곽선은 장면 규칙.
 * js/poster-art-data.js 는 그림을 data URI 로 담는다 — 포스터 SVG 는 그림으로 굽힐 때(벽 텍스처·PNG 저장) 밖의 파일을 못 읽어서.
 */
'use strict';
var fs = require('fs'), path = require('path'), zlib = require('zlib');
var SP = require('./ui-art/sprites.js'), KIT = require('./ui-art/poster/kit.js');
var ROOT = path.resolve(__dirname, '..');
var CORNERS = ['hands', 'sea', 'sky', 'signs', 'numbers', 'sounds', 'home', 'mind', 'wild'];

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
function render(id, draw) {
  var c = KIT.make(); draw(c);
  var Wd = KIT.W, Hd = KIT.H, cells = c.c.map(function (k) { if (k == null) return null; if (!SP.KEY[k]) throw new Error(id + ': 모르는 색 글자 ' + k); return SP.KEY[k]; });
  var out = cells.slice(), n = 0;
  for (var y = 0; y < Hd; y++) for (var x = 0; x < Wd; x++) {
    if (cells[y * Wd + x]) { n++; continue; }
    var nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(function (d) { var X = x + d[0], Y = y + d[1]; return X < 0 || Y < 0 || X >= Wd || Y >= Hd ? null : cells[Y * Wd + X]; }).filter(Boolean);
    if (!nb.length) continue;
    nb.sort(function (a, b) { return oklab(a)[0] - oklab(b)[0]; });
    out[y * Wd + x] = outlineOf(nb[0]);
  }
  if (n < 60) throw new Error(id + ': 칠한 칸이 너무 적다 (' + n + ')');
  return out;
}
function toRGBA(cells) { var px = Buffer.alloc(cells.length * 4); cells.forEach(function (c, i) { if (!c) return; var r = hexRgb(c); px[i * 4] = r[0]; px[i * 4 + 1] = r[1]; px[i * 4 + 2] = r[2]; px[i * 4 + 3] = 255; }); return px; }

var all = [];   /* { key, id, corner, name, cells } */
CORNERS.forEach(function (corner) {
  var f = path.join(__dirname, 'ui-art/poster', corner + '.js'); if (!fs.existsSync(f)) return;
  var mod = require(f);
  Object.keys(mod).forEach(function (id) { all.push({ key: id, id: id, corner: corner, name: mod[id][0], cells: render(id, mod[id][1]) }); });
});
var cf = path.join(__dirname, 'ui-art/poster/corners.js');
if (fs.existsSync(cf)) { var cm = require(cf); CORNERS.forEach(function (k) { if (cm[k]) all.push({ key: 'corner_' + k, id: k, corner: k, isCorner: true, name: cm[k][0], cells: render('corner_' + k, cm[k][1]) }); }); }

fs.mkdirSync(path.join(ROOT, 'assets/poster'), { recursive: true });
/* manifest 에는 넣지 않는다: 게임은 js/poster-art-data.js 만 쓰고, 번들이 같은 그림을 두 번 담지 않게. assets/poster/*.png 는 보기·다른 도구용 */
var data = { room: {}, corner: {} };
all.forEach(function (a) {
  var png = encodePNG(KIT.W, KIT.H, toRGBA(a.cells)), rel = 'assets/poster/' + a.key + '.png';
  fs.writeFileSync(path.join(ROOT, rel), png);
  data[a.isCorner ? 'corner' : 'room'][a.id] = png.toString('base64');
});
fs.writeFileSync(path.join(ROOT, 'js/poster-art-data.js'),
  '/* js/poster-art-data.js — 만든 파일 (node tools/make-poster-art.js). 손으로 고치지 않는다. 포스터 픽셀 그림 32×32 PNG 를 base64 로. */\n' +
  'var POSTER_ART_DATA = ' + JSON.stringify(data, null, 0).replace(/"room":/, '\n"room":').replace(/,"corner":/, ',\n"corner":').replace(/","/g, '",\n"') + ';\n' +
  "if (typeof module !== 'undefined' && module.exports) module.exports = POSTER_ART_DATA;\n");

/* 미리보기: 주제마다 한 줄, ×4, 종이 바탕 + 밤 바탕 */
var S = 4, PAD = 6, CELL = KIT.W * S + PAD * 2, COLS = 11, rowsN = CORNERS.length;
var SW = COLS * CELL, SH = rowsN * CELL * 2, sheet = Buffer.alloc(SW * SH * 4);
function fill(x0, y0, w, h, rgb) { for (var y = y0; y < y0 + h; y++) for (var x = x0; x < x0 + w; x++) { var i = (y * SW + x) * 4; sheet[i] = rgb[0]; sheet[i + 1] = rgb[1]; sheet[i + 2] = rgb[2]; sheet[i + 3] = 255; } }
fill(0, 0, SW, SH / 2, hexRgb('#e7d5b3')); fill(0, SH / 2, SW, SH / 2, hexRgb('#253a5e'));
[0, 1].forEach(function (band) { CORNERS.forEach(function (corner, r) {
  var list = all.filter(function (a) { return a.corner === corner; }).sort(function (a, b) { return (b.isCorner ? 1 : 0) - (a.isCorner ? 1 : 0); });
  list.forEach(function (a, n) { var cx = n * CELL + PAD, cy = band * SH / 2 + r * CELL + PAD; a.cells.forEach(function (c, i) { if (c) fill(cx + (i % KIT.W) * S, cy + Math.floor(i / KIT.W) * S, S, S, hexRgb(c)); }); });
}); });
var ev = path.join(ROOT, 'tests/evidence/poster-art'); fs.mkdirSync(ev, { recursive: true });
fs.writeFileSync(path.join(ev, 'sheet.png'), encodePNG(SW, SH, sheet));
console.log('poster art: 방 ' + Object.keys(data.room).length + ' · 주제 ' + Object.keys(data.corner).length + ' → assets/poster/ · js/poster-art-data.js (' + Math.round(fs.statSync(path.join(ROOT, 'js/poster-art-data.js')).size / 1024) + ' KB) · tests/evidence/poster-art/sheet.png');
