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
  for (var key of ['hall']) {
    var ok1 = await page.evaluate(function (k) { var sc = APP.scene; if (!sc.roomReg[k]) return 'noreg'; return Promise.resolve(APP.goInside(k)); }, key);
    await page.waitForTimeout(1200);
    var info = await page.evaluate(function () { return { inside: APP.inside, at: APP.scene.player().at }; });
    if (key === 'cafe') { console.log('menu tap', await tapBtn('btn-cafe-menu')); await page.waitForTimeout(6000); console.log('after menu', JSON.stringify(await page.evaluate(function () { return { at: APP.scene.player().at, open: Array.prototype.map.call(document.querySelectorAll('dialog[open], .card:not([hidden]), [class*=chalk]:not([hidden])'), function (e) { return e.id || e.className; }).slice(0, 5) }; }))); await page.screenshot({ path: S1 + 'cafe-menu.png' }); await page.keyboard.press('Escape'); await page.waitForTimeout(500); }
    await page.evaluate(function () { APP.scene.setPlayerInput({ x: -0.6, y: -0.8 }); }); await page.waitForTimeout(2500); await page.evaluate(function () { APP.scene.setPlayerInput(null); }); var ex = 'stick'; console.log('exit btn', JSON.stringify(await page.evaluate(function () { var b = document.getElementById('btn-room-exit'), q = b.getBoundingClientRect(); return [b.hidden, Math.round(q.left), Math.round(q.top), document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2).id || document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2).className, APP.scene.player().at]; }))); await page.waitForTimeout(7000); console.log('after', JSON.stringify(await page.evaluate(function () { return APP.scene.player().at; })));
    console.log(key, ok1, JSON.stringify(info), 'exit', ex, '→', JSON.stringify(await page.evaluate(function () { return { inside: APP.inside, view: APP.scene.view() }; })));
  }
  await page.evaluate(function () { var K = Math.SQRT1_2; APP.scene.debugPlayerAt(38 * K, 38 * K); }); await page.waitForTimeout(800);
  console.log('sign', await tapBtn('btn-sign-1')); await page.waitForTimeout(600);
  console.log(JSON.stringify(await page.evaluate(function () { return Array.prototype.map.call(document.querySelectorAll('#travel-pick button'), function (b) { var q = b.getBoundingClientRect(); return [b.dataset.place, b.hidden, Math.round(q.left), Math.round(q.top), Math.round(q.width), Math.round(q.height)]; }); })));
  await page.screenshot({ path: S1 + 'travel-fix.png' });
  console.log('tap home', await tapBtn('travel-pick') , await page.evaluate(function () { var b = document.querySelector('#travel-pick button[data-place=home]'); var q = b.getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height / 2]; }).then(async function (c) { await page.touchscreen.tap(c[0], c[1]); await page.waitForTimeout(1200); return page.evaluate(function () { return APP.scene.area(); }); }));
  await browser.close();
})().catch(function (e) { console.error(e); process.exit(1); });
