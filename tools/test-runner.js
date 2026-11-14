#!/usr/bin/env node
/* tools/test-runner.js — 다락방 달리기 결정성 테스트 (node, DOM 없음). 실패하면 exit 1.
 *   node tools/test-runner.js
 * js/runner.js 를 document/window 없는 vm 샌드박스에 두 번 따로 올려(서로 다른 인스턴스) 같은 입력이 같은 결과를 내는지 본다.
 *   1) 무작위 입력 스크립트 200개 × 시드: simulate() 두 번 + 다른 인스턴스 한 번 → 완전히 같음
 *   2) 점수는 버틴 틱에 대해 단조 증가 (until 을 늘려 가며)
 *   3) 골든 값: 시드·물리 숫자가 바뀌면 깨진다 → 바꿨다면 VERSION 을 올리고 골든을 갱신할 것 (서버 검증과 어긋나지 않게)
 *   4) tests/evidence/runner-live-run.json (smoke 시나리오 R 이 Playwright 로 남긴 실제 판) → 재시뮬 점수 = 화면 점수
 *   5) 라이브 창(가짜 DOM + 가짜 시계) ↔ 실제 api/runner 핸들러(메모리 저장소): 저장소 덮어쓰기 · 늦은 올리기 응답 · 토큰 신선도 · 망토 final
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
check(A.VERSION === 'runner-2', 'VERSION runner-2 (11-15 세로 전체 화면: 문어 자리·속도가 바뀐 판)');
check(A.C.OCT_X === 10 && A.C.V0 === 256 && A.C.VMAX === 448 && A.C.RAMP === 20 && A.C.SPAWN_X > A.C.W, 'runner-2 숫자 (OCT_X 10 · 속도 1.0→1.75 px/틱 · 20틱마다) · 보이는 폭 최대 < 생기는 자리');

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
check(g1.score === 27 && g1.ticks === 216 && g1.hit === 'crate', '입력 없음 → 216 틱에 상자, 27점 (' + JSON.stringify(g1) + ')');
var g2 = A.simulate(12345, [{ t: 100, a: 'jd' }, { t: 110, a: 'ju' }, { t: 300, a: 'dd' }, { t: 340, a: 'du' }], { night: true });
check(g2.score === 27 && g2.ticks === 215 && g2.hit === 'candle', '시드 12345 짧은 스크립트 → 215 틱에 촛대 (' + JSON.stringify(g2) + ')');
check(A.verify({ version: 'runner-2', seed: 7, inputs: [], score: A.simulate(7, []).score, ticks: A.simulate(7, []).ticks, end: 'hit', night: false }), 'verify(): 맞는 기록 통과');
check(!A.verify({ version: 'runner-1', seed: 7, inputs: [], score: A.simulate(7, []).score, ticks: A.simulate(7, []).ticks, end: 'hit', night: false }), 'verify(): 옛 판(runner-1) 기록은 거절 (점수가 맞아 보여도)');
check(!A.verify({ version: 'runner-2', seed: 7, inputs: [], score: 9999, ticks: 10, end: 'hit', night: false }), 'verify(): 부풀린 점수 거절');
/* 잘못된/뒤섞인 입력도 죽지 않고 결정적으로 */
var junk = [{ t: 5, a: 'xx' }, { t: 3, a: 'jd' }, { t: -1, a: 'ju' }, { t: 'a', a: 'dd' }, null && 0].filter(Boolean);
check(JSON.stringify(A.simulate(9, junk)) === JSON.stringify(B.simulate(9, junk)), '이상한 입력도 같은 결과');

console.log('== 4. 실제 라이브 판 재시뮬 (smoke R 이 남긴 기록)');
var live = path.join(ROOT, 'tests/evidence/runner-live-run.json');
if (fs.existsSync(live)) {
  var run = JSON.parse(fs.readFileSync(live, 'utf8'));
  var rr = A.simulate(run.seed, run.inputs, { night: run.night, until: run.end === 'hit' ? null : run.ticks });
  console.log('   기록: seed ' + run.seed + ' · 입력 ' + run.inputs.length + '개 · ' + run.end + ' · 화면 점수 ' + run.displayed + ' · 저장 점수 ' + run.score + ' → 재시뮬 ' + rr.score + ' (' + rr.ticks + ' 틱)');
  check(run.version === A.VERSION, '라이브 기록이 지금 판 (' + run.version + ') — 아니면 SMOKE_ONLY=R 로 다시 남길 것');
  check(rr.score === run.score && rr.ticks === run.ticks, '라이브 기록 재시뮬 점수·틱 일치');
  check(run.displayed == null || String(rr.score) === String(run.displayed), '재시뮬 점수 = 화면에 보인 점수');
  check(A.verify(run), 'verify(라이브 기록) 통과');
} else {
  console.log('   (없음 — SMOKE_ONLY=R node tools/smoke.js 를 먼저 돌리면 생긴다)');
  if (process.env.RUNNER_REQUIRE_LIVE === '1') check(false, '라이브 기록 필요');
}

console.log('== 5. 라이브 창 (가짜 DOM · 가짜 시계 · 실제 API 핸들러)');
/* 아주 작은 가짜 DOM: runner.js 가 쓰는 것만. 요소는 id 로 찾고, 이벤트는 fire() 로 직접 부른다 */
function liveHarness(T0) {
  var clk = { t: T0 }, timers = [], tid = 0, raf = null, ls = new Map(), byId = {};
  class FD extends Date { constructor() { if (arguments.length) super(...arguments); else super(clk.t); } static now() { return clk.t; } }
  var ctx2d = { imageSmoothingEnabled: false, fillStyle: '', fillRect: function () {}, setTransform: function () {}, drawImage: function () {}, putImageData: function () {},
    createImageData: function (w, h) { return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; } };
  function El(tag) { this.tagName = String(tag).toUpperCase(); this.children = []; this.parentNode = null; this.ls = {}; this.style = {}; this.hidden = false; this.disabled = false; this.value = ''; this.textContent = ''; this.open = false; this.clientWidth = 360; }
  El.prototype.setAttribute = function (k, v) { if (k === 'id') byId[v] = this; if (k === 'hidden') this.hidden = true; };
  El.prototype.appendChild = function (c) { if (c && typeof c === 'object') c.parentNode = this; this.children.push(c); return c; };
  El.prototype.removeChild = function (c) { var i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c; };
  Object.defineProperty(El.prototype, 'firstChild', { get: function () { return this.children[0] || null; } });
  El.prototype.addEventListener = function (t, f) { (this.ls[t] = this.ls[t] || []).push(f); };
  El.prototype.fire = function (t, e) { e = e || {}; e.type = t; e.target = e.target || this; e.preventDefault = function () {}; (this.ls[t] || []).slice().forEach(function (f) { f(e); }); };
  El.prototype.focus = function () {}; El.prototype.setPointerCapture = function () {};
  El.prototype.getContext = function () { return ctx2d; };
  El.prototype.showModal = function () { this.open = true; };
  El.prototype.close = function () { if (this.open) { this.open = false; this.fire('close'); } };
  var doc = { readyState: 'complete', body: new El('body'), documentElement: { getAttribute: function () { return null; } }, hidden: false, activeElement: null,
    createElement: function (t) { return new El(t); }, createTextNode: function (t) { return { textContent: t }; }, getElementById: function (id) { return byId[id] || null; },
    addEventListener: function () {}, contains: function () { return true; } };
  /* 서버: 실제 핸들러. gate[name] 이 있으면 처리는 끝났는데 응답만 늦게 (그 약속이 풀릴 때) 온다 */
  var net = { calls: [], gate: {}, H: null };
  function fetchStub(url, o) {
    var u = new URL(url, 'http://x/'), name = u.pathname.split('/').pop(), q = {};
    u.searchParams.forEach(function (v, k) { q[k] = v; });
    net.calls.push(name);
    var res = { statusCode: 0, body: '', setHeader: function () {}, end: function (b) { this.body = b || ''; } };
    var p = Promise.resolve(net.H[name]({ method: (o && o.method) || 'GET', query: q, body: o && o.body, url: url }, res)).then(function () { return res; });
    var g = net.gate[name]; if (g) p = p.then(function (r) { return g().then(function () { return r; }); });
    return p.then(function (r) { return { status: r.statusCode, json: function () { return Promise.resolve(JSON.parse(r.body)); } }; });
  }
  var sb = { console: console, Math: Math, JSON: JSON, Date: FD, URL: URL, Uint8ClampedArray: Uint8ClampedArray, document: doc, location: { protocol: 'http:' },
    localStorage: { getItem: function (k) { return ls.has(k) ? ls.get(k) : null; }, setItem: function (k, v) { ls.set(k, String(v)); }, removeItem: function (k) { ls.delete(k); } },
    fetch: fetchStub, AbortController: function () { this.signal = {}; this.abort = function () {}; },
    setTimeout: function (f, ms) { timers.push({ t: clk.t + (ms || 0), f: f, id: ++tid }); return tid; },
    clearTimeout: function (id) { timers = timers.filter(function (x) { return x.id !== id; }); },
    requestAnimationFrame: function (f) { raf = f; return 1; }, cancelAnimationFrame: function () { raf = null; },
    performance: { now: function () { return clk.t - T0 + 1000; } }, getComputedStyle: function () { return { borderLeftWidth: '0', borderRightWidth: '0', paddingLeft: '0', paddingRight: '0' }; },
    devicePixelRatio: 1, innerHeight: 740, addEventListener: function () {}, matchMedia: function () { return { matches: true }; } };
  sb.window = sb;
  vm.createContext(sb); vm.runInContext(SRC, sb, { filename: 'runner.js' });
  async function flush() { for (var i = 0; i < 6; i++) await new Promise(function (r) { setImmediate(r); }); }
  async function advance(ms) {
    var end = clk.t + ms;
    for (;;) { timers.sort(function (a, b) { return a.t - b.t || a.id - b.id; }); var n = timers[0]; if (!n || n.t > end) break; timers.shift(); clk.t = n.t; n.f(); await flush(); }
    clk.t = end; await flush();
  }
  var R = sb.RUNNER;
  return {
    R: R, clk: clk, net: net, byId: byId, flush: flush, advance: advance,
    net_: function () { var o = JSON.parse(ls.get('ppolppol_runner') || '{}'); return o.net || null; },
    storeObj: function () { return JSON.parse(ls.get('ppolppol_runner') || 'null'); },
    setStore: function (o) { ls.set('ppolppol_runner', JSON.stringify(o)); },
    key: function (k, type) { byId['runner-dlg'].fire(type || 'keydown', { key: k, repeat: false, target: byId['rn-cv'] }); },
    open: async function () { R.open({ opener: null }); await flush(); },
    readyNet: async function () { for (var i = 0; i < 50 && !(R.live() && R.live().state === 'ready' && !/고르는/.test(byId['rn-msg'].textContent)); i++) await advance(50); },
    runToOver: async function () {   /* 점프 한 번(바로 놓기) 하고 부딪힐 때까지 프레임 */
      this.key(' '); this.key(' ', 'keyup');
      for (var i = 0; i < 400 && R.live().state !== 'over'; i++) { await advance(50); var f = raf; raf = null; if (f) f(clk.t - T0 + 1000); }
      await advance(500);   /* 또 할래?/그만 버튼이 켜지는 450 ms */
    },
    submit: async function (nick) { byId['rn-nick'].value = nick; byId['rn-submit'].fire('click'); await flush(); }
  };
}
function deferred() { var d = {}; d.p = new Promise(function (r) { d.resolve = r; }); return d; }
(async function live() {
  delete process.env.RUNNER_EVENT_WEEKS;
  var core = require(path.join(ROOT, 'api/_lib/core.js'));
  var H = { seed: require(path.join(ROOT, 'api/runner/seed.js')), submit: require(path.join(ROOT, 'api/runner/submit.js')), top: require(path.join(ROOT, 'api/runner/top.js')), award: require(path.join(ROOT, 'api/runner/award.js')) };
  var T0 = Date.UTC(2026, 10, 4, 3, 0, 0);   /* 2026-11-04 12:00 KST, W45 */
  function fresh() { var h = liveHarness(T0); h.net.H = H; core.setSecret('live-test'); var mem = core.memoryStore(); core.setStore(mem); core.setClock(function () { return h.clk.t; }); h.mem = mem; return h; }

  /* #24: 열 때 찾은 황제 망토·지난 올리기를 출발(start)이 ready() 때 사본으로 덮어쓰면 안 된다 */
  var h = fresh();
  await h.mem.put(core.encodePath({ week: '2026-W44', score: 300, ticks: 1500, runId: 'aaaaaaaaaaaa', nick: 'me' }), {});
  h.setStore({ v: 1, best: 0, runs: 0, day: '', dayN: 0, last: null, net: { subs: [{ runId: 'aaaaaaaaaaaa', week: '2026-W44', score: 300, rank: 1, at: 0 }], awards: { paper_crown: ['2026-W44'], emperor_cape: [] } } });
  await h.open(); await h.readyNet();
  check(/황제 망토/.test(h.byId['rn-award'].textContent) && !h.byId['rn-award'].hidden, '열 때 지난주 망토 알림 (' + h.byId['rn-award'].textContent + ')');
  check(h.net_().awards.emperor_cape[0] === '2026-W44' && h.net_().subs[0].done === true, '망토 저장됨 (출발 전)');
  await h.runToOver();
  check(h.net_() && h.net_().awards.emperor_cape.indexOf('2026-W44') >= 0 && h.net_().subs[0].done === true, '#24 출발해도 망토·done 이 남아 있음 ' + JSON.stringify(h.net_() && h.net_().awards));
  check(h.storeObj().runs === 1 && h.storeObj().dayN === 1 && h.storeObj().last && h.storeObj().last.end === 'hit', '출발·끝 기록은 그대로 (runs 1 · dayN 1 · last)');
  /* 올리기 응답이 다음 판 준비 화면에서 오고 → 출발해도 subs 가 남는다 */
  var gate = deferred(); h.net.gate.submit = function () { return gate.p; };
  await h.submit('G');
  h.byId['rn-again'].fire('click'); await h.readyNet();
  gate.resolve(); await h.flush(); h.net.gate.submit = null;
  var subsBefore = h.net_().subs.length;
  await h.runToOver();
  check(subsBefore === 2 && h.net_().subs.length === 2 && h.net_().awards.paper_crown.indexOf('2026-W45') >= 0, '#24 준비 화면에서 받은 올리기 결과도 출발 뒤 남음 (subs ' + subsBefore + '→' + h.net_().subs.length + ')');

  /* #25: 올리는 중에 그만 → 서버가 받은 판의 runId·종이 왕관이 저장된다 */
  h = fresh(); await h.open(); await h.readyNet(); await h.runToOver();
  gate = deferred(); h.net.gate.submit = function () { return gate.p; };
  await h.submit('closer');
  h.byId['rn-stop'].fire('click');
  check(h.R.live() === null, '그만 → 창 닫힘');
  gate.resolve(); await h.flush();
  var b25 = await core.board(h.mem, '2026-W45');
  check(b25.length === 1 && h.net_() && h.net_().subs.length === 1 && h.net_().subs[0].runId === b25[0].runId && h.net_().awards.paper_crown[0] === '2026-W45', '#25 닫은 뒤 온 200 도 runId·종이 왕관 저장 ' + JSON.stringify(h.net_()));

  /* #26: 앞 판의 늦은 응답이 다음 판 결과판을 바꾸면 안 된다 */
  h = fresh(); await h.open(); await h.readyNet(); await h.runToOver();
  gate = deferred(); h.net.gate.submit = function () { return gate.p; };
  await h.submit('runA');
  h.byId['rn-again'].fire('click'); await h.readyNet(); await h.runToOver();
  check(h.R.live().state === 'over' && !h.byId['rn-net-form'].hidden && h.byId['rn-net-msg'].textContent === '', 'B 판 결과판: 올리기 칸 보임');
  gate.resolve(); await h.flush(); h.net.gate.submit = null;
  check(!h.byId['rn-net-form'].hidden && h.byId['rn-net-msg'].textContent === '' && !h.byId['rn-submit'].disabled, '#26 A 의 늦은 200 이 B 결과판을 안 바꿈 (msg "' + h.byId['rn-net-msg'].textContent + '")');
  check(h.net_().subs.length === 1, 'A 의 runId 는 저장');
  await h.submit('runB');
  check(h.byId['rn-net-form'].hidden && /^이번 주 \d+등이야!/.test(h.byId['rn-net-msg'].textContent) && h.net_().subs.length === 2, 'B 도 올라감 (' + h.byId['rn-net-msg'].textContent + ')');
  /* 늦은 실패 응답도 B 결과판을 건드리지 않는다 */
  h.byId['rn-again'].fire('click'); await h.readyNet(); await h.runToOver();
  gate = deferred(); h.net.gate.submit = function () { return gate.p; };
  await h.submit('runC'); h.byId['rn-again'].fire('click'); await h.readyNet(); await h.runToOver();
  h.net.H = Object.assign({}, H, { submit: function (req, res) { return core.send(res, 502, { ok: false, error: 'storage' }); } });
  gate.resolve(); await h.flush(); h.net.H = H; h.net.gate.submit = null;
  check(h.byId['rn-net-msg'].textContent === '' && !h.byId['rn-submit'].disabled, '#26 늦은 실패도 다음 판 결과판을 안 바꿈');

  /* #27 (클라이언트 쪽): 서버는 받았는데 응답이 8초를 넘김 → 다시 누르면 같은 결과로 200, subs 한 번만 */
  h = fresh(); await h.open(); await h.readyNet(); await h.runToOver();
  gate = deferred(); h.net.gate.submit = function () { return gate.p; };
  await h.submit('slowpoke'); await h.advance(8100);
  check(/지금은 못 올렸어/.test(h.byId['rn-net-msg'].textContent) && !h.byId['rn-submit'].disabled, '8초 넘김 → 다시 누를 수 있음');
  gate.resolve(); await h.flush(); h.net.gate.submit = null;
  check(!(h.net_() && h.net_().subs.length), '시간 넘긴 응답은 버려짐 (아직 저장 안 됨)');
  await h.submit('slowpoke');
  check(h.byId['rn-net-form'].hidden && /^이번 주 1등이야!/.test(h.byId['rn-net-msg'].textContent) && h.net_().subs.length === 1 && (await core.board(h.mem, '2026-W45')).length === 1, '#27 다시 누르면 "벌써 올렸어" 대신 같은 결과, 한 줄 (' + h.byId['rn-net-msg'].textContent + ')');

  /* #30: 준비 화면에 21분 → 출발할 때 새 토큰 → 올리기 성공. 만료(401)는 버튼을 꺼 둔다 */
  h = fresh(); await h.open(); await h.readyNet();
  var seeds0 = h.net.calls.filter(function (c) { return c === 'seed'; }).length;
  await h.advance(21 * 60000);
  h.key(' '); await h.flush();
  check(h.R.live().state === 'ready' && h.net.calls.filter(function (c) { return c === 'seed'; }).length === seeds0 + 1, '#30 오래 쉰 뒤 첫 탭 → 출발 대신 새 토큰');
  h.key(' ', 'keyup'); await h.readyNet(); await h.runToOver();
  await h.submit('fresh');
  check(/^이번 주 1등이야!/.test(h.byId['rn-net-msg'].textContent), '#30 새 토큰으로 올리기 성공 (' + h.byId['rn-net-msg'].textContent + ')');
  h.byId['rn-again'].fire('click'); await h.readyNet(); await h.runToOver();
  await h.advance(31 * 60000);
  await h.submit('late');
  check(/시간이 너무 지나서/.test(h.byId['rn-net-msg'].textContent) && h.byId['rn-submit'].disabled, '#30 401 만료 → 같은 오류로 되풀이하지 않게 버튼 꺼짐');

  /* #28 (클라이언트 쪽): final:false 응답은 done 으로 적지 않는다 → 닫힌 뒤 다시 물어 망토를 받는다 */
  var MON = Date.UTC(2026, 10, 8, 15, 5);   /* 월 00:05 KST: W45 는 아직 안 닫힘 */
  h = fresh(); h.clk.t = MON;
  await h.mem.put(core.encodePath({ week: '2026-W45', score: 300, ticks: 1500, runId: 'bbbbbbbbbbbb', nick: 'me' }), {});
  h.setStore({ v: 1, best: 0, runs: 0, day: '', dayN: 0, last: null, net: { subs: [{ runId: 'bbbbbbbbbbbb', week: '2026-W45', score: 300, rank: 1, at: 0 }], awards: { paper_crown: ['2026-W45'], emperor_cape: [] } } });
  await h.open(); await h.readyNet();
  check(!h.net_().subs[0].done && h.net_().awards.emperor_cape.length === 0 && h.byId['rn-award'].hidden, '#28 월 00:05 → final:false 라 done 아님, 망토 알림 없음');
  h.R.close(); h.clk.t = MON + 30 * 60000;
  await h.open(); await h.readyNet();
  check(h.net_().subs[0].done === true && h.net_().awards.emperor_cape[0] === '2026-W45' && /1등! 황제 망토/.test(h.byId['rn-award'].textContent), '#28 닫힌 뒤 다시 물어 망토 (' + h.byId['rn-award'].textContent + ')');
  h.R.close();

  console.log('\n' + passes + ' passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
