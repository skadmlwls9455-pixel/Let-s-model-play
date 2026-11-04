#!/usr/bin/env node
/* tools/test-brain.js — BRAIN 테스트 (node, 의존성 없음). 실패하면 exit 1.
 *
 *   node tools/test-brain.js
 *
 * js/world.js 가 있으면 그것으로도 한 번 더 돈다. 없어도 내장 가짜 WORLD 로 전부 검증한다.
 * fetchWiki 는 stub: 어떤 제목은 ok, 어떤 제목은 missing, 하나는 throw, 하나는 영원히 대기(타임아웃).
 */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var assert = require('assert');

var ROOT = path.resolve(__dirname, '..');
var failures = 0, passes = 0;
function check(cond, msg) {
  if (cond) { passes++; return; }
  failures++;
  console.error('  FAIL ' + msg);
}
function section(name) { console.log('\n== ' + name); }

/* ───────── 가짜 WORLD (10+ 노드 / 3 코너 + 특수) ───────── */
function fakeWorld() {
  function node(id, name, corner, o) {
    return Object.assign({
      id: id, name: name, corner: corner, odd: false, aliases: [], keywords: [], wiki: name,
      clue: name + '에 대한 책장 메모.', memories: [name + ' 기억 하나', name + ' 기억 둘'],
      sticker: id, emoji: '📚', scene: corner, related: [], tangents: [], linger: false, souvenir: null
    }, o || {});
  }
  return {
    corners: {
      hands: { name: '손과 물건', emoji: '🧵', phrase: '손 쪽' },
      sea: { name: '바다와 생물', emoji: '🐚', phrase: '바다 쪽' },
      sky: { name: '하늘과 날씨', emoji: '☁', phrase: '하늘 쪽' },
      home: { name: '집', emoji: '🏠', phrase: '집 쪽' },
      wild: { name: '들판', emoji: '❔', phrase: '들판 쪽' }
    },
    nodes: {
      hat: node('hat', '모자', 'hands', { aliases: ['햇', '모자'], keywords: ['베레모', '쓰개'], emoji: '🎩', related: ['button'],
        tangents: [{ to: 'feather', bridge: '모자 장식에 꽂힌 깃털에서' }] }),
      feather: node('feather', '깃털', 'hands', { aliases: ['깃', '새털'], keywords: ['깃펜', '날개'], emoji: '🪶', scene: 'sky', souvenir: 'feather',
        related: ['button'], tangents: [{ to: 'bird_flight', bridge: '깃털이 바람에 날아가는 쪽으로' }] }),
      button: node('button', '단추', 'hands', { emoji: '🔘', souvenir: 'button', related: ['hat', 'feather'],
        tangents: [{ to: 'shell', bridge: '옛 단추가 조개껍데기로 만들어졌다는 걸 보고' }] }),
      shell: node('shell', '조개', 'sea', { emoji: '🐚', souvenir: 'shell', related: ['wave', 'octopus_nerves'],
        tangents: [{ to: 'button', bridge: '조개 단추를 보고' }] }),
      wave: node('wave', '파도', 'sea', { emoji: '🌊', related: ['shell'], tangents: [{ to: 'rain', bridge: '파도 위로 떨어지는 빗방울을 따라' }] }),
      octopus_nerves: node('octopus_nerves', '문어 신경계', 'sea', { odd: true, wiki: '문어', emoji: '🐙', aliases: ['문어'], related: ['shell'],
        tangents: [{ to: 'slow_room', bridge: '다리 하나가 혼자 생각하는 것 같아서' }] }),
      rain: node('rain', '비', 'sky', { emoji: '🌧', keywords: ['rain', '빗소리'], related: ['cloud_names', 'bird_flight'],
        tangents: [{ to: 'wave', bridge: '빗물이 바다로 가는 길을 따라' }] }),
      cloud_names: node('cloud_names', '구름 이름', 'sky', { odd: true, wiki: '구름', emoji: '☁', aliases: ['구름'], related: ['rain'],
        tangents: [{ to: 'letter_room', bridge: '구름 모양이 편지 봉투 같아서' }] }),
      bird_flight: node('bird_flight', '새의 비행', 'sky', { wiki: null, emoji: '🐦', keywords: ['새', 'bird'], related: ['rain'],
        tangents: [{ to: 'feather', bridge: '떨어진 깃털 하나를 주워서' }] }),
      slow_room: node('slow_room', '느린 글의 방', 'home', { wiki: null, clue: null, linger: true, emoji: '◌', aliases: ['느린 글'],
        related: [], tangents: [{ to: 'rain', bridge: '창밖 빗소리에' }] }),
      letter_room: node('letter_room', '편지의 방', 'home', { wiki: null, clue: null, emoji: '✉', related: [], tangents: [{ to: 'hat', bridge: '문 옆에 걸린 모자를 보고' }] }),
      door_out: node('door_out', '밖의 문', 'door_out', { wiki: null, clue: null, emoji: '🚪', related: [], tangents: [{ to: 'rain', bridge: '문틈으로 비가 들어와서' }] })
    },
    souvenirs: {
      feather: { name: '깃털', emoji: '🪶', asset: 'souvenir.feather' },
      button: { name: '단추', emoji: '🔘', asset: 'souvenir.button' },
      shell: { name: '조개', emoji: '🐚', asset: 'souvenir.shell' }
    },
    homeActivities: [
      { id: 'count_rain', line: '창가에서 빗방울을 세다가 잠들었어', detail: '마흔까지 세고 잊었어.', anchor: 'window', weight: 3 },
      { id: 'nap', line: '담요 속에서 낮잠', detail: '빗소리가 이불 같았어.', anchor: 'blanket', weight: 3 },
      { id: 'reread_poster', line: '어제 포스터 뒷면을 다시 읽었어', detail: '글씨가 조금 번져 있었어.', anchor: 'crate', weight: 2, minLantern: 1 },
      { id: 'swap_posters', line: '포스터 위치를 바꿔 봤어', detail: '왼쪽 걸 오른쁽으로.', anchor: 'board', weight: 1, minLantern: 2 },
      { id: 'watch_moss', line: '이끼 화분을 오래 들여다봤어', detail: '조금 더 초록인 것 같아.', anchor: 'window', weight: 2, minLantern: 1 },
      { id: 'nothing', line: '…', detail: '', anchor: 'blanket', weight: 0 }
    ],
    reactions: {
      '폴짝': { emoji: '🎉', lines: ['처음 보는 게 있었어!'] }, '우쭐': { emoji: '😌', lines: ['끝까지 봤다구'] },
      '덤덤': { emoji: '😶', lines: ['그냥 그랬어'] }, '졸림': { emoji: '😴', lines: ['졸려…'] }
    },
    lineTemplates: {
      followedThenLeft: ['{hint} 보러 갔다가 {mem}에 한눈팔았어'],
      followedKept: ['{hint}, 끝까지 봤어. {memory}'],
      noHint: ['오늘은 {mem}. {memory}', '발길 닿는 대로 가다 {mem}에 오래 있었어'],
      ignored: ['{hint}는 다음에. 오늘은 {mem}가 궁금했어'],
      linger: ['느린 글의 방에 앉아만 있었어. 아무것도 안 읽어도 됐어']
    },
    roomLevels: [], stickers: {}, scenes: ['hands', 'sea', 'sky', 'home', 'wild'], strings: {}
  };
}

/* ───────── fetch stub ───────── */
var OK_LINKS = ['베레모', '2010년', '모자 목록', 'Hat', '실크해트', '분류:모자', '왕관', '깃털', '아주아주아주아주긴제목이야열셋', '단추'];
var OK_TITLES = { '쿼카': 1, '모자': 1, '단추': 1, '조개': 1, '비': 1, '구름': 1, '베레모': 1, '실크해트': 1, '왕관': 1, '우산': 1, '잉크': 1, '매듭': 1, '소수': 1, '점자': 1 };
var fetchLog = [];
var inflight = 0, maxInflight = 0;
function stubFetch(title, opts) {
  fetchLog.push(title);
  inflight++; maxInflight = Math.max(maxInflight, inflight);
  var done = function () { inflight--; };
  if (title === '깃털') { done(); throw new Error('boom'); }
  if (title === '문어') { done(); return Promise.resolve({ ok: false, reason: 'network' }); }
  if (title === '파도') { done(); return Promise.resolve({ ok: false, reason: 'missing' }); }
  if (title === '__hang__') {
    return new Promise(function () {
      if (opts && opts.signal) opts.signal.addEventListener('abort', done);
    });
  }
  return new Promise(function (resolve) {
    setImmediate(function () {
      done();
      if (OK_TITLES[title]) {
        resolve({ ok: true, title: title, extract: title + '는 아주 오래된 물건이다. 두 번째 문장도 있다. 세 번째 문장은 잘려야 한다.',
          url: 'https://ko.wikipedia.org/wiki/' + encodeURIComponent(title), thumb: title === '모자' ? { url: 'https://upload.wikimedia.org/x.jpg', w: 480, h: 320 } : null,
          links: OK_LINKS });
      } else resolve({ ok: false, reason: 'missing' });
    });
  });
}

/* ───────── 로드 ───────── */
function loadScript(file) {
  var src = fs.readFileSync(file, 'utf8');
  vm.runInThisContext(src, { filename: file });
}
loadScript(path.join(ROOT, 'js/brain.js'));
var BRAIN = global.BRAIN;

var realMathRandom = Math.random;
Math.random = function () { throw new Error('BRAIN 이 Math.random 을 썼어'); };

var NOW_DAY = new Date(2026, 10, 4, 14, 0, 0);   // 로컬 14:00
var NOW_NIGHT = new Date(2026, 10, 4, 2, 0, 0);  // 로컬 02:00

function baseInput(seed, o) {
  return Object.assign({
    seed: seed, dateKey: '2026-11-04', seq: 1, hint: '', name: '뚜루',
    state: { visits: {}, affinity: {}, lantern: 1, recent: [], todayOut: 0 },
    now: NOW_DAY, online: true, fetchWiki: stubFetch, by: 'demo'
  }, o || {});
}
function hasBrace(s) { return typeof s === 'string' && s.indexOf('{') >= 0; }
/* "읽었다"는 주장. "못 읽었어" 는 정직한 문장이므로 제외 */
var READ_CLAIM = /끝까지 봤어|만 봤어|(?<!못 )읽었어/;
function allLines(trip) {
  var out = [];
  if (trip.poster) { out.push(trip.poster.line); out.push(trip.poster.title); }
  trip.events.forEach(function (e) { if (e.line) out.push(e.line); if (e.note) out.push(e.note); });
  if (trip.receipt) { trip.receipt.stops.forEach(function (s) { out.push(s.note); }); if (trip.receipt.reactionLine) out.push(trip.receipt.reactionLine); }
  return out.filter(function (x) { return typeof x === 'string'; });
}

/* ───────── 단위 테스트 ───────── */
async function unitTests() {
  section('hashSeed / rng');
  check(BRAIN.hashSeed('a') === 0xe40c292c, 'FNV-1a("a") = e40c292c');
  check(BRAIN.hashSeed('2026-11-04', '모자', 1, '뚜루') === BRAIN.hashSeed('2026-11-04|모자|1|뚜루'), 'parts joined with |');
  check(BRAIN.hashSeed('x') !== BRAIN.hashSeed('y'), 'different parts → different seeds');
  var r1 = BRAIN.rng(123), r2 = BRAIN.rng(123);
  var ok = true; for (var i = 0; i < 50; i++) { var a = r1(), b = r2(); if (a !== b || a < 0 || a >= 1) ok = false; }
  check(ok, 'mulberry32 deterministic, [0,1)');

  section('matchHint');
  var m = BRAIN.matchHint('모자의 역사');
  check(m.kind === 'node' && m.nodeId === 'hat', "'모자의 역사' → hat (got " + JSON.stringify(m) + ')');
  check(['exact', 'alias', 'token'].indexOf(m.how) >= 0, 'how is exact|alias|token');
  check(BRAIN.matchHint('모자').how === 'exact', "'모자' → exact");
  check(BRAIN.matchHint('깃펜').nodeId === 'feather' && BRAIN.matchHint('깃펜').how === 'alias', "'깃펜' → feather via keyword (alias)");
  check(BRAIN.matchHint('https://example.org/x').kind === 'url', 'url kind');
  check(BRAIN.matchHint('').kind === 'none' && BRAIN.matchHint('   ').kind === 'none', 'empty → none');
  check(BRAIN.matchHint('양자역학').kind === 'wiki' && BRAIN.matchHint('양자역학').query === '양자역학', 'no match → wiki query');
  check(BRAIN.matchHint('구름이 많은 날').nodeId === 'cloud_names', "particle strip: '구름이' → 구름 → cloud_names");
  check(BRAIN.matchHint('HAT').kind === 'wiki' || BRAIN.matchHint('HAT').kind === 'node', 'uppercase does not crash');
  check(BRAIN.tokenize('종이와 잉크').indexOf('종이') >= 0, "tokenize keeps '종이' (strip only if ≥2 chars remain)");
  check(BRAIN.nodeFromUrl('https://en.wikipedia.org/wiki/Feather_(bird)') && BRAIN.nodeFromUrl('https://en.wikipedia.org/wiki/Feather_(bird)').id === 'feather', 'nodeFromUrl english slug');
  check(BRAIN.nodeFromUrl('https://ko.wikipedia.org/wiki/%EB%AA%A8%EC%9E%90') && BRAIN.nodeFromUrl('https://ko.wikipedia.org/wiki/%EB%AA%A8%EC%9E%90').id === 'hat', 'nodeFromUrl encoded korean');

  section('composeLine');
  var l = BRAIN.composeLine('followedThenLeft', { hint: '모자', mem: '깃털', memory: 'x' }, 0.1);
  check(l === '모자 보러 갔다가 깃털에 한눈팔았어', 'template substitution (' + l + ')');
  check(!hasBrace(BRAIN.composeLine('noHint', { mem: '깃털' }, 0.1)), 'missing {memory} removed');
  check(!hasBrace(BRAIN.composeLine('nonexistent_kind', {}, 0.5)), 'unknown kind falls back');
  check(BRAIN.composeLine('ignored', { hint: '모자', mem: '왕관' }, 0.1) === '모자는 다음에. 오늘은 왕관이 궁금했어', 'josa: 왕관이 / 모자는 (' + BRAIN.composeLine('ignored', { hint: '모자', mem: '왕관' }, 0.1) + ')');
  check(BRAIN.composeLine('ignored', { hint: '구름', mem: '조개' }, 0.1) === '구름은 다음에. 오늘은 조개가 궁금했어', 'josa: 구름은 / 조개가');
  check(BRAIN.composeLine('failed', { mem: 'Hat' }, 0.9) === 'Hat는 못 읽었어. 다음에 다시 가 볼래', 'josa: non-hangul keeps template particle');

  section('filterLinkTitle / parseWikiResponse');
  check(BRAIN.filterLinkTitle('베레모') && !BRAIN.filterLinkTitle('2010년') && !BRAIN.filterLinkTitle('모자 목록') && !BRAIN.filterLinkTitle('Hat')
    && !BRAIN.filterLinkTitle('분류:모자') && !BRAIN.filterLinkTitle('아주아주아주아주긴제목이야열셋') && !BRAIN.filterLinkTitle('위키백과'), 'link filter regex/length/hangul');
  var parsed = BRAIN.parseWikiResponse('모자', { query: { pages: { '1': { pageid: 1, title: '모자', extract: '모자는 머리에 쓰는 물건이다. 둘째.', thumbnail: { source: 'https://u/x.jpg', width: 480, height: 300 }, links: [{ ns: 0, title: '베레모' }, { ns: 0, title: '2010년' }] } } } });
  check(parsed.ok && parsed.extract.indexOf('모자는') === 0 && parsed.thumb.w === 480 && parsed.links.length === 1 && parsed.url === 'https://ko.wikipedia.org/wiki/%EB%AA%A8%EC%9E%90' && parsed.license === 'CC BY-SA 4.0' && parsed.attribution === 'Wikipedia (ko)', 'parse ok page');
  check(BRAIN.parseWikiResponse('x', { query: { pages: { '-1': { title: 'x', missing: '' } } } }).reason === 'missing', 'parse missing page');
  var longExtract = 'a'.repeat(300);
  check(BRAIN.parseWikiResponse('x', { query: { pages: { '2': { pageid: 2, title: 'x', extract: longExtract } } } }).extract.length === 160, 'extract trimmed to 160');

  section('wikiFetch (global fetch stubbed)');
  var realFetch = global.fetch;
  var seenUrl = null;
  global.fetch = function (url, opts) {
    seenUrl = url;
    if (url.indexOf('titles=%EB%AA%A8%EC%9E%90') >= 0) return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({ query: { pages: { '1': { pageid: 1, title: '모자', extract: '모자다.', links: [] } } } }); } });
    if (url.indexOf('titles=missing') >= 0) return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({ query: { pages: { '-1': { title: 'missing', missing: '' } } } }); } });
    if (url.indexOf('titles=http500') >= 0) return Promise.resolve({ ok: false, status: 500, json: function () { return Promise.resolve({}); } });
    if (url.indexOf('titles=hang') >= 0) return new Promise(function (_, reject) { opts.signal.addEventListener('abort', function () { var e = new Error('aborted'); e.name = 'AbortError'; reject(e); }); });
    return Promise.reject(new TypeError('network down'));
  };
  var wf = await BRAIN.wikiFetch('모자');
  check(wf.ok && wf.title === '모자' && wf.url === 'https://ko.wikipedia.org/wiki/%EB%AA%A8%EC%9E%90', 'wikiFetch ok');
  check(seenUrl.indexOf('https://ko.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1&prop=extracts|pageimages|links&exintro=1&explaintext=1&exsentences=2&piprop=thumbnail&pithumbsize=480&pllimit=50&plnamespace=0&titles=') === 0, 'wikiFetch URL shape (' + seenUrl + ')');
  check((await BRAIN.wikiFetch('missing')).reason === 'missing', 'wikiFetch missing');
  check((await BRAIN.wikiFetch('http500')).reason === 'network', 'wikiFetch http error → network');
  check((await BRAIN.wikiFetch('neterr')).reason === 'network', 'wikiFetch throw → network');
  var t0 = Date.now();
  var hung = await BRAIN.wikiFetch('hang', { timeoutMs: 60 });
  check(hung.reason === 'timeout' && Date.now() - t0 < 2000, 'wikiFetch timeout via AbortController');
  global.fetch = realFetch;
}

/* ───────── plan 테스트 (어떤 WORLD 로도) ───────── */
async function planSuite(label, W, hasHat) {
  section('plan — ' + label);
  global.WORLD = W;
  BRAIN.setWorld(null);
  var N = 200;
  var kinds = { out: 0, home: 0, empty: 0 };
  var stopCounts = {};
  var followedCount = { followed: 0, ignored: 0, left: 0, none: 0 };
  var sawWild = false, sawRead = false, sawBuiltin = false, sawFailed = false, sawFirst = false, sawSouvenir = false, sawThumb = false;
  var errors = [];
  fetchLog = []; maxInflight = 0;

  for (var seed = 1; seed <= N; seed++) {
    var inp = baseInput(seed, { hint: hasHat ? '모자의 역사' : '' });
    var a = await BRAIN.plan(inp);
    var b = await BRAIN.plan(baseInput(seed, { hint: hasHat ? '모자의 역사' : '' }));
    try { assert.deepStrictEqual(a.events, b.events); assert.deepStrictEqual(a.receipt, b.receipt); assert.deepStrictEqual(a.poster, b.poster); }
    catch (e) { errors.push('seed ' + seed + ' not deterministic: ' + e.message.slice(0, 200)); }
    kinds[a.kind]++;
    if (a.by !== 'demo') errors.push('by');
    if (a.seed !== seed) errors.push('seed echoed');
    allLines(a).forEach(function (s) { if (hasBrace(s)) errors.push('seed ' + seed + ' leftover { in: ' + s); });
    if (a.kind === 'out') {
      var n = a.receipt.stops.length;
      stopCounts[n] = (stopCounts[n] || 0) + 1;
      if (n < 2 || n > 5) errors.push('seed ' + seed + ' stops=' + n);
      var peeks = a.events.filter(function (e) { return e.type === 'peek'; });
      if (peeks.length !== n) errors.push('seed ' + seed + ' peeks != stops');
      if (a.events[0].type !== 'depart' || a.events[0].t !== 0) errors.push('seed ' + seed + ' first event depart t0');
      var types = a.events.map(function (e) { return e.type; });
      ['return', 'remember', 'hang_poster', 'wrap_up'].forEach(function (ty) { if (types.indexOf(ty) < 0) errors.push('seed ' + seed + ' missing ' + ty); });
      for (var k = 1; k < a.events.length; k++) if (!(a.events[k].t > a.events[k - 1].t)) errors.push('seed ' + seed + ' t not increasing');
      var ri = a.receipt.rememberedIdx;
      if (!(ri >= 0 && ri < n)) errors.push('seed ' + seed + ' rememberedIdx invalid ' + ri);
      var remEv = a.events.filter(function (e) { return e.type === 'remember'; })[0];
      if (remEv.stopIdx !== ri || remEv.line !== a.poster.line || remEv.sticker !== a.poster.sticker) errors.push('seed ' + seed + ' remember event mismatch');
      if (!a.poster || a.poster.type !== 'poster' || !a.poster.title || !a.poster.line) errors.push('seed ' + seed + ' poster incomplete');
      var remStatus = a.receipt.stops[ri].status;
      if ((remStatus === 'failed' || remStatus === 'simulated' || remStatus === 'none') && READ_CLAIM.test(a.poster.line)) errors.push('seed ' + seed + ' line claims a read that did not happen: ' + a.poster.line);
      var sp = a.poster.stickerPos;
      if (!(sp.x >= 58 && sp.x <= 82 && sp.y >= 18 && sp.y <= 40 && sp.rot >= -14 && sp.rot <= 14)) errors.push('seed ' + seed + ' stickerPos range');
      if ([0, 1, 2].indexOf(a.poster.paper) < 0) errors.push('seed ' + seed + ' paper');
      if (a.poster.thumb && a.receipt.stops[ri].status !== 'read') errors.push('seed ' + seed + ' thumb without read');
      if (a.poster.thumb) sawThumb = true;
      var sum = 0; Object.keys(a.receipt.counts).forEach(function (c) { sum += a.receipt.counts[c]; });
      if (sum !== n) errors.push('seed ' + seed + ' counts sum');
      if (BRAIN.REACTIONS.indexOf(a.reaction) < 0 || a.receipt.reaction !== a.reaction) errors.push('seed ' + seed + ' reaction');
      var wrap = a.events[a.events.length - 1];
      if (wrap.type !== 'wrap_up' || wrap.reaction !== a.reaction) errors.push('seed ' + seed + ' wrap_up last');
      followedCount[a.hint.followed] = (followedCount[a.hint.followed] || 0) + 1;
      a.receipt.stops.forEach(function (s, i) {
        if (BRAIN.STATUSES.indexOf(s.status) < 0) errors.push('seed ' + seed + ' bad status ' + s.status);
        if (!(s.ms >= 4000 && s.ms <= 14000)) errors.push('seed ' + seed + ' ms range');
        if (s.idx !== i) errors.push('seed ' + seed + ' idx');
        if (s.status === 'read' && !(s.source && s.source.url && s.source.extract)) errors.push('seed ' + seed + ' read without source');
        if (s.status !== 'read' && s.source) errors.push('seed ' + seed + ' source without read');
        if (s.status === 'read') sawRead = true;
        if (s.status === 'builtin') sawBuiltin = true;
        if (s.status === 'failed') sawFailed = true;
        if (s.first) sawFirst = true;
        if (s.wild) sawWild = true;
        if (s.wild && i !== n - 1 && !(hasHat === false)) { /* 들판은 마지막 (힌트가 wiki 일 때만 첫 자리) */ }
        if (s.nodeId && W.nodes[s.nodeId] && !s.wild) {
          var nd = W.nodes[s.nodeId];
          if (nd.id === 'slow_room' || nd.id === 'letter_room' || nd.linger) { if (s.status !== 'none') errors.push('seed ' + seed + ' special node status ' + s.status); }
          else if (s.status === 'none') errors.push('seed ' + seed + ' none on normal node');
          if (s.status === 'builtin' && s.note !== nd.clue) errors.push('seed ' + seed + ' builtin note != clue');
        }
      });
      if (a.receipt.souvenir) {
        sawSouvenir = true;
        var okSv = a.receipt.stops.some(function (s) { return s.first && s.nodeId && W.nodes[s.nodeId] && W.nodes[s.nodeId].souvenir === a.receipt.souvenir; });
        if (!okSv) errors.push('seed ' + seed + ' souvenir not from a first-visit stop');
      }
      // 변화량
      a.receipt.stops.forEach(function (s) { if (s.nodeId && !s.wild && a.visitsDelta[s.nodeId] !== 1) errors.push('seed ' + seed + ' visitsDelta ' + s.nodeId); });
      var remStop = a.receipt.stops[ri];
      if (!s_wildOrDoor(remStop) && !(a.affinityDelta[remStop.corner] >= 3)) errors.push('seed ' + seed + ' remembered corner affinity +2');
      // 힌트 → 첫 정류장 hat
      if (hasHat) {
        if (a.hint.match.kind !== 'node' || a.hint.match.nodeId !== 'hat') errors.push('seed ' + seed + ' hint should match hat');
        if (a.hint.followed !== 'ignored') {
          if (a.receipt.stops[0].nodeId !== 'hat') errors.push('seed ' + seed + ' followed=' + a.hint.followed + ' but first stop ' + a.receipt.stops[0].nodeId);
          if (a.events[0].followHint !== true) errors.push('seed ' + seed + ' depart.followHint');
        } else {
          if (a.receipt.stops[0].nodeId === 'hat' && a.receipt.stops[0].first) { /* 우연히 hat 에서 출발할 수도 있음 */ }
          if (a.events[0].followHint !== false || !a.hint.note) errors.push('seed ' + seed + ' ignored hint should have note + followHint false');
        }
        if (a.hint.followed === 'followed') {
          var hc = W.nodes.hat.corner;
          if (!a.receipt.stops.every(function (s) { return s.corner === hc; })) errors.push('seed ' + seed + " 'followed' but left corner");
        }
        if (a.hint.followed === 'left' && a.receipt.stops.every(function (s) { return s.corner === W.nodes.hat.corner; })) errors.push('seed ' + seed + " 'left' but stayed");
      }
    } else if (a.kind === 'home') {
      if (a.events.length !== 2 || a.events[0].type !== 'stay_home' || a.events[1].type !== 'wrap_up') errors.push('seed ' + seed + ' home events');
      if (!a.poster || a.poster.type !== 'note' || !a.poster.line) errors.push('seed ' + seed + ' note poster');
      if (a.reaction !== '졸림') errors.push('seed ' + seed + ' home reaction');
      if (a.events[0].activity === 'nothing') errors.push('seed ' + seed + " home picked 'nothing' (should be empty turn)");
      if (/미안|못 나가|아쉽/.test(a.poster.line + (a.poster.detail || ''))) errors.push('seed ' + seed + ' guilt-trip wording');
      if (Object.keys(a.visitsDelta).length || Object.keys(a.affinityDelta).length) errors.push('seed ' + seed + ' home deltas should be empty');
    } else if (a.kind === 'empty') {
      if (a.events.length !== 1 || a.events[0].type !== 'empty_turn' || a.poster !== null || a.receipt !== null) errors.push('seed ' + seed + ' empty shape');
    } else errors.push('seed ' + seed + ' unknown kind ' + a.kind);
  }
  function s_wildOrDoor(s) { return s.wild || s.nodeId === 'door_out'; }

  var homeRate = (kinds.home + kinds.empty) / N;
  console.log('  kinds', JSON.stringify(kinds), 'home rate', homeRate.toFixed(3), 'stops', JSON.stringify(stopCounts), 'followed', JSON.stringify(followedCount));
  console.log('  saw: read', sawRead, 'builtin', sawBuiltin, 'failed', sawFailed, 'first', sawFirst, 'wild', sawWild, 'souvenir', sawSouvenir, 'thumb', sawThumb, '| max inflight', maxInflight);
  check(errors.length === 0, errors.length + ' plan errors; first: ' + errors.slice(0, 8).join(' | '));
  check(homeRate >= 0.08 && homeRate <= 0.45, 'home rate in [8%,45%] (' + homeRate + ')');
  check(kinds.out >= N * 0.5, 'most trips go out');
  check(Object.keys(stopCounts).every(function (k) { return +k >= 2 && +k <= 5; }), 'stop count 2..5');
  check(Object.keys(stopCounts).length >= 3, 'stop count varies');
  check(sawRead && sawBuiltin, 'both read and builtin statuses appear');
  check(sawFirst, 'first-visit flag appears');
  check(sawWild, 'wild hop happened at least once when online');
  check(maxInflight <= 2, 'fetch concurrency ≤ 2 (' + maxInflight + ')');
  if (hasHat) {
    var outN = kinds.out;
    var ign = followedCount.ignored / outN;
    check(ign > 0.08 && ign < 0.45, 'hint ignored rate ~25% (' + ign.toFixed(3) + ')');
    check(followedCount.followed + followedCount.left > 0, 'hint followed sometimes');
  }

  /* 오프라인: wild 금지, read 금지, 길은 온라인과 같다 */
  section('plan offline — ' + label);
  var offErrors = [];
  fetchLog = [];
  for (seed = 1; seed <= 60; seed++) {
    var on = await BRAIN.plan(baseInput(seed, { hint: hasHat ? '모자의 역사' : '', online: true }));
    var off = await BRAIN.plan(baseInput(seed, { hint: hasHat ? '모자의 역사' : '', online: false }));
    if (off.kind !== on.kind) offErrors.push('seed ' + seed + ' kind differs offline');
    if (off.kind !== 'out') continue;
    off.receipt.stops.forEach(function (s) {
      if (s.wild) offErrors.push('seed ' + seed + ' wild while offline');
      if (s.status === 'read') offErrors.push('seed ' + seed + ' read while offline');
      if (s.nodeId && !['door_out', 'slow_room', 'letter_room'].includes(s.nodeId) && !W.nodes[s.nodeId].linger && s.status !== 'builtin' && s.status !== 'failed') offErrors.push('seed ' + seed + ' offline status ' + s.status);
    });
    var onLib = on.receipt.stops.filter(function (s) { return !s.wild; }).map(function (s) { return s.nodeId; });
    var offLib = off.receipt.stops.map(function (s) { return s.nodeId; });
    if (JSON.stringify(onLib) !== JSON.stringify(offLib)) offErrors.push('seed ' + seed + ' route differs online/offline ' + onLib + ' vs ' + offLib);
  }
  check(offErrors.length === 0, offErrors.length + ' offline errors; first: ' + offErrors.slice(0, 5).join(' | '));
  check(fetchLog.length > 0, 'online runs fetched');

  /* 밤 + 피곤 + 오늘 2번 → pStay 상한 0.6 근처 */
  section('stay probability — ' + label);
  var st = { visits: {}, affinity: {}, lantern: 3, recent: [{ kind: 'out', nStops: 4 }, { kind: 'out', nStops: 5 }], todayOut: 2 };
  check(Math.abs(BRAIN.stayProbability(st, 2) - 0.6) < 1e-9, 'pStay capped at 0.6');
  check(Math.abs(BRAIN.stayProbability({ visits: {}, affinity: {}, recent: [], todayOut: 0 }, 14) - 0.12) < 1e-9, 'pStay base 0.12');
  check(Math.abs(BRAIN.stayProbability({ visits: {}, affinity: {}, recent: [], todayOut: 0 }, 3) - 0.32) < 1e-9, 'pStay night +0.20');
  var nightHome = 0;
  for (seed = 1; seed <= 200; seed++) { var nt = await BRAIN.plan(baseInput(seed, { now: NOW_NIGHT, state: st })); if (nt.kind !== 'out') nightHome++; }
  check(nightHome / 200 > 0.45 && nightHome / 200 < 0.75, 'tired night home rate near 0.6 (' + nightHome / 200 + ')');

  /* 빈 힌트 = 네가 골라 */
  section('empty hint — ' + label);
  var ne = 0;
  for (seed = 1; seed <= 40; seed++) {
    var e = await BRAIN.plan(baseInput(seed, { hint: '' }));
    if (e.hint.followed !== 'none' || e.hint.match.kind !== 'none') ne++;
    if (e.kind === 'out' && e.events[0].followHint !== false) ne++;
  }
  check(ne === 0, 'empty hint → followed none, followHint false');

  /* URL 힌트 */
  section('url hint — ' + label);
  var ue = 0, urlOut = 0;
  for (seed = 1; seed <= 60; seed++) {
    var u = await BRAIN.plan(baseInput(seed, { hint: 'https://example.org/feather/2020' }));
    if (u.kind !== 'out') continue;
    urlOut++;
    var s0 = u.receipt.stops[0];
    if (s0.nodeId !== 'door_out' || s0.status !== 'simulated' || s0.note.indexOf('정적 페이지라') < 0) ue++;
    var ev0 = u.events.filter(function (x) { return x.type === 'peek'; })[0];
    if (!ev0 || ev0.target.kind !== 'url' || ev0.target.url !== 'https://example.org/feather/2020') ue++;
    if (u.receipt.stops.length < 2) ue++;
    if (W.nodes.feather && u.receipt.stops[1].nodeId !== 'feather') ue++;
    if (u.hint.match.kind !== 'url') ue++;
    if (u.receipt.counts.simulated !== 1) ue++;
  }
  check(urlOut > 0 && ue === 0, 'url hint → door_out simulated, then feather (' + ue + ' errors)');

  /* wiki 힌트(매칭 실패) */
  section('wiki hint — ' + label);
  var we = 0, wikiFirst = 0, wikiOut = 0;
  var WQ = ['우산', '쿼카'].filter(function (q) { return BRAIN.matchHint(q).kind === 'wiki'; })[0];
  check(!!WQ, 'found an unmatched query for this WORLD (' + WQ + ')');
  for (seed = 1; seed <= 80; seed++) {
    var wk = await BRAIN.plan(baseInput(seed, { hint: WQ }));
    if (wk.kind !== 'out') continue;
    wikiOut++;
    if (wk.hint.match.kind !== 'wiki') we++;
    if (wk.hint.followed === 'followed' || wk.hint.followed === 'left') {
      var f0 = wk.receipt.stops[0];
      if (!f0.wild || f0.title !== WQ || f0.status !== 'read') we++;
      wikiFirst++;
    } else if (wk.hint.followed !== 'ignored') we++;
    var wkOff = await BRAIN.plan(baseInput(seed, { hint: WQ, online: false }));
    if (wkOff.kind === 'out' && (wkOff.hint.followed !== 'none' || wkOff.receipt.stops.some(function (s) { return s.wild; }))) we++;
  }
  check(wikiOut > 0 && wikiFirst > 0 && we === 0, 'unmatched hint → wild first stop when online, none when offline (' + we + ' errors)');
  var fe = 0, failedSeen = 0;
  for (seed = 1; seed <= 80; seed++) {
    var fm = await BRAIN.plan(baseInput(seed, { hint: '아무도모르는제목' }));
    if (fm.kind !== 'out' || fm.hint.followed === 'ignored') continue;
    var f0b = fm.receipt.stops[0];
    if (!f0b.wild || f0b.status !== 'failed' || f0b.source) fe++;
    failedSeen++;
    if (fm.receipt.rememberedIdx === 0 && READ_CLAIM.test(fm.poster.line)) fe++;
    if (fm.receipt.counts.failed < 1) fe++;
  }
  check(failedSeen > 0 && fe === 0, 'unmatched hint missing on wiki → failed stop, honest line (' + fe + ' errors)');

  /* 타임아웃 */
  section('fetch timeout — ' + label);
  var hangW = Object.assign({}, W, { nodes: Object.assign({}, W.nodes) });
  var hatId = hasHat ? 'hat' : Object.keys(W.nodes).filter(function (id) { return W.nodes[id].wiki; })[0];
  hangW.nodes[hatId] = Object.assign({}, W.nodes[hatId], { wiki: '__hang__' });
  global.WORLD = hangW;
  var tt0 = Date.now();
  var hungTrip = null;
  for (seed = 1; seed <= 30 && !hungTrip; seed++) {
    var ht = await BRAIN.plan(baseInput(seed, { hint: W.nodes[hatId].name, fetchTimeoutMs: 40 }));
    if (ht.kind === 'out' && ht.receipt.stops.some(function (s) { return s.nodeId === hatId; })) hungTrip = ht;
  }
  global.WORLD = W;
  var hs = hungTrip && hungTrip.receipt.stops.filter(function (s) { return s.nodeId === hatId; })[0];
  check(hs && hs.status === 'builtin' && hs.reason === 'timeout' && Date.now() - tt0 < 3000, 'hanging fetch → timeout → builtin (' + (hs && hs.status + '/' + hs.reason) + ')');

  /* replay */
  section('replay — ' + label);
  var src = null;
  for (seed = 1; seed <= 50 && !src; seed++) { var c = await BRAIN.plan(baseInput(seed, { hint: hasHat ? '모자의 역사' : '' })); if (c.kind === 'out') src = c; }
  var rp = BRAIN.replay(JSON.parse(JSON.stringify(src.events)), { by: 'human', state: { visits: {}, affinity: {} }, now: NOW_DAY });
  check(rp.kind === 'out' && rp.by === 'human', 'replay kind/by');
  check(rp.receipt.stops.length === src.receipt.stops.length, 'replay stop count');
  check(rp.receipt.rememberedIdx === src.receipt.rememberedIdx && rp.poster.line === src.poster.line && rp.poster.sticker === src.poster.sticker, 'replay keeps remember/line/sticker');
  check(rp.reaction === src.reaction, 'replay keeps reaction');
  check(JSON.stringify(rp.receipt.stops.map(function (s) { return s.status; })) === JSON.stringify(src.receipt.stops.map(function (s) { return s.status; })), 'replay keeps statuses');
  check(rp.hint.followed === src.hint.followed, 'replay recomputes followed (' + rp.hint.followed + ' vs ' + src.hint.followed + ')');
  var rp2 = BRAIN.replay(JSON.parse(JSON.stringify(src.events)), { by: 'human', state: { visits: {}, affinity: {} }, now: NOW_DAY });
  check(JSON.stringify(rp2.poster) === JSON.stringify(rp.poster), 'replay deterministic');
  // 사람이 만든 성의 없는 이벤트: 모르는 id, 필드 누락
  var sloppy = [
    { type: 'depart', hint: '' },
    { type: 'peek', target: { id: 'nope_unknown', title: '모르는 방' } },
    { type: 'peek', target: { kind: 'room', id: Object.keys(W.nodes).filter(function (id) { return W.nodes[id].clue; })[0] } },
    { type: 'peek', target: { kind: 'url', url: 'https://example.org' } },
    { type: 'return' },
    { type: 'hang_poster' },
    { type: 'wrap_up', reaction: '이상한값' }
  ];
  var sl = BRAIN.replay(sloppy, { by: 'mcp' });
  check(sl.kind === 'out' && sl.by === 'mcp' && sl.receipt.stops.length === 3, 'sloppy replay shape');
  check(sl.receipt.stops[0].wild && sl.receipt.stops[0].title === '모르는 방' && sl.receipt.stops[0].status !== 'read', 'unknown id → wild, not claimed read');
  check(sl.receipt.stops[1].status === 'builtin', 'known node w/o status → builtin');
  check(sl.receipt.stops[2].status === 'simulated', 'url → simulated');
  check(sl.receipt.rememberedIdx >= 0 && sl.poster && !hasBrace(sl.poster.line), 'sloppy replay picks a memory and composes a line');
  check(BRAIN.REACTIONS.indexOf(sl.reaction) >= 0, 'invalid reaction replaced');
  var homeRp = BRAIN.replay([{ type: 'stay_home', t: 0, activity: 'nap' }, { type: 'wrap_up', t: 2000, reaction: '졸림' }], { by: 'human' });
  var napLine = ((W.homeActivities || []).filter(function (a) { return a.id === 'nap'; })[0] || { line: '담요 속에서 낮잠' }).line;
  check(homeRp.kind === 'home' && homeRp.poster.type === 'note' && homeRp.poster.line === napLine && homeRp.receipt.activity.id === 'nap', 'home replay (' + homeRp.poster.line + ')');
  var emptyRp = BRAIN.replay([{ type: 'empty_turn', t: 0 }], { by: 'human' });
  check(emptyRp.kind === 'empty' && emptyRp.poster === null && emptyRp.receipt === null, 'empty replay');

  /* pickStart 취향 */
  section('pickStart — ' + label);
  var seaNodes = Object.keys(W.nodes).filter(function (id) { return W.nodes[id].corner === 'sea'; });
  if (seaNodes.length) {
    var seaHits = 0, R = BRAIN.rng(7);
    for (var q = 0; q < 300; q++) { var sid = BRAIN.pickStart({ visits: {}, affinity: { sea: 9 } }, R); if (seaNodes.indexOf(sid) >= 0) seaHits++; }
    check(seaHits / 300 > 0.55, 'top-affinity corner picked ≥55% (' + (seaHits / 300).toFixed(2) + ')');
  }
  var R2 = BRAIN.rng(9), specialHits = 0;
  for (q = 0; q < 300; q++) { var pid = BRAIN.pickStart({ visits: {}, affinity: {} }, R2); if (['door_out', 'slow_room', 'letter_room'].indexOf(pid) >= 0 || !pid) specialHits++; }
  check(specialHits === 0, 'pickStart never starts in special rooms');
}

/* ───────── main ───────── */
(async function main() {
  try {
    var W = fakeWorld();
    global.WORLD = W;
    await unitTests();
    await planSuite('fake WORLD', W, true);

    var worldFile = path.join(ROOT, 'js/world.js');
    if (fs.existsSync(worldFile)) {
      delete global.WORLD;
      try {
        loadScript(worldFile);
        var RW = global.WORLD;
        if (RW && RW.nodes && Object.keys(RW.nodes).length) {
          var hasHat = !!(RW.nodes.hat && BRAIN.matchHint.call(null, '모자의 역사').kind === 'node');
          global.WORLD = RW;
          hasHat = !!(RW.nodes.hat && BRAIN.matchHint('모자의 역사').nodeId === 'hat');
          await planSuite('real js/world.js (' + Object.keys(RW.nodes).length + ' nodes)', RW, hasHat);
        } else console.log('\n(js/world.js loaded but WORLD.nodes empty — skipped)');
      } catch (e) { console.log('\n(js/world.js could not be loaded: ' + e.message + ' — skipped)'); failures++; }
    } else console.log('\n(js/world.js not present yet — only fake WORLD run)');
  } catch (e) {
    failures++;
    console.error('UNCAUGHT', e && e.stack || e);
  }
  Math.random = realMathRandom;
  console.log('\n' + passes + ' passed, ' + failures + ' failed');
  process.exit(failures ? 1 : 0);
})();
