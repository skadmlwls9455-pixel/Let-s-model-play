#!/usr/bin/env node
/* 라이트 픽셀 테마 대비 표 다시 재기 — node docs/research/light-contrast/contrast.js
 * WCAG 2.x 상대휘도 대비. 디더 점 색은 360×740 캡처(deviceScaleFactor 2)에서 실제로 뽑은 픽셀 값이다:
 *   --panel #e7d5b3 위 3% 디더 점 = #e2cfae, --bg #d7b594 위 6% 디더 점 = #cdac8d, --strip #c09473 위 3% 점 = #bc9070.
 * 시안 색은 모두 js/palettes.js 의 Apollo 안에 있는지 여기서 확인한다 (아니면 exit 1). 이 파일은 CSS 를 고치지 않는다. */
'use strict';
var path = require('path');
var APOLLO = require(path.join(__dirname, '../../../js/palettes.js')).apollo.colors;

function lin(v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
function L(h) { var n = parseInt(h.slice(1), 16); return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); }
function cr(a, b) { var x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

var SURF = { panel: '#e7d5b3', panelDot: '#e2cfae', bg: '#d7b594', bgDot: '#cdac8d', panel2: '#ebede9', strip: '#c09473', stripDot: '#bc9070' };
var NOW = { '--amber': '#884b2b', '--rose': '#a53030', '--pip-off': '#ad7757', '--amber-fill': '#be772b', '--amber-hi': '#e8c170', '--line': '#602c2c', '--on-accent': '#241527' };
var CANDIDATES = {
  A: { '--amber': '#7a4841', '--rose': '#752438', '--pip-off': '#602c2c' },
  B: { '--amber': '#602c2c', '--rose': '#752438', '--pip-off': '#4d2b32' },
  C: { '--amber': '#7a4841', '--rose': '#752438', '--pip-off': '#7a4841', '--amber-fill': '#de9e41', '--amber-lo': '#be772b' }
};

/* 줄 = [이름, 기준(null = 참고 수치만), 앞색 fn(t), 뒷색 fn(t)] — t = 그 시안의 토큰 표 */
var ROWS = [
  ['호박 글자 / --panel (로그 라벨 · 통계 숫자 · 나가 있는 동안 알약)', 4.5, function (t) { return t['--amber']; }, function () { return SURF.panel; }],
  ['  ↳ 같은 자리, 디더 점 위', 4.5, function (t) { return t['--amber']; }, function () { return SURF.panelDot; }],
  ['(참고) 호박 글자 / --bg — 지금 이 자리에 호박 글자 없음', 4.5, function (t) { return t['--amber']; }, function () { return SURF.bg; }],
  ['장미 글자 / --bg (데모 조작 경고 한 줄)', 4.5, function (t) { return t['--rose']; }, function () { return SURF.bg; }],
  ['  ↳ 같은 자리, 디더 점 위', 4.5, function (t) { return t['--rose']; }, function () { return SURF.bgDot; }],
  ['장미 글자 / 버튼 --panel (전체 초기화)', 4.5, function (t) { return t['--rose']; }, function () { return SURF.panel; }],
  ['  ↳ 같은 자리, 디더 점 위', 4.5, function (t) { return t['--rose']; }, function () { return SURF.panelDot; }],
  ['--on-accent 글자 / --amber-fill (뽈뽈 다녀와 · 저장 경고 · 켜진 칩)', 4.5, function (t) { return t['--on-accent']; }, function (t) { return t['--amber-fill']; }],
  ['켜진 칸 / 꺼진 칸 (등불 칸 · 소리 크기 막대)', 3, function (t) { return t['--amber-fill']; }, function (t) { return t['--pip-off']; }],
  ['칸 테두리 --line / 상태 줄 --strip 디더 점 (칸과 이웃의 경계)', 3, function (t) { return t['--line']; }, function () { return SURF.stripDot; }],
  ['(참고) 꺼진 칸 / 상태 줄 — 경계는 위 테두리가 맡음', null, function (t) { return t['--pip-off']; }, function () { return SURF.strip; }],
  ['(참고) 켜진 칸 / 상태 줄 — 경계는 위 테두리가 맡음', null, function (t) { return t['--amber-fill']; }, function () { return SURF.strip; }],
  ['입력칸 포커스 테두리 --amber-fill / 입력칸 --panel2', 3, function (t) { return t['--amber-fill']; }, function () { return SURF.panel2; }]
];

function tokens(c) { var t = Object.assign({}, NOW); Object.keys(c || {}).forEach(function (k) { t[k] = c[k]; }); return t; }
function fmt(x, min) { return x.toFixed(2) + (min == null ? '' : x >= min ? ' ✓' : ' ✗'); }

var bad = [];
Object.keys(CANDIDATES).forEach(function (k) { Object.keys(CANDIDATES[k]).forEach(function (n) { if (APOLLO.indexOf(CANDIDATES[k][n]) < 0) bad.push(k + ' ' + n + ' ' + CANDIDATES[k][n]); }); });
if (bad.length) { console.error('Apollo 밖 색: ' + bad.join(', ')); process.exit(1); }

var cols = ['now'].concat(Object.keys(CANDIDATES));
console.log('| 쌍 | 기준 | 현재 | ' + Object.keys(CANDIDATES).map(function (k) { return '시안 ' + k; }).join(' | ') + ' |');
console.log('|---|---|---|' + Object.keys(CANDIDATES).map(function () { return '---'; }).join('|') + '|');
ROWS.forEach(function (r) {
  var cells = cols.map(function (k) { var t = tokens(k === 'now' ? null : CANDIDATES[k]); return fmt(cr(r[2](t), r[3](t)), r[1]); });
  console.log('| ' + r[0] + ' | ' + (r[1] == null ? '—' : r[1]) + ' | ' + cells.join(' | ') + ' |');
});
console.log('\n모든 시안 색이 Apollo 안에 있음: ' + Object.keys(CANDIDATES).map(function (k) { return k + ' ' + Object.keys(CANDIDATES[k]).length + '개'; }).join(' · '));
