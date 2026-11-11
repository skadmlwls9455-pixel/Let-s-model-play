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
  /* 줌 멈춤 7개, 한 칸 2^(1/6) ≈ 12 % (docs/INTERIOR_MODE.md §3.5): p=2 → 27·30·34·38·43·48·54 아트px/m, p=3 → 18·20·23·25·29·32·36. 핀치는 손가락 거리 비율을 가장 가까운 멈춤에 잇달아 맞춘다(건너뛰지 않음), 휠은 한 칸.
     ZOOM_OLD = 예전 4단 (setLook({zoom:i}) 호환: look-shots close · play.html 이 i 로 부른다 → 같은 배율) */
  var ZOOM_STEPS = [0, 1, 2, 3, 4, 5, 6].map(function (k) { return Math.pow(2, k / 6); }), ZOOM_OLD = [1, 1.25, 1.5, 2];
  /* 방 5×5 m (x,z ∈ [-2.5, 2.5]). 뒷벽 오른쪽 끝의 문으로 나간다 (§13.2 의 앞쪽 문은 직교 시점에서 바닥을 가려 뒷벽으로 옮김) */
  var R = 2.5;
  /* 11-10 방 넓히기 (주인: "캐릭터랑 문어 대비 방이 너무너무 좁은 느낌 — 넓혀 줘 · 다닥다닥 답답한 느낌을 지워 줘"): 뒷벽(−z) · 왼벽(−x)과 벽에 붙은 것들은 그대로 두고, **앞쪽(카메라 쪽) 바닥을 +x · +z 로 RF 까지** 넓힌다
     → 바닥 5 × 5 m → 6 × 6 m (넓이 +44 %), 늘어난 곳은 전부 빈 바닥. 화면 폭(1× 195 아트px)보다 방(229 px)이 넓어져 양 끝 모서리는 화면 밖 — 다락은 1× 에서도 화면을 밀 수 있고, 내 캐릭터가 가장자리로 가면 화면이 따라간다 */
  var RF = 3.5, R_SPAN = R + RF, R_MID = (RF - R) / 2;
  var SOFA = { x0: -R + 0.20, z: 2.0 };   /* 소파: 등 쪽 끝 x (왼벽 샛기둥 앞) · 가운데 z */
  var ANCHORS = { door: [1.95, 0, -2.05], window: [-1.8, 0, 0.4], crate: [1.25, 0, -1.0], board: [0.1, 0, -2.0], blanket: [-0.65, 0, 1.6], center: [0, 0, 0.2],
    salon: [-1.75, 0, -1.1] };   /* salon = 미용실 거울 옆 (docs/SALON.md §2.1): 거울의 왼쪽 아래에 서서 거울을 가리지 않는다 · 상자 더미 앞면에서 0.53 m · 대야 자리에서 0.79 m */
  /* 놀이방 (8물결, docs/SCENE.md '놀이방'): 다락·바깥처럼 따로 그리는 세 번째 장소 'play'. 바닥 ±PLAY_R · 벽 PLAY_H (받침 포함 화면 높이 ≈ 135 아트px). 처음 들어갈 때만 만든다.
     문 앞 앵커 = 나중의 걸어 다니는 내 캐릭터가 문을 열기 전에 서는 자리 (각 장소 그룹 좌표, 그룹은 원점). 문어 앵커(ANCHORS)와 따로 — 문어는 놀이방에 안 간다 */
  var PLAY_R = 2.8, PLAY_H = 2.2;   /* 11-10 (3): 2.4 → 2.8 (주인 "너무 좁아 보여, 전처럼 조금만 넓혀 줘") — 화면보다 넓어진 만큼은 거실처럼 카메라가 캐릭터를 따라간다 */   /* 11-10: 1.7 → 2.4 (바닥 3.4 → 4.8 m, 넓이 두 배 — 주인 "부엌~게임기 쪽이 너무 좁음, 특히 넓혀 줘"). 한 화면 배치로 장면이 화면을 다 써서 세로가 넉넉하다 */   /* ROOM_EXPANSION §5.2 의 3.6 × 2.4 m 는 360×640 장면(139 아트px)에 145 px 라 위아래가 잘려, 카드의 둘째 후보 3.4 × 2.2 m (≈ 135 px) 로 — scene-api.md '크기' */
  var LOFT_R = 2.2, LOFT_H = 1.5, LOFT_PEAK = 3.15;   /* 11-10 위층 다락 (지붕 밑 방): 바닥 4.4 m · 무릎벽 1.5 m · 박공 꼭대기 3.15 m */
  var STAIR = { x0: 2.62, x1: 3.46, z0: -2.42, z1: -1.72, top: 2.5 }, HATCH = { x0: 1.3, x1: 2.0, z0: -2.0, z1: -1.2 };   /* 거실 뒷벽 오른쪽 구석의 가파른 계단 · 위층 바닥의 계단 구멍 */
  var DOOR_ANCHORS = { atticPlayDoor: [RF - 0.55, 0, 1.92], playAtticDoor: [-(PLAY_R - 0.35), 0, -0.33], atticStair: [2.3, 0, -2.05], loftStair: [0.95, 0, -1.35] };   /* 11-11: 옷감 선반(앞면 z −1.72)의 둘레에 걸리지 않게 조금 앞으로 */   /* 내 캐릭터가 문을 열기 전에 서는 자리. 다락 문은 +x 벽에서 카메라 쪽으로 서 있어 문 바로 안쪽(z 1.4)에 서면 문짝 뒤에 다 가려진다 → 손잡이 쪽 옆(z 1.92, 문 끝 1.76 에서 0.16 m)에 선다 · 놀이방 문은 −x 벽이라 문 앞(x −1.35)이 문보다 앞에 보인다 */
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
  function buildPalette(octHex, source, extra) {   /* extra = 더 넣을 색 (미용실 병·물 프리셋 중 스냅에서 색상이 25° 넘게 틀어지는 것만 — 문어 램프 뒤에, PAL_MAX 안에서만) */
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
    list = list.concat(P.oct);
    P.extra = [];
    if (extra && extra.length) { var el = list.map(hexToOklab); extra.forEach(function (h) { h = String(h).toLowerCase(); if (!/^#[0-9a-f]{6}$/.test(h) || list.length >= PAL_MAX) return; var lab = hexToOklab(h); if (minDist(el, lab) > 0.02) { list.push(h); el.push(lab); P.extra.push(h); } }); }
    list = list.slice(0, PAL_MAX);
    P.list = list; P.step = medianStep(P.extra.length ? list.slice(0, list.length - P.extra.length) : list);   /* 디더 진폭은 덧칸 없이 잰다 — 덧칸이 방 나머지의 디더를 바꾸지 않게 */
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
    'uniform float uDither, uOutline, uHasNormal, uVig, uBloom, uKeepAlpha, uFade, uSky, uStars; uniform vec3 uFadeOk, uSkyOk;',   /* uFade (바깥·전환): 0 = 끔, 1 = 전부 허공색 — 정렬 Bayer 로 픽셀 단위 디더 페이드 */   /* uKeepAlpha 1 = 뷰티 알파를 그대로 (초상 투명 배경) */
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
    'float tap(vec2 uv, vec2 off, float d0, vec3 n0, inout float dd, inout float nn, inout float mk){',
    '  vec2 u2 = uv + off; float d1 = depthM(u2); dd += max(d1 - d0, 0.0);',
    '  vec3 n1 = nrm(u2); float di = clamp(sign((d1 - d0) * 0.25 + 0.0025), 0.0, 1.0);',
    '  float ni = smoothstep(-0.01, 0.01, dot(n0 - n1, vec3(1.0)));',
    '  vec4 t = texture2D(tDiffuse, u2); mk = max(mk, step(t.a, 0.25));',   /* 이웃이 사라지는 문어의 구멍인가 (알파 0) */
    '  nn += (1.0 - dot(n0, n1)) * di * ni; return dot(t.rgb, vec3(0.299, 0.587, 0.114)); }',
    /* 램프 게이트(룩 패스 5): 한 축의 양쪽 1계 차분이 같은 부호일 때 둘 중 작은 쪽 = 연속 기울기. 1px 이음·외곽선·계단 가장자리·2색 경계는 한쪽 차분이 0 이라 0 → 거기엔 디더가 안 붙는다 */
    'float ramp(float lm, float l0, float lp){ float a = l0 - lm, b = lp - l0; return (a * b > 0.0) ? min(abs(a), abs(b)) : 0.0; }',
    'void main(){',
    '  vec2 ap = floor(vUv * uRes), px = 1.0 / uRes;',
    '  vec4 c4 = texture2D(tDiffuse, vUv); vec3 c = c4.rgb;',
    '  float om = (1.0 - uKeepAlpha) * step(c4.a, 0.25);',   /* 사라지는 문어의 구멍 픽셀 (뷰티 알파 0, fadeLook): 색은 뒤 장면인데 깊이·노멀은 문어라 → 잉크선·하이라이트·비네트를 끈다 (안 끄면 윤곽 둘레에 잉크 고리) */
    /* 발광 블룸 (룩 패스 6): 저해상 발광 타깃(등불 유리·양초 불꽃·창 유리만)을 아트 픽셀 단위 5탭 분리 블러한 것을 팔레트 스냅 *전에* 선형으로 더한다 → 글로우가 따뜻한 팔레트 칸으로 양자화되고 램프 게이트 디더를 받는다 */
    '  vec3 bl = srgbToLinear(texture2D(tBloom, vUv).rgb) * uBloom;',
    '  float blk = dot(bl, vec3(0.299, 0.587, 0.114));',
    '  vec3 ok = linToOklab(srgbToLinear(c) + bl);',
    '  ok.x = (ok.x - 0.5) * 1.03 + 0.5; ok.yz *= 1.07;',                               /* grade: 대비 1.03, 채도 1.07 */
    '  float d0 = depthM(vUv); vec3 n0 = nrm(vUv); float l0 = luma(vUv); float dd = 0.0, nn = 0.0, mk = om;',
    '  float lR = tap(vUv, vec2(px.x, 0.0), d0, n0, dd, nn, mk), lL = tap(vUv, vec2(-px.x, 0.0), d0, n0, dd, nn, mk);',
    '  float lU = tap(vUv, vec2(0.0, px.y), d0, n0, dd, nn, mk), lD = tap(vUv, vec2(0.0, -px.y), d0, n0, dd, nn, mk);',
    '  float dei = floor(smoothstep(0.06, 0.5, dd) * 2.0) / 2.0 * uOutline * (1.0 - smoothstep(0.01, 0.08, blk)) * (1.0 - om);',   /* 깊이 외곽선: 2단 (6 cm 부터). 글로우 속(블룸 루마 > 0.01)에선 잉크선이 빛에 묻힌다 */
    '  float nei = step(0.1, nn) * uOutline * uHasNormal * (1.0 - om);',                               /* 노멀 하이라이트: 가까운 면만 */
    '  ok.x *= 1.0 - 0.34 * dei;',
    '  ok.x *= (dei < 0.01) ? (1.0 + 0.06 * nei) : 1.0;',
    '  float g = max(ramp(lL, l0, lR), ramp(lD, l0, lU));',                              /* 3탭 연속 기울기 (가로·세로 중 큰 쪽) */
    '  float gate = smoothstep(0.004, 0.055, g) * (1.0 - smoothstep(0.16, 0.3, g)) * (1.0 - mk * (1.0 - uKeepAlpha));',   /* 사라지는 문어의 체크 위·옆엔 램프 디더 없음 (구멍/남은 픽셀 경계가 가짜 기울기로 읽혀 한 칸씩 어두워지던 것) */     /* 디더는 톤 램프에만: 기울기 0.004~0.055 에서 올라가고, 1px 띠처럼 아주 가파르면 다시 끈다 */
    '  ok.x += bayer(ap) * uDither * mix(0.125, 1.0, gate);',                            /* 평지 0.05 칸 · 램프 0.4 칸 (uDither = 0.4 × PAL.step × 슬라이더/0.25) */
    '  float bgk = step(uFar - 0.5, d0) * uVig * (1.0 - om); vec2 vq = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);',   /* 허공(배경)만: 가장자리로 갈수록 어둡게 + 정적 Bayer (비네트) */
    '  ok.x -= bgk * 0.1 * smoothstep(0.3, 0.9, length(vq)); ok.x += bgk * bayer(ap) * 0.06;',
    /* 허공을 하늘로 (주인 11-10 "방이 허공에 떠 있다"): 방 뒤(세로 가운데 조금 아래)에 지평선 빛 띠 · 위로 갈수록 어두운 하늘 · 아래는 옅은 안개 한 겹 · 밤엔 별.
       밝기만 건드리고 팔레트 스냅 + 정렬 Bayer 로 띠가 계단 디더가 된다 (색은 허공색 계열 그대로). 바깥 · 입장 연출 · 초상은 uSky 0 */
    '  float sk = bgk * uSky; float hz = exp(-pow((vUv.y - 0.46) / 0.24, 2.0)); float up = smoothstep(0.46, 1.0, vUv.y);',
    '  float sa = clamp(0.62 * hz + 0.20 * up + bayer(ap) * 0.14, 0.0, 1.0) * sk;',
    '  ok = mix(ok, uSkyOk, sa);',
    '  float sh = fract(sin(dot(ap, vec2(12.9898, 78.233))) * 43758.5453);',
    '  ok.x += sk * uStars * step(0.9945, sh) * smoothstep(0.5, 0.62, vUv.y) * (0.35 + 0.3 * step(0.9985, sh));',
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
  /* 첫 불 (소유자 폰 22:51 · 등불 0 · 비 = 창과 달빛 조각만 보이고 문어를 못 찾던 칠흑): 처음부터 방이 '어둑하지만 아늑한 다락' 으로 읽히고 문어가 늘 찾아지게. 전부 밤에만 (em 0.8→1 = nightK) — 낮·새벽·노을·바깥은 예전 그대로.
     ember = 0칸 등불 계수 ('작은 불씨': 밤에만 점광·발광·글로우·웅덩이가 작게 켜진다, 낮 0칸은 예전처럼 꺼진 회색 유리; 1칸 0.475 → 8칸 1 의 칸당 곡선은 그대로) ·
     밤 바닥 = 다락 헤미를 sky/gnd · hemiI 쪽으로 (keep = 등불 칸과 무관하게 남는 몫: 1 = 모든 칸에서 같은 달빛 바닥 → 등불 빛이 안 닿는 앞쪽 바닥·깔개도 허공색에 묻히지 않고, 칸을 채워도 앞쪽이 어두워지지 않는다) ·
     필은 등불 칸이 낮을 때(0칸 전부 → upTo 칸 0) fillI 까지 ·
     문어 자체광 = 몸색(알베도)에 비례하는 흐린 빛 glow × (glow0 → glow8, 등불 칸에 따라 선형) — 동공·입은 어두운 채, 몸·흰자만 한 칸 뜬다 (블러·새 패스 없음, 툰 재질 유니폼 하나). 옅은 살구색이라 파랑·보라·초록 몸도 빨강만큼 뜬다 */
  var FIRST_LIGHT = { ember: 0.25, sky: '#4d4a70', gnd: '#2a2024', hemiI: 0.4, keep: 1, fillI: 0.12, upTo: 4, glow: '#ffd8b0', glow0: 0.14, glow8: 0.06 };
  function phaseOf(h) { return h < 6 ? 'night' : h < 9 ? 'dawn' : h < 17 ? 'day' : h < 19 ? 'dusk' : 'night'; }

  /* ═══════════════════════════ init ═══════════════════════════ */
  /* ── 내 캐릭터 파츠 카탈로그 (docs/PLAYER_PARTS.md §2·§3) — 정적 export (SCENE3D.PLAYER_PARTS · PLAYER_DEFAULT, 2D 폴백도 SCENE3D 가 있으면 읽는다).
     id 순서 = 설정 시트 칩 순서, name 은 칩 글자(한국어 4자 안팎). hairColor·eyeColor 의 hex 는 알베도 — 툰 3단 · 푸른 필 빛을 거쳐 apollo 어느 칸에 앉는지는 문서 §2.2·§2.4 (금발 amber[3] → #e8c170, v0 #ffd27a 는 올리브로 떴다).
     기하 빌더는 init 안 PL_PARTS (T·PAL 이 필요하다). 모르는 범주·id 는 normalizePlayer 가 기본값으로 — 앱의 설정 복원도 같은 함수를 쓴다 */
  var PLAYER_PARTS = {
    hair: [{ id: 'bob', name: '단발' }, { id: 'short', name: '숏컷' }, { id: 'long', name: '긴생머리' }, { id: 'twin', name: '양갈래' }, { id: 'pony', name: '포니테일' }, { id: 'wave', name: '웨이브' }],
    bangs: [{ id: 'spiky', name: '삐죽' }, { id: 'full', name: '일자' }, { id: 'side', name: '옆가르마' }, { id: 'center', name: '가운데' }, { id: 'see', name: '시스루' }],   /* 앞머리 (주인 11-10 "몇 종류로 확실히 나눠서 선택 가능하게") — 머리 모양과 따로 고른다 */
    hairColor: [{ id: 'blonde', name: '금발', hex: '#e8a93a' },{ id: 'brown', name: '밤갈색', hex: '#9a5a3a' }, { id: 'ink', name: '먹남색', hex: '#1e2a44' }, { id: 'silver', name: '은빛', hex: '#cfc9c0' }, { id: 'pink', name: '분홍', hex: '#de8fa9' }, { id: 'lime', name: '연두', hex: '#a0d070' }],   /* 금발 #e8a93a → 필 빛에서 #de9e41 (amber[3] 은 #e8c170 로 살결 #e7d5b3 와 거의 같은 칸이라 1× 에서 머리가 한 덩이 공으로 읽혔다 — 리뷰 11-08) */
    eyes: [{ id: 'round', name: '동그란' }, { id: 'sparkle', name: '반짝' }, { id: 'sleepy', name: '졸린' }, { id: 'almond', name: '또렷' }, { id: 'smile', name: '웃는' }, { id: 'dot', name: '점' }],   /* 눈동자 그림 스타일 (주인 11-08 피드백 6: 눈 모양이 아니라 '눈동자 그림', 전부 귀엽게) */
    nose: [{ id: 'none', name: '없음' }, { id: 'dot', name: '콩코' }, { id: 'tri', name: '세모코' }],
    mouth: [{ id: 'none', name: '없음' }, { id: 'smile', name: '미소' }, { id: 'line', name: '새침' }, { id: 'pout', name: '뾰로통' }, { id: 'open', name: '활짝' }, { id: 'o', name: '오' }],
    cheek: [{ id: 'none', name: '없음' }, { id: 'freckle', name: '주근깨' }],   /* 코 · 입 · 볼 (11-09 주인 "동물의 숲 같은 기존 게임들 얼굴 느낌 참고") — 눈과 같은 아틀라스의 도트 그림. 볼터치('blush' 발그레)는 주인 11-10 "볼터치가 이상하게 보여서 없애는 게 나을 듯" 으로 뺐다 — 저장된 'blush' 는 모르는 id 라 기본값(없음)이 된다 */
    eyeColor: [{ id: 'dark', name: '흑갈색', hex: '#6a3a30', hi: '#884b2b', sh: '#be772b' }, { id: 'hazel', name: '호두색', hex: '#884b2b', hi: '#be772b', sh: '#de9e41' }, { id: 'sea', name: '바다색', hex: '#3c5e8b', hi: '#4f8fba', sh: '#73bed3' }, { id: 'leaf', name: '잎새색', hex: '#468232', hi: '#75a743', sh: '#a8ca58' }, { id: 'honey', name: '꿀색', hex: '#be772b', hi: '#de9e41', sh: '#de9e41' }, { id: 'violet', name: '제비꽃', hex: '#7a367b', hi: '#c65197', sh: '#df84a5' }],   /* hex = 홍채 텍셀(앞면 칸: 흑갈 #602c2c · 호두 #884b2b · 나머지는 apollo 그대로) · hi = 한 칸 밝은 홍채('반짝' 눈의 아랫빛) · sh = 반짝 점(11-10 — 흰색 글린트 대신 **눈 색을 두 칸 밝힌 색 점** 하나: 흑갈 눈엔 호박색, 바다 눈엔 하늘색. 꿀색은 한 칸만 — 두 칸 위 #e8c170 은 살결 옆에서 흰 점처럼 떴다). 흑갈색 옛 #4d2b32 는 동공 #151d28 과 두 칸뿐이라 2× 에서 한 덩어리였고 램프 디더에 #411d31 로 떨어졌다 (11-09) */
    skin: [{ id: 'peach', name: '살구', hex: '#ffd096' }, { id: 'fair', name: '밝은', hex: '#ffe2c4' }, { id: 'honey', name: '꿀빛', hex: '#e9b27c' }, { id: 'chestnut', name: '밤빛', hex: '#c48a5c' }, { id: 'cocoa', name: '카카오', hex: '#8f5d3e' }],   /* 피부색 (주인 11-10 "피부색도 고를 수 있게") */
    outfit: [{ id: 'dress', name: '원피스' }, { id: 'knit', name: '니트' }, { id: 'hoodie', name: '후드' }, { id: 'overall', name: '멜빵' }, { id: 'raincoat', name: '비옷' }, { id: 'hanbok', name: '한복' }, { id: 'uniform', name: '교복' }, { id: 'varsity', name: '야구점퍼' }, { id: 'flannel', name: '체크셔츠' }],   /* 11-10: 한복 · 한국 교복 · 미국풍 둘 (일본풍은 넣지 않는다 — 주인) */
    shoes: [{ id: 'flat', name: '단화' }, { id: 'boot', name: '부츠' }, { id: 'sneaker', name: '운동화' }, { id: 'loafer', name: '로퍼' }],
    acc: [{ id: 'none', name: '없음' }, { id: 'ribbon', name: '리본' }, { id: 'beret', name: '베레모' }, { id: 'glasses', name: '동글안경' }, { id: 'catears', name: '고양이귀' }, { id: 'strawhat', name: '밀짚모자' }] };
  var PLAYER_DEFAULT = { hair: 'bob', bangs: 'spiky', hairColor: 'blonde', skin: 'peach', eyes: 'round', eyeColor: 'dark', nose: 'tri', mouth: 'smile', cheek: 'none', outfit: 'dress', shoes: 'flat', acc: 'ribbon' };   /* 기본 모습 (단발 · 금발 · 동그란 눈 · 어두운 눈 · 세모코 · 미소 · 볼 없음 · 남색 원피스 · 단화 · 리본) */
  /* 문어 코스튬 (11-10 주인: "코스튬 그림 · 문어에게 씌우는 장면 코드 · 선물 상자 화면 · 내밀었을 때 문어의 선택 연출 — 진행하자", docs/MINIGAMES.md §6).
     slot head = 머리 위 · back = 등. award = 다락방 달리기 주간 상으로 받아야 상자에 들어온다 (나머지는 처음부터). 기하 빌더는 init 안 OCT_WEAR */
  var COSTUMES = [{ id: 'ribbon', name: '리본', slot: 'head' }, { id: 'beret', name: '베레모', slot: 'head' }, { id: 'strawhat', name: '밀짚모자', slot: 'head' }, { id: 'gat', name: '갓', slot: 'head' }, { id: 'partyhat', name: '고깔모자', slot: 'head' },
    { id: 'paper_crown', name: '종이 왕관', slot: 'head', award: true }, { id: 'emperor_cape', name: '황제 망토', slot: 'back', award: true }];
  function plPart(cat, id) { var L = PLAYER_PARTS[cat] || []; for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i]; return null; }
  function normalizePlayer(cfg) {   /* cfg → 열 범주가 다 있는 새 객체. 모르는 범주는 버리고 모르는 id 는 기본값 */
    var out = {}; cfg = cfg && typeof cfg === 'object' ? cfg : {};
    Object.keys(PLAYER_DEFAULT).forEach(function (k) { out[k] = plPart(k, cfg[k]) ? cfg[k] : PLAYER_DEFAULT[k]; });
    return out;
  }

  function init(container, opts) {
    T = THREE; opts = opts || {};
    var on = opts.on || {};
    var st = { lantern: opts.lantern | 0, items: (opts.items || []).slice(), weather: opts.weather || 'rain', hour: typeof opts.hour === 'number' ? opts.hour : 21.5,
      color: opts.color || '#e8463c', reduced: !!opts.reducedMotion, speed: opts.speed > 0 ? opts.speed : 1, octState: 'idle', paused: false, hidden: false,
      look: Object.assign({ pixelSize: DEF_P, dither: 0.25, outline: true, yaw: 0, key: LIGHTS.day.sunI, fill: LIGHTS.day.hemiI }, opts.look || {}), zoomF: 1, palette: paletteSource(opts.palette || PAL_DEFAULT) };   /* zoomF = 줌 배율 (1 ~ 2, 보통 ZOOM_STEPS 의 하나) */
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
    var normalMatP = keep(new T.MeshNormalMaterial());   /* 초상 전용 (11-11): 초상은 전용 조명이라, 장면의 노멀 재질을 같이 쓰면 그 재질이 '인스턴스(발자국)' 상태로 남은 직후의 초상에서 다시 만들어지며 셰이더가 하나 늘었다 (위층에서 드러남). 따로 두면 예열 한 번으로 끝 */
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
      uDither: { value: 0 }, uOutline: { value: hasDepthTex ? 1 : 0 }, uHasNormal: { value: 1 }, uVig: { value: hasDepthTex ? 1 : 0 }, uSky: { value: 0 }, uStars: { value: 0 }, uSkyOk: { value: new T.Vector3(0, 0, 0) }, uBayer: { value: keep(bayerTex()) }, uKeepAlpha: { value: 0 }, uFade: { value: 0 }, uFadeOk: { value: new T.Vector3(0, 0, 0) } } }));
    renderer.autoClear = false;   /* 패스마다 명시적으로 클리어 (발광 패스는 색만 지우고 뷰티 깊이를 쓴다) */
    var quadGeo = keep(new T.BufferGeometry());
    quadGeo.setAttribute('position', new T.Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3));
    quadGeo.setAttribute('uv', new T.Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2));
    var quadCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), quadScene = new T.Scene();
    var quad = new T.Mesh(quadGeo, post); quad.frustumCulled = false; quadScene.add(quad);
    function uploadPalette(P) {   /* P 생략 = 지금 장면 팔레트 (초상을 다른 몸색으로 찍을 때만 잠깐 그 색의 팔레트를 올렸다 되돌린다) */
      P = P || PAL;
      var ok = post.uniforms.uPalOk.value, rgb = post.uniforms.uPalRgb.value;
      P.list.forEach(function (hex, i) { var lab = hexToOklab(hex), c = hexRgb(hex); ok[i * 3] = lab[0]; ok[i * 3 + 1] = lab[1]; ok[i * 3 + 2] = lab[2]; rgb[i * 3] = c[0]; rgb[i * 3 + 1] = c[1]; rgb[i * 3 + 2] = c[2]; });
      post.uniforms.uPalN.value = P.list.length;
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
    var camTarget = new T.Vector3(0, 0.75, -0.4), _tg = new T.Vector3(), _pnt = new T.Vector3(), yawDrag = 0;
    var PLAY = null;   /* 놀이 kit (play.html 전용, makePlay): inst.play() 를 부르기 전엔 늘 null → 아래 `if (PLAY)` 훅 4개는 본 게임에서 아무것도 안 한다 */
    var PROOM = null;  /* 놀이방 장소 (8물결, buildPlayRoom): 처음 들어갈 때까지 null → `if (PROOM)` 훅들은 아무것도 안 한다 (시작 비용 0). 컵 놀이 kit 의 PLAY 와 다른 것 */
    var LROOM = null;  /* 위층 다락 (11-10, buildLoft): 처음 올라갈 때 만든다 */
    function isRoomP(p) { return p === 'play' || p === 'loft'; }
    /* 11-11 미용실 이사 (주인: "윗층 다락방에 미용실"): 거울 코너(salG)는 위층 뒷벽에 산다. 코너 · 연출의 좌표는 예전 다락 좌표 그대로 두고, 위층 안의 감싸는 그룹 LSALW 를 (dx, 0, dz) 만큼 옮겨 뒷벽에 맞춘다.
       문어는 깨어서 집에 있을 때 내가 위층에 오르면 따라 올라온다 (octMountLoft: octG 를 LSALW 로 — 그래서 문어 좌표도 연출 좌표 그대로) · 내려오거나 의식이 시작되면 다락으로 돌아간다 */
    var LSALW = null, LSAL = { dx: 0, dz: 0 };
    function octUp() { return !!LSALW && octG.parent === LSALW; }   /* 문어가 없는 '내 방' 들 */
    var EXT_TARGET = new T.Vector3(0.4, 1.55, 0.0);   /* 바깥 디오라마 카메라 타깃 (같은 요·틸트·픽셀 밀도; 집 용마루·굴뚝과 오른쪽 아래 가장자리 출구가 한 화면에) */
    function camTargetNow() {   /* look.focus='oct': 문어 중심 (look-shots close). 장소 그룹은 순수 평행이동이라 부모 위치를 더하면 월드 좌표. 입장 연출 중이면 그 위로 introOffset() 만큼 (하늘) */
      var b;
      if (st.look.focus === 'oct' && octG) { _tg.copy(octG.position).add(_focusUp); if (octG.parent) _tg.add(octG.parent.position); b = _tg; }
      else b = PLACE.vis === 'exterior' ? EXT_TARGET : PLACE.vis === 'play' ? PLAY_TARGET : PLACE.vis === 'loft' ? LOFT_TARGET : camTarget;
      if (PLAY && PLAY.cam) b = PLAY.cam;   /* 놀이: 컵 줄을 화면 아래쪽 60 % 쯤에 */
      return INTRO.on ? _ti.copy(b).setY(b.y + introOffset()) : b;
    }
    /* 놀이방 카메라 타깃: 방(받침 포함)의 화면 세로 가운데 — 위 끝 = 왼쪽 뒤 모서리 벽 꼭대기, 아래 끝 = 오른쪽 앞 받침 밑. 화면 가로는 대칭 (x = z 대각선) */
    var PLAY_YC = (0.848 * PLAY_H - 0.75 * 6 / 27 - 0.407) / 2 / 0.848, PLAY_TARGET = new T.Vector3(0, snapPos(PLAY_YC), 0), LOFT_TARGET = new T.Vector3(0, snapPos((0.848 * 2.7 - 0.75 * 6 / 27 - 0.407) / 2 / 0.848), 0);
    /* 짧은 장면 (높이 250 px = 아트 125 px: 320×568 · 가로 폰): 방(받침 포함 ≈ 136 아트px, 360×740 에서 잼)이 다 안 들어가면 위를 지킨다 —
       벽 꼭대기 · 문 · 오락기 · 등이 위 여백 3 px 로 다 보이고, 잘리는 건 아래 받침(≈ 11 px)과 빈 바닥 앞 끝뿐. 각도 · 밀도(1× = 27 px/m)는 다락과 같다 · 다 들어가면 예전처럼 가운데 */
    var PLAY_SPAN_PX = 0.848 * PLAY_H + 1.5 * PLAY_R + 0.621, PLAY_TOP_PX = 3;   /* 방(받침 포함)의 화면 세로 길이 (m): 벽 높이 + 바닥 대각선 + 받침 — PLAY_R 1.7 일 때 136/27 */
    function framePlay() {
      var N0 = Math.round(baseN()), need = PLAY_SPAN_PX * N0, d = PLAY_TOP_PX - (S.rh - need) / 2;
      PLAY_TARGET.y = snapPos(PLAY_YC + (d > 0 ? d / N0 / 0.848 : -liftOf(0, PLAY_YC, 0, FRAME_PT.play)));
    }
    /* 한 화면 배치 (주인 11-08 "화면이 반으로 나뉘어져있는 느낌인 게 불편해서"): 장면이 화면을 다 차지하면 방이 한가운데에 놓여, 아래쪽에 뜨는 대사창 · 큰 버튼 · 조이스틱이 바닥을 가린다.
       → 높은 장면에서만 타깃을 내려(= 방을 화면 위로) 바닥 앞 모서리를 화면 높이의 FRAME_Y 에 둔다. 꼭대기(벽 위 · 굴뚝)는 위 여백 FRAME_TOP CSS px (상태 줄 40 px 밑 — 아트 픽셀이 커지는 느린 기기 폴백 p=3 · 4 에서도 같은 자리) 을 지킨다 —
       그래서 낮은 장면(360×326 · 가로 폰 · 쌓는 배치)에선 올릴 자리가 없어 보정이 정확히 0 이고 예전 구도 그대로다. 각도 · 밀도 · 밀기 경계(panBox 는 타깃을 따라간다)는 안 바뀐다.
       FRAME_PT[장소] = [바닥 앞 모서리, 꼭대기 점] (월드 m). 바깥의 꼭대기는 상자 모서리가 아니라 굴뚝 테 — 화면에서 가장 높은 건 그쪽이다 */
    var FRAME_Y = 0.68, FRAME_TOP = 48, UP_Y = Math.cos(TILT), UP_XZ = Math.sin(TILT) * Math.SQRT1_2, ATTIC_Y = camTarget.y, EXT_Y = EXT_TARGET.y;
    var FRAME_PT = { attic: [[RF + 0.22, 0, RF + 0.22], [-2.72, 3.0, -2.72]], exterior: [[3.42, 0, 3.42], [-1.5, 3.3, -1.52]], play: [[PLAY_R, 0, PLAY_R], [-PLAY_R, PLAY_H, -PLAY_R]], loft: [[LOFT_R, 0, LOFT_R], [-LOFT_R, LOFT_PEAK + 0.25, 0]] };
    function liftOf(bx, by, bz, pt) {   /* 기본 타깃 (bx, by, bz) 에서 타깃을 내릴 월드 y (≥ 0, 아트 픽셀 정수 배) */
      var N0 = Math.round(baseN()), f = pt[0], t = pt[1];
      var below = ((by - f[1]) * UP_Y + (f[0] - bx + f[2] - bz) * UP_XZ) * N0, above = ((t[1] - by) * UP_Y + (bx - t[0] + bz - t[2]) * UP_XZ) * N0;   /* 화면 가운데에서 앞 모서리까지 아래로 · 꼭대기까지 위로 (아트 px, 1×) */
      return Math.round(clamp(S.rh / 2 + below - FRAME_Y * S.rh, 0, Math.max(0, S.rh / 2 - above - FRAME_TOP / S.p))) / N0 / UP_Y;
    }
    function frameView() {
      camTarget.y = ATTIC_Y - liftOf(camTarget.x, ATTIC_Y, camTarget.z, FRAME_PT.attic);
      EXT_TARGET.y = EXT_Y - liftOf(EXT_TARGET.x, EXT_Y, EXT_TARGET.z, FRAME_PT.exterior);
      framePlay();
    }
    function frameY() {   /* 지금 보이는 장소의 바닥 앞 모서리가 장면 높이의 어디에 있나 (0 = 위 끝 · 1 = 아래 끝). 실제 카메라로 투영 — 줌 · 밀기 · 입장 연출도 그대로 반영 (stats().frameY · tools/layout-shots.js) */
      var f = (FRAME_PT[PLACE.vis] || FRAME_PT.attic)[0], p = _pnt.set(f[0], f[1], f[2]).project(camera);
      return Math.round((S.offY + (1 - (p.y * 0.5 + 0.5)) * S.ch) / Math.max(S.H, 1) * 1000) / 1000;
    }
    /* 장소 (8물결): cur = 이야기 장소 'attic' | 'exterior' (문어가 있는 곳, place() · 의식·앱이 쓴다) · vis = 지금 그려지는 장소 'attic' | 'exterior' | 'play' (전환 앞 절반은 나가는 쪽) ·
       room = 내가 들어가 있는 방 ('play' | null). room 이 있는 동안 setPlace('attic'|'exterior') 는 cur 만 바꾸고 화면은 그대로 (의식이 나를 놀이방에서 끌어내지 않는다) */
    var PLACE = { cur: 'attic', vis: 'attic', trans: null, fade: 0, room: null };
    var DQ = { q: [], cur: null, done: null, active: false, pending: false, name: '', instant: false };   /* 문 작업 큐 (열림 4프레임 · 가로 전환 · 닫힘) — 의식(CER) 과 따로 (cerRun 이 앞 의식을 조용히 취소하므로) */
    var _focusUp = new T.Vector3(0, 0.45, 0), _ti = new T.Vector3();
    /* ── 입장 연출 (docs/UI_ART.md "입장"): 하늘에서 내려오는 카메라. 직교라 타깃을 위로 올리면 = 하늘을 보는 것 → 구름층을 지나 비를 뚫고 다락에 착지.
       움직이는 건 타깃 y 오프셋 하나뿐이고, 픽셀 격자 스냅은 placeCamera 의 snapScreen 이 그대로 해 준다 (서브픽셀 크리프 없음, 스텝은 정수 px).
       곡선 (카드 11, 11-07): 맨 위에서 top 초 멈춤 → 사다리꼴 속도(처음 28 % 가속 · 가운데 일정 · 끝 38 % 감속)로 움직임의 90 % 에 H → 0,
       86~100 % 에 착지 눌림(D = 아트 2px 만큼 더 내려갔다가 사인으로 복귀). 처음 천천히 · 중간 일정 · 부드러운 착지. 모션 감소면 연출 없이 바로 착지. */
    var INTRO = { on: false, t: 0, dur: 2.2, top: 0, H: 0, D: 0, resolve: null, sky: null, acc: 0, hold: false, band: 0, bands: null, bg0: null, pass: 0, covered: false };
    var EASE = { a: 0.28, d: 0.38, land: 0.9, bump: 0.86 };
    function introK() { return clamp((INTRO.t - INTRO.top) / Math.max(INTRO.dur - INTRO.top, 0.1), 0, 1); }   /* 움직임 진행도 (멈춤 뒤부터) */
    function introOffset() {
      var k = introK(), u = clamp(k / EASE.land, 0, 1), a = EASE.a, d = EASE.d, v = 1 / (1 - (a + d) / 2), p;
      if (u < a) p = v * u * u / (2 * a); else if (u <= 1 - d) p = v * (a / 2 + u - a); else { var w1 = 1 - u; p = 1 - v * w1 * w1 / (2 * d); }
      return INTRO.H * (1 - p) - (k > EASE.bump ? INTRO.D * Math.sin(Math.PI * clamp((k - EASE.bump) / (1 - EASE.bump), 0, 1)) : 0);
    }
    var S = { W: 0, H: 0, p: DEF_P, rw: 4, rh: 4, cw: 4, ch: 4, N: SNAP_N, pw: PX, offX: 0, offY: 0 };   /* pw = pixelWorldSize: 아트 픽셀 한 변(월드 m), resize 에서 프러스텀 폭 / 타깃 폭 */
    function yawDelta() { var y = clamp(yawDrag + st.look.yaw * DEG, -25 * DEG, 25 * DEG); return Math.round(y / (9 * DEG)) * 9 * DEG; }   /* 9° 스냅 */
    var _off = new T.Vector3(), _r = new T.Vector3(), _u = new T.Vector3(), _ax = new T.Vector3(1, 0, 0), _ay = new T.Vector3(0, 1, 0);
    /* 11-11 (검증 P4): 위층에서 미용실 시트가 화면 아래를 덮을 때, 거울 코너와 문어가 시트 위로 보이도록 장면을 위로 올린다 (좁은 화면 · 병 7개 · 이름 줄 두 줄이면 문어가 시트 밑에 깔렸다).
       LIFT.y = 올린 높이 (월드 m, 화면 위쪽) — 밀기(PAN)와 따로라 경계 · 고무줄에 안 걸린다. 시트가 닫히거나 장소가 바뀌면 0 으로 */
    var LIFT = { y: 0, to: 0 };
    function setSheetInset(px) {   /* px = 장면 칸 아래쪽을 시트가 덮은 높이 (CSS px) → 올릴 높이 (m) */
      px = Math.max(0, +px || 0);
      if (!px || PLACE.vis !== 'loft' || !LSALW || !ready) { LIFT.to = 0; return 0; }
      scene.updateMatrixWorld(); camera.updateMatrixWorld();
      var pxPerM = S.ch * 0.5 * Math.abs(camera.projectionMatrix.elements[5]), cur = LIFT.y * pxPerM;
      function yOf(x, y, z) { var q = _hp.set(x, y, z).project(camera); return S.offY + (1 - (q.y * 0.5 + 0.5)) * S.ch + cur; }   /* 올리기 전 기준의 화면 y */
      var low = Math.max(yOf(SALC.x + LSAL.dx, SALC.sy - 0.14, SALC.wz + LSAL.dz + 0.13), yOf(ANCHORS.salon[0] + LSAL.dx, 0, ANCHORS.salon[2] + LSAL.dz));
      if (octUp()) low = Math.max(low, yOf(oct.pos.x + LSAL.dx, 0, oct.pos.z + LSAL.dz));
      var top = yOf(SALC.x + LSAL.dx, SALC.yc + SALC.ro, SALC.wz + LSAL.dz), H = container.clientHeight || S.ch;
      var need = Math.min(low + 0.42 * pxPerM - (H - px), top - 56);   /* 발치 아래 0.42 m 까지 (카메라 쪽으로 뻗은 다리 · 접촉 그림자) 보이게 · 거울 꼭대기는 위쪽 바(44 + 12) 아래에 남게 */
      LIFT.to = need > 0 ? Math.round(need / pxPerM * S.N) / S.N : 0; dither.still = 0;
      return LIFT.to;
    }
    function stepLift(dt) {
      if (LIFT.y === LIFT.to) return;
      var d = LIFT.to - LIFT.y; LIFT.y = st.reduced || Math.abs(d) < 0.5 / S.N ? LIFT.to : LIFT.y + d * Math.min(1, dt / 0.1); dither.still = 0;
    }
    function placeCamera() {
      var tgt = camTargetNow(), ref = tgt;
      _off.set(0, 0, DIST).applyAxisAngle(_ax, -TILT).applyAxisAngle(_ay, YAW + yawDelta());
      camera.position.copy(tgt).add(_off); camera.lookAt(tgt); camera.updateMatrixWorld();
      _r.setFromMatrixColumn(camera.matrixWorld, 0); _u.setFromMatrixColumn(camera.matrixWorld, 1);
      if (panOn() && (PAN.x || PAN.y)) {   /* 밀기: 카메라를 화면 우/상 축으로 평행이동 (직교라 = 타깃 이동). 스냅 기준도 밀린 타깃 → 1 아트px 계단 */
        ref = _pnt.copy(tgt).addScaledVector(_r, PAN.x).addScaledVector(_u, PAN.y); camera.position.addScaledVector(_r, PAN.x).addScaledVector(_u, PAN.y);
      }
      if (LIFT.y) { if (ref === tgt) ref = _pnt.copy(tgt); ref.addScaledVector(_u, -LIFT.y); camera.position.addScaledVector(_u, -LIFT.y); }   /* 시트가 아래를 덮는 동안 장면을 위로 (setSheetInset) */
      snapScreen(camera.position, ref);   /* 타깃을 카메라 우/상 축 기준 pixelWorldSize 격자에 스냅 → 패닝/추적 중 픽셀 크리프 없음 */
      camera.updateMatrixWorld();
    }
    /* ── 밀기 + 관성 + 고무줄 (docs/INTERIOR_MODE.md §3.4): PAN.x/y = 카메라 오프셋(월드 m, 화면 우/상 축). 손가락 1:1 · 뗄 때 마지막 100 ms 평균 속도(80 ms 멈췄으면 0,
       0.25 px/ms 미만 0, 최대 2 px/ms) → 매 프레임 v = v·e^(−dt/0.25 s), 0.03 px/ms 아래면 멈춤 · 경계 = 장소 상자를 화면 축에 투영 + 여백 12 아트px (방이 화면 밖으로 안 나간다) ·
       경계 밖은 손가락의 40 % 로 시작해 최대 20 아트px 까지 (부드러운 포화), 떼면 0.25 s ease-out 으로 돌아온다 · 쉬면 정수 아트px 위 · 모션 감소 = 관성·고무줄 없음.
       의식·입장 연출 중엔 밀기를 안 받고 0.3 s 만에 0 으로 — 단 의식 중 확대해 있으면 0 대신 문어를 따라간다(cerFollow: 화면 가운데 절반 안, 경계 안 · 문어가 보일 때만 ·
       가속 한도가 있는 부드러운 따라가기라 멀리서 나타나도 휙 날아가지 않는다), 장소가 바뀌면 0.
       1× 에선 경계가 0 (가로·세로 고무줄만, 떼면 가운데로 · §3.4 '1×') — 첫 멈춤까지 경계가 줌에 비례해 열린다. 놀이(PLAY)·문어 초점(look-shots close) 중엔 꺼짐 */
    var PAN = { x: 0, y: 0, vx: 0, vy: 0, mode: '', t: 0, dur: 0, fx: 0, fy: 0, tx: 0, ty: 0, cut: false };   /* cut = 장소가 막 바뀜 (다음 따라가기는 미끄러지지 않고 바로) */
    var GEST = { mode: '', pts: {}, n: 0, hold: false, wheelT: 0 };   /* 손가락 상태기계 하나 (아래 '입력'): '' | press | pan | multi | pinch | twist | yaw | done */
    var PLACE_BOX = { attic: [[-2.72, RF + 0.22], [-0.48, 3.0], [-2.72, RF + 0.22]], exterior: [[-3.42, 3.42], [-0.48, 3.3], [-3.42, 3.42]],
      play: [[-PLAY_R - 6 / 27, PLAY_R + 6 / 27], [-0.48, PLAY_H], [-PLAY_R - 6 / 27, PLAY_R + 6 / 27]],
      loft: [[-LOFT_R - 6 / 27, LOFT_R + 6 / 27], [-0.48, LOFT_PEAK + 0.25], [-LOFT_R - 6 / 27, LOFT_R + 6 / 27]] };   /* 받침 포함 (x · y · z) */
    function panOn() { return !PLAY && st.look.focus !== 'oct'; }
    function panLocked() { return INTRO.on || !!(CER && CER.active && !isRoomP(PLACE.vis)) || !!PLACE.trans || DQ.active; }   /* 연출 중: 손가락 밀기 X (문어가 화면 밖으로 안 나가게). 줌은 된다 · 놀이방에선 안 보이는 의식이 밀기를 잠그지 않는다 */
    function panBox() {   /* 카메라 오프셋 허용 범위 [x0, x1, y0, y1] (m). 방이 화면보다 크면 화면이 방(+여백) 안, 작으면 방이 화면 안. 0(기본 구도)은 늘 포함 */
      var b = PLACE_BOX[PLACE.vis] || PLACE_BOX.attic, tgt = camTargetNow(), m = 12 / S.N, hw = S.rw / 2 / S.N, hh = S.rh / 2 / S.N, a0 = 1e9, a1 = -1e9, c0 = 1e9, c1 = -1e9;
      for (var i = 0; i < 8; i++) {
        _pnt.set(b[0][i & 1], b[1][(i >> 1) & 1], b[2][(i >> 2) & 1]).sub(tgt); var a = _pnt.dot(_r), c = _pnt.dot(_u);
        if (a < a0) a0 = a; if (a > a1) a1 = a; if (c < c0) c0 = c; if (c > c1) c1 = c;
      }
      var x0 = a0 - m + hw, x1 = a1 + m - hw, y0 = c0 - m + hh, y1 = c1 + m - hh;
      var s = PLACE.vis === 'attic' || isRoomP(PLACE.vis) ? 1 : clamp((st.zoomF - 1) / (ZOOM_STEPS[1] - 1), 0, 1);   /* 다락은 1× 에서도 방이 화면보다 넓다 (11-10 넓히기) → 늘 온전한 경계 */   /* 1× = 0 (고무줄만 — 360 폭에서도 기본 구도가 비뚤게 남지 않는다) → 첫 멈춤(1.12×)에서 온전한 경계. 핀치가 1× 로 돌아올 때 한 번에 튀지 않게 비례 */
      return [Math.min(x0, x1, 0) * s, Math.max(x0, x1, 0) * s, Math.min(y0, y1, 0) * s, Math.max(y0, y1, 0) * s];
    }
    function band(v, lo, hi) {   /* 고무줄: 경계 밖 e → M(1 − e^(−0.4 e / M)) (기울기 0.4 로 시작, M = 20 아트px 에 포화). 모션 감소면 딱 멈춤 */
      var M = 20 / S.N;
      if (st.reduced) return clamp(v, lo, hi);
      if (v > hi) return hi + M * (1 - Math.exp(-0.4 * (v - hi) / M));
      if (v < lo) return lo - M * (1 - Math.exp(-0.4 * (lo - v) / M));
      return v;
    }
    function clampPan() { var b = panBox(); PAN.x = clamp(PAN.x, b[0], b[1]); PAN.y = clamp(PAN.y, b[2], b[3]); }
    function roundPan() { PAN.x = Math.round(PAN.x * S.N) / S.N; PAN.y = Math.round(PAN.y * S.N) / S.N; }   /* 정확히 아트px 위에서 멈춘다 */
    function panRest() {   /* 쉬는 중(손가락 밀기·핀치·관성·이징 없음)이면 경계 안 정수 아트px 로 — 폰을 돌린 뒤(resize)·휠 줌 뒤에도 pan() 이 정수. 경계는 늘 0 을 품는다 */
      if (PAN.mode || ZT || GEST.mode === 'pan' || GEST.mode === 'pinch') return;
      var b = panBox(), N = S.N;
      PAN.x = clamp(Math.round(PAN.x * N), Math.ceil(b[0] * N - 1e-6), Math.floor(b[1] * N + 1e-6)) / N;
      PAN.y = clamp(Math.round(PAN.y * N), Math.ceil(b[2] * N - 1e-6), Math.floor(b[3] * N + 1e-6)) / N;
    }
    function panTo(x, y, dur, mode) {   /* ease-out 으로 옮기기 (고무줄 복귀 0.25 s · 연출 시작 0.3 s · 가운데로) — 모션 감소면 바로 */
      PAN.vx = PAN.vy = 0;
      if (st.reduced || !dur) { PAN.x = x; PAN.y = y; PAN.mode = ''; return; }
      PAN.mode = mode || 'tween'; PAN.t = 0; PAN.dur = dur; PAN.fx = PAN.x; PAN.fy = PAN.y; PAN.tx = x; PAN.ty = y;
    }
    function panSettle() {   /* 손을 뗀 뒤·관성이 끝난 뒤: 경계 밖이면 고무줄로 돌아오고, 안이면 정수 아트px 에 멈춘다 */
      var b = panBox(), x = clamp(PAN.x, b[0], b[1]), y = clamp(PAN.y, b[2], b[3]);
      if (Math.abs(x - PAN.x) > 1e-6 || Math.abs(y - PAN.y) > 1e-6) { panTo(Math.round(x * S.N) / S.N, Math.round(y * S.N) / S.N, 0.25, 'spring'); if (!PAN.mode) clampPan(); }
      else { PAN.mode = ''; PAN.vx = PAN.vy = 0; roundPan(); }
    }
    function pxms(v) { return Math.abs(v) * S.p * S.N / 1000; }   /* m/s → CSS px/ms */
    var _fw = new T.Vector3();
    function cerFollow() {   /* 의식 중(출발·귀가·기웃) 확대해 있으면: 0 으로 돌아가면 문어가 화면 밖에서 나간다 (2× 에서 다락 문·가장자리는 화면 밖) →
                                문어 몸 전체가 화면 안에 들게 밀린 값을 정한다 (이미 들어 있으면 그대로 = 문어 쪽으로 밀어 둔 화면을 빼앗지 않는다). 경계 안 · 정수 아트px.
                                null = 따라가기 아님 (1× · 의식 밖). 문어가 안 보이면 화면은 그 자리에 선다 (빈 땅 위로 먼저 날아가지 않는다.
                                멀리서 나타나는 기웃·귀가는 체크가 한 칸 켜진 뒤부터 움직인다). 장소가 막 바뀐 프레임(cut)은 디더에 덮여 있으니 보이든 말든 바로 그 자리 */
      if (!(CER && CER.active) || INTRO.on || st.zoomF <= 1.001 || isRoomP(PLACE.vis)) return null;   /* 놀이방: 안 보이는 문어를 따라가지 않는다 */
      var b = panBox(), tx = PAN.x, ty = PAN.y;
      if (PAN.cut || (octG.visible && FADE.d > 0)) {
        octG.getWorldPosition(_fw).add(_focusUp).sub(camTargetNow());
        var ox = _fw.dot(_r), oy = _fw.dot(_u), hx = Math.max(0, S.rw / 2 / S.N - 0.9), hy = Math.max(0, S.rh / 2 / S.N - 0.9);   /* 0.9 m = 문어 몸 가운데에서 다리 끝·머리 꼭대기까지 + 여유 → 몸 전체가 화면 안 */
        tx = clamp(PAN.x, ox - hx, ox + hx); ty = clamp(PAN.y, oy - hy, oy + hy);
      }   /* 안 보이면 목표 = 지금 자리 (경계 안) → 움직이던 화면은 같은 감속으로 선다 */
      return [clamp(Math.round(tx * S.N) / S.N, b[0], b[1]), clamp(Math.round(ty * S.N) / S.N, b[2], b[3])];
    }
    function plFollow() {   /* 스틱 · 방향키로 걷는 동안만: 캐릭터가 화면 안쪽(가장자리에서 1.1 m)에 들도록 밀 목표. 이미 들어 있으면 null (화면을 빼앗지 않는다) */
      if (typeof PL === 'undefined' || !PL || !PL.stick || !(PLACE.vis === 'attic' || isRoomP(PLACE.vis)) || PL.place !== PLACE.vis) return null;
      var b = panBox();
      _fw.copy(PL.pos).setY(0.6).sub(camTargetNow());
      var ox = _fw.dot(_r), oy = _fw.dot(_u), hx = Math.max(0, S.rw / 2 / S.N - 1.1), hy = Math.max(0, S.rh / 2 / S.N - 1.4);
      var tx = clamp(PAN.x, ox - hx, ox + hx), ty = clamp(PAN.y, oy - hy, oy + hy);
      tx = clamp(Math.round(tx * S.N) / S.N, b[0], b[1]); ty = clamp(Math.round(ty * S.N) / S.N, b[2], b[3]);
      return (Math.abs(tx - PAN.x) < 0.5 / S.N && Math.abs(ty - PAN.y) < 0.5 / S.N && PAN.mode !== 'follow') ? null : [tx, ty];
    }
    function stepPan(dt) {
      stepLift(dt);
      if (!panOn()) { PAN.x = PAN.y = PAN.vx = PAN.vy = 0; PAN.mode = ''; PAN.cut = false; return; }
      if (panLocked()) {
        var f = cerFollow();
        if (f !== null) { followStep(f, dt); return; }
        PAN.cut = false;
        if (PAN.mode === 'follow') PAN.mode = '';   /* 따라가다 1× 로 줄였거나 연출이 바뀜 → 아래 0 으로 */
        if ((PAN.x || PAN.y) && PAN.mode !== 'home') panTo(0, 0, 0.3, 'home');
      } else {
        PAN.cut = false;
        var pf = plFollow();   /* 내 캐릭터가 화면 가장자리로 걸어가면 화면이 따라간다 (넓어진 다락) */
        if (pf !== null) { followStep(pf, dt); return; }
        if (PAN.mode === 'follow') panSettle();   /* 의식이 끝나면 따라가던 자리에서 정수 px 로 */
      }
      if (!PAN.mode) return;
      dither.still = 0;
      if (PAN.mode === 'coast') {
        var k = Math.exp(-dt / 0.25), b = panBox(), M = 20 / S.N;
        PAN.vx *= k; PAN.vy *= k; PAN.x += PAN.vx * dt; PAN.y += PAN.vy * dt;
        if (PAN.x < b[0] || PAN.x > b[1]) { PAN.vx *= Math.exp(-dt / 0.04); PAN.x = clamp(PAN.x, b[0] - M, b[1] + M); }   /* 관성이 경계에 닿으면 고무줄이 받는다 */
        if (PAN.y < b[2] || PAN.y > b[3]) { PAN.vy *= Math.exp(-dt / 0.04); PAN.y = clamp(PAN.y, b[2] - M, b[3] + M); }
        if (pxms(PAN.vx) < 0.03 && pxms(PAN.vy) < 0.03) panSettle();
        return;
      }
      PAN.t += dt; var e = Math.min(1, PAN.t / PAN.dur), q = 1 - Math.pow(1 - e, 3);
      PAN.x = PAN.fx + (PAN.tx - PAN.fx) * q; PAN.y = PAN.fy + (PAN.ty - PAN.fy) * q;
      if (e >= 1) { PAN.x = PAN.tx; PAN.y = PAN.ty; PAN.mode = ''; }
    }
    /* 따라가기 한 프레임: 바라는 속도 = 남은 거리 / 0.12 s (걷는 문어를 바짝 — 1.8 m/s 에서 뒤처짐 ≈ 0.22 m), 단 최고 3 m/s · 가속 ≤ 8 m/s² ·
       남은 거리에서 그 가속으로 설 수 있는 속도(√(2ad)) 이하 → 출발은 천천히 붙고 넘치지 않고 선다 (2× 에서 60 아트px 를 0.3 s 에 프레임당 19 CSS px 로 휙 가던 것
       → 최고 프레임당 ≈ 5 CSS px). 반 아트px 안·거의 멈춤이면 정수 px 에 쉰다. 장소가 막 바뀐 프레임(cut)·모션 감소 = 바로 그 자리 */
    var FOLLOW = { tau: 0.12, vmax: 3, amax: 8 };
    function followStep(f, dt) {
      if (PAN.cut || st.reduced) { PAN.x = f[0]; PAN.y = f[1]; PAN.vx = PAN.vy = 0; PAN.cut = false; PAN.mode = ''; return; }
      var dx = f[0] - PAN.x, dy = f[1] - PAN.y, d = Math.hypot(dx, dy);
      var sp = d > 1e-6 ? Math.min(FOLLOW.vmax, d / FOLLOW.tau, Math.sqrt(2 * FOLLOW.amax * d)) : 0;
      var ax = (d > 1e-6 ? dx / d * sp : 0) - PAN.vx, ay = (d > 1e-6 ? dy / d * sp : 0) - PAN.vy, al = Math.hypot(ax, ay), am = FOLLOW.amax * Math.max(dt, 1e-4);
      if (al > am) { ax *= am / al; ay *= am / al; }
      PAN.vx += ax; PAN.vy += ay; PAN.x += PAN.vx * dt; PAN.y += PAN.vy * dt;
      var slow = Math.hypot(PAN.vx, PAN.vy) * S.N < 6;   /* 초당 6 아트px 미만 = 거의 멈춤 */
      if (d * S.N < 0.5 && slow) { PAN.x = f[0]; PAN.y = f[1]; PAN.vx = PAN.vy = 0; PAN.mode = ''; }
      else { PAN.mode = 'follow'; dither.still = 0; }
    }
    function panReset() { PAN.x = PAN.y = PAN.vx = PAN.vy = 0; PAN.mode = ''; }
    /* touch-action (§5.3): 평소 1× = pan-y (세로로 쓸면 페이지가 내려간다) · 확대했거나 물건을 든 동안·놀이 = none. 손짓 도중엔 브라우저가 안 바꾸므로
       두 손가락·들기·밀기 중에는 touchmove 를 막는다 (아래 '입력'). 인라인이라 CSS 의 #scene3d { touch-action: none } 을 이긴다 */
    var touchNow = '';
    function touchMode() {
      var want = PLAY || st.zoomF > 1.001 || GEST.hold ? 'none' : 'pan-y';
      if (want === touchNow) return;
      touchNow = want; container.style.touchAction = want; canvas.style.touchAction = want;
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
      renderer.setSize(S.cw, S.ch, false); canvas.style.width = S.cw + 'px'; canvas.style.height = S.ch + 'px';
      rt.setSize(rw, rh); rtN.setSize(rw, rh); rtE.setSize(rw, rh); rtB.setSize(rw, rh); post.uniforms.uRes.value.set(rw, rh);
      blurOn = p < 4;
      frameView();
      applyZoom();
    }
    function applyZoom() {   /* 줌만 바뀔 때 (핀치·휠): 프러스텀·N·pw·카메라·입자 재스냅만 — renderer.setSize 는 캔버스 버퍼를 다시 잡아 한 프레임 비므로 resize() 에서만 */
      S.N = Math.round(PX_PER_M * 3 / S.p * st.zoomF);   /* 픽셀을 줄이면 같은 구도에 디테일만 는다 · 매 멈춤이 정수 아트px/m */
      camera.left = -S.rw / 2 / S.N; camera.right = S.rw / 2 / S.N; camera.top = S.rh / 2 / S.N; camera.bottom = -S.rh / 2 / S.N; camera.updateProjectionMatrix();
      S.pw = (camera.right - camera.left) / S.rw;   /* pixelWorldSize = 직교 프러스텀 폭 / 렌더 타깃 폭 (= 1/N: p=3 줌 1 → 1/18 m, p=2 → 1/27, 줌 ×2 → 1/36) */
      placeCamera();
      if (ready) { clampPan(); panRest(); placeCamera(); layoutWeather(false); if (CURT.frame) curtainFrame(1); anim.dustInit = false; extApplyWeather(); }   /* 룩 패스 7: 격자가 바뀌면 비·눈·물방울·커튼·먼지를 새 픽셀 중심에 재스냅 */
      plEyeLod();   /* 내 캐릭터 눈 텍스처 LOD (N 에 따라 2×3 · 4×5 · 8×10 텍셀 칸) — 함수 선언이라 끌어올려져 있고, PL 이 아직 없으면 안에서 그냥 돌아온다 */
    }
    function zoomStepOf(f) { return clamp(Math.round(Math.log(f) / Math.LN2 * 6), 0, ZOOM_STEPS.length - 1); }
    function setZoom(f, cx, cy) {   /* 배율 f 로. (cx, cy) = 클라이언트 px 기준점: 그 아래 있던 곳이 줌 뒤에도 그 아래 (경계 안으로 자름). 연출 중·기준점 없음 = 가운데 */
      f = clamp(f, 1, 2); if (Math.abs(f - st.zoomF) < 1e-6) return false;
      var n0 = S.N, ax = 0, ay = 0;
      if (cx != null && panOn() && !panLocked()) { var r = canvas.getBoundingClientRect(); ax = cx - (r.left + r.width / 2); ay = cy - (r.top + r.height / 2); }
      if (PAN.mode === 'coast' || PAN.mode === 'spring') { PAN.mode = ''; PAN.vx = PAN.vy = 0; }
      st.zoomF = f; applyZoom();
      if (ax || ay) { var k = (1 / n0 - 1 / S.N) / S.p; PAN.x += ax * k; PAN.y -= ay * k; if (ready) { clampPan(); panRest(); placeCamera(); } }   /* 휠 한 칸 뒤에도 쉬는 자리는 정수 px */
      dither.still = 0; touchMode(); return true;
    }
    /* 핀치 (§3.5): 손가락 거리 비율을 연속으로 따르되 매번 정수 아트px/m (N) 로 → 한 번에 한 N (p=2 에서 27→54 사이 ≈ 2~4 %) 씩, 덜컥 12 % 건너뛰지 않는다.
       손을 떼면 가장 가까운 멈춤으로 0.15 s (ease-out, 매 프레임 정수 N) — 모션 감소면 바로. 끝나면 밀기도 경계 안 정수 px 로 (panSettle) */
    function baseN() { return PX_PER_M * 3 / S.p; }
    function zoomN(f, cx, cy) { var b = baseN(); return setZoom(clamp(Math.round(b * clamp(f, 1, 2)), Math.round(b), Math.round(b * 2)) / b, cx, cy); }
    var ZT = null;
    function zoomEase(f, cx, cy) {   /* 멈춤 f 로 0.15 s ease-out (매 프레임 정수 N) — 모션 감소면 바로 */
      if (st.reduced || Math.abs(f - st.zoomF) < 1e-6) { ZT = null; setZoom(f, cx, cy); if (panOn() && !panLocked()) panSettle(); return; }
      ZT = { f0: st.zoomF, f1: f, t: 0, cx: cx, cy: cy };
    }
    function zoomSettle(cx, cy) { zoomEase(ZOOM_STEPS[zoomStepOf(st.zoomF)], cx, cy); }
    function stepZoom(dt) {
      if (!ZT) return;
      ZT.t += dt; var e = Math.min(1, ZT.t / 0.15), q = 1 - Math.pow(1 - e, 3), z = ZT;
      if (e < 1) { zoomN(z.f0 + (z.f1 - z.f0) * q, z.cx, z.cy); return; }
      ZT = null; setZoom(z.f1, z.cx, z.cy); if (panOn() && !panLocked()) panSettle();
    }
    function zoomFinish() { if (ZT) stepZoom(1); }   /* 새 손짓·휠이 오면 남은 이징을 끝내고 (멈춤 위에서) 시작 */

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
    var SHADE = [[-3.1, RF + 0.6], [-0.6, 3.25], [-3.1, RF + 0.6]];   /* 그림자 카메라 피팅용 상자 (x · y · z) */
    var SHADE_EXT = [[-3.7, 3.7], [-0.6, 3.6], [-3.7, 3.7]];   /* 바깥: 받침 + 집(용마루 2.94 · 굴뚝 3.3) + 나무 — 장소마다 그림자 카메라를 다시 맞춘다 */
    var SHADE_LOFT = [[-LOFT_R - 0.6, LOFT_R + 0.6], [-0.6, LOFT_PEAK + 0.4], [-LOFT_R - 0.6, LOFT_R + 0.6]];
    var SHADE_PLAY = [[-PLAY_R - 0.6, PLAY_R + 0.6], [-0.6, PLAY_H + 0.1], [-PLAY_R - 0.6, PLAY_R + 0.6]];   /* 놀이방: 받침 + 벽 + 차폐 */
    var shade = new T.Mesh(keep(mergeParts([{ g: box(R_SPAN + 1.2, 0.05, R_SPAN + 1.2), m: M(R_MID, 3.08, R_MID), c: '#000000' }, { g: box(R_SPAN + 1.2, 3.7, 0.05), m: M(R_MID, 1.35, RF + 0.55), c: '#000000' }, { g: box(0.05, 3.7, R_SPAN + 1.2), m: M(RF + 0.55, 1.35, R_MID), c: '#000000' },
      { g: box(0.05, 3.7, 0.7), m: M(-2.6, 1.35, RF + 0.25), c: '#000000' }])),   /* 왼쪽 벽 앞 날개: 벽 끝(z 2.5)과 앞벽 차폐 사이로 새는 빛을 막는다 */
      keep(new T.MeshBasicMaterial({ colorWrite: false, depthWrite: false })));
    shade.castShadow = true; shade.receiveShadow = false; shade.frustumCulled = false; shade.renderOrder = -10; atticG.add(shade);
    var _sm = new T.Matrix4(), _sv = new T.Vector3();
    function fitShadow() { /* 방 상자 8꼭짓점을 빛 공간으로 → 직교 그림자 카메라를 딱 맞춘다 (p=3 에서 아트px 당 ≥ 10 텍셀) */
      _sm.lookAt(sun.position, sun.target.position, _ay).transpose();
      var mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
      for (var i = 0; i < 8; i++) {
        var SB = PLACE.vis === 'exterior' ? SHADE_EXT : PLACE.vis === 'play' ? SHADE_PLAY : PLACE.vis === 'loft' ? SHADE_LOFT : SHADE;
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
      base.sky.copy(lerpC(a.sky, b.sky, e)); base.gnd.copy(lerpC(a.gnd, b.gnd, e)); base.hemiI = num('hemiI') * fillK() * (PLACE.vis === 'exterior' ? 1 + 1.2 * clamp((num('em') - 0.25) / 0.75, 0, 1) : 1);   /* 바깥은 열린 하늘: 밤 헤미 ×2.2 (다락은 그대로) */
      fill.color.copy(lerpC(a.fill, b.fill, e)); base.fillI = num('fillI') * fillK();
      glass.material.color.copy(lerpC(a.out, b.out, e));
      winEm.material.color.copy(lerpC(a.winEm, b.winEm, e));
      scene.background.copy(lerpC(a.bg, b.bg, e));
      light.lamp = num('lamp'); light.lampD = num('lampD'); light.glow = num('glow'); light.pool = num('pool'); light.candle = num('candle'); light.em = num('em');
      light.out = lerpC(a.out, b.out, e).clone(); light.winEm = lerpC(a.winEm, b.winEm, e).clone();
      lampDirty = true; if (extReady) extApplyLight(); if (PROOM) playApplyLight(); if (LROOM) loftApplyLight(); if (ATTIC_DOOR) doorsApplyLight();   /* 헤미·필 최종값(applyFloor)은 applyLamp 가 — 다음 렌더 전에 frame 이 lampDirty 를 처리한다 (전환 중 프레임당 한 번) */
      if (SAL) salNight();   /* 미용실 유리·병·물: 밤이면 한 칸 어둡게 (빛을 안 타는 basicV 라 밤에 전구처럼 뜨지 않게) */
    }
    /* 첫 불 — 밤 바닥·문어 자체광 (FIRST_LIGHT): applyLight 가 구한 시각대 헤미·필(base) 위에 얹는다. applyLamp 가 부른다 */
    var base = { sky: new T.Color(), gnd: new T.Color(), hemiI: 0, fillI: 0 }, FL = FIRST_LIGHT;   /* FL 은 SCENE3D.FIRST_LIGHT 그대로 (LIGHTS 처럼 런타임에 바꾸면 다음 applyLight/applyLamp 에 반영) */
    var _flc = {};
    function flC(hex) { return _flc[hex] || (_flc[hex] = C(hex)); }   /* FIRST_LIGHT 색 캐시 (전환 중 매 프레임 new Color 없이) */
    function nightK() { return PLACE.vis === 'exterior' ? 0 : clamp(((light.em == null ? 1 : light.em) - 0.8) / 0.2, 0, 1); }   /* 다락의 밤 정도: 노을(em 0.8) 이하 0 → 밤(1) 1. 낮·새벽·노을은 0 = 첫 불 전부 꺼짐 (낮 모습 그대로) */
    function applyFloor() {
      var nk = nightK(), fade = clamp(1 - st.lantern / FL.upTo, 0, 1), wh = nk * (FL.keep + (1 - FL.keep) * fade), w = nk * fade;
      hemi.color.copy(base.sky).lerp(flC(FL.sky), wh); hemi.groundColor.copy(base.gnd).lerp(flC(FL.gnd), wh);
      hemi.intensity = base.hemiI + Math.max(0, FL.hemiI - base.hemiI) * wh;
      fill.intensity = base.fillI + Math.max(0, FL.fillI - base.fillI) * w;
      toon.emissive.copy(flC(FL.glow)).multiplyScalar(nk * (FL.glow0 + (FL.glow8 - FL.glow0) * clamp(st.lantern / 8, 0, 1)));
      toonP.emissive.copy(toon.emissive); toonEye.emissive.copy(toon.emissive);   /* 내 캐릭터(눈 평면 포함)도 밤엔 같은 첫 불 자체광 — 훅이 emissive × diffuseColor 라 흰자·글린트만 한 칸 뜨고 동공은 어둡다 */
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
    /* whiteTex: 1×1 흰 캔버스를 toon · toonP 의 map 으로 꽂아 눈 재질 toonEye(map = 눈 아틀라스)와 프로그램 캐시 키(map · mapEncoding · vertexUvs)를 같게 한다 → 셋이 셰이더 하나 (uv 가 없는 지오메트리는 GL 범용 속성 기본값 (0,0) → 흰 텍셀 → 알베도 그대로). canvasTex 와 같은 sRGBEncoding */
    var whiteTex = keep(canvasTex((function () { var cv = document.createElement('canvas'); cv.width = cv.height = 1; var x = cv.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, 1, 1); return cv; })()));
    var toon = keep(new T.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: keep(gradientTex()), map: whiteTex }));
    toon.blendSrc = T.SrcAlphaFactor; toon.blendDst = T.OneMinusSrcAlphaFactor; toon.blendSrcAlpha = T.OneFactor; toon.blendDstAlpha = T.ZeroFactor;   /* CustomBlending 일 때만 (체크 사라짐, fadeLook): 남김 = 문어 색, 구멍 = 뒤 색 그대로 · 알파는 셰이더 값(1/0) 그대로 */
    /* 문어 자체광 (첫 불): 툰의 emissive 를 정점색(알베도)에 곱한다 → 문어에만 닿는 흐린 따뜻한 채움빛. 몸·흰자는 한 칸 뜨고 동공·입(어두운 정점색)은 어두운 채라 얼굴이 안 뭉개진다. 값은 applyFloor (밤에만, 초상은 0) */
    /* 문어 체크 사라짐 (INTERIOR_MODE 0단계): uOctFade = 남길 몫 (1 = 변화 없음, k/8 = 8단계). 4×4 Bayer 로 아트 픽셀(저해상 타깃의 gl_FragCoord)마다 남김(알파 1)·구멍(알파 0).
       반투명 섞기는 팔레트 스냅에서 번지므로 쓰지 않는다. 카메라·문어가 정수 px 로만 움직이니 무늬가 기어가지 않는다.
       구멍은 discard 하지 않는다: discard 하면 구멍마다 깊이가 비어 깊이 외곽선이 남은 픽셀마다 잉크 점을 찍고, 깊이 쓰기를 끄면(설계 문서 안) 몸끼리 가림이 틀려
       빨판·다리 밑면이 다리 위로 비친다 (repro: 프레임당 최대 96 px). 그래서 구멍도 문어 깊이는 쓰고 색은 뒤 그대로(SrcAlpha 섞기), 알파 0 을 표시로 남겨
       후처리가 구멍 픽셀엔 잉크선·하이라이트·비네트를 안 긋는다 (FRAG om). 섞기·정렬·그림자·접지 그림자는 fadeLook 이 바꾼다 */
    var OCT_FADE = { value: 1 };
    function toonFadeHook(FADE_U) {   /* 같은 글자의 훅 → 같은 프로그램 캐시 키 (customProgramCacheKey = onBeforeCompile.toString()) — 문어 툰과 내 캐릭터 툰이 셰이더 하나를 나눠 쓰고 유니폼(사라짐 몫)만 따로 */
      return function (sh) {
        sh.uniforms.uOctFade = FADE_U;
        sh.fragmentShader = 'uniform float uOctFade;\nfloat octBayer2(vec2 a){ a = mod(floor(a), 2.0); return fract(a.x * 0.5 + a.y * 0.75); }\n' + sh.fragmentShader
          .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance *= diffuseColor.rgb;')
          .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n\tgl_FragColor.a = octBayer2(gl_FragCoord.xy * 0.5) * 0.25 + octBayer2(gl_FragCoord.xy) < uOctFade ? 1.0 : 0.0;');
      };
    }
    toon.onBeforeCompile = toonFadeHook(OCT_FADE);
    var PL_FADE = { value: 1 }, toonP = keep(new T.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: toon.gradientMap, map: whiteTex }));   /* 내 캐릭터 툰: 문어와 같은 3단 · 정점색 · 밤 자체광, 사라짐은 늘 1 (문어가 체크로 사라져도 그대로) */
    toonP.onBeforeCompile = toonFadeHook(PL_FADE);
    var toonEye = keep(new T.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: toon.gradientMap, map: whiteTex }));   /* 내 캐릭터 눈 평면 전용 (11-09 얼굴 수술): map 만 눈 아틀라스(아래 plEyeTex)로 바뀐다 — 절대 null 이 되지 않는다(null 로 한 번 그려지면 USE_MAP 없는 28번째 프로그램이 생겨 눈이 흰 네모로 남는다). 같은 훅 글자 → 같은 프로그램 */
    toonEye.onBeforeCompile = toonFadeHook(PL_FADE);
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
    parts.push({ g: box(R_SPAN, 0.1, R_SPAN), m: M(R_MID, -0.05, R_MID), c: MAT.floorSeam });
    for (var i = 0; i < Math.round(R_SPAN / FLOOR_PITCH); i++) {
      var fx = -R + FLOOR_PITCH * (i + 0.5), fz = -R, k = 0;
      while (fz < RF) {
        var len = 1.0 + (hash('fl' + i + '_' + k) % 100) / 100 * 1.4, last = fz + len > RF - 0.5;
        if (last) len = RF - fz;
        parts.push({ g: box(FLOOR_PITCH - FLOOR_SEAM, 0.02, last ? len : len - FLOOR_SEAM), m: M(fx, -0.006, fz + (last ? len : len - FLOOR_SEAM) / 2), c: (i + k) % 2 ? MAT.floorA : MAT.floorB });
        fz += len; k++;
      }
    }
    [[0.62, 0.9], [-1.48, -1.62], [1.72, 1.58]].forEach(function (p) { parts.push({ g: box(0.09, 0.012, 0.09), m: M(snapPos(p[0]), 0.0, snapPos(p[1])), c: MAT.knot }); propCount++; });   /* 옹이·못 3 (1px 점, 격자 스냅) */
    /* 디오라마 받침 (룩 패스 5: 치수를 아트 픽셀 배수로 — 돌출 4px(0.222 m) · 위 지층 4px + 1px 줄 + 아래 지층 4px = 9px = 0.5 m. 줄은 0.01 만 돌출해 깊이로 앞에 오되 외곽선(6 cm) 은 안 생긴다) */
    var SLAB_OV = 6 * PX, SLAB_W = R_SPAN + 2 * SLAB_OV;   /* p=2 격자: 돌출 6px(0.222 m) · 지층 6px + 1px 줄 + 6px = 13px = 0.48 m (룩 패스 8, 세계 치수는 패스 5 와 같다) */
    parts.push({ g: box(SLAB_W, 6 * PX, SLAB_W), m: M(R_MID, -3 * PX, R_MID), c: MAT.slabTop });
    parts.push({ g: box(SLAB_W + 0.02, PX, SLAB_W + 0.02), m: M(R_MID, -6.5 * PX, R_MID), c: MAT.slabLine });
    parts.push({ g: box(SLAB_W, 6 * PX, SLAB_W), m: M(R_MID, -10 * PX, R_MID), c: MAT.slabBase });
    /* 벽 2면: 가로 널 10줄 0.3 m (창·문 구멍) + 줄 사이 1px 이음(W2, 0.045 m 높이 ≈ 1.2 px @ p=2 — 룩 패스 8, 전엔 0.08) + 세로 샛기둥 3개씩 */
    for (i = 0; i < 10; i++) {
      var y = 0.15 + i * 0.3, cwall = i % 2 ? MAT.wallA : MAT.wallB, cback = i % 2 ? MAT.wallB : MAT.wallA;
      if (y + 0.15 > WIN.y0 && y - 0.15 < WIN.y1) {
        parts.push({ g: box(0.12, 0.3, WIN.z0 + R, 1, 1, 4), m: M(-R, y, (-R + WIN.z0) / 2), c: cwall });
        parts.push({ g: box(0.12, 0.3, RF - WIN.z1, 1, 1, 4), m: M(-R, y, (WIN.z1 + RF) / 2), c: cwall });
      } else parts.push({ g: box(0.12, 0.3, R_SPAN, 1, 1, 10), m: M(-R, y, R_MID), c: cwall });
      if (y - 0.15 < DOOR.h) {
        parts.push({ g: box(DOOR.x0 + R, 0.3, 0.12, 7, 1, 1), m: M((-R + DOOR.x0) / 2, y, -R), c: cback });
        parts.push({ g: box(RF - DOOR.x1, 0.3, 0.12, 2, 1, 1), m: M((DOOR.x1 + RF) / 2, y, -R), c: cback });
      } else parts.push({ g: box(R_SPAN, 0.3, 0.12, 10, 1, 1), m: M(R_MID, y, -R), c: cback });
      if (i === 0) continue;
      var yb = i * 0.3;   /* 줄 경계 이음 */
      if (yb > WIN.y0 && yb < WIN.y1) {
        parts.push({ g: box(0.02, 0.045, WIN.z0 + R), m: M(-R + 0.065, yb, (-R + WIN.z0) / 2), c: MAT.wallSeam });
        parts.push({ g: box(0.02, 0.045, RF - WIN.z1), m: M(-R + 0.065, yb, (WIN.z1 + RF) / 2), c: MAT.wallSeam });
      } else parts.push({ g: box(0.02, 0.045, R_SPAN), m: M(-R + 0.065, yb, R_MID), c: MAT.wallSeam });
      if (yb < DOOR.h) {
        parts.push({ g: box(DOOR.x0 + R, 0.045, 0.02), m: M((-R + DOOR.x0) / 2, yb, -R + 0.065), c: MAT.wallSeam });
        parts.push({ g: box(RF - DOOR.x1, 0.045, 0.02), m: M((DOOR.x1 + RF) / 2, yb, -R + 0.065), c: MAT.wallSeam });
      } else parts.push({ g: box(R_SPAN, 0.08, 0.02), m: M(R_MID, yb, -R + 0.065), c: MAT.wallSeam });
    }
    [-1.9, -1.1, 1.85, RF - 0.25].forEach(function (z) { parts.push({ g: box(0.14, 3.0, 0.14), m: M(-R + 0.09, 1.5, z), c: MAT.stud }); propCount++; });   /* 왼쪽 벽 샛기둥 (벽면에서 0.1 돌출) */
    [-1.9, -0.9, 1.12, RF - 0.25].forEach(function (x) { parts.push({ g: box(0.14, 3.0, 0.14), m: M(x, 1.5, -R + 0.09), c: MAT.stud }); propCount++; });   /* 뒷벽 샛기둥 */
    parts.push({ g: box(0.2, 3.1, 0.2), m: M(-R, 1.55, -R), c: W[1] });                                                                             /* 모서리 기둥 */
    /* 지붕: 서까래 5 (x 방향, 5.7° 경사 y = 3.75 + 0.2x; 먼 쪽 3개는 통짜, 가까운 2개는 잘라낸 단면) + 도리 2 (z 방향, x=-2.1 / -1.6 = 옛 들보). 카메라 가까운 머리 위 목재는 창·보드를 가리므로 먼 모서리에만 둔다 */
    var RAFTER_K = 0.2, RAFTER_Y = 3.75;
    function rafter(z, x0, x1) {
      var xc = (x0 + x1) / 2, L = (x1 - x0) * Math.sqrt(1 + RAFTER_K * RAFTER_K);
      hiParts.push({ g: box(L, 0.2, 0.24), m: M(xc, RAFTER_Y + RAFTER_K * xc, z, 0, 0, Math.atan(RAFTER_K)), c: W[2] }); propCount++;
    }
    rafter(-2.3, -2.8, RF + 0.3); rafter(-1.75, -2.8, RF + 0.3); rafter(-1.2, -2.8, RF + 0.3); rafter(-0.65, -2.8, -0.6); rafter(-0.1, -2.8, -1.3);
    hiParts.push({ g: box(0.26, 0.26, R_SPAN + 0.6), m: M(-2.1, 3.31, R_MID), c: W[1] }); propCount++;
    hiParts.push({ g: box(0.26, 0.26, R_SPAN + 0.6), m: M(-1.6, 3.36, R_MID), c: W[1] }); propCount++;
    /* 11-10 위층 가는 계단 (뒷벽 오른쪽 구석, 문 오른쪽): 가파른 다락 계단 — 디딤판 7 · 옆판 2 · 난간. 발치(DOOR_ANCHORS.atticStair)에서 +x 로 밀면 올라간다 */
    (function () {
      var n = 7, run = (STAIR.x1 - STAIR.x0) / n, rise = STAIR.top / n, zc = (STAIR.z0 + STAIR.z1) / 2, zw = STAIR.z1 - STAIR.z0;
      for (var k = 0; k < n; k++) parts.push({ g: box(run + 0.05, 0.05, zw - 0.1), m: M(STAIR.x0 + run * (k + 0.5), rise * (k + 1) - 0.03, zc), c: k % 2 ? W[3] : W[4] });
      [STAIR.z0 + 0.04, STAIR.z1 - 0.04].forEach(function (z) { seg(parts, [STAIR.x0 - 0.06, 0, z], [STAIR.x1 + 0.02, STAIR.top, z], 0.07, W[1]); });
      seg(parts, [STAIR.x0 - 0.02, 0.85, STAIR.z1 - 0.04], [STAIR.x1 + 0.02, STAIR.top + 0.85, STAIR.z1 - 0.04], 0.035, W[2]);   /* 난간 */
      [0, 0.5, 1].forEach(function (t) { var x = STAIR.x0 + (STAIR.x1 - STAIR.x0) * t, y = STAIR.top * t; parts.push({ g: box(0.05, 0.85, 0.05), m: M(x, y + 0.43, STAIR.z1 - 0.04), c: W[1] }); });
      propCount += 2;
    })();
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
    var ATTIC_RUG = { x: snapPos(-1.0), z: snapPos(1.55), w: 2.3, d: 1.7, h: 0.016 };   /* 내 캐릭터 발자국 높이(plFloorY)도 이 값을 읽는다 */
    (function () {
      var RUG = ATTIC_RUG, bw = 0.14;
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
    /* ── 방 문 (8물결): 다락 ↔ 놀이방을 잇는 '같은 문' 한 짝 — 문틀 + 경첩(−z 쪽 기둥)에 단 문짝 + 문짝 뒤 문간판(열렸을 때만, 건너편 방의 따뜻한 빛).
       면은 y-z (+x 를 본다 — 카메라가 왼쪽 벽처럼 45° 로 본다) · 문짝은 +x 쪽으로 열린다 (다락에선 놀이방 쪽, 놀이방에선 방 안쪽 = 같은 문의 두 얼굴).
       바깥 문(뒷벽, 어두운 구멍 + 짙은 나무틀, 2.1 m)과 헷갈리지 않게: 크림색 틀 · 초록 문짝 · 둥근 창 · 호박색 손잡이 · 1.8 m (놀이방 벽 판자 줄 6칸).
       열림 = 12 fps 4프레임 (LEAF_A[1..4]), 닫힘 = 거꾸로. 재질은 지금 것만 (lambert · basic) → 새 셰이더 없음 */
    var LEAF_A = [0, 0.38, 0.78, 1.18, 1.5];
    function makeDoor(cfg) {
      var w = cfg.w, h = cfg.h, P = 0.12, fd = cfg.depth || P, lw = w - 0.03, lh = h - 0.03, D = { f: 0, cfg: cfg };
      var g = D.g = new T.Group(); g.name = 'door-' + cfg.name; g.position.set(snapPos(cfg.x), 0, snapPos(cfg.z));
      var fp = [];
      [-1, 1].forEach(function (s) { fp.push({ g: box(fd, h + P, P), m: M(0, (h + P) / 2, s * (w / 2 + P / 2)), c: cfg.frame }); });   /* 기둥 2 */
      fp.push({ g: box(fd, P, w + 2 * P), m: M(0, h + P / 2, 0), c: cfg.frame });                                                     /* 상인방 */
      if (cfg.sill) fp.push({ g: box(0.3, 0.03, w + 2 * P + 0.08), m: M(0, 0.015, 0), c: cfg.sill });                                 /* 문턱 (혼자 선 문: 바닥에 선 것으로 읽히게) */
      D.frame = new T.Mesh(keep(mergeParts(fp)), lambert); D.frame.castShadow = !!cfg.cast; D.frame.receiveShadow = true; g.add(D.frame);
      D.pivot = new T.Group(); D.pivot.position.set(0, 0, -w / 2); g.add(D.pivot);
      var lp = [{ g: box(0.05, lh, lw), m: M(0, 0.015 + lh / 2, 0.015 + lw / 2), c: cfg.leaf },
        { g: box(0.02, lh * 0.3, lw - 0.22), m: M(0.03, 0.015 + lh * 0.24, 0.015 + lw / 2), c: cfg.panel },                        /* 아래 판 */
        { g: new T.CylinderGeometry(0.13, 0.13, 0.02, 10), m: M(0.03, 0.015 + lh * 0.7, 0.015 + lw / 2, 0, 0, Math.PI / 2), c: cfg.panel },   /* 둥근 창 테 */
        { g: box(0.05, 0.07, 0.07), m: M(0.045, 0.015 + lh * 0.47, 0.015 + lw - 0.1), c: cfg.knob }];                              /* 손잡이 */
      D.leaf = new T.Mesh(keep(mergeParts(lp)), lambert); D.leaf.castShadow = !!cfg.cast; D.leaf.receiveShadow = true; D.pivot.add(D.leaf);
      D.port = new T.Mesh(keep(new T.CylinderGeometry(0.09, 0.09, 0.024, 10)), keep(new T.MeshBasicMaterial({ color: C(cfg.glass) })));   /* 둥근 창 유리: 빛 안 받는 색 (낮 = 유리 하늘색, 밤 = 건너편 방 불빛) + 발광 — doorsApplyLight */
      D.port.position.set(0.032, 0.015 + lh * 0.7, 0.015 + lw / 2); D.port.rotation.z = Math.PI / 2; D.pivot.add(D.port); D.portEm = emTwin(D.port, D.port.geometry);
      D.way = new T.Mesh(keep(new T.PlaneGeometry(w, h)), basic(cfg.way)); D.way.rotation.y = Math.PI / 2; D.way.position.set(-0.035, h / 2, 0);
      D.way.castShadow = !!cfg.cast; D.way.visible = false; g.add(D.way);                                                              /* 문간판: 닫히면 숨김 (문짝이 가린다) */
      if (cfg.seam) {   /* 밤에 새는 불빛 (다락 쪽 문만): 손잡이 쪽 틈 세로 줄 + 문턱 위 빛 한 줄 — 빛 안 받는 호박색, 닫혀 있고 노을·밤일 때만 (doorsApplyLight). 문짝 · 문틀 안에만 그린다 */
        var sy0 = cfg.sill ? 0.03 : 0.015;
        D.seam = new T.Mesh(keep(mergeParts([{ g: box(0.01, lh - 0.06, 0.04), m: M(0.03, 0.015 + lh / 2 + 0.02, w / 2 - 0.02), c: cfg.way },
          { g: box(0.07, 0.006, lw - 0.04), m: M(0.06, sy0 + 0.003, 0), c: cfg.way }])), basic(cfg.way));
        D.seam.castShadow = false; D.seam.receiveShadow = false; D.seam.visible = false; g.add(D.seam);
      }
      D.box = new T.Box3(new T.Vector3(-fd / 2, 0, -w / 2 - P), new T.Vector3(fd / 2, h + P, w / 2 + P));                            /* 눌러 열 자리 (그룹 좌표) */
      cfg.parent.add(g);
      return D;
    }
    function setLeaf(D, f) { if (!D) return; f = clamp(f | 0, 0, 4); D.f = f; D.pivot.rotation.y = LEAF_A[f]; D.way.visible = f > 0; if (D.seam) D.seam.visible = f === 0 && !!D.seamOn; }
    var DOOR_PAINT = { frame: PAL.paper[1], sill: W[2], leaf: PAL.moss[2], panel: PAL.moss[1], glass: PAL.sky[1], knob: PAL.amber[3], way: PAL.amber[2] };
    /* 다락 쪽 문 (나): 다락엔 오른쪽 벽이 없으므로 오른쪽 바닥 끝(x 2.38)에 혼자 선 문틀 — 상자·양초(x 2.0, z −0.75) 앞쪽, 바깥 문(뒷벽 x 1.5~2.4)과 멀리.
       z 1.4: 1.0 이면 상자 자리(집에 있는 날 문어가 머무는 곳)의 문어를 약 21% 가렸다 → 1.4 에서 약 4%. 더 앞(1.7~)은 320×568 에서 문 발치가 잘리고 가운데 자리 문어를 가린다.
       덧그림이라 다른 소품은 그대로이고, 그림자를 안 던진다 (해가 −x 에서 오므로 그림자는 문 너머 허공으로 — 던지지 않으면 문 자리 밖 픽셀은 붙이기 전과 같다) */
    var ATTIC_DOOR = makeDoor(Object.assign({ name: 'atticPlay', parent: atticG, x: RF - 0.12, z: 1.4, w: 0.72, h: 1.68, cast: false, seam: true }, DOOR_PAINT));
    function doorsApplyLight() {   /* 둥근 창: 낮엔 유리, 노을·밤엔 건너편 방의 따뜻한 불빛 (밤에 어두운 문짝이 '불 켜진 방으로 가는 문' 으로 읽히게) — 발광은 창 안에만 (블룸 2px 는 문짝 안) */
      var em = light.em == null ? 1 : light.em, nk = clamp((em - 0.25) / 0.75, 0, 1);
      [ATTIC_DOOR, PLAY_DOOR].forEach(function (D) {
        if (!D) return; D.port.material.color.copy(lerpC(DOOR_PAINT.glass, PAL.amber[3], nk)); D.portEm.material.color.copy(C(EM.lamp)).multiplyScalar(0.7 * nk); D.portEm.visible = nk > 0.01;
        if (D.seam) { D.seamOn = nk > 0.3; D.seam.material.color.copy(lerpC(DOOR_PAINT.leaf, DOOR_PAINT.way, clamp((nk - 0.3) / 0.4, 0, 1))); D.seam.visible = D.seamOn && D.f === 0; }   /* 밤: 문틈 불빛 (낮엔 없음 → 낮 그림은 그대로) */
      });
    }
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
    function lampK(n) { return n > 0 ? 0.4 + 0.6 * n / 8 : FIRST_LIGHT.ember * nightK(); }   /* 등불 계수: 0칸 = 밤에만 작은 불씨(첫 불, 노을→밤 전환 동안 0→ember) · 1칸 0.475 → 8칸 1 (칸당 0.075, 예전 곡선 그대로) */
    function glowOpacity() { var n = st.lantern; return (light.glow || 0.7) * (n > 0 ? 0.43 + 0.57 * n / 8 : 0.43 * lampK(0) / 0.475); }   /* 8칸에서 시각대의 glow (낮 0.4 · 밤 0.7) · 0칸 불씨는 1칸 글로우의 계수 비례 */
    function applyLamp() {
      var n = st.lantern, lit = n > 0, ember = !lit && nightK() >= 0.5, on = lit || ember, k = on ? lampK(n) : 0;   /* 0칸: 낮·새벽·노을 = 예전처럼 꺼짐(회색 유리) · 밤 = 불씨 (노을→밤 전환 중간부터, 세기는 nightK 를 따라 오른다). lit = 칸이 찬 등불(먼지·유리 밝은 칸) */
      lamp.intensity = (light.lamp || 1.2) * k; lamp.distance = light.lampD || 6;
      recolor(lampGlassGeo, 1, lit ? PAL.amber[2] : ember ? PAL.amber[1] : PAL.slate[1]); recolor(lampGlassGeo, 2, lit ? PAL.amber[5] : ember ? PAL.amber[4] : PAL.slate[2]);   /* 불씨: 유리·심지 띠가 한 칸씩 어둡다 */
      lampEm.visible = on; lampEm.material.color.copy(C(EM.lamp)).multiplyScalar((light.em || 1) * k);
      lampGlow.visible = on; lampGlow.material.opacity = glowOpacity(); lampGlow.scale.setScalar(lit ? 0.7 + 0.06 * n : 0.55);
      lampPool.visible = on; lampPool.material.opacity = (lit ? 0.12 + 0.03 * n : 0.12 * k / 0.475) * (light.pool || 1); lampPool.scale.setScalar((light.lampD || 6) / 6 * (lit ? 1 : 0.8));
      dust.visible = lit && !st.reduced;
      applyFloor();   /* 밤 바닥·문어 자체광 (등불 칸에 따라) */
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
    /* ── 소파 + 옮길 수 있는 가구 (11-10 주인: "카펫 근처에 벽에 등 대는 소파" · "꾹 눌러서 이동할 수 있게 배치해 주는 인테리어 시스템" · "소파에 노란 점 → 터치하면 폴짝 뛰어서 앉기") ──
       소파: 낮고 통통한 주황 2인용 (참고 그림의 덩어리 쿠션), 등은 −x · 앉는 쪽은 +x. 첫날부터 있다 (등불 칸과 무관).
       FURN = 옮길 수 있는 것: 소파 · 상자 더미(양초 · 문어의 상자 옆 자리가 따라온다) · 담요(문어의 잠자리가 따라온다). 꾹 0.48 s → 살짝 들림 → 바닥을 따라 0.25 m 칸으로 끌기 → 놓기.
       못 놓는 곳(벽 밖 · 문 앞 · 다른 가구 위 · 문어/내 캐릭터 자리)으로는 안 간다 (마지막으로 놓을 수 있던 칸에 머문다). 놓으면 on.furnMove({ id, x, z }) — 저장은 앱(S.room.layout) · 되살리기는 setLayout */
    var sofaM = (function () {
      var OR = '#e8702a', OD = '#c2551e', OL = '#f08a45', L = [];
      L.push({ g: box(0.80, 0.20, 1.36), m: M(0, 0.17, 0), c: OD });
      [[-0.32, -0.6], [-0.32, 0.6], [0.32, -0.6], [0.32, 0.6]].forEach(function (f) { L.push({ g: box(0.07, 0.07, 0.07), m: M(f[0], 0.035, f[1]), c: W[1] }); });
      [-0.27, 0.27].forEach(function (dz) {
        L.push({ g: box(0.56, 0.16, 0.52), m: M(0.10, 0.35, dz), c: OR }, { g: box(0.50, 0.03, 0.46), m: M(0.10, 0.44, dz), c: OL }, { g: box(0.20, 0.42, 0.52), m: M(-0.27, 0.60, dz, 0, 0, 0.14), c: OR });
      });
      [-1, 1].forEach(function (sd) { L.push({ g: box(0.80, 0.40, 0.14), m: M(0, 0.42, sd * 0.61), c: OR }, { g: box(0.74, 0.03, 0.12), m: M(0, 0.635, sd * 0.61), c: OL }); });
      var m = new T.Mesh(keep(mergeParts(L)), lambert); m.castShadow = true; m.receiveShadow = true; m.position.set(SOFA.x0 + 0.40, 0, SOFA.z); atticG.add(m); propCount++;
      return m;
    })();
    var FURN = { sofa: { m: sofaM, w: 0.42, d: 0.68, name: '소파', rot: 0, sc: 1 }, crate: { get m() { return props.crate; }, w: 0.52, d: 0.44, name: '상자', rot: 0, sc: 1 }, blanket: { get m() { return props.blanket; }, w: 0.70, d: 0.50, flat: true, name: '담요', rot: 0, sc: 1 } };
    Object.keys(FURN).forEach(function (id) { var f = FURN[id]; Object.defineProperty(f, 'hw', { get: function () { var a = f.rot * DEG; return (Math.abs(Math.cos(a)) * f.w + Math.abs(Math.sin(a)) * f.d) * f.sc; } }); Object.defineProperty(f, 'hd', { get: function () { var a = f.rot * DEG; return (Math.abs(Math.sin(a)) * f.w + Math.abs(Math.cos(a)) * f.d) * f.sc; } }); });   /* 발자국 반폭 = 돌린 네모를 감싸는 상자 (rot 은 도 · 자유 각도) × 크기 배율 */   /* 상자 · 담요는 아래에서 만들어진다 → 읽을 때 찾는다 */
    var FU = { drag: null, spotK: null }, _fray = new T.Raycaster(), _fndc = new T.Vector2(), _fpl = new T.Plane(new T.Vector3(0, 1, 0), 0), _fpt = new T.Vector3();
    function furnFloor(cx, cy) {   /* 클라이언트 px → 다락 바닥(0.2 m 위 평면) 좌표 */
      var r = canvas.getBoundingClientRect(); if (!r.width || !r.height) return null;
      _fndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); _fray.setFromCamera(_fndc, camera); _fpl.constant = -(atticG.position.y + 0.2);
      return _fray.ray.intersectPlane(_fpl, _fpt) ? _fpt.sub(atticG.position) : null;
    }
    function furnAt(cx, cy) { var p = furnFloor(cx, cy), hit = null; if (!p) return null; ['sofa', 'crate', 'blanket'].forEach(function (id) { var f = FURN[id]; if (!hit && f.m.visible && Math.abs(p.x - f.m.position.x) <= f.hw + 0.1 && Math.abs(p.z - f.m.position.z) <= f.hd + 0.1) hit = id; }); return hit; }
    function furnLim(f) { return [-R + 0.16 + f.hw, RF - 0.1 - f.hw, -R + 0.16 + f.hd, RF - 0.1 - f.hd]; }
    var FURN_KEEP = [[RF - 1.2, RF + 1, 0.7, 2.7], [1.3, 2.6, -R - 1, -1.6]];   /* 놀이방 문 앞 · 바깥 문 앞은 비워 둔다 */
    var SAL_KEEP = [-R, -0.75, -R, -0.6];   /* 미용실 코너 바닥 [x0, x1, z0, z1]: 문어 자리 (−1.75, −1.1) 둘레 0.42 · 대야 (−1.1, −1.55) r 0.30 · 거울 앞 (docs/SALON.md §2.1) — 가구를 여기 놓으면 '바꾸기' 연출이 가구 속에서 돈다 */
    function furnOk(id, x, z) {
      var f = FURN[id], l = furnLim(f), i, o;
      if (x < l[0] - 1e-6 || x > l[1] + 1e-6 || z < l[2] - 1e-6 || z > l[3] + 1e-6) return false;
      for (i = 0; i < FURN_KEEP.length; i++) { o = FURN_KEEP[i]; if (x + f.hw > o[0] && x - f.hw < o[1] && z + f.hd > o[2] && z - f.hd < o[3]) return false; }
      /* 11-11: 미용실 코너는 위층으로 이사했다 — 다락의 SAL_KEEP 금지 구역은 더 쓰지 않는다 (가구 배치는 다락에만 있고, 위층 살림은 못 옮긴다) */
      if (f.flat) return true;   /* 담요는 깔개라 어디든 (가구 밑 · 발밑) */
      for (var k in FURN) { o = FURN[k]; if (k === id || o.flat || !o.m.visible) continue; if (Math.abs(x - o.m.position.x) < f.hw + o.hw && Math.abs(z - o.m.position.z) < f.hd + o.hd) return false; }
      if (octG.visible && octG.parent === atticG && Math.abs(x - oct.pos.x) < f.hw + 0.5 && Math.abs(z - oct.pos.z) < f.hd + 0.5) return false;
      if (PL.place === 'attic' && Math.abs(x - PL.pos.x) < f.hw + PL_RAD * 0.6 && Math.abs(z - PL.pos.z) < f.hd + PL_RAD * 0.6) return false;
      return true;
    }
    function furnApply(id) {   /* 딸린 것들: 상자 → 양초 · 양초 빛 · 문어의 '상자 옆' 자리, 담요 → 문어의 잠자리 */
      var f = FURN[id], x = f.m.position.x, z = f.m.position.z, lm = [-(R - 0.5), RF - 0.5];
      if (id === 'crate') { candleG.position.set(x + 0.05, 0.72 + (f.m.position.y || 0), z - 0.05); candleLight.position.set(candleG.position.x, 1.15, candleG.position.z); ANCHORS.crate = [clamp(x - 0.75, lm[0], lm[1]), 0, clamp(z - 0.25, lm[0], lm[1])]; }
      else if (id === 'blanket') ANCHORS.blanket = [x, 0, z - 0.1];
      lampDirty = true;
    }
    /* 배치 모드 (주인 11-10 참고 화면: "사물은 고정된 상태에서 캐릭터 움직여서 놓아지게 · 사이즈 조절 · 회전"): 가구를 꾹 누르면(또는 앱이 furnCarry(id)) 그 가구가 살짝 떠서 **내 캐릭터 앞에 붙는다**.
       스틱 · 방향키로 캐릭터를 움직이면 가구가 앞에서 따라오고(0.25 m 칸, 놓을 수 없는 칸으로는 안 간다 = 늘 놓을 수 있는 자리), 돌리기 90° · 크기 0.8~1.3 을 고른 뒤 놓기(확인) 또는 취소(처음 자리로) */
    function furnPose(id) { var f = FURN[id]; f.m.rotation.y = f.rot * DEG; f.m.scale.setScalar(f.sc); }
    function furnItems() { return Object.keys(FURN).filter(function (k) { return FURN[k].m.visible; }).map(function (k) { return { id: k, name: FURN[k].name }; }); }
    function furnState() { var c = FU.carry; return c ? { id: c.id, name: FURN[c.id].name, rot: FURN[c.id].rot, scale: FURN[c.id].sc, items: furnItems() } : null; }
    /* 발밑 표시 (참고 화면의 노란 자리 표시): 들고 있는 가구가 놓일 자리에 얇은 호박색 네모 — 배치 모드에서만 보인다 */
    var furnMark = new T.Mesh(keep(new T.PlaneGeometry(1, 1)), keep(new T.MeshBasicMaterial({ color: C('#ffd866').getHex(), transparent: false, depthWrite: false })));
    furnMark.rotation.x = -Math.PI / 2; furnMark.visible = false; furnMark.renderOrder = 1; atticG.add(furnMark);
    function furnCarry(id) {   /* → 배치 모드 시작 (이미 다른 것을 들고 있으면 그건 놓고 바꾼다) */
      var f = FURN[id]; if (!f || !f.m.visible || PLACE.vis !== 'attic' || PLACE.room || PL.place !== 'attic' || !playerInputAllowed()) return false;
      if (FU.carry) { if (FU.carry.id === id) return true; furnConfirm(); }
      if (PL.sit && !PL.hop) plStand();
      FU.carry = { id: id, x: f.m.position.x, z: f.m.position.z, rot: f.rot, sc: f.sc, tx: f.m.position.x, tz: f.m.position.z, t: 0 };
      furnApply(id); dither.still = 0; emit('furnEdit', furnState()); return true;
    }
    function furnEnd(keep) {
      var c = FU.carry; if (!c) return null; var f = FURN[c.id];
      if (!keep) { f.rot = c.rot; f.sc = c.sc; f.m.position.x = c.x; f.m.position.z = c.z; }
      else { f.m.position.x = c.tx; f.m.position.z = c.tz; FU.bounce = { id: c.id, t: 0 }; }   /* 놓을 땐 표시 자리에 딱 + 통 하고 내려앉는다 */
      furnPose(c.id); f.m.position.y = 0; FU.carry = null; furnMark.visible = false; furnApply(c.id); dither.still = 0; emit('furnEdit', null);
      return { id: c.id, x: +f.m.position.x.toFixed(3), z: +f.m.position.z.toFixed(3), rot: f.rot, scale: f.sc };
    }
    function furnConfirm() { var r = furnEnd(true); if (r) emit('furnMove', r); return r; }
    function furnCancel() { furnEnd(false); }
    function furnSetRot(deg) { var c = FU.carry; if (!c || !isFinite(+deg)) return; var f = FURN[c.id]; f.rot = ((Math.round(+deg) % 360) + 360) % 360; furnPose(c.id); furnApply(c.id); dither.still = 0; }   /* 슬라이더: 0~359° 자유 */
    function furnSetScale(v) { var c = FU.carry; if (!c || !isFinite(+v)) return; var f = FURN[c.id]; f.sc = clamp(+v, 0.7, 1.5); furnPose(c.id); furnApply(c.id); dither.still = 0; }   /* 슬라이더: 0.7~1.5 */
    function furnRotate() { var c = FU.carry; if (c) { furnSetRot(FURN[c.id].rot + 90); emit('furnEdit', furnState()); } }
    function furnScale(dir) { var c = FU.carry; if (c) { furnSetScale(Math.round((FURN[c.id].sc + (dir > 0 ? 0.1 : -0.1)) * 10) / 10); emit('furnEdit', furnState()); } }
    function stepCarry(dt) {   /* 들고 있는 가구: 캐릭터 앞 자리를 표시(놓을 수 있는 곳만)가 따라가고, 가구는 그 위에 떠서 부드럽게 쫓아간다 (둥실 + 살짝 기울기) */
      var b = FU.bounce;
      if (b) { b.t += dt; var bf = FURN[b.id], bk = Math.min(1, b.t / 0.28), sq = 1 - 0.12 * Math.sin(Math.PI * bk) * (1 - bk); bf.m.scale.set(bf.sc * (2 - sq), bf.sc * sq, bf.sc * (2 - sq)); if (bk >= 1) { furnPose(b.id); FU.bounce = null; } dither.still = 0; }
      var c = FU.carry; if (!c) return;
      if (PLACE.vis !== 'attic' || PL.place !== 'attic') { furnCancel(); return; }
      var f = FURN[c.id], l = furnLim(f), d = 0.5 + Math.max(f.hw, f.hd), fx = Math.sin(PL.yaw), fz = Math.cos(PL.yaw);
      var x = clamp(snapPos(PL.pos.x + fx * d), l[0], l[1]), z = clamp(snapPos(PL.pos.z + fz * d), l[2], l[3]);
      if (furnOk(c.id, x, z)) { c.tx = x; c.tz = z; }
      else if (!furnOk(c.id, c.tx, c.tz)) { c.tx = clamp(c.tx, l[0], l[1]); c.tz = clamp(c.tz, l[2], l[3]); }   /* 돌리거나 키워서 벽에 걸리면 안쪽으로 */
      c.t += dt;
      var k = st.reduced ? 1 : 1 - Math.exp(-dt * 10), mx = c.tx - f.m.position.x, mz = c.tz - f.m.position.z;
      f.m.position.x += mx * k; f.m.position.z += mz * k; f.m.position.y = st.reduced ? 0.1 : 0.14 + 0.03 * Math.sin(c.t * 4);
      f.m.rotation.set(st.reduced ? 0 : clamp(mz * 0.5, -0.12, 0.12), f.rot * DEG, st.reduced ? 0 : clamp(-mx * 0.5, -0.12, 0.12));   /* 끌려오는 쪽으로 살짝 기운다 */
      furnMark.visible = true; furnMark.position.set(c.tx, f.flat ? 0.14 : 0.012, c.tz); furnMark.scale.set(f.hw * 2 + 0.08, f.hd * 2 + 0.08, 1);
      furnApply(c.id); dither.still = 0;
    }
    function furnHoldStart() {   /* 꾹 0.48 s → 그 가구로 배치 모드 */
      if (!press || press.moved || press.multi || press.pet || GEST.mode !== 'press' || PLACE.vis !== 'attic' || PLACE.room || panLocked() || PLAY) return;
      if (press.obj && press.obj.userData.kind === 'oct') return;
      var id = furnAt(press.x, press.y); if (!id) return;
      if (furnCarry(id)) { GEST.mode = 'done'; press.moved = true; }   /* 이 누름은 여기서 끝 (떼도 톡으로 안 친다) */
    }
    function furnDragMove() {} function furnDrop() { GEST.hold = false; }   /* (옛 끌기 방식의 자리 — 배치 모드로 바꿨다) */
    function setLayout(o) {   /* { sofa: [x, z, rot?, scale?], … } — 범위 밖 · 모르는 것은 무시 */
      if (!o || typeof o !== 'object') return;
      Object.keys(FURN).forEach(function (id) {
        var v = o[id], f = FURN[id]; if (!Array.isArray(v) || !isFinite(+v[0]) || !isFinite(+v[1])) return;
        f.rot = isFinite(+v[2]) ? ((Math.round(+v[2]) % 360) + 360) % 360 : 0; f.sc = isFinite(+v[3]) && +v[3] > 0 ? clamp(+v[3], 0.7, 1.5) : 1; furnPose(id);
        var l = furnLim(f); f.m.position.x = clamp(+v[0], l[0], l[1]); f.m.position.z = clamp(+v[1], l[2], l[3]); furnApply(id);
      });
      dither.still = 0;
    }
    function layoutNow() { var out = {}; Object.keys(FURN).forEach(function (id) { var f = FURN[id]; out[id] = [+f.m.position.x.toFixed(3), +f.m.position.z.toFixed(3), f.rot, f.sc]; }); return out; }
    function sofaAx() { var a = FURN.sofa.rot * DEG; return [Math.cos(a), -Math.sin(a)]; }   /* 소파가 보는 쪽 (앉는 쪽) 단위 벡터 [x, z] */
    function stepSofaSpot() {   /* 소파 위 노란 점 자리 (CSS px, 장면 기준) — 바뀔 때만 on.sofaSpot({ x, y } | null) */
      var f = FURN.sofa, show = PLACE.vis === 'attic' && !PLACE.room && PL.place === 'attic' && !PL.sit && !PL.hop && !FU.carry && playerInputAllowed(), x = 0, y = 0;
      if (show) {
        var sa = sofaAx(); _fpt.set(f.m.position.x + sa[0] * 0.10 * f.sc, 0.66 * f.sc, f.m.position.z + sa[1] * 0.10 * f.sc).add(atticG.position).project(camera);
        x = Math.round(S.offX + (_fpt.x * 0.5 + 0.5) * S.cw); y = Math.round(S.offY + (1 - (_fpt.y * 0.5 + 0.5)) * S.ch);
        if (x < 14 || x > S.W - 14 || y < 58 || y > S.H - 14) show = false;
      }
      var k = show ? x + ',' + y : ''; if (k !== FU.spotK) { FU.spotK = k; emit('sofaSpot', show ? { x: x, y: y } : null); }
    }
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
      rebuildDecals();
      container.dataset.items = st.items.join(' ');
      layoutSouvenirs();
      if (SAL) salItemsChanged();   /* 미용실 코너가 나타나거나 사라졌으면: 팔레트 덧칸 · 걸린 연출 마무리 */
    }
    function rebuildDecals() {   /* 바닥 접촉 데칼 한 메시 (소품 + '바꾸기' 동안의 대야 — 대야가 드로우콜을 더 쓰지 않게 여기에 합친다) */
      if (propDecals) { atticG.remove(propDecals); propDecals.geometry.dispose(); propDecals = null; }
      var dp = [];
      Object.keys(props).forEach(function (k) { var m = props[k]; if (m.visible && m.userData.decalR) dp.push({ g: new T.PlaneGeometry(m.userData.decalR * 2, m.userData.decalR * 2), m: M(m.position.x, 0.012, m.position.z, -Math.PI / 2, 0, 0), c: '#ffffff' }); });
      if (SAL && salG.visible && salE.visible) dp.push({ g: new T.PlaneGeometry(0.84, 0.84), m: M(SALC.tx, 0.012, SALC.tz, -Math.PI / 2, 0, 0), c: '#ffffff' });
      if (dp.length) { propDecals = new T.Mesh(mergeParts(dp), decalMat); propDecals.renderOrder = 1; atticG.add(propDecals); }
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

    /* ── 미용실 거울 코너 (docs/SALON.md §2.1 · §8.2 — 주인 11-08 밤: 몸 색은 처음 한 번만 사람이 고르고, 그 뒤엔 거울 앞에서 묻고 문어가 정한다) ──
       뒷벽 왼쪽 칸 (샛기둥 x −1.9 · −0.9 사이 빈 폭 −1.83 … −0.97, 등불 아래). items 'salon' 일 때만 보인다 (앱 ITEM_LEVEL.salon = 2 — 상자와 같은 날, 말 없이).
       A (lambert · 그림자 던짐) = 아치 거울 틀 (바깥 0.56 × 0.82, 위 반지름 0.28, 두께 0.05, 위 끝 y 1.27 · 가운데 x −1.48 — 등불 7칸 선반과 그 받침(x −0.95)이 화면에서
       아치를 덮지 않게 내리고 왼쪽으로: 아치 둘레 2 아트px 밖까지 등불 8칸 선반·기념품에 안 가린다 (T6)) + 병 선반 0.66 × 0.04 × 0.12 + 받침 2 (왼쪽 샛기둥 −1.83 과 띄움)
       B (basicV · 빛을 안 탐) = 유리 2톤 (테 · 면) + 1px 사선 빛줄기 2 + 병 6 (왼쪽부터 빨강 주황 보라 파랑 초록 분홍) + '처음 색' 병 1 (바닥, 내밀 때만) + 코르크 + 1px 반짝
       C (basicV) = 거울 속 문어 (원 + 흰 눈 2 + 동공): 문어가 거울 앞 점에서 1.2 m 안일 때만 · 몸색은 octColor 가 문어 몸과 같이 칠한다 (유리 쪽으로 조금 섞음)
       E (lambert) 대야 · F (basicV) 물 · G (basicV) 물보라 — '바꾸기' 연출 동안만 (늘 있는 대야는 걷는 길을 막는다 · 대야 접촉 데칼은 소품 데칼 메시에 합친다).
       정적 room 에 합치지 않는다 (레이캐스트로 'salon' 을 가린다) · 재질은 장면 인스턴스 그대로 (셰이더 프로그램 0개 추가) · 레이어 0 만 (초상에 안 찍힌다) ·
       유리·병·코르크·물·거울 속 문어는 밤에 한 칸 어둡게 (salNight) · 꾸미기(INTERIOR_MODE)가 와도 옮기지 않는 고정 물건.
       드로우콜 (패스마다 따로): 가만히 A 3 + B 2 (+ 거울 앞이면 C 2) · '바꾸기' 중 + E 2 + F 2 + G 2 (대야 데칼은 0) */
    var SAL_HEX = ['#e8463c', '#f08a3c', '#9a5cc8', '#4a86d8', '#4fa868', '#f07aa8'];   /* 병 6 = SALON.PRESETS (첫 실행 색 6 과 같은 값 · 순서) */
    var SAL_X = -1.48, SAL_Y0 = 0.45;   /* 거울 가운데 x · 틀 아래 y — 나머지 높이는 여기서 (선반 = 틀 아래 − 0.20 · 아치 중심 = 틀 아래 + 0.54) */
    var SALC = { x: snapPos(SAL_X), wz: -R + 0.06, y0: SAL_Y0, yc: SAL_Y0 + 0.54, ro: 0.28, ri: 0.22, d: 0.05, sy: SAL_Y0 - 0.20, sz: -R + 0.12, gap: 0.11, sw: 0.66,
      tx: snapPos(-1.1), tz: snapPos(-1.55), th: 0.18, wy: 0.17, fx: snapPos(SAL_X), fz: -2.0, near: 1.2, cy: SAL_Y0 + 0.18, cust: [snapPos(SAL_X + 0.40), -R + 0.14] };
    /* x 거울 가운데 · wz 벽 널 앞면 · y0 틀 아래 · yc 아치 중심 · sy 선반 윗면 · sz 선반 가운데 z · sw 선반 폭 · tx/tz 대야 자리 (문어 자리에서 0.79 m) · th 대야 테 높이 · wy 물 높이 ·
       fx/fz 거울 앞 점 (거울 속 문어를 보일 거리의 기준) · cy 거울 속 문어 높이 · cust '처음 색' 병 자리 (선반 오른쪽 옆 바닥 — 선반엔 일곱째 칸이 없다 · 받침과 안 겹친다) */
    var salG = new T.Group(); salG.name = 'salon';
    function salArch(r, y0) { var s = new T.Shape(); s.moveTo(-r, y0); s.lineTo(r, y0); s.lineTo(r, SALC.yc); s.absarc(0, SALC.yc, r, 0, Math.PI, false); s.lineTo(-r, y0); return s; }   /* 아래가 네모, 위가 반원인 아치 (x 는 거울 가운데 기준) */
    var salFrame = salArch(SALC.ro, SALC.y0); salFrame.holes.push(salArch(SALC.ri, SALC.y0 + SALC.ro - SALC.ri));
    var salA = new T.Mesh(keep(mergeParts([
      { g: new T.ExtrudeGeometry(salFrame, { depth: SALC.d, bevelEnabled: false, curveSegments: 6 }), m: M(SALC.x, 0, SALC.wz), c: W[1] },   /* 틀 (테 0.06) — 뒷면이 벽 널에 닿는다 */
      { g: box(SALC.sw, 0.04, 0.12), m: M(SALC.x, SALC.sy - 0.02, SALC.sz), c: W[2] },                                                        /* 병 선반 */
      { g: box(0.04, 0.09, 0.09), m: M(SALC.x - 0.27, SALC.sy - 0.085, SALC.wz + 0.045), c: W[1] },
      { g: box(0.04, 0.09, 0.09), m: M(SALC.x + 0.27, SALC.sy - 0.085, SALC.wz + 0.045), c: W[1] }])), lambert);
    salA.castShadow = true; salA.receiveShadow = true; salG.add(salA);
    var salBParts = [
      { g: new T.ShapeGeometry(salArch(SALC.ri, SALC.y0 + 0.06), 6), m: M(SALC.x, 0, SALC.wz + 0.026), c: PAL.glass[1], tag: 2 },          /* 유리 테 (어두운 톤) — 층 사이 5 mm 이상 (깊이 버퍼 16비트에서도 안 싸우게) */
      { g: new T.ShapeGeometry(salArch(SALC.ri - 0.04, SALC.y0 + 0.10), 6), m: M(SALC.x, 0, SALC.wz + 0.031), c: PAL.glass[2], tag: 3 },   /* 유리 면 (밝은 톤) */
      { g: box(0.04, 0.28, 0.002), m: M(SALC.x + 0.07, SALC.yc - 0.05, SALC.wz + 0.036, 0, 0, -0.5), c: PAL.white, tag: 4 },             /* 사선 빛줄기 2 (1px) */
      { g: box(0.04, 0.13, 0.002), m: M(SALC.x + 0.12, SALC.yc - 0.18, SALC.wz + 0.036, 0, 0, -0.5), c: PAL.white, tag: 4 }];
    for (var sb = 0; sb < 7; sb++) {   /* 병 몸 r 0.05 · h 0.14 + 코르크 r 0.03 · h 0.03 — 제 원점(바닥 가운데)에 만들어 두고 salPut 이 자리로 옮겨 쓴다 (tag 10+i 몸 · 20+i 코르크) */
      salBParts.push({ g: new T.CylinderGeometry(0.05, 0.05, 0.14, 6), m: M(0, 0.07, 0), c: SAL_HEX[sb % 6], tag: 10 + sb });
      salBParts.push({ g: new T.CylinderGeometry(0.03, 0.03, 0.03, 5), m: M(0, 0.155, 0), c: W[3], tag: 20 + sb });
    }
    salBParts.push({ g: new T.PlaneGeometry(1, 1), c: PAL.white, tag: 30 });   /* 1px 반짝 (내밀 때 2칸) — 평소엔 한 점에 접혀 안 그려진다 */
    var salB = new T.Mesh(keep(mergeParts(salBParts)), basicV); salB.castShadow = false; salB.frustumCulled = false; salG.add(salB);   /* 병이 대야로 폴짝 가므로 경계 구로 거르지 않는다 */
    var salBGeo = salB.geometry, salBase = salBGeo.attributes.position.array.slice(), salBaseN = salBGeo.attributes.normal.array.slice(), salIdx = { bottle: [[], [], [], [], [], [], []], spark: [] };
    salBGeo.userData.tags.forEach(function (t, v) { if (t >= 10 && t < 17) salIdx.bottle[t - 10].push(v); else if (t >= 20 && t < 27) salIdx.bottle[t - 20].push(v); else if (t === 30) salIdx.spark.push(v); });
    var salC = new T.Mesh(keep(mergeParts([
      { g: new T.CircleGeometry(0.14, 12), m: M(0, 0, 0), c: st.color, tag: 1 },
      { g: new T.CircleGeometry(0.04, 6), m: M(-0.055, 0.015, 0.0035), c: OC.white, tag: 2 }, { g: new T.CircleGeometry(0.04, 6), m: M(0.055, 0.015, 0.0035), c: OC.white, tag: 2 },
      { g: new T.CircleGeometry(0.024, 5), m: M(-0.05, 0.01, 0.007), c: OC.eye }, { g: new T.CircleGeometry(0.024, 5), m: M(0.06, 0.01, 0.007), c: OC.eye }])), basicV);
    salC.castShadow = false; salC.visible = false; salG.add(salC);   /* 유리 면 · 빛줄기 앞, 틀 앞면 뒤 (유리 면에 그린 그림처럼) — 틀이 가장자리를 가린다 */
    var salE = new T.Mesh(keep(mergeParts([
      { g: new T.CylinderGeometry(0.30, 0.27, SALC.th, 12, 1, true), m: M(0, SALC.th / 2, 0), c: W[5], tag: 1 },        /* 대야 몸 (r 0.30, 테 높이 0.18) — 바닥 널(W3/W4)보다 밝은 나무라 바닥과 갈린다 (밤엔 한 칸 더 밝게: salNight) */
      { g: new T.CylinderGeometry(0.302, 0.298, 0.03, 12, 1, true), m: M(0, 0.135, 0), c: W[1] },               /* 테 띠 2 (어두운 띠) */
      { g: new T.CylinderGeometry(0.284, 0.28, 0.03, 12, 1, true), m: M(0, 0.045, 0), c: W[1] },
      { g: new T.RingGeometry(0.255, 0.302, 12), m: M(0, SALC.th, 0, -Math.PI / 2, 0, 0), c: W[6], tag: 3 },            /* 테 윗면 (밝게 — 밤 등불 아래에서도 테가 읽힌다) */
      { g: new T.CircleGeometry(0.29, 12), m: M(0, SALC.wy - 0.006, 0, -Math.PI / 2, 0, 0), c: W[3] }])), lambert);   /* 안쪽 바닥 (첫 칸부터 맑은 물이 덮는다 · 먼 쪽 테 안쪽 틈도 덮는다) */
    salE.castShadow = false; salE.visible = false; salE.position.set(SALC.tx, 0, SALC.tz); salG.add(salE);
    var salF = new T.Mesh(keep(mergeParts([
      { g: new T.RingGeometry(0.224, 0.262, 12), m: M(0, 0, 0, -Math.PI / 2, 0, 0), c: '#ffffff', tag: 1 },          /* 1px 어두운 테 */
      { g: new T.CircleGeometry(0.225, 12), m: M(0, 0.0005, 0, -Math.PI / 2, 0, 0), c: '#ffffff', tag: 2 },           /* 물 */
      { g: new T.CircleGeometry(0.045, 6), m: M(-0.11, 0.001, 0.02, -Math.PI / 2, 0, 0), c: '#ffffff', tag: 3 }])), basicV);   /* 반짝 (화면 왼쪽 위) */
    salF.castShadow = false; salF.visible = false; salF.position.set(SALC.tx, SALC.wy, SALC.tz); salG.add(salF);
    var SPL_N = 8, salGGeo = new T.BufferGeometry();
    ['position', 'normal', 'color'].forEach(function (a) { salGGeo.setAttribute(a, new T.Float32BufferAttribute(new Float32Array(SPL_N * 36), 3)); });
    var salS = new T.Mesh(keep(salGGeo), basicV); salS.castShadow = false; salS.frustumCulled = false; salS.visible = false; salG.add(salS);   /* 물보라 방울 8 (카메라를 보는 십자 두 판 = 둥근 방울, 칸마다 다시 쓴다) */
    addProp('salon', salG);
    var SAL = { open: false, offer: -1, offerHex: null, offerT: -1, active: '', q: [], cur: null, done: null, beat: '', hex: null, idx: -1, joy: false, look: false, colored: false, onBeat: null,
      body: null, lookAt: null, tint: null, spark: 0, night: null, water: null, waterKey: '', tubF: 0, reflHex: null, bottleHex: SAL_HEX.concat([SAL_HEX[0]]), put: [], bp: new T.Vector3(), was: false, palKey: '' };
    var SAL_BOX = new T.Box3(new T.Vector3(SALC.x - 0.36, SALC.sy - 0.14, SALC.wz), new T.Vector3(SALC.x + 0.36, SALC.yc + SALC.ro, SALC.wz + 0.13));   /* 누르는 곳 = 거울 + 병 선반의 투영 상자 (salG 좌표 = 월드) */
    var SAL_EXTRA_DAY = [SAL_HEX[2], hueHex(SAL_HEX[4], 6)], SAL_EXTRA_NIGHT = SAL_EXTRA_DAY.concat([ramp(SAL_HEX[4], 3)[0]]);
    /* 팔레트 덧칸 (코너가 보일 때만): 스냅 뒤 색상이 25° 넘게 틀어지는 프리셋만 — 잰 값 (Apollo · 몸 빨강, 병 가운데 아트px): 보라 39° → 보라 그대로 한 칸,
       초록 47° → 초록을 OKLab 색상 6° 청록 쪽으로 돌린 한 칸 (#41a971: 병·물 11°). 그냥 초록 #4fa868 이나 그 밤 톤은 낮 다락 화분·이끼의 올리브 픽셀을 훔친다 (청록 점).
       밤(em ≥ 0.9)에만 초록의 밤 톤(물 · 병 한 칸 어둡게)을 더한다 — 밤엔 화분이 그 칸으로 안 간다. 덧칸은 디더 진폭에 안 들어간다 (buildPalette).
       T6 이 6색 × 낮·밤 색상과 '코너를 켜도 코너 밖 픽셀 0 개 바뀜'을 잰다. Apollo 51 + 2 (밤 3) ≤ PAL_MAX */
    var _sm4 = new T.Matrix4(), _sq4 = new T.Quaternion(), _se3 = new T.Euler(), _sv3 = new T.Vector3(), _ss3 = new T.Vector3(), _sn3 = new T.Matrix3(),
      _sp3 = new T.Vector3(), _sa3 = new T.Vector3(), _sb3 = new T.Vector3(), _st3 = new T.Vector3(), _so3 = new T.Vector3(), _sl3 = new T.Vector3(), _cam3 = new T.Vector3();
    function salNorm(h) { h = String(h || '').toLowerCase(); return /^#[0-9a-f]{6}$/.test(h) ? h : null; }
    function salIndex(hex) { var i = SAL_HEX.indexOf(hex); return i >= 0 ? i : 6; }   /* 프리셋이 아니면 '처음 색' 병 */
    function salHome(i) { return i < 6 ? new T.Vector3(snapPos(SALC.x + (i - 2.5) * SALC.gap), SALC.sy, SALC.sz) : new T.Vector3(SALC.cust[0], 0, SALC.cust[1]); }
    function salFront(i) { return salHome(i).add(_so3.set(0, 0, 0.06)); }   /* 내민 병: 제 칸에서 z +0.06 앞으로 */
    function salRim() { return new T.Vector3(SALC.tx, SALC.th, SALC.tz - 0.28); }   /* 대야 먼 쪽 테 위 (기울이면 대야 가운데로 붓는다) */
    function salDark(hex, n) { return n ? ramp(hex, 3)[0] : hex; }   /* 밤 = 한 칸 어둡게 (장면 램프 한 칸) */
    function salGlass(n) { return n ? [PAL.navy[0], PAL.navy[2], PAL.glass[0]] : [PAL.glass[1], PAL.glass[2], PAL.white]; }   /* [유리 테, 유리 면, 빛줄기] — 밤엔 남색 (거울은 빛 안 타는 넓은 면이라 밝으면 밤에 둘째 창처럼 뜬다: 진짜 창 유리 #253a5e 보다 어둡게 #172038) */
    function salPut(i, p, tilt, show) {   /* 병 i 를 바닥 가운데 p 에 다시 쓴다 · tilt = +z 쪽(대야 가운데 쪽)으로 기울기 · show false = 한 점에 접어 숨김 ('처음 색' 병의 평소) */
      tilt = tilt || 0; show = show !== false;
      var key = show ? p.x.toFixed(4) + ',' + p.y.toFixed(4) + ',' + p.z.toFixed(4) + ',' + tilt.toFixed(3) : 'off';
      if (SAL.put[i] === key) return; SAL.put[i] = key;
      var pos = salBGeo.attributes.position, nor = salBGeo.attributes.normal, a = pos.array, na = nor.array, list = salIdx.bottle[i], j, v;
      if (!show) { for (j = 0; j < list.length; j++) { v = list[j] * 3; a[v] = SALC.x; a[v + 1] = SALC.sy; a[v + 2] = SALC.wz; } pos.needsUpdate = true; return; }
      _sm4.compose(p, _sq4.setFromEuler(_se3.set(tilt, 0, 0)), _ss3.set(1, 1, 1)); _sn3.getNormalMatrix(_sm4);
      for (j = 0; j < list.length; j++) {
        v = list[j] * 3;
        _sv3.set(salBase[v], salBase[v + 1], salBase[v + 2]).applyMatrix4(_sm4); a[v] = _sv3.x; a[v + 1] = _sv3.y; a[v + 2] = _sv3.z;
        _sv3.set(salBaseN[v], salBaseN[v + 1], salBaseN[v + 2]).applyMatrix3(_sn3).normalize(); na[v] = _sv3.x; na[v + 1] = _sv3.y; na[v + 2] = _sv3.z;
      }
      pos.needsUpdate = true; nor.needsUpdate = true;
    }
    function salBottleHome() { for (var i = 0; i < 7; i++) salPut(i, salHome(i), 0, i < 6); }
    function salBottleAt(p, tilt) {   /* 연출 중인 병 (SAL.idx): 화면 픽셀 격자에 스냅해서 쓰고, 눈은 그 병을 따른다 (문어가 뛰기 전까지) */
      SAL.bp.copy(p); salPut(SAL.idx, snapScreen(_sb3.copy(p)), tilt || 0, true);
      if (SAL.beat !== 'jump') SAL.lookAt = (SAL.lookAt || new T.Vector3()).copy(p).add(_sa3.set(0, 0.07, 0));
    }
    function salOfferReset() { salBottleHome(); SAL.offer = -1; SAL.offerHex = null; SAL.offerT = -1; }
    function salSpark(p) {   /* 1px 반짝: 카메라를 보는 아트 픽셀 한 칸 (p = 월드 점 · null = 숨김) */
      var a = salBGeo.attributes.position.array, list = salIdx.spark, h = S.pw / 2, j, v;
      if (p) snapC(_sp3.copy(p));
      for (j = 0; j < list.length; j++) {
        v = list[j] * 3;
        if (!p) { a[v] = SALC.x; a[v + 1] = SALC.sy; a[v + 2] = SALC.wz; continue; }
        var bx = salBase[v] < 0 ? -h : h, by = salBase[v + 1] < 0 ? -h : h;
        a[v] = _sp3.x + _r.x * bx + _u.x * by; a[v + 1] = _sp3.y + _r.y * bx + _u.y * by; a[v + 2] = _sp3.z + _r.z * bx + _u.z * by;
      }
      salBGeo.attributes.position.needsUpdate = true;
    }
    salBottleHome(); salSpark(null);   /* 처음: 병 6 제자리 · '처음 색' 병과 반짝은 한 점에 접어 둔다 */
    var SPL_C = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
    function salSplash(drops) {   /* 물보라 방울 8: 카메라를 보는 십자 두 판 (n × n−2 + n−2 × n — 네모가 아니라 둥근 방울, 외곽선이 테만 두른다 · 가운데 = 아트 픽셀 중심 · n 홀수 px) — drops = [[x, y, z, 크기 m, hex], …] · 없으면 숨김 */
      salS.visible = !!(drops && drops.length);
      if (!salS.visible) return;
      var pa = salGGeo.attributes.position.array, na = salGGeo.attributes.normal.array, ca = salGGeo.attributes.color.array;
      _cam3.crossVectors(_r, _u).normalize();
      for (var j = 0; j < SPL_N; j++) {
        var d = drops[j], o = j * 36, q;
        if (!d) { for (q = 0; q < 36; q++) pa[o + q] = 0; continue; }
        var n = Math.max(1, Math.round(d[3] / S.pw)); if (!(n & 1)) n++;
        var hb = n * S.pw / 2, hs = Math.max(1, n - 2) * S.pw / 2, c = C(d[4]);
        snapC(_sp3.set(d[0], d[1], d[2]));
        for (var v = 0; v < 12; v++) {
          var wide = v < 6, bx = SPL_C[v % 6][0] * (wide ? hb : hs), by = SPL_C[v % 6][1] * (wide ? hs : hb), w = o + v * 3;
          pa[w] = _sp3.x + _r.x * bx + _u.x * by; pa[w + 1] = _sp3.y + _r.y * bx + _u.y * by; pa[w + 2] = _sp3.z + _r.z * bx + _u.z * by;
          na[w] = _cam3.x; na[w + 1] = _cam3.y; na[w + 2] = _cam3.z; ca[w] = c.r; ca[w + 1] = c.g; ca[w + 2] = c.b;
        }
      }
      salGGeo.attributes.position.needsUpdate = true; salGGeo.attributes.normal.needsUpdate = true; salGGeo.attributes.color.needsUpdate = true;
    }
    function salTub(f) {   /* 대야: 0 없음 · 1 놓이는 첫 칸 (2px 위) · 2 닿는 칸 (쿵 — 눌림) · 3 쉬는 자리 */
      var on = f > 0, was = salE.visible;
      SAL.tubF = f; salE.visible = on;
      if (on) { salE.position.set(SALC.tx, f === 1 ? 2 * pxUp() : 0, SALC.tz); salE.scale.set(f === 2 ? 1.04 : 1, f === 2 ? 0.9 : 1, f === 2 ? 1.04 : 1); }
      salF.position.y = SALC.wy * (f === 2 ? 0.9 : 1) + (f === 1 ? 2 * pxUp() : 0);   /* 첫 칸은 대야와 같이 2px 위 */
      salWaterPaint();
      if (on !== was) rebuildDecals();
    }
    function salWaterTones(hex, n) { var r = ramp(hex, 3); return n ? [ramp(r[0], 3)[0], r[0], r[1]] : r; }   /* [테 (한 칸 어둡게), 물, 반짝] — 밤엔 셋 다 한 칸 어둡게 */
    function salWater(k, s) {   /* k: null = 물 없음 · 0 = 맑은 물 · 1 = 내민 색 (사이 = 물드는 칸) · s = 빠지는 배율 (1 = 가득) */
      SAL.water = k == null ? null : { k: clamp(k, 0, 1), s: s == null ? 1 : s };
      salWaterPaint();
    }
    function salWaterPaint() {
      var w = SAL.water;
      salF.visible = !!w && salE.visible && SAL.tubF >= 1 && w.s > 0;   /* 놓이는 첫 칸부터 맑은 물 (빈 대야 안이 검은 구멍처럼 보이지 않게) */
      if (!w) return;
      var n = !!SAL.night, clr = n ? [PAL.glass[0], PAL.glass[1], PAL.glass[2]] : [PAL.glass[1], PAL.glass[2], PAL.glass[3]], tgt = SAL.hex ? salWaterTones(SAL.hex, n) : clr, key = w.k.toFixed(3) + n + SAL.hex;
      if (SAL.waterKey !== key) { SAL.waterKey = key; for (var t = 0; t < 3; t++) recolor(salF.geometry, t + 1, w.k >= 1 ? tgt[t] : w.k <= 0 ? clr[t] : mixHex(clr[t], tgt[t], w.k)); }
      salF.scale.set(w.s, 1, w.s);
    }
    function salNight(force) {   /* 밤(시각대 em ≥ 0.9 — 노을 0.8 · 밤 1)이면 유리·병·코르크·물·거울 속 문어를 한 칸 어둡게. 바뀔 때만 다시 칠한다 */
      var n = (light.em == null ? 1 : light.em) >= 0.9;
      if (n === SAL.night && !force) return;
      SAL.night = n;
      salPalette();   /* 밤 덧칸 (초록 밤 톤) 넣기 · 빼기 */
      var g = salGlass(n); recolor(salBGeo, 2, g[0]); recolor(salBGeo, 3, g[1]); recolor(salBGeo, 4, g[2]);
      for (var i = 0; i < 7; i++) { recolor(salBGeo, 10 + i, salDark(SAL.bottleHex[i], n)); recolor(salBGeo, 20 + i, n ? W[2] : W[3]); }
      recolor(salE.geometry, 1, n ? W[7] : W[5]); recolor(salE.geometry, 3, n ? W[7] : W[6]);   /* 대야는 빛을 타는 나무라 밤엔 거꾸로 밝은 칸으로 (검은 솥처럼 보이지 않게) */
      recolor(salC.geometry, 2, salDark(OC.white, n));
      SAL.reflHex = null; salReflColor((oct && oct.curHex) || st.color);
      SAL.waterKey = ''; salWaterPaint();
    }
    function salReflColor(hex) {   /* 거울 속 문어 몸색 = 지금 보이는 몸색을 유리 면 쪽으로 25 % (밤엔 몸색 램프 한 칸 아래) — octColor 가 문어 몸을 칠할 때마다 같이 */
      if (!salG.visible) { SAL.reflHex = null; return; }
      hex = hex || st.color;
      var n = !!SAL.night, key = hex + n;
      if (SAL.reflHex === key) return; SAL.reflHex = key;
      recolor(salC.geometry, 1, n ? ramp(hex, 5, 0.09, [0.004, 0.014])[1] : mixHex(hex, PAL.glass[2], 0.25));   /* 밤 = 문어 램프 한 칸 아래 (팔레트에 있는 색이라 디더 체크가 안 생긴다) */
    }
    function salSnapWall(v) {   /* 뒷벽에 붙은 점을 화면 아트 픽셀 격자에 — z 는 그대로 두고 x·y 만 (유리 면 · 빛줄기와의 앞뒤를 지킨다) */
      var pw = S.pw, ex = v.dot(_r), ey = v.dot(_u), cr = Math.round(ex / pw) * pw - ex, cu = Math.round(ey / pw) * pw - ey;
      var dx = Math.abs(_r.x) > 1e-3 ? cr / _r.x : 0, dy = Math.abs(_u.y) > 1e-3 ? (cu - dx * _u.x) / _u.y : 0;
      v.x += dx; v.y += dy; return v;
    }
    function salReflect() {   /* 거울 속 문어: 문어가 거울 앞 점 1.2 m 안이면 보인다 · x 는 문어 x 를 반만 따라 ±0.08 안 (스펙 상한 ±0.12 — r 0.14 원이 유리 0.44 안에 다 들게) · 폴짝도 반만 */
      var on = salG.visible && octG.visible && st.octState !== 'away' && PLACE.vis === 'loft' && octUp() && Math.hypot(oct.pos.x - SALC.fx, oct.pos.z - SALC.fz) < SALC.near;
      if (salC.visible !== on) { salC.visible = on; if (on) { SAL.reflHex = null; salReflColor(oct.curHex || st.color); } }
      if (!on) return;
      _sv3.set(SALC.x + clamp((oct.pos.x - SALC.x) * 0.5, -0.08, 0.08), SALC.cy + bodyG.position.y * OCT_R * 0.5, SALC.wz + 0.041);
      salC.position.copy(salSnapWall(_sv3));
    }
    function salOctCentre(out) { return octG.getWorldPosition(out).add(_sa3.set(0, 0.42, 0)); }   /* 문어 몸 가운데 (머리 중심 0.39 m 남짓) */
    function salYawTo(x, z, lim) { var y = Math.atan2(x - oct.pos.x, z - oct.pos.z), c = camYaw(); return lim ? c + clamp(angDiff(y, c), -lim, lim) : y; }   /* lim = 카메라 쪽에서 벗어날 수 있는 각 (얼굴이 늘 보이게) */
    function salDrop(o, ox, oy, size, hex) { var p = _st3.copy(o).addScaledVector(_r, ox).addScaledVector(_u, oy).addScaledVector(_cam3, 0.5); return [p.x, p.y, p.z, size, hex]; }   /* 화면 축 오프셋 + 카메라 쪽 0.5 m (몸 앞에 그려진다) */
    var SPL_COVER = [[-0.20, 0.14], [0.0, 0.22], [0.20, 0.12], [-0.25, -0.06], [-0.04, 0.04], [0.19, -0.08], [0.05, -0.17], [-0.14, -0.22]];
    function salSplashFrame(f) {   /* 첨벙 4칸 @12 fps: 0 대야에서 솟음 · 1 몸을 덮음 (이 칸에서 색이 바뀐다) · 2 미끄러져 내림 · 3 발치에 떨어짐 */
      var O = salOctCentre(_so3), n = !!SAL.night, base = salDark(SAL.hex, n), lite = salDark(mixHex(SAL.hex, '#ffffff', 0.35), n), d = [], j;
      _cam3.crossVectors(_r, _u).normalize();
      if (f === 0) {
        _sl3.set(SALC.tx, SALC.th + 0.06, SALC.tz);
        for (j = 0; j < 6; j++) { var t = 0.22 + 0.13 * (j >> 1); _sb3.copy(_sl3).lerp(O, t); _sb3.y += 0.3 * Math.sin(Math.PI * t); d.push(salDrop(_sb3, (j & 1) ? 0.07 : -0.07, 0, 0.11, (j & 1) ? lite : base)); }
      } else {
        var sc = [0, 1, 1.25, 1.5][f], dy = [0, 0, -0.1, -0.32][f], sz = [0, 0.19, 0.15, 0.04][f];
        for (j = 0; j < SPL_COVER.length; j++) { if (f === 3 && j > 5) break; var cv = SPL_COVER[j]; d.push(salDrop(O, cv[0] * sc, cv[1] * sc + dy, f === 2 && (j & 1) ? 0.11 : sz, (j & 1) ? lite : base)); }
      }
      salSplash(d);
    }
    function salShakeFrame(f) {   /* 털기: 새 색 물방울 2칸 (몸 둘레 → 더 멀리·아래로) · 2 = 없음 */
      if (f > 1) { salSplash(null); return; }
      var O = salOctCentre(_so3), base = salDark(SAL.hex, !!SAL.night), d = [], R0 = f ? 0.62 : 0.48, ys = f ? [0.12, -0.06, -0.26] : [0.22, 0.04, -0.14];
      _cam3.crossVectors(_r, _u).normalize();
      [-1, 1].forEach(function (s) { ys.forEach(function (y) { d.push(salDrop(O, s * R0, y, f ? 0.04 : 0.11, base)); }); });
      salSplash(d);
    }
    function salEmit(ev) { emit('salon', ev); if (typeof SAL.onBeat === 'function') { try { SAL.onBeat(ev); } catch (e) { console.error('[scene3d] salon onBeat', e); } } }   /* 소리·반짝은 앱 몫 (AUDIO.on('salon', …) · UIART) */
    function salApplyColor(skipped) { if (SAL.colored || !SAL.hex) return; SAL.colored = true; SAL.tint = null; setColor(SAL.hex, { still: true }); salEmit({ act: 'done', color: SAL.hex, joy: SAL.joy, skipped: !!skipped }); }
    function salItem(name, dur, start, update, end) { return { name: name, dur: Math.max(0, dur || 0), start: start, update: update, end: end, t: 0 }; }
    function salCut() { return !ready || ctxLost() || !!st.hidden || !!st.offscreen || PLACE.vis !== 'loft' || !!PLACE.trans || !salG.visible; }   /* 프레임이 안 돌거나 코너가 안 보인다 → 연출 없이 끝 상태로 (Promise 가 걸리지 않게) */
    function salRun(kind, items, o) {
      SAL.active = kind; SAL.q = items; SAL.cur = null; SAL.beat = ''; SAL.onBeat = o && o.onBeat; dither.still = 0;
      var p = new Promise(function (res) { SAL.done = res; });
      if (salCut()) salFinishNow();
      return p;
    }
    function salDone(skipped) {
      var d = SAL.done; SAL.done = null;
      SAL.active = ''; SAL.q = []; SAL.cur = null; SAL.beat = ''; SAL.body = null; SAL.tint = null; SAL.onBeat = null; if (SAL.offer < 0) SAL.lookAt = null; dither.still = 0;
      if (d) d({ ok: true, skipped: !!skipped, color: st.color });
    }
    function salFinishNow() {   /* 남은 연출을 한 번에 감는다: ('바꾸기'면) 새 색 · 대야·물·물보라 치움 · 병 제자리 · 몸 층 없음 · 카메라 쪽으로 → Promise 는 skipped 로 풀린다 */
      var was = SAL.active;
      if (!was && SAL.offer < 0 && !salE.visible && !salS.visible) { SAL.lookAt = null; return; }   /* 할 것 없음 (디더 쉼을 건드리지 않는다) */
      if (was === 'dye') salApplyColor(true);
      salTub(0); salWater(null); salSplash(null); salSpark(null); SAL.spark = 0;
      salOfferReset(); SAL.lookAt = null;
      if (was) oct.wantYaw = camYaw();
      salDone(!!was);
    }
    function stepSalon(dt) {
      if (SAL.active && salCut()) salFinishNow();
      var dt0 = dt;
      for (var guard = 0; SAL.active && guard < 32; guard++) {
        if (!SAL.cur) {
          if (!SAL.q.length) { salDone(false); break; }
          SAL.cur = SAL.q.shift(); SAL.cur.t = 0; SAL.beat = SAL.cur.name; if (SAL.cur.start) SAL.cur.start();
        }
        var c = SAL.cur; c.t += dt;
        if (c.update) c.update(c.dur > 0 ? Math.min(1, c.t / c.dur) : 1, Math.min(c.t, c.dur));
        if (c.t + 1e-9 < c.dur) break;
        dt = c.t - c.dur; if (c.end) c.end(); SAL.cur = null;
      }
      if (SAL.offerT >= 0 && SAL.offer >= 0 && !SAL.active) {   /* 내밀기 2칸 @12 fps: 반쯤 + 1px 위 → 앞 (모션 줄이기면 바로 앞) */
        SAL.offerT += dt0; var f1 = st.reduced || SAL.offerT >= 1 / 12;
        salPut(SAL.offer, f1 ? salFront(SAL.offer) : salFront(SAL.offer).add(_sa3.set(0, pxUp(), -0.03)), 0, true);
        if (f1) SAL.offerT = -1;
      }
      if (SAL.spark > 0) { SAL.spark -= dt0; if (SAL.spark <= 0) salSpark(null); }
      salReflect();
    }
    function salLookClient() {   /* 눈이 따라갈 점 (클라이언트 px) — 내민 병 · 연출 중 병 (≤ 100 ms: 동공은 stepOct 의 dt·10 접근) */
      if (!SAL.lookAt || !salG.visible || PLACE.vis !== 'loft') return null;
      _sl3.copy(SAL.lookAt).project(camera); var r = canvas.getBoundingClientRect();
      return { x: r.left + (_sl3.x * 0.5 + 0.5) * S.cw, y: r.top + (1 - (_sl3.y * 0.5 + 0.5)) * S.ch };
    }
    function salonOffer(hex) {   /* 병 하나가 선반 제 칸에서 앞으로 (null = 제자리로). 몸은 그대로, 눈만 그 병으로 · 기록 없음 */
      hex = salNorm(hex);
      if (SAL.active) return SAL.offerHex;   /* 연출 중엔 안 받는다 (앱이 시트를 닫아 둔다) */
      var i = hex ? salIndex(hex) : -1;
      if (i === SAL.offer && hex === SAL.offerHex) return hex;
      salOfferReset(); salSpark(null); SAL.spark = 0;
      if (i < 0) { SAL.lookAt = null; dither.still = 0; return null; }
      if (i === 6) { SAL.bottleHex[6] = hex; recolor(salBGeo, 16, salDark(hex, SAL.night)); }
      SAL.offer = i; SAL.offerHex = hex; SAL.offerT = 0;
      salPut(i, st.reduced ? salFront(i) : salFront(i).add(_sa3.set(0, pxUp(), -0.03)), 0, true);
      SAL.lookAt = salFront(i).add(_sa3.set(0, 0.07, 0));
      if (salG.visible) { salSpark(salFront(i).add(_sa3.set(0, 0.18, 0)).addScaledVector(_r, 0.06).addScaledVector(_cam3.crossVectors(_r, _u).normalize(), 0.12)); SAL.spark = 4 / 12; }   /* 반짝 4칸 @12 fps (폰에서 2칸은 놓친다) */
      dither.still = 0;
      return hex;
    }
    function salClearView() {   /* 11-11 (검증 P2): '바꾸기' 가 시작될 때 내 캐릭터가 문어 · 대야와 카메라 사이에 서 있으면 (화면 가로로 0.64 m 안 · 카메라 쪽) 옆 구경 자리로 걸어 비켜선다 — 물보라와 색이 바뀌는 순간이 내 캐릭터 뒤에 가리지 않게. 스틱을 쥐고 있거나 걷는 중 · 앉은 중엔 안 한다 */
      if (PL.place !== 'loft' || !LROOM || plG.parent !== LROOM.g || PL.walking || PL_IN.held || PL.sit) return;
      var px = PL.pos.x, pz = PL.pos.z;
      function hides(ax, az) { return Math.abs((px - pz) - (ax - az)) < 0.9 && (px + pz) - (ax + az) > -0.2; }
      if (!hides(SALC.fx + LSAL.dx, ANCHORS.salon[2] + LSAL.dz) && !hides(ANCHORS.salon[0] + LSAL.dx, ANCHORS.salon[2] + LSAL.dz) && !hides(SALC.tx + LSAL.dx, SALC.tz + LSAL.dz)) return;
      plWalkTo(new T.Vector3(snapPos(0.35), 0, snapPos(-0.85)), -Math.PI * 0.75);
    }
    function salonDye(hex, o) {   /* '바꾸기' 연출 → Promise ({ ok, skipped, color }). 문어는 이미 'salon' 자리 (걷기는 앱 몫). o = { joy, look, pause | id, onBeat } */
      o = o || {}; hex = salNorm(hex);
      if (!hex) return Promise.resolve({ ok: false, reason: 'hex', color: st.color });
      if (SAL.active) salFinishNow();
      salClearView();
      var i = salIndex(hex), sp = st.speed, red = st.reduced, from = SAL.offer === i ? salFront(i) : salHome(i), rim = salRim(), home = salHome(i), items = [];
      var pause = o.pause > 0 ? +o.pause : o.id != null ? 0.3 + (hash(String(o.id)) % 1000) / 1000 * 0.3 : 0.45;   /* 멈춤 0.3–0.6 s (물음 id 시드) */
      if (i === 6) { SAL.bottleHex[6] = hex; recolor(salBGeo, 16, salDark(hex, SAL.night)); }
      SAL.hex = hex; SAL.idx = i; SAL.joy = !!o.joy; SAL.look = !!o.look; SAL.colored = false; SAL.offerT = -1; SAL.spark = 0; salSpark(null);
      salPut(i, from, 0, true); SAL.bp.copy(from);
      if (!red) {
        items.push(salItem('tub', 2 / 12 * sp, function () { salTub(1); salWater(0); salEmit({ act: 'tub', on: true }); }, function (k) { salTub(k >= 0.5 ? 2 : 1); }, function () { salTub(3); }));
        items.push(salItem('bottle', 0.3 * sp, null, function (k) { salBottleAt(_sp3.copy(from).lerp(rim, k).add(_sa3.set(0, 0.22 * Math.sin(Math.PI * k), 0)), 0); }, function () { salBottleAt(rim, 0); }));
        items.push(salItem('pause', pause * sp));
        items.push(salItem('pour', 0.5 * sp, function () { salEmit({ act: 'pour' }); }, function (k) { var f = Math.min(5, Math.floor(k * 6 + 1e-6)); salBottleAt(rim, [0.52, 1.05, 1.66, 1.66, 1.66, 1.66][f]); salWater(f < 3 ? 0 : (f - 2) / 3); }, function () { salWater(1); }));
        items.push(salItem('jump', 0.5 * sp, function () { oct.wantYaw = salYawTo(SALC.tx, SALC.tz, 40 * DEG); SAL.lookAt = null; }, function (k, t) {   /* 대야 쪽으로 돌기 (카메라 ±40° 안) · 예비 120 ms · 제자리 폴짝 (꼭대기 0.3 r, 대야 쪽 ≤ 8°) */
          var a = 0.2 * sp, b = 0.32 * sp, e = 0.5 * sp;
          if (t < a) SAL.body = null;
          else if (t < b) SAL.body = { sx: 1.04, sy: 0.92, by: 0, lean: -3 * DEG };
          else { var u = clamp((t - b) / Math.max(1e-6, e - b), 0, 1), s = Math.sin(Math.PI * u); SAL.body = { sx: 1 - 0.03 * s, sy: 1 + 0.05 * s, by: 0.3 * s, lean: 8 * DEG * s }; }
        }, function () { SAL.body = null; }));
        items.push(salItem('splash', 4 / 12 * sp, function () { salEmit({ act: 'splash' }); salSplashFrame(0); }, function (k) { var f = Math.min(3, Math.floor(k * 4 + 1e-6)); salSplashFrame(f); if (f >= 1) salApplyColor(); }, function () { salApplyColor(); salSplash(null); }));
        items.push(salItem('shake', 0.4 * sp, function () { oct.wiggle = 0.7; salBottleAt(rim, 0); salShakeFrame(0); }, function (k, t) { salShakeFrame(t < sp / 12 ? 0 : t < 2 * sp / 12 ? 1 : 2); }, function () { salSplash(null); }));
        if (SAL.joy) items.push(salItem('joy', 0.9 * sp, function () { setExpression('happy'); salEmit({ act: 'joy' }); }));   /* 고른 이의 표정이 happy 일 때만: 기본 폴짝 2번 (반짝은 앱이 UIART 로) */
        if (SAL.look) items.push(salItem('look', 0.9 * sp, function () { oct.wantYaw = salYawTo(SALC.x, SALC.wz, 0); }));   /* 거울 보기: 몸을 거울 쪽으로 0.3 s + 멈춤 0.6 s */
        items.push(salItem('drain', 0.3 * sp, function () { salEmit({ act: 'drain' }); oct.wantYaw = camYaw(); SAL.lookAt = null; }, function (k) {
          var f = Math.min(2, Math.floor(k * 3 + 1e-6)); salWater(1, [0.7, 0.4, 0.15][f]);
          SAL.idx = i; SAL.bp.copy(rim).lerp(home, k).add(_sa3.set(0, 0.22 * Math.sin(Math.PI * k), 0)); salPut(i, snapScreen(_sb3.copy(SAL.bp)), 0, true);
        }, function () { salWater(null); salTub(0); salBottleHome(); salEmit({ act: 'tub', on: false }); }));
      } else {   /* 모션 줄이기: 움직임 없이 칸만 (대야 1칸 · 멈춤 0.2 · 붓기 1칸 · 색 2칸 교차 150 ms 씩 · 거울 보기는 멈춤 0.6 s 만 · 치우기 1칸) — 리듬은 남긴다 */
        items.push(salItem('tub', 1 / 12 * sp, function () { salTub(3); salWater(0); salBottleAt(rim, 0); salEmit({ act: 'tub', on: true }); }));
        items.push(salItem('pause', 0.2 * sp));
        items.push(salItem('pour', 1 / 12 * sp, function () { salEmit({ act: 'pour' }); salBottleAt(rim, 1.66); salWater(1); SAL.lookAt = null; }));
        items.push(salItem('splash', 0.3 * sp, function () { salEmit({ act: 'splash' }); SAL.tint = mixHex(st.color, hex, 0.5); }, function (k) { if (k >= 0.5) salApplyColor(); }, function () { salApplyColor(); }));
        if (SAL.joy) items.push(salItem('joy', 0, function () { setExpression('happy'); salEmit({ act: 'joy' }); }));
        if (SAL.look) items.push(salItem('look', 0.6 * sp));
        items.push(salItem('drain', 1 / 12 * sp, function () { salEmit({ act: 'drain' }); salWater(null); salBottleHome(); }, null, function () { salTub(0); salEmit({ act: 'tub', on: false }); }));
      }
      items.push(salItem('end', 0, function () { SAL.offer = -1; SAL.offerHex = null; SAL.lookAt = null; }));
      return salRun('dye', items, o);
    }
    function salonKeep(o) {   /* '그대로': 병이 선반 제자리로 (0.3 s) → 몸을 카메라 쪽으로 (0.3 s). 시무룩·고개 숙임·징글 없음 (얼굴은 앱이 고른 이의 expr 로) */
      o = o || {};
      if (SAL.active) salFinishNow();
      var i = SAL.offer, sp = st.speed, items = [];
      items.push(salItem('back', st.reduced ? 0 : 0.3 * sp, null, function (k) { if (i >= 0) salPut(i, k < 0.5 ? salFront(i).add(_sa3.set(0, 0, -0.03)) : salHome(i), 0, i < 6 || k < 0.5); }, function () { salOfferReset(); SAL.lookAt = null; }));
      items.push(salItem('turn', 0.3 * sp, function () { oct.wantYaw = camYaw(); }));
      return salRun('keep', items, o);
    }
    function setSalonOpen(on) { SAL.open = !!on; spotLast.salon = null; if (ready) updateSpots(); return SAL.open; }   /* 앱이 허락할 때만 미용실 단추가 'over' (자는 중 · 산책 · 연출 중이면 앱이 false) */
    function salExtra() { return salG.visible ? (SAL.night ? SAL_EXTRA_NIGHT : SAL_EXTRA_DAY) : []; }
    function salPalette() {   /* 덧칸이 바뀔 때만 팔레트를 다시 (코너가 나타남 · 사라짐 · 밤 ↔ 낮) */
      var k = salExtra().join(',');
      if (k === SAL.palKey) return;
      SAL.palKey = k; PAL = buildPalette(st.color, st.palette, salExtra()); uploadPalette(); ditherBase(); portraitFlush();
    }
    function salItemsChanged() {   /* 코너가 나타나거나 사라짐: 팔레트 덧칸 · 걸린 연출 마무리 · 밤 색 · 단추 */
      var vis = salG.visible;
      if (vis === SAL.was) return;
      SAL.was = vis;
      if (!vis) { if (SAL.active) salFinishNow(); salOfferReset(); SAL.lookAt = null; }
      salNight(true); spotLast.salon = null;   /* salNight 이 salPalette 를 부른다 */
    }
    function salMotion() { var w = SAL.water; return { visible: salG.visible, open: SAL.open, offer: SAL.offerHex, bottle: SAL.offer, active: SAL.active, beat: SAL.beat, tub: salG.visible && salE.visible, water: !w ? null : w.k >= 1 ? SAL.hex : w.k > 0 ? 'mix' : 'clear', waterK: w ? +w.k.toFixed(3) : 0, splash: salS.visible, reflect: salG.visible && salC.visible, tint: SAL.tint, look: !!SAL.lookAt, extra: salExtra().slice(),
      geom: { x: SALC.x + LSAL.dx, wz: SALC.wz + LSAL.dz, y0: SALC.y0, yc: SALC.yc, ro: SALC.ro, ri: SALC.ri, d: SALC.d, sy: SALC.sy, sz: SALC.sz + LSAL.dz, gap: SALC.gap, tx: SALC.tx + LSAL.dx, tz: SALC.tz + LSAL.dz, wy: SALC.wy, place: 'loft' } }; }   /* 월드 좌표 (위층 뒷벽 — 코너 안 좌표에 LSAL 을 더한 것) */

    /* ── 문어 (§7.1, 절차적 · assets/ref/octopus-ref.png) ──
       로컬 단위 = 머리 반지름 r. OCT_R = 0.42 m (방 폭 5 m 의 8%). 머리 중심 y 0.92, y 찌그림 0.88 → 바닥 틈 0.04 r (= 1.7 cm).
       다리 8 = 바깥·아래로 말리는 테이퍼 사슬(두께 0.38 r → 0.12 r, 길이 ≈ 0.9 r), 끝이 바닥(y=0)에 닿고 살짝 들린다(룩 패스 1). */
    var OCT_R = 0.42, HEAD_Y = 0.92, HEAD_SQ = 0.88;
    var octG = new T.Group(), bodyG = new T.Group(); octG.name = 'oct'; octG.add(bodyG); atticG.add(octG); octG.scale.setScalar(OCT_R);
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
    /* 체크 사라짐·나타남 (INTERIOR_MODE 0단계 · 바깥 가장자리 · 다락 문): FADE.d = 논리 밀도(0 ~ 1, 8단계), FADE.on = 지금 그려지는 값.
       0 < d < 1 동안 ① 섞기 = CustomBlending (구멍은 뒤 색 + 알파 0 표시, 깊이는 온전히 → 잉크 점 없음, 몸끼리 가림 그대로) ② transparent = 불투명 다음에 그린다
       (구멍에 비칠 뒤 장면이 먼저 그려져 있어야 한다) ③ 문어 햇빛 그림자 ④ 접지 그림자(decalMat 은 소품과 공유) — 둘 다 체크 8단계의 **절반(d < 0.5)에서** 꺼지고 켜진다
       (그림자 패스는 체크를 모른다 → 꽉 찬 그림자. 사라지기 첫 칸에 끄면 낮의 긴 그림자가 몸이 다 있을 때 툭 사라졌다 · 0단계 '접지 그림자는 절반에서'). d = 0 이면 octG 를 숨긴다 */
    var WAVE_N = 5, FADE = { d: 1, on: 1, dbg: null }, octCasters = [head].concat(arms), octToon = [], WAVE = { on: false, t: 0, arm: 0 };
    bodyG.traverse(function (o) { if (o.isMesh && o.material === toon) octToon.push(o); });   /* WAVE.arm 0 = 오른쪽 옆다리 (카메라를 보면 화면 오른쪽 = 나가는 쪽) — 머리 옆으로 들려 윤곽 밖에 보인다 */
    /* 문어 코스튬 메시: 머리 반지름 1 단위 (머리 중심 y 0.92 · 꼭대기 ≈ 1.80), bodyG 의 자식이라 숨쉬기 · 찌그러짐 · 걷기를 같이 탄다. 문어 툰 재질 · 태그 0 (setColor 가 다시 칠하지 않는다).
       슬롯마다 메시 하나 (head · back) — 바꿀 때 사라짐(FADE)용 목록(octToon · octCasters)도 같이 고친다 */
    var OCT_WEAR = {
      ribbon: function (L) { var c = '#4a86d8'; L.push({ g: new T.SphereGeometry(0.26, 8, 6), m: M(0.36, 1.78, 0.3, 0, 0, 0.5, 1, 0.75, 0.6), c: c }, { g: new T.SphereGeometry(0.26, 8, 6), m: M(0.78, 1.50, 0.26, 0, 0, 0.5, 1, 0.75, 0.6), c: c }, { g: new T.SphereGeometry(0.13, 6, 5), m: M(0.58, 1.64, 0.34), c: '#f1ede2' }); },   /* 파란 리본 (빨강은 빨간 몸에 묻혔다) */
      beret: function (L) { var c = '#2a3f6a'; L.push({ g: new T.SphereGeometry(0.85, 14, 8, 0, Math.PI * 2, 0, 1.3), m: M(0.08, 1.42, -0.02, 0, 0, -0.2, 1, 0.5, 1), c: c }, { g: new T.SphereGeometry(0.07, 6, 5), m: M(0.0, 1.84, -0.02), c: c }); },
      strawhat: function (L) { var c = '#dcb878'; L.push({ g: new T.CylinderGeometry(1.02, 1.06, 0.07, 16), m: M(0, 1.66, -0.1), c: c }, { g: new T.CylinderGeometry(0.6, 0.72, 0.42, 12), m: M(0, 1.88, -0.1), c: c }, { g: new T.CylinderGeometry(0.73, 0.73, 0.1, 12), m: M(0, 1.74, -0.1), c: '#4a86d8' }); },
      gat: function (L) { var c = '#1b1522', d = '#2a2433'; L.push({ g: new T.CylinderGeometry(1.08, 1.12, 0.05, 18), m: M(0, 1.68, -0.12), c: d }, { g: new T.CylinderGeometry(0.48, 0.55, 0.62, 12), m: M(0, 2.0, -0.12), c: c }, { g: new T.CylinderGeometry(0.56, 0.56, 0.07, 12), m: M(0, 1.74, -0.12), c: '#5a4a6a' }); },   /* 갓: 넓고 얇은 양태 + 높은 대우 + 갓끈 자리 띠 */
      partyhat: function (L) { L.push({ g: new T.ConeGeometry(0.5, 0.95, 10), m: M(0.1, 2.12, 0, 0, 0, -0.12), c: '#4a86d8' }, { g: new T.CylinderGeometry(0.4, 0.46, 0.1, 10), m: M(0.07, 1.78, 0, 0, 0, -0.12), c: '#f0c040' }, { g: new T.SphereGeometry(0.11, 6, 5), m: M(0.16, 2.62, 0), c: '#f0c040' }); },
      paper_crown: function (L) { var c = '#e8a93a'; L.push({ g: new T.CylinderGeometry(0.66, 0.7, 0.26, 12, 1, true), m: M(0, 1.80, 0), c: c }); for (var i = 0; i < 6; i++) { var a = i / 6 * Math.PI * 2; L.push({ g: new T.ConeGeometry(0.16, 0.3, 4), m: M(Math.sin(a) * 0.66, 2.06, Math.cos(a) * 0.66), c: c }); } },
      emperor_cape: function (L) { var c = '#a8232e', g = '#f0c040'; L.push({ g: new T.CylinderGeometry(0.9, 1.25, 1.15, 14, 1, true, Math.PI * 0.5, Math.PI), m: M(0, 0.72, -0.12), c: c }, { g: new T.CylinderGeometry(0.93, 0.93, 0.14, 14, 1, true, Math.PI * 0.42, Math.PI * 1.16), m: M(0, 1.3, -0.1), c: g }); } };
    var octWearM = { head: null, back: null }, octWearId = { head: null, back: null };
    function octWearSlot(slot, id) {
      var old = octWearM[slot];
      if (old) { bodyG.remove(old); [octToon, octCasters].forEach(function (arr) { var k = arr.indexOf(old); if (k >= 0) arr.splice(k, 1); }); if (old.geometry) old.geometry.dispose(); octWearM[slot] = null; }
      octWearId[slot] = null;
      var def = null; COSTUMES.forEach(function (c) { if (c.id === id && c.slot === slot) def = c; });
      if (!def || !OCT_WEAR[id]) return;
      var L = []; OCT_WEAR[id](L);
      var m = new T.Mesh(mergeParts(L), toon); m.castShadow = true; m.receiveShadow = true; m.material.side = toon.side;
      bodyG.add(m); octToon.push(m); octCasters.push(m); octWearM[slot] = m; octWearId[slot] = id;
    }
    function setOctWear(w) { w = w && typeof w === 'object' ? w : {}; ['head', 'back'].forEach(function (sl) { if ((w[sl] || null) !== octWearId[sl]) octWearSlot(sl, w[sl] || null); }); portraitFlush(); dither.still = 0; }
    function octWearNow() { return { head: octWearId.head, back: octWearId.back }; }
    function fadeLook(q) {   /* 그리기 상태만 (밀도 q) */
      var part = q < 1, sh = q >= 0.5; FADE.on = q; OCT_FADE.value = q;
      toon.transparent = part; toon.blending = part ? T.CustomBlending : T.NormalBlending;
      octCasters.forEach(function (m) { m.castShadow = sh; });
      octToon.forEach(function (m) { m.renderOrder = part ? 3 : 0; });   /* 바닥 위 반투명(접지 그림자 1 · 등불 웅덩이 2)보다 뒤에 → 구멍에 비치는 뒤 장면에 그것들이 이미 그려져 있다 (안 그러면 구멍 깊이에 걸려 빠져서 문어 모양 체크 그림자가 남는다). 글로우(5) 앞 */
      if (!sh) octDecal.visible = false;
    }
    function setOctFade(d) {
      var q = Math.round(clamp(d, 0, 1) * 8) / 8, was = FADE.d;
      FADE.d = q; fadeLook(q);
      if (q === 0) { octG.visible = false; octDecal.visible = false; }
      else if (was === 0 && q > 0) octG.visible = true;
      if (q >= 0.5 && was < 0.5) octDecal.visible = octG.visible;   /* 나타날 때 절반에서 접지 그림자 */
    }
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
    function octColor(hex) { octTags.forEach(function (g) { recolor(g, 1, hex); }); salReflColor(hex); }   /* 거울 속 문어도 같이 (미용실 코너가 보일 때만 칠한다) */
    function octLook(O) { recolor(headGeo, 2, O.hi); recolor(headGeo, 3, O.mouth); recolor(blush.geometry, 2, O.hi); arms.forEach(function (m) { recolor(m.geometry, 4, O.pale); }); recolor(blush.geometry, 5, O.blush); recolor(smile.geometry, 3, O.mouth); }   /* 몸색에서 파생된 칠 (하이라이트·입·빨판·홍조) */
    function setColor(hex, o) {   /* o.still = 흔들기 없음 (첫 실행 저장 · 불러오기 · 다른 탭 · 개발용 미리 보기). 흔드는 건 미용실 연출뿐 (그것도 털기 박자에서 따로) */
      if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return;
      st.color = hex; OC = octDerived(hex); PAL = buildPalette(hex, st.palette, salExtra()); uploadPalette();
      octColor(hex); octLook(OC);
      if (!(o && o.still)) oct.wiggle = 0.7;   /* 색을 바꾸면 한 번 흔들 (§14) */
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
      else if (name === 'happy') { face.t = face.hopsLeft > 0 ? face.t % 0.45 : 0; face.hopsLeft = 2; }   /* 다시 happy → 다시 폴짝. 뛰는 중이면 지금 폴짝을 이어서 (예전엔 공중에서 바닥으로 한 프레임에 떨어졌다: 걸기 → happy, 0.62 → 0.10 r) */
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
      uDither: { value: 0 }, uOutline: { value: hasDepthTex ? 1 : 0 }, uHasNormal: { value: 1 }, uVig: { value: 0 }, uSky: { value: 0 }, uStars: { value: 0 }, uSkyOk: { value: new T.Vector3(0, 0, 0) }, uBayer: post.uniforms.uBayer, uKeepAlpha: { value: 1 }, uFade: { value: 0 }, uFadeOk: { value: new T.Vector3(0, 0, 0) } } }));
    var pBuf = new Uint8Array(PORT.N * PORT.N * 4);
    function portraitBg(o) { var b = o && o.bg; if (!b || b === 'transparent') return null; if (b === 'navy') return '#172038'; return /^#[0-9a-f]{6}$/i.test(b) ? b : null; }   /* 기본 투명 · 'navy' = Apollo 남색 · '#rrggbb' */
    function renderPortrait(expr, bgHex, colorHex) {   /* colorHex = 그 몸색으로 찍기 (장면 몸색·팔레트는 찍은 뒤 그대로 되돌린다 — 첫 실행 창 미리 보기 · 지난 날 초상) */
      var t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0;
      var base = colorHex || st.color, other = base.toLowerCase() !== String(st.color).toLowerCase(), OCp = other ? octDerived(base) : OC;
      if (other) { octLook(OCp); uploadPalette(buildPalette(base, st.palette, salExtra())); }
      var sv = { sx: bodyG.scale.x, sy: bodyG.scale.y, sz: bodyG.scale.z, py: bodyG.position.y, rz: bodyG.rotation.z, rx: bodyG.rotation.x, ry: bodyG.rotation.y, arms: arms.map(function (m) { return [m.rotation.y, m.rotation.z, m.scale.x]; }), pup: pupils.map(function (p) { return [p.position.x, p.position.y]; }), vis: octG.visible, pvis: octG.parent ? octG.parent.visible : true, applied: face.applied, hex: oct.curHex || st.color, bg: scene.background };
      var sc = renderer.getClearColor(_cc).clone(), sa = renderer.getClearAlpha();
      var pose = FACES[expr].pose || [1, 1, 0], svEm = toon.emissive.clone();
      var svFade = FADE.on; if (svFade < 1) fadeLook(1);   /* 사라지는 중에도 초상은 온전히 */
      applyFace(expr); toon.emissive.setRGB(0, 0, 0);   /* 초상은 시각대와 무관 (전용 3점 조명) → 밤 문어 자체광(첫 불)은 빼고 찍는다 */
      var hex = expr === 'pet' ? mixHex(base, OCp.hi, 0.35) : expr === 'sleep' ? hueHex(base, 12) : base;   /* pet = 장면의 홍조 끝값, sleep = 색 순환 한 자락 */
      if (hex !== sv.hex) octColor(hex);
      octG.visible = true; if (octG.parent) octG.parent.visible = true; bodyG.scale.set(pose[0], pose[1], pose[0]);   /* 문어가 숨은 장소 그룹에 있어도 찍힌다 (레이어 2 만 그리므로 장소 내용·조명은 안 들어온다) */ bodyG.position.y = 0; bodyG.rotation.set(0, 0, pose[2]);
      var salClean = !!(SAL.active || SAL.lookAt || SAL.offer >= 0);   /* 미용실이 눈·몸을 쥐고 있을 때만 (병을 내밀었거나 연출 중) 초상을 정지 자세로 씻는다 — 그 밖엔 예전 그대로 찍는다 */
      arms.forEach(function (m) { m.rotation.y = -m.userData.a; m.rotation.z = 0.05; if (salClean) m.scale.x = 1; });   /* 걸음 중이어도 초상은 정지 자세 (다리 기본 0.05 · 미용실 기쁨 폴짝 꼭대기의 다리 ×1.3 도 풀고) */
      if (salClean) pupils.forEach(function (p, k) { p.position.x = EYE[k][0]; p.position.y = EYE[k][1] + (FACES[expr].dy || 0); });   /* 눈은 앞을 본다 (미용실 병을 따라가던 동공이 초상에 새지 않게) */
      octG.updateMatrixWorld(true);
      var ty = (HEAD_Y - PORT.down) * pose[1];
      _pt.set(0, ty, 0); octG.localToWorld(_pt);
      _pp.set(0, ty + PORT.dist * Math.sin(PORT.tilt), PORT.dist * Math.cos(PORT.tilt)); octG.localToWorld(_pp);
      var hw = PORT.hw * OCT_R; pCam.left = -hw; pCam.right = hw; pCam.top = hw; pCam.bottom = -hw; pCam.updateProjectionMatrix();
      pCam.position.copy(_pp); pCam.up.set(0, 1, 0); pCam.lookAt(_pt); pCam.updateMatrixWorld();
      scene.background = bgHex ? C(bgHex) : null;
      renderer.setClearColor(bgHex ? C(bgHex) : 0x000000, bgHex ? 1 : 0);
      renderer.setRenderTarget(rtP); renderer.clear(true, true, false); renderer.render(scene, pCam);
      scene.overrideMaterial = normalMatP; scene.background = null;
      renderer.setRenderTarget(rtPN); renderer.clear(true, true, false); renderer.render(scene, pCam);
      scene.overrideMaterial = null;
      quad.material = postP; renderer.setRenderTarget(rtPO); renderer.render(quadScene, quadCam); quad.material = post;
      renderer.readRenderTargetPixels(rtPO, 0, 0, PORT.N, PORT.N, pBuf);
      /* 되돌리기 */
      scene.background = sv.bg; renderer.setClearColor(sc, sa); renderer.setRenderTarget(null);
      octG.visible = sv.vis; if (octG.parent) octG.parent.visible = sv.pvis; bodyG.scale.set(sv.sx, sv.sy, sv.sz); bodyG.position.y = sv.py; bodyG.rotation.set(sv.rx, sv.ry, sv.rz);
      arms.forEach(function (m, i) { m.rotation.y = sv.arms[i][0]; m.rotation.z = sv.arms[i][1]; m.scale.x = sv.arms[i][2]; });
      pupils.forEach(function (p, k) { p.position.x = sv.pup[k][0]; p.position.y = sv.pup[k][1]; });
      if (hex !== sv.hex) octColor(sv.hex);
      if (other) { octLook(OC); uploadPalette(); }
      applyFace(sv.applied); toon.emissive.copy(svEm); if (svFade < 1) fadeLook(svFade);
      var N = PORT.N, cv = document.createElement('canvas'); cv.width = cv.height = N;
      var cx = cv.getContext('2d'), img = cx.createImageData(N, N);
      for (var y = 0; y < N; y++) img.data.set(pBuf.subarray((N - 1 - y) * N * 4, (N - y) * N * 4), y * N * 4);   /* GL 은 아래→위 */
      cx.putImageData(img, 0, 0);
      if (t0) PORT.ms = +(performance.now() - t0).toFixed(2); PORT.n++;
      return cv;
    }
    function portraitColor(o) { var c = o && o.color; return /^#[0-9a-f]{6}$/i.test(c || '') ? String(c).toLowerCase() : null; }   /* o.color = 그 몸색으로 찍기 (장면 색은 그대로) */
    function portraitKey(expr, o) { return expr + '|' + (portraitColor(o) || String(st.color).toLowerCase()) + '|' + PAL.source + '|' + (portraitBg(o) || 't'); }   /* 몸색이 캐시 키에 든다 */
    function portrait(expr, o) { /* → 64×64 캔버스 (CSS 로 키운다). 기본은 캐시의 복사본(로그 행마다 하나씩 붙일 수 있게), o.shared = 캐시 캔버스 그대로 · o.fresh = 캐시 없이 지금 찍기 (시험용) */
      expr = FACES[expr] ? expr : 'idle';
      var k = portraitKey(expr, o), e = o && o.fresh ? null : PORT.cache[k];
      if (!e && ctxLost()) { var blank = document.createElement('canvas'); blank.width = blank.height = PORT.N; return blank; }   /* 컨텍스트 잃음: GL 읽기 오류 대신 빈 초상 (캐시하지 않음 → 복구 뒤 다시 그림) */
      if (!e && o && o.fresh) return renderPortrait(expr, portraitBg(o), portraitColor(o));
      if (!e) e = PORT.cache[k] = { cv: renderPortrait(expr, portraitBg(o), portraitColor(o)), url: '' };
      if (o && o.shared) return e.cv;
      var cv = document.createElement('canvas'); cv.width = cv.height = PORT.N; cv.getContext('2d').drawImage(e.cv, 0, 0); return cv;
    }
    function portraitURL(expr, o) { expr = FACES[expr] ? expr : 'idle'; var cv = portrait(expr, Object.assign({}, o, { shared: true })), e = PORT.cache[portraitKey(expr, o)]; if (!e.url) e.url = cv.toDataURL('image/png'); return e.url; }
    function portraitFlush() { PORT.cache = {}; }
    function anchorPos(name) { var p = ANCHORS[name] || ANCHORS.center; return new T.Vector3(p[0], name === 'blanket' && st.items.indexOf('blanket') >= 0 ? 0.12 : 0, p[2]); }
    function camYaw() { return YAW + yawDelta(); }
    /* 문어 위치: oct.pos 가 논리 위치(보간·앵커), octG.position 은 매 프레임 그걸 카메라 우/상 축 픽셀 격자에 스냅한 값 (룩 패스 5: 걷는 동안 반 픽셀 금지). 스냅을 매 프레임 논리값에서 새로 하므로 요가 바뀌어도 누적 표류 없음 */
    function jumpTo(anchor) { if (oct.walking) { oct.walking.cancel(); oct.walking = null; } if (FADE.d < 1) { setOctFade(1); if (st.octState === 'away') octG.visible = octDecal.visible = false; } oct.anchor = anchor; oct.pos.copy(anchorPos(anchor)); snapScreen(octG.position.copy(oct.pos)); oct.wantYaw = oct.faceYaw = camYaw(); gaitReset(); }
    function moveTo(anchor) {
      oct.anchor = anchor;
      return walkPoint(anchorPos(anchor), function () { if (on.anchorReached) on.anchorReached(anchor); }, anchor);
    }
    function walkPoint(to, done, val) {   /* 점까지 뒤뚱 걸음 (moveTo 와 놀이 kit.walkTo 공용) → Promise(val). done = 도착 콜백 */
      var from = oct.pos.clone();
      plAvoidOct(to);   /* 목표 자리에 내 캐릭터가 서 있으면 미리 비켜선다 (아래 '내 캐릭터 · 움직이기') */
      if (oct.walking) { oct.walking.cancel(); oct.walking = null; }
      var d = to.clone().sub(from), dist = d.length();
      if (st.reduced || ctxLost() || dist < 0.05) { oct.pos.copy(to); snapScreen(octG.position.copy(to)); oct.wantYaw = camYaw(); done(); return Promise.resolve(val); }   /* 컨텍스트를 잃으면 프레임이 안 돌아 걸음이 안 끝난다 → 바로 도착 */
      oct.wantYaw = Math.atan2(d.x, d.z);
      var dur = dist / 1.2 * st.speed, hopDur = 0.3 * st.speed, hold = anticHold(), k = 0, cancelled = false;   /* hold = 서 있다 출발할 때 120 ms 예비 동작 (뒤뚱 걸음) */
      return new Promise(function (resolve) {
        var w = oct.walking = { gait: true, cancel: function () { cancelled = true; w.gait = false; },
          finish: function () { if (cancelled) return; cancelled = true; w.gait = false; oct.pos.copy(to); oct.hop = 0; oct.walking = null; oct.wantYaw = camYaw(); done(); resolve(val); },   /* 컨텍스트 잃음: 남은 걸음을 건너뛰고 도착 */
          step: function (dt) {
          if (cancelled) return;
          k += dt;
          if (k < hold) return;
          var kw = k - hold;
          if (kw < dur) { oct.pos.lerpVectors(from, to, kw / dur); return; }
          w.gait = false;
          var hk = (kw - dur) / hopDur;
          if (hk < 1) { oct.pos.copy(to); oct.hop = Math.sin(hk * Math.PI) * 0.4; return; }
          oct.hop = 0; oct.walking = null; oct.wantYaw = camYaw(); done(); resolve(val);
        } };
      });
    }
    /* ── 내 캐릭터 (걸어 다니는 내 캐릭터 v1 · 파츠 시스템 — 치수 전부 docs/PLAYER_PARTS.md · ROADMAP '그 뒤' · 주인 11-07 "캐릭터가 그 방문 앞으로 가면 끼익 열리면서") ──
       레퍼런스: 파넬라 '나나곰쿠키' · 동숲 주민 — 실루엣 종류·비율·색 분위기만 참고 (모양은 베끼지 않았고 파츠 이름도 새로 지었다). 4방향 걷기 스프라이트(서기 · 왼발 · 서기 · 오른발 4프레임).
       문어와 같은 길: 원시 도형 + 정점색(mergeParts) + 툰 3단(toonP) + 같은 후처리(팔레트 스냅 · 외곽선 · 디더), 위치는 화면 픽셀 격자 스냅(snapScreen) · 통통은 세로 정수 px(snapUp) · 걸음은 간 거리로 도는 위상 · 방향은 45° 계단(8방향).
       비율(동숲풍 — 머리 크고 통통·짧뚱, m · 발바닥 y 0): 키 PL_H 1.22(머리칼 실루엣 1.28 · 모자 ≤ 1.38 · p=2 에서 33 px · 문어 0.76 의 1.6 배 · 문 1.68 아래) · 머리 r 0.35 중심 0.87(지름 = 키의 57 %, 목 없음) ·
       몸통 y 0.24~0.56(보이는 8 px) · 팔 어깨 (±0.24, 0.50) 길이 0.22 · 다리 엉덩이 (±0.115, 0.24) · 신발 0.06 · 폭 0.66(문 0.72 안). 6 cm 미만은 안 만든다(단추 · 안경 테 · 소매 띠만 1 px 점·선 의도 — 눈 안의 동공·글린트는 텍셀이다).
       얼굴(11-09 얼굴 수술, 주인 "옆으로 돌렸을 때 눈동자가 튀어나온 게 무서워 · 귀여움 기준 미달" — 레시피 FACE_V3 §5): 이목구비는 전부 입체가 아니라 머리 곡면에 붙은 **텍스처 조각**(plPatch · toonEye · 아틀라스 plEyeTex) — 눈 2장 + 고른 코 · 입 · 볼 조각(없음이면 조각도 없다).
       눈 하나 = 화면 4×4 px(1×) = 0.148 × 0.148 m(머리 폭의 21 %, 가로 = 세로 — 주인 11-10 "세로 타원형이라 좀 무섭게 느껴짐") — 텍셀 1 = 화면 1 px 라 1× 에서 '동그란 홍채 + 동공 + 색 반짝 점 1' 이 그린 대로 나오고, 2× 는 8×8 텍셀, p=3 은 2×2. 흰자도 흰 글린트도 안 그린다(흰 테는 눈을 땡그랗게 — 주인 11-09, 흰 글린트 덩어리는 흰자위로 읽혔다 — 주인 11-10 "흰자위를 없애고"). 눈 중심 y 0.93(머리 중심 +0.06 — 화면 17 px: 윗변은 4×5 때 그대로 19 px, 아랫변 15 px) · x ±0.148(두 눈 틈 4 px), 조각은 머리 표면 +0.3 cm 를 따라가므로 어느 방향에서도 윤곽 밖으로 안 나온다.
       눈 스타일 6(동그란 · 반짝 · 졸린 · 또렷 · 웃는 · 점) = 도트 배열 6 벌(PL_PARTS.eyes), 눈 색 6 = 홍채 텍셀 색(eyeColor.hex · 밝은 홍채 hi · 반짝 점 sh). 깜빡임 = 아틀라스 '감은 눈' 칸으로 uv 전환. 눈썹 없음.
       코 3 · 입 6 · 볼 2 (11-09 주인 "동물의 숲 같은 기존 게임들 얼굴 느낌 참고" — 느낌만: 두 눈 사이 작은 코 · 한두 px 입. 주인 11-08 "입은 없는 게 더 귀엽다"는 '없음' 칩으로 남는다 · 눈 밑 분홍 볼터치는 주인 11-10 "이상하게 보여서" 뺐다 — 볼은 없음 · 주근깨): 눈과 같은 메시의 도트 조각(PL_PARTS.nose/mouth/cheek · PL_FEAT), 기본 = 세모코 · 미소 · 볼 없음.
       머리칼(주인 11-08 "머리가 저게 뭐야"): 모든 조각이 같은 r 0.38 의 얇은 구 껍질 조각(중심 (0, 0.90, −0.03), phi·theta 창을 서로 보완하게 잘라 겹침 없음) — 윗덮개(앞 104° 비움 — 옆머리가 눈을 안 덮고 뺨 살결 1 px) + 앞머리 세 가닥(끝 1.071 / 1.093 / 1.113 — 사선 가르마, 눈 윗선과 화면 1~2 px) + 스타일별 옆·뒷머리.
       두개골 위에 구를 얹지 않는다(구는 매듭 · 다발 끝 · 컬만). 뒷머리 덩어리(긴 머리 커튼 · 웨이브 끝단)는 닫힌 납작 원기둥 — toonP 가 FrontSide 라 열린 반껍질은 안쪽이 컬링돼 틈으로 배경이 비쳤다.
       색은 '실광 모델'(쉬는 자리는 해 그림자 안 — 푸른 필 #a9cbe2 + 헤미가 칠한다)로 apollo 칸을 미리 계산해 골랐다(문서 §2.2): 살결 #ffd096 → #e7d5b3(흰자 #ebede9 와 다른 칸) · 금발 #e8a93a → #de9e41(살결과 두 칸 차 — amber[3] 의 #e8c170 은 살결과 한 덩이로 읽혔다, v0 #ffd27a 는 올리브 #d0da91 로 떴다).
       부품 사이엔 깊이 잉크선이 안 생기므로(이웃 칸 0.28 m 차부터) 얼굴·옷 경계는 전부 '다른 apollo 칸'으로만 만든다.
       재질 toonP · toonEye = 문어 툰과 같은 셰이더(같은 onBeforeCompile 글자 + 셋 다 map 이 있어 프로그램 캐시 키가 같다 — toon·toonP 는 1×1 흰 whiteTex, toonEye 만 눈 아틀라스)라 프로그램 수가 늘지 않는다(부팅 30 = 27 + 발자국 인스턴싱 변형 3), 문어가 체크로 사라져도 내 캐릭터는 그대로. 밤 자체광(첫 불)은 문어와 같이 받는다.
       메시 7(머리 · 눈 · 몸통 · 팔 2 · 다리 2) + 데칼 1 — 파츠를 바꿔도 메시 수 · 드로우콜 · 텍스처 수 그대로(setPlayer 는 지오메트리만 교체하고 옛것을 dispose, 눈 아틀라스는 다시 그린다). 머리칼 · 악세사리 → 머리 메시, 눈 → 눈 메시(조각 2장, tag 1 왼눈 · 2 오른눈),
       옷 → 몸통, 소매 · 손 → 팔, 다리 색 · 신발 → 다리. 정적 카탈로그 PLAYER_PARTS · PLAYER_DEFAULT · normalizePlayer 는 파일 위쪽(init 밖).
       방: 다락 ↔ 놀이방을 문으로 오간다 (문어는 놀이방에 안 간다). 쉬는 자리 PL_REST · 문 앞은 DOOR_ANCHORS. 바깥엔 안 나간다 — 바깥이 보이는 동안은 다락 그룹과 같이 숨는다.
       흐름: 문 톡 → playerWalkTo(문 앞 앵커: 1.8 m/s, 서 있다 출발하면 120 ms 예비 눌림) → 도착해 문을 보고 섬 → (goRoom) 문 열림 → 가로 전환 가운데 프레임에 plEnter(건너편 문 앞, 방 안쪽을 보고)
       → 문 닫힘 → 쉬는 자리로 걷는다. 모션 감소 = 걷기 없이 바로. 탭 숨음 · 컨텍스트 잃음 · 준비 전 = 바로 (Promise 가 걸려 있지 않게, walkPoint 와 같다). */
    var PL_H = 1.22, PL_HEAD_R = 0.35, PL_HEAD_Y = 0.87, PL_HR = 0.38, PL_HC = [0, 0.90, -0.03], PL_SPEED = 1.8, PL_RUN = 2.2, PL_STRIDE = 0.40, PL_RUN_STRIDE = 0.55, PL_TURN = 24, PL_ANTIC = 0.12, PL_LEG = 0.45, PL_ARM = 0.4, PL_SWAY = 0.045;   /* 짧뚱한 몸 = 종종걸음(한 걸음 0.4 m) + 디딤 프레임 좌우 뒤뚱 0.045 rad(머리 꼭대기 ≈ 1 px) */
    var PL_REST = { attic: [1.65, 0, -0.1], play: [0.15, 0, 0.45] };   /* 쉬는 자리: 다락 오른쪽 — 가운데 문어와 상자 사이, 화면에서 문어(가운데 앵커)·문짝(x−z 0.62~1.34)과 안 겹친다 (x−z 1.75) · 문 앞까지 1.5 m · 놀이방 빈 바닥 가운데 (문까지 1.7 m) */
    var PL_FACE = { atticPlayDoor: Math.PI / 2, playAtticDoor: -Math.PI / 2, atticStair: Math.PI / 2, loftStair: Math.PI / 2 };   /* 문 앞에 서서 보는 쪽 (다락 문은 +x 벽 · 놀이방 문은 −x 벽) — 들어올 땐 반대(방 안쪽) */
    var PLC = (function () {
      var skin = '#ffd096';   /* ≈ mixHex(amber[4], dusk[3], .5) — 필 빛에서 #e7d5b3 로 앉아 흰자 #ebede9 와 한 칸 갈린다 (v0 의 paper·dusk 섞음은 앞면이 흰자와 같은 칸이었다) */
      return { skin: skin, white: PAL.white, pupil: '#1b1b1b', lid: '#c09473', smileArc: '#4d2b32', red: '#c04040', orange: '#e89030', straw: '#dcb878',
        nose: '#c09473', noseTri: '#e89a5a', mouth: '#7a3b34', mouthLo: '#c09473', tongue: '#d5604a', freckle: '#c98a5a' };   /* 눈에 흰색은 없다(옛 sclera #fff4e0 = 흰자·글린트 텍셀은 11-10 에 삭제 — 화면 #ebede9 · 2단 #c7cfcc 가 흰자위로 읽혔다) · lid = 졸린 눈 꺼풀 선(살결 두 칸 아래) · smileArc = 웃는 눈 호 · nose = 콩코(살결 두 칸 아래 #c09473) · noseTri = 세모코(주황 칸) · mouth = 입 선 · mouthLo = 옅은 입꼬리 · tongue = 입 안 · blush = 볼(분홍 칸 #df84a5 — #f09a9a 는 초상의 밝은 쪽 볼이 주황 칸으로 떴고, 더 푸른 #f08ab0 은 1× 그늘 쪽이 보라 칸으로 떨어졌다. #f09aa2 가 둘 다 분홍) · freckle = 주근깨 — 전부 실험실에서 '필 빛 → apollo 칸'을 보고 고른 값(더 옅은 #c98050 · #f4b6a0 은 살결 칸으로 떨어져 안 보였다) · red = 리본·방울·니트·운동화 */
    })();
    function plBrowHex(hc) {   /* 감은 눈 선 색(깜빡임 recolor 용 — 눈썹은 피드백 6 으로 없앴다): 머리칼보다 한 칸 이상 어둡고 살결 위에서 읽히게 색마다 따로 (mixHex(hair, ink) 공식은 금발·은빛·연두에서 푸른 회색이 됐다) */
      return hc === 'brown' ? mixHex('#9a5a3a', FIXED.ink, 0.45) : hc === 'ink' ? FIXED.ink : hc === 'silver' ? mixHex('#cfc9c0', PAL.slate[1], 0.6) : hc === 'pink' ? mixHex('#de8fa9', PAL.rose[0], 0.6) : hc === 'lime' ? PAL.moss[0] : '#b8742e';   /* 금발 → #be772b (두 단 어두운 꿀색) */
    }
    /* 눈 (11-09 얼굴 수술, FACE_V3 §5): 흰자 구를 얹는 대신 **머리 곡면에 붙은 텍스처 조각 2장**. 눈 하나 = 화면 **4×4 px**(가로 4 · 세로 4, 1×, 27 px/m — 머리 폭 19 px 의 21 %; 6×6 = 32 % 는 주인 11-09 "너무 땡그래 · 너무 큼", 4×5 세로 타원은 주인 11-10 "세로 타원형이라 좀 무섭게 느껴짐" → 가로 그대로 · 맨 아랫줄 하나를 덜어 정원)짜리 사각형을 쉬는 자세의 카메라 방향으로 머리 타원체(반지름 +PL_EYE.lift)에 투영한 곡면 조각(4×4 칸 격자)
       → 정면에선 텍셀 1 = 화면 정확히 1 px(어느 줌 멈춤에서도 비율이 정수인 1×·2× 에서), 옆·뒤로 돌아도 조각이 머리 표면에서 0.3 cm(머리 구 폴리곤의 정점은 이상 타원체 위라 조각이 늘 바깥) 이상 안 떠서 눈이 얼굴 윤곽 밖으로 나오지 않는다(옛 흰자 구는 45° 에서 반구 덩어리가 불거졌다 — 주인 11-09 "눈동자가 튀어나온 게 무서워").
       눈 중심 y 0.93(주인 11-08: 0.85 는 아래로 몰려 보였다 → 0.90, 11-10 정원으로 줄이며 0.93) · x ±4 px(0.148, 두 눈 틈 4 px — 가로 4 px 는 짝수라 중심이 정수 px 여야 가장자리가 픽셀 경계에 앉는다; 2× 에선 ±8 px) · 화면 세로 중심 17 px(0.93·cos32° − 표면 z·sin32° = 16.97 px 를, 세로 4 px 가 짝수라 정수 px 자리로 — 윗변 19 px · 아랫변 15 px: 4×5 때(윗변 19 · 아랫변 14, 중심 16.5)와 윗변이 같고 **아랫줄 하나를 덜었다** → 중심 +0.5 px. 아랫줄이 볼 줄(13 px)과 살결 한 줄 떨어져야 동그라미가 읽힌다 — 윗줄을 던 판(14~17 px 줄)은 눈 아랫줄이 볼에 붙어 1× 에서 눈 + 볼이 한 덩이였다) · 위상 바이어스 0.02 px(픽셀 중심이 텍셀 경계에 정확히 떨어지는 격자 위상에서 Nearest 가 열을 건너뛰거나 겹치지 않게).
       정점 노멀은 전부 눈 중심의 머리 노멀 하나 → 눈 안은 툰 1단 하나(음영 고리 0), 노멀 하이라이트도 안쪽엔 없다. 재질 toonEye(map = plEyeTex 아틀라스), 깜빡임·LOD 는 uv 만 바꾼다(plEyeUV) */
    var PL_EYE = { x: 4 / 27, y: 0.93, z: 0.302, ry: 0.25, px: 1 / 27, cw: 4, ch: 4, lift: 0.003, bias: 0.02 / 27 };   /* z·ry 는 안경(EM) 용 — 눈 중심의 머리 표면 z 0.302 · 곡면 노멀 각 ≈ 0.25 rad. y 0.90 → 0.93 · z 0.306 → 0.302 (11-10): 4×4 눈의 화면 중심 17 px 에 해당하는 높이 — 안경이 같이 따라온다 */
    PL_EYE.sv = (Math.round((PL_EYE.y * Math.cos(TILT) - PL_EYE.z * Math.sin(TILT)) / PL_EYE.px - (PL_EYE.ch % 2) / 2) + (PL_EYE.ch % 2) / 2) * PL_EYE.px;   /* 눈 중심의 화면 세로 좌표(월드 m, 발바닥 기준) = 17 px (세로 칸 수가 홀수면 반 픽셀, 짝수면 정수 px — 지금 4 칸: 16.97 → 17) */
    function EM(s, dx, dy, dz, rz, sx, sy, sz, ex) { return M(s * (ex == null ? PL_EYE.x : ex), PL_EYE.y, PL_EYE.z, 0, s * PL_EYE.ry, 0).multiply(M(dx, dy, dz, 0, 0, rz || 0, sx, sy, sz)); }   /* 눈 좌표계 부품 행렬 (s = −1 왼눈 · +1 오른눈) — 지금은 안경만 쓴다 */
    function plPatch(cx, sv0, nx, ny, lift, at, flip) {   /* 머리 곡면 조각: 화면 사각형(중심 cx · sv0 m, nx×ny px 칸)을 쉬는 자세의 카메라 방향으로 머리 타원체(+lift)에 투영한 (nx+1)×(ny+1) 정점 격자, uv 는 0~1 (아틀라스 칸으로의 사상은 plEyeUV). at = [x, y, z] 면 정점 노멀이 전부 그 점의 머리 노멀 하나(눈 — 안쪽 음영 고리 0), 없으면 정점마다 제 자리의 머리 노멀(코 · 입 · 볼 — 살결 텍셀이 밑의 머리와 같은 툰 단에 앉아 조각 네모가 안 보인다). flip = uv 가로 뒤집기(오른쪽 볼) */
      var px = PL_EYE.px, c = Math.cos(TILT), sn = Math.sin(TILT), A = PL_HEAD_R + lift, B = PL_HEAD_R * 0.98 + lift, Cc = PL_HEAD_R * 0.94 + lift;
      var pos = [], uv = [], idx = [], nor = [], fn = null;
      if (at) { var nnx = at[0] / (A * A), nny = (at[1] - PL_HEAD_Y) / (B * B), nnz = at[2] / (Cc * Cc), nl = Math.hypot(nnx, nny, nnz); fn = [nnx / nl, nny / nl, nnz / nl]; }
      for (var j = 0; j <= ny; j++) for (var i = 0; i <= nx; i++) {
        var sx = cx + (i - nx / 2) * px + PL_EYE.bias, sv = sv0 + (ny / 2 - j) * px + PL_EYE.bias;   /* 화면 좌표 (우 · 상, m) */
        /* 시선 광선 p(t) = (sx, sv·cos + t·sin, −sv·sin + t·cos) 과 타원체의 카메라 쪽 교점. 비껴가면 가장 가까운 점을 타원체 안쪽으로 끌어당긴다(눈 4×4 · x ±4 px 에선 비껴가는 정점이 없다 — tools/player-shots.js 가 센다; 6×6 ±4 px 땐 바깥 아래 모서리 하나가 비껴갔다) */
        var ay = sn / B, by = (sv * c - PL_HEAD_Y) / B, az = c / Cc, bz = -sv * sn / Cc, qa = ay * ay + az * az, qb = 2 * (ay * by + az * bz), qc = (sx / A) * (sx / A) + by * by + bz * bz - 1, disc = qb * qb - 4 * qa * qc;
        var t = disc < 0 ? -qb / (2 * qa) : (-qb + Math.sqrt(disc)) / (2 * qa), X = sx / A, Y = (sv * c + t * sn - PL_HEAD_Y) / B, Z = (-sv * sn + t * c) / Cc;
        if (disc < 0) { var k = Math.hypot(X, Y, Z) / 0.985; X /= k; Y /= k; Z /= k; }   /* 비껴간 모서리 정점은 이상 타원체 표면 1.5 % 안쪽으로 — 모서리 쿼드가 찌그러져 그 텍셀의 픽셀 표본점이 쿼드 밖으로 떨어지고 머리 픽셀이 보인다. 정면에선 이 정점도 아직 머리 구 폴리곤(18×13, 현 처짐 ≈ 5.3 mm)보다 6.3 mm 앞이라 '머리에 가려지는' 게 아니다(레이캐스트 11-09) — 가려지는 건 요 45° 부터. 그래서 그 텍셀은 살결이어야 한다 */
        pos.push(A * X, PL_HEAD_Y + B * Y, Cc * Z);
        if (fn) nor.push(fn[0], fn[1], fn[2]); else { var ex = X / A, ey = Y / B, ez = Z / Cc, el = Math.hypot(ex, ey, ez); nor.push(ex / el, ey / el, ez / el); }
        uv.push(flip ? 1 - i / nx : i / nx, 1 - j / ny);
        if (i < nx && j < ny) { var a = j * (nx + 1) + i, b = a + 1, cI = a + nx + 1, d = cI + 1; idx.push(a, cI, b, b, cI, d); }
      }
      var g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
      return g;
    }
    function plEyePatch(s) { return plPatch(s * PL_EYE.x, PL_EYE.sv, PL_EYE.cw, PL_EYE.ch, PL_EYE.lift, [s * PL_EYE.x, PL_EYE.y, PL_EYE.z]); }   /* 눈 곡면 조각 (s = −1 왼눈 · +1 오른눈): 두 눈이 같은 uv 라 반짝 점이 둘 다 왼쪽 위 */
    /* 코 · 입 · 볼 (11-09 주인 "동물의 숲 같은 기존 게임들 얼굴 느낌 참고"): 눈과 같은 곡면 조각 + 같은 아틀라스 · 같은 재질(메시 · 드로우콜 · 프로그램 그대로). 조각 크기 = 고른 그림의 1× 줄 크기(가로×세로 px), 자리 = 화면 px(얼굴 한가운데가 픽셀 경계 0):
       코 · 입은 가운데(가로 짝수 px 여야 가장자리가 픽셀 경계에 앉는다) · top = 윗변의 화면 세로 px(발바닥 기준, 눈은 15~19) · 볼은 안쪽 변이 ±inner px(그림마다 FA 의 넷째 · 다섯째 값이 이 기본을 덮는다). lift 는 눈(0.003)보다 낮아 겹쳐도 눈이 앞 */
    var PL_FEAT = { lift: 0.0015, nose: { tag: 3, top: 16 }, mouth: { tag: 4, top: 14 }, cheek: { tag: 5, top: 14, inner: 3 } }, PL_FEAT_CATS = ['nose', 'mouth', 'cheek'];
    function FA(a, b, c, top, inner) { var r = [a, b, c]; if (top != null) r.top = top; if (inner != null) r.inner = inner; return r; }
    function plArtSize(rows) { return [rows[0].replace(/ /g, '').length, rows.length]; }
    function plFacePatches(cfg) {
      var L = [];
      PL_FEAT_CATS.forEach(function (cat) {
        var art = PL_PARTS[cat][cfg[cat]], f = PL_FEAT[cat]; if (!art) return;
        var sz = plArtSize(art[1]), top = art.top == null ? f.top : art.top, sv0 = (top - sz[1] / 2) * PL_EYE.px;
        (f.inner != null ? [-1, 1] : [0]).forEach(function (sd) { L.push({ g: plPatch(sd ? sd * ((art.inner == null ? f.inner : art.inner) + sz[0] / 2) * PL_EYE.px : 0, sv0, sz[0], sz[1], PL_FEAT.lift, null, sd > 0), c: '#ffffff', tag: f.tag }); });
      });
      return L;
    }
    /* 눈 아틀라스 64×64 캔버스 (CanvasTexture, Nearest, sRGB): 줄 = LOD(0: 2×2 텍셀 p=3 용 · 1: 4×4 1× · 2: 8×8 2× — [가로, 세로]), 칸 = 왼눈 · 오른눈 · 감은 눈, 칸 간격 16 px(빈 곳은 살결색). 눈 스타일·눈 색이 바뀌면 다시 그리고 needsUpdate — 텍스처 객체는 하나뿐이라 메모리·프로그램 변화 없음 */
    var PL_ATLAS = { size: 64, pitch: 16, lod: [[2, 2], [4, 4], [8, 8]] };
    var plEyeCv = document.createElement('canvas'); plEyeCv.width = plEyeCv.height = PL_ATLAS.size;
    var plEyeTex = keep(canvasTex(plEyeCv)); toonEye.map = plEyeTex;   /* 첫 벌은 아래 PL 을 만들 때 그린다(prewarm 전) */
    function plEyePal(look, closed) {   /* 도트 기호 → hex: . 살결 · I 홍채 · H 밝은 홍채(hi) · * 반짝 점(sh — 눈 색을 밝힌 색, 흰색 아님) · P 동공 · S 홍채 그늘 · K 짙은 그늘(눈 색을 먹색과 0.45 / 0.7 섞은 것 — 윗꺼풀 그늘, K 는 동공과 한 덩이로 읽혀 홍채가 '테'로 안 보인다) · D 어두운 점·호 · L 선(졸린 눈 꺼풀 / 감은 눈 = 머리색 한 칸 어둡게).
         **흰색 · 흰색에 가까운 기호는 없다**(주인 11-10 "흰자위를 없애고" — 옛 W 흰자 · G/g 글린트 #fff4e0 삭제: 화면에서 #ebede9 덩어리가 흰자위로 읽혔다). 모르는 기호는 살결로 떨어진다 */
      var ec = plPart('eyeColor', look.eyeColor), iris = ec.hex, dark = look.eyes === 'dot' ? mixHex(iris, FIXED.ink, 0.5) : PLC.smileArc;
      return { '.': PLC.skin, I: iris, H: ec.hi || iris, '*': ec.sh || ec.hi || iris, P: PLC.pupil, D: dark, S: mixHex(iris, FIXED.ink, 0.45), K: mixHex(iris, FIXED.ink, 0.7), L: closed ? plBrowHex(look.hairColor) : PLC.lid };
    }
    function plFaceCell(cat, l) { return cat === 'nose' ? [48, l * 16] : cat === 'cheek' ? [56, l * 16] : [l * 16, 48]; }   /* 코 · 볼 = 넷째 칸 줄(x 48 · 56, LOD 줄마다 8×16 씩) · 입 = 맨 아랫줄(y 48, LOD 마다 16×16) */
    function plSkin(look) {   /* 피부색과 거기서 나오는 얼굴 선 색 (코 · 꺼풀 · 옅은 입꼬리 · 주근깨)을 고른 색으로 — 부품 · 얼굴 그림을 만들기 직전마다 */
      var sk = (plPart('skin', look && look.skin) || plPart('skin', 'peach')).hex;
      PLC.skin = sk; PLC.nose = PLC.lid = PLC.mouthLo = mixHex(sk, '#6a3a2a', 0.34); PLC.noseTri = mixHex(sk, '#e0703a', 0.5); PLC.freckle = mixHex(sk, '#7a4a30', 0.45); PLC.mouth = mixHex(sk, '#5a2420', 0.72);
    }
    function plFacePal(look) { return { N: look.nose === 'tri' ? PLC.noseTri : PLC.nose, M: PLC.mouth, m: PLC.mouthLo, T: PLC.tongue, F: PLC.freckle }; }   /* 코 · 입 · 볼 도트 기호 → hex */
    function plDrawEyes(look) {
      plSkin(look);
      var x = plEyeCv.getContext('2d'), art = PL_PARTS.eyes[look.eyes] || PL_PARTS.eyes.round;
      x.fillStyle = PLC.skin; x.fillRect(0, 0, PL_ATLAS.size, PL_ATLAS.size);
      var fpal = plFacePal(look);
      PL_FEAT_CATS.forEach(function (cat) {
        var fa = PL_PARTS[cat][look[cat]]; if (!fa) return;
        for (var l = 0; l < 3; l++) { var o = plFaceCell(cat, l); fa[l].forEach(function (row, r) { row = row.replace(/ /g, ''); for (var cI = 0; cI < row.length; cI++) { if (row[cI] === '.') continue; x.fillStyle = fpal[row[cI]] || PLC.skin; x.fillRect(o[0] + cI, o[1] + r, 1, 1); } }); }
      });
      PL_ATLAS.lod.forEach(function (sz, l) {
        [art[l], art[l], PL_PARTS.eyes.closed[l]].forEach(function (rows, col) {
          var pal = plEyePal(look, col === 2), ox = col * PL_ATLAS.pitch, oy = l * PL_ATLAS.pitch;
          for (var r = 0; r < sz[1]; r++) { var row = (rows[r] || '').replace(/ /g, ''); for (var cI = 0; cI < sz[0]; cI++) { var ch = row[cI] || '.'; if (ch === '.') continue; x.fillStyle = pal[ch] || pal['.']; x.fillRect(ox + cI, oy + r, 1, 1); } }
        });
      });
      plEyeTex.needsUpdate = true;
    }
    function plEyeUV() {   /* 눈 메시 uv 를 지금 상태(LOD · 감김)의 아틀라스 칸으로 (tag 1 = 왼눈 칸 0 · tag 2 = 오른눈 칸 1 · 감으면 둘 다 칸 2). 정점 속성 업로드만 — 메시·드로우콜·텍스처 변화 없음 */
      if (!PL || !plEyes) return;
      var g = plEyes.geometry, a = g.attributes.uv, b = g.userData.uv0, tags = g.userData.tags; if (!a || !b) return;
      var l = PL.lod, sz = PL_ATLAS.lod[l], S0 = PL_ATLAS.size, cells = {};
      cells[1] = [(PL.shut ? 2 : 0) * PL_ATLAS.pitch, l * PL_ATLAS.pitch, sz[0], sz[1]]; cells[2] = [(PL.shut ? 2 : 1) * PL_ATLAS.pitch, l * PL_ATLAS.pitch, sz[0], sz[1]];
      PL_FEAT_CATS.forEach(function (cat) { var fa = PL_PARTS[cat][PL.look[cat]]; if (fa) { var o = plFaceCell(cat, l), fs = plArtSize(fa[l]); cells[PL_FEAT[cat].tag] = [o[0], o[1], fs[0], fs[1]]; } });
      for (var i = 0; i < tags.length; i++) { var r = cells[tags[i]]; if (r) a.setXY(i, (r[0] + b[i * 2] * r[2]) / S0, 1 - (r[1] + (1 - b[i * 2 + 1]) * r[3]) / S0); }
      a.needsUpdate = true;
    }
    function plEyeLod() {   /* 8×8 은 텍셀 ≥ 1.0 px 가 되는 N 53 이상(= 2× 멈춤 54 뿐) · 4×4 는 N 27~48(1.00~1.78 px, 빠지는 열 없음) · 2×2 는 p=3 의 N 18~26(텍셀 1.33~1.9 px) */
      if (!PL || !plEyes) return;
      var l = S.N >= 53 ? 2 : S.N >= 27 ? 1 : 0;
      if (l !== PL.lod) { PL.lod = l; plEyeUV(); }
    }
    var plG = new T.Group(), plBody = new T.Group(); plG.name = 'player'; plG.add(plBody); atticG.add(plG);
    function plTaper(list, a, b, r0, r1, hex, sides) { list.push({ g: new T.CylinderGeometry(r1, r0, Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), sides || 8), m: segM(a, b), c: hex }); }   /* a→b 테이퍼 원기둥 (r0 가 a 쪽) */
    function Sph(r, ws, hs, p0, pl, t0, tl) { return p0 == null ? new T.SphereGeometry(r, ws, hs) : new T.SphereGeometry(r, ws, hs, p0 * DEG, pl * DEG, t0, tl); }   /* 구 껍질 조각: phi 는 도(0 = −x · 90 = +z 얼굴 · 180 = +x · 270 = −z 뒤통수), theta 는 rad(0 = 꼭대기) */
    function Cyl(rt, rb, h, seg) { return new T.CylinderGeometry(rt, rb, h, seg || 12); }
    function HM() { return M(PL_HC[0], PL_HC[1], PL_HC[2]); }   /* 머리칼 껍질 중심 (머리 구 중심보다 +0.03 위 · −0.03 뒤) */
    /* 11-10 팔 다시 (주인: "팔을 직사각형으로 잡는 게 문제 — 얇은 원통 같은 느낌으로", 동물의 숲 주민 참고): 굵기가 같은 짧은 통(지름 3 px × 길이 4 px)이라 몸 옆에 붙은 네모로 읽혔다
       → 어깨에서 가늘게 시작해 손목으로 살짝 굵어지는 **얇은 원통**(지름 2 px) + 어깨의 둥근 소매 볼륨 + 팔보다 큰 **동그란 손**, 그리고 몸에서 더 벌린다(plArm 의 rotation.z) */
    function plArmTube(L, hex, y0, y1) { L.push({ g: Cyl(0.036, 0.046, y0 - y1, 10), m: M(0, (y0 + y1) / 2, 0), c: hex }); }   /* y0(위) → y1(아래), 아래로 갈수록 살짝 굵게 */
    function plPuff(L, hex) { L.push({ g: Sph(0.068, 9, 7), m: M(0, -0.03, 0, 0, 0, 0, 1, 0.9, 1), c: hex }); }   /* 어깨의 둥근 소매 */
    function plSleeve(L, hex, cuff) { plPuff(L, hex); plArmTube(L, hex, -0.03, -0.185); if (cuff) L.push({ g: Cyl(0.052, 0.052, 0.03, 10), m: M(0, -0.172, 0), c: cuff }); }   /* 긴 소매 (+ 소매 끝 띠 1 px) */
    /* 파츠 빌더 카탈로그 (docs/PLAYER_PARTS.md §2): 범주 → id → 부품 {g, m, c, tag} 를 목록에 밀어 넣는다. 모든 머리칼 조각은 r PL_HR 0.38 · HM() 중심 · 머리 색 하나 (툰 3단이 음영을 준다) */
    /* 11-10 머리 다시 (주인 "헤어가 어색하고 이상한 게 치명적"): 두개골에 붙은 매끈한 공 한 겹이라 뒤에선 민머리 · 앞에선 살결과 한 덩어리였다 → ① 앞머리는 이마 위로 떨어지는 **뾰족한 가닥**(끝 높이가 들쭉날쭉한 지그재그 실루엣),
       ② 얼굴 옆을 감싸는 **옆머리 가닥**, ③ 귀 아래 층은 한 톤 어두운 **속머리**(plHairDk) 로 겹을 만들고, ④ 끝단은 두개골보다 넓게 퍼진다. 가닥은 전부 테이퍼 원기둥 + 끝 구라 깊이 외곽선이 가닥마다 선을 긋는다 */
    function plHairDk(hex) { return mixHex(hex, FIXED.ink, 0.2); }
    function plHP(phi, th, R) { var r = R == null ? PL_HR : R, st = Math.sin(th); return [PL_HC[0] - Math.cos(phi * DEG) * st * r, PL_HC[1] + Math.cos(th) * r, PL_HC[2] + Math.sin(phi * DEG) * st * r]; }   /* 머리칼 구 위의 점 (phi 도: 90 = 얼굴 정면 · theta rad: 0 = 정수리) */
    function plLock(L, a, b, r0, r1, hex) { plTaper(L, a, b, r0, r1, hex, 7); L.push({ g: Sph(r0 * 0.98, 7, 5), m: M(a[0], a[1], a[2]), c: hex }, { g: Sph(r1, 6, 4), m: M(b[0], b[1], b[2]), c: hex }); }   /* 가닥 하나: 굵은 뿌리 → 가는 끝 (양 끝을 구로 막는다) */
    function plHem(L, y, rt, rb, h, hex, zs) { L.push({ g: new T.CylinderGeometry(rt, rb, h, 16, 1, false, 52 * DEG, 256 * DEG), m: M(PL_HC[0], y, PL_HC[2], 0, 0, 0, 1, 1, zs || 1), c: hex }); }   /* 뒤 256° 만 두른 끝단 고리 (앞 104° 는 얼굴) */
    /* 앞머리 다섯 (11-10): 밑판 = 앞 창 104°(phi 38~142°)를 셋으로 나눈 구 껍질 조각(끝 theta 를 종류마다 다르게) + 그 위의 가닥들. 끝이 눈 윗선(y 0.97)을 덮지 않게 theta ≤ 1.22 */
    var PL_BANG = 'spiky';
    function plBangBase(L, hex, ends) { ends.forEach(function (e, i) { L.push({ g: Sph(PL_HR, 5, Math.max(6, Math.round(e / 0.065)), 38 + i * 104 / 3, 104 / 3, 0, e), m: HM(), c: hex }); }); }
    function plBangLock(L, hex, p0, t0, p1, t1, r0, r1) { plLock(L, plHP(p0, t0, PL_HR - 0.045), plHP(p1, t1, PL_HR + 0.012), r0, r1 == null ? 0.022 : r1, hex); }
    var PL_BANGS = {
      spiky: function (L, hex) { plBangBase(L, hex, [1.105, 1.04, 0.975]);   /* 삐죽: 끝 높이가 들쭉날쭉한 뾰족 가닥 여섯 */
        [[46, 1.20, 0.085], [64, 1.06, 0.08], [82, 1.16, 0.09], [100, 1.04, 0.08], [117, 1.14, 0.085], [134, 1.22, 0.085]].forEach(function (t) { plBangLock(L, hex, t[0], 0.62, t[0], t[1], t[2]); }); },
      full: function (L, hex) { plBangBase(L, hex, [1.105, 1.105, 1.105]);   /* 일자: 눈 위에서 반듯하게 자른 두꺼운 앞머리 (끝이 뭉툭) */
        [46, 60, 75, 90, 105, 120, 134].forEach(function (ph) { plBangLock(L, hex, ph, 0.7, ph, 1.16, 0.09, 0.075); }); },
      side: function (L, hex) { plBangBase(L, hex, [1.17, 1.04, 0.85]);   /* 옆가르마: 한쪽 가르마에서 반대쪽으로 비스듬히 쓸어 넘긴다 */
        [[122, 46, 1.22, 0.09], [120, 62, 1.14, 0.09], [118, 78, 1.06, 0.085], [116, 94, 0.98, 0.08], [128, 134, 1.12, 0.07]].forEach(function (t) { plBangLock(L, hex, t[0], 0.5, t[1], t[2], t[3]); }); },
      center: function (L, hex) { plBangBase(L, hex, [1.0, 0.7, 1.0]);   /* 가운데 가르마: 이마 가운데가 보이고 양옆으로 커튼처럼 갈라진다 */
        [[86, 42, 1.24, 0.09], [84, 58, 1.12, 0.08], [94, 138, 1.24, 0.09], [96, 122, 1.12, 0.08]].forEach(function (t) { plBangLock(L, hex, t[0], 0.42, t[1], t[2], t[3]); }); },
      see: function (L, hex) { plBangBase(L, hex, [0.86, 0.86, 0.86]);   /* 시스루: 이마가 비치는 가는 가닥 몇 올 */
        [[52, 1.16], [70, 1.2], [88, 1.14], [106, 1.2], [126, 1.16]].forEach(function (t) { plBangLock(L, hex, t[0], 0.7, t[0], t[1], 0.04, 0.014); }); } };   /* '이마'(앞머리 없음)는 뺐다 — 주인 11-10 "현실적으로 아무도 안 쓸 것". 저장에 남아 있으면 기본 '삐죽' 으로 */
    var PL_PARTS = {
      hair: {
        _pole: function (L, hex) { L.push({ g: Sph(0.06, 6, 4), m: M(PL_HC[0], PL_HC[1] + 0.325, PL_HC[2]), c: hex }); },   /* 정수리 꼭지: 껍질 조각들이 극점에서 만나는 이음새가 2× 에서 검은 점으로 찍혔다(리뷰 11-08) → 머리 색 작은 구로 덮는다 (꼭대기 1.285, 껍질 밖 0.005 = 돌기 아님) */
        _fringe: function (L, hex) { (PL_BANGS[PL_BANG] || PL_BANGS.spiky)(L, hex); },   /* 앞머리는 따로 고르는 갈래 (PL_BANGS — plHeadParts 가 PL_BANG 을 정해 둔다) */
        _cap: function (L, hex) { L.push({ g: Sph(PL_HR, 18, 10, 142, 256, 0, 1.30), m: HM(), c: hex }); PL_PARTS.hair._fringe(L, hex); PL_PARTS.hair._pole(L, hex); },   /* 기본 캡: 윗덮개(앞 104° 비움 — 옆머리 안쪽 끝 x ±0.299 가 눈 바깥 끝 ±0.222 를 안 덮고 뺨 살결 2 px 를 남긴다, 아래 끝 y 1.00) + 앞머리 세 가닥 + 정수리 꼭지.
                                                                                                                                                                                                                                      이웃 조각이 만나는 phi 45°·90°·135° 선의 theta 칸을 전부 0.13 rad 로 맞춘다(10/1.30 · 8/1.04 · 7/0.91) — 칸이 어긋나면 T-이음에서 1 px 구멍이 뚫려 2× 에서 검은 점으로 찍혔다(리뷰 11-08) */
        bob: function (L, cfg, hex) { PL_PARTS.hair._cap(L, hex); L.push({ g: Sph(PL_HR, 18, 8, 142, 256, 1.30, 1.25), m: HM(), c: hex });
          plHem(L, 0.80, 0.372, 0.43, 0.42, hex, 0.96);   /* 겉머리 끝단: 귀 아래에서 턱선까지 종 모양으로 퍼진다 (속머리를 어둡게 하면 뒤에서 띠로 읽혀 같은 색으로 둔다) */
          [-1, 1].forEach(function (s) { plLock(L, [s * 0.30, 1.00, 0.17], [s * 0.335, 0.66, 0.15], 0.085, 0.05, hex); }); },   /* 얼굴 옆 가닥: 관자놀이 → 턱 */   /* 단발: 옆+뒷머리를 턱 위(0.585)까지 — 두개골을 고르게 감싸는 헬멧 실루엣 (기본) */
        short: function (L, cfg, hex) { L.push({ g: Sph(PL_HR, 18, 15, 142, 256, 0, 1.95), m: HM(), c: hex }); PL_PARTS.hair._fringe(L, hex); PL_PARTS.hair._pole(L, hex);
          [[205, 2.12], [235, 2.2], [270, 2.26], [305, 2.2], [335, 2.12]].forEach(function (t) { plLock(L, plHP(t[0], 1.62, PL_HR - 0.03), plHP(t[0], t[1], PL_HR + 0.03), 0.085, 0.03, hex); });   /* 목덜미로 삐죽 내려오는 끝 다섯 (뒤가 민머리 공이던 것) */
          [-1, 1].forEach(function (s) { plLock(L, [s * 0.31, 0.98, 0.14], [s * 0.33, 0.80, 0.16], 0.075, 0.035, hex); });   /* 귀 앞 짧은 구레나룻 가닥 */
          if (cfg.acc !== 'beret' && cfg.acc !== 'strawhat') plLock(L, [0.0, 1.265, -0.02], [0.07, 1.36, 0.02], 0.04, 0.018, hex); },   /* 정수리 삐침 한 가닥 — 모자(베레모 · 밀짚모자)를 쓰면 뺀다 (모자를 뚫고 나왔다, 주인 11-10) */   /* 짧은머리: 귀(0.76)까지 한 장(앞 104° 비움 — 70° 창은 옆머리 끝 ±0.217 이 새 눈 ±0.259 를 덮었다, 11-09) + 같은 앞머리 세 가닥, 옆머리 없음. theta 칸 0.13 (15/1.95) = 가닥 칸의 두 배라 이음 고리가 맞는다 */
        long: function (L, cfg, hex) {
          PL_PARTS.hair._cap(L, hex);
          L.push({ g: Sph(PL_HR, 18, 6, 142, 256, 1.30, 0.90), m: HM(), c: hex }, { g: Cyl(0.31, 0.23, 0.40, 16), m: M(0, 0.48, -0.20, 0, 0, 0, 1, 1, 0.42), c: hex });   /* 긴생머리: 옆+뒷머리(0.676) + 뒷머리 커튼 = 아래로 좁아지는 닫힌 납작 원기둥 y 0.28~0.68, 폭 0.62 → 0.46(어깨 0.48 안 — 위아래 같은 폭 0.68 은 뒤에서 몸보다 넓은 판자로 읽혔다, 리뷰 11-08) */
          [-1, 1].forEach(function (s) { plTaper(L, [s * 0.28, 0.68, 0.12], [s * 0.30, 0.44, 0.15], 0.055, 0.045, hex, 8); L.push({ g: Sph(0.045, 7, 5), m: M(s * 0.30, 0.42, 0.15), c: hex }); }); },   /* 얼굴 양옆 긴 가닥 둘 (어깨 앞) */
        twin: function (L, cfg, hex) {
          PL_PARTS.hair._cap(L, hex); L.push({ g: Sph(PL_HR, 18, 6, 142, 256, 1.30, 0.60), m: HM(), c: hex });   /* 양갈래: 옆+뒷머리 귀까지 */
          var tie = PLC.red;   /* 방울: 빨강 (rose[1] 은 밤갈색 머리와 같은 칸이고 금발 옆에선 갈색 덩어리) */
          [-1, 1].forEach(function (s) {
            L.push({ g: Sph(0.065, 8, 6), m: M(s * 0.36, 0.80, -0.02), c: hex });   /* 매듭 (껍질 밖 0.06) */
            plTaper(L, [s * 0.38, 0.78, -0.02], [s * 0.47, 0.62, 0], 0.085, 0.105, hex, 8); plTaper(L, [s * 0.47, 0.62, 0], [s * 0.44, 0.44, 0.03], 0.105, 0.05, hex, 8); L.push({ g: Sph(0.105, 8, 6), m: M(s * 0.47, 0.62, 0), c: hex });   /* 11-10: 실 같던 다발을 물방울 모양으로 굵게 */   /* 다발 체인: 살짝 벌어졌다 모임 */
            L.push({ g: Sph(0.05, 7, 5), m: M(s * 0.44, 0.44, 0.03), c: hex }, { g: Sph(0.05, 6, 5), m: M(s * 0.40, 0.81, 0.02), c: tie }); }); },
        pony: function (L, cfg, hex) {
          PL_PARTS.hair._cap(L, hex);
          L.push({ g: Sph(PL_HR, 18, 6, 142, 256, 1.30, 0.55), m: HM(), c: hex }, { g: Sph(PL_HR, 6, 4, 142, 25, 1.85, 0.25), m: HM(), c: hex }, { g: Sph(PL_HR, 6, 4, 13, 25, 1.85, 0.25), m: HM(), c: hex }, { g: Sph(0.075, 8, 6), m: M(0, 0.92, -0.36), c: hex });   /* 포니테일: 매끈한 캡 + 귀 아래 짧은 옆 가닥 둘 + 뒤통수 낮은 매듭 */
          plTaper(L, [0.04, 0.90, -0.40], [0.16, 0.70, -0.43], 0.085, 0.11, hex, 8); plTaper(L, [0.16, 0.70, -0.43], [0.33, 0.48, -0.33], 0.11, 0.05, hex, 8); L.push({ g: Sph(0.11, 8, 6), m: M(0.16, 0.70, -0.43), c: hex });   /* 11-10: 꼬리를 물방울 모양으로 굵게 */
          L.push({ g: Sph(0.05, 7, 5), m: M(0.33, 0.48, -0.33), c: hex }, { g: Sph(0.05, 6, 5), m: M(0.02, 0.93, -0.40), c: PLC.red }); },   /* 꼬리는 매듭에서 60° 아래로 떨어지며 +x(오른쪽 어깨 뒤)로 호를 그린다 — 첫 마디가 거의 수평(0.99 → 0.86)이던 v1 은 옆에서 머리 옆 뿔처럼 보였다(리뷰 11-08). 끝 x 0.355 가 소매 0.30 밖이라 정면에서도 1.5 px 보인다 */
        wave: function (L, cfg, hex) {
          PL_PARTS.hair._cap(L, hex);
          L.push({ g: Sph(PL_HR, 18, 8, 142, 256, 1.30, 1.10), m: HM(), c: hex }, { g: Cyl(0.27, 0.33, 0.24, 16), m: M(0, 0.49, -0.17, 0, 0, 0, 1, 1, 0.55), c: hex });   /* 웨이브: 위는 매끈(0.62) + 어깨 높이 뒤 끝단 닫힌 납작 원기둥 y 0.37~0.61 */
          [[-0.325, -0.14], [0.325, -0.14], [-0.21, -0.31], [0.21, -0.31], [0, -0.35]].forEach(function (p) { L.push({ g: Sph(0.065, 8, 6), m: M(p[0], 0.37, p[1]), c: hex }); });   /* 끝단 컬 5 (타원 테두리 위) */
          [-1, 1].forEach(function (s) { L.push({ g: Sph(0.065, 8, 6), m: M(s * 0.26, 0.60, 0.05), c: hex }); }); } },   /* 턱 옆 '뻗친 끝' 컬 */
      acc: {
        none: function () {},
        ribbon: function (L, cfg) { var c = PLC.red; L.push({ g: Sph(0.055, 8, 6), m: M(0.30, 1.04, 0.17), c: c }, { g: Sph(0.055, 8, 6), m: M(0.35, 0.98, 0.16), c: c }, { g: Sph(0.035, 6, 4), m: M(0.325, 1.01, 0.175), c: c }); },   /* 오른쪽 귀 위 작은 리본 (고리 2 + 매듭, 껍질 밖 0.03~0.06) — 빨강 #a53030: rose[1] 은 금발 옆에서 어두운 갈색 덩어리였다 */
        beret: function (L, cfg) { var c = cfg.hairColor === 'brown' ? PAL.moss[1] : PLC.red; L.push({ g: Sph(0.40, 16, 8, 0, 360, 0, 1.25), m: M(0.03, 1.10, -0.02, 0, 0, -0.20, 1, 0.55, 1), c: c }, { g: Sph(0.035, 6, 4), m: M(0.03, 1.335, -0.02), c: c }); },   /* 납작한 타원이 왼쪽으로 기움 + 꼭지. 테두리 1.169 → 앞머리·눈은 보인다. 빨강 #a53030 (rose[0] 와인색 r 0.42 × 0.6 은 금발 위 어두운 팬케이크로 읽혔다 — 리뷰 11-08), 꼭대기 1.32 > 머리칼 1.285 */
        glasses: function (L) { var c = PAL.slate[1]; [-1, 1].forEach(function (s) { L.push({ g: new T.TorusGeometry(0.125, 0.016, 6, 16), m: EM(s, 0, 0.045, 0.07), c: c }); }); L.push({ g: box(0.05, 0.03, 0.04), m: M(0, PL_EYE.y + 0.045, 0.37), c: c }); },   /* 동글안경: 구멍 r 0.109 ≥ 눈 조각 반높이 0.074(4×4 정원 — 11-10) 라 눈이 다 보인다(고리 중심 x = 눈 중심 ±4 px · 눈 앞 0.07 · y +0.045 — 눈 앞으로 나온 만큼 화면에선 1.2 px 내려가 눈 윗줄이 테에 걸렸다, 11-09). 고리 · 다리는 PL_EYE.y 를 따라가므로 11-10 눈 중심 0.90 → 0.93 과 같이 올라갔다(화면에서 고리 중심 = 눈 중심 17 px, 치수는 그대로). 4×5 눈에 맞춰 고리 0.14 → 0.125(두 고리 사이 콧등 1 px), 테 관 0.016 = 1 px 선 의도(0.025 먹색은 2× 에서 고글처럼 두꺼웠다 — 리뷰 11-08) · 회청 slate[1], 알은 비움(새 재질 금지) */
        catears: function (L, cfg) {
          var c = cfg.hairColor === 'ink' ? PAL.slate[2] : PAL.slate[0];   /* 먹남색 머리면 한 칸 밝은 회청 */
          [-1, 1].forEach(function (s) { L.push({ g: new T.ConeGeometry(0.075, 0.18, 6), m: M(s * 0.20, 1.28, -0.02, 0, 0, -s * 0.25), c: c }, { g: new T.ConeGeometry(0.04, 0.10, 5), m: M(s * 0.20, 1.28, 0.015, 0, 0, -s * 0.25), c: PAL.dusk[2] }); });   /* 바깥으로 기운 세모 귀 둘 (끝 1.37 = 머리칼 위 2.4 px) + 귀 속 */
          L.push({ g: new T.TorusGeometry(0.385, 0.03, 6, 20, 198 * DEG), m: M(PL_HC[0], PL_HC[1], PL_HC[2], 0.35, 0, -0.16), c: c }); },   /* 머리띠 (껍질 바로 밖, 앞으로 20° 기움) */
        strawhat: function (L) { L.push({ g: Cyl(0.45, 0.45, 0.06, 18), m: M(0, 1.17, -0.03), c: PLC.straw }, { g: Cyl(0.33, 0.34, 0.18, 14), m: M(0, 1.29, -0.03), c: PLC.straw }, { g: Cyl(0.345, 0.345, 0.06, 14), m: M(0, 1.23, -0.03), c: PAL.rose[1] }); } },   /* 챙 1.14~1.20(가림 한계 1.065 > 눈 윗선 0.955) + 낮은 크라운 + 띠, 키 1.38 */
      eyes: {   /* 눈동자 그림 스타일 6 = 도트 배열 (11-09 얼굴 수술, FACE_V3 §5.3 · 11-10 '동글 + 색 반짝'): 스타일마다 [2×2 (p=3) · 4×4 (1×) · 8×8 (2×)] 세 벌(가로×세로), closed 는 공통 '감은 눈' 세 벌. 크기는 주인 11-09 "너무 땡그래 · 너무 큼" 으로 6×6 → 가로 4 px(머리 폭의 21 %), 주인 11-10 "세로 타원형이라 좀 무섭게 느껴짐 · 동글하고 귀엽게" 로 4×5 → **4×4 정원**(아랫줄 하나를 덜었다 — 윗변 19 px 는 그대로, 볼과 살결 한 줄).
                   기호(plEyePal): . 살결 · I 홍채(eyeColor.hex) · H 밝은 홍채(hi) · * 반짝 점(sh) · P 동공 · S 홍채 그늘 · K 짙은 그늘 · D 어두운 점·호 · L 선.
                   규칙 ① **흰색을 안 쓴다** — 흰자도 흰 글린트도 없다(주인 11-10 "흰자위를 없애고": 옛 흰 글린트 2×2 덩어리가 화면에서 흰자위로 읽혔다). 반짝임은 눈 색을 밝힌 **색 점**(* — 왼쪽 위, 사방 이웃이 그늘·홍채·동공이라 점으로 읽힌다) 하나, '반짝' 눈만 작은 것 하나 더.
                   ② 채운 눈은 **가로 = 세로 + 모서리 텍셀 살결**(4×4 는 폭 2·4·4·2, 8×8 은 폭 4·6·8·8·8·8·6·4 — 네모도 세로 타원도 아닌 동그라미. p=3 의 2×2 는 깎을 모서리가 없다).
                   ③ 홍채를 동공 둘레에 밝은 '테'로 두르지 않는다(동공 사방이 밝으면 치켜뜬 눈 — 11-09 "너무 땡그래") — 윗부분은 짙은 그늘(K)이 동공과 한 덩이로 이어져 윗꺼풀 그늘처럼 덮고, 눈 색은 양옆 · 아래 U 자로만 보인다(차분한 눈).
                   두 눈이 같은 그림(안 뒤집음)이라 반짝 점이 둘 다 왼쪽 위. 2× 그림은 1× 를 두 배로 불린 게 아니라 따로 찍은 것(불리면 계단이 뭉툭하다). 4×4 · ±4 px 에선 plEyePatch 의 모서리 정점이 타원체를 비껴가지 않는다 */
        round: [['K K', 'I I'],
          ['. K K .', 'I * P I', 'I P P I', '. I I .'],
          ['. . K K K K . .', '. K * * K K K .', 'S S * * P P S S', 'I S P P P P S I', 'I I P P P P I I', 'I I I P P I I I', '. I I I I I I .', '. . I I I I . .']],   /* 동그란 (기본): 정원 + 윗줄 짙은 그늘(2× 는 K 두 줄 → S 한 겹 → 홍채로 풀리는 세 단) + 가운데 동공(2× 는 폭 2·4·4·2 의 동그란 덩이 12 텍셀) + 눈 색 U 자(8×8 의 52 텍셀 중 22) + 색 반짝 점 하나(1× 1 px · 2× 는 2×2 — 그늘과 동공 왼쪽 위에 반씩 걸친다. 동공 안쪽 사분면을 파낸 판 · ◤ 3 텍셀 판은 동공이 ㄴ자로 남아 초상(텍셀 1.13 px)에서 세로로 째진 눈처럼 깨졌다) */
        sparkle: [['I I', 'H H'],
          ['. S S .', 'I * P I', 'H P P H', '. H H .'],
          ['. . S S S S . .', '. S * * S S S .', 'S I * * P P I S', 'I I P P P P I I', 'H H P P P P H H', 'H H H P P * H H', '. H H H H H H .', '. . H H H H . .']],   /* 반짝: 한 칸씩 밝은 보석 눈 — 위 옅은 그늘(S) → 홍채 → 아래 절반 밝은 홍채(hi) 세 단 + 색 반짝 점 둘(왼쪽 위 2×2 · 2× 에서만 오른쪽 아래 1) */
        sleepy: [['L L', 'I I'],
          ['. . . .', 'L L L L', 'I P P I', '. I I .'],
          ['. . . . . . . .', '. . . . . . . .', '. L L L L L L .', 'L I P P P P I L', 'I I * P P P I I', 'I I I P P I I I', '. I I I I I I .', '. . I I I I . .']],   /* 졸린: 위 반이 살결(꺼풀) + 살결 그늘색 꺼풀 선 1 px + 아래 반달 — 꺼풀 선을 홍채 그늘(S)로 그리면 찌푸린 눈썹으로 읽혔다(11-09 실험). 반짝 점은 2× 에 작은 것 하나뿐(졸린 눈은 덜 반짝인다) */
        almond: [['P P', 'P P'],
          ['. P P .', 'P * P P', 'P P P P', '. I I .'],
          ['. . P P P P . .', '. P * P P P P .', 'P * * P P P P P', 'P P P P P P P P', 'P P P P P P P P', 'I P P P P P P I', '. I I I I I I .', '. . I I I I . .']],   /* 또렷 (id 는 옛 'almond' 그대로 — 저장값 호환): 까만 눈동자가 정원을 거의 채우고 맨 아래에만 눈 색 초승달 + 색 반짝 점(2× 는 왼쪽 위 가장자리를 따라 굽은 3 텍셀 — 까만 눈 한가운데의 2×2 색 네모는 '빛나는 동공'으로 읽혔다) */
        smile: [['D D', '. .'],
          ['. . . .', '. D D .', 'D . . D', '. . . .'],
          ['. . . . . . . .', '. . . . . . . .', '. . D D D D . .', '. D D D D D D .', 'D D D . . D D D', 'D D . . . . D D', '. . . . . . . .', '. . . . . . . .']],   /* 웃는: 따뜻한 짙은 갈색 ∩ 호 (^ ^) — eyeColor 영향 없음. 눈 칸 가운데 두 줄(1× 화면 17 · 16 px 줄 — 4×5 때보다 1 px 위) */
        dot: [['D D', 'D D'],
          ['. . . .', '. D D .', '. D D .', '. . . .'],
          ['. . . . . . . .', '. . . . . . . .', '. . . D D . . .', '. . D * D D . .', '. . D D D D . .', '. . . D D . . .', '. . . . . . . .', '. . . . . . . .']],   /* 점: 작고 동그란 어두운 점 2×2(2× 는 폭 2·4·4·2 — eyeColor 를 먹색과 반반) + 색 반짝 점은 2× 에서만 1 텍셀 — 머리 가운데 높이의 작은 점이라 문어의 큰 검은 눈과 다르다 */
        closed: [['. .', 'L L'],
          ['. . . .', '. . . .', 'L L L L', '. . . .'],
          ['. . . . . . . .', '. . . . . . . .', '. . . . . . . .', '. . . . . . . .', 'L . . . . . . L', '. L L L L L L .', '. . . . . . . .', '. . . . . . . .']] },   /* 감은 눈 (깜빡임 120 ms): 머리색 한 칸 어두운 선 하나 (2× 는 양 끝이 한 칸 올라간 ‿) — 눈 칸의 아래에서 둘째 줄(1× 화면 16 px 줄) */
      /* 코 · 입 · 볼 그림 (11-09, 주인 "동물의 숲 같은 기존 게임들 얼굴 느낌 참고") — 눈과 같은 메시 · 같은 아틀라스의 도트 조각. FA([p=3 줄], [1× 줄], [2× 줄], 윗변 세로 px, 볼 안쪽 변 px).
         조각 크기 = 1× 줄 크기(가로×세로 px) · 2× 는 꼭 그 두 배 텍셀 · 코 · 입은 가로 짝수 px(얼굴 한가운데가 픽셀 경계). 조각은 모두 세로 2 px 이상 — p=3(18 px/m)에서 1.33 px 라 어느 격자 위상에서도 한 줄은 잡힌다(1 px 짜리 조각은 0.67 px 라 깜빡였다) · p=3 그림은 조각 전체를 한두 텍셀로 칠한다.
         자리(1×, 발바닥 기준 세로 px): 눈 15~18 · 코 15(두 눈 사이, 눈 아랫줄 높이) · 입 13~12(가운데 선은 12 — 11 은 깃이 가리고 턱 곡면에서 조각이 머리 안으로 든다) · 볼 13(눈 바깥 반쪽 아래 — 눈 아랫줄 15 와 살결 한 줄 띄고).
         기호: N 코 · M 입 선 · m 옅은 입꼬리(살결 두 칸 아래 — 1× 에서 곡선을 한 칸으로 흉내) · T 입 안 · F 주근깨 · . 살결 (B 볼터치는 11-10 에 뺐다) */
      nose: { none: null,
        dot: FA(['N'], ['N N', '. .'], ['. N N .', '. N N .', '. . . .', '. . . .'], 16),   /* 콩코: 살구빛 점 */
        tri: FA(['N'], ['N N', '. .'], ['. N N .', 'N N N N', '. . . .', '. . . .'], 16) },   /* 세모코: 주황 세모 (plFacePal 이 색을 바꾼다) */
      mouth: { none: null,
        smile: FA(['M M'], ['m . . m', '. M M .'], ['. . . . . . . .', '. M . . . . M .', '. . M M M M . .', '. . . . . . . .'], 14),   /* 미소 ‿ */
        line: FA(['M'], ['. .', 'M M'], ['. . . .', '. . . .', 'M M M M', '. . . .'], 14),   /* 새침 ㅡ */
        pout: FA(['M M'], ['. M M .', 'm . . m'], ['. . . M M . . .', '. . M . . M . .', '. M . . . . M .', '. . . . . . . .'], 14),   /* 뾰로통 ㅅ */
        open: FA(['M'], ['M M', 'T T'], ['M M M M', 'M T T M', '. T T .', '. . . .'], 14),   /* 활짝 ▽ */
        o: FA(['M'], ['M M', 'M M'], ['. M M .', 'M T T M', 'M T T M', '. M M .'], 14) },   /* 오 */
      cheek: { none: null,
        freckle: FA(['. .'], ['F . F', '. . .'], ['. F . . F .', '. . . F . .', '. . . . . .', '. . . . . .'], 14, 3) },   /* 주근깨 (p=3 에선 안 그린다) */
      outfit: {   /* torso(L) 몸통 부품 · arm(L) 소매(손은 공통) · leg 다리 색 · legR 다리 원기둥 반지름 · cuff 접은 단 */
        dress: { torso: function (L) {   /* 원피스(기본): 흰 깃 + 어두운 A 라인 + 밑단 띠 + 리본 매듭 + 단추 2 — v0 그대로, 치수만 통통 */
            L.push({ g: Cyl(0.20, 0.245, 0.32), m: M(0, 0.40, 0), c: PAL.navy[3] }, { g: Cyl(0.25, 0.25, 0.035), m: M(0, 0.255, 0), c: PAL.navy[2] }, { g: Cyl(0.21, 0.19, 0.05), m: M(0, 0.54, 0), c: PAL.paper[3] },
              { g: Sph(0.042, 7, 5), m: M(-0.05, 0.50, 0.205), c: PLC.red }, { g: Sph(0.042, 7, 5), m: M(0.05, 0.50, 0.205), c: PLC.red }, { g: Sph(0.03, 6, 4), m: M(0, 0.50, 0.225), c: PLC.red },
              { g: Sph(0.022, 5, 4), m: M(0, 0.42, 0.225), c: PAL.paper[3] }, { g: Sph(0.022, 5, 4), m: M(0, 0.35, 0.235), c: PAL.paper[3] }); },
          arm: function (L) { plPuff(L, PAL.paper[3]); plArmTube(L, PLC.skin, -0.05, -0.185); }, leg: PAL.paper[2] },   /* 볼록한 반소매 + 살결 팔 */
        knit: { torso: function (L) {   /* 니트: 둥근 목 띠 빨간 스웨터 + 허리에서 퍼지는 짧은 회색 플레어 — 종 모양 */
            L.push({ g: Cyl(0.21, 0.22, 0.20), m: M(0, 0.46, 0), c: PLC.red }, { g: Cyl(0.17, 0.17, 0.04), m: M(0, 0.56, 0), c: PAL.rose[1] }, { g: Cyl(0.19, 0.27, 0.14), m: M(0, 0.31, 0), c: PAL.slate[2] }, { g: Cyl(0.275, 0.275, 0.035), m: M(0, 0.255, 0), c: PAL.slate[1] }); },
          arm: function (L) { plSleeve(L, PLC.red, PAL.rose[1]); }, leg: PAL.paper[2] },
        hoodie: { torso: function (L) {   /* 후드: 회색 위아래 + 목 뒤 둥근 후드 + 앞 주머니 선 + 끈 두 가닥 */
            L.push({ g: Cyl(0.21, 0.23, 0.32), m: M(0, 0.40, 0), c: PAL.slate[3] }, { g: Sph(0.12, 10, 8), m: M(0, 0.58, -0.20), c: PAL.slate[3] }, { g: box(0.20, 0.035, 0.03), m: M(0, 0.33, 0.235), c: PAL.slate[2] },
              { g: box(0.03, 0.08, 0.03), m: M(-0.04, 0.50, 0.22), c: FIXED.white }, { g: box(0.03, 0.08, 0.03), m: M(0.04, 0.50, 0.22), c: FIXED.white }); },
          arm: function (L) { plSleeve(L, PAL.slate[3]); }, leg: PAL.navy[3], legR: [0.075, 0.07] },
        overall: { torso: function (L) {   /* 멜빵 (11-10 다시: 주인 "멜빵처럼 안 생겼다"): 흰 티가 몸통 전체 → 그 위에 **허리까지만 오는 진청 바지 + 좁은 가슴판 + 어깨로 넘어가는 끈 둘** — 끈 사이 · 가슴판 양옆으로 흰 티가 보여야 멜빵으로 읽힌다 (예전엔 가슴판과 바지가 같은 하늘색 한 덩어리 · 끈은 턱 밑에 숨었다).
                                             턱 아래로 보이는 몸통은 y 0.24~0.53 (화면 9 px): 바지 3 px · 가슴판 3 px · 끈 2 px. 가슴판 위 모서리에 노란 단추 둘, 가운데 주머니, 뒤는 X 자 끈 */
            var D = '#4a78b0', DK = '#33568a';
            L.push({ g: Cyl(0.20, 0.22, 0.32), m: M(0, 0.40, 0), c: PAL.paper[3] },
              { g: Cyl(0.228, 0.25, 0.13), m: M(0, 0.305, 0), c: D }, { g: Cyl(0.236, 0.238, 0.028), m: M(0, 0.378, 0), c: DK },
              { g: box(0.18, 0.10, 0.05), m: M(0, 0.425, 0.20), c: D }, { g: box(0.07, 0.04, 0.02), m: M(0, 0.415, 0.23), c: DK },
              { g: box(0.042, 0.14, 0.04), m: M(-0.07, 0.535, 0.185, -0.18, 0, 0), c: D }, { g: box(0.042, 0.14, 0.04), m: M(0.07, 0.535, 0.185, -0.18, 0, 0), c: D },
              { g: box(0.042, 0.03, 0.30), m: M(-0.075, 0.588, 0), c: D }, { g: box(0.042, 0.03, 0.30), m: M(0.075, 0.588, 0), c: D },
              { g: box(0.042, 0.27, 0.04), m: M(0, 0.49, -0.212, 0.12, 0, 0.42), c: D }, { g: box(0.042, 0.27, 0.04), m: M(0, 0.49, -0.212, 0.12, 0, -0.42), c: D },
              { g: Sph(0.028, 6, 5), m: M(-0.07, 0.47, 0.232), c: PAL.amber[3] }, { g: Sph(0.028, 6, 5), m: M(0.07, 0.47, 0.232), c: PAL.amber[3] }); },
          arm: function (L) { plPuff(L, PAL.paper[3]); plArmTube(L, PLC.skin, -0.05, -0.185); }, leg: '#4a78b0', legR: [0.078, 0.072], cuff: true },   /* 짧은 소매 + 살결 팔 */
        hanbok: { torso: function (L) {   /* 한복: 짧은 미색 저고리 + 가슴에서 퍼지는 다홍 치마 + 분홍 고름 두 가닥 + 흰 동정 */
            var JE = '#f4ecd8', CH = '#d8425a', CD = '#a82f48', GO = '#f08aa8';
            L.push({ g: Cyl(0.20, 0.215, 0.12), m: M(0, 0.50, 0), c: JE }, { g: Cyl(0.215, 0.33, 0.27), m: M(0, 0.325, 0), c: CH }, { g: Cyl(0.335, 0.338, 0.03), m: M(0, 0.20, 0), c: CD },
              { g: box(0.03, 0.11, 0.03), m: M(-0.035, 0.515, 0.203, 0, 0, -0.5), c: '#ffffff' }, { g: box(0.03, 0.11, 0.03), m: M(0.035, 0.515, 0.203, 0, 0, 0.5), c: '#ffffff' },
              { g: box(0.04, 0.16, 0.03), m: M(0.045, 0.40, 0.25, 0, 0, 0.12), c: GO }, { g: box(0.04, 0.12, 0.03), m: M(0.10, 0.42, 0.245, 0, 0, 0.3), c: GO }, { g: Sph(0.03, 6, 5), m: M(0.06, 0.475, 0.225), c: GO }); },
          arm: function (L) { plPuff(L, '#f4ecd8'); L.push({ g: Cyl(0.045, 0.07, 0.155, 10), m: M(0, -0.108, 0), c: '#f4ecd8' }, { g: Cyl(0.072, 0.072, 0.03, 10), m: M(0, -0.172, 0), c: '#d8425a' }); }, leg: PAL.paper[3] },   /* 넓어지는 소매 + 끝동 */
        uniform: { torso: function (L) {   /* 교복: 흰 셔츠 + 남색 재킷(앞섶이 열려 셔츠가 보인다) + 빨간 넥타이 + 회색 체크 치마 + 가슴 배지 */
            var BZ = PAL.navy[3], SK = PAL.slate[2];
            L.push({ g: Cyl(0.20, 0.22, 0.32), m: M(0, 0.40, 0), c: PAL.paper[3] }, { g: new T.CylinderGeometry(0.215, 0.235, 0.21, 14, 1, false, 20 * DEG, 320 * DEG), m: M(0, 0.455, 0), c: BZ },
              { g: box(0.036, 0.13, 0.03), m: M(0, 0.47, 0.212), c: '#c8323a' }, { g: Sph(0.024, 5, 4), m: M(0.11, 0.51, 0.20), c: PAL.amber[3] },
              { g: Cyl(0.232, 0.30, 0.12), m: M(0, 0.295, 0), c: SK }, { g: Cyl(0.283, 0.292, 0.022), m: M(0, 0.262, 0), c: PAL.slate[1] }, { g: Cyl(0.252, 0.262, 0.018), m: M(0, 0.315, 0), c: PAL.slate[1] }); },
          arm: function (L) { plSleeve(L, PAL.navy[3], PAL.paper[3]); }, leg: PAL.navy[2] },
        varsity: { torso: function (L) {   /* 야구점퍼: 빨간 몸판 + 흰 소매 · 흰 깃과 밑단 줄 + 가슴 글자 + 청바지 */
            var RD = '#b8322e', WH = '#f1ede2', DN = '#3f5f8f';
            L.push({ g: Cyl(0.215, 0.238, 0.25), m: M(0, 0.435, 0), c: RD }, { g: Cyl(0.172, 0.172, 0.035), m: M(0, 0.565, 0), c: WH }, { g: Cyl(0.241, 0.241, 0.035), m: M(0, 0.315, 0), c: WH },
              { g: box(0.075, 0.085, 0.02), m: M(-0.085, 0.47, 0.222), c: WH }, { g: box(0.02, 0.2, 0.02), m: M(0.01, 0.44, 0.236), c: '#8a2420' },
              { g: Cyl(0.225, 0.235, 0.07), m: M(0, 0.27, 0), c: DN }); },
          arm: function (L) { plSleeve(L, '#f1ede2', '#b8322e'); }, leg: '#3f5f8f', legR: [0.075, 0.07] },
        flannel: { torso: function (L) {   /* 체크셔츠: 빨간 플란넬에 어두운 가로줄 둘 · 앞 여밈 줄 + 흰 티 목선 + 청바지 */
            var RD = '#b4423a', DK = '#5a2a2a', DN = '#3f5f8f';
            L.push({ g: Cyl(0.21, 0.232, 0.28), m: M(0, 0.42, 0), c: RD }, { g: Cyl(0.223, 0.226, 0.028), m: M(0, 0.47, 0), c: DK }, { g: Cyl(0.229, 0.232, 0.028), m: M(0, 0.37, 0), c: DK },
              { g: box(0.03, 0.27, 0.02), m: M(0, 0.42, 0.232), c: DK }, { g: box(0.03, 0.27, 0.02), m: M(0.12, 0.42, 0.195), c: DK }, { g: box(0.03, 0.27, 0.02), m: M(-0.12, 0.42, 0.195), c: DK },
              { g: Cyl(0.165, 0.165, 0.03), m: M(0, 0.565, 0), c: PAL.paper[3] }, { g: Cyl(0.225, 0.235, 0.06), m: M(0, 0.265, 0), c: DN }); },
          arm: function (L) { plSleeve(L, '#b4423a', '#5a2a2a'); }, leg: '#3f5f8f', legR: [0.075, 0.07] },
        raincoat: { torso: function (L) {   /* 비옷: 어깨에서 밑단까지 넓게 퍼지는 주황 사다리꼴 + 후드 + 단추 줄 */
            L.push({ g: Cyl(0.21, 0.30, 0.36), m: M(0, 0.38, 0), c: PLC.orange }, { g: Sph(0.12, 10, 8), m: M(0, 0.58, -0.20), c: PLC.orange },
              { g: Sph(0.022, 5, 4), m: M(0, 0.48, 0.24), c: PAL.wood[1] }, { g: Sph(0.022, 5, 4), m: M(0, 0.40, 0.26), c: PAL.wood[1] }, { g: Sph(0.022, 5, 4), m: M(0, 0.32, 0.28), c: PAL.wood[1] }); },
          arm: function (L) { plSleeve(L, PLC.orange, PAL.amber[1]); }, leg: PAL.paper[2] } },
      shoes: {   /* len = 그 위에 남는 다리 색 원기둥 길이 (엉덩이 y 0 → 바닥 −0.24). 폭 ≤ 0.16 → 두 신발 틈 0.07 (2 px) */
        flat: { len: 0.18, parts: function (L) { L.push({ g: box(0.16, 0.06, 0.18), m: M(0, -0.21, 0.01), c: PAL.slate[1] }); } },   /* 단화(기본): 어두운 회색 납작 덩어리 (갈색은 바닥 널에 묻힌다) */
        boot: { len: 0.06, parts: function (L) { L.push({ g: box(0.15, 0.12, 0.18), m: M(0, -0.18, 0.01), c: PAL.navy[1] }, { g: box(0.16, 0.06, 0.19), m: M(0, -0.09, 0.01), c: PAL.navy[3] }); } },   /* 부츠: 통 + 커프, 위에 타이츠 띠 0.06 */
        sneaker: { len: 0.12, parts: function (L) { L.push({ g: box(0.15, 0.06, 0.18), m: M(0, -0.15, 0.01), c: PLC.red }, { g: box(0.16, 0.06, 0.19), m: M(0, -0.21, 0.01), c: FIXED.white }); } },   /* 운동화: 빨간 몸체 + 밝은 밑창 줄 */
        loafer: { len: 0.11, parts: function (L) { L.push({ g: box(0.15, 0.06, 0.17), m: M(0, -0.21, 0.015), c: PAL.rose[0] }, { g: Sph(0.065, 7, 5), m: M(0, -0.21, 0.09), c: PAL.rose[0] }, { g: Cyl(0.075, 0.07, 0.07, 8), m: M(0, -0.145, 0), c: FIXED.white }); } } } };   /* 로퍼: 둥근 앞코 + 흰 양말 한 칸 */
    /* 7 메시의 부품 목록 (cfg 는 normalizePlayer 를 거친 것) */
    function plHeadParts(cfg) {
      var hair = plPart('hairColor', cfg.hairColor).hex;
      var L = [{ g: Sph(PL_HEAD_R, 18, 13), m: M(0, PL_HEAD_Y, 0, 0, 0, 0, 1, 0.98, 0.94), c: PLC.skin }];   /* 살결 머리 구 (얼굴 앞면 z 0.329). 눈 · 코 · 입 · 볼은 이 구 위의 텍스처 조각(plEyeParts) — 눈썹 없음 */
      PL_BANG = cfg.bangs; PL_PARTS.hair[cfg.hair](L, cfg, hair); PL_PARTS.acc[cfg.acc](L, cfg);
      return L;
    }
    function plEyeParts(cfg) { return [-1, 1].map(function (s) { return { g: plEyePatch(s), c: '#ffffff', tag: s < 0 ? 1 : 2 }; }).concat(plFacePatches(cfg)); }   /* 눈 = 곡면 조각 2장 (정점색 흰색 → 텍스처색이 알베도), tag 1 왼눈 · 2 오른눈 (plEyeUV 의 아틀라스 칸). 스타일·색은 지오메트리가 아니라 아틀라스 그림 */
    /* 옷 물들이기 (11-10 주인: "염료는 직접 기르는 걸로 · 옷 색도 바꿀 수 있게"): PL_DYE 가 있으면 지금 옷의 바탕색(OUTFIT_MAIN 첫째)을 그 색으로, 둘째부터(밑단 · 띠 같은 어두운 짝)는 한 톤 어둡게. 흰 깃 · 단추 · 살결은 그대로 */
    var PL_DYE = null, OUTFIT_MAIN = { dress: [PAL.navy[3], PAL.navy[2]], knit: [PLC.red, PAL.rose[1]], hoodie: [PAL.slate[3], PAL.slate[2]], overall: ['#4a78b0', '#33568a'], raincoat: [PLC.orange, PAL.amber[1]],
      hanbok: ['#d8425a', '#a82f48'], uniform: [PAL.navy[3]], varsity: ['#b8322e', '#8a2420'], flannel: ['#b4423a', '#5a2a2a'] };
    function plDye(L, cfg) {
      if (!PL_DYE) return L;
      var mains = (OUTFIT_MAIN[cfg.outfit] || []).map(function (c) { return String(c).toLowerCase(); }), dk = mixHex(PL_DYE, FIXED.ink, 0.28);
      L.forEach(function (p) { var i = mains.indexOf(String(p.c).toLowerCase()); if (i === 0) p.c = PL_DYE; else if (i > 0) p.c = dk; });
      return L;
    }
    function setPlayerDye(hex) { PL_DYE = /^#[0-9a-f]{6}$/i.test(hex || '') ? hex.toLowerCase() : null; setPlayer(PL.look); return PL_DYE; }
    function plTorsoParts(cfg) { var L = []; PL_PARTS.outfit[cfg.outfit].torso(L); return plDye(L, cfg); }
    function plArmParts(cfg) { var L = []; PL_PARTS.outfit[cfg.outfit].arm(L); plDye(L, cfg); L.push({ g: Sph(0.064, 9, 7), m: M(0, -0.225, 0), c: PLC.skin }); return L; }   /* 소매 + 팔 + 동그란 손 (팔 지름 2 px 보다 큰 3.5 px 공) */
    function plLegParts(cfg) {   /* 다리 색 원기둥(신발 위만) + 신발 */
      var o = PL_PARTS.outfit[cfg.outfit], s = PL_PARTS.shoes[cfg.shoes], r = o.legR || [0.07, 0.068], L = [{ g: Cyl(r[0], r[1], s.len, 8), m: M(0, -s.len / 2, 0), c: o.leg }];
      if (o.cuff && s.len > 0.15) L.push({ g: Cyl(0.08, 0.08, 0.04, 8), m: M(0, -0.17, 0), c: PAL.paper[2] });   /* 멜빵 바지 접은 단 (단화일 때만 보인다) */
      plDye(L, cfg); s.parts(L); return L;
    }
    function plGeos(cfg) { plSkin(cfg); return [plHeadParts(cfg), plEyeParts(cfg), plTorsoParts(cfg), plArmParts(cfg), plArmParts(cfg), plLegParts(cfg), plLegParts(cfg)].map(mergeParts); }
    var PL_LOOK0 = normalizePlayer(opts.player), plGeo0 = plGeos(PL_LOOK0);
    function plMesh(g, x, y, cast, mat) { var m = new T.Mesh(keep(g), mat || toonP); m.castShadow = cast !== false; m.receiveShadow = true; if (x != null) m.position.set(x, y, 0); plBody.add(m); return m; }
    var plHead = plMesh(plGeo0[0]), plEyes = plMesh(plGeo0[1], null, 0, false, toonEye), plTorso = plMesh(plGeo0[2]);
    function plEyeBase() { var g = plEyes.geometry; g.userData.uv0 = Float32Array.from(g.attributes.uv.array); }   /* 눈 지오메트리의 0~1 uv 를 따로 보관 (plEyeUV 가 아틀라스 칸으로 사상한다) */
    plEyeBase();
    var plArmL = plMesh(plGeo0[3], -0.24, 0.50), plArmR = plMesh(plGeo0[4], 0.24, 0.50), plLegL = plMesh(plGeo0[5], -0.115, 0.24), plLegR = plMesh(plGeo0[6], 0.115, 0.24);   /* 어깨 ±0.24(소매 바깥 2.4 px 가 몸통 밖) · 엉덩이 ±0.115(두 신발 틈 0.07) */
    var plMeshes = [plHead, plEyes, plTorso, plArmL, plArmR, plLegL, plLegR], plLimbs = [plArmL, plArmR, plLegL, plLegR];
    var plDecal = new T.Mesh(keep(new T.PlaneGeometry(0.95, 0.95)), decalMat); plDecal.rotation.x = -Math.PI / 2; plDecal.position.y = 0.012; plDecal.renderOrder = 1; plG.add(plDecal);   /* 접지 그림자 (문어와 같은 데칼) */
    var PL = { place: 'attic', pos: new T.Vector3(PL_REST.attic[0], 0, PL_REST.attic[2]), yaw: 0, wantYaw: 0, faceCam: true, walking: null, pending: '', phase: 0, n: 0, last: new T.Vector3(), moving: false, antic: 0, settleT: 9, t: 0, stick: false, held: false, heldStop: false, pushed: false, dir8: null,
      blinkT: 4 + (hash('plblink') % 1000) / 1000 * 3, blinkLeft: 0, shut: false, lod: 1, walks: 0, look: PL_LOOK0 };   /* shut = 눈 uv 가 지금 '감은 눈' 칸인가 · lod = 눈 아틀라스 줄(0 · 1 · 2, plEyeLod) · look = 정규화된 cfg · stick·held·heldStop·pushed·dir8 = 움직이기 상태(아래 '움직이기') */
    plDrawEyes(PL_LOOK0); plEyeLod(); plEyeUV();   /* 첫 눈 그림 + 지금 N 의 LOD 칸 — prewarm(renderer.compile) 전이라 toonEye 가 처음부터 눈 텍스처로 컴파일된다 */
    PL.last.copy(PL.pos);
    /* ── 움직이기 (주인 11-08 결정: 왼쪽 아래 발자국 손잡이(가상 스틱) + 데스크톱 방향키 · 바닥 톡 없음): 앱이 setPlayerInput({ x, y }) 로 화면 축 벡터(오른쪽 +x · 위 +y · 길이 0..1)를 주면 매 프레임 PL.pos 를 v × 1.2 m/s × dt 만큼 민다.
       화면 → 월드: 카메라 우축 _r 의 수평 성분 = 화면 오른쪽, 그에 수직인 '카메라에서 멀어지는' 수평 방향 = 화면 위 (placeCamera 가 쓰는 _r). 걷는 동안은 plWalkTo 와 같은 걸음 코드(간 거리 위상 · 4프레임 · 8방향 계단 · 디딤 −1 px).
       스틱이 들어오면 가던 길(쉬는 자리 등)은 취소되고 PL.pending 도 지운다. 막는 때 = playerInputAllowed() false: 입장 연출 · 문 작업(DQ.active/pending — 문 앞까지 걷는 동안 포함) · 전환 · 캐릭터가 보이는 방에 없을 때 · 놀이 kit.
       범위·장애물: 방 안쪽 0.35 m · 장애물 AABB(코드의 실제 좌표)를 캐릭터 반지름 0.25 만큼 키움 · 문어는 r 0.6 둥근 장애물 — 전체 → x 만 → z 만 순서로 시도해 벽을 따라 미끄러진다.
       이미 겹쳐 있으면(다락 쉬는 자리가 상자 둘레 0.25 안에 4 cm 들어 있다) 더 파고드는 움직임만 막는다. 문 앞 앵커 자리(놀이방 문 x −1.35 = 안쪽 경계)는 갈 수 있다. 스틱으로 간 자리는 저장하지 않는다 */
    var PL_IN = { v: null, held: false, allowed: null, dir: new T.Vector3(0, 0, 1), rh: new T.Vector3(), fh: new T.Vector3() }, PL_RAD = 0.25, PL_MARGIN = 0.35, PL_OCT_R = 0.6;
    function setPlayerInput(v) {   /* v = 객체면 '잡고 있다'(held — 데드존 { 0, 0 } 도 잡고만 있는 것: 멈추되 카메라 쪽으로 돌지 않고 도착 눌림은 놓을 때 한 번) · null = 놓음. 막힌 때(playerInputAllowed false)는 받지 않는다 */
      if (!v || !isFinite(+v.x) || !isFinite(+v.y) || !playerInputAllowed()) { PL_IN.v = null; PL_IN.held = false; return; }
      var x = +v.x, y = +v.y, l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
      PL_IN.held = true;
      PL_IN.v = l > 1e-6 ? { x: x, y: y } : null;
    }
    function playerInputAllowed() {   /* '보이는 때' 규칙: 캐릭터가 지금 그려지는 방(다락·놀이방)에 있고, 연출·문 작업·전환·놀이 kit 이 아니다 */
      return ready && !INTRO.on && !DQ.active && !DQ.pending && !PLACE.trans && !PLAY && (PLACE.vis === 'attic' || isRoomP(PLACE.vis)) && PL.place === PLACE.vis && plG.parent === groupOf(PLACE.vis) && plG.parent.visible;
    }
    function plLim() { return PL.place === 'play' ? [-(PLAY_R - PL_MARGIN), PLAY_R - PL_MARGIN] : PL.place === 'loft' ? [-(LOFT_R - PL_MARGIN), LOFT_R - PL_MARGIN] : [-(R - PL_MARGIN), RF - PL_MARGIN]; }   /* 걸을 수 있는 범위 [낮은 쪽, 높은 쪽] (x · z 같은 값 — 다락은 앞쪽이 RF 까지) */
    function plInRoom(x, z) { var l = plLim(); return x >= l[0] && x <= l[1] && z >= l[0] && z <= l[1]; }
    function plBoxes() {   /* 지금 방의 장애물 [x0, x1, z0, z1] (반지름만큼 키운 것) — 소품 위치·치수를 코드에서 읽는다. 담요·깔개는 밟아도 된다 */
      var out = [], r = PL_RAD;
      function bx(cx, cz, hw, hd) { out.push([cx - hw - r, cx + hw + r, cz - hd - r, cz + hd + r]); }
      if (PL.place === 'attic') {
        var cid = FU.carry && FU.carry.id;   /* 들고 있는 가구는 길을 막지 않는다 */
        if (cid !== 'sofa') bx(FURN.sofa.m.position.x, FURN.sofa.m.position.z, FURN.sofa.hw - 0.02, FURN.sofa.hd);   /* 소파 (늘 있다 · 옮긴 자리 · 돌린 방향 그대로) */
        if (props.crate.visible && cid !== 'crate') bx(props.crate.position.x, props.crate.position.z, FURN.crate.hw, FURN.crate.hd);   /* 상자 더미 1.04 × 0.88 (양초는 그 위) */
        if (props.moss.visible) bx(props.moss.position.x, props.moss.position.z, 0.22, 0.22);     /* 창가 화분 */
        if (props.curtain.visible) { bx(props.curtain.position.x, WIN.z0 - 0.3, 0.04, 0.25); bx(props.curtain.position.x, WIN.z1 + 0.3, 0.04, 0.25); }   /* 커튼 천 두 폭 */
        bx((STAIR.x0 + STAIR.x1) / 2, (STAIR.z0 + STAIR.z1) / 2, (STAIR.x1 - STAIR.x0) / 2, (STAIR.z1 - STAIR.z0) / 2);   /* 위층 계단 (발치에서 +x 로 밀면 올라간다) */   /* 미용실 병 선반 (뒷벽) */
      } else if (PL.place === 'play' && PROOM) {
        var mb = PROOM.machineBox, cb = PROOM.counterBox;
        out.push([mb.min.x - r, mb.max.x + r, mb.min.z - r, mb.max.z + r], [cb.min.x - r, cb.max.x + r, cb.min.z - r, cb.max.z + r]); var lb = PROOM.legBox; out.push([lb.min.x - r, lb.max.x + r, lb.min.z - r, lb.max.z + r]);   /* ㄱ자 다리 */
      } else if (PL.place === 'loft' && LROOM) {
        LROOM.boxes.forEach(function (q) { bx(q[0], q[1], q[2], q[3]); });
        if (salG.visible) bx(SALC.x + LSAL.dx, SALC.sz + LSAL.dz, SALC.sw / 2, 0.06);   /* 미용실 병 선반 (위층 뒷벽) */   /* 오락기 · 부엌 조리대 */
      }
      return out;
    }
    function plCircles() {   /* 둥근 장애물 [x, z, r]: 문어(같은 방에 보일 때 · 미용실 앞에 있어도) · '바꾸기' 중 대야 */
      var out = [];
      if (PL.place === 'attic') {
        if (octG.parent === atticG && octG.visible && st.octState !== 'away') out.push([oct.pos.x, oct.pos.z, PL_OCT_R]);
      } else if (PL.place === 'loft') {
        if (octUp() && octG.visible) out.push([oct.pos.x + LSAL.dx, oct.pos.z + LSAL.dz, PL_OCT_R]);
        if (salG.visible && salE.visible) out.push([SALC.tx + LSAL.dx, SALC.tz + LSAL.dz, 0.30 + PL_RAD]);
      }
      return out;
    }
    function plPen(x, z, boxes, circles) {   /* (x, z) 가 장애물에 파고든 깊이 (0 = 밖) */
      var p = 0, i, b, d;
      for (i = 0; i < boxes.length; i++) { b = boxes[i]; d = Math.min(x - b[0], b[1] - x, z - b[2], b[3] - z); if (d > p) p = d; }
      for (i = 0; i < circles.length; i++) { b = circles[i]; d = b[2] - Math.hypot(x - b[0], z - b[1]); if (d > p) p = d; }
      return p;
    }
    function plAvoidOct(to) {   /* 문어 걷기 시작(moveTo · 의식 · 미용실 · 놀이 kit — walkPoint): 목표점이 내 캐릭터에서 r 0.6 안이면 목표 둘레(0.6 + 0.1) 위 8방향 중 비어 있고 가장 가까운 자리로 미리 걸어 비켜선다 — 두 캐릭터가 한 자리에 겹치지 않게 (리뷰 11-09).
                                   스틱을 쥐고 있거나 · 이미 걷는 중(문 앞 걷기 등) · 막힌 때(다른 방이 보임 · 문 작업)는 안 한다 — 그땐 stepPlayer 의 밀려나기가 받는다 */
      if (PL.place !== 'attic' || plG.parent !== atticG || PL.walking || PL_IN.held || !playerInputAllowed()) return;
      var dx = PL.pos.x - to.x, dz = PL.pos.z - to.z; if (Math.hypot(dx, dz) >= PL_OCT_R) return;
      var boxes = plBoxes(), rr = PL_OCT_R + 0.1, a0 = Math.atan2(dx, dz), best = null, bd = Infinity;
      for (var i = 0; i < 8; i++) {
        var a = a0 + i * Math.PI / 4, x = to.x + Math.sin(a) * rr, z = to.z + Math.cos(a) * rr;
        if (!plInRoom(x, z) || plPen(x, z, boxes, []) > 0) continue;
        var d = Math.hypot(x - PL.pos.x, z - PL.pos.z); if (d < bd) { bd = d; best = [x, z]; }
      }
      if (best) plWalkTo(new T.Vector3(best[0], 0, best[1]), null);
    }
    function plMove(dx, dz) {   /* → 실제로 움직였나. 방 안쪽 범위로 자르고 장애물은 전체 → x 만 → z 만 (미끄러짐). 이미 겹쳐 있으면 더 파고들지 않는 쪽만 */
      var lm = plLim(), boxes = plBoxes(), circ = plCircles();
      var x0 = PL.pos.x, z0 = PL.pos.z, p0 = plPen(x0, z0, boxes, circ) + 1e-6;
      var nx = clamp(x0 + dx, lm[0], lm[1]), nz = clamp(z0 + dz, lm[0], lm[1]);
      if (plPen(nx, nz, boxes, circ) <= p0) PL.pos.set(nx, 0, nz);
      else if (plPen(nx, z0, boxes, circ) <= p0) PL.pos.x = nx;
      else if (plPen(x0, nz, boxes, circ) <= p0) PL.pos.z = nz;
      return Math.abs(PL.pos.x - x0) + Math.abs(PL.pos.z - z0) > 1e-9;
    }
    /* 발자국: InstancedMesh 하나(최대 16) · 작은 평면 0.16 × 0.21 m(1× 에서 4×5 px) 에 6×8 캔버스 알파 발 모양(둥근 앞 + 작은 뒤꿈치, NearestFilter) · 재질은 불투명 널 틈 색 #394a50(depthWrite false · renderOrder 1 · 바닥 위 0.011 — 담요 위 0.13 · 깔개 위 0.021, plFloorY).
       반투명 잉크(opacity 0.35)는 팔레트 스냅(OKLab)에 먹혀 바닥 널 색으로 되돌아가 1× 에서 아무것도 안 보였다(리뷰 11-09 — 678행 주석의 그 현상) → 스냅에서 살아남는 불투명 한 색으로 '바닥에 패인 자국' 처럼.
       걸음마다(디딤 프레임 1 · 3 — 0.2 m 마다 왼·오 번갈아) 하나, 진행 축에서 ±0.07 m 옆, 진행 방향으로 회전. 인스턴스 알파가 없어 배율 3단(1 → 0.75 → 0.5 → 숨김, 각 0.7 s)으로 옅어진다 — 12 fps 스텝 (0.3 배율은 1× 에서 1 px 미만이라 스냅에서 사라졌다).
       방 그룹의 자식(plG 와 같이 옮기지 않는다) — 방이 바뀌면(plEnter) 비우고 새 방 그룹으로. 모션 감소면 자국 없음. USE_INSTANCING 으로 MeshBasic·노멀 프로그램이 하나씩 늘지만 부팅 첫 프레임(인스턴스 0개라도 그린다)에 컴파일되므로
       '프로그램 수 그대로' 검사의 기준값(부팅 뒤)엔 들어 있다. 드로우콜 +2 (뷰티 패스 + 노멀 패스(overrideMaterial) 에 각각 — 자국이 보일 때만, 0개면 three 가 그리지 않는다). instanceMatrix 는 걸음·페이드 틱마다 다시 올리니 DynamicDrawUsage */
    var FP_N = 16, FP_STAGE = 0.7, FP_SCALE = [1, 0.75, 0.5];
    function footTex() {   /* 6×8 알파 발 모양: 평면 0.16 × 0.21 m 에 → 1× 에서 ≈ 4×5 px · 2× 에서 ≈ 8×11 px (텍셀은 NearestFilter 로 늘어난다) */
      var cv = document.createElement('canvas'); cv.width = 6; cv.height = 8;
      var cx = cv.getContext('2d'), im = cx.createImageData(6, 8), rows = ['.XXXX.', 'XXXXXX', 'XXXXXX', 'XXXXXX', '.XXXX.', '......', '.XXXX.', '..XX..'];
      for (var y = 0; y < 8; y++) for (var x = 0; x < 6; x++) { var i = (y * 6 + x) * 4, on = rows[y][x] === 'X'; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = on ? 255 : 0; }
      cx.putImageData(im, 0, 0);
      var t = new T.CanvasTexture(cv); t.minFilter = t.magFilter = T.NearestFilter; t.generateMipmaps = false;
      return t;
    }
    var fpGeo = keep(new T.PlaneGeometry(0.16, 0.21)); fpGeo.rotateX(-Math.PI / 2); fpGeo.rotateY(Math.PI);   /* 바닥에 눕히고 그림 위쪽(발끝)이 +z = 진행 방향 */
    var fpMat = keep(new T.MeshBasicMaterial({ map: keep(footTex()), color: C('#394a50'), transparent: true, opacity: 1, depthWrite: false }));
    var fpMesh = keep(new T.InstancedMesh(fpGeo, fpMat, FP_N)); fpMesh.name = 'footprints'; fpMesh.count = 0; fpMesh.frustumCulled = false; fpMesh.castShadow = false; fpMesh.receiveShadow = false; fpMesh.renderOrder = 1; fpMesh.instanceMatrix.setUsage(T.DynamicDrawUsage); atticG.add(fpMesh);
    var FP = { list: [], acc: 0, m: new T.Matrix4(), p: new T.Vector3(), q: new T.Quaternion(), s: new T.Vector3(), ay: new T.Vector3(0, 1, 0) };
    function fpLayout() {
      FP.list.forEach(function (f, i) { var s = FP_SCALE[f.k] || 0; FP.q.setFromAxisAngle(FP.ay, f.yaw); FP.m.compose(FP.p.set(f.x, f.y, f.z), FP.q, FP.s.set(s, 1, s)); fpMesh.setMatrixAt(i, FP.m); });
      fpMesh.count = FP.list.length; fpMesh.instanceMatrix.needsUpdate = true;
    }
    function fpClear(g) { FP.list = []; FP.acc = 0; fpMesh.count = 0; if (g && fpMesh.parent !== g) g.add(fpMesh); }
    function plFloorY(x, z) {   /* 자국이 놓일 바닥 높이 (방 그룹 좌표): 담요(윗면 0.12 · 베개 0.155) · 다락 깔개(0.016) 위면 그 위로 — 밟아도 되는 소품이라 자국이 그 속에 묻히지 않게 (리뷰 11-09). 그 밖은 바닥 위 0.011 */
      if (PL.place === 'attic') {
        var b = props.blanket;
        if (b && b.visible && Math.abs(x - b.position.x) <= 0.7 && Math.abs(z - b.position.z) <= 0.5) return (Math.abs(x - b.position.x) <= 0.55 && Math.abs(z - (b.position.z - 0.25)) <= 0.15 ? 0.155 : 0.12) + 0.01;
        if (Math.abs(x - ATTIC_RUG.x) <= ATTIC_RUG.w / 2 && Math.abs(z - ATTIC_RUG.z) <= ATTIC_RUG.d / 2) return ATTIC_RUG.h + 0.005;
      }
      return 0.011;
    }
    function plFoot(side) {   /* 디딤 한 번 (왼 −1 · 오른 +1): on.playerStep() + 자국 하나 (16개가 다 차면 가장 오래된 것부터) */
      emit('playerStep');
      if (st.reduced) return;
      var d = PL_IN.dir, x = PL.pos.x + d.z * 0.07 * side, z = PL.pos.z - d.x * 0.07 * side;
      if (FP.list.length >= FP_N) FP.list.shift();
      FP.list.push({ x: x, y: plFloorY(x, z), z: z, yaw: Math.atan2(d.x, d.z), t: 0, k: 0 });
      fpLayout();
    }
    function stepFoot(dt) {   /* 12 fps 스텝으로 나이 → 단계 k = floor(t / 0.7) · 3 이상은 지운다 */
      if (!FP.list.length) return;
      FP.acc += dt; var ticks = Math.floor(FP.acc * 12 + 1e-6); if (ticks <= 0) return; FP.acc -= ticks / 12;
      var dirty = false, n0 = FP.list.length;
      FP.list.forEach(function (f) { f.t += ticks / 12; var k = Math.floor(f.t / FP_STAGE + 1e-6); if (k !== f.k) { f.k = k; dirty = true; } });
      FP.list = FP.list.filter(function (f) { return f.k < FP_SCALE.length; });
      if (dirty || FP.list.length !== n0) fpLayout();
    }
    var PPORT = { cache: {}, yaw: 0, tilt: 15 * DEG, dist: 10, hw: 1.5, down: -0.08, n: 0, ms: 0 };   /* 내 캐릭터 초상 프레이밍 (아래 playerPortrait): 정면 (요 0° — 11-09: 요 30° 는 코 · 입 · 볼 조각이 돌아가 4×5 칸에서 뭉개졌다. 얼굴을 고르는 미리보기라 정면이 맞다) · 반폭 1.5 r = 0.525 m · 타깃 y 0.95 → 화면 위 = (y − 0.95)·cos 15° + (카메라 쪽 거리)·sin 15° ≤ 0.525: 밀짚모자 크라운 앞 가장자리 (1.38, 0.33) → 0.501 ✓ (hw 1.3 · down 0.05 는 머리 꼭대기·모자·귀가 잘렸다 — 리뷰 11-08) */
    function setPlayer(cfg) {   /* 파츠 교체 (앱 설정 시트 '내 모습'): 모르는 범주·id 는 기본값 · 위치·걷기 상태(PL)는 그대로 · 7 메시의 지오메트리만 다시 만들고 옛것은 dispose(keep 목록에서도 교체) → 메시 수·드로우콜 불변. 초상 캐시는 비운다 */
      var look = normalizePlayer(cfg), geos = plGeos(look);
      plMeshes.forEach(function (m, i) { var old = m.geometry, k = disposables.indexOf(old); if (k >= 0) disposables.splice(k, 1); old.dispose(); m.geometry = keep(geos[i]); });
      PL.look = look; PL.shut = false; PPORT.cache = {}; dither.still = 0;
      plEyeBase(); plDrawEyes(look); plEyeUV();   /* 눈 아틀라스를 새 스타일·색으로 다시 그리고(텍스처 객체는 그대로, needsUpdate) 새 지오메트리의 uv 를 지금 LOD 칸으로 */
      return Object.assign({}, look);
    }
    function plSnap() { snapScreen(plG.position.copy(PL.pos)); }
    function plStop() { if (PL.walking) { PL.walking.cancel(); PL.walking = null; } PL.antic = 0; }
    function plFaceAfter(face) { PL.faceCam = face == null; PL.wantYaw = face == null ? camYaw() : face; }
    function plSegHits(ax, az, bx, bz, b) {   /* 선분 a→b 가 상자 [x0, x1, z0, z1] 를 지나나 (slab) */
      var t0 = 0, t1 = 1, dx = bx - ax, dz = bz - az;
      function slab(p, d, lo, hi) { if (Math.abs(d) < 1e-9) return p >= lo && p <= hi; var ta = (lo - p) / d, tb = (hi - p) / d; if (ta > tb) { var t = ta; ta = tb; tb = t; } t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); return t0 <= t1; }
      return slab(ax, dx, b[0], b[1]) && slab(az, dz, b[2], b[3]);
    }
    function plRoute(from, to) {   /* 경유점 (리뷰 11-09: 직선 lerp 는 상자 속을 걸어 지나갔다): 직선이 장애물 상자를 지나면 상자 모서리(둘레 +0.05) 하나 또는 이웃한 둘을 거친다 — 모든 선분이 상자를 안 지나는 길 중 가장 짧은 것. 없으면(출발·도착이 둘레 안 등) 직선 그대로 (plMove 가 미끄러뜨린다) */
      var boxes = plBoxes(), hit = null, i;
      for (i = 0; i < boxes.length; i++) if (plSegHits(from.x, from.z, to.x, to.z, boxes[i])) { hit = boxes[i]; break; }
      if (!hit) return [to];
      var m = 0.05, cs = [[hit[0] - m, hit[2] - m], [hit[1] + m, hit[2] - m], [hit[1] + m, hit[3] + m], [hit[0] - m, hit[3] + m]];   /* 모서리 4개, 둘레 순서 */
      function okPt(c) { return plInRoom(c[0], c[1]) && plPen(c[0], c[1], boxes, []) <= 0; }
      function free(ax, az, bx, bz) { for (var j = 0; j < boxes.length; j++) if (plSegHits(ax, az, bx, bz, boxes[j])) return false; return true; }
      function len(ax, az, bx, bz) { return Math.hypot(bx - ax, bz - az); }
      var best = null, bl = Infinity;
      cs.forEach(function (c, ci) {
        if (!okPt(c)) return;
        if (free(from.x, from.z, c[0], c[1]) && free(c[0], c[1], to.x, to.z)) { var l1 = len(from.x, from.z, c[0], c[1]) + len(c[0], c[1], to.x, to.z); if (l1 < bl) { bl = l1; best = [c]; } }
        [cs[(ci + 1) % 4], cs[(ci + 3) % 4]].forEach(function (c2) {
          if (!okPt(c2) || !free(from.x, from.z, c[0], c[1]) || !free(c[0], c[1], c2[0], c2[1]) || !free(c2[0], c2[1], to.x, to.z)) return;
          var l2 = len(from.x, from.z, c[0], c[1]) + len(c[0], c[1], c2[0], c2[1]) + len(c2[0], c2[1], to.x, to.z); if (l2 < bl) { bl = l2; best = [c, c2]; }
        });
      });
      return best ? best.map(function (c) { return new T.Vector3(c[0], 0, c[1]); }).concat([to]) : [to];
    }
    function plWalkTo(to, face) {   /* 점까지 걷기 → Promise<walked:boolean>. face = 도착해 볼 방향(rad, 없으면 카메라 쪽). 모션 감소 · 숨은 탭 · 컨텍스트 잃음 · 준비 전 · 5 cm 미만 = 바로.
                                       걸음은 스틱과 같은 plMove(1.8 m/s — 스틱은 2.2 · 범위·장애물 미끄러짐) 로 경유점(plRoute)을 차례로 — 목표 5 cm 안이면 도착(마지막 점은 정확히 그 자리로), 세 프레임 연속 못 움직이면 다음 점으로(마지막이면 거기서 끝) · 길이 × 1.5 + 0.3 s 가 지나면 끝 (Promise 가 걸리지 않게) */
      plStop();
      var from = PL.pos.clone(), d = to.clone().sub(from), dist = Math.hypot(d.x, d.z);
      if (st.reduced || ctxLost() || st.hidden || !ready || dist < 0.05) { PL.pos.copy(to); plFaceAfter(face); PL.yaw = PL.wantYaw; PL.moving = false; plSnap(); return Promise.resolve(false); }
      var pts = plRoute(from, to), total = 0, prev = from;
      pts.forEach(function (p) { total += Math.hypot(p.x - prev.x, p.z - prev.z); prev = p; });
      PL.faceCam = false; PL.wantYaw = Math.atan2(pts[0].x - from.x, pts[0].z - from.z);
      var dur = total / PL_SPEED * st.speed, hold = PL.moving ? 0 : PL_ANTIC * st.speed, k = 0, cancelled = false, stuck = 0;
      PL.antic = hold; PL.walks++;
      return new Promise(function (resolve) {
        function arrive(snap) { cancelled = true; if (snap) PL.pos.copy(to); PL.walking = null; PL.antic = 0; plFaceAfter(face); resolve(true); }
        PL.walking = { cancel: function () { cancelled = true; }, finish: function () { if (!cancelled) arrive(true); },
          step: function (dt) {
            if (cancelled) return;
            k += dt; PL.antic = Math.max(0, hold - k);
            if (k < hold) return;
            if (k - hold > dur * 1.5 + 0.3) { arrive(false); return; }
            var tg = pts[0], dx = tg.x - PL.pos.x, dz = tg.z - PL.pos.z, dd = Math.hypot(dx, dz), step = Math.min(dd, PL_SPEED * dt / (st.speed || 1));
            if (dd > 1e-6) { PL.wantYaw = Math.atan2(dx, dz); if (plMove(dx / dd * step, dz / dd * step) || plMove(dx / dd * step / 2, dz / dd * step / 2)) stuck = 0; else stuck++; }   /* 한 걸음이 장애물 둘레에 걸리면 반 걸음으로 한 번 더 (큰 dt 에서 둘레 앞까지 붙게) */
            dd = Math.hypot(tg.x - PL.pos.x, tg.z - PL.pos.z);
            if (dd < 0.05 || stuck >= 3) { if (pts.length > 1) { pts.shift(); stuck = 0; } else arrive(dd < 0.2); }   /* 마지막 점: 5 cm 안이면 도착 · 막혔어도 20 cm 안이면 그 자리로(쉬는 자리처럼 둘레 안에 둔 목표) · 더 멀면 거기서 끝(관통 금지) */
          } };
      });
    }
    function plRest(instant) { var r = PL_REST[PL.place] || PL_REST.attic, to = new T.Vector3(r[0], 0, r[2]); PL.pending = ''; if (instant) { plStop(); PL.pos.copy(to); plFaceAfter(null); PL.yaw = PL.wantYaw; PL.moving = false; plSnap(); } else plWalkTo(to, null); }
    function plEnter(to, from) {   /* 문 전환 가운데 프레임 (runDoor 의 swap): 들어온 방 문 앞에 서서 방 안쪽을 보고, 문이 닫히면 쉬는 자리로. 바깥(문어가 아직 산책 중)으로 나왔으면 내 캐릭터는 다락 쉬는 자리에 (안 보이는 곳에서 바로) */
      if (to === 'attic' || isRoomP(to)) {
        var g = groupOf(to); if (plG.parent !== g) g.add(plG); fpClear(g);
        var an = to === 'play' ? 'playAtticDoor' : to === 'loft' ? 'loftStair' : from === 'loft' ? 'atticStair' : 'atticPlayDoor', a = DOOR_ANCHORS[an];
        plStop(); PL.place = to; PL.pos.set(a[0], 0, a[2]); PL.yaw = PL.wantYaw = PL_FACE[an] + Math.PI; PL.faceCam = false; PL.moving = false; PL.phase = Math.ceil(PL.phase); PL.pending = ''; PL.doorArm = false; PL.doorCd = 0.5; plSnap();   /* 11-10: 문을 지난 뒤 혼자 쉬는 자리로 걸어가지 않는다 (주인 "자동으로 중앙으로 돌아가는 건 어색") — 들어온 문 앞에 그대로 선다 */
      } else { if (plG.parent !== atticG) atticG.add(plG); fpClear(atticG); PL.place = 'attic'; plRest(true); }
    }
    function playerWalkTo(anchor) {   /* goRoom 의 walkFirst: 문 앞 앵커까지 걷고 문 쪽을 보며 서면 푼다 → { ok, walked, anchor, at }. 그 방에 없으면(바깥에서 들어갈 때) 걷기 없이 바로 */
      var a = DOOR_ANCHORS[anchor], at = a ? a.slice() : [0, 0, 0], room = anchor === 'playAtticDoor' ? 'play' : anchor === 'loftStair' ? 'loft' : 'attic';
      if (!a || PL.place !== room || plG.parent !== groupOf(room)) return Promise.resolve({ ok: true, walked: false, anchor: anchor, at: at });
      PL.pending = '';
      return plWalkTo(new T.Vector3(a[0], 0, a[2]), PL_FACE[anchor]).then(function (walked) { return { ok: true, walked: walked, anchor: anchor, at: at }; });
    }
    function plFinish() { if (PL.walking && PL.walking.finish) PL.walking.finish(); if (PL.pending) plRest(true); }   /* 컨텍스트 잃음 · destroy: 걷던 길을 지금 도착시킨다 (Promise 는 푼다) */
    function plInfo() { return { place: PL.place, at: [+PL.pos.x.toFixed(3), 0, +PL.pos.z.toFixed(3)], walking: !!PL.walking || !!PL.stick, moving: !!PL.moving, pending: PL.pending, yaw: +(plG.rotation.y / DEG).toFixed(1), frame: PL.frame | 0, group: plG.parent ? plG.parent.name : '', visible: !!(plG.parent && plG.parent.visible), walks: PL.walks, height: PL_H, look: Object.assign({}, PL.look), input: PL_IN.v ? [+PL_IN.v.x.toFixed(3), +PL_IN.v.y.toFixed(3)] : null, footprints: FP.list.length }; }
    function plStand() {   /* 소파에서 내려온다 (앉는 쪽 앞 바닥으로 폴짝) */
      var f = FURN.sofa, a = sofaAx(), lm = plLim(), k = f.hw + 0.4;
      var to = new T.Vector3(clamp(PL.pos.x + a[0] * k, lm[0], lm[1]), 0, clamp(PL.pos.z + a[1] * k, lm[0], lm[1]));
      PL.sit = false; PL.hop = { t: 0, a: PL.pos.clone(), b: to, sit: false };
    }
    function playerSit() {   /* 소파 앞까지 걸어가 폴짝 뛰어 앉는다 → Promise<bool>. 앉은 채로는 소파가 보는 쪽을 본다 */
      var f = FURN.sofa;
      if (PL.place !== 'attic' || PLACE.vis !== 'attic' || PL.sit || PL.hop || FU.carry || !playerInputAllowed()) return Promise.resolve(false);
      var a = sofaAx(), sd = [-a[1], a[0]], cx = f.m.position.x, cz = f.m.position.z, lm = plLim();
      var side = ((PL.pos.x - cx) * sd[0] + (PL.pos.z - cz) * sd[1]) > 0 ? 0.27 * f.sc : -0.27 * f.sc;   /* 두 자리 중 가까운 쪽 */
      var seat = new T.Vector3(cx + a[0] * 0.10 * f.sc + sd[0] * side, 0.22 * f.sc, cz + a[1] * 0.10 * f.sc + sd[1] * side);
      var front = new T.Vector3(clamp(seat.x + a[0] * (0.72 * f.sc), lm[0], lm[1]), 0, clamp(seat.z + a[1] * (0.72 * f.sc), lm[0], lm[1]));
      var yaw = Math.atan2(a[0], a[1]);
      return plWalkTo(front, yaw + Math.PI).then(function () {
        if (PL.place !== 'attic' || PL_IN.v || PL.sit || PL.hop || FU.carry) return false;
        PL.sitYaw = yaw;
        if (st.reduced) { PL.pos.copy(seat); PL.sit = true; }
        else PL.hop = { t: 0, a: PL.pos.clone(), b: seat, sit: true };
        PL.faceCam = false; PL.wantYaw = yaw; return true;
      });
    }
    function stepPlayer(dt) {
      PL.doorCd = Math.max(0, (PL.doorCd || 0) - dt);   /* 문으로 막 들어온 뒤의 짧은 쉼 — 스틱을 쥐든 안 쥐든 흐른다 */
      PL.t += dt;
      var allowed = playerInputAllowed();
      if (!allowed) { PL_IN.v = null; PL_IN.held = false; }   /* 막힌 동안은 매 프레임 누르던 입력을 놓는다 (전이 프레임만 지우면 막힌 채 들어온 입력이 남아 방이 다시 보일 때 입력 없이 움직였다 — 리뷰 11-09) */
      if (allowed !== PL_IN.allowed) { PL_IN.allowed = allowed; emit('playerInput', allowed); }   /* 바뀔 때만 (앱이 스틱 hidden 을 쥔다) */
      var v = PL_IN.v, held = PL_IN.held, stick = false, pushed = false;
      if (PL.hop) {   /* 폴짝: 0.34 s 포물선 (앉기 · 내려오기) */
        var hp = PL.hop; hp.t += dt; var hk = Math.min(1, hp.t / 0.34);
        PL.pos.lerpVectors(hp.a, hp.b, hk); PL.pos.y = hp.a.y + (hp.b.y - hp.a.y) * hk + 0.3 * Math.sin(Math.PI * hk);
        if (hk >= 1) { PL.pos.copy(hp.b); PL.sit = hp.sit; PL.hop = null; PL.settleT = 0; }
      }
      if (v && PL.sit && !PL.hop) plStand();   /* 앉아 있다가 스틱 · 방향키를 밀면 일어난다 */
      if (PL.hop || PL.sit) v = null;
      if (v) {   /* 스틱 · 방향키: 가던 길(쉬는 자리 등)은 취소, 화면 축 → 월드 수평 축, 범위·장애물 보정 뒤 적용. 막혀서 한 발짝도 못 가면 서서 그쪽을 본다 */
        if (PL.walking) plStop(); PL.pending = ''; PL.antic = 0; PL.heldStop = false;
        PL_IN.rh.set(_r.x, 0, _r.z).normalize(); PL_IN.fh.set(PL_IN.rh.z, 0, -PL_IN.rh.x);   /* 화면 오른쪽 · 화면 위 = 카메라에서 멀어지는 수평 방향 */
        var wx = PL_IN.rh.x * v.x + PL_IN.fh.x * v.y, wz = PL_IN.rh.z * v.x + PL_IN.fh.z * v.y, step = PL_RUN * dt / (st.speed || 1);   /* 스틱 · 방향키는 종종 달리기 2.2 m/s (주인 11-10 "억지로 느리게 한 느낌" — 1.2 는 방 하나 건너는 데 4초였다). 문 앞까지 혼자 걷기는 1.8 */
        stick = plMove(wx * step, wz * step);
        PL.faceCam = false; PL.wantYaw = Math.atan2(wx, wz);
        /* 문에 닿은 채 문 쪽으로 걸으면 넘어간다 (주인 11-10 "닿은 채로 걸어가면 슥 넘어가는"): 문 앞 앵커 0.45 m 안에서 문이 있는 벽 쪽(다락 문 = +x · 놀이방 문 = −x)으로 밀 때 한 번 on.playerDoor(가는 방).
           방금 그 문으로 들어왔으면(PL.doorArm false) 문 앞을 한 번 벗어났다 와야 한다 — 들어오자마자 되돌아가지 않게 */
        var pushN = Math.hypot(wx, wz) || 1;
        (PL.place === 'play' ? [['playAtticDoor', -1, 'attic', 0.85]] : PL.place === 'loft' ? [] : [['atticPlayDoor', 1, 'play', 0.85]]).forEach(function (q) {   /* [앵커, 미는 쪽(x 부호), 가는 곳, 문 양옆 폭] — 계단도 문처럼 발치에서 밀면 넘어간다 */
          var dAn = DOOR_ANCHORS[q[0]];
          if (!PL.doorCd && Math.abs(PL.pos.x - dAn[0]) < 0.75 && Math.abs(PL.pos.z - dAn[2]) < q[3] && q[1] * wx / pushN > 0.25 && !DQ.active && !DQ.pending && !PLACE.trans) { PL.doorCd = 0.4; emit('playerDoor', q[2]); }   /* 한 번 쏘고 꺼지지 않는다: 앱이 바쁜 틈이라 못 받았어도 계속 밀고 있으면 0.4 s 뒤 다시 쏜다 */
        });
        /* 계단: 어느 쪽에서든 계단(위층은 계단 구멍)에 붙어 그쪽으로 밀면 오르내린다 — 비스듬히 걸어와도. 막 오르내린 뒤엔 스틱을 놓거나 다른 쪽으로 틀 때까지 잠긴다 (같은 방향을 쥔 채 도착하므로 되튀지 않게) */
        var pad = PL.place === 'attic' ? [(STAIR.x0 + STAIR.x1) / 2, (STAIR.z0 + STAIR.z1) / 2, (STAIR.x1 - STAIR.x0) / 2, (STAIR.z1 - STAIR.z0) / 2, 'loft'] : PL.place === 'loft' ? [(HATCH.x0 + HATCH.x1) / 2 + 0.1, (HATCH.z0 + HATCH.z1) / 2, (HATCH.x1 - HATCH.x0) / 2 - 0.1, (HATCH.z1 - HATCH.z0) / 2, 'attic'] : null;
        if (pad) {
          var pdx = pad[0] - PL.pos.x, pdz = pad[1] - PL.pos.z, toward = (pdx * wx + pdz * wz) / ((Math.hypot(pdx, pdz) || 1) * pushN), near = Math.abs(pdx) < pad[2] + PL_RAD + 0.3 && Math.abs(pdz) < pad[3] + PL_RAD + 0.3;
          if (!near || toward < 0.1) PL.doorArm = true;
          else if (PL.doorArm && !PL.doorCd && toward > 0.5 && !DQ.active && !DQ.pending && !PLACE.trans) { PL.doorCd = 0.4; emit('playerDoor', pad[4]); }
        }
      } else if (PL.held && !held) { PL.doorArm = true; PL.faceCam = true; if (PL.heldStop) { PL.settleT = 0; PL.heldStop = false; } }   /* 손을 떼면(막힌 채 서 있다 떼도 · 데드존에 잡고만 있다 떼도) 다시 카메라 쪽 + 도착 눌림 한 번 — 전이는 '잡고 있었나'(held) 기준 */
      if (allowed && !PL.walking && PL.place === 'attic' && !PL.sit && !PL.hop) {   /* 문어가 걸어와 내 캐릭터 위에 서면(문어 걷기는 플레이어를 모른다 — 걷기 시작 때 plAvoidOct 가 미리 비켜세우지만 길이 지나가기도 한다) 둥근 장애물 밖으로 밀려난다 — 걷는 속도로, 스틱을 쥐고 있어도(문어가 미는 셈), 미끄러짐은 plMove 몫 (리뷰 11-09) */
        var circ = plCircles(), pen = plPen(PL.pos.x, PL.pos.z, [], circ);
        if (pen > 1e-3) {
          var cc = null; circ.forEach(function (c) { if (c[2] - Math.hypot(PL.pos.x - c[0], PL.pos.z - c[1]) >= pen - 1e-9) cc = c; });
          var ox = PL.pos.x - cc[0], oz = PL.pos.z - cc[1], ol = Math.hypot(ox, oz); if (ol < 1e-6) { ox = _r.x; oz = _r.z; ol = Math.hypot(ox, oz) || 1; }
          var ps = Math.min(pen + 0.02, PL_SPEED * dt / (st.speed || 1));
          pushed = plMove(ox / ol * ps, oz / ol * ps);
          if (pushed && !v) { PL.faceCam = false; PL.wantYaw = Math.atan2(ox, oz); }
        }
      }
      if (PL.pushed && !pushed && !held) PL.faceCam = true;   /* 밀려나기가 끝나면 다시 카메라 쪽 */
      PL.stick = stick; PL.held = held; PL.pushed = pushed;
      if (PL.walking) PL.walking.step(dt);
      if (PL.pending === 'rest' && !DQ.active && !PLACE.trans) plRest(false);   /* 들어온 문이 닫힌 뒤: 쉬는 자리로 */
      var red = st.reduced, moving = ((!!PL.walking && PL.antic <= 0) || stick || pushed) && !red;
      var mx = PL.pos.x - PL.last.x, mz = PL.pos.z - PL.last.z; if (Math.hypot(mx, mz) > 1e-6) PL_IN.dir.set(mx, 0, mz).normalize();   /* 진행 방향 (발자국 회전·옆 오프셋) */
      if (moving) { if (!PL.moving) { PL.last.copy(PL.pos); PL.n = Math.floor(PL.phase); } PL.phase += Math.min(0.3, Math.hypot(PL.pos.x - PL.last.x, PL.pos.z - PL.last.z)) / (stick ? PL_RUN_STRIDE : PL_STRIDE); }
      else if (PL.moving) { PL.phase = Math.ceil(PL.phase - 1e-6); if (held) PL.heldStop = true; else PL.settleT = 0; }   /* 멈춤 = 서기 프레임 + 착지 눌림 한 번 (잡은 채 멈췄으면 — 데드존 · 벽에 막힘 — 눌림은 놓을 때) */
      PL.last.copy(PL.pos); PL.moving = moving; PL.settleT += dt;
      stepFoot(dt);
      if (PL.sit || PL.hop) { if (PL.sit || (PL.hop && PL.hop.sit)) PL.wantYaw = PL.sitYaw || 0; } else if (PL.faceCam && !PL.walking) PL.wantYaw = camYaw();   /* 쉴 땐 카메라 쪽 (돌려 보기를 따라간다) */
      var dy = angDiff(PL.wantYaw, PL.yaw);
      PL.yaw = red ? PL.wantYaw : PL.yaw + dy * Math.min(1, dt * PL_TURN); PL.yaw = Math.atan2(Math.sin(PL.yaw), Math.cos(PL.yaw));
      if (PL.dir8 == null || red || Math.abs(angDiff(PL.yaw, PL.dir8 * (Math.PI / 4))) > Math.PI / 8 + 0.12) PL.dir8 = Math.round(PL.yaw / (Math.PI / 4));   /* 8방향 계단 + 히스테리시스 ≈ 7°: 스틱 각이 22.5° 경계 근처에서 흔들려도 칸이 매 프레임 45° 씩 왔다 갔다 하지 않는다 (리뷰 11-09) */
      plG.rotation.y = PL.dir8 * (Math.PI / 4);   /* 8방향 계단 (스프라이트처럼 — 매끈한 회전은 둥근 머리 외곽이 매 프레임 1 px 흘러 반짝인다) */
      plSnap();
      /* 4프레임 걸음: 위상 n.u → 프레임 floor(4u) = 서기 · 왼발 앞 · 서기 · 오른발 앞. 팔은 다리 반대. 디딤 프레임(1 · 3)에서 몸 −1 px + 좌우 뒤뚱 (스프라이트처럼 다리가 벌어지면 엉덩이가 내려간다, 짧뚱한 몸은 뒤뚱거린다) */
      var u = PL.phase - Math.floor(PL.phase), f = moving ? Math.floor(u * 4) & 3 : 0, sw = [0, 1, 0, -1][f];
      if (moving && (f & 1) && f !== PL.frame) plFoot(f === 1 ? -1 : 1);   /* 디딤 프레임에 들어설 때 = 한 걸음: 발자국 + on.playerStep() */
      PL.frame = f;
      plLegL.rotation.x = -sw * PL_LEG; plLegR.rotation.x = sw * PL_LEG;
      if (PL.sit) plLegL.rotation.x = plLegR.rotation.x = -1.35;   /* 앉은 다리: 앞으로 뻗는다 */
      plArmL.rotation.x = sw * PL_ARM; plArmR.rotation.x = -sw * PL_ARM;
      var out = moving ? 0.30 : 0.42; plArmL.rotation.z = -out; plArmR.rotation.z = out;   /* 팔은 살짝 벌려 늘어뜨린다 — 걸을 땐 조금 붙인다 */
      plBody.rotation.z = sw * PL_SWAY;
      var sx = 1, sy = 1, by = 0, tb = Math.floor(PL.t * 8) / 8;
      if (!red) {
        if (!moving && PL.settleT > 0.3) sy = 1 - 0.012 * (0.5 + 0.5 * Math.sin(tb * Math.PI / 2));   /* 숨쉬기 8 fps 스텝 (1 px 안쪽, 가끔 1 px) */
        if (PL.antic > 0) { sy = 0.94; sx = 1.03; }                                                       /* 출발 예비 눌림 */
        else if (!moving && PL.settleT < 0.1) { sy = 0.95; sx = 1.02; }                                   /* 도착 눌림 80 ms */
        if (moving && (f & 1)) by = -pxUp();
        /* 눈 깜빡임 3~7 s 시드 간격 · 120 ms (문어와 같은 규칙) */
        if (PL.blinkLeft > 0) PL.blinkLeft -= dt; else { PL.blinkT -= dt; if (PL.blinkT <= 0) { PL.blinkLeft = 0.12; PL.blinkT = 3 + (hash('plb' + Math.floor(PL.t * 10)) % 1000) / 1000 * 4; } }
      } else PL.blinkLeft = 0;
      var shut = PL.blinkLeft > 0 && PL.look.eyes !== 'smile';   /* 웃는 눈(^^)은 깜빡이지 않는다 — 실눈이 깜빡이면 무섭다 (주인 11-10) */
      if (shut !== PL.shut) { PL.shut = shut; plEyeUV(); }   /* 감은 눈 = 아틀라스의 '감은 눈' 칸으로 uv 전환 (머리색 한 칸 어두운 선 하나 — 메시·드로우콜·텍스처 추가 없음) */
      plBody.scale.set(sx, sy, sx); plBody.position.y = snapUp(by);
    }
    /* 내 캐릭터 초상 (설정 시트 '내 모습' 미리보기, 64×64): 문어 portrait 과 같은 길 — 레이어 2 전용 3점 조명(문어 rig) · pCam · rtP/rtPN/rtPO · postP · 캐시(키 = cfg + 문어 색 + 팔레트 + 배경).
       찍는 동안만 내 캐릭터 7 메시를 레이어 2 에 넣고 문어의 레이어 2 메시는 뺀다(문어 초상엔 내 캐릭터가, 내 초상엔 문어가 안 들어온다). 조명 rig 는 octG 안에 있어 octG 를 보이게 하고 요를 0 으로 맞춘다(빛 방향이 문어 요를 따라 돌지 않게).
       프레이밍: 타깃 = 머리 중심 0.08 위(y 0.95) · 위에서 15° · 요 0°(정면 — 얼굴 조각이 안 뭉개진다, PPORT 주석. 옆 · 뒷선은 옷장 샷의 'hair' · 'back' 틀이 맡는다) · 반폭 1.5 r(머리 지름 ≈ 43 px, 밀짚모자 1.38 까지 다 들고 아래는 가슴 0.425 까지) · 정지 자세 · 깜빡임 없음 · 밤 자체광 없음. 초상 조명은 3점 흰빛이라 색 칸이 장면과 다를 수 있다 — '모양 미리보기' 다 */
    function renderPlayerPortrait(bgHex, fr) {   /* fr = 틀 { y 타깃 높이(m) · hw 반폭(m) · lod 얼굴 아틀라스 줄 · up 화면 위쪽으로 미는 거리(m) } — 없으면 초상 틀. 옷장 샷(playerShot)이 같은 길을 틀만 바꿔 쓴다 */
      fr = fr || { y: PL_HEAD_Y - PPORT.down, hw: PPORT.hw * PL_HEAD_R, lod: 2, up: 0, yaw: PPORT.yaw };
      var t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0;
      var sv = { sx: plBody.scale.x, sy: plBody.scale.y, sz: plBody.scale.z, py: plBody.position.y, rz: plBody.rotation.z, gy: plG.rotation.y, vis: plG.visible, pvis: plG.parent ? plG.parent.visible : true,
        limbs: plLimbs.map(function (m) { return [m.rotation.x, m.rotation.z]; }), shut: PL.shut, lod: PL.lod, eem: toonEye.emissive.clone(), ecol: toonEye.color.clone(),
        ovis: octG.visible, opvis: octG.parent ? octG.parent.visible : true, oy: octG.rotation.y, em: toonP.emissive.clone(), col: toonP.color.clone(), bg: scene.background };
      var sc = renderer.getClearColor(_cc).clone(), sa = renderer.getClearAlpha(), octL2 = [];
      octG.traverse(function (o) { if (o.isMesh && (o.layers.mask & 4)) { octL2.push(o); o.layers.disable(2); } });
      plMeshes.forEach(function (m) { m.layers.enable(2); });
      PL.shut = false; PL.lod = fr.lod; plEyeUV();   /* 눈 뜨고 8×8 칸으로: 정면 61 px/m 는 장면 2× (54 px/m) 보다 촘촘해 2× 그림이 텍셀 ≈ 1.1 px 로 열이 안 빠진다 (요 30° 시절엔 먼 눈 조각이 0.84 px 라 4×5 로 찍었다) — 주인이 눈 · 코 · 입 · 볼을 고르는 바로 그 미리보기라 한쪽이 깨지면 안 된다 */
      plBody.scale.set(1, 1, 1); plBody.position.y = 0; plBody.rotation.z = 0; plG.rotation.y = -(fr.yaw || 0);   /* 요 = 카메라가 아니라 내 캐릭터를 돌린다 (카메라 · 3점 빛은 그대로 → 돌려 찍어도 앞에서 받는 빛) */
      plLimbs.forEach(function (m) { m.rotation.x = 0; }); plArmL.rotation.z = -0.42; plArmR.rotation.z = 0.42;
      plG.visible = true; if (plG.parent) plG.parent.visible = true; octG.visible = true; if (octG.parent) octG.parent.visible = true; octG.rotation.y = 0;   /* 숨은 장소 그룹에 있어도 찍힌다 (레이어 2 만 그리므로 장소 내용·조명은 안 들어온다) */
      toonP.emissive.setRGB(0, 0, 0); toonP.color.setScalar(0.8); toonEye.emissive.setRGB(0, 0, 0); toonEye.color.setScalar(0.8);   /* 3점 흰빛 rig 는 장면 필보다 밝아 금발 윗면이 올리브 #d0da91 로 떴다 → 재질 색만 0.8 로 눌러 찍는다 (유니폼, 프로그램 그대로). 눈 재질도 같이 — 안 누르면 흰자가 살결보다 한 칸 떠 번쩍인다 */
      plG.updateMatrixWorld(true); octG.updateMatrixWorld(true);
      var ty = fr.y, ct = Math.cos(PPORT.tilt), stl = Math.sin(PPORT.tilt), up = fr.up || 0, yw = fr.yaw == null ? PPORT.yaw : fr.yaw;
      var ux = -stl * Math.sin(yw) * up, uy = ct * up, uz = -stl * Math.cos(yw) * up;   /* 카메라 '위' 벡터(내 캐릭터 로컬) × up — 타깃과 카메라를 같이 밀어 화면만 세로로 옮긴다 (전신 샷이 64×64 두 장을 이어 붙인다) */
      _pt.set(ux, ty + uy, uz); plG.localToWorld(_pt);
      _pp.set(PPORT.dist * ct * Math.sin(yw) + ux, ty + PPORT.dist * stl + uy, PPORT.dist * ct * Math.cos(yw) + uz); plG.localToWorld(_pp);
      var hw = fr.hw; pCam.left = -hw; pCam.right = hw; pCam.top = hw; pCam.bottom = -hw; pCam.updateProjectionMatrix();
      pCam.position.copy(_pp); pCam.up.set(0, 1, 0); pCam.lookAt(_pt); pCam.updateMatrixWorld();
      scene.background = bgHex ? C(bgHex) : null; renderer.setClearColor(bgHex ? C(bgHex) : 0x000000, bgHex ? 1 : 0);
      renderer.setRenderTarget(rtP); renderer.clear(true, true, false); renderer.render(scene, pCam);
      scene.overrideMaterial = normalMatP; scene.background = null;
      renderer.setRenderTarget(rtPN); renderer.clear(true, true, false); renderer.render(scene, pCam);
      scene.overrideMaterial = null;
      quad.material = postP; renderer.setRenderTarget(rtPO); renderer.render(quadScene, quadCam); quad.material = post;
      renderer.readRenderTargetPixels(rtPO, 0, 0, PORT.N, PORT.N, pBuf);
      /* 되돌리기 */
      scene.background = sv.bg; renderer.setClearColor(sc, sa); renderer.setRenderTarget(null);
      plMeshes.forEach(function (m) { m.layers.disable(2); }); octL2.forEach(function (o) { o.layers.enable(2); });
      plBody.scale.set(sv.sx, sv.sy, sv.sz); plBody.position.y = sv.py; plBody.rotation.z = sv.rz; plG.rotation.y = sv.gy; plG.visible = sv.vis; if (plG.parent) plG.parent.visible = sv.pvis;
      plLimbs.forEach(function (m, i) { m.rotation.x = sv.limbs[i][0]; m.rotation.z = sv.limbs[i][1]; });
      PL.shut = sv.shut; PL.lod = sv.lod; plEyeUV(); toonEye.emissive.copy(sv.eem); toonEye.color.copy(sv.ecol);
      octG.visible = sv.ovis; if (octG.parent) octG.parent.visible = sv.opvis; octG.rotation.y = sv.oy; toonP.emissive.copy(sv.em); toonP.color.copy(sv.col);
      var N = PORT.N, cv = document.createElement('canvas'); cv.width = cv.height = N;
      var cx = cv.getContext('2d'), img = cx.createImageData(N, N);
      for (var y = 0; y < N; y++) img.data.set(pBuf.subarray((N - 1 - y) * N * 4, (N - y) * N * 4), y * N * 4);   /* GL 은 아래→위 */
      cx.putImageData(img, 0, 0);
      if (t0) PPORT.ms = +(performance.now() - t0).toFixed(2); PPORT.n++;
      return cv;
    }
    function playerPortrait(o) {   /* → 64×64 캔버스 (복사본, o.shared = 캐시 캔버스 그대로). opts.bg = 'transparent'(기본) | 'navy' | '#rrggbb'. 컨텍스트 잃음 = 빈 캔버스(캐시 안 함 → 복구 뒤 다시 그림) */
      var k = JSON.stringify(PL.look) + '|' + st.color + '|' + PAL.source + '|' + (portraitBg(o) || 't'), e = PPORT.cache[k];   /* 문어 색도 키에 (setColor 는 스냅 팔레트의 문어 램프를 바꾸는데 PPORT 캐시는 안 비운다 — 리뷰 11-08) */
      if (!e && ctxLost()) { var blank = document.createElement('canvas'); blank.width = blank.height = PORT.N; return blank; }
      if (!e) e = PPORT.cache[k] = { cv: renderPlayerPortrait(portraitBg(o)) };
      if (o && o.shared) return e.cv;
      var cv = document.createElement('canvas'); cv.width = cv.height = PORT.N; cv.getContext('2d').drawImage(e.cv, 0, 0); return cv;
    }
    /* 옷장 샷 (docs/PLAYER_PARTS.md §3 '내 모습 옷장'): 초상과 같은 길을 틀(frame)만 바꿔 찍는다 — 전신 미리보기와 고를 것 썸네일.
       · look = 지금 모습 위에 덮어쓸 범주들 ({ hair: 'pony' } → 그 머리만 바꾼 모습). 지금 모습과 다르면 찍는 동안만 7 메시의 지오메트리와 얼굴 아틀라스를 잠깐 바꿨다가 되돌린다 (plWithLook — 임시 지오메트리는 바로 dispose, 메시·재질·프로그램·텍스처 수 그대로).
       · frame: 'full' 64×96(전신: 64×64 두 장을 ±16 px 로 찍어 가운데서 잇는다 — 16 px = 0.2625 m 는 베이어 무늬 주기의 배수라 이음매가 안 보인다) · 'back' 64×96(전신 뒷모습: 요 π) · 'head' 32×32(30.5 px/m · LOD 1: 머리 · 모자가 다 든다) · 'hair' 32×32(head 를 요 0.9 로 돌리고 0.08 내려 찍는다 — 얼굴은 남기고 긴머리 자락 · 양갈래 · 포니 꼬리 · 웨이브 끝이 갈린다. 요 0.35 는 여섯 머리가 거의 같아 보였다, 11-09) · 'face' · 'body' · 'feet' 32×32(61 px/m · LOD 2: 초상과 같은 촘촘함의 가운데 크롭).
         얼굴 조각은 텍셀 ≈ 1.13 px 일 때만 안 뭉개진다 → 61 px/m × LOD 2 아니면 30.5 px/m × LOD 1 둘만 쓴다.
       · 캐시: 키 = 모습 + 틀 + 문어 색 + 팔레트 + 배경, 최근 200 장 (setPlayer 로 안 비운다 — 같은 모습으로 돌아오면 그대로 쓴다). 컨텍스트 잃음 = 빈 캔버스(캐시 안 함). */
    var PSHOT = { cache: {}, keys: [], cap: 200, n: 0, frames: {
      full: { w: 64, h: 96, y: 0.70, hw: 0.525, lod: 2, tiles: [0.2625, -0.2625] },
      head: { w: 32, h: 32, y: 0.93, hw: 1.05, lod: 1 },
      back: { w: 64, h: 96, y: 0.70, hw: 0.525, lod: 2, tiles: [0.2625, -0.2625], yaw: Math.PI },
      hair: { w: 32, h: 32, y: 0.80, hw: 1.05, lod: 1, yaw: 0.9 },
      face: { w: 32, h: 32, y: 0.86, hw: 0.525, lod: 2 },
      body: { w: 32, h: 32, y: 0.40, hw: 0.525, lod: 2 },
      feet: { w: 32, h: 32, y: 0.09, hw: 0.525, lod: 2 } } };
    function plWithLook(look, fn) {
      var live = PL.look; if (JSON.stringify(look) === JSON.stringify(live)) return fn();
      var liveG = plMeshes.map(function (m) { return m.geometry; }), tmp = plGeos(look);
      try { plMeshes.forEach(function (m, i) { m.geometry = tmp[i]; }); PL.look = look; plEyeBase(); plDrawEyes(look); return fn(); }
      finally { plMeshes.forEach(function (m, i) { m.geometry = liveG[i]; }); tmp.forEach(function (g) { g.dispose(); }); PL.look = live; plDrawEyes(live); plEyeUV(); }
    }
    function renderPlayerShot(look, fr, bgHex) {
      var cv = document.createElement('canvas'); cv.width = fr.w; cv.height = fr.h; var cx = cv.getContext('2d'), N = PORT.N;
      plWithLook(look, function () {
        if (fr.tiles) {
          var a = renderPlayerPortrait(bgHex, { y: fr.y, hw: fr.hw, lod: fr.lod, yaw: fr.yaw, up: fr.tiles[0] }), b = renderPlayerPortrait(bgHex, { y: fr.y, hw: fr.hw, lod: fr.lod, yaw: fr.yaw, up: fr.tiles[1] });
          cx.drawImage(a, 0, 0); cx.clearRect(0, 48, N, 48); cx.drawImage(b, 0, 16, N, 48, 0, 48, N, 48);   /* 위 장 0~47 줄 + 아래 장 16~63 줄 → 가장자리 16 줄(윤곽선이 바깥을 못 보는 곳)은 둘 다 버린다 */
        } else { var c = renderPlayerPortrait(bgHex, { y: fr.y, hw: fr.hw, lod: fr.lod, yaw: fr.yaw, up: 0 }); cx.drawImage(c, (N - fr.w) / 2, (N - fr.h) / 2, fr.w, fr.h, 0, 0, fr.w, fr.h); }
      });
      PSHOT.n++; return cv;
    }
    function playerShot(o) {   /* → 캔버스 (복사본, o.shared = 캐시 캔버스 그대로). o = { look?: 덮어쓸 범주들, frame?: 'full'(기본) | 'back' | 'head' | 'hair' | 'face' | 'body' | 'feet', bg?: 'transparent'(기본) | 'navy' | '#rrggbb', shared? } */
      o = o || {};
      var name = PSHOT.frames[o.frame] ? o.frame : 'full', fr = PSHOT.frames[name], bg = portraitBg(o);
      var look = o.look ? normalizePlayer(Object.assign({}, PL.look, o.look)) : PL.look;
      var k = JSON.stringify(look) + '|' + name + '|' + st.color + '|' + PAL.source + '|' + (bg || 't'), e = PSHOT.cache[k];
      if (!e && ctxLost()) { var blank = document.createElement('canvas'); blank.width = fr.w; blank.height = fr.h; return blank; }
      if (!e) {
        e = PSHOT.cache[k] = { cv: renderPlayerShot(look, fr, bg) }; PSHOT.keys.push(k);
        while (PSHOT.keys.length > PSHOT.cap) delete PSHOT.cache[PSHOT.keys.shift()];
      }
      if (o.shared) return e.cv;
      var cv = document.createElement('canvas'); cv.width = fr.w; cv.height = fr.h; cv.getContext('2d').drawImage(e.cv, 0, 0); return cv;
    }
    var octState = { carrySvg: null, hang: null, carryId: null };   /* carryId = 들고 있는 포스터의 여행 id (APP 의 carry { svg, id }) */
    function setOctState(s, extra) {
      st.octState = s; oct.animT = 0;
      if (opts.octEl) opts.octEl.className = opts.octEl.className.replace(/\bst-[a-z]+/g, '').trim() + ' st-' + s;
      var away = s === 'away';
      if (!away && s !== 'walk' && FADE.d < 1) setOctFade(1);   /* 의식 밖 상태 = 늘 온전히 보인다 (걷기는 의식이 사라짐·나타남을 쥔다) */
      octG.visible = !away && FADE.d > 0; octDecal.visible = !away && FADE.d >= 0.5;
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
    var lastOverlay = '', lastOctHide = false;
    function updateOverlay() {
      var el = opts.octEl;
      if (el) {
        var hide = isRoomP(PLACE.vis) && !octUp();   /* 놀이방: 문어 이름표·말풍선 오버레이를 숨긴다 (문어는 다락에 있다 — 숨은 머리 자리에 말풍선이 뜨지 않게). 인라인 display 만 (앱의 visibility 들어올림과 안 겹친다) */
        if (hide !== lastOctHide) { lastOctHide = hide; el.style.display = hide ? 'none' : ''; }
        if (!hide) { var p = octScreen(), s = 'translate(' + Math.round(p.x - 24) + 'px,' + Math.round(p.y - 48) + 'px)'; if (s !== lastOverlay) { lastOverlay = s; el.style.transform = s; } }
      }
      updateSpots();
    }
    /* ── 문·오락기 누르는 곳 (8물결): 앱이 hotspots({ atticPlay, playAttic, machine }) 로 넘긴 진짜 <button> (#scene 안, #scene3d 밖) 을 매 프레임 3D 문·기계 위에 맞춘다.
       위치 = 화면에 투영한 상자를 장면 안으로 자른 '보이는 부분' (#scene 안쪽 기준 CSS px), 44×44 보다 작으면 넓힌다 · 바뀔 때만 style 을 쓴다 · 장면이 hidden 을 쥔다:
       그 장소가 보이고 문 작업·전환·입장 연출이 없을 때만 보인다. atticPlay 는 바깥이 보이는 동안(산책 중) data-spot="edge" (위치를 비워 앱 CSS 의 가장자리 단추로) ·
       다락 위 = data-spot="over". 확대·밀기로 상자가 화면 밖이면 숨긴다 */
    var STAIR_BOX = new T.Box3(new T.Vector3(STAIR.x0, 0, STAIR.z0), new T.Vector3(STAIR.x1, STAIR.top, STAIR.z1));
    var SPOTS = {}, SPOT_KEYS = ['atticPlay', 'playAttic', 'machine', 'salon', 'atticStair', 'loftStair', 'sew', 'plot0', 'plot1', 'plot2'], spotEdge = true, spotLast = {}, _sv8 = new T.Vector3(), SPOT_MIN_VIS = 8;   /* 보이는 문 조각이 8 CSS px 보다 좁으면 단추를 숨긴다 · salon = 미용실 거울 (#btn-salon) */
    function boxScreen(b, obj) {   /* 그룹 좌표 상자 → 컨테이너 CSS px {l,t,r,b} */
      obj.updateWorldMatrix(true, false);
      var l = Infinity, t = Infinity, r = -Infinity, bt = -Infinity, mw = obj.matrixWorld;
      for (var i = 0; i < 8; i++) {
        _sv8.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).applyMatrix4(mw).project(camera);
        var x = S.offX + (_sv8.x * 0.5 + 0.5) * S.cw, y = S.offY + (1 - (_sv8.y * 0.5 + 0.5)) * S.ch;
        if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > bt) bt = y;
      }
      return { l: l, t: t, r: r, b: bt };
    }
    function spotInfo(id) {
      var busy = DQ.active || DQ.pending || !!PLACE.trans || INTRO.on, v = PLACE.vis, q;
      if (id === 'atticPlay') {
        if (PLACE.room || busy) return null;
        if (v === 'exterior') return spotEdge ? { id: id, mode: 'edge' } : null;
        if (v !== 'attic') return null;
        q = boxScreen(ATTIC_DOOR.box, ATTIC_DOOR.g);
      } else if (id === 'playAttic' || id === 'machine') {
        if (v !== 'play' || !PROOM || busy) return null;
        q = id === 'machine' ? boxScreen(PROOM.machineBox, PROOM.g) : boxScreen(PLAY_DOOR.box, PLAY_DOOR.g);
      } else if (id === 'plot0' || id === 'plot1' || id === 'plot2') {
        if (v !== 'exterior' || PLACE.room || busy || !extReady) return null;
        q = boxScreen(plotBoxes[+id.charAt(4)], extG);
      } else if (id === 'atticStair') {
        if (v !== 'attic' || PLACE.room || busy) return null;
        q = boxScreen(STAIR_BOX, atticG);
      } else if (id === 'loftStair' || id === 'sew') {
        if (v !== 'loft' || !LROOM || busy) return null;
        q = boxScreen(id === 'sew' ? LROOM.sewBox : LROOM.hatchBox, LROOM.g);
      } else if (id === 'salon') {   /* 미용실: 다락이 보이고 · 방 이동·문 작업·전환·입장·의식이 없고 · 코너가 보이고 · 앱이 setSalonOpen(true) 로 허락했고 · 연출 중이 아닐 때만 */
        if (v !== 'loft' || busy || CER.active || !SAL.open || SAL.active || !salG.visible) return null;   /* 위층이 보일 때 (문어가 아래층에서 자고 있어도 거울은 눌린다 — 그때는 앱이 '자고 있어' 한 줄만 띄운다) */
        q = boxScreen(SAL_BOX, salG);
      } else return null;
      /* 화면 안에 보이는 부분만 (확대·밀기로 문이 장면 가장자리를 넘으면 자른다 — 예전엔 투영 상자 전체 높이를 장면 안으로 *옮겨서* 문 위 바닥까지 덮었다).
         보이는 부분이 SPOT_MIN_VIS 보다 작으면 숨긴다 · 44×44 보다 작으면 보이는 부분 가운데로 넓히고 장면 안으로 자른다 */
      if (!isFinite(q.l)) return null;
      var vl = Math.max(0, q.l), vt = Math.max(0, q.t), vr = Math.min(S.W, q.r), vb = Math.min(S.H, q.b);
      if (vr - vl < SPOT_MIN_VIS || vb - vt < SPOT_MIN_VIS) return null;
      var w = Math.min(S.W, Math.round(Math.max(44, vr - vl))), h = Math.min(S.H, Math.round(Math.max(44, vb - vt)));
      var x = clamp(Math.round((vl + vr) / 2 - w / 2), 0, Math.max(0, S.W - w)), y = clamp(Math.round((vt + vb) / 2 - h / 2), 0, Math.max(0, S.H - h));
      return { id: id, mode: 'over', x: x, y: y, w: w, h: h, art: { l: Math.round(q.l), t: Math.round(q.t), r: Math.round(q.r), b: Math.round(q.b) } };
    }
    /* 숨길 때 포커스를 쥐고 있던 단추는 기억했다가 다시 보일 때 돌려준다 (포커스가 그새 body 로만 떨어져 있으면 — 키보드로 바깥 문 단추에 있다가 문어가 돌아오는 전환 · 확대·밀기로 잠깐 화면 밖).
       다른 데로 옮겨 갔으면 (앱이 문 건너편 단추로 옮김 등) 잊는다 */
    var spotFocus = null, spotQuiet = false;
    function updateSpots() {
      var ae = document.activeElement;
      if (spotFocus && ae && ae !== document.body && ae !== SPOTS[spotFocus]) spotFocus = null;
      for (var i = 0; i < SPOT_KEYS.length; i++) {
        var id = SPOT_KEYS[i], el = SPOTS[id]; if (!el) continue;
        var s = spotInfo(id), key = !s ? 'off' : s.mode === 'edge' ? 'edge' : s.x + ',' + s.y + ',' + s.w + ',' + s.h;
        if (spotLast[id] === key) continue;
        spotLast[id] = key;
        if (!s) { if (!el.hidden && ae === el) { spotFocus = id; try { spotQuiet = !el.matches(':focus-visible'); } catch (e) { spotQuiet = false; } }   /* :focus-visible 을 모르는 옛 브라우저 = 링 있는 쪽으로 */ el.hidden = true; continue; }
        var es = el.style; el.dataset.spot = s.mode;
        if (s.mode === 'over') { es.left = s.x + 'px'; es.top = s.y + 'px'; es.width = s.w + 'px'; es.height = s.h + 'px'; es.right = 'auto'; es.bottom = 'auto'; }
        else { es.left = es.top = es.width = es.height = es.right = es.bottom = ''; }
        if (el.hidden) {
          el.hidden = false;
          if (spotFocus === id) {   /* 링이 없던 포커스(손가락으로 온 것)는 링 없이 돌려준다 — 'ring-off' 는 앱 css 의 같은 뜻 (focusVisible 옵션을 모르는 브라우저) */
            spotFocus = null; var a2 = document.activeElement;
            if (!a2 || a2 === document.body) { if (spotQuiet) el.classList.add('ring-off'); try { el.focus(spotQuiet ? { preventScroll: true, focusVisible: false } : { preventScroll: true }); } catch (e) { el.focus(); } }
          }
        }
      }
    }
    /* 손가락·마우스는 캔버스가 받는다 (단추는 'over' 일 때 pointer-events: none — css/style.css): 밀기·핀치·휠이 문 위에서 시작해도 장면으로 가고, 톡은 그린 순서대로
       (문어가 문 앞이면 문어, 문이 문어 앞이면 문). 톡이 문·오락기로 정해지면 그 단추를 누른다 (키보드 · 화면 낭독기는 단추를 그대로 쓴다) */
    function spotAt(cx, cy, ids) {   /* 클라이언트 px → 그 자리를 덮는 보이는 단추 칸 id | null (겹치면 그림 상자 안 → 가운데가 가까운 것) */
      var r = container.getBoundingClientRect(), x = cx - r.left, y = cy - r.top, best = null, bd = Infinity;
      (ids || SPOT_KEYS).forEach(function (id) {
        if (!SPOTS[id]) return;
        var s = spotInfo(id); if (!s || s.mode !== 'over' || x < s.x || x > s.x + s.w || y < s.y || y > s.y + s.h) return;
        var a = s.art, inArt = x >= a.l && x <= a.r && y >= a.t && y <= a.b, d = (inArt ? 0 : 1e6) + Math.hypot(x - (s.x + s.w / 2), y - (s.y + s.h / 2));
        if (d < bd) { bd = d; best = id; }
      });
      return best;
    }
    var SPOT_HIT = {};
    function spotHit(id) { return SPOT_HIT[id] || (SPOT_HIT[id] = { userData: { kind: 'spot', spot: id } }); }   /* pick() 이 돌려주는 표적 (메시 대신) */
    function doorMeshes(D) { var out = []; if (D && D.g.visible) D.g.traverseVisible(function (o) { if (o.isMesh && o.layers.mask & 1) out.push(o); }); return out; }
    function spotTap(id) { var el = SPOTS[id]; if (el && !el.hidden && spotInfo(id)) el.click(); }
    function clearSpots() { SPOT_KEYS.forEach(function (k) { var el = SPOTS[k]; if (!el) return; var es = el.style; es.left = es.top = es.width = es.height = es.right = es.bottom = ''; delete el.dataset.spot; }); SPOTS = {}; spotLast = {}; spotFocus = null; }
    function setHotspots(map, o) {
      clearSpots(); map = map || {}; o = o || {}; spotEdge = o.edge !== false;
      SPOT_KEYS.forEach(function (k) { if (map[k] && map[k].nodeType === 1) SPOTS[k] = map[k]; });
      if (ready) updateSpots();
      return Object.keys(SPOTS);
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
      var look = salLookClient() || oct.lookTarget || oct.pointer, px = 0, py = 0;   /* 미용실: 눈은 내민 병 · 연출 중 병으로 */
      if (PLAY && PLAY.eye) look = PLAY.eye;   /* 놀이: 눈은 kit.look 대상 (만진 컵·공·사람) */
      if (look) { var sp = octScreen(), r = canvas.getBoundingClientRect(); px = clamp((look.x - (r.left + sp.x - S.offX)) / 140, -1, 1); py = clamp((look.y - (r.top + sp.y - S.offY + 30)) / 140, -1, 1); }
      var dir = px < -0.05 ? 1 : -1;
      /* 과장 동작 (룩 패스 8, 표정 기준 — 상태는 기본 표정으로 매핑): happy 폴짝 2 + 꼭대기에서 다리 바깥 ×1.3 · curious 포인터 쪽 8° 기울임 · pet 12 % 눌림 + 느린 좌우 흔들 ±4° · sleep 6 % 납작 + 색 순환 · anticipate(상태) 600 ms 눌림 + calm 반눈 */
      if (!red) {
        if (s === 'idle' || s === 'stay') { sy = 1 - 0.03 * (0.5 + 0.5 * Math.sin(tb * Math.PI / 2)); sx = 1 + 0.02 * (0.5 + 0.5 * Math.sin(tb * Math.PI / 2)); }
        if (ex === 'sleep') { sy = 0.94 - 0.02 * Math.sin(tb * Math.PI / 2.5); sx = 1.03; }
        var gs = gaitBody(); sx *= gs[0]; sy *= gs[1]; by += gs[2];   /* 뒤뚱: 디딤 눌림 · 예비 눌림 · 걸음 중간 1px · 정착 통통 */
        if (oct.nudgeT > 0) { oct.nudgeT = Math.max(0, oct.nudgeT - dt); if (oct.nudgeT > 0.09) by += 2 * pxUp() / OCT_R; }   /* 톡 받음: 아트 2px 위로 90 ms → 제자리 (nudge, 11-08) */
        if (s === 'anticipate') { var ak = Math.min(1, oct.animT / 0.6); sx = 1 + 0.05 * ak; sy = 1 - 0.08 * ak; }
        if (s === 'ponder') { var pq = Math.min(1, oct.animT / 0.12); sx = 1 + 0.05 * pq; sy = 1 - 0.08 * pq; }   /* 미용실 숨 고르기 뒤 움츠림 (scaleY .92 · scaleX 1.05, 얼굴 idle · 먹물·소리 없음 — 두 답 모두 같다) */
        if (ex === 'pet') { var pk = 0.5 + 0.5 * Math.sin(t * Math.PI / 0.6); sx = 1.06 + 0.03 * pk; sy = 0.88 - 0.03 * pk; rz = Math.sin(t * Math.PI / 0.8) * 4 * DEG; }
        if (ex === 'curious') rz = -8 * DEG * dir;
        if (ex === 'happy' && face.hopsLeft > 0) { var hk = (face.t % 0.45) / 0.45; splay = Math.sin(hk * Math.PI); by += splay * 0.5; if (face.t > 0.9) { face.hopsLeft = 0; splay = 0; } }
        if (s === 'peek') G.rz = Math.sin(t * 4.5) * 0.12; else G.rz += (rz - G.rz) * Math.min(1, dt * 8);
        if (oct.wiggle > 0) { oct.wiggle -= dt; G.rz = Math.sin(oct.wiggle * 30) * 0.1 * oct.wiggle; }
        if (pkb) { sx *= pkb[0]; sy *= pkb[1]; by += pkb[2]; }
        var sbd = SAL.body; if (sbd) { sx *= sbd.sx; sy *= sbd.sy; by += sbd.by; }   /* 미용실 '바꾸기': 예비 눌림 · 제자리 폴짝 (renderPortrait 는 몸 변환을 정지 자세로 덮어 찍으므로 초상에 안 샌다) */
        bodyG.rotation.set(G.lean + PK.leanQ + (sbd ? sbd.lean : 0), G.yaw, G.rz + G.roll);   /* 표정 기울임(부드럽게) + 걸음 굴림(3단 스텝) · 요 흔들 · 앞 기울임 (+ 대야 쪽 ≤ 8°) */
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
      if (WAVE.on && WAVE.t > WAVE_N / 12 + 0.1) WAVE.on = false;   /* 의식이 끊겨도 남지 않게 */
      if (WAVE.on) {   /* 손 흔들기 (가장자리에서 한 번 돌아보며, 0단계 0.4 s): 화면 오른쪽(나가는 쪽) 옆다리를 정옆(화면 면)으로 돌려 머리 옆으로 들고 위·아래로 흔든다.
                          12 fps 칸 5개 — 들기 · 위 · 아래 · 위 · 내리기, 들린 동안 다리를 1.2배 뻗는다 (happy 폴짝의 ×1.3 과 같은 말). 앞다리를 들면 얼굴 앞에 겹쳐 1× 에서 1~2 px 끝만 보였다 →
                          옆다리는 머리 윤곽 밖에서 끝이 아트px 4~5 칸 오르내린다 (1×). 시간은 의식과 같은 속도 배율(st.speed)로 → 의식 칸과 함께 끝난다 */
        WAVE.t += dt / st.speed; var wf = Math.min(WAVE_N - 1, Math.floor(WAVE.t * 12)), wa = arms[WAVE.arm];
        if (!red) { wa.rotation.z = [0.75, 1.0, 0.5, 1.0, 0.35][wf]; wa.rotation.y = 0; wa.scale.x = wf === 0 || wf === WAVE_N - 1 ? 1.1 : 1.2; }
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
      if (SAL.tint) hex = SAL.tint;   /* 미용실 모션 줄이기: 색 2칸 교차의 첫 칸 (섞은 색) — st.color 는 안 바꾼다 (초상은 그대로) */
      if (PLAY && PLAY.tint) hex = PLAY.tint;   /* 놀이: 위장 색 */
      if (hex !== oct.curHex) { oct.curHex = hex; octColor(hex); }
      octDecal.material.opacity = 0.42;
      if (FADE.on < 0.5) octDecal.visible = false;   /* 절반 넘게 사라진 동안 접지 그림자 없음 (다른 곳이 켜도) */
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
       한 프레임엔 한 장소만 그린다. 미끄럼 변위는 화면 세로 정수 px(snapUp). 모션 감소·instant = 즉시 컷.
       INTERIOR_MODE 0단계 '둘째 후보': 주인은 "집 나가는 건 좋은데"라고 했으므로 이 전환은 그대로 두고, 문어가 섬 아래로 떨어지던 것(첫째)만 고쳤다.
       문어는 다락 문간에서 먼저 체크로 사라지므로 다락과 함께 가라앉지 않는다. 주인이 고친 것을 보고도 놀라면 그때 옆으로 미끄러지기·디더 바꾸기로 ── */
    var TRANS_DUR = 0.6, TRANS_DY = 2.6, TRANS_DX = 3.0;   /* 가로 전환(놀이방 문): 같은 0.6 s · 같은 디더 페이드, 움직임만 화면 가로 (위아래 0) */
    function groupOf(p) { return p === 'exterior' ? extG : p === 'play' && PROOM ? PROOM.g : p === 'loft' && LROOM ? LROOM.g : atticG; }
    function storyVis() { return PLACE.room ? PLACE.cur : PLACE.vis; }
    function storyTrans() { return PLACE.trans && !PLACE.trans.door ? PLACE.trans : null; }   /* 다락 ↔ 바깥 전환만 (방 문 가로 전환은 의식이 끊지 않는다) */   /* 문어 쪽 '보이는' 장소: 놀이방에 있는 동안은 이야기 장소 (의식은 이것만 본다 — 안 보이는 곳에서 그대로 진행) */
    function emit(name, a, b) { var fn = on[name]; if (typeof fn !== 'function') return; try { fn(a, b); } catch (e) { console.error('[scene3d] on.' + name, e); } }   /* 앱 콜백이 던져도 프레임 루프는 산다 */
    function octMountLoft() {   /* 위층에 막 올라왔다: 문어가 깨어서 집에 있으면 계단 옆으로 따라 올라온다 */
      if (!LSALW || octUp() || octG.parent !== atticG || PLACE.cur !== 'attic' || st.octState === 'away' || st.octState === 'sleep' || (CER && CER.active) || SAL.active) return false;
      if (oct.walking) { oct.walking.cancel(); oct.walking = null; }
      LSALW.add(octG); oct.pos.set(snapPos(-0.3 - LSAL.dx), 0, snapPos(0.2 - LSAL.dz));   /* 깔개 쪽 (계단 앞 길목을 막지 않게 — 내 캐릭터가 선반과 문어 사이에 끼었다) */ snapScreen(octG.position.copy(oct.pos)); oct.wantYaw = oct.faceYaw = camYaw(); dither.still = 0;
      emit('octUp', true); return true;
    }
    function octUnmountLoft() {   /* 내려간다 · 의식이 시작된다: 다락의 제 자리로 */
      if (!octUp()) return;
      if (SAL.active) salFinishNow();
      atticG.add(octG); jumpTo(oct.anchor && oct.anchor !== 'salon' ? oct.anchor : 'center'); dither.still = 0; emit('octUp', false);
    }
    function showPlace(p) {
      var prev = PLACE.vis; LIFT.to = 0; if (p !== 'loft') LIFT.y = 0;
      if (p !== 'loft' && octUp()) octUnmountLoft();
      atticG.visible = p === 'attic'; extG.visible = p === 'exterior'; if (PROOM) PROOM.g.visible = p === 'play'; if (LROOM) LROOM.g.visible = p === 'loft'; PLACE.vis = p;
      atticG.position.set(0, 0, 0); extG.position.set(0, 0, 0); if (PROOM) PROOM.g.position.set(0, 0, 0); if (LROOM) LROOM.g.position.set(0, 0, 0); panReset(); PAN.cut = true;   /* 장소가 바뀌면 밀린 것은 0 (장소마다 경계가 다르다) · 의식 중 확대면 다음 따라가기가 그 자리로 바로 (디더에 덮인 프레임) */
      if (!isRoomP(p)) { var g = groupOf(p); if (octG.parent !== g) g.add(octG); }   /* 놀이방: 문어는 자기 장소(cur) 그룹에 남아 그 그룹과 같이 숨는다 (놀이방엔 문어가 없다) */
      applyLight(); dither.still = 0;
      container.dataset.view = p;
      if (p !== prev) emit('view', p, prev);
    }
    function defaultSwap(p) { /* 의식 없이 장소만 바꿀 때 문어 자리: 바깥 = 마당(길가), 다락 = 마지막 앵커 */
      if (p === 'exterior') { oct.pos.set(snapPos(1.75), 0, snapPos(0.75)); oct.wantYaw = oct.faceYaw = camYaw(); } else jumpTo(oct.anchor || 'center');
    }
    /* 장소 값(place())이 바뀌면 opts.on.place(p) 한 번 — 의식이 스스로 바꿀 때도 (앱의 화면 낭독기용 장면 설명이 따라간다). setPlace('play', o) = goRoom('play', o) */
    function setPlace(p, o) { if (isRoomP(p)) { goRoom(p, o); return; } var was = PLACE.cur; setPlaceNow(p, o); if (PLACE.cur !== was && on.place) on.place(PLACE.cur); }
    function setPlaceNow(p, o) {
      p = p === 'exterior' ? 'exterior' : 'attic'; o = o || {};
      var swap = o.onSwap || function () { defaultSwap(p); };
      if (PLACE.room) {   /* 놀이방에 있는 동안: 이야기 장소만 바뀐다 — 화면·전환은 그대로, 문어 그룹만 옮기고 자리 맞춤(swap)은 바로 (안 보이는 곳에서) */
        if (p === PLACE.cur) return;
        PLACE.cur = p; var gp = groupOf(p); if (octG.parent !== gp) gp.add(octG); swap(p); return;
      }
      if (PLACE.trans) finishTrans();
      if (p === PLACE.vis) { PLACE.cur = p; return; }
      PLACE.cur = p;
      if (o.instant || st.reduced || !ready) { showPlace(p); swap(p); PLACE.fade = 0; return; }
      PLACE.trans = { from: PLACE.vis, to: p, t: 0, swapped: false, swap: swap, axis: 'y', sgn: 1, D: TRANS_DY, dur: o.dur > 0 ? o.dur : 0 };
    }
    function transSwap(tr) { tr.swapped = true; groupOf(tr.from).position.set(0, 0, 0); if (tr.resolve) tr.to = tr.resolve(); showPlace(tr.to); tr.swap(tr.to); }   /* 가운데 한 프레임: 나가는 장소 → 들어오는 장소 (resolve = 그때 정하는 목적지) */
    function finishTrans() { var tr = PLACE.trans; if (!tr) return; if (!tr.swapped) transSwap(tr); groupOf(tr.to).position.set(0, 0, 0); PLACE.fade = 0; PLACE.trans = null; }
    function transOff(g, d, tr) {   /* 미끄럼 변위 d (m) → 세로 = 화면 세로 정수 px (snapUp) · 가로 = 카메라 화면 가로 축(_r, y 성분 0) 정수 px — 가로 전환엔 위아래 움직임이 없다 */
      if (tr.axis === 'x') g.position.copy(_r).multiplyScalar(Math.round(d / S.pw) * S.pw); else g.position.set(0, d < 0 ? -snapUp(-d) : snapUp(d), 0);
    }
    function stepTrans(dt) {
      var tr = PLACE.trans; if (!tr) return;
      tr.t += dt; var k = Math.min(1, tr.t / (tr.dur || TRANS_DUR));   /* dur = 짧은 전환 (데려온 귀가 0.3 s) */
      if (k < 0.5) { var a = k / 0.5; transOff(groupOf(tr.from), -tr.sgn * tr.D * a * a, tr); PLACE.fade = a; }   /* 세로: 아래로 · 가로 sgn +1: 왼쪽으로 (놀이방은 오른쪽 방) */
      else {
        if (!tr.swapped) transSwap(tr);
        var b = (k - 0.5) / 0.5; transOff(groupOf(tr.to), tr.sgn * tr.D * (1 - b) * (1 - b), tr); PLACE.fade = 1 - b;
      }
      if (k >= 1) { groupOf(tr.to).position.set(0, 0, 0); PLACE.fade = 0; PLACE.trans = null; }
    }

    /* ── 방 문 (8물결 · 카드 18): goRoom('play') = 지금 보이는 곳에서 놀이방으로 (다락이면 다락 문을 열고, 바깥이면 문 없이) · goRoom('attic') = 놀이방 문을 열고 이야기 장소로
       (place(): 문어가 집이면 다락, 나가 있으면 바깥 — 놀이방에 있는 동안 산책이 진행됐으면 그 자리로). 순서:
       [문 앞으로 걷기: opts.walkFirst — 내 캐릭터가 문 앞 앵커까지 걷고 문을 보며 선다 (playerWalkTo)] → 문짝 열림 4프레임(12 fps) + on.door({act:'open'}) → 가로 전환 0.6 s (앞 0.3 s 나가는 방이 옆으로 밀려 나가며
       디더로 허공색, 뒤 0.3 s 들어오는 방이 옆에서 들어옴 · 화면 가로 정수 px · 한 프레임엔 한 장소) → 들어온 쪽 문이 닫힘 4프레임 + on.door({act:'close'}) → Promise.
       모션 감소 = 열린 문 한 장(0.15 s) → 컷 → 닫힌 문 (소리 알림은 같다). instant = 문 프레임 없이 바로 컷 (알림은 그대로). 문 작업은 의식 큐(CER)와 따로 돈다 ── */
    var DOOR_HOLD_REDUCED = 0.15, PLAY_DOOR = null;
    function dqRun(name, items, onDoor) {
      DQ.q = items; DQ.cur = null; DQ.active = true; DQ.name = name; DQ.onDoor = onDoor || null;
      return new Promise(function (res) { DQ.done = res; });
    }
    function stepDQ(dt) {
      for (var guard = 0; DQ.active && guard < 32; guard++) {
        if (!DQ.cur) {
          if (!DQ.q.length) { DQ.active = false; DQ.name = ''; DQ.instant = false; DQ.onDoor = null; var d = DQ.done; DQ.done = null; if (d) d({ ok: true, view: PLACE.vis, room: PLACE.room, place: PLACE.cur }); return; }
          DQ.cur = DQ.q.shift(); DQ.cur.t = 0; if (DQ.cur.start) DQ.cur.start();
        }
        var c = DQ.cur; c.t += dt; if (DQ.instant) c.t = Math.max(c.t, c.dur || 0);
        if (c.update) c.update(c.dur > 0 ? Math.min(1, c.t / c.dur) : 1);
        if (c.until ? !c.until() : c.t + 1e-9 < c.dur) return;
        dt = c.until ? 0 : c.t - c.dur; if (c.end) c.end(); DQ.cur = null;
      }
    }
    function dqFinish() { plFinish(); if (!DQ.active) return; DQ.instant = true; if (PLACE.trans && PLACE.trans.door) finishTrans(); stepDQ(0); }   /* 컨텍스트 잃음·destroy: 남은 문 작업을 지금 끝낸다 (Promise 는 푼다) */
    function doorEvent(ev) { emit('door', ev); if (typeof DQ.onDoor === 'function') { try { DQ.onDoor(ev); } catch (e) { console.error('[scene3d] onDoor', e); } } }
    function doorItem(getD, open, getEv) {   /* 문짝 4프레임 (D 가 없으면 알림만) */
      var it = { dur: 0 }, D = null;
      it.start = function () {
        D = getD(); doorEvent(getEv());
        it.dur = DQ.instant || !D ? 0 : st.reduced ? (open ? DOOR_HOLD_REDUCED : 0) : 4 / 12;
        if (D && (st.reduced || !it.dur)) setLeaf(D, open ? 4 : 0);
      };
      it.update = function (k) { if (!D || !it.dur || st.reduced) return; var f = Math.min(4, Math.floor(k * 4 + 1e-6) + 1); setLeaf(D, open ? f : 4 - f); };
      it.end = function () { if (D) setLeaf(D, open ? 4 : 0); };
      return it;
    }
    function slideItem(from, resolveTo, sgn, swap, axis) {   /* 가로 전환 하나 (PLACE.trans, door 표시 — 의식의 finishTrans 가 끊지 않는다). 모션 감소·instant = 컷 */
      var it = { dur: 0 }, tr = null;
      it.start = function () {
        if (PLACE.trans) finishTrans();
        tr = { from: from, to: null, resolve: resolveTo, t: 0, swapped: false, swap: swap, axis: axis || 'x', sgn: sgn, D: axis === 'y' ? TRANS_DY : TRANS_DX, door: true };
        if (st.reduced || DQ.instant) { transSwap(tr); PLACE.fade = 0; tr = null; return; }
        PLACE.trans = tr;
      };
      it.until = function () { return !tr || PLACE.trans !== tr; };
      return it;
    }
    function goRoom(room, o) {
      o = o || {};
      var enter = isRoomP(room), stair = room === 'loft' || (!enter && PLACE.room === 'loft');   /* 위층은 문이 아니라 계단: 문짝 · 끼익 없이 위아래로 미끄러진다 */
      function no(why) { return Promise.resolve({ ok: false, reason: why, view: PLACE.vis, room: PLACE.room, place: PLACE.cur }); }
      if (DQ.active || DQ.pending) return no('busy');
      if (INTRO.on) return no('intro');
      if (enter ? PLACE.room === room : !PLACE.room) return no('here');
      if (enter && (PLACE.room || (room === 'loft' && PLACE.vis !== 'attic'))) return no('far');   /* 방에서 방으로 바로는 못 간다 (거실을 거친다) · 계단은 거실에만 있다 */
      var anchor = stair ? (enter ? 'atticStair' : 'loftStair') : enter ? (PLACE.vis === 'attic' && !PLACE.trans ? 'atticPlayDoor' : null) : 'playAtticDoor';
      var walk = typeof o.walkFirst === 'function' ? o.walkFirst : o.walkFirst ? playerWalkTo : null;
      if (stair) enter = enter ? 'up' : 'down';
      if (!walk || !anchor) return runDoor(enter, o);
      DQ.pending = true;   /* 걷는 동안 두 번째 톡은 'busy' — 문 단추도 숨는다 */
      return Promise.resolve().then(function () { return walk(anchor, DOOR_ANCHORS[anchor].slice()); }).then(function (r) {
        DQ.pending = false;
        if (r === false || (r && r.ok === false)) return { ok: false, reason: 'walk', view: PLACE.vis, room: PLACE.room, place: PLACE.cur };
        if (DQ.active || INTRO.on || (enter === true || enter === 'up' ? PLACE.room : !PLACE.room)) return { ok: false, reason: 'busy', view: PLACE.vis, room: PLACE.room, place: PLACE.cur };
        return runDoor(enter, o);
      }, function () { DQ.pending = false; return { ok: false, reason: 'walk', view: PLACE.vis, room: PLACE.room, place: PLACE.cur }; });
    }
    function runDoor(enter, o) {
      if (SAL.active) salFinishNow();   /* 미용실 연출 중에 문으로 나가면 끝 상태로 감고 */
      if (enter === true && !PROOM) buildPlayRoom();
      if (enter === 'up' && !LROOM) buildLoft();
      if (PLACE.trans) finishTrans();   /* 이야기 전환(다락 ↔ 바깥)이 돌던 중이면 끝 자리에서 출발 */
      var from = PLACE.vis, ctx = { to: 'play' }, items;
      DQ.instant = !!o.instant || !ready || ctxLost() || !!st.hidden;   /* 탭이 숨었거나 컨텍스트를 잃어 프레임이 안 도는 동안은 바로 (Promise 가 걸려 있지 않게) · debugStep 으로 멈춘 루프는 손으로 민다 */
      if (enter === 'up') {
        PLACE.room = 'loft'; container.dataset.room = 'loft';
        items = [slideItem(from, function () { return 'loft'; }, 1, function () { plEnter('loft'); octMountLoft(); }, 'y')];   /* 거실이 아래로 내려가고 위층이 위에서 내려온다 */
      } else if (enter === 'down') {
        items = [slideItem('loft', function () { PLACE.room = null; container.dataset.room = ''; ctx.to = PLACE.cur; return ctx.to; }, -1, function (to) { plEnter(to, 'loft'); }, 'y')];
      } else if (enter) {
        var AD = from === 'attic' ? ATTIC_DOOR : null;
        PLACE.room = 'play'; container.dataset.room = 'play';   /* 지금부터 의식은 이야기 장소만 바꾼다 (문이 열리는 동안에도 끌려 나가지 않게) */
        items = [doorItem(function () { return AD; }, true, function () { return { act: 'open', room: 'play', door: AD ? 'atticPlay' : null, from: from }; }),
          slideItem(from, function () { return 'play'; }, 1, function () { setLeaf(ATTIC_DOOR, 0); setLeaf(PLAY_DOOR, 4); plEnter('play'); }),
          doorItem(function () { return PLAY_DOOR; }, false, function () { return { act: 'close', room: 'play', door: 'playAttic', from: from }; })];
      } else {
        items = [doorItem(function () { return PLAY_DOOR; }, true, function () { return { act: 'open', room: PLACE.cur, door: 'playAttic', from: 'play' }; }),
          slideItem('play', function () { PLACE.room = null; container.dataset.room = ''; ctx.to = PLACE.cur; return ctx.to; }, -1,   /* 목적지는 가운데 프레임에서 정한다 (문이 열리는 사이 문어가 돌아왔으면 다락) · 거기서 방을 놓는다 */
            function (to) { setLeaf(PLAY_DOOR, 0); if (to === 'attic') setLeaf(ATTIC_DOOR, 4); plEnter(to); }),
          doorItem(function () { return ctx.to === 'attic' ? ATTIC_DOOR : null; }, false, function () { return { act: 'close', room: ctx.to, door: ctx.to === 'attic' ? 'atticPlay' : null, from: 'play' }; })];
      }
      var p = dqRun(enter === true || enter === 'up' ? 'enter' : 'leave', items, o.onDoor);
      if (DQ.instant) stepDQ(0);
      dither.still = 0;
      return p;
    }

    /* ── 놀이방 (8물결): 다락과 같은 집 — 같은 바닥 널·벽 판자·받침 지층·재질·팔레트·카메라 각도·픽셀 밀도. 바닥 2·PLAY_R 정사각 · 벽 PLAY_H (판자 ≈ 0.3 m 줄).
       왼쪽 벽: 다락으로 가는 문(같은 문의 다른 얼굴) + 앞쪽 창 (해가 다락처럼 −x 쪽에서 들어와 빈 바닥 가운데에 창 모양 빛 조각) · 뒷벽: '다락방 달리기' 오락기(왼쪽) · 부엌 자리(조리대·냄비, 오른쪽).
       가운데 바닥은 비워 둔다 (나중 꾸미기 자리). 점광 2 (벽 등 둘 — 다락의 등불·양초와 같은 수라 첫 전환에 새 셰이더가 없다), 낮에도 밤에도 켜짐.
       드로우콜: 정적 병합 1 + 문틀은 정적에 · 문짝 1 · 문간판 1(열렸을 때만) · 창 1(+발광) · 화면 1(+발광) · 전구 1(+발광) · 차폐 1 → 놀이방만 보일 때 낮 21 / 밤 22 (≤ 60, 앱에서 잰 값) ── */
    function spans(a, b, holes) {   /* [a, b] 에서 구멍 [h0, h1] 들을 뺀 조각들 */
      var out = [[a, b]];
      holes.forEach(function (h) { var nx = []; out.forEach(function (s) { if (h[1] <= s[0] || h[0] >= s[1]) nx.push(s); else { if (h[0] > s[0]) nx.push([s[0], h[0]]); if (h[1] < s[1]) nx.push([h[1], s[1]]); } }); out = nx; });
      return out.filter(function (s) { return s[1] - s[0] > 1e-4; });
    }
    var PLAY_WIN = { z0: 0.72, z1: 1.52, y0: 0.9, y1: 1.8 }, PLAY_DOOR_Z = snapPos(DOOR_ANCHORS.playAtticDoor[2]), PLAY_MX = -1.8;   /* 11-10: 방을 넓히며 오락기를 왼쪽으로 (조리대와 사이를 띄운다) */
    var SCR = { bg: PAL.navy[4], run: PAL.rose[2], hide: PAL.navy[4] };
    function buildPlayRoom() {
      var Rp = PLAY_R, H = PLAY_H, g = new T.Group(); g.name = 'play'; g.visible = false; scene.add(g);
      var pp = [], n = 0, P = 0.12, dw = 0.72, dh = 1.68, WZ = PLAY_WIN, MX = PLAY_MX;
      /* 바닥 (다락과 같은 널: 피치 ≈ 0.21 m · 이음 0.05 · 2색 교대 · 길이 시드 'pfl') + 받침 지층 */
      var NB = Math.round(2 * Rp / 0.212), pitch = 2 * Rp / NB;
      pp.push({ g: box(2 * Rp, 0.1, 2 * Rp), m: M(0, -0.05, 0), c: MAT.floorSeam });
      for (var i = 0; i < NB; i++) {
        var fx = -Rp + pitch * (i + 0.5), fz = -Rp, k = 0;
        while (fz < Rp) {
          var len = 0.9 + (hash('pfl' + i + '_' + k) % 100) / 100 * 1.2, last = fz + len > Rp - 0.45;
          if (last) len = Rp - fz;
          pp.push({ g: box(pitch - FLOOR_SEAM, 0.02, last ? len : len - FLOOR_SEAM), m: M(fx, -0.006, fz + (last ? len : len - FLOOR_SEAM) / 2), c: (i + k) % 2 ? MAT.floorA : MAT.floorB });
          fz += len; k++;
        }
      }
      [[0.55, 0.7], [-0.9, 1.25]].forEach(function (q) { pp.push({ g: box(0.09, 0.012, 0.09), m: M(snapPos(q[0]), 0.0, snapPos(q[1])), c: MAT.knot }); n++; });
      var SW = 2 * Rp + 2 * SLAB_OV;
      pp.push({ g: box(SW, 6 * PX, SW), m: M(0, -3 * PX, 0), c: MAT.slabTop });
      pp.push({ g: box(SW + 0.02, PX, SW + 0.02), m: M(0, -6.5 * PX, 0), c: MAT.slabLine });
      pp.push({ g: box(SW, 6 * PX, SW), m: M(0, -10 * PX, 0), c: MAT.slabBase });
      /* 벽 2면 (판자 줄 0.3 m · 줄 사이 1px 이음 · 왼쪽 벽에 문·창 구멍) */
      var rows = Math.max(1, Math.round(H / 0.3)), rh = H / rows;
      var holesL = [[PLAY_DOOR_Z - dw / 2 - P, PLAY_DOOR_Z + dw / 2 + P, 0, dh + P], [WZ.z0, WZ.z1, WZ.y0, WZ.y1]];
      for (i = 0; i < rows; i++) {
        var y0 = i * rh, y1 = y0 + rh, yc = (y0 + y1) / 2, cl = i % 2 ? MAT.wallA : MAT.wallB, cb = i % 2 ? MAT.wallB : MAT.wallA;
        var hs = holesL.filter(function (h) { return h[2] < y1 - 1e-6 && h[3] > y0 + 1e-6; });
        spans(-Rp, Rp, hs).forEach(function (s) { pp.push({ g: box(0.12, rh, s[1] - s[0]), m: M(-Rp, yc, (s[0] + s[1]) / 2), c: cl }); });
        hs.forEach(function (h) {   /* 구멍이 줄 높이를 다 못 채우면 위·아래 메움 (문·창 높이를 줄에 맞춰 두어 보통은 없음) */
          if (h[3] < y1 - 1e-6) pp.push({ g: box(0.12, y1 - Math.max(h[3], y0), h[1] - h[0]), m: M(-Rp, (y1 + Math.max(h[3], y0)) / 2, (h[0] + h[1]) / 2), c: cl });
          if (h[2] > y0 + 1e-6) pp.push({ g: box(0.12, Math.min(h[2], y1) - y0, h[1] - h[0]), m: M(-Rp, (y0 + Math.min(h[2], y1)) / 2, (h[0] + h[1]) / 2), c: cl });
        });
        pp.push({ g: box(2 * Rp, rh, 0.12), m: M(0, yc, -Rp), c: cb });
        if (i === 0) continue;
        var hb = holesL.filter(function (h) { return h[2] < y0 && h[3] > y0; });
        spans(-Rp, Rp, hb).forEach(function (s) { pp.push({ g: box(0.02, 0.045, s[1] - s[0]), m: M(-Rp + 0.065, y0, (s[0] + s[1]) / 2), c: MAT.wallSeam }); });
        pp.push({ g: box(2 * Rp, 0.045, 0.02), m: M(0, y0, -Rp + 0.065), c: MAT.wallSeam });
      }
      pp.push({ g: box(0.2, H, 0.2), m: M(-Rp, H / 2, -Rp), c: W[1] });                                                     /* 모서리 기둥 (벽 높이까지 — 위로 솟으면 360×640 에서 잘린다) */
      pp.push({ g: box(0.14, H, 0.14), m: M(-Rp + 0.09, H / 2, snapPos(-1.25)), c: MAT.stud }); pp.push({ g: box(0.14, H, 0.14), m: M(snapPos(-0.3), H / 2, -Rp + 0.09), c: MAT.stud }); n += 2;   /* 샛기둥 */
      /* 창 (왼쪽 벽 앞쪽): 턱·틀·살 (다락 창과 같은 짜임) */
      var wzc = (WZ.z0 + WZ.z1) / 2, wyc = (WZ.y0 + WZ.y1) / 2, wzl = WZ.z1 - WZ.z0, wyl = WZ.y1 - WZ.y0;
      pp.push({ g: box(0.36, 0.07, wzl + 0.34), m: M(-Rp + 0.17, WZ.y0, wzc), c: W[2] });
      [WZ.y0 - 0.05, WZ.y1 + 0.05].forEach(function (y) { pp.push({ g: box(0.1, 0.1, wzl + 0.2), m: M(-Rp + 0.1, y, wzc), c: W[1] }); });
      [WZ.z0 - 0.05, WZ.z1 + 0.05].forEach(function (z) { pp.push({ g: box(0.1, wyl + 0.2, 0.1), m: M(-Rp + 0.1, wyc, z), c: W[1] }); });
      pp.push({ g: box(0.07, wyl, 0.06), m: M(-Rp + 0.1, wyc, wzc), c: W[1] }); pp.push({ g: box(0.07, 0.06, wzl), m: M(-Rp + 0.1, wyc, wzc), c: W[1] }); n++;
      /* 문 앞 깔개 */
      pp.push({ g: box(0.56, 0.008, 0.86), m: M(-Rp + 0.42, 0.004, PLAY_DOOR_Z), c: MAT.rugEdge }); pp.push({ g: box(0.46, 0.01, 0.76), m: M(-Rp + 0.42, 0.005, PLAY_DOOR_Z), c: MAT.rugA }); n++;
      /* '다락방 달리기' 오락기 (뒷벽 왼쪽): 아랫장 · 조작판(기울임) + 막대·단추 2 · 윗장 + 화면 테 · 간판 · 옆판(호박·장미 줄) */
      var zb = -Rp + 0.06, body = PAL.navy[3], side = PAL.navy[2];
      pp.push({ g: box(0.62, 0.86, 0.5), m: M(MX, 0.43, zb + 0.25), c: body });
      pp.push({ g: box(0.62, 0.07, 0.24), m: M(MX, 0.9, zb + 0.46, -0.35, 0, 0), c: PAL.navy[4] });
      pp.push({ g: new T.CylinderGeometry(0.014, 0.014, 0.09, 5), m: M(MX - 0.13, 0.97, zb + 0.5), c: PAL.ink }); pp.push({ g: new T.SphereGeometry(0.035, 6, 5), m: M(MX - 0.13, 1.02, zb + 0.5), c: PAL.rose[1] });
      pp.push({ g: new T.CylinderGeometry(0.03, 0.03, 0.03, 7), m: M(MX + 0.05, 0.95, zb + 0.48), c: PAL.amber[3] }); pp.push({ g: new T.CylinderGeometry(0.03, 0.03, 0.03, 7), m: M(MX + 0.16, 0.95, zb + 0.46), c: PAL.sky[2] });
      pp.push({ g: box(0.62, 0.52, 0.36), m: M(MX, 1.2, zb + 0.18), c: body });
      pp.push({ g: box(0.5, 0.42, 0.02), m: M(MX, 1.2, zb + 0.365), c: PAL.navy[0] });
      pp.push({ g: box(0.62, 0.15, 0.4), m: M(MX, 1.535, zb + 0.2), c: PAL.amber[3] });
      pp.push({ g: box(0.66, 0.05, 0.42), m: M(MX, 1.635, zb + 0.2), c: side });
      [-1, 1].forEach(function (s) { pp.push({ g: box(0.04, 1.66, 0.54), m: M(MX + s * 0.33, 0.83, zb + 0.27), c: side }); });
      pp.push({ g: box(0.012, 0.1, 0.5), m: M(MX + 0.356, 0.66, zb + 0.27), c: PAL.amber[2] }); pp.push({ g: box(0.012, 0.06, 0.5), m: M(MX + 0.356, 0.52, zb + 0.27), c: PAL.rose[2] });
      pp.push({ g: box(0.6, 0.06, 0.02), m: M(MX, 0.03, zb + 0.505), c: PAL.ink }); n++;
      var kStart = pp.length, KX = Rp - 2.4;   /* 부엌 묶음은 방 오른쪽 구석에 붙어 따라간다 (아래 x 는 Rp 2.4 기준) */
      /* 부엌 자리 (뒷벽 오른쪽): 조리대 (몸 · 문 2 · 손잡이 · 윗판 · 걸레받이) + 냄비 · 프라이팬 + 벽 선반 · 병 3 — 요리는 9물결 */
      var cx = 0.95, cz = zb + 0.27;
      pp.push({ g: box(1.4, 0.8, 0.54), m: M(cx, 0.42, cz), c: W[3] });
      pp.push({ g: box(1.36, 0.06, 0.02), m: M(cx, 0.03, cz + 0.275), c: W[1] });
      [0.62, 1.28].forEach(function (x) { pp.push({ g: box(0.62, 0.56, 0.02), m: M(x, 0.46, cz + 0.28), c: W[4] }); });
      [0.88, 1.02].forEach(function (x) { pp.push({ g: box(0.04, 0.05, 0.03), m: M(x, 0.62, cz + 0.295), c: PAL.amber[3] }); });
      pp.push({ g: box(1.46, 0.05, 0.6), m: M(cx, 0.845, cz + 0.02), c: PAL.paper[2] }); n++;
      var ct = 0.87;
      pp.push({ g: new T.CylinderGeometry(0.15, 0.13, 0.18, 9), m: M(0.6, ct + 0.09, cz), c: PAL.slate[2] });
      pp.push({ g: new T.CylinderGeometry(0.155, 0.155, 0.025, 9), m: M(0.6, ct + 0.19, cz), c: PAL.slate[3] });
      pp.push({ g: new T.SphereGeometry(0.03, 6, 5), m: M(0.6, ct + 0.22, cz), c: PAL.slate[1] });
      [-1, 1].forEach(function (s) { pp.push({ g: box(0.06, 0.03, 0.04), m: M(0.6 + s * 0.17, ct + 0.15, cz), c: PAL.slate[1] }); }); n++;
      pp.push({ g: new T.CylinderGeometry(0.12, 0.1, 0.05, 9), m: M(1.25, ct + 0.025, cz + 0.02), c: PAL.slate[1] });
      pp.push({ g: box(0.24, 0.025, 0.04), m: M(1.25 + 0.21, ct + 0.04, cz + 0.12, 0, -0.5, 0), c: W[1] }); n++;
      pp.push({ g: box(1.2, 0.05, 0.24), m: M(cx, 1.55, -Rp + 0.18), c: W[2] });
      [0.45, 1.45].forEach(function (x) { pp.push({ g: box(0.04, 0.14, 0.18), m: M(x, 1.46, -Rp + 0.15), c: W[1] }); });
      [[0.62, 0.06, 0.16, PAL.moss[2]], [0.8, 0.055, 0.12, PAL.amber[2]], [1.22, 0.065, 0.18, PAL.glass[2]]].forEach(function (j) {
        pp.push({ g: new T.CylinderGeometry(j[1], j[1], j[2], 7), m: M(j[0], 1.575 + j[2] / 2, -Rp + 0.18), c: j[3] });
        pp.push({ g: new T.CylinderGeometry(j[1] + 0.005, j[1] + 0.005, 0.03, 7), m: M(j[0], 1.575 + j[2] + 0.015, -Rp + 0.18), c: W[1] });
      }); n++;
      /* 11-10 부엌 넓히기 (주인: "빈 공간에 ㄱ자로 · 오븐 · 조리 기구 벽에 · 선반도"): 뒷벽 줄을 오른쪽 구석까지 잇고(오븐 레인지 + 후드), 거기서 카메라 쪽으로 꺾인 다리(개수대 · 도마), 뒷벽에 걸이 봉 + 조리 기구, 윗선반 */
      var ox = 2.02, lx = 2.07, lz0 = zb + 0.54, lz1 = -0.2, lzc = (lz0 + lz1) / 2, ll = lz1 - lz0;
      pp.push({ g: box(0.66, 0.82, 0.54), m: M(ox, 0.41, cz), c: PAL.slate[1] });                                   /* 오븐 몸 */
      pp.push({ g: box(0.5, 0.4, 0.02), m: M(ox, 0.36, cz + 0.28), c: PAL.slate[2] }); pp.push({ g: box(0.34, 0.2, 0.02), m: M(ox, 0.38, cz + 0.29), c: PAL.navy[0] });   /* 오븐 문 + 유리 */
      pp.push({ g: box(0.44, 0.03, 0.04), m: M(ox, 0.6, cz + 0.3), c: PAL.paper[2] });                              /* 손잡이 */
      [-0.2, -0.07, 0.07, 0.2].forEach(function (d, k) { pp.push({ g: box(0.05, 0.05, 0.03), m: M(ox + d, 0.73, cz + 0.285), c: k === 1 ? PAL.rose[2] : PAL.amber[3] }); });   /* 불 조절 단추 4 */
      pp.push({ g: box(0.7, 0.04, 0.58), m: M(ox, 0.84, cz + 0.01), c: PAL.slate[0] });                             /* 화구 판 */
      [[-0.15, -0.1], [0.16, -0.1], [-0.15, 0.14], [0.16, 0.14]].forEach(function (q) { pp.push({ g: new T.CylinderGeometry(0.085, 0.085, 0.02, 8), m: M(ox + q[0], 0.87, cz + q[1]), c: PAL.slate[2] }); });
      pp.push({ g: new T.CylinderGeometry(0.1, 0.12, 0.14, 8), m: M(ox - 0.15, 0.95, cz - 0.1), c: PAL.rose[2] }); pp.push({ g: new T.SphereGeometry(0.03, 6, 5), m: M(ox - 0.15, 1.04, cz - 0.1), c: PAL.ink });
      pp.push({ g: box(0.16, 0.03, 0.03), m: M(ox - 0.02, 1.0, cz - 0.1, 0, 0, 0.5), c: PAL.rose[1] }); n += 2;      /* 주전자 */
      pp.push({ g: box(0.7, 0.16, 0.44), m: M(ox, 1.62, -Rp + 0.28), c: PAL.slate[2] }); pp.push({ g: box(0.74, 0.04, 0.48), m: M(ox, 1.53, -Rp + 0.3), c: PAL.slate[1] });
      pp.push({ g: box(0.26, H - 1.7, 0.22), m: M(ox, (H + 1.7) / 2, -Rp + 0.17), c: PAL.slate[2] }); n++;          /* 후드 + 연통 */
      pp.push({ g: box(0.54, 0.8, ll), m: M(lx, 0.42, lzc), c: W[3] });                                              /* 꺾인 다리 */
      pp.push({ g: box(0.02, 0.06, ll - 0.04), m: M(lx - 0.275, 0.03, lzc), c: W[1] });
      [lz0 + ll * 0.25, lz0 + ll * 0.75].forEach(function (z) { pp.push({ g: box(0.02, 0.56, ll / 2 - 0.08), m: M(lx - 0.28, 0.46, z), c: W[4] }); pp.push({ g: box(0.03, 0.05, 0.04), m: M(lx - 0.295, 0.62, z + (z < lzc ? 0.22 : -0.22)), c: PAL.amber[3] }); });
      pp.push({ g: box(0.6, 0.05, ll + 0.06), m: M(lx - 0.02, 0.845, lzc + 0.03), c: PAL.paper[2] }); n++;
      pp.push({ g: box(0.36, 0.02, 0.46), m: M(lx, 0.872, lz0 + 0.42), c: PAL.slate[1] }); pp.push({ g: box(0.3, 0.012, 0.4), m: M(lx, 0.884, lz0 + 0.42), c: PAL.slate[0] });   /* 개수대 */
      pp.push({ g: new T.CylinderGeometry(0.018, 0.018, 0.2, 6), m: M(lx + 0.2, 0.97, lz0 + 0.42), c: PAL.paper[1] }); pp.push({ g: box(0.14, 0.03, 0.03), m: M(lx + 0.14, 1.07, lz0 + 0.42), c: PAL.paper[1] }); n++;   /* 수도꼭지 */
      pp.push({ g: box(0.3, 0.025, 0.4), m: M(lx - 0.02, 0.883, lz1 - 0.42), c: W[4] });                             /* 도마 */
      pp.push({ g: new T.SphereGeometry(0.055, 7, 5), m: M(lx - 0.06, 0.94, lz1 - 0.48), c: PAL.rose[2] }); pp.push({ g: new T.SphereGeometry(0.05, 7, 5), m: M(lx + 0.04, 0.935, lz1 - 0.36), c: PAL.amber[3] });
      pp.push({ g: box(0.16, 0.012, 0.03), m: M(lx - 0.02, 0.9, lz1 - 0.26, 0, 0.3, 0), c: PAL.paper[1] }); n += 2;
      /* 걸이 봉 + 조리 기구 (뒷벽, 조리대 위) */
      var ry = 1.3, rz = -Rp + 0.1;
      pp.push({ g: box(1.3, 0.03, 0.03), m: M(cx, ry, rz), c: PAL.slate[1] }); [0.35, 1.55].forEach(function (x) { pp.push({ g: box(0.04, 0.04, 0.08), m: M(x, ry, -Rp + 0.08), c: PAL.slate[1] }); });
      pp.push({ g: box(0.025, 0.24, 0.02), m: M(0.5, ry - 0.13, rz), c: W[1] }); pp.push({ g: new T.SphereGeometry(0.05, 6, 5), m: M(0.5, ry - 0.28, rz), c: PAL.slate[2] });          /* 국자 */
      pp.push({ g: box(0.025, 0.2, 0.02), m: M(0.72, ry - 0.11, rz), c: W[1] }); pp.push({ g: box(0.08, 0.11, 0.015), m: M(0.72, ry - 0.26, rz), c: PAL.slate[2] });                 /* 뒤집개 */
      pp.push({ g: box(0.03, 0.14, 0.02), m: M(1.0, ry - 0.08, rz), c: W[1] }); pp.push({ g: new T.CylinderGeometry(0.11, 0.11, 0.03, 9), m: M(1.0, ry - 0.26, rz, Math.PI / 2, 0, 0), c: PAL.slate[1] });   /* 걸린 팬 */
      pp.push({ g: box(0.025, 0.14, 0.02), m: M(1.28, ry - 0.08, rz), c: W[1] }); pp.push({ g: new T.SphereGeometry(0.045, 5, 4), m: M(1.28, ry - 0.2, rz, 0, 0, 0, 1, 1.6, 0.6), c: PAL.paper[1] });      /* 거품기 */
      pp.push({ g: box(0.1, 0.16, 0.012), m: M(1.47, ry - 0.1, rz), c: PAL.rose[2] }); n += 5;                                                                                    /* 냄비 장갑 */
      /* 윗선반: 접시 · 컵 */
      pp.push({ g: box(1.2, 0.05, 0.24), m: M(cx, 1.92, -Rp + 0.18), c: W[2] }); [0.45, 1.45].forEach(function (x) { pp.push({ g: box(0.04, 0.14, 0.18), m: M(x, 1.83, -Rp + 0.15), c: W[1] }); });
      [0.56, 0.62, 0.68].forEach(function (x) { pp.push({ g: new T.CylinderGeometry(0.09, 0.09, 0.015, 9), m: M(x, 2.04, -Rp + 0.18, 0, 0, Math.PI / 2), c: PAL.paper[1] }); });
      [[0.95, PAL.sky[2]], [1.12, PAL.rose[2]], [1.29, PAL.moss[2]]].forEach(function (q) { pp.push({ g: new T.CylinderGeometry(0.045, 0.04, 0.09, 7), m: M(q[0], 1.99, -Rp + 0.18), c: q[1] }); }); n += 2;
      for (i = kStart; i < pp.length; i++) pp[i].m = new T.Matrix4().makeTranslation(KX, 0, 0).multiply(pp[i].m);
      /* 벽 등 2 (받침 — 갓·전구는 아래 빛 안 받는 발광 메시: 낮에도 켜진 등으로 읽히게) */
      var SC = [[-0.3, 1.7, -Rp + 0.24, 'z'], [-Rp + 0.24, 1.7, snapPos(0.39), 'x']];
      SC.forEach(function (q) {
        var ax = q[3] === 'x';
        pp.push({ g: box(ax ? 0.16 : 0.06, 0.06, ax ? 0.06 : 0.16), m: M(ax ? -Rp + 0.14 : q[0], 1.8, ax ? q[2] : -Rp + 0.14), c: W[1] }); n++;
      });
      /* 놀이방 → 다락 문 (왼쪽 벽, 다락 문과 같은 칠): 문틀은 벽에 박힌 깊은 틀 (0.2 m), 그림자를 던진다 (닫히면 문짝이, 열리면 문간판이 해를 막는다) */
      PLAY_DOOR = makeDoor(Object.assign({}, DOOR_PAINT, { name: 'playAttic', parent: g, x: -Rp, z: PLAY_DOOR_Z, w: dw, h: dh, depth: 0.2, cast: true, sill: null }));
      var room = new T.Mesh(keep(mergeParts(pp)), lambert); room.castShadow = true; room.receiveShadow = true; g.add(room);
      /* 창 유리: 다락 창의 재질을 같이 쓴다 (시각대 색·발광을 applyLight 가 이미 맞춘다) */
      var gl = new T.Mesh(keep(new T.PlaneGeometry(wzl, wyl)), glass.material); gl.position.set(-Rp + 0.01, wyc, wzc); gl.rotation.y = Math.PI / 2; g.add(gl);
      var glEm = new T.Mesh(gl.geometry, winEm.material); glEm.layers.set(1); glEm.castShadow = false; gl.add(glEm);
      /* 오락기 화면 (정점색, 빛 안 받음): 남색 바탕 · 풀 줄 · 달리는 문어 2프레임(태그 7/8, 0.5 s 마다 1px 폴짝 — 모션 감소면 멈춤) · 별 하나 + 발광 */
      var zs = zb + 0.375, sp = [{ g: new T.PlaneGeometry(0.42, 0.32), m: M(0, 0, 0), c: SCR.bg },
        { g: new T.PlaneGeometry(0.42, 0.06), m: M(0, -0.13, 0.002), c: PAL.moss[2] },
        { g: new T.PlaneGeometry(0.08, 0.08), m: M(-0.1, -0.06, 0.004), c: SCR.run, tag: 7 },
        { g: new T.PlaneGeometry(0.08, 0.08), m: M(-0.1, -0.06 + 1.5 * PX, 0.004), c: SCR.hide, tag: 8 },
        { g: new T.PlaneGeometry(0.045, 0.045), m: M(0.11, 0.07, 0.004), c: PAL.paper[0] }];
      var scrGeo = keep(mergeParts(sp)), scr = new T.Mesh(scrGeo, basicV); scr.position.set(MX, 1.2, zs + 0.005); g.add(scr);
      var scrEm = emTwin(scr, scrGeo);
      /* 등 갓 2 + 전구 2 (정점색, 빛 안 받음 = 늘 켜진 등) + 발광 · 점광 2 */
      var bp = []; SC.forEach(function (q) { bp.push({ g: new T.CylinderGeometry(0.07, 0.11, 0.13, 8), m: M(q[0], 1.76, q[2]), c: PAL.amber[4] }); bp.push({ g: new T.SphereGeometry(0.05, 6, 5), m: M(q[0], 1.68, q[2]), c: PAL.amber[5] }); });
      var bulbGeo = keep(mergeParts(bp));
      var bulbs = new T.Mesh(bulbGeo, basicV); g.add(bulbs);
      var bulbEm = emTwin(bulbs, bulbGeo);
      var lA = new T.PointLight(C('#ffb066').getHex(), 0, 4.6, 2); lA.position.set(-0.3, 1.62, -Rp + 0.5); g.add(lA);
      var lB = new T.PointLight(C('#ffb066').getHex(), 0, 4.2, 2); lB.position.set(-Rp + 0.5, 1.62, snapPos(0.39)); g.add(lB);
      /* 빛 차폐 (다락과 같은 꼴, 같은 재질): 보이지 않는 지붕·앞벽·오른벽·왼쪽 앞 날개 — 해는 창으로만. 노멀 패스에선 숨긴다 (draw) */
      var shp = new T.Mesh(keep(mergeParts([{ g: box(2 * Rp + 1.2, 0.05, 2 * Rp + 1.2), m: M(0, H + 0.06, 0), c: '#000000' }, { g: box(2 * Rp + 1.2, H + 1.2, 0.05), m: M(0, H / 2, Rp + 0.55), c: '#000000' },
        { g: box(0.05, H + 1.2, 2 * Rp + 1.2), m: M(Rp + 0.55, H / 2, 0), c: '#000000' }, { g: box(0.05, H + 1.2, 0.7), m: M(-Rp - 0.1, H / 2, Rp + 0.3), c: '#000000' }])), shade.material);
      shp.castShadow = true; shp.receiveShadow = false; shp.frustumCulled = false; shp.renderOrder = -10; g.add(shp);
      PROOM = { g: g, room: room, glass: gl, screen: scr, screenGeo: scrGeo, screenEm: scrEm, bulbs: bulbs, bulbEm: bulbEm, lA: lA, lB: lB, shade: shp, props: n,
        machineBox: new T.Box3(new T.Vector3(MX - 0.36, 0, zb), new T.Vector3(MX + 0.36, 1.66, zb + 0.54)), counterBox: new T.Box3(new T.Vector3(KX + cx - 0.73, 0, cz - 0.28), new T.Vector3(KX + ox + 0.35, 0.87, cz + 0.32)), legBox: new T.Box3(new T.Vector3(KX + lx - 0.3, 0, lz0), new T.Vector3(KX + lx + 0.3, 0.87, lz1 + 0.06)), scr: { t: 0, f: 0 } };   /* counterBox = 조리대 윗판 둘레 (내 캐릭터 장애물) */
      playApplyLight(); doorsApplyLight();
      return PROOM;
    }
    /* ── 위층 다락 (11-10 주인: "계단으로 이어지는 윗층 다락방 · 창문은 동그란 창에 + 살 · 세모난 면이 벽면 · 기둥 눕힌 것처럼 · 미용실과 재봉틀 · 옷감 · 염료 있는 옷방"):
       지붕 밑 방. 왼벽 = 박공벽(무릎 높이 LOFT_H 위로 세모, 가운데 LOFT_PEAK) + 크고 동그란 십자 창 · 뒷벽 = 낮은 무릎벽 · 눕힌 통나무(도리). 뒷벽 쪽 = 옷방(재봉틀 · 옷감 선반 · 염료 병 · 물들인 천 빨랫줄 · 마네킹),
       왼벽 앞쪽 = 미용실 자리(거울 · 의자 · 병 선반), 뒷벽 오른쪽 = 계단 구멍. 점광 2 (놀이방과 같은 수) ── */
    function buildLoft() {
      var Rl = LOFT_R, H = LOFT_H, PK = LOFT_PEAK, g = new T.Group(); g.name = 'loft'; g.visible = false; scene.add(g);
      var pp = [], n = 0, i;
      function gy(z) { return H + (PK - H) * Math.max(0, 1 - Math.abs(z) / Rl); }
      /* 바닥 + 받침 */
      var NB = Math.round(2 * Rl / 0.212), pitch = 2 * Rl / NB;
      pp.push({ g: box(2 * Rl, 0.1, 2 * Rl), m: M(0, -0.05, 0), c: MAT.floorSeam });
      for (i = 0; i < NB; i++) {
        var fx = -Rl + pitch * (i + 0.5), fz = -Rl, k = 0;
        while (fz < Rl) {
          var len = 0.9 + (hash('lfl' + i + '_' + k) % 100) / 100 * 1.2, last = fz + len > Rl - 0.45;
          if (last) len = Rl - fz;
          pp.push({ g: box(pitch - FLOOR_SEAM, 0.02, last ? len : len - FLOOR_SEAM), m: M(fx, -0.006, fz + (last ? len : len - FLOOR_SEAM) / 2), c: (i + k) % 2 ? MAT.floorA : MAT.floorB });
          fz += len; k++;
        }
      }
      var SW = 2 * Rl + 2 * SLAB_OV;
      pp.push({ g: box(SW, 6 * PX, SW), m: M(0, -3 * PX, 0), c: MAT.slabTop });
      pp.push({ g: box(SW + 0.02, PX, SW + 0.02), m: M(0, -6.5 * PX, 0), c: MAT.slabLine });
      pp.push({ g: box(SW, 6 * PX, SW), m: M(0, -10 * PX, 0), c: MAT.slabBase });
      /* 벽: 무릎벽 2면 (판자 줄 0.3) + 왼벽 위 박공 (줄 0.33, 위로 갈수록 짧게). 동그란 창을 감싸는 네모 구멍 */
      var WR = 0.72, wyc = 1.86, hole = [-WR - 0.02, WR + 0.02, wyc - WR - 0.02, wyc + WR + 0.02];
      function leftRow(y0, y1, half, c) {
        var yc = (y0 + y1) / 2, hit = hole[2] < y1 - 1e-6 && hole[3] > y0 + 1e-6;
        spans(-half, half, hit ? [hole] : []).forEach(function (sp) { pp.push({ g: box(0.12, y1 - y0, sp[1] - sp[0]), m: M(-Rl, yc, (sp[0] + sp[1]) / 2), c: c }); });
        if (hit && hole[3] < y1 - 1e-6) pp.push({ g: box(0.12, y1 - Math.max(hole[3], y0), hole[1] - hole[0]), m: M(-Rl, (y1 + Math.max(hole[3], y0)) / 2, 0), c: c });
        if (hit && hole[2] > y0 + 1e-6) pp.push({ g: box(0.12, Math.min(hole[2], y1) - y0, hole[1] - hole[0]), m: M(-Rl, (y0 + Math.min(hole[2], y1)) / 2, 0), c: c });
        if (y0 > 0.01) spans(-half, half, hole[2] < y0 && hole[3] > y0 ? [hole] : []).forEach(function (sp) { pp.push({ g: box(0.02, 0.045, sp[1] - sp[0]), m: M(-Rl + 0.065, y0, (sp[0] + sp[1]) / 2), c: MAT.wallSeam }); });
      }
      for (i = 0; i < 5; i++) {
        leftRow(i * 0.3, i * 0.3 + 0.3, Rl, i % 2 ? MAT.wallA : MAT.wallB);
        pp.push({ g: box(2 * Rl, 0.3, 0.12), m: M(0, i * 0.3 + 0.15, -Rl), c: i % 2 ? MAT.wallB : MAT.wallA });
        if (i) pp.push({ g: box(2 * Rl, 0.045, 0.02), m: M(0, i * 0.3, -Rl + 0.065), c: MAT.wallSeam });
      }
      var gr = (PK - H) / 5;
      for (i = 0; i < 5; i++) { var y0 = H + i * gr; leftRow(y0, y0 + gr, Rl * (1 - (i + 0.5) / 5), i % 2 ? MAT.wallB : MAT.wallA); }
      seg(pp, [-Rl + 0.03, H - 0.02, -Rl - 0.05], [-Rl + 0.03, PK + 0.08, 0], 0.09, W[1]); seg(pp, [-Rl + 0.03, PK + 0.08, 0], [-Rl + 0.03, H - 0.02, Rl + 0.05], 0.09, W[1]); n++;   /* 박공 테두리 (경사 널) */
      pp.push({ g: box(0.2, H + 0.05, 0.2), m: M(-Rl, H / 2, -Rl), c: W[1] });
      pp.push({ g: box(2 * Rl + 0.1, 0.1, 0.16), m: M(0, H + 0.02, -Rl), c: W[1] });   /* 무릎벽 위 도리 */
      [-1.2, 1.2].forEach(function (z) { pp.push({ g: box(0.14, gy(z) - 0.1, 0.14), m: M(-Rl + 0.09, (gy(z) - 0.1) / 2, z), c: MAT.stud }); }); n++;
      /* 동그란 창: 네모 구멍의 네 귀를 벽 색 판으로 메우고, 둥근 나무 테 + 십자 살 + 턱 */
      var sh = new T.Shape(), hs = WR + 0.03; sh.moveTo(-hs, -hs); sh.lineTo(hs, -hs); sh.lineTo(hs, hs); sh.lineTo(-hs, hs); sh.lineTo(-hs, -hs);
      var hp = new T.Path(); hp.absarc(0, 0, WR, 0, Math.PI * 2, true); sh.holes.push(hp);
      pp.push({ g: new T.ShapeGeometry(sh, 20), m: M(-Rl + 0.062, wyc, 0, 0, Math.PI / 2, 0), c: MAT.wallA });
      pp.push({ g: new T.TorusGeometry(WR, 0.07, 6, 28), m: M(-Rl + 0.1, wyc, 0, 0, Math.PI / 2, 0), c: W[1] });
      pp.push({ g: box(0.09, WR * 2, 0.09), m: M(-Rl + 0.1, wyc, 0), c: W[1] }); pp.push({ g: box(0.09, 0.09, WR * 2), m: M(-Rl + 0.1, wyc, 0), c: W[1] });
      pp.push({ g: box(0.34, 0.07, 1.1), m: M(-Rl + 0.2, wyc - WR - 0.08, 0), c: W[2] }); n += 2;
      pp.push({ g: new T.CylinderGeometry(0.09, 0.07, 0.12, 7), m: M(-Rl + 0.22, wyc - WR + 0.02, 0.3), c: PAL.rose[2] }); pp.push({ g: new T.SphereGeometry(0.11, 6, 5), m: M(-Rl + 0.22, wyc - WR + 0.16, 0.3), c: PAL.moss[2] }); n++;   /* 창턱 화분 */
      /* 눕힌 통나무 (x 방향 도리): 용마루 · 뒤쪽은 방 끝까지, 앞쪽은 벽에서 짧게 나온 마구리만 (뒷벽 쪽을 가리지 않게) */
      var hi = [];
      function logX(z, x1) { hi.push({ g: new T.CylinderGeometry(0.12, 0.12, x1 + Rl + 0.3, 8), m: M((x1 - Rl - 0.3) / 2, gy(z) + 0.1, z, 0, 0, Math.PI / 2), c: W[2] }); hi.push({ g: new T.CylinderGeometry(0.09, 0.09, 0.02, 8), m: M(x1 + 0.005, gy(z) + 0.1, z, 0, 0, Math.PI / 2), c: W[4] }); n++; }
      logX(-1.5, Rl + 0.25); logX(0, -Rl + 0.75); logX(1.5, -Rl + 0.6);
      /* 계단 구멍 (뒷벽 오른쪽): 어두운 구멍 + 내려가는 디딤판 둘 + 난간 (들어오는 −x 쪽은 트임) */
      var hx = (HATCH.x0 + HATCH.x1) / 2, hz = (HATCH.z0 + HATCH.z1) / 2, hw = HATCH.x1 - HATCH.x0, hd = HATCH.z1 - HATCH.z0;
      pp.push({ g: box(hw, 0.012, hd), m: M(hx, 0.008, hz), c: PAL.ink });
      pp.push({ g: box(0.16, 0.03, hd - 0.12), m: M(HATCH.x0 + 0.12, 0.018, hz), c: W[4] }); pp.push({ g: box(0.16, 0.03, hd - 0.12), m: M(HATCH.x0 + 0.34, 0.016, hz), c: W[2] });
      [[HATCH.x0, HATCH.z0], [HATCH.x1, HATCH.z0], [HATCH.x1, HATCH.z1], [HATCH.x0, HATCH.z1]].forEach(function (q) { pp.push({ g: box(0.07, 0.8, 0.07), m: M(q[0], 0.4, q[1]), c: W[1] }); });
      pp.push({ g: box(hw, 0.06, 0.06), m: M(hx, 0.78, HATCH.z0), c: W[2] }); pp.push({ g: box(hw, 0.06, 0.06), m: M(hx, 0.78, HATCH.z1), c: W[2] }); pp.push({ g: box(0.06, 0.06, hd), m: M(HATCH.x1, 0.78, hz), c: W[2] }); n += 2;
      /* 옷방 (뒷벽): 재봉 책상 + 재봉틀 + 걸상 */
      var zb = -Rl + 0.06, sx = -0.2, sz = zb + 0.3;   /* 11-11: 뒷벽 왼쪽은 미용실 거울 자리 → 재봉 책상 · 옷감 선반을 오른쪽으로 */
      pp.push({ g: box(0.8, 0.05, 0.52), m: M(sx, 0.7, sz), c: W[3] }); [[-0.34, -0.2], [0.34, -0.2], [-0.34, 0.2], [0.34, 0.2]].forEach(function (q) { pp.push({ g: box(0.06, 0.68, 0.06), m: M(sx + q[0], 0.34, sz + q[1]), c: W[1] }); });
      pp.push({ g: box(0.3, 0.2, 0.02), m: M(sx - 0.18, 0.56, sz + 0.25), c: W[4] });   /* 서랍 */
      pp.push({ g: box(0.46, 0.06, 0.2), m: M(sx + 0.05, 0.755, sz), c: PAL.ink }); pp.push({ g: box(0.1, 0.24, 0.16), m: M(sx + 0.23, 0.9, sz), c: PAL.ink });
      pp.push({ g: box(0.4, 0.09, 0.14), m: M(sx + 0.08, 1.02, sz), c: PAL.ink }); pp.push({ g: box(0.09, 0.14, 0.12), m: M(sx - 0.1, 0.92, sz), c: PAL.ink });
      pp.push({ g: box(0.012, 0.08, 0.012), m: M(sx - 0.1, 0.82, sz), c: PAL.paper[0] }); pp.push({ g: new T.CylinderGeometry(0.07, 0.07, 0.03, 9), m: M(sx + 0.3, 0.95, sz, 0, 0, Math.PI / 2), c: PAL.amber[3] });
      pp.push({ g: box(0.3, 0.012, 0.012), m: M(sx + 0.08, 1.0, sz + 0.076), c: PAL.amber[3] });   /* 금 줄 장식 */
      pp.push({ g: new T.CylinderGeometry(0.03, 0.03, 0.08, 6), m: M(sx - 0.02, 1.1, sz), c: PAL.rose[2] });   /* 실패 */
      pp.push({ g: box(0.34, 0.012, 0.3), m: M(sx - 0.2, 0.732, sz + 0.06, 0, 0.2, 0), c: PAL.sky[2] }); n += 2;   /* 박던 천 */
      pp.push({ g: new T.CylinderGeometry(0.16, 0.16, 0.06, 9), m: M(sx, 0.42, sz + 0.55), c: PAL.rose[2] }); [[-0.1, -0.1], [0.1, -0.1], [-0.1, 0.1], [0.1, 0.1]].forEach(function (q) { pp.push({ g: box(0.04, 0.4, 0.04), m: M(sx + q[0], 0.2, sz + 0.55 + q[1]), c: W[1] }); }); n++;
      /* 옷감 선반: 칸막이 장 + 말아 둔 옷감 (끝이 보이게 z 방향으로 눕힘) */
      var fx0 = 0.32, fw = 0.92, fcx = fx0 + fw / 2, FC = [PAL.rose[2], PAL.sky[2], PAL.moss[2], PAL.amber[3], PAL.paper[1], PAL.navy[3], PAL.rose[1], PAL.glass[2]];
      pp.push({ g: box(fw, 1.2, 0.04), m: M(fcx, 0.6, zb + 0.02), c: W[1] }); [0, 0.4, 0.8, 1.2].forEach(function (y) { pp.push({ g: box(fw + 0.06, 0.04, 0.4), m: M(fcx, y + 0.02, zb + 0.2), c: W[2] }); });
      [fx0, fx0 + fw].forEach(function (x) { pp.push({ g: box(0.04, 1.2, 0.4), m: M(x, 0.6, zb + 0.2), c: W[1] }); });
      for (i = 0; i < 9; i++) { var row = i / 3 | 0, col = i % 3; if (i === 4) continue; pp.push({ g: new T.CylinderGeometry(0.11, 0.11, 0.36, 8), m: M(fx0 + 0.17 + col * 0.29, 0.16 + row * 0.4, zb + 0.22, Math.PI / 2, 0, 0), c: FC[i % FC.length] }); pp.push({ g: new T.CylinderGeometry(0.03, 0.03, 0.37, 6), m: M(fx0 + 0.17 + col * 0.29, 0.16 + row * 0.4, zb + 0.225, Math.PI / 2, 0, 0), c: PAL.paper[0] }); }
      pp.push({ g: box(0.24, 0.1, 0.3), m: M(fcx, 0.49, zb + 0.22), c: PAL.paper[1] }); pp.push({ g: box(0.24, 0.08, 0.3), m: M(fcx, 0.58, zb + 0.22), c: PAL.sky[2] }); n += 3;   /* 개어 둔 천 */
      /* 염료: 낮은 받침대 위 병 다섯 + 바닥의 물들이는 대야 */
      var dx = -2.15, dzb = 3.0;   /* 물들이는 대야는 왼벽 앞쪽으로 */
      [PAL.rose[2], PAL.amber[3], PAL.moss[2], PAL.sky[2], PAL.navy[3]].forEach(function (c, k) { pp.push({ g: new T.CylinderGeometry(0.055, 0.055, 0.15, 7), m: M(fx0 + 0.1 + k * 0.18, 1.315, zb + 0.2), c: c }); pp.push({ g: new T.CylinderGeometry(0.035, 0.035, 0.04, 6), m: M(fx0 + 0.1 + k * 0.18, 1.41, zb + 0.2), c: W[1] }); }); n++;
      pp.push({ g: new T.CylinderGeometry(0.3, 0.26, 0.26, 10), m: M(dx + 0.5, 0.13, zb + dzb), c: W[2] }); pp.push({ g: new T.CylinderGeometry(0.26, 0.26, 0.02, 10), m: M(dx + 0.5, 0.255, zb + dzb), c: PAL.sky[2] });
      pp.push({ g: box(0.03, 0.5, 0.03), m: M(dx + 0.62, 0.42, zb + dzb - 0.03, 0, 0, -0.35), c: W[4] }); n++;   /* 젓는 막대 */
      /* 빨랫줄 (뒷벽 위): 물들인 천 넷 */
      seg(pp, [-0.7, 1.42, zb + 0.14], [1.25, 1.42, zb + 0.14], 0.012, PAL.paper[0]);
      [[-0.5, PAL.rose[2], 0.3], [-0.15, PAL.amber[3], 0.24], [0.2, PAL.moss[2], 0.28]].forEach(function (q) { pp.push({ g: box(0.26, q[2], 0.02), m: M(q[0], 1.42 - q[2] / 2, zb + 0.14), c: q[1] }); pp.push({ g: box(0.03, 0.05, 0.035), m: M(q[0], 1.43, zb + 0.14), c: W[4] }); }); n++;
      /* 마네킹 (옷방 왼쪽 앞) */
      var mx = -1.8, mz = 0.2;
      pp.push({ g: new T.CylinderGeometry(0.16, 0.2, 0.04, 8), m: M(mx, 0.02, mz), c: W[1] }); pp.push({ g: new T.CylinderGeometry(0.025, 0.025, 0.62, 6), m: M(mx, 0.33, mz), c: W[1] });
      pp.push({ g: new T.CylinderGeometry(0.15, 0.2, 0.4, 9), m: M(mx, 0.84, mz), c: PAL.amber[3] }); pp.push({ g: new T.SphereGeometry(0.155, 9, 6), m: M(mx, 1.04, mz, 0, 0, 0, 1, 0.7, 0.85), c: PAL.amber[3] });
      pp.push({ g: new T.CylinderGeometry(0.2, 0.26, 0.2, 9), m: M(mx, 0.56, mz), c: PAL.amber[2] }); pp.push({ g: new T.CylinderGeometry(0.04, 0.05, 0.08, 6), m: M(mx, 1.16, mz), c: PAL.paper[1] }); n++;
      /* 미용실: 진짜 거울 코너(salG)가 뒷벽 왼쪽에 걸린다 (아래 LSALW) — 그 앞 둥근 의자 하나 */
      pp.push({ g: new T.CylinderGeometry(0.18, 0.18, 0.07, 10), m: M(-0.7, 0.36, -0.5), c: PAL.rose[2] }); pp.push({ g: new T.CylinderGeometry(0.035, 0.035, 0.33, 6), m: M(-0.7, 0.17, -0.5), c: PAL.slate[1] }); pp.push({ g: new T.CylinderGeometry(0.14, 0.16, 0.03, 8), m: M(-0.7, 0.015, -0.5), c: PAL.slate[1] }); n++;
      /* 깔개 + 방석 + 궤짝 */
      pp.push({ g: box(1.5, 0.008, 1.1), m: M(0.1, 0.004, 0.55), c: MAT.rugEdge }); pp.push({ g: box(1.36, 0.01, 0.96), m: M(0.1, 0.005, 0.55), c: MAT.rugA }); pp.push({ g: box(1.0, 0.012, 0.6), m: M(0.1, 0.006, 0.55), c: MAT.rugB });
      pp.push({ g: new T.CylinderGeometry(0.22, 0.24, 0.1, 9), m: M(0.55, 0.05, 0.95), c: PAL.amber[3] }); pp.push({ g: new T.CylinderGeometry(0.2, 0.22, 0.1, 9), m: M(-0.4, 0.05, 0.3), c: PAL.moss[2] });
      pp.push({ g: box(0.7, 0.4, 0.44), m: M(1.55, 0.2, 1.4), c: W[3] }); pp.push({ g: box(0.74, 0.08, 0.48), m: M(1.55, 0.43, 1.4), c: W[2] }); pp.push({ g: box(0.08, 0.1, 0.02), m: M(1.55, 0.36, 1.63), c: PAL.amber[3] }); n += 4;
      /* 벽 등 받침 2 */
      var SC = [[0.75, 1.3, -Rl + 0.2], [-Rl + 0.2, 1.3, -1.55]];
      pp.push({ g: box(0.06, 0.06, 0.14), m: M(SC[0][0], 1.38, -Rl + 0.12), c: W[1] }); pp.push({ g: box(0.14, 0.06, 0.06), m: M(-Rl + 0.12, 1.38, SC[1][2]), c: W[1] });
      var room = new T.Mesh(keep(mergeParts(pp)), lambert); room.castShadow = true; room.receiveShadow = true; g.add(room);
      var roomHi = new T.Mesh(keep(mergeParts(hi)), lambert); roomHi.castShadow = false; roomHi.receiveShadow = true; g.add(roomHi);
      var gl = new T.Mesh(keep(new T.CircleGeometry(WR, 24)), glass.material); gl.position.set(-Rl + 0.01, wyc, 0); gl.rotation.y = Math.PI / 2; g.add(gl);
      var glEm = new T.Mesh(gl.geometry, winEm.material); glEm.layers.set(1); glEm.castShadow = false; gl.add(glEm);
      var bp = []; SC.forEach(function (q) { bp.push({ g: new T.CylinderGeometry(0.07, 0.11, 0.13, 8), m: M(q[0], q[1] + 0.06, q[2]), c: PAL.amber[4] }); bp.push({ g: new T.SphereGeometry(0.05, 6, 5), m: M(q[0], q[1] - 0.02, q[2]), c: PAL.amber[5] }); });
      var bulbGeo = keep(mergeParts(bp)), bulbs = new T.Mesh(bulbGeo, basicV); g.add(bulbs);
      var bulbEm = emTwin(bulbs, bulbGeo);
      var lA = new T.PointLight(C('#ffb066').getHex(), 0, 4.6, 2); lA.position.set(SC[0][0], 1.22, -Rl + 0.5); g.add(lA);
      var lB = new T.PointLight(C('#ffb066').getHex(), 0, 4.2, 2); lB.position.set(-Rl + 0.5, 1.22, SC[1][2]); g.add(lB);
      var shp = new T.Mesh(keep(mergeParts([{ g: box(2 * Rl + 1.2, 0.05, 2 * Rl + 1.2), m: M(0, PK + 0.3, 0), c: '#000000' }, { g: box(2 * Rl + 1.2, PK + 1.2, 0.05), m: M(0, PK / 2, Rl + 0.55), c: '#000000' },
        { g: box(0.05, PK + 1.2, 2 * Rl + 1.2), m: M(Rl + 0.55, PK / 2, 0), c: '#000000' }, { g: box(2 * Rl + 1.2, PK - H + 0.4, 0.05), m: M(0, (PK + H) / 2 + 0.2, -Rl - 0.1), c: '#000000' }])), shade.material);
      shp.castShadow = true; shp.receiveShadow = false; shp.frustumCulled = false; shp.renderOrder = -10; g.add(shp);
      LROOM = { g: g, room: room, glass: gl, bulbEm: bulbEm, lA: lA, lB: lB, shade: shp, props: n,
        sewBox: new T.Box3(new T.Vector3(sx - 0.4, 0, zb), new T.Vector3(sx + 0.4, 1.1, sz + 0.3)), hatchBox: new T.Box3(new T.Vector3(HATCH.x0, 0, HATCH.z0), new T.Vector3(HATCH.x1, 0.8, HATCH.z1)),
        boxes: [[sx, sz, 0.4, 0.28], [sx, sz + 0.55, 0.16, 0.16], [fcx, zb + 0.2, fw / 2 + 0.03, 0.22], [dx + 0.5, zb + dzb, 0.28, 0.28], [mx, mz, 0.2, 0.2], [-0.7, -0.5, 0.16, 0.16], [1.55, 1.4, 0.37, 0.24], [hx + 0.1, hz, hw / 2 - 0.1, hd / 2]] };
      LSAL.dx = snapPos(-1.5) - SALC.x; LSAL.dz = snapPos(R - LOFT_R);   /* 다락 뒷벽(z = −R) 의 코너를 위층 뒷벽(z = −LOFT_R) 의 x = −1.5 로 */
      LSALW = new T.Group(); LSALW.name = 'loftSalon'; LSALW.position.set(LSAL.dx, 0, LSAL.dz); g.add(LSALW); LSALW.add(salG);
      loftApplyLight();
      return LROOM;
    }
    function loftApplyLight() {
      var P = LROOM; if (!P) return;
      var em = light.em == null ? 1 : light.em, nk = clamp((em - 0.25) / 0.75, 0, 1);
      P.lA.intensity = 0.5 + 0.8 * nk; P.lB.intensity = 0.4 + 0.65 * nk;
      P.bulbEm.material.color.copy(C(EM.lamp)).multiplyScalar(0.6 + 0.4 * nk);
    }
    function playApplyLight() {   /* 벽 등 2: 낮에도 켜짐(약하게), 노을·밤에 세게 — 시각대 em (낮 0.25 → 밤 1) 따라. 화면·전구 발광도 */
      var P = PROOM; if (!P) return;
      var em = light.em == null ? 1 : light.em, nk = clamp((em - 0.25) / 0.75, 0, 1);
      P.lA.intensity = 0.5 + 0.8 * nk; P.lB.intensity = 0.4 + 0.65 * nk;
      P.bulbEm.material.color.copy(C(EM.lamp)).multiplyScalar(0.6 + 0.4 * nk);
      P.screenEm.material.color.copy(C(PAL.sky[1])).multiplyScalar(0.3 + 0.4 * nk);
    }
    function screenFrame(f) { recolor(PROOM.screenGeo, 7, f ? SCR.hide : SCR.run); recolor(PROOM.screenGeo, 8, f ? SCR.run : SCR.hide); PROOM.scr.f = f; }
    function stepPlayRoom(dt) {   /* 오락기 화면 2프레임 (0.5 s) — 모션 감소면 0 프레임에 멈춤 */
      var s = PROOM.scr;
      if (st.reduced) { if (s.f) screenFrame(0); return; }
      s.t += dt; if (s.t >= 0.5) { s.t = 0; screenFrame(s.f ? 0 : 1); }
    }

    /* ── 출발·귀가 의식: dt 로 진행하는 작업 큐 (debugStep 으로 결정적). 한 작업 = { dur, start, update(k), end }; 남은 dt 는 다음 작업으로 넘긴다 (모션 감소면 걷기·폴짝 0 s 라 한 프레임에 끝난다) ── */
    var CER = { q: [], cur: null, done: null, active: false, walk: false, name: '' };
    var EXT_P = { doorIn: [EXT.HX1 - 0.12, EXT.PL, EXT.HZC], landing: [EXT.HX1 + 0.24, EXT.PL, EXT.HZC], steps: [0, 1, 2].map(function (i) { return [EXT.HX1 + 0.5 + 0.24 * i, EXT.PL - 0.12 * (i + 1), EXT.HZC]; }),
      edge: [EXT_PATH[EXT_PATH.length - 1][0], 0, EXT_PATH[EXT_PATH.length - 1][1]] };
    /* 나가는 곳 (INTERIOR_MODE 0단계): 높이는 늘 0. 그린 길을 그대로 따라 길 끝(edge = 길 마지막 점 x 3.12 — 받침 끝 3.42 안, 길 그림은 0.1 m 더 가서 섬 끝에 닿는다)
       0.5 m 앞(stop, 길 마지막 마디 위)까지 걷고 → 돌아보며 손 흔들기 → 남은 0.5 m 를 1 m/s 로 걸으며 체크 8단계로 사라진다 (100 % → 0 %, 0.5 s).
       예전 edge (3.18, 0.42) 는 길 끝에서 옆으로 꺾인 점이라 stop 이 길 밖에 놓이고 돌아올 때 길 마지막 점을 건너뛰었다 → 이제 출발·귀가·기웃 출입이 한 직선 위.
       올 때·기웃 입장은 거꾸로 (길 끝에서 흐릿하게 나타나 걸어 들어온다).
       다락 문도 같다: 문 앵커에서 문간(DOOR_IN) 0.35 m 를 0.7 m/s 로 걸어 들어가며 사라지고, 돌아올 때는 문간에서 나타나 걸어 나온다 */
    var EXIT_DIR = (function () { var a = EXT_PATH[EXT_PATH.length - 2], b = EXT_PATH[EXT_PATH.length - 1], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); return [dx / l, dz / l]; })();
    var FADE_LEN = 0.5, FADE_SPEED = 1.0, DOOR_IN = [ANCHORS.door[0], 0, ANCHORS.door[2] - 0.35], DOOR_SPEED = 0.7;
    EXT_P.stop = [EXT_P.edge[0] - EXIT_DIR[0] * FADE_LEN, 0, EXT_P.edge[2] - EXIT_DIR[1] * FADE_LEN];
    function V(a) { return new T.Vector3(a[0], a[1], a[2]); }
    function cerWalk(to, speed, hop, fade) { /* 걷기(hop 0, 다리 번갈아 + 통통) 또는 폴짝(hop = 호 높이) — 마디 하나. fade = [시작 밀도, 끝 밀도]: 간 거리에 맞춰 체크 8단계로 사라짐·나타남 */
      var from = new T.Vector3(), tv = V(to), it = { dur: 0 };
      it.start = function () { from.copy(oct.pos); var d = tv.clone().sub(from); it.dur = st.reduced ? 0 : Math.max(0.05, (hop ? 0.22 : Math.hypot(d.x, d.z) / speed)) * st.speed; if (Math.hypot(d.x, d.z) > 1e-3) oct.wantYaw = Math.atan2(d.x, d.z); CER.walk = !hop; it.hold = hop || !it.dur ? 0 : anticHold(); it.dur += it.hold; if (fade) setOctFade(fade[0]); };   /* 서 있다 걷기 시작하면 예비 동작만큼 제자리 */
      it.update = function (k) { var w = it.dur > it.hold ? Math.max(0, (k * it.dur - it.hold) / (it.dur - it.hold)) : 1; oct.pos.lerpVectors(from, tv, w); oct.hop = hop ? Math.sin(k * Math.PI) * hop / OCT_R : 0; if (fade) setOctFade(fade[0] + (fade[1] - fade[0]) * w); };
      it.end = function () { oct.pos.copy(tv); oct.hop = 0; CER.walk = false; if (fade) setOctFade(fade[1]); };
      return it;
    }
    function cerWave() { /* 가장자리 0.5 m 앞에서 카메라 쪽으로 돌아보며 다리 하나 흔들기 (5칸 @ 12 fps ≈ 0.42 s, 0단계 '0.4초'). 모션 감소면 0 s (바로 사라진다) */
      var it = { dur: 0 };
      it.start = function () { CER.walk = false; oct.wantYaw = camYaw(); it.dur = st.reduced ? 0 : WAVE_N / 12 * st.speed; if (it.dur) { WAVE.on = true; WAVE.t = 0; } };
      it.end = function () { WAVE.on = false; };
      return it;
    }
    function cerDo(fn, dur) { return { dur: st.reduced ? 0 : (dur || 0), start: fn }; }
    function cerTrans(p, onSwap, dur) { var it = { dur: 0 }; it.start = function () { it.dur = st.reduced ? 0 : (dur || TRANS_DUR); setPlace(p, { onSwap: onSwap, dur: dur }); }; it.end = function () { if (PLACE.trans && !PLACE.trans.door) finishTrans(); }; return it; }   /* dur = 짧은 전환 (기본 TRANS_DUR) */
    function cerRun(name, items, onDone) {
      if (SAL.active) salFinishNow();   /* 미용실 연출 중에 의식이 오면 (주 버튼 등) 남은 연출을 끝 상태로 감고 시작 */
      if (CER.active) { CER.walk = false; oct.hop = 0; WAVE.on = false; }   /* 앞 의식은 조용히 취소 (onDone 안 부름) */
      if (oct.walking) { oct.walking.cancel(); oct.walking = null; }   /* 돌아다니던 걸음(moveTo)이 의식 위치를 덮어쓰지 않게 */
      if (octUp()) octUnmountLoft();   /* 의식(출발 · 귀가)은 다락에서 */
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
    function pathItems(reverse, speed) { /* 계단 발치 ↔ stop (길 끝 0.5 m 앞, 길 마지막 마디 위). 길 마지막 점(= edge)까지는 사라짐·나타남 걸음이 간다 */
      var pts = EXT_PATH.slice(0, -1).map(function (p) { return [p[0], 0, p[1]]; }); pts.push(EXT_P.stop); if (reverse) pts.reverse();
      return pts.map(function (p) { return cerWalk(p, speed); });
    }
    function departCeremony(onDone) {
      var fresh = false;
      var items = [cerDo(function () { fresh = storyVis() !== 'attic' || !!storyTrans() || !octG.visible || st.octState === 'away'; pkReset(); })];   /* 바깥 기웃 상태가 남아 있으면 지운다 (기웃을 안 쓰면 무동작) */
      if (storyVis() !== 'attic' || storyTrans()) items.push(cerDo(function () { setPlace('attic', { instant: true }); }));
      items.push(cerDo(function () {   /* 출발은 늘 다락에서 온전히 보이는 문어로: 앞 의식의 반쯤 흐린 밀도를 넘겨받지 않고, 나가 있던(안 보이던·바깥) 문어는 바깥 좌표에서 걸어오지 않게 문 앞에서 (데모·다시 들어오기 길) */
        if (fresh) jumpTo('door'); else if (FADE.d < 1) setOctFade(1);
        setOctState('walk'); oct.anchor = 'door';
      }));
      items.push(cerWalk(ANCHORS.door, 1.2));                                                      /* 다락 문으로 */
      items.push(cerWalk(DOOR_IN, DOOR_SPEED, 0, [1, 0]));                                          /* 문간으로 걸어 들어가며 체크로 사라짐 (전환 동안 문어는 안 보인다) */
      items.push(cerTrans('exterior', function () { octG.visible = false; octDecal.visible = false; oct.pos.copy(V(EXT_P.doorIn)); oct.wantYaw = oct.faceYaw = Math.PI / 2; }));
      items.push(cerDo(function () { DOOR_EXT.want = DOOR_EXT.OPEN; }, 0.2));                       /* 현관문 열림 */
      items.push(cerDo(function () { setOctFade(1); octG.visible = true; octDecal.visible = true; }));
      items.push(cerWalk(EXT_P.landing, 1.4));
      EXT_P.steps.forEach(function (s, i) { var h = cerWalk(s, 0, 0.16); if (i === 0) { var st0 = h.start; h.start = function () { st0(); DOOR_EXT.want = 0; }; } items.push(h); });   /* 계단 3 폴짝 (첫 폴짝에 문 닫힘) */
      items = items.concat(pathItems(false, 1.8));                                                 /* 길 따라 가장자리 0.5 m 앞까지 */
      items.push(cerWave());                                                                       /* 한 번 돌아보며 손 흔들기 */
      items.push(cerWalk(EXT_P.edge, FADE_SPEED, 0, [1, 0]));                                      /* 남은 0.5 m 를 걸으며 체크 8단계로 사라짐 (높이 0, 받침 안) */
      items.push(cerDo(function () { setOctState('away'); }));
      return cerRun('depart', items, onDone);
    }
    /* o.quick = 데려온 귀가 (큰 버튼, 주인 11-08): 길 · 계단 · 현관은 건너뛰고 — 바깥 문어는 숨기고 → 다락으로 0.3 s 전환 (같은 디더 · 미끄럼) → 문간에서 나타나
       2배 빠르기로 문 앞까지 걸어 나온다 (≈ 0.55 s). 이미 다락이면 전환 없이 문간에서. 모션 감소면 마디마다 0 s (한 프레임) */
    function returnCeremony(onDone, o) {
      var items = [];
      if (o && o.quick) {
        var atDoor = function () { jumpTo('door'); oct.pos.copy(V(DOOR_IN)); snapScreen(octG.position.copy(oct.pos)); setOctFade(0); };
        items.push(cerDo(function () { pkReset(); WAVE.on = false; DOOR_EXT.want = 0; CER.walk = false; if (storyVis() !== 'attic' || storyTrans()) setOctFade(0); setOctState('walk'); }));   /* 바깥(기웃 자리)에 보이던 문어는 지금 숨긴다 */
        var tr = { dur: 0 };
        tr.start = function () { if (storyVis() === 'attic' && !storyTrans()) { tr.dur = 0; atDoor(); } else { tr.dur = st.reduced ? 0 : TRANS_DUR / 2; setPlace('attic', { onSwap: atDoor, dur: TRANS_DUR / 2 }); } };
        tr.end = function () { if (PLACE.trans && !PLACE.trans.door) finishTrans(); };
        items.push(tr);
        items.push(cerWalk(ANCHORS.door, DOOR_SPEED * 2, 0, [0, 1]));
        items.push(cerDo(function () { oct.anchor = 'door'; if (st.octState === 'walk') setOctState('idle'); }));
        return cerRun('return', items, onDone);
      }
      items.push(cerDo(function () {
        if (storyVis() !== 'exterior' || storyTrans()) setPlace('exterior', { instant: true, onSwap: function () {} });
        pkReset(); WAVE.on = false; oct.pos.copy(V(EXT_P.edge)); snapScreen(octG.position.copy(oct.pos)); setOctFade(0); setOctState('walk');
      }));
      items.push(cerWalk(EXT_P.stop, FADE_SPEED, 0, [0, 1]));                                      /* 가장자리 안쪽에서 흐릿하게 나타나 걸어 들어옴 */
      items = items.concat(pathItems(true, 1.8).slice(1));
      EXT_P.steps.slice().reverse().forEach(function (s) { items.push(cerWalk(s, 0, 0.16)); });
      items.push(cerWalk(EXT_P.landing, 0, 0.16));
      items.push(cerDo(function () { DOOR_EXT.want = DOOR_EXT.OPEN; }, 0.2));
      items.push(cerWalk(EXT_P.doorIn, 1.4));
      items.push(cerDo(function () { octG.visible = false; octDecal.visible = false; DOOR_EXT.want = 0; }, 0.15));
      items.push(cerTrans('attic', function () { jumpTo('door'); oct.pos.copy(V(DOOR_IN)); snapScreen(octG.position.copy(oct.pos)); setOctFade(0); }));
      items.push(cerWalk(ANCHORS.door, DOOR_SPEED, 0, [0, 1]));                                    /* 문간에서 나타나 걸어 나온다 */
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
    var PK_ENTRY = [   /* 가장자리 출입구: at = 가장자리(받침 위, 나타나기 시작), in = 0.5 m 안쪽(다 나타난 곳) — 출발 의식의 edge → stop 과 같은 꼴 */
      { at: EXT_P.edge, in: EXT_P.stop }, { at: [EXT.L - 0.02, 0, -0.75], in: [EXT.L - 0.02 - FADE_LEN, 0, -0.75] },
      { at: [-1.75, 0, EXT.L - 0.02], in: [-1.75, 0, EXT.L - 0.02 - FADE_LEN] }, { at: [1.35, 0, EXT.L - 0.02], in: [1.35, 0, EXT.L - 0.02 - FADE_LEN] }];
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
        oct.blinkLeft = 0; oct.blinkT = Math.max(oct.blinkT, 1.3);   /* 자세를 잡는 1.2 s 동안은 안 깜빡인다 → 기웃의 표정(happy·curious·calm)이 드러나는 순간을 깜빡임이 가리지 않게 (시드 간격은 그대로 뒤로 민다) */
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
        if (storyVis() !== 'exterior' || storyTrans()) setPlace('exterior', { instant: true, onSwap: function () {} });
        var onStage = PK.on && octG.visible;
        PK.key = key; PK.emoji = o.emoji || ''; PK.first = !!o.first; PK.status = status; PK.hold = false;
        pkPose(); setExpression('idle');
        if (!onStage) {   /* 무대 밖 → 경로가 가장 짧은 가장자리 출입구에서 흐릿하게 나타나 0.5 m 걸어 들어온다 (높이 0) */
          var best = null; PK_ENTRY.forEach(function (e) { var L2 = pkRoute([e.in[0], e.in[2]], target).len; if (!best || L2 < best.len) best = { e: e, len: L2 }; });
          oct.pos.copy(V(best.e.at)); snapScreen(octG.position.copy(oct.pos)); setOctFade(0); PK.on = true; PK.onSpot = false; PK.spot = null;
          items.push(cerWalk(best.e.in, FADE_SPEED, 0, [0, 1])); from = [best.e.in[0], best.e.in[2]];
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
        if (storyVis() === 'exterior' && PK.on && octG.visible) {
          pkPose(); setExpression('idle');
          var from = pkHere();
          if (PK.spot && PK.spot.approach && PK.onSpot) { items.push(cerWalk([PK.spot.approach[0], 0, PK.spot.approach[1]], 0, 0.16)); from = PK.spot.approach.slice(); }
          PK.onSpot = false;
          items = items.concat(pkWalkItems(from, [EXT_P.stop[0], EXT_P.stop[2]], 1.8, false));   /* 출발 의식과 같은 출구: 0.5 m 앞까지 */
          items.push(cerWalk(EXT_P.edge, FADE_SPEED, 0, [1, 0]));                                 /* 걸으며 체크로 사라짐 (손 흔들기는 첫 출발 때만 — 기웃마다 하면 되풀이가 된다) */
        }
        items.push(cerDo(function () { pkOff(); oct.pos.copy(V(EXT_P.edge)); }));
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
    /* ── 바깥 텃밭 (11-10 주인: "바깥 맵에 텃밭 · 문어가 나가 있는 동안 가꾸기 · 염료는 기른다"): 마당 앞쪽에 밭 세 칸. 흙 · 나무 테는 늘 있고, 심은 것(씨앗 둔덕 · 새싹 · 꽃)은 setGarden 이 다시 만든다 (앱의 S.user.garden 그대로).
       바깥이 보일 때 칸을 톡 하면 앱이 심기 · 물 주기 · 거두기를 한다 (단추 plot0…2). 물을 안 줘도 시들지 않는다 ── */
    var PLOT = { xs: [0.55, 1.42, 2.29], z: 2.3, w: 0.7 }, plotG = new T.Group(), plotPlants = null, plotBoxes = [], plotState = [null, null, null];
    (function () {
      var pp = [];
      PLOT.xs.forEach(function (x) {
        pp.push({ g: box(PLOT.w, 0.07, PLOT.w), m: M(x, 0.035, PLOT.z), c: W[0] });
        [[0, -1], [0, 1]].forEach(function (d) { pp.push({ g: box(PLOT.w + 0.08, 0.1, 0.05), m: M(x, 0.05, PLOT.z + d[1] * (PLOT.w / 2 + 0.01)), c: W[3] }); });
        [-1, 1].forEach(function (d) { pp.push({ g: box(0.05, 0.1, PLOT.w + 0.08), m: M(x + d * (PLOT.w / 2 + 0.01), 0.05, PLOT.z), c: W[3] }); });
        plotBoxes.push(new T.Box3(new T.Vector3(x - PLOT.w / 2 - 0.05, 0, PLOT.z - PLOT.w / 2 - 0.05), new T.Vector3(x + PLOT.w / 2 + 0.05, 0.75, PLOT.z + PLOT.w / 2 + 0.05)));
      });
      var m = new T.Mesh(keep(mergeParts(pp)), lambert); m.castShadow = true; m.receiveShadow = true; plotG.add(m); extG.add(plotG);
    })();
    function setGarden(list) {   /* [{ color: '#hex', water: 0|1|2 } | null] × 3 */
      plotState = [0, 1, 2].map(function (i) { var g = list && list[i]; return g ? { color: String(g.color || '#e8a93a'), water: Math.max(0, Math.min(2, g.water | 0)) } : null; });
      if (plotPlants) { plotG.remove(plotPlants); plotPlants.geometry.dispose(); plotPlants = null; }
      var pp = [];
      plotState.forEach(function (g, i) {
        if (!g) return; var x = PLOT.xs[i], z = PLOT.z;
        if (g.water === 0) { pp.push({ g: new T.SphereGeometry(0.11, 6, 4), m: M(x, 0.08, z, 0, 0, 0, 1, 0.5, 1), c: W[1] }); pp.push({ g: box(0.05, 0.05, 0.05), m: M(x, 0.14, z), c: PAL.moss[3] || PAL.moss[2] }); return; }
        var hgt = g.water === 1 ? 0.22 : 0.46;
        pp.push({ g: box(0.05, hgt, 0.05), m: M(x, 0.07 + hgt / 2, z), c: PAL.moss[2] });
        [-1, 1].forEach(function (d) { pp.push({ g: box(0.16, 0.04, 0.09), m: M(x + d * 0.09, 0.07 + hgt * 0.55, z, 0, 0, d * 0.5), c: PAL.moss[2] }); });
        if (g.water >= 2) { pp.push({ g: new T.SphereGeometry(0.15, 7, 5), m: M(x, 0.07 + hgt + 0.1, z), c: g.color }); pp.push({ g: new T.SphereGeometry(0.06, 5, 4), m: M(x + 0.05, 0.07 + hgt + 0.14, z + 0.1), c: PAL.amber[4] }); }
      });
      if (pp.length) { plotPlants = new T.Mesh(mergeParts(pp), lambert); plotPlants.castShadow = true; plotPlants.receiveShadow = true; plotG.add(plotPlants); }
      dither.still = 0;
    }
    if (!LROOM) buildLoft();   /* 미용실 코너가 위층에 살아서, 위층은 처음부터 지어 둔다 (보이지 않는 그룹 — 그리는 비용 0) */
    extReady = true;

    /* ── 입력: 레이캐스트 · 드래그 · 줌 ── */
    var ray = new T.Raycaster(), ndc = new T.Vector2(), press = null, _pb = new T.Box3(), _pv = new T.Vector3();
    /* 탭 판정 (docs/research/furniture-tap-events.md 1·2): ① 문어의 *실제 몸 메시*·포스터·보이는 기념품·놀이방 문(8물결)을 거리순 레이캐스트 (몸 = 문어 'oct', 문 = 'spot')
       → ② 다 빗나가면 문어 히트 구(r 0.67 m) → ③ 창 유리 → ③' 놀이방 문 단추 칸(문 그림 둘레 44×44 이상) → ④ 화면 공간 보정: 포스터·기념품 투영 사각형 중 탭에서 NEAR_PX 안 최근접 하나 (2등이 NEAR_GAP 안이면 모호 → 없음).
       큰 히트 구가 문어 뒤 포스터·선반 기념품을 가리지 않는다. 바깥: 문어 히트 구만 (다락 유리·포스터는 숨은 그룹이라도 레이캐스트엔 걸리므로 뺀다) · 숨은 문어·바깥 기웃 중(away)엔 문어 탭 없음 */
    var NEAR_PX = 16, NEAR_GAP = 4;
    function octTappable() { return octG.visible && st.octState !== 'away' && (!isRoomP(PLACE.vis) || octUp()); }   /* 놀이방: 문어는 다락에 숨어 있다 (레이캐스트는 숨은 그룹도 맞히므로 막는다) */
    function bodyMeshes() { var out = []; bodyG.traverseVisible(function (o) { if (o.isMesh && o !== hit && o.material && o.material.visible !== false) out.push(o); }); return out; }
    function tapItems() { return posterMeshes.filter(function (m) { return m.visible; }).concat(souvMeshes.filter(function (m) { return m.visible; })); }
    function tapId(o) { var u = o.userData; return u.kind === 'poster' ? u.id : u.kind === 'souvenir' ? (u.sv && u.sv.id) : u.kind === 'spot' ? u.spot : u.kind; }
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
      var okOct = octTappable(), sp;
      if (PLACE.vis === 'play') { sp = spotAt(cx, cy, ['playAttic', 'machine']); return sp ? spotHit(sp) : null; }
      if (PLACE.vis === 'loft') {   /* 위층: 따라 올라온 문어 · 미용실 거울(문어가 거울 앞이면 문어가 먼저) · 계단 · 재봉틀 */
        var upOct = okOct && octUp(), salOnL = !!SPOTS.salon && !!spotInfo('salon'), smL = salOnL ? [salA, salB, salC].filter(function (m) { return m.visible; }) : [];
        var hsL = ray.intersectObjects((upOct ? bodyMeshes() : []).concat(smL), false);
        if (hsL.length) return smL.indexOf(hsL[0].object) >= 0 ? spotHit('salon') : hit;
        if (upOct && ray.intersectObject(hit, false).length) return hit;
        sp = spotAt(cx, cy, ['loftStair', 'sew', 'salon']); return sp ? spotHit(sp) : null;
      }
      if (PLACE.vis === 'exterior' && !PLACE.room) { sp = spotAt(cx, cy, ['plot0', 'plot1', 'plot2']); if (sp) return spotHit(sp); }   /* 바깥 텃밭 칸 */   /* 놀이방: 문어도 소품도 없다 — 문·오락기 단추 칸만 (진짜 <button> 은 hotspots) */
      if (PLACE.vis === 'exterior') return okOct && ray.intersectObject(hit, false).length ? hit : null;
      var doorOn = !!SPOTS.atticPlay && !!spotInfo('atticPlay'), dm = doorOn ? doorMeshes(ATTIC_DOOR) : [];
      var salOn = !!SPOTS.salon && !!spotInfo('salon'), sm = salOn ? [salA, salB, salC].filter(function (m) { return m.visible; }) : [];   /* 미용실 거울·선반·거울 속 문어 (단추가 있고 열려 있을 때만) */
      var hs = ray.intersectObjects((okOct ? tapItems().concat(bodyMeshes()) : tapItems()).concat(dm, sm), false);
      if (hs.length) { var o = hs[0].object, k = o.userData.kind; return dm.indexOf(o) >= 0 ? spotHit('atticPlay') : sm.indexOf(o) >= 0 ? spotHit('salon') : k === 'poster' || k === 'souvenir' ? o : hit; }   /* 가장 앞에 그려진 것 — 문이 문어 앞이면 문, 문어가 문(거울) 앞이면 문어 */
      if (okOct && ray.intersectObject(hit, false).length) return hit;
      if (ray.intersectObject(glass, false).length) return glass;
      if (doorOn && spotAt(cx, cy, ['atticPlay'])) return spotHit('atticPlay');
      if (SPOTS.atticStair && spotInfo('atticStair') && spotAt(cx, cy, ['atticStair'])) return spotHit('atticStair');   /* 위층 계단 */   /* 문 그림 둘레의 넓힌 칸 (44×44 이상) */
      var ni = nearItem(cx - r.left, cy - r.top, r);
      if (ni) return ni;   /* 등불 8칸 선반 기념품이 거울 위에 겹쳐도 기념품이 먼저 */
      return salOn && spotAt(cx, cy, ['salon']) ? spotHit('salon') : null;   /* 거울 그림 둘레의 넓힌 칸 (44×44 이상) — 맨 끝 */
    }
    /* 손가락 문법 (docs/INTERIOR_MODE.md §3.1·§3.4·§3.5·§5.3): 상태기계 하나 (GEST.mode)
       press = 첫 손가락 대기 (8 px 안에서 떼면 톡 · 문어 위 350 ms 또는 8 px = 쓰다듬기) → pan = 한 손가락 밀기 1:1 + 관성 + 고무줄
       (1× 터치에서 세로가 더 큰 쓸기는 손대지 않는다 → 브라우저가 페이지를 내린다, touch-action pan-y) · 두 번째 손가락 → multi:
       거리 1.1배 전에 15° 넘게 비틀면 twist(돌려 보기 9° 계단 ±27°), 아니면 pinch(손가락 거리를 연속으로 · 정수 N, 두 손가락 가운데가 그 자리에, 가운데가 움직이면 밀기 → 떼면 가까운 멈춤으로 0.15 s) — 한 번 정하면 손짓 끝까지.
       마우스: 왼쪽 끌기 = 밀기 · 오른쪽 끌기 / Shift+끌기 = 돌려 보기 · 휠 = 한 멈춤 (그 칸 뒤 0.15 s 동안 들어오는 휠은 무시 — §3.5).
       관성 중 누름(> 0.05 px/ms)은 멈추기만 (톡·쓰다듬기 아님, 그대로 끌면 밀기). 어떤 손짓이든 끝날 때 밀린 값이 경계 밖·소수면 제자리로 (고무줄 복귀 중 톡 포함) */
    function gPts() { var out = []; for (var k in GEST.pts) out.push(GEST.pts[k]); return out; }
    function unband(v, lo, hi) {   /* band 의 역: 고무줄에 걸린 채 다시 잡으면 그 자리에서 이어 끈다 (튐 없이) */
      var M = 20 / S.N, f;
      if (v > hi) { f = Math.min(0.999, (v - hi) / M); return hi - M * Math.log(1 - f) / 0.4; }
      if (v < lo) { f = Math.min(0.999, (lo - v) / M); return lo + M * Math.log(1 - f) / 0.4; }
      return v;
    }
    function startPan() {
      var b = panBox();
      GEST.pan = { sx: press.x, sy: press.y, rx: unband(PAN.x, b[0], b[1]), ry: unband(PAN.y, b[2], b[3]), x0: PAN.x, y0: PAN.y, s: [] };
      GEST.mode = 'pan'; PAN.mode = ''; PAN.vx = PAN.vy = 0;
    }
    function panMove(e) {
      var g = GEST.pan, b = panBox(), k = 1 / (S.p * S.N), t = e.timeStamp;
      PAN.x = band(g.rx - (e.clientX - g.sx) * k, b[0], b[1]); PAN.y = band(g.ry + (e.clientY - g.sy) * k, b[2], b[3]);   /* 손가락이 간 만큼 장면도 (아트px = p CSS px) */
      g.s.push([t, e.clientX, e.clientY]); while (g.s.length > 2 && t - g.s[0][0] > 160) g.s.shift();
      dither.still = 0;
    }
    function panRelease(e) {
      var g = GEST.pan, s = g.s, now = e.timeStamp, last = s[s.length - 1], vx = 0, vy = 0;
      if (e.type !== 'pointerup') { var b = panBox(); panTo(clamp(g.x0, b[0], b[1]), clamp(g.y0, b[2], b[3]), 0.25, 'spring'); return; }   /* 브라우저가 가져감 (1× 세로 = 페이지 스크롤) → 장면은 제자리로 */
      if (last && now - last[0] < 80) {   /* 떼기 전 80 ms 넘게 멈췄으면 0 */
        var i = 0; while (i < s.length - 1 && now - s[i][0] > 100) i++;   /* 마지막 100 ms 안의 가장 오래된 표본 */
        if (i === s.length - 1 && i > 0) i--;
        var f = s[i], dt = last[0] - f[0];
        if (dt > 4) { vx = (last[1] - f[1]) / dt; vy = (last[2] - f[2]) / dt; }
      }
      var sp = Math.hypot(vx, vy);
      if (st.reduced || sp < 0.25) vx = vy = 0; else if (sp > 2) { vx *= 2 / sp; vy *= 2 / sp; }   /* 0.25 px/ms 미만은 그 자리에 · 최고 2 px/ms */
      if (vx || vy) { var k = 1000 / (S.p * S.N); PAN.mode = 'coast'; PAN.vx = -vx * k; PAN.vy = vy * k; }
      else panSettle();
    }
    function startMulti() {
      var p = gPts(), a = p[0], b = p[1];
      ZT = null;   /* 앞 핀치의 멈춤 이징 중이면 지금 배율에서 이어 간다 */
      GEST.multi = { d0: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)), a0: Math.atan2(b.y - a.y, b.x - a.x), f0: st.zoomF, yaw0: yawDrag, tw: 0, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      GEST.mode = 'multi'; if (PAN.mode !== 'home') { PAN.mode = ''; PAN.vx = PAN.vy = 0; } dither.still = 0;
    }
    function multiMove() {
      var p = gPts(), a = p[0], b = p[1], m = GEST.multi; if (!a || !b) return;
      var d = Math.hypot(b.x - a.x, b.y - a.y), da = Math.atan2(b.y - a.y, b.x - a.x) - m.a0, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      if (GEST.mode === 'multi') {
        if (Math.abs(da) > 15 * DEG) { GEST.mode = 'twist'; m.tw = da > 0 ? 15 * DEG : -15 * DEG; }   /* 15° 를 먼저 넘기면 비틀기 */
        else if (d / m.d0 >= 1.1 || d / m.d0 <= 1 / 1.1) { GEST.mode = 'pinch'; m.d0 = d; }          /* 거리 1.1배를 먼저 넘기면 핀치 — 그 거리에서 1:1 로 시작 (첫 프레임에 10 % 튀지 않게, 비틀기의 15° 빼기와 같다) */
      }
      if (GEST.mode === 'pinch') {
        if (panOn() && !panLocked()) { var k = 1 / (S.p * S.N); PAN.x -= (mx - m.mx) * k; PAN.y += (my - m.my) * k; }   /* 두 손가락 가운데가 움직이면 밀기 */
        if (!zoomN(m.f0 * d / m.d0, mx, my) && panOn()) clampPan();   /* 거리 비율을 연속으로 (정수 N) — 멈춤 맞추기는 손을 뗄 때 (zoomSettle) */
        dither.still = 0;
      } else if (GEST.mode === 'twist') {
        var y = clamp(m.yaw0 + (da - m.tw), -25 * DEG, 25 * DEG);
        if (y !== yawDrag) { yawDrag = y; dither.still = 0; if (panOn()) { placeCamera(); clampPan(); } }
      }
      m.mx = mx; m.my = my;
    }
    listen(canvas, 'pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 2) return;
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
      GEST.pts[e.pointerId] = { x: e.clientX, y: e.clientY }; GEST.n = gPts().length;
      if (GEST.n >= 2) {   /* 두 번째 손가락: 누르던 것은 톡·쓰다듬기가 아니게 · 밀던 것은 관성 없이 놓고 핀치/비틀기 대기 */
        if (press) { clearTimeout(press.t); clearTimeout(press.ft); press.multi = true; if (GEST.hold) furnDrop(); }
        if (GEST.n === 2 && GEST.mode !== 'yaw') startMulti();
        e.preventDefault(); return;
      }
      zoomFinish();
      var caught = PAN.mode === 'coast' && (pxms(PAN.vx) > 0.05 || pxms(PAN.vy) > 0.05);
      if (PAN.mode === 'coast' || PAN.mode === 'spring') { PAN.mode = ''; PAN.vx = PAN.vy = 0; }   /* 관성·고무줄 중에 누르면 그 자리에 멈춘다 (다시 잡아 끌 수 있게) — 떼면 pointerEnd 가 경계 안으로 */
      var yaw = e.pointerType === 'mouse' && (e.button === 2 || e.shiftKey), o = yaw ? null : pick(e.clientX, e.clientY);
      press = { id: e.pointerId, x: e.clientX, y: e.clientY, obj: o, moved: false, pet: false, t: null, caught: caught, yaw: yaw, touch: e.pointerType === 'touch', lx: e.clientX };
      GEST.mode = yaw ? 'yaw' : 'press';
      if (!yaw && !caught) press.ft = setTimeout(furnHoldStart, 480);   /* 가구 꾹 누르기 → 들고 옮기기 */
      if (o && o.userData.kind === 'oct' && !caught) press.t = setTimeout(function () { if (!press || press.multi) return; press.pet = true; if (on.pet) on.pet(); }, 350);   /* 관성을 잡은 누름은 멈추기만 (§3.1) */
      e.preventDefault();
    });
    listen(canvas, 'pointermove', function (e) {
      var q = GEST.pts[e.pointerId]; if (!q) return;
      q.x = e.clientX; q.y = e.clientY;
      if (GEST.mode === 'multi' || GEST.mode === 'pinch' || GEST.mode === 'twist') { multiMove(); return; }
      if (!press || e.pointerId !== press.id || GEST.mode === 'done') return;
      var dx = e.clientX - press.x, dy = e.clientY - press.y;
      if (GEST.mode === 'yaw') { yawDrag = clamp(yawDrag + (e.clientX - press.lx) * 0.004, -25 * DEG, 25 * DEG); press.lx = e.clientX; press.moved = true; dither.still = 0; if (panOn()) { placeCamera(); clampPan(); } return; }
      if (!press.moved && Math.hypot(dx, dy) > 8) press.moved = true;
      if (GEST.hold) { furnDragMove(e); return; }
      if (press.moved) clearTimeout(press.ft);
      var vert = press.touch && touchNow === 'pan-y' && Math.abs(dy) > Math.abs(dx);   /* 1× 터치의 세로 쓸기 = 페이지 몫 (브라우저가 곧 pointercancel) */
      if (octPress()) { if (press.moved && !press.pet) { clearTimeout(press.t); press.pet = true; if (on.pet) on.pet(); } return; }   /* 문어 위 쓸기 = 쓰다듬기, 세로도 (touchmove 가 페이지 스크롤을 막는다 · §5.3 '지금 그대로') */
      if (press.moved && GEST.mode === 'press') { if (vert) { GEST.mode = 'done'; return; } if (panOn() && !panLocked()) startPan(); }
      if (GEST.mode === 'pan') panMove(e);
    });
    function pointerEnd(e) {
      if (!GEST.pts[e.pointerId]) return;
      delete GEST.pts[e.pointerId]; GEST.n = gPts().length;
      if (GEST.mode === 'multi' || GEST.mode === 'pinch' || GEST.mode === 'twist') {   /* 한 손가락을 떼면 손짓 끝 — 남은 손가락은 뗄 때까지 아무것도 안 한다 (튐 없이) */
        if (GEST.mode === 'pinch') zoomSettle(GEST.multi.mx, GEST.multi.my);   /* 가까운 멈춤으로 0.15 s → 끝에 panSettle */
        else if (panOn() && !panLocked()) panSettle();
        GEST.mode = GEST.n ? 'done' : ''; if (!GEST.n) press = null; return;
      }
      if (!press || e.pointerId !== press.id) { if (!GEST.n) { GEST.mode = ''; press = null; } return; }
      clearTimeout(press.t); clearTimeout(press.ft);
      if (GEST.hold) { furnDrop(); press = null; GEST.mode = GEST.n ? 'done' : ''; GEST.pan = null; return; }
      var o = press.obj, k = o && o.userData.kind;
      if (GEST.mode === 'pan') panRelease(e);
      else if (GEST.mode === 'press' && !press.moved && !press.pet && !press.caught && !press.multi && e.type === 'pointerup') {
        if (k === 'oct') { oct.wantYaw = camYaw(); if (on.tap) on.tap(); }
        else if (k === 'window') { if (on.windowTap) on.windowTap(); }
        else if (k === 'poster') { if (on.posterTap) on.posterTap(o.userData.id); }
        else if (k === 'souvenir') { if (on.souvenirTap) on.souvenirTap(o.userData.sv); }
        else if (k === 'spot') spotTap(o.userData.spot);   /* 문 · 오락기: 그 자리의 진짜 단추를 누른다 (앱의 click 처리 그대로) */
        else if (!k && PLACE.vis === 'attic' && !PLACE.room && furnAt(press.x, press.y) === 'sofa') playerSit();   /* 소파 톡 = 앉기 (노란 점은 표시일 뿐 — 누르기는 장면이 받아야 같은 자리에서 꾹 눌러 옮길 수 있다) */
      }
      if (GEST.mode !== 'pan' && !PAN.mode && !ZT && panOn() && !panLocked()) panSettle();   /* 고무줄 복귀·관성을 톡·꾹으로 멈췄으면 경계 밖·소수 자리에 남지 않게 (안이면 정수 px 로만) */
      press = null; GEST.mode = GEST.n ? 'done' : ''; GEST.pan = null;
    }
    listen(canvas, 'pointerup', pointerEnd); listen(canvas, 'pointercancel', pointerEnd);
    listen(canvas, 'lostpointercapture', pointerEnd);   /* 떼기 없이 캡처를 잃으면 (장면이 숨거나 2D 로 바뀌는 중) 취소로 친다 — 손가락 상태가 남아 다음 누름이 두 번째 손가락이 되지 않게. 정상 떼기 뒤엔 이미 지워져 무시된다 */
    listen(canvas, 'wheel', function (e) {   /* 한 칸에 한 멈춤 (커서 아래가 그 자리에), 그 칸 뒤 0.15 s 동안 들어오는 휠은 무시 (§3.5, 트랙패드 폭주 방지) */
      e.preventDefault();
      if (!e.deltaY) return;
      var now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      if (now - GEST.wheelT < 150) return;   /* 무시한 휠은 시간을 늘리지 않는다 → 마우스 휠을 빨리 돌리면 0.15 s 마다 한 칸 */
      GEST.wheelT = now;
      zoomFinish();
      setZoom(ZOOM_STEPS[clamp(zoomStepOf(st.zoomF) + (e.deltaY < 0 ? 1 : -1), 0, ZOOM_STEPS.length - 1)], e.clientX, e.clientY);
    }, { passive: false });
    /* touch-action 은 손짓 도중 못 바꾼다 → 두 손가락·물건 든 동안·밀기 중·문어 쓰다듬기 중엔 touchmove 를 막아 브라우저가 핀치·끌기·쓸기를 가져가지 않게 (pointercancel 방지).
       1× 한 손가락 세로 쓸기는 그대로 페이지 스크롤 — 단 페이지가 맨 위인데 아래로 당기면 막는다: 내릴 것이 없고, 안 막으면 안드로이드 크롬의 '당겨서 새로고침'이 게임을 다시 연다
       (예전 #scene3d touch-action:none 이 막던 것. html·body 의 overscroll-behavior 는 CSS 몫 — 이건 장면 위에서 시작한 손짓만) */
    function octPress() { return !!(press && !press.caught && press.obj && press.obj.userData.kind === 'oct'); }
    function pullAtTop(e) {
      if (!press || e.touches.length !== 1 || touchNow !== 'pan-y') return false;
      var t = e.touches[0], dy = t.clientY - press.y, se = document.scrollingElement || document.documentElement;
      return dy > 0 && dy >= Math.abs(t.clientX - press.x) && (window.pageYOffset || 0) <= 0 && (!se || se.scrollTop <= 0);
    }
    listen(canvas, 'touchmove', function (e) { if (e.cancelable && (e.touches.length >= 2 || GEST.hold || GEST.mode === 'pan' || octPress() || pullAtTop(e))) e.preventDefault(); }, { passive: false });
    listen(canvas, 'contextmenu', function (e) { e.preventDefault(); });   /* 안드로이드 꾹 누르기 · 마우스 오른쪽 끌기 */
    canvas.style.setProperty('-webkit-touch-callout', 'none'); canvas.style.setProperty('-webkit-user-select', 'none'); canvas.style.userSelect = 'none';   /* iOS 꾹 누르기 말풍선 없음 */
    listen(document, 'pointermove', function (e) { if (e.pointerType !== 'touch') { oct.pointer = { x: e.clientX, y: e.clientY }; oct.lookTarget = null; } }, { passive: true });
    /* 컨텍스트 잃음 (docs/research/a11y-and-mobile-perf.md 3): 보이는 동안 3 s 안에 돌아오지 않으면 opts.onLost() 한 번 → 앱이 2D 폴백으로 바꾼다. 돌아오면 아무것도 안 한다 (3D 그대로).
       탭이 숨어 있는 동안은 세지 않는다 (iOS 는 백그라운드에서 회수하고 앞으로 돌아올 때 복구한다) */
    var lostTimer = 0, lostTold = false;
    function armLost() {
      clearTimeout(lostTimer); lostTimer = 0;
      if (!st.lost || lostTold || document.hidden || typeof opts.onLost !== 'function') return;
      lostTimer = setTimeout(function () { lostTimer = 0; if (!st.lost || lostTold || document.hidden) return; lostTold = true; opts.onLost(); }, 3000);
    }
    listen(canvas, 'webglcontextlost', function (e) { e.preventDefault(); st.lost = true; if (oct.walking && oct.walking.finish) oct.walking.finish(); dqFinish(); if (SAL.active) salFinishNow(); armLost(); });   /* 문 작업 · 미용실 연출도 지금 끝낸다 (프레임이 안 돌아 Promise 가 걸리지 않게) */
    listen(canvas, 'webglcontextrestored', function () { st.lost = false; renderer.shadowMap.needsUpdate = true; armLost(); });
    listen(document, 'visibilitychange', function () { st.hidden = document.hidden; armLost(); if (st.hidden && SAL.active) salFinishNow(); if (!st.hidden) { lastDraw = 0; loop(); } });   /* 탭이 숨으면 미용실 연출은 끝 상태로 (돌아와서 다시 보이지 않는다 — 재생은 결정이 아니다) */
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
    var candleT = 0, loggedBy = { attic: false, exterior: false, play: false }, callsBy = { attic: 0, exterior: 0, play: 0 }, framesBy = { attic: 0, exterior: 0, play: 0 };
    var perf = { ring: new Float32Array(60), n: 0, i: 0, sum: 0, cnt: 0, auto: 0 };   /* 디버그 통계 (룩 패스 7): 마지막 60 렌더 프레임의 ms/frame (stats().ms). sum/cnt = 첫 2 s 누적 (자동 픽셀 폴백, 룩 패스 8) */
    /* ── 입장 하늘: 구름 퍼프(알파 테스트 쿼드, 텍스처 1텍셀 = 아트 1px) · 하늘 비(1px 세로줄, 12 fps 스텝) / 눈 / 별. 연출 동안만 존재하고 착지하면 버린다 ──
       구름 색은 시각대로: 밤 = 남회색, 노을·새벽 = 웜 베이지, 낮 = 밝은 회색 (Apollo 칸). 노멀 패스에선 숨긴다 (쿼드 테두리가 노멀 하이라이트로 새지 않게) */
    /* 카드 11: 가까운 층은 1.75 배 큰 덩어리(176×… 칸), 먼 층은 1.2 배. 텍스처를 늘리지 않고 덩어리를 크게 그린다 (1텍셀 = 아트 1px 그대로) */
    var CLOUD = { w: 196, h: 98, n: 4, s: 1.75, far: { w: 136, h: 68, n: 4, s: 1.2 }, pass: 0.58, near: [[1.08, -1], [0.96, 1], [0.9, -1]] };   /* near = 가까운 층 [화면 가운데를 지나는 높이(H 의 비), 쪽] */   /* pass = 뚫고 지나가는 구름이 화면 가운데 올 때의 높이 (H 의 비) */
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
      var hasC = typeof CLOUDS !== 'undefined';
      var mats = [false, true].map(function (far) {   /* 구름 그림: js/clouds.js (몽글한 적운, 날씨 × 시각대 램프). 없으면 예전 간단한 퍼프 */
        var cs = far ? CLOUD.far : CLOUD;
        var tex = hasC ? canvasTex(CLOUDS.atlas({ weather: w, phase: ph, far: far, w: cs.w, h: cs.h, n: cs.n, scale: cs.s })) : cloudTex(night, warm, far);
        var m = new T.MeshBasicMaterial({ map: tex, alphaTest: 0.5, depthWrite: false }); sky.list.push(tex, m); return m;   /* 깊이에 안 쓴다 → 후처리 깊이 외곽선이 구름끼리 겹친 곳에 금을 긋지 않는다 (다락 뒤면 깊이 테스트로 가려진다) */
      });
      var fwd = new T.Vector3(); camera.getWorldDirection(fwd);
      var base = camTarget, VW = S.rw / S.N, VH = (S.rh / S.N) / Math.max(_u.y, 0.3), top = base.y + INTRO.H, pass = base.y + INTRO.H * CLOUD.pass;
      /* 수는 줄여 띄엄띄엄 (예전 5 · 11 · 16): [먼 층, 가까운 층] + 뚫고 지나가는 구름 1 → 드로우콜은 예전보다 같거나 적다 */
      var cnt = w === 'clear' ? [2, 2] : w === 'drizzle' ? [3, 2] : [3, 3];
      function addCloud(i, far, sx, yWant) {
        var cs = far ? CLOUD.far : CLOUD, r = hash('cl' + i), gw = cs.w / S.N, gh = cs.h / S.N;
        var geo = new T.PlaneGeometry(gw, gh), uv = geo.attributes.uv.array, v0 = (r % cs.n) / cs.n;
        for (var j = 0; j < uv.length; j += 2) uv[j] = v0 + uv[j] / cs.n;
        var m = new T.Mesh(geo, mats[far ? 1 : 0]); m.quaternion.copy(camera.quaternion); m.renderOrder = (far ? 5 : 40) + i;   /* 쌓는 순서: 먼 층 → 가까운 층 → 뚫는 구름 (깊이를 안 쓰니 순서로) */
        /* 먼 층(어둡고 작고, 카메라를 30 % 따라와 느리게 흐름) · 가까운 층(크고 밝고, 월드에 고정 = 빨리 스쳐 감) → 직교 카메라에서도 깊이가 생긴다 (패럴랙스).
           가장 낮은 자리: 착지했을 때 화면 위 가장자리(base + 0.62 VH) + 구름 높이 + 패럴랙스로 따라 내려오는 거리 → 끝나면 반드시 화면 밖 */
        var par = far ? 0.3 : 0, y0 = base.y + 0.62 * VH + gh / Math.max(_u.y, 0.3) + INTRO.H * par;
        /* 깊이: 층 안에서는 1 cm 씩만 (후처리 깊이 외곽선 문턱 6 cm 아래 → 같은 층 구름끼리 겹쳐도 금 간 선이 안 생긴다), 먼 층과 가까운 층 사이만 3 m */
        m.userData = { sx: sx, z: (far ? -4 : -1) - i * 0.01, y: Math.max(y0, yWant), par: par };
        g.add(m); sky.list.push(geo); sky.clouds.push(m);
      }
      for (var i = 0; i < cnt[0]; i++) {   /* 먼 층: 출발 화면 둘레 높은 곳에만 (뚫는 구름이 지날 땐 이미 화면 위로 나가 있다 → 다 덮는 프레임이 길어지지 않는다). 가로는 고르게 + 흔들림 */
        var rf = hash('clf' + i), fy = (i + 0.5) / cnt[0];
        addCloud(i, true, ((i + 0.5) / cnt[0] - 0.5) * VW * 1.1 + (((rf >>> 6) % 100) / 100 - 0.5) * VW * 0.35, base.y + INTRO.H * (0.94 + 0.24 * fy) + (((rf >>> 16) % 100) / 100 - 0.5) * 0.12 * VH);
      }
      for (var n = 0; n < cnt[1]; n++) {   /* 가까운 층: 뚫는 구름보다 위에서, 화면 옆을 반쯤 걸치고 스쳐 간다 (뚫는 구름보다 앞에 그린다) */
        var rn = hash('cln' + n), side = CLOUD.near[n][1];
        addCloud(cnt[0] + n, false, side * VW * (0.34 + ((rn >>> 4) % 100) / 100 * 0.1), base.y + INTRO.H * CLOUD.near[n][0]);
      }
      sky.fwd = fwd; sky.VW = VW; sky.VH = VH;
      /* 뚫고 지나가는 구름 (카드 11): 화면보다 넓고, 몸이 화면 높이 + 3프레임 이동만큼 길다 → 몇 프레임 동안 화면을 다 덮는다. 월드에 고정 (가까운 층) */
      if (hasC && CLOUDS.bank) {
        var spd = INTRO.H / Math.max((INTRO.dur - INTRO.top) * EASE.land, 0.1) / (1 - (EASE.a + EASE.d) / 2) / pxUp(), bw = S.rw + 24;   /* 가운데 일정 구간 속도 (화면 px/s) */
        var bh = Math.ceil(CLOUDS.bank.bodyTop(bw) * 0.45 + S.rh + spd * 0.02 + 4);   /* 윗면 몽우리 아래쪽 절반도 거의 빈틈이 없다 → 몸 + 그 절반 = 화면 높이 + 0.02 s 이동 → 다 덮는 건 60 fps 에서 2~4 프레임 (tools 로 잰 값: docs/INTRO_SLOW_PROTO.md) */
        var cvB = CLOUDS.bank({ weather: w, phase: ph, w: bw, h: bh, seed: 'bank' + w });
        var texB = canvasTex(cvB), matB = new T.MeshBasicMaterial({ map: texB, alphaTest: 0.5, depthWrite: false }), geoB = new T.PlaneGeometry(bw / S.N, bh / S.N);
        var mB = new T.Mesh(geoB, matB); mB.quaternion.copy(camera.quaternion); mB.renderOrder = 30;   /* 먼 층(5~) 앞 · 가까운 층(40~) 뒤 */
        /* 몸 한가운데(윗부분을 뺀 몸의 가운데)가 화면 가운데에 올 때 = 카메라 높이 pass */
        var cy = ((cvB.bodyTop + (bh - 4 - cvB.bodyTop) / 2) - bh / 2) * pxUp();
        mB.userData = { sx: 0, z: -1.2, y: pass + cy, par: 0, bank: { h: bh, bodyTop: cvB.bodyTop } };
        g.add(mB); sky.list.push(texB, matB, geoB); sky.clouds.push(mB); sky.bank = mB;
      }
      INTRO.pass = INTRO.H * CLOUD.pass;
      sky.rainTop = sky.bank ? sky.bank.userData.y - (sky.bank.userData.bank.h / 2 - 6) * pxUp() : pass;   /* 비·눈은 그 구름 밑면에서부터 (구름 위는 맑다) */
      if (w === 'rain' || w === 'drizzle') {   /* 비 두 층: 먼 층(짧고 어둡게) · 가까운 층(길고 밝게) */
        var nr = w === 'rain' ? 90 : 45;
        sky.rain = [{ n: Math.round(nr * 0.55), obj: lines(Math.round(nr * 0.55), PAL.glass[1]), sp: 6, lens: [3, 5] }, { n: Math.round(nr * 0.45), obj: lines(Math.round(nr * 0.45), PAL.glass[3]), sp: 9, lens: [5, 8] }];
        sky.rain.forEach(function (L, li) { scene.remove(L.obj); g.add(L.obj); sky.list.push(L.obj.geometry, L.obj.material); L.s = []; for (var q = 0; q < L.n; q++) L.s.push(skyDrop(li, q, 0, true)); });
      } else if (w === 'snow') {
        sky.snow = points(70, PAL.paper[3]); scene.remove(sky.snow); g.add(sky.snow); sky.list.push(sky.snow.geometry, sky.snow.material);
        sky.flakes = []; for (var f = 0; f < 70; f++) sky.flakes.push(skyDrop(9, f, 0, true));
      }
      if (ph !== 'day') {   /* 별: 밤·노을·새벽이면 날씨와 상관없이 구름 위에 몇 개 (구름 위는 맑다). 정지 — 카메라가 내려가면 위로 흘러간다 */
        var ns = night ? 28 : 12, st2 = points(ns, PAL.white); scene.remove(st2); g.add(st2); sky.list.push(st2.geometry, st2.material);
        var a = st2.geometry.attributes.position.array, sLo = pass + 0.7 * VH, sHi = top + 0.6 * VH;
        for (var s2 = 0; s2 < ns; s2++) { var rs = hash('isky' + s2); _wp.copy(base).addScaledVector(_r, ((rs % 1000) / 1000 - 0.5) * VW).setY(sLo + ((rs >>> 10) % 1000) / 1000 * Math.max(sHi - sLo, 0.1)).addScaledVector(fwd, -6); snapC(_wp); a[s2 * 3] = _wp.x; a[s2 * 3 + 1] = _wp.y; a[s2 * 3 + 2] = _wp.z; }
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
      /* 하늘 띠 (카드 11): 구름 위 = 짙은 하늘 (낮 남색 · 밤 거의 검정), 구름을 지나면 = 원래 허공색. 바뀌는 순간은 뚫는 구름이 화면을 덮고 있을 때다 */
      INTRO.band = off > INTRO.pass ? 0 : 1;
      if (INTRO.bands) scene.background.copy(INTRO.bands[INTRO.band].c);
      if (sky.bank) {   /* 덮었나: 몸(윗부분 아래 ~ 밑면)이 화면 위·아래 가장자리를 다 넘었다 → 이때는 허공을 읽지 않는다 */
        var bu = sky.bank.userData, by = (sky.bank.position.y - tg.y) / pxUp(), hb = bu.bank.h / 2;
        INTRO.covered = by + hb - bu.bank.bodyTop >= S.rh / 2 && by - hb + 4 <= -S.rh / 2;
      }
      var kk = introK(), fade = 1 - clamp((kk - 0.72) / 0.23, 0, 1);   /* 착지 직전 동안 줄기를 줄인다 (지붕 위로 비가 갑자기 끊기지 않게) */
      function place(d, li) {   /* 화면 밖(위/아래)으로 나간 줄기는 반대편 가장자리 바로 밖에서 다시 (카메라가 빨리 내려갈 땐 아래에서 올라오는 것처럼 보인다) */
        if (d.y > top + 0.4) { d.c++; var n1 = skyDrop(li, d.i, d.c, false); d.x = n1.x; d.z = n1.z; d.y = bot - ((n1.r >>> 20) % 100) / 100 * 0.8; }
        else if (d.y < bot - 1.0) { d.c++; var n2 = skyDrop(li, d.i, d.c, false); d.x = n2.x; d.z = n2.z; d.y = top + ((n2.r >>> 20) % 100) / 100 * 0.8; }
      }
      if (sky.rain) sky.rain.forEach(function (L, li) {
        var a = L.obj.geometry.attributes.position.array, act = Math.round(L.n * fade);
        L.s.forEach(function (d, i) {
          d.i = i; if (advance) d.y -= L.sp * k; place(d, li);
          var len = L.lens[0] + (d.r >>> 4) % (L.lens[1] - L.lens[0] + 1), o = i * 6;
          if (i >= act || d.y < 3.3 || d.y > sky.rainTop) { a[o + 1] = a[o + 4] = -50; return; }   /* 지붕(3.1) 아래로는 안 들어온다 · 뚫는 구름 위로도 없다 */
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
          if (i >= act2 || d.y < 3.3 || d.y > sky.rainTop) { b[i * 3 + 1] = -50; return; }
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
    /* 입장 중 (카드 11): 하늘 띠가 바뀌므로 띠마다 따로 읽는다. 매 프레임 불러도 된다 — 실제 readPixels 는 띠가 바뀐 뒤 몇 번뿐 (덮인 동안은 안 읽는다) */
    function skyHex() {
      if (INTRO.on && INTRO.bands) {
        if (SKYPX.band !== INTRO.band) { SKYPX.band = INTRO.band; SKYPX.hex = null; SKYPX.tries = 0; }
        if (!SKYPX.hex && !INTRO.covered && SKYPX.tries < 4) { SKYPX.want = true; SKYPX.tries++; }
        return SKYPX.hex || skyEstimate();
      }
      SKYPX.want = true; return SKYPX.hex || skyEstimate();
    }
    var SKYEST = { src: null, out: null };
    function skyEstimate(hex) {   /* hex 없으면 지금 하늘: 입장 중엔 그 띠, 아니면 시각대 허공색 */
      /* 없으면 지금 배경 그 값: 렌더 타깃에 든 값을 후처리가 sRGB 로 읽으므로 C() 로 바꾼 허공색은 실제로 훨씬 어둡게 나온다 (예: 낮 #1b1522 → #090a14).
         예전엔 시각대 hex 로 어림해서 틀렸고 readPixels 가 바로잡았다. 이제 어림이 처음부터 맞아 띠가 바뀐 프레임에 덮개가 바로 따라간다 */
      var src = hex || (scene.background && scene.background.isColor ? '#' + scene.background.getHexString() : LIGHTS.night.bg);
      if (SKYEST.src === src && SKYEST.pal === PAL) return SKYEST.out;
      var lab = hexToOklab(src), L = (lab[0] - 0.5) * 1.03 + 0.5, A = lab[1] * 1.07, B = lab[2] * 1.07, best = 1e9, bestL = 0, out = PAL.list[0];
      PAL.list.forEach(function (h) { var q = hexToOklab(h), d = Math.pow(L - q[0], 2) + Math.pow((A - q[1]) * 1.3, 2) + Math.pow((B - q[2]) * 1.3, 2); if (d < best - 0.0005 || (d < best + 0.0005 && q[0] > bestL)) { best = d; bestL = q[0]; out = h; } });
      SKYEST.src = src; SKYEST.pal = PAL; SKYEST.out = out;
      return out;
    }
    function startIntro(o) {
      o = o || {};
      if (INTRO.on) finishIntro();
      if (st.reduced || o.instant) return Promise.resolve(false);
      INTRO.dur = clamp(+o.dur || 2.2, 0.6, 6); INTRO.t = 0; INTRO.acc = 0; INTRO.hold = !!o.hold;   /* hold: 착지 뒤에도 비네트를 끈 채로 (입장 레이어가 걷힐 때 introRelease) */
      INTRO.top = clamp(+o.top || 0, 0, INTRO.dur * 0.3);   /* 맨 위 멈춤 (초, 카드 11) — dur 안에 든다 */
      placeCamera();   /* _r · _u 갱신 */
      var vh = (S.rh / S.N) / Math.max(_u.y, 0.3);
      INTRO.H = (o.height || 1.35) * vh; INTRO.D = 2 * pxUp();   /* 출발 = 방이 화면 아래로 완전히 빠진 높이 · 착지 눌림 아트 2px */
      /* 하늘 띠: [구름 위, 구름 아래 = 원래 허공]. 구름 위는 낮이어도 짙은 남색, 노을·새벽은 남흑, 밤은 거의 검정 (모두 Apollo 칸) */
      /* 구름 위 색은 C() 없이 그 값 그대로 넣는다 (후처리가 sRGB 로 읽는다 → 화면에 그 칸 그대로). 구름 밑은 원래 허공 (화면엔 #090a14 쯤) */
      var ph = phaseOf(st.hour), upHex = ph === 'night' ? '#090a14' : ph === 'day' ? '#172038' : '#241527';
      INTRO.bg0 = scene.background.clone();
      INTRO.bands = [{ c: new T.Color(upHex) }, { c: INTRO.bg0.clone() }]; INTRO.band = 0; INTRO.covered = false; SKYPX.band = -1;
      INTRO.on = true; dither.still = 0; post.uniforms.uVig.value = 0;   /* 비네트 끔: 허공이 한 색이어야 바깥 덮개와 이음매 없이 이어진다 */
      INTRO.sky = buildSky(); skyLayout(false);
      var pr = new Promise(function (res) { INTRO.resolve = res; });
      pr.skyLive = true;   /* 입장 레이어에게: 연출 중 skyHex() 를 매 프레임 불러도 된다 (하늘 띠가 바뀐다) */
      return pr;
    }
    function finishIntro() {
      if (!INTRO.on) return;
      INTRO.on = false; dither.still = 0; if (!INTRO.hold) introRelease();
      if (INTRO.bg0) { scene.background.copy(INTRO.bg0); INTRO.bg0 = null; }   /* 하늘 띠 → 원래 허공색 (연출 중 시각대가 바뀌었으면 applyLight 가 다시 칠한다) */
      INTRO.bands = null; INTRO.covered = false; SKYPX.hex = null; SKYPX.band = -1;
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
      var octQuiet = (isRoomP(PLACE.vis) && !octUp()) || ((st.octState === 'idle' || st.octState === 'sleep' || st.octState === 'stay') && !oct.walking && !(G.settleT < GAIT.settle));   /* 놀이방이 보이는 동안 문어(다락 · 산책 중 바깥)는 안 보이므로 30 fps (움직이는 건 2 fps 오락기 화면뿐) */
      var idle = octQuiet && !PL.walking && !PL.stick && !PL_IN.v && !GEST.mode && !PAN.mode && !ZT && light.t >= 1 && dither.still > 0.3 && !PLACE.trans && !(CER.active && !isRoomP(PLACE.vis)) && !DQ.active && !SAL.active && !(SAL.spark > 0) && !(SAL.offerT >= 0);   /* 손가락·관성 · 미용실 연출 중엔 60 fps */
      /* 프레임 상한은 *시간* 기준 (docs/research/a11y-and-mobile-perf.md 1): 가만히(또는 화면 밖) 30fps · 그 밖 60fps — 120Hz 폰도 60. 건너뛴 콜백의 시간은 버리지 않고
         다음에 그리는 프레임의 dt 로 넘긴다 (예전 홀수 콜백 건너뛰기는 dt 째 버려서 가만히 있을 때 비·양초·먼지·깜빡임·커튼이 반속도였다). debugStep(st.force) 은 항상 주어진 dt 로 진행·렌더 */
      if (!st.force && lastDraw && ts - lastDraw < (idle || st.offscreen ? 1000 / 30 : 1000 / 60) - 1) return;
      var dt = lastDraw ? Math.min(0.1, (ts - lastDraw) / 1000) : 0.016; lastDraw = ts; time += dt; frameNo++;
      if (ctxLost()) return;
      var t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0;
      applyPendingPixel();
      if (light.t < 1) { light.t = Math.min(1, light.t + dt / light.dur); applyLight(); if (light.t >= 1) light.from = null; }
      if (lampDirty) applyLamp();
      if (!st.reduced && lampGlow.visible) { lampGlow.material.opacity = glowOpacity() + Math.sin(Math.floor(time * 8) / 8 * 2) * 0.03 * (light.glow || 0.7) / 0.7; }   /* 글로우 맥동 8 fps 스텝 */
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
      stepTrans(dt); stepCer(dt); stepDQ(dt);   /* 장소 전환 · 출발/귀가 의식 (바깥·계절·전환) · 방 문 */
      if (atticG.visible) stepWeather(dt); if (extG.visible) stepExt(dt); if (PROOM && PROOM.g.visible) stepPlayRoom(dt);
      post.uniforms.uFade.value = PLACE.fade; if (PLACE.fade > 0) { var fk = hexToOklab(LIGHTS[phaseOf(st.hour)].bg); post.uniforms.uFadeOk.value.set(fk[0], fk[1], fk[2]); }
      stepSalon(dt);   /* 미용실 연출 (몸 층 SAL.body 를 stepOct 가 읽는다) · 거울 속 문어 */
      stepOct(dt); stepPlayer(dt); stepCarry(dt); stepSofaSpot(); if (PLAY) PLAY.step(dt);   /* 놀이 kit: stepOct 가 매 프레임 새로 쓴 몸·팔 값 위에 덮어쓴다 */
      stepHang(dt); stepIntro(dt);
      lampGlow.quaternion.copy(camera.quaternion); candleGlow.quaternion.copy(camera.quaternion);
      stepZoom(dt); stepPan(dt); placeCamera(); updateOverlay();
      if (!st.offscreen || st.force) draw(t0);   /* 화면 밖(T4): 시뮬레이션은 위에서 다 돌았고 렌더 패스만 건너뛴다 */
      if (frameNo === 2 && !PORT.warm) { PORT.warm = true; try { portrait('idle', { shared: true }); } catch (e) { /* 초상 워밍업(셰이더 변형 컴파일 1회)은 실패해도 장면엔 영향 없음 */ } }
    }
    function draw(t0) {   /* 렌더 패스: 뷰티 → 노멀 → 발광(+블러) → 후처리 합성 · 프레임 ms · 드로우콜 로그 */
      drawN++;
      renderer.shadowMap.needsUpdate = true;
      renderer.setRenderTarget(rt); renderer.clear(true, true, false); renderer.render(scene, camera);
      calls = renderer.info.render.calls;
      scene.overrideMaterial = normalMat; var bg = scene.background; scene.background = null; shade.visible = false; if (PROOM) PROOM.shade.visible = false; if (LROOM) LROOM.shade.visible = false; if (INTRO.sky) INTRO.sky.g.visible = false;   /* 차폐는 노멀 패스에서 숨김 (방 전체를 덮어쓰지 않게) */
      renderer.setRenderTarget(rtN); renderer.clear(true, true, false); renderer.render(scene, camera);   /* 사라지는 문어도 노멀은 꽉 차게 그린다 — 남은 픽셀은 평소와 같은 하이라이트, 구멍 픽셀은 후처리가 알파 표시로 끈다 */
      scene.overrideMaterial = null;
      calls += renderer.info.render.calls;
      /* 발광 패스 (룩 패스 6): 레이어 1 의 발광 쌍둥이 3개만 (배경 없음 = 검정). 깊이 텍스처가 있으면 뷰티 깊이를 공유하므로 색만 지운다 → 가려진 발광은 안 그려진다 */
      camera.layers.set(1);
      renderer.setRenderTarget(rtE); renderer.clear(true, !hasDepthTex, false); renderer.render(scene, camera);
      camera.layers.set(0); scene.background = bg; shade.visible = true; if (PROOM) PROOM.shade.visible = true; if (LROOM) LROOM.shade.visible = true; if (INTRO.sky) INTRO.sky.g.visible = true;
      calls += renderer.info.render.calls;
      if (blurOn) {   /* 분리 블러 가로 → 세로 (풀스크린 삼각형 2회, rtE → rtB → rtE). p ≥ 4 면 생략 */
        quad.material = blurMat;
        blurMat.uniforms.tSrc.value = rtE.texture; blurMat.uniforms.uDir.value.set(1 / S.rw, 0); renderer.setRenderTarget(rtB); renderer.render(quadScene, quadCam);
        blurMat.uniforms.tSrc.value = rtB.texture; blurMat.uniforms.uDir.value.set(0, 1 / S.rh); renderer.setRenderTarget(rtE); renderer.render(quadScene, quadCam);
        quad.material = post; calls += 2;
      }
      post.uniforms.uSky.value = (PLACE.vis === 'exterior' || INTRO.on) ? 0 : 1; post.uniforms.uStars.value = clamp((light.em - 0.6) / 0.4, 0, 1); if (light.out) { var so = hexToOklab('#' + light.out.getHexString()); post.uniforms.uSkyOk.value.set(Math.max(so[0] * 0.62, 0.3), so[1] * 0.8, so[2] * 0.8);   /* 창밖 빛(out)을 한 톤 가라앉힌 색 — 밤엔 남색이 팔레트 맨 아래 칸에 묻히지 않게 밝기 바닥 0.3 */ }   /* 허공 하늘: 다락 · 놀이방만 · 별은 밤(자체광 em 1)에만 */
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
          loggedBy[pv] = true; console.info('[scene3d] draw calls ' + calls + ' (≤150 ' + (calls <= 150 ? 'ok' : 'OVER') + ') · target ' + S.rw + '×' + S.rh + ' · px ' + S.p + ' · palette ' + PAL.list.length + ' · static props ' + (pv === 'exterior' ? extPropN + ' · place exterior · season ' + SEASON.cur : pv === 'play' ? PROOM.props + ' · place play' : propCount));
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
    container.classList.add('mode-3d'); container.dataset.view = 'attic'; container.dataset.room = '';   /* CSS 갈고리: data-view = 그려지는 장소 · data-room = 내가 든 방 */
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
    ready = true; touchMode(); loop();

    /* ═══════════════ 놀이 kit (play.html 전용 · docs/PLAY_PROTO.md §11) ═══════════════
       inst.play() 를 처음 부를 때만 만든다. 그 전엔 PLAY = null 이라 훅 4줄(frame · stepOct 눈·색 · camTargetNow)이 아무것도 안 하고, 메시·재질·리스너도 하나도 없다 → index.html 그대로.
       고르기는 여기 없다: kit 는 "보여 주기"만 한다 (걷기·뻗기·들기·놓기·굴리기·구겨 넣기·위장). 무엇을 할지는 play.js 의 chooser 가 정하고, 그 한 선택을 여러 원시 동작으로 재생한다.
       시계: 모든 연출은 PLAY.step(dt) 의 작업 큐로 돈다 (debugStep 으로 결정적). 포즈는 12 fps 칸(83 ms)으로 끊은 그린 포즈. 모션 감소면 대부분 즉시(색·대기는 유지).
       좌표: 월드 m. 장난감 논리 위치(x, z, 바닥 위 y) → 매 프레임 화면 픽셀 격자에 스냅(snapScreen), 들림은 화면 세로 정수 px(snapUp). 난수 없음 — 꿈틀 위상 같은 변화는 hash 만 쓴다 (결정적).
       동작 Promise 는 늘 resolve 한다 (reject 없음): { ok, cancelled?, ... }. kit.cancel() 이면 남은 작업이 { ok: false, cancelled: true } 로 끝난다. */
    function makePlay() {
      var SQ = Math.SQRT1_2, TIP = new T.Vector3(0.82, -0.08, 0), MAXS = 2.6, F12 = 1 / 12, NEAR = 32;
      var GRID = { P0: [0, 0, 0.2], e: [SQ, 0, -SQ], f: [SQ, 0, SQ], du: 0.3, v: [0.55, 0, -0.85, -1.1] };   /* §12.2: u 0..8 창 쪽 → 문 쪽, v 0 앞자리 · 1 컵 줄 · 2 작업칸 · 3 문어 자리 */
      var CUP = { h: 0.325, r0: 0.17, r1: 0.13 }, BALL_R = 0.10;
      var toys = {}, order = [], jobs = [], ctl = {}, poses = {}, PF = 0;
      var proxyMat = keep(new T.MeshBasicMaterial({ visible: false }));
      var _v = new T.Vector3(), _w = new T.Vector3(), _l = new T.Vector3(), _q = new T.Quaternion(), _q2 = new T.Quaternion(), _ax2 = new T.Vector3(), _rc = new T.Raycaster(), _nd = new T.Vector2(), _pl = new T.Plane(new T.Vector3(0, 1, 0), 0);
      var P = PLAY = { kit: null, step: stepPlay, tint: null, cam: null, eye: null, look: null, hidden: null, tip: null, stat: { jobs: 0, frames: 0 } };
      function per() { return F12 * st.speed; }                                   /* 12 fps 한 칸 (속도 배율) */
      function DK(sec) { return sec * st.speed; }                                 /* 모션 감소여도 유지 (색·대기) */
      function cell(u, v) { var vv = GRID.v[clamp(Math.round(v), 0, 3)]; return [GRID.P0[0] + GRID.e[0] * (u - 4) * GRID.du + GRID.f[0] * vv, GRID.P0[2] + GRID.e[2] * (u - 4) * GRID.du + GRID.f[2] * vv]; }
      function cellOf(x, z) {   /* 가장 가까운 칸 [u, v] (u 0..8 정수, v 0..3) */
        var dx = x - GRID.P0[0], dz = z - GRID.P0[2], su = (dx * GRID.e[0] + dz * GRID.e[2]) / GRID.du + 4, sv = dx * GRID.f[0] + dz * GRID.f[2], bv = 0, bd = 9;
        GRID.v.forEach(function (vv, i) { var d = Math.abs(vv - sv); if (d < bd) { bd = d; bv = i; } });
        return [clamp(Math.round(su), 0, 8), bv];
      }

      /* ── 작업 큐 ── */
      function job(dur, fn, tag) { return new Promise(function (res) { jobs.push({ t: 0, dur: dur, fn: fn, res: res, tag: tag || '' }); }); }
      function frames(n, step, fn, tag) {   /* n 포즈를 step 초마다: fn(i) 를 0..n-1 순서대로 빠짐없이 (dt 가 커도) */
        var last = -1;
        return job(n * step, function (k, t) { var i = k >= 1 ? n - 1 : Math.min(n - 1, Math.floor(t / step + 1e-6)); while (last < i) { last++; fn(last); } }, tag);
      }
      function wait(sec) { return job(DK(sec), null, 'wait'); }
      function okR(o) { return Object.assign({ ok: true }, o || {}); }
      function cancel(tag) {   /* 남은 연출(작업)을 { ok: false, cancelled: true } 로 끝낸다. tag 없으면 걷기도 */
        if (!tag) stopWalk();
        var keep2 = [];
        jobs.forEach(function (j) { if (!tag || j.tag === tag) { j.dead = true; j.res({ ok: false, cancelled: true }); } else keep2.push(j); });
        jobs = keep2;
      }

      /* ── 장난감 ── */
      function colorOf(c, fb) { if (/^#[0-9a-f]{6}$/i.test(c || '')) return c; var m = { navy: PAL.navy[3], moss: PAL.moss[2], rose: PAL.rose[1], amber: PAL.amber[3], sky: PAL.sky[2], paper: PAL.paper[1], wood: PAL.wood[3] }; return m[c] || fb; }
      function atOf(at, row) { if (typeof at === 'number') return cell(at, row); if (at && at.length >= 2) return [at[0], at[at.length - 1]]; return cell(4, row); }
      function addToy(id, kind, parts, o) {
        if (toys[id]) removeToy(id);
        var g = new T.Group(), mesh = new T.Mesh(mergeParts(parts), lambert);
        mesh.receiveShadow = true; mesh.castShadow = false; g.add(mesh);
        var px = new T.Mesh(o.proxy, proxyMat); px.userData.toy = id; g.add(px);
        var dc = new T.Mesh(new T.PlaneGeometry(o.decal * 2, o.decal * 2), decalMat); dc.rotation.x = -Math.PI / 2; dc.renderOrder = 1;
        atticG.add(g); atticG.add(dc);
        var at = o.at || [0, 0];
        var p = toys[id] = { id: id, kind: kind, g: g, mesh: mesh, proxy: px, decal: dc, x: at[0], z: at[1], y: 0, lift: 0, tilt: 0, sy: 1, vis: true, attach: null, grip: null, on: null, cover: null, h: o.h, r: o.r, q: new T.Quaternion(), w: new T.Vector3(), f: -1, color: o.color, seen: true };
        order.push(id); return p;
      }
      function removeToy(id) {
        var p = toys[id]; if (!p) return;
        atticG.remove(p.g); atticG.remove(p.decal); p.mesh.geometry.dispose(); p.decal.geometry.dispose(); p.proxy.geometry.dispose();   /* 장난감 기하는 장난감 것 (keep 목록에 안 넣는다: 처음처럼마다 쌓이지 않게) */
        order.splice(order.indexOf(id), 1); delete toys[id];
        order.forEach(function (k) { var q = toys[k]; if (q.on === id) q.on = null; if (q.cover === id) q.cover = null; });
      }
      function addCup(id, band, at) {   /* 엎은 컵: 아래 r .17 · 위 r .13 · 높이 .30 · 10면 + 띠(y .21) + 입술 + 굽. 메시 하나 (§11.4) */
        var body = PAL.paper[1], bc = colorOf(band, PAL.navy[3]);
        var parts = [{ g: new T.CylinderGeometry(CUP.r1, CUP.r0, 0.30, 10), m: M(0, 0.15, 0), c: body },
          { g: new T.CylinderGeometry(0.152, 0.158, 0.05, 10), m: M(0, 0.21, 0), c: bc },
          { g: new T.CylinderGeometry(0.176, 0.18, 0.03, 10), m: M(0, 0.015, 0), c: PAL.paper[2] },
          { g: new T.CylinderGeometry(0.105, 0.115, 0.025, 10), m: M(0, 0.3125, 0), c: PAL.paper[0] }];
        var p = addToy(id, 'cup', parts, { proxy: new T.CylinderGeometry(0.28, 0.28, 0.5, 8).translate(0, 0.25, 0), decal: 0.22, at: atOf(at, 1), h: CUP.h, r: CUP.r0, color: body });
        p.band = bc; return api(id);
      }
      function addBall(id, color, at) {   /* 공: 구 r .10 (10×8) + 종이색 띠 (구르는 게 보이게). 그룹 원점 = 바닥 접점, 메시 원점 = 공 중심 */
        var c = colorOf(color, PAL.amber[3]);
        var parts = [{ g: new T.SphereGeometry(BALL_R, 10, 8), m: M(0, 0, 0), c: c }, { g: new T.TorusGeometry(BALL_R * 0.98, 0.022, 4, 14), m: M(0, 0, 0, Math.PI / 2, 0, 0.5), c: PAL.paper[2] }];
        var inBasket = at === 'basket', p = addToy(id, 'ball', parts, { proxy: new T.SphereGeometry(0.22, 8, 6).translate(0, BALL_R, 0), decal: 0.13, at: inBasket ? cell(8, 0) : atOf(at, 0), h: BALL_R * 2, r: BALL_R, color: c });
        p.mesh.position.y = BALL_R;
        if (inBasket) putInBasket(id);
        return api(id);
      }
      function addBasket(id, at) {   /* 열린 상자 .36 × .16 × .28 (나무). 공 하나가 들어간다. addBasket(u) 도 된다 (id 'basket') */
        if (typeof id === 'number' || Array.isArray(id)) { at = id; id = 'basket'; }
        id = id || 'basket';
        var w = PAL.wood, parts = [{ g: box(0.36, 0.03, 0.28), m: M(0, 0.015, 0), c: w[2] },
          { g: box(0.36, 0.16, 0.025), m: M(0, 0.08, 0.1275), c: w[4] }, { g: box(0.36, 0.16, 0.025), m: M(0, 0.08, -0.1275), c: w[3] },
          { g: box(0.025, 0.16, 0.28), m: M(0.1675, 0.08, 0), c: w[4] }, { g: box(0.025, 0.16, 0.28), m: M(-0.1675, 0.08, 0), c: w[3] },
          { g: box(0.38, 0.02, 0.025), m: M(0, 0.165, 0.1275), c: w[6] }, { g: box(0.025, 0.02, 0.30), m: M(0.1675, 0.165, 0), c: w[6] }];
        var p = addToy(id, 'basket', parts, { proxy: box(0.5, 0.3, 0.42).translate(0, 0.15, 0), decal: 0.3, at: atOf(typeof at === 'number' ? at : at || 8, 0), h: 0.16, r: 0.2, color: w[3] });
        p.g.rotation.y = -Math.PI / 4;   /* 화면과 나란히 */
        return api(id);
      }
      function putInBasket(ballId, basketId) {
        var b = toys[ballId], k = toys[basketId || 'basket'] || order.map(function (i) { return toys[i]; }).filter(function (t) { return t.kind === 'basket'; })[0];
        if (!b || !k) return false;
        b.attach = null; b.cover = null; b.on = null; b.x = k.x; b.z = k.z; b.y = 0.03; b.lift = 0; b.inBasket = k.id; return true;
      }
      function towerBase(p) { while (p && p.on && toys[p.on]) p = toys[p.on]; return p; }
      function towerTop(p) { var top = p, again = true; while (again) { again = false; for (var i = 0; i < order.length; i++) { var q = toys[order[i]]; if (q.on === top.id) { top = q; again = true; break; } } } return top; }
      function towerH(base) { var h = 0, p = towerTop(base); while (p) { h += p.h; if (p === base) break; p = toys[p.on]; } return h; }
      function liftY(p) { return snapUp(p.lift * pxUp()); }

      /* 매 프레임: 논리 → 월드 (스냅). 순서: 놓인 것 → 쌓인 것(아래부터) → 덮인 공 */
      function place(p) {
        if (P.inLayout && p.f === PF) return p.w;
        p.f = PF; var w = p.w;
        if (p.attach && p.attach.slice(0, 4) === 'arm:' && arms[+p.attach.slice(4)]) {
          var am = arms[+p.attach.slice(4)]; am.updateMatrixWorld(true);
          am.localToWorld(w.copy(TIP)).sub(p.grip); snapScreen(w); w.y += liftY(p);
        } else if (p.attach === 'head') {
          bodyG.updateMatrixWorld(true); bodyG.localToWorld(w.set(0, HEAD_Y + HEAD_SQ * 0.93, 0)); snapScreen(w);
        } else if (p.on && toys[p.on]) {
          var b = place(toys[p.on]); w.set(b.x, b.y + snapUp(toys[p.on].h * toys[p.on].sy) + liftY(p), b.z);
        } else {
          if (p.cover && toys[p.cover]) { var c = towerBase(toys[p.cover]); if (!c.attach && c.lift <= 3) { p.x = c.x; p.z = c.z; } }
          w.set(p.x, p.y, p.z); snapScreen(w); w.y += liftY(p);
        }
        return w;
      }
      function covered(p) {   /* 공이 엎은 컵 밑에 있고 그 컵(탑)이 바닥에 있으면 안 보인다 */
        if (!p.cover || !toys[p.cover]) return false;
        var c = towerBase(toys[p.cover]); return !c.attach && c.lift < 3 && c.vis;
      }
      function layoutToys() {
        PF++; P.inLayout = true; octG.updateMatrixWorld(true);
        order.forEach(function (id) {
          var p = toys[id], w = place(p), show = p.vis && !(p.kind === 'ball' && covered(p));
          p.g.position.copy(w); p.g.visible = show;
          if (p.kind === 'cup') {
            if (p.attach === 'head') { bodyG.getWorldQuaternion(_q); _q2.setFromAxisAngle(_ax2.set(0, 0, 1), p.hatTilt || 8 * DEG); p.g.quaternion.copy(_q).multiply(_q2); }
            else { p.g.rotation.set(0, 0, p.tilt); if (p.tip) { _q.setFromAxisAngle(_ax2.set(GRID.e[0], 0, GRID.e[2]), p.tip); p.g.quaternion.premultiply(_q); } }   /* tip < 0: 입구가 보는 사람 쪽으로 (들춰 보기) */
            p.mesh.scale.set(1, p.sy, 1);
          } else if (p.kind === 'ball') { p.mesh.quaternion.copy(p.q); var bs = S.p >= 3 ? 1.2 : 1; p.mesh.scale.setScalar(bs); p.mesh.position.y = BALL_R * bs; }   /* 자동 픽셀 폴백(p=3)이면 공을 r .12 로 */
          var hgt = w.y - (p.inBasket ? p.y : 0), dShow = show && p.attach !== 'head' && !(p.on && toys[p.on]) && !p.inBasket;
          p.decal.visible = dShow;
          if (dShow) {
            p.decal.position.set(w.x, 0.02, w.z); snapScreen(p.decal.position);   /* 스냅 그대로 (y 를 되돌리면 세로 스냅이 풀린다) */
            var up = pxUp(); p.decal.scale.setScalar(hgt >= 6 * up ? 0.6 : hgt >= 3 * up ? 0.8 : 1);
          }
        });
        P.inLayout = false;
      }

      /* ── 팔 (한 팔씩 덮어쓰기; 나머지 팔은 stepOct 의 꿈틀·걸음 그대로) ── */
      function restTip(i) { var am = arms[i], a = am.userData.a, ro = am.position; return _l.set(ro.x + Math.cos(a) * 0.824, ro.y - 0.039, ro.z + Math.sin(a) * 0.824); }
      function needS(i, wp) { bodyG.updateMatrixWorld(true); var t = bodyG.worldToLocal(_v.copy(wp)), ro = arms[i].position, dh = Math.hypot(t.x - ro.x, t.z - ro.z), dy = t.y - ro.y; return Math.sqrt(Math.max(dh * dh + dy * dy - 0.0064, 1e-4)) / 0.82; }
      function solveArm(i, pl, wig) {   /* bodyG 로컬 점 pl 에 팔 끝(0.82, −0.08)을 → rotation.y · rotation.z · scale.x */
        var am = arms[i], ro = am.position, dx = pl.x - ro.x, dy = pl.y - ro.y, dz = pl.z - ro.z, dh = Math.hypot(dx, dz), d2 = dh * dh + dy * dy;
        var sx = clamp(Math.sqrt(Math.max(d2 - 0.0064, 1e-4)) / 0.82, 0.55, (ctl[i] && ctl[i].maxS) || MAXS);   /* maxS: 틈으로 길게 뻗는 팔 (reach o.maxS) */
        am.rotation.y = -Math.atan2(dz, dx);
        am.rotation.z = Math.atan2(dy, dh) - Math.atan2(-0.08, 0.82 * sx) + (wig || 0) * Math.asin(clamp(pxUp() / (0.82 * sx * OCT_R * Math.max(bodyG.scale.y, 0.3)), 0, 1));
        am.scale.x = sx; return sx;
      }
      function armTarget(c) { return typeof c.tgt === 'function' ? c.tgt() : c.tgt; }
      function stepArms() {
        var keys = Object.keys(ctl); if (!keys.length) return;
        octG.updateMatrixWorld(true);
        keys.forEach(function (k) {
          var i = +k, c = ctl[k], am = arms[i];
          if (c.mode === 'tuck') { am.rotation.y = -am.userData.a; am.rotation.z = c.rz; am.scale.x = c.sx; return; }
          var wp = armTarget(c); if (!wp) return;
          var tl = bodyG.worldToLocal(_w.copy(wp)), rt = restTip(i), kk = c.kq;
          var hk = kk <= 0.5 ? 0 : (kk - 0.5) / 0.5;
          _v.set(rt.x + (tl.x - rt.x) * kk, rt.y + (tl.y - rt.y) * hk, rt.z + (tl.z - rt.z) * kk);
          c.sx = solveArm(i, _v, (c.wig || 0) - (c.press || 0));
        });
      }
      function freeArms() { return arms.map(function (_, i) { return i; }).filter(function (i) { return !ctl[i]; }); }
      function pickArm(wp, avoid) {   /* 'auto': 목표 방향에 가장 가까운 노는 팔 */
        bodyG.updateMatrixWorld(true); var t = bodyG.worldToLocal(_v.copy(wp)), beta = Math.atan2(t.z, t.x), best = -1, bd = 9;
        freeArms().forEach(function (i) { if (avoid && avoid.indexOf(i) >= 0) return; var d = Math.abs(angDiff(arms[i].userData.a, beta)); if (d < bd) { bd = d; best = i; } });
        return best;
      }
      function gripPoint(p) {   /* 팔이 닿는 곳: 컵(탑) = 꼭대기 문어 쪽 가장자리 위 · 공 = 위쪽 · 바구니 = 테두리 */
        var base = p.kind === 'cup' ? towerBase(p) : p, w = place(base).clone();
        if (p.kind === 'cup') {
          w.y += snapUp(towerH(base)) + 0.03;
          var dx = oct.pos.x - w.x, dz = oct.pos.z - w.z, dl = Math.hypot(dx, dz) || 1; w.x += dx / dl * 0.07; w.z += dz / dl * 0.07;
        } else if (p.kind === 'ball') { w.y += BALL_R * 1.6; var ex = oct.pos.x - w.x, ez = oct.pos.z - w.z, el = Math.hypot(ex, ez) || 1; w.x += ex / el * 0.04; w.z += ez / el * 0.04; }
        else w.y += p.h + 0.03;
        return w;
      }
      function targetPoint(tg) {   /* 대상: 장난감 id | [x, z] (바닥 높이의 팔 끝) | [x, y, z] | Vector3 */
        if (typeof tg === 'string' && toys[tg]) return gripPoint(toys[tg]);
        if (tg && tg.isVector3) return tg.clone();
        if (tg && tg.length === 3) return new T.Vector3(tg[0], tg[1], tg[2]);
        if (tg && tg.length === 2) return new T.Vector3(tg[0], 0.09, tg[1]);
        return null;
      }
      function claim(i, tgt) { ctl[i] = ctl[i] || { k: 0, kq: 0, wig: 0, press: 0 }; ctl[i].mode = 'reach'; ctl[i].tgt = tgt; return ctl[i]; }
      function needAt(x, z, wp) {   /* 몸이 (x, z) 에 있을 때 wp 까지 팔 늘이기 어림 (뿌리 = 몸 중심에서 목표 쪽 0.25 m, 높이 0.126 m) */
        var dh = Math.max(0, Math.hypot(wp.x - x, wp.z - z) - 0.6 * OCT_R), dy = wp.y - 0.3 * OCT_R;
        return Math.hypot(dh, dy) / (0.82 * OCT_R);
      }
      function approach(wps, maxS) {   /* 팔이 안 닿으면(늘이기 > MAXS) 먼저 걷는다: 줄 방향(옆)으로 먼저, 그래도 모자라면 앞으로 — 대상 0.62 m 안으로는 안 들어간다 (눈이 컵에 가리지 않게) */
        if (!wps.length) return Promise.resolve(okR({ walked: 0 }));
        var lim = (maxS > MAXS ? Math.min(maxS, 4.6) : MAXS) * 0.95, x0 = oct.pos.x, z0 = oct.pos.z;
        function worst(x, z) { return Math.max.apply(null, wps.map(function (wp) { return needAt(x, z, wp); })); }
        if (worst(x0, z0) <= lim) return Promise.resolve(okR({ walked: 0 }));
        var cx = 0, cz = 0; wps.forEach(function (wp) { cx += wp.x / wps.length; cz += wp.z / wps.length; });
        var e = GRID.e, f = GRID.f, lat = (cx - x0) * e[0] + (cz - z0) * e[2], best = null;
        for (var s = 1; s <= 10 && !best; s++) { var x1 = x0 + e[0] * lat * s / 10, z1 = z0 + e[2] * lat * s / 10; if (worst(x1, z1) <= lim) best = [x1, z1]; }
        if (!best) {   /* 옆으로 다 가도 모자라면 앞으로 (가장 가까운 대상에서 0.62 m 까지) */
          var bx = x0 + e[0] * lat, bz = z0 + e[2] * lat;
          for (var d = 0.05; d <= 0.6 && !best; d += 0.05) { var x2 = bx + f[0] * d, z2 = bz + f[2] * d, near = Infinity; wps.forEach(function (wp) { near = Math.min(near, Math.hypot(wp.x - x2, wp.z - z2)); }); if (near < 0.62) break; if (worst(x2, z2) <= lim) best = [x2, z2]; }
          if (!best) best = [bx, bz];
        }
        var go = Math.hypot(best[0] - x0, best[1] - z0);
        if (go < 0.03) return Promise.resolve(okR({ walked: 0 }));
        return walkTo(best[0], best[1]).then(function () { return faceTo([cx, cz]); }).then(function () { return okR({ walked: +go.toFixed(2) }); });
      }

      /* reach(arm|'auto', target, k = 1, { poses, step, approach }) → { ok, arm, sx }. k = 0..1 (0.5 = 바닥을 기어 반까지, 1 = 닿기). 포즈 수 기본: 0 에서 출발 → 8·k, 0.5 이상에서 마무리 → 2 */
      function reach(arm, tg, k, o) {
        o = o || {}; k = k == null ? 1 : clamp(+k, 0, 1);
        var wp = targetPoint(tg); if (!wp) return Promise.resolve({ ok: false, reason: 'no-target' });
        var pre = o.approach === false || (typeof arm === 'number' && ctl[arm]) ? Promise.resolve() : approach([wp], o.maxS);
        return pre.then(function () {
          var wp2 = targetPoint(tg) || wp, i = typeof arm === 'number' ? arm : pickArm(wp2, o.avoid);
          if (i < 0 || !arms[i]) return { ok: false, reason: 'no-arm' };
          var c = claim(i, typeof tg === 'string' && toys[tg] ? function () { return gripPoint(toys[tg]); } : wp2), k0 = c.kq || 0; c.maxS = o.maxS > MAXS ? Math.min(+o.maxS, 4.6) : null;
          var n = st.reduced ? 1 : (o.poses || (k0 >= 0.49 ? 2 : Math.max(1, Math.round(Math.abs(k - k0) * 8)))), stp = o.step != null ? o.step * st.speed : per();
          c.k = k;
          return frames(n, st.reduced ? 0 : stp, function (f) { c.kq = k0 + (k - k0) * (f + 1) / n; }, 'arm' + i).then(function (r) { return r.cancelled ? r : okR({ arm: i, sx: +(c.sx || 0).toFixed(2), need: +needS(i, targetPoint(tg) || wp2).toFixed(2) }); });
        });
      }
      function retract(i, o) {   /* 2 포즈로 거둔 뒤 팔을 stepOct 에 돌려준다. 쥔 것이 있으면 그대로 따라온다 (놓기는 hold(id, null)) */
        o = o || {}; var c = ctl[i]; if (!c) return Promise.resolve(okR({ arm: i }));
        if (c.mode === 'tuck') { delete ctl[i]; return Promise.resolve(okR({ arm: i })); }
        var tw = armTarget(c); c.tgt = tw ? tw.clone() : null; c.wig = 0; c.press = 0;
        var k0 = c.kq, n = st.reduced ? 1 : (o.poses || 2);
        return frames(n, st.reduced ? 0 : per(), function (f) { c.kq = k0 * (1 - (f + 1) / n); }, 'arm' + i).then(function (r) {
          if (!r.cancelled && ctl[i] === c && !heldBy(i)) delete ctl[i];
          return r.cancelled ? r : okR({ arm: i });
        });
      }
      function heldBy(i) { var tag = 'arm:' + i; return order.filter(function (id) { return toys[id].attach === tag; })[0] || null; }
      function hesitate(i, sec, o) {   /* 멈춤: 팔 끝 1px 꿈틀(2칸마다) + 반쯤 감은 눈(calm), 끝나면 표정 되돌림 */
        o = o || {}; var c = ctl[i], prev = face.expr, n = 0;
        if (o.eyes !== false) setExpression(o.eyes || 'calm');
        return job(DK(sec == null ? 0.45 : sec), function (k, t) { if (c && !st.reduced) { var s = Math.floor(t / per()); if (s !== n) { n = s; c.wig = (s >> 1) & 1 ? 1 : 0; } } }, 'arm' + i)
          .then(function (r) { if (c) c.wig = 0; if (o.eyes !== false && face.expr === (o.eyes || 'calm')) setExpression(prev); return r.cancelled ? r : okR({ arm: i }); });
      }

      /* hold(id, arm | 'head' | null, { at:[x,z], on }) — 즉시 붙이기/놓기. 놓으면 그 자리 바닥(또는 on 컵 위)에 선다. 컵을 딴 데 놓으면 그 밑 공의 덮임이 풀린다 */
      function hold(id, to, o) {
        o = o || {}; var p = toys[id]; if (!p) return false;
        var w = place(p).clone();
        if (to == null) {
          var at = o.at || [w.x, w.z];
          if (p.attach === 'head') { p.hatTilt = 0; }
          p.attach = null; p.grip = null; p.lift = 0; p.inBasket = null; p.liftFrom = null;
          if (o.on && toys[o.on]) { p.on = o.on; } else { p.on = null; p.x = at[0]; p.z = at[1]; p.y = 0; }
          if (p.kind === 'cup') {   /* 그 컵 밑에 있던 공: 컵이 같은 자리에 돌아오면 다시 덮임(탑이면 탑 맨 아래가 덮개), 딴 데 놓이면 풀림 */
            var bs = towerBase(p);
            order.forEach(function (k) { var b = toys[k]; if (b.cover !== id) return; if (!p.on && Math.hypot(b.x - p.x, b.z - p.z) <= 0.12) b.cover = id; else if (p.on && Math.hypot(b.x - bs.x, b.z - bs.z) <= 0.12) b.cover = bs.id; else b.cover = null; });
          }
          PF++; return true;
        }
        p.inBasket = null; p.cover = null;   /* 집어 든 공은 더 이상 어느 컵 밑도 아니다 */
        if (to === 'head') { p.attach = 'head'; p.on = null; p.lift = 0; p.hatTilt = 8 * DEG; p.liftFrom = null; PF++; return true; }
        var i = +to; if (!arms[i]) return false;
        octG.updateMatrixWorld(true); arms[i].updateMatrixWorld(true);
        var tip = arms[i].localToWorld(_v.copy(TIP));
        if (p.on) { p.on = null; }   /* 탑 위 컵을 집으면 탑에서 떨어진다 */
        p.grip = tip.clone().sub(w.setY(w.y - liftY(p))); p.lift = 0; p.attach = 'arm:' + i;
        var c = ctl[i] || claim(i, tip.clone()); c.tgt = tip.clone(); c.k = c.kq = 1;
        PF++; return true;
      }
      function raise(id, o) {   /* 쥔 장난감을 몸 쪽으로 pull m · 위로 px 아트px (2포즈) — 컵을 다시 내려도 그 밑에 안 남게 */
        o = o || {}; var p = toys[id]; if (!p || !p.attach || p.attach.slice(0, 4) !== 'arm:') return Promise.resolve({ ok: false, reason: 'not-held' });
        var i = +p.attach.slice(4); if (!ctl[i]) return Promise.resolve({ ok: false, reason: 'no-arm' });
        var pull = o.pull == null ? 0.3 : o.pull, up = snapUp((o.px == null ? 8 : o.px) * pxUp());
        return moveHeld([i], 2, function (ii, k, t0) { var dx = oct.pos.x - t0.x, dz = oct.pos.z - t0.z, dl = Math.hypot(dx, dz) || 1; return new T.Vector3(t0.x + dx / dl * pull * k, t0.y + up * k, t0.z + dz / dl * pull * k); })
          .then(function (r) { return r.cancelled ? r : okR({ arm: i }); });
      }
      function press(i) {   /* 닿는 프레임: 빨판 1px 눌림 (한 칸) */
        var c = ctl[i]; if (!c || st.reduced) return Promise.resolve(okR());
        c.press = 1; return frames(1, per(), function () { }, 'arm' + i).then(function (r) { c.press = 0; return r; });
      }
      function grab(i, id) {   /* 이미 뻗은 팔(i)로 닿기(2포즈) → 눌림 → 쥐기 */
        var p = toys[id]; if (!p) return Promise.resolve({ ok: false, reason: 'gone' });
        var base = p.kind === 'cup' ? towerBase(p) : p;
        return reach(i, id, 1, { approach: false }).then(function (r) { if (!r.ok) return r; return press(i); }).then(function (r) {
          if (r && r.cancelled) return r;
          if (!toys[id]) return { ok: false, reason: 'gone' };
          hold(base.id, i); return okR({ arm: i, id: base.id });
        });
      }
      function moveHeld(list, n, fn) {   /* 쥔 팔들의 목표점을 n 포즈로 옮긴다: fn(arm, k) → Vector3 */
        var st0 = list.map(function (i) { return ctl[i] && armTarget(ctl[i]) ? armTarget(ctl[i]).clone() : null; });
        return frames(st.reduced ? 1 : n, st.reduced ? 0 : per(), function (f) {
          var k = (f + 1) / (st.reduced ? 1 : n);
          list.forEach(function (i, j) { if (ctl[i] && st0[j]) ctl[i].tgt = fn(i, k, st0[j]); });
        }, 'held');
      }
      /* lift(ids, { px: 8, stagger: 1 칸, stand: true, creep }) — 컵(탑이면 통째로) N 개를 팔 N 개로 동시에: 뻗기(어긋나게) → 눌림 → +3/+6/+8 px. → { ok, arms: {id: arm} } */
      function lift(ids, o) {
        o = o || {}; ids = [].concat(ids).filter(function (id) { return toys[id]; }).map(function (id) { var p = toys[id]; return p.kind === 'cup' ? towerBase(p).id : id; })
          .filter(function (id, i, a) { return a.indexOf(id) === i; });
        if (!ids.length) return Promise.resolve({ ok: false, reason: 'gone' });
        var used = [], map = {}, px = o.px == null ? 8 : o.px;
        ids.forEach(function (id) { var a0 = toys[id].attach; if (a0 && a0.slice(0, 4) === 'arm:') { map[id] = +a0.slice(4); used.push(map[id]); } });   /* 이미 쥔 컵(grab 뒤)은 그 팔 그대로 */
        var fresh = ids.filter(function (id) { return map[id] == null; });
        return approach(fresh.map(function (id) { return gripPoint(toys[towerTop(toys[id]).id]); })).then(function () {
          return Promise.all(fresh.map(function (id, j) {
            var top = towerTop(toys[id]).id, i = pickArm(gripPoint(toys[top]), used); used.push(i); map[id] = i;
            if (i < 0) return Promise.resolve({ ok: false, reason: 'no-arm' });
            return (j && !st.reduced ? wait((o.stagger == null ? 1 : o.stagger) * F12) : Promise.resolve()).then(function () { return reach(i, top, 1, { approach: false, poses: o.creep }); })
              .then(function (r) { return r.ok ? press(i) : r; }).then(function (r) { if (r && r.ok !== false) hold(id, i); return r; });
          }));
        }).then(function (rs) {
          if (rs.some(function (r) { return r && r.cancelled; })) return { ok: false, cancelled: true };
          var list = ids.map(function (id) { return map[id]; }).filter(function (i) { return i >= 0; });
          if (o.stand !== false) setPose('stand', { sy: 1.14 });   /* 2 아트px 서서 눈이 든 컵 위로 */
          var steps = px >= 8 ? [3, 6, px] : px >= 4 ? [Math.round(px / 2), px] : [px], up = pxUp(), side = {};
          ids.forEach(function (id) { side[map[id]] = asideOf(id, o.aside); var p = toys[id]; if (!p.liftFrom) p.liftFrom = [p.x, p.z]; });
          spread(ids, map, side);
          return moveHeld(list, steps.length, function (i, k, t0) {
            var n = Math.min(steps.length - 1, Math.round(k * steps.length) - 1), s = steps[n], a = side[i] * (steps.length > 1 ? n / (steps.length - 1) : 1);
            return new T.Vector3(t0.x + GRID.e[0] * a, t0.y + snapUp(s * up), t0.z + GRID.e[2] * a);
          })
            .then(function (r) { return r.cancelled ? r : okR({ arms: map, px: px }); });
        });
      }
      function spread(ids, map, side) {   /* 여러 컵을 같이 들면 줄 방향으로 서로 0.46 m 이상 (든 채 서로 닿지 않게): 가운데서 먼 쪽을 바깥으로 민다 */
        if (ids.length < 2) return;
        var e = GRID.e, cx = oct.pos.x, cz = oct.pos.z;
        var L = ids.map(function (id) { var p = toys[id]; return { i: map[id], u: (p.x - cx) * e[0] + (p.z - cz) * e[2] + (side[map[id]] || 0) }; }).sort(function (a, b) { return a.u - b.u; });
        var mid = L.reduce(function (m, a, k) { return Math.abs(a.u) < Math.abs(L[m].u) ? k : m; }, 0);
        for (var k = mid + 1; k < L.length; k++) if (L[k].u - L[k - 1].u < 0.46) { var d = 0.46 - (L[k].u - L[k - 1].u); L[k].u += d; side[L[k].i] = (side[L[k].i] || 0) + d; }
        for (k = mid - 1; k >= 0; k--) if (L[k + 1].u - L[k].u < 0.46) { var d2 = 0.46 - (L[k + 1].u - L[k].u); L[k].u -= d2; side[L[k].i] = (side[L[k].i] || 0) - d2; }
      }
      function asideOf(id, opt) {   /* 든 컵은 줄 방향으로 비켜 든다 → 밑의 공이 다 보이고 눈이 안 가린다. 문어 눈앞(0.3 m 안)이면 0.26 m(탑은 층마다 +0.12, 쪽 = 다른 컵이 더 먼 쪽), 아니면 바깥으로 0.18 m. opt: 'auto'(기본) | 0 | 부호 있는 m */
        if (opt === 0 || opt === false) return 0;
        if (typeof opt === 'number') return opt;
        var p = toys[id], e = GRID.e, rel = (p.x - oct.pos.x) * e[0] + (p.z - oct.pos.z) * e[2];
        if (Math.abs(rel) >= 0.3) return (rel > 0 ? 1 : -1) * 0.18;   /* 눈앞이 아니어도 바깥쪽으로 조금: 8px 만 곧게 들면 공이 거의 안 보인다 */
        function room(sg) { var m = Infinity, x = p.x + e[0] * sg * 0.26, z = p.z + e[2] * sg * 0.26; order.forEach(function (k) { var q = toys[k]; if (k === id || q.kind !== 'cup' || q.on) return; m = Math.min(m, Math.hypot(q.x - x, q.z - z)); }); return m; }
        var sg = Math.abs(rel) > 0.05 ? (rel > 0 ? 1 : -1) : (room(1) >= room(-1) ? 1 : -1), lv = Math.round(towerH(p) / CUP.h);
        return sg * (0.26 + 0.12 * Math.max(0, lv - 1));   /* 탑(2층)은 더 비켜 든다 */
      }
      /* lower(ids | 'all', { to: {id: [x,z]}, on: {id: baseId}, retract: true }) — 쥔 컵·공을 (옮겨서) 내려놓기: 옮기기 3포즈 → 내리기 1 → 놓기 → 눌림 1 → 팔 거두기 2 */
      function lower(ids, o) {
        o = o || {}; var all = ids === 'all' || ids == null;
        var list = (all ? order : [].concat(ids)).filter(function (id) { var p = toys[id]; return p && p.attach && p.attach.slice(0, 4) === 'arm:'; });
        if (!list.length) return Promise.resolve(okR({ lowered: [] }));
        var armOf = {}; list.forEach(function (id) { armOf[id] = +toys[id].attach.slice(4); });
        var arms2 = list.map(function (id) { return armOf[id]; }), to = o.to || {}, onTo = o.on || {};
        function dest(id) { var p = toys[id], w = place(p); if (onTo[id] && toys[onTo[id]]) { var b = place(towerTop(toys[onTo[id]])); return [b.x, b.z]; } return to[id] || p.liftFrom || [w.x, w.z]; }   /* 기본 = 든 자리 */
        var D0 = {};
        list.forEach(function (id) { D0[id] = dest(id); });
        var moving = list.some(function (id) { var w = place(toys[id]); return onTo[id] || Math.hypot(D0[id][0] - w.x, D0[id][1] - w.z) > 0.01; });
        var carry = moving ? moveHeld(arms2, 3, function (i, k, t0) { var id = list[arms2.indexOf(i)], d = D0[id], p = toys[id], tx = d[0] + p.grip.x, tz = d[1] + p.grip.z; return new T.Vector3(t0.x + (tx - t0.x) * k, t0.y + (onTo[id] && toys[onTo[id]] ? snapUp(towerH(towerBase(toys[onTo[id]]))) * k : 0), t0.z + (tz - t0.z) * k); }) : Promise.resolve(okR());
        return carry.then(function (r) {
          if (r.cancelled) return r;
          return moveHeld(arms2, 1, function (i, k, t0) { var id = list[arms2.indexOf(i)], p = toys[id], baseY = onTo[id] && toys[onTo[id]] ? place(towerTop(toys[onTo[id]])).y + snapUp(towerTop(toys[onTo[id]]).h) : 0; return t0.clone().setY(baseY + p.grip.y); });
        }).then(function (r) {
          if (r.cancelled) return r;
          var tops = {}; list.forEach(function (id) { if (onTo[id] && toys[onTo[id]]) tops[id] = towerTop(toys[onTo[id]]).id; });
          list.forEach(function (id) { var d = D0[id]; toys[id].liftFrom = null; hold(id, null, { at: d, on: tops[id] }); if (!st.reduced) toys[id].sy = toys[id].kind === 'cup' ? 1 - pxUp() / CUP.h : 1; });
          clearPose('stand');
          return frames(1, st.reduced ? 0 : per(), function () { }, 'land').then(function () { list.forEach(function (id) { if (toys[id]) toys[id].sy = 1; }); });
        }).then(function (r) {
          if (r && r.cancelled) return r;
          if (o.retract === false) return okR({ lowered: list });
          return Promise.all(arms2.map(function (i) { return retract(i); })).then(function () { return okR({ lowered: list }); });
        });
      }

      /* ── 굴리기 (바닥 '물리' 대신 칸 스냅 + 계단식): roll(id, to | [[x,z]...], { perCell: 83 ms / 0.3 m, bounce }) ── */
      function roll(id, to, o) {
        o = o || {}; var p = toys[id]; if (!p) return Promise.resolve({ ok: false, reason: 'gone' });
        cancel('roll:' + id);   /* 굴러가는 중에 또 밀면 앞 굴림을 끝낸다 (두 굴림이 한 프레임에 겹치지 않게) */
        if (p.attach) hold(id, null); p.cover = null; p.on = null; p.inBasket = null; p.y = 0;
        var pts = [[p.x, p.z]].concat(to && to.length && to[0].length ? to : [to]), L = 0, seg = [];
        for (var i = 1; i < pts.length; i++) { var d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
        if (L < 1e-3) return Promise.resolve(okR({ dist: 0 }));
        var dur = st.reduced ? 0 : Math.max(per(), L / GRID.du * (o.perCell || 0.083) * st.speed), n = Math.max(1, Math.round(dur / per())), done = 0;
        function at(k) { var s = k * L; for (var j = 0; j < seg.length; j++) { if (s <= seg[j] || j === seg.length - 1) { var t = seg[j] ? Math.min(1, s / seg[j]) : 1; return [pts[j][0] + (pts[j + 1][0] - pts[j][0]) * t, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * t]; } s -= seg[j]; } return pts[pts.length - 1]; }
        return frames(st.reduced ? 1 : n, st.reduced ? 0 : per(), function (f) {
          var k = (f + 1) / (st.reduced ? 1 : n), q = at(k), dx = q[0] - p.x, dz = q[1] - p.z, dd = Math.hypot(dx, dz);
          if (dd > 1e-4) { _q.setFromAxisAngle(_ax2.set(dz / dd, 0, -dx / dd), dd / BALL_R); p.q.premultiply(_q); }
          p.x = q[0]; p.z = q[1]; done = k;
        }, 'roll:' + id).then(function (r) {
          if (r.cancelled || o.bounce === false || st.reduced) return r.cancelled ? r : okR({ dist: +L.toFixed(2) });
          p.lift = 1; return frames(1, per(), function () { }, 'roll:' + id).then(function () { p.lift = 0; return okR({ dist: +L.toFixed(2) }); });
        });
      }
      /* 충돌 대신 길 고르기 (물리 없음 · 칸 스냅): blocked(from, to, r) → 처음 걸리는 바닥 컵 { id, stop:[x,z] (그 컵 발치) } | null.
         route(from, to) → 막히면 줄의 빈 틈(컵 사이 홀수 칸 · 비어 있는 칸)을 하나 거쳐 가는 길 [[x,z]...], 아니면 [to] */
      function floorCups(skip) { return order.map(function (k) { return toys[k]; }).filter(function (q) { return q.kind === 'cup' && !q.on && !q.attach && q.vis && q.id !== skip; }); }
      function blocked(from, to, r, skip) {
        r = r == null ? BALL_R : r; var dx = to[0] - from[0], dz = to[1] - from[1], L2 = dx * dx + dz * dz, best = null;
        if (L2 < 1e-6) return null;
        floorCups(skip).forEach(function (q) {
          var t = clamp(((q.x - from[0]) * dx + (q.z - from[1]) * dz) / L2, 0, 1), px = from[0] + dx * t, pz = from[1] + dz * t, d = Math.hypot(q.x - px, q.z - pz), rr = CUP.r0 + r;
          if (d >= rr || (Math.hypot(q.x - from[0], q.z - from[1]) < rr && t < 0.05)) return;
          var back = Math.sqrt(Math.max(0, rr * rr - d * d)) / Math.sqrt(L2), ts = Math.max(0, t - back - 0.01);
          if (!best || ts < best.t) best = { id: q.id, t: ts, stop: [from[0] + dx * ts, from[1] + dz * ts] };
        });
        return best ? { id: best.id, stop: best.stop } : null;
      }
      function route(from, to, r) {
        if (!blocked(from, to, r)) return [to];
        var f = GRID.f, best = null;
        for (var u = 0; u <= 8; u++) {
          var g = cell(u, 1), bk = [g[0] - f[0] * 0.3, g[1] - f[2] * 0.3], fr = [g[0] + f[0] * 0.3, g[1] + f[2] * 0.3];
          [[g], [bk, fr], [fr, bk]].forEach(function (wps) {   /* 틈 한 점, 또는 줄을 곧게 건너는 두 점 (대각선으로 틈에 들어가면 옆 컵을 스친다) */
            var pts = [from].concat(wps, [to]), len = 0;
            for (var i = 0; i < pts.length - 1; i++) { if (blocked(pts[i], pts[i + 1], r)) return; len += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); }
            if (!best || len < best.len) best = { path: wps.concat([to]), len: len };
          });
        }
        return best ? best.path : [to];
      }
      /* nudge(ballId, to, { arm:'auto', quick }) — 팔로 공을 밀어 보낸다 (받아치기 = quick: 2포즈, 25° 휙). 공 쪽으로 뻗기 → 굴리기 → 거두기 */
      function nudge(id, to, o) {
        o = o || {}; var p = toys[id]; if (!p) return Promise.resolve({ ok: false, reason: 'gone' });
        var path = to && to.length && to[0].length ? to : (o.route === false ? [to] : route([p.x, p.z], to)), first = path[0];   /* 기본: 컵을 피해 틈으로 */
        var w = place(p), back = new T.Vector3(w.x, BALL_R, w.z), dx = first[0] - w.x, dz = first[1] - w.z, dl = Math.hypot(dx, dz) || 1;
        back.x -= dx / dl * 0.1; back.z -= dz / dl * 0.1;   /* 공 뒤쪽 */
        var arm0 = null;
        return reach(o.arm == null ? 'auto' : o.arm, back, 1, { poses: o.poses || (o.quick ? 2 : undefined), approach: o.approach, maxS: o.maxS }).then(function (r) {
          if (!r.ok) return r; arm0 = r.arm;
          var c = ctl[arm0], t0 = armTarget(c).clone();
          c.tgt = new T.Vector3(t0.x + dx / dl * 0.18, t0.y, t0.z + dz / dl * 0.18);   /* 휙: 팔 끝이 공을 지나 한 칸 */
          return roll(id, path, o);
        }).then(function (r) { if (arm0 == null) return r; return retract(arm0).then(function () { return r.ok === false ? r : okR({ arm: arm0, dist: r.dist }); }); });
      }
      /* cupHop(cupId, x, z, { hide: ballId, px: 4 }) — 컵이 스스로 폴짝 (우연한 숨기기 · 사람이 끌어 놓을 때): 2→4px 들림 → 2칸 이동 → 내려앉음 + 1px 눌림. hide 면 그 공이 컵 밑으로 */
      function cupHop(id, x, z, o) {
        o = o || {}; var p = toys[id]; if (!p) return Promise.resolve({ ok: false, reason: 'gone' });
        var x0 = p.x, z0 = p.z, hpx = o.px || 4, ball = o.hide && toys[o.hide];
        if (st.reduced) { p.x = x; p.z = z; if (ball) { ball.x = x; ball.z = z; ball.cover = id; ball.attach = null; ball.inBasket = null; } return Promise.resolve(okR()); }
        var seq = [[Math.round(hpx / 2), 0], [hpx, 0.5], [hpx, 1], [0, 1]];
        return frames(seq.length, per(), function (f) {
          p.lift = seq[f][0]; p.x = x0 + (x - x0) * seq[f][1]; p.z = z0 + (z - z0) * seq[f][1];
          if (f === 2 && ball) { ball.x = x; ball.z = z; ball.y = 0; ball.attach = null; ball.inBasket = null; ball.cover = id; }
          if (f === 3) p.sy = 1 - pxUp() / CUP.h;
        }, 'hop:' + id).then(function (r) {
          p.sy = 1;
          if (r.cancelled && toys[id]) { p.lift = 0; p.x = x; p.z = z; if (ball && toys[o.hide] && !ball.attach) { ball.x = x; ball.z = z; ball.y = 0; ball.inBasket = null; ball.cover = id; } PF++; }   /* 끊겨도 숨기기는 끝낸다 (보이는 것 = 상태) */
          return r.cancelled ? r : okR();
        });
      }
      /* slide(cupId, x, z, { arm }) — 팔로 컵을 바닥에서 민다 (덮인 공도 같이). 뻗기 → 3포즈 밀기 → 거두기 */
      function slide(id, x, z, o) {
        o = o || {}; var p = toys[id]; if (!p) return Promise.resolve({ ok: false, reason: 'gone' });
        var base = towerBase(p), w = place(base), dx = x - w.x, dz = z - w.z, dl = Math.hypot(dx, dz) || 1, side = new T.Vector3(w.x - dx / dl * 0.2, 0.12, w.z - dz / dl * 0.2), arm0 = null, x0 = base.x, z0 = base.z;
        return reach(o.arm == null ? 'auto' : o.arm, side, 1, {}).then(function (r) {
          if (!r.ok) return r; arm0 = r.arm; var c = ctl[arm0], t0 = armTarget(c).clone();
          return frames(st.reduced ? 1 : (o.poses || 3), st.reduced ? 0 : per(), function (f) {
            var k = (f + 1) / (st.reduced ? 1 : (o.poses || 3)); base.x = x0 + (x - x0) * k; base.z = z0 + (z - z0) * k; c.tgt = new T.Vector3(t0.x + (x - x0) * k, t0.y, t0.z + (z - z0) * k);
          }, 'slide:' + id);
        }).then(function (r) {
          if (r && !r.cancelled && o.hide && toys[o.hide]) { var b = toys[o.hide]; b.cover = base.id; b.x = base.x; b.z = base.z; b.attach = null; b.inBasket = null; }   /* 문어가 공을 덮어 둠 (cover_ball) */
          if (arm0 == null) return r; return retract(arm0).then(function () { return r.cancelled ? r : okR({ arm: arm0 }); });
        });
      }

      /* peekCup(cupId, { px: 10, tipDeg: 23, hold: 0.6 }) — 사람이 컵을 들춰 보기 (로컬, 팔 없음): 3/6/10 px 들며 입구를 보는 쪽으로 기울임 → 버팀 → 5/0 + 눌림. 모션 감소면 든 자세로 버팀 */
      function peekCup(id, o) {
        o = o || {}; var p = toys[id]; if (!p) return Promise.resolve({ ok: false, reason: 'gone' });
        var base = towerBase(p), px = o.px || 10, tp = towerTop(base) !== base ? 0 : -(o.tipDeg == null ? 23 : o.tipDeg) * DEG;   /* 탑은 기울이지 않는다 (위 컵이 따로 논다) */
        var up = st.reduced ? [[px, 1]] : [[3, 0.4], [6, 0.75], [px, 1]], down = st.reduced ? [[0, 0]] : [[Math.round(px / 2), 0.4], [0, 0]];
        return frames(up.length, st.reduced ? 0 : per(), function (f) { base.lift = up[f][0]; base.tip = tp * up[f][1]; }, 'peek:' + base.id)
          .then(function (r) { return r.cancelled ? r : wait(o.hold == null ? 0.6 : o.hold); })
          .then(function (r) { return r.cancelled ? r : frames(down.length, st.reduced ? 0 : per(), function (f) { base.lift = down[f][0]; base.tip = tp * down[f][1]; if (f === down.length - 1 && !st.reduced) base.sy = 1 - pxUp() / CUP.h; }, 'peek:' + base.id); })
          .then(function (r) { base.sy = 1; base.lift = 0; base.tip = 0; return r.cancelled ? r : okR({ cup: base.id }); });
      }
      function bob(id, px) {   /* 공 통: 1 칸 들렸다 내려옴 (처음 만지기 전 1.6 s 마다 같은 것) */
        var p = toys[id]; if (!p || st.reduced || p.attach) return Promise.resolve(okR());
        return frames(2, per(), function (f) { p.lift = f ? 0 : (px || 1); }, 'bob:' + id).then(function (r) { p.lift = 0; return r; });
      }

      /* ── 몸 ── */
      function setPose(name, o) { if (o) poses[name] = o; else delete poses[name]; }
      function clearPose(name) { delete poses[name]; }
      function poseSteps(name, list, step) {   /* 포즈 프레임들 (12 fps). 모션 감소면 마지막만 */
        if (st.reduced) { setPose(name, list[list.length - 1]); return Promise.resolve(okR()); }
        return frames(list.length, step != null ? step * st.speed : per(), function (f) { setPose(name, list[f]); }, 'pose:' + name);
      }
      function applyPoses() {
        var sx = 1, sy = 1, dy = 0, lean = 0, tilt = 0, hid = false, n = 0;
        Object.keys(poses).forEach(function (k) { var o = poses[k]; n++; sx *= o.sx || 1; sy *= o.sy || 1; dy += o.dyPx || 0; lean += o.lean || 0; tilt += o.tilt || 0; hid = hid || !!o.hidden; });
        if (n) {
          bodyG.scale.x *= sx; bodyG.scale.y *= sy; bodyG.scale.z *= sx;
          bodyG.position.y += Math.round(dy) * pxUp() / OCT_R; bodyG.rotation.x += lean; bodyG.rotation.z += tilt;
        }
        octG.visible = !hid && st.octState !== 'away'; octDecal.scale.setScalar(Math.min(1, sx));
      }
      var walkRes = null;   /* walkPoint 는 끊긴 걸음의 Promise 를 안 푼다 (moveTo 와 같은 동작, 본 게임 그대로) → kit 은 감싸서 끊기면 { cancelled } 로 푼다 */
      function stopWalk() { if (oct.walking) { oct.walking.cancel(); oct.walking = null; } if (walkRes) { var r0 = walkRes; walkRes = null; r0({ ok: false, cancelled: true }); } }
      function walkTo(x, z) {
        if (walkRes) { var r0 = walkRes; walkRes = null; r0({ ok: false, cancelled: true }); }
        return new Promise(function (res) {
          walkRes = res;
          walkPoint(new T.Vector3(x, 0, z), function () { }, null).then(function () { if (walkRes === res) { walkRes = null; res(okR({ at: [x, z] })); } });
        });
      }
      function jumpTo(x, z) { stopWalk(); oct.pos.set(x, 0, z); snapScreen(octG.position.copy(oct.pos)); gaitReset(); }
      function yawTo(tg) {
        if (tg === 'camera') return camYaw();
        var q = typeof tg === 'string' && toys[tg] ? place(toys[tg]) : tg && tg.length ? { x: tg[0], z: tg[tg.length - 1] } : tg;
        if (!q) return oct.wantYaw;
        var dx = q.x - oct.pos.x, dz = q.z - oct.pos.z; return Math.hypot(dx, dz) < 1e-3 ? oct.wantYaw : Math.atan2(dx, dz);
      }
      function faceTo(tg, o) {   /* 몸을 돌린다 (stepOct 의 지수 접근 그대로) → 다 돌면 resolve. face(id | 'camera' | [x,z] | x, z, o?). offsetDeg: 거기서 더 돌기 (거절 30°) */
        if (typeof tg === 'number') { tg = [tg, +o]; o = arguments[2]; }
        o = o || {}; oct.wantYaw = yawTo(tg) + (o.offsetDeg || 0) * DEG;
        return job(DK(0.8), function () { return Math.abs(angDiff(oct.wantYaw, oct.faceYaw)) < 0.06; }, 'face').then(function (r) { return r.cancelled ? r : okR({ yaw: +(oct.faceYaw / DEG).toFixed(1) }); });
      }
      function eyePoint() {   /* 눈 목표 → 클라이언트 CSS px (stepOct 이 동공·curious 기울임에 쓴다) */
        var lk = P.look; if (lk == null) return null;
        var r = canvas.getBoundingClientRect();
        if (lk === 'camera') { var sp = octScreen(); return { x: r.left + sp.x - S.offX, y: r.top + sp.y - S.offY + 30 }; }
        var w = typeof lk === 'string' && toys[lk] ? place(toys[lk]).clone().setY(place(toys[lk]).y + toys[lk].h * 0.5) : lk.length === 3 ? _v.set(lk[0], lk[1], lk[2]) : lk.length === 2 ? _v.set(lk[0], 0.1, lk[1]) : (lk.x != null && lk.z == null ? null : _v.set(lk.x, lk.y || 0, lk.z));
        if (!w) return { x: lk.x, y: lk.y };
        w = w.clone().project(camera);
        return { x: r.left + (w.x * 0.5 + 0.5) * r.width, y: r.top + (1 - (w.y * 0.5 + 0.5)) * r.height };
      }
      function look(tg) { P.look = tg == null ? null : tg; P.eye = eyePoint(); if (tg === 'camera') oct.wantYaw = camYaw(); return P.eye; }
      function scan(list, each) {   /* 눈이 차례로 (좌우 훑기) */
        list = [].concat(list); var i = 0;
        return frames(list.length, DK(each == null ? 0.25 : each), function (f) { look(list[f]); i = f; }, 'scan').then(function (r) { return r.cancelled ? r : okR({ n: i + 1 }); });
      }
      function joy() { setExpression('happy'); return wait(st.reduced ? 0.3 : 0.9); }   /* found_joy: happy 표정이 폴짝 2번 (모션 감소면 폴짝 없음) */
      /* 위장: tint(hex|null, steps) — octColor 만 바꾼다 (외곽선·눈 흰자·하이라이트는 남아 들킬 틈). camouflage('floor' | hex | toyId | null, { amount .85, steps 3 }) 120 ms 칸 */
      function tint(to, o) {
        if (typeof o === 'number') o = { steps: o };
        o = o || {}; var from = P.tint || st.color, n = st.reduced ? 2 : (o.steps || (to ? 3 : 2)), amt = o.amount == null ? 0.85 : o.amount;
        var goal = to ? mixHex(st.color, to, amt) : st.color;
        return frames(n, DK(o.step || 0.12), function (f) { var k = (f + 1) / n; P.tint = k >= 1 && !to ? null : mixHex(from, goal, k); }, 'tint').then(function (r) { return r.cancelled ? r : okR({ tint: P.tint }); });
      }
      function camouflage(tg, o) { var hex = tg == null ? null : tg === 'floor' ? MAT.floorB : toys[tg] ? toys[tg].color : colorOf(tg, MAT.floorB); return tint(hex, o); }
      function tuck(on) {   /* 거절: 팔 8개를 몸 밑으로 오므린다 (2포즈) + 몸 6 % 낮게 */
        if (!on) { clearPose('tuck'); arms.forEach(function (_, i) { if (ctl[i] && ctl[i].mode === 'tuck') delete ctl[i]; }); return Promise.resolve(okR()); }
        var list = freeArms();
        list.forEach(function (i) { ctl[i] = { mode: 'tuck', rz: 0.05, sx: 1, k: 0, kq: 0 }; });
        return frames(st.reduced ? 1 : 2, st.reduced ? 0 : per(), function (f) {
          var k = (f + 1) / (st.reduced ? 1 : 2); list.forEach(function (i) { if (ctl[i] && ctl[i].mode === 'tuck') { ctl[i].rz = 0.05 + 0.1 * k; ctl[i].sx = 1 - 0.38 * k; } }); setPose('tuck', { sy: 1 - 0.06 * k, sx: 1 + 0.02 * k });
        }, 'tuck').then(function (r) { return r.cancelled ? r : okR({ arms: list.length }); });
      }

      /* ── 컵 속 (squeeze_in · hide_peek): 컵 하나를 들고 → 몸을 3포즈로 구겨 컵 자리로 → 컵이 덮임 → 몸 숨김 (+ 팔 끝 하나 밖) ── */
      function squeezeInto(id, o) {
        o = o || {}; var p = toys[id]; if (!p || p.kind !== 'cup') return Promise.resolve({ ok: false, reason: 'gone' });
        var base = towerBase(p), w0 = place(base).clone(), dx = oct.pos.x - w0.x, dz = oct.pos.z - w0.z, dl = Math.hypot(dx, dz) || 1, armI = -1;
        var pre = dl > 0.75 ? walkTo(w0.x + dx / dl * 0.7, w0.z + dz / dl * 0.7).then(function () { return faceTo(base.id); }) : faceTo(base.id);
        return pre.then(function () { return lift([base.id], { px: o.px || 14, stand: false, aside: 0 }); }).then(function (r) {
          if (!r.ok) return r; armI = r.arms[base.id];
          /* 컵을 그 높이에 띄워 두고(놓는 순간 팔은 돌아간다) 몸이 그 밑으로: 들고 있으면 팔이 몸 쪽으로 접혀 컵을 끌어당기므로 */
          var hp = Math.max(0, Math.round((place(base).y) / pxUp()));
          base.attach = null; base.grip = null; base.liftFrom = null; base.x = w0.x; base.z = w0.z; base.lift = hp; if (armI >= 0) delete ctl[armI];
          var sx0 = oct.pos.x, sz0 = oct.pos.z, steps = st.reduced ? [{ sx: 0.7, sy: 0.5 }, { sx: 0.45, sy: 0.35 }] : [{ sx: 1, sy: 1 }, { sx: 1.15, sy: 0.7 }, { sx: 0.7, sy: 0.5 }, { sx: 0.45, sy: 0.35 }];
          return frames(steps.length, st.reduced ? 0 : per(), function (f) {
            setPose('squeeze', steps[f]); var k = (f + 1) / steps.length; oct.pos.set(sx0 + (w0.x - sx0) * k, 0, sz0 + (w0.z - sz0) * k);
          }, 'squeeze');
        }).then(function (r) {
          if (r.cancelled || r.ok === false) return r;
          setPose('hide', { hidden: true }); P.hidden = base.id; clearPose('stand');
          base.lift = 0; PF++;
          if (!st.reduced) base.sy = 1 - pxUp() / CUP.h;   /* 컵은 1px 눌려 내려앉은 채 */
          return o.tip === false ? okR({ cup: base.id }) : tipOut(base.id, o.tip || 'front').then(function () { return okR({ cup: base.id }); });
        });
      }
      /* popOut({ cup, to:[x,z], happy }) — 컵이 튀어 오르고 몸이 퐁(.4 → 1.04 → 1). cup 을 주면 그 컵에서 나온다 (다른 컵이면 몸이 거기로 옮겨 가 있다) */
      function popOut(o) {
        o = o || {}; var from = o.cup && toys[o.cup] ? towerBase(toys[o.cup]) : toys[P.hidden]; if (!from) return Promise.resolve({ ok: false, reason: 'not-hidden' });
        var w = place(from).clone(), to = o.to || null;
        if (toys[P.hidden]) toys[P.hidden].sy = 1;   /* 숨었던 컵의 1px 눌림도 푼다 (다른 컵에서 나오는 경우) */
        tipIn(); P.hidden = null; from.sy = 1;
        oct.pos.set(w.x, 0, w.z); snapScreen(octG.position.copy(oct.pos));
        /* 퐁: 컵 위로 튐(10→14→6→0 px) · 몸 배율 .4 → 1.04 → 1 · 동시에 컵 뒤(문어 자리 쪽) 0.85 m 로 폴짝 (작업칸 거리: 눈이 컵에 안 가린다) */
        var home = cell(4, 3), bx = home[0] - w.x, bz = home[1] - w.z, bl = Math.hypot(bx, bz) || 1, out = [w.x + bx / bl * Math.min(0.85, bl), w.z + bz / bl * Math.min(0.85, bl)];
        var seq = st.reduced ? [[0, 1, 1, 0]] : [[10, 0.4, 0, 2], [14, 1.04, 0.5, 6], [6, 1, 1, 3], [0, 1, 1, 0]];
        clearPose('hide'); clearPose('squeeze');
        return frames(seq.length, st.reduced ? 0 : per(), function (f) {
          var s = seq[f]; from.lift = s[0]; setPose('pop', { sx: s[1], sy: s[1], dyPx: s[3] });
          oct.pos.set(w.x + (out[0] - w.x) * s[2], 0, w.z + (out[1] - w.z) * s[2]);
          if (f === 0 && o.happy !== false) setExpression('happy');
          if (f === seq.length - 1 && !st.reduced) from.sy = 1 - pxUp() / CUP.h;
        }, 'pop').then(function (r) {
          clearPose('pop'); from.lift = 0; from.sy = 1;
          if (r.cancelled) return r;
          if (to) return walkTo(to[0], to[1]).then(function () { return okR({ cup: from.id }); });
          return okR({ cup: from.id, at: out });
        });
      }
      /* 팔 끝 하나 (다리 기하를 공유 → 몸색·위장을 따른다): 컵 테두리 밑으로. side = 'front' | 'left' | 'right' | 'back' | 각도(°, 0 = 앞, 90 = 오른쪽) */
      function sideDir(side) {
        var deg = typeof side === 'number' ? side : { front: 0, right: 90, back: 180, left: 270 }[side] || 0, a = deg * DEG;
        return [GRID.f[0] * Math.cos(a) + GRID.e[0] * Math.sin(a), GRID.f[2] * Math.cos(a) + GRID.e[2] * Math.sin(a)];
      }
      function tipMesh() {
        if (P.tipM) return P.tipM;
        var m = new T.Mesh(arms[0].geometry, toon); m.castShadow = false; m.receiveShadow = true; m.visible = false; m.scale.set(OCT_R, OCT_R * 0.8, OCT_R * 0.8); atticG.add(m);
        return (P.tipM = m);
      }
      function tipOut(id, side) {
        var p = toys[id]; if (!p) return Promise.resolve({ ok: false, reason: 'gone' });
        var m = tipMesh(), d = sideDir(side == null ? 'front' : side);
        P.tip = { cup: id, side: side == null ? 'front' : side, d: d, poke: false, n: 0, k: 0 };
        m.rotation.set(0, -Math.atan2(d[1], d[0]), 0.05);
        return frames(st.reduced ? 1 : 2, st.reduced ? 0 : per(), function (f) { P.tip.k = (f + 1) / (st.reduced ? 1 : 2); }, 'tip').then(function (r) { return r.cancelled ? r : okR({ cup: id, side: P.tip && P.tip.side }); });
      }
      function tipIn() { if (P.tip) P.tip = null; if (P.tipM) P.tipM.visible = false; return Promise.resolve(okR()); }
      function tipPoke(on) { if (P.tip) P.tip.poke = !!on; }
      function layoutTip() {
        var tp = P.tip, m = P.tipM; if (!m) return;
        if (!tp || !toys[tp.cup]) { m.visible = false; return; }
        var w = place(towerBase(toys[tp.cup])), reachOut = 0.07 + 0.09 * tp.k;   /* 테두리(.17) 밖으로 나온 길이 */
        m.position.set(w.x + tp.d[0] * (0.17 + reachOut - 0.82 * OCT_R), 0.09, w.z + tp.d[1] * (0.17 + reachOut - 0.82 * OCT_R)); snapScreen(m.position); m.position.y = 0.09;
        tp.n++; m.rotation.z = 0.05 + (tp.poke && !st.reduced && ((Math.floor(tp.n / 3)) & 1) ? Math.asin(clamp(pxUp() / (0.82 * OCT_R), 0, 1)) : 0);
        m.visible = true;
      }
      function tipScreen() {
        var tp = P.tip, m = P.tipM; if (!tp || !m || !m.visible) return null;
        m.updateMatrixWorld(true); var v = m.localToWorld(_v.copy(TIP)).project(camera), r = canvas.getBoundingClientRect();
        return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (1 - (v.y * 0.5 + 0.5)) * r.height };
      }

      /* ── 모자 (wear_cup_as_hat): 쥔 컵(없으면 집어 들고) → 4포즈 호로 머리 위 → 'head' 에 붙임(8° 기울게) → 팔 거둠 ── */
      function wearHat(id) {
        var p = toys[id]; if (!p) return Promise.resolve({ ok: false, reason: 'gone' });
        var base = towerBase(p), pre = base.attach && base.attach.slice(0, 4) === 'arm:' ? Promise.resolve(okR({ arms: (function () { var o = {}; o[base.id] = +base.attach.slice(4); return o; })() })) : lift([base.id], { px: 8, stand: false, aside: asideOf(base.id) * 1.5 });   /* 모자는 더 옆에서 올린다 (올라가는 길에 눈을 안 가리게) */
        var armI = -1;
        return pre.then(function (r) {
          if (!r.ok) return r; armI = r.arms[base.id];
          bodyG.updateMatrixWorld(true); var head = bodyG.localToWorld(new T.Vector3(0, HEAD_Y + HEAD_SQ * 0.93, 0)), c = ctl[armI], t0 = armTarget(c).clone(), tEnd = head.clone().add(base.grip);
          /* 4 포즈 호: 옆에서 먼저 머리보다 높이 올리고(눈을 안 가리게) → 머리 위로 → 얹기 */
          var hi = tEnd.y + 0.15, path = st.reduced ? [[1, 1]] : [[0, 0.5], [0, 1], [0.5, 1], [1, 2]];
          return frames(path.length, st.reduced ? 0 : per(), function (f) {
            var hk = path[f][0], vy = path[f][1], y = vy <= 1 ? t0.y + (hi - t0.y) * vy : tEnd.y;
            c.tgt = new T.Vector3(t0.x + (tEnd.x - t0.x) * hk, st.reduced ? tEnd.y : y, t0.z + (tEnd.z - t0.z) * hk);
          }, 'hat');
        }).then(function (r) {
          if (r.cancelled || r.ok === false) return r;
          hold(base.id, 'head'); clearPose('stand');
          return retract(armI).then(function () { return okR({ cup: base.id }); });
        });
      }
      function takeOffHat(id, x, z) {   /* 머리 위 컵을 팔로 집어 (x, z) 에 내려놓기 */
        var p = toys[id]; if (!p || p.attach !== 'head') return Promise.resolve({ ok: false, reason: 'not-hat' });
        var w = place(p).clone(), i = pickArm(new T.Vector3(x, 0.3, z));
        if (i < 0) { hold(id, null, { at: [x, z] }); return Promise.resolve(okR()); }
        var tip = w.clone().setY(w.y + p.h + 0.03);
        return reach(i, tip, 1, { approach: false, poses: 3 }).then(function (r) {
          if (!r.ok) return r; hold(id, i);
          var t = {}; t[id] = [x, z]; return lower([id], { to: t });
        });
      }

      /* ── 고르기(탭)·화면 ── */
      function cRect() { return canvas.getBoundingClientRect(); }
      function pick(x, y) {   /* 클라이언트 CSS px → { kind: 'ball'|'cup'|'basket'|'tip', id } | null. 프록시 레이캐스트 → 없으면 화면 32px 안 최근접. 우선순위 공 > 맨 위 컵 > 컵 > 바구니 */
        scene.updateMatrixWorld(); camera.updateMatrixWorld();
        var r = cRect(), ts = tipScreen();
        if (ts && Math.hypot(ts.x - x, ts.y - y) <= 26) return { kind: 'tip', id: P.tip.cup };
        _nd.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1); _rc.setFromCamera(_nd, camera);
        var vis = order.map(function (id) { return toys[id]; }).filter(function (p) { return p.g.visible; });
        function rank(p) { return p.kind === 'ball' ? 3 : p.kind === 'cup' ? (towerTop(p) === p ? 2 : 1) : 0; }
        var hs = _rc.intersectObjects(vis.map(function (p) { return p.proxy; }), false), best = null;
        hs.forEach(function (h) { var p = toys[h.object.userData.toy]; if (!best || rank(p) > rank(best.p) || (rank(p) === rank(best.p) && h.distance < best.d)) best = { p: p, d: h.distance }; });
        if (best) return { kind: best.p.kind, id: best.p.id };
        var bd = Infinity, bp = null;
        vis.forEach(function (p) { var q = screenRect([p.mesh], r), d = Math.hypot(Math.max(q.l - (x - r.left), 0, (x - r.left) - q.r), Math.max(q.t - (y - r.top), 0, (y - r.top) - q.b)); if (d < bd - 4 || (d < bd + 4 && bp && rank(p) > rank(bp))) { bd = Math.min(bd, d); bp = p; } });
        return bp && bd <= NEAR ? { kind: bp.kind, id: bp.id } : null;
      }
      function floorAt(x, y, h) { var r = cRect(); _nd.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1); _rc.setFromCamera(_nd, camera); _pl.constant = -(h || 0); var o = _rc.ray.intersectPlane(_pl, new T.Vector3()); return o ? { x: o.x, z: o.z } : null; }
      function screenOf(tg) {   /* 장난감 중심(또는 [x,y,z]) → 클라이언트 CSS px */
        scene.updateMatrixWorld(); var p = toys[tg], r = cRect(), v;
        if (p) { v = place(p).clone(); v.y += p.kind === 'ball' ? BALL_R : p.h * 0.5; } else if (tg && tg.length === 3) v = new T.Vector3(tg[0], tg[1], tg[2]); else return null;
        v.project(camera); return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (1 - (v.y * 0.5 + 0.5)) * r.height };
      }
      function headRect() {   /* 문어 머리(몸통 메시)만의 화면 사각형 (팔 제외) — 컵 탭 상자와 겹칠 때 '보이는 그림이 이긴다' 판정용. 숨었으면 null */
        if (!octG.visible || P.hidden) return null; scene.updateMatrixWorld(); camera.updateMatrixWorld();
        var r = cRect(), q = screenRect([head], r); if (!isFinite(q.l)) return null;
        return { l: r.left + q.l, t: r.top + q.t, r: r.left + q.r, b: r.top + q.b };
      }
      function targets() {   /* 보이는 장난감의 화면 사각형: rect = 보이는 메시, hit = 탭 프록시 (CSS px, 클라이언트) */
        scene.updateMatrixWorld(); camera.updateMatrixWorld(); var r = cRect(), out = [];
        order.forEach(function (id) {
          var p = toys[id]; if (!p.g.visible) return;
          var a = screenRect([p.mesh], r), b = screenRect([p.proxy], r);
          function abs(q) { return { l: r.left + q.l, t: r.top + q.t, r: r.left + q.r, b: r.top + q.b, w: Math.round(q.r - q.l), h: Math.round(q.b - q.t) }; }
          out.push({ kind: p.kind, id: id, x: r.left + (a.l + a.r) / 2, y: r.top + (a.t + a.b) / 2, rect: abs(a), hit: abs(b) });
        });
        var ts = tipScreen(); if (ts) out.push({ kind: 'tip', id: P.tip.cup, x: ts.x, y: ts.y, rect: { l: ts.x - 26, t: ts.y - 26, r: ts.x + 26, b: ts.y + 26, w: 52, h: 52 } });
        return out;
      }

      /* ── 프레임 (frame() 에서 stepOct 바로 뒤) ── */
      function stepPlay(dt) {
        P.stat.frames++;
        var list = jobs.slice();
        for (var j = 0; j < list.length; j++) {
          var jb = list[j]; if (jb.dead) continue;
          jb.t += dt; var k = jb.dur > 0 ? Math.min(1, jb.t / jb.dur) : 1, end = false;
          if (jb.fn) end = jb.fn(k, jb.t) === true;
          if (end || k >= 1) { jb.dead = true; jobs.splice(jobs.indexOf(jb), 1); jb.res({ ok: true }); }
        }
        P.stat.jobs = jobs.length;
        applyPoses();
        stepArms();
        layoutToys(); layoutTip();
        if (P.look != null) P.eye = eyePoint();
      }
      function resetAll() {   /* '처음처럼': 남은 연출 취소 · 팔·자세·색·숨김·모자 · 장난감은 그대로 둔다(play.js 가 다시 놓는다) */
        cancel(); Object.keys(ctl).forEach(function (k) { delete ctl[k]; });
        order.forEach(function (id) { var p = toys[id]; if (p.attach) hold(id, null); p.sy = 1; p.lift = 0; p.tip = 0; });
        Object.keys(poses).forEach(function (k) { delete poses[k]; }); P.tint = null; P.hidden = null; tipIn(); P.look = null; P.eye = null;
        octG.visible = st.octState !== 'away'; octDecal.scale.setScalar(1);
      }
      function snapshot() {   /* 테스트·결정 확인용 상태 (실수는 cm 로 반올림, 칸 포함) */
        var o = { toys: {}, oct: { at: [+oct.pos.x.toFixed(3), +oct.pos.z.toFixed(3)], cell: cellOf(oct.pos.x, oct.pos.z), yaw: +(oct.faceYaw / DEG).toFixed(1), hidden: P.hidden, tint: P.tint, visible: octG.visible, poses: Object.keys(poses), expr: face.expr, walking: !!oct.walking }, arms: {}, jobs: jobs.map(function (j) { return j.tag; }), tip: P.tip ? { cup: P.tip.cup, side: P.tip.side, poke: P.tip.poke } : null, look: P.look };
        order.forEach(function (id) { var p = toys[id], w = place(p); o.toys[id] = { kind: p.kind, x: +p.x.toFixed(3), z: +p.z.toFixed(3), cell: cellOf(p.x, p.z), y: +w.y.toFixed(3), lift: p.lift, vis: p.g.visible, attach: p.attach, on: p.on, cover: p.cover, inBasket: p.inBasket || null }; });
        Object.keys(ctl).forEach(function (k) { var c = ctl[k]; o.arms[k] = { mode: c.mode, k: +(c.kq || 0).toFixed(2), sx: +(arms[k].scale.x).toFixed(2), holds: heldBy(+k) }; });
        return o;
      }
      function api(id) { return toys[id] ? id : null; }
      function prop(id, o) {   /* 논리 위치 직접 (끌기·배치): { x, z, lift(px), tilt, vis, sy, on, cover } */
        var p = toys[id]; if (!p) return null; o = o || {};
        if (o.at) { p.x = o.at[0]; p.z = o.at[1]; }
        ['x', 'z', 'lift', 'tilt', 'tip', 'vis', 'sy'].forEach(function (k) { if (o[k] != null) p[k] = o[k]; });
        if ('on' in o) p.on = o.on && toys[o.on] && o.on !== id ? o.on : null;
        if ('cover' in o) p.cover = o.cover && toys[o.cover] ? o.cover : null;
        if (o.x != null || o.at || o.on) p.inBasket = null;
        PF++; return snapshot().toys[id];
      }
      var camDef = (function () { var a = GRID.P0, f = GRID.f; return new T.Vector3(a[0] - f[0] * 1.3, 0.3, a[2] - f[2] * 1.3); })();   /* 컵 줄이 화면 높이 ~62 % (360×740, 2배 줌) */
      P.cam = camDef.clone();
      var kit = P.kit = {
        version: 1, grid: GRID, cell: cell, cellOf: cellOf, CUP: CUP, BALL_R: BALL_R, MAXS: MAXS,
        addCup: addCup, addBall: addBall, addBasket: addBasket, remove: removeToy, prop: prop, putInBasket: putInBasket, has: function (id) { return !!toys[id]; }, ids: function () { return order.slice(); },
        pick: pick, floorAt: floorAt, screenOf: screenOf, targets: targets, headRect: headRect,
        camera: function (v) { P.cam = v == null ? camDef.clone() : v.isVector3 ? v.clone() : new T.Vector3(v[0], v[1], v[2]); dither.still = 0; return [+P.cam.x.toFixed(3), +P.cam.y.toFixed(3), +P.cam.z.toFixed(3)]; },
        walkTo: walkTo, jumpTo: jumpTo, face: faceTo, look: look, scan: scan, expr: function (n) { setExpression(n); return face.expr; }, joy: joy,
        reach: reach, retract: retract, hesitate: hesitate, grab: grab, hold: hold, press: press, lift: lift, lower: lower, raise: raise, pxUp: pxUp,
        roll: roll, nudge: nudge, route: route, blocked: blocked, cupHop: cupHop, slide: slide, peekCup: peekCup, bob: bob, cover: function (ball, cup) { var b = toys[ball]; if (!b) return false; b.cover = cup && toys[cup] ? cup : null; if (b.cover) { var c = towerBase(toys[cup]); b.x = c.x; b.z = c.z; b.attach = null; b.inBasket = null; } PF++; return true; },
        pose: function (a, b) { if (typeof a === 'string') setPose(a, b); else setPose('user', a); }, poseSteps: poseSteps,
        tint: tint, camouflage: camouflage, tuck: tuck,
        squeezeInto: squeezeInto, popOut: popOut, tipOut: tipOut, tipIn: tipIn, tipPoke: tipPoke,
        wearHat: wearHat, takeOffHat: takeOffHat,
        wait: wait, cancel: cancel, reset: resetAll, busy: function () { return jobs.length; }, state: snapshot,
        speed: function (k) { if (k > 0) st.speed = clamp(+k, 0.1, 8); return st.speed; },
        destroy: function () { resetAll(); order.slice().forEach(removeToy); if (P.tipM) atticG.remove(P.tipM); PLAY = null; ATTIC_DOOR.g.visible = true; }
      };
      return kit;
    }

    return {
      kind: '3d', renderer: renderer, scene: scene, camera: camera,
      setLantern: function (n) { st.lantern = n | 0; lampDirty = true; },
      setItems: function (items) { st.items = (items || []).slice(); applyItems(); },
      setWeather: function (w) { st.weather = w || 'rain'; applyWeather(); },
      setTime: setTime, setColor: setColor, color: function () { return st.color; }, setOctWear: setOctWear, octWear: octWearNow, setGarden: setGarden, garden: function () { return plotState.map(function (g) { return g ? { color: g.color, water: g.water } : null; }); },   /* setColor(hex, { still }) — still = 흔들기 없음 · color() = 지금 장면 몸색 (시험용) */
      setOctState: setOctState, setCarry: function (svg) { octState.carrySvg = svg; },
      /* 미용실 (docs/SALON.md §8.2): setSalonOpen(on) 단추 허락 · salonOffer(hex|null) 병이 앞으로/제자리 (눈이 병으로) · salonDye(hex, { joy, look, pause|id, onBeat }) → Promise ·
         salonKeep() → Promise · salonFinish() 지금 연출을 끝 상태로 (새 색 · 대야 없음 · 병 제자리). 박자 알림 = on.salon(ev) / onBeat(ev): { act: 'tub', on } · 'pour' · 'splash' · 'done' { color, joy } · 'joy' · 'drain'.
         끝으로 감기면 (숨은 탭 · 화면 밖 · 컨텍스트 잃음 · 문 · 의식 · 코너 사라짐 · salonFinish) 남은 박자 알림은 오지 않는다: 아직 색이 안 바뀐 '바꾸기'면 'done' { skipped: true } 하나뿐
         ('tub' { on: false } · 'drain' 없음). 소리·상태 정리는 'done' 이나 Promise (늘 풀린다 · { ok, skipped, color }) 에 건다 */
      setSalonOpen: setSalonOpen, salonOffer: salonOffer, salonDye: salonDye, salonKeep: salonKeep, salonFinish: function () { salFinishNow(); },
      setExpression: setExpression, expression: function () { return face.expr; }, EXPRESSIONS: EXPRESSIONS.slice(),   /* 룩 패스 8: 표정은 상태와 별개 (상태가 기본 표정을 고르고, app.js 가 덮어쓴다) */
      portrait: portrait, portraitURL: portraitURL,   /* 64×64 초상 캔버스 / data URL (표정·몸색·팔레트·배경 키 캐시, opts.bg = 'transparent'(기본) | 'navy' | '#rrggbb') */
      moveTo: moveTo, jumpTo: jumpTo, finishWalk: function () { if (oct.walking && oct.walking.finish) oct.walking.finish(); },   /* 건너뛰기: 걷던 길을 지금 도착시키고 moveTo 의 Promise 를 푼다 (2D 와 같은 API) */
      intro: startIntro, introSkip: finishIntro, introRelease: introRelease, introActive: function () { return INTRO.on; }, introProgress: function () { return INTRO.on ? clamp(INTRO.t / INTRO.dur, 0, 1) : 1; },   /* 입장 연출: intro({ dur, height, instant, hold }) → Promise(착지) · introSkip() 바로 착지 · introRelease() 비네트 복귀 */
      skyHex: skyHex,   /* 지금 허공(배경)이 화면에 찍히는 색 — 입장 레이어가 장면 밖을 같은 색으로 덮는다 */
      /* 바깥·계절·전환 (DESIGN §15.3, docs/SCENE.md): 장소 'attic' | 'exterior' · 계절 'spring' | 'summer' | 'autumn' | 'winter' | 'auto'(실제 월) · 출발/귀가 의식 (onDone 콜백 + Promise) */
      setPlace: function (p, o) { setPlace(p, o); }, place: function () { return PLACE.cur; },
      /* 놀이방 (8물결, scratchpad scene-api.md · docs/SCENE.md '놀이방'): view() 지금 그려지는 장소 'attic'|'exterior'|'play' · room() 내가 들어가 있는 방 'play'|null ·
         goRoom('play'|'attic', { walkFirst, instant, onDoor }) → Promise<{ ok, reason?, view, room, place }> · playerWalkTo(anchor) → Promise<{ ok, walked, anchor, at }> (내 캐릭터가 문 앞까지 걷는다) · player() → { place, at, walking, pending, yaw, frame, group, visible, walks, height, look } ·
         hotspots({ atticPlay, playAttic, machine }, { edge }) 진짜 <button> 을 문·기계 위에 · spotRect(id) → {mode, x, y, w, h, art, client} | null (#scene 안쪽 CSS px) · finishRoom() 문 작업 즉시 끝 */
      view: function () { return PLACE.vis; }, room: function () { return PLACE.room; }, goRoom: goRoom, playerWalkTo: playerWalkTo, player: plInfo, finishRoom: dqFinish,
      /* 내 캐릭터 파츠 (docs/PLAYER_PARTS.md §3): setPlayer(cfg) → 정규화된 cfg (지오메트리만 교체, 위치·걷기 그대로) · player().look · playerPortrait({ bg }) → 64×64 캔버스 (레이어 2 조명, 캐시) ·
         debugPlayerYaw(deg | null) 8방향 샷용 (null = 다시 카메라 쪽) · debugPlayerBlink(s) 깜빡임 강제 (tools/player-shots.js) */
      setPlayer: setPlayer, setPlayerDye: setPlayerDye, playerDye: function () { return PL_DYE; }, playerPortrait: playerPortrait, playerShot: playerShot,
      setLayout: setLayout, layout: layoutNow, playerSit: playerSit, playerSitting: function () { return !!PL.sit; },
      furnCarry: furnCarry, furnRotate: furnRotate, furnScale: furnScale, furnSetRot: furnSetRot, furnSetScale: furnSetScale, furnConfirm: furnConfirm, furnCancel: furnCancel, furnEditing: furnState, furnItems: furnItems,   /* 11-10 인테리어 v0: 가구 자리 되살리기 · 지금 자리 · 소파에 앉기 */
      /* 움직이기 (brief MOVE.md · docs/SCENE.md '내 캐릭터 · 움직이기'): setPlayerInput({ x, y } | null) 화면 축 벡터(오른쪽 +x · 위 +y · 길이 0..1) → 매 프레임 1.2 m/s · playerInputAllowed() 보이는 때 규칙 ·
         on.playerInput(allowed) 바뀔 때만 · on.playerStep() 걸음마다 · player().input / footprints · debugPlayerAt(x, z) 자리 옮김 (검사용) */
      setPlayerInput: setPlayerInput, playerInputAllowed: playerInputAllowed,
      debugPlayerAt: function (x, z) { plStop(); PL.pending = ''; PL.pos.set(+x || 0, 0, +z || 0); PL.moving = false; plSnap(); return plInfo(); },
      debugPlayerYaw: function (deg) { if (deg == null) { PL.faceCam = true; return; } PL.faceCam = false; PL.wantYaw = PL.yaw = deg * DEG; },
      debugPlayerBlink: function (s) { PL.blinkLeft = s == null ? 0.12 : Math.max(0, +s || 0); if (!PL.blinkLeft) PL.blinkT = 9; },   /* 0 = 눈을 뜨고 9 s 동안 안 감는다 (파츠 시트 칸이 깜빡임 프레임에 찍히지 않게) */
      debugPlayerEyes: function (v) { plEyes.visible = v !== false; return { lod: PL.lod, shut: PL.shut }; },
      debugPlayerHide: function (v) { plG.visible = v === false; },   /* 눈 조각 숨기기/보이기 · 캐릭터 통째 숨기기(true = 숨김) — player-shots 의 '눈이 머리 윤곽 밖으로 나오나' 검사: 눈 켠 프레임 − 끈 프레임 의 차이 픽셀이 전부 캐릭터(끈 프레임 − 숨긴 프레임) 위에 있어야 한다 */
      hotspots: setHotspots,
      spotRect: function (id) { var s = spotInfo(id); if (!s || s.mode !== 'over') return s; var r = container.getBoundingClientRect(); s.client = { x: r.left + s.x, y: r.top + s.y, w: s.w, h: s.h }; return s; },
      doorAnchors: JSON.parse(JSON.stringify(DOOR_ANCHORS)),
      debugDoor: function (v) { ATTIC_DOOR.g.visible = v !== false; dither.still = 0; return ATTIC_DOOR.g.visible; },   /* 디버그 (덧그림 비교 캡처): 다락 문을 숨겼다 보였다 */
      setSeason: setSeason, season: function () { return SEASON.cur; }, seasonMode: function () { return SEASON.mode; },
      departCeremony: departCeremony, returnCeremony: returnCeremony, ceremony: function () { return CER.name; },
      /* 비상 정지: 프레임이 못 도는 동안(WebGL 컨텍스트 잃음) 남은 의식을 버리고 다락으로. onDone 은 부르지 않는다 (앱이 이미 정리) */
      cancelCeremony: function () { CER.q = []; CER.cur = null; CER.active = false; CER.name = ''; CER.done = null; CER.walk = false; oct.hop = 0; WAVE.on = false; pkReset(); setOctFade(1); octG.visible = true; octDecal.visible = true; setPlace('attic', { instant: true }); },
      /* 바깥 기웃 (docs/SCENE.md "바깥 기웃"): extSpot(corner|roomId) → {key,x,y,z,face(rad),prop,act} · peekOutside({corner, roomId, status, first, emoji}, onDone) → Promise · leaveOutside(onDone) → Promise */
      extSpot: extSpot, peekOutside: peekOutside, leaveOutside: leaveOutside, EXT_SPOTS: Object.keys(EXT_SPOTS),
      peek: function () { return { on: PK.on, key: PK.key, hold: PK.hold, onSpot: PK.onSpot, status: PK.status, t: +PK.t.toFixed(2), lean: +(PK.leanQ / DEG).toFixed(1), sit: PK.sit, arm: PK.arm, mail: PK.mail, rustle: PK.rustle && rustleM.visible, ripple: rippleM.visible }; },
      setPosters: setPosters, setSouvenirs: setSouvenirs,
      bubble: bubble, nudge: function () { if (!st.reduced) { oct.nudgeT = 0.18; dither.still = 0; } },   /* 톡 받음 (APP 이 깨어 있는 톡마다 · 모션 감소면 APP 이 눈 깜빡으로) */
      lookAt: function (x, y) { oct.lookTarget = { x: x, y: y }; }, octUp: function () { return octUp(); }, setSheetInset: setSheetInset, lift: function () { return { y: +LIFT.y.toFixed(4), to: +LIFT.to.toFixed(4) }; }, octScreenPos: function () { if (isRoomP(PLACE.vis) && !octUp()) return null; var p = octScreen(), r = canvas.getBoundingClientRect(); return { x: r.left + p.x - S.offX, y: r.top + p.y - S.offY }; },   /* 놀이방: null (문어가 화면에 없다 — 말풍선·파티클·앨범 날기는 문어 자리에 안 붙는다) */
      setReducedMotion: function (r) { st.reduced = !!r; lampDirty = true; },
      setLook: function (o) {
        var re = false;
        if (o.pixelSize != null && (o.pixelSize | 0) !== st.look.pixelSize) { st.look.pixelSize = clamp(o.pixelSize | 0, 1, 4); re = true; }
        if (o.dither != null) { st.look.dither = clamp(+o.dither, 0, 1); ditherBase(); }
        if (o.outline != null) { st.look.outline = !!o.outline; post.uniforms.uOutline.value = st.look.outline && hasDepthTex ? 1 : 0; }
        if (o.yaw != null) { st.look.yaw = clamp(+o.yaw, -25, 25); dither.still = 0; }
        if (o.zoom != null) { var zf = ZOOM_OLD[clamp(o.zoom | 0, 0, ZOOM_OLD.length - 1)]; if (zf !== st.zoomF) { ZT = null; st.zoomF = zf; re = true; touchMode(); } }   /* 옛 줌 단계 0..3 = 1·1.25·1.5·2× (look-shots close · play.html 호환). 핀치·휠은 7 멈춤 */
        if (o.focus !== undefined) { st.look.focus = o.focus === 'oct' ? 'oct' : null; dither.still = 0; }
        if (o.key != null || o.fill != null) { if (o.key != null) st.look.key = clamp(+o.key || LIGHTS.day.sunI, 0.5, 4); if (o.fill != null) st.look.fill = clamp(+o.fill, 0, 1); applyLight(); }   /* 키/필 비율 (룩 패스 4) */
        if (re) { resize(); dither.still = 0; }
      },
      /* 카메라 (docs/INTERIOR_MODE.md §3.4·§3.5 · §5.3 장면 API): pan() → { x, y (아트px, 쉬면 정수), n (아트px/m), k (줌 멈춤 0..6), zoom (배율), mode } ·
         zoomStep(k) 멈춤 k 로 바로 (가운데 기준) · zoomTo(n) n 아트px/m 에 가까운 멈춤으로 이징 · recenter() 밀린 것을 0.3 s 만에 0 으로 (가운데로 칩) */
      pan: function () { return { x: +(PAN.x * S.N).toFixed(3), y: +(PAN.y * S.N).toFixed(3), n: S.N, k: zoomStepOf(st.zoomF), zoom: +st.zoomF.toFixed(4), mode: PAN.mode || GEST.mode }; },
      zoomStep: function (k) { ZT = null; return setZoom(ZOOM_STEPS[clamp(k | 0, 0, ZOOM_STEPS.length - 1)]); },
      zoomTo: function (n) { zoomFinish(); zoomEase(ZOOM_STEPS[zoomStepOf(Math.max(1, +n || 0) / baseN())]); return Math.round(baseN() * (ZT ? ZT.f1 : st.zoomF)); },   /* §5.3: n 아트px/m 에 가장 가까운 멈춤으로 0.15 s ([🔍] 칩 1× → 1.41× → 2×) · 그 멈춤의 N 을 돌려준다 */
      recenter: function () { panTo(0, 0, 0.3, 'tween'); },
      /* 디버그 (tools · 사라짐 검사): 문어 밀도를 v 로 바꿔 지금 상태를 다시 그린다 (시간은 안 간다) · null = 원래대로 */
      debugFade: function (v) {
        if (v == null) { if (FADE.dbg) { octG.visible = FADE.dbg.vis; octDecal.visible = FADE.dbg.dec; FADE.dbg = null; fadeLook(FADE.d); if (FADE.d >= 0.5) octDecal.visible = octG.visible; } return; }
        if (!FADE.dbg) FADE.dbg = { vis: octG.visible, dec: octDecal.visible };
        v = clamp(+v, 0, 1); fadeLook(v); octG.visible = v > 0; octDecal.visible = v >= 0.5; draw(0);
      },
      setPalette: function (name) { /* 룩 패스 3: 스냅 팔레트 소스 교체 (재질은 그대로, 디더 진폭은 새 칸 간격으로) */
        name = paletteSource(name); if (name === st.palette) return;
        st.palette = name; PAL = buildPalette(st.color, name, salExtra()); uploadPalette(); ditherBase(); dither.still = 0; portraitFlush();
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
        if (PLACE.vis === 'attic') { add('window', 'window', [glass]); tapItems().forEach(function (m) { add(m.userData.kind, tapId(m), [m]); }); }
        return out;
      },
      pickAt: function (x, y) { scene.updateMatrixWorld(); camera.updateMatrixWorld(); var o = pick(+x, +y); return o ? { kind: o.userData.kind, id: tapId(o) } : null; },
      screenOf: function (x, y, z) { var p = _hp.set(x, y, z).project(camera); return { x: S.offX + (p.x * 0.5 + 0.5) * S.cw, y: S.offY + (1 - (p.y * 0.5 + 0.5)) * S.ch }; },   /* 월드 → 컨테이너 CSS px (스트립 크롭 중심) */
      msFrame: function () { var s = 0; for (var i = 0; i < perf.n; i++) s += perf.ring[i]; return { ms: perf.n ? +(s / perf.n).toFixed(2) : 0, n: perf.n }; },
      motion: function () { var vg = groupOf(PLACE.vis); return { salon: salMotion(), player: plInfo(), place: PLACE.vis, view: PLACE.vis, room: PLACE.room, dq: DQ.name, slidePx: Math.round(vg.position.dot(_r) / S.pw), slideUpPx: Math.round(vg.position.dot(_u) / S.pw), slideY: +vg.position.y.toFixed(4), transAxis: PLACE.trans ? PLACE.trans.axis : '', doorAttic: ATTIC_DOOR.f, doorPlay: PLAY_DOOR ? PLAY_DOOR.f : 0, trans: PLACE.trans ? +PLACE.trans.t.toFixed(3) : 0, fade: +PLACE.fade.toFixed(3), ceremony: CER.name, door: +DOOR_EXT.a.toFixed(2), octVisible: octG.visible, octFade: FADE.d, wave: WAVE.on, peek: PK.on ? PK.key + (PK.hold ? ':hold' : ':walk') : '', extStep: xanim.step, swayPx: swayPx, shimmer: shim.k, curtainFrame: CURT.frame, rainStep: anim.step, armStep: anim.armStep, blink: oct.blinkLeft > 0, reduced: st.reduced, expr: face.applied, hop: +bodyG.position.y.toFixed(3), armX: +arms[0].scale.x.toFixed(2), tilt: +(bodyG.rotation.z / DEG).toFixed(1), squashY: +bodyG.scale.y.toFixed(3), gait: { moving: G.moving, antic: G.antic > 0, phase: +G.phase.toFixed(3), step: Math.floor(G.phase), roll: +(G.roll / DEG).toFixed(1), yaw: +(G.yaw / DEG).toFixed(1), lean: +(G.lean / DEG).toFixed(1), armK: +G.armK.toFixed(2), bobPx: Math.round(bodyG.position.y * OCT_R / pxUp()), style: GAIT.stepped ? 'stepped' : 'smooth', at: (function () { var w = octG.getWorldPosition(new T.Vector3()); return [+w.x.toFixed(3), +w.y.toFixed(3), +w.z.toFixed(3)]; })() } }; },
      gaitStyle: function (s) { if (s === 'stepped' || s === 'smooth') GAIT.stepped = s === 'stepped'; return GAIT.stepped ? 'stepped' : 'smooth'; },   /* 디버그: 걸음 굴림 3단 스텝(기본) / 매끈 — tools/walk-strip.js 비교용 */   /* 룩 패스 7·8 디버그 */
      stats: function () { return { calls: calls, target: [S.rw, S.rh], pixel: S.p, palette: PAL.list.length, paletteName: PAL.source, step: +PAL.step.toFixed(4), dither: +dither.base.toFixed(4), ditherFlat: +(dither.base * 0.125).toFixed(4), pw: +S.pw.toFixed(4), hasDepthTex: hasDepthTex, zoom: +(S.N / baseN()).toFixed(4), props: propCount, key: +st.look.key.toFixed(2), fill: +st.look.fill.toFixed(2), sun: +sun.intensity.toFixed(2), hemi: +hemi.intensity.toFixed(2), phase: phaseOf(st.hour), bloom: BLOOM, blur: blurOn ? 'h5v5' : 'off', em: +(light.em || 0).toFixed(2), expr: face.expr, portraitMs: PORT.ms, portraitN: PORT.n, portraitCache: Object.keys(PORT.cache).length, autoMs: perf.auto, autoPixel: st.look.autoPixel || 0, place: PLACE.cur, view: PLACE.vis, room: PLACE.room, frameY: frameY(), season: SEASON.cur, offscreen: !!st.offscreen, draws: drawN, callsAttic: callsBy.attic, callsExt: callsBy.exterior, callsPlay: callsBy.play, extProps: extPropN, playBuilt: !!PROOM, playProps: PROOM ? PROOM.props : 0, programs: renderer.info.programs ? renderer.info.programs.length : 0 }; },
      refresh: function () { applyItems(); },
      pause: function () { st.paused = true; cancelAnimationFrame(raf); }, resume: function () { st.paused = false; lastDraw = 0; loop(); },
      destroy: function () {
        dqFinish(); if (SAL.active) salFinishNow(); clearSpots();   /* 걸린 문 작업 · 미용실 연출은 풀고, 넘겨받은 단추의 위치 style 은 비운다 (hidden 은 앱 몫) */
        st.paused = true; cancelAnimationFrame(raf); unbind.forEach(function (f) { f(); }); if (ro) ro.disconnect(); if (io) io.disconnect();
        clearTimeout(lostTimer); lostTold = true;
        posterMeshes.forEach(function (m) { if (m.material !== posterMat) { if (m.material.map) m.material.map.dispose(); m.material.dispose(); } });
        if (carry.material !== posterMat) { if (carry.material.map) carry.material.map.dispose(); carry.material.dispose(); }
        disposables.forEach(function (d) { if (d && d.dispose) d.dispose(); });
        normalMat.dispose(); renderer.dispose(); renderer.forceContextLoss();
        if (opts.octEl) { opts.octEl.style.display = ''; lastOctHide = false; }   /* 놀이방에서 컨텍스트를 잃어도 2D 문어(이름표·말풍선 포함)가 보이게 — updateOverlay 의 인라인 display:none 을 걷는다 */
        if (opts.octEl && container.querySelector('#stage') === null) { var stg = document.getElementById('stage'); if (stg) stg.appendChild(opts.octEl); opts.octEl.classList.remove('overlay3d'); }
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        container.classList.remove('mode-3d'); container.style.touchAction = ''; delete container.dataset.view; delete container.dataset.room;
      },
      anchors: ANCHORS, extAnchors: EXT_P, PLACES: ['attic', 'exterior', 'play', 'loft'], SEASONS: SEASONS.slice(),
      play: function () { var k = PLAY ? PLAY.kit : makePlay(); ATTIC_DOOR.g.visible = false; panReset(); touchMode(); return k; }   /* 컵 놀이 시제품(play.html) 화면은 예전 그대로: 놀이방 문 덧그림을 숨긴다 */   /* 놀이 kit (docs/PLAY_PROTO.md §11.3) — 처음 부를 때 만든다. 본 게임은 부르지 않는다 · 놀이 동안 밀기 없음, touch-action none */
    };
  }

  return { supported: supported, init: init, buildPalette: buildPalette, ramp: ramp, hexToOklab: hexToOklab, ANCHORS: ANCHORS, DOOR_ANCHORS: DOOR_ANCHORS, ITEM_LEVEL: { salon: 2 },   /* ITEM_LEVEL = 장면이 그리는 새 소품의 등불 칸 (앱 ITEM_LEVEL 이 같은 값을 쓴다) */ PLAY_SIZE: { floor: 2 * PLAY_R, wall: PLAY_H }, PAL_SOURCES: PAL_SOURCES, PAL_DEFAULT: PAL_DEFAULT, MAT: MAT, LIGHTS: LIGHTS, FIRST_LIGHT: FIRST_LIGHT, EXPRESSIONS: EXPRESSIONS.slice(),
    PLAYER_PARTS: PLAYER_PARTS, PLAYER_DEFAULT: PLAYER_DEFAULT, normalizePlayer: normalizePlayer, COSTUMES: COSTUMES };   /* 내 캐릭터 파츠 카탈로그 · 기본값 · 정규화 (docs/PLAYER_PARTS.md §3) */
})();
