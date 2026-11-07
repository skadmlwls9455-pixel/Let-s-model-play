# three.js r128 UMD 로 픽셀아트 룩 만들기 — 실전 레시피 (뽈뽈 문어 다락방)

전제: 전역 `THREE`(r128, `vendor/three.min.js` — 파일 안의 `"128"` 확인됨; 없으면 `https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js` [이 세션에서 cdnjs 접속 불가, 경로 형식만 표준]), **모듈 없음, 빌드 없음, file:// 에서 동작**. 외부 UMD 추가 파일(EffectComposer 등)도 **쓰지 않는다** — 후처리는 40줄짜리 자작 풀스크린 패스 하나로 끝난다. 아래 코드는 모두 `scene3d.js` 안에서 전역 `THREE` 만 쓴다.

수치 요약(DESIGN §7.0 과 일치): 아트 픽셀 **p=3**(설정 1~4) · 렌더 타깃 **⌊W/p⌋×⌊H/p⌋**(360×740 폰 → 120×246; 데스크톱은 폭 480 이하로 클램프) · 팔레트 **48~64색, OKLab 최근접** · **Bayer 4×4**, 세기 = 램프 L 간격의 ~0.4 · **깊이 텍스처 24-bit 1px 외곽선**, 임계 6 cm · **직교 다이메트릭** 카메라(틸트 32°, 요 45°), 타깃을 아트 픽셀 격자에 스냅 · `setPixelRatio(1)`, 섀도맵 1024, ≤150 드로우콜 · 모션 감소/비-WebGL 폴백 있음.

---

## 0. 왜 이 구조인가 (한 번만)

- 장면을 **작은 렌더 타깃**에 그린 뒤 **한 번의 풀스크린 패스**에서 (1) 색을 OKLab 으로 바꿔 (2) Bayer 오프셋을 더하고 (3) 팔레트 최근접으로 스냅하고 (4) 깊이 텍스처로 외곽선을 긋고 (5) 캔버스 크기로 Nearest 업스케일한다. three.js 공식 `RenderPixelatedPass`(r150+, ESM) 가 하는 일과 같되, 팔레트 스냅과 디더를 더했고 r128 UMD 에 맞춰 ShaderMaterial 하나로 썼다.
- EffectComposer 를 쓰지 않는 이유: r128 `examples/js/postprocessing/{Pass,EffectComposer,RenderPass,ShaderPass}.js` + `shaders/CopyShader.js` 는 r128 에 **존재**(HTTP 200 확인)하지만 UMD 파일 5개를 더 실어야 하고, EffectComposer 는 타깃을 `clone()` 해 두 장을 들며 depthTexture 참조를 공유해 꼬인다. 패스가 1개면 손으로 쓰는 게 짧고 안전하다.

## 1. 크기 공식

```js
// W,H = 캔버스가 차지할 CSS px (컨테이너 clientWidth/Height). p = 아트 픽셀(1~4, 기본 3)
function sizes(W, H, p) {
  // 큰 화면에서도 저해상 폭을 480 이하로 유지해 룩을 일정하게
  p = Math.max(p, Math.ceil(W / 480));
  const rw = Math.floor(W / p), rh = Math.floor(H / p);   // 렌더 타깃
  return { p, rw, rh, cw: rw * p, ch: rh * p };           // 캔버스 버퍼 = 정수배 → 흔들림 없음
}
renderer.setPixelRatio(1);                 // 디바이스 픽셀 비율 무시 (브라우저가 CSS 로 확대)
renderer.setSize(cw, ch, false);           // 버퍼만 설정, CSS 는 아래에서
canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';  // 컨테이너와 ≤ p-1 px 차이 → 가운데 정렬
canvas.style.imageRendering = 'pixelated'; // dpr 2~3 폰에서 브라우저 업스케일도 Nearest
```
예: 360×740, p=3 → 타깃 120×246(약 3만 픽셀 — 셰이더 비용은 무시 수준, 장면 패스도 이 해상도로 돌아서 폰에서 넉넉). 1280×720, p=3 → 426×240. 핀치/휠 줌은 p 를 바꾸지 말고 **카메라의 m당 아트픽셀 수 N 을 정수 단계로**(§5).

## 2. 렌더 타깃 + 깊이 텍스처 (r128)

```js
const rt = new THREE.WebGLRenderTarget(rw, rh, {
  minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
  format: THREE.RGBAFormat, type: THREE.UnsignedByteType,
  depthBuffer: true, stencilBuffer: false,
  depthTexture: new THREE.DepthTexture(rw, rh, THREE.UnsignedIntType) // 24-bit. 기본 UnsignedShortType(16-bit)는 외곽선 노이즈
});
rt.texture.encoding = THREE.sRGBEncoding;   // ↓ 설명
rt.texture.generateMipmaps = false;
// 크기 변경: rt.setSize(rw, rh) 는 depthTexture 크기도 함께 갱신한다(r128 WebGLRenderTarget.setSize).
```
- r128 에서 **렌더 타깃에 그릴 때의 출력 인코딩은 `renderer.outputEncoding` 이 아니라 `rt.texture.encoding`** 이다(`src/renderers/webgl/WebGLPrograms.js` r128 174행: `outputEncoding: (currentRenderTarget !== null) ? getTextureEncodingFromMap(currentRenderTarget.texture) : renderer.outputEncoding`). 그래서 `sRGBEncoding` 을 주면 내장 재질이 8-bit 에 **지각적(sRGB)** 으로 저장해 어두운 영역 밴딩이 줄고, 후처리 셰이더는 sRGB→선형→OKLab 으로 디코드한다. (대안: `HalfFloatType` + Linear 저장. WebGL1 폰에서는 확장이 필요하므로 위 방식이 안전.)
- `depthTexture` 옵션은 r128 생성자가 받는다(`WebGLRenderTarget.js` 40행). WebGL1 에서는 `WEBGL_depth_texture` 확장이 필요 — 거의 모든 폰이 지원하지만, 없으면 외곽선만 끈다:
```js
const hasDepthTex = renderer.capabilities.isWebGL2 || !!renderer.extensions.get('WEBGL_depth_texture');
post.uniforms.uOutline.value = hasDepthTex ? 1.0 : 0.0;
```
  (정말 필요하면 `MeshDepthMaterial({depthPacking: THREE.RGBADepthPacking})` 오버라이드로 두 번째 패스를 그리고 `#include <packing>` 의 `unpackRGBAToDepth` 로 읽는 우회가 r128 에 있다.)

## 3. 풀스크린 패스 (EffectComposer 없이)

r128 `examples/js/postprocessing/Pass.js` 의 `FullScreenQuad` 가 하는 일을 그대로 쓴다(확인: 꼭짓점 `[-1,3,0, -1,-1,0, 3,-1,0]` 거대 삼각형 1개 + `OrthographicCamera(-1,1,1,-1,0,1)`).

```js
const quadGeo = new THREE.BufferGeometry();
quadGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3));
quadGeo.setAttribute('uv',       new THREE.Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2));
const quadCam   = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const quadScene = new THREE.Scene();
const quad = new THREE.Mesh(quadGeo, postMat); quad.frustumCulled = false; quadScene.add(quad);

function frame() {
  renderer.setRenderTarget(rt);  renderer.clear(); renderer.render(scene, camera);   // 장면 → 저해상
  renderer.setRenderTarget(null);                   renderer.render(quadScene, quadCam); // 후처리 → 캔버스
}
```

`postMat` (ShaderMaterial; `#include <packing>` 은 ShaderMaterial 에서도 치환된다 — r128 `WebGLProgram.js` `resolveIncludes`, 공식 `webgl_depth_texture` 예제가 같은 방식):

```js
const PAL_MAX = 64;
const postMat = new THREE.ShaderMaterial({
  depthTest: false, depthWrite: false,
  uniforms: {
    tDiffuse: { value: rt.texture }, tDepth: { value: rt.depthTexture },
    uRes:     { value: new THREE.Vector2(rw, rh) },          // 저해상 크기
    uNear:    { value: camera.near }, uFar: { value: camera.far },
    uPalOk:   { value: new Float32Array(PAL_MAX * 3) },      // OKLab (검색용)
    uPalRgb:  { value: new Float32Array(PAL_MAX * 3) },      // sRGB 0..1 (출력용) — 인코딩 계산 불필요
    uPalN:    { value: 0 },
    uW:       { value: new THREE.Vector3(1, 1, 1) },         // 거리 가중 (L, a, b)
    uDither:  { value: 0.03 },       // OKLab L 단위. 램프 L 간격(≈0.08)의 0.4 정도
    uBayer:   { value: bayerTex() }, // 4×4 DataTexture (아래)
    uOutline: { value: 1.0 }, uEdgeM: { value: 0.06 },       // 외곽선 켬, 임계 6 cm (월드 m)
    uOutlineL:{ value: 0.55 }        // 외곽선 = 그 픽셀 L 을 55% 로 깎고 스냅 → 램프의 가장 어두운 칸이 선이 됨
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: FRAG // §4
});
```

## 4. GLSL 조각

### 4.1 sRGB ↔ 선형 (정확식)
```glsl
vec3 srgbToLinear(vec3 c){ // IEC 61966-2-1
  vec3 lo = c / 12.92;
  vec3 hi = pow((c + 0.055) / 1.055, vec3(2.4));
  return mix(lo, hi, step(vec3(0.04045), c));
}
```
(출력은 팔레트의 sRGB 값을 그대로 쓰므로 역변환은 CPU 쪽 램프 생성에서만 필요 — §6.)

### 4.2 선형 RGB → OKLab (Ottosson 계수; culori `convertLrgbToOklab.js` 에서 그대로 읽음)
```glsl
vec3 linToOklab(vec3 c){
  c = max(c, vec3(0.0));
  float l = 0.412221469470763  * c.r + 0.5363325372617348 * c.g + 0.0514459932675022 * c.b;
  float m = 0.2119034958178252 * c.r + 0.6806995506452344 * c.g + 0.1073969535369406 * c.b;
  float s = 0.0883024591900564 * c.r + 0.2817188391361215 * c.g + 0.6299787016738222 * c.b;
  l = pow(l, 1.0/3.0); m = pow(m, 1.0/3.0); s = pow(s, 1.0/3.0);   // 입력이 ≥0 이므로 cbrt 대신 pow 가능
  return vec3(0.210454268309314  * l + 0.7936177747023054 * m - 0.0040720430116193 * s,
              1.9779985324311684 * l - 2.4285922420485799 * m + 0.450593709617411  * s,
              0.0259040424655478 * l + 0.7827717124575296 * m - 0.8086757549230774 * s);
}
```
OKLab → 선형 RGB (CPU, 램프 만들 때; culori `convertOklabToLrgb.js`):
```js
function oklabToLinear([L, a, b]) {
  const l = (L + 0.3963377773761749 * a + 0.2158037573099136 * b) ** 3;
  const m = (L - 0.1055613458156586 * a - 0.0638541728258133 * b) ** 3;
  const s = (L - 0.0894841775298119 * a - 1.2914855480194092 * b) ** 3;
  return [ 4.0767416360759574 * l - 3.3077115392580616 * m + 0.2309699031821044 * s,
          -1.2684379732850317 * l + 2.6097573492876887 * m - 0.3413193760026573 * s,
          -0.0041960761386756 * l - 0.7034186179359362 * m + 1.7076146940746117 * s ];
}
```

### 4.3 Bayer 4×4
표준 행렬(0..15):
```
 0  8  2 10
12  4 14  6
 3 11  1  9
15  7 13  5
```
WebGL1(GLSL ES 1.0)에서는 `const float[16]` 을 변수 인덱스로 읽는 게 드라이버에 따라 막히므로 **4×4 DataTexture** 로 넣고 저해상 픽셀 좌표로 샘플한다(1줄, 반복 랩):
```js
function bayerTex(){
  const m = [0,8,2,10, 12,4,14,6, 3,11,1,9, 15,7,13,5];
  const data = new Uint8Array(16 * 4); m.forEach((v, i) => { data[i*4] = v * 16; data[i*4+3] = 255; });
  const t = new THREE.DataTexture(data, 4, 4, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.magFilter = t.minFilter = THREE.NearestFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true;
  return t;
}
```
```glsl
// ap = 저해상(아트 픽셀) 정수 좌표. 결과 -0.5..+0.47 (평균 0)
float bayer(vec2 ap){ return texture2D(uBayer, (ap + 0.5) / 4.0).r * (255.0/256.0) + (0.5/16.0) - 0.5; }
```
(참고 구현: niccolofanton/dithering-shader 는 임계값을 (M+1)/17 로, WoodNeck 는 (M)/16 으로 둔다 — 상수는 취향, 패턴은 같다.) **디더는 스냅 전에 L 에만 더한다.** 카메라가 움직이면 화면 고정 패턴이 "기어간다"(Obra Dinn 교훈) → 드래그/줌 중에는 `uDither` 를 0 으로 내리고 300 ms 안에 복귀, `prefers-reduced-motion` 이면 0 고정.

### 4.4 팔레트 최근접 (OKLab, 유니폼 배열 루프)
```glsl
uniform vec3 uPalOk[64]; uniform vec3 uPalRgb[64]; uniform int uPalN;
uniform vec3 uW; // 거리 가중 (L, a, b) 기본 (1,1,1); 색상 보존을 더 원하면 (0.8,1.2,1.2)
vec3 snapPalette(vec3 ok, out vec3 outRgb){
  float best = 1e9; int bi = 0;
  for (int i = 0; i < 64; i++) {           // WebGL1: 상수 상한 + break
    if (i >= uPalN) break;
    vec3 d = (ok - uPalOk[i]) * uW; float dd = dot(d, d);
    if (dd < best) { best = dd; bi = i; }
  }
  outRgb = uPalRgb[bi];   // 유니폼 배열은 GLSL ES 1.0 에서도 변수 인덱스 허용 (지역 const 배열만 제한)
  return uPalOk[bi];
}
```
비용: 64회 × 3만 픽셀 ≈ 2M 연산/프레임 — 폰 GPU 에 무시 수준. 더 줄이려면 WoodNeck 식 **LUT**(RGB 각 16단계 → 4096항목 → 64×64 텍스처, CPU 에서 최근접 미리 계산, 픽셀당 텍스처 1회) 로 바꿀 수 있다.

### 4.5 깊이 외곽선 (직교 카메라 → 깊이가 이미 선형)
```glsl
#include <packing>
uniform sampler2D tDepth; uniform vec2 uRes; uniform float uNear, uFar, uEdgeM, uOutline;
float viewDepthM(vec2 uv){ // 카메라에서 떨어진 거리(m, 양수)
  float d = texture2D(tDepth, uv).r;                           // 0..1, 직교면 선형
  return -orthographicDepthToViewZ(d, uNear, uFar);            // packing 청크 (r128 확인)
}
// 이웃이 "더 멀" 때만 선 → 앞 물체의 실루엣 안쪽 1px 에 선이 앉는다 (RenderPixelatedPass 와 같은 규칙)
float edge(vec2 uv){
  vec2 px = 1.0 / uRes; float d0 = viewDepthM(uv); float diff = 0.0;
  diff += max(viewDepthM(uv + vec2( px.x, 0.0)) - d0, 0.0);
  diff += max(viewDepthM(uv + vec2(-px.x, 0.0)) - d0, 0.0);
  diff += max(viewDepthM(uv + vec2(0.0,  px.y)) - d0, 0.0);
  diff += max(viewDepthM(uv + vec2(0.0, -px.y)) - d0, 0.0);
  return step(uEdgeM, diff) * uOutline;        // 6 cm 이상 튀면 1
}
```
원근 카메라를 쓰게 되면 `perspectiveDepthToViewZ` 로 바꾸면 끝. (선택) **노멀 에지 하이라이트**: `scene.overrideMaterial = new THREE.MeshNormalMaterial()` 로 두 번째 저해상 패스를 그려 `tNormal` 을 넘기고, CBerry22 `outline.gdshader` 의 규칙 — 노멀 차 `dot(n-nn, vec3(1))` 임계 0.6, 빛을 향한 면은 ×1.5 밝게·등진 면은 ×0.3 어둡게, 바깥 실루엣은 깊이 역차 0.25 로 마스킹 — 를 이식하면 셀 룩이 산다. 드로우콜이 2배가 되니 **폰 기본 OFF**, 데스크톱 옵션.

### 4.6 main — 순서가 핵심
```glsl
void main(){
  vec2 ap = floor(vUv * uRes);                      // 아트 픽셀 좌표
  vec3 c  = texture2D(tDiffuse, vUv).rgb;           // sRGB 저장분
  vec3 ok = linToOklab(srgbToLinear(c));            // → OKLab
  ok.x += bayer(ap) * uDither;                      // 1) 디더 (L 에만)
  ok.x *= mix(1.0, uOutlineL, edge(vUv));           // 2) 외곽선: L 55% 로 깎기
  vec3 rgb; snapPalette(ok, rgb);                   // 3) 팔레트 스냅 → 모든 픽셀이 팔레트 안
  gl_FragColor = vec4(rgb, 1.0);                    // uPalRgb 는 이미 sRGB → 추가 인코딩 없음
}
```
외곽선을 "깎고 스냅"하면 선 색이 항상 그 램프의 최저 칸이 되어 팔레트가 깨지지 않는다(고정 근검정 `#1b1522` 로 덮어도 되지만 그러면 외곽선 색이 하나뿐이라 밤 장면에서 떠 보인다).

## 5. 픽셀 스냅 직교 카메라

```js
const TILT = THREE.MathUtils.degToRad(32), YAW = THREE.MathUtils.degToRad(45);  // 다이메트릭
const DIST = 20;                                   // 직교라 거리는 임의. near 0.1, far 60 → 24-bit 깊이로 충분
let N = 50;                                        // 1 m = 50 아트 픽셀 (줌 단계 {40, 50, 64, 80} 정수만)
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 60);
function fitCamera(rw, rh){ camera.left = -rw/2/N; camera.right = rw/2/N; camera.top = rh/2/N; camera.bottom = -rh/2/N; camera.updateProjectionMatrix(); }
const _off = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3();
function placeCamera(target, yawDelta /* 드래그 ±25° */){
  _off.set(0, 0, DIST).applyAxisAngle(new THREE.Vector3(1,0,0), -TILT).applyAxisAngle(new THREE.Vector3(0,1,0), YAW + yawDelta);
  camera.position.copy(target).add(_off); camera.lookAt(target); camera.updateMatrixWorld();
  // 타깃을 카메라 우/상 축 기준으로 1/N m 격자에 스냅 → 패닝/추적 중 "픽셀 크리프" 제거
  _r.setFromMatrixColumn(camera.matrixWorld, 0); _u.setFromMatrixColumn(camera.matrixWorld, 1);
  const dx = target.dot(_r), dy = target.dot(_u);
  camera.position.addScaledVector(_r, Math.round(dx*N)/N - dx).addScaledVector(_u, Math.round(dy*N)/N - dy);
  camera.updateMatrixWorld();
}
```
- 120×246 타깃, N=50 → 화면이 2.4 m × 4.9 m 를 담는다(다락방 폭 ~4.5 m 는 N=40 에서 다 보이고, 기본 N=50 은 문어 쪽으로 살짝 당긴 느낌). 카메라는 벽 높이보다 위에 두어 벽이 문어를 가리지 않게(DESIGN).
- 기하는 월드 좌표라 가장자리가 텍셀 경계에 안 떨어지는 건 3D 의 본질 — 평면색 재질이면 거의 안 보인다. 텍스처는 쓰지 않는다(절차적 색만).

## 6. 팔레트 구성 (48~64색) — 전부 코드로 생성

원칙: **램프(ramp) 단위**로 만든다. 한 램프 = 기준색 1 + L 을 일정 간격으로 올리고/내리며 **그림자는 보라·파랑 쪽, 하이라이트는 노랑 쪽으로 색상 이동**(pickdani "diorama" 팔레트·고전 픽셀아트의 hue-shift). OKLab 에서 L 과 (a,b) 를 조절하고 §4.2 역변환으로 sRGB 로 돌린다.

```js
// hex → OKLab
function hexToOklab(hex){ const r=parseInt(hex.slice(1,3),16)/255, g=parseInt(hex.slice(3,5),16)/255, b=parseInt(hex.slice(5,7),16)/255;
  const lin = [r,g,b].map(v => v <= 0.04045 ? v/12.92 : ((v+0.055)/1.055)**2.4); return linToOklabJS(lin); } // §4.2 를 JS 로 옮긴 것
function linToSrgb(v){ v = Math.min(Math.max(v,0),1); return v <= 0.0031308 ? v*12.92 : 1.055*v**(1/2.4) - 0.055; }
// 램프: n칸, 가운데가 base. dL = 칸당 밝기 간격, shift = 칸당 (a,b) 이동 (그림자 → -b 파랑/보라, 하이라이트 → +b 노랑)
function ramp(hex, n, dL = 0.085, shift = [0.004, 0.012]) {
  const [L, a, b] = hexToOklab(hex), mid = (n - 1) / 2, out = [];
  for (let i = 0; i < n; i++) { const k = i - mid;
    out.push(oklabToLinear([Math.min(Math.max(L + k*dL, 0.05), 0.98), a + k*shift[0]*0.5, b + k*shift[1]]).map(linToSrgb)); }
  return out; // sRGB 0..1 배열. uPalRgb 로 그대로, uPalOk 는 다시 hexToOklab 과 같은 경로로
}
```

기본 팔레트 제안(53색; 등불 램프와 밤 램프는 **같은 L 영역을 비켜** 두어 스냅이 램프 사이로 튀지 않게 한다. 기준색은 출발점이며 스와치를 보고 조정):

| 램프 | 칸 | 기준색 | 용도 |
|---|---|---|---|
| 나무 갈색 | 8 | `#8a5a3c` | 바닥·서까래·상자·액자 |
| 종이/크림 | 4 | `#efe3c8` | 포스터·영수증·벽 밝은 면 |
| 등불 호박 | 6 | `#ffb462` | 등불 유리·빛 받은 면·블룸(위 2칸은 거의 흰색) |
| 밤 남색 | 6 | `#22304f` | 밤 벽·그림자·창밖 밤하늘 |
| 이끼 초록 | 4 | `#5f7a3a` | 화분·이끼·창턱 식물 |
| 슬레이트 회색(웜) | 6 | `#6a6670` | 돌·금속·중립 그림자(브라운×남색 조명이 떨어지는 곳) |
| 낮 하늘/창문 | 4 | `#9fc7e8` | 창밖 낮·빗물 반짝 |
| 노을 핑크 | 4 | `#e39a8c` | 17~19시·새벽 창빛 |
| 비/유리 청회색 | 4 | `#8aa0b4` | 빗줄기·유리·눈 |
| 고정 2 | 2 | `#1b1522`, `#fbf6ea` | 웜 근검정(외곽선 하한)·종이 흰색(하이라이트 상한). 순수 #000/#fff 금지(UI 규칙) |
| **문어 램프(동적)** | 5 | 사용자 색(기본 `#e8463c`) | `ramp(color, 5, 0.09)` — 색을 바꾸면 이 5칸만 교체하고 `uPalN` 유지 |

합계 53 → 48~64 안. 재질의 기본색은 **각 램프의 가운데 칸**에서 고른다(조명이 색을 자기 램프 위아래로만 움직이게). 개발용 체크 스크립트: 모든 램프 쌍의 OKLab 최소 거리 ≥ 0.06 인지, 문어 램프가 등불/갈색 램프와 겹치지 않는지(겹치면 문어 램프의 shift 를 키운다) 콘솔에 표로 찍고, **생성된 팔레트 스와치를 Playwright 스크린샷**으로 남긴다.

재질: `MeshLambertMaterial` 은 r128 에서 **정점 조명**이라 큰 바닥(PlaneGeometry) 은 `(4.5, 4, 24, 24)` 처럼 나눠야 등불 감쇠가 보인다. 픽셀당 조명이 필요하면 `MeshStandardMaterial({roughness:1, metalness:0})`(저해상 타깃이라 비용 미미) 또는 `MeshToonMaterial`(r128 존재) + 3단 gradientMap 으로 스냅 전에 미리 계단을 만든다. 모두 `flatShading: true`.

## 7. 조명/낮밤 (요점만 — 색은 팔레트가 정리한다)
- `DirectionalLight`(창문 햇빛, castShadow, `shadow.mapSize 1024`, `PCFSoftShadowMap`) 1개 + `HemisphereLight` 채움 + 등불 `PointLight`(그림자 없음; 밤에만 512 섀도 옵션). 시각은 실제 시계: 새벽 6–9(핑크) / 낮 9–17 / 노을 17–19(주황) / 밤 19–6(남색, 등불 지배), 전환은 60 s 이징.
- 밤에 갈색×남색 조명 = 탁한 회갈색 → 최근접이 슬레이트 회색으로 떨어지는 건 **의도된 결과**(회색 램프가 그래서 있다). 등불 가까이는 호박 램프로 튀어 "빛이 닿는 곳"이 저절로 생긴다.

## 8. 성능 (폰 360×740, p=3, 60 fps 목표)
- `renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'low-power' })` — AA 는 픽셀 룩에 해롭고 비용만 든다.
- `setPixelRatio(1)`; 저해상 타깃 ≤ 480×270; 셰이더 패스는 캔버스 해상도로 한 번(360×740 ≈ 27만 프래그먼트, 64회 루프 포함해도 폰 OK. 느리면 §4.4 LUT).
- 드로우콜 ≤ 150: 반복 소품(책·바닥판·빗줄기)은 `THREE.InstancedMesh`(r128 존재), 정적 메시는 재질별로 `THREE.BufferGeometryUtils.mergeBufferGeometries`(r128 `examples/js/utils/BufferGeometryUtils.js` 존재 확인 — UMD 1개 추가가 싫으면 `BufferGeometry` 를 직접 이어 붙이는 15줄 함수로 대체). 스모크에서 `renderer.info.render.calls <= 150` 단언.
- 섀도 1024 하나만. 등불 그림자는 밤+데스크톱 옵션.
- 아무것도 안 움직이면 그리지 않는다: 문어 idle 은 30 fps 로, 드래그/연출 중만 60. `document.hidden` 이면 rAF 중단, `dt` 상한 0.1 s.
- `destroy()`: rt.dispose(), 지오메트리/재질 dispose, `renderer.forceContextLoss()`.

## 9. 모션 감소 · 비-WebGL · 컨텍스트 손실
- `matchMedia('(prefers-reduced-motion: reduce)')`(그리고 `change` 이벤트): `uDither=0`(기어가는 패턴 제거), 카메라 드래그 관성 없음, 비는 정지 프레임 크로스페이드, 문어 통통은 진폭 1/3. 색 전환(낮밤)은 유지.
- WebGL 없음(`!canvas.getContext('webgl')`) 또는 `THREE` 로드 실패 → 같은 `SCENE3D` API 의 **인라인 SVG 2D 장면**(DESIGN §7.0 1차 구현)으로. 팔레트 배열은 공유해 두 장면의 색이 같게.
- `canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); showFallback(); })`, `webglcontextrestored` 에서 재초기화. 폰 백그라운드 복귀 때 흔하다.

## 10. 합격 기준 (Game Studios 의 "돌아가고 스크린샷이 남아야 완료"를 그대로)
- Playwright: 등불 0/4/8 × 낮/밤 × 쓰다듬기 상태 스크린샷을 `tests/evidence/scene3d/` 에 보존, 콘솔 에러 0, 폰 뷰포트에서 가로 스크롤 없음, `renderer.info.render.calls ≤ 150`.
- **팔레트 순도 검사**(싸고 강력): 스크린샷 PNG 의 고유 색 수 ≤ `uPalN` — 하나라도 넘으면 스냅이 어딘가 빠진 것(알파 블렌딩 재질, HTML 오버레이가 캔버스를 덮었는지 확인).
- `Run result: OBSERVED — <무엇이 보였나>` 한 줄을 PR 본문에.

## 출처
- three.js r128 소스(직접 열람, raw.githubusercontent.com/mrdoob/three.js/r128/…): `examples/js/postprocessing/Pass.js`(FullScreenQuad 삼각형·카메라), `EffectComposer.js`, `RenderPass.js`, `ShaderPass.js`, `shaders/CopyShader.js`, `shaders/PixelShader.js`, `loaders/GLTFLoader.js`, `utils/BufferGeometryUtils.js`(존재), `src/renderers/WebGLRenderTarget.js`(depthTexture 옵션), `src/textures/DepthTexture.js`(기본 UnsignedShortType), `src/renderers/webgl/WebGLPrograms.js`(렌더 타깃 인코딩 규칙), `src/renderers/webgl/WebGLProgram.js`(resolveIncludes), `src/renderers/shaders/ShaderChunk/packing.glsl.js`(orthographicDepthToViewZ), `examples/webgl_depth_texture.html`
- three.js dev `examples/jsm/postprocessing/RenderPixelatedPass.js` — https://github.com/mrdoob/three.js/blob/dev/examples/jsm/postprocessing/RenderPixelatedPass.js (깊이/노멀 에지 GLSL, floor(w/px) 타깃)
- OKLab 계수: Evercoder/culori `src/oklab/convertLrgbToOklab.js`, `convertOklabToLrgb.js` — https://github.com/Evercoder/culori (Björn Ottosson 원문 https://bottosson.github.io/posts/oklab/ 은 이 세션에서 접속 불가)
- Bayer 4×4: niccolofanton/dithering-shader `src/dithering-shader/DitheringShader.ts` — https://github.com/niccolofanton/dithering-shader ; WoodNeck/three-pixelate-showcase `src/shader/outline.fs`, `dither.fs`, `pass/OutlinePass.ts` — https://github.com/WoodNeck/three-pixelate-showcase
- 깊이+노멀 외곽선 수치·빛 방향 규칙: CBerry22/3d-Pixel-Art-In-Godot-4 `outline.gdshader` — https://github.com/CBerry22/3d-Pixel-Art-In-Godot-4
- 기본값 참고(WebGPU 전용): pickdani/three-webgpu-pixel-shader — https://github.com/pickdani/three-webgpu-pixel-shader
- 디더 크리프 교훈(Obra Dinn), 저해상 가독성(A Short Hike): 기존 조사 `research/pixel3d.md` §2
- 프로젝트 사양: `docs/DESIGN.md` §7.0, 스킬 `cozy-web-game` §5·§9
