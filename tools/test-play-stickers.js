#!/usr/bin/env node
/* tools/test-play-stickers.js — 놀이 반응 스티커 검사: 다락방 달리기 · 헤엄 (node, 의존성 없음). 실패하면 exit 1.
 *
 *   node tools/test-play-stickers.js
 *
 * - 세트마다 그림이 있고 32×32, manifest sticker.<세트>.* = CATALOG, 움직이는 스트립 칸 0 = 정지 그림
 * - 규칙·스크립트가 고르는 스티커가 전부 CATALOG 에 있다, 같은 판 id = 같은 스티커
 * - 달리기 자동 감지 (RUNNER.live() 두 모습 견주기): 출발·점프·숙이기·이끼·빨라짐·아슬아슬·콩·새 최고·또 하기
 * - 헤엄: 끝(played) = 도착, 저절로·그만·가만히 = 둥둥 (벌 그림 없음)
 * - 시드 없는 난수 0건, 맛·취향 낱말 0건, 기록 by:'demo-rules'
 */
'use strict';
var fs = require('fs'), path = require('path'), zlib = require('zlib');
var ROOT = path.resolve(__dirname, '..');
var fails = 0, passes = 0;
function check(c, m) { if (c) passes++; else { fails++; console.error('  FAIL ' + m); } }
function fresh() {
  [require.resolve('../js/cook-stickers.js'), require.resolve('../js/play-stickers.js')].forEach(function (k) { delete require.cache[k]; });
  return require('../js/play-stickers.js');
}
function rgba(f) {
  var b = fs.readFileSync(f), w = b.readUInt32BE(16), h = b.readUInt32BE(20), i = 8, idat = [];
  while (i < b.length) { var len = b.readUInt32BE(i), t = b.toString('ascii', i + 4, i + 8); if (t === 'IDAT') idat.push(b.slice(i + 8, i + 8 + len)); i += 12 + len; }
  var raw = zlib.inflateSync(Buffer.concat(idat)), px = Buffer.alloc(w * h * 4);
  for (var y = 0; y < h; y++) raw.copy(px, y * w * 4, y * (w * 4 + 1) + 1, (y + 1) * (w * 4 + 1));
  return { w: w, h: h, px: px };
}
var man = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/manifest.json'), 'utf8'));
var M = fresh();
var SETS = { runner: M.RUNNER_STICKERS, swim: M.SWIM_STICKERS };
var ACTS = { runner: ['start', 'jump', 'duck', 'pass', 'moss', 'speed', 'over', 'best', 'again'], swim: ['start', 'flap', 'bump', 'ink', 'end', 'pickup'] };

Object.keys(SETS).forEach(function (set) {
  var S = SETS[set], ids = Object.keys(S.CATALOG);
  check(S && S.SET === set, set + ' 세트가 있다');
  check(ids.length >= 8, set + ' 8종 이상');
  var keys = Object.keys(man).filter(function (k) { return k.indexOf('sticker.' + set + '.') === 0 && !/\.anim$/.test(k); }).map(function (k) { return k.slice(9 + set.length); }).sort();
  check(JSON.stringify(keys) === JSON.stringify(ids.slice().sort()), set + ': manifest = CATALOG (' + keys.join(',') + ')');
  ids.forEach(function (id) {
    var f = path.join(ROOT, 'assets/stickers/' + set + '/' + id + '.png');
    check(fs.existsSync(f), set + '/' + id + '.png 있음'); if (!fs.existsSync(f)) return;
    var st = rgba(f); check(st.w === 32 && st.h === 32, set + '/' + id + ' 32×32');
    check(/문어 스티커$/.test(S.CATALOG[id].alt), set + '/' + id + ' 대체 글은 그림 설명');
    var n = S.CATALOG[id].anim;
    if (!n) return;
    var af = path.join(ROOT, 'assets/stickers/' + set + '/' + id + '_anim.png'), m = man['sticker.' + set + '.' + id + '.anim'];
    check(m && m.frames === n && m.w === 32 * n, set + '/' + id + ' manifest .anim 칸 ' + n);
    if (!fs.existsSync(af)) { check(false, af + ' 있음'); return; }
    var a = rgba(af), same = true, diff = false;
    check(a.w === 32 * n, set + '/' + id + '_anim 폭');
    for (var y = 0; y < 32; y++) for (var x = 0; x < 32; x++) for (var c = 0; c < 4; c++) {
      if (a.px[(y * a.w + x) * 4 + c] !== st.px[(y * 32 + x) * 4 + c]) same = false;
      if (a.px[(y * a.w + x) * 4 + c] !== a.px[(y * a.w + 32 + x) * 4 + c]) diff = true;
    }
    check(same, set + '/' + id + ' 칸 0 = 정지 그림'); check(diff, set + '/' + id + ' 칸 1 은 다르다');
    var fps = S.CATALOG[id].fps; check(fps == null || (fps >= 1 && fps <= 12), set + '/' + id + ' fps 1~12');
  });
  function picks(p) { return Array.isArray(p) ? p : [p]; }
  S.RULES.forEach(function (r, i) {
    check(ACTS[set].indexOf(r.on) >= 0, set + ' 규칙 ' + i + ' act ' + r.on);
    picks(r.pick).forEach(function (s) { check(!!S.CATALOG[s], set + ' 규칙 ' + i + ' 스티커 ' + s); });
  });
  Object.keys(S.SCRIPTS).forEach(function (k) { S.SCRIPTS[k].cues.forEach(function (r, i) { check(ACTS[set].indexOf(r.on) >= 0, set + '/' + k + ' 줄 ' + i); picks(r.pick).forEach(function (s) { check(!!S.CATALOG[s], set + '/' + k + ' 스티커 ' + s); }); }); });
});

/* 같은 판 = 같은 스티커 */
function playSwim(runId, course) {
  var S = fresh().SWIM_STICKERS, t = 0; S.mount(null, { now: function () { return (t += 1500); } });
  S.begin({ runId: runId, course: course });
  return [['start'], ['flap', 'me'], ['flap', 'me'], ['flap', 'octopus'], ['pickup'], ['bump'], ['flap', 'me'], ['flap', 'me'], ['flap', 'me'], ['flap', 'me'], ['ink', 'octopus'], ['end', null, 'played']]
    .map(function (s) { return s[0] === 'start' ? 'start:' + S.cue('flap', { who: 'me' }) : S.cue(s[0], { who: s[1], status: s[2] }); });
}
[null, 'reef', 'kelp'].forEach(function (c) {
  var a = playSwim('s1', c), b = playSwim('s1', c);
  check(JSON.stringify(a) === JSON.stringify(b), '헤엄 ' + (c || '공통') + ': 같은 판 → 같은 스티커 ' + a.join(','));
  check(a.filter(Boolean).length >= 4, '헤엄 ' + (c || '공통') + ': 4장 이상');
});
(function () {
  var S = fresh().SWIM_STICKERS; S.mount(null, { now: function () { return 1; } }); S.begin({ runId: 'e' });
  check(S.cue('end', { status: 'played' }) === 'arrive', '헤엄 끝 played → 도착');
  ['auto', 'cut', 'still'].forEach(function (st) { var T = fresh().SWIM_STICKERS; T.mount(null, { now: function () { return 1; } }); T.begin({ runId: st }); check(T.cue('end', { status: st }) === 'float', '헤엄 끝 ' + st + ' → 둥둥 (벌 없음)'); });
  check(S.cue('ink', { who: 'octopus' }) === 'jet', '먹물 → 쓩 (틈 무시)');
  check(S.log().every(function (e) { return e.by === 'demo-rules' && e.set === 'swim'; }), '헤엄 기록 by:demo-rules');
})();

/* 달리기 자동 감지 */
(function () {
  var R = fresh().RUNNER_STICKERS, t = 0; R.mount(null, { now: function () { return (t += 2000); } });
  function F(o) { return Object.assign({ state: 'run', ground: true, moss: 0, speed: 320, inputs: [], obs: [], seed: 9, y: 0, score: 0 }, o); }
  var seq = [
    F({ state: 'ready' }),
    F({}),                                                                    /* 출발 */
    F({ obs: [{ k: 'crate', x: 48, w: 12 }] }),
    F({ ground: false, y: 10 * 256, inputs: [{ t: 3, a: 'jd' }], obs: [{ k: 'crate', x: 36, w: 12 }] }),   /* 점프 · 틈 1px */
    F({ ground: false, y: 12 * 256, inputs: [{ t: 3, a: 'jd' }], obs: [{ k: 'crate', x: 20, w: 12 }], moss: 1, speed: 450 }),   /* 지나감 · 이끼 · 빨라짐 */
    F({ inputs: [{ t: 3, a: 'jd' }, { t: 9, a: 'dd' }], moss: 1, speed: 450 }),   /* 숙이기 */
    F({ state: 'over', moss: 1, speed: 450, score: 230 }),                     /* 콩 · 새 최고 */
    F({ state: 'ready', moss: 0 })                                             /* 또 하기 */
  ];
  R._reset(0);
  var acts = [], prev = null;
  seq.forEach(function (cur, i) { var d = R._diff(prev, cur); if (i === 1) R._reset(100); d.forEach(function (e) { acts.push(e[0] + (e[1].clear != null ? '(' + e[1].clear + ')' : '')); }); prev = cur; });
  var want = ['start', 'jump', 'moss', 'speed', 'duck', 'pass(1)', 'over', 'best', 'again'];
  check(JSON.stringify(acts) === JSON.stringify(want), '달리기 감지 순서 ' + acts.join(' ') + ' (기대 ' + want.join(' ') + ')');
  check(R.cue('pass', { clear: 1 }) !== undefined, 'pass 부르기');
  var R2 = fresh().RUNNER_STICKERS; R2.mount(null, { now: function () { return 5; } }); R2.begin({ runId: 'b' });
  check(R2.cue('over', {}) === 'bonk', '콩 → 어질 (틈 무시)');
  check(R2.cue('best', {}) === 'trophy', '새 최고 → 트로피 (틈 무시)');
  check(R2.cue('speed', { level: 1 }) === 'fire', '빨라짐 → 활활');
  check(R2.cue('pass', { clear: 9 }) === null, '넉넉히 지나가면 안 띄움 (atMost)');
  /* 첫 판은 '새 최고' 라고 하지 않는다 (견줄 기록이 없다) */
  R2._reset(0); var d0 = R2._diff(F({ state: 'run' }), F({ state: 'over', score: 50 }));
  check(d0.map(function (e) { return e[0]; }).join() === 'over', '첫 판 끝 = 콩만');
  /* 같은 판 = 같은 스티커 */
  function play(id) { var Q = fresh().RUNNER_STICKERS, tt = 0; Q.mount(null, { now: function () { return (tt += 2000); } }); Q.begin({ runId: id }); return ['start', 'jump', 'jump', 'duck', 'moss', 'jump', 'jump', 'jump', 'jump', 'jump', 'jump', 'over', 'again'].map(function (a) { return Q.cue(a, {}); }); }
  check(JSON.stringify(play('x')) === JSON.stringify(play('x')), '달리기: 같은 판 → 같은 스티커 ' + play('x').join(','));
})();

var src = ['js/play-stickers.js', 'js/cook-stickers.js', 'tools/ui-art/runner-stickers.js', 'tools/ui-art/swim-stickers.js', 'tools/ui-art/sticker-kit.js'].map(function (f) { return fs.readFileSync(path.join(ROOT, f), 'utf8'); }).join('\n');
check(!/Math\.random/.test(src), 'Math.random 0건');
check(!/맛있|좋아해|게임 ?오버|실패했/.test(src), "'맛있'·'좋아해'·'게임 오버'·'실패했' 0건");

console.log('test-play-stickers: ' + passes + ' ok' + (fails ? ', ' + fails + ' FAIL' : ''));
process.exit(fails ? 1 : 0);
