/* 갈래 W 다섯째 바퀴: 숲길 · 광장 집 문을 눌렀을 때 문 앞까지 가서 들어가나.  node door-probe.js <게임 폴더> [out.json]
   18 시 (집 문어가 집에 있어 문이 열린 때) · 문마다 출발 자리 여럿 (s, t) 에서 단추를 누르고 (앱의 같은 길: villageGo → enterRoom) 프레임을 민다.
   적는 것: 들어갔나 · 걸린 시간 · 멈춘 자리 (s, t) · 서는 자리까지 남은 거리 · 길 위의 가장 가까운 부딪힘 */
var path = require('path'), fs = require('fs'), { chromium } = require('playwright');
var ROOT = path.resolve(process.argv[2]);
(async function () {
  var browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1, locale: 'ko-KR', hasTouch: true, isMobile: true });
  var page = await ctx.newPage(); page.on('pageerror', function (e) { console.log('PAGEERROR ' + e.message); });
  var RED = '#e0564b', BORN = '2026-11-06T10:00:00.000Z', REC = { v: 2, octopus: { name: '뚜루', born: BORN, trips: 0, invites: 8, days: ['2026-11-06', '2026-11-07', '2026-11-08'], affinity: {}, visits: {}, state: 'idle', color: RED, colors: [{ at: BORN, date: '2026-11-06', color: RED, how: 'first', by: 'player' }] }, room: { lantern: 8, souvenirs: [], posterOrder: [] }, trips: [], notes: {}, curiosityNotes: [], salon: { asks: [] }, settings: { motion: 'auto', thumbs: true, lastSeen: 1762650000000, octColor: RED, flipped: false, pixelFont: true, albumSeen: 0 } };
  await page.addInitScript({ content: 'localStorage.setItem("ppolppol_v2", ' + JSON.stringify(JSON.stringify(REC)) + '); window.__ppolAwakeMs = 0; window.__ppolTest = { today: "2026-11-14" }; window.__ppolLook = { hour: 18, weather: "clear" };' });
  await page.goto('file://' + ROOT + '/index.html?dev=0&intro=0');
  await page.waitForSelector('#btn-go:not(.away)', { timeout: 30000 });
  var res = await page.evaluate(async function () {
    var sc = APP.scene, K = Math.SQRT1_2, v = null, tick = function () { return new Promise(function (q) { setTimeout(q, 0); }); }, out = [];
    APP.goRoom('yard').then(function (q) { v = q; }); for (var i = 0; i < 100 && v === null; i++) { sc.debugSim(0.05, 1); await tick(); } sc.debugSim(0.05, 30);
    function st() { var a = sc.player().at; return [+((a[0] + a[2]) * K).toFixed(2), +((a[0] - a[2]) * K).toFixed(2)]; }
    var D = {}; VILLAGE.DOORS.forEach(function (d) { D[d.btn] = d; });
    var CASES = [['btn-in-home-1', [[8, 0], [10, 1.5], [12, 2.5], [14, 0], [16, 0], [18, 0], [20, -1], [16, 2.6], [13, -2.6], [19, 1.8], [11, -2.0], [17.5, -2.2]]],
                 ['btn-in-home-4', [[8, 0], [10, -1.5], [12, -2.5], [14, 0], [16, 0], [18, 0], [20, 1], [16, -2.6], [13, 2.6], [19, -1.8], [11, 2.0], [17.5, 2.2]]],
                 ['btn-in-home-3', [[38, 0], [40, -5], [44, 4], [41, 7.5], [45, 7], [39, 2]]],
                 ['btn-in-salon', [[38, 0], [40, 5], [44, -4], [41, -7.5], [45, -7], [39, -2]]]];
    for (var c = 0; c < CASES.length; c++) {
      var btn = CASES[c][0], d = D[btn];
      for (var j = 0; j < CASES[c][1].length; j++) {
        var s0 = CASES[c][1][j]; sc.debugPlayerAt((s0[0] + s0[1]) * K, (s0[0] - s0[1]) * K); sc.wideFocus(); sc.debugSim(0.05, 10);
        var b = document.getElementById(btn); b.click(); var f = 0, ins = false, trail = [], end = st(), still = 0, stall = 0, lastP = st();
        for (; f < 400; f++) {
          sc.debugSim(0.05, 1); if (sc.inRoom()) { ins = true; break; }
          var p = st(); end = p; if (f % 5 === 0) trail.push(p);
          if (Math.hypot(p[0] - lastP[0], p[1] - lastP[1]) < 0.01) { still++; stall = Math.max(stall, still); } else still = 0; lastP = p;
          if (f % 20 === 19) await tick();
        }
        var gap = Math.hypot(end[0] - d.stand[0], end[1] - d.stand[1]);
        out.push({ btn: btn, from: s0, inside: ins, sec: +(f * 0.05).toFixed(2), stall: +(stall * 0.05).toFixed(2), end: end, stand: d.stand, door: [+d.s.toFixed(2), +d.t.toFixed(2)], gap: +gap.toFixed(2), trail: trail });
        if (sc.inRoom()) {   /* 들어가는 덮개가 끝난 뒤 (IN.busy 가 풀린 뒤) 나온다 — 그 전에 부르면 'busy' 로 거절된다 */
          for (i = 0; i < 40; i++) { sc.debugSim(0.05, 1); if (i % 10 === 9) await tick(); }
          for (var tries = 0; tries < 5 && sc.inRoom(); tries++) { var lv = null; APP.goOutside().then(function (q) { lv = q; }); for (i = 0; i < 200 && (lv === null || sc.inRoom()); i++) { sc.debugSim(0.05, 1); await tick(); } }
          sc.debugSim(0.05, 10);
        }
      }
    }
    return out;
  });
  res.forEach(function (r) { console.log((r.inside ? 'IN  ' : 'STOP') + ' ' + r.btn + ' from ' + JSON.stringify(r.from) + ' → end ' + JSON.stringify(r.end) + ' stand ' + JSON.stringify(r.stand) + ' door ' + JSON.stringify(r.door) + ' gap ' + r.gap + ' · ' + r.sec + ' s · 멈춤 ' + r.stall + ' s'); });
  if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(res));
  await browser.close();
})().catch(function (e) { console.error(e); process.exit(1); });
