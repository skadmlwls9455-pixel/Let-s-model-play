/* V4 탐침: 겨울 마당을 돌려 지붕 눈이 뜨는지 · 밤 다락 계단 표시를 돌린 각도에서. 쓰기: NODE_PATH=$(npm root -g) node wip/round4/verify/V4/winter-stairs.js */
const path = require('path');
const P = require(path.resolve(__dirname, '..', '..', 'probe-lib.js'));
(async () => {
  const b = await P.launch(); const out = path.resolve(__dirname);
  { const { ctx, page } = await P.open(b, { rec: P.REC(8, null, 14), look: { hour: 13, lantern: 8, weather: 'snow', season: 'winter' } });
    await page.evaluate(() => APP.goRoom('yard')); await page.waitForTimeout(1500);
    for (const deg of [0, 180, 270]) { await page.evaluate(d => APP.scene.setYaw(d, true), deg); await page.waitForTimeout(700);
      await page.screenshot({ path: path.join(out, 'yard-winter-' + deg + '.png') }); }
    console.log('season', await page.evaluate(() => APP.scene.season()));
    await ctx.close(); }
  { const { ctx, page } = await P.open(b, { rec: P.REC(0, null, 1), look: { hour: 22, lantern: 0, weather: 'clear' } });
    for (const deg of [0, 90, 135, 180]) { await page.evaluate(d => APP.scene.setYaw(d, true), deg); await page.waitForTimeout(800);
      const s = await page.evaluate(() => { const x = APP.scene.stats(); return { cueK: x.cueK, cueAttic: x.cueAttic }; });
      console.log('attic night', deg, JSON.stringify(s));
      await page.screenshot({ path: path.join(out, 'attic-night-' + deg + '.png') }); }
    await ctx.close(); }
  await b.close();
})();
