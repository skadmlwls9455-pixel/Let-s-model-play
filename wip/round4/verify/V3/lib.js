/* wip/round4/verify/V3/lib.js — V3 탐침 도우미 (probe-lib.js 를 고쳐 씀: 뿌리 폴더를 고를 수 있다 · 콘솔 오류 · 소리 요청 기록) */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const OUT = __dirname;
const P = require(path.join(ROOT, 'wip/round4/probe-lib.js'));
async function launch() { return chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--autoplay-policy=user-gesture-required'] }); }
/* o = probe-lib open 과 같음 + root (다른 빌드) · raw (localStorage 에 그대로 넣을 열쇠들) · sound (ppolppol_audio) */
async function open(browser, o) {
  o = o || {};
  const touch = o.touch !== false;
  const ctx = await browser.newContext({ viewport: { width: o.w || 360, height: o.h || 740 }, deviceScaleFactor: o.dpr || 1, locale: 'ko-KR', hasTouch: touch, isMobile: touch });
  await ctx.addInitScript({ content: 'window.__ppolAwakeMs = 0;' });
  const page = await ctx.newPage();
  const log = { errors: [], warns: [], audio: [], acNew: 0 };
  page.on('pageerror', e => log.errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') log.errors.push('console: ' + m.text()); else if (m.type() === 'warning') log.warns.push(m.text()); });
  page.on('request', r => { const u = r.url(); if (/\/(audio|foley)\//.test(u)) log.audio.push(u.replace(/^.*?\/(audio|foley)\//, '$1/')); });
  const seed = {};
  if (o.rec !== null) seed.ppolppol_v2 = JSON.stringify(o.rec || P.REC(o.lantern == null ? 3 : o.lantern));
  Object.assign(seed, o.raw || {});
  /* AudioContext 를 만든 횟수 · 그 때 사용자 손길이 있었나 */
  await ctx.addInitScript({ content: '(' + function () {
    window.__ac = []; var g = false; ['pointerdown', 'touchstart', 'keydown', 'click'].forEach(function (t) { addEventListener(t, function () { g = true; }, true); });
    ['AudioContext', 'webkitAudioContext'].forEach(function (k) { var A = window[k]; if (!A) return; var W = function () { window.__ac.push({ gesture: g, at: Date.now(), href: location.pathname }); return Reflect.construct(A, arguments, W); }; W.prototype = A.prototype; window[k] = W; });
    var HA = window.HTMLMediaElement && HTMLMediaElement.prototype.play; if (HA) HTMLMediaElement.prototype.play = function () { window.__ac.push({ media: this.currentSrc || this.src, gesture: g }); return HA.apply(this, arguments); };
  } + ')();' });
  await page.addInitScript({ content: "if (!localStorage.getItem('__seed')) { localStorage.setItem('__seed', '1'); var s = " + JSON.stringify(seed) + "; for (var k in s) localStorage.setItem(k, s[k]); } " +
    'window.__ppolTest = Object.assign(window.__ppolTest || {}, { today: ' + JSON.stringify(o.today || '2026-11-14') + ' });' + (o.look ? 'window.__ppolLook = ' + JSON.stringify(o.look) + ';' : '') });
  const root = o.root || ROOT;
  await page.goto('file://' + root + '/index.html?dev=0&intro=0' + (o.q || ''));
  if (o.noWait) return { ctx, page, log };
  await page.waitForSelector('#btn-go:not(.away)', { timeout: 30000 });
  await page.waitForFunction(() => window.APP && !APP.goResting, null, { timeout: 30000 });
  await page.waitForTimeout(500);
  return { ctx, page, log };
}
async function waitIdle(page, ms) {
  await page.waitForFunction(function () { var b = document.getElementById('btn-go'); return b && !b.classList.contains('away') && !(window.APP && APP.goResting); }, null, { timeout: ms || 40000 });
}
async function skipAway(page) {
  await page.waitForFunction(function () { var b = document.getElementById('btn-go'); if (!b) return false; if (!b.classList.contains('away')) return true; if (b.classList.contains('can-skip')) { b.click(); return true; } return false; }, null, { timeout: 40000, polling: 50 });
}
/* 손가락 톡 (CDP 터치) */
async function tap(page, x, y) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}
async function tapSel(page, sel) {
  const b = await page.$(sel); if (!b) throw new Error('no ' + sel);
  await b.scrollIntoViewIfNeeded().catch(() => {});
  const r = await b.boundingBox(); if (!r) throw new Error('hidden ' + sel);
  await tap(page, r.x + r.width / 2, r.y + r.height / 2);
}
function shot(page, name) { return page.screenshot({ path: path.join(OUT, name + '.png') }); }
module.exports = { ROOT, OUT, P, REC: P.REC, launch, open, waitIdle, skipAway, tap, tapSel, shot, touchPath: P.touchPath, twist: P.twist, fs, path };
