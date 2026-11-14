/* V1 탐침 4: 밤 (19:00 · 19:30 · 20:15 · 21:00 · 22:00) 다락 · 위층 · 놀이방 · 마당 (맑음 · 비) × 8 각도 — 계단 표시가 각도마다 보이나 · 방 밝기 (가운데 띠 평균 밝기).
   등불 0칸 (가장 어두운 경우) */
const path = require('path'); const P = require('../../probe-lib.js'); const fs = require('fs');
const OUT = path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await P.launch(); const log = [];
  const runs = [{ hour: 22, lantern: 0, weather: 'clear', rooms: ['attic', 'loft', 'play', 'yard'] }, { hour: 22, lantern: 0, weather: 'rain', rooms: ['yard'] }];
  for (const R of runs) {
    const { page, ctx } = await P.open(b, { rec: P.REC(R.lantern, null, 14), look: { hour: R.hour, weather: R.weather, lantern: R.lantern } });
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    for (const room of R.rooms) {
      if (room !== 'attic') { await page.evaluate(() => APP.goRoom('attic')); await page.waitForFunction(() => APP.scene.view() === 'attic' && !APP.goResting && !APP.scene.motion().trans, null, { timeout: 30000 });
        await page.evaluate(rm => APP.goRoom(rm), room); await page.waitForFunction(rm => APP.scene.view() === rm && !APP.scene.motion().trans && !APP.scene.motion().dq, room, { timeout: 30000 }); }
      for (let a = 0; a < 360; a += 45) {
        await page.evaluate(a => { APP.scene.setYaw(a, true); APP.scene.zoomStep(0); APP.scene.recenter(); }, a);
        await page.waitForFunction(() => { const y = APP.scene.yawInfo(); return !y.easing && !APP.scene.pan().mode; }); await page.waitForTimeout(300);
        const st = await page.evaluate(() => { const s = APP.scene.stats(); return { cueK: s.cueK, cueAttic: s.cueAttic, cueLoft: s.cueLoft, key: s.lightKey, lampI: s.lampI }; });
        const f = `night-${R.weather}-${room}-a${a}.png`; await page.screenshot({ path: path.join(OUT, f) });
        log.push({ R, room, a, st, f }); console.log(R.weather, room, a, JSON.stringify(st));
      }
    }
    console.log('errs', errs); await ctx.close();
  }
  fs.writeFileSync(path.join(__dirname, 'p4.json'), JSON.stringify(log, null, 1)); await b.close();
})();
