/* V1 탐침 7: 진짜 손가락(CDP)으로 — 비틀기+핀치 함께 · 관성 중 재봉틀 톡 · 스틱 8 각도 · 가구 모드 (돌린 채 열기 · 모드 중 비틀기 · 벽 쪽 끌기 · 저장 뒤 각도).
   NODE_PATH=$(npm root -g) node wip/round4/verify/V1/p7-gest.js */
const path = require('path'); const P = require('../../probe-lib.js'); const fs = require('fs');
const SH = path.join(__dirname, 'shots');
(async () => {
  const b = await P.launch(); const R = {};
  const { page } = await P.open(b, { rec: P.REC(5), look: { hour: 13, weather: 'clear' } });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const cdp = await page.context().newCDPSession(page);
  const info = () => page.evaluate(() => Object.assign(APP.scene.yawInfo(), { zoom: APP.scene.pan().zoom }));
  const rest = () => page.waitForFunction(() => { const y = APP.scene.yawInfo(); return !y.easing && !y.mode && !APP.scene.pan().mode; }, null, { timeout: 20000, polling: 50 });
  async function two(a0, a1, r0, r1, n, hold, cx = 180, cy = 330, stamp) {
    const T0 = Date.now() + 50;
    const at = k => { const a = (a0 + (a1 - a0) * k) * Math.PI / 180, r = r0 + (r1 - r0) * k; return [{ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), id: 1 }, { x: cx - r * Math.cos(a), y: cy - r * Math.sin(a), id: 2 }]; };
    const ev = (type, pts, i) => { const o = { type, touchPoints: pts }; if (stamp) o.timestamp = (T0 + 16 * i) / 1000; return cdp.send('Input.dispatchTouchEvent', o); };
    await ev('touchStart', at(0), 0);
    for (let i = 1; i <= n; i++) { await ev('touchMove', at(i / n), i); await page.waitForTimeout(16); }
    if (hold) { await page.waitForTimeout(130); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(1) }); await page.waitForTimeout(130); }
    await ev('touchEnd', [], n + 1);
  }
  async function tap(x, y) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 5 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }

  /* 1. 비틀기 + 핀치 함께 */
  let y0 = await info(); await two(0, 90, 60, 105, 24, true); await rest(); let y1 = await info();
  R.twistPinch = { dYaw: +(y1.yaw - y0.yaw).toFixed(1), zoom: [y0.zoom, y1.zoom] }; console.log('twist+pinch', R.twistPinch);
  /* 1b. 한 손가락 끌기 (밀기) 가 돌리지 않나 */
  await page.evaluate(() => { APP.scene.setYaw(0, true); APP.scene.zoomStep(3); }); await rest();
  await P.touchPath(page, [[180, 300]], [[260, 420]], 10); await rest(); let y2 = await info(); R.oneFinger = { yaw: y2.yaw }; console.log('one finger', R.oneFinger);
  /* 1c. 비틀다가 한 손가락을 먼저 떼고 남은 손가락으로 계속 끌기 — 튀지 않나 */
  await page.evaluate(() => { APP.scene.setYaw(0, true); APP.scene.zoomStep(3); APP.scene.recenter(); }); await rest();
  { const a = k => [{ x: 180 + 80 * Math.cos(k), y: 330 + 80 * Math.sin(k), id: 1 }, { x: 180 - 80 * Math.cos(k), y: 330 - 80 * Math.sin(k), id: 2 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: a(0) });
    for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: a(i * 0.06) }); await page.waitForTimeout(16); }
    const mid = await info();
    const p1 = a(0.6)[0];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [a(0.6)[1]] });   /* 손가락 하나 뗌 (남은 것 = id 1) */
    const pan0 = await page.evaluate(() => APP.scene.pan());
    for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p1.x - 5 * i, y: p1.y, id: 1 }] }); await page.waitForTimeout(16); }
    const pan1 = await page.evaluate(() => APP.scene.pan()); const y3 = await info();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await rest();
    R.liftOne = { yawMid: mid.yaw, yawAfter: y3.yaw, pan0: [pan0.x, pan0.y], pan1: [pan1.x, pan1.y], mode: pan1.mode }; console.log('lift one', R.liftOne);
  }
  /* 2. 스틱 8 각도: 위 = 화면 안쪽 */
  R.stick = [];
  await page.evaluate(() => APP.scene.zoomStep(0));
  for (let a = 0; a < 360; a += 45) {
    await page.evaluate(a => APP.scene.setYaw(a, true), a); await rest();
    const p0 = await page.evaluate(() => { APP.scene.debugPlayerAt(0.4, 0.6); return APP.scene.player().at; });
    for (const dir of [[0, 1], [1, 0]]) {
      await page.evaluate(() => APP.scene.debugPlayerAt(0.4, 0.6));
      const s0 = await page.evaluate(() => { const p = APP.scene.player().at; const s = APP.scene.screenOf(p[0], 0, p[2]); return s; });
      await page.evaluate(d => APP.scene.setPlayerInput({ x: d[0], y: d[1] }), dir);
      await page.waitForFunction(a => { const p = APP.scene.player().at; return Math.hypot(p[0] - 0.4, p[2] - 0.6) > 0.5; }, null, { timeout: 10000, polling: 30 }).catch(() => {});
      const s1 = await page.evaluate(() => { const p = APP.scene.player().at; APP.scene.setPlayerInput(null); return APP.scene.screenOf(p[0], 0, p[2]); });
      const dx = s1.x - s0.x, dy = s1.y - s0.y, L = Math.hypot(dx, dy) || 1;
      R.stick.push({ a, dir: dir.join(','), screen: [+(dx / L).toFixed(2), +(dy / L).toFixed(2)] });
    }
  }
  console.log('stick (up should be [0,-1], right [1,0]):', R.stick.map(s => s.a + '/' + s.dir + '→' + s.screen).join('  '));
  /* 3. 관성 중 재봉틀 톡 (위층) */
  await page.evaluate(() => { APP.scene.setYaw(0, true); APP.goRoom('loft'); });
  await page.waitForFunction(() => APP.scene.view() === 'loft' && !APP.scene.motion().trans && !APP.scene.motion().dq && !APP.goResting, null, { timeout: 30000 }); await page.waitForTimeout(800);
  R.coastTap = [];
  for (let k = 0; k < 3; k++) {
    await page.evaluate(() => APP.scene.setYaw(0, true)); await rest(); await page.waitForTimeout(700);
    await two(0, 50, 90, 90, 5, false, 180, 330, true);
    const s = await page.evaluate(() => { const s = APP.scene.spotRect('sew'); const r = document.getElementById('scene').getBoundingClientRect(); return { x: r.left + s.x + s.w / 2, y: r.top + s.y + s.h / 2, v: APP.scene.yawInfo().v }; });
    await tap(s.x, s.y);
    const open = await page.waitForFunction(() => document.getElementById('sew-sheet').open, null, { timeout: 2500 }).then(() => true, () => false);
    const yy = await info();
    R.coastTap.push({ vAtTap: s.v, open, yawAfter: yy.yaw });
    await page.evaluate(() => { const d = document.getElementById('sew-sheet'); if (d.open) d.close(); });
    await page.waitForFunction(() => !APP.goResting, null, { timeout: 5000 }).catch(() => {});
  }
  console.log('coast tap sew:', JSON.stringify(R.coastTap));
  /* 4. 가구 모드 */
  await page.evaluate(() => APP.goRoom('attic'));
  await page.waitForFunction(() => APP.scene.view() === 'attic' && !APP.scene.motion().trans && !APP.scene.motion().dq && !APP.goResting, null, { timeout: 30000 }); await page.waitForTimeout(800);
  await page.evaluate(() => APP.scene.setYaw(135, true)); await rest();
  const hb = await page.evaluate(() => { const q = document.getElementById('btn-furn').getBoundingClientRect(); return [q.x + q.width / 2, q.y + q.height / 2]; });
  await tap(hb[0], hb[1]);
  await page.waitForFunction(() => !document.getElementById('furn-ui').hidden, null, { timeout: 5000 });
  await rest(); await page.waitForTimeout(500);
  R.furnOpen = await page.evaluate(() => APP.scene.furnLook()); console.log('furn open while 135°:', JSON.stringify(R.furnOpen));
  await page.screenshot({ path: path.join(SH, 'furn-open-from135.png') });
  /* 모드 중 두 손가락 비틀기 */
  await two(0, 90, 80, 80, 18, true); await rest(); await page.waitForTimeout(300);
  R.furnTwist = await page.evaluate(() => Object.assign(APP.scene.furnLook(), APP.scene.yawInfo())); console.log('twist in furn mode:', JSON.stringify({ yaw: R.furnTwist.yaw, cut: R.furnTwist.cut, zoom: R.furnTwist.zoom }));
  await page.screenshot({ path: path.join(SH, 'furn-twisted.png') });
  /* 저장 → 각도 */
  await page.evaluate(() => document.getElementById('furn-ok').click());
  await page.waitForFunction(() => document.getElementById('furn-ui').hidden, null, { timeout: 5000 }); await rest(); await page.waitForTimeout(400);
  R.afterSave = await info(); console.log('after save yaw:', R.afterSave.yaw, 'zoom', R.afterSave.zoom);
  fs.writeFileSync(path.join(__dirname, 'p7.json'), JSON.stringify({ R, errs }, null, 1));
  console.log('errs', errs);
  await b.close();
})();
