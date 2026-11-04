/* ============================================================
   뽈뽈 문어 — js/scene3d.js (전역 SCENE3D)
   three.js r128 UMD 로 만든 픽셀아트 3D 다락방 + 절차적 문어. DESIGN.md §7.0 §7.1 §13, docs/SCENE.md
   전부 절차적(이미지/모델 파일 없음). 저해상 렌더 타깃 → 풀스크린 후처리(깊이 외곽선·노멀 하이라이트·
   게이트 디더·OKLab 팔레트 스냅) → Nearest 업스케일. WebGL/THREE 가 없으면 APP 이 SCENE2D 를 쓴다.
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

  /* 고정 램프 (49) + 문어 램프 5 = 54 ≤ 64 */
  var RAMPS = [['wood', '#8a5a3c', 8], ['paper', '#efe3c8', 4], ['amber', '#ffb462', 6], ['navy', '#22304f', 6], ['moss', '#5f7a3a', 4],
    ['slate', '#6a6670', 6], ['sky', '#9fc7e8', 4], ['dusk', '#e39a8c', 4], ['glass', '#8aa0b4', 4], ['rose', '#9a5058', 3]];
  var FIXED = { ink: '#1b1522', white: '#fbf6ea', night: '#0b1020' };
  function buildPalette(octHex) {
    var P = {}, list = [];
    RAMPS.forEach(function (r) { P[r[0]] = ramp(r[1], r[2]); list = list.concat(P[r[0]]); });
    Object.keys(FIXED).forEach(function (k) { P[k] = FIXED[k]; list.push(FIXED[k]); });
    P.oct = ramp(octHex, 5, 0.09, [0.004, 0.014]); list = list.concat(P.oct);
    P.list = list;
    return P;
  }
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
    'uniform sampler2D tDiffuse, tDepth, tNormal, uBayer; uniform vec2 uRes; uniform float uNear, uFar;',
    'uniform vec3 uPalOk[64]; uniform vec3 uPalRgb[64]; uniform int uPalN; uniform vec3 uW;',
    'uniform float uDither, uOutline, uHasNormal;',
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
    'void tap(vec2 uv, vec2 off, float d0, vec3 n0, inout float dd, inout float nn, inout float le, float l0){',
    '  vec2 u2 = uv + off; float d1 = depthM(u2); dd += max(d1 - d0, 0.0);',
    '  vec3 n1 = nrm(u2); float di = clamp(sign((d1 - d0) * 0.25 + 0.0025), 0.0, 1.0);',
    '  float ni = smoothstep(-0.01, 0.01, dot(n0 - n1, vec3(1.0)));',
    '  nn += (1.0 - dot(n0, n1)) * di * ni; le = max(le, abs(luma(u2) - l0)); }',
    'void main(){',
    '  vec2 ap = floor(vUv * uRes), px = 1.0 / uRes;',
    '  vec3 c = texture2D(tDiffuse, vUv).rgb;',
    '  vec3 ok = linToOklab(srgbToLinear(c));',
    '  ok.x = (ok.x - 0.5) * 1.03 + 0.5; ok.yz *= 1.07;',                               /* grade: 대비 1.03, 채도 1.07 */
    '  float d0 = depthM(vUv); vec3 n0 = nrm(vUv); float l0 = luma(vUv); float dd = 0.0, nn = 0.0, le = 0.0;',
    '  tap(vUv, vec2(px.x, 0.0), d0, n0, dd, nn, le, l0); tap(vUv, vec2(-px.x, 0.0), d0, n0, dd, nn, le, l0);',
    '  tap(vUv, vec2(0.0, px.y), d0, n0, dd, nn, le, l0); tap(vUv, vec2(0.0, -px.y), d0, n0, dd, nn, le, l0);',
    '  float dei = floor(smoothstep(0.06, 0.5, dd) * 2.0) / 2.0 * uOutline;',           /* 깊이 외곽선: 2단 (6 cm 부터) */
    '  float nei = step(0.1, nn) * uOutline * uHasNormal;',                               /* 노멀 하이라이트: 가까운 면만 */
    '  ok.x *= 1.0 - 0.34 * dei;',
    '  ok.x *= (dei < 0.01) ? (1.0 + 0.06 * nei) : 1.0;',
    '  float gate = smoothstep(0.004, 0.055, le);',                                       /* 디더는 명암이 변하는 곳에만 */
    '  ok.x += bayer(ap) * uDither * mix(0.12, 1.0, gate);',
    '  float best = 1e9, bestL = 0.0; int bi = 0;',
    '  for (int i = 0; i < 64; i++) { if (i >= uPalN) break;',
    '    vec3 d = (ok - uPalOk[i]) * uW; float q = dot(d, d);',
    '    if (q < best - 0.0005 || (q < best + 0.0005 && uPalOk[i].x > bestL)) { best = q; bi = i; bestL = uPalOk[i].x; } }',  /* 근소 동률 → 밝은 쪽 */
    '  gl_FragColor = vec4(uPalRgb[bi], 1.0);',
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

  /* 시각대별 조명 (pixel-look-references: 낮 = 따뜻한 키 하나 + 차가운 헤미, 밤 = 새 비율) */
  var LIGHTS = {
    day: { sun: '#fffecd', sunI: 1.7, elev: 48, sky: '#d6ecf6', gnd: '#6f6a60', hemiI: 0.3, out: '#9fc7e8', lamp: 0.3, bg: '#1b1522' },
    dawn: { sun: '#f4bcb4', sunI: 1.2, elev: 14, sky: '#e0c0c8', gnd: '#5a4a48', hemiI: 0.28, out: '#e8b0b8', lamp: 0.6, bg: '#1b1522' },
    dusk: { sun: '#ffbe84', sunI: 1.3, elev: 12, sky: '#d08860', gnd: '#4a3a38', hemiI: 0.26, out: '#e39a8c', lamp: 0.75, bg: '#1b1522' },
    night: { sun: '#93a7c4', sunI: 0.55, elev: 35, sky: '#1b2740', gnd: '#090b12', hemiI: 0.2, out: '#141c33', lamp: 1.0, bg: '#0b1020' }
  };
  function phaseOf(h) { return h < 6 ? 'night' : h < 9 ? 'dawn' : h < 17 ? 'day' : h < 19 ? 'dusk' : 'night'; }

  /* ═══════════════════════════ init ═══════════════════════════ */
  function init(container, opts) {
    T = THREE; opts = opts || {};
    var on = opts.on || {};
    var st = { lantern: opts.lantern | 0, items: (opts.items || []).slice(), weather: opts.weather || 'rain', hour: typeof opts.hour === 'number' ? opts.hour : 21.5,
      color: opts.color || '#e8463c', reduced: !!opts.reducedMotion, speed: opts.speed > 0 ? opts.speed : 1, octState: 'idle', paused: false, hidden: false,
      look: Object.assign({ pixelSize: 3, dither: 0.25, outline: true, yaw: 0 }, opts.look || {}), zoom: 0 };
    var PAL = buildPalette(st.color), OC = octDerived(st.color);
    var disposables = [], unbind = [], raf = 0, lastT = 0, frameNo = 0, time = 0, calls = 0, ready = false;
    function listen(el, ev, fn, o) { el.addEventListener(ev, fn, o); unbind.push(function () { el.removeEventListener(ev, fn, o); }); }
    function keep(x) { disposables.push(x); return x; }

    /* ── 렌더러 · 타깃 · 후처리 ── */
    var renderer = new T.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(1); renderer.outputEncoding = T.LinearEncoding;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
    var canvas = renderer.domElement; canvas.className = 'scene3d-canvas'; canvas.style.imageRendering = 'pixelated';
    container.appendChild(canvas);
    var hasDepthTex = renderer.capabilities.isWebGL2 || !!renderer.extensions.get('WEBGL_depth_texture');
    var rt = keep(new T.WebGLRenderTarget(4, 4, { minFilter: T.NearestFilter, magFilter: T.NearestFilter, format: T.RGBAFormat, type: T.UnsignedByteType, depthBuffer: true, stencilBuffer: false,
      depthTexture: hasDepthTex ? new T.DepthTexture(4, 4, T.UnsignedIntType) : undefined }));
    rt.texture.encoding = T.sRGBEncoding; rt.texture.generateMipmaps = false;
    var rtN = keep(new T.WebGLRenderTarget(4, 4, { minFilter: T.NearestFilter, magFilter: T.NearestFilter, format: T.RGBAFormat, depthBuffer: true, stencilBuffer: false }));
    var normalMat = keep(new T.MeshNormalMaterial());
    var post = keep(new T.ShaderMaterial({ depthTest: false, depthWrite: false, vertexShader: VERT, fragmentShader: FRAG, uniforms: {
      tDiffuse: { value: rt.texture }, tDepth: { value: rt.depthTexture || rtN.texture }, tNormal: { value: rtN.texture },
      uRes: { value: new T.Vector2(4, 4) }, uNear: { value: 0.1 }, uFar: { value: 60 },
      uPalOk: { value: new Float32Array(192) }, uPalRgb: { value: new Float32Array(192) }, uPalN: { value: 0 }, uW: { value: new T.Vector3(1, 1.3, 1.3) },
      uDither: { value: 0 }, uOutline: { value: hasDepthTex ? 1 : 0 }, uHasNormal: { value: 1 }, uBayer: { value: keep(bayerTex()) } } }));
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
    var dither = { base: st.look.dither * 0.08, still: 0 };   /* 슬라이더 0..1 → L 진폭 0..0.08 (기본 0.25 → 0.02 ≈ 팔레트 칸의 ¼, 경계에서만 가중) */
    function ditherNow() { return st.reduced ? 0 : (dither.still < 0.3 ? 0 : dither.base); }

    /* ── 카메라 (직교 다이메트릭, 픽셀 격자 스냅) ── */
    var camera = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 60);
    var camTarget = new T.Vector3(0, 0.75, -0.4), _tg = new T.Vector3(), yawDrag = 0, dragging = false;
    function camTargetNow() { return st.look.focus === 'oct' && octG ? _tg.copy(octG.position).add(_focusUp) : camTarget; }   /* look.focus='oct': 문어 중심 (look-shots close) */
    var _focusUp = new T.Vector3(0, 0.45, 0);
    var S = { W: 0, H: 0, p: 3, rw: 4, rh: 4, cw: 4, ch: 4, N: PX_PER_M, offX: 0, offY: 0 };
    function yawDelta() { var y = clamp(yawDrag + st.look.yaw * DEG, -25 * DEG, 25 * DEG); return Math.round(y / (9 * DEG)) * 9 * DEG; }   /* 9° 스냅 */
    var _off = new T.Vector3(), _r = new T.Vector3(), _u = new T.Vector3(), _ax = new T.Vector3(1, 0, 0), _ay = new T.Vector3(0, 1, 0);
    function placeCamera() {
      var tgt = camTargetNow();
      _off.set(0, 0, DIST).applyAxisAngle(_ax, -TILT).applyAxisAngle(_ay, YAW + yawDelta());
      camera.position.copy(tgt).add(_off); camera.lookAt(tgt); camera.updateMatrixWorld();
      _r.setFromMatrixColumn(camera.matrixWorld, 0); _u.setFromMatrixColumn(camera.matrixWorld, 1);
      var dx = tgt.dot(_r), dy = tgt.dot(_u), N = S.N;
      camera.position.addScaledVector(_r, Math.round(dx * N) / N - dx).addScaledVector(_u, Math.round(dy * N) / N - dy);
      camera.updateMatrixWorld();
    }
    function resize() {
      var W = container.clientWidth || 320, H = container.clientHeight || 240, p = Math.max(st.look.pixelSize | 0 || 3, Math.ceil(W / 480));
      var rw = Math.max(8, Math.floor(W / p)), rh = Math.max(8, Math.floor(H / p));
      S.W = W; S.H = H; S.p = p; S.rw = rw; S.rh = rh; S.cw = rw * p; S.ch = rh * p; S.offX = Math.floor((W - S.cw) / 2); S.offY = Math.floor((H - S.ch) / 2);
      S.N = Math.round(PX_PER_M * 3 / p * ZOOM_STEPS[st.zoom]);   /* 픽셀을 줄이면 같은 구도에 디테일만 는다 */
      renderer.setSize(S.cw, S.ch, false); canvas.style.width = S.cw + 'px'; canvas.style.height = S.ch + 'px';
      rt.setSize(rw, rh); rtN.setSize(rw, rh); post.uniforms.uRes.value.set(rw, rh);
      camera.left = -rw / 2 / S.N; camera.right = rw / 2 / S.N; camera.top = rh / 2 / S.N; camera.bottom = -rh / 2 / S.N; camera.updateProjectionMatrix();
      placeCamera();
    }

    /* ── 장면 · 조명 ── */
    var scene = new T.Scene(); scene.background = C(LIGHTS.night.bg);
    var sun = new T.DirectionalLight(0xffffff, 1); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -7; sun.shadow.camera.right = 7; sun.shadow.camera.top = 7; sun.shadow.camera.bottom = -7;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 40; sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.025; sun.shadow.radius = 1;
    sun.target.position.set(0, 0.5, 0); scene.add(sun); scene.add(sun.target);
    var hemi = new T.HemisphereLight(0xffffff, 0x000000, 0.3); scene.add(hemi);
    var lampPos = new T.Vector3(-1.6, 1.95, -0.9);
    var lamp = new T.PointLight(C('#ffb066').getHex(), 0, 6, 2); lamp.position.copy(lampPos).add(new T.Vector3(0, -0.1, 0)); scene.add(lamp);
    var candleLight = new T.PointLight(C('#ffb066').getHex(), 0, 2.6, 2); scene.add(candleLight);
    var light = { from: null, to: LIGHTS[phaseOf(st.hour)], t: 1, dur: 60 }, lampTint = C('#ffb066');
    var tmpA = new T.Color(), tmpB = new T.Color();
    function lerpC(a, b, k) { return tmpA.copy(C(a)).lerp(tmpB.copy(C(b)), k); }
    function applyLight() {
      var a = light.from || light.to, b = light.to, k = light.t;
      var e = k * (2 - k);
      sun.color.copy(lerpC(a.sun, b.sun, e)); sun.intensity = a.sunI + (b.sunI - a.sunI) * e;
      var elev = (a.elev + (b.elev - a.elev) * e) * DEG;
      sun.position.set(-10 * Math.cos(elev), 10 * Math.sin(elev) + 0.5, 2.5);
      hemi.color.copy(lerpC(a.sky, b.sky, e)); hemi.groundColor.copy(lerpC(a.gnd, b.gnd, e)); hemi.intensity = a.hemiI + (b.hemiI - a.hemiI) * e;
      glass.material.color.copy(lerpC(a.out, b.out, e));
      scene.background.copy(lerpC(a.bg, b.bg, e));
      light.lampK = a.lamp + (b.lamp - a.lamp) * e;
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
    var lambert = keep(new T.MeshLambertMaterial({ vertexColors: true }));
    var toon = keep(new T.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: keep(gradientTex()) }));
    var rtex = keep(radialTex());
    var decalMat = keep(new T.MeshBasicMaterial({ map: rtex, color: C('#1b1522'), transparent: true, opacity: 0.42, depthWrite: false }));
    var glowMat = keep(new T.MeshBasicMaterial({ map: rtex, color: C(PAL.amber[3]), transparent: true, opacity: 0.55, depthWrite: false }));
    function basic(hex) { return keep(new T.MeshBasicMaterial({ color: C(hex) })); }
    function snapPos(v) { return Math.round(v * PX_PER_M) / PX_PER_M; }   /* 소품 위치를 픽셀-월드 크기에 스냅 */

    /* ── 다락방 정적 기하 (재질 1개 = 드로우콜 1개) ── */
    var W = PAL.wood, parts = [];
    var WIN = { z0: -0.3, z1: 1.1, y0: 1.0, y1: 2.3 }, DOOR = { x0: 1.5, x1: 2.4, h: 2.1 };
    for (var i = 0; i < 13; i++) parts.push({ g: box(0.4, 0.1, 2 * R, 1, 1, 10), m: M(-2.4 + i * 0.4, -0.05, 0), c: W[[2, 3, 2, 4, 3][i % 5]] });          /* 바닥 널 */
    for (i = 0; i < 10; i++) {                                                                                                                      /* 벽 널 (창·문 구멍) */
      var y = 0.15 + i * 0.3, cwall = W[i % 2 ? 4 : 5], cback = W[i % 2 ? 5 : 4];
      if (y + 0.15 > WIN.y0 && y - 0.15 < WIN.y1) {
        parts.push({ g: box(0.12, 0.3, WIN.z0 + R, 1, 1, 4), m: M(-R, y, (-R + WIN.z0) / 2), c: cwall });
        parts.push({ g: box(0.12, 0.3, R - WIN.z1, 1, 1, 3), m: M(-R, y, (WIN.z1 + R) / 2), c: cwall });
      } else parts.push({ g: box(0.12, 0.3, 2 * R, 1, 1, 8), m: M(-R, y, 0), c: cwall });
      if (y - 0.15 < DOOR.h) {
        parts.push({ g: box(DOOR.x0 + R, 0.3, 0.12, 7, 1, 1), m: M((-R + DOOR.x0) / 2, y, -R), c: cback });
        parts.push({ g: box(R - DOOR.x1, 0.3, 0.12, 1, 1, 1), m: M((DOOR.x1 + R) / 2, y, -R), c: cback });
      } else parts.push({ g: box(2 * R, 0.3, 0.12, 8, 1, 1), m: M(0, y, -R), c: cback });
    }
    parts.push({ g: box(0.2, 3.1, 0.2), m: M(-R, 1.55, -R), c: W[1] });                                                                             /* 모서리 기둥 */
    parts.push({ g: box(0.26, 0.26, 5.6), m: M(-1.6, 3.35, 0, 0.07, 0, 0), c: W[1] });                                                               /* 기울어진 들보 */
    parts.push({ g: box(0.5, 0.08, WIN.z1 - WIN.z0 + 0.5), m: M(-R + 0.22, WIN.y0, (WIN.z0 + WIN.z1) / 2), c: W[2] });                                 /* 창턱 */
    [[WIN.y0 - 0.05, 0], [WIN.y1 + 0.05, 0]].forEach(function (f) { parts.push({ g: box(0.1, 0.1, WIN.z1 - WIN.z0 + 0.2), m: M(-R + 0.1, f[0], (WIN.z0 + WIN.z1) / 2), c: W[1] }); });
    [WIN.z0 - 0.05, WIN.z1 + 0.05, (WIN.z0 + WIN.z1) / 2].forEach(function (z) { parts.push({ g: box(0.1, WIN.y1 - WIN.y0 + 0.2, 0.1), m: M(-R + 0.1, (WIN.y0 + WIN.y1) / 2, z), c: W[1] }); });
    parts.push({ g: box(0.1, 0.1, WIN.z1 - WIN.z0), m: M(-R + 0.1, (WIN.y0 + WIN.y1) / 2, (WIN.z0 + WIN.z1) / 2), c: W[1] });                            /* 가로 살 */
    [DOOR.x0 - 0.06, DOOR.x1 + 0.06].forEach(function (x) { parts.push({ g: box(0.14, DOOR.h + 0.1, 0.16), m: M(x, (DOOR.h + 0.1) / 2, -R + 0.1), c: W[1] }); });   /* 문틀 */
    parts.push({ g: box(DOOR.x1 - DOOR.x0 + 0.26, 0.14, 0.16), m: M((DOOR.x0 + DOOR.x1) / 2, DOOR.h + 0.07, -R + 0.1), c: W[1] });
    parts.push({ g: new T.CylinderGeometry(0.03, 0.03, 1.1, 5), m: M(lampPos.x, lampPos.y + 0.28 + 0.55, lampPos.z), c: W[0] });                      /* 등불 끈 */
    var room = new T.Mesh(keep(mergeParts(parts)), lambert); room.receiveShadow = true; room.castShadow = true; scene.add(room);
    var doorDark = new T.Mesh(keep(new T.PlaneGeometry(DOOR.x1 - DOOR.x0, DOOR.h)), keep(new T.MeshBasicMaterial({ color: C(PAL.ink) })));
    doorDark.position.set((DOOR.x0 + DOOR.x1) / 2, DOOR.h / 2, -R + 0.02); scene.add(doorDark);
    var glass = new T.Mesh(keep(new T.PlaneGeometry(WIN.z1 - WIN.z0, WIN.y1 - WIN.y0)), keep(new T.MeshBasicMaterial({ color: C('#141c33') })));
    glass.position.set(-R + 0.01, (WIN.y0 + WIN.y1) / 2, (WIN.z0 + WIN.z1) / 2); glass.rotation.y = Math.PI / 2; glass.userData.kind = 'window'; scene.add(glass);
    /* 등불 */
    var lampG = new T.Group(); lampG.position.copy(lampPos); scene.add(lampG);
    var lampBody = new T.Mesh(keep(mergeParts([{ g: box(0.34, 0.08, 0.34), m: M(0, 0.24, 0), c: W[0] }, { g: box(0.3, 0.06, 0.3), m: M(0, -0.24, 0), c: W[0] }, { g: box(0.05, 0.4, 0.05), m: M(0.14, 0, 0.14), c: W[0] }, { g: box(0.05, 0.4, 0.05), m: M(-0.14, 0, -0.14), c: W[0] }])), lambert);
    lampBody.castShadow = true; lampG.add(lampBody);
    var lampGlass = new T.Mesh(keep(box(0.24, 0.36, 0.24)), basic(PAL.slate[1])); lampG.add(lampGlass);
    var lampGlow = new T.Mesh(keep(new T.PlaneGeometry(1.1, 1.1)), glowMat); lampGlow.renderOrder = 5; lampG.add(lampGlow);
    var lampPool = new T.Mesh(keep(new T.PlaneGeometry(2.6, 2.6)), keep(new T.MeshBasicMaterial({ map: rtex, color: C(PAL.amber[2]), transparent: true, opacity: 0.28, depthWrite: false })));
    lampPool.rotation.x = -Math.PI / 2; lampPool.position.set(lampPos.x, 0.015, lampPos.z); lampPool.renderOrder = 2; scene.add(lampPool);
    var lampDirty = true;
    function applyLamp() {
      var n = st.lantern, k = n > 0 ? 0.4 + 0.6 * n / 8 : 0, on = n > 0;
      lamp.intensity = 1.2 * k * (light.lampK || 1);
      lampGlass.material.color.copy(C(on ? PAL.amber[2] : PAL.slate[1]));
      lampGlow.visible = on; lampGlow.material.opacity = 0.3 + 0.05 * n; lampGlow.scale.setScalar(0.7 + 0.06 * n);
      lampPool.visible = on; lampPool.material.opacity = (0.12 + 0.03 * n) * (light.lampK || 1);
      lampDirty = false;
    }

    /* ── 창밖 날씨 ── */
    function points(n, hex, size) {
      var g = keep(new T.BufferGeometry()), arr = new Float32Array(n * 3);
      g.setAttribute('position', new T.BufferAttribute(arr, 3));
      var p = new T.Points(g, keep(new T.PointsMaterial({ color: C(hex), size: size || 1, sizeAttenuation: false })));
      p.frustumCulled = false; p.castShadow = false; scene.add(p); return p;
    }
    var rain = points(40, PAL.glass[2]), snow = points(24, PAL.paper[3]), stars = points(14, PAL.white);
    function seedDrops(pts, n) { var a = pts.geometry.attributes.position.array; for (var i = 0; i < n; i++) { a[i * 3] = -R + 0.07; a[i * 3 + 1] = WIN.y0 + Math.random() * (WIN.y1 - WIN.y0); a[i * 3 + 2] = WIN.z0 + 0.05 + Math.random() * (WIN.z1 - WIN.z0 - 0.1); } pts.geometry.attributes.position.needsUpdate = true; }
    seedDrops(rain, 40); seedDrops(snow, 24);
    (function () { var a = stars.geometry.attributes.position.array; for (var i = 0; i < 14; i++) { var r = hash('star' + i); a[i * 3] = -R + 0.04; a[i * 3 + 1] = WIN.y0 + 0.2 + ((r >> 8) % 100) / 100 * (WIN.y1 - WIN.y0 - 0.3); a[i * 3 + 2] = WIN.z0 + 0.1 + (r % 100) / 100 * (WIN.z1 - WIN.z0 - 0.2); } stars.geometry.attributes.position.needsUpdate = true; })();
    var streaks = [];
    for (i = 0; i < 3; i++) { var sm = new T.Mesh(keep(new T.PlaneGeometry(0.05, 0.3)), basic(PAL.glass[3])); sm.rotation.y = Math.PI / 2; sm.position.set(-R + 0.05, WIN.y0 + 0.3 + i * 0.4, WIN.z0 + 0.3 + i * 0.4); scene.add(sm); streaks.push(sm); }
    function updateStars() { stars.visible = isNight() && st.weather === 'clear'; }
    function applyWeather() {
      var w = st.weather;
      rain.visible = w === 'rain' || w === 'drizzle'; rain.material.color.copy(C(w === 'drizzle' ? PAL.glass[1] : PAL.glass[2]));
      snow.visible = w === 'snow'; streaks.forEach(function (s, k) { s.visible = w === 'rain' || (w === 'drizzle' && k === 0); });
      updateStars();
    }
    function stepWeather(dt) {
      if (st.reduced) return;
      var w = st.weather, a, i, n;
      if (rain.visible) { a = rain.geometry.attributes.position.array; n = w === 'drizzle' ? 14 : 40; for (i = 0; i < 40; i++) { if (i >= n) { a[i * 3 + 1] = -5; continue; } a[i * 3 + 1] -= (w === 'drizzle' ? 1.6 : 3.2) * dt; if (a[i * 3 + 1] < WIN.y0) a[i * 3 + 1] = WIN.y1 - Math.random() * 0.3; } rain.geometry.attributes.position.needsUpdate = true; }
      if (snow.visible) { a = snow.geometry.attributes.position.array; for (i = 0; i < 24; i++) { a[i * 3 + 1] -= 0.45 * dt; a[i * 3 + 2] += Math.sin(time * 1.3 + i) * 0.15 * dt; if (a[i * 3 + 1] < WIN.y0) a[i * 3 + 1] = WIN.y1; } snow.geometry.attributes.position.needsUpdate = true; }
      streaks.forEach(function (s, k) { if (!s.visible) return; s.position.y -= (0.35 + k * 0.1) * dt; if (s.position.y < WIN.y0 + 0.15) s.position.y = WIN.y1 - 0.15; });
    }

    /* ── 소품 (§4) ── */
    var props = {}, propDecals = null;
    function addProp(key, mesh, decalR) { mesh.castShadow = true; mesh.visible = false; mesh.userData.decalR = decalR || 0; props[key] = mesh; scene.add(mesh); }
    addProp('moss', new T.Mesh(keep(mergeParts([{ g: new T.CylinderGeometry(0.17, 0.13, 0.24, 8), m: M(0, 0.12, 0), c: W[4] }, { g: new T.SphereGeometry(0.22, 8, 6), m: M(0, 0.3, 0, 0, 0, 0, 1, 0.6, 1), c: PAL.moss[2] }, { g: new T.SphereGeometry(0.12, 7, 5), m: M(0.1, 0.4, 0.06), c: PAL.moss[3] }])), lambert));
    props.moss.position.set(-R + 0.26, WIN.y0 + 0.04, WIN.z1 - 0.2);
    addProp('crate', new T.Mesh(keep(mergeParts([{ g: box(1.0, 0.72, 0.84), m: M(0, 0.36, 0), c: W[3] }, { g: box(1.04, 0.06, 0.88), m: M(0, 0.36, 0), c: W[2] }, { g: box(0.06, 0.74, 0.88), m: M(0, 0.37, 0), c: W[2] }])), lambert), 0.8);
    props.crate.position.set(snapPos(2.0), 0, snapPos(-0.75));
    var candleG = new T.Group(); candleG.position.set(2.05, 0.72, -0.8);
    candleG.add(new T.Mesh(keep(mergeParts([{ g: new T.CylinderGeometry(0.08, 0.08, 0.3, 7), m: M(0, 0.15, 0), c: PAL.paper[1] }, { g: box(0.03, 0.06, 0.03), m: M(0, 0.32, 0), c: PAL.ink }])), lambert));
    var flame = new T.Mesh(keep(new T.SphereGeometry(0.06, 6, 5)), basic(PAL.amber[4])); flame.position.y = 0.4; candleG.add(flame);
    var candleGlow = new T.Mesh(keep(new T.PlaneGeometry(0.5, 0.5)), glowMat); candleGlow.position.y = 0.4; candleGlow.renderOrder = 5; candleG.add(candleGlow);
    candleLight.position.set(2.05, 1.15, -0.8);
    addProp('candle', candleG);
    addProp('blanket', new T.Mesh(keep(mergeParts([{ g: box(1.4, 0.12, 1.0, 3, 1, 3), m: M(0, 0.06, 0), c: PAL.rose[1] }, { g: box(1.1, 0.05, 0.3), m: M(0, 0.13, -0.25), c: PAL.rose[2] }])), lambert));
    props.blanket.position.set(ANCHORS.blanket[0], 0, ANCHORS.blanket[2] + 0.1); props.blanket.castShadow = false;
    var BOARD = { x: 0.15, y: 1.8, z: -R + 0.08, w: 1.7, h: 1.25 };
    addProp('board', new T.Mesh(keep(mergeParts([{ g: box(BOARD.w, BOARD.h, 0.06), m: M(0, 0, 0), c: W[6] }, { g: box(BOARD.w + 0.1, 0.08, 0.08), m: M(0, BOARD.h / 2, 0), c: W[1] }, { g: box(BOARD.w + 0.1, 0.08, 0.08), m: M(0, -BOARD.h / 2, 0), c: W[1] }, { g: box(0.08, BOARD.h, 0.08), m: M(-BOARD.w / 2, 0, 0), c: W[1] }, { g: box(0.08, BOARD.h, 0.08), m: M(BOARD.w / 2, 0, 0), c: W[1] }])), lambert));
    props.board.position.set(BOARD.x, BOARD.y, BOARD.z); props.board.castShadow = false;
    var SHELF = { x: -1.55, y: 1.7, z: -R + 0.22 };
    addProp('shelf', new T.Mesh(keep(mergeParts([{ g: box(1.5, 0.07, 0.4), m: M(0, 0, 0), c: W[2] }, { g: box(0.08, 0.3, 0.3), m: M(-0.6, -0.18, -0.05), c: W[1] }, { g: box(0.08, 0.3, 0.3), m: M(0.6, -0.18, -0.05), c: W[1] }])), lambert));
    props.shelf.position.set(SHELF.x, SHELF.y, SHELF.z);
    addProp('curtain', new T.Mesh(keep(mergeParts([{ g: new T.CylinderGeometry(0.03, 0.03, 2.6, 5), m: M(0, WIN.y1 + 0.25, 0.6, Math.PI / 2, 0, 0), c: W[1] }, { g: box(0.08, 1.5, 0.5, 1, 4, 2), m: M(0, WIN.y1 - 0.5, WIN.z0 - 0.3), c: PAL.navy[4] }, { g: box(0.08, 1.5, 0.5, 1, 4, 2), m: M(0, WIN.y1 - 0.5, WIN.z1 + 0.3), c: PAL.navy[4] }])), lambert));
    props.curtain.position.set(-R + 0.18, 0, 0); props.curtain.castShadow = false;
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
    var posterMeshes = [], posterMat = keep(new T.MeshLambertMaterial({ color: C(PAL.paper[1]) })), lastPosterCount = 0;
    function posterSlot(i) { return [BOARD.x - 0.54 + (i % 3) * 0.54, BOARD.y + 0.3 - Math.floor(i / 3) * 0.6, BOARD.z + 0.05]; }
    function setPosters(list) {
      list = (list || []).slice(-6);
      var keepIds = {};
      list.forEach(function (p) { keepIds[p.id] = p; });
      posterMeshes = posterMeshes.filter(function (m) { if (keepIds[m.userData.id]) return true; scene.remove(m); if (m.material !== posterMat) { if (m.material.map) m.material.map.dispose(); m.material.dispose(); } return false; });
      list.forEach(function (p, i) {
        var m = posterMeshes.filter(function (x) { return x.userData.id === p.id; })[0];
        if (!m) {
          m = new T.Mesh(posterGeo, posterMat); m.userData = { kind: 'poster', id: p.id }; m.castShadow = false;
          scene.add(m); posterMeshes.push(m);
          bakeSVG(p.tex || p.svg, 48, 64).then(function (tex) { if (!tex || !m.parent) return; m.material = new T.MeshLambertMaterial({ map: tex }); });
        }
        var s = posterSlot(i); m.position.set(s[0], s[1], s[2]); m.rotation.z = ((hash(p.id) % 7) - 3) * 0.02;
      });
      lastPosterCount = list.length; container.dataset.posters = String((list || []).length);
    }
    var posterGeo = keep(new T.PlaneGeometry(0.42, 0.56));
    var souvMeshes = [], souvMats = {};
    function souvMat(hex) { return souvMats[hex] || (souvMats[hex] = keep(new T.MeshLambertMaterial({ color: C(hex) }))); }
    function setSouvenirs(list) {
      souvMeshes.forEach(function (m) { scene.remove(m); });
      souvMeshes = [];
      var cols = [PAL.amber[3], PAL.moss[2], PAL.sky[2], PAL.dusk[2], PAL.rose[2], PAL.paper[2]];
      (list || []).slice(-8).forEach(function (sv) {
        var r = hash(sv.id), shape = r % 3, g = shape === 0 ? new T.SphereGeometry(0.11, 7, 5) : shape === 1 ? box(0.18, 0.18, 0.18) : new T.CylinderGeometry(0.02, 0.11, 0.22, 6);
        var m = new T.Mesh(keep(g), souvMat(cols[(r >> 4) % cols.length])); m.userData = { kind: 'souvenir', sv: sv, h: shape === 0 ? 0.11 : shape === 1 ? 0.09 : 0.11 }; m.castShadow = true;
        scene.add(m); souvMeshes.push(m);
      });
      layoutSouvenirs();
    }
    function layoutSouvenirs() {
      var shelf = st.items.indexOf('shelf') >= 0;
      souvMeshes.forEach(function (m, i) {
        if (shelf) m.position.set(SHELF.x - 0.6 + (i % 6) * 0.24, SHELF.y + 0.035 + m.userData.h, SHELF.z + (i >= 6 ? -0.1 : 0.05));
        else m.position.set(-R + 0.26, WIN.y0 + 0.04 + m.userData.h, WIN.z0 + 0.15 + (i % 3) * 0.26);
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
    var headGeo = keep(mergeParts(headParts)), head = new T.Mesh(headGeo, toon); head.castShadow = true; bodyG.add(head);
    var pupils = EYE.map(function (e) {   /* 동공 0.13 r + 흰 글린트 1px */
      var g = keep(mergeParts([{ g: new T.SphereGeometry(PUPIL_R, 8, 6), m: M(0, 0, 0), c: OC.eye }, { g: new T.SphereGeometry(0.055, 5, 4), m: M(-0.045, 0.05, 0.105), c: OC.white }]));
      var m = new T.Mesh(g, toon); m.position.set(e[0], e[1], e[2] + 0.14); bodyG.add(m); return m;
    });
    var lidGeo = keep(mergeParts(EYE.map(function (e) { return { g: new T.SphereGeometry(EYE_R + 0.03, 10, 8), m: M(e[0], e[1], e[2] + 0.01, 0, 0, 0, 1, 1, 0.6), c: OC.body, tag: 1 }; })));
    var lids = new T.Mesh(lidGeo, toon); lids.visible = false; bodyG.add(lids);
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
      var arm = new T.Mesh(keep(mergeParts(armParts())), toon); arm.castShadow = true;
      arm.position.set(ARM_ROOT[0] * Math.cos(a), ARM_ROOT[1], ARM_ROOT[0] * Math.sin(a)); arm.rotation.set(0, -a, 0); arm.userData.a = a; bodyG.add(arm); arms.push(arm);
    }
    var hit = new T.Mesh(keep(new T.SphereGeometry(1.6, 8, 6)), keep(new T.MeshBasicMaterial({ visible: false }))); hit.position.y = 0.7; hit.userData.kind = 'oct'; bodyG.add(hit);   /* 반지름 0.67 m ≈ 72 CSS px (p=3) ≥ 44 */
    var carry = new T.Mesh(posterGeo, posterMat); carry.position.set(1.0, 0.95, 0.6); carry.rotation.set(0, 0.5, 0.15); carry.scale.setScalar(1.6); carry.visible = false; bodyG.add(carry);
    var octDecal = new T.Mesh(keep(new T.PlaneGeometry(3.2, 3.2)), decalMat); octDecal.rotation.x = -Math.PI / 2; octDecal.position.y = 0.01; octDecal.renderOrder = 1; octG.add(octDecal);   /* 접지 그림자 1.34 m (다리 끝까지) */
    var oct = { anchor: 'window', walking: null, faceYaw: 0, wantYaw: 0, blinkT: 2 + Math.random() * 4, blinkLeft: 0, animT: 0, hop: 0, flushK: 0, pointer: null, lookTarget: null };
    var octTags = [headGeo, lidGeo].concat(arms.map(function (m) { return m.geometry; }));
    function octColor(hex) { octTags.forEach(function (g) { recolor(g, 1, hex); }); }
    function setColor(hex) {
      if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return;
      st.color = hex; OC = octDerived(hex); PAL = buildPalette(hex); uploadPalette();
      octColor(hex); recolor(headGeo, 2, OC.hi); recolor(headGeo, 3, OC.mouth); recolor(blush.geometry, 2, OC.hi);
      arms.forEach(function (m) { recolor(m.geometry, 4, OC.pale); });
      oct.wiggle = 0.7;   /* 색을 바꾸면 한 번 흔들 (§14) */
    }
    function anchorPos(name) { var p = ANCHORS[name] || ANCHORS.center; return new T.Vector3(p[0], name === 'blanket' && st.items.indexOf('blanket') >= 0 ? 0.12 : 0, p[2]); }
    function camYaw() { return YAW + yawDelta(); }
    function jumpTo(anchor) { if (oct.walking) { oct.walking.cancel(); oct.walking = null; } oct.anchor = anchor; octG.position.copy(anchorPos(anchor)); oct.wantYaw = oct.faceYaw = camYaw(); }
    function moveTo(anchor) {
      var to = anchorPos(anchor), from = octG.position.clone();
      oct.anchor = anchor;
      if (oct.walking) { oct.walking.cancel(); oct.walking = null; }
      var d = to.clone().sub(from), dist = d.length();
      function done() { if (on.anchorReached) on.anchorReached(anchor); }
      if (st.reduced || dist < 0.05) { octG.position.copy(to); oct.wantYaw = camYaw(); done(); return Promise.resolve(anchor); }
      oct.wantYaw = Math.atan2(d.x, d.z);
      var dur = dist / 1.2 * st.speed, hopDur = 0.3 * st.speed, k = 0, cancelled = false;
      return new Promise(function (resolve) {
        oct.walking = { cancel: function () { cancelled = true; }, step: function (dt) {
          if (cancelled) return;
          k += dt;
          if (k < dur) { octG.position.lerpVectors(from, to, k / dur); return; }
          var hk = (k - dur) / hopDur;
          if (hk < 1) { octG.position.copy(to); oct.hop = Math.sin(hk * Math.PI) * 0.4; return; }
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
      if (s === 'carry') { carry.visible = true; if (extra && extra.svg) bakeSVG(extra.svg, 48, 64).then(function (t) { if (t) carry.material = new T.MeshLambertMaterial({ map: t }); }); }
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
      /* 방향 */
      var dy = oct.wantYaw - oct.faceYaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      oct.faceYaw += red ? dy : dy * Math.min(1, dt * 8); octG.rotation.y = oct.faceYaw;
      /* 몸 */
      var sx = 1, sy = 1, by = oct.hop, walking = s === 'walk' || s === 'carry';
      if (!red) {
        if (s === 'idle' || s === 'stay') { sy = 1 - 0.03 * (0.5 + 0.5 * Math.sin(t * Math.PI / 2)); sx = 1 + 0.02 * (0.5 + 0.5 * Math.sin(t * Math.PI / 2)); }
        if (s === 'sleep') { sy = 0.95 - 0.02 * Math.sin(t * Math.PI / 2.5); sx = 1.03; }
        if (walking && oct.walking) { by += Math.abs(Math.sin(t * 10)) * 0.1; sy = 1 + 0.03 * Math.sin(t * 20); }
        if (s === 'anticipate') { var ak = Math.min(1, oct.animT / 0.6); sx = 1 + 0.05 * ak; sy = 1 - 0.08 * ak; }
        if (s === 'pet') { var pk = 0.5 + 0.5 * Math.sin(t * Math.PI / 0.6); sx = 1 + 0.06 * pk; sy = 1 - 0.06 * pk; }
        if (s === 'peek') bodyG.rotation.z = Math.sin(t * 4.5) * 0.12; else bodyG.rotation.z *= 0.8;
        if (s === 'happy' && oct.hopsLeft > 0) { var hk = (oct.animT % 0.45) / 0.45; by += Math.sin(hk * Math.PI) * 0.5; if (oct.animT > 0.9) oct.hopsLeft = 0; }
        if (oct.wiggle > 0) { oct.wiggle -= dt; bodyG.rotation.z = Math.sin(oct.wiggle * 30) * 0.1 * oct.wiggle; }
      } else if (s === 'sleep') sy = 0.95;
      bodyG.scale.set(sx, sy, sx); bodyG.position.y = by;
      /* 다리 */
      for (var i = 0; i < 8; i++) {
        var arm = arms[i], base = 0;   /* 0 = 끝이 바닥에 닿은 자세. 흔들림은 위로만 (바닥을 뚫지 않게) */
        if (red) { arm.rotation.z = base; continue; }
        if (walking && oct.walking) arm.rotation.z = base + (0.5 + 0.5 * Math.sin(t * 10 + (i % 2) * Math.PI)) * 0.35;
        else if (s === 'sleep') arm.rotation.z = base + 0.02 + Math.sin(t * 1.2 + i) * 0.02;
        else arm.rotation.z = base + 0.05 + Math.sin(t * 2.6 + i * 0.8) * 0.05;
      }
      /* 눈 깜빡임 · 동공 */
      if (s !== 'sleep' && s !== 'pet' && s !== 'away') {
        oct.blinkT -= dt;
        if (oct.blinkT <= 0) { oct.blinkLeft = 0.13; oct.blinkT = 3 + Math.random() * 4; }
        if (oct.blinkLeft > 0) { oct.blinkLeft -= dt; lids.visible = true; pupils[0].visible = pupils[1].visible = false; }
        else { lids.visible = false; pupils[0].visible = pupils[1].visible = true; }
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
    function frame(ts) {
      var dt = lastT ? Math.min(0.1, (ts - lastT) / 1000) : 0.016; lastT = ts; time += dt; frameNo++;
      if (st.lost) return;
      var idle = (st.octState === 'idle' || st.octState === 'sleep' || st.octState === 'stay') && !oct.walking && !dragging && light.t >= 1 && dither.still > 0.3;
      if (idle && (frameNo & 1)) return;   /* 가만히 있을 땐 30fps */
      if (light.t < 1) { light.t = Math.min(1, light.t + dt / light.dur); applyLight(); if (light.t >= 1) light.from = null; }
      if (lampDirty) applyLamp();
      if (!st.reduced && st.lantern > 0) { lampGlow.material.opacity = 0.3 + 0.05 * st.lantern + Math.sin(time * 2) * 0.03; }
      if (props.candle.visible) { candleT += dt; var fl = 0.5 + Math.sin(candleT * 9.1) * 0.08 + Math.sin(candleT * 23.7) * 0.05; candleLight.intensity = (st.reduced ? 0.5 : fl) * (light.lampK || 1); flame.scale.y = st.reduced ? 1 : 1 + (fl - 0.5) * 2; candleGlow.visible = true; } else candleLight.intensity = 0;
      dither.still = Math.min(1, dither.still + dt);
      post.uniforms.uDither.value = ditherNow();
      stepWeather(dt); stepOct(dt); stepHang(dt);
      lampGlow.quaternion.copy(camera.quaternion); candleGlow.quaternion.copy(camera.quaternion);
      placeCamera(); updateOverlay();
      renderer.shadowMap.needsUpdate = true;
      renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, camera);
      calls = renderer.info.render.calls;
      scene.overrideMaterial = normalMat; var bg = scene.background; scene.background = null;
      renderer.setRenderTarget(rtN); renderer.clear(); renderer.render(scene, camera);
      scene.overrideMaterial = null; scene.background = bg;
      calls += renderer.info.render.calls;
      renderer.setRenderTarget(null); renderer.render(quadScene, quadCam);
      calls += 1;
      if (!logged && frameNo > 3) { logged = true; console.info('[scene3d] draw calls ' + calls + ' (≤150 ' + (calls <= 150 ? 'ok' : 'OVER') + ') · target ' + S.rw + '×' + S.rh + ' · px ' + S.p + ' · palette ' + PAL.list.length); }
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
      setReducedMotion: function (r) { st.reduced = !!r; },
      setLook: function (o) {
        var re = false;
        if (o.pixelSize != null && (o.pixelSize | 0) !== st.look.pixelSize) { st.look.pixelSize = clamp(o.pixelSize | 0, 1, 4); re = true; }
        if (o.dither != null) { st.look.dither = clamp(+o.dither, 0, 1); dither.base = st.look.dither * 0.08; }
        if (o.outline != null) { st.look.outline = !!o.outline; post.uniforms.uOutline.value = st.look.outline && hasDepthTex ? 1 : 0; }
        if (o.yaw != null) { st.look.yaw = clamp(+o.yaw, -25, 25); dither.still = 0; }
        if (o.zoom != null) { var z = clamp(o.zoom | 0, 0, ZOOM_STEPS.length - 1); if (z !== st.zoom) { st.zoom = z; re = true; } }
        if (o.focus !== undefined) { st.look.focus = o.focus === 'oct' ? 'oct' : null; dither.still = 0; }   /* 줌 단계 0..3 (핀치/휠과 같은 단계, look-shots 의 close 용) */
        if (re) { resize(); dither.still = 0; }
      },
      palette: function () { var out = RAMPS.map(function (r) { return { name: r[0], colors: PAL[r[0]] }; }); out.push({ name: 'fixed', colors: [PAL.ink, PAL.white, PAL.night] }); out.push({ name: 'oct', colors: PAL.oct }); return out; },
      stats: function () { return { calls: calls, target: [S.rw, S.rh], pixel: S.p, palette: PAL.list.length, hasDepthTex: hasDepthTex, zoom: ZOOM_STEPS[st.zoom] }; },
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

  return { supported: supported, init: init, buildPalette: buildPalette, ramp: ramp, hexToOklab: hexToOklab, ANCHORS: ANCHORS };
})();
