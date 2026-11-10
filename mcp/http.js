/* mcp/http.js — 원격 뽈뽈 방 (Streamable HTTP, 무상태 JSON 응답). claude.ai 웹 · 모바일 · Desktop 의 커스텀 커넥터가 여기로 온다.
 *
 *   POST {base}/mcp/<열쇠>   MCP 요청 하나 (initialize · tools/list · tools/call …)
 *
 * 인증은 없다 (authless). 방 열쇠 (192비트 무작위, 서버가 만듦) 를 아는 사람만 그 방에 들어온다 — '비밀 링크' 다.
 * 열쇠가 새어도 닿는 것은 이 게임의 방 (산책 기록 · 메모) 뿐이다: 사람 정보 · 다른 서비스 열쇠는 이 서버에 없다.
 *
 * 안전장치 (MCP_PLAYTEST '원격 · 안전장치' 절):
 *   - 열쇠 형식 검사 · 없는 방은 404 (방은 만들 때만 생긴다 — 아무 열쇠로 저장소를 채울 수 없다)
 *   - POST 만 · 본문 64KB · 도구 입력 글자 수 상한 (core.checkArgs) · 방마다 시간당 호출 상한
 *   - Host · Origin 확인 (DNS 리바인딩 · 남의 웹페이지가 브라우저로 부르는 것 막기)
 *   - 바깥으로 나가는 요청은 {ko,en,ja}.wikipedia.org API 뿐 — 방의 언어와 먼 바다 문의 언어 (주소를 입력으로 받지 않는다 — SSRF 없음)
 *   - 로그에 열쇠 · 글 내용을 남기지 않는다. 오류 응답에 내부 사정을 싣지 않는다
 */
'use strict';
var path = require('path');
var { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
var core = require('./core.js');
var buildServer = require('./tools.js');
var ST = require('./store.js');
var I18N = require('./i18n.js');

var BODY_MAX = 64 * 1024;
var CALLS_PER_HOUR = 300;          /* 방 하나가 한 시간에 부를 수 있는 도구 수 (산책 한 번 ≈ 6~12) */
var OUT_MAX = 400;                 /* 방 하나에 남는 산책 기록 파일 수 상한 (넘으면 새 산책은 기록 없이 거절) */
var ORIGINS_OK = /^https:\/\/(claude\.ai|[a-z0-9-]+\.claude\.ai|claude\.com|[a-z0-9-]+\.claude\.com)$/;

function sendJson(res, status, obj) {
  if (res.headersSent) return;
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}
function rpcError(res, status, msg) { sendJson(res, status, { jsonrpc: '2.0', error: { code: -32000, message: msg }, id: null }); }

async function readBody(req) {
  if (req.body !== undefined) {   /* Vercel 은 미리 읽어 둔다 */
    var b = req.body; if (Buffer.isBuffer(b)) b = b.toString('utf8');
    if (typeof b === 'string') { if (b.length > BODY_MAX) throw Object.assign(new Error('big'), { code: 413 }); return b ? JSON.parse(b) : undefined; }
    if (JSON.stringify(b || null).length > BODY_MAX) throw Object.assign(new Error('big'), { code: 413 });
    return b;
  }
  var chunks = [], n = 0;
  for await (var c of req) { n += c.length; if (n > BODY_MAX) throw Object.assign(new Error('big'), { code: 413 }); chunks.push(c); }
  var t = Buffer.concat(chunks).toString('utf8');
  return t ? JSON.parse(t) : undefined;
}

/* Host · Origin: 브라우저에서 온 요청 (Origin 있음) 은 claude.ai 쪽만. 서버끼리 부르는 요청엔 Origin 이 없다 */
function hostOriginOk(req, opts) {
  var host = String(req.headers.host || '').toLowerCase().replace(/:\d+$/, '');
  if (opts.allowedHosts && opts.allowedHosts.length && !opts.allowedHosts.some(function (h) { return h instanceof RegExp ? h.test(host) : h === host; })) return false;
  var origin = req.headers.origin;
  if (origin && !ORIGINS_OK.test(String(origin)) && !(opts.allowedOrigins || []).some(function (o) { return o === origin; })) return false;
  return true;
}

/* 방마다 시간당 호출 수 (meta.hour · meta.calls). 넘으면 그 시간은 쉰다 */
function overLimit(meta, now) {
  var hour = now.toISOString().slice(0, 13);
  if (meta.hour !== hour) { meta.hour = hour; meta.calls = 0; }
  meta.calls = (meta.calls | 0) + 1;
  return meta.calls > CALLS_PER_HOUR;
}

/* MCP 요청 하나. opts: { store, key, booksDir?, allowedHosts?, allowedOrigins?, now?, queryWiki?, fetchWiki? } */
async function handleMcp(req, res, opts) {
  var store = opts.store, key = opts.key, H = I18N.T('ko').http;   /* 방을 알기 전의 오류는 ko. 방을 읽은 뒤엔 그 방의 언어 (meta.lang) */
  if (!ST.validKey(key)) return rpcError(res, 404, H.notFound);
  if (!hostOriginOk(req, opts)) return rpcError(res, 403, H.origin);
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return rpcError(res, 405, H.postOnly); }   /* 무상태: GET (SSE) · DELETE 없음 */
  var body;
  try { body = await readBody(req); } catch (e) { return rpcError(res, e && e.code === 413 ? 413 : 400, e && e.code === 413 ? H.tooBig : H.badJson); }

  var meta;
  try { meta = await ST.readMeta(store, key); } catch (e) { return rpcError(res, 502, H.storage); }
  if (!meta) return rpcError(res, 404, H.notFound);
  H = I18N.T(meta.lang).http;

  var isCall = body && !Array.isArray(body) && body.method === 'tools/call';
  var now = opts.now ? opts.now() : new Date();
  if (isCall && overLimit(meta, now)) return rpcError(res, 429, H.tooMany);

  var state = null;
  try { state = isCall ? await ST.readState(store, key) : null; } catch (e) { return rpcError(res, 502, H.storage); }
  var oct = new core.Octopus({
    remote: { initialState: state }, booksDir: opts.booksDir, cardsDir: opts.cardsDir, name: meta.name || null, model: null, lang: meta.lang || null, langPinned: !!meta.pin,
    now: opts.now, queryWiki: opts.queryWiki, fetchWiki: opts.fetchWiki
  });
  var server = buildServer(oct, {
    after: async function (toolName, out) {
      var box = oct.remote.outbox, names = Object.keys(box);
      if (names.some(function (n) { return n !== 'talk.json'; })) {
        var existing = await store.list(ST.roomPath(key, 'out/'));
        if (existing.length >= OUT_MAX) throw new Error('room full');
      }
      for (var i = 0; i < names.length; i++) await store.write(ST.roomPath(key, 'out/' + names[i]), box[names[i]]);
      if (oct.remote.dirty) await store.write(ST.roomPath(key, 'state.json'), JSON.stringify(oct.S));
      if (!meta.pin && oct.S.lang && oct.S.lang !== meta.lang) meta.lang = oct.S.lang;   /* 모델이 알려 준 대화의 언어를 방에 비춘다 — 다음 initialize 의 안내문·도구가 그 언어 (사람이 정한 방은 그대로) */
      await store.write(ST.roomPath(key, 'meta.json'), JSON.stringify(meta));
      oct.remote.outbox = {}; oct.remote.dirty = false;
    },
    readOut: function (name) { return store.read(ST.roomPath(key, 'out/' + name)); },   /* 엽서 (MCP App) 가 산책 기록을 읽는다 */
    appOrigin: opts.appOrigin || null,
    log: function (toolName, e) { console.error('[ppolppol] ' + toolName + ' 실패: ' + (e && e.name) + ' ' + (e && e.message === 'room full' ? '(방 가득)' : '')); }
  });
  var transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on('close', function () { transport.close(); server.close(); });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
  } catch (e) {
    console.error('[ppolppol] 요청 실패: ' + (e && e.name));
    rpcError(res, 500, H.server);
  }
}

module.exports = { handleMcp: handleMcp, hostOriginOk: hostOriginOk, BODY_MAX: BODY_MAX, CALLS_PER_HOUR: CALLS_PER_HOUR, OUT_MAX: OUT_MAX };
