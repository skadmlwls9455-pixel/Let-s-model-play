/* wip/round6/notes/R-cover.js — 진짜 로딩 덮개 (#boot) 수명 재기 (아무것도 붙잡지 않음, ?intro=0).
   NODE_PATH=$(npm root -g) node wip/round6/notes/R-cover.js [root] [stripDir]
   첫 그림(first-paint)부터 #boot 가 display:none 이 될 때까지 · 차가운 (새 컨텍스트) / 따뜻한 (같은 컨텍스트 다시 열기) · 1280x800@1 과 360x740@2 */
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '../../..')), STRIP = process.argv[3];
const INIT = `(function () {
  var r = window.__cov = { fp: null, hide: null, shown: null };
  try { new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) { if (e.name === 'first-paint' && r.fp == null) r.fp = e.startTime; }); }).observe({ type: 'paint', buffered: true }); } catch (e) {}
  requestAnimationFrame(function t() { var b = document.getElementById('boot'); if (b) { var d = getComputedStyle(b).display; if (d !== 'none' && r.shown == null) r.shown = performance.now(); if (d === 'none' && r.shown != null && r.hide == null) { r.hide = performance.now(); return; } } requestAnimationFrame(t); });
})();`;
(async () => {
  const br = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const url = 'file://' + path.join(ROOT, 'index.html') + '?intro=0&dev=0';
  const out = {};
  for (const [w, h, dpr] of [[1280, 800, 1], [360, 740, 2]]) {
    const key = w + 'x' + h + '@' + dpr, res = { cold: [], warm: [] };
    for (let rep = 0; rep < 3; rep++) {
      const ctx = await br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, locale: 'ko-KR' });
      await ctx.addInitScript({ content: "window.__ppolAwakeMs = 0;" + INIT });
      const page = await ctx.newPage();
      for (const kind of ['cold', 'warm']) {
        const shots = [];
        await page.goto(url, { waitUntil: 'commit' });
        if (STRIP && rep === 0 && kind === 'warm') { const t0 = Date.now(); for (let i = 0; i < 40; i++) { const t = Date.now() - t0; shots.push(await page.screenshot({ path: path.join(STRIP, key + '-' + String(t).padStart(5, '0') + '.png') }).then(() => t)); if (await page.evaluate(() => window.__cov && window.__cov.hide != null).catch(() => false)) break; const wait = 100 - ((Date.now() - t0) % 100); await page.waitForTimeout(wait); } }
        await page.waitForFunction(() => window.__cov && window.__cov.hide != null, null, { timeout: 30000 });
        const c = await page.evaluate(() => window.__cov);
        res[kind].push(Math.round(c.hide - (c.fp != null ? c.fp : c.shown)));
      }
      await ctx.close();
    }
    out[key] = res;
  }
  console.log(JSON.stringify(out));
  await br.close();
})();
