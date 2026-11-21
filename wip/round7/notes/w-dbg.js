var path = require('path'), { chromium } = require('playwright');
var ROOT = path.resolve(__dirname, '../../..');
(async function () {
  var browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var ctx = await browser.newContext({ viewport: { width: 768, height: 1024 }, deviceScaleFactor: 1, locale: 'ko-KR', hasTouch: true, isMobile: false });
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
    var sc = APP.scene, K = Math.SQRT1_2, r = document.getElementById('scene3d').getBoundingClientRect(), out = [];
    sc.debugPlayerAt((42 - 7) * K, (42 + 7) * K); sc.setYaw(0, true); sc.debugSim(0.1, 1); sc.wideFocus(); sc.setPlayerInput({ x: 0, y: 0.01 }); sc.debugSim(0.1, 12); sc.setPlayerInput(null); sc.debugSim(0.1, 3); sc.debugStep(0.1);
    for (var iy = 0; iy <= 14; iy++) for (var ix = 0; ix <= 10; ix++) { var x = r.left + 3 + (r.width - 6) * ix / 10, y = r.top + 3 + (r.height - 6) * iy / 14; if (sc.voidAt(x, y)) { var f = sc.floorAt ? sc.floorAt(x, y) : null; out.push([ix, iy, Math.round(x), Math.round(y), f]); } }
    return { out: out, rect: [r.left, r.top, r.width, r.height], seg: sc.wideMap().segments, centre: sc.wideMap().centre };
  })));
  await page.screenshot({ path: '/tmp/claude-0/-home-user-Let-s-model-play/bf38d309-8ede-59ca-909d-3c51ecde03b7/scratchpad/shots/dbg.png' });
  await browser.close();
})().catch(function (e) { console.error(e); process.exit(1); });
