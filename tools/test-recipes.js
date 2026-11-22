#!/usr/bin/env node
/* tools/test-recipes.js - 레시피 규칙 (js/recipes.js) 시험. node 만, 의존성 없음. 실패하면 exit 1.
 *
 *   node tools/test-recipes.js       (-v: 통과한 검사도 한 줄씩)
 *
 *   0 불러오기: module.exports + 전역 RECIPES, DOM / 시계 / 저장소 / Math.random 없음
 *   1 unlocked: 늘 열린 셋, 선물, 옛 수첩 → 과일 꼬치
 *   2 eat: 세 번째에 선물 한 번, 이미 열렸으면 선물 없음, 다른 메뉴는 세지 않음
 *   3 normalize: 모르는 값 지킴, 객체 아닌 것만 버림, 멱등
 *   4 merge: 큰 수, 이른 선물 날, 선물을 잃지 않음
 *   5 hadNotebook
 */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var FILE = path.join(path.resolve(__dirname, '..'), 'js', 'recipes.js');
var SRC = fs.readFileSync(FILE, 'utf8');
var VERBOSE = process.argv.indexOf('-v') >= 0;
var passes = 0, failures = 0;
function check(cond, msg) { if (cond) { passes++; if (VERBOSE) console.log('  ok   ' + msg); } else { failures++; console.log('  FAIL ' + msg); } }
function section(name, fn) { console.log('\n' + name); try { fn(); } catch (e) { failures++; console.log('  FAIL (threw) ' + (e && e.stack || e)); } }
function J(v) { return JSON.stringify(v); }

var REAL = { random: Math.random, now: Date.now };
Math.random = function () { throw new Error('Math.random used'); };
Date.now = function () { throw new Error('Date.now used'); };
var R = require(FILE);
var D0 = '2026-11-21', D1 = '2026-11-22';
var BASE = ['jeon2', 'gyeran', 'jumeokbap2'];

section('0 load', function () {
  check(typeof R === 'object' && global.RECIPES === R, 'module.exports and global RECIPES');
  var code = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  ['document', 'window.', 'localStorage', 'setTimeout', 'setInterval', 'Math.random', 'Date.now', 'new Date', 'fetch(', 'import ', 'export '].forEach(function (w) {
    check(code.indexOf(w) < 0, 'no ' + w + ' in js/recipes.js code');
  });
  var ctx = { console: console }; ctx.globalThis = ctx;
  vm.runInNewContext(SRC, ctx);
  check(ctx.RECIPES && typeof ctx.RECIPES.eat === 'function', 'loads in a bare context (browser path)');
  check(J(R.IDS) === J(['jeon2', 'gyeran', 'jumeokbap2', 'kkochi2', 'cake']) && J(R.ALWAYS) === J(BASE) && J(R.GIFTS) === J(['cake', 'kkochi2']) && R.GIFT_AT === 3, 'ids, always-open three, gifts, gift at 3');
  check(Object.isFrozen(R.IDS) && Object.isFrozen(R.ALWAYS), 'tables are frozen');
});

section('1 unlocked', function () {
  check(J(R.unlocked(undefined, false)) === J(BASE) && J(R.unlocked(null, false)) === J(BASE) && J(R.unlocked('x', false)) === J(BASE) && J(R.unlocked({}, false)) === J(BASE), 'nothing saved → the three');
  check(J(R.unlocked({}, true)) === J(['jeon2', 'gyeran', 'jumeokbap2', 'kkochi2']), 'an old notebook → fruit skewer too');
  check(J(R.unlocked({ cake: { n: 3, got: D0 } }, false)) === J(['jeon2', 'gyeran', 'jumeokbap2', 'cake']), 'a gifted cake');
  check(J(R.unlocked({ cake: { n: 2, got: null } }, false)) === J(BASE), 'two servings do not unlock');
  check(J(R.unlocked({ kkochi2: { n: 0, got: null, old: true } }, false)) === J(['jeon2', 'gyeran', 'jumeokbap2', 'kkochi2']), 'the remembered old-notebook mark unlocks without the notebook');
  check(J(R.unlocked({ cake: { n: 9, got: D0 }, kkochi2: { n: 3, got: D1 } }, false)) === J(R.IDS), 'everything');
  check(J(R.unlocked({ jeon2: 'broken', gyeran: null }, false)) === J(BASE), 'the three cannot be locked by bad data');
});

section('2 eat', function () {
  var s = {}, r;
  r = R.eat(s, 'cake', D0); check(r.n === 1 && r.gift === false && J(s) === '{}', 'first serving: n 1, no gift, the input is not changed');
  r = R.eat(r.state, 'cake', D0); check(r.n === 2 && r.gift === false, 'second: n 2');
  r = R.eat(r.state, 'cake', D1); check(r.n === 3 && r.gift === true && r.state.cake.got === D1, 'third: the gift, dated');
  var g = r.state;
  r = R.eat(g, 'cake', '2026-12-01'); check(r.n === 4 && r.gift === false && r.state.cake.got === D1, 'fourth: counted, no second gift, the date stays');
  check(J(R.unlocked(r.state, false)) === J(['jeon2', 'gyeran', 'jumeokbap2', 'cake']), 'the cake is open after the gift');
  r = R.eat({ kkochi2: { n: 2, got: null, old: true } }, 'kkochi2', D0); check(r.n === 3 && r.gift === false, 'already open from the old notebook → counted, no gift');
  r = R.eat({ kkochi2: { n: 2, got: null } }, 'kkochi2', D0); check(r.n === 3 && r.gift === true, 'kkochi2 gift for a new player');
  r = R.eat({ cake: { n: 7, got: null } }, 'cake', D0); check(r.gift === true && r.n === 8, 'a count already past three with no gift yet (older data) still gives it once');
  ['jeon2', 'gyeran', 'coffee', '', undefined, '__proto__'].forEach(function (id) { var q = R.eat({ cake: { n: 1, got: null } }, id, D0); check(q.n === 0 && q.gift === false && J(q.state) === J({ cake: { n: 1, got: null } }), 'not a gift menu (' + id + ') → nothing counted'); });
  r = R.eat({ cake: { n: 2, got: null } }, 'cake', 'not a date'); check(r.gift === true && typeof r.state.cake.got === 'string', 'a bad date does not lose the gift');
  var many = {}; for (var i = 0; i < 12; i++) { many = R.eat(many, 'cake', D0).state; }
  check(many.cake.n === 12 && many.cake.got === D0, 'twelve servings: one gift date');
});

section('3 normalize', function () {
  var raw = { cake: { n: 2.9, got: 'x', note: 'keep' }, future: { n: 1, got: D0, lv: 3 }, bad: 5, arr: [1], kkochi2: { n: -4, got: null, old: true } };
  var n = R.normalize(raw);
  check(n.cake.n === 2 && n.cake.got === null && n.cake.note === 'keep', 'numbers floored, bad date → null, unknown field kept');
  check(n.future && n.future.lv === 3 && n.future.n === 1 && n.future.got === D0, 'unknown id kept whole');
  check(!('bad' in n) && !('arr' in n), 'non-objects dropped');
  check(n.kkochi2.n === 0 && n.kkochi2.old === true, 'negative count → 0, old mark kept');
  check(J(R.normalize(n)) === J(n) && n !== raw && n.cake !== raw.cake, 'idempotent, a fresh copy');
  check(J(R.normalize(undefined)) === '{}' && J(R.normalize([1, 2])) === '{}' && J(R.normalize('s')) === '{}', 'nothing usable → {}');
  check(R.normalize({ cake: { n: 1e9, got: null } }).cake.n === 9999, 'count capped');
});

section('4 merge (two tabs)', function () {
  var a = { cake: { n: 3, got: D1 }, kkochi2: { n: 1, got: null } }, b = { cake: { n: 2, got: null }, kkochi2: { n: 2, got: null, old: true }, future: { n: 1, got: null, x: 1 } };
  var m = R.merge(a, b), m2 = R.merge(b, a);
  check(m.cake.n === 3 && m.cake.got === D1 && m2.cake.got === D1, 'the gift survives from either side');
  check(m.kkochi2.n === 2 && m.kkochi2.old === true && m2.kkochi2.old === true, 'higher count, old mark from either side');
  check(m.future && m.future.x === 1, 'an id only one side knows is kept');
  check(R.merge({ cake: { n: 5, got: D1 } }, { cake: { n: 4, got: D0 } }).cake.got === D0, 'earliest gift date');
  check(R.same(m, m2) && R.same(R.merge(m, a), m) && R.same(R.merge(a, undefined), a) && R.same(R.merge(null, b), b), 'symmetric, idempotent, an empty side changes nothing');
  check(R.same({ cake: { n: 1, got: null } }, { cake: { n: 1, got: null } }) && !R.same({ cake: { n: 1, got: null } }, { cake: { n: 2, got: null } }), 'same()');
});

section('5 hadNotebook', function () {
  check(R.hadNotebook({ v: 1, book: [{ id: 'ck_1', recipe: 'jeon' }] }) && R.hadNotebook({ book: [{ recipe: 'gyeran' }, { recipe: 'kkochi' }] }), 'a legacy line → true');
  check(!R.hadNotebook({ book: [{ recipe: 'jeon2' }, { recipe: 'cake' }] }) && !R.hadNotebook({ book: [] }) && !R.hadNotebook({}) && !R.hadNotebook(null) && !R.hadNotebook({ book: 'x' }) && !R.hadNotebook({ book: [null, 3] }), 'only new lines, nothing or broken → false');
});

Math.random = REAL.random; Date.now = REAL.now;
console.log('\n' + passes + ' passed, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
