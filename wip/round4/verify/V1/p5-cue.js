/* V1 탐침 5: 밤 22:00 · 등불 0칸 · 다락 계단 / 위층 해치: 각도마다 계단 단추 칸 안의 밝기 퍼짐 (luma p95 − p50) · 밝은 칸(>0.6) 수 — test-light L4 와 같은 잣대 */
const path = require('path'); const P = require('../../probe-lib.js'); const fs = require('fs');
(async () => {
  const b = await P.launch();
  const { page } = await P.open(b, { rec: P.REC(0, null, 3), look: { hour: 22, weather: 'clear', lantern: 0 } });
  const res = [];
  for (const room of ['attic', 'loft']) {
    if (room === 'loft') { await page.evaluate(() => APP.goRoom('loft')); await page.waitForFunction(() => APP.scene.view() === 'loft' && !APP.scene.motion().trans && !APP.scene.motion().dq, null, { timeout: 30000 }); }
    const id = room === 'attic' ? 'atticStair' : 'loftStair';
    for (const z of [0, 3]) for (let a = 0; a < 360; a += 45) {
      await page.evaluate(([a, z]) => { APP.scene.setYaw(a, true); APP.scene.zoomStep(z); APP.scene.recenter(); }, [a, z]);
      await page.waitForFunction(() => { const y = APP.scene.yawInfo(); return !y.easing && !APP.scene.pan().mode; }); await page.waitForTimeout(300);
      const s = await page.evaluate(id => { const s = APP.scene.spotRect(id); const r = document.getElementById('scene').getBoundingClientRect(); return s && s.mode === 'over' ? { x: r.left + s.x, y: r.top + s.y, w: s.w, h: s.h, cut: APP.scene.yawInfo().cut.stair } : null; }, id);
      if (!s) { res.push({ room, z, a, none: true }); console.log(room, z, a, 'no stair button (off screen)'); continue; }
      const buf = await page.screenshot({ clip: { x: s.x, y: s.y, width: s.w, height: s.h } });
      const f = path.join(__dirname, 'shots', `cue-${room}-z${z}-a${a}.png`); fs.writeFileSync(f, buf);
      res.push({ room, z, a, s, f });
    }
  }
  fs.writeFileSync(path.join(__dirname, 'p5.json'), JSON.stringify(res, null, 1));
  await b.close();
})();
