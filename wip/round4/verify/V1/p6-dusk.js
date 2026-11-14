/* V1 탐침 6: 19:00 ~ 21:00 15분마다 (__ppolLook.hour 로 새로 열기) — duskK · lightKey · 다락 방 밝기 (0° · 180°), 등불 3칸 맑음 */
const path = require('path'); const P = require('../../probe-lib.js'); const fs = require('fs');
(async () => {
  const b = await P.launch(); const out = [];
  for (const h of [18.75, 19, 19.25, 19.5, 19.75, 20, 20.25, 20.5, 20.75, 21, 21.25]) {
    const { page, ctx } = await P.open(b, { rec: P.REC(3), look: { hour: h, weather: 'clear', lantern: 3 } });
    const row = { h };
    for (const a of [0, 180]) {
      await page.evaluate(a => { APP.scene.setYaw(a, true); }, a);
      await page.waitForFunction(() => !APP.scene.yawInfo().easing); await page.waitForTimeout(400);
      const s = await page.evaluate(() => { const s = APP.scene.stats(); return { duskK: s.duskK, key: s.lightKey, lampI: s.lampI, hemi: s.hemiNow }; });
      const buf = await page.screenshot({ clip: { x: 0, y: 180, width: 360, height: 300 } });
      const f = path.join(__dirname, 'shots', `dusk-${h}-a${a}.png`); fs.writeFileSync(f, buf);
      row['a' + a] = Object.assign(s, { f });
    }
    out.push(row); console.log(h, JSON.stringify(row.a0), JSON.stringify({ k: row.a180.key }));
    await ctx.close();
  }
  fs.writeFileSync(path.join(__dirname, 'p6.json'), JSON.stringify(out, null, 1)); await b.close();
})();
