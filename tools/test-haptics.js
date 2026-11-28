#!/usr/bin/env node
/* tools/test-haptics.js — 진동 도우미 (js/haptics.js) 검사 (node, 의존성 없음). 실패하면 exit 1.
 *
 *   node tools/test-haptics.js
 *
 * 11-15 5차 (가까이 보기 §7.1 · §15.3). navigator · document · matchMedia · localStorage 를 가짜로 세우고 매번 새로 읽는다.
 * - 기본 켬 · set(false) 면 한 번도 부르지 않음 · 다시 켜면 다시
 * - supported(): vibrate 가 함수 · 파이어폭스 아님 · 손가락 포인터 (any-pointer: coarse) 가 모두 맞을 때만
 * - 사람이 한 번도 안 눌렀으면 (userActivation.hasBeenActive false) · 숨은 쪽이면 부르지 않음
 * - 한 번짜리 무늬는 30 ms 안에 겹치면 하나로
 * - 부엌 무늬 tap 14 · flip 24 · cut 16 · done [16,80,26] (3 번 이하 · 250 ms 이하 · done 의 쉼은 70 ms 이상), 다른 무늬는 그대로
 * - 5차 검증 O-5: 부엌 (js/cook.js) 은 tap · flip · cut 만 부른다 (주인: 요리 톡 · 뒤집기 · 썰기) — 접시 done 은 부르지 않는다
 * - 무엇이 던져도 buzz 는 false 를 돌려줄 뿐 던지지 않는다
 */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm');
var SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'haptics.js'), 'utf8');
var fails = 0, passes = 0;
function check(c, m) { if (c) passes++; else { fails++; console.error('  FAIL ' + m); } }

/* env: { ua, coarse, active (undefined = no userActivation API), vis, vibrate (false = none), store (object | 'throw'), now } */
function load(env) {
  env = env || {};
  var calls = [], store = env.store === undefined ? {} : env.store, clock = { t: env.now || 100000 };
  var nav = { userAgent: env.ua || 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36' };
  if (env.vibrate !== false) nav.vibrate = env.vibrate || function (p) { calls.push(p); return true; };
  if (env.active !== undefined) nav.userActivation = { hasBeenActive: !!env.active, isActive: !!env.active };
  var ls = store === 'throw'
    ? { getItem: function () { throw new Error('denied'); }, setItem: function () { throw new Error('denied'); } }
    : { getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; }, setItem: function (k, v) { store[k] = String(v); } };
  var ctx = {
    navigator: nav,
    document: { visibilityState: env.vis || 'visible' },
    matchMedia: env.noMM ? undefined : function (q) { return { matches: q === '(any-pointer: coarse)' ? env.coarse !== false : false, media: q }; },
    localStorage: ls,
    Date: { now: function () { return clock.t; } },
    JSON: JSON, Object: Object, String: String
  };
  vm.createContext(ctx);
  vm.runInContext(SRC + '\n;this.HAPTICS = HAPTICS;', ctx);
  return { H: ctx.HAPTICS, calls: calls, store: store, clock: clock, nav: nav, ctx: ctx };
}
var ok = { active: true };

/* 기본 켬 · 끄기 · 다시 켜기 */
(function () {
  var e = load(ok);
  check(e.H.on() === true, '저장이 없으면 켬');
  check(e.H.supported() === true, '안드로이드 크롬 (vibrate · coarse) → supported');
  check(e.H.buzz('tap') === true && e.calls.length === 1 && e.calls[0] === 14, '켬 → tap 14 한 번 (' + JSON.stringify(e.calls) + ')');
  e.H.set(false);
  check(e.store[e.H.KEY] === '{"on":false}', "끄면 'ppolppol_haptics' = {on:false}");
  e.clock.t += 1000;
  ['tap', 'flip', 'cut', 'done', 'tick', 'jump'].forEach(function (n) { e.clock.t += 100; check(e.H.buzz(n) === false, '끔 → ' + n + ' 안 부름'); });
  check(e.calls.length === 1, '끈 동안 vibrate 0 번 (' + e.calls.length + ')');
  e.H.set(true); e.clock.t += 100;
  check(e.H.buzz('cut') === true && e.calls[e.calls.length - 1] === 16, '다시 켜면 다시 울림');
  var f = load({ active: true, store: { ppolppol_haptics: '{"on":false}' } });
  check(f.H.on() === false && f.H.buzz('tap') === false && f.calls.length === 0, '저장된 끔은 새 쪽에서도 끔');
  var g = load({ active: true, store: { ppolppol_haptics: '{{{' } });
  check(g.H.on() === true, '깨진 저장 → 켬 (던지지 않음)');
  var t = load({ active: true, store: 'throw' });
  check(t.H.on() === true && t.H.buzz('tap') === true, '저장소가 막혀도 켬 · 울림');
  t.H.set(false); t.clock.t += 100;
  check(t.H.on() === false && t.H.buzz('tap') === false && t.calls.length === 1, '저장소가 막혀도 이 쪽 안에서 끔이 지켜짐');
})();

/* supported(): 정직하게 */
(function () {
  var a = load({ active: true, vibrate: false });
  check(a.H.supported() === false && a.H.buzz('tap') === false, 'vibrate 가 없으면 (아이폰 사파리) supported false · 안 부름');
  var b = load({ active: true, vibrate: 1 });
  b.nav.vibrate = 'yes';
  check(b.H.supported() === false && b.H.buzz('tap') === false, 'vibrate 가 함수가 아니면 false');
  var c = load({ active: true, ua: 'Mozilla/5.0 (Android 14; Mobile; rv:132.0) Gecko/132.0 Firefox/132.0' });
  check(c.H.supported() === false && c.H.buzz('tap') === false && c.calls.length === 0, '파이어폭스 → supported false · 0 번');
  var d = load({ active: true, coarse: false });
  check(d.H.supported() === false && d.H.buzz('tap') === false && d.calls.length === 0, '손가락 포인터 없음 (컴퓨터) → supported false · 0 번');
  var m = load({ active: true, noMM: true });
  check(m.H.supported() === false && m.calls.length === 0, 'matchMedia 가 없으면 false');
  var x = load({ active: true });
  x.ctx.matchMedia = function () { throw new Error('boom'); };
  check(x.H.supported() === false && x.H.buzz('tap') === false, 'matchMedia 가 던져도 false (던지지 않음)');
})();

/* 사용자 활성화 · 숨은 쪽 */
(function () {
  var a = load({ active: false });
  check(a.H.supported() === true, '활성화 전에도 supported 는 기기 이야기 (true)');
  check(a.H.buzz('tap') === false && a.calls.length === 0, '한 번도 안 눌렀으면 (hasBeenActive false) 안 부름');
  a.nav.userActivation.hasBeenActive = true;
  check(a.H.buzz('tap') === true && a.calls.length === 1, '누른 뒤에는 울림');
  var n = load({});
  check(n.H.buzz('tap') === true && n.calls.length === 1, 'userActivation 이 없는 브라우저 → 막지 않음');
  var h = load({ active: true, vis: 'hidden' });
  check(h.H.buzz('tap') === false && h.H.buzz('done') === false && h.calls.length === 0, '숨은 쪽 → 안 부름');
  h.ctx.document.visibilityState = 'visible';
  check(h.H.buzz('tap') === true && h.calls.length === 1, '다시 보이면 울림');
})();

/* 30 ms 모으기 */
(function () {
  var e = load(ok);
  check(e.H.buzz('tap') === true, '첫 톡');
  e.clock.t += 10; check(e.H.buzz('tap') === false, '10 ms 뒤 톡은 하나로');
  e.clock.t += 19; check(e.H.buzz('cut') === false, '29 ms 뒤 (다른 이름이어도) 하나로');
  e.clock.t += 1; check(e.H.buzz('tap') === true, '30 ms 뒤면 새 톡');
  e.clock.t += 5; check(e.H.buzz('done') === true, '여러 번 무늬 (done) 는 모으지 않음');
  check(JSON.stringify(e.calls) === JSON.stringify([14, 14, [16, 80, 26]]), '부른 차례 ' + JSON.stringify(e.calls));
  check(e.H.buzz('nonsense') === false && e.H.buzz('toString') === false && e.H.buzz() === false, '모르는 이름은 false');
  var t = load({ active: true, vibrate: function () { throw new Error('nope'); } });
  var threw = false; try { check(t.H.buzz('tap') === false, 'vibrate 가 던지면 false'); } catch (err) { threw = true; }
  check(!threw, 'buzz 는 던지지 않는다');
  var r = load({ active: true, vibrate: function () { return false; } });
  check(r.H.buzz('tap') === false, 'vibrate 가 false 를 돌려주면 false');
})();

/* 무늬 */
(function () {
  var P = load(ok).H.PATTERNS;
  check(P.tap === 14 && P.flip === 24 && P.cut === 16, '부엌 한 번짜리: tap 14 · flip 24 · cut 16');
  check(JSON.stringify(P.done) === '[16,80,26]', '부엌 done [16,80,26]');
  ['tap', 'flip', 'cut', 'done'].forEach(function (n) {
    var a = Array.isArray(P[n]) ? P[n] : [P[n]], pulses = a.filter(function (v, i) { return i % 2 === 0; });
    var total = a.reduce(function (s, v) { return s + v; }, 0);
    check(pulses.length <= 3, n + ': 3 번 이하');
    check(total <= 250, n + ': 모두 250 ms 이하 (' + total + ')');
    check(a.every(function (v) { return typeof v === 'number' && v > 0 && Math.round(v) === v; }), n + ': 양의 정수 ms');
    a.forEach(function (v, i) { if (i % 2 === 1) check(v >= 70, n + ': 쉼 ' + v + ' ≥ 70 ms'); });
  });
  /* 다른 갈래 (달리기 · 가구) 무늬는 이번에 그대로 */
  check(P.tick === 8 && P.jump === 12 && P.land === 8 && P.pick === 10 && P.drop === 16, '달리기 · 가구 한 번짜리 무늬 그대로');
  check(JSON.stringify(P.hit) === '[40,30,40]' && JSON.stringify(P.nope) === '[10,40,10]', 'hit · nope 그대로');
  var H = load(ok).H;
  check(['buzz', 'on', 'set', 'supported'].every(function (k) { return typeof H[k] === 'function'; }) && H.KEY === 'ppolppol_haptics', 'API 그대로: buzz · on · set · supported · PATTERNS · KEY');
})();

/* 5차 검증 O-5: 부엌이 부르는 무늬는 주인이 고른 셋 (톡 · 뒤집기 · 썰기 = tap · flip · cut) 뿐 — 접시가 놓일 때 done 은 없다 */
(function () {
  var cook = fs.readFileSync(path.join(__dirname, '..', 'js', 'cook.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  var names = (cook.match(/\bbuzz\(\s*'([a-z]+)'\s*\)/g) || []).map(function (m) { return m.replace(/^buzz\(\s*'|'\s*\)$/g, ''); });
  var odd = names.filter(function (n) { return ['tap', 'flip', 'cut'].indexOf(n) < 0; });
  check(names.length >= 3 && odd.length === 0 && names.indexOf('done') < 0, "부엌이 부르는 진동은 tap · flip · cut 뿐 (" + names.join(',') + ')');
})();

/* 문서가 없는 곳 (node 바로) 에서도 던지지 않는다 */
(function () {
  var ctx = { JSON: JSON, Object: Object, String: String, Date: Date };
  vm.createContext(ctx);
  vm.runInContext(SRC + '\n;this.HAPTICS = HAPTICS;', ctx);
  var threw = false; try { check(ctx.HAPTICS.supported() === false && ctx.HAPTICS.buzz('tap') === false, 'navigator 없음 → false'); } catch (e) { threw = true; }
  check(!threw, 'navigator 없이도 던지지 않음');
})();

console.log('test-haptics: ' + passes + ' ok' + (fails ? ', ' + fails + ' FAIL' : ''));
process.exit(fails ? 1 : 0);
