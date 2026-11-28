/* wip/round6/notes/d-playtap.js — lane D: play-room tap targets (arcade / counter / table) do not steal each other. NODE_PATH=$(npm root -g) node wip/round6/notes/d-playtap.js */
const P = require('../../round4/probe-lib.js');
(async () => {
  const b = await P.launch();
  for (const o of [{ w: 360, h: 740, dpr: 2 }, { w: 412, h: 915, dpr: 2.625 }]) {
    const { ctx, page } = await P.open(b, { w: o.w, h: o.h, dpr: o.dpr, look: { hour: 14 }, lantern: 4 });
    await page.evaluate(() => APP.goRoom('play')); await page.waitForFunction(() => APP.scene.view() === 'play'); await page.waitForTimeout(1500);
    await page.evaluate(() => {   /* stand-in buttons (the app's #btn-table is lane M's) */
      const sc = document.getElementById('scene'), map = {};
      ['playAttic', 'machine', 'counter', 'table'].forEach(id => { const e = document.createElement('button'); e.className = 'scene-spot'; e.id = 'probe-' + id; sc.appendChild(e); map[id] = e; });
      APP.scene.hotspots(map); window.__spots = [];
    });
    for (const yaw of [0, 90, 180, 270]) {
      await page.evaluate(y => APP.scene.setLook({ yaw: y }), yaw); await page.waitForTimeout(600);
      const r = await page.evaluate(() => {
        const S = APP.scene, sc = document.getElementById('scene').getBoundingClientRect(), out = { machine: [0, 0], counter: [0, 0], table: [0, 0], wrong: [] };
        const bx = ['machine', 'counter', 'table'].map(id => S.spotRect(id)).filter(x => x && x.art);
        if (!bx.length) return out;
        const l = Math.max(2, Math.min(...bx.map(x => x.art.l))), t = Math.max(2, Math.min(...bx.map(x => x.art.t))), rr = Math.min(sc.width - 2, Math.max(...bx.map(x => x.art.r))), bb = Math.min(sc.height - 2, Math.max(...bx.map(x => x.art.b)));
        for (let y = t; y <= bb; y += 4) for (let x = l; x <= rr; x += 4) {
          const cx = sc.left + x, cy = sc.top + y, tr = S.debugPlayTruth(cx, cy); if (!tr || !S.spotRect(tr)) continue;
          const p = S.pickAt(cx, cy); out[tr][1]++; if (p && p.id === tr) out[tr][0]++; else if (out.wrong.length < 4) out.wrong.push([tr, x | 0, y | 0, p && p.id]);
        }
        return out;
      });
      console.log(o.w + '@' + o.dpr, yaw + '°', ['machine', 'counter', 'table'].map(k => k + ' ' + r[k][0] + '/' + r[k][1]).join(' · '), JSON.stringify(r.wrong));
    }
    await ctx.close();
  }
  await b.close();
})();
