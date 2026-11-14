/* V1 탐침 14: 동작 줄이기 — 기기 설정(prefers-reduced-motion) 과 게임 설정(settings.motion 'reduce') 각각에서 빠른 비틀기 뒤 관성이 없나 */
const P = require('../../probe-lib.js');
(async () => {
  const b = await P.launch();
  for (const how of ['none', 'media', 'setting']) {
    const rec = P.REC(5); if (how === 'setting') rec.settings.motion = 'reduce';
    const { page, ctx } = await P.open(b, { rec, look: { hour: 13 } });
    if (how === 'media') { await page.emulateMedia({ reducedMotion: 'reduce' }); await page.waitForTimeout(300); }
    const cdp = await ctx.newCDPSession(page); const T0 = Date.now() + 50;
    const at = k => { const a = 60 * k * Math.PI / 180; return [{ x: 180 + 90 * Math.cos(a), y: 330 + 90 * Math.sin(a), id: 1 }, { x: 180 - 90 * Math.cos(a), y: 330 - 90 * Math.sin(a), id: 2 }]; };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(0), timestamp: T0 / 1000 });
    for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(i / 6), timestamp: (T0 + 16 * i) / 1000 }); await page.waitForTimeout(16); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [], timestamp: (T0 + 16 * 7) / 1000 });
    const a = await page.evaluate(() => APP.scene.yawInfo()); await page.waitForTimeout(900); const c = await page.evaluate(() => APP.scene.yawInfo());
    console.log(how, 'at release', a.yaw, 'v', a.v, '→ after', c.yaw, 'extra', +(c.yaw - a.yaw).toFixed(1));
    await ctx.close();
  }
  await b.close();
})();
