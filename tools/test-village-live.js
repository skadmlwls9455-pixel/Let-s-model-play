/* 마을 (갈래 V) 브라우저 시험 — 11-21 7차. docs/VILLAGE.md
   마을에 서 있는 것 · 단추 열 개 · NPC 문어 · 카페 자리 · 드로우콜. 땅과 등록부 배관 (갈래 W) 이 있으면 그 위에서, 없으면 장면의 시험 스텁
   (scene.debugVillageStub — 걷는 띠와 땅을 광장까지 늘리고 builders 를 부른다) 위에서 돈다. 결과 줄 머리의 'mode' 가 어느 쪽인지 말한다.
   실행: NODE_PATH=$(npm root -g) node tools/test-village-live.js */
var path = require('path');
var pw; try { pw = require('playwright'); } catch (e) { console.error('playwright 가 없다 (NODE_PATH=$(npm root -g))'); process.exit(2); }
var ROOT = path.resolve(__dirname, '..'), pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.error('  ✗ ' + m); } }
var T0 = Date.now(); function lap(m) { if (process.env.VIL_LAP) console.log('  [' + ((Date.now() - T0) / 1000).toFixed(0) + ' s] ' + m); }
var RED = '#e0564b', BORN = '2026-11-06T10:00:00.000Z';
var REC = { v: 2, octopus: { name: '뚜루', born: BORN, trips: 0, invites: 8, days: ['2026-11-06'], affinity: {}, visits: {}, state: 'idle', color: RED, colors: [{ at: BORN, date: '2026-11-06', color: RED, how: 'first', by: 'player' }] },
  room: { lantern: 8, souvenirs: [], posterOrder: [] }, trips: [], notes: {}, curiosityNotes: [], salon: { asks: [] }, settings: { motion: 'auto', thumbs: true, lastSeen: 1762650000000, octColor: RED, flipped: false, pixelFont: true, albumSeen: 0 } };
var NPCS = [{ id: 'clothes', color: '#5c86b0', hat: 'beret', pose: 'stand' }, { id: 'goods', color: '#e8b04a', hat: 'cap', pose: 'stand' }, { id: 'cafe', color: '#9a5058', hat: 'apron', pose: 'stand' },
  { id: 'sleep-1', color: '#8cc05a', hat: 'none', pose: 'sleep' }, { id: 'sleep-2', color: '#e39a8c', hat: 'none', pose: 'sleep' }];
var BTNS = ['btn-shop-clothes', 'btn-shop-goods', 'btn-cafe-seat', 'btn-cafe-lp', 'btn-plaza-stage', 'btn-plaza-board', 'btn-npc-clothes', 'btn-npc-goods', 'btn-npc-cafe', 'btn-in-clothes', 'btn-in-goods', 'btn-in-cafe', 'btn-in-hall'];   /* 바깥의 단추 열셋 (가게 · 카페 · 광장 · 문어 셋 · 문 넷) */
var BTNS2 = ['btn-in-home-1', 'btn-in-home-2', 'btn-in-home-3', 'btn-in-home-4', 'btn-in-salon', 'btn-npc-sleep-1', 'btn-npc-sleep-2', 'btn-npc-sleep-3', 'btn-npc-sleep-4'];   /* 11-24 문어 집 넷 · 미용실의 문 + 집 문어 넷 (낮엔 밖 — 그 문어가 그려진 자리 위) */
var NPCS4 = NPCS.concat([{ id: 'sleep-3', color: '#8898b0', hat: 'none', pose: 'stand' }, { id: 'sleep-4', color: '#b0a088', hat: 'none', pose: 'stand' }, { id: 'stylist', color: '#c46a86', hat: 'beret', pose: 'stand' }]);

async function open(browser, q, look, reduce) {   /* reduce = 움직임 줄이기 (설정 + 기기) */
  var ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1, locale: 'ko-KR', hasTouch: true, isMobile: true, reducedMotion: reduce ? 'reduce' : 'no-preference' });
  var rec = JSON.parse(JSON.stringify(REC)); if (reduce) rec.settings.motion = 'reduce';
  var page = await ctx.newPage(), errs = [];
  page.on('pageerror', function (e) { errs.push('pageerror: ' + e.message); });
  page.on('console', function (m) { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.addInitScript({ content: 'window.__ppolAwakeMs = 0; localStorage.setItem("ppolppol_v2", ' + JSON.stringify(JSON.stringify(rec)) + '); window.__ppolTest = { today: "2026-11-14" }; window.__ppolLook = ' + JSON.stringify(look || { hour: 13, weather: 'clear' }) + ';' });
  await page.goto('file://' + ROOT + '/index.html?dev=0&intro=0' + (q || ''));
  await page.waitForSelector('#btn-go:not(.away)', { timeout: 30000 });
  return { ctx: ctx, page: page, errs: errs };
}
/* 페이지 안 도우미: 마당으로 나가 (스텁이면 먼저 켠다) 마을을 짓고, 자리 옮기기 · 프레임 밀기 */
async function village(page) {
  return page.evaluate(async function () {
    var sc = APP.scene, K = Math.SQRT1_2, stub = typeof sc.debugVillageStub === 'function' ? sc.debugVillageStub() : false;
    await APP.goRoom('yard'); await new Promise(function (r) { setTimeout(r, 1200); });
    window.__V = {
      stub: stub,
      at: function (s, t) {   /* 내 캐릭터를 (s, t) 에 놓고 화면이 따라오게 한다 (따라가기는 스틱을 쥔 동안만이라 제자리에서 앞뒤로 민다) */
        sc.debugPlayerAt((s + t) * K, (s - t) * K);
        for (var f = 0; f < 160; f++) { sc.setPlayerInput({ x: 0, y: f % 2 ? 1 : -1 }); sc.debugSim(0.1, 1); }
        sc.setPlayerInput(null); sc.debugPlayerAt((s + t) * K, (s - t) * K); sc.debugSim(0.1, 6); this.frame();
      },
      frame: function () { sc.debugStep(0.1); if (stub) sc.debugVillageFrame(0.1); sc.debugStep(0.1); },
      run: async function (n, until) { for (var i = 0; i < n; i++) { sc.debugSim(0.05, 2); if (stub) sc.debugVillageFrame(0.1); await new Promise(function (r) { setTimeout(r, 0); }); if (until && until()) return true; } return !until; },
      st: function () { var a = sc.player().at; return [(a[0] + a[2]) * K, (a[0] - a[2]) * K]; },
      clock: function (h) { window.__ppolLook.hour = h; sc.setTime(h, true); }   /* 장면 시각과 앱 시계를 같이 — 앱은 1 분마다 scene.setTime(hourNow()) 를 불러 (hourNow = __ppolLook.hour) 장면만 바꾸면 그 틱에 되돌아간다 (11-28 검토) */
    };
    return { stub: stub, info: sc.villageInfo(), view: sc.view() };
  });
}

(async function () {
  var browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  try {
    /* ── A. 마을 위에서 ── */
    var o = await open(browser, '&wide=1'), page = o.page;
    var v = await village(page), mode = v.stub ? 'stub (갈래 W 없음)' : 'wide (갈래 W 의 땅)';
    console.log('mode: ' + mode);
    ok(v.view === 'yard' && v.info.on && v.info.built, '마당에 나가면 마을이 지어진다');
    ok(v.info.reg.builders >= 1 && v.info.reg.spots >= 10 && v.info.reg.boxes >= 6 && v.info.reg.circles >= 30 && v.info.reg.segments >= 4 && v.info.reg.frame >= 1, '등록부가 채워졌다 ' + JSON.stringify(v.info.reg));

    lap('A1. NPC');
    /* A1. NPC: npcSet 으로 나타나고 사라진다 · 자리 = npcSpots · 표시 */
    var n1 = await page.evaluate(function (list) {
      var sc = APP.scene, r = {}; r.spots = sc.npcSpots(); r.n = sc.npcSet(list); __V.frame(); r.info = sc.villageInfo().npcs;
      r.mark = sc.npcMark('clothes', true); r.marks = sc.villageInfo().marks; r.markNo = sc.npcMark('sleep-3', true); sc.npcMark('clothes', false); r.marks0 = sc.villageInfo().marks;
      r.same = sc.npcSet(list); r.one = sc.npcSet([list[0], { id: 'nobody', color: '#ffffff' }, { id: 'goods', color: 'red', hat: 'crown', pose: 'dance' }]); r.info1 = sc.villageInfo().npcs;
      r.zero = sc.npcSet([], { all: true }); r.info0 = sc.villageInfo().npcs; sc.npcSet(list); return r;
    }, NPCS);
    ok(n1.spots.length === 7 && n1.spots.every(function (s) { return typeof s.x === 'number' && typeof s.z === 'number' && typeof s.face === 'number'; }), 'npcSpots 일곱');
    ok(n1.n === 5 && n1.info.length === 5, 'npcSet 다섯 → 다섯이 그려진다');
    ok(n1.info.every(function (q) { var s = n1.spots.filter(function (p) { return p.id === q.id; })[0]; return s && Math.abs(s.x - q.at[0]) < 1e-6 && Math.abs(s.z - q.at[2]) < 1e-6 && Math.abs(q.at[1] - s.y) <= 0.05; }), '그려진 자리 = npcSpots');
    ok(n1.mark === true && n1.marks.join() === 'clothes' && n1.markNo === false && n1.marks0.length === 0, 'npcMark 켜고 끄기 (없는 문어는 false)');
    ok(n1.same === 5 && n1.one === 2 && n1.info1.length === 2, '목록에 없는 문어는 지워진다 · 모르는 id 는 버린다 · 모르는 모자 · 자세는 기본값');
    ok(n1.zero === 0 && n1.info0.length === 0, 'npcSet([]) 은 모두 지운다');

    lap('A2. 단추');
    /* A2. 단추: 자리가 화면 안이면 단추가 그 위에 · 밖이면 숨는다 (여섯 곳에서) */
    var seen = {};
    await page.evaluate(function (list) { APP.scene.npcSet(list); }, NPCS4);   /* 집 문어 넷 다 (낮 13 시 = 밖) */
    for (var pt of [[26.5, -1.8], [26.5, 1.8], [25.6, -2.15], [33.5, 4.6], [32.4, 6.2], [41.2, -1.5], [44.4, 2.6], [16.1, -2.6], [16.1, 2.6], [41.9, -7.5], [41.9, 7.5], [19.6, -2.7], [33.4, -2.0], [55, -7.9], [55.3, 4.7]]) {
      var b2 = await page.evaluate(function (a) {
        __V.at(a.pt[0], a.pt[1]); var sc = APP.scene, box = document.getElementById('scene').getBoundingClientRect(), out = [], drawn = {};
        sc.villageInfo().npcs.forEach(function (q) { drawn[q.id] = q.at; });
        a.btns.forEach(function (id) {
          var el = document.getElementById(id), sp = VILLAGE.spot(id) || VILLAGE.DOORS.filter(function (d) { return d.btn === id; })[0], q = VILLAGE.xz(sp.s, sp.t), r = el.getBoundingClientRect();
          var res = /^btn-npc-sleep/.test(id), at = res ? drawn[sp.npc] : null, p = res ? (at ? sc.screenOf(at[0], at[1] + 0.35, at[2]) : { x: -999, y: -999 }) : sc.screenOf(q[0], sp.y, q[1]);   /* 집 문어 단추 = 그려진 문어 위 (바닷가는 모래 높이) */
          out.push({ id: id, hidden: el.hidden, px: [p.x, p.y], rect: [r.left - box.left, r.top - box.top, r.width, r.height], w: box.width, h: box.height });
        });
        return out;
      }, { pt: pt, btns: BTNS.concat(BTNS2) });
      b2.forEach(function (q) {
        var inside = q.px[0] > 30 && q.px[0] < q.w - 30 && q.px[1] > 80 && q.px[1] < q.h - 120;   /* 가장자리 · 위 막대 · 아래 단추 자리는 판단하지 않는다 */
        if (!q.hidden) { seen[q.id] = true; ok(q.rect[2] >= 44 && q.rect[3] >= 44, q.id + ' 단추가 44 px 이상'); if (inside) ok(q.px[0] >= q.rect[0] - 2 && q.px[0] <= q.rect[0] + q.rect[2] + 2 && q.px[1] >= q.rect[1] - 2 && q.px[1] <= q.rect[1] + q.rect[3] + 2, q.id + ' 단추가 자리 위에 있다 (' + pt + ')'); }
        else if (inside) ok(false, q.id + ' 자리가 화면 안인데 단추가 숨었다 (' + pt + ') ' + JSON.stringify(q.px.map(Math.round)));
      });
    }
    ok(BTNS2.every(function (id) { return seen[id] || v.stub; }), '새 단추 아홉 (집 문 넷 · 미용실 문 · 집 문어 넷) 이 다 한 번은 보였다: ' + BTNS2.filter(function (id) { return !seen[id]; }).join(' '));
    await page.evaluate(function (list) { APP.scene.npcSet(list); }, NPCS);
    ok(BTNS.every(function (id) { return seen[id] || (v.stub && /clothes$/.test(id) && id !== 'btn-npc-clothes'); }),   /* 스텁 (W 가 합쳐지기 전 · 화면 폭 6.7 m) 에선 옷가게 문 · 옷걸이가 화면 가장자리 22 px 밖 — W 의 10 m 화면에선 보인다 */ '바깥 단추 열셋이 다 한 번은 보였다: ' + BTNS.filter(function (id) { return !seen[id]; }).join(' '));

    lap('A3. 누르면');
    /* A3. 누르면 걸어가서 누른다 (멀리서) · 가까이서는 바로 · 걷다가 스틱을 밀면 눌리지 않는다 */
    var t3 = await page.evaluate(async function () {
      var sc = APP.scene, r = {}, el = document.getElementById('btn-npc-clothes'), n = 0, sp = VILLAGE.spot('npcClothes');
      el.addEventListener('click', function () { n++; });
      __V.at(27.5, 1.6); r.near0 = sc.villageNear('btn-npc-clothes');
      el.click(); r.n0 = n; r.walking = sc.player().walking;
      r.done = await __V.run(200, function () { return n > 0; }); r.n1 = n; var p = __V.st(); r.d = Math.hypot(p[0] - sp.stand[0], p[1] - sp.stand[1]); r.near1 = sc.villageNear('btn-npc-clothes');
      el.click(); r.n2 = n;
      __V.at(27.5, 1.6); el.click(); await __V.run(4); sc.setPlayerInput({ x: 1, y: 0 }); await __V.run(6); sc.setPlayerInput(null); await __V.run(60); r.n3 = n;
      /* 식탁 너머에서 카페 자리 단추: 길 찾기로 돌아가 선다 */
      var seat = document.getElementById('btn-cafe-seat'), m = 0; seat.addEventListener('click', function () { m++; });
      __V.at(34.6, 5.6); seat.click(); r.seatDone = await __V.run(260, function () { return m > 0; }); var q = __V.st(), a = VILLAGE.CAFE.seat.aisle; r.seatD = Math.hypot(q[0] - a[0], q[1] - a[1]);
      return r;
    });
    ok(t3.near0 === false && t3.n0 === 0 && t3.walking, '멀리서 누르면 바로 눌리지 않고 걷기 시작한다');
    ok(t3.done && t3.n1 === 1 && t3.d <= 0.35 && t3.near1 === true, '걸어가 선 뒤 한 번 눌린다 (자리에서 ' + t3.d.toFixed(2) + ' m)');
    ok(t3.n2 === 2, '가까이서는 바로 눌린다');
    ok(t3.n3 === 2, '걷다가 스틱을 밀면 눌리지 않는다');
    ok(t3.seatDone && t3.seatD <= 0.35, '식탁 너머에서 카페 자리까지 돌아가 선다 (' + t3.seatD.toFixed(2) + ' m)');

    /* A3b. 11-28 (검증) 길 찾기가 내 캐릭터가 부딪히는 것 모두 (등록부: 숲길 벤치 · 덤불 · 해변 배 · 바위 · 표지판) 를 돌아간다.
       가. 셈만: 걷는 곳의 격자 → 모든 문 · 자리. 어느 구간도 둘레 (r + 몸 0.25) 를 파고들지 않고 걷는 곳을 벗어나지 않는다
       나. 진짜 걸음 (60 프레임 걸음): 검증에서 섰던 자리들 — 한 번 눌러 서는 자리 0.3 m 안에 서고, 길을 다시 잡지 않는다 */
    lap('A3b. 길 찾기');
    var t3b = await page.evaluate(async function () {
      var sc = APP.scene, K = Math.SQRT1_2, BODY = 0.25, cols = sc.debugVillageCols(), r = { nC: cols.circles.length, nB: cols.boxes.length, n: 0, hit: 0, walk: 0, first: '', maxMs: 0, walks: [] };
      function pen(x, z) { var p = -1e9, i, c, b, d; for (i = 0; i < cols.circles.length; i++) { c = cols.circles[i]; d = c[2] + BODY - Math.hypot(x - c[0], z - c[1]); if (d > p) p = d; }
        for (i = 0; i < cols.boxes.length; i++) { b = cols.boxes[i]; d = Math.min(x - (Math.min(b[0], b[2]) - BODY), Math.max(b[0], b[2]) + BODY - x, z - (Math.min(b[1], b[3]) - BODY), Math.max(b[1], b[3]) + BODY - z); if (d > p) p = d; } return p; }
      var targets = VILLAGE.SPOTS.map(function (sp) { return [sp.btn, sp.stand]; }).concat(VILLAGE.DOORS.map(function (d) { return [d.btn, d.stand]; })), starts = [];
      for (var s = 5.3; s <= 59.5; s += 0.9) for (var t = -11.5; t <= 11.5; t += 0.7) { if (VILLAGE.inWalk(s, t, 0.1) && pen((s + t) * K, (s - t) * K) < -0.05) starts.push([+s.toFixed(2), +t.toFixed(2)]); }
      r.starts = starts.length;
      starts.forEach(function (p, pi) { targets.forEach(function (tg, ti) {
        if ((pi * 7 + ti) % 5) return;
        var t0 = performance.now(), rt = VILLAGE.route(p, tg[1], null, cols), ms = performance.now() - t0, prev = p, eq = [(tg[1][0] + tg[1][1]) * K, (tg[1][0] - tg[1][1]) * K], pe = Math.max(0, pen(eq[0], eq[1])), bad = '';
        r.n++; if (ms > r.maxMs) r.maxMs = ms;
        rt.forEach(function (q2, li) {
          var a = [(prev[0] + prev[1]) * K, (prev[0] - prev[1]) * K], b = [(q2[0] + q2[1]) * K, (q2[0] - q2[1]) * K], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(2, Math.ceil(L / 0.03));
          for (var k = 0; k <= n; k++) { var u = k / n, x = a[0] + (b[0] - a[0]) * u, z = a[1] + (b[1] - a[1]) * u;
            if (!VILLAGE.inWalk((x + z) * K, (x - z) * K, -0.03)) bad = bad || 'walk'; if (pen(x, z) > (li === rt.length - 1 ? pe : 0) + 1e-6) bad = 'hit'; }
          prev = q2;
        });
        if (bad === 'hit') r.hit++; else if (bad === 'walk') r.walk++;
        if (bad && !r.first) r.first = bad + ' (' + p + ') → ' + tg[0] + ' ' + rt.length + ' 구간';
      }); });
      /* 나. 진짜 걸음 */
      async function go(from, id) {
        var sp = VILLAGE.spot(id) || VILLAGE.DOORS.filter(function (d) { return d.btn === id; })[0], done = false, val, n = 0, a0 = sc.debugVillageWalk().again;
        sc.setPlayerInput(null); sc.debugPlayerAt((from[0] + from[1]) * K, (from[0] - from[1]) * K); sc.debugSim(1 / 60, 2);
        sc.villageGo(id).then(function (v) { done = true; val = v; }); await new Promise(function (res) { setTimeout(res, 0); });
        while (!done && n++ < 1500) { sc.debugSim(1 / 60, 3); await new Promise(function (res) { setTimeout(res, 0); }); }
        var q = __V.st(); return { from: from, id: id, val: done ? val : 'PENDING', d: +Math.hypot(q[0] - sp.stand[0], q[1] - sp.stand[1]).toFixed(3), again: sc.debugVillageWalk().again - a0, end: sc.debugVillageWalk().end, legs: VILLAGE.route(from, sp.stand, null, cols).length };
      }
      var W = [[[5.5, 0], 'btn-in-home-1'], [[10, 2.2], 'btn-in-home-1'], [[10, 2.75], 'btn-in-home-1'], [[13, -1.1], 'btn-in-home-1'], [[5.5, 0], 'btn-npc-sleep-1'],
        [[51.2, -1.2], 'btn-npc-sleep-3'], [[46.3, 0], 'btn-npc-sleep-3'], [[49, 0], 'btn-npc-sleep-3'], [[58.4, 6], 'btn-npc-sleep-3'], [[49.4, -0.4], 'btn-npc-sleep-4'], [[57.5, 2.8], 'btn-npc-sleep-4'], [[58.4, 8.4], 'btn-npc-sleep-4']];
      for (var wi = 0; wi < W.length; wi++) r.walks.push(await go(W[wi][0], W[wi][1]));
      /* 다. 마당 네모 안에서 (화면을 밀어 놓고 마을 단추를 누른 때): 울타리 문을 거쳐 간다 */
      r.yard = []; var Y = [[[0, 0], 'btn-in-home-1'], [[-1, 3], 'btn-in-home-4'], [[2, -2.5], 'btn-npc-sleep-1']];
      for (wi = 0; wi < Y.length; wi++) r.yard.push(await go(Y[wi][0], Y[wi][1]));
      return r;
    });
    ok(t3b.starts >= 300 && t3b.n >= 1500, '길 셈: 부딪힘 원 ' + t3b.nC + ' · 네모 ' + t3b.nB + ' · 출발 ' + t3b.starts + ' 자리 · ' + t3b.n + ' 갈래 (가장 오래 걸린 셈 ' + t3b.maxMs.toFixed(0) + ' ms)');
    ok(t3b.hit === 0 && t3b.walk === 0, '길 셈: 어느 구간도 둘레를 파고들지 않고 (' + t3b.hit + ') 걷는 곳을 벗어나지 않는다 (' + t3b.walk + ')' + (t3b.first ? ' — 첫째: ' + t3b.first : ''));
    ok(t3b.maxMs < 120, '길 셈이 한 번 누름에 견딜 만하다 (가장 오래 ' + t3b.maxMs.toFixed(0) + ' ms)');
    t3b.yard.forEach(function (w) { ok(v.stub || (w.val === true && w.d <= 0.3 && w.again <= 1), '마당 안 (' + w.from + ') 에서 누른 ' + w.id + ': 울타리 문을 거쳐 서는 자리까지 (' + w.d + ' m · 다시 잡은 길 ' + w.again + ' · ' + w.end + ')'); });
    t3b.walks.forEach(function (w) { ok(w.val === true && w.d <= 0.3 && w.again === 0, '걸음 (' + w.from + ') → ' + w.id + ': 서는 자리 0.3 m 안 (' + w.d + ' m · ' + w.legs + ' 구간 · 다시 잡은 길 ' + w.again + ' · ' + w.end + ')'); });

    lap('A4. 카페');
    /* A4. 카페 자리: 앉기 · 잔 · 일어나기 · 스틱으로 일어나기 · 알림 */
    var t4 = await page.evaluate(async function () {
      var sc = APP.scene, r = {}, ev = [];
      await __V.run(80, function () { return sc.cafeSeated(); });   /* (걸어가 앉는 중이면 다 앉을 때까지) */
      if (sc.cafeSeated()) { sc.cafeSit(false); await __V.run(60, function () { return !sc.cafeSeated() && !sc.playerSitting(); }); }   /* 카페 갈래가 합쳐져 있으면 A3 의 자리 단추가 진짜로 앉혔다 — 일으켜 세우고 시작 */
      await __V.run(10); document.addEventListener('ppol:cafe-seat', function (e) { ev.push(e.detail.on); });
      r.cupNo = sc.cafeCup(true);
      __V.at(32.2, 4.6); var p = sc.cafeSit(true), res = null; p.then(function (x) { res = x; });
      await __V.run(200, function () { return res !== null; }); r.sat = res; r.seated = sc.cafeSeated(); r.sitting = sc.playerSitting(); r.cup = sc.cafeCup(true); r.cupInfo = sc.villageInfo().cup;
      r.again = await sc.cafeSit(true); r.nearSeated = sc.villageNear('btn-cafe-lp');
      var q = sc.cafeSit(false), res2 = null; q.then(function (x) { res2 = x; }); await __V.run(80, function () { return res2 !== null; }); r.stood = res2; r.seated2 = sc.cafeSeated(); r.cup2 = sc.villageInfo().cup; r.sitting2 = sc.playerSitting();
      var a = VILLAGE.CAFE.seat.aisle, s = __V.st(); r.standD = Math.hypot(s[0] - a[0], s[1] - a[1]);
      res = null; sc.cafeSit(true).then(function (x) { res = x; }); await __V.run(200, function () { return res !== null; }); r.sat2 = res; sc.cafeCup(true);
      sc.setPlayerInput({ x: -1, y: 0 }); await __V.run(4); sc.setPlayerInput(null); await __V.run(30); r.stick = { seated: sc.cafeSeated(), sitting: sc.playerSitting(), cup: sc.villageInfo().cup }; s = __V.st(); r.stickS = s;
      r.ev = ev; r.stoodNo = await sc.cafeSit(false);
      return r;
    });
    ok(t4.cupNo === false, '앉기 전에는 잔이 나오지 않는다');
    ok(t4.sat === true && t4.seated && t4.sitting && t4.cup === true && t4.cupInfo, '걸어가 앉는다 · 잔이 나온다');
    ok(t4.again === false && t4.nearSeated === true, '앉은 채로 다시 앉기는 false · 앉은 채로 카페 것은 그 자리에서');
    ok(t4.stood === true && !t4.seated2 && !t4.cup2 && !t4.sitting2 && t4.standD <= 0.1, '일어나면 걸상 옆 통로에 선다 · 잔이 치워진다');
    ok(t4.sat2 === true && !t4.stick.seated && !t4.stick.sitting && !t4.stick.cup, '스틱을 밀면 일어난다 · 잔이 치워진다');
    ok(VILLAGE_inDeck(t4.stickS), '스틱으로 일어난 자리가 덱 · 길 안이다 ' + JSON.stringify(t4.stickS.map(function (x) { return +x.toFixed(2); })));
    ok(t4.ev.join() === 'true,false,true,false' && t4.stoodNo === false, "'ppol:cafe-seat' 알림 네 번 (앉음 · 일어남 · 앉음 · 일어남): " + t4.ev.join());

    lap('A5. 드로우콜');
    /* A5. 드로우콜: s 25 · 34 · 42 에서 네 각 — 바깥 전체 ≤ 150 · 마을 것만 ≤ 40 · 셰이더 프로그램 그대로. 밤 (등 · 빛 원판) 도 */
    var t5 = await page.evaluate(async function () {
      var sc = APP.scene, out = [], p0 = sc.stats().programs; sc.cafeSit(true); await __V.run(120, function () { return sc.cafeSeated(); }); sc.cafeCup(true); sc.npcMark('goods', true);
      for (var s of [25, 34, 42]) { __V.at(s, s === 34 ? 3.6 : 0); if (s === 34) { sc.cafeSit(true); await __V.run(120, function () { return sc.cafeSeated(); }); sc.cafeCup(true); }
        for (var y of [0, 90, 180, 270]) { sc.setYaw(y); sc.debugSim(0.1, 12); __V.frame(); var all = sc.stats().calls; sc.debugVillageHide(true); __V.frame(); var base = sc.stats().calls; sc.debugVillageHide(false); __V.frame(); out.push({ s: s, yaw: y, all: all, mine: all - base, cut: sc.villageInfo().cut }); }
        sc.setYaw(0); sc.debugSim(0.1, 12); if (s === 34) { sc.cafeSit(false); await __V.run(60); } }
      /* 새 집 넷의 문턱 (0.2 — 15° 넘게 돌면): 200° 에선 왼쪽 집 둘만 · 160° 에선 오른쪽 둘만 잘리고 가게 줄 (0.5 — 30° 넘게) 은 아직 · 10° 안쪽으로는 아무것도 */
      var cutAt = {}; __V.at(16.1, 0);
      [[180, 200], [180, 160], [0, 350], [0, 10]].forEach(function (q) { sc.setYaw(q[0], true); sc.debugSim(0.1, 2); sc.setYaw(q[1], true); sc.debugSim(0.1, 2); cutAt[q[1]] = sc.villageInfo().cut; });
      sc.setYaw(0, true); sc.debugSim(0.1, 4);
      /* 겨울: 지붕 눈은 그릴 것을 늘리지 않는다 (건물 덩어리의 꼭짓점 끝 토막 — 그리는 범위만 바뀐다). 마을 그룹 아래 보이는 메시 수가 철과 상관없이 같고, 겨울에도 예산 안.
         (드로우콜 수 자체는 겨울 해가 낮아 그림자 패스에 드는 메시가 한둘 달라질 수 있다 — 눈과는 상관없다) */
      var mine = function () { __V.frame(); var all = sc.stats().calls; sc.debugVillageHide(true); __V.frame(); var b = sc.stats().calls; sc.debugVillageHide(false); __V.frame(); return all - b; };
      var root = sc.wideReg.segments.filter(function (q) { return q.obj && /^vil-/.test(q.obj.name); })[0].obj.parent;
      var seen = function () { var n = 0, ranged = 0; root.traverse(function (m) { if (!m.isMesh) return; for (var p = m; p; p = p.parent) if (!p.visible) return; n++; if (m.geometry.drawRange.count !== Infinity) ranged++; }); return [n, ranged]; };
      var s0 = sc.seasonMode ? sc.seasonMode() : 'auto', win = [];
      for (var sw of [16.1, 25, 42]) { __V.at(sw, 0); var plain = mine(), m0 = seen(); sc.setSeason('winter'); sc.debugSim(0.1, 4); var wn = mine(), m1 = seen(), sn = sc.villageInfo().snowN; sc.setSeason(s0); sc.debugSim(0.1, 4); win.push({ s: sw, plain: plain, winter: wn, snowN: sn, m0: m0, m1: m1 }); }
      return { rows: out, p0: p0, p1: sc.stats().programs, cutAt: cutAt, win: win };
    });
    t5.rows.forEach(function (r) { ok(r.all <= 150 && r.mine <= 40 && r.mine > 0, 's ' + r.s + ' · ' + r.yaw + '°: 전체 ' + r.all + ' (≤ 150) · 마을 ' + r.mine + ' (≤ 40)'); });
    console.log('  draw calls (낮): ' + t5.rows.map(function (r) { return r.s + '/' + r.yaw + '° ' + r.all + '(' + r.mine + ')'; }).join(' · '));
    ok(t5.p1 === t5.p0, '셰이더 프로그램 수 그대로 (' + t5.p0 + ' → ' + t5.p1 + ')');
    var c90 = t5.rows.filter(function (r) { return r.yaw === 90; })[0].cut, c270 = t5.rows.filter(function (r) { return r.yaw === 270; })[0].cut, c0 = t5.rows[0].cut;
    ok(!c0.vilL && !c0.vilR && c90.vilL !== c90.vilR && c270.vilL !== c270.vilR && c90.vilL !== c270.vilL, '기본 각에선 안 자른다 · 90° 와 270° 에선 카메라 쪽 줄만 무릎 높이로 자른다');
    ok(['vilhL', 'vilhR', 'vilpL', 'vilpR'].every(function (k) { return c0[k] === false; }) && c90.vilhL === c90.vilL && c90.vilpL === c90.vilL && c90.vilhR === c90.vilR && c90.vilpR === c90.vilR && c270.vilhL === c270.vilL && c270.vilpL === c270.vilL && c270.vilhR === c270.vilR && c270.vilpR === c270.vilR,
      '새 집 넷 (숲길 둘 · 광장 집 · 미용실) 도 가게 줄과 같이 잘린다 — 제 쪽 줄이 잘리는 각에서만 (11-28 검토: 자르기가 없어 돌려 보면 문 앞의 캐릭터를 가렸다) ' + JSON.stringify(c270));
    var ca = t5.cutAt, on = function (c) { return Object.keys(c).filter(function (k) { return c[k]; }).sort().join(); };
    ok(on(ca[200]) === 'vilhL,vilpL' && on(ca[160]) === 'vilhR,vilpR' && on(ca[350]) === '' && on(ca[10]) === '', '새 집은 15° 넘게 돌면 제 쪽 둘만 잘린다 — 가게 줄 (30°) 보다 먼저 (11-28 검증: 줄의 문턱으론 자르기 직전 각에서 문 앞 캐릭터가 41 % 까지 가려졌다): 200° [' + on(ca[200]) + '] · 160° [' + on(ca[160]) + '] · 350° [' + on(ca[350]) + '] · 10° [' + on(ca[10]) + ']');
    t5.win.forEach(function (w) { ok(w.snowN === 6 && w.m1[0] === w.m0[0] && w.m0[1] === 6 && w.m1[1] === 0 && w.winter <= 40 && w.winter <= w.plain + 3, '겨울 s ' + w.s + ': 지붕 눈 여섯 덩어리는 따로 그리는 메시가 없다 (보이는 메시 ' + w.m0[0] + ' → ' + w.m1[0] + ' · 눈을 뺀 범위만 그리는 덩어리 ' + w.m0[1] + ' → ' + w.m1[1] + ') · 마을 드로우콜 ' + w.plain + ' → ' + w.winter + ' (≤ 40 — 11-28 검증: 눈을 따로 그리면 42 ~ 43)'); });
    /* A6. 콘테스트 (계약 C10 — 공연장 방 안의 자리): stage() 의 꼴 · stageDress · 심사 / 경쟁 문어는 바깥에 그려지지 않는다 */
    var t8 = await page.evaluate(function (list) {
      var sc = APP.scene, r = {}, st = sc.stage(); r.st = st;
      r.d0 = st.dressed; r.d1 = sc.stageDress(true); r.d2 = sc.stage().dressed; r.d3 = sc.stageDress(false);
      r.n = sc.npcSet(list.concat([{ id: 'judge0', color: '#3f9c9c', hat: 'beret', pose: 'sit' }, { id: 'rival0', color: '#d9694f', hat: 'none', pose: 'stand' }]));
      r.out = sc.villageInfo().npcs.map(function (q) { return q.id; }); r.placeNo = sc.npcPlace('nobody', 0, 0, 0); r.poseNo = sc.npcPose('nobody', 'sit');
      r.keeper = sc.npcPlace('clothes', sc.npcSpots()[0].x + 0.5, sc.npcSpots()[0].z, 0); r.kAt = sc.villageInfo().npcs.filter(function (q) { return q.id === 'clothes'; })[0].at[0] - sc.npcSpots()[0].x; sc.npcPlace('clothes', null);
      return r;
    }, NPCS);
    ok(t8.st.room === 'hall' && t8.st.path.length === 4 && t8.st.judges.length === 3 && t8.st.podium.length === 4 && t8.st.wait.length === 2 && t8.st.judges[0].length === 3, 'stage() 의 꼴 (공연장 방 안 좌표)');
    ok(t8.d0 === false && t8.d1 === true && t8.d2 === true && t8.d3 === false, 'stageDress 켜고 끄기');
    ok(t8.n === 7 && t8.out.indexOf('judge0') < 0 && t8.out.indexOf('rival0') < 0 && t8.out.length === 5, '심사 · 경쟁 문어는 npcSet 이 받되 바깥에는 그려지지 않는다');
    ok(t8.placeNo === false && t8.poseNo === false && t8.keeper === true && Math.abs(t8.kAt - 0.5) < 0.05, 'npcPlace: 마을 문어를 옮긴다 · 모르는 id 는 false');

    /* A7. 들어가는 방 (갈래 W 의 방 배관이 있을 때만): 들어가기 · 단추 · 가게 문어 · 드로우콜 ≤ 60 · 카페 자리 / 잔 / 레코드 · 나오기 */
    var hasRooms = await page.evaluate(function () { return typeof APP.scene.enterRoom === 'function' && APP.scene.villageRooms().reg; });
    if (!hasRooms) console.log('  (방 배관 없음 — 방은 debugVillageRoom 으로만 짓는다: 아래에서 짓기만 시험)');
    for (var rk of ['clothes', 'cafe', 'hall', 'goods']) {
      var t9 = await page.evaluate(async function (a) {
        var sc = APP.scene, r = { key: a.key };
        if (!a.has) { r.dbg = sc.debugVillageRoom(a.key); sc.debugStep(0.1); r.rooms = sc.villageRooms(); sc.debugVillageRoom(null); return r; }
        if (a.key === 'goods') r.shelfPre = sc.villageRooms().rooms.goods ? 'built' : sc.goodsShelf([{ type: 'dye', hex: '#40a040' }]);   /* 방을 짓기 전: 기억만 (−1) — 지을 때 그린다 */
        var res = null; sc.enterRoom(a.key).then(function (x) { res = x; }); await __V.run(500, function () { return res !== null; }); await __V.run(20); __V.frame();
        r.enter = res; r.in = sc.inRoom(); r.rooms = sc.villageRooms(); r.calls = sc.stats().calls; r.slots = sc.roomSlots(a.key);
        r.btns = VILLAGE.ROOMS[a.key].spots.map(function (sp) { var el = document.getElementById(sp.btn); return [sp.btn, !!el && !el.hidden]; });
        if (a.key === 'goods') { r.shelfBuilt = sc.villageRooms().rooms.goods.shelf; r.shelf1 = sc.goodsShelf([{ type: 'seed', key: 'seed', left: 3 }, { type: 'dye', hex: '#d04040' }, { type: 'dye', hex: '#40a040', sold: true }]); __V.frame(); r.callsShelf = sc.stats().calls; r.shelfV1 = sc.villageRooms().rooms.goods.shelf; r.shelfE = sc.goodsShelf([{ type: 'seed', left: 0 }]); r.shelfVE = sc.villageRooms().rooms.goods.shelf; r.shelf0 = sc.goodsShelf(null); }   /* 11-24 그날 파는 것 */
        if (a.key === 'hall') {   /* 공연장: 심사 · 경쟁 문어가 방 안에 · 시상대 위 · 무대 위에 서면 올려 그린다 */
          var st = sc.stage(); sc.stageDress(true); sc.npcSet([{ id: 'judge0', color: '#3f9c9c', hat: 'beret', pose: 'sit' }, { id: 'judge1', color: '#cdb94a', hat: 'apron', pose: 'sit' }, { id: 'judge2', color: '#a67c62', hat: 'cap', pose: 'sit' }, { id: 'rival0', color: '#d9694f', hat: 'none', pose: 'stand' }, { id: 'rival1', color: '#5c86b0', hat: 'none', pose: 'stand' }, { id: 'rival2', color: '#9a5058', hat: 'none', pose: 'stand' }]);
          sc.npcPlace('rival0', st.podium[0][0], st.podium[0][1], 0); sc.npcPlace('rival1', st.path[3][0] + 1.2, st.path[3][1] + 0.5, 0);
          __V.frame(); r.walking = sc.npcWalking().slice(); await __V.run(400, function () { return sc.npcWalking().length === 0; }); __V.frame(); r.hall = sc.villageRooms().hallNpcs; r.st = st;
          var wk = null; sc.npcWalk('rival2', st.path.slice()).then(function (x) { wk = x; }); await __V.run(600, function () { return wk !== null; }); r.walked = wk; r.r2 = sc.villageRooms().hallNpcs.filter(function (q) { return q.id === 'rival2'; })[0];
          sc.npcPlace('rival2', null); await __V.run(600, function () { return sc.npcWalking().length === 0; });
          sc.debugPlayerAt(st.wait[0], st.wait[1]); await __V.run(30); var W0 = document.getElementById('scene') ? document.getElementById('scene').getBoundingClientRect().width : 360; r.pathX = st.path.map(function (p, i) { return Math.round(sc.project(p[0], st.pathY[i] + 0.4, p[1]).x); }); r.sceneW = W0;
          sc.debugPlayerAt(st.path[1][0], st.path[1][1]); await __V.run(6); r.lift = sc.villageRooms().lift; sc.debugPlayerAt(st.wait[0], st.wait[1]); await __V.run(6); r.lift0 = sc.villageRooms().lift; r.calls2 = sc.stats().calls;
          sc.npcSet(a.list); r.hallKeep = sc.villageRooms().hallNpcs.length; sc.npcSet([], { all: true }); sc.stageDress(false); r.hall0 = sc.villageRooms().hallNpcs.length; sc.npcSet(a.list);
        }
        if (a.key === 'cafe') { sc.npcSet(a.list.concat([{ id: 'sleep-3', color: '#8898b0', hat: 'none', pose: 'sleep', room: 'cafe', slot: 'nap' }])); await __V.run(2); r.guests = sc.villageRooms().rooms.cafe.guests; r.outside = sc.villageInfo().npcs.map(function (q) { return q.id; }); sc.npcSet(a.list); }
        if (a.key === 'cafe') { var s = null; sc.cafeSit(true).then(function (x) { s = x; }); await __V.run(400, function () { return s !== null; }); r.sat = s; r.seated = sc.cafeSeated(); r.cup = sc.cafeCup(true); r.rec = sc.cafeRecord(true, '#3f6690'); __V.frame(); r.info = sc.villageRooms().rooms.cafe; var p = sc.player().at, S = VILLAGE.ROOMS.cafe.slots.seat; r.seatD = Math.hypot(p[0] - S[0], p[2] - S[2]); sc.cafeRecord(false); }
        var out = null; sc.leaveRoom().then(function (x) { out = x; }); await __V.run(500, function () { return out !== null; }); await __V.run(20); r.leave = out; r.after = sc.inRoom(); r.seatedAfter = sc.cafeSeated(); r.view = sc.view(); var pa = sc.player().at, dq = VILLAGE.DOORS.filter(function (q) { return q.room === a.key; })[0], k = Math.SQRT1_2; r.outD = dq ? Math.hypot((pa[0] + pa[2]) * k - dq.stand[0], (pa[0] - pa[2]) * k - dq.stand[1]) : 0;
        return r;
      }, { key: rk, has: hasRooms, list: NPCS });
      if (!hasRooms) { ok(t9.dbg === true && t9.rooms.rooms[rk] && (rk === 'hall' || t9.rooms.rooms[rk].keeper === true), rk + ' 방이 지어진다 (가게 문어 포함)'); continue; }
      ok(t9.enter && t9.enter.ok && t9.in === rk, rk + ' 에 들어간다');
      ok(t9.rooms.cur === rk && (rk === 'hall' || t9.rooms.rooms[rk].keeper === true), rk + ' 안에 가게 문어가 서 있다');
      if (rk === 'hall') { var hn = function (id) { return t9.hall.filter(function (q) { return q.id === id; })[0]; }; ok(t9.hall.length === 6 && Math.abs(hn('rival0').at[1] - t9.st.podium[0][2]) < 0.02 && Math.abs(hn('rival1').at[1] - t9.st.y) < 0.02 && Math.abs(hn('rival2').at[1]) < 0.02 && Math.abs(hn('judge1').at[0] - t9.st.judges[1][0]) < 0.02, '공연장: 문어 여섯 · 시상대 위 · 무대 위 · 바닥 · 심사석'); ok(t9.walking.length === 2 && t9.walked === true && Math.abs(t9.r2.at[1] - t9.st.pathY[3]) < 0.02 && Math.abs(t9.r2.at[2] - t9.st.path[3][1]) < 0.01, '공연장: 자리를 옮기면 걸어간다 (' + t9.walking.join() + ') · npcWalk 로 길 끝까지'); ok(t9.pathX.every(function (x) { return x > 8 && x < t9.sceneW - 8; }), '기다리는 자리에서 길의 네 점이 다 화면 안 (' + t9.pathX.join(' ') + ' / ' + t9.sceneW + ')'); ok(t9.hallKeep === 6, '마을 문어 목록만 다시 보내도 공연장의 여섯은 남는다'); ok(t9.lift > 0.25 && t9.lift0 < 0.05 && t9.calls2 <= 60 && t9.hall0 === 0, '공연장: 길 위에 서면 0.3 m 올려 그린다 (' + t9.lift + ' / ' + t9.lift0 + ') · 드로우콜 ' + t9.calls2); }
      ok(t9.calls <= 60, rk + ' 드로우콜 ' + t9.calls + ' (≤ 60)');
      if (rk === 'goods') ok(t9.shelfPre === -1 && t9.shelfBuilt > 0 && t9.shelfV1 > 0 && t9.shelfE === 0 && t9.shelfVE === 0, '잡화점 선반: 방을 짓기 전엔 기억만 (' + t9.shelfPre + ') · 지으면 그려져 있다 (꼭짓점 ' + t9.shelfBuilt + ') · 다 팔린 목록이면 빈 선반 (' + t9.shelfVE + ')');
      if (rk === 'goods') ok(t9.shelf1 === 3 * 4 + 12 * 4 && t9.shelf0 > t9.shelf1 && t9.callsShelf <= 60, '잡화점 선반 = 그날 파는 것: 씨앗 셋 · 염료 한 색 (팔린 색은 빈 칸) → 조각 ' + t9.shelf1 + ' · 목록 없으면 예전 진열 ' + t9.shelf0);
      ok(t9.slots && t9.slots.slots && (rk === 'hall' ? t9.slots.slots.stage : t9.slots.slots.keeper) && t9.slots.slots.exit && t9.slots.built, rk + ' roomSlots(key).slots 에 내 자리들');
      ok(t9.btns.filter(function (q) { return q[1]; }).length >= Math.min(3, t9.btns.length),   /* 방이 화면보다 넓어 먼 구석의 단추는 가려 있을 수 있다 */ rk + ' 단추가 보인다: ' + t9.btns.filter(function (q) { return !q[1]; }).map(function (q) { return q[0]; }).join(' '));
      if (rk === 'cafe') ok(t9.guests.join() === 'sleep-3' && t9.outside.indexOf('sleep-3') < 0, 'npcSet 의 room · slot: 카페 구석에서 자는 문어 (바깥에는 없다)');
      if (rk === 'cafe') ok(t9.sat === true && t9.seated && t9.cup === true && t9.rec === true && t9.info.cup && t9.info.record && t9.seatD < 0.1, '카페 안에서 앉기 · 잔 · 레코드 (걸상에서 ' + t9.seatD.toFixed(2) + ' m)');
      ok(t9.leave && t9.leave.ok && t9.after === null && t9.view === 'yard' && !t9.seatedAfter, rk + ' 에서 나온다 (앉은 채였어도 선 채로 밖에)');
      ok(t9.outD < 0.3, rk + ' 에서 나오면 문 앞 선 자리에 (' + t9.outD.toFixed(2) + ' m)');
    }
    /* A8. 11-28 (독립 검토) npcSet 의 목록 규칙: 콘테스트 문어만 든 목록은 마을을 그대로 둔다 · { extras } 는 여섯만 · { all } 은 다 · 자세 (npcPose) 는 시간 칸이 바뀌어도 남는다 · 제 걸상에 놓인 심사 문어는 걸상 높이 */
    if (hasRooms) {
      var tA = await page.evaluate(async function (list) {
        var sc = APP.scene, r = {}, yard = function () { return sc.villageInfo().npcs.map(function (q) { return q.id; }).sort().join(); }, hall = function () { return sc.villageRooms().hallNpcs; };
        var X = [0, 1, 2].map(function (i) { return { id: 'judge' + i, color: '#8a8494', hat: 'none', pose: 'stand' }; }).concat([0, 1, 2].map(function (i) { return { id: 'rival' + i, color: '#d9694f', hat: 'none', pose: 'stand' }; }));
        __V.clock(13); __V.at(30, 0); sc.npcSet(list, { all: true }); r.y0 = yard();
        r.nX = sc.npcSet(X); r.y1 = yard(); r.h1 = hall().length;
        var st = sc.stage(); st.judges.forEach(function (j, i) { sc.npcPlace('judge' + i, j[0], j[1], j[2]); sc.npcPose('judge' + i, 'sit'); });
        r.jy = hall().filter(function (q) { return /^judge/.test(q.id); }).map(function (q) { return q.at[1]; });
        sc.npcPose('clothes', 'sit');
        __V.clock(17.2); await __V.run(6); r.h17 = hall().filter(function (q) { return /^judge/.test(q.id); }).map(function (q) { return q.pose; }).join(); r.y17 = yard();
        r.k17 = (sc.villageInfo().npcs.filter(function (q) { return q.id === 'clothes'; })[0] || {}).pose;
        __V.clock(13); await __V.run(6); r.y13 = yard();
        r.nE = sc.npcSet([], { extras: true }); r.y2 = yard(); r.h2 = hall().length;
        sc.npcSet(X); r.nA = sc.npcSet([], { all: true }); r.y3 = yard(); r.h3 = hall().length;
        r.nB = sc.npcSet(list); r.y4 = yard();
        return r;
      }, NPCS);
      var Y0 = 'cafe,clothes,goods,sleep-1,sleep-2';
      ok(tA.y0 === Y0 && tA.nX === 11 && tA.y1 === Y0 && tA.h1 === 6, '콘테스트 문어만 든 목록은 마을 문어를 그대로 둔다 (' + tA.y1 + ' · 공연장 ' + tA.h1 + ')');
      ok(tA.jy.length === 3 && tA.jy.every(function (y) { return Math.abs(y - 0.3) < 0.01; }), '제 걸상에 놓인 (npcPlace) 심사 문어는 걸상 높이 0.3 에 (' + tA.jy.join(' ') + ')');
      ok(tA.h17 === 'sit,sit,sit' && tA.k17 === 'sit' && tA.y17 === 'cafe,clothes,goods' && tA.y13 === Y0, '시간 칸이 바뀌어 (13 → 17 시) 집 문어를 다시 놓아도 npcPose 의 자세는 남는다 (심사 ' + tA.h17 + ' · 옷가게 ' + tA.k17 + ' · 밖 ' + tA.y17 + ')');
      ok(tA.nE === 5 && tA.y2 === Y0 && tA.h2 === 0, 'npcSet([], { extras: true }) 는 콘테스트 문어만 지운다');
      ok(tA.nA === 0 && tA.y3 === '' && tA.h3 === 0 && tA.nB === 5 && tA.y4 === Y0, 'npcSet([], { all: true }) 는 다 지운다 · 마을 목록을 다시 주면 돌아온다');
    }
    ok(o.errs.length === 0, '오류 없음 (낮): ' + o.errs.slice(0, 3).join(' | '));
    await o.ctx.close();

    lap('── B. 밤');
    /* ── B. 밤: 등이 켜진다 · 드로우콜 ── */
    o = await open(browser, '&wide=1', { hour: 22, weather: 'clear' }); page = o.page; await village(page);
    var t6 = await page.evaluate(function (list) {
      var sc = APP.scene, out = []; sc.npcSet(list);
      [25, 34, 42].forEach(function (s) { __V.at(s, 0); var all = sc.stats().calls; sc.debugVillageHide(true); __V.frame(); var base = sc.stats().calls; sc.debugVillageHide(false); __V.frame(); out.push({ s: s, all: all, mine: all - base }); });
      return { rows: out, lamps: sc.villageInfo().lamps };
    }, NPCS);
    ok(t6.lamps === true, '밤에는 가로등이 켜진다');

    /* B2. 11-24 문어 집 넷 · 미용실 (밤 22 시 — 집 문어 넷은 집 안 침대). 11-28 (독립 검토) 다시 씀:
       · 진짜 먼 톡 — 단추를 그냥 누른다 (첫 누름은 걷기로, 문 앞에 서면 다시 눌려 들어간다). 예전엔 villageGo 를 직접 부르고 표시를 단 누름으로 들어가 '먼저 걸어가기' 를 지나치지 않았다
       · 사는 문어 · 미용사의 자리는 장면이 그린 자리 (npcWhere) 로 · 단추는 그 자리의 화면 좌표가 단추 네모 안인가로
       · 시각은 앱 시계와 같이 (__V.clock) · 저녁 (식탁) · 21 시 경계 · 아침 (나감) 을 집 안에 있는 채로
       · 미용실: 앉기 / 일어나기 · 앉은 동안 미용사가 다시 지어져도 의자 옆 · 문 단추로 나갈 때 인사 알림 · 앉은 채 나가면 밖에서 서 있다 (알림 true → false · 먼 단추가 걷는다) */
    if (hasRooms) {
      var t7 = await page.evaluate(async function (list) {
        var sc = APP.scene, K = Math.SQRT1_2, out = [], seatEv = [];
        document.addEventListener('ppol:salon-seat', function (e) { seatEv.push(e.detail.on + '@' + (sc.inRoom() || 'yard')); });
        var near = function (p, q, d) { return !!p && Math.hypot(p.x - q[0], p.z - q[2]) < (d || 0.15); };
        var over = function (id, x, y, z) {   /* 그 단추가 보이고, 방 안 (x, y, z) 의 화면 자리가 단추 네모 안인가 */
          var el = document.getElementById(id); if (!el || el.hidden) return false; var q = el.getBoundingClientRect(), b = document.getElementById('scene').getBoundingClientRect(), p = sc.project(x, y, z);
          return p.x >= q.left - b.left - 2 && p.x <= q.right - b.left + 2 && p.y >= q.top - b.top - 2 && p.y <= q.bottom - b.top + 2;
        };
        __V.clock(22); sc.npcSet(list);
        for (var d of ['inHome1', 'inHome2', 'inHome3', 'inHome4', 'inSalon']) {
          var D = VILLAGE.DOORS.filter(function (q) { return q.key === d; })[0], r = { key: d, room: D.room };
          var from = D.lot === 'home1' || D.lot === 'home4' ? [10, 0] : D.lot === 'empty' ? [26, 0] : [39.6, 0];   /* 광장 가운데 (42, 0) 는 우물 */
          __V.at(from[0], from[1]);
          var b = document.getElementById(D.btn); b.click(); await __V.run(3); r.in0 = sc.inRoom(); r.walk0 = !!sc.player().walking;
          await __V.run(1600, function () { return sc.inRoom() === D.room; }); await __V.run(20); __V.frame();
          r.in = sc.inRoom(); r.calls = sc.stats().calls; r.label = document.getElementById('scene').getAttribute('aria-label'); r.name = VILLAGE.ROOMS[D.room].name;
          var info = sc.villageRooms().rooms[D.room] || {}; r.frontHigh = info.frontHigh; r.look = info.look || null;
          var who = VILLAGE.homeOf(D.room);
          if (who) {
            var S2 = VILLAGE.ROOMS[D.room].slots, pb = sc.project(S2.bed[0], S2.bed[1] + 0.25, S2.bed[2]);
            r.who = who; r.atBed = near(sc.npcWhere(who), S2.bed); r.bedX = Math.round(pb.x); r.resBtn = over('btn-npc-sleep-' + D.room.slice(4), S2.bed[0], S2.bed[1] + 0.25, S2.bed[2]);
          }
          if (D.room === 'home1') {
            var S1 = VILLAGE.ROOMS.home1.slots, rb = document.getElementById('btn-npc-sleep-1');
            __V.clock(20.5); await __V.run(6); __V.frame(); r.eve = near(sc.npcWhere('sleep-1'), S1.table); r.eveBtn = over('btn-npc-sleep-1', S1.table[0], S1.table[1] + 0.45, S1.table[2]);
            __V.clock(21.2); await __V.run(6); __V.frame(); r.night = near(sc.npcWhere('sleep-1'), S1.bed);
            __V.clock(7.2); await __V.run(6); __V.frame(); r.morn = sc.npcWhere('sleep-1'); r.mornBtn = !rb.hidden; r.mornOpen = sc.homeOpen('home1').open;
            __V.clock(22); await __V.run(6); __V.frame(); r.back = near(sc.npcWhere('sleep-1'), S1.bed);
          }
          if (D.room === 'salon') {
            var SS = VILLAGE.ROOMS.salon.slots; r.sty0 = near(sc.npcWhere('stylist'), SS.keeper);
            var s1 = null; sc.salonSit(true).then(function (x) { s1 = x; }); await __V.run(600, function () { return s1 !== null; }); r.sat = s1; r.seated = sc.salonSeated(); await __V.run(4); __V.frame();
            r.sty1 = near(sc.npcWhere('stylist'), SS.stylistWork); var pk = sc.project(SS.stylistWork[0], 0.5, SS.stylistWork[2]), pc = sc.project(SS.chair[0], 0.6, SS.chair[2]); r.stylistX = Math.round(pk.x); r.chairX = Math.round(pc.x);
            sc.npcSet(list.map(function (w) { return w.id === 'stylist' ? { id: 'stylist', color: '#7a5ca8', hat: 'cap', pose: 'stand' } : w; })); await __V.run(2); r.sty1b = near(sc.npcWhere('stylist'), SS.stylistWork); sc.npcSet(list); await __V.run(2);
            var s2 = null; sc.salonSit(false).then(function (x) { s2 = x; }); await __V.run(300, function () { return s2 !== null; }); r.stood = s2; r.seated2 = sc.salonSeated(); r.sty2 = near(sc.npcWhere('stylist'), SS.keeper); r.ev = seatEv.join();
          }
          if (D.room === 'salon' && typeof sc.roomSpotGo === 'function') {   /* 미용실은 문 단추로 나간다: 문 쪽으로 걷기 시작하면 'ppol:room-leaving' (미용사 인사) — 아직 방 안일 때 한 번 */
            var lev = []; var onLv = function (e) { lev.push([e.detail.key, sc.inRoom()]); }; document.addEventListener('ppol:room-leaving', onLv);
            r.exitGo = sc.roomSpotGo('btn-room-exit'); await __V.run(900, function () { return sc.inRoom() === null; }); await __V.run(20);
            document.removeEventListener('ppol:room-leaving', onLv); r.leaveEv = JSON.stringify(lev);
          } else { var lv = null; sc.leaveRoom().then(function (x) { lv = x; }); await __V.run(500, function () { return lv !== null; }); await __V.run(20); }
          var pa = sc.player().at; r.outD = Math.hypot((pa[0] + pa[2]) * K - D.stand[0], (pa[0] - pa[2]) * K - D.stand[1]); r.after = sc.inRoom();
          if (D.room === 'salon') {   /* 앉은 채 나가기 (11-28 검토 MUST): 일어나지 않고 leaveRoom — 걷기 시작하면 일어나고, 밖에선 서 있고, 알림은 true → false, 그 뒤 먼 마을 단추가 걷는다 */
            var e2 = null; sc.enterRoom('salon').then(function (x) { e2 = x; }); await __V.run(600, function () { return e2 !== null; }); await __V.run(20);
            seatEv.length = 0; var s3 = null; sc.salonSit(true).then(function (x) { s3 = x; }); await __V.run(600, function () { return s3 !== null; }); await __V.run(4);
            var lv2 = null; sc.leaveRoom().then(function (x) { lv2 = x; }); await __V.run(900, function () { return lv2 !== null; }); await __V.run(10);
            r.ls = { sat: s3, left: !!(lv2 && lv2.ok), sittingOut: sc.playerSitting(), ev: seatEv.join(), flag: sc.salonSeated() };
            var g2 = null; sc.villageGo('btn-plaza-board').then(function (x) { g2 = x; }); await __V.run(900, function () { return g2 !== null; }); r.ls.go = g2;
          }
          out.push(r);
        }
        return { rows: out, W: document.getElementById('scene').getBoundingClientRect().width };
      }, NPCS4);
      var lum = function (hex) { var n = parseInt(hex.slice(1), 16); return 0.2126 * (n >> 16 & 255) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255); };
      t7.rows.forEach(function (r) {
        ok(r.in0 === null && r.walk0 === true && r.in === r.room, r.key + ': 먼 데서 문 톡 → 먼저 걸어가 (' + r.walk0 + ') 들어간다 (' + r.in + ')');
        ok(r.calls <= 60, r.key + ' 드로우콜 ' + r.calls + ' (≤ 60)');
        ok(r.label === r.name && !!r.name, r.key + ': 방 안의 #scene 이름 = ' + r.label + ' (그 방 이름)');
        ok(r.frontHigh === 0, r.key + ': 늘 잘리는 앞쪽 두 벽 (+x · +z) 에 무릎 위로 건 것 없음 (' + r.frontHigh + ')');
        if (r.look) ok(lum(r.look.fb) / lum(r.look.fa) > 0.75 && lum(r.look.fb) / lum(r.look.fa) < 1.35 && lum(r.look.wb) / lum(r.look.wa) > 0.75 && lum(r.look.wb) / lum(r.look.wa) < 1.35, r.key + ': 바닥 · 벽의 두 색이 가까운 짝 (' + r.look.fa + ' ' + r.look.fb + ' · ' + r.look.wa + ' ' + r.look.wb + ')');
        if (r.who) ok(r.atBed && r.bedX > 8 && r.bedX < t7.W - 8, r.key + ': 밤엔 사는 문어 (' + r.who + ') 가 침대에 그려져 있다 · 침대가 360 화면 안 (' + r.bedX + ')');
        if (r.who) ok(r.resBtn, r.key + ': 사는 문어 단추 (#btn-npc-sleep-N) 가 침대의 문어 위에 있다');
        if (r.room === 'home1') ok(r.eve && r.eveBtn && r.night && r.morn === null && !r.mornBtn && r.mornOpen === false && r.back, '집 안에 있는 채로 시간 칸이 바뀐다: 저녁엔 식탁 (' + r.eve + ' · 단추 ' + r.eveBtn + ') · 21 시 넘으면 침대 (' + r.night + ') · 아침엔 나가고 단추가 꺼진다 (' + JSON.stringify(r.morn) + ' · ' + r.mornBtn + ') · 다시 밤이면 침대 (' + r.back + ')');
        if (r.room === 'salon') ok(r.sat === true && r.seated && r.stood === true && !r.seated2 && r.ev === 'true@salon,false@salon' && r.stylistX > 8 && r.stylistX < t7.W - 8 && r.chairX > 8 && r.chairX < t7.W - 8, '미용실: 의자에 앉고 일어난다 · ppol:salon-seat (' + r.ev + ') · 의자 · 미용사 자리가 화면 안 (' + r.chairX + ' / ' + r.stylistX + ')');
        if (r.room === 'salon') ok(r.sty0 && r.sty1 && r.sty1b && r.sty2, '미용사: 평소 제자리 (' + r.sty0 + ') · 앉으면 의자 옆 (' + r.sty1 + ') · 앉은 동안 다시 지어져도 의자 옆 (' + r.sty1b + ') · 일어나면 제자리 (' + r.sty2 + ')');
        ok(r.after === null && r.outD < 0.3, r.key + ': 나오면 문 앞 선 자리 (' + r.outD.toFixed(2) + ' m)');
        if (r.room === 'salon') ok(r.exitGo === true && r.leaveEv === '[["salon","salon"]]', '미용실: 문 단추로 나가면 걷기 시작할 때 ppol:room-leaving 한 번 (아직 방 안) ' + r.leaveEv);
        if (r.room === 'salon') ok(r.ls && r.ls.sat === true && r.ls.left && r.ls.sittingOut === false && r.ls.flag === false && r.ls.ev === 'true@salon,false@salon' && r.ls.go === true, '미용실: 앉은 채 나가면 걷기 시작할 때 일어나고 밖에선 서 있다 · 알림 ' + (r.ls && r.ls.ev) + ' · 먼 마을 단추가 걷는다 (' + (r.ls && r.ls.go) + ')');
      });
      /* 낮 (12 시): 집이 비어 문이 잠긴다 — 먼 데서 눌러도 걸어간 뒤에야 사실 한 줄이 뜨고 들어가지 않는다 */
      var t8 = await page.evaluate(async function (list) {
        var sc = APP.scene, r = {}, K2 = Math.SQRT1_2; __V.clock(12); await __V.run(4);
        var toast = function () { var t = document.getElementById('toast'); return t && t.classList.contains('show') ? t.textContent : ''; };
        for (var w0 = 0; w0 < 120 && toast(); w0++) await new Promise(function (res) { setTimeout(res, 50); });   /* 앞에서 뜬 알림이 내려갈 때까지 */
        r.open = sc.homeOpen('home3'); r.out = sc.villageInfo().npcs.map(function (q) { return q.id; }).filter(function (id) { return /^sleep/.test(id); }).sort().join();
        var D = VILLAGE.DOORS.filter(function (q) { return q.key === 'inHome3'; })[0]; __V.at(39.6, 0);
        var b = document.getElementById(D.btn); b.click(); await __V.run(3); r.toast0 = toast(); r.walk0 = !!sc.player().walking;
        await __V.run(1600, function () { return !!toast(); }); r.toast = toast(); var p = __V.st(); r.toastD = Math.hypot(p[0] - D.stand[0], p[1] - D.stand[1]); await __V.run(30); r.in = sc.inRoom(); r.salon = sc.homeOpen('salon').open;
        /* 마을 길 집 (예전 빈 집) 낮: 마루의 문어 단추와 문 단추가 둘 다 보이고 44 px 넘게 떨어져 있다 · 먼 바닷가 문어 단추는 화면 밖이라 숨는다 */
        var D2 = VILLAGE.DOORS.filter(function (q) { return q.key === 'inHome2'; })[0]; __V.at(D2.stand[0], D2.stand[1]); await __V.run(4); __V.frame();
        var rc = function (id) { var e = document.getElementById(id), q = e.getBoundingClientRect(); return e.hidden ? null : [q.left + q.width / 2, q.top + q.height / 2, q.width, q.height]; };
        var a2 = rc('btn-npc-sleep-2'), d2 = rc('btn-in-home-2'); r.out2 = !!a2; r.door2 = !!d2; r.out3 = !document.getElementById('btn-npc-sleep-3').hidden;
        r.sep = a2 && d2 ? Math.hypot(a2[0] - d2[0], a2[1] - d2[1]) : -1; r.lap = a2 && d2 ? Math.max(0, Math.min(a2[0] + a2[2] / 2, d2[0] + d2[2] / 2) - Math.max(a2[0] - a2[2] / 2, d2[0] - d2[2] / 2)) * Math.max(0, Math.min(a2[1] + a2[3] / 2, d2[1] + d2[3] / 2) - Math.max(a2[1] - a2[3] / 2, d2[1] - d2[3] / 2)) : -1;
        /* 집 문어 단추도 먼 데서 누르면 먼저 걸어간다 (가게 문어와 같이): 첫 누름은 삼키고, 서는 자리에 선 뒤 다시 누른다 */
        var bb = document.getElementById('btn-npc-sleep-2'), cnt = 0, S2 = VILLAGE.spot('npcSleep2'); bb.addEventListener('click', function () { cnt++; });
        __V.at(24, 0); await __V.run(4); bb.click(); r.cnt0 = cnt;
        await __V.run(800, function () { return cnt > 0; }); r.cnt1 = cnt; var pa2 = sc.player().at; r.walkD = Math.hypot((pa2[0] + pa2[2]) * K2 - S2.stand[0], (pa2[0] - pa2[2]) * K2 - S2.stand[1]);
        /* 겨울: 새 지붕 넷에도 눈 (가게 두 줄 + 집 넷 = 눈 메시 여섯) */
        var s0 = sc.seasonMode ? sc.seasonMode() : 'auto'; sc.setSeason('winter'); await __V.run(4); r.snowN = sc.villageInfo().snowN; sc.setSeason(s0); await __V.run(2); r.snow0 = sc.villageInfo().snowN;
        __V.clock(22); return r;
      }, NPCS4);
      ok(t8.open.open === false && t8.open.line === '문이 잠겨 있어. 지금은 바닷가 바위에 있어.' && t8.salon === true, '낮엔 문어 집 문이 잠긴다 (' + t8.open.line + ') · 미용실은 열림');
      ok(t8.toast0 === '' && t8.walk0 === true && t8.toast === '문이 잠겨 있어. 지금은 바닷가 바위에 있어.' && t8.toastD < 0.5 && t8.in === null, '잠긴 문을 먼 데서 누르면 걸어간 뒤에 (문 앞 ' + (t8.toastD || 0).toFixed(2) + ' m) 한 줄이 뜨고 들어가지 않는다: ' + t8.toast);
      ok(t8.cnt0 === 0 && t8.cnt1 === 1 && t8.walkD < 0.5, '집 문어 단추: 먼 데서 누르면 걸어가 선 뒤에 눌린다 (' + t8.cnt0 + ' → ' + t8.cnt1 + ', 선 자리에서 ' + (t8.walkD || 0).toFixed(2) + ' m)');
      ok(t8.out2 && t8.door2 && !t8.out3, '낮: 마을 길 집 마루의 문어 단추 · 문 단추가 보인다 · 먼 바닷가 문어 단추는 화면 밖이라 숨는다');
      ok(t8.sep >= 44 && t8.lap === 0, '마루의 문어 단추와 문 단추가 44 px 넘게 떨어져 있다 (가운데 사이 ' + (t8.sep || 0).toFixed(0) + ' px · 겹침 ' + t8.lap + ')');
      ok(t8.out === 'sleep-1,sleep-2,sleep-3,sleep-4', '낮엔 집 문어 넷이 밖에 (' + t8.out + ')');
      ok(t8.snowN === 6 && t8.snow0 === 0, '겨울엔 새 지붕 넷에도 눈 (눈 메시 ' + t8.snowN + ' — 가게 두 줄 + 집 넷) · 다른 철엔 없다 (' + t8.snow0 + ')');
    }
    t6.rows.forEach(function (r) { ok(r.all <= 150 && r.mine <= 40, '밤 s ' + r.s + ': 전체 ' + r.all + ' · 마을 ' + r.mine); });
    console.log('  draw calls (밤): ' + t6.rows.map(function (r) { return r.s + ' ' + r.all + '(' + r.mine + ')'; }).join(' · '));
    ok(o.errs.length === 0, '오류 없음 (밤): ' + o.errs.slice(0, 3).join(' | '));
    await o.ctx.close();

    lap('── D. 움직임 줄이기');
    /* ── D. 움직임 줄이기 (11-28 독립 검토): 앉은 채 방을 나가면 — 걸음도 덮기도 없이 한 번에 바깥 — 밖에서 서 있다 (미용 의자 · 카페 걸상 둘 다). 일어남 알림이 오고, 먼 마을 단추가 걷는다 ── */
    if (hasRooms) {
      o = await open(browser, '&wide=1', { hour: 13, weather: 'clear' }, true); page = o.page; await village(page);
      var tD = await page.evaluate(async function (list) {
        var sc = APP.scene, out = { reduced: sc.motion ? sc.motion().reduced : null }; sc.npcSet(list);
        for (var room of ['salon', 'cafe']) {
          var ev = [], name = 'ppol:' + room + '-seat', on = function (e) { ev.push(e.detail.on + '@' + (sc.inRoom() || 'yard')); }; document.addEventListener(name, on);
          var D = VILLAGE.DOORS.filter(function (q) { return q.room === room; })[0]; __V.at(D.stand[0], D.stand[1]);
          var e1 = null; sc.enterRoom(room).then(function (x) { e1 = x; }); await __V.run(400, function () { return e1 !== null; }); await __V.run(6);
          var s1 = null; (room === 'salon' ? sc.salonSit(true) : sc.cafeSit(true)).then(function (x) { s1 = x; }); await __V.run(400, function () { return s1 !== null; }); await __V.run(4);
          var r = { in: sc.inRoom(), sat: s1, sitting: sc.playerSitting() };
          var lv = null; sc.leaveRoom().then(function (x) { lv = x; }); await __V.run(400, function () { return lv !== null; }); await __V.run(4); __V.frame();
          r.left = !!(lv && lv.ok); r.after = sc.inRoom(); r.sittingOut = sc.playerSitting(); r.ev = ev.join(); r.flag = room === 'salon' ? sc.salonSeated() : sc.cafeSeated();
          var p0 = __V.st(), g = null; sc.villageGo('btn-plaza-board').then(function (x) { g = x; }); await __V.run(400, function () { return g !== null; }); var p1 = __V.st(); r.go = g; r.moved = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
          document.removeEventListener(name, on); out[room] = r;
        }
        return out;
      }, NPCS4);
      ok(tD.reduced === true, '움직임 줄이기가 켜진 쪽');
      ['salon', 'cafe'].forEach(function (k) {
        var r = tD[k] || {};
        ok(r.in === k && r.sat === true && r.sitting === true, k + ' (움직임 줄이기): 들어가 앉는다');
        ok(r.left && r.after === null && r.sittingOut === false && r.flag === false, k + ' (움직임 줄이기): 앉은 채 나가면 밖에서 서 있다 (앉음 ' + r.sittingOut + ')');
        ok(/^true@\w+,false@\w+$/.test(r.ev || ''), k + ' (움직임 줄이기): 앉음 · 일어남 알림이 차례로 온다 (' + r.ev + ')');
        ok(r.go === true && r.moved > 1, k + ' (움직임 줄이기): 나온 뒤 먼 마을 단추가 걷는다 (' + (r.moved || 0).toFixed(1) + ' m)');
      });
      ok(o.errs.length === 0, '오류 없음 (움직임 줄이기): ' + o.errs.slice(0, 3).join(' | '));
      await o.ctx.close();
    }

    lap('── C. 넓은');
    /* ── C. 넓은 바깥이 꺼진 마당 (wide=0) · 2D 장면: 오류 없음 · 단추는 숨은 채 · 눌러도 아무 일 없음 ── */
    for (var q of ['&wide=0', '&scene=2d']) {
      o = await open(browser, q); page = o.page;
      var t7 = await page.evaluate(async function (btns) {
        var sc = APP.scene, r = { three: typeof sc.villageInfo === 'function' };
        if (r.three) { await APP.goRoom('yard'); await new Promise(function (res) { setTimeout(res, 1200); }); sc.debugStep(0.1); r.wide = sc.wide().on; r.info = sc.villageInfo(); r.set = sc.npcSet([{ id: 'clothes', color: '#5c86b0', hat: 'none', pose: 'stand' }]); r.sit = await sc.cafeSit(true); r.go = await sc.villageGo('btn-shop-clothes'); sc.debugStep(0.1); }
        r.hidden = btns.every(function (id) { var el = document.getElementById(id); return el && el.hidden; });
        var n = 0, el = document.getElementById('btn-shop-clothes'); el.addEventListener('click', function () { n++; }); el.click(); r.n = n;
        return r;
      }, BTNS);
      ok(t7.hidden, q + ': 마을 단추는 숨은 채');
      ok(q === '&scene=2d' ? !t7.three && t7.n === 1 : (t7.wide ? true : !t7.info.built && t7.sit === false && t7.go === false), q + ': 마을이 없으면 아무것도 짓지 않는다 ' + JSON.stringify({ three: t7.three, wide: t7.wide, built: t7.info && t7.info.built }));
      ok(o.errs.length === 0, q + ': 오류 없음 ' + o.errs.slice(0, 3).join(' | '));
      await o.ctx.close();
    }
  } finally { await browser.close(); }
  console.log('test-village-live: ' + pass + ' pass, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });

function VILLAGE_inDeck(p) { var V = require(path.join(ROOT, 'js/village.js')); return V.inWalk(p[0], p[1], -0.05); }
