var path = require('path'), { chromium } = require('playwright');
var ROOT = path.resolve(__dirname, '../../..'), OUT = process.argv[2];
(async function () {
  var browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, locale: 'ko-KR', hasTouch: true, isMobile: true });
  var page = await ctx.newPage();
  page.on('pageerror', function (e) { console.log('PAGEERROR ' + e.message); });
  page.on('console', function (m) { if (m.type() === 'error') console.log('CONSOLE ' + m.text()); });
  var RED = '#e0564b', BORN = '2026-11-06T10:00:00.000Z', REC = { v: 2, octopus: { name: '뚜루', born: BORN, trips: 0, invites: 8, days: ['2026-11-06', '2026-11-07', '2026-11-08'], affinity: {}, visits: {}, state: 'idle', color: RED, colors: [{ at: BORN, date: '2026-11-06', color: RED, how: 'first', by: 'player' }] }, room: { lantern: 8, souvenirs: [], posterOrder: [] }, trips: [], notes: {}, curiosityNotes: [], salon: { asks: [] }, settings: { motion: 'auto', thumbs: true, lastSeen: 1762650000000, octColor: RED, flipped: false, pixelFont: true, albumSeen: 0 } };
  await page.addInitScript({ content: 'if (!localStorage.getItem("__seed")) { localStorage.setItem("__seed", "1"); localStorage.setItem("ppolppol_v2", ' + JSON.stringify(JSON.stringify(REC)) + '); }' });
  await page.addInitScript({ content: 'window.__ppolAwakeMs = 0; window.__ppolTest = { today: "2026-11-14" }; window.__ppolLook = { hour: 13, weather: "clear" };' });
  await page.goto('file://' + ROOT + '/index.html?dev=0&intro=0');
  await page.waitForSelector('#btn-go:not(.away)', { timeout: 30000 });
  await page.evaluate(function () { return APP.goRoom('yard'); });
  await page.waitForFunction(function () { var m = APP.scene.motion(); return APP.room === 'yard' && !m.trans && m.dq === ''; }, null, { timeout: 30000 });
  await page.waitForTimeout(600);
  var K = Math.SQRT1_2;
  async function at(s, t) { await page.evaluate(function (a) { APP.scene.debugPlayerAt((a[0] + a[1]) * Math.SQRT1_2, (a[0] - a[1]) * Math.SQRT1_2); APP.scene.setPlayerInput({ x: 0, y: 0.01 }); }, [s, t]); await page.waitForTimeout(900); await page.evaluate(function () { APP.scene.setPlayerInput(null); }); await page.waitForTimeout(500); }
  function vis(sel) { return page.evaluate(function (sel) { return Array.prototype.map.call(document.querySelectorAll(sel), function (b) { var r = b.getBoundingClientRect(); return b.hidden ? null : [b.id, Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; }).filter(Boolean); }, sel); }
  await at(7.5, 0.5);
  console.log('signs near home', JSON.stringify(await vis('[id^=btn-sign-]')));
  var b = (await vis('#btn-sign-0'))[0];
  await page.touchscreen.tap(b[1] + b[3] / 2, b[2] + b[4] / 2); await page.waitForTimeout(500);
  console.log('dialog open', await page.evaluate(function () { var d = document.getElementById('travel-pick'); return [d.open, Array.prototype.map.call(d.querySelectorAll('button'), function (x) { var r = x.getBoundingClientRect(); return [x.getAttribute('aria-label'), x.hidden, r.left, r.top, r.width]; })]; }));
  await page.screenshot({ path: path.join(OUT, 't-dialog.png') });
  await page.click('#travel-pick button[data-place=beach]'); await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT, 't-fade.png') });
  await page.waitForTimeout(700);
  console.log('after beach', JSON.stringify(await page.evaluate(function () { return [APP.scene.player().at, APP.scene.area(), APP.scene.pan(), document.activeElement && document.activeElement.id]; })));
  await page.evaluate(function () { APP.scene.beachShells([0, 1, 2, 3, 4]); document.getElementById('btn-beach-shell-1').addEventListener('click', function () { window.__got = (window.__got || 0) + 1; }); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, 't-beach.png') });
  console.log('shells', JSON.stringify(await vis('[id^=btn-beach-shell-]')), JSON.stringify(await vis('[id^=btn-sign-]')));
  var s1 = (await vis('#btn-beach-shell-1'))[0];
  if (s1) { await page.touchscreen.tap(s1[1] + s1[3] / 2, s1[2] + s1[4] / 2); await page.waitForTimeout(3500); }
  console.log('shell tap', JSON.stringify(await page.evaluate(function () { return [window.__got || 0, APP.scene.player().at, APP.scene.beachShellNear(1)]; })));
  /* 집 문: 멀리서 */
  var t0 = Date.now(); var r = await page.evaluate(function () { return APP.goRoom('attic'); }); console.log('door from beach', JSON.stringify(r), Date.now() - t0, 'ms');
  await browser.close();
})().catch(function (e) { console.error(e); process.exit(1); });
