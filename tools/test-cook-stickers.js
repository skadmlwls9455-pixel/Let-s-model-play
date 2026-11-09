#!/usr/bin/env node
/* tools/test-cook-stickers.js — 요리 반응 스티커 검사 (node, 의존성 없음). 실패하면 exit 1.
 *
 *   node tools/test-cook-stickers.js
 *
 * - 그림이 있고 32×32 PNG, manifest 의 sticker.cook.* 와 CATALOG 가 같다
 * - 움직이는 스티커(anim)는 스트립이 칸 수만큼 넓고, 칸 0 이 정지 그림과 픽셀까지 같다
 * - 공통 규칙·요리 스크립트가 고르는 스티커가 전부 CATALOG 에 있다
 * - 같은 판 id + 같은 순간 순서 = 같은 스티커 (시드), Math.random 0건, 맛·취향 낱말 0건
 * - 큰 순간(가득·완성·차리기)은 쉬는 틈과 상관없이 뜬다, 요리 스크립트가 공통 규칙보다 먼저다
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
var ACTS = ['start', 'drop', 'merge', 'full', 'done', 'serve', 'eat', 'idle'];
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

/* 같은 판 = 같은 결과 (시계는 주입) */
var SEQ = [['start', {}], ['drop', { ingredient: 'seaweed' }], ['drop', { ingredient: 'scallop' }], ['merge', { tier: 2 }], ['drop', {}], ['merge', { tier: 3 }],
  ['drop', {}], ['merge', { tier: 4 }], ['merge', { tier: 5 }], ['full', {}], ['done', { reason: 'full' }], ['serve', {}], ['eat', {}], ['idle', {}], ['idle', {}]];
function play(runId, recipe, step) {
  var M = fresh(), t = 0; M.mount(null, { now: function () { return (t += step); } });
  M.begin({ runId: runId, recipe: recipe });
  return SEQ.map(function (s) { return s[0] === 'start' ? 'start:' + M.cue('drop', {}) : M.cue(s[0], s[1]); });
}
Object.keys(C.RECIPES).concat([null]).forEach(function (rec) {
  var a = play('run-a', rec, 1000), b = play('run-a', rec, 1000);
  check(JSON.stringify(a) === JSON.stringify(b), (rec || '공통') + ': 같은 판 id → 같은 스티커 ' + a.join(','));
  check(a.filter(Boolean).length >= 4, (rec || '공통') + ': 한 판에 4장 이상 뜬다');
});
var diff = 0; for (var n = 0; n < 12; n++) if (JSON.stringify(play('r' + n, null, 1000)) !== JSON.stringify(play('s' + n, null, 1000))) diff++;
check(diff > 0, '판 id 가 다르면 가끔은 다르게 나온다');

/* 큰 순간은 틈 무시 (시계가 안 흘러도) */
(function () {
  var M = fresh(); M.mount(null, { now: function () { return 5; } }); M.begin({ runId: 'z' });
  M.cue('drop', {});
  check(M.cue('full', {}) === 'sweat', '가득 → 진땀 (틈 무시)');
  check(!!M.cue('done', { reason: 'full' }), '완성은 틈 무시');
  check(M.cue('serve', {}) === 'heart_plate', '차리기 → 한 접시');
  check(M.log().every(function (e) { return e.by === 'demo-rules'; }), '기록은 by:demo-rules');
})();
/* 요리 스크립트가 공통 규칙보다 먼저: 해물 파전 merge tier 4 → 깜짝 */
(function () {
  var M = fresh(), t = 0; M.mount(null, { now: function () { return (t += 5000); } }); M.begin({ runId: 'p', recipe: 'seafood_pancake' });
  check(M.cue('merge', { tier: 4 }) === 'shock', '해물 파전 4단계 → 깜짝');
  var e = M.log().pop(); check(e && e.from === 'recipe:seafood_pancake', '출처 recipe 로 기록');
  /* done 의 dish.id 로 요리가 정해진다 */
  var N = fresh(); N.mount(null, { now: function () { return (t += 5000); } }); N.begin({ runId: 'q' });
  check(N.cue('done', { dish: { id: 'clam_soup' } }) === 'moved', 'done dish.id=조개탕 → 감동');
  check(N.current().recipe === 'clam_soup', '요리가 조개탕으로 정해짐');
  check(N.cue('bogus', {}) === null && N.cue(null) === null, '모르는 act 는 조용히 null');
})();

var src = fs.readFileSync(path.join(ROOT, 'js/cook-stickers.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'tools/ui-art/cook-stickers.js'), 'utf8');
check(!/Math\.random/.test(src), 'Math.random 0건');
check(!/맛있|좋아해/.test(src), "'맛있'·'좋아해' 0건");

console.log('test-cook-stickers: ' + passes + ' ok' + (fails ? ', ' + fails + ' FAIL' : ''));
process.exit(fails ? 1 : 0);
