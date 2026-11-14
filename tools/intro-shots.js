#!/usr/bin/env node
/* tools/intro-shots.js — 입장 레이어 스모크 + 스크린샷 (docs/UI_ART.md "입장"). SwiftShader WebGL, 360×740.
 *   node tools/intro-shots.js [hour] [weather]     # → tests/evidence/intro/*.png
 * 확인하는 것:
 *  0) 부팅 경로 (11-11, 진짜 부팅 ?intro=1 · 시간은 debugStep 으로만 → 기계가 바빠도 같은 값): 하늘은 진짜 장면 크기로 지어진다 —
 *     하늘이 처음 그려질 때의 렌더 크기 = 장면 칸 크기 = 그 뒤(1 s 넘게 지난 뒤)의 크기 · 출발 높이 = 화면 높이의 INTRO.SKY.height 배 (360×740 · 430×932) ·
 *     맨 위 멈춤 중에 화면 크기가 바뀌어도(→ 412×915) 그대로.
 *     구름 지나기 (11-12 주인 결정: 뚫는 구름을 얇게, docs/INTRO_SLOW_PROTO.md §9): 0.9 ~ 2.0 s 를 1/60 s 씩 캔버스 픽셀로 잰다 — 어느 한 색도 맨 위 멈춤 때 구름 위 하늘이 덮은 몫(+2 %)보다
 *     많이 덮지 않는다 (처음 화면보다 밋밋한 순간이 없다) · 구름 몸 색은 화면의 절반 미만 (그리고 20 % 는 넘게 지나간다) ·
 *     하늘 띠가 바뀌는 프레임과 그 앞 프레임에 하늘 띠(배경)가 한 픽셀도 안 보인다 (바뀌는 순간이 안 보인다) · 바뀌기 전엔 보이는 하늘 띠가 구름 밑 판과 맞닿은 데가 없다 (사이에 늘 구름) ·
 *     캔버스 둘레에 보이는 하늘 띠 = 덮개 색, 그리고 구름 몸 윗변(skyCut.top) 위에만 · 구름 밑 판은 장면 물건(방 · 비)을 한 픽셀도 안 가린다 · 구름 밑 판의 색 = 착지 뒤 허공색 (판이 사라져도 안 보인다) ·
 *     1.5 s 에 입장 레이어가 실제로 칠한 덮개 (창 스크린샷의 장면 둘레 틈 · 넓은 화면 옆 덮개 열): 구름 몸 윗변 위 남색 · 판 윗변 아래 판 색 · 그 사이는 섞인 색이 아래로 갈수록 판 색 쪽 (곧은 금 없음).
 *     하늘 띠가 보이는 픽셀은 색으로 안 가린다 (노을 · 새벽 방에 구름 위 하늘색과 같은 칸이 있다) — bgProbe 가 배경만 바꿔 두 번 더 그려 다른 픽셀을 센다 (판을 숨겨 한 번 더 그려 판이 가린 물건도 센다).
 *     재는 페이지는 5 s 넘는 setTimeout 을 늘린다 (intro.js 의 벽시계 안전판이 재는 도중에 오지 않게 — 기계가 바빠도 같은 결과).
 *     360×740 낮 맑음 (맨 위 멈춤 중에 → 412×915 로 바꿔 판도 다시 짓는다) · 1280×800 노을 비 (넓은 화면: 양옆 덮개가 보인다).
 *     예전엔 숨은 칸(0×0 → 320×240 어림)에서 지어 폰에서 0.85 화면 높이 · 폭 368 px 짜리였는데, 3) 은 부팅 뒤에 다시 시작해서 재므로 못 잡았다. BOOT_ONLY=1 이면 0) 만 돌린다.
 *     크기가 바뀔 때 (11-11 보강): 내려가는 중(1.0 s)에 한 번 더 바뀌어도(→ 430×932) 진행도와 높이가 그대로다 (연출이 처음부터 다시 돌지 않는다) · 하늘은 한 겹이다 —
 *     덮임 프레임의 드로우콜 = 그 크기로 바로 부팅한 페이지의 값, 착지 뒤의 드로우콜 · frameY = 연출 없는 부팅(?intro=0)의 값 (옛 하늘이 장면에 남으면 는다) ·
 *     줌만 바뀌어도(API zoomStep) 높이가 그대로다 · 연출 없는 부팅에서도 장면이 첫 프레임부터 장면 칸 크기다 (app.js 가 칸을 먼저 드러낸다)
 *  1) 첫 실행: ?intro=1 → 하늘 단계 → 로고 올라옴 → 로고 누름 → 레이어 사라짐 → 이름 창이 그다음에 열림
 *  2) 다시 열기: 하늘 단계 중에 누르면 바로 착지 + 바로 게임 (이름 창 없음), 아래 UI 가 inert 풀림
 *  3) 장면 카메라 하강 프레임 스트립 (debugStep, 결정적, INTRO.SKY 와 같은 dur · top · height): 멈춤 끝 · 구름 사이 · 뚫는 구름 다가옴 · 지나감 · 구름 밑 · 지붕 · 착지 (11-12: 뚫는 구름이 얇아져 다 덮는 프레임은 없다)
 *  4) ?intro 없이(자동화 브라우저 기본) 레이어가 안 뜬다 — 기존 스모크가 그대로 돈다
 *  4b) 하루 한 번 (PLAYTEST_FIXES A5-1): ?intro 없이 · navigator.webdriver 를 false 로 덮은 새 context 에서
 *      첫 열기 → 있음 → 타이틀 눌러 들어감 → 같은 날 다시 열기 → 없음 → 날짜(window.__ppolTest.today)를 바꾼 첫 열기 → 있음
 *  4c) 2D 대체 (?scene=2d&intro=1): 구름 창이 생기고 → 타이틀 → 누르면 사라짐 · 무대 translate 가 남지 않는다
 *  5) 첫 실행 실제 속도 녹화 intro.webm (NO_VIDEO=1 이면 생략) · 6) 요약 sheet.png
 * 콘솔/페이지 에러가 있으면 exit 1.
 */
'use strict';
var fs = require('fs'), path = require('path');
var { chromium } = require('playwright');
var ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'tests/evidence/intro');
var INDEX = 'file://' + path.join(ROOT, 'index.html');
var HOUR = process.argv[2] != null ? +process.argv[2] : 22, WEATHER = process.argv[3] || 'rain';
fs.mkdirSync(OUT, { recursive: true });

function fail(msg) { console.error('✗ ' + msg); process.exitCode = 1; }
(async function () {
  var browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, locale: 'ko-KR' });
  var page = await ctx.newPage(), errs = [];
  page.on('pageerror', function (e) { errs.push('pageerror: ' + e.message); });
  page.on('console', function (m) { if (m.type() === 'error' && !/Failed to load resource|net::|ERR_/.test(m.text())) errs.push('console.error: ' + m.text()); });
  await page.addInitScript(function (h) { window.__ppolLook = h; }, { hour: HOUR, lantern: 8, weather: WEATHER, octState: 'idle', anchor: 'center' });
  async function shot(name) { await page.screenshot({ path: path.join(OUT, name + '.png') }); console.log('  📷 tests/evidence/intro/' + name + '.png'); }

  /* 0) 부팅 경로: 하늘이 진짜 장면 크기로 지어지는가. 페이지가 내놓는 것만 쓴다 (APP.scene.stats · debugStep · introProgress · introSkip · zoomStep · setExpression · skyHex · skyCut · INTRO.SKY · CLOUDS.ramp) */
  function raf2(pg) { return pg.evaluate(function () { return new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); }); }); }
  var LOOK = { hour: HOUR, lantern: 8, weather: WEATHER, octState: 'idle', anchor: 'center' }, same = function (x, y) { return x[0] === y[0] && x[1] === y[1]; };
  /* 하늘 띠가 보이는 픽셀 (11-12, 구름 지나기 전용): THREE.WebGLRenderer 를 감싸 뷰티 패스(배경이 Color 인 장면 · 레이어 0 · 렌더 타깃)마다 배경만 자홍 · 초록으로 바꿔
     두 번 더 그린다 (제 타깃에, 화면 출력은 그대로) → 두 장이 다른 픽셀 = 배경(하늘 띠)이 보이는 곳. 색으로 가리면 노을 · 새벽 방의 #241527 칸이 구름 위 하늘색과 같아 섞인다 */
  function bgProbe() {
    var px = null, Wr = null;
    function hook(r) {
      var render = r.render, A = null, B = null, C = null, a = null, b = null, c = null;
      r.render = function (scene, cam) {
        render.call(this, scene, cam);
        var t0 = this.getRenderTarget();
        if (window.__inProbe || !t0 || !scene.background || !scene.background.isColor || scene.overrideMaterial || cam.layers.mask !== 1) return;
        window.__inProbe = true;
        var w = t0.width, h = t0.height, bg = scene.background, keep = bg.clone();
        if (!A || A.width !== w || A.height !== h) { A = new window.THREE.WebGLRenderTarget(w, h); B = new window.THREE.WebGLRenderTarget(w, h); C = new window.THREE.WebGLRenderTarget(w, h); a = new Uint8Array(w * h * 4); b = new Uint8Array(w * h * 4); c = new Uint8Array(w * h * 4); }
        bg.setRGB(1, 0, 1); this.setRenderTarget(A); this.clear(true, true, false); render.call(this, scene, cam);
        bg.setRGB(0, 1, 0); this.setRenderTarget(B); this.clear(true, true, false); render.call(this, scene, cam);
        /* 구름 밑 판(하늘 무리 안에서 userData.hex 를 가진 판)을 숨기고 한 번 더 (배경 자홍): 숨기자 배경이 아닌 것이 드러난 픽셀 = 판이 가린 장면 물건 (방 · 비 …) */
        var pn = null; scene.traverse(function (o) { if (!pn && o.isMesh && o.visible && o.userData && o.userData.hex && o.userData.h) pn = o; });
        if (pn) { pn.visible = false; bg.setRGB(1, 0, 1); this.setRenderTarget(C); this.clear(true, true, false); render.call(this, scene, cam); pn.visible = true; this.readRenderTargetPixels(C, 0, 0, w, h, c); }
        bg.copy(keep); this.readRenderTargetPixels(A, 0, 0, w, h, a); this.readRenderTargetPixels(B, 0, 0, w, h, b);
        var m = new Uint8Array(w * h), occ = 0;
        for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
          var i = ((h - 1 - y) * w + x) * 4; if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) m[y * w + x] = 1;   /* 위에서부터의 줄로 */
          if (pn && (a[i] !== c[i] || a[i + 1] !== c[i + 1] || a[i + 2] !== c[i + 2]) && !(c[i] === 255 && c[i + 1] === 0 && c[i + 2] === 255)) occ++;
        }
        window.__bgMask = { w: w, h: h, m: m, occ: pn ? occ : null }; this.setRenderTarget(t0); window.__inProbe = false;
      };
    }
    Object.defineProperty(window, 'THREE', { configurable: true, get: function () { return px; }, set: function (v) {   /* three UMD 는 빈 THREE 를 먼저 꽂고 채운다 → Proxy 로 WebGLRenderer 만 감싼다 */
      px = new Proxy(v, { get: function (o, k) {
        if (k !== 'WebGLRenderer' || !o.WebGLRenderer) return o[k];
        if (!Wr) { var O = o.WebGLRenderer; Wr = function (opt) { var r = new O(opt); hook(r); return r; }; Wr.prototype = O.prototype; }
        return Wr;
      } });
    } });
  }
  async function bootPage(W, H, sky, look, probe) {   /* 새 context 의 새 페이지. sky = 진짜 부팅 ?intro=1, 아니면 연출 없는 부팅 ?intro=0 · look = __ppolLook (없으면 LOOK) · probe = bgProbe 를 건다 */
    var bctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, locale: 'ko-KR' });
    var bp = await bctx.newPage();
    bp.on('pageerror', function (e) { errs.push('pageerror(부팅 경로): ' + e.message); });
    await bp.addInitScript(function (h) { window.__ppolLook = h; }, look || LOOK);
    if (probe) {
      await bp.addInitScript(bgProbe);
      /* 구름 지나기는 시간을 debugStep 으로만 민다 → intro.js 의 벽시계 안전판(SKY.dur × 2.5 뒤 로고)이 기계가 바쁘면 재는 도중에 와서 setSky 를 멈춘다. 5 s 넘는 타이머만 1000 배로 늘린다 (재는 동안 안 온다) */
      await bp.addInitScript(function () { var st0 = window.setTimeout; window.setTimeout = function (f, ms) { if (+ms >= 5000) ms = +ms * 1000; return st0.apply(this, [f, ms].concat([].slice.call(arguments, 2))); }; });
    }
    await bp.addInitScript(function (sky) {   /* 하늘이 처음 그려지는 프레임 (sky) · 장면이 생긴 뒤 첫 프레임 (연출 없음) 바로 앞에서 렌더 크기를 적고 장면 루프를 멈춘다 (이 rAF 는 장면 루프보다 먼저 등록되어 먼저 돈다 · 첫 ResizeObserver 보다도 먼저다) */
      window.__boot = null;
      (function tick() {
        try { var sc = window.APP && APP.scene; if (sc && sc.stats && sc.debugStep && (!sky || (sc.introActive && sc.introActive()))) { var t0 = sc.stats().target.slice(); sc.debugStep(0.001); window.__boot = { target0: t0 }; return; } }
        catch (e) { window.__boot = { err: String(e) }; return; }
        requestAnimationFrame(tick);
      })();
    }, !!sky);
    await bp.goto(INDEX + (sky ? '?intro=1' : '?intro=0'));
    await bp.waitForFunction(function (sky) { return !!window.__boot && (!sky || document.documentElement.classList.contains('intro-live')); }, !!sky, { timeout: 60000 });   /* intro-live = 그 뒤로 세 프레임 → 첫 ResizeObserver 도 이미 왔다 */
    if (!sky) await raf2(bp);   /* 연출이 없을 땐 두 프레임 기다려 첫 ResizeObserver 를 받는다 */
    return bp;
  }
  /* 한 걸음(0.001 s) 그리고 읽는다. skip 이면 그 앞에 introSkip() 으로 착지시킨다 */
  function read(bp, skip) { return bp.evaluate(function (skip) { if (skip) APP.scene.introSkip(); APP.scene.debugStep(0.001); var s = APP.scene.stats(), el = document.getElementById('scene3d'), k = INTRO.SKY; return { boot: window.__boot, target: s.target, box: [Math.floor(el.clientWidth / s.pixel), Math.floor(el.clientHeight / s.pixel)], frameY: s.frameY, calls: s.calls, expr: s.expr, p: APP.scene.introProgress(), on: APP.scene.introActive(), hold: k.top / k.dur, height: k.height, dur: k.dur }; }, !!skip); }
  async function bootRef(W, H) {   /* 연출 없는 부팅: 장면이 첫 프레임부터 장면 칸 크기인가 (app.js 가 칸을 드러낸 뒤에 장면을 만드는가). 쉬는 자리의 frameY 와 표정별 드로우콜 (callsOf) 을 돌려준다 — 아래에서 견준다. 페이지는 열어 둔다 (끝에서 닫는다) */
    var bp = await bootPage(W, H, false), tag = '연출 없는 부팅 ' + W + '×' + H + ': ', r = await read(bp);
    if (r.boot.err) { fail(tag + r.boot.err); await bp.context().close(); return null; }
    if (!same(r.boot.target0, r.box) || !same(r.target, r.box)) fail(tag + '장면이 생긴 뒤 첫 프레임의 렌더 크기 ' + r.boot.target0.join('×') + ' · 조금 뒤 ' + r.target.join('×') + ' · 장면 칸 ' + r.box.join('×') + ' — 셋이 같아야 한다 (장면 칸을 먼저 드러내고 장면을 만든다: app.js initScene)');
    console.log('  ' + tag + '첫 프레임의 렌더 크기 ' + r.boot.target0.join('×') + ' (장면 칸 ' + r.box.join('×') + ') · 쉬는 자리 드로우콜 ' + r.calls + ' · frameY ' + r.frameY);
    /* 쉬는 자리의 드로우콜은 문어 표정에 따라 다르다 (얼굴 덧그림 = +2). 입장 레이어는 타이틀이 뜰 때 표정을 바꾸는데 그 때는 벽시계(안전판 2.5배)로도 오므로, 견줄 때는 같은 표정의 값을 쓴다 */
    var by = {}; by[r.expr] = r.calls;
    r.callsOf = async function (expr) { if (!(expr in by)) by[expr] = await bp.evaluate(function (e) { APP.scene.setExpression(e); APP.scene.debugStep(0.001); return APP.scene.stats().calls; }, expr); return by[expr]; };
    r.close = function () { return bp.context().close(); };
    return r;
  }
  /* o.hold = [w, h]: 맨 위 멈춤 중에 그 크기로 · o.mid = [w, h]: 내려가는 중(1.0 s)에 그 크기로 · o.zoom = k: 뚫는 구름을 지날 때 줌 멈춤 k 로 (API) ·
     o.ref = 끝 크기와 같은 크기의 연출 없는 부팅 (bootRef) · o.calls = 끝 크기로 바로 부팅한 페이지의 덮임 프레임 드로우콜. 덮임 프레임의 드로우콜을 돌려준다 */
  async function bootSky(W, H, o) {
    o = o || {};
    var bp = await bootPage(W, H, true), tag = '부팅 ' + W + '×' + H + ': ', x = function (s) { return s[0] + '×' + s[1]; };
    /* 시간은 debugStep 으로만 민다. 한 번에 0.1 s 까지 (장면이 dt 를 0.1 s 로 자른다) — 카메라 높이는 진행 시간의 닫힌 식이라 걸음 크기와 상관없고, SwiftShader 는 한 프레임이 비싸서 걸음 수를 아낀다 */
    var step = function (sec) { var n = Math.max(1, Math.ceil(sec / 0.1 - 1e-9)); return bp.evaluate(function (a) { for (var j = 0; j < a.n; j++) APP.scene.debugStep(a.dt); }, { n: n, dt: sec / n }); };
    var size = async function (wh, not) { await bp.setViewportSize({ width: wh[0], height: wh[1] }); await bp.waitForFunction(function (t) { var s = APP.scene.stats().target; return s[0] !== t[0] || s[1] !== t[1]; }, not, { timeout: 60000 }); };
    var a = await read(bp), b = null, c = null, d = null, z = null, way = [[W, H]];
    if (a.boot.err) { fail(tag + a.boot.err); await bp.context().close(); return null; }
    if (!(a.on && a.p < a.hold)) fail(tag + '맨 위 멈춤 안에서 못 멈춤 (진행도 ' + a.p + ')');
    if (!same(a.boot.target0, a.box) || !same(a.target, a.box)) fail(tag + '하늘이 처음 그려질 때 렌더 크기 ' + a.boot.target0.join('×') + ' · 조금 뒤 ' + a.target.join('×') + ' · 장면 칸 ' + a.box.join('×') + ' — 셋이 같아야 한다');
    var cur = a;
    if (o.hold) {
      await size(o.hold, a.target); cur = b = await read(bp); way.push(o.hold);
      if (!(b.on && b.p < b.hold)) fail(tag + '크기를 바꾼 뒤 맨 위 멈춤 밖 (진행도 ' + b.p + ')');
      if (!same(b.target, b.box)) fail(tag + '→ ' + x(o.hold) + ' 뒤 렌더 크기 ' + b.target.join('×') + ' ≠ 장면 칸 ' + b.box.join('×'));
    }
    if (o.mid) {   /* 내려가는 중의 크기 바뀜 (폰 돌리기 · 주소창): 진행도는 그대로여야 한다 — 하늘을 새로 짓는다고 연출이 처음부터 다시 돌면 안 된다 */
      await step(1.0 - cur.p * cur.dur); c = await read(bp); await size(o.mid, c.target); cur = d = await read(bp); way.push(o.mid);
      if (!(d.on && Math.abs(d.p - c.p) <= 0.005)) fail(tag + '내려가는 중(' + (c.p * c.dur).toFixed(2) + ' s)에 ' + x(o.mid) + ' 로 바뀌자 진행도가 ' + c.p.toFixed(4) + ' → ' + d.p.toFixed(4) + ' (그대로여야 한다)');
      if (!same(d.target, d.box)) fail(tag + '→ ' + x(o.mid) + ' 뒤 렌더 크기 ' + d.target.join('×') + ' ≠ 장면 칸 ' + d.box.join('×'));
    }
    await step(1.36 - cur.p * cur.dur);   /* 뚫는 구름이 화면 가운데를 지날 무렵 (몸 한가운데는 곡선에서 1.39 s) — 하늘 물건이 가장 많이 화면에 있다 */
    var mid = await read(bp);
    if (!same(mid.target, cur.target)) fail(tag + '1 s 넘게 지난 뒤 렌더 크기가 ' + cur.target.join('×') + ' → ' + mid.target.join('×') + ' 로 바뀜');
    /* 하늘은 한 겹: 크기가 바뀐 뒤의 이 프레임은 그 크기로 바로 부팅한 페이지의 같은 순간과 드로우콜이 같다 (옛 하늘이 장면에 남으면 그 구름만큼 는다) */
    if (o.calls != null && mid.calls !== o.calls) fail(tag + '크기가 바뀐 뒤 1.36 s 프레임의 드로우콜 ' + mid.calls + ' ≠ ' + x(way[way.length - 1]) + ' 로 바로 부팅한 페이지의 ' + o.calls + ' (옛 하늘이 남아 두 겹이면 는다)');
    if (o.zoom) { await bp.evaluate(function (k) { APP.scene.zoomStep(k); }, o.zoom); z = await read(bp); }   /* 줌만 바뀜 (N 만 바뀌고 resize() 는 안 거친다) */
    var rest = await read(bp, true), restZ = rest.frameY, callsR = rest.calls;   /* 쉬는 자리 (연출 없는 카메라) 를 재려고 착지시킨다 */
    if (rest.on) fail(tag + 'introSkip 뒤에도 하늘 단계가 안 끝남');
    if (z) { await bp.evaluate(function () { APP.scene.zoomStep(0); }); rest = await read(bp); }
    /* 착지한 뒤에는 연출 없이 부팅한 페이지와 같다: 카메라 자리 (frameY 는 소수 셋째 자리로 반올림된 값 — 아트 1px 은 0.002 쯤이다) · 드로우콜 (옛 하늘이 장면에 남아 있으면 비 · 별만큼 는다 — 밤 비일 때 가장 잘 보인다. 줌을 건드린 페이지에서는 견주지 않는다) */
    if (o.ref && Math.abs(rest.frameY - o.ref.frameY) > 0.0015) fail(tag + '착지 뒤 frameY ' + rest.frameY + ' ≠ 연출 없는 부팅의 ' + o.ref.frameY + ' (카메라가 쉬는 자리가 아니다)');
    var callsN = o.ref && !z ? await o.ref.callsOf(rest.expr) : null;
    if (callsN != null && callsR !== callsN) fail(tag + '착지 뒤 드로우콜 ' + callsR + ' ≠ 연출 없는 부팅의 ' + callsN + ' (표정 ' + rest.expr + ' · 하늘이 장면에 남았다)');
    var rests = [], tgt = rest.target, last = way.length - 1; rests[last] = rest.frameY;
    for (var i = last - 1; i >= 0; i--) { await size(way[i], tgt); var r = await read(bp); rests[i] = r.frameY; tgt = r.target; }   /* 지나온 크기마다 쉬는 자리를 잰다 */
    var hA = a.frameY - rests[0], hB = b ? b.frameY - rests[1] : null, hC = c ? c.frameY - rests[last - 1] : null, hD = d ? d.frameY - rests[last] : null, hM = mid.frameY - rests[last], hZ = z ? z.frameY - restZ : null;
    if (Math.abs(hA - a.height) > 0.05) fail(tag + '출발 높이가 화면 높이의 ' + hA.toFixed(3) + ' 배 (' + a.height + ' 배여야 한다)');
    if (b && Math.abs(hB - a.height) > 0.05) fail(tag + '맨 위 멈춤 중 ' + x(o.hold) + ' 로 바뀐 뒤 출발 높이가 화면 높이의 ' + hB.toFixed(3) + ' 배 (' + a.height + ' 배여야 한다)');
    /* 쉬는 자리 위의 높이 (화면 높이의 배수) 는 진행 시간만의 함수다 → 크기나 줌이 바뀌어도 바뀌기 직전과 같아야 한다 (한 걸음 0.001 s 만큼만 다르다) */
    if (d && Math.abs(hC - hD) > 0.05) fail(tag + '내려가는 중 ' + x(o.mid) + ' 로 바뀌자 높이가 화면 높이의 ' + hC.toFixed(3) + ' → ' + hD.toFixed(3) + ' 배 (같아야 한다)');
    if (z && Math.abs(hM - hZ) > 0.05) fail(tag + '줌 멈춤 ' + o.zoom + ' 으로 바뀌자 높이가 화면 높이의 ' + hM.toFixed(3) + ' → ' + hZ.toFixed(3) + ' 배 (같아야 한다)');
    console.log('  ' + tag + '렌더 크기 ' + a.boot.target0.join('×') + ' (장면 칸 ' + a.box.join('×') + ') · 출발 높이 ' + hA.toFixed(3) + ' 화면' + (b ? ' · → ' + x(o.hold) + ' (' + b.target.join('×') + ') 뒤 ' + hB.toFixed(3) + ' 화면' : '') +
      (d ? ' · ' + (c.p * c.dur).toFixed(2) + ' s 에 → ' + x(o.mid) + ' (' + d.target.join('×') + '): 진행도 ' + c.p.toFixed(4) + ' → ' + d.p.toFixed(4) + ' · 높이 ' + hC.toFixed(3) + ' → ' + hD.toFixed(3) + ' 화면' : '') +
      ' · 1.36 s 드로우콜 ' + mid.calls + (o.calls != null ? ' (바로 부팅 ' + o.calls + ')' : '') +
      (z ? ' · 줌 멈춤 ' + o.zoom + ': 높이 ' + hM.toFixed(3) + ' → ' + hZ.toFixed(3) + ' 화면' : ' · 착지 뒤 드로우콜 ' + callsR + (callsN != null ? ' (연출 없는 부팅 ' + callsN + ' · 표정 ' + rest.expr + ')' : '')) + ' · frameY ' + rest.frameY);
    await bp.context().close(); return mid.calls;
  }
  /* 구름 지나기 (11-12): 뚫는 구름이 띠처럼 지나가고(화면 절반 미만), 하늘 띠가 바뀌는 순간 · 덮개와의 경계가 안 보이는가. 캔버스 픽셀을 렌더 크기로 센다 (그린 프레임 그대로 — 같은 작업 안에서 읽는다) */
  async function bootPass(W, H, look, hold) {
    var bp = await bootPage(W, H, true, look, true), tag = '구름 지나기 ' + W + '×' + H + (hold ? ' → ' + hold.join('×') : '') + ' (' + look.hour + '시 ' + look.weather + '): ';
    var b0 = await bp.evaluate(function () { return window.__boot; });
    if (b0.err) { fail(tag + b0.err); await bp.context().close(); return; }
    if (hold) {   /* 맨 위 멈춤 중에 크기가 바뀜 → 하늘(구름 밑 판 포함)을 새로 짓는다 */
      var t0 = await bp.evaluate(function () { return APP.scene.stats().target; });
      await bp.setViewportSize({ width: hold[0], height: hold[1] });
      await bp.waitForFunction(function (t) { var s = APP.scene.stats().target; return s[0] !== t[0] || s[1] !== t[1]; }, t0, { timeout: 60000 });
    }
    var scan = function (to) {   /* 지금부터 to 초까지 1/60 s 씩. 상태는 페이지의 __pass 에 이어 간다 */
      return bp.evaluate(function (to) {
        var sc = APP.scene, P = window.__pass, k = INTRO.SKY;
        if (!P) P = window.__pass = { body: CLOUDS.ramp(window.__ppolLook.weather, sc.stats().phase, false).t[3], hi: sc.skyHex(), bodyMax: 0, bodyAt: 0, sw: null, bgSw: null, bgPrev: null, touch: 0, touchAt: 0, edge: 0, edgeAt: 0, occ: 0, occAt: 0, occN: 0, top: 0, topAt: 0, topHex: null, cutHex: null, n: 0, noMask: 0, cv: document.createElement('canvas') };
        var cv = document.querySelector('#scene3d canvas');
        while (sc.introActive() && sc.introProgress() * k.dur < to - 1e-6 && !(P.sw != null && sc.introProgress() * k.dur > P.sw + 0.1)) {
          window.__bgMask = null; sc.debugStep(1 / 60); P.n++;
          var s = sc.stats(), rw = s.target[0], rh = s.target[1], t = sc.introProgress() * k.dur, cover = sc.skyHex(), cut = sc.skyCut ? sc.skyCut() : null, cr = cv.getBoundingClientRect(), M = window.__bgMask;
          P.cv.width = rw; P.cv.height = rh; var x2 = P.cv.getContext('2d', { willReadFrequently: true }); x2.imageSmoothingEnabled = false; x2.drawImage(cv, 0, 0, cv.width, cv.height, 0, 0, rw, rh);
          var d = x2.getImageData(0, 0, rw, rh).data, n = rw * rh, hx = new Array(n), bc = 0, vis = 0;
          var cnt = {};
          for (var i = 0, j = 0; i < n; i++, j += 4) { var h = '#' + ((1 << 24) | (d[j] << 16) | (d[j + 1] << 8) | d[j + 2]).toString(16).slice(1); hx[i] = h; cnt[h] = (cnt[h] || 0) + 1; if (h === P.body) bc++; }
          for (var h1 in cnt) if (cnt[h1] / n > P.top) { P.top = cnt[h1] / n; P.topAt = t; P.topHex = h1; }   /* 한 색이 차지한 가장 큰 몫 (구름 위 하늘 · 구름 · 판 · 허공 무엇이든) */
          if (!M || M.w !== rw || M.h !== rh) { P.noMask++; M = null; } else for (var q = 0; q < n; q++) vis += M.m[q];
          if (M && M.occ != null) { P.occN++; if (M.occ > P.occ) { P.occ = M.occ; P.occAt = t; } }   /* 구름 밑 판이 가린 장면 물건 픽셀 (판은 방 · 비보다 뒤 → 늘 0) */
          if (bc / n > P.bodyMax) { P.bodyMax = bc / n; P.bodyAt = t; }
          if (cut) P.cutHex = cut.hex;
          if (P.sw == null && cover !== P.hi) { P.sw = t; P.bgSw = [P.bgPrev, M ? vis : null]; }   /* 띠가 바뀐 프레임: [앞 프레임, 이 프레임] 에 하늘 띠가 보이는 픽셀 수 */
          P.bgPrev = M ? vis : null;
          if (P.sw == null && M) {
            var lo = cut ? cut.hex : null, cutRow = cut ? (cut.y - cr.top) / cr.height * rh : 1e9, topRow = cut ? (cut.top - cr.top) / cr.height * rh : 1e9, tc = 0, ec = 0;
            for (var y = 0; y < rh; y++) for (var x = 0; x < rw; x++) {
              var a = y * rw + x, edge = x === 0 || x === rw - 1;
              if (M.m[a]) {   /* 하늘 띠(구름 위 하늘)가 보이는 픽셀: 구름 밑 판과 맞닿으면 이음매 · 캔버스 둘레면 그 높이의 덮개 색이어야 한다 */
                if (lo && lo !== P.hi && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (o) { var x3 = x + o[0], y3 = y + o[1]; if (x3 < 0 || y3 < 0 || x3 >= rw || y3 >= rh) return false; var c3 = y3 * rw + x3; return !M.m[c3] && hx[c3] === lo && hx[a] !== lo; })) tc++;
                if (edge && (hx[a] !== cover || y + 0.5 >= topRow)) ec++;   /* 둘레에 보이는 하늘 띠는 덮개가 아직 남색인 높이(구름 몸 윗변 위)에만 */
              } else if (edge && lo && lo !== P.hi && hx[a] === lo && y + 0.5 < cutRow) ec++;   /* 판이 덮개를 나눈 높이보다 위에 보인다 */
            }
            if (tc > P.touch) { P.touch = tc; P.touchAt = t; } if (ec > P.edge) { P.edge = ec; P.edgeAt = t; }
          }
        }
        return { t: sc.introProgress() * k.dur, on: sc.introActive(), P: { body: P.body, hi: P.hi, bodyMax: P.bodyMax, bodyAt: P.bodyAt, sw: P.sw, bgSw: P.bgSw, touch: P.touch, touchAt: P.touchAt, edge: P.edge, edgeAt: P.edgeAt, occ: P.occ, occAt: P.occAt, occN: P.occN, top: P.top, topAt: P.topAt, topHex: P.topHex, cutHex: P.cutHex, n: P.n, noMask: P.noMask } };
      }, to);
    };
    var step = function (sec) { var n = Math.max(1, Math.ceil(sec / 0.1 - 1e-9)); return bp.evaluate(function (a) { for (var j = 0; j < a.n; j++) APP.scene.debugStep(a.dt); }, { n: n, dt: sec / n }); };
    /* 맨 위 멈춤의 하늘: 한 색(구름 위 하늘)이 캔버스에서 차지한 몫 — 내려가는 동안 어느 한 색도 이보다 많이 덮으면 안 된다 (처음 화면보다 밋밋한 순간이 없다) */
    var hold = await bp.evaluate(function () {
      var sc = APP.scene; sc.debugStep(0.001); var s = sc.stats(), rw = s.target[0], rh = s.target[1], c = document.createElement('canvas'); c.width = rw; c.height = rh;
      var x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingEnabled = false; var cv = document.querySelector('#scene3d canvas'); x.drawImage(cv, 0, 0, cv.width, cv.height, 0, 0, rw, rh);
      var d = x.getImageData(0, 0, rw, rh).data, cnt = {}, best = 0, hex = null;
      for (var j = 0; j < d.length; j += 4) { var h = (d[j] << 16) | (d[j + 1] << 8) | d[j + 2]; cnt[h] = (cnt[h] || 0) + 1; if (cnt[h] > best) { best = cnt[h]; hex = h; } }
      return { share: best / (rw * rh), hex: '#' + (0x1000000 | hex).toString(16).slice(1), t: sc.introProgress() * INTRO.SKY.dur };
    });
    var p0 = hold.t;
    await step(0.9 - p0);
    var r = await scan(1.5);
    /* 입장 레이어가 실제로 칠한 덮개 (화면 픽셀): 장면 루프는 멈춰 있어도 intro.js 의 rAF 는 돈다 → 두 프레임 뒤 창 스크린샷에서 장면 둘레 틈(캔버스 바로 왼쪽 열)과
       넓은 화면의 옆 덮개(구멍 왼쪽 열)를 위에서 아래로 읽는다: 구름 몸 윗변 위 = 남색(skyHex) · 판 윗변 아래 = 판 색 · 그 사이 = 둘을 섞은 색이 아래로 갈수록 판 색 쪽, 한 줄에 절반 넘게 뛰지 않는다 (곧은 금 없음) */
    await raf2(bp);
    var paint = await bp.evaluate(function () {
      var c = APP.scene.skyCut(), cv = document.querySelector('#scene3d canvas').getBoundingClientRect(), hole = document.querySelector('.intro-hole').getBoundingClientRect(), el = document.getElementById('intro');
      return { cut: c, hi: APP.scene.skyHex(), phase: el && el.dataset.phase, cols: [['장면 둘레 틈', Math.floor(cv.left) - 1], ['옆 덮개', Math.floor(hole.left) - 4]].filter(function (q) { return q[1] >= 0; }), H: innerHeight };
    });
    var png = paint.cut && paint.cut.y > 0 && paint.cut.y < paint.H ? await bp.screenshot() : null;
    if (png) paint.bad = await bp.evaluate(function (o) {
      return new Promise(function (res) {
        var im = new Image(); im.onload = function () {
          var cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height; var x = cv.getContext('2d'); x.drawImage(im, 0, 0);
          var rgb = function (h) { var v = parseInt(h.slice(1), 16); return [v >> 16, (v >> 8) & 255, v & 255]; }, A = rgb(o.hi), B = rgb(o.cut.hex), D = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], dd = D[0] * D[0] + D[1] * D[1] + D[2] * D[2], bad = [];
          o.cols.forEach(function (col) {
            var d = x.getImageData(col[1], 0, 1, im.height).data, prev = 0, nb = 0, first = null;
            for (var y = 0; y < im.height; y++) {
              var p = [d[y * 4], d[y * 4 + 1], d[y * 4 + 2]], f = ((p[0] - A[0]) * D[0] + (p[1] - A[1]) * D[1] + (p[2] - A[2]) * D[2]) / dd, off = Math.max.apply(null, p.map(function (v, i) { return Math.abs(v - (A[i] + D[i] * f)); }));
              var want = y + 1 < o.cut.top ? 0 : y > o.cut.y ? 1 : null, ok = off <= 2 && f > -0.02 && f < 1.02 && f >= prev - 0.02 && f - prev <= 0.5 && (want == null || Math.abs(f - want) < 0.02);
              if (!ok) { nb++; if (!first) first = y + ' px: ' + '#' + ((1 << 24) | (p[0] << 16) | (p[1] << 8) | p[2]).toString(16).slice(1) + ' (섞임 ' + f.toFixed(2) + ')'; }
              prev = Math.max(0, Math.min(1, f));
            }
            if (nb) bad.push(col[0] + ' ' + nb + ' 줄 (처음 ' + first + ')');
          });
          res(bad);
        };
        im.src = 'data:image/png;base64,' + o.png;
      });
    }, Object.assign({ png: png.toString('base64') }, paint));
    r = await scan(2.1);
    var P = r.P, voidHex = await bp.evaluate(function () { APP.scene.introSkip(); APP.scene.debugStep(0.001); APP.scene.skyHex(); APP.scene.debugStep(0.001); return APP.scene.skyHex(); });   /* 착지 뒤 허공색 (한 프레임 뒤 캔버스에서 읽은 값) */
    if (P.noMask) fail(tag + '하늘 띠 픽셀을 못 읽은 프레임 ' + P.noMask + ' 개 (bgProbe 가 렌더러를 못 감쌈)');
    if (!(P.top <= hold.share + 0.02)) fail(tag + '한 색(' + P.topHex + ')이 캔버스의 ' + (P.top * 100).toFixed(1) + ' % (' + P.topAt.toFixed(2) + ' s) — 맨 위 멈춤의 하늘(' + hold.hex + ' ' + (hold.share * 100).toFixed(1) + ' %) + 2 % 를 넘는다 (화면이 거의 한 색인 순간)');
    if (!(P.bodyMax < 0.5)) fail(tag + '구름 몸 색이 화면의 ' + (P.bodyMax * 100).toFixed(1) + ' % (' + P.bodyAt.toFixed(2) + ' s) — 절반 미만이어야 한다 (뚫는 구름 높이 ≤ 화면 높이 × CLOUD.bank)');
    if (!(P.bodyMax >= 0.2)) fail(tag + '뚫는 구름이 안 지나감: 구름 몸 색이 많아야 ' + (P.bodyMax * 100).toFixed(1) + ' %');
    if (P.sw == null) fail(tag + '2.1 s 까지 하늘 띠가 안 바뀜 (덮개 색 ' + P.hi + ' 그대로)');
    else if (P.bgSw[0] !== 0 || P.bgSw[1] !== 0) fail(tag + '하늘 띠가 ' + P.sw.toFixed(2) + ' s 에 바뀌는데 하늘 띠가 바로 앞 프레임에 ' + P.bgSw[0] + ' px · 그 프레임에 ' + P.bgSw[1] + ' px 보인다 (바뀌는 순간이 보인다)');
    if (P.touch) fail(tag + '구름 위 하늘과 구름 밑 판이 ' + P.touch + ' 곳에서 맞닿음 (' + P.touchAt.toFixed(2) + ' s) — 이음매');
    if (P.edge) fail(tag + '캔버스 둘레 하늘 픽셀 ' + P.edge + ' 개가 그 높이의 덮개 색과 다름 (' + P.edgeAt.toFixed(2) + ' s)');
    if (!P.cutHex) fail(tag + '구름 밑 판이 화면에 안 들어옴 (skyCut 이 한 번도 안 옴)');
    else if (P.cutHex !== voidHex) fail(tag + '구름 밑 판 색 ' + P.cutHex + ' ≠ 착지 뒤 허공색 ' + voidHex + ' (판 아래 가장자리 · 하늘을 버리는 순간이 보인다)');
    if (paint.phase !== 'sky') fail(tag + '1.5 s 에 입장 레이어가 하늘 단계가 아님 (' + paint.phase + ') — 덮개를 못 잰다');
    else if (!png) fail(tag + '1.5 s 에 구름 밑 판 윗변이 창 안에 없음 (skyCut ' + JSON.stringify(paint.cut) + ') — 덮개를 못 잰다');
    else if (paint.bad.length) fail(tag + '1.5 s 에 입장 레이어가 칠한 덮개가 장면과 안 맞음 (구름 몸 윗변 ' + Math.round(paint.cut.top) + ' px · 판 윗변 ' + Math.round(paint.cut.y) + ' px, 남색 ' + paint.hi + ' → 판 ' + paint.cut.hex + '): ' + paint.bad.join(' · '));
    if (!P.occN) fail(tag + '구름 밑 판을 숨겨 견준 프레임이 없음 (bgProbe 가 판을 못 찾음)');
    else if (P.occ) fail(tag + '구름 밑 판이 장면 물건(방 · 비)을 ' + P.occ + ' px 가림 (' + P.occAt.toFixed(2) + ' s) — 판은 방보다 뒤여야 한다');
    console.log('  ' + tag + '한 색 최대 ' + (P.top * 100).toFixed(1) + ' % ' + P.topHex + ' (' + P.topAt.toFixed(2) + ' s, 맨 위 멈춤 ' + hold.hex + ' ' + (hold.share * 100).toFixed(1) + ' %) · 구름 몸 색 최대 ' + (P.bodyMax * 100).toFixed(1) + ' % (' + P.bodyAt.toFixed(2) + ' s) · 띠 바뀜 ' + (P.sw == null ? '없음' : P.sw.toFixed(2) + ' s (하늘 띠가 보이는 픽셀 ' + P.bgSw.join(' → ') + ')') + ' · 맞닿음 ' + P.touch + ' · 둘레 어긋남 ' + P.edge + ' · 판 ' + P.cutHex + ' / 허공 ' + voidHex + ' · 판이 가린 물건 ' + P.occ + ' px (' + P.occN + ' 프레임) · 1.5 s 덮개 ' + (paint.cols || []).map(function (q) { return q[0]; }).join(' · ') + ' (구름 몸 윗변 ' + Math.round(paint.cut ? paint.cut.top : NaN) + ' → 판 윗변 ' + Math.round(paint.cut ? paint.cut.y : NaN) + ' px) · ' + P.n + ' 프레임');
    await bp.context().close();
  }
  var bad0 = process.exitCode;
  var ref = await bootRef(430, 932);
  var direct = await bootSky(430, 932, { zoom: 3, ref: ref });
  await bootSky(360, 740, { hold: [412, 915], mid: [430, 932], ref: ref, calls: direct });
  if (ref) await ref.close();
  await bootPass(360, 740, { hour: 13, lantern: 8, weather: 'clear', octState: 'idle', anchor: 'center' }, [412, 915]);
  await bootPass(1280, 800, { hour: 18, lantern: 8, weather: 'rain', octState: 'idle', anchor: 'center' });
  if (process.exitCode === bad0) console.log('  ✓ 부팅 경로: 하늘이 진짜 장면 크기로 지어지고, 크기가 바뀌어도 한 겹으로 이어지고, 뚫는 구름은 화면 절반 밑으로 지나가며 하늘 띠가 바뀌는 순간이 안 보인다');
  if (process.env.BOOT_ONLY) { await browser.close(); if (errs.length) { errs.forEach(function (e) { console.error('  ' + e); }); fail('에러 ' + errs.length + '건'); } console.log(process.exitCode ? '실패' : 'OK — 입장 레이어 (부팅 경로만)'); return; }

  /* 1) 첫 실행 */
  await page.goto(INDEX + '?intro=1&slow=3');   /* 3배 느리게 (SwiftShader 스크린샷이 느려서 하늘 단계를 놓치지 않게) */
  await page.waitForSelector('#intro');
  if (await page.locator('#name-dialog[open]').count()) fail('연출 중에 이름 창이 열림');
  await page.waitForTimeout(900); await shot('1-sky');
  await page.waitForSelector('#intro[data-phase="title"]', { timeout: 12000 }); await page.waitForTimeout(500); await shot('2-title');
  await page.waitForSelector('#intro.hinted', { timeout: 12000 }); await page.waitForTimeout(400); await shot('3-title-hint');
  var inertOK = await page.evaluate(function () { return document.getElementById('invite').closest('[inert]') !== null; });
  if (!inertOK) fail('연출 중 아래 UI 가 inert 가 아님');
  await page.click('.intro-title');
  await page.waitForTimeout(700); await shot('4-leaving');
  await page.waitForSelector('#intro', { state: 'detached', timeout: 8000 });
  await page.waitForSelector('#name-dialog[open]', { timeout: 3000 }).catch(function () { fail('연출 뒤 이름 창이 안 열림'); });
  await shot('5-name');
  await page.fill('#name-in', '뚜루'); await page.click('#name-form button[type=submit]');
  await page.waitForTimeout(700); await shot('6-game');

  /* 2) 다시 열기 + 하늘 단계에서 누르기 = 바로 게임 */
  await page.goto(INDEX + '?intro=1');
  await page.waitForSelector('#intro'); await page.waitForTimeout(300);
  await page.mouse.click(180, 600);
  await page.waitForSelector('#intro', { state: 'detached', timeout: 4000 });
  var st = await page.evaluate(function () { return { dlg: document.getElementById('name-dialog').open, inert: !!document.querySelector('body > [inert]'), active: APP.scene.introActive ? APP.scene.introActive() : false, cls: document.documentElement.className }; });
  if (st.dlg) fail('다시 열었는데 이름 창'); if (st.inert) fail('inert 가 안 풀림'); if (st.active) fail('카메라 연출이 안 끝남'); if (/intro-/.test(st.cls)) fail('html 에 intro 클래스가 남음: ' + st.cls);
  await page.waitForTimeout(500); await shot('7-skip-to-game');

  /* 3) 카메라 하강 스트립 (결정적) — 입장 레이어가 쓰는 값 그대로 (INTRO.SKY). debugStep 은 한 번에 0.1 s 까지만 가므로 1/40 s 씩 */
  var SKY = await page.evaluate(function () { var k = INTRO.SKY; APP.scene.bubble('', 0); APP.scene.intro({ dur: k.dur, top: k.top, height: k.height }); return k; });
  var ts = [0, SKY.top, 0.9, 1.15, 1.3, 1.6, 2.1, 2.5, SKY.dur], last = 0;
  for (var i = 0; i < ts.length; i++) {
    await page.evaluate(function (dt) { var n = Math.round(dt * 40); for (var j = 0; j < n; j++) APP.scene.debugStep(1 / 40); if (!n) APP.scene.debugStep(0.001); }, ts[i] - last); last = ts[i];
    await page.locator('#scene').screenshot({ path: path.join(OUT, 'cam-' + i + '.png') });
  }
  if (await page.evaluate(function () { return APP.scene.introActive(); })) fail('하늘 단계가 dur 뒤에도 안 끝남');
  await page.evaluate(function () { APP.scene.resume(); });
  console.log('  📷 tests/evidence/intro/cam-0..' + (ts.length - 1) + '.png');

  /* 4) 자동화 기본 = 생략 */
  await page.goto(INDEX); await page.waitForTimeout(400);
  if (await page.locator('#intro').count()) fail('?intro 없이 자동화 브라우저에서 레이어가 뜸');

  /* 4b) 하루 한 번 — ?intro 없이 연다. intro.js 는 navigator.webdriver 면 늘 생략하므로 새 context 에서 먼저 덮는다.
     init script 는 붙인 순서대로 모두 돈다 → 날짜를 바꿀 땐 하나를 더 붙이면 나중 것이 이긴다 */
  var dctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1, locale: 'ko-KR' });
  var dp = await dctx.newPage();
  dp.on('pageerror', function (e) { errs.push('pageerror(하루 한 번): ' + e.message); });
  await dp.addInitScript(function () { Object.defineProperty(navigator, 'webdriver', { get: function () { return false; } }); });
  await dp.addInitScript(function () { window.__ppolTest = { today: '2026-11-07' }; });
  await dp.addInitScript(function (h) { window.__ppolLook = h; }, { hour: HOUR, lantern: 8, weather: WEATHER, octState: 'idle', anchor: 'center' });
  await dp.goto(INDEX);
  if (!(await dp.waitForSelector('#intro', { timeout: 5000 }).then(function () { return true; }, function () { return false; }))) fail('하루 한 번: 그날 첫 열기에 레이어가 안 뜸');
  else {
    await dp.waitForSelector('#intro[data-phase="title"]', { timeout: 15000 });
    await dp.click('.intro-title');
    await dp.waitForSelector('#intro', { state: 'detached', timeout: 8000 });
    var mark = await dp.evaluate(function () { try { return localStorage.getItem('ppolppol_intro_day'); } catch (e) { return 'ERR'; } });
    if (mark !== '2026-11-07') fail('하루 한 번: 들어간 뒤 기록이 ' + mark);
  }
  await dp.reload(); await dp.waitForTimeout(800);
  if (await dp.locator('#intro').count()) fail('하루 한 번: 같은 날 다시 열었는데 레이어가 뜸');
  await dp.addInitScript(function () { window.__ppolTest = { today: '2026-11-08' }; });
  await dp.reload();
  if (!(await dp.waitForSelector('#intro', { timeout: 5000 }).then(function () { return true; }, function () { return false; }))) fail('하루 한 번: 날짜를 바꾼 첫 열기에 레이어가 안 뜸');
  else console.log('  ✓ 하루 한 번: 첫 열기 있음 → 같은 날 없음 → 다음 날 있음');
  await dctx.close();

  /* 4c) 2D 대체 */
  var p2 = await ctx.newPage();
  p2.on('pageerror', function (e) { errs.push('pageerror(2D): ' + e.message); });
  await p2.goto(INDEX + '?intro=1&scene=2d');
  await p2.waitForSelector('#intro'); await p2.waitForTimeout(600);
  var clouds2d = await p2.evaluate(function () { return document.querySelectorAll('.intro-sky2d .intro-cloud2d').length; });
  if (clouds2d < 3) fail('2D: 구름 창에 구름이 ' + clouds2d + '개');
  await p2.screenshot({ path: path.join(OUT, '8-2d-sky.png') }); console.log('  📷 tests/evidence/intro/8-2d-sky.png');
  await p2.waitForSelector('#intro[data-phase="title"]', { timeout: 15000 });
  await p2.click('.intro-title');
  await p2.waitForSelector('#intro', { state: 'detached', timeout: 8000 });
  var tr = await p2.evaluate(function () { var s = document.getElementById('stage'); return s ? s.style.translate : ''; });
  if (tr) fail('2D: 무대 translate 가 남음: ' + tr);
  await p2.close();

  /* 5) 실제 속도 녹화 (webm) — 첫 실행: 하늘 → 타이틀 → 누르기 → 이름 짓기 → 게임. SwiftShader 라 실기기보다 프레임이 성기다 */
  if (!process.env.NO_VIDEO) {
    var vctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1, locale: 'ko-KR', recordVideo: { dir: OUT, size: { width: 360, height: 740 } } });
    var vp = await vctx.newPage();
    await vp.addInitScript(function (h) { window.__ppolLook = h; }, { hour: HOUR, lantern: 8, weather: WEATHER, octState: 'idle', anchor: 'center' });
    await vp.goto(INDEX + '?intro=1');
    await vp.waitForSelector('#intro.hinted', { timeout: 15000 }); await vp.waitForTimeout(1600);
    await vp.click('.intro-title');
    await vp.waitForSelector('#name-dialog[open]', { timeout: 5000 }); await vp.waitForTimeout(600);   /* 첫 실행 그대로: 들어가면 이름 짓기 */
    await vp.fill('#name-in', '뚜루'); await vp.waitForTimeout(300); await vp.click('#name-form button[type=submit]'); await vp.waitForTimeout(1500);
    var vpath = await vp.video().path(); await vctx.close();
    fs.renameSync(vpath, path.join(OUT, 'intro.webm')); console.log('  🎞 tests/evidence/intro/intro.webm');
  }

  /* 6) 한 장 요약 (카메라 스트립 + 레이어 순서) → sheet.png */
  var row = function (names, w) { return '<div style="display:flex;gap:6px;margin-bottom:6px">' + names.map(function (n) { return '<figure style="margin:0;font:12px sans-serif;color:#a8b5b2"><img src="' + n + '.png" style="width:' + w + 'px;display:block"><figcaption>' + n + '</figcaption></figure>'; }).join('') + '</div>'; };
  var sheetHtml = path.join(OUT, '_sheet.html');
  fs.writeFileSync(sheetHtml, '<!doctype html><meta charset="utf-8"><body style="margin:0;padding:8px;background:#151d28;width:1230px">' + row(['cam-0', 'cam-1', 'cam-2', 'cam-3', 'cam-4', 'cam-5', 'cam-6', 'cam-7', 'cam-8'], 128) + row(['1-sky', '2-title', '3-title-hint', '4-leaving', '5-name', '6-game', '7-skip-to-game', '8-2d-sky'], 146) + '</body>');
  var sp = await ctx.newPage(); await sp.setViewportSize({ width: 1246, height: 400 });
  await sp.goto('file://' + sheetHtml); await sp.waitForTimeout(300);
  await sp.screenshot({ path: path.join(OUT, 'sheet.png'), fullPage: true }); fs.unlinkSync(sheetHtml);
  console.log('  📷 tests/evidence/intro/sheet.png');
  await browser.close();
  if (errs.length) { errs.forEach(function (e) { console.error('  ' + e); }); fail('에러 ' + errs.length + '건'); }
  console.log(process.exitCode ? '실패' : 'OK — 입장 레이어');
})().catch(function (e) { console.error(e); process.exit(1); });
