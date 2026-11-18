/* js/runner.js — 다락방 달리기 (크롬 공룡식 작은 러너, 주인공 = 문어). 전역 RUNNER. 모듈 없음, file:// 안전.
 *   docs/MINIGAME.md 참고. 시뮬레이션은 DOM 없이 돈다 (node: tools/test-runner.js).
 *   결정성: 60 Hz 고정 틱 · 정수(1/256 px) 위치 · mulberry32 시드 · 입력은 [{t, a}] (a = jd|ju|dd|du).
 *   RUNNER.simulate(seed, inputs, { night, until }) → { score, ticks, dead, moss } — 라이브 판과 비트 단위로 같다.
 */
var RUNNER = (function () {
  'use strict';
  /* 11-15 runner-2: 세로 전체 화면 (주인 HANDOFF 6). 시뮬은 문어 자리(OCT_X)와 속도만 바뀌었다 — 옛 판(runner-1)은 서버가 거절, 순위는 판마다 따로 */
  var VERSION = 'runner-2';
  var SUB = 256;                       /* 1 아트 px = 256 서브 px (정수) */
  var C = {
    W: 192, H: 108, GY: 92,            /* W = 보이는 폭의 최대(아트 px, SPAWN_X 보다 좁게 — 장애물이 화면 밖에서 생긴다). H·GY 는 옛 가로 띠 크기 (그림은 화면 크기를 따른다, fit) */
    OCT_X: 10, OCT_W: 14, H_STAND: 18, H_DUCK: 10,   /* 11-15: 문어를 왼쪽 끝으로 (30 → 10) — 크게 보여도 앞이 넓게 */
    JV: 760, G: 44, GH: 20, HOLD_MAX: 12, CUT: 680, GF: 140, BUF: 6,   /* 서브 px / 틱, 서브 px / 틱² */
    V0: 224, VMAX: 358, RAMP: 24,      /* 11-15: 속도 0.875 → 1.4 px/틱, 24 틱마다 +1 서브 px (≈ 54 초에 최고). 예전 1.25 → 2.75 — 크게 보이는 만큼 느리게:
                                          360 폭 폰(앞 ≈ 80 px)에서 장애물이 보이고 닿기까지 최고 속도에서도 ≈ 0.95 초 (예전 ≈ 0.9 초), 화면 위 빠르기도 예전과 비슷 */
    SPAWN_X: 200, PT: 8, MOSS: 20, FIRST_GAP: 40, MAX_TICKS: 60 * 60 * 30
  };
  /* 장애물: lo/hi = 바닥에서 잰 높이(px). web 은 천장까지 → 숙여야 지나간다 */
  var KINDS = {
    crate: { w: 12, lo: 0, hi: 9 }, crate2: { w: 22, lo: 0, hi: 9 }, candle: { w: 4, lo: 0, hi: 16 },
    books: { w: 10, lo: 0, hi: 20 }, web: { w: 16, lo: 13, hi: 120 }, rain: { w: 20, lo: 0, hi: 7 }   /* 11-15 runner-2: 물웅덩이 24 → 20 (느려진 만큼 넘을 틈을 예전만큼) */
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
  function load() { try { var o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o && typeof o === 'object') return o; } catch (e) { /* 저장소 없음 */ } return { v: 1, best: 0, best2: 0, runs: 0, day: '', dayN: 0, last: null }; }
  /* 11-15: 최고는 판(VERSION)마다 따로. best = 옛 게임(runner-1) 최고 — 지우지도 바꾸지도 않고 '예전 게임 최고' 로만 보인다. best2 = runner-2 */
  function bestOf(st) { return (st && st.best2) | 0; }
  function oldBestOf(st) { return (st && st.best) | 0; }
  function store(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* 저장 실패해도 놀이는 계속 */ } }
  function dateKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  /* '오늘' = js/app.js todayKey 와 같은 규칙: 테스트 훅 window.__ppolTest.today = 'YYYY-MM-DD' 가 있을 때만 그 날짜 (그날 판 번호·시드도 그 날로) */
  function todayKey(d) { var t = window.__ppolTest; return (t && typeof t === 'object' && /^\d{4}-\d{2}-\d{2}$/.test(t.today || '')) ? t.today : dateKey(d); }
  function saved() { try { var o = JSON.parse(localStorage.getItem('ppolppol_v2') || 'null'); return (o && typeof o === 'object') ? o : {}; } catch (e) { return {}; } }
  function settings() { return saved().settings || {}; }
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
    return { phase: phase, season: season, day: todayKey(d) };
  }

  /* ── 주간 랭킹 (http(s) 에서만. file:// 이면 네트워크를 전혀 안 쓴다) — docs/MINIGAME.md "랭킹 서버" ── */
  var NET = false;
  try { NET = /^https?:$/.test(location.protocol); } catch (e) { NET = false; }
  var API_BASE = 'api/runner/';
  function fetchJson(url, opts, ms) {   /* 실패는 전부 { status: 0 } — 절대 throw 하지 않는다 */
    if (!NET || typeof fetch !== 'function') return Promise.resolve({ status: 0, json: null });
    var ac = typeof AbortController === 'function' ? new AbortController() : null, timer = null;
    var o = Object.assign({ cache: 'no-store', credentials: 'same-origin' }, opts || {}); if (ac) o.signal = ac.signal;
    return new Promise(function (resolve) {
      timer = setTimeout(function () { if (ac) try { ac.abort(); } catch (e) { /* 없음 */ } resolve({ status: 0, json: null }); }, ms || 4000);
      fetch(API_BASE + url, o).then(function (r) {
        return r.json().catch(function () { return null; }).then(function (j) { clearTimeout(timer); resolve({ status: r.status, json: j }); });
      }).catch(function () { clearTimeout(timer); resolve({ status: 0, json: null }); });
    });
  }
  function weekKeyKST(ms) {   /* 서버(api/_lib/core.js weekKey)와 같은 계산: Asia/Seoul ISO 주 */
    var d = new Date(ms + 9 * 3600 * 1000), day = d.getUTCDay() || 7;
    var thu = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) + (4 - day) * 86400000, y = new Date(thu).getUTCFullYear();
    return y + '-W' + String(1 + Math.floor((thu - Date.UTC(y, 0, 1)) / (7 * 86400000))).padStart(2, '0');
  }
  function octName() { try { var o = JSON.parse(localStorage.getItem('ppolppol_v2') || 'null'); var n = o && o.octopus && o.octopus.name; return typeof n === 'string' ? n.slice(0, 12) : ''; } catch (e) { return ''; } }
  function netState(st) {
    var n = (st && st.net && typeof st.net === 'object') ? st.net : {};
    if (!Array.isArray(n.subs)) n.subs = [];
    if (!n.awards || typeof n.awards !== 'object') n.awards = {};
    if (!Array.isArray(n.awards.paper_crown)) n.awards.paper_crown = [];
    if (!Array.isArray(n.awards.emperor_cape)) n.awards.emperor_cape = [];
    return n;
  }
  function addAward(n, kind, week) { if (n.awards[kind].indexOf(week) < 0) n.awards[kind].push(week); }
  var AWARD_NAME = { paper_crown: '종이 왕관', emperor_cape: '황제 망토' };

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

  /* ── 문어 스프라이트 (11-18 6차, 주인 "원본 참고해서 다시 그려"): 다락 3D 문어를 그대로 굽는다 (walkPortrait · 다락 1× 밀도 27 px/m).
     예전엔 64×64 머리 초상을 정수 아닌 비율로 줄이고(24×24) ±7° 돌리고(26×26) 늘여 그려서(30×16 · 28×22 · 24×28) 줄이 겹치거나 빠졌다.
     이제 상태마다 따로 찍은 그림을 제 크기 그대로 정수 자리에만 놓는다 (줄이기 · 돌리기 · 늘이기 없음). 얼굴은 모든 칸 idle (리드 선택 —
     예전 curious · happy · calm 은 코드가 기분을 칠한 것). 3D 장면이 없거나 굽기가 실패하면 코드로 그린 문어 (상태별 모양을 수치로, 역시 제 크기) */
  var OUTLINE = [36, 21, 39];   /* #241527 */
  var BAKE = { yaw: 30, tilt: 15, hw: 2.82, ty: 0.4,   /* ty 0.4 = 64×64 안에 발 · 머리가 여유 있게 (재 보니 위아래 14 px 넘게 빈다) */
    states: { run: [{ ph: 0 }, { ph: 0.5 }, { ph: 1.0 }, { ph: 1.5 }], jump: [{ still: true, sq: [0.92, 1.10] }], land: [{ still: true, sq: [1.10, 0.88] }],
      duck: [{ still: true, sq: [1.20, 0.62] }], hit: [{ still: true }], idle: [{ still: true }] } };
  var SPR_CACHE = {};   /* 몸색 | 팔레트 → 구운 그림 (열 때마다 다시 굽지 않는다) */
  function hexRGB(h) { var n = parseInt(String(h || '').replace('#', ''), 16); if (!/^#?[0-9a-f]{6}$/i.test(String(h))) n = 0xe8463c; return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function mix(c, k) { return c.map(function (v) { return Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k))); }); }
  /* 그림 묶음 (ImageData 들) → 한 상태의 공통 알파 상자로 잘라 캔버스로. 발은 맨 아래 줄 · 알파는 0 / 255 만 */
  function cropState(datas) {
    var W = datas[0].width, H = datas[0].height, l = W, t = H, r = -1, b = -1;
    datas.forEach(function (d) { for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) if (d.data[(y * W + x) * 4 + 3] >= 128) { if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y; } });
    if (r < 0) return null;
    var w = r - l + 1, h = b - t + 1;
    return datas.map(function (d) {
      var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      var cx = cv.getContext('2d'), id = cx.createImageData(w, h), gw0 = w, gw1 = -1;
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
        var p = ((y + t) * W + x + l) * 4, q = (y * w + x) * 4;
        if (d.data[p + 3] < 128) continue;
        id.data[q] = d.data[p]; id.data[q + 1] = d.data[p + 1]; id.data[q + 2] = d.data[p + 2]; id.data[q + 3] = 255;
        if (y >= h - 3) { if (x < gw0) gw0 = x; if (x > gw1) gw1 = x; }
      }
      cx.putImageData(id, 0, 0);
      cv.gw = gw1 < 0 ? 0 : gw1 - gw0 + 1;   /* 땅 가까운 폭 (아래 3 줄 — 그림자 폭) */
      return cv;
    });
  }
  function bakeSprites(sc) {
    var key = String(sc.color ? sc.color() : '') + '|' + String(sc.paletteName ? sc.paletteName() : '');
    if (SPR_CACHE[key]) return SPR_CACHE[key];
    var out = { src: 'bake' };
    Object.keys(BAKE.states).forEach(function (k) {
      var datas = BAKE.states[k].map(function (f) {
        var cv = sc.walkPortrait(f.ph || 0, { yaw: BAKE.yaw, tilt: BAKE.tilt, hw: BAKE.hw, ty: BAKE.ty, still: !!f.still, sq: f.sq, bg: 'transparent' });
        return cv.getContext('2d').getImageData(0, 0, cv.width, cv.height);
      });
      var fr = cropState(datas);
      if (!fr) throw new Error('empty bake');
      fr.forEach(function (c) { c.octKey = k; });   /* 시험용 표시 (스모크가 그리기 호출에서 문어 그림을 알아본다) */
      out[k] = fr;
    });
    out.gw = out.idle[0].gw;
    SPR_CACHE[key] = out;
    return out;
  }
  /* 코드로 그린 문어 (굽기를 못 할 때): 머리 타원 + 뭉툭한 다리 6, 상태별로 너비 sx · 높이 sy · 다리 위상 lp 만 바꿔 처음부터 그린다 (줄이기 · 돌리기 없음) */
  function drawnOctopus(hex, o) {
    var W = 44, H = 34, d = { width: W, height: H, data: new Uint8ClampedArray(W * H * 4) };
    function put(x, y, c) { if (x < 0 || y < 0 || x >= W || y >= H) return; var i = (y * W + x) * 4; d.data[i] = c[0]; d.data[i + 1] = c[1]; d.data[i + 2] = c[2]; d.data[i + 3] = 255; }
    var base = hexRGB(hex), sh = mix(base, -0.28), hi = mix(base, 0.35), ink = [23, 32, 56];
    var sx = o.sx || 1, sy = o.sy || 1, rx = 8.6 * sx, ry = 7.6 * sy, legH = Math.max(2, Math.round(6 * sy)), foot = H - 2, cy = foot - legH - ry + 2, cx = W / 2;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var ex = (x + 0.5 - cx) / rx, ey = (y + 0.5 - cy) / ry;
      if (ex * ex + ey * ey <= 1) put(x, y, (ey > 0.45 || ex > 0.6) ? sh : base);
    }
    [-9, -6, -3, 1, 4, 7].forEach(function (off, n) {   /* 다리 6 — lp 로 번갈아 한 칸 들린다 */
      var ax = Math.round(cx + off * sx), lift = (o.lp != null && (n & 1) === (o.lp & 1)) ? 1 : 0;
      for (var y = foot - legH; y <= foot - lift; y++) { put(ax, y, y > foot - 2 ? sh : base); put(ax + 1, y, sh); }
    });
    put(Math.round(cx - 4 * sx), Math.round(cy - 4 * sy), hi); put(Math.round(cx - 3 * sx), Math.round(cy - 4 * sy), hi);
    var eyY = Math.round(cy), eL = Math.round(cx - 3 * sx), eR = Math.round(cx + 3 * sx);
    put(eL, eyY, ink); put(eR, eyY, ink); if (sy >= 0.8) { put(eL, eyY + 1, ink); put(eR, eyY + 1, ink); }   /* idle 눈 (점 · 납작할 땐 한 칸) */
    var src = new Uint8ClampedArray(d.data);   /* 외곽선 1 px (#241527) */
    for (var y2 = 0; y2 < H; y2++) for (var x2 = 0; x2 < W; x2++) {
      if (src[(y2 * W + x2) * 4 + 3]) continue;
      var nb = [[x2 - 1, y2], [x2 + 1, y2], [x2, y2 - 1], [x2, y2 + 1]].some(function (q) { return q[0] >= 0 && q[1] >= 0 && q[0] < W && q[1] < H && src[(q[1] * W + q[0]) * 4 + 3]; });
      if (nb) put(x2, y2, OUTLINE);
    }
    return d;
  }
  var DRAWN = { run: [{ lp: 0 }, { lp: 1, sy: 1.04 }, { lp: 1 }, { lp: 0, sy: 1.04 }], jump: [{ sx: 0.92, sy: 1.10 }], land: [{ sx: 1.10, sy: 0.88 }], duck: [{ sx: 1.20, sy: 0.62 }], hit: [{}], idle: [{}] };
  function buildSprites() {
    var sc = null;
    try { sc = window.APP && window.APP.scene; } catch (e) { sc = null; }
    if (sc && typeof sc.walkPortrait === 'function') { try { return bakeSprites(sc); } catch (e) { /* 아래 그린 문어로 */ } }
    var oc = saved().octopus, col = (oc && /^#[0-9a-f]{6}$/i.test(oc.color || '') ? oc.color : null) || settings().octColor || '#e8463c';   /* 몸 색은 octopus.color 먼저 (settings.octColor 는 그 사본 — docs/SALON.md §1.3) */
    var out = { src: 'drawn' };
    Object.keys(DRAWN).forEach(function (k) { out[k] = cropState(DRAWN[k].map(function (o) { return drawnOctopus(col, o); })); out[k].forEach(function (c) { c.octKey = k; }); });
    out.gw = out.idle[0].gw;
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
  /* 11-15 5차 (주인 답 a): 달리기 안내 글 → 직접 그린 12×12 픽셀 그림 (inline SVG, 글자 기호 없음). 크기는 fit 이 기기 px 정수 배로 (--rn-px) */
  var PIXC = { o: '#241527', w: '#ebede9', s: '#c7cfcc', y: '#de9e41', h: '#e8c170', r: '#a53030' };
  var PIX = {
    hand: ['............', '............', '.oooooo.....', 'owwwwwwoooo.', 'owwwwwwwwwwo', '.ooooowwwwwo', '....owwwwwwo', '....oowwwwwo', '....owwwwwwo', '....oowwwsso', '.....oooooo.', '............'],   /* 왼쪽(점프 동그라미)을 가리키는 손 */
    crown: ['............', '.o...oo...o.', 'oyo.oyyo.oyo', 'oyyooyyooyyo', 'oyyyyyyyyyyo', 'oyhyyyyyyhyo', 'oyyyyrryyyyo', 'oyyyyrryyyyo', 'oooooooooooo', 'ohhhhhhhhhho', 'oooooooooooo', '............'],
    pause: ['............', '............', '..oooooooo..', '..owwoowwo..', '..owwoowwo..', '..owwoowwo..', '..owwoowwo..', '..owwoowwo..', '..owwoowwo..', '..oooooooo..', '............', '............']   /* 막대 둘 (각 2×6) */
  };
  function pixSVG(rows) {
    var by = {};
    rows.forEach(function (row, y) { for (var x = 0; x < row.length; x++) { var c = row[x]; if (PIXC[c]) by[c] = (by[c] || '') + 'M' + x + ' ' + y + 'h1v1h-1z'; } });
    return '<svg viewBox="0 0 12 12" width="12" height="12" shape-rendering="crispEdges" aria-hidden="true" focusable="false">' + Object.keys(by).map(function (c) { return '<path fill="' + PIXC[c] + '" d="' + by[c] + '"/>'; }).join('') + '</svg>';
  }
  function pic(name, attrs) { var e = el('span', Object.assign({ 'aria-hidden': 'true' }, attrs || {})); e.innerHTML = pixSVG(PIX[name]); return e; }
  /* 게임 그림 (16×16 png — 조개 · 발자국). 주소는 ui-art.js iconSrc (단일 파일 번들 = data URI) */
  function iconImg(path, cls) { var src = (window.UIART && UIART.iconSrc) ? UIART.iconSrc(path) : 'assets/icons/' + path + '.png'; return el('img', { class: cls, src: src, alt: '', 'aria-hidden': 'true', width: '16', height: '16', draggable: 'false' }); }
  var dlg, cv, ctx, hud, msg, ctrls, overP, btnJ, btnD, btnAgain, btnStop, finalEl, bestEl, oldEl, netP, awardEl, handEl, pauseEl, scoreN, bestN, crownEl, shellRow, shellN, cardSr, finalT, oldT, awardT, awardT2;
  /* 11-15 (검증 R-1 · R-2): 보이는 글 칸(.rn-snap)의 시작을 기기 px 에 — UIART.snapLeft 와 같은 셈 (소수 몫만 translate). 2.625 배율에서 위 줄(안쪽 20 CSS px = 52.5 기기 px)과
     가운데 맞춘 결과 판 글이 소수 기기 px 에서 시작해 획마다 회색 테가 생겼다. 단추는 안의 글 칸만 민다 (단추를 밀면 테두리가 번진다). e 가 없으면 창 안 글 칸 전부 */
  function snapText(e) {
    if (!dlg || !dlg.open || !window.UIART || !UIART.snapLeft) return;
    (e ? [e] : dlg.querySelectorAll ? [].slice.call(dlg.querySelectorAll('.rn-snap, #rn-net-msg')) : []).forEach(function (x) { UIART.snapLeft(x); });   /* #rn-net-msg: 글 폭만 한 가운데 상자 (css display: table) — 글을 바꾸는 곳이 많아 칸 대신 상자를 민다 */
  }
  /* 11-15 runner-2: 세로 전체 화면 — 제목 줄·HUD 줄·안내 줄·메모를 뺐다 (주인 HANDOFF 6). 무대(캔버스)가 창 전체,
     위에는 작은 점수·최고(왼쪽)와 닫기(오른쪽)만, 아래 구석에 반투명 동그라미 둘(점프 · 숙이기). 다른 곳을 눌러도 아무 일 없다 */
  function buildDialog() {
    if (dlg) return;
    cv = el('canvas', { id: 'rn-cv', width: String(C.W), height: String(C.H), tabindex: '0', role: 'img', 'aria-label': '다락방 달리기 화면. 스페이스나 위 화살표는 점프, 꾹 누르면 더 높이. 아래 화살표는 숙이기.' });
    ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
    /* 11-15 5차: 위 '최고 N' → 왕관 그림 + 수 (#rn-best 는 수만) */
    hud = el('p', { class: 'rn-hud', 'aria-hidden': 'true' }, [el('span', { id: 'rn-score', class: 'rn-snap', text: '0' }), el('span', { class: 'rn-hud-best' }, [pic('crown', { class: 'rn-pic rn-crown' }), el('span', { id: 'rn-best', class: 'rn-snap', text: '' })])]);
    /* 11-15 5차: 준비 · 쉬는 중 안내 글은 읽어 주기로만 (sr-only live). 보이는 건 점프 동그라미 깜빡임 + 손 그림 · 쉴 땐 가운데 일시정지 그림 */
    msg = el('p', { class: 'rn-msg sr-only', id: 'rn-msg', 'aria-live': 'polite' });
    handEl = pic('hand', { class: 'rn-pic rn-hand', id: 'rn-hand', hidden: '' });
    pauseEl = pic('pause', { class: 'rn-pic rn-pause', id: 'rn-pause', hidden: '' });
    /* 동그라미 안 그림은 css/runner.css 의 픽셀 그림 (글자 기호 없음). 이름은 aria-label */
    btnJ = el('button', { type: 'button', class: 'rn-pad rn-jump', id: 'rn-jump', tabindex: '-1', 'aria-label': '점프' });
    btnD = el('button', { type: 'button', class: 'rn-pad rn-duck', id: 'rn-duck', tabindex: '-1', 'aria-label': '숙이기' });
    ctrls = el('div', { class: 'rn-ctrls', id: 'rn-ctrls' }, [btnJ, btnD, handEl]);
    /* 11-15 5차 결과 판 (주인 답 a): 부딪힌 한 줄 + 발자국 그림 · 큰 점수 + 왕관 · 최고 + 조개 그림 · +n. 보이는 수는 aria-hidden, 뜻은 cardSr(읽어 주기)에 예전 문장 그대로 */
    finalT = el('span', { class: 'rn-snap' }); finalEl = el('p', { class: 'rn-final', id: 'rn-final' }, [finalT]);
    scoreN = el('span', { class: 'rn-big rn-snap', id: 'rn-final-n' });
    var scoreEl = el('p', { class: 'rn-final-score', id: 'rn-final-score', 'aria-hidden': 'true' }, [iconImg('ctl/walk', 'rn-ico'), scoreN]);
    crownEl = pic('crown', { class: 'rn-pic rn-crown' }); bestN = el('span', { id: 'rn-final-bn', class: 'rn-snap' });
    bestEl = el('p', { class: 'rn-final-best', id: 'rn-final-best', 'aria-hidden': 'true' }, [crownEl, bestN]);
    shellN = el('span', { id: 'rn-shell-n', class: 'rn-snap' });
    shellRow = el('p', { class: 'rn-final-shell', id: 'rn-final-shell', 'aria-hidden': 'true', hidden: '' }, [iconImg('souvenir/shell', 'rn-ico'), shellN]);
    cardSr = el('span', { class: 'sr-only', id: 'rn-final-sr' });
    oldT = el('span', { class: 'rn-snap' }); oldEl = el('p', { class: 'rn-final-old', id: 'rn-final-old', hidden: '' }, [oldT]);   /* 옛 게임(runner-1) 최고 — 있을 때만 */
    btnAgain = el('button', { type: 'button', class: 'btn primary pressable', id: 'rn-again' }, [el('span', { class: 'rn-snap', text: '다시' })]);
    btnStop = el('button', { type: 'button', class: 'btn pressable', id: 'rn-stop' }, [el('span', { class: 'rn-snap', text: '닫기' })]);
    netP = el('div', { class: 'rn-net', id: 'rn-net', hidden: '' }, [
      el('div', { class: 'rn-net-form', id: 'rn-net-form' }, [
        el('label', { for: 'rn-nick', class: 'rn-net-label' }, [el('span', { class: 'rn-snap', text: '닉네임' })]),   /* 5차 검증: 순위 칸 (배포 판 http 에서만 보인다) 글도 기기 px 에서 시작 */
        el('input', { id: 'rn-nick', type: 'text', maxlength: '12', autocomplete: 'off', enterkeyhint: 'send', spellcheck: 'false' }),
        el('button', { type: 'button', class: 'btn pressable', id: 'rn-submit' }, [el('span', { class: 'rn-snap', text: '기록 올리기' })])
      ]),
      el('p', { class: 'rn-net-msg', id: 'rn-net-msg', 'aria-live': 'polite' }),
      el('ol', { class: 'rn-top10', id: 'rn-top10', 'aria-label': '이번 주 순위 10', hidden: '' }),
      el('p', { class: 'rn-net-privacy' }, [el('span', { class: 'rn-snap', text: '닉네임과 점수만 저장해.' }), ' ', el('span', { class: 'rn-snap', text: '순위는 월요일마다 새로 시작해.' })])   /* 두 토막 (상 줄과 같다): 좁은 화면에선 토막째 다음 줄로 · 줄마다 가운데 · 기기 px */
    ]);
    overP = el('div', { class: 'rn-over', id: 'rn-over', role: 'status', hidden: '' }, [finalEl, cardSr, el('div', { class: 'rn-final-row' }, [scoreEl, bestEl, shellRow]), oldEl, el('div', { class: 'btn-row center' }, [btnAgain, btnStop]), netP]);
    awardT = el('span', { class: 'rn-snap' }); awardT2 = el('span', { class: 'rn-snap' });   /* 11-15 (검증 R-1): 두 토막 — 좁은 화면에선 토막째 다음 줄로 (줄마다 가운데 · 기기 px) */
    awardEl = el('p', { class: 'rn-award', id: 'rn-award', 'aria-live': 'polite', hidden: '' }, [awardT, ' ', awardT2]);
    var close = el('button', { type: 'button', class: 'btn sm pressable rn-close', id: 'rn-close', 'aria-label': '닫기' }, [el('span', { class: 'rn-snap', text: '닫기' })]);
    dlg = el('dialog', { id: 'runner-dlg', class: 'rn-dlg', 'aria-label': '다락방 달리기' }, [
      el('div', { class: 'rn-stage' }, [cv]),
      el('div', { class: 'rn-top' }, [hud, close]),
      el('div', { class: 'rn-mid' }, [awardEl, msg, pauseEl]),
      ctrls, overP
    ]);
    document.body.appendChild(dlg);
    close.addEventListener('click', function () { dlg.close(); });
    btnStop.addEventListener('click', function () { dlg.close(); });
    btnAgain.addEventListener('click', function () { if (!btnAgain.disabled) prepare(); });
    document.getElementById('rn-submit').addEventListener('click', submitRun);
    document.getElementById('rn-nick').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submitRun(); } });
    dlg.addEventListener('close', onClose);
    dlg.addEventListener('keydown', onKey); dlg.addEventListener('keyup', onKey);
    /* 11-15 5차 (주인 답 '화면 반쪽씩'): 화면 왼쪽 반 어디든 = 점프, 오른쪽 반 어디든 = 숙이기 (꾹 누르면 더 높이 그대로).
       동그라미 둘은 자리 표시 — 누른 쪽 동그라미가 눌린 모양이 된다. 손가락마다 어느 쪽인지 기억해 두 엄지를 같이 써도 된다.
       닫기 · 결과 단추 · 닉네임 칸은 제 할 일 그대로 (판이 끝난 뒤엔 반쪽 누르기가 없다). 예전 (같은 날 앞서) 은 동그라미 안만 받았다 */
    var zones = {};
    function zoneOf(e) { var r = dlg.getBoundingClientRect(); return (e.clientX - r.left) < r.width / 2 ? 'j' : 'd'; }
    function padOf(z) { return z === 'j' ? btnJ : btnD; }
    function lit(b, on) { if (b && b.classList) b.classList.toggle('on', !!on); }   /* 누르는 쪽 동그라미 (classList 없는 곳 — 노드 시험의 가짜 DOM — 이면 그림만 빠진다) */
    function held(z) { for (var k in zones) if (zones[k] === z) return true; return false; }
    dlg.addEventListener('pointerdown', function (e) {
      if (!L || L.state === 'over' || (e.pointerType === 'mouse' && e.button !== 0)) return;
      var t = e.target; if (t && t.closest && t.closest('button:not(.rn-pad), input, a, label, select, textarea, .rn-over')) return;
      e.preventDefault();
      var z = zoneOf(e); zones[e.pointerId] = z;
      try { dlg.setPointerCapture(e.pointerId); } catch (x) { /* 없음 */ }
      lit(padOf(z), true); press(z + 'd');
    });
    function zoneUp(e) {
      var z = zones[e.pointerId]; if (!z) return;
      delete zones[e.pointerId];
      if (!held(z)) { lit(padOf(z), false); press(z + 'u'); }
    }
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) { dlg.addEventListener(t, zoneUp); });
    dlg.addEventListener('contextmenu', function (e) { if (!e.target.closest || !e.target.closest('input, .rn-over')) e.preventDefault(); });
    dlg.addEventListener('close', function () { zones = {}; lit(btnJ, false); lit(btnD, false); });
    window.addEventListener('resize', function () { if (dlg.open) fit(); });
    /* 11-15 (검증 R-1): 여는 움직임(글꼴을 끄면 살짝 커지며 뜬다)이 끝난 뒤 · 늦게 온 글꼴로 글 폭이 바뀐 뒤에도 글 시작을 다시 맞춘다 */
    dlg.addEventListener('animationend', function (e) { if (e.target === dlg) snapText(); });
    if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', function () { snapText(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden && L && L.state === 'run') pause(); });
  }
  function onKey(e) {
    var k = e.key, down = e.type === 'keydown';
    var J = k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W', D = k === 'ArrowDown' || k === 's' || k === 'S';
    if (!J && !D) return;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;   /* 닉네임 칸에서는 글자 그대로 */
    if (e.target && e.target.tagName === 'BUTTON' && e.target !== btnJ && e.target !== btnD) return;   /* 포커스된 버튼(다시/닫기)은 기본 동작 */
    e.preventDefault();
    if (down && e.repeat) return;
    press(J ? (down ? 'jd' : 'ju') : (down ? 'dd' : 'du'));
  }
  function press(a) {
    if (!L) return;
    if (L.state === 'over') return;
    if (L.state === 'pause') { if (a === 'jd' || a === 'dd') resume(); return; }
    if (L.state === 'ready' && L.pending) return;   /* 서버 시드를 기다리는 중 (최대 2 초) */
    if (L.state === 'ready' && L.net && Date.now() - L.net.at > NET_FRESH_MS) { if (a === 'jd') prepare(); return; }   /* 준비 화면에 오래 있었다 → 올릴 수 있게 새 토큰부터 */
    var held = a[0] === 'j' ? 'j' : 'd', isDown = a[1] === 'd';
    if (L.held[held] === isDown) return;   /* 같은 상태 반복은 버린다 (키 반복·두 입력원) */
    L.held[held] = isDown;
    if (L.state === 'ready') { if (a !== 'jd') return; start(); }
    if (L.state === 'run') L.queue.push(a);
  }
  /* 11-15 그림 크기: ZOOM = 아트 1 px 의 CSS px (문어 26 px 그림 → 약 91 CSS px, 주인 '후보 B 에서 문어 좀 더 크게').
     장치 px 로 정수 배(k)라 픽셀이 또렷하다. 보이는 폭은 화면 폭에서 나오고(C.W 를 넘지 않게 k 를 키운다) 시뮬은 그대로라 ZOOM 은 그림만 바꾼다.
     바닥선은 아래 동그라미 바로 위 — 장애물이 지나가는 줄을 손가락이 가리지 않는다. 남는 위쪽은 다락방 풍경 */
  var ZOOM = 3.5, V = { W: C.W, H: C.H, G: C.GY, k: 1, css: 1 };
  function fit() {
    var dpr = window.devicePixelRatio || 1;
    var w = dlg.clientWidth || window.innerWidth || 360, h = dlg.clientHeight || window.innerHeight || 740;
    var padTop = h - 108;   /* 동그라미 윗변 (runner.css: 아래 16 px + 지름 76 px + 여유) — 잴 수 있으면 잰다 */
    try { var dr = dlg.getBoundingClientRect(), br = btnJ.getBoundingClientRect(); if (br && br.height) padTop = br.top - dr.top; } catch (e) { /* 그대로 */ }
    var k = Math.max(1, Math.floor(ZOOM * dpr + 0.01));   /* 11-15 점검: 내림 — dpr 1 에서 4 배(보이는 폭 90)가 아니라 3 배 */
    k = Math.min(k, Math.max(1, Math.floor((padTop - 10) / 86 * dpr)));   /* 낮은 화면(가로 폰): 달리는 띠(≈ 84 px)가 동그라미 위에 들어가게 작게 */
    k = Math.max(k, Math.ceil(w * dpr / C.W));   /* 보이는 폭 ≤ C.W (장애물은 그 밖에서 생긴다) */
    var css = k / dpr, W = Math.ceil(w / css), H = Math.ceil(h / css);
    var G = Math.floor((padTop - 10) / css);
    G = Math.max(Math.min(84, H - 4), Math.min(G, H - 8));   /* 점프 꼭대기(≈ 42 px) + 문어 키가 들어갈 자리는 남긴다 */
    if (cv.width !== W) cv.width = W;
    if (cv.height !== H) cv.height = H;
    ctx.imageSmoothingEnabled = false;   /* 크기를 바꾸면 2D 상태가 처음으로 돌아간다 */
    cv.style.width = (W * css) + 'px'; cv.style.height = (H * css) + 'px';
    V = { W: W, H: H, G: G, k: k, css: css };
    if (dlg.style && dlg.style.setProperty) dlg.style.setProperty('--rn-ground', Math.round(G * css) + 'px');   /* 가운데 글(준비·쉬는 중)은 바닥선 위 */
    /* 11-15 5차: 그림 한 점 = 기기 px 정수 개 (2 CSS px 가까이 · 일시정지는 4) — 2.625 같은 배율에서도 점이 고르게 */
    if (dlg.style && dlg.style.setProperty) { dlg.style.setProperty('--rn-px', (Math.max(1, Math.round(2 * dpr)) / dpr) + 'px'); dlg.style.setProperty('--rn-px4', (Math.max(1, Math.round(4 * dpr)) / dpr) + 'px'); }
    snapText();   /* 11-15 (검증 R-1): 크기 · 돌림이 바뀌면 글 시작도 다시 기기 px 에 */
  }
  function setMsg(t) { msg.textContent = t; }
  /* 11-15 5차: 안내 그림 — 'ready' | 'pause' | '' (달리는 중 · 끝). 동그라미 테두리 깜빡임(두 단계 세 번, 줄인 움직임이면 그대로 켜 둠) + 손 · 쉴 땐 일시정지 그림 */
  function hint(kind) {
    handEl.hidden = !kind; pauseEl.hidden = kind !== 'pause';
    if (btnJ.classList) { btnJ.classList.remove('hint'); if (kind) { void btnJ.offsetWidth; btnJ.classList.add('hint'); } }   /* 다시 붙여 깜빡임을 처음부터 */
    if (dlg.classList) dlg.classList.toggle('rn-still', !!(L && L.reduced));
    if (ctrls.classList) ctrls.classList.toggle('rn-wait', !kind && !!(L && L.pending));   /* 11-15 (검증 R-8): 서버 시드를 기다리는 동안(탭을 안 받는다) 동그라미를 흐리게 — 'ready' 면 다시 밝게 */
  }
  function ready() {
    var st = load(), ck = clock();
    if (st.day !== ck.day) { st.day = ck.day; st.dayN = 0; }
    var nt = L.net, seed = L.serverSeed != null ? (L.serverSeed >>> 0) : nt ? nt.seed : seedFor(ck.day, st.dayN);
    L.store = st; L.clock = ck; L.seed = seed; L.sim = createSim(seed, { night: nt ? nt.night : ck.phase === 'night' });
    L.inputs = []; L.queue = []; L.held = { j: false, d: false }; L.state = 'ready'; L.acc = 0; L.last = 0; L.hitAt = 0; L.saved = false; L.newBest = false;
    L.parts = []; L.partRng = null; L.reduced = reducedMotion();
    overP.hidden = true; ctrls.hidden = false;
    setMsg(L.pending ? '판을 고르는 중이야…' : '점프를 톡 누르면 출발해'); hint(L.pending ? '' : 'ready');   /* 서버 시드를 기다리는 동안(최대 2 초)은 탭을 안 받으니 손 그림도 없다 */
    netP.hidden = true;
    hudUpdate(true);
    try { cv.focus({ preventScroll: true }); } catch (e) { cv.focus(); }
  }
  /* 판 준비: http(s) 면 서버 시드(2 초)를 받아 그 시드·밤 여부로, 실패하면 조용히 로컬 시드 */
  function prepare() {
    var me = L; if (!me) return;
    me.net = null;
    if (!NET || me.serverSeed != null) { me.pending = false; ready(); return; }
    me.pending = true; ready();
    fetchJson('seed?tz=' + (-new Date().getTimezoneOffset()), null, 2000).then(function (r) {
      if (L !== me || me.state !== 'ready') return;
      var j = r.json;
      me.pending = false;
      if (r.status === 200 && j && j.ok && typeof j.token === 'string' && Number.isInteger(j.seed) && typeof j.night === 'boolean' && (j.v == null || j.v === VERSION)) {   /* 11-15: 다른 판(VERSION) 서버면 조용히 로컬 시드 — 순위 칸 없이 그냥 논다 */
        me.net = { token: j.token, seed: j.seed >>> 0, night: j.night, week: String(j.week || ''), at: Date.now() };
        if (!me.weekChecked) { me.weekChecked = true; checkAwards(me.net.week); }
      }
      ready();
    });
  }
  /* 지난 주에 올린 기록 → 황제 망토인지 한 번씩 물어본다 */
  function checkAwards(curWeek) {
    var cur = curWeek || weekKeyKST(Date.now()), n = netState(load()), todo = n.subs.filter(function (x) { return x && !x.done && typeof x.week === 'string' && x.week < cur && /^[0-9a-f]{12}$/.test(x.runId || ''); }).slice(0, 4);
    todo.forEach(function (sub) {
      fetchJson('award?runId=' + sub.runId + '&week=' + encodeURIComponent(sub.week), null, 4000).then(function (r) {
        if (r.status !== 200 && r.status !== 404) return;   /* 네트워크 실패면 다음에 다시 */
        if (r.status === 200 && !(r.json && r.json.final)) return;   /* 그 주가 아직 안 닫힘(월 00:30 전) → 순위가 바뀔 수 있으니 다음에 다시 */
        var st = load(), nn = netState(st), s2 = nn.subs.filter(function (x) { return x && x.runId === sub.runId; })[0];
        if (!s2) return;
        s2.done = true;
        if (r.status === 200 && r.json && r.json.award === 'emperor_cape') {
          s2.final = r.json.rank; addAward(nn, 'emperor_cape', sub.week);
          if (awardEl) { awardT.textContent = '지난주 ' + r.json.rank + '등!'; awardT2.textContent = '황제 망토를 받았어'; awardEl.hidden = false; snapText(awardT); snapText(awardT2); }
        }
        st.net = nn; store(st);
      });
    });
  }
  function renderTop(rows, myRunId, myRank) {
    var ol = document.getElementById('rn-top10'); if (!ol) return;
    while (ol.firstChild) ol.removeChild(ol.firstChild);
    (rows || []).slice(0, 10).forEach(function (r) {
      var li = el('li', { class: r.rank === myRank ? 'rn-me' : '' }, [el('span', { class: 'rn-top-rank rn-snap', text: String(r.rank) }), el('span', { class: 'rn-top-nick rn-snap', 'data-raw': 'player', text: String(r.nick || '') }), el('span', { class: 'rn-top-score rn-snap', text: String(r.score | 0) })]);   /* 칸마다 시작을 기기 px 에 (5차 검증) */
      ol.appendChild(li);
    });
    ol.hidden = !ol.firstChild;
    snapText();   /* 11-15 (검증 R-1): 판이 길어져 스크롤 막대가 생기면 (컴퓨터) 가운데 글이 옮겨 간다 */
  }
  function loadTop(myRank) {
    var me = L;
    fetchJson('top', null, 4000).then(function (r) { if (L === me && r.status === 200 && r.json && r.json.ok) renderTop(r.json.top, null, myRank); });
  }
  function netMsg(t) { var m = document.getElementById('rn-net-msg'); if (m) m.textContent = t; snapText(); }   /* 11-15: 판 높이가 바뀌면 글 시작 다시 (renderTop 과 같은 까닭) */
  var NET_ERR = { duplicate: '이 판은 벌써 올렸어.', expired: '너무 늦어서 못 올렸어. 다음 판은 바로 올려 줘.', too_fast: '이 판은 올릴 수 없어.', mismatch: '기록이 맞지 않아서 못 올렸어.' };
  var NET_FRESH_MS = 20 * 60000;   /* 토큰은 30분 → 준비 화면에서 20분 넘게 쉬었으면 출발할 때 새로 받는다 (달리기·올리기 몫 10분) */
  /* 서버가 받은 판은 창을 닫았든 다음 판으로 넘어갔든 저장한다 (runId 가 있어야 나중에 망토를 물어볼 수 있다) */
  function keepSub(j, rec) {
    var st = load(), n = netState(st), old = n.subs.filter(function (x) { return x && x.runId === j.runId; })[0];
    if (old) { old.rank = j.rank; old.score = rec.score; } else n.subs.push({ runId: j.runId, week: j.week, score: rec.score, rank: j.rank, at: Date.now() });
    if (n.subs.length > 30) n.subs = n.subs.slice(-30);
    if (j.award) addAward(n, j.award, j.week);
    n.nick = j.nick; st.net = n; store(st);
  }
  function submitRun() {
    var me = L; if (!me || me.state !== 'over' || !me.net || me.submitted) return;
    var btn = document.getElementById('rn-submit'), inp = document.getElementById('rn-nick');
    var nick = String(inp.value || '').trim().slice(0, 12);
    me.submitted = true; btn.disabled = true; inp.disabled = true; netMsg('올리는 중…');
    var rec = me.rec;
    fetchJson('submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: me.net.token, inputs: rec.inputs, score: rec.score, ticks: rec.ticks, nick: nick }) }, 8000).then(function (r) {
      var j = r.json || {}, ok = r.status === 200 && j.ok && typeof j.runId === 'string';
      if (ok) keepSub(j, rec);
      if (L !== me || me.rec !== rec || me.state !== 'over') return;   /* 닫았거나 다음 판 → 그 판의 결과판이 아니다 */
      if (ok) {
        document.getElementById('rn-net-form').hidden = true;
        netMsg('이번 주 ' + j.rank + '등이야!' + (j.award === 'paper_crown' ? ' 종이 왕관을 받았어' : ''));
        loadTop(j.rank);
      } else {
        if (j.error === 'old_version') { netP.hidden = true; return; }   /* 11-15: 판 버전이 서버와 다르다 → 순위 칸만 조용히 접는다 (탓하는 글 없음, 점수는 이 기기에 그대로) */
        var stuck = r.status >= 400 && r.status < 500 && r.status !== 408 && r.status !== 429;   /* 같은 판을 다시 보내도 같은 답(409·401 만료 등) → 버튼은 꺼 둔다 */
        if (!stuck) { me.submitted = false; btn.disabled = false; inp.disabled = false; }
        netMsg(NET_ERR[j.error] || (stuck ? '이 판은 올릴 수 없어.' : '지금은 못 올렸어. 점수는 이 기기에 남아.'));
      }
    });
  }
  function start() {   /* 다시 읽고 쓴다: 준비 화면에 있는 동안 망토 확인·올리기 응답이 저장한 net 을 ready() 때 사본으로 덮지 않게 (saveRun 과 같은 방식) */
    var st = load(); st.day = L.store.day; st.dayN = (L.store.dayN | 0) + 1; st.runs = (st.runs | 0) + 1;
    store(st); L.store = st;
    L.state = 'run'; setMsg(''); hint('');
  }
  function pause() {
    if (L.held.j) { L.held.j = false; L.queue.push('ju'); }
    if (L.held.d) { L.held.d = false; L.queue.push('du'); }
    L.state = 'pause'; L.last = 0; setMsg('잠깐 쉬는 중이야. 점프를 누르면 이어서 달려'); hint('pause');
  }
  function resume() { L.state = 'run'; L.last = 0; L.acc = 0; setMsg(''); hint(''); }
  function tickOnce() {
    var s = L.sim, j0 = s.jumpT;
    while (L.queue.length) { var a = L.queue.shift(); if (applyInput(s, a)) L.inputs.push({ t: s.tick, a: a }); }
    step(s);
    if (typeof HAPTICS !== 'undefined') {   /* 11-15 5차 진동 (기본 켬 · 설정에서 끄기): 점프 · 부딪힘만 (주인 11-15 — 착지 · 이끼는 뺐다). 시뮬엔 안 닿는다 (서버 재생과 같은 판) */
      if (s.dead) HAPTICS.buzz('hit');
      else if (s.jumpT !== j0) HAPTICS.buzz('jump');
    }
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
    if (r.score > bestOf(st)) { st.best2 = r.score; L.newBest = true; }   /* 11-15: runner-2 최고 (옛 best 는 그대로 둔다) */
    store(st); L.store = st;
    L.earned = 0;
    try { if (window.APP && typeof APP.earnFromPlay === 'function') L.earned = APP.earnFromPlay({ game: 'runner', id: 'runner_' + (st.runs | 0) + '_' + (st.day || ''), score: r.score | 0 }, { quiet: true }) | 0; } catch (e) { /* 지갑이 없어도 달리기는 그대로 */ }   /* 조개: 내 놀이에서만 (11-10). 11-15 5차: 따로 뜨던 조개 알림 대신 결과 판 안에 조개 그림 + n. 11-15 (검증 R-3): 닫아서 끝난 판도 알림 글 없음 — 위 조개 칸 수만 바뀐다 */
  }
  function over(end) {
    L.state = 'over'; L.hitAt = performance.now();
    saveRun(end);
    ctrls.hidden = true; overP.hidden = false; setMsg(''); hint('');
    finalT.textContent = HITCOPY[L.sim.hitKind] || '콩!';
    /* 11-15 5차: 보이는 건 그림 + 수, 읽어 주기는 예전 문장 그대로 */
    scoreN.textContent = String(L.sim.score); bestN.textContent = String(bestOf(L.store));
    shellN.textContent = '+' + L.earned; shellRow.hidden = !L.earned;
    if (crownEl.classList) { crownEl.classList.remove('blink'); if (L.newBest) { void crownEl.offsetWidth; crownEl.classList.add('blink'); } }   /* 새 최고면 왕관이 두 번 깜빡 (줄인 움직임이면 css 가 멈춘다) */
    cardSr.textContent = L.sim.score + '만큼 달렸어' + (L.sim.moss ? ' · 이끼 ' + L.sim.moss : '') + '. ' + (L.newBest ? '새 최고야! 최고 ' : '최고 ') + bestOf(L.store) + (L.earned ? '. 조개 ' + L.earned + '개' : '');
    var ob = oldBestOf(L.store); oldT.textContent = ob ? '예전 게임 최고 ' + ob : ''; oldEl.hidden = !ob;   /* 11-15 (검증 R-2): 이 줄은 남긴다 (HANDOFF 6) — 시작만 기기 px 에 (아래 snapText) */
    if (L.net && end === 'hit' && L.sim.tick) {
      L.rec = record(end); L.submitted = false;
      var inp = document.getElementById('rn-nick'), btn = document.getElementById('rn-submit');
      inp.value = inp.value || netState(load()).nick || octName(); inp.disabled = false; btn.disabled = false;
      document.getElementById('rn-net-form').hidden = false; netMsg(''); renderTop([]);
      netP.hidden = false;
      loadTop(0);
    }
    hudUpdate(true); snapText();   /* 결과 판 글이 다 들어간 뒤 한 번에 */
    btnAgain.disabled = true; btnStop.disabled = true;
    setTimeout(function () { if (!L || L.state !== 'over') return; btnAgain.disabled = false; btnStop.disabled = false; try { btnAgain.focus({ preventScroll: true }); } catch (e) { btnAgain.focus(); } overP.scrollTop = 0; }, 450);   /* 11-15: 버튼은 순위 칸 위 — 작은 화면에서도 점수 줄부터 보이게 */
  }
  var HITCOPY = { crate: '상자에 콩!', crate2: '상자 더미에 콩!', candle: '촛대에 톡!', books: '책 더미에 콩!', web: '거미줄에 폭!', rain: '물웅덩이에 첨벙!' };
  var lastHud = '';
  function hudUpdate(force) {
    var s = L.sim, t = s.score + '|' + bestOf(L.store);
    if (!force && t === lastHud) return; lastHud = t;
    document.getElementById('rn-score').textContent = String(s.score);
    document.getElementById('rn-best').textContent = String(bestOf(L.store));   /* 11-15 5차: '최고' 글자 → 왕관 그림 (buildDialog) */   /* 이끼 수는 뺐다 (점수에 이미 들어 있다 — 위에는 점수·최고만) */
    snapText(document.getElementById('rn-score')); snapText(document.getElementById('rn-best'));   /* 11-15 (검증 R-1): 글이 바뀔 때만 — 점수 폭이 바뀌면 최고 자리도 옮겨 간다 */
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
    L = { opener: opts.opener || document.activeElement, serverSeed: opts.seed != null ? opts.seed : null, sprites: buildSprites(), raf: 0, net: null, pending: false };
    awardEl.hidden = true;
    dlg.showModal();
    fit(); prepare();
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
  /* 11-15 그림판: 화면 전체 (V.W × V.H 아트 px). 바닥선 V.G 위로 달리는 띠(높이 ≈ 80 px, 위는 들보 TB), 그 위는 가만히 있는 다락방 풍경
     (경사 천장 · 큰 창 · 선반), 바닥선 아래는 마룻바닥(동그라미 자리). 시차는 띠 안 벽·기둥만 ½, 동작 줄이기면 0. 바닥 무늬는 달리기 그 자체라 1× */
  function bandTop() { return V.G - 80; }
  function draw(ts) {
    var s = L.sim, ck = L.clock, T = THEME[ck.phase], O = OBJ[ck.phase === 'night' ? 'night' : 'day'], px = Math.floor(s.dist / SUB);
    var W = V.W, H = V.H, G = V.G, TB = bandTop();
    var shake = (!L.reduced && L.state === 'over' && ts - L.hitAt < 220) ? (Math.floor(ts / 40) % 2 ? 1 : -1) : 0;
    ctx.setTransform(1, 0, 0, 1, shake, 0);
    drawRoom(T, ck, TB);
    /* 달리는 띠: 벽 판자 + 기둥·버팀대 (½ 시차, 동작 줄이기면 멈춤) */
    var p2 = L.reduced ? 0 : Math.floor(px / 2);
    R(-2, TB + 4, W + 4, G - TB - 4, T.wall);
    for (var x = -mod(p2, 12); x < W + 2; x += 12) R(x, TB + 4, 1, G - TB - 4, T.seam);
    for (var bx = -mod(p2, 96) + 70; bx < W + 40; bx += 96) {
      R(bx, TB + 4, 4, G - TB - 4, T.post); R(bx + 4, TB + 4, 1, G - TB - 4, T.dark);
      for (var i = 0; i < 12; i++) { R(bx - 12 + i, TB + 16 - i, 2, 1, T.post); R(bx + 4 + i, TB + 5 + i, 2, 1, T.post); }
    }
    /* 들보 (띠 천장 — 거미줄이 여기 매달린다) */
    R(-2, TB, W + 4, 3, T.beam); R(-2, TB + 3, W + 4, 1, T.dark);
    /* 바닥 (1×) */
    R(-2, G, W + 4, H - G + 2, T.floor); R(-2, G, W + 4, 1, T.floorHi);
    for (var fy = G + 8; fy < H; fy += 8) R(-2, fy, W + 4, 1, T.floor2);
    for (var fx = -mod(px, 32); fx < W + 2; fx += 32) {
      for (var row = 0, yy = G + 1; yy < H; yy += 8, row++) R(fx + (row % 2 ? 16 : 0), yy, 1, 7, T.floor2);
      R(fx + 3, G + 3, 1, 1, T.dark);
    }
    drawOct(s, T, ts);   /* 문어 다음에 장애물 — 부딪힌 순간 무엇에 닿았는지 보이게 */
    for (var j = 0; j < s.obs.length; j++) drawObs(s.obs[j], O, T, ts);
    if (!L.reduced) particles(s, ck, ts);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  /* 위쪽 풍경 (안 움직인다): 경사 천장 널 · 가운데 큰 창(낮·저녁·밤 하늘, 밤엔 별, 창밖 계절) · 왼쪽 선반 */
  function drawRoom(T, ck, TB) {
    var W = V.W, apex = W >> 1, S = Math.max(14, Math.min(64, TB - 60));
    R(-2, 0, W + 4, TB + 4, T.wall);
    for (var x = 5; x < W; x += 12) R(x, 0, 1, TB, T.seam);
    for (var y = 0; y < S; y++) {   /* 경사 천장: 꼭대기(가운데)에서 양옆으로 내려온다 */
      var e = Math.floor(apex * (S - y) / S);
      R(-2, y, e + 2, 1, y % 6 === 5 ? T.dark : T.beam); R(W - e, y, e + 2, 1, y % 6 === 5 ? T.dark : T.beam);
      R(e - 1, y, 3, 1, T.post); R(W - e - 2, y, 3, 1, T.post); R(e + 2, y, 1, 1, T.dark); R(W - e - 3, y, 1, 1, T.dark);
    }
    var ww = Math.min(52, W - 44), wh = Math.max(24, Math.min(40, TB - S - 18)), wx = (W - ww) >> 1, wy = Math.max(S - 4, TB - wh - 14);
    if (ww >= 24) drawWindow(wx, wy, ww, wh, T, ck);
    var sw = Math.min(26, wx - 8), sy = TB - 14;
    if (sw >= 14) shelf(3, sy, sw, T, ck, 0);
    if (sw >= 14 && sy - 20 > S + 6) shelf(3, sy - 20, sw, T, ck, 1);
    if (sw >= 14) shelf(W - 3 - sw, sy, sw, T, ck, 2);
  }
  function shelf(x, y, w, T, ck, n) {
    var B = OBJ[ck.phase === 'night' ? 'night' : 'day'].books;
    R(x, y, w, 2, T.post); R(x, y + 2, w, 1, T.dark); R(x + 2, y + 3, 1, 3, T.post); R(x + w - 3, y + 3, 1, 3, T.post);
    if (n === 0) {   /* 책 몇 권 */
      for (var b = 0; b < 4 && 2 + b * 4 + 3 <= w; b++) { var bh = [9, 7, 8, 6][b]; R(x + 2 + b * 4, y - bh, 3, bh, T.ink); R(x + 3 + b * 4, y - bh + 1, 1, bh - 2, B[b % 5]); }
    } else if (n === 1) {   /* 병 둘 */
      R(x + 3, y - 7, 5, 7, T.ink); R(x + 4, y - 6, 3, 5, '#73bed3'); R(x + 5, y - 9, 1, 2, T.ink);
      R(x + 11, y - 5, 6, 5, T.ink); R(x + 12, y - 4, 4, 3, '#a8ca58');
    } else {   /* 화분 하나 · 상자 하나 */
      R(x + w - 9, y - 5, 6, 5, '#884b2b'); R(x + w - 8, y - 9, 1, 4, '#468232'); R(x + w - 6, y - 10, 1, 5, '#75a743'); R(x + w - 5, y - 8, 1, 3, '#468232');
      R(x + 2, y - 6, 8, 6, T.ink); R(x + 3, y - 5, 6, 4, '#be772b');
    }
  }
  var STARS = [[4, 3], [11, 6], [19, 2], [27, 7], [35, 4], [42, 9], [8, 11], [31, 12], [46, 3], [23, 10]];
  function drawWindow(x, y, w, h, T, ck) {
    var P = SEASON[ck.season], night = ck.phase === 'night';
    R(x - 2, y - 2, w + 4, h + 4, T.dark); R(x, y, w, h, T.sky); R(x, y + Math.floor(h * 0.6), w, h - Math.floor(h * 0.6), T.sky2);
    if (night) STARS.forEach(function (p) { if (p[0] < w - 2 && p[1] < h - 10) R(x + p[0], y + p[1], 1, 1, p[0] % 3 ? '#ebede9' : '#c7cfcc'); });
    var oy = ck.phase === 'eve' ? y + Math.floor(h * 0.45) : y + 4;
    R(x + w - 12, oy, 5, 5, T.orb); if (night) R(x + w - 13, oy, 2, 2, T.sky);
    if (ck.season === 'winter') { R(x, y + h - 3, w, 3, '#ebede9'); R(x + 3, y + h - 4, 7, 1, '#ebede9'); R(x + w - 12, y + h - 4, 6, 1, '#ebede9'); }
    else {
      var TREE = ['..aaa....', '.aabaa...', 'aabaaba..', 'abaaaaab.', '.aaabaa..', '...t.....', '...t.....'];
      for (var r = 0; r < TREE.length; r++) for (var q = 0; q < 9; q++) { var ch = TREE[r][q]; if (ch !== '.') R(x + 2 + q, y + h - 7 + r, 1, 1, ch === 'a' ? P[1] : ch === 'b' ? P[0] : T.dark); }
      R(x + 12, y + h - 3, w - 12, 3, P[1]); R(x + w - 9, y + h - 4, 5, 1, P[1]); R(x + w - 7, y + h - 3, 1, 1, P[0]);
    }
    R(x + (w >> 1) - 1, y, 2, h, T.post); R(x, y + (h >> 1) - 1, w, 2, T.post); R(x - 3, y + h + 2, w + 6, 2, T.post);
  }
  function drawObs(o, O, T, ts) {
    var x = Math.floor(o.x / SUB), gy = V.G, k = o.k;
    if (x > V.W + 4 || x + o.w < -4) return;
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
      R(x + 7, bandTop() + 4, 1, wt - bandTop() - 4, O.web);   /* 실은 들보에서 */
      var WEB = ['....#.#.#.......', '..#..###..#.....', '.#..#.#.#..#....', '#..#..#..#..#...', '#.#########.##..', '.#..#..#..#..#..', '..#..#.#.#..#...', '...#..###..#....', '.....#.#.#......', '.......#........'];
      for (var r = 0; r < WEB.length; r++) for (var q = 0; q < 16; q++) if (WEB[r][q] === '#') R(x + q, wt + r, 1, 1, O.web);
      R(x + 9, wt + 4, 2, 2, T.ink);
    } else if (k === 'rain') {
      R(x, gy - 1, o.w, 2, O.puddle); R(x + 2, gy - 2, o.w - 4, 1, O.puddle);
      for (var dI = 0; dI < 3; dI++) { var ph = L.reduced ? 2 : Math.floor(ts / 90 + dI * 2) % 6; R(x + 3 + dI * 6, gy - 7 + ph, 1, 2, O.drop); if (ph >= 5) { R(x + 2 + dI * 6, gy - 3, 1, 1, O.drop); R(x + 4 + dI * 6, gy - 3, 1, 1, O.drop); } }
      R(x + 1, gy - 7, 1, 1, O.drop); R(x + o.w - 2, gy - 6, 1, 1, O.drop);
    } else if (k === 'moss') {
      if (o.got) return;
      var my = gy - o.hi + (L.reduced ? 0 : (Math.floor(ts / 300) % 2));
      R(x, my + 3, 6, 3, O.moss2); R(x + 1, my + 1, 4, 3, O.moss); R(x + 2, my, 1, 1, O.mossHi); R(x + 4, my + 1, 1, 1, O.mossHi); R(x + 1, my + 2, 1, 1, O.mossHi);
    }
  }
  function drawOct(s, T, ts) {   /* 11-18: 상태별 구운 그림을 제 크기 그대로 (drawImage 에 폭 · 높이를 주지 않는다) · 자리는 정수 */
    var S = L.sprites, h = Math.floor(s.y / SUB), st = L.state;
    var duck = s.ground && s.dHeld && st !== 'over';
    var key = 'run', f = 0, bob = 0;
    if (st === 'over') key = 'hit';
    else if (st === 'ready' || st === 'pause') { key = 'idle'; bob = (L.reduced ? 0 : Math.floor(ts / 500) % 2) ? -1 : 0; }
    else if (duck) key = 'duck';
    else if (!s.ground) key = 'jump';
    else if (s.tick - s.landT < 6) key = 'land';
    else { f = Math.floor(s.tick / 5) % 4; if (S.src !== 'bake') bob = f % 2 ? -1 : 0; }   /* 구운 걸음은 걸음 중간 1 px 들림이 그림에 들어 있다 (0 / −1 그대로) */
    var fr = S[key], img = fr[f % fr.length], w = img.width, hh = img.height;
    /* 그림자: 땅에 닿는 폭에서, 높이 오를수록 좁게 */
    var sw = Math.max(6, (S.gw || 14) - (h >> 1));
    R(C.OCT_X + 7 - (sw >> 1), V.G, sw, 1, T.shadow);
    var dx = C.OCT_X + 7 - (w >> 1), dy = V.G - h - hh + 1 + bob;   /* 맨 아래 줄(발) = 바닥선 V.G − 높이 */
    ctx.drawImage(img, dx | 0, dy | 0);
  }
  /* 꾸밈 입자(계절 꽃잎·눈): 판 시드에서 갈라 낸 따로 된 mulberry32 — 시뮬레이션 난수(s.rng)는 건드리지 않는다. 같은 판은 같은 입자 */
  function particles(s, ck, ts) {
    var P = L.parts, col = SEASON[ck.season];
    if (!L.partRng) L.partRng = mulberry32(hash32('parts|' + (L.seed >>> 0)));
    var u = function () { return L.partRng() / 4294967296; };
    var top = bandTop() + 6;   /* 11-15: 꽃잎·눈은 달리는 띠 안에서만 */
    if (!P.length) for (var i = 0; i < 9; i++) P.push({ x: u() * V.W, y: top + u() * (V.G - top - 6), v: 0.15 + u() * 0.25, c: i % 2, ph: u() * 6 });
    var sp = L.state === 'run' ? s.speed / SUB * 0.3 : 0.1;
    for (var j = 0; j < P.length; j++) {
      var p = P[j];
      p.x -= sp + 0.05; p.y += ck.season === 'winter' ? p.v : p.v * 0.6;
      if (p.x < -2 || p.y > V.G) { p.x = V.W + u() * 20; p.y = top + u() * 30; }
      var wob = Math.floor(Math.sin(ts / 400 + p.ph) * 1.5);
      R(Math.floor(p.x) + wob, Math.floor(p.y), ck.season === 'winter' ? 1 : 2, 1, col[p.c]);
    }
  }

  /* 입구는 app.js 의 놀이방 문 (#btn-door → APP.goRoom('play') → RUNNER.open({ opener })). 예전처럼 다른 시트에 버튼을 끼워 넣지 않는다 (방 보기는 없앴다, 주인 11-07).
     닫으면 포커스는 연 버튼(문)으로 돌아간다 (onClose) */
  API.open = open;
  API.close = function () { if (dlg && dlg.open) dlg.close(); };
  API.load = load;
  API.pix = function (name) { return PIX[name] ? pixSVG(PIX[name]) : ''; };   /* 11-18: 12×12 픽셀 그림 SVG (다락 첫 손 힌트가 이 손을 빌려 쓴다 — js/app.js hint) */
  API.sprites = function () { return buildSprites(); };   /* 시험용 (11-18): 지금 장면 색으로 구운 문어 그림 묶음 { src, run[4], jump, land, duck, hit, idle, gw } */
  API.live = function () { return L ? { state: L.state, score: L.sim.score, ticks: L.sim.tick, seed: L.seed, inputs: L.inputs.slice(), night: L.sim.night, sprites: L.sprites.src, phase: L.clock.phase, season: L.clock.season, speed: L.sim.speed, ground: L.sim.ground, y: L.sim.y, moss: L.sim.moss, duck: !!(L.sim.ground && L.sim.dHeld), view: { W: V.W, H: V.H, G: V.G, css: V.css },
    obs: L.sim.obs.map(function (o) { return { k: o.k, x: Math.floor(o.x / SUB), w: o.w, got: o.got }; }) } : null; };   /* 읽기 전용 복사본 (스모크·디버그용) */
  return API;
})();
if (typeof module !== 'undefined' && module.exports) module.exports = RUNNER;
