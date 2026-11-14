#!/usr/bin/env node
/* tools/make-app-icons.js — 홈 화면 아이콘 · 파비콘 (11-15 주인: PWA) 을 게임의 진짜 3D 문어로 굽는다.
 *
 *   NODE_PATH=$(npm root -g) node tools/make-app-icons.js
 *
 * 게임을 file:// 로 열고 장면의 walkPortrait(0, { yaw: 0, still: true }) — 정면, 서 있는 몸 전체 — 를 투명 배경으로 찍는다.
 * 큰 아이콘은 64 칸 한 장을 정수 배로 (최근접) 키우고, 작은 파비콘 (32 · 16) 은 같은 렌더러로 문어를 작게 찍어 1× 그대로 쓴다 (줄이면 선이 뭉개진다).
 * 바탕은 장면의 남색 (Apollo #172038). maskable 512 는 가운데 지름 80 % 원 안에 든다.
 *   assets/icons/app/icon-192.png · icon-512.png · icon-512-maskable.png · apple-touch-icon.png (180) · favicon-32.png · favicon-16.png
 */
'use strict';
var fs = require('fs'), path = require('path');
var ROOT = path.resolve(__dirname, '..'), DIR = path.join(ROOT, 'assets/icons/app');
var BG = '#172038';
var OUT = [   /* [파일, 한 변, 문어가 들어갈 상자 한 변 (이 안에 정수 배로 가장 크게), 찍을 때 반폭 (작을수록 문어가 크다)] */
  ['icon-192.png', 192, 168, 1.7], ['icon-512.png', 512, 448, 1.7], ['icon-512-maskable.png', 512, 340, 1.7], ['apple-touch-icon.png', 180, 165, 1.7],
  ['favicon-32.png', 32, 30, 3.4], ['favicon-16.png', 16, 15, 7]
];
(async function () {
  var chromium = require('playwright').chromium;
  var browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  try {
    var page = await (await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1 })).newPage();
    await page.addInitScript({ content: 'localStorage.clear(); window.__ppolLook = { hour: 12 };' });
    page.on('pageerror', function (e) { console.log('pageerror', e.message); });
    await page.goto('file://' + path.join(ROOT, 'index.html') + '?intro=0&dev=0');
    await page.waitForFunction(function () { return window.APP && APP.scene && typeof APP.scene.walkPortrait === 'function'; }, null, { timeout: 30000 });
    await page.waitForTimeout(1500);
    var res = await page.evaluate(function (a) {
      var out = {};
      a.list.forEach(function (it) {
        var src = APP.scene.walkPortrait(0, { yaw: 0, still: true, hw: it[3], ty: 0.55, tilt: 12 }), W = src.width, d = src.getContext('2d').getImageData(0, 0, W, W).data;
        var l = W, t = W, r = -1, b = -1;
        for (var y = 0; y < W; y++) for (var x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] >= 128) { if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y; }
        var w = r - l + 1, h = b - t + 1, k = Math.max(1, Math.floor(it[2] / Math.max(w, h))), N = it[1];
        var cv = document.createElement('canvas'); cv.width = cv.height = N; var c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
        c.fillStyle = a.bg; c.fillRect(0, 0, N, N);
        var one = document.createElement('canvas'); one.width = w; one.height = h; var oc = one.getContext('2d');
        var im = src.getContext('2d').getImageData(l, t, w, h); for (var i = 3; i < im.data.length; i += 4) im.data[i] = im.data[i] >= 128 ? 255 : 0; oc.putImageData(im, 0, 0);
        c.drawImage(one, 0, 0, w, h, Math.floor((N - w * k) / 2), Math.floor((N - h * k) / 2), w * k, h * k);
        out[it[0]] = { url: cv.toDataURL('image/png'), w: w, h: h, k: k };
      });
      return out;
    }, { list: OUT, bg: BG });
    fs.mkdirSync(DIR, { recursive: true });
    Object.keys(res).forEach(function (f) { fs.writeFileSync(path.join(DIR, f), Buffer.from(res[f].url.split(',')[1], 'base64')); console.log(f + ': 문어 ' + res[f].w + 'x' + res[f].h + ' × ' + res[f].k); });
  } finally { await browser.close(); }
})().catch(function (e) { console.error(e); process.exit(1); });
