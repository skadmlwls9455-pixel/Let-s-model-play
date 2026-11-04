#!/usr/bin/env node
/* tools/intro-shots.js — 입장 레이어 스모크 + 스크린샷 (docs/UI_ART.md "입장"). SwiftShader WebGL, 360×740.
 *   node tools/intro-shots.js [hour] [weather]     # → tests/evidence/intro/*.png
 * 확인하는 것:
 *  1) 첫 실행: ?intro=1 → 하늘 단계 → 로고 올라옴 → 로고 누름 → 레이어 사라짐 → 이름 창이 그다음에 열림
 *  2) 다시 열기: 하늘 단계 중에 누르면 바로 착지 + 바로 게임 (이름 창 없음), 아래 UI 가 inert 풀림
 *  3) 장면 카메라 하강 프레임 스트립 (debugStep, 결정적): 0 · 0.25 · 0.5 · 0.75 · 1.0 · 1.4 · 2.2 s
 *  4) ?intro 없이(자동화 브라우저 기본) 레이어가 안 뜬다 — 기존 스모크가 그대로 돈다
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

  /* 3) 카메라 하강 스트립 (결정적) */
  await page.evaluate(function () { APP.scene.bubble('', 0); APP.scene.intro({ dur: 2.2 }); });
  var ts = [0, 0.25, 0.5, 0.75, 1.0, 1.4, 2.2], last = 0;
  for (var i = 0; i < ts.length; i++) {
    await page.evaluate(function (dt) { var n = Math.round(dt * 24); for (var j = 0; j < n; j++) APP.scene.debugStep(1 / 24); if (!n) APP.scene.debugStep(0.001); }, ts[i] - last); last = ts[i];
    await page.locator('#scene').screenshot({ path: path.join(OUT, 'cam-' + i + '.png') });
  }
  await page.evaluate(function () { APP.scene.resume(); });
  console.log('  📷 tests/evidence/intro/cam-0..' + (ts.length - 1) + '.png');

  /* 4) 자동화 기본 = 생략 */
  await page.goto(INDEX); await page.waitForTimeout(400);
  if (await page.locator('#intro').count()) fail('?intro 없이 자동화 브라우저에서 레이어가 뜸');

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
  fs.writeFileSync(sheetHtml, '<!doctype html><meta charset="utf-8"><body style="margin:0;padding:8px;background:#151d28;width:1230px">' + row(['cam-0', 'cam-1', 'cam-2', 'cam-3', 'cam-4', 'cam-5', 'cam-6'], 168) + row(['1-sky', '2-title', '3-title-hint', '4-leaving', '5-name', '6-game', '7-skip-to-game'], 168) + '</body>');
  var sp = await ctx.newPage(); await sp.setViewportSize({ width: 1246, height: 400 });
  await sp.goto('file://' + sheetHtml); await sp.waitForTimeout(300);
  await sp.screenshot({ path: path.join(OUT, 'sheet.png'), fullPage: true }); fs.unlinkSync(sheetHtml);
  console.log('  📷 tests/evidence/intro/sheet.png');
  await browser.close();
  if (errs.length) { errs.forEach(function (e) { console.error('  ' + e); }); fail('에러 ' + errs.length + '건'); }
  console.log(process.exitCode ? '실패' : 'OK — 입장 레이어');
})().catch(function (e) { console.error(e); process.exit(1); });
