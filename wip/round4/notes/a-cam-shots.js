/* lane A probe: room shots at angles. usage: node wip/round4/notes/a-cam-shots.js <prefix> [angles comma] */
const P = require('../probe-lib.js');
const path = require('path');
const OUT = path.join(P.ROOT, 'wip/round4/shots/a-cam');
(async () => {
  const pre = process.argv[2] || 'base', angs = (process.argv[3] || '0').split(',').map(Number);
  const b = await P.launch();
  for (const cfg of [{ k: 'attic-day', look: { hour: 13, weather: 'clear' } }, { k: 'attic-night', look: { hour: 22, weather: 'clear' } }, { k: 'loft', room: 'loft', look: { hour: 13, weather: 'clear' } }, { k: 'play', room: 'play', look: { hour: 13, weather: 'clear' } }]) {
    const { ctx, page } = await P.open(b, { lantern: 5, look: cfg.look });
    if (cfg.room) { await page.evaluate(r => APP.goRoom(r, { instant: true }), cfg.room); await page.waitForFunction(r => APP.scene.view() === r, cfg.room, { timeout: 20000 }); await page.waitForTimeout(800); }
    for (const a of angs) {
      await page.evaluate(a => { if (APP.scene.setYaw) APP.scene.setYaw(a, true); }, a);
      await page.waitForTimeout(700);
      await page.screenshot({ path: path.join(OUT, pre + '-' + cfg.k + '-' + a + '.png') });
    }
    await ctx.close();
  }
  await b.close();
})();
