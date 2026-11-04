#!/usr/bin/env node
/* tools/look-shots.js — 룩 루프 고정 앵글 스크린샷 (docs/LOOK_LOOP.md). SwiftShader 로 WebGL 강제, 360×740 @2x.
 *   node tools/look-shots.js <pass> [palette] [yaw]   # → tests/evidence/look/<pass>-{day,night,close}.png + 메트릭. palette = ramps | apollo | endesga64 | resurrect64 (생략 = 기본값)
 *   yaw(룩 패스 5, 선택) = 시점 각도 −25~25 (9° 스냅). 0 이 아니면 파일명이 <pass>-y<yaw>-{day,night,close}.png 가 되어 요 0° 샷과 나란히 심 두께(look-metrics 의 lines)를 비교할 수 있다.
 * 고정 조건: window.__ppolLook = { hour, lantern: 8, weather: 'rain', octState: 'idle', anchor: 'center', palette? } (APP 이 있을 때만 읽는다).
 *   day   = 14:00, p=2 · night = 22:00, p=2 · close = 14:00, p=2 + 줌 ×2 (문어 중심). (룩 패스 8 부터 기본 p=2; 환경변수 LOOK_P=3 으로 예전 조건)
 * 콘솔/페이지 에러가 있으면 exit 1.
 */
'use strict';
var fs = require('fs'), path = require('path');
var { chromium } = require('playwright');
var LM = require('./look-metrics.js');
var ROOT = path.resolve(__dirname, '..');
var INDEX = 'file://' + path.join(ROOT, 'index.html');
var PASS = String(process.argv[2] || '0').replace(/[^A-Za-z0-9_-]/g, '');
var PALETTE = process.argv[3] ? String(process.argv[3]).replace(/[^A-Za-z0-9_]/g, '') : '';   /* 룩 패스 3: 'ramps' | 'apollo' | 'endesga64' | 'resurrect64' (생략 = settings.palette 기본값) */
var YAW = process.argv[4] != null ? Math.max(-25, Math.min(25, +process.argv[4] || 0)) : 0;   /* 룩 패스 5: 요 스텝 떨림 검사용 (예: 9) */
var TAG = PASS + (YAW ? '-y' + YAW : '');
var OUT = process.env.LOOK_OUT || path.join(ROOT, 'tests/evidence/look');
fs.mkdirSync(OUT, { recursive: true });

var HOOK = { hour: 14, lantern: 8, weather: 'rain', octState: 'idle', anchor: 'center' };
if (PALETTE) HOOK.palette = PALETTE;
var WIKI_OK = { query: { pages: { '1': { pageid: 1, title: '모자', extract: '모자는 머리에 쓰는 물건이다. 햇빛과 추위를 막고 신분을 나타내기도 했다.', links: [{ ns: 0, title: '깃털' }, { ns: 0, title: '밀짚' }] } } } };

(async function () {
  var browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, locale: 'ko-KR', colorScheme: 'light' });
  var page = await ctx.newPage(), errs = [], infos = [];
  page.on('pageerror', function (e) { errs.push('pageerror: ' + e.message); });
  page.on('console', function (m) { var t = m.text(); if (m.type() === 'error' && !/Failed to load resource|net::|ERR_/.test(t)) errs.push('console.error: ' + t); if (/\[scene3d\]/.test(t)) infos.push(t); });
  await page.route('https://ko.wikipedia.org/**', function (route) { return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(WIKI_OK) }); });
  await page.addInitScript(function (h) { window.__ppolLook = h; }, HOOK);
  await page.goto(INDEX);
  await page.waitForSelector('#name-dialog[open]');
  await page.fill('#name-in', '뚜루'); await page.click('#name-form button[type=submit]');
  await page.waitForSelector('#name-dialog[open]', { state: 'hidden' });
  await page.waitForTimeout(800);
  var mode = await page.evaluate(function () { return APP.sceneMode; });
  if (mode !== '3d') { console.error('3D 모드가 아님 (' + mode + ') — WebGL 강제 실패'); process.exit(1); }

  /* 포스터·기념품이 생기게 외출 두 번 (건너뛰기) — 보드/선반이 빈 채로 찍히지 않게 */
  for (var i = 0; i < 2; i++) {
    await page.fill('#hint-in', i ? '깃털' : '모자의 역사'); await page.click('#btn-go');
    await page.waitForSelector('#btn-skip:not([hidden])', { timeout: 10000 }); await page.waitForTimeout(200); await page.click('#btn-skip');
    await page.waitForFunction(function () { var b = document.getElementById('btn-go'); return b && !b.disabled; }, null, { timeout: 40000 });
  }
  await page.evaluate(function () {
    var ids = Object.keys(WORLD.souvenirs), tid = APP.state.trips[0].id;
    APP.state.room.souvenirs.push({ id: ids[0], tripId: tid, at: Date.now() }, { id: ids[1], tripId: tid, at: Date.now() });
    APP.renderSouvenirs();
  });

  async function shot(name, hour, look) {
    await page.evaluate(function (a) {
      APP.octState(a.hook.octState); APP.scene.jumpTo(a.hook.anchor);
      APP.state.room.lantern = a.hook.lantern; APP.renderScene(); APP.renderWall();
      APP.scene.setTime(a.hour, true); APP.scene.setWeather(a.hook.weather); APP.scene.bubble('', 0);
      APP.scene.setLook(a.look);
    }, { hook: HOOK, hour: hour, look: look });
    await page.waitForTimeout(900);
    var file = path.join(OUT, TAG + '-' + name + '.png');
    await page.locator('#scene').screenshot({ path: file });
    var m = LM.metrics(file, { px: look.pixelSize * 2 });   /* deviceScaleFactor 2 → 아트 픽셀 = p × 2 PNG px */
    console.log('  📷 ' + path.relative(ROOT, file) + '  (hour ' + hour + ', p=' + look.pixelSize + ', zoom step ' + look.zoom + ', yaw ' + look.yaw + ', palette ' + pal + ') → colours ' + m.colours + ' · edge ' + m.edgePct + '% · luma ' + m.meanLuma + ' · flat-noise ' + m.flatNoise + ' · speckles ' + m.speckles + ' (' + m.specklePerMille + '‰) · lines 1px ' + m.thinLines + ' / 2px ' + m.thickLines + ' (thick ' + m.thickPct + '%)');
    return m;
  }
  var pal = await page.evaluate(function () { return APP.scene.paletteName ? APP.scene.paletteName() : '?'; });
  if (PALETTE && pal !== PALETTE) { console.error('팔레트가 적용되지 않음: 요청 ' + PALETTE + ' / 실제 ' + pal); process.exit(1); }
  var base = { pixelSize: +process.env.LOOK_P || 2, zoom: 0, dither: 0.25, outline: true, yaw: YAW, focus: null };   /* 룩 패스 8: 기본 p=2 (LOOK_P=3 으로 예전 조건) */
  var res = {};
  res.day = await shot('day', 14, base);
  res.night = await shot('night', 22, base);
  res.close = await shot('close', 14, Object.assign({}, base, { pixelSize: 2, zoom: 3, focus: 'oct' }));
  await page.evaluate(function (b) { APP.scene.setLook(b); }, base);
  var stats = await page.evaluate(function () { return APP.scene.stats(); });
  console.log('stats:', JSON.stringify(stats));
  infos.forEach(function (t) { console.log('  ' + t); });
  console.log('errors:', errs.length ? errs : 'none');
  console.log('log row: | ' + PASS + ' | … | … | … | ' + ['day', 'night', 'close'].map(function (k) { return 'look/' + TAG + '-' + k + '.png'; }).join(' ') + ' |');
  await browser.close();
  process.exit(errs.length ? 1 : 0);
})();
