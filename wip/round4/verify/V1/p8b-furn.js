/* V1 탐침 8b: 상자를 방 가운데 (0.75, 0.25) 에 둔 기록 — 가구 모드 0° / 모드 안에서 비튼 90° · 45° 에서 40 px 씩 네 방향 끌기: 가구가 손가락 끝을 따라가나 (화면 거리) */
const path = require('path'); const P = require('../../probe-lib.js'); const fs = require('fs');
(async () => {
  const b = await P.launch(); const out = [];
  const rec = P.REC(5); rec.room.layout = { crate: [0.75, 0.25, 0, 1] };
  const { page } = await P.open(b, { rec, look: { hour: 13, weather: 'clear' } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  const cdp = await page.context().newCDPSession(page);
  const rest = () => page.waitForFunction(() => { const y = APP.scene.yawInfo(); return !y.easing && !y.mode && !APP.scene.pan().mode; }, null, { timeout: 20000, polling: 50 });
  async function drag(from, to, n = 12) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from[0], y: from[1], id: 1 }] });
    for (let i = 1; i <= n; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from[0] + (to[0] - from[0]) * i / n, y: from[1] + (to[1] - from[1]) * i / n, id: 1 }] }); await page.waitForTimeout(20); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  async function two(a0, a1, r, n) {
    const at = k => { const a = (a0 + (a1 - a0) * k) * Math.PI / 180; return [{ x: 180 + r * Math.cos(a), y: 330 + r * Math.sin(a), id: 1 }, { x: 180 - r * Math.cos(a), y: 330 - r * Math.sin(a), id: 2 }]; };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(0) });
    for (let i = 1; i <= n; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(i / n) }); await page.waitForTimeout(16); }
    await page.waitForTimeout(150); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  const scr = () => page.evaluate(() => { const f = APP.scene.furnFoot('crate'), r = document.getElementById('scene').getBoundingClientRect(), s = APP.scene.screenOf(f.x, 0.25, f.z); return { x: r.left + s.x, y: r.top + s.y, fx: f.x, fz: f.z }; });
  await page.evaluate(() => document.getElementById('btn-furn').click());
  await page.waitForFunction(() => !document.getElementById('furn-ui').hidden); await rest(); await page.waitForTimeout(400);
  for (const tw of [0, 90, -45]) {
    if (tw) { await two(0, tw, 80, 18); await rest(); await page.waitForTimeout(300); }
    const yaw = await page.evaluate(() => APP.scene.yawInfo().yaw);
    for (const d of [[40, 0], [-40, 0], [0, 40], [0, -40]]) {
      const c0 = await scr(); const end = [c0.x + d[0], c0.y + d[1]];
      await drag([c0.x, c0.y], end); await page.waitForTimeout(250);
      const c1 = await scr();
      const moved = [+(c1.x - c0.x).toFixed(0), +(c1.y - c0.y).toFixed(0)];
      out.push({ yaw, d, moved, world: [+(c1.fx - c0.fx).toFixed(2), +(c1.fz - c0.fz).toFixed(2)] });
      console.log('yaw', yaw, 'finger', d, 'crate on screen moved', moved, 'world d', [+(c1.fx - c0.fx).toFixed(2), +(c1.fz - c0.fz).toFixed(2)]);
    }
    /* 방향키도 */
    await page.evaluate(() => APP.scene.furnSelect('crate'));
    for (const k of ['ArrowRight', 'ArrowUp']) {
      const c0 = await scr(); await page.keyboard.press(k); await page.waitForTimeout(200); const c1 = await scr();
      console.log('yaw', yaw, 'key', k, 'crate on screen moved', [+(c1.x - c0.x).toFixed(0), +(c1.y - c0.y).toFixed(0)]);
      out.push({ yaw, key: k, moved: [+(c1.x - c0.x).toFixed(0), +(c1.y - c0.y).toFixed(0)] });
    }
    await page.screenshot({ path: path.join(__dirname, 'shots', `furn8b-yaw${yaw}.png`) });
  }
  fs.writeFileSync(path.join(__dirname, 'p8b.json'), JSON.stringify({ out, errs }, null, 1)); console.log('errs', errs);
  await b.close();
})();
