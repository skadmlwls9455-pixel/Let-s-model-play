/* 갈래 W 다섯째 바퀴: 뛸 때 화면 흔들림 재기.  node wip/round7/r5/W/cam-probe.js <게임 폴더> <out.json>
   곳마다 스틱을 밀거나 (0.6 s 넘게 밀면 뛰기) 톡해서 가기 (길 따라 걷기, 3.74 · 5.6 m/s) 를 1/60 s 프레임으로 민다 (버벅이는 폰 흉내로 0.1 s 프레임 섞은 것도).
   프레임마다 APP.scene.camTrace(): 그려진 카메라 자리 (아트px) · 반올림 전 밀기 · 그려진 내 캐릭터의 화면 자리 (카메라 기준 아트px) */
var path = require('path'), fs = require('fs'), { chromium } = require('playwright');
var ROOT = path.resolve(process.argv[2] || path.resolve(__dirname, '../../../..'));
(async function () {
  var browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var out = {};
  for (var rm of (process.argv[4] ? [process.argv[4] === 'reduce'] : [false, true])) {
    var ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1, locale: 'ko-KR', hasTouch: true, isMobile: true });
    var page = await ctx.newPage();
    page.on('console', function (m) { if (/^scen /.test(m.text())) console.log(m.text()); });
    page.on('pageerror', function (e) { console.log('PAGEERROR ' + e.message); });
    var RED = '#e0564b', BORN = '2026-11-06T10:00:00.000Z', REC = { v: 2, octopus: { name: '뚜루', born: BORN, trips: 0, invites: 8, days: ['2026-11-06', '2026-11-07', '2026-11-08'], affinity: {}, visits: {}, state: 'idle', color: RED, colors: [{ at: BORN, date: '2026-11-06', color: RED, how: 'first', by: 'player' }] }, room: { lantern: 8, souvenirs: [], posterOrder: [] }, trips: [], notes: {}, curiosityNotes: [], salon: { asks: [] }, settings: { motion: rm ? 'reduce' : 'auto', thumbs: true, lastSeen: 1762650000000, octColor: RED, flipped: false, pixelFont: true, albumSeen: 0 } };
    await page.addInitScript({ content: 'localStorage.setItem("ppolppol_v2", ' + JSON.stringify(JSON.stringify(REC)) + '); window.__ppolAwakeMs = 0; window.__ppolTest = { today: "2026-11-14" }; window.__ppolLook = { hour: 13, weather: "clear" };' });
    await page.goto('file://' + ROOT + '/index.html?dev=0&intro=0');
    await page.waitForSelector('#btn-go:not(.away)', { timeout: 30000 });
    var res = await page.evaluate(async function () {
      var sc = APP.scene, K = Math.SQRT1_2, R = {}, tick = function () { return new Promise(function (q) { setTimeout(q, 0); }); };
      function rec(rows, dt) { var c = sc.camTrace(); c.dt = dt; c.moving = !!(sc.player().moving || sc.player().walking); rows.push(c); }
      async function settle() { sc.setPlayerInput(null); for (var i = 0; i < 90; i++) { sc.debugSim(1 / 60, 1); if (i % 30 === 29) await tick(); } }
      /* input(f) → 스틱 벡터 또는 null · dts(f) → 프레임 시간 */
      async function run(name, setup, input, frames, dts, after) {
        console.log('scen ' + name + ' ' + Date.now()); await setup(); await settle(); var rows = [];
        if (after) after();
        for (var f = 0; f < frames; f++) {
          var v = input ? input(f) : null; if (input) sc.setPlayerInput(v);
          var dt = dts ? dts(f) : 1 / 60; sc.debugSim(dt, 1); rec(rows, dt);
          if (f % 30 === 29) await tick();
        }
        sc.setPlayerInput(null); for (f = 0; f < 90; f++) { sc.debugSim(1 / 60, 1); rec(rows, 1 / 60); }
        R[name] = rows;
      }
      async function pump(p, n) { var v = null, f = 0; p.then(function (q) { v = q; }, function () { v = false; }); await tick(); for (; f < (n || 300) && v === null; f++) { sc.debugSim(0.05, 1); await tick(); } return v; }
      var down = function () { return { x: 0, y: -1 }; }, zig = function (f) { return f % 60 < 30 ? { x: 0.7, y: -0.7 } : { x: -0.7, y: -0.7 }; };
      await pump(APP.goRoom('yard')); for (var i = 0; i < 40; i++) { sc.debugSim(0.05, 1); await tick(); }
      await run('yard-stick', function () { sc.debugPlayerAt(6 * K, 6 * K); sc.wideFocus(); }, down, 240);
      await run('village-zigzag', function () { sc.debugPlayerAt(25 * K, 25 * K); sc.wideFocus(); }, zig, 240);
      await run('beach-stick', function () { sc.debugPlayerAt((54 - 8) * K, (54 + 8) * K); sc.wideFocus(); }, function () { return { x: 1, y: 0 }; }, 240);
      await run('yard-stick-jank', function () { sc.debugPlayerAt(6 * K, 6 * K); sc.wideFocus(); }, down, 160, function (f) { return f % 7 === 3 ? 0.1 : 1 / 60; });
      var path = function (s0, n) { return [[(s0 + n) * K + 0.6 * K, (s0 + n) * K - 0.6 * K]]; };   /* 톡한 곳 하나 — 길 따라 곧게 (뛰는 길이) */
      await run('village-tap-run', function () { sc.debugPlayerAt(22 * K, 22 * K); sc.wideFocus(); }, null, 240, null, function () { sc.playerWalkPath(path(22, 12), { speed: 3.74 }); });
      await run('village-tap-run-1.5x', function () { sc.debugPlayerAt(22 * K, 22 * K); sc.wideFocus(); }, null, 200, null, function () { sc.playerWalkPath(path(22, 14), { speed: 5.6 }); });
      sc.debugPlayerAt(27 * K, 27 * K); sc.debugSim(0.05, 3); await pump(sc.enterRoom('goods')); await settle();
      if (sc.inRoom()) await run('shop-stick', function () { }, function (f) { return f < 70 ? { x: 1, y: 0 } : f < 140 ? { x: 0, y: 1 } : { x: 0.3, y: -1 }; }, 210);   /* 왼쪽 (−x) 벽에 문 — 밀면 나간다 */
      await pump(sc.leaveRoom()); await settle();
      await pump(APP.goRoom('attic')); for (i = 0; i < 40; i++) { sc.debugSim(0.05, 1); await tick(); }
      await run('attic-stick', function () { }, function (f) { return f < 80 ? { x: -1, y: 0.2 } : { x: 1, y: -0.4 }; }, 200);
      return R;
    });
    out[rm ? 'reduce' : 'auto'] = res;
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(process.argv[3], JSON.stringify(out));
  console.log('ok');
})().catch(function (e) { console.error(e); process.exit(1); });
