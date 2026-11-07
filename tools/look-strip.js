#!/usr/bin/env node
/* tools/look-strip.js — 룩 패스 7(움직임) 프레임 스트립 (docs/LOOK_LOOP.md 레버 7). SwiftShader, 360×740 @2x, look-shots 와 같은 고정 조건.
 *   node tools/look-strip.js <pass> [palette]   # → tests/evidence/look/<pass>-rain-strip.png · <pass>-lantern-strip.png
 * 장면 루프를 멈추고 APP.scene.debugStep(dt) 로 결정적으로 한 프레임씩 진행해 #scene 을 찍고, 창(비)·등불 주변 120×120 CSS px 를 잘라 8장을 나란히 붙인다.
 *   rain    = 12 fps 연속 8프레임 (dt 1/12 s, 0.58 s): 줄기가 스텝마다 정수 px 내려가는지 본다.
 *   lantern = 2 s 를 8장 (dt 1/4 s = 12 fps 프레임 3개씩 건너뜀): 0.35 Hz 진자(주기 2.86 s)의 −1/0/+1 px 스텝이 보인다.
 * 각 프레임 아래 1px 흰 눈금 없음 — 크롭 경계는 원본 아트 픽셀 격자(2 PNG px = 1 아트 px @ p=3)와 일치하도록 짝수로 맞춘다. 콘솔/페이지 에러가 있으면 exit 1.
 */
'use strict';
var fs = require('fs'), path = require('path'), zlib = require('zlib');
var { chromium } = require('playwright');
var LM = require('./look-metrics.js');
var ROOT = path.resolve(__dirname, '..');
var INDEX = 'file://' + path.join(ROOT, 'index.html');
var PASS = String(process.argv[2] || '7').replace(/[^A-Za-z0-9_-]/g, '');
var PALETTE = process.argv[3] ? String(process.argv[3]).replace(/[^A-Za-z0-9_]/g, '') : '';
var OUT = process.env.LOOK_OUT || path.join(ROOT, 'tests/evidence/look');
fs.mkdirSync(OUT, { recursive: true });
var HOOK = { hour: 14, lantern: 8, weather: 'rain', octState: 'idle', anchor: 'center' };
if (PALETTE) HOOK.palette = PALETTE;
var CROP = 120, DPR = 2, FRAMES = 8;

/* 최소 PNG 인코더 (RGBA, 필터 0) */
var CRC = (function () { var t = new Int32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
function crc32(buf) { var c = -1; for (var i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(type, data) { var len = Buffer.alloc(4); len.writeUInt32BE(data.length); var td = Buffer.concat([Buffer.from(type, 'ascii'), data]); var crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function encodePNG(w, h, rgba) {
  var raw = Buffer.alloc((w * 4 + 1) * h);
  for (var y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  var ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
/* 프레임 PNG 들(같은 크기)을 가로로 붙이고 사이에 2px 검정 구분선 */
function strip(frames) {
  var imgs = frames.map(function (b) { var tmp = path.join(OUT, '.tmp-frame.png'); fs.writeFileSync(tmp, b); var im = LM.decodePNG(tmp); fs.unlinkSync(tmp); return im; });
  var w = imgs[0].w, h = imgs[0].h, gap = 2, W = w * imgs.length + gap * (imgs.length - 1), out = Buffer.alloc(W * h * 4);
  for (var f = 0; f < imgs.length; f++) for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
    var si = (y * w + x) * imgs[f].bpp, di = (y * W + f * (w + gap) + x) * 4;
    out[di] = imgs[f].px[si]; out[di + 1] = imgs[f].px[si + 1]; out[di + 2] = imgs[f].px[si + 2]; out[di + 3] = 255;
  }
  return encodePNG(W, h, out);
}

(async function () {
  var browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: DPR, locale: 'ko-KR', colorScheme: 'light' });
  var page = await ctx.newPage(), errs = [];
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
  if (mode !== '3d') { console.error('3D 모드가 아님 (' + mode + ')'); process.exit(1); }
  await page.evaluate(function (a) {
    APP.octState(a.hook.octState); APP.scene.jumpTo(a.hook.anchor);
    APP.state.room.lantern = a.hook.lantern; APP.renderScene(); APP.renderWall();
    APP.scene.setTime(a.hour, true); APP.scene.setWeather(a.hook.weather); APP.scene.bubble('', 0);
    APP.scene.setLook({ pixelSize: 3, zoom: 0, dither: 0.25, outline: true, yaw: 0, focus: null });
  }, { hook: HOOK, hour: 22 });
  await page.waitForTimeout(900);
  var pal = await page.evaluate(function () { return APP.scene.paletteName ? APP.scene.paletteName() : '?'; });
  if (PALETTE && pal !== PALETTE) { console.error('팔레트가 적용되지 않음: 요청 ' + PALETTE + ' / 실제 ' + pal); process.exit(1); }
  /* 크롭 중심: 창 유리 중앙 · 등불 몸체 (월드 → 컨테이너 CSS px). 크롭 원점은 **캔버스** 원점 + 아트 픽셀(p=3 CSS px) 배수로 → 크롭 경계가 아트 픽셀 격자와 일치(look-metrics 의 6×6 블록이 모두 균일) */
  var box = await page.locator('#scene').boundingBox(), cbox = await page.locator('#scene canvas').boundingBox();
  var centers = await page.evaluate(function () { return { win: APP.scene.screenOf(-2.5, 1.65, 0.4), lamp: APP.scene.screenOf(-1.6, 2.2, -0.9) }; });
  function clipOf(c) {
    var cx = c.x + box.x - cbox.x, cy = c.y + box.y - cbox.y;   /* 캔버스 기준 CSS px */
    var x = Math.max(0, Math.min(cbox.width - CROP, Math.floor((cx - CROP / 2) / 3) * 3)), y = Math.max(0, Math.min(cbox.height - CROP, Math.floor((cy - CROP / 2) / 3) * 3));
    return { x: cbox.x + x, y: cbox.y + y, width: CROP, height: CROP };
  }
  var clips = { rain: clipOf(centers.win), lantern: clipOf(centers.lamp) };
  console.log('canvas at ' + JSON.stringify(cbox) + ' · clips ' + JSON.stringify(clips));
  console.log('crop centres (CSS px): window ' + JSON.stringify(centers.win) + ' · lamp ' + JSON.stringify(centers.lamp));
  await page.evaluate(function () { APP.scene.pause(); });
  async function capture(name, dt, n) {
    var frames = [], motion = [];
    for (var f = 0; f < n; f++) {
      await page.evaluate(function (d) { APP.scene.debugStep(d); }, dt);
      await page.waitForTimeout(40);
      frames.push(await page.screenshot({ clip: clips[name] }));
      motion.push(await page.evaluate(function () { var m = APP.scene.motion(); return m.swayPx + '/' + m.rainStep + '/' + (m.shimmer === 1 ? '1' : '.8'); }));
    }
    var file = path.join(OUT, PASS + '-' + name + '-strip.png');
    fs.writeFileSync(file, strip(frames));
    console.log('  🎞 ' + path.relative(ROOT, file) + '  (' + n + ' frames × dt ' + dt.toFixed(4) + ' s, crop ' + CROP + '×' + CROP + ' CSS px @' + DPR + 'x) · swayPx/rainStep/shimmer per frame: ' + motion.join(' '));
  }
  await capture('rain', 1 / 12, FRAMES);
  await page.evaluate(function () { APP.scene.debugStep(0.25); });   /* 등불 스트립 앞에 한 번 더 진행 */
  await capture('lantern', 0.25, FRAMES);
  await page.evaluate(function () { APP.scene.resume(); });
  var stats = await page.evaluate(function () { return APP.scene.stats(); });
  console.log('stats:', JSON.stringify({ calls: stats.calls, target: stats.target, pw: stats.pw }));
  console.log('errors:', errs.length ? errs : 'none');
  await browser.close();
  process.exit(errs.length ? 1 : 0);
})();
