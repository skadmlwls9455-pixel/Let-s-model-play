const P = require('../probe-lib.js');
(async () => {
  const b = await P.launch();
  const { page } = await P.open(b, { lantern: 5, w: +(process.argv[3]||360), h: +(process.argv[4]||740) });
  await page.evaluate(() => APP.goRoom('loft'));
  await page.waitForFunction(() => { const e = document.getElementById('btn-sew'); return e && !e.hidden; }, null, { timeout: 15000 });
  await page.waitForTimeout(600);
  await page.evaluate(() => document.getElementById('btn-sew').click());
  await page.waitForTimeout(900);
  console.log(await page.evaluate(() => { const d = document.getElementById('sew-sheet'); const r = d.getBoundingClientRect(); return { h: r.height, top: r.top, sh: d.scrollHeight }; }));
  if (process.argv[5]) { await page.evaluate(() => { const x = document.querySelector('#sew-body details'); if (x) x.open = true; }); await page.waitForTimeout(300); console.log(await page.evaluate(() => { const d = document.getElementById('sew-sheet'); const r = d.getBoundingClientRect(); return { h: r.height, top: r.top, sh: d.scrollHeight }; })); }
  await page.screenshot({ path: process.argv[2] });
  await b.close();
})();
