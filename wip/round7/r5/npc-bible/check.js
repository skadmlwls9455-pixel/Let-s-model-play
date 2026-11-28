/* bible-src/check.js — 합본 바이블의 줄 전부를 진짜 규칙에 건다. node bible-src/check.js
 * 1. CLAIM_RX · TAP_BAN 은 r4/tools/test-brain.js 에서, PRESS_RX · MODEL_RX 는 r4/tools/test-npc.js 에서 글자 그대로 읽는다.
 * 2. 28자 · 풍선 1~2 · 반말 · 문서 글자 규칙 (한글 · 숫자 · . , … · 만 — ? ! 없음) · 이번 판의 덧 금지어.
 * 3. 말투 표지가 제 문어 줄에만 나오는지.
 * 4. 새 대본을 r4 의 NPC 에 끼워 진짜 tools/test-npc.js 를 돌린다 (sandbox — r4 는 읽기만 한다). */
'use strict';
var fs = require('fs'), path = require('path'), cp = require('child_process');
var DIR = __dirname, R4 = path.join(DIR, '..', '..', '..', '..');
var CAST = require('./cast.js');
var pass = 0, fail = 0, fails = [];
function ok(c, msg) { if (c) pass++; else { fail++; fails.push(msg); console.log('  FAIL ' + msg); } }
function rxFrom(src, name) { var m = src.match(new RegExp('var ' + name + ' = (\\/.+\\/)([a-z]*);')); if (!m) throw new Error(name + ' 못 찾음'); return new RegExp(m[1].slice(1, -1), m[2]); }
var brain = fs.readFileSync(path.join(R4, 'tools', 'test-brain.js'), 'utf8'), tnpc = fs.readFileSync(path.join(R4, 'tools', 'test-npc.js'), 'utf8');
var CLAIM_RX = rxFrom(brain, 'CLAIM_RX'), TAP_BAN = rxFrom(brain, 'TAP_BAN'), PRESS_RX = rxFrom(tnpc, 'PRESS_RX'), MODEL_RX = rxFrom(tnpc, 'MODEL_RX');
ok(CLAIM_RX.test('좋아') && TAP_BAN.test('단골') && PRESS_RX.test('빨리') && MODEL_RX.test('모델'), '금지 낱말 식을 제대로 읽었다');
var EXTRA_BAN = /빨리|놓치|마지막|꼭 와|또 와|다시 와|기다릴게|생각|느낌|모델|다락/;   /* 이번 판의 금지 (task g) */
var SEM_BAN = /걱정|졸려|졸리|추워|더워|배고|아파|꿈|소원|언젠가|기억|예뻐|예쁘|어울|부탁|몰라|모르|허전|울적|뭉클|수줍|원하|희망|한 번만|제발/;   /* 식에 안 걸려도 마음 · 바람 · 몸 · 압박으로 읽히는 낱말 */
var DOC_PLAIN = /^[가-힣0-9 .,…·]+$/;

function all(c) {   /* [{ key, n, b }] — 대본 줄 + 씨앗 줄 */
  var out = [];
  Object.keys(c.lines).forEach(function (k) { c.lines[k].forEach(function (v, i) { out.push({ key: k, n: i, b: v }); }); });
  c.extra.forEach(function (x, i) { out.push({ key: 'seed' + x.seed, n: i, b: x.b }); });
  return out;
}
function sentences(s) { return s.split(/(?<=[.…])\s+/).map(function (x) { return x.trim(); }).filter(Boolean); }
function lastJong(ch) { var c = ch.charCodeAt(0) - 0xAC00; return c >= 0 && c < 11172 ? c % 28 : -1; }

/* ── 1 · 2. 줄마다 ── */
var seen = {};
CAST.forEach(function (c) {
  var L = all(c);
  ok(L.length >= 8, c.name + ' 줄 여덟 이상 (지금 ' + L.length + ')');
  L.forEach(function (x) {
    var w = c.name + ' ' + x.key + ' ' + x.n + ': ' + x.b.join(' / ');
    ok(x.b.length >= 1 && x.b.length <= 2, w + ' — 풍선 1~2');
    var whole = x.b.join(' / '); ok(!seen[whole], w + ' — 같은 줄이 두 번'); seen[whole] = c.name;
    x.b.forEach(function (s) {
      var bare = s.replace(/\{\w+\}/g, '가나다라');
      ok(Array.from(bare).length <= 28, w + ' — 28자 (' + Array.from(bare).length + ')');
      ok(DOC_PLAIN.test(bare), w + ' — 글자 규칙');
      ok(!CLAIM_RX.test(s), w + ' — CLAIM_RX ' + (s.match(CLAIM_RX) || [''])[0]);
      ok(!TAP_BAN.test(s), w + ' — TAP_BAN ' + (s.match(TAP_BAN) || [''])[0]);
      ok(!PRESS_RX.test(s) && !EXTRA_BAN.test(s), w + ' — 재촉 · 금지');
      ok(!MODEL_RX.test(s), w + ' — 모델 말');
      ok(!SEM_BAN.test(s), w + ' — 뜻으로 걸리는 낱말 ' + (s.match(SEM_BAN) || [''])[0]);
      ok(!/(요|니다)[.!?…]*$/.test(s), w + ' — 반말');
      ok(/[.…,]$/.test(s) || /[가-힣]$/.test(s) && x.b.indexOf(s) === 0 && x.b.length === 2, w + ' — 풍선 끝 부호');
    });
  });
});

/* 11-28 검사: 처음 만남 줄은 갈래마다 제 이름을 댄다 (어느 갈래가 먼저 나와도) */
CAST.forEach(function (c) { (c.lines['home.first'] || []).forEach(function (v, i) { ok(v.join(' ').indexOf(c.name) >= 0, c.name + ' home.first ' + i + ' — 이름을 댄다: ' + v.join(' / ')); }); });

/* ── 3. 말투 표지: 제 문어에게만 ── */
var COLOR = /(회색|흰색|흰 돌|빨강|주황|노랑|초록|파랑|검정|줄무늬)/g;
var MARK = {
  '흠. (시침)': { own: 'clothes', t: function (s) { return /흠\./.test(s); } },
  '자, (시침 무대)': { own: 'clothes', t: function (s) { return /^자, /.test(s); } },
  '한다체 -다. (시침)': { own: 'clothes', t: function (s) { return sentences(s).some(function (q) { return /다\.$/.test(q); }); } },
  '되풀이 (모아)': { own: 'goods', t: function (s) { return /(?<![가-힣])([가-힣]+(?: [가-힣]+)?)[.,]? \1(?![가-힣])/.test(s); } },
  '… (느루)': { own: 'cafe', t: function (s) { return /…/.test(s); } },
  '-는데 · -고 끝 (느루)': { own: 'cafe', t: function (s) { return sentences(s).some(function (q) { return /(는데|인데|은데|고)[.…,]$/.test(q); }) || /(는데|인데|고),$/.test(s); } },
  '-해도 되 (느루)': { own: 'cafe', t: function (s) { return /도 되/.test(s); } },
  '있잖아 (토리)': { own: 'sleep-1', t: function (s) { return /있잖아/.test(s); } },
  '아, 로 받기 (토리)': { own: 'sleep-1', t: function (s) { return /(^|[.…] )아, /.test(s); } },   /* 11-28 검사: 「아, 그건 내 얘기야.」 는 토리 것 */
  '-대 · -래 (토리)': { own: 'sleep-1', t: function (s) { return sentences(s).some(function (q) { return /(대|(?<!고)래)\.$/.test(q); }); } },
  '툭 · 통 · 쿵 꼬리 (소금)': { own: 'sleep-2', t: function (s) { return sentences(s).some(function (q) { return /^(툭|통|쿵)\.$/.test(q); }); } },
  '색 이름 (몽돌)': { own: 'sleep-3', t: function (s) { return (s.match(COLOR) || []).length >= 1; } },
  '어이 (뱃고동)': { own: 'sleep-4', t: function (s) { return /어이/.test(s); } },
  '-지. (뱃고동)': { own: 'sleep-4', t: function (s) { return sentences(s).some(function (q) { return /지\.$/.test(q) && !/(편지|소식지|쪽지|가지|먼지|까지)\.$/.test(q); }) || /지,/.test(s) && /묶었지/.test(s); } },
  '크기 견줌 (뱃고동)': { own: 'sleep-4', t: function (s) { return /[가-힣]만 (한|하지|해서)(?![가-힣])|만큼/.test(s); } },   /* 11-28 검사: 「○○만 한」 은 뱃고동 것 */
  '끝. (소라)': { own: 'stylist', t: function (s) { return sentences(s).some(function (q) { return /(^|, )끝\.$/.test(q); }); } },
  '시킴말 (소라)': { own: 'stylist', t: function (s) { return sentences(s).some(function (q) { return /(^|\s)(앉아|가만|봐|들어)\.$/.test(q); }); } },
  '-ㄹ게 (소라)': { own: 'stylist', t: function (s) { var m = s.match(/([가-힣])게\./g) || []; return m.some(function (z) { return lastJong(z[0]) === 8; }); } }
};
var markShare = {};
Object.keys(MARK).forEach(function (name) {
  var M = MARK[name];
  CAST.forEach(function (c) {
    var L = all(c), hit = L.filter(function (x) { return x.b.some(M.t); });
    if (c.id === M.own) { markShare[name] = hit.length + '/' + L.length; ok(hit.length >= 2, name + ' — 제 문어 줄에 둘 이상 (지금 ' + hit.length + ')'); }
    else hit.forEach(function (x) { ok(false, name + ' 가 ' + c.name + ' 줄에 샜다: ' + x.b.join(' / ')); });
    if (c.id !== M.own && !hit.length) pass++;
  });
});
/* 말버릇 (첫 표지) 은 줄의 25 ~ 80 % 에만 — 모든 줄에 붙으면 닳는다 */
var TIC = { clothes: '흠. (시침)', goods: '되풀이 (모아)', cafe: '… (느루)', 'sleep-1': '있잖아 (토리)', 'sleep-2': '툭 · 통 · 쿵 꼬리 (소금)', 'sleep-3': '색 이름 (몽돌)', 'sleep-4': '어이 (뱃고동)', stylist: '끝. (소라)' };
var NUM = /[0-9]|하나|둘|셋|넷|다섯|여섯|일곱|여덟|아홉|열|스물|서른|마흔|쉰|백|천|첫째|둘째|셋째|넷째|한 번|두 번|세 번|석 장|\{n\}|\{shells\}|\{need\}/;
var stats = CAST.map(function (c) {
  var L = all(c), nb = 0, nc = 0, ns = 0, tic = 0, num = 0, two = 0;
  L.forEach(function (x) {
    if (x.b.length === 2) two++;
    if (x.b.some(MARK[TIC[c.id]].t)) tic++;
    if (x.b.some(function (s) { return NUM.test(s); })) num++;
    x.b.forEach(function (s) { nb++; nc += Array.from(s.replace(/\{\w+\}/g, '가나다라')).length; ns += sentences(s).length; });
  });
  var t = tic / L.length;
  ok(t >= 0.2 && t <= 0.8, c.name + ' 말버릇 몫 20~80 % (지금 ' + Math.round(t * 100) + ' %)');
  return { id: c.id, name: c.name, lines: L.length, script: L.filter(function (x) { return !/^seed/.test(x.key); }).length, bubblesPerLine: nb / L.length, charsPerBubble: nc / nb, charsPerLine: nc / L.length, sentPerBubble: ns / nb, two: two / L.length, tic: t, num: num / L.length };
});

/* ── 4. 진짜 시험: r4 의 NPC 에 새 대본을 끼워 tools/test-npc.js 를 돌린다 ── */
var SB = path.join(DIR, 'sandbox');
fs.mkdirSync(path.join(SB, 'js'), { recursive: true }); fs.mkdirSync(path.join(SB, 'tools'), { recursive: true });
fs.writeFileSync(path.join(SB, 'js', 'npc.js'), [
  "/* sandbox: r4 의 js/npc.js 를 읽어 새 대본 · 이름 · 모자를 끼운다 (r4 는 고치지 않는다) */",
  "var NPC = require(" + JSON.stringify(path.join(R4, 'js', 'npc.js')) + "), CAST = require(" + JSON.stringify(path.join(DIR, 'cast.js')) + ");",
  "CAST.forEach(function (c) { var L = NPC.lines[c.id]; Object.keys(L).forEach(function (k) { delete L[k]; }); Object.keys(c.lines).forEach(function (k) { L[k] = c.lines[k]; }); NPC.roster[c.id].name = c.name; NPC.roster[c.id].hat = c.hat; });",
  "module.exports = NPC;", ''].join('\n'));
fs.copyFileSync(path.join(R4, 'tools', 'test-brain.js'), path.join(SB, 'tools', 'test-brain.js'));
var HATS8 = "['none', 'beret', 'apron', 'cap', 'pencil', 'toque', 'rope', 'combs']";
var t2 = tnpc.split("['beret', 'apron', 'cap'].indexOf").join(HATS8 + '.indexOf').split("['none', 'beret', 'apron', 'cap'].indexOf").join(HATS8 + '.indexOf');
ok(t2 !== tnpc, '시험의 모자 목록 세 곳을 새 id 로 넓혔다 (N 이 진짜 시험에서 할 일)');
fs.writeFileSync(path.join(SB, 'tools', 'test-npc.js'), t2);
var real = cp.spawnSync('node', [path.join(SB, 'tools', 'test-npc.js')], { encoding: 'utf8' });
var realOut = (real.stdout || '').trim().split('\n');
ok(real.status === 0, '진짜 tools/test-npc.js (모자 목록만 넓힘) 통과: ' + realOut.slice(-6).join(' | '));
/* 열쇠가 r4 와 딱 같은지 */
var NPC0 = require(path.join(R4, 'js', 'npc.js'));
CAST.forEach(function (c) { ok(Object.keys(c.lines).slice().sort().join() === NPC0.keys(c.id).slice().sort().join(), c.name + ' 열쇠가 r4 와 같다'); });

var blind = {}; CAST.forEach(function (c) { var L = all(c), own = Object.keys(MARK).filter(function (k) { return MARK[k].own === c.id; }); blind[c.name] = L.filter(function (x) { return own.some(function (k) { return x.b.some(MARK[k].t); }); }).length + '/' + L.length; });
var res = { blind: blind, pass: pass, fail: fail, fails: fails, stats: stats, markShare: markShare, real: realOut[realOut.length - 1], total: CAST.reduce(function (n, c) { return n + all(c).length; }, 0) };
fs.writeFileSync(path.join(DIR, 'check.result.json'), JSON.stringify(res, null, 1));
if (require.main === module) {
  stats.forEach(function (s) { console.log(s.name + '  줄 ' + s.lines + ' (대본 ' + s.script + ') · 풍선/줄 ' + s.bubblesPerLine.toFixed(2) + ' · 글자/풍선 ' + s.charsPerBubble.toFixed(1) + ' · 글자/줄 ' + s.charsPerLine.toFixed(1) + ' · 문장/풍선 ' + s.sentPerBubble.toFixed(2) + ' · 말버릇 ' + Math.round(s.tic * 100) + '% · 수 ' + Math.round(s.num * 100) + '%'); });
  console.log('표지 몫: ' + JSON.stringify(markShare));
  console.log('이름 가린 시험 (제 표지가 걸리는 줄): ' + JSON.stringify(blind));
  console.log('진짜 시험: ' + res.real);
  console.log('bible check: ' + pass + ' passed, ' + fail + ' failed (줄 ' + res.total + ')');
  process.exit(fail ? 1 : 0);
}
module.exports = res;
