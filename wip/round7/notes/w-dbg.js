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
  {
    await page.evaluate(function () { return APP.goRoom('yard'); });
  await page.waitForFunction(function () { var m = APP.scene.motion(); return APP.room === 'yard' && !m.trans && m.dq === ''; }, null, { timeout: 30000 });
  }
  await page.waitForTimeout(600);
  var S1 = '/tmp/claude-0/-home-user-Let-s-model-play/bf38d309-8ede-59ca-909d-3c51ecde03b7/scratchpad/shots/';
  page.on('console', function (m) { if (m.type() === 'error') console.log('CON ' + m.text().slice(0, 300)); });
  await page.evaluate(function () { var sc = APP.scene, K = Math.SQRT1_2; window.__ev = []; document.addEventListener('ppol:room', function (e) { window.__ev.push(e.detail.key); }); sc.debugRoomStub('clothes'); sc.debugPlayerAt(25 * K, 25 * K); });
  await page.waitForTimeout(500);
  var t0 = Date.now(), r1 = await page.evaluate(function () { return APP.goInside('clothes'); }); await page.waitForTimeout(500);
  console.log('in', r1, Date.now() - t0, JSON.stringify(await page.evaluate(function () { var sc = APP.scene, s = sc.stats(); return { inside: APP.inside, room: APP.room, view: sc.view(), at: sc.player().at, allowed: sc.playerInputAllowed(), calls: s.calls, prog: s.programs, zoom: sc.pan().n, ev: window.__ev, slots: sc.roomSlots('clothes'), pr: sc.project(0, 0, 0) }; })));
  await page.screenshot({ path: S1 + 'in1.png' });
  await page.evaluate(function () { APP.scene.setPlayerInput({ x: -0.7, y: 0.7 }); }); await page.waitForTimeout(1500); await page.evaluate(function () { APP.scene.setPlayerInput(null); }); await page.waitForTimeout(300);
  await page.screenshot({ path: S1 + 'in2.png' });
  console.log('walked', JSON.stringify(await page.evaluate(function () { return APP.scene.player().at; })));
  var r2 = await page.evaluate(function () { return APP.goOutside(); }); await page.waitForTimeout(600);
  console.log('out', r2, JSON.stringify(await page.evaluate(function () { var sc = APP.scene; return { inside: APP.inside, room: APP.room, view: sc.view(), at: sc.player().at, area: sc.area(), allowed: sc.playerInputAllowed(), n: sc.pan().n, ev: window.__ev, prog: sc.stats().programs }; })));
  await page.screenshot({ path: S1 + 'in3.png' });
  await browser.close();
})().catch(function (e) { console.error(e); process.exit(1); });
