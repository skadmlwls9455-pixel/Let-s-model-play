#!/usr/bin/env node
/* tools/evidence3d.js — 3D 장면 증거 스크린샷 (360×740 @2x, SwiftShader 로 WebGL 강제) + 팔레트 순도 검사.
 *   node tools/evidence3d.js            # → tests/evidence/3d-*.png
 * 장면 6장: 등불0 밤 · 등불4 낮 · 등불8 맑은 밤(별) · 쓰다듬기 · 외출(빈 방) · 다크 UI(전체 페이지).
 * 순도: 3d-lantern4-day.png 의 고유 색 수 ≤ 70 (팔레트 57 + 컨테이너 배경 + 오버레이 글자) — 넘으면 exit 1.
 * 콘솔/페이지 에러가 하나라도 있으면 exit 1. 드로우콜은 APP.scene.stats() 로 찍는다.
 */
'use strict';
var fs = require('fs'), path = require('path'), zlib = require('zlib');
var { chromium } = require('playwright');
var ROOT = path.resolve(__dirname, '..');
var INDEX = 'file://' + path.join(ROOT, 'index.html');
var OUT = process.env.EVIDENCE || path.join(ROOT, 'tests/evidence');
fs.mkdirSync(OUT, { recursive: true });

/* 최소 PNG 디코더 (8-bit RGB/RGBA, 비인터레이스) → 고유 색 수 */
function pngUniqueColors(file) {
  var buf = fs.readFileSync(file), pos = 8, w = 0, h = 0, ctype = 0, idat = [];
  while (pos < buf.length) {
    var len = buf.readUInt32BE(pos), type = buf.toString('ascii', pos + 4, pos + 8), data = buf.slice(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); if (data[8] !== 8 || data[12] !== 0) throw new Error('png: 8-bit non-interlaced only'); ctype = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  var bpp = ctype === 6 ? 4 : ctype === 2 ? 3 : 0; if (!bpp) throw new Error('png: colour type ' + ctype);
  var raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * bpp, prev = Buffer.alloc(stride), cur = Buffer.alloc(stride), set = new Set();
  for (var y = 0; y < h; y++) {
    var f = raw[y * (stride + 1)], off = y * (stride + 1) + 1;
    for (var i = 0; i < stride; i++) {
      var x = raw[off + i], a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0, v;
      if (f === 0) v = x; else if (f === 1) v = x + a; else if (f === 2) v = x + b; else if (f === 3) v = x + ((a + b) >> 1);
      else { var p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      cur[i] = v & 255;
    }
    for (var px = 0; px < w; px++) set.add((cur[px * bpp] << 16) | (cur[px * bpp + 1] << 8) | cur[px * bpp + 2]);
    var t = prev; prev = cur; cur = t;
  }
  return set.size;
}

var WIKI_OK = { query: { pages: { '1': { pageid: 1, title: '모자', extract: '모자는 머리에 쓰는 물건이다. 햇빛과 추위를 막고 신분을 나타내기도 했다.', links: [{ ns: 0, title: '깃털' }, { ns: 0, title: '밀짚' }] } } } };

(async function () {
  var browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, locale: 'ko-KR', colorScheme: 'light' });
  var page = await ctx.newPage(), errs = [], infos = [];
  page.on('pageerror', function (e) { errs.push('pageerror: ' + e.message); });
  page.on('console', function (m) { var t = m.text(); if (m.type() === 'error' && !/Failed to load resource|net::|ERR_/.test(t)) errs.push('console.error: ' + t); if (/\[scene3d\]/.test(t)) infos.push(t); });
  await page.route('https://ko.wikipedia.org/**', function (route) { return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(WIKI_OK) }); });
  await page.goto(INDEX);
  await page.waitForSelector('#name-dialog[open]');
  await page.fill('#name-in', '뚜루'); await page.click('#name-form button[type=submit]');
  await page.waitForSelector('#name-dialog[open]', { state: 'hidden' });
  await page.waitForTimeout(800);
  var mode = await page.evaluate(function () { return APP.sceneMode; });
  if (mode !== '3d') { console.error('3D 모드가 아님 (' + mode + ') — WebGL 강제 실패'); process.exit(1); }

  async function scene(name, hour, weather, lantern, extra) {
    await page.evaluate(function (a) {
      APP.state.room.lantern = a.lantern; APP.renderScene(); APP.renderSouvenirs(); APP.renderWall();
      APP.scene.setTime(a.hour, true); APP.scene.setWeather(a.weather); APP.scene.bubble('', 0);
      if (a.extra === 'pet') APP.octState('pet');
      if (a.extra === 'away') APP.octState('away');
      if (a.extra === 'idle') APP.octState('idle');
    }, { hour: hour, weather: weather, lantern: lantern, extra: extra || '' });
    await page.waitForTimeout(700);
    await page.locator('#scene').screenshot({ path: path.join(OUT, name) });
    console.log('  📷 ' + name + '  (hour ' + hour + ', ' + weather + ', lantern ' + lantern + (extra ? ', ' + extra : '') + ')');
  }
  /* 포스터·기념품이 생기게 외출 두 번 (건너뛰기) */
  for (var i = 0; i < 2; i++) {
    await page.fill('#hint-in', i ? '깃털' : '모자의 역사'); await page.click('#btn-go');
    await page.waitForSelector('#btn-skip:not([hidden])', { timeout: 10000 }); await page.waitForTimeout(200); await page.click('#btn-skip');
    await page.waitForFunction(function () { var b = document.getElementById('btn-go'); return b && !b.disabled; }, null, { timeout: 40000 });
  }
  await page.evaluate(function () { APP.state.room.souvenirs.push({ id: Object.keys(WORLD.souvenirs)[0], tripId: APP.state.trips[0].id, at: Date.now() }, { id: Object.keys(WORLD.souvenirs)[1], tripId: APP.state.trips[0].id, at: Date.now() }); });
  await page.evaluate(function () { APP.octState('idle'); APP.scene.jumpTo('center'); });

  await scene('3d-lantern0-night.png', 22.5, 'rain', 0, 'idle');
  await scene('3d-lantern4-day.png', 13.0, 'rain', 4, 'idle');
  await scene('3d-lantern8-night-clear.png', 23.0, 'clear', 8, 'idle');
  await scene('3d-pet.png', 13.0, 'rain', 4, 'pet');
  await scene('3d-away.png', 18.0, 'drizzle', 6, 'away');
  await page.evaluate(function () { APP.octState('idle'); APP.scene.setTime(21.0, true); APP.scene.setWeather('rain'); });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, '3d-dark-ui.png') });
  console.log('  📷 3d-dark-ui.png  (full page, dark scheme, hour 21)');

  var stats = await page.evaluate(function () { return APP.scene.stats(); });
  var uniq = pngUniqueColors(path.join(OUT, '3d-lantern4-day.png'));
  var uniqN = pngUniqueColors(path.join(OUT, '3d-lantern8-night-clear.png'));
  console.log('stats:', JSON.stringify(stats));
  console.log('palette purity: 3d-lantern4-day.png unique colours = ' + uniq + ' (limit 70, palette ' + stats.palette + ') → ' + (uniq <= 70 ? 'ok' : 'FAIL'));
  console.log('                3d-lantern8-night-clear.png unique colours = ' + uniqN);
  console.log('draw calls:', stats.calls, stats.calls <= 150 ? '(≤150 ok)' : '(OVER 150)');
  infos.forEach(function (t) { console.log('  ' + t); });
  console.log('errors:', errs.length ? errs : 'none');
  await browser.close();
  process.exit(errs.length || uniq > 70 || stats.calls > 150 ? 1 : 0);
})();
