/* lane A final shots: contact sheet (attic day / attic night / loft / play x 0 90 180 270) + twist mid-gesture + stick at 180.
   usage: NODE_PATH=$(npm root -g) node wip/round4/notes/a-cam-final.js */
const P = require('../probe-lib.js');
const path = require('path');
const OUT = path.join(P.ROOT, 'wip/round4/shots/a-cam');
(async () => {
  const b = await P.launch(), rows = [];
  for (const cfg of [{ k: 'attic-day', look: { hour: 13, weather: 'clear' } }, { k: 'attic-night', look: { hour: 22, weather: 'clear' } }, { k: 'loft', room: 'loft', look: { hour: 13, weather: 'clear' } }, { k: 'play', room: 'play', look: { hour: 13, weather: 'clear' } }]) {
    const { ctx, page } = await P.open(b, { lantern: 5, look: cfg.look });
    if (cfg.room) { await page.evaluate(r => APP.goRoom(r), cfg.room); await page.waitForFunction(r => APP.scene.view() === r && !APP.scene.motion().dq && !APP.scene.motion().trans, cfg.room, { timeout: 30000 }); }
    const row = [];
    for (const a of [0, 90, 180, 270]) {
      await page.evaluate(a => APP.scene.setYaw(a, true), a);
      await page.waitForFunction(() => { const y = APP.scene.yawInfo(); return !y.easing && !APP.scene.pan().mode; });
      await page.waitForTimeout(500);
      const f = path.join(OUT, cfg.k + '-' + a + '.png'); await page.screenshot({ path: f }); row.push(f);
    }
    rows.push(row);
    if (cfg.k === 'attic-day') {
      /* twist mid-gesture: two fingers held at +35 deg (not released) */
      await page.evaluate(() => APP.scene.setYaw(0, true));
      const cdp = await page.context().newCDPSession(page);
      const at = a => { const t = a * Math.PI / 180; return [{ x: 180 + 90 * Math.cos(t), y: 330 + 90 * Math.sin(t), id: 1 }, { x: 180 - 90 * Math.cos(t), y: 330 - 90 * Math.sin(t), id: 2 }]; };
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(0) });
      for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(3.5 * i) }); await page.waitForTimeout(20); }
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT, 'twist-mid.png') });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      /* stick at 180: push up, shot while walking */
      await page.evaluate(() => { APP.scene.setYaw(180, true); APP.scene.debugPlayerAt(0.6, 0.9); });
      await page.waitForTimeout(400);
      await page.evaluate(() => APP.scene.setPlayerInput({ x: 0, y: 1 }));
      await page.waitForTimeout(450);
      await page.screenshot({ path: path.join(OUT, 'stick-180.png') });
      await page.evaluate(() => APP.scene.setPlayerInput(null));
    }
    await ctx.close();
  }
  await b.close();
  console.log(JSON.stringify(rows.map(r => r.map(f => path.basename(f)))));
})();
