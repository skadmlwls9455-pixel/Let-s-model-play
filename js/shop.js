/* 가게 규칙 (11-21 7차 갈래 S) — DOM 없음 · 시계 없음 · 무작위 없음 (날짜와 목록을 받아서만 정한다. node 에서 그대로 돈다: tools/test-shop.js)
   · 옷가게: 하루 네 개. 살 수 있는 옷 전부를 한 바퀴 (ceil(N/4) 일) 에 한 번씩 돌린다 → 놓친 것은 다음 바퀴에 또 온다 (기한 · 한정 없음).
     바퀴마다 시드로 섞되 싼 것 둘 · 비싼 것 둘이 하루에 오게 엇갈려 놓는다 (오늘 살 것 하나 · 모아서 살 것 하나).
     전에 산 것은 다음 차례 것으로 바뀌고, 오늘 산 것은 '있음' 표시로 그 자리에 남는다 (사자마자 선반이 바뀌지 않게).
   · 잡화점: 씨앗 (하루 세 개까지) 과 그날의 염료 색 셋 (값은 재봉틀과 같다 — 앱이 넘겨준다).
   · 바닷가 조개: 다섯 자리 중 그날의 셋. 주운 자리는 그날 다시 안 나온다.
   저장 (앱이 S.user 에 둔다): shop = { got: { '갈래:id': 'YYYY-MM-DD' }, day: { key, seeds } | null } · beach = { day, picked: [자리] }
   모르는 칸 · 모르는 물건은 지우지 않는다 (나중 빌드가 알 수도 있다). */
var SHOP = (function () {
  'use strict';
  var SMALL = 5;   /* 11-24: 날마다 진열에 이 값 이하인 것 하나 (첫날 조개로도 살 수 있게). 그런 옷이 목록에 없거나 다 가졌으면 그대로 */
  var PER_DAY = 4, SEED_PRICE = 2, SEED_MAX = 3, DYE_N = 3, SPOTS = 5, SPOTS_DAY = 3;
  function isObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
  function isKey(k) { return typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k); }
  function hash(s) { var x = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
  function rng(a) { a = a >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function shuffle(list, seed) { var a = list.slice(), r = rng(seed); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function dayNo(key) { var p = String(key).split('-'); return Math.floor(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000); }   /* 날짜 → 날 번호 (시간대와 무관) */
  function priceOf(x) { var p = isObj(x) && isObj(x.shop) ? x.shop.price : null; return typeof p === 'number' && isFinite(p) && p >= 1 ? Math.floor(p) : 0; }

  /* 옷 목록 (계약 C4: { cats: [{ key, items: [{ id, name, shop: { price } | null }] }] }) → 살 수 있는 것만, 키 순 (기기마다 같은 차례) */
  function shopItems(cat) {
    var out = [];
    (isObj(cat) && Array.isArray(cat.cats) ? cat.cats : []).forEach(function (c) {
      if (!isObj(c) || typeof c.key !== 'string' || !Array.isArray(c.items)) return;
      c.items.forEach(function (x) {
        var p = priceOf(x); if (!p || typeof x.id !== 'string') return;
        out.push({ key: c.key + ':' + x.id, cat: c.key, id: x.id, name: typeof x.name === 'string' && x.name ? x.name : x.id, price: p });
      });
    });
    out.sort(function (a, b) { return a.key < b.key ? -1 : a.key > b.key ? 1 : 0; });
    return out.filter(function (x, i) { return !i || out[i - 1].key !== x.key; });
  }
  function cycleLen(n) { return n ? Math.ceil(n / Math.min(PER_DAY, n)) : 0; }
  function cycleOrder(items, cyc) {   /* 한 바퀴의 차례: 섞고 → 값으로 반을 갈라 (싼 반 · 비싼 반) → 싼 것 · 비싼 것 번갈아 */
    var sh = shuffle(items, hash('shop|clothes|' + cyc)), by = sh.map(function (x, i) { return { x: x, i: i }; });
    by.sort(function (a, b) { return a.x.price - b.x.price || a.i - b.i; });
    var half = Math.ceil(by.length / 2), lo = by.slice(0, half).sort(function (a, b) { return a.i - b.i; }), hi = by.slice(half).sort(function (a, b) { return a.i - b.i; }), out = [];
    for (var k = 0; k < half; k++) { out.push(lo[k].x); if (hi[k]) out.push(hi[k].x); }
    return out;
  }
  function shelfOf(list, d, per, own, dateKey, salt) {   /* 한 줄의 바퀴: 하루 per 개, 전에 산 것은 다음 차례의 아직 없는 것으로 */
    var n = list.length; if (!n || per < 1) return [];
    per = Math.min(per, n); var len = Math.ceil(n / per), cyc = Math.floor(d / len), pos = d - cyc * len, ord = cycleOrder(list, cyc + salt), picks = [], used = {};
    for (var i = 0; i < per; i++) { var it = ord[(pos * per + i) % n]; if (used[it.key]) continue; picks.push(it); used[it.key] = 1; }
    var next = (pos * per + per) % n, seen = 0;
    return picks.map(function (p) {
      if (!own[p.key] || own[p.key] === dateKey) return p;
      while (seen < n) { var c = ord[(next + seen) % n]; seen++; if (!own[c.key] && !used[c.key]) { used[c.key] = 1; return c; } }
      return p;
    });
  }
  function clothesStock(dateKey, cat, owned) {
    var items = shopItems(cat), n = items.length, own = isObj(owned) ? owned : {};
    if (!n || !isKey(dateKey)) return { kind: 'clothes', day: dateKey, items: [], total: n };
    var d = dayNo(dateKey), per = Math.min(PER_DAY, n), picks;
    /* 11-24: 작은 것 (SMALL 이하) 은 제 칸 하나에서 날마다 돌고, 나머지는 남은 칸에서 제 바퀴를 돈다 → 첫날에도 살 수 있는 것이 늘 하나 있고, 어느 것도 차례를 잃지 않는다.
       작은 것을 다 가졌으면 (오늘 산 것은 빼고) 그 칸도 나머지 바퀴가 쓴다 */
    var small = items.filter(function (x) { return x.price <= SMALL; }), rest = items.filter(function (x) { return x.price > SMALL; });
    var smallLeft = small.filter(function (x) { return !own[x.key] || own[x.key] === dateKey; });
    if (small.length && rest.length && smallLeft.length) {
      var today = smallLeft.filter(function (x) { return own[x.key] === dateKey; }), sm = today.length ? today[0] : smallLeft[((d % smallLeft.length) + smallLeft.length) % smallLeft.length];
      picks = shelfOf(rest, d, per - 1, own, dateKey, 0).concat([sm]);
    } else picks = shelfOf(rest.length ? rest : items, d, per, own, dateKey, 0);
    if (picks.length < per) { var have = {}; picks.forEach(function (p) { have[p.key] = 1; }); items.forEach(function (x) { if (picks.length < per && !have[x.key]) { picks.push(x); have[x.key] = 1; } }); }
    return { kind: 'clothes', day: dateKey, total: n, items: picks.map(function (p) { return { key: p.key, cat: p.cat, id: p.id, name: p.name, price: p.price, owned: !!own[p.key] }; }) };
  }
  /* 잡화점: cat = { dyes: [{ id, name, hex }], dyeCost } · shop = 저장된 shop (오늘 산 씨앗 수) */
  function seedsBought(shop, dateKey) { var d = isObj(shop) && isObj(shop.day) && shop.day.key === dateKey ? shop.day.seeds : 0; return Math.max(0, d | 0); }
  function goodsStock(dateKey, cat, shop) {
    var out = [{ key: 'seed', type: 'seed', name: '씨앗', price: SEED_PRICE, left: Math.max(0, SEED_MAX - seedsBought(shop, dateKey)) }];
    var dyes = isObj(cat) && Array.isArray(cat.dyes) ? cat.dyes.filter(function (x) { return isObj(x) && typeof x.id === 'string'; }) : [], cost = isObj(cat) && cat.dyeCost >= 1 ? Math.floor(cat.dyeCost) : 0;
    if (cost && isKey(dateKey)) {
      var pick = shuffle(dyes, hash('shop|dye|' + dateKey)).slice(0, DYE_N);
      dyes.forEach(function (x) { if (pick.indexOf(x) >= 0) out.push({ key: 'dye:' + x.id, type: 'dye', id: x.id, name: x.name || x.id, hex: x.hex || null, price: cost }); });   /* 색 차례는 목록 그대로 */
    }
    return { kind: 'goods', day: dateKey, items: out };
  }
  function stock(kind, dateKey, cat, owned) { return kind === 'goods' ? goodsStock(dateKey, cat, owned) : clothesStock(dateKey, cat, owned); }

  /* 저장 칸 고치기: 틀만 맞추고 모르는 값은 둔다 */
  function normalize(u) {
    if (!isObj(u)) return u;
    if (!isObj(u.shop)) u.shop = {};
    if (!isObj(u.shop.got)) u.shop.got = {};
    if (u.shop.day === undefined) u.shop.day = null;   /* 모르는 모양 (나중 빌드) 은 그대로 둔다: 읽는 쪽이 '오늘 것 없음' 으로 읽고, 오늘 것을 쓸 때 새로 만든다 */
    if (!isObj(u.beach)) u.beach = {};
    if (u.beach.day === undefined) u.beach.day = null;
    if (u.beach.picked === undefined) u.beach.picked = [];
    return u;
  }
  function copy(x) { return x == null ? x : JSON.parse(JSON.stringify(x)); }
  /* 사기 (순수): state = { shells, seeds, dyes, shop, owned? } → { ok, state(새 객체), why: null | 'short' | 'owned' | 'none' | 'bad', own?: '갈래:id' }. 값과 가진 조개를 여기서 다시 본다 */
  function buy(state, kind, item, dateKey) {
    var st = { shells: Math.max(0, state && state.shells | 0), seeds: Math.max(0, state && state.seeds | 0), dyes: copy(isObj(state && state.dyes) ? state.dyes : {}), shop: copy(isObj(state && state.shop) ? state.shop : {}) };
    normalize(st); delete st.beach;
    function no(why) { return { ok: false, state: st, why: why }; }
    var price = isObj(item) && typeof item.price === 'number' && isFinite(item.price) ? Math.floor(item.price) : 0;
    if (!isObj(item) || typeof item.key !== 'string' || price < 1 || !isKey(dateKey)) return no('bad');
    if (kind === 'clothes') {
      if (isObj(state.owned) ? state.owned[item.key] : st.shop.got[item.key]) return no('owned');   /* 가졌는지는 옷장 (owned) 이 정한다. 옷장을 안 넘겼을 때만 영수증으로 */
      if (st.shells < price) return no('short');
      st.shells -= price; st.shop.got[item.key] = dateKey;
      return { ok: true, state: st, why: null, own: item.key };
    }
    if (kind !== 'goods') return no('bad');
    if (item.type === 'seed') {
      var had = seedsBought(st.shop, dateKey);
      if (price !== SEED_PRICE) return no('bad');
      if (had >= SEED_MAX) return no('none');
      if (st.shells < price) return no('short');
      st.shells -= price; st.seeds += 1; st.shop.day = Object.assign(isObj(st.shop.day) && st.shop.day.key === dateKey ? st.shop.day : {}, { key: dateKey, seeds: had + 1 });
      return { ok: true, state: st, why: null };
    }
    if (item.type === 'dye' && typeof item.id === 'string') {
      if (st.shells < price) return no('short');
      st.shells -= price; st.dyes[item.id] = (st.dyes[item.id] | 0) + 1;
      return { ok: true, state: st, why: null };
    }
    return no('bad');
  }
  /* 두 탭: 산 것은 합집합 (같은 것이면 이른 날짜) · 오늘 산 씨앗 수는 같은 날이면 큰 쪽, 아니면 늦은 날 · 주운 자리는 같은 날이면 합집합. a 가 바탕 (모르는 칸은 a 것, a 에 없으면 b 것) */
  function mergeShop(a, b) {
    var A = isObj(a) ? a : {}, B = isObj(b) ? b : {}, out = Object.assign({}, B, A), got = {}, k;
    [B.got, A.got].forEach(function (g) { if (isObj(g)) for (k in g) if (!got[k] || (isKey(g[k]) && isKey(got[k]) && g[k] < got[k])) got[k] = g[k]; });
    out.got = got;
    var da = isObj(A.day) && isKey(A.day.key) ? A.day : null, db = isObj(B.day) && isKey(B.day.key) ? B.day : null;
    out.day = !da ? copy(db) : !db ? copy(da) : da.key === db.key ? Object.assign({}, db, da, { seeds: Math.max(da.seeds | 0, db.seeds | 0) }) : copy(da.key > db.key ? da : db);
    return out;
  }
  function mergeBeach(a, b) {
    var A = isObj(a) ? a : {}, B = isObj(b) ? b : {}, out = Object.assign({}, B, A), ka = isKey(A.day) ? A.day : '', kb = isKey(B.day) ? B.day : '';
    var pa = Array.isArray(A.picked) ? A.picked : [], pb = Array.isArray(B.picked) ? B.picked : [];
    if (ka === kb) { out.day = ka || null; out.picked = pa.concat(pb.filter(function (x) { return pa.indexOf(x) < 0; })); }
    else if (ka > kb) { out.day = ka; out.picked = pa.slice(); } else { out.day = kb; out.picked = pb.slice(); }
    return out;
  }
  function merge(a, b) { return { shop: mergeShop(a && a.shop, b && b.shop), beach: mergeBeach(a && a.beach, b && b.beach) }; }

  /* 바닷가: 그날 나오는 자리 (다섯 중 셋, 오름차순) · 아직 남은 자리 · 줍기 (순수) */
  function shells(dateKey) { if (!isKey(dateKey)) return []; var all = []; for (var i = 0; i < SPOTS; i++) all.push(i); return shuffle(all, hash('beach|' + dateKey)).slice(0, SPOTS_DAY).sort(function (a, b) { return a - b; }); }
  function shellsLeft(dateKey, beach) { var p = isObj(beach) && beach.day === dateKey && Array.isArray(beach.picked) ? beach.picked : []; return shells(dateKey).filter(function (i) { return p.indexOf(i) < 0; }); }
  function pick(beach, idx, dateKey) {
    if (shellsLeft(dateKey, beach).indexOf(idx) < 0) return { ok: false, beach: beach };
    var b = Object.assign({}, isObj(beach) ? beach : {}); b.picked = (b.day === dateKey && Array.isArray(b.picked) ? b.picked : []).concat([idx]); b.day = dateKey;
    return { ok: true, beach: b };
  }
  return { PER_DAY: PER_DAY, SMALL: SMALL, SEED_PRICE: SEED_PRICE, SEED_MAX: SEED_MAX, DYE_N: DYE_N, SPOTS: SPOTS, SPOTS_DAY: SPOTS_DAY,
    stock: stock, buy: buy, normalize: normalize, merge: merge, shopItems: shopItems, cycleLen: cycleLen, shells: shells, shellsLeft: shellsLeft, pick: pick };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = SHOP;
