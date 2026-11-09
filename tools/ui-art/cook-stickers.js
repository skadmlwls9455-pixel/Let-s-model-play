/* tools/ui-art/cook-stickers.js — 요리할 때 뜨는 반응 스티커 (요리사 모자 쓴 문어) 픽셀 그림.
 *
 * 32×32 한 장씩. 손으로 한 칸씩 찍는 대신 작은 붓(타원·사각·점)으로 몸통·모자·얼굴·소품을 겹쳐 그린다.
 * 색은 sprites.js 의 Apollo KEY 글자만 쓴다. 외곽선은 make-cook-stickers.js 가 장면 규칙(이웃 L×0.62 → 스냅)으로 두른다.
 * 빛은 위·왼쪽에서 (밝은 칸이 왼쪽 위).
 *
 * 문어 스티커는 그림일 뿐 문어의 말이 아니다. 글자를 넣지 않는다 (맛 평가·취향 말 금지 — DELEGATION 카드 7).
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

/* ───── 스티커 목록 ───── */
var STICKERS = {};
function def(id, label, alt, draw) { STICKERS[id] = { id: id, label: label, alt: alt, draw: draw }; }

/* 1. 따봉 — 다리 하나를 들어 엄지 척 */
def('thumbs', '따봉', '요리사 모자 쓴 문어가 다리 하나로 엄지 척', function (cv) {
  var o = -4; hat(cv, o, 2); head(cv, o, 2); face(cv, o, 2, { eyes: 'happy', mouth: 'grin' }); legs(cv, o, 2, 'down');
  /* 오른쪽 다리가 위로 → 둥근 주먹 + 엄지 */
  tentacleArm(cv, [[20, 23], [22, 23], [23, 22], [24, 21]]);
  var f = ['..KK....', '..LK....', '..KK....', '..KJ....', '.LKKKKJ.', 'LKKKKKKJ', 'KKFKKKKJ', 'KKKKKKJJ', 'KFKKKKJ.', '.KJJJJ..'];
  f.forEach(function (r, j) { for (var i = 0; i < r.length; i++) if (r[i] !== '.') cv.px(22 + i, 10 + j, r[i]); });
  sparkle(cv, 30, 8); tinySpark(cv, 21, 8); tinySpark(cv, 30, 14, 'E');
});
/* 2. 감동 — 반짝 눈물 */
def('moved', '감동', '요리사 모자 쓴 문어가 반짝이는 눈으로 눈물을 흘림', function (cv) {
  hat(cv, 0, 1); head(cv, 0, 1); face(cv, 0, 1, { eyes: 'sparkle', mouth: 'wobble', ey: 18 });
  legs(cv, 0, 1, 'down');
  tear(cv, 10, 22, 6); tear(cv, 22, 22, 6); tear(cv, 11, 23, 3);
  tinySpark(cv, 4, 12, 'F'); sparkle(cv, 28, 14, 'F'); tinySpark(cv, 3, 20, '7');
});
/* 3. 하트 접시 — 접시에 하트 담아 내밀기 */
def('heart_plate', '한 접시', '요리사 모자 쓴 문어가 하트 얹은 접시를 내밂', function (cv) {
  var o = 2; hat(cv, o, 0); head(cv, o, 0); face(cv, o, 0, { eyes: 'happy', mouth: 'smile' });
  /* 쟁반 */
  cv.rect(1, 26, 18, 1, 'X'); cv.rect(2, 27, 16, 1, 'W'); cv.rect(1, 25, 18, 1, 'Z');
  heartIcon(cv, 5, 18, true);
  /* 쟁반 받친 다리 */
  cv.rect(15, 27, 3, 2, 'K'); cv.rect(8, 27, 3, 2, 'K'); cv.px(16, 28, SUCKER); cv.px(9, 28, SUCKER);
  legs(cv, o, 0, 'down');
  tinySpark(cv, 3, 15, 'R'); tinySpark(cv, 13, 15, 'R');
});
/* 4. 별 — 다 됐다! 별 들어 올리기 */
def('star', '다 됐다', '요리사 모자 쓴 문어가 별을 높이 듦', function (cv) {
  var o = -2; hat(cv, o, 3); head(cv, o, 3, 0); face(cv, o, 3, { eyes: 'happy', mouth: 'open' }); legs(cv, o, 3, 'down');
  tentacleArm(cv, [[22, 22], [24, 20], [25, 18], [25, 16], [25, 14], [25, 12]]);
  star(cv, 22, 4);
  sparkle(cv, 30, 3, 'Z'); tinySpark(cv, 20, 2, 'F'); tinySpark(cv, 30, 11, 'E');
});
/* 5. 깜짝 — 눈 휘둥그레 */
def('shock', '깜짝', '요리사 모자 쓴 문어가 눈을 휘둥그레 뜸', function (cv) {
  hat(cv, 0, 1, 1); head(cv, 0, 1); face(cv, 0, 1, { eyes: 'wow', mouth: 'O', blush: false });
  legs(cv, 0, 1, 'down');
  /* 놀람선 */
  cv.dots([[3, 6], [4, 7], [2, 10], [3, 10], [28, 6], [27, 7], [29, 10], [28, 10]], 'X');
});
/* 6. 맛보기 — 숟가락 */
def('taste', '맛보기', '요리사 모자 쓴 문어가 숟가락을 입에 댐', function (cv) {
  hat(cv, 0, 1); head(cv, 0, 1); face(cv, 0, 1, { eyes: 'closed', mouth: 'none' });
  legs(cv, 0, 1, 'down');
  /* 숟가락: 입에서 오른쪽 아래로 */
  cv.rect(15, 21, 3, 2, 'X'); cv.px(15, 21, 'Z'); cv.px(16, 21, 'Z');
  cv.dots([[18, 23], [19, 24], [20, 25], [21, 26], [22, 27]], 'W'); cv.dots([[19, 23], [20, 24], [21, 25], [22, 26], [23, 27]], 'X');
  tentacleArm(cv, [[23, 26]]);
  cv.dots([[24, 14], [25, 13], [26, 14]], 'F');   /* 생각 반짝 */
});
/* 7. 휘휘 — 냄비 젓기 (김) */
def('stir', '휘휘', '요리사 모자 쓴 문어가 냄비 뒤에서 국자로 저음', function (cv) {
  hat(cv, 0, -2); head(cv, 0, -2); face(cv, 0, -2, { eyes: 'dot', mouth: 'smile' });
  /* 냄비 (몸 아래 가림) */
  cv.rect(4, 21, 24, 2, 'V'); cv.rect(4, 21, 24, 1, 'X');
  cv.blob(16, 25.5, 11, 5, ['5', '4', '4', '3', '2']);
  cv.rect(5, 21, 22, 2, 'U'); cv.rect(5, 21, 22, 1, 'X');
  cv.rect(2, 24, 2, 2, '3'); cv.rect(28, 24, 2, 2, '3');
  /* 국자 */
  cv.dots([[26, 8], [26, 9], [25, 10], [25, 11], [24, 12], [24, 13], [23, 14], [23, 15], [22, 16], [22, 17], [21, 18], [21, 19], [20, 20], [20, 21]], 'Z');
  cv.dots([[27, 9], [26, 10], [26, 11], [25, 12], [25, 13], [24, 14], [24, 15], [23, 16], [23, 17], [22, 18], [22, 19], [21, 20]], 'X');
  tentacleArm(cv, [[23, 13], [24, 16]]);
  cv.rect(9, 21, 3, 1, 'K'); cv.rect(19, 21, 3, 1, 'K');
  steam(cv, 9, 20); steam(cv, 27, 18);
});
/* 8. 진땀 — 냄비가 가득 (실패 아님, 그냥 땀) */
def('sweat', '진땀', '요리사 모자 쓴 문어가 진땀을 흘리며 힘줌', function (cv) {
  hat(cv, 0, 1, -1); head(cv, 0, 1); face(cv, 0, 1, { eyes: 'squint', mouth: 'wobble', ey: 17 });
  legs(cv, 0, 1, 'down');
  sweat(cv, 26, 12); sweat(cv, 4, 15); sweat(cv, 28, 19);
});
/* 9. 만세 — 다리 둘을 번쩍 */
def('cheer', '만세', '요리사 모자 쓴 문어가 다리 둘을 번쩍 듦', function (cv) {
  hat(cv, 0, 4); head(cv, 0, 4); face(cv, 0, 4, { eyes: 'happy', mouth: 'open' });
  tentacleArm(cv, [[7, 22], [5, 20], [4, 18], [3, 16], [3, 14], [2, 12]]);
  tentacleArm(cv, [[24, 22], [26, 20], [27, 18], [28, 16], [28, 14], [29, 12]]);
  cv.px(2, 11, 'K'); cv.px(29, 11, 'K'); cv.px(3, 15, SUCKER); cv.px(28, 15, SUCKER);
  legs(cv, 0, 4, 'down');
  sparkle(cv, 7, 3); sparkle(cv, 26, 2, 'Z'); tinySpark(cv, 16, 1, 'E');
});
/* 10. 빼꼼 — 냄비 가장자리에서 */
def('peek', '빼꼼', '요리사 모자 쓴 문어가 냄비 가장자리 위로 빼꼼', function (cv) {
  hat(cv, 0, 4); head(cv, 0, 4); face(cv, 0, 4, { eyes: 'big', mouth: 'none', ey: 18 });
  cv.rect(1, 25, 30, 6, '4'); cv.rect(1, 25, 30, 2, 'X'); cv.rect(1, 27, 30, 1, '3'); cv.rect(1, 28, 4, 3, '5'); cv.rect(26, 28, 5, 3, '3');
  /* 가장자리 잡은 다리 끝 */
  cv.rect(8, 23, 3, 3, 'K'); cv.rect(21, 23, 3, 3, 'K'); cv.px(9, 24, SUCKER); cv.px(22, 24, SUCKER);
  cv.dots([[3, 21], [2, 19], [29, 20]], 'Y');
});
/* 11. 짝짝 — 박수 */
def('clap', '짝짝', '요리사 모자 쓴 문어가 다리로 박수', function (cv) {
  hat(cv, 0, 0); head(cv, 0, 0); face(cv, 0, 0, { eyes: 'happy', mouth: 'w' });
  legs(cv, 0, 0, 'down');
  tentacleArm(cv, [[9, 23], [11, 25], [13, 26]]); tentacleArm(cv, [[22, 23], [20, 25], [18, 26]]);
  cv.blob(15.5, 27, 3, 2.2, BODY);
  cv.dots([[12, 29], [11, 30]], 'F'); cv.dots([[19, 29], [20, 30]], 'F'); cv.dots([[15, 30], [16, 31]], 'F');
  cv.dots([[4, 24], [3, 23], [27, 24], [28, 23]], 'E');
});
/* 12. 냠 — 볼 빵빵 */
def('munch', '냠', '요리사 모자 쓴 문어가 볼 빵빵하게 오물오물', function (cv) {
  hat(cv, 0, 1); head(cv, 0, 1, 1); face(cv, 0, 1, { eyes: 'happy', mouth: 'puff', blush: false });
  cv.blob(9.5, 21.5, 3.2, 2.6, ['R', 'R', 'R', 'Q', 'Q']); cv.blob(22.5, 21.5, 3.2, 2.6, ['R', 'R', 'R', 'Q', 'Q']);
  cv.px(8, 20, 'Z'); cv.px(21, 20, 'Z');
  cv.dots([[15, 22], [16, 22], [17, 22]], MOUTH);
  legs(cv, 0, 1, 'down');
  cv.dots([[27, 26], [28, 25], [29, 26]], 'F'); cv.dots([[3, 26], [2, 25]], 'F');
});
/* 13. 꾸벅 — 오래 둘 때 (zzz) */
def('sleepy', '꾸벅', '요리사 모자 쓴 문어가 꾸벅 졺', function (cv) {
  hat(cv, -1, 2, -2); head(cv, 0, 2, 1); face(cv, 0, 2, { eyes: 'closed', mouth: 'o', ey: 19 });
  legs(cv, 0, 2, 'down');
  cv.dots([[25, 3], [26, 3], [27, 3], [26, 4], [25, 5], [26, 5], [27, 5]], '5');
  cv.dots([[29, 7], [30, 7], [30, 8], [29, 9], [30, 9]], '6');
  /* 콧방울 */
  cv.blob(21.5, 23.5, 1.6, 1.6, ['7', '7', '6', '6', '6']); cv.px(21, 23, 'Z');
});
/* 14. 갸웃 — 이건 뭐지? */
def('hmm', '갸웃', '요리사 모자 쓴 문어가 고개를 갸웃', function (cv) {
  hat(cv, -1, 1, -1); head(cv, -1, 1); face(cv, -1, 1, { eyes: 'dot', mouth: 'flat', ey: 17 });
  legs(cv, -1, 1, 'down');
  /* 물음표 */
  var q = ['.EEE.', 'E...E', '...E.', '..E..', '.....', '..E..'];
  q.forEach(function (r, j) { for (var i = 0; i < r.length; i++) if (r[i] !== '.') cv.px(25 + i, 3 + j, 'E'); });
  tentacleArm(cv, [[23, 23], [25, 22], [26, 20]]);
});
/* 15. 하트 뿅 — 하트 눈 */
def('love', '뿅', '요리사 모자 쓴 문어가 하트 눈으로 반짝', function (cv) {
  hat(cv, 0, 2); head(cv, 0, 2); face(cv, 0, 2, { eyes: 'heart', mouth: 'open', ey: 19, ex: -1 });
  legs(cv, 0, 2, 'down');
  heartIcon(cv, 1, 4, false); heartIcon(cv, 26, 6, false); tinySpark(cv, 29, 2, 'R');
});
/* 16. 휘리릭 — 양념 솔솔 (병 기울이기) */
def('sprinkle', '솔솔', '요리사 모자 쓴 문어가 양념병을 기울여 솔솔 뿌림', function (cv) {
  var o = 2; hat(cv, o, 3); head(cv, o, 3); face(cv, o, 3, { eyes: 'dot', mouth: 'w' }); legs(cv, o, 3, 'down');
  /* 병 (왼쪽 위, 기울어짐) */
  var b = ['..cc...', '.cddb..', 'cdEEDb.', 'cdEEDDb', '.cdDDDb', '..cbbb.', '...b...'];
  b.forEach(function (r, j) { for (var i = 0; i < r.length; i++) if (r[i] !== '.') cv.px(1 + i, 1 + j, r[i]); });
  tentacleArm(cv, [[8, 12], [9, 14], [10, 16]]);
  /* 솔솔 알갱이 */
  cv.dots([[4, 10], [3, 12], [5, 13], [2, 15], [4, 16], [3, 18], [5, 19]], 'F');
});

/* 몸 색 바꾸기: 이미 그린 문어 몸(빨강 계열)만 다른 색으로. 모자(흰·회색)·소품은 그대로 */
function recolor(cv, map) { for (var i = 0; i < cv.c.length; i++) if (map[cv.c[i]]) cv.c[i] = map[cv.c[i]]; }

/* 17. 바빠 — 다리 여러 개로 한꺼번에 (국자·거품기·뒤집개·양념) */
def('busy', '바빠', '요리사 모자 쓴 문어가 다리 여러 개로 국자·거품기·뒤집개를 한꺼번에 듦', function (cv) {
  hat(cv, 0, 3); head(cv, 0, 3); face(cv, 0, 3, { eyes: 'squint', mouth: 'grin', ey: 19 });
  legs(cv, 0, 3, 'down');
  /* 왼쪽 위: 국자 */
  tentacleArm(cv, [[7, 22], [5, 21], [4, 19], [3, 17]]);
  cv.dots([[3, 16], [3, 15], [3, 14], [3, 13], [3, 12]], 'X'); cv.rect(1, 9, 4, 3, 'W'); cv.rect(2, 9, 2, 1, 'Z');
  /* 오른쪽 위: 거품기 */
  tentacleArm(cv, [[24, 22], [26, 21], [27, 19], [28, 17]]);
  cv.dots([[28, 16], [28, 15], [28, 14]], 'X');
  cv.dots([[27, 13], [26, 12], [26, 11], [27, 10], [28, 9], [29, 10], [30, 11], [30, 12], [29, 13], [28, 12], [28, 11], [28, 10]], 'Y');
  /* 왼쪽 아래: 뒤집개 */
  tentacleArm(cv, [[6, 26], [4, 27]]);
  cv.dots([[3, 27], [2, 28]], 'C'); cv.rect(0, 28, 3, 3, 'W'); cv.px(0, 28, 'Z');
  /* 오른쪽 아래: 양념병 */
  tentacleArm(cv, [[26, 26], [28, 27]]);
  cv.rect(28, 25, 3, 5, 'D'); cv.rect(28, 25, 3, 1, 'C'); cv.px(28, 26, 'F'); cv.px(28, 23, 'F'); cv.px(30, 22, 'F');
  sweat(cv, 24, 6);
});
/* 18. 퓻 — 놀라서 먹물 */
def('ink', '퓻', '요리사 모자 쓴 문어가 깜짝 놀라 먹물을 퓻 뿜음', function (cv) {
  var o = 3; hat(cv, o, 1, 1); head(cv, o, 1); face(cv, o, 1, { eyes: 'wow', mouth: 'o', blush: false }); legs(cv, o, 1, 'down');
  /* 먹물 구름 (왼쪽 아래로 퍼짐) */
  cv.blob(5, 25, 4.6, 4, ['5', '4', '3', '2', '2']);
  cv.blob(9.5, 28.5, 3.2, 2.4, ['5', '4', '3', '2', '2']);
  cv.blob(2.5, 20, 2.2, 2, ['5', '4', '3', '3', '3']);
  cv.px(3, 23, '6'); cv.px(4, 22, '6'); cv.px(1, 19, '6');
  cv.dots([[7, 17], [5, 15], [9, 16]], '4');   /* 튄 방울 */
  /* 놀람선 */
  cv.dots([[30, 7], [29, 8], [31, 11], [30, 11]], 'X');
});
/* 19. 두근 — 몸 색이 분홍으로 (문어는 기분·잠에 따라 색이 바뀐다) */
def('flush', '두근', '요리사 모자 쓴 문어의 몸 색이 분홍으로 물듦', function (cv) {
  hat(cv, 0, 2); head(cv, 0, 2); face(cv, 0, 2, { eyes: 'happy', mouth: 'w', blush: false }); legs(cv, 0, 2, 'down');
  recolor(cv, { L: 'R', K: 'Q', J: 'P', I: 'O', F: 'R' });
  cv.rect(8, 22, 2, 1, 'Z'); cv.rect(22, 22, 2, 1, 'Z');
  cv.px(9, 15, 'Z'); cv.px(10, 14, 'Z');
  heartIcon(cv, 1, 5, false); heartIcon(cv, 26, 3, false);
  tinySpark(cv, 29, 12, 'R'); tinySpark(cv, 3, 14, 'R');
});

module.exports = { W: W, H: H, Canvas: Canvas, STICKERS: STICKERS };
