const P = require('../probe-lib.js');
const rect = (page, id) => page.evaluate(id => { const q = document.getElementById(id).getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height, hidden: document.getElementById(id).hidden }; }, id);
(async () => {
  const b = await P.launch();
  const { page } = await P.open(b, { lantern: 5 });
  await page.evaluate(() => APP.goRoom('loft'));
  await page.waitForFunction(() => { const e = document.getElementById('btn-sew'); return e && !e.hidden; }, null, { timeout: 15000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => APP.scene.zoomTo(54)); await page.waitForTimeout(500);
  // fling
  let caught = 0, tries = 0;
  for (tries = 0; tries < 4 && !caught; tries++) {
    const cdp = await page.context().newCDPSession(page);
    const y = 200;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 120, y, id: 0 }] });
    for (let i = 1; i <= 4; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 120 + i * (tries % 2 ? 4 : -4), y, id: 0 }] }); await page.waitForTimeout(5); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const pan = await page.evaluate(() => APP.scene.pan());
    const r = await rect(page, 'btn-sew');
    console.log('pan', JSON.stringify(pan), JSON.stringify(r));
    if (pan.mode === 'coast' && !r.hidden && r.w) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x + r.w / 2, y: r.y + r.h / 2, id: 1 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      caught = 1;
    }
    await cdp.detach();
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(500);
  console.log('coast tap -> open', await page.evaluate(() => document.getElementById('sew-sheet').open));
  await page.evaluate(() => document.getElementById('sew-sheet').close());
  await page.evaluate(() => APP.scene.zoomTo(1)); await page.waitForTimeout(400);
  await page.waitForFunction(() => !APP.goResting); await page.waitForTimeout(700);
  // salon mirror
  let r = await rect(page, 'btn-salon'); console.log('salon', r);
  if (!r.hidden && r.w) { await page.touchscreen.tap(r.x + r.w / 2, r.y + r.h / 2); await page.waitForTimeout(900); console.log('salon open', await page.evaluate(() => document.getElementById('salon-sheet').open)); await page.evaluate(() => document.getElementById('salon-close').click()); }
  await page.waitForTimeout(800);
  await page.evaluate(() => APP.goRoom('attic')); await page.waitForFunction(() => APP.scene.view() === 'attic' && !APP.goResting, null, {timeout: 20000}); await page.waitForTimeout(1000); await page.evaluate(() => APP.goRoom('play')); await page.waitForFunction(() => APP.scene.view() === 'play' && !document.getElementById('btn-machine').hidden, null, {timeout: 20000}); await page.waitForTimeout(1000);
  await page.waitForFunction(() => !APP.goResting);
  r = await rect(page, 'btn-machine'); console.log('machine', r);
  if (!r.hidden && r.w) { await page.touchscreen.tap(r.x + r.w / 2, r.y + r.h / 2); await page.waitForTimeout(900); console.log('machine dialogs open', await page.evaluate(() => [...document.querySelectorAll('dialog[open]')].map(d => d.id))); }
  await page.screenshot({ path: process.argv[2] || '/tmp/x.png' });
  await b.close();
})();
