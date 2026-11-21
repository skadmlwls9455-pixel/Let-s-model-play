#!/usr/bin/env node
/* 가게 규칙 (js/shop.js) — node 에서 그대로. 11-21 7차 갈래 S
   같은 날 같은 선반 · 한 바퀴에 전부 · 가진 것은 바뀜 · 값과 조개 · 두 번 사기 · 두 탭 합치기 · 모르는 값 지키기 · 바닷가 조개 */
'use strict';
var path = require('path'), fs = require('fs');
var SHOP = require(path.join(__dirname, '..', 'js', 'shop.js'));
var pass = 0, fail = 0;
function ok(c, name) { if (c) pass++; else { fail++; console.log('  FAIL ' + name); } }
function eq(a, b, name) { ok(JSON.stringify(a) === JSON.stringify(b), name + ' — ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }
function keyAdd(key, n) { var p = key.split('-'), d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n)); return d.toISOString().slice(0, 10); }
function keys(st) { return st.items.map(function (x) { return x.key; }); }

/* 대역 옷 목록: 살 수 있는 것 n 개 (값 4~30) + 누구나 가진 것 */
function catalogue(n) {
  var cats = [{ key: 'outfit', name: '옷', items: [{ id: 'dress', name: '원피스', tags: [], shop: null }] }, { key: 'shoes', name: '신발', items: [] }, { key: 'acc', name: '악세사리', items: [] }];
  for (var i = 0; i < n; i++) cats[i % 3].items.push({ id: 'n' + i, name: '새 옷 ' + i, tags: ['cute'], shop: { price: 4 + (i * 7) % 27 } });
  return { cats: cats };
}
var DAY = '2026-11-21', GOODS = { dyes: [['red', '빨강'], ['yellow', '노랑'], ['green', '초록'], ['blue', '파랑'], ['purple', '보라'], ['pink', '분홍']].map(function (d) { return { id: d[0], name: d[1], hex: '#000000' }; }), dyeCost: 6 };

console.log('== 옷 선반');
[6, 13, 26, 40].forEach(function (n) {
  var C = catalogue(n), a = SHOP.stock('clothes', DAY, C, {}), b = SHOP.stock('clothes', DAY, JSON.parse(JSON.stringify(C)), {});
  eq(a, b, n + '개: 같은 날 같은 선반');
  eq(a.items.length, 4, n + '개: 하루 네 개');
  ok(new Set(keys(a)).size === 4, n + '개: 겹치는 것 없음');
  ok(a.items.every(function (x) { return x.price >= 1 && !x.owned && x.key !== 'outfit:dress'; }), n + '개: 살 수 있는 것만');
  var len = SHOP.cycleLen(n), seen = {}, changed = false, prev = keys(a).join();
  eq(len, Math.ceil(n / 4), n + '개: 한 바퀴 길이');
  ok(n > 40 || len <= 10, n + '개: 한 바퀴가 열흘 안');
  for (var d = 0; d < 2 * len; d++) { var s = SHOP.stock('clothes', keyAdd(DAY, d), C, {}); keys(s).forEach(function (k) { seen[k] = 1; }); if (d && keys(s).join() !== prev) changed = true; }
  eq(Object.keys(seen).length, n, n + '개: 두 바퀴 안에 전부 나온다');
  ok(changed, n + '개: 날이 바뀌면 선반이 바뀐다');
});
(function () {   /* 연속 한 바퀴 (바퀴 경계에 맞춘 날부터) 에 전부 정확히 */
  var C = catalogue(26), len = SHOP.cycleLen(26), d0 = Math.floor(Date.UTC(2026, 10, 21) / 864e5), start = keyAdd(DAY, len - (d0 % len)), seen = {};
  for (var d = 0; d < len; d++) keys(SHOP.stock('clothes', keyAdd(start, d), C, {})).forEach(function (k) { seen[k] = 1; });
  eq(Object.keys(seen).length, 26, '한 바퀴에 전부');
})();
(function () {   /* 하루에 싼 것과 비싼 것이 섞인다 */
  var C = catalogue(26), prices = SHOP.shopItems(C).map(function (x) { return x.price; }).sort(function (a, b) { return a - b; }), mid = prices[13], mixed = 0;
  for (var d = 0; d < 14; d++) { var it = SHOP.stock('clothes', keyAdd(DAY, d), C, {}).items; if (it.some(function (x) { return x.price < mid; }) && it.some(function (x) { return x.price >= mid; })) mixed++; }
  eq(mixed, 14, '날마다 싼 것 · 비싼 것이 함께');
})();
(function () {   /* 가진 것 */
  var C = catalogue(13), a = SHOP.stock('clothes', DAY, C, {}), k0 = a.items[0].key, own = {};
  own[k0] = keyAdd(DAY, -3);
  var b = SHOP.stock('clothes', DAY, C, own);
  ok(keys(b).indexOf(k0) < 0, '전에 산 것은 선반에서 빠진다');
  eq(b.items.length, 4, '빠진 자리는 다음 것으로 찬다');
  eq(keys(b).slice(1), keys(a).slice(1), '다른 자리는 그대로');
  own[k0] = DAY;
  var c = SHOP.stock('clothes', DAY, C, own);
  eq(keys(c), keys(a), '오늘 산 것은 그 자리에 남는다');
  ok(c.items[0].owned === true && !c.items[1].owned, '오늘 산 것에 있음 표시');
  var all = {}; SHOP.shopItems(C).forEach(function (x) { all[x.key] = '2026-01-01'; });
  var e = SHOP.stock('clothes', DAY, C, all);
  ok(e.items.length === 4 && e.items.every(function (x) { return x.owned; }), '다 가졌으면 있는 것을 표시와 함께');
  all['future:thing'] = '2026-01-01';
  eq(keys(SHOP.stock('clothes', DAY, C, all)), keys(e), '모르는 가진 것이 있어도 그대로');
  eq(SHOP.stock('clothes', DAY, { cats: [] }, {}).items, [], '살 것이 없으면 빈 선반');
  eq(SHOP.stock('clothes', DAY, null, null).items, [], '목록이 없으면 빈 선반');
  eq(SHOP.stock('clothes', DAY, catalogue(2), {}).items.length, 2, '둘뿐이면 둘');
})();

console.log('== 잡화점');
(function () {
  var g = SHOP.stock('goods', DAY, GOODS, {}), dyes = g.items.filter(function (x) { return x.type === 'dye'; });
  eq(g, SHOP.stock('goods', DAY, GOODS, {}), '같은 날 같은 선반');
  eq(g.items[0], { key: 'seed', type: 'seed', name: '씨앗', price: 2, left: 3 }, '씨앗 2 조개 · 세 개');
  eq(dyes.length, 3, '염료 색 셋');
  ok(dyes.every(function (x) { return x.price === 6; }), '염료 값은 재봉틀 값');
  var seen = {}; for (var d = 0; d < 30; d++) SHOP.stock('goods', keyAdd(DAY, d), GOODS, {}).items.forEach(function (x) { if (x.type === 'dye') seen[x.id] = 1; });
  eq(Object.keys(seen).length, 6, '한 달 안에 여섯 색 모두');
  eq(SHOP.stock('goods', DAY, GOODS, { day: { key: DAY, seeds: 2 } }).items[0].left, 1, '산 씨앗만큼 준다');
  eq(SHOP.stock('goods', DAY, GOODS, { day: { key: keyAdd(DAY, -1), seeds: 3 } }).items[0].left, 3, '다음 날은 다시 셋');
})();

console.log('== 사기');
(function () {
  var C = catalogue(13), it = SHOP.stock('clothes', DAY, C, {}).items[0], s0 = { shells: it.price + 5, seeds: 1, dyes: { red: 2, later: 9 }, shop: { got: { 'zz:later': '2026-01-01' }, extra: 7 } }, snap = JSON.stringify(s0);
  var r = SHOP.buy(s0, 'clothes', it, DAY);
  ok(r.ok && r.own === it.key, '옷 사기');
  eq(r.state.shells, 5, '값만큼 준다');
  eq(r.state.shop.got[it.key], DAY, '산 날을 적는다');
  ok(r.state.shop.got['zz:later'] === '2026-01-01' && r.state.shop.extra === 7 && r.state.dyes.later === 9, '모르는 값은 그대로');
  eq(JSON.stringify(s0), snap, '받은 상태는 안 바꾼다');
  var r2 = SHOP.buy(r.state, 'clothes', it, DAY);
  ok(!r2.ok && r2.why === 'owned' && r2.state.shells === 5, '두 번 사도 한 번만 나간다');
  ok(SHOP.buy({ shells: 99, owned: (function () { var o = {}; o[it.key] = DAY; return o; })() }, 'clothes', it, DAY).why === 'owned', '옷장에 있으면 안 산다');
  ok(SHOP.buy({ shells: 99, owned: {}, shop: { got: (function () { var o = {}; o[it.key] = true; return o; })() } }, 'clothes', it, DAY).ok, '영수증만 있고 옷장에 없으면 다시 살 수 있다 (막힌 칸이 안 생긴다)');
  var r3 = SHOP.buy({ shells: it.price - 1 }, 'clothes', it, DAY);
  ok(!r3.ok && r3.why === 'short' && r3.state.shells === it.price - 1, '모자라면 안 산다');
  ok(SHOP.buy({ shells: 99 }, 'clothes', { key: 'a:b', price: 0 }, DAY).why === 'bad', '값 0 은 안 받는다');
  ok(SHOP.buy({ shells: 99 }, 'clothes', { key: 'a:b', price: -3 }, DAY).why === 'bad', '음수 값은 안 받는다');
  ok(SHOP.buy({ shells: 99 }, 'clothes', null, DAY).why === 'bad', '물건이 없으면 안 받는다');
  var seed = SHOP.stock('goods', DAY, GOODS, {}).items[0], st = { shells: 20, seeds: 0, dyes: {}, shop: {} }, n = 0;
  for (var i = 0; i < 5; i++) { var b = SHOP.buy(st, 'goods', seed, DAY); if (b.ok) { n++; st = b.state; } else eq(b.why, 'none', '넷째 씨앗은 없다'); }
  ok(n === 3 && st.seeds === 3 && st.shells === 14, '씨앗은 하루 셋 · 조개 6');
  var nx = SHOP.buy(st, 'goods', seed, keyAdd(DAY, 1));
  ok(nx.ok && nx.state.seeds === 4 && nx.state.shop.day.seeds === 1, '다음 날 다시 산다');
  ok(SHOP.buy({ shells: 1 }, 'goods', seed, DAY).why === 'short', '씨앗도 모자라면 안 산다');
  ok(SHOP.buy({ shells: 9 }, 'goods', { key: 'seed', type: 'seed', price: 1 }, DAY).why === 'bad', '씨앗 값을 바꿔 넣으면 안 받는다');
  var dye = SHOP.stock('goods', DAY, GOODS, {}).items[1], bd = SHOP.buy({ shells: 6, dyes: { red: 1 } }, 'goods', dye, DAY);
  ok(bd.ok && bd.state.shells === 0 && bd.state.dyes[dye.id] === (dye.id === 'red' ? 2 : 1), '염료 사기');
  ok(SHOP.buy({ shells: 5 }, 'goods', dye, DAY).why === 'short', '염료도 모자라면 안 산다');
})();

console.log('== 저장 · 두 탭');
(function () {
  var u = SHOP.normalize({ shells: 3 });
  eq([u.shop, u.beach], [{ got: {}, day: null }, { day: null, picked: [] }], '없던 칸은 빈 값으로');
  var v = SHOP.normalize({ shop: { got: { 'x:y': '2026-11-01', 'q:later': { v: 2 } }, day: { key: DAY, seeds: 2, note: 'k' }, later: [1] }, beach: { day: DAY, picked: [1, 'x'], more: 1 } });
  ok(v.shop.got['q:later'].v === 2 && v.shop.later[0] === 1 && v.shop.day.note === 'k' && v.beach.more === 1 && v.beach.picked.length === 2, '모르는 값은 그대로');
  eq(SHOP.normalize({ shop: 'x', beach: 3 }).shop, { got: {}, day: null }, '깨진 칸은 빈 값으로');
  var A = { shop: { got: { 'a:1': '2026-11-20', 'a:2': '2026-11-21' }, day: { key: DAY, seeds: 1 }, mineOnly: 1 }, beach: { day: DAY, picked: [0] } };
  var B = { shop: { got: { 'a:2': '2026-11-19', 'b:9': '2026-11-21' }, day: { key: DAY, seeds: 2 }, theirs: 2 }, beach: { day: DAY, picked: [3, 0] } };
  var m = SHOP.merge(A, B), m2 = SHOP.merge(B, A);
  eq(Object.keys(m.shop.got).sort(), ['a:1', 'a:2', 'b:9'], '산 것은 합집합');
  eq(m.shop.got['a:2'], '2026-11-19', '같은 것은 이른 날');
  eq(m.shop.day.seeds, 2, '같은 날 씨앗은 큰 쪽');
  ok(m.shop.mineOnly === 1 && m.shop.theirs === 2, '모르는 칸은 양쪽 다');
  eq(m.beach.picked.slice().sort(), [0, 3], '주운 자리 합집합');
  eq([Object.keys(m2.shop.got).sort(), m2.shop.day.seeds, m2.beach.picked.slice().sort()], [['a:1', 'a:2', 'b:9'], 2, [0, 3]], '차례를 바꿔도 같다');
  var old = SHOP.merge({ beach: { day: keyAdd(DAY, -1), picked: [0, 1, 2] }, shop: { day: { key: keyAdd(DAY, -1), seeds: 3 } } }, { beach: { day: DAY, picked: [4] }, shop: { day: { key: DAY, seeds: 1 } } });
  eq([old.beach.day, old.beach.picked, old.shop.day.seeds], [DAY, [4], 1], '다른 날이면 늦은 날 것');
  eq(SHOP.merge({}, null), { shop: { got: {}, day: null }, beach: { day: null, picked: [] } }, '빈 것끼리');
})();

console.log('== 바닷가 조개');
(function () {
  var s = SHOP.shells(DAY), seen = {};
  eq(s, SHOP.shells(DAY), '같은 날 같은 자리');
  ok(s.length === 3 && new Set(s).size === 3 && s.every(function (i) { return i >= 0 && i < 5 && i === Math.floor(i); }), '다섯 중 셋');
  for (var d = 0; d < 30; d++) SHOP.shells(keyAdd(DAY, d)).forEach(function (i) { seen[i] = 1; });
  eq(Object.keys(seen).length, 5, '한 달 안에 다섯 자리 모두');
  var p = SHOP.pick({ day: keyAdd(DAY, -1), picked: [0, 1, 2], keep: 1 }, s[0], DAY);
  ok(p.ok && p.beach.day === DAY && p.beach.picked.length === 1 && p.beach.keep === 1, '줍기 (어제 것은 비운다 · 모르는 칸은 둔다)');
  ok(!SHOP.pick(p.beach, s[0], DAY).ok, '같은 자리 두 번은 안 된다');
  var no = [0, 1, 2, 3, 4].filter(function (i) { return s.indexOf(i) < 0; })[0];
  ok(!SHOP.pick({}, no, DAY).ok, '오늘 없는 자리는 안 된다');
  eq(SHOP.shellsLeft(DAY, p.beach), s.slice(1), '남은 자리');
  eq(SHOP.shellsLeft(keyAdd(DAY, 1), p.beach), SHOP.shells(keyAdd(DAY, 1)), '다음 날은 다시 셋');
})();

console.log('== 파일');
(function () {
  var src = fs.readFileSync(path.join(__dirname, '..', 'js', 'shop.js'), 'utf8');
  ok(!/Math\.random|Date\.now|new Date\(\)|document\.|window\./.test(src), '시계 · 무작위 · DOM 을 안 쓴다');
})();

console.log('\n' + pass + ' passed' + (fail ? ', ' + fail + ' FAILED' : ''));
process.exit(fail ? 1 : 0);
