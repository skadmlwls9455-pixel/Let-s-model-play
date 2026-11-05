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
  var TILT = 32 * DEG, YAW = 45 * DEG, DIST = 24, PX_PER_M = 18, DEF_P = 2;   /* 아트 픽셀 18/m × 3/p: 기본 p=2(룩 패스 8) → 27/m (1px ≈ 3.7 cm), p=3 → 18/m (5.5 cm) */
  var SNAP_N = PX_PER_M * 3 / DEF_P;                                              /* 정적 소품 스냅 격자 = 기본 픽셀 격자 1/27 m (p=3 폴백에선 반 픽셀 위상이 생긴다 — 폴백은 느린 기기 전용) */
  var ZOOM_STEPS = [1, 1.25, 1.5, 2];
  /* 방 5×5 m (x,z ∈ [-2.5, 2.5]). 뒷벽 오른쪽 끝의 문으로 나간다 (§13.2 의 앞쪽 문은 직교 시점에서 바닥을 가려 뒷벽으로 옮김) */
  var R = 2.5;
  var ANCHORS = { door: [1.95, 0, -2.05], window: [-1.8, 0, 0.4], crate: [1.25, 0, -1.0], board: [0.1, 0, -2.0], blanket: [-1.0, 0, 1.5], center: [0, 0, 0.2] };
  var EXPRESSIONS = ['idle', 'blink', 'happy', 'pet', 'sleep', 'curious', 'calm', 'sleepy'];   /* 표정 8 (DESIGN §15.2) — 장면과 초상이 setExpression 하나로 공유 */

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
  var PX = 1 / SNAP_N;                                                            /* 아트 픽셀 한 변(월드 m, 기본 p=2 줌 1) = 1/27 m ≈ 3.7 cm */
  function snapPos(v) { return Math.round(v * SNAP_N) / SNAP_N; }                /* 정적 소품 위치를 빌드 때 이 격자에 스냅 (룩 패스 5·8) */

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
      mouth: oklabToHex([clamp(lab[0] - 0.32, 0.1, 1), lab[1] * 0.8, lab[2] * 0.6]), eye: '#1b1f2e', white: '#fff6ee',
      blush: oklabToHex([clamp(lab[0] + 0.3, 0, 0.96), lab[1] + 0.02, lab[2] + 0.02]) };   /* 홍조 원판: 몸보다 훨씬 밝고(L+0.3, 빨판과 비슷) 조금 더 붉게 — 홍조로 밝아진 몸(hi 쪽 35 %) 위에서도 한 칸 이상 뜬다 */
  }

  /* ───────────────────────── GLSL 후처리 ───────────────────────── */
  var VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  var FRAG = [
    '#include <packing>',
    'varying vec2 vUv;',
    'uniform sampler2D tDiffuse, tDepth, tNormal, uBayer, tBloom; uniform vec2 uRes; uniform float uNear, uFar;',
    'uniform vec3 uPalOk[72]; uniform vec3 uPalRgb[72]; uniform int uPalN; uniform vec3 uW;',
    'uniform float uDither, uOutline, uHasNormal, uVig, uBloom, uKeepAlpha, uFade; uniform vec3 uFadeOk;',   /* uFade (바깥·전환): 0 = 끔, 1 = 전부 허공색 — 정렬 Bayer 로 픽셀 단위 디더 페이드 */   /* uKeepAlpha 1 = 뷰티 알파를 그대로 (초상 투명 배경) */
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
    '  if (bayer(ap) + 0.5 < uFade) ok = uFadeOk;',   /* 장소 전환 크로스페이드: 아트 픽셀 단위 정렬 디더로 허공색에 덮였다 걷힌다 (uFade 0 이면 bayer+0.5 ≥ 1/32 라 늘 통과 = 변화 없음) */
    '  float best = 1e9, bestL = 0.0; int bi = 0;',
    '  for (int i = 0; i < 72; i++) { if (i >= uPalN) break;',
    '    vec3 d = (ok - uPalOk[i]) * uW; float q = dot(d, d);',
    '    if (q < best - 0.0005 || (q < best + 0.0005 && uPalOk[i].x > bestL)) { best = q; bi = i; bestL = uPalOk[i].x; } }',  /* 근소 동률 → 밝은 쪽 */
    '  gl_FragColor = vec4(uPalRgb[bi], mix(1.0, texture2D(tDiffuse, vUv).a, uKeepAlpha));',
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
      look: Object.assign({ pixelSize: DEF_P, dither: 0.25, outline: true, yaw: 0, key: LIGHTS.day.sunI, fill: LIGHTS.day.hemiI }, opts.look || {}), zoom: 0, palette: paletteSource(opts.palette || PAL_DEFAULT) };
    st.look.key = clamp(+st.look.key || LIGHTS.day.sunI, 0.5, 4); st.look.fill = clamp(+st.look.fill || LIGHTS.day.hemiI, 0, 1);
    var PAL = buildPalette(st.color, st.palette), OC = octDerived(st.color);
    var disposables = [], unbind = [], raf = 0, lastDraw = 0, frameNo = 0, drawN = 0, time = 0, calls = 0, ready = false;
    function listen(el, ev, fn, o) { el.addEventListener(ev, fn, o); unbind.push(function () { el.removeEventListener(ev, fn, o); }); }
    function keep(x) { disposables.push(x); return x; }

    /* ── 렌더러 · 타깃 · 후처리 ── */
    var renderer = new T.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'low-power' });
    var glCtx = renderer.getContext();
    function ctxLost() { return st.lost || !!(glCtx && glCtx.isContextLost && glCtx.isContextLost()); }   /* 잃음 이벤트는 한 틱 늦게 온다 — 그 사이 렌더하면 셰이더 컴파일이 null 로그에서 터진다 */
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
      uDither: { value: 0 }, uOutline: { value: hasDepthTex ? 1 : 0 }, uHasNormal: { value: 1 }, uVig: { value: hasDepthTex ? 1 : 0 }, uBayer: { value: keep(bayerTex()) }, uKeepAlpha: { value: 0 }, uFade: { value: 0 }, uFadeOk: { value: new T.Vector3(0, 0, 0) } } }));
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
    var EXT_TARGET = new T.Vector3(0.4, 1.55, 0.0);   /* 바깥 디오라마 카메라 타깃 (같은 요·틸트·픽셀 밀도; 집 용마루·굴뚝과 오른쪽 아래 가장자리 출구가 한 화면에) */
    function camTargetNow() {   /* look.focus='oct': 문어 중심 (look-shots close). 장소 그룹은 순수 평행이동이라 부모 위치를 더하면 월드 좌표. 입장 연출 중이면 그 위로 introOffset() 만큼 (하늘) */
      var b;
      if (st.look.focus === 'oct' && octG) { _tg.copy(octG.position).add(_focusUp); if (octG.parent) _tg.add(octG.parent.position); b = _tg; }
      else b = PLACE.vis === 'exterior' ? EXT_TARGET : camTarget;
      return INTRO.on ? _ti.copy(b).setY(b.y + introOffset()) : b;
    }
    var PLACE = { cur: 'attic', vis: 'attic', trans: null, fade: 0 };   /* cur = 요청된 장소, vis = 지금 그려지는 장소 (전환 앞 절반은 나가는 쪽) */
    var _focusUp = new T.Vector3(0, 0.45, 0), _ti = new T.Vector3();
    /* ── 입장 연출 (docs/UI_ART.md "입장"): 하늘에서 내려오는 카메라. 직교라 타깃을 위로 올리면 = 하늘을 보는 것 → 구름층을 지나 비를 뚫고 다락에 착지.
       움직이는 건 타깃 y 오프셋 하나뿐이고, 픽셀 격자 스냅은 placeCamera 의 snapScreen 이 그대로 해 준다 (서브픽셀 크리프 없음, 스텝은 정수 px).
       곡선: 0~86 % easeOutCubic 으로 H → 0, 72~100 % 에 착지 눌림(D = 아트 3px 만큼 더 내려갔다가 사인으로 복귀). 모션 감소면 연출 없이 바로 착지. */
    var INTRO = { on: false, t: 0, dur: 2.2, H: 0, D: 0, resolve: null, sky: null, acc: 0, hold: false };
    function introOffset() {
      var k = clamp(INTRO.t / INTRO.dur, 0, 1), u = clamp(k / 0.86, 0, 1);
      return INTRO.H * Math.pow(1 - u, 3) - (k > 0.72 ? INTRO.D * Math.sin(Math.PI * clamp((k - 0.72) / 0.28, 0, 1)) : 0);
    }
    var S = { W: 0, H: 0, p: DEF_P, rw: 4, rh: 4, cw: 4, ch: 4, N: SNAP_N, pw: PX, offX: 0, offY: 0 };   /* pw = pixelWorldSize: 아트 픽셀 한 변(월드 m), resize 에서 프러스텀 폭 / 타깃 폭 */
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
      var W = container.clientWidth || 320, H = container.clientHeight || 240, p = Math.max(st.look.pixelSize | 0 || DEF_P, Math.ceil(W / 480));
      var rw = Math.max(8, Math.floor(W / p)), rh = Math.max(8, Math.floor(H / p));
      S.W = W; S.H = H; S.p = p; S.rw = rw; S.rh = rh; S.cw = rw * p; S.ch = rh * p; S.offX = Math.floor((W - S.cw) / 2); S.offY = Math.floor((H - S.ch) / 2);
      S.N = Math.round(PX_PER_M * 3 / p * ZOOM_STEPS[st.zoom]);   /* 픽셀을 줄이면 같은 구도에 디테일만 는다 */
      renderer.setSize(S.cw, S.ch, false); canvas.style.width = S.cw + 'px'; canvas.style.height = S.ch + 'px';
      rt.setSize(rw, rh); rtN.setSize(rw, rh); rtE.setSize(rw, rh); rtB.setSize(rw, rh); post.uniforms.uRes.value.set(rw, rh);
      blurOn = p < 4;
      camera.left = -rw / 2 / S.N; camera.right = rw / 2 / S.N; camera.top = rh / 2 / S.N; camera.bottom = -rh / 2 / S.N; camera.updateProjectionMatrix();
      S.pw = (camera.right - camera.left) / rw;   /* pixelWorldSize = 직교 프러스텀 폭 / 렌더 타깃 폭 (= 1/N: p=3 줌 1 → 1/18 m, p=2 → 1/27, 줌 ×2 → 1/36) */
      placeCamera();
      if (ready) { layoutWeather(false); if (CURT.frame) curtainFrame(1); anim.dustInit = false; extApplyWeather(); }   /* 룩 패스 7: 격자가 바뀌면 비·눈·물방울·커튼·먼지를 새 픽셀 중심에 재스냅 */
    }

    /* ── 장면 · 조명 ── */
    var scene = new T.Scene(); scene.background = C(LIGHTS.night.bg);
    /* 장소 (바깥·계절·전환, DESIGN §15.3): 다락 전체 = atticG, 바깥 디오라마 = extG. 한 번에 하나만 visible (그 장소만 그려지고 그림자를 던진다).
       태양·헤미·필은 장면 공유(시각대 LIGHTS), 등불·양초 점광은 atticG 안이라 바깥에선 안 켜진다. 문어(octG)는 지금 보이는 장소 그룹의 자식으로 옮겨 다닌다 */
    var atticG = new T.Group(); atticG.name = 'attic'; scene.add(atticG);
    var extG = new T.Group(); extG.name = 'exterior'; extG.visible = false; scene.add(extG);
    /* 키 = 창 쪽 방향광 (그림자맵 2048, PCF radius 1, bias −0.0002, normalBias 0.025, 그림자 카메라는 applyLight 에서 방(차폐 포함)에 꼭 맞춤) */
    var sun = new T.DirectionalLight(0xffffff, 1); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.025; sun.shadow.radius = 1;
    sun.target.position.set(0, 0.5, 0); scene.add(sun); scene.add(sun.target);
    var hemi = new T.HemisphereLight(0xffffff, 0x000000, 0.3); scene.add(hemi);
    var fill = new T.DirectionalLight(0xffffff, 0); fill.position.set(6, 3, 8); fill.target.position.set(0, 0.5, 0); scene.add(fill); scene.add(fill.target);   /* 필: 카메라 쪽, 그림자 없음 (뒷벽·왼벽·바닥을 살짝 들어 올린다) */
    var lampPos = new T.Vector3(snapPos(-1.6), 1.95, snapPos(-0.9));
    var lamp = new T.PointLight(C('#ffb066').getHex(), 0, 6, 2); lamp.position.set(0, -0.1, 0);   /* 등불 그룹의 자식 (룩 패스 7: 흔들림을 따라간다) — 아래 lampG.add */
    var candleLight = new T.PointLight(C('#ffb066').getHex(), 0, 2, 2); atticG.add(candleLight);   /* 양초 = 두 번째 작은 따뜻한 점광 (0.35, d 2) */
    /* 빛 차폐 (룩 패스 4): 보이지 않는 지붕·앞벽·오른벽. 그림자만 던지고(colorWrite 끔) 노멀 패스에서는 숨긴다 → 태양·달이 창으로만 들어와 바닥에 창 모양 빛 조각 */
    var SHADE = [[-3.1, 3.1], [-0.6, 3.25], [-3.1, 3.1]];   /* 그림자 카메라 피팅용 상자 (x · y · z) */
    var SHADE_EXT = [[-3.7, 3.7], [-0.6, 3.6], [-3.7, 3.7]];   /* 바깥: 받침 + 집(용마루 2.94 · 굴뚝 3.3) + 나무 — 장소마다 그림자 카메라를 다시 맞춘다 */
    var shade = new T.Mesh(keep(mergeParts([{ g: box(6.2, 0.05, 6.2), m: M(0, 3.08, 0), c: '#000000' }, { g: box(6.2, 3.7, 0.05), m: M(0, 1.35, 3.05), c: '#000000' }, { g: box(0.05, 3.7, 6.2), m: M(3.05, 1.35, 0), c: '#000000' },
      { g: box(0.05, 3.7, 0.7), m: M(-2.6, 1.35, 2.75), c: '#000000' }])),   /* 왼쪽 벽 앞 날개: 벽 끝(z 2.5)과 앞벽 차폐 사이로 새는 빛을 막는다 */
      keep(new T.MeshBasicMaterial({ colorWrite: false, depthWrite: false })));
    shade.castShadow = true; shade.receiveShadow = false; shade.frustumCulled = false; shade.renderOrder = -10; atticG.add(shade);
    var _sm = new T.Matrix4(), _sv = new T.Vector3();
    function fitShadow() { /* 방 상자 8꼭짓점을 빛 공간으로 → 직교 그림자 카메라를 딱 맞춘다 (p=3 에서 아트px 당 ≥ 10 텍셀) */
      _sm.lookAt(sun.position, sun.target.position, _ay).transpose();
      var mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
      for (var i = 0; i < 8; i++) {
        var SB = PLACE.vis === 'exterior' ? SHADE_EXT : SHADE;
        _sv.set(SB[0][i & 1], SB[1][(i >> 1) & 1], SB[2][(i >> 2) & 1]).sub(sun.position).applyMatrix4(_sm);
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
      if (PLACE.vis === 'exterior') sun.position.set(10 * Math.cos(elev) * Math.cos(az), 10 * Math.sin(elev) + 0.5, -10 * Math.cos(elev) * Math.sin(az));   /* 바깥: 차폐 없음, 해는 화면 오른쪽 옆(+x −z)에서 — 현관·계단 면(+x)이 밝고 그림자는 왼쪽으로 */
      else sun.position.set(-10 * Math.cos(elev) * Math.cos(az), 10 * Math.sin(elev) + 0.5, 10 * Math.cos(elev) * Math.sin(az));
      fitShadow();
      hemi.color.copy(lerpC(a.sky, b.sky, e)); hemi.groundColor.copy(lerpC(a.gnd, b.gnd, e)); hemi.intensity = num('hemiI') * fillK() * (PLACE.vis === 'exterior' ? 1 + 1.2 * clamp((num('em') - 0.25) / 0.75, 0, 1) : 1);   /* 바깥은 열린 하늘: 밤 헤미 ×2.2 (다락은 그대로) */
      fill.color.copy(lerpC(a.fill, b.fill, e)); fill.intensity = num('fillI') * fillK();
      glass.material.color.copy(lerpC(a.out, b.out, e));
      winEm.material.color.copy(lerpC(a.winEm, b.winEm, e));
      scene.background.copy(lerpC(a.bg, b.bg, e));
      light.lamp = num('lamp'); light.lampD = num('lampD'); light.glow = num('glow'); light.pool = num('pool'); light.candle = num('candle'); light.em = num('em');
      light.out = lerpC(a.out, b.out, e).clone(); light.winEm = lerpC(a.winEm, b.winEm, e).clone();
      lampDirty = true; if (extReady) extApplyLight();
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
    var FLOOR_SEAM = 0.05, FLOOR_PITCH = 2 * R / 23;   /* 이음 0.05 m ≈ 1.35 px @ p=2 (룩 패스 8: 0.09 는 p=2 에서 2~3 px 띠였다) */
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
    var SLAB_OV = 6 * PX, SLAB_W = 2 * R + 2 * SLAB_OV;   /* p=2 격자: 돌출 6px(0.222 m) · 지층 6px + 1px 줄 + 6px = 13px = 0.48 m (룩 패스 8, 세계 치수는 패스 5 와 같다) */
    parts.push({ g: box(SLAB_W, 6 * PX, SLAB_W), m: M(0, -3 * PX, 0), c: MAT.slabTop });
    parts.push({ g: box(SLAB_W + 0.02, PX, SLAB_W + 0.02), m: M(0, -6.5 * PX, 0), c: MAT.slabLine });
    parts.push({ g: box(SLAB_W, 6 * PX, SLAB_W), m: M(0, -10 * PX, 0), c: MAT.slabBase });
    /* 벽 2면: 가로 널 10줄 0.3 m (창·문 구멍) + 줄 사이 1px 이음(W2, 0.045 m 높이 ≈ 1.2 px @ p=2 — 룩 패스 8, 전엔 0.08) + 세로 샛기둥 3개씩 */
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
        parts.push({ g: box(0.02, 0.045, WIN.z0 + R), m: M(-R + 0.065, yb, (-R + WIN.z0) / 2), c: MAT.wallSeam });
        parts.push({ g: box(0.02, 0.045, R - WIN.z1), m: M(-R + 0.065, yb, (WIN.z1 + R) / 2), c: MAT.wallSeam });
      } else parts.push({ g: box(0.02, 0.045, 2 * R), m: M(-R + 0.065, yb, 0), c: MAT.wallSeam });
      if (yb < DOOR.h) {
        parts.push({ g: box(DOOR.x0 + R, 0.045, 0.02), m: M((-R + DOOR.x0) / 2, yb, -R + 0.065), c: MAT.wallSeam });
        parts.push({ g: box(R - DOOR.x1, 0.045, 0.02), m: M((DOOR.x1 + R) / 2, yb, -R + 0.065), c: MAT.wallSeam });
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
    var room = new T.Mesh(keep(mergeParts(parts)), lambert); room.receiveShadow = true; room.castShadow = true; atticG.add(room);
    var roomHi = new T.Mesh(keep(mergeParts(hiParts)), lambert); roomHi.castShadow = false; roomHi.receiveShadow = false; atticG.add(roomHi);
    var doorDark = new T.Mesh(keep(new T.PlaneGeometry(DOOR.x1 - DOOR.x0, DOOR.h)), keep(new T.MeshBasicMaterial({ color: C(PAL.ink) })));
    doorDark.position.set((DOOR.x0 + DOOR.x1) / 2, DOOR.h / 2, -R + 0.02); atticG.add(doorDark);
    var glass = new T.Mesh(keep(new T.PlaneGeometry(WIN.z1 - WIN.z0, WIN.y1 - WIN.y0)), keep(new T.MeshBasicMaterial({ color: C('#141c33') })));
    glass.position.set(-R + 0.01, (WIN.y0 + WIN.y1) / 2, (WIN.z0 + WIN.z1) / 2); glass.rotation.y = Math.PI / 2; glass.userData.kind = 'window'; atticG.add(glass);
    var winEm = emTwin(glass, glass.geometry);   /* 창 유리 발광 (시각대 winEm: 낮 하늘 밝게 · 밤 희미한 차가운 색) */
    /* 등불 */
    var lampG = new T.Group(); lampG.position.copy(lampPos); atticG.add(lampG); lampG.add(lamp);
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
    lampPool.rotation.x = -Math.PI / 2; lampPool.position.set(lampPos.x, 0.015, lampPos.z); lampPool.renderOrder = 2; atticG.add(lampPool);
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
      if (extReady) extApplyLight();   /* 바깥 다락 창 불빛 = 등불 칸 수 */
    }

    /* ── 창밖 날씨 ── */
    function points(n, hex, size) {
      var g = keep(new T.BufferGeometry()), arr = new Float32Array(n * 3);
      g.setAttribute('position', new T.BufferAttribute(arr, 3));
      var p = new T.Points(g, keep(new T.PointsMaterial({ color: C(hex), size: size || 1, sizeAttenuation: false })));
      p.frustumCulled = false; p.castShadow = false; atticG.add(p); return p;
    }
    function lines(n, hex) { /* 1px 선분 n개 (LineSegments 1 드로우콜) */
      var g = keep(new T.BufferGeometry()); g.setAttribute('position', new T.BufferAttribute(new Float32Array(n * 6), 3));
      var l = new T.LineSegments(g, keep(new T.LineBasicMaterial({ color: C(hex) }))); l.frustumCulled = false; l.castShadow = false; atticG.add(l); return l;
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
      if (extReady) extApplyWeather();
    }
    function stepWeather(dt) {
      if (st.reduced) return;   /* 모션 감소: 비·눈·물방울 정지 (보이기만) */
      anim.rainAcc += dt; var n = 0;
      while (anim.rainAcc >= RAIN_DT - 1e-6 && n < 3) { anim.rainAcc -= RAIN_DT; anim.step++; n++; layoutWeather(true); }
      if (n === 3) anim.rainAcc = 0;
    }

    /* ── 소품 (§4) ── */
    var props = {}, propDecals = null;
    function addProp(key, mesh, decalR) { mesh.castShadow = true; mesh.visible = false; mesh.traverse(function (o) { if (o.isMesh) o.receiveShadow = true; });   /* 룩 패스 4: 닫힌 방이라 소품도 지붕 그림자를 받아야 창 빛 조각만 밝다 */ mesh.userData.decalR = decalR || 0; props[key] = mesh; atticG.add(mesh); }
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
      if (propDecals) { atticG.remove(propDecals); propDecals.geometry.dispose(); propDecals = null; }
      var dp = [];
      Object.keys(props).forEach(function (k) { var m = props[k]; if (m.visible && m.userData.decalR) dp.push({ g: new T.PlaneGeometry(m.userData.decalR * 2, m.userData.decalR * 2), m: M(m.position.x, 0.012, m.position.z, -Math.PI / 2, 0, 0), c: '#ffffff' }); });
      if (dp.length) { propDecals = new T.Mesh(mergeParts(dp), decalMat); propDecals.renderOrder = 1; atticG.add(propDecals); }
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
      posterMeshes = posterMeshes.filter(function (m) { if (keepIds[m.userData.id]) return true; atticG.remove(m); if (m.material !== posterMat) { if (m.material.map) m.material.map.dispose(); m.material.dispose(); } return false; });
      list.forEach(function (p, i) {
        var m = posterMeshes.filter(function (x) { return x.userData.id === p.id; })[0];
        if (!m) {
          m = new T.Mesh(posterGeo, posterMat); m.userData = { kind: 'poster', id: p.id }; m.castShadow = false; m.receiveShadow = true;
          atticG.add(m); posterMeshes.push(m);
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
      souvMeshes.forEach(function (m) { atticG.remove(m); });
      souvMeshes = [];
      var cols = [PAL.amber[3], PAL.moss[2], PAL.sky[2], PAL.dusk[2], PAL.rose[2], PAL.paper[2]];
      (list || []).slice(-8).forEach(function (sv) {
        var r = hash(sv.id), shape = r % 3, g = shape === 0 ? new T.SphereGeometry(0.11, 7, 5) : shape === 1 ? box(0.18, 0.18, 0.18) : new T.CylinderGeometry(0.02, 0.11, 0.22, 6);
        var m = new T.Mesh(keep(g), souvMat(cols[(r >> 4) % cols.length])); m.userData = { kind: 'souvenir', sv: sv, h: shape === 0 ? 0.11 : shape === 1 ? 0.09 : 0.11 }; m.castShadow = true; m.receiveShadow = true;
        atticG.add(m); souvMeshes.push(m);
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
    var octG = new T.Group(), bodyG = new T.Group(); octG.add(bodyG); atticG.add(octG); octG.scale.setScalar(OCT_R);
    var EYE = [[-0.30, 0.67, 0.90], [0.30, 0.67, 0.90]], EYE_R = 0.24, PUPIL_R = 0.13;   /* 둘 다 정면(+z), 몸 중심보다 아래 (레퍼런스) */
    var headParts = [{ g: new T.SphereGeometry(1, 20, 14), m: M(0, HEAD_Y, 0, 0, 0, 0, 1, HEAD_SQ, 1), c: OC.body, tag: 1 },
      { g: new T.SphereGeometry(0.3, 9, 7), m: M(-0.45, 1.50, 0.52, 0.5, -0.4, 0, 1, 0.55, 0.5), c: OC.hi, tag: 2 },   /* 왼쪽 위 하이라이트 패치 */
      { g: new T.SphereGeometry(0.07, 6, 5), m: M(-0.56, 1.62, 0.6), c: OC.white },
      { g: box(0.30, 0.07, 0.08), m: M(0, 0.44, 0.82), c: OC.mouth, tag: 3 }];   /* `_` 입: 눈 아래, 폭 0.3 r × 0.07 r (p=2 에서 3×1 px) */
    EYE.forEach(function (e) { headParts.push({ g: new T.SphereGeometry(EYE_R, 10, 8), m: M(e[0], e[1], e[2], 0, 0, 0, 1, 1, 0.55), c: OC.white }); });
    var headGeo = keep(mergeParts(headParts)), head = new T.Mesh(headGeo, toon); head.castShadow = true; head.receiveShadow = true; bodyG.add(head);
    var pupils = EYE.map(function (e) {   /* 동공 0.13 r + 흰 글린트 1px */
      var g = keep(mergeParts([{ g: new T.SphereGeometry(PUPIL_R, 8, 6), m: M(0, 0, 0), c: OC.eye }, { g: new T.SphereGeometry(0.07, 5, 4), m: M(-0.045, 0.05, 0.10), c: OC.white }]));   /* 글린트 0.07 r ≈ 3 cm → p=2 에서 1 px */
      var m = new T.Mesh(g, toon); m.receiveShadow = true; m.position.set(e[0], e[1], e[2] + 0.14); bodyG.add(m); return m;
    });
    /* ── 얼굴 부품 (룩 패스 8 표정 · DESIGN §15.2): 장면과 초상이 setExpression 하나로 공유. 전부 기하(구·토러스·박스, 토운 재질)라 64 px 초상에서도 읽힌다. idle 에선 아래 전부 숨김 → 방 패스 드로우콜 그대로.
       눈꺼풀 = 몸색 구 r 0.27 (z 0.85 배, 앞면 z+0.25) — y 오프셋으로 반쯤 감김(calm 0.28 = 50 %, sleepy 0.21 = 65 %; 이때 동공을 z+0.10 으로 물려 눈꺼풀 뒤에 둔다). 감은 눈은 동공 숨김.
       `— —` 선: blink 0.30×0.07 직선 · sleep 0.42×0.07 눈 아래 0.04, 바깥 끝 8° 처짐 · `^ ^` 호 토러스 r 0.17 관 0.06 · 홍조 원판 r 0.15 ×2 · 큰 눈 흰자 ×1.3(curious, 동공도 ×1.3) · `u` 입 = 아래 반원 토러스 r 0.13 (happy·pet, `_` 입 위에 겹쳐 웃는 입). 선·호는 z+0.26 (눈꺼풀 앞) */
    var lidGeo = keep(mergeParts(EYE.map(function (e) { return { g: new T.SphereGeometry(EYE_R + 0.03, 10, 8), m: M(e[0], e[1], e[2] + 0.02, 0, 0, 0, 1, 1, 0.85), c: OC.body, tag: 1 }; })));
    var lids = new T.Mesh(lidGeo, toon); lids.visible = false; lids.receiveShadow = true; bodyG.add(lids);
    var arcs = new T.Mesh(keep(mergeParts(EYE.map(function (e) { return { g: new T.TorusGeometry(0.17, 0.06, 5, 8, Math.PI), m: M(e[0], e[1] - 0.04, e[2] + 0.26), c: OC.eye }; }))), toon); arcs.visible = false; bodyG.add(arcs);
    var blush = new T.Mesh(keep(mergeParts([[-0.52, 0.50, 0.80], [0.52, 0.50, 0.80]].map(function (p) { return { g: new T.CircleGeometry(0.15, 8), m: M(p[0], p[1], p[2], 0, p[0] < 0 ? -0.4 : 0.4, 0), c: OC.blush, tag: 5 }; }))), toon); blush.visible = false; bodyG.add(blush);
    var linesB = new T.Mesh(keep(mergeParts(EYE.map(function (e) { return { g: box(0.30, 0.07, 0.06), m: M(e[0], e[1], e[2] + 0.26), c: OC.eye }; }))), toon); linesB.visible = false; bodyG.add(linesB);
    var linesS = new T.Mesh(keep(mergeParts(EYE.map(function (e) { return { g: box(0.42, 0.07, 0.06), m: M(e[0], e[1] - 0.04, e[2] + 0.26, 0, 0, e[0] < 0 ? 0.14 : -0.14), c: OC.eye }; }))), toon); linesS.visible = false; bodyG.add(linesS);
    var bigEyes = new T.Mesh(keep(mergeParts(EYE.map(function (e) { return { g: new T.SphereGeometry(EYE_R * 1.3, 10, 8), m: M(e[0], e[1], e[2], 0, 0, 0, 1, 1, 0.55), c: OC.white }; }))), toon); bigEyes.visible = false; bigEyes.receiveShadow = true; bodyG.add(bigEyes);
    var smile = new T.Mesh(keep(mergeParts([{ g: new T.TorusGeometry(0.13, 0.035, 5, 8, Math.PI), m: M(0, 0.57, 0.90, 0, 0, Math.PI), c: OC.mouth, tag: 3 }])), toon); smile.visible = false; bodyG.add(smile);
    /* 다리 키포인트 [바깥 거리, 높이(뿌리 기준), 반지름]: 뿌리는 몸 안(0.62 r, 0.30 r), 밑면이 바닥(y=0)에 닿고 끝이 들린다 */
    var ARM = [[0, 0, 0.19], [0.26, -0.12, 0.17], [0.50, -0.17, 0.14], [0.70, -0.19, 0.11], [0.82, -0.08, 0.065]], ARM_ROOT = [0.60, 0.30];
    function armParts() {
      var ps = [{ g: new T.SphereGeometry(ARM[0][2], 8, 6), m: M(0, 0, 0), c: OC.body, tag: 1 }];
      for (var k = 0; k < ARM.length - 1; k++) {
        var a0 = ARM[k], a1 = ARM[k + 1], dx = a1[0] - a0[0], dy = a1[1] - a0[1];
        ps.push({ g: new T.CylinderGeometry(a1[2], a0[2], Math.hypot(dx, dy), 7), m: M((a0[0] + a1[0]) / 2, (a0[1] + a1[1]) / 2, 0, 0, 0, Math.atan2(dy, dx) - Math.PI / 2), c: OC.body, tag: 1 });
        ps.push({ g: new T.SphereGeometry(a1[2], 7, 5), m: M(a1[0], a1[1], 0), c: OC.body, tag: 1 });   /* 관절을 둥글게 */
      }
      /* 빨판 3 (룩 패스 8: r 0.08/0.075/0.07 ≈ 3 cm → p=2 에서 1 px 점): 들린 끝마디 밑면 2 + 그 앞 마디 밑면 1 (바깥을 향해 보인다) */
      var p3 = ARM[3], p4 = ARM[4], d = [p4[0] - p3[0], p4[1] - p3[1]], dl = Math.hypot(d[0], d[1]), n = [d[1] / dl, -d[0] / dl];
      ps.push({ g: new T.SphereGeometry(0.08, 5, 4), m: M((p3[0] + p4[0]) / 2 + n[0] * 0.07, (p3[1] + p4[1]) / 2 + n[1] * 0.07, 0), c: OC.pale, tag: 4 });
      ps.push({ g: new T.SphereGeometry(0.075, 5, 4), m: M(p4[0] + n[0] * 0.06, p4[1] + n[1] * 0.06, 0), c: OC.pale, tag: 4 });
      var p2 = ARM[2], d2 = [p3[0] - p2[0], p3[1] - p2[1]], dl2 = Math.hypot(d2[0], d2[1]), n2 = [d2[1] / dl2, -d2[0] / dl2];
      ps.push({ g: new T.SphereGeometry(0.07, 5, 4), m: M((p2[0] + p3[0]) / 2 + n2[0] * 0.09, (p2[1] + p3[1]) / 2 + n2[1] * 0.09, 0), c: OC.pale, tag: 4 });
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
    var ARMW = arms.map(function (_, i) { var r = hash('armw' + i); return { ph: r % 32, per: 16 + ((r >> 8) % 17) }; });
    /* ── 걸음 = 뒤뚱뒤뚱 (생동감 · DESIGN §7.1 · docs/SCENE.md "움직임"): 시간이 아니라 **간 거리**로 도는 걸음 위상(보폭 0.6 m = 한 걸음 → 1.2 m/s 에서 한 발 0.5 s, 바깥 길 1.8 m/s 면 0.33 s 로 저절로 빨라진다).
       위상 n.u — n = 걸음 번호(짝수 = +x 쪽 다리 4개가 앞으로, 홀수 = −x 쪽), u = 걸음 안 0→1. 몸: 진행 축(로컬 z) 기준 굴림 ±7°(걸음 중간 정점, 디딤발 쪽으로 기대고 내딛는 쪽이 들린다) ·
       요 흔들 ±4°(디딤 순간 정점) · 앞 기울임 5° · 걸음 중간 세로 +1 아트px · 디딤마다 6 % 눌림(y 0.94, xz 1.03) 80 ms → 80 ms 회복.
       굴림은 **3단 스텝**(−7° / 0 / +7°, |sin πu| > 0.6 일 때만 기울어짐 — 매끈한 굴림은 둥근 머리 외곽이 매 프레임 1px 씩 흘러 반짝였다, walk-strip 비교) · 요도 같은 3단.
       다리: 내딛는 쪽 4개가 들리며(최대 0.38 rad) 앞으로 ±14° 쓸고, 다음 걸음엔 디딘 채 뒤로 민다; 다리 위상은 몸 위상을 60 ms 늦게 따라간다(겹침). 굴림·기울임으로 바닥 아래로 내려가는 다리는 그만큼 들어 보정.
       시작 = 120 ms 예비 동작(제자리 8 % 눌림 + 뒤로 3°, 이동은 그 뒤 — 원천(moveTo·cerWalk)이 그만큼 멈춰 있다) · 회전은 첫 걸음 동안(거리 기준) · 멈춤 = 굴림이 0 을 한 번 넘었다 돌아오는 0.36 s 정착 + 1px 한 번 통통.
       모션 감소 = 전부 없음(이동 자체가 즉시). 초상은 정지 자세로 찍고 되돌린다 */
    var GAIT = { stride: 0.6, roll: 7 * DEG, yaw: 4 * DEG, lean: 5 * DEG, sq: [1.03, 0.94], plant: 0.08, antic: 0.12, anticSq: [1.04, 0.92], anticLean: -3 * DEG, lag: 0.06, settle: 0.36, armLift: 0.38, armFwd: 14 * DEG, stepped: true };
    var G = { moving: false, phase: 0, armPhase: 0, n: 0, plantT: 9, antic: 0, moveK: 0, armK: 0, settleT: 9, rollStop: 0, last: new T.Vector3(), turnFrom: 0, turnTo: 0, turnPh: 0, roll: 0, yaw: 0, lean: 0, rz: 0 };
    function anticHold() { if (st.reduced || G.moving || G.antic > 0) return 0; G.antic = GAIT.antic * st.speed; return G.antic; }   /* 걷기 원천이 시작할 때: 서 있다 출발하면 120 ms 제자리 예비 동작 */
    function angDiff(a, b) { var d = a - b; return Math.atan2(Math.sin(d), Math.cos(d)); }
    function gaitReset() { G.moving = false; G.antic = 0; G.moveK = 0; G.armK = 0; G.settleT = 9; G.plantT = 9; G.roll = G.yaw = G.lean = 0; G.armPhase = G.phase; }   /* 다리 끝 꿈틀: 시드 위상 · 주기 16~32 스텝(2~4 s @ 8 fps) */
    var octTags = [headGeo, lidGeo].concat(arms.map(function (m) { return m.geometry; }));
    function octColor(hex) { octTags.forEach(function (g) { recolor(g, 1, hex); }); }
    function setColor(hex) {
      if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return;
      st.color = hex; OC = octDerived(hex); PAL = buildPalette(hex, st.palette); uploadPalette();
      octColor(hex); recolor(headGeo, 2, OC.hi); recolor(headGeo, 3, OC.mouth); recolor(blush.geometry, 2, OC.hi);
      arms.forEach(function (m) { recolor(m.geometry, 4, OC.pale); }); recolor(blush.geometry, 5, OC.blush); recolor(smile.geometry, 3, OC.mouth);
      oct.wiggle = 0.7;   /* 색을 바꾸면 한 번 흔들 (§14) */
      portraitFlush();
    }
    /* ── 표정 (룩 패스 8): lid = 눈꺼풀 y 오프셋(null 숨김 · 0 완전히 감음) · pupil = 동공 배율(0 숨김) · pz = 동공 z · dy = 동공 y 오프셋 · pose = 초상·모션 감소 정지 자세 [sx, sy, rz] */
    var FACES = {
      idle: { lid: null, pupil: 1, pz: 0.14 },
      blink: { lid: 0, pupil: 0, linesB: true },
      happy: { lid: 0, pupil: 0, arcs: true, smile: true },
      pet: { lid: 0, pupil: 0, arcs: true, smile: true, blush: true, pose: [1.06, 0.88, 0] },
      sleep: { lid: 0, pupil: 0, linesS: true, pose: [1.03, 0.94, 0] },
      curious: { lid: null, pupil: 1.3, pz: 0.14, big: true, pose: [1, 1, -8 * DEG] },
      calm: { lid: 0.28, pupil: 1, pz: 0.10 },
      sleepy: { lid: 0.21, pupil: 1, pz: 0.10, dy: -0.05, pose: [1.02, 0.96, 0] }
    };
    var OPEN_EYES = { idle: 1, curious: 1, calm: 1, sleepy: 1 };                              /* 깜빡임이 끼어드는 표정 */
    var STATE_EXPR = { happy: 'happy', pet: 'pet', sleep: 'sleep', anticipate: 'calm' };   /* 상태 → 기본 표정 (나머지는 idle). app.js 가 나중에 setExpression 으로 덮어쓴다 (DESIGN §15.2) */
    var face = { expr: 'idle', applied: '', t: 0, hopsLeft: 0, dy: 0 };
    function applyFace(name) {
      var f = FACES[name] || FACES.idle;
      lids.visible = f.lid != null; lids.position.y = f.lid || 0;
      pupils.forEach(function (p, k) { p.visible = f.pupil > 0; p.scale.setScalar(f.pupil || 1); p.position.z = EYE[k][2] + (f.pz || 0.14); });
      arcs.visible = !!f.arcs; smile.visible = !!f.smile; blush.visible = !!f.blush; linesB.visible = !!f.linesB; linesS.visible = !!f.linesS; bigEyes.visible = !!f.big;
      face.applied = name; face.dy = f.dy || 0;
    }
    function syncFace() { var eff = oct.blinkLeft > 0 ? 'blink' : face.expr; if (eff !== face.applied) applyFace(eff); }
    function setExpression(name) {
      name = FACES[name] ? name : 'idle';
      if (name !== face.expr) { face.expr = name; face.t = 0; face.hopsLeft = name === 'happy' ? 2 : 0; }
      else if (name === 'happy') { face.t = 0; face.hopsLeft = 2; }   /* 다시 happy → 다시 폴짝 */
      if (!OPEN_EYES[name]) oct.blinkLeft = 0;
      syncFace();
    }

    /* ── 초상 (DESIGN §15.2 · 룩 패스 8): 문어 **머리만** 잡는 두 번째 직교 카메라(정면 + 위 15°, 거리 10 r, 프러스텀 2.16 r = 머리 2 r + 외곽선 여백, 타깃은 머리 중심보다 0.14 r 아래) → 64×64 RT → 같은 후처리(팔레트 스냅·외곽선; 디더 0·비네트 0·블룸 0) → 2D 캔버스.
       레이어 2 = 머리·눈 부품 + 전용 3점 조명(따뜻한 키 · 차가운 필 · 림 + 약한 앰비언트, 시각대와 무관 → 얼굴이 늘 읽힌다). 방 소품·다리·시각대 조명은 레이어 0 이라 안 찍힌다(three 는 조명도 레이어로 거른다).
       표정·몸색·팔레트·배경 키로 캐시 — 매 프레임 X. 찍는 동안 몸 변환(눌림·폴짝·기울임)·표정·색을 표정의 정지 자세로 바꿨다가 되돌린다 */
    var PORT = { N: 64, hw: 1.3, tilt: 15 * DEG, dist: 10, down: 0.07, cache: {}, ms: 0, n: 0, warm: false };   /* 프러스텀 반폭 1.08 r · 위에서 15° · 거리 10 r · 타깃 = 머리 중심 0.14 r 아래 (눈이 아래 ⅔, 입·턱이 들어오고 정수리는 살짝 잘린다) */
    [head, lids, arcs, blush, linesB, linesS, bigEyes, smile].concat(pupils, arms).forEach(function (m) { m.layers.enable(2); });   /* 피드백: 떠 있는 머리만이 아니라 뭉툭한 다리 8(빨판 포함)도 초상에 */
    var rigG = new T.Group(); octG.add(rigG);
    function rigLight(hex, i, x, y, z) { var l = new T.DirectionalLight(C(hex).getHex(), i); l.position.set(x, y, z); l.target.position.set(0, HEAD_Y, 0); l.layers.set(2); rigG.add(l); rigG.add(l.target); return l; }
    rigLight('#ffe4c4', 0.9, -1.2, 2.4, 2.0); rigLight('#b8ccff', 0.4, 2.0, 1.2, 1.4); rigLight('#ffffff', 0.35, 0.6, 2.6, -1.6);   /* 키(좌상 앞, 따뜻) · 필(우 앞, 차가움) · 림(뒤 위) */
    var rigAmb = new T.AmbientLight(0xffffff, 0.18); rigAmb.layers.set(2); rigG.add(rigAmb);
    var pCam = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 12), _pp = new T.Vector3(), _pt = new T.Vector3(), _cc = new T.Color(); pCam.layers.set(2);
    var rtP = keep(new T.WebGLRenderTarget(PORT.N, PORT.N, { minFilter: T.NearestFilter, magFilter: T.NearestFilter, format: T.RGBAFormat, type: T.UnsignedByteType, depthBuffer: true, stencilBuffer: false,
      depthTexture: hasDepthTex ? new T.DepthTexture(PORT.N, PORT.N, T.UnsignedIntType) : undefined }));
    rtP.texture.encoding = T.sRGBEncoding; rtP.texture.generateMipmaps = false;
    var rtPN = keep(new T.WebGLRenderTarget(PORT.N, PORT.N, { minFilter: T.NearestFilter, magFilter: T.NearestFilter, format: T.RGBAFormat, depthBuffer: true, stencilBuffer: false }));
    var rtPO = keep(new T.WebGLRenderTarget(PORT.N, PORT.N, { minFilter: T.NearestFilter, magFilter: T.NearestFilter, format: T.RGBAFormat, type: T.UnsignedByteType, depthBuffer: false, stencilBuffer: false }));
    var postP = keep(new T.ShaderMaterial({ depthTest: false, depthWrite: false, vertexShader: VERT, fragmentShader: FRAG, uniforms: {   /* 팔레트·가중치·Bayer 유니폼 객체는 post 와 공유 (uploadPalette 한 번) */
      tDiffuse: { value: rtP.texture }, tDepth: { value: rtP.depthTexture || rtPN.texture }, tNormal: { value: rtPN.texture }, tBloom: { value: rtPN.texture }, uBloom: { value: 0 },
      uRes: { value: new T.Vector2(PORT.N, PORT.N) }, uNear: { value: pCam.near }, uFar: { value: pCam.far },
      uPalOk: post.uniforms.uPalOk, uPalRgb: post.uniforms.uPalRgb, uPalN: post.uniforms.uPalN, uW: post.uniforms.uW,
      uDither: { value: 0 }, uOutline: { value: hasDepthTex ? 1 : 0 }, uHasNormal: { value: 1 }, uVig: { value: 0 }, uBayer: post.uniforms.uBayer, uKeepAlpha: { value: 1 }, uFade: { value: 0 }, uFadeOk: { value: new T.Vector3(0, 0, 0) } } }));
    var pBuf = new Uint8Array(PORT.N * PORT.N * 4);
    function portraitBg(o) { var b = o && o.bg; if (!b || b === 'transparent') return null; if (b === 'navy') return '#172038'; return /^#[0-9a-f]{6}$/i.test(b) ? b : null; }   /* 기본 투명 · 'navy' = Apollo 남색 · '#rrggbb' */
    function renderPortrait(expr, bgHex) {
      var t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0;
      var sv = { sx: bodyG.scale.x, sy: bodyG.scale.y, sz: bodyG.scale.z, py: bodyG.position.y, rz: bodyG.rotation.z, rx: bodyG.rotation.x, ry: bodyG.rotation.y, arms: arms.map(function (m) { return [m.rotation.y, m.rotation.z]; }), vis: octG.visible, pvis: octG.parent ? octG.parent.visible : true, applied: face.applied, hex: oct.curHex || st.color, bg: scene.background };
      var sc = renderer.getClearColor(_cc).clone(), sa = renderer.getClearAlpha();
      var pose = FACES[expr].pose || [1, 1, 0];
      applyFace(expr);
      var hex = expr === 'pet' ? mixHex(st.color, OC.hi, 0.35) : expr === 'sleep' ? hueHex(st.color, 12) : st.color;   /* pet = 장면의 홍조 끝값, sleep = 색 순환 한 자락 */
      if (hex !== sv.hex) octColor(hex);
      octG.visible = true; if (octG.parent) octG.parent.visible = true; bodyG.scale.set(pose[0], pose[1], pose[0]);   /* 문어가 숨은 장소 그룹에 있어도 찍힌다 (레이어 2 만 그리므로 장소 내용·조명은 안 들어온다) */ bodyG.position.y = 0; bodyG.rotation.set(0, 0, pose[2]);
      arms.forEach(function (m) { m.rotation.y = -m.userData.a; m.rotation.z = 0.05; });   /* 걸음 중이어도 초상은 정지 자세 (다리 기본 0.05) */
      octG.updateMatrixWorld(true);
      var ty = (HEAD_Y - PORT.down) * pose[1];
      _pt.set(0, ty, 0); octG.localToWorld(_pt);
      _pp.set(0, ty + PORT.dist * Math.sin(PORT.tilt), PORT.dist * Math.cos(PORT.tilt)); octG.localToWorld(_pp);
      var hw = PORT.hw * OCT_R; pCam.left = -hw; pCam.right = hw; pCam.top = hw; pCam.bottom = -hw; pCam.updateProjectionMatrix();
      pCam.position.copy(_pp); pCam.up.set(0, 1, 0); pCam.lookAt(_pt); pCam.updateMatrixWorld();
      scene.background = bgHex ? C(bgHex) : null;
      renderer.setClearColor(bgHex ? C(bgHex) : 0x000000, bgHex ? 1 : 0);
      renderer.setRenderTarget(rtP); renderer.clear(true, true, false); renderer.render(scene, pCam);
      scene.overrideMaterial = normalMat; scene.background = null;
      renderer.setRenderTarget(rtPN); renderer.clear(true, true, false); renderer.render(scene, pCam);
      scene.overrideMaterial = null;
      quad.material = postP; renderer.setRenderTarget(rtPO); renderer.render(quadScene, quadCam); quad.material = post;
      renderer.readRenderTargetPixels(rtPO, 0, 0, PORT.N, PORT.N, pBuf);
      /* 되돌리기 */
      scene.background = sv.bg; renderer.setClearColor(sc, sa); renderer.setRenderTarget(null);
      octG.visible = sv.vis; if (octG.parent) octG.parent.visible = sv.pvis; bodyG.scale.set(sv.sx, sv.sy, sv.sz); bodyG.position.y = sv.py; bodyG.rotation.set(sv.rx, sv.ry, sv.rz);
      arms.forEach(function (m, i) { m.rotation.y = sv.arms[i][0]; m.rotation.z = sv.arms[i][1]; });
      if (hex !== sv.hex) octColor(sv.hex);
      applyFace(sv.applied);
      var N = PORT.N, cv = document.createElement('canvas'); cv.width = cv.height = N;
      var cx = cv.getContext('2d'), img = cx.createImageData(N, N);
      for (var y = 0; y < N; y++) img.data.set(pBuf.subarray((N - 1 - y) * N * 4, (N - y) * N * 4), y * N * 4);   /* GL 은 아래→위 */
      cx.putImageData(img, 0, 0);
      if (t0) PORT.ms = +(performance.now() - t0).toFixed(2); PORT.n++;
      return cv;
    }
    function portraitKey(expr, o) { return expr + '|' + st.color + '|' + PAL.source + '|' + (portraitBg(o) || 't'); }
    function portrait(expr, o) { /* → 64×64 캔버스 (CSS 로 키운다). 기본은 캐시의 복사본(로그 행마다 하나씩 붙일 수 있게), o.shared = 캐시 캔버스 그대로 */
      expr = FACES[expr] ? expr : 'idle';
      var k = portraitKey(expr, o), e = PORT.cache[k];
      if (!e && ctxLost()) { var blank = document.createElement('canvas'); blank.width = blank.height = PORT.N; return blank; }   /* 컨텍스트 잃음: GL 읽기 오류 대신 빈 초상 (캐시하지 않음 → 복구 뒤 다시 그림) */
      if (!e) e = PORT.cache[k] = { cv: renderPortrait(expr, portraitBg(o)), url: '' };
      if (o && o.shared) return e.cv;
      var cv = document.createElement('canvas'); cv.width = cv.height = PORT.N; cv.getContext('2d').drawImage(e.cv, 0, 0); return cv;
    }
    function portraitURL(expr, o) { expr = FACES[expr] ? expr : 'idle'; var cv = portrait(expr, Object.assign({}, o, { shared: true })), e = PORT.cache[portraitKey(expr, o)]; if (!e.url) e.url = cv.toDataURL('image/png'); return e.url; }
    function portraitFlush() { PORT.cache = {}; }
    function anchorPos(name) { var p = ANCHORS[name] || ANCHORS.center; return new T.Vector3(p[0], name === 'blanket' && st.items.indexOf('blanket') >= 0 ? 0.12 : 0, p[2]); }
    function camYaw() { return YAW + yawDelta(); }
    /* 문어 위치: oct.pos 가 논리 위치(보간·앵커), octG.position 은 매 프레임 그걸 카메라 우/상 축 픽셀 격자에 스냅한 값 (룩 패스 5: 걷는 동안 반 픽셀 금지). 스냅을 매 프레임 논리값에서 새로 하므로 요가 바뀌어도 누적 표류 없음 */
    function jumpTo(anchor) { if (oct.walking) { oct.walking.cancel(); oct.walking = null; } oct.anchor = anchor; oct.pos.copy(anchorPos(anchor)); snapScreen(octG.position.copy(oct.pos)); oct.wantYaw = oct.faceYaw = camYaw(); gaitReset(); }
    function moveTo(anchor) {
      var to = anchorPos(anchor), from = oct.pos.clone();
      oct.anchor = anchor;
      if (oct.walking) { oct.walking.cancel(); oct.walking = null; }
      var d = to.clone().sub(from), dist = d.length();
      function done() { if (on.anchorReached) on.anchorReached(anchor); }
      if (st.reduced || ctxLost() || dist < 0.05) { oct.pos.copy(to); snapScreen(octG.position.copy(to)); oct.wantYaw = camYaw(); done(); return Promise.resolve(anchor); }   /* 컨텍스트를 잃으면 프레임이 안 돌아 걸음이 안 끝난다 → 바로 도착 */
      oct.wantYaw = Math.atan2(d.x, d.z);
      var dur = dist / 1.2 * st.speed, hopDur = 0.3 * st.speed, hold = anticHold(), k = 0, cancelled = false;   /* hold = 서 있다 출발할 때 120 ms 예비 동작 (뒤뚱 걸음) */
      return new Promise(function (resolve) {
        var w = oct.walking = { gait: true, cancel: function () { cancelled = true; w.gait = false; },
          finish: function () { if (cancelled) return; cancelled = true; w.gait = false; oct.pos.copy(to); oct.hop = 0; oct.walking = null; oct.wantYaw = camYaw(); done(); resolve(anchor); },   /* 컨텍스트 잃음: 남은 걸음을 건너뛰고 도착 */
          step: function (dt) {
          if (cancelled) return;
          k += dt;
          if (k < hold) return;
          var kw = k - hold;
          if (kw < dur) { oct.pos.lerpVectors(from, to, kw / dur); return; }
          w.gait = false;
          var hk = (kw - dur) / hopDur;
          if (hk < 1) { oct.pos.copy(to); oct.hop = Math.sin(hk * Math.PI) * 0.4; return; }
          oct.hop = 0; oct.walking = null; oct.wantYaw = camYaw(); done(); resolve(anchor);
        } };
      });
    }
    var octState = { carrySvg: null, hang: null, carryId: null };   /* carryId = 들고 있는 포스터의 여행 id (APP 의 carry { svg, id }) */
    function setOctState(s, extra) {
      st.octState = s; oct.animT = 0;
      if (opts.octEl) opts.octEl.className = opts.octEl.className.replace(/\bst-[a-z]+/g, '').trim() + ' st-' + s;
      var away = s === 'away';
      octG.visible = !away; octDecal.visible = !away;
      setExpression(STATE_EXPR[s] || 'idle');   /* 상태의 기본 표정 (룩 패스 8) */
      if (s === 'carry') { carry.visible = true; if (extra && extra.id) octState.carryId = extra.id; if (extra && extra.svg) bakeSVG(extra.svg, 48, 64).then(function (t) { if (t) carry.material = new T.MeshPhongMaterial({ map: t, shininess: 0, specular: 0x000000 }); }); }
      else if (s === 'hang') { if (carry.visible && !st.reduced) startHang(); carry.visible = false; octState.carryId = null; }
      else { carry.visible = false; octState.carryId = null; }
      if (s !== 'walk' && s !== 'carry' && !oct.walking) oct.wantYaw = camYaw();
      if (s === 'idle' || s === 'stay') oct.wantYaw = camYaw();
    }
    var hangFly = null;
    function startHang() {
      /* 건너뛰기·데모 재생은 벽을 먼저 그린다 → 들고 온 포스터가 이미 벽에 있으면 그 칸으로, 아니면 다음 칸 */
      var on = octState.carryId ? posterMeshes.filter(function (m) { return m.userData.id === octState.carryId; })[0] : null;
      var from = carry.getWorldPosition(new T.Vector3()), slot = on ? [on.position.x, on.position.y, on.position.z] : posterSlot(Math.min(lastPosterCount, 5)), to = new T.Vector3(slot[0], slot[1], slot[2]);
      var fly = new T.Mesh(posterGeo, carry.material); fly.position.copy(from); fly.scale.setScalar(carry.scale.x * OCT_R); atticG.add(fly);
      hangFly = { m: fly, from: from, to: to, k: 0, dur: 0.5 * st.speed, s0: fly.scale.x };   /* 들고 있던 크기 → 보드 크기 */
    }
    function stepHang(dt) {
      if (!hangFly) return;
      hangFly.k += dt; var k = Math.min(1, hangFly.k / hangFly.dur), e = k * k * (3 - 2 * k);
      hangFly.m.position.lerpVectors(hangFly.from, hangFly.to, e); hangFly.m.position.y += Math.sin(k * Math.PI) * 0.4; hangFly.m.scale.setScalar(hangFly.s0 + (1 - hangFly.s0) * e);
      if (k >= 1) { atticG.remove(hangFly.m); hangFly = null; }
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
    function stepGait(dt, on) {   /* 걸음 위상을 간 거리로 진행 + 시작/멈춤 전이. on = 걷기 원천이 움직이는 중(예비 동작 포함) */
      var p = oct.pos;
      if (G.antic > 0) G.antic = Math.max(0, G.antic - dt);
      if (!on) G.antic = 0;
      var moving = on && G.antic <= 0;
      G.plantT += dt; G.settleT += dt;   /* 먼저 더한다 → 디딤을 감지한 프레임은 0 (눌림 80 ms 가 12 fps 에서도 한 프레임은 온전히 보인다) */
      if (moving) {
        if (!G.moving) { G.last.copy(p); G.n = Math.floor(G.phase); G.turnFrom = oct.faceYaw; G.turnTo = oct.wantYaw; G.turnPh = G.phase; G.settleT = 9; }
        G.phase += Math.min(0.3, Math.hypot(p.x - G.last.x, p.z - G.last.z)) / GAIT.stride;
        var n = Math.floor(G.phase); if (n !== G.n) { G.n = n; G.plantT = 0; }   /* 새 걸음 = 디딤 */
        if (Math.abs(angDiff(oct.wantYaw, G.turnTo)) > 1e-3) { G.turnFrom = oct.faceYaw; G.turnTo = oct.wantYaw; G.turnPh = G.phase; }   /* 길 꺾임: 다음 한 걸음 동안 돈다 */
      } else if (G.moving) {   /* 멈춤: 정착 시작 (굴림이 거의 0 이면 다음 쪽으로 반 굴림에서 출발) */
        G.settleT = 0; G.plantT = 0; G.rollStop = Math.abs(G.roll) > 2 * DEG ? G.roll : GAIT.roll * 0.5 * ((G.n & 1) ? 1 : -1);
      }
      G.last.copy(p); G.moving = moving;
      G.moveK = clamp(G.moveK + (moving ? dt : -dt) / 0.15, 0, 1);
      var lk = 1 - Math.exp(-dt / GAIT.lag);
      G.armK += ((moving ? 1 : 0) - G.armK) * lk; G.armPhase += (G.phase - G.armPhase) * lk;
      /* 굴림·요·기울임 */
      var u = G.phase - Math.floor(G.phase), sg = (Math.floor(G.phase) & 1) ? -1 : 1, sr = Math.sin(Math.PI * u), cy = Math.cos(Math.PI * u);
      if (moving) {
        G.roll = sg * GAIT.roll * (GAIT.stepped ? (sr > 0.6 ? 1 : 0) : sr);
        G.yaw = sg * GAIT.yaw * (GAIT.stepped ? (cy > 0.6 ? 1 : cy < -0.6 ? -1 : 0) : cy);
      } else if (G.settleT < GAIT.settle) {   /* r0 → 0 → −⅓ r0 → 0 (넘었다 한 번 돌아옴) */
        var k = G.settleT / GAIT.settle, r = G.rollStop * (1 - k) * Math.cos(1.5 * Math.PI * k);
        G.roll = GAIT.stepped ? Math.round(r / (GAIT.roll * 0.5)) * GAIT.roll * 0.5 : r; G.yaw *= Math.max(0, 1 - dt / 0.1);
      } else { G.roll = 0; G.yaw = 0; }
      G.lean = G.antic > 0 ? GAIT.anticLean : GAIT.lean * G.moveK;
    }
    function gaitBody() {   /* → [xz 배율, y 배율, 세로 오프셋(r 단위)] */
      var sx = 1, sy = 1, by = 0, up = pxUp() / OCT_R;
      if (G.antic > 0) return [GAIT.anticSq[0], GAIT.anticSq[1], 0];
      if (G.plantT < 2 * GAIT.plant) { var k = G.plantT < GAIT.plant ? 1 : 2 - G.plantT / GAIT.plant; sx = 1 + (GAIT.sq[0] - 1) * k; sy = 1 + (GAIT.sq[1] - 1) * k; }   /* 디딤 눌림 80 ms + 회복 80 ms */
      if (G.moving && Math.sin(Math.PI * (G.phase - Math.floor(G.phase))) > 0.5) by = up;   /* 걸음 중간 +1px (디딤 땐 0) */
      if (!G.moving && G.settleT > 0.1 && G.settleT < 0.22) by = up;   /* 정착 통통 1번 */
      return [sx, sy, by];
    }
    function stepOct(dt) {
      var s = st.octState === 'away' && PK.on ? 'idle' : st.octState, t = time, red = st.reduced;   /* 바깥 기웃 중엔 'away' 라도 보이는 문어 (숨쉬기·깜빡임) */
      var pkb = PK.on ? pkBody(dt) : null; if (!pkb) { PK.leanQ = 0; PK.arm = 0; }
      oct.animT += dt;
      if (oct.walking) oct.walking.step(dt);
      snapScreen(octG.position.copy(oct.pos));   /* 화면 픽셀 격자에 스냅 (걷기 보간은 oct.pos 에서 매끄럽게, 보이는 위치는 정수 픽셀) */
      stepGait(dt, !red && ((oct.walking && oct.walking.gait) || CER.walk));
      /* 방향: 걷는 중엔 첫 걸음(거리) 동안 새 방향으로 돈다 · 예비 동작 중엔 그대로 · 그 밖엔 지수 접근 */
      var dy = angDiff(oct.wantYaw, oct.faceYaw);
      if (red) oct.faceYaw += dy;
      else if (G.moving) { var tk = clamp(G.phase - G.turnPh, 0, 1); oct.faceYaw = G.turnFrom + angDiff(G.turnTo, G.turnFrom) * tk * tk * (3 - 2 * tk); }
      else if (G.antic <= 0) oct.faceYaw += dy * Math.min(1, dt * 8);
      octG.rotation.y = oct.faceYaw;
      /* 몸 */
      var sx = 1, sy = 1, by = oct.hop, tb = Math.floor(t * 8) / 8, ex = face.expr, splay = 0, rz = 0;   /* 숨쉬기는 8 fps 스텝 샘플 (룩 패스 7) */
      face.t += dt;
      /* 포인터 쪽 (동공 방향 · curious 기울임; 포인터가 없으면 오른쪽) */
      var look = oct.lookTarget || oct.pointer, px = 0, py = 0;
      if (look) { var sp = octScreen(), r = canvas.getBoundingClientRect(); px = clamp((look.x - (r.left + sp.x - S.offX)) / 140, -1, 1); py = clamp((look.y - (r.top + sp.y - S.offY + 30)) / 140, -1, 1); }
      var dir = px < -0.05 ? 1 : -1;
      /* 과장 동작 (룩 패스 8, 표정 기준 — 상태는 기본 표정으로 매핑): happy 폴짝 2 + 꼭대기에서 다리 바깥 ×1.3 · curious 포인터 쪽 8° 기울임 · pet 12 % 눌림 + 느린 좌우 흔들 ±4° · sleep 6 % 납작 + 색 순환 · anticipate(상태) 600 ms 눌림 + calm 반눈 */
      if (!red) {
        if (s === 'idle' || s === 'stay') { sy = 1 - 0.03 * (0.5 + 0.5 * Math.sin(tb * Math.PI / 2)); sx = 1 + 0.02 * (0.5 + 0.5 * Math.sin(tb * Math.PI / 2)); }
        if (ex === 'sleep') { sy = 0.94 - 0.02 * Math.sin(tb * Math.PI / 2.5); sx = 1.03; }
        var gs = gaitBody(); sx *= gs[0]; sy *= gs[1]; by += gs[2];   /* 뒤뚱: 디딤 눌림 · 예비 눌림 · 걸음 중간 1px · 정착 통통 */
        if (s === 'anticipate') { var ak = Math.min(1, oct.animT / 0.6); sx = 1 + 0.05 * ak; sy = 1 - 0.08 * ak; }
        if (ex === 'pet') { var pk = 0.5 + 0.5 * Math.sin(t * Math.PI / 0.6); sx = 1.06 + 0.03 * pk; sy = 0.88 - 0.03 * pk; rz = Math.sin(t * Math.PI / 0.8) * 4 * DEG; }
        if (ex === 'curious') rz = -8 * DEG * dir;
        if (ex === 'happy' && face.hopsLeft > 0) { var hk = (face.t % 0.45) / 0.45; splay = Math.sin(hk * Math.PI); by += splay * 0.5; if (face.t > 0.9) { face.hopsLeft = 0; splay = 0; } }
        if (s === 'peek') G.rz = Math.sin(t * 4.5) * 0.12; else G.rz += (rz - G.rz) * Math.min(1, dt * 8);
        if (oct.wiggle > 0) { oct.wiggle -= dt; G.rz = Math.sin(oct.wiggle * 30) * 0.1 * oct.wiggle; }
        if (pkb) { sx *= pkb[0]; sy *= pkb[1]; by += pkb[2]; }
        bodyG.rotation.set(G.lean + PK.leanQ, G.yaw, G.rz + G.roll);   /* 표정 기울임(부드럽게) + 걸음 굴림(3단 스텝) · 요 흔들 · 앞 기울임 */
      } else {   /* 모션 감소: 표정의 정지 자세 */
        var pose = FACES[ex].pose; if (pose) { sx = pose[0]; sy = pose[1]; rz = pose[2]; }
        if (ex === 'curious') rz = -8 * DEG * dir;
        if (s === 'anticipate') { sx = 1.05; sy = 0.92; }
        if (ex === 'happy') splay = 1;
        if (pkb) { sx *= pkb[0]; sy *= pkb[1]; }
        G.rz = rz; bodyG.rotation.set(PK.leanQ, 0, rz);
      }
      bodyG.scale.set(sx, sy, sx); bodyG.position.y = snapUp(by * OCT_R) / OCT_R;   /* 폴짝·통통도 세로 정수 픽셀로 */
      /* 다리: 0 = 끝이 바닥에 닿은 자세, 흔들림은 위로만. idle 다리 끝 미세 꿈틀(룩 패스 7) = 8 fps 스텝, 다리마다 시드 주기(2~4 s)로 2스텝(0.25 s)만 끝이 화면 세로 **1px** 들림(각도 = asin(1px / 다리 길이)), 걷기는 연속 그대로 */
      anim.armAcc += dt; while (anim.armAcc >= ARM_DT - 1e-6) { anim.armAcc -= ARM_DT; anim.armStep++; } if (anim.armAcc > 1) anim.armAcc = 0;
      var armUp = Math.asin(clamp(pxUp() / (ARM[4][0] * OCT_R * sy), 0, 1));
      /* 걸음 다리: 위상(60 ms 늦게 따라감) n.u — 짝수 걸음 = +x 쪽 4개가 내딛는 쪽(들림 sin πu, 뒤→앞 쓸기), 나머지는 디딘 채 앞→뒤로 민다. armK 로 정지 자세와 섞는다 */
      var ak = G.armK, an = Math.floor(G.armPhase), au = G.armPhase - an, swingPos = (an & 1) === 0;
      for (var i = 0; i < 8; i++) {
        var arm = arms[i], base = 0, w = ARMW[i], ca = Math.cos(arm.userData.a), sa = Math.sin(arm.userData.a);
        arm.scale.x = 1 + 0.3 * splay;   /* happy 꼭대기: 다리 바깥으로 ×1.3 */
        if (red) { arm.rotation.z = base + PK.arm; arm.rotation.y = -arm.userData.a; continue; }
        var still = s === 'sleep' ? base + 0.02 : base + 0.05 + (((anim.armStep + w.ph) % w.per) < 2 ? armUp : 0);
        var comp = Math.max(0, -(G.roll) * ca) + Math.max(0, G.lean * sa), lift = 0, fwd = 0;   /* 굴림·기울임으로 바닥 밑으로 가는 다리를 그만큼 든다 */
        if (ak > 0.001) { var sw = (ca > 0) === swingPos; lift = sw ? GAIT.armLift * Math.sin(Math.PI * au) : 0; fwd = sw ? 2 * au - 1 : 1 - 2 * au; }
        arm.rotation.z = (still + PK.arm) * (1 - ak) + (base + 0.05 + lift) * ak + comp;
        arm.rotation.y = -arm.userData.a + fwd * ak * GAIT.armFwd * (ca > 0 ? 1 : -1);
      }
      /* 눈 깜빡임 (룩 패스 7: 눈 뜬 표정에서만 3~7 s 시드 간격, 120 ms — 눈꺼풀 + 짧은 선 = blink 표정이 끼어든다; 모션 감소면 없음) · 동공 */
      if (OPEN_EYES[ex] && s !== 'away' && !red) {
        oct.blinkT -= dt; if (oct.blinkT <= 0) { oct.blinkLeft = 0.12; oct.blinkN = (oct.blinkN | 0) + 1; oct.blinkT = 3 + (hash('blink' + oct.blinkN) % 1000) / 1000 * 4; }
        if (oct.blinkLeft > 0) oct.blinkLeft = Math.max(0, oct.blinkLeft - dt);
      } else oct.blinkLeft = 0;
      syncFace();
      pupils.forEach(function (p, k) { p.position.x += ((EYE[k][0] + px * 0.07) - p.position.x) * Math.min(1, dt * 10); p.position.y += ((EYE[k][1] + face.dy - py * 0.06) - p.position.y) * Math.min(1, dt * 10); });
      /* 색: 잠(색 순환 ±18°) · 쓰다듬기(따뜻한 홍조) — 표정 기준 */
      var want = ex === 'pet' ? 1 : 0; oct.flushK += (want - oct.flushK) * Math.min(1, dt * 3);
      var hex = st.color;
      if (ex === 'sleep') hex = hueHex(hex, Math.sin(t * Math.PI / 6) * 18);
      if (oct.flushK > 0.02) hex = mixHex(hex, OC.hi, oct.flushK * 0.35);
      if (hex !== oct.curHex) { oct.curHex = hex; octColor(hex); }
      octDecal.material.opacity = 0.42;
    }

    /* ═══════════════ 바깥 디오라마 · 계절 · 전환 (DESIGN §15.3 · assets/ref/look-ref-exterior-winter.jpg) ═══════════════
       같은 요 45°·틸트 32°·픽셀 밀도(27 px/m @ p=2)·팔레트·후처리. 받침은 같은 지층(풀/흙 2+4px · 1px 줄 · 6px)으로 6.4 m (다락 5 m).
       집 = 다락이 우리 방인 작은 집: 용마루가 x 방향, 박공(+x 면)에 현관문 + 다락 창, 왼쪽(+z) 긴 벽에 불 켜진 1층 창, 굴뚝. 현관 → 계단 3 → 길 → 오른쪽 아래 가장자리.
       드로우콜: 정적 1(병합, 계절 색은 정점 태그 재색) + 둥근 나무 인스턴스 1 + 원뿔 나무 1 + 울타리 인스턴스 1 + 계절 장식 1(봄 꽃잎·여름 꽃·가을 낙엽·겨울 눈 중 하나) + 창 2(+ 발광 쌍둥이 2) + 현관문 1 + 입자(종류당 Points/LineSegments 1) */
    var extReady = false;
    var EXT = { L: 3.2, HX0: -2.3, HX1: 0.1, HZ0: -2.0, HZ1: -0.2, HZC: -1.1, PL: 0.48, WALL: 1.4, RISE: 0.92 };
    EXT.EAVE = EXT.PL + EXT.WALL; EXT.TOP = EXT.EAVE + EXT.RISE; EXT.RY = EXT.TOP + 0.12;   /* 처마 1.88 · 박공 꼭대기 2.80 · 지붕 밑면 용마루 2.92 */
    var EXT_PATH = [[1.38, -1.06], [1.9, -0.85], [2.5, -0.15], [3.12, 0.5]];   /* 계단 발치 → 오른쪽 아래 가장자리 (x = L) */
    var EXT_TREES = { round: [[-1.7, 1.55, 1.0, 0.3], [1.75, -2.35, 0.9, 1.2]], cone: [[-2.85, -0.3, 1.0, 0.0]] };   /* [x, z, 배율, 요] */
    var EXT_FENCE = [[-1.1, 2.55], [-0.48, 2.58], [0.14, 2.61]], EXT_FENCE_END = [0.76, 2.64];
    var EXT_PUDDLE = [-0.15, 1.05, 0.3, 0.22], EXT_MAILBOX = [0.85, 0.4];   /* 물웅덩이 [x, z, 반지름 x, 반지름 z] (바깥 기웃: 바다) · 우체통 (손·편지의 방) */
    function nearPuddle(x, z, m) { var dx = (x - EXT_PUDDLE[0]) / (EXT_PUDDLE[2] + m), dz = (z - EXT_PUDDLE[1]) / (EXT_PUDDLE[3] + m); return dx * dx + dz * dz < 1; }
    var SEASONS = ['spring', 'summer', 'autumn', 'winter'];
    /* 계절 색 (팔레트 스냅 전 기본색): 땅 · 풀 포기 · 흙길 · 둥근 나무 잎 3단 · 꽃 점 · 원뿔 나무 3단 · 눈 모자(겨울 흰색, 다른 계절엔 잎 윗톤과 같아 안 보인다) */
    var SEASON_C = {
      spring: { ground: '#7aa04c', tuft: '#a6c45e', path: '#7a5a40', leaf: ['#8cc05a', '#b2d273', '#6a9a42'], bloom: '#f2a6c0', cone: ['#3f6a3a', '#4e7c40', '#5f8c48'], cap: '#b2d273' },
      summer: { ground: '#4c7a36', tuft: '#3a6630', path: '#6e5038', leaf: ['#3c6a2e', '#558a3a', '#2a5226'], bloom: '#558a3a', cone: ['#2e5230', '#3a6236', '#46703c'], cap: '#558a3a' },
      autumn: { ground: '#948a34', tuft: '#a8763a', path: '#5e3c2a', leaf: ['#d4782c', '#e8a63e', '#a4482a'], bloom: '#b8402c', cone: ['#3a5a34', '#46663a', '#52703e'], cap: '#e8a63e' },
      winter: { ground: '#e6ecf0', tuft: '#c4d0da', path: '#8c949c', leaf: ['#4e5e58', '#62726a', '#3e4c48'], bloom: '#f4f6f8', cone: ['#2e4a3a', '#3a5844', '#46644c'], cap: '#f4f6f8' }
    };
    var EXT_WATER = { spring: '#5a86a8', summer: '#4a7c9c', autumn: '#5a7890', winter: '#b4cede' };   /* 물웅덩이 (겨울 = 얼음, 잔물결 없음) */
    var EXT_C = { wallA: '#56606a', wallB: '#606a74', seam: '#2a2e38', post: W[1], plinth: '#6e6872', plinthLine: '#4a4650', roof: '#a04838', roofLine: '#6a2c2c', ridge: '#6a2c2c',
      chim: '#7a6a66', chimRim: '#4e4448', door: '#996643', frame: '#efe3c8', step: ['#8a5a3c', '#7b4f35'], rail: '#6a4630', stone: ['#a8a29a', '#8a8580'], rock: ['#77737f', '#9b97a3'],
      mail: '#b04a3c', mailFlag: '#e8b04a', fence: '#a07a52', snow: '#f2f4f6', trunk: '#6a4630' };
    var ep = [], extPropN = 0;
    function E(g, m, c, tag) { ep.push({ g: g, m: m, c: c, tag: tag || 0 }); }
    function nearPath(x, z, r) { for (var i = 0; i < EXT_PATH.length - 1; i++) { var a = EXT_PATH[i], b = EXT_PATH[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz), 0, 1); if (Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) < r) return true; } return false; }
    function inHouse(x, z, m) { return x > EXT.HX0 - m && x < EXT.HX1 + 1.25 + m && z > EXT.HZ0 - m && z < EXT.HZ1 + m; }
    function nearTree(x, z, r) { return EXT_TREES.round.concat(EXT_TREES.cone).some(function (t) { return Math.hypot(x - t[0], z - t[1]) < r; }); }
    (function buildExterior() {
      var L = EXT.L, SW = 2 * L + 2 * SLAB_OV, H = EXT, Lx = H.HX1 - H.HX0, Lz = H.HZ1 - H.HZ0, xc = (H.HX0 + H.HX1) / 2, sc = SEASON_C.autumn;
      /* 받침: 풀(땅 태그 10) 2px + 흙 4px · 1px 줄 · 아래 지층 6px (다락 받침과 같은 지층·같은 색) */
      E(box(SW, 2 * PX, SW, 6, 1, 6), M(0, -PX, 0), sc.ground, 10);
      E(box(SW, 4 * PX, SW), M(0, -4 * PX, 0), MAT.slabTop);
      E(box(SW + 0.02, PX, SW + 0.02), M(0, -6.5 * PX, 0), MAT.slabLine);
      E(box(SW, 6 * PX, SW), M(0, -10 * PX, 0), MAT.slabBase);
      /* 풀 포기 (1~2px 점, 태그 11): 집·길·나무 자리는 피한다 */
      for (var i = 0, n = 0; i < 90 && n < 46; i++) {
        var r = hash('tuft' + i), x = -L + 0.15 + (r % 1000) / 1000 * (2 * L - 0.3), z = -L + 0.15 + ((r >> 10) % 1000) / 1000 * (2 * L - 0.3);
        if (inHouse(x, z, 0.2) || nearPath(x, z, 0.45) || nearTree(x, z, 0.45) || nearPuddle(x, z, 0.1)) continue;
        E(box(0.07, 0.05 + (r >> 20) % 3 * 0.015, 0.07), M(snapPos(x), 0.025, snapPos(z)), sc.tuft, 11); n++;
      }
      /* 흙길 (태그 12) + 디딤돌: 마디마다 납작 상자, 끝은 받침 가장자리에서 멈춘다 */
      for (i = 0; i < EXT_PATH.length - 1; i++) {
        var a = EXT_PATH[i], b = EXT_PATH[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) + (i < EXT_PATH.length - 2 ? 0.3 : 0.1);
        E(box(len, 0.012, 0.62), M((a[0] + b[0]) / 2, 0.002, (a[1] + b[1]) / 2, 0, -Math.atan2(dz, dx), 0), sc.path, 12);
        var steps = Math.floor(Math.hypot(dx, dz) / 0.42);
        for (var k = 0; k < steps; k++) {
          var t = (k + 0.5) / steps, sx = a[0] + dx * t, sz = a[1] + dz * t, nx = -dz / Math.hypot(dx, dz), nz = dx / Math.hypot(dx, dz), rr = hash('stn' + i + '_' + k), off = ((rr % 3) - 1) * 0.12, w = 0.15 + (rr >> 4) % 4 * 0.02;
          E(box(w, 0.02, w * 0.8), M(snapPos(sx + nx * off), 0.01, snapPos(sz + nz * off), 0, (rr >> 8) % 6 * 0.25, 0), EXT_C.stone[rr & 1]);
        }
      }
      extPropN++;
      /* 집: 받침돌 · 벽 널 7줄(4면을 한 상자로) + 1px 이음 · 모서리 기둥 4 · 박공 널(계단식, 지붕이 덮는다) */
      E(box(Lx + 0.06, H.PL, Lz + 0.06), M(xc, H.PL / 2, H.HZC), EXT_C.plinth);
      E(box(Lx + 0.1, 0.04, Lz + 0.1), M(xc, H.PL - 0.02, H.HZC), EXT_C.plinthLine);
      for (i = 0; i < 7; i++) {
        E(box(Lx, 0.2, Lz, 4, 1, 3), M(xc, H.PL + 0.1 + 0.2 * i, H.HZC), i % 2 ? EXT_C.wallA : EXT_C.wallB);
        if (i) E(box(Lx + 0.02, 0.04, Lz + 0.02), M(xc, H.PL + 0.2 * i, H.HZC), EXT_C.seam);
      }
      [[H.HX0, H.HZ0], [H.HX0, H.HZ1], [H.HX1, H.HZ0], [H.HX1, H.HZ1]].forEach(function (c) { E(box(0.12, H.WALL + 0.04, 0.12), M(c[0], H.PL + H.WALL / 2, c[1]), EXT_C.post); });
      [H.HX0 + 0.06, H.HX1 - 0.06].forEach(function (gx) {
        for (var j = 0; j < 5; j++) { var yc = H.EAVE + 0.1 + 0.2 * j, hw = Math.max(0.06, H.RISE - (yc - H.EAVE) + 0.12); E(box(0.12, 0.2, 2 * hw), M(gx, yc, H.HZC), j % 2 ? EXT_C.wallA : EXT_C.wallB); }
      });
      /* 지붕: 45° 두 판 (처마 0.22 · 박공 0.2 내밈) + 1px 기와 줄 4 + 용마루 */
      var ov = 0.22, hz = Lz / 2 + ov, sl = hz * Math.SQRT2, th = 0.1, RL = Lx + 0.4;
      [1, -1].forEach(function (sg) {
        var ang = sg * Math.PI / 4, ny = Math.SQRT1_2, nz = sg * Math.SQRT1_2;
        E(box(RL, th, sl, 3, 1, 3), M(xc, H.RY - hz / 2 + ny * th / 2, H.HZC + sg * hz / 2 + nz * th / 2, ang, 0, 0), EXT_C.roof, 7);
        [0.32, 0.64, 0.96, 1.28].forEach(function (d) { var q = d / Math.SQRT2; E(box(RL + 0.01, 0.03, 0.035), M(xc, H.RY - q + ny * (th + 0.005), H.HZC + sg * q + nz * (th + 0.005), ang, 0, 0), EXT_C.roofLine); });
      });
      E(box(RL + 0.04, 0.1, 0.18), M(xc, H.RY + 0.12, H.HZC), EXT_C.ridge);
      /* 굴뚝 (지붕 −z 쪽): 몸 + 테 + 검은 구멍 */
      var CH = { x: snapPos(-1.5), z: snapPos(H.HZC - 0.42) };
      E(box(0.34, 1.05, 0.34), M(CH.x, H.TOP - 0.08, CH.z), EXT_C.chim);
      E(box(0.42, 0.1, 0.42), M(CH.x, H.TOP + 0.42, CH.z), EXT_C.chimRim);
      E(box(0.24, 0.02, 0.24), M(CH.x, H.TOP + 0.475, CH.z), PAL.ink);
      extPropN += 2;
      /* 현관: 문 자리(어둠) + 문틀 · 다락 창 틀(박공) · 1층 창 틀(+z 벽) + 창턱 */
      E(new T.PlaneGeometry(0.62, 1.04), M(H.HX1 + 0.004, H.PL + 0.52, H.HZC, 0, Math.PI / 2, 0), PAL.ink);
      [-0.35, 0.35].forEach(function (dz) { E(box(0.08, 1.12, 0.08), M(H.HX1 + 0.03, H.PL + 0.56, H.HZC + dz), W[1]); });
      E(box(0.08, 0.08, 0.78), M(H.HX1 + 0.03, H.PL + 1.1, H.HZC), W[1]);
      var AW = { y: H.EAVE + 0.36, s: 0.36 };
      [[0, AW.s / 2 + 0.03, AW.s + 0.12, 0.06], [0, -AW.s / 2 - 0.03, AW.s + 0.12, 0.06], [AW.s / 2 + 0.03, 0, 0.06, AW.s], [-AW.s / 2 - 0.03, 0, 0.06, AW.s], [0, 0, AW.s, 0.04], [0, 0, 0.04, AW.s]].forEach(function (f) { E(box(0.05, f[3], f[2]), M(H.HX1 + 0.03, AW.y + f[1], H.HZC + f[0]), EXT_C.frame); });
      var GW = { x: snapPos(-1.25), y: H.PL + 0.74, w: 0.5, h: 0.46 };
      [[0, GW.h / 2 + 0.03, GW.w + 0.12, 0.06], [0, -GW.h / 2 - 0.03, GW.w + 0.12, 0.06], [GW.w / 2 + 0.03, 0, 0.06, GW.h], [-GW.w / 2 - 0.03, 0, 0.06, GW.h], [0, 0, 0.04, GW.h], [0, 0, GW.w, 0.04]].forEach(function (f) { E(box(f[2], f[3], 0.05), M(GW.x + f[0], GW.y + f[1], H.HZ1 + 0.03), EXT_C.frame); });
      E(box(GW.w + 0.18, 0.05, 0.14), M(GW.x, GW.y - GW.h / 2 - 0.07, H.HZ1 + 0.06), W[2]);
      extPropN += 3;
      /* 현관 마루 + 계단 3 (0.12 m 씩, 깊이 0.24) + 난간 (기둥 4 · 비스듬한 손잡이 2) */
      E(box(0.38, H.PL, 1.1), M(H.HX1 + 0.19, H.PL / 2, H.HZC), EXT_C.step[0]);
      for (i = 0; i < 3; i++) { var yT = H.PL - 0.12 * (i + 1); E(box(0.24, yT, 1.1), M(H.HX1 + 0.38 + 0.24 * i + 0.12, yT / 2, H.HZC), EXT_C.step[(i + 1) % 2]); }
      [-0.58, 0.58].forEach(function (dz) {
        E(box(0.07, 0.5, 0.07), M(H.HX1 + 0.35, H.PL + 0.25, H.HZC + dz), EXT_C.rail);
        E(box(0.07, 0.56, 0.07), M(H.HX1 + 1.08, 0.28, H.HZC + dz), EXT_C.rail);
        seg(ep, [H.HX1 + 0.35, H.PL + 0.48, H.HZC + dz], [H.HX1 + 1.08, 0.54, H.HZC + dz], 0.03, EXT_C.rail, 4);
      });
      extPropN += 4;
      /* 덤불 2 (잎 태그 13~15 · 꽃 점 16) */
      [[0.5, -0.05, 1.0], [-2.55, 0.05, 0.85]].forEach(function (bsh, bi) {
        var bx = snapPos(bsh[0]), bz = snapPos(bsh[1]), s = bsh[2];
        E(new T.SphereGeometry(0.3 * s, 7, 5), M(bx, 0.22 * s, bz, 0, 0, 0, 1, 0.8, 1), sc.leaf[0], 13);
        E(new T.SphereGeometry(0.22 * s, 7, 5), M(bx + 0.2 * s, 0.2 * s, bz + 0.14 * s), sc.leaf[1], 14);
        E(new T.SphereGeometry(0.2 * s, 6, 5), M(bx - 0.16 * s, 0.18 * s, bz + 0.12 * s), sc.leaf[2], 15);
        for (var d = 0; d < 5; d++) { var rd = hash('bb' + bi + '_' + d), ang = (rd % 100) / 100 * Math.PI * 0.9, el = 0.3 + ((rd >> 8) % 100) / 100 * 0.8; E(box(0.06, 0.06, 0.06), M(bx + Math.cos(ang) * Math.cos(el) * 0.3 * s, 0.22 * s + Math.sin(el) * 0.24 * s, bz + Math.sin(ang) * Math.cos(el) * 0.3 * s), sc.leaf[1], 16); }
        extPropN++;
      });
      /* 돌 2 · 우체통 · 울타리 끝 기둥 */
      [[2.5, -1.5, 1.0], [-0.55, 1.95, 0.75]].forEach(function (rk) { var rx = snapPos(rk[0]), rz = snapPos(rk[1]), s = rk[2];
        E(new T.SphereGeometry(0.24 * s, 6, 4), M(rx, 0.1 * s, rz, 0, 0.4, 0, 1, 0.62, 0.85), EXT_C.rock[0]);
        E(new T.SphereGeometry(0.13 * s, 5, 4), M(rx + 0.2 * s, 0.06 * s, rz + 0.12 * s, 0, 0.9, 0, 1, 0.6, 0.9), EXT_C.rock[1]); extPropN++; });
      var MB = { x: snapPos(0.85), z: snapPos(0.4) };
      E(box(0.07, 0.72, 0.07), M(MB.x, 0.36, MB.z), W[2]);
      E(box(0.34, 0.2, 0.22), M(MB.x, 0.8, MB.z), EXT_C.mail);
      E(box(0.34, 0.04, 0.24), M(MB.x, 0.92, MB.z), '#7a3030');
      E(box(0.03, 0.16, 0.05), M(MB.x - 0.06, 0.96, MB.z + 0.13), EXT_C.mailFlag);
      E(box(0.08, 0.56, 0.08), M(EXT_FENCE_END[0], 0.28, EXT_FENCE_END[1]), EXT_C.fence);
      extPropN += 2;
      /* 물웅덩이 (바깥 기웃 '바다'): 진흙 테(길 태그 12) + 물(태그 17, 계절 재색 — 겨울엔 얼음). 잔물결은 따로 1px 선 (stepPeekProps) */
      var PU = EXT_PUDDLE, pux = snapPos(PU[0]), puz = snapPos(PU[1]);
      E(new T.CylinderGeometry(1, 1, 0.008, 14), M(pux, 0.004, puz, 0, 0, 0, PU[2] + 2 * PX, 1, PU[3] + 2 * PX), sc.path, 12);
      E(new T.CylinderGeometry(1, 1, 0.01, 14), M(pux, 0.007, puz, 0, 0, 0, PU[2], 1, PU[3]), '#5a7890', 17);
      E(box(2 * PX, 0.004, PX), M(pux - 0.1, 0.0125, puz - 0.06), '#c8dce8', 18); E(box(PX, 0.004, PX), M(pux - 0.04, 0.0125, puz - 0.1), '#c8dce8', 18);   /* 하늘 반사 2점 */
      extPropN += 1;
    })();
    var extStatic = new T.Mesh(keep(mergeParts(ep)), lambert); extStatic.castShadow = true; extStatic.receiveShadow = true; extG.add(extStatic);
    /* 바깥 기웃 소품 (평소엔 잔물결만 보인다 — 드로우콜 +2): 잔물결 1px 타원 선 · 덤불 바스락 덮개(앞 덤불 복제, ±1px 흔들) · 우체통 열림(뚫린 입구 + 내려간 뚜껑) */
    var rippleM = (function () {
      var g = new T.BufferGeometry(), pts = [];
      for (var i = 0; i < 20; i++) { var a = i / 20 * Math.PI * 2, b = (i + 1) / 20 * Math.PI * 2; pts.push(Math.cos(a), 0, Math.sin(a) * 0.72, Math.cos(b), 0, Math.sin(b) * 0.72); }
      g.setAttribute('position', new T.Float32BufferAttribute(pts, 3)); keep(g);
      var l = new T.LineSegments(g, keep(new T.LineBasicMaterial({ color: C('#d6e6f0'), depthWrite: false }))); l.position.set(snapPos(EXT_PUDDLE[0]) + 0.03, 0.016, snapPos(EXT_PUDDLE[1]) + 0.02); l.frustumCulled = false; l.visible = false; extG.add(l); return l;
    })();
    var rustleM = new T.Mesh(keep(mergeParts([   /* 앞 덤불 (0.5, −0.05) 의 세 구를 그대로 (태그 13~15, 계절 재색) */
      { g: new T.SphereGeometry(0.3, 7, 5), m: M(0, 0.22, 0, 0, 0, 0, 1, 0.8, 1), c: SEASON_C.autumn.leaf[0], tag: 13 },
      { g: new T.SphereGeometry(0.22, 7, 5), m: M(0.2, 0.2, 0.14), c: SEASON_C.autumn.leaf[1], tag: 14 },
      { g: new T.SphereGeometry(0.2, 6, 5), m: M(-0.16, 0.18, 0.12), c: SEASON_C.autumn.leaf[2], tag: 15 }])), lambert);
    rustleM.position.set(snapPos(0.5), 0, snapPos(-0.05)); rustleM.receiveShadow = true; rustleM.visible = false; extG.add(rustleM);
    var mailOpenM = new T.Mesh(keep(mergeParts([   /* 우체통 +x 끝: 어두운 입구 + 아래 경첩으로 내려간 뚜껑 */
      { g: box(0.012, 0.15, 0.17), m: M(snapPos(EXT_MAILBOX[0]) + 0.176, 0.8, snapPos(EXT_MAILBOX[1])), c: '#1e1418' },
      { g: box(0.16, 0.024, 0.2), m: M(snapPos(EXT_MAILBOX[0]) + 0.17 + 0.08, 0.705, snapPos(EXT_MAILBOX[1])), c: EXT_C.mail }])), lambert);
    mailOpenM.receiveShadow = true; mailOpenM.visible = false; extG.add(mailOpenM);
    /* 나무 (인스턴스): 둥근 나무 = 줄기 + 잎 구 3단(태그 2·3·4) + 눈 모자(5) + 꽃 점(6) · 원뿔 나무 = 줄기 + 원뿔 3단 + 눈 모자 */
    function treeGeo() {
      /* 우듬지 = 겹친 구 4 (세로로 쌓은 눈사람 꼴이 아니라 한 덩어리 구름 꼴): 아래 큰 구 · 좌우 어깨 2 · 꼭대기 */
      var ps = [{ g: new T.CylinderGeometry(0.07, 0.1, 1.0, 6), m: M(0, 0.5, 0), c: EXT_C.trunk, tag: 1 }, { g: new T.CylinderGeometry(0.03, 0.04, 0.4, 5), m: M(0.12, 0.95, 0.04, 0, 0, -0.6), c: EXT_C.trunk, tag: 1 }],
        blobs = [[0, 1.16, 0, 0.5, 2], [0.3, 1.36, 0.14, 0.4, 3], [-0.3, 1.4, -0.1, 0.42, 2], [0.02, 1.64, 0.02, 0.38, 4]];
      blobs.forEach(function (b) {
        ps.push({ g: new T.SphereGeometry(b[3], 8, 6), m: M(b[0], b[1], b[2]), c: SEASON_C.autumn.leaf[b[4] - 2], tag: b[4] });
        ps.push({ g: new T.SphereGeometry(b[3] * 0.82, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), m: M(b[0], b[1] + b[3] * 0.32, b[2], 0, 0, 0, 1, 0.75, 1), c: SEASON_C.autumn.cap, tag: 5 });
      });
      for (var d = 0; d < 14; d++) { var rd = hash('bloom' + d), b = blobs[d % 4], ang = -Math.PI * 0.15 + (rd % 100) / 100 * Math.PI * 0.8, el = -0.2 + ((rd >> 8) % 100) / 100 * 0.9;
        ps.push({ g: box(0.07, 0.07, 0.07), m: M(b[0] + Math.cos(ang) * Math.cos(el) * b[3], b[1] + Math.sin(el) * b[3], b[2] + Math.sin(ang) * Math.cos(el) * b[3]), c: SEASON_C.autumn.bloom, tag: 6 }); }
      return keep(mergeParts(ps));
    }
    function coneGeo() {
      var ps = [{ g: new T.CylinderGeometry(0.07, 0.09, 0.6, 6), m: M(0, 0.3, 0), c: EXT_C.trunk, tag: 1 }];
      [[0.62, 0.62, 0.9, 2], [1.12, 0.48, 0.8, 3], [1.56, 0.33, 0.7, 4]].forEach(function (c) {
        ps.push({ g: new T.ConeGeometry(c[1], c[2], 7), m: M(0, c[0] + c[2] / 2, 0), c: SEASON_C.autumn.cone[c[3] - 2], tag: c[3] });
        ps.push({ g: new T.ConeGeometry(c[1] * 0.62, c[2] * 0.42, 7), m: M(0, c[0] + c[2] * 0.79 + 0.02, 0), c: SEASON_C.autumn.cone[2], tag: 5 });
      });
      return keep(mergeParts(ps));
    }
    function instanced(geo, list, mk) { var im = new T.InstancedMesh(geo, lambert, list.length); list.forEach(function (it, i) { im.setMatrixAt(i, mk(it)); }); im.instanceMatrix.needsUpdate = true; im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; extG.add(im); return im; }
    var treeIM = instanced(treeGeo(), EXT_TREES.round, function (t) { return M(snapPos(t[0]), 0, snapPos(t[1]), 0, t[3], 0, t[2], t[2], t[2]); });
    var coneIM = instanced(coneGeo(), EXT_TREES.cone, function (t) { return M(snapPos(t[0]), 0, snapPos(t[1]), 0, t[3], 0, t[2], t[2], t[2]); });
    var fenceIM = instanced(keep(mergeParts([{ g: box(0.08, 0.56, 0.08), m: M(0, 0.28, 0), c: EXT_C.fence }, { g: box(0.64, 0.06, 0.04), m: M(0.32, 0.38, 0), c: EXT_C.fence }, { g: box(0.64, 0.06, 0.04), m: M(0.32, 0.18, 0), c: EXT_C.fence }])), EXT_FENCE,
      function (f, i) { return M(snapPos(f[0]), 0, snapPos(f[1]), 0, -0.05, 0); });
    extPropN += EXT_TREES.round.length + EXT_TREES.cone.length + 1;
    /* 계절 장식 (계절마다 메시 하나, 지금 계절 것만 보인다): 봄 꽃잎 · 여름 들꽃 · 가을 낙엽(길 위 절반) · 겨울 눈(지붕·용마루·굴뚝·계단·창턱·우체통·돌·울타리·덤불 모자 + 벽 밑 눈더미 + 창 서리) */
    function scatter(key, n, pick) { var out = []; for (var i = 0, j = 0; i < n * 4 && out.length < n; i++, j++) { var p = pick(hash(key + i), i); if (p) out.push(p); } return out; }
    function groundPt(r, onPath) {
      var L = EXT.L, x, z;
      if (onPath) { var sgi = r % (EXT_PATH.length - 1), a = EXT_PATH[sgi], b = EXT_PATH[sgi + 1], t = ((r >> 4) % 100) / 100, o = (((r >> 12) % 100) / 100 - 0.5) * 0.5; x = a[0] + (b[0] - a[0]) * t - (b[1] - a[1]) * o; z = a[1] + (b[1] - a[1]) * t + (b[0] - a[0]) * o; }
      else { x = -L + 0.2 + (r % 1000) / 1000 * (2 * L - 0.4); z = -L + 0.2 + ((r >> 10) % 1000) / 1000 * (2 * L - 0.4); if (inHouse(x, z, 0.1) || nearPuddle(x, z, 0.06)) return null; }
      return [snapPos(x), snapPos(z)];
    }
    var deco = {};
    deco.spring = keep(mergeParts(scatter('pet', 46, function (r, i) { var p = groundPt(r, i % 4 === 0); return p && { g: box(0.045, 0.012, 0.045), m: M(p[0], 0.006, p[1]), c: i % 3 ? '#f2a6c0' : '#df84a5' }; })));
    deco.summer = keep(mergeParts(scatter('flw', 22, function (r, i) { var p = groundPt(r, false); return p && !nearPath(p[0], p[1], 0.4) && { g: box(0.06, 0.06, 0.06), m: M(p[0], 0.05, p[1]), c: i % 2 ? '#f0d060' : '#f4f0e8' }; })));
    deco.autumn = keep(mergeParts(scatter('lit', 54, function (r, i) { var p = groundPt(r, i % 2 === 0); return p && { g: box(0.075, 0.012, 0.05), m: M(p[0], 0.008, p[1], 0, (r >> 18) % 6 * 0.5, 0), c: ['#d4782c', '#a4482a', '#e8a63e', '#7a4a2c'][(r >> 22) & 3] }; })));
    deco.winter = keep(mergeParts((function () {
      var H = EXT, ps = [], S = EXT_C.snow, hz = (H.HZ1 - H.HZ0) / 2 + 0.22, sl = hz * Math.SQRT2, RL = H.HX1 - H.HX0 + 0.36, xc = (H.HX0 + H.HX1) / 2;
      [1, -1].forEach(function (sg) { var ang = sg * Math.PI / 4, ny = Math.SQRT1_2, nz = sg * Math.SQRT1_2;
        ps.push({ g: box(RL, 0.09, sl - 0.08), m: M(xc, H.RY - hz / 2 + ny * 0.16, H.HZC + sg * hz / 2 + nz * 0.16, ang, 0, 0), c: S });
        ps.push({ g: box(RL + 0.02, 0.07, 0.07), m: M(xc, H.RY - hz + 0.04 + ny * 0.1, H.HZC + sg * (hz - 0.04) + nz * 0.1), c: S }); });   /* 처마 끝 눈 테 */
      ps.push({ g: box(RL + 0.06, 0.09, 0.26), m: M(xc, H.RY + 0.2, H.HZC), c: S });
      ps.push({ g: box(0.44, 0.08, 0.44), m: M(snapPos(-1.5), H.TOP + 0.51, snapPos(H.HZC - 0.42)), c: S });
      ps.push({ g: box(0.34, 0.04, 1.04), m: M(H.HX1 + 0.19, H.PL + 0.02, H.HZC), c: S });
      for (var i = 0; i < 3; i++) ps.push({ g: box(0.2, 0.04, 1.04), m: M(H.HX1 + 0.38 + 0.24 * i + 0.11, H.PL - 0.12 * (i + 1) + 0.02, H.HZC), c: S });
      ps.push({ g: box(0.66, 0.05, 0.16), m: M(snapPos(-1.25), H.PL + 0.74 - 0.23 - 0.03, H.HZ1 + 0.07), c: S });
      ps.push({ g: box(0.36, 0.05, 0.26), m: M(snapPos(0.85), 0.96, snapPos(0.4)), c: S });
      [[2.5, -1.5, 1.0], [-0.55, 1.95, 0.75]].forEach(function (rk) { ps.push({ g: new T.SphereGeometry(0.2 * rk[2], 6, 3, 0, Math.PI * 2, 0, Math.PI / 2), m: M(snapPos(rk[0]), 0.13 * rk[2], snapPos(rk[1]), 0, 0, 0, 1, 0.45, 0.8), c: S }); });
      [[0.5, -0.05, 1.0], [-2.55, 0.05, 0.85]].forEach(function (b) { ps.push({ g: new T.SphereGeometry(0.26 * b[2], 7, 3, 0, Math.PI * 2, 0, Math.PI / 2), m: M(snapPos(b[0]), 0.3 * b[2], snapPos(b[1]), 0, 0, 0, 1, 0.45, 1), c: S }); });
      EXT_FENCE.concat([EXT_FENCE_END]).forEach(function (f, j) { ps.push({ g: box(0.1, 0.05, 0.1), m: M(snapPos(f[0]), 0.585, snapPos(f[1])), c: S }); if (j < EXT_FENCE.length) ps.push({ g: box(0.6, 0.03, 0.06), m: M(snapPos(f[0]) + 0.32, 0.425, snapPos(f[1]) + 0.016, 0, -0.05, 0), c: S }); });
      [[H.HX1 + 0.08, -0.5, 0.16, 0.5], [-0.6, H.HZ1 + 0.08, 0.9, 0.16], [-1.9, H.HZ1 + 0.08, 0.5, 0.16]].forEach(function (h) { ps.push({ g: box(h[2], 0.16, h[3]), m: M(h[0], 0.08, h[1]), c: S }); });   /* 벽 밑 눈더미 */
      /* 창 서리: 유리 모서리 2px 삼각 대신 2×2 블록 + 아래 1px 띠 */
      [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(function (q) {
        ps.push({ g: box(0.07, 0.07, 0.012), m: M(snapPos(-1.25) + q[0] * 0.2, H.PL + 0.74 + q[1] * 0.18, H.HZ1 + 0.02), c: S });
        ps.push({ g: box(0.012, 0.07, 0.07), m: M(H.HX1 + 0.02, H.EAVE + 0.36 + q[1] * 0.13, H.HZC + q[0] * 0.13), c: S });
      });
      ps.push({ g: box(0.46, 0.05, 0.012), m: M(snapPos(-1.25), H.PL + 0.74 - 0.2, H.HZ1 + 0.02), c: S });
      return ps;
    })()));
    var decoM = {};
    SEASONS.forEach(function (s) { var m = new T.Mesh(deco[s], lambert); m.receiveShadow = true; m.castShadow = s === 'winter'; m.visible = false; extG.add(m); decoM[s] = m; });
    /* 창 2: 다락 창(박공, 등불 칸 수만큼 밤에 따뜻하게) · 1층 창(+z 벽, 밤이면 늘 켜짐) — 유리 MeshBasic + 발광 쌍둥이(레이어 1, 블룸) */
    var winA = new T.Mesh(keep(new T.PlaneGeometry(0.36, 0.36)), keep(new T.MeshBasicMaterial({ color: C('#141c33') })));
    winA.position.set(EXT.HX1 + 0.012, EXT.EAVE + 0.36, EXT.HZC); winA.rotation.y = Math.PI / 2; extG.add(winA);
    var winAEm = emTwin(winA, winA.geometry);
    var winG = new T.Mesh(keep(new T.PlaneGeometry(0.5, 0.46)), keep(new T.MeshBasicMaterial({ color: C('#141c33') })));
    winG.position.set(snapPos(-1.25), EXT.PL + 0.74, EXT.HZ1 + 0.012); extG.add(winG);
    var winGEm = emTwin(winG, winG.geometry);
    var extLamp = new T.PointLight(C('#ffb066').getHex(), 0, 3.4, 2); extLamp.position.set(snapPos(-1.25), 0.9, EXT.HZ1 + 0.45); extG.add(extLamp);   /* 1층 창 앞 땅에 떨어지는 불빛 (밤 · 노을) */
    /* 현관문: 경첩(−z 쪽)을 축으로 바깥(+x)으로 열린다 */
    var doorPivot = new T.Group(); doorPivot.position.set(EXT.HX1 + 0.03, EXT.PL, EXT.HZC - 0.31); extG.add(doorPivot);
    var extDoor = new T.Mesh(keep(mergeParts([{ g: box(0.05, 1.02, 0.6), m: M(0, 0.51, 0.3), c: EXT_C.door }, { g: box(0.06, 0.04, 0.52), m: M(0, 0.3, 0.3), c: W[2] }, { g: box(0.06, 0.04, 0.52), m: M(0, 0.76, 0.3), c: W[2] }, { g: box(0.06, 0.06, 0.06), m: M(0.04, 0.5, 0.5), c: EXT_C.mailFlag }])), lambert);
    extDoor.castShadow = true; extDoor.receiveShadow = true; doorPivot.add(extDoor);
    var DOOR_EXT = { a: 0, want: 0, OPEN: 1.35 };
    function stepDoor(dt) { var d = DOOR_EXT.want - DOOR_EXT.a; if (Math.abs(d) < 1e-3) return; DOOR_EXT.a = st.reduced ? DOOR_EXT.want : DOOR_EXT.a + clamp(d, -dt * 9, dt * 9); doorPivot.rotation.y = DOOR_EXT.a; }

    /* ── 계절 (실제 월: 3~5 봄 · 6~8 여름 · 9~11 가을 · 12~2 겨울) ── */
    function seasonOfMonth(m) { return m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter'; }
    var SEASON = { mode: 'auto', cur: seasonOfMonth(new Date().getMonth() + 1) };
    function applySeason() {
      var c = SEASON_C[SEASON.cur], g = extStatic.geometry;
      recolor(g, 10, c.ground); recolor(g, 11, c.tuft); recolor(g, 12, c.path); recolor(g, 17, EXT_WATER[SEASON.cur]);
      [13, 14, 15].forEach(function (t) { recolor(rustleM.geometry, t, c.leaf[t - 13]); }); recolor(g, 13, c.leaf[0]); recolor(g, 14, c.leaf[1]); recolor(g, 15, c.leaf[2]); recolor(g, 16, SEASON.cur === 'spring' ? c.bloom : c.leaf[1]);
      [2, 3, 4].forEach(function (t) { recolor(treeIM.geometry, t, c.leaf[t - 2]); recolor(coneIM.geometry, t, c.cone[t - 2]); });
      recolor(treeIM.geometry, 5, c.cap); recolor(coneIM.geometry, 5, SEASON.cur === 'winter' ? c.cap : c.cone[2]);
      recolor(treeIM.geometry, 6, SEASON.cur === 'spring' || SEASON.cur === 'autumn' ? c.bloom : c.leaf[1]);
      SEASONS.forEach(function (s) { decoM[s].visible = s === SEASON.cur; });
      extApplyLight(); extApplyWeather();
    }
    function setSeason(s) { s = SEASONS.indexOf(s) >= 0 ? s : 'auto'; SEASON.mode = s; SEASON.cur = s === 'auto' ? seasonOfMonth(new Date().getMonth() + 1) : s; applySeason(); }

    /* 창 유리·발광·1층 불빛 = 시각대(LIGHTS out/winEm/em) × 등불 칸 수(다락 창) — 서리(겨울)는 낮 유리를 흰빛 쪽으로 */
    function extApplyLight() {
      var em = light.em == null ? 1 : light.em, night = Math.max(0, (em - 0.25) / 0.75), n = st.lantern, k = n > 0 ? 0.4 + 0.6 * n / 8 : 0, out = light.out || C(LIGHTS.night.out), frost = SEASON.cur === 'winter';
      var sky = tmpB.copy(out); if (frost) sky.lerp(C('#dde8f0'), 0.35);
      winA.material.color.copy(sky).lerp(C(n > 0 ? PAL.amber[2] : '#141c33'), night);
      winAEm.material.color.copy(light.winEm || C('#3c507a')).multiplyScalar(1 - night).add(tmpA.copy(C(EM.lamp)).multiplyScalar(em * k * night));
      winG.material.color.copy(sky).lerp(C(PAL.amber[3]), night);
      winGEm.material.color.copy(light.winEm || C('#3c507a')).multiplyScalar(1 - night).add(tmpA.copy(C(EM.lamp)).multiplyScalar(em * 0.85 * night));
      extLamp.intensity = 1.1 * night;
      extApplyWeather();
    }

    /* ── 바깥 입자 (12 fps 스텝 · 픽셀 중심 스냅, 종류당 1 드로우콜): 비(1px 줄기) · 눈 · 봄 꽃잎 · 가을 낙엽(2px, 2프레임 뒹굴기) · 여름 밤 반딧불(+발광 쌍둥이) ──
       입자 = 땅 위 기둥(gx, gz) 의 픽셀 중심 P + 세로 m 행(m·pxUp) + 가로 c 열(c·pw). 낙하는 스텝당 정수 행 → 늘 아트 픽셀 위. 지붕·벽 속을 지나는 건 깊이로 가려진다 */
    function extPoints(n, hex, vcols) {
      var g = keep(new T.BufferGeometry()); g.setAttribute('position', new T.BufferAttribute(new Float32Array(n * 3), 3));
      if (vcols) { var ca = new Float32Array(n * 3); for (var i = 0; i < n; i++) { var c = C(vcols[i % vcols.length]); ca[i * 3] = c.r; ca[i * 3 + 1] = c.g; ca[i * 3 + 2] = c.b; } g.setAttribute('color', new T.BufferAttribute(ca, 3)); }
      var p = new T.Points(g, keep(new T.PointsMaterial({ color: vcols ? 0xffffff : C(hex), vertexColors: !!vcols, size: 1, sizeAttenuation: false, depthWrite: false }))); p.frustumCulled = false; p.visible = false; extG.add(p); return p;   /* depthWrite 끔: 허공 위 1px 입자가 깊이 외곽선(×0.66)으로 어두운 점이 되지 않게 */
    }
    function extLines(n, hex, vcols) {
      var g = keep(new T.BufferGeometry()); g.setAttribute('position', new T.BufferAttribute(new Float32Array(n * 6), 3));
      if (vcols) { var ca = new Float32Array(n * 6); for (var i = 0; i < n * 2; i++) { var c = C(vcols[(i >> 1) % vcols.length]); ca[i * 3] = c.r; ca[i * 3 + 1] = c.g; ca[i * 3 + 2] = c.b; } g.setAttribute('color', new T.BufferAttribute(ca, 3)); }
      var l = new T.LineSegments(g, keep(new T.LineBasicMaterial({ color: vcols ? 0xffffff : C(hex), vertexColors: !!vcols, depthWrite: false }))); l.frustumCulled = false; l.visible = false; extG.add(l); return l;
    }
    var XP = {
      rain: { n: 60, obj: extLines(60, PAL.glass[3]), s: [] },
      snow: { n: 72, obj: extPoints(72, EXT_C.snow), s: [] },
      petal: { n: 24, obj: extPoints(24, null, ['#f2a6c0', '#df84a5', '#fbe0ea']), s: [] },
      leaf: { n: 16, obj: extLines(16, null, ['#d4782c', '#a4482a', '#e8a63e', '#7a4a2c']), s: [] },
      fly: { n: 6, obj: extPoints(6, '#e8f0a0'), s: [] }
    };
    XP.flyEm = new T.Points(XP.fly.obj.geometry, keep(new T.PointsMaterial({ color: C('#f0ff90'), size: 3, sizeAttenuation: false, depthWrite: false }))); XP.flyEm.layers.set(1); XP.flyEm.frustumCulled = false; XP.fly.obj.add(XP.flyEm);   /* 반딧불 발광 쌍둥이 (3px 발광원 → 블러 뒤 1px 심 둘레에 1~2px 고리) */
    var xanim = { acc: 0, step: 0 }, XTOP = 3.6;
    function xRows(y) { return Math.round(y / pxUp()); }
    function xSpawn(kind, i, init) {
      var p = XP[kind], s = p.s[i] || (p.s[i] = { cyc: 0 }); s.cyc++;
      var r = hash('x' + kind + i + '_' + s.cyc), L = EXT.L, top = xRows(XTOP);
      if (kind === 'leaf' || kind === 'petal') {   /* 나무 우듬지에서 떨어진다 (꽃잎 ⅓ 은 바람에 실려 아무 데서나) */
        var tr = EXT_TREES.round[r % EXT_TREES.round.length], ang = ((r >> 4) % 360) * DEG, rad = 0.2 + ((r >> 12) % 100) / 100 * 0.6, any = kind === 'petal' && (r >> 20) % 3 === 0;
        s.gx = any ? -L + ((r >> 8) % 1000) / 1000 * 2 * L : tr[0] + Math.cos(ang) * rad; s.gz = any ? -L + ((r >> 18) % 1000) / 1000 * 2 * L : tr[1] + Math.sin(ang) * rad;
        s.m = init ? (r >> 22) % xRows(1.8) : xRows((any ? 2.4 : 1.1) + ((r >> 22) % 100) / 100 * 0.8); s.c = 0;
      } else if (kind === 'fly') {
        var hosts = [[1.0, 0.95], [-0.7, 0.9], [0.3, 1.95], [2.3, -0.95], [-2.0, 0.55], [1.4, 1.9]], h = hosts[i % hosts.length];   /* 열린 마당 (덤불·나무 앞, 우듬지 속이 아니라) */
        s.gx = h[0] + (((r >> 4) % 100) / 100 - 0.5) * 0.8; s.gz = h[1] + (((r >> 12) % 100) / 100 - 0.5) * 0.8; s.m = xRows(0.35 + ((r >> 20) % 100) / 100 * 0.9); s.c = 0; s.dm = 0;
      } else {
        s.gx = -L + (r % 1000) / 1000 * 2 * L; s.gz = -L + ((r >> 10) % 1000) / 1000 * 2 * L;
        s.m = init ? (r >> 20) % top : top - ((r >> 20) % 12); s.c = 0;
      }
      s.len = kind === 'rain' ? 3 + ((r >> 26) & 1) * 2 : 1;
    }
    function xInit() { xanim.init = true; ['rain', 'snow', 'petal', 'leaf', 'fly'].forEach(function (k) { for (var i = 0; i < XP[k].n; i++) xSpawn(k, i, true); }); }   /* 첫 extApplyWeather 때 (카메라 축·pxUp 이 정해진 뒤) */
    function xBase(s) { _wp.set(s.gx, 0, s.gz); snapC(_wp); return _wp.addScaledVector(_r, s.c * S.pw); }
    function xHide(a, o, two) { a[o] = 0; a[o + 1] = -50; a[o + 2] = 0; if (two) { a[o + 3] = 0; a[o + 4] = -50; a[o + 5] = 0; } }
    function xLayout(kind, active, advance) {
      var p = XP[kind], a = p.obj.geometry.attributes.position.array, k = pxUp(), st2 = xanim.step, two = kind === 'rain' || kind === 'leaf';
      for (var i = 0; i < p.n; i++) {
        var s = p.s[i], o = i * (two ? 6 : 3);
        if (i >= active) { xHide(a, o, two); continue; }
        if (advance) {
          if (kind === 'rain') s.m -= 4;
          else if (kind === 'snow') { if ((st2 + i) & 1) s.m--; if (st2 % 4 === 0) { var q = hash('xsd' + i + '_' + st2) % 8; if (q === 0) s.c = clamp(s.c + 1, -3, 3); else if (q === 1) s.c = clamp(s.c - 1, -3, 3); } }
          else if (kind === 'petal') { if (hash('xpf' + i + '_' + st2) % 3) s.m--; if (st2 % 3 === i % 3) s.c += (hash('xpd' + i + '_' + st2) % 4 === 0) ? -1 : 1; }
          else if (kind === 'leaf') { s.m--; if (st2 % 4 === i % 4) s.c += ((st2 >> 3) + i) % 3 === 0 ? -1 : 1; }
          else if (kind === 'fly') { if (st2 % 3 === i % 3) { var w = hash('xfw' + i + '_' + st2); s.c = clamp(s.c + (w % 3) - 1, -4, 4); s.dm = clamp(s.dm + ((w >> 4) % 3) - 1, -3, 3); } }
          if (kind !== 'fly' && s.m < 0) xSpawn(kind, i, false);
        }
        var P = xBase(s);
        if (kind === 'rain') { a[o] = P.x; a[o + 1] = P.y + (s.m + s.len - 1) * k; a[o + 2] = P.z; a[o + 3] = P.x; a[o + 4] = P.y + (s.m - 1) * k; a[o + 5] = P.z; }
        else if (kind === 'leaf') {   /* 2px 잎, 2프레임 뒹굴기 (6 fps): 가로 2px ↔ 세로 2px */
          var f = ((st2 >> 1) + i) & 1, y0 = P.y + s.m * k;
          a[o] = P.x; a[o + 1] = y0; a[o + 2] = P.z;
          if (f) { a[o + 3] = P.x; a[o + 4] = y0 - 2 * k; a[o + 5] = P.z; } else { a[o + 3] = P.x + 2 * S.pw * _r.x; a[o + 4] = y0 + 2 * S.pw * _r.y; a[o + 5] = P.z + 2 * S.pw * _r.z; }
        } else if (kind === 'fly') {   /* 깜빡임: 6스텝(0.5 s) 블록마다 시드로 켜짐 75 % */
          var on = st.reduced || hash('xfb' + i + '_' + (st2 / 6 | 0)) % 4 !== 0;
          if (!on) { xHide(a, o); continue; }
          a[o] = P.x; a[o + 1] = P.y + (s.m + s.dm) * k; a[o + 2] = P.z;
        } else { a[o] = P.x; a[o + 1] = P.y + s.m * k; a[o + 2] = P.z; }
      }
      p.obj.geometry.attributes.position.needsUpdate = true;
    }
    var XCOUNT = { rain: 0, snow: 0, petal: 0, leaf: 0, fly: 0 };
    function extApplyWeather() {
      if (!XP || !S.rw || _u.lengthSq() < 0.5) return;
      if (!xanim.init) xInit();
      var w = st.weather, sea = SEASON.cur, wet = w === 'rain' || w === 'drizzle', night = isNight();
      XCOUNT.rain = sea !== 'winter' && wet ? (w === 'rain' ? 60 : 30) : 0;
      XCOUNT.snow = (sea === 'winter' && (wet || w === 'snow')) || w === 'snow' ? (w === 'drizzle' ? 40 : 72) : 0;   /* 겨울엔 비가 눈으로 */
      XCOUNT.petal = sea === 'spring' ? 24 : 0;
      XCOUNT.leaf = sea === 'autumn' ? 16 : 0;
      XCOUNT.fly = sea === 'summer' && night && !wet ? 3 + hash('flyday' + new Date().getDate()) % 4 : 0;   /* 3~6 마리 (날짜 시드) */
      Object.keys(XCOUNT).forEach(function (k) { XP[k].obj.visible = XCOUNT[k] > 0; if (XCOUNT[k]) xLayout(k, XCOUNT[k], false); });
    }
    function stepExt(dt) {
      stepDoor(dt); stepPeekProps(dt);
      if (st.reduced) return;
      xanim.acc += dt; var n = 0;
      while (xanim.acc >= RAIN_DT - 1e-6 && n < 3) { xanim.acc -= RAIN_DT; xanim.step++; n++; Object.keys(XCOUNT).forEach(function (k) { if (XCOUNT[k]) xLayout(k, XCOUNT[k], true); }); }
      if (n === 3) xanim.acc = 0;
    }

    /* ── 장소 전환 (0.6 s): 앞 0.3 s 나가는 장소가 아래로 미끄러지며(가속) 정렬 디더로 허공색에 덮이고, 뒤 0.3 s 들어오는 장소가 위에서 내려오며(감속) 걷힌다.
       한 프레임엔 한 장소만 그린다. 미끄럼 변위는 화면 세로 정수 px(snapUp). 모션 감소·instant = 즉시 컷 ── */
    var TRANS_DUR = 0.6, TRANS_DY = 2.6;
    function groupOf(p) { return p === 'exterior' ? extG : atticG; }
    function showPlace(p) {
      atticG.visible = p === 'attic'; extG.visible = p === 'exterior'; PLACE.vis = p;
      atticG.position.y = 0; extG.position.y = 0;
      var g = groupOf(p); if (octG.parent !== g) g.add(octG);
      applyLight(); dither.still = 0;
    }
    function defaultSwap(p) { /* 의식 없이 장소만 바꿀 때 문어 자리: 바깥 = 마당(길가), 다락 = 마지막 앵커 */
      if (p === 'exterior') { oct.pos.set(snapPos(1.75), 0, snapPos(0.75)); oct.wantYaw = oct.faceYaw = camYaw(); } else jumpTo(oct.anchor || 'center');
    }
    /* 장소 값(place())이 바뀌면 opts.on.place(p) 한 번 — 의식이 스스로 바꿀 때도 (앱의 화면 낭독기용 장면 설명이 따라간다) */
    function setPlace(p, o) { var was = PLACE.cur; setPlaceNow(p, o); if (PLACE.cur !== was && on.place) on.place(PLACE.cur); }
    function setPlaceNow(p, o) {
      p = p === 'exterior' ? 'exterior' : 'attic'; o = o || {};
      if (PLACE.trans) finishTrans();
      var swap = o.onSwap || function () { defaultSwap(p); };
      if (p === PLACE.vis) { PLACE.cur = p; return; }
      PLACE.cur = p;
      if (o.instant || st.reduced || !ready) { showPlace(p); swap(); PLACE.fade = 0; return; }
      PLACE.trans = { from: PLACE.vis, to: p, t: 0, swapped: false, swap: swap };
    }
    function finishTrans() { var tr = PLACE.trans; if (!tr) return; if (!tr.swapped) { showPlace(tr.to); tr.swap(); } groupOf(tr.to).position.y = 0; PLACE.fade = 0; PLACE.trans = null; }
    function stepTrans(dt) {
      var tr = PLACE.trans; if (!tr) return;
      tr.t += dt; var k = Math.min(1, tr.t / TRANS_DUR);
      if (k < 0.5) { var a = k / 0.5; groupOf(tr.from).position.y = -snapUp(TRANS_DY * a * a); PLACE.fade = a; }
      else {
        if (!tr.swapped) { tr.swapped = true; groupOf(tr.from).position.y = 0; showPlace(tr.to); tr.swap(); }
        var b = (k - 0.5) / 0.5; groupOf(tr.to).position.y = snapUp(TRANS_DY * (1 - b) * (1 - b)); PLACE.fade = 1 - b;
      }
      if (k >= 1) { groupOf(tr.to).position.y = 0; PLACE.fade = 0; PLACE.trans = null; }
    }

    /* ── 출발·귀가 의식: dt 로 진행하는 작업 큐 (debugStep 으로 결정적). 한 작업 = { dur, start, update(k), end }; 남은 dt 는 다음 작업으로 넘긴다 (모션 감소면 걷기·폴짝 0 s 라 한 프레임에 끝난다) ── */
    var CER = { q: [], cur: null, done: null, active: false, walk: false, name: '' };
    var EXT_P = { doorIn: [EXT.HX1 - 0.12, EXT.PL, EXT.HZC], landing: [EXT.HX1 + 0.24, EXT.PL, EXT.HZC], steps: [0, 1, 2].map(function (i) { return [EXT.HX1 + 0.5 + 0.24 * i, EXT.PL - 0.12 * (i + 1), EXT.HZC]; }),
      edge: [EXT.L - 0.02, 0, 0.42], below: [EXT.L + 0.6, -1.5, 0.82] };
    function V(a) { return new T.Vector3(a[0], a[1], a[2]); }
    function cerWalk(to, speed, hop) { /* 걷기(hop 0, 다리 번갈아 + 통통) 또는 폴짝(hop = 호 높이) — 마디 하나 */
      var from = new T.Vector3(), tv = V(to), it = { dur: 0 };
      it.start = function () { from.copy(oct.pos); var d = tv.clone().sub(from); it.dur = st.reduced ? 0 : Math.max(0.05, (hop ? 0.22 : Math.hypot(d.x, d.z) / speed)) * st.speed; if (Math.hypot(d.x, d.z) > 1e-3) oct.wantYaw = Math.atan2(d.x, d.z); CER.walk = !hop; it.hold = hop || !it.dur ? 0 : anticHold(); it.dur += it.hold; };   /* 서 있다 걷기 시작하면 예비 동작만큼 제자리 */
      it.update = function (k) { var w = it.dur > it.hold ? Math.max(0, (k * it.dur - it.hold) / (it.dur - it.hold)) : 1; oct.pos.lerpVectors(from, tv, w); oct.hop = hop ? Math.sin(k * Math.PI) * hop / OCT_R : 0; };
      it.end = function () { oct.pos.copy(tv); oct.hop = 0; CER.walk = false; };
      return it;
    }
    function cerDo(fn, dur) { return { dur: st.reduced ? 0 : (dur || 0), start: fn }; }
    function cerTrans(p, onSwap) { var it = { dur: 0 }; it.start = function () { it.dur = st.reduced ? 0 : TRANS_DUR; setPlace(p, { onSwap: onSwap }); }; it.end = function () { if (PLACE.trans) finishTrans(); }; return it; }
    function cerRun(name, items, onDone) {
      if (CER.active) { CER.walk = false; oct.hop = 0; }   /* 앞 의식은 조용히 취소 (onDone 안 부름) */
      if (oct.walking) { oct.walking.cancel(); oct.walking = null; }   /* 돌아다니던 걸음(moveTo)이 의식 위치를 덮어쓰지 않게 */
      CER.q = items; CER.cur = null; CER.active = true; CER.name = name;
      return new Promise(function (resolve) { CER.done = function () { if (onDone) onDone(); resolve(); }; });
    }
    function stepCer(dt) {
      for (var guard = 0; CER.active && guard < 64; guard++) {
        if (!CER.cur) {
          if (!CER.q.length) { CER.active = false; CER.name = ''; var d = CER.done; CER.done = null; if (d) d(); return; }
          CER.cur = CER.q.shift(); CER.cur.t = 0; if (CER.cur.start) CER.cur.start();
        }
        var c = CER.cur; c.t += dt;
        if (c.update) c.update(c.dur > 0 ? Math.min(1, c.t / c.dur) : 1);
        if (c.t + 1e-9 < c.dur) return;
        dt = c.t - c.dur; if (c.end) c.end(); CER.cur = null;
      }
    }
    function pathItems(reverse, speed) { var pts = EXT_PATH.map(function (p) { return [p[0], 0, p[1]]; }); pts.push(EXT_P.edge); if (reverse) pts.reverse(); return pts.map(function (p) { return cerWalk(p, speed); }); }
    function departCeremony(onDone) {
      var items = [cerDo(pkReset)];   /* 바깥 기웃 상태가 남아 있으면 지운다 (기웃을 안 쓰면 무동작) */
      if (PLACE.vis !== 'attic' || PLACE.trans) items.push(cerDo(function () { setPlace('attic', { instant: true }); }));
      items.push(cerDo(function () { setOctState('walk'); oct.anchor = 'door'; }));
      items.push(cerWalk(ANCHORS.door, 1.2));                                                      /* 다락 문으로 */
      items.push(cerTrans('exterior', function () { octG.visible = false; octDecal.visible = false; oct.pos.copy(V(EXT_P.doorIn)); oct.wantYaw = oct.faceYaw = Math.PI / 2; }));
      items.push(cerDo(function () { DOOR_EXT.want = DOOR_EXT.OPEN; }, 0.2));                       /* 현관문 열림 */
      items.push(cerDo(function () { octG.visible = true; octDecal.visible = true; }));
      items.push(cerWalk(EXT_P.landing, 1.4));
      EXT_P.steps.forEach(function (s, i) { var h = cerWalk(s, 0, 0.16); if (i === 0) { var st0 = h.start; h.start = function () { st0(); DOOR_EXT.want = 0; }; } items.push(h); });   /* 계단 3 폴짝 (첫 폴짝에 문 닫힘) */
      items = items.concat(pathItems(false, 1.8));                                                 /* 길 따라 오른쪽 아래 가장자리로 */
      items.push(cerWalk(EXT_P.below, 0, 0.3));                                                    /* 가장자리 너머로 폴짝 → 사라짐 */
      items.push(cerDo(function () { setOctState('away'); }));
      return cerRun('depart', items, onDone);
    }
    function returnCeremony(onDone) {
      var items = [];
      items.push(cerDo(function () {
        if (PLACE.vis !== 'exterior' || PLACE.trans) setPlace('exterior', { instant: true, onSwap: function () {} });
        pkReset(); oct.pos.copy(V(EXT_P.below)); setOctState('walk'); octDecal.visible = true;
      }));
      items.push(cerWalk(EXT_P.edge, 0, 0.3));                                                     /* 가장자리 아래에서 폴짝 올라옴 */
      items = items.concat(pathItems(true, 1.8).slice(1));
      items.push(cerWalk([EXT_PATH[0][0], 0, EXT_PATH[0][1]], 1.8));
      EXT_P.steps.slice().reverse().forEach(function (s) { items.push(cerWalk(s, 0, 0.16)); });
      items.push(cerWalk(EXT_P.landing, 0, 0.16));
      items.push(cerDo(function () { DOOR_EXT.want = DOOR_EXT.OPEN; }, 0.2));
      items.push(cerWalk(EXT_P.doorIn, 1.4));
      items.push(cerDo(function () { octG.visible = false; octDecal.visible = false; DOOR_EXT.want = 0; }, 0.15));
      items.push(cerTrans('attic', function () { jumpTo('door'); octG.visible = true; octDecal.visible = true; }));
      items.push(cerDo(function () { oct.anchor = 'door'; if (st.octState === 'walk') setOctState('idle'); }));
      return cerRun('return', items, onDone);
    }

    /* ── 바깥 기웃 (뽈뽈 중 "찾았다!"는 바깥에서): 출발 의식 뒤 문어는 무대 밖(가장자리 아래). 기웃마다 가까운 가장자리에서 폴짝 올라오거나(무대 밖일 때) 앞 자리에서
       뒤뚱 걸어 그 갈래의 자리로 가고, 상태별 자세·표정으로 ~1.2 s 기웃한 뒤 Promise 를 푼다(말풍선은 APP 이 octScreenPos 로 붙인다). 마지막엔 leaveOutside 가
       출발 의식과 같은 출구(길 가장자리 → 아래로 폴짝)로 내보내므로 returnCeremony 가 그대로 이어진다. 문어 상태(st.octState)는 'away' 그대로 — 보이기만 한다.
       경로: 원(소품) + 사각(집·현관) 장애물을 피하는 작은 길목 그래프(최단 거리) — 집을 가로지르지 않는다. 모션 감소 = 자리로 순간이동 · 정지 자세 · 0.4 s ── */
    var D2R = DEG;
    var EXT_SPOTS = {   /* x, z (월드 m, extG) · y (앉는 높이) · face (도, 0 = +z · 90 = +x · 45 = 카메라) · 소품 · 동작 · approach (폴짝 직전 발치).
       이 카메라에선 문어가 소품을 '마주 보면' 등이 보이므로, 소품은 화면에서 문어 옆이나 앞(아래)에 두고 얼굴은 카메라 ±40° 안에서 소품 쪽으로 돌린다 */
      sea:     { x: -0.6, z: 0.6, face: 45, prop: 'puddle', act: 'ripple' },          /* 웅덩이가 바로 앞(화면 아래) */
      sky:     { x: -1.25, z: 1.3, face: 15, prop: 'tree', act: 'up' },               /* 왼쪽 둥근 나무 밑, 올려다봄 */
      sounds:  { x: 0.1, z: 0.5, face: 75, prop: 'bush', act: 'rustle' },             /* 덤불이 화면 오른쪽 */
      hands:   { x: 1.4, z: -0.05, face: 10, prop: 'mailbox', act: 'mail1' },         /* 우체통 오른쪽 (열리는 끝 쪽) */
      signs:   { x: 0.45, z: 1.0, face: 85, prop: 'mailbox', act: 'mail1' },          /* 우체통 왼쪽 */
      numbers: { x: 0.0, z: 1.7, face: 0, prop: 'fence', act: 'count' },              /* 울타리 기둥이 화면 왼쪽 아래 */
      home:    { x: 1.08, y: 0.12, z: -1.1, face: 75, prop: 'steps', act: 'sit', approach: [1.55, -1.1] },
      mind:    { x: 1.7, z: -1.9, face: 40, prop: 'tree' },                           /* 오른쪽 둥근 나무 밑 (원뿔 나무는 이 시점에서 집 뒤라 안 보인다) */
      wild:    { x: 2.95, z: -0.9, face: 95, prop: 'edge' },
      slow_room:   { x: 2.5, y: 0.2, z: -1.5, face: 40, prop: 'rock', act: 'sit', approach: [2.2, -0.9] },
      letter_room: { x: 1.4, z: -0.05, face: 10, prop: 'mailbox', act: 'mailOpen' },
      door_out:    { x: 2.85, z: 0.3, face: 45, prop: 'pathEdge' }
    };
    var PK_FENCE = EXT_FENCE.concat([EXT_FENCE_END]);
    var PK_OBS = [[EXT_MAILBOX[0], EXT_MAILBOX[1], 0.15], [0.5, -0.05, 0.32], [-2.55, 0.05, 0.28], [2.58, -1.45, 0.35], [-0.5, 2.0, 0.22], [EXT_PUDDLE[0], EXT_PUDDLE[1], 0.28]]
      .concat(EXT_TREES.round.concat(EXT_TREES.cone).map(function (t) { return [t[0], t[1], 0.14]; }))
      .concat((function () { var o = []; for (var i = 0; i <= 8; i++) { var k = i / 8; o.push([-1.1 + (0.8 + 1.1) * k, 2.55 + 0.11 * k, 0.06]); } return o; })());   /* 울타리 = 원 9 */
    var PK_RECT = [[EXT.HX0, EXT.HX1, EXT.HZ0, EXT.HZ1], [EXT.HX1, 1.2, EXT.HZC - 0.58, EXT.HZC + 0.58]];   /* 집 · 현관+계단+난간 */
    var PK_M = 0.3;   /* 문어 몸 여유 (다리 끝은 소품에 살짝 걸쳐도 된다) */
    var PK_HUBS = [[2.05, 1.0], [0.4, 1.45], [-1.0, 0.65], [-2.3, 1.0], [2.25, -0.5], [-1.9, 2.3], [1.85, -1.25]];
    var PK_ENTRY = [   /* 가장자리 출입구: at = 받침 위, below = 아래(폴짝 출발점 — 출발 의식의 below 와 같은 꼴) */
      { at: EXT_P.edge, below: EXT_P.below }, { at: [EXT.L - 0.02, 0, -0.75], below: [EXT.L + 0.6, -1.5, -0.35] },
      { at: [-1.75, 0, EXT.L - 0.02], below: [-1.35, -1.5, EXT.L + 0.6] }, { at: [1.35, 0, EXT.L - 0.02], below: [1.75, -1.5, EXT.L + 0.6] }];
    var PK_WALK = 1.5;   /* m/s (다락 1.2 · 길 1.8 사이 — 뒤뚱 초당 2.5걸음) */
    var PK = { on: false, key: '', spot: null, onSpot: false, status: '', hold: false, t: 0, lean: 0, leanNow: 0, sit: 0, shrug: -1, nod: -1, rustle: false, mail: 0, plop: 0, count: -2, emoji: '', first: false, arm: 0, leanQ: 0 };
    function pkBody(dt) { /* 기웃 자세 → [xz 배율, y 배율, 세로(r)] + PK.leanQ(앞 기댐, 3° 스텝) · PK.arm(다리 끝 들림). 모션 감소 = 정지 자세 (으쓱·까딱 없음) */
      var red = st.reduced, sx = 1, sy = 1, by = 0, arm = 0;
      PK.leanNow = red ? PK.lean : PK.leanNow + (PK.lean - PK.leanNow) * Math.min(1, dt * 12);
      var q = 3 * D2R, lean = Math.round(PK.leanNow / q) * q;
      if (PK.sit) { sx = 1.06; sy = 0.9; arm = 0.14; }                                  /* 앉음: 납작 + 다리 벌림 */
      if (PK.shrug >= 0 && !red) { PK.shrug += dt; if (PK.shrug > 0.15 && PK.shrug < 0.55) { by = pxUp() / OCT_R; arm = 0.35; sy *= 1.03; } }   /* 으쓱: 1px 위 + 다리 끝 들림 0.4 s */
      if (PK.nod >= 0 && !red) { PK.nod += dt; if (PK.nod < 0.12) lean += 9 * D2R; else PK.nod = -1; }                                         /* 까딱 120 ms */
      PK.leanQ = lean; PK.arm = arm;
      return [sx, sy, by];
    }
    function pkBlocked(x, z) {
      for (var i = 0; i < PK_OBS.length; i++) { var o = PK_OBS[i]; if (Math.hypot(x - o[0], z - o[1]) < o[2] + PK_M) return true; }
      for (i = 0; i < PK_RECT.length; i++) { var r = PK_RECT[i]; if (x > r[0] - PK_M && x < r[1] + PK_M && z > r[2] - PK_M && z < r[3] + PK_M) return true; }
      return false;
    }
    function pkClear(a, b) { var d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(d / 0.08)); for (var i = 1; i < n; i++) { var k = i / n; if (pkBlocked(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k)) return false; } return true; }   /* 양 끝은 검사하지 않는다 (자리·출입구는 소품 곁) */
    function pkRoute(a, b) { /* 최단 길목 경로 (Dijkstra, 노드 = 시작·길목 7·끝) → 거쳐 갈 점들 (시작 제외, 끝 포함) + 길이 */
      var N = [a].concat(PK_HUBS, [b]), n = N.length, dist = [], prev = [], done = [], i, j;
      for (i = 0; i < n; i++) { dist.push(i ? 1e9 : 0); prev.push(-1); done.push(false); }
      for (var it = 0; it < n; it++) {
        var u = -1; for (i = 0; i < n; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
        if (u < 0 || dist[u] >= 1e9) break; done[u] = true; if (u === n - 1) break;
        for (j = 0; j < n; j++) if (!done[j] && j !== u) { var d = Math.hypot(N[j][0] - N[u][0], N[j][1] - N[u][1]); if (dist[u] + d < dist[j] && pkClear(N[u], N[j])) { dist[j] = dist[u] + d; prev[j] = u; } }
      }
      if (dist[n - 1] >= 1e9) return { pts: [b], len: Math.hypot(b[0] - a[0], b[1] - a[1]) + 50 };   /* 길이 없으면 곧장 (일어나지 않게 길목을 둔다) */
      var pts = []; for (i = n - 1; i > 0; i = prev[i]) pts.unshift(N[i]);
      return { pts: pts, len: dist[n - 1] };
    }
    function spotKey(o) { o = o || {}; if (o.roomId && EXT_SPOTS[o.roomId]) return o.roomId; if (o.corner && EXT_SPOTS[o.corner]) return o.corner; if (typeof o === 'string' && EXT_SPOTS[o]) return o; return 'wild'; }
    function extSpot(k) { var key = typeof k === 'string' ? (EXT_SPOTS[k] ? k : 'wild') : spotKey(k), sp = EXT_SPOTS[key]; return { key: key, x: sp.x, y: sp.y || 0, z: sp.z, face: sp.face * D2R, prop: sp.prop, act: sp.act || '' }; }
    function pkPose(o) { PK.lean = 0; PK.sit = 0; PK.shrug = -1; PK.nod = -1; PK.rustle = false; PK.mail = 0; PK.count = -2; if (o) Object.keys(o).forEach(function (k) { PK[k] = o[k]; }); }
    function pkReset() { pkPose(); PK.on = false; PK.key = ''; PK.spot = null; PK.onSpot = false; PK.hold = false; PK.status = ''; PK.leanNow = 0; rustleM.visible = false; mailOpenM.visible = false; }
    function pkOff() { pkReset(); octG.visible = false; octDecal.visible = false; setExpression('idle'); }
    function pkHere() { return [oct.pos.x, oct.pos.z]; }
    function pkWalkItems(from, to, speed, short) { /* 경로 걷기 마디들. short = 끝 0.5 m 앞에서 멈춤 (시뮬레이션: 멀리서 기웃) */
      var r = pkRoute(from, to), pts = r.pts.slice();
      if (short) { var last = pts[pts.length - 1], pv = pts.length > 1 ? pts[pts.length - 2] : from, d = Math.hypot(last[0] - pv[0], last[1] - pv[1]), cut = Math.min(0.5, d);
        pts[pts.length - 1] = d > 1e-3 ? [last[0] - (last[0] - pv[0]) / d * cut, last[1] - (last[1] - pv[1]) / d * cut] : last; }
      return pts.map(function (p) { return cerWalk([p[0], 0, p[1]], speed); });
    }
    function pkHoldItem(key, status, short, o) {
      var sp = EXT_SPOTS[key], it = { dur: 0 }, happy = status === 'read' || (!!o.first && status === 'builtin'), swapped = false;
      it.start = function () {
        it.dur = (st.reduced ? 0.4 : 1.2) * st.speed; PK.hold = true; PK.t = 0; PK.onSpot = !short; PK.status = status;
        var face = sp.face * D2R;
        if (short) { var dx = sp.x - oct.pos.x, dz = sp.z - oct.pos.z; if (Math.hypot(dx, dz) > 1e-3) face = Math.atan2(dx, dz); }
        oct.wantYaw = face; if (st.reduced) oct.faceYaw = face;
        var act = short ? '' : (sp.act || '');
        var pose = { lean: 7 * D2R };   /* 기웃 = 앞으로 기댐 */
        if (status === 'simulated') pose.lean = 12 * D2R;                 /* 멀리서 목을 빼고 */
        if (status === 'failed') { pose.lean = 0; pose.shrug = 0; }      /* 서서 작게 으쓱 */
        if (status === 'none' || act === 'sit') { pose.sit = 1; pose.lean = 0; }
        if (act === 'up') pose.lean = -12 * D2R;                          /* 나무 밑: 올려다보기 */
        if (act === 'rustle' && !st.reduced) pose.rustle = true;
        if (act === 'count') pose.count = -1;
        if (act === 'mailOpen') pose.mail = 1;
        pkPose(pose);
        if (act === 'ripple') PK.plop = 1;
        setExpression(status === 'none' ? 'sleepy' : status === 'failed' ? 'calm' : happy && st.reduced ? 'happy' : 'curious');   /* read/first = curious → happy · builtin·simulated = curious · failed = calm · none = sleepy */
      };
      it.update = function (k) {
        var t = k * it.dur / st.speed; PK.t = t;
        if (happy && !swapped && (t >= 0.35 || st.reduced)) { swapped = true; setExpression('happy'); if (!PK.sit) PK.lean = 0; }   /* 찾았다 → 몸을 펴고 폴짝 2 (^ ^ 눈이 보이게) */
        if (PK.count > -2 && !st.reduced) {   /* 수: 기둥마다 고개 까딱 (0.25 s 간격, 기둥 쪽으로 돌아보며) */
          var c = Math.min(PK_FENCE.length - 1, Math.floor(t / 0.25));
          if (c !== PK.count) { PK.count = c; PK.nod = 0; var f = PK_FENCE[c]; oct.wantYaw = Math.atan2(f[0] - oct.pos.x, f[1] - oct.pos.z); }
        }
        if (sp.act === 'mail1' && PK.onSpot) PK.mail = t >= 0.5 && t < 0.5 + 1 / 12 ? 1 : 0;   /* 손: 우체통이 딱 한 프레임 열린다 */
      };
      it.end = function () { PK.hold = false; PK.mail = 0; PK.rustle = false; };
      return it;
    }
    function cerQueue(name, items, onDone) { /* 출발·기웃·퇴장이 진행 중이면 뒤에 잇는다 (앞 것의 onDone 은 이음매에서 부른다) — 그 밖엔 새 의식 */
      if (oct.walking) { oct.walking.cancel(); oct.walking = null; }
      if (CER.active && /^(depart|peek|leave)$/.test(CER.name)) {
        var prev = CER.done;
        CER.q.push(cerDo(function () { CER.name = name; if (prev) prev(); }));
        CER.q = CER.q.concat(items);
        return new Promise(function (resolve) { CER.done = function () { if (onDone) onDone(); resolve(); }; });
      }
      return cerRun(name, items, onDone);
    }
    function peekOutside(o, onDone) {
      o = o || {}; var key = spotKey(o), status = STATUS_OK[o.status] ? o.status : 'builtin';
      var plan = cerDo(function () {
        var sp = EXT_SPOTS[key], items = [], short = status === 'simulated', target = sp.approach || [sp.x, sp.z], from;
        if (PLACE.vis !== 'exterior' || PLACE.trans) setPlace('exterior', { instant: true, onSwap: function () {} });
        var onStage = PK.on && octG.visible;
        PK.key = key; PK.emoji = o.emoji || ''; PK.first = !!o.first; PK.status = status; PK.hold = false;
        pkPose(); setExpression('idle');
        if (!onStage) {   /* 무대 밖 → 경로가 가장 짧은 가장자리 출입구에서 폴짝 올라온다 */
          var best = null; PK_ENTRY.forEach(function (e) { var L2 = pkRoute([e.at[0], e.at[2]], target).len; if (!best || L2 < best.len) best = { e: e, len: L2 }; });
          oct.pos.copy(V(best.e.below)); octG.visible = true; octDecal.visible = true; PK.on = true; PK.onSpot = false; PK.spot = null;
          items.push(cerWalk(best.e.at, 0, 0.3)); from = [best.e.at[0], best.e.at[2]];
        } else {
          from = pkHere();
          if (PK.spot && PK.spot.approach && PK.onSpot) { items.push(cerWalk([PK.spot.approach[0], 0, PK.spot.approach[1]], 0, 0.16)); from = PK.spot.approach.slice(); }   /* 계단·돌에서 내려온다 */
        }
        PK.onSpot = false; PK.spot = sp;
        items = items.concat(pkWalkItems(from, target, PK_WALK, short));
        if (sp.approach && !short) items.push(cerWalk([sp.x, sp.y || 0, sp.z], 0, 0.2));   /* 계단·돌 위로 폴짝 */
        items.push(pkHoldItem(key, status, short, o));
        CER.q = items.concat(CER.q);
      });
      return cerQueue('peek', [plan], onDone);
    }
    var STATUS_OK = { read: 1, builtin: 1, simulated: 1, failed: 1, none: 1 };
    function leaveOutside(onDone) {
      var plan = cerDo(function () {
        var items = [];
        if (PLACE.vis === 'exterior' && PK.on && octG.visible) {
          pkPose(); setExpression('idle');
          var from = pkHere();
          if (PK.spot && PK.spot.approach && PK.onSpot) { items.push(cerWalk([PK.spot.approach[0], 0, PK.spot.approach[1]], 0, 0.16)); from = PK.spot.approach.slice(); }
          PK.onSpot = false;
          items = items.concat(pkWalkItems(from, [EXT_P.edge[0], EXT_P.edge[2]], 1.8, false));   /* 출발 의식과 같은 출구 */
          items.push(cerWalk(EXT_P.below, 0, 0.3));
        }
        items.push(cerDo(function () { pkOff(); oct.pos.copy(V(EXT_P.below)); }));
        CER.q = items.concat(CER.q);
      });
      return cerQueue('leave', [plan], onDone);
    }
    var PKP = { acc: 0, step: 0 };
    function stepPeekProps(dt) { /* 12 fps 스텝: 잔물결(평소 1.5 s 마다 4프레임, 바다 기웃 땐 0.67 s 마다) · 덤불 바스락(±1px 교대) · 우체통 열림 */
      mailOpenM.visible = PK.mail > 0;
      var winter = SEASON.cur === 'winter';
      if (st.reduced) { rippleM.visible = false; rustleM.visible = false; return; }
      PKP.acc += dt; var adv = false;
      while (PKP.acc >= RAIN_DT - 1e-6) { PKP.acc -= RAIN_DT; PKP.step++; adv = true; if (PK.plop > 0) PK.plop--; } if (PKP.acc > 1) PKP.acc = 0;
      if (!adv && PKP.step) return;
      var fast = PK.hold && PK.key === 'sea' && PK.onSpot, per = fast ? 8 : 18, f = PKP.step % per;
      rippleM.visible = !winter && f < 4;
      if (rippleM.visible) { var rr = (2 + 2 * f) * S.pw; rippleM.scale.set(rr, 1, rr); }   /* 반지름 2·4·6·8 px */
      rustleM.visible = PK.rustle;
      if (PK.rustle) { var sgn = (PKP.step & 1) ? 1 : -1; rustleM.position.set(snapPos(0.5), 0, snapPos(-0.05)).addScaledVector(_r, sgn * S.pw); rustleM.scale.set(1.12, 1.08 + ((PKP.step >> 1) & 1) * 0.04, 1.12); }
    }
    extReady = true;

    /* ── 입력: 레이캐스트 · 드래그 · 줌 ── */
    var ray = new T.Raycaster(), ndc = new T.Vector2(), press = null, pinch = null, _pb = new T.Box3(), _pv = new T.Vector3();
    /* 탭 판정 (docs/research/furniture-tap-events.md 1·2): ① 문어의 *실제 몸 메시*·포스터·보이는 기념품을 거리순 레이캐스트 (몸 = 문어 'oct')
       → ② 다 빗나가면 문어 히트 구(r 0.67 m) → ③ 창 유리 → ④ 화면 공간 보정: 포스터·기념품 투영 사각형 중 탭에서 NEAR_PX 안 최근접 하나 (2등이 NEAR_GAP 안이면 모호 → 없음).
       큰 히트 구가 문어 뒤 포스터·선반 기념품을 가리지 않는다. 바깥: 문어 히트 구만 (다락 유리·포스터는 숨은 그룹이라도 레이캐스트엔 걸리므로 뺀다) · 숨은 문어·바깥 기웃 중(away)엔 문어 탭 없음 */
    var NEAR_PX = 16, NEAR_GAP = 4;
    function octTappable() { return octG.visible && st.octState !== 'away'; }
    function bodyMeshes() { var out = []; bodyG.traverseVisible(function (o) { if (o.isMesh && o !== hit && o.material && o.material.visible !== false) out.push(o); }); return out; }
    function tapItems() { return posterMeshes.filter(function (m) { return m.visible; }).concat(souvMeshes.filter(function (m) { return m.visible; })); }
    function tapId(o) { var u = o.userData; return u.kind === 'poster' ? u.id : u.kind === 'souvenir' ? (u.sv && u.sv.id) : u.kind; }
    function screenRect(objs, r) {   /* 월드 AABB 꼭짓점 8개 투영 → 캔버스 CSS px 사각형 {l,t,r,b} */
      var l = Infinity, t = Infinity, rr = -Infinity, b = -Infinity;
      objs.forEach(function (o) {
        _pb.setFromObject(o); if (_pb.isEmpty()) return;
        for (var i = 0; i < 8; i++) {
          _pv.set(i & 1 ? _pb.max.x : _pb.min.x, i & 2 ? _pb.max.y : _pb.min.y, i & 4 ? _pb.max.z : _pb.min.z).project(camera);
          var x = (_pv.x * 0.5 + 0.5) * r.width, y = (1 - (_pv.y * 0.5 + 0.5)) * r.height;
          if (x < l) l = x; if (x > rr) rr = x; if (y < t) t = y; if (y > b) b = y;
        }
      });
      return { l: l, t: t, r: rr, b: b };
    }
    function nearItem(px, py, r) {   /* ④ 빗나간 탭 → 화면 공간 최근접 포스터·기념품 (bubble cursor 간이판, 캔버스 CSS px) */
      var best = null, d1 = Infinity, d2 = Infinity;
      tapItems().forEach(function (m) {
        var q = screenRect([m], r), d = Math.hypot(Math.max(q.l - px, 0, px - q.r), Math.max(q.t - py, 0, py - q.b));
        if (d < d1) { d2 = d1; d1 = d; best = m; } else if (d < d2) d2 = d;
      });
      return best && d1 <= NEAR_PX && d2 - d1 >= NEAR_GAP ? best : null;
    }
    function pick(cx, cy) {   /* 클라이언트 CSS px (PointerEvent clientX/Y) → 탭 표적 메시 | null */
      var r = canvas.getBoundingClientRect();
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      var okOct = octTappable();
      if (PLACE.vis === 'exterior') return okOct && ray.intersectObject(hit, false).length ? hit : null;
      var hs = ray.intersectObjects(okOct ? tapItems().concat(bodyMeshes()) : tapItems(), false);
      if (hs.length) { var o = hs[0].object, k = o.userData.kind; return k === 'poster' || k === 'souvenir' ? o : hit; }
      if (okOct && ray.intersectObject(hit, false).length) return hit;
      if (ray.intersectObject(glass, false).length) return glass;
      return nearItem(cx - r.left, cy - r.top, r);
    }
    listen(canvas, 'pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
      if (press && press.id !== e.pointerId) { pinch = { d0: Math.hypot(e.clientX - press.x, e.clientY - press.y), zoom: st.zoom }; return; }
      var o = pick(e.clientX, e.clientY);
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
    /* 컨텍스트 잃음 (docs/research/a11y-and-mobile-perf.md 3): 보이는 동안 3 s 안에 돌아오지 않으면 opts.onLost() 한 번 → 앱이 2D 폴백으로 바꾼다. 돌아오면 아무것도 안 한다 (3D 그대로).
       탭이 숨어 있는 동안은 세지 않는다 (iOS 는 백그라운드에서 회수하고 앞으로 돌아올 때 복구한다) */
    var lostTimer = 0, lostTold = false;
    function armLost() {
      clearTimeout(lostTimer); lostTimer = 0;
      if (!st.lost || lostTold || document.hidden || typeof opts.onLost !== 'function') return;
      lostTimer = setTimeout(function () { lostTimer = 0; if (!st.lost || lostTold || document.hidden) return; lostTold = true; opts.onLost(); }, 3000);
    }
    listen(canvas, 'webglcontextlost', function (e) { e.preventDefault(); st.lost = true; if (oct.walking && oct.walking.finish) oct.walking.finish(); armLost(); });
    listen(canvas, 'webglcontextrestored', function () { st.lost = false; renderer.shadowMap.needsUpdate = true; armLost(); });
    listen(document, 'visibilitychange', function () { st.hidden = document.hidden; armLost(); if (!st.hidden) { lastDraw = 0; loop(); } });
    var ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(function () { resize(); }); ro.observe(container); } else listen(window, 'resize', resize);
    /* 화면 밖 (T4, docs/research/a11y-and-mobile-perf.md 2): 장면이 스크롤로 안 보이면 시뮬레이션(의식·걷기·비 스텝)은 그대로 돌리고 렌더 패스만 건너뛴다. 다시 보이면 디더 0.3 s 쉼 (드래그 뒤와 같은 규칙) */
    var io = null;
    if (window.IntersectionObserver) {
      io = new IntersectionObserver(function (es) { var off = !es[es.length - 1].isIntersecting; if (off === !!st.offscreen) return; st.offscreen = off; if (!off) dither.still = 0; }, { threshold: 0 });
      io.observe(container);
    }

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
    var candleT = 0, loggedBy = { attic: false, exterior: false }, callsBy = { attic: 0, exterior: 0 }, framesBy = { attic: 0, exterior: 0 };
    var perf = { ring: new Float32Array(60), n: 0, i: 0, sum: 0, cnt: 0, auto: 0 };   /* 디버그 통계 (룩 패스 7): 마지막 60 렌더 프레임의 ms/frame (stats().ms). sum/cnt = 첫 2 s 누적 (자동 픽셀 폴백, 룩 패스 8) */
    /* ── 입장 하늘: 구름 퍼프(알파 테스트 쿼드, 텍스처 1텍셀 = 아트 1px) · 하늘 비(1px 세로줄, 12 fps 스텝) / 눈 / 별. 연출 동안만 존재하고 착지하면 버린다 ──
       구름 색은 시각대로: 밤 = 남회색, 노을·새벽 = 웜 베이지, 낮 = 밝은 회색 (Apollo 칸). 노멀 패스에선 숨긴다 (쿼드 테두리가 노멀 하이라이트로 새지 않게) */
    var CLOUD = { w: 112, h: 56, n: 4 };   /* 퍼프 한 칸 112×44 텍셀 = 아트 112×44 px (1:1 — 장면과 같은 픽셀 밀도), 아틀라스 4칸 */
    function cloudTex(night, warm, far) {
      var W = CLOUD.w * CLOUD.n, H = CLOUD.h, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      var x = cv.getContext('2d');
      var col = night ? (far ? ['#577277', '#394a50', '#202e37'] : ['#819796', '#577277', '#394a50'])
        : warm ? (far ? ['#c09473', '#ad7757', '#7a4841'] : ['#e7d5b3', '#d7b594', '#ad7757'])
        : (far ? ['#c7cfcc', '#a8b5b2', '#819796'] : ['#ebede9', '#c7cfcc', '#a8b5b2']);
      for (var v = 0; v < CLOUD.n; v++) {   /* 모양 4가지: 겹친 원 5~7개, 밑면은 평평하게 (적운) */
        var blobs = [], n = 5 + (hash('cloud' + v) % 3), ox = v * CLOUD.w, bottom = H - 6;
        for (var i = 0; i < n; i++) { var q = hash('cb' + v + '_' + i), t = (i + 0.5) / n, rad = 9 + ((q >>> 9) % 7) + Math.round(8 * Math.sin(Math.PI * t)); blobs.push([10 + t * (CLOUD.w - 20) + ((q % 9) - 4), bottom - rad * 0.55 - ((q >>> 4) % 5), rad]); }
        var inside = function (px, py) { if (py > bottom) return false; for (var j = 0; j < blobs.length; j++) { var dx = px - blobs[j][0], dy = py - blobs[j][1]; if (dx * dx + dy * dy <= blobs[j][2] * blobs[j][2]) return true; } return false; };
        for (var py = 0; py < H; py++) for (var px = 0; px < CLOUD.w; px++) {
          if (!inside(px, py)) continue;
          x.fillStyle = !inside(px, py - 3) ? col[0] : (py > bottom - 5 || !inside(px, py + 3)) ? col[2] : col[1];   /* 윗면 3px 밝게 · 밑면 어둡게 (빛은 위에서) */
          x.fillRect(ox + px, py, 1, 1);
        }
      }
      var t = new T.CanvasTexture(cv); t.magFilter = T.NearestFilter; t.minFilter = T.NearestFilter; t.generateMipmaps = false; t.encoding = T.sRGBEncoding; return t;
    }
    function canvasTex(cv) { var t = new T.CanvasTexture(cv); t.magFilter = T.NearestFilter; t.minFilter = T.NearestFilter; t.generateMipmaps = false; t.encoding = T.sRGBEncoding; return t; }
    function buildSky() {
      var ph = phaseOf(st.hour), night = ph === 'night', warm = ph === 'dusk' || ph === 'dawn', w = st.weather, g = new T.Group(), sky = { g: g, list: [], clouds: [] };
      var mats = [false, true].map(function (far) {   /* 구름 그림: js/clouds.js (몽글한 적운, 날씨 × 시각대 램프). 없으면 예전 간단한 퍼프 */
        var tex = typeof CLOUDS !== 'undefined' ? canvasTex(CLOUDS.atlas({ weather: w, phase: ph, far: far, w: CLOUD.w, h: CLOUD.h, n: CLOUD.n })) : cloudTex(night, warm, far);
        var m = new T.MeshBasicMaterial({ map: tex, alphaTest: 0.5, depthWrite: false }); sky.list.push(tex, m); return m;   /* 깊이에 안 쓴다 → 후처리 깊이 외곽선이 구름끼리 겹친 곳에 금을 긋지 않는다 (다락 뒤면 깊이 테스트로 가려진다) */
      });
      var fwd = new T.Vector3(); camera.getWorldDirection(fwd);
      var base = camTarget, VW = S.rw / S.N, VH = (S.rh / S.N) / Math.max(_u.y, 0.3), top = base.y + INTRO.H;
      var nC = w === 'clear' ? 5 : w === 'drizzle' ? 11 : 16;
      for (var i = 0; i < nC; i++) {
        /* 먼 층(어둡고, 카메라를 30 % 따라와 느리게 흐름) · 가까운 층(밝고, 월드에 고정 = 빨리 지나감) → 직교 카메라에서도 깊이가 생긴다 (패럴랙스) */
        var r = hash('cl' + i), far = i % 3 !== 0, gw = CLOUD.w / S.N, gh = CLOUD.h / S.N;
        var geo = new T.PlaneGeometry(gw, gh), uv = geo.attributes.uv.array, v0 = (r % CLOUD.n) / CLOUD.n;
        for (var j = 0; j < uv.length; j += 2) uv[j] = v0 + uv[j] / CLOUD.n;
        var m = new T.Mesh(geo, mats[far ? 1 : 0]); m.quaternion.copy(camera.quaternion); m.renderOrder = (far ? 5 : 40) + i;   /* 쌓는 순서: 먼 층 → 가까운 층, 층 안은 번호순 (깊이를 안 쓰니 순서로) */
        var sx = ((i + 0.5) / nC - 0.5) * VW * 1.25 + (((r >>> 6) % 100) / 100 - 0.5) * 1.2;
        /* 시작 높이: 착지했을 때 화면 위 가장자리(base + 0.62 VH) + 구름 높이 + 패럴랙스로 따라 내려오는 거리 위 → 끝나면 반드시 화면 밖. 위로는 출발 화면 위 바깥까지 */
        var par = far ? 0.3 : 0, y0 = Math.max(base.y + 0.62 * VH + gh + INTRO.H * par, top - 0.35 * VH), y1 = top + 0.85 * VH;
        /* 깊이: 층 안에서는 1 cm 씩만 (후처리 깊이 외곽선 문턱 6 cm 아래 → 같은 층 구름끼리 겹쳐도 금 간 선이 안 생긴다), 먼 층과 가까운 층 사이만 3 m */
        m.userData = { sx: sx, z: (far ? -4 : -1) - i * 0.01, y: y0 + ((r >>> 16) % 1000) / 1000 * (y1 - y0), par: par };
        g.add(m); sky.list.push(geo); sky.clouds.push(m);
      }
      sky.fwd = fwd; sky.VW = VW;
      if (w === 'rain' || w === 'drizzle') {   /* 비 두 층: 먼 층(짧고 어둡게) · 가까운 층(길고 밝게) */
        var n = w === 'rain' ? 90 : 45;
        sky.rain = [{ n: Math.round(n * 0.55), obj: lines(Math.round(n * 0.55), PAL.glass[1]), sp: 6, lens: [3, 5] }, { n: Math.round(n * 0.45), obj: lines(Math.round(n * 0.45), PAL.glass[3]), sp: 9, lens: [5, 8] }];
        sky.rain.forEach(function (L, li) { scene.remove(L.obj); g.add(L.obj); sky.list.push(L.obj.geometry, L.obj.material); L.s = []; for (var q = 0; q < L.n; q++) L.s.push(skyDrop(li, q, 0, true)); });
      } else if (w === 'snow') {
        sky.snow = points(70, PAL.paper[3]); scene.remove(sky.snow); g.add(sky.snow); sky.list.push(sky.snow.geometry, sky.snow.material);
        sky.flakes = []; for (var f = 0; f < 70; f++) sky.flakes.push(skyDrop(9, f, 0, true));
      } else if (night || ph === 'dusk') {   /* 맑은 밤: 별 (정지 — 카메라가 내려가면 위로 흘러간다) */
        var st2 = points(46, PAL.white); scene.remove(st2); g.add(st2); sky.list.push(st2.geometry, st2.material);
        var a = st2.geometry.attributes.position.array;
        for (var s2 = 0; s2 < 46; s2++) { var rs = hash('isky' + s2); _wp.copy(base).addScaledVector(_r, ((rs % 1000) / 1000 - 0.5) * VW).setY(3.6 + ((rs >>> 10) % 1000) / 1000 * (INTRO.H + 3)).addScaledVector(fwd, -6); snapC(_wp); a[s2 * 3] = _wp.x; a[s2 * 3 + 1] = _wp.y; a[s2 * 3 + 2] = _wp.z; }
        st2.geometry.attributes.position.needsUpdate = true;
      }
      scene.add(g); return sky;
    }
    function skyDrop(li, i, cyc, init) {   /* 하늘 낙하물 하나: 화면 가로 위치 · 깊이 · 월드 y · 길이. init 이면 출발 화면 전체에, 아니면 viewY 근처에 */
      var r = hash('sk' + li + '_' + i + '_' + cyc);
      return { c: cyc, x: ((r % 1000) / 1000 - 0.5) * 1.15, z: -0.5 - ((r >>> 10) % 10) * 0.35, y: init ? 3.4 + ((r >>> 14) % 1000) / 1000 * (INTRO.H + 4) : 0, len: 0, r: r };
    }
    function skyLayout(advance) {
      var sky = INTRO.sky; if (!sky) return;
      var k = pxUp(), tg = camTargetNow(), vh = (S.rh / S.N) / Math.max(_u.y, 0.3), top = tg.y + vh * 0.6, bot = tg.y - vh * 0.6, off = introOffset();
      sky.clouds.forEach(function (m) { var u = m.userData; m.position.copy(camTarget).addScaledVector(_r, u.sx).setY(u.y - (INTRO.H - off) * u.par).addScaledVector(sky.fwd, u.z); snapScreen(m.position); });   /* 구름은 매 프레임 (먼 층 패럴랙스), 화면 격자에 스냅. y 를 먼저 정하고 시선 방향으로 민다 (직교: 시선 방향 이동은 화면 위치를 안 바꾼다) */
      var kk = clamp(INTRO.t / INTRO.dur, 0, 1), fade = 1 - clamp((kk - 0.7) / 0.25, 0, 1);   /* 착지 직전 30 % 동안 줄기를 줄인다 (지붕 위로 비가 갑자기 끊기지 않게) */
      function place(d, li) {   /* 화면 밖(위/아래)으로 나간 줄기는 반대편 가장자리 바로 밖에서 다시 (카메라가 빨리 내려갈 땐 아래에서 올라오는 것처럼 보인다) */
        if (d.y > top + 0.4) { d.c++; var n1 = skyDrop(li, d.i, d.c, false); d.x = n1.x; d.z = n1.z; d.y = bot - ((n1.r >>> 20) % 100) / 100 * 0.8; }
        else if (d.y < bot - 1.0) { d.c++; var n2 = skyDrop(li, d.i, d.c, false); d.x = n2.x; d.z = n2.z; d.y = top + ((n2.r >>> 20) % 100) / 100 * 0.8; }
      }
      if (sky.rain) sky.rain.forEach(function (L, li) {
        var a = L.obj.geometry.attributes.position.array, act = Math.round(L.n * fade);
        L.s.forEach(function (d, i) {
          d.i = i; if (advance) d.y -= L.sp * k; place(d, li);
          var len = L.lens[0] + (d.r >>> 4) % (L.lens[1] - L.lens[0] + 1), o = i * 6;
          if (i >= act || d.y < 3.3) { a[o + 1] = a[o + 4] = -50; return; }   /* 지붕(3.1) 아래로는 안 들어온다 */
          _wp.copy(camTarget).addScaledVector(_r, d.x * sky.VW).setY(d.y).addScaledVector(sky.fwd, d.z); snapC(_wp);
          a[o] = _wp.x; a[o + 1] = _wp.y; a[o + 2] = _wp.z; a[o + 3] = _wp.x; a[o + 4] = _wp.y - len * k; a[o + 5] = _wp.z;
        });
        L.obj.geometry.attributes.position.needsUpdate = true;
      });
      if (sky.snow) {
        var b = sky.snow.geometry.attributes.position.array, act2 = Math.round(70 * fade);
        sky.flakes.forEach(function (d, i) {
          d.i = i; if (advance) { d.y -= ((anim.step + i) & 1) * k; if (hash('fl' + i + '_' + anim.step) % 7 === 0) d.x += ((i & 1) ? 1 : -1) / sky.VW / S.N; }
          place(d, 9);
          if (i >= act2 || d.y < 3.3) { b[i * 3 + 1] = -50; return; }
          _wp.copy(camTarget).addScaledVector(_r, d.x * sky.VW).setY(d.y).addScaledVector(sky.fwd, d.z); snapC(_wp);
          b[i * 3] = _wp.x; b[i * 3 + 1] = _wp.y; b[i * 3 + 2] = _wp.z;
        });
        sky.snow.geometry.attributes.position.needsUpdate = true;
      }
    }
    /* 허공 색 읽기: 다음 프레임 후처리 직후 캔버스 네 변에서 64점을 readPixels 로 읽고(같은 프레임이라 preserveDrawingBuffer 없이도 유효, 1회 동기화),
       CPU 추정(배경색 → 셰이더와 같은 보정 → 가중 최근접)과 OKLab 0.08 안의 색 중 가장 많이 나온 것. 폰에선 가장자리에 바닥·벽이 걸리므로 추정 근처만 후보로 본다.
       연출 중엔 비네트를 끄므로 장면 허공 전체가 이 한 색 */
    var SKYPX = { want: false, hex: null };
    function probeSky() {
      if (!SKYPX.want) return; SKYPX.want = false;
      var gl = renderer.getContext(), b = new Uint8Array(4), cnt = {}, est = hexToOklab(skyEstimate()), top = null, n = 16, i, pts = [];
      for (i = 0; i < n; i++) { var fx = Math.floor(i * (S.cw - 1) / (n - 1)), fy = Math.floor(i * (S.ch - 1) / (n - 1)); pts.push([fx, 0], [fx, S.ch - 1], [0, fy], [S.cw - 1, fy]); }
      pts.forEach(function (p) {
        gl.readPixels(p[0], p[1], 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, b);
        var hx = rgbHex([b[0] / 255, b[1] / 255, b[2] / 255]), q = hexToOklab(hx);
        if (Math.hypot(q[0] - est[0], q[1] - est[1], q[2] - est[2]) > 0.08) return;
        cnt[hx] = (cnt[hx] || 0) + 1; if (!top || cnt[hx] > cnt[top]) top = hx;
      });
      if (top) SKYPX.hex = top;
    }
    function skyHex() { SKYPX.want = true; return SKYPX.hex || skyEstimate(); }
    function skyEstimate() {
      var lab = hexToOklab((light.to && light.to.bg) || LIGHTS.night.bg), L = (lab[0] - 0.5) * 1.03 + 0.5, A = lab[1] * 1.07, B = lab[2] * 1.07, best = 1e9, bestL = 0, out = PAL.list[0];
      PAL.list.forEach(function (h) { var q = hexToOklab(h), d = Math.pow(L - q[0], 2) + Math.pow((A - q[1]) * 1.3, 2) + Math.pow((B - q[2]) * 1.3, 2); if (d < best - 0.0005 || (d < best + 0.0005 && q[0] > bestL)) { best = d; bestL = q[0]; out = h; } });
      return out;
    }
    function startIntro(o) {
      o = o || {};
      if (INTRO.on) finishIntro();
      if (st.reduced || o.instant) return Promise.resolve(false);
      INTRO.dur = clamp(+o.dur || 2.2, 0.6, 6); INTRO.t = 0; INTRO.acc = 0; INTRO.hold = !!o.hold;   /* hold: 착지 뒤에도 비네트를 끈 채로 (입장 레이어가 걷힐 때 introRelease) */
      placeCamera();   /* _r · _u 갱신 */
      var vh = (S.rh / S.N) / Math.max(_u.y, 0.3);
      INTRO.H = (o.height || 1.35) * vh; INTRO.D = 3 * pxUp();   /* 출발 = 방이 화면 아래로 완전히 빠진 높이 · 착지 눌림 아트 3px */
      INTRO.on = true; dither.still = 0; post.uniforms.uVig.value = 0;   /* 비네트 끔: 허공이 한 색이어야 바깥 덮개와 이음매 없이 이어진다 */
      INTRO.sky = buildSky(); skyLayout(false);
      return new Promise(function (res) { INTRO.resolve = res; });
    }
    function finishIntro() {
      if (!INTRO.on) return;
      INTRO.on = false; dither.still = 0; if (!INTRO.hold) introRelease();
      var sky = INTRO.sky; INTRO.sky = null;
      if (sky) {   /* 장면에서는 바로 빼고, GPU 자원 정리는 착지 순간을 피해 1.5 s 뒤 (착지 프레임에 텍스처·버퍼 삭제가 겹치지 않게) */
        scene.remove(sky.g);
        setTimeout(function () { sky.list.forEach(function (d) { if (d && d.dispose) d.dispose(); }); }, 1500);
      }
      placeCamera();
      var r = INTRO.resolve; INTRO.resolve = null; if (r) r(true);
    }
    function introRelease() { INTRO.hold = false; post.uniforms.uVig.value = hasDepthTex ? 1 : 0; }
    function applyPendingPixel() {   /* 자동 픽셀 폴백 적용: 입장 연출(하늘·타이틀) 동안은 미룬다 — 연출 한가운데서 픽셀 밀도가 바뀌면 구름·로고와 어긋나고 깜빡인다 */
      if (!perf.pendingPixel || INTRO.on || INTRO.hold) return;
      st.look.pixelSize = perf.pendingPixel; st.look.autoPixel = perf.pendingPixel; perf.pendingPixel = 0; resize(); dither.still = 0;
    }
    function stepIntro(dt) {
      if (!INTRO.on) return;
      INTRO.t += dt; dither.still = 0;   /* 움직이는 동안 디더 끔 (드래그와 같은 규칙) */
      INTRO.acc += dt; var adv = INTRO.acc >= RAIN_DT - 1e-6; if (adv) INTRO.acc = 0;
      skyLayout(adv);
      if (INTRO.t >= INTRO.dur) finishIntro();
    }
    function frame(ts) {
      var idle = (st.octState === 'idle' || st.octState === 'sleep' || st.octState === 'stay') && !oct.walking && !(G.settleT < GAIT.settle) && !dragging && light.t >= 1 && dither.still > 0.3 && !PLACE.trans && !CER.active;
      /* 프레임 상한은 *시간* 기준 (docs/research/a11y-and-mobile-perf.md 1): 가만히(또는 화면 밖) 30fps · 그 밖 60fps — 120Hz 폰도 60. 건너뛴 콜백의 시간은 버리지 않고
         다음에 그리는 프레임의 dt 로 넘긴다 (예전 홀수 콜백 건너뛰기는 dt 째 버려서 가만히 있을 때 비·양초·먼지·깜빡임·커튼이 반속도였다). debugStep(st.force) 은 항상 주어진 dt 로 진행·렌더 */
      if (!st.force && lastDraw && ts - lastDraw < (idle || st.offscreen ? 1000 / 30 : 1000 / 60) - 1) return;
      var dt = lastDraw ? Math.min(0.1, (ts - lastDraw) / 1000) : 0.016; lastDraw = ts; time += dt; frameNo++;
      if (ctxLost()) return;
      var t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0;
      applyPendingPixel();
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
      stepTrans(dt); stepCer(dt);   /* 장소 전환 · 출발/귀가 의식 (바깥·계절·전환) */
      if (atticG.visible) stepWeather(dt); if (extG.visible) stepExt(dt);
      post.uniforms.uFade.value = PLACE.fade; if (PLACE.fade > 0) { var fk = hexToOklab(LIGHTS[phaseOf(st.hour)].bg); post.uniforms.uFadeOk.value.set(fk[0], fk[1], fk[2]); }
      stepOct(dt); stepHang(dt); stepIntro(dt);
      lampGlow.quaternion.copy(camera.quaternion); candleGlow.quaternion.copy(camera.quaternion);
      placeCamera(); updateOverlay();
      if (!st.offscreen || st.force) draw(t0);   /* 화면 밖(T4): 시뮬레이션은 위에서 다 돌았고 렌더 패스만 건너뛴다 */
      if (frameNo === 2 && !PORT.warm) { PORT.warm = true; try { portrait('idle', { shared: true }); } catch (e) { /* 초상 워밍업(셰이더 변형 컴파일 1회)은 실패해도 장면엔 영향 없음 */ } }
    }
    function draw(t0) {   /* 렌더 패스: 뷰티 → 노멀 → 발광(+블러) → 후처리 합성 · 프레임 ms · 드로우콜 로그 */
      drawN++;
      renderer.shadowMap.needsUpdate = true;
      renderer.setRenderTarget(rt); renderer.clear(true, true, false); renderer.render(scene, camera);
      calls = renderer.info.render.calls;
      scene.overrideMaterial = normalMat; var bg = scene.background; scene.background = null; shade.visible = false; if (INTRO.sky) INTRO.sky.g.visible = false;   /* 차폐는 노멀 패스에서 숨김 (방 전체를 덮어쓰지 않게) */
      renderer.setRenderTarget(rtN); renderer.clear(true, true, false); renderer.render(scene, camera);
      scene.overrideMaterial = null;
      calls += renderer.info.render.calls;
      /* 발광 패스 (룩 패스 6): 레이어 1 의 발광 쌍둥이 3개만 (배경 없음 = 검정). 깊이 텍스처가 있으면 뷰티 깊이를 공유하므로 색만 지운다 → 가려진 발광은 안 그려진다 */
      camera.layers.set(1);
      renderer.setRenderTarget(rtE); renderer.clear(true, !hasDepthTex, false); renderer.render(scene, camera);
      camera.layers.set(0); scene.background = bg; shade.visible = true; if (INTRO.sky) INTRO.sky.g.visible = true;
      calls += renderer.info.render.calls;
      if (blurOn) {   /* 분리 블러 가로 → 세로 (풀스크린 삼각형 2회, rtE → rtB → rtE). p ≥ 4 면 생략 */
        quad.material = blurMat;
        blurMat.uniforms.tSrc.value = rtE.texture; blurMat.uniforms.uDir.value.set(1 / S.rw, 0); renderer.setRenderTarget(rtB); renderer.render(quadScene, quadCam);
        blurMat.uniforms.tSrc.value = rtB.texture; blurMat.uniforms.uDir.value.set(0, 1 / S.rh); renderer.setRenderTarget(rtE); renderer.render(quadScene, quadCam);
        quad.material = post; calls += 2;
      }
      renderer.setRenderTarget(null); renderer.render(quadScene, quadCam); probeSky();
      calls += 1;
      if (t0) { var ms = performance.now() - t0; perf.ring[perf.i] = ms; perf.i = (perf.i + 1) % 60; if (perf.n < 60) perf.n++; perf.sum += ms; perf.cnt++; }
      /* 자동 픽셀 폴백 (룩 패스 8): 기본 p=2 로 첫 2 s 의 평균 ms/frame(메인 스레드) 이 24 ms 를 넘으면 이 세션만 p=3 (st.look 에만, 저장 X — 데브 슬라이더가 덮어쓸 수 있다) */
      if (!perf.auto && time >= 2 && perf.cnt >= 10) {
        perf.auto = +(perf.sum / perf.cnt).toFixed(2);
        if (perf.auto > 24 && (st.look.pixelSize | 0) < 3) { perf.pendingPixel = 3; console.info('[scene3d] auto pixel 3 (first 2 s mean ' + perf.auto + ' ms/frame > 24)'); }   /* 바꾸기는 다음 프레임 렌더 *전에* (렌더 직후 resize 하면 캔버스가 비워진 채 한 프레임이 보인다) · 입장 연출 중이면 연출이 끝난 뒤 */
      }
      if (!PLACE.trans) { var pv = PLACE.vis; callsBy[pv] = calls; framesBy[pv]++;
        if (!loggedBy[pv] && framesBy[pv] > 3) {   /* 장소마다 한 번 (바깥·계절·전환: 두 장소 모두 ≤ 150) */
          loggedBy[pv] = true; console.info('[scene3d] draw calls ' + calls + ' (≤150 ' + (calls <= 150 ? 'ok' : 'OVER') + ') · target ' + S.rw + '×' + S.rh + ' · px ' + S.p + ' · palette ' + PAL.list.length + ' · static props ' + (pv === 'exterior' ? extPropN + ' · place exterior · season ' + SEASON.cur : propCount));
          if (calls > 150) console.error('[scene3d] draw calls ' + calls + ' > 150 (renderer.info, ' + pv + ')');   /* 예산 단언: look-shots / evidence3d 가 console.error 로 실패 처리 */
        }
      }
    }
    function loop() { if (st.paused || st.hidden) return; cancelAnimationFrame(raf); raf = requestAnimationFrame(function (ts) { frame(ts); loop(); }); }

    /* ── 초기 상태 ── */
    var hookSeason = null; try { hookSeason = window.__ppolLook && window.__ppolLook.season; } catch (e) { /* noop */ }
    resize(); applyItems(); applyWeather(); setTime(st.hour, true); applyLamp(); setSeason(opts.season || hookSeason || 'auto');   /* 테스트 훅 window.__ppolLook.season 을 장면이 직접 읽는다 */
    setPosters(opts.posters || []); setSouvenirs(opts.souvenirs || []);
    jumpTo('window'); setOctState('idle');
    if (opts.octEl) { container.appendChild(opts.octEl); opts.octEl.classList.add('overlay3d'); }
    container.classList.add('mode-3d');
    /* 셰이더 예열 (T3, docs/research/polish-from-starred-repos.md): 첫 바깥 전환이 프로그램 9개를 새로 컴파일하며 멈칫하던 것을 부팅으로 옮긴다.
       r128 compile 은 조명을 traverseVisible 로만 모으므로 장소마다 한 번씩 (그 장소만 보이게, 뷰티 패스와 같은 sRGB 타깃으로) 부른다. 재질은 숨은 것까지 traverse 하므로
       다른 장소 그룹은 잠깐 장면에서 떼어 낸다 (안 떼면 쓰지 않을 조명 변형이 9개 더 생긴다) · 문어는 두 장소를 오가므로 바깥 패스에선 바깥 그룹에 잠깐 붙인다. 끝나면 부모·순서·보이기를 되돌린다.
       compile 이 닿지 않는 노멀 패스 덮어쓰기 재질·그림자 깊이 재질의 바깥 변형 3개(조명 수·인스턴스가 달라 따로 생긴다)는 바깥 노멀 패스를 rtN 에 한 번 그려 컴파일한다
       (그림자 갱신 포함. rtN·그림자 맵은 첫 프레임이 다시 그리므로 화면엔 안 남는다) */
    (function prewarm() {
      if (ctxLost()) return;
      var av = atticG.visible, ev = extG.visible, prt = renderer.getRenderTarget(), bg = scene.background;
      function lift(o) { var p = o.parent, i = p.children.indexOf(o); p.remove(o); return function () { p.add(o); p.children.splice(p.children.indexOf(o), 1); p.children.splice(i, 0, o); }; }
      var putExt = null, putAttic = null, putOct = null;
      try {
        renderer.setRenderTarget(rt);
        putExt = lift(extG); atticG.visible = true; renderer.compile(scene, camera); putExt(); putExt = null;
        putOct = lift(octG); extG.add(octG); putAttic = lift(atticG); extG.visible = true; renderer.compile(scene, camera);
        renderer.shadowMap.needsUpdate = true; scene.overrideMaterial = normalMat; scene.background = null;   /* draw() 의 노멀 패스와 같은 조건 */
        renderer.setRenderTarget(rtN); renderer.clear(true, true, false); renderer.render(scene, camera);
      } catch (e) { /* 예열 실패는 첫 렌더가 대신 컴파일한다 */ }
      scene.overrideMaterial = null; scene.background = bg;
      if (putExt) putExt(); if (putAttic) putAttic(); if (putOct) putOct();
      atticG.visible = av; extG.visible = ev; renderer.setRenderTarget(prt);
    })();
    ready = true; loop();

    return {
      kind: '3d', renderer: renderer, scene: scene, camera: camera,
      setLantern: function (n) { st.lantern = n | 0; lampDirty = true; },
      setItems: function (items) { st.items = (items || []).slice(); applyItems(); },
      setWeather: function (w) { st.weather = w || 'rain'; applyWeather(); },
      setTime: setTime, setColor: setColor,
      setOctState: setOctState, setCarry: function (svg) { octState.carrySvg = svg; },
      setExpression: setExpression, expression: function () { return face.expr; }, EXPRESSIONS: EXPRESSIONS.slice(),   /* 룩 패스 8: 표정은 상태와 별개 (상태가 기본 표정을 고르고, app.js 가 덮어쓴다) */
      portrait: portrait, portraitURL: portraitURL,   /* 64×64 초상 캔버스 / data URL (표정·몸색·팔레트·배경 키 캐시, opts.bg = 'transparent'(기본) | 'navy' | '#rrggbb') */
      moveTo: moveTo, jumpTo: jumpTo, finishWalk: function () { if (oct.walking && oct.walking.finish) oct.walking.finish(); },   /* 건너뛰기: 걷던 길을 지금 도착시키고 moveTo 의 Promise 를 푼다 (2D 와 같은 API) */
      intro: startIntro, introSkip: finishIntro, introRelease: introRelease, introActive: function () { return INTRO.on; }, introProgress: function () { return INTRO.on ? clamp(INTRO.t / INTRO.dur, 0, 1) : 1; },   /* 입장 연출: intro({ dur, height, instant, hold }) → Promise(착지) · introSkip() 바로 착지 · introRelease() 비네트 복귀 */
      skyHex: skyHex,   /* 지금 허공(배경)이 화면에 찍히는 색 — 입장 레이어가 장면 밖을 같은 색으로 덮는다 */
      /* 바깥·계절·전환 (DESIGN §15.3, docs/SCENE.md): 장소 'attic' | 'exterior' · 계절 'spring' | 'summer' | 'autumn' | 'winter' | 'auto'(실제 월) · 출발/귀가 의식 (onDone 콜백 + Promise) */
      setPlace: function (p, o) { setPlace(p, o); }, place: function () { return PLACE.cur; },
      setSeason: setSeason, season: function () { return SEASON.cur; }, seasonMode: function () { return SEASON.mode; },
      departCeremony: departCeremony, returnCeremony: returnCeremony, ceremony: function () { return CER.name; },
      /* 비상 정지: 프레임이 못 도는 동안(WebGL 컨텍스트 잃음) 남은 의식을 버리고 다락으로. onDone 은 부르지 않는다 (앱이 이미 정리) */
      cancelCeremony: function () { CER.q = []; CER.cur = null; CER.active = false; CER.name = ''; CER.done = null; CER.walk = false; oct.hop = 0; pkReset(); octG.visible = true; octDecal.visible = true; setPlace('attic', { instant: true }); },
      /* 바깥 기웃 (docs/SCENE.md "바깥 기웃"): extSpot(corner|roomId) → {key,x,y,z,face(rad),prop,act} · peekOutside({corner, roomId, status, first, emoji}, onDone) → Promise · leaveOutside(onDone) → Promise */
      extSpot: extSpot, peekOutside: peekOutside, leaveOutside: leaveOutside, EXT_SPOTS: Object.keys(EXT_SPOTS),
      peek: function () { return { on: PK.on, key: PK.key, hold: PK.hold, onSpot: PK.onSpot, status: PK.status, t: +PK.t.toFixed(2), lean: +(PK.leanQ / DEG).toFixed(1), sit: PK.sit, arm: PK.arm, mail: PK.mail, rustle: PK.rustle && rustleM.visible, ripple: rippleM.visible }; },
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
        st.palette = name; PAL = buildPalette(st.color, name); uploadPalette(); ditherBase(); dither.still = 0; portraitFlush();
      },
      paletteName: function () { return st.palette; },
      palette: function () { /* 스와치 줄: 램프면 램프별, 검증 팔레트면 8칸씩 + 문어 램프 */
        var out = [];
        if (PAL.source === 'ramps') { out = RAMPS.map(function (r) { return { name: r[0], colors: PAL[r[0]] }; }); out.push({ name: 'fixed', colors: [PAL.ink, PAL.white, PAL.night] }); }
        else { var base = PAL.list.slice(0, PAL.list.length - PAL.oct.length); for (var i = 0; i < base.length; i += 8) out.push({ name: PAL.source + ' ' + (i / 8 + 1), colors: base.slice(i, i + 8) }); }
        out.push({ name: 'oct', colors: PAL.oct }); return out;
      },
      /* 디버그 (룩 패스 7, tools/look-strip.js): 루프를 멈추고 dt 초만큼 한 프레임 진행·렌더 (idle 30fps 건너뛰기 무시) → 12 fps 프레임 스트립을 결정적으로 찍는다. resume() 으로 재개 */
      debugStep: function (dt) { st.paused = true; cancelAnimationFrame(raf); st.force = true; frame((lastDraw || 0) + Math.max(0.001, +dt || 1 / 12) * 1000); st.force = false; },
      /* 디버그 (T2, tools/test-scene-perf.js): 탭 표적 목록 {kind,id,x,y,rect} · pickAt(x, y) → {kind,id} | null. 좌표는 둘 다 클라이언트 CSS px (PointerEvent clientX/Y 와 같은 계) */
      targets: function () {
        scene.updateMatrixWorld(); camera.updateMatrixWorld();
        var r = canvas.getBoundingClientRect(), out = [];
        function add(kind, id, objs) { var q = screenRect(objs, r); if (!isFinite(q.l)) return; out.push({ kind: kind, id: id, x: r.left + (q.l + q.r) / 2, y: r.top + (q.t + q.b) / 2, rect: { l: r.left + q.l, t: r.top + q.t, r: r.left + q.r, b: r.top + q.b } }); }
        if (octTappable()) add('oct', 'oct', bodyMeshes());
        if (PLACE.vis !== 'exterior') { add('window', 'window', [glass]); tapItems().forEach(function (m) { add(m.userData.kind, tapId(m), [m]); }); }
        return out;
      },
      pickAt: function (x, y) { scene.updateMatrixWorld(); camera.updateMatrixWorld(); var o = pick(+x, +y); return o ? { kind: o.userData.kind, id: tapId(o) } : null; },
      screenOf: function (x, y, z) { var p = _hp.set(x, y, z).project(camera); return { x: S.offX + (p.x * 0.5 + 0.5) * S.cw, y: S.offY + (1 - (p.y * 0.5 + 0.5)) * S.ch }; },   /* 월드 → 컨테이너 CSS px (스트립 크롭 중심) */
      msFrame: function () { var s = 0; for (var i = 0; i < perf.n; i++) s += perf.ring[i]; return { ms: perf.n ? +(s / perf.n).toFixed(2) : 0, n: perf.n }; },
      motion: function () { return { place: PLACE.vis, trans: PLACE.trans ? +PLACE.trans.t.toFixed(3) : 0, fade: +PLACE.fade.toFixed(3), ceremony: CER.name, door: +DOOR_EXT.a.toFixed(2), octVisible: octG.visible, peek: PK.on ? PK.key + (PK.hold ? ':hold' : ':walk') : '', extStep: xanim.step, swayPx: swayPx, shimmer: shim.k, curtainFrame: CURT.frame, rainStep: anim.step, armStep: anim.armStep, blink: oct.blinkLeft > 0, reduced: st.reduced, expr: face.applied, hop: +bodyG.position.y.toFixed(3), armX: +arms[0].scale.x.toFixed(2), tilt: +(bodyG.rotation.z / DEG).toFixed(1), squashY: +bodyG.scale.y.toFixed(3), gait: { moving: G.moving, antic: G.antic > 0, phase: +G.phase.toFixed(3), step: Math.floor(G.phase), roll: +(G.roll / DEG).toFixed(1), yaw: +(G.yaw / DEG).toFixed(1), lean: +(G.lean / DEG).toFixed(1), armK: +G.armK.toFixed(2), bobPx: Math.round(bodyG.position.y * OCT_R / pxUp()), style: GAIT.stepped ? 'stepped' : 'smooth', at: (function () { var w = octG.getWorldPosition(new T.Vector3()); return [+w.x.toFixed(3), +w.y.toFixed(3), +w.z.toFixed(3)]; })() } }; },
      gaitStyle: function (s) { if (s === 'stepped' || s === 'smooth') GAIT.stepped = s === 'stepped'; return GAIT.stepped ? 'stepped' : 'smooth'; },   /* 디버그: 걸음 굴림 3단 스텝(기본) / 매끈 — tools/walk-strip.js 비교용 */   /* 룩 패스 7·8 디버그 */
      stats: function () { return { calls: calls, target: [S.rw, S.rh], pixel: S.p, palette: PAL.list.length, paletteName: PAL.source, step: +PAL.step.toFixed(4), dither: +dither.base.toFixed(4), ditherFlat: +(dither.base * 0.125).toFixed(4), pw: +S.pw.toFixed(4), hasDepthTex: hasDepthTex, zoom: ZOOM_STEPS[st.zoom], props: propCount, key: +st.look.key.toFixed(2), fill: +st.look.fill.toFixed(2), sun: +sun.intensity.toFixed(2), hemi: +hemi.intensity.toFixed(2), phase: phaseOf(st.hour), bloom: BLOOM, blur: blurOn ? 'h5v5' : 'off', em: +(light.em || 0).toFixed(2), expr: face.expr, portraitMs: PORT.ms, portraitN: PORT.n, portraitCache: Object.keys(PORT.cache).length, autoMs: perf.auto, autoPixel: st.look.autoPixel || 0, place: PLACE.cur, season: SEASON.cur, offscreen: !!st.offscreen, draws: drawN, callsAttic: callsBy.attic, callsExt: callsBy.exterior, extProps: extPropN }; },
      refresh: function () { applyItems(); },
      pause: function () { st.paused = true; cancelAnimationFrame(raf); }, resume: function () { st.paused = false; lastDraw = 0; loop(); },
      destroy: function () {
        st.paused = true; cancelAnimationFrame(raf); unbind.forEach(function (f) { f(); }); if (ro) ro.disconnect(); if (io) io.disconnect();
        clearTimeout(lostTimer); lostTold = true;
        posterMeshes.forEach(function (m) { if (m.material !== posterMat) { if (m.material.map) m.material.map.dispose(); m.material.dispose(); } });
        if (carry.material !== posterMat) { if (carry.material.map) carry.material.map.dispose(); carry.material.dispose(); }
        disposables.forEach(function (d) { if (d && d.dispose) d.dispose(); });
        normalMat.dispose(); renderer.dispose(); renderer.forceContextLoss();
        if (opts.octEl && container.querySelector('#stage') === null) { var stg = document.getElementById('stage'); if (stg) stg.appendChild(opts.octEl); opts.octEl.classList.remove('overlay3d'); }
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        container.classList.remove('mode-3d');
      },
      anchors: ANCHORS, extAnchors: EXT_P, PLACES: ['attic', 'exterior'], SEASONS: SEASONS.slice()
    };
  }

  return { supported: supported, init: init, buildPalette: buildPalette, ramp: ramp, hexToOklab: hexToOklab, ANCHORS: ANCHORS, PAL_SOURCES: PAL_SOURCES, PAL_DEFAULT: PAL_DEFAULT, MAT: MAT, LIGHTS: LIGHTS, EXPRESSIONS: EXPRESSIONS.slice() };
})();
