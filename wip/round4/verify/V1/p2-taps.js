/* V1 탐침 2: 각도 · 줌마다 물건마다 '그 물건 그림 상자 안을 톡 하면 그 물건이 되나' (pickAt 9×9 격자) + 진짜 손가락 톡 몇 개로 결과 확인.
   NODE_PATH=$(npm root -g) node wip/round4/verify/V1/p2-taps.js [w] [h] */
const path = require('path');
const P = require('../../probe-lib.js');
const W = +(process.argv[2] || 360), H = +(process.argv[3] || 740);
const ROOMS = { attic: ['atticPlay', 'atticYard', 'atticStair'], loft: ['loftStair', 'sew', 'salon'], play: ['playAttic', 'machine', 'counter'], yard: ['yardAttic', 'plot0', 'plot1', 'plot2', 'plot3', 'plot4', 'plot5'] };
(async () => {
  const b = await P.launch();
  const { page } = await P.open(b, { w: W, h: H, rec: P.REC(5, null, 30), look: { hour: 13, weather: 'clear' } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  const rest = () => page.waitForFunction(() => { const y = APP.scene.yawInfo(); return !y.easing && !y.mode && !APP.scene.pan().mode && !APP.scene.motion().trans; }, null, { timeout: 30000, polling: 50 });
  const out = [];
  for (const room of Object.keys(ROOMS)) {
    if (room !== 'attic') {
      await page.evaluate(() => APP.goRoom('attic'));
      await page.waitForFunction(() => APP.scene.view() === 'attic' && !APP.goResting && !APP.scene.motion().trans, null, { timeout: 30000 });
      await page.evaluate(rm => APP.goRoom(rm), room);
      await page.waitForFunction(rm => APP.scene.view() === rm && !APP.scene.motion().trans && !APP.scene.motion().dq, room, { timeout: 30000 });
    }
    if (room === 'loft') await page.evaluate(() => APP.scene.setSalonOpen && APP.scene.setSalonOpen(true));
    for (const z of [0, 3]) for (let a = 0; a < 360; a += 45) {
      await page.evaluate(([a, z]) => { APP.scene.setYaw(a, true); APP.scene.zoomStep(z); APP.scene.recenter(); }, [a, z]);
      await rest(); await page.waitForTimeout(150);
      const row = await page.evaluate(ids => {
        const r = document.getElementById('scene').getBoundingClientRect(), o = {};
        ids.forEach(id => {
          const s = APP.scene.spotRect(id);
          if (!s || s.mode !== 'over') { o[id] = 'none'; return; }
          const A = s.art, l = Math.max(A.l, 0), t = Math.max(A.t, 0), rr = Math.min(A.r, r.width), bb = Math.min(A.b, r.height);
          let n = 0, own = 0; const other = {};
          for (let i = 1; i < 10; i++) for (let j = 1; j < 10; j++) {
            const x = r.left + l + (rr - l) * j / 10, y = r.top + t + (bb - t) * i / 10; if (y > innerHeight || x > innerWidth) continue;
            n++; const k = APP.scene.pickAt(x, y), kid = k ? k.id : '-';
            if (kid === id) own++; else other[kid] = (other[kid] || 0) + 1;
          }
          o[id] = { own: n ? +(own / n).toFixed(2) : 0, n, other };
        });
        return o;
      }, ROOMS[room]);
      const bad = Object.entries(row).filter(([k, v]) => v !== 'none' && v.own < 0.25);
      out.push({ room, z, a, row });
      console.log(room, 'z' + z, a + '°', Object.entries(row).map(([k, v]) => k + '=' + (v === 'none' ? '—' : v.own + (v.own < 0.5 ? JSON.stringify(v.other) : ''))).join('  '), bad.length ? '  <<< LOW' : '');
    }
  }
  require('fs').writeFileSync(path.join(__dirname, `p2-${W}x${H}.json`), JSON.stringify({ out, errs }, null, 1));
  console.log('errors', errs);
  await b.close();
})();
