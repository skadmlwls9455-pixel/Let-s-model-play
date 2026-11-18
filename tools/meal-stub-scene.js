/* tools/meal-stub-scene.js - 식탁 장면 API 대역 (페이지 init 스크립트). 스모크 EAT · tools/test-meal-flow.js 가 쓴다.
 *
 * lane D 의 식탁 (wip/round6/eat-spec.md §10.3) 이 아직 없는 장면에만 붙는다: SCENE3D.init 이 돌려준 장면에 tableInfo 가 없으면
 * setTableDish · tableInfo · playerSitTable · playerStandTable · octCanCome · octToTable · octTableBeat · mealBite · octLeaveTable · octAtTable · setAura
 * 와 on.tableSpot · hotspot 'table' 을 흉내 낸다 (그림 없음 — 상태와 부른 기록만). 진짜 식탁이 있으면 아무것도 하지 않는다 (window.__mealStub 없음).
 * 시험용 손잡이: __mealStub.stand() (일어남) · __mealStub.no = true (octCanCome false) · __mealStub.calls (부른 기록)
 */
(function () {
  'use strict';
  var real;
  try {
    Object.defineProperty(window, 'SCENE3D', { configurable: true, get: function () { return real; }, set: function (v) { real = wrap(v); } });
  } catch (e) { /* 이미 있다 */ }
  function wrap(S3) {
    if (!S3 || typeof S3.init !== 'function' || S3.__mealWrapped) return S3;
    var init = S3.init;
    S3.init = function (box, opts) {
      var sc = init.apply(this, arguments);
      if (sc && typeof sc.tableInfo !== 'function') install(sc, opts || {});
      return sc;
    };
    S3.__mealWrapped = true;
    return S3;
  }
  function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function install(sc, opts) {
    var T = window.__mealStub = { me: 'none', oct: 'none', dish: null, pieces: 0, aura: { me: null, oct: null }, calls: [], no: false, btn: null, last: '' };
    function inPlay() { return typeof sc.room === 'function' && sc.room() === 'play'; }
    function emit() {
      var on = opts.on || {}, p = inPlay();
      var spot = { seat: p && T.me !== 'seated' ? { x: 120, y: 330 } : null, call: p && T.me === 'seated' ? { x: 230, y: 250 } : null, dish: p && T.dish ? { x: 180, y: 320 } : null };
      var k = JSON.stringify(spot);
      if (k === T.last) return; T.last = k;
      if (typeof on.tableSpot === 'function') on.tableSpot(spot);
    }
    var hs = sc.hotspots;
    sc.hotspots = function (map) { T.btn = map && map.table || T.btn; return hs.apply(sc, arguments); };
    setInterval(function () {
      if (!inPlay() && (T.oct !== 'none' || T.me !== 'none')) { T.oct = 'none'; T.me = 'none'; }   /* 방을 나가면 바로 다락으로 (D 규칙) */
      if (T.btn) { var show = inPlay(); if (T.btn.hidden === show) T.btn.hidden = !show; if (show) { T.btn.style.left = '150px'; T.btn.style.top = '290px'; } }
      emit();
    }, 60);
    sc.setTableDish = function (d, o) { T.calls.push(['dish', d ? d.id : null, !!(o && o.appear)]); T.dish = d || null; T.pieces = d ? 4 : 0; emit(); return true; };
    sc.tableInfo = function () { return { built: true, dish: T.dish, pieces: T.pieces, me: T.me, oct: T.oct, aura: { me: T.aura.me, oct: T.aura.oct }, geom: { stub: true } }; };
    sc.playerSitTable = function () { if (!inPlay()) return Promise.resolve(false); T.me = 'walking'; emit(); return delay(150).then(function () { if (!inPlay()) return false; T.me = 'seated'; emit(); return true; }); };
    sc.playerStandTable = function () { T.me = 'none'; emit(); return Promise.resolve(); };
    T.stand = function () { T.me = 'none'; emit(); };
    sc.octCanCome = function () { return !T.no && inPlay() && T.oct !== 'leaving'; };
    sc.octToTable = function (o) {
      T.calls.push(['come', !!(o && o.instant), T.oct]);
      if (!sc.octCanCome()) return Promise.resolve(false);
      if (T.oct === 'seated') return Promise.resolve(true);
      T.oct = 'coming';
      return delay(o && o.instant ? 0 : 300).then(function () { if (T.oct !== 'coming') return false; T.oct = 'seated'; return true; });
    };
    sc.octTableBeat = function (n) { T.calls.push(['beat', n]); return delay(n === 'think' ? 1000 : 120); };
    sc.mealBite = function (w) { T.calls.push(['bite', w]); if (!T.pieces) return Promise.resolve(false); T.pieces--; return delay(150).then(function () { return true; }); };
    sc.octLeaveTable = function (o) { T.calls.push(['leave', !!(o && o.instant)]); if (T.oct === 'none') return Promise.resolve(); T.oct = 'leaving'; return delay(o && o.instant ? 0 : 300).then(function () { T.oct = 'none'; }); };
    sc.octAtTable = function () { return T.oct === 'seated' || T.oct === 'coming'; };
    sc.setAura = function (w, fx, o) { T.calls.push(['aura', w, fx || null, !!(o && o.bloom)]); T.aura[w] = fx || null; };
  }
})();
