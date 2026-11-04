#!/usr/bin/env node
/* tools/look-metrics.js — 룩 루프 메트릭 (docs/LOOK_LOOP.md). 의존성 없음 (zlib 만).
 *   node tools/look-metrics.js <png> [<png> …]
 * 찍는 것: 크기 · 고유 색 수 · 엣지 픽셀 비율(%: 오른쪽/아래 이웃과 루마 차 > 0.25) · 평균 루마(0..1).
 * tools/look-shots.js 가 require 해서 같은 숫자를 찍는다.
 */
'use strict';
var fs = require('fs'), zlib = require('zlib');

/* 최소 PNG 디코더 (8-bit RGB/RGBA, 비인터레이스) → { w, h, bpp, px: Buffer } */
function decodePNG(file) {
  var buf = fs.readFileSync(file), pos = 8, w = 0, h = 0, ctype = 0, idat = [];
  while (pos < buf.length) {
    var len = buf.readUInt32BE(pos), type = buf.toString('ascii', pos + 4, pos + 8), data = buf.slice(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); if (data[8] !== 8 || data[12] !== 0) throw new Error('png: 8-bit non-interlaced only'); ctype = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  var bpp = ctype === 6 ? 4 : ctype === 2 ? 3 : 0; if (!bpp) throw new Error('png: colour type ' + ctype);
  var raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * bpp, out = Buffer.alloc(w * h * bpp), prev = Buffer.alloc(stride), cur = Buffer.alloc(stride);
  for (var y = 0; y < h; y++) {
    var f = raw[y * (stride + 1)], off = y * (stride + 1) + 1;
    for (var i = 0; i < stride; i++) {
      var x = raw[off + i], a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0, v;
      if (f === 0) v = x; else if (f === 1) v = x + a; else if (f === 2) v = x + b; else if (f === 3) v = x + ((a + b) >> 1);
      else { var p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      cur[i] = v & 255;
    }
    cur.copy(out, y * stride);
    var t = prev; prev = cur; cur = t;
  }
  return { w: w, h: h, bpp: bpp, px: out };
}

function metrics(file) {
  var img = decodePNG(file), w = img.w, h = img.h, bpp = img.bpp, px = img.px, n = w * h;
  var set = new Set(), luma = new Float32Array(n), sum = 0;
  for (var i = 0; i < n; i++) {
    var r = px[i * bpp], g = px[i * bpp + 1], b = px[i * bpp + 2];
    set.add((r << 16) | (g << 8) | b);
    var L = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; luma[i] = L; sum += L;
  }
  var edges = 0;
  for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
    var k = y * w + x, L0 = luma[k];
    if ((x + 1 < w && Math.abs(L0 - luma[k + 1]) > 0.25) || (y + 1 < h && Math.abs(L0 - luma[k + w]) > 0.25)) edges++;
  }
  return { file: file, w: w, h: h, colours: set.size, edgePct: +(edges / n * 100).toFixed(2), meanLuma: +(sum / n).toFixed(3) };
}
function fmt(m) { return m.file + ': ' + m.w + '×' + m.h + ' · unique colours ' + m.colours + ' · edge px ' + m.edgePct + '% · mean luma ' + m.meanLuma; }

if (require.main === module) {
  var files = process.argv.slice(2);
  if (!files.length) { console.error('usage: node tools/look-metrics.js <png> [<png> …]'); process.exit(2); }
  files.forEach(function (f) { console.log(fmt(metrics(f))); });
}
module.exports = { decodePNG: decodePNG, metrics: metrics, fmt: fmt };
