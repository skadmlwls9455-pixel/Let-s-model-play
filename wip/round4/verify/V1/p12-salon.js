/* V1 탐침 12: 위층을 315° 로 돌린 채 거울(미용실) 손가락 톡 → 무대 동안 각 · 닫으면 돌아오나 · 돌린 채 방 이동 (위층 → 다락 → 놀이방) 때 나 · 문어가 카메라 쪽을 보나 */
const path = require('path'); const P = require('../../probe-lib.js'); const fs = require('fs');
(async () => {
  const b = await P.launch();
  const { page } = await P.open(b, { rec: P.REC(5), look: { hour: 13, weather: 'clear' } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => APP.goRoom('loft'));
  await page.waitForFunction(() => APP.scene.view() === 'loft' && !APP.scene.motion().trans && !APP.scene.motion().dq && !APP.goResting, null, { timeout: 30000 }); await page.waitForTimeout(1500);
  await page.evaluate(() => APP.scene.setYaw(315, true)); await page.waitForTimeout(600);
  const sp = await page.evaluate(() => { const s = APP.scene.spotRect('salon'); if (!s || s.mode !== 'over') return null; const r = document.getElementById('scene').getBoundingClientRect(); return [r.left + s.x + s.w / 2, r.top + s.y + s.h / 2]; });
  console.log('salon spot at 315', sp);
  if (sp) {
    await page.touchscreen.tap(sp[0], sp[1]);
    await page.waitForTimeout(2500);
    const st = await page.evaluate(() => ({ sheet: document.getElementById('salon-sheet') && document.getElementById('salon-sheet').open, yaw: APP.scene.yawInfo(), sal: APP.scene.motion().salon }));
    console.log('salon open', JSON.stringify({ sheet: st.sheet, shown: st.yaw.shown, held: st.yaw.held, cut: st.yaw.cut }));
    await page.screenshot({ path: path.join(__dirname, 'shots', 'salon-from315.png') });
    await page.keyboard.press('Escape'); await page.waitForTimeout(2500);
    console.log('after close', JSON.stringify(await page.evaluate(() => APP.scene.yawInfo())));
  }
  /* 방 이동 */
  for (const [to, a] of [['attic', 200], ['play', 200], ['attic', 100]]) {
    await page.evaluate(a => APP.scene.setYaw(a, true), a);
    await page.waitForFunction(() => !APP.goResting, null, { timeout: 10000 }).catch(() => {});
    const r = await page.evaluate(t => APP.goRoom(t), to);
    await page.waitForFunction(t => APP.scene.view() === t && !APP.scene.motion().trans && !APP.scene.motion().dq, to, { timeout: 30000 });
    await page.waitForTimeout(1500);
    const s = await page.evaluate(() => { const y = APP.scene.yawInfo(), c = 45 + y.shown, p = APP.scene.player(), d = Math.atan2(Math.sin((p.yaw - c) * Math.PI / 180), Math.cos((p.yaw - c) * Math.PI / 180)) * 180 / Math.PI; return { view: APP.scene.view(), shown: y.shown, plFaceOff: Math.round(d), plAt: p.at.map(v => +v.toFixed(2)) }; });
    console.log('goRoom', to, 'at', a, JSON.stringify(r && r.ok), JSON.stringify(s));
    await page.screenshot({ path: path.join(__dirname, 'shots', `room-${to}-${a}.png`) });
  }
  console.log('errs', errs);
  await b.close();
})();
