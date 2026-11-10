#!/usr/bin/env node
/* tools/make-souvenirs32.js — 기념품 16종 큰 판 (32×32) → assets/souvenirs32/*.png + manifest souvenir32.* (추가만) + tests/evidence/souvenirs32/sheet.png
 * 그림: tools/ui-art/souvenirs32.js. 16px 아이콘(icon.souvenir.*)·플레이스홀더(souvenir.*)는 건드리지 않는다. */
'use strict';
var fs = require('fs'), path = require('path');
var KIT = require('./ui-art/poster/kit.js'), OUT = require('./ui-art/pixel-out.js'), S = require('./ui-art/souvenirs32.js');
var ROOT = path.resolve(__dirname, '..'), MANIFEST = path.join(ROOT, 'assets/manifest.json');
var man = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')), items = [];
Object.keys(man).forEach(function (k) { if (/^souvenir32\./.test(k)) delete man[k]; });
fs.mkdirSync(path.join(ROOT, 'assets/souvenirs32'), { recursive: true });
Object.keys(S).forEach(function (id) {
  var c = KIT.make(); S[id][1](c);
  var cells = OUT.cells(c.c, KIT.W, 32, 32, true, id), rel = 'assets/souvenirs32/' + id + '.png';
  fs.writeFileSync(path.join(ROOT, rel), OUT.encodePNG(32, 32, OUT.rgba(cells)));
  man['souvenir32.' + id] = { src: rel, w: 32, h: 32, note: '기념품 「' + S[id][0] + '」 큰 판 32×32 (정수 배로만). 16px 판은 icon.souvenir.' + id + '.' };
  items.push({ cells: cells, w: 32, h: 32 });
});
fs.writeFileSync(MANIFEST, JSON.stringify(man, null, 2) + '\n');
var ev = path.join(ROOT, 'tests/evidence/souvenirs32'); fs.mkdirSync(ev, { recursive: true });
fs.writeFileSync(path.join(ev, 'sheet.png'), OUT.sheet(items, 8, 5, 8));
console.log('souvenirs32: ' + items.length + ' PNG → assets/souvenirs32/ · tests/evidence/souvenirs32/sheet.png');
