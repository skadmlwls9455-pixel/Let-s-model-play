#!/usr/bin/env node
/* tools/make-dish-icons.js — 6차 (11-18) 놀이방 요리 쟁반의 16×16 요리 그림 셋 + 부엌 덮개의 닫기 그림 (node, 의존성 없음).
 *
 *   node tools/make-dish-icons.js          assets/icons/dish/{jeon,jumeokbap,kkochi,close}.png 를 쓰고 manifest 에 icon.dish.* 를 넣는다
 *   node tools/make-dish-icons.js --check  파일이 지금 그리드와 바이트까지 같은지만 본다 (다르면 exit 1)
 *
 * 그리드는 고정 (아래 글자 판) — 같은 입력이면 같은 바이트 (zlib 수준 고정, 시각 · 난수 없음). 색은 Apollo 46 + 부엌의 FOOD 색만.
 * close 는 부엌 안 닫기 단추와 같은 그림 (js/cook-art.js COOK_ART.icon('close')) — 부엌이 못 열렸을 때 게임 쪽 닫기 단추 (#cook-close).
 * manifest 는 icon.dish.* 키만 바꾼다 (다른 키는 그대로 · 순서도).
 */
'use strict';
var fs = require('fs'), path = require('path'), zlib = require('zlib'), vm = require('vm');
var ROOT = path.resolve(__dirname, '..');
var OUT = path.join(ROOT, 'assets/icons/dish');

/* 색 (Apollo · FOOD 이름 그대로 — js/cook-art.js) */
var K = {
  J1: '#a8341a', J3: '#f68b1f', J4: '#ffb52a', J5: '#ffd95c', T0: '#10160b', T1: '#2b4119',
  C0: '#a0123a', C1: '#ee2b2b', C2: '#ff7f4f', P0: '#1b5b2b', P2: '#86d838', P3: '#d4f56c',
  s3: '#819796', s4: '#a8b5b2', s5: '#c7cfcc', s6: '#ebede9', g1: '#25562e', g3: '#75a743', w3: '#ad7757', coal: '#10141f'
};
var GRIDS = {
  /* 노릇한 둥근 전 · 진한 해초 점 · 열십자 칼집 (틈은 비움 — 칩 종이색이 보인다) */
  jeon: { pal: { o: 'J1', L: 'J5', B: 'J4', S: 'J3', f: 'T1' }, rows: [
    '................',
    '................',
    '................',
    '....oooo.ooo....',
    '..ooLLLL.BBBoo..',
    '..oLLLBB.BBBBo..',
    '.oLLBBfB.BBBBBo.',
    '.oLBBBBB.BBfBSo.',
    '................',
    '.oBBBBBB.BBBBSo.',
    '.oBfBBBB.BBBSSo.',
    '..oBBBBB.BBSSo..',
    '..ooBBBS.SSSoo..',
    '....oooo.ooo....',
    '................',
    '................'] },
  /* 하얀 밥 떡 · 가운데 김 띠 */
  jumeokbap: { pal: { o: 's3', W: 's6', S: 's5', g: 's4', n: 'T1', N: 'T0' }, rows: [
    '................',
    '................',
    '................',
    '....oooNNooo....',
    '..ooWWWnNWWWoo..',
    '..oWWgWnNWWWWo..',
    '.oWWWWWnNWWgWWo.',
    '.oWgWWWnNWWWWSo.',
    'oWWWWWWnNWWWWSSo',
    '.oWWWWWnNWWWSSo.',
    '.oWWWgWnNWWSSSo.',
    '..oSWWWnNWSSSo..',
    '..ooSSSnNSSSoo..',
    '....oooNNooo....',
    '................',
    '................'] },
  /* 꼬치: 빨간 수박 셋 · 초록 포도 · 주황 귤 끝 */
  kkochi: { pal: { L: 'C2', R: 'C1', d: 'C0', k: 'coal', W: 's6', g: 'g3', K: 'g1', p: 'P0', P: 'P3', G: 'P2', T: 'J4', t: 'J3', w: 'w3' }, rows: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '....LLLdLLdLL...',
    '....RRRdRRdRR...',
    '.pPpRkRdRRdRkTT.',
    'wGPGRRRdRkdRRtTw',
    '.pGpWWWdWWdWWtt.',
    '....gggKggKgg...',
    '....KKKKKKKKK...',
    '................',
    '................',
    '................',
    '................'] }
};

function rgbaOf(name) {
  var g = GRIDS[name], px = Buffer.alloc(16 * 16 * 4);
  if (g.rows.length !== 16) throw new Error(name + ': 16 rows');
  g.rows.forEach(function (row, y) {
    if (row.length !== 16) throw new Error(name + ' row ' + y + ': 16 columns');
    for (var x = 0; x < 16; x++) {
      var c = row[x]; if (c === '.') continue;
      var hex = K[g.pal[c]]; if (!hex) throw new Error(name + ': no colour for ' + c);
      var n = parseInt(hex.slice(1), 16), o = (y * 16 + x) * 4;
      px[o] = n >> 16 & 255; px[o + 1] = n >> 8 & 255; px[o + 2] = n & 255; px[o + 3] = 255;
    }
  });
  return px;
}
function closeRGBA() {   /* the kitchen's own close picture, painted by js/cook-art.js */
  var sb = {}; vm.createContext(sb); vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/cook-art.js'), 'utf8'), sb, { filename: 'cook-art.js' });
  var ic = sb.COOK_ART.icon('close');
  return Buffer.from(ic.d);
}
var CRC = (function () { var t = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { var r = 0xffffffff; for (var i = 0; i < b.length; i++) r = CRC[(r ^ b[i]) & 255] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  var len = Buffer.alloc(4), td = Buffer.concat([Buffer.from(type, 'ascii'), data]), c = Buffer.alloc(4);
  len.writeUInt32BE(data.length); c.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, c]);
}
function png(px, w, h) {
  var raw = Buffer.alloc((w * 4 + 1) * h);
  for (var y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  var hd = Buffer.alloc(13); hd.writeUInt32BE(w, 0); hd.writeUInt32BE(h, 4); hd[8] = 8; hd[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', hd), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
var NOTE = {
  jeon: '놀이방 요리 쟁반 (#dish-pick) 해초전 칩 그림 16×16 — floor(3·dpr) 기기 px 배로만 (tools/make-dish-icons.js)',
  jumeokbap: '놀이방 요리 쟁반 (#dish-pick) 주먹밥 칩 그림 16×16 — floor(3·dpr) 기기 px 배로만 (tools/make-dish-icons.js)',
  kkochi: '놀이방 요리 쟁반 (#dish-pick) 과일 꼬치 칩 그림 16×16 — floor(3·dpr) 기기 px 배로만 (tools/make-dish-icons.js)',
  close: '부엌이 아직 안 열렸을 때 게임 쪽 닫기 단추 (#cook-close) 그림 16×16 = 부엌 안 닫기 그림 (COOK_ART.icon close) — floor(2·dpr) 기기 px 배로만'
};
var NAMES = ['jeon', 'jumeokbap', 'kkochi', 'close'];
function build() { var o = {}; NAMES.forEach(function (n) { o[n] = png(n === 'close' ? closeRGBA() : rgbaOf(n), 16, 16); }); return o; }

var bufs = build(), check = process.argv.indexOf('--check') >= 0, bad = 0;
if (check) {
  NAMES.forEach(function (n) { var f = path.join(OUT, n + '.png'); if (!fs.existsSync(f) || !fs.readFileSync(f).equals(bufs[n])) { bad++; console.error('stale: ' + n + '.png'); } });
  var man0 = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/manifest.json'), 'utf8'));
  NAMES.forEach(function (n) { var m = man0['icon.dish.' + n]; if (!m || m.src !== 'assets/icons/dish/' + n + '.png' || m.w !== 16 || m.h !== 16) { bad++; console.error('manifest: icon.dish.' + n); } });
  console.log('make-dish-icons --check: ' + (bad ? bad + ' stale' : 'up to date'));
  process.exit(bad ? 1 : 0);
}
fs.mkdirSync(OUT, { recursive: true });
NAMES.forEach(function (n) { fs.writeFileSync(path.join(OUT, n + '.png'), bufs[n]); });
/* manifest: icon.dish.* only (after the last icon.* key on a first run; values replaced in place afterwards) */
var mf = path.join(ROOT, 'assets/manifest.json'), man = JSON.parse(fs.readFileSync(mf, 'utf8')), out = {}, keys = Object.keys(man), at = -1;
keys.forEach(function (k, i) { if (/^icon\./.test(k)) at = i; });
var add = {}; NAMES.forEach(function (n) { add['icon.dish.' + n] = { src: 'assets/icons/dish/' + n + '.png', w: 16, h: 16, note: NOTE[n] }; });
var have = keys.some(function (k) { return /^icon\.dish\./.test(k); });
keys.forEach(function (k, i) {
  if (/^icon\.dish\./.test(k)) { if (add[k]) { out[k] = add[k]; delete add[k]; } return; }
  out[k] = man[k];
  if (!have && i === at) Object.keys(add).forEach(function (a) { out[a] = add[a]; delete add[a]; });
});
Object.keys(add).forEach(function (a) { out[a] = add[a]; });
var text = JSON.stringify(out, null, 2) + '\n';
fs.writeFileSync(mf, text);
console.log('make-dish-icons: wrote ' + NAMES.map(function (n) { return n + '.png'; }).join(', ') + ' + manifest icon.dish.*');
