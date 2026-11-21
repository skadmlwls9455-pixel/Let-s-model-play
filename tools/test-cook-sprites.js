#!/usr/bin/env node
/* tools/test-cook-sprites.js -- node checks of js/cook-sprites.js (contract C1, wip/round7/briefs/SPRITES.md).
 *   node tools/test-cook-sprites.js            every listed id with its size, anchor and frame count; palette only; an outline
 *                                              that is not black; no empty frame; frames differ; file size; ASCII; no DOM / clock / random
 *   node tools/test-cook-sprites.js --lint     also prints the warning list per sprite (orphan pixels, touching colours under 20 luma)
 *   node tools/test-cook-sprites.js --allow-missing   ids not drawn yet are listed, not failed (while the art lane is drawing) */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm');
var ROOT = path.resolve(__dirname, '..'), FILE = path.join(ROOT, 'js/cook-sprites.js');
var SPR = require(FILE), src = fs.readFileSync(FILE, 'utf8');
var pass = 0, fail = 0, warn = [];
function ok(c, msg) { if (c) pass++; else { fail++; console.log('FAIL ' + msg); } }

/* id: [w, h, ax, ay, frames] */
var WANT = {
  'dish.jeon': [80, 56, 40, 44, 3], 'dish.gyeran': [80, 56, 40, 44, 1], 'dish.jumeokbap': [80, 56, 40, 44, 1], 'dish.kkochi': [80, 56, 40, 44, 1], 'dish.cake': [80, 56, 40, 44, 1],
  'table.jeon': [16, 12, 8, 10, 3], 'table.gyeran': [16, 12, 8, 10, 1], 'table.jumeokbap': [16, 12, 8, 10, 1], 'table.kkochi': [16, 12, 8, 10, 1], 'table.cake': [16, 12, 8, 10, 1],
  'bowl': [88, 68, 44, 40, 1], 'mix.jeon': [60, 40, 30, 22, 4], 'mix.egg': [60, 40, 30, 22, 4], 'mix.rice': [60, 40, 30, 22, 3], 'mix.cake': [60, 40, 30, 22, 4],
  'egg': [24, 28, 12, 22, 3], 'greens': [72, 32, 36, 20, 4], 'jug': [44, 44, 22, 34, 2], 'jeon.pan': [76, 56, 38, 30, 5], 'pan.square': [100, 76, 50, 42, 1],
  'gyeran.pan': [84, 60, 42, 32, 7], 'gyeran.board': [76, 40, 38, 26, 4], 'pot.rice': [76, 60, 38, 38, 4], 'paddle': [28, 36, 14, 30, 2], 'shaker': [20, 32, 10, 28, 1],
  'rice.shape': [60, 48, 30, 32, 5], 'gim': [24, 32, 12, 26, 1], 'basin': [100, 68, 50, 40, 1], 'fruit.wash': [68, 44, 34, 24, 3], 'fruit.board': [76, 44, 38, 26, 3],
  'fruit.piece': [20, 20, 10, 14, 3], 'skewer': [100, 20, 50, 12, 4], 'pot.syrup': [76, 60, 38, 38, 2], 'kkochi.coat': [100, 28, 50, 16, 3], 'tin': [76, 60, 38, 36, 4],
  'oven': [116, 100, 58, 60, 4], 'cake.base': [76, 56, 38, 38, 4], 'berry.top': [16, 18, 8, 14, 1], 'whisk': [28, 44, 14, 40, 1],
  'book.emblem': [32, 32, 16, 16, 1], 'cafe.coffee': [32, 32, 16, 26, 1]
};
['icon.jeon', 'icon.gyeran', 'icon.jumeokbap', 'icon.kkochi', 'icon.cake', 'lock.cup', 'cafe.card',
  'ing.flour', 'ing.water', 'ing.greens', 'ing.oil', 'ing.egg', 'ing.salt', 'ing.rice', 'ing.gim', 'ing.sesame', 'ing.berry', 'ing.grape', 'ing.tang', 'ing.sugar', 'ing.cream',
  'step.slice', 'step.stir', 'step.pour', 'step.flip', 'step.crack', 'step.roll', 'step.scoop', 'step.sprinkle', 'step.press', 'step.wrap', 'step.wash', 'step.thread', 'step.glaze', 'step.bake', 'step.spread', 'step.top'
].forEach(function (id) { WANT[id] = [16, 16, 8, 13, 1]; });

/* the palette: Apollo 46 + FOOD 24 of the kitchen, plus at most four EXTRA colours */
var sb = {}; vm.createContext(sb); vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/cook-art.js'), 'utf8'), sb);
var KITCHEN = {}; sb.COOK_ART.APOLLO.concat(sb.COOK_ART.FOOD).forEach(function (h) { KITCHEN[h] = 1; });
var ALLOWED = {}, extra = 0;
Object.keys(SPR.PAL).forEach(function (ch) {
  var hex = SPR.PAL[ch]; ALLOWED[hex] = 1;
  if (SPR.EXTRA.indexOf(ch) >= 0) extra++; else ok(KITCHEN[hex], 'palette "' + ch + '" ' + hex + ' is not a kitchen colour and not listed as EXTRA');
});
ok(extra <= 4, 'at most four extra colours (' + extra + ')');
ok(Object.keys(sb.COOK_ART.F).every(function (k) { return ALLOWED[sb.COOK_ART.F[k]]; }), 'every FOOD colour of the kitchen is in the table');

function hexAt(b, x, y) {
  if (x < 0 || y < 0 || x >= b.w || y >= b.h) return null;
  var i = (y * b.w + x) << 2; if (!b.d[i + 3]) return null;
  return '#' + ((1 << 24) | (b.d[i] << 16) | (b.d[i + 1] << 8) | b.d[i + 2]).toString(16).slice(1);
}
function luma(hex) { var n = parseInt(hex.slice(1), 16); return Math.round(0.2126 * (n >> 16 & 255) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255)); }
var BLACK = { '#000000': 1, '#090a14': 1, '#10141f': 1 };
function key(b) { return Buffer.from(b.d.buffer, b.d.byteOffset, b.d.length).toString('base64'); }

var allowMissing = process.argv.indexOf('--allow-missing') >= 0, lint = process.argv.indexOf('--lint') >= 0, missing = [], frames = 0;
Object.keys(WANT).forEach(function (id) {
  var w = WANT[id], inf = SPR.info(id);
  if (!inf) { missing.push(id); if (!allowMissing) ok(false, id + ': missing'); return; }
  ok(inf.w === w[0] && inf.h === w[1], id + ': size ' + inf.w + ' x ' + inf.h + ', want ' + w[0] + ' x ' + w[1]);
  ok(inf.ax === w[2] && inf.ay === w[3], id + ': anchor ' + inf.ax + ', ' + inf.ay + ', want ' + w[2] + ', ' + w[3]);
  ok(inf.frames === w[4], id + ': ' + inf.frames + ' frames, want ' + w[4]);
});
SPR.ids().forEach(function (id) {
  var inf = SPR.info(id), seen = {};
  ok(SPR.get(id, 99) === SPR.get(id, inf.frames - 1) && SPR.get(id) === SPR.get(id, 0) && SPR.get(id, -3) === SPR.get(id, 0), id + ': frame clamps and default');
  for (var f = 0; f < inf.frames; f++) {
    var b = SPR.get(id, f), painted = 0, edge = 0, dark = 0, blackEdge = 0, alphaBad = 0, foreign = {}, orph = 0, pairs = {}, x, y; frames++;
    ok(b && b.w === inf.w && b.h === inf.h && b.d.length === b.w * b.h * 4, id + ' ' + f + ': buffer shape');
    for (y = 0; y < b.h; y++) for (x = 0; x < b.w; x++) {
      var a = b.d[((y * b.w + x) << 2) + 3]; if (a !== 0 && a !== 255) alphaBad++;
      var c = hexAt(b, x, y); if (!c) continue;
      painted++; if (!ALLOWED[c]) foreign[c] = 1;
      var nb = [hexAt(b, x + 1, y), hexAt(b, x - 1, y), hexAt(b, x, y + 1), hexAt(b, x, y - 1)];
      if (nb.indexOf(null) >= 0) { edge++; if (BLACK[c]) blackEdge++; if (luma(c) < 150) dark++; }
      if (nb.indexOf(c) < 0) orph++;
      nb.forEach(function (d) { if (d && d !== c && Math.abs(luma(c) - luma(d)) < 20) pairs[[c, d].sort().join('/')] = 1; });
    }
    ok(painted > 0, id + ' ' + f + ': empty frame');
    ok(!alphaBad, id + ' ' + f + ': alpha must be 0 or 255');
    ok(!Object.keys(foreign).length, id + ' ' + f + ': colours outside the palette ' + Object.keys(foreign).join(' '));
    ok(blackEdge === 0, id + ' ' + f + ': ' + blackEdge + ' black outline pixels');
    ok(edge > 0 && dark * 100 >= edge * 60, id + ' ' + f + ': outline too weak (' + dark + ' of ' + edge + ' edge pixels are dark)');
    var kk = key(b); ok(!seen[kk], id + ' ' + f + ': the same picture as frame ' + (seen[kk] ? seen[kk] - 1 : 0)); seen[kk] = f + 1;
    if (orph * 100 > painted * 6 || Object.keys(pairs).length > 6) warn.push(id + ' ' + f + ': ' + orph + ' orphan px of ' + painted + ', ' + Object.keys(pairs).length + ' close pairs');
  }
});
/* a fresh load paints the same bytes */
var sb2 = { module: { exports: {} } }; vm.createContext(sb2); vm.runInContext(src, sb2);
ok(SPR.ids().every(function (id) { return key(sb2.module.exports.get(id, 0)) === key(SPR.get(id, 0)); }), 'two loads paint the same bytes');
ok(SPR.get('no.such') === null && SPR.info('no.such') === null && SPR.get('toString') === null, 'unknown id -> null');
ok(src.length < 400 * 1024, 'file size ' + src.length + ' bytes, limit 409600');
ok(/^[\x00-\x7f]*$/.test(src), 'ASCII only');
ok(!/Math\.random|Date\.|performance\.|document\.|window\./.test(src), 'no random, clock or DOM');

console.log('cook-sprites: ' + SPR.ids().length + ' ids, ' + frames + ' frames, ' + src.length + ' bytes; ' + pass + ' checks passed, ' + fail + ' failed'
  + (missing.length ? '; missing ' + missing.length + ': ' + missing.join(' ') : ''));
console.log('lint warnings: ' + warn.length + (lint ? '' : ' (--lint lists them)'));
if (lint) warn.forEach(function (w) { console.log('  ' + w); });
process.exit(fail ? 1 : 0);
