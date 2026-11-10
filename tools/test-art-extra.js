#!/usr/bin/env node
/* tools/test-art-extra.js — 배지 · 조개 동전 · 큰 기념품 그림 검사 (node, 의존성 없음). 실패하면 exit 1.
 *   node tools/test-art-extra.js
 * - 배지 v0 12장 (24×24) · 등급 리본 4 (16×16) · 조개 동전 16×16 · 8×8 · 배지 소품 2 (24×24): 파일 · 크기 · manifest · 서로 다른 그림
 * - 큰 기념품 16종 (32×32): js/world.js 의 기념품 전부 · manifest souvenir32.* (있을 때만 검사) */
'use strict';
var fs = require('fs'), path = require('path');
var ROOT = path.resolve(__dirname, '..'), fails = 0, passes = 0;
function check(c, m) { if (c) passes++; else { fails++; console.error('  FAIL ' + m); } }
var man = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/manifest.json'), 'utf8'));
function png(rel) { var f = path.join(ROOT, rel); if (!fs.existsSync(f)) return null; var b = fs.readFileSync(f); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), b64: b.toString('base64') }; }
function group(prefix, n, size, label) {
  var keys = Object.keys(man).filter(function (k) { return k.indexOf(prefix) === 0; }), seen = {};
  check(keys.length === n, label + ' ' + n + '개 (지금 ' + keys.length + ')');
  keys.forEach(function (k) { var p = png(man[k].src); check(p && p.w === size && p.h === size && man[k].w === size, k + ' ' + size + '×' + size); if (p) { check(!seen[p.b64], k + ' 는 다른 그림과 다르다'); seen[p.b64] = 1; } });
  return keys;
}
var B = require('./ui-art/badges.js');
var bk = group('badge.', 12, 24, '배지');
check(B.BADGES.every(function (b) { return bk.indexOf('badge.' + b[0]) >= 0; }), '배지 id = 그림 정의');
check(B.BADGES.map(function (b) { return b[1]; }).join() === '1,2,5,23,24,26,27,28,32,33,34,35', 'v0 배지 12개 번호 (ACHIEVEMENTS §9.1)');
check(B.BADGES.every(function (b) { return (b[1] <= 8 ? 'flag' : b[1] >= 32 ? 'drop' : 'medal') === b[3] && (b[1] >= 32 ? b[4] === 'hidden' : b[4] !== 'hidden'); }), '테 모양 = 무리 (우리 둘 깃발 · 문어 기록 물방울 · 나머지 메달), 숨김만 청록');
group('ribbon.', 4, 16, '등급 리본');
group('prop.badge.', 2, 24, '배지 소품');
var c16 = png((man['icon.coin'] || {}).src || 'x'), c8 = png((man['icon.coin8'] || {}).src || 'x');
check(c16 && c16.w === 16 && c8 && c8.w === 8, '조개 동전 16×16 · 8×8');
var shell = png('assets/icons/souvenir/shell.png'); check(shell && c16 && shell.b64 !== c16.b64, '조개 동전은 기념품 조개껍데기와 다른 그림');
if (Object.keys(man).some(function (k) { return /^souvenir32\./.test(k); })) {
  var W = new Function(fs.readFileSync(path.join(ROOT, 'js/world.js'), 'utf8') + ';return WORLD')(), ids = Object.keys(W.souvenirs), sk = group('souvenir32.', ids.length, 32, '큰 기념품');
  ids.forEach(function (id) { check(sk.indexOf('souvenir32.' + id) >= 0, '큰 기념품 있음: ' + id); });
}
console.log('test-art-extra: ' + passes + ' ok' + (fails ? ', ' + fails + ' FAIL' : ''));
process.exit(fails ? 1 : 0);
