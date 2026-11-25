/* 부적 카드 한 장을 SVG 글자로 만든다 (앞면 · 뒷면).
 * 화면 미리보기 · PNG 내보내기 · 인쇄가 모두 이 글자를 쓴다 — 그래서 보이는 그대로 나간다.
 *
 * 카드 좌표 600 × 900 (2:3, 10×15cm 사진 인화 비율).
 * 끌어서 옮길 수 있는 것은 data-el 이 붙은 <g> (app.js 가 잡는다).
 */
(function () {
  'use strict';
  var BJ = window.BJ = window.BJ || {};
  var D = BJ.draw, r1 = D.r1, esc = D.esc;

  var W = 600, H = 900;

  /* 레이아웃: 1번처럼 위아래로 나누기 · 2번처럼 아래 두 줄 */
  var LAYOUTS = {
    split: {
      name: '위아래 나눔',
      year: { x: 300, y: 124, size: 40, maxW: 300 },
      top: { x: 300, y: 220, size: 112, maxW: 384 },
      bottom: { x: 300, y: 728, size: 112, maxW: 384 },
      char: { x: 300, y: 482, s: 1.38 },
      slots: {
        tl: [128, 214], tr: [472, 214], hl: [138, 318], hr: [462, 318],
        ml: [126, 462], mr: [474, 462], fl: [140, 606], fr: [460, 606], bl: [132, 796], br: [468, 796]
      }
    },
    stack: {
      name: '아래 두 줄',
      year: { x: 300, y: 124, size: 40, maxW: 300 },
      char: { x: 300, y: 380, s: 1.48 },
      top: { x: 300, y: 630, size: 94, maxW: 400 },
      bottom: { x: 300, y: 732, size: 94, maxW: 400 },
      slots: {
        tl: [130, 196], tr: [470, 196], hl: [134, 290], hr: [466, 290],
        ml: [124, 400], mr: [476, 400], fl: [136, 526], fr: [464, 526], bl: [132, 798], br: [468, 798]
      }
    }
  };

  var SLOT_NAMES = {
    tl: '왼쪽 위', tr: '오른쪽 위', hl: '머리 왼쪽', hr: '머리 오른쪽', ml: '몸 왼쪽', mr: '몸 오른쪽',
    fl: '발 왼쪽', fr: '발 오른쪽', bl: '왼쪽 아래', br: '오른쪽 아래'
  };
  var SLOT_PAIRS = { tl: 'tr', tr: 'tl', hl: 'hr', hr: 'hl', ml: 'mr', mr: 'ml', fl: 'fr', fr: 'fl', bl: 'br', br: 'bl' };

  /* 테마 세트: 자리마다 놓을 소품 */
  var THEMES = {
    basic:  { name: '기본 (2번 느낌)', slots: { tl: 'plus', tr: 'plus2', hl: 'squiggle', hr: 'squiggle', ml: 'dots', mr: 'dots', fl: 'beads', fr: 'beads', bl: 'starFill', br: 'starFill' } },
    health: { name: '건강', slots: { tl: 'cloud', tr: 'cloud', hl: 'sparkle', hr: 'plus', ml: 'pill', mr: 'ginseng', fl: 'heartbeat', fr: 'apple', bl: 'star', br: 'star' } },
    money:  { name: '재물', slots: { tl: 'sparkle', tr: 'sparkle', hl: 'coin', hr: 'coin', ml: 'pouch', mr: 'goldbar', fl: 'coins', fr: 'bill', bl: 'starFill', br: 'starFill' } },
    study:  { name: '합격 · 학업', slots: { tl: 'star', tr: 'star', hl: 'sparkle', hr: 'plus', ml: 'book', mr: 'pencil', fl: 'yeot', fr: 'pass', bl: 'clover', br: 'clover' } },
    love:   { name: '연애 · 인연', slots: { tl: 'heart', tr: 'heart', hl: 'sparkle', hr: 'sparkle', ml: 'letter', mr: 'rose', fl: 'hearts', fr: 'ring', bl: 'flower', br: 'flower' } },
    work:   { name: '일 · 사업', slots: { tl: 'sparkle', tr: 'plus', hl: 'crown', hr: 'arrowUp', ml: 'briefcase', mr: 'trophy', fl: 'key', fr: 'coin', bl: 'starFill', br: 'starFill' } },
    calm:   { name: '마음 · 평안', slots: { tl: 'moon', tr: 'cloud', hl: 'sparkle', hr: 'note', ml: 'leaf', mr: 'drop', fl: 'sprout', fr: 'flower', bl: 'star', br: 'star' } },
    empty:  { name: '비우기', slots: {} }
  };
  /* 자리마다 기본 크기 */
  var SLOT_SIZE = { tl: 0.72, tr: 0.72, hl: 0.62, hr: 0.62, ml: 0.78, mr: 0.78, fl: 0.7, fr: 0.7, bl: 0.6, br: 0.6 };

  var PALETTES = [
    { id: 'classic', name: '노랑 + 빨강', paper: '#F2BE35', ink: '#C93B22' },
    { id: 'beige', name: '베이지 + 빨강', paper: '#FBF0D2', ink: '#C93B22' },
    { id: 'beigeInk', name: '베이지 + 먹', paper: '#FBF0D2', ink: '#1E1714' },
    { id: 'peach', name: '살구 + 빨강', paper: '#F7C9A4', ink: '#B8321D' }
  ];

  /* ── 필터: 손그림 선 질감 · 종이 결 ──
     k = 거칠기 (0 끔 · 1 기본 · 2 거칠게). unit = 이 필터가 놓이는 좌표 한 칸이 카드 몇 칸인지 (썸네일은 캐릭터 좌표라 1.4).
     낮은 주파수로 선이 살짝 흔들리고, 가장자리는 둥글게 오돌토돌 — 보풀처럼 일지 않게 끝을 또렷하게 자른다. */
  function roughFilter(id, k, unit, box) {
    unit = unit || 1;
    box = box || 'x="0" y="0" width="' + W + '" height="' + H + '" filterUnits="userSpaceOnUse"';
    return '<filter id="' + id + '" ' + box + ' color-interpolation-filters="sRGB">' +
      '<feTurbulence type="fractalNoise" baseFrequency="' + r1(0.011 * unit * 1000) / 1000 + '" numOctaves="1" seed="3" result="n1"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="n1" scale="' + r1(5 * k / unit) + '" xChannelSelector="R" yChannelSelector="G" result="d1"/>' +
      '<feTurbulence type="fractalNoise" baseFrequency="' + r1(0.075 * unit * 1000) / 1000 + '" numOctaves="2" seed="11" result="n2"/>' +
      '<feDisplacementMap in="d1" in2="n2" scale="' + r1(2.6 * k / unit) + '" xChannelSelector="R" yChannelSelector="G" result="d2"/>' +
      '<feGaussianBlur in="d2" stdDeviation="' + r1(0.7 / unit) + '" result="b"/>' +
      '<feComponentTransfer in="b"><feFuncA type="linear" slope="7" intercept="-3"/></feComponentTransfer>' +
      '</filter>';
  }

  function defs(st, ids) {
    var k = st.rough == null ? 1 : st.rough;
    var out = '<defs>';
    if (k > 0) out += roughFilter(ids.rough, k, 1);
    if (st.paperGrain) {
      out += '<filter id="' + ids.grain + '" x="0" y="0" width="' + W + '" height="' + H + '" filterUnits="userSpaceOnUse">' +
        '<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="5" result="t"/>' +
        '<feColorMatrix in="t" type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.2  0 0 0 0 0.05  0 0 0 -2.2 1.25"/>' +
        '</filter>';
    }
    /* 올린 그림을 선 색으로 (흰 바탕은 투명) */
    var ink = hexToRgb(st.ink);
    out += '<filter id="' + ids.toInk + '" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 ' + r1(ink[0] / 255 * 100) / 100 + '  0 0 0 0 ' + r1(ink[1] / 255 * 100) / 100 + '  0 0 0 0 ' + r1(ink[2] / 255 * 100) / 100 + '  -0.333 -0.333 -0.333 1 0"/></filter>';
    return out + '</defs>';
  }

  function hexToRgb(h) {
    h = String(h || '#000').replace('#', '');
    if (h.length === 3) h = h.replace(/./g, '$&$&');
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  /* ── 틀 ── */
  function frame(st, ink, paper) {
    var sw = 7, s = '', style = st.frame || 'stamp';
    function L(d, w) { return D.line(d, ink, w || sw); }
    function dot(x, y, r) { return D.circle(x, y, r, ink); }
    if (style === 'stamp') {
      s += L('M40 40H560V860H40Z') + L('M92 78H508V822H92Z');
      s += L('M40 40L92 78M560 40L508 78M40 860L92 822M560 860L508 822');
      s += dot(27, 27, 10) + dot(573, 27, 10) + dot(27, 873, 10) + dot(573, 873, 10);
      if (st.sideDots !== false) {
        [416, 450, 484].forEach(function (y) { s += dot(66, y, 6) + dot(534, y, 6); });
        s += dot(300, 59, 5) + dot(276, 59, 4) + dot(324, 59, 4) + dot(300, 841, 5) + dot(276, 841, 4) + dot(324, 841, 4);
      }
    } else if (style === 'cloud') {
      s += L('M60 34H540Q566 34 566 60V840Q566 866 540 866H60Q34 866 34 840V60Q34 34 60 34Z', 8);
      s += L('M74 56H526Q544 56 544 74V826Q544 844 526 844H74Q56 844 56 826V74Q56 56 74 56Z', 4.5);
      [[1, 1], [-1, 1]].forEach(function (q) {
        var k = q[0], x0 = k > 0 ? 56 : 544;
        s += '<g transform="translate(' + x0 + ' 56) scale(' + k + ' 1)">' +
          L('M0 64C0 24 24 0 64 0', 6) + L('M10 92C10 70 18 56 32 50C44 46 52 54 48 64C44 72 34 70 34 62', 5) +
          L('M92 10C70 10 56 18 50 32C46 44 54 52 64 48C72 44 70 34 62 34', 5) + '</g>';
      });
      [[64, 836], [536, 836]].forEach(function (q) { s += D.shape(D.curve(D.starPts(q[0], q[1], 18, 8, 5), true, 0.35), paper, ink, 4.5); });
      if (st.sideDots !== false) [430, 470].forEach(function (y) { s += dot(45, y, 4.5) + dot(555, y, 4.5); });
    } else if (style === 'simple') {
      s += L('M62 44H538Q556 44 556 62V838Q556 856 538 856H62Q44 856 44 838V62Q44 44 62 44Z', 8);
      s += dot(30, 30, 8) + dot(570, 30, 8) + dot(30, 870, 8) + dot(570, 870, 8);
      if (st.sideDots !== false) [430, 470].forEach(function (y) { s += dot(30, y, 5) + dot(570, y, 5); });
    }
    return s;
  }

  /* 연도 옆 줄무늬 · 아래 장식 · 집중선 */
  function extras(st, lay, ink, charPos) {
    var s = '', sw = 6;
    function L(d, w) { return D.line(d, ink, w || sw); }
    if (st.headerLines !== false) {
      var y = lay.year.y + (st.offsets.year ? st.offsets.year.dy || 0 : 0);
      s += L('M112 ' + (y - 12) + 'H162M112 ' + y + 'H150M112 ' + (y + 12) + 'H162', 5) + L('M438 ' + (y - 12) + 'H488M450 ' + y + 'H488M438 ' + (y + 12) + 'H488', 5);
      s += D.circle(173, y, 4, ink) + D.circle(427, y, 4, ink);
    }
    if (st.footer !== false) {
      s += L('M170 791H430M184 806H416', 5);
      s += L('M300 812V826M284 812L276 824M316 812L324 824', 4.5);
    }
    if (st.rays !== false) {
      var cx = charPos.x, cy = charPos.y - 22 * charPos.s, rIn = 112 * charPos.s, n = 7;
      for (var i = 0; i < n; i++) {
        var a = Math.PI * (1.2 + 0.6 * i / (n - 1)), rr = rIn + (i % 2 ? 10 : 0), len = i % 2 ? 18 : 28;
        s += L('M' + r1(cx + Math.cos(a) * rr) + ' ' + r1(cy + Math.sin(a) * rr) + 'L' + r1(cx + Math.cos(a) * (rr + len)) + ' ' + r1(cy + Math.sin(a) * (rr + len)), 5.5);
      }
    }
    return s;
  }

  /* ── 글자 ── */
  function fontStack(st) { return "'" + (st.fontFamily || 'Poor Story') + "', 'Noto Serif KR', sans-serif"; }

  function textLine(id, txt, spec, st, env, ink) {
    if (!txt) return '';
    var off = st.offsets[id] || {}, scale = (st.sizes && st.sizes[id]) || 1;
    var size = spec.size * scale * (off.s || 1), stretch = st.stretch || 1.3;
    var fam = fontStack(st);
    /* 가로로 넘치면 글자 크기를 줄인다 (넓적한 맛은 그대로) */
    if (env && env.measure) {
      var w = env.measure(txt, size) * stretch, maxW = spec.maxW * (off.s || 1) * Math.max(1, scale * 0.9);
      if (w > maxW) size = size * maxW / w;
    }
    var x = spec.x + (off.dx || 0), y = spec.y + (off.dy || 0);
    var weight = st.fontWeight || 400, stroke = st.textWeight == null ? 1.5 : st.textWeight;
    return '<g data-el="' + id + '" transform="translate(' + r1(x) + ' ' + r1(y) + ') scale(' + r1(stretch * 100) / 100 + ' 1)">' +
      '<text x="0" y="0" text-anchor="middle" dominant-baseline="central" font-family="' + esc(fam) + '" font-weight="' + weight + '" font-size="' + r1(size) + '"' +
      ' fill="' + ink + '" stroke="' + ink + '" stroke-width="' + r1(stroke) + '" stroke-linejoin="round" paint-order="stroke">' + esc(txt) + '</text></g>';
  }

  /* 낙관 (서명 도장) */
  function seal(st, side, ink, paper) {
    var se = st.seal;
    if (!se || !se.text || !(se.where === 'both' || se.where === side)) return '';
    var pos = (se.pos && se.pos[side]) || { x: side === 'front' ? 476 : 470, y: side === 'front' ? 846 : 790, s: 1 };
    var t = String(se.text).slice(0, 4), n = t.length, box = 46, fill = se.style !== 'line';
    var s = D.shape('M' + (-box / 2) + ' ' + (-box / 2) + 'h' + box + 'v' + box + 'h' + (-box) + 'Z', fill ? ink : 'none', ink, 3.5);
    var col = fill ? paper : ink, fam = esc(fontStack(st));
    var cells = n === 1 ? [[0, 0, 30]] : n === 2 ? [[0, -10, 18], [0, 10, 18]] : n === 3 ? [[7, -11, 15], [7, 9, 15], [-9, 0, 17]] : [[9, -10, 16], [9, 10, 16], [-9, -10, 16], [-9, 10, 16]];
    for (var i = 0; i < n; i++) {
      s += '<text x="' + cells[i][0] + '" y="' + cells[i][1] + '" text-anchor="middle" dominant-baseline="central" font-family="' + fam + '" font-size="' + cells[i][2] + '" font-weight="700" fill="' + col + '">' + esc(t[i]) + '</text>';
    }
    return '<g data-el="seal-' + side + '" transform="translate(' + r1(pos.x) + ' ' + r1(pos.y) + ') scale(' + (pos.s || 1) + ')">' + s + '</g>';
  }

  /* 올린 그림 (캐릭터 대신 · 뒷면 그림) */
  function image(href, x, y, w, h, mode, ids) {
    var extra = mode === 'ink' ? ' filter="url(#' + ids.toInk + ')"' : mode === 'multiply' ? ' style="mix-blend-mode:multiply"' : '';
    return '<image href="' + href + '" x="' + r1(x) + '" y="' + r1(y) + '" width="' + r1(w) + '" height="' + r1(h) + '" preserveAspectRatio="xMidYMid meet"' + extra + '/>';
  }

  function charPosition(st) {
    var lay = LAYOUTS[st.layout] || LAYOUTS.split, off = st.offsets.char || {};
    return { x: lay.char.x + (off.dx || 0), y: lay.char.y + (off.dy || 0), s: lay.char.s * (st.charScale || 1) * (off.s || 1) };
  }

  /* ── 앞면 ── */
  function front(st, env) {
    env = env || {};
    var ids = { rough: 'rough-' + (env.uid || 'f'), grain: 'grain-' + (env.uid || 'f'), toInk: 'toink-' + (env.uid || 'f') };
    var ink = st.ink, paper = st.paper, lay = LAYOUTS[st.layout] || LAYOUTS.split;
    var cp = charPosition(st);
    var out = [];
    out.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">');
    if (env.fontCSS) out.push('<style>' + env.fontCSS + '</style>');
    out.push(defs(st, ids));
    out.push('<rect width="' + W + '" height="' + H + '" fill="' + paper + '"/>');
    if (st.paperGrain) out.push('<rect width="' + W + '" height="' + H + '" filter="url(#' + ids.grain + ')" opacity="0.5"/>');

    var art = [];
    art.push(frame(st, ink, paper));
    art.push(extras(st, lay, ink, cp));

    /* 캐릭터 */
    var flip = st.charFlip ? -1 : 1;
    if (!env.customChar) {
      art.push('<g data-el="char" transform="translate(' + r1(cp.x) + ' ' + r1(cp.y) + ') scale(' + r1(cp.s * flip * 1000) / 1000 + ' ' + r1(cp.s * 1000) / 1000 + ')">' +
        '<rect x="-105" y="-128" width="210" height="236" fill="none" pointer-events="all"/>' +
        BJ.chars.render(st.ilju, st.gender, { ink: ink, paper: paper, mode: st.charMode, ground: st.ground !== false }) + '</g>');
    }

    /* 장식 */
    (st.items || []).forEach(function (it, i) {
      art.push('<g data-el="item:' + i + '">' + BJ.props.render(it, ink, paper) + '</g>');
    });

    /* 글자 */
    art.push(textLine('year', env.yearText, lay.year, st, env, ink));
    art.push(textLine('top', st.topText, lay.top, st, env, ink));
    art.push(textLine('bottom', st.bottomText, lay.bottom, st, env, ink));
    art.push(seal(st, 'front', ink, paper));

    var roughAttr = (st.rough == null || st.rough > 0) ? ' filter="url(#' + ids.rough + ')"' : '';
    out.push('<g class="art"' + roughAttr + ' stroke-linecap="round" stroke-linejoin="round">' + art.join('') + '</g>');

    /* 올린 캐릭터 그림은 질감 필터 밖에 (그린 사람의 선을 그대로) */
    if (env.customChar) {
      var bw = 236 * cp.s, bh = 250 * cp.s;
      out.push('<g data-el="char" class="custom-char" transform="translate(' + r1(cp.x) + ' ' + r1(cp.y) + ') scale(' + flip + ' 1)">' +
        image(env.customChar, -bw / 2, -bh * 0.56, bw, bh, env.customCharMode, ids) + '</g>');
    }
    out.push('</svg>');
    return out.join('');
  }

  /* ── 뒷면: 빈 장 (그림은 작가가 직접) ── */
  function back(st, env) {
    env = env || {};
    var ids = { rough: 'rough-' + (env.uid || 'b'), grain: 'grain-' + (env.uid || 'b'), toInk: 'toink-' + (env.uid || 'b') };
    var ink = st.ink, paper = st.paper, bk = st.back || {};
    var out = [];
    out.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">');
    if (env.fontCSS) out.push('<style>' + env.fontCSS + '</style>');
    out.push(defs(st, ids));
    out.push('<rect width="' + W + '" height="' + H + '" fill="' + paper + '"/>');
    if (st.paperGrain) out.push('<rect width="' + W + '" height="' + H + '" filter="url(#' + ids.grain + ')" opacity="0.5"/>');
    if (env.backImage) {
      var f = bk.fit || {}, s = f.s || 1, w = 416 * s, h = 744 * s;
      out.push('<g data-el="backimg" transform="translate(' + r1(300 + (f.dx || 0)) + ' ' + r1(450 + (f.dy || 0)) + ')">' +
        image(env.backImage, -w / 2, -h / 2, w, h, bk.mode, ids) + '</g>');
    }
    var art = [];
    if (bk.frame !== false) art.push(frame(st, ink, paper));
    if (bk.caption) {
      art.push(textLine('caption', bk.caption, { x: 300, y: 778, size: 48, maxW: 380 }, st, env, ink));
    }
    art.push(seal(st, 'back', ink, paper));
    var roughAttr = (st.rough == null || st.rough > 0) ? ' filter="url(#' + ids.rough + ')"' : '';
    out.push('<g class="art"' + roughAttr + ' stroke-linecap="round" stroke-linejoin="round">' + art.join('') + '</g>');
    out.push('</svg>');
    return out.join('');
  }

  BJ.card = {
    W: W, H: H, LAYOUTS: LAYOUTS, SLOT_NAMES: SLOT_NAMES, SLOT_PAIRS: SLOT_PAIRS, SLOT_SIZE: SLOT_SIZE, THEMES: THEMES, PALETTES: PALETTES,
    front: front, back: back, charPosition: charPosition, fontStack: fontStack, roughFilter: roughFilter
  };
})();
