#!/usr/bin/env node
/* tools/make-poster-art.js — 포스터용 픽셀 그림 생성 (docs/POSTER_ART.md).
 *
 *   node tools/make-poster-art.js     # assets/poster/<방 id>.png · assets/poster/corner_<주제>.png (32×32) + js/poster-art-data.js + 미리보기
 *
 * 그림: tools/ui-art/poster/<주제>.js (방마다 한 장) · corners.js (주제마다 한 장) · stay.js (쪽지). 형태 음영 렌더러 tools/ui-art/sculpt.js 로 짓는다 (둘째 판, 11-10).
 * 색은 Apollo 만. 외곽선은 재질마다 정해 둔 어두운 색 (sculpt.js MAT 의 ol).
 * js/poster-art-data.js 는 그림을 data URI 로 담는다 — 포스터 SVG 는 그림으로 굽힐 때(벽 텍스처·PNG 저장) 밖의 파일을 못 읽어서.
 */
'use strict';
var fs = require('fs'), path = require('path'), zlib = require('zlib');
var SP = require('./ui-art/sprites.js'), KIT = require('./ui-art/poster/kit.js'), SC = require('./ui-art/sculpt.js');
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
function hexRgb(h) { return [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); }
/* 방·주제·쪽지 그림: 형태 음영 렌더러 (tools/ui-art/sculpt.js) 로 32px 한 장. 외곽선·그림자는 렌더러가 넣는다 */
function render(id, draw) {
  var S = new SC.Scene(1); draw(S);
  var r = S.render(), n = 0, cells = r.keys.map(function (k) { if (k == null) return null; n++; return SP.KEY[k]; });
  if (r.N !== KIT.W) throw new Error(id + ': 크기 ' + r.N);
  if (n < 60) throw new Error(id + ': 칠한 칸이 너무 적다 (' + n + ')');
  return cells;
}
function toRGBA(cells) { var px = Buffer.alloc(cells.length * 4); cells.forEach(function (c, i) { if (!c) return; var r = hexRgb(c); px[i * 4] = r[0]; px[i * 4 + 1] = r[1]; px[i * 4 + 2] = r[2]; px[i * 4 + 3] = 255; }); return px; }

var all = [];   /* { key, id, corner, name, cells } */
CORNERS.forEach(function (corner) {
  var f = path.join(__dirname, 'ui-art/poster', corner + '.js'); if (!fs.existsSync(f)) return;
  var mod = require(f);
  Object.keys(mod).forEach(function (id) { all.push({ key: id, id: id, corner: corner, name: mod[id][0], cells: render(id, mod[id][1]) }); });
});
var sf = path.join(__dirname, 'ui-art/poster/stay.js');
if (fs.existsSync(sf)) { var sm = require(sf); Object.keys(sm).forEach(function (id) { all.push({ key: 'stay_' + id, id: id, corner: 'stay', isStay: true, name: sm[id][0], cells: render('stay_' + id, sm[id][1]) }); }); }
var cf = path.join(__dirname, 'ui-art/poster/corners.js');
if (fs.existsSync(cf)) { var cm = require(cf); CORNERS.forEach(function (k) { if (cm[k]) all.push({ key: 'corner_' + k, id: k, corner: k, isCorner: true, name: cm[k][0], cells: render('corner_' + k, cm[k][1]) }); }); }

fs.mkdirSync(path.join(ROOT, 'assets/poster'), { recursive: true });
/* manifest 에는 넣지 않는다: 게임은 js/poster-art-data.js 만 쓰고, 번들이 같은 그림을 두 번 담지 않게. assets/poster/*.png 는 보기·다른 도구용 */
var data = { room: {}, corner: {}, stay: {}, scene: {} };
all.forEach(function (a) {
  var png = encodePNG(KIT.W, KIT.H, toRGBA(a.cells)), rel = 'assets/poster/' + a.key + '.png';
  fs.writeFileSync(path.join(ROOT, rel), png);
  data[a.isCorner ? 'corner' : a.isStay ? 'stay' : 'room'][a.id] = png.toString('base64');
});
/* 장면 배경 9장 (66×56, 외곽선 없음) + 미리보기 tests/evidence/poster-art/scenes.png (×3) */
var SC = require('./ui-art/poster/scenes.js'), scenePx = {};
CORNERS.forEach(function (k) {
  if (!SC[k]) return;
  var px = Buffer.alloc(SC.W * SC.H * 4);
  for (var y = 0; y < SC.H; y++) for (var x = 0; x < SC.W; x++) { var key = SC[k][1](x, y); if (!SP.KEY[key]) throw new Error('scene ' + k + ': 빈 칸·모르는 색 (' + x + ',' + y + ') ' + key); var r = hexRgb(SP.KEY[key]), i = (y * SC.W + x) * 4; px[i] = r[0]; px[i + 1] = r[1]; px[i + 2] = r[2]; px[i + 3] = 255; }
  var png = encodePNG(SC.W, SC.H, px); scenePx[k] = px;
  fs.writeFileSync(path.join(ROOT, 'assets/poster/scene_' + k + '.png'), png); data.scene[k] = png.toString('base64');
});
(function () {
  var Z = 3, G = 6, COLS2 = 3, cw = SC.W * Z + G, chh = SC.H * Z + G, sw2 = COLS2 * cw + G, sh2 = Math.ceil(Object.keys(scenePx).length / COLS2) * chh + G, buf = Buffer.alloc(sw2 * sh2 * 4);
  for (var i = 0; i < sw2 * sh2; i++) { buf[i * 4] = 42; buf[i * 4 + 1] = 47; buf[i * 4 + 2] = 58; buf[i * 4 + 3] = 255; }
  Object.keys(scenePx).forEach(function (k, n) { var ox = G + (n % COLS2) * cw, oy = G + Math.floor(n / COLS2) * chh, px = scenePx[k];
    for (var y = 0; y < SC.H * Z; y++) for (var x = 0; x < SC.W * Z; x++) { var si = (Math.floor(y / Z) * SC.W + Math.floor(x / Z)) * 4, di = ((oy + y) * sw2 + ox + x) * 4; px.copy(buf, di, si, si + 4); } });
  fs.mkdirSync(path.join(ROOT, 'tests/evidence/poster-art'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'tests/evidence/poster-art/scenes.png'), encodePNG(sw2, sh2, buf));
})();

fs.writeFileSync(path.join(ROOT, 'js/poster-art-data.js'),
  '/* js/poster-art-data.js — 만든 파일 (node tools/make-poster-art.js). 손으로 고치지 않는다. 포스터 픽셀 그림 32×32 PNG 를 base64 로. */\n' +
  'var POSTER_ART_DATA = ' + JSON.stringify(data, null, 0).replace(/"room":/, '\n"room":').replace(/,"corner":/, ',\n"corner":').replace(/,"stay":/, ',\n"stay":').replace(/,"scene":/, ',\n"scene":').replace(/","/g, '",\n"') + ';\n' +
  "if (typeof module !== 'undefined' && module.exports) module.exports = POSTER_ART_DATA;\n");

/* 미리보기: 주제마다 한 줄, ×4, 종이 바탕 + 밤 바탕 */
var S = 4, PAD = 6, CELL = KIT.W * S + PAD * 2, COLS = 11, ROWS = CORNERS.concat(['stay']), rowsN = ROWS.length;
var SW = COLS * CELL, SH = rowsN * CELL * 2, sheet = Buffer.alloc(SW * SH * 4);
function fill(x0, y0, w, h, rgb) { for (var y = y0; y < y0 + h; y++) for (var x = x0; x < x0 + w; x++) { var i = (y * SW + x) * 4; sheet[i] = rgb[0]; sheet[i + 1] = rgb[1]; sheet[i + 2] = rgb[2]; sheet[i + 3] = 255; } }
fill(0, 0, SW, SH / 2, hexRgb('#e7d5b3')); fill(0, SH / 2, SW, SH / 2, hexRgb('#253a5e'));
[0, 1].forEach(function (band) { ROWS.forEach(function (corner, r) {
  var list = all.filter(function (a) { return a.corner === corner; }).sort(function (a, b) { return (b.isCorner ? 1 : 0) - (a.isCorner ? 1 : 0); });
  list.forEach(function (a, n) { var cx = n * CELL + PAD, cy = band * SH / 2 + r * CELL + PAD; a.cells.forEach(function (c, i) { if (c) fill(cx + (i % KIT.W) * S, cy + Math.floor(i / KIT.W) * S, S, S, hexRgb(c)); }); });
}); });
var ev = path.join(ROOT, 'tests/evidence/poster-art'); fs.mkdirSync(ev, { recursive: true });
fs.writeFileSync(path.join(ev, 'sheet.png'), encodePNG(SW, SH, sheet));
console.log('poster art: 방 ' + Object.keys(data.room).length + ' · 주제 ' + Object.keys(data.corner).length + ' · 쪽지 ' + Object.keys(data.stay).length + ' · 배경 ' + Object.keys(data.scene).length + ' → assets/poster/ · js/poster-art-data.js (' + Math.round(fs.statSync(path.join(ROOT, 'js/poster-art-data.js')).size / 1024) + ' KB) · tests/evidence/poster-art/sheet.png');
