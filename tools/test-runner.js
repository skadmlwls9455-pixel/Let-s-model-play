#!/usr/bin/env node
/* tools/test-runner.js — 다락방 달리기 결정성 테스트 (node, DOM 없음). 실패하면 exit 1.
 *   node tools/test-runner.js
 * js/runner.js 를 document/window 없는 vm 샌드박스에 두 번 따로 올려(서로 다른 인스턴스) 같은 입력이 같은 결과를 내는지 본다.
 *   1) 무작위 입력 스크립트 200개 × 시드: simulate() 두 번 + 다른 인스턴스 한 번 → 완전히 같음
 *   2) 점수는 버틴 틱에 대해 단조 증가 (until 을 늘려 가며)
 *   3) 골든 값: 시드·물리 숫자가 바뀌면 깨진다 → 바꿨다면 VERSION 을 올리고 골든을 갱신할 것 (서버 검증과 어긋나지 않게)
 *   4) tests/evidence/runner-live-run.json (smoke 시나리오 R 이 Playwright 로 남긴 실제 판) → 재시뮬 점수 = 화면 점수
 */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
var ROOT = path.resolve(__dirname, '..');
var SRC = fs.readFileSync(path.join(ROOT, 'js/runner.js'), 'utf8');
var passes = 0, fails = 0;
function check(c, m) { if (c) passes++; else { fails++; console.error('  FAIL ' + m); } }
function loadFresh() { var sb = { console: console, Math: Math, JSON: JSON }; vm.createContext(sb); vm.runInContext(SRC, sb, { filename: 'runner.js' }); return sb.RUNNER; }

var A = loadFresh(), B = loadFresh();
console.log('== 로드 (DOM 없음)');
check(A && typeof A.simulate === 'function', 'RUNNER.simulate 있음');
check(typeof A.open === 'undefined', 'DOM 없으면 라이브 부분(open)은 붙지 않음');
check(A.VERSION === 'runner-1', 'VERSION runner-1');

/* 무작위 입력 스크립트 (테스트용 PRNG 도 mulberry32) */
function script(rnd, n) {
  var ev = [], t = 0, j = false, d = false;
  for (var i = 0; i < n; i++) {
    t += rnd() % 70;
    var r = rnd() % 10;
    if (r < 6) { ev.push({ t: t, a: j ? 'ju' : 'jd' }); j = !j; }
    else { ev.push({ t: t, a: d ? 'du' : 'dd' }); d = !d; }
  }
  return ev;
}
console.log('== 1. 무작위 200판 결정성');
var rnd = A.mulberry32(20261104), deaths = 0, maxScore = 0, totalTicks = 0, scripts = [];
for (var k = 0; k < 200; k++) {
  var seed = (k % 3 === 0) ? A.seedFor('2026-11-' + String(1 + k % 28).padStart(2, '0'), k) : rnd();
  var ev = script(rnd, 4 + rnd() % 120), night = !!(k & 1), opts = { night: night };
  var r1 = A.simulate(seed, ev, opts), r2 = A.simulate(seed, ev, opts), r3 = B.simulate(seed, JSON.parse(JSON.stringify(ev)), { night: night });
  try { assert.deepStrictEqual(JSON.parse(JSON.stringify(r1)), JSON.parse(JSON.stringify(r2))); assert.deepStrictEqual(JSON.parse(JSON.stringify(r1)), JSON.parse(JSON.stringify(r3))); check(true); }
  catch (e) { check(false, '판 ' + k + ' 결과가 다름: ' + JSON.stringify(r1) + ' / ' + JSON.stringify(r3)); }
  check(Number.isInteger(r1.score) && Number.isInteger(r1.ticks) && r1.score >= 0, '판 ' + k + ' 점수·틱 정수');
  if (r1.dead) deaths++; maxScore = Math.max(maxScore, r1.score); totalTicks += r1.ticks;
  scripts.push({ seed: seed, ev: ev, night: night, r: r1 });
}
console.log('   200판: 부딪힘 ' + deaths + ' · 최고 ' + maxScore + ' · 평균 ' + Math.round(totalTicks / 200) + ' 틱');

console.log('== 1b. 앞을 보는 봇 4판 (긴 판: 거미줄·물웅덩이·이끼까지)');
function bot(R, seed, night, limit) {
  var cands = [[['jd', 0], ['ju', 1]], [['jd', 0], ['ju', 6]], [['jd', 0], ['ju', 14]], [['dd', 0], ['du', 40]], [['dd', 0], ['du', 20]]], plan = [];
  for (var t = 0; t < limit; t++) {
    if (!R.simulate(seed, plan, { night: night, until: t + 18 }).dead) continue;
    var best = null, bt = -1;
    cands.forEach(function (c) { var ev = plan.concat(c.map(function (x) { return { t: t + x[1], a: x[0] }; })); var r = R.simulate(seed, ev, { night: night, until: t + 70 }); if (r.ticks > bt) { bt = r.ticks; best = ev; } });
    plan = best;
  }
  return plan.sort(function (a, b) { return a.t - b.t; });
}
[[11, false], [22, true], [33, false], [44, true]].forEach(function (p) {
  var ev = bot(A, p[0], p[1], 2400), r1 = A.simulate(p[0], ev, { night: p[1], until: 2400 }), r2 = B.simulate(p[0], ev, { night: p[1], until: 2400 });
  var kinds = {}, s = A.createSim(p[0], { night: p[1] }), i = 0;
  while (s.tick < r1.ticks) { while (i < ev.length && ev[i].t <= s.tick) { if (ev[i].t === s.tick) A.applyInput(s, ev[i].a); i++; } A.step(s); s.obs.forEach(function (o) { kinds[o.k] = 1; }); }
  console.log('   시드 ' + p[0] + (p[1] ? ' 밤' : ' 낮') + ': ' + r1.ticks + ' 틱 · ' + r1.score + '점 · 이끼 ' + r1.moss + ' · 입력 ' + ev.length + ' · 본 것 ' + Object.keys(kinds).sort().join(','));
  check(JSON.stringify(r1) === JSON.stringify(r2), '봇 판 ' + p[0] + ' 두 인스턴스 동일');
  check(!r1.dead && r1.ticks === 2400, '봇 판 ' + p[0] + ' 40초 생존 (깰 수 있는 배치)');
  check(kinds.web && (!p[1] || kinds.rain), '봇 판 ' + p[0] + ' 거미줄' + (p[1] ? '·물웅덩이' : '') + ' 등장');
  check(s.score === r1.score, '봇 판 ' + p[0] + ' 수동 스텝 = simulate');
});

console.log('== 2. 점수 단조 증가 (until 을 늘려 가며)');
scripts.slice(0, 40).forEach(function (sc, idx) {
  var prev = -1, prevT = -1, okMono = true, okT = true;
  for (var u = 0; u <= sc.r.ticks + 20; u += 7) {
    var r = A.simulate(sc.seed, sc.ev, { night: sc.night, until: u });
    if (r.score < prev) okMono = false;
    if (r.ticks !== Math.min(u, sc.r.ticks) || r.ticks < prevT) okT = false;
    prev = r.score; prevT = r.ticks;
  }
  check(okMono, '스크립트 ' + idx + ' 점수 단조');
  check(okT, '스크립트 ' + idx + ' ticks = min(until, 부딪힌 틱)');
  var full = A.simulate(sc.seed, sc.ev, { night: sc.night, until: sc.r.ticks });
  check(full.score === sc.r.score, '스크립트 ' + idx + ' until=끝 틱이면 같은 점수');
});

console.log('== 3. 골든 값 (바뀌면 VERSION 올리기)');
check(A.seedFor('2026-11-04', 0) === 126531367, 'seedFor(2026-11-04, 0) = 126531367');
var g1 = A.simulate(A.seedFor('2026-11-04', 0), []);
check(g1.score === 25 && g1.ticks === 157 && g1.hit === 'crate', '입력 없음 → 157 틱에 상자, 25점 (' + JSON.stringify(g1) + ')');
var g2 = A.simulate(12345, [{ t: 100, a: 'jd' }, { t: 110, a: 'ju' }, { t: 300, a: 'dd' }, { t: 340, a: 'du' }], { night: true });
check(g2.score === 25 && g2.ticks === 157 && g2.hit === 'candle', '시드 12345 짧은 스크립트 → 157 틱에 촛대 (' + JSON.stringify(g2) + ')');
check(A.verify({ version: 'runner-1', seed: 7, inputs: [], score: A.simulate(7, []).score, ticks: A.simulate(7, []).ticks, end: 'hit', night: false }), 'verify(): 맞는 기록 통과');
check(!A.verify({ version: 'runner-1', seed: 7, inputs: [], score: 9999, ticks: 10, end: 'hit', night: false }), 'verify(): 부풀린 점수 거절');
/* 잘못된/뒤섞인 입력도 죽지 않고 결정적으로 */
var junk = [{ t: 5, a: 'xx' }, { t: 3, a: 'jd' }, { t: -1, a: 'ju' }, { t: 'a', a: 'dd' }, null && 0].filter(Boolean);
check(JSON.stringify(A.simulate(9, junk)) === JSON.stringify(B.simulate(9, junk)), '이상한 입력도 같은 결과');

console.log('== 4. 실제 라이브 판 재시뮬 (smoke R 이 남긴 기록)');
var live = path.join(ROOT, 'tests/evidence/runner-live-run.json');
if (fs.existsSync(live)) {
  var run = JSON.parse(fs.readFileSync(live, 'utf8'));
  var rr = A.simulate(run.seed, run.inputs, { night: run.night, until: run.end === 'hit' ? null : run.ticks });
  console.log('   기록: seed ' + run.seed + ' · 입력 ' + run.inputs.length + '개 · ' + run.end + ' · 화면 점수 ' + run.displayed + ' · 저장 점수 ' + run.score + ' → 재시뮬 ' + rr.score + ' (' + rr.ticks + ' 틱)');
  check(rr.score === run.score && rr.ticks === run.ticks, '라이브 기록 재시뮬 점수·틱 일치');
  check(run.displayed == null || String(rr.score) === String(run.displayed), '재시뮬 점수 = 화면에 보인 점수');
  check(A.verify(run), 'verify(라이브 기록) 통과');
} else {
  console.log('   (없음 — SMOKE_ONLY=R node tools/smoke.js 를 먼저 돌리면 생긴다)');
  if (process.env.RUNNER_REQUIRE_LIVE === '1') check(false, '라이브 기록 필요');
}

console.log('\n' + passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
