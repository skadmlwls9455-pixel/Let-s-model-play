/* ============================================================
   뽈뽈 문어 — js/scene3d.js (전역 SCENE3D)
   three.js r128 UMD 로 만든 픽셀아트 3D 다락방 + 절차적 문어. DESIGN.md §7.0 §7.1 §13, docs/SCENE.md
   전부 절차적(이미지/모델 파일 없음). 저해상 렌더 타깃 → 풀스크린 후처리(깊이 외곽선·노멀 하이라이트·
   램프 게이트 디더·OKLab 팔레트 스냅) → Nearest 업스케일. 카메라 타깃·정적 소품·문어는 pixelWorldSize 격자에 스냅. WebGL/THREE 가 없으면 APP 이 SCENE2D 를 쓴다.
   레시피: .claude/skills/cozy-web-game/references/three-pixel-look.md, pixel-look-references.md
   ============================================================ */
/* global THREE */
var SCENE3D = (function () {
  'use strict';
  var T = null;
  var DEG = Math.PI / 180;
  var TILT = 32 * DEG, YAW = 45 * DEG, DIST = 24, PX_PER_M = 18;   /* 아트 픽셀 18/m 고정 (p=3 폰에서 1px ≈ 5.5 cm) */
  var ZOOM_STEPS = [1, 1.25, 1.5, 2];
  /* 방 5×5 m (x,z ∈ [-2.5, 2.5]). 뒷벽 오른쪽 끝의 문으로 나간다 (§13.2 의 앞쪽 문은 직교 시점에서 바닥을 가려 뒷벽으로 옮김) */
  var R = 2.5;
  var ANCHORS = { door: [1.95, 0, -2.05], window: [-1.8, 0, 0.4], crate: [1.25, 0, -1.0], board: [0.1, 0, -2.0], blanket: [-1.0, 0, 1.5], center: [0, 0, 0.2] };

  /* ───────────────────────── 색 수학 (sRGB ↔ 선형 ↔ OKLab) ───────────────────────── */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function s2l(v) { return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  function l2s(v) { v = clamp(v, 0, 1); return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; }
  function hexRgb(hex) { return [1, 3, 5].map(function (i) { return parseInt(hex.slice(i, i + 2), 16) / 255; }); }
  function rgbHex(rgb) { return '#' + rgb.map(function (v) { return ('0' + Math.round(clamp(v, 0, 1) * 255).toString(16)).slice(-2); }).join(''); }
  function linToOklab(c) {
    var r = Math.max(c[0], 0), g = Math.max(c[1], 0), b = Math.max(c[2], 0);
    var l = Math.cbrt(0.412221469470763 * r + 0.5363325372617348 * g + 0.0514459932675022 * b);
    var m = Math.cbrt(0.2119034958178252 * r + 0.6806995506452344 * g + 0.1073969535369406 * b);
    var s = Math.cbrt(0.0883024591900564 * r + 0.2817188391361215 * g + 0.6299787016738222 * b);
    return [0.210454268309314 * l + 0.7936177747023054 * m - 0.0040720430116193 * s,
      1.9779985324311684 * l - 2.4285922420485799 * m + 0.450593709617411 * s,
      0.0259040424655478 * l + 0.7827717124575296 * m - 0.8086757549230774 * s];
  }
  function oklabToLin(L, a, b) {
    var l = Math.pow(L + 0.3963377773761749 * a + 0.2158037573099136 * b, 3);
    var m = Math.pow(L - 0.1055613458156586 * a - 0.0638541728258133 * b, 3);
    var s = Math.pow(L - 0.0894841775298119 * a - 1.2914855480194092 * b, 3);
    return [4.0767416360759574 * l - 3.3077115392580616 * m + 0.2309699031821044 * s,
      -1.2684379732850317 * l + 2.6097573492876887 * m - 0.3413193760026573 * s,
      -0.0041960761386756 * l - 0.7034186179359362 * m + 1.7076146940746117 * s];
  }
  function hexToOklab(hex) { return linToOklab(hexRgb(hex).map(s2l)); }
  function oklabToHex(lab) { return rgbHex(oklabToLin(lab[0], lab[1], lab[2]).map(l2s)); }
  /* 램프: n칸, 가운데가 base. 그림자는 파랑/보라 쪽, 하이라이트는 노랑 쪽으로 색상 이동 */
  function ramp(hex, n, dL, shift) {
    dL = dL || 0.085; shift = shift || [0.004, 0.012];
    var lab = hexToOklab(hex), mid = (n - 1) / 2, out = [];
    for (var i = 0; i < n; i++) { var k = i - mid; out.push(oklabToHex([clamp(lab[0] + k * dL, 0.05, 0.98), lab[1] + k * shift[0] * 0.5, lab[2] + k * shift[1]])); }
    return out;
  }
  function hueHex(hex, deg) { /* OKLab 에서 색상만 돌린다 */
    var lab = hexToOklab(hex), r = deg * DEG, c = Math.cos(r), s = Math.sin(r);
    return oklabToHex([lab[0], lab[1] * c - lab[2] * s, lab[1] * s + lab[2] * c]);
  }
  function mixHex(a, b, k) { var A = hexToOklab(a), B = hexToOklab(b); return oklabToHex([A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k]); }
  function hash(s) { s = String(s); var x = 2166136261; for (var i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
  var PX = 1 / PX_PER_M;                                                          /* 아트 픽셀 한 변(월드 m, p=3 줌 1 기준) = 1/18 m ≈ 5.6 cm */
  function snapPos(v) { return Math.round(v * PX_PER_M) / PX_PER_M; }            /* 정적 소품 위치를 빌드 때 이 격자에 스냅 (룩 패스 5) */

  /* 즉흥 램프 (49) + 고정 3 + 문어 램프 5 = 57. 재질 기본색은 늘 이 램프에서 뽑는다 (스냅이 선택 팔레트로 옮긴다) */
  var RAMPS = [['wood', '#8a5a3c', 8], ['paper', '#efe3c8', 4], ['amber', '#ffb462', 6], ['navy', '#22304f', 6], ['moss', '#5f7a3a', 4],
    ['slate', '#6a6670', 6], ['sky', '#9fc7e8', 4], ['dusk', '#e39a8c', 4], ['glass', '#8aa0b4', 4], ['rose', '#9a5058', 3]];
  var FIXED = { ink: '#1b1522', white: '#fbf6ea', night: '#0b1020' };
  /* 스냅 팔레트 소스 (룩 패스 3): 'ramps' = 위 즉흥 램프, 나머지 = js/palettes.js 의 검증 팔레트 + 문어 램프 5 + (없으면) 밤검정·종이흰. 최대 PAL_MAX, 셰이더 배열 72 */
  var PAL_SOURCES = ['ramps', 'apollo', 'endesga64', 'resurrect64'], PAL_DEFAULT = 'apollo', PAL_MAX = 70;
  function paletteSource(name) { return PAL_SOURCES.indexOf(name) > 0 && typeof PALETTES !== 'undefined' && PALETTES[name] ? name : 'ramps'; }
  function minDist(labs, lab) { var b = 1e9; for (var i = 0; i < labs.length; i++) { var d = Math.hypot(labs[i][0] - lab[0], labs[i][1] - lab[1], labs[i][2] - lab[2]); if (d < b) b = d; } return b; }
  function medianStep(list) { /* 팔레트 칸 간격 = 최근접 이웃 OKLab 거리의 중앙값 (디더 진폭 기준) */
    var labs = list.map(hexToOklab), d = labs.map(function (a, i) { return minDist(labs.filter(function (_, j) { return j !== i; }), a); }).sort(function (a, b) { return a - b; });
    return d.length ? d[d.length >> 1] : 0.05;
  }
  function buildPalette(octHex, source) {
    var P = {}, list = [];
    RAMPS.forEach(function (r) { P[r[0]] = ramp(r[1], r[2]); });
    Object.keys(FIXED).forEach(function (k) { P[k] = FIXED[k]; });
    P.oct = ramp(octHex, 5, 0.09, [0.004, 0.014]);
    P.source = paletteSource(source);
    if (P.source === 'ramps') { RAMPS.forEach(function (r) { list = list.concat(P[r[0]]); }); Object.keys(FIXED).forEach(function (k) { list.push(FIXED[k]); }); }
    else {
      list = PALETTES[P.source].colors.map(function (h) { return h.toLowerCase(); });
      var labs = list.map(hexToOklab);
      [FIXED.night, FIXED.white].forEach(function (h) { if (minDist(labs, hexToOklab(h)) > 0.05) list.push(h); });   /* 밤검정 #0b1020 · 종이흰: 팔레트에 비슷한 게 없을 때만 */
    }
    list = list.concat(P.oct).slice(0, PAL_MAX);
    P.list = list; P.step = medianStep(list);
    return P;
  }
  /* 재질 기본색 (룩 패스 3, docs/SCENE.md 팔레트): 바닥·벽·받침·깔개·종이가 어느 팔레트에서도 서로 다른 칸에 앉도록 조정 — 벽은 회백(그늘에서 회청 계열), 깔개 줄무늬는 파랑, 바닥·종이·샛기둥은 램프값. 나머지 소품은 램프 그대로 */
  var MAT = { floorA: '#7b4f35', floorB: '#996643', floorSeam: '#5f3928', knot: '#44241b',
    wallA: '#c2b4a4', wallB: '#b0a292', wallSeam: '#66605c', stud: '#7b4f35',
    slabTop: '#55484c', slabLine: '#746668', slabBase: '#3f3438',
    rugEdge: '#2e3b58', rugA: '#3f6690', rugB: '#5c86b0', paper: '#dfd5bf' };
  /* 문어 몸 색에서 파생: 하이라이트(밝고 노랑 쪽) · 빨판(더 밝고 따뜻) · 입(어둡게) */
  function octDerived(hex) {
    var lab = hexToOklab(hex);
    return { body: hex, hi: oklabToHex([clamp(lab[0] + 0.14, 0, 0.95), lab[1] - 0.02, lab[2] + 0.07]), pale: oklabToHex([clamp(lab[0] + 0.26, 0, 0.96), lab[1] - 0.04, lab[2] + 0.06]),
      mouth: oklabToHex([clamp(lab[0] - 0.32, 0.1, 1), lab[1] * 0.8, lab[2] * 0.6]), eye: '#1b1f2e', white: '#fff6ee' };
  }

  /* ───────────────────────── GLSL 후처리 ───────────────────────── */
  var VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  var FRAG = [
    '#include <packing>',
    'varying vec2 vUv;',
    'uniform sampler2D tDiffuse, tDepth, tNormal, uBayer, tBloom; uniform vec2 uRes; uniform float uNear, uFar;',
    'uniform vec3 uPalOk[72]; uniform vec3 uPalRgb[72]; uniform int uPalN; uniform vec3 uW;',
    'uniform float uDither, uOutline, uHasNormal, uVig, uBloom;',
    'vec3 srgbToLinear(vec3 c){ vec3 lo = c / 12.92; vec3 hi = pow((c + 0.055) / 1.055, vec3(2.4)); return mix(lo, hi, step(vec3(0.04045), c)); }',
    'vec3 linToOklab(vec3 c){ c = max(c, vec3(0.0));',
    '  float l = 0.412221469470763 * c.r + 0.5363325372617348 * c.g + 0.0514459932675022 * c.b;',
    '  float m = 0.2119034958178252 * c.r + 0.6806995506452344 * c.g + 0.1073969535369406 * c.b;',
    '  float s = 0.0883024591900564 * c.r + 0.2817188391361215 * c.g + 0.6299787016738222 * c.b;',
    '  l = pow(l, 1.0/3.0); m = pow(m, 1.0/3.0); s = pow(s, 1.0/3.0);',
    '  return vec3(0.210454268309314 * l + 0.7936177747023054 * m - 0.0040720430116193 * s,',
    '              1.9779985324311684 * l - 2.4285922420485799 * m + 0.450593709617411 * s,',
    '              0.0259040424655478 * l + 0.7827717124575296 * m - 0.8086757549230774 * s); }',
    'float bayer(vec2 ap){ return texture2D(uBayer, (ap + 0.5) / 4.0).r * (255.0/256.0) + (0.5/16.0) - 0.5; }',
    'float depthM(vec2 uv){ return -orthographicDepthToViewZ(texture2D(tDepth, uv).r, uNear, uFar); }',
    'vec3 nrm(vec2 uv){ return texture2D(tNormal, uv).rgb * 2.0 - 1.0; }',
    'float luma(vec2 uv){ vec3 c = texture2D(tDiffuse, uv).rgb; return dot(c, vec3(0.299, 0.587, 0.114)); }',
    /* 이웃 한 칸: 깊이가 더 멀면 어두운 선(dd), 같은 깊이에서 노멀이 꺾이면 밝은 선(nn) — RenderPixelatedPass 규칙 */
    'float tap(vec2 uv, vec2 off, float d0, vec3 n0, inout float dd, inout float nn){',
    '  vec2 u2 = uv + off; float d1 = depthM(u2); dd += max(d1 - d0, 0.0);',
    '  vec3 n1 = nrm(u2); float di = clamp(sign((d1 - d0) * 0.25 + 0.0025), 0.0, 1.0);',
    '  float ni = smoothstep(-0.01, 0.01, dot(n0 - n1, vec3(1.0)));',
    '  nn += (1.0 - dot(n0, n1)) * di * ni; return luma(u2); }',
    /* 램프 게이트(룩 패스 5): 한 축의 양쪽 1계 차분이 같은 부호일 때 둘 중 작은 쪽 = 연속 기울기. 1px 이음·외곽선·계단 가장자리·2색 경계는 한쪽 차분이 0 이라 0 → 거기엔 디더가 안 붙는다 */
    'float ramp(float lm, float l0, float lp){ float a = l0 - lm, b = lp - l0; return (a * b > 0.0) ? min(abs(a), abs(b)) : 0.0; }',
    'void main(){',
    '  vec2 ap = floor(vUv * uRes), px = 1.0 / uRes;',
    '  vec3 c = texture2D(tDiffuse, vUv).rgb;',
    /* 발광 블룸 (룩 패스 6): 저해상 발광 타깃(등불 유리·양초 불꽃·창 유리만)을 아트 픽셀 단위 5탭 분리 블러한 것을 팔레트 스냅 *전에* 선형으로 더한다 → 글로우가 따뜻한 팔레트 칸으로 양자화되고 램프 게이트 디더를 받는다 */
    '  vec3 bl = srgbToLinear(texture2D(tBloom, vUv).rgb) * uBloom;',
    '  float blk = dot(bl, vec3(0.299, 0.587, 0.114));',
    '  vec3 ok = linToOklab(srgbToLinear(c) + bl);',
    '  ok.x = (ok.x - 0.5) * 1.03 + 0.5; ok.yz *= 1.07;',                               /* grade: 대비 1.03, 채도 1.07 */
    '  float d0 = depthM(vUv); vec3 n0 = nrm(vUv); float l0 = luma(vUv); float dd = 0.0, nn = 0.0;',
    '  float lR = tap(vUv, vec2(px.x, 0.0), d0, n0, dd, nn), lL = tap(vUv, vec2(-px.x, 0.0), d0, n0, dd, nn);',
    '  float lU = tap(vUv, vec2(0.0, px.y), d0, n0, dd, nn), lD = tap(vUv, vec2(0.0, -px.y), d0, n0, dd, nn);',
    '  float dei = floor(smoothstep(0.06, 0.5, dd) * 2.0) / 2.0 * uOutline * (1.0 - smoothstep(0.01, 0.08, blk));',   /* 깊이 외곽선: 2단 (6 cm 부터). 글로우 속(블룸 루마 > 0.01)에선 잉크선이 빛에 묻힌다 */
    '  float nei = step(0.1, nn) * uOutline * uHasNormal;',                               /* 노멀 하이라이트: 가까운 면만 */
    '  ok.x *= 1.0 - 0.34 * dei;',
    '  ok.x *= (dei < 0.01) ? (1.0 + 0.06 * nei) : 1.0;',
    '  float g = max(ramp(lL, l0, lR), ramp(lD, l0, lU));',                              /* 3탭 연속 기울기 (가로·세로 중 큰 쪽) */
    '  float gate = smoothstep(0.004, 0.055, g) * (1.0 - smoothstep(0.16, 0.3, g));',     /* 디더는 톤 램프에만: 기울기 0.004~0.055 에서 올라가고, 1px 띠처럼 아주 가파르면 다시 끈다 */
    '  ok.x += bayer(ap) * uDither * mix(0.125, 1.0, gate);',                            /* 평지 0.05 칸 · 램프 0.4 칸 (uDither = 0.4 × PAL.step × 슬라이더/0.25) */
    '  float bgk = step(uFar - 0.5, d0) * uVig; vec2 vq = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);',   /* 허공(배경)만: 가장자리로 갈수록 어둡게 + 정적 Bayer (비네트) */
    '  ok.x -= bgk * 0.1 * smoothstep(0.3, 0.9, length(vq)); ok.x += bgk * bayer(ap) * 0.06;',
    '  float best = 1e9, bestL = 0.0; int bi = 0;',
    '  for (int i = 0; i < 72; i++) { if (i >= uPalN) break;',
    '    vec3 d = (ok - uPalOk[i]) * uW; float q = dot(d, d);',
    '    if (q < best - 0.0005 || (q < best + 0.0005 && uPalOk[i].x > bestL)) { best = q; bi = i; bestL = uPalOk[i].x; } }',  /* 근소 동률 → 밝은 쪽 */
    '  gl_FragColor = vec4(uPalRgb[bi], 1.0);',
    '}'].join('\n');
  /* 발광 블러 (룩 패스 6): 한 축 5탭 [0.12 0.22 0.32 0.22 0.12] (오프셋 ±1·±2 아트px, 반지름 ≈ 2px) — 가로 한 번·세로 한 번. 가우시안보다 평평한 꼬리라 2px 째 고리가 스냅 뒤에도 남는다 */
  var BLUR_FRAG = [
    'varying vec2 vUv; uniform sampler2D tSrc; uniform vec2 uDir;',
    'void main(){',
    '  vec3 c = texture2D(tSrc, vUv).rgb * 0.32;',
    '  c += (texture2D(tSrc, vUv + uDir).rgb + texture2D(tSrc, vUv - uDir).rgb) * 0.22;',
    '  c += (texture2D(tSrc, vUv + 2.0 * uDir).rgb + texture2D(tSrc, vUv - 2.0 * uDir).rgb) * 0.12;',
    '  gl_FragColor = vec4(c, 1.0);',
    '}'].join('\n');

  function supported() {
    if (typeof THREE === 'undefined' || !THREE.WebGLRenderer) return false;
    try { if (new URLSearchParams(location.search).get('scene') === '2d') return false; } catch (e) { /* noop */ }
    try {
      var c = document.createElement('canvas');
      var gl = c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!gl) return false;
      var ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext();
      return true;
    } catch (e) { return false; }
  }

  /* ───────────────────────── 기하 도우미 ───────────────────────── */
  function C(hex) { return new T.Color(hex).convertSRGBToLinear(); }
  function M(x, y, z, rx, ry, rz, sx, sy, sz) {
    var m = new T.Matrix4(), q = new T.Quaternion().setFromEuler(new T.Euler(rx || 0, ry || 0, rz || 0));
    return m.compose(new T.Vector3(x || 0, y || 0, z || 0), q, new T.Vector3(sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz));
  }
  /* parts: [{g, m, c(hex), tag}] → 정점색 하나의 BufferGeometry (재질 1개 = 드로우콜 1개). tags 는 setColor 용 */
  function mergeParts(parts) {
    var pos = [], nor = [], uv = [], col = [], tags = [];
    parts.forEach(function (p) {
      var g = p.g.index ? p.g.toNonIndexed() : p.g;
      if (p.m) g.applyMatrix4(p.m);
      var pa = g.attributes.position.array, na = g.attributes.normal.array, ua = g.attributes.uv ? g.attributes.uv.array : null, n = pa.length / 3, c = C(p.c);
      for (var i = 0; i < pa.length; i++) { pos.push(pa[i]); nor.push(na[i]); }
      for (i = 0; i < n * 2; i++) uv.push(ua ? ua[i] : 0);
      for (i = 0; i < n; i++) { col.push(c.r, c.g, c.b); tags.push(p.tag || 0); }
      g.dispose(); if (g !== p.g) p.g.dispose();
    });
    var out = new T.BufferGeometry();
    out.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    out.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    out.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    out.userData.tags = tags;
    return out;
  }
  function recolor(geo, tag, hex) {
    var a = geo.attributes.color, tags = geo.userData.tags, c = C(hex);
    for (var i = 0; i < tags.length; i++) if (tags[i] === tag) a.setXYZ(i, c.r, c.g, c.b);
    a.needsUpdate = true;
  }
  function box(w, h, d, sx, sy, sz) { return new T.BoxGeometry(w, h, d, sx || 1, sy || 1, sz || 1); }
  function radialTex() { /* 32×32 알파 원판: 접지 그림자 · 등불 글로우 */
    var cv = document.createElement('canvas'); cv.width = cv.height = 32;
    var cx = cv.getContext('2d'), g = cx.createRadialGradient(16, 16, 2, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    cx.fillStyle = g; cx.fillRect(0, 0, 32, 32);
    var t = new T.CanvasTexture(cv); t.minFilter = t.magFilter = T.NearestFilter; t.generateMipmaps = false;
    return t;
  }
  function bayerTex() {
    var m = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], data = new Uint8Array(64);
    m.forEach(function (v, i) { data[i * 4] = v * 16; data[i * 4 + 3] = 255; });
    var t = new T.DataTexture(data, 4, 4, T.RGBAFormat, T.UnsignedByteType);
    t.magFilter = t.minFilter = T.NearestFilter; t.wrapS = t.wrapT = T.RepeatWrapping; t.needsUpdate = true;
    return t;
  }
  function gradientTex() { /* 3단 툰 */
    var d = new Uint8Array([92, 92, 92, 255, 170, 170, 170, 255, 255, 255, 255, 255]);
    var t = new T.DataTexture(d, 3, 1, T.RGBAFormat, T.UnsignedByteType); t.minFilter = t.magFilter = T.NearestFilter; t.needsUpdate = true;
    return t;
  }
  /* 포스터 SVG → 캔버스 텍스처 (외부 참조 없는 SVG 만. 실패하면 null) */
  function bakeSVG(svg, w, hgt) {
    return new Promise(function (resolve) {
      if (!svg) return resolve(null);
      var img = new Image(), done = false;
      img.onload = function () {
        if (done) return; done = true;
        try {
          var cv = document.createElement('canvas'); cv.width = w; cv.height = hgt;
          var cx = cv.getContext('2d'); cx.drawImage(img, 0, 0, w, hgt); cx.getImageData(0, 0, 1, 1);   /* tainted 면 여기서 throw */
          var t = new T.CanvasTexture(cv); t.minFilter = t.magFilter = T.NearestFilter; t.generateMipmaps = false; t.encoding = T.sRGBEncoding;
          resolve(t);
        } catch (e) { resolve(null); }
      };
      img.onerror = function () { if (!done) { done = true; resolve(null); } };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }

  /* 시각대별 조명 (룩 패스 4 · pixel-look-references 5·7: 키 하나(창으로만 들어오는 태양, 보이지 않는 지붕·앞벽 차폐로 바닥에 창 모양 빛 조각) + 차가운 헤미 + 카메라 쪽 약한 필 + 등불 점광, 밤 = 새 비율)
     sun/sunI/elev/az = 키 색·세기·고도·방위(창 법선 −x 에서 +z 쪽으로; 창턱이 낮은 광선을 자르므로 낮 30°/방위 30° 에서 빛 조각 = 문어 뒤 바닥 x −0.2~1.5 · z −0.5~−2.5 + 뒷벽 아래 — 문어(center)가 조각 어귀에 서면 그림자가 조각 안으로 떨어지므로 방위를 돌려 조각을 문어 뒤로 보냈다) · sky/gnd/hemiI = 헤미 · fill/fillI = 필 방향광(그림자 없음, 카메라 쪽 낮은 각 (6,3,8): 벽을 들고 바닥은 덜) · out = 창밖 · lamp = 등불 점광 세기(8칸) · lampD = 점광 거리(바닥 웅덩이 크기) · glow = 글로우 원판 불투명도(8칸) · pool = 웅덩이 데칼 계수 · candle = 양초 점광 계수 */
  var LIGHTS = {
    day: { sun: '#dfe9ff', sunI: 3.0, elev: 30, az: 30, sky: '#d6ecf6', gnd: '#4a4030', hemiI: 0.36, fill: '#a9cbe2', fillI: 1.3, out: '#9fc7e8', lamp: 0.25, lampD: 5, glow: 0.4, pool: 0.3, candle: 0.4, em: 0.25, winEm: '#78a0c0', bg: '#1b1522' },
    dawn: { sun: '#f6b4a6', sunI: 2.0, elev: 20, az: 30, sky: '#e0c0c8', gnd: '#4a3a38', hemiI: 0.28, fill: '#c9b0bc', fillI: 0.8, out: '#e8b0b8', lamp: 0.5, lampD: 5.5, glow: 0.55, pool: 0.6, candle: 0.7, em: 0.6, winEm: '#a88090', bg: '#1b1522' },
    dusk: { sun: '#ffb070', sunI: 1.8, elev: 16, az: 30, sky: '#d08860', gnd: '#3a2e30', hemiI: 0.26, fill: '#b89a90', fillI: 0.7, out: '#e39a8c', lamp: 0.8, lampD: 6, glow: 0.6, pool: 0.75, candle: 0.85, em: 0.8, winEm: '#a87060', bg: '#1b1522' },
    night: { sun: '#93a7c4', sunI: 0.5, elev: 30, az: 30, sky: '#1b2740', gnd: '#090b12', hemiI: 0.16, fill: '#4a5a80', fillI: 0.06, out: '#141c33', lamp: 1.2, lampD: 6, glow: 0.7, pool: 1.0, candle: 1.0, em: 1.0, winEm: '#3c507a', bg: '#0b1020' }
  };
  /* 발광 색 (룩 패스 6): 등불 유리 속 심지·양초 불꽃의 발광 타깃 색. 시각대 `em` 과 등불 칸 수로 배율, `winEm` 은 창 유리 발광 색(낮 = 하늘 밝게, 밤 = 희미한 차가운 색) */
  var EM = { lamp: '#ffc46a', flame: '#ffd990' };
  function phaseOf(h) { return h < 6 ? 'night' : h < 9 ? 'dawn' : h < 17 ? 'day' : h < 19 ? 'dusk' : 'night'; }

  /* ═══════════════════════════ init ═══════════════════════════ */
  function init(container, opts) {
    T = THREE; opts = opts || {};
    var on = opts.on || {};
    var st = { lantern: opts.lantern | 0, items: (opts.items || []).slice(), weather: opts.weather || 'rain', hour: typeof opts.hour === 'number' ? opts.hour : 21.5,
      color: opts.color || '#e8463c', reduced: !!opts.reducedMotion, speed: opts.speed > 0 ? opts.speed : 1, octState: 'idle', paused: false, hidden: false,
      look: Object.assign({ pixelSize: 3, dither: 0.25, outline: true, yaw: 0, key: LIGHTS.day.sunI, fill: LIGHTS.day.hemiI }, opts.look || {}), zoom: 0, palette: paletteSource(opts.palette || PAL_DEFAULT) };
    st.look.key = clamp(+st.look.key || LIGHTS.day.sunI, 0.5, 4); st.look.fill = clamp(+st.look.fill || LIGHTS.day.hemiI, 0, 1);
    var PAL = buildPalette(st.color, st.palette), OC = octDerived(st.color);
    var disposables = [], unbind = [], raf = 0, lastT = 0, frameNo = 0, time = 0, calls = 0, ready = false;
    function listen(el, ev, fn, o) { el.addEventListener(ev, fn, o); unbind.push(function () { el.removeEventListener(ev, fn, o); }); }
    function keep(x) { disposables.push(x); return x; }

    /* ── 렌더러 · 타깃 · 후처리 ── */
    var renderer = new T.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(1); renderer.outputEncoding = T.LinearEncoding;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFShadowMap; renderer.shadowMap.autoUpdate = false;   /* PCF radius 1 = 딱딱한 그림자 (룩 패스 4) */
    var canvas = renderer.domElement; canvas.className = 'scene3d-canvas'; canvas.style.imageRendering = 'pixelated';
    container.appendChild(canvas);
    var hasDepthTex = renderer.capabilities.isWebGL2 || !!renderer.extensions.get('WEBGL_depth_texture');
    var rt = keep(new T.WebGLRenderTarget(4, 4, { minFilter: T.NearestFilter, magFilter: T.NearestFilter, format: T.RGBAFormat, type: T.UnsignedByteType, depthBuffer: true, stencilBuffer: false,
      depthTexture: hasDepthTex ? new T.DepthTexture(4, 4, T.UnsignedIntType) : undefined }));
    rt.texture.encoding = T.sRGBEncoding; rt.texture.generateMipmaps = false;
    var rtN = keep(new T.WebGLRenderTarget(4, 4, { minFilter: T.NearestFilter, magFilter: T.NearestFilter, format: T.RGBAFormat, depthBuffer: true, stencilBuffer: false }));
    var normalMat = keep(new T.MeshNormalMaterial());
    /* 발광 타깃 (룩 패스 6): 뷰티와 같은 저해상, 레이어 1(등불 유리·불꽃·창 유리의 발광 쌍둥이)만 그린다. 깊이 텍스처가 있으면 뷰티의 깊이 텍스처를 **공유**해(같은 DepthTexture 를 두 FBO 에 붙임, 깊이 클리어 안 함) 앞에 선 소품·문어가 발광을 가린다. rtB = 분리 블러 핑퐁 */
    var rtE = keep(new T.WebGLRenderTarget(4, 4, { minFilter: T.NearestFilter, magFilter: T.NearestFilter, format: T.RGBAFormat, type: T.UnsignedByteType, depthBuffer: true, stencilBuffer: false, depthTexture: rt.depthTexture || undefined }));
    rtE.texture.encoding = T.sRGBEncoding; rtE.texture.generateMipmaps = false;
    var rtB = keep(new T.WebGLRenderTarget(4, 4, { minFilter: T.NearestFilter, magFilter: T.NearestFilter, format: T.RGBAFormat, type: T.UnsignedByteType, depthBuffer: false, stencilBuffer: false }));
    rtB.texture.generateMipmaps = false;
    var blurMat = keep(new T.ShaderMaterial({ depthTest: false, depthWrite: false, vertexShader: VERT, fragmentShader: BLUR_FRAG, uniforms: { tSrc: { value: rtE.texture }, uDir: { value: new T.Vector2(0, 0) } } }));
    var BLOOM = 0.7, blurOn = true;   /* 블룸 세기(선형 가산 배율) · p ≥ 4 면 블러 생략 (폰 비용: 발광 타깃을 그대로 더한다) */
    var post = keep(new T.ShaderMaterial({ depthTest: false, depthWrite: false, vertexShader: VERT, fragmentShader: FRAG, uniforms: {
      tDiffuse: { value: rt.texture }, tDepth: { value: rt.depthTexture || rtN.texture }, tNormal: { value: rtN.texture }, tBloom: { value: rtE.texture }, uBloom: { value: BLOOM },
      uRes: { value: new T.Vector2(4, 4) }, uNear: { value: 0.1 }, uFar: { value: 60 },
      uPalOk: { value: new Float32Array(216) }, uPalRgb: { value: new Float32Array(216) }, uPalN: { value: 0 }, uW: { value: new T.Vector3(1, 1.3, 1.3) },
      uDither: { value: 0 }, uOutline: { value: hasDepthTex ? 1 : 0 }, uHasNormal: { value: 1 }, uVig: { value: hasDepthTex ? 1 : 0 }, uBayer: { value: keep(bayerTex()) } } }));
    renderer.autoClear = false;   /* 패스마다 명시적으로 클리어 (발광 패스는 색만 지우고 뷰티 깊이를 쓴다) */
    var quadGeo = keep(new T.BufferGeometry());
    quadGeo.setAttribute('position', new T.Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3));
    quadGeo.setAttribute('uv', new T.Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2));
    var quadCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), quadScene = new T.Scene();
    var quad = new T.Mesh(quadGeo, post); quad.frustumCulled = false; quadScene.add(quad);
    function uploadPalette() {
      var ok = post.uniforms.uPalOk.value, rgb = post.uniforms.uPalRgb.value;
      PAL.list.forEach(function (hex, i) { var lab = hexToOklab(hex), c = hexRgb(hex); ok[i * 3] = lab[0]; ok[i * 3 + 1] = lab[1]; ok[i * 3 + 2] = lab[2]; rgb[i * 3] = c[0]; rgb[i * 3 + 1] = c[1]; rgb[i * 3 + 2] = c[2]; });
      post.uniforms.uPalN.value = PAL.list.length;
    }
    uploadPalette();
    /* 디더 L 진폭 (룩 패스 5): 램프 위 0.4 × PAL.step, 평지 0.05 × PAL.step (셰이더 mix(0.125, 1, gate)). 슬라이더는 배율 — 0.25(기본) = ×1, 1 = ×4.
       Apollo step 0.058 → 램프 0.023 · 평지 0.003 (즉흥 0.048 → 0.019/0.002 · Endesga 0.064 → 0.026/0.003). 패스 4 까지는 슬라이더 × 2 × step = ½ 칸이 이음 옆 모든 널 픽셀에 붙어 바닥이 체크무늬였다.
       카메라 드래그/줌/시점 변경 후 0.3 s 동안 0 (dither.still), 모션 감소면 항상 0 */
    var dither = { base: 0, still: 0 };
    function ditherBase() { dither.base = 0.4 * PAL.step * (st.look.dither / 0.25); }
    ditherBase();
    function ditherNow() { return st.reduced ? 0 : (dither.still < 0.3 ? 0 : dither.base); }

    /* ── 카메라 (직교 다이메트릭, 픽셀 격자 스냅) ── */
    var camera = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 60);
    var camTarget = new T.Vector3(0, 0.75, -0.4), _tg = new T.Vector3(), yawDrag = 0, dragging = false;
    function camTargetNow() { return st.look.focus === 'oct' && octG ? _tg.copy(octG.position).add(_focusUp) : camTarget; }   /* look.focus='oct': 문어 중심 (look-shots close) */
    var _focusUp = new T.Vector3(0, 0.45, 0);
    var S = { W: 0, H: 0, p: 3, rw: 4, rh: 4, cw: 4, ch: 4, N: PX_PER_M, pw: PX, offX: 0, offY: 0 };   /* pw = pixelWorldSize: 아트 픽셀 한 변(월드 m), resize 에서 프러스텀 폭 / 타깃 폭 */
    function yawDelta() { var y = clamp(yawDrag + st.look.yaw * DEG, -25 * DEG, 25 * DEG); return Math.round(y / (9 * DEG)) * 9 * DEG; }   /* 9° 스냅 */
    var _off = new T.Vector3(), _r = new T.Vector3(), _u = new T.Vector3(), _ax = new T.Vector3(1, 0, 0), _ay = new T.Vector3(0, 1, 0);
    function placeCamera() {
      var tgt = camTargetNow();
      _off.set(0, 0, DIST).applyAxisAngle(_ax, -TILT).applyAxisAngle(_ay, YAW + yawDelta());
      camera.position.copy(tgt).add(_off); camera.lookAt(tgt); camera.updateMatrixWorld();
      _r.setFromMatrixColumn(camera.matrixWorld, 0); _u.setFromMatrixColumn(camera.matrixWorld, 1);
      snapScreen(camera.position, tgt);   /* 타깃을 카메라 우/상 축 기준 pixelWorldSize 격자에 스냅 → 패닝/추적 중 픽셀 크리프 없음 */
      camera.updateMatrixWorld();
    }
    function snapScreen(v, ref) { /* v 를 (ref 또는 v 자신의) 카메라 우/상 축 좌표가 S.pw 의 배수가 되도록 옮긴다. 깊이 방향은 그대로 (직교) */
      ref = ref || v; var pw = S.pw, dx = ref.dot(_r), dy = ref.dot(_u);
      return v.addScaledVector(_r, Math.round(dx / pw) * pw - dx).addScaledVector(_u, Math.round(dy / pw) * pw - dy);
    }
    function snapUp(dy) { var k = S.pw / Math.max(_u.y, 1e-3); return Math.round(dy / k) * k; }   /* 월드 y 오프셋을 화면 세로 픽셀 단위로 (문어 폴짝·걷기 통통) */
    function pxUp() { return S.pw / Math.max(_u.y, 1e-3); }                                       /* 화면 세로 1px = 월드 y 이만큼 (룩 패스 7: 비·눈·커튼·다리 끝) */
    function snapC(v) { /* v 를 아트 픽셀 **중심**에 (1px 점·선용, 룩 패스 7): 타깃 폭이 짝수면 카메라 중심이 픽셀 모서리라 ½ 위상을 더한다 → Points·Line 끝점이 늘 한 픽셀 안에 떨어진다 */
      var pw = S.pw, dx = v.dot(_r), dy = v.dot(_u), hx = (S.rw & 1) ? 0 : 0.5, hy = (S.rh & 1) ? 0 : 0.5;
      return v.addScaledVector(_r, (Math.round(dx / pw - hx) + hx) * pw - dx).addScaledVector(_u, (Math.round(dy / pw - hy) + hy) * pw - dy);
    }
    function snapDelta(d) { /* 변위 벡터를 카메라 우/상 축 정수 픽셀로 양자화 (등불 흔들림: 몸체가 정수 px 만 움직인다) */
      var pw = S.pw, dx = Math.round(d.dot(_r) / pw) * pw, dy = Math.round(d.dot(_u) / pw) * pw;
      return d.set(0, 0, 0).addScaledVector(_r, dx).addScaledVector(_u, dy);
    }
    function resize() {
      var W = container.clientWidth || 320, H = container.clientHeight || 240, p = Math.max(st.look.pixelSize | 0 || 3, Math.ceil(W / 480));
      var rw = Math.max(8, Math.floor(W / p)), rh = Math.max(8, Math.floor(H / p));
      S.W = W; S.H = H; S.p = p; S.rw = rw; S.rh = rh; S.cw = rw * p; S.ch = rh * p; S.offX = Math.floor((W - S.cw) / 2); S.offY = Math.floor((H - S.ch) / 2);
      S.N = Math.round(PX_PER_M * 3 / p * ZOOM_STEPS[st.zoom]);   /* 픽셀을 줄이면 같은 구도에 디테일만 는다 */
      renderer.setSize(S.cw, S.ch, false); canvas.style.width = S.cw + 'px'; canvas.style.height = S.ch + 'px';
      rt.setSize(rw, rh); rtN.setSize(rw, rh); rtE.setSize(rw, rh); rtB.setSize(rw, rh); post.uniforms.uRes.value.set(rw, rh);
      blurOn = p < 4;
      camera.left = -rw / 2 / S.N; camera.right = rw / 2 / S.N; camera.top = rh / 2 / S.N; camera.bottom = -rh / 2 / S.N; camera.updateProjectionMatrix();
      S.pw = (camera.right - camera.left) / rw;   /* pixelWorldSize = 직교 프러스텀 폭 / 렌더 타깃 폭 (= 1/N: p=3 줌 1 → 1/18 m, p=2 → 1/27, 줌 ×2 → 1/36) */
      placeCamera();
      if (ready) { layoutWeather(false); if (CURT.frame) curtainFrame(1); anim.dustInit = false; }   /* 룩 패스 7: 격자가 바뀌면 비·눈·물방울·커튼·먼지를 새 픽셀 중심에 재스냅 */
    }

    /* ── 장면 · 조명 ── */
    var scene = new T.Scene(); scene.background = C(LIGHTS.night.bg);
    /* 키 = 창 쪽 방향광 (그림자맵 2048, PCF radius 1, bias −0.0002, normalBias 0.025, 그림자 카메라는 applyLight 에서 방(차폐 포함)에 꼭 맞춤) */
    var sun = new T.DirectionalLight(0xffffff, 1); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.025; sun.shadow.radius = 1;
    sun.target.position.set(0, 0.5, 0); scene.add(sun); scene.add(sun.target);
    var hemi = new T.HemisphereLight(0xffffff, 0x000000, 0.3); scene.add(hemi);
    var fill = new T.DirectionalLight(0xffffff, 0); fill.position.set(6, 3, 8); fill.target.position.set(0, 0.5, 0); scene.add(fill); scene.add(fill.target);   /* 필: 카메라 쪽, 그림자 없음 (뒷벽·왼벽·바닥을 살짝 들어 올린다) */
    var lampPos = new T.Vector3(snapPos(-1.6), 1.95, snapPos(-0.9));
    var lamp = new T.PointLight(C('#ffb066').getHex(), 0, 6, 2); lamp.position.set(0, -0.1, 0);   /* 등불 그룹의 자식 (룩 패스 7: 흔들림을 따라간다) — 아래 lampG.add */
    var candleLight = new T.PointLight(C('#ffb066').getHex(), 0, 2, 2); scene.add(candleLight);   /* 양초 = 두 번째 작은 따뜻한 점광 (0.35, d 2) */
    /* 빛 차폐 (룩 패스 4): 보이지 않는 지붕·앞벽·오른벽. 그림자만 던지고(colorWrite 끔) 노멀 패스에서는 숨긴다 → 태양·달이 창으로만 들어와 바닥에 창 모양 빛 조각 */
    var SHADE = [[-3.1, 3.1], [-0.6, 3.25], [-3.1, 3.1]];   /* 그림자 카메라 피팅용 상자 (x · y · z) */
    var shade = new T.Mesh(keep(mergeParts([{ g: box(6.2, 0.05, 6.2), m: M(0, 3.08, 0), c: '#000000' }, { g: box(6.2, 3.7, 0.05), m: M(0, 1.35, 3.05), c: '#000000' }, { g: box(0.05, 3.7, 6.2), m: M(3.05, 1.35, 0), c: '#000000' },
      { g: box(0.05, 3.7, 0.7), m: M(-2.6, 1.35, 2.75), c: '#000000' }])),   /* 왼쪽 벽 앞 날개: 벽 끝(z 2.5)과 앞벽 차폐 사이로 새는 빛을 막는다 */
      keep(new T.MeshBasicMaterial({ colorWrite: false, depthWrite: false })));
    shade.castShadow = true; shade.receiveShadow = false; shade.frustumCulled = false; shade.renderOrder = -10; scene.add(shade);
    var _sm = new T.Matrix4(), _sv = new T.Vector3();
    function fitShadow() { /* 방 상자 8꼭짓점을 빛 공간으로 → 직교 그림자 카메라를 딱 맞춘다 (p=3 에서 아트px 당 ≥ 10 텍셀) */
      _sm.lookAt(sun.position, sun.target.position, _ay).transpose();
      var mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
      for (var i = 0; i < 8; i++) {
        _sv.set(SHADE[0][i & 1], SHADE[1][(i >> 1) & 1], SHADE[2][(i >> 2) & 1]).sub(sun.position).applyMatrix4(_sm);
        var v = [_sv.x, _sv.y, _sv.z]; for (var k = 0; k < 3; k++) { if (v[k] < mn[k]) mn[k] = v[k]; if (v[k] > mx[k]) mx[k] = v[k]; }
      }
      var c = sun.shadow.camera; c.left = mn[0] - 0.1; c.right = mx[0] + 0.1; c.bottom = mn[1] - 0.1; c.top = mx[1] + 0.1; c.near = -mx[2] - 0.1; c.far = -mn[2] + 0.1; c.updateProjectionMatrix();
    }
    var light = { from: null, to: LIGHTS[phaseOf(st.hour)], t: 1, dur: 60, sunI: 0 };
    /* 창 빛 조각 일렁임 (룩 패스 7): 비·가는 비일 때 키 광 세기 ×0.8 / ×1.0 을 ≈0.6 s(시드 지터 0.42~0.78 s)마다 교대 — 유리를 타고 흐르는 물의 그림자. 맑음·눈·모션 감소 = 1.0 고정 */
    var shim = { k: 1, t: 0, dur: 0.6, cyc: 0 };
    function stepShimmer(dt) {
      var raining = (st.weather === 'rain' || st.weather === 'drizzle') && !st.reduced;
      if (!raining) { if (shim.k !== 1) { shim.k = 1; shim.t = 0; sun.intensity = light.sunI; } return; }
      shim.t += dt;
      if (shim.t >= shim.dur) { shim.t = 0; shim.cyc++; shim.k = shim.k < 1 ? 1 : 0.8; shim.dur = 0.6 * (0.7 + 0.6 * (hash('shm' + shim.cyc) % 100) / 100); sun.intensity = light.sunI * shim.k; }
    }
    var tmpA = new T.Color(), tmpB = new T.Color();
    function lerpC(a, b, k) { return tmpA.copy(C(a)).lerp(tmpB.copy(C(b)), k); }
    function keyK() { return st.look.key / LIGHTS.day.sunI; }      /* 데브 슬라이더: 낮 키 세기(기본 2.6)·필 세기(기본 0.32)를 비율로 모든 시각대에 적용 */
    function fillK() { return st.look.fill / LIGHTS.day.hemiI; }
    function applyLight() {
      var a = light.from || light.to, b = light.to, k = light.t;
      var e = k * (2 - k);
      function num(key) { return a[key] + (b[key] - a[key]) * e; }
      sun.color.copy(lerpC(a.sun, b.sun, e)); light.sunI = num('sunI') * keyK(); sun.intensity = light.sunI * shim.k;   /* × 창 빛 조각 2단 일렁임 (룩 패스 7, 비 올 때만) */
      var elev = num('elev') * DEG, az = num('az') * DEG;
      sun.position.set(-10 * Math.cos(elev) * Math.cos(az), 10 * Math.sin(elev) + 0.5, 10 * Math.cos(elev) * Math.sin(az));
      fitShadow();
      hemi.color.copy(lerpC(a.sky, b.sky, e)); hemi.groundColor.copy(lerpC(a.gnd, b.gnd, e)); hemi.intensity = num('hemiI') * fillK();
      fill.color.copy(lerpC(a.fill, b.fill, e)); fill.intensity = num('fillI') * fillK();
      glass.material.color.copy(lerpC(a.out, b.out, e));
      winEm.material.color.copy(lerpC(a.winEm, b.winEm, e));
      scene.background.copy(lerpC(a.bg, b.bg, e));
      light.lamp = num('lamp'); light.lampD = num('lampD'); light.glow = num('glow'); light.pool = num('pool'); light.candle = num('candle'); light.em = num('em');
      lampDirty = true;
    }
    function setTime(h, instant) {
      st.hour = h; var ph = LIGHTS[phaseOf(h)];
      if (ph === light.to && !instant) return;
      if (instant || !ready) { light.from = null; light.to = ph; light.t = 1; }
      else if (ph !== light.to) { light.from = snapshotLight(); light.to = ph; light.t = 0; }
      applyLight(); updateStars();
    }
    function snapshotLight() { /* 전환 중 다시 바뀌면 현재 보간값에서 출발 */
      var a = light.from || light.to, b = light.to, k = light.t * (2 - light.t), o = {};
      Object.keys(b).forEach(function (key) { o[key] = typeof b[key] === 'number' ? a[key] + (b[key] - a[key]) * k : mixHex(a[key], b[key], k); });
      return o;
    }
    function isNight() { return phaseOf(st.hour) === 'night'; }

    /* ── 재질 ── */
    /* 방·소품 재질: r128 Lambert 는 직접광 합을 정점에서 계산하고 그림자 마스크 하나를 곱한다 → 닫힌 방(지붕 차폐)에선 태양 그림자가 필·등불·양초까지 지워 버린다. Phong(광택 0 = 같은 난반사)은 프래그먼트별·광원별 그림자라 등불 웅덩이·필이 그림자 안에서도 산다 (룩 패스 4) */
    var lambert = keep(new T.MeshPhongMaterial({ vertexColors: true, shininess: 0, specular: 0x000000 }));
    var toon = keep(new T.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: keep(gradientTex()) }));
    var rtex = keep(radialTex());
    var decalMat = keep(new T.MeshBasicMaterial({ map: rtex, color: C('#1b1522'), transparent: true, opacity: 0.42, depthWrite: false }));
    var glowMat = keep(new T.MeshBasicMaterial({ map: rtex, color: C(PAL.amber[3]), transparent: true, opacity: 0.55, depthWrite: false }));
    function basic(hex) { return keep(new T.MeshBasicMaterial({ color: C(hex) })); }
    var basicV = keep(new T.MeshBasicMaterial({ vertexColors: true }));
    /* 발광 쌍둥이 (룩 패스 6): 같은 지오메트리를 레이어 1 에만 두는 자식 메시 — 뷰티 카메라(레이어 0)엔 안 보이고 발광 패스에만 그려진다. depthWrite 끔 (뷰티 깊이를 공유, 같은 깊이라 LEQUAL 통과) */
    function emTwin(parent, geo) { var m = new T.Mesh(geo, keep(new T.MeshBasicMaterial({ color: 0xffffff, depthWrite: false }))); m.layers.set(1); m.castShadow = false; parent.add(m); return m; }
    function snapXZ(o) { o.position.x = snapPos(o.position.x); o.position.z = snapPos(o.position.z); return o; }   /* 소품: 바닥 격자(x·z)만 스냅, y 는 올려놓은 면에 맞춘다 */

    /* ── 다락방 정적 기하 (룩 패스 2: 밀도·구성) ──
       room   = 그림자 던짐·받음 (바닥·벽·받침·배경 잡동사니) → 드로우콜 1
       roomHi = 머리 위 목재(서까래·도리·끈·도르래·거미줄). castShadow 끔 → 들보 그림자가 바닥에 긴 띠로 깔리던 패스 1 의 "어두운 띠" 제거 → 드로우콜 1 */
    var W = PAL.wood, parts = [], hiParts = [], propCount = 0;
    var WIN = { z0: -0.3, z1: 1.1, y0: 1.0, y1: 2.3 }, DOOR = { x0: 1.5, x1: 2.4, h: 2.1 };
    function segM(a, b) { /* a→b 를 잇는 y축 원기둥용 행렬 */
      var va = new T.Vector3(a[0], a[1], a[2]), vb = new T.Vector3(b[0], b[1], b[2]), d = vb.clone().sub(va);
      var q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.clone().normalize());
      return new T.Matrix4().compose(va.add(vb).multiplyScalar(0.5), q, new T.Vector3(1, 1, 1));
    }
    function seg(list, a, b, r, hex, sides) { list.push({ g: new T.CylinderGeometry(r, r, Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), sides || 4), m: segM(a, b), c: hex }); }
    /* 바닥: 밑판(이음 색 W2) 위에 널 23줄 — 피치 0.217 m, 널 0.127 + 이음 0.09(≈ 1 아트픽셀), 길이 1.0~2.4 m 로 엇갈림, 2색(W3/W4) 교대. 널 윗면 y=0.004 */
    var FLOOR_SEAM = 0.09, FLOOR_PITCH = 2 * R / 23;
    parts.push({ g: box(2 * R, 0.1, 2 * R), m: M(0, -0.05, 0), c: MAT.floorSeam });
    for (var i = 0; i < 23; i++) {
      var fx = -R + FLOOR_PITCH * (i + 0.5), fz = -R, k = 0;
      while (fz < R) {
        var len = 1.0 + (hash('fl' + i + '_' + k) % 100) / 100 * 1.4, last = fz + len > R - 0.5;
        if (last) len = R - fz;
        parts.push({ g: box(FLOOR_PITCH - FLOOR_SEAM, 0.02, last ? len : len - FLOOR_SEAM), m: M(fx, -0.006, fz + (last ? len : len - FLOOR_SEAM) / 2), c: (i + k) % 2 ? MAT.floorA : MAT.floorB });
        fz += len; k++;
      }
    }
    [[0.62, 0.9], [-1.48, -1.62], [1.72, 1.58]].forEach(function (p) { parts.push({ g: box(0.09, 0.012, 0.09), m: M(snapPos(p[0]), 0.0, snapPos(p[1])), c: MAT.knot }); propCount++; });   /* 옹이·못 3 (1px 점, 격자 스냅) */
    /* 디오라마 받침 (룩 패스 5: 치수를 아트 픽셀 배수로 — 돌출 4px(0.222 m) · 위 지층 4px + 1px 줄 + 아래 지층 4px = 9px = 0.5 m. 줄은 0.01 만 돌출해 깊이로 앞에 오되 외곽선(6 cm) 은 안 생긴다) */
    var SLAB_OV = 4 * PX, SLAB_W = 2 * R + 2 * SLAB_OV;
    parts.push({ g: box(SLAB_W, 4 * PX, SLAB_W), m: M(0, -2 * PX, 0), c: MAT.slabTop });
    parts.push({ g: box(SLAB_W + 0.02, PX, SLAB_W + 0.02), m: M(0, -4.5 * PX, 0), c: MAT.slabLine });
    parts.push({ g: box(SLAB_W, 4 * PX, SLAB_W), m: M(0, -7 * PX, 0), c: MAT.slabBase });
    /* 벽 2면: 가로 널 10줄 0.3 m (창·문 구멍) + 줄 사이 1px 이음(W2, 0.08 m 높이) + 세로 샛기둥 3개씩 */
    for (i = 0; i < 10; i++) {
      var y = 0.15 + i * 0.3, cwall = i % 2 ? MAT.wallA : MAT.wallB, cback = i % 2 ? MAT.wallB : MAT.wallA;
      if (y + 0.15 > WIN.y0 && y - 0.15 < WIN.y1) {
        parts.push({ g: box(0.12, 0.3, WIN.z0 + R, 1, 1, 4), m: M(-R, y, (-R + WIN.z0) / 2), c: cwall });
        parts.push({ g: box(0.12, 0.3, R - WIN.z1, 1, 1, 3), m: M(-R, y, (WIN.z1 + R) / 2), c: cwall });
      } else parts.push({ g: box(0.12, 0.3, 2 * R, 1, 1, 8), m: M(-R, y, 0), c: cwall });
      if (y - 0.15 < DOOR.h) {
        parts.push({ g: box(DOOR.x0 + R, 0.3, 0.12, 7, 1, 1), m: M((-R + DOOR.x0) / 2, y, -R), c: cback });
        parts.push({ g: box(R - DOOR.x1, 0.3, 0.12, 1, 1, 1), m: M((DOOR.x1 + R) / 2, y, -R), c: cback });
      } else parts.push({ g: box(2 * R, 0.3, 0.12, 8, 1, 1), m: M(0, y, -R), c: cback });
      if (i === 0) continue;
      var yb = i * 0.3;   /* 줄 경계 이음 */
      if (yb > WIN.y0 && yb < WIN.y1) {
        parts.push({ g: box(0.02, 0.08, WIN.z0 + R), m: M(-R + 0.065, yb, (-R + WIN.z0) / 2), c: MAT.wallSeam });
        parts.push({ g: box(0.02, 0.08, R - WIN.z1), m: M(-R + 0.065, yb, (WIN.z1 + R) / 2), c: MAT.wallSeam });
      } else parts.push({ g: box(0.02, 0.08, 2 * R), m: M(-R + 0.065, yb, 0), c: MAT.wallSeam });
      if (yb < DOOR.h) {
        parts.push({ g: box(DOOR.x0 + R, 0.08, 0.02), m: M((-R + DOOR.x0) / 2, yb, -R + 0.065), c: MAT.wallSeam });
        parts.push({ g: box(R - DOOR.x1, 0.08, 0.02), m: M((DOOR.x1 + R) / 2, yb, -R + 0.065), c: MAT.wallSeam });
      } else parts.push({ g: box(2 * R, 0.08, 0.02), m: M(0, yb, -R + 0.065), c: MAT.wallSeam });
    }
    [-1.9, -1.1, 1.85].forEach(function (z) { parts.push({ g: box(0.14, 3.0, 0.14), m: M(-R + 0.09, 1.5, z), c: MAT.stud }); propCount++; });   /* 왼쪽 벽 샛기둥 (벽면에서 0.1 돌출) */
    [-1.9, -0.9, 1.12].forEach(function (x) { parts.push({ g: box(0.14, 3.0, 0.14), m: M(x, 1.5, -R + 0.09), c: MAT.stud }); propCount++; });   /* 뒷벽 샛기둥 */
    parts.push({ g: box(0.2, 3.1, 0.2), m: M(-R, 1.55, -R), c: W[1] });                                                                             /* 모서리 기둥 */
    /* 지붕: 서까래 5 (x 방향, 5.7° 경사 y = 3.75 + 0.2x; 먼 쪽 3개는 통짜, 가까운 2개는 잘라낸 단면) + 도리 2 (z 방향, x=-2.1 / -1.6 = 옛 들보). 카메라 가까운 머리 위 목재는 창·보드를 가리므로 먼 모서리에만 둔다 */
    var RAFTER_K = 0.2, RAFTER_Y = 3.75;
    function rafter(z, x0, x1) {
      var xc = (x0 + x1) / 2, L = (x1 - x0) * Math.sqrt(1 + RAFTER_K * RAFTER_K);
      hiParts.push({ g: box(L, 0.2, 0.24), m: M(xc, RAFTER_Y + RAFTER_K * xc, z, 0, 0, Math.atan(RAFTER_K)), c: W[2] }); propCount++;
    }
    rafter(-2.3, -2.8, 2.8); rafter(-1.75, -2.8, 2.8); rafter(-1.2, -2.8, 2.8); rafter(-0.65, -2.8, -0.6); rafter(-0.1, -2.8, -1.3);
    hiParts.push({ g: box(0.26, 0.26, 5.6), m: M(-2.1, 3.31, 0), c: W[1] }); propCount++;
    hiParts.push({ g: box(0.26, 0.26, 5.6), m: M(-1.6, 3.36, 0), c: W[1] }); propCount++;
    /* 창: 턱·틀·살 */
    parts.push({ g: box(0.5, 0.08, WIN.z1 - WIN.z0 + 0.5), m: M(-R + 0.22, WIN.y0, (WIN.z0 + WIN.z1) / 2), c: W[2] });                                 /* 창턱 */
    [[WIN.y0 - 0.05, 0], [WIN.y1 + 0.05, 0]].forEach(function (f) { parts.push({ g: box(0.1, 0.1, WIN.z1 - WIN.z0 + 0.2), m: M(-R + 0.1, f[0], (WIN.z0 + WIN.z1) / 2), c: W[1] }); });
    [WIN.z0 - 0.05, WIN.z1 + 0.05, (WIN.z0 + WIN.z1) / 2].forEach(function (z) { parts.push({ g: box(0.1, WIN.y1 - WIN.y0 + 0.2, 0.1), m: M(-R + 0.1, (WIN.y0 + WIN.y1) / 2, z), c: W[1] }); });
    parts.push({ g: box(0.1, 0.1, WIN.z1 - WIN.z0), m: M(-R + 0.1, (WIN.y0 + WIN.y1) / 2, (WIN.z0 + WIN.z1) / 2), c: W[1] });                            /* 가로 살 */
    [DOOR.x0 - 0.06, DOOR.x1 + 0.06].forEach(function (x) { parts.push({ g: box(0.14, DOOR.h + 0.1, 0.16), m: M(x, (DOOR.h + 0.1) / 2, -R + 0.1), c: W[1] }); });   /* 문틀 */
    parts.push({ g: box(DOOR.x1 - DOOR.x0 + 0.26, 0.14, 0.16), m: M((DOOR.x0 + DOOR.x1) / 2, DOOR.h + 0.07, -R + 0.1), c: W[1] });
    /* 등불 끈은 룩 패스 7 부터 등불 그룹의 자식(lampRope) — 흔들림에 따라 기운다 */
    /* 밧줄·도르래: x=-1.6 도리 아래 z=-1.9 — 끈 0.6, 바퀴 r 0.11, 양쪽으로 늘어진 밧줄 + 갈고리 + 매듭 */
    seg(hiParts, [-1.6, 3.25, -1.9], [-1.6, 2.6, -1.9], 0.045, PAL.paper[0], 5);
    hiParts.push({ g: new T.CylinderGeometry(0.11, 0.11, 0.08, 8), m: M(-1.6, 2.55, -1.9, 0, 0, Math.PI / 2), c: W[2] });
    seg(hiParts, [-1.6, 2.55, -2.01], [-1.6, 1.95, -2.01], 0.045, PAL.paper[0], 5);
    seg(hiParts, [-1.6, 2.55, -1.79], [-1.6, 2.2, -1.79], 0.045, PAL.paper[0], 5);
    hiParts.push({ g: box(0.1, 0.1, 0.1), m: M(-1.6, 1.9, -2.01), c: PAL.slate[1] });
    hiParts.push({ g: new T.SphereGeometry(0.065, 6, 5), m: M(-1.6, 2.17, -1.79), c: PAL.paper[0] });
    propCount++;
    /* 거미줄: 먼 모서리 y 1.08~1.58, 가는 실 5 (r 0.03 → 끊어진 1px 선) */
    (function () {
      var Cc = [-2.42, 1.58, -2.42], A = [-2.42, 1.08, -1.9], B = [-1.9, 1.08, -2.42], mid = [(A[0] + B[0]) / 2, 1.08, (A[2] + B[2]) / 2];
      [[Cc, A], [Cc, B], [A, B], [Cc, mid], [[(Cc[0] + A[0]) / 2, 1.33, (Cc[2] + A[2]) / 2], [(Cc[0] + B[0]) / 2, 1.33, (Cc[2] + B[2]) / 2]]].forEach(function (e) { seg(hiParts, e[0], e[1], 0.03, PAL.slate[4], 4); });
      propCount++;
    })();
    /* 왼쪽 벽 선반 (y 1.9, z -2.4~-1.4) + 잡동사니: 책 4 · 병 2 · 술병 · 컵 */
    (function () {
      var sy = 1.9, sx = -R + 0.06 + 0.15;
      parts.push({ g: box(0.3, 0.06, 1.0), m: M(sx, sy, -1.9), c: W[2] });
      [-2.35, -1.45].forEach(function (z) { parts.push({ g: box(0.26, 0.26, 0.08), m: M(sx - 0.02, sy - 0.16, z), c: W[1] }); });
      propCount++;
      var top = sy + 0.03, bz = -2.36, th = [0.11, 0.09, 0.13, 0.1], hh = [0.24, 0.2, 0.27, 0.22], bc = [PAL.rose[1], PAL.navy[3], PAL.amber[1], PAL.moss[2]];
      for (var b = 0; b < 4; b++) { parts.push({ g: box(0.2, hh[b], th[b]), m: M(sx + 0.01, top + hh[b] / 2, bz + th[b] / 2), c: bc[b] }); bz += th[b] + 0.01; propCount++; }
      [-1.78, -1.62].forEach(function (z) {
        parts.push({ g: new T.CylinderGeometry(0.07, 0.07, 0.2, 7), m: M(sx, top + 0.1, z), c: PAL.glass[2] });
        parts.push({ g: new T.CylinderGeometry(0.075, 0.075, 0.04, 7), m: M(sx, top + 0.22, z), c: W[1] }); propCount++;
      });
      parts.push({ g: new T.CylinderGeometry(0.055, 0.055, 0.26, 6), m: M(sx, top + 0.13, -1.5), c: PAL.moss[1] });
      parts.push({ g: new T.CylinderGeometry(0.045, 0.045, 0.1, 6), m: M(sx, top + 0.31, -1.5), c: PAL.moss[1] }); propCount++;
      parts.push({ g: new T.CylinderGeometry(0.06, 0.05, 0.1, 6), m: M(sx + 0.02, top + 0.05, -1.4), c: PAL.paper[2] }); propCount++;
    })();
    /* 갈고리 2: 왼쪽 벽 샛기둥(z=-1.1)의 외투 · 뒷벽 샛기둥(x=1.22)의 목도리 */
    parts.push({ g: box(0.09, 0.14, 0.09), m: M(-R + 0.16 + 0.045, 2.34, -1.1), c: PAL.slate[1] });
    parts.push({ g: box(0.12, 0.8, 0.4), m: M(-R + 0.16 + 0.06, 1.88, -1.1), c: PAL.moss[1] });
    parts.push({ g: box(0.13, 0.1, 0.42), m: M(-R + 0.16 + 0.065, 2.24, -1.1), c: PAL.moss[2] }); propCount += 2;
    parts.push({ g: box(0.09, 0.14, 0.09), m: M(1.12, 2.05, -R + 0.16 + 0.045), c: PAL.slate[1] });
    parts.push({ g: box(0.12, 0.62, 0.1), m: M(1.06, 1.68, -R + 0.16 + 0.05), c: PAL.rose[1] });
    parts.push({ g: box(0.12, 0.5, 0.1), m: M(1.18, 1.74, -R + 0.16 + 0.05), c: PAL.rose[1] });
    [1.52, 1.42].forEach(function (y) { parts.push({ g: box(0.12, 0.07, 0.11), m: M(1.06, y, -R + 0.16 + 0.05), c: PAL.paper[2] }); }); propCount += 2;
    /* 시계: 뒷벽 샛기둥(x 1.12)에 걸림 (1.25, 2.58), 기둥 앞으로 돌출 — 테 W1 r 0.2 · 면 종이 · 바늘 2(잉크, 1px) */
    parts.push({ g: new T.CylinderGeometry(0.2, 0.2, 0.05, 10), m: M(1.25, 2.58, -R + 0.16 + 0.025, Math.PI / 2, 0, 0), c: W[1] });
    parts.push({ g: new T.CylinderGeometry(0.16, 0.16, 0.06, 10), m: M(1.25, 2.58, -R + 0.16 + 0.03, Math.PI / 2, 0, 0), c: PAL.paper[2] });
    parts.push({ g: box(0.06, 0.14, 0.02), m: M(1.25, 2.65, -R + 0.16 + 0.07), c: PAL.ink });
    parts.push({ g: box(0.11, 0.06, 0.02), m: M(1.3, 2.58, -R + 0.16 + 0.07), c: PAL.ink }); propCount++;
    /* 다락 뚜껑(해치) 윤곽: 문 위 x 1.62~2.28, y 2.26~2.89 + 고리 */
    [[1.95, 2.3, 0.66, 0.08], [1.95, 2.85, 0.66, 0.08], [1.62, 2.575, 0.08, 0.55], [2.28, 2.575, 0.08, 0.55]].forEach(function (h) { parts.push({ g: box(h[2], h[3], 0.06), m: M(h[0], h[1], -R + 0.06 + 0.03), c: W[1] }); });
    parts.push({ g: box(0.09, 0.09, 0.07), m: M(1.95, 2.42, -R + 0.06 + 0.035), c: PAL.slate[1] }); propCount++;
    /* 둘둘 만 지도: 뒷벽 샛기둥 옆에 기대 세움 (종이 원기둥 r 0.065 + 띠 2) */
    (function () { var a = [1.3, 0.065, -2.0], b = [1.32, 1.05, -2.33]; seg(parts, a, b, 0.065, PAL.paper[1], 6);
      [0.3, 0.7].forEach(function (t) { parts.push({ g: new T.CylinderGeometry(0.075, 0.075, 0.07, 6), m: segM([a[0] + (b[0] - a[0]) * (t - 0.03), a[1] + (b[1] - a[1]) * (t - 0.03), a[2] + (b[2] - a[2]) * (t - 0.03)], [a[0] + (b[0] - a[0]) * (t + 0.03), a[1] + (b[1] - a[1]) * (t + 0.03), a[2] + (b[2] - a[2]) * (t + 0.03)]), c: PAL.rose[2] }); });
      propCount++; })();
    /* 상자 더미 3: 먼 모서리 (0.46 정육면체 W6 + 띠 W3 — 해가 안 드는 모서리라 가장 밝은 나무색) */
    [[-2.26, 0.23, -2.26], [-2.26, 0.23, -1.78], [-2.26, 0.69, -2.02]].forEach(function (c) {
      var cx = snapPos(c[0]), cz = snapPos(c[2]);
      parts.push({ g: box(0.46, 0.46, 0.46), m: M(cx, c[1], cz), c: W[6] });
      parts.push({ g: box(0.48, 0.07, 0.48), m: M(cx, c[1], cz), c: W[3] });
      parts.push({ g: box(0.07, 0.48, 0.48), m: M(cx, c[1], cz), c: W[3] }); propCount++;
    });
    /* 짜임 깔개 2.3×1.7 (담요 자리 아래, 윗면 y 0.008 < 데칼 0.01): 테 navy3 · 줄무늬 glass1/2 (0.18 m, 그늘에서도 읽히게 밝은 쪽) · 술 paper0 */
    (function () {
      var RUG = { x: snapPos(-1.0), z: snapPos(1.55), w: 2.3, d: 1.7, h: 0.016 }, bw = 0.14;
      [-1, 1].forEach(function (s) { parts.push({ g: box(RUG.w, RUG.h, bw), m: M(RUG.x, 0, RUG.z + s * (RUG.d / 2 - bw / 2)), c: MAT.rugEdge }); parts.push({ g: box(bw, RUG.h, RUG.d - 2 * bw), m: M(RUG.x + s * (RUG.w / 2 - bw / 2), 0, RUG.z), c: MAT.rugEdge }); });
      var n = 8, sw = (RUG.d - 2 * bw) / n;
      for (var j = 0; j < n; j++) parts.push({ g: box(RUG.w - 2 * bw, RUG.h, sw), m: M(RUG.x, 0, RUG.z - RUG.d / 2 + bw + sw * (j + 0.5)), c: j % 2 ? MAT.rugB : MAT.rugA });
      for (j = 0; j < 8; j++) [-1, 1].forEach(function (s) { parts.push({ g: box(0.1, 0.012, 0.09), m: M(RUG.x + s * (RUG.w / 2 + 0.06), 0, RUG.z - RUG.d / 2 + 0.12 + j * 0.21), c: PAL.paper[0] }); });
      propCount++;
    })();
    /* 화분(항상): 창 아래 바닥 (-2.2, 0, 1.4) — 화분 W4 + 흙 + 줄기 + 잎 3 + 끝잎. 이끼 화분(§4 moss)은 등불 1 부터 창턱에 */
    (function () {
      var px = snapPos(-2.2), pz = snapPos(1.4);
      parts.push({ g: new T.CylinderGeometry(0.14, 0.11, 0.26, 7), m: M(px, 0.13, pz), c: W[4] });
      parts.push({ g: new T.CylinderGeometry(0.12, 0.12, 0.04, 7), m: M(px, 0.27, pz), c: W[0] });
      parts.push({ g: new T.CylinderGeometry(0.045, 0.045, 0.55, 5), m: M(px, 0.53, pz), c: PAL.moss[1] });
      parts.push({ g: new T.SphereGeometry(0.17, 7, 5), m: M(px + 0.12, 0.5, pz + 0.04, 0, 0.3, 0.5, 1, 0.45, 0.7), c: PAL.moss[2] });
      parts.push({ g: new T.SphereGeometry(0.17, 7, 5), m: M(px - 0.1, 0.62, pz - 0.06, 0.2, -0.4, -0.5, 1, 0.45, 0.7), c: PAL.moss[1] });
      parts.push({ g: new T.SphereGeometry(0.16, 7, 5), m: M(px + 0.02, 0.74, pz + 0.1, -0.5, 0, 0.1, 1, 0.45, 0.7), c: PAL.moss[3] });
      parts.push({ g: new T.SphereGeometry(0.11, 6, 5), m: M(px, 0.86, pz, 0, 0, 0, 1, 0.7, 1), c: PAL.moss[2] });
      propCount++;
    })();
    var room = new T.Mesh(keep(mergeParts(parts)), lambert); room.receiveShadow = true; room.castShadow = true; scene.add(room);
    var roomHi = new T.Mesh(keep(mergeParts(hiParts)), lambert); roomHi.castShadow = false; roomHi.receiveShadow = false; scene.add(roomHi);
    var doorDark = new T.Mesh(keep(new T.PlaneGeometry(DOOR.x1 - DOOR.x0, DOOR.h)), keep(new T.MeshBasicMaterial({ color: C(PAL.ink) })));
    doorDark.position.set((DOOR.x0 + DOOR.x1) / 2, DOOR.h / 2, -R + 0.02); scene.add(doorDark);
    var glass = new T.Mesh(keep(new T.PlaneGeometry(WIN.z1 - WIN.z0, WIN.y1 - WIN.y0)), keep(new T.MeshBasicMaterial({ color: C('#141c33') })));
    glass.position.set(-R + 0.01, (WIN.y0 + WIN.y1) / 2, (WIN.z0 + WIN.z1) / 2); glass.rotation.y = Math.PI / 2; glass.userData.kind = 'window'; scene.add(glass);
    var winEm = emTwin(glass, glass.geometry);   /* 창 유리 발광 (시각대 winEm: 낮 하늘 밝게 · 밤 희미한 차가운 색) */
    /* 등불 */
    var lampG = new T.Group(); lampG.position.copy(lampPos); scene.add(lampG); lampG.add(lamp);
    var lampBody = new T.Mesh(keep(mergeParts([{ g: box(0.34, 0.08, 0.34), m: M(0, 0.24, 0), c: W[0] }, { g: box(0.3, 0.06, 0.3), m: M(0, -0.24, 0), c: W[0] }, { g: box(0.05, 0.4, 0.05), m: M(0.14, 0, 0.14), c: W[0] }, { g: box(0.05, 0.4, 0.05), m: M(-0.14, 0, -0.14), c: W[0] }])), lambert);
    lampBody.castShadow = true; lampBody.receiveShadow = true; lampG.add(lampBody);
    /* 끈 (룩 패스 7): 등불 그룹의 자식, 그림자 안 던짐(패스 2 의 "끈 그림자 띠" 방지). 그룹 원점 = 등불 몸체라 그룹이 기울면 끈 윗끝이 도리(y 3.23) 쪽으로 되돌아가 — 위는 고정, 아래가 흔들리는 "살짝 휘는 끈" 으로 보인다 */
    var lampRope = new T.Mesh(keep(mergeParts([{ g: new T.CylinderGeometry(0.03, 0.03, 1.1, 5), m: M(0, 0.28 + 0.55, 0), c: W[0] }])), lambert); lampRope.castShadow = false; lampRope.receiveShadow = false; lampG.add(lampRope);
    /* 진자 흔들림 (룩 패스 7): ±3° · 0.35 Hz · 시드 위상, 축 = 기본 시점의 화면 가로(월드 대각 (1,0,−1)/√2). 변위 L·sinθ 를 화면 정수 px 로 양자화(snapDelta)하고 그 변위에 맞는 각도만 몸체에 준다 → p=3 에서 몸체가 −1/0/+1 px 로 스텝, 끈 아래가 1px 기운다. 점광·글로우·발광은 자식이라 따라오고 웅덩이·먼지는 lampAt 으로 */
    var SWAY = { amp: 3 * DEG, hz: 0.35, L: 3.23 - lampPos.y, ph: (hash('sway') % 1000) / 1000 * Math.PI * 2, dir: new T.Vector3(Math.SQRT1_2, 0, -Math.SQRT1_2), axis: new T.Vector3(-Math.SQRT1_2, 0, -Math.SQRT1_2) };
    var lampAt = lampPos.clone(), _sd = new T.Vector3(), swayPx = 0;
    function stepSway() {
      var th = st.reduced ? 0 : SWAY.amp * Math.sin(Math.PI * 2 * SWAY.hz * time + SWAY.ph);
      _sd.copy(SWAY.dir).multiplyScalar(SWAY.L * Math.sin(th)); snapDelta(_sd);
      var s = _sd.dot(SWAY.dir), q = Math.asin(clamp(s / SWAY.L, -1, 1)); swayPx = Math.round(s / S.pw);
      lampAt.copy(lampPos).add(_sd); lampG.position.copy(lampAt); lampG.quaternion.setFromAxisAngle(SWAY.axis, q);
      lampPool.position.set(lampAt.x, 0.015, lampAt.z);
    }
    /* 유리(tag 1, 4×6 px) + 심지 띠(tag 2: 0.16 m ≈ 3px 높이, 면보다 1 cm 돌출해 유리 면 위에 밝은 가로 띠로 보인다) — 켜지면 호박 2 / 호박 5(거의 흰 노랑), 꺼지면 회색 1/2. 밤에 몸체(갈색 0)가 검게 가라앉아도 이 심지 + 블룸 때문에 "등불" 로 읽힌다 (룩 패스 6) */
    var lampGlassGeo = keep(mergeParts([{ g: box(0.24, 0.36, 0.24), m: M(0, 0, 0), c: PAL.amber[2], tag: 1 }, { g: box(0.26, 0.16, 0.26), m: M(0, -0.02, 0), c: PAL.amber[5], tag: 2 }]));
    var lampGlass = new T.Mesh(lampGlassGeo, basicV); lampG.add(lampGlass);
    var lampEm = emTwin(lampGlass, lampGlassGeo);   /* 등불 발광 쌍둥이: EM.lamp × em × (0.4+0.6·n/8) */
    var lampGlow = new T.Mesh(keep(new T.PlaneGeometry(1.1, 1.1)), glowMat); lampGlow.renderOrder = 5; lampG.add(lampGlow);
    var lampPool = new T.Mesh(keep(new T.PlaneGeometry(2.6, 2.6)), keep(new T.MeshBasicMaterial({ map: rtex, color: C(PAL.amber[2]), transparent: true, opacity: 0.28, depthWrite: false })));
    lampPool.rotation.x = -Math.PI / 2; lampPool.position.set(lampPos.x, 0.015, lampPos.z); lampPool.renderOrder = 2; scene.add(lampPool);
    var lampDirty = true;
    function glowOpacity() { return (light.glow || 0.7) * (0.43 + 0.57 * st.lantern / 8); }   /* 8칸에서 시각대의 glow (낮 0.4 · 밤 0.7) */
    function applyLamp() {
      var n = st.lantern, k = n > 0 ? 0.4 + 0.6 * n / 8 : 0, on = n > 0;
      lamp.intensity = (light.lamp || 1.2) * k; lamp.distance = light.lampD || 6;
      recolor(lampGlassGeo, 1, on ? PAL.amber[2] : PAL.slate[1]); recolor(lampGlassGeo, 2, on ? PAL.amber[5] : PAL.slate[2]);
      lampEm.visible = on; lampEm.material.color.copy(C(EM.lamp)).multiplyScalar((light.em || 1) * k);
      lampGlow.visible = on; lampGlow.material.opacity = glowOpacity(); lampGlow.scale.setScalar(0.7 + 0.06 * n);
      lampPool.visible = on; lampPool.material.opacity = (0.12 + 0.03 * n) * (light.pool || 1); lampPool.scale.setScalar((light.lampD || 6) / 6);
      dust.visible = on && !st.reduced;
      lampDirty = false;
    }

    /* ── 창밖 날씨 ── */
    function points(n, hex, size) {
      var g = keep(new T.BufferGeometry()), arr = new Float32Array(n * 3);
      g.setAttribute('position', new T.BufferAttribute(arr, 3));
      var p = new T.Points(g, keep(new T.PointsMaterial({ color: C(hex), size: size || 1, sizeAttenuation: false })));
      p.frustumCulled = false; p.castShadow = false; scene.add(p); return p;
    }
    function lines(n, hex) { /* 1px 선분 n개 (LineSegments 1 드로우콜) */
      var g = keep(new T.BufferGeometry()); g.setAttribute('position', new T.BufferAttribute(new Float32Array(n * 6), 3));
      var l = new T.LineSegments(g, keep(new T.LineBasicMaterial({ color: C(hex) }))); l.frustumCulled = false; l.castShadow = false; scene.add(l); return l;
    }
    var stars = points(14, PAL.white);
    (function () { var a = stars.geometry.attributes.position.array; for (var i = 0; i < 14; i++) { var r = hash('star' + i); a[i * 3] = -R + 0.04; a[i * 3 + 1] = WIN.y0 + 0.2 + ((r >> 8) % 100) / 100 * (WIN.y1 - WIN.y0 - 0.3); a[i * 3 + 2] = WIN.z0 + 0.1 + (r % 100) / 100 * (WIN.z1 - WIN.z0 - 0.2); } stars.geometry.attributes.position.needsUpdate = true; })();
    /* ── 비·눈·유리 물방울·먼지 (룩 패스 7: 손그림 픽셀 애니처럼 12 fps 스텝, 모든 점·선 끝은 아트 픽셀 중심(snapC), 낙하는 스텝당 정수 px) ──
       비 = 창 구멍 안 1px 세로 줄기 2층: 먼 층(x −R+0.06, 22줄, 3~4px, 2px/스텝 = 24px/s) / 가까운 층(x −R+0.09, 18줄, 5~6px, 4px/스텝 = 48px/s), 층마다 LineSegments 1 드로우콜. 가는 비 = 줄 수 절반, 맑음 = 없음.
       줄기 상태 = 열 z(월드) + 행 m(맨 아래 픽셀, 창 위 모서리 기준 정수) + 길이 — 매 스텝 (x, y1, z) 를 픽셀 중심에 스냅한 점 P 에서 세로로 m·k 내려 그린다(k = 세로 1px). 창턱 아래·틀 위로는 행을 잘라 유리 안에만.
       유리 물방울 = Points 3 (비 3 · 가는 비 2): 스텝의 40 % 에서만 1px 내려가고(≈ 5px/s 불규칙), 바닥에 닿으면 1~5 s 쉬었다가 새 열에서. 눈 = Points 24: 2스텝에 1px 낙하 + 가끔 ±1 px 옆으로.
       먼지 = Points 24, 10 fps 스텝: 등불 원뿔 안에서 회전·상하 → 월드 좌표를 픽셀 중심에 스냅해 버퍼에 쓴다(반 픽셀 없음). 모션 감소면 비·눈·물방울은 정지(보이기만), 먼지는 숨김 */
    var RAIN = [{ n: 22, x: -R + 0.06, speed: 2, lens: [3, 4], obj: lines(22, PAL.glass[1]) }, { n: 18, x: -R + 0.09, speed: 4, lens: [5, 6], obj: lines(18, PAL.glass[3]) }];
    var drops = points(3, PAL.glass[3]), snow = points(24, PAL.paper[3]), dust = points(24, PAL.amber[3]);
    var DROP = { x: -R + 0.11, n: 3, z: [], m: [], wait: [], cyc: [] }, SNOW = { x: -R + 0.07, n: 24, z: [], m: [], col: [], cyc: [] }, DUST = [];
    for (i = 0; i < 24; i++) { var dr = hash('dust' + i); DUST.push({ ang: (dr % 360) * DEG, rad: 0.3 + ((dr >> 9) % 100) / 100 * 0.6, h: -0.6 + ((dr >> 17) % 100) / 100 * 1.2 }); }
    var anim = { rainAcc: 0, step: 0, dustAcc: 0, armAcc: 0, armStep: 0 }, RAIN_DT = 1 / 12, DUST_DT = 0.1, ARM_DT = 1 / 8;
    var _wp = new T.Vector3();
    function winRows(P, k) { return Math.floor((P.y - WIN.y0 - 0.5 * k) / k) + 1; }   /* P 아래로 창 안에 완전히 드는 행 수 (행 0 = P) */
    function winCol(r) { return WIN.z0 + 0.06 + (r % 1000) / 1000 * (WIN.z1 - WIN.z0 - 0.12); }
    function rainSpawn(L, li, i, init) {
      L.cyc[i] = (L.cyc[i] | 0) + 1; var r = hash('rain' + li + '_' + i + '_' + L.cyc[i]);
      L.z[i] = winCol(r); L.len[i] = L.lens[0] + ((r >> 10) % (L.lens[1] - L.lens[0] + 1));
      L.m[i] = init ? ((r >> 14) % 30) - L.len[i] : -(1 + ((r >> 14) % 10));
    }
    RAIN.forEach(function (L, li) { L.z = []; L.m = []; L.len = []; L.cyc = []; for (var i = 0; i < L.n; i++) rainSpawn(L, li, i, true); });
    function rainLayout(L, li, active, advance) {
      var a = L.obj.geometry.attributes.position.array, k = pxUp();
      for (var i = 0; i < L.n; i++) {
        var o = i * 6;
        if (i >= active) { a[o] = a[o + 3] = 0; a[o + 1] = a[o + 4] = -50; a[o + 2] = a[o + 5] = 0; continue; }
        if (advance) L.m[i] += L.speed;
        _wp.set(L.x, WIN.y1, L.z[i]); snapC(_wp);
        var M = winRows(_wp, k);
        if (L.m[i] - L.len[i] + 1 >= M) { rainSpawn(L, li, i); _wp.set(L.x, WIN.y1, L.z[i]); snapC(_wp); M = winRows(_wp, k); }
        var m0 = Math.max(L.m[i] - L.len[i] + 1, 0), m1 = Math.min(L.m[i], M - 1);
        if (m1 < m0) { a[o] = a[o + 3] = 0; a[o + 1] = a[o + 4] = -50; a[o + 2] = a[o + 5] = 0; continue; }
        a[o] = _wp.x; a[o + 1] = _wp.y - m0 * k; a[o + 2] = _wp.z; a[o + 3] = _wp.x; a[o + 4] = _wp.y - (m1 + 1) * k; a[o + 5] = _wp.z;   /* 픽셀 중심 → 다음 픽셀 중심: 다이아몬드 규칙으로 꼭 (m1−m0+1) px */
      }
      L.obj.geometry.attributes.position.needsUpdate = true;
    }
    function dropSpawn(i, init) {
      DROP.cyc[i] = (DROP.cyc[i] | 0) + 1; var r = hash('drop' + i + '_' + DROP.cyc[i]);
      DROP.z[i] = winCol(r); DROP.m[i] = init ? (r >> 10) % 16 : (r >> 10) % 4; DROP.wait[i] = init ? (i * 7) % 20 : 12 + ((r >> 14) % 48);
    }
    for (i = 0; i < DROP.n; i++) dropSpawn(i, true);
    function dropLayout(active, advance) {
      var a = drops.geometry.attributes.position.array, k = pxUp();
      for (var i = 0; i < DROP.n; i++) {
        var o = i * 3;
        if (advance && DROP.wait[i] > 0) DROP.wait[i]--;
        else if (advance && hash('dropv' + i + '_' + anim.step) % 5 < 2) DROP.m[i]++;
        if (i >= active || DROP.wait[i] > 0) { a[o] = 0; a[o + 1] = -50; a[o + 2] = 0; continue; }
        _wp.set(DROP.x, WIN.y1, DROP.z[i]); snapC(_wp);
        if (DROP.m[i] >= winRows(_wp, k)) { dropSpawn(i); a[o] = 0; a[o + 1] = -50; a[o + 2] = 0; continue; }
        a[o] = _wp.x; a[o + 1] = _wp.y - DROP.m[i] * k; a[o + 2] = _wp.z;
      }
      drops.geometry.attributes.position.needsUpdate = true;
    }
    function snowSpawn(i, init) {
      SNOW.cyc[i] = (SNOW.cyc[i] | 0) + 1; var r = hash('snow' + i + '_' + SNOW.cyc[i]);
      SNOW.z[i] = WIN.z0 + 0.2 + (r % 1000) / 1000 * (WIN.z1 - WIN.z0 - 0.4); SNOW.col[i] = 0; SNOW.m[i] = init ? (r >> 10) % 24 : -(1 + ((r >> 10) % 6));
    }
    for (i = 0; i < SNOW.n; i++) snowSpawn(i, true);
    function snowLayout(advance) {
      var a = snow.geometry.attributes.position.array, k = pxUp();
      for (var i = 0; i < SNOW.n; i++) {
        var o = i * 3;
        if (advance) { if ((anim.step + i) & 1) SNOW.m[i]++; if (anim.step % 4 === 0) { var r = hash('snd' + i + '_' + anim.step) % 8; if (r === 0) SNOW.col[i] = clamp(SNOW.col[i] + 1, -3, 3); else if (r === 1) SNOW.col[i] = clamp(SNOW.col[i] - 1, -3, 3); } }
        _wp.set(SNOW.x, WIN.y1, SNOW.z[i]); snapC(_wp);
        if (SNOW.m[i] >= winRows(_wp, k)) snowSpawn(i);
        if (SNOW.m[i] < 0) { a[o] = 0; a[o + 1] = -50; a[o + 2] = 0; continue; }
        _wp.addScaledVector(_r, SNOW.col[i] * S.pw); a[o] = _wp.x; a[o + 1] = _wp.y - SNOW.m[i] * k; a[o + 2] = _wp.z;
      }
      snow.geometry.attributes.position.needsUpdate = true;
    }
    function dustLayout() {
      var a = dust.geometry.attributes.position.array, t = time;
      for (var i = 0; i < 24; i++) {
        var d = DUST[i], ang = d.ang + t * 0.12;
        _wp.set(lampAt.x + Math.cos(ang) * d.rad, lampPos.y - 0.8 + d.h + Math.sin(t * 0.4) * 0.06, lampAt.z + Math.sin(ang) * d.rad); snapC(_wp);
        a[i * 3] = _wp.x; a[i * 3 + 1] = _wp.y; a[i * 3 + 2] = _wp.z;
      }
      dust.geometry.attributes.position.needsUpdate = true;
    }
    function weatherCounts() { var w = st.weather; return { rain: w === 'rain' ? 1 : w === 'drizzle' ? 0.5 : 0, drops: w === 'rain' ? 3 : w === 'drizzle' ? 2 : 0 }; }
    function layoutWeather(advance) { /* 현재 날씨의 보이는 것만 (advance = 한 스텝 전진, false = 재스냅만: 초기·줌·시점 변경) */
      var c = weatherCounts();
      if (c.rain) RAIN.forEach(function (L, li) { rainLayout(L, li, Math.ceil(L.n * c.rain), advance); });
      if (c.drops) dropLayout(c.drops, advance);
      if (snow.visible) snowLayout(advance);
    }
    function updateStars() { stars.visible = isNight() && st.weather === 'clear'; }
    function applyWeather() {
      var c = weatherCounts();
      RAIN.forEach(function (L) { L.obj.visible = c.rain > 0; }); drops.visible = c.drops > 0; snow.visible = st.weather === 'snow';
      updateStars(); layoutWeather(false);
    }
    function stepWeather(dt) {
      if (st.reduced) return;   /* 모션 감소: 비·눈·물방울 정지 (보이기만) */
      anim.rainAcc += dt; var n = 0;
      while (anim.rainAcc >= RAIN_DT - 1e-6 && n < 3) { anim.rainAcc -= RAIN_DT; anim.step++; n++; layoutWeather(true); }
      if (n === 3) anim.rainAcc = 0;
    }

    /* ── 소품 (§4) ── */
    var props = {}, propDecals = null;
    function addProp(key, mesh, decalR) { mesh.castShadow = true; mesh.visible = false; mesh.traverse(function (o) { if (o.isMesh) o.receiveShadow = true; });   /* 룩 패스 4: 닫힌 방이라 소품도 지붕 그림자를 받아야 창 빛 조각만 밝다 */ mesh.userData.decalR = decalR || 0; props[key] = mesh; scene.add(mesh); }
    addProp('moss', new T.Mesh(keep(mergeParts([{ g: new T.CylinderGeometry(0.17, 0.13, 0.24, 8), m: M(0, 0.12, 0), c: W[4] }, { g: new T.SphereGeometry(0.22, 8, 6), m: M(0, 0.3, 0, 0, 0, 0, 1, 0.6, 1), c: PAL.moss[2] }, { g: new T.SphereGeometry(0.12, 7, 5), m: M(0.1, 0.4, 0.06), c: PAL.moss[3] }])), lambert));
    props.moss.position.set(-R + 0.26, WIN.y0 + 0.04, WIN.z1 - 0.2); snapXZ(props.moss);
    addProp('crate', new T.Mesh(keep(mergeParts([{ g: box(1.0, 0.72, 0.84), m: M(0, 0.36, 0), c: W[3] }, { g: box(1.04, 0.06, 0.88), m: M(0, 0.36, 0), c: W[2] }, { g: box(0.06, 0.74, 0.88), m: M(0, 0.37, 0), c: W[2] }])), lambert), 0.8);
    props.crate.position.set(snapPos(2.0), 0, snapPos(-0.75));
    var candleG = new T.Group(); candleG.position.set(snapPos(2.05), 0.72, snapPos(-0.8));
    candleG.add(new T.Mesh(keep(mergeParts([{ g: new T.CylinderGeometry(0.08, 0.08, 0.3, 7), m: M(0, 0.15, 0), c: PAL.paper[1] }, { g: box(0.03, 0.06, 0.03), m: M(0, 0.32, 0), c: PAL.ink }])), lambert));
    var flame = new T.Mesh(keep(new T.SphereGeometry(0.06, 6, 5)), basic(PAL.amber[4])); flame.position.y = 0.4; candleG.add(flame);
    var flameEm = emTwin(flame, flame.geometry), FLAME_C = [C(PAL.amber[4]), C(PAL.amber[5])], EM_FLAME = C(EM.flame), flick = { k: -1, j: 0.5 };   /* 불꽃 2프레임 (룩 패스 6): 어두운/밝은 색 · 발광 쌍둥이 · 주기별 시드 지터 */
    flameEm.scale.setScalar(1.6);   /* 불꽃(r 0.06 ≈ 1px)은 너무 작아 발광원을 1.6배(≈ 3px)로 — 블러 뒤 2px 고리가 남는다 */
    var candleGlow = new T.Mesh(keep(new T.PlaneGeometry(0.5, 0.5)), glowMat); candleGlow.position.y = 0.4; candleGlow.renderOrder = 5; candleG.add(candleGlow);
    candleLight.position.set(candleG.position.x, 1.15, candleG.position.z);
    addProp('candle', candleG);
    addProp('blanket', new T.Mesh(keep(mergeParts([{ g: box(1.4, 0.12, 1.0, 3, 1, 3), m: M(0, 0.06, 0), c: PAL.rose[1] }, { g: box(1.1, 0.05, 0.3), m: M(0, 0.13, -0.25), c: PAL.rose[2] }])), lambert));
    props.blanket.position.set(snapPos(ANCHORS.blanket[0]), 0, snapPos(ANCHORS.blanket[2] + 0.1)); props.blanket.castShadow = false;
    var BOARD = { x: snapPos(0.15), y: snapPos(1.8), z: snapPos(-R + 0.08), w: 1.7, h: 1.25 };   /* 룩 패스 5: 보드·선반·포스터 칸·기념품 자리도 격자 스냅 */
    addProp('board', new T.Mesh(keep(mergeParts([{ g: box(BOARD.w, BOARD.h, 0.06), m: M(0, 0, 0), c: W[6] }, { g: box(BOARD.w + 0.1, 0.08, 0.08), m: M(0, BOARD.h / 2, 0), c: W[1] }, { g: box(BOARD.w + 0.1, 0.08, 0.08), m: M(0, -BOARD.h / 2, 0), c: W[1] }, { g: box(0.08, BOARD.h, 0.08), m: M(-BOARD.w / 2, 0, 0), c: W[1] }, { g: box(0.08, BOARD.h, 0.08), m: M(BOARD.w / 2, 0, 0), c: W[1] }])), lambert));
    props.board.position.set(BOARD.x, BOARD.y, BOARD.z); props.board.castShadow = false;
    var SHELF = { x: snapPos(-1.55), y: snapPos(1.7), z: snapPos(-R + 0.22) };
    addProp('shelf', new T.Mesh(keep(mergeParts([{ g: box(1.5, 0.07, 0.4), m: M(0, 0, 0), c: W[2] }, { g: box(0.08, 0.3, 0.3), m: M(-0.6, -0.18, -0.05), c: W[1] }, { g: box(0.08, 0.3, 0.3), m: M(0.6, -0.18, -0.05), c: W[1] }])), lambert));
    props.shelf.position.set(SHELF.x, SHELF.y, SHELF.z);
    addProp('curtain', new T.Mesh(keep(mergeParts([{ g: new T.CylinderGeometry(0.03, 0.03, 2.6, 5), m: M(0, WIN.y1 + 0.25, 0.6, Math.PI / 2, 0, 0), c: W[1] }, { g: box(0.08, 1.5, 0.5, 1, 4, 2), m: M(0, WIN.y1 - 0.5, WIN.z0 - 0.3), c: PAL.navy[4], tag: 5 }, { g: box(0.08, 1.5, 0.5, 1, 4, 2), m: M(0, WIN.y1 - 0.5, WIN.z1 + 0.3), c: PAL.navy[4], tag: 5 }])), lambert));
    props.curtain.position.set(snapPos(-R + 0.18), 0, 0); props.curtain.castShadow = false;
    /* 커튼 2프레임 숨쉬기 (룩 패스 7, 등불 ≥ 8 = 커튼 있을 때): 프레임 1 은 천(tag 5) 밑단 정점(y < 1.1)만 세로 1px 들림. 1.2~2.0 s(시드)마다 교대, 모션 감소면 프레임 0 */
    var CURT = { geo: props.curtain.geometry, base: null, frame: 0, t: 0, dur: 1.5, cyc: 0 }; CURT.base = CURT.geo.attributes.position.array.slice();
    function curtainFrame(f) {
      var at = CURT.geo.attributes.position, arr = at.array, tags = CURT.geo.userData.tags, up = f ? pxUp() : 0;
      for (var i = 0; i < tags.length; i++) if (tags[i] === 5 && CURT.base[i * 3 + 1] < 1.1) arr[i * 3 + 1] = CURT.base[i * 3 + 1] + up;
      at.needsUpdate = true; CURT.frame = f;
    }
    function stepCurtain(dt) {
      if (!props.curtain.visible) return;
      if (st.reduced) { if (CURT.frame) curtainFrame(0); return; }
      CURT.t += dt;
      if (CURT.t >= CURT.dur) { CURT.t = 0; CURT.cyc++; CURT.dur = 1.2 + (hash('cur' + CURT.cyc) % 100) / 100 * 0.8; curtainFrame(CURT.frame ? 0 : 1); }
    }
    function applyItems() {
      Object.keys(props).forEach(function (k) { props[k].visible = st.items.indexOf(k) >= 0; });
      if (propDecals) { scene.remove(propDecals); propDecals.geometry.dispose(); propDecals = null; }
      var dp = [];
      Object.keys(props).forEach(function (k) { var m = props[k]; if (m.visible && m.userData.decalR) dp.push({ g: new T.PlaneGeometry(m.userData.decalR * 2, m.userData.decalR * 2), m: M(m.position.x, 0.012, m.position.z, -Math.PI / 2, 0, 0), c: '#ffffff' }); });
      if (dp.length) { propDecals = new T.Mesh(mergeParts(dp), decalMat); propDecals.renderOrder = 1; scene.add(propDecals); }
      container.dataset.items = st.items.join(' ');
      layoutSouvenirs();
    }

    /* ── 포스터 (보드 위 평면) · 기념품 ── */
    var posterMeshes = [], posterMat = keep(new T.MeshPhongMaterial({ color: C(MAT.paper), shininess: 0, specular: 0x000000 })), lastPosterCount = 0;
    function posterSlot(i) { return [snapPos(BOARD.x - 0.54 + (i % 3) * 0.54), snapPos(BOARD.y + 0.3 - Math.floor(i / 3) * 0.6), BOARD.z + 0.05]; }
    function setPosters(list) {
      list = (list || []).slice(-6);
      var keepIds = {};
      list.forEach(function (p) { keepIds[p.id] = p; });
      posterMeshes = posterMeshes.filter(function (m) { if (keepIds[m.userData.id]) return true; scene.remove(m); if (m.material !== posterMat) { if (m.material.map) m.material.map.dispose(); m.material.dispose(); } return false; });
      list.forEach(function (p, i) {
        var m = posterMeshes.filter(function (x) { return x.userData.id === p.id; })[0];
        if (!m) {
          m = new T.Mesh(posterGeo, posterMat); m.userData = { kind: 'poster', id: p.id }; m.castShadow = false; m.receiveShadow = true;
          scene.add(m); posterMeshes.push(m);
          bakeSVG(p.tex || p.svg, 48, 64).then(function (tex) { if (!tex || !m.parent) return; m.material = new T.MeshPhongMaterial({ map: tex, shininess: 0, specular: 0x000000 }); });
        }
        var s = posterSlot(i); m.position.set(s[0], s[1], s[2]); m.rotation.z = ((hash(p.id) % 7) - 3) * 0.02;
      });
      lastPosterCount = list.length; container.dataset.posters = String((list || []).length);
    }
    var posterGeo = keep(new T.PlaneGeometry(0.42, 0.56));
    var souvMeshes = [], souvMats = {};
    function souvMat(hex) { return souvMats[hex] || (souvMats[hex] = keep(new T.MeshPhongMaterial({ color: C(hex), shininess: 0, specular: 0x000000 }))); }
    function setSouvenirs(list) {
      souvMeshes.forEach(function (m) { scene.remove(m); });
      souvMeshes = [];
      var cols = [PAL.amber[3], PAL.moss[2], PAL.sky[2], PAL.dusk[2], PAL.rose[2], PAL.paper[2]];
      (list || []).slice(-8).forEach(function (sv) {
        var r = hash(sv.id), shape = r % 3, g = shape === 0 ? new T.SphereGeometry(0.11, 7, 5) : shape === 1 ? box(0.18, 0.18, 0.18) : new T.CylinderGeometry(0.02, 0.11, 0.22, 6);
        var m = new T.Mesh(keep(g), souvMat(cols[(r >> 4) % cols.length])); m.userData = { kind: 'souvenir', sv: sv, h: shape === 0 ? 0.11 : shape === 1 ? 0.09 : 0.11 }; m.castShadow = true; m.receiveShadow = true;
        scene.add(m); souvMeshes.push(m);
      });
      layoutSouvenirs();
    }
    function layoutSouvenirs() {
      var shelf = st.items.indexOf('shelf') >= 0;
      souvMeshes.forEach(function (m, i) {
        if (shelf) m.position.set(snapPos(SHELF.x - 0.6 + (i % 6) * 0.24), SHELF.y + 0.035 + m.userData.h, snapPos(SHELF.z + (i >= 6 ? -0.1 : 0.05)));
        else m.position.set(snapPos(-R + 0.26), WIN.y0 + 0.04 + m.userData.h, snapPos(WIN.z0 + 0.15 + (i % 3) * 0.26));
        m.visible = shelf || i < 3;
      });
    }

    /* ── 문어 (§7.1, 절차적 · assets/ref/octopus-ref.png) ──
       로컬 단위 = 머리 반지름 r. OCT_R = 0.42 m (방 폭 5 m 의 8%). 머리 중심 y 0.92, y 찌그림 0.88 → 바닥 틈 0.04 r (= 1.7 cm).
       다리 8 = 바깥·아래로 말리는 테이퍼 사슬(두께 0.38 r → 0.12 r, 길이 ≈ 0.9 r), 끝이 바닥(y=0)에 닿고 살짝 들린다(룩 패스 1). */
    var OCT_R = 0.42, HEAD_Y = 0.92, HEAD_SQ = 0.88;
    var octG = new T.Group(), bodyG = new T.Group(); octG.add(bodyG); scene.add(octG); octG.scale.setScalar(OCT_R);
    var EYE = [[-0.30, 0.67, 0.90], [0.30, 0.67, 0.90]], EYE_R = 0.24, PUPIL_R = 0.13;   /* 둘 다 정면(+z), 몸 중심보다 아래 (레퍼런스) */
    var headParts = [{ g: new T.SphereGeometry(1, 20, 14), m: M(0, HEAD_Y, 0, 0, 0, 0, 1, HEAD_SQ, 1), c: OC.body, tag: 1 },
      { g: new T.SphereGeometry(0.3, 9, 7), m: M(-0.45, 1.50, 0.52, 0.5, -0.4, 0, 1, 0.55, 0.5), c: OC.hi, tag: 2 },   /* 왼쪽 위 하이라이트 패치 */
      { g: new T.SphereGeometry(0.07, 6, 5), m: M(-0.56, 1.62, 0.6), c: OC.white },
      { g: box(0.30, 0.05, 0.08), m: M(0, 0.44, 0.82), c: OC.mouth, tag: 3 }];   /* `_` 입: 눈 아래, 폭 0.3 r */
    EYE.forEach(function (e) { headParts.push({ g: new T.SphereGeometry(EYE_R, 10, 8), m: M(e[0], e[1], e[2], 0, 0, 0, 1, 1, 0.55), c: OC.white }); });
    var headGeo = keep(mergeParts(headParts)), head = new T.Mesh(headGeo, toon); head.castShadow = true; head.receiveShadow = true; bodyG.add(head);
    var pupils = EYE.map(function (e) {   /* 동공 0.13 r + 흰 글린트 1px */
      var g = keep(mergeParts([{ g: new T.SphereGeometry(PUPIL_R, 8, 6), m: M(0, 0, 0), c: OC.eye }, { g: new T.SphereGeometry(0.055, 5, 4), m: M(-0.045, 0.05, 0.105), c: OC.white }]));
      var m = new T.Mesh(g, toon); m.receiveShadow = true; m.position.set(e[0], e[1], e[2] + 0.14); bodyG.add(m); return m;
    });
    var lidGeo = keep(mergeParts(EYE.map(function (e) { return { g: new T.SphereGeometry(EYE_R + 0.03, 10, 8), m: M(e[0], e[1], e[2] + 0.01, 0, 0, 0, 1, 1, 0.6), c: OC.body, tag: 1 }; })));
    var lids = new T.Mesh(lidGeo, toon); lids.visible = false; lids.receiveShadow = true; bodyG.add(lids);
    var arcs = new T.Mesh(keep(mergeParts(EYE.map(function (e) { return { g: new T.TorusGeometry(0.17, 0.04, 5, 8, Math.PI), m: M(e[0], e[1] - 0.04, e[2] + 0.2), c: OC.eye }; }))), toon); arcs.visible = false; bodyG.add(arcs);
    var blush = new T.Mesh(keep(mergeParts([[-0.57, 0.52, 0.72], [0.57, 0.52, 0.72]].map(function (p) { return { g: new T.CircleGeometry(0.15, 8), m: M(p[0], p[1], p[2], 0, p[0] < 0 ? -0.5 : 0.5, 0), c: OC.hi, tag: 2 }; }))), toon); blush.visible = false; bodyG.add(blush);
    /* 다리 키포인트 [바깥 거리, 높이(뿌리 기준), 반지름]: 뿌리는 몸 안(0.62 r, 0.30 r), 밑면이 바닥(y=0)에 닿고 끝이 들린다 */
    var ARM = [[0, 0, 0.19], [0.26, -0.12, 0.17], [0.50, -0.17, 0.14], [0.70, -0.19, 0.11], [0.82, -0.08, 0.065]], ARM_ROOT = [0.60, 0.30];
    function armParts() {
      var ps = [{ g: new T.SphereGeometry(ARM[0][2], 8, 6), m: M(0, 0, 0), c: OC.body, tag: 1 }];
      for (var k = 0; k < ARM.length - 1; k++) {
        var a0 = ARM[k], a1 = ARM[k + 1], dx = a1[0] - a0[0], dy = a1[1] - a0[1];
        ps.push({ g: new T.CylinderGeometry(a1[2], a0[2], Math.hypot(dx, dy), 7), m: M((a0[0] + a1[0]) / 2, (a0[1] + a1[1]) / 2, 0, 0, 0, Math.atan2(dy, dx) - Math.PI / 2), c: OC.body, tag: 1 });
        ps.push({ g: new T.SphereGeometry(a1[2], 7, 5), m: M(a1[0], a1[1], 0), c: OC.body, tag: 1 });   /* 관절을 둥글게 */
      }
      /* 빨판 2: 들린 끝마디 밑면(바깥을 향해 보인다) */
      var p3 = ARM[3], p4 = ARM[4], d = [p4[0] - p3[0], p4[1] - p3[1]], dl = Math.hypot(d[0], d[1]), n = [d[1] / dl, -d[0] / dl];
      ps.push({ g: new T.SphereGeometry(0.05, 5, 4), m: M((p3[0] + p4[0]) / 2 + n[0] * 0.06, (p3[1] + p4[1]) / 2 + n[1] * 0.06, 0), c: OC.pale, tag: 4 });
      ps.push({ g: new T.SphereGeometry(0.045, 5, 4), m: M(p4[0] + n[0] * 0.045, p4[1] + n[1] * 0.045, 0), c: OC.pale, tag: 4 });
      return ps;
    }
    var arms = [];
    for (i = 0; i < 8; i++) {
      var a = i / 8 * Math.PI * 2 + Math.PI / 8;
      var arm = new T.Mesh(keep(mergeParts(armParts())), toon); arm.castShadow = true; arm.receiveShadow = true;
      arm.position.set(ARM_ROOT[0] * Math.cos(a), ARM_ROOT[1], ARM_ROOT[0] * Math.sin(a)); arm.rotation.set(0, -a, 0); arm.userData.a = a; bodyG.add(arm); arms.push(arm);
    }
    var hit = new T.Mesh(keep(new T.SphereGeometry(1.6, 8, 6)), keep(new T.MeshBasicMaterial({ visible: false }))); hit.position.y = 0.7; hit.userData.kind = 'oct'; bodyG.add(hit);   /* 반지름 0.67 m ≈ 72 CSS px (p=3) ≥ 44 */
    var carry = new T.Mesh(posterGeo, posterMat); carry.receiveShadow = true; carry.position.set(1.0, 0.95, 0.6); carry.rotation.set(0, 0.5, 0.15); carry.scale.setScalar(1.6); carry.visible = false; bodyG.add(carry);
    var octDecal = new T.Mesh(keep(new T.PlaneGeometry(3.2, 3.2)), decalMat); octDecal.rotation.x = -Math.PI / 2; octDecal.position.y = 0.01; octDecal.renderOrder = 1; octG.add(octDecal);   /* 접지 그림자 1.34 m (다리 끝까지) */
    var oct = { anchor: 'window', pos: new T.Vector3(), walking: null, faceYaw: 0, wantYaw: 0, blinkT: 3 + (hash('blink0') % 1000) / 1000 * 4, blinkLeft: 0, blinkN: 0, animT: 0, hop: 0, flushK: 0, pointer: null, lookTarget: null };
    var ARMW = arms.map(function (_, i) { var r = hash('armw' + i); return { ph: r % 32, per: 16 + ((r >> 8) % 17) }; });   /* 다리 끝 꿈틀: 시드 위상 · 주기 16~32 스텝(2~4 s @ 8 fps) */
    var octTags = [headGeo, lidGeo].concat(arms.map(function (m) { return m.geometry; }));
    function octColor(hex) { octTags.forEach(function (g) { recolor(g, 1, hex); }); }
    function setColor(hex) {
      if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return;
      st.color = hex; OC = octDerived(hex); PAL = buildPalette(hex, st.palette); uploadPalette();
      octColor(hex); recolor(headGeo, 2, OC.hi); recolor(headGeo, 3, OC.mouth); recolor(blush.geometry, 2, OC.hi);
      arms.forEach(function (m) { recolor(m.geometry, 4, OC.pale); });
      oct.wiggle = 0.7;   /* 색을 바꾸면 한 번 흔들 (§14) */
    }
    function anchorPos(name) { var p = ANCHORS[name] || ANCHORS.center; return new T.Vector3(p[0], name === 'blanket' && st.items.indexOf('blanket') >= 0 ? 0.12 : 0, p[2]); }
    function camYaw() { return YAW + yawDelta(); }
    /* 문어 위치: oct.pos 가 논리 위치(보간·앵커), octG.position 은 매 프레임 그걸 카메라 우/상 축 픽셀 격자에 스냅한 값 (룩 패스 5: 걷는 동안 반 픽셀 금지). 스냅을 매 프레임 논리값에서 새로 하므로 요가 바뀌어도 누적 표류 없음 */
    function jumpTo(anchor) { if (oct.walking) { oct.walking.cancel(); oct.walking = null; } oct.anchor = anchor; oct.pos.copy(anchorPos(anchor)); snapScreen(octG.position.copy(oct.pos)); oct.wantYaw = oct.faceYaw = camYaw(); }
    function moveTo(anchor) {
      var to = anchorPos(anchor), from = oct.pos.clone();
      oct.anchor = anchor;
      if (oct.walking) { oct.walking.cancel(); oct.walking = null; }
      var d = to.clone().sub(from), dist = d.length();
      function done() { if (on.anchorReached) on.anchorReached(anchor); }
      if (st.reduced || dist < 0.05) { oct.pos.copy(to); snapScreen(octG.position.copy(to)); oct.wantYaw = camYaw(); done(); return Promise.resolve(anchor); }
      oct.wantYaw = Math.atan2(d.x, d.z);
      var dur = dist / 1.2 * st.speed, hopDur = 0.3 * st.speed, k = 0, cancelled = false;
      return new Promise(function (resolve) {
        oct.walking = { cancel: function () { cancelled = true; }, step: function (dt) {
          if (cancelled) return;
          k += dt;
          if (k < dur) { oct.pos.lerpVectors(from, to, k / dur); return; }
          var hk = (k - dur) / hopDur;
          if (hk < 1) { oct.pos.copy(to); oct.hop = Math.sin(hk * Math.PI) * 0.4; return; }
          oct.hop = 0; oct.walking = null; oct.wantYaw = camYaw(); done(); resolve(anchor);
        } };
      });
    }
    var octState = { carrySvg: null, hang: null };
    function setOctState(s, extra) {
      st.octState = s; oct.animT = 0;
      if (opts.octEl) opts.octEl.className = opts.octEl.className.replace(/\bst-[a-z]+/g, '').trim() + ' st-' + s;
      var away = s === 'away';
      octG.visible = !away; octDecal.visible = !away;
      var closed = s === 'sleep' || s === 'pet';
      lids.visible = closed; pupils.forEach(function (p) { p.visible = !closed; });
      arcs.visible = s === 'pet'; blush.visible = s === 'pet';
      if (s === 'carry') { carry.visible = true; if (extra && extra.svg) bakeSVG(extra.svg, 48, 64).then(function (t) { if (t) carry.material = new T.MeshPhongMaterial({ map: t, shininess: 0, specular: 0x000000 }); }); }
      else if (s === 'hang') { if (carry.visible && !st.reduced) startHang(); carry.visible = false; }
      else carry.visible = false;
      if (s === 'happy') oct.hopsLeft = 2;
      if (s !== 'walk' && s !== 'carry' && !oct.walking) oct.wantYaw = camYaw();
      if (s === 'idle' || s === 'stay') oct.wantYaw = camYaw();
    }
    var hangFly = null;
    function startHang() {
      var from = carry.getWorldPosition(new T.Vector3()), slot = posterSlot(Math.min(lastPosterCount, 5)), to = new T.Vector3(slot[0], slot[1], slot[2]);
      var fly = new T.Mesh(posterGeo, carry.material); fly.position.copy(from); fly.scale.setScalar(carry.scale.x * OCT_R); scene.add(fly);
      hangFly = { m: fly, from: from, to: to, k: 0, dur: 0.5 * st.speed, s0: fly.scale.x };   /* 들고 있던 크기 → 보드 크기 */
    }
    function stepHang(dt) {
      if (!hangFly) return;
      hangFly.k += dt; var k = Math.min(1, hangFly.k / hangFly.dur), e = k * k * (3 - 2 * k);
      hangFly.m.position.lerpVectors(hangFly.from, hangFly.to, e); hangFly.m.position.y += Math.sin(k * Math.PI) * 0.4; hangFly.m.scale.setScalar(hangFly.s0 + (1 - hangFly.s0) * e);
      if (k >= 1) { scene.remove(hangFly.m); hangFly = null; }
    }
    var _hp = new T.Vector3();
    function octScreen() { /* 머리 꼭대기 → 컨테이너 CSS px */
      bodyG.localToWorld(_hp.set(0, HEAD_Y + HEAD_SQ + 0.1, 0)).project(camera);
      return { x: S.offX + (_hp.x * 0.5 + 0.5) * S.cw, y: S.offY + (1 - (_hp.y * 0.5 + 0.5)) * S.ch };
    }
    var lastOverlay = '';
    function updateOverlay() {
      var el = opts.octEl; if (!el) return;
      var p = octScreen(), s = 'translate(' + Math.round(p.x - 24) + 'px,' + Math.round(p.y - 48) + 'px)';
      if (s !== lastOverlay) { lastOverlay = s; el.style.transform = s; }
    }
    function stepOct(dt) {
      var s = st.octState, t = time, red = st.reduced;
      oct.animT += dt;
      if (oct.walking) oct.walking.step(dt);
      snapScreen(octG.position.copy(oct.pos));   /* 화면 픽셀 격자에 스냅 (걷기 보간은 oct.pos 에서 매끄럽게, 보이는 위치는 정수 픽셀) */
      /* 방향 */
      var dy = oct.wantYaw - oct.faceYaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      oct.faceYaw += red ? dy : dy * Math.min(1, dt * 8); octG.rotation.y = oct.faceYaw;
      /* 몸 */
      var sx = 1, sy = 1, by = oct.hop, walking = s === 'walk' || s === 'carry', tb = Math.floor(t * 8) / 8;   /* 숨쉬기는 8 fps 스텝 샘플 (룩 패스 7) */
      if (!red) {
        if (s === 'idle' || s === 'stay') { sy = 1 - 0.03 * (0.5 + 0.5 * Math.sin(tb * Math.PI / 2)); sx = 1 + 0.02 * (0.5 + 0.5 * Math.sin(tb * Math.PI / 2)); }
        if (s === 'sleep') { sy = 0.95 - 0.02 * Math.sin(tb * Math.PI / 2.5); sx = 1.03; }
        if (walking && oct.walking) { by += Math.abs(Math.sin(t * 10)) * 0.1; sy = 1 + 0.03 * Math.sin(t * 20); }
        if (s === 'anticipate') { var ak = Math.min(1, oct.animT / 0.6); sx = 1 + 0.05 * ak; sy = 1 - 0.08 * ak; }
        if (s === 'pet') { var pk = 0.5 + 0.5 * Math.sin(t * Math.PI / 0.6); sx = 1 + 0.06 * pk; sy = 1 - 0.06 * pk; }
        if (s === 'peek') bodyG.rotation.z = Math.sin(t * 4.5) * 0.12; else bodyG.rotation.z *= 0.8;
        if (s === 'happy' && oct.hopsLeft > 0) { var hk = (oct.animT % 0.45) / 0.45; by += Math.sin(hk * Math.PI) * 0.5; if (oct.animT > 0.9) oct.hopsLeft = 0; }
        if (oct.wiggle > 0) { oct.wiggle -= dt; bodyG.rotation.z = Math.sin(oct.wiggle * 30) * 0.1 * oct.wiggle; }
      } else if (s === 'sleep') sy = 0.95;
      bodyG.scale.set(sx, sy, sx); bodyG.position.y = snapUp(by * OCT_R) / OCT_R;   /* 폴짝·통통도 세로 정수 픽셀로 */
      /* 다리: 0 = 끝이 바닥에 닿은 자세, 흔들림은 위로만. idle 다리 끝 미세 꿈틀(룩 패스 7) = 8 fps 스텝, 다리마다 시드 주기(2~4 s)로 2스텝(0.25 s)만 끝이 화면 세로 **1px** 들림(각도 = asin(1px / 다리 길이)), 걷기는 연속 그대로 */
      anim.armAcc += dt; while (anim.armAcc >= ARM_DT - 1e-6) { anim.armAcc -= ARM_DT; anim.armStep++; } if (anim.armAcc > 1) anim.armAcc = 0;
      var armUp = Math.asin(clamp(pxUp() / (ARM[4][0] * OCT_R * sy), 0, 1));
      for (var i = 0; i < 8; i++) {
        var arm = arms[i], base = 0, w = ARMW[i];
        if (red) { arm.rotation.z = base; continue; }
        if (walking && oct.walking) arm.rotation.z = base + (0.5 + 0.5 * Math.sin(t * 10 + (i % 2) * Math.PI)) * 0.35;
        else if (s === 'sleep') arm.rotation.z = base + 0.02;
        else arm.rotation.z = base + 0.05 + (((anim.armStep + w.ph) % w.per) < 2 ? armUp : 0);
      }
      /* 눈 깜빡임 (룩 패스 7: 3~7 s 시드 간격, 120 ms, 눈꺼풀 덮고 동공 scaleY 0.1; 모션 감소면 없음) · 동공 */
      if (s !== 'sleep' && s !== 'pet' && s !== 'away') {
        if (!red) { oct.blinkT -= dt; if (oct.blinkT <= 0) { oct.blinkLeft = 0.12; oct.blinkN = (oct.blinkN | 0) + 1; oct.blinkT = 3 + (hash('blink' + oct.blinkN) % 1000) / 1000 * 4; } }
        if (oct.blinkLeft > 0 && !red) { oct.blinkLeft -= dt; lids.visible = true; pupils[0].scale.y = pupils[1].scale.y = 0.1; }
        else { oct.blinkLeft = 0; lids.visible = false; pupils[0].scale.y = pupils[1].scale.y = 1; pupils[0].visible = pupils[1].visible = true; }
      }
      var look = oct.lookTarget || oct.pointer, px = 0, py = 0;
      if (look) { var sp = octScreen(), r = canvas.getBoundingClientRect(); px = clamp((look.x - (r.left + sp.x - S.offX)) / 140, -1, 1); py = clamp((look.y - (r.top + sp.y - S.offY + 30)) / 140, -1, 1); }
      pupils.forEach(function (p, k) { p.position.x += ((EYE[k][0] + px * 0.07) - p.position.x) * Math.min(1, dt * 10); p.position.y += ((EYE[k][1] - py * 0.06) - p.position.y) * Math.min(1, dt * 10); });
      /* 색: 잠(색 순환 ±18°) · 쓰다듬기(따뜻한 홍조) */
      var want = s === 'pet' ? 1 : 0; oct.flushK += (want - oct.flushK) * Math.min(1, dt * 3);
      var hex = st.color;
      if (s === 'sleep') hex = hueHex(hex, Math.sin(t * Math.PI / 6) * 18);
      if (oct.flushK > 0.02) hex = mixHex(hex, OC.hi, oct.flushK * 0.35);
      if (hex !== oct.curHex) { oct.curHex = hex; octColor(hex); }
      octDecal.material.opacity = 0.42;
    }

    /* ── 입력: 레이캐스트 · 드래그 · 줌 ── */
    var ray = new T.Raycaster(), ndc = new T.Vector2(), press = null, pinch = null;
    function pick(e) {
      var r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      var list = [hit, glass].concat(posterMeshes, souvMeshes.filter(function (m) { return m.visible; }));
      var hits = ray.intersectObjects(list, false);
      for (var i = 0; i < hits.length; i++) { var o = hits[i].object; if (o === hit && !octG.visible) continue; return o; }
      return null;
    }
    listen(canvas, 'pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
      if (press && press.id !== e.pointerId) { pinch = { d0: Math.hypot(e.clientX - press.x, e.clientY - press.y), zoom: st.zoom }; return; }
      var o = pick(e);
      press = { id: e.pointerId, x: e.clientX, y: e.clientY, obj: o, moved: false, pet: false, t: null };
      if (o && o.userData.kind === 'oct') press.t = setTimeout(function () { press.pet = true; if (on.pet) on.pet(); }, 350);
      e.preventDefault();
    });
    listen(canvas, 'pointermove', function (e) {
      if (press && pinch && e.pointerId !== press.id) { var d = Math.hypot(e.clientX - press.x, e.clientY - press.y); var z = clamp(pinch.zoom + Math.round(Math.log(d / pinch.d0) / Math.log(1.25)), 0, ZOOM_STEPS.length - 1); if (z !== st.zoom) { st.zoom = z; resize(); dither.still = 0; } return; }
      if (!press || e.pointerId !== press.id) return;
      var dx = e.clientX - press.x, dy = e.clientY - press.y;
      if (!press.moved && Math.hypot(dx, dy) > 8) press.moved = true;
      if (press.obj && press.obj.userData.kind === 'oct') { if (press.moved && !press.pet) { clearTimeout(press.t); press.pet = true; if (on.pet) on.pet(); } return; }
      if (press.moved && !pinch) { yawDrag = clamp(yawDrag + (e.clientX - press.lx || 0) * 0.004, -25 * DEG, 25 * DEG); dragging = true; dither.still = 0; }
      press.lx = e.clientX;
    });
    function pointerEnd(e) {
      if (!press || e.pointerId !== press.id) { if (pinch && (!press || e.pointerId !== press.id)) pinch = null; return; }
      clearTimeout(press.t);
      var o = press.obj, k = o && o.userData.kind;
      if (!press.moved && !press.pet && !pinch && e.type === 'pointerup') {
        if (k === 'oct') { oct.wantYaw = camYaw(); if (on.tap) on.tap(); }
        else if (k === 'window') { if (on.windowTap) on.windowTap(); }
        else if (k === 'poster') { if (on.posterTap) on.posterTap(o.userData.id); }
        else if (k === 'souvenir') { if (on.souvenirTap) on.souvenirTap(o.userData.sv); }
      }
      press = null; pinch = null; dragging = false;
    }
    listen(canvas, 'pointerup', pointerEnd); listen(canvas, 'pointercancel', pointerEnd);
    listen(canvas, 'wheel', function (e) { e.preventDefault(); var z = clamp(st.zoom + (e.deltaY < 0 ? 1 : -1), 0, ZOOM_STEPS.length - 1); if (z !== st.zoom) { st.zoom = z; resize(); dither.still = 0; } }, { passive: false });
    listen(document, 'pointermove', function (e) { if (e.pointerType !== 'touch') { oct.pointer = { x: e.clientX, y: e.clientY }; oct.lookTarget = null; } }, { passive: true });
    listen(canvas, 'webglcontextlost', function (e) { e.preventDefault(); st.lost = true; });
    listen(canvas, 'webglcontextrestored', function () { st.lost = false; renderer.shadowMap.needsUpdate = true; });
    listen(document, 'visibilitychange', function () { st.hidden = document.hidden; if (!st.hidden) { lastT = 0; loop(); } });
    var ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(function () { resize(); }); ro.observe(container); } else listen(window, 'resize', resize);

    /* ── 말풍선 (HTML 오버레이) ── */
    var bubbleTimer = null;
    function bubble(text, ms) {
      var b = opts.octEl && opts.octEl.querySelector('#oct-bubble'); if (!b) return;
      clearTimeout(bubbleTimer);
      if (!text) { b.hidden = true; return; }
      b.textContent = text; b.hidden = false;
      bubbleTimer = setTimeout(function () { b.hidden = true; }, ms || 2600);
    }

    /* ── 루프 ── */
    var logged = false, candleT = 0;
    var perf = { ring: new Float32Array(60), n: 0, i: 0 };   /* 디버그 통계 (룩 패스 7): 마지막 60 렌더 프레임의 ms/frame (stats().ms) */
    function frame(ts) {
      var dt = lastT ? Math.min(0.1, (ts - lastT) / 1000) : 0.016; lastT = ts; time += dt; frameNo++;
      if (st.lost) return;
      var idle = (st.octState === 'idle' || st.octState === 'sleep' || st.octState === 'stay') && !oct.walking && !dragging && light.t >= 1 && dither.still > 0.3;
      if (idle && (frameNo & 1) && !st.force) return;   /* 가만히 있을 땐 30fps (debugStep 은 강제 렌더) */
      var t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0;
      if (light.t < 1) { light.t = Math.min(1, light.t + dt / light.dur); applyLight(); if (light.t >= 1) light.from = null; }
      if (lampDirty) applyLamp();
      if (!st.reduced && st.lantern > 0) { lampGlow.material.opacity = glowOpacity() + Math.sin(Math.floor(time * 8) / 8 * 2) * 0.03 * (light.glow || 0.7) / 0.7; }   /* 글로우 맥동 8 fps 스텝 */
      stepSway(); stepShimmer(dt); stepCurtain(dt);   /* 룩 패스 7: 등불 진자 · 창 빛 일렁임 · 커튼 숨 */
      if (dust.visible) { anim.dustAcc += dt; if (anim.dustAcc >= DUST_DT - 1e-6 || !anim.dustInit) { anim.dustAcc = 0; anim.dustInit = true; dustLayout(); } }   /* 먼지 10 fps 스텝, 픽셀 중심 스냅 */
      if (props.candle.visible) {   /* 양초 점광 0.3~0.42 d 2 × 시각대 계수. 불꽃 = 2프레임 깜빡임 (룩 패스 6): 7 Hz, 주기마다 시드 지터로 밝은 프레임이 35~65 % — 크기(y 0.9/1.25)·색(호박 4/5)·발광(0.7/1.0). 모션 감소면 중간값 고정 */
        candleT += dt; var ck = light.candle || 1, fph = candleT * 7, fk = Math.floor(fph);
        if (fk !== flick.k) { flick.k = fk; flick.j = (hash('flk' + fk) % 100) / 100; }
        var fon = st.reduced ? 0.5 : (fph - fk < 0.35 + 0.3 * flick.j ? 1 : 0);
        candleLight.intensity = (0.3 + 0.12 * fon) * ck;
        flame.scale.set(1, st.reduced ? 1.05 : 0.9 + 0.35 * fon, 1); flame.material.color.copy(FLAME_C[fon >= 0.5 ? 1 : 0]);
        flameEm.material.color.copy(EM_FLAME).multiplyScalar((light.em || 1) * (0.7 + 0.3 * fon));
        candleGlow.visible = true;
      } else candleLight.intensity = 0;
      dither.still = Math.min(1, dither.still + dt);
      post.uniforms.uDither.value = ditherNow();
      stepWeather(dt); stepOct(dt); stepHang(dt);
      lampGlow.quaternion.copy(camera.quaternion); candleGlow.quaternion.copy(camera.quaternion);
      placeCamera(); updateOverlay();
      renderer.shadowMap.needsUpdate = true;
      renderer.setRenderTarget(rt); renderer.clear(true, true, false); renderer.render(scene, camera);
      calls = renderer.info.render.calls;
      scene.overrideMaterial = normalMat; var bg = scene.background; scene.background = null; shade.visible = false;   /* 차폐는 노멀 패스에서 숨김 (방 전체를 덮어쓰지 않게) */
      renderer.setRenderTarget(rtN); renderer.clear(true, true, false); renderer.render(scene, camera);
      scene.overrideMaterial = null;
      calls += renderer.info.render.calls;
      /* 발광 패스 (룩 패스 6): 레이어 1 의 발광 쌍둥이 3개만 (배경 없음 = 검정). 깊이 텍스처가 있으면 뷰티 깊이를 공유하므로 색만 지운다 → 가려진 발광은 안 그려진다 */
      camera.layers.set(1);
      renderer.setRenderTarget(rtE); renderer.clear(true, !hasDepthTex, false); renderer.render(scene, camera);
      camera.layers.set(0); scene.background = bg; shade.visible = true;
      calls += renderer.info.render.calls;
      if (blurOn) {   /* 분리 블러 가로 → 세로 (풀스크린 삼각형 2회, rtE → rtB → rtE). p ≥ 4 면 생략 */
        quad.material = blurMat;
        blurMat.uniforms.tSrc.value = rtE.texture; blurMat.uniforms.uDir.value.set(1 / S.rw, 0); renderer.setRenderTarget(rtB); renderer.render(quadScene, quadCam);
        blurMat.uniforms.tSrc.value = rtB.texture; blurMat.uniforms.uDir.value.set(0, 1 / S.rh); renderer.setRenderTarget(rtE); renderer.render(quadScene, quadCam);
        quad.material = post; calls += 2;
      }
      renderer.setRenderTarget(null); renderer.render(quadScene, quadCam);
      calls += 1;
      if (t0) { perf.ring[perf.i] = performance.now() - t0; perf.i = (perf.i + 1) % 60; if (perf.n < 60) perf.n++; }
      if (!logged && frameNo > 3) {
        logged = true; console.info('[scene3d] draw calls ' + calls + ' (≤150 ' + (calls <= 150 ? 'ok' : 'OVER') + ') · target ' + S.rw + '×' + S.rh + ' · px ' + S.p + ' · palette ' + PAL.list.length + ' · static props ' + propCount);
        if (calls > 150) console.error('[scene3d] draw calls ' + calls + ' > 150 (renderer.info)');   /* 예산 단언: look-shots / evidence3d 가 console.error 로 실패 처리 */
      }
    }
    function loop() { if (st.paused || st.hidden) return; cancelAnimationFrame(raf); raf = requestAnimationFrame(function (ts) { frame(ts); loop(); }); }

    /* ── 초기 상태 ── */
    resize(); applyItems(); applyWeather(); setTime(st.hour, true); applyLamp();
    setPosters(opts.posters || []); setSouvenirs(opts.souvenirs || []);
    jumpTo('window'); setOctState('idle');
    if (opts.octEl) { container.appendChild(opts.octEl); opts.octEl.classList.add('overlay3d'); }
    container.classList.add('mode-3d');
    ready = true; loop();

    return {
      kind: '3d', renderer: renderer, scene: scene, camera: camera,
      setLantern: function (n) { st.lantern = n | 0; lampDirty = true; },
      setItems: function (items) { st.items = (items || []).slice(); applyItems(); },
      setWeather: function (w) { st.weather = w || 'rain'; applyWeather(); },
      setTime: setTime, setColor: setColor,
      setOctState: setOctState, setCarry: function (svg) { octState.carrySvg = svg; },
      moveTo: moveTo, jumpTo: jumpTo,
      setPosters: setPosters, setSouvenirs: setSouvenirs,
      bubble: bubble, lookAt: function (x, y) { oct.lookTarget = { x: x, y: y }; }, octScreenPos: function () { var p = octScreen(), r = canvas.getBoundingClientRect(); return { x: r.left + p.x - S.offX, y: r.top + p.y - S.offY }; },
      setReducedMotion: function (r) { st.reduced = !!r; lampDirty = true; },
      setLook: function (o) {
        var re = false;
        if (o.pixelSize != null && (o.pixelSize | 0) !== st.look.pixelSize) { st.look.pixelSize = clamp(o.pixelSize | 0, 1, 4); re = true; }
        if (o.dither != null) { st.look.dither = clamp(+o.dither, 0, 1); ditherBase(); }
        if (o.outline != null) { st.look.outline = !!o.outline; post.uniforms.uOutline.value = st.look.outline && hasDepthTex ? 1 : 0; }
        if (o.yaw != null) { st.look.yaw = clamp(+o.yaw, -25, 25); dither.still = 0; }
        if (o.zoom != null) { var z = clamp(o.zoom | 0, 0, ZOOM_STEPS.length - 1); if (z !== st.zoom) { st.zoom = z; re = true; } }
        if (o.focus !== undefined) { st.look.focus = o.focus === 'oct' ? 'oct' : null; dither.still = 0; }   /* 줌 단계 0..3 (핀치/휠과 같은 단계, look-shots 의 close 용) */
        if (o.key != null || o.fill != null) { if (o.key != null) st.look.key = clamp(+o.key || LIGHTS.day.sunI, 0.5, 4); if (o.fill != null) st.look.fill = clamp(+o.fill, 0, 1); applyLight(); }   /* 키/필 비율 (룩 패스 4) */
        if (re) { resize(); dither.still = 0; }
      },
      setPalette: function (name) { /* 룩 패스 3: 스냅 팔레트 소스 교체 (재질은 그대로, 디더 진폭은 새 칸 간격으로) */
        name = paletteSource(name); if (name === st.palette) return;
        st.palette = name; PAL = buildPalette(st.color, name); uploadPalette(); ditherBase(); dither.still = 0;
      },
      paletteName: function () { return st.palette; },
      palette: function () { /* 스와치 줄: 램프면 램프별, 검증 팔레트면 8칸씩 + 문어 램프 */
        var out = [];
        if (PAL.source === 'ramps') { out = RAMPS.map(function (r) { return { name: r[0], colors: PAL[r[0]] }; }); out.push({ name: 'fixed', colors: [PAL.ink, PAL.white, PAL.night] }); }
        else { var base = PAL.list.slice(0, PAL.list.length - PAL.oct.length); for (var i = 0; i < base.length; i += 8) out.push({ name: PAL.source + ' ' + (i / 8 + 1), colors: base.slice(i, i + 8) }); }
        out.push({ name: 'oct', colors: PAL.oct }); return out;
      },
      /* 디버그 (룩 패스 7, tools/look-strip.js): 루프를 멈추고 dt 초만큼 한 프레임 진행·렌더 (idle 30fps 건너뛰기 무시) → 12 fps 프레임 스트립을 결정적으로 찍는다. resume() 으로 재개 */
      debugStep: function (dt) { st.paused = true; cancelAnimationFrame(raf); st.force = true; frame((lastT || 0) + Math.max(0.001, +dt || 1 / 12) * 1000); st.force = false; },
      screenOf: function (x, y, z) { var p = _hp.set(x, y, z).project(camera); return { x: S.offX + (p.x * 0.5 + 0.5) * S.cw, y: S.offY + (1 - (p.y * 0.5 + 0.5)) * S.ch }; },   /* 월드 → 컨테이너 CSS px (스트립 크롭 중심) */
      msFrame: function () { var s = 0; for (var i = 0; i < perf.n; i++) s += perf.ring[i]; return { ms: perf.n ? +(s / perf.n).toFixed(2) : 0, n: perf.n }; },
      motion: function () { return { swayPx: swayPx, shimmer: shim.k, curtainFrame: CURT.frame, rainStep: anim.step, armStep: anim.armStep, blink: oct.blinkLeft > 0, reduced: st.reduced }; },   /* 룩 패스 7 디버그 */
      stats: function () { return { calls: calls, target: [S.rw, S.rh], pixel: S.p, palette: PAL.list.length, paletteName: PAL.source, step: +PAL.step.toFixed(4), dither: +dither.base.toFixed(4), ditherFlat: +(dither.base * 0.125).toFixed(4), pw: +S.pw.toFixed(4), hasDepthTex: hasDepthTex, zoom: ZOOM_STEPS[st.zoom], props: propCount, key: +st.look.key.toFixed(2), fill: +st.look.fill.toFixed(2), sun: +sun.intensity.toFixed(2), hemi: +hemi.intensity.toFixed(2), phase: phaseOf(st.hour), bloom: BLOOM, blur: blurOn ? 'h5v5' : 'off', em: +(light.em || 0).toFixed(2) }; },
      refresh: function () { applyItems(); },
      pause: function () { st.paused = true; cancelAnimationFrame(raf); }, resume: function () { st.paused = false; lastT = 0; loop(); },
      destroy: function () {
        st.paused = true; cancelAnimationFrame(raf); unbind.forEach(function (f) { f(); }); if (ro) ro.disconnect();
        posterMeshes.forEach(function (m) { if (m.material !== posterMat) { if (m.material.map) m.material.map.dispose(); m.material.dispose(); } });
        if (carry.material !== posterMat) { if (carry.material.map) carry.material.map.dispose(); carry.material.dispose(); }
        disposables.forEach(function (d) { if (d && d.dispose) d.dispose(); });
        normalMat.dispose(); renderer.dispose(); renderer.forceContextLoss();
        if (opts.octEl && container.querySelector('#stage') === null) { var stg = document.getElementById('stage'); if (stg) stg.appendChild(opts.octEl); opts.octEl.classList.remove('overlay3d'); }
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        container.classList.remove('mode-3d');
      },
      anchors: ANCHORS
    };
  }

  return { supported: supported, init: init, buildPalette: buildPalette, ramp: ramp, hexToOklab: hexToOklab, ANCHORS: ANCHORS, PAL_SOURCES: PAL_SOURCES, PAL_DEFAULT: PAL_DEFAULT, MAT: MAT, LIGHTS: LIGHTS };
})();
