/* js/runner.js — 다락방 달리기 (크롬 공룡식 작은 러너, 주인공 = 문어). 전역 RUNNER. 모듈 없음, file:// 안전.
 *   docs/MINIGAME.md 참고. 시뮬레이션은 DOM 없이 돈다 (node: tools/test-runner.js).
 *   결정성: 60 Hz 고정 틱 · 정수(1/256 px) 위치 · mulberry32 시드 · 입력은 [{t, a}] (a = jd|ju|dd|du).
 *   RUNNER.simulate(seed, inputs, { night, until }) → { score, ticks, dead, moss } — 라이브 판과 비트 단위로 같다.
 */
var RUNNER = (function () {
  'use strict';
  var VERSION = 'runner-1';
  var SUB = 256;                       /* 1 아트 px = 256 서브 px (정수) */
  var C = {
    W: 192, H: 108, GY: 92,            /* 화면 192×108 아트 px, 바닥선 y=92 */
    OCT_X: 30, OCT_W: 14, H_STAND: 18, H_DUCK: 10,
    JV: 760, G: 44, GH: 20, HOLD_MAX: 12, CUT: 680, GF: 140, BUF: 6,   /* 서브 px / 틱, 서브 px / 틱² */
    V0: 320, VMAX: 704, RAMP: 12,      /* 속도 1.25 → 2.75 px/틱, 12 틱마다 +1 서브 px */
    SPAWN_X: 200, PT: 8, MOSS: 20, FIRST_GAP: 40, MAX_TICKS: 60 * 60 * 30
  };
  /* 장애물: lo/hi = 바닥에서 잰 높이(px). web 은 천장까지 → 숙여야 지나간다 */
  var KINDS = {
    crate: { w: 12, lo: 0, hi: 9 }, crate2: { w: 22, lo: 0, hi: 9 }, candle: { w: 4, lo: 0, hi: 16 },
    books: { w: 10, lo: 0, hi: 20 }, web: { w: 16, lo: 13, hi: 120 }, rain: { w: 24, lo: 0, hi: 7 }
  };
  var ACTS = { jd: 1, ju: 1, dd: 1, du: 1 };

  /* ───────── 시드 ───────── */
  function hash32(str) { str = String(str); var h = 0x811c9dc5; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; }
  function mulberry32(a) {
    a = a >>> 0;
    return function () { a = (a + 0x6D2B79F5) | 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return (t ^ (t >>> 14)) >>> 0; };   /* uint32 정수 (나눗셈 없음) */
  }
  function seedFor(dateKey, runIndex) { return hash32(dateKey + '|' + runIndex); }

  /* ───────── 시뮬레이션 (DOM 없음) ───────── */
  function createSim(seed, opts) {
    opts = opts || {};
    return { seed: seed >>> 0, night: !!opts.night, rng: mulberry32(seed), tick: 0, dist: 0, speed: C.V0,
      y: 0, vy: 0, ground: true, jHeld: false, dHeld: false, holdT: 0, buf: 0, landT: -99, jumpT: -99,
      obs: [], sinceSpawn: 0, gap: C.FIRST_GAP * SUB, spawned: 0, nextId: 1, moss: 0, score: 0, dead: false, hitKind: '' };
  }
  function jump(s) { s.ground = false; s.vy = C.JV; s.holdT = 0; s.buf = 0; s.jumpT = s.tick; }
  function applyInput(s, a) {
    if (s.dead || !ACTS[a]) return false;
    if (a === 'jd') { s.jHeld = true; if (s.ground) jump(s); else s.buf = C.BUF; }
    else if (a === 'ju') { s.jHeld = false; s.buf = 0; if (!s.ground && s.vy > C.CUT) s.vy = C.CUT; }
    else if (a === 'dd') { s.dHeld = true; if (!s.ground && s.vy > 0) s.vy = 0; }
    else s.dHeld = false;
    return true;
  }
  function spawn(s) {
    var r = s.rng, t = s.tick, pool = ['crate', 'crate', 'crate', 'candle', 'candle', 'books'];
    if (t >= 600) { pool.push('web', 'web', 'books', 'candle'); if (s.night) pool.push('rain', 'rain'); }
    if (t >= 1200) pool.push('crate2');
    var k = pool[r() % pool.length], K = KINDS[k];
    var x = C.SPAWN_X * SUB - s.sinceSpawn;
    s.obs.push({ k: k, x: x, w: K.w, lo: K.lo, hi: K.hi, id: s.nextId++, got: false });
    s.spawned++;
    var gapPx = 64 + ((s.speed * 24) >> 8) + K.w + (r() % 80) + (k === 'rain' || k === 'books' || k === 'crate2' ? 10 : 0);
    s.gap = gapPx * SUB;
    if (s.spawned > 2 && r() % 4 === 0) s.obs.push({ k: 'moss', x: x + (K.w + (gapPx >> 1)) * SUB, w: 6, lo: 24, hi: 30, id: s.nextId++, got: false });
  }
  function step(s) {
    if (s.dead) return s;
    s.tick++;
    s.speed = Math.min(C.VMAX, C.V0 + ((s.tick / C.RAMP) | 0));
    s.dist += s.speed;
    if (!s.ground) {
      var g = C.G;
      if (s.dHeld) g = C.GF;
      else if (s.jHeld && s.vy > 0 && s.holdT < C.HOLD_MAX) { g = C.GH; s.holdT++; }
      s.vy -= g; s.y += s.vy;
      if (s.y <= 0) { s.y = 0; s.vy = 0; s.ground = true; s.landT = s.tick; if (s.buf > 0 && s.jHeld) jump(s); }
      if (s.buf > 0) s.buf--;
    }
    var keep = [];
    for (var i = 0; i < s.obs.length; i++) { var o = s.obs[i]; o.x -= s.speed; if (o.x + o.w * SUB > 0) keep.push(o); }
    s.obs = keep;
    s.sinceSpawn += s.speed;
    if (s.sinceSpawn >= s.gap) { s.sinceSpawn -= s.gap; spawn(s); }
    var oh = (s.ground && s.dHeld) ? C.H_DUCK : C.H_STAND;
    var ox0 = (C.OCT_X + 2) * SUB, ox1 = (C.OCT_X + C.OCT_W - 2) * SUB, oy0 = s.y, oy1 = s.y + oh * SUB;
    for (var j = 0; j < s.obs.length; j++) {
      var b = s.obs[j]; if (b.got) continue;
      var ins = b.w >= 8 ? 2 * SUB : SUB, x0 = b.x + ins, x1 = b.x + b.w * SUB - ins;   /* 가장자리 너그럽게 */
      if (x1 > ox0 && x0 < ox1 && b.hi * SUB > oy0 && b.lo * SUB < oy1) {
        if (b.k === 'moss') { b.got = true; s.moss++; } else { s.dead = true; s.hitKind = b.k; break; }
      }
    }
    s.score = Math.floor(s.dist / (C.PT * SUB)) + s.moss * C.MOSS;
    return s;
  }
  /* inputs: [{t, a}] (t 오름차순). 틱 t 의 입력은 t 번째 step 전에 적용 — 라이브 루프와 같은 순서 */
  function simulate(seed, inputs, opts) {
    opts = opts || {};
    var s = createSim(seed, opts), ev = Array.isArray(inputs) ? inputs : [], i = 0;
    var until = opts.until != null ? Math.max(0, opts.until | 0) : C.MAX_TICKS;
    while (!s.dead && s.tick < until) {
      while (i < ev.length && (ev[i].t | 0) <= s.tick) { if ((ev[i].t | 0) === s.tick) applyInput(s, ev[i].a); i++; }
      step(s);
    }
    return { score: s.score, ticks: s.tick, dead: s.dead, moss: s.moss, dist: s.dist, hit: s.hitKind };
  }
  function verify(run) {
    if (!run || run.version !== VERSION) return false;
    var r = simulate(run.seed, run.inputs, { night: run.night, until: run.end === 'hit' ? null : run.ticks });
    return r.score === run.score && r.ticks === run.ticks;
  }

  var API = { VERSION: VERSION, C: C, KINDS: KINDS, hash32: hash32, mulberry32: mulberry32, seedFor: seedFor,
    createSim: createSim, applyInput: applyInput, step: step, simulate: simulate, verify: verify };
  if (typeof document === 'undefined' || typeof window === 'undefined') return API;   /* node: 여기까지만 */

  /* ═══════════════════════ 라이브 (브라우저) ═══════════════════════ */
  var KEY = 'ppolppol_runner';
  function load() { try { var o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o && typeof o === 'object') return o; } catch (e) { /* 저장소 없음 */ } return { v: 1, best: 0, runs: 0, day: '', dayN: 0, last: null }; }
  function store(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* 저장 실패해도 놀이는 계속 */ } }
  function dateKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function settings() { try { var o = JSON.parse(localStorage.getItem('ppolppol_v2') || 'null'); return (o && o.settings) || {}; } catch (e) { return {}; } }
  function reducedMotion() {
    var m = document.documentElement.getAttribute('data-motion') || settings().motion || 'auto';
    if (m === 'reduce') return true;
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function clock() {
    var o = window.__ppolRunner || {}, d = new Date();
    var h = o.hour != null ? o.hour : d.getHours(), m = o.month != null ? o.month : d.getMonth() + 1;
    var phase = (h >= 20 || h < 6) ? 'night' : (h >= 17 || h < 8) ? 'eve' : 'day';
    var season = (m >= 3 && m <= 5) ? 'spring' : (m >= 6 && m <= 8) ? 'summer' : (m >= 9 && m <= 11) ? 'autumn' : 'winter';
    return { phase: phase, season: season, day: dateKey(d) };
  }

  /* ── 팔레트 (Apollo) ── */
  var THEME = {
    day: { wall: '#c09473', wall2: '#ad7757', seam: '#ad7757', beam: '#7a4841', post: '#884b2b', dark: '#4d2b32', floor: '#884b2b', floor2: '#602c2c', floorHi: '#be772b', sky: '#a4dddb', sky2: '#73bed3', orb: '#e8c170', shadow: '#602c2c', ink: '#341c27' },
    eve: { wall: '#ad7757', wall2: '#7a4841', seam: '#7a4841', beam: '#602c2c', post: '#7a4841', dark: '#341c27', floor: '#7a4841', floor2: '#4d2b32', floorHi: '#ad7757', sky: '#de9e41', sky2: '#cf573c', orb: '#e8c170', shadow: '#4d2b32', ink: '#241527' },
    night: { wall: '#253a5e', wall2: '#1e1d39', seam: '#1e1d39', beam: '#172038', post: '#202e37', dark: '#090a14', floor: '#202e37', floor2: '#151d28', floorHi: '#394a50', sky: '#172038', sky2: '#10141f', orb: '#ebede9', shadow: '#10141f', ink: '#090a14' }
  };
  var OBJ = {
    day: { crate: '#be772b', crate2: '#884b2b', crateLine: '#4d2b32', wax: '#ebede9', waxSh: '#c7cfcc', holder: '#577277', web: '#ebede9', puddle: '#4f8fba', drop: '#a4dddb', moss: '#75a743', moss2: '#468232', mossHi: '#a8ca58',
      books: ['#a53030', '#3c5e8b', '#468232', '#de9e41', '#7a367b'] },
    night: { crate: '#7a4841', crate2: '#4d2b32', crateLine: '#090a14', wax: '#c7cfcc', waxSh: '#819796', holder: '#394a50', web: '#a8b5b2', puddle: '#3c5e8b', drop: '#73bed3', moss: '#468232', moss2: '#25562e', mossHi: '#75a743',
      books: ['#752438', '#253a5e', '#25562e', '#884b2b', '#402751'] }
  };
  var SEASON = { spring: ['#df84a5', '#c65197'], summer: ['#a8ca58', '#75a743'], autumn: ['#da863e', '#cf573c'], winter: ['#ebede9', '#c7cfcc'] };

  /* ── 문어 스프라이트: 초상 캡처 → 최근접 축소 24×24, 없으면 코드로 그린 문어 ── */
  var EXPR = { run: 'curious', jump: 'happy', hit: 'calm', idle: 'pet' };
  var OUTLINE = [36, 21, 39];   /* #241527 */
  function hexRGB(h) { var n = parseInt(String(h || '').replace('#', ''), 16); if (!/^#?[0-9a-f]{6}$/i.test(String(h))) n = 0xe8463c; return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function mix(c, k) { return c.map(function (v) { return Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k))); }); }
  function blank() { return { w: 24, h: 24, d: new Uint8ClampedArray(24 * 24 * 4) }; }
  function put(img, x, y, c) { if (x < 0 || y < 0 || x >= img.w || y >= img.h) return; var i = (y * img.w + x) * 4; img.d[i] = c[0]; img.d[i + 1] = c[1]; img.d[i + 2] = c[2]; img.d[i + 3] = 255; }
  function alphaAt(img, x, y) { return (x < 0 || y < 0 || x >= img.w || y >= img.h) ? 0 : img.d[(y * img.w + x) * 4 + 3]; }
  function outline(img) {
    var out = { w: img.w, h: img.h, d: new Uint8ClampedArray(img.d) };
    for (var y = 0; y < img.h; y++) for (var x = 0; x < img.w; x++) {
      if (alphaAt(img, x, y)) continue;
      if (alphaAt(img, x - 1, y) || alphaAt(img, x + 1, y) || alphaAt(img, x, y - 1) || alphaAt(img, x, y + 1)) put(out, x, y, OUTLINE);
    }
    return out;
  }
  function fromPortraits(raws) {
    var bx0 = 999, by0 = 999, bx1 = -1, by1 = -1, k, T = 128;
    for (k in raws) { var r = raws[k]; for (var y = 0; y < r.height; y++) for (var x = 0; x < r.width; x++) if (r.data[(y * r.width + x) * 4 + 3] >= T) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; } }
    if (bx1 < 0) return null;
    var bw = bx1 - bx0 + 1, bh = by1 - by0 + 1, s = Math.max(bw / 22, bh / 23), dw = Math.max(1, Math.round(bw / s)), dh = Math.max(1, Math.round(bh / s));
    var ox = (24 - dw) >> 1, oy = 23 - dh, out = {};
    for (k in raws) {
      var src = raws[k], img = blank();
      for (var j = 0; j < dh; j++) for (var i = 0; i < dw; i++) {
        var sx = bx0 + Math.min(bw - 1, Math.floor((i + 0.5) * s)), sy = by0 + Math.min(bh - 1, Math.floor((j + 0.5) * s)), p = (sy * src.width + sx) * 4;
        if (src.data[p + 3] >= T) put(img, ox + i, oy + j, [src.data[p], src.data[p + 1], src.data[p + 2]]);
      }
      out[k] = outline(img);
    }
    return out;
  }
  function drawnOctopus(expr, hex) {
    var img = blank(), base = hexRGB(hex), sh = mix(base, -0.28), hi = mix(base, 0.35), ink = [23, 32, 56], cheek = mix(base, 0.55);
    for (var y = 2; y <= 16; y++) for (var x = 3; x <= 20; x++) {
      var dx = (x + 0.5 - 12) / 8.6, dy = (y + 0.5 - 10) / 7.6;
      if (dx * dx + dy * dy <= 1) put(img, x, y, (dy > 0.45 || dx > 0.6) ? sh : base);
    }
    [3, 6, 9, 13, 16, 19].forEach(function (ax, n) {   /* 뭉툭한 팔 6개 (끝이 바깥으로 살짝 말림) */
      for (var y = 15; y <= 20; y++) { put(img, ax, y, y > 18 ? sh : base); put(img, ax + 1, y, sh); }
      put(img, n < 3 ? ax - 1 : ax + 2, 21, sh);
    });
    put(img, 7, 5, hi); put(img, 8, 5, hi); put(img, 7, 6, hi);
    var ey = 10;
    if (expr === 'happy') { put(img, 8, ey, ink); put(img, 9, ey - 1, ink); put(img, 10, ey, ink); put(img, 14, ey, ink); put(img, 15, ey - 1, ink); put(img, 16, ey, ink); }
    else if (expr === 'calm' || expr === 'pet') { [8, 9, 10, 14, 15, 16].forEach(function (x) { put(img, x, ey, ink); }); }
    else { put(img, 9, ey, ink); put(img, 9, ey + 1, ink); put(img, 15, ey, ink); put(img, 15, ey + 1, ink); }
    put(img, 7, 12, cheek); put(img, 17, 12, cheek);
    return outline(img);
  }
  function toCanvas(img, deg) {   /* 최근접 회전 → 26×26 캔버스 (각도 0 은 그대로) */
    var cv = document.createElement('canvas'); cv.width = cv.height = 26;
    var cx = cv.getContext('2d'), id = cx.createImageData(26, 26), a = -deg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    for (var y = 0; y < 26; y++) for (var x = 0; x < 26; x++) {
      var rx = x + 0.5 - 13, ry = y + 0.5 - 13, sx = Math.floor(rx * ca - ry * sa + 12), sy = Math.floor(rx * sa + ry * ca + 12);
      if (sx < 0 || sy < 0 || sx >= 24 || sy >= 24) continue;
      var p = (sy * 24 + sx) * 4, q = (y * 26 + x) * 4;
      if (img.d[p + 3]) { id.data[q] = img.d[p]; id.data[q + 1] = img.d[p + 1]; id.data[q + 2] = img.d[p + 2]; id.data[q + 3] = 255; }
    }
    cx.putImageData(id, 0, 0);
    return cv;
  }
  function buildSprites() {
    var imgs = null, src = 'drawn', sc = null;
    try { sc = window.APP && window.APP.scene; } catch (e) { sc = null; }
    if (sc && typeof sc.portrait === 'function') {
      try {
        var raws = {};
        Object.keys(EXPR).forEach(function (k) { var cv = sc.portrait(EXPR[k], { bg: 'transparent' }); raws[k] = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height); });
        imgs = fromPortraits(raws); if (imgs) src = 'portrait';
      } catch (e) { imgs = null; }
    }
    if (!imgs) { var col = settings().octColor || '#e8463c'; imgs = {}; Object.keys(EXPR).forEach(function (k) { imgs[k] = drawnOctopus(EXPR[k], col); }); }
    var out = { src: src };
    Object.keys(imgs).forEach(function (k) { out[k] = { '-7': toCanvas(imgs[k], -7), '0': toCanvas(imgs[k], 0), '7': toCanvas(imgs[k], 7) }; });
    return out;
  }

  /* ── DOM ── */
  var L = null;   /* 라이브 상태 */
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  var dlg, cv, ctx, hud, msg, ctrls, overP, btnJ, btnD, btnAgain, btnStop, finalEl, bestEl;
  function buildDialog() {
    if (dlg) return;
    cv = el('canvas', { id: 'rn-cv', width: String(C.W), height: String(C.H), tabindex: '0', role: 'img', 'aria-label': '다락방 달리기 화면. 스페이스나 위 화살표는 점프, 꾹 누르면 더 높이. 아래 화살표는 숙이기.' });
    ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
    hud = el('p', { class: 'rn-hud', 'aria-hidden': 'true' }, [el('span', { id: 'rn-score', text: '0' }), el('span', { class: 'rn-hud-best', id: 'rn-best', text: '' }), el('span', { class: 'rn-hud-moss', id: 'rn-moss', text: '' })]);
    msg = el('p', { class: 'rn-msg', id: 'rn-msg', 'aria-live': 'polite' });
    btnJ = el('button', { type: 'button', class: 'btn rn-pad rn-jump', id: 'rn-jump', tabindex: '-1', 'aria-label': '점프 (꾹 누르면 더 높이)' }, [el('span', { class: 'rn-arrow', 'aria-hidden': 'true', text: '▲' }), ' 점프']);
    btnD = el('button', { type: 'button', class: 'btn rn-pad rn-duck', id: 'rn-duck', tabindex: '-1', 'aria-label': '숙이기' }, [el('span', { class: 'rn-arrow', 'aria-hidden': 'true', text: '▼' }), ' 숙이기']);
    ctrls = el('div', { class: 'rn-ctrls', id: 'rn-ctrls' }, [btnJ, btnD]);
    finalEl = el('p', { class: 'rn-final', id: 'rn-final' }); bestEl = el('p', { class: 'rn-final-best', id: 'rn-final-best' });
    btnAgain = el('button', { type: 'button', class: 'btn primary pressable', id: 'rn-again', text: '또 할래?' });
    btnStop = el('button', { type: 'button', class: 'btn pressable', id: 'rn-stop', text: '그만' });
    overP = el('div', { class: 'rn-over', id: 'rn-over', role: 'status', hidden: '' }, [finalEl, bestEl, el('div', { class: 'btn-row center' }, [btnAgain, btnStop])]);
    var close = el('button', { type: 'button', class: 'btn sm pressable rn-close', id: 'rn-close', 'aria-label': '닫기', text: '닫기' });
    dlg = el('dialog', { id: 'runner-dlg', class: 'rn-dlg', 'aria-labelledby': 'rn-title' }, [
      el('div', { class: 'rn-top' }, [el('h2', { id: 'rn-title', text: '다락방 달리기' }), close]),
      hud,
      el('div', { class: 'rn-stage' }, [cv]),
      msg, ctrls, overP,
      el('p', { class: 'rn-note', text: '점수는 이 기기에만 남아. 소리는 없어.' })
    ]);
    document.body.appendChild(dlg);
    close.addEventListener('click', function () { dlg.close(); });
    btnStop.addEventListener('click', function () { dlg.close(); });
    btnAgain.addEventListener('click', function () { if (!btnAgain.disabled) ready(); });
    dlg.addEventListener('close', onClose);
    dlg.addEventListener('keydown', onKey); dlg.addEventListener('keyup', onKey);
    function pad(btn, down, up) {
      btn.addEventListener('pointerdown', function (e) { e.preventDefault(); try { btn.setPointerCapture(e.pointerId); } catch (x) { /* 없음 */ } press(down); });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) { btn.addEventListener(t, function () { press(up); }); });
      btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    }
    pad(btnJ, 'jd', 'ju'); pad(btnD, 'dd', 'du');
    var sw = null;   /* 캔버스: 탭 = 점프, 아래로 쓸기 = 숙이기 */
    cv.addEventListener('pointerdown', function (e) { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (x) { /* 없음 */ } sw = { y: e.clientY, duck: false }; press('jd'); });
    cv.addEventListener('pointermove', function (e) { if (sw && !sw.duck && e.clientY - sw.y > 14) { sw.duck = true; press('ju'); press('dd'); } });
    ['pointerup', 'pointercancel'].forEach(function (t) { cv.addEventListener(t, function () { if (!sw) return; if (sw.duck) press('du'); else press('ju'); sw = null; }); });
    window.addEventListener('resize', function () { if (dlg.open) fit(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden && L && L.state === 'run') pause(); });
  }
  function onKey(e) {
    var k = e.key, down = e.type === 'keydown';
    var J = k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W', D = k === 'ArrowDown' || k === 's' || k === 'S';
    if (!J && !D) return;
    if (e.target && e.target.tagName === 'BUTTON' && e.target !== btnJ && e.target !== btnD) return;   /* 포커스된 버튼(또 할래?/그만/닫기)은 기본 동작 */
    e.preventDefault();
    if (down && e.repeat) return;
    press(J ? (down ? 'jd' : 'ju') : (down ? 'dd' : 'du'));
  }
  function press(a) {
    if (!L) return;
    if (L.state === 'over') return;
    if (L.state === 'pause') { if (a === 'jd' || a === 'dd') resume(); return; }
    var held = a[0] === 'j' ? 'j' : 'd', isDown = a[1] === 'd';
    if (L.held[held] === isDown) return;   /* 같은 상태 반복은 버린다 (키 반복·두 입력원) */
    L.held[held] = isDown;
    if (L.state === 'ready') { if (a !== 'jd') return; start(); }
    if (L.state === 'run') L.queue.push(a);
  }
  function fit() {
    var dpr = window.devicePixelRatio || 1, stage = cv.parentNode;
    var cs = getComputedStyle(stage), bw = parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth) + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    var availW = dlg.clientWidth - 24 - bw, availH = Math.max(108, window.innerHeight - 380);
    var k = Math.max(1, Math.floor(Math.min(availW * dpr / C.W, availH * dpr / C.H)));
    cv.style.width = (C.W * k / dpr) + 'px'; cv.style.height = (C.H * k / dpr) + 'px';
  }
  function setMsg(t) { msg.textContent = t; }
  function ready() {
    var st = load(), ck = clock();
    if (st.day !== ck.day) { st.day = ck.day; st.dayN = 0; }
    var seed = (L && L.serverSeed != null) ? (L.serverSeed >>> 0) : seedFor(ck.day, st.dayN);
    L.store = st; L.clock = ck; L.seed = seed; L.sim = createSim(seed, { night: ck.phase === 'night' });
    L.inputs = []; L.queue = []; L.held = { j: false, d: false }; L.state = 'ready'; L.acc = 0; L.last = 0; L.hitAt = 0; L.saved = false; L.newBest = false;
    L.parts = []; L.reduced = reducedMotion();
    overP.hidden = true; ctrls.hidden = false;
    setMsg('탭하거나 스페이스를 누르면 출발해. 꾹 누르면 더 높이 뛰어');
    hudUpdate(true);
    try { cv.focus({ preventScroll: true }); } catch (e) { cv.focus(); }
  }
  function start() {
    L.state = 'run'; L.store.dayN = (L.store.dayN | 0) + 1; L.store.runs = (L.store.runs | 0) + 1; store(L.store);
    setMsg('');
  }
  function pause() {
    if (L.held.j) { L.held.j = false; L.queue.push('ju'); }
    if (L.held.d) { L.held.d = false; L.queue.push('du'); }
    L.state = 'pause'; L.last = 0; setMsg('잠깐 쉬는 중이야. 탭하면 이어서 달려');
  }
  function resume() { L.state = 'run'; L.last = 0; L.acc = 0; setMsg(''); }
  function tickOnce() {
    var s = L.sim;
    while (L.queue.length) { var a = L.queue.shift(); if (applyInput(s, a)) L.inputs.push({ t: s.tick, a: a }); }
    step(s);
    if (s.dead) over('hit');
  }
  function record(end) {
    var s = L.sim;
    return { seed: L.seed, inputs: L.inputs.slice(), score: s.score, ticks: s.tick, end: end, night: s.night, moss: s.moss, version: VERSION, day: L.clock.day, at: Date.now() };
  }
  function saveRun(end) {
    if (L.saved || !L.sim.tick) return;
    L.saved = true;
    var st = load(); st.day = L.store.day; st.dayN = L.store.dayN; st.runs = L.store.runs;
    var r = record(end); st.last = r;
    if (r.score > (st.best | 0)) { st.best = r.score; L.newBest = true; }
    store(st); L.store = st;
  }
  function over(end) {
    L.state = 'over'; L.hitAt = performance.now();
    saveRun(end);
    ctrls.hidden = true; overP.hidden = false; setMsg('');
    finalEl.textContent = (L.sim.hitKind ? HITCOPY[L.sim.hitKind] || '콩!' : '') + ' ' + L.sim.score + '만큼 달렸어';
    bestEl.textContent = L.newBest ? '새 최고 기록이야! 최고 ' + L.store.best : '최고 ' + (L.store.best | 0) + (L.sim.moss ? ' · 이끼 ' + L.sim.moss + '개 주웠어' : '');
    hudUpdate(true);
    btnAgain.disabled = true; btnStop.disabled = true;
    setTimeout(function () { if (!L || L.state !== 'over') return; btnAgain.disabled = false; btnStop.disabled = false; btnAgain.focus(); }, 450);
  }
  var HITCOPY = { crate: '상자에 콩!', crate2: '상자 더미에 콩!', candle: '촛대에 톡!', books: '책 더미에 콩!', web: '거미줄에 폭!', rain: '물웅덩이에 첨벙!' };
  var lastHud = '';
  function hudUpdate(force) {
    var s = L.sim, t = s.score + '|' + s.moss + '|' + (L.store.best | 0);
    if (!force && t === lastHud) return; lastHud = t;
    document.getElementById('rn-score').textContent = String(s.score);
    document.getElementById('rn-best').textContent = '최고 ' + (L.store.best | 0);
    document.getElementById('rn-moss').textContent = s.moss ? '이끼 ' + s.moss : '';
  }
  function onClose() {
    if (L) {
      if (L.state === 'run' || L.state === 'pause') { while (L.queue.length) { var a = L.queue.shift(); if (applyInput(L.sim, a)) L.inputs.push({ t: L.sim.tick, a: a }); } saveRun('quit'); }
      cancelAnimationFrame(L.raf);
      var op = L.opener; L = null;
      if (op && typeof op.focus === 'function' && document.contains(op)) { try { op.focus(); } catch (e) { /* 없음 */ } }
    }
  }
  function open(opts) {
    opts = opts || {};
    buildDialog();
    if (dlg.open) return;
    L = { opener: opts.opener || document.activeElement, serverSeed: opts.seed != null ? opts.seed : null, sprites: buildSprites(), raf: 0 };
    dlg.showModal();
    fit(); ready();
    L.raf = requestAnimationFrame(frame);
  }
  var DT = 1000 / 60;
  function frame(ts) {
    if (!L) return;
    if (L.state === 'run') {
      if (!L.last) L.last = ts;
      L.acc += Math.min(250, ts - L.last); L.last = ts;
      while (L.acc >= DT && L.state === 'run') { tickOnce(); L.acc -= DT; }
      hudUpdate(false);
    }
    draw(ts);
    if (L) L.raf = requestAnimationFrame(frame);
  }

  /* ── 그리기 (모두 정수 px fillRect) ── */
  function R(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w, h); }
  function mod(a, n) { return ((a % n) + n) % n; }
  function draw(ts) {
    var s = L.sim, ck = L.clock, T = THEME[ck.phase], O = OBJ[ck.phase === 'night' ? 'night' : 'day'], px = Math.floor(s.dist / SUB);
    var shake = (!L.reduced && L.state === 'over' && ts - L.hitAt < 220) ? (Math.floor(ts / 40) % 2 ? 1 : -1) : 0;
    ctx.setTransform(1, 0, 0, 1, shake, 0);
    /* 벽: 판자 (½ 시차) */
    R(-2, 0, C.W + 4, C.GY, T.wall);
    var p2 = Math.floor(px / 2);
    for (var x = -mod(p2, 12); x < C.W + 2; x += 12) R(x, 14, 1, C.GY - 14, T.seam);
    /* 창 (¼ 시차) */
    var wx = C.W - mod(Math.floor(px / 4) + 60, 260);
    if (wx > -30 && wx < C.W + 2) drawWindow(wx, 24, T, ck);
    /* 기둥 + 버팀대 (½ 시차) */
    for (var bx = -mod(p2, 96) + 70; bx < C.W + 40; bx += 96) {
      R(bx, 12, 4, C.GY - 12, T.post); R(bx + 4, 12, 1, C.GY - 12, T.dark);
      for (var i = 0; i < 12; i++) { R(bx - 12 + i, 24 - i, 2, 1, T.post); R(bx + 4 + i, 13 + i, 2, 1, T.post); }
    }
    /* 천장 들보 */
    R(-2, 0, C.W + 4, 9, T.beam); R(-2, 9, C.W + 4, 3, T.post); R(-2, 12, C.W + 4, 1, T.dark);
    for (var rx = -mod(p2, 24); rx < C.W + 2; rx += 24) R(rx, 0, 1, 9, T.dark);
    /* 바닥 (1× 시차) */
    R(-2, C.GY, C.W + 4, C.H - C.GY, T.floor); R(-2, C.GY, C.W + 4, 1, T.floorHi); R(-2, C.GY + 8, C.W + 4, 1, T.floor2);
    for (var fx = -mod(px, 32); fx < C.W + 2; fx += 32) { R(fx, C.GY + 1, 1, 7, T.floor2); R(fx + 16, C.GY + 9, 1, 7, T.floor2); R(fx + 3, C.GY + 3, 1, 1, T.dark); }
    /* 장애물 */
    for (var j = 0; j < s.obs.length; j++) drawObs(s.obs[j], O, T, ts);
    drawOct(s, T, ts);
    if (!L.reduced) particles(s, ck, ts);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  function drawWindow(x, y, T, ck) {
    var w = 26, h = 20, P = SEASON[ck.season];
    R(x - 2, y - 2, w + 4, h + 4, T.dark); R(x, y, w, h, T.sky); R(x, y + 12, w, h - 12, T.sky2);
    R(x + 18, y + 3, 4, 4, T.orb); if (ck.phase === 'night') { R(x + 17, y + 3, 1, 1, T.sky); R(x + 4, y + 4, 1, 1, '#ebede9'); R(x + 10, y + 2, 1, 1, '#c7cfcc'); }
    if (ck.season === 'winter') { R(x, y + h - 3, w, 3, '#ebede9'); R(x + 3, y + h - 4, 6, 1, '#ebede9'); }
    else { R(x + 1, y + h - 6, 8, 6, P[1]); R(x + 2, y + h - 8, 5, 2, P[0]); R(x + 5, y + h - 5, 2, 1, P[0]); R(x + 19, y + h - 4, 7, 4, P[1]); }
    R(x + 12, y, 2, h, T.post); R(x, y + 9, w, 2, T.post); R(x - 3, y + h + 2, w + 6, 2, T.post);
  }
  function drawObs(o, O, T, ts) {
    var x = Math.floor(o.x / SUB), gy = C.GY, k = o.k;
    if (x > C.W + 4 || x + o.w < -4) return;
    if (k === 'crate' || k === 'crate2') {
      var n = k === 'crate2' ? 2 : 1, cw = 12;
      for (var c = 0; c < n; c++) {
        var cx = x + c * 10, ch = o.hi, top = gy - ch;
        R(cx, top, cw, ch, O.crateLine); R(cx + 1, top + 1, cw - 2, ch - 2, O.crate);
        R(cx + 1, top + 4, cw - 2, 1, O.crate2); R(cx + 1, top + 7, cw - 2, 1, O.crate2);
        for (var d = 0; d < cw - 2; d++) R(cx + 1 + d, top + 1 + Math.floor(d * (ch - 3) / (cw - 3)), 1, 1, O.crateLine);
      }
    } else if (k === 'candle') {
      var top2 = gy - o.hi;
      R(x - 1, gy - 2, 6, 2, O.holder); R(x, top2 + 3, 4, o.hi - 5, O.wax); R(x + 3, top2 + 3, 1, o.hi - 5, O.waxSh); R(x + 1, top2 + 2, 1, 1, T.ink);
      var fl = L.reduced ? 0 : Math.floor(ts / 120) % 2;
      R(x + 1 - fl, top2 - 2, 2, 3, '#de9e41'); R(x + 1, top2 - 3 + fl, 1, 2, '#e8c170');
    } else if (k === 'books') {
      for (var b = 0; b < 4; b++) {
        var bw = [10, 9, 10, 8][b], off = [0, 1, 0, 1][(b + o.id) % 4], by = gy - (b + 1) * 5, col = O.books[(o.id * 3 + b) % 5];
        R(x + off, by, bw - off, 5, T.ink); R(x + off + 1, by + 1, bw - off - 2, 3, col); R(x + off + 1, by + 2, bw - off - 2, 1, '#e7d5b3');
      }
    } else if (k === 'web') {
      var wb = gy - o.lo, wt = wb - 10;
      R(x + 7, 12, 1, wt - 12, O.web);
      var WEB = ['....#.#.#.......', '..#..###..#.....', '.#..#.#.#..#....', '#..#..#..#..#...', '#.#########.##..', '.#..#..#..#..#..', '..#..#.#.#..#...', '...#..###..#....', '.....#.#.#......', '.......#........'];
      for (var r = 0; r < WEB.length; r++) for (var q = 0; q < 16; q++) if (WEB[r][q] === '#') R(x + q, wt + r, 1, 1, O.web);
      R(x + 9, wt + 4, 2, 2, T.ink);
    } else if (k === 'rain') {
      R(x, gy - 1, o.w, 2, O.puddle); R(x + 2, gy - 2, o.w - 4, 1, O.puddle);
      for (var dI = 0; dI < 4; dI++) { var ph = L.reduced ? 2 : Math.floor(ts / 90 + dI * 2) % 6; R(x + 3 + dI * 6, gy - 7 + ph, 1, 2, O.drop); if (ph >= 5) { R(x + 2 + dI * 6, gy - 3, 1, 1, O.drop); R(x + 4 + dI * 6, gy - 3, 1, 1, O.drop); } }
      R(x + 1, gy - 7, 1, 1, O.drop); R(x + o.w - 2, gy - 6, 1, 1, O.drop);
    } else if (k === 'moss') {
      if (o.got) return;
      var my = gy - o.hi + (L.reduced ? 0 : (Math.floor(ts / 300) % 2));
      R(x, my + 3, 6, 3, O.moss2); R(x + 1, my + 1, 4, 3, O.moss); R(x + 2, my, 1, 1, O.mossHi); R(x + 4, my + 1, 1, 1, O.mossHi); R(x + 1, my + 2, 1, 1, O.mossHi);
    }
  }
  function drawOct(s, T, ts) {
    var S = L.sprites, h = Math.floor(s.y / SUB), st = L.state;
    var duck = s.ground && s.dHeld && st !== 'over';
    var key = st === 'over' ? 'hit' : st === 'ready' ? 'idle' : !s.ground ? 'jump' : 'run';
    var tilt = '0', bob = 0;
    if (st === 'run' && s.ground && !duck) { var f = Math.floor(s.tick / 5) % 4; tilt = ['-7', '0', '7', '0'][f]; bob = f % 2 ? -1 : 0; }
    if (st === 'ready' || st === 'pause') bob = (L.reduced ? 0 : Math.floor(ts / 500) % 2) ? -1 : 0;
    var img = S[key][tilt], w = 26, hh = 26;
    if (duck) { img = S.idle['0']; w = 30; hh = 16; }
    else if (st === 'run' && s.ground && s.tick - s.landT < 6) { w = 28; hh = 22; }
    else if (st === 'run' && !s.ground && s.tick - s.jumpT < 5) { w = 24; hh = 28; }
    /* 그림자 */
    var sw = Math.max(6, 14 - (h >> 2));
    R(C.OCT_X + 7 - (sw >> 1), C.GY, sw, 1, T.shadow);
    var dx = C.OCT_X + 7 - (w >> 1), dy = C.GY - h - hh + 1 + bob + (hh === 26 ? 1 : 0);
    ctx.drawImage(img, dx, dy, w, hh);
  }
  function particles(s, ck, ts) {
    var P = L.parts, col = SEASON[ck.season];
    if (!P.length) for (var i = 0; i < 9; i++) P.push({ x: Math.random() * C.W, y: 14 + Math.random() * (C.GY - 20), v: 0.15 + Math.random() * 0.25, c: i % 2, ph: Math.random() * 6 });
    var sp = L.state === 'run' ? s.speed / SUB * 0.3 : 0.1;
    for (var j = 0; j < P.length; j++) {
      var p = P[j];
      p.x -= sp + 0.05; p.y += ck.season === 'winter' ? p.v : p.v * 0.6;
      if (p.x < -2 || p.y > C.GY) { p.x = C.W + Math.random() * 20; p.y = 14 + Math.random() * 30; }
      var wob = Math.floor(Math.sin(ts / 400 + p.ph) * 1.5);
      R(Math.floor(p.x) + wob, Math.floor(p.y), ck.season === 'winter' ? 1 : 2, 1, col[p.c]);
    }
  }

  /* ── 방 보기 시트에 "같이 놀기" 버튼 (app.js 수정 없이) ── */
  function inject() {
    var sheet = document.getElementById('room-sheet');
    if (!sheet || document.getElementById('rs-play')) return;
    var b = el('button', { type: 'button', class: 'btn wide pressable rn-entry', id: 'rs-play' }, ['같이 놀기 ', el('span', { class: 'rn-entry-sub', text: '다락방 달리기' })]);
    b.addEventListener('click', function () { open({ opener: b }); });
    var closeBtn = document.getElementById('rs-close');
    if (closeBtn && closeBtn.parentNode === sheet) sheet.insertBefore(b, closeBtn); else sheet.appendChild(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject); else inject();

  API.open = open;
  API.close = function () { if (dlg && dlg.open) dlg.close(); };
  API.load = load;
  API.live = function () { return L ? { state: L.state, score: L.sim.score, ticks: L.sim.tick, seed: L.seed, inputs: L.inputs.slice(), night: L.sim.night, sprites: L.sprites.src, phase: L.clock.phase, season: L.clock.season } : null; };
  return API;
})();
if (typeof module !== 'undefined' && module.exports) module.exports = RUNNER;
