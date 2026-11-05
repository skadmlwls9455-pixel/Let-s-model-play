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
ok(W.strings && W.strings.emptyHintHelp && W.strings.urlHintHelp && typeof W.strings.firstGreeting === 'function' && W.strings.awayLine, 'strings 최소 집합 누락');
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
