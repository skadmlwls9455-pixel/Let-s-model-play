/* 갈래 W 다섯째 바퀴: 문어가 가구를 뚫고 걷나.  node oct-path-probe.js <게임 폴더> [out.json] [auto|reduce]
   다락에서 배치 몇 가지 (기본 · 가구 사이 틈 · 문을 둘러쌈 · 사람이 옮긴 가구) 마다 문어를 자리에 두고 걸음 (moveTo · 출발 의식) 을 1/60 s 프레임으로 민다.
   프레임마다 문어 가운데에서 가장 가까운 가구 발자국까지의 틈 · 몸이 뜬 높이를 잰다 — 틈 < 0.15 m 인데 몸이 그 가구 키보다 낮으면 '뚫음'. */
var path = require('path'), fs = require('fs'), { chromium } = require('playwright');
var ROOT = path.resolve(process.argv[2] || '.'), MODE = process.argv[4] || 'auto';
(async function () {
  var browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1, locale: 'ko-KR', hasTouch: true, isMobile: true });
  var page = await ctx.newPage(); page.on('pageerror', function (e) { console.log('PAGEERROR ' + e.message); });
  var RED = '#e0564b', BORN = '2026-11-06T10:00:00.000Z', REC = { v: 2, octopus: { name: '뚜루', born: BORN, trips: 0, invites: 8, days: ['2026-11-06', '2026-11-07', '2026-11-08'], affinity: {}, visits: {}, state: 'idle', color: RED, colors: [{ at: BORN, date: '2026-11-06', color: RED, how: 'first', by: 'player' }] }, room: { lantern: 8, souvenirs: [], posterOrder: [] }, trips: [], notes: {}, curiosityNotes: [], salon: { asks: [] }, settings: { motion: MODE === 'reduce' ? 'reduce' : 'auto', thumbs: true, lastSeen: 1762650000000, octColor: RED, flipped: false, pixelFont: true, albumSeen: 0 } };
  await page.addInitScript({ content: 'localStorage.setItem("ppolppol_v2", ' + JSON.stringify(JSON.stringify(REC)) + '); window.__ppolAwakeMs = 0; window.__ppolTest = { today: "2026-11-14" }; window.__ppolLook = { hour: 13, weather: "clear" };' });
  await page.goto('file://' + ROOT + '/index.html?dev=0&intro=0');
  await page.waitForSelector('#btn-go:not(.away)', { timeout: 30000 });
  var res = await page.evaluate(async function () {
    var sc = APP.scene, tick = function () { return new Promise(function (q) { setTimeout(q, 0); }); }, out = [];
    var hasNav = typeof sc.octNav === 'function';
    function boxes() {   /* 가구 발자국 (지금 배치) — octNav 가 없으면 (고치기 전) layout() 으로 */
      if (hasNav) { var o = sc.octNav(); if (o.rects) return o.rects.map(function (r) { return { b: r.slice(0, 4), h: r[4], hard: r[5] }; }); }
      var L = sc.layout(), R = [];
      [['sofa', 0.42, 0.68, 0.66], ['crate', 0.52, 0.44, 1.2]].forEach(function (q) { var v = L[q[0]]; if (!v) return; var a = (v[2] || 0) * Math.PI / 180, k = v[3] || 1, hw = (Math.abs(Math.cos(a)) * q[1] + Math.abs(Math.sin(a)) * q[2]) * k, hd = (Math.abs(Math.sin(a)) * q[1] + Math.abs(Math.cos(a)) * q[2]) * k; R.push({ b: [v[0] - hw, v[0] + hw, v[1] - hd, v[1] + hd], h: q[3] * k }); });
      return R;
    }
    function octAt() { if (hasNav) { var o = sc.octNav(); return { x: o.at[0], z: o.at[2], hop: o.hop }; } var m = sc.motion ? sc.motion() : null; return null; }
    function rd(x, z, b) { var dx = Math.max(b[0] - x, 0, x - b[1]), dz = Math.max(b[2] - z, 0, z - b[3]); return Math.hypot(dx, dz); }
    async function trial(name, layout, startAnchor, startXZ, act, frames) {
      if (layout) { sc.setLayout(layout); sc.debugSim(1 / 60, 2); }
      if (startAnchor) sc.jumpTo(startAnchor); sc.debugSim(1 / 60, 2);
      if (startXZ && sc.debugOctAt) sc.debugOctAt(startXZ[0], startXZ[1]);
      var B = boxes(), worst = 9, bad = 0, fr = 0, maxHop = 0, done = false, p = act(); if (p && p.then) p.then(function () { done = true; });
      var pts = [];
      for (fr = 0; fr < (frames || 900) && !done; fr++) {
        sc.debugSim(1 / 60, 1); var o = octAt(); if (!o) break;
        if (hasNav) { var nv2 = sc.octNav(); if (!nv2.attic && !nv2.up) break; }   /* 문어가 다락 · 위층을 떠났다 (문간 너머 · 바깥) — 그 자리는 바깥 좌표라 찍지 않는다 */
        if (fr % 3 === 0) pts.push([+o.x.toFixed(2), +o.z.toFixed(2), +o.hop.toFixed(2)]);
        B.forEach(function (r) { if (r.hard) return; var d = rd(o.x, o.z, r.b); if (d < worst) worst = d; if (d < 0.15 && o.hop < r.h) bad++; }); maxHop = Math.max(maxHop, o.hop);
        if (fr % 60 === 59) await tick();
      }
      out.push({ name: name, frames: fr, done: done, minClear: +worst.toFixed(3), bad: bad, maxHop: +maxHop.toFixed(2), last: hasNav ? sc.octNav().last : null, trail: pts });
    }
    var DEF = { sofa: [-1.9, 2.0, 0, 1], crate: [2.0, -0.75, 0, 1] };
    var GAP = { sofa: [-1.9, 1.0, 0, 1], crate: [-0.6, 1.0, 90, 1] };
    var ENC = { crate: [0.8, -2.0, 0, 1], sofa: [2.3, -1.15, 90, 1.5] };
    var MOV = { sofa: [0.3, 0.0, 90, 1.2], crate: [1.4, 0.9, 0, 1] };
    /* 위층 먼저 (출발 의식이 끝나지 않은 채 남으면 문어가 안 따라 올라온다): 내 캐릭터가 올라가면 문어가 따라 올라온다 → 거울 옆 (salon) 으로 */
    sc.setLayout(DEF); sc.debugSim(1 / 60, 2); sc.jumpTo('center'); sc.debugSim(1 / 60, 2);
    var up = null; APP.goRoom('loft').then(function (q) { up = q; }); for (var w = 0; w < 200 && up === null; w++) { sc.debugSim(0.05, 1); await tick(); } sc.debugSim(0.05, 20);
    var nv = hasNav ? sc.octNav() : null;
    if (!hasNav || (nv && nv.up)) await trial('loft: rug→salon', null, null, null, function () { return sc.moveTo('salon'); }, 600);
    else out.push({ name: 'loft: octopus not up', frames: 0, done: false, minClear: 9, bad: 0, maxHop: 0, last: nv });
    var dn = null; APP.goRoom('attic').then(function (q) { dn = q; }); for (w = 0; w < 200 && dn === null; w++) { sc.debugSim(0.05, 1); await tick(); } sc.debugSim(0.05, 20);
    var anchors = ['window', 'blanket', 'center', 'board', 'crate'];
    for (var i = 0; i < anchors.length; i++) await trial('default ' + anchors[i] + '→door', DEF, anchors[i], null, function () { return sc.moveTo('door'); });
    await trial('default door→blanket', DEF, 'door', null, function () { return sc.moveTo('blanket'); });
    await trial('gap: crate-anchor→door', GAP, 'crate', null, function () { return sc.moveTo('door'); });
    await trial('gap: window→blanket', GAP, 'window', null, function () { return sc.moveTo('blanket'); });
    await trial('enclosed door: center→door', ENC, 'center', null, function () { return sc.moveTo('door'); });
    await trial('enclosed door: door→window', ENC, 'door', null, function () { return sc.moveTo('window'); });
    await trial('moved: blanket→door', MOV, 'blanket', null, function () { return sc.moveTo('door'); });
    await trial('moved: window→board', MOV, 'window', null, function () { return sc.moveTo('board'); });
    sc.setLayout(DEF); sc.debugSim(1 / 60, 2); sc.jumpTo('center'); sc.debugSim(1 / 60, 2);
    var c0 = octAt(); await trial('tight: furniture around octopus → door', { sofa: [c0.x - 0.7, c0.z, 0, 1], crate: [c0.x + 0.8, c0.z - 0.3, 90, 1] }, null, null, function () { return sc.moveTo('door'); });
    await trial('depart from blanket (moved)', MOV, 'blanket', null, function () { return sc.departCeremony(); }, 600);
    sc.cancelCeremony(); sc.debugSim(1 / 60, 5);
    var POCKET = { sofa: [-1.92, -0.5, 0, 1], crate: [-0.6, -1.9, 0, 1] }, ENCL = { crate: [0.78, -1.95, 0, 1], sofa: [2.2, -1.09, 90, 1.2] };   /* 가구 모드 규칙 안의 배치 */
    await trial('fresh crate anchor→door', DEF, 'crate', null, function () { return sc.moveTo('door'); });
    await trial('pocket (legal): crate→door', POCKET, 'crate', null, function () { return sc.moveTo('door'); });
    await trial('enclosed door (legal): door→window', ENCL, 'door', null, function () { return sc.moveTo('window'); });
    await trial('depart, door enclosed (ENC)', ENC, 'center', null, function () { return sc.departCeremony(); }, 600);
    sc.cancelCeremony(); sc.debugSim(1 / 60, 5);
    await trial('depart, door enclosed (legal)', ENCL, 'center', null, function () { return sc.departCeremony(); }, 600);
    sc.setLayout(DEF); sc.debugSim(1 / 60, 2);
    return out;
  });
  res.forEach(function (r) { console.log((r.bad ? 'BAD ' : 'ok  ') + r.name.padEnd(32) + ' frames ' + r.frames + (r.done ? '' : ' (not done)') + ' minClear ' + r.minClear + ' bad ' + r.bad + ' maxHop ' + r.maxHop + ' ' + JSON.stringify(r.last)); });
  if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(res));
  await browser.close();
})().catch(function (e) { console.error(e); process.exit(1); });
