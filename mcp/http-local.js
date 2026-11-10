#!/usr/bin/env node
/* mcp/http-local.js — 원격 뽈뽈 방을 내 컴퓨터에서 띄우기 (시험용). 배포판은 api/mcp · api/room (Vercel).
 *
 *   node mcp/http-local.js                       → http://127.0.0.1:8787
 *   curl -X POST http://127.0.0.1:8787/room      → { key, mcp: "http://…/mcp/<열쇠>" }
 *   cloudflared tunnel --url http://127.0.0.1:8787   → https://….trycloudflare.com  (claude.ai 커스텀 커넥터에 …/mcp/<열쇠>)
 *
 * 상태는 mcp/rooms/ (커밋하지 않음). 127.0.0.1 에만 묶는다 — 바깥에서는 터널로만 들어온다.
 * 환경 변수: PORT (기본 8787), PPOLPPOL_ROOMS (방 폴더), PPOLPPOL_PUBLIC (터널 주소, 방 만들기 응답에 쓴다)
 */
'use strict';
var http = require('http');
var path = require('path');
var ST = require('./store.js');
var H = require('./http.js');

var PORT = Number(process.env.PORT) || 8787;
var store = ST.fileStore(process.env.PPOLPPOL_ROOMS || __dirname)   /* 경로가 rooms/<열쇠>/… 로 시작한다 → mcp/rooms/ */;
var HOSTS = ['localhost', '127.0.0.1', /^[a-z0-9-]+\.trycloudflare\.com$/];

/* 방 만들기 상한 (주소마다 시간당) — 로컬 시험용이라 메모리로 */
var made = new Map();
function canCreate(ip) {
  var h = new Date().toISOString().slice(0, 13), k = ip + '|' + h, n = (made.get(k) || 0) + 1;
  made.set(k, n); if (made.size > 5000) made.clear();
  return n <= 10;
}

http.createServer(async function (req, res) {
  var url = new URL(req.url, 'http://x');
  if (!H.hostOriginOk(req, { allowedHosts: HOSTS })) { res.statusCode = 403; return res.end(); }
  var m = /^\/mcp\/([^/]+)\/?$/.exec(url.pathname);
  if (m) return H.handleMcp(req, res, { store: store, key: m[1], allowedHosts: HOSTS });
  if (url.pathname === '/room' && req.method === 'POST') {
    if (!canCreate(req.socket.remoteAddress || '?')) { res.statusCode = 429; return res.end(); }
    var key = await ST.createRoom(store);
    var base = process.env.PPOLPPOL_PUBLIC || ('http://127.0.0.1:' + PORT);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ key: key, mcp: base.replace(/\/$/, '') + '/mcp/' + key }));
  }
  res.statusCode = 404; res.end();
}).listen(PORT, '127.0.0.1', function () { process.stderr.write('[ppolppol] 원격 방 (시험) http://127.0.0.1:' + PORT + '\n'); });
