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
  page.on('console', function (m) { if (m.type() === 'error' || m.type() === 'warning') console.log('CON ' + m.text().slice(0, 160)); });
  async function tapBtn(id) { var r = await page.evaluate(function (id) { var b = document.getElementById(id); if (!b || b.hidden) return null; var q = b.getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height / 2]; }, id); if (!r) return 'hidden'; await page.touchscreen.tap(r[0], r[1]); return 'tapped'; }
  await page.evaluate(function () { return APP.goInside('cafe'); }); await page.waitForTimeout(1500);
  var stands = await page.evaluate(function () { var sp = APP.scene.roomSlots('cafe').spots, o = []; for (var k in sp) if (sp[k].stand) o.push([sp[k].stand[0], sp[k].stand[1], k]); return o; }); console.log(JSON.stringify(stands));
  for (var start of stands) {
    var r = await page.evaluate(function (st) { var sc = APP.scene; sc.debugPlayerAt(st[0], st[1]); var done = null; Promise.resolve(sc.cafeSit(true)).then(function (v) { done = v; }); return new Promise(function (res) { var t = 0; (function w() { if (done !== null || t > 120) { res({ done: done, seated: sc.cafeSeated ? sc.cafeSeated() : null, at: sc.player().at }); return; } t++; setTimeout(w, 100); })(); }); }, start);
    console.log('sit from', start, JSON.stringify(r));
    await page.evaluate(function () { return APP.scene.cafeSit(false); }); await page.waitForTimeout(800);
  }
  await browser.close();
})().catch(function (e) { console.error(e); process.exit(1); });
