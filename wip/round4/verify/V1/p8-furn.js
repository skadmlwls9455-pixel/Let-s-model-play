/* V1 탐침 8: 가구 모드 — 0° 와 (모드 안에서 비튼) 90° 에서 상자를 진짜 손가락으로 끌기: 가구가 손가락 밑에 남나 · 벽 너머로 끌면 빨간 테 · 떼면 돌아가나 ·
   돌리기 · 작게 · 크게 · 취소 · 모드 중 산책 출발 · 문어가 가구 안에 서지 않나.
   NODE_PATH=$(npm root -g) node wip/round4/verify/V1/p8-furn.js */
const path = require('path'); const P = require('../../probe-lib.js'); const fs = require('fs');
const SH = path.join(__dirname, 'shots');
(async () => {
  const b = await P.launch(); const R = {};
  const { page } = await P.open(b, { rec: P.REC(5), look: { hour: 13, weather: 'clear' } });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const cdp = await page.context().newCDPSession(page);
  const rest = () => page.waitForFunction(() => { const y = APP.scene.yawInfo(); return !y.easing && !y.mode && !APP.scene.pan().mode; }, null, { timeout: 20000, polling: 50 });
  async function drag(from, to, n = 14, hold) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from[0], y: from[1], id: 1 }] });
    for (let i = 1; i <= n; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from[0] + (to[0] - from[0]) * i / n, y: from[1] + (to[1] - from[1]) * i / n, id: 1 }] }); await page.waitForTimeout(20); }
    if (hold) { const s = await hold(); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); return s; }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  async function two(a0, a1, r, n) {
    const at = k => { const a = (a0 + (a1 - a0) * k) * Math.PI / 180; return [{ x: 180 + r * Math.cos(a), y: 330 + r * Math.sin(a), id: 1 }, { x: 180 - r * Math.cos(a), y: 330 - r * Math.sin(a), id: 2 }]; };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(0) });
    for (let i = 1; i <= n; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(i / n) }); await page.waitForTimeout(16); }
    await page.waitForTimeout(150); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  const crateScr = id => page.evaluate(id => { const f = APP.scene.furnFoot(id), r = document.getElementById('scene').getBoundingClientRect(), s = APP.scene.screenOf(f.x, 0.2, f.z); return { x: r.left + s.x, y: r.top + s.y, f }; }, id);
  await page.evaluate(() => document.getElementById('btn-furn').click());
  await page.waitForFunction(() => !document.getElementById('furn-ui').hidden); await rest(); await page.waitForTimeout(400);
  R.drag = [];
  for (const turn of [0, 90]) {
    if (turn) { await two(0, 90, 80, 18); await rest(); await page.waitForTimeout(300); }
    const yaw = await page.evaluate(() => APP.scene.yawInfo().yaw);
    for (const d of [[60, 0], [0, 50], [-50, -30]]) {
      const c0 = await crateScr('crate');
      const end = [c0.x + d[0], c0.y + d[1]];
      await drag([c0.x, c0.y], end, 14);
      await page.waitForTimeout(300);
      const c1 = await crateScr('crate');
      R.drag.push({ yaw, d, before: [c0.f.x, c0.f.z], after: [c1.f.x, c1.f.z], fingerEnd: end.map(Math.round), crateScreen: [Math.round(c1.x), Math.round(c1.y)], off: +Math.hypot(c1.x - end[0], c1.y - end[1]).toFixed(1) });
    }
    /* 벽 너머로 끌기: 빨간 테 · 떼면 돌아가나 */
    const c0 = await crateScr('crate');
    const far = await page.evaluate(() => { const r = document.getElementById('scene').getBoundingClientRect(), s = APP.scene.screenOf(-4.5, 0, -1.0); return [r.left + s.x, r.top + s.y]; });
    const mid = await drag([c0.x, c0.y], far, 16, () => page.evaluate(() => APP.scene.furnLook()));
    await page.waitForTimeout(300); const c2 = await crateScr('crate');
    R.wall = R.wall || []; R.wall.push({ yaw, redWhileHeld: mid.red, selShown: mid.sel, back: [c2.f.x, c2.f.z], was: [c0.f.x, c0.f.z] });
    await page.screenshot({ path: path.join(SH, `furn-after-drag-yaw${turn}.png`) });
  }
  console.log('drag:', JSON.stringify(R.drag, null, 0)); console.log('wall:', JSON.stringify(R.wall));
  /* 모드 중 산책 출발 (큰 단추는 숨겨져 있다 — 앱 경로로 산책 시작) */
  R.goHidden = await page.evaluate(() => { const g = document.getElementById('btn-go'); return { hidden: g.hidden || getComputedStyle(g).display === 'none' || getComputedStyle(g).visibility === 'hidden' || g.classList.contains('away') }; });
  await page.evaluate(() => document.getElementById('furn-x').click());
  await page.waitForFunction(() => document.getElementById('furn-ui').hidden); await rest();
  R.afterCancel = await page.evaluate(() => ({ yaw: APP.scene.yawInfo().yaw, layout: APP.scene.layout() }));
  console.log('goHidden', JSON.stringify(R.goHidden), 'after cancel', JSON.stringify(R.afterCancel));
  fs.writeFileSync(path.join(__dirname, 'p8.json'), JSON.stringify({ R, errs }, null, 1)); console.log('errs', errs);
  await b.close();
})();
