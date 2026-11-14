/* 느린 로드: js/app.js · js/scene3d.js 를 2.5 s 늦춘다 → 로딩 문어만 보이고 (벡터 문어 X) · 게임이 서면 걷힌다 */
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..', '..', '..');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true, reducedMotion: process.argv[3] === 'reduce' ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const fs = require('fs');
  await page.route(/\/js\/(app|scene3d)\.js$/, async route => { await new Promise(r => setTimeout(r, 2500)); route.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(path.join(ROOT, new URL(route.request().url()).pathname.replace(/^.*\/js\//, 'js/'))) }); });
  page.goto('file://' + ROOT + '/index.html?intro=0&dev=0').catch(() => {});
  const shots = process.argv[2];
  const st = () => page.evaluate(() => { const o = document.getElementById('oct-svg'), bt = document.getElementById('boot'); const vis = el => { if (!el) return false; const r = el.getBoundingClientRect(); return getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none' && r.width > 0 && !el.closest('[hidden]'); }; let p = o; let shown = vis(o); while (p && shown) { if (getComputedStyle(p).display === 'none') shown = false; p = p.parentElement; } return { boot: !!bt && getComputedStyle(bt).display !== 'none', vec: shown, booted: document.documentElement.classList.contains('booted'), bg: (getComputedStyle(document.querySelector('#boot .boot-oct') || document.body).backgroundPosition) }; }).catch(e => ({ err: e.message }));
  await page.waitForSelector('#boot', { state: 'attached', timeout: 10000 });
  const log = [];
  for (let i = 0; i < 3; i++) { await page.waitForTimeout(i ? 330 : 400); log.push(await st()); if (shots) await page.screenshot({ path: shots.replace('N', i + 1) }); }
  await page.waitForFunction(() => document.documentElement.classList.contains('booted'), null, { timeout: 30000 });
  log.push(await st());
  console.log(JSON.stringify(log));
  await b.close();
})();
