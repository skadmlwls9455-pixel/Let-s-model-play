#!/usr/bin/env node
/* js/shelf.js 만들기 — 큰 도서관 '오늘의 서가' 후보 (ko.wikipedia 알찬 글 + 좋은 글 제목).
   게임과 MCP 서버가 같은 목록 · 같은 뽑기 (SHELF.today) 를 써서 같은 날 같은 서가를 본다. 목록이 바뀌면 다시 돌린다.
   usage: node tools/build-shelf.js */
'use strict';
var fs = require('fs'), path = require('path');
var UA = 'ppolppol-octopus-mcp/0.1 (local game; https://github.com/skadmlwls9455-pixel/Let-s-model-play)';
var CATS = ['분류:알찬 글', '분류:좋은 글'];
async function members(cat) {
  var out = [], cont = null, guard = 0;
  do {
    var u = 'https://ko.wikipedia.org/w/api.php?action=query&format=json&list=categorymembers&cmnamespace=0&cmlimit=500&cmtitle=' + encodeURIComponent(cat) + (cont ? '&cmcontinue=' + encodeURIComponent(cont) : '');
    var d = await (await fetch(u, { headers: { 'User-Agent': UA } })).json();
    (d.query.categorymembers || []).forEach(function (m) { out.push(m.title); });
    cont = d.continue && d.continue.cmcontinue; guard++;
  } while (cont && guard < 6);
  return out;
}
(async function () {
  var pool = [];
  for (var c of CATS) (await members(c)).forEach(function (t) { if (pool.indexOf(t) < 0) pool.push(t); });
  pool.sort();
  if (pool.length < 100) { console.error('목록이 너무 짧다 (' + pool.length + ') — 쓰지 않는다'); process.exit(1); }
  var day = new Date().toISOString().slice(0, 10);
  var src = '/* 뽈뽈 문어 — 큰 도서관 \'오늘의 서가\' 후보 (전역 SHELF, 데이터 + 뽑기 하나)\n' +
    '   ko.wikipedia ' + CATS.join(' · ') + ' 제목 ' + pool.length + '편, ' + day + ' 에 mcp/tools/build-shelf.js 로 만들었다 (손으로 고치지 않는다).\n' +
    '   SHELF.today(dateKey, BRAIN) → 그날의 N 권. 누가 고른 게 아니라 날짜로 정해지는 무작위다 (게임 · MCP 같은 결과). */\n' +
    'var SHELF = (function () {\n' +
    '  var pool = ' + JSON.stringify(pool) + ';\n' +
    '  function today(dateKey, B, n) {\n' +
    '    n = n || 8; var p = pool.slice(), r = B.rng(B.hashSeed(\'shelf\', dateKey));\n' +
    '    for (var i = p.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = p[i]; p[i] = p[j]; p[j] = t; }\n' +
    '    return p.slice(0, n);\n' +
    '  }\n' +
    '  return { pool: pool, built: \'' + day + '\', today: today };\n' +
    '})();\n\n' +
    'if (typeof module !== \'undefined\' && module.exports) module.exports = SHELF;\n';
  fs.writeFileSync(path.join(__dirname, '..', '..', 'js', 'shelf.js'), src);
  console.log('js/shelf.js: ' + pool.length + '편');
})().catch(function (e) { console.error(e); process.exit(1); });
