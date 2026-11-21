/* tools/test-vista.js — 다락 밖 먼 풍경 그림 (js/vista.js) 의 규칙 검사. node 만 (DOM · 브라우저 없음).
   · 같은 값 = 같은 그림 (시계 · 난수 없음) · 크기 그대로 · 색은 전부 팔레트 칸 · 시각대 · 날씨 · 계절마다 다른 그림
   · t 는 바다 (물결 · 물거품) 만 바꾼다 — 하늘 · 마을 · 숲은 그대로 · 같은 칸 번호 = 같은 그림 · 밤엔 별 · 달 · 불 켜진 창 셋, 낮엔 없음
   · 방이 주인공: 지평선 위 (하늘) 는 색 수가 적고 잔잔하다 */
'use strict';
var fs = require('fs'), path = require('path');
var VISTA = require('../js/vista.js');
var fails = 0, passes = 0;
function ok(c, m) { if (c) { passes++; console.log('  ok   ' + m); } else { fails++; console.error('  FAIL ' + m); } }
function hex(d, i) { return '#' + [d[i], d[i + 1], d[i + 2]].map(function (v) { return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
function same(a, b) { if (a.length !== b.length) return false; for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }
function diffRows(a, b, w, h) { var lo = -1, hi = -1; for (var y = 0; y < h; y++) for (var x = 0; x < w * 4; x++) if (a[y * w * 4 + x] !== b[y * w * 4 + x]) { if (lo < 0) lo = y; hi = y; break; } return [lo, hi]; }
function count(v, col) { var n = 0; for (var i = 0; i < v.d.length; i += 4) if (hex(v.d, i) === col) n++; return n; }
function colours(v, y0, y1) { var s = {}; for (var y = y0; y < y1; y++) for (var x = 0; x < v.w; x++) s[hex(v.d, (y * v.w + x) * 4)] = 1; return Object.keys(s); }

console.log('\n== VISTA: 모양 · 결정성');
var src = fs.readFileSync(path.join(__dirname, '..', 'js', 'vista.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
ok(!/Math\.random|Date\.now|new Date|performance\.now|document\.|window\./.test(src), '시계 · 난수 · DOM 을 쓰지 않는다');
ok(!/\bimport\b|\bexport\b/.test(src.replace(/module\.exports/g, '')), 'import / export 없음 (file:// 에서도 그대로)');
var SIZES = [[180, 370], [206, 457], [426, 266], [212, 370]];
SIZES.forEach(function (s) {
  var a = VISTA.paint(s[0], s[1], { hour: 13, weather: 'clear', season: 'summer', seed: 'home', t: 0 }), b = VISTA.paint(s[0], s[1], { hour: 13, weather: 'clear', season: 'summer', seed: 'home', t: 0 });
  ok(a.w === s[0] && a.h === s[1] && a.d.length === s[0] * s[1] * 4 && a.d instanceof Uint8ClampedArray && same(a.d, b.d), s[0] + '×' + s[1] + ': 크기 그대로 · 두 번 그려도 같은 그림');
});
var W = 180, H = 370, base = { hour: 13, weather: 'clear', season: 'summer', seed: 'home', t: 0 };
function P(o) { return VISTA.paint(W, H, Object.assign({}, base, o || {})); }
ok(!same(P().d, P({ seed: 'other' }).d), '씨앗이 다르면 다른 그림');

console.log('\n== 색: 전부 팔레트 칸 · 불투명');
var pal = {}; VISTA.PALETTE.forEach(function (c) { pal[c] = 1; });
var bad = 0, alpha = 0, combos = 0;
[2, 7, 13, 18, 23].forEach(function (hr) { ['clear', 'drizzle', 'rain', 'snow'].forEach(function (we) { ['spring', 'summer', 'autumn', 'winter'].forEach(function (se) {
  var v = P({ hour: hr, weather: we, season: se }); combos++;
  for (var i = 0; i < v.d.length; i += 4) { if (!pal[hex(v.d, i)]) bad++; if (v.d[i + 3] !== 255) alpha++; }
}); }); });
ok(bad === 0 && alpha === 0, combos + ' 가지 (시각 5 × 날씨 4 × 계절 4) 모두 팔레트 46 칸 안 · 불투명 (밖 ' + bad + ' · 투명 ' + alpha + ')');
ok(VISTA.PALETTE.length === 46, '팔레트 46 칸');

console.log('\n== 시각대 · 날씨 · 계절');
ok(VISTA.phase(13) === 'day' && VISTA.phase(18) === 'dusk' && VISTA.phase(0) === 'night' && VISTA.phase(23.5) === 'night' && VISTA.phase(7) === 'dawn' && VISTA.phase(24 + 13) === 'day', '시각대: 13 낮 · 18 노을 · 0 · 23.5 밤 · 7 새벽');
var day = P(), dusk = P({ hour: 18 }), night = P({ hour: 0 }), dawn = P({ hour: 7 });
ok(!same(day.d, dusk.d) && !same(dusk.d, night.d) && !same(night.d, dawn.d) && !same(dawn.d, day.d), '낮 · 노을 · 밤 · 새벽이 서로 다른 그림');
ok(same(P({ hour: 10 }).d, P({ hour: 15 }).d), '같은 시각대 안에서는 같은 그림 (10시 = 15시)');
ok(!same(day.d, P({ weather: 'rain' }).d) && !same(day.d, P({ season: 'autumn' }).d) && !same(day.d, P({ season: 'winter' }).d) && !same(day.d, P({ season: 'spring' }).d), '비 · 가을 · 겨울 · 봄은 낮 맑은 여름과 다른 그림');
function lum(v, y0, y1) { var s = 0, n = 0; for (var y = y0; y < y1; y++) for (var x = 0; x < v.w; x++) { var i = (y * v.w + x) * 4; s += 0.299 * v.d[i] + 0.587 * v.d[i + 1] + 0.114 * v.d[i + 2]; n++; } return s / n / 255; }
ok(lum(night, 0, H) < 0.12 && lum(night, 0, H) < lum(dusk, 0, H) && lum(dusk, 0, H) < lum(day, 0, H), '밤이 가장 어둡고 (평균 밝기 ' + lum(night, 0, H).toFixed(3) + ') 노을 · 낮 차례로 밝다');
var LIT = '#e8c170';
ok(count(night, LIT) === 6 && count(dusk, LIT) === 4 && count(day, LIT) === 0, '불 켜진 창: 밤 셋 (창 하나 = 2 px → ' + count(night, LIT) + ') · 노을 둘 (' + count(dusk, LIT) + ') · 낮 없음');
var H0 = Math.round(H * 0.5);
ok(count(night, '#e7d5b3') >= 20 && count(P({ hour: 0, weather: 'rain' }), '#e7d5b3') === 0, '맑은 밤엔 달 · 비 오는 밤엔 없음');
ok(colours(night, 0, H0).indexOf('#c7cfcc') >= 0 && colours(P({ hour: 0, weather: 'rain' }), 0, H0).indexOf('#c7cfcc') < 0, '맑은 밤엔 별 · 비 오는 밤엔 없음');
[day, dusk, night, dawn].forEach(function (v, i) { var n = colours(v, 0, H0).length; ok(n <= 9, ['낮', '노을', '밤', '새벽'][i] + ' 하늘은 색 ' + n + ' 가지 (≤ 9 — 잔잔하게)'); });

console.log('\n== 지평선 · 움직임 (물결만)');
var up = VISTA.paint(W, H, Object.assign({}, base, { horizon: 0.4 }));
ok(hex(up.d, (Math.round(H * 0.4) * W + 5) * 4) === '#a4dddb' && hex(day.d, (H0 * W + 5) * 4) === '#a4dddb', '지평선 한 줄 (안개빛) 이 horizon 자리에 (기본 0.5 · 0.4)');
var t0 = P({ t: 0 }), t1 = P({ t: 0.34 }), t1b = P({ t: 0.5 }), t9 = P({ t: 100.2 });
var dr = diffRows(t0.d, t1.d, W, H);
ok(VISTA.frame(0) === 0 && VISTA.frame(0.34) === 1 && VISTA.frame(0.5) === 1 && VISTA.FPS >= 2 && VISTA.FPS <= 4, '물결은 1 초에 ' + VISTA.FPS + ' 칸 (2–4)');
ok(!same(t0.d, t1.d) && same(t1.d, t1b.d), '칸이 바뀌면 그림이 바뀌고 같은 칸 안에서는 같은 그림');
ok(dr[0] > H0 && dr[1] < H0 + Math.round((H - H0) * 0.45), '바뀌는 줄은 바다 · 물가뿐 (' + dr.join('–') + ' · 지평선 ' + H0 + ') — 하늘 · 마을 · 숲은 그대로');
ok(same(P({ t: 100.2 }).d, t9.d) && same(VISTA.paint(W, H, Object.assign({}, base, { t: -5 })).d, t0.d), '큰 t · 음수 t 도 결정적 (음수 = 0)');
var changed = 0; for (var i = 0; i < t0.d.length; i += 4) if (t0.d[i] !== t1.d[i] || t0.d[i + 1] !== t1.d[i + 1] || t0.d[i + 2] !== t1.d[i + 2]) changed++;
ok(changed > 20 && changed < W * H * 0.04, '한 칸에 바뀌는 픽셀은 조금 (' + changed + ' / ' + W * H + ' — 잔잔한 물결)');

console.log('\ntest-vista: ' + passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
