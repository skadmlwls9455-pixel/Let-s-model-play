#!/usr/bin/env node
/* tools/make-badges.js — 배지 · 등급 리본 · 조개 동전 · 배지 소품 그림 (docs/ACHIEVEMENTS.md §9.1 v0-2, docs/BADGE_ART.md).
 *   node tools/make-badges.js   # assets/badges/*.png + manifest (badge.* · icon.coin* · ribbon.* · prop.badge.*, 추가만) + tests/evidence/badges/sheet.png
 * 그림: tools/ui-art/badges.js. 색은 Apollo 만, 외곽선은 장면 규칙. 브라우저·의존성 없음. */
'use strict';
var fs = require('fs'), path = require('path');
var KIT = require('./ui-art/poster/kit.js'), OUT = require('./ui-art/pixel-out.js'), B = require('./ui-art/badges.js');
var ROOT = path.resolve(__dirname, '..'), MANIFEST = path.join(ROOT, 'assets/manifest.json');
var man = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')), items = [];
Object.keys(man).forEach(function (k) { if (/^(badge\.|ribbon\.|icon\.coin|prop\.badge\.)/.test(k)) delete man[k]; });
fs.mkdirSync(path.join(ROOT, 'assets/badges'), { recursive: true });
function make(key, file, size, draw, note) {
  var c = KIT.make(); draw(c);
  var cells = OUT.cells(c.c, KIT.W, size, size, true, key), rel = 'assets/badges/' + file + '.png';
  fs.writeFileSync(path.join(ROOT, rel), OUT.encodePNG(size, size, OUT.rgba(cells)));
  man[key] = { src: rel, w: size, h: size, note: note }; items.push({ cells: cells, w: size, h: size });
}
B.BADGES.forEach(function (b) { make('badge.' + b[0], b[0], 24, B.badge(b), '배지 #' + b[1] + ' 「' + b[2] + '」 — 테 ' + b[3] + ' · 등급 ' + b[4] + '. 24×24, ×2 = 48px 로 (docs/ACHIEVEMENTS.md §6.2).'); });
B.TIERS.forEach(function (t) { make('ribbon.' + t, 'ribbon_' + t, 16, B.ribbon(t), '등급 리본 (' + t + ') 16×16.'); });
make('icon.coin', 'coin', 16, B.coin16, '조개 동전 16×16 (×2 = 32px, 지갑 머리). 금빛 동전 테 안에 조개 무늬 — 기념품 조개껍데기와 다른 그림.');
make('icon.coin8', 'coin8', 8, B.coin8, '조개 동전 8×8 (×2 = 16px, 글줄 안).');
Object.keys(B.PROPS).forEach(function (k) { make('prop.badge.' + k, 'prop_' + k, 24, B.PROPS[k][1], '배지 소품 「' + B.PROPS[k][0] + '」 24×24 (2D 그림 — 3D 소품은 장면 쪽).'); });
fs.writeFileSync(MANIFEST, JSON.stringify(man, null, 2) + '\n');
var ev = path.join(ROOT, 'tests/evidence/badges'); fs.mkdirSync(ev, { recursive: true });
fs.writeFileSync(path.join(ev, 'sheet.png'), OUT.sheet(items, 6, 6, 8));
console.log('badges: 배지 ' + B.BADGES.length + ' · 리본 ' + B.TIERS.length + ' · 동전 2 · 소품 ' + Object.keys(B.PROPS).length + ' → assets/badges/ · tests/evidence/badges/sheet.png');
