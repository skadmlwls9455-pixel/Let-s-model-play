/* tools/ui-art/badges.js — 배지 그림 (docs/ACHIEVEMENTS.md §6.2 · §9.1 v0-2).
 * 배지 24×24 (×2 = 48px 로 쓴다). 테 모양 = 무리: 놀이·내 일 = 둥근 메달 + 리본 두 갈래 · 우리 둘 = 깃발 · 문어 기록 = 물방울 (색만으로 나누지 않는다).
 * 테 색 = 등급: 동 · 은 · 금 금속색, 숨김(문어 기록)은 청록. 가운데 무늬는 9×9 안팎.
 * 그 밖: 등급 리본 16×16 넷 · 조개 동전 8×8 · 16×16 (금빛 동전 테 안에 조개 무늬 — 기념품 조개껍데기 그림과 다르다) · 배지 소품 24×24 둘 (배웅 종 · 조약돌 병).
 * 붓은 poster/kit.js (32×32 캔버스의 왼쪽 위만 쓰고 잘라 낸다). */
'use strict';
var METAL = { bronze: { hi: 'E', mid: 'D', lo: 'C', dk: 'B' }, silver: { hi: 'Z', mid: 'Y', lo: 'X', dk: 'W' }, gold: { hi: 'Z', mid: 'F', lo: 'E', dk: 'D' }, hidden: { hi: '7', mid: '6', lo: '5', dk: '4' } };
function frame(c, shape, tier) {
  var m = METAL[tier];
  if (shape === 'medal') {
    /* 리본 두 갈래 (메달 뒤) */
    c.G(6, 14, ['JJJ...KKK', 'JJJ...KKK', 'JJJ...KKK', 'JKJ...KLK', 'JKJ...KLK', 'JJJ...KKK', 'J.J...K.K']);
    c.disc(12, 10, 9, function (x, y) { return x + y < 17 ? m.hi : x + y > 27 ? m.lo : m.mid; });
    c.ring(12, 10, 9, 1, function (x, y) { return x + y > 24 ? m.dk : null; });
    c.disc(12, 10, 6.4, function (x, y) { return x + y < 20 ? '3' : '2'; });
  } else if (shape === 'flag') {
    c.R(2, 1, 2, 22, 'c').R(3, 1, 1, 22, 'b').dot(2, 1, 'd');                    /* 깃대 */
    c.S(function (x, y) { if (x < 4 || x > 21 || y < 2 || y > 16) return null; if (x > 17 && Math.abs(y - 9) < (x - 17)) return null; var edge = x === 4 || y === 2 || y === 16 || (x > 16 && Math.abs(y - 9) === (x - 17)) || x === 21; return edge ? (y > 12 ? m.lo : m.mid) : y === 3 ? m.hi : y === 15 ? m.lo : 'f'; });
    c.S(function (x, y) { return x >= 5 && x <= 17 && y >= 4 && y <= 14 ? (y === 4 ? 'Z' : 'f') : null; });
  } else {   /* drop */
    c.S(function (x, y) { var dx = x + 0.5 - 12, dy = y + 0.5 - 14, d = Math.hypot(dx, dy), tip = y < 12 && Math.abs(dx) <= (y - 1) * 0.62; if (!(d <= 8.5 || tip) || y < 1) return null; var inner = Math.hypot(dx, dy) <= 6.3 || (y < 12 && y > 5 && Math.abs(dx) <= (y - 4) * 0.5); return inner ? (x + y < 24 ? '3' : '2') : (x + y < 20 ? m.hi : x + y > 30 ? m.lo : m.mid); });
    c.dot(8, 10, 'Z');
  }
}
/* 가운데 무늬: g(c, ox, oy) — 메달 = (8,6) 기준 9×9 · 깃발 = (6,5) 기준 11×9 · 물방울 = (8,10) 기준 9×9 */
var MOTIF = {
  hello: function (c, x, y) { c.G(x + 1, y, ['.KKKKK.', 'LKKKKKJ', 'K0KK0KJ', 'KKKKKKJ', 'KRKHKRJ', '.KKKKJ.', 'K.K.K.J']); c.G(x + 8, y + 1, ['.F', 'F.', '.F']); },   /* 문어 얼굴 + 인사 */
  send_off: function (c, x, y) { c.G(x + 2, y, ['..EE..', '.FEED.', '.FEED.', 'FEEEED', 'FEEEED', 'DDDDDD', '..CC..']); c.G(x - 1, y + 2, ['F', '.', 'F']).G(x + 9, y + 2, ['F', '.', 'F']); },   /* 배웅 종 */
  days_7: function (c, x, y) { [[1, 1, 'X'], [4, 0, '6'], [7, 1, 'Y'], [0, 4, 'R'], [3, 4, 'W'], [6, 4, 'v'], [9, 4, 'E']].forEach(function (p) { c.R(x + p[0], y + p[1] + 1, 2, 2, p[2]); c.dot(x + p[0], y + p[1] + 1, 'Z'); }); },   /* 조약돌 일곱 */
  runner_first: function (c, x, y) { c.G(x, y + 3, ['EEEEEE', 'EDDDDC', 'EDCCDC', 'EDDDDC', 'CCCCCC']); c.G(x + 5, y, ['.F.F', '..F.', '.F.F']); c.dot(x + 6, y + 1, 'Z'); },   /* 상자 + 콩 별 */
  runner_30: function (c, x, y) { c.G(x, y + 1, ['...KKK...', '..KKKKK..', '.JKKKKKJ.', 'JJJJJJJJJ', '.eeeeeee.', '.eFFeeee.', '.eFFeebe.', '.eeeeebe.']); },   /* 다락 지붕 집 (단골) */
  my_look: function (c, x, y) { c.G(x + 2, y, ['.eee.', '.eee.', '.eee.', '55555', '55555', '.555.', '.3.3.', '.3.3.']); },   /* 내 모습 (종이 인형) */
  place_first: function (c, x, y) { c.G(x + 1, y, ['..v.v..', '.vuvuv.', '.uvuvu.', '..utu..', '.ccccc.', '.cbbbc.', '..bbb..']); },   /* 화분 놓기 */
  place_10: function (c, x, y) { c.G(x, y + 1, ['c......', 'c......', 'cddddd.', 'cccccc.', 'c....c.', 'c....c.']); c.G(x + 6, y, ['.v.', 'vuv', '.c.']); c.G(x + 6, y + 5, ['FF', 'FF']); },   /* 의자 + 화분 + 상자 */
  first_10: function (c, x, y) { c.G(x, y + 4, ['.77.', '7777', '.77.']); c.G(x + 5, y, ['.77.', '7777', '.77.']); c.D([[x, y + 3], [x + 3, y + 3], [x + 5, y - 1], [x + 8, y - 1]], '6'); c.D([[x + 2, y + 8], [x + 7, y + 4]], '6'); },   /* 발자국 */
  stay_home: function (c, x, y) { c.G(x, y + 1, ['....7....', '...777...', '..77777..', '.7777777.', '.6666666.', '.66FF666.', '.66FF666.']); },   /* 집 */
  still_day: function (c, x, y) { c.R(x, y + 3, 2, 2, '7').R(x + 3, y + 3, 2, 2, '7').R(x + 6, y + 3, 2, 2, '7'); c.dot(x, y + 3, 'Z').dot(x + 3, y + 3, 'Z').dot(x + 6, y + 3, 'Z'); },   /* … */
  eight_ways: function (c, x, y) { var cx = x + 4, cy = y + 4; [[0, -4], [3, -3], [4, 0], [3, 3], [0, 4], [-3, 3], [-4, 0], [-3, -3]].forEach(function (d) { c.L(cx, cy, cx + d[0], cy + d[1], '7'); }); c.disc(cx + 0.5, cy + 0.5, 1.6, 'Z'); }   /* 여덟 갈래 */
};
var BADGES = [   /* id · # · 이름 · 무리 테 · 등급 */
  ['hello', 1, '안녕, ○○', 'flag', 'bronze'], ['send_off', 2, '잘 다녀와', 'flag', 'bronze'], ['days_7', 5, '일곱 날 친구', 'flag', 'silver'],
  ['runner_first', 23, '상자에 콩!', 'medal', 'bronze'], ['runner_30', 24, '다락 단골', 'medal', 'silver'],
  ['my_look', 26, '내 모습', 'medal', 'bronze'], ['place_first', 27, '여기 어때?', 'medal', 'bronze'], ['place_10', 28, '내 손으로', 'medal', 'silver'],
  ['first_10', 32, '처음 가 본 곳 10곳', 'drop', 'hidden'], ['stay_home', 33, '오늘은 집', 'drop', 'hidden'], ['still_day', 34, '가만히 있던 날', 'drop', 'hidden'], ['eight_ways', 35, '여덟 갈래', 'drop', 'hidden']
];
var ORIGIN = { medal: [8, 6], flag: [6, 5], drop: [8, 10] };
function badge(b) { return function (c) { frame(c, b[3], b[4]); var o = ORIGIN[b[3]]; MOTIF[b[0]](c, o[0], o[1]); }; }

function ribbon(tier) { var m = METAL[tier]; return function (c) {   /* 등급 리본 16×16: 작은 메달 + 리본 */
  c.G(4, 8, ['JJ...KK', 'JJ...KK', 'JK...LK', 'JJ...KK', 'J.....K']);
  c.disc(7.5, 6, 5.5, function (x, y) { return x + y > 15 ? m.lo : m.mid; }).ring(7.5, 6, 5.5, 1, function (x, y) { return x + y > 15 ? m.dk : null; });
  c.ring(7.5, 6, 3.2, 1, m.lo).D([[5, 3], [6, 2]], tier === 'gold' ? 'Z' : m.hi);
}; }
function coin16(c) {   /* 금빛 조개 동전 16×16: 동전 테 + 가운데 부채꼴 조개 (세로 골) */
  c.disc(7.5, 7.5, 6.8, function (x, y) { return x + y > 19 ? 'D' : 'E'; }).ring(7.5, 7.5, 6.8, 1, function (x, y) { return x + y > 17 ? 'C' : 'F'; });
  c.G(4, 4, ['..CCC..', '.CFFFC.', 'CFCFCFC', 'CFCFCFC', 'CFCFCFC', '.CCCCC.', '..CBC..']);
  c.D([[3, 3], [4, 2]], 'Z');
}
function coin8(c) { c.G(1, 0, ['.EEEE.', 'EFFFFD', 'EFDFDD', 'EFDFDD', 'EEFFDD', 'EDDDDD', '.DDDD.']); c.dot(2, 1, 'Z'); }   /* 8×8 (글줄 안 16px 로) */
var PROPS = {
  bell: ['배웅 종 (문가 벽걸이 — 소리 안 나는 장식)', function (c) {
    c.R(5, 2, 14, 2, 'c').R(5, 3, 14, 1, 'b').R(11, 4, 2, 3, 'W').ring(12, 8, 2.2, 1, 'X');
    c.S(function (x, y) { if (y < 9 || y > 18) return null; var w = y < 12 ? 2.5 + (y - 9) : y < 17 ? 5.2 : 6.5; return Math.abs(x + 0.5 - 12) <= w ? (x < 10 ? 'F' : x > 14 ? 'D' : 'E') : null; });
    c.disc(12, 20.5, 1.5, 'C').R(9, 10, 1, 6, 'Z');
  }],
  pebble_jar: ['조약돌 병 (함께한 날마다 조약돌 하나)', function (c) {
    c.R(8, 2, 8, 2, 'c').R(8, 3, 8, 1, 'b');
    c.S(function (x, y) { var w = y < 7 ? 3.5 : y < 9 ? 3.5 + (y - 6) * 1.6 : 7.5; return y >= 4 && y <= 21 && Math.abs(x + 0.5 - 12) <= w ? (x < 7 ? '7' : x > 17 || y > 20 ? '5' : '6') : null; });
    [[6, 18, 'X'], [9, 19, 'R'], [12, 18, 'Y'], [15, 19, 'v'], [7, 15, 'E'], [10, 16, 'W'], [13, 15, '4'], [16, 16, 'Y'], [9, 13, 'X']].forEach(function (p) { c.R(p[0], p[1], 2, 2, p[2]); c.dot(p[0], p[1], 'Z'); });
    c.R(6, 9, 1, 8, 'Z');
  }]
};
module.exports = { BADGES: BADGES, badge: badge, ribbon: ribbon, TIERS: ['bronze', 'silver', 'gold', 'hidden'], coin16: coin16, coin8: coin8, PROPS: PROPS };
