#!/usr/bin/env node
/* tools/test-model-voice.js — docs/MODEL_VOICE.md "자동 점검" 중 지금 코드로 잴 수 있는 것 (node, 의존성 없음). 실패하면 exit 1.
 *
 *   node tools/test-model-voice.js
 *
 * 두뇌(js/brain.js) + 진짜 세계(js/world.js) 로 돈다. 화면(app.js)이 글자를 그대로 그리는지는 tools/smoke.js 몫이고,
 * 여기서는 두뇌가 넘기는 기록이 모델의 말·선택을 덧붙이거나 빼거나 바꾸지 않는지를 본다.
 *
 *   1. 모델이 쓴 말이 기록에 글자 그대로 남는다. 줄여 보여야 하면 '…' 와 원문 보존 (MODEL_VOICE §3)
 *      — 포스터 한 줄 · 반응 · 반응 줄 · 호기심 메모 · 메모 · 쪽지 · 기웃 한마디(aside) · 건너간 말(bridge) · 기웃 메모(peek.note, 숨기면 noteGiven)
 *   2. fallback·playback(데모 규칙 재생)이 '모델 선택'으로 기록되지 않는다 (§2 · §5)
 *   3. 코드가 만든 문구(템플릿)에 취향·감정 말이 횟수에서 파생되어 들어가지 않는다 (§4 · CURIOSITY_NOTES 원칙 1)
 *   4. set_down 메모는 다음 요청(두뇌 입력)에 들어가지 않고, 결과에도 나오지 않는다 (§4 · CURIOSITY_NOTES 원칙 4)
 *   5. 그만두기 행동: 프로토콜에 빈 차례·집에 있기가 있고, 빈 차례를 골라도 아무것도 지어내지 않는다 (§1)
 *   6. 톡 한 줄 (주인 11-08): 모델·사람 차례는 그들이 마무리에 쓴 말만 글자 그대로 (없으면 null = '응?'), 데모 규칙 줄은 by 'demo' 에만, 템플릿에 기분·시간 말 없음
 *   7. 미용실 (주인 11-08 밤 · docs/SALON.md §9.2): 모델이 준 말(line)은 기록 · 행 2 에 글자 그대로 (말풍선만 24자 + '…'), 말이 없으면 문어 행 0개 · 데모 문구 없음 ·
 *      데모 결정은 by 'model' 로 적히지 않는다 · 개발용 답은 by 'human' 이고 데모 문구 · 얼굴 · 기쁨이 없다 · 받은 메뉴 밖 답은 재요청 0번 (빈 응답만 한 번 다시)
 *      (3번 템플릿 검사에도 SALON.LINES · 집 목소리 줄 · 모델 고정 문맥을 넣는다)
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
load('js/salon.js');   /* 미용실 규칙 (BRAIN 의 시드를 쓴다) */
var W = global.WORLD, B = global.BRAIN, SAL = global.SALON;
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
/* 기웃 메모(peek.note): 모델·사람이 쓴 건 그대로 (읽음이 확인된 정류장도 출처 요약으로 바꾸지 않는다).
   읽었다며 쓴 메모인데 읽음이 확인되지 않으면 화면에서 빼되 원문은 noteGiven 에 (정류장·이벤트 둘 다). 안 썼으면 코드가 문어 말투로 채우지 않는다 */
errs = [];
var NONE_ROOM = W.nodes.slow_room ? 'slow_room' : null;
var CLUE_ROOM = ROOMS.filter(function (id) { return W.nodes[id].clue && W.nodes[id].wiki; })[0];
var WIKI = 'https://ko.wikipedia.org/wiki/' + encodeURIComponent(W.nodes[CLUE_ROOM].wiki);
var clues = {}; Object.keys(W.nodes).forEach(function (id) { if (W.nodes[id].clue) clues[W.nodes[id].clue] = 1; });
var nPeek = 0;
for (i = 0; i < 120; i++) {
  var word = pick(SAYINGS), by2 = i % 3 === 0 ? 'human' : 'mcp', voice2 = by2 === 'mcp' ? 'model' : 'human';
  var targets = [
    { tg: { kind: 'room', id: CLUE_ROOM }, st: 'builtin' }, { tg: { kind: 'room', id: CLUE_ROOM }, st: 'failed' }, { tg: { kind: 'room', id: CLUE_ROOM }, st: 'simulated' },
    { tg: { kind: 'url', url: 'https://example.org/x' }, st: 'simulated' }, { tg: { kind: 'url', url: 'https://example.org/x' }, st: 'failed' },
    { tg: { kind: 'wiki', title: '깃펜' }, st: 'simulated' }, { tg: { kind: 'room', id: CLUE_ROOM }, st: 'read', src: { url: WIKI, extract: '출처 요약 글이다. 둘째.' } }
  ];
  if (NONE_ROOM) targets.push({ tg: { kind: 'room', id: NONE_ROOM }, st: 'none' });
  targets.forEach(function (x, k) {
    [true, false].forEach(function (withNote) {
      var ev = { type: 'peek', t: 1, target: x.tg, status: x.st };
      if (withNote) ev.note = word;
      if (x.src) ev.source = x.src;
      var tr = B.replay([{ type: 'depart', t: 0, hint: '' }, ev, { type: 'return', t: 2 }, { type: 'wrap_up', t: 3 }], { by: by2, now: NOW, state: { visits: {} } });
      var st = tr.receipt.stops[0], pe = tr.events.filter(function (e) { return e.type === 'peek'; })[0], tag = by2 + ' ' + x.st + ' ' + (x.tg.kind) + (withNote ? ' +note' : '');
      nPeek++;
      if (withNote) {
        if (st.note !== word || pe.note !== word || st.noteBy !== voice2) errs.push(tag + ': note changed ' + JSON.stringify(st.note));
      } else {
        var allowed = st.status === 'builtin' ? clues[st.note] : st.status === 'read' ? st.note === '출처 요약 글이다. 둘째.' : st.note === '';
        if (!allowed || st.noteBy) errs.push(tag + ': code filled the note ' + JSON.stringify(st.note));
      }
    });
  });
  /* 읽었다며 쓴 메모 — 읽음이 확인되지 않음: 밖의 문 · 출처 없는 방 · 출처 없는 들판 · 앉아만 있는 방 */
  [{ kind: 'url', url: 'https://example.org/x' }, { kind: 'room', id: CLUE_ROOM }, { kind: 'wiki', title: '깃펜' }].concat(NONE_ROOM ? [{ kind: 'room', id: NONE_ROOM }] : []).forEach(function (tg) {
    var tr = B.replay([{ type: 'depart', t: 0, hint: '' }, { type: 'peek', t: 1, target: tg, status: 'read', note: word }, { type: 'return', t: 2 }, { type: 'wrap_up', t: 3 }], { by: by2, now: NOW });
    var st = tr.receipt.stops[0], pe = tr.events.filter(function (e) { return e.type === 'peek'; })[0];
    nPeek++;
    if (st.status === 'read' || st.note === word || st.noteGiven !== word || pe.noteGiven !== word || pe.note !== st.note) errs.push(by2 + ' claimed read ' + tg.kind + ': ' + JSON.stringify([st.status, st.note, st.noteGiven, pe.noteGiven]));
  });
}
check(nPeek > 1000 && errs.length === 0, 'peek notes: the model\'s / person\'s note kept verbatim on every status (noteBy); an unverified "read" note is hidden but kept as noteGiven; no note → only facts (source summary · bookshelf clue) or nothing (' + nPeek + ' peeks, ' + errs.length + ' errors)' + (errs.length ? ' e.g. ' + errs.slice(0, 3).join(' | ') : ''));
/* 빈 차례 뒤의 마무리도 준 그대로 (반응·줄·호기심 메모) */
var etr = B.replay([{ type: 'empty_turn', t: 0 }, { type: 'wrap_up', t: 1, reaction: '졸림', line: '그냥 쉬었어', note: '쉬는 것도 궁금해' }], { by: 'mcp' });
check(etr.kind === 'empty' && etr.reaction === '졸림' && etr.reactionBy === 'model' && etr.reactionLine === '그냥 쉬었어' && etr.noteOut && etr.noteOut.text === '쉬는 것도 궁금해', 'empty turn + wrap_up: the model\'s reaction, line and note are all kept (' + etr.reaction + ' · ' + etr.reactionLine + ')');
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
    /* 활동은 선택 (ppolppol_stay_home { activity? }) — 안 골랐으면 '못 하는 활동(fallback)'이 아니다. 줄도 안 썼으면 쪽지 앞면은 빈칸 */
    [{ line: '그냥 있었어' }, {}].forEach(function (x) {
      var nh = B.replay([Object.assign({ type: 'stay_home', t: 0 }, x), { type: 'wrap_up', t: 1 }], { by: 'mcp' });
      if (nh.receipt.activity.by !== 'model' || nh.receipt.activity.asked !== undefined) errs.push('stay_home without an activity labelled ' + nh.receipt.activity.by);
      if (nh.poster.line !== (x.line || '')) errs.push('stay_home without a line got code text ' + JSON.stringify(nh.poster.line));
    });
    /* 기억할 곳을 두뇌가 대신 정했으면(fallback) 그 곳은 취향 가중치(+2)에 들어가지 않는다 — 들른 수만 */
    var fbm = B.replay(base.concat([{ type: 'wrap_up', t: 5 }]), { by: 'mcp', now: NOW });
    var perCorner = {}; fbm.receipt.stops.forEach(function (s) { perCorner[s.corner] = (perCorner[s.corner] || 0) + 1; });
    if (JSON.stringify(fbm.affinityDelta) !== JSON.stringify(perCorner)) errs.push('fallback memory fed affinity ' + JSON.stringify(fbm.affinityDelta) + ' vs visits ' + JSON.stringify(perCorner));
    var chm = B.replay(base.concat([{ type: 'remember', t: 4, stopIdx: 0 }, { type: 'wrap_up', t: 5 }]), { by: 'mcp', now: NOW });
    if ((chm.affinityDelta[chm.receipt.stops[0].corner] || 0) !== (perCorner[chm.receipt.stops[0].corner] || 0) + 2) errs.push('the model\'s own memory lost its +2');
    check(errs.length === 0, 'what the brain filled in is labelled fallback; only what the model gave is labelled model (' + errs.length + ' errors)' + (errs.length ? ' e.g. ' + errs.join(' | ') : ''));
    /* 데모 규칙의 줄(활동 뒷면 '빗소리를 들으며 …', 힌트 '다른 데로 갔어', 반응 줄 — 11-14 전엔 '빗소리가 좋아서 …' · '다른 데가 궁금했어')이 모델 기록에 붙지 않는다 */
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
    addAll(W.tapTemplates); (W.homeActivities || []).forEach(function (act) { addAll(act.tap); });   /* 톡 한 줄 (11-08) */
    /* 미용실 (11-08 밤): 데모 문구 (바꾸기 · 그대로) · 집 목소리 줄 (행 · 토스트 · 이름 줄 · 설정 · 장면 설명) · 꼬리 · 고른 이 풀이 · 모델 고정 문맥 */
    var nSalon = templates.length;
    addAll(SAL.LINES); addAll(SAL.TEXT); addAll(SAL.TAILS); addAll(SAL.BY_TEXT); addAll(SAL.CONTEXT);
    nSalon = templates.length - nSalon;
    /* 두뇌 안의 기본 문구 (세계가 안 줄 때): js/brain.js 의 글자열 (주석 빼고) */
    var src = fs.readFileSync(path.join(ROOT, 'js/brain.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    var lits = src.match(/'(?:[^'\\\n]|\\.)*'/g) || [];
    lits.forEach(function (l) { if (/[가-힣]/.test(l)) templates.push(l.slice(1, -1)); });
    var bad = templates.filter(function (x) { return PREF.test(x); });
    check(templates.length > 50 && bad.length === 0, 'no template / reaction line / memo template / brain literal has a preference word (' + templates.length + ' strings; ' + bad.join(' | ') + ')');
    check(nSalon >= 40, 'section 3 includes the salon strings: SALON.LINES · house lines · tails · by-texts · model context (' + nSalon + ' strings)');
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
    var byKept = B.normalizeNotes([{ id: 'a', text: 't', by: 'model' }, { id: 'b', text: 't', by: 'human' }, { id: 'c', text: 't', by: 'demo-rules' }]).map(function (x) { return x.by; }).join(',');
    check(byKept === 'model,human,demo-rules', 'normalizeNotes keeps who wrote each note (model · human · demo-rules), never relabels a model/person note as demo rules (' + byKept + ')');
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

    /* ───────── 6. 톡 한 줄은 그 차례를 고른 쪽의 말만 ───────── */
    section("6. tap line is the author's own words (model/human: their wrap-up only · demo rules only for by 'demo')");
    errs = []; var n6 = 0, given6 = 0, none6 = 0;
    for (i = 0; i < 300; i++) {
      var who = i % 3 === 0 ? 'human' : 'mcp', a6 = pick(ROOMS), b6 = pick(ROOMS);
      var wl = i % 4 === 0 ? null : pick(SAYINGS), wraw = i % 5 === 0 ? pick(SAYINGS) : null;
      var wrap6 = { type: 'wrap_up', t: 6, note: pick(SAYINGS), memo: { tomorrow: pick(SAYINGS) } };
      if (wl) wrap6.line = wl;
      wrap6.reaction = wraw || (i % 7 === 0 ? undefined : pick(B.REACTIONS));
      var ev6 = [{ type: 'depart', t: 0, hint: '' },
        { type: 'peek', t: 1, target: { kind: 'room', id: a6 }, status: 'builtin', aside: pick(SAYINGS), note: pick(SAYINGS) },
        { type: 'peek', t: 2, target: { kind: 'room', id: b6 }, status: 'read', note: pick(SAYINGS) },   /* 읽었다는데 출처 없음 → 화면에서 빼고 noteGiven */
        { type: 'return', t: 3, reason: 'enough' },
        { type: 'remember', t: 4, stopIdx: 0, line: pick(SAYINGS) },
        { type: 'hang_poster', t: 5 }, wrap6];
      if (i % 9 === 0) ev6 = [{ type: 'stay_home', t: 0, activity: 'nap', line: pick(SAYINGS), detail: pick(SAYINGS) }, wrap6];
      if (i % 11 === 0) ev6 = [{ type: 'empty_turn', t: 0 }, wrap6];
      var t6 = B.replay(JSON.parse(JSON.stringify(ev6)), { by: who, state: { lantern: 3, posters: 1 } }); t6.by = who; t6.status = 'done';
      var keep6 = JSON.stringify(t6), r6 = B.tapLine(t6); n6++;
      var want6 = wl ? wl : (wraw && B.REACTIONS.indexOf(wraw.trim()) < 0 ? wraw : null);
      if (JSON.stringify(t6) !== keep6) errs.push(i + ': tapLine changed the record');
      if (!want6) { none6++; if (r6) errs.push(i + ': said «' + r6.text + '» though the author wrote no wrap-up words (' + r6.src + ')'); continue; }
      given6++;
      if (!r6) { errs.push(i + ': lost the author\'s line'); continue; }
      if (r6.text !== want6) errs.push(i + ': not byte-identical «' + r6.text + '» vs «' + want6 + '»');
      if (r6.by !== (who === 'mcp' ? 'model' : 'human')) errs.push(i + ': by ' + r6.by);
      if (['wrap_up.line', 'wrap_up.reaction'].indexOf(r6.src) < 0) errs.push(i + ': src ' + r6.src);
    }
    check(errs.length === 0 && given6 > 100 && none6 > 30, 'model/human tap line = their own wrap-up line (or free reaction words) byte for byte, never an aside / stop note / noteGiven / poster line / template; nothing written → null (' + n6 + ' trips, ' + given6 + ' with words, ' + none6 + ' without; ' + errs.length + ' errors)' + (errs.length ? ' e.g. ' + errs.slice(0, 2).join(' | ') : ''));
    var demoReplay = B.replay([{ type: 'depart', t: 0 }, { type: 'peek', t: 1, target: { kind: 'room', id: ROOMS[0] }, status: 'builtin' }, { type: 'peek', t: 2, target: { kind: 'room', id: ROOMS[1] }, status: 'builtin' }, { type: 'return', t: 3, reason: 'enough' }, { type: 'wrap_up', t: 4 }], { by: 'demo', seed: 5 });
    demoReplay.status = 'done';
    var dr6 = B.tapLine(demoReplay), lg = Object.assign({}, demoReplay, { by: 'legacy' }), un = Object.assign({}, demoReplay, { by: 'someone' });
    check(dr6 && dr6.by === 'demo-rules' && B.tapLine(lg) === null && B.tapLine(un) === null, "a demo-rules tap line only for by 'demo' trips (legacy / unknown → null)");
    var TAP_BAN = /좋아|좋았|사랑|싫어|싫었|미워|최애|취향|즐겨|반했|단골|그리워|설레|맛있|재밌|재미있|신나|신났|행복|즐거|기뻐|기뻤|슬퍼|아쉬|미안|외로|심심|내일|여기까지|기다렸|보고 싶/;
    var tapStrs = []; function addTap(x) { if (typeof x === 'string') tapStrs.push(x); else if (Array.isArray(x)) x.forEach(addTap); else if (x && typeof x === 'object') Object.keys(x).forEach(function (k) { addTap(x[k]); }); }
    addTap(W.tapTemplates); addTap(B.DEFAULT_TAP); (W.homeActivities || []).forEach(function (act) { addTap(act.tap); });
    var badTap = tapStrs.filter(function (x) { return TAP_BAN.test(x); });
    errs = []; var nDemo = 0;
    for (seed = 1; seed <= 200; seed++) {
      var tp6 = await B.plan({ seed: seed, now: NOW, dateKey: '2026-11-07', online: seed % 4 !== 0, fetchWiki: quick, state: { visits: seed % 2 ? {} : heavy, lantern: seed % 8, posters: 2 } });
      tp6.status = 'done';
      var rr6 = B.tapLine(tp6); if (!rr6) continue; nDemo++;
      if (TAP_BAN.test(rr6.part ? rr6.text.split(rr6.part).join(' ') : rr6.text)) errs.push(seed + ': ' + rr6.text);
      if (rr6.by !== 'demo-rules') errs.push(seed + ': demo plan line labelled ' + rr6.by);
    }
    check(tapStrs.length > 30 && badTap.length === 0 && nDemo > 150 && errs.length === 0, 'tap templates and generated demo tap lines carry no feeling / preference / tomorrow words (' + tapStrs.length + ' strings, ' + nDemo + ' lines; ' + badTap.concat(errs).slice(0, 3).join(' | ') + ')');

    /* ───────── 7. 미용실: 고른 이의 말 · 결정 그대로 ───────── */
    section("7. salon: the chooser's words and choice are kept (no line → no octopus row; demo never 'model'; dev = 'human'; off-menu → no re-ask)");
    var DEMO_LINES = SAL.LINES.dye.concat(SAL.LINES.keep), BLUE = '#4a86d8', D0 = '2026-11-09';
    function salonState(extra) {
      return Object.assign({ octopus: { name: '뚜루', born: 1762600000000, color: '#e8463c', colors: [{ at: 1762600000000, date: '2026-11-01', color: '#e8463c', how: 'first', by: 'player' }] }, room: { lantern: 3 }, settings: { octColor: '#e8463c' }, salon: { asks: [] } }, extra || {});
    }
    function octRows(ask) { return SAL.rows(ask, '뚜루').filter(function (r) { return r.voice === 'octopus'; }); }
    function demoText(ask) { return SAL.rows(ask, '뚜루').some(function (r) { return DEMO_LINES.indexOf(r.text) >= 0; }); }
    /* 모델이 준 말: 기록 · 행 2 (data-raw model) 에 글자 그대로, 말풍선만 앞 24자 + '…' · 말이 없으면 문어 행 0 · 데모 문구 0 */
    errs = []; var nModel = 0, nNoLine = 0;
    SAYINGS.concat([null, undefined, '', '   ', SAL.LINES.dye[0]]).forEach(function (said, k) {
      ['dye', 'keep', 'DYE ', 'no', '그냥 둘래', null].forEach(function (act, j) {
        var raw = JSON.stringify(Object.assign({ action: act, expr: ['happy', 'idle', 'sad', null][(k + j) % 4] }, said === undefined ? {} : { line: said }));
        var rep = SAL.readReply(raw), tag = 'line ' + JSON.stringify(said) + ' action ' + JSON.stringify(act);
        var ask = SAL.makeAsk(salonState(), { at: Date.parse(D0 + 'T05:00:00Z'), today: D0, offer: BLUE, answer: Object.assign({ by: 'model', raw: raw }, rep) });
        if (!ask) { errs.push(tag + ': no ask'); return; }
        nModel++;
        var given = typeof said === 'string' && /\S/.test(said), rows = octRows(ask), st = SAL.staging(ask);
        if (ask.by !== 'model') errs.push(tag + ': by ' + ask.by);
        if (given) {
          if (ask.line !== said) errs.push(tag + ': record changed ' + JSON.stringify(ask.line));
          if (rows.length !== 1 || rows[0].text !== said || rows[0].raw !== true) errs.push(tag + ': octopus row not byte-identical / not raw ' + JSON.stringify(rows));
          var g = Array.from(said);
          if (st.bubble !== (g.length > SAL.LINE_SHOW ? g.slice(0, SAL.LINE_SHOW).join('') + '…' : said)) errs.push(tag + ': bubble ' + JSON.stringify(st.bubble));
        } else {
          nNoLine++;
          if (ask.line !== null || rows.length !== 0 || st.bubble !== null || demoText(ask)) errs.push(tag + ': code filled the line ' + JSON.stringify([ask.line, rows, st.bubble]));
        }
        if (rep.expr === null && rep.exprRaw && ask.expr !== null) errs.push(tag + ': unknown expr became ' + ask.expr);
      });
    });
    check(nModel > 70 && nNoLine >= 24 && errs.length === 0, "model reply: line kept byte for byte in the record and row 2 (data-raw model, bubble = first 24 + '…'); no line → no octopus row, no bubble, no demo text (" + nModel + ' asks, ' + nNoLine + ' without words; ' + errs.length + ' errors)' + (errs.length ? ' e.g. ' + errs.slice(0, 2).join(' | ') : ''));
    /* 데모 결정은 'model' 로 적히지 않는다: 365일 × 문어 셋 — by 'demo-rules' · 꼬리 '데모 규칙' · 고른 이 풀이도 모델이 아님 */
    errs = []; var nDemoAsk = 0;
    ['뚜루', '안개', '삐죠'].forEach(function (nm, k) {
      var s = salonState(); s.octopus.name = nm; s.octopus.born = 1762600000000 + k * 50000000;
      for (var d = 0; d < 365; d++) {
        var day = SAL.addDays('2026-11-09', d), open = SAL.bottles(s, day).filter(function (b) { return b.selectable; });
        if (!open.length) { nDemoAsk++; continue; }   /* 내밀 병이 없는 날 (지금 색 + 쉬는 색뿐) — 물음 없음 */
        var ask = SAL.makeAsk(s, { at: Date.parse(day + 'T05:00:00Z'), today: day, offer: open[d % open.length].hex });
        if (!ask) { errs.push(nm + ' ' + day + ': no ask'); continue; }
        nDemoAsk++;
        var r3 = SAL.rows(ask, nm).filter(function (r) { return r.n === 3; })[0];
        if (ask.by !== 'demo-rules' || ask.model !== null || ask.via !== null || (ask.rule !== 'seed' && ask.rule !== 'first') || !r3 || r3.tail !== '데모 규칙' || octRows(ask).some(function (r) { return r.raw; })) errs.push(nm + ' ' + day + ': ' + JSON.stringify([ask.by, ask.rule, r3 && r3.tail]));
        SAL.commit(s, ask);
      }
      var lk = SAL.look(s, { salon: true });
      if (lk.changes.some(function (c) { return c.by === 'model'; }) || lk.asks.some(function (a) { return a.by === 'model'; })) errs.push(nm + ': look() says model');
    });
    check(nDemoAsk === 3 * 365 && errs.length === 0, "demo-rules answers are never recorded as the model's: by 'demo-rules', tail '데모 규칙', no raw/model/via (" + nDemoAsk + ' asks; ' + errs.length + ' errors)' + (errs.length ? ' e.g. ' + errs[0] : ''));
    /* 개발용 '다음 대답' (사람이 정함): by 'human' · 결정만 — 데모 문구 · 말풍선 · 얼굴 · 기쁨 없음 (말 · 얼굴을 몰래 실어 보내도) */
    errs = [];
    [['dye'], ['keep'], [null], ['dye', { line: '응, 해 볼래.', expr: 'happy', rule: 'first' }], ['keep', { line: '그냥', expr: 'calm' }]].forEach(function (c) {
      var ans = Object.assign(SAL.humanAnswer(c[0]), c[1] || {}), ask = SAL.makeAsk(salonState(), { at: Date.parse(D0 + 'T05:00:00Z'), today: D0, offer: BLUE, answer: ans });
      var st = SAL.staging(ask), r3 = SAL.rows(ask, '뚜루').filter(function (r) { return r.n === 3; })[0];
      if (!ask || ask.by !== 'human' || ask.line !== null || ask.expr !== null || ask.rule !== null || ask.action !== c[0]) errs.push(JSON.stringify(c) + ' record ' + JSON.stringify(ask && [ask.by, ask.line, ask.expr, ask.rule, ask.action]));
      else if (octRows(ask).length || demoText(ask) || st.bubble !== null || st.joy || st.expr !== 'idle' || st.look || !r3 || r3.tail !== '사람이 정함') errs.push(JSON.stringify(c) + ' shown ' + JSON.stringify([st, r3]));
    });
    check(errs.length === 0, "dev answers are by 'human': decision only — no demo line, bubble, face, joy or look; tail '사람이 정함' (" + errs.length + ' errors)' + (errs.length ? ' e.g. ' + errs[0] : ''));
    /* 받은 메뉴 밖 답 · 못 읽는 답 → 다시 묻지 않는다: 같은 요청을 다시 보내는 건 아무것도 안 왔을 때(empty) 한 번뿐. 그 물음은 끝(done)이라 그날 또 물을 수 없다 */
    errs = []; var resend = 0, nOff = 0;
    ['{"action":"no"}', '"그냥 둘래"', '{"action":"maybe","line":"글쎄"}', 'not json', '', '   ', '{"line":"말만"}', '{"action":7}', '{"action":null}', '[]'].forEach(function (raw) {
      var rep = SAL.readReply(raw); nOff++;
      if (rep.empty) resend++;
      if (Object.keys(rep).some(function (k) { return /retry|again|reask|resend/i.test(k); })) errs.push(raw + ': retry signal ' + Object.keys(rep).join(','));
      var s = salonState(), ask = SAL.makeAsk(s, { at: Date.parse(D0 + 'T05:00:00Z'), today: D0, offer: BLUE, answer: Object.assign({ by: 'model', raw: raw }, rep) });
      if (!ask || ask.status !== 'done' || ask.action !== null) { errs.push(raw + ': ' + JSON.stringify(ask && [ask.status, ask.action])); return; }
      SAL.commit(s, ask);
      if (s.octopus.color !== '#e8463c') errs.push(raw + ': colour changed');
      if (SAL.canAsk(s, D0, { mirror: true }).reason !== 'asked_today') errs.push(raw + ': could ask again the same day');
      if (SAL.restingUntil(s, BLUE, D0)) errs.push(raw + ': off-menu reply put the colour to rest');
    });
    var emptyRep = SAL.readReply(null);
    check(resend === 0 && emptyRep.empty === true && nOff === 10 && errs.length === 0, 'off-menu / unreadable replies: 0 re-requests (only a transport failure — nothing received — may be sent once more), done the same day, colour unchanged, no rest (' + errs.length + ' errors)' + (errs.length ? ' e.g. ' + errs[0] : ''));
    /* 모델 요청: keep 이 첫째 · 이유 칸 없음 · 확률 · 지난 대답 없음 (test-salon 이 자세히 — 여기선 MODEL_VOICE 점검 목록 한 줄) */
    var rq = SAL.request(salonState(), SAL.makeAsk(salonState(), { at: Date.parse(D0 + 'T05:00:00Z'), today: D0, offer: BLUE })), rqs = JSON.stringify(rq);
    check(rq && rq.menu[0] === 'keep' && rq.menu.indexOf('dye') > 0 && !/reason|why|0\.625|P_YES|REST|demo|그대로/.test(rqs) && !PREF.test(rqs), 'salon request: keep first, no reason field, no odds / past answers (' + rqs + ')');
  } catch (e) {
    failures++;
    console.error('UNCAUGHT', e && e.stack || e);
  }
  Math.random = realRandom;
  console.log('\n' + passes + ' passed, ' + failures + ' failed');
  process.exit(failures ? 1 : 0);
})();
