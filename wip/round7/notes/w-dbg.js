var path = require('path'), { chromium } = require('playwright');
var ROOT = path.resolve(__dirname, '../../..');
(async function () {
  var browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1, locale: 'ko-KR', hasTouch: true, isMobile: true });
  var page = await ctx.newPage();
  page.on('pageerror', function (e) { console.log('PAGEERROR ' + e.message); });
  var RED = '#e0564b', BORN = '2026-11-06T10:00:00.000Z', REC = { v: 2, octopus: { name: '뚜루', born: BORN, trips: 0, invites: 8, days: ['2026-11-06', '2026-11-07', '2026-11-08'], affinity: {}, visits: {}, state: 'idle', color: RED, colors: [{ at: BORN, date: '2026-11-06', color: RED, how: 'first', by: 'player' }] }, room: { lantern: 8, souvenirs: [], posterOrder: [] }, trips: [], notes: {}, curiosityNotes: [], salon: { asks: [] }, settings: { motion: 'auto', thumbs: true, lastSeen: 1762650000000, octColor: RED, flipped: false, pixelFont: true, albumSeen: 0 } };
  await page.addInitScript({ content: 'if (!localStorage.getItem("__seed")) { localStorage.setItem("__seed", "1"); localStorage.setItem("ppolppol_v2", ' + JSON.stringify(JSON.stringify(REC)) + '); } window.__ppolAwakeMs = 0; window.__ppolTest = { today: "2026-11-14" }; window.__ppolLook = { hour: 13, weather: "clear" };' });
  await page.goto('file://' + ROOT + '/index.html?dev=0&intro=0');
  await page.waitForSelector('#btn-go:not(.away)', { timeout: 30000 });
  await page.evaluate(function () { return APP.goRoom('yard'); });
  await page.waitForFunction(function () { var m = APP.scene.motion(); return APP.room === 'yard' && !m.trans && m.dq === ''; }, null, { timeout: 30000 });
  await page.waitForTimeout(600);
  console.log(JSON.stringify(await page.evaluate(function () {
    var sc = APP.scene, K = Math.SQRT1_2, out = [];
    function scr() { var a = sc.player().at, q = sc.screenOf(a[0], 0.6, a[2]); return [Math.round(q.x), Math.round(q.y)]; }
    sc.debugPlayerAt(8 * K, 8 * K); sc.wideFocus(); sc.debugSim(1 / 60, 5); out.push(['start', scr()]);
    function run(x, y, sec, tag) { sc.setPlayerInput(x == null ? null : { x: x, y: y }); for (var i = 0; i < sec * 4; i++) { sc.debugSim(1 / 60, 15); out.push([tag, scr(), +sc.wideMap().vmax.toFixed(2)]); } }
    run(0, -1, 2, 'down'); run(0, 1, 1.5, 'up'); run(1, 0, 1, 'right'); run(null, 0, 1, 'stop');
    return out;
  })));
  await browser.close();
})().catch(function (e) { console.error(e); process.exit(1); });
