/* V1 탐침 11: 함께한 날 30일 (여섯 칸) 기록 — 처음 여는 날 한 줄 · 마당 8 각도 사진 · 여섯 칸 톡이 제 칸인가 (밤 비 포함) · 위층 미용실 거울을 돌린 채 톡.
   NODE_PATH=$(npm root -g) node wip/round4/verify/V1/p11-yard6.js */
const path = require('path'); const P = require('../../probe-lib.js'); const fs = require('fs');
(async () => {
  const b = await P.launch();
  const days = []; for (let i = 0; i < 30; i++) { const d = new Date(Date.UTC(2026, 9, 10 + i)); days.push(d.toISOString().slice(0, 10)); }
  const rec = P.REC(5); rec.octopus.days = days;
  rec.user = { garden: [{ seed: 'red', at: '2026-11-10', water: 1 }, null, { seed: 'blue', at: '2026-11-12', water: 0 }] };
  for (const look of [{ hour: 13, weather: 'clear' }, { hour: 22, weather: 'rain' }]) {
    const { page, ctx } = await P.open(b, { rec, look });
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.waitForTimeout(1500);
    const toast = await page.evaluate(() => [...document.querySelectorAll('.toast, #toast, [role=status]')].map(e => e.textContent.trim()).filter(Boolean));
    console.log(look.hour, 'toasts', JSON.stringify(toast), 'garden', JSON.stringify(await page.evaluate(() => APP.state.user && APP.state.user.garden)));
    await page.evaluate(() => APP.goRoom('yard'));
    await page.waitForFunction(() => APP.scene.view() === 'yard' && !APP.scene.motion().trans && !APP.scene.motion().dq, null, { timeout: 20000 });
    const imgs = [];
    for (let a = 0; a < 360; a += 45) {
      await page.evaluate(a => { APP.scene.setYaw(a, true); APP.scene.zoomStep(0); APP.scene.recenter(); }, a);
      await page.waitForFunction(() => !APP.scene.yawInfo().easing && !APP.scene.pan().mode); await page.waitForTimeout(300);
      const o = await page.evaluate(() => { const r = document.getElementById('scene').getBoundingClientRect(), o = {}; const d = APP.scene.plotsDebug();
        d.c.forEach((c, i) => { const s = APP.scene.screenOf(c[0], c[1], c[2]); const k = APP.scene.pickAt(r.left + s.x, r.top + s.y); o['p' + i] = (s.x < 0 || s.x > r.width || s.y < 0 || s.y > r.height) ? 'off' : (k ? k.id : '-'); });
        return { open: d.open, o }; });
      console.log(look.hour, look.weather, a, JSON.stringify(o));
      const f = path.join(__dirname, 'shots', `yard6-${look.hour}-${look.weather}-a${a}.png`); await page.screenshot({ path: f }); imgs.push(f);
    }
    console.log('errs', errs);
    await ctx.close();
  }
  await b.close();
})();
