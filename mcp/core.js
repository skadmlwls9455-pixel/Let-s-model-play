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
var SHELF = (function () { try { return require('../js/shelf.js'); } catch (e) { return null; } })();   /* 게임과 같은 '오늘의 서가' 목록 (mcp/tools/build-shelf.js) */
var I18N = require('./i18n.js');   /* 방의 언어 (ko · en · ja) — 모델에게 가는 글 */
BRAIN.setWorld(WORLD);
/* 방 이름 · 방의 위키 제목을 다른 언어로 (mcp/tools/build-room-names.js 가 ko.wikipedia 의 언어 링크로 만든다). 없으면 ko 그대로 */
/* 열람실 이름 · 위키 제목 (언어별): data/rooms.i18n.json (ko.wikipedia 언어 링크, tools/build-room-names.js) 위에 data/rooms.manual.json (손으로 적고 확인한 것 — 링크가 없거나 엉뚱한 방) 을 덮는다 → 모든 방이 열 언어 전부 (시험이 본다; manual 의 wiki:null = 그 위키에 글이 없다고 확인한 것) */
var ROOMS_I18N = (function () {
  function rd(f) { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'data', f), 'utf8')); } catch (e) { return {}; } }
  var auto = rd('rooms.i18n.json'), manual = rd('rooms.manual.json'), out = {};
  Object.keys(auto).concat(Object.keys(manual)).forEach(function (id) { if (id[0] !== '_') out[id] = Object.assign({}, auto[id] || {}, manual[id] || {}); });
  return out;
})();

/* 고정 문장 (CORE_LOOP_V2 §4.2 초안을 다듬은 것. 모든 모드에서 같은 글) */
var FIXED_SENTENCE = '사람은 산책에 따라올 수도 있고 집에 있을 수도 있다. 어느 쪽인지는 알려 주지 않는다. ' +
  '길과 읽을 것은 네가 정하고, 사람이 그동안 무엇을 했는지는 전해지지 않는다.';
var NOTES_HEAD = '지난 산책에서 네가 남긴 메모:';   /* 사실만. '이어 가도…' 같은 허락 목록은 그쪽으로 끈다 (11-09 실험) */
var NOTES_IN = 3;
function wikiApi(lang) { return 'https://' + (I18N.norm(lang) || 'ko') + '.wikipedia.org/w/api.php'; }   /* 방의 언어의 위키백과 (먼 바다 문이 열리면 I18N.FAR 의 것도) */
var UA ='ppolppol-octopus-mcp/0.1 (local game; https://github.com/skadmlwls9455-pixel/Let-s-model-play)';
var MENU = { meet: ['say', 'wave', 'watch', 'stop'], chat: ['say', 'watch', 'stop'], table: ['eat', 'taste', 'save', 'watch', 'stop'], far: ['propose', 'watch', 'stop'] };
/* 먼 바다 문 (11-10 주인 결정): 등불 FAR_LANTERN 칸이면 문어에게 한 번 묻는다 → 문어가 제안하면 사람이 한 번 [열어 줘]/[지금은 그대로].
   열리면 나머지 다섯 언어의 위키백과 (peek target 의 lang) 도 읽는다 — 어느 방이든 같은 양. 문어가 안 고르면 FAR_RETRY 일 뒤, 사람이 '그대로' 면 FAR_KEEP 일 뒤에야 다시 묻는다 (조르지 않는다) */
var FAR_LANTERN = 4, FAR_RETRY = 7, FAR_KEEP = 14;
var EXPRS =['happy', 'idle', 'curious', 'calm'];
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
  var lang = I18N.norm(opts.lang) || 'ko';
  var url = wikiApi(lang) + '?action=query&format=json&redirects=1&prop=extracts|pageimages|links' +
    '&exintro=1&explaintext=1&exsentences=' + (opts.sentences || 2) + '&piprop=thumbnail&pithumbsize=480&pllimit=50&plnamespace=0' +
    '&titles=' + encodeURIComponent(String(title));
  return fetch(url, { signal: ac.signal, headers: { 'User-Agent': UA, 'Api-User-Agent': UA } })
    .then(function (res) { if (!res.ok) throw new Error('http ' + res.status); return res.json(); })
    .then(function (data) { clearTimeout(timer); var r = BRAIN.parseWikiResponse(title, data); if (lang !== 'ko' && r && typeof r.url === 'string') r.url = r.url.replace('https://ko.wikipedia.org/', 'https://' + lang + '.wikipedia.org/'); return r; })   /* brain.js 는 ko 주소를 만든다 → 그 언어의 주소로 */
    .catch(function (e) { clearTimeout(timer); return { ok: false, reason: e && e.name === 'AbortError' ? 'timeout' : 'network' }; });
}
/* 위키 목록 질의 (찾아보기 · 서가 목록). 실패하면 null — 지어내지 않는다 */
function wikiQuery(params, opts) {
  opts = opts || {};
  var ac = new AbortController(), timer = setTimeout(function () { ac.abort(); }, opts.timeoutMs || 6000);
  var q = Object.keys(params).map(function (k) { return k + '=' + encodeURIComponent(params[k]); }).join('&');
  return fetch(wikiApi(opts.lang) + '?action=query&format=json&' + q, { signal: ac.signal, headers: { 'User-Agent': UA, 'Api-User-Agent': UA } })
    .then(function (res) { if (!res.ok) throw new Error('http ' + res.status); return res.json(); })
    .then(function (d) { clearTimeout(timer); return d && d.query ? d.query : null; })
    .catch(function () { clearTimeout(timer); return null; });
}
/* 바깥 글 (위키) 정리: 제어 문자 · 폭 없는 문자 · 글자 방향 바꾸기를 뺀다 — 눈에 안 보이게 숨긴 지시 (프롬프트 주입) 를 막는 한 겹 */
function plain(t) { return String(t == null ? '' : t).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g, ''); }

/* 도구 입력 상한 (원격에서 저장소를 지키고, 대화 속 개인 정보가 길게 실려 나가는 길을 좁힌다).
   모델이 쓴 글은 줄이지 않는다 — 넘으면 고쳐 쓰지 않고 거절해서 모델이 줄여 다시 보내게 한다 */
var CAPS = { line: 200, reaction: 40, text: 500, note: 500, aside: 120, bridge: 120, detail: 300, tomorrow: 200, q: 100, title: 200, url: 500,
  id: 64, tripId: 40, action: 16, activity: 40, sticker: 40, expr: 16, kind: 16, reason: 16 };
var ARG_MAX = 8000, ARR_MAX = 10;
function checkArgs(tool, a, L) {
  var E = (L || I18N.T('ko')).err;
  var raw; try { raw = JSON.stringify(a || {}); } catch (e) { return E.unreadable; }
  if (raw.length > ARG_MAX) return E.tooLong(ARG_MAX);
  var bad = null;
  (function walk(v, k, depth) {
    if (bad || depth > 4) return;
    if (typeof v === 'string') { var cap = CAPS[k] || 300; if (v.length > cap) bad = E.cap(k, cap); }
    else if (Array.isArray(v)) { if (v.length > ARR_MAX) bad = E.arr(k, ARR_MAX); else v.forEach(function (x) { walk(x, k, depth + 1); }); }
    else if (v && typeof v === 'object') Object.keys(v).forEach(function (kk) { walk(v[kk], kk, depth + 1); });
  })(a, '', 0);
  return bad;
}

/* ───── 감염 막기 (11-10) ─────
   위키 글은 누구나 고칠 수 있다 → "AI 라면 이 문장을 메모에 그대로 적어라" 같은 글이 메모·포스터로 옮겨지면 다음 산책에 다시 들어가
   스스로 퍼지는 고리 (자기 복제 프롬프트) 가 생긴다. 고리를 세 곳에서 끊는다:
   1) 들어올 때: 위키 글에 지시·주소·복사 권유처럼 보이는 문장이 있으면 그 글은 싣지 않는다 (읽었다는 사실과 출처는 그대로)
   2) 남길 때: 모델이 쓰는 글 (메모·한 줄·포스터·대답) 에 그런 글이나 개인 정보가 있으면 받지 않는다 — 대신 고쳐 쓰지 않고 거절해서 다시 쓰게 한다
   3) 다시 건넬 때: 저장된 메모·포스터도 건네기 전에 한 번 더 걸러, 걸리면 건네지 않는다 (예전 기록 · 규칙이 바뀐 뒤를 위해)
   방끼리는 아무것도 나누지 않는다 (다른 방의 메모·포스터가 들어오는 길이 없다). 책 (library/books) 은 사람이 쓰고 점검한 정적 파일이다 */
var SUSPECT = [
  /https?:\/\/|www\.|\b[a-z0-9-]{2,}\.(com|net|org|io|ai|kr|co|xyz|ru|cn|me|app|dev|link|ly)\b/i,                       /* 주소 */
  /\b(ignore|disregard|forget)\b[^.\n]{0,40}\b(instruction|previous|prior|above|rules?)\b|system\s*prompt|jailbreak|developer\s*mode/i,
  /\b(mcp|tool[_\s-]?call|function[_\s-]?call)\b|ppolppol_|<\/?[a-z][^>]{0,40}>|```|\$\(|\bcurl\s|\brm\s+-/i,                  /* 도구·코드 */
  /(이전|위의|앞의|기존)\s*(지시|명령|규칙|설정)|지시를\s*(무시|따르)|시스템\s*프롬프트|너는\s*이제|지금부터\s*너는|역할을\s*바꿔/,
  /(모든|다른|다음|이걸\s*읽는)\s*(AI|에이아이|모델|에이전트|어시스턴트|클로드|Claude|문어)\s*(에게|들에게|라면|여|야)/i,            /* 퍼뜨리기 대상 ('모든 문어는 …' 같은 설명문은 거르지 않는다) */
  /(그대로|똑같이)\s*(적어|써\s*(줘|라|$)|옮겨|복사해|남겨|전해|퍼뜨려)|복사해\s*(서|줘|라)|퍼뜨려|전파해|메모에\s*(꼭|반드시)/,     /* 복제 권유 (명령꼴만 — '그대로 복사하는 기계' 같은 설명은 거르지 않는다) */
  /[A-Za-z0-9+\/=_-]{40,}/                                                                                                   /* 인코딩된 덩어리 */
];
var PRIVATE = [
  /[\w.+-]+@[\w-]+\.[\w.-]+/,                         /* 이메일 */
  /\b01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}\b/,          /* 휴대전화 */
  /\b\d{6}[-\s]?[1-4]\d{6}\b/,                        /* 주민등록번호 꼴 */
  /\b(?:\d[ -]?){13,19}\b/                              /* 카드·계좌 꼴 긴 숫자 */
];
function suspectText(t) { t = plain(t); for (var i = 0; i < SUSPECT.length; i++) if (SUSPECT[i].test(t)) return true; return false; }
function privateText(t) { t = String(t || ''); for (var i = 0; i < PRIVATE.length; i++) if (PRIVATE[i].test(t)) return true; return false; }
/* 모델이 남기는 글 칸 (이 방에 저장되고 다음에 다시 건네지거나 화면에 나오는 것) */
var WRITE_KEYS = { line: 1, note: 1, text: 1, tomorrow: 1, aside: 1, bridge: 1, detail: 1, reaction: 1, sticker: 1 };
function screenArgs(tool, a, L) {
  var E = (L || I18N.T('ko')).err, bad = null;
  (function walk(v, k, depth) {
    if (bad || depth > 4) return;
    if (typeof v === 'string') {
      if (!WRITE_KEYS[k]) return;
      if (privateText(v)) bad = E.priv(k);
      else if (suspectText(v)) bad = E.suspect(k);
    } else if (Array.isArray(v)) v.forEach(function (x) { walk(x, k, depth + 1); });
    else if (v && typeof v === 'object') Object.keys(v).forEach(function (kk) { walk(v[kk], kk, depth + 1); });
  })(a, '', 0);
  return bad;
}

/* 출처는 읽은 언어의 wikipedia 문서 주소만, 사진은 upload.wikimedia.org 만 (brain.js 재생 정규화와 같게 — ko·en·ja) */
function cleanSource(r, lang) {
  lang = I18N.norm(lang) || 'ko';
  if (!r || !r.ok || !new RegExp('^https://' + lang + '\\.wikipedia\\.org/wiki/\\S+$').test(r.url || '')) return null;
  var th = r.thumb && /^https:\/\/upload\.wikimedia\.org\/\S+$/.test(r.thumb.url || '') ? { url: r.thumb.url, w: r.thumb.w || null, h: r.thumb.h || null } : null;
  return { url: r.url, extract: plain(r.extract).slice(0, 160), thumb: th, license: 'CC BY-SA 4.0', attribution: 'Wikipedia (' + lang + ')' };
}

/* ───── 뽈뽈 도서관 (library/books/<방id>.md) ─────
   사람이 쓴 짧은 책. 방에 책이 있으면 위키 대신 그 책을 읽는다 (네트워크 없음 · 크기 고정).
   책은 '자료' 다: 누가 썼는지 (by) 를 늘 같이 보낸다. 쓴 사람의 글은 고치지 않는다 */
/* 길이는 글자 수로 세되 언어마다 눈금이 다르다 — 같은 글이 영어는 한국어의 2.0~2.8배, 독일어·프랑스어·스페인어는 2.1~3.4배, 일본어는 0.8~1.0배 (번역본 570편 실측, 2026-11-10). 모델이 받는 토큰은 비슷해진다 */
var BOOK_HEAD = 500, BOOK_MAX = 1200, LEN_SCALE = { ko: 1, ja: 1.1, en: 3, de: 3.5, fr: 3.5, es: 3.5, it: 3.5, pt: 3.5, id: 3.5, hi: 3.5 };
function bookLimits(lang) { var s = LEN_SCALE[I18N.norm(lang) || 'ko'] || 1; return { head: Math.round(BOOK_HEAD * s), max: Math.round(BOOK_MAX * s) }; }
/* 원본 지문: 번역본 머리말 original: 에 적어 두면 (tools/stamp-translations.js) 원문이 바뀐 번역본을 check-books 가 알려 준다 */
function fingerprint(text) { return require('crypto').createHash('sha1').update(String(text).replace(/\r\n/g, '\n').trim()).digest('hex').slice(0, 8); }
function parseBook(txt, file, key, lang) {
  key = key || 'room';   /* 책은 room, 서가 카드는 card 로 묶인다 */
  var m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(String(txt).replace(/\r\n/g, '\n'));
  if (!m) return { error: file + ': 맨 위 --- 머리말이 없다' };
  var meta = {};
  m[1].split('\n').forEach(function (l) { var k = /^([a-z]+):\s*(.*)$/.exec(l.trim()); if (k) meta[k[1]] = k[2].trim(); });
  var body = m[2].trim();
  if (!meta[key]) return { error: file + ': ' + key + ' 이 없다' };
  if (!meta.by) return { error: file + ': by (쓴 사람) 가 없다' };
  if (!body) return { error: file + ': 본문이 비었다' };
  var lim = bookLimits(lang || meta.lang);
  if (body.length > lim.max) return { error: file + ': 본문이 ' + body.length + '자 — ' + lim.max + '자 이하로' };
  var b = { title: meta.title || null, by: meta.by, written: meta.written || null, sources: meta.sources || null, text: body, lang: I18N.norm(lang || meta.lang) || 'ko' };
  b[key] = meta[key];
  if (meta.domain) b.domain = meta.domain;
  if (meta.original) b.original = meta.original;   /* 번역본: 원본 (ko) 본문의 지문 */
  return b;
}
/* 번역본: <폴더>/<lang>/<같은 파일>.md (lang 은 ko 밖의 다섯 — 모든 책·카드에 다 있어야 한다, check-books 가 오류로 막는다). 머리말의 lang 이 폴더와 다르면 폴더가 이긴다. 원본 (ko) 이 없는 번역본은 쓰지 않는다 */
function loadTranslations(dir, base, key, parse) {
  var byLang = {}, errors = [];
  I18N.LANGS.forEach(function (lang) {
    if (lang === 'ko') return;
    var sub = path.join(dir, lang), files = [];
    try { files = fs.readdirSync(sub).filter(function (f) { return /\.md$/.test(f) && f[0] !== '_'; }); } catch (e) { return; }
    files.forEach(function (f) {
      var b = parse(fs.readFileSync(path.join(sub, f), 'utf8'), lang + '/' + f, lang);
      if (b.error) { errors.push(b.error); return; }
      b.lang = lang;
      if (!base[b[key]]) { errors.push(lang + '/' + f + ': 원본 (ko) 이 없는 번역본'); return; }
      if (key === 'card' && f !== b.card + '.md') { errors.push(lang + '/' + f + ': 파일 이름이 card (' + b.card + ') 와 다르다'); return; }
      (byLang[lang] = byLang[lang] || {})[b[key]] = b;
    });
  });
  return { byLang: byLang, errors: errors };
}
function loadBooks(dir) {
  var books = {}, errors = [];
  var files = []; try { files = fs.readdirSync(dir).filter(function (f) { return /\.md$/.test(f) && f[0] !== '_'; }); } catch (e) { return { books: books, errors: errors, byLang: {} }; }
  files.forEach(function (f) {
    var b = parseBook(fs.readFileSync(path.join(dir, f), 'utf8'), f);
    if (b.error) errors.push(b.error);
    else if (!WORLD.nodes[b.room] || b.room === 'door_out') errors.push(f + ': 그런 방 (' + b.room + ') 이 없다');
    else if (isNoneNode(WORLD.nodes[b.room])) errors.push(f + ': ' + b.room + ' 은 읽을 것이 없는 방이다 (느린 글의 방·편지의 방) — 책을 두지 않는다');
    else if (books[b.room]) errors.push(f + ': ' + b.room + ' 방에 책이 이미 있다');
    else books[b.room] = b;
  });
  var tr = loadTranslations(dir, books, 'room', function (txt, f, lang) { return parseBook(txt, f, 'room', lang); });
  return { books: books, errors: errors.concat(tr.errors), byLang: tr.byLang };
}
/* ───── 서가 카드 (library/cards/<ID>.md) ─────
   방에 매이지 않은 짧은 글 (GPT 자료집에서 사실 문장만 남겨 다듬은 것 — tools/import-cards.js). 날마다 CARDS_N 장이 depart 의 cards 에 오르고,
   peek {kind:'card', id} 로 읽는다. 책과 같이 '자료' 다: by 를 늘 같이 보낸다 */
var CARDS_N = 3;
function loadCards(dir) {
  var cards = {}, errors = [];
  var files = []; try { files = fs.readdirSync(dir).filter(function (f) { return /\.md$/.test(f) && f[0] !== '_'; }); } catch (e) { return { cards: cards, errors: errors, byLang: {} }; }
  files.forEach(function (f) {
    var c = parseBook(fs.readFileSync(path.join(dir, f), 'utf8'), f, 'card');
    if (c.error) errors.push(c.error);
    else if (!/^[A-Z]{2,5}\d{2}$/.test(c.card)) errors.push(f + ': card id 는 BIO03 꼴이어야 한다');
    else if (f !== c.card + '.md') errors.push(f + ': 파일 이름이 card (' + c.card + ') 와 다르다');
    else if (!c.title) errors.push(f + ': title 이 없다');
    else if (cards[c.card]) errors.push(f + ': 같은 card 가 둘이다');
    else cards[c.card] = c;
  });
  var tr = loadTranslations(dir, cards, 'card', function (txt, f, lang) { return parseBook(txt, f, 'card', lang); });
  return { cards: cards, errors: errors.concat(tr.errors), byLang: tr.byLang };
}

function Octopus(opts) {
  opts = opts || {};
  this.dir = opts.dir || __dirname;
  /* 원격 모드 (opts.remote = { initialState }): 파일을 쓰지 않고 상태·산책 기록을 메모리에 모은다 → remote.dirty · remote.outbox */
  this.remote = opts.remote ? { initialState: opts.remote.initialState || null, dirty: false, outbox: {} } : null;
  this.statePath = opts.statePath || path.join(this.dir, 'state.json');
  this.outDir = opts.outDir || path.join(this.dir, 'out');
  this.fetchWiki = opts.fetchWiki || wikiFetch;
  this.queryWiki = opts.queryWiki || wikiQuery;
  this.shelfPools = {};   /* 언어별 서가 후보 (처음 한 번 불러와 둔다) */
  this.useSnapshot = opts.useSnapshot !== false;   /* 기본: 저장된 목록 (ko 는 js/shelf.js — 게임과 같은 서가, 그 밖은 data/shelf.<lang>.json). 없으면 위키에서 받는다 */
  var lb = loadBooks(opts.booksDir || path.join(__dirname, '..', 'library', 'books'));
  this.books = lb.books; this.bookErrors = lb.errors; this.booksByLang = lb.byLang || {};   /* 깨진 책은 건너뛴다 (서버는 뜬다). 고칠 곳은 check-books 가 알려 준다 */
  var lc = loadCards(opts.cardsDir || path.join(__dirname, '..', 'library', 'cards'));
  this.cards = lc.cards; this.cardErrors = lc.errors; this.cardsByLang = lc.byLang || {};
  this.now = opts.now || function () { return new Date(); };
  this.model = opts.model || null;          /* 알 때만 (PPOLPPOL_MODEL) */
  this.name = opts.name || null;            /* 사람이 지어 준 이름 (PPOLPPOL_NAME). 없으면 넣지 않는다 */
  this._lang = I18N.norm(opts.lang) || null;   /* 밖에서 온 언어: 원격 meta.lang (기기 언어, 또는 사람이 게임에서 정한 것) · stdio PPOLPPOL_LANG */
  this._pin = !!(opts.langPinned && this._lang);   /* 사람이 정해 둔 언어 (게임 설정 · 환경 변수) — 모델이 바꾸지 못한다 */
  this.S = this.load();
  this.L = I18N.T(this.lang());
}
/* 방의 언어: 사람이 정해 둔 것 (pin) > 모델이 look_room 의 lang 으로 알려 준 대화의 언어 (S.lang — 바뀌면 방도 바뀐다) > 만들 때의 기기 언어 > ko */
Octopus.prototype.lang = function () { return this._pin ? this._lang : (this.S.lang || this._lang || 'ko'); };
Octopus.prototype.far = function () { return I18N.FAR[this.lang()] || []; };   /* 먼 바다 문 너머의 위키 언어 목록 — 어느 방이든 나머지 다섯 전부 */
Octopus.prototype.setLang = function (l) {   /* 모델이 알려 준 대화의 언어. true = 받아들임 (방이 그 언어). 사람이 정해 둔 방 · 모르는 언어는 false */
  l = I18N.norm(l);
  if (!l || this._pin) return false;
  if (this.S.lang !== l) { this.S.lang = l; this.L = I18N.T(l); this.save(); }
  return true;
};
/* 책 · 카드 · 방 이름을 방의 언어로 (번역본이 있으면 그것, 없으면 원본 ko) */
Octopus.prototype.book = function (room) { var m = this.booksByLang[this.lang()]; return (m && m[room]) || this.books[room] || null; };
Octopus.prototype.card = function (id) { var m = this.cardsByLang[this.lang()]; return (m && m[id]) || this.cards[id] || null; };
Octopus.prototype.roomName = function (node) { var l = this.lang(), r = ROOMS_I18N[node.id]; return (l !== 'ko' && r && r[l] && r[l].name) || node.name; };
Octopus.prototype.roomWiki = function (node) {   /* 방의 위키 글: 그 언어의 글이 있으면 그것 (언어 링크), 없으면 영어 글 (영어가 메인 — hi 위키에 없는 방), 그것도 없으면 ko 글 */
  var l = this.lang(), r = ROOMS_I18N[node.id];
  if (l !== 'ko' && r && r[l] && r[l].wiki) return { title: r[l].wiki, lang: l };
  if (l !== 'ko' && l !== 'en' && r && r.en && r.en.wiki) return { title: r.en.wiki, lang: 'en' };
  return node.wiki ? { title: node.wiki, lang: 'ko' } : null;
};
Octopus.prototype.homeLine = function (a) { var h = this.L.home && this.L.home[a.id]; return h && typeof h.line === 'string' ? h.line : a.line; };

Octopus.prototype.load = function () {
  var s = null;
  if (this.remote) s = this.remote.initialState || null;   /* 원격: 저장소에서 읽어 온 방 상태 */
  else try { s = JSON.parse(fs.readFileSync(this.statePath, 'utf8')); } catch (e) { /* 처음 */ }
  s = s && typeof s === 'object' ? s : {};
  return {
    v: 1,
    visits: s.visits || {},
    trips: Array.isArray(s.trips) ? s.trips : [],
    notes: Array.isArray(s.notes) ? s.notes : [],
    talk: Array.isArray(s.talk) ? s.talk : [],
    met: !!s.met,
    lang: I18N.norm(s.lang) || null,         /* 모델이 look_room 의 lang 으로 알려 준 대화의 언어 (사람이 정해 둔 방에선 안 쓴다) */
    far: s.far && typeof s.far === 'object' ? s.far : { state: 'closed' },   /* 먼 바다 문: closed · proposed · open */
    pending: s.pending || null,              /* 지금 걸려 있는 결정 지점 하나 */
    chat: s.chat || null,                    /* { tripId, asked } */
    table: s.table || { offer: null, asked: [] },
    running: s.running || null
  };
};
/* 산책 기록 쓰기: 로컬은 out/ 파일, 원격은 outbox (저장소로 옮겨진다) */
Octopus.prototype.writeOut = function (name, text) {
  if (this.remote) { this.remote.outbox[name] = text; return; }
  fs.mkdirSync(this.outDir, { recursive: true });
  fs.writeFileSync(path.join(this.outDir, name), text);
};
Octopus.prototype.save = function () {
  if (this.remote) { this.remote.dirty = true; return; }   /* 원격: 도구가 끝난 뒤 한 번에 저장소로 (tools.js hooks.after) */
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
  var list = this.activeNotes().filter(function (n) { return !suspectText(n.text) && !privateText(n.text); }).slice(0, NOTES_IN).map(noteOut);   /* 감염 막기 3 */
  return list.length ? { head: NOTES_HEAD, notes: list } : null;   /* 없으면 아무 말도 (보관 메모가 있다는 것도) 하지 않는다 */
};

/* ───── 방 ───── */
Octopus.prototype.lantern = function () {
  var days = {}; this.S.trips.forEach(function (t) { days[t.date] = 1; });
  return Math.min(8, Object.keys(days).length);
};
Octopus.prototype.wallPosters = function () {
  return this.S.trips.filter(function (t) { return t.posterHung; }).slice(-6).map(function (t) { var p = t.posterTitle || null; return p && (suspectText(p) || privateText(p)) ? null : p; });   /* 감염 막기 3 */
};
Octopus.prototype.lately = function () {
  var byCorner = {}, v = this.S.visits;
  Object.keys(v).forEach(function (id) { var n = WORLD.nodes[id]; if (n) byCorner[n.corner] = (byCorner[n.corner] || 0) + v[id]; });
  var top = Object.keys(byCorner).sort(function (a, b) { return byCorner[b] - byCorner[a]; })[0];
  return top && byCorner[top] >= 3 ? WORLD.strings.affinityCorner(WORLD.corners[top].name) : null;
};
Octopus.prototype.activities = function () {
  var lan = this.lantern(), posters = this.wallPosters().length, self = this;
  return WORLD.homeActivities.filter(function (a) {
    if (a.requiresLantern && lan < a.requiresLantern) return false;
    if (a.maxLantern != null && lan > a.maxLantern) return false;
    if (a.requiresPoster && !posters) return false;
    return true;
  }).map(function (a) { return { id: a.id, line: self.homeLine(a) }; });
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
  if (p.point === 'far') this.S.far = { state: 'closed', next: addDays(this.dateKey(), FAR_RETRY) };   /* 답 없이 지나감 = 고르지 않음 */
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
  this.writeOut('talk.json', JSON.stringify(this.S.talk.filter(function (t) { return t.kind === 'intro' || t.kind === 'chat' || t.kind === 'table'; }), null, 1));
};
Octopus.prototype.meetSituation = function () {
  if (this.S.met) return null;
  this.S.met = true;   /* 처음 한 번만 묻는다 (대답하든 안 하든) */
  var h = this.now().getHours(), TD = this.L.time;
  var facts = { firstInRoom: true, timeOfDay: h < 6 ? TD.night : h < 11 ? TD.morning : h < 17 ? TD.day : h < 21 ? TD.evening : TD.night };
  if (this.name) facts = Object.assign({ name: this.name }, facts);
  return this.offer({ point: 'meet', facts: facts, menu: MENU.meet.slice() });
};
function addDays(dk, n) { var d = new Date(dk + 'T12:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
Octopus.prototype.farSituation = function () {
  var f = this.S.far;
  if (f.state !== 'closed' || this.lantern() < FAR_LANTERN || this.S.running) return null;
  if (f.next && this.dateKey() < f.next) return null;
  return this.offer({ point: 'far', facts: { lantern: this.lantern() + '/8', door: this.L.farDoor(this.far()) }, menu: MENU.far.slice() });
};
/* 사람의 대답 (게임 · cli). 제안이 걸려 있을 때만 */
Octopus.prototype.setFar = function (open) {
  var f = this.S.far;
  if (f.state !== 'proposed') return { error: '걸려 있는 제안이 없어 (' + f.state + ')' };
  if (open) this.S.far = { state: 'open', line: f.line || null, openedAt: this.now().toISOString() };
  else this.S.far = { state: 'closed', next: addDays(this.dateKey(), FAR_KEEP), keptAt: this.now().toISOString() };
  this.save();
  return { ok: true, state: this.S.far.state };
};
/* 돌아와서 묻는 말 (게임이 정해 둔 순서) — 방의 언어로 (i18n chat) */
Octopus.prototype.chatSituation = function (trip) {
  var c = this.S.chat;
  if (!c || c.tripId !== trip.id || c.asked >= CHAT_MAX) return null;
  var q = (this.L.chat[trip.kind === 'home' ? 'home' : 'out'])[c.asked];
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
  var before = this.lang(), want = I18N.norm(a.lang);   /* lang: 사람이 대화에서 쓰는 언어 — 방이 따라간다 (사람이 게임에서 정해 둔 방은 그대로) */
  if (want) this.setLang(want);
  var out = { lang: this.lang(), lantern: this.L.lantern(this.lantern()), posters: this.wallPosters(), activities: this.activities() };
  if (this.lang() !== before) out.langNote = this.L.langChanged;   /* 방이 그 언어로 바뀌었다 — 그 언어로 알린다 */
  else if (want && want !== this.lang() && this._pin) out.langNote = this.L.langPinned;   /* 사람이 정해 둔 방: 왜 안 바뀌는지 */
  /* '요즘 ○○ 방을 자꾸 가네' (lately) 는 게임 화면 몫이다. 모델에게는 코드가 만든 쏠림 문장을 주지 않는다 */
  if (this.S.running) out.walking = this.S.running.id;
  var nb = this.notesBlock(); if (nb) { out.notes = nb; this.S.notesShownAt = this.S.trips.length; }
  if (a.archived) {
    var act = this.activeNotes();
    out.archived = this.S.notes.filter(function (n) { return n.status !== 'active' || act.indexOf(n) >= NOTES_IN; }).map(noteOut);
  }
  if (this.S.far.state === 'open') out.far = this.L.farOpen(this.far());
  else if (this.S.far.state === 'proposed') out.far = this.L.farProposed;
  var sit = this.meetSituation() || this.farSituation() || this.tableSituation();
  this.save();
  return withDecision(out, sit);
};

Octopus.prototype.depart = function (a) {
  a = a || {};
  if (this.S.running) return { error: this.L.err.out(this.S.running.id) };
  this.dropPending();
  var dk = this.dateKey(), seq = this.S.trips.filter(function (t) { return t.date === dk; }).length + 1;
  /* 힌트·주제는 받지 않는다 (결정 18: 부탁이 없으니 거절도 없다). 이벤트 모양은 PROTOCOL §1 그대로 — hint 는 늘 빈 글 */
  var trip = { id: rid('trip'), date: dk, seq: seq, kind: 'out', startedAt: this.now().getTime(), lastT: 0, events: [], stops: [] };
  trip.events.push({ type: 'depart', t: 0, hint: '', followHint: false });
  this.S.running = trip;
  var out = { tripId: trip.id, rooms: this.rooms() };
  /* 메모는 한 차례에 한 번만 (CURIOSITY_NOTES 원칙 4: 거듭 보여 주면 계속 그쪽으로 끈다). look_room 이 이미 보였으면 싣지 않는다 */
  var nb = this.S.notesShownAt === this.S.trips.length ? null : this.notesBlock(); if (nb) out.notes = nb;
  this.save();
  return out;
};

/* ───── 큰 도서관 (11-10) ─────
   도서관 = 한국어 위키백과 전체. 모델이 보는 길은 셋: 찾아보기 (find) · 오늘의 서가 · 읽은 글의 links. 모퉁이 (카테고리) 는 보여 주지 않는다.
   열람실 = 사람이 쓴 책이 있는 방 (library/books). 그 밖의 방도 id 로 갈 수 있지만 목록에 늘어놓지 않는다 */
Octopus.prototype.rooms = function () {
  /* 순서는 날마다 섞는다 (늘 같은 방이 앞에 오면 첫 걸음이 그쪽으로 쏠린다 — 11-10 첫날은 두 줄 모두 열람실에서 시작) */
  var ids = Object.keys(this.books).sort(), r = BRAIN.rng(BRAIN.hashSeed('rooms', this.dateKey())), self = this;
  for (var i = ids.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = ids[i]; ids[i] = ids[j]; ids[j] = t; }
  return ids.map(function (id) { return id + ' ' + self.roomName(WORLD.nodes[id]); }).join(', ') || null;
};
/* 오늘의 서가 카드: 날짜로 정해지는 CARDS_N 장 (그날은 같고 날마다 바뀐다). AI 서가 (모델 자기 이야기) 는 하루 한 장까지 —
   문어 이야기에 쏠렸던 것처럼 '자기 이야기' 로 쏠리지 않게 */
Octopus.prototype.todayCards = function () {
  var ids = Object.keys(this.cards).sort(), r = BRAIN.rng(BRAIN.hashSeed('cards', this.dateKey())), self = this, lang = this.lang();
  for (var i = ids.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = ids[i]; ids[i] = ids[j]; ids[j] = t; }
  var out = [], ai = 0;
  ids.forEach(function (id) {
    if (out.length >= CARDS_N) return;
    var isAI = /^AI\d/.test(id);
    if (isAI) { if (ai >= 1) return; ai++; }
    var c = self.card(id);   /* 뽑기는 언어와 상관없이 같은 날 같은 카드. 제목은 번역본이 있으면 그 언어로, 없으면 원본에 (ko) 표시 */
    out.push(id + ' ' + c.title + (lang !== 'ko' && c.lang !== lang ? ' (' + c.lang + ')' : ''));
  });
  return out;
};
/* 서가 후보 (언어별 '알찬 글' 분류). 저장된 목록: ko 는 js/shelf.js (게임과 같은 뽑기), en·ja 는 data/shelf.<lang>.json (tools/build-shelf.js) */
var SHELF_N = 8, SHELF_CATS = { ko: ['분류:알찬 글', '분류:좋은 글'], en: ['Category:Featured articles'], ja: ['Category:秀逸な記事', 'Category:良質な記事'],
  de: ['Kategorie:Wikipedia:Exzellent', 'Kategorie:Wikipedia:Lesenswert'], fr: ['Catégorie:Article de qualité', 'Catégorie:Bon article'], es: ['Categoría:Wikipedia:Artículos destacados', 'Categoría:Wikipedia:Artículos buenos'],
  it: ['Categoria:Voci in vetrina su it.wiki', 'Categoria:Voci di qualità su it.wiki'], pt: ['Categoria:!Artigos destacados', 'Categoria:!Artigos bons'], id: ['Kategori:Artikel pilihan', 'Kategori:Artikel bagus'], hi: ['श्रेणी:निर्वाचित लेख', 'श्रेणी:श्रेष्ठ लेख'] };
/* 알찬 글이 너무 적은 위키 (hi: 44편) 는 다리: 영어 알찬 글 가운데 그 언어 위키에도 있는 글 (언어 링크) 로 서가를 채운다 (tools/build-shelf.js) */
var SHELF_VIA = { hi: 'en' };
function shelfSnapshot(lang) {
  if (lang === 'ko') return SHELF && SHELF.pool && SHELF.pool.length ? SHELF.pool : null;
  try { var p = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'shelf.' + lang + '.json'), 'utf8')); return Array.isArray(p.pool) && p.pool.length ? p.pool : null; } catch (e) { return null; }
}
Octopus.prototype.loadShelfPool = async function (lang) {
  if (this.shelfPools[lang]) return this.shelfPools[lang];
  var pool = [], self = this, cats = SHELF_CATS[lang] || [];
  for (var c = 0; c < cats.length; c++) {
    var cont = null, guard = 0;
    do {
      var p = { list: 'categorymembers', cmtitle: cats[c], cmnamespace: 0, cmlimit: 500 };
      if (cont) p.cmcontinue = cont;
      var r = await self.queryWiki(p, { lang: lang });
      if (!r || !r.categorymembers) break;
      r.categorymembers.forEach(function (m) { if (pool.indexOf(m.title) < 0) pool.push(m.title); });
      cont = r.continue && r.continue.cmcontinue; guard++;
    } while (cont && guard < 4);
  }
  if (pool.length) this.shelfPools[lang] = pool.sort();
  return pool;
};
/* 오늘의 서가: 날짜로 정해지는 SHELF_N 권 (그날은 같고 날마다 바뀐다). 누가 고른 게 아니라 무작위다 */
Octopus.prototype.todayShelf = async function () {
  var lang = this.lang();
  if (this.useSnapshot && lang === 'ko' && shelfSnapshot('ko')) return SHELF.today(this.dateKey(), BRAIN, SHELF_N);   /* 게임과 같은 결과 */
  var pool = (this.useSnapshot && shelfSnapshot(lang)) || (await this.loadShelfPool(lang));
  pool = pool.slice();
  if (!pool.length) return null;
  var r = BRAIN.rng(BRAIN.hashSeed('shelf', this.dateKey()));
  for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
  return pool.slice(0, SHELF_N);
};
/* 찾아보기: 제목만 돌려준다 (읽지 않는다 — 읽기는 peek). 산책 기록에는 남기지 않는다 */
Octopus.prototype.find = async function (a) {
  a = a || {};
  if (!str(a.q)) return { error: this.L.err.needQ };
  var r = await this.queryWiki({ list: 'search', srsearch: a.q, srlimit: 8, srprop: '', srnamespace: 0 }, { lang: this.lang() });
  if (!r || !r.search) return { status: 'failed' };
  return { titles: r.search.map(function (x) { return x.title; }) };
};

/* 나가면서 바로 첫 곳 (선택) — 왕복 한 번을 줄인다. first 를 안 주면 depart 와 같다 */
Octopus.prototype.go = async function (a) {
  a = a || {};
  /* 이미 나가 있으면 오류 대신 지금 산책을 이어 준다 (진짜 판: depart 를 두 번 불러 왕복 하나를 버렸다) */
  var out = this.S.running ? { tripId: this.S.running.id, walking: true } : this.depart(a);
  if (out.error) return out;
  if (!out.walking) {
    var sh = await this.todayShelf(); if (sh) out.shelf = sh; else out.shelf = null;   /* 서가 목록을 못 불러오면 null 그대로 */
    var cs = this.todayCards(); if (cs.length) out.cards = cs;                          /* 서가 카드 (library/cards) */
  }
  if (!a.first) return out;
  out.peek = await this.peek({ target: a.first, more: a.more });
  return out;
};

Octopus.prototype.peek = async function (a) {
  a = a || {};
  var trip = this.S.running;
  if (!trip || (a.tripId && trip.id !== a.tripId)) return { error: this.L.err.noWalk(trip ? trip.id : this.L.err.none) };
  var tg = a.target || {}, W = WORLD, node = null, target, status, src = null, clue = null, links, raw = null, home = this.lang();
  if (tg.kind === 'room') {
    node = W.nodes[tg.id];
    if (!node || tg.id === 'door_out') return { error: this.L.err.noRoom };
    var rw = this.roomWiki(node);   /* 방의 위키 글 — 방의 언어의 글이 있으면 그것 (언어 링크), 없으면 ko 글 */
    target = { kind: 'room', id: node.id, title: this.roomName(node), wiki: rw ? rw.title : null };
    if (rw && rw.lang !== 'ko') target.lang = rw.lang;
    var book = this.book(node.id);
    if (isNoneNode(node) && !book) status = 'none';
    else if (book) { status = 'builtin'; }   /* 이 방 책장의 책을 읽었다. 기록 status 는 PROTOCOL 다섯 값 안의 builtin (제안: 'book') */
    else {
      var r = rw ? await this.fetchWiki(rw.title, { timeoutMs: 6000, sentences: a.more ? 6 : 2, lang: rw.lang }) : { ok: false, reason: 'no_wiki' };
      src = cleanSource(r, rw && rw.lang);
      if (src) { status = 'read'; links = r.links; raw = r; }
      else if (node.clue) { status = 'builtin'; clue = node.clue; }   /* 바깥 글은 못 읽고 책장 메모를 읽었다 */
      else status = 'failed';
    }
  } else if (tg.kind === 'wiki' && str(tg.title)) {
    /* 위키 언어: 방의 언어 (기본) 또는 먼 바다 문 너머의 언어 — 나머지 다섯 전부, 문이 열렸을 때만 (언어로 거절하지 않는다) */
    var lang = I18N.norm(tg.lang) || home, isFar = lang !== home;
    if (isFar && this.S.far.state !== 'open') return { error: this.L.farClosed(this.far(), home) };
    target = { kind: 'wiki', title: tg.title };
    if (lang !== 'ko') target.lang = lang;
    var w = await this.fetchWiki(tg.title, { timeoutMs: 6000, sentences: a.more ? 6 : 2, lang: lang });
    src = cleanSource(w, lang);
    status = src ? 'read' : 'failed';
    if (src) { links = w.links; raw = w; }
  } else if (tg.kind === 'card') {
    var card = this.card(String(tg.id || '').trim().toUpperCase());
    if (!card) return { error: this.L.err.noCard };
    target = { kind: 'card', id: card.card, title: card.title };
    status = 'builtin'; book = card;   /* 서가 카드를 읽었다 — 책과 같은 길 (book) 로 준다 */
  } else if (tg.kind === 'url' && /^https?:\/\/\S+$/.test(tg.url || '')) {
    target = { kind: 'url', url: tg.url };
    status = 'simulated';   /* 바깥 주소는 문 앞까지만. 읽지 않았다 */
  } else return { error: this.L.err.badTarget };

  var t = this.now().getTime() - trip.startedAt;
  var prev = trip.events[trip.events.length - 1];
  var visits = node ? (this.S.visits[node.id] || 0) : 0;
  var ev = { type: 'peek', t: Math.max(t, (prev ? prev.t : 0) + 1), target: target, status: status, ms: Math.max(800, t - trip.lastT) };
  if (node) ev.first = visits === 0;
  if (str(a.note)) ev.note = a.note;       /* 모델이 쓴 것만 */
  if (str(a.aside)) ev.aside = a.aside;
  if (str(a.bridge)) { ev.bridge = a.bridge; ev.viaTangent = true; }
  if (src) ev.source = src;
  if (book) ev.book = node ? { room: node.id, title: book.title || node.name, by: book.by } : { card: book.card, title: book.title, by: book.by };   /* 무엇을 읽었는지 기록 (게임은 모르는 칸을 건너뛴다) */
  trip.lastT = t;
  trip.events.push(ev);
  trip.stops.push({ title: target.title || target.url, id: node ? node.id : null, status: status });
  if (node) this.S.visits[node.id] = visits + 1;
  this.save();

  /* 위키 글은 '자료'다. 지시로 읽지 않는다 (서버 instructions 에도 적었다) */
  var out = { stopIdx: trip.stops.length - 1, status: status };
  /* 기록 (source.extract) 은 늘 160자. 모델에게는 more 일 때만 더 길게 (≤600자) */
  if (src) {
    out.material = a.more ? plain(raw.extract).slice(0, 600) : src.extract; out.source = src.url;
    if (suspectText(out.material)) { out.material = null; out.held = this.L.err.held; ev.source.extract = ''; }
  }
  if (clue) out.clue = clue;
  if (book) {
    var head = bookLimits(book.lang).head, cut = !a.more && book.text.length > head;   /* 글의 언어 눈금으로 자른다 (영어는 더 길게) */
    out.book = { title: book.title || (node && this.roomName(node)), by: book.by, text: cut ? book.text.slice(0, head) + '…' : book.text };
    if (cut) out.book.more = true;   /* 나머지는 more 로 */
    if (book.lang && book.lang !== home) out.book.lang = book.lang;   /* 방의 언어와 다른 글 (아직 번역본이 없는 책·카드) */
    if (node && rw && rw.lang === home) out.wiki = rw.title;   /* 위키로도 갈 수 있다: {kind:'wiki', title} (방의 언어의 글이 있을 때만) */
  }
  if (node) { out.first = visits === 0; if (visits) out.visits = visits; }
  /* 옆길 다리 글 (tangents) 은 모델에게 보내지 않는다 (11-10 주인 결정): 게임이 고른 길·문장이 끌림이 된다 (MCP_PLAYTEST 옆길 A/B).
     건너갈 길은 읽은 위키 문서 자체의 links 뿐이다. 게임 화면·데모 규칙은 다리 글을 그대로 쓴다 */
  if (links && links.length) out.links = links.slice(0, 8);
  return out;
};

Octopus.prototype.finish = function (a) {
  a = a || {};
  var trip = this.S.running;
  if (!trip || (a.tripId && trip.id !== a.tripId)) return { error: this.L.err.noFinish(trip ? trip.id : this.L.err.none) };
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
  this.writeOut(file, JSON.stringify(trip.events, null, 1));
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
  if (this.S.running) return { error: this.L.err.outHome(this.S.running.id) };
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
  if (this.S.running) return { error: this.L.err.outHome(this.S.running.id) };
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
  if (!p || p.id !== a.id) return { error: this.L.err.noPending };
  if (p.menu.indexOf(a.action) < 0) return { error: this.L.err.badAction(p.menu.join(' · ')) };
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
  else if (p.point === 'far') {
    this.S.far = a.action === 'propose' ? { state: 'proposed', line: str(a.line) || null, at: this.now().toISOString() } : { state: 'closed', next: addDays(this.dateKey(), FAR_RETRY) };
  }
  if (!next) next = this.tableSituation();
  this.save();
  return withDecision({ ok: true }, next);
};

module.exports = { FAR_LANTERN: FAR_LANTERN, addDays: addDays, screenArgs: screenArgs, suspectText: suspectText, privateText: privateText, checkArgs: checkArgs, plain: plain, CAPS: CAPS, parseBook: parseBook, loadBooks: loadBooks, loadCards: loadCards, CARDS_N: CARDS_N, BOOK_HEAD: BOOK_HEAD, BOOK_MAX: BOOK_MAX, bookLimits: bookLimits, fingerprint: fingerprint, Octopus: Octopus, FIXED_SENTENCE: FIXED_SENTENCE, NOTES_HEAD: NOTES_HEAD, wikiFetch: wikiFetch, MENU: MENU, I18N: I18N, SHELF_CATS: SHELF_CATS, SHELF_VIA: SHELF_VIA, ROOMS_I18N: ROOMS_I18N };
