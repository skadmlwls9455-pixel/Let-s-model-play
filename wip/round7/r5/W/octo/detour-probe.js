/* 갈래 W 다섯째 바퀴 셋째 (먼 돌아가기면 폴짝): 배치 셋 (W1 · W2 · 기본) 에서 앵커 (+ 문간) 끼리 길을 짜 보고, 걷는 길이 곧은 거리 × 2 + 1.5 m 를 넘거나 폴짝을 고른 (detour) 길만 찍는다.
   node detour-probe.js <게임 폴더>   → 배치 | 출발>도착 | mode | DETOUR | 곧은 거리 m | 길이 m | 넘은 높이 m */
var path = require('path'), { chromium } = require('playwright');
var ROOT = path.resolve(process.argv[2] || '.');
(async function () {
  var browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1, locale: 'ko-KR', hasTouch: true, isMobile: true });
  var page = await ctx.newPage(); page.on('pageerror', function (e) { console.log('PAGEERROR ' + e.message); });
  var RED = '#e0564b', BORN = '2026-11-06T10:00:00.000Z', REC = { v: 2, octopus: { name: '뚜루', born: BORN, trips: 0, invites: 8, days: ['2026-11-06', '2026-11-07', '2026-11-08'], affinity: {}, visits: {}, state: 'idle', color: RED, colors: [{ at: BORN, date: '2026-11-06', color: RED, how: 'first', by: 'player' }] }, room: { lantern: 8, souvenirs: [], posterOrder: [] }, trips: [], notes: {}, curiosityNotes: [], salon: { asks: [] }, settings: { motion: 'auto', thumbs: true, lastSeen: 1762650000000, octColor: RED, flipped: false, pixelFont: true, albumSeen: 0 } };
  await page.addInitScript({ content: 'localStorage.setItem("ppolppol_v2", ' + JSON.stringify(JSON.stringify(REC)) + '); window.__ppolAwakeMs = 0; window.__ppolTest = { today: "2026-11-14" }; window.__ppolLook = { hour: 13, weather: "clear" };' });
  await page.goto('file://' + ROOT + '/index.html?dev=0&intro=0');
  await page.waitForSelector('#btn-go:not(.away)', { timeout: 30000 });
  var out = await page.evaluate(function () {
    var sc = APP.scene, R = [];
    var LAY = [{ name: 'W1', l: { sofa: [0.75, 0.75, 0, 1.3], crate: [0.5, -1, 0, 1.5] } }, { name: 'W2', l: { sofa: [0.5, -1.25, 90, 0.9], crate: [0.5, 0.5, 90, 1.5] } }, { name: 'DEF', l: { sofa: [-1.9, 2.0, 0, 1], crate: [2.0, -0.75, 0, 1] } }];
    var AN = ['door', 'window', 'crate', 'board', 'blanket', 'center'];
    function len(from, pts) { var a = from, L = 0; pts.forEach(function (p) { L += Math.hypot(p[0] - a[0], p[1] - a[1]); a = p; }); return L; }
    LAY.forEach(function (Ly) {
      sc.setLayout(Ly.l); sc.debugSim(1 / 60, 2);
      var P = {}; AN.forEach(function (a) { sc.jumpTo(a); sc.debugSim(1 / 60, 1); var t = sc.octNav().at; P[a] = [t[0], t[2]]; }); P.doorIn = [P.door[0], P.door[1] - 0.35];
      var keys = Object.keys(P);
      keys.forEach(function (a) { keys.forEach(function (b) { if (a === b) return; var pl = sc.octNav(P[a], P[b]).plan; if (!pl) return; var L = len(P[a], pl.pts), st = Math.hypot(P[b][0] - P[a][0], P[b][1] - P[a][1]); if (L > 2 * st + 1.5 || pl.detour) R.push([Ly.name, a + '>' + b, pl.mode, pl.detour ? 'DETOUR' : '', +st.toFixed(2), +L.toFixed(2), pl.hops.map(function (h) { return +h.h.toFixed(2); })]); }); });
      R.push([Ly.name, 'anchors', JSON.stringify(P)]);
    });
    return R;
  });
  out.forEach(function (r) { console.log(r.join(' | ')); });
  await browser.close();
})().catch(function (e) { console.error(e); process.exit(1); });
