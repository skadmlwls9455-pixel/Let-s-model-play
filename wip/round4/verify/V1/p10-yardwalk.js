/* V1 탐침 10: 문어가 산책 나가 있을 때 마당으로 (가장자리 단추) · 마당에서 돌려 둔 채 문어 귀가 — 무엇이 보이나 · 마당 '집으로' · 에러.
   NODE_PATH=$(npm root -g) node wip/round4/verify/V1/p10-yardwalk.js */
const path = require('path'); const P = require('../../probe-lib.js'); const fs = require('fs');
(async () => {
  const b = await P.launch();
  const { page } = await P.open(b, { rec: P.REC(5), look: { hour: 13, weather: 'clear' } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  const S = () => page.evaluate(() => { const y = APP.scene.yawInfo(); return { cer: APP.scene.ceremony(), place: APP.scene.place(), view: APP.scene.view(), state: APP.oct.state, shown: y.shown, held: y.held, yardDoor: !document.getElementById('btn-yard-door').hidden, go: document.getElementById('btn-go').className, desc: (document.getElementById('scene-desc') || {}).textContent }; });
  await page.tap('#btn-go');
  await page.waitForFunction(() => APP.oct.state === 'away' && APP.scene.place() === 'exterior' && !APP.scene.ceremony(), null, { timeout: 60000 });
  await page.waitForFunction(() => !document.getElementById('btn-yard').hidden, null, { timeout: 10000 });
  await page.tap('#btn-yard');
  await page.waitForFunction(() => APP.scene.view() === 'yard' && !APP.scene.motion().trans, null, { timeout: 20000 });
  await page.evaluate(() => APP.scene.setYaw(200, true));
  console.log('in yard during walk', JSON.stringify(await S()));
  await page.screenshot({ path: path.join(__dirname, 'shots', 'yardwalk-0.png') });
  const t0 = Date.now(); let last = '', n = 1;
  while (Date.now() - t0 < 90000) {
    const s = await S(); const k = JSON.stringify([s.cer, s.place, s.view, s.state, s.held, s.yardDoor]);
    if (k !== last) { last = k; console.log(((Date.now() - t0) / 1000).toFixed(1), JSON.stringify(s)); if (n < 8) await page.screenshot({ path: path.join(__dirname, 'shots', `yardwalk-${n++}.png`) }); }
    if (s.state !== 'away' && !s.cer) break;
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(1500);
  console.log('after return', JSON.stringify(await S()));
  await page.screenshot({ path: path.join(__dirname, 'shots', `yardwalk-${n++}.png`) });
  /* 집으로 */
  const r = await page.evaluate(() => { const b = document.getElementById('btn-yard-door'); if (b.hidden) return 'hidden'; b.click(); return 'clicked'; });
  await page.waitForTimeout(4000);
  console.log('home tap', r, JSON.stringify(await S()));
  await page.screenshot({ path: path.join(__dirname, 'shots', `yardwalk-${n++}.png`) });
  console.log('errs', errs.filter(e => !/wikipedia/.test(e)));
  await b.close();
})();
