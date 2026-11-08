#!/usr/bin/env node
/* tools/player-shots.js — 내 캐릭터 증거 (docs/SCENE.md "내 캐릭터"). SwiftShader 로 WebGL 강제, 360×326 장면 @2x, p=2 (exterior-shots 와 같은 독립 하네스).
 *   node tools/player-shots.js [palette]   # 기본 apollo
 * → tests/evidence/player/pl-attic-day.png (다락 쉬는 자리) · pl-attic-close.png (2× 확대 크롭) · pl-attic-night.png (밤 자체광)
 *   · pl-walk-strip.png (문 톡 → 문 앞까지 걷기 → 문 열림, 0.1 s × 24 칸, 캐릭터를 따라가는 96×96 CSS px 크롭) · pl-attic-door.png (문 앞에 서서 문을 본다 — 문짝에 안 가린다) · pl-play-day.png (놀이방 쉬는 자리) · pl-play-close.png
 * 검사: 샷마다 고유 색 ≤ 62 · 다락 드로우콜 ≤ 150 · 놀이방 ≤ 60 · 셰이더 프로그램 수가 부팅과 같음(내 캐릭터 툰은 문어 툰과 프로그램을 나눠 쓴다) · walkFirst 로 문이 걷기 뒤에 열림 · 콘솔/페이지 에러 0. 어기면 exit 1.
 */
'use strict';
var fs = require('fs'), path = require('path'), os = require('os'), zlib = require('zlib');
var { chromium } = require('playwright');
var LM = require('./look-metrics.js');
var ROOT = path.resolve(__dirname, '..');
var PALETTE = process.argv[2] ? String(process.argv[2]).replace(/[^A-Za-z0-9_]/g, '') : 'apollo';
var OUT = process.env.LOOK_OUT || path.join(ROOT, 'tests/evidence/player');
fs.mkdirSync(OUT, { recursive: true });
var W = 360, H = 326, DPR = 2, CROP = 96, FRAMES = 24, STEP = 0.1;

var CRC = (function () { var t = new Int32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
function crc32(buf) { var c = -1; for (var i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(type, data) { var len = Buffer.alloc(4); len.writeUInt32BE(data.length); var td = Buffer.concat([Buffer.from(type, 'ascii'), data]); var crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function encodePNG(w, h, rgba) {
  var raw = Buffer.alloc((w * 4 + 1) * h);
  for (var y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  var ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function strip(frames) {
  var imgs = frames.map(function (b) { var tmp = path.join(os.tmpdir(), 'pl-frame-' + process.pid + '.png'); fs.writeFileSync(tmp, b); var im = LM.decodePNG(tmp); fs.unlinkSync(tmp); return im; });
  var w = imgs[0].w, h = imgs[0].h, gap = 2, Wd = w * imgs.length + gap * (imgs.length - 1), out = Buffer.alloc(Wd * h * 4);
  for (var f = 0; f < imgs.length; f++) for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
    var si = (y * w + x) * imgs[f].bpp, di = (y * Wd + f * (w + gap) + x) * 4;
    out[di] = imgs[f].px[si]; out[di + 1] = imgs[f].px[si + 1]; out[di + 2] = imgs[f].px[si + 2]; out[di + 3] = 255;
  }
  return encodePNG(Wd, h, out);
}
function uniq(file) { var im = LM.decodePNG(file), set = new Set(); for (var i = 0; i < im.w * im.h; i++) set.add((im.px[i * im.bpp] << 16) | (im.px[i * im.bpp + 1] << 8) | im.px[i * im.bpp + 2]); return set.size; }

function harness() {
  var u = function (p) { return 'file://' + path.join(ROOT, p); };
  var html = '<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#1b1522}#scene{position:relative;width:' + W + 'px;height:' + H + 'px;overflow:hidden;background:#1b1522;display:flex;align-items:center;justify-content:center}#scene canvas{display:block;image-rendering:pixelated}</style></head><body><div id="scene"></div>' +
    '<script src="' + u('vendor/three.min.js') + '"></script><script src="' + u('js/palettes.js') + '"></script><script src="' + u('js/scene3d.js') + '"></script></body></html>';
  var f = path.join(os.tmpdir(), 'ppol-player-shots-' + process.pid + '.html'); fs.writeFileSync(f, html); return f;
}

(async function () {
  var file = harness(), fails = [];
  var browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  var ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, locale: 'ko-KR', colorScheme: 'light' });
  var page = await ctx.newPage(), errs = [];
  page.on('pageerror', function (e) { errs.push('pageerror: ' + e.message); });
  page.on('console', function (m) { var t = m.text(); if (m.type() === 'error' && !/Failed to load resource|net::|ERR_/.test(t)) errs.push('console.error: ' + t); });
  await page.goto('file://' + file);
  var ok = await page.evaluate(function (pal) {
    if (!window.SCENE3D || !SCENE3D.supported()) return 'no webgl';
    window.SC = SCENE3D.init(document.getElementById('scene'), { lantern: 8, items: ['moss', 'crate', 'candle', 'blanket', 'board', 'shelf', 'curtain'], weather: 'clear', hour: 14, palette: pal, look: { pixelSize: 2 } });
    return 'ok';
  }, PALETTE);
  if (ok !== 'ok') { console.error(ok); process.exit(1); }
  await page.waitForTimeout(600);
  await page.evaluate(function () { SC.pause(); SC.setOctState('idle'); SC.jumpTo('center'); for (var i = 0; i < 6; i++) SC.debugStep(0.1); });
  var p0 = await page.evaluate(function () { return SC.renderer.info.programs.length; });

  async function shot(name) { var f = path.join(OUT, name); await page.locator('#scene').screenshot({ path: f }); var u = uniq(f); console.log('  📷 ' + name + '  (고유 색 ' + u + ')'); if (u > 62) fails.push(name + ' 고유 색 ' + u + ' > 62'); return f; }
  async function crop(name, cx, cy) {   /* 캐릭터 둘레 CROP×CROP CSS px (원점은 아트 픽셀 배수) */
    var r = await page.evaluate(function () { return document.querySelector('#scene canvas').getBoundingClientRect(); });
    var x = Math.round(Math.max(0, Math.min(W - CROP, cx - CROP / 2)) / 2) * 2, y = Math.round(Math.max(0, Math.min(H - CROP, cy - CROP / 2)) / 2) * 2;
    var f = path.join(OUT, name); await page.screenshot({ path: f, clip: { x: x, y: y, width: CROP, height: CROP } }); console.log('  📷 ' + name); return f;
  }
  function plScreen() { return page.evaluate(function () { var p = SC.player(); return SC.screenOf(p.at[0], 0.65, p.at[2]); }); }

  /* 1. 다락 쉬는 자리 (낮) + 2× 크롭 */
  var a = await page.evaluate(function () { return { pl: SC.player(), stats: SC.stats() }; });
  console.log('attic:', JSON.stringify(a.pl), 'calls', a.stats.calls, 'programs', a.stats.programs);
  if (a.pl.place !== 'attic' || !a.pl.visible || a.pl.walking) fails.push('다락 시작: 내 캐릭터가 다락 쉬는 자리에 보여야 한다 ' + JSON.stringify(a.pl));
  if (a.stats.calls > 150) fails.push('다락 드로우콜 ' + a.stats.calls + ' > 150');
  await shot('pl-attic-day.png');
  await page.evaluate(function () { SC.zoomStep(6); for (var i = 0; i < 3; i++) SC.debugStep(0.1); });
  var c = await plScreen(); await crop('pl-attic-close.png', c.x, c.y);
  await page.evaluate(function () { SC.zoomStep(0); SC.setTime(22.5, true); for (var i = 0; i < 3; i++) SC.debugStep(0.1); });
  await shot('pl-attic-night.png');
  await page.evaluate(function () { SC.setTime(14, true); for (var i = 0; i < 3; i++) SC.debugStep(0.1); });

  /* 2. 문 톡 → 걷기 스트립 (walkFirst): 문은 걷는 동안 닫혀 있어야 한다 */
  await page.evaluate(function () { window.__res = null; window.__ev = []; SC.goRoom('play', { walkFirst: true, onDoor: function (e) { __ev.push(e.act + '@' + SC.view()); } }).then(function (r) { __res = r; }); });
  var frames = [], walkLog = [];
  for (var i = 0; i < FRAMES; i++) {
    var m = await page.evaluate(function (dt) { SC.debugStep(dt); var p = SC.player(), mo = SC.motion(); return { pl: p, door: mo.doorAttic, dq: mo.dq, scr: SC.screenOf(p.at[0], 0.65, p.at[2]) }; }, STEP);
    walkLog.push({ at: m.pl.at, walking: m.pl.walking, frame: m.pl.frame, yaw: m.pl.yaw, door: m.door });
    if (!m.pl.walking && !walkLog.some(function (w, j) { return j < walkLog.length - 1 && !w.walking; })) await shot('pl-attic-door.png');
    var x = Math.round(Math.max(0, Math.min(W - CROP, m.scr.x - CROP / 2)) / 2) * 2, y = Math.round(Math.max(0, Math.min(H - CROP, m.scr.y - CROP / 2)) / 2) * 2;
    frames.push(await page.screenshot({ clip: { x: x, y: y, width: CROP, height: CROP } }));
  }
  fs.writeFileSync(path.join(OUT, 'pl-walk-strip.png'), strip(frames)); console.log('  📷 pl-walk-strip.png');
  console.log('walk:', JSON.stringify(walkLog.map(function (w) { return [w.at[0], w.at[2], w.walking ? 'w' + w.frame : '-', w.yaw, w.door]; })));
  if (!walkLog.some(function (w) { return w.walking; })) fails.push('walkFirst: 내 캐릭터가 걸어야 한다');
  if (walkLog.some(function (w) { return w.walking && w.door > 0; })) fails.push('걷는 동안 문이 열렸다');
  var fr = walkLog.filter(function (w) { return w.walking; }).map(function (w) { return w.frame; });
  if (!(fr.indexOf(1) >= 0 && fr.indexOf(3) >= 0)) fails.push('걸음 4프레임 중 왼발(1) · 오른발(3) 이 모두 나와야 한다 ' + JSON.stringify(fr));
  var dw = walkLog.filter(function (w) { return !w.walking; });
  if (!dw.length || Math.abs(dw[0].yaw - 90) > 0.5) fails.push('문 앞에 도착해 문(+x) 을 봐야 한다 ' + JSON.stringify(dw[0]));
  if (!walkLog.some(function (w) { return !w.walking && w.door > 0; })) fails.push('걷기가 끝난 뒤 문이 열려야 한다 (24 칸 안)');
  /* 문 열림 → 전환 → 닫힘 → 쉬는 자리까지 */
  var res = null, guard = 0;
  while (guard++ < 80 && !res) res = await page.evaluate(function () { SC.debugStep(0.1); return __res; });
  var atDoor = await page.evaluate(function () { return { pl: SC.player(), ev: __ev, res: __res, view: SC.view() }; });
  console.log('arrived:', JSON.stringify(atDoor));
  if (!atDoor.res || !atDoor.res.ok || atDoor.view !== 'play') fails.push('goRoom(play, walkFirst) 가 ok 로 풀려야 한다 ' + JSON.stringify(atDoor.res));
  if (atDoor.pl.place !== 'play' || atDoor.pl.group !== 'play') fails.push('놀이방 도착: 내 캐릭터가 놀이방 그룹에 ' + JSON.stringify(atDoor.pl));
  for (i = 0; i < 25; i++) await page.evaluate(function () { SC.debugStep(0.1); });
  var b = await page.evaluate(function () { return { pl: SC.player(), stats: SC.stats() }; });
  console.log('play:', JSON.stringify(b.pl), 'calls', b.stats.calls, 'programs', b.stats.programs);
  if (b.pl.walking || b.pl.pending || Math.abs(b.pl.at[0] - 0.15) > 0.01 || Math.abs(b.pl.at[2] - 0.45) > 0.01) fails.push('놀이방 쉬는 자리에 서 있어야 한다 ' + JSON.stringify(b.pl));
  if (b.stats.calls > 60) fails.push('놀이방 드로우콜 ' + b.stats.calls + ' > 60');
  if (b.stats.programs !== p0) fails.push('셰이더 프로그램 수가 늘었다 ' + p0 + ' → ' + b.stats.programs);
  await shot('pl-play-day.png');
  await page.evaluate(function () { SC.zoomStep(6); for (var i = 0; i < 3; i++) SC.debugStep(0.1); });
  c = await plScreen(); await crop('pl-play-close.png', c.x, c.y);
  await page.evaluate(function () { SC.zoomStep(0); for (var i = 0; i < 3; i++) SC.debugStep(0.1); });

  /* 3. 돌아오기: 놀이방 문 앞까지 걷고 → 다락 → 쉬는 자리 */
  await page.evaluate(function () { window.__res = null; SC.goRoom('attic', { walkFirst: true }).then(function (r) { __res = r; }); });
  res = null; guard = 0;
  while (guard++ < 120 && !res) res = await page.evaluate(function () { SC.debugStep(0.1); return __res; });
  for (i = 0; i < 25; i++) await page.evaluate(function () { SC.debugStep(0.1); });
  var d = await page.evaluate(function () { return { pl: SC.player(), res: __res, view: SC.view(), programs: SC.renderer.info.programs.length }; });
  console.log('back:', JSON.stringify(d));
  if (!d.res || !d.res.ok || d.view !== 'attic' || d.pl.place !== 'attic' || d.pl.walking || Math.abs(d.pl.at[0] - 1.65) > 0.01) fails.push('다락으로 돌아와 쉬는 자리에 ' + JSON.stringify(d));
  if (d.programs !== p0) fails.push('왕복 뒤 프로그램 수 ' + p0 + ' → ' + d.programs);
  /* 4. 모션 감소: 걷기 없이 바로 */
  await page.evaluate(function () { SC.setReducedMotion(true); window.__res = null; window.__walked = false; SC.goRoom('play', { walkFirst: true }).then(function (r) { __res = r; }); });
  for (i = 0; i < 12; i++) await page.evaluate(function () { SC.debugStep(0.1); if (SC.player().walking) window.__walked = true; });   /* 걷기 Promise 는 마이크로태스크라 evaluate 사이에 풀린다 */
  var rm = await page.evaluate(function () { return { walked: __walked, res: __res, pl: SC.player(), view: SC.view() }; });
  console.log('reduced:', JSON.stringify(rm));
  if (rm.walked || !rm.res || !rm.res.ok || rm.view !== 'play' || rm.pl.walking) fails.push('모션 감소: 걷기 없이 바로 ' + JSON.stringify(rm));

  console.log('errors:', errs.length ? errs : 'none');
  fails.forEach(function (f) { console.error('  FAIL ' + f); });
  await browser.close();
  console.log(fails.length ? fails.length + ' failed' : 'all ok', '· shots → ' + OUT);
  process.exit(errs.length || fails.length ? 1 : 0);
})();
