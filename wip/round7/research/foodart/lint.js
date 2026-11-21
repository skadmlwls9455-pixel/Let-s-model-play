#!/usr/bin/env node
/* lint.js - RESEARCH SAMPLE: three cheap checks an artist-agent can run before looking at the picture.
 *   node wip/round7/research/foodart/lint.js
 * 1 colours: how many, and all from the game palette (render.js already stops on a foreign colour)
 * 2 orphans: pixels with no 4-neighbour of their own colour (single pixels read as noise unless they are glints or flecks)
 * 3 close pairs: colours that touch but differ by less than 20 in luma (at 1x they merge into one) */
'use strict';
var R = require('./render.js'), PX = R.PX, S = require('./omelette.js');
function luma(hex) { var n = parseInt(hex.slice(1), 16); return Math.round(0.2126 * (n >> 16 & 255) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255)); }
var nameOf = {}; Object.keys(R.NAME).forEach(function (k) { if (!nameOf[R.NAME[k]] || /^[A-Z]\d$/.test(k)) nameOf[R.NAME[k]] = k; });
['served', 'icon', 'table'].forEach(function (fr) {
  var b = R.build(S, fr), cols = PX.colours(b), orphans = {}, nOrph = 0, pairs = {}, x, y;
  for (y = 0; y < b.h; y++) for (x = 0; x < b.w; x++) {
    var c = PX.hexAt(b, x, y); if (!c) continue;
    var nb = [PX.hexAt(b, x + 1, y), PX.hexAt(b, x - 1, y), PX.hexAt(b, x, y + 1), PX.hexAt(b, x, y - 1)];
    if (nb.indexOf(c) < 0) { nOrph++; orphans[nameOf[c]] = (orphans[nameOf[c]] || 0) + 1; }
    nb.forEach(function (d) { if (d && d !== c) { var k = [nameOf[c], nameOf[d]].sort().join('/'); pairs[k] = Math.abs(luma(c) - luma(d)); } });
  }
  var close = Object.keys(pairs).filter(function (k) { return pairs[k] < 20; }).map(function (k) { return k + ' (' + pairs[k] + ')'; });
  var painted = 0; for (y = 0; y < b.h; y++) for (x = 0; x < b.w; x++) if (PX.hexAt(b, x, y)) painted++;
  console.log(fr + ': ' + b.w + ' x ' + b.h + ', ' + painted + ' px painted, ' + cols.length + ' colours');
  console.log('  orphans: ' + nOrph + '  ' + JSON.stringify(orphans));
  console.log('  touching pairs under 20 luma: ' + (close.length ? close.join(', ') : 'none'));
});
