#!/usr/bin/env node
/* tools/portrait-shots.js — 룩 패스 8(문어 표정·초상) 증거 (DESIGN §15.2, docs/SCENE.md "초상·표정"). SwiftShader, 360×740 @2x, look-shots 와 같은 고정 조건.
 *   node tools/portrait-shots.js [palette]   # → tests/evidence/look/portraits.png · tests/evidence/look/actions-strip.png · tests/evidence/portrait-<expr>.png ×8
 *   portraits.png  = 표정 8 (idle blink happy pet sleep curious calm sleepy) 의 `APP.scene.portraitURL(expr, { bg: 'navy' })` 64×64 를 ×3 (192 px) 으로 나란히.
 *   actions-strip  = `happy` 상태의 장면 6프레임 (프레임당 0.15 s = debugStep 0.1 + 0.05, 합 0.9 s: 폴짝 2번 + 꼭대기 다리 벌림), 문어 주변 120×120 CSS px 크롭 (look-strip 과 같은 격자 정렬).
 *   검사: 초상마다 고유 색 ≤ 24 (팔레트 스냅) · 두 번째 호출이 캐시를 쓰는지(portraitN 불변) · 콘솔/페이지 에러 0. 실패하면 exit 1.
 */
'use strict';
var fs = require('fs'), path = require('path'), zlib = require('zlib');
var { chromium } = require('playwright');
var LM = require('./look-metrics.js');
var ROOT = path.resolve(__dirname, '..');
var INDEX = 'file://' + path.join(ROOT, 'index.html');
var PALETTE = process.argv[2] ? String(process.argv[2]).replace(/[^A-Za-z0-9_]/g, '') : 'apollo';
var OUT = process.env.LOOK_OUT || path.join(ROOT, 'tests/evidence/look'), EVID = path.join(ROOT, 'tests/evidence');
fs.mkdirSync(OUT, { recursive: true });
var HOOK = { hour: 14, lantern: 8, weather: 'rain', octState: 'idle', anchor: 'center', palette: PALETTE };
var EXPRS = ['idle', 'blink', 'happy', 'pet', 'sleep', 'curious', 'calm', 'sleepy'];
var SCALE = 3, CROP = 120, DPR = 2, FRAMES = 6, DT = 0.15, MAX_COLOURS = 24;

/* 최소 PNG 인코더 (RGBA, 필터 0) — look-strip 과 같음 */
var CRC = (function () { var t = new Int32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
function crc32(buf) { var c = -1; for (var i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(type, data) { var len = Buffer.alloc(4); len.writeUInt32BE(data.length); var td = Buffer.concat([Buffer.from(type, 'ascii'), data]); var crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function encodePNG(w, h, rgba) {
  var raw = Buffer.alloc((w * 4 + 1) * h);
  for (var y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  var ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function decodeBuf(buf) { var tmp = path.join(OUT, '.tmp-portrait.png'); fs.writeFileSync(tmp, buf); var im = LM.decodePNG(tmp); fs.unlinkSync(tmp); return im; }
/* 이미지들을 가로로 붙인다 (scale 배 Nearest 확대, 사이 2px 검정) */
function strip(imgs, scale) {
  var w = imgs[0].w * scale, h = imgs[0].h * scale, gap = 2, W = w * imgs.length + gap * (imgs.length - 1), out = Buffer.alloc(W * h * 4);
  for (var f = 0; f < imgs.length; f++) for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
    var im = imgs[f], si = (Math.floor(y / scale) * im.w + Math.floor(x / scale)) * im.bpp, di = (y * W + f * (w + gap) + x) * 4;
    out[di] = im.px[si]; out[di + 1] = im.px[si + 1]; out[di + 2] = im.px[si + 2]; out[di + 3] = 255;
  }
  return encodePNG(W, h, out);
}
function uniqueColours(im) { var set = {}; for (var i = 0; i < im.w * im.h; i++) set[im.px[i * im.bpp] + ',' + im.px[i * im.bpp + 1] + ',' + im.px[i * im.bpp + 2]] = 1; return Object.keys(set).length; }

(async function () {
  var browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: DPR, locale: 'ko-KR', colorScheme: 'light' });
  var page = await ctx.newPage(), errs = [], fails = 0;
  page.on('pageerror', function (e) { errs.push('pageerror: ' + e.message); });
  page.on('console', function (m) { var t = m.text(); if (m.type() === 'error' && !/Failed to load resource|net::|ERR_/.test(t)) errs.push('console.error: ' + t); });
  await page.route('https://ko.wikipedia.org/**', function (route) { return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"query":{"pages":{}}}' }); });
  await page.addInitScript(function (h) { window.__ppolLook = h; }, HOOK);
  await page.goto(INDEX);
  await page.waitForSelector('#name-dialog[open]');
  await page.fill('#name-in', '뚜루'); await page.click('#name-form button[type=submit]');
  await page.waitForSelector('#name-dialog[open]', { state: 'hidden' });
  await page.waitForTimeout(800);
  var mode = await page.evaluate(function () { return APP.sceneMode; });
  if (mode !== '3d') { console.error('3D 모드가 아님 (' + mode + ') — WebGL 강제 실패'); process.exit(1); }
  await page.evaluate(function (a) {
    APP.octState(a.hook.octState); APP.scene.jumpTo(a.hook.anchor);
    APP.state.room.lantern = a.hook.lantern; APP.renderScene(); APP.renderWall();
    APP.scene.setTime(a.hour, true); APP.scene.setWeather(a.hook.weather); APP.scene.bubble('', 0);
    APP.scene.setLook({ pixelSize: 3, zoom: 0, dither: 0.25, outline: true, yaw: 0, focus: null });
  }, { hook: HOOK, hour: 14 });
  await page.waitForTimeout(900);
  var pal = await page.evaluate(function () { return APP.scene.paletteName(); });
  if (pal !== PALETTE) { console.error('팔레트가 적용되지 않음: 요청 ' + PALETTE + ' / 실제 ' + pal); process.exit(1); }

  /* 1. 초상 8 */
  var imgs = [], ms = [];
  for (var i = 0; i < EXPRS.length; i++) {
    var r = await page.evaluate(function (e) {
      var url = APP.scene.portraitURL(e, { bg: 'navy' }), s1 = APP.scene.stats();
      APP.scene.portraitURL(e, { bg: 'navy' }); var s2 = APP.scene.stats();   /* 두 번째 호출 = 캐시 */
      var cv = APP.scene.portrait(e, { bg: 'navy' });
      return { url: url, ms: s1.portraitMs, n1: s1.portraitN, n2: s2.portraitN, w: cv.width, h: cv.height, sceneExpr: APP.scene.expression() };
    }, EXPRS[i]);
    var buf = Buffer.from(r.url.replace(/^data:image\/png;base64,/, ''), 'base64'), im = decodeBuf(buf), nc = uniqueColours(im);
    fs.writeFileSync(path.join(EVID, 'portrait-' + EXPRS[i] + '.png'), buf);
    var okC = nc <= MAX_COLOURS, okCache = r.n1 === r.n2, okSize = r.w === 64 && r.h === 64 && im.w === 64 && im.h === 64;
    if (!okC || !okCache || !okSize) fails++;
    console.log('  🙂 ' + EXPRS[i].padEnd(8) + ' portrait-' + EXPRS[i] + '.png  ' + im.w + '×' + im.h + ' · colours ' + nc + (okC ? '' : ' (OVER ' + MAX_COLOURS + ')') + ' · render ' + r.ms + ' ms · cache ' + (okCache ? 'hit' : 'MISS') + ' · scene expr after: ' + r.sceneExpr);
    imgs.push(im); ms.push(r.ms);
  }
  var pfile = path.join(OUT, 'portraits.png');
  fs.writeFileSync(pfile, strip(imgs, SCALE));
  console.log('  🎞 ' + path.relative(ROOT, pfile) + '  (8 × 64 px → ×' + SCALE + ' = 192 px, 순서 ' + EXPRS.join(' ') + ') · render ms ' + ms.join(' ') + ' · max ' + Math.max.apply(null, ms));

  /* 2. happy 동작 스트립: 루프를 멈추고 happy → dt 0.15 s 6프레임 (폴짝 2 + 꼭대기 다리 벌림) */
  var box = await page.locator('#scene').boundingBox(), cbox = await page.locator('#scene canvas').boundingBox();
  var centre = await page.evaluate(function () { var a = APP.scene.anchors.center; return APP.scene.screenOf(a[0], 0.5, a[2]); });
  var cx = centre.x + box.x - cbox.x, cy = centre.y + box.y - cbox.y;
  var clip = { x: cbox.x + Math.max(0, Math.min(cbox.width - CROP, Math.floor((cx - CROP / 2) / 3) * 3)), y: cbox.y + Math.max(0, Math.min(cbox.height - CROP, Math.floor((cy - CROP / 2) / 3) * 3)), width: CROP, height: CROP };
  await page.evaluate(function () { APP.scene.pause(); APP.octState('happy'); });
  var frames = [], motion = [];
  for (var f = 0; f < FRAMES; f++) {
    if (f === 0) await page.evaluate(function (d) { APP.scene.debugStep(d / 2); }, DT);   /* 첫 프레임은 반 스텝 → 프레임이 오르는 중·꼭대기·내리는 중에 떨어진다 */
    else await page.evaluate(function (d) { APP.scene.debugStep(0.1); APP.scene.debugStep(d - 0.1); }, DT);   /* frame() 이 dt 를 0.1 s 로 자르므로 두 번에 나눠 0.15 s */
    await page.waitForTimeout(40);
    frames.push(decodeBuf(await page.screenshot({ clip: clip })));
    motion.push(await page.evaluate(function () { var m = APP.scene.motion(); return m.expr + ' hop ' + m.hop + ' arm×' + m.armX; }));
  }
  await page.evaluate(function () { APP.octState('idle'); APP.scene.resume(); });
  var afile = path.join(OUT, 'actions-strip.png');
  fs.writeFileSync(afile, strip(frames, 1));
  console.log('  🎞 ' + path.relative(ROOT, afile) + '  (happy, ' + FRAMES + ' frames × dt ' + DT + ' s, crop ' + CROP + '×' + CROP + ' CSS px @' + DPR + 'x)');
  motion.forEach(function (m, k) { console.log('     frame ' + k + ' t=' + ((k + 0.5) * DT).toFixed(3) + ' s: ' + m); });
  var hops = motion.filter(function (m) { return /hop (0\.0[1-9]|0\.[1-9])/.test(m); }).length, splays = motion.filter(function (m) { return !/arm×1(\.0+)?$/.test(m); }).length;
  if (!hops || !splays) { fails++; console.error('happy 동작이 안 보임 (hop 프레임 ' + hops + ', 다리 벌림 프레임 ' + splays + ')'); }

  var stats = await page.evaluate(function () { return APP.scene.stats(); });
  console.log('stats:', JSON.stringify({ calls: stats.calls, target: stats.target, palette: stats.palette, expr: stats.expr, portraitN: stats.portraitN, portraitCache: stats.portraitCache, portraitMs: stats.portraitMs }));
  console.log('errors:', errs.length ? errs : 'none');
  await browser.close();
  process.exit(errs.length || fails ? 1 : 0);
})();
