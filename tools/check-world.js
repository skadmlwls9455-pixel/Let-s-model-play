#!/usr/bin/env node
/* tools/check-world.js — js/world.js 불변식 검사 (node, 의존성 없음)
   DESIGN.md §12.1: 고립 노드 없음, related/tangents.to 존재, tangents ≥1,
   memories ≥2, clue 존재, 코너 id 유효, 스티커·기념품 키 존재. 실패 시 exit 1. */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var file = path.resolve(__dirname, '..', 'js', 'world.js');
var src = fs.readFileSync(file, 'utf8');

/* 브라우저처럼: module 없는 전역 환경에서 평가해 WORLD 전역이 생기는지 확인 */
var sandbox = {};
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: file });
var W = sandbox.WORLD;

var fails = [];
var warns = [];
function fail(msg) { fails.push(msg); }
function warn(msg) { warns.push(msg); }
function ok(cond, msg) { if (!cond) fail(msg); }

ok(W && typeof W === 'object', 'WORLD 전역이 없다');
if (!W) { report(); }

/* 금지: 모듈 문법 */
ok(!/^\s*(import|export)\s/m.test(src), 'import/export 문법은 쓰지 않는다 (file:// 호환)');
ok(!/Math\.random/.test(src), 'world.js 에 Math.random 이 있다');

/* ---- 코너 ---- */
var CORNERS = ['hands', 'sea', 'sky', 'signs', 'numbers', 'sounds', 'home', 'mind'];
CORNERS.concat(['wild']).forEach(function (c) {
  var cc = W.corners[c];
  ok(cc && cc.name && cc.emoji && cc.phrase, '코너 ' + c + ' 가 불완전하다');
});
ok(Array.isArray(W.scenes) && W.scenes.length === 9, 'scenes 는 9개여야 한다');

/* ---- 노드 ---- */
var nodes = W.nodes;
var ids = Object.keys(nodes);
var SPECIAL = ['slow_room', 'letter_room', 'door_out'];
SPECIAL.forEach(function (s) { ok(nodes[s], '특수 노드 ' + s + ' 가 없다'); });

var regular = ids.filter(function (id) { return SPECIAL.indexOf(id) < 0; });
ok(regular.length >= 56 && regular.length <= 64, '일반 노드 수 56~64 이어야 한다: ' + regular.length);

var perCorner = {};
var oddCount = 0, tangentCount = 0, relatedCount = 0;
var nameIndex = {};  // name/alias → nodeId (중복 탐지)
var BRIDGE_END = /(에서|데서|다가|보고|같아서|되어서|느껴져서|보여서)$/;

ids.forEach(function (id) {
  var n = nodes[id];
  var where = '노드 ' + id + ': ';
  ok(n.id === id, where + 'id 가 키와 다르다');
  ok(/^[a-z][a-z0-9_]*$/.test(id), where + 'id 는 snake_case');
  ok(typeof n.name === 'string' && n.name.length > 0, where + 'name 없음');
  ok(W.corners[n.corner] !== undefined, where + '코너 id 가 유효하지 않다: ' + n.corner);
  if (id !== 'door_out') ok(CORNERS.indexOf(n.corner) >= 0, where + '일반 노드는 8코너 중 하나여야 한다');
  ok(typeof n.odd === 'boolean', where + 'odd 는 boolean');
  ok(Array.isArray(n.aliases) && Array.isArray(n.keywords), where + 'aliases/keywords 배열');
  ok(n.wiki === null || (typeof n.wiki === 'string' && n.wiki.length > 0), where + 'wiki 는 문자열 또는 null');
  ok(typeof n.clue === 'string' && n.clue.length >= 8, where + 'clue 없음/너무 짧음');
  ok(Array.isArray(n.memories) && n.memories.length >= 2, where + 'memories ≥2');
  (n.memories || []).forEach(function (m, i) {
    ok(typeof m === 'string' && m.length > 0, where + 'memories[' + i + '] 비어 있음');
    ok(m.length <= 40, where + 'memories[' + i + '] 40자 초과 (' + m.length + '): ' + m);
  });
  ok(typeof n.sticker === 'string' && W.stickers[n.sticker], where + '스티커 키 없음: ' + n.sticker);
  ok(typeof n.emoji === 'string' && n.emoji.length > 0, where + 'emoji 없음');
  ok(W.scenes.indexOf(n.scene) >= 0, where + 'scene 키가 유효하지 않다: ' + n.scene);
  ok(Array.isArray(n.related), where + 'related 배열');
  ok(Array.isArray(n.tangents) && n.tangents.length >= 1, where + 'tangents ≥1');
  ok(typeof n.linger === 'boolean', where + 'linger boolean');
  if (n.souvenir != null) ok(W.souvenirs[n.souvenir], where + '기념품 키 없음: ' + n.souvenir);

  // 간선 존재
  n.related.forEach(function (r) {
    ok(nodes[r], where + 'related → 없는 노드 ' + r);
    ok(r !== id, where + 'related 자기 자신');
    relatedCount++;
  });
  var cross = false;
  n.tangents.forEach(function (t, i) {
    ok(t && typeof t.to === 'string' && nodes[t.to], where + 'tangents[' + i + '].to 없는 노드 ' + (t && t.to));
    ok(t && typeof t.bridge === 'string' && t.bridge.length >= 6, where + 'tangents[' + i + '] bridge 없음');
    if (t && t.bridge && !BRIDGE_END.test(t.bridge)) warn(where + 'bridge 가 장면형 어미(…에서/…다가/…보고)로 끝나지 않는다: ' + t.bridge);
    if (t && nodes[t.to] && nodes[t.to].corner !== n.corner) cross = true;
    tangentCount++;
  });
  ok(cross, where + '다른 코너로 가는 tangent 가 하나도 없다');

  // 들어오는 간선(고립 방지) — door_out 은 URL 전용 입구라 제외
  if (id !== 'door_out') {
    var incoming = ids.some(function (o) {
      if (o === id) return false;
      var m = nodes[o];
      return m.related.indexOf(id) >= 0 || m.tangents.some(function (t) { return t.to === id; });
    });
    ok(incoming, where + '들어오는 간선이 없다 (고립)');
  }

  // 특수 노드 규칙
  if (id === 'slow_room') { ok(n.linger === true && n.wiki === null && n.corner === 'mind', where + 'linger:true, wiki:null, corner mind 이어야 한다'); }
  if (id === 'letter_room') {
    ok(n.linger === false && n.wiki === null, where + 'linger:false, wiki:null');
    ok(n.alwaysEmpty === true, where + 'alwaysEmpty:true');
    ok(n.memories.every(function (m) { return /비어/.test(m); }), where + 'memories 는 모두 비어 있었다는 내용이어야 한다');
  }
  if (id === 'door_out') {
    ok(n.urlOnly === true && n.wiki === null, where + 'urlOnly:true, wiki:null');
    var pointed = ids.some(function (o) {
      return o !== id && (nodes[o].related.indexOf(id) >= 0 || nodes[o].tangents.some(function (t) { return t.to === id; }));
    });
    ok(!pointed, where + 'door_out 은 URL 전용 입구라 다른 노드가 가리키면 안 된다');
  }

  // 이름/별칭 중복 (힌트 매칭 모호성)
  [n.name].concat(n.aliases).forEach(function (a) {
    var key = a.replace(/\s+/g, '').toLowerCase();
    if (nameIndex[key] && nameIndex[key] !== id) fail('이름/별칭 중복: "' + a + '" 가 ' + nameIndex[key] + ' 와 ' + id + ' 에 있다');
    nameIndex[key] = id;
  });
  // '역사' 같은 힌트 수식어가 키워드로 들어가면 안 된다
  n.keywords.concat(n.aliases).forEach(function (kw) {
    ok(!/^(역사|만드는 법|이야기|뜻|유래)$/.test(kw), where + '힌트 수식어는 keywords/aliases 에 넣지 않는다: ' + kw);
  });

  // 톤 검사
  [n.clue].concat(n.memories).forEach(function (s) {
    ok(!/미안|죄송|기분이 어때|실망|섭섭/.test(s), where + '금지 표현: ' + s);
  });

  if (SPECIAL.indexOf(id) < 0) {
    perCorner[n.corner] = (perCorner[n.corner] || 0) + 1;
    if (n.odd) oddCount++;
  }
});

ok(oddCount >= 10 && oddCount <= 14, '엉뚱한 방은 10~14개여야 한다: ' + oddCount);
['octopus_nerves', 'cuneiform', 'knot_theory', 'prime', 'braille', 'cloud_names', 'mobius', 'morse', 'tessellation', 'ancient_language']
  .forEach(function (id) { ok(nodes[id] && nodes[id].odd === true, '필수 엉뚱한 방 ' + id + ' 이 odd:true 가 아니다'); });
CORNERS.forEach(function (c) { ok((perCorner[c] || 0) >= 5, '코너 ' + c + ' 에 노드가 5개 미만'); });

/* ---- 연결성: 약연결(무향) + 강연결(door_out 제외) ---- */
function neighborsOut(id) {
  var n = nodes[id];
  return n.related.concat(n.tangents.map(function (t) { return t.to; })).filter(function (x) { return nodes[x]; });
}
var undirected = {};
ids.forEach(function (id) { undirected[id] = {}; });
ids.forEach(function (id) {
  neighborsOut(id).forEach(function (o) { undirected[id][o] = true; undirected[o][id] = true; });
});
function bfs(start, adj) {
  var seen = {}; seen[start] = true; var q = [start];
  while (q.length) { var cur = q.shift(); Object.keys(adj(cur)).forEach(function (o) { if (!seen[o]) { seen[o] = true; q.push(o); } }); }
  return seen;
}
var weak = bfs(ids[0], function (id) { return undirected[id]; });
var unreachedWeak = ids.filter(function (id) { return !weak[id]; });
ok(unreachedWeak.length === 0, '그래프가 연결되지 않았다 (고립 묶음): ' + unreachedWeak.join(', '));

var dirAdj = {};
ids.forEach(function (id) { dirAdj[id] = {}; neighborsOut(id).forEach(function (o) { dirAdj[id][o] = true; }); });
var walkable = ids.filter(function (id) { return id !== 'door_out'; });
var strongBad = [];
walkable.forEach(function (start) {
  var seen = bfs(start, function (id) { return dirAdj[id]; });
  var miss = walkable.filter(function (id) { return !seen[id]; });
  if (miss.length) strongBad.push(start + ' → 못 가는 곳 ' + miss.length + '개 (예: ' + miss.slice(0, 4).join(', ') + ')');
});
ok(strongBad.length === 0, '방향 그래프가 강연결이 아니다:\n    ' + strongBad.slice(0, 8).join('\n    '));

/* ---- 피드백 예시: '모자의 역사' → hat → feather (bridge 고정) ---- */
function tokenize(hint) {
  return hint.split(/\s+/).map(function (t) { return t.replace(/(의|을|를|이|가|은|는|도|에|로|와|과)$/, ''); })
    .filter(function (t) { return t.length >= 2; });
}
function matchHint(hint) {
  var toks = tokenize(hint);
  var hits = [];
  for (var i = 0; i < toks.length; i++) {
    var t = toks[i];
    for (var j = 0; j < ids.length; j++) {
      var n = nodes[ids[j]];
      if (n.name === t || n.aliases.indexOf(t) >= 0) hits.push({ id: ids[j], how: n.name === t ? 'exact' : 'alias', token: t });
    }
  }
  return hits;
}
var hatHits = matchHint('모자의 역사');
ok(hatHits.length === 1 && hatHits[0].id === 'hat', "'모자의 역사' 는 hat 하나에만 매칭되어야 한다: " + JSON.stringify(hatHits));
var hatFeather = nodes.hat && nodes.hat.tangents.filter(function (t) { return t.to === 'feather'; })[0];
ok(hatFeather && hatFeather.bridge === '모자 장식에 꽂힌 깃털에서', 'hat → feather 다리 문구가 명세와 다르다');

/* 요구된 사슬들이 간선으로 존재하는지 */
var CHAINS = [
  ['hat', 'feather', 'quill', 'ink', 'octopus', 'octopus_nerves'],
  ['button', 'shell'],
  ['umbrella', 'rain', 'cloud_names', 'ancient_language', 'cuneiform'],
  ['knot', 'knot_theory', 'mobius'],
  ['lullaby', 'metronome', 'prime'],
  ['window', 'rainbow', 'light'],
  ['key', 'lock', 'cipher', 'morse'],
  ['stamp', 'letter_room'],
  ['sleep', 'slow_room']
];
CHAINS.forEach(function (chain) {
  for (var i = 0; i + 1 < chain.length; i++) {
    var a = chain[i], b = chain[i + 1];
    ok(nodes[a] && dirAdj[a][b], '사슬 끊김: ' + a + ' → ' + b);
  }
});

/* ---- 기념품 ---- */
var souvIds = Object.keys(W.souvenirs);
ok(souvIds.length === 16, '기념품은 16종이어야 한다: ' + souvIds.length);
souvIds.forEach(function (s) {
  var sv = W.souvenirs[s];
  ok(sv.name && sv.emoji && sv.asset === 'souvenir.' + s, '기념품 ' + s + ' 불완전');
  var owner = ids.filter(function (id) { return nodes[id].souvenir === s; });
  ok(owner.length >= 1, '기념품 ' + s + ' 을 가져올 수 있는 노드가 없다');
});

/* ---- 스티커 ---- */
Object.keys(W.stickers).forEach(function (k) {
  var st = W.stickers[k];
  ok(st.emoji && st.asset === 'sticker.' + k, '스티커 ' + k + ' 불완전');
});
ok(W.stickers.wild && W.stickers.wild.emoji === '❔', 'wild 스티커 ❔ 필요');

/* ---- 집 활동 ---- */
var acts = W.homeActivities;
ok(Array.isArray(acts) && acts.length >= 7, 'homeActivities ≥7');
['nothing', 'nap', 'count_rain', 'reread_poster', 'rearrange', 'moss', 'window_watch', 'hum'].forEach(function (id) {
  ok(acts.some(function (a) { return a.id === id; }), '집 활동 ' + id + ' 없음');
});
acts.forEach(function (a) {
  ok(typeof a.line === 'string' && a.line.length > 0, '활동 ' + a.id + ' line 없음');
  ok(typeof a.detail === 'string', '활동 ' + a.id + ' detail 문자열');
  ok(['window', 'crate', 'blanket', 'board'].indexOf(a.anchor) >= 0, '활동 ' + a.id + ' anchor 유효하지 않음');
  ok(typeof a.weight === 'number' && a.weight >= 0, '활동 ' + a.id + ' weight');
  ok(!/미안|못 나가|아쉽/.test(a.line + a.detail), '활동 ' + a.id + ' 에 아쉬움/사과 표현');
});

/* 집 활동은 방에 실제로 있는 것만: 포스터를 말하면 requiresPoster, 이끼 화분은 등불 1부터, 자리 바꾸기는 rotatePosters */
acts.forEach(function (a) {
  if (/포스터/.test(a.line + a.detail + (a.memo || ''))) ok(a.requiresPoster === true, '활동 ' + a.id + ' 은 포스터를 말하니 requiresPoster 필요');
  if (/이끼|화분/.test(a.line + a.detail)) ok(typeof a.requiresLantern === 'number' && a.requiresLantern >= 1, '활동 ' + a.id + ' 은 이끼 화분(등불 1)이 있어야 해: requiresLantern ≥ 1');
});
/* 날씨는 두뇌 입력에 없고 app 이 등불로 정한다 (roomLevels: 창이 'stars' 인 단계부터 맑을 수 있다 = 등불 7).
   그러니 비·날씨를 말하는 집 활동은 maxLantern 이 그 단계보다 낮아야 하고, 나머지 활동은 날씨를 말하지 않는다 */
var clearFrom = (W.roomLevels || []).filter(function (lv) { return lv.window === 'stars'; }).map(function (lv) { return lv.lantern; })[0];
ok(typeof clearFrom === 'number', "roomLevels 에 창이 'stars' 인 단계(맑음 시작)가 있어야 해");
var HOME_WX = /비가|비 오|비 와|비 셌|빗|눈이 와|눈 오|맑|흐려|흐린|날씨|안개|천둥/;
acts.forEach(function (a) {
  if (!HOME_WX.test(a.line + '\n' + a.detail + '\n' + (a.memo || ''))) return;
  ok(typeof a.maxLantern === 'number' && a.maxLantern < clearFrom, '활동 ' + a.id + ' 은 날씨를 말하니 maxLantern < ' + clearFrom + ' 필요 (등불 ' + clearFrom + ' 은 맑음)');
});
ok(!HOME_WX.test(W.strings.homeStay || ''), 'strings.homeStay 가 날씨를 주장: ' + W.strings.homeStay);
var rearr = acts.filter(function (a) { return a.id === 'rearrange'; })[0];
ok(rearr && rearr.effect === 'rotatePosters' && rearr.requiresPoster === true, 'rearrange 는 effect:rotatePosters + requiresPoster');

/* ---- 톡 한 줄 (주인 11-08, BRAIN.tapLine) ----
   tapTemplates: 아는 치환자만 · 한글 · 숫자 · 띄어쓰기 · 마침표만 · 기분 · 시간 말 없음 · 갈래마다 가장 긴 세계 이름으로 채워도 22자 안인 꼴이 하나는 있다.
   homeActivities[].tap: 활동마다(nothing 빼고) 빈칸 없는 두 줄 · 그 활동의 앞면 · 뒷면과 같은 말(이나 그 속에 든 말)이 아니다 · 집 규칙(날씨 · 포스터 · 이끼) ·
   숫자는 앞면 · 뒷면에 있는 것만 · '오늘은' · 처음 · 걸은 얘기 · 내일 · 여기까지 · 쭉 · 한참 없음 */
var TAP_KEYS = { p: 1, s: 1, w: 1, t: 1, b: 1, a: 1, l: 1, x: 1, f: 1, r: 1, n: 1, m: 1 };
var TAP_BAD = /좋아|좋았|사랑|싫어|싫었|미워|최애|취향|즐겨|반했|단골|그리워|설레|맛있|재밌|재미있|신나|신났|행복|즐거|기뻐|기뻤|슬퍼|아쉬|미안|외로|심심|내일|여기까지|기다렸|보고 싶|오늘|아까|방금/;
var TAP_SITU = ['souvenir', 'souvenirAny', 'wildLink', 'wild', 'slowRoom', 'tangent', 'other', 'revisit', 'firstOther', 'longest', 'tired', 'enough', 'failed', 'simulated', 'doorOut', 'start', 'readOne', 'count', 'countMore'];
ok(W.tapTemplates && typeof W.tapTemplates === 'object', 'tapTemplates 가 없다 (톡 한 줄)');
var longName = ids.filter(function (id) { return id !== 'door_out'; }).map(function (id) { return nodes[id].name; }).sort(function (x, y) { return Array.from(y).length - Array.from(x).length; })[0] || '';
var longSv = Object.keys(W.souvenirs).map(function (k) { return W.souvenirs[k].name; }).sort(function (x, y) { return Array.from(y).length - Array.from(x).length; })[0] || '';
TAP_SITU.forEach(function (k) {
  var list = (W.tapTemplates || {})[k];
  ok(Array.isArray(list) && list.length >= 1, 'tapTemplates.' + k + ' 가 비었다');
  if (!Array.isArray(list)) return;
  var fits = 0;
  list.forEach(function (tp) {
    ok(typeof tp === 'string' && /^[가-힣0-9 .{}a-z]+$/.test(tp), 'tapTemplates.' + k + ' 글자는 한글·숫자·띄어쓰기·마침표만: ' + tp);
    ok(!TAP_BAD.test(tp), 'tapTemplates.' + k + ' 에 기분·시간 말: ' + tp);
    (String(tp).match(/\{(\w+)\}/g) || []).forEach(function (m) { ok(TAP_KEYS[m.slice(1, -1)] === 1, 'tapTemplates.' + k + ' 모르는 치환자 ' + m + ': ' + tp); });
    var filled = String(tp).replace(/\{s\}/g, longSv).replace(/\{[nm]\}/g, '다섯').replace(/\{w\}/g, '가나다라마바').replace(/\{\w+\}/g, longName).replace(/(은|는|이|가|을|를|과|와|으로|로)(?= |$)/g, '$1');
    if (Array.from(filled).length <= 23) fits++;   /* 조사 한 글자 여유 */
  });
  ok(fits > 0, 'tapTemplates.' + k + ': 가장 긴 이름(' + longName + ')으로 채우면 모든 꼴이 22자를 넘는다');
});
var NUM_ROOTS = ['하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉', '열', '스물', '서른', '마흔', '쉰'];
acts.forEach(function (a) {
  if (a.id === 'nothing') return;
  ok(Array.isArray(a.tap) && a.tap.length === 2 && a.tap.every(function (x) { return typeof x === 'string' && x.trim(); }), '활동 ' + a.id + ' tap 은 빈칸 없는 두 줄');
  (a.tap || []).forEach(function (x) {
    var front = String(a.line || ''), back = String(a.detail || '');
    ok(x !== front && front.indexOf(x) < 0 && back.indexOf(x) < 0, '활동 ' + a.id + ' tap 이 쪽지 앞면·뒷면과 같은 말: ' + x);
    ok(/^[가-힣0-9 .]+$/.test(x) && Array.from(x).length <= 22, '활동 ' + a.id + ' tap 은 한글 22자 안: ' + x);
    ok(!TAP_BAD.test(x) && !/오늘은|처음|걸었|다녀왔|갔다 왔|산책|쭉|한참/.test(x), '활동 ' + a.id + ' tap 에 기분·시간·걸은 얘기·길이 말: ' + x);
    if (/비|빗|눈이|눈 오|맑|흐려|흐린|날씨|안개|천둥/.test(x)) ok(typeof a.maxLantern === 'number' && a.maxLantern < clearFrom, '활동 ' + a.id + ' tap 이 날씨를 말하니 maxLantern < ' + clearFrom + ' 필요: ' + x);
    if (/포스터/.test(x)) ok(a.requiresPoster === true, '활동 ' + a.id + ' tap 이 포스터를 말하니 requiresPoster 필요: ' + x);
    if (/이끼|화분/.test(x)) ok(typeof a.requiresLantern === 'number' && a.requiresLantern >= 1, '활동 ' + a.id + ' tap 이 이끼 화분을 말하니 requiresLantern ≥ 1: ' + x);
    NUM_ROOTS.forEach(function (nr) { if (x.indexOf(nr) >= 0 && !/열렸|열어|열리/.test(x)) ok((front + back).indexOf(nr) >= 0, '활동 ' + a.id + ' tap 의 수(' + nr + ')가 쪽지에 없다: ' + x); });
  });
});

/* ---- 반응 ----
   lines = 언제 말해도 참인 줄, when.first/missed/long = 그 일이 있었을 때만 더하는 줄 */
var WHEN_KEYS = ['first', 'missed', 'long'];
['폴짝', '우쭐', '덤덤', '졸림'].forEach(function (r) {
  var rx = W.reactions[r];
  var when = (rx && rx.when) || {};
  var extra = 0;
  Object.keys(when).forEach(function (k) {
    ok(WHEN_KEYS.indexOf(k) >= 0, '반응 ' + r + ' when.' + k + ' 은 모르는 조건');
    ok(Array.isArray(when[k]) && when[k].length >= 1 && when[k].every(function (l) { return typeof l === 'string' && l; }), '반응 ' + r + ' when.' + k + ' 은 문자열 배열');
    extra += (when[k] || []).length;
  });
  ok(rx && rx.emoji && Array.isArray(rx.lines) && rx.lines.length >= 1 && rx.lines.length + extra >= 2 && rx.lines.length + extra <= 3, '반응 ' + r + ' 은 2~3줄 (늘 참인 줄 1개 이상)');
  /* 늘 쓰는 줄에는 사실 주장이 없어야 한다 */
  (rx && rx.lines || []).forEach(function (l) {
    ok(!/처음/.test(l), '반응 ' + r + ' 의 늘 쓰는 줄이 처음을 주장: ' + l + ' (when.first 로)');
    ok(!/못 읽/.test(l), '반응 ' + r + ' 의 늘 쓰는 줄이 못 읽음을 주장: ' + l + ' (when.missed 로)');
    ok(!/많이 걸었/.test(l), '반응 ' + r + ' 의 늘 쓰는 줄이 오래 걸음을 주장: ' + l + ' (when.long 으로)');
  });
  /* 날씨는 app 이 등불 단계로 정하고 두뇌 입력에는 없다 (등불 7 은 맑음) → 반응 줄은 어느 칸이든 날씨를 말하지 않는다 */
  var every = (rx && rx.lines || []).slice();
  Object.keys(when).forEach(function (k) { every = every.concat(when[k] || []); });
  every.forEach(function (l) {
    ok(!/비가|비 오|비 와|빗|눈이 와|눈 오|맑|흐려|흐린|날씨|안개|천둥/.test(l), '반응 ' + r + ' 의 줄이 날씨를 주장: ' + l + ' (두뇌는 날씨를 모른다)');
  });
});
/* 집에 있는 날의 졸림 줄(lines)은 걷거나 다녀온 일을 말하지 않는다 */
(W.reactions['졸림'].lines || []).forEach(function (l) {
  ok(!/걸었|다녀왔|갔다 왔|산책/.test(l), '졸림 lines 는 집에 있는 날에도 쓰인다 — 걸은 얘기 금지: ' + l);
});
/* 반응 줄은 '여기까지'·'내일' 을 말하지 않는다 — 초대는 몇 번이든 되니 '오늘 놀이는 끝' 으로 읽히면 안 된다 (test-brain 과 같은 규칙) */
Object.keys(W.reactions).forEach(function (r) {
  var rx = W.reactions[r] || {}, all = (rx.lines || []).concat(Array.isArray(rx.home) ? rx.home : []);
  Object.keys(rx.when || {}).forEach(function (k) { all = all.concat(rx.when[k] || []); });
  all.forEach(function (l) { ok(!/여기까지|내일/.test(l), '반응 ' + r + ' 의 줄이 놀이가 끝났다고 읽힘 ("여기까지"/"내일"): ' + l); });
});
/* 집에 있는 날 반응 (DESIGN §5.9, 두뇌 homeReactionCands · homeLines). 집에선 처음 온 데·읽은 게 없으니 후보는 졸림·덤덤만.
   reactions[r].home = 집에서만 쓰는 줄: 집 차례 어디서든 참이어야 한다 — 걸은 일·다녀온 일·처음·못 읽음·날씨·'오늘은'(같은 날 나갔다 온 뒤일 수도) 없음.
   덤덤 lines 는 '다녀왔어' 를 말하니, 덤덤을 후보로 둔 활동이 있으면 덤덤 home 줄이 있어야 한다 (없으면 두뇌가 조용히 졸림으로 바꾼다). test-brain 과 같은 규칙 */
var HOME_REACTS = ['졸림', '덤덤'];
var HOME_LINE_BAD = /걸었|다녀왔|갔다 왔|산책|처음|못 읽|오늘은|비가|비 오|비 와|빗|눈이 와|눈 오|맑|흐려|흐린|날씨|안개|천둥/;
Object.keys(W.reactions).forEach(function (r) {
  var hm = W.reactions[r] && W.reactions[r].home;
  if (hm === undefined) return;
  ok(HOME_REACTS.indexOf(r) >= 0, '반응 ' + r + ' 에 home 줄이 있다 — 집에선 졸림·덤덤만 고를 수 있다');
  ok(Array.isArray(hm) && hm.length >= 1 && hm.every(function (l) { return typeof l === 'string' && l.trim(); }), '반응 ' + r + ' home 은 비지 않은 문자열 배열');
  (Array.isArray(hm) ? hm : []).forEach(function (l) {
    ok(!HOME_LINE_BAD.test(String(l)), '반응 ' + r + ' home 줄은 어느 집 차례에도 참이어야 해 (걸은 일·처음·못 읽음·날씨·"오늘은" 없음): ' + l);
  });
});
acts.forEach(function (a) {
  if (a.reactions === undefined) return;
  var rs = a.reactions;
  ok(Array.isArray(rs) && rs.length >= 1, '활동 ' + a.id + ' reactions 는 비지 않은 배열');
  (Array.isArray(rs) ? rs : []).forEach(function (r, i) {
    ok(HOME_REACTS.indexOf(r) >= 0, '활동 ' + a.id + ' reactions 에 ' + r + ' — 집에선 졸림·덤덤만 (처음 온 데·읽은 게 없다)');
    ok(rs.indexOf(r) === i, '활동 ' + a.id + ' reactions 에 ' + r + ' 가 두 번');
    if (r !== '졸림') ok(W.reactions[r] && Array.isArray(W.reactions[r].home) && W.reactions[r].home.length >= 1, '활동 ' + a.id + ' 이 ' + r + ' 을 후보로 두니 reactions.' + r + '.home 줄이 있어야 해 (' + r + ' lines 는 다녀온 얘기)');
  });
});

/* ---- 템플릿 ---- */
['followedThenLeft', 'followedKept', 'noHint', 'ignored', 'linger'].forEach(function (k) {
  var arr = W.lineTemplates[k];
  ok(Array.isArray(arr) && arr.length >= 1, 'lineTemplates.' + k + ' 비어 있음');
  (arr || []).forEach(function (t) {
    var bad = (t.match(/\{[^}]*\}/g) || []).filter(function (p) { return ['{hint}', '{mem}', '{memory}'].indexOf(p) < 0; });
    ok(bad.length === 0, 'lineTemplates.' + k + ' 알 수 없는 치환자: ' + bad.join(' '));
  });
});
ok(W.lineTemplates.followedThenLeft.indexOf('{hint} 보러 갔다가 {mem}에 한눈팔았어') >= 0, '§5.6 기본 템플릿 누락');

/* ---- 방 진행표 ---- */
var EXPECT = [
  '아무것도 없는 다락방. 창문 너머로 빗소리.',
  '창가에 이끼 화분이 하나 생겼다.',
  '낡은 나무 상자가 책상 대신 놓였다.',
  '구석에 양초가 켜졌다. 그림자가 흔들린다.',
  '담요 한 장. 방이 조금 따뜻해졌다.',
  '벽에 포스터들이 붙기 시작했다.',
  '비가 잦아들었다. 창밖이 조용하다.',
  '창문에 별이 보인다. 많이 밝아졌어.',
  '완전히 꾸며진 다락방. 문어의 집.'
];
ok(Array.isArray(W.roomLevels) && W.roomLevels.length === 9, 'roomLevels 9개');
EXPECT.forEach(function (t, i) {
  var lv = W.roomLevels[i];
  ok(lv && lv.lantern === i && lv.text === t, 'roomLevels[' + i + '] 문구/번호가 §4 와 다르다');
});

/* ---- 문구 ---- */
ok(W.strings && typeof W.strings.firstGreeting === 'function' && W.strings.awayLine, 'strings 최소 집합 누락');
JSON.stringify(W, function (k, v) { return typeof v === 'function' ? undefined : v; })
  .split('"').forEach(function (s) {
    if (/결과물|리서치|보고서/.test(s)) warn('문구에 수확형 단어가 있다: ' + s);
  });

/* ---- 보고 ---- */
report();

function report() {
  console.log('nodes (일반): ' + regular.length + ' + 특수 ' + SPECIAL.length + ' = ' + ids.length);
  console.log('odd rooms: ' + oddCount);
  console.log('per corner: ' + CORNERS.map(function (c) { return c + '=' + (perCorner[c] || 0); }).join('  '));
  console.log('tangents: ' + tangentCount + '   related: ' + relatedCount);
  console.log('souvenirs: ' + Object.keys(W.souvenirs).length + '   stickers: ' + Object.keys(W.stickers).length + '   homeActivities: ' + W.homeActivities.length);
  var unverified = ids.filter(function (id) { return nodes[id].wiki && nodes[id].wikiUnverified; }).length;
  console.log('wiki titles: ' + ids.filter(function (id) { return nodes[id].wiki; }).length + ' (unverified: ' + unverified + ')');

  // hat 에서 3홉 안에 닿는 곳 (표본)
  console.log('\n[hat 에서 3홉 안]');
  var depth = { hat: 0 }; var q = ['hat']; var order = [];
  while (q.length) {
    var cur = q.shift(); order.push(cur);
    if (depth[cur] >= 3) continue;
    neighborsOut(cur).forEach(function (o) { if (depth[o] === undefined) { depth[o] = depth[cur] + 1; q.push(o); } });
  }
  var byDepth = {};
  order.forEach(function (id) { (byDepth[depth[id]] = byDepth[depth[id]] || []).push(id + '(' + nodes[id].name + ')'); });
  Object.keys(byDepth).forEach(function (d) { console.log('  ' + d + '홉: ' + byDepth[d].join(', ')); });
  console.log('  예시 사슬: hat → feather → quill → ink → octopus → octopus_nerves');
  ['hat', 'feather', 'quill', 'ink', 'octopus'].forEach(function (a, i) {
    var b = ['feather', 'quill', 'ink', 'octopus', 'octopus_nerves'][i];
    var t = nodes[a].tangents.filter(function (x) { return x.to === b; })[0];
    console.log('    ' + a + ' → ' + b + ': ' + (t ? '"' + t.bridge + '" → ' + nodes[b].name : '(related)'));
  });

  if (warns.length) { console.log('\nWARN (' + warns.length + '):'); warns.forEach(function (w) { console.log('  - ' + w); }); }
  if (fails.length) {
    console.log('\nFAIL (' + fails.length + '):');
    fails.forEach(function (f) { console.log('  - ' + f); });
    process.exit(1);
  }
  console.log('\nOK — world.js 불변식 통과');
  process.exit(0);
}
