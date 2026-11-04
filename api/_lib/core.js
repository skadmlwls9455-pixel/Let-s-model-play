/* api/_lib/core.js — 다락방 달리기 주간 랭킹 공통 부품 (CommonJS, Node 런타임).
 *   저장소 어댑터 { put(path, json), list(prefix) → [{pathname, uploadedAt}], head(path) → meta|null }
 *     - blobStore(): Vercel Blob (private, addRandomSuffix:false, allowOverwrite:false)
 *     - memoryStore(): 테스트용 (네트워크 없음)
 *   토큰(HMAC-SHA256) · 주 키(Asia/Seoul ISO 주) · 닉네임 정리 · 경로 코덱(사전순 = 순위).
 *   docs/MINIGAME.md "랭킹 서버" 참고. 비밀값은 절대 로그로 남기지 않는다.
 */
'use strict';
var crypto = require('crypto');
var RUNNER = require('../../js/runner.js');

var TOKEN_TTL_MS = 30 * 60 * 1000;
var MAX_INPUTS = 20000;
var SCORE_CAP = 10000000;
var ACTS = { jd: 1, ju: 1, dd: 1, du: 1 };
var FALLBACK_NICK = '익명 문어';
var AWARDS = { PAPER: 'paper_crown', CAPE: 'emperor_cape' };

/* ───────── 시계 · 저장소 주입 (테스트용) ───────── */
var clockFn = function () { return Date.now(); };
function now() { return clockFn(); }
function setClock(fn) { clockFn = typeof fn === 'function' ? fn : function () { return Date.now(); }; }

var storeOverride = null, blobSingleton = null;
function setStore(s) { storeOverride = s || null; }
function getStore() { return storeOverride || (blobSingleton || (blobSingleton = blobStore())); }

/* ───────── 비밀 키 ───────── */
var secretOverride = null;
function setSecret(s) { secretOverride = s == null ? null : String(s); }
function secret() {
  if (secretOverride) return secretOverride;
  if (process.env.RUNNER_SECRET) return process.env.RUNNER_SECRET;
  if (process.env.BLOB_READ_WRITE_TOKEN) return crypto.createHash('sha256').update('ppolppol-runner|' + process.env.BLOB_READ_WRITE_TOKEN).digest('hex');
  return null;   /* 둘 다 없으면 서명하지 않는다 (알려진 키로 서명하는 일 없게) */
}

/* ───────── base64url ───────── */
function b64u(buf) { return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function unb64u(s) {
  if (typeof s !== 'string' || !/^[A-Za-z0-9_-]*$/.test(s)) return null;
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

/* ───────── 토큰 ───────── */
function hmac(key, data) { return crypto.createHmac('sha256', key).update(data).digest(); }
function signToken(claims, key) {
  var body = b64u(JSON.stringify({ seed: claims.seed >>> 0, night: !!claims.night, iat: claims.iat, week: claims.week, v: claims.v || RUNNER.VERSION }));
  return body + '.' + b64u(hmac(key, body));
}
/* 서명이 맞으면 claims, 아니면 null (만료는 호출하는 쪽에서) */
function readToken(token, key) {
  if (typeof token !== 'string' || token.length > 512 || !key) return null;
  var parts = token.split('.');
  if (parts.length !== 2) return null;
  var sig = unb64u(parts[1]), want = hmac(key, parts[0]);
  if (!sig || sig.length !== want.length || !crypto.timingSafeEqual(sig, want)) return null;
  var c;
  try { c = JSON.parse(unb64u(parts[0]).toString('utf8')); } catch (e) { return null; }
  if (!c || typeof c !== 'object' || !Number.isInteger(c.seed) || c.seed < 0 || c.seed > 0xffffffff || typeof c.night !== 'boolean' ||
      !Number.isFinite(c.iat) || !isWeek(c.week) || typeof c.v !== 'string') return null;
  return c;
}
function runIdOf(token) { return crypto.createHash('sha256').update(String(token)).digest('hex').slice(0, 12); }

/* ───────── 주 키: Asia/Seoul (UTC+9, 서머타임 없음) ISO 주 ───────── */
function weekKey(ms) {
  var d = new Date((ms == null ? now() : ms) + 9 * 3600 * 1000);
  var day = d.getUTCDay() || 7;   /* 월=1 … 일=7 */
  var thu = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) + (4 - day) * 86400000;
  var y = new Date(thu).getUTCFullYear();
  var w = 1 + Math.floor((thu - Date.UTC(y, 0, 1)) / (7 * 86400000));
  return y + '-W' + String(w).padStart(2, '0');
}
function isWeek(s) { return typeof s === 'string' && /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/.test(s); }
/* 이벤트 주: 기본은 모든 주. RUNNER_EVENT_WEEKS="2026-W45,2026-W46" 처럼 좁힐 수 있다 */
function isEventWeek(week) {
  var e = (process.env.RUNNER_EVENT_WEEKS || 'all').trim();
  if (e === 'all' || e === '') return true;
  return e.split(',').map(function (x) { return x.trim(); }).indexOf(week) >= 0;
}

/* ───────── 닉네임 ───────── */
var BLOCK = [   /* 공백·_·- 를 지운 소문자에 대해 부분 일치 (≤ 30) */
  '씨발', '시발', 'ㅅㅂ', '병신', 'ㅂㅅ', '개새끼', '좆', '존나', '지랄', '미친놈', '미친년', '니미', '느금', '애미', '애비', '썅', '보지', '자지', '섹스',
  'fuck', 'shit', 'bitch', 'cunt', 'dick', 'pussy', 'nigg', 'fag', 'whore', 'porn'
];
var URL_RE = /(https?:|www\.|:\/\/|\.(com|net|org|kr|io|gg|me|ly|co|app|xyz)\b|discord|t\.me)/i;
/* 빈칸처럼 보이는 글자: 한글 채움 문자(ㅤ U+3164 는 ㄱ-ㆎ 범위 안이라 허용 목록을 통과한다) · 점자 빈칸 → 공백으로 */
var BLANK_LIKE = /[ᅟᅠㅤﾠ⠀]/g;
/* 보이지 않는 글자: 서식 문자(ZWSP·ZWJ·방향 표시·BOM·soft hyphen …) · 결합 자소 잇기 · 변형 선택자 → 지운다 */
var INVISIBLE = /[\p{Cf}͏︀-️\u{E0100}-\u{E01EF}]/gu;
function sanitizeNick(raw) {
  if (typeof raw !== 'string') return FALLBACK_NICK;
  var s = raw.normalize('NFC').replace(INVISIBLE, '').replace(BLANK_LIKE, ' ');   /* 빈칸 확인·금칙어 확인보다 먼저 */
  if (URL_RE.test(s)) return FALLBACK_NICK;
  s = s.replace(/\s+/g, ' ').replace(/[^가-힣ㄱ-ㆎA-Za-z0-9 _-]/g, '').replace(/ {2,}/g, ' ').trim();
  s = Array.from(s).slice(0, 12).join('').trim();
  if (!s) return FALLBACK_NICK;
  if (/\d{7,}/.test(s.replace(/[ _-]/g, ''))) return FALLBACK_NICK;   /* 전화번호 같은 긴 숫자 */
  var flat = s.toLowerCase().replace(/[ _-]/g, '');
  for (var i = 0; i < BLOCK.length; i++) if (flat.indexOf(BLOCK[i]) >= 0) return FALLBACK_NICK;
  return s;
}

/* ───────── 경로 코덱: 사전순 = 순위 ─────────
 *   runner/{week}/{(10_000_000 - score) 8자리}-{ticks 6자리}-{runId}~{base64url(nick)}.json
 *   같은 점수면 더 짧은 틱(빨리 도달)이 위. */
function encodePath(e) {
  var score = Math.max(0, Math.min(SCORE_CAP - 1, e.score | 0)), ticks = Math.max(0, Math.min(999999, e.ticks | 0));
  return 'runner/' + e.week + '/' + String(SCORE_CAP - score).padStart(8, '0') + '-' + String(ticks).padStart(6, '0') + '-' + e.runId + '~' + b64u(Buffer.from(e.nick, 'utf8')) + '.json';
}
var PATH_RE = /^runner\/(\d{4}-W\d{2})\/(\d{8})-(\d{6})-([0-9a-f]{12})~([A-Za-z0-9_-]*)\.json$/;
function decodePath(p) {
  var m = PATH_RE.exec(String(p || ''));
  if (!m) return null;
  var nb = unb64u(m[5]);
  return { week: m[1], score: SCORE_CAP - parseInt(m[2], 10), ticks: parseInt(m[3], 10), runId: m[4], nick: nb ? nb.toString('utf8') : FALLBACK_NICK };
}
function weekPrefix(week) { return 'runner/' + week + '/'; }
function idPath(week, runId) { return 'runner-ids/' + week + '/' + runId + '.json'; }
/* 그 주의 기록 전부 → 순위순 [{pathname, uploadedAt, score, ticks, runId, nick, rank}]
 *   같은 runId 는 한 줄만 (가장 앞 = 가장 높은 것). 다시 보낸 제출이 겹쳐 쓴 경우에도 한 판 = 한 줄. */
async function board(store, week) {
  var items = await store.list(weekPrefix(week));
  var out = [], seen = {};
  items.forEach(function (b) { var d = decodePath(b.pathname); if (d && d.week === week) { d.pathname = b.pathname; d.uploadedAt = b.uploadedAt; out.push(d); } });
  out.sort(function (a, b) { return a.pathname < b.pathname ? -1 : a.pathname > b.pathname ? 1 : 0; });
  out = out.filter(function (d) { if (seen[d.runId]) return false; seen[d.runId] = 1; return true; });
  out.forEach(function (d, i) { d.rank = i + 1; });
  return out;
}
/* 그 주가 닫혔나: 그 주에 받은 토큰이 모두 만료된 뒤(월 00:00 KST + 30분 + 여유 5초)부터. 그 전엔 늦게 온 판이 순위를 바꿀 수 있다 */
function weekClosed(week, ms) { return weekKey((ms == null ? now() : ms) - TOKEN_TTL_MS - 5000) > week; }

/* ───────── 저장소 ───────── */
function existsError(path) { var e = new Error('blob already exists'); e.code = 'EEXIST'; e.pathname = path; return e; }
function memoryStore() {
  var m = new Map();
  return {
    kind: 'memory', _map: m,
    put: async function (path, json) {
      if (m.has(path)) throw existsError(path);
      m.set(path, { pathname: path, uploadedAt: new Date(now()).toISOString(), body: JSON.stringify(json) });
      return { pathname: path };
    },
    list: async function (prefix) {
      var out = [];
      m.forEach(function (v) { if (v.pathname.indexOf(prefix) === 0) out.push({ pathname: v.pathname, uploadedAt: v.uploadedAt }); });
      return out;
    },
    head: async function (path) { var v = m.get(path); return v ? { pathname: v.pathname, uploadedAt: v.uploadedAt } : null; },
    read: function (path) { var v = m.get(path); return v ? JSON.parse(v.body) : null; }   /* 테스트 전용 */
  };
}
function blobStore() {
  function sdk() { return require('@vercel/blob'); }
  async function head(path) {
    try { var h = await sdk().head(path); return { pathname: h.pathname, uploadedAt: h.uploadedAt ? new Date(h.uploadedAt).toISOString() : null }; }
    catch (e) { if (e && (e.name === 'BlobNotFoundError' || e instanceof sdk().BlobNotFoundError)) return null; throw e; }
  }
  return {
    kind: 'blob',
    put: async function (path, json) {
      try {
        return await sdk().put(path, JSON.stringify(json), { access: 'private', addRandomSuffix: false, allowOverwrite: false, contentType: 'application/json' });
      } catch (e) {
        if (await head(path).catch(function () { return null; })) throw existsError(path);
        throw e;
      }
    },
    list: async function (prefix) {
      var out = [], cursor;
      for (var page = 0; page < 50; page++) {   /* 1000 × 50 = 한 주 5만 판까지 */
        var r = await sdk().list({ prefix: prefix, cursor: cursor, limit: 1000 });
        r.blobs.forEach(function (b) { out.push({ pathname: b.pathname, uploadedAt: b.uploadedAt ? new Date(b.uploadedAt).toISOString() : null }); });
        if (!r.hasMore || !r.cursor) break;
        cursor = r.cursor;
      }
      return out;
    },
    head: head
  };
}

/* ───────── HTTP 도우미 (Vercel Node 함수 · 테스트 목 둘 다) ───────── */
function send(res, status, obj, cache) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cache || 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(obj));
}
function query(req) {
  if (req.query && typeof req.query === 'object') return req.query;
  var q = {};
  try { new URL(req.url || '/', 'http://x').searchParams.forEach(function (v, k) { q[k] = v; }); } catch (e) { /* 빈 쿼리 */ }
  return q;
}
function one(v) { return Array.isArray(v) ? v[0] : v; }
async function readJson(req, limit) {
  limit = limit || 1024 * 1024;
  var b = req.body;
  if (b && typeof b === 'object' && !Buffer.isBuffer(b)) return b;
  var text;
  if (typeof b === 'string') text = b;
  else if (Buffer.isBuffer(b)) text = b.toString('utf8');
  else if (req && typeof req.on === 'function') {
    text = await new Promise(function (resolve, reject) {
      var chunks = [], n = 0;
      req.on('data', function (c) { n += c.length; if (n > limit) { reject(new Error('too_large')); return; } chunks.push(c); });
      req.on('end', function () { resolve(Buffer.concat(chunks).toString('utf8')); });
      req.on('error', reject);
    });
  }
  if (text == null || text.length > limit) return null;
  try { var o = JSON.parse(text); return o && typeof o === 'object' ? o : null; } catch (e) { return null; }
}

module.exports = {
  RUNNER: RUNNER, TOKEN_TTL_MS: TOKEN_TTL_MS, MAX_INPUTS: MAX_INPUTS, SCORE_CAP: SCORE_CAP, ACTS: ACTS, FALLBACK_NICK: FALLBACK_NICK, AWARDS: AWARDS, BLOCK: BLOCK,
  now: now, setClock: setClock, getStore: getStore, setStore: setStore, setSecret: setSecret, secret: secret,
  b64u: b64u, unb64u: unb64u, signToken: signToken, readToken: readToken, runIdOf: runIdOf,
  weekKey: weekKey, isWeek: isWeek, isEventWeek: isEventWeek, sanitizeNick: sanitizeNick,
  encodePath: encodePath, decodePath: decodePath, weekPrefix: weekPrefix, idPath: idPath, board: board, weekClosed: weekClosed,
  memoryStore: memoryStore, blobStore: blobStore, send: send, query: query, one: one, readJson: readJson
};
