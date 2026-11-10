/* 집에 있던 날 쪽지 — 집 활동 8개 (js/world.js homeActivities 의 id). 문어가 그 활동을 하는 모습 (둘째 판) */
'use strict';
var L = require('./lib.js'), K = L.K, sd = L.sd, bez = L.bez, mat = L.mat;
function windowAt(S, cx, cy, hw, hh, night) {   /* 창: 유리 → 창살 → 틀 → 턱 */
  S.flat(sd.box(cx, cy, hw, hh, 0), night ? '2' : '5').flat(sd.box(cx, cy - hh / 2, hw, hh / 2, 0), night ? '3' : '6');
  return function frame() {
    S.solid(sd.box(cx, cy, 0.7, hh, 0), 0.6, 'wood').solid(sd.box(cx, cy, hw, 0.7, 0), 0.6, 'wood');
    S.solid(sd.sub(sd.box(cx, cy, hw + 1.8, hh + 1.8, 0.8), sd.box(cx, cy, hw, hh, 0.2)), 1.1, 'wood');
    S.solid(sd.box(cx, cy + hh + 2.3, hw + 2.8, 1.1, 0.4), 0.8, 'wood');
  };
}
function Z(S, x, y, s, k) { S.stroke([[x, y], [x + s, y], [x, y + s], [x + s, y + s]], Math.max(1, s * 0.27), k, { ol: '3' }); }
module.exports = {
  count_rain: ['빗방울 세기', function (S) {   /* 창가에서 빗방울 세다 잠듦 */
    var frame = windowAt(S, 21.5, 9.6, 8, 8, true);
    [[16.5, 4.5], [20.5, 8.5], [25.5, 5.5], [27.5, 11.5], [17.5, 12.5], [23.5, 14.5]].forEach(function (p) { S.stroke([[p[0], p[1]], [p[0] - 0.9, p[1] + 2.4]], 1, '6'); });
    frame();
    L.oct(S, { x: -5.5, y: 2.4, s: 0.8, eyes: 'closed', mouth: 'o' });
  }],
  nap: ['낮잠', function (S) {   /* 담요 속 낮잠 */
    L.oct(S, { x: -2.5, y: -1.5, legs: false, eyes: 'closed', mouth: 'smile' });
    var top = function (u) { return 20.8 + 0.8 * Math.sin(u / 2.6); };
    S.solid(function (u, v) { return Math.max(top(u) - v, v - 29.8, 1.8 - u, u - 30.2); }, 2.4, L.patch(1.8, 20), { tone: L.seam(1.8, 20) });
    Z(S, 24.5, 2.5, 4, '5'); Z(S, 28.5, 8.5, 2, '6');
  }],
  window_watch: ['창밖 보기', function (S) {   /* 창밖을 그냥 봄 (뒷모습) */
    var frame = windowAt(S, 16, 9.6, 10.4, 8, false);
    L.cloud(S, [[10, 6.6, 2.6, 1.6], [12.6, 5.8, 2.2, 1.6]], mat('cloud', { ol: '5' })); L.cloud(S, [[21.6, 12.4, 2.8, 1.6], [23.6, 11.6, 2, 1.5]], mat('cloud', { ol: '5' }));
    frame();
    L.oct(S, { y: 1.7, s: 0.85, eyes: 'none', mouth: 'none', blush: false });
  }],
  moss: ['이끼 화분', function (S) {   /* 이끼 화분을 오래 들여다봄 */
    var POT = mat('amber', { ramp: ['E', 'D', 'C', 'B', 'B'], ol: 'A' });
    S.lathe(25, 21.8, 28.8, function (v) { return 4.6 - (v - 21.8) * 0.25; }, POT);
    [[22.6, 19.6, 2.8, 2.2], [27.4, 19.8, 2.8, 2.1], [25, 18.2, 3.6, 2.8]].forEach(function (b) { S.ball(b[0], b[1], b[2], b[3], 'green', { shadow: false, flat: 0.2 }); });
    S.solid(sd.box(25, 21.6, 5.3, 0.9, 0.4), 0.8, POT);
    L.oct(S, { x: -6, y: 2.4, s: 0.8, look: 0.6 });
    S.spark(28.5, 11.5, 1.6, 'F');
  }],
  reread_poster: ['포스터 다시 읽기', function (S) {   /* 포스터 뒷면을 다시 읽음 */
    L.oct(S, { x: -6, y: 2.4, s: 0.8, look: 0.6 });
    S.solid(sd.path(bez([15, 21], [17.5, 20.8], [19.2, 19], 5), 1.3, 1), 1.3, 'red');
    S.solid(sd.box(24, 15.6, 6.2, 8.4, 0.5), 0.9, 'paper');
    [11.5, 14.5, 17.5, 20.5].forEach(function (y, i) { S.stroke([[20.5, y], [i % 2 ? 26 : 27.5, y]], 1, 'd'); });
    S.flat(sd.box(24, 7.5, 2, 1, 0), 'Z', { ol: 'X' });
  }],
  rearrange: ['포스터 자리 바꾸기', function (S) {   /* 벽 포스터 자리를 한 칸 바꿈 */
    S.solid(sd.box(6.5, 8.5, 4.4, 5.6, 0.4), 0.8, 'paper'); S.flat(sd.box(6.5, 6.5, 3, 2, 0), '6');
    [[12.5, 3.5], [15.5, 3.5], [18.5, 3.5], [12.5, 13.5], [15.5, 13.5], [18.5, 13.5], [11.5, 6.5], [11.5, 10.5], [20.5, 6.5], [20.5, 10.5]].forEach(function (p) { S.flat(sd.box(p[0], p[1], 0.5, 0.5, 0), 'c', { outline: false }); });   /* 빈 자리 (점선) */
    S.rotate(25.5, 11, 12, function () { S.solid(sd.box(25.5, 10.5, 4.4, 5.6, 0.4), 0.8, 'paper'); S.flat(sd.box(25.5, 8.5, 3, 2, 0), 'Q'); });
    L.oct(S, { x: -1, y: 2.7, s: 0.78, eyes: 'happy' });
    S.solid(sd.path(bez([21, 21.5], [26.5, 21], [26.4, 17.6], 6), 1.4, 1), 1.4, 'red');
  }],
  hum: ['흥얼거리기', function (S) {
    L.oct(S, { x: -3.5, y: 1.7, s: 0.85, eyes: 'happy', mouth: 'o' });
    L.note(S, 23.5, 9.5, 'navy', 0.85); L.note(S, 27.5, 17, 'navy', 0.7);
  }],
  nothing: ['…', function (S) {   /* 아무것도 안 한 날 — 그냥 앉아 있음 */
    L.oct(S, { y: 1.7, s: 0.85, mouth: 'flat' });
    [10.5, 16, 21.5].forEach(function (x) { S.solid(sd.box(x, 3.5, 1.5, 1.5, 0.5), 1, 'stone'); });
  }]
};
