/* wip/round6/notes/d-stair.js — lane D: attic stair vs yard doorway tap grid (audit J3). NODE_PATH=$(npm root -g) node wip/round6/notes/d-stair.js */
const P = require('../../round4/probe-lib.js');
(async () => {
  const b = await P.launch(), rows = [];
  for (const o of [{ w: 360, h: 740, dpr: 2 }, { w: 412, h: 915, dpr: 2.625 }]) for (const hour of [14, 21]) {
    const { ctx, page } = await P.open(b, { w: o.w, h: o.h, dpr: o.dpr, look: { hour: hour }, lantern: 4 });
    for (const yaw of [0, 90, 180]) {
      await page.evaluate(y => APP.scene.setLook({ yaw: y }), yaw); await page.waitForTimeout(500);
      const r = await page.evaluate(() => {
        const S = APP.scene, sc = document.getElementById('scene').getBoundingClientRect(), boxes = ['atticStair', 'atticYard'].map(id => S.spotRect(id)).filter(x => x && x.art);
        if (!boxes.length) return null;
        let l = Infinity, t = Infinity, rr = -Infinity, bb = -Infinity; boxes.forEach(x => { l = Math.min(l, x.art.l); t = Math.min(t, x.art.t); rr = Math.max(rr, x.art.r); bb = Math.max(bb, x.art.b); });
        const out = { stair: [0, 0], door: [0, 0], wrong: [] };
        for (let y = Math.max(t, 2); y <= Math.min(bb, sc.height - 2); y += 4) for (let x = Math.max(l, 2); x <= Math.min(rr, sc.width - 2); x += 4) {
          const cx = sc.left + x, cy = sc.top + y, tr = S.debugTapTruth(cx, cy);
          if (tr !== 'stair' && tr !== 'door') continue;
          const p = S.pickAt(cx, cy), id = p && p.id, want = tr === 'stair' ? 'atticStair' : 'atticYard';
          out[tr][1]++; if (id === want) out[tr][0]++; else if (out.wrong.length < 6) out.wrong.push([tr, Math.round(x), Math.round(y), id]);
        }
        return out;
      });
      rows.push({ size: o.w + '@' + o.dpr, hour, yaw, r });
      console.log(o.w + '@' + o.dpr, hour === 14 ? 'day' : 'night', yaw, r ? 'stair ' + r.stair[0] + '/' + r.stair[1] + ' (' + (100 * r.stair[0] / Math.max(1, r.stair[1])).toFixed(1) + '%) door ' + r.door[0] + '/' + r.door[1] + ' (' + (100 * r.door[0] / Math.max(1, r.door[1])).toFixed(1) + '%) ' + JSON.stringify(r.wrong) : 'no boxes');
    }
    await ctx.close();
  }
  await b.close();
})();
