/* 소품 · 장식 그림. 모두 빨간 선 하나 (ink) 로, 가운데 (0,0) 기준 ±40 안쪽에 그린다.
 * o = { ink, paper, sw } — sw 는 이 소품 좌표에서의 선 굵기 (크기를 키워도 선이 너무 굵어지지 않게 card.js 가 맞춰 준다).
 * 글자 도장 (福 · 吉 …) 은 한자 글꼴을 쓴다 (card.js 의 HANJA_FONT).
 */
(function () {
  'use strict';
  var BJ = window.BJ = window.BJ || {};
  var D = BJ.draw;
  var r1 = D.r1;

  function L(d, o, k) { return D.line(d, o.ink, o.sw * (k || 1)); }
  function S(d, o, fill, k) { return D.shape(d, fill === 'ink' ? o.ink : (fill || o.paper), o.ink, o.sw * (k || 1)); }
  function F(d, o) { return D.fillOnly(d, o.ink); }
  function C(cx, cy, r, o, fill, k) { return D.circle(cx, cy, r, fill === 'ink' ? o.ink : (fill === 'none' ? 'none' : (fill || o.paper)), o.ink, o.sw * (k || 1)); }

  var HANJA_FONT = "'Noto Serif KR', 'Nanum Myeongjo', serif";
  function sealText(txt, round) {
    return function (o) {
      var n = txt.length, fs = n === 1 ? 46 : 30, s = '';
      s += round ? C(0, 0, 34, o, 'ink', 0.8) : S('M-32 -32H32V32H-32Z', o, 'ink', 0.8);
      s += round ? D.circle(0, 0, 28, 'none', o.paper, o.sw * 0.55) : D.shape('M-26 -26H26V26H-26Z', 'none', o.paper, o.sw * 0.55);
      if (n <= 2) {
        s += '<text x="0" y="' + (n === 1 ? 2 : 2) + '" text-anchor="middle" dominant-baseline="central" font-family="' + HANJA_FONT.replace(/"/g, '') + '" font-weight="900" font-size="' + fs + '" fill="' + o.paper + '"' +
          (n === 2 ? ' textLength="44" lengthAdjust="spacingAndGlyphs"' : '') + '>' + txt + '</text>';
      }
      return s;
    };
  }

  var P = {};
  function add(id, name, cat, fn) { P[id] = { id: id, name: name, cat: cat, draw: fn }; }

  /* ── 반짝 · 기본 장식 ── */
  add('star', '별', 'deco', function (o) { return S(D.curve(D.starPts(0, 2, 34, 15, 5), true, 0.35), o, null); });
  add('starFill', '꽉 찬 별', 'deco', function (o) { return S(D.curve(D.starPts(0, 2, 34, 15, 5), true, 0.35), o, 'ink'); });
  add('sparkle', '반짝이', 'deco', function (o) { return S('M0 -36Q4 -4 36 0Q4 4 0 36Q-4 4 -36 0Q-4 -4 0 -36Z', o, null); });
  add('plus', '십자 반짝', 'deco', function (o) { return L('M0 -30V30M-30 0H30', o, 1.25); });
  add('plus2', '십자 두 개', 'deco', function (o) { return L('M-14 -34V2M-32 -16H4M18 6V34M6 20H30', o, 1.1); });
  add('dots', '점 세 개', 'deco', function (o) { return C(0, -24, 7, o, 'ink', 0.3) + C(0, 0, 7, o, 'ink', 0.3) + C(0, 24, 7, o, 'ink', 0.3); });
  add('rays', '집중선', 'deco', function (o) { return L('M0 -34V-8M-24 -26L-10 -6M24 -26L10 -6M-36 -6L-16 2M36 -6L16 2', o); });
  add('squiggle', '꼬불선', 'deco', function (o) { return L('M-4 -38C14 -32 14 -20 0 -14C14 -8 14 4 0 10C14 16 14 28 -2 34', o); });
  add('beads', '구슬줄', 'deco', function (o) { var s = ''; for (var i = -2; i <= 2; i++) s += C(i * 15, 0, 6, o, null, 0.7); return s + L('M-40 0h4M36 0h4', o, 0.7); });
  add('lines', '세 줄', 'deco', function (o) { return L('M-36 -16H36M-36 0H28M-36 16H36', o); });
  add('heart', '하트', 'deco', function (o) { return S('M0 30C-30 10 -38 -6 -32 -20C-26 -34 -8 -34 0 -18C8 -34 26 -34 32 -20C38 -6 30 10 0 30Z', o, null); });
  add('heartFill', '꽉 찬 하트', 'deco', function (o) { return S('M0 30C-30 10 -38 -6 -32 -20C-26 -34 -8 -34 0 -18C8 -34 26 -34 32 -20C38 -6 30 10 0 30Z', o, 'ink'); });
  add('cloud', '구름', 'deco', function (o) { return S('M-34 14C-46 14 -46 -4 -32 -2C-32 -18 -12 -22 -6 -10C0 -24 24 -22 24 -6C38 -10 46 10 32 14Z', o, null) + L('M-18 6q6 4 12 0', o, 0.6); });
  add('cloudCurl', '구름 꼬리', 'deco', function (o) { return S('M-36 10C-44 -6 -28 -16 -18 -8C-14 -24 10 -26 14 -10C24 -18 40 -8 32 6C28 14 14 14 10 6C14 2 20 4 18 8', o, null); });
  add('moon', '달', 'deco', function (o) { return S('M8 -32C-14 -30 -28 -12 -26 8C-24 26 -6 36 12 32C-4 26 -12 12 -10 -2C-8 -18 0 -28 8 -32Z', o, null) + C(18, -14, 3, o, 'ink', 0.3); });
  add('sun', '해', 'deco', function (o) {
    var s = C(0, 0, 15, o, null);
    for (var i = 0; i < 10; i++) { var a = i / 10 * Math.PI * 2; s += L('M' + r1(Math.cos(a) * 22) + ' ' + r1(Math.sin(a) * 22) + 'L' + r1(Math.cos(a) * (i % 2 ? 30 : 34)) + ' ' + r1(Math.sin(a) * (i % 2 ? 30 : 34)), o); }
    return s;
  });
  add('rainbow', '무지개', 'deco', function (o) { return L('M-36 18A36 36 0 0 1 36 18M-26 18A26 26 0 0 1 26 18M-16 18A16 16 0 0 1 16 18', o) + S('M-44 22C-48 14 -36 8 -32 14C-28 8 -18 12 -22 22Z', o, null, 0.8) + S('M22 22C18 12 28 8 32 14C36 8 48 14 44 22Z', o, null, 0.8); });
  add('flower', '꽃', 'deco', function (o) { var s = ''; for (var i = 0; i < 5; i++) { var a = i / 5 * Math.PI * 2 - Math.PI / 2; s += C(r1(Math.cos(a) * 15), r1(Math.sin(a) * 15), 12, o, null, 0.9); } return s + C(0, 0, 8, o, 'ink', 0.5); });
  add('clover', '네잎클로버', 'deco', function (o) {
    var s = L('M2 6Q8 24 18 34', o);
    for (var i = 0; i < 4; i++) s += D.g(S('M0 0C-4 -6 -16 -10 -18 -20C-20 -28 -8 -32 0 -22C8 -32 20 -28 18 -20C16 -10 4 -6 0 0Z', o, null, 0.9), 'rotate(' + (i * 90 + 45) + ')');
    return s;
  });
  add('leaf', '나뭇잎', 'deco', function (o) { return S('M-28 22C-30 -8 -6 -30 30 -28C28 4 6 28 -28 22Z', o, null) + L('M-28 22L22 -22M-6 0l-2 -12M6 -10l10 0', o, 0.7); });
  add('sprout', '새싹', 'deco', function (o) { return L('M0 32V0', o) + S('M0 4C-6 -14 -26 -18 -32 -8C-22 4 -10 8 0 4Z', o, null) + S('M0 -2C4 -22 24 -30 32 -20C24 -6 12 0 0 -2Z', o, null); });
  add('drop', '물방울', 'deco', function (o) { return S('M0 -34C10 -16 22 -2 22 12C22 26 12 34 0 34C-12 34 -22 26 -22 12C-22 -2 -10 -16 0 -34Z', o, null) + L('M-10 10q0 10 8 14', o, 0.6); });
  add('wave', '물결', 'deco', function (o) { return L('M-40 -8q10 -10 20 0t20 0t20 0t20 0M-40 10q10 -10 20 0t20 0t20 0t20 0', o); });
  add('note', '음표', 'deco', function (o) { return L('M-10 20V-26L22 -32V14', o) + D.ellipse(-18, 22, 10, 8, o.ink, null, 0, -20) + D.ellipse(14, 16, 10, 8, o.ink, null, 0, -20); });
  add('bow', '리본', 'deco', function (o) { return S('M0 0C-8 -16 -34 -20 -34 -2C-34 14 -10 12 0 0ZM0 0C8 -16 34 -20 34 -2C34 14 10 12 0 0Z', o, null) + C(0, 0, 7, o, 'ink', 0.8) + L('M-4 6l-8 20M4 6l8 20', o); });
  add('paw', '발자국', 'deco', function (o) { return D.ellipse(0, 10, 15, 13, o.ink) + D.ellipse(-17, -8, 6, 8, o.ink, null, 0, -20) + D.ellipse(-6, -20, 6, 8, o.ink) + D.ellipse(7, -20, 6, 8, o.ink) + D.ellipse(18, -8, 6, 8, o.ink, null, 0, 20); });
  add('bone', '뼈다귀', 'deco', function (o) { return S('M-24 -8C-30 -20 -42 -10 -34 -2C-42 6 -32 18 -24 6L24 6C30 18 42 8 34 0C42 -8 32 -20 24 -8Z', o, null); });
  add('fish', '생선', 'deco', function (o) { return S('M-30 0C-16 -18 12 -18 22 0C12 18 -16 18 -30 0Z', o, null) + S('M22 0L38 -14L36 14Z', o, null) + C(-16, -3, 3.2, o, 'ink', 0.3) + L('M-4 -10Q2 0 -4 10', o, 0.7); });
  add('swirl', '소용돌이', 'deco', function (o) { return L('M0 0C4 -4 10 0 8 6C6 14 -6 14 -10 6C-16 -6 -6 -18 6 -18C22 -18 30 -2 24 12C18 26 -2 32 -16 26', o); });
  add('confetti', '꽃가루', 'deco', function (o) { return L('M-30 -24l8 4M-6 -32l2 9M20 -26l-6 7M30 2l-9 -1M-34 8l8 -4M-12 18l6 6M14 24l2 -9', o) + C(-2, -2, 4, o, 'ink', 0.3) + C(18, 6, 3, o, 'ink', 0.3); });

  /* ── 건강 ── */
  add('pill', '알약', 'health', function (o) { return D.g(S('M-30 0A12 12 0 0 1 -18 -12H0V12H-18A12 12 0 0 1 -30 0Z', o, 'ink', 0.9) + S('M0 -12H18A12 12 0 0 1 18 12H0Z', o, null, 0.9), 'rotate(-30)'); });
  add('bottle', '약병', 'health', function (o) { return S('M-10 -34H10V-24H-10Z', o, 'ink', 0.8) + S('M-8 -24H8V-16C20 -12 22 -4 22 4V30Q0 36 -22 30V4C-22 -4 -20 -12 -8 -16Z', o, null) + L('M0 0V18M-9 9H9', o, 1.1); });
  add('bandage', '반창고', 'health', function (o) { return D.g(S('M-36 -12H36V12H-36Z', o, null, 0.9) + S('M-12 -12H12V12H-12Z', o, null, 0.7) + C(-4, -4, 1.8, o, 'ink', 0.2) + C(4, 4, 1.8, o, 'ink', 0.2) + C(4, -4, 1.8, o, 'ink', 0.2) + C(-4, 4, 1.8, o, 'ink', 0.2), 'rotate(-35)'); });
  add('apple', '사과', 'health', function (o) { return S('M0 -14C-14 -24 -32 -16 -30 4C-28 24 -12 34 0 28C12 34 28 24 30 4C32 -16 14 -24 0 -14Z', o, null) + L('M0 -14Q2 -24 6 -30', o) + S('M4 -24C10 -34 22 -34 24 -28C18 -22 10 -22 4 -24Z', o, null, 0.8) + L('M-18 0q0 -8 6 -10', o, 0.6); });
  add('ginseng', '인삼', 'health', function (o) {
    return S('M-4 -12C-12 -6 -12 10 -16 22C-18 30 -12 32 -8 24C-6 30 0 34 2 26C6 32 12 30 10 22C8 10 10 -6 4 -12Z', o, null) +
      L('M-14 28l-6 8M10 26l6 7M-4 0q4 2 8 0M-6 10q5 2 10 0', o, 0.6) + L('M0 -12V-24M0 -24L-12 -32M0 -24L12 -32M0 -24L0 -36', o, 0.8) +
      C(-14, -34, 3.5, o, 'ink', 0.2) + C(14, -34, 3.5, o, 'ink', 0.2) + C(0, -38, 3.5, o, 'ink', 0.2);
  });
  add('heartbeat', '튼튼 하트', 'health', function (o) { return S('M0 30C-30 10 -38 -6 -32 -20C-26 -34 -8 -34 0 -18C8 -34 26 -34 32 -20C38 -6 30 10 0 30Z', o, null) + L('M-24 0H-12L-6 -12L2 12L8 -4H24', o, 0.9); });
  add('cross', '구급 십자', 'health', function (o) { return S('M-10 -30H10V-10H30V10H10V30H-10V10H-30V-10H-10Z', o, null); });

  /* ── 재물 ── */
  add('coin', '엽전', 'money', function (o) { return C(0, 0, 30, o, null) + C(0, 0, 23, o, 'none', 0.5) + S('M-8 -8H8V8H-8Z', o, null, 0.9) + L('M0 -20V-14M0 14V20M-20 0H-14M14 0H20', o, 0.6); });
  add('coins', '엽전 꾸러미', 'money', function (o) { return C(-12, 8, 20, o, null, 0.9) + S('M-17 3H-7V13H-17Z', o, null, 0.6) + C(14, -6, 20, o, null, 0.9) + S('M9 -11H19V-1H9Z', o, null, 0.6); });
  add('goldbar', '금괴', 'money', function (o) { return S('M-34 16L-24 -8H24L34 16Z', o, null) + S('M-24 -8L-14 -26H14L24 -8', o, null, 0.9) + L('M-10 4h20', o, 0.6) + L('M32 -30l0 10M27 -25l10 0', o, 0.7); });
  add('pouch', '복주머니', 'money', function (o) {
    return S('M-14 -18C-34 -8 -36 22 -18 30H18C36 22 34 -8 14 -18Z', o, null) + S('M-14 -18C-18 -24 -10 -30 0 -26C10 -30 18 -24 14 -18Q0 -14 -14 -18Z', o, null, 0.8) +
      L('M-12 -16q12 6 24 0', o, 0.7) + L('M10 -18l10 -12M14 -18l14 -6', o, 0.7) + C(0, 8, 9, o, null, 0.7) + L('M-4 8h8M0 4v8', o, 0.5);
  });
  add('bill', '돈다발', 'money', function (o) { return S('M-36 -10H32V18H-36Z', o, null, 0.9) + S('M-32 -16H36V12H-32Z', o, null) + C(2, -2, 8, o, null, 0.7) + L('M-26 -10v10M26 -10v10', o, 0.6) + S('M-6 -16H8V12H-6Z', o, 'ink', 0.4); });
  add('piggy', '돼지 저금통', 'money', function (o) { return S('M-30 2C-30 -18 -10 -26 8 -24C24 -22 34 -10 32 6C30 20 16 26 0 26C-18 26 -30 20 -30 2Z', o, null) + S('M30 -4C38 -6 40 6 32 8Z', o, null, 0.8) + S('M-20 -18L-24 -30L-10 -24Z', o, null, 0.8) + L('M-4 -24h12', o, 1.2) + C(-14, -6, 2.6, o, 'ink', 0.2) + L('M-18 24v8M14 24v8', o); });
  add('gourd', '호리병', 'money', function (o) { return S('M0 -28C-8 -28 -10 -18 -6 -12C-18 -8 -24 4 -22 16C-20 30 20 30 22 16C24 4 18 -8 6 -12C10 -18 8 -28 0 -28Z', o, null) + L('M-6 -12h12', o, 0.8) + L('M0 -28c4 -6 10 -6 12 -2', o, 0.8); });

  /* ── 학업 · 합격 ── */
  add('book', '책', 'study', function (o) { return S('M0 -18C-10 -26 -24 -26 -34 -20V22C-24 16 -10 16 0 24C10 16 24 16 34 22V-20C24 -26 10 -26 0 -18Z', o, null) + L('M0 -18V24M-26 -8q10 -4 20 0M-26 2q10 -4 20 0M6 -8q10 -4 20 0', o, 0.6); });
  add('pencil', '연필', 'study', function (o) { return D.g(S('M-30 -9H18L32 0L18 9H-30Z', o, null) + S('M18 -9L32 0L18 9Z', o, null, 0.8) + F('M27 -3L32 0L27 3Z', o) + S('M-36 -9H-30V9H-36Z', o, 'ink', 0.7) + L('M-30 0H18', o, 0.5), 'rotate(-40)'); });
  add('pass', '합격 도장', 'study', sealText('合', true));
  add('gradcap', '학사모', 'study', function (o) { return S('M-38 -6L0 -22L38 -6L0 10Z', o, null) + S('M-22 0V14C-12 22 12 22 22 14V0L0 10Z', o, null, 0.9) + L('M30 -4V16', o, 0.8) + C(30, 18, 4, o, 'ink', 0.3); });
  add('yeot', '합격 엿', 'study', function (o) { return D.g(S('M-34 -7H24C30 -7 34 -4 34 0C34 4 30 7 24 7H-34Z', o, null) + L('M-22 -7l-4 14M-8 -7l-4 14M6 -7l-4 14', o, 0.6), 'rotate(-35)'); });
  add('fork', '포크 (잘 찍기)', 'study', function (o) { return D.g(S('M-4 2H4V36H-4Z', o, null, 0.8) + S('M-14 -36V-8C-14 0 14 0 14 -8V-36', o, null) + L('M-5 -36V-12M5 -36V-12', o, 0.7), 'rotate(25)'); });

  /* ── 연애 ── */
  add('letter', '편지', 'love', function (o) { return S('M-34 -22H34V22H-34Z', o, null) + L('M-34 -22L0 6L34 -22', o, 0.9) + S('M0 10C-8 4 -10 -2 -6 -4C-3 -6 0 -4 0 -2C0 -4 3 -6 6 -4C10 -2 8 4 0 10Z', o, 'ink', 0.4); });
  add('ring', '반지', 'love', function (o) { return C(0, 10, 22, o, 'none') + C(0, 10, 15, o, 'none', 0.5) + S('M-10 -12L-14 -22L-6 -32H6L14 -22L10 -12Z', o, null, 0.9) + L('M-14 -22H14M0 -32V-12', o, 0.5); });
  add('rose', '장미', 'love', function (o) { return L('M0 4V36', o) + S('M0 14C-10 6 -22 12 -22 20C-12 22 -4 18 0 14Z', o, null, 0.8) + S('M-16 -6C-18 -24 18 -24 16 -6C14 6 -14 6 -16 -6Z', o, null) + L('M-8 -14C-4 -6 4 -6 6 -12C4 -18 -4 -18 -4 -12', o, 0.7); });
  add('hearts', '하트 두 개', 'love', function (o) { return D.g(S('M0 20C-20 6 -26 -4 -22 -14C-18 -24 -6 -24 0 -12C6 -24 18 -24 22 -14C26 -4 20 6 0 20Z', o, null), 'translate(-10 6) scale(0.8)') + D.g(S('M0 20C-20 6 -26 -4 -22 -14C-18 -24 -6 -24 0 -12C6 -24 18 -24 22 -14C26 -4 20 6 0 20Z', o, 'ink'), 'translate(16 -10) scale(0.6)'); });
  add('cupid', '화살 하트', 'love', function (o) { return S('M0 26C-26 8 -32 -6 -26 -18C-20 -30 -6 -30 0 -16C6 -30 20 -30 26 -18C32 -6 26 8 0 26Z', o, null) + L('M-38 18L36 -20', o) + L('M36 -20l-12 0M36 -20l-4 11', o) + L('M-38 18l2 -8M-38 18l8 0', o, 0.8); });

  /* ── 일 · 사업 · 이사 ── */
  add('briefcase', '서류가방', 'work', function (o) { return S('M-34 -12H34V24H-34Z', o, null) + S('M-12 -12V-22H12V-12', o, 'none') + L('M-34 2H34', o, 0.7) + S('M-6 -2H6V8H-6Z', o, 'ink', 0.5); });
  add('trophy', '트로피', 'work', function (o) { return S('M-20 -30H20V-8C20 6 -20 6 -20 -8Z', o, null) + L('M-20 -24C-34 -24 -32 -6 -18 -4M20 -24C34 -24 32 -6 18 -4', o, 0.9) + L('M0 2V16', o) + S('M-16 16H16V26H-16Z', o, 'ink', 0.7) + F(D.curve(D.starPts(0, -16, 8, 3.5, 5), true, 0.3), o); });
  add('crown', '왕관', 'work', function (o) { return S('M-30 14L-34 -18L-14 -2L0 -26L14 -2L34 -18L30 14Z', o, null) + S('M-30 14H30V24H-30Z', o, 'ink', 0.8) + C(0, -28, 4, o, 'ink', 0.3) + C(-34, -20, 3.5, o, 'ink', 0.3) + C(34, -20, 3.5, o, 'ink', 0.3); });
  add('arrowUp', '오름 화살표', 'work', function (o) { return L('M-34 24L-14 4L-2 14L24 -14', o, 1.2) + L('M24 -14h-14M24 -14v14', o, 1.2); });
  add('key', '열쇠', 'work', function (o) { return D.g(C(-20, 0, 13, o, null) + C(-20, 0, 5, o, 'none', 0.6) + L('M-7 0H34M24 0v10M32 0v8', o), 'rotate(-30)'); });
  add('house', '집', 'work', function (o) { return S('M-30 -2L0 -28L30 -2', o, 'none') + S('M-24 -6V28H24V-6L0 -26Z', o, null) + S('M-6 28V10H6V28', o, null, 0.8) + S('M10 -2H20V8H10Z', o, null, 0.6) + L('M14 -24V-14', o); });
  add('plane', '비행기', 'work', function (o) { return D.g(S('M-34 0C-34 -6 24 -6 32 0C24 6 -34 6 -34 0Z', o, null) + S('M-2 -4L-14 -28H-4L14 -4Z', o, null, 0.85) + S('M-2 4L-14 28H-4L14 4Z', o, null, 0.85) + S('M-30 -3L-36 -14H-30L-22 -3Z', o, null, 0.8), 'rotate(-20)'); });
  add('seed', '씨앗 주머니', 'work', function (o) { return S('M-16 -14C-30 0 -28 26 0 28C28 26 30 0 16 -14Z', o, null) + L('M-16 -14Q0 -8 16 -14M-10 -18l-4 -8M10 -18l4 -8', o, 0.8) + C(-6, 8, 3, o, 'ink', 0.2) + C(6, 12, 3, o, 'ink', 0.2) + C(0, 0, 3, o, 'ink', 0.2); });

  /* ── 글자 도장 ── */
  add('bok', '福 도장', 'seal', sealText('福', true));
  add('gil', '吉 도장', 'seal', sealText('吉', false));
  add('su', '壽 도장', 'seal', sealText('壽', true));
  add('hee', '囍 도장', 'seal', sealText('囍', false));
  add('daegil', '大吉 도장', 'seal', sealText('大吉', false));

  var CATS = [
    { id: 'deco', name: '반짝 · 장식' }, { id: 'health', name: '건강' }, { id: 'money', name: '재물' },
    { id: 'study', name: '학업 · 합격' }, { id: 'love', name: '연애 · 인연' }, { id: 'work', name: '일 · 사업 · 이사' }, { id: 'seal', name: '글자 도장' }
  ];

  /* 소품 하나를 그린다. item = { prop, x, y, s, r, flip } (카드 좌표) */
  function render(item, ink, paper) {
    var def = P[item.prop];
    if (!def) return '';
    var s = item.s || 1, swCard = 6.4 * Math.pow(s, 0.35);
    var o = { ink: ink, paper: paper, sw: swCard / s };
    var tr = 'translate(' + r1(item.x) + ' ' + r1(item.y) + ') rotate(' + r1(item.r || 0) + ') scale(' + (item.flip ? -s : s) + ' ' + s + ')';
    return '<g transform="' + tr + '">' + def.draw(o) + '</g>';
  }

  BJ.props = { P: P, CATS: CATS, render: render, HANJA_FONT: HANJA_FONT };
})();
