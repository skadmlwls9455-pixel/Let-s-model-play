/* tools/ui-art/swim-stickers.js — 헤엄 반응 스티커 (이마에 물안경 올린 문어) 픽셀 그림.
 *
 * 32×32 한 장씩. 붓은 sticker-kit.js. 요리사 모자 대신 이마 위로 올린 물안경 (눈은 그대로 보인다 — 표정이 산다).
 * 부딪힘은 '퐁' 하고 살짝 빙글 (CORE_LOOP_V2 §5.5 '살짝 부딪힘 퐁'). 벌·실패 그림 없음.
 */
'use strict';

var K = require('./sticker-kit.js');
var W = K.W, BODY = K.BODY, SUCKER = K.SUCKER, head = K.head, legs = K.legs, face = K.face,
  sparkle = K.sparkle, tinySpark = K.tinySpark, tentacleArm = K.tentacleArm;
var S = K.set(), STICKERS = S.list, def = S.def;

var BODYSET = { L: 1, K: 1, J: 1, I: 1, F: 1 };
/* 물안경: 몸 위 끈 한 줄 + 이마 가운데 동그란 알 둘 (유리 반짝) */
function goggles(cv, ox, oy) {
  for (var x = 0; x < W; x++) if (BODYSET[cv.get(x, oy + 13)]) cv.px(x, oy + 13, '3');
  [ox + 11, ox + 18].forEach(function (x0) {
    cv.rect(x0, oy + 11, 4, 3, '4');
    cv.rect(x0 + 1, oy + 11, 2, 2, '6'); cv.px(x0 + 1, oy + 11, 'Z'); cv.px(x0 + 2, oy + 12, '7');
  });
  cv.rect(ox + 15, oy + 12, 3, 1, '3');   /* 코다리 */
}
function body(cv, ox, oy, f, o) {
  o = o || {};
  head(cv, ox, oy, o.sq || 0);
  if (o.legs !== false) legs(cv, ox, oy, 'down');
  face(cv, ox, oy, f);
  goggles(cv, ox, oy);
}
function bubble(cv, x, y, r) {
  if (r <= 1) { cv.px(x, y, '7'); return; }
  cv.dots([[x, y - 1], [x - 1, y], [x + 1, y], [x, y + 1]], '6'); cv.px(x - 1, y - 1, 'Z');
  if (r > 2) { cv.dots([[x - 1, y - 2], [x + 1, y - 2], [x - 2, y - 1], [x + 2, y - 1], [x - 2, y + 1], [x + 2, y + 1], [x - 1, y + 2], [x + 1, y + 2]], '6'); cv.px(x, y - 1, null); cv.px(x - 1, y, null); cv.px(x + 1, y, null); cv.px(x, y + 1, null); cv.px(x - 1, y - 1, 'Z'); }
}
function water(cv, y, wave) {   /* 아래쪽 둥근 물 (윗면 출렁 선 + 물빛 줄, 양끝은 둥글게) */
  var cx = 15.5, rx = 15;
  for (var x = 0; x < W; x++) {
    var dx = (x + 0.5 - cx) / rx; if (Math.abs(dx) > 1) continue;
    var top = y + (Math.abs(dx) > 0.93 ? 2 : Math.abs(dx) > 0.85 ? 1 : 0) + ((x + wave) % 6 < 3 ? 0 : 1);
    var bot = 31 - Math.round((1 - Math.sqrt(1 - dx * dx)) * 3);
    cv.px(x, top, '7');
    for (var yy = top + 1; yy <= bot; yy++) cv.px(x, yy, (yy - top) % 3 === 0 ? '5' : '6');
  }
}

/* 1. 풍덩 — 물에 들어감 */
def('splash', '풍덩', '물안경 올린 문어가 풍덩 뛰어듦', function (cv) {
  body(cv, 0, 0, { eyes: 'happy', mouth: 'open' }, { legs: false });
  water(cv, 23, 0);
  /* 양옆 물보라 */
  cv.dots([[3, 19], [2, 17], [4, 16], [1, 14], [5, 20], [28, 19], [29, 17], [27, 16], [30, 14], [26, 20]], '6');
  cv.dots([[2, 16], [29, 16], [1, 13], [30, 13]], 'Z');
  cv.dots([[7, 13], [24, 13]], '7');
});

/* 2. 톡 — 헤엄 한 번 (움직임: 다리 모음 ↔ 쫙 밀기) */
function flapPose(cv, push) {
  var oy = push ? -2 : 0;
  head(cv, 0, oy);
  if (push) {   /* 다리를 아래로 쫙 펴서 민다 */
    [[7, 22], [11, 23], [15, 23], [19, 23], [23, 22]].forEach(function (p, i) {
      var dx = (i - 2); tentacleArm(cv, [[p[0], p[1]], [p[0] + dx, p[1] + 2], [p[0] + dx * 2, p[1] + 4], [p[0] + dx * 2, p[1] + 6]]);
    });
    bubble(cv, 4, 28, 2); bubble(cv, 27, 29, 1); bubble(cv, 29, 26, 1);
  } else {      /* 다리를 모아 오므림 */
    [[10, 23], [13, 24], [16, 24], [19, 23]].forEach(function (p) { tentacleArm(cv, [[p[0], p[1]], [p[0], p[1] + 2], [p[0], p[1] + 4]]); });
    bubble(cv, 26, 20, 2); bubble(cv, 6, 22, 1);
  }
  face(cv, 0, oy, { eyes: 'dot', mouth: push ? 'grin' : 'o' });
  goggles(cv, 0, oy);
  tinySpark(cv, 16, 2, '7');
}
def('flap', '톡', '물안경 올린 문어가 다리를 쫙 펴서 헤엄침', function (cv) { flapPose(cv, true); },
  [function (cv) { flapPose(cv, true); }, function (cv) { flapPose(cv, false); }]);

/* 3. 보글 — 거품 (움직임: 거품이 올라감) */
function bubblePose(cv, f) {
  body(cv, -2, 2, { eyes: 'closed', mouth: 'o', ey: 18 });
  var b = f ? [[19, 19, 1], [22, 14, 2], [26, 8, 3]] : [[20, 21, 1], [22, 17, 1], [25, 11, 3], [28, 4, 2]];
  b.forEach(function (q) { bubble(cv, q[0], q[1], q[2]); });
}
def('bubble', '보글', '물안경 올린 문어가 보글보글 거품을 냄', function (cv) { bubblePose(cv, 0); },
  [function (cv) { bubblePose(cv, 0); }, function (cv) { bubblePose(cv, 1); }]);

/* 4. 퐁 — 살짝 부딪힘 */
def('bump', '퐁', '물안경 올린 문어가 퐁 부딪혀 눈을 질끈 감음', function (cv) {
  var o = 2;
  body(cv, o, 2, { eyes: 'squint', mouth: 'wobble', ey: 18 });
  /* 부딪힌 자리 (왼쪽) 퐁 고리 */
  cv.dots([[3, 13], [3, 14], [3, 15], [3, 16], [2, 12], [2, 17], [1, 11], [1, 18]], '7');
  cv.dots([[0, 14], [0, 15]], '6');
  sparkle(cv, 6, 7, 'F'); tinySpark(cv, 2, 22, 'F');
});

/* 5. 주웠다 — 바닷속에서 조개껍데기 줍기 */
def('pickup', '주웠다', '물안경 올린 문어가 조개껍데기를 주워 듦', function (cv) {
  var o = -3;
  body(cv, o, 3, { eyes: 'sparkle', mouth: 'open', ey: 18 });
  tentacleArm(cv, [[19, 24], [22, 22], [24, 19], [25, 16]]);
  var sh = ['..efe..', '.efefe.', 'efefefe', 'dfefefd', '.ddddd.', '..dcd..'];
  sh.forEach(function (r, j) { for (var i = 0; i < r.length; i++) if (r[i] !== '.') cv.px(22 + i, 8 + j, r[i]); });
  sparkle(cv, 29, 5, 'Z'); tinySpark(cv, 20, 6, '7'); bubble(cv, 29, 18, 1);
});

/* 6. 쓩 — 헤엄 중 먹물 (뒤로 먹물, 앞으로 쓩) */
def('jet', '쓩', '물안경 올린 문어가 먹물을 뒤로 퓻 뿜으며 앞으로 쓩', function (cv) {
  var o = 5;
  body(cv, o, 1, { eyes: 'wow', mouth: 'o', blush: false });
  cv.blob(4, 24, 4, 3.6, ['5', '4', '3', '2', '2']); cv.blob(2, 19, 2, 2, ['5', '4', '3', '3', '3']);
  cv.px(3, 22, '6'); cv.px(1, 18, '6');
  cv.dots([[29, 8], [30, 8], [31, 8], [30, 12], [31, 12], [29, 16], [30, 16], [31, 16]], '7');   /* 앞으로 속도선 */
});

/* 7. 같이 가자 — 다리 흔들기 (움직임) */
function wavePose(cv, f) {
  var o = -3;
  body(cv, o, 3, { eyes: 'happy', mouth: 'open' });
  if (f) { tentacleArm(cv, [[19, 23], [22, 21], [24, 18], [26, 15], [27, 12], [27, 10]]); cv.px(27, 9, 'K'); cv.px(25, 17, SUCKER); cv.dots([[30, 9], [30, 11]], '7'); }
  else { tentacleArm(cv, [[19, 23], [22, 21], [24, 18], [25, 15], [24, 12], [22, 10]]); cv.px(21, 10, 'K'); cv.px(24, 16, SUCKER); cv.dots([[20, 7], [22, 7]], '7'); }
  bubble(cv, 29, 22, 1);
}
def('wave', '같이 가자', '물안경 올린 문어가 다리를 흔들며 손짓함', function (cv) { wavePose(cv, 1); },
  [function (cv) { wavePose(cv, 1); }, function (cv) { wavePose(cv, 0); }]);

/* 8. 둥둥 — 그냥 떠 있음 (움직임: 물 위 출렁) */
function floatPose(cv, f) {
  body(cv, 0, 1 + f, { eyes: 'closed', mouth: 'w' }, { legs: false });
  water(cv, 23 + f, f ? 3 : 0);
  cv.dots(f ? [[7, 20], [24, 20]] : [[6, 21], [25, 21]], 'Z');
  tinySpark(cv, 27, 6, 'F');
}
def('float', '둥둥', '물안경 올린 문어가 눈 감고 둥둥 떠 있음', function (cv) { floatPose(cv, 0); },
  [function (cv) { floatPose(cv, 0); }, function (cv) { floatPose(cv, 1); }]);

/* 9. 도착 — 구간·코스 끝 (깃발) */
def('arrive', '도착', '물안경 올린 문어가 깃발을 들고 도착함', function (cv) {
  var o = -3;
  body(cv, o, 3, { eyes: 'happy', mouth: 'grin' });
  for (var y = 3; y < 23; y++) cv.px(24, y, y < 4 ? 'F' : 'c');
  var fl = ['QQQQQ', 'QRQQQP', 'QQQQPP', 'QQQPP', 'QQP'];
  fl.forEach(function (r, j) { for (var i = 0; i < r.length; i++) if (r[i] !== '.') cv.px(25 + i, 4 + j, r[i]); });
  tentacleArm(cv, [[19, 24], [22, 22], [23, 19]]);
  sparkle(cv, 29, 13, 'Z'); tinySpark(cv, 20, 5, 'F');
});

module.exports = { set: 'swim', W: W, H: K.H, Canvas: K.Canvas, STICKERS: STICKERS };
