/* 집에 있던 날 쪽지 — 집 활동 8개 (js/world.js homeActivities 의 id). 문어가 그 활동을 하는 모습 */
'use strict';
var SK = require('../sticker-kit.js');
function oct(c, ox, oy, f, o) { o = o || {}; SK.head(c, ox, oy, o.sq || 0); if (o.legs !== false) SK.legs(c, ox, oy, 'down'); if (f) SK.face(c, ox, oy, f); }
function note(c, x, y, k) { c.R(x, y + 5, 3, 2, k).dot(x + 1, y + 7, k).R(x + 2, y, 1, 6, k).R(x + 3, y, 2, 1, k).dot(x + 4, y + 1, k); }
function windowFrame(c, x, y, w, h, night) {
  c.R(x, y, w, h, 'c').R(x, y, w, 1, 'd').R(x + 2, y + 2, w - 4, h - 4, night ? '2' : '4').R(x + 2, y + 2, w - 4, Math.floor((h - 4) / 2), night ? '3' : '5');
  c.R(x + Math.floor(w / 2) - 1, y + 2, 1, h - 4, 'c').R(x + 2, y + Math.floor(h / 2), w - 4, 1, 'c');
}
module.exports = {
  count_rain: ['빗방울 세기', function (c) {   /* 창가에서 빗방울 세다 잠듦 */
    windowFrame(c, 12, 1, 19, 20, true);
    [[16, 5], [20, 8], [25, 5], [27, 11], [17, 13], [22, 15]].forEach(function (p) { c.L(p[0], p[1], p[0] - 1, p[1] + 2, '6'); });
    c.R(10, 21, 22, 2, 'd').R(10, 22, 22, 1, 'b');
    oct(c, -6, 6, { eyes: 'closed', mouth: 'o', ey: 19 });
    c.G(22, 23, ['7.7.7', '.....', '7.7..']);   /* 세던 점들 */
  }],
  nap: ['낮잠', function (c) {   /* 담요 속 낮잠 */
    oct(c, -3, 0, { eyes: 'closed', mouth: 'w', ey: 18 }, { legs: false });
    c.S(function (x, y) { var top = 21 + Math.round(Math.sin(x / 3) * 1); if (y < top || y > 29 || x < 1 || x > 30) return null; var k = (Math.floor(x / 4) + Math.floor((y - 21) / 3)) % 3; return y === top ? 'f' : k === 0 ? 'K' : k === 1 ? '5' : 'E'; });
    c.R(1, 29, 30, 1, 'a');
    c.G(22, 4, ['5555', '..5.', '.5..', '5555']).G(27, 10, ['666', '.6.', '666']);
  }],
  window_watch: ['창밖 보기', function (c) {   /* 창밖을 그냥 봄 (뒷모습) */
    windowFrame(c, 5, 1, 22, 19, false);
    c.B(11, 6, 3, 1.6, ['Z', 'Z', 'Z', 'Y', 'Y']).B(21, 12, 3.5, 1.8, ['Z', 'Z', 'Z', 'Y', 'Y']);
    c.R(3, 20, 26, 2, 'd').R(3, 21, 26, 1, 'b');
    oct(c, 0, 7, null);   /* 얼굴 없이 = 뒷모습 */
    c.D([[9, 21], [10, 20]], 'F');
  }],
  moss: ['이끼 화분', function (c) {   /* 이끼 화분을 오래 들여다봄 */
    oct(c, -6, 4, { eyes: 'big', mouth: 'none', ex: 2 });
    c.S(function (x, y) { return y >= 21 && y <= 28 && Math.abs(x + 0.5 - 25) <= 5 - (y - 21) * 0.3 ? (y === 21 ? 'd' : x < 24 ? 'c' : 'b') : null; });
    c.B(25, 18.5, 5.5, 3.5, ['w', 'v', 'u', 't', 's']).D([[22, 17], [25, 16], [27, 18]], 'w');
    c.R(18, 29, 14, 1, 'a').spark(29, 11, 'F');
  }],
  reread_poster: ['포스터 다시 읽기', function (c) {   /* 포스터 뒷면을 다시 읽음 */
    oct(c, -5, 4, { eyes: 'dot', mouth: 'smile', ex: 2 });
    c.R(18, 8, 12, 16, 'f').R(18, 8, 12, 1, 'Z').R(29, 9, 1, 15, 'e').R(18, 23, 12, 1, 'e');
    [11, 14, 17, 20].forEach(function (y, i) { c.R(20, y, i % 2 ? 6 : 8, 1, 'd'); });
    c.R(22, 6, 4, 3, 'Z');   /* 테이프 */
    SK.tentacleArm(c, [[16, 20], [17, 18]]);
  }],
  rearrange: ['포스터 자리 바꾸기', function (c) {   /* 벽 포스터 자리를 한 칸 바꿈 */
    c.R(2, 3, 9, 12, 'f').R(2, 3, 9, 4, '6').R(2, 14, 9, 1, 'e');
    c.S(function (x, y) { return x >= 13 && x <= 21 && y >= 3 && y <= 14 && (x === 13 || x === 21 || y === 3 || y === 14) && (x + y) % 2 ? 'd' : null; });   /* 빈 자리 (점선) */
    c.R(21, 6, 9, 12, 'f').R(21, 6, 9, 4, 'Q').R(21, 17, 9, 1, 'e');
    c.G(14, 7, ['..1..', '.1...', '11111', '.1...', '..1..']);   /* 옮기는 방향 */
    oct(c, 3, 9, { eyes: 'happy', mouth: 'smile' });
    SK.tentacleArm(c, [[26, 30], [27, 27], [27, 24], [26, 21], [26, 19]]);
  }],
  hum: ['흥얼거리기', function (c) {
    oct(c, -3, 4, { eyes: 'happy', mouth: 'o' });
    note(c, 22, 3, '3'); note(c, 26, 12, '4');
    c.D([[20, 14], [21, 12]], '5').spark(4, 6, 'F');
  }],
  nothing: ['…', function (c) {   /* 아무것도 안 한 날 — 그냥 앉아 있음 */
    oct(c, 0, 5, { eyes: 'dot', mouth: 'flat' });
    c.R(10, 4, 3, 3, 'W').R(15, 4, 3, 3, 'W').R(20, 4, 3, 3, 'W');
  }]
};
