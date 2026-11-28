#!/usr/bin/env node
/* tools/test-cafe.js - 카페 규칙 (js/cafe.js) 과 레코드 음표 (js/cafe-music.js) 시험. node 만, 의존성 없음. 실패하면 exit 1.
 *
 *   node tools/test-cafe.js          (-v: 통과한 검사도 한 줄씩 · --wav <폴더>: 곡마다 WAV 로 구워 둔다 — 귀로 들어 볼 때)
 *
 *   1 불러오기: DOM · 시계 · 난수 없음
 *   2 메뉴와 값 (커피 2 · 딸기 케이크 5 · 과일 꼬치 4), 글에 기호 · 마음 말 없음
 *   3 주문: 모자라면 아무것도 안 바뀜, 먹던 것이 있으면 새로 못 시킴
 *   4 먹기: 세 번 톡 → 다 먹은 수 +1, 커피도 세 모금
 *   5 레시피 선물: 세 번째에 꼭 한 번 (여기 규칙 · recipeEat 대역 둘 다), 점 셋
 *   6 normalize: 모르는 값 지킴, 멱등 · leave · played · merge
 *   7 그림: 줄 길이 · 재킷 여덟 장이 서로 다름
 *   8 음표: 곡 여덟, 원본 MIDI 와 음 하나하나 같음, 음역 · 조성 · 길이 30~60초, 자료가 최신
 */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm');
var ROOT = path.resolve(__dirname, '..');
var VERBOSE = process.argv.indexOf('-v') >= 0, WAV = process.argv.indexOf('--wav') >= 0 ? process.argv[process.argv.indexOf('--wav') + 1] : null;
var passes = 0, failures = 0;
function check(c, msg) { if (c) { passes++; if (VERBOSE) console.log('  ok   ' + msg); } else { failures++; console.log('  FAIL ' + msg); } }
function loadBare(file, name) {   /* 전역 하나만 있는 빈 맥락: Date · Math.random · document 를 쓰면 던진다 */
  var src = fs.readFileSync(path.join(ROOT, 'js', file), 'utf8');
  var sb = { Uint8ClampedArray: Uint8ClampedArray, Math: Object.create(Math), setTimeout: function () {}, setInterval: function () {}, clearInterval: function () {} };
  sb.Math.random = function () { throw new Error('Math.random'); };
  sb.Date = function () { throw new Error('Date'); };
  vm.runInNewContext(src + '\n;this.__out = ' + name + ';', sb, { filename: file });
  return { api: sb.__out, src: src };
}

console.log('== 1. 불러오기');
var L = loadBare('cafe.js', 'CAFE'), CAFE = L.api, LM = loadBare('cafe-music.js', 'CAFE_MUSIC'), MUSIC = LM.api;
check(CAFE && typeof CAFE.order === 'function', 'CAFE 전역');
check(MUSIC && typeof MUSIC.play === 'function', 'CAFE_MUSIC 전역 (node: 자료와 순수 함수)');
check(!/document\.|localStorage|new Date|Date\.now|Math\.random/.test(L.src), 'cafe.js: DOM · 시계 · 저장소 · 난수 없음');
check(!/fetch\(|audio\/|foley\/|new Audio\b|Math\.random/.test(LM.src.replace(/\/\*[\s\S]*?\*\//g, '')), 'cafe-music.js: 파일 요청 · 난수 없음');

console.log('== 2. 메뉴');
var price = {}; CAFE.MENU.forEach(function (m) { price[m.id] = m.price; });
check(CAFE.MENU.length === 3 && price.coffee === 2 && price.cake === 5 && price.kkochi === 4, '값: 커피 2 · 딸기 케이크 5 · 과일 꼬치 4');
check(CAFE.item('cake').recipe === 'cake' && CAFE.item('kkochi').recipe === 'kkochi2' && CAFE.item('coffee').recipe === null, '레시피 id (계약 C3)');
check(CAFE.item('cake').name === '딸기 케이크' && CAFE.item('kkochi').name === '과일 꼬치', '이름 (계약 C2)');
var words = CAFE.MENU.map(function (m) { return m.name; }).concat(MUSIC.list().map(function (t) { return t.name + ' ' + t.by; })).join(' ');
check(/^[가-힣0-9 ]+$/.test(words), '글: 한글 · 숫자뿐');
check(!/좋|맛있|싶|기분|재미|충분|고마|기대/.test(words), '글: 마음 말 없음');

console.log('== 3. 주문');
var c = CAFE.normalize(undefined), r;
r = CAFE.order(c, 'cake', 4, '2026-11-21'); check(!r.ok && r.why === 'short' && r.miss === 1 && c.tray === null, '조개 4 로 케이크: 1 모자람, 쟁반 그대로');
r = CAFE.order(c, 'nope', 99, '2026-11-21'); check(!r.ok && r.why === 'unknown', '없는 메뉴');
r = CAFE.order(c, 'cake', 5, '2026-11-21'); check(r.ok && r.cost === 5 && c.tray.id === 'cake' && c.tray.left === 3, '조개 5 로 케이크: 쟁반에 세 입');
r = CAFE.order(c, 'coffee', 99, '2026-11-21'); check(!r.ok && r.why === 'busy', '먹던 것이 있으면 새로 못 시킴');

console.log('== 4. 먹기');
r = CAFE.bite(c); check(r.ok && !r.done && r.left === 2, '한 입: 둘 남음');
r = CAFE.bite(c); check(r.ok && !r.done && r.left === 1, '두 입');
r = CAFE.bite(c); check(r.ok && r.done && r.n === 1 && c.eaten.cake === 1, '세 입: 다 먹은 수 1');
r = CAFE.bite(c); check(!r.ok && c.eaten.cake === 1, '빈 접시는 더 안 먹힘');
CAFE.leave(c); check(c.tray === null, '일어나면 빈 접시는 치움');
CAFE.order(c, 'coffee', 2, '2026-11-21'); check(c.tray.id === 'coffee' && c.tray.left === 3 && CAFE.item('coffee').drink === true, '커피: 세 모금');
CAFE.bite(c); CAFE.leave(c); check(c.tray && c.tray.left === 2, '마시다 만 커피는 남는다');
CAFE.bite(c); var cf = CAFE.bite(c); CAFE.leave(c); check(cf.done && c.eaten.coffee === 1 && c.tray === null && CAFE.dots(c, 'coffee') === -1 && !CAFE.giftDue(c, 'coffee'), '커피 다 마심: 센다 · 레시피 · 도장은 없음');
CAFE.order(c, 'kkochi', 4, '2026-11-21'); CAFE.bite(c); CAFE.leave(c); check(c.tray && c.tray.left === 2 && CAFE.pending(c), '먹다 만 꼬치는 남는다');
CAFE.bite(c); CAFE.bite(c); CAFE.leave(c);

console.log('== 5. 레시피 선물');
function eatWhole(st, id) { CAFE.order(st, id, 99, '2026-11-22'); var x; for (var i = 0; i < 3; i++) x = CAFE.bite(st); CAFE.leave(st); return x; }
check(CAFE.dots(c, 'cake') === 1 && CAFE.dots(c, 'coffee') === -1, '점: 케이크 하나 · 커피는 없음');
check(!CAFE.giftDue(c, 'cake'), '한 번: 선물 아님');
eatWhole(c, 'cake'); check(!CAFE.giftDue(c, 'cake') && CAFE.dots(c, 'cake') === 2, '두 번: 선물 아님, 점 둘');
eatWhole(c, 'cake'); check(CAFE.giftDue(c, 'cake') && CAFE.dots(c, 'cake') === 3, '세 번: 선물');
check(CAFE.giftMark(c, 'cake', '2026-11-22') && c.gifts.cake === '2026-11-22', '받은 날 기록');
check(!CAFE.giftDue(c, 'cake') && !CAFE.giftMark(c, 'cake', '2026-11-23'), '다시는 안 줌');
eatWhole(c, 'cake'); check(!CAFE.giftDue(c, 'cake') && c.eaten.cake === 4 && CAFE.dots(c, 'cake') === 3, '네 번째: 선물 없음, 점은 셋 그대로');
check(!CAFE.giftDue(c, 'kkochi') && c.eaten.kkochi === 1, '꼬치는 따로 센다');
/* recipeEat 대역 (계약 C3): n 이 3 이 되고 잠겨 있던 레시피일 때 꼭 한 번 gift */
var rec = {}; function recipeEat(id) { var x = rec[id] || (rec[id] = { n: 0, got: null }); x.n++; var g = x.n === 3 && !x.got; if (g) x.got = '2026-11-22'; return { n: x.n, gift: g }; }
var c2 = CAFE.normalize({}), gifts = 0;
for (var k = 0; k < 5; k++) { var b = eatWhole(c2, 'kkochi'); if (b.done && recipeEat(b.item.recipe).gift) { gifts++; CAFE.giftMark(c2, 'kkochi', '2026-11-22'); } }
check(gifts === 1 && rec.kkochi2.n === 5 && c2.eaten.kkochi === 5, 'recipeEat 대역: 다섯 번 먹어도 선물은 한 번');

console.log('== 6. 기록');
var odd = { v: 9, eaten: { cake: 2, pie: 7, bad: -3 }, tray: { id: 'pie', left: 2, day: 'x' }, gifts: { tart: '2027-01-01' }, lp: { clair: 2 }, later: { a: 1 } };
var n1 = CAFE.normalize(odd), j1 = JSON.stringify(n1);
check(n1.v === 9 && n1.eaten.pie === 7 && n1.gifts.tart === '2027-01-01' && n1.later.a === 1 && n1.tray.id === 'pie', '모르는 메뉴 · 칸 · 판 번호를 지킨다');
check(n1.eaten.bad === 0 && n1.tray.day === null, '음수 · 이상한 날짜만 고친다');
check(JSON.stringify(CAFE.normalize(n1)) === j1, '멱등');
check(JSON.stringify(CAFE.normalize(JSON.parse(j1))) === j1, 'JSON 왕복 (내보내기 · 불러오기)');
check(CAFE.normalize('x').tray === null && CAFE.normalize({ tray: 3 }).tray === null, '객체가 아닌 것은 빈 기록');
var lt = CAFE.normalize({ tray: { id: 'tea', left: 2, day: '2026-11-20', extra: 1 } }); CAFE.leave(lt); check(lt.tray && lt.tray.id === 'tea', '모르는 메뉴의 쟁반: 일어나도 그대로');
CAFE.order(lt, 'coffee', 9, '2026-11-21'); CAFE.leave(lt); check(lt.tray && lt.tray.id === 'coffee' && lt.held.length === 1 && lt.held[0].id === 'tea' && lt.held[0].extra === 1, '모르는 메뉴의 쟁반: 새로 시키면 옆 (held) 에 둔다 — 지우지 않는다');
CAFE.played(n1, 'clair'); CAFE.played(n1, 'elise'); check(n1.lp.clair === 3 && n1.lp.elise === 1, '튼 레코드 수');
var m = CAFE.merge({ eaten: { cake: 1 }, gifts: { cake: '2026-11-25' }, lp: { clair: 1 } }, { eaten: { cake: 3, kkochi: 2 }, gifts: { cake: '2026-11-22', kkochi2: '2026-11-23' }, lp: { elise: 4 }, tray: { id: 'cake', left: 1, day: '2026-11-22' }, later: 5 });
check(m.eaten.cake === 3 && m.eaten.kkochi === 2 && m.lp.clair === 1 && m.lp.elise === 4, 'merge: 센 것은 큰 쪽');
check(m.gifts.cake === '2026-11-22' && m.gifts.kkochi2 === '2026-11-23' && m.tray.left === 1 && m.later === 5, 'merge: 선물 합집합 (이른 날) · 쟁반 · 모르는 칸');

/* 두 탭 (adoptRemote 길): 이 탭이 센 것이 다른 탭의 옛 저장에 덮이지 않는다 · 쟁반은 받은 쪽 것 */
var mineTab = { eaten: { cake: 3 }, gifts: { cake: '2026-11-21' }, lp: { clair: 2 }, tray: { id: 'cake', left: 1, day: '2026-11-21' } };
var otherTab = { eaten: { cake: 2, kkochi: 1 }, gifts: {}, lp: { elise: 1 }, tray: null };
var ad = CAFE.adopt(mineTab, otherTab);
check(ad.eaten.cake === 3 && ad.gifts.cake === '2026-11-21' && ad.lp.clair === 2, 'adopt: 이 탭에서 센 수 · 받은 선물 · 튼 수가 남는다');
check(ad.eaten.kkochi === 1 && ad.lp.elise === 1, 'adopt: 다른 탭에서 센 것도 남는다');
check(ad.tray === null, 'adopt: 쟁반은 받은 쪽 것 (다른 탭에서 다 먹은 접시를 되살리지 않는다)');
check(mineTab.eaten.cake === 3 && otherTab.eaten.cake === 2 && otherTab.lp.clair === undefined, 'adopt: 넘겨받은 둘을 고치지 않는다');
check(CAFE.adopt(mineTab, undefined).tray.left === 1 && CAFE.adopt(mineTab, undefined).eaten.cake === 3, 'adopt: 받은 쪽에 카페 기록이 없으면 (옛 빌드 탭) 이 탭 것을 지킨다');
check(CAFE.adopt(undefined, otherTab).eaten.cake === 2, 'adopt: 이 탭에 기록이 없으면 받은 것 그대로');
check(JSON.stringify(CAFE.adopt(ad, ad)) === JSON.stringify(CAFE.normalize(JSON.parse(JSON.stringify(ad)))), 'adopt: 같은 것끼리는 그대로 (멱등)');

console.log('== 7. 그림');
['coffee', 'cake', 'kkochi', 'card', 'speaker', 'mute'].forEach(function (id) { var a = CAFE.art(id); check(a && a.d.length === a.w * a.h * 4 && a.w >= 11, '그림 ' + id + ' ' + (a && a.w + 'x' + a.h)); });
var sl = {}; for (var i = 0; i < CAFE.SLEEVE_N; i++) { var s = CAFE.sleeve(i); sl[Buffer.from(s.d).toString('base64')] = 1; }
check(CAFE.SLEEVE_N === 8 && Object.keys(sl).length === 8, '재킷 여덟 장이 서로 다름');

console.log('== 8. 음표');
var BUILD = require('./build-cafe-music.js'), MIDI = require('./cafe-midi.js');
var KEYS = { lullaby: [0, 2, 4, 5, 7, 9, 11], prelude: [0, 2, 4, 5, 7, 9, 11] };   /* 조성이 뚜렷한 두 곡: 다장조 음계 밖의 음 비율을 본다 */
check(MUSIC.list().length === 8 && BUILD.SPEC.length === 8, '곡 여덟');
check(MUSIC.list().length === CAFE.SLEEVE_N, '재킷 수 = 곡 수');
BUILD.SPEC.forEach(function (sp) {
  var t = MUSIC.tune(sp.id), ex = BUILD.excerpt(sp), src = MIDI.parse(path.join(ROOT, 'wip', 'round7', 'cafe-src', sp.file));
  var flat = []; ex.notes.forEach(function (x) { flat.push(x[0], x[1], x[2], x[3]); });
  check(t && JSON.stringify(Array.prototype.slice.call(t.d)) === JSON.stringify(flat), sp.id + ': 자료가 원본에서 만든 것과 같다 (' + ex.notes.length + '음)');
  /* 원본과 따로 다시 세어 본다: 발췌 구간의 (시작, 음높이) 가 원본에 그대로 있는가 */
  var want = {}, wantN = 0;
  src.notes.forEach(function (n) { var b = n.tick / src.div; if (b < sp.from || b >= sp.to) return; if (sp.skip && b >= sp.skip[0] && b < sp.skip[1]) return; if (sp.skip && b >= sp.skip[1]) b -= sp.skip[1] - sp.skip[0]; var k = Math.round((b - sp.from) * 24) + ':' + n.n; if (!want[k]) { want[k] = 1; wantN++; } });
  var have = 0, lo = 127, hi = 0, out = 0;
  for (var i2 = 0; i2 < t.d.length; i2 += 4) { if (want[t.d[i2] + ':' + t.d[i2 + 2]]) have++; lo = Math.min(lo, t.d[i2 + 2]); hi = Math.max(hi, t.d[i2 + 2]); if (KEYS[sp.id] && KEYS[sp.id].indexOf(t.d[i2 + 2] % 12) < 0) out++; }
  check(have === wantN && have === t.d.length / 4, sp.id + ': 음 수 ' + have + ' = 원본 구간의 음 수 ' + wantN);
  var slo = 127, shi = 0; src.notes.forEach(function (n) { slo = Math.min(slo, n.n); shi = Math.max(shi, n.n); });
  check(lo >= slo && hi <= shi && lo >= 28 && hi <= 96, sp.id + ': 음역 ' + lo + '~' + hi + ' (원본 ' + slo + '~' + shi + ')');
  if (KEYS[sp.id]) check(out / (t.d.length / 4) < 0.12, sp.id + ': 다장조 밖의 음 ' + out);
  var sec = MUSIC.seconds(sp.id); check(sec >= 28 && sec <= 62, sp.id + ': 길이 ' + sec.toFixed(1) + '초');
  var tl = MUSIC.timeline(sp.id), okT = tl.every(function (a, j) { return a.at >= 0 && a.dur > 0 && a.hz > 30 && a.hz < 4500 && (j === 0 || a.at >= tl[j - 1].at); });
  check(okT && tl.length === t.d.length / 4, sp.id + ': 시간순 · 들리는 음높이');
});
var cur = fs.readFileSync(path.join(ROOT, 'js', 'cafe-music.js'), 'utf8');
check(cur.indexOf("id: 'chopin'") > 0 && !/var TUNES = \[\];/.test(cur), '자료가 들어 있다');

if (WAV) {   /* 귀로 확인: 같은 timeline 을 사인 둘로 구운 WAV (게임의 음색과 같은 꼴, 잡음 없음) */
  fs.mkdirSync(WAV, { recursive: true });
  MUSIC.list().forEach(function (t) {
    var sr = 22050, tl = MUSIC.timeline(t.id), n = Math.ceil((MUSIC.seconds(t.id) + 2) * sr), y = new Float32Array(n);
    tl.forEach(function (a) {
      var s0 = Math.floor(a.at * sr), hold = Math.min(a.dur + 0.18, 4), tau = a.n < 48 ? 1.6 : a.n < 72 ? 1.1 : 0.7, peak = 0.05 + 0.2 * a.vel, len = Math.min(n - s0, Math.floor((hold + 0.6) * sr));
      for (var i3 = 0; i3 < len; i3++) { var tt = i3 / sr, env = peak * (0.18 + 0.82 * Math.exp(-tt / tau)) * Math.min(1, tt / 0.008) * (tt > hold ? Math.exp(-(tt - hold) / 0.09) : 1); y[s0 + i3] += env * (Math.sin(2 * Math.PI * a.hz * tt) + 0.15 * Math.sin(4 * Math.PI * a.hz * tt)); }
    });
    var peakAll = 0; for (var i4 = 0; i4 < n; i4++) peakAll = Math.max(peakAll, Math.abs(y[i4]));
    var buf = Buffer.alloc(44 + n * 2); buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
    buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
    for (var i5 = 0; i5 < n; i5++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, y[i5] / Math.max(1, peakAll * 1.05))) * 32767), 44 + i5 * 2);
    fs.writeFileSync(path.join(WAV, t.id + '.wav'), buf);
    console.log('  wav ' + t.id + ' ' + (n / sr).toFixed(1) + ' s, 가장 큰 겹침 ' + peakAll.toFixed(2));
  });
}
console.log('\n카페 규칙 · 음표: 통과 ' + passes + ' · 실패 ' + failures);
process.exit(failures ? 1 : 0);
