#!/usr/bin/env node
/* '오늘의 서가' 후보 목록 만들기 — 언어별 위키백과의 알찬 글 분류 (core.js SHELF_CATS 와 같은 분류).
 *   ko → js/shelf.js (게임과 MCP 서버가 같은 목록 · 같은 뽑기 (SHELF.today) 를 써서 같은 날 같은 서가를 본다)
 *   en · ja → mcp/data/shelf.<lang>.json (서버만 쓴다. 영어 알찬 글은 수천 편이라 SAMPLE 편만 — 날짜가 아니라 언어로 정해지는 무작위 표본)
 * 목록이 바뀌면 다시 돌린다. 손으로 고치지 않는다.
 * usage: node tools/build-shelf.js            (ko)
 *        node tools/build-shelf.js en ja      (그 언어들) */
'use strict';
var fs = require('fs'), path = require('path');
var core = require('../core.js');
var BRAIN = require('../../js/brain.js');
var UA = 'ppolppol-octopus-mcp/0.1 (local game; https://github.com/skadmlwls9455-pixel/Let-s-model-play)';
var SAMPLE = 600;
var langs = process.argv.slice(2).filter(function (l) { return core.SHELF_CATS[l]; });
if (!langs.length) langs = ['ko'];

async function members(lang, cat) {
  var out = [], cont = null, guard = 0;
  do {
    var u = 'https://' + lang + '.wikipedia.org/w/api.php?action=query&format=json&list=categorymembers&cmnamespace=0&cmlimit=500&cmtitle=' + encodeURIComponent(cat) + (cont ? '&cmcontinue=' + encodeURIComponent(cont) : '');
    var d = await (await fetch(u, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } })).json();
    (d.query && d.query.categorymembers || []).forEach(function (m) { out.push(m.title); });
    cont = d.continue && d.continue.cmcontinue; guard++;
  } while (cont && guard < 40);
  return out;
}
/* 알찬 글이 너무 적은 위키 (core.SHELF_VIA[lang] = 'en'): 영어 알찬 글 전체의 언어 링크로 그 언어의 글을 모은다 — 그 언어 위키에 실제로 있는 글만 */
async function viaLinks(via, lang, titles) {
  var out = [];
  for (var i = 0; i < titles.length; i += 50) {
    var u = 'https://' + via + '.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&prop=langlinks&lllang=' + lang + '&lllimit=500&titles=' + encodeURIComponent(titles.slice(i, i + 50).join('|'));
    var d = await (await fetch(u, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } })).json();
    ((d.query && d.query.pages) || []).forEach(function (p) { (p.langlinks || []).forEach(function (ll) { if (ll.lang === lang && ll.title && out.indexOf(ll.title) < 0) out.push(ll.title); }); });
  }
  return out;
}
function sample(pool, lang) {   /* 언어로 정해지는 무작위 표본 (날짜와 무관 — 목록은 고정) */
  var p = pool.slice(), r = BRAIN.rng(BRAIN.hashSeed('shelf-build', lang));
  for (var i = p.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = p[i]; p[i] = p[j]; p[j] = t; }
  return p.slice(0, SAMPLE).sort();
}

(async function () {
  for (var k = 0; k < langs.length; k++) {
    var lang = langs[k], cats = core.SHELF_CATS[lang], pool = [];
    for (var c of cats) (await members(lang, c)).forEach(function (t) { if (pool.indexOf(t) < 0) pool.push(t); });
    var via = core.SHELF_VIA && core.SHELF_VIA[lang], own = pool.length;
    if (via) { var vp = []; for (var c2 of core.SHELF_CATS[via]) (await members(via, c2)).forEach(function (t) { if (vp.indexOf(t) < 0) vp.push(t); }); (await viaLinks(via, lang, vp)).forEach(function (t) { if (pool.indexOf(t) < 0) pool.push(t); }); console.log(lang + ': 자기 분류 ' + own + ' + ' + via + ' 알찬 글의 언어 링크 ' + (pool.length - own)); }
    pool.sort();
    if (pool.length < 100) { console.error(lang + ': 목록이 너무 짧다 (' + pool.length + ') — 쓰지 않는다'); process.exit(1); }
    var day = new Date().toISOString().slice(0, 10);
    if (lang === 'ko') {
      var src = '/* 뽈뽈 문어 — 큰 도서관 \'오늘의 서가\' 후보 (전역 SHELF, 데이터 + 뽑기 하나)\n' +
        '   ko.wikipedia ' + cats.join(' · ') + ' 제목 ' + pool.length + '편, ' + day + ' 에 mcp/tools/build-shelf.js 로 만들었다 (손으로 고치지 않는다).\n' +
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
    } else {
      var picked = pool.length > SAMPLE ? sample(pool, lang) : pool;
      var file = path.join(__dirname, '..', 'data', 'shelf.' + lang + '.json');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify({ lang: lang, built: day, cats: cats, via: via || null, total: pool.length, pool: picked }) + '\n');
      console.log(file.replace(/.*mcp\//, 'mcp/') + ': ' + picked.length + '편 (분류 전체 ' + pool.length + ')');
    }
  }
})().catch(function (e) { console.error(e); process.exit(1); });
