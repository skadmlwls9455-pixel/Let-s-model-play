/* tools/test-fs-snap.js — 픽셀 글꼴 크기 맞춤 (js/fs-snap.js) 검사. node 만.
   11-24: 보이는 글자는 늘 16 px 이상 — m16 (작은 글) 과 말풍선은 어느 배율에서도 바라는 크기 (16 · 17 px) 밑으로 내려가지 않고, 다음 눈금이 너무 크면 (× 1.35 넘게) 바라는 크기 그대로.
   다른 역할도 16 px 밑으로 가지 않는다 (u12 '데모' 옛 역할 제외 — 꼬리표는 이제 m16). 기기 px 에 맞는 크기면 (눈금 × 정수 / 배율) 그대로 */
'use strict';
var fs = require('fs'), path = require('path');
var fails = 0, passes = 0;
function ok(c, m) { if (c) { passes++; console.log('  ok   ' + m); } else { fails++; console.error('  FAIL ' + m); } }
function load(d) {
  var props = {}, win = { devicePixelRatio: d, addEventListener: function () {}, matchMedia: function () { return {}; } };
  var doc = { documentElement: { style: { setProperty: function (k, v) { props[k] = parseFloat(v); } } } };
  new Function('window', 'document', fs.readFileSync(path.join(__dirname, '..', 'js', 'fs-snap.js'), 'utf8'))(win, doc);
  return props;
}
console.log('\n== fs-snap: 배율마다 작은 글 (m16) · 말풍선 (bub-fs) 크기');
[1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.625, 2.75, 3, 3.5, 4].forEach(function (d) {
  var p = load(d), m = p['--fs-m16'], b = p['--bub-fs'];
  function crispOr(v, want) { var n = v * d / 12; return Math.abs(n - Math.round(n)) < 0.02 || v === want; }
  ok(m >= 16 && m <= 16 * 1.35 + 0.02 && crispOr(m, 16), '배율 ' + d + ': m16 = ' + m + ' px (16 이상 · 21.6 이하 · 기기 px 눈금이거나 16 그대로)');
  ok(b >= 17 && b <= 17 * 1.35 + 0.02 && crispOr(b, 17), '배율 ' + d + ': 말풍선 = ' + b + ' px (17 이상)');
  var low = Object.keys(p).filter(function (k) { return k !== '--fs-u12' && p[k] < 16 - 1e-6; });
  ok(low.length === 0, '배율 ' + d + ': 16 px 밑인 역할 없음 (' + low.join(', ') + ')');
});
console.log('\ntest-fs-snap: ' + passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
