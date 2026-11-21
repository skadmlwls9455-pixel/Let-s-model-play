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

async function open(browser, q, look) {
  var ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1, locale: 'ko-KR', hasTouch: true, isMobile: true });
  var page = await ctx.newPage(), errs = [];
  page.on('pageerror', function (e) { errs.push('pageerror: ' + e.message); });
  page.on('console', function (m) { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.addInitScript({ content: 'window.__ppolAwakeMs = 0; localStorage.setItem("ppolppol_v2", ' + JSON.stringify(JSON.stringify(REC)) + '); window.__ppolTest = { today: "2026-11-14" }; window.__ppolLook = ' + JSON.stringify(look || { hour: 13, weather: 'clear' }) + ';' });
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
      st: function () { var a = sc.player().at; return [(a[0] + a[2]) * K, (a[0] - a[2]) * K]; }
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
      r.zero = sc.npcSet([]); r.info0 = sc.villageInfo().npcs; sc.npcSet(list); return r;
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
    for (var pt of [[26.5, -1.8], [26.5, 1.8], [33.5, 4.6], [32.4, 6.2], [41.2, -1.5], [44.4, 2.6]]) {
      var b2 = await page.evaluate(function (a) {
        __V.at(a.pt[0], a.pt[1]); var sc = APP.scene, box = document.getElementById('scene').getBoundingClientRect(), out = [];
        a.btns.forEach(function (id) {
          var el = document.getElementById(id), sp = VILLAGE.spot(id) || VILLAGE.DOORS.filter(function (d) { return d.btn === id; })[0], q = VILLAGE.xz(sp.s, sp.t), p = sc.screenOf(q[0], sp.y, q[1]), r = el.getBoundingClientRect();
          out.push({ id: id, hidden: el.hidden, px: [p.x, p.y], rect: [r.left - box.left, r.top - box.top, r.width, r.height], w: box.width, h: box.height });
        });
        return out;
      }, { pt: pt, btns: BTNS });
      b2.forEach(function (q) {
        var inside = q.px[0] > 30 && q.px[0] < q.w - 30 && q.px[1] > 80 && q.px[1] < q.h - 120;   /* 가장자리 · 위 막대 · 아래 단추 자리는 판단하지 않는다 */
        if (!q.hidden) { seen[q.id] = true; ok(q.rect[2] >= 44 && q.rect[3] >= 44, q.id + ' 단추가 44 px 이상'); if (inside) ok(q.px[0] >= q.rect[0] - 2 && q.px[0] <= q.rect[0] + q.rect[2] + 2 && q.px[1] >= q.rect[1] - 2 && q.px[1] <= q.rect[1] + q.rect[3] + 2, q.id + ' 단추가 자리 위에 있다 (' + pt + ')'); }
        else if (inside) ok(false, q.id + ' 자리가 화면 안인데 단추가 숨었다 (' + pt + ') ' + JSON.stringify(q.px.map(Math.round)));
      });
    }
    ok(BTNS.every(function (id) { return seen[id]; }), '바깥 단추 열셋이 다 한 번은 보였다: ' + BTNS.filter(function (id) { return !seen[id]; }).join(' '));

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
      return { rows: out, p0: p0, p1: sc.stats().programs };
    });
    t5.rows.forEach(function (r) { ok(r.all <= 150 && r.mine <= 40 && r.mine > 0, 's ' + r.s + ' · ' + r.yaw + '°: 전체 ' + r.all + ' (≤ 150) · 마을 ' + r.mine + ' (≤ 40)'); });
    console.log('  draw calls (낮): ' + t5.rows.map(function (r) { return r.s + '/' + r.yaw + '° ' + r.all + '(' + r.mine + ')'; }).join(' · '));
    ok(t5.p1 === t5.p0, '셰이더 프로그램 수 그대로 (' + t5.p0 + ' → ' + t5.p1 + ')');
    var c90 = t5.rows.filter(function (r) { return r.yaw === 90; })[0].cut, c270 = t5.rows.filter(function (r) { return r.yaw === 270; })[0].cut, c0 = t5.rows[0].cut;
    ok(!c0.vilL && !c0.vilR && c90.vilL !== c90.vilR && c270.vilL !== c270.vilR && c90.vilL !== c270.vilL, '기본 각에선 안 자른다 · 90° 와 270° 에선 카메라 쪽 줄만 무릎 높이로 자른다');
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
        var res = null; sc.enterRoom(a.key).then(function (x) { res = x; }); await __V.run(500, function () { return res !== null; }); await __V.run(20); __V.frame();
        r.enter = res; r.in = sc.inRoom(); r.rooms = sc.villageRooms(); r.calls = sc.stats().calls; r.slots = sc.roomSlots(a.key);
        r.btns = VILLAGE.ROOMS[a.key].spots.map(function (sp) { var el = document.getElementById(sp.btn); return [sp.btn, !!el && !el.hidden]; });
        if (a.key === 'hall') {   /* 공연장: 심사 · 경쟁 문어가 방 안에 · 시상대 위 · 무대 위에 서면 올려 그린다 */
          var st = sc.stage(); sc.stageDress(true); sc.npcSet([{ id: 'judge0', color: '#3f9c9c', hat: 'beret', pose: 'sit' }, { id: 'judge1', color: '#cdb94a', hat: 'apron', pose: 'sit' }, { id: 'judge2', color: '#a67c62', hat: 'cap', pose: 'sit' }, { id: 'rival0', color: '#d9694f', hat: 'none', pose: 'stand' }, { id: 'rival1', color: '#5c86b0', hat: 'none', pose: 'stand' }, { id: 'rival2', color: '#9a5058', hat: 'none', pose: 'stand' }]);
          sc.npcPlace('rival0', st.podium[0][0], st.podium[0][1], 0); sc.npcPlace('rival1', st.path[3][0] + 1.2, st.path[3][1] + 0.5, 0); __V.frame(); r.hall = sc.villageRooms().hallNpcs; r.st = st;
          sc.debugPlayerAt(st.path[1][0], st.path[1][1]); await __V.run(6); r.lift = sc.villageRooms().lift; sc.debugPlayerAt(st.wait[0], st.wait[1]); await __V.run(6); r.lift0 = sc.villageRooms().lift; r.calls2 = sc.stats().calls;
          sc.npcSet([]); sc.stageDress(false); r.hall0 = sc.villageRooms().hallNpcs.length;
        }
        if (a.key === 'cafe') { var s = null; sc.cafeSit(true).then(function (x) { s = x; }); await __V.run(400, function () { return s !== null; }); r.sat = s; r.seated = sc.cafeSeated(); r.cup = sc.cafeCup(true); r.rec = sc.cafeRecord(true, '#3f6690'); __V.frame(); r.info = sc.villageRooms().rooms.cafe; var p = sc.player().at, S = VILLAGE.ROOMS.cafe.slots.seat; r.seatD = Math.hypot(p[0] - S[0], p[2] - S[2]); sc.cafeRecord(false); }
        var out = null; sc.leaveRoom().then(function (x) { out = x; }); await __V.run(500, function () { return out !== null; }); await __V.run(20); r.leave = out; r.after = sc.inRoom(); r.seatedAfter = sc.cafeSeated(); r.view = sc.view();
        return r;
      }, { key: rk, has: hasRooms });
      if (!hasRooms) { ok(t9.dbg === true && t9.rooms.rooms[rk] && (rk === 'hall' || t9.rooms.rooms[rk].keeper === true), rk + ' 방이 지어진다 (가게 문어 포함)'); continue; }
      ok(t9.enter && t9.enter.ok && t9.in === rk, rk + ' 에 들어간다');
      ok(t9.rooms.cur === rk && (rk === 'hall' || t9.rooms.rooms[rk].keeper === true), rk + ' 안에 가게 문어가 서 있다');
      if (rk === 'hall') { var hn = function (id) { return t9.hall.filter(function (q) { return q.id === id; })[0]; }; ok(t9.hall.length === 6 && Math.abs(hn('rival0').at[1] - t9.st.podium[0][2]) < 0.02 && Math.abs(hn('rival1').at[1] - t9.st.y) < 0.02 && Math.abs(hn('rival2').at[1]) < 0.02 && Math.abs(hn('judge1').at[0] - t9.st.judges[1][0]) < 0.02, '공연장: 문어 여섯 · 시상대 위 · 무대 위 · 바닥 · 심사석'); ok(t9.lift > 0.25 && t9.lift0 < 0.05 && t9.calls2 <= 60 && t9.hall0 === 0, '공연장: 길 위에 서면 0.3 m 올려 그린다 (' + t9.lift + ' / ' + t9.lift0 + ') · 드로우콜 ' + t9.calls2); }
      ok(t9.calls <= 60, rk + ' 드로우콜 ' + t9.calls + ' (≤ 60)');
      ok(t9.slots && t9.slots.slots && t9.slots.slots.keeper && t9.slots.slots.exit && t9.slots.built, rk + ' roomSlots(key).slots 에 내 자리들');
      ok(t9.btns.filter(function (q) { return q[1]; }).length >= Math.min(4, t9.btns.length), rk + ' 단추가 보인다: ' + t9.btns.filter(function (q) { return !q[1]; }).map(function (q) { return q[0]; }).join(' '));
      if (rk === 'cafe') ok(t9.sat === true && t9.seated && t9.cup === true && t9.rec === true && t9.info.cup && t9.info.record && t9.seatD < 0.1, '카페 안에서 앉기 · 잔 · 레코드 (걸상에서 ' + t9.seatD.toFixed(2) + ' m)');
      ok(t9.leave && t9.leave.ok && t9.after === null && t9.view === 'yard' && !t9.seatedAfter, rk + ' 에서 나온다 (앉은 채였어도 선 채로 밖에)');
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
    t6.rows.forEach(function (r) { ok(r.all <= 150 && r.mine <= 40, '밤 s ' + r.s + ': 전체 ' + r.all + ' · 마을 ' + r.mine); });
    console.log('  draw calls (밤): ' + t6.rows.map(function (r) { return r.s + ' ' + r.all + '(' + r.mine + ')'; }).join(' · '));
    ok(o.errs.length === 0, '오류 없음 (밤): ' + o.errs.slice(0, 3).join(' | '));
    await o.ctx.close();

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
