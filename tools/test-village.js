/* 마을 표 (js/village.js) 시험 — node 만 (11-21 7차 갈래 V). 계약 C6 (wip/round7/briefs/COMMON.md) 의 배치 · 단추 · NPC 자리와 맞는지, 표끼리 어긋나지 않는지.
   실행: node tools/test-village.js */
var fs = require('fs'), path = require('path'), ROOT = path.resolve(__dirname, '..');
var V = require(path.join(ROOT, 'js/village.js'));
var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.error('  ✗ ' + m); } }
function near(a, b, e) { return Math.abs(a - b) <= (e == null ? 1e-9 : e); }

/* 1. 좌표 변환 */
var q = V.xz(25, -3), b = V.st(q[0], q[1]);
ok(near(b[0], 25, 1e-9) && near(b[1], -3, 1e-9), 'xz ↔ st 가 서로 역이다');
ok(near(V.xz(Math.SQRT2, 0)[0], 1) && near(V.xz(Math.SQRT2, 0)[1], 1), 's 는 (x + z)/√2');
var m1 = V.local([24.6, -5.1], false, 1.8, -0.7), m2 = V.local([24.6, 5.1], true, 1.8, -0.7);
ok(near(m1[0], m2[0], 1e-9) && near(m1[1], -m2[1], 1e-9), '오른쪽 줄은 왼쪽 줄을 길 건너편에 비춘 꼴');

/* 2. 터 표: C6 의 범위 · 서로 겹치지 않음 · 건물 몸이 걷는 곳 (|t| ≤ 3) 을 침범하지 않음 */
var C6 = { clothes: [22, 28, -1], goods: [22, 28, 1], empty: [30, 36, -1], cafe: [30, 37, 1], plaza: [38, 46, 0] };
ok(V.LOTS.length === 5, '터 다섯');
V.LOTS.forEach(function (L) {
  var c = C6[L.id]; ok(!!c, '아는 터: ' + L.id); if (!c) return;
  ok(L.s0 === c[0] && L.s1 === c[1], L.id + ' s 범위가 C6 과 같다');
  if (c[2]) ok(Math.sign(L.c[1]) === c[2] && L.mir === (c[2] > 0), L.id + ' 는 ' + (c[2] < 0 ? '왼쪽' : '오른쪽') + ' 줄');
  if (L.hx) {
    var r = (L.hx + L.hz) * Math.SQRT1_2;   /* 마름모의 s · t 반폭 */
    ok(Math.abs(L.c[1]) - r >= 3.1, L.id + ' 몸이 길 밖이다 (' + (Math.abs(L.c[1]) - r).toFixed(2) + ')');
    ok(L.c[0] - r >= L.s0 - 0.6 && L.c[0] + r <= L.s1 + 0.6, L.id + ' 몸이 제 터의 s 범위 안이다');
  }
});
ok(V.DECK.s0 === 30 && V.DECK.s1 === 37 && V.DECK.t0 === 3.5 && V.DECK.t1 === 7, '카페 덱 = C6 (s 30–37 · t 3.5–7)');

/* 3. 단추: C6 의 id 열 개 · 이름 · 서는 자리가 걷는 곳 안 · 자리와 서는 자리가 2.4 m 안 */
var BTN = { 'btn-shop-clothes': '옷가게', 'btn-shop-goods': '잡화점', 'btn-cafe-seat': '카페 자리', 'btn-cafe-lp': '레코드', 'btn-plaza-stage': '콘테스트 무대', 'btn-plaza-board': '마을 게시판',
  'btn-npc-clothes': '가게 문어', 'btn-npc-goods': '가게 문어', 'btn-npc-cafe': '가게 문어', 'btn-npc-sleep-1': '집 문어', 'btn-npc-sleep-2': '집 문어', 'btn-npc-sleep-3': '집 문어', 'btn-npc-sleep-4': '집 문어' };
ok(V.SPOTS.length === 13, '바깥의 누르는 자리 열셋 (카페 주문은 방 안으로 · 집 문어 넷)');
var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), seenKey = {};
V.SPOTS.forEach(function (s) {
  ok(BTN[s.btn] === s.label, s.btn + ' 이름 = ' + BTN[s.btn]);
  ok(!seenKey[s.key], 'key 가 겹치지 않는다: ' + s.key); seenKey[s.key] = 1;
  var re = new RegExp('<button type="button" id="' + s.btn + '" class="scene-spot" aria-label="' + s.label + '"[^>]* hidden></button>'), mm = html.match(re);
  ok(!!mm, 'index.html 에 ' + s.btn + ' (scene-spot · aria-label · hidden)');
  ok(!mm || !/title=/.test(mm[0]), s.btn + ' 에 title 이 없다');
  ok(V.inWalk(s.stand[0], s.stand[1], 0), s.key + ' 서는 자리가 걷는 곳 안');
  var d = Math.hypot(s.s - s.stand[0], s.t - s.stand[1]); ok(d <= (s.key === 'npcSleep2' ? 2.6 : 2.4) && d >= 0.5, s.key + ' 자리와 서는 자리 거리 ' + d.toFixed(2));   /* 빈 집 마루의 문어는 길 가장자리에서 2.58 m (마루가 길에서 들어가 있다 — 문 단추와 44 px 넘게 떼려고 문 옆 마루 끝에 눕는다) */
  ok(V.spot(s.btn) === s && V.spot(s.key) === s, 'spot() 은 단추 id 와 key 둘 다 받는다');
  V.CIRCLES.forEach(function (c) { var dd = Math.hypot(c[0] - s.stand[0], c[1] - s.stand[1]); if (dd < c[2] + 0.25 - 0.03) ok(false, s.key + ' 서는 자리가 원 [' + c.join(', ') + '] 안이다 (' + dd.toFixed(2) + ')'); });
});
ok(html.indexOf('<script src="js/village.js"></script>') > 0 && html.indexOf('src="js/village.js"') < html.indexOf('src="js/app.js'), 'village.js 는 app.js 앞에 실린다');
/* 화면에서 서로 44 px 넘게 떨어져 있나 (기본 각 · 바깥 배율 m 당 18 아트 px · 2 CSS px / 아트 px: 가로 = t × 36 · 세로 ≈ s × 19.1) */
V.SPOTS.forEach(function (a, i) { V.SPOTS.slice(i + 1).forEach(function (b2) { var dx = (a.t - b2.t) * 36, dy = (a.s - b2.s) * 19.1 - (a.y - b2.y) * 30.5; ok(Math.hypot(dx, dy) >= 44, a.key + ' ↔ ' + b2.key + ' 화면 거리 ' + Math.hypot(dx, dy).toFixed(0) + ' px ≥ 44'); }); });

/* 4. NPC 자리: C6 의 일곱 id · 계약 자리에서 1.6 m 안 */
var NP = { clothes: null, goods: null, cafe: null, 'sleep-1': [19, -4], 'sleep-2': [33, -4.5], 'sleep-3': [55, -9], 'sleep-4': [56, 7] };
ok(V.NPCS.length === 7, 'NPC 자리 일곱');
V.NPCS.forEach(function (n) {
  ok(n.id in NP, '아는 NPC: ' + n.id);
  if (NP[n.id]) ok(Math.hypot(n.s - NP[n.id][0], n.t - NP[n.id][1]) <= 1.6, n.id + ' 가 C6 자리 가까이');
  ok(typeof n.face === 'number' && typeof n.y === 'number' && n.r > 0, n.id + ' face · y · r');
  ok(V.CIRCLES.some(function (c) { return near(c[0], n.s) && near(c[1], n.t) && c[2] === n.r; }), n.id + ' 부딪힘 원 하나');
});
['clothes', 'goods', 'cafe'].forEach(function (id) { var n = V.npc(id), s = V.spot('npc' + id.charAt(0).toUpperCase() + id.slice(1)); ok(s && near(s.s, n.s) && near(s.t, n.t) && s.npc === id, id + ' 단추 자리 = 문어 자리'); });
ok(V.npc('nobody') === null && V.spot('nothing') === null, '모르는 id 는 null');
ok(V.HATS.join() === 'none,beret,apron,cap' && V.POSES.join() === 'stand,sleep', '모자 · 자세 목록 = C6');

/* 5. 카페: 가구가 덱 안 · 내 자리와 통로가 비어 있음 */
var D = V.DECK, CF = V.CAFE;
ok(CF.counter.s0 >= D.s0 && CF.counter.s1 <= D.s1 && CF.counter.t < D.t1 && CF.counter.t > D.t0, '계산대가 덱 안');
CF.tables.concat(CF.stools.map(function (p) { return { s: p[0], t: p[1] }; })).forEach(function (p) { ok(p.s > D.s0 && p.s < D.s1 && p.t > D.t0 && p.t < D.t1, '식탁 · 걸상이 덱 안'); });
ok(CF.stools.some(function (p) { return near(p[0], CF.seat.s) && near(p[1], CF.seat.t); }), '내 자리는 걸상 하나');
ok(V.inWalk(CF.seat.aisle[0], CF.seat.aisle[1], 0.25), '통로 자리가 걷는 곳 안');
ok(Math.hypot(CF.cup.s - CF.tables[0].s, CF.cup.t - CF.tables[0].t) < CF.tables[0].r - 0.08, '잔은 첫 식탁 위');

/* 6. 부딪힘 · 덩어리 */
ok(V.CIRCLES.length >= 20 && V.CIRCLES.length <= 45, '원 ' + V.CIRCLES.length + ' 개');
V.CIRCLES.forEach(function (c) { ok(c.length === 3 && c[2] > 0 && c[2] <= 1 && c[0] > 17 && c[0] < 61, '원 [' + c.join(', ') + ']'); });
/* 마을 길 한가운데 (s 18–38 · |t| ≤ 1.2) 는 어디도 막히지 않는다 (몸 반지름 0.25) — 광장 가운데엔 우물이 선다 */
for (var s0 = 18; s0 <= 38; s0 += 0.25) for (var t0 = -1.2; t0 <= 1.2; t0 += 0.3) V.CIRCLES.forEach(function (c) { if (Math.hypot(c[0] - s0, c[1] - t0) < c[2] + 0.25) ok(false, '길 가운데 (' + s0 + ', ' + t0 + ') 가 막혔다'); });
pass++;
ok(V.SEGMENTS.length === 5 && V.SEGMENTS.every(function (g) { return g.s0 < g.s1 && g.s0 >= 10 && g.s1 <= 48; }) && V.HOME_LOTS.every(function (L) { var sg = V.SEGMENTS.filter(function (g) { return g.key === L.seg; })[0]; return sg && L.s0 >= sg.s0 && L.s1 <= sg.s1; }), '덩어리 다섯 (s 범위 — 새 집은 그 덩어리 안)');
V.LAMPS.concat(V.POTS).forEach(function (p) { ok(p.length === 2 && p[0] >= 18 && p[0] <= 46, '길 소품 자리'); });

V.BOXES.slice(0, 2).forEach(function (b3) { [[b3[0], b3[1]], [b3[2], b3[3]], [b3[0], b3[3]], [b3[2], b3[1]]].forEach(function (c2) { ok(Math.abs(V.st(c2[0], c2[1])[1]) >= 2.3, '판매대가 걷는 곳 (|t| ≤ 2.2) 밖 — 2.3 부터'); }); });
V.SPOTS.forEach(function (s2) { var a2 = V.xz(s2.stand[0], s2.stand[1]); ok(!V.BOXES.some(function (b3) { return a2[0] > b3[0] - 0.24 && a2[0] < b3[2] + 0.24 && a2[1] > b3[1] - 0.24 && a2[1] < b3[3] + 0.24; }), s2.key + ' 서는 자리가 네모 밖'); });

/* 6b. 길 찾기: 길 · 덱 · 광장의 빈 자리 어디서든 열 자리의 서는 자리까지, 모든 구간이 걷는 곳 안이다 (ㄱ 자로 꺾인 길 — 광장 → 카페, 덱 → 잡화점 — 도) */
(function () {
  var pts = [], bad = 0, n = 0;
  for (var s = 20.5; s <= 45.5; s += 1.25) for (var t = -7.5; t <= 7.5; t += 1.25) {
    if (!V.inWalk(s, t, 0.3) || V.CIRCLES.some(function (c) { return Math.hypot(c[0] - s, c[1] - t) < c[2] + 0.3; })) continue;
    var a = V.xz(s, t); if (V.BOXES.some(function (b3) { return a[0] > b3[0] - 0.3 && a[0] < b3[2] + 0.3 && a[1] > b3[1] - 0.3 && a[1] < b3[3] + 0.3; })) continue;
    pts.push([s, t]);
  }
  pts.forEach(function (p) { V.SPOTS.forEach(function (sp) {
    n++; var r = V.route(p, sp.stand), prev = p, okk = r.length >= 1 && Math.abs(r[r.length - 1][0] - sp.stand[0]) < 1e-9;
    r.forEach(function (q2) { for (var k = 0; k <= 40; k++) { var u = k / 40; if (!V.inWalk(prev[0] + (q2[0] - prev[0]) * u, prev[1] + (q2[1] - prev[1]) * u, -0.03)) okk = false; } prev = q2; });
    if (!okk) bad++;
  }); });
  ok(pts.length >= 90 && bad === 0, '길 찾기 ' + n + ' 갈래 (' + pts.length + ' 자리 × 열 단추) 가 다 걷는 곳 안으로 이어진다 (어긋난 것 ' + bad + ')');
})();

/* 6b2. 길 찾기 + 등록부의 부딪힘 (11-28 검증: 마을 것만 돌아가고 둘레를 스치게 두어, 먼 데서 누른 걸음이 숲길 벤치 · 해변 바위 · 배 옆에서 섰다).
   route(from, to, null, cols) 의 모든 구간은 (가) 걷는 곳 안이고 (나) 어느 둘레 (r + 몸 0.25) 도 파고들지 않는다 — 장면의 걷기는 둘레를 조금이라도 더 파고드는 걸음을 물린다.
   숲길 · 해변의 소품은 갈래 W 의 것이라 여기선 같은 꼴의 것을 놓아 본다 (벤치 다리 셋 · 덤불 · 그루터기 · 배 (원 셋이 겹친 것) · 바위 무더기 · 표지판) */
(function () {
  var BODY = 0.25, GRID_EVERY = +process.env.GRID_EVERY || 23;
  function W(s, t, r) { var q = V.xz(s, t); return [q[0], q[1], r]; }
  var extra = [W(12.25, -1.6, 0.12), W(12.25, -1.3, 0.12), W(12.25, -1.0, 0.12), W(14.88, -1.8, 0.12), W(14.88, -1.5, 0.12), W(14.88, -1.2, 0.12), W(10.53, 1.99, 0.189), W(11.71, 1.91, 0.168), W(8.4, -0.6, 0.16), W(17.3, 0.9, 0.16),
    W(50, 0, 0.1), W(57.25, 3.5, 0.324), W(58.72, 3.65, 0.243), W(58.0, 2.9, 0.27), W(57.6, 4.3, 0.2), W(58, 7.8, 0.07), W(52.2, 6.4, 0.3), W(54.1, -1.2, 0.22)];
  var bo = V.xz(53.4, -4.6); [-0.75, 0, 0.75].forEach(function (d) { extra.push([bo[0] + d * Math.cos(0.45), bo[1] - d * Math.sin(0.45), 0.44]); });
  var cols = { circles: V.CIRCLES.map(function (c) { return W(c[0], c[1], c[2]); }).concat(extra), boxes: V.BOXES.map(function (b) { return b.slice(); }) };
  function pen(x, z) {   /* 몸 (0.25) 이 파고든 깊이 */
    var p = -1e9, i, c, b, d; for (i = 0; i < cols.circles.length; i++) { c = cols.circles[i]; d = c[2] + BODY - Math.hypot(x - c[0], z - c[1]); if (d > p) p = d; }
    for (i = 0; i < cols.boxes.length; i++) { b = cols.boxes[i]; d = Math.min(x - (b[0] - BODY), b[2] + BODY - x, z - (b[1] - BODY), b[3] + BODY - z); if (d > p) p = d; } return p;
  }
  function legs(from, r) {   /* → { walk: 걷는 곳을 벗어난 구간 수, hit: 둘레를 파고든 구간 수, len }.
                               파고듦 = 몸이 둘레 안으로 1e-6 넘게 — 단 붙어 선 출발 자리의 깊이까지 (멀어지면 그만큼 줄어든다) · 둘레에 바짝 붙여 둔 서는 자리의 깊이까지 (걸상 앞 자리 — 0.02 안쪽) 는 센 것이 아니다 */
    var o = { walk: 0, hit: 0, len: 0 }, prev = from, end = r[r.length - 1], eq = V.xz(end[0], end[1]), pe = Math.max(0, pen(eq[0], eq[1]));
    r.forEach(function (q2, li) {
      var a = V.xz(prev[0], prev[1]), b = V.xz(q2[0], q2[1]), L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(2, Math.ceil(L / 0.03)), p0 = Math.max(0, pen(a[0], a[1])), w = false, h = false;
      for (var k = 0; k <= n; k++) { var u = k / n, x = a[0] + (b[0] - a[0]) * u, z = a[1] + (b[1] - a[1]) * u, st2 = V.st(x, z); if (!V.inWalk(st2[0], st2[1], -0.03)) w = true; var pp = pen(x, z); if (pp > Math.max(li === 0 ? p0 : 0, li === r.length - 1 ? pe : 0) + 1e-6) h = true; if (li === 0) p0 = Math.min(p0, Math.max(0, pp)); }
      if (w) o.walk++; if (h) o.hit++; o.len += L; prev = q2;
    });
    return o;
  }
  /* 가. 검증에서 섰던 걸음들 (같은 꼴의 소품으로) */
  var h1 = V.DOORS.filter(function (d) { return d.btn === 'btn-in-home-1'; })[0], s1 = V.spot('npcSleep1'), s3 = V.spot('npcSleep3'), s4 = V.spot('npcSleep4');
  [[[5.5, 0], h1.stand, '마당 문 앞 → 집 1 문 (벤치 다리 셋을 돌아)'], [[5.5, 0], s1.stand, '마당 문 앞 → 벤치 문어'], [[10, 2.2], h1.stand, '덤불 옆 → 집 1 문'], [[10, 2.75], h1.stand, '덤불 뒤 → 집 1 문'], [[13, -1.1], h1.stand, '벤치 사이 → 집 1 문'],
    [[51.2, -1.2], s3.stand, '모래 → 바닷가 문어 (배를 돌아)'], [[46.3, 0], s3.stand, '계단 → 바닷가 문어'], [[49, 0], s3.stand, '계단 끝 → 바닷가 문어'], [[58.4, 6], s3.stand, '바위 뒤 → 바닷가 문어'], [[49.4, -0.4], s4.stand, '표지판 옆 → 낚시 문어'], [[57.5, 2.8], s4.stand, '바위 사이 → 낚시 문어'],
    [[60.6, 7], V.spot('plazaStage').stand, '부두 → 광장 무대 (11-28 재검토: 부두가 걷는 곳 표에 없어 길을 못 잡았다)'], [[64, 7], s4.stand, '부두 끝 → 낚시 문어'], [[62.5, 7.2], h1.stand, '부두 → 숲길 집 1 문 (마을을 가로질러)']].forEach(function (c) {
    var r = V.route(c[0], c[1], null, cols), g = legs(c[0], r), straight = Math.hypot(c[1][0] - c[0][0], c[1][1] - c[0][1]);
    ok(near(r[r.length - 1][0], c[1][0]) && near(r[r.length - 1][1], c[1][1]) && g.walk === 0 && g.hit === 0, '길: ' + c[2] + ' — ' + r.length + ' 구간 · 걷는 곳 밖 ' + g.walk + ' · 둘레를 파고든 것 ' + g.hit);
    ok(g.len < straight * 1.5 + 1.5 || c[0][0] > 59.7, '길: ' + c[2] + ' 이 멀리 돌지 않는다 (' + g.len.toFixed(2) + ' m · 곧은 길 ' + straight.toFixed(2) + ')');   /* 부두에서는 모래로 돌아 나와야 해서 곧은 길과 견주지 않는다 */
  });
  /* 나. 격자: 숲길 · 마을 길 · 광장 · 계단 · 해변의 빈 자리 → 문 · 문어 · 가게 앞 자리. 길을 못 찾아 곧은 길로 돌아온 것 (= 둘레를 파고드는 한 구간) 도 센다 */
  var starts = [], targets = V.SPOTS.map(function (sp) { return sp.stand; }).concat(V.DOORS.map(function (d) { return d.stand; }));
  for (var s = 5.3; s <= 59.5; s += 0.9) for (var t = -11.5; t <= 11.5; t += 0.7) { var a = V.xz(s, t); if (V.inWalk(s, t, 0.1) && pen(a[0], a[1]) < -0.05) starts.push([+s.toFixed(2), +t.toFixed(2)]); }
  for (s = 60.1; s <= 65.5; s += 0.9) [6.6, 7.0, 7.4].forEach(function (t2) { starts.push([+s.toFixed(2), t2]); });   /* 부두 */
  var n = 0, walkBad = 0, hitBad = 0, worst = '', worstW = '', direct = 0;
  starts.forEach(function (p, pi) { targets.forEach(function (tg, ti) {
    if ((pi * 7 + ti) % GRID_EVERY) return;   /* 몇에 하나 (전부는 느리다 — 다 보려면 GRID_EVERY=1 node tools/test-village.js) */
    n++; var r = V.route(p, tg, null, cols), g = legs(p, r); if (r.length === 1 && (g.walk || g.hit)) direct++;
    if (g.walk) { walkBad++; if (!worstW) worstW = '(' + p + ') → (' + tg.map(function (v) { return +v.toFixed(2); }) + ') ' + r.length + ' 구간'; }
    if (g.hit) { hitBad++; if (!worst) worst = '(' + p + ') → (' + tg.map(function (v) { return +v.toFixed(2); }) + ') ' + r.length + ' 구간'; }
  }); });
  ok(starts.length >= 300 && n >= 400, '길 격자: 출발 ' + starts.length + ' 자리 · ' + n + ' 갈래');
  ok(direct === 0, '길 격자: 길을 못 잡고 곧은 길로 물러난 갈래 없음 (' + direct + ')');
  ok(walkBad === 0, '길 격자: 모든 구간이 걷는 곳 안 (어긋난 갈래 ' + walkBad + (worstW ? ' — 첫째: ' + worstW : '') + ')');
  ok(hitBad === 0, '길 격자: 어느 구간도 둘레를 파고들지 않는다 (파고든 갈래 ' + hitBad + (worst ? ' — 첫째: ' + worst : '') + ')');
  /* 다. 둘레에 붙어 선 출발 자리 (걸려서 선 그 자리에서 다시 누를 때): 둘레를 따라 한 바퀴 — 어느 쪽에 붙어 있어도 첫 구간이 더 파고들지 않고 끝까지 간다 */
  var stuck = 0, tot = 0;
  [[extra[10], s4.stand], [extra[18], s3.stand], [extra[19], s3.stand], [extra[20], s3.stand], [extra[11], s4.stand], [extra[0], h1.stand], [extra[1], h1.stand]].forEach(function (c) {
    for (var k = 0; k < 24; k++) {
      var an = k * Math.PI / 12, x = c[0][0] + Math.cos(an) * (c[0][2] + BODY), z = c[0][1] + Math.sin(an) * (c[0][2] + BODY), st2 = V.st(x, z);
      if (!V.inWalk(st2[0], st2[1], 0.05) || pen(x, z) > 1e-6) continue;   /* 이웃 원 속 · 걷는 곳 밖은 설 수 없는 자리 */
      tot++; var r = V.route(st2, c[1], null, cols), g = legs(st2, r); if (g.walk || g.hit) stuck++;
    }
  });
  ok(tot >= 60 && stuck === 0, '둘레에 붙어 선 ' + tot + ' 자리에서 다시 길을 잡는다 (막힌 것 ' + stuck + ')');
  /* 네모 (판매대 · 무대 · 벤치) 에 붙어 선 자리도: 둘레 위 (몸 반지름만큼 떨어진 선) 와 5 mm 안쪽 (걷기가 남겨 둘 수 있는 자리) 에서 먼 자리 넷으로 — 11-28 재검토: 원에 붙은 자리만 시험해, 네모 쪽 '더 파고들지 않는 쪽이면 간다' 를 지워도 통과했다 */
  var far = [V.spot('plazaBoard').stand, s1.stand, V.spot('cafeSeat').stand, V.spot('shopGoods').stand], btot = 0, bbad = 0, bex = '';
  [0, 0.005].forEach(function (inset) {
    V.BOXES.forEach(function (b0, bi) {
      var b = [Math.min(b0[0], b0[2]), Math.min(b0[1], b0[3]), Math.max(b0[0], b0[2]), Math.max(b0[1], b0[3])], pd = BODY - inset, pts = [];
      for (var u = 0; u <= 1.0001; u += 0.125) pts.push([b[0] - pd + (b[2] - b[0] + 2 * pd) * u, b[1] - pd], [b[0] - pd + (b[2] - b[0] + 2 * pd) * u, b[3] + pd], [b[0] - pd, b[1] - pd + (b[3] - b[1] + 2 * pd) * u], [b[2] + pd, b[1] - pd + (b[3] - b[1] + 2 * pd) * u]);
      pts.forEach(function (q) {
        var s2 = V.st(q[0], q[1]); if (!V.inWalk(s2[0], s2[1], 0.05) || pen(q[0], q[1]) > inset + 1e-6) return;
        far.forEach(function (tg2) { btot++; var r = V.route(s2, tg2, null, cols), g = legs(s2, r); if (g.hit || g.walk) { bbad++; if (!bex) bex = '네모 ' + bi + ' (' + s2.map(function (v) { return v.toFixed(2); }) + ') ' + r.length + ' 구간'; } });
      });
    });
  });
  ok(btot >= 200 && bbad === 0, '네모에 붙어 선 자리 ' + btot + ' 갈래에서 길을 잡는다 (막힌 것 ' + bbad + (bex ? ' — 첫째: ' + bex : '') + ')');
  /* 라. cols 를 안 주면 예전처럼 마을 것만 (서는 자리 시험 · 문서의 그림이 쓰는 꼴) — 같은 입력에 같은 길 */
  var r0 = V.route([39, 5], V.spot('npcCafe').stand), r1 = V.route([39, 5], V.spot('npcCafe').stand, null, { circles: V.CIRCLES.map(function (c) { return W(c[0], c[1], c[2]); }), boxes: V.BOXES });
  ok(JSON.stringify(r0) === JSON.stringify(r1) && r0.length >= 2, 'cols 를 안 준 길 = 마을 것을 cols 로 준 길 (' + r0.length + ' 구간)');
})();

/* 6c. 들어가는 방 (계약 C10): 크기 · 자리 · 단추 · 부딪힘 */
(function () {
  var WANT = { clothes: { size: [6.0, 5.2], slots: ['mq0', 'mq1', 'mq2', 'mq3', 'mirror', 'counter', 'keeper', 'exit'], btns: ['btn-mq-0', 'btn-mq-1', 'btn-mq-2', 'btn-mq-3', 'btn-room-mirror', 'btn-room-counter', 'btn-npc-clothes', 'btn-room-exit'] },
    cafe: { size: [6.4, 5.2], slots: ['keeper', 'menu', 'pickup', 'seat', 'table', 'turntable', 'lp', 'exit'], btns: ['btn-cafe-menu', 'btn-cafe-counter', 'btn-cafe-seat', 'btn-cafe-lp', 'btn-npc-cafe', 'btn-room-exit'] },
    hall: { size: [7.0, 6.0], slots: ['stage', 'catwalk', 'wait', 'rack', 'mirror', 'board', 'judge0', 'judge1', 'judge2', 'exit'], btns: ['btn-hall-stage', 'btn-hall-rack', 'btn-hall-board', 'btn-room-exit'] },
    goods: { size: [5.2, 4.8], slots: ['shelf0', 'shelf1', 'shelf2', 'shelf3', 'shelf4', 'shelf5', 'keeper', 'counter', 'exit'], btns: ['btn-shelf-0', 'btn-shelf-1', 'btn-shelf-2', 'btn-shelf-3', 'btn-shelf-4', 'btn-shelf-5', 'btn-room-counter', 'btn-npc-goods', 'btn-room-exit'] } };
  ok(Object.keys(V.ROOMS).sort().join() === 'cafe,clothes,goods,hall,home1,home2,home3,home4,salon', '방 아홉 (가게 · 카페 · 공연장 넷 + 문어 집 넷 + 미용실)');
  ['home1', 'home2', 'home3', 'home4'].forEach(function (k) { WANT[k] = { size: [4.4, 4.0], slots: ['bed', 'table', 'tableTop', 'job', 'exit'], btns: ['btn-room-exit', 'btn-npc-sleep-' + k.slice(4)] }; });   /* 11-24 문어 집 넷 (한 틀) */
  WANT.salon = { size: [4.8, 4.2], slots: ['chair', 'aisle', 'mirror', 'keeper', 'stylistWork', 'sink', 'bottles', 'bench', 'exit'], btns: ['btn-salon-chair', 'btn-npc-stylist', 'btn-room-exit'] };
  Object.keys(WANT).forEach(function (key) {
    var R = V.ROOMS[key], W = WANT[key], hx = R.half[0], hz = R.half[1];
    ok(near(2 * hx, W.size[0], 1e-9) && near(2 * hz, W.size[1], 1e-9) && R.wallH >= 2, key + ' 크기 ' + W.size.join(' x '));
    function free(x, z, pad) { return Math.abs(x) <= hx - pad && Math.abs(z) <= hz - pad && !R.circles.some(function (c) { return Math.hypot(c[0] - x, c[1] - z) < c[2] + 0.25 - 0.03; }) && !R.boxes.some(function (b) { return x > b[0] - 0.22 && x < b[2] + 0.22 && z > b[1] - 0.22 && z < b[3] + 0.22; }); }
    W.slots.forEach(function (n) { var q = R.slots[n]; ok(q && q.length === 4 && Math.abs(q[0]) <= hx && Math.abs(q[2]) <= hz + 0.01 && q[1] >= 0 && q[1] < R.wallH, key + ' 자리 ' + n); });
    ok(R.spots.map(function (sp) { return sp.btn; }).sort().join() === W.btns.slice().sort().join(), key + ' 단추 = C10');
    R.spots.forEach(function (sp) {
      var mm = html.match(new RegExp('<button type="button" id="' + sp.btn + '" class="scene-spot" aria-label="[^"]+"[^>]* hidden></button>'));
      ok(!!mm && !/title=/.test(mm[0]), 'index.html 에 ' + sp.btn);
      ok(free(sp.stand[0], sp.stand[1], 0.3), key + ' ' + sp.key + ' 서는 자리가 방 안의 빈 곳');
      ok(Math.hypot(sp.x - sp.stand[0], sp.z - sp.stand[1]) <= 1.5, key + ' ' + sp.key + ' 자리와 서는 자리가 가깝다');
    });
    ok(free(R.door[0], R.door[1], 0.3), key + ' 문 안 자리가 빈 곳');
    /* 문에서 누르는 자리마다 곧은 길이 비어 있다 (리드 검토 11-22: 카페 차림판을 누르면 가운데 식탁에 걸려 멈췄다) */
    R.spots.forEach(function (sp) { var f = R.door, n = 60, hit = false; for (var i = 0; i <= n; i++) { var x = f[0] + (sp.stand[0] - f[0]) * i / n, z = f[1] + (sp.stand[1] - f[1]) * i / n; if (!free(x, z, 0)) hit = true; } ok(!hit, key + ' 문 → ' + sp.key + ' 곧은 길이 비어 있다'); });
    ok(R.lights.length === 2, key + ' 등 둘 (다락과 같은 수 — 새 셰이더 없음)');
    R.boxes.forEach(function (b) { ok(b[0] < b[2] && b[1] < b[3] && b[0] >= -hx - 0.01 && b[2] <= hx + 0.01 && b[1] >= -hz - 0.01 && b[3] <= hz + 0.01, key + ' 부딪힘 네모가 방 안'); });
    /* 문에서 누르는 자리마다: 방 가운데 통로 (서는 자리들의 볼록한 안쪽) 가 막히지 않았다 — 문 → 서는 자리 곧은 선의 가운데 점이 가구 안이 아니다 (대충의 걸림 검사) */
  });
  ['mq0', 'mq1', 'mq2', 'mq3'].forEach(function (n, i) { var a = V.ROOMS.clothes.slots[n], b = V.ROOMS.clothes.slots['mq' + (i + 1)]; if (b) ok(b[0] - a[0] >= 0.9, '마네킹 받침 사이 0.9 m 넘게'); });
  V.DOORS.forEach(function (d) { ok(html.indexOf('id="' + d.btn + '" class="scene-spot" aria-label="' + d.label + '"') > 0, 'index.html 의 ' + d.btn + ' 이름 = ' + d.label); });
  Object.keys(V.ROOMS).forEach(function (k) { ok(typeof V.ROOMS[k].name === 'string' && V.ROOMS[k].name.length > 0 && V.ROOMS[k].name !== '빈 집', k + ' 방 이름 (화면 낭독기가 읽는다): ' + V.ROOMS[k].name); });
  ['home1', 'home2', 'home3', 'home4'].forEach(function (k) {   /* 11-28 검토: 바닥의 일 물건 (상자 · 바구니 · 통) 에도 부딪힘 · 일 = 갈래 N 의 대본과 맞춘 넷 */
    var R2 = V.ROOMS[k]; ok(R2.circles.some(function (c) { return Math.hypot(c[0] - 1.4, c[1] + 1.6) < 0.05 && c[2] >= 0.2; }), k + ' 바닥의 일 물건에 부딪힘 원');
    ok(['post', 'fix', 'shell', 'fish'].indexOf(R2.look.job) >= 0, k + ' 의 일 = ' + R2.look.job);
  });
  ok(V.ROOMS.home1.look.job === 'post' && V.ROOMS.home2.look.job === 'fix' && V.ROOMS.home3.look.job === 'shell' && V.ROOMS.home4.look.job === 'fish', '집마다 일: 편지 · 집 고치기 · 돌과 조개 · 밧줄과 그물');
  ok(V.DOORS.length === 9 && V.DOORS.every(function (d) { return V.ROOMS[d.room] && V.inWalk(d.stand[0], d.stand[1], 0) && html.indexOf('id="' + d.btn + '"') > 0; }), '바깥 문 아홉: 방 · 서는 자리 · 단추');
  /* 11-24 새 터: 서로 · 지금 터 · 걷는 곳 · 가로등 · 화분과 겹치지 않는다 */
  var ALL = V.LOTS.filter(function (L) { return L.id !== 'plaza'; }).concat(V.HOME_LOTS);
  V.HOME_LOTS.forEach(function (L) {
    ALL.forEach(function (M2) { if (M2 !== L) ok(L.s1 <= M2.s0 || M2.s1 <= L.s0 || L.t1 <= M2.t0 || M2.t1 <= L.t0, L.id + ' 와 ' + M2.id + ' 터가 안 겹친다'); });
    var hit = false; for (var a = 0; a <= 20; a++) for (var b = 0; b <= 20; b++) { var q = V.local(L.c, L.mir, -L.hx + 2 * L.hx * a / 20, -L.hz + 2 * L.hz * b / 20); if (V.inWalk(q[0], q[1], -0.1)) hit = true; }
    ok(!hit, L.id + ' 집 몸이 걷는 곳에서 0.1 m 넘게 떨어져 있다');
    ok(!V.LAMPS.concat(V.POTS).some(function (p) { return p[0] > L.s0 - 0.3 && p[0] < L.s1 + 0.3 && p[1] > L.t0 - 0.3 && p[1] < L.t1 + 0.3; }), L.id + ' 터에 가로등 · 화분 없음');
  });
  /* 시간표 · 잠김 줄 */
  ['sleep-1', 'sleep-2', 'sleep-3', 'sleep-4'].forEach(function (id) {
    var d = V.where(id, 12), e = V.where(id, 19), n = V.where(id, 2), H = V.HOMES[id];
    ok(!d.home && e.home && e.slot === 'table' && e.pose === 'sit' && n.home && n.slot === 'bed' && n.pose === 'sleep' && V.ROOMS[e.room] && V.ROOMS[e.room].home && V.homeOf(e.room) === id, id + ' 시간표: 낮 밖 · 저녁 식탁 · 밤 침대 (' + e.room + ')');
    ok(V.where(id, 7).home === false && V.where(id, 17).home === true && V.where(id, 6.99).home === true && V.where(id, 16.99).home === false, id + ' 시간 경계 7 시 · 17 시');
    ok(V.where(id, 20.99).slot === 'table' && V.where(id, 21).slot === 'bed' && V.where(id, 21).pose === 'sleep' && V.where(id, 24).slot === 'bed' && V.where(id, -1).slot === 'bed' && V.where(id, 31).home === false, id + ' 시간 경계 21 시 (식탁 → 침대) · 하루를 넘는 값 (24 · −1 · 31)');
    var ln = V.lockedLine(id); ok(ln === '문이 잠겨 있어. 지금은 ' + H.dayName + '에 있어.' && !/[!?~♪★]/.test(ln), id + ' 잠김 줄 (집 목소리 반말 — 리드 11-24): ' + ln);
    ok(V.DOORS.some(function (d2) { return d2.key === H.door && d2.room === H.room; }), id + ' 집 문');
  });
  V.DOORS.forEach(function (d) { V.CIRCLES.forEach(function (c) { if (Math.hypot(c[0] - d.stand[0], c[1] - d.stand[1]) < c[2] + 0.22) ok(false, d.key + ' 문 앞 서는 자리가 원 안'); }); });
  /* 콘테스트 자리 (공연장 방 안): 기다리는 곳 · 경쟁 줄은 빈 바닥 · 걷는 길은 계단 → 길 → 무대 · 시상대는 무대 위 · 심사 자리는 걸상 */
  var S2 = V.SHOW, HL = V.ROOMS.hall, inB = function (b, x, z) { return x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1; };
  ok(S2.room === 'hall' && S2.path.length === 4 && S2.judges.length === 3 && S2.podium.length === 4 && S2.rivals.length === 3, '콘테스트 자리: 길 넷 · 심사 셋 · 시상대 넷 · 경쟁 셋');
  [S2.wait].concat(S2.rivals).forEach(function (p) { ok(Math.abs(p[0]) < HL.half[0] - 0.3 && Math.abs(p[1]) < HL.half[1] - 0.3 && !HL.boxes.some(function (b) { return p[0] > b[0] - 0.25 && p[0] < b[2] + 0.25 && p[1] > b[1] - 0.25 && p[1] < b[3] + 0.25; }) && !HL.circles.some(function (c) { return Math.hypot(c[0] - p[0], c[1] - p[1]) < c[2] + 0.25; }), '기다리는 자리 (' + p.join(', ') + ') 가 빈 바닥'); });
  ok(S2.path[0][1] > HL.walk.z1 && inB(HL.walk, S2.path[1][0], S2.path[1][1]) && (inB(HL.walk, S2.path[2][0], S2.path[2][1]) || inB(HL.stage, S2.path[2][0], S2.path[2][1])) && inB(HL.stage, S2.path[3][0], S2.path[3][1]), '걷는 길: 계단 앞 → 길 → 무대');
  S2.podium.forEach(function (p) { ok(inB(HL.stage, p[0], p[1]) && p[2] >= HL.stage.y, '시상대는 무대 위'); });
  S2.judges.forEach(function (p, n) { var q = HL.slots['judge' + n]; ok(near(p[0], q[0]) && near(p[1], q[2]), '심사 자리 = 걸상 ' + n); });
  HL.boxes.forEach(function (b) { ok(!(0 > b[0] && 0 < b[2] && b[1] < HL.walk.z1 && b[3] > HL.walk.z0), '길 (캣워크) 은 부딪힘 네모가 아니다 (걸어 오른다)'); });
  ok(V.EXTRA.join() === 'judge0,judge1,judge2,rival0,rival1,rival2', '콘테스트 문어 id');
})();

/* 7. 파일: DOM · 시계 · 난수 없음 */
var src = fs.readFileSync(path.join(ROOT, 'js/village.js'), 'utf8');
ok(!/\bdocument\b|\bwindow\b|Math\.random|Date\.now|new Date/.test(src), 'village.js 에 DOM · 시계 · 난수가 없다');
ok(!/\bimport\b|\bexport\b(?!s)/.test(src.replace(/module\.exports/g, '')), 'import / export 없음');

console.log('test-village: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
