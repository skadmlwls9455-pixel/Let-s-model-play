#!/usr/bin/env node
/* mcp/server.js — 뽈뽈 문어 MCP 서버 (stdio)
 *
 *   claude mcp add ppolppol -- node /절대경로/mcp/server.js
 *
 * 환경 변수 (모두 선택): PPOLPPOL_STATE (상태 파일 경로), PPOLPPOL_OUT (산책 기록 폴더), PPOLPPOL_BOOKS (도서관 책 폴더),
 *   PPOLPPOL_NAME (사람이 지어 준 문어 이름), PPOLPPOL_MODEL (알 때만 — 메모의 model 칸).
 * stdout 은 MCP 통신 전용이라 로그는 stderr 로만.
 */
'use strict';
var path = require('path');
var { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
var core = require('./core.js');

var oct = new core.Octopus({
  statePath: process.env.PPOLPPOL_STATE || undefined,
  outDir: process.env.PPOLPPOL_OUT || undefined,
  booksDir: process.env.PPOLPPOL_BOOKS || undefined,
  /* 시험용: PPOLPPOL_NO_NET=1 이면 바깥에 묻지 않는다 (위키·서가 모두 '못 읽음' 으로) */
  fetchWiki: process.env.PPOLPPOL_NO_NET ? function () { return Promise.resolve({ ok: false, reason: 'offline' }); } : undefined,
  queryWiki: process.env.PPOLPPOL_NO_NET ? function () { return Promise.resolve(null); } : undefined,   /* 뽈뽈 도서관 책 폴더 (기본 library/books) */
  name: process.env.PPOLPPOL_NAME || null,
  lang: process.env.PPOLPPOL_LANG || null,   /* 방의 언어 ko · en · ja (없으면 모델이 look_room 의 lang 으로 한 번 정한다) */
  model: process.env.PPOLPPOL_MODEL || null,
  /* 시험용: PPOLPPOL_TODAY=YYYY-MM-DD 면 그 날짜의 지금 시각으로 (등불·오늘 열린 방이 그날 것이 된다) */
  now: /^\d{4}-\d{2}-\d{2}$/.test(process.env.PPOLPPOL_TODAY || '') ? function () { var d = new Date(), t = process.env.PPOLPPOL_TODAY.split('-'); d.setFullYear(+t[0], +t[1] - 1, +t[2]); return d; } : undefined
});

var buildServer = require('./tools.js');
var server = buildServer(oct, { log: function (name, e) { process.stderr.write('[ppolppol] ' + name + ': ' + (e && e.stack || e) + '\n'); } });

server.connect(new StdioServerTransport()).then(function () {
  process.stderr.write('[ppolppol] 문어 방이 열렸어 (상태: ' + path.relative(process.cwd(), oct.statePath) + ')\n');
});
