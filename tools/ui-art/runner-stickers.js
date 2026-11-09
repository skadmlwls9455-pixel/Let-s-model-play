/* tools/ui-art/runner-stickers.js — 다락방 달리기 반응 스티커 (머리띠 두른 문어) 픽셀 그림.
 *
 * 32×32 한 장씩. 붓은 sticker-kit.js. 요리 세트의 요리사 모자 대신 파란 머리띠(뒤로 나부끼는 끈)를 두른다.
 * 부딪혀도 벌·실패 그림이 아니다: '콩'은 어질어질 별만 (끝났다는 글자·우는 얼굴 없음).
 */
'use strict';

var K = require('./sticker-kit.js');
var W = K.W, BODY = K.BODY, SUCKER = K.SUCKER, head = K.head, legs = K.legs, face = K.face,
  sparkle = K.sparkle, tinySpark = K.tinySpark, tentacleArm = K.tentacleArm, sweat = K.sweat;
var S = K.set(), STICKERS = S.list, def = S.def;

var BODYSET = { L: 1, K: 1, J: 1, I: 1, F: 1 };
/* 머리띠: 몸 위 두 줄 (몸이 있는 칸에만) + 왼쪽 매듭 + 뒤로 나부끼는 끈 두 가닥. flap 0/1 = 끈 모양 */
function band(cv, ox, oy, flap) {
  for (var x = 0; x < W; x++) {
    if (BODYSET[cv.get(x, oy + 12)]) cv.px(x, oy + 12, x < ox + 14 ? '6' : '5');
    if (BODYSET[cv.get(x, oy + 13)]) cv.px(x, oy + 13, x < ox + 14 ? '5' : '4');
  }
  cv.dots([[ox + 18, oy + 12], [ox + 20, oy + 12]], 'Z');                 /* 줄무늬 */
  cv.rect(ox + 6, oy + 11, 2, 3, '4'); cv.px(ox + 6, oy + 11, '5');       /* 매듭 */
  var t = flap ? [[ox + 5, oy + 10], [ox + 4, oy + 9], [ox + 3, oy + 9], [ox + 2, oy + 8], [ox + 5, oy + 14], [ox + 4, oy + 15], [ox + 3, oy + 15], [ox + 2, oy + 16]]
               : [[ox + 5, oy + 11], [ox + 4, oy + 10], [ox + 3, oy + 11], [ox + 2, oy + 10], [ox + 5, oy + 13], [ox + 4, oy + 14], [ox + 3, oy + 13], [ox + 2, oy + 14]];
  cv.dots(t, '5'); cv.px(t[0][0], t[0][1], '6');
}
function body(cv, ox, oy, f, o) {   /* 머리 + 다리 + 얼굴 + 머리띠 */
  o = o || {};
  head(cv, ox, oy, o.sq || 0);
  if (o.legs !== false) legs(cv, ox, oy, 'down');
  face(cv, ox, oy, f);
  band(cv, ox, oy, o.flap || 0);
}
function speedLines(cv, x, ys, len, k) { ys.forEach(function (y, i) { for (var j = 0; j < len - (i % 2) * 2; j++) cv.px(x + j + (i % 2), y, k || 'X'); }); }
function dust(cv, x, y) { cv.dots([[x, y], [x + 1, y], [x - 1, y - 1], [x + 2, y - 1]], 'Y'); cv.px(x, y - 1, 'X'); }

/* 1. 쌩 — 달리기 (움직임: 다리 번갈아 + 속도선) */
function dashPose(cv, f) {
  var o = 3, oy = f ? 0 : 1;
  head(cv, o, oy);
  /* 달리는 다리: 뒤로 쭉 뻗은 것 둘 + 앞으로 내딛는 것 */
  var back = f ? [[o + 8, 24], [o + 6, 25], [o + 4, 26]] : [[o + 9, 24], [o + 7, 26], [o + 6, 27]];
  var front = f ? [[o + 21, 24], [o + 23, 26], [o + 24, 27]] : [[o + 20, 24], [o + 22, 25], [o + 24, 25]];
  tentacleArm(cv, back); tentacleArm(cv, front);
  tentacleArm(cv, f ? [[o + 14, 24], [o + 13, 26]] : [[o + 15, 24], [o + 16, 26]]);
  face(cv, o, oy, { eyes: 'dot', mouth: 'grin' });
  band(cv, o, oy, f);
  speedLines(cv, 0, f ? [11, 15, 19] : [12, 16, 20], 4);
  dust(cv, f ? 4 : 2, 30);
}
def('dash', '쌩', '머리띠 두른 문어가 다리를 번갈아 쌩 달림', function (cv) { dashPose(cv, 0); },
  [function (cv) { dashPose(cv, 0); }, function (cv) { dashPose(cv, 1); }]);

/* 2. 폴짝 — 점프 (움직임: 공중 ↔ 웅크려 착지) */
function hopPose(cv, up) {
  var oy = up ? -3 : 2;
  head(cv, 0, oy, up ? 0 : 1);
  if (up) {   /* 공중: 다리를 아래로 쫙 */
    [[6, 20], [10, 21], [15, 22], [20, 21], [24, 20]].forEach(function (p, i) { tentacleArm(cv, [[p[0], p[1]], [p[0] + (i < 2 ? -1 : i > 2 ? 1 : 0), p[1] + 2], [p[0] + (i < 2 ? -2 : i > 2 ? 2 : 0), p[1] + 4]]); });
    face(cv, 0, oy, { eyes: 'happy', mouth: 'open' });
    cv.blob(16, 30.5, 6, 1, ['V', 'V', 'V', 'V', 'V']);       /* 땅 그림자 (멀리) */
    sparkle(cv, 27, 4, 'Z'); tinySpark(cv, 4, 6, 'F');
  } else {    /* 착지: 납작 + 먼지 */
    legs(cv, 0, oy, 'down');
    face(cv, 0, oy, { eyes: 'squint', mouth: 'w', ey: 19 });
    dust(cv, 3, 30); dust(cv, 27, 30);
  }
  band(cv, 0, oy, up ? 1 : 0);
}
def('hop', '폴짝', '머리띠 두른 문어가 폴짝 뛰어오름', function (cv) { hopPose(cv, true); },
  [function (cv) { hopPose(cv, true); }, function (cv) { hopPose(cv, false); }]);

/* 3. 납작 — 숙여서 거미줄 밑으로 */
def('duck', '납작', '머리띠 두른 문어가 납작 엎드려 거미줄 밑을 지나감', function (cv) {
  var oy = 6;
  head(cv, 0, oy, 2.5); legs(cv, 0, oy - 1, 'down');
  face(cv, 0, oy, { eyes: 'squint', mouth: 'flat', ey: 18 });
  band(cv, 0, oy, 1);
  /* 위 거미줄 */
  for (var x = 4; x < 28; x++) cv.px(x, 6 + (x % 6 === 0 ? 1 : 0), 'Y');
  cv.dots([[9, 2], [9, 3], [9, 4], [9, 5], [21, 1], [21, 2], [21, 3], [21, 4], [21, 5], [15, 3], [16, 4], [14, 4]], 'Y');
});

/* 4. 휴 — 아슬아슬 지나감 */
def('phew', '휴', '머리띠 두른 문어가 다리로 이마를 훔치며 휴 함', function (cv) {
  body(cv, 0, 1, { eyes: 'closed', mouth: 'w' });
  tentacleArm(cv, [[24, 22], [26, 19], [26, 16], [24, 14], [22, 13]]);   /* 이마 훔치는 다리 */
  cv.px(21, 13, 'K'); cv.px(25, 17, SUCKER);
  sweat(cv, 29, 9); sweat(cv, 4, 14);
  cv.dots([[2, 22], [3, 22], [4, 21]], 'Y');    /* 한숨 바람 */
});

/* 5. 이끼 득 — 이끼 주움 */
def('moss', '이끼 득', '머리띠 두른 문어가 이끼 한 줌을 번쩍 듦', function (cv) {
  var o = -3;
  body(cv, o, 3, { eyes: 'happy', mouth: 'open' });
  tentacleArm(cv, [[19, 24], [22, 22], [24, 19], [25, 16], [25, 13]]);
  cv.blob(25.5, 9.5, 3.6, 2.6, ['w', 'v', 'u', 't', 's']);
  cv.dots([[23, 7], [25, 6], [27, 7], [28, 9]], 'v'); cv.px(24, 8, 'w');
  sparkle(cv, 30, 4, 'F'); tinySpark(cv, 20, 5, 'Z'); tinySpark(cv, 30, 14, 'v');
});

/* 6. 활활 — 빨라졌다 (움직임: 뒤에서 불꽃 넘실) */
var FLAME = [   /* 끝이 뾰족한 불꽃 7×11 (가운데 노랑 → 바깥 주황·갈색), 두 칸 */
  ['...D...', '...D...', '..DE...', '..DED..', '.DEED..', '.DEFED.', 'DEFFED.', 'DEFFFED', 'DEFZFED', '.DEFFD.', '..DDD..'],
  ['....D..', '...DD..', '...DE..', '..DED..', '..DEED.', '.DEFED.', '.DEFFED', 'DEFFFED', 'DEFZFED', '.DEFFD.', '..DDD..']
];
function flame(cv, x, y, f, flip) {
  FLAME[f].forEach(function (r, j) { for (var i = 0; i < r.length; i++) { var c = r[flip ? r.length - 1 - i : i]; if (c !== '.') cv.px(x + i, y + j, c); } });
}
function firePose(cv, f) {
  /* 불꽃 셋 (몸 뒤), 칸마다 끝이 흔들린다 */
  flame(cv, 1, 6 + f, f, false); flame(cv, 12, 1, 1 - f, f === 1); flame(cv, 24, 6 + (1 - f), f, true);
  body(cv, 0, 4, { eyes: 'squint', mouth: 'grin', ey: 18 }, { flap: f });
  tinySpark(cv, f ? 10 : 22, 1, 'F'); tinySpark(cv, f ? 23 : 9, 4, 'E');
}
def('fire', '활활', '머리띠 두른 문어 뒤로 불꽃이 활활', function (cv) { firePose(cv, 0); },
  [function (cv) { firePose(cv, 0); }, function (cv) { firePose(cv, 1); }]);

/* 7. 최고! — 새 최고 기록 (트로피) */
def('trophy', '최고!', '머리띠 두른 문어가 트로피를 높이 듦', function (cv) {
  body(cv, 0, 5, { eyes: 'sparkle', mouth: 'open', ey: 18 });
  tentacleArm(cv, [[8, 25], [6, 22], [6, 18], [7, 15], [9, 12]]);
  tentacleArm(cv, [[23, 25], [25, 22], [25, 18], [24, 15], [22, 12]]);
  var t = ['.EEEEEEE.', 'FEFEEEEDC', 'EFEEEEDDC', '.EEEEEDC.', '..EEEDC..', '...EDC...', '...EDC...', '..DDDCC..'];
  t.forEach(function (r, j) { for (var i = 0; i < r.length; i++) if (r[i] !== '.') cv.px(12 + i, 2 + j, r[i]); });
  cv.dots([[11, 3], [10, 4], [11, 5], [21, 3], [22, 4], [21, 5]], 'D');   /* 손잡이 */
  sparkle(cv, 4, 4, 'Z'); sparkle(cv, 28, 6, 'F'); tinySpark(cv, 16, 0, 'F');
});

/* 8. 콩 — 부딪힘 (움직임: 머리 위 별이 빙글) — 벌 아님, 어질어질만 */
function bonkPose(cv, f) {
  body(cv, 0, 3, { eyes: 'spiral', mouth: 'wobble' }, { flap: 0 });
  var stars = f ? [[7, 7], [16, 3], [25, 7]] : [[11, 4], [21, 4], [16, 8]];
  stars.forEach(function (p, i) { sparkle(cv, p[0], p[1], i % 2 ? 'F' : 'E'); });
  cv.blob(22, 11.5, 2, 1.4, ['L', 'L', 'K', 'K', 'K']);   /* 작은 혹 */
}
def('bonk', '콩', '머리띠 두른 문어가 콩 부딪혀 머리 위로 별이 빙글', function (cv) { bonkPose(cv, 0); },
  [function (cv) { bonkPose(cv, 0); }, function (cv) { bonkPose(cv, 1); }]);

/* 9. 한 판 더 — 다시! (주먹 불끈) */
def('again', '한 판 더', '머리띠 두른 문어가 다리 주먹을 불끈 쥠', function (cv) {
  var o = -3;
  body(cv, o, 3, { eyes: 'dot', mouth: 'grin' }, { flap: 1 });
  /* 불끈 쥔 다리 주먹 (오른쪽 위) */
  tentacleArm(cv, [[19, 23], [22, 22], [24, 20]]);
  cv.blob(26, 16.5, 3.4, 3.2, BODY); cv.dots([[24, 15], [24, 17]], SUCKER); cv.px(25, 14, 'L');
  cv.dots([[29, 10], [30, 9], [26, 10], [26, 9], [23, 11], [22, 10]], 'F');   /* 힘 선 */
  cv.dots([[30, 21], [31, 20]], 'E');
});

module.exports = { set: 'runner', W: W, H: K.H, Canvas: K.Canvas, STICKERS: STICKERS };
