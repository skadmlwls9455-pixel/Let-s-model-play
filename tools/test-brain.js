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
      { id: 'count_rain', line: '창가에서 빗방울을 세다가 잠들었어', detail: '마흔까지 세고 잊었어.', anchor: 'window', weight: 3, maxLantern: 6 },
      { id: 'nap', line: '담요 속에서 낮잠', detail: '담요 안은 조용했어.', anchor: 'blanket', weight: 3 },
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
      ignored: ['{hint}는 다음에. 오늘은 {mem}가 먼저였어'],   /* 11-14: 조사 시험용 꼴 (예전 '…{mem}가 궁금했어' — 데모 줄은 사실만, 주인 O1 b) */
      linger: ['느린 글의 방에 앉아만 있었어. 읽은 건 없어']
    },
    roomLevels: [], stickers: {}, scenes: ['hands', 'sea', 'sky', 'home', 'wild'], strings: {}
  };
}

/* ───────── 큰 도서관: '오늘의 서가' 산책 (input.shelf) ───────── */
async function shelfSuite(W) {
  section('plan — 큰 도서관 (오늘의 서가)');
  global.WORLD = W; BRAIN.setWorld(null);
  var SH = ['쿼카', '모자', '우산', '잉크'];
  var walks = 0, ok = true, sameNoShelf = true, hopsOk = true;
  for (var seed = 1; seed <= 120; seed++) {
    var a = await BRAIN.plan(baseInput(seed, { shelf: SH }));
    var b = await BRAIN.plan(baseInput(seed, { shelf: SH }));
    if (JSON.stringify(a.events) !== JSON.stringify(b.events)) ok = false;
    var st = (a.receipt && a.receipt.stops) || [];
    if (a.kind === 'out' && st[0] && st[0].bridge === '오늘의 서가에서') {
      walks++;
      if (SH.indexOf(st[0].title || st[0].name) < 0 || st.some(function (x) { return x.nodeId; }) || st.length > 3) hopsOk = false;
    }
    if (seed <= 40) {
      var c = await BRAIN.plan(baseInput(seed)), d = await BRAIN.plan(baseInput(seed, { shelf: [] }));
      if (JSON.stringify(c.events) !== JSON.stringify(d.events)) sameNoShelf = false;
    }
  }
  check(ok, 'shelf: 같은 시드 → 같은 산책 (Math.random 없음)');
  check(walks > 10 && walks < 80, 'shelf: 외출의 일부가 서가 산책 (' + walks + '/120)');
  check(hopsOk, 'shelf: 첫 정류장은 서가의 책, 방 없이 링크 1~2 걸음 (최대 3 정류장)');
  check(sameNoShelf, 'shelf 가 비면 산책은 예전과 같다');
  var off = 0, hinted = 0;
  for (var s2 = 1; s2 <= 60; s2++) {
    var o = await BRAIN.plan(baseInput(s2, { shelf: SH, online: false }));
    if (o.receipt && o.receipt.stops && o.receipt.stops[0] && o.receipt.stops[0].bridge === '오늘의 서가에서') off++;
    var h = await BRAIN.plan(baseInput(s2, { shelf: SH, hint: '모자' }));
    if (h.receipt && h.receipt.stops && h.receipt.stops[0] && h.receipt.stops[0].bridge === '오늘의 서가에서') hinted++;
  }
  check(off === 0, 'shelf: 오프라인이면 서가 산책 안 함 (못 읽을 곳에 가지 않는다)');
  check(hinted === 0, 'shelf: 힌트가 있으면 (개발 모드) 예전 길');
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

/* ───────── 힌트 낱말 규칙 말뭉치 (실제 world.js 용, brain3) ─────────
   방마다 이름·별칭 × 겹조사·서술격(받침 맞춤) = 그 방이어야 하고, 방의 말이 속에 든 흔한 낱말은 그 방이면 안 된다.
   전체 말뭉치(1.7만 줄)와 옛 판 비교표는 작업 노트에 있다. 여기는 빠르게 도는 축약판 */
function matcherCorpus(W) {
  function jong(s) { var c = s.charCodeAt(s.length - 1); return (c >= 0xAC00 && c <= 0xD7A3) ? (c - 0xAC00) % 28 : -1; }
  function pk(t, a, b) { return jong(t) > 0 ? a : b; }
  function ro(t) { var j = jong(t); return (j === 0 || j === 8) ? '로' : '으로'; }
  var out = [], k = 0, TAILS = ['궁금해', '보고 싶어', '알려 줘', '뭐가 있어'];
  var AMBIG = /^(종이|별로|실로|실은|차도|종로|별도|비만|실의|모자라)/;   /* 다른 낱말과 같은 꼴은 뺀다 (모자라도 = 모자라다) */
  var COP = { '이에요': 1, '예요': 1, '이다': 1, '다': 1, '이야': 1, '야': 1, '인데': 1 };
  Object.keys(W.nodes).forEach(function (id) {
    if (id === 'door_out') return;
    var n = W.nodes[id];
    [n.name].concat(n.aliases || []).forEach(function (t, ti) {
      if (!t || jong(t) < 0 || (t.length === 1 && ti > 0)) return;
      var one = t.length === 1, sfx;
      if (ti === 0) sfx = ['', '에도', '에는', pk(t, '과의', '와의'), ro(t) + '도', pk(t, '이라도', '라도'), pk(t, '이나', '나'), pk(t, '이든', '든'), '하고는', '까지도', '에서도', pk(t, '이', '가')]
        .concat(one ? [] : [pk(t, '이에요', '예요'), pk(t, '이다', '다'), pk(t, '이야', '야'), '인데']);
      else sfx = ['에도', pk(t, '과의', '와의')].concat(one ? [] : [pk(t, '이에요', '예요')]);
      sfx.forEach(function (p) {
        if (AMBIG.test(t + p)) return;
        out.push({ g: 'room term + particles', h: COP[p] ? '이거 ' + t + p : t + p + ' ' + TAILS[(k++) % 4], exp: id });
      });
    });
  });
  function P(g, h, exp) { if (W.nodes[exp]) out.push({ g: g, h: h, exp: exp }); }
  function N(h, not) { if (W.nodes[not]) out.push({ g: 'term inside another word (not that room)', h: h, not: not }); }
  [['문어에도 뼈가 있어?', 'octopus'], ['모자에는 뭐가 있어', 'hat'], ['이끼에도 꽃이 펴?', 'moss'], ['잉크에는 뭐가 들어가?', 'ink'], ['문어와의 대화', 'octopus'],
    ['자장가라도 불러 줘', 'lullaby'], ['기억하는 법', 'memory'], ['털모자예요', 'hat'], ['문어다', 'octopus'], ['문어든', 'octopus'], ['모자나', 'hat'],
    ['나선에도', 'spiral'], ['소금에는', 'salt'], ['기억나는 게 없어', 'memory']].forEach(function (x) { P('task R (stacked/copula/하다)', x[0], x[1]); });
  [['눈 움직임에는 뭐가 있어', 'dream'], ['눈 움직임에도', 'dream'], ['비 온 뒤에는', 'rainbow'], ['비 온 뒤에도 좋아', 'rainbow'], ['눈 결정에는', 'snow'],
    ['문어 뇌가 궁금해', 'octopus_nerves'], ['문어 신경계에도 뇌가 있어?', 'octopus_nerves'], ['심장 세 개라니', 'octopus'], ['고래의 노래를 들었어', 'whale_song'],
    ['매듭 이론에도', 'knot_theory'], ['문어신경계가 궁금해', 'octopus_nerves'], ['비 오는 날', 'rain'], ['차 한 잔', 'tea']].forEach(function (x) { P('phrases (#101)', x[0], x[1]); });
  [['털모자', 'hat'], ['빨간모자를 쓴 소녀', 'hat'], ['먹구름', 'cloud_names'], ['대왕문어', 'octopus'], ['색분필', 'chalk'], ['모자가게', 'hat'],
    ['구름사진을 찍었어', 'cloud_names'], ['우산꽂이', 'umbrella'], ['기억상실', 'memory'], ['문어발이 몇 개야', 'octopus']].forEach(function (x) { P('compounds about the room', x[0], x[1]); });
  [['실제로 있는 거야?', 'zero'], ['이거 실제로 봤어', 'zero'], ['짝수면 어떡해', 'sleep'], ['어울림', 'echo'], ['롱노트', 'knot'], ['실시간', 'time_sense'],
    ['시골풍경', 'bell'], ['운전조수', 'tide'], ['코스모스가 폈어', 'morse'], ['노트북을 샀어', 'knot'], ['에코백을 들고', 'echo'], ['종이컵에 담아', 'bell'],
    ['별로야', 'star'], ['별도 요금', 'star'], ['비만 걱정', 'rain'], ['실의에 빠졌어', 'thread'], ['돈이 모자라서', 'hat'], ['모자란 사람', 'hat'],
    ['모자이크 처리', 'hat'], ['유리한 위치', 'glass'], ['바람직한 방향', 'wind'], ['소수민족', 'prime'], ['중심지', 'candle'], ['선글라스', 'glass'],
    ['문어체', 'octopus'], ['하루살이', 'time_sense'], ['소금쟁이', 'salt'], ['초롱초롱', 'lantern'], ['벼락치기', 'thunder'], ['머리카락', 'hat'],
    ['바다표범', 'octopus'], ['득점자', 'braille'], ['김유리', 'glass'], ['아마존 프라임', 'prime'], ['노트에 적어 둬', 'knot'], ['차다', 'tea'],
    ['나선다', 'spiral'], ['이름있는 가게', 'name'], ['태양초 고추장', 'candle'], ['rainbow', 'rain']].forEach(function (x) { N(x[0], x[1]); });
  /* brain4: 검증에서 3차가 놓친 것 — 합성어(목록 밖 말·한 글자 뒷말·끝 머리말만인 말), 영문 붙여 쓰기, 빠진 어미, 키워드 하다꼴 */
  [['봄바람', 'wind'], ['산들바람', 'wind'], ['바닷바람', 'wind'], ['겨울바람', 'wind'], ['칼바람', 'wind'], ['바람소리', 'wind'], ['바람소리 들려', 'wind'],
    ['진주목걸이', 'pearl'], ['진주귀걸이를 한 소녀', 'pearl'], ['흑진주', 'pearl'], ['진주빛', 'pearl'], ['유리공예', 'glass'], ['유리구두', 'glass'],
    ['색유리', 'glass'], ['통유리', 'glass'], ['유리컵', 'glass'], ['유리잔', 'glass'], ['점자블록', 'braille'], ['점자판', 'braille'], ['암호해독', 'cipher'],
    ['암호화', 'cipher'], ['이중나선', 'spiral'], ['나선형 계단', 'spiral'], ['한글창제', 'hangul'], ['한글자판', 'hangul'], ['한글날', 'hangul'],
    ['한글날 노래', 'hangul'], ['라틴어사전', 'ancient_language'], ['테셀레이션무늬', 'tessellation'], ['추억여행', 'memory'], ['빗방울소리', 'rain'],
    ['낮잠자기', 'sleep'], ['잠들기전', 'sleep'], ['심장소리', 'heartbeat'], ['심장병', 'heartbeat'], ['풍경소리', 'bell'], ['소금물 만드는 법', 'salt'],
    ['메트로놈앱', 'metronome'], ['등대섬', 'lighthouse'], ['무지개빛', 'rainbow'], ['이름표', 'name'], ['수수께끼놀이', 'riddle'], ['밀물썰물', 'tide']
  ].forEach(function (x) { P('compounds (brain4: 목록 밖·한 글자 뒷말·끝 머리말)', x[0], x[1]); });
  [['문어octopus', 'octopus'], ['octopus문어', 'octopus'], ['이끼moss', 'moss'], ['sos신호', 'morse'], ['한글이야말로 최고', 'hangul'], ['고래 노래였나?', 'whale_song'],
    ['문어였나', 'octopus'], ['문어거든', 'octopus'], ['문어지?', 'octopus'], ['문어거든요', 'octopus'], ['문어라는 동물', 'octopus'], ['문어니까', 'octopus'],
    ['우산이면 돼', 'umbrella'], ['진주였구나', 'pearl'], ['뜨개질하는 법', 'thread'], ['필기하는 법', 'quill'], ['계산하는 법', 'abacus'],
    ['수집하는 취미', 'stamp'], ['해독하는 법', 'cipher'], ['바느질하기', 'thread'], ['추억하는 법', 'memory'], ['천둥치는 밤', 'thunder'], ['소용돌이치는 바다', 'spiral'], ['메아리치다', 'echo']
  ].forEach(function (x) { P('mixed script · endings · 하다/치다 (brain4)', x[0], x[1]); });
  [['만점자', 'braille'], ['고득점자', 'braille'], ['박진주', 'pearl'], ['진주시청', 'pearl'], ['진주시', 'pearl'], ['진주냉면', 'pearl'], ['바람둥이', 'wind'],
    ['바람기', 'wind'], ['바람피운 남자', 'wind'], ['바람날 거야', 'wind'], ['바람직하다', 'wind'], ['이유리 선생님', 'glass'], ['유리수', 'glass'], ['유리해', 'glass'],
    ['암호화폐', 'cipher'], ['암호화폐 시세', 'cipher'], ['소수점', 'prime'], ['소수자', 'prime'], ['이름값', 'name'], ['한글자', 'hangul'], ['심장부', 'heartbeat'],
    ['핵심장면', 'heartbeat'], ['나선거야', 'spiral'], ['풍경화', 'bell'], ['풍경사진', 'bell'], ['번개팅', 'thunder'], ['모자래', 'hat'], ['모자라는 사람', 'hat'],
    ['창고 정리', 'sleep'], ['정리해 줘', 'sleep'], ['조수석', 'tide'], ['제로콜라', 'zero'], ['나선다고 했어', 'spiral'], ['구름판 밟기', 'cloud_names'], ['비ASCII 문자', 'rain'], ['lineKind별로', 'star']].forEach(function (x) { N(x[0], x[1]); });
  var wk = function (t) { return 'https://ko.wikipedia.org/wiki/' + encodeURIComponent(t); };
  [[wk('털모자'), 'hat'], [wk('모자의_역사'), 'hat'], [wk('눈_(날씨)'), 'snow'], [wk('매듭_이론'), 'knot_theory'], [wk('먹구름'), 'cloud_names'],
    ['https://example.org/tea-time', 'tea'], ['https://www.linkedin.com/in/someone', 'none'], ['https://teams.microsoft.com/x', 'none'], [wk('실제로'), 'none'],
    [wk('실시간'), 'none'], [wk('코스모스'), 'none'], [wk('모자이크'), 'none'],
    [wk('한글날'), 'hangul'], [wk('이중나선'), 'spiral'], [wk('봄바람'), 'wind'], [wk('흑진주'), 'pearl'], [wk('심장병'), 'heartbeat'], [wk('점자블록'), 'braille'],
    [wk('암호화폐'), 'none'], [wk('득점자'), 'none'], [wk('진주시'), 'none'], [wk('김유리'), 'none']].forEach(function (x) { if (x[1] === 'none' || W.nodes[x[1]]) out.push({ g: 'url', u: x[0], exp: x[1] }); });
  return out;
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
  check(BRAIN.composeLine('ignored', { hint: '모자', mem: '왕관' }, 0.1) === '모자는 다음에. 오늘은 왕관이 먼저였어', 'josa: 왕관이 / 모자는 (' + BRAIN.composeLine('ignored', { hint: '모자', mem: '왕관' }, 0.1) + ')');
  check(BRAIN.composeLine('ignored', { hint: '구름', mem: '조개' }, 0.1) === '구름은 다음에. 오늘은 조개가 먼저였어', 'josa: 구름은 / 조개가');
  check(BRAIN.composeLine('failed', { mem: 'Hat' }, 0.9) === 'Hat는 못 읽었어. 문이 안 열렸어', 'josa: non-hangul keeps template particle');

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

  /* 2차: 조사 붙은 합성어 · 낱말 끝 머리말 · 띄어 쓴 구절 안의 한 글자 */
  section('matchHint — particles, head nouns, phrases (bug hunt #7 · regressions)');
  BRAIN.setWorld({ corners: { c: {} }, nodes: {
    lullaby: mini('lullaby', '자장가', { keywords: ['아기'] }),               /* 키워드가 합성어 앞머리에 */
    thread: mini('thread', '실', { aliases: ['털실'] }),
    knot: mini('knot', '매듭', { aliases: ['노트'] }), echo: mini('echo', '메아리', { aliases: ['에코'] }),
    morse: mini('morse', '모스 부호', { aliases: ['모스'] }), candle: mini('candle', '양초', { aliases: ['심지'] }),
    snow: mini('snow', '눈', { aliases: ['눈 결정'] }), rain: mini('rain', '비'), salt: mini('salt', '소금', { keywords: ['결정'] }),
    dream: mini('dream', '꿈', { keywords: ['눈 움직임'] }), rainbow: mini('rainbow', '무지개', { keywords: ['비 온 뒤'] }),
    hat: mini('hat', '모자', { aliases: ['중절모'] }), cloud: mini('cloud', '구름 이름', { aliases: ['구름'] })
  } });
  function mh(h) { var m = BRAIN.matchHint(h); return m.kind === 'node' ? m.nodeId : m.kind; }
  var notKnot = ['노트북을 샀어', '노트북이 고장났어', '노트북으로', '노트북도'].map(mh), notEcho = mh('에코백을 들고');
  check(notKnot.every(function (x) { return x === 'wiki'; }) && notEcho === 'wiki', '#7 노트북을/노트북이/노트북으로 ≠ 노트, 에코백을 ≠ 에코 (' + notKnot.join(',') + ' · ' + notEcho + ')');
  check(mh('구름사진을 찍었어') === 'cloud' && mh('구름사이') === 'cloud' && mh('모자들이') === 'hat' && mh('모자만') === 'hat', '#7 two-syllable tails and plain endings still match (구름사진을, 구름사이, 모자들이, 모자만)');
  check(mh('모자란') === 'wiki', "'모자란' (lacking) is not 모자 + one syllable");
  var heads = ['털모자', '중절모자', '빨간모자를 쓴 소녀', '털모자 사고 싶어', '아기모자', '털실모자'].map(mh);
  check(heads.every(function (x) { return x === 'hat'; }), 'head noun at the end of a compound: 털모자/중절모자/빨간모자를/아기모자/털실모자 → 모자 (' + heads.join(',') + ')');
  check(mh('먹구름') === 'cloud' && mh('아기') === 'lullaby' && mh('털실') === 'thread', 'head noun alias (먹구름 → 구름); plain words unchanged');
  var notHead = ['코스모스', '코스모스가 폈어', '중심지', '도심지에서'].map(mh);
  check(notHead.every(function (x) { return x === 'wiki'; }), 'word that only happens to end in a term stays wiki (코스모스 ≠ 모스, 중심지 ≠ 심지) (' + notHead.join(',') + ')');
  check(mh('눈 움직임이 궁금해') === 'dream' && mh('눈 움직임에 대해 알려줘') === 'dream', "regression: one-syllable 눈 inside another room's phrase '눈 움직임' → 꿈 (" + mh('눈 움직임이 궁금해') + ')');
  check(mh('비 온 뒤이 궁금해') === 'rainbow' && mh('비 온 뒤에 대해 알려줘') === 'rainbow', "regression: '비 온 뒤' phrase → 무지개, not 비 (" + mh('비 온 뒤에 대해 알려줘') + ')');
  check(mh('눈 결정이 궁금해') === 'snow' && mh('비 오는 날') === 'rain' && mh('눈 오는 밤') === 'snow', "own phrase keeps its room (눈 결정이 → 눈); plain one-syllable words still match");
  var u = function (t) { return (BRAIN.nodeFromUrl('https://ko.wikipedia.org/wiki/' + encodeURIComponent(t)) || {}).id || null; };
  check(u('털모자') === 'hat' && u('아기모자') === 'hat' && u('노트북') === null && u('코스모스') === null, 'url: 털모자/아기모자 → hat, 노트북/코스모스 → none (' + [u('털모자'), u('아기모자'), u('노트북'), u('코스모스')].join(',') + ')');
  BRAIN.setWorld(null);

  /* 3차: 낱말 = 말 + 조사·어미 사슬 (겹조사·서술격·하다꼴), 합성어는 허용된 말만 */
  section('matchHint — whole-word stems, stacked particles, compound allow-list (brain3 R/#7/#101)');
  BRAIN.setWorld({ corners: { c: {} }, nodes: {
    hat: mini('hat', '모자'), octopus: mini('octopus', '문어'), moss: mini('moss', '이끼'), lullaby: mini('lullaby', '자장가'),
    memory: mini('memory', '기억'), glass: mini('glass', '유리'), rain: mini('rain', '비'), snow: mini('snow', '눈', { aliases: ['눈 결정'] }),
    dream: mini('dream', '꿈', { keywords: ['눈 움직임'] }), rainbow: mini('rainbow', '무지개', { keywords: ['비 온 뒤'] }),
    zero: mini('zero', '0', { aliases: ['제로'] }), sleep: mini('sleep', '잠', { aliases: ['수면'] }), echo: mini('echo', '메아리', { aliases: ['울림'] }),
    time: mini('time', '시간 감각', { aliases: ['시간'] }), knot: mini('knot', '매듭', { aliases: ['노트'] }), salt: mini('salt', '소금')
  } });
  var stackedHits = ['문어에도 뼈가 있어?', '모자에는 뭐가 있어', '이끼에도 꽃이 펴?', '문어와의 대화', '자장가라도 불러 줘', '소금에는', '모자로도', '문어하고는', '이끼까지도', '모자들이랑'].map(mh);
  check(stackedHits.join() === 'octopus,hat,moss,octopus,lullaby,salt,hat,octopus,moss,hat', 'R: name + stacked particles (에도/에는/와의/라도/로도/하고는/까지도/들이랑) → room (' + stackedHits.join(',') + ')');
  var copHits = ['털모자예요', '문어다', '소금이에요', '이거 모자야', '문어든', '모자나 장갑', '소금이든', '모자인데', '문어였어'].map(mh);
  check(copHits.join() === 'hat,octopus,salt,hat,octopus,hat,salt,hat,octopus', 'R: copula endings and 나/든/이나/이든 → room (' + copHits.join(',') + ')');
  check(mh('기억하는 법') === 'memory' && mh('기억나는 게 없어') === 'memory' && mh('유리한 위치') === 'wiki' && mh('유리하게') === 'wiki', "R: 하다 forms only after 하다-nouns (기억하는 → 기억, 유리한 ≠ 유리)");
  check(mh('눈 움직임에는 뭐가 있어') === 'dream' && mh('눈 움직임에도') === 'dream' && mh('비 온 뒤에는') === 'rainbow' && mh('비 온 뒤에도 좋아') === 'rainbow' && mh('눈 결정에는') === 'snow', '#101 phrase + stacked particle keeps the phrase room (' + [mh('눈 움직임에는 뭐가 있어'), mh('비 온 뒤에는')].join(',') + ')');
  var notIn = ['실제로 있는 거야?', '이거 실제로 봤어', '짝수면 어떡해', '어울림', '롱노트', '실시간', '해수면', '노트북이랑'].map(mh);
  check(notIn.every(function (x) { return x === 'wiki'; }), '#7 a term inside another word is not that room (제로/수면/울림/노트/시간) (' + notIn.join(',') + ')');
  check(mh('비에도 젖었어') === 'rain' && mh('눈에는') === 'snow' && mh('비만 걱정') === 'wiki' && mh('비다') === 'wiki' && mh('비요') === 'wiki', 'one-syllable name: particle chains yes, 비만/copula/요 no');
  check(mh('모자란 사람') === 'wiki' && mh('돈이 모자라서') === 'wiki' && mh('모자랑 장갑') === 'hat', "'모자라다' forms are not 모자, '모자랑' is");
  check(mh('모자이크 처리') === 'wiki' && mh('소금쟁이') === 'wiki' && mh('소금사막') === 'salt' && mh('대왕문어') === 'octopus', 'compound allow-list: 모자이크/소금쟁이 no, 소금사막/대왕문어 yes');
  check(mh('시간이 모자라') === 'time' && mh('잠이 모자라요') === 'sleep', "whole-word terms still match next to 모자라 (" + mh('시간이 모자라') + ')');
  var uu = function (t) { return (BRAIN.nodeFromUrl('https://ko.wikipedia.org/wiki/' + encodeURIComponent(t)) || {}).id || null; };
  check(uu('실제로') === null && uu('실시간') === null && uu('대왕문어') === 'octopus' && uu('눈_결정') === 'snow', 'url uses the same word rules (' + [uu('실제로'), uu('실시간'), uu('대왕문어'), uu('눈_결정')].join(',') + ')');
  BRAIN.setWorld(null);

  /* 4차: 합성어 자리는 말마다 (끝 머리말만 · 앞머리만 · 목록 밖은 SAFE_TAIL 뒷말만) · 영문 붙여 쓰기 · 어미 · 키워드 하다/치다꼴 */
  section('matchHint — compound positions per term, mixed script, endings, keyword 하다 (brain4)');
  BRAIN.setWorld({ corners: { c: {} }, nodes: {
    wind: mini('wind', '바람'), pearl: mini('pearl', '진주'), glass: mini('glass', '유리'), braille: mini('braille', '점자'),
    cipher: mini('cipher', '암호', { keywords: ['해독'] }), bell: mini('bell', '종', { aliases: ['풍경'] }), prime: mini('prime', '소수'),
    hangul: mini('hangul', '한글'), lullaby: mini('lullaby', '자장가', { keywords: ['노래'] }), octopus: mini('octopus', '문어'),
    thread: mini('thread', '실', { keywords: ['뜨개질'] }), thunder: mini('thunder', '천둥', { aliases: ['벼락'] }), sleep: mini('sleep', '잠', { aliases: ['잠들기'] })
  } });
  var m4 = function (list) { return list.map(mh).join(); };
  check(m4(['봄바람', '칼바람이 불어', '바람소리', '바람직한', '바람둥이', '바람기']) === 'wind,wind,wind,wiki,wiki,wiki', "바람: head noun only (봄바람·칼바람), front only with a SAFE_TAIL (바람소리); 바람직한/바람둥이/바람기 no (" + m4(['봄바람', '칼바람이 불어', '바람소리', '바람직한', '바람둥이', '바람기']) + ')');
  check(m4(['흑진주', '진주목걸이', '진주빛', '박진주', '진주시', '진주시청']) === 'pearl,pearl,pearl,wiki,wiki,wiki', '진주: 흑진주/진주목걸이/진주빛 yes; surname + 진주 and 진주시 (city) no (' + m4(['흑진주', '진주목걸이', '진주빛', '박진주', '진주시', '진주시청']) + ')');
  check(m4(['색유리', '유리공예', '유리컵', '김유리', '유리수', '유리한 위치']) === 'glass,glass,glass,wiki,wiki,wiki', '유리: 색유리/유리공예/유리컵 yes; 김유리/유리수/유리한 no (' + m4(['색유리', '유리공예', '유리컵', '김유리', '유리수', '유리한 위치']) + ')');
  check(m4(['점자블록', '득점자', '만점자', '암호해독', '암호화', '암호화폐']) === 'braille,wiki,wiki,cipher,cipher,wiki', '점자 front only (득점자/만점자 no); 암호해독 = two words of one room; 암호화폐 no (' + m4(['점자블록', '득점자', '만점자', '암호해독', '암호화', '암호화폐']) + ')');
  check(m4(['풍경소리', '풍경화', '시골풍경', '소수판별', '소수민족']) === 'bell,wiki,wiki,wiki,wiki', 'unlisted alias only with a SAFE_TAIL (풍경소리 yes, 풍경화/시골풍경 no); 소수 never compounds (' + m4(['풍경소리', '풍경화', '시골풍경', '소수판별', '소수민족']) + ')');
  check(mh('한글날 노래') === 'hangul' && mh('한글날') === 'hangul' && mh('노래') === 'lullaby', "a name compound beats a plain keyword word ('한글날 노래' → 한글, 노래 = 자장가 키워드)");
  check(m4(['문어octopus', 'octopus문어', '문어거든요', '문어였나', '한글이야말로', '문어라는 동물', '문어지?']) === 'octopus,octopus,octopus,octopus,hangul,octopus,octopus', 'Hangul+ASCII written together split; endings 거든요/였나/이야말로/라는/지 (' + m4(['문어octopus', 'octopus문어', '문어거든요', '문어였나', '한글이야말로', '문어라는 동물', '문어지?']) + ')');
  check(m4(['뜨개질하는 법', '천둥치는 밤', '벼락치기', '잠들기전', '잠들기전에']) === 'thread,thunder,wiki,sleep,sleep', 'keyword + 하다 (뜨개질하는), 치다 only for CHIDA (천둥치는 yes, 벼락치기 no), -기 전 (' + m4(['뜨개질하는 법', '천둥치는 밤', '벼락치기', '잠들기전', '잠들기전에']) + ')');
  check((BRAIN.nodeFromUrl('https://ko.wikipedia.org/wiki/' + encodeURIComponent('봄바람')) || {}).id === 'wind' && BRAIN.nodeFromUrl('https://ko.wikipedia.org/wiki/' + encodeURIComponent('득점자')) === null, 'url: same compound positions (봄바람 → wind, 득점자 → none)');
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
      /* E4: 집에 있는 날 반응은 그 활동의 후보(act.reactions, 없으면 졸림) 가운데 하나 — 졸림·덤덤만 (처음·읽음이 없다) */
      var hAct = (W.homeActivities || []).filter(function (x) { return x.id === a.events[0].activity; })[0];
      var hCands = (hAct && hAct.reactions && hAct.reactions.length) ? hAct.reactions : ['졸림'];
      if (['졸림', '덤덤'].indexOf(a.reaction) < 0 || hCands.indexOf(a.reaction) < 0 || a.events[1].reaction !== a.reaction || a.receipt.reaction !== a.reaction) errors.push('seed ' + seed + ' home reaction ' + a.reaction + ' for ' + a.events[0].activity);
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
  /* R1 · MODEL_VOICE: 모델이 기억할 곳을 안 골랐다 → 두뇌가 마지막 곳으로 대신 (fallback 표시), 한 줄은 지어내지 않는다 */
  check(sl.receipt.rememberedIdx === 2 && sl.receipt.rememberedBy === 'fallback' && sl.poster && sl.poster.line === null, 'sloppy mcp replay: memory falls back to the last stop (rememberedBy fallback), no composed line');
  check(sl.reaction === null && sl.reactionRaw === '이상한값' && sl.reactionBy === 'model' && sl.receipt.reactionLine === null, 'unknown reaction kept as reactionRaw, nothing invented (' + sl.reaction + '/' + sl.reactionRaw + ')');
  var slDemo = BRAIN.replay(JSON.parse(JSON.stringify(sloppy)), { by: 'demo' });
  check(slDemo.receipt.rememberedIdx >= 0 && slDemo.poster && !hasBrace(slDemo.poster.line) && BRAIN.REACTIONS.indexOf(slDemo.reaction) >= 0 && slDemo.reactionBy === 'demo-rules', 'demo-rules replay (by demo) still picks a memory, composes a line, replaces an invalid reaction');
  var homeRp = BRAIN.replay([{ type: 'stay_home', t: 0, activity: 'nap' }, { type: 'wrap_up', t: 2000, reaction: '졸림' }], { by: 'human' });
  var napLine = ((W.homeActivities || []).filter(function (a) { return a.id === 'nap'; })[0] || { line: '담요 속에서 낮잠' }).line;
  check(homeRp.kind === 'home' && homeRp.poster.type === 'note' && homeRp.poster.line === napLine && homeRp.receipt.activity.id === 'nap', 'home replay (' + homeRp.poster.line + ')');
  var emptyRp = BRAIN.replay([{ type: 'empty_turn', t: 0 }], { by: 'human' });
  check(emptyRp.kind === 'empty' && emptyRp.poster === null && emptyRp.receipt === null, 'empty replay');

  /* 이 WORLD 의 실제 낱말로 (있는 방만) — 합성어 머리말 · 구절 안 한 글자 · 조사 붙은 합성어 */
  section('matchHint on this WORLD — ' + label);
  var mw = function (h) { var m = BRAIN.matchHint(h); return m.kind === 'node' ? m.nodeId : m.kind; };
  if (W.nodes.hat) check(['털모자', '빨간모자를 쓴 소녀', '중절모자'].every(function (h) { return mw(h) === 'hat'; }), '털모자/빨간모자를/중절모자 → hat');
  if (W.nodes.octopus) check(mw('문어발이 몇 개야') === 'octopus' && mw('문어발') === 'octopus', '문어발 → octopus (' + mw('문어발') + ')');
  if (W.nodes.dream && W.nodes.snow) check(mw('눈 움직임이 궁금해') === 'dream' && mw('눈 오는 밤') === 'snow', "'눈 움직임이' → 꿈, '눈 오는 밤' → 눈 (" + mw('눈 움직임이 궁금해') + ')');
  if (W.nodes.rainbow && W.nodes.rain) check(mw('비 온 뒤에 대해 알려줘') === 'rainbow' && mw('비 오는 날') === 'rain', "'비 온 뒤에' → 무지개, '비 오는 날' → 비 (" + mw('비 온 뒤에 대해 알려줘') + ')');
  if (W.nodes.knot) check(['노트북을 샀어', '노트북이 고장났어', '에코백을 들고', '코스모스'].every(function (h) { return mw(h) === 'wiki'; }), '노트북을/노트북이/에코백을/코스모스 → wiki');

  /* brain3 말뭉치: 실제 world.js 에서만 (가짜 WORLD 의 방 이름은 이 말뭉치의 정답과 다르다) */
  if (W.nodes.octopus && W.nodes.zero && W.nodes.dream && W.nodes.knot_theory) {
    var mcases = matcherCorpus(W), byG = {};
    section('matchHint word-rule corpus (R/#7/#101, ' + mcases.length + ' cases) — ' + label);
    mcases.forEach(function (c) {
      var r = c.u ? ((BRAIN.nodeFromUrl(c.u) || {}).id || 'none') : mw(c.h);
      var g = byG[c.g] = byG[c.g] || { n: 0, bad: [] };
      g.n++;
      if (c.not ? r === c.not : r !== c.exp) g.bad.push((c.h || c.u) + ' → ' + r + (c.not ? ' (≠' + c.not + ')' : ' (want ' + c.exp + ')'));
    });
    Object.keys(byG).forEach(function (g) {
      check(byG[g].bad.length === 0, g + ': ' + (byG[g].n - byG[g].bad.length) + '/' + byG[g].n + (byG[g].bad.length ? ' e.g. ' + byG[g].bad.slice(0, 5).join(' | ') : ''));
    });
  }

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
  await waveESuite(label, W);
  await waveFSuite(label, W);
}

/* ───────── 물결 F: 모델의 반응·말은 그대로 (R1) · 호기심 메모 들어오기 (R2) · 나가기 (R3) ─────────
   계약: docs/MODEL_VOICE.md · docs/CURIOSITY_NOTES.md · docs/PROTOCOL.md §1 wrap_up */
async function waveFSuite(label, W) {
  var ids = Object.keys(W.nodes).filter(function (id) { return ['door_out', 'slow_room', 'letter_room'].indexOf(id) < 0 && W.nodes[id].corner !== 'wild'; });
  var quick = function (t) { return Promise.resolve(/^(모자|조개|비|구름|단추)/.test(t) ? { ok: true, title: t, extract: t + '는 무엇이다. 둘째 문장.', url: 'https://ko.wikipedia.org/wiki/' + encodeURIComponent(t), thumb: null, links: ['베레모', '깃털'] } : { ok: false, reason: 'missing' }); };
  var t, seed, errs;
  var clueId = ids.filter(function (id) { return W.nodes[id].clue && W.nodes[id].wiki; })[0];
  var other = ids.filter(function (id) { return id !== clueId; })[0];
  function out(evs, by, st) { return BRAIN.replay(JSON.parse(JSON.stringify(evs)), { by: by, now: NOW_DAY, seed: 7, state: st || { visits: {} } }); }
  var walk = [{ type: 'depart', t: 0, hint: '' }, { type: 'peek', t: 1, target: { kind: 'room', id: clueId } }, { type: 'peek', t: 2, target: { kind: 'room', id: other } }, { type: 'return', t: 3, reason: 'enough' }];

  section('R1 model/human reaction kept as given — ' + label);
  var visitedAll = {}; ids.forEach(function (id) { visitedAll[id] = 3; });
  ['mcp', 'human'].forEach(function (by) {
    var who = by === 'mcp' ? 'model' : 'human';
    BRAIN.REACTIONS.forEach(function (r) {
      /* 처음 온 데도 읽은 것도 없는 길 (데모 규칙이면 폴짝·우쭐은 거를 길) */
      var x = out(walk.concat([{ type: 'remember', t: 4, stopIdx: 0, line: '그냥 지나가다 봤어' }, { type: 'hang_poster', t: 5 }, { type: 'wrap_up', t: 6, reaction: r }]), by, { visits: visitedAll });
      check(x.reaction === r && x.receipt.reaction === r && x.reactionBy === who && x.receipt.reactionBy === who && x.events[x.events.length - 1].reaction === r && x.reactionRaw === null,
        by + ' out-day reaction ' + r + ' kept exactly (got ' + x.reaction + ', by ' + x.reactionBy + ')');
      check(x.receipt.reactionLine === null && x.reactionLine === null, by + ' out-day ' + r + ' without a line → no template line (' + x.receipt.reactionLine + ')');
      var h = BRAIN.replay([{ type: 'stay_home', t: 0, activity: 'nap' }, { type: 'wrap_up', t: 1, reaction: r }], { by: by, seed: 3 });
      check(h.reaction === r && h.events[1].reaction === r && h.reactionBy === who && h.receipt.reactionLine === null, by + ' home-day reaction ' + r + ' kept exactly, no template line (got ' + h.reaction + ' · ' + h.receipt.reactionLine + ')');
    });
    var none = out(walk.concat([{ type: 'remember', t: 4, stopIdx: 1 }, { type: 'wrap_up', t: 6 }]), by);
    check(none.reaction === null && none.reactionBy === null && none.receipt.reactionLine === null && !('reaction' in none.events[none.events.length - 1]), by + ' out-day: no reaction given → null, nothing invented (' + none.reaction + ')');
    var hn = BRAIN.replay([{ type: 'stay_home', t: 0, activity: 'nap' }, { type: 'wrap_up', t: 1 }], { by: by });
    check(hn.reaction === null && hn.reactionBy === null && hn.receipt.reactionLine === null && hn.receipt.reactionEmoji === null && !('reaction' in hn.events[1]), by + ' home-day: no reaction → null');
    var noWrap = out(walk, by);
    check(noWrap.reaction === null && noWrap.reactionBy === null, by + ' no wrap_up at all → reaction null');
  });
  var lineA = out(walk.concat([{ type: 'wrap_up', t: 6, reaction: '덤덤', line: '  오늘은 이 정도. 문 앞 바람이 셌어  ' }]), 'mcp');
  check(lineA.receipt.reactionLine === '  오늘은 이 정도. 문 앞 바람이 셌어  ' && lineA.reactionLine === lineA.receipt.reactionLine, 'model reaction line (wrap_up.line) kept verbatim, spaces and all');
  var lineB = out(walk.concat([{ type: 'wrap_up', t: 6, reaction: '졸림', reactionLine: '하품' }]), 'mcp');
  check(lineB.receipt.reactionLine === '하품', 'wrap_up.reactionLine is accepted as the line too');
  var rawLong = '갸웃갸웃 하다가 조금 웃었어 그리고 또 갸웃했어 그래서 결국에는 아무 표정도 아닌 표정';
  var raw = out(walk.concat([{ type: 'wrap_up', t: 6, reaction: rawLong }]), 'mcp');
  check(raw.reaction === null && raw.reactionRaw === rawLong && raw.receipt.reactionRaw === rawLong && raw.reactionBy === 'model' && raw.receipt.reactionEmoji === null && raw.events[raw.events.length - 1].reaction === rawLong,
    'unknown reaction string → reactionRaw in full (' + rawLong.length + ' chars), reaction null, event untouched');
  check(BRAIN.clipShown(rawLong, 40) === rawLong.slice(0, 40) + '…' && BRAIN.clipShown('폴짝', 40) === '폴짝', 'clipShown: first 40 + … only when longer');
  check(out(walk.concat([{ type: 'wrap_up', t: 6, reaction: ' 폴짝 ' }]), 'mcp').reaction === '폴짝', 'known reaction with stray spaces → that reaction');
  check(out(walk.concat([{ type: 'wrap_up', t: 6, reaction: 5 }]), 'mcp').reaction === null, 'non-string reaction → null (not computed)');
  /* 데모 규칙은 그대로 정직하게 거른다 */
  var dj = out(walk.concat([{ type: 'wrap_up', t: 6, reaction: '폴짝' }]), 'demo', { visits: visitedAll });
  check(dj.reaction !== '폴짝' && dj.reactionBy === 'demo-rules' && typeof dj.receipt.reactionLine === 'string', 'demo-rules replay still gates 폴짝 with nothing new (' + dj.reaction + ') and keeps its template line');
  errs = [];
  for (seed = 1; seed <= 120; seed++) {
    t = await BRAIN.plan(baseInput(seed, { fetchWiki: quick }));
    if (t.kind === 'empty') { if (t.reactionBy !== null || t.reaction !== null) errs.push('empty ' + seed); continue; }
    if (t.reactionBy !== 'demo-rules' || t.reactionRaw !== null || t.reactionLine !== t.receipt.reactionLine || BRAIN.REACTIONS.indexOf(t.reaction) < 0) errs.push('seed ' + seed + ' ' + t.kind + ' ' + t.reactionBy);
  }
  check(errs.length === 0, 'demo plans: reactionBy demo-rules, reactionRaw null, trip.reactionLine = receipt.reactionLine (' + errs.length + ' errors)' + (errs.length ? ' e.g. ' + errs[0] : ''));

  section('R1 other model-given values (line · memory · hint note · activity · memo) — ' + label);
  var pl = out(walk.concat([{ type: 'remember', t: 4, stopIdx: 1, line: '여기 오래 있었어…  정말로' }, { type: 'wrap_up', t: 6, reaction: '덤덤' }]), 'mcp');
  check(pl.poster.line === '여기 오래 있었어…  정말로' && pl.receipt.rememberedIdx === 1 && pl.receipt.rememberedBy === 'model', 'remember line kept verbatim, chosen stop kept, rememberedBy model');
  var nl = out(walk.concat([{ type: 'remember', t: 4, stopIdx: 0 }, { type: 'wrap_up', t: 6, reaction: '덤덤' }]), 'mcp');
  check(nl.poster.line === null && nl.receipt.rememberedBy === 'model', 'remember without a line → poster line null (no template)');
  /* 번호를 글('0')로 줘도 모델이 고른 곳 그대로 (그 뜻이 분명하니까). 범위 밖 글('7')·숫자 아닌 글은 fallback */
  var strIdx = out(walk.concat([{ type: 'remember', t: 4, stopIdx: '0', line: '그거' }, { type: 'wrap_up', t: 6 }]), 'mcp');
  check(strIdx.receipt.rememberedIdx === 0 && strIdx.receipt.rememberedBy === 'model', 'stopIdx "0" given as text → stop 0, rememberedBy model (' + strIdx.receipt.rememberedIdx + '/' + strIdx.receipt.rememberedBy + ')');
  [99, -1, 0.5, '7', 'x', '1.5'].forEach(function (bad) {
    var fb = out(walk.concat([{ type: 'remember', t: 4, stopIdx: bad, line: '그거' }, { type: 'wrap_up', t: 6 }]), 'mcp');
    check(fb.receipt.rememberedIdx === 1 && fb.receipt.rememberedBy === 'fallback' && fb.poster.title === fb.receipt.stops[1].name, 'stopIdx ' + JSON.stringify(bad) + ' → last stop, rememberedBy fallback (PROTOCOL §2)');
  });
  var noRem = out(walk.concat([{ type: 'wrap_up', t: 6 }]), 'human');
  check(noRem.receipt.rememberedIdx === 1 && noRem.receipt.rememberedBy === 'fallback' && noRem.poster.line === null, 'no remember event → last stop as fallback, no line');
  var hintNode = ids.filter(function (id) { return BRAIN.matchHint(W.nodes[id].name).kind === 'node' && BRAIN.matchHint(W.nodes[id].name).nodeId === id && id !== clueId && id !== other; })[0];
  if (hintNode) {
    var ig = BRAIN.replay([{ type: 'depart', t: 0, hint: W.nodes[hintNode].name, followHint: false }].concat(walk.slice(1)).concat([{ type: 'wrap_up', t: 6, reaction: '덤덤' }]), { by: 'mcp', now: NOW_DAY });
    var igD = BRAIN.replay([{ type: 'depart', t: 0, hint: W.nodes[hintNode].name, followHint: false }].concat(walk.slice(1)).concat([{ type: 'wrap_up', t: 6, reaction: '덤덤' }]), { by: 'demo', now: NOW_DAY });
    check(ig.hint.followed === 'ignored' && ig.hint.note === null && igD.hint.note, 'ignored hint: no "다른 데로 갔어" note on a model trip (demo-rules keeps its note)');
  }
  var hd = BRAIN.replay([{ type: 'stay_home', t: 0, activity: 'nap' }, { type: 'wrap_up', t: 1, reaction: '졸림' }], { by: 'mcp' });
  var napAct = (W.homeActivities || []).filter(function (a) { return a.id === 'nap'; })[0];
  check(hd.receipt.activity.id === 'nap' && hd.receipt.activity.by === 'model' && hd.receipt.activity.detail === '' && hd.poster.detail === '' && (!napAct || hd.poster.line === napAct.line),
    'model home day: activity line from the list it chose from, back-of-note detail only what the model wrote (none → "")');
  var hd2 = BRAIN.replay([{ type: 'stay_home', t: 0, activity: 'nap', line: '담요에서 뒹굴', detail: '그냥' }, { type: 'wrap_up', t: 1 }], { by: 'mcp' });
  check(hd2.poster.line === '담요에서 뒹굴' && hd2.poster.detail === '그냥', 'model home day: its own line/detail verbatim');
  var hdDemo = BRAIN.replay([{ type: 'stay_home', t: 0, activity: 'nap' }, { type: 'wrap_up', t: 1, reaction: '졸림' }], { by: 'demo' });
  check(!napAct || hdDemo.receipt.activity.detail === (napAct.detail || ''), 'demo-rules home replay keeps the activity detail');
  var hf = BRAIN.replay([{ type: 'stay_home', t: 0, activity: 'no_such_activity', line: '뭔가 했어' }, { type: 'wrap_up', t: 1 }], { by: 'mcp' });
  check(hf.receipt.activity.id === 'custom' && hf.receipt.activity.by === 'fallback' && hf.receipt.activity.asked === 'no_such_activity' && hf.poster.line === '뭔가 했어', 'activity the room cannot do → custom, by fallback, asked id kept, model line kept');
  var longMemo = { tomorrow: '내일은 ' + new Array(25).join('조개 ') + '끝', notes: {} }; longMemo.notes[clueId] = '짧은 메모';
  var lm = out(walk.concat([{ type: 'wrap_up', t: 6, memo: longMemo }]), 'mcp').memo;
  check(lm && lm.tomorrow.length <= 60 && /…$/.test(lm.tomorrow) && lm.original && lm.original.tomorrow === longMemo.tomorrow && !(lm.original.notes) && lm.notes[clueId] === '짧은 메모',
    'memo over 60: shown with … and the original kept in memo.original (MODEL_VOICE §3)');
  var hung = out(walk.concat([{ type: 'remember', t: 4, stopIdx: 0 }, { type: 'hang_poster', t: 5 }, { type: 'wrap_up', t: 6 }]), 'mcp');
  check(hung.posterHung === true && nl.posterHung === false, 'posterHung says whether the chooser hung the poster');

  section('R2 notes in — ' + label);
  /* 메모가 없음 · [] · 내려놓은 것만 · 모양이 틀린 것 · 물건(object) 메모 · 없는 방 → 결과가 바이트 하나까지 같다 (2000 시드) */
  var target = ids.filter(function (id) { return !W.nodes[id].linger; })[ids.length > 6 ? 5 : 1];
  var variants = [
    [],
    [{ id: 'cn_sd', text: '내려놓음', about: { kind: 'node', id: target }, by: 'model', session: 'trip_a', at: '2026-11-01T00:00:00Z', status: 'set_down' }],
    [null, 5, 'x', { about: { kind: 'room', id: target } }, { about: { kind: 'node', id: 'no_such_room' } }, { id: 'cn_o', text: '물건', about: { kind: 'object', id: target }, status: 'active' }]
  ];
  errs = [];
  for (seed = 1; seed <= 2000; seed++) {
    var st0 = { visits: seed % 3 ? {} : { hat: 1 }, affinity: seed % 4 ? {} : { sea: 2 }, lantern: seed % 9, recent: [], todayOut: seed % 3, posters: seed % 3 };
    var inp = baseInput(seed, { online: seed % 2 === 0, fetchWiki: quick, hint: seed % 5 === 0 ? (W.nodes.hat ? '모자' : '') : '', state: st0 });
    var ref = JSON.stringify(await BRAIN.plan(inp));
    for (var vi = 0; vi < variants.length; vi++) {
      var o = JSON.stringify(await BRAIN.plan(Object.assign({}, inp, { state: Object.assign({}, st0, { notes: variants[vi] }) })));
      if (o !== ref) { errs.push('seed ' + seed + ' variant ' + vi); break; }
    }
  }
  check(errs.length === 0, 'notes absent / [] / set_down only / malformed / object-only → byte-identical plans over 2000 seeds (' + errs.length + ' diffs)' + (errs.length ? ' e.g. ' + errs[0] : ''));
  var nn = BRAIN.normalizeNotes([{ id: 'a', status: 'set_down', about: { kind: 'node', id: target } }, { id: 'b' }, { id: 'c', status: 'active' }, { id: 'd' }, { id: 'e' }, { id: 'f' }]);
  check(nn.length === 3 && nn.map(function (n) { return n.id; }).join() === 'b,c,d', 'normalizeNotes: drops non-active, keeps the first (newest) 3');
  /* 메모가 가리키는 방이 더 자주 뽑힌다. 길이 같은 날은 나머지(시각·스티커·종이·기념품)가 전부 같다 = 새 난수 없음 */
  var hit0 = 0, hit1 = 0, same = 0, drawDiff = [], noteText = '이 문장은 두뇌가 옮기면 안 되는 메모 글 7f3a';
  var notes = [{ id: 'cn_t', text: noteText, about: { kind: 'node', id: target }, by: 'model', session: 'trip_x', at: '2026-11-06T10:00:00Z', status: 'active' }];
  for (seed = 1; seed <= 600; seed++) {
    var stA = { visits: {}, affinity: {}, lantern: 3, recent: [], todayOut: 0 };
    var a = await BRAIN.plan(baseInput(seed, { online: false, state: stA }));
    var b = await BRAIN.plan(baseInput(seed, { online: false, state: Object.assign({}, stA, { notes: notes }) }));
    if (a.kind === 'out' && a.receipt.stops.some(function (x) { return x.nodeId === target; })) hit0++;
    if (b.kind === 'out' && b.receipt.stops.some(function (x) { return x.nodeId === target; })) hit1++;
    if (JSON.stringify(b).indexOf(noteText) >= 0 || JSON.stringify(b).indexOf('cn_t') >= 0) drawDiff.push('seed ' + seed + ' quoted the note');
    if (a.kind === b.kind && a.kind === 'out' && JSON.stringify(a.receipt.stops.map(function (x) { return x.nodeId; })) === JSON.stringify(b.receipt.stops.map(function (x) { return x.nodeId; }))) {
      same++;
      if (JSON.stringify(a) !== JSON.stringify(b)) drawDiff.push('seed ' + seed + ' same route but different output');
    }
    if (a.kind !== b.kind) drawDiff.push('seed ' + seed + ' kind changed ' + a.kind + '→' + b.kind);
  }
  console.log('  note about ' + target + ': visited ' + hit0 + ' → ' + hit1 + ' of 600 · same-route seeds ' + same);
  check(hit1 > hit0 * 1.3 && hit1 > hit0 + 10, 'an active note about ' + target + ' raises how often the demo walks there (' + hit0 + ' → ' + hit1 + ')');
  check(same > 100 && drawDiff.length === 0, 'note boost draws no new numbers: same route → identical trip; kind never changes; note text never quoted (' + drawDiff.length + ' errors)' + (drawDiff.length ? ' e.g. ' + drawDiff[0] : ''));
  var four = [{ id: 'n1', about: { kind: 'node', id: other } }, { id: 'n2', about: { kind: 'node', id: other } }, { id: 'n3', about: { kind: 'node', id: other } }, { id: 'n4', about: { kind: 'node', id: target } }];
  errs = [];
  for (seed = 1; seed <= 150; seed++) {
    var p3 = JSON.stringify(await BRAIN.plan(baseInput(seed, { online: false, state: { visits: {}, notes: four.slice(0, 3) } })));
    var p4 = JSON.stringify(await BRAIN.plan(baseInput(seed, { online: false, state: { visits: {}, notes: four } })));
    if (p3 !== p4) errs.push(seed);
  }
  check(errs.length === 0, 'only the newest 3 notes count: a 4th note changes nothing (' + errs.length + ' diffs)');
  var rpN = out(walk.concat([{ type: 'wrap_up', t: 6, reaction: '덤덤' }]), 'mcp', { visits: {}, notes: notes });
  check(JSON.stringify(rpN) === JSON.stringify(out(walk.concat([{ type: 'wrap_up', t: 6, reaction: '덤덤' }]), 'mcp', { visits: {} })), 'replay: notes in state change nothing (the chooser already chose)');

  section('R3 notes out — ' + label);
  errs = []; var nNote = 0, nOutT = 0;
  for (seed = 1; seed <= 300; seed++) {
    t = await BRAIN.plan(baseInput(seed, { fetchWiki: quick }));
    if (!(t.setDown && t.setDown.length === 0)) errs.push('seed ' + seed + ' setDown not []');
    if (t.kind !== 'out') { if (t.noteOut !== null) errs.push('seed ' + seed + ' ' + t.kind + ' has noteOut'); continue; }
    nOutT++;
    if (t.noteOut === null) continue;
    nNote++;
    var nd = W.nodes[t.noteOut.about && t.noteOut.about.id];
    if (t.noteOut.by !== 'demo-rules' || t.noteOut.about.kind !== 'node' || !nd) errs.push('seed ' + seed + ' bad noteOut ' + JSON.stringify(t.noteOut));
    else if (t.noteOut.text !== t.memo.tomorrow) errs.push('seed ' + seed + ' noteOut text != memo');
    else if (t.noteOut.text.indexOf(nd.name) < 0 && !/^[0-9]/.test(nd.name)) errs.push('seed ' + seed + ' about ' + nd.name + ' not in text: ' + t.noteOut.text);
    else if (t.receipt.stops.some(function (x) { return x.nodeId === nd.id; })) errs.push('seed ' + seed + ' about a room visited this trip');
  }
  check(nNote > 0 && errs.length === 0, 'plan noteOut = { memo text, about = the "내일은 X" room, by demo-rules } or null; home/empty null; setDown [] (' + nNote + '/' + nOutT + ' out trips, ' + errs.length + ' errors)' + (errs.length ? ' e.g. ' + errs[0] : ''));
  var noteLong = '조개를 귀에 대면 소리가 나. 다른 소리 나는 것도 궁금해. 파도 소리랑 같은지 다른지도 다음에 들어 보고 싶어';
  var ro = out(walk.concat([{ type: 'wrap_up', t: 6, note: { text: noteLong, about: { kind: 'node', id: other } }, setDown: ['cn_1', 7, '', 'cn_2', null] }]), 'mcp');
  check(ro.noteOut && ro.noteOut.text === noteLong && noteLong.length > 60 && ro.noteOut.by === 'model' && ro.noteOut.about.kind === 'node' && ro.noteOut.about.id === other, 'mcp replay: note copied verbatim (full ' + noteLong.length + ' chars), about kept, by model');
  check(JSON.stringify(ro.setDown) === '["cn_1","cn_2"]', 'mcp replay: setDown = the string ids it gave (' + JSON.stringify(ro.setDown) + ')');
  var rs1 = out(walk.concat([{ type: 'wrap_up', t: 6, note: '그냥 한 줄' }]), 'mcp');
  check(rs1.noteOut && rs1.noteOut.text === '그냥 한 줄' && !('about' in rs1.noteOut) && rs1.noteOut.by === 'model', 'plain-string note → { text, by model }');
  check(out(walk.concat([{ type: 'wrap_up', t: 6, note: '   ' }]), 'mcp').noteOut === null && out(walk.concat([{ type: 'wrap_up', t: 6 }]), 'mcp').noteOut === null, 'no note / blank note → noteOut null (nothing invented)');
  var badAbout = out(walk.concat([{ type: 'wrap_up', t: 6, note: { text: 'x', about: { kind: 'feeling', id: 'love' } } }]), 'mcp');
  check(badAbout.noteOut && !('about' in badAbout.noteOut), 'note with a malformed about keeps the text, drops the about');
  var rh = out(walk.concat([{ type: 'wrap_up', t: 6, note: '사람 메모', setDown: ['cn_1'] }]), 'human');
  check(rh.noteOut && rh.noteOut.by === 'human' && rh.setDown.length === 0, 'human replay: note labelled human; setDown ignored (only the model sets down its interest)');
  var rhome = BRAIN.replay([{ type: 'stay_home', t: 0, activity: 'nap' }, { type: 'wrap_up', t: 1, note: { text: '담요 무늬가 궁금해' }, setDown: ['cn_9'] }], { by: 'mcp' });
  var rempty = BRAIN.replay([{ type: 'empty_turn', t: 0 }, { type: 'wrap_up', t: 1, setDown: ['cn_8'] }], { by: 'mcp' });
  check(rhome.noteOut && rhome.noteOut.text === '담요 무늬가 궁금해' && rhome.setDown[0] === 'cn_9' && rempty.kind === 'empty' && rempty.setDown[0] === 'cn_8' && rempty.noteOut === null, 'home and empty-turn replays carry note / setDown too');
  var rsStr = out(walk.concat([{ type: 'wrap_up', t: 6, setDown: 'cn_3' }]), 'mcp');
  check(JSON.stringify(rsStr.setDown) === '["cn_3"]', 'mcp replay: one id given as a plain string → setDown ["cn_3"] (' + JSON.stringify(rsStr.setDown) + ')');
  /* 빈 차례 뒤의 마무리: 모델이 낸 반응·줄도 호기심 메모처럼 그대로. 데모 규칙(by demo)의 빈 차례는 예전대로 비어 있다 */
  var remptyR = BRAIN.replay([{ type: 'empty_turn', t: 0 }, { type: 'wrap_up', t: 1, reaction: '우쭐', line: '쉬어도 돼', note: '쉬는 것도 궁금해' }], { by: 'mcp' });
  var remptyD = BRAIN.replay([{ type: 'empty_turn', t: 0 }, { type: 'wrap_up', t: 1, reaction: '우쭐', line: '쉬어도 돼' }], { by: 'demo' });
  check(remptyR.reaction === '우쭐' && remptyR.reactionBy === 'model' && remptyR.reactionLine === '쉬어도 돼' && remptyR.noteOut.text === '쉬는 것도 궁금해' && remptyR.receipt === null && remptyR.poster === null, 'mcp empty turn + wrap_up: reaction / line / note kept, nothing else invented');
  check(remptyD.reaction === null && remptyD.reactionBy === null && remptyD.reactionLine === null, 'demo empty turn: still nothing (unchanged)');
}

/* ───────── 물결 E: 기념품(owned) · 집에 있는 날 반응 · 숫자 이름 방 ───────── */
async function waveESuite(label, W) {
  var ids = Object.keys(W.nodes), allVisited = {}; ids.forEach(function (k) { allVisited[k] = 2; });
  var allSv = Object.keys(W.souvenirs || {});
  var okAll = function (t) { return Promise.resolve({ ok: true, title: t, extract: t + '는 무엇이다. 둘째 문장.', url: 'https://ko.wikipedia.org/wiki/' + encodeURIComponent(t), thumb: null, links: ['베레모', '깃털', '단추', '조개'] }); };
  function stV(o) { return Object.assign({ visits: allVisited, affinity: {}, lantern: 3, recent: [], todayOut: 0 }, o); }
  function onRoute(t, sv) { return t.receipt.stops.some(function (s) { return s.nodeId && !s.wild && W.nodes[s.nodeId] && W.nodes[s.nodeId].souvenir === sv; }); }
  var seed, t, errs;

  /* E3b: state.owned 가 있으면 '이번 길에 들른 방 중 아직 없는 기념품' (35% 한 번). 없으면 옛 규칙(처음 온 방만) */
  section('souvenir from owned (E3b) — ' + label);
  var seenSv = 0, outN = 0, allOwnedSv = 0; errs = [];
  for (seed = 1; seed <= 300; seed++) {
    t = await BRAIN.plan(baseInput(seed, { state: stV({ owned: [] }), fetchWiki: okAll }));
    if (t.kind !== 'out') continue;
    outN++;
    if (t.receipt.souvenir) { seenSv++; if (!onRoute(t, t.receipt.souvenir)) errs.push('seed ' + seed + ' off-route ' + t.receipt.souvenir); }
    var t2 = await BRAIN.plan(baseInput(seed, { state: stV({ owned: allSv.slice() }), fetchWiki: okAll }));
    if (t2.receipt.souvenir) allOwnedSv++;
    /* owned 는 기념품 말고는 아무것도 바꾸지 않는다 (난수 그대로) */
    var t0 = await BRAIN.plan(baseInput(seed, { state: stV({}), fetchWiki: okAll }));
    var x = JSON.parse(JSON.stringify(t)), y = JSON.parse(JSON.stringify(t0)); x.receipt.souvenir = y.receipt.souvenir = null;
    if (JSON.stringify(x) !== JSON.stringify(y)) errs.push('seed ' + seed + ' owned changed more than receipt.souvenir');
    if (t0.receipt.souvenir) errs.push('seed ' + seed + ' owned missing + all visited → old rule gives no souvenir, got ' + t0.receipt.souvenir);
  }
  check(seenSv > 0, 'all visited + owned [] → souvenirs appear (' + seenSv + '/' + outN + ')');
  check(allOwnedSv === 0, 'all owned → no souvenir (' + allOwnedSv + ')');
  var mixSeen = 0, hints = ['', '깃털', '모자의 역사', 'https://example.org/feather/1', '단추', '아무도모르는제목'];
  for (seed = 1; seed <= 400; seed++) {
    var vis = {}; ids.forEach(function (k, i) { if ((i * 7 + seed) % 3 === 0) vis[k] = 1; });
    var owned = allSv.filter(function (s, i) { return (i + seed) % 3 === 0; });
    t = await BRAIN.plan(baseInput(seed, { hint: hints[seed % hints.length], state: stV({ visits: vis, owned: owned }) }));
    if (t.kind !== 'out' || !t.receipt.souvenir) continue;
    mixSeen++;
    if (owned.indexOf(t.receipt.souvenir) >= 0) errs.push('seed ' + seed + ' owned souvenir again ' + t.receipt.souvenir);
    if (!onRoute(t, t.receipt.souvenir)) errs.push('seed ' + seed + ' off-route ' + t.receipt.souvenir);
  }
  check(mixSeen > 0, 'mixed visits/owned: souvenirs seen (' + mixSeen + ')');
  /* 힌트(·URL)가 가리킨 방을 다시 가면 그 방 기념품은 안 나온다 (힌트로 되풀이해 뽑기 금지). 처음 가는 힌트 방은 그대로 나올 수 있다 */
  var notFeather = allSv.filter(function (s) { return s !== 'feather'; }), hintStarts = 0, urlOut = 0, firstHint = 0;
  if (W.nodes.feather && W.nodes.feather.souvenir === 'feather') {
    for (seed = 1; seed <= 300; seed++) {
      var hf = await BRAIN.plan(baseInput(seed, { hint: '깃털', state: stV({ owned: notFeather }) }));
      if (hf.kind === 'out' && hf.receipt.stops[0].nodeId === 'feather') { hintStarts++; if (hf.receipt.souvenir) errs.push('seed ' + seed + ' hinted revisit yielded ' + hf.receipt.souvenir); }
      var uf = await BRAIN.plan(baseInput(seed, { hint: 'https://example.org/feather/2020', state: stV({ owned: notFeather }) }));
      if (uf.kind === 'out') { urlOut++; if (uf.receipt.souvenir) errs.push('seed ' + seed + ' url-hinted revisit yielded ' + uf.receipt.souvenir); }
      var v1 = Object.assign({}, allVisited); delete v1.feather;
      var ff = await BRAIN.plan(baseInput(seed, { hint: '깃털', state: stV({ visits: v1, owned: notFeather }) }));
      if (ff.kind === 'out' && ff.receipt.souvenir === 'feather') firstHint++;
    }
    check(hintStarts > 20 && urlOut > 20, 'hinted revisits seen (' + hintStarts + ' hint, ' + urlOut + ' url)');
    check(firstHint > 0, 'hinted FIRST visit can still give its souvenir (' + firstHint + ')');
  }
  /* 재생도 owned 를 받는다 */
  var src = null;
  for (seed = 1; seed <= 300 && !src; seed++) { var s0 = await BRAIN.plan(baseInput(seed, { state: stV({}), fetchWiki: okAll })); if (s0.kind === 'out' && s0.receipt.stops.some(function (s) { return s.nodeId && W.nodes[s.nodeId] && W.nodes[s.nodeId].souvenir; })) src = s0; }
  var rpSeen = 0;
  for (seed = 1; seed <= 200 && src; seed++) {
    var rpa = BRAIN.replay(JSON.parse(JSON.stringify(src.events)), { by: 'mcp', seed: seed, now: NOW_DAY, state: { visits: allVisited, owned: allSv } });
    if (rpa.receipt.souvenir) errs.push('replay seed ' + seed + ' all owned → ' + rpa.receipt.souvenir);
    var rpe = BRAIN.replay(JSON.parse(JSON.stringify(src.events)), { by: 'mcp', seed: seed, now: NOW_DAY, state: { visits: allVisited, owned: [] } });
    if (rpe.receipt.souvenir) { rpSeen++; if (!onRoute(rpe, rpe.receipt.souvenir)) errs.push('replay seed ' + seed + ' off-route'); }
    var rpn = BRAIN.replay(JSON.parse(JSON.stringify(src.events)), { by: 'mcp', seed: seed, now: NOW_DAY, state: { visits: allVisited } });
    if (rpn.receipt.souvenir) errs.push('replay seed ' + seed + ' no owned + all visited → old rule, got ' + rpn.receipt.souvenir);
  }
  check(!src || rpSeen > 0, 'replay with owned [] can give a souvenir (' + rpSeen + ')');
  check(errs.length === 0, 'souvenir: never owned, never off-route, never from a hinted revisit; owned changes nothing else (' + errs.length + ' errors)' + (errs.length ? ' e.g. ' + errs.slice(0, 3).join(' | ') : ''));

  /* E4: 집에 있는 날 반응은 활동에 맞는 후보에서, 새 난수 없이 (이미 뽑은 줄 난수 하나로) */
  section('home-day reaction by activity (E4) — ' + label);
  var acts = W.homeActivities || [];
  function actOf(id) { return acts.filter(function (a) { return a.id === id; })[0]; }
  var dHome = W.reactions && W.reactions['덤덤'] && Array.isArray(W.reactions['덤덤'].home) && W.reactions['덤덤'].home.length;
  var mayDumdum = dHome && acts.some(function (a) { return (a.reactions || []).indexOf('덤덤') >= 0; });
  var count = {}; errs = [];
  global.__ppolTest = { forceKind: 'home' };
  for (seed = 1; seed <= 200; seed++) {
    for (var lv of [0, 3, 8]) {
      t = await BRAIN.plan(baseInput(seed, { state: { visits: {}, affinity: {}, lantern: lv, recent: [], todayOut: 0, posters: 3 } }));
      count[t.reaction] = (count[t.reaction] || 0) + 1;
      var a = actOf(t.receipt.activity.id), cands = (a && a.reactions && a.reactions.length) ? a.reactions : ['졸림'];
      if (cands.indexOf(t.reaction) < 0) errs.push('seed ' + seed + ' ' + t.receipt.activity.id + ' → ' + t.reaction);
      /* 난수 자리 그대로: r_stay, r_empty, r_activity, t_wrap, 스티커 3, paper, r_line (9개). 반응은 r_line 의 앞자리 */
      var R = BRAIN.rng(seed); R(); R(); R();
      var tw = Math.round(2000 + R() * 2000); R(); R(); R(); var pp = Math.floor(R() * 3), rl = R();
      var good = cands.filter(function (r) { return r === '졸림' || (W.reactions && W.reactions[r] && W.reactions[r].home && W.reactions[r].home.length); });
      if (!good.length) good = ['졸림'];
      var want = good[Math.min(good.length - 1, Math.floor(rl * good.length))];
      if (t.events[1].t !== tw || t.poster.paper !== pp || t.reaction !== want) errs.push('seed ' + seed + ' draw order (t ' + t.events[1].t + '/' + tw + ', paper ' + t.poster.paper + '/' + pp + ', ' + t.reaction + '/' + want + ')');
      var ln = t.receipt.reactionLine || '';
      if (/걸었|다녀왔|갔다 왔|산책|처음|못 읽|여기까지/.test(ln)) errs.push('seed ' + seed + ' home line claims a walk / says the day is over: ' + ln);
    }
  }
  delete global.__ppolTest;
  console.log('  home reactions', JSON.stringify(count));
  check(errs.length === 0, 'home reaction from the activity candidates, same draws, home-true line (' + errs.length + ' errors)' + (errs.length ? ' e.g. ' + errs.slice(0, 3).join(' | ') : ''));
  if (mayDumdum) check(Object.keys(count).length > 1, 'home days over 200 seeds are not all 졸림 (' + JSON.stringify(count) + ')');
  /* 템플릿: '오늘은 여기까지' 처럼 놀이가 끝났다고 읽히는 말 없음 */
  var tpls = [];
  Object.keys(W.reactions || {}).forEach(function (r) { var x = W.reactions[r]; tpls = tpls.concat(x.lines || [], x.home || []); Object.keys(x.when || {}).forEach(function (k) { tpls = tpls.concat(x.when[k]); }); });
  Object.keys(W.lineTemplates || {}).forEach(function (k) { tpls = tpls.concat(W.lineTemplates[k]); });
  var M = W.memoTemplates || {}; Object.keys(M.lead || {}).forEach(function (k) { tpls = tpls.concat(M.lead[k]); }); Object.keys(M.next || {}).forEach(function (k) { tpls = tpls.concat(M.next[k]); });
  tpls = tpls.concat(M.nextNone || [], M.home || [], [M.revisit, M.revisitToday, M.revisitUndated].filter(Boolean));
  check(tpls.length > 0 && !tpls.some(function (x) { return /여기까지/.test(x); }), 'no reaction/line/memo template says "여기까지" (' + tpls.filter(function (x) { return /여기까지/.test(x); }).join(' | ') + ')');
  /* 반응 줄은 '내일 또' 도 말하지 않는다 — 초대는 몇 번이든 되니 '오늘 얘기는 끝, 내일 와' 로 읽히면 안 된다 (메모 tomorrow 는 원래 내일 얘기라 따로) */
  var rLines = [];
  Object.keys(W.reactions || {}).forEach(function (r) { var x = W.reactions[r]; rLines = rLines.concat(x.lines || [], x.home || []); Object.keys(x.when || {}).forEach(function (k) { rLines = rLines.concat(x.when[k]); }); });
  check(!rLines.some(function (x) { return /내일|여기까지/.test(x); }), 'no reaction line says "내일" / "여기까지" (' + rLines.filter(function (x) { return /내일|여기까지/.test(x); }).join(' | ') + ')');
  /* E1b 옆: world 의 집 뒷면 문구도 '+1' 을 무조건 말하지 않는다 */
  if (W.strings && W.strings.homeBack != null) {
    var hb = W.strings.homeBack;
    check(typeof hb === 'function' ? (!/\+1/.test(hb(false)) && /\+1/.test(hb(true))) : !/\+1/.test(String(hb)), 'strings.homeBack says "+1" only when the lantern really lights (' + (typeof hb === 'function' ? hb(false) + ' / ' + hb(true) : hb) + ')');
  }
  Object.keys(W.reactions || {}).forEach(function (r) {
    (W.reactions[r].home || []).forEach(function (l) {
      check(!/걸었|다녀왔|갔다 왔|산책|처음|못 읽|오늘은|비가|비 오|빗|맑|날씨/.test(l), 'reactions.' + r + '.home is true on any home turn (no walk, weather, "오늘은"): ' + l);
    });
  });
  /* 재생 (데모 규칙, by 'demo'): 고른 반응(졸림·덤덤)은 그대로, 줄도 그 반응의 집 줄. 우쭐·폴짝은 집에서 거른다 */
  if (dHome && actOf('hum')) {
    var rd = BRAIN.replay([{ type: 'stay_home', t: 0, activity: 'hum' }, { type: 'wrap_up', t: 1, reaction: '덤덤' }], { by: 'demo', state: { lantern: 3 } });
    check(rd.reaction === '덤덤' && W.reactions['덤덤'].home.indexOf(rd.receipt.reactionLine) >= 0 && rd.events[1].reaction === '덤덤', 'demo-rules home replay 덤덤 → 덤덤 with a 덤덤 home line (' + rd.receipt.reactionLine + ')');
    var rz = BRAIN.replay([{ type: 'stay_home', t: 0, activity: 'hum' }, { type: 'wrap_up', t: 1, reaction: '졸림' }], { by: 'demo', state: { lantern: 3 } });
    check(rz.reaction === '졸림' && W.reactions['졸림'].lines.indexOf(rz.receipt.reactionLine) >= 0, 'demo-rules home replay 졸림 on a 덤덤 activity is kept (' + rz.receipt.reactionLine + ')');
  }
  var rj = BRAIN.replay([{ type: 'stay_home', t: 0, activity: 'hum' }, { type: 'wrap_up', t: 1, reaction: '우쭐' }], { by: 'demo', state: { lantern: 3 } });
  check(rj.reaction !== '우쭐' && rj.reaction !== '폴짝' && rj.reactionBy === 'demo-rules', 'demo-rules home replay 우쭐 (nothing read) → not kept (' + rj.reaction + ')');
  /* R1: 모델(mcp)·사람(human)이 준 반응은 집에서도 그대로. 줄은 그들이 쓴 것만 (템플릿 없음) */
  var rjm = BRAIN.replay([{ type: 'stay_home', t: 0, activity: 'hum' }, { type: 'wrap_up', t: 1, reaction: '우쭐' }], { by: 'mcp', state: { lantern: 3 } });
  check(rjm.reaction === '우쭐' && rjm.events[1].reaction === '우쭐' && rjm.reactionBy === 'model' && rjm.receipt.reactionLine === null && rjm.reactionLine === null, 'model home replay 우쭐 kept as given, no template line (' + rjm.reaction + ' · ' + rjm.receipt.reactionLine + ')');
  var rdm = BRAIN.replay([{ type: 'stay_home', t: 0, activity: 'hum' }, { type: 'wrap_up', t: 1, reaction: '덤덤', line: '흥얼거리다 박자를 놓쳤어' }], { by: 'human', state: { lantern: 3 } });
  check(rdm.reaction === '덤덤' && rdm.reactionBy === 'human' && rdm.receipt.reactionLine === '흥얼거리다 박자를 놓쳤어', 'human home replay: reaction + their own line verbatim (' + rdm.receipt.reactionLine + ')');

  /* E5b: 숫자로 시작하는 방 이름('0')은 문장에서 "0이라는 방" — "0까지 갔어", "오늘은 0." 이 되지 않게 */
  var digitIds = ids.filter(function (id) { return id !== 'door_out' && /^[0-9]/.test(W.nodes[id].name || ''); });
  if (!digitIds.length) return;
  section('digit-leading room names in copy (E5b) — ' + label);
  var zid = digitIds[0], zname = W.nodes[zid].name, texts = [], zTrips = 0;
  var esc = zname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  var AWK = new RegExp('(^|[^0-9])' + esc + '(까지|에 |에서|\\?|, |,$|\\. |\\.$| 보러| 쪽| 문 | 앞에| 대신| 하나| 보다가| 그거|$)');
  var zv = {}; zv[zid] = 2;
  for (seed = 1; seed <= 200; seed++) {
    var vars = [baseInput(seed, { hint: zname, fetchWiki: okAll }),
      baseInput(seed, { hint: zname, state: { visits: zv, affinity: {}, lantern: 3, recent: [], todayOut: 0, lastVisit: (function () { var o = {}; o[zid] = '2026-11-01'; return o; })() } }),
      baseInput(seed, { hint: zname, online: false })];
    for (var vi = 0; vi < vars.length; vi++) {
      t = await BRAIN.plan(vars[vi]);
      if (t.kind !== 'out' || !t.receipt.stops.some(function (s) { return s.nodeId === zid; })) continue;
      zTrips++;
      [t.poster && t.poster.line, t.memo && t.memo.tomorrow].concat(t.events.map(function (e) { return e.aside || (e.type === 'remember' ? e.line : null); })).forEach(function (x) { if (x) texts.push(x); });
    }
  }
  var rpz = BRAIN.replay([{ type: 'depart', t: 0, hint: '' }, { type: 'peek', t: 1, target: { kind: 'room', id: zid }, status: 'failed' }, { type: 'return', t: 2 }, { type: 'remember', t: 3, stopIdx: 0 }, { type: 'wrap_up', t: 4, reaction: '덤덤' }], { by: 'mcp', seed: 1 });
  texts.push(rpz.poster.line);
  var awk = texts.filter(function (x) { return AWK.test(x); });
  check(zTrips > 20 && texts.some(function (x) { return x.indexOf(zname + '이라는 방') >= 0 || x.indexOf(zname + '라는 방') >= 0; }), 'trips through room "' + zname + '" name it as "' + zname + '이라는 방" (' + zTrips + ' trips)');
  check(awk.length === 0, 'no bare "' + zname + '까지 / ' + zname + '에 / 오늘은 ' + zname + '. / ' + zname + '? …" in templated copy (' + awk.length + ' e.g. ' + awk.slice(0, 3).join(' | ') + ')');
  check(rpz.poster.title === zname && rpz.receipt.stops[0].name === zname, 'titles/labels keep the bare name (' + rpz.poster.title + ')');
  if (W.strings && typeof W.strings.affinityNode === 'function') check(!/^[0-9]+ 방/.test(W.strings.affinityNode(zname, 3)), 'strings.affinityNode: ' + W.strings.affinityNode(zname, 3));
  /* affinityNode 를 쓰는 쪽(방 보기 아이콘)은 줄에서 방 이름을 되읽는다: '…은 N번 왔어' 앞에서 ' 방' 또는 '(이)라는 방' 을 떼면 이름. 모든 방이 그렇게 되읽혀야 한다 */
  if (W.strings && typeof W.strings.affinityNode === 'function') {
    var unread = ids.filter(function (id) {
      var nm = W.nodes[id].name, m = String(W.strings.affinityNode(nm, 3)).match(/^(.+)은 3번 왔어$/), full = m && m[1];
      return !full || /방 방/.test(full) || [full, full.replace(/ 방$/, ''), full.replace(/이?라는 방$/, '')].indexOf(nm) < 0;
    });
    check(unread.length === 0, 'strings.affinityNode: every room name reads back (strip " 방" or "(이)라는 방") (' + unread.slice(0, 3).join(', ') + ')');
  }
  /* 숫자로 안 시작하는 이름은 그대로 (외출 문장에 "…이라는 방" 이 붙지 않는다) */
  var plainWrapped = 0;
  for (seed = 1; seed <= 60; seed++) { t = await BRAIN.plan(baseInput(seed, { hint: '모자의 역사' })); if (t.kind === 'out' && /이라는 방|[^0-9]라는 방/.test((t.poster.line || '') + (t.memo ? t.memo.tomorrow : '')) && !t.receipt.stops.some(function (s) { return s.nodeId === zid; }) && !(t.memo && t.memo.tomorrow.indexOf(zname) >= 0)) plainWrapped++; }
  check(plainWrapped === 0, 'other names are left as they are (' + plainWrapped + ')');
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
    if (typeof a.maxLantern === 'number' && lantern > a.maxLantern) return false;
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

  /* 쪽지 뒷면: app 은 등불이 8 미만일 때만 집에 있던 날 칸을 켠다 (app.js homeLit) → 등불 8(꽉 참)이면 '+1' 을 말하지 않는다. plan · replay(meta.state) 둘 다 */
  section('home note back: no "등불 +1" when the lantern is already full — ' + label);
  global.__ppolTest = { forceKind: 'home' };
  errs = [];
  var backSeen = {};
  for (seed = 1; seed <= 40; seed++) {
    for (var lb of [0, 3, 7, 8, 9]) {
      var want = lb >= 8 ? '오늘은 집' : '오늘은 집. 등불 +1';
      t = await BRAIN.plan(baseInput(seed, { state: { visits: {}, affinity: {}, lantern: lb, recent: [], todayOut: 0, posters: 3 } }));
      if (t.kind !== 'home' || !t.poster || t.poster.back !== want) errs.push('plan seed ' + seed + ' lantern ' + lb + ' → ' + (t.poster && t.poster.back));
      else backSeen[lb] = t.poster.back;
      var rb = BRAIN.replay(JSON.parse(JSON.stringify(t.events)), { by: 'mcp', now: NOW_DAY, state: { visits: {}, affinity: {}, lantern: lb, posters: 3 } });
      if (rb.kind !== 'home' || !rb.poster || rb.poster.back !== want) errs.push('replay seed ' + seed + ' lantern ' + lb + ' → ' + (rb.poster && rb.poster.back));
    }
  }
  delete global.__ppolTest;
  check(errs.length === 0, 'home note back matches whether a lantern pip can still light (' + errs.length + ' errors)' + (errs.length ? ' e.g. ' + errs.slice(0, 3).join(' | ') : ''));
  check(backSeen[8] === '오늘은 집' && !/\+1/.test(backSeen[8] || '+1'), 'lantern 8 → back "' + backSeen[8] + '" (no +1)');
  check(backSeen[3] === '오늘은 집. 등불 +1', 'lantern 3 → back "' + backSeen[3] + '" (+1)');
  var rpNoState = BRAIN.replay([{ type: 'stay_home', t: 0, activity: 'nap' }, { type: 'wrap_up', t: 2000, reaction: '졸림' }], { by: 'human' });
  check(rpNoState.poster && rpNoState.poster.back === '오늘은 집. 등불 +1', 'replay without meta.state (lantern 0) → back keeps +1');
  /* E1b: app 이 state.lanternLeft 를 주면 그대로 (하루 1칸이라 오늘 이미 켰으면 false). 안 주면 위의 옛 규칙. 난수는 그대로 */
  global.__ppolTest = { forceKind: 'home' };
  errs = [];
  for (seed = 1; seed <= 30; seed++) {
    for (var lb2 of [0, 3, 7, 8]) {
      var stL = function (o) { return Object.assign({ visits: {}, affinity: {}, lantern: lb2, recent: [], todayOut: 0, posters: 3 }, o); };
      var lf = await BRAIN.plan(baseInput(seed, { state: stL({ lanternLeft: false }) }));
      var lt = await BRAIN.plan(baseInput(seed, { state: stL({ lanternLeft: true }) }));
      var lm = await BRAIN.plan(baseInput(seed, { state: stL({}) }));
      if (lf.poster.back !== '오늘은 집' || /\+1/.test(lf.poster.back)) errs.push('plan false seed ' + seed + '/' + lb2 + ' → ' + lf.poster.back);
      if (lt.poster.back !== '오늘은 집. 등불 +1') errs.push('plan true seed ' + seed + '/' + lb2 + ' → ' + lt.poster.back);
      var a1 = JSON.parse(JSON.stringify(lf)), a2 = JSON.parse(JSON.stringify(lm)); a1.poster.back = a2.poster.back = '';
      if (JSON.stringify(a1) !== JSON.stringify(a2)) errs.push('lanternLeft changed more than the back text, seed ' + seed);
      var rfl = BRAIN.replay(JSON.parse(JSON.stringify(lf.events)), { by: 'mcp', now: NOW_DAY, state: { lantern: lb2, posters: 3, lanternLeft: false } });
      var rtl = BRAIN.replay(JSON.parse(JSON.stringify(lf.events)), { by: 'mcp', now: NOW_DAY, state: { lantern: lb2, posters: 3, lanternLeft: true } });
      if (rfl.poster.back !== '오늘은 집') errs.push('replay false seed ' + seed + '/' + lb2 + ' → ' + rfl.poster.back);
      if (rtl.poster.back !== '오늘은 집. 등불 +1') errs.push('replay true seed ' + seed + '/' + lb2 + ' → ' + rtl.poster.back);
    }
  }
  delete global.__ppolTest;
  check(errs.length === 0, 'state.lanternLeft decides the "+1" (false → "오늘은 집", true → "+1", plan + replay; nothing else changes) (' + errs.length + ' errors)' + (errs.length ? ' e.g. ' + errs.slice(0, 3).join(' | ') : ''));

  /* 41 옆: 두뇌는 날씨를 모른다 (app: 등불 0~5 비 · 6 가랑비 · 7 맑음 · 8+ 날마다). 등불 7 이상에서 집 활동·메모가 비를 말하면 안 된다 */
  var HOME_WX = /비가|비 오|비 와|비 셌|빗|눈이 와|눈 오|맑|흐려|흐린|날씨|안개/;
  global.__ppolTest = { forceKind: 'home' };
  var wxErr = [], rainyLow = 0;
  for (seed = 1; seed <= 200; seed++) {
    for (var lv of [7, 8, 9]) {
      t = await BRAIN.plan(baseInput(seed, { state: { visits: {}, affinity: {}, lantern: lv, recent: [], todayOut: 0, posters: 3 } }));
      var txt = [t.receipt.activity.line, t.receipt.activity.detail, t.poster.line, t.poster.detail, JSON.stringify(t.memo || '')].concat(t.events.map(function (e) { return (e.line || '') + ' ' + JSON.stringify(e.memo || ''); })).join(' | ');
      if (HOME_WX.test(txt)) wxErr.push('seed ' + seed + ' lantern ' + lv + ' ' + t.receipt.activity.id + ': ' + txt.slice(0, 60));
    }
    t = await BRAIN.plan(baseInput(seed, { state: { visits: {}, affinity: {}, lantern: 3, recent: [], todayOut: 0, posters: 3 } }));
    if (HOME_WX.test(t.receipt.activity.line + t.receipt.activity.detail)) rainyLow++;
  }
  delete global.__ppolTest;
  check(wxErr.length === 0, 'lantern ≥7 (can be clear): home activity / memo never claims rain (' + wxErr.length + ' errors)' + (wxErr.length ? ' e.g. ' + wxErr.slice(0, 2).join(' || ') : ''));
  if ((W.homeActivities || []).some(function (a) { return typeof a.maxLantern === 'number'; })) check(rainyLow > 0, 'lantern 3 (always rain): rain activities still happen (' + rainyLow + '/200)');

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
  check(contra.hint.followed !== 'ignored' && !contra.hint.note && (contra.poster.line || '').indexOf(hintName + ' 말고') < 0, 'replay: followHint false but went there → not "ignored" (' + contra.hint.followed + ' · ' + contra.poster.line + ')');
  /* 들판 걸음(링크 따라가기)으로도 무시한 힌트와 같은 글에 닿지 않는다 — 링크 목록 맨 앞에 힌트 제목을 둬도 */
  var wikiQ = ['쿼카', '기린'].filter(function (q) { return BRAIN.matchHint(q).kind === 'wiki'; })[0];
  for (var hi = 0; hi < 2; hi++) {
    var hq = hi === 0 ? hintName : wikiQ;
    var alts = hi === 0 ? [(W.nodes[hintId].aliases || [])[0] || hintName, W.nodes[hintId].wiki || hintName] : [wikiQ + ' (동물)', wikiQ];
    var linkFetch = (function (h, alts) {
      return function (title) {
        return Promise.resolve({ ok: true, title: title, extract: title + ' 요약.', url: 'https://ko.wikipedia.org/wiki/' + encodeURIComponent(title), thumb: null, links: alts.concat([h, '아무거나']) });
      };
    })(hq, alts);
    var hEsc = hq.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var selfRe = new RegExp(hEsc + ' 말고 ' + hEsc + '(?![가-힣])|' + hEsc + ' 대신 ' + hEsc + ' 쪽|' + hEsc + '(는|은)? (보는 건 )?다음에\\. 오늘은 ' + hEsc + '(?![가-힣]{2})');
    var hintKeys = [hq].concat(alts).map(function (x) { return x.replace(/\s*\([^)]*\)$/, '').replace(/\s+/g, ''); });
    var ignHop = 0, wildSeen = 0, hopErrs = [];
    for (seed = 1; seed <= 400; seed++) {
      t = await BRAIN.plan(baseInput(seed, { hint: hq, fetchWiki: linkFetch, state: { visits: {}, affinity: aff, lantern: 1, recent: [], todayOut: 0 } }));
      if (t.kind !== 'out' || t.hint.followed !== 'ignored') continue;
      ignHop++;
      t.receipt.stops.forEach(function (s) {
        if (!s.wild) return;
        wildSeen++;
        if (hintKeys.indexOf(String(s.title).replace(/\s*\([^)]*\)$/, '').replace(/\s+/g, '')) >= 0) hopErrs.push('seed ' + seed + ' ignored ' + hq + ' but hopped to ' + s.title);
      });
      var txt = [t.poster.line, t.memo && t.memo.tomorrow].join(' | ');
      if (selfRe.test(txt)) hopErrs.push('seed ' + seed + ' contradiction: ' + txt);
    }
    check(ignHop > 10 && wildSeen > 0 && hopErrs.length === 0, '#2 ignored ' + (hi === 0 ? 'node' : 'wiki') + ' hint "' + hq + '": link hop never lands on the hint (' + ignHop + ' ignored, ' + wildSeen + ' wild hops, ' + hopErrs.length + ' errors)' + (hopErrs.length ? ' e.g. ' + hopErrs[0] : ''));
  }
  var wildContra = BRAIN.replay([{ type: 'depart', t: 0, hint: hintName, followHint: false }, { type: 'peek', t: 1, target: { kind: 'wild', title: hintName } },
    { type: 'return', t: 2 }, { type: 'remember', t: 3, stopIdx: 0 }, { type: 'wrap_up', t: 4, reaction: '덤덤' }], { by: 'mcp', now: NOW_DAY });
  check(wildContra.hint.followed !== 'ignored' && !wildContra.hint.note && (wildContra.poster.line || '').indexOf(hintName + ' 말고') < 0, 'replay: followHint false but a wild stop titled the hint → not "ignored" (' + wildContra.hint.followed + ' · ' + wildContra.poster.line + ')');

  /* #3/#41 반응 한 줄은 실제로 있었던 일만 */
  section('reaction lines match what happened (#3/#41) — ' + label);
  /* #41: 두뇌 입력에는 날씨가 없다 (app 이 등불 단계로 정한다, 등불 7 = 맑음) → 반응 줄이 날씨를 말하면 안 된다 */
  var WEATHER_CLAIM = /비가|비 오|비 와|빗|눈이 와|눈 오|맑|흐려|흐린|날씨|안개/;
  errs = [];
  global.__ppolTest = { forceKind: 'home' };
  for (seed = 1; seed <= 80; seed++) {
    t = await BRAIN.plan(baseInput(seed, { state: { visits: {}, affinity: {}, lantern: 3, recent: [], todayOut: 0 } }));
    if (/걸었|다녀왔|갔다 왔|산책|처음|못 읽/.test(t.receipt.reactionLine || '') || WEATHER_CLAIM.test(t.receipt.reactionLine || '')) errs.push('home seed ' + seed + ': ' + t.receipt.reactionLine);
  }
  delete global.__ppolTest;
  function lineErr(tr, tag) {
    var ln = tr.receipt.reactionLine || '', c = tr.receipt.counts;
    if (/못 읽은/.test(ln) && !(c.failed + c.simulated > 0)) return tag + ' says missed but nothing failed: ' + ln;
    if (/처음/.test(ln) && !tr.receipt.stops.some(function (s) { return s.first; })) return tag + ' says first but no first stop: ' + ln;
    if (/많이 걸었/.test(ln) && tr.receipt.stops.length < 4) return tag + ' says walked a lot with ' + tr.receipt.stops.length + ' stops: ' + ln;
    if (WEATHER_CLAIM.test(ln)) return tag + ' claims weather the brain does not know (lantern 7 is clear): ' + ln;
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
  check(outN > 100 && errs.length === 0, 'reaction lines: no "많이 걸었어" at home, no "못 읽은" without a miss, no "처음" without a first stop, no weather (' + errs.length + ' errors)' + (errs.length ? ' e.g. ' + errs.slice(0, 3).join(' | ') : ''));

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
  /* 모델 재생: 읽었다는 메모는 읽음이 확인되지 않으면 화면에서 빼고 원문은 noteGiven 에. 코드가 문어 말투로 대신 쓰지 않는다 (MODEL_VOICE §3) */
  check(rs[0].status === 'simulated' && rs[0].note === '' && rs[0].noteGiven === '바깥 글을 다 읽었어' && !rs[0].source, 'url door claimed read → simulated, claimed note hidden but kept as noteGiven, no code-written note (' + rs[0].status + ' · ' + JSON.stringify(rs[0].note) + ')');
  var rfDemo = BRAIN.replay(JSON.parse(JSON.stringify(fake)), { by: 'demo', now: NOW_DAY, state: { visits: visited, affinity: {} } });
  check(rfDemo.receipt.stops[0].status === 'simulated' && rfDemo.receipt.stops[0].note.indexOf('정적 페이지라') === 0 && rfDemo.receipt.stops[0].noteGiven === undefined, 'demo-rules playback: url door claimed read → simulated, the old honest note (unchanged)');
  check(rs[4].status === 'simulated' && rs[4].nodeId === 'door_out', 'door_out room claimed read → simulated door');
  check(rs[1].status !== 'read' && !rs[1].source && rs[1].note.indexOf('읽은 척') < 0, 'room read with non-wiki source → not read, no source, claimed note dropped (' + rs[1].status + ')');
  check(rs[1].first === false, 'room first:true claim ignored when visits say it was visited');
  check(rs[2].status === 'simulated' && !rs[2].source && rs[2].first === false, 'wild read with javascript: source → simulated, not first');
  check(rs[3].status === 'read' && rs[3].source && rs[3].source.url === good && rs[3].source.thumb === null && rs[3].source.license === BRAIN.LICENSE && rs[3].source.attribution === BRAIN.ATTRIBUTION, 'real ko.wikipedia source kept; http thumb dropped; license/attribution from the brain, not input');
  check(rf.poster.thumb === null, 'poster thumb only from upload.wikimedia.org https');
  check(rf.receipt.counts.read === 1 && rf.receipt.counts.simulated === 3, 'counts honest (' + JSON.stringify(rf.receipt.counts) + ')');
  check(rs.every(function (s) { return !s.source || WIKI_PAGE_RE.test(s.source.url); }), 'every receipt source is a ko.wikipedia.org page');
  /* 출처 이름은 읽은 위키의 것 (2026-11-10 다국어 합침 뒤): 재생은 검사를 통과한 주소의 언어로 'Wikipedia (xx)' 를 붙인다 —
     입력이 준 attribution 도, 상수 'Wikipedia (ko)' 도 아니다 (전엔 ja · en … 을 읽어도 일기에 'Wikipedia (ko)' 였다). 열 언어 밖 (zh) 은 전처럼 읽음이 아니다 */
  var labelOf = function (l, tg) {
    var r1 = BRAIN.replay([{ type: 'depart', t: 0, hint: '' },
      { type: 'peek', t: 1, target: tg, status: 'read', ms: 1000, source: { url: 'https://' + l + '.wikipedia.org/wiki/Hat', extract: '요약.', license: '퍼블릭 도메인', attribution: '나' } },
      { type: 'return', t: 2 }, { type: 'wrap_up', t: 3, reaction: '덤덤' }], { by: 'mcp', now: NOW_DAY });
    var s1 = r1.receipt.stops[0], e1 = r1.events.filter(function (e) { return e.type === 'peek'; })[0];
    return s1.status === 'read' && s1.source ? s1.source.attribution + ' · ' + s1.source.license + ' · event ' + (e1.source ? e1.source.attribution : 'none') : s1.status;
  };
  var TEN = ['ko', 'en', 'ja', 'de', 'fr', 'es', 'it', 'pt', 'id', 'hi'];
  var wrongWild = TEN.filter(function (l) { return labelOf(l, { kind: 'wiki', title: 'Hat' }) !== 'Wikipedia (' + l + ') · ' + BRAIN.LICENSE + ' · event Wikipedia (' + l + ')'; });
  check(wrongWild.length === 0, 'replay names the Wikipedia that was read, from the checked address, for all ten languages (wrong: ' + (wrongWild.join(' ') || 'none') + '; ja → ' + labelOf('ja', { kind: 'wiki', title: 'Hat' }) + ')');
  var wrongRoom = ['ja', 'en', 'hi'].filter(function (l) { return labelOf(l, { kind: 'room', id: clueId }) !== 'Wikipedia (' + l + ') · ' + BRAIN.LICENSE + ' · event Wikipedia (' + l + ')'; });
  check(wrongRoom.length === 0, 'the same for a room stop read in another language (wrong: ' + (wrongRoom.join(' ') || 'none') + ')');
  check(labelOf('zh', { kind: 'wiki', title: 'Hat' }).indexOf('Wikipedia') < 0, 'a Wikipedia outside the ten (zh) is still not a read, so it gets no source label (' + labelOf('zh', { kind: 'wiki', title: 'Hat' }) + ')');
  /* R1: 반응은 읽기 정직 표기와 달리 모델의 몫 — 1/5 만 읽었어도 모델이 우쭐이면 우쭐 (읽음 표기는 위에서 그대로 정직하게) */
  check(rf.reaction === '우쭐' && rf.receipt.reaction === '우쭐' && rf.reactionBy === 'model', 'model reaction 우쭐 with 1/5 read is kept as given (' + rf.reaction + ')');
  var peeks = rf.events.filter(function (e) { return e.type === 'peek'; });
  var evMismatch = peeks.filter(function (e, i) { var s = rs[i]; return e.status !== s.status || e.note !== s.note || !!e.first !== !!s.first || !!e.source !== !!s.source || (e.source && e.source.url !== s.source.url); });
  check(peeks.length === rs.length && evMismatch.length === 0, 'returned peek events carry the normalized status/note/first/source (' + evMismatch.length + ' mismatches)');
  check(rf.events.filter(function (e) { return e.type === 'wrap_up'; })[0].reaction === '우쭐', 'returned wrap_up event carries the model reaction unchanged');
  var wikiThumb = BRAIN.replay([{ type: 'depart', t: 0, hint: '' }, { type: 'peek', t: 1, target: { kind: 'room', id: clueId }, status: 'read', source: { url: good, extract: '요약.', thumb: { url: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/x.jpg', w: 10, h: 20 } } },
    { type: 'return', t: 2 }, { type: 'remember', t: 3, stopIdx: 0 }, { type: 'wrap_up', t: 4, reaction: '덤덤' }], { by: 'mcp', now: NOW_DAY });
  check(wikiThumb.poster.thumb && wikiThumb.poster.thumb.url.indexOf('https://upload.wikimedia.org/') === 0 && wikiThumb.poster.thumb.license === BRAIN.THUMB_LICENSE, 'upload.wikimedia.org thumb is kept and credited');
  var proudOk = BRAIN.replay([{ type: 'depart', t: 0, hint: W.nodes[clueId].name }, { type: 'peek', t: 1, target: { kind: 'room', id: clueId }, status: 'read', source: { url: good, extract: '요약.' } },
    { type: 'return', t: 2 }, { type: 'wrap_up', t: 3, reaction: '우쭐' }], { by: 'mcp', now: NOW_DAY, state: { visits: allVisited } });
  check(proudOk.reaction === '우쭐' || proudOk.hint.followed !== 'followed', 'honest 우쭐 (followed + all read) is kept (' + proudOk.reaction + '/' + proudOk.hint.followed + ')');
  var homeJump = BRAIN.replay([{ type: 'stay_home', t: 0, activity: 'nap' }, { type: 'wrap_up', t: 1, reaction: '폴짝' }], { by: 'mcp' });
  check(homeJump.reaction === '폴짝' && homeJump.events[1].reaction === '폴짝' && homeJump.receipt.reactionLine === null, 'model home replay: 폴짝 kept as given (R1), no template line');
  var homeJumpDemo = BRAIN.replay([{ type: 'stay_home', t: 0, activity: 'nap' }, { type: 'wrap_up', t: 1, reaction: '폴짝' }], { by: 'demo' });
  check(homeJumpDemo.reaction === '졸림' && homeJumpDemo.events[1].reaction === '졸림', 'demo-rules home replay: 폴짝 with nothing new → 졸림 (gating kept for demo rules)');
  /* 재생도 지금 방에서 못 하는 활동은 그 문구·효과를 쓰지 않는다 (맑은 날 비 세기, 포스터 없이 자리 바꾸기) */
  var hasAct = function (id) { return (W.homeActivities || []).some(function (a) { return a.id === id; }); };
  if (hasAct('count_rain')) {
    var rainClear = BRAIN.replay([{ type: 'stay_home', t: 0, activity: 'count_rain' }, { type: 'wrap_up', t: 1, reaction: '졸림' }], { by: 'mcp', state: { lantern: 9 } });
    var rainWet = BRAIN.replay([{ type: 'stay_home', t: 0, activity: 'count_rain' }, { type: 'wrap_up', t: 1, reaction: '졸림' }], { by: 'mcp', state: { lantern: 3 } });
    check(rainClear.receipt.activity.id === 'custom' && !/비|빗/.test(rainClear.receipt.activity.detail + rainClear.poster.line), 'home replay: count_rain at lantern 9 (clear) drops the rain text');
    check(rainWet.receipt.activity.id === 'count_rain', 'home replay: count_rain at lantern 3 (rain) is kept');
  }
  if (hasAct('rearrange')) {
    var rearr0 = BRAIN.replay([{ type: 'stay_home', t: 0, activity: 'rearrange' }, { type: 'wrap_up', t: 1, reaction: '졸림' }], { by: 'mcp', state: { lantern: 3, posters: 0 } });
    var rearr2 = BRAIN.replay([{ type: 'stay_home', t: 0, activity: 'rearrange' }, { type: 'wrap_up', t: 1, reaction: '졸림' }], { by: 'mcp', state: { lantern: 3, posters: 2 } });
    check(rearr0.receipt.activity.id !== 'rearrange' && !rearr0.receipt.activity.effect, 'home replay: rearrange with no posters is not trusted');
    check(rearr2.receipt.activity.id === 'rearrange', 'home replay: rearrange with 2 posters is kept');
  }
  var nothingRp = BRAIN.replay([{ type: 'stay_home', t: 0, activity: 'nothing' }, { type: 'wrap_up', t: 1, reaction: '졸림' }], { by: 'mcp' });
  check(nothingRp.kind === 'home', 'home replay: nothing activity still replays');
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

/* ───────── 난수 순서 지문 (가짜 WORLD) ─────────
   두뇌가 뽑는 난수의 개수·순서가 바뀌면(R() 하나를 더 뽑거나 자리를 옮기면) 길·시각·스티커 자리·종이·기념품·반응·한 줄이 함께 밀린다.
   그걸 이 지문 하나로 잡는다. 가짜 WORLD(이 파일 안)로만 재므로 js/world.js 의 문구·그래프가 바뀌어도 안 깨진다.
   일부러 난수 순서를 바꿨다면 FP_PRINT=1 node tools/test-brain.js 로 새 값을 보고 DRAW_FP 를 고친다 (커밋 메시지에 이유) */
var DRAW_FP = '370354b6';   /* HEAD 79d5282 과 물결 E 가 같은 값 (집 반응 고르기·owned·lanternLeft 는 새 난수를 뽑지 않는다) */
async function drawFingerprint() {
  /* 반응 줄·한 줄 템플릿을 종류마다 셋씩 (이 함수 안의 글) → 템플릿·기억·반응 줄 고르기 난수까지 지문에 드러나고, 두뇌 기본 문구를 고쳐도 안 깨진다 */
  var W = fakeWorld(), prevW = global.WORLD;
  Object.keys(W.reactions).forEach(function (r) { var l = W.reactions[r].lines; W.reactions[r].lines = [l[0], l[0] + ' 둘', l[0] + ' 셋']; });
  W.lineTemplates = {};
  ['followedThenLeft', 'followedKept', 'leftKept', 'noHint', 'ignored', 'linger', 'door', 'letter', 'failed', 'wild'].forEach(function (k) {
    W.lineTemplates[k] = [1, 2, 3].map(function (i) { return k + i + ' {hint} / {mem} / {memory}'; });
  });
  global.WORLD = W; BRAIN.setWorld(null);
  var fpFetch = function (title) {
    if (title === '문어') return Promise.resolve({ ok: false, reason: 'network' });
    if (/^(모자|단추|조개|비|구름|쿼카|베레모)$/.test(title)) return Promise.resolve({ ok: true, title: title, extract: title + '는 오래된 것이다. 둘째 문장.', url: 'https://ko.wikipedia.org/wiki/' + encodeURIComponent(title), thumb: null, links: ['베레모', '깃털', '단추', '조개'] });
    return Promise.resolve({ ok: false, reason: 'missing' });
  };
  var allV = {}; Object.keys(W.nodes).forEach(function (k) { allV[k] = 2; });
  function st(o) { return Object.assign({ visits: {}, affinity: {}, lantern: 1, recent: [], todayOut: 0 }, o || {}); }
  function inp(seed, o) { return baseInput(seed, Object.assign({ fetchWiki: fpFetch }, o)); }
  function fp(t) {
    var r = t.receipt || {}, p = t.poster || {};
    return [t.kind,
      (r.stops || []).map(function (s) { return (s.nodeId || ('w:' + (s.name || ''))) + '/' + s.status + '/' + s.ms; }).join(','),
      (t.events || []).map(function (e) { return e.type + '@' + e.t + (e.target ? ':' + (e.target.id || e.target.title || '') : '') + (e.stopIdx != null ? '#' + e.stopIdx : ''); }).join(','),
      r.souvenir || '', r.rememberedIdx, t.reaction || '', r.reactionLine || '', r.activity ? r.activity.id : '',
      p.stickerPos ? [p.stickerPos.x, p.stickerPos.y, p.stickerPos.rot].join(':') : '', p.paper, p.line || '', /\+1/.test(p.back || '') ? '+1' : ''].join('|');
  }
  var parts = [], kinds = { out: 0, home: 0, empty: 0 }, seed, t;
  var variants = [
    function (s) { return inp(s, {}); },
    function (s) { return inp(s, { hint: '모자' }); },
    function (s) { return inp(s, { hint: 'https://example.org/feather/1' }); },
    function (s) { return inp(s, { hint: '쿼카' }); },
    function (s) { return inp(s, { online: false, hint: '단추' }); },
    function (s) { return inp(s, { now: NOW_NIGHT, state: st({ lantern: 5, todayOut: 2, recent: [{ kind: 'out', nStops: 4 }] }) }); },
    function (s) { return inp(s, { hint: '모자', state: st({ visits: allV, lantern: 3, lastVisit: { hat: '2026-11-01' } }) }); }
  ];
  for (seed = 1; seed <= 60; seed++) {
    for (var v = 0; v < variants.length; v++) { t = await BRAIN.plan(variants[v](seed)); kinds[t.kind]++; parts.push(fp(t)); }
    global.__ppolTest = { forceKind: 'home' };
    t = await BRAIN.plan(inp(seed, { state: st({ lantern: 3, posters: 2 }) })); kinds[t.kind]++; parts.push(fp(t));
    global.__ppolTest = { forceKind: 'out' };
    t = await BRAIN.plan(inp(seed, { hint: '조개' })); kinds[t.kind]++; parts.push(fp(t));
    delete global.__ppolTest;
    /* 데모 계획의 이벤트를 데모 규칙으로 다시 재생 (by 'demo'). 물결 F 전에는 by 'mcp' 로 쟀다 — 그때 mcp 재생은 데모 규칙과 같은 말을 했다.
       R1 로 mcp 재생은 반응 줄을 지어내지 않으니(글이 달라질 뿐 난수는 같다) 지문은 데모 규칙 재생으로 재고, mcp 가 같은 난수를 쓰는지는 drawOrderSuite 가 따로 본다 */
    if (t.kind === 'out') { var rp = BRAIN.replay(JSON.parse(JSON.stringify(t.events)), { by: 'demo', seed: seed + 1000, now: NOW_DAY, state: st({}) }); parts.push(fp(rp)); }
  }
  global.WORLD = prevW;
  var s = parts.join('\n'), h = 0x811c9dc5;
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return { hash: ('0000000' + h.toString(16)).slice(-8), kinds: kinds, n: parts.length, text: s };
}
async function drawOrderSuite() {
  section('draw-order fingerprint (fake WORLD)');
  var r = await drawFingerprint();
  if (process.env.FP_PRINT) console.log('  DRAW_FP = ' + r.hash + ' ' + JSON.stringify(r.kinds));
  check(r.kinds.out > 100 && r.kinds.home > 50, 'fingerprint covers out and home turns (' + JSON.stringify(r.kinds) + ', ' + r.n + ' results)');
  check(r.hash === DRAW_FP, 'draw order unchanged: fingerprint ' + r.hash + ' === ' + DRAW_FP + ' (일부러 바꿨으면 FP_PRINT=1 로 보고 DRAW_FP 를 고친다)');
  /* 모델(mcp)·사람(human) 재생도 데모 규칙 재생과 같은 난수를 같은 자리에서 쓴다: 스티커 자리·종이·기념품은 난수로만 정해진다 */
  var W = fakeWorld(), prevW = global.WORLD; global.WORLD = W; BRAIN.setWorld(null);
  var drawErr = [], nOut = 0;
  for (var seed = 1; seed <= 80; seed++) {
    global.__ppolTest = { forceKind: 'out' };
    var t = await BRAIN.plan(baseInput(seed, { online: false }));
    delete global.__ppolTest;
    var ev = JSON.stringify(t.events);
    var a = BRAIN.replay(JSON.parse(ev), { by: 'demo', seed: seed, now: NOW_DAY, state: { visits: {} } });
    ['mcp', 'human'].forEach(function (by) {
      var b = BRAIN.replay(JSON.parse(ev), { by: by, seed: seed, now: NOW_DAY, state: { visits: {} } });
      var ka = [JSON.stringify(a.poster.stickerPos), a.poster.paper, a.receipt.souvenir, a.receipt.rememberedIdx].join('|');
      var kb = [JSON.stringify(b.poster.stickerPos), b.poster.paper, b.receipt.souvenir, b.receipt.rememberedIdx].join('|');
      if (ka !== kb) drawErr.push(by + ' seed ' + seed + ': ' + ka + ' vs ' + kb);
    });
    nOut++;
  }
  global.__ppolTest = { forceKind: 'home' };
  for (seed = 1; seed <= 40; seed++) {
    var h = await BRAIN.plan(baseInput(seed, { state: { visits: {}, affinity: {}, lantern: 3, recent: [], todayOut: 0, posters: 2 } }));
    var hev = JSON.stringify(h.events);
    var ha = BRAIN.replay(JSON.parse(hev), { by: 'demo', seed: seed, state: { lantern: 3, posters: 2 } });
    var hb = BRAIN.replay(JSON.parse(hev), { by: 'mcp', seed: seed, state: { lantern: 3, posters: 2 } });
    if (JSON.stringify(ha.poster.stickerPos) + ha.poster.paper + ha.events[1].t !== JSON.stringify(hb.poster.stickerPos) + hb.poster.paper + hb.events[1].t) drawErr.push('home seed ' + seed);
  }
  delete global.__ppolTest;
  global.WORLD = prevW;
  check(nOut === 80 && drawErr.length === 0, 'mcp/human replay draws the same numbers as demo-rules replay (sticker pos · paper · souvenir · memory) (' + drawErr.length + ' diffs)' + (drawErr.length ? ' e.g. ' + drawErr[0] : ''));
}

/* ───────── 톡 한 줄 (주인 11-08, BRAIN.tapLine) ─────────
   깨어 있는 문어를 톡 → 그날 마지막 차례의 한 줄. 기록에서만 · 시드로 정해짐 · 아무것도 안 바꿈 · 포스터 · 반응 줄과 겹치지 않음 ·
   데모 줄은 22자 안 (거의 다 18자 안) · 줄마다 그 사실이 기록에 있다 (갈래별로 다시 확인 — 비평 11-08: 제일 오래는 모든 정류장 중 하나뿐인 최댓값, 처음은 '도' 없이 등) */
var TAP_BAN = /좋아|좋았|사랑|싫어|싫었|미워|최애|취향|즐겨|반했|단골|그리워|설레|맛있|재밌|재미있|신나|신났|행복|즐거|기뻐|기뻤|슬퍼|아쉬|미안|외로|심심|내일|여기까지|기다렸|보고 싶|오늘|아까|방금/;
function tapRoomWord(name) {   /* js/brain.js roomWord 와 같은 규칙 (숫자로 시작하는 방 이름 → '…이라는 방') */
  name = String(name == null ? '' : name);
  if (!/^[0-9]/.test(name)) return name;
  var last = name.charAt(name.length - 1), code = last.charCodeAt(0);
  var jong = /[0-9]/.test(last) ? '1101001110'.charAt(+last) === '1' : (code >= 0xAC00 && code <= 0xD7A3 && (code - 0xAC00) % 28 > 0);
  return name + (jong ? '이라는 방' : '라는 방');
}
var TAP_KEYS = { souvenir: ['souvenir', 'souvenirAny'], wild: ['wildLink', 'wild'], count: ['count', 'countMore'] };   /* 한 갈래가 쓰는 템플릿 묶음 (js/brain.js tapDemo 의 add) */
function tapRegexes(W, key) {   /* 그 갈래 템플릿 → 정규식 (치환자 = 이름 붙은 묶음, 조사 = 두 꼴 다) */
  var list = []; (TAP_KEYS[key] || [key]).forEach(function (k) { list = list.concat((W.tapTemplates && W.tapTemplates[k]) || BRAIN.DEFAULT_TAP[k] || []); });
  var JO = { '은': '(?:은|는)', '는': '(?:은|는)', '이': '(?:이|가)', '가': '(?:이|가)', '을': '(?:을|를)', '를': '(?:을|를)', '과': '(?:과|와)', '와': '(?:과|와)', '으로': '(?:으로|로)', '로': '(?:으로|로)' };
  return list.map(function (tpl) {
    var re = '', i = 0, m, rx = /\{(\w+)\}(으로|은|는|이|가|을|를|과|와|로)?/g;
    while ((m = rx.exec(tpl))) { re += tpl.slice(i, m.index).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?<' + m[1] + '>.+?)' + (m[2] ? JO[m[2]] : ''); i = m.index + m[0].length; }
    re += tpl.slice(i).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return { tpl: tpl, re: new RegExp('^' + re + '$') };
  });
}
function tapParse(W, key, text) { var rs = tapRegexes(W, key); for (var i = 0; i < rs.length; i++) { var m = rs[i].re.exec(text); if (m) return { tpl: rs[i].tpl, g: m.groups || {} }; } return null; }
function tapFactOk(W, t, r) {   /* → '' 이면 맞음, 아니면 까닭 */
  var key = r.src.replace(/^demo:/, ''), rc = t.receipt, st = rc.stops, remI = rc.rememberedIdx, pl = (t.poster && t.poster.line) || '', rl = t.reactionLine || '';
  var p = tapParse(W, key, r.text); if (!p) return 'no template matches';
  var g = p.g;
  function isRoom(s) { return !!s && !!s.nodeId && s.nodeId !== 'door_out' && !!W.nodes[s.nodeId]; }
  function nameOf(s) { return isRoom(s) ? tapRoomWord(s.name) : (s.title || s.name || ''); }
  function idxOf(v, pred) { for (var i = 0; i < st.length; i++) if (nameOf(st[i]) === v && (!pred || pred(st[i], i))) return i; return -1; }
  function notPoster(s, i) { return i !== remI; }
  var ms = st.map(function (s) { return typeof s.ms === 'number' ? s.ms : 0; }), max = Math.max.apply(null, ms);
  switch (key) {
    case 'souvenir':
      var sv = rc.souvenir && W.souvenirs[rc.souvenir]; if (!sv || g.s !== sv.name) return 'souvenir name';
      if (g.p != null && idxOf(g.p, function (s) { return isRoom(s) && W.nodes[s.nodeId].souvenir === rc.souvenir; }) < 0) return 'souvenir room';
      return '';
    case 'wild': var wi = idxOf(g.w, function (s, i) { return notPoster(s, i) && s.wild && s.status === 'read'; }); if (wi < 0 || r.part !== g.w) return 'wild stop'; if (/링크/.test(p.tpl) && !st[wi].viaTangent) return 'link without tangent'; return '';
    case 'slowRoom': return st.some(function (s, i) { return s.nodeId === 'slow_room' && i !== remI; }) ? '' : 'slow room';
    case 'tangent': for (var k = 1; k < st.length; k++) if (k !== remI && st[k].viaTangent && isRoom(st[k]) && isRoom(st[k - 1]) && nameOf(st[k]) === g.b && nameOf(st[k - 1]) === g.t) return /한눈/.test(pl) ? 'poster says 한눈' : ''; return 'tangent pair';
    case 'other': return idxOf(g.b, function (s, i) { return notPoster(s, i) && isRoom(s); }) >= 0 && (g.a == null || g.a === nameOf(st[remI])) ? '' : 'other room';
    case 'revisit': return !/다시/.test(pl) && idxOf(g.b, function (s, i) { return notPoster(s, i) && isRoom(s) && !s.first; }) >= 0 ? '' : 'revisit';
    case 'firstOther': return !/처음/.test(pl) && idxOf(g.b, function (s, i) { return notPoster(s, i) && isRoom(s) && s.first; }) >= 0 ? '' : 'first';
    case 'longest':
      var li = idxOf(g.b, function (s, i) { return notPoster(s, i) && isRoom(s) && ms[i] === max; });
      return li >= 0 && ms.filter(function (x) { return x === max; }).length === 1 && !/오래/.test(pl) ? '' : 'longest';
    case 'tired': return rc.returnReason === 'tired' && g.l === nameOf(st[st.length - 1]) && t.reaction !== '졸림' && !/다리/.test(rl) ? '' : 'tired';
    case 'enough': return rc.returnReason === 'enough' && g.l === nameOf(st[st.length - 1]) && st.length - 1 !== remI && !/됐어/.test(rl) ? '' : 'enough';
    case 'failed': return idxOf(g.x, function (s, i) { return notPoster(s, i) && s.status === 'failed'; }) >= 0 ? '' : 'failed';
    case 'simulated': return idxOf(g.x, function (s, i) { return notPoster(s, i) && s.status === 'simulated'; }) >= 0 ? '' : 'simulated';
    case 'doorOut': return st.some(function (s, i) { return s.nodeId === 'door_out' && i !== remI; }) ? '' : 'door';
    case 'start': return st.length >= 3 && remI !== 0 && isRoom(st[0]) && g.f === nameOf(st[0]) && !/처음/.test(pl) ? '' : 'start';
    case 'readOne': return idxOf(g.r, function (s, i) { return notPoster(s, i) && isRoom(s) && s.status === 'read'; }) >= 0 ? '' : 'read';
    case 'count':
      var W1 = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟'];
      if (g.n != null) return W1[st.length] === g.n ? '' : 'count';
      return W1[st.length - 1] === g.m && g.a === nameOf(st[remI]) ? '' : 'count more';
    default: return 'unknown src ' + key;
  }
}
async function tapSuite(label, W) {
  section('tapLine — ' + label);
  var real = !!(W.tapTemplates && W.homeActivities.some(function (a) { return Array.isArray(a.tap); }));
  /* 템플릿 글자: 한글 · 숫자 · 띄어쓰기 · 마침표 · 치환자 · 금지 말 없음 */
  var tpls = []; Object.keys(BRAIN.DEFAULT_TAP).forEach(function (k) { tpls = tpls.concat(BRAIN.DEFAULT_TAP[k]); });
  if (W.tapTemplates) Object.keys(W.tapTemplates).forEach(function (k) { tpls = tpls.concat(W.tapTemplates[k]); });
  (W.homeActivities || []).forEach(function (a) { if (Array.isArray(a.tap)) tpls = tpls.concat(a.tap); });
  var badT = tpls.filter(function (x) { return !/^[가-힣0-9 .{}a-z]+$/.test(x) || TAP_BAN.test(x); });
  check(tpls.length >= 20 && badT.length === 0, 'tap templates: Hangul/digits/spaces/. only, no feeling/time words (' + tpls.length + ' · ' + badT.join(' | ') + ')');
  var errs = [], lens = [], soft = 0, kinds = { out: 0, home: 0, empty: 0 }, nulls = { out: 0, home: 0, empty: 0 }, srcs = {};
  var online = [true, true, true, false];
  for (var seed = 1; seed <= 500; seed++) {
    var visits = {}; if (seed % 3 === 0) Object.keys(W.nodes).forEach(function (k, i) { if (i % 2) visits[k] = 1; });
    var inp = baseInput(seed * 7919, { online: online[seed % 4], hint: seed % 17 === 0 ? 'https://example.org/x' : '', state: { visits: visits, affinity: {}, lantern: seed % 8, recent: [], todayOut: seed % 5 === 0 ? 2 : 0, posters: seed % 3, owned: [] } });
    var t = await BRAIN.plan(inp);
    t.status = 'done';
    kinds[t.kind]++;
    var before = JSON.stringify(t), r = BRAIN.tapLine(t), r2 = BRAIN.tapLine(t), r3 = BRAIN.tapLine(JSON.parse(before));
    if (JSON.stringify(t) !== before) errs.push(seed + ': tapLine changed the trip');
    if (JSON.stringify(r) !== JSON.stringify(r2) || JSON.stringify(r) !== JSON.stringify(r3)) errs.push(seed + ': not deterministic');
    if (!r) { nulls[t.kind]++; if (t.kind === 'out' && !/만 봤어|하나만/.test(t.poster && t.poster.line || '')) errs.push(seed + ': out walk without a line'); continue; }
    if (t.kind === 'empty') { errs.push(seed + ': empty demo turn has a line ' + r.text); continue; }
    srcs[r.src] = (srcs[r.src] || 0) + 1;
    var L = Array.from(r.text).length; lens.push(L); if (L <= BRAIN.TAP_SOFT) soft++;
    if (r.by !== 'demo-rules') errs.push(seed + ': by ' + r.by);
    if (L > BRAIN.TAP_MAX) errs.push(seed + ': too long ' + r.text);
    var pl = (t.poster && t.poster.line) || '';
    if (r.text === pl || pl.indexOf(r.text) >= 0) errs.push(seed + ': repeats the poster ' + r.text);
    if (r.text === t.reactionLine) errs.push(seed + ': repeats the reaction line ' + r.text);
    if (TAP_BAN.test(r.text)) errs.push(seed + ': banned word ' + r.text);
    var outside = r.part ? r.text.split(r.part).join('') : r.text;
    if (!/^[가-힣0-9 .]+$/.test(outside)) errs.push(seed + ': odd chars outside part ' + r.text);
    if (r.part && r.text.indexOf(r.part) < 0) errs.push(seed + ': part not in text');
    if (/[{}]/.test(r.text) || /^ |  | $/.test(r.text)) errs.push(seed + ': unfilled/blank slot ' + JSON.stringify(r.text));
    if (t.kind === 'home') {
      var act = W.homeActivities.filter(function (a) { return a.id === t.receipt.activity.id; })[0];
      if (!act || !Array.isArray(act.tap) || act.tap.indexOf(r.text) < 0) errs.push(seed + ': home line not from the activity ' + r.text);
      if (act && (String(act.line).indexOf(r.text) >= 0 || String(act.detail).indexOf(r.text) >= 0)) errs.push(seed + ': home line repeats the note ' + r.text);
    } else {
      var why = tapFactOk(W, t, r); if (why) errs.push(seed + ': ' + r.src + ' «' + r.text + '» not backed by the record (' + why + ')');
    }
  }
  check(errs.length === 0, 'tapLine over 500 plans: deterministic, read-only, ≤ ' + BRAIN.TAP_MAX + ' chars, no poster/reaction repeat, every fact backed by the record (' + errs.length + ' errors)' + (errs.length ? ' e.g. ' + errs.slice(0, 3).join(' | ') : ''));
  check(lens.length > 300 && soft / lens.length >= 0.95, 'tap lines are short: ≥ 95 % within ' + BRAIN.TAP_SOFT + ' chars (' + soft + '/' + lens.length + ')');
  check(kinds.empty === 0 || nulls.empty === kinds.empty, 'empty demo turns say nothing (' + nulls.empty + '/' + kinds.empty + ')');
  if (real) check(kinds.home === 0 || nulls.home === 0, 'every real home activity has its own tap line (' + nulls.home + ' home nulls / ' + kinds.home + ')');
  else check(nulls.home === kinds.home, 'activities without tap lines say nothing (' + nulls.home + '/' + kinds.home + ')');
  console.log('  tap srcs: ' + JSON.stringify(srcs));
  /* 정해진 경우 */
  check(BRAIN.tapLine(null) === null && BRAIN.tapLine({ by: 'legacy', kind: 'out', status: 'done' }) === null && BRAIN.tapLine({ by: 'robot', kind: 'out', status: 'done', seed: 1, receipt: { stops: [] } }) === null, 'legacy / unknown author → null');
  check(BRAIN.tapLine({ by: 'demo', kind: 'out', status: 'running', seed: 1, receipt: { stops: [{ nodeId: 'hat', name: '모자' }] } }) === null, 'unfinished trip → null');
  var crashFree = true;
  try { [{ by: 'demo', kind: 'out', status: 'done', seed: 3 }, { by: 'demo', kind: 'out', status: 'done', seed: 3, receipt: {} }, { by: 'demo', kind: 'out', status: 'done', seed: 3, receipt: { stops: [{}, { nodeId: 'nope' }] } }, { by: 'demo', kind: 'home', status: 'done', seed: 3 }].forEach(function (x) { BRAIN.tapLine(x); }); } catch (e) { crashFree = false; }
  check(crashFree, 'records missing receipt / returnReason / counts / names do not crash');
  var ids = Object.keys(W.nodes).filter(function (id) { return !/door_out|slow_room|letter_room/.test(id) && W.nodes[id].corner !== 'wild'; });
  var a0 = W.nodes[ids[0]], a1 = W.nodes[ids[1]], a2 = W.nodes[ids[2]];
  function mk(o) { return Object.assign({ by: 'demo', kind: 'out', status: 'done', seed: 77, poster: { line: '테스트 포스터 한 줄' }, reactionLine: '테스트 반응', reaction: '덤덤' }, o); }
  function stop(nd, o) { return Object.assign({ nodeId: nd.id, name: nd.name, status: 'builtin', first: false, viaTangent: false, ms: 5000 }, o || {}); }
  /* 제일 오래: 들판이 더 오래였으면 방 이름으로 '제일 오래' 라고 하지 않는다 · 최댓값이 둘이면 안 한다 */
  var wildLonger = mk({ receipt: { rememberedIdx: 0, returnReason: null, stops: [stop(a0, { ms: 4000 }), stop(a1, { ms: 9000 }), { nodeId: null, name: '깃펜', title: '깃펜', wild: true, status: 'read', ms: 9500, viaTangent: true }] } });
  var tie = mk({ receipt: { rememberedIdx: 0, returnReason: null, stops: [stop(a0, { ms: 4000 }), stop(a1, { ms: 9000 }), stop(a2, { ms: 9000 })] } });
  var many = 0;
  for (var sd = 1; sd <= 60; sd++) { [wildLonger, tie].forEach(function (x) { x.seed = sd; var rr = BRAIN.tapLine(x); if (rr && rr.src === 'demo:longest') many++; }); }
  check(many === 0, "'제일 오래' only for a unique maximum over all stops (a longer wild stop or a tie → never) (" + many + ')');
  /* 처음: '도' 없이, 그 방이 정말 처음일 때만 */
  var firsts = 0, wrongFirst = 0;
  for (sd = 1; sd <= 60; sd++) { var ft = mk({ seed: sd, receipt: { rememberedIdx: 0, returnReason: null, stops: [stop(a0, { first: false }), stop(a1, { first: true }), stop(a2, { first: false })] } }); var fr = BRAIN.tapLine(ft); if (fr && fr.src === 'demo:firstOther') { firsts++; if (fr.text.indexOf(tapRoomWord(a1.name)) !== 0 || /도 처음/.test(fr.text)) wrongFirst++; } }
  check(firsts > 0 && wrongFirst === 0, "first-visit line names only the room that was new, without '도' (" + firsts + ' lines, ' + wrongFirst + ' wrong)');
  /* 링크 따라: 샛길로 온 들판만 */
  var linkBad = 0;
  for (sd = 1; sd <= 80; sd++) { var lt = mk({ seed: sd, receipt: { rememberedIdx: 0, returnReason: null, stops: [stop(a0), { nodeId: null, name: '깃펜', title: '깃펜', wild: true, status: 'read', ms: 3000, viaTangent: false }] } }); var lr = BRAIN.tapLine(lt); if (lr && /링크/.test(lr.text)) linkBad++; }
  check(linkBad === 0, "'링크 따라' only for a wild stop reached through a link (" + linkBad + ')');
  /* 포스터 곳이 밖의 문이면 '{a} 말고' 줄은 이름이 비지 않는다 (빈 칸이 남는 줄은 버린다) */
  var blank = 0;
  for (sd = 1; sd <= 80; sd++) { var dt = mk({ seed: sd, receipt: { rememberedIdx: 0, returnReason: null, stops: [{ nodeId: 'door_out', name: '밖의 문', status: 'simulated', ms: 1000 }, stop(a1), stop(a2)] } }); var dr = BRAIN.tapLine(dt); if (dr && (/^ |^말고/.test(dr.text) || /  /.test(dr.text))) blank++; }
  check(blank === 0, 'no line with an empty name when the poster place is the outside door (' + blank + ')');
  /* 졸림 · 다리 반응 뒤엔 '다리가 무거워졌어' 를 하지 않는다 */
  var legs = 0;
  for (sd = 1; sd <= 80; sd++) {
    [mk({ seed: sd, reaction: '졸림', receipt: { rememberedIdx: 0, returnReason: 'tired', stops: [stop(a0), stop(a1), stop(a2), stop(W.nodes[ids[3]])] } }),
     mk({ seed: sd, reactionLine: '처음 가 본 데가 있었어. 다리를 쭉 뻗었어', reaction: '폴짝',   /* 11-14: 다리 말 하는 반응 줄 (모델이 쓸 수도 있다 — 데모 줄은 이제 다리를 말하지 않는다) */ receipt: { rememberedIdx: 0, returnReason: 'tired', stops: [stop(a0), stop(a1), stop(a2), stop(W.nodes[ids[3]])] } })]
      .forEach(function (x) { var rr = BRAIN.tapLine(x); if (rr && /다리가/.test(rr.text)) legs++; });
  }
  check(legs === 0, "no '다리가 무거워졌어' after a 졸림 reaction or a reaction line about legs (" + legs + ')');
  /* 무겁거나 기분처럼 읽히는 방 밖 이름(위키 제목)은 톡 한 줄에서 부르지 않는다 — 들판 · 포스터 곳('{a} 말고') · 못 읽은 곳 (검증 11-08: '들판에서 죽음을 만났어' · '링크 따라 행복까지 가 봤어') */
  var SENS = ['사랑', '행복', '죽음', '전쟁', '슬픔', '자살', '외로움', '오늘'], named = 0, sensLines = 0, sensErr = [];
  SENS.forEach(function (x) { if (!BRAIN.TAP_TITLE_AVOID.test(x)) sensErr.push('not avoided: ' + x); });
  for (sd = 1; sd <= 80; sd++) SENS.forEach(function (x, xi) {
    var wildStop = { nodeId: null, name: x, title: x, wild: true, status: 'read', ms: 3000 + xi, viaTangent: sd % 2 === 0 };
    [mk({ seed: sd, receipt: { rememberedIdx: 0, returnReason: null, stops: [stop(a0), wildStop, stop(a1)] } }),
     mk({ seed: sd, receipt: { rememberedIdx: 1, returnReason: null, stops: [stop(a0), wildStop, stop(a1, { first: true })] } }),
     mk({ seed: sd, receipt: { rememberedIdx: 0, returnReason: null, stops: [stop(a0), { nodeId: null, name: x, title: x, status: 'failed', ms: 2000 }, stop(a2)] } })]
      .forEach(function (tt) { var rr = BRAIN.tapLine(tt); if (rr) { sensLines++; if (rr.text.indexOf(x) >= 0) { named++; if (sensErr.length < 4) sensErr.push(rr.text); } } });
  });
  /* 위키가 그런 제목을 링크로 줄 때 (실제 계획): 300 계획 */
  var SENS_LINKS = ['깃털', '밀짚', '베레모', '사랑', '행복', '전쟁', '죽음', '고래', '등대', '슬픔', '바람'];
  var sensFetch = function (title) { var hh = 0; for (var q = 0; q < title.length; q++) hh = (hh * 31 + title.charCodeAt(q)) >>> 0; var l = []; for (var q2 = 0; q2 < 4; q2++) l.push(SENS_LINKS[(hh + q2 * 7) % SENS_LINKS.length]); return Promise.resolve({ ok: true, title: title, extract: title + '는 무엇이다. 둘째 문장.', url: 'https://ko.wikipedia.org/wiki/' + encodeURIComponent(title), thumb: null, links: l }); };
  var planNamed = 0, planWild = 0;
  for (var ps = 1; ps <= 300; ps++) {
    var pt = await BRAIN.plan(baseInput(ps * 104729, { fetchWiki: sensFetch, state: { visits: {}, affinity: {}, lantern: ps % 8, recent: [], todayOut: 0, posters: 1, owned: [] } }));
    pt.status = 'done';
    var pr = BRAIN.tapLine(pt); if (!pr || pt.kind !== 'out') continue;
    if (pt.receipt.stops.some(function (s) { return s.wild && BRAIN.TAP_TITLE_AVOID.test(s.title || s.name || ''); })) planWild++;
    if (SENS_LINKS.some(function (x) { return BRAIN.TAP_TITLE_AVOID.test(x) && pr.text.indexOf(x) >= 0; })) { planNamed++; if (sensErr.length < 6) sensErr.push('plan ' + ps + ': ' + pr.text); }
    var why2 = tapFactOk(W, pt, pr); if (why2) sensErr.push('plan ' + ps + ': ' + pr.text + ' (' + why2 + ')');
  }
  check(named === 0 && planNamed === 0 && sensLines > 0 && sensErr.length === 0, 'heavy / feeling-like titles outside the rooms are never named in a tap line — it falls through to another fact (' + sensLines + ' fixture lines · ' + planWild + ' plans met such a title' + (sensErr.length ? ' · ' + sensErr.slice(0, 4).join(' | ') : '') + ')');
  /* 반응 줄이 '처음' · '모르는 데' 를 말했으면 '다시 가 봤어' 는 없다 */
  var revBad = 0, revSeen = 0;
  for (sd = 1; sd <= 80; sd++) {
    ['오늘 길은 처음 가 본 길이었어', '모르는 데로 한 발 디뎠어', '별일 없는 산책이었어. 그래도 다녀왔어'].forEach(function (line, li) {   /* 11-14: 지금 world.js 반응 줄 (예전 '…또 가도 처음일 것 같아' · '…그게 재밌었어' · '그냥 그런 산책…') */
      var rv = BRAIN.tapLine(mk({ seed: sd, reaction: li < 2 ? '폴짝' : '덤덤', reactionLine: line, receipt: { rememberedIdx: 0, returnReason: null, stops: [stop(a0), stop(a1, { first: false }), stop(a2, { first: false })] } }));
      if (rv && rv.src === 'demo:revisit') { if (li < 2) revBad++; else revSeen++; }
    });
  }
  check(revBad === 0 && revSeen > 0, "no '다시 가 봤어' after a reaction line about a first / unknown place (" + revBad + ' bad · ' + revSeen + " revisit lines after '별일 없는 산책')");
  /* fresh(): 포스터 한 줄 · 반응 줄과 같은 말은 고르지 않는다 — 고를 줄을 일부러 포스터 · 반응 줄에 넣어도 다른 줄 */
  var freshTried = 0, freshSame = 0;
  for (var fs2 = 1; fs2 <= 200; fs2++) {
    var ftp = await BRAIN.plan(baseInput(fs2 * 7907, { state: { visits: {}, affinity: {}, lantern: fs2 % 8, recent: [], todayOut: 0, posters: 1, owned: [] } }));
    ftp.status = 'done';
    var fr0 = BRAIN.tapLine(ftp); if (!fr0) continue;
    ['poster', 'reaction'].forEach(function (where) {
      var cp = JSON.parse(JSON.stringify(ftp));
      if (where === 'poster') { cp.poster = cp.poster || {}; cp.poster.line = fr0.text; } else { cp.reactionLine = fr0.text; if (cp.receipt) cp.receipt.reactionLine = fr0.text; }
      var fr1 = BRAIN.tapLine(cp); freshTried++;
      if (fr1 && fr1.text === fr0.text) freshSame++;
    });
  }
  check(freshTried > 100 && freshSame === 0, 'a line already on the poster or in the reaction line is never picked again (' + freshSame + ' repeats / ' + freshTried + ' tries)');
  /* 젖었다는 말('이끼가 흠뻑 젖어 있었어')은 기록의 날씨가 비 · 가랑비일 때만 (등불 7 은 맑음) */
  var mossDef = (W.homeActivities || []).filter(function (a) { return a.id === 'moss' && Array.isArray(a.tap); })[0];
  if (mossDef) {
    var wetDry = 0, wetRain = 0;
    for (sd = 1; sd <= 120; sd++) ['clear', 'snow', undefined, 'rain', 'drizzle'].forEach(function (wx, wi) {
      var mt = { by: 'demo', kind: 'home', status: 'done', seed: sd, weather: wx, poster: { type: 'note', line: mossDef.line }, receipt: { activity: { id: 'moss', line: mossDef.line, detail: mossDef.detail } } };
      var mr = BRAIN.tapLine(mt); if (mr && /흠뻑|젖/.test(mr.text)) { if (wi < 3) wetDry++; else wetRain++; }
    });
    check(wetDry === 0 && wetRain > 0, "moss: '흠뻑 젖어' only on a recorded rain / drizzle day (" + wetDry + ' on dry or unknown days · ' + wetRain + ' on rainy days)');
  }
}

/* ───────── main ───────── */
/* ───────── 11-14 (주인 O1 b · 금지선 1): 데모 두뇌의 줄은 사실만 ─────────
   데모 두뇌가 지을 수 있는 글 전부 — js/world.js 의 모든 글 · js/brain.js · js/app.js · js/salon.js · js/play.js 의 글 상수(주석 밖) · 실제 계획 600개가 낸 줄(포스터 · 행 · 메모 · 힌트 메모 · 반응 줄 · 정류장 메모 · 톡 한 줄,
   치환자를 채운 뒤) — 에 마음 말(좋아함 · 재미 · 바람 · 궁금함 · 끌림 · 만족 …)이 없다. 사실이라 괜찮은 말은 아래 HONEST_OK 에 하나씩 (글 그대로 + 까닭) */
var CLAIM_RX = /좋아|좋았|좋은|제일 좋|그냥 그런|재밌|재미|싶|궁금|끌렸|끌려|꽂혔|(그걸로|그거면|이만하면|이걸로) 됐|됐다 싶|어도 됐|충분|설레|신나|신났|기뻐|기쁘|기뻤|행복|편안|편해|포근|반가|반갑|심심|외로|그리워|그립|신기|놀랐|맛있|즐거|즐겁|맘대로|마음대로|잘한 것|들썩|일 것 같|설렜|아쉬|아쉽|뿌듯|두근|편했|마음에 들|맘에 들|반했|반하|사랑|그리웠|무서|무섭|싫|슬프|슬펐|슬퍼|부끄|지루|귀찮|고마|고맙|기대돼|기대된|흥미|미안|속상|서운|섭섭|실망|짜증|화났|화가 나|감동|좋겠|원해|바랐|바래|즐겼|신이 나|든든|후련|개운|상쾌|기분|(어|아|여)야 해|(어|아|여)야지|좋|만족|다행|흐뭇|아늑|들떴|들뜬|들뜨|즐기|안심|설렘|외롭|그리움|쓸쓸|짜릿|부러워|부럽|부러웠|(?<!해)바라(?!보|봤|봐|본|볼)/;   /* '됐어' 는 만족 말 꼴만 ('완성됐어' 는 사실).
   11-15 (주인 C4 a): '-ㄹ래' 결정 꼴 (있을래 · 들어갈래 · 정할래 …) 은 더는 마음 말로 보지 않는다 — 결정은 코드가 정말 하는 일일 때만 쓰고 (보고서 · OWNER_DECISIONS 11-15), 바람 꼴 ('-고 싶' · '-면 좋겠' · '바라') 은 그대로 잡는다.
   재검 H1: '좋' 은 꼴 하나하나 (좋아 · 좋은 …) 가 아니라 다 (좋다 · 좋더라 · 좋네 · 좋던) — '좋은 아침' 같은 사실은 HONEST_OK. 만족 · 다행 · 흐뭇 · 아늑 · 들뜸 · 즐기 · 안심 · 설렘 · 외롭 · 그리움 · 쓸쓸 · 짜릿 · 부러움도. '부러졌' (깨짐) · '바라봤' (봄) 은 사실 */
/* 11-14 고침 둘째: 지난 꼴(설렜 · 아쉬웠 · 편했 · 그리웠 …)과 흔한 마음 말(마음에 들 · 뿌듯 · 두근 · 사랑 · 싫 · 무서 · 고마 …), 생각 말('~야 해' — 옛 '벽도 가끔은 바뀌어야 해')도 잡는다 */
var HONEST_OK = {
  '보울라인은 당겨도 안 조여서 뱃사람들이 좋아했대': '뱃사람 이야기 (문어 마음 아님)',
  '큰 날개깃이어야 해': '깃펜 만드는 법 (깃털 이야기 — 문어 생각 아님)',
  '좋은 아침': 'js/app.js 집 목소리 인사 (사람에게)', '좋은 오후': 'js/app.js 집 목소리 인사 (사람에게)'
};
var DECISION_OK = {   /* 글 전체가 이것과 같을 때만 (조각 허락 아님) — 결정을 말하는 줄. 이유 · 느낌 없음. 11-15 (주인 C4 a): '-ㄹ래' 는 더 안 잡으니 허락 목록이 아니라 기록 — 이 줄들이 파일에 그대로 있는지만 본다 */
  'js/salon.js': ['응, 해 볼래.', '그래, 바꿔 볼래.', '이 색 해 볼래.', '이대로 있을래.', '지금 색 그대로 있을래.'],
  'js/play.js': ['지금은 구경할래', '지금은 안 할래', '이따 할래']
};
function brainSourceStrings(file) {   /* 주석 밖 따옴표 글 (한글이 든 것) — 정규식 · 주석 속 옛 줄 인용은 빼고 */
  var src = fs.readFileSync(file, 'utf8'), out = [], i = 0, n = src.length, prev = '';
  while (i < n) {
    var c = src[i], d = src[i + 1];
    if (c === '/' && d === '*') { var e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    if (c === '/' && d === '/') { var e2 = src.indexOf('\n', i); i = e2 < 0 ? n : e2; continue; }
    if (c === '/' && !/[\w)\]$]/.test(prev)) {   /* 정규식 글자 — 건너뛴다 */
      var j = i + 1, cls = false;
      while (j < n && src[j] !== '\n') { if (src[j] === '\\') { j += 2; continue; } if (src[j] === '[') cls = true; else if (src[j] === ']') cls = false; else if (src[j] === '/' && !cls) break; j++; }
      i = j + 1; prev = 'x'; continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      var q = c, k = i + 1, buf = '';
      while (k < n && src[k] !== q) { if (src[k] === '\\') { buf += src[k + 1] === 'n' ? '\n' : src[k + 1]; k += 2; continue; } buf += src[k]; k++; }
      if (/[가-힣]/.test(buf)) out.push(buf);
      i = k + 1; prev = 'x'; continue;
    }
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return out;
}
function worldStrings(W) {
  var out = [];
  (function walk(o, key) {
    if (typeof o === 'string') { if (/[가-힣]/.test(o) && key !== 'wiki' && key !== 'emoji') out.push(o); return; }
    if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { if (k !== 'keywords') walk(o[k], k); });   /* keywords: 힌트 맞추기 낱말 (brain.js matchHint 만 읽는다 · 화면에 안 나온다 — '궁금함' · '두근') */
  })(W, '');
  return out;
}
async function honestDemoSuite(W) {
  section('demo lines say facts (11-14, owner O1 b)');
  /* 11-15 (주인 C4 a · 재검 H1): 검사 말 자체 — '-ㄹ래' 결정은 통과, 바람 · 좋음 · 그 밖 마음 말은 걸린다. 사실 말 (부러졌 · 바라봤 · 해바라기) 은 통과 */
  ['오늘은 집에 있을래.', '많이 걸었어. 담요 속으로 들어갈래', '내일은 어디로 갈지 자고 나서 정할래', '연필 심이 부러졌어', '창밖을 오래 바라봤어', '해바라기 씨는 나선이야'].forEach(function (t) { check(!CLAIM_RX.test(t), 'not a claim (decision or plain fact): ' + t); });
  ['나가고 싶어', '비가 오면 좋겠어', '여기 좋더라', '좋네', '좋다', '좋던 데', '만족해', '다행이야', '흐뭇해', '아늑해', '들떴어', '들뜬 하루', '산책을 즐기고', '안심했어', '설렘', '외롭지 않아', '그리움', '쓸쓸했어', '짜릿해', '부러워', '내일은 맑기를 바라'].forEach(function (t) { check(CLAIM_RX.test(t), 'claim word is caught: ' + t); });
  check(W.strings.homeStay === '오늘은 집에 있을래.' && !/싶|그냥/.test(W.strings.homeStay), "home-day line is the plain decision '오늘은 집에 있을래.' (no motive clause)");
  var seen = {}, bad = {};
  function look(t, where) {
    if (typeof t !== 'string' || !t) return;
    seen[t] = 1;
    var rest = t; Object.keys(HONEST_OK).forEach(function (ok) { rest = rest.split(ok).join(' '); });   /* 채운 줄 속의 허락된 사실 조각은 빼고 본다 */
    if (CLAIM_RX.test(rest)) bad[where + ': ' + t] = 1;
  }
  worldStrings(W).forEach(function (t) { look(t, 'world.js'); });
  ['ignoredHintLine', 'homeStay', 'affinityNone'].forEach(function (k) { check(typeof W.strings[k] === 'string' && W.strings[k], 'world.strings.' + k + ' is still there'); });
  var bs = brainSourceStrings(path.join(ROOT, 'js/brain.js'));
  check(bs.length > 100 && bs.indexOf('{hint} 보는 건 다음에. 오늘은 {mem} 쪽으로 갔어') >= 0, 'brain.js string constants were read (' + bs.length + ')');
  bs.forEach(function (t) { look(t, 'brain.js'); });
  /* js/app.js 가 데모 차례에 대신 쓰는 줄 (집 · 문어의 요즘 빈 줄 — 11-14 전엔 '오늘은 집에 있을래' · '아직 어디가 좋은지 몰라') 과 그 밖의 글 상수 */
  var as = brainSourceStrings(path.join(ROOT, 'js/app.js'));
  check(as.length > 300, 'app.js string constants were read (' + as.length + ')');
  as.forEach(function (t) { look(t, 'app.js'); });
  /* 11-14 고침 둘째: js/salon.js · js/play.js 도 규칙이 짓는 문어 목소리 줄이 있다 — 같은 말로 본다. 그 '-ㄹ래' 결정 줄(규칙이 정한 대답 그 자체)만 글 그대로 허락 (DECISION_OK, 주인 몫 C4 가 정할 때까지) */
  ['js/salon.js', 'js/play.js'].forEach(function (f) {
    var fs2 = brainSourceStrings(path.join(ROOT, f)), used = {};
    check(fs2.length > 10, f + ' string constants were read (' + fs2.length + ')');
    fs2.forEach(function (t) { if (DECISION_OK[f] && DECISION_OK[f].indexOf(t) >= 0) { used[t] = 1; seen[t] = 1; return; } look(t, f); });
    (DECISION_OK[f] || []).forEach(function (t) { check(used[t], f + ' decision line on the allow-list is still in the file: ' + t); });
  });
  /* 같은 줄의 짝: world.js 가 데이터, brain.js 는 없을 때의 사본 — 글이 같다 */
  check(bs.indexOf(W.strings.ignoredHintLine) >= 0, 'brain.js IGNORED_NOTE = world.strings.ignoredHintLine (' + W.strings.ignoredHintLine + ')');
  W.lineTemplates.ignored.forEach(function (t) { check(bs.indexOf(t) >= 0, 'brain.js DEFAULT_TEMPLATES.ignored has the world line: ' + t); });
  check(bs.indexOf(W.lineTemplates.linger[0]) >= 0 && bs.indexOf(W.memoTemplates.nextNone[0]) >= 0 && bs.indexOf(W.memoTemplates.lead.followedThenLeft[0]) >= 0, 'brain.js linger · nextNone · memo lead copies = world.js');
  W.tapTemplates.enough.forEach(function (t) { check(BRAIN.DEFAULT_TAP.enough.indexOf(t) >= 0, 'brain.js DEFAULT_TAP.enough has the world line: ' + t); });
  /* 실제 계획: 치환자를 채운 줄 */
  var kinds = {}, n = 0;
  var hints = ['', '', '모자의 역사', '우산', '차 한 잔', 'https://example.org/x', '고래의 노래', '아무거나 이상한 말'];
  for (var seed = 1; seed <= 600; seed++) {
    var visits = {}; if (seed % 3 === 0) Object.keys(W.nodes).forEach(function (k, i) { if (i % 2) visits[k] = 1 + (seed % 3); });
    var t = await BRAIN.plan(baseInput(seed * 6151, { online: seed % 5 !== 0, hint: hints[seed % hints.length], now: seed % 7 === 0 ? NOW_NIGHT : NOW_DAY,
      state: { visits: visits, affinity: seed % 4 ? {} : { sea: 2 }, lantern: seed % 9, recent: [], todayOut: seed % 6 === 0 ? 2 : 0, posters: seed % 4, owned: [] } }));
    kinds[t.kind] = (kinds[t.kind] || 0) + 1; n++;
    allLines(t).forEach(function (x) { look(x, 'plan ' + seed); });
    if (t.hint) look(t.hint.note, 'plan ' + seed + ' hint');
    if (t.memo) { look(t.memo.tomorrow, 'plan ' + seed + ' memo'); Object.keys(t.memo.notes || {}).forEach(function (k) { look(t.memo.notes[k], 'plan ' + seed + ' memo note'); }); }
    if (t.revisit) look(typeof t.revisit === 'string' ? t.revisit : t.revisit.line, 'plan ' + seed + ' revisit');
    if (t.receipt && t.receipt.activity) { look(t.receipt.activity.line, 'plan ' + seed + ' activity'); look(t.receipt.activity.detail, 'plan ' + seed + ' activity'); }
    t.status = 'done';
    var tl = BRAIN.tapLine(t); if (tl) look(tl.text, 'plan ' + seed + ' tap');
  }
  var badList = Object.keys(bad);
  check(n === 600 && kinds.out > 100 && kinds.home > 10, 'plans ran (' + JSON.stringify(kinds) + ', ' + Object.keys(seen).length + ' distinct lines)');
  check(badList.length === 0, 'no demo line claims a feeling, a liking, a want, curiosity or contentment (' + badList.length + (badList.length ? ': ' + badList.slice(0, 8).join(' | ') : '') + ')');
  Object.keys(HONEST_OK).forEach(function (k) { check(CLAIM_RX.test(k), 'allow-list entry still needs to be there (it matches the claim words): ' + k); });
}

(async function main() {
  try {
    var W = fakeWorld();
    global.WORLD = W;
    await unitTests();
    await planSuite('fake WORLD', W, true);
    await tapSuite('fake WORLD', W);
    await drawOrderSuite();
    await shelfSuite(W);

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
          await tapSuite('real js/world.js', RW);
          await honestDemoSuite(RW);
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
