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
ok(NPC.sleepers.length === 4 && NPC.sleepers.every(function (s, i) { return s.id === 'sleep-' + (i + 1) && /^#[0-9a-f]{6}$/.test(s.color) && !colors[s.color]; }), '자는 문어 넷');
var L = NPC.list('2026-11-21');
ok(L.length === 7 && L.every(function (x) { return x.id && /^#[0-9a-f]{6}$/.test(x.color) && ['none', 'beret', 'apron', 'cap'].indexOf(x.hat) >= 0 && ['stand', 'sleep'].indexOf(x.pose) >= 0; }), 'list 는 계약 C6 모양');
ok(L.filter(function (x) { return x.pose === 'sleep'; }).length === 4 && L.slice(0, 3).every(function (x) { return x.pose === 'stand'; }), '셋은 서 있고 넷은 잔다');
ok(JSON.stringify(NPC.list('2026-11-21')) === JSON.stringify(NPC.list('2026-11-21')), 'list 는 같은 날 같은 값');

/* 2. 대사: 열쇠마다 세 갈래 이상 · 길이 · 금지 낱말 */
Object.keys(C7).forEach(function (id) {
  C7[id].forEach(function (k) {
    var vs = NPC.variants(id, k), plain = vs.filter(function (v) { return !/\{/.test(v.join('')); });
    ok(vs.length >= 3 && vs.length <= 5, id + ' ' + k + ' 갈래 3~5 (지금 ' + vs.length + ')');
    ok(plain.length >= 3, id + ' ' + k + ' 빈칸 없는 갈래가 셋 이상 (값 없이 불러도 된다)');
    vs.forEach(function (v, i) { ok(v.length >= 1 && v.length <= 2, id + ' ' + k + ' ' + i + ' 풍선 1~2개'); });
  });
  ok(NPC.keys(id).slice().sort().join() === C7[id].slice().sort().join(), id + ' 열쇠가 딱 그만큼');
});
ok(NPC.line('cafe', 'shop.hello') === null && NPC.line('clothes', 'cafe.serve') === null && NPC.line('nobody', 'talk') === null && NPC.line('sleep-1', 'talk') === null, '없는 문어 · 제 것이 아닌 열쇠 · 자는 문어는 null');
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
var t1 = NPC.line('clothes', 'contest.open', { theme: '바다' }, 0);
ok(t1 && /바다/.test(t1.bubbles.join('')), '주제를 넘기면 주제를 말하는 갈래');
var t2 = NPC.line('goods', 'contest.result', { shells: 7 }, 3);
ok(t2 && /7개/.test(t2.bubbles.join('')), '조개 수를 넘기면 그 수를 말한다');
var t3 = NPC.line('cafe', 'cafe.gift', { dish: '딸기 케이크' }, 1);
ok(t3 && /딸기 케이크/.test(t3.bubbles.join('')), '요리 이름');
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
