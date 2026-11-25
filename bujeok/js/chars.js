/* 일주 캐릭터 120개 (60 일주 × 여 · 남).
 *
 * 조립 방식 — 같은 일주는 특징을 공유하고, 여 · 남은 작은 소품으로만 갈린다.
 *   지지(12) → 동물 (머리 · 귀 · 주둥이 · 꼬리), 발밑 물상 (켜면)
 *   천간(10) → 몸 색 (갑을 푸른 · 병정 붉은 · 무기 황금 · 경신 흰 · 임계 검은), 머리 소품 · 손에 든 것 · 자세 · 표정
 *   성별      → 여: 리본 · 속눈썹 · 눈 반짝 · 볼터치 / 남: 눈썹 · 목수건 (모자가 없으면 앞머리 한 가닥)
 *
 * 깔끔하게: 실루엣은 매끈하게, 안쪽 잔선은 얼굴 · 주둥이 · 배 무늬만. 흔들림은 카드의 필터가 살짝만 준다.
 * 좌표: 한 마리는 대략 x -100..100, y -125..100 (발바닥 ≈ y 92).
 */
(function () {
  'use strict';
  var BJ = window.BJ = window.BJ || {};
  var D = BJ.draw, G = BJ.ganji;
  var curve = D.curve, shape = D.shape, line = D.line, capsule = D.capsule, circle = D.circle, ellipse = D.ellipse;

  var SW = 4.4;            /* 테두리 */
  var FW = 3.3;            /* 얼굴 · 무늬 */
  var CREAM = '#FFF4DC';

  /* 천간 색. 선 색이 빨강이라 붉은 · 검은 몸은 얼굴 선을 크림색으로 뒤집는다 */
  function palette(el, mode, ink, paper) {
    if (mode === 'line') {
      return { fill: paper, patch: paper, line: ink, feat: ink, featPatch: ink, blush: null, acc: ink, accLine: ink, item: paper, nose: ink, hi: paper, eyeWhite: paper, mane: ink };
    }
    switch (el) {
      case 'wood':  return { fill: '#80AEEA', patch: CREAM, line: ink, feat: ink, featPatch: ink, blush: '#F4A08E', acc: ink, accLine: ink, item: CREAM, nose: ink, hi: CREAM, eyeWhite: CREAM, mane: ink };
      case 'fire':  return { fill: '#E2472E', patch: '#FFE4CB', line: '#7A1A0E', feat: CREAM, featPatch: '#7A1A0E', blush: '#FFB89E', acc: CREAM, accLine: '#7A1A0E', item: CREAM, nose: '#7A1A0E', hi: '#E2472E', eyeWhite: CREAM, mane: '#7A1A0E' };
      case 'earth': return { fill: '#FFD95C', patch: CREAM, line: ink, feat: ink, featPatch: ink, blush: '#F4A08E', acc: ink, accLine: ink, item: CREAM, nose: ink, hi: CREAM, eyeWhite: CREAM, mane: ink };
      case 'metal': return { fill: '#FFFDF7', patch: '#FFFDF7', line: ink, feat: ink, featPatch: ink, blush: '#F7AE9D', acc: ink, accLine: ink, item: '#FFF0CC', nose: ink, hi: '#FFFDF7', eyeWhite: '#FFFDF7', mane: ink };
      default:      return { fill: '#2C2624', patch: CREAM, line: ink, feat: CREAM, featPatch: ink, blush: '#E9826F', acc: ink, accLine: ink, item: CREAM, nose: ink, hi: '#2C2624', eyeWhite: CREAM, mane: ink };
    }
  }

  /* 매끈한 머리 모양: 위는 둥글고 아래는 살짝 넓적하게 */
  function head(cx, cy, rx, ry) {
    return curve([
      [cx, cy - ry], [cx + rx * 0.74, cy - ry * 0.7], [cx + rx, cy + ry * 0.04], [cx + rx * 0.8, cy + ry * 0.66],
      [cx, cy + ry * 0.95], [cx - rx * 0.8, cy + ry * 0.66], [cx - rx, cy + ry * 0.04], [cx - rx * 0.74, cy - ry * 0.7]
    ], true);
  }

  /* ─────────────── 얼굴 ─────────────── */

  var EXPR = ['bright', 'soft', 'grin', 'gentle', 'proud', 'soft', 'big', 'wink', 'grin', 'calm'];

  function eyes(c, ex, ey, onPatch) {
    var col = onPatch ? c.p.featPatch : c.p.feat, s = '', fem = c.gender === 'f', e = c.expr;
    var hiCol = onPatch ? c.p.patch : c.p.hi;
    function dot(x, y) {
      return ellipse(x, y, 4.6, 5.6, col) + (fem ? circle(x + 1.6, y - 2, 1.5, hiCol) : '');
    }
    function content(x, y) { return line('M' + (x - 6) + ' ' + (y - 1) + 'Q' + x + ' ' + (y + 5.5) + ' ' + (x + 6) + ' ' + (y - 1), col, FW); }
    function happy(x, y) { return line('M' + (x - 6) + ' ' + (y + 2.5) + 'Q' + x + ' ' + (y - 5) + ' ' + (x + 6) + ' ' + (y + 2.5), col, FW); }
    function big(x, y) {
      return circle(x, y, 9.5, c.p.eyeWhite, col, FW * 0.85) + circle(x + (x < 0 ? 1 : -1), y + 1, 5, col) +
        (fem ? circle(x + 2, y - 1.2, 1.4, c.p.eyeWhite) : '');
    }
    var L = -ex, R = ex;
    if (e === 'big') s += big(L, ey) + big(R, ey);
    else if (e === 'grin' || e === 'gentle') s += happy(L, ey) + happy(R, ey);
    else if (e === 'wink') s += dot(L, ey) + line('M' + (R - 5.5) + ' ' + (ey - 3.5) + 'L' + (R + 4.5) + ' ' + ey + 'L' + (R - 5.5) + ' ' + (ey + 3.5), col, FW);
    else if (e === 'proud') s += content(L, ey) + content(R, ey);
    else s += dot(L, ey) + dot(R, ey);

    if (fem) {   /* 속눈썹 두 가닥 */
      [-1, 1].forEach(function (k) {
        var x = k * ex + k * (e === 'big' ? 8.5 : 5), y = ey - (e === 'big' ? 5 : 3);
        if (e === 'wink' && k === 1) return;
        s += line('M' + x + ' ' + y + 'l' + (k * 4.5) + ' -3M' + (x - k * 2.2) + ' ' + (y - 2.6) + 'l' + (k * 3) + ' -4.2', col, FW * 0.7);
      });
    } else {     /* 눈썹 */
      var up = e === 'big' ? 15 : 11, tilt = e === 'big' ? 2.2 : 0.8;
      [-1, 1].forEach(function (k) {
        var x = k * ex, y = ey - up;
        s += line('M' + (x - k * 5.5) + ' ' + (y - tilt) + 'L' + (x + k * 5.5) + ' ' + (y + tilt * 0.3), col, FW * 1.15);
      });
    }
    return s;
  }

  function mouth(c, y, onPatch, w) {
    var col = onPatch ? c.p.featPatch : c.p.feat, e = c.expr, bg = onPatch ? c.p.patch : c.p.fill;
    w = w || 1;
    if (e === 'grin' || e === 'bright') {
      return shape('M' + (-7 * w) + ' ' + y + 'Q0 ' + (y + 13) + ' ' + (7 * w) + ' ' + y + 'Z', col, col, FW * 0.6) +
        D.fillOnly('M' + (-3.6 * w) + ' ' + (y + 6.8) + 'Q0 ' + (y + 3.4) + ' ' + (3.6 * w) + ' ' + (y + 6.8) + 'Q0 ' + (y + 9.6) + ' ' + (-3.6 * w) + ' ' + (y + 6.8) + 'Z', bg);
    }
    if (e === 'calm' || e === 'soft') return line('M' + (-6.5 * w) + ' ' + y + 'Q' + (-3.2 * w) + ' ' + (y + 4.6) + ' 0 ' + y + 'Q' + (3.2 * w) + ' ' + (y + 4.6) + ' ' + (6.5 * w) + ' ' + y, col, FW * 0.85);
    if (e === 'big') return ellipse(0, y + 2, 3.2, 3.8, col);
    return line('M' + (-5.5 * w) + ' ' + y + 'Q0 ' + (y + 6.5) + ' ' + (5.5 * w) + ' ' + y, col, FW * 0.85);
  }

  /* 볼터치 (여): 색 모드는 동그란 볼, 선 모드는 짧은 빗금 두 개 */
  function blush(c, x, y) {
    if (c.gender !== 'f') return '';
    if (!c.p.blush) {
      return [-1, 1].map(function (k) { return line('M' + (k * x - 4) + ' ' + (y + 2.5) + 'l4 -5M' + (k * x + 1) + ' ' + (y + 2.5) + 'l4 -5', c.p.line, FW * 0.6); }).join('');
    }
    return ellipse(-x, y, 6.2, 3.8, c.p.blush) + ellipse(x, y, 6.2, 3.8, c.p.blush);
  }

  /* ─────────────── 몸 · 팔 ─────────────── */

  var BODY = [[-25, 19], [-33, 42], [-32, 69], [-21, 85], [0, 88], [21, 85], [32, 69], [33, 42], [25, 19], [0, 15]];

  function body(c, opt) {
    opt = opt || {};
    var s = '', p = c.p, k = c.gender === 'm' ? 1.05 : 1;
    var pts = BODY.map(function (q) { return [q[0] * k, q[1]]; });
    if (!opt.noFeet) s += ellipse(-14, 88, 11.5, 7, p.fill, p.line, SW) + ellipse(14, 88, 11.5, 7, p.fill, p.line, SW);
    s += shape(curve(pts, true), p.fill, p.line, SW);
    s += ellipse(0, 61, 14, 13, p.patch, p.line, FW * 0.8);
    return s;
  }

  /* 자세: 천간마다 하나 */
  var POSES = [
    { id: 'up',       L: 'M-25 38C-39 30 -50 17 -57 4',  R: 'M25 38C39 30 50 17 57 4',  layer: 'behindHead' },
    { id: 'together', L: 'M-25 38C-30 50 -17 58 -6 56',  R: 'M25 38C30 50 17 58 6 56',  layer: 'front' },
    { id: 'wide',     L: 'M-25 38C-39 36 -52 30 -61 22', R: 'M25 38C39 36 52 30 61 22', layer: 'behindHead' },
    { id: 'lantern',  L: 'M-25 38C-33 48 -36 57 -36 65', R: 'M25 38C36 44 44 51 49 56', layer: 'front', hand: [51, 58] },
    { id: 'hips',     L: 'M-25 38C-45 42 -45 58 -30 62', R: 'M25 38C45 42 45 58 30 62', layer: 'front' },
    { id: 'pot',      L: 'M-25 38C-30 50 -21 57 -12 56', R: 'M25 38C30 50 21 57 12 56', layer: 'front', hand: [0, 57] },
    { id: 'flex',     L: 'M-25 38C-33 48 -36 57 -36 65', R: 'M25 38C44 37 53 27 53 9',  layer: 'behindHead', hand: [53, 3] },
    { id: 'cheek',    L: 'M-25 38C-41 35 -45 21 -37 10', R: 'M25 38C33 48 36 57 36 65', layer: 'cheek' },
    { id: 'wave',     L: 'M-25 38C-33 48 -36 57 -36 65', R: 'M25 38C43 30 54 15 57 -4', layer: 'behindHead' },
    { id: 'umbrella', L: 'M-25 38C-33 48 -36 57 -36 65', R: 'M25 38C36 43 44 42 49 35', layer: 'front', hand: [50, 33] }
  ];

  function arms(c, which) {
    var pose = c.pose, p = c.p;
    var paths = which === 'L' ? [pose.L] : which === 'R' ? [pose.R] : [pose.L, pose.R];
    return paths.map(function (d) { return capsule(d, 12, p.fill, p.line, SW); }).join('');
  }

  /* ─────────────── 성별 소품 ─────────────── */

  function bow(c, x, y, rot) {
    if (c.gender !== 'f') return '';
    var p = c.p;
    return D.g(shape('M0 0C-5 -9 -17 -11 -17 -2C-17 7 -6 6 0 0ZM0 0C5 -9 17 -11 17 -2C17 7 6 6 0 0Z', p.acc, p.accLine, FW) +
      circle(0, 0, 4, p.acc, p.accLine, FW * 0.85), 'translate(' + x + ' ' + y + ') rotate(' + (rot || 0) + ')');
  }

  function scarf(c) {
    if (c.gender !== 'm') return '';
    var p = c.p;
    return shape('M-27 20Q0 29 27 20Q14 36 2 51Q0 53 -2 51Q-14 36 -27 20Z', p.acc, p.accLine, FW) + circle(-21, 24, 4.4, p.acc, p.accLine, FW * 0.85);
  }

  function cowlick(c, x, y) {
    if (c.gender !== 'm' || c.hasHat) return '';
    return line('M' + x + ' ' + y + 'q-1 -10 8 -12', c.p.line, FW);
  }

  /* ─────────────── 천간 소품 ─────────────── */

  var HATS = {   /* (0,0) = 모자 밑동 가운데 */
    tree: function (c) {
      var p = c.p;
      return capsule('M0 2L0 -20', 7, p.item, p.line, FW) +
        shape('M-14 -22C-27 -22 -28 -38 -17 -40C-19 -53 -3 -58 2 -50C8 -58 24 -53 20 -40C30 -37 28 -22 15 -22Z', p.item, p.line, FW);
    },
    flower: function (c) {
      var p = c.p, s = line('M0 2Q2 -6 2 -15', p.line, FW * 0.9);
      for (var i = 0; i < 5; i++) {
        var a = i / 5 * Math.PI * 2 - Math.PI / 2;
        s += circle(2 + Math.cos(a) * 8.5, -25 + Math.sin(a) * 8.5, 6.6, p.item, p.line, FW * 0.85);
      }
      return s + circle(2, -25, 4.6, c.ink);
    },
    mountain: function (c) {
      var p = c.p;
      return shape('M-30 3L-13 -23Q-11 -26 -9 -23L-3 -14L7 -34Q9 -37 11 -34L30 3Q0 7 -30 3Z', p.item, p.line, FW) +
        D.fillOnly('M-17 -17L-13 -23Q-11 -26 -9 -23L-6 -18Q-9 -16 -11 -19Q-14 -16 -17 -17Z', p.line) +
        D.fillOnly('M2 -24L7 -34Q9 -37 11 -34L16 -24Q13 -22 10 -26Q6 -21 2 -24Z', p.line);
    },
    straw: function (c) {
      var p = c.p;
      return ellipse(0, 0, 32, 8, p.item, p.line, FW) + shape('M-15 -1C-16 -19 16 -19 15 -1Z', p.item, p.line, FW) +
        shape('M-15 -6Q0 -2 15 -6L15 -1Q0 3 -15 -1Z', c.ink, p.line, FW * 0.6);
    },
    helmet: function (c) {
      var p = c.p;
      return shape('M-23 2C-23 -28 23 -28 23 2Q0 6 -23 2Z', p.item, p.line, FW) + line('M-23 -3Q0 2 23 -3', p.line, FW * 0.7) +
        shape('M0 -22C-5 -31 -2 -41 7 -43C4 -37 7 -29 0 -22Z', c.ink, p.line, FW * 0.7);
    },
    gem: function (c) {
      var p = c.p;
      return line('M-29 6Q0 -11 29 6', p.line, FW * 1.5) + line('M-29 6Q0 -11 29 6', p.item, FW * 0.6) +
        shape('M-10 -4L-5 -13L5 -13L10 -4L0 9Z', p.item, p.line, FW) + line('M-10 -4H10', p.line, FW * 0.55);
    },
    wave: function (c) {
      var p = c.p;
      return shape('M-25 2C-25 -14 -13 -29 4 -31C17 -32 25 -23 23 -13C21 -6 12 -6 10 -11C8 -17 13 -19 15 -15C13 -24 0 -24 -7 -13C-11 -7 -9 0 -5 2Q-15 4 -25 2Z', p.item, p.line, FW);
    }
  };

  function sunHalo(c, cx, cy, r) {
    var s = circle(cx, cy, r, 'none', c.ink, FW), n = 12;
    for (var i = 0; i < n; i++) {
      var a = i / n * Math.PI * 2 + Math.PI / n, r1 = r + 7, r2 = r + 17;
      s += line('M' + D.r1(cx + Math.cos(a) * r1) + ' ' + D.r1(cy + Math.sin(a) * r1) + 'L' + D.r1(cx + Math.cos(a) * r2) + ' ' + D.r1(cy + Math.sin(a) * r2), c.ink, FW);
    }
    return s;
  }

  function lantern(c, x, y) {
    var p = c.p;
    return D.g(line('M0 -2L0 9', p.line, FW * 0.8) + shape('M-10 11C-13 18 -13 29 -10 35L10 35C13 29 13 18 10 11Z', c.ink, p.line, FW) +
      line('M-12 11H12M-11 35H11', p.line, FW * 1.1) + line('M0 36V43', p.line, FW * 0.8), 'translate(' + x + ' ' + y + ')');
  }

  function sproutPot(c, x, y) {
    var p = c.p;
    return D.g(line('M0 -4V-14', p.line, FW * 0.9) + shape('M0 -12C-3 -21 -12 -21 -14 -16C-8 -11 -4 -10 0 -12Z', p.item, p.line, FW * 0.8) +
      shape('M0 -14C3 -23 12 -25 15 -20C9 -13 5 -12 0 -14Z', p.item, p.line, FW * 0.8) +
      shape('M-13 -4L13 -4L9 13L-9 13Z', c.ink, p.line, FW), 'translate(' + x + ' ' + y + ')');
  }

  function dumbbell(c, x, y) {
    var p = c.p;
    return D.g(capsule('M-14 0L14 0', 4, p.item, p.line, FW * 0.8) + shape('M-20 -10h7v20h-7z', c.ink, p.line, FW * 0.8) +
      shape('M13 -10h7v20h-7z', c.ink, p.line, FW * 0.8), 'translate(' + x + ' ' + y + ') rotate(-8)');
  }

  function umbrella(c, hx, hy) {
    var p = c.p, top = [62, -60];
    var s = line('M' + hx + ' ' + hy + 'L' + top[0] + ' ' + top[1], p.line, FW * 1.1) + line('M' + hx + ' ' + hy + 'q-1 7 -7 6', p.line, FW * 1.1);
    s += D.g(shape('M-38 4C-36 -25 36 -25 38 4C31 0 25 0 19 5C13 0 6 0 0 5C-6 0 -13 0 -19 5C-25 0 -31 0 -38 4Z', p.item, p.line, FW) +
      line('M0 -18V5', p.line, FW * 0.6) + circle(0, -20, 2.8, c.ink), 'translate(' + top[0] + ' ' + top[1] + ') rotate(16)');
    s += shape('M-56 -64q-5 8 0 10q5 -2 0 -10z', 'none', c.ink, FW * 0.75) + shape('M-70 -34q-5 8 0 10q5 -2 0 -10z', 'none', c.ink, FW * 0.75);
    return s;
  }

  /* ─────────────── 발밑 물상 (지지) — 켤 때만, 아주 간단히 ─────────────── */

  function ground(c) {
    var ink = c.ink, w = FW * 0.9;
    switch (c.branch) {
      case 0: case 11: return line('M-70 100q9 -7 18 0t18 0t18 0t18 0t18 0t18 0t18 0t18 0', ink, w);                  /* 물결 */
      case 1: return line('M-64 99H64', ink, w) + line('M-56 80v10M-61 85h10M56 76v10M51 81h10', ink, w * 0.75);      /* 언 땅 · 눈 */
      case 2: case 3: return line('M-64 99H64', ink, w) + line('M-50 98l-4 -9M-46 98l2 -10M46 98l-2 -10M50 98l4 -9', ink, w * 0.8);  /* 풀 */
      case 4: return shape('M-50 100C-62 100 -62 86 -50 88C-46 78 -30 78 -28 86C-22 78 -8 80 -8 88C-2 80 14 80 16 88C22 80 36 82 36 90C46 88 52 100 42 100Z', c.paper, ink, w);  /* 구름 */
      case 5: case 6: case 7: return line('M-64 99H64', ink, w) + line('M-58 88q3 -5 0 -10M58 88q3 -5 0 -10', ink, w * 0.8);  /* 볕 */
      case 8: return shape('M-70 100C-72 88 -60 84 -52 89C-44 84 -36 92 -38 100Z', c.paper, ink, w) + shape('M40 100C38 90 48 86 56 90C64 86 72 94 68 100Z', c.paper, ink, w) + line('M-68 100H70', ink, w);  /* 바위 */
      case 9: return line('M-64 99H64', ink, w) + line('M-56 98Q-55 84 -46 76M56 98Q55 84 46 76', ink, w * 0.8);    /* 이삭 */
      default: return line('M-72 101Q0 88 72 101', ink, w);                                                        /* 언덕 */
    }
  }

  /* ─────────────── 동물 12 ─────────────── */
  /* { back, head, front, eyes:[ex,ey,onPatch], mouth:[y,onPatch,w], hat:[x,y,rot,s], bow:[x,y,rot], blush:[x,y], tail, top } */

  var ANIMALS = {
    rat: function (c) {
      var p = c.p;
      return {
        back: circle(-42, -52, 22, p.fill, p.line, SW) + circle(-41, -50, 12, p.patch) + circle(42, -52, 22, p.fill, p.line, SW) + circle(41, -50, 12, p.patch),
        head: shape(head(0, -14, 52, 44), p.fill, p.line, SW),
        front: ellipse(0, 4, 5, 4, p.nose) + line('M-33 6L-49 3M-33 12L-47 14M33 6L49 3M33 12L47 14', p.feat, FW * 0.6),
        eyes: [19, -13], mouth: [12, false, 0.85], hat: [0, -56], bow: [-37, -46, -25], blush: [30, 3],
        tail: line('M22 77C44 84 68 72 60 54C56 44 66 38 74 42', p.line, 4.6),
        top: [0, -58]
      };
    },
    ox: function (c) {
      var p = c.p;
      var horn = function (k) { return shape('M' + (k * -22) + ' -53C' + (k * -30) + ' -62 ' + (k * -40) + ' -70 ' + (k * -48) + ' -82C' + (k * -53) + ' -69 ' + (k * -48) + ' -55 ' + (k * -37) + ' -46Z', p.patch, p.line, SW); };
      var ear = function (k) { return shape('M' + (k * 48) + ' -37C' + (k * 63) + ' -46 ' + (k * 80) + ' -43 ' + (k * 80) + ' -34C' + (k * 77) + ' -25 ' + (k * 62) + ' -25 ' + (k * 50) + ' -27Z', p.fill, p.line, SW); };
      return {
        back: horn(1) + horn(-1) + ear(1) + ear(-1),
        head: shape(head(0, -14, 56, 44), p.fill, p.line, SW),
        front: ellipse(0, 10, 32, 18, p.patch, p.line, FW) + ellipse(-10, 7, 3.4, 4.6, p.nose) + ellipse(10, 7, 3.4, 4.6, p.nose),
        eyes: [24, -21], mouth: [18, true, 0.85], hat: [0, -56], bow: [-35, -50, -20], blush: [42, -6],
        tail: line('M24 74C44 74 54 60 54 44', p.line, 4.6) + shape('M54 44C48 38 50 30 56 26C56 32 62 34 60 40Z', p.line, p.line, FW * 0.6),
        top: [0, -58]
      };
    },
    tiger: function (c) {
      var p = c.p, st = p.feat;
      var stripe = function (x1, y1, x2, y2, w) {
        var dx = x2 - x1, dy = y2 - y1, L = Math.sqrt(dx * dx + dy * dy), nx = -dy / L * w, ny = dx / L * w;
        return D.fillOnly('M' + D.r1(x1 + nx) + ' ' + D.r1(y1 + ny) + 'L' + D.r1(x2) + ' ' + D.r1(y2) + 'L' + D.r1(x1 - nx) + ' ' + D.r1(y1 - ny) + 'Z', st);
      };
      return {
        back: circle(-39, -51, 14, p.fill, p.line, SW) + circle(-39, -50, 7, p.patch) + circle(39, -51, 14, p.fill, p.line, SW) + circle(39, -50, 7, p.patch),
        head: shape(head(0, -15, 54, 45), p.fill, p.line, SW),
        front: stripe(0, -59, 0, -46, 4) + stripe(-12, -56, -9, -46, 3) + stripe(12, -56, 9, -46, 3) +
          stripe(-54, -14, -40, -12, 3.4) + stripe(54, -14, 40, -12, 3.4) +
          ellipse(-8.5, 10, 10, 7.5, p.patch, p.line, FW * 0.75) + ellipse(8.5, 10, 10, 7.5, p.patch, p.line, FW * 0.75) +
          shape('M-5.5 1Q0 -1.5 5.5 1Q4 6 0 7Q-4 6 -5.5 1Z', p.nose, p.nose, FW * 0.5),
        eyes: [21, -17], mouth: [20, false, 0.75], hat: [0, -58], bow: [-35, -48, -25], blush: [35, 0],
        tail: capsule('M24 76C48 76 66 64 63 42', 9, p.fill, p.line, SW) + line('M52 72l3 -7M61 59l6 -4', st, FW * 0.8),
        top: [0, -60]
      };
    },
    rabbit: function (c) {
      var p = c.p;
      var ear = function (k, rot) {
        return D.g(shape('M-10 0C-15 -28 -11 -55 0 -61C11 -55 15 -28 10 0Z', p.fill, p.line, SW) +
          shape('M-4.5 -7C-7 -27 -5 -45 0 -51C5 -45 7 -27 4.5 -7Z', p.patch), 'translate(' + (k * 19) + ' -45) rotate(' + rot + ')');
      };
      return {
        back: ear(-1, -8) + ear(1, 22),
        head: shape(head(0, -12, 48, 41), p.fill, p.line, SW),
        front: shape('M-4.5 1Q0 -1.5 4.5 1Q3 5.5 0 5.5Q-3 5.5 -4.5 1Z', p.nose, p.nose, FW * 0.45),
        eyes: [18, -12], mouth: [9, false, 0.7], hat: [0, -50], bow: [-23, -50, -10], blush: [30, 3],
        tail: circle(33, 72, 10, p.patch, p.line, FW),
        top: [0, -54]
      };
    },
    dragon: function (c) {
      var p = c.p;
      var antler = function (k) { return capsule('M' + (k * 19) + ' -52C' + (k * 25) + ' -68 ' + (k * 29) + ' -80 ' + (k * 33) + ' -92', 6.5, p.patch, p.line, FW) + capsule('M' + (k * 27) + ' -76C' + (k * 35) + ' -78 ' + (k * 41) + ' -83 ' + (k * 44) + ' -89', 5.5, p.patch, p.line, FW); };
      var fin = function (k) { return shape('M' + (k * 50) + ' -33L' + (k * 70) + ' -43L' + (k * 63) + ' -30L' + (k * 72) + ' -22L' + (k * 52) + ' -19Z', p.fill, p.line, SW * 0.9); };
      return {
        back: antler(-1) + antler(1) + fin(-1) + fin(1),
        head: shape(head(0, -15, 54, 45), p.fill, p.line, SW),
        front: ellipse(0, 9, 27, 16, p.patch, p.line, FW) + circle(-8, 4, 2.3, p.featPatch) + circle(8, 4, 2.3, p.featPatch) +
          line('M-27 9C-40 12 -50 4 -60 10M27 9C40 12 50 4 60 10', p.line, FW * 0.7),
        eyes: [21, -20], mouth: [16, true, 0.85], hat: [0, -58], bow: [-37, -46, -25], blush: [39, -4],
        tail: capsule('M24 76C50 80 72 62 63 40', 9, p.fill, p.line, SW) + D.fillOnly('M66 56l8 -2l-6 -6zM64 41l6 -5l-8 -2z', p.line),
        top: [0, -60]
      };
    },
    snake: function (c) {
      var p = c.p, dots = '';
      [[-26, 80], [0, 82], [26, 80], [-14, 59], [14, 59]].forEach(function (q) { dots += circle(q[0], q[1], 2.6, p.feat); });
      return {
        snakeBody: line('M46 84C64 88 78 78 74 64C72 56 78 50 86 54', p.line, 12) + line('M46 84C64 88 78 78 74 64C72 56 78 50 86 54', p.fill, 5) +
          shape(curve([[-52, 80], [-44, 68], [0, 64], [44, 68], [54, 80], [44, 94], [0, 98], [-44, 94]], true), p.fill, p.line, SW) +
          shape(curve([[-38, 62], [-32, 50], [0, 46], [32, 50], [38, 62], [30, 72], [0, 76], [-30, 72]], true), p.fill, p.line, SW) +
          capsule('M10 62C16 46 -14 36 -6 18C-2 8 2 4 0 -4', 26, p.fill, p.line, SW) + dots,
        head: shape(curve([[-45, -28], [-37, -51], [0, -57], [37, -51], [45, -28], [35, -5], [0, 3], [-35, -5]], true), p.fill, p.line, SW),
        front: '',
        eyes: [18, -27], mouth: [-13, false, 0.75],
        tongue: line('M0 1V11M0 11l-4.5 6M0 11l4.5 6', c.el === 'fire' && c.mode !== 'line' ? CREAM : c.ink, FW * 0.85),
        hat: [0, -54], bow: [-33, -44, -25], blush: [30, -13],
        tail: '', top: [0, -56]
      };
    },
    horse: function (c) {
      var p = c.p, mane = p.mane;
      var ear = function (k) { return shape('M' + (k * 19) + ' -55C' + (k * 21) + ' -70 ' + (k * 28) + ' -83 ' + (k * 33) + ' -89C' + (k * 41) + ' -78 ' + (k * 40) + ' -63 ' + (k * 36) + ' -53Z', p.fill, p.line, SW) +
        shape('M' + (k * 25) + ' -59C' + (k * 27) + ' -68 ' + (k * 30) + ' -77 ' + (k * 33) + ' -81C' + (k * 37) + ' -74 ' + (k * 36) + ' -65 ' + (k * 33) + ' -58Z', p.patch); };
      return {
        back: ear(-1) + ear(1) + shape('M26 -54C40 -56 50 -48 50 -38C58 -34 60 -22 54 -16C62 -10 58 2 50 4L36 -30Z', mane, p.line, FW),
        head: shape(curve([[-45, -28], [-35, -57], [0, -65], [35, -57], [45, -28], [39, 2], [0, 12], [-39, 2]], true), p.fill, p.line, SW),
        front: ellipse(0, 6, 26, 16, p.patch, p.line, FW) + ellipse(-9.5, 3, 3, 4.4, p.featPatch) + ellipse(9.5, 3, 3, 4.4, p.featPatch) +
          shape('M-17 -55C-19 -68 -6 -72 -2 -63C2 -74 15 -72 15 -61C22 -64 24 -53 17 -49C10 -55 4 -51 0 -49C-6 -53 -11 -51 -17 -55Z', mane, p.line, FW),
        eyes: [19, -28], mouth: [13, true, 0.8], hat: [0, -62], bow: [-27, -57, -15], blush: [32, -12],
        tail: shape('M24 66C40 60 56 66 62 80C54 76 50 80 54 88C44 80 34 74 24 76Z', mane, p.line, FW),
        top: [0, -64]
      };
    },
    sheep: function (c) {
      var p = c.p, horn = function (k) { return circle(k * 42, -8, 12, p.patch, p.line, FW) + line('M' + (k * 42) + ' -8m' + (k * -4.5) + ' 0a4.5 4.5 0 1 0 ' + (k * 4.5) + ' -4.5', p.line, FW * 0.65); };
      return {
        back: shape(D.scallop(0, -20, 52, 44, 11, 6, -Math.PI / 2), p.fill, p.line, SW),
        head: shape(head(0, -4, 33, 35), p.patch, p.line, SW) + horn(-1) + horn(1),
        front: shape('M-4.5 3Q0 0.5 4.5 3Q3 7 0 7Q-3 7 -4.5 3Z', p.featPatch, p.featPatch, FW * 0.45),
        eyes: [13.5, -8, true], mouth: [11, true, 0.7], hat: [0, -66], bow: [-37, -48, -25], blush: [22, 3],
        tail: circle(33, 70, 9, p.fill, p.line, FW),
        top: [0, -68], woolBody: true
      };
    },
    monkey: function (c) {
      var p = c.p;
      return {
        back: circle(-50, -14, 16, p.fill, p.line, SW) + circle(-49, -13, 9, p.patch) + circle(50, -14, 16, p.fill, p.line, SW) + circle(49, -13, 9, p.patch),
        head: shape(head(0, -16, 48, 44), p.fill, p.line, SW),
        front: shape(curve([[-30, -22], [-24, -35], [-12, -37], [0, -29], [12, -37], [24, -35], [30, -22], [28, -3], [20, 14], [0, 22], [-20, 14], [-28, -3]], true), p.patch, p.line, FW) +
          circle(-3.2, 2, 1.8, p.featPatch) + circle(3.2, 2, 1.8, p.featPatch),
        eyes: [14.5, -18, true], mouth: [9, true, 0.8], hat: [0, -58], bow: [-33, -50, -20], blush: [21, -2],
        tail: line('M24 76C50 80 68 60 60 42C56 34 47 36 49 44', p.line, 4.8),
        top: [0, -60]
      };
    },
    rooster: function (c) {
      var p = c.p, comb = c.el === 'fire' && c.mode !== 'line' ? p.line : c.ink;
      var cx = c.hasHat ? -15 : 0;
      return {
        back: shape('M16 66C20 42 38 22 56 16C49 29 42 46 33 70Z', p.fill, p.line, FW) +
          shape('M22 72C34 52 54 42 72 42C61 51 52 62 39 78Z', p.fill, p.line, FW),
        head: shape(head(0, -16, 48, 44), p.fill, p.line, SW),
        front: shape('M2 7C8 8 10 19 4 22C-1 20 -3 11 2 7Z', comb, p.line, FW * 0.7) + shape('M-9 -4Q0 -8 9 -4L1 9Z', p.patch, p.line, FW * 0.8),
        comb: D.g(shape('M-17 -53C-24 -62 -17 -73 -9 -66C-10 -81 7 -82 7 -67C14 -76 25 -67 19 -55C10 -58 -8 -58 -17 -53Z', comb, p.line, FW), 'translate(' + cx + ' 0)'),
        eyes: [19, -20], mouth: null, hat: [17, -57, 14, 0.85], bow: [-36, -44, -25], blush: [31, 0],
        tail: '', top: [0, -62], chickenFeet: true
      };
    },
    dog: function (c) {
      var p = c.p;
      var ear = function (k) { return shape(curve([[k * 27, -56], [k * 48, -56], [k * 63, -37], [k * 68, -5], [k * 61, 12], [k * 50, 8], [k * 44, -16], [k * 33, -39]], true), p.fill, p.line, SW); };
      return {
        back: '',
        head: shape(head(0, -16, 52, 44), p.fill, p.line, SW),
        front: ear(-1) + ear(1) + ellipse(0, 9, 24, 16, p.patch, p.line, FW) + ellipse(0, 1, 8, 6, p.nose),
        eyes: [21, -20], mouth: [9, true, 0.8], hat: [0, -58], bow: [-29, -54, -15], blush: [35, 0],
        tail: capsule('M25 74C42 70 46 59 39 51', 8, p.fill, p.line, SW),
        top: [0, -60]
      };
    },
    pig: function (c) {
      var p = c.p;
      var ear = function (k) { return shape('M' + (k * 25) + ' -53L' + (k * 50) + ' -77L' + (k * 52) + ' -44Z', p.fill, p.line, SW) + shape('M' + (k * 32) + ' -54L' + (k * 47) + ' -67L' + (k * 47) + ' -51Z', p.patch); };
      return {
        back: ear(-1) + ear(1),
        head: shape(head(0, -14, 54, 45), p.fill, p.line, SW),
        front: ellipse(0, 4, 18, 12.5, p.patch, p.line, FW) + ellipse(-6, 4, 2.8, 4.3, p.featPatch) + ellipse(6, 4, 2.8, 4.3, p.featPatch),
        eyes: [24, -19], mouth: [21, false, 0.75], hat: [0, -56], bow: [-29, -54, -15], blush: [39, 2],
        tail: line('M28 70C40 60 50 72 42 76C36 79 36 68 46 66', p.line, FW * 1.05),
        top: [0, -58]
      };
    }
  };

  var HAT_BY_STEM = ['tree', 'flower', null, null, 'mountain', 'straw', 'helmet', 'gem', 'wave', null];

  /* 양의 털 몸 */
  function woolBody(c) {
    var p = c.p;
    return ellipse(-14, 88, 11, 7, p.patch, p.line, SW) + ellipse(14, 88, 11, 7, p.patch, p.line, SW) +
      shape(D.scallop(0, 54, 30, 30, 10, 4, -Math.PI / 2), p.fill, p.line, SW) + ellipse(0, 61, 13, 12, p.patch, p.line, FW * 0.8);
  }

  /* 뱀 (남): 목에 두른 짧은 띠 */
  function scarfSnake(c) {
    if (c.gender !== 'm') return '';
    var p = c.p;
    return shape('M-22 30Q0 39 22 30L20 39Q0 48 -20 39Z', p.acc, p.accLine, FW) + circle(16, 38, 4.2, p.acc, p.accLine, FW * 0.85);
  }

  /* ─────────────── 조립 ─────────────── */

  /* 캐릭터 한 마리를 <g> 글자로. opts: { ink, paper, mode:'color'|'line', ground:false } */
  function render(index, gender, opts) {
    opts = opts || {};
    var info = G.ilju(index);
    var ink = opts.ink || '#C93B22', paper = opts.paper || '#F2BE35', mode = opts.mode || 'color';
    var c = {
      index: info.index, stem: info.stem, branch: info.branch, el: info.el, animal: info.animal,
      gender: gender === 'm' ? 'm' : 'f', mode: mode, ink: ink, paper: paper,
      p: palette(info.el, mode, ink, paper), expr: EXPR[info.stem], pose: POSES[info.stem],
      hasHat: !!HAT_BY_STEM[info.stem]
    };
    var A = ANIMALS[c.animal](c);
    var snake = c.animal === 'snake';
    var out = [];

    if (opts.ground) out.push(ground(c));
    if (c.stem === 2) out.push(sunHalo(c, 0, -18, 72));        /* 병: 등 뒤의 해 */

    out.push(A.tail || '');
    if (snake) {
      out.push(A.snakeBody);
    } else {
      if (A.chickenFeet) out.push(line('M-14 86v7M-14 93l-6 5M-14 93v7M-14 93l6 5M14 86v7M14 93l-6 5M14 93v7M14 93l6 5', c.p.line, FW));
      out.push(A.woolBody ? woolBody(c) : body(c, { noFeet: A.chickenFeet }));
      out.push(scarf(c));
      if (c.pose.layer === 'cheek') out.push(arms(c, 'R'));
      else if (c.pose.id !== 'pot') out.push(arms(c));
    }
    if (snake) out.push(scarfSnake(c));
    out.push(A.back || '');
    out.push(A.head);
    out.push(A.front || '');
    if (A.comb) out.push(A.comb);
    out.push(blush(c, A.blush[0], A.blush[1]));
    out.push(eyes(c, A.eyes[0], A.eyes[1], A.eyes[2]));
    if (A.mouth) out.push(mouth(c, A.mouth[0], A.mouth[1], A.mouth[2]));
    if (A.tongue) out.push(A.tongue);
    out.push(cowlick(c, A.top[0] - 3, A.top[1] + 5));

    var hat = HAT_BY_STEM[c.stem];
    if (hat) {
      var hx = A.hat[0], hy = A.hat[1] + (hat === 'gem' ? 8 : 0), hr = A.hat[2] || 0, hs = A.hat[3] || 1;
      out.push(D.g(HATS[hat](c), 'translate(' + hx + ' ' + hy + ') rotate(' + hr + ') scale(' + hs + ')'));
    }
    out.push(bow(c, A.bow[0], A.bow[1], A.bow[2]));

    if (!snake && c.pose.layer === 'cheek') out.push(arms(c, 'L'));
    var hand = c.pose.hand;
    if (c.stem === 3) out.push(snake ? lantern(c, 72, 34) : lantern(c, hand[0], hand[1]));
    if (c.stem === 5) out.push(snake ? sproutPot(c, -64, 84) : sproutPot(c, hand[0], hand[1]) + arms(c));
    if (c.stem === 6) out.push(snake ? dumbbell(c, 70, 52) : dumbbell(c, hand[0], hand[1]));
    if (c.stem === 9) out.push(snake ? umbrella(c, 82, 54) : umbrella(c, hand[0], hand[1]));

    return '<g class="char" stroke-linecap="round" stroke-linejoin="round">' + out.join('') + '</g>';
  }

  /* 썸네일 · 시트용: 혼자 서는 <svg> */
  function svg(index, gender, opts) {
    opts = opts || {};
    var vb = opts.viewBox || '-108 -128 216 236';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '"' + (opts.size ? ' width="' + opts.size + '"' : '') + '>' +
      (opts.filter ? '<g filter="url(#' + opts.filter + ')">' : '<g>') + render(index, gender, opts) + '</g></svg>';
  }

  /* 이미지 프롬프트에 넣을 캐릭터 설명 */
  function describe(index, gender) {
    var info = G.ilju(index), m = gender === 'm';
    return {
      ko: info.ko + '일주 ' + (m ? '남' : '여') + ' — ' + info.title + ' 캐릭터 (' + info.item.ko + '). ' +
        (m ? '짧은 눈썹, 목에 두른 수건' : '속눈썹, 리본, 볼터치'),
      en: 'a cute chibi ' + info.colorEn + ' ' + info.animalEn + ' character (' + (m ? 'boy, short eyebrows, a neckerchief' : 'girl, eyelashes, a ribbon bow, rosy cheeks') + '), ' + info.item.en
    };
  }

  BJ.chars = { render: render, svg: svg, describe: describe, palette: palette, SW: SW };
})();
