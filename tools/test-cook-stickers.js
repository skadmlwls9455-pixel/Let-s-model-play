#!/usr/bin/env node
/* tools/test-cook-stickers.js — 요리 반응 스티커 검사 (node, 의존성 없음). 실패하면 exit 1.
 *
 *   node tools/test-cook-stickers.js
 *
 * - 그림이 있고 32×32 PNG, manifest 의 sticker.cook.* 와 CATALOG 가 같다
 * - 움직이는 스티커(anim)는 스트립이 칸 수만큼 넓고, 칸 0 이 정지 그림과 픽셀까지 같다
 * - 공통 규칙·요리 스크립트가 고르는 스티커가 전부 CATALOG 에 있다
 * - 같은 판 id + 같은 순간 순서 = 같은 스티커 (시드), Math.random 0건, 맛·취향 낱말 0건
 * - 순간 이름은 진짜 부엌 놀이(js/cook.js)의 소리 act 그대로: pick·tap·sizzle·flip·cut·step·done
 * - 큰 순간(고름·뒤집음·접시·차리기)은 쉬는 틈과 상관없이 뜬다, 요리 스크립트(해초전)가 공통 규칙보다 먼저다
 * - listenAudio: 소리 훅을 감싸 듣되 원래 소리는 그대로
 * - 기록은 by:'demo-rules'
 */
'use strict';
var fs = require('fs'), path = require('path');
var ROOT = path.resolve(__dirname, '..');
var fails = 0, passes = 0;
function check(c, m) { if (c) passes++; else { fails++; console.error('  FAIL ' + m); } }
function fresh() { delete require.cache[require.resolve('../js/cook-stickers.js')]; return require('../js/cook-stickers.js'); }

var C = fresh(), ids = Object.keys(C.CATALOG);
var man = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/manifest.json'), 'utf8'));
var keys = Object.keys(man).filter(function (k) { return /^sticker\.cook\./.test(k) && !/\.anim$/.test(k); }).map(function (k) { return k.slice(13); }).sort();
check(ids.length >= 12, '스티커가 12종 이상');
check(JSON.stringify(keys) === JSON.stringify(ids.slice().sort()), 'manifest sticker.cook.* = CATALOG (' + keys.join(',') + ')');
ids.forEach(function (id) {
  var f = path.join(ROOT, 'assets/stickers/cook/' + id + '.png');
  check(fs.existsSync(f), id + '.png 있음');
  if (!fs.existsSync(f)) return;
  var b = fs.readFileSync(f);
  check(b.readUInt32BE(16) === 32 && b.readUInt32BE(20) === 32, id + '.png 32×32');
  check(/요리사 문어 스티커$/.test(C.CATALOG[id].alt), id + ' 대체 글은 그림 설명');
});

/* 움직이는 스티커: 스트립 = 칸 수 × 32, 칸 0 = 정지 그림 */
function rgba(f) {   /* make-stickers.js 가 쓴 PNG (RGBA 8bit, 필터 0) 만 읽는다 */
  var b = fs.readFileSync(f), w = b.readUInt32BE(16), h = b.readUInt32BE(20), i = 8, idat = [];
  while (i < b.length) { var len = b.readUInt32BE(i), t = b.toString('ascii', i + 4, i + 8); if (t === 'IDAT') idat.push(b.slice(i + 8, i + 8 + len)); i += 12 + len; }
  var raw = require('zlib').inflateSync(Buffer.concat(idat)), px = Buffer.alloc(w * h * 4);
  for (var y = 0; y < h; y++) raw.copy(px, y * w * 4, y * (w * 4 + 1) + 1, (y + 1) * (w * 4 + 1));
  return { w: w, h: h, px: px };
}
var animated = ids.filter(function (id) { return C.CATALOG[id].anim; });
['clap', 'stir', 'sleepy', 'ink', 'cheer', 'flush'].forEach(function (id) { check(animated.indexOf(id) >= 0, id + ' 는 움직이는 스티커'); });
animated.forEach(function (id) { var f = C.CATALOG[id].fps; check(f == null || (f >= 1 && f <= 12), id + ' fps 1~12'); });
animated.forEach(function (id) {
  var n = C.CATALOG[id].anim, m = man['sticker.cook.' + id + '.anim'], f = path.join(ROOT, 'assets/stickers/cook/' + id + '_anim.png');
  check(m && m.frames === n && m.cell === 32 && m.w === 32 * n, id + ' manifest .anim 칸 ' + n);
  if (!fs.existsSync(f)) { check(false, id + '_anim.png 있음'); return; }
  var a = rgba(f), st = rgba(path.join(ROOT, 'assets/stickers/cook/' + id + '.png')), same = true, diff = false;
  check(a.w === 32 * n && a.h === 32, id + '_anim.png ' + (32 * n) + '×32');
  for (var y = 0; y < 32; y++) for (var x = 0; x < 32; x++) for (var c = 0; c < 4; c++) {
    if (a.px[(y * a.w + x) * 4 + c] !== st.px[(y * 32 + x) * 4 + c]) same = false;
    if (a.px[(y * a.w + x) * 4 + c] !== a.px[(y * a.w + 32 + x) * 4 + c]) diff = true;
  }
  check(same, id + ' 칸 0 = 정지 그림 (모션 줄이기·폴백이 같은 그림)');
  check(diff, id + ' 칸 1 은 칸 0 과 다르다');
});

function picks(p) { return Array.isArray(p) ? p : [p]; }
var ACTS = ['pick', 'tap', 'sizzle', 'flip', 'cut', 'step', 'done', 'stir', 'simmer', 'place', 'serve', 'eat', 'idle'];
C.RULES.forEach(function (r, i) {
  check(ACTS.indexOf(r.on) >= 0, '공통 규칙 ' + i + ' act ' + r.on);
  picks(r.pick).forEach(function (s) { check(!!C.CATALOG[s], '공통 규칙 ' + i + ' 스티커 ' + s); });
});
Object.keys(C.RECIPES).forEach(function (id) {
  var rec = C.RECIPES[id];
  check(typeof rec.name === 'string' && rec.cues.length > 0, id + ' 이름·줄');
  rec.cues.forEach(function (r, i) {
    check(ACTS.indexOf(r.on) >= 0, id + ' 줄 ' + i + ' act ' + r.on);
    picks(r.pick).forEach(function (s) { check(!!C.CATALOG[s], id + ' 줄 ' + i + ' 스티커 ' + s); });
  });
});

/* 같은 판 = 같은 결과 (시계는 주입). 순간은 진짜 부엌 놀이가 보내는 차례 그대로 (COOK_PROTO §8): 고름 → 톡톡 9 → 불 → 굽기 → 뒤집음 → 썰기 2 → 접시 */
var SEQ = [['pick', { dish: 'jeon' }]].concat([0, 1, 2, 3, 4, 5, 6, 7, 8].map(function (i) { return ['tap', { i: i }]; }),
  [['step', { kind: 'tap' }], ['quiet', {}], ['sizzle', { band: 0 }], ['sizzle', { band: 1 }], ['flip', { band: 1 }], ['step', { kind: 'flip' }], ['quiet', {}],
    ['cut', { i: 0 }], ['cut', { i: 1 }], ['step', { kind: 'slice' }], ['done', { dish: 'jeon' }], ['serve', {}], ['eat', {}], ['idle', {}], ['idle', {}]]);
function play(runId, withRecipe, step) {
  var M = fresh(), t = 0; M.mount(null, { now: function () { return (t += step); } });
  M.begin({ runId: runId });
  return SEQ.map(function (s) { var d = Object.assign({}, s[1]); if (!withRecipe) delete d.dish; return s[0] === 'pick' && !withRecipe ? M.cue('tap', { i: -1 }) : M.cue(s[0], d); });
}
[true, false].forEach(function (rec) {
  var a = play('run-a', rec, 1000), b = play('run-a', rec, 1000);
  check(JSON.stringify(a) === JSON.stringify(b), (rec ? '해초전' : '공통') + ': 같은 판 id → 같은 스티커 ' + a.join(','));
  check(a.filter(Boolean).length >= 5, (rec ? '해초전' : '공통') + ': 한 판에 5장 이상 뜬다');
});
var diff = 0; for (var n = 0; n < 12; n++) if (JSON.stringify(play('r' + n, false, 1000)) !== JSON.stringify(play('s' + n, false, 1000))) diff++;
check(diff > 0, '판 id 가 다르면 가끔은 다르게 나온다');
check(ACTS.indexOf('quiet') < 0 && C.RULES.every(function (r) { return r.on !== 'quiet'; }), 'quiet 에는 스티커가 없다');

/* 큰 순간은 틈 무시 (시계가 안 흘러도) */
(function () {
  var M = fresh(); M.mount(null, { now: function () { return 5; } });
  check(M.cue('pick', { dish: 'jeon' }) === 'peek', '소품 고름 → 빼꼼 (새 판)');
  check(M.current().recipe === 'jeon', 'pick 의 dish 로 요리가 해초전으로 정해짐');
  check(!!M.cue('flip', { band: 2 }), '뒤집음은 틈 무시 (어느 굽기든)');
  var d = M.cue('done', { dish: 'jeon' }); check(d === 'heart_plate' || d === 'star', '접시 공개 → 한 접시·다 됐다 (' + d + ')');
  check(M.cue('serve', {}) === 'heart_plate', '차리기 → 한 접시');
  check(M.log().every(function (e) { return e.by === 'demo-rules'; }), '기록은 by:demo-rules');
  var id1 = M.current().id; M.cue('pick', { dish: 'jeon' }); check(M.current().id !== id1 && M.current().fired === 1, '다시 고르면 새 판');
})();
/* 요리 스크립트가 공통 규칙보다 먼저: 해초전 톡톡 마지막(i 8) → 짝짝 · 썰기 둘째 줄 → 따봉 */
(function () {
  var M = fresh(), t = 0; M.mount(null, { now: function () { return (t += 5000); } }); M.begin({ runId: 'p', recipe: 'jeon' });
  check(M.cue('tap', { i: 8 }) === 'clap', '해초전 톡톡 끝 → 짝짝');
  var e = M.log().pop(); check(e && e.from === 'recipe:jeon', '출처 recipe 로 기록');
  check(M.cue('cut', { i: 1 }) === 'thumbs', '해초전 다 썲 → 따봉');
  var N = fresh(); N.mount(null, { now: function () { return (t += 5000); } }); N.begin({ runId: 'q' });
  check(N.cue('tap', { i: 8 }) === null, '요리가 안 정해졌으면 그 줄은 없다');
  N.cue('done', { dish: { id: 'jeon' } }); check(N.current().recipe === 'jeon', 'done 의 dish 가 { id } 꼴이어도 정해진다');
  check(N.cue('bogus', {}) === null && N.cue(null) === null && N.cue('quiet', {}) === null, '모르는 act · quiet 는 조용히 null');
  /* 굽기는 맞고 틀림이 아니다: 어느 굽기에도 뒤집으면 같은 묶음에서 */
  [0, 1, 2].forEach(function (b) { var Q = fresh(); Q.mount(null, { now: function () { return 1; } }); Q.begin({ runId: 'band', recipe: 'jeon' }); var r = Q.cue('flip', { band: b }); check(r === 'cheer' || r === 'shock', '굽기 ' + b + ' 에 뒤집음 → ' + r); });
})();
/* 소리 훅 듣기 (cook.js 를 안 고친다) */
(function () {
  var calls = [], M = fresh();
  global.window = { AUDIO: { on: function (n, d) { calls.push(n + ':' + (d && d.act)); return 'orig'; } } }; global.document = { querySelector: function () { return null; } };
  M.mount(null, { now: function () { return 1; } });
  check(M.listenAudio() === true && M.listenAudio() === true, 'listenAudio 는 한 번만 감싼다');
  var ret = window.AUDIO.on('cook', { act: 'pick', dish: 'jeon' }); window.AUDIO.on('state', { v: 1 }); window.AUDIO.on('cook', { act: 'quiet' });
  check(ret === 'orig' && calls.join() === 'cook:pick,state:undefined,cook:quiet', '원래 소리 함수는 그대로 불린다 (' + calls.join() + ')');
  check(M.log().length === 1 && M.log()[0].sticker === 'peek', "'cook' 만 듣고 스티커를 낸다");
  delete global.window; delete global.document;
  check(fresh().listenAudio() === false, 'AUDIO 가 없으면 false');
})();

var src = fs.readFileSync(path.join(ROOT, 'js/cook-stickers.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'tools/ui-art/cook-stickers.js'), 'utf8');
check(!/Math\.random/.test(src), 'Math.random 0건');
check(!/맛있|좋아해/.test(src), "'맛있'·'좋아해' 0건");

console.log('test-cook-stickers: ' + passes + ' ok' + (fails ? ', ' + fails + ' FAIL' : ''));
process.exit(fails ? 1 : 0);
