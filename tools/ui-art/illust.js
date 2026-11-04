/* tools/ui-art/illust.js — 타이틀·로딩 일러스트 (tools/ui-art/illust.html 안에서 돈다).
 * 게임 장면 렌더러(SCENE3D)를 그대로 띄워 구도만 고정해 찍고 → 아트 픽셀 1x 로 줄인다. 로고는 Galmuri11(보통 굵기 — 굵게는 3배에서도 획 사이가 1px 라 테가 메운다)을 12px(이 글꼴의 실제 픽셀 격자 — 11px 이 아니다)로 찍어 이진화하고 3배로.
 * 결과: window.ILLUST.all() → [{ key, src, w, h, data(base64 PNG), note, colours }]
 */
(function () {
  'use strict';
  var KEY = SPRITES.KEY, host = document.getElementById('host');
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function rgb(hex) { return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]; }
  function cv(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; var x = c.getContext('2d'); x.imageSmoothingEnabled = false; return c; }

  /* 벽 포스터용 작은 SVG (장면 bakeSVG 가 48×64 로 굽는다) — 포스터 장면 배경과 같은 중간톤 */
  function posterSVG(bg, fg, shape) {
    var s = shape === 'wave' ? '<path d="M0 40h48v24H0z" fill="' + fg + '"/><path d="M0 40q6-6 12 0t12 0 12 0 12 0v4H0z" fill="#a4dddb"/>'
      : shape === 'moon' ? '<circle cx="30" cy="20" r="9" fill="' + fg + '"/><circle cx="34" cy="17" r="8" fill="' + bg + '"/>'
      : '<path d="M8 52l16-28 16 28z" fill="' + fg + '"/>';
    return '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="64" viewBox="0 0 48 64" shape-rendering="crispEdges"><rect width="48" height="64" fill="#e7d5b3"/><rect x="3" y="3" width="42" height="50" fill="' + bg + '"/>' + s + '<rect x="8" y="56" width="32" height="3" fill="#7a4841"/></svg>';
  }
  var POSTERS = [{ id: 'p1', svg: posterSVG('#3c5e8b', '#253a5e', 'wave') }, { id: 'p2', svg: posterSVG('#402751', '#e8c170', 'moon') }, { id: 'p3', svg: posterSVG('#468232', '#25562e', 'hill') }];
  var SOUV = ['feather', 'shell', 'pebble', 'marble', 'bell', 'key'].map(function (id) { return { id: id }; });
  var ITEMS = ['moss', 'crate', 'candle', 'blanket', 'board', 'shelf', 'curtain'];

  /* 장면 한 장: cfg = { cssW, cssH, hour, weather, anchor, state, expr, zoom, focus } → { c: 1x 캔버스, oct: 문어 머리 아트px 좌표 } */
  async function scene(cfg) {
    host.innerHTML = ''; host.style.width = cfg.cssW + 'px'; host.style.height = cfg.cssH + 'px';
    var sc = SCENE3D.init(host, { lantern: 8, items: ITEMS, weather: cfg.weather, hour: cfg.hour, palette: 'apollo', look: { pixelSize: 2 }, posters: POSTERS, souvenirs: SOUV, on: {} });
    sc.setItems(ITEMS); sc.setPosters(POSTERS); sc.setSouvenirs(SOUV); sc.setLantern(8); sc.setWeather(cfg.weather); sc.setTime(cfg.hour, true);
    await wait(1200);
    sc.jumpTo(cfg.anchor); sc.setOctState(cfg.state); sc.setExpression(cfg.expr);
    sc.setLook({ pixelSize: 2, zoom: cfg.zoom || 0, focus: cfg.focus || null, yaw: cfg.yaw || 0 });
    sc.bubble('', 0);
    await wait(1500);
    for (var i = 0; i < 6; i++) sc.debugStep(1 / 12);
    var canvas = host.querySelector('canvas'), p = sc.stats().pixel;
    var w = Math.floor(canvas.width / p), h = Math.floor(canvas.height / p), out = cv(w, h);
    out.getContext('2d').drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, w, h);   /* 같은 색 p×p 블록 → 1칸 (Nearest) */
    var r = canvas.getBoundingClientRect(), op = sc.octScreenPos();
    var oct = { x: Math.round((op.x - r.left) / (r.width / w)), y: Math.round((op.y - r.top) / (r.height / h)) };
    sc.destroy(); host.innerHTML = '';
    return { c: out, oct: oct };
  }

  /* 글자 → 1비트 마스크 (Galmuri 는 11px 격자에 맞춰 그려진 글꼴이라 정수 크기에서 거의 전부 불투명) */
  function textMask(text, font, px) {
    /* 글꼴 격자와 캔버스 격자가 반 칸 어긋나면 획이 반투명 두 줄로 번진다 → 0~¾ 칸 오프셋 16가지 중 반투명 칸이 가장 적은 것을 쓴다 */
    var best = null;
    for (var oy = 0; oy < 1; oy += 0.25) for (var ox = 0; ox < 1; ox += 0.25) {
      var c = cv(400, px * 2), x = c.getContext('2d');
      x.font = font; x.textBaseline = 'top'; x.fillStyle = '#fff'; x.fillText(text, ox, 3 + oy);   /* 'top' 기준선에서도 첫 줄이 0 위로 잘리므로 3칸 내려 찍는다 */
      var d = x.getImageData(0, 0, 400, px * 2).data, partial = 0;
      for (var i = 3; i < d.length; i += 4) if (d[i] > 30 && d[i] < 225) partial++;
      if (!best || partial < best.partial) best = { partial: partial, d: d, w: Math.ceil(x.measureText(text).width + ox) };
    }
    var w = best.w, rows = [], H = 0;
    for (var y = 0; y < px * 2; y++) { var row = []; for (var i2 = 0; i2 < w; i2++) { var on = best.d[(y * 400 + i2) * 4 + 3] >= 128; row.push(on); if (on) H = y + 1; } rows.push(row); }
    var top = rows.findIndex(function (r) { return r.some(Boolean); });
    return { w: w, h: H - top, m: rows.slice(top, H), partial: best.partial };
  }
  function scaleMask(mk, k) { var m = []; for (var y = 0; y < mk.h * k; y++) { var r = []; for (var x = 0; x < mk.w * k; x++) r.push(mk.m[Math.floor(y / k)][Math.floor(x / k)]); m.push(r); } return { w: mk.w * k, h: mk.h * k, m: m }; }

  /* 로고: "뽈뽈"(문어 빨강 램프) + "문어"(호박 램프), 글자 3배 (2배면 1px 테가 2px 획 사이를 메워 글자가 뭉개진다), 1px 밝은 윗줄 · 8-이웃 1px 테 · 아래 2px 그림자 */
  function logo() {
    var words = [{ t: '뽈뽈', ramp: ['#da863e', '#cf573c', '#cf573c', '#a53030'], hi: '#e8c170' }, { t: '문어', ramp: ['#e8c170', '#de9e41', '#de9e41', '#be772b'], hi: '#ebede9' }];
    var masks = words.map(function (w) { return scaleMask(textMask(w.t, '400 12px Galmuri11', 12), 3); }), gap = 10, pad = 3;
    var W = masks[0].w + gap + masks[1].w + pad * 2, H = Math.max(masks[0].h, masks[1].h) + pad * 2 + 2, c = cv(W, H), x = c.getContext('2d');
    var fill = [], ox = pad;
    masks.forEach(function (mk, wi) {
      for (var y = 0; y < mk.h; y++) for (var i = 0; i < mk.w; i++) if (mk.m[y][i]) {
        var above = y > 0 && mk.m[y - 1][i], col = !above ? words[wi].hi : words[wi].ramp[Math.min(3, Math.floor(y / mk.h * 4))];
        fill.push([ox + i, pad + y, col]);
      }
      ox += mk.w + gap;
    });
    var on = {}; fill.forEach(function (f) { on[f[0] + ',' + f[1]] = 1; });
    function px(X, Y, col) { x.fillStyle = col; x.fillRect(X, Y, 1, 1); }
    fill.forEach(function (f) { for (var dy = 1; dy <= 2; dy++) if (!on[f[0] + ',' + (f[1] + dy)]) px(f[0], f[1] + dy + 1, KEY['0']); });   /* 그림자 */
    fill.forEach(function (f) { for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) if (!on[(f[0] + dx) + ',' + (f[1] + dy)]) px(f[0] + dx, f[1] + dy, KEY.G); });   /* 테 */
    fill.forEach(function (f) { px(f[0], f[1], f[2]); });
    return c;
  }

  /* 내용(밝은 칸)이 있는 행 범위 → 아래쪽 허공을 잘라 w×H 창을 고른다 (디오라마 아래는 빈 밤색) */
  function cropTo(c, H, bottomPad) {
    var d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, last = 0, first = c.height;
    for (var y = 0; y < c.height; y++) { var n = 0; for (var x = 0; x < c.width; x++) { var i = (y * c.width + x) * 4; if (d[i] + d[i + 1] + d[i + 2] > 120) n++; } if (n > c.width * 0.04) { last = y; if (y < first) first = y; } }
    var y0 = Math.max(0, Math.min(c.height - H, last + bottomPad - H)), o = cv(c.width, H);
    o.getContext('2d').drawImage(c, 0, y0, c.width, H, 0, 0, c.width, H);
    return { c: o, y0: y0, first: first - y0, last: last - y0 };
  }
  /* 스프라이트 칸 하나를 캔버스에 (아트px 1:1) */
  function blitCell(ctx, rows, X, Y) { rows.forEach(function (r, y) { for (var i = 0; i < r.length; i++) if (r[i] !== '.') { ctx.fillStyle = KEY[r[i]]; ctx.fillRect(X + i, Y + y, 1, 1); } }); }
  function colours(c) { var d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, s = {}; for (var i = 0; i < d.length; i += 4) if (d[i + 3]) s[(d[i] << 16) | (d[i + 1] << 8) | d[i + 2]] = 1; return Object.keys(s).length; }
  function pack(key, src, c, note) { return { key: key, src: src, w: c.width, h: c.height, note: note, colours: colours(c), data: c.toDataURL('image/png').split(',')[1] }; }

  async function all() {
    await document.fonts.load('400 12px Galmuri11'); await document.fonts.ready;
    var out = [];
    /* 1) 타이틀: 밤 22시 · 비 · 등불 8칸 다 켜진 다락, 문어는 창가에서 비 구경 (curious) — 세로 180×240 */
    var t0 = await scene({ cssW: 360, cssH: 640, hour: 22, weather: 'rain', anchor: 'window', state: 'idle', expr: 'curious', zoom: 1 });
    var t = cropTo(t0.c, 240, 6);
    out.push(pack('illust.title_bg', 'assets/illust/title_bg.png', t.c, '타이틀 배경 180×240 (글자 없음) — 게임 렌더러로 찍은 밤·비·등불 8칸 다락, 창가의 문어. 정수 배(×2)로.'));
    var lg = logo();
    out.push(pack('illust.logo', 'assets/illust/logo.png', lg, '타이틀 로고 "뽈뽈 문어" (Galmuri11 12px ×3, OFL) — 테·그림자 포함, 투명 배경.'));
    var tc = cv(t.c.width, t.c.height), tx = tc.getContext('2d');
    tx.drawImage(t.c, 0, 0); tx.drawImage(lg, Math.round((tc.width - lg.width) / 2), 10);
    out.push(pack('illust.title', 'assets/illust/title.png', tc, '타이틀 완성본 180×240 (배경 + 로고). 시작 버튼·글자는 HTML 로 위에.'));
    /* 2) 로딩: 노을 무렵 비 오는 다락, 꾸벅꾸벅 조는 문어 클로즈업 (sleepy) + z — 가로 160×120 */
    var l = await scene({ cssW: 320, cssH: 240, hour: 18.5, weather: 'rain', anchor: 'center', state: 'idle', expr: 'sleepy', zoom: 3, focus: 'oct' });
    var lc = cv(l.c.width, l.c.height), lx = lc.getContext('2d'); lx.drawImage(l.c, 0, 0);
    var zz = SPRITES.FX['fx.zzz'].frames;
    var cx = lc.width >> 1, cy = lc.height >> 1;   /* focus:'oct' → 문어 머리가 화면 가운데 (머리 위쪽 ≈ cy−18) */
    blitCell(lx, zz[1], cx + 10, cy - 26); blitCell(lx, zz[2], cx + 17, cy - 36);
    out.push(pack('illust.loading', 'assets/illust/loading.png', lc, '로딩 일러스트 160×120 — 꾸벅 조는 문어 클로즈업(노을·비) + z. "불러오는 중" 글자는 HTML 로.'));
    /* (미리보기용) 대화창 초상 — 매니페스트에는 안 넣는다 (게임은 SCENE3D.portrait 로 그때그때 찍음) */
    host.style.width = '320px'; host.style.height = '240px';
    var sc = SCENE3D.init(host, { lantern: 8, items: ITEMS, weather: 'rain', hour: 22, palette: 'apollo', look: { pixelSize: 2 }, on: {} });
    await wait(600);
    var pc = sc.portrait('happy', { bg: 'navy' }), p1 = cv(64, 64); p1.getContext('2d').drawImage(pc, 0, 0, 64, 64);
    out.push({ key: '_preview.portrait', src: 'tests/evidence/ui-art/portrait.png', w: 64, h: 64, data: p1.toDataURL('image/png').split(',')[1], preview: true });
    sc.destroy();
    return out;
  }
  window.ILLUST = { all: all };
  window.ILLUST_READY = true;
})();
