/* V1 탐침 1: 다락 · 위층 · 놀이방 · 마당 × 0..315° (45° 간격) × 줌 0 / 3 / 6 — 화면 사진 · 자르기 상태 · 방 실루엣 안 허공 칸 수 · 단추가 제 물건을 가리키나.
   NODE_PATH=$(npm root -g) node wip/round4/verify/V1/p1-angles.js [hour] */
const path = require('path');
const P = require('../../probe-lib.js');
const OUT = path.join(__dirname, 'shots');
require('fs').mkdirSync(OUT, { recursive: true });
const HOUR = +(process.argv[2] || 13);
const CORN = { attic: [[-2.5, -2.5], [3.5, -2.5], [3.5, 3.5], [-2.5, 3.5]], loft: [[-2.2, -2.2], [2.2, -2.2], [2.2, 2.2], [-2.2, 2.2]], play: [[-2.8, -2.8], [2.8, -2.8], [2.8, 2.8], [-2.8, 2.8]] };
const WALL_H = { attic: 3.0, loft: 1.5, play: 2.2 };
(async () => {
  const b = await P.launch();
  const rec = P.REC(5, null, 30);
  const W = +(process.env.W || 360), HH = +(process.env.H || 740), ZS = (process.env.Z || '0,3,6').split(',').map(Number);
  const { page } = await P.open(b, { w: W, h: HH, rec, look: { hour: HOUR, weather: 'clear' } });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  const rest = () => page.waitForFunction(() => { const y = APP.scene.yawInfo(); return !y.easing && !y.mode && !APP.scene.pan().mode && !APP.scene.motion().trans; }, null, { timeout: 30000, polling: 50 });
  const res = [];
  for (const room of ['attic', 'loft', 'play', 'yard']) {
    if (room !== 'attic') {
      await page.evaluate(() => APP.goRoom('attic'));
      await page.waitForFunction(() => APP.scene.view() === 'attic' && !APP.goResting && !APP.scene.motion().trans, null, { timeout: 30000 });
      const r = await page.evaluate(rm => APP.goRoom(rm), room);
      await page.waitForFunction(rm => APP.scene.view() === rm && !APP.scene.motion().trans && !APP.scene.motion().dq, room, { timeout: 30000 }).catch(() => {});
      res.push({ room, goRoom: r });
    }
    for (const z of ZS) for (let a = 0; a < 360; a += 45) {
      await page.evaluate(([a, z]) => { APP.scene.setYaw(a, true); APP.scene.zoomStep(z); APP.scene.recenter && APP.scene.recenter(); }, [a, z]);
      await rest(); await page.waitForTimeout(250);
      const info = await page.evaluate(([cs, H]) => {
        const y = APP.scene.yawInfo(), r = document.getElementById('scene').getBoundingClientRect();
        let n = 0, bad = 0, at = null, voidAll = 0, all = 0;
        /* 화면 전체의 허공 칸 비율 (참고) */
        for (let yy = Math.max(r.top, 0); yy < Math.min(r.bottom, innerHeight); yy += 6) for (let x = 0; x < innerWidth; x += 6) { all++; if (APP.scene.voidAt(x, yy)) voidAll++; }
        if (cs) {
          const cut = y.cut, adj = [['left', 'back'], ['right', 'back'], ['right', 'front'], ['left', 'front']], pts = [];
          cs.forEach((c, i) => [0, H].forEach(h => { if (h && cut[adj[i][0]] && cut[adj[i][1]]) return; const p = APP.scene.screenOf(c[0], h, c[1]); pts.push([r.left + p.x, r.top + p.y]); }));
          pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
          const cr = (o, p, q) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
          const lo = [], up = []; pts.forEach(p => { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); });
          pts.slice().reverse().forEach(p => { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); });
          let PP = lo.slice(0, -1).concat(up.slice(0, -1)), mx = 0, my = 0; PP.forEach(p => { mx += p[0] / PP.length; my += p[1] / PP.length; }); PP = PP.map(p => [mx + (p[0] - mx) * 0.94, my + (p[1] - my) * 0.94]);
          const inside = (x, yy) => { let c = false; for (let i = 0, j = PP.length - 1; i < PP.length; j = i++) { const xi = PP[i][0], yi = PP[i][1], xj = PP[j][0], yj = PP[j][1]; if (((yi > yy) !== (yj > yy)) && x < (xj - xi) * (yy - yi) / (yj - yi) + xi) c = !c; } return c; };
          for (let yy = Math.max(r.top, 0); yy < Math.min(r.bottom, innerHeight); yy += 3) for (let x = 0; x < innerWidth; x += 3) if (inside(x, yy)) { n++; if (APP.scene.voidAt(x, yy) && APP.scene.voidAt(x + 1.5, yy) && APP.scene.voidAt(x, yy + 1.5)) { bad++; if (!at) at = [x, yy]; } }
        }
        /* 보이는 단추가 그 자리의 물건을 고르나 (단추 가운데 pickAt) */
        const spots = [];
        document.querySelectorAll('#scene-spots button, .spot, [data-spot]').forEach(btn => {
          if (btn.hidden || getComputedStyle(btn).display === 'none' || getComputedStyle(btn).visibility === 'hidden') return;
          const q = btn.getBoundingClientRect(); if (q.width < 2) return;
          const k = APP.scene.pickAt(q.x + q.width / 2, q.y + q.height / 2);
          spots.push({ id: btn.id, w: Math.round(q.width), h: Math.round(q.height), x: Math.round(q.x), y: Math.round(q.y), pick: k && (k.kind + ':' + k.id), off: q.right < 0 || q.left > innerWidth || q.bottom < 0 || q.top > innerHeight });
        });
        return { yaw: y.yaw, shown: y.shown, cut: y.cut, zoom: APP.scene.pan().zoom, n, bad, at, voidAll: +(voidAll / all).toFixed(3), spots, pl: APP.scene.player().yaw, oct: APP.scene.motion().place };
      }, [CORN[room] || null, WALL_H[room] || 0]);
      const f = (W === 360 ? '' : W + '-') + `${room}-h${HOUR}-z${z}-a${a}.png`;
      await page.screenshot({ path: path.join(OUT, f) });
      res.push(Object.assign({ room, z, a, f }, info));
      console.log(room, 'z' + z, a + '°', 'cut', JSON.stringify(info.cut), 'void', info.bad + '/' + info.n, info.at || '', 'all', info.voidAll);
    }
  }
  require('fs').writeFileSync(path.join(__dirname, `p1-${W}-h${HOUR}.json`), JSON.stringify({ res, errs }, null, 1));
  console.log('errors', errs);
  await b.close();
})();
