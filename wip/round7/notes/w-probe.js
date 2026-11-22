/* 갈래 W 탐침: node wip/round7/notes/w-probe.js <out dir> '<json: [{name, s, t, yaw, vp:[w,h], hour, shells, q}]>' */
var path = require('path'), { chromium } = require('playwright');
var ROOT = path.resolve(__dirname, '../../..'), OUT = process.argv[2], JOBS = JSON.parse(process.argv[3]);
function rec() { var RED = '#e0564b', BORN = '2026-11-06T10:00:00.000Z';
  return { v: 2, octopus: { name: '뚜루', born: BORN, trips: 0, invites: 8, days: ['2026-11-06', '2026-11-07', '2026-11-08'], affinity: {}, visits: {}, state: 'idle', color: RED, colors: [{ at: BORN, date: '2026-11-06', color: RED, how: 'first', by: 'player' }] }, room: { lantern: 8, souvenirs: [], posterOrder: [] }, trips: [], notes: {}, curiosityNotes: [], salon: { asks: [] },
    settings: { motion: 'auto', thumbs: true, lastSeen: 1762650000000, octColor: RED, flipped: false, pixelFont: true, albumSeen: 0 } }; }
(async function () {
  var browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] }), last = '', page = null, ctx = null;
  for (var j of JOBS) {
    var vp = j.vp || [360, 740], key = vp.join('x') + '|' + (j.hour == null ? 13 : j.hour) + '|' + (j.weather || 'clear') + '|' + (j.q || '');
    if (key !== last) {
      if (ctx) await ctx.close();
      ctx = await browser.newContext({ viewport: { width: vp[0], height: vp[1] }, deviceScaleFactor: j.dsf || 1, locale: 'ko-KR', hasTouch: true, isMobile: vp[0] < 700 });
      page = await ctx.newPage(); last = key;
      page.on('pageerror', function (e) { console.log('PAGEERROR ' + e.message); });
      page.on('console', function (m) { if (m.type() === 'error') console.log('CONSOLE ' + m.text()); });
      await page.addInitScript({ content: 'window.__ppolAwakeMs = 0; if (!localStorage.getItem("__seed")) { localStorage.setItem("__seed", "1"); localStorage.setItem("ppolppol_v2", ' + JSON.stringify(JSON.stringify(rec())) + '); } window.__ppolTest = { today: "2026-11-14" }; window.__ppolLook = ' + JSON.stringify({ hour: j.hour == null ? 13 : j.hour, weather: j.weather || 'clear' }) + ';' });
      await page.goto('file://' + ROOT + '/index.html?dev=0&intro=0' + (j.q || ''));
      await page.waitForSelector('#btn-go:not(.away)', { timeout: 30000 });
      await page.evaluate(function () { return APP.goRoom('yard'); });
      await page.waitForFunction(function () { var m = APP.scene.motion(); return APP.room === 'yard' && !m.trans && m.dq === ''; }, null, { timeout: 30000 });
      await page.waitForTimeout(400);
    }
    var info = await page.evaluate(function (j) {
      var sc = APP.scene, K = Math.SQRT1_2;
      if (j.shells) sc.beachShells(j.shells);
      if (j.s != null) sc.debugPlayerAt((j.s + (j.t || 0)) * K, (j.s - (j.t || 0)) * K);
      sc.setYaw(j.yaw || 0, true); sc.debugSim(0.1, 1); sc.wideFocus();
      sc.setPlayerInput({ x: 0, y: 0.01 }); sc.debugSim(0.1, 30); sc.setPlayerInput(null); sc.debugSim(0.1, 4); sc.debugStep(0.1);
      var st = sc.stats(), a = sc.player().at;
      return { name: j.name, at: a, area: sc.area(), calls: st.calls, prog: st.programs, tris: st.triangles, pan: sc.pan(), map: sc.wideMap() && { seg: sc.wideMap().segments, spots: sc.wideMap().spots.length, cols: sc.wideMap().cols }, trees: sc.wide().trees };
    }, j);
    console.log(JSON.stringify(info));
    await page.screenshot({ path: path.join(OUT, j.name + '.png') });
  }
  await browser.close();
})().catch(function (e) { console.error(e); process.exit(1); });
