const P = require('../probe-lib.js');
(async () => {
  const b = await P.launch();
  const { page } = await P.open(b, { lantern: 5, w: +(process.argv[3] || 360), h: +(process.argv[4] || 740) });
  await page.evaluate(() => APP.goRoom('play'));
  await page.waitForFunction(() => APP.scene.view() === 'play' && !document.getElementById('btn-cook').hidden && !APP.goResting, null, { timeout: 20000 });
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => { const q = document.getElementById('btn-cook').getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height }; });
  const pan0 = await page.evaluate(() => JSON.stringify(APP.scene.pan()));
  console.log('cook rect', r);
  if (process.argv[5]) await page.screenshot({ path: process.argv[5] });
  // find a point picking the counter
  const pt = await page.evaluate(r => { const F = [0.5, 0.35, 0.65, 0.2, 0.8]; for (const fy of F) for (const fx of F) { const x = r.x + r.w * fx, y = r.y + r.h * fy, k = APP.scene.pickAt(x, y); if (k && k.kind === 'spot' && k.id === 'counter') return [x, y]; } return null; }, r);
  console.log('pt', pt);
  await page.touchscreen.tap(pt[0], pt[1]);
  await page.waitForSelector('#cook-overlay[open]', { timeout: 5000 });
  const fr = await (await page.$('#cook-overlay iframe')).contentFrame();
  await fr.waitForFunction(() => window.COOK && COOK.isOpen(), null, { timeout: 15000 });
  await page.waitForTimeout(1200);
  console.log('open', await page.evaluate(() => document.getElementById('cook-overlay').open), await fr.evaluate(() => COOK.live().screen));
  if (process.argv[2]) await page.screenshot({ path: process.argv[2] });
  // close via kitchen close button (tap)
  const cb = await fr.$('.ck-close'); await cb.tap();
  await page.waitForFunction(() => !document.getElementById('cook-overlay').open, null, { timeout: 5000 });
  console.log('closed; view', await page.evaluate(() => [APP.scene.view(), document.activeElement && document.activeElement.id, JSON.stringify(APP.scene.pan())]), pan0);
  // reopen and Esc
  await page.waitForTimeout(800);
  await page.evaluate(() => document.getElementById('btn-cook').click());
  await fr.waitForFunction(() => COOK.isOpen(), null, { timeout: 5000 });
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');
  const esc = await page.waitForFunction(() => !document.getElementById('cook-overlay').open, null, { timeout: 5000 }).then(() => true, () => false);
  console.log('esc closes', esc, await fr.evaluate(() => COOK.isOpen()));
  await b.close();
})();
