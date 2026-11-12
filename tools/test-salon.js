#!/usr/bin/env node
/* tools/test-salon.js - 미용실 규칙 (js/salon.js) 시험. node 만, 의존성 없음. 실패하면 exit 1.
 *
 *   node tools/test-salon.js          (-v: 통과한 검사도 한 줄씩)
 *
 * 스펙 9.1 (docs/SALON.md) 의 1-11 과, 미용실 쪽 MODEL_VOICE 점검 (스펙 9.2 와 같은 것, test-model-voice 에는 2부에서 잇는다):
 *    0 불러오기: module.exports + 전역 SALON, DOM / 시계 / 저장소 / 모듈 문법 없음
 *    1 결정성: Math.random, Date.now 가 던져도 돈다. 시드 사본 = BRAIN.hashSeed / rng. BRAIN 이 있으면 그것을 쓴다. 시드에 색이 없다
 *    2 규칙: 처음 한 번 dye, 횟수 무관, 색 / 쓰다듬기 / 산책 / affinity / 등불 무관, 고정 예 5개
 *    3 분포: 문어 40 x 365일
 *    4 canAsk: 오늘 물음, 다음 로컬 날, TZ=Asia/Seoul 자식 프로세스, 자는 중 / 나감 / 바쁨 / 거울 없음
 *    5 bottles, 같은 색 7일 쉼, canOffer
 *    6 문구: 취향어 / 압박어 0건, KS X 1001, 길이, '오늘은', 화면 글자 규칙 (smoke U), salon.js 의 글자가 서브셋을 늘리지 않음
 *    7 요청: 키 허용 목록, keep 첫째, 이유 칸 없음, 400 B 이하, 확률 / 쉼 / 지난 대답 없음, 고정 문맥
 *    8 readReply    9 normalize    10 merge    11 look
 *   12 commit / rows / staging + 모델 목소리 (말 그대로, 없으면 문어 행 없음, 데모가 모델로 적히지 않음, 사람 답엔 기쁨 없음, 재요청 0)
 *   13 한 해 돌려 보기 (불변식: 하루 한 번, 색 출처 하나, 쉬는 색은 안 물음, 옮기기 멱등, 적힌 답 = 그날 demoAnswer)
 *   14 복지 지킴 (검토 11-08): 처음 '바꾸기'는 한 번 (doneCount), '그대로' 뒤 동정 바꾸기 없음, 미용실은 아무것도 안 줌 (commit 은 네 칸만),
 *      스펙 글자 그대로 (LINES TEXT TAILS CONTEXT BY_TEXT), 고른 이별 꼬리, fallback / 사람은 말 없음, 빈 답 = 못 읽음, 불러온 offerName 글을 안 실음,
 *      날짜 없으면 못 내밈, dropped 의 색 줄 빼기, 기다림 사본보다 받은 답, lateRaw 그대로, 말풍선은 사람이 보는 글자로
 */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var cp = require('child_process');

var ROOT = path.resolve(__dirname, '..');
var FILE = path.join(ROOT, 'js', 'salon.js');
var SRC = fs.readFileSync(FILE, 'utf8');
var VERBOSE = process.argv.indexOf('-v') >= 0;
var passes = 0, failures = 0;
function check(cond, msg) {
  if (cond) { passes++; if (VERBOSE) console.log('  ok   ' + msg); return true; }
  failures++; console.error('  FAIL ' + msg); return false;
}
function section(name) { console.log('\n== ' + name); }
function guard(fn) {   /* 한 묶음이 던져도 실패 하나로 세고 다음 묶음으로 간다 */
  try { fn(); } catch (e) { failures++; console.error('  FAIL threw: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)); }
}
function canon(x) {   /* 키 순서와 무관한 JSON (다른 vm 의 객체도) */
  if (Array.isArray(x)) return '[' + x.map(canon).join(',') + ']';
  if (x && typeof x === 'object') return '{' + Object.keys(x).sort().map(function (k) { return JSON.stringify(k) + ':' + canon(x[k]); }).join(',') + '}';
  return JSON.stringify(x);
}
function same(a, b) { return canon(a) === canon(b); }
function js(x) { return JSON.stringify(x); }
function clone(x) { return JSON.parse(JSON.stringify(x)); }
function len(s) { return Array.from(String(s)).length; }
function bytes(s) { return Buffer.byteLength(String(s), 'utf8'); }

/* ---------- 불러오기: 진짜 module.exports + 따로 떨어진 vm 셋 (BRAIN 없음 / 진짜 BRAIN / 가짜 BRAIN) ---------- */
var S = require(FILE);
function context(globals) {
  var ctx = vm.createContext(Object.assign({ console: console }, globals || {}));
  return ctx;
}
var ctxCopy = context();
vm.runInContext(SRC, ctxCopy, { filename: 'js/salon.js' });
var ctxBrain = context();
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'brain.js'), 'utf8'), ctxBrain, { filename: 'js/brain.js' });
vm.runInContext(SRC, ctxBrain, { filename: 'js/salon.js' });
var spyCalls = [], spySeeds = [];
var ctxSpy = context({ BRAIN: {
  hashSeed: function () { spyCalls.push(Array.prototype.slice.call(arguments)); return 12345; },
  rng: function (seed) { spySeeds.push(seed); return function () { return 0.5; }; }
} });
vm.runInContext(SRC, ctxSpy, { filename: 'js/salon.js' });
var B = ctxBrain.BRAIN, SB = ctxBrain.SALON, SC = ctxCopy.SALON, SS = ctxSpy.SALON;

/* 시계와 Math.random 이 던지게 (SALON 이 쓰면 바로 터진다). 자식 프로세스를 띄울 때만 잠깐 돌려 둔다 */
var REAL = { random: Math.random, now: Date.now };
function throwers() {
  Math.random = function () { throw new Error('Math.random was called'); };
  Date.now = function () { throw new Error('Date.now was called'); };
}
function realClock(fn) { Math.random = REAL.random; Date.now = REAL.now; try { return fn(); } finally { throwers(); } }
var THROW_SRC = "Math.random = function () { throw new Error('Math.random was called'); }; Date.now = function () { throw new Error('Date.now was called'); };";
[ctxCopy, ctxBrain, ctxSpy].forEach(function (c) { vm.runInContext(THROW_SRC, c); });
throwers();

/* ---------- 시험 기록 만들기 ---------- */
var BORN = 1762600000000;
var RED = '#e8463c', ORANGE = '#f08a3c', PURPLE = '#9a5cc8', BLUE = '#4a86d8', GREEN = '#4fa868', PINK = '#f07aa8';
var HEXES = [RED, ORANGE, PURPLE, BLUE, GREEN, PINK];
var D0 = '2026-11-09';
function base(o) {
  o = o || {};
  var first = o.first || RED, cur = o.color || first;
  var s = {
    v: 2,
    octopus: { name: o.name === undefined ? '뚜루' : o.name, born: o.born || BORN, trips: 4, invites: 2, days: [], affinity: { sea: 3 }, visits: {}, state: 'idle',
      color: cur, colors: [{ at: BORN, date: '2025-11-08', color: first, how: 'first', by: o.firstBy || 'player' }] },
    room: { lantern: o.lantern == null ? 2 : o.lantern, souvenirs: [], posterOrder: [] },
    trips: [], notes: {}, curiosityNotes: [],
    settings: { motion: 'auto', octColor: cur },
    salon: { asks: [] }
  };
  if (cur !== first) s.octopus.colors.push({ at: BORN + 1000, date: '2025-11-09', color: cur, how: 'dev', by: 'dev' });
  return s;
}
function at(day, hour) { var p = day.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2], hour == null ? 3 : hour, 0); }
/* 물어보기 한 번 (만들고 적는다). 그날 날짜는 늘 직접 준다 (시간대와 무관한 시험) */
function ask(s, day, offer, answer, ms) {
  var a = S.makeAsk(s, { at: ms != null ? ms : at(day), today: day, offer: offer, answer: answer });
  if (a) S.commit(s, a);
  return a;
}
var PREF = /좋아|좋았|사랑|싫어|싫었|미워|최애|취향|즐겨|반했|단골|그리워|설레/;
/* 압박어: 스펙 5 의 정규식 + 활용형 칭찬 (예뻐 예뻤 귀여워 멋지다 멋져 — '예쁘', '귀엽' 은 그 꼴을 못 잡는다. 스펙 5 와 test-model-voice 에도 더할 것) */
var PRESS = /예쁘|예뻐|예뻤|어울|귀엽|귀여|멋지|멋져|원해|원하|해 줘|해줘|부탁|제발|한번만|한 번만|기대|실망|아쉬|미안|섭섭|서운|슬퍼|속상/;
/* 탓, 약속, 설교, 재촉 (스펙 5 '토스트' '설정 안내' 줄: '벌써 물어봤잖아' '내일은 될 거야' '문어 몸은 문어 거야' 같은 말이 없다) */
var BLAME = /탓|벌써|잖아|빨리|서둘|어서|골라 줘|기다려 줘|해 봐|꼭|내일은|다음엔|될 거야|지쳤|삐졌|문어 몸은|문어 거야/;
/* smoke U: 플레이어 화면 글자 (이모지, 꾸밈 기호, 이모티콘 없음) */
var GLYPH_BAD = /[^\sA-Za-z0-9.,!?:;'"()\/%+~\-ᄀ-ᇿ㄰-㆏가-힣·…‘’“”—–]/gu;
var EMOTE = /zZ|Zz|\^\^|<3|[:;]-?[()]|T_T|>_</g;
function glyphBad(t) { var x = String(t).replace(/#(?=\d)/g, ''); return (x.match(GLYPH_BAD) || []).concat(x.match(EMOTE) || []); }

/* =================================================================== */
section('0. load: module.exports and global SALON, no DOM / clock / storage / module syntax');
check(S && typeof S === 'object' && global.SALON === S, 'require() returns SALON and sets the global');
check(SC && typeof SC.demoAnswer === 'function' && SC !== S, 'loads as a plain script in a bare context (no module, window or document): global SALON');
var API = ['isHex', 'normHex', 'isPreset', 'colorName', 'shortName', 'dateKey', 'addDays', 'firstColor', 'doneCount', 'bottles', 'restingUntil', 'todaysAsk',
  'canAsk', 'canOffer', 'demoAnswer', 'humanAnswer', 'makeAsk', 'commit', 'request', 'readReply', 'bubble', 'rows', 'staging', 'merge', 'normalize', 'look', 'hashSeed', 'rng'];
var missing = API.filter(function (k) { return typeof S[k] !== 'function'; });
check(missing.length === 0, 'API functions exist (' + API.length + ')' + (missing.length ? ' missing: ' + missing.join(', ') : ''));
check(S.P_YES === 0.625 && S.REST_DAYS === 7 && S.COUNT_NONE === true && S.LINE_SHOW === 24 && S.MIRROR_LEVEL === 2 && S.MINE_MS === 60000,
  'constants: P_YES 0.625, REST_DAYS 7, COUNT_NONE true, LINE_SHOW 24, MIRROR_LEVEL 2, MINE_MS 60000');
check(same(S.EXPRS, ['idle', 'happy', 'curious', 'calm']) && Object.isFrozen(S.EXPRS), "EXPRS = ['idle','happy','curious','calm'] (frozen)");
check(same(S.PRESETS, [{ hex: RED, short: '빨강', name: '빨간색' }, { hex: ORANGE, short: '주황', name: '주황색' }, { hex: PURPLE, short: '보라', name: '보라색' },
  { hex: BLUE, short: '파랑', name: '파란색' }, { hex: GREEN, short: '초록', name: '초록색' }, { hex: PINK, short: '분홍', name: '분홍색' }]), 'PRESETS: 6 colours, order, short and sentence names (spec 5)');
check(Object.isFrozen(S.PRESETS) && Object.isFrozen(S.PRESETS[0]) && Object.isFrozen(S.LINES) && Object.isFrozen(S.LINES.dye) && Object.isFrozen(S.TEXT), 'PRESETS, LINES, TEXT are frozen');
check(S.DEFAULT_COLOR === RED, 'default colour is red ' + RED);
guard(function () {
  var code = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/.*$/gm, '$1');
  check(!/Math\.random/.test(SRC), 'js/salon.js text has no Math.random (comments included)');
  check(!/Date\.now|performance\.now|new Date\(\s*\)/.test(SRC), 'js/salon.js text has no Date.now / performance.now / new Date() (it never reads the clock)');
  var bad = ['document', 'localStorage', 'sessionStorage', 'indexedDB', 'setTimeout', 'setInterval', 'requestAnimationFrame', 'fetch(', 'XMLHttpRequest', 'navigator', 'location', 'require('].filter(function (w) { return code.indexOf(w) >= 0; });
  check(bad.length === 0, 'js/salon.js code has no DOM, storage, timer, network or require' + (bad.length ? ' (' + bad.join(', ') + ')' : ''));
  check(!/^\s*(import|export)\s/m.test(code), 'no ES module syntax (file:// safe classic script)');
});

/* =================================================================== */
section('1. determinism: seeded only, copies = BRAIN, BRAIN used when present, no colour in the seed');
guard(function () {
  var errs = 0, n = 0, R = S._copy.rng(20261108);
  for (var i = 0; i < 400; i++) {
    var args = ['salon', S.addDays(D0, Math.floor(R() * 900)), ['뚜루', '안개', 'Octo', '', '문어 이름이 꽤 긴 문어', '🐙'][i % 6], String(Math.floor(R() * 2e12))];
    if (i % 7 === 0) args.push(null, undefined, 42);
    n++;
    if (S._copy.hashSeed.apply(null, args) !== B.hashSeed.apply(null, args)) errs++;
    var seed = (R() * 4294967296) >>> 0, a = S._copy.rng(seed), b = B.rng(seed);
    for (var k = 0; k < 4; k++) if (a() !== b()) errs++;
  }
  check(errs === 0, 'FNV-1a and mulberry32 copies equal BRAIN.hashSeed / BRAIN.rng (' + n + ' argument lists, 4 draws each)');
  check(SB.hashSeed('salon', 'x') === B.hashSeed('salon', 'x') && S.hashSeed('salon', 'x') === B.hashSeed('salon', 'x'), 'SALON.hashSeed resolves to BRAIN when loaded, to the copy otherwise (same value)');
  var diff = 0, total = 0;
  ['뚜루', '안개', 'a'].forEach(function (nm, j) {
    for (var d = 0; d < 120; d++) {
      var q = { dateKey: S.addDays(D0, d), name: nm, born: BORN + j * 99991, asksBefore: 1 + (d % 3) };
      var x = S.demoAnswer(q), y = SC.demoAnswer(q), z = SB.demoAnswer(q), w = S.demoAnswer(q);
      total++;
      if (!same(x, y) || !same(x, z) || !same(x, w)) diff++;
    }
  });
  check(diff === 0, 'same input gives the same answer: twice, without BRAIN and with BRAIN (' + total + ' inputs, Math.random and Date.now throw)');
  spyCalls.length = 0; spySeeds.length = 0;
  var r = SS.demoAnswer({ dateKey: D0, name: '뚜루', born: BORN, asksBefore: 1, from: BLUE, offer: PURPLE });
  check(same(spyCalls, [['salon', D0, '뚜루', String(BORN)]]), "seed = hashSeed('salon', dateKey, name, String(born)) via BRAIN when present: " + js(spyCalls));
  check(same(spySeeds, [12345, (12345 ^ 0x9e3779b9) >>> 0]) && r.seed === 12345 && r.action === 'dye' && r.line === S.LINES.dye[1],
    'action from rng(seed) first value, line from rng((seed ^ 0x9e3779b9) >>> 0) (fake BRAIN: r 0.5 gives dye, line 1)');
  spyCalls.length = 0;
  var st = base(); st.salon.asks.push({ id: 'ask_old', date: '2026-11-01', at: at('2026-11-01'), from: RED, offer: BLUE, status: 'done', action: 'keep', by: 'demo-rules' });
  HEXES.slice(1).forEach(function (h) { SS.makeAsk(st, { at: at(D0), today: D0, offer: h }); });
  var seedCalls = spyCalls.filter(function (c) { return c[0] === 'salon'; });
  check(seedCalls.length === 5 && seedCalls.every(function (c) { return c.length === 4 && !/#|색|빨강|주황|보라|파랑|초록|분홍/.test(c.join('|')); }),
    'makeAsk: the decision seed never sees a colour (5 offers, ' + seedCalls.length + " 'salon' seeds, args " + js(seedCalls[0]) + ')');
});

/* =================================================================== */
section('2. rules: first ask dyes, count-free, colour-free, fixed examples');
guard(function () {
  var f = S.demoAnswer({ dateKey: D0, name: '뚜루', born: BORN, asksBefore: 0 });
  check(same(f, { action: 'dye', by: 'demo-rules', rule: 'first', seed: null, line: S.LINES.dye[0], expr: 'happy' }), "asksBefore 0: dye, rule 'first', seed null, first dye line, happy: " + js(f));
  var seedPath = S.demoAnswer({ dateKey: D0, name: '뚜루', born: BORN, asksBefore: 1 }), odd = [undefined, null, NaN, -1, '0', '', 0.5, Infinity, {}];
  var oddBad = odd.filter(function (v) { var x = S.demoAnswer({ dateKey: D0, name: '뚜루', born: BORN, asksBefore: v }); return !same(x, seedPath) || x.rule !== 'seed'; });
  check(oddBad.length === 0 && seedPath.action === 'keep', 'only asksBefore === 0 is the first ask: missing / invalid counts (undefined, null, NaN, -1, \'0\', 0.5, ...) take the seed path, so a caller that forgets the count can never make every answer a dye (spec 4)' + (oddBad.length ? ' bad: ' + js(oddBad.map(String)) : ''));
  /* 검증 11-10 W8: '맨 처음은 꼭 바꾸기' 는 이름 붙은 상수 (주인이 아직 확인하지 않은 기본값 — 값은 그대로 true). 끄면 맨 처음도 시드 길이다 */
  var noFirst;
  try { S.FIRST_DYE = false; noFirst = S.demoAnswer({ dateKey: D0, name: '뚜루', born: BORN, asksBefore: 0 }); } finally { S.FIRST_DYE = true; }
  check(S.FIRST_DYE === true && same(noFirst, seedPath) && noFirst.rule === 'seed' && S.demoAnswer({ dateKey: D0, name: '뚜루', born: BORN, asksBefore: 0 }).rule === 'first',
    "FIRST_DYE is a named constant and is true; with it off the very first ask takes the seed path too (" + js(noFirst.action) + "), with it back on the first ask is rule 'first'");
  var diff = 0, n = 0;
  ['뚜루', '안개', '삐죠', 'Octo'].forEach(function (nm, j) {
    for (var d = 0; d < 365; d++) {
      var q = { dateKey: S.addDays(D0, d), name: nm, born: BORN + j * 50000000 }, a1 = S.demoAnswer(Object.assign({ asksBefore: 1 }, q));
      n++;
      if (!same(a1, S.demoAnswer(Object.assign({ asksBefore: 9 }, q))) || !same(a1, S.demoAnswer(Object.assign({ asksBefore: 250 }, q)))) diff++;
    }
  });
  check(diff === 0, 'asksBefore 1, 9 and 250 give the same answer (' + n + ' days): asking more never changes the odds');
  var plain = { dateKey: '2026-11-20', name: '뚜루', born: BORN, asksBefore: 3 };
  var noisy = Object.assign({}, plain, { from: BLUE, offer: PINK, pets: 99, taps: 40, trips: 50, affinity: { sea: 9 }, lantern: 8, at: at('2026-11-20', 22), sheetOpenMs: 9000, bottlePresses: 7, isFirst: true, lastAnswers: ['keep', 'keep', 'keep'] });
  check(same(S.demoAnswer(plain), S.demoAnswer(noisy)), 'colour, pets, taps, trips, affinity, lantern, time, sheet time, presses, past answers are ignored (the function does not take them)');
  /* 같은 날 같은 문어: 어떤 색을 어떤 지금 색에서 내밀어도, 기록에 무엇이 쌓여 있어도 답이 같다 */
  var answers = {}, keys = 0;
  HEXES.forEach(function (cur) {
    HEXES.forEach(function (offer) {
      if (offer === cur) return;
      var s = base({ color: cur });
      s.salon.asks.push({ id: 'ask_p', date: '2026-11-01', at: at('2026-11-01'), from: RED, offer: GREEN, status: 'done', action: 'dye', by: 'demo-rules' });
      if (offer === ORANGE) { s.room.lantern = 8; s.octopus.affinity = { sea: 99 }; s.octopus.trips = 300; s.trips = [{ id: 't1' }, { id: 't2' }]; }
      var a = S.makeAsk(s, { at: at('2026-11-20'), today: '2026-11-20', offer: offer });
      answers[a.action + '|' + a.line + '|' + a.seed + '|' + a.expr] = 1; keys++;
    });
  });
  check(Object.keys(answers).length === 1 && keys === 30, 'makeAsk: one answer for all 30 (now colour, offered colour) pairs on one day, whatever the record holds: ' + Object.keys(answers)[0]);
  var FIXED = [
    ['2026-11-09', '뚜루', 1762600000000, 'keep', 0.7523, 3922112899, '이대로 있을래.'],
    ['2026-11-10', '뚜루', 1762600000000, 'keep', 0.9416, 478326885, '안 바꿀래.'],
    ['2026-11-11', '뚜루', 1762600000000, 'dye', 0.0150, 3404652688, '그래, 바꿔 볼래.'],
    ['2026-11-09', '안개', 1762650000000, 'keep', 0.8623, 2079199854, '지금 색 그대로 있을래.'],
    ['2026-11-12', '삐죠', 1762700000000, 'dye', 0.5729, 4065987748, '그래, 바꿔 볼래.']
  ];
  FIXED.forEach(function (e) {
    var a = S.demoAnswer({ dateKey: e[0], name: e[1], born: e[2], asksBefore: 1 }), r = S.rng(a.seed)();
    check(a.action === e[3] && a.seed === e[5] && r.toFixed(4) === e[4].toFixed(4) && a.line === e[6] && a.rule === 'seed' && a.by === 'demo-rules' && a.expr === (e[3] === 'dye' ? 'happy' : 'idle'),
      'fixed example ' + e.slice(0, 3).join(' ') + ': ' + a.action + ' r ' + r.toFixed(4) + ' seed ' + a.seed + ' ' + a.line);
  });
});

/* =================================================================== */
section('3. distribution: 40 octopi x 365 days');
guard(function () {
  var names = ['뚜루', '안개', '삐죠', '문', 'a', 'Octo', '1', '9'], yes = 0, n = 0, per = [], lines = { dye: [0, 0, 0], keep: [0, 0, 0] }, longest = 0;
  names.forEach(function (nm) {
    for (var b = 0; b < 5; b++) {
      var born = 1762600000000 + b * 86400000 * 3 + nm.length * 7777, y = 0, run = 0;
      for (var d = 0; d < 365; d++) {
        var a = S.demoAnswer({ dateKey: S.addDays(D0, d), name: nm, born: born, asksBefore: 1 });
        n++;
        if (a.action === 'dye') { yes++; y++; run = 0; } else { run++; if (run > longest) longest = run; }
        lines[a.action][S.LINES[a.action].indexOf(a.line)]++;
      }
      per.push(y / 365);
    }
  });
  var share = yes / n, lo = Math.min.apply(null, per), hi = Math.max.apply(null, per);
  console.log('   dye share ' + share.toFixed(4) + ', per octopus ' + lo.toFixed(3) + '-' + hi.toFixed(3) + ', longest keep run ' + longest + ', lines dye ' + lines.dye.join('/') + ' keep ' + lines.keep.join('/'));
  check(per.length === 40 && n === 14600, '40 octopi x 365 days = ' + n + ' answers');
  check(share >= 0.58 && share <= 0.67, "overall 'dye' share in 0.58-0.67 (" + share.toFixed(4) + ')');
  check(lo >= 0.52 && hi <= 0.72, "per-octopus 'dye' share in 0.52-0.72 (" + lo.toFixed(3) + '-' + hi.toFixed(3) + ')');
  ['dye', 'keep'].forEach(function (k) {
    var t = lines[k].reduce(function (x, y) { return x + y; }, 0);
    check(lines[k].every(function (c) { return c / t >= 0.30; }), k + ': each of the 3 lines is picked 30 % or more (' + lines[k].map(function (c) { return (100 * c / t).toFixed(1) + '%'; }).join(' ') + ')');
  });
});

/* =================================================================== */
section('4. canAsk: once per local day, the octopus state, TZ=Asia/Seoul');
guard(function () {
  var s0 = base();
  check(same(S.canAsk(s0, D0, 'idle'), { ok: true, reason: null }), 'named octopus, 2 lanterns, awake, no ask today: ok');
  var kinds = [
    ['dye', S.demoAnswer({ asksBefore: 0 }), 'asked_today'],
    ['keep', S.humanAnswer('keep'), 'asked_today'],
    ['no answer (human)', S.humanAnswer(null), 'asked_today'],
    ['no answer (fallback)', { action: null, by: 'fallback' }, 'asked_today'],
    ['out of menu (model)', { action: null, actionRaw: 'no', by: 'model', raw: '{"action":"no"}' }, 'asked_today'],
    ['waiting (model)', { status: 'waiting', by: 'model', via: 'sampling', sent: 1 }, 'waiting']
  ];
  kinds.forEach(function (k) {
    var s = base(), a = ask(s, D0, BLUE, k[1]);
    var today = S.canAsk(s, D0, 'idle'), next = S.canAsk(s, S.addDays(D0, 1), 'idle');
    check(!!a && today.ok === false && today.reason === k[2] && next.ok === true, 'today has a ' + k[0] + ' ask: ' + today.reason + '; the next local day opens (' + js(next) + ')');
  });
  var sd = base(); sd.salon.asks.push({ id: 'ask_x', date: D0, at: at(D0), from: RED, offer: BLUE, status: 'dropped', action: 'dye', by: 'demo-rules' });
  check(S.canAsk(sd, D0, 'idle').ok === true, 'a dropped ask (another tab asked first) does not count');
  var sw = base(); sw.salon.asks.push({ id: 'ask_w', date: S.addDays(D0, -1), at: at(S.addDays(D0, -1)), from: RED, offer: BLUE, status: 'waiting', action: null, by: 'model' });
  check(S.canAsk(sw, D0, 'idle').ok === true, "yesterday's waiting ask does not block today (normalize closes it)");
  var octs = [
    ['sleep', 'asleep'], [{ state: 'sleep' }, 'asleep'], [{ asleep: true }, 'asleep'], ['away', 'away'], [{ state: 'away', busy: true }, 'away'],
    [{ busy: true }, 'busy'], [{ state: 'walk', busy: true }, 'busy'], [{ mirror: false }, 'no_mirror'],
    ['idle', null], ['walk', null], ['pet', null], ['stay', null], [undefined, null], [{ state: 'idle', busy: false }, null]
  ];
  octs.forEach(function (o) {
    var r = S.canAsk(base(), D0, o[0]);
    check(o[1] ? (r.ok === false && r.reason === o[1]) : r.ok === true, 'octopus ' + js(o[0] === undefined ? null : o[0]) + ': ' + (o[1] || 'ok') + ' (' + js(r) + ')');
  });
  check(S.canAsk(base({ lantern: 1 }), D0, 'idle').reason === 'no_mirror' && S.canAsk(base({ lantern: 0 }), D0, { mirror: true }).ok === true && S.canAsk(base({ lantern: 1 }), D0, { lantern: 2 }).ok === true,
    'no mirror before 2 lanterns (state.room.lantern), unless the caller says mirror / lantern');
  var sa = base(); ask(sa, D0, BLUE);
  check(S.canAsk(base({ lantern: 1 }), D0, 'sleep').reason === 'no_mirror' && S.canAsk(sa, D0, 'sleep').reason === 'asleep' && S.canAsk(sa, D0, { busy: true, state: 'sleep' }).reason === 'busy',
    'reason order follows the mirror button table: no_mirror, away, busy, asleep, then waiting / asked_today');
  check(S.canAsk(base(), 'not-a-day', 'idle').reason === 'no_date' && S.canAsk(base(), '2026-02-30', 'idle').reason === 'no_date' && S.canAsk(base(), null, 'idle').reason === 'no_date',
    'an unreadable date never opens the salon (no_date)');
  var sk = base(); ask(sk, D0, BLUE);
  check(S.canAsk(sk, new Date(2026, 10, 9, 12, 0), 'idle').reason === 'asked_today' && S.canAsk(sk, new Date(2026, 10, 9, 12, 0).getTime(), 'idle').reason === 'asked_today',
    'today may also be a Date or ms (read with the local calendar)');
  S.COUNT_NONE = false;
  var sn = base(); ask(sn, D0, BLUE, S.humanAnswer(null));
  var sk2 = base(); ask(sk2, D0, BLUE, S.humanAnswer('keep'));
  check(S.canAsk(sn, D0, 'idle').ok === true && S.canAsk(sk2, D0, 'idle').reason === 'asked_today', 'COUNT_NONE false: a no-answer ask does not use up the day, a keep still does');
  S.COUNT_NONE = true;
  check(S.canAsk(sn, D0, 'idle').reason === 'asked_today', 'COUNT_NONE true (default): a no-answer ask uses up the day');
  /* 자식 프로세스: TZ 별로 같은 순간을 본다. 서울 08:30 = UTC 전날 23:30 */
  var CHILD = [
    "var S = require(process.argv[1]);",
    "Math.random = function () { throw new Error('Math.random'); }; Date.now = function () { throw new Error('Date.now'); };",
    "var t = Date.UTC(2026, 10, 8, 23, 30);",
    "function st(day) {",
    "  var s = { octopus: { name: 'x', born: 1, color: '#e8463c', colors: [{ at: 1, date: null, color: '#e8463c', how: 'first', by: 'player' }] }, room: { lantern: 2 }, settings: {}, salon: { asks: [] } };",
    "  if (day) s.salon.asks.push({ id: 'ask_t', date: day, at: t - 3600000, from: '#e8463c', offer: '#9a5cc8', offerKind: 'preset', status: 'done', action: 'keep', by: 'demo-rules' });",
    "  return s;",
    "}",
    "var made = S.makeAsk(st(null), { at: t, offer: '#4a86d8' });",
    "var r = st('2026-10-30');",
    "console.log(JSON.stringify({ tz: Intl.DateTimeFormat().resolvedOptions().timeZone, hour: new Date(t).getHours(), key: S.dateKey(t), keyDate: S.dateKey(new Date(t)),",
    "  afterYesterday: S.canAsk(st('2026-11-08'), t, 'idle'), sameDay: S.canAsk(st('2026-11-09'), new Date(t), 'idle'), made: made && made.date,",
    "  add: [S.addDays('2026-11-01', 1), S.addDays('2026-03-08', 1), S.addDays('2026-12-31', 1), S.addDays('2028-02-28', 1), S.addDays('2026-11-09', -9)],",
    "  rest: [S.restingUntil(r, '#9a5cc8'), S.restingUntil(r, '#9a5cc8', '2026-11-05'), S.restingUntil(r, '#9a5cc8', '2026-11-06')] }));"
  ].join('\n');
  function child(tz) {
    return realClock(function () {
      var out = cp.execFileSync(process.execPath, ['-e', CHILD, FILE], { env: Object.assign({}, process.env, { TZ: tz }), encoding: 'utf8' });
      return JSON.parse(out);
    });
  }
  var seoul = child('Asia/Seoul'), utc = child('UTC'), ny = child('America/New_York');
  var ADD = ['2026-11-02', '2026-03-09', '2027-01-01', '2028-02-29', '2026-10-31'], REST = ['2026-11-06', '2026-11-06', null];
  check(seoul.tz === 'Asia/Seoul' && seoul.hour === 8 && seoul.key === '2026-11-09' && seoul.keyDate === '2026-11-09',
    'TZ=Asia/Seoul child: 08:30 (UTC 2026-11-08 23:30) is local day 2026-11-09 (' + js([seoul.tz, seoul.hour, seoul.key]) + ')');
  check(seoul.afterYesterday.ok === true && seoul.sameDay.reason === 'asked_today' && seoul.made === '2026-11-09',
    'Seoul 08:30: an ask dated the 8th was yesterday (ok), one dated the 9th is today (asked_today), a new ask is dated the 9th');
  check(utc.tz === 'UTC' && utc.key === '2026-11-08' && utc.afterYesterday.reason === 'asked_today' && utc.sameDay.ok === true && utc.made === '2026-11-08',
    'control: the same instant under TZ=UTC is still the 8th (so the Seoul result really is the local calendar)');
  check([seoul, utc, ny].every(function (c) { return same(c.add, ADD) && same(c.rest, REST); }),
    'addDays / restingUntil are calendar-only: same in Seoul, UTC and New York (DST ends 2026-11-01, starts 2026-03-08): ' + js(ny.add));
});

/* =================================================================== */
section('5. bottles, the 7-day rest for a colour that got keep, canOffer');
guard(function () {
  var s = base({ color: BLUE });
  var b = S.bottles(s, D0);
  check(b.length === 6 && same(b.map(function (x) { return x.hex; }), HEXES) && b.every(function (x) { return x.kind === 'preset'; }), 'first colour is a preset: 6 preset bottles in order');
  var blue = b[3];
  check(blue.current && !blue.selectable && blue.note === '지금' && blue.aria === '파랑, 지금 색' && blue.say === '지금 이 색이야.' && b.filter(function (x) { return x.current; }).length === 1,
    "current colour: flagged, not selectable, note '지금', aria '파랑, 지금 색', name line '지금 이 색이야.'");
  check(b[0].selectable && !b[0].current && !b[0].resting && b[0].note === null && b[0].aria === '빨강' && b[0].say === '빨간색', "a free bottle: aria short name '빨강', name line '빨간색'");
  var c = base({ first: '#c06040', color: BLUE }), cb = S.bottles(c, D0);
  check(cb.length === 7 && same(cb[6], { hex: '#c06040', short: '처음', name: '처음 색', kind: 'first', current: false, resting: false, selectable: true, note: '처음', aria: '처음 색', say: '처음 색' }),
    "first colour #c06040 (old slider) and now blue: a 7th '처음 색' bottle " + js(cb[6]));
  check(S.bottles(base({ first: '#c06040' }), D0).length === 6, "first colour not a preset but it is the current colour: no 7th bottle");
  check(S.bottles(base({ first: GREEN, color: BLUE }), D0).length === 6, 'first colour is a preset: the preset bottle stands for it (no 7th)');
  var R = S._copy.rng(99), over = 0;
  for (var i = 0; i < 300; i++) {
    var f = '#' + ('00000' + ((R() * 16777216) >>> 0).toString(16)).slice(-6), cur = R() < 0.5 ? f : HEXES[Math.floor(R() * 6)];
    var bb = S.bottles(base({ first: f, color: cur }), D0);
    if (bb.length > 7 || bb.filter(function (x) { return x.current; }).length > 1) over++;
  }
  check(over === 0, 'never more than 7 bottles, never two current ones (300 random first / now colours)');
  /* 7일 쉼 */
  var r = base(); ask(r, D0, BLUE, S.humanAnswer('keep'));
  check(S.restingUntil(r, BLUE) === '2026-11-16' && S.restingUntil(r, PURPLE) === null, "keep on blue on " + D0 + ': blue rests until 2026-11-16, purple does not rest');
  var resting = [], open = [];
  for (var d = 1; d <= 8; d++) {
    var day = S.addDays(D0, d), bl = S.bottles(r, day)[3], off = S.canOffer(r, day, BLUE);
    (bl.resting ? resting : open).push(d);
    if (d < 7) check(bl.resting && !bl.selectable && bl.say === '이 색은 며칠 뒤에 물어볼 수 있어.' && bl.aria === '파랑, 며칠 뒤에 물어볼 수 있어' && off.reason === 'resting' && S.makeAsk(r, { at: at(day), today: day, offer: BLUE }) === null && S.bottles(r, day)[4].selectable,
      'D+' + d + ': blue rests (aria, name line, canOffer resting, makeAsk null), green is free');
  }
  check(S.bottles(r, D0)[3].resting && same(resting, [1, 2, 3, 4, 5, 6]) && same(open, [7, 8]), 'D ... D+6 rest, D+7 opens (resting days ' + resting.join(',') + ')');
  check(S.restingUntil(r, BLUE, S.addDays(D0, 7)) === null && S.restingUntil(r, BLUE, S.addDays(D0, 6)) === '2026-11-16', 'restingUntil(state, hex, today) is null once open');
  ask(r, S.addDays(D0, 7), BLUE, S.humanAnswer('keep'));
  check(S.restingUntil(r, BLUE) === '2026-11-23', 'a second keep after the rest starts a new rest from that day');
  [['dye', S.humanAnswer('dye')], ['no answer', S.humanAnswer(null)], ['fallback', { action: null, by: 'fallback' }], ['out of menu', { action: null, actionRaw: 'no', by: 'model' }]].forEach(function (k) {
    var q = base(); ask(q, D0, PURPLE, k[1]);
    check(S.restingUntil(q, PURPLE) === null && !S.bottles(q, S.addDays(D0, 1))[2].resting, k[0] + ' does not rest the colour');
  });
  var dq = base(); dq.salon.asks.push({ id: 'ask_d', date: D0, at: at(D0), from: RED, offer: PURPLE, status: 'dropped', action: 'keep', by: 'demo-rules' });
  check(S.restingUntil(dq, PURPLE) === null, 'a dropped keep does not rest the colour');
  S.REST_DAYS = 0;
  check(S.restingUntil(r, BLUE) === null && !S.bottles(r, S.addDays(D0, 8))[3].resting, 'REST_DAYS 0 turns the rest off');
  S.REST_DAYS = 7;
  var fr = base({ first: '#c06040', color: BLUE }); ask(fr, D0, '#c06040', S.humanAnswer('keep'));
  check(S.bottles(fr, S.addDays(D0, 2))[6].resting && S.bottles(fr, S.addDays(D0, 2))[6].aria === '처음 색, 며칠 뒤에 물어볼 수 있어', "the '처음 색' bottle rests like any colour");
  var co = base();
  check(S.canOffer(co, D0, 'blue').reason === 'not_hex' && S.canOffer(co, D0, '#123456').reason === 'not_bottle' && S.canOffer(co, D0, RED).reason === 'current' && S.canOffer(co, D0, '#4A86D8').ok === true,
    'canOffer: not_hex, not_bottle, current, ok (hex case does not matter)');
  check(S.makeAsk(co, { at: at(D0), today: D0, offer: RED }) === null && S.makeAsk(co, { at: at(D0), today: D0, offer: '#123456' }) === null, 'makeAsk refuses the current colour and colours that are not bottles');
  ask(co, D0, BLUE);
  check(S.makeAsk(co, { at: at(D0, 5), today: D0, offer: PURPLE }) === null && co.salon.asks.length === 1, 'makeAsk refuses a second ask on the same day');
  check(S.makeAsk(base(), { offer: BLUE }) === null && S.makeAsk(base(), { at: 'x', offer: BLUE }) === null, 'makeAsk with no date and no time returns null (it never guesses now)');
});

/* =================================================================== */
section('6. words: no preference / pressure words, KS X 1001, lengths, glyphs');
function ksSet() {   /* KS X 1001 한글 음절 2,350자: EUC-KR 0xB0A1-0xC8FE 를 풀어서 */
  var dec = new TextDecoder('euc-kr'), set = {}, n = 0;
  for (var hi = 0xB0; hi <= 0xC8; hi++) for (var lo = 0xA1; lo <= 0xFE; lo++) {
    var ch = dec.decode(Buffer.from([hi, lo]));
    if (/^[가-힣]$/.test(ch) && !set[ch]) { set[ch] = 1; n++; }
  }
  return { set: set, n: n };
}
var KS = ksSet();
var ALL_ROWS = [];
guard(function () {
  check(KS.n === 2350, 'EUC-KR table gives the 2,350 KS X 1001 syllables');
  /* 행 글: 여러 물음 모양 x 이름 '뚜루' */
  var shapes = [S.demoAnswer({ asksBefore: 0 }), S.humanAnswer('dye'), S.humanAnswer('keep'), S.humanAnswer(null), { action: null, by: 'fallback' },
    { action: null, by: 'model', raw: 'not json' }, { action: null, actionRaw: 'no', by: 'model', raw: '{"action":"no"}' }, { status: 'waiting', by: 'model' }];
  [1, 2, 3, 4, 5].forEach(function (d) { shapes.push(S.demoAnswer({ dateKey: S.addDays(D0, d), name: '뚜루', born: BORN, asksBefore: 1 })); });
  var offers = HEXES.slice(1);
  shapes.forEach(function (sh, i) {
    offers.forEach(function (o) { var s = base(); var a = ask(s, D0, o, sh); ALL_ROWS = ALL_ROWS.concat(S.rows(a, '뚜루')); });
    var f = base({ first: '#c06040', color: BLUE }), af = ask(f, D0, '#c06040', sh); ALL_ROWS = ALL_ROWS.concat(S.rows(af, '뚜루'));
    if (i === 0) { var g = base({ first: '#c06040', color: BLUE }); g.octopus.color = '#20b2aa'; g.settings.octColor = '#20b2aa'; ALL_ROWS = ALL_ROWS.concat(S.rows(ask(g, D0, BLUE, sh), '뚜루')); }
  });
  var houseRows = ALL_ROWS.filter(function (r) { return r.voice === 'house'; }).map(function (r) { return r.text; });
  var octRows = ALL_ROWS.filter(function (r) { return r.voice === 'octopus'; }).map(function (r) { return r.text; });
  var T = S.TEXT, filled = Object.keys(T).map(function (k) { return T[k].replace('{name}', '뚜루').replace('{color}', '파란색').replace('{short}', '파랑'); });
  ['처음 색', '빨간색', '분홍색', '청록색', '노란색', '회색', '흰색', '검은색'].forEach(function (c) { filled.push(T.asked.replace('{color}', c), T.dyed.replace('{name}', '뚜루').replace('{color}', c), T.desc.replace('{color}', c)); });
  var hueNames = {};
  for (var h = 0; h < 360; h++) hueNames[S.colorName(hsl(h, 0.76, 0.57))] = 1;
  ['#000000', '#ffffff', '#808080', '#7f7f86', '#101010', '#f4f4f4'].forEach(function (x) { hueNames[S.colorName(x)] = 1; });
  var bottleTexts = [];
  [base({ color: BLUE }), base({ first: '#c06040', color: BLUE })].forEach(function (s) { S.bottles(s, D0).forEach(function (b) { bottleTexts.push(b.short, b.name, b.aria, b.say, b.note || ''); }); });
  var restS = base(); ask(restS, D0, BLUE, S.humanAnswer('keep')); S.bottles(restS, S.addDays(D0, 1)).forEach(function (b) { bottleTexts.push(b.aria, b.say); });
  var tails = Object.keys(S.TAILS).map(function (k) { return S.TAILS[k]; }), byText = Object.keys(S.BY_TEXT).map(function (k) { return S.BY_TEXT[k]; });
  var names = [].concat.apply([], S.PRESETS.map(function (p) { return [p.short, p.name]; })).concat([S.FIRST.short, S.FIRST.name], Object.keys(hueNames));
  var lines = S.LINES.dye.concat(S.LINES.keep);
  var screen = [].concat(lines, filled, houseRows, octRows, tails, names, bottleTexts);   /* 플레이어 화면에 나오는 글 */
  var everything = screen.concat(byText, [S.CONTEXT]);
  console.log('   ' + everything.length + ' strings (' + houseRows.length + ' house rows, ' + octRows.length + ' octopus rows, hue names ' + Object.keys(hueNames).join(' ') + ')');
  var pref = everything.filter(function (t) { return PREF.test(t); }), press = everything.filter(function (t) { return PRESS.test(t); });
  check(pref.length === 0, 'no preference word in LINES, row texts, toasts, settings line, names, BY_TEXT, CONTEXT' + (pref.length ? ': ' + pref.join(' | ') : ''));
  check(press.length === 0, 'no pressure word (praise forms 예뻐 / 귀여워 / 멋지다 included) in the same strings' + (press.length ? ': ' + press.join(' | ') : ''));
  var blame = everything.filter(function (t) { return BLAME.test(t); });
  check(blame.length === 0, 'no blame, promise, sermon or hurry words in the same strings (벌써 / 잖아 / 내일은 / 될 거야 / 문어 몸은 / 빨리 ...)' + (blame.length ? ': ' + blame.join(' | ') : ''));
  check(!lines.some(function (t) { return /때문|니까|라서|해서|어서|아서|예뻐|멋져|고마워/.test(t); }), 'demo lines state the decision only (no reason, no praise of the person)');
  check(S.LINES.dye.length === 3 && S.LINES.keep.length === 3 && lines.every(function (t) { return len(t) <= 24; }), 'LINES: 3 dye + 3 keep, each 24 characters or fewer (' + lines.map(len).join(',') + ')');
  check(lines.concat(octRows).every(function (t) { return t.indexOf('오늘은') < 0; }), "no '오늘은' in octopus lines (a keep is not 'not yet')");
  var long = filled.concat(houseRows, tails, byText).filter(function (t) { return len(t) > 30; });
  check(long.length === 0, 'house lines 30 characters or fewer with the name 뚜루' + (long.length ? ': ' + long.join(' | ') : ''));
  var gl = screen.filter(function (t) { return glyphBad(t).length; });
  check(gl.length === 0, 'player-facing strings pass the smoke U glyph rule (no emoji, decorative symbols or emoticons)' + (gl.length ? ': ' + gl.join(' | ') : ''));
  var outside = (SRC.match(/[가-힣]/g) || []).filter(function (ch) { return !KS.set[ch]; });
  check(outside.length === 0, 'every Hangul syllable in js/salon.js (comments included) is in KS X 1001' + (outside.length ? ' (' + outside.join('') + ')' : ''));
  var odd = Array.from(SRC).filter(function (ch) { var c = ch.codePointAt(0); return c > 0x7f && !KS.set[ch] && !(c >= 0x2000 && c <= 0x206f); });
  check(odd.length === 0, 'js/salon.js uses no character outside ASCII, KS X 1001 Hangul and U+2000-206F (the font subset never goes stale because of it)' + (odd.length ? ' (' + odd.join('') + ')' : ''));
  check(houseRows.indexOf('파란색 어때? 하고 물어봤어.') >= 0 && houseRows.indexOf('처음 색 어때? 하고 물어봤어.') >= 0 && houseRows.indexOf('뚜루 몸이 처음 색으로 돌아왔어.') >= 0 && houseRows.indexOf('뚜루 몸이 파란색이 됐어.') >= 0,
    'row texts read as the spec writes them (asked / changed / back to the first colour)');
  check(!houseRows.concat(filled).some(function (t) { return /염색했|거절|문어가 고른|원래 색/.test(t); }), "house lines never say '염색했어', '거절', '문어가 고른', '원래 색'");
});
function hsl(h, s, l) {   /* 옛 슬라이더 색 (app.js hslHex 와 같은 식) */
  var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  function hx(v) { return ('0' + Math.round((v + m) * 255).toString(16)).slice(-2); }
  return '#' + hx(r) + hx(g) + hx(b);
}
guard(function () {
  var cases = [[0, '빨간색'], [14, '빨간색'], [15, '주황색'], [44, '주황색'], [45, '노란색'], [69, '노란색'], [70, '초록색'], [164, '초록색'], [165, '청록색'], [194, '청록색'], [195, '파란색'], [254, '파란색'], [255, '보라색'], [289, '보라색'], [290, '분홍색'], [344, '분홍색'], [345, '빨간색'], [359, '빨간색']];
  var bad = cases.filter(function (c) { return S.colorName(hsl(c[0], 1, 0.5)) !== c[1]; });
  check(bad.length === 0, 'colorName by hue for non-preset colours: 345-14 red, 15-44 orange, 45-69 yellow, 70-164 green, 165-194 teal, 195-254 blue, 255-289 purple, 290-344 pink' + (bad.length ? ' (' + js(bad) + ')' : ''));
  check(S.PRESETS.every(function (p) { return S.colorName(p.hex) === p.name && S.colorName(p.hex.toUpperCase()) === p.name && S.shortName(p.hex) === p.short; }) && S.shortName('#c06040') === null,
    'presets use their table names (any hex case); shortName of a non-preset is null');
  check(S.colorName('#808080') === '회색' && S.colorName('#000000') === '검은색' && S.colorName('#ffffff') === '흰색' && S.colorName('nope') === null && S.colorName('#c06040') === '주황색',
    'colourless greys are named by lightness, not by a made-up hue; bad hex gives null');
  check(S.isHex('#A1b2C3') && !S.isHex('#abc') && !S.isHex('a1b2c3') && !S.isHex(null) && S.normHex('#A1B2C3') === '#a1b2c3' && S.normHex('#a1b2c') === null, 'isHex / normHex: #rrggbb, lower case');
});

/* =================================================================== */
section('7. request: small, keep first, no reason field, no odds / rest / past answers');
guard(function () {
  var maxB = 0, keysBad = 0, menuBad = 0, reasonBad = 0, leak = 0, n = 0, samples = [];
  function walk(o, fn) { if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { fn(k, o[k]); walk(o[k], fn); }); }
  HEXES.forEach(function (cur) {
    HEXES.concat(['#c06040']).forEach(function (offer) {
      var s = base({ first: '#c06040', color: cur }), a = S.makeAsk(s, { at: at(D0), today: D0, offer: offer });
      if (!a) return;
      var q = S.request(s, a), text = js(q);
      n++; maxB = Math.max(maxB, bytes(text)); if (n === 1 || offer === '#c06040') samples.push(text);
      if (!same(Object.keys(q).sort(), ['facts', 'id', 'menu', 'point', 'v']) || !same(Object.keys(q.facts).sort(), ['now', 'offer']) ||
        !same(Object.keys(q.facts.now).sort(), ['hex', 'name']) || !same(Object.keys(q.facts.offer).sort(), ['hex', 'name'])) keysBad++;
      if (!(q.v === 1 && q.point === 'salon' && q.id === a.id && Array.isArray(q.menu) && q.menu[0] === 'keep' && q.menu.indexOf('dye') > 0 && q.menu.length === 2)) menuBad++;
      walk(q, function (k, v) { if (/reason|why/i.test(k) || (typeof v === 'string' && /reason|why/i.test(v))) reasonBad++; });
      if (/0\.625|P_YES|REST|rest|asks|history|last|prev|answer|action|line|expr|seed|lantern|affinity|trips|by/i.test(text.replace(/"(keep|dye)"/g, ''))) leak++;
      if (q.facts.now.hex !== cur || q.facts.offer.hex !== offer || q.facts.offer.name !== (offer === '#c06040' ? '처음 색' : S.colorName(offer))) keysBad++;
    });
  });
  console.log('   ' + n + ' requests, largest ' + maxB + ' B, e.g. ' + samples[0]);
  check(n === 36 && keysBad === 0, 'only the allowed keys: v point id facts menu / facts: now offer / now, offer: hex name (' + n + ' requests)');
  check(menuBad === 0, "v 1, point 'salon', id = the ask id, menu = ['keep', 'dye'] (keep, doing nothing, always first)");
  check(reasonBad === 0, 'no reason / why field or text anywhere');
  check(maxB <= 400, 'at most 400 B (largest ' + maxB + ' B)');
  check(leak === 0, 'no odds, rest days, past asks or answers, chooser or record facts in the request');
  check(samples.some(function (t) { return t.indexOf('"name":"처음 색"') >= 0; }), "offering the first colour names it '처음 색'");
  var s1 = base(), s2 = base();
  for (var d = 1; d <= 9; d++) ask(s2, S.addDays('2026-10-01', d), d % 2 ? PURPLE : GREEN, S.humanAnswer(d % 3 ? 'keep' : 'dye'));
  s2.octopus.color = RED; s2.settings.octColor = RED;
  var a1 = S.makeAsk(s1, { at: at(D0), today: D0, offer: BLUE }), a2 = S.makeAsk(s2, { at: at(D0), today: D0, offer: BLUE });
  var q1 = S.request(s1, a1), q2 = S.request(s2, a2); q1.id = q2.id = 'x';
  check(same(q1, q2), 'nine past asks (keeps and dyes) change nothing in the request: it carries no history');
  var C = S.CONTEXT;
  check(!/0\.625|P_YES|REST|7일|일주일|하루|쉬|쉼|마감|내일|확률|reason|why/i.test(C), 'CONTEXT has no odds, rest days, once-a-day rule, deadline or reason field');
  check(C.indexOf('keep') >= 0 && C.indexOf('dye') > C.indexOf('keep') && C.indexOf('이유는 안 써도 돼') >= 0 && C.indexOf('잃는 건 없어') >= 0 && C.indexOf('바꾸면 다음에 또 바꿀 때까지 그 색이야') >= 0,
    'CONTEXT: keep named first, no reason needed, nothing lost either way, a change lasts until the next change');
});

/* =================================================================== */
section('8. readReply: menu words, no re-ask, verbatim words');
guard(function () {
  var KEYS = ['action', 'actionRaw', 'empty', 'expr', 'exprRaw', 'line', 'raw', 'unreadable'];
  function rr(x) { return S.readReply(x); }
  check(rr('dye').action === 'dye' && rr(' DYE ').action === 'dye' && rr('keep').action === 'keep' && rr('"keep"').action === 'keep',
    "'dye', ' DYE ', 'keep' and the JSON string \"keep\" read as the menu words");
  check(rr({ action: 'dye' }).action === 'dye' && rr('{"action":" DYE "}').action === 'dye' && rr('{"action":"Keep"}').action === 'keep', 'objects and JSON text: case and outer spaces ignored');
  var no = rr('{"action":"no"}');
  check(no.action === null && no.actionRaw === 'no' && !no.unreadable && !no.empty && same(Object.keys(no).sort(), KEYS),
    "{\"action\":\"no\"}: action null, actionRaw 'no', not empty (the only re-send trigger) and no retry key: " + js(no));
  check(rr('{"action":"그냥 둘래"}').actionRaw === '그냥 둘래' && rr('{"action":"dye please"}').action === null && rr('{"action":1}').actionRaw === '1', 'other answers are kept as actionRaw, never coerced');
  var nj = rr('not json {');
  check(nj.unreadable && nj.action === null && nj.raw === 'not json {' && !nj.empty, 'not JSON: unreadable, raw kept');
  check(rr('please dye').unreadable && rr('[1,2]').unreadable && rr('42').unreadable && rr('null').unreadable, 'free text, arrays, numbers and JSON null are unreadable (not menu words)');
  check(rr(null).empty && rr(undefined).empty && !rr(null).unreadable && rr(null).raw === null, 'nothing came (null / undefined: transport failure): empty, the one case to re-send once');
  var blank = rr(''), ws = rr('   \n');
  check(blank.unreadable && !blank.empty && blank.raw === '' && ws.unreadable && !ws.empty && ws.raw === '   \n' && blank.action === null,
    "a blank reply ('' or spaces) did come: unreadable with the raw text kept, never 'empty' (a received answer is never asked again)");
  var L80 = '이 말은 여든 자가 되도록 일부러 길게 쓴 모델의 한마디인데 말풍선에는 앞부분만 보이고 기록에는 한 글자도 빠짐없이 전부 남아야 해. 정말로 끝까지 남는지 보자';
  var r80 = rr(js({ action: 'dye', line: L80 }));
  check(len(L80) >= 80 && r80.line === L80 && S.bubble(L80) === Array.from(L80).slice(0, 24).join('') + '…' && len(S.bubble(L80)) === 25,
    len(L80) + '-character line: record keeps it whole, the bubble shows 24 characters + …');
  var L24 = '가나다라마바사아자차카타파하 나다라마바사아자차';
  check(len(L24) === 24 && S.bubble(L24) === L24 && len(S.bubble(L24 + '끝')) === 25, 'a 24-character line is shown whole, a 25-character one is cut');
  var E23 = '가나다라마바사아자차카타파하가나다라마바사아자', E = E23 + '🐙🐙';
  check(len(E23) === 23 && S.bubble(E) === E23 + '🐙…' && E.slice(0, 24) !== E23 + '🐙', 'the bubble never splits an emoji (counts code points, not UTF-16 units)');
  var odd = rr('{"action":"dye","expr":"sad"}');
  check(odd.expr === null && odd.exprRaw === 'sad' && rr('{"action":"keep","expr":"Happy"}').expr === 'happy' && rr('{"action":"keep","expr":"calm"}').expr === 'calm' && rr('{"action":"keep"}').expr === null && rr('{"action":"keep"}').exprRaw === null,
    "expr 'sad': null + exprRaw 'sad'; known faces read case-free; no expr gives null");
  check(rr('{"action":"dye"}').line === null && rr('{"action":"dye","line":""}').line === null && rr('{"action":"dye","line":"   "}').line === null && rr('{"action":"dye","line":5}').line === null,
    'no line: null (never filled with a demo line)');
  var mis = rr('{"action":"dye","line":"싫어"}');
  check(mis.action === 'dye' && mis.line === '싫어', 'action and line disagree: follow the action, keep the line as written');
  var W = '  앞뒤 빈칸 \n둘째 줄 🐙 ';
  check(rr(js({ action: 'keep', line: W })).line === W, 'line kept byte for byte (spaces, newline, emoji)');
});

/* =================================================================== */
section('9. normalize: migration, broken values, waiting, verbatim words');
guard(function () {
  var old = { v: 2, octopus: { name: '뚜루', born: BORN, trips: 3 }, room: { lantern: 3 }, trips: [{ id: 't1' }], settings: { octColor: '#C06040' } };
  S.normalize(old, { todayKey: D0 });
  check(old.octopus.color === '#c06040' && old.settings.octColor === '#c06040' && same(old.octopus.colors, [{ at: BORN, date: null, color: '#c06040', how: 'first', by: 'migrated' }]) && same(old.salon, { asks: [] }),
    "an old save with a custom colour #c06040 keeps it as the first colour, by 'migrated'; settings.octColor copy matches");
  var noBorn = S.normalize({ octopus: { name: '뚜루' }, settings: {} });
  check(noBorn.octopus.colors[0].at === null && noBorn.octopus.colors[0].color === RED, 'migrated line without born: at null; missing colour: red');
  var brokenHex = S.normalize({ octopus: { name: 'x', color: '#12345' }, settings: { octColor: 'red' } });
  check(brokenHex.octopus.color === RED && brokenHex.settings.octColor === RED, 'broken hex everywhere: red');
  var fresh = S.normalize({ v: 2, octopus: { name: null, born: null, trips: 0 }, trips: [], settings: { octColor: RED } }, { todayKey: D0 });
  check(same(fresh.octopus.colors, []) && fresh.octopus.color === RED && same(fresh.salon, { asks: [] }), 'a new record (no name, no trips): colors [] (the first-run dialog writes the first line)');
  var played = S.normalize({ octopus: { name: '', trips: 0 }, trips: [{ id: 't' }], settings: {} });
  check(played.octopus.colors.length === 1 && played.octopus.colors[0].by === 'migrated', 'trips without a name still count as played');
  var mixed = S.normalize({ octopus: { name: 'x', color: 'zz', colors: [
    { at: 30, color: '#4A86D8', how: 'salon', by: 'demo-rules', ask: 'a1' }, { at: 10, color: RED, how: 'first', by: 'player' }, { at: 20, color: '#00ff00', how: 'dev', by: 'robot' },
    { at: 40, color: 'blue', how: 'dev', by: 'dev' }, { at: 50, color: PINK, how: 'paint', by: 'dev' }, 'junk', null, { at: 60, color: GREEN, how: 'dev', by: 'dev', ask: 7 }] }, settings: {} });
  check(same(mixed.octopus.colors.map(function (c) { return [c.at, c.color, c.how, c.by]; }), [[10, RED, 'first', 'player'], [20, '#00ff00', 'dev', 'unknown'], [30, BLUE, 'salon', 'unknown'], [60, GREEN, 'dev', 'dev']]) &&
    !('ask' in mixed.octopus.colors[3]) && mixed.octopus.colors[2].ask === 'a1',
    "colors: bad colour / how / non-objects dropped, hex lower-cased, unknown by 'unknown', sorted by at, non-string ask removed; a salon line whose ask 'a1' is not in the record keeps its colour but not its chooser (by 'unknown' — W4)");
  check(mixed.octopus.color === GREEN && mixed.settings.octColor === GREEN, 'invalid octopus.color falls back to the last colors line');
  var MODEL_LINE = '  음… 파랑도 괜찮겠다 🐙✨  \n(진짜로)  ', RAW = '{"action":"dye","line":"음… 🐙"}  ';
  var asks = S.normalize({ octopus: { name: 'x', colors: [{ at: 1, color: RED, how: 'first', by: 'player' }] }, settings: {}, salon: { asks: [
    { id: 'ok1', date: '2026-11-01', at: 5, from: RED, offer: '#4A86D8', status: 'weird', action: 'DYE', by: 'robot', expr: 'sad', line: MODEL_LINE, raw: RAW, offeredBy: 'player' },
    { id: 'ok2', date: '2026-11-02', at: 6, from: RED, offer: PURPLE, status: 'done', action: 'keep', by: 'model', expr: 'calm', line: null, actionRaw: ' Keep ', rule: 'seed', seed: 5 },
    { id: 'ok3', date: '2026-11-03', at: 7, from: RED, offer: GREEN, status: 'done', action: 'dye', by: 'demo-rules', rule: 'seed', seed: 3404652688, expr: 'happy', line: '그래, 바꿔 볼래.' },
    { id: '', date: '2026-11-04', from: RED, offer: BLUE }, { id: 'b2', date: '2026-13-01', from: RED, offer: BLUE }, { id: 'b3', date: '2026-11-05', from: 'red', offer: BLUE },
    { id: 'b4', date: '2026-11-05', from: RED, offer: '#4a86d' }, { id: 'ok1', date: '2026-11-06', from: RED, offer: PINK }, 'junk', [1], null
  ] } }, { todayKey: D0 }).salon.asks;
  check(same(asks.map(function (a) { return a.id; }), ['ok1', 'ok2', 'ok3']), 'broken asks dropped (no id, bad date, bad from / offer, duplicate id, non-objects): kept ' + asks.map(function (a) { return a.id; }).join(','));
  var a1 = asks[0], a2 = asks[1], a3 = asks[2];
  check(a1.status === 'done' && a1.action === null && a1.actionRaw === 'DYE' && a1.by === 'unknown' && a1.expr === null && a1.exprRaw === 'sad' && a1.offer === BLUE && a1.offerKind === 'preset' && a1.offerName === '파란색',
    "unknown status 'done', action not exactly dye/keep: null (original kept in actionRaw), unknown by 'unknown', unknown expr null + exprRaw");
  check(a1.line === MODEL_LINE && Buffer.from(a1.line).equals(Buffer.from(MODEL_LINE)) && a1.raw === RAW && a2.actionRaw === ' Keep ', "model words, raw and actionRaw kept byte for byte (emoji, spaces, newline)");
  check(a2.rule === null && a2.seed === null && a3.rule === 'seed' && a3.seed === 3404652688 && a2.expr === 'calm', 'rule and seed only for demo-rules; known expr kept');
  var w = S.normalize({ octopus: { name: 'x', color: RED, colors: [{ at: 1, color: RED, how: 'first', by: 'player' }] }, settings: {}, salon: { asks: [
    { id: 'w1', date: S.addDays(D0, -1), at: 1, from: RED, offer: BLUE, status: 'waiting', action: null, by: 'model', via: 'sampling', sent: 1 },
    { id: 'w2', date: D0, at: 2, from: RED, offer: BLUE, status: 'waiting', action: null, by: 'model', via: 'tool', sent: 2 }] } }, { todayKey: function () { return D0; } });
  check(w.salon.asks[0].status === 'done' && w.salon.asks[0].action === null && w.salon.asks[0].by === 'fallback' && w.octopus.color === RED,
    "yesterday's waiting closes as no answer (fallback), colour unchanged (todayKey may be a function)");
  check(w.salon.asks[1].status === 'waiting' && w.salon.asks[1].via === 'tool' && w.salon.asks[1].sent === 2, "today's waiting stays waiting");
  check(S.rows(w.salon.asks[0], 'x')[1].text === '대답이 없었어. 색은 그대로야.' && S.rows(w.salon.asks[0], 'x')[1].tail === null, "closed as fallback: '대답이 없었어. 색은 그대로야.' with no tail");
  /* app.js migrateV1 결과 모양 (defaults() + v1 값). load() 가 그 결과도 normalize 한다 */
  var v1 = { v: 2, octopus: { name: '옛문어', born: BORN, trips: 7, invites: 3, days: [], affinity: {}, visits: {}, state: 'idle' }, room: { lantern: 2, souvenirs: [], posterOrder: [] },
    trips: [{ id: 'trip_legacy_1', date: '2025-10-01', status: 'done', by: 'legacy' }], notes: {}, curiosityNotes: [], settings: { motion: 'auto', octColor: RED } };
  S.normalize(v1, { todayKey: D0 });
  check(v1.octopus.color === RED && v1.octopus.colors.length === 1 && v1.octopus.colors[0].by === 'migrated' && same(v1.salon, { asks: [] }) && S.canAsk(v1, D0, 'idle').ok,
    'the v1 migration result normalizes too: red first colour by migrated, empty salon, can ask');
  var dyeNoLine = S.normalize({ octopus: { name: 'x', color: RED, colors: [{ at: 1, color: RED, how: 'first', by: 'player' }] }, settings: {}, salon: { asks: [
    { id: 'd1', date: '2026-11-01', at: 2, from: RED, offer: BLUE, status: 'done', action: 'dye', by: 'demo-rules' }] } });
  check(dyeNoLine.octopus.colors.length === 1 && dyeNoLine.octopus.color === RED, "a dye ask without its colors line is not repaired (nothing is made up)");
  var twin = S.normalize({ octopus: { name: 'x', color: GREEN, colors: [{ at: 1, color: RED, how: 'first', by: 'player' }, { at: 10, color: BLUE, how: 'salon', by: 'demo-rules', ask: 'early' }, { at: 20, color: GREEN, how: 'salon', by: 'demo-rules', ask: 'late' }] },
    settings: {}, salon: { asks: [{ id: 'late', date: D0, at: 20, from: RED, offer: GREEN, status: 'done', action: 'dye', by: 'demo-rules' }, { id: 'early', date: D0, at: 10, from: RED, offer: BLUE, status: 'done', action: 'dye', by: 'demo-rules' }] } });
  check(twin.salon.asks[0].status === 'dropped' && twin.salon.asks[1].status === 'done' && twin.octopus.color === BLUE && twin.octopus.colors.length === 2,
    'two asks on one day in a saved record: the earliest decides (same rule as merge)');
  /* 검증 11-10 W3: 지금 색은 색 기록(colors)의 마지막 줄이 정한다. 내보낸 파일에서 octopus.color (또는 사본) 한 칸만 고쳐도 기록 없는 색이 되지 않는다 */
  var honest = base(); ask(honest, D0, BLUE, S.humanAnswer('dye'));
  var edited = clone(honest); edited.octopus.color = '#101010'; edited.settings.octColor = '#101010';
  S.normalize(edited, { todayKey: D0 });
  check(honest.octopus.color === BLUE && edited.octopus.color === BLUE && edited.settings.octColor === BLUE && same(edited.octopus.colors, honest.octopus.colors) && S.look(edited).now.hex === BLUE,
    'a hand-edited octopus.color (#101010) that disagrees with the colour record does not recolour: the last colors line decides (' + edited.octopus.color + '), the copy follows');
  var noRec = S.normalize({ v: 2, octopus: { name: null, born: null, trips: 0, color: '#123456' }, trips: [], settings: { octColor: RED } }, { todayKey: D0 });
  check(noRec.octopus.color === '#123456' && noRec.settings.octColor === '#123456' && same(noRec.octopus.colors, []), 'with no colour record yet (a new record) octopus.color is still what is read');
  /* 검증 11-10 W4: 미용실 색 줄의 고른 이는 그 물음이 뒷받침할 때만 남는다 (같은 id 의 끝난 '바꾸기' 물음 · 같은 고른 이 · 같은 색). 아니면 'unknown' — 줄과 색은 그대로 */
  function forge(line, asks) {
    var f = base(); f.octopus.colors.push(Object.assign({ at: at(D0), date: D0, color: PINK, how: 'salon', by: 'model' }, line)); f.octopus.color = f.settings.octColor = (line && line.color) || PINK;
    f.salon.asks = asks || [];
    return S.normalize(f, { todayKey: S.addDays(D0, 1) });
  }
  function askLine(o) { return Object.assign({ id: 'fa', date: D0, at: at(D0), from: RED, offer: PINK, status: 'done', action: 'dye', by: 'model', line: '해 볼게' }, o); }
  var f0 = forge({}), f1 = forge({ ask: 'nope' }), f2 = forge({ ask: 'fa' }, [askLine({ action: 'keep' })]), f3 = forge({ ask: 'fa' }, [askLine({ by: 'demo-rules' })]),
    f4 = forge({ ask: 'fa' }, [askLine({ offer: GREEN })]), f5 = forge({ ask: 'fa' }, [askLine({ status: 'waiting', action: null })]), fOk = forge({ ask: 'fa' }, [askLine({})]);
  var forged = [f0, f1, f2, f3, f4, f5].map(function (f) { var c = f.octopus.colors[f.octopus.colors.length - 1]; return c.by + '/' + S.look(f).changes.map(function (x) { return x.by; }).join(); });
  check(forged.every(function (x) { return x === 'unknown/unknown'; }) && [f0, f1, f2, f3, f4, f5].every(function (f) { return f.octopus.colors.length === 2 && f.octopus.color === PINK; }),
    "a hand-written colors line { how: 'salon', by: 'model' } with no ask, an unknown ask id, a keep ask, another chooser, another colour or a waiting ask becomes by 'unknown' (the line and the colour stay), and look() does not report it as the model's choice: " + js(forged));
  check(fOk.octopus.colors[1].by === 'model' && S.look(fOk).changes[0].by === 'model' && S.rows(fOk.salon.asks[0], 'x')[2].tail === '모델', "a salon line with its finished dye ask (same id, chooser, colour) keeps by 'model'");
  var idem = 0, states = [old, fresh, mixed, w, v1, twin, base(), edited, f0, f3, fOk];
  var y = base(); for (var d = 0; d < 20; d++) ask(y, S.addDays(D0, d), HEXES[(d * 5 + 1) % 6] === y.octopus.color ? HEXES[(d + 2) % 6] : HEXES[(d * 5 + 1) % 6]); states.push(y);
  states.forEach(function (st) { var one = js(S.normalize(clone(st), { todayKey: D0 })), two = js(S.normalize(JSON.parse(one), { todayKey: D0 })); if (one !== two) idem++; });
  check(idem === 0, 'normalize is idempotent (' + states.length + ' records, JSON round trip)');
  var yN = S.normalize(clone(y), { todayKey: S.addDays(D0, 30) });
  check(same(yN.octopus.colors, y.octopus.colors) && yN.octopus.color === y.octopus.color && y.octopus.colors.filter(function (c) { return c.how === 'salon'; }).length >= 3,
    'a record made by play (20 asks) is left as it is: every salon line keeps its chooser and the colour is the last line (' + y.octopus.colors.length + ' lines)');
  check(S.normalize(null) && same(S.normalize(null).octopus.colors, []) && S.normalize(null).octopus.color === RED, 'normalize(null) gives a usable empty record');
});

/* =================================================================== */
section('10. merge: two tabs, the earliest ask decides, my recent asks come back');
guard(function () {
  var start = base();
  var A = clone(start), Bt = clone(start), t0 = at(D0, 1);
  var aAsk = ask(A, D0, BLUE, S.humanAnswer('dye'), t0);
  var bAsk = ask(Bt, D0, GREEN, S.humanAnswer('dye'), t0 + 60000 * 3);
  var remote = clone(Bt), remoteBefore = js(remote);
  var m = S.merge(A, remote, [{ ask: aAsk, at: t0 }], t0 + 5000);
  var st = m.state, ids = st.salon.asks.map(function (x) { return x.id + ':' + x.status; });
  check(js(remote) === remoteBefore, 'merge does not change the remote record it was given');
  check(m.changed && same(m.readded, [aAsk.id]) && same(m.dropped, [bAsk.id]) && same(ids, [aAsk.id + ':done', bAsk.id + ':dropped']), 'my 10:00 ask comes back, the other tab\'s later ask on the same day is dropped: ' + ids.join(' '));
  check(st.octopus.color === BLUE && st.settings.octColor === BLUE && st.octopus.colors.some(function (c) { return c.ask === aAsk.id; }) && !st.octopus.colors.some(function (c) { return c.ask === bAsk.id; }),
    "the dropped ask's colors line is removed and the colour follows the earlier ask (blue)");
  check(S.rows(st.salon.asks[1], '뚜루').length === 0 && S.todaysAsk(st, D0).id === aAsk.id && S.canAsk(st, D0, 'idle').reason === 'asked_today', 'the dropped ask draws nothing; the day is used');
  var back = S.merge(Bt, clone(st), [{ ask: bAsk, at: t0 + 180000 }], t0 + 185000);
  check(!back.changed && back.state.octopus.color === BLUE && back.state.salon.asks.filter(function (x) { return x.id === bAsk.id; })[0].status === 'dropped',
    'the other tab receives it: its own ask is already there (dropped), nothing is re-added, nothing changes (no save ping-pong)');
  var early = S.merge(Bt, clone(A), [bAsk], null);
  check(early.state.salon.asks.filter(function (x) { return x.id === aAsk.id; })[0].status === 'done' && early.state.octopus.color === BLUE && same(early.dropped, [bAsk.id]),
    'seen from the later tab the result is the same: earliest at wins (bare asks in mine work)');
  var stale = S.merge(A, clone(start), [{ ask: aAsk, at: t0 }], t0 + 61000);
  check(!stale.changed && stale.state.salon.asks.length === 0 && stale.mine.length === 0, 'mine older than 60 s is let go (not re-added, not kept)');
  var fresh = S.merge(A, clone(start), [{ ask: aAsk, at: t0 }], t0 + 30000);
  check(fresh.changed && fresh.state.salon.asks.length === 1 && fresh.state.octopus.color === BLUE && fresh.mine.length === 1 && fresh.state.octopus.colors.length === 2,
    'within 60 s a stale save from the other tab gets my ask and colors line back (colour blue)');
  var other = clone(start); other.octopus.born = BORN + 1;
  var diffOct = S.merge(A, other, [{ ask: aAsk, at: t0 }], t0 + 1000);
  check(!diffOct.changed && diffOct.state.salon.asks.length === 0 && diffOct.mine.length === 0, 'a different octopus (born differs: reset or import in the other tab): mine is dropped');
  var dup = S.merge(A, clone(A), [{ ask: aAsk, at: t0 }], t0 + 1000);
  check(!dup.changed && dup.state.salon.asks.length === 1 && dup.state.octopus.colors.length === 2, 'already there: nothing doubled');
  var K = clone(start), kAsk = ask(K, D0, PURPLE, S.humanAnswer('keep'), t0);
  var km = S.merge(K, clone(start), [{ ask: kAsk, at: t0 }], t0 + 1000);
  check(km.changed && km.state.octopus.color === RED && km.state.octopus.colors.length === 1 && S.restingUntil(km.state, PURPLE) === S.addDays(D0, 7), 'a keep comes back without a colors line and the colour stays (rest kept)');
  var dev = clone(Bt); dev.octopus.colors.push({ at: t0 + 600000, date: D0, color: PINK, how: 'dev', by: 'dev' }); dev.octopus.color = PINK; dev.settings.octColor = PINK;
  var dm = S.merge(A, dev, [{ ask: aAsk, at: t0 }], t0 + 5000);
  check(dm.state.octopus.color === PINK && same(dm.dropped, [bAsk.id]), 'a later dev change in the other tab still wins over the re-added ask (latest line decides)');
  check(S.merge(A, null, [aAsk]).changed === false, 'a remote that is not a record changes nothing');
  /* 검증 11-10 W1 (불러오기): 같은 문어의 옛 기록을 불러와도 이 기기에서 이미 한 물음은 남는다 — 앱이 merge(지금 기록, 불러온 기록, 지금 기록의 물음 전부) 를 now 없이 부른다 (60 s 제한 없음) */
  var dev1 = base(), backup0 = clone(dev1);                                /* 물음이 하나도 없을 때 내보낸 파일 */
  var first1 = ask(dev1, S.addDays(D0, -9), BLUE, undefined, at(S.addDays(D0, -9)));   /* 맨 처음 물음 (9일 전) = 'first' 바꾸기 */
  var backup1 = clone(dev1);                                               /* 그 뒤에 내보낸 파일 */
  var keep1 = ask(dev1, D0, PURPLE, S.humanAnswer('keep'), at(D0));        /* 오늘 '그대로' */
  var imp1 = S.merge(dev1, clone(backup1), dev1.salon.asks.slice()).state;
  check(first1.rule === 'first' && imp1.salon.asks.length === 2 && S.canAsk(imp1, D0, 'idle').reason === 'asked_today' && S.restingUntil(imp1, PURPLE, D0) === S.addDays(D0, 7) && imp1.octopus.color === BLUE &&
    S.rows(S.todaysAsk(imp1, D0), '뚜루').length === 2,
    "import of a backup from before today's ask (same octopus): the '그대로' stays (asked today, its colour rests until " + S.restingUntil(imp1, PURPLE, D0) + ')');
  var imp0 = S.merge(dev1, clone(backup0), dev1.salon.asks.slice()).state, next0 = S.makeAsk(imp0, { at: at(S.addDays(D0, 1)), today: S.addDays(D0, 1), offer: GREEN });
  check(imp0.salon.asks.length === 2 && S.doneCount(imp0) === 2 && imp0.octopus.color === BLUE && imp0.octopus.colors.some(function (c) { return c.ask === first1.id && c.by === 'demo-rules'; }) && next0 && next0.rule === 'seed',
    "import of a backup from before the very first ask: both asks and the dye's colors line come back (asks older than 60 s too), the colour stays blue, and the next ask is answered by rule '" + (next0 && next0.rule) + "' (no second 'first')");
  var otherOct = clone(backup0); otherOct.octopus.born = BORN + 7; otherOct.octopus.name = '다른문어';
  var impX = S.merge(dev1, otherOct, dev1.salon.asks.slice());
  check(!impX.changed && impX.state.salon.asks.length === 0 && impX.state.octopus.color === RED && impX.state.octopus.name === '다른문어', 'a different octopus (born differs) is imported as it is: none of this octopus\'s asks are carried over');
});

/* =================================================================== */
section('11. look: the room view for a model');
guard(function () {
  var s = base({ firstBy: 'migrated' });
  var days = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15'];
  var answers = [S.demoAnswer({ asksBefore: 0 }), S.humanAnswer('dye'), S.humanAnswer('keep'), { action: 'dye', by: 'model', line: '해 볼게' }, S.humanAnswer('dye'), S.humanAnswer('dye'), S.humanAnswer('keep')];
  var offers = [BLUE, GREEN, PINK, PURPLE, ORANGE, RED, BLUE];
  days.forEach(function (d, i) { ask(s, d, offers[i], answers[i]); });
  s.octopus.colors.push({ at: at('2026-11-15', 9), date: '2026-11-15', color: '#c06040', how: 'dev', by: 'dev' }); s.octopus.color = '#c06040'; s.settings.octColor = '#c06040';
  s.salon.asks.push({ id: 'drop', date: '2026-11-15', at: at('2026-11-15', 10), from: RED, offer: GREEN, offerKind: 'preset', offerName: '초록색', status: 'dropped', action: 'dye', by: 'model' });
  var L = S.look(s), Ls = S.look(s, { salon: true });
  check(same(L.now, { hex: '#c06040', name: '주황색' }) && same(L.first, { hex: RED, name: '빨간색', by: 'migrated' }), "now and first (by 'migrated' kept as is): " + js([L.now, L.first]));
  check(L.changes.length === 5 && same(L.changes.map(function (c) { return c.by; }), ['human', 'model', 'human', 'human', 'dev']) && L.changes[4].to.hex === '#c06040' && L.changes[0].date === '2026-11-10',
    'changes: the latest 5, oldest first, by in its original value: ' + js(L.changes.map(function (c) { return c.by; })));
  check(!('asks' in L) && Ls.asks.length === 5 && same(Ls.asks.map(function (a) { return a.date + ' ' + a.action + ' ' + a.by; }),
    ['2026-11-11 keep human', '2026-11-12 dye model', '2026-11-13 dye human', '2026-11-14 dye human', '2026-11-15 keep human']) && Ls.asks.every(function (a) { return a.offer.hex !== GREEN || a.date !== '2026-11-15'; }),
    "asks only with { salon: true }: latest 5 finished asks, keeps included, dropped left out: " + js(Ls.asks.map(function (a) { return a.action; })));
  check(same(S.look(base({ firstBy: 'player' })).first.by, 'player') && same(S.look(base({ firstBy: 'default' })).first.by, 'default') && S.look({ octopus: {} }).first === null, "first.by player / default as recorded; no first line gives null");
  var bt = S.BY_TEXT;
  check(['player', 'default', 'migrated', 'demo-rules', 'model', 'human', 'dev', 'fallback', 'unknown'].every(function (k) { return typeof bt[k] === 'string' && bt[k]; }), 'BY_TEXT explains every by value');
  check(bt.migrated === '미용실 전에 사람이 설정에서 고른 색(또는 기본값)' && bt['demo-rules'] === '데모 규칙이 고름', "BY_TEXT: migrated and demo-rules read as the spec writes them");
  check(Object.keys(bt).every(function (k) { return !/네가|문어가 고른|네 몸이|골랐어/.test(bt[k]); }) && Object.keys(bt).filter(function (k) { return k !== 'model'; }).every(function (k) { return bt[k].indexOf('모델') < 0; }),
    "no explanation says '네가' or '문어가 고른', and only 'model' says a model chose");
  check(!PREF.test(js(Ls)) && !PRESS.test(js(Ls)), 'look carries no preference or pressure words');
});

/* =================================================================== */
section('12. commit, rows, staging + model voice (words as given, none made up)');
guard(function () {
  var s = base(), before = js(s);
  var a = S.makeAsk(s, { at: at(D0), today: D0, offer: BLUE });
  check(js(s) === before, 'makeAsk does not touch the record');
  S.commit(s, a);
  var cl = s.octopus.colors[s.octopus.colors.length - 1];
  check(s.salon.asks.length === 1 && s.salon.asks[0] === a && same(cl, { at: a.at, date: D0, color: BLUE, how: 'salon', by: 'demo-rules', ask: a.id }) && s.octopus.color === BLUE && s.settings.octColor === BLUE,
    "commit writes the ask, one colors line { how: 'salon', by: 'demo-rules', ask }, octopus.color and the settings copy in one go");
  S.commit(s, a);
  check(s.salon.asks.length === 1 && s.octopus.colors.length === 2, 'commit twice: nothing doubled');
  check(same(S.rows(a, '뚜루').map(function (r) { return [r.n, r.label, r.text, r.voice, r.tail]; }), [
    [1, '미용실', '파란색 어때? 하고 물어봤어.', 'house', null], [2, '대답', '응, 해 볼래.', 'octopus', null], [3, '몸 색', '뚜루 몸이 파란색이 됐어.', 'house', '데모 규칙']]),
    "first ask: '미용실' asked, '대답' 응, 해 볼래., '몸 색' 뚜루 몸이 파란색이 됐어. + tail '데모 규칙'");
  check(S.rows(a, '뚜루')[1].expr === 'happy' && S.rows(a, '뚜루')[1].raw === false && S.rows(a, '뚜루')[0].by === 'player', 'reply row face = the given expr; demo words are not marked raw model words');
  check(same(S.staging(a), { action: 'dye', color: BLUE, expr: 'happy', joy: true, look: true, bubble: '응, 해 볼래.' }), 'demo dye staging: happy, joy, mirror look, bubble');
  var k = base(), ka = ask(k, D0, PURPLE, S.demoAnswer({ dateKey: D0, name: '뚜루', born: BORN, asksBefore: 1 }));
  check(ka.action === 'keep' && k.octopus.color === RED && k.octopus.colors.length === 1 && same(S.rows(ka, '뚜루').map(function (r) { return r.text; }), ['보라색 어때? 하고 물어봤어.', '이대로 있을래.', '색은 그대로야.']) &&
    S.rows(ka, '뚜루')[1].expr === 'idle' && S.rows(ka, '뚜루')[2].tail === '데모 규칙' && same(S.staging(ka), { action: 'keep', color: null, expr: 'idle', joy: false, look: false, bubble: '이대로 있을래.' }),
    'demo keep: colour unchanged, plain face, no joy, no look, "색은 그대로야." + tail');
  var f = base({ first: '#c06040', color: BLUE }), fa = ask(f, D0, '#c06040', S.humanAnswer('dye'));
  check(same(S.rows(fa, '뚜루').map(function (r) { return r.text; }), ['처음 색 어때? 하고 물어봤어.', '뚜루 몸이 처음 색으로 돌아왔어.']) && f.octopus.color === '#c06040', "back to the first colour: '처음 색 어때?' and '처음 색으로 돌아왔어.'");
  var h = base(), ha = ask(h, D0, GREEN, S.humanAnswer('dye'));
  check(ha.by === 'human' && ha.line === null && ha.expr === null && S.rows(ha, '뚜루').length === 2 && S.rows(ha, '뚜루')[1].tail === '사람이 정함' &&
    same(S.staging(ha), { action: 'dye', color: GREEN, expr: 'idle', joy: false, look: false, bubble: null }), "dev answer: by 'human', no demo words, no joy, no mirror look, tail '사람이 정함'");
  var hn = base(), hna = ask(hn, D0, GREEN, S.humanAnswer(null));
  check(same(S.rows(hna, '뚜루').map(function (r) { return [r.text, r.tail]; }), [['초록색 어때? 하고 물어봤어.', null], ['대답이 없었어. 색은 그대로야.', '사람이 정함']]) && hn.octopus.color === RED, "dev 'no answer': '대답이 없었어. 색은 그대로야.' + '사람이 정함', colour unchanged");
  function modelAsk(raw, offer) {
    var r = S.readReply(raw), st = base(), ans = Object.assign({}, r, { by: 'model', via: 'sampling', model: 'test-model', sent: 1 });
    return { st: st, a: ask(st, D0, offer || BLUE, ans) };
  }
  var mu = modelAsk('blah blah');
  check(same(S.rows(mu.a, '뚜루').map(function (r) { return [r.text, r.tail]; }), [['파란색 어때? 하고 물어봤어.', null], ['답을 못 읽었어. 색은 그대로야.', '모델']]) && mu.a.raw === 'blah blah' && mu.st.octopus.color === RED,
    "model reply not JSON: '답을 못 읽었어. 색은 그대로야.', raw kept, colour unchanged, asked once (status done)");
  var LINE = '음 파랑은 아니야 🐙  ';
  var mo = modelAsk(js({ action: 'no', line: LINE, expr: 'curious' }));
  var moRows = S.rows(mo.a, '뚜루');
  check(mo.a.status === 'done' && mo.a.action === null && mo.a.actionRaw === 'no' && moRows[1].text === LINE && moRows[1].raw === true && moRows[1].expr === 'curious' && moRows[2].text === '색은 그대로야.' && S.restingUntil(mo.st, BLUE) === null,
    'model out-of-menu answer: closed (no re-ask), its line shown as written (raw), "색은 그대로야.", no rest');
  var md = modelAsk('{"action":"dye"}');
  var mdRows = S.rows(md.a, '뚜루'), lines = S.LINES.dye.concat(S.LINES.keep);
  check(mdRows.length === 2 && mdRows.every(function (r) { return r.voice === 'house' && lines.indexOf(r.text) < 0; }) && md.a.line === null && mdRows[1].tail === '모델' && md.st.octopus.color === BLUE &&
    same(S.staging(md.a), { action: 'dye', color: BLUE, expr: 'idle', joy: false, look: false, bubble: null }),
    'model dye without a line: no octopus row, no demo words, plain face, no joy, no mirror look (none was chosen)');
  var ML = '파랑, 한번 해 볼게 \n🐙';
  var ml = modelAsk(js({ action: 'DYE', line: ML, expr: 'happy' }));
  check(ml.a.line === ML && S.rows(ml.a, '뚜루')[1].text === ML && S.rows(ml.a, '뚜루')[1].raw === true && S.staging(ml.a).joy === true && S.staging(ml.a).look === true && ml.a.by === 'model' && ml.a.model === 'test-model' && ml.a.via === 'sampling',
    'model line kept letter for letter in the ask and the row; a chosen happy face brings joy and the mirror look');
  var mk = modelAsk(js({ action: 'keep', expr: 'happy' }));
  check(same(S.staging(mk.a), { action: 'keep', color: null, expr: 'happy', joy: true, look: false, bubble: null }), 'model keep with a happy face: the face it chose (joy), no octopus row');
  var wt = base(), wa = ask(wt, D0, BLUE, { status: 'waiting', by: 'model', via: 'tool', sent: 1, action: 'dye', line: 'x' });
  check(wa.status === 'waiting' && wa.action === null && wa.line === null && S.rows(wa, '뚜루').length === 1 && S.staging(wa) === null && wt.octopus.color === RED, 'waiting: only row 1, no staging, colour unchanged');
  check(S.rows(Object.assign({}, a, { status: 'dropped' }), '뚜루').length === 0 && S.rows(a, '')[2].text === '문어 몸이 파란색이 됐어.' && S.rows(null).length === 0, "dropped draws nothing; a missing name reads '문어'");
  /* 데모 결정은 모델로 적히지 않는다 */
  var demoBy = {}, R = S._copy.rng(5), sim = base();
  for (var d = 0; d < 60; d++) {
    var day = S.addDays(D0, d), free = S.bottles(sim, day).filter(function (b) { return b.selectable; });
    var x = ask(sim, day, free[Math.floor(R() * free.length)].hex);
    demoBy[x.by + '/' + x.rule] = 1;
  }
  check(same(Object.keys(demoBy).sort(), ['demo-rules/first', 'demo-rules/seed']), "60 demo asks are all by 'demo-rules' (rule first, then seed), never 'model'");
  check(!Object.keys(S).some(function (k) { return /re.?ask|retry|again/i.test(k); }), 'there is no re-ask or retry API; a received answer closes the ask');
  var noBy = [{ action: 'dye' }, { action: 'dye', by: 'unknown' }, { action: 'dye', by: 'robot' }, { action: 'keep', by: '' }, { status: 'waiting' }];
  check(noBy.every(function (x) { var st = base(); return S.makeAsk(st, { at: at(D0), today: D0, offer: BLUE, answer: x }) === null; }),
    "an answer that names no chooser (none, 'unknown', unknown words) makes no ask: nothing changes the body colour without a chooser");
});

/* =================================================================== */
section('13. a year of asking: invariants');
guard(function () {
  var s = base(), R = S._copy.rng(424242), log = [], errs = [], dyes = 0, keeps = 0, skipped = 0, refused = 0, streak = 0, longest = 0, notDemo = [];
  for (var d = 0; d < 365; d++) {
    var day = S.addDays(D0, d);
    if (R() < 0.15) { skipped++; continue; }                         /* 안 연 날 */
    var octState = R() < 0.05 ? 'sleep' : 'idle';
    var can = S.canAsk(s, day, octState);
    if (!can.ok) { if (can.reason !== 'asleep') errs.push(day + ' could not ask: ' + can.reason); refused++; continue; }
    var bs = S.bottles(s, day), free = bs.filter(function (b) { return b.selectable; });
    if (bs.some(function (b) { return b.selectable && S.restingUntil(s, b.hex, day); })) errs.push(day + ' a resting bottle is selectable');
    if (!free.length) { refused++; continue; }
    var pick = R() < 0.5 ? (free.filter(function (b) { return b.hex === BLUE; })[0] || free[0]) : free[Math.floor(R() * free.length)];   /* 파랑을 자주 조르는 사람 */
    var a = S.makeAsk(s, { at: at(day, 2 + Math.floor(R() * 12)), today: day, offer: pick.hex });
    if (!a) { errs.push(day + ' makeAsk refused a selectable bottle'); continue; }
    /* 적히는 답 = 그날 demoAnswer(날짜, 이름, born, asksBefore = 끝난 물음 수) 그대로: '그대로'가 이어져도 확률이 오르지 않고 (동정 바꾸기 없음), 처음 바꾸기는 한 번뿐 */
    var want = S.demoAnswer({ dateKey: day, name: s.octopus.name, born: s.octopus.born, asksBefore: S.doneCount(s) });
    if (!(a.action === want.action && a.line === want.line && a.expr === want.expr && a.rule === want.rule && a.seed === want.seed && a.by === want.by)) notDemo.push(day + ' ' + a.action + '/' + a.rule + ' vs ' + want.action + '/' + want.rule + ' after ' + streak + ' keeps');
    if (S.makeAsk(s, { at: at(day, 20), today: day, offer: pick.hex })) { /* 아직 적기 전이라 null 이 아니어도 된다 */ }
    S.commit(s, a);
    if (S.makeAsk(s, { at: at(day, 21), today: day, offer: free[0].hex }) !== null) errs.push(day + ' a second ask was possible');
    log.push(a);
    if (a.action === 'dye') { dyes++; streak = 0; } else { keeps++; streak++; if (streak > longest) longest = streak; }
    if (d % 50 === 7) { var hex = HEXES[d % 6] === s.octopus.color ? HEXES[(d + 1) % 6] : HEXES[d % 6]; s.octopus.colors.push({ at: at(day, 23), date: day, color: hex, how: 'dev', by: 'dev' }); s.octopus.color = hex; s.settings.octColor = hex; }
    var round = S.normalize(JSON.parse(js(s)), { todayKey: day });
    if (js(round) !== js(S.normalize(clone(round), { todayKey: day }))) errs.push(day + ' normalize not idempotent');
    s = round;
    /* 불변식 */
    var cs = s.octopus.colors;
    if (s.octopus.color !== cs[cs.length - 1].color || s.settings.octColor !== s.octopus.color) errs.push(day + ' colour source disagrees');
    var perDay = {};
    s.salon.asks.forEach(function (q) { if (q.status !== 'dropped') perDay[q.date] = (perDay[q.date] || 0) + 1; });
    if (Object.keys(perDay).some(function (k) { return perDay[k] > 1; })) errs.push(day + ' two asks on one day');
    var dyeIds = s.salon.asks.filter(function (q) { return q.status === 'done' && q.action === 'dye'; }).map(function (q) { return q.id; }).sort();
    var lineIds = cs.filter(function (c) { return c.how === 'salon'; }).map(function (c) { return c.ask; }).sort();
    if (!same(dyeIds, lineIds)) errs.push(day + ' colors lines and dye asks differ');
    if (s.salon.asks.some(function (q) { return q.offer === q.from; })) errs.push(day + ' an ask offered the current colour');
  }
  /* 쉬는 색을 다시 물은 적이 없다 */
  log.forEach(function (q, i) {
    if (q.action !== 'keep') return;
    log.slice(i + 1).forEach(function (r) { if (r.offer === q.offer && r.date < S.addDays(q.date, 7)) errs.push(r.date + ' asked ' + r.offer + ' during its rest from ' + q.date); });
  });
  console.log('   ' + log.length + ' asks (' + dyes + ' dye, ' + keeps + ' keep), ' + skipped + ' days away, ' + refused + ' refused (asleep / nothing free), longest keep run ' + longest);
  check(log[0].action === 'dye' && log[0].rule === 'first' && log.filter(function (q) { return q.rule === 'first'; }).length === 1, 'the first ask of the year dyes (rule first), and only that one');
  check(notDemo.length === 0, 'every recorded answer is exactly demoAnswer(day, name, born, asksBefore = doneCount): odds never rise after keeps in a row (' + log.length + ' asks, longest keep run ' + longest + ')' + (notDemo.length ? ' (' + notDemo.length + ' differ, e.g. ' + notDemo.slice(0, 3).join(' | ') + ')' : ''));
  check(errs.length === 0, 'one ask per day, one colour source, colors lines = dye asks, no current or resting colour offered, normalize idempotent' + (errs.length ? ' (' + errs.length + ' errors, e.g. ' + errs.slice(0, 3).join(' | ') + ')' : ''));
  check(dyes / log.length > 0.5 && dyes / log.length < 0.75, 'dye share over the year ' + (dyes / log.length).toFixed(3));
});

/* =================================================================== */
section('14. welfare guards: first dye once, no pity dye, the salon gives nothing, exact words, chooser tails, imported text');
guard(function () {
  /* 14a doneCount = 끝난 물음 (누가 답했든). dropped, waiting 은 안 센다 → 맨 처음 '바꾸기'는 한 번뿐 */
  var h = base(); ask(h, D0, BLUE, S.humanAnswer('keep'));
  var f = base(); f.salon.asks.push({ id: 'w', date: '2026-11-01', at: at('2026-11-01'), from: RED, offer: BLUE, offerKind: 'preset', status: 'waiting', action: null, by: 'model' }); S.normalize(f, { todayKey: D0 });
  var dr = base(); dr.salon.asks.push({ id: 'd', date: '2026-11-01', at: at('2026-11-01'), from: RED, offer: BLUE, offerKind: 'preset', status: 'dropped', action: 'keep', by: 'demo-rules', rule: 'seed' });
  var wt = base(); wt.salon.asks.push({ id: 'w2', date: D0, at: at(D0), from: RED, offer: BLUE, offerKind: 'preset', status: 'waiting', action: null, by: 'model' });
  var mo = base(); ask(mo, D0, BLUE, { action: null, actionRaw: 'no', by: 'model', raw: '{"action":"no"}' });
  check(S.doneCount(h) === 1 && S.doneCount(f) === 1 && f.salon.asks[0].by === 'fallback' && S.doneCount(mo) === 1 && S.doneCount(dr) === 0 && S.doneCount(wt) === 0,
    'doneCount = finished asks whoever answered: person keep 1, closed as fallback 1, model out of menu 1, dropped 0, waiting 0');
  var D1 = S.addDays(D0, 1);
  check(S.makeAsk(h, { at: at(D1), today: D1, offer: GREEN }).rule === 'seed' && S.makeAsk(f, { at: at(D0), today: D0, offer: GREEN }).rule === 'seed' && S.makeAsk(mo, { at: at(D1), today: D1, offer: GREEN }).rule === 'seed',
    'after a first ask answered by a person, by nobody (fallback) or out of the menu, the next demo ask is not forced (rule seed): the first dye happens at most once');
  check(S.makeAsk(dr, { at: at(D0), today: D0, offer: GREEN }).rule === 'first', 'an ask that was dropped (another tab asked first) does not use up the first ask');

  /* 14b '그대로'가 이어져도 다음 답은 그날 demoAnswer 그대로 (동정 바꾸기 없음) — 데모, 모델, 사람이 한 '그대로' 모두 */
  var keepers = [S.humanAnswer('keep'), { action: 'keep', by: 'demo-rules', rule: 'seed', line: S.LINES.keep[0], expr: 'idle' }, { action: 'keep', by: 'model' }];
  var bad = 0, tried = 0, keptAfter4 = 0, after4 = 0;
  function free(st, day) { return S.bottles(st, day).filter(function (b) { return b.selectable; })[0].hex; }
  for (var k = 1; k <= 4; k++) {
    for (var r0 = 0; r0 < 30; r0++) {
      var st = base(), day = S.addDays(D0, r0 * 9);
      for (var i = 0; i < k; i++) { var dk = S.addDays(day, i); ask(st, dk, free(st, dk), keepers[(r0 + i) % 3]); }
      var nx = S.addDays(day, k), a = S.makeAsk(st, { at: at(nx), today: nx, offer: free(st, nx) });
      var want = S.demoAnswer({ dateKey: nx, name: '뚜루', born: BORN, asksBefore: S.doneCount(st) });
      tried++;
      if (!a || a.action !== want.action || a.line !== want.line || a.rule !== want.rule || a.seed !== want.seed || a.expr !== want.expr || a.by !== 'demo-rules') bad++;
      if (k === 4) { after4++; if (a && a.action === 'keep') keptAfter4++; }
    }
  }
  check(bad === 0 && keptAfter4 > 0, 'after 1-4 keeps in a row the next ask is exactly that day\'s demoAnswer, no pity dye (' + tried + ' runs; after 4 keeps still keep ' + keptAfter4 + '/' + after4 + ')');

  /* 14c 미용실은 아무것도 주지 않는다: commit 이 쓰는 곳은 salon.asks, octopus.color, octopus.colors, settings.octColor 넷뿐 */
  function strip(o) { var x = clone(o); if (x.salon) delete x.salon.asks; if (x.octopus) { delete x.octopus.color; delete x.octopus.colors; } if (x.settings) delete x.settings.octColor; return x; }
  var gives = [null, S.humanAnswer('dye'), S.humanAnswer('keep'), S.humanAnswer(null), { action: null, by: 'fallback' }, { action: 'dye', by: 'model', line: '해 볼게', expr: 'happy' }, { action: 'keep', by: 'model', expr: 'calm' }, { status: 'waiting', by: 'model', via: 'tool', sent: 1 }];
  var leaks = [];
  gives.forEach(function (g, gi) {
    var s0 = base(); s0.shells = 3; s0.badges = ['b1']; s0.octopus.affinity = { sea: 3 }; s0.octopus.days = ['2026-11-01']; s0.room.lantern = 2; s0.room.souvenirs = [{ id: 'sv1' }];
    var before = clone(s0), a0 = S.makeAsk(s0, { at: at(D0), today: D0, offer: BLUE, answer: g || undefined });
    S.commit(s0, a0);
    if (!same(strip(s0), strip(before))) leaks.push(gi + ':outside');
    if (s0.salon.asks.length !== 1 || s0.octopus.colors.length - before.octopus.colors.length > (a0.action === 'dye' ? 1 : 0)) leaks.push(gi + ':count');
  });
  check(leaks.length === 0, 'the salon gives nothing: commit (demo, person dye / keep / none, fallback, model, waiting) writes only salon.asks, octopus.color, octopus.colors, settings.octColor (no shells, lantern, badges, days, affinity)' + (leaks.length ? ' leaks: ' + leaks.join(', ') : ''));
  var ASK_KEYS = ['action', 'actionRaw', 'at', 'by', 'date', 'expr', 'exprRaw', 'from', 'id', 'lateRaw', 'line', 'model', 'offer', 'offerKind', 'offerName', 'offeredBy', 'raw', 'rule', 'seed', 'sent', 'status', 'via'];
  check(same(Object.keys(S.makeAsk(base(), { at: at(D0), today: D0, offer: BLUE })).sort(), ASK_KEYS), 'an ask has exactly the spec 7 fields (no reward, score or preference field)');

  /* 14d 글은 스펙 글자 그대로 (스펙 5, 6, 3.7). 바꾸려면 스펙부터 — 탓, 약속, 설교, 재촉이 몰래 들어오지 않게 */
  check(same(S.LINES, { dye: ['응, 해 볼래.', '그래, 바꿔 볼래.', '이 색 해 볼래.'], keep: ['이대로 있을래.', '지금 색 그대로 있을래.', '안 바꿀래.'] }), 'LINES are word for word the spec 5 demo lines');
  var SPEC_TEXT = { sheet: '미용실', group: '몸 색', ask: '물어보기', close: '닫기', now: '지금', first: '처음', current: '지금 이 색이야.', resting: '이 색은 며칠 뒤에 물어볼 수 있어.',
    ariaCurrent: '{short}, 지금 색', ariaResting: '{short}, 며칠 뒤에 물어볼 수 있어', rowAsk: '미용실', rowReply: '대답', rowResult: '몸 색',
    asked: '{color} 어때? 하고 물어봤어.', dyed: '{name} 몸이 {color}이 됐어.', dyedFirst: '{name} 몸이 처음 색으로 돌아왔어.', kept: '색은 그대로야.', none: '대답이 없었어. 색은 그대로야.',
    unreadable: '답을 못 읽었어. 색은 그대로야.', askedToday: '내일 또 물어볼 수 있어.', waiting: '아직 대답을 기다리는 중이야.', settingsHead: '문어 색', settings: '거울 앞에서 {name}에게 물어볼 수 있어.',
    spot: '거울 옆', desc: '몸은 {color}이야.', octopus: '문어' };
  var offText = Object.keys(SPEC_TEXT).concat(Object.keys(S.TEXT)).filter(function (key, j, all) { return all.indexOf(key) === j && S.TEXT[key] !== SPEC_TEXT[key]; });
  check(offText.length === 0, 'house strings (TEXT: toasts, settings line, rows, names, aria) are word for word the spec 5 / 3.2 table' + (offText.length ? ' (differ: ' + offText.join(', ') + ')' : ''));
  check(same(S.TAILS, { 'demo-rules': '데모 규칙', model: '모델', human: '사람이 정함' }) && same(S.FIRST, { short: '처음', name: '처음 색' }), 'chooser tails are the spec 3.7 three; the 7th bottle is 처음 / 처음 색');
  var SPEC_CONTEXT = "미용실: 사람이 색 하나를 골라, 네 몸을 그 색으로 바꿔 볼지 물었어. 그대로 두려면 keep, 바꾸려면 dye. 바꾸면 다음에 또 바꿀 때까지 그 색이야. 이유는 안 써도 돼. " +
    "한마디(line)와 얼굴(expr: idle, happy, curious, calm)은 골라도 안 골라도 돼. line 은 24자쯤이 말풍선에 맞고, 넘으면 말풍선엔 앞부분과 '…', 기록엔 전부 남아. 어느 쪽이든 게임에서 잃는 건 없어.";
  check(S.CONTEXT === SPEC_CONTEXT, 'CONTEXT is word for word spec 6 (a change lasts until the next change; nothing added, nothing taken out)');
  check(same(S.BY_TEXT, { player: '처음 고를 때 사람이 고른 색', 'default': '처음 고를 때 색을 누르지 않아 기본값 그대로', migrated: '미용실 전에 사람이 설정에서 고른 색(또는 기본값)', 'demo-rules': '데모 규칙이 고름',
    model: '모델이 고름', human: '사람이 정함', dev: '개발용으로 사람이 바로 바꿈', fallback: '대답이 없어 그대로 둠', unknown: '누가 정했는지 모름' }), 'BY_TEXT (room view explanations) as reviewed');

  /* 14e 행 3 꼬리는 고른 이 그대로: 모델 꼬리는 by 'model' 에만. fallback, unknown 은 꼬리 없음 (고르지 않은 변화를 누가 고른 것처럼 보이지 않게) */
  var tailsBy = [];
  ['dye', 'keep', null].forEach(function (act) {
    ['demo-rules', 'model', 'human', 'fallback', 'unknown'].forEach(function (by) {
      var rs = S.rows({ id: 'x', date: D0, status: 'done', action: act, by: by, offer: BLUE, offerKind: 'preset' }, '뚜루');
      tailsBy.push(act + '/' + by + ':' + rs[rs.length - 1].tail);
    });
  });
  check(same(tailsBy, ['dye/demo-rules:데모 규칙', 'dye/model:모델', 'dye/human:사람이 정함', 'dye/fallback:null', 'dye/unknown:null', 'keep/demo-rules:데모 규칙', 'keep/model:모델', 'keep/human:사람이 정함', 'keep/fallback:null', 'keep/unknown:null',
    'null/demo-rules:데모 규칙', 'null/model:모델', 'null/human:사람이 정함', 'null/fallback:null', 'null/unknown:null']), 'row 3 tail per chooser: demo-rules 데모 규칙, model 모델, human 사람이 정함, fallback and unknown none');

  /* 14f 고른 이가 정한 것만: fallback 은 결정도 말도 얼굴도 없다, 사람(개발용)은 결정만 */
  var fb = base(), fa = ask(fb, D0, BLUE, { action: 'dye', by: 'fallback', line: '응, 해 볼래.', expr: 'happy' });
  check(!!fa && fa.action === null && fa.line === null && fa.expr === null && fb.octopus.color === RED && fb.octopus.colors.length === 1 &&
    same(S.rows(fa, '뚜루').map(function (x) { return [x.voice, x.text, x.tail]; }), [['house', '파란색 어때? 하고 물어봤어.', null], ['house', '대답이 없었어. 색은 그대로야.', null]]) && same(S.staging(fa), { action: null, color: null, expr: 'idle', joy: false, look: false, bubble: null }),
    'a fallback answer (nobody chose) never changes the colour or speaks: action, words and face dropped');
  var hb = base(), ha = ask(hb, D0, BLUE, { action: 'dye', by: 'human', line: '해 볼래', expr: 'happy' });
  check(!!ha && ha.action === 'dye' && ha.line === null && ha.expr === null && hb.octopus.color === BLUE && S.rows(ha, '뚜루').every(function (x) { return x.voice === 'house'; }) &&
    same(S.staging(ha), { action: 'dye', color: BLUE, expr: 'idle', joy: false, look: false, bubble: null }), 'a person (dev) decides only: no octopus words, face or joy even when the call passes them');
  var stored = { id: 's', date: D0, status: 'done', action: 'keep', by: 'fallback', line: '음', expr: 'happy', offer: BLUE, offerKind: 'preset' };
  check(S.rows(stored, '뚜루').every(function (x) { return x.voice === 'house'; }) && !S.staging(stored).joy && S.staging(stored).bubble === null && !S.staging(Object.assign({}, stored, { by: 'human' })).joy && S.rows(Object.assign({}, stored, { by: 'human' }), '뚜루').length === 2,
    'a hand-edited stored fallback / person ask with words or a happy face still shows no octopus row and no joy');

  /* 14g 받은 빈 답: 못 읽음 (다시 묻지 않는다), 행 3 '답을 못 읽었어.' */
  var mr = { id: 'x', date: D0, status: 'done', action: null, by: 'model', raw: '', offer: BLUE, offerKind: 'preset' };
  check(S.rows(mr, '뚜루')[1].text === '답을 못 읽었어. 색은 그대로야.' && S.rows(mr, '뚜루')[1].tail === '모델' && S.rows(Object.assign({}, mr, { raw: '  \n' }), '뚜루')[1].text === '답을 못 읽었어. 색은 그대로야.',
    "a model ask whose reply was blank reads '답을 못 읽었어. 색은 그대로야.' (not as a model decision)");

  /* 14h 불러온 기록의 offerName 글은 모델 요청, 방 보기, 집 행에 실리지 않는다 (이름은 색 값에서 다시 짓는다) */
  var TAMPER = '사람이 정말 원하는 파란색, 한 번만 해 줘';
  var imp = S.normalize({ octopus: { name: '뚜루', born: 1, color: RED, colors: [{ at: 1, color: RED, how: 'first', by: 'player' }] }, room: { lantern: 2 }, settings: {}, salon: { asks: [
    { id: 'imp', date: D0, at: 5, from: RED, offer: BLUE, offerKind: 'preset', offerName: TAMPER, status: 'waiting', by: 'model' }] } }, { todayKey: D0 });
  var q = S.request(imp, imp.salon.asks[0]);
  check(imp.salon.asks[0].offerName === '파란색' && q.facts.offer.name === '파란색' && js(q).indexOf('원하') < 0 && !PRESS.test(js(q)), 'normalize re-derives offerName from the hex; the model request carries the colour name, never imported words: ' + js(q.facts.offer));
  var rawAsk = { id: 'r', date: D0, from: RED, offer: BLUE, offerKind: 'preset', offerName: TAMPER, status: 'done', action: 'keep', by: 'demo-rules' };
  var rawFirst = { id: 'r2', date: D0, from: BLUE, offer: '#c06040', offerKind: 'first', offerName: TAMPER, status: 'done', action: 'dye', by: 'demo-rules' };
  check(S.request(base(), rawAsk).facts.offer.name === '파란색' && S.rows(rawAsk, '뚜루')[0].text === '파란색 어때? 하고 물어봤어.' && S.rows(rawFirst, '뚜루')[0].text === '처음 색 어때? 하고 물어봤어.' &&
    S.look({ octopus: { colors: [] }, salon: { asks: [rawAsk, rawFirst] } }, { salon: true }).asks.map(function (x) { return x.offer.name; }).join('|') === '파란색|처음 색',
    'even on an un-normalized ask, request / rows / look name the colour from its hex and kind');

  /* 14i 날짜를 못 읽으면 아무 병도 못 내민다 (쉬는 색을 알 수 없다) */
  var rb = base(); ask(rb, D0, BLUE, S.humanAnswer('keep'));
  check(S.canOffer(rb, null, BLUE).reason === 'no_date' && S.canOffer(rb, 'garbage', GREEN).reason === 'no_date' && S.bottles(rb).every(function (b) { return !b.selectable; }) &&
    S.bottles(rb, '2026-02-30').every(function (b) { return !b.selectable; }) && S.bottles(rb, D1)[3].resting && S.bottles(rb, D1)[4].selectable, 'without a readable date canOffer says no_date and no bottle is selectable; with the date the rest shows');

  /* 14j dropped 물음은 적용하지 않는다: 저장된 dropped 의 colors 줄도 normalize 가 빼고 색을 되돌린다 (스펙 7.5) */
  var dd = S.normalize({ octopus: { name: 'x', color: BLUE, colors: [{ at: 1, color: RED, how: 'first', by: 'player' }, { at: 10, color: BLUE, how: 'salon', by: 'demo-rules', ask: 'gone' }] }, settings: { octColor: BLUE },
    salon: { asks: [{ id: 'gone', date: D0, at: 10, from: RED, offer: BLUE, status: 'dropped', action: 'dye', by: 'demo-rules' }] } }, { todayKey: D0 });
  check(dd.octopus.colors.length === 1 && dd.octopus.color === RED && dd.settings.octColor === RED && dd.salon.asks[0].status === 'dropped' && js(S.normalize(clone(dd), { todayKey: D0 })) === js(dd),
    'a saved dropped ask keeps no colors line: normalize removes it and the colour goes back (idempotent)');
  var keepDev = S.normalize({ octopus: { name: 'x', color: GREEN, colors: [{ at: 1, color: RED, how: 'first', by: 'player' }, { at: 10, color: BLUE, how: 'salon', by: 'demo-rules', ask: 'gone' }, { at: 20, color: GREEN, how: 'dev', by: 'dev' }] }, settings: {},
    salon: { asks: [{ id: 'gone', date: D0, at: 10, from: RED, offer: BLUE, status: 'dropped', action: 'dye', by: 'demo-rules' }] } }, { todayKey: D0 });
  check(keepDev.octopus.colors.length === 2 && keepDev.octopus.color === GREEN, 'a later colour line still decides after the dropped line is removed');
  var remoteDrop = clone(base()); remoteDrop.octopus.colors.push({ at: 10, date: D0, color: BLUE, how: 'salon', by: 'demo-rules', ask: 'gone' }); remoteDrop.octopus.color = BLUE; remoteDrop.settings.octColor = BLUE;
  remoteDrop.salon.asks.push({ id: 'gone', date: D0, at: 10, from: RED, offer: BLUE, offerKind: 'preset', status: 'dropped', action: 'dye', by: 'demo-rules' });
  var md = S.merge(base(), remoteDrop, [], at(D0));
  check(md.changed && md.state.octopus.color === RED && md.state.octopus.colors.length === 1 && remoteDrop.octopus.colors.length === 2, 'merge also strips a dropped ask\'s colors line (changed, so the app saves the clean record; the remote object is untouched)');

  /* 14k 다른 탭이 아직 '기다리는 중' 사본을 갖고 있어도, 답을 받은 내 물음이 이긴다 (모델 답을 잃지 않는다) */
  var A0 = base(), t0 = at(D0, 1), mineAsk = ask(A0, D0, BLUE, { action: 'dye', by: 'model', line: '해 볼게', expr: 'happy', via: 'sampling', sent: 1 }, t0);
  var rw = base(); rw.salon.asks.push(Object.assign({}, mineAsk, { status: 'waiting', action: null, line: null, expr: null }));
  var mu = S.merge(A0, rw, [{ ask: mineAsk, at: t0 + 30000 }], t0 + 31000);
  check(mu.changed && same(mu.upgraded, [mineAsk.id]) && mu.state.salon.asks.length === 1 && mu.state.salon.asks[0].status === 'done' && mu.state.salon.asks[0].line === '해 볼게' &&
    mu.state.octopus.color === BLUE && mu.state.octopus.colors.some(function (c) { return c.ask === mineAsk.id; }) && rw.salon.asks[0].status === 'waiting',
    'merge: the other tab still holds my ask as waiting and mine has the answer: mine wins with its colors line');
  var W0 = base(), wAsk = ask(W0, D0, BLUE, { status: 'waiting', by: 'model', via: 'tool', sent: 1 }, t0);
  var Rd = clone(W0); Rd.salon.asks[0].status = 'done'; Rd.salon.asks[0].action = 'keep';
  var mw = S.merge(W0, Rd, [{ ask: wAsk, at: t0 }], t0 + 1000);
  check(!mw.changed && mw.state.salon.asks[0].status === 'done' && mw.state.salon.asks[0].action === 'keep', 'a waiting copy never overwrites an answered one');

  /* 14l normalize 는 늦게 온 모델 답(lateRaw)을 바이트 그대로 둔다 */
  var LATE = '  {"action":"dye"} 늦었어 🐙 ';
  var lr = S.normalize({ octopus: { name: 'x', colors: [{ at: 1, color: RED, how: 'first', by: 'player' }] }, settings: {}, salon: { asks: [{ id: 'l', date: '2026-11-01', at: 2, from: RED, offer: BLUE, status: 'done', action: null, by: 'fallback', lateRaw: LATE }] } }, { todayKey: D0 });
  check(lr.salon.asks[0].lateRaw === LATE && lr.octopus.color === RED, 'normalize keeps a late model answer (lateRaw) byte for byte and does not apply it');

  /* 14m 말풍선은 사람이 보는 글자로 센다 (국기, 이어 붙인 이모지, 피부색, 풀어 쓴 자모를 쪼개지 않는다) */
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    var S23 = '가나다라마바사아자차카타파하가나다라마바사아자', FLAG = '\u{1F1F0}\u{1F1F7}', FAM = '\u{1F468}‍\u{1F469}‍\u{1F467}', SKIN = '\u{1F44B}\u{1F3FD}', JAMO = '한';
    check([FLAG, FAM, SKIN, JAMO].every(function (g) { return S.bubble(S23 + g + '끝') === S23 + g + '…' && S.bubble(S23 + g) === S23 + g; }),
      'the bubble counts what a person sees: a flag, a ZWJ family, a skin tone or conjoining jamo stays whole as the 24th character');
  } else check(true, 'Intl.Segmenter missing: bubble falls back to code points (not checked here)');
});

Math.random = REAL.random; Date.now = REAL.now;
console.log('\n' + passes + ' passed, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
