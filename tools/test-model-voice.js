#!/usr/bin/env node
/* tools/test-model-voice.js — docs/MODEL_VOICE.md "자동 점검" 중 지금 코드로 잴 수 있는 것 (node, 의존성 없음). 실패하면 exit 1.
 *
 *   node tools/test-model-voice.js
 *
 * 두뇌(js/brain.js) + 진짜 세계(js/world.js) 로 돈다. 화면(app.js)이 글자를 그대로 그리는지는 tools/smoke.js 몫이고,
 * 여기서는 두뇌가 넘기는 기록이 모델의 말·선택을 덧붙이거나 빼거나 바꾸지 않는지를 본다.
 *
 *   1. 모델이 쓴 말이 기록에 글자 그대로 남는다. 줄여 보여야 하면 '…' 와 원문 보존 (MODEL_VOICE §3)
 *   2. fallback·playback(데모 규칙 재생)이 '모델 선택'으로 기록되지 않는다 (§2 · §5)
 *   3. 코드가 만든 문구(템플릿)에 취향·감정 말이 횟수에서 파생되어 들어가지 않는다 (§4 · CURIOSITY_NOTES 원칙 1)
 *   4. set_down 메모는 다음 요청(두뇌 입력)에 들어가지 않고, 결과에도 나오지 않는다 (§4 · CURIOSITY_NOTES 원칙 4)
 *   5. 그만두기 행동: 프로토콜에 빈 차례·집에 있기가 있고, 빈 차례를 골라도 아무것도 지어내지 않는다 (§1)
 *   (블라인드 선택 순서는 아직 그 기능이 없어서 재지 않는다 — 컵 놀이를 모델에 이을 때 넣는다)
 */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.resolve(__dirname, '..');
var passes = 0, failures = 0;
function check(cond, msg) { if (cond) { passes++; return; } failures++; console.error('  FAIL ' + msg); }
function section(name) { console.log('\n== ' + name); }
function load(file) { vm.runInThisContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), { filename: file }); }
global.window = global;
load('js/world.js');
load('js/brain.js');
var W = global.WORLD, B = global.BRAIN;
var realRandom = Math.random;
Math.random = function () { throw new Error('BRAIN 이 Math.random 을 썼어'); };
var NOW = new Date(2026, 10, 7, 14, 0, 0);

/* 시드 난수 (테스트 입력 만들기용 — 두뇌의 것을 빌린다) */
var T = B.rng(20261107);
function pick(list) { return list[Math.floor(T() * list.length)]; }
var ROOMS = Object.keys(W.nodes).filter(function (id) { return ['door_out', 'slow_room', 'letter_room'].indexOf(id) < 0 && W.nodes[id].corner !== 'wild'; });
/* 모델이 쓸 법한 말: 짧은 말, 60자 넘는 말, 이미 '…' 가 들어간 말, 띄어쓰기·줄바꿈·이모지가 섞인 말 */
var SAYINGS = [
  '여기 오래 있었어',
  '모자 안쪽 띠가 땀을 막는 거래. 그럼 모자는 머리를 지키는 걸까, 아니면 머리 위의 날씨를 지키는 걸까. 다음엔 그쪽',
  '음… 잘 모르겠어…',
  '  앞뒤에 빈칸  ',
  '첫 줄\n둘째 줄',
  '🐙 뽈뽈',
  'ㅋㅋ 이건 좀 웃겼어',
  '이 말은 정확히 육십 자가 되도록 만들어 본 문장인데 끝까지 다 보여야 하는 문장이야 정말로 그래'
];

/* ───────── 1. 모델의 말은 글자 그대로 ───────── */
section('1. model words are kept verbatim (… + original when shortened)');
var errs = [], n1 = 0;
for (var i = 0; i < 300; i++) {
  var a = pick(ROOMS), b = pick(ROOMS);
  var said = { rem: pick(SAYINGS), line: pick(SAYINGS), raw: pick(SAYINGS), note: pick(SAYINGS), tomorrow: pick(SAYINGS), roomNote: pick(SAYINGS), aside: pick(SAYINGS), bridge: pick(SAYINGS) };
  var evs = [
    { type: 'depart', t: 0, hint: '' },
    { type: 'peek', t: 1, target: { kind: 'room', id: a }, status: 'builtin', aside: said.aside },
    { type: 'peek', t: 2, target: { kind: 'room', id: b }, status: 'simulated', bridge: said.bridge, viaTangent: true },
    { type: 'return', t: 3, reason: 'enough' },
    { type: 'remember', t: 4, stopIdx: i % 2, line: said.rem, sticker: 'x' },
    { type: 'hang_poster', t: 5 },
    { type: 'wrap_up', t: 6, reaction: i % 3 ? said.raw : pick(B.REACTIONS), line: said.line, note: { text: said.note, about: { kind: 'node', id: a } }, memo: { tomorrow: said.tomorrow, notes: {} } }
  ];
  evs[6].memo.notes[a] = said.roomNote;
  var input = JSON.stringify(evs);
  var by = i % 4 === 0 ? 'human' : 'mcp';
  var t = B.replay(JSON.parse(input), { by: by, now: NOW, state: { visits: {} } });
  n1++;
  var tag = 'case ' + i + ' (' + by + ')';
  if (t.poster.line !== said.rem) errs.push(tag + ' poster line changed: ' + JSON.stringify(t.poster.line));
  if (t.receipt.reactionLine !== said.line || t.reactionLine !== said.line) errs.push(tag + ' reaction line changed');
  var givenR = evs[6].reaction;
  if (B.REACTIONS.indexOf(givenR.trim()) >= 0) { if (t.reaction !== givenR.trim() || t.reactionRaw !== null) errs.push(tag + ' known reaction changed'); }
  else if (t.reaction !== null || t.reactionRaw !== givenR) errs.push(tag + ' raw reaction changed: ' + JSON.stringify(t.reactionRaw));
  if (!t.noteOut || t.noteOut.text !== said.note) errs.push(tag + ' note changed: ' + JSON.stringify(t.noteOut));
  /* 메모: 60자까지는 (띄어쓰기 정리만 하면) 그대로, 넘으면 59자 + '…'. 조금이라도 바꿨으면 원문이 memo.original 에 */
  [['tomorrow', t.memo.tomorrow, said.tomorrow, t.memo.original && t.memo.original.tomorrow], ['notes.' + a, t.memo.notes[a], said.roomNote, t.memo.original && t.memo.original.notes && t.memo.original.notes[a]]].forEach(function (m) {
    var shown = m[1], orig = m[2], kept = m[3];
    if (shown === orig) { if (kept !== undefined) errs.push(tag + ' memo ' + m[0] + ' unchanged but original recorded'); return; }
    if (kept !== orig) errs.push(tag + ' memo ' + m[0] + ' changed without keeping the original');
    if (orig.replace(/\s+/g, ' ').trim().length > 60 && !/…$/.test(shown)) errs.push(tag + ' memo ' + m[0] + ' cut without …');
    if (shown.length > 60) errs.push(tag + ' memo ' + m[0] + ' shown over 60');
  });
  /* 돌려주는 이벤트도 모델이 쓴 글을 건드리지 않는다 (정직 표기로 바뀌는 읽기 상태 말고) */
  var outEv = t.events;
  if (outEv[4].line !== said.rem || outEv[6].line !== said.line || outEv[6].reaction !== givenR || outEv[1].aside !== said.aside || outEv[2].bridge !== said.bridge) errs.push(tag + ' returned events rewrote model text');
  if (JSON.stringify(t.receipt.stops[1].bridge) !== JSON.stringify(said.bridge)) errs.push(tag + ' bridge changed');
}
check(n1 === 300 && errs.length === 0, 'poster line · reaction line · raw reaction · note · memo · aside · bridge kept verbatim over ' + n1 + ' replays (' + errs.length + ' errors)' + (errs.length ? ' e.g. ' + errs.slice(0, 3).join(' | ') : ''));
/* 집에 있는 날: 모델이 쓴 쪽지 앞뒷면 그대로 */
errs = [];
(W.homeActivities || []).forEach(function (act) {
  var line = pick(SAYINGS), detail = pick(SAYINGS);
  var h = B.replay([{ type: 'stay_home', t: 0, activity: act.id, line: line, detail: detail }, { type: 'wrap_up', t: 1 }], { by: 'mcp', state: { lantern: 3, posters: 3 } });
  if (h.poster.line !== line || h.poster.detail !== detail || h.receipt.activity.line !== line || h.receipt.activity.detail !== detail) errs.push(act.id);
});
check(errs.length === 0, 'home day: the model\'s own note line/detail kept verbatim for every activity (' + errs.join(',') + ')');
/* 보여 줄 때 줄이는 꼴: 앞 N자 + '…', 원문은 그대로 */
var long = SAYINGS[1];
check(long.length > 60 && typeof B.clipShown === 'function' && B.clipShown(long, 60) === long.slice(0, 60) + '…' && B.clipShown('짧아', 60) === '짧아', 'clipShown: first 60 + … only when longer (the record keeps the full text)');

/* ───────── 2. fallback · playback 은 모델 선택이 아니다 ───────── */
section('2. fallback / playback / demo rules are never recorded as the model\'s choice');
function byValues(o, out, k) {
  out = out || [];
  if (Array.isArray(o)) o.forEach(function (x) { byValues(x, out, k); });
  else if (o && typeof o === 'object') Object.keys(o).forEach(function (key) { if (/^(by|reactionBy|rememberedBy)$/.test(key)) out.push(key + '=' + o[key]); byValues(o[key], out, key); });
  return out;
}
(async function main() {
  try {
    errs = [];
    var quick = function (t) { return Promise.resolve(/^(모자|조개|비)/.test(t) ? { ok: true, title: t, extract: t + '는 무엇이다.', url: 'https://ko.wikipedia.org/wiki/' + encodeURIComponent(t), thumb: null, links: [] } : { ok: false, reason: 'missing' }); };
    var plans = [];
    for (var seed = 1; seed <= 200; seed++) {
      var p = await B.plan({ seed: seed, now: NOW, dateKey: '2026-11-07', online: seed % 2 === 0, fetchWiki: quick, state: { visits: {}, lantern: seed % 9, posters: seed % 3 } });
      plans.push(p);
      var bys = byValues(p);
      if (bys.some(function (x) { return /=model$|=human$/.test(x); })) errs.push('plan seed ' + seed + ': ' + bys.join(','));
      if (p.kind !== 'empty' && p.reactionBy !== 'demo-rules') errs.push('plan seed ' + seed + ' reactionBy ' + p.reactionBy);
      if (p.noteOut && p.noteOut.by !== 'demo-rules') errs.push('plan seed ' + seed + ' noteOut.by ' + p.noteOut.by);
      /* 데모 규칙 재생(playback): 같은 이벤트를 다시 돌려도 모델·사람 표시가 생기지 않는다 */
      if (p.kind !== 'empty') {
        var pb = B.replay(JSON.parse(JSON.stringify(p.events)), { by: 'demo', now: NOW, seed: seed });
        if (byValues(pb).some(function (x) { return /=model$|=human$/.test(x); })) errs.push('playback seed ' + seed);
      }
    }
    check(errs.length === 0, 'demo plans and demo-rules playback carry no model/human label anywhere (200 seeds, ' + errs.length + ' errors)' + (errs.length ? ' e.g. ' + errs[0] : ''));

    errs = [];
    var a0 = ROOMS[0], a1 = ROOMS[1];
    var base = [{ type: 'depart', t: 0, hint: '' }, { type: 'peek', t: 1, target: { kind: 'room', id: a0 } }, { type: 'peek', t: 2, target: { kind: 'room', id: a1 } }, { type: 'return', t: 3 }];
    [undefined, 99, -3, 1.5].forEach(function (idx) {
      var evs = base.concat(idx === undefined ? [] : [{ type: 'remember', t: 4, stopIdx: idx, line: '그거' }]).concat([{ type: 'wrap_up', t: 5 }]);
      var t = B.replay(evs, { by: 'mcp', now: NOW });
      if (t.receipt.rememberedBy !== 'fallback') errs.push('stopIdx ' + idx + ' rememberedBy ' + t.receipt.rememberedBy);
      if (t.reactionBy !== null || t.reaction !== null) errs.push('stopIdx ' + idx + ' invented a reaction ' + t.reaction);
      if (t.noteOut !== null) errs.push('stopIdx ' + idx + ' invented a note');
    });
    var ok = B.replay(base.concat([{ type: 'remember', t: 4, stopIdx: 0 }, { type: 'wrap_up', t: 5, reaction: '덤덤' }]), { by: 'mcp', now: NOW });
    if (ok.receipt.rememberedBy !== 'model' || ok.reactionBy !== 'model') errs.push('real choice not labelled model');
    var hum = B.replay(base.concat([{ type: 'remember', t: 4, stopIdx: 0 }, { type: 'wrap_up', t: 5, reaction: '덤덤', note: '사람' }]), { by: 'human', now: NOW });
    if (byValues(hum).some(function (x) { return /=model$/.test(x); })) errs.push('human replay labelled model');
    var cant = B.replay([{ type: 'stay_home', t: 0, activity: 'rearrange', line: '자리 바꿨어' }, { type: 'wrap_up', t: 1, reaction: '덤덤' }], { by: 'mcp', state: { lantern: 3, posters: 0 } });
    if (cant.receipt.activity.by !== 'fallback' || cant.receipt.activity.asked !== 'rearrange') errs.push('activity the room cannot do not labelled fallback');
    var can = B.replay([{ type: 'stay_home', t: 0, activity: 'nap' }, { type: 'wrap_up', t: 1 }], { by: 'mcp' });
    if (can.receipt.activity.by !== 'model' || can.reactionBy !== null) errs.push('chosen activity not labelled model / reaction invented');
    check(errs.length === 0, 'what the brain filled in is labelled fallback; only what the model gave is labelled model (' + errs.length + ' errors)' + (errs.length ? ' e.g. ' + errs.join(' | ') : ''));
    /* 데모 규칙의 마음 말(활동 뒷면 '빗소리가 좋아서 …', 힌트 '다른 데가 궁금했어', 반응 줄)이 모델 기록에 붙지 않는다 */
    errs = [];
    (W.homeActivities || []).forEach(function (act) {
      var h = B.replay([{ type: 'stay_home', t: 0, activity: act.id }, { type: 'wrap_up', t: 1, reaction: '졸림' }], { by: 'mcp', state: { lantern: 3, posters: 3 } });
      if (h.poster.detail || h.receipt.activity.detail || h.receipt.reactionLine) errs.push(act.id + ': ' + (h.poster.detail || h.receipt.reactionLine));
    });
    check(errs.length === 0, 'model home days never get the demo activity\'s back-of-note text or a template reaction line (' + errs.length + ' errors)' + (errs.length ? ' e.g. ' + errs[0] : ''));

    /* ───────── 3. 템플릿에 횟수에서 나온 취향·감정 말이 없다 ───────── */
    section('3. code templates carry no preference/feeling words derived from counts');
    var PREF = /좋아|좋았|사랑|싫어|싫었|미워|최애|취향|즐겨|반했|단골|그리워|설레/;
    var templates = [];
    function addAll(x) { if (typeof x === 'string') templates.push(x); else if (Array.isArray(x)) x.forEach(addAll); else if (x && typeof x === 'object') Object.keys(x).forEach(function (k) { addAll(x[k]); }); }
    addAll(W.lineTemplates);
    var M = W.memoTemplates || {}; addAll(M.lead); addAll(M.next); addAll(M.nextNone); addAll(M.home); addAll([M.revisit, M.revisitToday, M.revisitUndated]);
    Object.keys(W.reactions || {}).forEach(function (r) { var x = W.reactions[r]; addAll(x.lines); addAll(x.home); addAll(x.when); });
    /* 두뇌 안의 기본 문구 (세계가 안 줄 때): js/brain.js 의 글자열 (주석 빼고) */
    var src = fs.readFileSync(path.join(ROOT, 'js/brain.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    var lits = src.match(/'(?:[^'\\\n]|\\.)*'/g) || [];
    lits.forEach(function (l) { if (/[가-힣]/.test(l)) templates.push(l.slice(1, -1)); });
    var bad = templates.filter(function (x) { return PREF.test(x); });
    check(templates.length > 50 && bad.length === 0, 'no template / reaction line / memo template / brain literal has a preference word (' + templates.length + ' strings; ' + bad.join(' | ') + ')');
    /* 만든 글에서 세계 기록(방 기억 조각·실마리·읽은 요약·활동 문구)을 빼면, 남은 코드 말에 취향 말이 없다 — 방문·취향 점수가 아주 커도 */
    var records = [];
    Object.keys(W.nodes).forEach(function (id) { var nd = W.nodes[id]; (nd.memories || []).forEach(function (m) { records.push(String(m)); }); if (nd.clue) records.push(String(nd.clue)); });
    (W.homeActivities || []).forEach(function (act) { ['line', 'detail', 'memo'].forEach(function (k) { if (act[k]) records.push(String(act[k])); }); });
    records.sort(function (x, y) { return y.length - x.length; });
    function codePart(text) {
      var s = String(text || '');
      records.forEach(function (r) { if (r && s.indexOf(r) >= 0) s = s.split(r).join(' '); });
      /* 60자에 맞춰 줄인 기록 조각 ('…' 로 끝남)도 기록에서 온 것 */
      s = s.replace(/[^.]*…$/, function (frag) { var bare = frag.replace(/…$/, '').trim(); return records.some(function (r) { return bare && r.replace(/\s+/g, ' ').indexOf(bare) >= 0; }) ? '' : frag; });
      return s;
    }
    var heavy = {}; Object.keys(W.nodes).forEach(function (id, k) { heavy[id] = k % 2 ? 50 : 0; });
    var affHeavy = {}; Object.keys(W.corners || {}).forEach(function (c) { affHeavy[c] = 99; });
    errs = []; var nTexts = 0;
    var states = [{ visits: {} }, { visits: heavy, affinity: affHeavy, lantern: 8, todayOut: 9, recent: [{ kind: 'out', nStops: 5 }, { kind: 'out', nStops: 5 }] }, { visits: heavy, lantern: 2, lastVisit: { hat: '2026-10-01' } }];
    for (seed = 1; seed <= 150; seed++) {
      for (var si = 0; si < states.length; si++) {
        var tp = await B.plan({ seed: seed, now: NOW, dateKey: '2026-11-07', online: true, fetchWiki: quick, hint: seed % 3 === 0 && W.nodes.hat ? '모자' : '', state: Object.assign({ posters: 3 }, states[si]) });
        var texts = [tp.poster && tp.poster.line, tp.receipt && tp.receipt.reactionLine, tp.hint && tp.hint.note, tp.memo && tp.memo.tomorrow, tp.noteOut && tp.noteOut.text]
          .concat(tp.memo ? Object.keys(tp.memo.notes).map(function (k) { return tp.memo.notes[k]; }) : [])
          .concat((tp.events || []).map(function (e) { return e.aside; }));
        texts.forEach(function (x) { if (!x) return; nTexts++; var c = codePart(x); if (PREF.test(c)) errs.push('seed ' + seed + '/' + si + ': ' + x); });
      }
    }
    check(nTexts > 1000 && errs.length === 0, 'generated lines minus world records have no preference word, even with visits 50 / affinity 99 (' + nTexts + ' texts, ' + errs.length + ' errors)' + (errs.length ? ' e.g. ' + errs.slice(0, 2).join(' | ') : ''));

    /* ───────── 4. set_down 메모는 넘기지 않는다 ───────── */
    section('4. set_down notes are never passed on');
    var SECRET = '내려놓은 메모 글 c0ffee';
    var mixed = [
      { id: 'cn_down1', text: SECRET, about: { kind: 'node', id: ROOMS[2] }, by: 'model', session: 'trip_a', at: '2026-11-01T00:00:00Z', status: 'set_down', setDownAt: '2026-11-02T00:00:00Z' },
      { id: 'cn_live', text: '살아 있는 메모', about: { kind: 'node', id: ROOMS[3] }, by: 'model', session: 'trip_b', at: '2026-11-03T00:00:00Z', status: 'active' },
      { id: 'cn_down2', text: SECRET + ' 둘', about: { kind: 'node', id: ROOMS[4] }, by: 'demo-rules', session: 'trip_c', at: '2026-11-04T00:00:00Z', status: 'set_down' }
    ];
    var nn = B.normalizeNotes(mixed);
    check(nn.length === 1 && nn[0].id === 'cn_live', 'normalizeNotes keeps only active notes (' + nn.map(function (x) { return x.id; }).join(',') + ')');
    errs = [];
    for (seed = 1; seed <= 200; seed++) {
      var inp = { seed: seed, now: NOW, dateKey: '2026-11-07', online: false, state: { visits: {}, lantern: 3 } };
      var only = await B.plan(Object.assign({}, inp, { state: Object.assign({}, inp.state, { notes: [mixed[1]] }) }));
      var withDown = await B.plan(Object.assign({}, inp, { state: Object.assign({}, inp.state, { notes: mixed }) }));
      var js = JSON.stringify(withDown);
      if (JSON.stringify(only) !== js) errs.push('seed ' + seed + ' set_down notes changed the walk');
      if (js.indexOf(SECRET) >= 0 || js.indexOf('cn_down') >= 0 || js.indexOf('살아 있는 메모') >= 0 || js.indexOf('cn_live') >= 0) errs.push('seed ' + seed + ' a note (text/id) leaked into the result');
      if (withDown.setDown.length) errs.push('seed ' + seed + ' demo rules set a note down');
    }
    check(errs.length === 0, 'set_down notes change nothing and never appear; no note text/id is quoted back; demo rules never set notes down (' + errs.length + ' errors)' + (errs.length ? ' e.g. ' + errs[0] : ''));
    var proto = fs.readFileSync(path.join(ROOT, 'docs/PROTOCOL.md'), 'utf8');
    check(/status: 'active'|status:'active'|`active`/.test(proto) && /최근 3개/.test(proto) && /set_down/.test(proto), 'PROTOCOL says the request carries only the latest 3 active notes (set_down left out)');

    /* ───────── 5. 그만두기 행동 ───────── */
    section('5. a "do nothing" choice exists and costs nothing');
    check(/ppolppol_empty_turn/.test(proto) && /ppolppol_stay_home/.test(proto), 'PROTOCOL offers empty_turn and stay_home tools');
    check(/`reaction`[^\n|]*선택|reaction\?/.test(proto), 'PROTOCOL: wrap_up reaction is optional');
    var et = B.replay([{ type: 'empty_turn', t: 0 }], { by: 'mcp' });
    check(et.kind === 'empty' && et.reaction === null && et.reactionBy === null && et.memo === null && et.noteOut === null && et.poster === null && et.receipt === null, 'model empty turn: no reaction, memo, note or poster invented');
  } catch (e) {
    failures++;
    console.error('UNCAUGHT', e && e.stack || e);
  }
  Math.random = realRandom;
  console.log('\n' + passes + ' passed, ' + failures + ' failed');
  process.exit(failures ? 1 : 0);
})();
