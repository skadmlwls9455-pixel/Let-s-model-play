#!/usr/bin/env node
/* render.js - RESEARCH SAMPLE (round 7, topic 09): paints the sample sprite and writes PNG files. No dependencies.
 *   node wip/round7/research/foodart/render.js     writes out/omelette-<version>-6x.png, out/omelette-final-6x.png and
 *                                                  out/omelette-sheet.png (the contact sheet: versions, sizes, grounds, states)
 * The palette is read from the game's own art file (js/cook-art.js: Apollo 46 + FOOD 24), never typed twice. A sprite
 * colour that is not in that palette stops the script, and so does a ragged row or an unknown character (pixmap.js). */
'use strict';
var fs = require('fs'), path = require('path'), zlib = require('zlib'), vm = require('vm');
var PX = require('./pixmap.js');
var ROOT = path.resolve(__dirname, '../../../..'), OUT = path.join(__dirname, 'out');

/* ---- the game palette ---- */
var sb = {}; vm.createContext(sb); vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/cook-art.js'), 'utf8'), sb, { filename: 'cook-art.js' });
var CA = sb.COOK_ART, NAME = {}, ALLOWED = {};
Object.keys(CA.PAL).forEach(function (k) { NAME[k] = CA.PAL[k]; });
Object.keys(CA.F).forEach(function (k) { NAME[k] = CA.F[k]; });
CA.APOLLO.concat(CA.FOOD).forEach(function (h) { ALLOWED[h] = 1; });
function resolve(S, swap) {   /* character -> palette name -> hex. swap = { ch: name } replaces entries (a cooking state) */
  var pal = {};
  Object.keys(S.pal).forEach(function (ch) {
    var nm = swap && swap[ch] ? swap[ch] : S.pal[ch], hex = NAME[nm];
    if (!hex || !ALLOWED[hex]) throw new Error(S.name + ': "' + ch + '" -> ' + nm + ' is not a game palette colour');
    pal[ch] = hex;
  });
  return pal;
}

/* ---- PNG (RGBA 8 bit; zlib comes with node) ---- */
var CRC = (function () { var t = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { var r = 0xffffffff; for (var i = 0; i < b.length; i++) r = CRC[(r ^ b[i]) & 255] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  var len = Buffer.alloc(4), td = Buffer.concat([Buffer.from(type, 'ascii'), data]), c = Buffer.alloc(4);
  len.writeUInt32BE(data.length); c.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, c]);
}
function png(b) {
  var w = b.w, h = b.h, px = Buffer.from(b.d.buffer, b.d.byteOffset, b.d.length), raw = Buffer.alloc((w * 4 + 1) * h);
  for (var y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  var hd = Buffer.alloc(13); hd.writeUInt32BE(w, 0); hd.writeUInt32BE(h, 4); hd[8] = 8; hd[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', hd), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/* ---- grounds ---- */
function fill(b, hex) { for (var y = 0; y < b.h; y++) for (var x = 0; x < b.w; x++) PX.put(b, x, y, hex); return b; }
function wood(w, h) {   /* the kitchen's wood counter, roughly: 11-row planks, a darker seam, a few light grain pixels */
  var b = PX.blank(w, h);
  for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) PX.put(b, x, y, y % 11 === 10 ? NAME.w3 : ((x * 7 + y * 13) % 23 === 0 && y % 11 === 4) ? NAME.w5 : NAME.w4);
  return b;
}
var GROUNDS = {
  wood: wood,
  paper: function (w, h) { return fill(PX.blank(w, h), NAME.w6); },      /* the recipe book page / the chip paper */
  night: function (w, h) { return fill(PX.blank(w, h), NAME.s0); },      /* a dark room at night */
  table: function (w, h) { return fill(PX.blank(w, h), NAME.w2); }       /* the play-room table top, roughly */
};
var GROUND_DARK = {}; [['w6', 'w5'], ['w5', 'w4'], ['w4', 'w3'], ['w3', 'w2'], ['w2', 'w1'], ['s6', 's5'], ['s5', 's4'], ['s1', 's0'], ['s0', 'soot']].forEach(function (p) { GROUND_DARK[NAME[p[0]]] = NAME[p[1]]; });
/* a finished sprite on a ground: the ground under its silhouette moved right and down goes one step darker (as the game does) */
function onGround(ground, spr, x, y, dx, dy) {
  var g = { w: ground.w, h: ground.h, d: new Uint8ClampedArray(ground.d) };
  for (var j = 0; j < spr.h; j++) for (var i = 0; i < spr.w; i++) {
    if (!PX.hexAt(spr, i, j)) continue;
    for (var k = 1; k <= dx; k++) { var X = x + i + k, Y = y + j + dy, c = PX.hexAt(g, X, Y); if (c && GROUND_DARK[c] && !PX.hexAt(spr, i + k, j + dy)) PX.put(g, X, Y, GROUND_DARK[c]); }
  }
  return PX.stamp(g, spr, x, y);
}

/* ---- a frame of a sprite ---- */
function build(S, frameName, swap) {
  var F = S.frames[frameName], S2 = S;
  if (Array.isArray(F)) { S2 = Object.create(S); S2.frames = {}; S2.frames[frameName] = { w: S.w, h: S.h, list: F }; }   /* the v1-v3 files */
  var b = PX.frame(S2, frameName, resolve(S, swap));
  PX.colours(b).forEach(function (c) { if (!ALLOWED[c]) throw new Error('colour outside the game palette: ' + c); });
  return b;
}
function shot(S, frameName, ground, k, swap, pad) {   /* sprite on a ground with a margin, at k x */
  var spr = build(S, frameName, swap); pad = pad == null ? 4 : pad;
  return PX.scale(onGround(GROUNDS[ground](spr.w + 2 * pad, spr.h + 2 * pad), spr, pad, pad, spr.w > 20 ? 2 : 1, spr.w > 20 ? 2 : 1), k);
}

/* ---- contact sheet: labelled cells, flowed left to right ---- */
var FONT = { a: '010101111101101', b: '110101110101110', c: '011100100100011', d: '110101101101110', e: '111100110100111', f: '111100110100100',
  g: '011100101101011', h: '101101111101101', i: '111010010010111', k: '101101110101101', l: '100100100100111', n: '110101101101101',
  o: '010101101101010', p: '110101110100100', r: '110101110101101', s: '011100010001110', t: '111010010010010', u: '101101101101111',
  v: '101101101101010', w: '101101101111101', x: '101101010101101', y: '101101010010010', '0': '111101101101111', '1': '010110010010111',
  '2': '110001010100111', '3': '110001010001110', '4': '101101111001001', '6': '011100110101010', '9': '010101011001110', ' ': '000000000000000', '-': '000000111000000' };
function text(b, x, y, s, hex, k) {   /* 3 x 5 letters at k x */
  for (var n = 0; n < s.length; n++) { var g = FONT[s.charAt(n)] || FONT[' '];
    for (var j = 0; j < 5; j++) for (var i = 0; i < 3; i++) if (g.charAt(j * 3 + i) === '1') for (var a = 0; a < k; a++) for (var c = 0; c < k; c++) PX.put(b, x + (n * 4 + i) * k + c, y + j * k + a, hex); }
}
function sheet(rows, pad, bgHex, inkHex) {   /* rows = [[label, buffer], ...][]: each row flows left to right, bottoms aligned */
  var W = 0, H = pad, hs = [];
  function cw(c) { return Math.max(c[1].w, c[0].length * 8); }
  rows.forEach(function (r) { var w = pad, h = 0; r.forEach(function (c) { w += cw(c) + pad; h = Math.max(h, c[1].h); }); W = Math.max(W, w); hs.push(h); H += h + 12 + pad; });
  var b = fill(PX.blank(W, H), bgHex), y = pad;
  rows.forEach(function (r, ri) { var x = pad; r.forEach(function (c) { text(b, x, y, c[0], inkHex, 2); PX.stamp(b, c[1], x, y + 12 + hs[ri] - c[1].h); x += cw(c) + pad; }); y += hs[ri] + 12 + pad; });
  return b;
}
function write(name, b) { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, name), png(b)); console.log('wrote out/' + name + '  ' + b.w + ' x ' + b.h); }
module.exports = { PX: PX, NAME: NAME, build: build, shot: shot, sheet: sheet, write: write, png: png, resolve: resolve };

if (require.main === module) {
  var VERS = [['v1', './history/omelette-v1.js'], ['v2', './history/omelette-v2.js'], ['v3', './history/omelette-v3.js'], ['final', './omelette.js']]
    .filter(function (v) { return fs.existsSync(path.join(__dirname, v[1])); });
  var S = require('./omelette.js'), row1 = [];
  VERS.forEach(function (v) {
    var Sv = require(v[1]), big = shot(Sv, 'served', 'wood', 6);
    console.log(v[0] + ': ' + PX.colours(build(Sv, 'served')).length + ' colours');
    write('omelette-' + v[0] + '-6x.png', big); row1.push([v[0], PX.scale(shot(Sv, 'served', 'wood', 1), 4)]);
  });
  var row2 = [['1x', shot(S, 'served', 'wood', 1)], ['2x', shot(S, 'served', 'wood', 2)], ['3x', shot(S, 'served', 'wood', 3)],
    ['3x paper', shot(S, 'served', 'paper', 3)], ['3x night', shot(S, 'served', 'night', 3)]];
  var row3 = Object.keys(S.states).map(function (k) { return [k, shot(S, 'served', 'wood', 3, S.states[k])]; });
  var row4 = [['icon 16 1x', shot(S, 'icon', 'paper', 1, null, 2)], ['icon 3x', shot(S, 'icon', 'paper', 3, null, 2)], ['icon 6x', shot(S, 'icon', 'paper', 6, null, 2)],
    ['table 12x9 1x', shot(S, 'table', 'table', 1, null, 3)], ['table 2x', shot(S, 'table', 'table', 2, null, 3)], ['table 6x', shot(S, 'table', 'table', 6, null, 3)]];
  write('omelette-sheet.png', sheet([row1, row2, row3, row4], 10, NAME.soot, NAME.s5));
  write('omelette-icon-12x.png', shot(S, 'icon', 'paper', 12, null, 2));
  write('omelette-table-12x.png', shot(S, 'table', 'table', 12, null, 3));
}
