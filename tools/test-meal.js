#!/usr/bin/env node
/* tools/test-meal.js - 식탁 규칙 (js/meal.js) 시험. node 만, 의존성 없음. 실패하면 exit 1.
 *
 *   node tools/test-meal.js          (-v: 통과한 검사도 한 줄씩)
 *
 * 스펙 wip/round6/eat-spec.md §11 M · docs/MEAL.md:
 *    0 불러오기: module.exports + 전역 MEAL, DOM / 시계 / 저장소 / Math.random 없음
 *    1 글: TEXT 그대로, 조사 (받침 있는 이름 · 없는 이름 · 숫자 · 영문), 마음 말 0, 기호 0
 *    2 normDish: 부엌 result 글 검사
 *    3 demoAnswer: 처음 = 먹기, 1000 요리 id 에 55–65 % 먹기, 요리 종류와 무관, 결정적, 입력은 넷뿐
 *    4 makeAsk: 요리 하나에 대답 하나 (다시 안 뽑음), 개발용 사람 답
 *    5 canCall
 *    6 eat / active: 바꿈 (늦은 것이 이김), 날이 바뀌면 없음, ate.oct true / false / null
 *    7 rows / toastParts / sceneDesc / aria: 먹은 기록만, ate.oct null 이면 대답 행 없음, 모델 말 그대로
 *    8 normalize: 모르는 값 지킴, 객체 아닌 것만 버림, 멱등
 *    9 merge: 두 탭
 *   10 slim: 1년 넘은 seed · raw 만, line 은 그대로
 *   11 R11: request / readReply 코드 없음
 */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.resolve(__dirname, '..');
var FILE = path.join(ROOT, 'js', 'meal.js');
var SRC = fs.readFileSync(FILE, 'utf8');
var VERBOSE = process.argv.indexOf('-v') >= 0;
var passes = 0, failures = 0;
function check(cond, msg) { if (cond) { passes++; if (VERBOSE) console.log('  ok   ' + msg); } else { failures++; console.log('  FAIL ' + msg); } }
function section(name, fn) { console.log('\n' + name); try { fn(); } catch (e) { failures++; console.log('  FAIL (threw) ' + (e && e.stack || e)); } }

var REAL = { random: Math.random, now: Date.now };
Math.random = function () { throw new Error('Math.random used'); };
Date.now = function () { throw new Error('Date.now used'); };
var M = require(FILE);
var D0 = '2026-11-18', D1 = '2026-11-19';
function dish(id, recipe) { return { v: 1, id: id, recipe: recipe || 'jeon', seed: 7, look: { band: 1 }, day: D0, at: 1000 }; }
function stateWith(o) {
  o = o || {};
  return { octopus: { name: o.name == null ? '뚜루' : o.name, born: o.born == null ? 111 : o.born }, user: { table: o.table === undefined ? dish('ck_a') : o.table, meals: o.meals || [] } };
}

section('0 load', function () {
  check(typeof M === 'object' && global.MEAL === M, 'module.exports and global MEAL');
  var code = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  ['document', 'window.', 'localStorage', 'setTimeout', 'setInterval', 'Math.random', 'Date.now', 'new Date()', 'fetch(', 'XMLHttpRequest', 'import ', 'export '].forEach(function (w) {
    check(code.indexOf(w) < 0, 'no ' + w + ' in js/meal.js code');
  });
  var ctx = { console: console }; ctx.globalThis = ctx;
  vm.runInNewContext(SRC, ctx);
  check(ctx.MEAL && typeof ctx.MEAL.demoAnswer === 'function', 'loads in a bare context (browser path)');
  check(M.P_EAT === 0.6 && M.FIRST_EAT === true && M.MINE_MS === 60000, 'P_EAT 0.6 · FIRST_EAT · MINE_MS 60000');
  check(JSON.stringify(M.DISHES) === JSON.stringify({ jeon: { name: '해초전', fx: 'sparkle' }, jumeokbap: { name: '주먹밥', fx: 'star' }, kkochi: { name: '과일 꼬치', fx: 'petal' },
    jeon2: { name: '해초전', fx: 'sparkle' }, gyeran: { name: '계란말이', fx: 'bubble' }, jumeokbap2: { name: '주먹밥', fx: 'star' }, kkochi2: { name: '과일 꼬치', fx: 'petal' }, cake: { name: '딸기 케이크', fx: 'confetti' } }), 'DISHES exact (11-21: the legacy three + the five of the recipe book)');
  check(JSON.stringify(M.FX_NAME) === JSON.stringify({ sparkle: '반짝이', star: '별', petal: '꽃잎', bubble: '방울', confetti: '색종이' }), 'FX_NAME exact');
  check(JSON.stringify(M.TAILS) === JSON.stringify({ 'demo-rules': '데모 규칙', model: '모델', human: '사람이 정함' }), 'TAILS exact');
  check(Object.isFrozen(M.TEXT) && Object.isFrozen(M.DISHES.jeon), 'tables are frozen');
});

section('1 words and particles', function () {
  check(M.josa('뚜루', '은') === '뚜루는' && M.josa('문어', '은') === '문어는' && M.josa('곰', '은') === '곰은', 'josa 은/는: 뚜루는 · 문어는 · 곰은');
  check(M.josa('뚜루', '이') === '뚜루가' && M.josa('곰', '이') === '곰이' && M.josa('별', '이') === '별이' && M.josa('반짝이', '이') === '반짝이가' && M.josa('꽃잎', '이') === '꽃잎이', 'josa 이/가');
  check(M.josa('해초전', '을') === '해초전을' && M.josa('주먹밥', '을') === '주먹밥을' && M.josa('과일 꼬치', '을') === '과일 꼬치를', 'josa 을/를');
  check(M.josa('Tom', '은') === 'Tom은' && M.josa('Bo', '은') === 'Bo는' && M.josa('R2', '은') === 'R2는' && M.josa('7', '은') === '7은', 'josa for latin and digits (world.js nameJosa rule)');
  var T = M.TEXT;
  check(T.eat === '{name}도 같이 먹기로 했어.' && T.watch === '{name}{은} 보기만 하기로 했어.' && T.none === '대답이 없었어.', 'decision texts exact');
  check(T.mealAlone === '{dish}{을} 먹었어. 오늘 하루 {fx}{이} 따라다녀.' && T.mealTogether === '{dish}{을} 같이 먹었어. 오늘 하루 둘 다 {fx}{이} 따라다녀.', 'meal texts exact');
  check(T.ariaCall === '{name} 부르기' && T.ariaSeat === '식탁에 앉기' && T.ariaTable === '식탁' && T.ariaTableDish === '식탁, {dish}' && T.ariaEat === '{dish} 먹기', 'aria texts exact');
  var CLAIM = /좋|싫|맛있|싶|배불|즐거|재밌|행복|기뻐|기쁘|반가|궁금|설레|원해|바라|고마|미안|슬프|아쉬|맛|기분/;
  var all = [];
  (function walk(o) { Object.keys(o).forEach(function (k) { var v = o[k]; if (typeof v === 'string') all.push(v); else if (v && typeof v === 'object') walk(v); }); })({ T: M.TEXT, D: M.DISHES, F: M.FX_NAME, A: M.TAILS });
  check(all.length > 20 && all.every(function (s) { return !CLAIM.test(s); }), 'no feeling / taste / want word in any string (' + all.length + ')');
  check(all.every(function (s) { return !/[←-⯿\u{1F000}-\u{1FAFF}️]/u.test(s) && !/[0-9]/.test(s); }), 'no emoji, symbol or digit in any string');
});

section('2 normDish', function () {
  var ok = { ppolCook: 'result', v: 1, id: 'ck_m3x9a', recipe: 'jumeokbap', seed: 4294967295, look: { band: 2, plate: 1 }, day: D0 };
  var n = M.normDish(ok);
  check(n && n.v === 1 && n.id === 'ck_m3x9a' && n.recipe === 'jumeokbap' && n.seed === 4294967295 && n.day === D0 && n.look.band === 2 && !('ppolCook' in n), 'a good result message → { v, id, recipe, seed, look, day }');
  check(n.look !== ok.look, 'look is a copy');
  check(M.normDish(Object.assign({}, ok, { day: '' })).day === '' && M.normDish(Object.assign({}, ok, { day: undefined })).day === '', "day '' or missing → ''");
  [['id', 'ck_'], ['id', 'ck_ABC'], ['id', 'xx_abc'], ['id', 'ck_12345678901234'], ['id', 5], ['recipe', ''], ['recipe', '주먹밥'], ['recipe', 'a'.repeat(17)], ['seed', -1], ['seed', 1.5], ['seed', 4294967296], ['seed', '3'],
    ['look', null], ['look', []], ['look', 'x'], ['look', { s: 'x'.repeat(2100) }], ['day', '11-18'], ['day', 20261118]].forEach(function (p) {
    var bad = Object.assign({}, ok); bad[p[0]] = p[1];
    check(M.normDish(bad) === null, 'refused: ' + p[0] + ' = ' + JSON.stringify(p[1]).slice(0, 30));
  });
  check(M.normDish(null) === null && M.normDish('x') === null, 'non-objects refused');
  var cyc = { a: 1 }; cyc.self = cyc;
  check(M.normDish(Object.assign({}, ok, { look: cyc })) === null, 'a look that cannot be JSON is refused');
});

section('3 demoAnswer', function () {
  var first = M.demoAnswer({ dish: 'ck_a', name: '뚜루', born: 1, asksBefore: 0 });
  check(first.action === 'eat' && first.rule === 'first' && first.by === 'demo-rules', 'first call ever → eat, rule first');
  var eat = 0, N = 1000, shape = 0;
  for (var i = 0; i < N; i++) { var a = M.demoAnswer({ dish: 'ck_' + i.toString(36), name: '뚜루', born: 1, asksBefore: 3 }); if (a.action === 'eat') eat++; if (a.rule === 'seed' && a.by === 'demo-rules' && (a.action === 'eat' || a.action === 'watch')) shape++; }
  check(shape === N, 'seed answers are eat or watch, rule seed, by demo-rules');
  check(eat >= 550 && eat <= 650, 'about 3 in 5 eat over 1000 dish ids (' + eat + ')');
  var x = M.demoAnswer({ dish: 'ck_q', name: '곰', born: 5, asksBefore: 2 }), y = M.demoAnswer({ dish: 'ck_q', name: '곰', born: 5, asksBefore: 9, recipe: 'kkochi', fx: 'petal', hour: 3 });
  check(x.action === y.action && x.seed === y.seed, 'deterministic; recipe, effect, time and the count beyond zero are not inputs');
  check(x.seed === M._copy.hashSeed('meal', 'ck_q', '곰', '5'), "seed = hashSeed('meal', dish, name, born)");
  var S1 = stateWith({ table: dish('ck_z', 'jeon') }), S2 = stateWith({ table: dish('ck_z', 'kkochi') });
  S1.user.meals.push({ id: 'ml_x', dish: 'ck_o', ask: { by: 'demo-rules', action: 'eat' }, ate: null }); S2.user.meals.push({ id: 'ml_x', dish: 'ck_o', ask: { by: 'demo-rules', action: 'eat' }, ate: null });
  var e1 = M.makeAsk(S1, { at: 1, today: D0 }), e2 = M.makeAsk(S2, { at: 1, today: D0 });
  check(e1.ask.action === e2.ask.action && e1.ask.seed === e2.ask.seed, 'the same dish id gives the same answer whatever the recipe');
  var bad = M.demoAnswer({ dish: 'ck_a', name: 'x', born: 1 });
  check(bad.rule === 'seed', 'a missing count takes the seed path (never the first rule by accident)');
  var oldFirst = M.FIRST_EAT; M.FIRST_EAT = false;
  check(M.demoAnswer({ dish: 'ck_a', name: 'x', born: 1, asksBefore: 0 }).rule === 'seed', 'FIRST_EAT false → the seed path also at first');
  M.FIRST_EAT = oldFirst;
});

section('4 makeAsk: one answer per dish', function () {
  var S = stateWith();
  var e = M.makeAsk(S, { at: 500, today: D0 });
  check(e && e.dish === 'ck_a' && e.recipe === 'jeon' && e.date === D0 && e.at === 500 && /^ml_[0-9a-z]+$/.test(e.id), 'entry made for the waiting dish');
  check(e.ask && e.ask.action === 'eat' && e.ask.rule === 'first' && e.ask.at === 500 && e.ate === null, 'first ask → eat (first), not yet eaten');
  check(S.user.meals.length === 1 && S.user.table && S.user.table.id === 'ck_a', 'the dish still waits after the ask');
  var again = M.makeAsk(S, { at: 900, today: D0, answer: M.humanAnswer('watch') });
  check(again === e && again.ask.at === 500 && again.ask.action === 'eat' && S.user.meals.length === 1, 'asking again for the same dish replays the stored answer (no new row, no re-roll)');
  check(M.entryFor(S, 'ck_a') === e && M.asksBefore(S) === 1, 'entryFor · asksBefore');
  S.user.table = dish('ck_b');
  var h = M.makeAsk(S, { at: 600, today: D0, answer: M.humanAnswer('watch') });
  check(h.ask.by === 'human' && h.ask.action === 'watch' && !('line' in h.ask) && !('rule' in h.ask), 'dev human answer: decision only');
  check(M.humanAnswer('dance').action === null && M.humanAnswer('stop').action === 'stop', 'humanAnswer keeps only the menu');
  check(M.makeAsk(stateWith({ table: null }), { at: 1, today: D0 }) === null, 'no dish → null');
  check(M.makeAsk(stateWith(), { at: 1, today: 'nope' }) === null, 'no date → null');
  check(M.makeAsk(stateWith(), { at: 1, today: D0, answer: { by: 'someone', action: 'eat' } }) === null, 'an answer without a known chooser → null');
  var md = M.makeAsk(stateWith(), { at: 1, today: D0, answer: { by: 'model', action: 'eat', line: '  한 입 먹어 볼게 ', expr: 'calm', model: 'm', raw: '{"a":1}' } });
  check(md.ask.line === '  한 입 먹어 볼게 ' && md.ask.expr === 'calm' && md.ask.raw === '{"a":1}', 'a model line is stored byte for byte');
  var fb = M.makeAsk(stateWith(), { at: 1, today: D0, answer: { by: 'fallback', action: 'eat' } });
  check(fb.ask.by === 'fallback' && fb.ask.action === null, 'fallback has no action');
});

section('5 canCall', function () {
  var S = stateWith(), ok = { seated: true };
  check(M.canCall(S, D0, ok).ok, 'dish + seated + home and awake → ok');
  check(M.canCall(stateWith({ table: null }), D0, ok).reason === 'no_dish', 'no dish → no_dish');
  check(M.canCall(S, D0, {}).reason === 'not_seated', 'not seated → not_seated');
  check(M.canCall(S, D0, { seated: true, away: true }).reason === 'away', 'away');
  check(M.canCall(S, D0, { seated: true, asleep: true }).reason === 'asleep', 'asleep (a call never wakes it)');
  check(M.canCall(S, D0, { seated: true, busy: true }).reason === 'busy', 'busy (a ceremony, the salon or another meal staging)');
  check(M.canCall(S, D0, { seated: true, asleep: false, awakeWindow: true }).ok, 'the post-walk awake window counts as awake');
});

section('6 eat / active', function () {
  var S = stateWith();
  M.makeAsk(S, { at: 10, today: D0 });
  var e = M.eat(S, { at: 20, today: D0, oct: true });
  check(e.ate && e.ate.me === true && e.ate.oct === true && e.ate.fx === 'sparkle' && e.ate.date === D0 && e.ate.at === 20, 'eat: ate { at, date, me, oct, fx }');
  check(S.user.table === null, 'the eaten dish leaves the table');
  check(M.eat(S, { at: 30, today: D0, oct: null }) === null, 'nothing waits → null');
  var A = M.active(S, D0);
  check(A.me === 'sparkle' && A.oct === 'sparkle', 'active: both sparkle');
  S.user.table = dish('ck_b', 'kkochi');
  var w = M.eat(S, { at: 40, today: D0, oct: false });
  check(w.ask === null && w.ate.oct === false, 'eating without asking while it sits there: oct false, no ask');
  A = M.active(S, D0);
  check(A.me === 'petal' && A.oct === 'sparkle', 'replace: my later dish wins for me; the octopus keeps its own (it did not eat this one)');
  S.user.table = dish('ck_c', 'jumeokbap');
  M.eat(S, { at: 50, today: D0, oct: null });
  A = M.active(S, D0);
  check(A.me === 'star' && A.oct === 'sparkle', 'alone (oct null): only me');
  check(M.active(S, D1).me === null && M.active(S, D1).oct === null, 'next day → both null (derived)');
  check(S.user.meals.length === 3 && S.user.meals.every(function (m) { return m.ate; }), 'records stay');
  S.user.table = dish('ck_d', 'brandnew');
  M.eat(S, { at: 60, today: D0, oct: true });
  A = M.active(S, D0);
  check(A.me === null && A.oct === null, 'a later dish this build does not know replaces the effect with none (never an older one)');
  var S2 = stateWith(); S2.user.table = dish('ck_new');
  var other = { id: 'ml_o', dish: 'ck_old', recipe: 'jumeokbap', date: D0, at: 1, ask: { at: 1, action: 'eat', by: 'demo-rules', rule: 'first' }, ate: null };
  S2.user.meals.push(other);
  var e2 = M.eat(S2, { at: 70, today: D0, oct: true, dish: 'ck_old' });
  check(e2 === other && e2.ate.fx === 'star' && S2.user.table.id === 'ck_new', 'eat by dish id: the staged dish is eaten even if another tab put a new dish on the table (that one keeps waiting)');
  var again = M.eat(S2, { at: 80, today: D0, oct: false, dish: 'ck_old' });
  check(again.ate.at === 70 && again.ate.oct === true, 'eating the same dish twice keeps the first meal');
});

section('7 rows · toast · desc · aria', function () {
  var S = stateWith({ name: '뚜루' });
  var e = M.makeAsk(S, { at: 10, today: D0 });
  check(M.rows(e, '뚜루').length === 0, 'no rows before the meal (an ask alone draws nothing)');
  var tp = M.toastParts(e, '뚜루');
  check(tp.text === '뚜루도 같이 먹기로 했어.' && tp.tail === '데모 규칙', 'toast eat: 뚜루도 같이 먹기로 했어. + 데모 규칙');
  M.eat(S, { at: 20, today: D0, oct: true });
  var r = M.rows(e, '뚜루');
  check(r.length === 2 && r[0].label === '식탁' && r[0].text === '뚜루도 같이 먹기로 했어.' && r[0].tail === '데모 규칙' && r[0].n === 1, 'row 1: the decision with its tail');
  check(r[1].text === '해초전을 같이 먹었어. 오늘 하루 둘 다 반짝이가 따라다녀.' && r[1].tail === null && r[1].n === 2, 'row 2: together');
  var W = stateWith({ name: '곰', table: dish('ck_w', 'kkochi') });
  var we = M.makeAsk(W, { at: 1, today: D0, answer: { by: 'demo-rules', action: 'watch', rule: 'seed', seed: 3 } });
  check(M.toastParts(we, '곰').text === '곰은 보기만 하기로 했어.' && M.toastParts(we, '문어').text === '문어는 보기만 하기로 했어.' && M.toastParts(we, '뚜루').text === '뚜루는 보기만 하기로 했어.', 'watch: 곰은 · 문어는 · 뚜루는');
  M.eat(W, { at: 2, today: D0, oct: false });
  var wr = M.rows(we, '곰');
  check(wr.length === 2 && wr[1].text === '과일 꼬치를 먹었어. 오늘 하루 꽃잎이 따라다녀.', 'watch: decision row + meal row (alone wording)');
  var A = stateWith({ table: dish('ck_s', 'jumeokbap') });
  var ae = M.eat(A, { at: 1, today: D0, oct: null });
  var ar = M.rows(ae, '뚜루');
  check(ar.length === 1 && ar[0].text === '주먹밥을 먹었어. 오늘 하루 별이 따라다녀.', 'alone: meal row only');
  var X = stateWith({ table: dish('ck_x') });
  M.makeAsk(X, { at: 1, today: D0 });
  var xe = M.eat(X, { at: 2, today: D0, oct: null });
  check(M.rows(xe, '뚜루').length === 1, 'asked, then the visit was aborted and I ate alone: no decision row (ate.oct null)');
  var past = M.rows(e, '뚜루', D1);
  check(past[1].text === '해초전을 같이 먹었어. 그날 하루 둘 다 반짝이가 따라다녔어.' && M.rows(e, '뚜루', D0)[1].text === r[1].text, 'past days say 그날 하루 … 따라다녔어 (the effect ended)');
  check(M.rows(ae, '뚜루', D1)[0].text === '주먹밥을 먹었어. 그날 하루 별이 따라다녔어.', 'past alone');
  var nm = M.rows(e, '');
  check(nm[0].text === '문어도 같이 먹기로 했어.', "no name → '문어'");
  var md = { id: 'ml_m', dish: 'ck_m', recipe: 'jeon', ask: { at: 1, action: 'eat', by: 'model', line: '같이 먹을게 :)', expr: 'happy' }, ate: { at: 2, date: D0, me: true, oct: true, fx: 'sparkle' } };
  var mr = M.rows(md, '뚜루');
  check(mr[0].text === '같이 먹을게 :)' && mr[0].voice === 'octopus' && mr[0].raw === true && mr[0].tail === '모델', 'model line verbatim with tail 모델');
  var fb = { id: 'ml_f', dish: 'ck_f', recipe: 'jeon', ask: { at: 1, action: null, by: 'fallback' }, ate: { at: 2, date: D0, me: true, oct: false, fx: 'sparkle' } };
  check(M.rows(fb, '뚜루')[0].text === '대답이 없었어.' && M.rows(fb, '뚜루')[0].tail === null, 'fallback: 대답이 없었어. (no tail)');
  var hu = { id: 'ml_h', dish: 'ck_h', recipe: 'jeon', ask: { at: 1, action: 'watch', by: 'human' }, ate: { at: 2, date: D0, me: true, oct: false, fx: 'sparkle' } };
  check(M.rows(hu, '뚜루')[0].tail === '사람이 정함', 'human tail');
  var st = { id: 'ml_t', dish: 'ck_t', recipe: 'jeon', ask: { at: 1, action: 'stop', by: 'model' }, ate: { at: 2, date: D0, me: true, oct: false, fx: 'sparkle' } };
  check(M.rows(st, '곰')[0].text === '곰은 다락으로 돌아가기로 했어.', 'stop line (model path, later)');
  var unk = { id: 'ml_u', dish: 'ck_u', recipe: 'soup', ask: null, ate: { at: 2, date: D0, me: true, oct: null, fx: 'steam' } };
  check(M.rows(unk, '뚜루').length === 0, 'an unknown dish is kept but never displayed');
  var D = stateWith({ table: dish('ck_d', 'kkochi') });
  check(M.sceneDesc(D, D0, '뚜루', false) === '식탁에 과일 꼬치가 있어.', 'desc: dish on the table');
  check(M.sceneDesc(D, D0, '뚜루', true) === '식탁에 과일 꼬치가 있어. 뚜루는 식탁 맞은편에 앉아 있어.', 'desc: seated');
  M.eat(D, { at: 3, today: D0, oct: null });
  check(M.sceneDesc(D, D0, '뚜루', false) === '꽃잎이 따라다녀.' && M.sceneDesc(D, D1, '뚜루', false) === '', 'desc: effect today, none tomorrow');
  check(M.aria('table', {}) === '식탁' && M.aria('table', { recipe: 'jeon' }) === '식탁, 해초전' && M.aria('table', { recipe: 'jeon', seated: true }) === '해초전 먹기', 'aria table');
  check(M.aria('seat') === '식탁에 앉기' && M.aria('call', { name: '뚜루' }) === '뚜루 부르기' && M.aria('call', {}) === '문어 부르기', 'aria seat · call');
});

section('8 normalize', function () {
  var u = { table: 'junk', meals: [1, null, 'x', { id: 'ml_a', dish: 'ck_a', recipe: 'future', ask: 'x', ate: { oct: 'maybe', fx: 'glow' }, extra: { keep: 1 } }, { id: 'ml_a', dish: 'dup' }, { id: 'ml_b' }] };
  M.normalize(u);
  check(u.table === null, 'a non-object table → null');
  check(u.meals.length === 2 && u.meals[0].recipe === 'future' && u.meals[0].ate.fx === 'glow' && u.meals[0].extra.keep === 1, 'unknown values kept; non-objects and a duplicate id dropped');
  check(u.meals[0].ask === null && u.meals[0].ate.oct === 'maybe' && u.meals[1].ask === null && u.meals[1].ate === null, 'ask / ate fixed to null or object; an unknown ate.oct is kept in storage');
  check(M.rows({ id: 'x', dish: 'ck_x', recipe: 'jeon', ask: { by: 'demo-rules', action: 'eat' }, ate: { at: 1, date: D0, oct: 'maybe', fx: 'sparkle' } }, 'a').length === 1, 'an unknown ate.oct reads as not at the table (no decision row)');
  var dup = { meals: [{ id: 'ml_d', dish: 'ck_d', ask: null, ate: null, first: 1 }, { id: 'ml_d', dish: 'ck_d', ask: { by: 'demo-rules', action: 'eat' }, ate: { at: 1, date: D0, me: true, oct: true, fx: 'star' } }] };
  M.normalize(dup);
  check(dup.meals.length === 1 && dup.meals[0].ate && dup.meals[0].ate.fx === 'star', 'a duplicate id keeps the eaten one (never loses a meal)');
  var j = JSON.stringify(u); M.normalize(u);
  check(JSON.stringify(u) === j, 'idempotent');
  var v = {}; M.normalize(v);
  check(v.table === null && Array.isArray(v.meals) && v.meals.length === 0, 'a fresh user gets table null and meals []');
  var t = { table: { id: 'ck_a', recipe: 'x', at: 5, later: true } }; M.normalize(t);
  check(t.table.later === true, 'a table object is kept as is');
});

section('9 merge (two tabs)', function () {
  function S(o) { return { octopus: { name: 'a', born: o.born || 1 }, trips: [], user: { table: o.table === undefined ? null : o.table, meals: o.meals || [], shells: 3 } }; }
  var e1 = { id: 'ml_1', dish: 'ck_1', recipe: 'jeon', date: D0, at: 10, ask: { at: 10, action: 'eat', by: 'demo-rules' }, ate: null };
  var e1ate = Object.assign({}, e1, { ate: { at: 20, date: D0, me: true, oct: true, fx: 'sparkle' } });
  var L = S({ meals: [e1ate] }), R = S({ meals: [e1], table: dish('ck_1') });
  var m = M.merge(L, R, [{ entry: e1ate, at: 100 }], 120);
  check(m.state.user.meals[0].ate && m.state.user.table === null && m.changed, 'ate beats none; the eaten dish leaves the table');
  check(R.user.meals[0].ate === null && R.user.table.id === 'ck_1', 'remote is not changed');
  check(m.state.user.shells === 3, 'other user fields ride along');
  var R2 = S({ meals: [e1ate] }), L2 = S({ meals: [e1] });
  var m2 = M.merge(L2, R2, [], 120);
  check(m2.state.user.meals[0].ate && !m2.changed, 'their ate beats my plain ask (no save needed)');
  var only = { id: 'ml_2', dish: 'ck_2', recipe: 'jeon', date: D0, at: 5, ask: { at: 5, action: 'watch', by: 'demo-rules' }, ate: null };
  var m3 = M.merge(S({ meals: [only] }), S({ meals: [e1] }), [], 120);
  check(m3.state.user.meals.length === 2 && m3.state.user.meals[0].id === 'ml_2' && m3.changed, 'union by id, sorted by at');
  var Lt = S({ table: Object.assign(dish('ck_9'), { at: 500 }) }), Rt = S({ table: Object.assign(dish('ck_8'), { at: 400 }) });
  var m4 = M.merge(Lt, Rt, [{ table: Lt.user.table, at: 500 }], 520);
  check(m4.state.user.table.id === 'ck_9' && m4.changed, "this tab's newer table survives");
  var m5 = M.merge(Lt, Rt, [{ table: Lt.user.table, at: 500 }], 500 + 60001);
  check(m5.state.user.table.id === 'ck_8' && m5.mine.length === 0, 'mine older than MINE_MS is dropped (theirs stands)');
  var Rn = S({ table: Object.assign(dish('ck_7'), { at: 900 }) });
  check(M.merge(Lt, Rn, [{ table: Lt.user.table, at: 500 }], 520).state.user.table.id === 'ck_7', 'their newer table wins');
  var Re = S({ meals: [{ id: 'ml_9', dish: 'ck_9', recipe: 'jeon', ate: { at: 1, date: D0, me: true, oct: null, fx: 'sparkle' } }] });
  check(M.merge(Lt, Re, [{ table: Lt.user.table, at: 500 }], 520).state.user.table === null, 'my table whose dish was eaten in the other tab → null');
  var Ro = S({ born: 2 });
  var m6 = M.merge(L, Ro, [{ entry: e1ate, at: 100 }], 120);
  check(m6.mine.length === 0 && m6.state.user.meals.length === 0 && !m6.changed, 'another octopus (born differs): mine dropped, nothing of mine carried over');
  var Rnu = { octopus: { born: 1 } };
  var m7 = M.merge(L, Rnu, [], 1);
  check(m7.state.user.meals.length === 1 && m7.changed, 'a remote without user still gets my meals (same octopus)');
});

section('10 slim', function () {
  var old = { id: 'ml_o', dish: 'ck_o', date: '2025-01-01', ask: { at: 1, action: 'eat', by: 'model', seed: 9, raw: 'r', line: '말 그대로' }, ate: null };
  var mid = { id: 'ml_m', dish: 'ck_m', date: '2026-11-01', ask: { at: 1, action: 'eat', by: 'demo-rules', rule: 'seed', seed: 9 }, ate: null };
  var out = M.slim([old, mid], D0);
  check(out && out[0] !== old && !('seed' in out[0].ask) && !('raw' in out[0].ask) && out[0].ask.line === '말 그대로', 'older than 365 days: seed and raw dropped, line kept');
  check(out[1] === mid && old.ask.seed === 9, 'newer entries and the original untouched');
  check(M.slim([mid], D0) === null, 'nothing to slim → null');
});

section('12 round 7: the five dishes of the recipe book', function () {
  var NEW = { jeon2: ['해초전', 'sparkle', '반짝이'], gyeran: ['계란말이', 'bubble', '방울'], jumeokbap2: ['주먹밥', 'star', '별'], kkochi2: ['과일 꼬치', 'petal', '꽃잎'], cake: ['딸기 케이크', 'confetti', '색종이'] };
  var CLAIM = /좋|싫|맛있|싶|배불|즐거|재밌|행복|기뻐|기쁘|반가|궁금|설레|원해|바라|고마|미안|슬프|아쉬|맛|기분/;
  Object.keys(NEW).forEach(function (r, i) {
    var w = NEW[r], id = 'ck_n' + i;
    var msg = { ppolCook: 'result', v: 1, id: id, recipe: r, seed: 5, look: { band: 2, steps: [{ k: 'stir', n: 3 }] }, day: D0 };
    var n = M.normDish(msg);
    check(n && n.recipe === r && n.look.band === 2, r + ': result message accepted');
    var St = stateWith({ table: Object.assign({ at: 10 }, n) });
    check(M.aria('table', { recipe: r }) === '식탁, ' + w[0] && M.aria('table', { recipe: r, seated: true }) === w[0] + ' 먹기', r + ': table button names');
    var first = M.demoAnswer({ dish: id, name: '뚜루', born: 111, asksBefore: 0 }), later = M.demoAnswer({ dish: id, name: '뚜루', born: 111, asksBefore: 3 });
    var same = M.demoAnswer({ dish: id, name: '뚜루', born: 111, asksBefore: 3, recipe: 'jeon', fx: 'sparkle' });
    check(first.action === 'eat' && first.rule === 'first' && JSON.stringify(later) === JSON.stringify(same), r + ': the demo answer does not look at the dish');
    var ask = M.makeAsk(St, { at: 20, today: D0, dish: St.user.table });
    var e = M.eat(St, { at: 30, today: D0, oct: ask.ask.action === 'eat', dish: id });
    check(e && e.ate && e.ate.fx === w[1] && St.user.table === null, r + ': eating records fx ' + w[1] + ' and clears the table');
    var act = M.active(St, D0);
    check(act.me === w[1] && act.oct === w[1] && M.active(St, D1).me === null, r + ': day effect today, none tomorrow');
    var rows = M.rows(e, '뚜루', D0), past = M.rows(e, '뚜루', D1);
    var meal = rows[rows.length - 1].text;
    check(meal === M.josa(w[0], '을') + ' 같이 먹었어. 오늘 하루 둘 다 ' + M.josa(w[2], '이') + ' 따라다녀.', r + ': meal row "' + meal + '"');
    check(past[past.length - 1].text === M.josa(w[0], '을') + ' 같이 먹었어. 그날 하루 둘 다 ' + M.josa(w[2], '이') + ' 따라다녔어.', r + ': past meal row');
    check(rows.every(function (x) { return !CLAIM.test(x.text); }), r + ': no feeling or taste words in the rows');
    var alone = stateWith({ table: Object.assign({ at: 10 }, M.normDish(msg)) }), ea = M.eat(alone, { at: 30, today: D0, oct: null, dish: id });
    check(M.rows(ea, '뚜루', D0).length === 1 && M.rows(ea, '뚜루', D0)[0].text === M.josa(w[0], '을') + ' 먹었어. 오늘 하루 ' + M.josa(w[2], '이') + ' 따라다녀.', r + ': eaten alone → one row');
    check(M.sceneDesc(stateWith({ table: Object.assign({ at: 10 }, M.normDish(msg)) }), D0, '뚜루', false).indexOf('식탁에 ' + M.josa(w[0], '이') + ' 있어.') >= 0, r + ': scene description names the dish');
  });
  check(M.josa('방울', '이') === '방울이' && M.josa('색종이', '이') === '색종이가' && M.josa('계란말이', '을') === '계란말이를' && M.josa('딸기 케이크', '을') === '딸기 케이크를', 'particles of the new words');
  ['jeon', 'jumeokbap', 'kkochi'].forEach(function (r) { check(M.DISHES[r] && M.aria('table', { recipe: r }).indexOf('식탁, ') === 0, 'legacy ' + r + ' still known'); });
});

section('13 round 7: dish pictures and bite masks', function () {
  check(JSON.stringify(M.pic('jeon2', { band: 2 })) === '{"id":"jeon","frame":2}' && M.pic('jeon2', {}).frame === 0 && M.pic('jeon2', { band: 9 }).frame === 2 && M.pic('jeon2', { band: -3 }).frame === 0 && M.pic('jeon2', null).frame === 0 && M.pic('jeon2', { v: 2, s: [{}], plate: 1, band: 1 }).frame === 1, 'jeon2 → dish.jeon, frame = top-level band 0..2 (missing → 0)');
  check(M.pic('gyeran', { band: 2 }).id === 'gyeran' && M.pic('gyeran', { band: 2 }).frame === 0 && M.pic('jumeokbap2').id === 'jumeokbap' && M.pic('kkochi2').id === 'kkochi' && M.pic('cake').id === 'cake', 'the other four: frame 0');
  check(M.pic('jeon') === null && M.pic('jumeokbap') === null && M.pic('kkochi') === null && M.pic('nope') === null && M.pic(undefined) === null && M.pic('constructor') === null, 'legacy and unknown dishes have no picture');
  /* 20 x 12 picture: food rows 2..6 (x 4..15), plate rows 7..9 (x 1..18) */
  var w = 20, h = 12, d = new Uint8ClampedArray(w * h * 4);
  function px(x, y) { var k = (y * w + x) * 4; d[k] = 200; d[k + 1] = 100; d[k + 2] = 50; d[k + 3] = 255; }
  for (var y = 2; y <= 6; y++) for (var x = 4; x <= 15; x++) px(x, y);
  for (y = 7; y <= 9; y++) for (x = 1; x <= 18; x++) px(x, y);
  var spr = { w: w, h: h, d: d }, before = Array.prototype.slice.call(d);
  function alpha(m, x, y) { return m[(y * w + x) * 4 + 3]; }
  function count(m) { var n = 0; for (var i = 3; i < m.length; i += 4) if (m[i] >= 128) n++; return n; }
  check(M.biteLine(spr) === 7, 'the container line is the first wide row (7)');
  var full = count(d), m0 = M.biteMask(spr, [], 7, 0), m1 = M.biteMask(spr, [3], 7, 0), m2 = M.biteMask(spr, [3, 0], 7, 0), m4 = M.biteMask(spr, [3, 0, 2, 1], 7, 0);
  check(m0 !== d && count(m0) === full, 'no bites: a copy, nothing removed');
  check(count(m1) < full && alpha(m1, 15, 3) === 0 && alpha(m1, 4, 3) === 255 && alpha(m1, 17, 8) === 255, 'bite of quarter 3: the right food goes, the left food and the plate stay');
  check(count(m2) < count(m1) && alpha(m2, 4, 3) === 0 && alpha(m2, 9, 3) === 255, 'second bite from the left');
  check(count(m4) === 18 * 3, 'four bites: only the container rows are left');
  check(Array.prototype.slice.call(d).join() === before.join(), 'the picture itself is never changed');
  var t1 = M.biteMask(spr, [3], 7, 2), t4 = M.biteMask(spr, [0, 1, 2, 3], 7, 2);
  check(count(t1) < full && count(t1) !== count(m1), 'toothed edge (amp 2) differs from the straight cut');
  check(count(t4) >= 18 * 3 && count(t4) < full - 30, 'toothed: the food is gone but for a few crumbs, the plate stays');
  /* 둥근 접시 (타원) 위에 음식이 겹쳐 그려진 그림: 다 먹으면 음식 색은 없고, 접시는 뒤쪽 반까지 남는다 */
  var W2 = 40, H2 = 30, d2 = new Uint8ClampedArray(W2 * H2 * 4);
  function p2(x, y, c) { var k = (y * W2 + x) * 4; d2[k] = c[0]; d2[k + 1] = c[1]; d2[k + 2] = c[2]; d2[k + 3] = 255; }
  for (var yy = 0; yy < H2; yy++) for (var xx = 0; xx < W2; xx++) { var ex = (xx - 19.5) / 19, ey = (yy - 20) / 8; if (ex * ex + ey * ey <= 1) p2(xx, yy, ex * ex + ey * ey > 0.8 ? [60, 60, 90] : [230, 230, 240]); }
  for (yy = 4; yy <= 22; yy++) for (xx = 10; xx <= 29; xx++) p2(xx, yy, [240, 150, 40]);
  var sp2 = { w: W2, h: H2, d: d2 }, L2 = M.biteLine(sp2), e4 = M.biteMask(sp2, [0, 1, 2, 3], L2, 2), e1 = M.biteMask(sp2, [3], L2, 2);
  function has2(m, c) { for (var i = 0; i < m.length; i += 4) if (m[i + 3] >= 128 && m[i] === c[0] && m[i + 1] === c[1] && m[i + 2] === c[2]) return true; return false; }
  function a2(m, x, y) { return m[(y * W2 + x) * 4 + 3]; }
  check(L2 >= 16 && L2 <= 20, 'round plate: the container line is in the wide middle of the ellipse (' + L2 + ')');
  check(!has2(e4, [240, 150, 40]) && has2(e4, [230, 230, 240]) && has2(e4, [60, 60, 90]), 'round plate, four bites: no food colour left, plate surface and rim remain');
  check(a2(e4, 20, 14) >= 128 && a2(e4, 20, 26) >= 128 && a2(e4, 20, 6) === 0, 'round plate: its back half is kept (mirrored), above the plate is empty');
  check(has2(e1, [240, 150, 40]) && a2(e1, 12, 8) === 255 && a2(e1, 28, 8) === 0, 'round plate, one bite: only the right part of the food is gone');
  /* 11-22: biteFood — 음식 색만 줄이고 그릇 (keep) 은 그대로, 그릇이 가리던 자리는 그 줄의 그릇 색 */
  var W3 = 20, H3 = 10, d3 = new Uint8ClampedArray(W3 * H3 * 4);
  function p3(x, y, hx) { var k = (y * W3 + x) * 4; d3[k] = parseInt(hx.slice(0, 2), 16); d3[k + 1] = parseInt(hx.slice(2, 4), 16); d3[k + 2] = parseInt(hx.slice(4, 6), 16); d3[k + 3] = 255; }
  for (var y3 = 5; y3 < 9; y3++) for (var x3 = 0; x3 < W3; x3++) p3(x3, y3, 'ebede9');   /* cake plate */
  for (y3 = 1; y3 < 7; y3++) for (x3 = 6; x3 < 14; x3++) p3(x3, y3, 'ffd95c');   /* sponge over the plate */
  var sp3 = { w: W3, h: H3, d: d3 }, f4 = M.biteFood(sp3, [0, 1, 2, 3], 'cake', 0), f1 = M.biteFood(sp3, [3], 'cake', 0);
  function c3(m, x, y) { var k = (y * W3 + x) * 4; return m[k + 3] < 128 ? null : ((1 << 24) + (m[k] << 16) + (m[k + 1] << 8) + m[k + 2]).toString(16).slice(1); }
  check(c3(f4, 10, 2) === null && c3(f4, 10, 6) === 'ebede9' && c3(f4, 0, 7) === 'ebede9' && c3(f4, 19, 5) === 'ebede9', 'biteFood: all eaten → no sponge above the plate, the plate under it is plate colour, the plate edge stays');
  check(c3(f1, 13, 2) === null && c3(f1, 6, 2) === 'ffd95c', 'biteFood: one bite takes the right quarter of the food only');
  check(M.biteFood(sp3, [], 'cake', 0)[(2 * W3 + 10) * 4 + 3] === 255 && M.biteFood(null, [0], 'cake') === null, 'biteFood: no bites → unchanged · broken picture → null');
  check(Object.keys(M.BITE_COL).join() === 'jeon,gyeran,jumeokbap,kkochi,cake', 'a colour table for each of the five pictures');
  var emp3 = { w: W3, h: H3, d: new Uint8ClampedArray(W3 * H3 * 4) }; for (var e3 = 0; e3 < W3 * H3; e3++) { emp3.d[e3 * 4] = 1; emp3.d[e3 * 4 + 1] = 2; emp3.d[e3 * 4 + 2] = 3; emp3.d[e3 * 4 + 3] = 255; }
  var fe = M.biteFood(sp3, [0, 1, 2, 3], 'cake', 0, emp3);
  check(c3(fe, 10, 2) === '010203' && c3(fe, 0, 7) === 'ebede9', 'biteFood with an empty-plate picture: eaten pixels show that picture, the rest stays');
  check(M.biteMask(null, [0]) === null && M.biteMask({ w: 2, h: 2, d: [] }, [0]) === null && M.biteLine(null) === 0, 'broken pictures → null / 0');
  check(JSON.stringify(Array.prototype.slice.call(M.biteMask(spr, [3], 7, 2))) === JSON.stringify(Array.prototype.slice.call(M.biteMask(spr, [3], 7, 2))), 'deterministic');
});

section('11 R11: no model-path code', function () {
  check(typeof M.request === 'undefined' && typeof M.readReply === 'undefined' && !/function\s+(request|readReply)\b/.test(SRC), 'no request / readReply in js/meal.js');
});

Math.random = REAL.random; Date.now = REAL.now;
console.log('\n' + passes + ' passed, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
