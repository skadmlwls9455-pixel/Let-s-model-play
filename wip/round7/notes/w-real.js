/* 진짜 폰 비율 (412×915 @2.625) 에서 빠른 이동 칩 그림이 정수 기기 px 인가 */
var path = require('path'), { chromium } = require('playwright');
var ROOT = path.resolve(__dirname, '../../..'), OUT = process.argv[2];
(async function () {
  var browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--force-device-scale-factor=2.625', '--window-size=412,915'] });
  var ctx = await browser.newContext({ viewport: null, locale: 'ko-KR' });
  var page = await ctx.newPage();
  page.on('pageerror', function (e) { console.log('PAGEERROR ' + e.message); });
  var RED = '#e0564b', BORN = '2026-11-06T10:00:00.000Z', REC = { v: 2, octopus: { name: '뚜루', born: BORN, trips: 0, invites: 8, days: ['2026-11-06', '2026-11-07', '2026-11-08'], affinity: {}, visits: {}, state: 'idle', color: RED, colors: [{ at: BORN, date: '2026-11-06', color: RED, how: 'first', by: 'player' }] }, room: { lantern: 8, souvenirs: [], posterOrder: [] }, trips: [], notes: {}, curiosityNotes: [], salon: { asks: [] }, settings: { motion: 'auto', thumbs: true, lastSeen: 1762650000000, octColor: RED, flipped: false, pixelFont: true, albumSeen: 0 } };
  await page.addInitScript({ content: 'if (!localStorage.getItem("__seed")) { localStorage.setItem("__seed", "1"); localStorage.setItem("ppolppol_v2", ' + JSON.stringify(JSON.stringify(REC)) + '); } window.__ppolAwakeMs = 0; window.__ppolTest = { today: "2026-11-14" }; window.__ppolLook = { hour: 13, weather: "clear" };' });
  await page.goto('file://' + ROOT + '/index.html?dev=0&intro=0');
  await page.waitForSelector('#btn-go:not(.away)', { timeout: 30000 });
  await page.evaluate(function () { return APP.goRoom('yard'); });
  await page.waitForFunction(function () { var m = APP.scene.motion(); return APP.room === 'yard' && !m.trans && m.dq === ''; }, null, { timeout: 30000 });
  await page.waitForTimeout(600);
  var info = await page.evaluate(function () {
    var sc = APP.scene, K = Math.SQRT1_2; sc.debugPlayerAt(38 * K, 38 * K); sc.wideFocus(); sc.debugSim(0.1, 3); sc.debugStep(0.1);
    APP.travelOpen(1, document.getElementById('btn-sign-1'), false);
    var d = document.getElementById('travel-pick'), dpr = devicePixelRatio;
    return { dpr: dpr, vw: innerWidth, vh: innerHeight, chips: Array.prototype.map.call(d.querySelectorAll('button:not([hidden])'), function (b) { var r = b.getBoundingClientRect(), c = b.querySelector('canvas').getBoundingClientRect(); return [b.getAttribute('aria-label'), r.left * dpr, r.top * dpr, r.width * dpr, c.left * dpr, c.top * dpr, c.width * dpr]; }) };
  });
  console.log(JSON.stringify(info));
  await page.screenshot({ path: path.join(OUT, 'real-travel.png') });
  await browser.close();
})().catch(function (e) { console.error(e); process.exit(1); });
