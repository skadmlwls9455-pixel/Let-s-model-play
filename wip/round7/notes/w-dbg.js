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
  if (!process.env.ATTIC) {
    await page.evaluate(function () { return APP.goRoom('yard'); });
  await page.waitForFunction(function () { var m = APP.scene.motion(); return APP.room === 'yard' && !m.trans && m.dq === ''; }, null, { timeout: 30000 });
  }
  await page.waitForTimeout(600);
  var S1 = '/tmp/claude-0/-home-user-Let-s-model-play/bf38d309-8ede-59ca-909d-3c51ecde03b7/scratchpad/shots/';
  await page.addStyleTag({ content: 'dialog::backdrop { background: none transparent !important; }' });
  async function tryAt(tag) { for (var id of ['bag-sheet', 'settings-sheet', 'log-sheet']) { await page.evaluate(function (id) { document.getElementById(id).showModal(); }, id); await page.waitForTimeout(700); await page.screenshot({ path: S1 + 'q-' + tag + '-' + id + '.png' }); var r = await page.evaluate(function (id) { var d = document.getElementById(id), r = d.getBoundingClientRect(), s = APP.scene.stats(); d.close(); return [Math.round(r.top), s.calls, s.draws, s.offscreen]; }, id); console.log(tag, id, JSON.stringify(r)); await page.waitForTimeout(300); } }
  await page.evaluate(function () { document.getElementById('log-sheet').showModal(); }); await page.waitForTimeout(700);
  var L = async function (tag) { var b = await page.screenshot(); require('fs').writeFileSync(S1 + 'y-' + tag + '.png', b); };
  await L('a-open');
  console.log(JSON.stringify(await page.evaluate(function () { var out = []; ['#scene3d canvas', '#scene3d', '#scene', '#shell', 'body', 'html'].forEach(function (q) { var e = document.querySelector(q), c = getComputedStyle(e), r = e.getBoundingClientRect(); out.push([q, c.clipPath, c.maskImage, c.overflow, c.contain, c.contentVisibility, Math.round(r.top), Math.round(r.height), c.transform, c.position, e.scrollTop]); }); out.push(['vv', visualViewport.offsetTop, visualViewport.height, scrollY, document.scrollingElement.scrollTop, innerHeight]); return out; })));
  await browser.close();
})().catch(function (e) { console.error(e); process.exit(1); });
