/* mcp/core.js — 뽈뽈 문어 MCP 서버의 몸통 (MCP 와 상관없는 순수 로직 + 상태 파일)
 *
 * - 게임의 세계 데이터(js/world.js)와 두뇌 도우미(js/brain.js)를 읽기만 한다. 게임 코드는 고치지 않는다.
 * - 산책 하나 = PROTOCOL §1 이벤트 배열. finish/stay_home/empty_turn 때 out/<날짜>-<n>.json 으로 쓴다
 *   (게임 개발 모드 #d-json 에 그대로 붙여 넣으면 APP.importEvents 로 재생된다).
 * - 상태는 state.json 하나 (커밋하지 않는다). 위키는 진짜로 읽고, 못 읽으면 못 읽었다고 돌려준다.
 * - 모델이 쓴 글은 줄이지도 고치지도 않는다. 안 쓴 것은 비워 둔다.
 */
'use strict';
var fs = require('fs');
var path = require('path');
var WORLD = require('../js/world.js');
var BRAIN = require('../js/brain.js');
BRAIN.setWorld(WORLD);

/* 고정 문장 (CORE_LOOP_V2 §4.2 초안을 다듬은 것. 모든 모드에서 같은 글) */
var FIXED_SENTENCE = '사람은 산책에 따라올 수도 있고 집에 있을 수도 있다. 어느 쪽인지는 알려 주지 않는다. ' +
  '길과 읽을 것은 네가 정하고, 사람이 그동안 무엇을 했는지는 전해지지 않는다.';
var NOTES_HEAD = '지난 산책에서 네가 남긴 메모:';   /* 사실만. '이어 가도…' 같은 허락 목록은 그쪽으로 끈다 (11-09 실험) */
var NOTES_IN = 3;
var WIKI_API = 'https://ko.wikipedia.org/w/api.php';
var UA = 'ppolppol-octopus-mcp/0.1 (local game; https://github.com/skadmlwls9455-pixel/Let-s-model-play)';
var MENU = { meet: ['say', 'wave', 'watch', 'stop'], chat: ['say', 'watch', 'stop'], table: ['eat', 'taste', 'save', 'watch', 'stop'] };
var EXPRS = ['happy', 'idle', 'curious', 'calm'];
var REASONS = ['enough', 'tired', 'linger'];
var CHAT_MAX = 2, TABLE_GAP_MS = 30000, TABLE_DAY_MAX = 5;

function isNoneNode(n) { return !!(n && (n.linger || n.id === 'letter_room' || n.peek === 'none')); }
function str(x) { return typeof x === 'string' && x.length ? x : undefined; }
function pad2(n) { return (n < 10 ? '0' : '') + n; }
function rid(prefix) { return prefix + '_' + Math.random().toString(36).slice(2, 8); }

/* 진짜 위키 읽기 — brain.js 와 같은 질의·같은 해석(parseWikiResponse), 서버라서 User-Agent 를 붙인다 */
function wikiFetch(title, opts) {
  opts = opts || {};
  var ms = opts.timeoutMs || 6000;
  var ac = new AbortController();
  var timer = setTimeout(function () { ac.abort(); }, ms);
  var url = WIKI_API + '?action=query&format=json&redirects=1&prop=extracts|pageimages|links' +
    '&exintro=1&explaintext=1&exsentences=' + (opts.sentences || 2) + '&piprop=thumbnail&pithumbsize=480&pllimit=50&plnamespace=0' +
    '&titles=' + encodeURIComponent(String(title));
  return fetch(url, { signal: ac.signal, headers: { 'User-Agent': UA, 'Api-User-Agent': UA } })
    .then(function (res) { if (!res.ok) throw new Error('http ' + res.status); return res.json(); })
    .then(function (data) { clearTimeout(timer); return BRAIN.parseWikiResponse(title, data); })
    .catch(function (e) { clearTimeout(timer); return { ok: false, reason: e && e.name === 'AbortError' ? 'timeout' : 'network' }; });
}
/* 출처는 ko.wikipedia 문서 주소만, 사진은 upload.wikimedia.org 만 (brain.js 재생 정규화와 같게) */
function cleanSource(r) {
  if (!r || !r.ok || !/^https:\/\/ko\.wikipedia\.org\/wiki\/\S+$/.test(r.url || '')) return null;
  var th = r.thumb && /^https:\/\/upload\.wikimedia\.org\/\S+$/.test(r.thumb.url || '') ? { url: r.thumb.url, w: r.thumb.w || null, h: r.thumb.h || null } : null;
  return { url: r.url, extract: String(r.extract || '').slice(0, 160), thumb: th, license: 'CC BY-SA 4.0', attribution: 'Wikipedia (ko)' };
}

/* ───── 뽈뽈 도서관 (library/books/<방id>.md) ─────
   사람이 쓴 짧은 책. 방에 책이 있으면 위키 대신 그 책을 읽는다 (네트워크 없음 · 크기 고정).
   책은 '자료' 다: 누가 썼는지 (by) 를 늘 같이 보낸다. 쓴 사람의 글은 고치지 않는다 */
var BOOK_HEAD = 500, BOOK_MAX = 1200;
function parseBook(txt, file) {
  var m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(String(txt).replace(/\r\n/g, '\n'));
  if (!m) return { error: file + ': 맨 위 --- 머리말이 없다' };
  var meta = {};
  m[1].split('\n').forEach(function (l) { var k = /^([a-z]+):\s*(.*)$/.exec(l.trim()); if (k) meta[k[1]] = k[2].trim(); });
  var body = m[2].trim();
  if (!meta.room) return { error: file + ': room 이 없다' };
  if (!meta.by) return { error: file + ': by (쓴 사람) 가 없다' };
  if (!body) return { error: file + ': 본문이 비었다' };
  if (body.length > BOOK_MAX) return { error: file + ': 본문이 ' + body.length + '자 — ' + BOOK_MAX + '자 이하로' };
  return { room: meta.room, title: meta.title || null, by: meta.by, written: meta.written || null, sources: meta.sources || null, text: body };
}
function loadBooks(dir) {
  var books = {}, errors = [];
  var files = []; try { files = fs.readdirSync(dir).filter(function (f) { return /\.md$/.test(f) && f[0] !== '_'; }); } catch (e) { return { books: books, errors: errors }; }
  files.forEach(function (f) {
    var b = parseBook(fs.readFileSync(path.join(dir, f), 'utf8'), f);
    if (b.error) errors.push(b.error);
    else if (!WORLD.nodes[b.room] || b.room === 'door_out') errors.push(f + ': 그런 방 (' + b.room + ') 이 없다');
    else if (isNoneNode(WORLD.nodes[b.room])) errors.push(f + ': ' + b.room + ' 은 읽을 것이 없는 방이다 (느린 글의 방·편지의 방) — 책을 두지 않는다');
    else if (books[b.room]) errors.push(f + ': ' + b.room + ' 방에 책이 이미 있다');
    else books[b.room] = b;
  });
  return { books: books, errors: errors };
}

function Octopus(opts) {
  opts = opts || {};
  this.dir = opts.dir || __dirname;
  this.statePath = opts.statePath || path.join(this.dir, 'state.json');
  this.outDir = opts.outDir || path.join(this.dir, 'out');
  this.fetchWiki = opts.fetchWiki || wikiFetch;
  var lb = loadBooks(opts.booksDir || path.join(__dirname, '..', 'library', 'books'));
  this.books = lb.books; this.bookErrors = lb.errors;   /* 깨진 책은 건너뛴다 (서버는 뜬다). 고칠 곳은 check-books 가 알려 준다 */
  this.now = opts.now || function () { return new Date(); };
  this.model = opts.model || null;          /* 알 때만 (PPOLPPOL_MODEL) */
  this.name = opts.name || null;            /* 사람이 지어 준 이름 (PPOLPPOL_NAME). 없으면 넣지 않는다 */
  this.S = this.load();
}

Octopus.prototype.load = function () {
  var s = null;
  try { s = JSON.parse(fs.readFileSync(this.statePath, 'utf8')); } catch (e) { /* 처음 */ }
  s = s && typeof s === 'object' ? s : {};
  return {
    v: 1,
    visits: s.visits || {},
    trips: Array.isArray(s.trips) ? s.trips : [],
    notes: Array.isArray(s.notes) ? s.notes : [],
    talk: Array.isArray(s.talk) ? s.talk : [],
    met: !!s.met,
    pending: s.pending || null,              /* 지금 걸려 있는 결정 지점 하나 */
    chat: s.chat || null,                    /* { tripId, asked } */
    table: s.table || { offer: null, asked: [] },
    running: s.running || null
  };
};
Octopus.prototype.save = function () {
  fs.mkdirSync(path.dirname(this.statePath), { recursive: true });
  var tmp = this.statePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(this.S, null, 1));
  fs.renameSync(tmp, this.statePath);
};
Octopus.prototype.dateKey = function () { var d = this.now(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); };

/* ───── 메모 ───── */
Octopus.prototype.activeNotes = function () {
  return this.S.notes.filter(function (n) { return n.status === 'active'; })
    .sort(function (a, b) { return a.at < b.at ? 1 : a.at > b.at ? -1 : 0; });
};
function noteOut(n) {
  var o = { id: n.id, text: n.text };
  if (n.about) o.about = n.about;
  o.by = n.by; if (n.model) o.model = n.model; o.session = n.session; o.at = n.at;
  return o;
}
Octopus.prototype.notesBlock = function () {
  var list = this.activeNotes().slice(0, NOTES_IN).map(noteOut);
  return list.length ? { head: NOTES_HEAD, notes: list } : null;   /* 없으면 아무 말도 (보관 메모가 있다는 것도) 하지 않는다 */
};

/* ───── 방 ───── */
Octopus.prototype.lantern = function () {
  var days = {}; this.S.trips.forEach(function (t) { days[t.date] = 1; });
  return Math.min(8, Object.keys(days).length);
};
Octopus.prototype.wallPosters = function () {
  return this.S.trips.filter(function (t) { return t.posterHung; }).slice(-6).map(function (t) { return t.posterTitle || null; });
};
Octopus.prototype.lately = function () {
  var byCorner = {}, v = this.S.visits;
  Object.keys(v).forEach(function (id) { var n = WORLD.nodes[id]; if (n) byCorner[n.corner] = (byCorner[n.corner] || 0) + v[id]; });
  var top = Object.keys(byCorner).sort(function (a, b) { return byCorner[b] - byCorner[a]; })[0];
  return top && byCorner[top] >= 3 ? WORLD.strings.affinityCorner(WORLD.corners[top].name) : null;
};
Octopus.prototype.activities = function () {
  var lan = this.lantern(), posters = this.wallPosters().length;
  return WORLD.homeActivities.filter(function (a) {
    if (a.requiresLantern && lan < a.requiresLantern) return false;
    if (a.maxLantern != null && lan > a.maxLantern) return false;
    if (a.requiresPoster && !posters) return false;
    return true;
  }).map(function (a) { return { id: a.id, line: a.line }; });
};

/* ───── 결정 지점 (meet · chat · table) ─────
   걸려 있던 것을 모델이 그냥 지나치면 '대답 안 함'(fallback) 으로만 적는다. 고른 것처럼 꾸미지 않는다. */
Octopus.prototype.offer = function (sit) {
  this.dropPending();
  sit.id = rid('dp');
  this.S.pending = sit;
  return sit;
};
Octopus.prototype.dropPending = function () {
  var p = this.S.pending; if (!p) return;
  if (p.point !== 'table') this.talkRecord(p, { by: 'fallback', text: null });
  this.S.pending = null;
};
Octopus.prototype.talkRecord = function (sit, o) {
  var e = { id: rid('tk'), at: this.now().toISOString(), day: this.dateKey(), who: 'octopus', kind: sit.point === 'meet' ? 'intro' : sit.point, by: o.by };
  if (o.by === 'model' && this.model) e.model = this.model;
  if (o.action) e.action = o.action;
  if (sit.q) e.q = sit.q;
  if (sit.tripId) e.tripId = sit.tripId;   /* 어느 산책 뒤의 대화인지 (echo-check 가 잇는다) */
  if (sit.point === 'table') e.offer = sit.offer;
  e.text = o.text == null ? null : o.text;
  if (o.expr) e.expr = o.expr;
  if (o.note) e.note = o.note;
  if (sit.tripId) e.tripId = sit.tripId;
  this.S.talk.push(e);
  this.writeTalk();
  return e;
};
Octopus.prototype.writeTalk = function () {
  fs.mkdirSync(this.outDir, { recursive: true });
  fs.writeFileSync(path.join(this.outDir, 'talk.json'), JSON.stringify(this.S.talk.filter(function (t) { return t.kind === 'intro' || t.kind === 'chat' || t.kind === 'table'; }), null, 1));
};
Octopus.prototype.meetSituation = function () {
  if (this.S.met) return null;
  this.S.met = true;   /* 처음 한 번만 묻는다 (대답하든 안 하든) */
  var h = this.now().getHours();
  var facts = { firstInRoom: true, timeOfDay: h < 6 ? '밤' : h < 11 ? '아침' : h < 17 ? '낮' : h < 21 ? '저녁' : '밤' };
  if (this.name) facts = Object.assign({ name: this.name }, facts);
  return this.offer({ point: 'meet', facts: facts, menu: MENU.meet.slice() });
};
var CHAT_Q = { out: ['어디 갔어?', '뭐 봤어?'], home: ['뭐 했어?', '어땠어?'] };
Octopus.prototype.chatSituation = function (trip) {
  var c = this.S.chat;
  if (!c || c.tripId !== trip.id || c.asked >= CHAT_MAX) return null;
  var q = (CHAT_Q[trip.kind === 'home' ? 'home' : 'out'])[c.asked];
  c.asked++;
  /* MCP 만으로 놀 때 이 물음은 사람이 고른 게 아니라 게임이 정해 둔 기본 순서다 — 그렇다고 적는다 (모델을 속이지 않는다) */
  return this.offer({ point: 'chat', round: c.asked, q: q, asker: 'game', tripId: trip.id, menu: MENU.chat.slice() });
};
/* 식탁: 사람이 차렸을 때만 (cli.js table). 산책 중엔 안 묻는다 — 늘 finish 뒤. 상한 넘으면 묻지 않고 기록도 없다 */
Octopus.prototype.tableSituation = function () {
  var t = this.S.table;
  if (!t.offer || this.S.running || (this.S.pending && this.S.pending.point !== 'table')) return null;
  var now = this.now().getTime(), day = this.dateKey();
  var today = t.asked.filter(function (a) { return a.day === day; });
  var last = t.asked.length ? t.asked[t.asked.length - 1].ms : 0;
  var offer = t.offer; t.offer = null;   /* 접시는 식탁에 그대로. 묻는 건 한 번뿐 */
  if (today.length >= TABLE_DAY_MAX || now - last < TABLE_GAP_MS) return null;
  t.asked.push({ day: day, ms: now });
  var mine = this.activeNotes().filter(function (n) { return n.by === 'model'; })[0];
  return this.offer({ point: 'table', offer: offer, oct: { place: 'attic', awake: true }, note: mine ? mine.text : null, menu: MENU.table.slice() });
};
Octopus.prototype.putDish = function (name, tier) {
  this.S.table.offer = { kind: 'dish', name: String(name), tier: Number(tier) || 1, by: 'user' };
  this.save();
};

/* 결과에 걸린 결정 지점 붙이기: 하나만 */
function withDecision(out, sit) { if (sit) out.decision = sit; return out; }

/* ───── 도구 ───── */
Octopus.prototype.lookRoom = function (a) {
  a = a || {};
  var out = { lantern: this.lantern() + '/8 (초대받은 날마다 한 칸씩 켜지는 방 꾸밈. 기운과는 상관없다)', posters: this.wallPosters(), activities: this.activities() };
  /* '요즘 ○○ 방을 자꾸 가네' (lately) 는 게임 화면 몫이다. 모델에게는 코드가 만든 쏠림 문장을 주지 않는다 */
  if (this.S.running) out.walking = this.S.running.id;
  var nb = this.notesBlock(); if (nb) { out.notes = nb; this.S.notesShownAt = this.S.trips.length; }
  if (a.archived) {
    var act = this.activeNotes();
    out.archived = this.S.notes.filter(function (n) { return n.status !== 'active' || act.indexOf(n) >= NOTES_IN; }).map(noteOut);
  }
  var sit = this.meetSituation() || this.tableSituation();
  this.save();
  return withDecision(out, sit);
};

Octopus.prototype.depart = function (a) {
  a = a || {};
  if (this.S.running) return { error: '이미 나가 있어 (' + this.S.running.id + '). ppolppol_finish 로 언제든 끝낼 수 있어.' };
  this.dropPending();
  var dk = this.dateKey(), seq = this.S.trips.filter(function (t) { return t.date === dk; }).length + 1;
  /* 힌트·주제는 받지 않는다 (결정 18: 부탁이 없으니 거절도 없다). 이벤트 모양은 PROTOCOL §1 그대로 — hint 는 늘 빈 글 */
  var trip = { id: rid('trip'), date: dk, seq: seq, kind: 'out', startedAt: this.now().getTime(), lastT: 0, events: [], stops: [] };
  trip.events.push({ type: 'depart', t: 0, hint: '', followHint: false });
  this.S.running = trip;
  var out = { tripId: trip.id, library: this.library() };
  /* 메모는 한 차례에 한 번만 (CURIOSITY_NOTES 원칙 4: 거듭 보여 주면 계속 그쪽으로 끈다). look_room 이 이미 보였으면 싣지 않는다 */
  var nb = this.S.notesShownAt === this.S.trips.length ? null : this.notesBlock(); if (nb) out.notes = nb;
  this.save();
  return out;
};

/* 오늘 열린 방 — 모퉁이마다 OPEN_PER_CORNER 개, 날짜로 정해진다 (날씨처럼 그날은 같고 날마다 바뀐다).
   주제를 시키지 않는다: 보이는 방만 바뀐다. 목록에 없는 방 id 나 아무 위키 문서로 가는 길은 그대로 열려 있다 */
var OPEN_PER_CORNER = 2;
Octopus.prototype.openRooms = function () {
  var r = BRAIN.rng(BRAIN.hashSeed('open-rooms', this.dateKey())), groups = {};
  Object.keys(WORLD.nodes).sort().forEach(function (id) { if (id !== 'door_out') (groups[WORLD.nodes[id].corner] = groups[WORLD.nodes[id].corner] || []).push(id); });
  var open = {};
  Object.keys(groups).sort().forEach(function (c) {
    var ids = groups[c].slice();
    for (var i = ids.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = ids[i]; ids[i] = ids[j]; ids[j] = t; }
    ids.slice(0, OPEN_PER_CORNER).forEach(function (id) { open[id] = 1; });
  });
  return open;
};

/* 도서관 방 목록 — 오늘 열린 방만, 모퉁이별 한 줄 ('id 이름', * 엉뚱한 방) */
Octopus.prototype.library = function () {
  var by = {}, open = this.openRooms();
  Object.keys(WORLD.nodes).forEach(function (id) {
    if (id === 'door_out' || !open[id]) return;
    var n = WORLD.nodes[id], c = WORLD.corners[n.corner], key = n.corner + (c && c.name ? ' ' + c.name : '');
    (by[key] = by[key] || []).push(id + ' ' + n.name + (n.odd ? '*' : ''));   /* 가 본 횟수는 싣지 않는다 — 다닌 길이 눈에 띄면 그쪽으로 끈다. 처음인지는 peek 의 first 로 안다 */
  });
  Object.keys(by).forEach(function (k) { by[k] = by[k].join(', '); });
  return by;
};

/* 나가면서 바로 첫 곳 (선택) — 왕복 한 번을 줄인다. first 를 안 주면 depart 와 같다 */
Octopus.prototype.go = async function (a) {
  a = a || {};
  /* 이미 나가 있으면 오류 대신 지금 산책을 이어 준다 (진짜 판: depart 를 두 번 불러 왕복 하나를 버렸다) */
  var out = this.S.running ? { tripId: this.S.running.id, walking: true } : this.depart(a);
  if (out.error || !a.first) return out;
  out.peek = await this.peek({ target: a.first, more: a.more });
  return out;
};

Octopus.prototype.peek = async function (a) {
  a = a || {};
  var trip = this.S.running;
  if (!trip || (a.tripId && trip.id !== a.tripId)) return { error: '나가 있는 산책이 없거나 tripId 가 달라. 지금: ' + (trip ? trip.id : '없음') };
  var tg = a.target || {}, W = WORLD, node = null, target, status, src = null, clue = null, links, raw = null;
  if (tg.kind === 'room') {
    node = W.nodes[tg.id];
    if (!node || tg.id === 'door_out') return { error: '그런 방 id 는 없어. depart 의 library 에서 고르거나, { kind: "wiki", title } 로 들판에 가도 돼.' };
    target = { kind: 'room', id: node.id, title: node.name, wiki: node.wiki || null };
    var book = this.books[node.id];
    if (isNoneNode(node) && !book) status = 'none';
    else if (book) { status = 'builtin'; }   /* 이 방 책장의 책을 읽었다. 기록 status 는 PROTOCOL 다섯 값 안의 builtin (제안: 'book') */
    else {
      var r = node.wiki ? await this.fetchWiki(node.wiki, { timeoutMs: 6000, sentences: a.more ? 6 : 2 }) : { ok: false, reason: 'no_wiki' };
      src = cleanSource(r);
      if (src) { status = 'read'; links = r.links; raw = r; }
      else if (node.clue) { status = 'builtin'; clue = node.clue; }   /* 바깥 글은 못 읽고 책장 메모를 읽었다 */
      else status = 'failed';
    }
  } else if (tg.kind === 'wiki' && str(tg.title)) {
    target = { kind: 'wiki', title: tg.title };
    var w = await this.fetchWiki(tg.title, { timeoutMs: 6000, sentences: a.more ? 6 : 2 });
    src = cleanSource(w);
    status = src ? 'read' : 'failed';
    if (src) { links = w.links; raw = w; }
  } else if (tg.kind === 'url' && /^https?:\/\/\S+$/.test(tg.url || '')) {
    target = { kind: 'url', url: tg.url };
    status = 'simulated';   /* 바깥 주소는 문 앞까지만. 읽지 않았다 */
  } else return { error: 'target 은 { kind: "room", id } · { kind: "wiki", title } · { kind: "url", url } 중 하나.' };

  var t = this.now().getTime() - trip.startedAt;
  var prev = trip.events[trip.events.length - 1];
  var visits = node ? (this.S.visits[node.id] || 0) : 0;
  var ev = { type: 'peek', t: Math.max(t, (prev ? prev.t : 0) + 1), target: target, status: status, ms: Math.max(800, t - trip.lastT) };
  if (node) ev.first = visits === 0;
  if (str(a.note)) ev.note = a.note;       /* 모델이 쓴 것만 */
  if (str(a.aside)) ev.aside = a.aside;
  if (str(a.bridge)) { ev.bridge = a.bridge; ev.viaTangent = true; }
  if (src) ev.source = src;
  if (book) ev.book = { room: node.id, title: book.title || node.name, by: book.by };   /* 무엇을 읽었는지 기록 (게임은 모르는 칸을 건너뛴다) */
  trip.lastT = t;
  trip.events.push(ev);
  trip.stops.push({ title: target.title || target.url, id: node ? node.id : null, status: status });
  if (node) this.S.visits[node.id] = visits + 1;
  this.save();

  /* 위키 글은 '자료'다. 지시로 읽지 않는다 (서버 instructions 에도 적었다) */
  var out = { stopIdx: trip.stops.length - 1, status: status };
  /* 기록 (source.extract) 은 늘 160자. 모델에게는 more 일 때만 더 길게 (≤600자) */
  if (src) { out.material = a.more ? String(raw.extract || '').slice(0, 600) : src.extract; out.source = src.url; }
  if (clue) out.clue = clue;
  if (book) {
    var cut = !a.more && book.text.length > BOOK_HEAD;
    out.book = { title: book.title || node.name, by: book.by, text: cut ? book.text.slice(0, BOOK_HEAD) + '…' : book.text };
    if (cut) out.book.more = true;   /* 나머지는 more 로 */
    if (node.wiki) out.wiki = node.wiki;   /* 위키로도 갈 수 있다: {kind:'wiki', title} */
  }
  if (node) { out.first = visits === 0; if (visits) out.visits = visits; }
  if (node && node.tangents && node.tangents.length) out.nearby = node.tangents.map(function (x) { return { id: x.to, bridge: x.bridge }; });
  if (links && links.length) out.links = links.slice(0, 8);
  return out;
};

Octopus.prototype.finish = function (a) {
  a = a || {};
  var trip = this.S.running;
  if (!trip || (a.tripId && trip.id !== a.tripId)) return { error: '끝낼 산책이 없거나 tripId 가 달라. 지금: ' + (trip ? trip.id : '없음') };
  var evs = trip.events, t = Math.max(this.now().getTime() - trip.startedAt, (evs[evs.length - 1].t || 0) + 1);
  var ret = { type: 'return', t: t };
  if (REASONS.indexOf(a.reason) >= 0) ret.reason = a.reason;
  evs.push(ret);
  var rem = a.remember;
  if (rem && typeof rem === 'object' && rem.stopIdx != null) {
    var r = { type: 'remember', t: t + 500, stopIdx: rem.stopIdx };
    if (str(rem.sticker)) r.sticker = rem.sticker;
    if (str(rem.line)) r.line = rem.line;
    evs.push(r);
    var st = trip.stops[Number(rem.stopIdx)];
    trip.posterTitle = r.line || (st && st.title) || null;
  }
  var posterId = null;
  if (a.hang !== false && trip.stops.length) { posterId = 'poster_' + trip.id.slice(5); evs.push({ type: 'hang_poster', t: t + 1000, posterId: posterId }); trip.posterHung = true; }
  evs.push(this.wrapUp(a, t + 1500));
  return this.close(trip, posterId ? { posterId: posterId } : {});
};

/* 마무리: 전부 선택. 준 것만 넣는다 */
Octopus.prototype.wrapUp = function (a, t) {
  var w = { type: 'wrap_up', t: t };
  if (str(a.reaction)) w.reaction = a.reaction;
  if (str(a.line)) w.line = a.line;
  if (a.memo && typeof a.memo === 'object') w.memo = a.memo;
  if (str(a.tomorrow)) w.memo = Object.assign({}, w.memo || {}, { tomorrow: a.tomorrow });
  var note = typeof a.note === 'string' ? { text: a.note } : a.note;
  if (note && str(note.text)) {
    w.note = { text: note.text };
    if (note.about && (note.about.kind === 'node' || note.about.kind === 'object') && str(note.about.id)) w.note.about = { kind: note.about.kind, id: note.about.id };
  }
  var sd = typeof a.setDown === 'string' ? [a.setDown] : Array.isArray(a.setDown) ? a.setDown.filter(str) : [];
  if (sd.length) w.setDown = sd;
  return w;
};
Octopus.prototype.applyNotes = function (trip, w) {
  var self = this, now = this.now().toISOString();
  (w.setDown || []).forEach(function (id) { self.S.notes.forEach(function (n) { if (n.id === id && n.status === 'active') { n.status = 'set_down'; n.setDownAt = now; } }); });
  if (w.note) {
    var n = { id: rid('cn'), text: w.note.text, by: 'model', session: trip.id, at: now, status: 'active' };
    if (w.note.about) n.about = w.note.about;
    if (this.model) n.model = this.model;
    this.S.notes.push(n);
  }
};

Octopus.prototype.close = function (trip, extra) {
  var w = trip.events.filter(function (e) { return e.type === 'wrap_up'; })[0];
  if (w) this.applyNotes(trip, w);
  var file = trip.date + '-' + trip.seq + '.json';
  fs.mkdirSync(this.outDir, { recursive: true });
  fs.writeFileSync(path.join(this.outDir, file), JSON.stringify(trip.events, null, 1));
  var rec = { id: trip.id, date: trip.date, seq: trip.seq, kind: trip.kind, file: file, stops: trip.stops.length, posterHung: !!trip.posterHung, posterTitle: trip.posterTitle || null };
  this.S.trips.push(rec);
  this.S.running = null;
  this.dropPending();
  var out = Object.assign({ ok: true, saved: 'out/' + file }, extra || {});
  this.S.chat = trip.kind === 'empty' ? null : { tripId: trip.id, asked: 0 };   /* 빈 차례엔 대화 없음 */
  var sit = trip.kind === 'empty' ? null : this.chatSituation(rec);
  this.save();
  return withDecision(out, sit);
};

Octopus.prototype.stayHome = function (a) {
  a = a || {};
  if (this.S.running) return { error: '이미 나가 있어 (' + this.S.running.id + '). ppolppol_finish 로 먼저 끝내도 돼.' };
  this.dropPending();
  var dk = this.dateKey(), seq = this.S.trips.filter(function (t) { return t.date === dk; }).length + 1;
  var trip = { id: rid('trip'), date: dk, seq: seq, kind: 'home', events: [], stops: [] };
  var ev = { type: 'stay_home', t: 0 };
  if (str(a.activity)) ev.activity = a.activity;
  if (str(a.line)) ev.line = a.line;
  if (str(a.detail)) ev.detail = a.detail;
  trip.events.push(ev);
  var w = this.wrapUp(a, 2000);
  if (Object.keys(w).length > 2) trip.events.push(w);   /* 마무리에 쓴 게 없으면 마무리 이벤트도 안 낸다 */
  var out = this.close(trip, {});
  out.tripId = trip.id;
  return out;
};

Octopus.prototype.emptyTurn = function () {
  if (this.S.running) return { error: '이미 나가 있어 (' + this.S.running.id + '). ppolppol_finish 로 먼저 끝내도 돼.' };
  this.dropPending();
  var dk = this.dateKey(), seq = this.S.trips.filter(function (t) { return t.date === dk; }).length + 1;
  var trip = { id: rid('trip'), date: dk, seq: seq, kind: 'empty', events: [{ type: 'empty_turn', t: 0 }], stops: [] };
  var out = this.close(trip, {});
  out.tripId = trip.id;
  return out;
};

/* 결정 지점에 답하기. action 만 필수, 이유는 묻지 않는다 */
Octopus.prototype.answer = function (a) {
  a = a || {};
  var p = this.S.pending;
  if (!p || p.id !== a.id) return { error: '지금 걸려 있는 물음이 없거나 id 가 달라. 답하지 않아도 괜찮아.' };
  if (p.menu.indexOf(a.action) < 0) return { error: 'action 은 ' + p.menu.join(' · ') + ' 중 하나.' };
  var o = { by: 'model', action: a.action, text: str(a.line) || null };
  if (EXPRS.indexOf(a.expr) >= 0) o.expr = a.expr;
  if (p.point === 'table' && str(a.note)) o.note = a.note;
  this.S.pending = null;
  this.talkRecord(p, o);
  var next = null;
  if (p.point === 'chat' && a.action !== 'stop') {
    var trip = this.S.trips.filter(function (t) { return t.id === p.tripId; })[0];
    if (trip) next = this.chatSituation(trip);
  } else if (p.point === 'chat') this.S.chat = null;   /* 그만 → 대화는 조용히 끝. 다시 묻지 않는다 */
  if (!next) next = this.tableSituation();
  this.save();
  return withDecision({ ok: true }, next);
};

module.exports = { parseBook: parseBook, loadBooks: loadBooks, BOOK_HEAD: BOOK_HEAD, BOOK_MAX: BOOK_MAX, Octopus: Octopus, FIXED_SENTENCE: FIXED_SENTENCE, NOTES_HEAD: NOTES_HEAD, wikiFetch: wikiFetch, MENU: MENU };
