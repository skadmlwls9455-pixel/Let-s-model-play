/* tools/ui-art/souvenirs32.js — 기념품 16종의 큰 판 (32×32). 16px 아이콘(icon.souvenir.*)과 같은 물건을 크게 다시 그린 것.
 * 포스터·선반·앨범처럼 크게 보일 자리에 쓴다. 붓은 poster/kit.js. 방 그림(assets/poster)과 같은 물건이어도 '주워 온 작은 것' 으로 다르게 그린다. */
'use strict';
module.exports = {
  feather: ['깃털', function (c) {   /* 잿빛 작은 깃털 */
    c.S(function (x, y) { var t = (x - y + 27) / 2, u = (x + y - 33) / 2; if (t < 5 || t > 23) return null; var w = 4.6 * Math.pow(Math.sin(Math.PI * (t - 4.5) / 19), 0.7); if (Math.abs(u) > w) return null; if (Math.abs(u) < 0.6) return 'W'; var b = Math.floor(t + Math.abs(u) * 0.7) % 3 === 0; return u < 0 ? (b ? 'Y' : 'Z') : (b ? 'W' : 'X'); });
    c.L(7, 26, 10, 23, 'W').dot(6, 27, 'V').dot(21, 14, null).dot(15, 20, null);
  }],
  shell: ['조개껍데기', function (c) {   /* 분홍 테 두른 작은 가리비 */
    c.S(function (x, y) { var dx = x + 0.5 - 16, dy = y + 0.5 - 23, d = Math.hypot(dx, dy); if (dy > 0 || d > 13.5) return null; var a = Math.atan2(-dy, dx), seg = Math.floor(a / Math.PI * 7); return d > 11.6 ? 'R' : seg % 2 ? 'Z' : 'f'; });
    c.G(12, 23, ['RffffffR', '.dffffd.', '..dccd..']).D([[9, 14], [12, 12]], 'Z');
  }],
  pebble: ['조약돌', function (c) {   /* 줄무늬 조약돌 + 작은 돌 */
    c.B(14, 18, 11, 7.5, ['Z', 'Y', 'X', 'W', 'V']);
    c.S(function (x, y) { var dx = (x + 0.5 - 14) / 11, dy = (y + 0.5 - 18) / 7.5; return dx * dx + dy * dy <= 1 && Math.abs(y - 16 - Math.round(Math.sin(x / 4) * 1.2)) < 1 ? 'Z' : null; });
    c.B(25, 24, 4, 3, ['7', '6', '5', '4', '4']).D([[8, 14], [9, 13]], 'Z');
  }],
  button: ['단추', function (c) {   /* 구멍 둘 빨간 단추 */
    c.disc(16, 16, 11, function (x, y) { return x + y < 24 ? 'L' : x + y > 40 ? 'J' : 'K'; }).ring(16, 16, 11, 1.4, function (x, y) { return x + y < 30 ? 'L' : 'I'; }).ring(16, 16, 7.5, 1, 'J');
    c.R(12, 15, 2, 2, 'H').R(18, 15, 2, 2, 'H').L(14, 16, 17, 16, 'f').D([[9, 9], [10, 8]], 'Z');
  }],
  leaf: ['나뭇잎', function (c) {   /* 물든 나뭇잎 */
    c.S(function (x, y) { var t = (x - y + 27) / 2, u = (x + y - 33) / 2; if (t < 5 || t > 24) return null; var w = 6.5 * Math.sin(Math.PI * (t - 4.5) / 20) * (t > 18 ? 0.8 : 1); if (Math.abs(u) > w) return null; if (Math.abs(u) < 0.6) return 'C'; var vein = Math.abs((Math.abs(u) - (t % 4) * 0.9)) < 0.5; return vein ? 'D' : u < 0 ? (t > 14 ? 'F' : 'E') : (t > 14 ? 'E' : 'L'); });
    c.L(6, 27, 9, 24, 'b').dot(5, 28, 'a');
  }],
  marble: ['유리구슬', function (c) {   /* 속에 소용돌이가 든 유리구슬 */
    c.disc(16, 16, 11, function (x, y) { return x + y < 24 ? '7' : x + y > 40 ? '4' : '6'; });
    c.S(function (x, y) { var dx = x + 0.5 - 16, dy = y + 0.5 - 16, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx); return d < 8.5 && Math.abs(((d * 0.9 - a * 2.2) % 6.28 + 6.28) % 6.28 - 3.14) < 0.9 ? (d < 5 ? 'F' : 'K') : null; });
    c.G(9, 8, ['.ZZ', 'ZZ.', 'Z..']).dot(22, 23, '7');
  }],
  yarn: ['실뭉치', function (c) {   /* 파란 실뭉치 */
    c.disc(15, 16, 10, function (x, y) { var b = Math.floor((x + y) / 3) % 2; return x + y < 26 ? (b ? '7' : '6') : (b ? '6' : '5'); });
    c.S(function (x, y) { var d = Math.hypot(x + 0.5 - 15, y + 0.5 - 16); return d <= 10 && d > 3 && Math.floor((x - y + 40) / 4) % 3 === 0 && y > 12 ? '4' : null; });
    c.L(23, 22, 27, 26, '6').L(27, 26, 30, 24, '6').dot(31, 23, '5');
  }],
  stamp: ['우표', function (c) {   /* 새가 그려진 우표 한 장 */
    c.S(function (x, y) { if (x < 6 || x > 25 || y < 4 || y > 27) return null; var e = x === 6 || x === 25 || y === 4 || y === 27; return e && (x + y) % 2 ? null : 'Z'; });
    c.R(9, 7, 14, 14, 'R').R(9, 7, 14, 4, 'Z');
    c.G(12, 10, ['...33...', '..3333F.', '.333333.', '3333333.', '.33333..', '..3.3...']).dot(16, 11, 'Z');
    c.R(10, 23, 5, 1, 'W').R(17, 23, 5, 2, 'J');
  }],
  matchbox: ['성냥갑', function (c) {   /* 반쯤 열린 성냥갑 */
    c.R(4, 13, 20, 11, 'J').R(4, 13, 20, 1, 'K').R(4, 23, 20, 1, 'I').R(8, 16, 12, 5, 'F').R(8, 16, 12, 1, 'Z');
    c.G(11, 17, ['.E.EE.E.', 'E.E..E.E', '.E.EE.E.']);
    c.R(22, 15, 7, 8, 'e').R(22, 15, 7, 1, 'f').R(28, 16, 1, 7, 'd');
    [[23, 9], [25, 8], [27, 10]].forEach(function (p) { c.L(p[0], p[1] + 2, p[0], 16, 'f'); c.R(p[0], p[1], 1, 2, 'I'); });
  }],
  key: ['열쇠', function (c) {   /* 낡은 쇠 열쇠 */
    c.ring(10, 11, 6, 2.4, function (x, y) { return x + y < 20 ? 'X' : 'W'; });
    for (var i = 0; i < 13; i++) c.R(13 + i, 14 + i, 2, 2, i % 4 === 0 ? 'X' : 'W').dot(14 + i, 15 + i, 'V');
    c.R(21, 26, 3, 2, 'W').R(24, 23, 3, 2, 'W').D([[7, 8]], 'Z').D([[18, 12], [22, 16]], 'C');   /* 녹 점 */
  }],
  pinecone: ['솔방울', function (c) {   /* 작은 솔방울 + 솔잎 */
    c.S(function (x, y) { var dx = (x + 0.5 - 15) / 7.5, dy = (y + 0.5 - 18) / 10; if (dx * dx + dy * dy > 1) return null; var row = Math.floor((y - 8) / 3), ox = row % 2 ? 2 : 0, lx = ((x + ox) % 4 + 4) % 4, ly = (y - 8) % 3; return ly === 2 || lx === 3 ? 'a' : ly === 0 && lx === 1 ? 'e' : x < 14 ? 'c' : 'b'; });
    c.R(14, 5, 2, 4, 'a').L(22, 6, 29, 14, 't').L(23, 5, 30, 10, 'u').L(21, 8, 26, 17, 's');
  }],
  paper_boat: ['종이배', function (c) {
    c.S(function (x, y) { return y >= 18 && y <= 25 && x >= 3 + (y - 18) && x <= 28 - (y - 18) ? (x < 16 ? 'Z' : 'Y') : null; });
    c.S(function (x, y) { return y >= 6 && y <= 18 && Math.abs(x + 0.5 - 16) <= (y - 5) * 0.62 ? (x < 16 ? 'Z' : 'f') : null; });
    c.L(16, 6, 16, 18, 'X').R(3, 18, 26, 1, 'X');
    c.S(function (x, y) { return y >= 27 && y <= 28 && x > 1 && x < 30 && (x + y * 2) % 5 < 3 ? (y === 27 ? '7' : '6') : null; });
  }],
  bell: ['작은 종', function (c) {   /* 방울 */
    c.ring(16, 6, 3, 1.2, 'D');
    c.disc(16, 18, 9.5, function (x, y) { return x + y < 28 ? 'F' : x + y > 40 ? 'D' : 'E'; });
    c.R(8, 18, 16, 1, 'C').R(15, 19, 2, 6, 'B').disc(16, 25, 1.6, 'B').D([[10, 12], [11, 11]], 'Z');
  }],
  map_piece: ['지도 조각', function (c) {   /* 찢어진 지도 한 조각 */
    c.S(function (x, y) { if (x < 4 || x > 27 || y < 5 || y > 26) return null; var jag = (x * 7 + y * 3) % 5; if (x > 25 - (jag % 3) || y > 24 - ((x * 3) % 4 > 2 ? 1 : 0) + (x % 2)) return null; return x === 4 || y === 5 ? 'Z' : 'f'; });
    c.L(7, 21, 11, 16, 'c').L(13, 14, 17, 12, 'c').L(19, 11, 21, 9, 'c');   /* 점선 길 */
    c.G(20, 6, ['J.J', '.J.', 'J.J']);
    c.S(function (x, y) { return y >= 18 && y <= 22 && x >= 14 && x <= 22 && c.get(x, y) === 'f' && y >= 22 - (4 - Math.abs(x - 18)) ? 'u' : null; });
    c.R(6, 8, 6, 1, '5').R(6, 10, 4, 1, '5');
  }],
  chalk: ['분필', function (c) {   /* 쓰다 남은 분필 토막 + 가루 */
    for (var j = 0; j < 14; j++) c.R(8 + j, 20 - j, 6, 1, j % 2 ? 'Y' : 'Z');
    c.R(8, 21, 6, 2, 'X').R(21, 6, 6, 1, 'Y').R(22, 5, 5, 1, 'Z');
    c.D([[5, 26], [8, 27], [11, 25], [14, 27], [4, 23], [17, 26]], 'Y').D([[7, 25], [12, 27]], 'Z');
  }],
  stained_glass: ['색유리', function (c) {   /* 납선으로 이은 색유리 조각 */
    c.S(function (x, y) { var dx = Math.abs(x + 0.5 - 16), dy = y - 4; if (dy < 0 || dy > 24) return null; var half = dy < 12 ? dy * 0.9 + 1 : (24 - dy) * 0.9 + 1; if (dx > half) return null; var lead = Math.abs(x - 16) < 1 || Math.abs(y - 16) < 1 || Math.abs((x - 16) - (y - 16)) < 1 || dx > half - 1; if (lead) return 'U'; var q = (x < 16 ? 0 : 1) + (y < 16 ? 0 : 2) + ((x - 16) > (y - 16) ? 4 : 0); return ['J', 'F', '5', 'u', 'P', 'L', '7', 'Q'][q]; });
    c.D([[13, 9], [12, 10]], 'Z').spark(26, 7, 'F');
  }]
};
