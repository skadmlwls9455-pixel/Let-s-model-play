#!/usr/bin/env node
/* tools/test-cook.js -- kitchen simulation tests (node only, no DOM). Exit 1 on any failure.
 *   node tools/test-cook.js
 * js/cook.js is loaded twice into separate vm contexts without document/window (two independent instances), so only
 * the simulation half exists. Covers docs/COOK_PROTO.md tests 1-7, 9-12 and 14 for tap / flip / slice / jeon:
 *   1 button path  2 determinism (two instances, 30/60/120/240 Hz, input sample rate)  3 progress never falls
 *   4 idle 60 s  5 flip bands and taps that never flip  6 slice angle and the slash across  7 two fingers and hold
 *   9 resume at every step boundary + JSON round trip after every event  10 pot rules  11 result envelope
 *   12 drawDish  14 static checks (clock, Math.random, main-game names, banned words, KS X 1001, glyphs)
 * Test paths use their own mulberry32 noise (seeded), never Math.random.
 */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
var ROOT = path.resolve(__dirname, '..');
var SRC = fs.readFileSync(path.join(ROOT, 'js/cook.js'), 'utf8');
var passes = 0, fails = 0, quiet = process.argv.indexOf('-v') < 0;
function check(c, m) { if (c) passes++; else { fails++; console.error('  FAIL ' + m); } }
function section(t) { console.log('== ' + t); }
function load(extra) {
  var sb = { console: console };
  if (extra) Object.keys(extra).forEach(function (k) { sb[k] = extra[k]; });
  vm.createContext(sb); vm.runInContext(SRC, sb, { filename: 'cook.js' });
  return { C: sb.COOK, J: vm.runInContext('JSON', sb), sb: sb };
}
var IA = load(), IB = load(), A = IA.C, B = IB.C;
function rng32(a) { a = a >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function js(o) { return JSON.stringify(o); }
function same(a, b) { return js(a) === js(b); }
var HZ120 = 1000 / 120;

section('load (no DOM)');
check(A && typeof A.simulate === 'function' && typeof A.createRun === 'function', 'COOK.simulate / createRun exist');
check(typeof A.open === 'undefined', 'without a DOM the live half (open) is not attached');
check(A.VERSION === 'cook-1', 'VERSION cook-1');
check(A !== B && A.TUNE_HASH === B.TUNE_HASH && A.TUNE_HASH === A.hash32(JSON.stringify(A.TUNE)), 'TUNE_HASH = hash32(JSON.stringify(TUNE)), same in both instances');
check(A.RECIPES.length === 1 && A.RECIPES[0].id === 'jeon' && A.PROPS.length === 1 && A.PROPS[0].id === 'pan', 'slice 1: one live recipe (jeon) and one live prop (pan)');
check(same(A.RECIPES[0].steps.map(function (s) { return s.kind; }), ['tap', 'flip', 'slice']), 'jeon = tap -> flip -> slice');
check(['tap', 'flip', 'slice'].every(function (k) { var K = A.KIND[k]; return ['init', 'down', 'move', 'up', 'cancel', 'tick', 'alt', 'look', 'tag'].every(function (f) { return typeof K[f] === 'function'; }); }), 'KIND tap / flip / slice have the full interface');
check(Object.isFrozen(A.TUNE) && Object.isFrozen(A.TUNE.tap) && Object.isFrozen(A.WORDS) && Object.isFrozen(A.RECIPES[0].steps[0]), 'TUNE, WORDS, RECIPES are frozen');
check(A.createRun('nope', 1) === null && A.createRun('miyeok', 1) === null, 'createRun: unknown recipe -> null');

/* ---------- geometry of a seed (marks of step 0, guides of step 2) ---------- */
function geom(C, seed) {
  var r = C.recipe('jeon');
  return { marks: C.KIND.tap.init(r.steps[0], C.stepSeed(seed >>> 0, 0), C.TUNE.food.batter).marks,
    lines: C.KIND.slice.init(r.steps[2], C.stepSeed(seed >>> 0, 2), C.TUNE.food.jeon).lines };
}
/* ---------- path makers: events on the step clock (ms) ---------- */
function tapAt(evs, t, x, y, id, hold, p) { evs.push({ t: t, k: 'd', x: x, y: y, p: p || 't', id: id }); evs.push({ t: t + (hold || 60), k: 'u', x: x, y: y, p: p || 't', id: id }); }
function sortEv(evs) { return evs.map(function (e, i) { return [e, i]; }).sort(function (a, b) { return a[0].t - b[0].t || a[1] - b[1]; }).map(function (x) { return x[0]; }); }
function stroke(evs, pts, t0, hzMs, id, p) {   /* pts = [[x, y], ...] one sample each hzMs */
  var t = t0;
  pts.forEach(function (q, i) { evs.push({ t: t, k: i === 0 ? 'd' : 'm', x: q[0], y: q[1], p: p || 't', id: id }); t += hzMs; });
  var l = pts[pts.length - 1]; evs.push({ t: t, k: 'u', x: l[0], y: l[1], p: p || 't', id: id });
  return t;
}
function line(ax, ay, bx, by, step, rnd, j) {   /* samples every 'step' px from A to B with +-j noise */
  var L = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.round(L / step)), out = [];
  for (var i = 0; i <= n; i++) { var u = i / n; out.push([ax + (bx - ax) * u + (rnd ? (rnd() * 2 - 1) * j : 0), ay + (by - ay) * u + (rnd ? (rnd() * 2 - 1) * j : 0)]); }
  return out;
}
/* a drag along guide L tilted by deg (clockwise positive, the sim's sign), from 'ext' px before A to 'ext' px past B */
function guideDrag(L, deg, step, rnd, j, ext, shift) {
  var a = deg * Math.PI / 180, ux = L.ux, uy = L.uy, vx = -uy, vy = ux;
  var dx = ux * Math.cos(a) + vx * Math.sin(a), dy = uy * Math.cos(a) + vy * Math.sin(a);
  var mx = (L.ax + L.bx) / 2 + vx * (shift || 0), my = (L.ay + L.by) / 2 + vy * (shift || 0), h = 64 + (ext == null ? 8 : ext);
  return line(mx - dx * h, my - dy * h, mx + dx * h, my + dy * h, step, rnd, j);
}
function nineTaps(g, rnd, t0, gap) {
  var evs = [], t = t0;
  for (var i = 0; i < 9; i++) { var m = g.marks[i % 3]; tapAt(evs, t, m.x + (rnd() * 2 - 1) * 20, m.y + (rnd() * 2 - 1) * 14, 1, 50 + rnd() * 40); t += gap; }
  return evs;
}
function flickUp(evs, x, y, t0, dist, ms, id, dx) {   /* an upward stroke 'dist' px over 'ms' */
  var n = Math.max(2, Math.round(ms / 8)), pts = [];
  for (var i = 0; i <= n; i++) pts.push([x + (dx || 0) * i / n, y - dist * i / n]);
  return stroke(evs, pts, t0, ms / n, id || 1);
}
function flipPath(heatAt, flickAt, g) { var evs = []; tapAt(evs, heatAt, 150, 170, 1, 60); flickUp(evs, 150, 200, flickAt, 64, 120, 2); return evs; }
function slicePath(g, deg0, deg1, rnd, j, t0) {
  var evs = [], t = stroke(evs, guideDrag(g.lines[0], deg0, 2, rnd, j), t0, HZ120, 1);
  stroke(evs, guideDrag(g.lines[1], deg1, 2, rnd, j), t + 300, HZ120, 2);
  return evs;
}
function fullPath(seed, o) {   /* a complete hand-made dish for 'seed' */
  o = o || {};
  var g = geom(A, seed), rnd = rng32(seed ^ 0x5bd1e995);
  return [nineTaps(g, rnd, 300, o.tapGap || 210), flipPath(300, 300 + (o.flipAt == null ? 4000 : o.flipAt), g), slicePath(g, o.deg0 || 0, o.deg1 || 0, rnd, o.j == null ? 2 : o.j, 300)];
}
/* drive(): the same loop as COOK.simulate but calls cb(run) after every tick and input (tests 3 and 9) */
function drive(I, steps, seed, hz, t0, cb, run) {
  var C = I.C, dt = 1000 / hz;
  run = run || C.createRun('jeon', seed);
  C.tick(run, t0); if (cb) cb(run, 'tick');
  for (var si = run.si; si < run.n; si++) {
    if (run.phase !== 'step' || run.si !== si) break;
    var origin = run.t0, frame = run.t, last = run.t, list = steps[si] || [], stop = false;
    var frames = function (until) {
      while (frame + dt <= until) {
        frame += dt;
        if (run.phase === 'between' && Math.round(frame) >= run.doneAt + C.TUNE.betweenMs) return false;
        C.tick(run, frame); if (cb) cb(run, 'tick');
      }
      return true;
    };
    for (var i = 0; i < list.length && !stop; i++) {
      var e = list[i], at = Math.max(last, Math.round(origin + e.t));
      if (run.phase === 'between' && at >= run.doneAt + C.TUNE.betweenMs) break;
      if (!frames(at)) break;
      C.input(run, { t: at, k: e.k, x: e.x, y: e.y, p: e.p, id: e.id }); last = run.t; if (cb) cb(run, 'input');
    }
    if (run.phase === 'step') { var end = last + C.TUNE.simTail; frames(end); if (run.phase === 'step') { C.tick(run, end); if (cb) cb(run, 'tick'); } }
    if (run.phase !== 'between') break;
    C.tick(run, run.doneAt + C.TUNE.betweenMs); if (cb) cb(run, 'tick');
  }
  return run;
}
/* a run standing at the start of step 'upTo' (earlier steps done with the verb button) */
function runAt(C, seed, upTo) {
  var run = C.createRun('jeon', seed), t = 0;
  C.tick(run, 0);
  while (run.si < upTo && run.phase === 'step') {
    var at = run.t0 + 300; C.input(run, { t: at, k: 'b' });
    while (run.phase === 'step' && run.si < upTo) { at += 300; C.input(run, { t: at, k: 'b' }); }
    C.tick(run, run.doneAt + C.TUNE.betweenMs);
  }
  C.drain(run);
  return run;
}

section('1. verb button path: every step in <= 3 presses (flip 2)');
(function () {
  var ok = true, presses = [], seeds = [1, 2, 3, 77, 2873465123];
  seeds.forEach(function (seed) {
    var run = A.createRun('jeon', seed), labels = [];
    A.tick(run, 0);
    for (var si = 0; si < 3; si++) {
      var n = 0, at = run.t0 + A.TUNE.gateMs;
      labels.push(A.verb(run));
      while (run.phase === 'step' && run.si === si && n < 10) { if (run.st.kind === 'flip' && n === 1) labels.push(A.verb(run)); A.input(run, { t: at, k: 'b' }); n++; at += 50; }
      presses.push(n);
      if (n > (run.st.kind === 'flip' ? 2 : 3)) ok = false;
      if (run.phase !== 'between') ok = false;
      var next = run.doneAt + A.TUNE.betweenMs;
      A.tick(run, next - 1); if (run.phase !== 'between') ok = false;
      A.tick(run, next); if (si < 2 && run.t0 !== next) ok = false;
    }
    if (!(run.done && run.phase === 'reveal')) ok = false;
    if (seed === 1) check(same(labels, ['톡톡', '불 켜기', '뒤집기', '썰기']) && A.verb(run) === '돌아가기', 'verb labels: tap, heat on, flip, slice, then back (' + labels.join(' / ') + ')');
    var res = A.resultOf(run, { madeAt: 1762576800000, day: '2026-11-08' });
    if (!res || res.out.steps[0].tag !== null || res.out.steps[1].tag !== 'soft' || res.out.steps[2].tag !== 'straight') ok = false;
  });
  check(ok, 'button path finishes every step, tap 3 / flip 2 / slice 2 presses (' + presses.slice(0, 3).join(',') + '), next step starts exactly betweenMs later');
  var run = A.createRun('jeon', 5); A.tick(run, 0);
  A.input(run, { t: 100, k: 'b' }); A.input(run, { t: 249, k: 'b' });
  check(run.st.hits === 0, 'the verb button is gated for the first 250 ms of a step too');
  A.input(run, { t: 250, k: 'b' });
  check(run.st.hits === 3 && run.st.marks[0].n === 3, 'one tap press = the next mark gets its 3 hits');
  var c = run.st.dents.every(function (d) { return same(d, run.st.dents[0]); });
  check(c && run.st.dents.length === 3, 'button dents sit at the mark centre');
})();

section('2. determinism: two instances, tick cadence 30/60/120/240 Hz, input sample rate');
function pathTap(seed) {
  var rnd = rng32(seed), g = geom(A, seed), evs = [], t = 260 + Math.floor(rnd() * 200), kind = seed % 4;
  for (var i = 0; i < 14; i++) {
    var m = g.marks[Math.floor(rnd() * 3)], x = m.x + (rnd() * 2 - 1) * 70, y = m.y + (rnd() * 2 - 1) * 60;
    if (kind === 0) { tapAt(evs, t, x, y, 1, 30 + rnd() * 120); t += 40 + rnd() * 300; }
    else if (kind === 1) { var id = 1 + (i & 1); tapAt(evs, t, x, y, id, 165); t += 125; }        /* two fingers, 8/s, 40 ms overlap */
    else if (kind === 2) {                                                                          /* hold with a moving finger */
      evs.push({ t: t, k: 'd', x: x, y: y, p: 't', id: 3 });
      for (var k = 8; k <= 1200; k += 8) evs.push({ t: t + k, k: 'm', x: x + k * 0.02, y: y + Math.sin(k / 200) * 6, p: 't', id: 3 });
      evs.push({ t: t + 1204, k: 'u', x: x, y: y, p: 't', id: 3 }); t += 1300 + rnd() * 400;
    } else { tapAt(evs, t, x, y, 1, 20); t += 30 + rnd() * 90; }                                     /* mashing */
  }
  return sortEv(evs);
}
function pathFlip(seed) {
  var rnd = rng32(seed), evs = [], heat = 250 + Math.floor(rnd() * 400), kind = seed % 5, t = heat + 200;
  tapAt(evs, heat, 40 + rnd() * 200, 60 + rnd() * 200, 1, 40 + rnd() * 100);
  for (var i = 0; i < 6; i++) {
    var x = 60 + rnd() * 160, y = 120 + rnd() * 160;
    if (kind === 0) { tapAt(evs, t, x, y, 1, 50); t += 200 + rnd() * 900; }
    else if (kind === 1) { var a = (rnd() * 2 - 1) * Math.PI, d = 20 + rnd() * 60, pts = [], n = 6 + Math.floor(rnd() * 10); for (var k = 0; k <= n; k++) pts.push([x + Math.sin(a) * d * k / n, y - Math.cos(a) * d * k / n]); t = stroke(evs, pts, t, 4 + rnd() * 30, 2) + 100 + rnd() * 2000; }
    else if (kind === 2) { t = flickUp(evs, x, y, t + rnd() * 6000, 10 + rnd() * 80, 30 + rnd() * 600, 3, (rnd() * 2 - 1) * 60) + 50; }
    else if (kind === 3) { var pts2 = [], n2 = 10; for (var q = 0; q <= n2; q++) pts2.push([x + (rnd() * 2 - 1) * 4, y + (rnd() * 2 - 1) * 4]); t = stroke(evs, pts2, t, 30, 4) + 300; }
    else { tapAt(evs, t, x, y, 5, 900 + rnd() * 1500); t += 2600; }
  }
  return sortEv(evs);
}
function pathSlice(seed) {
  var rnd = rng32(seed), g = geom(A, seed), evs = [], t = 260, kind = seed % 5;
  for (var li = 0; li < 2; li++) {
    var L = g.lines[li], pts;
    if (kind === 0) pts = guideDrag(L, (rnd() * 2 - 1) * 30, 2 + rnd() * 6, rnd, rnd() * 5, rnd() * 20, (rnd() * 2 - 1) * 20);
    else if (kind === 1) { var mx = (L.ax + L.bx) / 2 + (rnd() * 2 - 1) * 40 * L.ux, my = (L.ay + L.by) / 2 + (rnd() * 2 - 1) * 40 * L.uy, a = (50 + rnd() * 40) * (rnd() < 0.5 ? 1 : -1) * Math.PI / 180, dx = L.ux * Math.cos(a) - L.uy * Math.sin(a), dy = L.uy * Math.cos(a) + L.ux * Math.sin(a), h = 30 + rnd() * 40;
      pts = line(mx - dx * h, my - dy * h, mx + dx * h, my + dy * h, 3, rnd, 2); }
    else if (kind === 2) { pts = guideDrag(L, 0, 3, rnd, 3, -40, 0); t = stroke(evs, pts, t, HZ120, 1) + 150; pts = guideDrag(L, 8, 3, rnd, 3, 10, 6); }
    else if (kind === 3) { pts = []; for (var i = 0; i <= 60; i++) { var u = i / 60; pts.push([L.ax + (L.bx - L.ax) * (u * 1.2 - 0.1) + L.uy * Math.sin(u * 12) * 16, L.ay + (L.by - L.ay) * (u * 1.2 - 0.1) - L.ux * Math.sin(u * 12) * 16]); } }
    else pts = [[L.ax - 6 * L.ux, L.ay - 6 * L.uy], [(L.ax + L.bx) / 2 + 3, (L.ay + L.by) / 2 - 2], [L.bx + 6 * L.ux, L.by + 6 * L.uy]];
    t = stroke(evs, pts, t, kind === 4 ? 16 : HZ120 * (0.5 + rnd() * 2), 1 + li) + 200 + rnd() * 400;
  }
  return sortEv(evs);
}
(function () {
  var kinds = [['tap', pathTap, 0], ['flip', pathFlip, 1], ['slice', pathSlice, 2]], totalDiff = 0, cadDiff = 0, dones = { tap: 0, flip: 0, slice: 0 };
  kinds.forEach(function (kd) {
    var diff = 0, cad = 0;
    for (var k = 0; k < 200; k++) {
      var seed = (k * 2654435761 + 17 * kd[2]) >>> 0, steps = [[], [], []];
      steps[kd[2]] = kd[1](seed);
      var pre = runAt(A, seed, kd[2]), preB = runAt(B, seed, kd[2]);
      A.feed(pre, steps[kd[2]], { cadence: 60 }); B.feed(preB, JSON.parse(js(steps[kd[2]])), { cadence: 60 });
      if (!same(pre, preB)) diff++;
      if (pre.si > kd[2] || pre.phase !== 'step') dones[kd[0]]++;
      if (k < 60) {
        var ref = null;
        [30, 60, 120, 240].forEach(function (hz) { var r = runAt(A, seed, kd[2]); A.feed(r, steps[kd[2]], { cadence: hz }); var s = js(r); if (ref === null) ref = s; else if (s !== ref) cad++; });
      }
    }
    totalDiff += diff; cadDiff += cad;
    check(diff === 0, kd[0] + ': 200 seeded paths, two instances -> identical run JSON (' + diff + ' differ)');
    check(cad === 0, kd[0] + ': same input samples ticked at 30/60/120/240 Hz -> identical run JSON incl. events (' + cad + ' differ)');
  });
  console.log('   finished steps among the 200 paths: tap ' + dones.tap + ' · flip ' + dones.flip + ' · slice ' + dones.slice);
  var diffs = 0, cads = 0;
  for (var s = 0; s < 40; s++) {
    var seed = 1000 + s * 7919, p = fullPath(seed, { flipAt: (s % 3) * 3000 + 1000, deg0: (s % 5) * 6 - 12, j: s % 5 });
    var a = A.simulate('jeon', seed, p, { run: true }), b = B.simulate('jeon', seed, JSON.parse(js(p)), { run: true });
    if (!same(a, b)) diffs++;
    var ref = js(a);
    [30, 120, 240].forEach(function (hz) { if (js(A.simulate('jeon', seed, p, { cadence: hz, run: true })) !== ref) cads++; });
    if (s === 0) check(a.done && a.run.phase === 'reveal', 'a hand-made path cooks the whole dish');
  }
  check(diffs === 0 && cads === 0, 'whole dish x 40: simulate() identical across instances and 30/60/120/240 Hz (' + diffs + ' / ' + cads + ')');
  /* the same geometric drag sampled at 60/120/240 Hz: slice tags and per-line slant do not change */
  var tagDiff = 0, tried = 0;
  for (var q = 0; q < 50; q++) {
    var sd = 5000 + q, g = geom(A, sd), deg = [0, 4, -4, 20, -20, 24, 2][q % 7], tags = [];
    [60, 120, 240].forEach(function (hz) {
      var speed = 400 + (q % 5) * 300, msPer = 1000 / hz, pxPer = speed / hz, evs = [];
      var t1 = stroke(evs, guideDrag(g.lines[0], deg, pxPer), 260, msPer, 1);
      stroke(evs, guideDrag(g.lines[1], -deg, pxPer), t1 + 200, msPer, 2);
      var r = runAt(A, sd, 2); A.feed(r, evs, { cadence: 60 });
      tags.push(js([r.st.tag, r.st.lines.map(function (l) { return Math.abs(l.ang) >= 12; })]));
    });
    tried++; if (!(tags[0] === tags[1] && tags[1] === tags[2])) tagDiff++;
  }
  check(tagDiff === 0, 'slice: the same drag sampled at 60/120/240 Hz keeps its tags (' + tagDiff + '/' + tried + ' differ)');
})();

section('3. progress never falls; half and done once per step');
(function () {
  var mono = true, onceOk = true, nRuns = 0;
  for (var s = 0; s < 30; s++) {
    var seed = 300 + s, p = s % 2 ? fullPath(seed, { flipAt: 7000, j: 3 }) : [pathTap(seed), pathFlip(seed), pathSlice(seed)];
    var lastSi = -1, lastP = 0, counts = {};
    drive(IA, p, seed, [30, 60, 144][s % 3], 0, function (run) {
      if (run.phase === 'step') {
        if (run.si !== lastSi) { lastSi = run.si; lastP = 0; }
        if (run.st.progress < lastP) mono = false;
        lastP = run.st.progress;
      }
      A.drain(run).forEach(function (e) { if (e.type === 'half' || e.type === 'done') { var key = e.si + e.type; counts[key] = (counts[key] || 0) + 1; } });
    });
    Object.keys(counts).forEach(function (k) { if (counts[k] !== 1) onceOk = false; });
    nRuns++;
  }
  check(mono, 'progress is monotonic at every tick and input (' + nRuns + ' runs, three cadences)');
  check(onceOk, "'half' and 'done' fire at most once per step");
  var run = runAt(A, 9, 0); A.input(run, { t: run.t0 + 300, k: 'b' }); A.input(run, { t: run.t0 + 350, k: 'b' });
  var ev = A.drain(run).filter(function (e) { return e.type === 'half'; });
  check(ev.length === 1 && ev[0].say === '반쯤', "tap 'half' carries the aria word");
})();

section('4. idle: 60 s of nothing finishes no step');
(function () {
  var r0 = runAt(A, 11, 0); A.tick(r0, r0.t0 + 60000);
  check(r0.phase === 'step' && r0.si === 0 && !r0.st.done && r0.st.progress === 0, 'tap: 60 s idle, nothing happens');
  check(A.hintAt(r0) === 5000, 'tap: the idle hint is due 5 s after the last progress');
  var r1 = runAt(A, 11, 1); A.tick(r1, r1.t0 + 60000);
  check(r1.si === 1 && !r1.st.heat && r1.st.band === 0 && !r1.st.done && r1.st.heatAt === null, 'flip: 60 s without heat -> the pan stays cold, no band');
  check(A.hintAt(r1) === 5000, 'flip before heat-on: the idle hint like any step');
  var r2 = runAt(A, 11, 1); A.input(r2, { t: r2.t0 + 300, k: 'b' }); var h = r2.st.heatAt; A.tick(r2, r2.t0 + 60300);
  check(r2.st.heat && r2.st.band === 2 && !r2.st.done && r2.st.res === null && r2.si === 1, 'flip: 60 s after heat-on -> waits at crisp, never flips itself');
  check(A.hintAt(r2) === h + 2 * 3000 + 5000, 'flip after heat-on: the only hint is 5 s after crisp');
  var r3 = runAt(A, 11, 2); A.tick(r3, r3.t0 + 60000);
  check(r3.si === 2 && !r3.st.done && r3.st.lines.every(function (l) { return !l.cut && l.n === 0; }), 'slice: 60 s idle, nothing cut');
  var r4 = runAt(A, 12, 0); A.tick(r4, 0 + 1e9);
  check(!r4.st.done && r4.phase === 'step', 'a very long gap (1e9 ms) still finishes nothing');
})();

section('5. flip: bands by the moment of the press; taps never flip');
(function () {
  var want = { 1000: 'soft', 4000: 'golden', 7000: 'crisp' };
  Object.keys(want).forEach(function (ms) {
    var ok = 0;
    for (var s = 0; s < 20; s++) {
      var seed = 40 + s, run = runAt(A, seed, 1), evs = [];
      tapAt(evs, 300, 100 + s * 5, 200, 1, 70);
      flickUp(evs, 140, 230, 300 + Number(ms), 40 + s * 2, 60 + s * 20, 2);
      A.feed(run, evs, { cadence: [30, 60, 120, 240][s % 4] });
      if (run.phase === 'between' && run.tags[1] === want[ms] && run.looks[1].band === ['soft', 'golden', 'crisp'].indexOf(want[ms])) ok++;
    }
    check(ok === 20, 'flick up ' + (Number(ms) / 1000) + ' s after heat-on -> ' + want[ms] + ' (' + ok + '/20)');
  });
  var run = runAt(A, 50, 1), evs = []; tapAt(evs, 300, 100, 200, 1, 50);
  var pts = []; for (var i = 0; i <= 50; i++) pts.push([150, 250 - i]);
  stroke(evs, pts, 300 + 2900, 8, 2);   /* pressed at 2.9 s, reaches 32 px at about 3.16 s */
  A.feed(run, evs, { cadence: 60 });
  check(run.tags[1] === 'soft', 'judged at the band of the press moment (pressed soft, finished golden -> soft)');
  var notFlip = 0, total = 0;
  for (var s2 = 0; s2 < 200; s2++) {
    var rnd = rng32(900 + s2), r = runAt(A, 900 + s2, 1), e2 = [], t = 260 + rnd() * 300, n = 3 + Math.floor(rnd() * 25);
    for (var k = 0; k < n; k++) {
      var x = 30 + rnd() * 230, y = 30 + rnd() * 260, id = 10 + k, mode = rnd();   /* a new pointer id per press, as a browser gives */
      if (mode < 0.5) { tapAt(e2, t, x, y, id, 10 + rnd() * 140); t += 20 + rnd() * 200; }
      else if (mode < 0.8) { var pp = []; for (var j = 0; j < 6; j++) pp.push([x + (rnd() * 2 - 1) * 5, y + (rnd() * 2 - 1) * 5]); t = stroke(e2, pp, t, 5 + rnd() * 40, id) + 20; }
      else { tapAt(e2, t, x, y, id, 500 + rnd() * 3000); t += 100; }
    }
    A.feed(r, sortEv(e2), { cadence: 60 });
    total++; if (r.si === 1 && r.phase === 'step' && !r.st.done) notFlip++;
  }
  check(notFlip === total, 'no tap burst ever flips (taps, wobbly presses, long presses, several fingers): ' + notFlip + '/' + total);
  /* the tap burst from the tap step goes on for 1.5 s: it only turns the heat on */
  var okBurst = 0;
  for (var s3 = 0; s3 < 30; s3++) {
    var g = geom(A, 70 + s3), r3 = A.createRun('jeon', 70 + s3), t3 = 300, hz = [30, 60, 120, 240][s3 % 4], frame = 0, doneAt = null;
    A.tick(r3, 0);
    while (true) {
      var m = g.marks[Math.floor(t3 / 125) % 3];
      while (frame + 1000 / hz <= t3) { frame += 1000 / hz; A.tick(r3, frame); }
      A.input(r3, { t: t3, k: 'd', x: m.x + 9, y: m.y - 5, p: 't', id: 1 + (Math.floor(t3 / 125) & 1) });
      A.input(r3, { t: t3 + 40, k: 'u', x: m.x + 9, y: m.y - 5, p: 't', id: 1 + (Math.floor(t3 / 125) & 1) });
      if (doneAt === null && r3.looks.length === 1) doneAt = t3;
      if (doneAt !== null && t3 >= doneAt + 1500) break;
      t3 += 125;
    }
    A.tick(r3, t3 + 2000);
    if (r3.si === 1 && r3.st.heat && !r3.st.done && r3.phase === 'step') okBurst++;
  }
  check(okBurst === 30, 'a tap burst running 1.5 s past the tap step only turns the heat on (' + okBurst + '/30)');
  var dirs = [[0, 64, 'down'], [64, 0, 'right'], [-64, 0, 'left'], [56, -24, 'shallow'], [-50, -28, 'shallow left']], okDir = 0;
  dirs.forEach(function (d, i) {
    var rr = runAt(A, 80 + i, 1), ee = []; tapAt(ee, 300, 100, 100, 1, 50);
    var pp2 = []; for (var k2 = 0; k2 <= 12; k2++) pp2.push([140 + d[0] * k2 / 12, 200 + d[1] * k2 / 12]);
    stroke(ee, pp2, 1500, 10, 2); A.feed(rr, ee, { cadence: 60 });
    if (!rr.st.done && rr.si === 1) okDir++;
  });
  check(okDir === dirs.length, 'down, sideways and shallow strokes never flip (' + okDir + '/' + dirs.length + ')');
  var r5 = runAt(A, 90, 1), e5 = []; flickUp(e5, 140, 220, 300, 80, 100, 1); A.feed(r5, e5, { cadence: 60 });
  check(r5.st.heat && !r5.st.done, 'the press that turns the heat on does not flip, even as a flick');
  var r6 = runAt(A, 91, 1), e6 = []; tapAt(e6, 300, 100, 100, 1, 50); flickUp(e6, 140, 220, 1500, 40, 80, 2, 38); A.feed(r6, e6, { cadence: 60 });
  check(r6.st.done && r6.tags[1] === 'soft', 'an up-and-sideways flick within 45 deg flips');
  var r7 = runAt(A, 92, 1); A.input(r7, { t: r7.t0 + 300, k: 'b' }); A.tick(r7, r7.t0 + 300 + 3500); A.input(r7, { t: r7.t0 + 3900, k: 'b' });
  check(r7.tags[1] === 'golden', 'verb button: heat on, then flip at the band now');
  var r8 = runAt(A, 93, 1); A.input(r8, { t: r8.t0 + 300, k: 'b' }); A.tick(r8, r8.t0 + 300 + 7000);
  var bands = A.drain(r8).filter(function (e) { return e.type === 'heat' || e.type === 'band'; }).map(function (e) { return e.say + ':' + e.snd.act + e.snd.band; });
  check(same(bands, ['보들보들:sizzle0', '노릇노릇:sizzle1', '바삭바삭:sizzle2']), 'aria words and sizzle only when the band changes (' + bands.join(' ') + ')');
})();

section('6. slice: least-squares angle, 6 deg steps, slant from 12 deg; the slash across');
(function () {
  [0, 1, 2, 3, 4].forEach(function (j) {
    var straight = [0, 0], slant20 = [0, 0], slantN20 = 0;
    for (var s = 1; s <= 200; s++) {
      for (var li = 0; li < 2; li++) {
        var seed = s * 31 + j * 7, g = geom(A, seed), rnd = rng32(s * 977 + j * 13 + li);
        var r = runAt(A, seed, 2); if (li === 1) A.input(r, { t: r.t0 + 260, k: 'b' });
        var ev = []; stroke(ev, guideDrag(g.lines[li], 0, 2, rnd, j), 300, HZ120, 5); A.feed(r, ev, { cadence: 60 });
        if (r.st.lines[li].cut && Math.abs(r.st.lines[li].ang) < 12) straight[li]++;
        var r2 = runAt(A, seed, 2); if (li === 1) A.input(r2, { t: r2.t0 + 260, k: 'b' });
        var ev2 = []; stroke(ev2, guideDrag(g.lines[li], 20, 2, rng32(s * 1999 + j + li), j), 300, HZ120, 5); A.feed(r2, ev2, { cadence: 60 });
        if (r2.st.lines[li].cut && Math.abs(r2.st.lines[li].ang) >= 12) slant20[li]++;
      }
      var r3 = runAt(A, s, 2), ev3 = []; stroke(ev3, guideDrag(geom(A, s).lines[0], -20, 2, rng32(s + 555), j), 300, HZ120, 5); A.feed(r3, ev3, { cadence: 60 });
      if (r3.st.lines[0].ang <= -12) slantN20++;
    }
    console.log('   jitter ' + j + ' px: straight -> straight ' + straight.join(' / ') + ' · 20 deg -> slant ' + slant20.join(' / ') + ' · -20 deg -> slant ' + slantN20 + ' (of 200, line 0 / line 1)');
    check(straight[0] >= 199 && straight[1] >= 199, 'jitter ' + j + ' px: straight drags -> straight ' + straight.join(' / ') + ' of 200 (line 0 / line 1)');
    check(slant20[0] >= 199 && slant20[1] >= 199 && slantN20 >= 199, 'jitter ' + j + ' px: 20 deg drags -> slant ' + slant20.join(' / ') + ', -20 deg -> ' + slantN20 + ' of 200');
  });
  var g = geom(A, 7), L0 = g.lines[0], mx = (L0.ax + L0.bx) / 2, my = L0.ay;
  var r = runAt(A, 7, 2), ev = []; stroke(ev, line(mx + 3, my - 40, mx - 2, my + 40, 4), 300, HZ120, 1); A.feed(r, ev, { cadence: 60 });
  check(r.st.lines[0].cut && r.st.lines[0].how === 'cross' && r.st.lines[0].ang === 0 && !r.st.lines[1].cut, 'one slash across the guide cuts that line, straight, and only that line');
  var rA = runAt(A, 7, 2), eA = []; stroke(eA, line(L0.ax + 8, my - 40, L0.ax + 8, my + 40, 4), 300, HZ120, 1); A.feed(rA, eA, { cadence: 60 });
  check(!rA.st.lines[0].cut, 'a slash across the outer 15 % of the guide does not cut');
  var a60 = 60 * Math.PI / 180, rB = runAt(A, 7, 2), eB = []; stroke(eB, line(mx - 40 * Math.cos(a60), my - 40 * Math.sin(a60), mx + 40 * Math.cos(a60), my + 40 * Math.sin(a60), 4), 300, HZ120, 1); A.feed(rB, eB, { cadence: 60 });
  check(rB.st.lines[0].cut && rB.st.lines[0].how === 'cross', 'a 60 deg slash cuts');
  var rC = runAt(A, 7, 2), eC = []; stroke(eC, line(mx - 4, my - 6, mx + 2, my + 6, 3), 300, HZ120, 1); A.feed(rC, eC, { cadence: 60 });
  check(!rC.st.lines[0].cut, 'a 13 px wiggle across the guide (a tap) does not cut');
  var rD = runAt(A, 7, 2), eD = []; stroke(eD, line(L0.ax - 10, my + 20, L0.bx + 10, my + 20, 3), 300, HZ120, 1); A.feed(rD, eD, { cadence: 60 });
  check(rD.st.lines[0].cut, 'a drag 20 px beside the guide still cuts (band ' + rD.st.band + ' px)');
  var rE = runAt(A, 7, 2), eE = []; stroke(eE, line(L0.ax - 10, my + 40, L0.bx + 10, my + 40, 3), 300, HZ120, 1); A.feed(rE, eE, { cadence: 60 });
  check(!rE.st.lines[0].cut && rE.st.lines[0].n === 0, 'a drag 40 px beside the guide paints nothing (no penalty)');
  var rF = runAt(A, 7, 2), eF = [], t = stroke(eF, line(L0.ax - 5, my, mx, my, 3), 300, HZ120, 1); stroke(eF, line(mx - 4, my + 1, L0.bx + 5, my - 1, 3), t + 400, HZ120, 2); A.feed(rF, eF, { cadence: 60 });
  check(rF.st.lines[0].cut && rF.st.lines[0].how === 'drag', 'two half strokes (lift and continue) cut');
  var rG = runAt(A, 7, 2), eG = []; stroke(eG, [[L0.ax - 5, my + 1], [mx, my - 2], [L0.bx + 5, my + 1]], 300, 16, 1); A.feed(rG, eG, { cadence: 60 });
  check(rG.st.lines[0].cut, 'a 3-sample flick (no coalesced events) cuts');
  var rH = runAt(A, 7, 2); A.input(rH, { t: rH.t0 + 300, k: 'd', x: 100, y: 100, p: 't', id: 1 }); A.input(rH, { t: rH.t0 + 310, k: 'd', x: L0.ax, y: my, p: 't', id: 2 });
  for (var q = 1; q <= 40; q++) A.input(rH, { t: rH.t0 + 310 + q * 8, k: 'm', x: L0.ax + q * 4, y: my, p: 't', id: 2 });
  check(rH.st.lines[0].n === 0, 'a second finger is ignored while the first is down (slice follows one finger)');
  var tags = A.simulate('jeon', 7, [[], [], []]).steps.map(function (x) { return x.status; });
  check(same(tags, ['open', 'open', 'open']), 'simulate with no events finishes nothing');
  var sl = A.simulate('jeon', 3, fullPath(3, { deg0: 20, deg1: 0, j: 1 }));
  check(sl.done && sl.steps[2].tag === 'slant' && Math.abs(sl.look.cuts[0]) >= 12 && Math.abs(sl.look.cuts[1]) < 12, 'one of two lines slanted -> step tag slant (half or more)');
  var st2 = A.simulate('jeon', 3, fullPath(3, { deg0: 0, deg1: 0, j: 1 }));
  check(st2.done && st2.steps[2].tag === 'straight', 'both straight -> straight');
})();

section('7. tap: every pointerdown, two fingers, 90 ms merge, hold on a fixed schedule');
(function () {
  var okTwo = 0;
  for (var s = 0; s < 50; s++) {
    var g = geom(A, 200 + s), evs = [], t = 300;
    for (var i = 0; i < 9; i++) { var m = g.marks[Math.floor(i / 3)]; tapAt(evs, t, m.x + 6, m.y - 4, 1 + (i & 1), 165); t += 125; }
    var r = runAt(A, 200 + s, 0); A.feed(r, sortEv(evs), { cadence: [30, 60, 120, 240][s % 4] });
    if (r.looks.length === 1 && r.looks[0].dents.length === 9) okTwo++;
  }
  check(okTwo === 50, 'two fingers alternating at 8/s with 40 ms overlap: all 9 taps count (' + okTwo + '/50)');
  var g0 = geom(A, 1), r1 = runAt(A, 1, 0), e1 = [];
  for (var k = 0; k < 30; k++) tapAt(e1, 300 + k * 30, g0.marks[0].x, g0.marks[0].y, 1, 15);
  A.feed(r1, e1, { cadence: 60 });
  check(r1.st.hits <= 11 && r1.st.hits >= 9, 'mashing 33 taps/s: merged to at most ~11/s, never punished (' + r1.st.hits + ' counted)');
  var r2 = runAt(A, 1, 0), e2 = []; tapAt(e2, 300, 5, 5, 1, 50); A.feed(r2, e2, { cadence: 60 });
  var dust = A.drain(r2).filter(function (e) { return e.type === 'dust'; });
  check(r2.st.hits === 0 && dust.length === 1, 'a tap far from the food: a dust speck, not counted');
  var r3 = runAt(A, 1, 0); A.input(r3, { t: r3.t0 + 100, k: 'd', x: g0.marks[0].x, y: g0.marks[0].y, p: 't', id: 1 });
  A.input(r3, { t: r3.t0 + 200, k: 'u', x: g0.marks[0].x, y: g0.marks[0].y, p: 't', id: 1 });
  check(r3.st.hits === 0, 'a press in the first 250 ms of a step does not count');
  A.input(r3, { t: r3.t0 + 260, k: 'd', x: g0.marks[0].x, y: g0.marks[0].y, p: 't', id: 1 });
  check(r3.st.hits === 1, 'a press after 250 ms counts');
  /* hold with a moving finger: the check/hold-cadence.js path; dents identical at 30/60/120/240 Hz */
  var m0 = { x: A.TUNE.food.batter.cx * 2, y: A.TUNE.food.batter.cy * 2 }, hold = [{ t: 300, k: 'd', x: m0.x, y: m0.y, p: 't', id: 1 }];   /* held on the food centre, finger drifting */
  for (var tt = 8; tt <= 2000; tt += 8) hold.push({ t: 300 + tt, k: 'm', x: m0.x + tt * 0.01, y: m0.y + Math.sin(tt / 200) * 6, p: 't', id: 1 });
  hold.push({ t: 2304, k: 'u', x: m0.x, y: m0.y, p: 't', id: 1 });
  var outs = [30, 60, 120, 240].map(function (hz) { var r = runAt(A, 1, 0); A.feed(r, hold, { cadence: hz }); return js({ d: r.st.dents, h: r.st.hits, n: r.st.marks }); });
  check(outs.every(function (o) { return o === outs[0]; }), 'moving 2 s hold: identical dents and hits at 30/60/120/240 Hz');
  check(JSON.parse(outs[0]).h === 8, 'moving 2 s hold: 1 press + 7 auto taps = 8 hits (' + JSON.parse(outs[0]).h + ')');
  var r4 = runAt(A, 1, 0); A.input(r4, { t: r4.t0 + 300, k: 'd', x: m0.x, y: m0.y, p: 't', id: 1 }); A.tick(r4, r4.t0 + 300 + 2150);
  check(r4.looks.length === 1 && r4.phase === 'between', 'press and hold: the step finishes by itself at 400 + 8 x 250 ms');
  var r5 = runAt(A, 1, 0); A.input(r5, { t: r5.t0 + 300, k: 'd', x: m0.x, y: m0.y, p: 't', id: 1 }); A.input(r5, { t: r5.t0 + 500, k: 'd', x: m0.x, y: m0.y, p: 't', id: 2 });
  A.input(r5, { t: r5.t0 + 600, k: 'u', x: m0.x, y: m0.y, p: 't', id: 2 }); A.tick(r5, r5.t0 + 3000);
  check(r5.st.hits === 2, 'only the latest pressed finger auto-taps (the first finger, still down, does not)');
  var r6 = runAt(A, 1, 0); A.input(r6, { t: r6.t0 + 300, k: 'd', x: m0.x, y: m0.y, p: 't', id: 1 }); A.input(r6, { t: r6.t0 + 500, k: 'c' }); A.tick(r6, r6.t0 + 3000);
  check(r6.st.hits === 1, "cancel-all (k 'c' with no id, tab hidden) stops the hold and keeps progress");
  /* a finger held over a step change never feeds the next step */
  var r7 = runAt(A, 1, 0); A.input(r7, { t: r7.t0 + 300, k: 'd', x: m0.x, y: m0.y, p: 't', id: 9 });
  A.tick(r7, r7.t0 + 300 + 2150); A.tick(r7, r7.doneAt + 400);
  for (var y = 0; y < 30; y++) A.input(r7, { t: r7.t0 + 300 + y * 10, k: 'm', x: m0.x, y: m0.y - y * 4, p: 't', id: 9 });
  A.input(r7, { t: r7.t0 + 700, k: 'u', x: m0.x, y: m0.y - 120, p: 't', id: 9 });
  check(r7.si === 1 && !r7.st.heat && !r7.st.done, 'a finger pressed in the tap step and swiped up in the flip step does nothing there');
})();

section('9. resume at every step boundary (JSON, time origin 0 and 1e7) + JSON round trip after every event');
(function () {
  var looksOk = true, rtOk = true, rtCount = 0, nb = 0;
  for (var s = 0; s < 24; s++) {
    var seed = 4000 + s * 17, p = s % 3 === 0 ? [pathTap(seed), pathFlip(seed), pathSlice(seed)] : fullPath(seed, { flipAt: 1000 + (s % 3) * 3000, deg0: (s % 4) * 8 - 8, j: s % 5 });
    var whole = A.simulate('jeon', seed, p);
    for (var b = 0; b < 3; b++) {
      var base = drive(IA, p.slice(0, b).concat([[], [], []]).slice(0, 3), seed, 60, 0, null);
      if (base.si !== b && !(base.phase === 'step' && base.si === b)) continue;
      if (b > 0 && base.looks.length !== b) continue;
      var pot = A.potOf(base, 1762576800000);
      [0, 1e7].forEach(function (T0) {
        var run = A.resumeRun(JSON.parse(JSON.stringify(pot)));
        if (!run) { looksOk = false; return; }
        drive(IA, p, seed, [30, 60, 120][s % 3], T0, function (rr) {
          rtCount++;
          try { assert.deepStrictEqual(IA.J.parse(IA.J.stringify(rr)), rr); if (rr.st) assert.deepStrictEqual(IA.J.parse(IA.J.stringify(rr.st)), rr.st); }
          catch (e) { if (rtOk) console.error('   round trip: ' + String(e.message).slice(0, 300)); rtOk = false; }
        }, run);
        if (!same(A.lookOf(run), whole.look) || run.done !== whole.done) { looksOk = false; console.error('   seed ' + seed + ' boundary ' + b + ' origin ' + T0 + ': ' + js(A.lookOf(run)) + ' vs ' + js(whole.look)); }
        nb++;
      });
    }
  }
  check(looksOk && nb >= 120, 'resumed from every boundary with origin 0 and 1e7 -> the same look as one go (' + nb + ' resumes)');
  check(rtOk, 'deepStrictEqual(JSON round trip, run) and (.., st) after every tick and input (' + rtCount + ' checks)');
  var r = A.createRun('jeon', 1), pot0 = A.potOf(r, 5);
  check(pot0 && pot0.si === 0 && pot0.looks.length === 0, 'a fresh run saves si 0');
  A.tick(r, 0); A.input(r, { t: 300, k: 'b' }); A.input(r, { t: 350, k: 'b' }); A.input(r, { t: 400, k: 'b' });
  var pot1 = A.potOf(r, 6);
  check(r.phase === 'between' && pot1.si === 1 && pot1.looks.length === 1, "a pot saved in 'between' already holds the finished step");
  var rr = A.resumeRun(pot1); A.drain(rr);
  check(rr.si === 1 && rr.st.kind === 'flip' && rr.t0 === null && same(rr.looks, pot1.looks), 'resume restarts the current step from its beginning');
})();

section('9b. host clocks: one continuous clock, or one that restarts at 0 on every step change');
(function () {
  var diff = 0;
  for (var s = 0; s < 20; s++) {
    var seed = 6100 + s, p = fullPath(seed, { flipAt: [1000, 4000, 7000][s % 3], deg0: (s % 5) * 6 - 12, j: s % 4 }), ref = A.simulate('jeon', seed, p);
    var run = A.createRun('jeon', seed), base = 5e5, si = 0, frame = 0;
    A.tick(run, base);
    while (run.phase !== 'reveal' && si < 3) {   /* host style 2: the clock restarts at 0 as soon as it sees a new step */
      var list = p[si], origin = run.t0, i = 0, clock = run.t - origin;
      while (run.si === si && clock < 60000) {
        while (i < list.length && list[i].t <= clock) { var e = list[i++]; A.input(run, { t: origin + e.t, k: e.k, x: e.x, y: e.y, p: e.p, id: e.id }); }
        if (run.si !== si) break;
        clock += 16; A.tick(run, origin + clock);
        if (run.phase === 'between' && run.t >= run.doneAt + A.TUNE.betweenMs) break;
      }
      if (run.si === si) break;
      si = run.si; A.tick(run, 7 + s);   /* the restart: far back on the caller's clock */
    }
    if (!same(A.lookOf(run), ref.look) || run.done !== ref.done) diff++;
  }
  check(diff === 0, 'a host clock that restarts at 0 on each step change gives the same dishes (' + diff + '/20 differ)');
  var r = runAt(A, 3, 1); A.input(r, { t: r.t0 + 300, k: 'b' }); var rel = r.t - r.t0;
  A.tick(r, 10); A.tick(r, 10 + 3000);
  check(r.t - r.t0 === rel + 3000 && r.st.band === 1, 'a backward jump keeps the step clock continuous (no stall, no skip)');
})();

section('10. pot rules');
(function () {
  var r = runAt(A, 99, 2), pot = A.potOf(r, 1762576800000), good = JSON.stringify(pot);
  check(A.resumeRun(JSON.parse(good)) !== null && A.resumeRun(good) !== null, 'a good pot resumes (object or JSON text)');
  function mod(f) { var o = JSON.parse(good); f(o); return o; }
  var bad = {
    'old ver': mod(function (o) { o.ver = 'cook-0'; }),
    'other tune': mod(function (o) { o.tune = (o.tune + 1) >>> 0; }),
    'corrupt JSON': '{"ver":"cook-1",,}',
    'truncated JSON': good.slice(0, Math.floor(good.length / 2)),
    'unknown recipe': mod(function (o) { o.recipe = 'miyeok'; }),
    'si -1': mod(function (o) { o.si = -1; }), 'si 3 (past the end)': mod(function (o) { o.si = 3; o.looks.push({ cuts: [0, 0], offs: [0, 0] }); o.tags.push('straight'); }),
    'si 1.5': mod(function (o) { o.si = 1.5; }), 'si as text': mod(function (o) { o.si = '2'; }),
    'looks shorter than si': mod(function (o) { o.looks.pop(); }), 'swaps of another seed': mod(function (o) { o.swaps = { herb: o.swaps.herb === 'tot' ? 'parae' : 'tot' }; }),
    'dent outside the food': mod(function (o) { o.looks[0].dents = [[999, 1]]; }), 'band 3': mod(function (o) { o.looks[1].band = 3; }),
    'tag unknown': mod(function (o) { o.tags[1] = 'burnt'; }), 'seed text': mod(function (o) { o.seed = 'x'; }),
    'runId junk': mod(function (o) { o.runId = '<b>'; }), 'array': [], 'null': null, 'number': 7, 'text null': 'null', 'empty text': ''
  };
  var okAll = true;
  Object.keys(bad).forEach(function (k) {
    var out; try { out = A.resumeRun(bad[k]); } catch (e) { out = 'threw'; }
    if (out !== null) { okAll = false; console.error('   ' + k + ' -> ' + (out === 'threw' ? 'threw' : 'resumed')); }
  });
  check(okAll, 'old ver / other tune / corrupt / truncated / unknown recipe / si out of range / broken parts -> null, never throws (' + Object.keys(bad).length + ' fixtures)');
  var big = A.createRun('jeon', 4294967295, { id: 'ck_' + 'z'.repeat(13) }); A.tick(big, 0);
  var g = geom(A, 4294967295), t = 300;
  for (var i = 0; i < 9; i++) { A.input(big, { t: t, k: 'd', x: g.marks[i % 3].x + 30, y: g.marks[i % 3].y + 30, p: 't', id: i }); t += 100; }
  A.tick(big, big.doneAt + 400); A.input(big, { t: big.t0 + 300, k: 'b' }); A.input(big, { t: big.t0 + 400, k: 'b' }); A.tick(big, big.doneAt + 400);
  var potBig = JSON.stringify(A.potOf(big, 99999999999999));
  console.log('   largest pot ' + potBig.length + ' bytes · TUNE_HASH ' + A.TUNE_HASH);
  check(potBig.length <= A.TUNE.pot.maxBytes, 'the largest pot is <= 2048 bytes (' + potBig.length + ')');
  check(A.potOf(runAt(A, 1, 3), 1) === null, 'a finished dish saves no pot');
  var st = A.normStore('{"v":1,"day":"2026-11-08","dayN":3,"seen":["tap","flip","tap","<x>"],"pot":{"ver":"cook-1"},"book":[{"id":"ck_1","recipe":"jeon","seed":1,"look":{}},7,{"id":2}]}');
  check(st.dayN === 3 && same(st.seen, ['tap', 'flip']) && st.book.length === 1 && st.pot && st.pot.ver === 'cook-1', 'normStore keeps good parts of a saved key and drops junk');
  check(same(A.normStore('{{{'), { v: 1, day: '', dayN: 0, seen: [], pot: null, book: [] }), 'normStore: broken text -> an empty store');
  var store = A.normStore(null);
  for (var k2 = 0; k2 < 301; k2++) A.bookAdd(store, { id: 'ck_' + k2.toString(36), recipe: 'jeon', seed: k2, swaps: {}, look: { v: 1 }, day: '2026-11-08', madeAt: k2 });
  check(store.book.length === 300 && store.book[0].id === 'ck_' + (300).toString(36) && store.book[299].id === 'ck_1', 'book: newest first, the 301st line drops the oldest');
  A.bookAdd(store, { id: 'ck_' + (300).toString(36), recipe: 'jeon', seed: 1, look: { v: 1 } });
  check(store.book.length === 300 && store.book.filter(function (l) { return l.id === 'ck_' + (300).toString(36); }).length === 1, 'book: the same run is never added twice');
  check(A.seedFor('2026-11-08', 3) === A.hash32('2026-11-08|cook|3') && /^ck_[0-9a-z]+$/.test(A.runIdFor('2026-11-08', 3, 1762576800000)), 'seedFor / runIdFor follow the design');
})();

section('11. result envelope');
(function () {
  var run = drive(IA, fullPath(21, { flipAt: 4000, deg0: 20 }), 21, 60, 0, null);
  var res = A.resultOf(run, { madeAt: 1762576800000, day: '2026-11-08' });
  check(res && res.ms === null && res.status === 'done' && res.by === 'user' && res.game === 'cook' && res.v === 1, 'ms is null, status done, by user, game cook');
  check(res.out.dish.id === 'jeon' && res.out.dish.name === '해초전' && res.out.dish.tier === 1 && same(res.out.dish.ingredients, ['batter', res.out.swaps.herb]), 'dish { id, name, tier, ingredients } with the seeded herb');
  check(same(res.out.steps.map(function (s) { return s.tag; }), [null, 'golden', 'slant']), 'steps carry food tags only (' + js(res.out.steps) + ')');
  var ALLOW = { '': ['v', 'id', 'by', 'game', 'status', 'ms', 'out'], out: ['dish', 'recipe', 'seed', 'swaps', 'steps', 'look', 'madeAt', 'day'], 'out.dish': ['id', 'name', 'tier', 'ingredients'],
    'out.swaps': ['herb'], 'out.steps[]': ['kind', 'status', 'tag'], 'out.look': ['v', 'dents', 'band', 'cuts', 'offs', 'plate'] };
  var keyOk = true, banned = /score|grade|rank|fail|best|star|percent|accuracy|time|duration/i, bannedHit = [];
  (function walk(o, at) {
    if (Array.isArray(o)) { o.forEach(function (x) { walk(x, at + '[]'); }); return; }
    if (!o || typeof o !== 'object') return;
    Object.keys(o).forEach(function (k) {
      if (banned.test(k)) bannedHit.push(at + '.' + k);
      var allow = ALLOW[at]; if (allow && allow.indexOf(k) < 0) { keyOk = false; console.error('   extra key ' + at + '.' + k); }
      walk(o[k], at ? at + '.' + k : k);
    });
  })(res, '');
  check(keyOk, 'result keys follow the whitelist');
  check(bannedHit.length === 0, 'no score / grade / rank / fail / best / star / percent / accuracy / time / duration key at any depth' + (bannedHit.length ? ' (' + bannedHit.join(', ') + ')' : ''));
  var line = A.bookLine(res);
  check(same(Object.keys(line).sort(), ['day', 'id', 'look', 'madeAt', 'recipe', 'seed', 'swaps']), 'book line = { id, recipe, seed, swaps, look, day, madeAt } (no other time field)');
  check(A.resultOf(runAt(A, 1, 2)) === null, 'an unfinished run gives no result');
  check(A.describe('jeon', res.out.steps.map(function (s) { return s.tag; })) === '해초전. 노릇노릇 구웠어. 어슷하게 썰었어.', 'plate description: ' + A.describe('jeon', [null, 'golden', 'slant']));
  var evs = A.simulate('jeon', 5, fullPath(5), { run: true }).run.ev, acts = {};
  evs.forEach(function (e) { if (e.snd) acts[e.snd.act] = 1; });
  check(Object.keys(acts).every(function (a) { return ['tap', 'cut', 'stir', 'sizzle', 'flip', 'quiet', 'lift', 'place', 'back', 'step', 'done'].indexOf(a) >= 0; }) && acts.tap && acts.cut && acts.sizzle && acts.flip && acts.step && acts.quiet && acts.done, 'sound acts come from the act table only (' + Object.keys(acts).join(' ') + ')');
  var order = evs.filter(function (e) { return e.snd && (e.snd.act === 'flip' || e.snd.act === 'quiet'); }).map(function (e) { return e.snd.act; });
  check(order.indexOf('flip') >= 0 && order[order.indexOf('flip') + 1] === 'quiet', "'quiet' follows the flip");
  var reveal = evs.filter(function (e) { return e.type === 'reveal'; });
  check(reveal.length === 1 && reveal[0].snd.act === 'done' && reveal[0].say.indexOf('해초전') === 0, 'one reveal event with the dish description');
})();

section('12. drawDish');
(function () {
  var pal = (function () { var sb = {}; vm.createContext(sb); vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/palettes.js'), 'utf8'), sb); return sb.PALETTES.apollo.colors; })();
  check(pal.length === 46, 'Apollo has 46 colours');
  var set = {}; pal.forEach(function (h) { set[h.toLowerCase()] = 1; });
  function hashImg(img) { var h = 0x811c9dc5; for (var i = 0; i < img.d.length; i++) { h ^= img.d[i]; h = Math.imul(h, 0x01000193); } return (h >>> 0) + ':' + img.w + 'x' + img.h; }
  function colorsOk(img) {
    for (var i = 0; i < img.d.length; i += 4) {
      var a = img.d[i + 3]; if (a === 0) continue; if (a !== 255) return false;
      var hx = '#' + [img.d[i], img.d[i + 1], img.d[i + 2]].map(function (v) { return (v < 16 ? '0' : '') + v.toString(16); }).join('');
      if (!set[hx]) return false;
    }
    return true;
  }
  function opaque(img) { var n = 0; for (var i = 3; i < img.d.length; i += 4) if (img.d[i]) n++; return n; }
  var okSame = true, okPal = true, okInts = true, distinct = {};
  for (var s = 0; s < 30; s++) {
    var seed = 7000 + s, run = drive(IA, fullPath(seed, { flipAt: (s % 3) * 3000 + 1000, deg0: (s % 6) * 6 - 18, deg1: 12 }), seed, 60, 0, null), look = A.lookOf(run);
    (function ints(o) { if (Array.isArray(o)) o.forEach(ints); else if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { ints(o[k]); }); else if (!(typeof o === 'number' && Number.isInteger(o))) okInts = false; })(look);
    var a = A.drawDish('jeon', look, seed, 64, 48), b = B.drawDish('jeon', JSON.parse(js(look)), seed, 64, 48), c = A.drawDish('jeon', look, seed, 64, 48);
    if (hashImg(a) !== hashImg(b) || hashImg(a) !== hashImg(c)) okSame = false;
    if (!colorsOk(a)) okPal = false;
    distinct[hashImg(a)] = 1;
  }
  check(okInts, 'every look value is an integer');
  check(okSame, 'same input -> same pixel hash (twice, and in the other instance)');
  check(okPal, 'every pixel is opaque Apollo 46 or transparent');
  check(Object.keys(distinct).length >= 25, 'different hands leave different dishes (' + Object.keys(distinct).length + '/30 distinct)');
  var def = hashImg(A.drawDish('jeon', null, 5, 64, 48)), throws = false, defOk = true;
  [{ v: 2, band: 2 }, { v: 1, dents: 'x', band: 9, cuts: [7, 1e9], plate: 7 }, 'junk', [], { v: 1, dents: [[1.5, 2]] }, { v: 1, cuts: [0] }].forEach(function (lk) {
    try { var im = A.drawDish('jeon', lk, 5, 64, 48); if (hashImg(im) !== def || !colorsOk(im)) defOk = false; } catch (e) { throws = true; }
  });
  check(!throws && defOk, 'an old look.v or a broken look draws the default dish, never throws');
  var w0 = A.drawDish('nope', {}, 1, 64, 48), w1 = A.drawDish('jeon', {}, 1, 'x', NaN), w2 = A.drawDish(), w3 = A.drawDish('jeon', {}, 1, -5, 9999);
  check(opaque(w0) === 0 && w1.w === 96 && w1.h === 66 && w2.d.length === 96 * 66 * 4 && w3.w === 8 && w3.h === 256, 'unknown recipe -> transparent buffer; junk sizes -> 96 x 66, out of range -> clamped 8..256; no arguments -> still a buffer');
  var IP = load({ COOK_ART: { dish: function (img) { for (var i = 0; i < img.w; i++) { var p = i * 4; img.d[p] = 0x17; img.d[p + 1] = 0x20; img.d[p + 2] = 0x38; img.d[p + 3] = 255; } } } });
  var painted = IP.C.drawDish('jeon', null, 1, 16, 16);
  check(opaque(painted) === 16, 'a COOK_ART.dish painter paints the buffer in place');
  var IT = load({ COOK_ART: { dish: function (img) { img.d[3] = 255; throw new Error('x'); } } });
  check(hashImg(IT.C.drawDish('jeon', null, 5, 64, 48)) === def, 'a painter that throws -> the stub dish, no throw');
})();

section('12b. js/cook-art.js (when present): shared geometry and the dish painter hook');
(function () {
  var ART = path.join(ROOT, 'js/cook-art.js');
  if (!fs.existsSync(ART)) { console.log('   (no js/cook-art.js yet)'); return; }
  var sb = { console: console }, G = null, IW = null;
  try { vm.createContext(sb); vm.runInContext(fs.readFileSync(ART, 'utf8'), sb, { filename: 'cook-art.js' }); vm.runInContext(SRC, sb, { filename: 'cook.js' }); G = sb.COOK_ART && sb.COOK_ART.GEO; IW = sb.COOK; }
  catch (e) { check(false, 'cook-art.js + cook.js load together in node: ' + e.message); return; }
  check(!!(G && IW), 'cook-art.js + cook.js load together in node (COOK_ART.GEO and COOK)');
  if (!G || !IW) return;
  var F = IW.TUNE.food, box = [F.batter.cx - (F.batter.w >> 1), F.batter.cy - (F.batter.h >> 1)];
  check(G.food.cx === F.batter.cx && G.food.cy === F.batter.cy && G.food.cx === F.jeon.cx && G.food.cy === F.jeon.cy, 'food centre: TUNE.food = GEO.food (' + G.food.cx + ', ' + G.food.cy + ')');
  check(same(G.box0, box) && F.batter.w === 64 && F.batter.h === 48, 'food box: TUNE.food origin = GEO.box0 ' + js(G.box0) + ', 64 x 48');
  check(same(G.food.rx, F.batter.rx) && same(G.food.ry, F.batter.ry) && F.jeon.rx[0] === G.food.rx[2] && F.jeon.ry[0] === G.food.ry[2], 'batter outline per stage: TUNE.food.batter rx/ry = GEO.food rx/ry');
  check(same(G.markBase, IW.TUNE.tap.at), 'tap marks: TUNE.tap.at = GEO.markBase');
  check(same(G.cross, [0, 90]) && IW.recipe('jeon').steps[2].cross, 'cut order: line 0 horizontal, line 1 vertical = GEO.cross');
  check(G.dish && G.dish.w === IW.TUNE.dish.w && G.dish.h === IW.TUNE.dish.h, 'drawDish default size = GEO.dish');
  function hashImg(img) { var h = 0x811c9dc5; for (var i = 0; i < img.d.length; i++) { h ^= img.d[i]; h = Math.imul(h, 0x01000193); } return h >>> 0; }
  var set = {}; sb.COOK_ART.APOLLO.forEach(function (h) { set[h] = 1; });
  function palOk(img) { for (var i = 0; i < img.d.length; i += 4) { var a = img.d[i + 3]; if (!a) continue; if (a !== 255) return false; var hx = '#' + [0, 1, 2].map(function (k) { var v = img.d[i + k]; return (v < 16 ? '0' : '') + v.toString(16); }).join(''); if (!set[hx]) return false; } return true; }
  var run = drive({ C: IW }, fullPath(31, { flipAt: 7000, deg0: 18 }), 31, 60, 0, null), look = IW.lookOf(run);
  var a = IW.drawDish('jeon', look, 31), b = IW.drawDish('jeon', JSON.parse(js(look)), 31), stubbed = A.drawDish('jeon', look, 31);
  check(hashImg(a) === hashImg(b) && palOk(a), 'COOK_ART painter: same look -> same pixels, Apollo only');
  check(hashImg(a) !== hashImg(stubbed), 'drawDish really uses COOK_ART.dish when it is loaded (not the stub)');
  var l2 = JSON.parse(js(look)); l2.band = (look.band + 1) % 3;
  var l3 = JSON.parse(js(look)); l3.dents = [];
  check(hashImg(IW.drawDish('jeon', l2, 31)) !== hashImg(a) && hashImg(IW.drawDish('jeon', l3, 31)) !== hashImg(a), 'the look reaches the painter (band and dents change the picture)');
  var sm = IW.drawDish('jeon', look, 31, G.small.w, G.small.h);
  check(sm.w === G.small.w && palOk(sm) && Array.prototype.some.call(sm.d, function (v, i) { return i % 4 === 3 && v; }), 'a small buffer gets COOK_ART.dishSmall');
})();

section('15. verifier fixes (slice 1 second pass)');
(function () {
  /* slice guides fit the food along their own axis: a stroke over the whole jeon (and over 90 % of it) cuts each line */
  var J = A.TUNE.food.jeon, S2 = A.TUNE.slice, g = geom(A, 1);
  check(g.lines[0].len === Math.min(S2.len, 2 * (J.rx[0] + S2.over) * 2) && g.lines[1].len === Math.min(S2.len, 2 * (J.ry[0] + S2.over) * 2) && g.lines[0].len === 128 && g.lines[1].len === 88,
    'slice guides: food size + ' + S2.over + ' art px at each end along their own axis (64 / 44 art px)');
  var cutOk = [0, 0], tried = 0;
  [1, 0.9].forEach(function (frac) {
    for (var s = 1; s <= 40; s++) for (var li = 0; li < 2; li++) {
      var r = runAt(A, s, 2); if (li === 1) A.input(r, { t: r.t0 + 260, k: 'b' });
      var L = r.st.lines[li], mx = (L.ax + L.bx) / 2, my = (L.ay + L.by) / 2, h = (li === 0 ? J.rx[0] : J.ry[0]) * 2 * frac, ev = [];
      stroke(ev, li === 0 ? line(mx - h, my, mx + h, my, 4) : line(mx, my - h, mx, my + h, 4), 300, HZ120, 7); A.feed(r, ev, { cadence: 60 });
      if (r.st.lines[li].cut) cutOk[li]++;
      if (li === 0) tried++;
    }
  });
  check(cutOk[0] === tried && cutOk[1] === tried, 'a straight stroke over the whole jeon or 90 % of it cuts the line, across and down (' + cutOk.join(' / ') + ' of ' + tried + ')');
  /* a hold with a huge time jump: bounded catch-up, the same grid afterwards */
  var rh = runAt(A, 1, 0); A.input(rh, { t: rh.t0 + 300, k: 'd', x: 4, y: 4, p: 't', id: 1 }); A.drain(rh);
  var t0 = Date.now(); A.tick(rh, rh.t0 + 1e8); var nev = A.drain(rh).length, ms = Date.now() - t0;
  check(nev <= A.TUNE.tap.catchUp + 2 && ms < 500 && rh.st.press.next % A.TUNE.tap.everyMs === (300 + A.TUNE.tap.holdMs) % A.TUNE.tap.everyMs,
    'a held finger + a 1e8 ms jump: at most ' + A.TUNE.tap.catchUp + ' auto taps (' + nev + ' events, ' + ms + ' ms), then the same 250 ms grid');
  var rf = runAt(A, 1, 0), m0 = { x: J.cx * 2, y: J.cy * 2 }; A.input(rf, { t: rf.t0 + 300, k: 'd', x: m0.x, y: m0.y, p: 't', id: 1 }); A.tick(rf, rf.t0 + 1e7);
  check(rf.looks.length === 1 && rf.looks[0].dents.length === 9, 'a held finger on the food over a huge jump still finishes the tap step (9 dents)');
  var tS = Date.now(), big = A.simulate('jeon', 5, fullPath(5), { cadence: 1e9, until: 1e12 }), tE = Date.now() - tS;
  check(big.done && tE < 15000, 'simulate clamps cadence (1..1000 Hz) and until (<= 10 min): returns in ' + tE + ' ms');
  /* holes in a saved look are refused (Array#every skips holes) */
  var rp = runAt(A, 5, 2), potH = A.potOf(rp, 1), holes = 0, refused = 0;
  [function (o) { o.looks[0].dents = [[1, 2], [3, 4], [5, 6]]; delete o.looks[0].dents[1]; }, function (o) { o.looks[0].dents = [[1, 2]]; delete o.looks[0].dents[0][1]; }].forEach(function (f) {
    var o = JSON.parse(JSON.stringify(potH)); f(o); holes++; if (A.resumeRun(o) === null) refused++;
  });
  check(refused === holes, 'a pot whose look arrays have holes is dropped (' + refused + '/' + holes + ')');
  /* a ?rec=1 recording of a resumed dish replays with simulate(..., { pot }) */
  var seedR = 4242, p = fullPath(seedR, { flipAt: 4000, deg0: 12, j: 2 }), whole = A.simulate('jeon', seedR, p);
  var base = drive(IA, [p[0], [], []], seedR, 60, 0, null), potR = JSON.parse(JSON.stringify(A.potOf(base, 1)));
  var rec = A.simulate('jeon', seedR, [[], p[1], p[2]], { pot: potR });
  check(potR.si === 1 && rec.done && same(rec.look, whole.look), 'simulate(recipe, seed, steps, { pot }) replays a resumed dish to the same look');
  check(A.simulate('jeon', seedR + 1, [[], p[1], p[2]], { pot: potR }).look === null, 'simulate with a pot of another seed starts nothing');
  /* the run id holds no clock */
  check(A.runIdFor('2026-11-08', 3, 'abc') === A.runIdFor('2026-11-08', 3, 'abc') && A.runIdFor('2026-11-08', 3, 'abc') !== A.runIdFor('2026-11-08', 3, 'abd'), 'runIdFor(day, dayN, nonce): same nonce, same id; another nonce, another id');
  var live = SRC.split('/* ───────── live ───────── */')[1] || '', calls = live.match(/runIdFor\([^;]*\)/g) || [];
  check(calls.length >= 1 && calls.every(function (c) { return !/Date\.now|performance\.now|new Date|getTime/.test(c); }), 'the live half never passes a clock into runIdFor (' + calls.length + ' call)');
  check(/getRandomValues/.test(live), 'the live half salts the run id with crypto.getRandomValues');
  check(A.TUNE.calmMs >= 400 && A.TUNE.flip.teach >= 2 && A.TUNE.slice.over >= 1 && A.TUNE.tap.catchUp >= 8, 'TUNE carries calmMs, flip.teach, slice.over, tap.catchUp');
})();

section('14. static checks');
(function () {
  var MARK = '/* ───────── live ───────── */';
  var parts = SRC.split(MARK);
  check(parts.length === 2, "js/cook.js has the '" + MARK + "' marker exactly once");
  var sim = parts[0];
  /* function declarations hoist over the whole IIFE: a live-half function with a simulation name would replace it */
  function fnNames(src) { var o = {}; (src.match(/function\s+([A-Za-z_$][\w$]*)\s*\(/g) || []).forEach(function (m) { o[m.replace(/function\s+|\s*\(/g, '')] = 1; }); return o; }
  var simFns = fnNames(sim), clash = parts.length === 2 ? Object.keys(fnNames(parts[1])).filter(function (k) { return simFns[k]; }) : [];
  check(clash.length === 0, 'live half declares no function name the simulation half uses' + (clash.length ? ' (' + clash.join(', ') + ')' : ''));
  function noComments(src) { return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1'); }
  check(!/Date\.now|performance\.now/.test(sim), 'simulation half: no Date.now / performance.now (comments included)');
  check(!/\bdocument\.|\bwindow\.|localStorage|sessionStorage|setTimeout|setInterval|requestAnimationFrame|\bnew Date\b/.test(noComments(sim)), 'simulation half: no DOM, storage, timers or Date');
  var files = ['js/cook.js', 'js/cook-art.js', 'css/cook.css', 'cook.html'].filter(function (f) { return fs.existsSync(path.join(ROOT, f)); });
  console.log('   scanning: ' + files.join(', '));
  var BANNED = ['맛있', '좋아해', '좋아하', '먹고 싶', '기다렸', '아쉽', '미안', '실패', '성공', '점수', '완벽', '최고', '잘했', '탔', '등급', '메달', '마마', 'Mama'];
  var ks = (function () {   /* KS X 1001: decode every EUC-KR Hangul code (rows 4 jamo, 16-40 syllables) */
    var dec = new TextDecoder('euc-kr'), out = {}, n = 0;
    for (var hi = 0xB0; hi <= 0xC8; hi++) for (var lo = 0xA1; lo <= 0xFE; lo++) { var ch = dec.decode(Buffer.from([hi, lo])); if (/[가-힣]/.test(ch) && !out[ch]) { out[ch] = [hi, lo]; n++; } }
    for (var lo2 = 0xA1; lo2 <= 0xFE; lo2++) { var j = dec.decode(Buffer.from([0xA4, lo2])); if (/[ㄱ-ㆎ]/.test(j)) out[j] = [0xA4, lo2]; }
    return { map: out, syllables: n };
  })();
  check(ks.syllables === 2350, 'EUC-KR table gives the 2,350 KS X 1001 syllables');
  function ksOk(ch) { var b = ks.map[ch]; return !!b && new TextDecoder('euc-kr').decode(Buffer.from(b)) === ch; }
  files.forEach(function (f) {
    var text = fs.readFileSync(path.join(ROOT, f), 'utf8');
    check(!/Math\.random/.test(text), f + ': no Math.random');
    check(!/ppolppol_v2/.test(text) && !/\bAPP\./.test(text) && !/\bS\./.test(text) && !/BRAIN/.test(text), f + ': no main-game save key, APP., S. or BRAIN');
    var hits = BANNED.filter(function (w) { return text.indexOf(w) >= 0; });
    check(hits.length === 0, f + ': no banned word' + (hits.length ? ' (' + hits.join(', ') + ')' : ''));
    check(text.indexOf('요리 수첩에 넣었어') < 0, f + ": slice 1 has no notebook, so no '요리 수첩에 넣었어'");
    var outside = (text.match(/[ᄀ-ᇿㄱ-ㆎꥠ-꥿가-힣ힰ-퟿]/g) || []).filter(function (ch) { return !ksOk(ch); });
    check(outside.length === 0, f + ': every Hangul character is inside KS X 1001 (euc-kr round trip)' + (outside.length ? ' (' + outside.join('') + ')' : ''));
  });
  var noStr = SRC.replace(MARK, '').replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g, "''");
  var nonAscii = noStr.match(/[^\x00-\x7F]/g) || [];
  check(nonAscii.length === 0, 'js/cook.js: comments and code are ASCII (Korean only inside strings)' + (nonAscii.length ? ' (' + nonAscii.slice(0, 10).join('') + ')' : ''));
  var VOCAB = ['부엌', '닫기', '요리 수첩', '돌아가기', '이어서', '미역국', '해초전', '톳 주먹밥', '썰기', '톡톡', '젓기', '불 켜기', '뒤집기', '올리기', '보들보들', '노릇노릇', '바삭바삭', '반쯤', '한 줄', '하나 올렸어', '다 됐어',
    '요리 수첩에 넣었어', '아직 비어 있어', '반듯하게 썰었어', '어슷하게 썰었어', '꾹꾹 눌렀어', '보들보들하게 구웠어', '노릇노릇 구웠어', '바삭바삭하게 구웠어', '세 개 올렸어', '보러 가기', '두부', '바다포도', '김', '깨', '파래', '톳'];
  var BAD = /[^\sA-Za-z0-9.,!?:;'"()\/%+~\-ᄀ-ᇿ㄰-㆏가-힣·…‘’“”—–]/gu, EMOTE = /zZ|Zz|\^\^|<3|[:;]-?[()]|T_T|>_</g;
  var leaves = [];
  (function walk(o) { if (typeof o === 'string') leaves.push(o); else if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { walk(o[k]); }); })(A.WORDS);
  check(leaves.length >= 20, 'WORDS has ' + leaves.length + ' strings');
  check(leaves.every(function (w) { return VOCAB.indexOf(w) >= 0; }), 'every WORDS string is a word from the vocabulary list');
  check(leaves.every(function (w) { return !/\d+\s*\/\s*\d+/.test(w); }) && leaves.every(function (w) { return !/\d/.test(w); }), 'WORDS: no numbers, no N/M counts');
  check(leaves.every(function (w) { return !(w.match(BAD) || []).length && !(w.match(EMOTE) || []).length; }), 'WORDS: no emoji or decorative symbols (smoke U glyph list)');
  check(leaves.every(function (w) { return Array.from(w).every(function (ch) { return !/[가-힣]/.test(ch) || ksOk(ch); }); }), 'WORDS: every Hangul character inside KS X 1001');
  var desc = A.describe('jeon', [null, 'crisp', 'straight']);
  check(!(desc.match(BAD) || []).length && !/\d/.test(desc), 'plate description passes the same glyph rules (' + desc + ')');
})();

console.log('\n' + passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
