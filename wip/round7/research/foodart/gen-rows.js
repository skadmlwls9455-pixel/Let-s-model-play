#!/usr/bin/env node
/* gen-rows.js - RESEARCH SAMPLE: prints rows of characters for the big, simple shapes nobody should type by hand
 * (plates, bowls, pans, puddles). Paste the output into a sprite's parts, then touch it up by hand.
 *   node gen-rows.js ellipse 30 16 J w        outline J, fill w, 30 x 16
 *   node gen-rows.js ring 30 16 J w l 3       the same with an inner ellipse 3 px in, filled l (a rim and a well)
 *   node gen-rows.js rrect 48 22 3 J w        rounded rectangle 48 x 22, corners cut 3 px
 * Integer maths only (the pixel-centre test of js/cook-art.js inE), so the same call prints the same rows. */
'use strict';
function inE(x, y, w, h) { var X = 2 * x + 1 - w, Y = 2 * y + 1 - h; return X * X * h * h + Y * Y * w * w <= w * w * h * h; }   /* pixel centre inside the ellipse w x h */
function ellipse(w, h, o, f, inset, f2) {
  var rows = [];
  for (var y = 0; y < h; y++) {
    var r = '';
    for (var x = 0; x < w; x++) {
      if (!inE(x, y, w, h)) { r += '.'; continue; }
      var edge = !inE(x - 1, y, w, h) || !inE(x + 1, y, w, h) || !inE(x, y - 1, w, h) || !inE(x, y + 1, w, h);
      if (edge) { r += o; continue; }
      var xi = x - inset, yi = y - inset, wi = w - 2 * inset, hi = h - 2 * inset;
      r += inset && wi > 0 && hi > 0 && xi >= 0 && yi >= 0 && xi < wi && yi < hi && inE(xi, yi, wi, hi) ? f2 : f;
    }
    rows.push(r);
  }
  return rows;
}
function rrect(w, h, c, o, f) {   /* corners cut by c px on a diagonal staircase */
  var rows = [];
  for (var y = 0; y < h; y++) {
    var cut = Math.max(0, c - y, c - (h - 1 - y)), r = '';
    for (var x = 0; x < w; x++) {
      if (x < cut || x >= w - cut) { r += '.'; continue; }
      var cu = Math.max(0, c - (y - 1), c - (h - 1 - (y - 1))), cd = Math.max(0, c - (y + 1), c - (h - 1 - (y + 1)));
      var edge = y === 0 || y === h - 1 || x === cut || x === w - cut - 1 || x < cu || x >= w - cu || x < cd || x >= w - cd;
      r += edge ? o : f;
    }
    rows.push(r);
  }
  return rows;
}
var a = process.argv.slice(2), rows;
if (a[0] === 'ellipse') rows = ellipse(+a[1], +a[2], a[3] || 'J', a[4] || 'w', 0, '');
else if (a[0] === 'ring') rows = ellipse(+a[1], +a[2], a[3] || 'J', a[4] || 'w', +a[6] || 3, a[5] || 'l');
else if (a[0] === 'rrect') rows = rrect(+a[1], +a[2], +a[3] || 0, a[4] || 'J', a[5] || 'w');
else { console.log('usage: node gen-rows.js ellipse W H o f | ring W H o f f2 inset | rrect W H cut o f'); process.exit(2); }
rows.forEach(function (r) { console.log("        '" + r + "',"); });
