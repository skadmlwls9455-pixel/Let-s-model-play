/* tools/ui-art/sculpt.js — 작은 2.5D 픽셀 렌더러 (포스터 그림 둘째 판, docs/POSTER_ART.md '그림 만드는 법').
 *
 * 첫 판(poster/kit.js)은 도형에 색을 칠했다 — 음영이 대각선 하나로 갈려 평평했고, 외곽선 무게가 색마다 달랐다 (주인 11-10 "좀 구리다").
 * 여기서는 그림을 '부품'으로 짓는다. 부품마다 형태(공 · 관 · 판 · 돌림체)가 칸마다 면의 방향(법선)을 주고, 렌더러가:
 *   1) 빛(위·왼쪽·앞)과의 각도로 그 재질 램프의 다섯 단계 중 하나를 고른다 → 음영이 형태를 따라 돈다 (공은 초승달 그늘, 관은 긴 하이라이트, 판은 모서리만)
 *   2) 반짝이는 재질은 빛이 튀는 자리에 작은 흰 점
 *   3) 위에 놓인 부품이 아래 부품에 1px 그림자를 드리운다 (오른쪽·아래로) → 부품이 겹쳐 보인다
 *   4) 바깥 외곽선 1px = 닿은 재질의 가장 어두운 색 (재질마다 정해 둔 ol) → 무게가 일정하고 또렷하다
 * 좌표는 32칸 단위. 같은 정의를 scale 0.5 · 1 · 2 로 렌더하면 16 · 32 · 64px 그림이 나온다 (칸 가운데를 찍는다 — 번짐 없음).
 * 색은 Apollo (sprites.js KEY 글자)만. 난수 없음.
 */
'use strict';
var SP = require('./sprites.js');

function norm(a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
var LIGHT = norm([-0.5, -0.62, 0.6]), HALF = norm([LIGHT[0], LIGHT[1], LIGHT[2] + 1]);
var LUM = {}; Object.keys(SP.KEY).forEach(function (k) { var h = SP.KEY[k]; LUM[k] = 0.2126 * parseInt(h.slice(1, 3), 16) + 0.7152 * parseInt(h.slice(3, 5), 16) + 0.0722 * parseInt(h.slice(5, 7), 16); });

/* ───── 재질: ramp = [하이라이트, 밝음, 기본, 그늘, 깊은 그늘] · ol = 외곽선 · spec = 반짝 문턱(0.97~0.995) ───── */
var MAT = {
  gold:   { ramp: ['f', 'F', 'E', 'D', 'C'], ol: 'B', spec: 0.985 },
  straw:  { ramp: ['f', 'F', 'E', 'D', 'C'], ol: 'B' },
  amber:  { ramp: ['F', 'E', 'D', 'C', 'B'], ol: 'A' },
  honey:  { ramp: ['F', 'F', 'E', 'D', 'C'], ol: 'B', spec: 0.99 },
  red:    { ramp: ['L', 'K', 'K', 'J', 'I'], ol: 'H' },
  crimson:{ ramp: ['K', 'J', 'J', 'I', 'H'], ol: 'G' },
  blue:   { ramp: ['7', '6', '5', '4', '3'], ol: '2' },
  navy:   { ramp: ['5', '4', '3', '2', '1'], ol: '0' },
  sky:    { ramp: ['Z', '7', '6', '5', '4'], ol: '3' },
  glass:  { ramp: ['Z', '7', '6', '5', '4'], ol: '3', spec: 0.98 },
  white:  { ramp: ['Z', 'Z', 'Y', 'X', 'W'], ol: 'U' },
  cloud:  { ramp: ['Z', 'Z', 'Z', 'Y', 'X'], ol: 'V' },
  paper:  { ramp: ['Z', 'f', 'f', 'e', 'd'], ol: 'b' },
  cream:  { ramp: ['Z', 'f', 'e', 'd', 'c'], ol: 'b' },
  wood:   { ramp: ['e', 'd', 'c', 'b', 'a'], ol: 'A' },
  bark:   { ramp: ['d', 'c', 'b', 'a', 'A'], ol: 'G' },
  iron:   { ramp: ['Z', 'Y', 'X', 'W', 'V'], ol: 'T', spec: 0.985 },
  steel:  { ramp: ['Y', 'X', 'W', 'V', 'U'], ol: 'S' },
  stone:  { ramp: ['Y', 'X', 'W', 'V', 'U'], ol: 'T' },
  dark:   { ramp: ['V', 'U', 'T', 'S', '1'], ol: '0' },
  green:  { ramp: ['w', 'v', 'u', 't', 's'], ol: 'r' },
  leaf:   { ramp: ['v', 'u', 't', 's', 'r'], ol: '1' },
  purple: { ramp: ['R', 'Q', 'P', 'O', 'N'], ol: 'M' },
  violet: { ramp: ['Q', 'P', 'O', 'N', 'M'], ol: 'G' },
  pink:   { ramp: ['Z', 'R', 'R', 'Q', 'P'], ol: 'O' },
  ink:    { ramp: ['3', '2', '1', '1', '0'], ol: '0', spec: 0.99 }
};
function mat(name, over) { var m = MAT[name]; if (!m) throw new Error('모르는 재질 ' + name); return over ? Object.assign({}, m, over) : m; }

/* ───── 거리 함수 (안쪽이 음수) ───── */
var sd = {
  circle: function (cx, cy, r) { return function (u, v) { return Math.hypot(u - cx, v - cy) - r; }; },
  ellipse: function (cx, cy, rx, ry) { var m = Math.min(rx, ry); return function (u, v) { return (Math.hypot((u - cx) / rx, (v - cy) / ry) - 1) * m; }; },
  box: function (cx, cy, hw, hh, r) { r = r || 0; return function (u, v) { var qx = Math.abs(u - cx) - (hw - r), qy = Math.abs(v - cy) - (hh - r); return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r; }; },
  ring: function (cx, cy, R, r) { return function (u, v) { return Math.abs(Math.hypot(u - cx, v - cy) - R) - r; }; },
  seg: function (x0, y0, x1, y1, r0, r1) { return sd.path([[x0, y0], [x1, y1]], r0, r1); },
  /* 꺾은선을 따라가는 관. r0 → r1 로 굵기가 변한다 */
  path: function (pts, r0, r1) {
    r1 = r1 == null ? r0 : r1; var lens = [], total = 0, i;
    for (i = 0; i < pts.length - 1; i++) { lens.push(Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])); total += lens[i]; }
    return function (u, v) {
      var best = Infinity, acc = 0;
      for (var i = 0; i < pts.length - 1; i++) {
        var ax = pts[i][0], ay = pts[i][1], ex = pts[i + 1][0] - ax, ey = pts[i + 1][1] - ay, l2 = ex * ex + ey * ey || 1e-9;
        var t = Math.max(0, Math.min(1, ((u - ax) * ex + (v - ay) * ey) / l2)), d = Math.hypot(u - ax - ex * t, v - ay - ey * t);
        best = Math.min(best, d - (r0 + (r1 - r0) * ((acc + t * lens[i]) / (total || 1)))); acc += lens[i];
      }
      return best;
    };
  },
  poly: function (pts) {
    return function (u, v) {
      var d = Infinity, s = 1, n = pts.length;
      for (var i = 0, j = n - 1; i < n; j = i++) {
        var ex = pts[j][0] - pts[i][0], ey = pts[j][1] - pts[i][1], wx = u - pts[i][0], wy = v - pts[i][1];
        var t = Math.max(0, Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey || 1e-9))), bx = wx - ex * t, by = wy - ey * t;
        d = Math.min(d, bx * bx + by * by);
        var c1 = v >= pts[i][1], c2 = v < pts[j][1], c3 = ex * wy > ey * wx;
        if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
      }
      return s * Math.sqrt(d);
    };
  },
  union: function () { var f = [].slice.call(arguments); return function (u, v) { var d = Infinity; for (var i = 0; i < f.length; i++) d = Math.min(d, f[i](u, v)); return d; }; },
  inter: function () { var f = [].slice.call(arguments); return function (u, v) { var d = -Infinity; for (var i = 0; i < f.length; i++) d = Math.max(d, f[i](u, v)); return d; }; },
  sub: function (a, b) { return function (u, v) { return Math.max(a(u, v), -b(u, v)); }; },
  grow: function (f, r) { return function (u, v) { return f(u, v) - r; }; },
  half: function (a, b, c) { return function (u, v) { return a * u + b * v + c; }; }   /* a·u + b·v + c ≤ 0 인 쪽 */
};
/* 2차 곡선을 n 토막 꺾은선으로 (다리 · 김 · 끈) */
function bez(p0, p1, p2, n) { var out = []; n = n || 8; for (var i = 0; i <= n; i++) { var t = i / n, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), c = t * t; out.push([a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1]]); } return out; }

/* ───── 형태: hit(u, v) → 법선 [x, y, z] | 숫자(단계 0~4 고정) | true(단색) | null(밖) ───── */
/* 공·알: flat 0 = 공, 1 에 가까울수록 납작한 원반 (음영이 순해진다) */
function ball(cx, cy, rx, ry, flat) {
  ry = ry == null ? rx : ry; flat = flat || 0;
  return function (u, v) { var dx = (u - cx) / rx, dy = (v - cy) / ry, d2 = dx * dx + dy * dy; if (d2 > 1) return null; return norm([dx * (1 - flat), dy * (1 - flat), Math.sqrt(1 - d2) + flat * 1.2]); };
}
/* 거리 함수로 된 덩어리. bevel = 가장자리에서 꼭대기까지의 거리: 관이면 반지름(= 둥근 관), 판이면 1 안팎(= 모서리만 둥근 판). k = 가파르기 */
function solid(f, bevel, k) {
  k = k == null ? 1 : k;
  function h(a, b) { var t = Math.min(1, Math.max(0, -f(a, b) / bevel)); return Math.sqrt(1 - (1 - t) * (1 - t)); }
  return function (u, v) {
    if (f(u, v) > 0) return null;
    var e = 0.3, gx = (h(u + e, v) - h(u - e, v)) / (2 * e), gy = (h(u, v + e) - h(u, v - e)) / (2 * e);
    return norm([-gx * bevel * k, -gy * bevel * k, 1]);
  };
}
/* 돌림체 (병 · 종 · 컵 · 탑): 가운데 x = cx, 높이 y0~y1, 반지름 rf(v). 음영은 가로로만 돈다 + 옆선 기울기만큼 위아래 */
function lathe(cx, y0, y1, rf) {
  return function (u, v) {
    if (v < y0 || v > y1) return null; var r = rf(v); if (!(r > 0)) return null;
    var t = (u - cx) / r; if (Math.abs(t) > 1) return null;
    var e = 0.25, sl = (rf(Math.min(y1, v + e)) - rf(Math.max(y0, v - e))) / (2 * e);
    return norm([t, -sl * 0.8, Math.sqrt(1 - t * t)]);
  };
}
/* 단계를 고정한 평면 (상자의 윗면 · 앞면 · 옆면처럼 면마다 밝기가 정해진 것) */
function face(f, tone) { return function (u, v) { return f(u, v) <= 0 ? tone : null; }; }
/* 단색 (글씨 · 눈 · 무늬) */
function flat(f) { return function (u, v) { return f(u, v) <= 0 ? true : null; }; }
function clip(hit, pred) { return function (u, v) { return pred(u, v) ? hit(u, v) : null; }; }

/* ───── 장면 ───── */
function Scene(scale) { this.s = scale; this.N = Math.round(32 * scale); this.parts = []; this.xf = null; this.px = 1 / scale; }
/* 부품 더하기. m = 재질 이름 | 재질 | function(u, v) → 재질 | (단색이면) 색 글자.  opt: { shadow:false 그림자 안 드리움, recv:false 그림자 안 받음, line:true 아래 부품 위에 테를 두름,
   ol: 외곽선 색, outline:false 외곽선 없음, tone: function(u, v, t) → t 단계 고치기 (무늬), th: [..] 단계 문턱 } */
Scene.prototype.add = function (hit, m, opt) {
  if (typeof m === 'string' && m.length > 1) m = mat(m);
  this.parts.push({ hit: hit, mat: m, opt: opt || {}, xf: this.xf }); return this;
};
/* 묶음 돌리기: (cx, cy) 를 축으로 deg 도 (시계 방향). fn 안에서 더한 부품이 모두 돈다 — 무늬·재질 함수는 돌기 전 좌표를 받는다 */
Scene.prototype.rotate = function (cx, cy, deg, fn) {
  var a = deg * Math.PI / 180, prev = this.xf; this.xf = { cx: cx, cy: cy, c: Math.cos(a), s: Math.sin(a), up: prev }; fn.call(this, this); this.xf = prev; return this;
};
Scene.prototype.ball = function (cx, cy, rx, ry, m, opt) { return this.add(ball(cx, cy, rx, ry, opt && opt.flat), m, opt); };
Scene.prototype.solid = function (f, bevel, m, opt) { return this.add(solid(f, bevel, opt && opt.k), m, opt); };
Scene.prototype.lathe = function (cx, y0, y1, rf, m, opt) { return this.add(lathe(cx, y0, y1, rf), m, opt); };
Scene.prototype.face = function (f, tone, m, opt) { return this.add(face(f, tone), m, opt); };
/* 단색 무늬·글씨: 그림자를 드리우지 않는다 */
Scene.prototype.flat = function (f, key, opt) { return this.add(flat(f), key, Object.assign({ shadow: false }, opt || {})); };
/* 선 (굵기는 적어도 1px) */
Scene.prototype.stroke = function (pts, w, key, opt) { return this.flat(sd.path(pts, Math.max(w / 2, 0.5 * this.px)), key, opt); };
/* 반짝: 칸에 맞춘 십자 (팔 길이 = r 에 따라 1~3칸) + 가운데 흰 칸. 찌그러지지 않게 중심을 칸 가운데로 당긴다 */
Scene.prototype.spark = function (cx, cy, r, key, opt) {
  var px = this.px, x0 = (Math.floor(cx / px) + 0.5) * px, y0 = (Math.floor(cy / px) + 0.5) * px, n = Math.max(1, Math.min(3, Math.round(r / 1.3))) * px, k = key || 'F', ol = (opt && opt.ol) || 'D';
  this.flat(function (u, v) { var dx = Math.abs(u - x0), dy = Math.abs(v - y0); return (dx < 0.5 * px && dy < n + 0.5 * px) || (dy < 0.5 * px && dx < n + 0.5 * px) ? -1 : 1; }, k, Object.assign({}, opt || {}, { ol: ol }));
  if (k !== 'Z') this.flat(function (u, v) { return Math.abs(u - x0) < 0.5 * px && Math.abs(v - y0) < 0.5 * px ? -1 : 1; }, 'Z', { ol: ol });
  return this;
};
/* 칸을 직접 찍기 (글씨처럼 한 칸이 중요한 것): rows 의 글자 = 색, '.' = 비움. (x, y) = 왼쪽 위 칸 */
Scene.prototype.grid = function (x, y, rows, opt) {
  return this.add(function (u, v) { var i = Math.floor(u - x), j = Math.floor(v - y); return j >= 0 && j < rows.length && i >= 0 && i < rows[j].length && rows[j][i] !== '.' ? true : null; },
    function (u, v) { return rows[Math.floor(v - y)][Math.floor(u - x)]; }, Object.assign({ shadow: false }, opt || {}));
};

function local(xf, u, v) { while (xf) { var x = u - xf.cx, y = v - xf.cy; u = xf.cx + x * xf.c + y * xf.s; v = xf.cy - x * xf.s + y * xf.c; xf = xf.up; } return [u, v]; }
function world(xf, n) { /* 안쪽 묶음부터 바깥으로 되돌린다 */ var chain = []; while (xf) { chain.push(xf); xf = xf.up; } for (var i = chain.length - 1; i >= 0; i--) { var f = chain[i]; n = [n[0] * f.c - n[1] * f.s, n[0] * f.s + n[1] * f.c, n[2]]; } return n; }
var TH = [0.93, 0.74, 0.4, 0.12];

Scene.prototype.render = function () {
  var N = this.N, s = this.s, P = this.parts, idx = new Int16Array(N * N).fill(-1), tone = new Int8Array(N * N).fill(-1), mats = new Array(N * N), fixed = new Array(N * N).fill(null), under = new Array(N * N).fill(null), i, j, k;
  for (j = 0; j < N; j++) for (i = 0; i < N; i++) {
    var u = (i + 0.5) / s, v = (j + 0.5) / s, at = j * N + i;
    for (k = P.length - 1; k >= 0; k--) {
      var p = P[k], q = p.xf ? local(p.xf, u, v) : [u, v], h = p.hit(q[0], q[1]);
      if (h == null || h === false) continue;
      var m = typeof p.mat === 'function' ? p.mat(q[0], q[1]) : p.mat;
      if (m == null) continue;                                   /* 재질 함수가 null = 이 칸은 뚫림 */
      idx[at] = k; mats[at] = m;
      if (h === true || typeof m === 'string') {
        fixed[at] = typeof m === 'string' ? m : m.ramp[2];
        /* 단색 무늬가 덩어리 위에 있으면 외곽선은 그 밑 덩어리의 것을 쓴다 (무늬 색이 테로 번지지 않게) */
        for (var k2 = k - 1; k2 >= 0 && !p.opt.ol; k2--) { var p2 = P[k2], q2 = p2.xf ? local(p2.xf, u, v) : [u, v], h2 = p2.hit(q2[0], q2[1]); if (h2 == null || h2 === false || h2 === true) continue; var m2 = typeof p2.mat === 'function' ? p2.mat(q2[0], q2[1]) : p2.mat; if (m2 && typeof m2 !== 'string') { under[at] = m2.ol; break; } }
        break;
      }
      var t;
      if (typeof h === 'number') t = h;
      else {
        var n = p.xf ? world(p.xf, h) : h, d = n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2], th = p.opt.th || m.th || TH;
        t = d > th[0] ? 0 : d > th[1] ? 1 : d > th[2] ? 2 : d > th[3] ? 3 : 4;
        if (m.spec && n[0] * HALF[0] + n[1] * HALF[1] + n[2] * HALF[2] > m.spec) fixed[at] = m.specKey || 'Z';
      }
      if (p.opt.tone) t = Math.max(0, Math.min(4, p.opt.tone(q[0], q[1], t)));
      tone[at] = t; break;
    }
  }
  /* 드리운 그림자: 위·왼쪽 가까이에 더 위 부품이 있으면 한 단계 어둡게 */
  var reach = Math.max(1, Math.round(0.6 * s)), dark = new Uint8Array(N * N);
  for (j = 0; j < N; j++) for (i = 0; i < N; i++) {
    at = j * N + i; if (idx[at] < 0 || tone[at] < 0 || P[idx[at]].opt.recv === false) continue;
    for (var dd = 1; dd <= reach && !dark[at]; dd++) [[i - dd, j - dd], [i - dd, j], [i, j - dd]].forEach(function (c) {
      if (c[0] < 0 || c[1] < 0) return; var o = idx[c[1] * N + c[0]];
      if (o > idx[at] && P[o].opt.shadow !== false) dark[at] = 1;
    });
  }
  /* 테 두르기 (opt.line): 그 부품에 닿은 아래 부품 칸을 그 부품의 외곽선 색으로 */
  var line = new Array(N * N).fill(null);
  for (j = 0; j < N; j++) for (i = 0; i < N; i++) {
    at = j * N + i; if (idx[at] < 0) continue;
    [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]].forEach(function (c) {
      if (c[0] < 0 || c[1] < 0 || c[0] >= N || c[1] >= N) return; var o = idx[c[1] * N + c[0]];
      if (o > idx[at] && P[o].opt.line) { var om = mats[c[1] * N + c[0]], key = P[o].opt.ol || (typeof om === 'string' ? om : om.ol); if (!line[at] || LUM[key] < LUM[line[at]]) line[at] = key; }
    });
  }
  var keys = new Array(N * N).fill(null);
  for (at = 0; at < N * N; at++) {
    if (idx[at] < 0) continue;
    if (line[at]) { keys[at] = line[at]; continue; }
    if (tone[at] < 0) { keys[at] = fixed[at]; continue; }
    if (fixed[at] && !dark[at]) { keys[at] = fixed[at]; continue; }
    keys[at] = mats[at].ramp[Math.min(4, tone[at] + (dark[at] ? 1 : 0))];
  }
  /* 바깥 외곽선 */
  var out = keys.slice();
  for (j = 0; j < N; j++) for (i = 0; i < N; i++) {
    at = j * N + i; if (idx[at] >= 0) continue; var best = null;
    [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]].forEach(function (c) {
      if (c[0] < 0 || c[1] < 0 || c[0] >= N || c[1] >= N) return; var o = idx[c[1] * N + c[0]]; if (o < 0 || P[o].opt.outline === false) return;
      var om = mats[c[1] * N + c[0]], key = P[o].opt.ol || (typeof om === 'string' ? (under[c[1] * N + c[0]] || '1') : om.ol); if (!key) return;
      if (!best || LUM[key] < LUM[best]) best = key;
    });
    if (best) out[at] = best;
  }
  out.forEach(function (k2, n2) { if (k2 != null && !SP.KEY[k2]) throw new Error('모르는 색 글자 ' + k2 + ' @' + n2); });
  return { N: N, keys: out };
};

module.exports = { Scene: Scene, sd: sd, bez: bez, ball: ball, solid: solid, lathe: lathe, face: face, flat: flat, clip: clip, mat: mat, MAT: MAT };
