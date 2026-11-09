/* tools/ui-art/cook-stickers.js — 요리할 때 뜨는 반응 스티커 (요리사 모자 쓴 문어) 픽셀 그림.
 *
 * 32×32 한 장씩. 붓은 sticker-kit.js (달리기·헤엄 세트와 같이 쓴다).
 * 색은 sprites.js 의 Apollo KEY 글자만 쓴다. 외곽선은 make-stickers.js 가 장면 규칙(이웃 L×0.62 → 스냅)으로 두른다.
 * 빛은 위·왼쪽에서 (밝은 칸이 왼쪽 위).
 *
 * 문어 스티커는 그림일 뿐 문어의 말이 아니다. 글자를 넣지 않는다 (맛 평가·취향 말 금지 — DELEGATION 카드 7).
 */
'use strict';

var K = require('./sticker-kit.js');
var W = K.W, H = K.H, Canvas = K.Canvas, BODY = K.BODY, HAT = K.HAT, INK = K.INK, SHINE = K.SHINE, BLUSH = K.BLUSH, MOUTH = K.MOUTH, TONGUE = K.TONGUE, SUCKER = K.SUCKER, hat = K.hat, head = K.head, legs = K.legs, EYES = K.EYES, face = K.face, sparkle = K.sparkle, tinySpark = K.tinySpark, heartIcon = K.heartIcon, star = K.star, tentacleArm = K.tentacleArm, steam = K.steam, sweat = K.sweat, tear = K.tear, recolor = K.recolor;

/* ───── 스티커 목록 ───── */
var S = K.set(), STICKERS = S.list, def = S.def;

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
/* 휘휘는 움직이는 스티커: 칸 0 = 국자 오른쪽(정지 그림), 칸 1 = 국자 왼쪽 */
function stirPose(cv, left) {
  hat(cv, 0, -2); head(cv, 0, -2); face(cv, 0, -2, { eyes: left ? 'happy' : 'dot', mouth: 'smile', ex: left ? -1 : 0 });
  /* 냄비 (몸 아래 가림) */
  cv.rect(4, 21, 24, 2, 'V'); cv.rect(4, 21, 24, 1, 'X');
  cv.blob(16, 25.5, 11, 5, ['5', '4', '4', '3', '2']);
  cv.rect(5, 21, 22, 2, 'U'); cv.rect(5, 21, 22, 1, 'X');
  cv.rect(2, 24, 2, 2, '3'); cv.rect(28, 24, 2, 2, '3');
  /* 국자: 오른쪽 위 → 가운데 (left 면 좌우로 뒤집음) */
  var Zs = [[26, 8], [26, 9], [25, 10], [25, 11], [24, 12], [24, 13], [23, 14], [23, 15], [22, 16], [22, 17], [21, 18], [21, 19], [20, 20], [20, 21]];
  var Xs = [[27, 9], [26, 10], [26, 11], [25, 12], [25, 13], [24, 14], [24, 15], [23, 16], [23, 17], [22, 18], [22, 19], [21, 20]];
  function fx(p) { return left ? [31 - p[0], p[1]] : p; }
  cv.dots(Zs.map(fx), 'X'); cv.dots(Xs.map(fx), 'V');   /* 흰 모자 위에서도 보이게 한 톤 어둡게 */
  tentacleArm(cv, left ? [[7, 13], [6, 16]] : [[23, 13], [24, 16]]);
  cv.rect(9, 21, 3, 1, 'K'); cv.rect(19, 21, 3, 1, 'K');
  /* 김은 국자 반대쪽에서 피어오름 */
  if (left) { steam(cv, 22, 20); steam(cv, 4, 18); } else { steam(cv, 9, 20); steam(cv, 27, 18); }
  /* 국물 출렁 (국자 끝 쪽) */
  cv.dots(left ? [[12, 22], [13, 22]] : [[18, 22], [19, 22]], '6');
}
def('stir', '휘휘', '요리사 모자 쓴 문어가 냄비 뒤에서 국자로 저음', function (cv) { stirPose(cv, false); },
  [function (cv) { stirPose(cv, false); }, function (cv) { stirPose(cv, true); }]);
/* 8. 진땀 — 냄비가 가득 (실패 아님, 그냥 땀) */
def('sweat', '진땀', '요리사 모자 쓴 문어가 진땀을 흘리며 힘줌', function (cv) {
  hat(cv, 0, 1, -1); head(cv, 0, 1); face(cv, 0, 1, { eyes: 'squint', mouth: 'wobble', ey: 17 });
  legs(cv, 0, 1, 'down');
  sweat(cv, 26, 12); sweat(cv, 4, 15); sweat(cv, 28, 19);
});
/* 9. 만세 — 다리 둘을 번쩍 */
/* 만세는 움직이는 스티커: 칸 0 = 다리 번쩍(정지 그림), 칸 1 = 다리 내리고 살짝 웅크림 */
function cheerPose(cv, down) {
  var oy = down ? 5 : 4;
  hat(cv, 0, oy); head(cv, 0, oy, down ? 1 : 0); face(cv, 0, oy, { eyes: 'happy', mouth: down ? 'smile' : 'open' });
  if (!down) {
    tentacleArm(cv, [[7, 22], [5, 20], [4, 18], [3, 16], [3, 14], [2, 12]]);
    tentacleArm(cv, [[24, 22], [26, 20], [27, 18], [28, 16], [28, 14], [29, 12]]);
    cv.px(2, 11, 'K'); cv.px(29, 11, 'K'); cv.px(3, 15, SUCKER); cv.px(28, 15, SUCKER);
  } else {
    /* 어깨 높이로 내린 다리 (끝이 살짝 위로 말림) */
    tentacleArm(cv, [[7, 23], [5, 23], [4, 22], [3, 21], [2, 20]]);
    tentacleArm(cv, [[24, 23], [26, 23], [27, 22], [28, 21], [29, 20]]);
    cv.px(2, 19, 'K'); cv.px(29, 19, 'K'); cv.px(4, 23, SUCKER); cv.px(27, 23, SUCKER);
  }
  legs(cv, 0, 4, 'down');
  if (!down) { sparkle(cv, 7, 3); sparkle(cv, 26, 2, 'Z'); tinySpark(cv, 16, 1, 'E'); }
  else { tinySpark(cv, 6, 6, 'F'); tinySpark(cv, 25, 5, 'Z'); }
}
def('cheer', '만세', '요리사 모자 쓴 문어가 다리 둘을 번쩍 듦', function (cv) { cheerPose(cv, false); },
  [function (cv) { cheerPose(cv, false); }, function (cv) { cheerPose(cv, true); }]);
/* 10. 빼꼼 — 냄비 가장자리에서 */
def('peek', '빼꼼', '요리사 모자 쓴 문어가 냄비 가장자리 위로 빼꼼', function (cv) {
  hat(cv, 0, 4); head(cv, 0, 4); face(cv, 0, 4, { eyes: 'big', mouth: 'none', ey: 18 });
  cv.rect(1, 25, 30, 6, '4'); cv.rect(1, 25, 30, 2, 'X'); cv.rect(1, 27, 30, 1, '3'); cv.rect(1, 28, 4, 3, '5'); cv.rect(26, 28, 5, 3, '3');
  /* 가장자리 잡은 다리 끝 */
  cv.rect(8, 23, 3, 3, 'K'); cv.rect(21, 23, 3, 3, 'K'); cv.px(9, 24, SUCKER); cv.px(22, 24, SUCKER);
  cv.dots([[3, 21], [2, 19], [29, 20]], 'Y');
});
/* 11. 짝짝 — 박수 */
/* 짝짝은 움직이는 스티커: 칸 0 = 맞닿음(정지 그림·모션 줄이기), 칸 1 = 벌림 */
function clapPose(cv, apart) {
  hat(cv, 0, -1); head(cv, 0, -2); face(cv, 0, -2, { eyes: 'happy', mouth: 'open' });
  legs(cv, 0, -2, 'down');
  /* 다리 둘의 빨판 쪽(연한 살구색)을 앞으로 — 빨간 몸 위에서도 또렷하다. 바깥 테두리만 빨강.
     맞닿을 땐 위는 붙고(가운데 이음선 d) 아래는 벌어진 V — 손이 둘로 읽힌다 */
  var L, R, lx, rx;
  if (!apart) {
    L = ['....Kd', '...Kfd', '..Kfed', '.Kffed', '.Kfefd', 'Kffef.', 'Kfeff.', '.KffK.', '..JJ..'];
    R = ['dK....', 'dfK...', 'defK..', 'deffK.', 'dfefK.', '.feffK', '.ffefK', '.KffK.', '..JJ..'];
    lx = 10; rx = 16;
  } else {
    /* 벌림: 손바닥이 바깥으로 젖혀져 서로 마주 봄 (빨판 면이 안쪽) */
    L = ['..KK..', '.KffK.', 'KfeffK', 'KffefK', 'KfeffK', 'KffefK', '.KffK.', '..KJ..', '..JJ..'];
    R = ['..KK..', '.KffK.', 'KffefK', 'KfeffK', 'KffefK', 'KfeffK', '.KffK.', '..JK..', '..JJ..'];
    lx = 7; rx = 19;
  }
  L.forEach(function (r, j) { for (var i = 0; i < r.length; i++) if (r[i] !== '.') cv.px(lx + i, 20 + j, r[i]); });
  R.forEach(function (r, j) { for (var i = 0; i < r.length; i++) if (r[i] !== '.') cv.px(rx + i, 20 + j, r[i]); });
  if (!apart) {
    /* 짝! 맞닿은 꼭대기에서 퍼지는 충격선 + 양옆 반짝 */
    cv.dots([[15, 19], [16, 19]], 'Z');
    cv.dots([[12, 19], [11, 18], [19, 19], [20, 18]], 'F');
    cv.dots([[5, 22], [4, 23], [4, 24], [5, 25]], 'E'); cv.dots([[26, 22], [27, 23], [27, 24], [26, 25]], 'E');
    sparkle(cv, 3, 17, 'F'); sparkle(cv, 28, 17, 'F');
  } else {
    /* 다가오는 움직임 선 (손 사이 빈칸) */
    cv.dots([[14, 23], [14, 25], [17, 23], [17, 25]], 'E');
  }
}
def('clap', '짝짝', '요리사 모자 쓴 문어가 빨판 쪽 다리 둘을 앞에서 맞대고 짝 하고 박수', function (cv) { clapPose(cv, false); },
  [function (cv) { clapPose(cv, false); }, function (cv) { clapPose(cv, true); }]);
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
/* 꾸벅은 움직이는 스티커: 칸 0 = 고개 든 채 졸기(정지 그림), 칸 1 = 꾸벅 숙임 + 콧방울 부풂 */
function sleepyPose(cv, nod) {
  var oy = 2 + nod;
  hat(cv, -1, oy, -2 - nod); head(cv, 0, oy, 1); face(cv, 0, oy, { eyes: 'closed', mouth: 'o', ey: 19 });
  legs(cv, 0, 2, 'down');
  cv.dots([[25, 3], [26, 3], [27, 3], [26, 4], [25, 5], [26, 5], [27, 5]].map(function (p) { return [p[0], p[1] - nod]; }), '5');
  cv.dots([[29, 7], [30, 7], [30, 8], [29, 9], [30, 9]].map(function (p) { return [p[0], p[1] - nod]; }), '6');
  if (nod) cv.dots([[22, 7], [23, 7], [23, 8], [22, 9], [23, 9]], '6');   /* 작은 z 하나 더 */
  /* 콧방울 (숙이면 부푼다) */
  var r = nod ? 2.4 : 1.6;
  cv.blob(21.5, 23.5 + nod, r, r, ['7', '7', '6', '6', '6']); cv.px(21, 23 + nod - (nod ? 1 : 0), 'Z');
}
def('sleepy', '꾸벅', '요리사 모자 쓴 문어가 꾸벅 졺', function (cv) { sleepyPose(cv, 0); },
  [function (cv) { sleepyPose(cv, 0); }, function (cv) { sleepyPose(cv, 1); }]);
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
/* 퓻은 움직이는 스티커: 칸 0 = 다 퍼진 먹물(정지 그림) → 칸 1 = 막 뿜음(작은 덩이) → 칸 2 = 퍼지는 중 → 다시 0 */
function inkPose(cv, stage) {
  var o = 3; hat(cv, o, 1, 1); head(cv, o, 1); face(cv, o, 1, { eyes: 'wow', mouth: stage === 1 ? 'O' : 'o', blush: false }); legs(cv, o, 1, 'down');
  var T = ['5', '4', '3', '2', '2'];
  if (stage === 0) {         /* 다 퍼짐 (왼쪽 아래) */
    cv.blob(5, 25, 4.6, 4, T);
    cv.blob(9.5, 28.5, 3.2, 2.4, T);
    cv.blob(2.5, 20, 2.2, 2, ['5', '4', '3', '3', '3']);
    cv.px(3, 23, '6'); cv.px(4, 22, '6'); cv.px(1, 19, '6');
    cv.dots([[7, 17], [5, 15], [9, 16]], '4');
  } else if (stage === 1) {  /* 퓻! 몸 옆에서 막 나온 작은 덩이 */
    cv.blob(10, 25.5, 2, 1.8, T); cv.px(9, 25, '6');
    cv.dots([[7, 24], [6, 23]], '4');
  } else {                   /* 퍼지는 중 */
    cv.blob(7, 25.5, 3.4, 3, T);
    cv.blob(10.5, 28.5, 2, 1.6, T);
    cv.px(5, 24, '6'); cv.px(6, 23, '6');
    cv.dots([[4, 20], [8, 19]], '4');
  }
  /* 놀람선 */
  cv.dots([[30, 7], [29, 8], [31, 11], [30, 11]], 'X');
}
def('ink', '퓻', '요리사 모자 쓴 문어가 깜짝 놀라 먹물을 퓻 뿜음', function (cv) { inkPose(cv, 0); },
  [function (cv) { inkPose(cv, 0); }, function (cv) { inkPose(cv, 1); }, function (cv) { inkPose(cv, 2); }]);

/* 19. 두근 — 몸 색이 분홍으로 (문어는 기분·잠에 따라 색이 바뀐다) */
/* 두근은 움직이는 스티커: 색이 다리부터 차올랐다 빠졌다 — 칸 0 = 온통 분홍(정지 그림) → 1 = 반쯤 → 2 = 원래 빨강 → 3 = 반쯤 */
var PINK = { L: 'R', K: 'Q', J: 'P', I: 'O', F: 'R' };
function flushPose(cv, level) {   /* level 2 = 온통 분홍, 1 = 아래 반만, 0 = 빨강 */
  hat(cv, 0, 2); head(cv, 0, 2); face(cv, 0, 2, { eyes: 'happy', mouth: 'w', blush: level === 0 }); legs(cv, 0, 2, 'down');
  if (level === 2) recolor(cv, PINK);
  else if (level === 1) { for (var i = 18 * W; i < cv.c.length; i++) if (PINK[cv.c[i]]) cv.c[i] = PINK[cv.c[i]]; }
  if (level > 0) { cv.rect(8, 22, 2, 1, 'Z'); cv.rect(22, 22, 2, 1, 'Z'); }
  if (level === 2) { cv.px(9, 15, 'Z'); cv.px(10, 14, 'Z'); }
  if (level === 2) { heartIcon(cv, 1, 5, false); heartIcon(cv, 26, 3, false); tinySpark(cv, 29, 12, 'R'); tinySpark(cv, 3, 14, 'R'); }
  else if (level === 1) { heartIcon(cv, 2, 8, false); tinySpark(cv, 28, 6, 'R'); }
}
def('flush', '두근', '요리사 모자 쓴 문어의 몸 색이 분홍으로 물듦', function (cv) { flushPose(cv, 2); },
  [function (cv) { flushPose(cv, 2); }, function (cv) { flushPose(cv, 1); }, function (cv) { flushPose(cv, 0); }, function (cv) { flushPose(cv, 1); }]);

module.exports = { set: 'cook', W: W, H: H, Canvas: Canvas, STICKERS: STICKERS };
