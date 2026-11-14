#!/usr/bin/env node
/* tools/make-loading-oct.js — 로딩 문어 (11-15 주인: "게임 속 문어가 오른쪽으로 뽈뽈 기어가는 반복 그림") 를 게임의 진짜 3D 문어로 굽는다.
 *
 *   NODE_PATH=$(npm root -g) node tools/make-loading-oct.js
 *
 * 게임을 file:// 로 열고 (WebGL · swiftshader) 장면의 walkPortrait(위상) 로 걷는 옆모습 8 칸 (걸음 둘 = 한 바퀴) 을 투명 배경으로 찍는다 —
 * 걷기 공식 · 조명 · 후처리 · 팔레트가 게임 그대로. 칸들을 하나의 공통 상자로 잘라 가로 띠 assets/ui/loading_oct.png (1×, 최근접) 로 쓰고
 * assets/manifest.json 의 "ui.loading.oct" 를 고친다 (다른 키는 그대로). 로딩 레이어 (index.html #boot · css 는 같은 파일 머리) 가 steps() 로 돌린다.
 * 기본 몸색 · 기본 팔레트 (첫 실행 문어). 만드는 사람만 돌린다 — 배포에는 결과 그림만 나간다.
 */
'use strict';
var fs = require('fs'), path = require('path');
var ROOT = path.resolve(__dirname, '..');
var OUT = path.join(ROOT, 'assets/ui/loading_oct.png'), MANIFEST = path.join(ROOT, 'assets/manifest.json');
var FRAMES = 8;
(async function () {
  var chromium = require('playwright').chromium;
  var browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  try {
    var ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1, locale: 'ko-KR' });
    await ctx.addInitScript({ content: "localStorage.clear(); window.__ppolLook = { hour: 12 };" });
    var page = await ctx.newPage();
    page.on('pageerror', function (e) { console.log('pageerror', e.message); });
    await page.goto('file://' + path.join(ROOT, 'index.html') + '?intro=0&dev=0');
    await page.waitForFunction(function () { return window.APP && APP.scene && typeof APP.scene.walkPortrait === 'function'; }, null, { timeout: 30000 });
    await page.waitForTimeout(1500);
    var res = await page.evaluate(function (N) {
      var cvs = [];
      for (var k = 0; k < N; k++) cvs.push(APP.scene.walkPortrait(k * 2 / N, { yaw: 90, hw: 1.75, ty: 0.5 }));
      /* 공통 상자 (모든 칸에서 알파 > 0) */
      var W = cvs[0].width, H = cvs[0].height, l = W, t = H, r = -1, b = -1;
      cvs.forEach(function (c) {
        var d = c.getContext('2d').getImageData(0, 0, W, H).data;
        for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 0) { if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y; }
      });
      if (r < 0) return { err: 'empty' };
      l = Math.max(0, l - 1); r = Math.min(W - 1, r + 1); t = Math.max(0, t - 1);   /* 한 칸 여유 (아래는 발끝 = 바닥선 그대로) */
      var w = r - l + 1, h = b - t + 1, out = document.createElement('canvas'); out.width = w * N; out.height = h;
      var o = out.getContext('2d'); o.imageSmoothingEnabled = false;
      cvs.forEach(function (c, k) { o.drawImage(c, l, t, w, h, k * w, 0, w, h); });
      /* 반투명 가장자리는 없앤다 (알파 0 아니면 255 — 픽셀 그대로) */
      var im = o.getImageData(0, 0, out.width, h); for (var i = 3; i < im.data.length; i += 4) im.data[i] = im.data[i] >= 128 ? 255 : 0; o.putImageData(im, 0, 0);
      return { w: w, h: h, url: out.toDataURL('image/png') };
    }, FRAMES);
    if (res.err) throw new Error(res.err);
    fs.writeFileSync(OUT, Buffer.from(res.url.split(',')[1], 'base64'));
    var man = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    man['ui.loading.oct'] = { src: 'assets/ui/loading_oct.png', w: res.w * FRAMES, h: res.h, frames: FRAMES, cell: res.w,
      note: '로딩 문어 (11-15): 게임 3D 문어의 걷는 옆모습 ' + FRAMES + '칸 가로 띠 (tools/make-loading-oct.js 가 walkPortrait 로 굽는다). index.html #boot 가 steps(' + FRAMES + ') 로 돌린다' };
    fs.writeFileSync(MANIFEST, JSON.stringify(man, null, 2) + '\n');
    console.log('loading_oct.png ' + res.w + 'x' + res.h + ' × ' + FRAMES + ' 칸 → ' + path.relative(ROOT, OUT));
  } finally { await browser.close(); }
})().catch(function (e) { console.error(e); process.exit(1); });
