/* 갈래 W 다섯째 바퀴: 문어 집 터 그림 (나무 비우기 · 문 앞 걸음).  node home-shots.js <게임 폴더> <out 접두> [hour]
   숲길 집 둘 (s 15.4) · 광장 집 · 미용실 (s 41.2) 앞에 서서 360×740 으로 찍는다 */
var path = require('path'), { chromium } = require('playwright');
var ROOT = path.resolve(process.argv[2]), OUT = process.argv[3], HOUR = +(process.argv[4] || 13);
(async function () {
  var browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, locale: 'ko-KR', hasTouch: true, isMobile: true });
  var page = await ctx.newPage(); page.on('pageerror', function (e) { console.log('PAGEERROR ' + e.message); });
  var RED = '#e0564b', BORN = '2026-11-06T10:00:00.000Z', REC = { v: 2, octopus: { name: '뚜루', born: BORN, trips: 0, invites: 8, days: ['2026-11-06', '2026-11-07', '2026-11-08'], affinity: {}, visits: {}, state: 'idle', color: RED, colors: [{ at: BORN, date: '2026-11-06', color: RED, how: 'first', by: 'player' }] }, room: { lantern: 8, souvenirs: [], posterOrder: [] }, trips: [], notes: {}, curiosityNotes: [], salon: { asks: [] }, settings: { motion: 'auto', thumbs: true, lastSeen: 1762650000000, octColor: RED, flipped: false, pixelFont: true, albumSeen: 0 } };
  await page.addInitScript({ content: 'localStorage.setItem("ppolppol_v2", ' + JSON.stringify(JSON.stringify(REC)) + '); window.__ppolAwakeMs = 0; window.__ppolTest = { today: "2026-11-14" }; window.__ppolLook = { hour: ' + HOUR + ', weather: "clear" };' });
  await page.goto('file://' + ROOT + '/index.html?dev=0&intro=0');
  await page.waitForSelector('#btn-go:not(.away)', { timeout: 30000 });
  await page.evaluate(async function () {
    var sc = APP.scene, v = null, tick = function () { return new Promise(function (q) { setTimeout(q, 0); }); };
    APP.goRoom('yard').then(function (q) { v = q; }); for (var i = 0; i < 100 && v === null; i++) { sc.debugSim(0.05, 1); await tick(); } sc.debugSim(0.05, 30);
  });
  var SHOTS = [['road', 15.4, 0], ['road-left', 15.4, -2.6], ['road-right', 15.4, 2.6], ['plaza-right', 41.2, 6.5], ['plaza-left', 41.2, -6.5]];
  for (var s of SHOTS) {
    await page.evaluate(function (q) { var sc = APP.scene, K = Math.SQRT1_2; sc.debugPlayerAt((q[1] + q[2]) * K, (q[1] - q[2]) * K); sc.wideFocus(); sc.debugSim(0.05, 20); sc.debugStep(0.05); }, s);
    await page.screenshot({ path: OUT + '-' + s[0] + '.png' });
  }
  await browser.close(); console.log('ok');
})().catch(function (e) { console.error(e); process.exit(1); });
