#!/usr/bin/env node
/* tools/make-stickers.js — 반응 스티커 PNG 생성 (docs/COOK_STICKERS.md · docs/PLAY_STICKERS.md).
 *
 *   node tools/make-stickers.js              # 세트 전부: assets/stickers/<세트>/*.png (32×32, 1x) + manifest sticker.<세트>.* + 미리보기
 *   node tools/make-stickers.js runner       # 한 세트만 (cook · runner · swim)
 *
 * 그림: tools/ui-art/<세트>-stickers.js (붓은 sticker-kit.js). 색은 Apollo(sprites.js KEY)만, 외곽선은 make-ui-art.js 와 같은 규칙
 * (투명 칸 중 칠한 이웃이 있으면 가장 어두운 이웃 색의 OKLab L×0.62 → Apollo 스냅).
 * 미리보기: tests/evidence/<세트>-stickers/sheet.png (×4, 밝은/어두운 바탕 두 줄).
 * 브라우저·외부 의존성 없음 (zlib 만).
 */
'use strict';
var fs = require('fs'), path = require('path'), zlib = require('zlib');
var SP = require('./ui-art/sprites.js');
var SETS = {
  cook:   { mod: './ui-art/cook-stickers.js',   name: '요리',          js: 'js/cook-stickers.js' },
  runner: { mod: './ui-art/runner-stickers.js', name: '다락방 달리기', js: 'js/play-stickers.js' },
  swim:   { mod: './ui-art/swim-stickers.js',   name: '헤엄',          js: 'js/play-stickers.js' }
};
var ONLY = process.argv[2];
if (ONLY && !SETS[ONLY]) { console.error('모르는 세트: ' + ONLY + ' (' + Object.keys(SETS).join(' · ') + ')'); process.exit(1); }
var CS = require('./ui-art/sticker-kit.js');
var ROOT = path.resolve(__dirname, '..');
var MANIFEST = path.join(ROOT, 'assets/manifest.json');

/* PNG (RGBA 8-bit) */
var CRC = (function () { var t = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { var c = 0xffffffff; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) { var l = Buffer.alloc(4), t = Buffer.from(type, 'ascii'), c = Buffer.alloc(4); l.writeUInt32BE(data.length); c.writeUInt32BE(crc32(Buffer.concat([t, data]))); return Buffer.concat([l, t, data, c]); }
function encodePNG(w, h, px) {
  var ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
  var raw = Buffer.alloc((w * 4 + 1) * h);
  for (var y = 0; y < h; y++) px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/* 색 (OKLab, make-ui-art.js 와 같은 식) */
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
function outlineOf(hex) {
  if (OC[hex]) return OC[hex];
  var lab = oklab(hex), k = 0.62, o = nearest([lab[0] * k, lab[1] * 0.9, lab[2] * 0.9]);
  while (o === hex && k > 0.2) { k -= 0.1; o = nearest([lab[0] * k, lab[1] * 0.9, lab[2] * 0.9]); }
  return (OC[hex] = o);
}

function render(st, drawFn) {
  var cv = new CS.Canvas(); (drawFn || st.draw)(cv);
  var W = CS.W, H = CS.H;
  var cells = cv.c.map(function (k) { if (k == null) return null; if (!SP.KEY[k]) throw new Error(st.id + ': 모르는 색 글자 ' + k); return SP.KEY[k]; });
  var out = cells.slice();
  for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
    if (cells[y * W + x]) continue;
    var nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(function (d) { var X = x + d[0], Y = y + d[1]; return X < 0 || Y < 0 || X >= W || Y >= H ? null : cells[Y * W + X]; }).filter(Boolean);
    if (!nb.length) continue;
    nb.sort(function (a, b) { return oklab(a)[0] - oklab(b)[0]; });
    out[y * W + x] = outlineOf(nb[0]);
  }
  /* 가장자리에 닿은 칠한 칸은 외곽선이 잘린다 → 경고만 */
  var touch = 0; for (var i = 0; i < W; i++) [cells[i], cells[(H - 1) * W + i], cells[i * W], cells[i * W + W - 1]].forEach(function (c) { if (c) touch++; });
  return { cells: out, touch: touch };
}
function toRGBA(cells) { var px = Buffer.alloc(cells.length * 4); cells.forEach(function (c, i) { if (!c) return; var r = hexRgb(c); px[i * 4] = r[0]; px[i * 4 + 1] = r[1]; px[i * 4 + 2] = r[2]; px[i * 4 + 3] = 255; }); return px; }

function makeSet(SET) {
  var info = SETS[SET], STICKERS = require(info.mod).STICKERS, touched = [];
  var ids = Object.keys(STICKERS), rendered = {}, manifestAdd = {}, animIds = [];
  fs.mkdirSync(path.join(ROOT, 'assets/stickers/' + SET), { recursive: true });
  ids.forEach(function (id) {
    var st = STICKERS[id], r = render(st), rel = 'assets/stickers/' + SET + '/' + id + '.png';
    rendered[id] = r.cells;
    fs.writeFileSync(path.join(ROOT, rel), encodePNG(CS.W, CS.H, toRGBA(r.cells)));
    if (r.touch) touched.push(id + ' ' + r.touch);
    if (st.frames) {   /* 움직이는 칸: 32×32 칸을 가로로 이어 붙인 스트립 */
      var n = st.frames.length, SW2 = CS.W * n, strip = Buffer.alloc(SW2 * CS.H * 4);
      st.frames.forEach(function (fn, f) {
        var px = toRGBA(render(st, fn).cells);
        for (var y = 0; y < CS.H; y++) px.copy(strip, (y * SW2 + f * CS.W) * 4, y * CS.W * 4, (y + 1) * CS.W * 4);
      });
      var arel = 'assets/stickers/' + SET + '/' + id + '_anim.png';
      fs.writeFileSync(path.join(ROOT, arel), encodePNG(SW2, CS.H, strip));
      manifestAdd['sticker.' + SET + '.' + id + '.anim'] = { src: arel, w: SW2, h: CS.H, frames: n, cell: CS.W, note: '「' + st.label + '」 움직이는 칸 ' + n + '개 가로 스트립 (칸 0 = 정지 그림). 4 fps 스텝.' };
      animIds.push(id);
    }
    manifestAdd['sticker.' + SET + '.' + id] = { src: rel, w: CS.W, h: CS.H, note: info.name + ' 반응 스티커 「' + st.label + '」 — ' + st.alt + '. 32×32, ×2·×3 정수 배로만 (' + info.js + ').' };
  });
  console.log(SET + ': ' + ids.length + ' PNG → assets/stickers/' + SET + '/' + (animIds.length ? ' · 움직이는 스트립: ' + animIds.join(', ') : '') + (touched.length ? ' · 가장자리 닿음(외곽선 잘림): ' + touched.join(', ') : ''));

  /* manifest: sticker.<세트>.* 만 덮어쓴다 */
  var man = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  Object.keys(man).forEach(function (k) { if (k.indexOf('sticker.' + SET + '.') === 0 && !manifestAdd[k]) delete man[k]; });
  Object.keys(manifestAdd).forEach(function (k) { man[k] = manifestAdd[k]; });
  fs.writeFileSync(MANIFEST, JSON.stringify(man, null, 2) + '\n');

  /* 미리보기 시트: 한 줄 8개, ×4, 칸 사이 8px. 위 = 종이 바탕, 아래 = 밤 바탕 */
  var S = 4, PAD = 8, COLS = 8, CELL = CS.W * S + PAD * 2, rows = Math.ceil(ids.length / COLS);
  var SW = COLS * CELL, SH = rows * CELL * 2;
  var sheet = Buffer.alloc(SW * SH * 4);
  function fill(x0, y0, w, h, rgb) { for (var y = y0; y < y0 + h; y++) for (var x = x0; x < x0 + w; x++) { var i = (y * SW + x) * 4; sheet[i] = rgb[0]; sheet[i + 1] = rgb[1]; sheet[i + 2] = rgb[2]; sheet[i + 3] = 255; } }
  fill(0, 0, SW, rows * CELL, hexRgb('#e7d5b3'));
  fill(0, rows * CELL, SW, rows * CELL, hexRgb('#172038'));
  [0, 1].forEach(function (band) {
    ids.forEach(function (id, n) {
      var cx = (n % COLS) * CELL + PAD, cy = band * rows * CELL + Math.floor(n / COLS) * CELL + PAD;
      rendered[id].forEach(function (c, i) { if (c) fill(cx + (i % CS.W) * S, cy + Math.floor(i / CS.W) * S, S, S, hexRgb(c)); });
    });
  });
  var ev = path.join(ROOT, 'tests/evidence/' + SET + '-stickers'); fs.mkdirSync(ev, { recursive: true });
  fs.writeFileSync(path.join(ev, 'sheet.png'), encodePNG(SW, SH, sheet));
  console.log('  sheet → tests/evidence/' + SET + '-stickers/sheet.png  (' + ids.join(' · ') + ')');
}
Object.keys(SETS).forEach(function (k) {
  if (ONLY && k !== ONLY) return;
  if (!fs.existsSync(path.join(__dirname, SETS[k].mod))) { console.log(k + ': 그림 파일 아직 없음 — 건너뜀'); return; }
  makeSet(k);
});
