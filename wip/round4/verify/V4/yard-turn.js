/* V4 탐침: 마당을 0/90/180/270° 로 돌려 찍는다 (낮 · 밤). 함께한 날 14 → 다섯 칸 열림. 쓰기: NODE_PATH=$(npm root -g) node wip/round4/verify/V4/yard-turn.js */
const path = require('path');
const P = require(path.resolve(__dirname, '..', '..', 'probe-lib.js'));
(async () => {
  const b = await P.launch(); const out = path.resolve(__dirname);
  for (const hour of [13, 21]) {
    const rec = P.REC(8, { octopus: undefined }, 14); const r = P.REC(8, null, 14); r.octopus.days = r.octopus.days.slice(); 
    const { ctx, page } = await P.open(b, { rec: r, look: { hour, lantern: 8, weather: 'clear' } });
    const res = await page.evaluate(() => APP.goRoom('yard')).catch(e => ({ err: String(e) }));
    await page.waitForFunction(() => APP.scene && APP.scene.view && APP.scene.view() === 'yard', null, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const view = await page.evaluate(() => APP.scene.view());
    for (const deg of [0, 90, 180, 270]) {
      await page.evaluate(d => APP.scene.setYaw(d, true), deg); await page.waitForTimeout(700);
      const st = await page.evaluate(() => { const s = APP.scene.stats(); return { yaw: APP.scene.yaw && APP.scene.yaw(), view: APP.scene.view() }; });
      console.log(hour, deg, JSON.stringify(res), view, JSON.stringify(st));
      await page.screenshot({ path: path.join(out, 'yard-' + hour + 'h-' + deg + '.png') });
    }
    // 진짜 손가락으로 비틀기 한 번 (90°)
    await page.evaluate(() => APP.scene.setYaw(0, true)); await page.waitForTimeout(300);
    await P.twist(page, 180, 400, 90, 0, 90, 24); await page.waitForTimeout(800);
    console.log(hour, 'twist90 → yaw', await page.evaluate(() => APP.scene.yaw && APP.scene.yaw()));
    await ctx.close();
  }
  await b.close();
})();
