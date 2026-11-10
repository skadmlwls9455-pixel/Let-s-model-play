/* 들판 — 방 1개 */
'use strict';
module.exports = {
  door_out: ['밖의 문', function (c) {   /* 들판에 살짝 열린 문, 틈으로 새는 빛 */
    c.R(8, 3, 16, 24, 'b').R(8, 3, 16, 1, 'c').R(10, 5, 12, 22, 'F').R(10, 5, 12, 6, 'Z');
    c.S(function (x, y) { return x >= 13 && x <= 21 && y >= 5 + Math.round((21 - x) * 0.25) && y <= 26 ? (x === 13 ? 'u' : x > 19 ? 's' : 't') : null; });
    c.R(15, 9, 4, 5, 's').R(15, 17, 4, 6, 's').dot(14, 16, 'F');
    c.S(function (x, y) { return y >= 27 && y <= 30 && Math.abs(x - 8) <= (y - 26) * 2 + 2 && x < 12 ? ((x + y) % 2 ? 'F' : null) : null; });
    c.S(function (x, y) { return y >= 26 && y <= 30 && (x < 8 || x > 23 || y > 27) && c.get(x, y) == null && (x * 5 + y * 3) % 4 < 3 ? (y < 28 ? 'v' : 'u') : null; });
    c.G(2, 23, ['.R.', 'RFR', '.R.', '.u.']).G(26, 22, ['.Z.', 'ZFZ', '.Z.', '.u.', '.u.']);
  }]
};
