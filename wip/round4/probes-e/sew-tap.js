const P = require('../probe-lib.js');
(async () => {
  const b = await P.launch();
  const rec = P.REC(5, null);
  rec.settings.player = undefined;
  const { page } = await P.open(b, { lantern: 5 });
  await page.evaluate(() => APP.goRoom('loft'));
  await page.waitForFunction(() => { const e = document.getElementById('btn-sew'); return e && !e.hidden && e.getBoundingClientRect().width > 0; }, null, { timeout: 15000 });
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => { const q = document.getElementById('btn-sew').getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height }; });
  console.log('rect', r);
  const pts = [[0.5, 0.5], [0.2, 0.3], [0.8, 0.7]];
  for (const [fx, fy] of pts) {
    await page.touchscreen.tap(r.x + r.w * fx, r.y + r.h * fy);
    await page.waitForTimeout(900);
    const st = await page.evaluate(() => ({ open: document.getElementById('sew-sheet').open, toast: (document.getElementById('toast') || {}).textContent }));
    console.log(fx, fy, JSON.stringify(st));
    if (process.argv[2]) await page.screenshot({ path: process.argv[2] });
    await page.evaluate(() => { const d = document.getElementById('sew-sheet'); if (d.open) d.close(); document.getElementById('toast').textContent=''; });
    await page.waitForFunction(() => !APP.goResting); await page.waitForTimeout(700);
  }
  await b.close();
})();
