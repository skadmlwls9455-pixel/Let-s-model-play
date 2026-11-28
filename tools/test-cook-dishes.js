#!/usr/bin/env node
/* tools/test-cook-dishes.js -- round 6 (11-18): the two new dishes (jumeokbap, kkochi). Node only, no DOM. Exit 1 on failure.
 *   node tools/test-cook-dishes.js
 * Sim: full runs per recipe by touch and by the chip, looks, describe lines, result envelopes, book lines, the pinned
 * tuneOf numbers, a golden ada2967 jeon pot (made by the ada2967 code itself, from git) still resumes, a pot with another
 * recipe's tune is refused, TUNE_HASH unchanged. Art (js/cook-dishes.js): determinism, Apollo + FOOD only, alpha 0/255,
 * carry pixels = the still scenes, reveal inside x 33..111, drawDish never throws, static rules (no Math.random, ASCII).
 */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
var ROOT = path.resolve(__dirname, '..');
var passes = 0, fails = 0;
function check(c, m) { if (c) passes++; else { fails++; console.error('  FAIL ' + m); } }
function section(t) { console.log('== ' + t); }
function js(o) { return JSON.stringify(o); }
function load(files) {
  var sb = { console: console }; vm.createContext(sb);
  files.forEach(function (f) { vm.runInContext(typeof f === 'string' ? fs.readFileSync(path.join(ROOT, f), 'utf8') : f.src, sb, { filename: typeof f === 'string' ? f : f.name }); });
  return sb;
}
var K = load(['js/cook.js']).COOK;
var W = load(['js/cook-art.js', 'js/cook-dishes.js', 'js/cook.js']);
var A = W.COOK_ART, KW = W.COOK;

section('sim: recipes, TUNE_R, tuneOf');
check(K.TUNE_HASH === 2827089308, 'TUNE_HASH still 2827089308 (' + K.TUNE_HASH + ')');
check(K.tuneOf('jeon') === 2827089308, 'tuneOf(jeon) = TUNE_HASH');
check(K.tuneOf('jumeokbap') === 1403436335, 'tuneOf(jumeokbap) pinned at 1403436335 (' + K.tuneOf('jumeokbap') + ')');
check(K.tuneOf('kkochi') === 3381042548, 'tuneOf(kkochi) pinned at 3381042548 (' + K.tuneOf('kkochi') + ')');
check(K.tuneOf('miyeok') === null && K.tuneOf(null) === null && K.tuneOf('__proto__') === null, 'tuneOf(unknown) = null');
check(K.createRun('miyeok', 1) === null, "createRun('miyeok') === null");
check(K.WORDS.dish.jumeokbap === '주먹밥' && K.WORDS.dish.kkochi === '과일 꼬치', 'WORDS.dish: 주먹밥, 과일 꼬치');
(function () {
  var rj = K.recipe('jumeokbap'), rk = K.recipe('kkochi');
  check(js(K.foodOf(rj, rj.steps[1])) === js(K.TUNE_R.jumeokbap.food.rice), "jumeokbap's flip step gets the rice box, not the jeon's");
  check(js(K.foodOf(K.recipe('jeon'), K.recipe('jeon').steps[1])) === js(K.TUNE.food.jeon), "jeon's flip step still resolves to TUNE.food.jeon");
  var run = K.createRun('kkochi', 11);
  check(js(run.st.lines.map(function (l) { return [l.ay >> 1, l.by >> 1]; })) === js([[74, 98], [74, 98]]), 'kkochi guides span y 74..98');
  check(run.st.lines.every(function (l, i) { return (l.ax >> 1) - l.off === [64, 80][i] && l.ax === l.bx; }), 'kkochi guides are vertical at x 64 / 80 (+ the offset of the line)');
  var tapR = K.resumeRun(K.potOf(Object.assign(K.createRun('kkochi', 11), {}), 0));
  check(tapR && tapR.si === 0, 'a fresh kkochi pot (si 0) resumes at step 0');
  var r2 = K.simulate('kkochi', 11, [[], []], { run: true }).run;   /* no input: still at step 0 */
  check(r2.si === 0, 'kkochi waits at the slice step without input');
  var m = K.KIND.tap.init(rk.steps[1], 5, K.foodOf(rk, rk.steps[1]), { at: K.TUNE_R.kkochi.tapAt, jitter: 0 }).marks;
  check(js(m.map(function (q) { return [q.x >> 1, q.y >> 1]; })) === js([[56, 86], [72, 86], [88, 86]]), 'kkochi marks on the cube centres (56 / 72 / 88, 86), no jitter');
  var mj = K.createRun('jeon', 5).st.marks, mj0 = K.KIND.tap.init(K.recipe('jeon').steps[0], K.stepSeed(5, 0), K.TUNE.food.batter).marks;
  check(js(mj) === js(mj0), 'jeon marks unchanged (no layout passed = TUNE.tap.at with jitter)');
})();

section('sim: full runs by chip and by touch');
function rng32(a) { a = a >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function chipSteps(n) { var out = []; for (var i = 0; i < n; i++) { var s = []; for (var k = 0; k < 4; k++) s.push({ t: 400 + k * 400, k: 'b' }); out.push(s); } return out; }
function touchSteps(id, seed) {
  var run = K.createRun(id, seed), r = K.recipe(id), out = [], rnd = rng32(seed);
  r.steps.forEach(function (s, si) {
    var evs = [], t = 300;
    var st = si === 0 ? run.st : K.KIND[s.kind].init(s, K.stepSeed(seed, si), K.foodOf(r, s), s.kind === 'tap' && K.TUNE_R[id] && K.TUNE_R[id].tapAt ? { at: K.TUNE_R[id].tapAt, jitter: K.TUNE_R[id].tapJitter } : null);
    if (s.kind === 'tap') for (var i = 0; i < 9; i++) { var mk = st.marks[i % 3]; evs.push({ t: t, k: 'd', x: mk.x + (rnd() * 2 - 1) * 10, y: mk.y + (rnd() * 2 - 1) * 8, p: 't', id: 1 }); evs.push({ t: t + 60, k: 'u', x: mk.x, y: mk.y, p: 't', id: 1 }); t += 150; }
    if (s.kind === 'flip') { evs.push({ t: t, k: 'd', x: 144, y: 172, p: 't', id: 1 }); evs.push({ t: t + 50, k: 'u', x: 144, y: 172, p: 't', id: 1 }); t += 3400;
      for (var j = 0; j <= 8; j++) evs.push({ t: t + j * 8, k: j ? 'm' : 'd', x: 144, y: 200 - j * 8, p: 't', id: 2 }); evs.push({ t: t + 80, k: 'u', x: 144, y: 136, p: 't', id: 2 }); }
    if (s.kind === 'slice') st.lines.forEach(function (L) { for (var q = 0; q <= 16; q++) evs.push({ t: t + q * 16, k: q ? 'm' : 'd', x: L.ax, y: L.ay - 16 + (L.by - L.ay + 32) * q / 16, p: 't', id: 3 }); evs.push({ t: t + 280, k: 'u', x: L.bx, y: L.by + 16, p: 't', id: 3 }); t += 600; });
    out.push(evs);
  });
  return out;
}
['jumeokbap', 'kkochi'].forEach(function (id) {
  var r = K.recipe(id);
  [['chip', chipSteps(r.steps.length)], ['touch', touchSteps(id, 77)]].forEach(function (p) {
    var a = K.simulate(id, 77, p[1], { run: true }), b = K.simulate(id, 77, p[1], { cadence: 120 });
    check(a.done && a.si === r.steps.length, id + ' by ' + p[0] + ': the dish is done (' + a.si + ')');
    check(js(a.look) === js(b.look), id + ' by ' + p[0] + ': same look at 60 and 120 Hz');
    check(a.look && js(K.normLook(id, a.look)) === js(a.look), id + ' by ' + p[0] + ': the look is valid (normLook keeps it) ' + js(a.look));
    var res = K.resultOf(a.run, { madeAt: 5, day: '2026-11-18' });
    check(res && res.out.recipe === id && res.out.dish.name === K.WORDS.dish[id] && res.status === 'done' && res.ms === null, id + ' by ' + p[0] + ': result envelope (recipe, name, done, no time)');
    check(res && js(res.out.steps.map(function (s) { return s.kind; })) === js(r.steps.map(function (s) { return s.kind; })), id + ': envelope steps in recipe order');
    var line = K.bookLine(res);
    check(line && line.recipe === id && line.seed === 77 && js(line.look) === js(a.look) && line.day === '2026-11-18', id + ' by ' + p[0] + ': book line');
    var st = K.bookAdd(K.normStore(null), line);
    check(K.normStore(js(st)).book.length === 1, id + ': the book keeps the line through normStore');
  });
});
check(K.describe('jumeokbap', [null, 'golden']) === '주먹밥. 노릇노릇 구웠어.', "describe('jumeokbap', [null, 'golden'])");
check(K.describe('kkochi', ['straight', null]) === '과일 꼬치. 반듯하게 썰었어.', "describe('kkochi', ['straight', null])");
check(js(K.swapsFor('jumeokbap', 5)) === '{}' && js(K.swapsFor('kkochi', 5)) === '{}', 'no swaps for the new dishes');

section('sim: pots per recipe');
(function () {
  ['jumeokbap', 'kkochi'].forEach(function (id) {
    var a = K.simulate(id, 9, [chipSteps(1)[0]], { run: true }).run, pot = K.potOf(a, 1);
    check(pot && pot.tune === K.tuneOf(id) && pot.si === 1 && pot.recipe === id, id + ': potOf writes its own tune after step 1');
    var re = K.resumeRun(js(pot));
    check(re && re.si === 1 && re.recipe === id && re.seed === 9, id + ': the pot resumes at step 1 (JSON)');
    var bad = JSON.parse(js(pot)); bad.tune = K.TUNE_HASH;
    check(K.resumeRun(bad) === null, id + ": a pot with the jeon's tune is refused");
    var other = JSON.parse(js(pot)); other.tune = K.tuneOf(id === 'kkochi' ? 'jumeokbap' : 'kkochi');
    check(K.resumeRun(other) === null, id + ": a pot with the other new dish's tune is refused");
  });
  var jp = K.potOf(K.simulate('jeon', 9, [chipSteps(1)[0]], { run: true }).run, 1); jp.tune = K.tuneOf('kkochi');
  check(K.resumeRun(jp) === null, "a jeon pot with kkochi's tune is refused");
  /* golden: the ada2967 code (from git) writes a jeon pot after one and after two steps; this build resumes both unchanged */
  var old = null;
  try { old = cp.execSync('git show ada2967:js/cook.js', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) { old = null; }
  if (!old) { console.log('   (git ada2967 not available: golden pot skipped)'); check(true, 'golden skipped'); }
  else {
    var O = load([{ src: old, name: 'cook-ada2967.js' }]).COOK;
    [1, 2].forEach(function (n) {
      var orun = O.simulate('jeon', 4242, chipSteps(n), { run: true }).run, opot = O.potOf(orun, 1700000000000), txt = js(opot);
      var nr = K.resumeRun(txt);
      check(opot.tune === 2827089308 && nr && nr.si === n && nr.recipe === 'jeon' && js(nr.looks) === js(orun.looks) && js(nr.swaps) === js(orun.swaps), 'golden ada2967 jeon pot (si ' + n + ') resumes in this build');
      check(js(K.potOf(nr, 1700000000000)) === txt, 'golden si ' + n + ': the resumed run writes the same pot bytes');
    });
  }
})();

section('art: js/cook-dishes.js');
var APOLLO = {}; A.APOLLO.forEach(function (h) { APOLLO[h] = 1; });
var FOODC = {}; A.FOOD.forEach(function (h) { FOODC[h] = 1; });
function blank() { return A.blank(144, 160); }
function hex(b, i) { return '#' + [b.d[i], b.d[i + 1], b.d[i + 2]].map(function (v) { return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
function palOk(b) { var bad = {}; for (var i = 0; i < b.d.length; i += 4) { if (b.d[i + 3] !== 0 && b.d[i + 3] !== 255) bad.alpha = 1; if (b.d[i + 3] && !APOLLO[hex(b, i)] && !FOODC[hex(b, i)]) bad[hex(b, i)] = 1; } return Object.keys(bad); }
var JB = A.dishes && A.dishes.jumeokbap, KK = A.dishes && A.dishes.kkochi;
check(!!JB && !!KK, 'COOK_ART.dishes has jumeokbap and kkochi');
['tapScene', 'flipScene', 'revealScene', 'base', 'carry', 'dish', 'dishSmall'].forEach(function (f) { check(typeof JB[f] === 'function', 'jumeokbap.' + f); });
['sliceScene', 'tapScene', 'revealScene', 'base', 'carry', 'dish', 'dishSmall'].forEach(function (f) { check(typeof KK[f] === 'function', 'kkochi.' + f); });
var dents = [[18, 20], [40, 18], [30, 32]], lookJ = { v: 1, dents: dents, band: 2, plate: 1 }, lookK = { v: 1, dents: [], cuts: [0, 0], offs: [0, 0], plate: 2 };
var kr = KW.createRun('kkochi', 5), lines = kr.st.lines;
function scenes(P) {
  var sc = {};
  if (P === JB) {
    [0, 1, 2].forEach(function (s) { sc['tap' + s] = JB.tapScene(blank(), { shape: s, dents: dents, marks: [{ x: 116, y: 172, n: 1 }, { x: 172, y: 172, n: 0 }, { x: 144, y: 188, n: 3 }], per: 3, f: 4, squash: s === 1 ? 1 : 0, flash: s === 2 }); });
    [0, 1, 2].forEach(function (bd) { sc['heat' + bd] = JB.flipScene(blank(), { heat: true, band: bd, dents: dents, f: 9, fh: 40, fbc: 3, arrow: 1 }); });
    [0, 1, 2, 3].forEach(function (f) { sc['arc' + f] = JB.flipScene(blank(), { heat: true, band: 1, dents: dents, arc: { f: f, lift: 2 }, f: 7 }); });
    sc.flipped = JB.flipScene(blank(), { heat: true, band: 2, res: 2, dents: dents, f: 12, spatula: [80, 100] });
    sc.cold = JB.flipScene(blank(), { heat: false, band: 0, dents: dents });
    [null, 2, 4, 5, 9, 40].forEach(function (t) { sc['rev' + t] = JB.revealScene(blank(), { look: lookJ, t: t, seed: 3 }); });
  } else {
    sc.slice0 = KK.sliceScene(blank(), { lines: lines, cur: 0, f: 4 });
    var l1 = lines.map(function (l, i) { return Object.assign({}, l, { cut: i === 0, bins: l.bins.map(function (v, k) { return i === 1 && k < 20 ? 1 : 0; }) }); });
    sc.slice1 = KK.sliceScene(blank(), { lines: l1, cur: 1, flash: 0, pop: true, f: 4, hand: { x: 156, y: 180 } });
    sc.slice2 = KK.sliceScene(blank(), { lines: lines.map(function (l) { return Object.assign({}, l, { cut: true }); }), cur: 1, f: 4 });
    sc.tap0 = KK.tapScene(blank(), { marks: [{ x: 112, y: 172, n: 0 }, { x: 144, y: 172, n: 0 }, { x: 176, y: 172, n: 0 }], look: lookK, f: 0 });
    sc.tapDrop = KK.tapScene(blank(), { marks: [{ x: 112, y: 172, n: 3 }, { x: 144, y: 172, n: 2 }, { x: 176, y: 172, n: 0 }], look: lookK, hit: { m: 0, fr: 0 }, flash: true, f: 0 });
    sc.tapAll = KK.tapScene(blank(), { marks: [{ x: 112, y: 172, n: 3 }, { x: 144, y: 172, n: 3 }, { x: 176, y: 172, n: 3 }], look: lookK, f: 0 });
    [null, 2, 4, 5, 9, 40].forEach(function (t) { sc['rev' + t] = KK.revealScene(blank(), { look: lookK, t: t }); });
  }
  return sc;
}
[['jumeokbap', JB], ['kkochi', KK]].forEach(function (p) {
  var a = scenes(p[1]), W2 = load(['js/cook-art.js', 'js/cook-dishes.js']), P2 = W2.COOK_ART.dishes[p[0]];
  var b = (function () { var save = JB, save2 = KK; JB = W2.COOK_ART.dishes.jumeokbap; KK = W2.COOK_ART.dishes.kkochi; var o = scenes(P2); JB = save; KK = save2; return o; })();
  var keys = Object.keys(a), diff = keys.filter(function (k) { return A.hash(a[k]) !== W2.COOK_ART.hash(b[k]); });
  check(diff.length === 0, p[0] + ': ' + keys.length + ' scenes paint the same bytes in a second instance' + (diff.length ? ' (' + diff.join(',') + ')' : ''));
  var again = scenes(p[1]), d2 = keys.filter(function (k) { return A.hash(a[k]) !== A.hash(again[k]); });
  check(d2.length === 0, p[0] + ': painting again (warm caches) gives the same bytes' + (d2.length ? ' (' + d2.join(',') + ')' : ''));
  var badPal = keys.map(function (k) { var x = palOk(a[k]); return x.length ? k + ':' + x.join('/') : null; }).filter(Boolean);
  check(badPal.length === 0, p[0] + ': every scene is Apollo + FOOD only, alpha 0 / 255' + (badPal.length ? ' (' + badPal.slice(0, 4).join(' ') + ')' : ''));
  check(keys.every(function (k) { return a[k].d[3] === 255; }), p[0] + ': scenes fill the stage (frame painted)');
});
/* props stay Apollo: the board, the plate base and the bare skewer (no food colours) */
(function () {
  var bb = KK.base(blank(), { station: 'board' }), sk = KK.tapScene(blank(), { marks: [], look: lookK, f: 0 });
  var fb = function (b) { for (var i = 0; i < b.d.length; i += 4) if (b.d[i + 3] && !APOLLO[hex(b, i)]) return false; return true; };
  check(fb(bb), 'props: the board is Apollo only');
  var wood = 0; for (var x = 50; x < 60; x++) { var g = A.get(sk, x, 100); if (g === A.PAL.w3 || g === A.PAL.w4) wood++; }
  check(wood >= 8, 'props: the skewer is Apollo wood (w3 / w4)');
})();
/* carry continuity: the carried object = the still scene's pixels */
function sameWhere(sprite, scene, ground) {   /* every pixel the carry painted (differs from the bare ground) equals the scene there */
  var n = 0, bad = 0;
  for (var i = 0; i < sprite.d.length; i += 4) {
    var x = (i >> 2) % 144, y = ((i >> 2) / 144) | 0; if (x < 2 || y < 2 || x > 141 || y > 157) continue;   /* the stage frame (never in the live view) */
    if (sprite.d[i] === ground.d[i] && sprite.d[i + 1] === ground.d[i + 1] && sprite.d[i + 2] === ground.d[i + 2]) continue;
    n++; if (sprite.d[i] !== scene.d[i] || sprite.d[i + 1] !== scene.d[i + 1] || sprite.d[i + 2] !== scene.d[i + 2]) bad++;
  }
  return { n: n, bad: bad };
}
(function () {
  var g = A.base(blank(), { station: 'stove', pan: false }), c = A.base(blank(), { station: 'stove', pan: false });
  JB.carry(c, { what: 'pan', x: 72, y: 86, lift: 0, shadow: false, dents: dents });
  var s = JB.flipScene(blank(), { heat: false, band: 0, dents: dents, spatula: null }), r = sameWhere(c, s, g);
  check(r.n > 3000 && r.bad === 0, "jumeokbap carry 'pan' = the cold flip scene's pan and rice (" + r.n + ' px, ' + r.bad + ' differ)');
  var g2 = A.base(blank(), { station: 'plate', look: lookJ }), c2 = A.base(blank(), { station: 'plate', look: lookJ });
  JB.carry(c2, { what: 'cake', x: 72, y: 86, lift: 0, shadow: false, look: lookJ });
  var s2 = JB.flipScene(blank(), { heat: false, band: 2, res: 2, dents: dents, spatula: null }), g3 = A.base(blank(), { station: 'stove', pan: true }), c3 = A.base(blank(), { station: 'stove', pan: true });
  JB.carry(c3, { what: 'cake', x: 72, y: 86, lift: 0, shadow: false, look: { v: 1, dents: [], band: 2, plate: 0 } });
  var s3 = JB.flipScene(blank(), { heat: false, band: 2, res: 2, dents: [], spatula: null }), r3 = sameWhere(c3, s3, g3);
  check(r3.n > 1000 && r3.bad === 0, "jumeokbap carry 'cake' = the flipped cake as the stove shows it (" + r3.n + ' px, ' + r3.bad + ' differ)');
  var gk = KK.base(blank(), { station: 'board' }), ck = KK.base(blank(), { station: 'board' });
  KK.carry(ck, { what: 'skewer', x: 72, y: 86, lift: 0, shadow: false, look: lookK });
  var sk = KK.tapScene(blank(), { marks: [{ x: 112, y: 172, n: 3 }, { x: 144, y: 172, n: 3 }, { x: 176, y: 172, n: 3 }], look: lookK, f: 0 }), rk = sameWhere(ck, sk, gk);
  check(rk.n > 800 && rk.bad === 0, "kkochi carry 'skewer' = the last board frame's skewer (" + rk.n + ' px, ' + rk.bad + ' differ)');
})();
/* reveal bounds: everything the dish adds to the plate base lies in x 33..111 */
[['jumeokbap', JB, lookJ], ['kkochi', KK, lookK]].forEach(function (p) {
  [null, 5, 9].forEach(function (t) {
    var base = A.base(blank(), { station: 'plate', look: p[2] }), r = p[1].revealScene(blank(), { look: p[2], t: t, seed: 1 }), lo = 999, hi = -1;
    for (var y = 0; y < 160; y++) for (var x = 0; x < 144; x++) { var i = (y * 144 + x) * 4; if (r.d[i] !== base.d[i] || r.d[i + 1] !== base.d[i + 1] || r.d[i + 2] !== base.d[i + 2]) { var steam = y < 70; if (steam && t !== null) continue; lo = Math.min(lo, x); hi = Math.max(hi, x); } }
    check(lo >= 33 && hi <= 111, p[0] + ' reveal t ' + t + ': the plated food stays in x 33..111 (' + lo + '..' + hi + ')');
  });
});
section('art: drawDish');
(function () {
  var looks = [null, {}, { v: 2 }, lookJ, lookK, { v: 1, dents: [[99, -3]], band: 9, cuts: ['x'], offs: [99], plate: 7 }, 'junk', 5];
  var threw = 0, sizes = [[96, 66], [40, 26], [8, 8], [256, 256], [0, 0], [-5, 'a']];
  ['jumeokbap', 'kkochi', 'jeon'].forEach(function (id) {
    looks.forEach(function (lk) { sizes.forEach(function (s) { try { var img = KW.drawDish(id, lk, 3, s[0], s[1]); if (!img || img.d.length !== img.w * img.h * 4) threw++; } catch (e) { threw++; } }); });
  });
  check(threw === 0, 'drawDish never throws and always returns a full buffer (' + threw + ')');
  ['jumeokbap', 'kkochi'].forEach(function (id) {
    var big = KW.drawDish(id, id === 'kkochi' ? lookK : lookJ, 3), small = KW.drawDish(id, id === 'kkochi' ? lookK : lookJ, 3, 40, 26), stub = K.drawDish(id, lookJ, 3);
    var nb = 0; for (var i = 3; i < big.d.length; i += 4) if (big.d[i]) nb++;
    check(big.w === 96 && big.h === 66 && nb > 2500 && palOk(big).length === 0, id + ': the dish picture (96 x 66) paints with its own painter (' + nb + ' px)');
    check(small.w === 40 && palOk(small).length === 0 && A.hash(small) !== A.hash(K.drawDish(id, lookJ, 3, 40, 26)), id + ': dishSmall paints (not the stub)');
    check(A.hash(KW.drawDish(id, lookK, 3)) === A.hash(KW.drawDish(id, lookK, 3)), id + ': drawDish is deterministic');
    var ns = 0; for (var j = 3; j < stub.d.length; j += 4) if (stub.d[j]) ns++;
    check(ns > 0, id + ': without the painters the stub plate still draws (' + ns + ' px)');
  });
})();

section('static');
(function () {
  var src = fs.readFileSync(path.join(ROOT, 'js/cook-dishes.js'), 'utf8');
  check(!/Math\.random|Date\.now|performance\.now|new Date|Math\.(sin|cos|tan|atan|atan2)\b/.test(src), 'js/cook-dishes.js: no random, no clock, no float trig');
  check(!/[^\x00-\x7F]/.test(src), 'js/cook-dishes.js: ASCII only (no text at all)');
  check(!/\bdocument\b|\bwindow\b|localStorage/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')), 'js/cook-dishes.js: no DOM, no storage');
  var html = fs.readFileSync(path.join(ROOT, 'cook.html'), 'utf8'), ia = html.indexOf('<script src="js/cook-art.js"'), id = html.indexOf('<script src="js/cook-dishes.js"'), ic = html.indexOf('<script src="js/cook.js"');
  check(ia > 0 && id > ia && ic > id, 'cook.html loads js/cook-dishes.js right after js/cook-art.js, before js/cook.js');
})();

console.log('test-cook-dishes: ' + passes + ' ok' + (fails ? ', ' + fails + ' FAIL' : ''));
process.exit(fails ? 1 : 0);
