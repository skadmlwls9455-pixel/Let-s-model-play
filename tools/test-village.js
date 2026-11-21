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

/* 3. 단추: C6 의 id 열 개 · 이름 · 서는 자리가 걷는 곳 안 · 자리와 서는 자리가 2.2 m 안 */
var BTN = { 'btn-shop-clothes': '옷가게', 'btn-shop-goods': '잡화점', 'btn-cafe-counter': '카페 주문', 'btn-cafe-seat': '카페 자리', 'btn-cafe-lp': '레코드', 'btn-plaza-stage': '콘테스트 무대', 'btn-plaza-board': '마을 게시판',
  'btn-npc-clothes': '가게 문어', 'btn-npc-goods': '가게 문어', 'btn-npc-cafe': '가게 문어' };
ok(V.SPOTS.length === 10, '누르는 자리 열');
var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), seenKey = {};
V.SPOTS.forEach(function (s) {
  ok(BTN[s.btn] === s.label, s.btn + ' 이름 = ' + BTN[s.btn]);
  ok(!seenKey[s.key], 'key 가 겹치지 않는다: ' + s.key); seenKey[s.key] = 1;
  var re = new RegExp('<button type="button" id="' + s.btn + '" class="scene-spot" aria-label="' + s.label + '"[^>]* hidden></button>'), mm = html.match(re);
  ok(!!mm, 'index.html 에 ' + s.btn + ' (scene-spot · aria-label · hidden)');
  ok(!mm || !/title=/.test(mm[0]), s.btn + ' 에 title 이 없다');
  ok(V.inWalk(s.stand[0], s.stand[1], 0), s.key + ' 서는 자리가 걷는 곳 안');
  var d = Math.hypot(s.s - s.stand[0], s.t - s.stand[1]); ok(d <= 2.2 && d >= 0.5, s.key + ' 자리와 서는 자리 거리 ' + d.toFixed(2));
  ok(V.spot(s.btn) === s && V.spot(s.key) === s, 'spot() 은 단추 id 와 key 둘 다 받는다');
  V.CIRCLES.forEach(function (c) { var dd = Math.hypot(c[0] - s.stand[0], c[1] - s.stand[1]); if (dd < c[2] + 0.25 - 0.03) ok(false, s.key + ' 서는 자리가 원 [' + c.join(', ') + '] 안이다 (' + dd.toFixed(2) + ')'); });
});
ok(html.indexOf('<script src="js/village.js"></script>') > 0 && html.indexOf('src="js/village.js"') < html.indexOf('src="js/app.js'), 'village.js 는 app.js 앞에 실린다');
/* 화면에서 서로 44 px 넘게 떨어져 있나 (기본 각 · 2 CSS px / 아트 px: 가로 = t × 54 · 세로 ≈ s × 28.6) */
V.SPOTS.forEach(function (a, i) { V.SPOTS.slice(i + 1).forEach(function (b2) { var dx = (a.t - b2.t) * 54, dy = (a.s - b2.s) * 28.6 - (a.y - b2.y) * 45.8; ok(Math.hypot(dx, dy) >= 44, a.key + ' ↔ ' + b2.key + ' 화면 거리 ' + Math.hypot(dx, dy).toFixed(0) + ' px ≥ 44'); }); });

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
V.CIRCLES.forEach(function (c) { ok(c.length === 3 && c[2] > 0 && c[2] <= 0.7 && c[0] > 17 && c[0] < 61, '원 [' + c.join(', ') + ']'); });
/* 마을 길 한가운데 (s 18–38 · |t| ≤ 1.2) 는 어디도 막히지 않는다 (몸 반지름 0.25) — 광장 가운데엔 우물이 선다 */
for (var s0 = 18; s0 <= 38; s0 += 0.25) for (var t0 = -1.2; t0 <= 1.2; t0 += 0.3) V.CIRCLES.forEach(function (c) { if (Math.hypot(c[0] - s0, c[1] - t0) < c[2] + 0.25) ok(false, '길 가운데 (' + s0 + ', ' + t0 + ') 가 막혔다'); });
pass++;
ok(V.SEGMENTS.length === 4 && V.SEGMENTS.every(function (g) { return g.s0 < g.s1 && g.s0 >= 15 && g.s1 <= 48; }), '덩어리 넷 (s 범위)');
V.LAMPS.concat(V.POTS).forEach(function (p) { ok(p.length === 2 && p[0] >= 18 && p[0] <= 46, '길 소품 자리'); });

V.BOXES.slice(0, 2).forEach(function (b3) { [[b3[0], b3[1]], [b3[2], b3[3]], [b3[0], b3[3]], [b3[2], b3[1]]].forEach(function (c2) { ok(Math.abs(V.st(c2[0], c2[1])[1]) >= 2.3, '판매대가 걷는 곳 (|t| ≤ 2.2) 밖 — 2.3 부터'); }); });
V.SPOTS.forEach(function (s2) { var a2 = V.xz(s2.stand[0], s2.stand[1]); ok(!V.BOXES.some(function (b3) { return a2[0] > b3[0] - 0.24 && a2[0] < b3[2] + 0.24 && a2[1] > b3[1] - 0.24 && a2[1] < b3[3] + 0.24; }), s2.key + ' 서는 자리가 네모 밖'); });

/* 7. 파일: DOM · 시계 · 난수 없음 */
var src = fs.readFileSync(path.join(ROOT, 'js/village.js'), 'utf8');
ok(!/\bdocument\b|\bwindow\b|Math\.random|Date\.now|new Date/.test(src), 'village.js 에 DOM · 시계 · 난수가 없다');
ok(!/\bimport\b|\bexport\b(?!s)/.test(src.replace(/module\.exports/g, '')), 'import / export 없음');

console.log('test-village: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
