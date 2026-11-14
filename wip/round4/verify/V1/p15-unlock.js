/* V1 탐침 15: 함께한 날 6 / 7 / 15 / 30 일 기록을 처음 열 때 '새 칸' 한 줄과 열린 칸 수 · 다시 열면 그 줄이 없나 */
const P = require('../../probe-lib.js');
(async () => {
  const b = await P.launch();
  for (const n of [6, 7, 15, 30]) {
    const days = []; for (let i = 0; i < n; i++) days.push(new Date(Date.UTC(2026, 9, 10 + i)).toISOString().slice(0, 10));
    const rec = P.REC(5); rec.octopus.days = days;
    const { page, ctx } = await P.open(b, { rec, look: { hour: 13 } });
    const seen = await page.waitForFunction(() => /마당에 밭/.test(document.body.innerText) ? document.body.innerText.match(/마당에 밭[^\n]*/)[0] : false, null, { timeout: 12000 }).then(h => h.jsonValue(), () => null);
    const open = await page.evaluate(() => APP.scene.plotsDebug().open);
    await page.reload(); await page.waitForFunction(() => window.APP && !APP.goResting, null, { timeout: 20000 }); await page.waitForTimeout(6000);
    const again = await page.evaluate(() => /마당에 밭/.test(document.body.innerText));
    console.log(n, 'days → open', open, '| line:', seen, '| after reload line again:', again);
    await ctx.close();
  }
  await b.close();
})();
