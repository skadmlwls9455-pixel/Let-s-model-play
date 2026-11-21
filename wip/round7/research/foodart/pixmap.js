/* pixmap.js - RESEARCH SAMPLE (round 7, topic 09). Palette-indexed pixel maps written as rows of characters.
 * Plain script, no DOM, no dependencies: the same file runs in the browser (global PIXMAP) and in node (module.exports).
 * Integers only, no random source, no clock: same input -> same bytes.
 *
 * BUFFER  { w, h, d: Uint8ClampedArray(w * h * 4) }  RGBA, alpha 0 or 255 only  (= the buffers of js/cook-art.js)
 * SPRITE  { pal: { ch: NAME }, ramps: ['abc', ...], parts: { name: [rows] }, frames, outlined, light, states }
 *         rows   strings of equal length, one character per pixel, '.' = empty
 *         ramps  characters from light to dark; dark(ch) = the next character of its ramp (used by the shadow passes)
 *         frames { name: { w, h, list: [[part, x, y, flags], ...] } }  placements painted in order (back to front);
 *                flags: 's' = cast a contact shadow on what is already there, then paint
 *         outlined { part: [litChar, shadowChar] }  parts drawn without an outline get the outline pass (1 px bigger each way)
 *         light  [dx, dy, steps] of the contact shadows
 */
(function (root) {
  'use strict';
  function blank(w, h) { return { w: w, h: h, d: new Uint8ClampedArray(w * h * 4) }; }
  function rgbOf(hex) { var n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function hexAt(b, x, y) {
    if (x < 0 || y < 0 || x >= b.w || y >= b.h) return null;
    var i = (y * b.w + x) << 2; if (!b.d[i + 3]) return null;
    return '#' + ((1 << 24) | (b.d[i] << 16) | (b.d[i + 1] << 8) | b.d[i + 2]).toString(16).slice(1);
  }
  function put(b, x, y, hex) {
    if (x < 0 || y < 0 || x >= b.w || y >= b.h) return;
    var p = rgbOf(hex), i = (y * b.w + x) << 2; b.d[i] = p[0]; b.d[i + 1] = p[1]; b.d[i + 2] = p[2]; b.d[i + 3] = 255;
  }
  /* rows -> buffer. A ragged row or a character that is not in pal throws (a typo fails the build, it never paints a hole). */
  function decode(rows, pal, name) {
    var h = rows.length, w = rows[0].length, b = blank(w, h);
    for (var y = 0; y < h; y++) {
      if (rows[y].length !== w) throw new Error((name || 'part') + ' row ' + y + ': ' + rows[y].length + ' columns, want ' + w);
      for (var x = 0; x < w; x++) {
        var ch = rows[y].charAt(x); if (ch === '.') continue;
        if (!pal[ch]) throw new Error((name || 'part') + ' row ' + y + ' col ' + x + ': no colour for "' + ch + '"');
        put(b, x, y, pal[ch]);
      }
    }
    return b;
  }
  function stamp(dst, src, x, y, shaded) {   /* painted pixels only, clipped. shaded (optional) = the frame's shadow flags */
    for (var j = 0; j < src.h; j++) for (var i = 0; i < src.w; i++) {
      var s = (j * src.w + i) << 2; if (!src.d[s + 3]) continue;
      var X = x + i, Y = y + j; if (X < 0 || Y < 0 || X >= dst.w || Y >= dst.h) continue;
      var t = (Y * dst.w + X) << 2; dst.d[t] = src.d[s]; dst.d[t + 1] = src.d[s + 1]; dst.d[t + 2] = src.d[s + 2]; dst.d[t + 3] = 255;
      if (shaded) shaded[Y * dst.w + X] = 0;   /* a new surface: it can take a shadow again */
    }
    return dst;
  }
  /* hex -> one step darker, from the ramps (the last colour of a ramp stays) */
  function darkMap(pal, ramps) {
    var m = {};
    (ramps || []).forEach(function (r) { for (var i = 0; i + 1 < r.length; i++) m[pal[r.charAt(i)]] = pal[r.charAt(i + 1)]; });
    return m;
  }
  /* contact shadow: the painted pixels of dst under src moved by (dx, dy) go one ramp step darker, except under src itself.
     n = how many steps of the offset to walk (a 2-px shadow = n 2). Empty pixels stay empty (the ground shadow is its own pass).
     shaded (optional, Uint8Array dst.w * dst.h) remembers which pixels already took a shadow, so two parts never darken
     the same surface twice (without it the plate under two slices went two steps darker: found on the 16-px icon). */
  function castShadow(dst, src, x, y, dark, dx, dy, n, shaded) {
    n = n || 1;
    function solid(i, j) { return i >= 0 && j >= 0 && i < src.w && j < src.h && src.d[((j * src.w + i) << 2) + 3] > 0; }
    var done = {};
    for (var k = 1; k <= n; k++) for (var j = 0; j < src.h; j++) for (var i = 0; i < src.w; i++) {
      if (!solid(i, j)) continue;
      var qi = i + dx * k, qj = j + dy * k; if (solid(qi, qj)) continue;
      var X = x + qi, Y = y + qj, key = Y * 4096 + X; if (done[key]) continue; done[key] = 1;
      if (X < 0 || Y < 0 || X >= dst.w || Y >= dst.h) continue;
      if (shaded) { if (shaded[Y * dst.w + X]) continue; shaded[Y * dst.w + X] = 1; }
      var c = hexAt(dst, X, Y); if (c && dark[c]) put(dst, X, Y, dark[c]);
    }
    return dst;
  }
  /* ground shadow: empty pixels of buf under buf's own silhouette moved by (dx, dy) get colour hex (the engine instead
     darkens the ground it sits on by one ramp step; a preview has no ground, so it paints a flat tone or a checker) */
  function groundShadow(buf, dx, dy, hex, checker) {
    var out = blank(buf.w, buf.h);
    for (var y = 0; y < buf.h; y++) for (var x = 0; x < buf.w; x++) {
      if (hexAt(buf, x, y)) continue;
      if (hexAt(buf, x - dx, y - dy) && (!checker || ((x + y) & 1) === 0)) put(out, x, y, hex);
    }
    return stamp(out, buf, 0, 0);
  }
  /* selective outline for a part drawn without one: every empty pixel that touches the part (4 neighbours) takes the
     colour pick(hexOfTheNeighbour, lit) where lit = the ring pixel sits above or left of the part (the lamp side) */
  function outline(buf, pick) {
    var out = blank(buf.w + 2, buf.h + 2), N = [[0, 1, true], [1, 0, true], [0, -1, false], [-1, 0, false]];
    for (var y = -1; y <= buf.h; y++) for (var x = -1; x <= buf.w; x++) {
      if (hexAt(buf, x, y)) continue;
      for (var k = 0; k < 4; k++) { var c = hexAt(buf, x + N[k][0], y + N[k][1]); if (c) { var o = pick(c, N[k][2]); if (o) put(out, x + 1, y + 1, o); break; } }
    }
    return stamp(out, buf, 1, 1);
  }
  function scale(b, k) {   /* whole multiples only */
    var o = blank(b.w * k, b.h * k);
    for (var y = 0; y < o.h; y++) for (var x = 0; x < o.w; x++) {
      var s = (((y / k) | 0) * b.w + ((x / k) | 0)) << 2, t = (y * o.w + x) << 2;
      o.d[t] = b.d[s]; o.d[t + 1] = b.d[s + 1]; o.d[t + 2] = b.d[s + 2]; o.d[t + 3] = b.d[s + 3];
    }
    return o;
  }
  function colours(b) { var seen = {}, out = []; for (var y = 0; y < b.h; y++) for (var x = 0; x < b.w; x++) { var c = hexAt(b, x, y); if (c && !seen[c]) { seen[c] = 1; out.push(c); } } return out; }
  /* a whole frame: placements back to front; flag 's' casts the part's contact shadow on what is already there */
  /* pal = { ch: '#rrggbb' } already resolved (the game resolves the names with its own palette tables) */
  function frame(S, name, pal) {
    var F = S.frames[name], dark = darkMap(pal, S.ramps), b = blank(F.w, F.h), cache = {}, shaded = new Uint8Array(F.w * F.h), L = S.light || [1, 1, 1];
    F.list.forEach(function (p) {
      var part = cache[p[0]];
      if (!part) {
        part = decode(S.parts[p[0]], pal, p[0]);
        var ol = S.outlined && S.outlined[p[0]];   /* drawn without an outline: the selective outline pass (grows 1 px each way) */
        if (ol) part = outline(part, function (c, lit) { return pal[lit ? ol[0] : ol[1]]; });
        cache[p[0]] = part;
      }
      if (p[3] && p[3].indexOf('s') >= 0) castShadow(b, part, p[1], p[2], dark, L[0], L[1], L[2], shaded);
      stamp(b, part, p[1], p[2], shaded);
    });
    return b;
  }
  var API = { blank: blank, put: put, hexAt: hexAt, decode: decode, stamp: stamp, darkMap: darkMap, castShadow: castShadow,
    groundShadow: groundShadow, outline: outline, scale: scale, colours: colours, frame: frame };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.PIXMAP = API;
})(this);
