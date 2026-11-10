#!/usr/bin/env node
/* mcp/data/rooms.i18n.json 만들기 — 도서관 방 (js/world.js nodes) 의 이름 · 위키 제목을 en · ja 로.
   ko.wikipedia 의 언어 링크 (prop=langlinks) 로 그 언어의 같은 글을 찾는다. 이름은 그 글의 제목에서 괄호 설명을 뗀 것.
   언어 링크가 없는 방은 빠진다 — 그런 방 (과 엉뚱한 링크) 은 data/rooms.manual.json 에 손으로 적는다 (core 가 그 파일을 위에 덮는다). 이 파일은 손으로 고치지 않는다 — 다시 돌린다.
   usage: node tools/build-room-names.js */
'use strict';
var fs = require('fs'), path = require('path');
var WORLD = require('../../js/world.js');
var I18N = require('../i18n.js');
var UA = 'ppolppol-octopus-mcp/0.1 (local game; https://github.com/skadmlwls9455-pixel/Let-s-model-play)';
var LANGS = process.argv.slice(2).length ? process.argv.slice(2) : I18N.LANGS.filter(function (l) { return l !== 'ko'; });   /* node tools/build-room-names.js [en ja de …] */

function stripParen(t) { return String(t).replace(/\s*[(（][^)）]*[)）]\s*$/, '').trim(); }

/* 언어 하나씩 묻는다 (lllang): lllimit 은 한 응답의 링크 수 전체에 걸려서, 50편을 한꺼번에 물으면 뒤쪽 글의 링크가 잘린다 */
async function langlinks(titles) {
  var out = {};
  for (var k = 0; k < LANGS.length; k++) {
    var lang = LANGS[k];
    var u = 'https://ko.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&prop=langlinks&lllang=' + lang + '&lllimit=500&titles=' + encodeURIComponent(titles.join('|'));
    var d = await (await fetch(u, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } })).json();
    var q = d.query || {}, back = {};   /* 정규화 · 넘겨주기 된 제목 → 원래 제목 */
    (q.normalized || []).concat(q.redirects || []).forEach(function (m) { back[m.to] = back[m.from] || m.from; });
    (q.pages || []).forEach(function (p) {
      var orig = back[p.title] || p.title;
      out[orig] = out[orig] || {};
      (p.langlinks || []).forEach(function (ll) { if (ll.lang === lang && ll.title) out[orig][lang] = ll.title; });
    });
  }
  return out;
}

(async function () {
  var ids = Object.keys(WORLD.nodes).filter(function (id) { return WORLD.nodes[id].wiki && id !== 'door_out'; });
  var titles = ids.map(function (id) { return WORLD.nodes[id].wiki; }), links = {};
  for (var i = 0; i < titles.length; i += 50) Object.assign(links, await langlinks(titles.slice(i, i + 50)));
  var out = {}, n = { en: 0, ja: 0 };
  ids.forEach(function (id) {
    var m = links[WORLD.nodes[id].wiki] || {}, r = {};
    LANGS.forEach(function (l) { if (m[l]) { r[l] = { name: stripParen(m[l]), wiki: m[l] }; n[l]++; } });
    if (Object.keys(r).length) out[id] = r;
  });
  var day = new Date().toISOString().slice(0, 10);
  var file = path.join(__dirname, '..', 'data', 'rooms.i18n.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(Object.assign({ _built: day, _from: 'ko.wikipedia langlinks (tools/build-room-names.js)' }, out), null, 1) + '\n');
  console.log('rooms.i18n.json: 방 ' + ids.length + '개 중 en ' + n.en + ' · ja ' + n.ja);
  ids.filter(function (id) { return !out[id] || !out[id].en || !out[id].ja; }).forEach(function (id) { console.log('  언어 링크 없음: ' + id + ' (' + WORLD.nodes[id].wiki + ')' + (out[id] ? ' — ' + Object.keys(out[id]).join(',') + ' 만' : '')); });
})().catch(function (e) { console.error(e); process.exit(1); });
