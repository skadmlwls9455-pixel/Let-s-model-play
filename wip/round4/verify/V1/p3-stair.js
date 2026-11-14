/* V1 탐침 3: 다락 계단이 각도마다 화면에 보이나 (계단 가운데 투영 · pickAt · 단추) */
const path = require('path'); const P = require('../../probe-lib.js');
(async () => {
  const b = await P.launch();
  const { page } = await P.open(b, { rec: P.REC(5), look: { hour: 13, weather: 'clear' } });
  for (let a = 0; a < 360; a += 45) {
    await page.evaluate(a => { APP.scene.setYaw(a, true); APP.scene.zoomStep(0); APP.scene.recenter(); }, a);
    await page.waitForFunction(() => { const y = APP.scene.yawInfo(); return !y.easing && !APP.scene.pan().mode; });
    await page.waitForTimeout(200);
    const o = await page.evaluate(() => { const r = document.getElementById('scene').getBoundingClientRect();
      const pts = [[2.6, 0.6, -2.05], [2.9, 1.3, -2.05], [3.2, 2.0, -2.05]].map(p => { const s = APP.scene.screenOf(p[0], p[1], p[2]); const x = r.left + s.x, y = r.top + s.y; const k = APP.scene.pickAt(x, y); return [Math.round(x), Math.round(y), k ? k.kind + ':' + k.id : '-']; });
      return { pts, spot: APP.scene.spotRect('atticStair'), cut: APP.scene.yawInfo().cut.stair, W: innerWidth }; });
    console.log(a, JSON.stringify(o.pts), 'cut', o.cut, 'spot', o.spot ? o.spot.x + ',' + o.spot.y + ' ' + o.spot.w + 'x' + o.spot.h : null);
    if (a === 180) await page.screenshot({ path: path.join(__dirname, 'shots', 'stair-180.png') });
  }
  await b.close();
})();
