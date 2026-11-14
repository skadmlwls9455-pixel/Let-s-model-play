/* V1 탐침 9: 돌린 채(135°) 산책 초대 — 출발 의식 · 바깥 · 귀가 의식 동안 각도 (보이는 각 · 붙든 각) · 마당 문 · 비틀기 시도 · 끝나면 돌려 둔 각으로.
   NODE_PATH=$(npm root -g) node wip/round4/verify/V1/p9-walk.js [yaw] */
const path = require('path'); const P = require('../../probe-lib.js'); const fs = require('fs');
const YAW = +(process.argv[2] || 135);
(async () => {
  const b = await P.launch();
  const { page } = await P.open(b, { rec: P.REC(5), look: { hour: 13, weather: 'clear' } });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const cdp = await page.context().newCDPSession(page);
  await page.evaluate(y => APP.scene.setYaw(y, true), YAW); await page.waitForTimeout(400);
  const tl = []; let last = '', shots = 0, twisted = false, yardTry = null, yardTry2 = null;
  const t0 = Date.now();
  await page.tap('#btn-go');
  while (Date.now() - t0 < 120000) {
    const s = await page.evaluate(() => { const y = APP.scene.yawInfo(); return { cer: APP.scene.ceremony(), place: APP.scene.place(), view: APP.scene.view(), state: APP.oct.state, yaw: y.yaw, shown: y.shown, held: y.held, yardBtn: !document.getElementById('btn-yard').hidden }; });
    const key = s.cer + '|' + s.place + '|' + s.state + '|' + s.held + '|' + s.yardBtn;
    if (key !== last) { tl.push(Object.assign({ t: Date.now() - t0 }, s)); last = key; console.log(((Date.now() - t0) / 1000).toFixed(1), JSON.stringify(s));
      if (shots < 12) { await page.screenshot({ path: path.join(__dirname, 'shots', `walk${YAW}-${shots++}-${s.cer || 'none'}-${s.place}.png`) }); } }
    if (s.cer === 'depart' && !yardTry) { yardTry = await page.evaluate(() => APP.goRoom('yard')); console.log('goRoom(yard) during depart:', JSON.stringify(yardTry)); }
    if (s.cer === 'depart' && !twisted) { twisted = true;
      const at = k => { const a = 90 * k * Math.PI / 180; return [{ x: 180 + 80 * Math.cos(a), y: 330 + 80 * Math.sin(a), id: 1 }, { x: 180 - 80 * Math.cos(a), y: 330 - 80 * Math.sin(a), id: 2 }]; };
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(0) });
      for (let i = 1; i <= 12; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(i / 12) }); await page.waitForTimeout(16); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      console.log('twisted 90 during depart ->', JSON.stringify(await page.evaluate(() => APP.scene.yawInfo())));
    }
    if (s.cer === 'return' && !yardTry2) { yardTry2 = await page.evaluate(() => APP.goRoom('yard')); console.log('goRoom(yard) during return:', JSON.stringify(yardTry2)); }
    if (s.place === 'attic' && s.state !== 'away' && tl.some(x => x.cer === 'return') && !s.cer) break;
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(1500);
  const end = await page.evaluate(() => APP.scene.yawInfo()); console.log('end', JSON.stringify(end));
  await page.screenshot({ path: path.join(__dirname, 'shots', `walk${YAW}-end.png`) });
  fs.writeFileSync(path.join(__dirname, `p9-${YAW}.json`), JSON.stringify({ tl, yardTry, yardTry2, end, errs }, null, 1)); console.log('errs', errs);
  await b.close();
})();
