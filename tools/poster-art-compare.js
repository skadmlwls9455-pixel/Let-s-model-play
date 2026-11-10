#!/usr/bin/env node
/* tools/poster-art-compare.js — 방 그림 비교표: 기존(poster/kit.js, 32px) · 새 방식(sculpt.js, 32px · 64px) 을 번호·이름표와 함께.
 *   node tools/poster-art-compare.js   # → tests/evidence/poster-art/compare/*.png  (Playwright 로 찍는다)
 * 어느 쪽을 쓸지 주인이 고르는 용도 — 게임에는 아무것도 바꾸지 않는다. */
'use strict';
var fs = require('fs'), path = require('path');
var ROOT = path.resolve(__dirname, '..');
var SP = require('./ui-art/sprites.js'), OUT = require('./ui-art/pixel-out.js'), KIT = require('./ui-art/poster/kit.js'), SC = require('./ui-art/sculpt.js');
var CORNERS = [['hands', '손과 물건'], ['sea', '바다와 생물'], ['sky', '하늘과 날씨'], ['signs', '기호와 언어'], ['numbers', '수와 모양'], ['sounds', '소리와 리듬'], ['home', '집과 사람'], ['mind', '생각하는 것'], ['wild', '들판']];
function uri(w, cells) { return 'data:image/png;base64,' + OUT.encodePNG(w, w, OUT.rgba(cells)).toString('base64'); }
function oldArt(def, id) { var c = KIT.make(); def[1](c); return uri(32, OUT.cells(c.c, 32, 32, 32, true, id)); }
function newArt(def, s) { var S = new SC.Scene(s); def[1](S); var r = S.render(); return uri(r.N, r.keys.map(function (k) { return k ? SP.KEY[k] : null; })); }
var n = 0, groups = [], pick = {};
CORNERS.forEach(function (c) {
  var of = path.join(__dirname, 'ui-art/poster', c[0] + '.js'), nf = path.join(__dirname, 'ui-art/poster2', c[0] + '.js');
  if (!fs.existsSync(nf)) return;
  var o = require(of), m = require(nf), cards = [];
  Object.keys(m).forEach(function (id) { n++; var a = { n: n, id: id, name: m[id][0], old: o[id] ? oldArt(o[id], id) : null, n32: newArt(m[id], 1), n64: newArt(m[id], 2) }; cards.push(a); pick[id] = a; });
  groups.push({ key: c[0], name: c[1], cards: cards });
});
function sceneUri(c) { return 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'assets/poster/scene_' + c + '.png')).toString('base64'); }
var MOCK = [['bell', 'sounds'], ['octopus', 'sea'], ['feather', 'sky'], ['key', 'hands'], ['honeycomb', 'numbers'], ['tea', 'home']].filter(function (q) { return pick[q[0]]; });
var html = '<!doctype html><meta charset="utf-8"><style>' +
  'body{margin:0;padding:16px;background:#e7d5b3;color:#2a2620;font:15px/1.5 system-ui,sans-serif;width:1290px}' +
  'h2{margin:18px 0 8px;font-size:20px}.legend{font-size:14px;margin:0 0 6px}' +
  '.card{display:inline-block;vertical-align:top;width:414px;margin:0 8px 12px 0;padding:8px;background:#f3e9d6;border:2px solid #ad7757;box-sizing:border-box}' +
  '.card b{font-size:16px}.row{display:flex;gap:6px;margin-top:6px}.cell{width:128px;text-align:center;font-size:12px}' +
  '.cell img{width:128px;height:128px;image-rendering:pixelated;display:block;background:#e7d5b3}.cell.dk img{background:#3c5e8b}' +
  '.mock{display:inline-block;vertical-align:top;margin:0 12px 14px 0;font-size:13px;text-align:center}.sc{position:relative;width:264px;height:224px;overflow:hidden;border-radius:6px}' +
  '.sc img.bg{position:absolute;left:0;top:0;width:264px;height:224px;image-rendering:pixelated}.sc img.art{position:absolute;left:23px;top:33px;width:128px;height:128px;image-rendering:pixelated}' +
  '</style><body>';
groups.forEach(function (g) {
  html += '<section id="g-' + g.key + '"><h2>' + g.name + '</h2><p class="legend">왼쪽 = <b>기존</b> · 가운데 = 새 방식 (같은 크기) · 오른쪽 = 새 방식 (두 배 촘촘하게 — 포스터의 큰 그림용)</p>';
  g.cards.forEach(function (a) {
    html += '<div class="card"><b>' + a.n + '. ' + a.name + '</b><div class="row">' +
      '<div class="cell">' + (a.old ? '<img src="' + a.old + '">' : '') + '기존</div><div class="cell"><img src="' + a.n32 + '">새 · 같은 크기</div><div class="cell"><img src="' + a.n64 + '">새 · 촘촘하게</div></div></div>';
  });
  html += '</section>';
});
html += '<section id="g-mock"><h2>포스터 장면 안에서 (왼쪽 = 기존 · 오른쪽 = 새 방식 촘촘하게)</h2>';
MOCK.forEach(function (q) { var a = pick[q[0]], bg = sceneUri(q[1]);
  html += '<div class="mock"><div class="sc"><img class="bg" src="' + bg + '"><img class="art" src="' + a.old + '"></div>' + a.n + '. ' + a.name + ' — 기존</div>' +
          '<div class="mock"><div class="sc"><img class="bg" src="' + bg + '"><img class="art" src="' + a.n64 + '"></div>' + a.n + '. ' + a.name + ' — 새</div>'; });
html += '</section></body>';
(async function () {
  var chromium = require('playwright').chromium, b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1322, height: 900 }, deviceScaleFactor: 1 });
  await p.setContent(html); await p.waitForTimeout(300);
  var dir = path.join(ROOT, 'tests/evidence/poster-art/compare'); fs.mkdirSync(dir, { recursive: true });
  for (var i = 0; i < groups.length; i++) { await p.locator('#g-' + groups[i].key).screenshot({ path: path.join(dir, (i + 1) + '-' + groups[i].key + '.png') }); }
  await p.locator('#g-mock').screenshot({ path: path.join(dir, 'in-poster.png') });
  await b.close();
  console.log('비교표: ' + n + '장 · ' + groups.map(function (g) { return g.key; }).join(' ') + ' → tests/evidence/poster-art/compare/');
})();
