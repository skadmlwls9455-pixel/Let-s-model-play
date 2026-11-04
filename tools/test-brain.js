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
      '폴짝': { emoji: '🎉', lines: ['모르는 데로 한 발!'], when: { first: ['처음 보는 게 있었어!'] } }, '우쭐': { emoji: '😌', lines: ['끝까지 봤다구'] },
      '덤덤': { emoji: '😶', lines: ['그냥 그랬어'], when: { missed: ['못 읽은 데도 있었어'] } }, '졸림': { emoji: '😴', lines: ['졸려…'], when: { long: ['많이 걸었어'] } }
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

  /* ── 버그 사냥 회귀 (데이터와 무관한 작은 세계로) ── */
  section('matchHint / nodeFromUrl — word matching (bug hunt #4 #5 #7)');
  function mini(id, name, o) { return Object.assign({ id: id, name: name, corner: 'c', aliases: [], keywords: [], wiki: name }, o || {}); }
  BRAIN.setWorld({ corners: { c: {} }, nodes: {
    stamp: mini('stamp', '우표', { keywords: ['편지', '먹물'] }),           /* 키워드가 파일 앞쪽에 */
    letter: mini('letter', '편지함', { aliases: ['편지'] }),               /* 별칭은 뒤쪽 */
    ink: mini('ink', '잉크', { aliases: ['먹물'] }),
    morse: mini('morse', '모스 부호', { aliases: ['모스', '노트'] }),
    rain: mini('rain', '비', { keywords: ['rain'] }), snow: mini('snow', '눈'), bell: mini('bell', '종'), tea: mini('tea', '차', { aliases: ['tea'] }),
    hat: mini('hat', '모자'), cloud: mini('cloud', '구름 이름', { aliases: ['구름'] })
  } });
  check(BRAIN.matchHint('편지').nodeId === 'letter', "#5 alias beats keyword: '편지' → letter (" + BRAIN.matchHint('편지').nodeId + ')');
  check(BRAIN.matchHint('먹물').nodeId === 'ink', "#5 '먹물' → ink alias, not stamp keyword");
  check(BRAIN.matchHint('편지 쓰기').nodeId === 'letter', "#5 token: alias beats keyword");
  check(BRAIN.matchHint('비 오는 날').nodeId === 'rain' && BRAIN.matchHint('눈 오는 밤').nodeId === 'snow' && BRAIN.matchHint('차 한 잔').nodeId === 'tea', '#4 one-syllable room names match inside a phrase');
  check(BRAIN.matchHint('비가 와').nodeId === 'rain' && BRAIN.matchHint('눈이 펑펑').nodeId === 'snow', '#4 one-syllable name + matching particle');
  check(BRAIN.matchHint('종이').kind === 'wiki' && BRAIN.matchHint('차이').kind === 'wiki' && BRAIN.matchHint('종이접기').kind === 'wiki', "#4 '종이'/'차이' are not 종/차 + particle");
  check(BRAIN.matchHint('코스모스').kind === 'wiki', "#7 '코스모스' does not match 모스 (mid-word)");
  check(BRAIN.matchHint('노트북').kind === 'wiki', "#7 '노트북' does not match alias 노트 (prefix + one syllable)");
  check(BRAIN.matchHint('구름사진').nodeId === 'cloud' && BRAIN.matchHint('모자가게').nodeId === 'hat' && BRAIN.matchHint('모자의 역사').nodeId === 'hat', '#7 compounds/particles still match (구름사진, 모자가게, 모자의 역사)');
  check(BRAIN.matchHint('rainbow').kind === 'wiki' && BRAIN.matchHint('rain check').nodeId === 'rain', '#7 ascii keyword only as a whole word');
  check(BRAIN.nodeFromUrl('https://www.linkedin.com/in/someone') === null, '#7 linkedin ≠ ink');
  check(BRAIN.nodeFromUrl('https://teams.microsoft.com/x') === null && BRAIN.nodeFromUrl('https://chat.openai.com/') === null && BRAIN.nodeFromUrl('https://www.trainline.com/') === null, '#7 teams≠tea, chat≠hat, trainline≠rain');
  check((BRAIN.nodeFromUrl('https://example.org/tea-time') || {}).id === 'tea' && (BRAIN.nodeFromUrl('https://example.org/hat') || {}).id === 'hat', '#7 url words still match (tea-time, /hat)');
  check(BRAIN.nodeFromUrl('https://ko.wikipedia.org/wiki/' + encodeURIComponent('코스모스')) === null && (BRAIN.nodeFromUrl('https://ko.wikipedia.org/wiki/' + encodeURIComponent('모자의_역사')) || {}).id === 'hat', '#7 url: 코스모스 ≠ 모스, 모자의_역사 = 모자');
  BRAIN.setWorld(null);

  section('computeReaction — wild stops (bug hunt #6/#42)');
  check(BRAIN.computeReaction([{ kind: 'wild', status: 'failed', first: false }, { kind: 'room', status: 'builtin', first: false }], 'left', 14, false) !== '폴짝', 'failed wild stop alone is not 폴짝');
  check(BRAIN.computeReaction([{ kind: 'wild', status: 'read', first: false }, { kind: 'room', status: 'builtin', first: false }], 'none', 14, false) === '폴짝', 'read wild stop → 폴짝');
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

  await memoSuite(label, W, hasHat);
  await huntSuite(label, W);
}

/* ───────── 버그 사냥 회귀: 정직 표기 (어떤 WORLD 로도) ───────── */
var WIKI_PAGE_RE = /^https:\/\/ko\.wikipedia\.org\/wiki\/\S+$/;
async function huntSuite(label, W) {
  var allVisited = {}; Object.keys(W.nodes).forEach(function (k) { allVisited[k] = 3; });
  var okAll = function (t) { return Promise.resolve({ ok: true, title: t, extract: t + '는 무엇이다. 둘째 문장.', url: 'https://ko.wikipedia.org/wiki/' + encodeURIComponent(t), thumb: null, links: ['베레모', '깃털', '단추', '조개'] }); };
  var failAll = function () { return Promise.resolve({ ok: false, reason: 'missing' }); };
  var seed, t, errs;

  /* #1/#12/#38 집 활동: 등불·포스터가 실제로 있을 때만 */
  section('home activities need what is in the room (#1) — ' + label);
  function reqOk(a, lantern, posters) {
    if (!a) return false;
    if (typeof a.minLantern === 'number' && lantern < a.minLantern) return false;
    if (typeof a.requiresLantern === 'number' && lantern < a.requiresLantern) return false;
    if (a.requiresPoster && posters < (a.effect === 'rotatePosters' ? 2 : 1)) return false;
    return true;
  }
  function actOf(id) { return (W.homeActivities || []).filter(function (a) { return a.id === id; })[0]; }
  global.__ppolTest = { forceKind: 'home' };
  errs = [];
  var seenAct = { p0: {}, p1: {}, p3: {} };
  for (seed = 1; seed <= 150; seed++) {
    var cases = [{ lantern: 0, posters: undefined, k: 'p0' }, { lantern: 8, posters: 1, k: 'p1' }, { lantern: 8, posters: 3, k: 'p3' }, { lantern: 8, posters: 'x', k: 'p0' }];
    for (var ci = 0; ci < cases.length; ci++) {
      var c = cases[ci];
      var st = { visits: {}, affinity: {}, lantern: c.lantern, recent: [], todayOut: 0 };
      if (c.posters !== undefined) st.posters = c.posters;
      t = await BRAIN.plan(baseInput(seed, { state: st }));
      var id = t.receipt.activity.id, a = actOf(id);
      var np = typeof c.posters === 'number' ? c.posters : 0;
      if (a && !reqOk(a, c.lantern, np)) errs.push('seed ' + seed + ' lantern ' + c.lantern + ' posters ' + c.posters + ' → ' + id);
      if (seenAct[c.k]) seenAct[c.k][id] = 1;
    }
  }
  delete global.__ppolTest;
  check(errs.length === 0, 'home activity always fits lantern/posters (' + errs.length + ' errors)' + (errs.length ? ' e.g. ' + errs.slice(0, 3).join(' | ') : ''));
  var posterActs = (W.homeActivities || []).filter(function (a) { return a.requiresPoster; });
  if (posterActs.length) {
    check(!Object.keys(seenAct.p0).some(function (id) { return actOf(id) && actOf(id).requiresPoster; }), 'no posters (missing/0/invalid) → no poster activity (' + Object.keys(seenAct.p0).join(',') + ')');
    var rot = posterActs.filter(function (a) { return a.effect === 'rotatePosters'; })[0];
    if (rot) {
      check(!seenAct.p1[rot.id], 'one poster → no ' + rot.id + ' (needs two to swap)');
      check(!!seenAct.p3[rot.id], 'three posters → ' + rot.id + ' can happen');
    }
    check(posterActs.some(function (a) { return seenAct.p1[a.id]; }), 'one poster → a poster activity can happen');
  }

  /* #2 무시한 힌트 방은 길에 없다 */
  section('ignored node hint stays out of the route (#2) — ' + label);
  var hintId = W.nodes.hat ? 'hat' : Object.keys(W.nodes).filter(function (id) { return W.nodes[id].wiki && !W.nodes[id].linger && id !== 'door_out'; })[0];
  var hintName = W.nodes[hintId].name, hintCorner = W.nodes[hintId].corner;
  var aff = {}; aff[hintCorner] = 5;
  var ign = 0; errs = [];
  for (seed = 1; seed <= 300; seed++) {
    t = await BRAIN.plan(baseInput(seed, { hint: hintName, online: false, state: { visits: {}, affinity: aff, lantern: 1, recent: [], todayOut: 0 } }));
    if (t.kind !== 'out' || t.hint.followed !== 'ignored') continue;
    ign++;
    if (t.receipt.stops.some(function (s) { return s.nodeId === hintId; })) errs.push('seed ' + seed + ' ignored but visited ' + hintId + ': ' + t.receipt.stops.map(function (s) { return s.name; }).join(','));
    if (t.poster.line.indexOf(hintName + ' 말고 ' + hintName) >= 0 || (t.memo && t.memo.tomorrow.indexOf(hintName + ' 대신 ' + hintName) >= 0)) errs.push('seed ' + seed + ' contradiction: ' + t.poster.line);
  }
  check(ign > 10 && errs.length === 0, 'ignored ' + hintName + ' never walks into ' + hintId + ' (' + ign + ' ignored trips, ' + errs.length + ' errors)' + (errs.length ? ' e.g. ' + errs[0] : ''));
  var R1 = BRAIN.rng(5), R2 = BRAIN.rng(5), sameNoAvoid = true, avoided = true;
  for (var q = 0; q < 300; q++) {
    if (BRAIN.pickStart({ visits: {}, affinity: aff }, R1) !== BRAIN.pickStart({ visits: {}, affinity: aff }, R2, '__nope__')) sameNoAvoid = false;
  }
  var R3 = BRAIN.rng(6);
  for (q = 0; q < 300; q++) if (BRAIN.pickStart({ visits: {}, affinity: aff }, R3, hintId) === hintId) avoided = false;
  check(sameNoAvoid && avoided, 'pickStart avoid: never returns the avoided room; unknown avoid id changes nothing');
  var contra = BRAIN.replay([{ type: 'depart', t: 0, hint: hintName, followHint: false }, { type: 'peek', t: 1, target: { kind: 'room', id: hintId } },
    { type: 'return', t: 2 }, { type: 'remember', t: 3, stopIdx: 0 }, { type: 'wrap_up', t: 4, reaction: '덤덤' }], { by: 'mcp', now: NOW_DAY });
  check(contra.hint.followed !== 'ignored' && !contra.hint.note && contra.poster.line.indexOf(hintName + ' 말고') < 0, 'replay: followHint false but went there → not "ignored" (' + contra.hint.followed + ' · ' + contra.poster.line + ')');

  /* #3/#41 반응 한 줄은 실제로 있었던 일만 */
  section('reaction lines match what happened (#3/#41) — ' + label);
  errs = [];
  global.__ppolTest = { forceKind: 'home' };
  for (seed = 1; seed <= 80; seed++) {
    t = await BRAIN.plan(baseInput(seed, { state: { visits: {}, affinity: {}, lantern: 3, recent: [], todayOut: 0 } }));
    if (/걸었|다녀왔|갔다 왔|산책|처음|못 읽/.test(t.receipt.reactionLine || '')) errs.push('home seed ' + seed + ': ' + t.receipt.reactionLine);
  }
  delete global.__ppolTest;
  function lineErr(tr, tag) {
    var ln = tr.receipt.reactionLine || '', c = tr.receipt.counts;
    if (/못 읽은/.test(ln) && !(c.failed + c.simulated > 0)) return tag + ' says missed but nothing failed: ' + ln;
    if (/처음/.test(ln) && !tr.receipt.stops.some(function (s) { return s.first; })) return tag + ' says first but no first stop: ' + ln;
    if (/많이 걸었/.test(ln) && tr.receipt.stops.length < 4) return tag + ' says walked a lot with ' + tr.receipt.stops.length + ' stops: ' + ln;
    return null;
  }
  var outN = 0;
  for (seed = 1; seed <= 200; seed++) {
    var variants = [
      baseInput(seed, { state: { visits: allVisited, affinity: {}, lantern: 8, recent: [], todayOut: 0 }, fetchWiki: okAll }),
      baseInput(seed, { now: NOW_NIGHT, state: { visits: allVisited, affinity: {}, lantern: 3, recent: [], todayOut: 0 }, fetchWiki: okAll }),
      baseInput(seed, { hint: '아무도모르는제목', state: { visits: allVisited, affinity: {}, lantern: 3, recent: [], todayOut: 0 }, fetchWiki: failAll })
    ];
    for (var vi = 0; vi < variants.length; vi++) {
      t = await BRAIN.plan(variants[vi]);
      if (t.kind !== 'out') continue;
      outN++;
      var e1 = lineErr(t, 'seed ' + seed + '/' + vi); if (e1) errs.push(e1);
    }
  }
  check(outN > 100 && errs.length === 0, 'reaction lines: no "많이 걸었어" at home, no "못 읽은" without a miss, no "처음" without a first stop (' + errs.length + ' errors)' + (errs.length ? ' e.g. ' + errs.slice(0, 3).join(' | ') : ''));

  /* #6/#42 들판(❔)은 '처음'이 아니다. 실패한 들판 걸음으로 폴짝하지 않는다 */
  section('wild stops are never "first" (#6/#42) — ' + label);
  errs = []; var wildSeen = 0, failedWild = 0;
  for (seed = 1; seed <= 120; seed++) {
    var runs = [await BRAIN.plan(baseInput(seed, { hint: '고양이', state: { visits: allVisited, affinity: {}, lantern: 8, recent: [], todayOut: 0 }, fetchWiki: failAll })),
      await BRAIN.plan(baseInput(seed, { state: { visits: allVisited, affinity: {}, lantern: 8, recent: [], todayOut: 0 }, fetchWiki: okAll }))];
    runs.forEach(function (tr, k) {
      if (tr.kind !== 'out') return;
      tr.receipt.stops.forEach(function (s) { if (s.wild) { wildSeen++; if (s.first) errs.push('seed ' + seed + ' wild first'); } });
      tr.events.forEach(function (e) { if (e.type === 'peek' && e.target.kind === 'wild' && e.first) errs.push('seed ' + seed + ' wild peek event first'); });
      var onlyFailedWild = tr.receipt.stops.some(function (s) { return s.wild && s.status === 'failed'; }) && !tr.receipt.stops.some(function (s) { return s.first || (s.wild && s.status === 'read'); });
      if (onlyFailedWild) { failedWild++; if (tr.reaction === '폴짝') errs.push('seed ' + seed + ' 폴짝 from a failed wild stop'); }
    });
  }
  check(wildSeen > 0 && failedWild > 0 && errs.length === 0, 'wild stops first:false; failed wild stop does not make 폴짝 (' + wildSeen + ' wild, ' + failedWild + ' failed-only, ' + errs.length + ' errors)' + (errs.length ? ' e.g. ' + errs[0] : ''));

  /* #0 replay 는 지어낸 '읽음'·출처·사진·처음·반응을 받지 않는다 */
  section('replay does not accept made-up reads (#0) — ' + label);
  var clueId = W.nodes.button && W.nodes.button.clue ? 'button' : Object.keys(W.nodes).filter(function (id) { return W.nodes[id].clue && W.nodes[id].wiki && id !== hintId; })[0];
  var good = 'https://ko.wikipedia.org/wiki/' + encodeURIComponent(W.nodes[clueId].wiki || W.nodes[clueId].name);
  var fake = [
    { type: 'depart', t: 0, hint: 'https://example.com/page' },
    { type: 'peek', t: 1, target: { kind: 'url', url: 'https://example.com/page' }, status: 'read', note: '바깥 글을 다 읽었어', first: true, ms: 3000 },
    { type: 'peek', t: 2, target: { kind: 'room', id: hintId }, status: 'read', first: true, ms: 3000, source: { url: 'https://example.com/not-wiki', extract: '진짜 읽은 척', thumb: { url: 'https://example.com/x.png' } } },
    { type: 'peek', t: 3, target: { kind: 'wild', title: '어딘가' }, status: 'read', first: true, ms: 3000, source: { url: 'javascript:alert(1)', extract: 'x' } },
    { type: 'peek', t: 4, target: { kind: 'room', id: clueId }, status: 'read', ms: 3000, source: { url: good, extract: '진짜 위키 문서 요약.', thumb: { url: 'http://upload.wikimedia.org/a.jpg' }, license: '퍼블릭 도메인', attribution: '나' } },
    { type: 'peek', t: 5, target: { kind: 'room', id: 'door_out' }, status: 'read', ms: 3000 },
    { type: 'return', t: 6 }, { type: 'remember', t: 7, stopIdx: 3 }, { type: 'hang_poster', t: 8 }, { type: 'wrap_up', t: 9, reaction: '우쭐' }
  ];
  var fakeCopy = JSON.parse(JSON.stringify(fake));
  var visited = {}; visited[hintId] = 4;
  var rf = BRAIN.replay(fakeCopy, { by: 'mcp', now: NOW_DAY, state: { visits: visited, affinity: {} } });
  var rs = rf.receipt.stops;
  check(JSON.stringify(fakeCopy) === JSON.stringify(fake), 'replay does not mutate its input');
  check(rs[0].status === 'simulated' && rs[0].note.indexOf('정적 페이지라') === 0 && !rs[0].source, 'url door claimed read → simulated, honest note (' + rs[0].status + ')');
  check(rs[4].status === 'simulated' && rs[4].nodeId === 'door_out', 'door_out room claimed read → simulated door');
  check(rs[1].status !== 'read' && !rs[1].source && rs[1].note.indexOf('읽은 척') < 0, 'room read with non-wiki source → not read, no source, claimed note dropped (' + rs[1].status + ')');
  check(rs[1].first === false, 'room first:true claim ignored when visits say it was visited');
  check(rs[2].status === 'simulated' && !rs[2].source && rs[2].first === false, 'wild read with javascript: source → simulated, not first');
  check(rs[3].status === 'read' && rs[3].source && rs[3].source.url === good && rs[3].source.thumb === null && rs[3].source.license === BRAIN.LICENSE && rs[3].source.attribution === BRAIN.ATTRIBUTION, 'real ko.wikipedia source kept; http thumb dropped; license/attribution from the brain, not input');
  check(rf.poster.thumb === null, 'poster thumb only from upload.wikimedia.org https');
  check(rf.receipt.counts.read === 1 && rf.receipt.counts.simulated === 3, 'counts honest (' + JSON.stringify(rf.receipt.counts) + ')');
  check(rs.every(function (s) { return !s.source || WIKI_PAGE_RE.test(s.source.url); }), 'every receipt source is a ko.wikipedia.org page');
  check(rf.reaction !== '우쭐' && rf.receipt.reaction === rf.reaction, 'claimed 우쭐 with 1/5 read → recomputed (' + rf.reaction + ')');
  var peeks = rf.events.filter(function (e) { return e.type === 'peek'; });
  var evMismatch = peeks.filter(function (e, i) { var s = rs[i]; return e.status !== s.status || e.note !== s.note || !!e.first !== !!s.first || !!e.source !== !!s.source || (e.source && e.source.url !== s.source.url); });
  check(peeks.length === rs.length && evMismatch.length === 0, 'returned peek events carry the normalized status/note/first/source (' + evMismatch.length + ' mismatches)');
  check(rf.events.filter(function (e) { return e.type === 'wrap_up'; })[0].reaction === rf.reaction, 'returned wrap_up event carries the normalized reaction');
  var wikiThumb = BRAIN.replay([{ type: 'depart', t: 0, hint: '' }, { type: 'peek', t: 1, target: { kind: 'room', id: clueId }, status: 'read', source: { url: good, extract: '요약.', thumb: { url: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/x.jpg', w: 10, h: 20 } } },
    { type: 'return', t: 2 }, { type: 'remember', t: 3, stopIdx: 0 }, { type: 'wrap_up', t: 4, reaction: '덤덤' }], { by: 'mcp', now: NOW_DAY });
  check(wikiThumb.poster.thumb && wikiThumb.poster.thumb.url.indexOf('https://upload.wikimedia.org/') === 0 && wikiThumb.poster.thumb.license === BRAIN.THUMB_LICENSE, 'upload.wikimedia.org thumb is kept and credited');
  var proudOk = BRAIN.replay([{ type: 'depart', t: 0, hint: W.nodes[clueId].name }, { type: 'peek', t: 1, target: { kind: 'room', id: clueId }, status: 'read', source: { url: good, extract: '요약.' } },
    { type: 'return', t: 2 }, { type: 'wrap_up', t: 3, reaction: '우쭐' }], { by: 'mcp', now: NOW_DAY, state: { visits: allVisited } });
  check(proudOk.reaction === '우쭐' || proudOk.hint.followed !== 'followed', 'honest 우쭐 (followed + all read) is kept (' + proudOk.reaction + '/' + proudOk.hint.followed + ')');
  var homeJump = BRAIN.replay([{ type: 'stay_home', t: 0, activity: 'nap' }, { type: 'wrap_up', t: 1, reaction: '폴짝' }], { by: 'mcp' });
  check(homeJump.reaction === '졸림' && homeJump.events[1].reaction === '졸림', 'home replay: 폴짝 with nothing new → 졸림');
  var failedDoor = BRAIN.replay([{ type: 'depart', t: 0, hint: 'https://example.org' }, { type: 'peek', t: 1, target: { kind: 'url', url: 'https://example.org' }, status: 'failed' }, { type: 'return', t: 2 }], { by: 'mcp' });
  check(failedDoor.receipt.stops[0].status === 'failed', "url door reported failed stays 'failed'");
}

/* ───────── §17.1 메모 · 재방문 깊이 ───────── */
var IMPERATIVE = /해라|하세요|믿어/;
var RULE_TALK = /자격|조건|규칙|기준/;
function noteIsFromRecord(W, trip, id, text) {
  var n = W.nodes[id]; if (!n) return false;
  var bare = text.replace(/…$/, '');
  if ((n.memories || []).indexOf(text) >= 0) return true;
  if (n.clue && n.clue.replace(/\s+/g, ' ').indexOf(bare) >= 0) return true;
  var st = (trip.receipt.stops || []).filter(function (s) { return s.nodeId === id; })[0];
  return !!(st && st.source && st.source.extract && st.source.extract.replace(/\s+/g, ' ').indexOf(bare) >= 0);
}
async function memoSuite(label, W, hasHat) {
  section('memo (§17.1) — ' + label);
  var errs = [], nOut = 0, nHome = 0, nEmpty = 0, samples = [];
  for (var seed = 1; seed <= 150; seed++) {
    var hint = seed % 3 === 0 ? '' : (hasHat ? '모자의 역사' : '');
    var a = await BRAIN.plan(baseInput(seed, { hint: hint }));
    var b = await BRAIN.plan(baseInput(seed, { hint: hint }));
    try { assert.deepStrictEqual(a.memo, b.memo); } catch (e) { errs.push('seed ' + seed + ' memo not deterministic'); }
    if (a.kind === 'empty') { nEmpty++; if (a.memo !== null) errs.push('seed ' + seed + ' empty turn has memo'); continue; }
    if (a.kind === 'out') nOut++; else nHome++;
    var m = a.memo;
    if (!m || typeof m.tomorrow !== 'string' || !m.tomorrow) { errs.push('seed ' + seed + ' ' + a.kind + ' has no memo.tomorrow'); continue; }
    if (samples.length < 3 && a.kind === 'out') samples.push(m.tomorrow);
    var texts = [m.tomorrow].concat(Object.keys(m.notes).map(function (k) { return m.notes[k]; }));
    texts.forEach(function (t) {
      if (typeof t !== 'string' || t.length > 60) errs.push('seed ' + seed + ' memo > 60: ' + t);
      if (hasBrace(t)) errs.push('seed ' + seed + ' memo leftover {: ' + t);
      if (IMPERATIVE.test(t)) errs.push('seed ' + seed + ' memo imperative: ' + t);
    });
    /* 생성된 문장(tomorrow)은 자격·규칙을 말하지 않는다 (notes 는 기록 인용이라 '0을 수로 다룬 규칙' 같은 사실은 그대로 둔다) */
    if (RULE_TALK.test(m.tomorrow)) errs.push('seed ' + seed + ' tomorrow mentions rules: ' + m.tomorrow);
    var wu = a.events.filter(function (e) { return e.type === 'wrap_up'; })[0];
    try { assert.deepStrictEqual(wu.memo, m); } catch (e) { errs.push('seed ' + seed + ' wrap_up.memo != trip.memo'); }
    if (a.kind === 'home') { if (Object.keys(m.notes).length) errs.push('seed ' + seed + ' home memo has notes'); continue; }
    var roomIds = a.receipt.stops.filter(function (s) { return s.nodeId && s.nodeId !== 'door_out' && !s.wild; }).map(function (s) { return s.nodeId; });
    Object.keys(m.notes).forEach(function (id) {
      if (roomIds.indexOf(id) < 0) errs.push('seed ' + seed + ' note for unvisited room ' + id);
      else if (!noteIsFromRecord(W, a, id, m.notes[id])) errs.push('seed ' + seed + ' note not from memories/clue/extract: ' + id + ' ' + m.notes[id]);
    });
    roomIds.forEach(function (id) { var nd = W.nodes[id]; if (nd && ((nd.memories || []).length || nd.clue) && !m.notes[id]) errs.push('seed ' + seed + ' visited room without note ' + id); });
    var rem = a.receipt.stops[a.receipt.rememberedIdx];
    if (rem && m.tomorrow.indexOf(rem.name) < 0 && !/느린 글의 방|편지의 방/.test(m.tomorrow)) errs.push('seed ' + seed + ' tomorrow does not mention remembered stop ' + rem.name + ': ' + m.tomorrow);
  }
  console.log('  memo samples:', JSON.stringify(samples), '| out', nOut, 'home', nHome, 'empty', nEmpty);
  check(errs.length === 0, 'memo: deterministic, ≤60, no {, no imperative, notes from record (' + errs.length + ' errors)' + (errs.length ? ' e.g. ' + errs.slice(0, 4).join(' | ') : ''));
  check(nOut > 0 && nHome > 0, 'memo seen for out and home trips');

  /* 강제 빈 차례 → memo null */
  global.__ppolTest = { forceKind: 'empty' };
  var em = await BRAIN.plan(baseInput(3));
  delete global.__ppolTest;
  check(em.kind === 'empty' && em.memo === null, 'empty turn → memo null');
  global.__ppolTest = { forceKind: 'home' };
  var hm = await BRAIN.plan(baseInput(4));
  delete global.__ppolTest;
  check(hm.kind === 'home' && hm.memo && /내일은/.test(hm.memo.tomorrow) && hm.memo.tomorrow.length <= 60, 'home memo: "' + (hm.memo && hm.memo.tomorrow) + '"');

  /* replay: wrap_up.memo 가 있으면 그것(정리해서), 없으면 null */
  var src = null;
  for (seed = 1; seed <= 60 && !src; seed++) { var c = await BRAIN.plan(baseInput(seed)); if (c.kind === 'out') src = c; }
  var rp = BRAIN.replay(JSON.parse(JSON.stringify(src.events)), { by: 'mcp', now: NOW_DAY });
  try { assert.deepStrictEqual(rp.memo, src.memo); check(true, 'replay keeps wrap_up.memo'); } catch (e) { check(false, 'replay keeps wrap_up.memo'); }
  var noMemo = JSON.parse(JSON.stringify(src.events)); noMemo.forEach(function (e) { delete e.memo; });
  check(BRAIN.replay(noMemo, { by: 'mcp', now: NOW_DAY }).memo === null, 'replay without memo → null (no invented greeting)');
  var long = JSON.parse(JSON.stringify(noMemo)); long[long.length - 1].memo = { tomorrow: new Array(30).join('가나다'), notes: { hat: new Array(40).join('라'), bad: 5, 'x y': 'z' } };
  var lm = BRAIN.replay(long, { by: 'mcp', now: NOW_DAY }).memo;
  check(lm && lm.tomorrow.length <= 60 && lm.notes.hat.length <= 60 && !('bad' in lm.notes) && !('x y' in lm.notes), 'replay memo clamped to 60 and sanitized');
  check(BRAIN.replay([{ type: 'stay_home', activity: 'nap' }, { type: 'wrap_up', reaction: '졸림' }], { by: 'human' }).memo === null, 'home replay without memo → null');
  check(BRAIN.replay([{ type: 'empty_turn', t: 0 }], { by: 'human' }).memo === null, 'empty replay → memo null');

  /* 재방문 깊이 */
  section('revisit depth (§17.1) — ' + label);
  if (!hasHat) { console.log('  (hat 없음 — 건너뜀)'); return; }
  var hat = W.nodes.hat, related = hat.related || [];
  var seen = 0, deepErr = [], plainShort = 0, deepShort = 0, rel1 = 0, relAvail = 0;
  for (seed = 1; seed <= 120; seed++) {
    var plain = await BRAIN.plan(baseInput(seed, { hint: '모자의 역사' }));
    var visits = { hat: 2 };
    var deep = await BRAIN.plan(baseInput(seed, { hint: '모자의 역사', state: { visits: visits, affinity: {}, lantern: 1, recent: [], todayOut: 0, lastVisit: { hat: '2026-11-01' } } }));
    var deep2 = await BRAIN.plan(baseInput(seed, { hint: '모자의 역사', state: { visits: visits, affinity: {}, lantern: 1, recent: [], todayOut: 0, lastVisit: { hat: '2026-11-01' } } }));
    if (JSON.stringify(deep.events) !== JSON.stringify(deep2.events)) deepErr.push('seed ' + seed + ' revisit not deterministic');
    if (deep.kind !== 'out') continue;
    var p0 = deep.events.filter(function (e) { return e.type === 'peek'; })[0];
    if (p0.target.id !== 'hat') { if (p0.aside) deepErr.push('seed ' + seed + ' aside without hat start'); continue; }
    seen++;
    if (plain.kind === 'out' && plain.receipt.stops.length < 3) plainShort++;
    if (deep.receipt.stops.length < 3) deepShort++;
    var want = '모자? 그거 3일 전에 봤잖아. 이번엔 안쪽까지 가 볼게';
    if (p0.aside !== want) deepErr.push('seed ' + seed + ' aside "' + p0.aside + '"');
    if (hasBrace(p0.aside || '')) deepErr.push('seed ' + seed + ' aside brace');
    var freshRel = related.filter(function (id) { return W.nodes[id] && !W.nodes[id].linger && !(visits[id] > 0); });
    if (freshRel.length) { relAvail++; if (freshRel.indexOf(deep.receipt.stops[1].nodeId) >= 0) rel1++; }
    var pp = plain.events.filter(function (e) { return e.type === 'peek'; })[0];
    if (pp && pp.aside) deepErr.push('seed ' + seed + ' first-time visit has aside');
    if (!deep.revisit || deep.revisit.nodeId !== 'hat') deepErr.push('seed ' + seed + ' trip.revisit missing');
  }
  console.log('  revisit trips', seen, '| <3 stops: plain', plainShort, 'revisit', deepShort, '| 2nd stop = unvisited related', rel1 + '/' + relAvail);
  check(seen > 10, 'revisit seen (' + seen + ')');
  check(deepShort === 0, 'revisit: route goes ≥3 stops (one step deeper)');
  check(relAvail === 0 || rel1 === relAvail, 'revisit: second stop is an unvisited related neighbour');
  check(deepErr.length === 0, 'revisit aside "{hint}? 그거 N일 전에 봤잖아…" (' + deepErr.length + ' errors)' + (deepErr.length ? ' e.g. ' + deepErr.slice(0, 3).join(' | ') : ''));
  /* 같은 날 · 날짜 없는 방문 */
  var sameDay = null, undated = null;
  for (seed = 1; seed <= 60 && (!sameDay || !undated); seed++) {
    var sd = await BRAIN.plan(baseInput(seed, { hint: '모자의 역사', state: { visits: { hat: 1 }, affinity: {}, lantern: 1, recent: [], todayOut: 0, lastVisit: { hat: '2026-11-04' } } }));
    var p = sd.kind === 'out' && sd.events.filter(function (e) { return e.type === 'peek'; })[0];
    if (p && p.target.id === 'hat' && !sameDay) sameDay = p.aside;
    var ud = await BRAIN.plan(baseInput(seed, { hint: '모자의 역사', state: { visits: { hat: 1 }, affinity: {}, lantern: 1, recent: [], todayOut: 0 } }));
    var q2 = ud.kind === 'out' && ud.events.filter(function (e) { return e.type === 'peek'; })[0];
    if (q2 && q2.target.id === 'hat' && !undated) undated = q2.aside;
  }
  check(sameDay === '모자? 그거 아까 봤잖아. 이번엔 안쪽까지 가 볼게', 'same-day revisit aside: ' + sameDay);
  check(undated === '모자? 그거 전에 봤잖아. 이번엔 안쪽까지 가 볼게', 'undated revisit aside (legacy visits): ' + undated);
  check(BRAIN.daysBetween('2026-10-30', '2026-11-04') === 5 && BRAIN.daysBetween('x', '2026-11-04') === null, 'daysBetween');
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
          global.WORLD = RW;
          var hasHat = !!(RW.nodes.hat && BRAIN.matchHint('모자의 역사').nodeId === 'hat');
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
