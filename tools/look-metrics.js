#!/usr/bin/env node
/* tools/look-metrics.js — 룩 루프 메트릭 (docs/LOOK_LOOP.md). 의존성 없음 (zlib 만).
 *   node tools/look-metrics.js <png> [<png> …]        (환경변수 LOOK_PX=<n> 으로 아트 픽셀 한 변(PNG px) 강제, 생략 = 자동 감지)
 * 찍는 것: 크기 · 고유 색 수 · 엣지 픽셀 비율(%: 오른쪽/아래 이웃과 루마 차 > 0.25) · 평균 루마(0..1)
 *   + 룩 패스 5: 아트 픽셀 한 변(자동: 같은 색 가로 런 길이의 최빈 최소값) · **평탄 노이즈** = 4×4 아트px 블록 중 색 3+ 이면서 루마 범위 < 0.08 인 블록 수(%)
 *     — 평평한 면 위의 체크무늬 디더(ungated dither) 를 잡는다 · **스펙클**(‰) = 네 이웃과 모두 색이 다르면서 한 축의 양 이웃은 서로 같은 색이고 루마 차 < 0.13(≈ 팔레트 1칸) 인 아트px
 *     — 널 피치가 4px 라 4×4 블록은 늘 이음을 품으므로, 바닥 체크무늬는 이 픽셀 단위 수치가 잡는다(1px 선·못·글린트는 이웃이 같거나 루마 차가 커서 빠짐) · **선 두께** = 가로/세로로 양 이웃보다 0.1 이상 어두운 1px 선 vs 2px 선 수(두꺼운 선 비율 %: 요 스텝 간 심 떨림 검사)
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

/* 아트 픽셀 한 변(PNG px) 자동 감지: 행마다 같은 색 런 길이를 세어, 전체 런의 2% 이상을 차지하는 가장 짧은 길이(≤ 16). 업스케일이 Nearest 라 런은 그 배수다 */
function detectArtPx(img) {
  var w = img.w, h = img.h, bpp = img.bpp, px = img.px, cnt = new Array(17).fill(0), total = 0;
  for (var y = 0; y < h; y++) {
    var run = 1;
    for (var x = 1; x <= w; x++) {
      var same = x < w && px[(y * w + x) * bpp] === px[(y * w + x - 1) * bpp] && px[(y * w + x) * bpp + 1] === px[(y * w + x - 1) * bpp + 1] && px[(y * w + x) * bpp + 2] === px[(y * w + x - 1) * bpp + 2];
      if (same) { run++; continue; }
      if (run <= 16) cnt[run]++; total++; run = 1;
    }
  }
  for (var L = 1; L <= 16; L++) if (cnt[L] >= total * 0.02) return L;
  return 1;
}
/* 아트 픽셀 격자로 다운샘플(블록 중심 샘플) → { aw, ah, rgb: Uint8Array, luma: Float32Array } */
function downsample(img, a) {
  var aw = Math.floor(img.w / a), ah = Math.floor(img.h / a), rgb = new Uint8Array(aw * ah * 3), luma = new Float32Array(aw * ah), half = a >> 1;
  for (var y = 0; y < ah; y++) for (var x = 0; x < aw; x++) {
    var i = ((y * a + half) * img.w + x * a + half) * img.bpp, k = y * aw + x;
    rgb[k * 3] = img.px[i]; rgb[k * 3 + 1] = img.px[i + 1]; rgb[k * 3 + 2] = img.px[i + 2];
    luma[k] = (0.2126 * img.px[i] + 0.7152 * img.px[i + 1] + 0.0722 * img.px[i + 2]) / 255;
  }
  return { aw: aw, ah: ah, rgb: rgb, luma: luma };
}
/* 평탄 노이즈: 4×4 아트px 블록(겹치지 않음) 중 고유 색 ≥ 3 이면서 루마 범위 < 0.08 → 평평한 면에 깔린 디더/노이즈 */
function flatNoise(ds) {
  var bx = Math.floor(ds.aw / 4), by = Math.floor(ds.ah / 4), noisy = 0;
  for (var j = 0; j < by; j++) for (var i = 0; i < bx; i++) {
    var set = new Set(), mn = 2, mx = -1;
    for (var y = 0; y < 4; y++) for (var x = 0; x < 4; x++) {
      var k = (j * 4 + y) * ds.aw + i * 4 + x, L = ds.luma[k];
      set.add((ds.rgb[k * 3] << 16) | (ds.rgb[k * 3 + 1] << 8) | ds.rgb[k * 3 + 2]);
      if (L < mn) mn = L; if (L > mx) mx = L;
    }
    if (set.size >= 3 && mx - mn < 0.08) noisy++;
  }
  return { blocks: bx * by, noisy: noisy, pct: +(bx * by ? noisy / (bx * by) * 100 : 0).toFixed(2) };
}
/* 스펙클: 네 이웃과 모두 색이 다른 아트px 중, 가로 또는 세로 양 이웃이 서로 같은 색(ABA)이고 그 루마 차가 0.13 미만(≈ Apollo 바닥 칸 간격 0.08~0.12) → 평평한 면에 깔린 2색 체크무늬. ‰ 로 보고 */
function speckles(ds) {
  var aw = ds.aw, ah = ds.ah, L = ds.luma, rgb = ds.rgb, n = 0;
  function c(k) { return (rgb[k * 3] << 16) | (rgb[k * 3 + 1] << 8) | rgb[k * 3 + 2]; }
  for (var y = 1; y < ah - 1; y++) for (var x = 1; x < aw - 1; x++) {
    var k = y * aw + x, c0 = c(k), l0 = L[k];
    if (c0 === c(k - 1) || c0 === c(k + 1) || c0 === c(k - aw) || c0 === c(k + aw)) continue;
    if ((c(k - 1) === c(k + 1) && Math.abs(L[k - 1] - l0) < 0.13) || (c(k - aw) === c(k + aw) && Math.abs(L[k - aw] - l0) < 0.13)) n++;
  }
  return { count: n, perMille: +(n / (aw * ah) * 1000).toFixed(1) };
}
/* 선 두께: 한 축을 따라 양쪽 바깥 이웃보다 0.1 이상 어두운 1px 선 / 2px 선(두 픽셀 루마 차 < 0.05) 을 센다 → 두꺼운 선 비율. 요 스텝을 바꿔도 비슷해야 "심이 1px 로 유지" */
function lineWidths(ds) {
  var thin = 0, thick = 0, aw = ds.aw, ah = ds.ah, L = ds.luma;
  function scan(len, other, at) {
    for (var o = 0; o < other; o++) for (var i = 1; i < len - 1; i++) {
      var l0 = L[at(i, o)], lm = L[at(i - 1, o)], lp = L[at(i + 1, o)];
      if (lm - l0 >= 0.1 && lp - l0 >= 0.1) thin++;
      else if (i + 2 < len && lm - l0 >= 0.1 && Math.abs(lp - l0) < 0.05 && L[at(i + 2, o)] - lp >= 0.1) thick++;
    }
  }
  scan(aw, ah, function (i, o) { return o * aw + i; });
  scan(ah, aw, function (i, o) { return i * aw + o; });
  return { thin: thin, thick: thick, thickPct: +(thin + thick ? thick / (thin + thick) * 100 : 0).toFixed(1) };
}

function metrics(file, opts) {
  var img = decodePNG(file), w = img.w, h = img.h, bpp = img.bpp, px = img.px, n = w * h;
  var artPx = (opts && opts.px) || (+process.env.LOOK_PX || 0) || detectArtPx(img), ds = downsample(img, artPx), fn = flatNoise(ds), sp = speckles(ds), lw = lineWidths(ds);
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
  return { file: file, w: w, h: h, colours: set.size, edgePct: +(edges / n * 100).toFixed(2), meanLuma: +(sum / n).toFixed(3),
    artPx: artPx, art: [ds.aw, ds.ah], flatNoise: fn.noisy, flatBlocks: fn.blocks, flatNoisePct: fn.pct, speckles: sp.count, specklePerMille: sp.perMille, thinLines: lw.thin, thickLines: lw.thick, thickPct: lw.thickPct };
}
function fmt(m) { return m.file + ': ' + m.w + '×' + m.h + ' · unique colours ' + m.colours + ' · edge px ' + m.edgePct + '% · mean luma ' + m.meanLuma + ' · art px ' + m.artPx + ' (' + m.art[0] + '×' + m.art[1] + ') · flat-noise blocks ' + m.flatNoise + '/' + m.flatBlocks + ' (' + m.flatNoisePct + '%) · speckles ' + m.speckles + ' (' + m.specklePerMille + '‰) · lines 1px ' + m.thinLines + ' / 2px ' + m.thickLines + ' (thick ' + m.thickPct + '%)'; }

if (require.main === module) {
  var files = process.argv.slice(2);
  if (!files.length) { console.error('usage: node tools/look-metrics.js <png> [<png> …]'); process.exit(2); }
  files.forEach(function (f) { console.log(fmt(metrics(f))); });
}
module.exports = { decodePNG: decodePNG, metrics: metrics, fmt: fmt, detectArtPx: detectArtPx, flatNoise: flatNoise, speckles: speckles, lineWidths: lineWidths };
