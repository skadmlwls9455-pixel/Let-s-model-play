#!/usr/bin/env node
/* tools/intro-shots.js — 입장 레이어 스모크 + 스크린샷 (docs/UI_ART.md "입장"). SwiftShader WebGL, 360×740.
 *   node tools/intro-shots.js [hour] [weather]     # → tests/evidence/intro/*.png
 * 확인하는 것:
 *  0) 부팅 경로 (11-11, 진짜 부팅 ?intro=1 · 시간은 debugStep 으로만 → 기계가 바빠도 같은 값): 하늘은 진짜 장면 크기로 지어진다 —
 *     하늘이 처음 그려질 때의 렌더 크기 = 장면 칸 크기 = 그 뒤(1 s 넘게 지난 뒤)의 크기 · 출발 높이 = 화면 높이의 INTRO.SKY.height 배 (360×740 · 430×932) ·
 *     맨 위 멈춤 중에 화면 크기가 바뀌어도(→ 412×915) 그대로 · 뚫는 구름이 화면 폭을 다 덮는다 (가운데 가로줄이 끝에서 끝까지 구름 몸 색).
 *     예전엔 숨은 칸(0×0 → 320×240 어림)에서 지어 폰에서 0.85 화면 높이 · 폭 368 px 짜리였는데, 3) 은 부팅 뒤에 다시 시작해서 재므로 못 잡았다. BOOT_ONLY=1 이면 0) 만 돌린다.
 *     크기가 바뀔 때 (11-11 보강): 내려가는 중(1.0 s)에 한 번 더 바뀌어도(→ 430×932) 진행도와 높이가 그대로다 (연출이 처음부터 다시 돌지 않는다) · 하늘은 한 겹이다 —
 *     덮임 프레임의 드로우콜 = 그 크기로 바로 부팅한 페이지의 값, 착지 뒤의 드로우콜 · frameY = 연출 없는 부팅(?intro=0)의 값 (옛 하늘이 장면에 남으면 는다) ·
 *     줌만 바뀌어도(API zoomStep) 높이가 그대로다 · 연출 없는 부팅에서도 장면이 첫 프레임부터 장면 칸 크기다 (app.js 가 칸을 먼저 드러낸다)
 *  1) 첫 실행: ?intro=1 → 하늘 단계 → 로고 올라옴 → 로고 누름 → 레이어 사라짐 → 이름 창이 그다음에 열림
 *  2) 다시 열기: 하늘 단계 중에 누르면 바로 착지 + 바로 게임 (이름 창 없음), 아래 UI 가 inert 풀림
 *  3) 장면 카메라 하강 프레임 스트립 (debugStep, 결정적, INTRO.SKY 와 같은 dur · top · height): 멈춤 끝 · 구름 사이 · 뚫기 직전 · 덮임 · 구름 밑 · 지붕 · 착지
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

  /* 0) 부팅 경로: 하늘이 진짜 장면 크기로 지어지는가. 페이지가 내놓는 것만 쓴다 (APP.scene.stats · debugStep · introProgress · introSkip · zoomStep · setExpression · INTRO.SKY · CLOUDS.ramp) */
  function raf2(pg) { return pg.evaluate(function () { return new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); }); }); }
  async function midRow(pg) {   /* 장면 캔버스 한가운데 가로 한 줄 (화면에 보이는 그대로) 의 색 세기 */
    await raf2(pg);
    var clip = await pg.evaluate(function () { var c = document.querySelector('#scene3d canvas').getBoundingClientRect(); return { x: c.left, y: Math.floor(c.top + c.height / 2), width: c.width, height: 1 }; });
    var b64 = (await pg.screenshot({ clip: clip })).toString('base64');
    return pg.evaluate(function (src) {
      return new Promise(function (res, rej) {
        var im = new Image();
        im.onload = function () {
          var cv = document.createElement('canvas'); cv.width = im.width; cv.height = 1; var x = cv.getContext('2d'); x.drawImage(im, 0, 0);
          var d = x.getImageData(0, 0, im.width, 1).data, cnt = {}, top = null;
          for (var i = 0; i < d.length; i += 4) { var hx = '#' + ((1 << 24) | (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]).toString(16).slice(1); cnt[hx] = (cnt[hx] || 0) + 1; if (!top || cnt[hx] > cnt[top]) top = hx; }
          var s = APP.scene.stats(); res({ n: im.width, top: top, share: cnt[top] / im.width, body: CLOUDS.ramp(window.__ppolLook.weather, s.phase, false).t[3] });
        };
        im.onerror = function () { rej(new Error('midRow: 그림을 못 읽음')); }; im.src = 'data:image/png;base64,' + src;
      });
    }, b64);
  }
  var LOOK = { hour: HOUR, lantern: 8, weather: WEATHER, octState: 'idle', anchor: 'center' }, same = function (x, y) { return x[0] === y[0] && x[1] === y[1]; };
  async function bootPage(W, H, sky) {   /* 새 context 의 새 페이지. sky = 진짜 부팅 ?intro=1, 아니면 연출 없는 부팅 ?intro=0 */
    var bctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, locale: 'ko-KR' });
    var bp = await bctx.newPage();
    bp.on('pageerror', function (e) { errs.push('pageerror(부팅 경로): ' + e.message); });
    await bp.addInitScript(function (h) { window.__ppolLook = h; }, LOOK);
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
    await step(1.36 - cur.p * cur.dur);   /* 뚫는 구름 몸 한가운데가 화면 가운데를 지날 무렵 (곡선에서 1.39 s, 다 덮는 프레임은 1.35 ~ 1.37 s) */
    var mid = await read(bp), row = await midRow(bp);
    if (!same(mid.target, cur.target)) fail(tag + '1 s 넘게 지난 뒤 렌더 크기가 ' + cur.target.join('×') + ' → ' + mid.target.join('×') + ' 로 바뀜');
    if (!(row.share === 1 && row.top === row.body)) fail(tag + '뚫는 구름이 화면 폭(' + row.n + ' px)을 다 못 덮음: 가운데 가로줄의 ' + Math.round(row.share * 1000) / 10 + ' % 가 ' + row.top + ' (구름 몸 색 ' + row.body + ')');
    /* 하늘은 한 겹: 크기가 바뀐 뒤의 덮임 프레임은 그 크기로 바로 부팅한 페이지의 같은 순간과 드로우콜이 같다 (옛 하늘이 장면에 남으면 그 구름만큼 는다) */
    if (o.calls != null && mid.calls !== o.calls) fail(tag + '크기가 바뀐 뒤 덮임 프레임의 드로우콜 ' + mid.calls + ' ≠ ' + x(way[way.length - 1]) + ' 로 바로 부팅한 페이지의 ' + o.calls + ' (옛 하늘이 남아 두 겹이면 는다)');
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
      ' · 가운데 가로줄 ' + Math.round(row.share * 1000) / 10 + ' % ' + row.top + ' / ' + row.n + ' px · 덮임 프레임 드로우콜 ' + mid.calls + (o.calls != null ? ' (바로 부팅 ' + o.calls + ')' : '') +
      (z ? ' · 줌 멈춤 ' + o.zoom + ': 높이 ' + hM.toFixed(3) + ' → ' + hZ.toFixed(3) + ' 화면' : ' · 착지 뒤 드로우콜 ' + callsR + (callsN != null ? ' (연출 없는 부팅 ' + callsN + ' · 표정 ' + rest.expr + ')' : '')) + ' · frameY ' + rest.frameY);
    await bp.context().close(); return mid.calls;
  }
  var bad0 = process.exitCode;
  var ref = await bootRef(430, 932);
  var direct = await bootSky(430, 932, { zoom: 3, ref: ref });
  await bootSky(360, 740, { hold: [412, 915], mid: [430, 932], ref: ref, calls: direct });
  if (ref) await ref.close();
  if (process.exitCode === bad0) console.log('  ✓ 부팅 경로: 하늘이 진짜 장면 크기로 지어지고, 크기가 바뀌어도 한 겹으로 이어진다');
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
