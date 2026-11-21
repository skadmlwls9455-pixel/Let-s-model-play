#!/usr/bin/env node
/* tools/test-contest.js - 주말 콘테스트 규칙 (js/contest.js) 시험. node 만, 의존성 없음. 실패하면 exit 1.
 *
 *   node tools/test-contest.js          (-v: 통과한 검사도 한 줄씩)
 *
 *   0 불러오기: module.exports + 전역 CONTEST, 시계 / Math.random 없음
 *   1 주: 월요일 키, 토 · 일만 열림, 깨진 날짜
 *   2 주제: 열둘, 고정 꼬리표 목록만, 20년 동안 같은 주제는 8주 안에 다시 안 나옴, 결정적
 *   3 채점: 0..100, 결정적, 감점 없음 (무엇을 더 입어도 안 내려감), 칸마다 상한, 물들임 덤
 *   4 경쟁자: 셋, 주마다 같음, 같은 채점 함수
 *   5 나가기: 닫힌 날 null, 등수와 조개 (12 · 8 · 5 · 3), 하루 한 번, 다시 보기 = 적힌 그대로
 *   6 normalize: 모르는 값 지킴, 멱등 · merge: 두 탭 (두 날 다 남김, 준 표시는 안 사라짐)
 *   7 글 · 그림: 기호 0, 마음 말 0, 날짜 · 시계 말 0, 그림 줄 길이
 */
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = path.resolve(__dirname, '..');
var FILE = path.join(ROOT, 'js', 'contest.js');
var SRC = fs.readFileSync(FILE, 'utf8');
var VERBOSE = process.argv.indexOf('-v') >= 0;
var passes = 0, failures = 0;
function check(cond, msg) { if (cond) { passes++; if (VERBOSE) console.log('  ok   ' + msg); } else { failures++; console.log('  FAIL ' + msg); } }
function section(name, fn) { console.log('\n' + name); try { fn(); } catch (e) { failures++; console.log('  FAIL (threw) ' + (e && e.stack || e)); } }

var REAL = { random: Math.random, now: Date.now };
Math.random = function () { throw new Error('Math.random used'); };
Date.now = function () { throw new Error('Date.now used'); };
var C = require(FILE);

var SAT = '2026-11-21', SUN = '2026-11-22', MON = '2026-11-16', FRI = '2026-11-20', NEXT_MON = '2026-11-23';
var FIXED = ['cute', 'cool', 'cosy', 'sporty', 'neat', 'sea', 'flower', 'star', 'warm', 'fresh'];
var COLS = ['c-red', 'c-orange', 'c-yellow', 'c-green', 'c-blue', 'c-purple', 'c-pink', 'c-brown', 'c-white', 'c-black'];
/* 작은 옷 목록 (P 갈래 대역): 칸 넷, 꼬리표는 고정 목록에서 돌려 가며 */
function catalog() {
  var cats = ['hair', 'outfit', 'shoes', 'acc'];
  return cats.map(function (key, ci) {
    var items = [];
    for (var i = 0; i < 10; i++) items.push({ id: key + i, name: key + i, tags: [FIXED[(i + ci) % 10], FIXED[(i * 3 + ci + 1) % 10], COLS[(i + ci * 2) % 10]] });
    return { key: key, items: items };
  });
}
function lookFor(theme, n) {   /* 주제에 꼭 맞는 차림 n 벌 */
  var out = [];
  for (var i = 0; i < n; i++) out.push({ cat: 'c' + i, id: 'fit' + i, tags: theme.tags.concat([theme.color]) });
  return out;
}

section('0 불러오기', function () {
  check(typeof C.week === 'function' && typeof C.score === 'function' && typeof C.enter === 'function', 'module.exports');
  check(globalThis.CONTEST === C, '전역 CONTEST');
  check(!/Math\.random|Date\.now|new Date\(\)|document\.|localStorage|setTimeout/.test(SRC.replace(/\/\*[\s\S]*?\*\//g, '')), '시계 · 난수 · DOM · 저장소 코드 없음');
});

section('1 주', function () {
  var w = C.week(SAT);
  check(w && w.key === MON, '토요일의 주 = 그 주 월요일 (' + (w && w.key) + ')');
  check(C.week(SUN).key === MON && C.week(MON).key === MON && C.week(FRI).key === MON, '월 ~ 일 같은 주');
  check(C.week(NEXT_MON).key === NEXT_MON, '다음 월요일은 새 주');
  check(C.week(SAT).open === true && C.week(SUN).open === true, '토 · 일 열림');
  ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20'].forEach(function (d) { check(C.week(d).open === false, d + ' 닫힘'); });
  check(C.week('2026-12-31').key === '2026-12-28' && C.week('2027-01-02').key === '2026-12-28' && C.week('2027-01-02').open, '해를 넘는 주');
  check(C.week('nope') === null && C.week('2026-02-30') === null && C.week(null) === null, '깨진 날짜 = null');
  check(C.week(SAT).theme.id === C.week(SUN).theme.id && C.week(MON).theme.id === C.week(SAT).theme.id, '한 주에 주제 하나');
});

section('2 주제', function () {
  check(C.THEMES.length === 12, '열두 주제');
  var ids = {}, titles = {};
  C.THEMES.forEach(function (t) {
    ids[t.id] = 1; titles[t.title] = 1;
    check(t.tags.length >= 2 && t.tags.length <= 3 && t.tags.every(function (x) { return FIXED.indexOf(x) >= 0; }), t.id + ' 꼬리표 2~3개 · 고정 목록');
    check(COLS.indexOf(t.color) >= 0, t.id + ' 색 하나');
    check(!!C.art('theme', t.id), t.id + ' 그림 있음');
  });
  check(Object.keys(ids).length === 12 && Object.keys(titles).length === 12, 'id · 제목 겹침 없음');
  var seq = [], seen = {};
  for (var i = 0; i < 1040; i++) seq.push(C.themeAt(2900 + i).id);
  var minGap = 999, last = {};
  seq.forEach(function (id, i) { seen[id] = 1; if (last[id] != null) minGap = Math.min(minGap, i - last[id]); last[id] = i; });
  check(minGap > 8, '20년 동안 같은 주제 사이 가장 짧은 간격 ' + minGap + '주 (> 8)');
  check(Object.keys(seen).length === 12, '열두 주제가 다 나옴');
  var orders = {};
  for (var b = 0; b < 40; b++) orders[seq.slice(b * 12 + 4, b * 12 + 16).join(',')] = 1;
  check(Object.keys(orders).length > 10, '순서가 돌 때마다 섞임 (' + Object.keys(orders).length + ' 가지)');
  check(C.themeAt(2968).id === C.themeAt(2968).id && C.week(SAT).theme === C.week(SAT).theme, '결정적');
  /* 달력 날짜로도: 2026 ~ 2030 모든 토요일 */
  var d = new Date(Date.UTC(2026, 0, 3)), keys = [];
  while (d.getUTCFullYear() < 2031) { keys.push(d.toISOString().slice(0, 10)); d = new Date(d.getTime() + 7 * 864e5); }
  var okGap = true, lastAt = {};
  keys.forEach(function (k, i) { var w = C.week(k); if (!w.open) okGap = false; if (lastAt[w.theme.id] != null && i - lastAt[w.theme.id] <= 8) okGap = false; lastAt[w.theme.id] = i; });
  check(okGap, '2026 ~ 2030 토요일마다 열리고 8주 안에 같은 주제 없음');
});

section('3 채점', function () {
  var th = C.themeById('beach');
  var empty = C.score([], th, 1);
  check(empty.total === C.PTS.stage, '아무것도 안 맞아도 무대 점수 ' + empty.total);
  check(C.score(null, th, 1).total === C.PTS.stage && C.score([{ cat: 'x' }, null, 3], th, 1).total === C.PTS.stage, '깨진 입력도 던지지 않음');
  var full = C.score(lookFor(th, 4).map(function (p, i) { return i ? p : { cat: p.cat, id: p.id, tags: p.tags, dye: th.color }; }), th, 1);
  check(full.total === 100, '꼭 맞는 네 벌 + 물들임 = 100 (' + full.total + ')');
  check(C.score(lookFor(th, 9), th, 1).total <= 100, '많이 입어도 100 을 안 넘음');
  var a = C.score(lookFor(th, 3), th, 5), b = C.score(lookFor(th, 3), th, 5);
  check(JSON.stringify(a) === JSON.stringify(b), '같은 차림 · 같은 시드 = 같은 결과');
  check(C.score(lookFor(th, 3), th, 6).total === a.total, '시드는 점수를 안 바꿈 (동점 순서만)');
  a.parts.forEach(function (p) { check(p.points >= 0 && p.points <= p.max, p.what + ' 0..' + p.max); });
  check(a.parts.map(function (p) { return p.what; }).join() === 'stage,theme,color,match,dye', '칸 다섯');
  /* 감점 없음: 어떤 차림에 무엇을 더 입어도 점수가 내려가지 않는다 (2000 번) */
  var r = C.rng(42), cat = catalog(), down = 0, dyeDown = 0;
  for (var i = 0; i < 2000; i++) {
    var t = C.THEMES[Math.floor(r() * 12)], look = [], n = Math.floor(r() * 4);
    for (var j = 0; j < n; j++) { var c = cat[j], it = c.items[Math.floor(r() * 10)]; look.push({ cat: c.key, id: it.id, tags: it.tags }); }
    var s0 = C.score(look, t, i).total;
    var c2 = cat[n], extra = c2.items[Math.floor(r() * 10)];
    var s1 = C.score(look.concat([{ cat: c2.key, id: extra.id, tags: extra.tags }]), t, i).total;
    if (s1 < s0) down++;
    var s2 = C.score(look.concat([{ cat: c2.key, id: extra.id, tags: extra.tags, dye: COLS[Math.floor(r() * 10)] }]), t, i).total;
    if (s2 < s1) dyeDown++;
    if (s0 < 0 || s0 > 100) down++;
  }
  check(down === 0, '한 벌 더 입어서 점수가 내려간 적 없음');
  check(dyeDown === 0, '물들여서 점수가 내려간 적 없음');
  var plain = [{ cat: 'outfit', id: 'o', tags: ['sea'] }], dyed = [{ cat: 'outfit', id: 'o', tags: ['sea'], dye: 'c-blue' }], other = [{ cat: 'outfit', id: 'o', tags: ['sea'], dye: 'c-red' }];
  check(C.score(dyed, th, 1).total === C.score(plain, th, 1).total + C.PTS.dye + C.PTS.color, '주제 색으로 물들이면 덤');
  check(C.score(other, th, 1).total === C.score(plain, th, 1).total, '다른 색으로 물들여도 그대로');
  var m2 = C.score([{ cat: 'a', id: 1, tags: ['cute'] }, { cat: 'b', id: 2, tags: ['cute'] }], th, 1), m3 = C.score([{ cat: 'a', id: 1, tags: ['cute'] }, { cat: 'b', id: 2, tags: ['cute'] }, { cat: 'c', id: 3, tags: ['cute'] }], th, 1);
  check(m2.total === C.PTS.stage + C.PTS.match2 && m3.total === C.PTS.stage + C.PTS.match3, '어울림: 둘 6 · 셋 12 (주제와 달라도)');
  var cs = C.cards(full, th);
  check(cs.length === 3 && cs.every(function (c) { return c.stars >= 1 && c.stars <= 3 && !!C.art('tag', c.icon); }), '심사 카드 셋 · 별 1~3 · 그림 있음');
  check(C.cards(empty, th).every(function (c) { return c.stars === 1; }) && cs.every(function (c) { return c.stars === 3; }), '별은 가장 낮아도 하나');
});

section('4 경쟁자', function () {
  var w = C.week(SAT), cat = catalog();
  var a = C.rivals(w.key, cat, w.theme, 77), b = C.rivals(w.key, cat, w.theme, 77);
  check(a.length === 3 && JSON.stringify(a) === JSON.stringify(b), '셋 · 결정적');
  check(a.every(function (r) { return r.look.length === 4 && r.total === C.score(r.look, w.theme, 0).total; }), '칸마다 하나 · 같은 채점 함수');
  check(a[0].color !== a[1].color && a[1].color !== a[2].color && a[0].color !== a[2].color, '몸 색 서로 다름');
  var other = C.rivals(C.week(NEXT_MON).key, cat, C.week(NEXT_MON).theme, 77);
  check(JSON.stringify(other.map(function (r) { return r.look; })) !== JSON.stringify(a.map(function (r) { return r.look; })), '다음 주는 다른 차림');
  var e = C.rivals(w.key, [], w.theme, 1), n = C.rivals(w.key, null, w.theme, 1);
  check(e.length === 3 && n.length === 3 && e[0].total === C.PTS.stage, '옷 목록이 비어도 셋 (무대 점수만)');
  var sum = [0, 0, 0];
  for (var i = 0; i < 300; i++) C.rivals('w' + i, cat, C.THEMES[i % 12], 5).forEach(function (r, k) { sum[k] += r.total; });
  check(sum[0] > sum[1] && sum[1] > sum[2], '센 · 중간 · 가벼운 경쟁자 (평균 ' + sum.map(function (s) { return Math.round(s / 300); }).join(' · ') + ')');
});

section('5 나가기', function () {
  var w = C.week(SAT), cat = catalog(), u = { shells: 4, keep: 'x' };
  check(C.enter(u, FRI, lookFor(w.theme, 3), { catalog: cat }) === null && u.contest === undefined, '평일 = null · 아무것도 안 적음');
  check(C.enter(null, SAT, [], {}) === null, '상태가 없으면 null');
  var best = C.enter(u, SAT, lookFor(w.theme, 4), { catalog: cat, salt: 9, at: 1000 });
  check(best && best.rank === 1 && best.shells === 12 && best.replay === false, '꼭 맞는 차림 = 1등 · 조개 12');
  check(u.shells === 4 && u.keep === 'x', '규칙은 조개를 직접 안 건드림');
  check(best.entry.paid === false && best.entry.theme === w.theme.id && best.entry.rivals.length === 3 && best.entry.look.length === 4, '기록: 주제 · 차림 · 경쟁자 · 아직 안 줌');
  var again = C.enter(u, SAT, [], { catalog: cat, salt: 9, at: 2000 });
  check(again.replay === true && again.rank === 1 && again.shells === 12 && again.entry === best.entry && again.entry.at === 1000, '같은 날 다시 = 적힌 그대로 (다른 차림으로도 다시 안 뽑음)');
  check(C.today(u, SAT) === best.entry && C.today(u, SUN) === null && C.today({}, SAT) === null, 'today');
  var sun = C.enter(u, SUN, [], { catalog: cat, salt: 9, at: 3000 });
  check(sun.replay === false && Object.keys(u.contest.weeks[w.key].days).length === 2, '일요일은 따로 한 번');
  check(sun.shells === C.SHELLS[sun.rank - 1] && sun.shells >= 3, '누구나 받음 (맨몸 ' + sun.rank + '등 · 조개 ' + sun.shells + ')');
  var ranks = {}, okPay = true;
  for (var i = 0; i < 400; i++) {
    var d = C.week(SAT), uu = {}, r = C.rng(i), look = cat.map(function (c) { var it = c.items[Math.floor(r() * 10)]; return { cat: c.key, id: it.id, tags: it.tags }; }).slice(0, 1 + i % 4);
    var res = C.enter(uu, SAT, look, { catalog: cat, salt: i, at: i });
    ranks[res.rank] = 1; if ([12, 8, 5, 3][res.rank - 1] !== res.shells) okPay = false;
    var beat = res.entry.rivals.filter(function (x) { return x.total > res.entry.total; }).length;
    if (res.rank !== beat + 1) okPay = false;
    var bd = C.board(res.entry); if (bd.length !== 4 || bd.filter(function (x) { return x.who === 'me'; })[0].rank !== res.rank) okPay = false;
    if (d.theme.id !== res.entry.theme) okPay = false;
  }
  check(okPay, '등수 = 나보다 높은 경쟁자 수 + 1 · 조개 12 · 8 · 5 · 3 · 무대 순서와 같음');
  check(ranks[1] && ranks[2] && ranks[3] && ranks[4], '네 등수가 다 나옴');
  check(C.logLine(best.entry, true) === '콘테스트 1등 · 조개 12' && C.logLine(sun.entry) === sun.rank + '등 · 조개 ' + sun.shells, '기록 줄');
});

section('6 normalize · merge', function () {
  var u = { contest: { v: 9, later: [1], weeks: { '2026-11-16': { theme: 'beach', extra: 1, days: { '2026-11-21': { rank: 2, shells: 8, future: 'k', paid: true } } }, odd: 'str' } } };
  var before = JSON.stringify(u);
  C.normalize(u); C.normalize(u);
  check(JSON.stringify(u) === before, '모르는 값 그대로 · 멱등');
  var e = {}; C.normalize(e); check(e.contest && e.contest.v === 1 && JSON.stringify(e.contest.weeks) === '{}', '없으면 빈 칸');
  var br = { contest: 'x' }; C.normalize(br); check(typeof br.contest === 'object' && !!br.contest.weeks, '깨진 칸만 기본값');
  check(C.normalize(null) === null, 'null 도 던지지 않음');
  /* 두 탭 */
  var cat = catalog(), A = {}, B = {};
  C.enter(A, SAT, [], { catalog: cat, at: 10 }).entry.paid = true;
  C.enter(B, SUN, [], { catalog: cat, at: 20 }).entry.paid = true;
  var m = C.merge(A.contest, B.contest), days = m.weeks[MON].days;
  check(!!days[SAT] && !!days[SUN] && days[SAT].paid && days[SUN].paid, '두 날 다 남음');
  check(JSON.stringify(C.merge(B.contest, A.contest).weeks[MON].days[SAT]) === JSON.stringify(days[SAT]), '순서를 바꿔도 같음');
  var X = {}, Y = {};
  C.enter(X, SAT, lookFor(C.week(SAT).theme, 4), { catalog: cat, at: 50 });   /* 아직 안 줌 */
  C.enter(Y, SAT, [], { catalog: cat, at: 60 }).entry.paid = true;
  var k = C.merge(X.contest, Y.contest).weeks[MON].days[SAT];
  check(k.paid === true && k.at === 60, '같은 날 둘: 조개를 준 쪽이 남음 (다시 주지 않음)');
  var P = {}, Q = {};
  C.enter(P, SAT, [], { catalog: cat, at: 70 }).entry.paid = true; C.enter(Q, SAT, lookFor(C.week(SAT).theme, 4), { catalog: cat, at: 65 }).entry.paid = true;
  check(C.merge(P.contest, Q.contest).weeks[MON].days[SAT].at === 65 && C.merge(Q.contest, P.contest).weeks[MON].days[SAT].at === 65, '둘 다 줬으면 먼저 나간 쪽');
  var mm = C.merge(u.contest, A.contest);
  check(mm.later && mm.weeks.odd === 'str' && mm.weeks[MON].extra === 1 && mm.weeks[MON].days[SAT].future === 'k', '합쳐도 모르는 값 그대로 · 준 쪽이 남음');
  check(C.merge({ weeks: { w2: 7 } }, { weeks: {} }).weeks.w2 === 7 && C.merge({ weeks: {} }, { weeks: { w2: 7 } }).weeks.w2 === 7, '한쪽에만 있는 모르는 주 값도 남음');
  var odd = { contest: { v: 1, weeks: {} } }; odd.contest.weeks[MON] = { days: {} }; odd.contest.weeks[MON].days[SAT] = { rank: 2.5, shells: -4, paid: true };
  check(C.today(odd, SAT) === null && C.enter(odd, SAT, [], { catalog: cat }) === null && odd.contest.weeks[MON].days[SAT].rank === 2.5, '모르는 모양의 그날 값은 결과로 안 읽고 덮어쓰지도 않음');
  var odd2 = { contest: { v: 1, weeks: {} } }; odd2.contest.weeks[MON] = 'later';
  check(C.enter(odd2, SAT, [], { catalog: cat }) === null && odd2.contest.weeks[MON] === 'later', '모르는 모양의 주 값도 덮어쓰지 않음');
  check(C.shellsOf({ rank: 2 }) === 8 && C.shellsOf({ rank: 2, shells: -4 }) === 8 && C.shellsOf({ rank: 1, shells: 12 }) === 12 && C.shellsOf(null) === 0, '깨진 조개 수는 등수의 조개로');
  check(!!C.merge(null, A.contest).weeks[MON] && !!C.merge(A.contest, undefined).weeks[MON] && !!C.merge(null, null).weeks, '한쪽이 없어도');
});

section('7 글 · 그림', function () {
  var CLAIM = /좋|싶|재미|재밌|기뻐|신나|행복|맛있|사랑|설레|아쉬|미안|고마|기분|충분|반가/, SYMBOL = /[^가-힣ㄱ-ㆎ0-9a-zA-Z .,·{}~!?]/, PRESS = /마지막|놓치|서둘|남은|기회|시간|내일|오늘만|까지/;
  var lines = Object.keys(C.TEXT).map(function (k) { return C.TEXT[k]; }).concat(C.THEMES.map(function (t) { return t.title; })).concat(Object.keys(C.TAG_NAME).map(function (k) { return C.TAG_NAME[k]; }));
  lines.forEach(function (s) { check(!CLAIM.test(s) && !SYMBOL.test(s) && !PRESS.test(s), '글: ' + s); });
  check(C.TEXT.closed === '주말에 열려.' && C.TEXT.rule === '채점 규칙', "'주말에 열려.' · '채점 규칙'");
  check(!/싶대|싶어|싶었|싶다|싶은|궁금했|궁금해|끌렸/.test(SRC), '파일 전체 (주석 포함) 에 바람 말 없음');
  var arts = C.THEMES.map(function (t) { return C.art('theme', t.id); }).concat(C.STYLES.map(function (s) { return C.art('tag', s); })).concat([C.art('tag', 'match'), C.art('tag', 'c-pink'), C.art('star'), C.art('oct', null, '#123456')]);
  arts.forEach(function (a, i) {
    var ok = !!a && a.rows.length === a.h && a.rows.every(function (r) { return r.length === a.w && r.split('').every(function (ch) { return ch === '.' || (ch === 'x' && !!a.tint) || !!a.pal[ch]; }); });
    check(ok, '그림 ' + i + ' 줄 길이 · 팔레트');
  });
  check(C.art('theme', 'beach').w === 16 && C.art('tag', 'sea').w === 9 && C.art('tag', 'nope') === null, '크기 16 · 9, 모르는 그림 = null');
});

Math.random = REAL.random; Date.now = REAL.now;
console.log('\n' + (failures ? 'FAILED ' + failures + ' / ' : 'ok ') + (passes + failures) + ' checks');
process.exit(failures ? 1 : 0);
