#!/usr/bin/env node
/* tools/make-food-sheets.js -- contact sheets of every food sprite of js/cook-sprites.js (node, no dependencies).
 *
 *   node tools/make-food-sheets.js            writes tests/evidence/food/<group>.png: every id, every frame at 4x,
 *                                             once on a light ground (paper) and once on a dark ground
 *   node tools/make-food-sheets.js --check    the files on disk must be byte-identical to a fresh render (exit 1 if not)
 *   node tools/make-food-sheets.js --one dish.jeon,dish.cake [--k 6] [--out file.png] [--frag a.js,b.js]
 *                                             a review sheet while drawing: 1x, 2x and kx on wood, kx on paper and on dark.
 *                                             --frag pastes extra painter files in front of the SPRITES marker of the sprite file
 *
 * Same input, same bytes: zlib level fixed, no clock, no random source. */
'use strict';
var fs = require('fs'), path = require('path'), zlib = require('zlib'), vm = require('vm');
var ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'tests/evidence/food');

function arg(name) { var i = process.argv.indexOf(name); return i < 0 ? null : (process.argv[i + 1] || ''); }
function load(frags) {
  var src = fs.readFileSync(path.join(ROOT, 'js/cook-sprites.js'), 'utf8');
  (frags || []).forEach(function (f) { src = src.replace('/*SPRITES*/', fs.readFileSync(path.resolve(f), 'utf8') + '\n/*SPRITES*/'); });
  var sb = { module: { exports: {} } }; vm.createContext(sb); vm.runInContext(src, sb, { filename: 'cook-sprites.js' });
  return sb.module.exports;
}

/* ---- buffers ---- */
function blank(w, h) { return { w: w, h: h, d: new Uint8ClampedArray(w * h * 4) }; }
function rgb(hex) { var n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function put(b, x, y, c) { if (x < 0 || y < 0 || x >= b.w || y >= b.h) return; var i = (y * b.w + x) << 2; b.d[i] = c[0]; b.d[i + 1] = c[1]; b.d[i + 2] = c[2]; b.d[i + 3] = 255; }
function fill(b, hex) { var c = rgb(hex); for (var y = 0; y < b.h; y++) for (var x = 0; x < b.w; x++) put(b, x, y, c); return b; }
function stamp(dst, src, x, y) {
  for (var j = 0; j < src.h; j++) for (var i = 0; i < src.w; i++) {
    var s = (j * src.w + i) << 2; if (!src.d[s + 3]) continue;
    put(dst, x + i, y + j, [src.d[s], src.d[s + 1], src.d[s + 2]]);
  }
  return dst;
}
function scale(b, k) {
  var o = blank(b.w * k, b.h * k);
  for (var y = 0; y < o.h; y++) for (var x = 0; x < o.w; x++) {
    var s = (((y / k) | 0) * b.w + ((x / k) | 0)) << 2, t = (y * o.w + x) << 2;
    o.d[t] = b.d[s]; o.d[t + 1] = b.d[s + 1]; o.d[t + 2] = b.d[s + 2]; o.d[t + 3] = b.d[s + 3];
  }
  return o;
}
var GROUND = { paper: '#e7d5b3', dark: '#202e37', wood: '#c09473' };
function wood(w, h) {   /* the kitchen counter, roughly: planks 11 rows tall with a darker seam */
  var b = fill(blank(w, h), GROUND.wood), seam = rgb('#ad7757'), grain = rgb('#d7b594');
  for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) { if (y % 11 === 10) put(b, x, y, seam); else if ((x * 7 + y * 13) % 23 === 0 && y % 11 === 4) put(b, x, y, grain); }
  return b;
}
function on(ground, spr, k, pad) {
  pad = pad == null ? 2 : pad;
  var g = ground === 'wood' ? wood(spr.w + 2 * pad, spr.h + 2 * pad) : fill(blank(spr.w + 2 * pad, spr.h + 2 * pad), GROUND[ground]);
  return scale(stamp(g, spr, pad, pad), k);
}

/* ---- PNG ---- */
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

/* ---- labels: 3 x 5 letters ---- */
var FONT = { a: '010101111101101', b: '110101110101110', c: '011100100100011', d: '110101101101110', e: '111100110100111', f: '111100110100100',
  g: '011100101101011', h: '101101111101101', i: '111010010010111', j: '001001001101010', k: '101101110101101', l: '100100100100111',
  m: '101111111101101', n: '110101101101101', o: '010101101101010', p: '110101110100100', q: '010101101110011', r: '110101110101101',
  s: '011100010001110', t: '111010010010010', u: '101101101101111', v: '101101101101010', w: '101101111111101', x: '101101010101101',
  y: '101101010010010', z: '111001010100111', '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110',
  '4': '101101111001001', '5': '111100110001110', '6': '011100110101010', '7': '111001010010010', '8': '111101111101111', '9': '010101011001110',
  ' ': '000000000000000', '-': '000000111000000', '.': '000000000000010' };
function text(b, x, y, s, hex) {
  var c = rgb(hex);
  for (var n = 0; n < s.length; n++) { var g = FONT[s.charAt(n)] || FONT[' '];
    for (var j = 0; j < 5; j++) for (var i = 0; i < 3; i++) if (g.charAt(j * 3 + i) === '1') { put(b, x + (n * 4 + i) * 2, y + j * 2, c); put(b, x + (n * 4 + i) * 2 + 1, y + j * 2, c); put(b, x + (n * 4 + i) * 2, y + j * 2 + 1, c); put(b, x + (n * 4 + i) * 2 + 1, y + j * 2 + 1, c); } }
}
/* cells [[label, buffer], ...] flowed left to right, wrapped at maxW, bottoms aligned per line */
function sheet(cells, maxW, bg, ink) {
  var pad = 8, lines = [[]], x = pad;
  function cw(c) { return Math.max(c[1].w, c[0].length * 8); }
  cells.forEach(function (c) {
    if (c === null) { if (lines[lines.length - 1].length) { lines.push([]); x = pad; } return; }
    if (x + cw(c) + pad > maxW && lines[lines.length - 1].length) { lines.push([]); x = pad; }
    lines[lines.length - 1].push(c); x += cw(c) + pad;
  });
  lines = lines.filter(function (l) { return l.length; });
  var W = pad, H = pad, hs = [];
  lines.forEach(function (l) { var w = pad, h = 0; l.forEach(function (c) { w += cw(c) + pad; h = Math.max(h, c[1].h); }); W = Math.max(W, w); hs.push(h); H += h + 12 + pad; });
  var b = fill(blank(W, H), bg), y = pad;
  lines.forEach(function (l, li) { var X = pad; l.forEach(function (c) { text(b, X, y, c[0], ink); stamp(b, c[1], X, y + 12 + hs[li] - c[1].h); X += cw(c) + pad; }); y += hs[li] + 12 + pad; });
  return b;
}

/* ---- groups (file name -> which ids) ---- */
var GROUPS = [
  ['dishes', function (id) { return /^(dish|icon|table)\./.test(id); }],
  ['jeon', function (id) { return /^(bowl|mix\.jeon|greens|jug|jeon\.|whisk)/.test(id); }],
  ['gyeran', function (id) { return /^(mix\.egg|egg$|pan\.square|gyeran\.)/.test(id); }],
  ['jumeokbap', function (id) { return /^(mix\.rice|pot\.rice|paddle|shaker|rice\.|gim)/.test(id); }],
  ['kkochi', function (id) { return /^(basin|fruit\.|skewer|pot\.syrup|kkochi\.)/.test(id); }],
  ['cake', function (id) { return /^(mix\.cake|tin|oven|cake\.|berry\.)/.test(id); }],
  ['small', function () { return true; }]
];
function groupsOf(SPR) {
  var left = SPR.ids(), out = [];
  GROUPS.forEach(function (g) { var mine = left.filter(g[1]); left = left.filter(function (id) { return mine.indexOf(id) < 0; }); if (mine.length) out.push([g[0], mine]); });
  return out;
}
function groupSheet(SPR, list) {
  var cells = [];
  ['paper', 'dark'].forEach(function (gr) {
    list.forEach(function (id) {
      var n = SPR.info(id).frames, big = SPR.info(id).w > 20;
      for (var f = 0; f < n; f++) cells.push([f === 0 ? id.replace(/_/g, '-') : String(f), on(gr, SPR.get(id, f), 4)]);
      if (big) cells.push(null);
    });
    cells.push(null);
  });
  return sheet(cells, 1400, '#151d28', '#c7cfcc');
}
function buildAll(SPR) { var o = {}; groupsOf(SPR).forEach(function (g) { o[g[0] + '.png'] = png(groupSheet(SPR, g[1])); }); return o; }

if (require.main === module) {
  var one = arg('--one');
  if (one !== null) {
    var SPR1 = load((arg('--frag') || '').split(',').filter(Boolean)), k = +(arg('--k') || 6), cells = [];
    one.split(',').forEach(function (pat) {
      SPR1.ids().filter(function (id) { return id === pat || (pat.slice(-1) === '*' && id.indexOf(pat.slice(0, -1)) === 0); }).forEach(function (id) {
        var n = SPR1.info(id).frames;
        for (var f = 0; f < n; f++) {
          var s = SPR1.get(id, f);
          cells.push([id + ' ' + f, on('wood', s, k)]);
          if (f === 0 || n <= 3) { cells.push(['1x', on('wood', s, 1)]); cells.push(['2x', on('wood', s, 2)]); cells.push(['paper', on('paper', s, Math.max(2, k >> 1))]); cells.push(['dark', on('dark', s, Math.max(2, k >> 1))]); }
          if (s.w * k > 300) cells.push(null);
        }
        cells.push(null);
      });
    });
    var outp = arg('--out') || path.join(ROOT, 'tests/evidence/food/_review.png');
    fs.mkdirSync(path.dirname(outp), { recursive: true });
    var sh = sheet(cells, +(arg('--w') || 1500), '#151d28', '#c7cfcc'); fs.writeFileSync(outp, png(sh)); console.log('wrote ' + outp + '  ' + sh.w + ' x ' + sh.h);
  } else {
    var files = buildAll(load()), check = process.argv.indexOf('--check') >= 0, bad = 0;
    Object.keys(files).forEach(function (n) {
      var p = path.join(OUT, n);
      if (check) { if (!fs.existsSync(p) || !fs.readFileSync(p).equals(files[n])) { console.log('STALE ' + n); bad++; } }
      else { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(p, files[n]); console.log('wrote tests/evidence/food/' + n); }
    });
    if (check) { console.log(bad ? 'food sheets: ' + bad + ' stale (run node tools/make-food-sheets.js)' : 'food sheets: up to date (' + Object.keys(files).length + ')'); process.exit(bad ? 1 : 0); }
  }
}
module.exports = { load: load, buildAll: buildAll, png: png, scale: scale, on: on };
