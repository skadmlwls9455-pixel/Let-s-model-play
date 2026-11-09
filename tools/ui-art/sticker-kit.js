/* tools/ui-art/sticker-kit.js — 반응 스티커 그림 붓 (요리·달리기·헤엄 세트가 같이 쓴다).
 *
 * 32×32 한 장. 작은 붓(타원·사각·점)으로 몸통·머리 쓰개·얼굴·소품을 겹쳐 그린다.
 * 색은 sprites.js 의 Apollo KEY 글자만. 외곽선은 tools/make-stickers.js 가 장면 규칙(이웃 L×0.62 → 스냅)으로 두른다.
 * 빛은 위·왼쪽에서. 스티커는 그림일 뿐 글자를 넣지 않는다.
 */
'use strict';

var W = 32, H = 32;

function Canvas() { this.c = new Array(W * H).fill(null); }
Canvas.prototype.px = function (x, y, k) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return; this.c[y * W + x] = k; };
Canvas.prototype.get = function (x, y) { if (x < 0 || y < 0 || x >= W || y >= H) return null; return this.c[y * W + x]; };
Canvas.prototype.rect = function (x, y, w, h, k) { for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) this.px(x + i, y + j, k); };
Canvas.prototype.dots = function (list, k) { var s = this; list.forEach(function (p) { s.px(p[0], p[1], k); }); };
/* 채운 타원 + 위왼쪽 빛 그늘: tones = [하이라이트, 밝음, 기본, 그늘, 깊은 그늘] */
Canvas.prototype.blob = function (cx, cy, rx, ry, tones) {
  for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    var dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d = dx * dx + dy * dy;
    if (d > 1) continue;
    var l = -(dx * 0.6 + dy * 0.8);            /* 빛 방향 (위·왼쪽) 쪽이 + */
    var k = l > 0.55 && d < 0.55 ? tones[0] : l > 0.2 ? tones[1] : l > -0.35 ? tones[2] : (d > 0.7 ? tones[4] : tones[3]);
    this.px(x, y, k);
  }
};

/* ───── 색 이름 (Apollo KEY 글자) ───── */
var BODY = ['L', 'K', 'K', 'J', 'I'];      /* 문어 몸 */
var HAT = ['Z', 'Z', 'Z', 'Y', 'X'];       /* 요리사 모자 */
var INK = '0', SHINE = 'Z', BLUSH = 'R', MOUTH = 'G', TONGUE = 'Q', SUCKER = 'F';

/* ───── 몸통: 머리(둥근 몸) + 모자 + 다리 ─────
 * o: { dx, dy (전체 이동), legs: 'down'|'up'|'none', hatTilt: -1|0|1, squash }
 */
function hat(cv, ox, oy, tilt) {
  tilt = tilt || 0;
  /* 뭉게 윗부분 세 덩이 → 띠 */
  cv.blob(ox + 10.5 + tilt, oy + 6.5, 4.2, 3.6, HAT);
  cv.blob(ox + 21.5 + tilt, oy + 6.5, 4.2, 3.6, HAT);
  cv.blob(ox + 16 + tilt, oy + 4.8, 5.2, 4.4, HAT);
  cv.blob(ox + 16 + tilt * 0.5, oy + 8.5, 7, 2.6, HAT);
  /* 주름 두 줄 (그늘) */
  cv.dots([[ox + 13 + tilt, oy + 6], [ox + 13 + tilt, oy + 7], [ox + 19 + tilt, oy + 6], [ox + 19 + tilt, oy + 7]], 'Y');
  /* 띠 */
  for (var x = 9; x <= 23; x++) { cv.px(ox + x, oy + 10, 'Y'); cv.px(ox + x, oy + 11, x < 12 ? 'Y' : 'X'); }
  cv.px(ox + 9, oy + 10, 'X'); cv.px(ox + 23, oy + 10, 'X');
}
function head(cv, ox, oy, sq) {
  sq = sq || 0;
  cv.blob(ox + 16, oy + 17.5 + sq * 0.5, 9.5 + sq, 7.5 - sq * 0.6, BODY);
  /* 반질 하이라이트 (레퍼런스의 왼쪽 위 흰 점) */
  cv.px(ox + 9, oy + 14, 'F'); cv.px(ox + 10, oy + 13, 'F');
}
function legs(cv, ox, oy, mode) {
  if (mode === 'none') return;
  var xs = [8, 12, 16, 20, 24];
  xs.forEach(function (x, i) {
    var curl = i < 2 ? -1 : i > 2 ? 1 : 0, len = i === 2 ? 4 : 3;
    var top = oy + 23;
    for (var j = 0; j < len; j++) {
      var X = ox + x + (j === len - 1 ? curl : 0);
      cv.px(X, top + j, j === 0 ? 'K' : 'J'); cv.px(X + 1, top + j, j === len - 1 ? 'J' : 'K'); cv.px(X + 2, top + j, 'J');
    }
    cv.px(ox + x + 1 + (len > 3 ? 0 : curl), top + len - 1, SUCKER);
    cv.px(ox + x + 1, top + len - 1, i === 2 ? SUCKER : cv.get(ox + x + 1, top + len - 1));
  });
}

/* ───── 얼굴 ───── */
var EYES = {
  dot: function (cv, x, y) { cv.rect(x, y - 1, 2, 3, INK); cv.px(x, y - 1, SHINE); },
  big: function (cv, x, y) { cv.rect(x, y - 1, 2, 3, INK); cv.px(x, y - 1, SHINE); cv.px(x + 1, y + 1, '3'); },
  happy: function (cv, x, y) { cv.dots([[x - 1, y + 1], [x, y], [x + 1, y], [x + 2, y + 1]], INK); },          /* ^ */
  closed: function (cv, x, y) { cv.dots([[x - 1, y + 1], [x, y + 1], [x + 1, y + 1], [x + 2, y + 1]], INK); }, /* — */
  squint: function (cv, x, y, side) {                                                                       /* > < */
    if (side < 0) cv.dots([[x - 1, y - 1], [x, y], [x + 1, y + 1], [x, y + 2], [x - 1, y + 3]], INK);
    else cv.dots([[x + 2, y - 1], [x + 1, y], [x, y + 1], [x + 1, y + 2], [x + 2, y + 3]], INK);
  },
  wow: function (cv, x, y) { cv.rect(x - 1, y - 1, 4, 4, 'Z'); cv.rect(x - 1, y + 2, 4, 1, 'Y'); cv.rect(x, y, 2, 2, INK); },
  sparkle: function (cv, x, y) { cv.rect(x - 1, y - 1, 4, 4, INK); cv.px(x - 1, y - 1, SHINE); cv.px(x, y - 1, SHINE); cv.px(x - 1, y, SHINE); cv.px(x + 2, y + 2, '6'); cv.px(x + 1, y + 2, '5'); },
  heart: function (cv, x, y) { cv.dots([[x - 1, y], [x, y - 1], [x + 1, y], [x + 2, y - 1], [x + 3, y]], 'Q'); cv.dots([[x - 1, y + 1], [x, y], [x + 1, y + 1], [x + 2, y], [x + 3, y + 1]], 'P'); cv.dots([[x, y + 1], [x + 2, y + 1], [x + 1, y + 2], [x, y + 2]], 'P'); cv.dots([[x + 1, y + 2]], 'P'); },
  spiral: function (cv, x, y) { cv.dots([[x - 1, y - 1], [x, y - 1], [x + 1, y - 1], [x + 2, y], [x + 2, y + 1], [x + 1, y + 2], [x, y + 2], [x - 1, y + 1], [x, y], [x + 1, y]], INK); }
};
function face(cv, ox, oy, f) {
  var e = EYES[f.eyes || 'dot'], ey = oy + (f.ey || 18), ex = f.ex || 0;
  e(cv, ox + 11 + ex, ey, -1); e(cv, ox + 19 + ex, ey, 1);
  if (f.blush !== false) { cv.rect(ox + 8 + ex, oy + 20, 2, 1, BLUSH); cv.rect(ox + 22 + ex, oy + 20, 2, 1, BLUSH); }
  var mx = ox + 15 + ex, my = oy + 21;
  switch (f.mouth || 'smile') {
    case 'smile': cv.dots([[mx - 1, my], [mx, my + 1], [mx + 1, my + 1], [mx + 2, my]], MOUTH); break;
    case 'w': cv.dots([[mx - 1, my], [mx, my + 1], [mx + 1, my], [mx + 2, my + 1], [mx + 3, my]], MOUTH); break;
    case 'open': cv.rect(mx, my, 3, 2, MOUTH); cv.rect(mx, my + 1, 3, 1, TONGUE); cv.px(mx - 1, my, MOUTH); cv.px(mx + 3, my, MOUTH); break;
    case 'grin': cv.rect(mx - 1, my, 5, 2, MOUTH); cv.rect(mx - 1, my, 5, 1, 'Z'); break;
    case 'o': cv.rect(mx, my, 2, 2, MOUTH); break;
    case 'O': cv.rect(mx, my - 1, 3, 3, MOUTH); cv.px(mx + 1, my + 1, TONGUE); break;
    case 'wobble': cv.dots([[mx - 1, my + 1], [mx, my], [mx + 1, my + 1], [mx + 2, my], [mx + 3, my + 1]], MOUTH); break;
    case 'flat': cv.rect(mx, my + 1, 3, 1, MOUTH); break;
    case 'puff': break;  /* 볼 빵빵은 소품에서 */
    case 'none': break;
  }
}

/* ───── 소품 ───── */
function sparkle(cv, x, y, k) { k = k || 'F'; cv.dots([[x, y - 1], [x - 1, y], [x, y], [x + 1, y], [x, y + 1]], k); cv.px(x, y, 'Z'); }
function tinySpark(cv, x, y, k) { cv.px(x, y, k || 'F'); }
function heartIcon(cv, x, y, big) {
  var rows = big ? ['.QQ.QQ.', 'QRQQQQP', 'QQQQQQP', '.QQQQP.', '..QQP..', '...P...'] : ['QQ.QQ', 'QRQQP', '.QQP.', '..P..'];
  var map = { Q: 'Q', R: 'R', P: 'P' };
  rows.forEach(function (r, j) { for (var i = 0; i < r.length; i++) if (r[i] !== '.') cv.px(x + i, y + j, map[r[i]]); });
}
function star(cv, x, y) {
  var rows = ['...F...', '..FFE..', 'FFFFFEE', '.FFFEE.', '.FFEEE.', 'FE...ED'];
  rows.forEach(function (r, j) { for (var i = 0; i < r.length; i++) if (r[i] !== '.') cv.px(x + i, y + j, r[i]); });
  cv.px(x + 3, y + 1, 'Z');
}
function tentacleArm(cv, pts) { /* pts: [[x,y],...] 두께 2, 위·왼쪽 밝게 */
  pts.forEach(function (p) { cv.px(p[0], p[1], 'K'); cv.px(p[0] + 1, p[1], 'J'); cv.px(p[0], p[1] + 1, 'J'); });
}
function steam(cv, x, y) { cv.dots([[x, y], [x + 1, y - 1], [x, y - 2], [x - 1, y - 3], [x, y - 4]], 'Y'); }
function sweat(cv, x, y) { cv.dots([[x, y], [x - 1, y + 1], [x, y + 1], [x - 1, y + 2], [x, y + 2]], '6'); cv.px(x - 1, y + 1, '7'); }
function tear(cv, x, y, len) { for (var j = 0; j < len; j++) { cv.px(x, y + j, j % 2 ? '6' : '7'); } cv.px(x, y + len, '5'); }

/* 몸 색 바꾸기: 이미 그린 문어 몸(빨강 계열)만 다른 색으로. 쓰개(흰·회색)·소품은 그대로 */
function recolor(cv, map) { for (var i = 0; i < cv.c.length; i++) if (map[cv.c[i]]) cv.c[i] = map[cv.c[i]]; }

/* 세트마다 스티커 목록: var S = kit.set(); S.def(id, label, alt, draw, frames) */
function set() {
  var list = {};
  /* frames 가 있으면 움직이는 스티커: 칸 0 은 정지 그림과 같아야 한다 (모션 줄이기·그림 못 받을 때 그 칸만 보인다) */
  function def(id, label, alt, draw, frames) { list[id] = { id: id, label: label, alt: alt, draw: draw, frames: frames || null }; }
  return { list: list, def: def };
}

module.exports = {
  W: W, H: H, Canvas: Canvas, BODY: BODY, HAT: HAT, INK: INK, SHINE: SHINE, BLUSH: BLUSH, MOUTH: MOUTH, TONGUE: TONGUE, SUCKER: SUCKER,
  hat: hat, head: head, legs: legs, EYES: EYES, face: face,
  sparkle: sparkle, tinySpark: tinySpark, heartIcon: heartIcon, star: star, tentacleArm: tentacleArm, steam: steam, sweat: sweat, tear: tear,
  recolor: recolor, set: set
};
