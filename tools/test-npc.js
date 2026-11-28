/* tools/test-npc.js — 마을 문어 대본의 정직 검사 (11-21 7차 N 갈래). node tools/test-npc.js
 * 금지 낱말은 tools/test-brain.js 의 CLAIM_RX · TAP_BAN 을 글자 그대로 읽어 쓴다 (기준은 한 곳). */
'use strict';
var fs = require('fs'), path = require('path');
var NPC = require('../js/npc.js');
var pass = 0, fail = 0;
function ok(c, msg) { if (c) pass++; else { fail++; console.log('  FAIL ' + msg); } }
function rxFrom(src, name) {
  var m = src.match(new RegExp('var ' + name + ' = (\\/.+\\/)([a-z]*);'));
  if (!m) throw new Error(name + ' 를 tools/test-brain.js 에서 못 찾음');
  return new RegExp(m[1].slice(1, -1), m[2]);
}
var brain = fs.readFileSync(path.join(__dirname, 'test-brain.js'), 'utf8');
var CLAIM_RX = rxFrom(brain, 'CLAIM_RX'), TAP_BAN = rxFrom(brain, 'TAP_BAN');
ok(CLAIM_RX.test('좋아') && TAP_BAN.test('단골') && !CLAIM_RX.test('조개 받았어.'), '금지 낱말 식을 제대로 읽었다');

var PRESS_RX = /빨리|놓치|마지막|꼭 와|서둘|얼른|어서 가|다시 와|또 와|기다릴게|기다렸/;   /* 재촉 · 다시 오라는 말 */
var MODEL_RX = /모델|인공지능|AI|생각했|생각해|생각이|느꼈|느껴|느낌/;   /* 모델인 척 · '생각한다' */
var PLAIN_RX = /^[가-힣0-9 .,!?…·{}a-z]+$/;   /* 한글 · 숫자 · 기본 문장부호 · 가운뎃점 (빈칸 {theme} 만 영문) */
var C7 = { clothes: ['shop.hello', 'shop.thanks', 'shop.none', 'contest.open', 'contest.result', 'talk'],
  goods: ['shop.hello', 'shop.thanks', 'shop.none', 'contest.open', 'contest.result', 'talk'],
  cafe: ['cafe.hello', 'cafe.serve', 'cafe.gift', 'contest.open', 'contest.result', 'talk'] };
/* 11-21 밤: 걸어 들어가는 가게 · 무대의 박자 열쇠 (계약 C14) — 두 갈래 이상, 빈칸 없는 갈래가 하나 이상 */
var C14 = { clothes: ['shop.enter', 'shop.tryon', 'shop.mirror', 'shop.pay', 'shop.leave', 'contest.poster', 'contest.start', 'contest.judge', 'contest.podium'],
  goods: ['goods.enter', 'shop.pay', 'shop.leave', 'contest.poster', 'contest.start', 'contest.judge', 'contest.podium'],
  cafe: ['cafe.order', 'cafe.stamp', 'cafe.record', 'contest.poster', 'contest.start', 'contest.judge', 'contest.podium'] };
var ATTIC = ['#e8463c', '#f08a3c', '#9a5cc8', '#4a86d8', '#4fa868', '#f07aa8'];
function rgb(h) { return [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); }
function dist(a, b) { a = rgb(a); b = rgb(b); return Math.sqrt(a.reduce(function (s, v, i) { return s + (v - b[i]) * (v - b[i]); }, 0)); }

/* 1. 명단 */
ok(NPC.keepers.join() === 'clothes,goods,cafe', '가게 문어 셋의 id');
var names = {}, colors = {};
NPC.keepers.forEach(function (id) {
  var r = NPC.roster[id];
  ok(/^[가-힣]{1,4}$/.test(r.name), id + ' 이름은 짧은 한글');
  ok(!names[r.name], id + ' 이름이 겹치지 않는다'); names[r.name] = 1;
  ok(/^#[0-9a-f]{6}$/.test(r.color) && !colors[r.color], id + ' 색'); colors[r.color] = 1;
  ok(ATTIC.every(function (a) { return dist(a, r.color) >= 50; }), id + ' 색이 다락 문어 여섯 색과 뚜렷이 다르다');
  ok(['beret', 'apron', 'cap'].indexOf(r.hat) >= 0, id + ' 모자');
  ok(NPC.tag(id) === r.name + ' · 대본', id + ' 이름표에 대본');
});
ok(NPC.sleepers.length === 4 && NPC.sleepers.every(function (s, i) { return s.id === 'sleep-' + (i + 1) && /^#[0-9a-f]{6}$/.test(s.color) && !colors[s.color]; }), '자던 문어 넷 (색은 그대로)');
/* 11-24: 집에 사는 넷 · 미용사 — 이름 · 색 · 모자 · 이름표 */
ok(NPC.residents.join() === 'sleep-1,sleep-2,sleep-3,sleep-4', '집에 사는 넷의 id 는 예전 그대로');
NPC.residents.concat(['stylist']).forEach(function (id, i) {
  var r = NPC.roster[id];
  ok(!!r && /^[가-힣]{1,4}$/.test(r.name) && !names[r.name], id + ' 이름 (짧은 한글 · 겹치지 않음)'); names[r.name] = 1;
  ok(/^#[0-9a-f]{6}$/.test(r.color) && !colors[r.color], id + ' 색'); colors[r.color] = 1;
  if (i < 4) ok(r.color === NPC.sleepers[i].color, id + ' 몸 색은 자던 때 그대로');
  else ok(ATTIC.every(function (a) { return dist(a, r.color) >= 50; }), '미용사 색이 다락 문어 여섯 색과 뚜렷이 다르다');
  ok(['none', 'beret', 'apron', 'cap'].indexOf(r.hat) >= 0 && NPC.tag(id) === r.name + ' · 대본', id + ' 모자 · 이름표');
});
var L = NPC.list('2026-11-21', 12), LN = NPC.list('2026-11-21', 23);
ok(L.length === 8 && L.every(function (x) { return x.id && /^#[0-9a-f]{6}$/.test(x.color) && ['none', 'beret', 'apron', 'cap'].indexOf(x.hat) >= 0 && ['stand', 'sleep'].indexOf(x.pose) >= 0; }), 'list 는 계약 C6 모양 (셋 · 넷 · 미용사)');
ok(L.every(function (x) { return x.pose === 'stand' && !x.room && !x.slot; }), '낮엔 다 서 있고 자리는 장면의 시간표 (room · slot 없음)');
ok(LN.filter(function (x) { return x.pose === 'sleep'; }).map(function (x) { return x.id; }).join() === 'sleep-1,sleep-2,sleep-3,sleep-4', '밤 (21~7) 엔 집에 사는 넷만 잔다');
ok(NPC.phase(7) === 'day' && NPC.phase(16.9) === 'day' && NPC.phase(17) === 'evening' && NPC.phase(20.9) === 'evening' && NPC.phase(21) === 'night' && NPC.phase(3) === 'night' && NPC.phase() === 'day', '시간 칸 (V 의 시간표와 같은 경계)');
ok(JSON.stringify(NPC.list('2026-11-21', 12)) === JSON.stringify(NPC.list('2026-11-21', 12)), 'list 는 같은 날 같은 값');
/* 집에 사는 문어의 열쇠: 처음 → 그날 처음 → 그다음 · 저녁 · 밤 */
var uu = { story: { future: 1 } };
ok(NPC.residentKey(uu, 'sleep-3', '2026-11-24', 10) === 'home.first' && NPC.residentKey(uu, 'sleep-3', '2026-11-24', 11) === 'talk' && NPC.residentKey(uu, 'sleep-3', '2026-11-25', 10) === 'home.again' && NPC.residentKey(uu, 'sleep-3', '2026-11-25', 18) === 'home.in' && NPC.residentKey(uu, 'sleep-3', '2026-11-25', 22) === null, '처음 만남 · 다시 만남 · 낮 · 저녁 집 안 · 밤엔 잔다');
ok(uu.story.future === 1 && uu.story.met['sleep-3'] === '2026-11-24', '만난 날 저장 · 모르는 값은 그대로');
ok(NPC.residentKey(uu, 'clothes', '2026-11-25', 10) === null, '가게 문어는 이 길로 오지 않는다');

/* 11-24: 집에 사는 넷 · 미용사의 열쇠 */
var C15 = { 'sleep-1': ['talk', 'home.first', 'home.again', 'home.in'], 'sleep-2': ['talk', 'home.first', 'home.again', 'home.in'], 'sleep-3': ['talk', 'home.first', 'home.again', 'home.in'], 'sleep-4': ['talk', 'home.first', 'home.again', 'home.in'],
  stylist: ['talk', 'salon.sit', 'salon.pick', 'salon.after', 'salon.short', 'salon.leave'] };
Object.keys(C15).forEach(function (id) {
  ok(NPC.keys(id).slice().sort().join() === C15[id].slice().sort().join(), id + ' 열쇠가 딱 그만큼');
  C15[id].forEach(function (k) {
    var vs = NPC.variants(id, k), plain = vs.filter(function (v) { return !/\{/.test(v.join('')); });
    ok(vs.length >= 2 && vs.length <= 5 && plain.length >= 2, id + ' ' + k + ' 갈래 2~5 · 빈칸 없는 갈래 둘 이상');
    vs.forEach(function (v, i) { ok(v.length >= 1 && v.length <= 2, id + ' ' + k + ' ' + i + ' 풍선 1~2개'); });
  });
});
ok(/3개/.test(NPC.line('stylist', 'salon.short', { need: 3 }, 2).bubbles.join('')) || [0, 1, 2, 3, 4, 5].some(function (i) { return /3개/.test(NPC.line('stylist', 'salon.short', { need: 3 }, i).bubbles.join('')); }), '미용사: 모자란 조개 수를 말하는 갈래');

/* 2. 대사: 열쇠마다 세 갈래 이상 · 길이 · 금지 낱말 */
Object.keys(C7).forEach(function (id) {
  C7[id].forEach(function (k) {
    var vs = NPC.variants(id, k), plain = vs.filter(function (v) { return !/\{/.test(v.join('')); });
    ok(vs.length >= 3 && vs.length <= 5, id + ' ' + k + ' 갈래 3~5 (지금 ' + vs.length + ')');
    ok(plain.length >= 3, id + ' ' + k + ' 빈칸 없는 갈래가 셋 이상 (값 없이 불러도 된다)');
    vs.forEach(function (v, i) { ok(v.length >= 1 && v.length <= 2, id + ' ' + k + ' ' + i + ' 풍선 1~2개'); });
  });
  C14[id].forEach(function (k) {
    var vs = NPC.variants(id, k), plain = vs.filter(function (v) { return !/\{/.test(v.join('')); });
    ok(vs.length >= 2 && vs.length <= 5, id + ' ' + k + ' 갈래 2~5 (지금 ' + vs.length + ')');
    ok(plain.length >= 1, id + ' ' + k + ' 빈칸 없는 갈래가 하나 이상');
    vs.forEach(function (v, i) { ok(v.length >= 1 && v.length <= 2, id + ' ' + k + ' ' + i + ' 풍선 1~2개'); });
    ok(!!NPC.line(id, k, null, 0) && !/\{/.test(NPC.line(id, k, null, 3).bubbles.join('')), id + ' ' + k + ' 값 없이 불러도 줄이 나온다');
  });
  ok(/3개/.test(NPC.line(id, 'contest.judge', { n: 3 }, 0).bubbles.join('')) && /0개/.test(NPC.line(id, 'contest.judge', { n: 0 }, 1).bubbles.join('')), id + ' 심사 줄은 맞은 꼬리표 수를 말한다 (0 도)');
  ok(NPC.keys(id).slice().sort().join() === C7[id].concat(C14[id]).sort().join(), id + ' 열쇠가 딱 그만큼');
});
ok(NPC.line('cafe', 'shop.hello') === null && NPC.line('clothes', 'cafe.serve') === null && NPC.line('nobody', 'talk') === null && NPC.line('sleep-1', 'shop.hello') === null, '없는 문어 · 제 것이 아닌 열쇠는 null');
NPC.allText().forEach(function (t) {
  var s = t.text;
  ok(PLAIN_RX.test(s), t.where + ' 이모지 · 기호 없음: ' + s);
  ok(!PRESS_RX.test(s), t.where + ' 재촉 · 다시 오라는 말 없음: ' + s);
  ok(!MODEL_RX.test(s), t.where + ' 모델인 척 없음: ' + s);
  if (t.npc) {
    ok(Array.from(s.replace(/\{\w+\}/g, '가나다라')).length <= 28, t.where + ' 28자까지: ' + s);
    ok(!CLAIM_RX.test(s), t.where + ' 마음 낱말 없음 (CLAIM_RX): ' + s);
    ok(!TAP_BAN.test(s), t.where + ' 금지 낱말 없음 (TAP_BAN): ' + s);
    ok(!/다락/.test(s), t.where + ' 다락 문어 이야기를 하지 않는다: ' + s);
    ok(!/(요|니다)[.!?…]*$/.test(s), t.where + ' 반말: ' + s);
  } else if (/^notice|^sleeper/.test(t.where)) {
    ok(!CLAIM_RX.test(s) && !TAP_BAN.test(s), t.where + ' 마음 낱말 없음: ' + s);
  }
});
/* 처음 세 줄: 다락 문어에 대해서는 사실 한 가지만 (깨어 있었다) */
ok(NPC.intro.length === 3 && NPC.intro.every(function (s) { return Array.from(s).length <= 48; }), '처음 세 줄 · 짧다');
ok(NPC.intro.filter(function (s) { return /다락/.test(s); }).every(function (s) { return !CLAIM_RX.test(s) && !TAP_BAN.test(s); }), '다락 문어가 나오는 줄에 마음 낱말 없음');
ok(NPC.notices.length === 4 && NPC.notices.map(function (n) { return n.id; }).join() === 'help,catch,quiet,leave', '쪽지 넷, 이야기 차례대로');

/* 3. line: 씨앗 · 빈칸 · 이름표 */
Object.keys(C7).forEach(function (id) {
  C7[id].forEach(function (k) {
    var seen = {}, n = NPC.variants(id, k).filter(function (v) { return !/\{/.test(v.join('')); }).length;
    for (var s = 0; s < 12; s++) {
      var ln = NPC.line(id, k, null, s);
      ok(!!ln && ln.tag === NPC.roster[id].name + ' · 대본' && ln.by === 'script' && ln.bubbles.length >= 1 && !/\{/.test(ln.bubbles.join('')), id + ' ' + k + ' 씨앗 ' + s);
      if (ln) seen[ln.n] = 1;
    }
    ok(Object.keys(seen).length === n, id + ' ' + k + ' 씨앗이 돌면 빈칸 없는 갈래가 다 나온다');
    ok(JSON.stringify(NPC.line(id, k, null, 5)) === JSON.stringify(NPC.line(id, k, null, 5)), id + ' ' + k + ' 같은 씨앗 같은 줄');
  });
});
function some(id, k, v, rx) { for (var i = 0; i < 8; i++) { var l = NPC.line(id, k, v, i); if (l && rx.test(l.bubbles.join(''))) return true; } return false; }
function rotates(id, k, v) { var seen = {}; for (var i = 0; i < 8; i++) seen[NPC.line(id, k, v, i).n] = 1; return Object.keys(seen).length; }
ok(some('clothes', 'contest.open', { theme: '바다' }, /바다/), '주제를 넘기면 주제를 말하는 갈래도 나온다');
ok(rotates('clothes', 'contest.open', { theme: '바다' }) >= 3 && rotates('cafe', 'cafe.stamp', { n: 2 }) >= 3, '값을 넘겨도 같은 줄만 되풀이하지 않는다');
var t2 = NPC.line('goods', 'contest.result', { shells: 7 }, 3);
ok(t2 && /7개/.test(t2.bubbles.join('')), '조개 수를 넘기면 그 수를 말한다');
/* 11-24: 심사 문어마다 제가 센 것을 이름으로 말한다 (시침 = 주제 꼬리표 · 모아 = 주제 색 · 느루 = 같은 결) */
[['clothes', /주제 꼬리표/], ['goods', /주제 색/], ['cafe', /결/]].forEach(function (j) {
  for (var i = 0; i < 6; i++) { var l = NPC.line(j[0], 'contest.judge', { n: 2 }, i); ok(j[1].test(l.bubbles.join('')) && /2개/.test(l.bubbles.join('')), j[0] + ' 심사 줄은 제가 센 것을 이름으로: ' + l.bubbles.join(' ')); }
});
ok(some('cafe', 'cafe.gift', { dish: '딸기 케이크' }, /딸기 케이크/), '요리 이름');
ok(!/\{|undefined|null/.test(NPC.line('cafe', 'cafe.gift', { dish: '' }, 1).bubbles.join('')), '빈 값이면 빈칸 갈래를 안 고른다');

/* 4. 저장 칸: 모르는 값은 그대로 */
var u = { shells: 3, story: { intro: '2026-11-01', notices: { help: '2026-11-02', later: 'x' }, future: [1, 2] } };
NPC.normalize(u);
ok(u.shells === 3 && u.story.intro === '2026-11-01' && u.story.notices.later === 'x' && u.story.future.length === 2, 'normalize 가 아는 값 · 모르는 값을 그대로 둔다');
ok(NPC.seeNotices(u, '2026-11-21') === 3 && u.story.notices.help === '2026-11-02' && u.story.notices.leave === '2026-11-21', '처음 본 쪽지에만 날짜');
ok(NPC.seeNotices(u, '2026-11-22') === 0, '다시 열면 새로 본 것 없음');
var u2 = {}; NPC.normalize(u2); ok(u2.story.intro === null && Object.keys(u2.story.notices).length === 0, '없던 칸은 안전한 기본값');
var u3 = { story: 'broken' }; NPC.normalize(u3); ok(u3.story.intro === null, '깨진 칸은 기본값으로');

/* 5. 규칙 파일은 시계 · 난수 · DOM 을 부르지 않는다 */
var src = fs.readFileSync(path.join(__dirname, '..', 'js', 'npc.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
ok(!/Math\.random|Date\.now|new Date|document\.|window\./.test(src), 'npc.js 안에 시계 · 난수 · DOM 없음');

console.log('test-npc: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
