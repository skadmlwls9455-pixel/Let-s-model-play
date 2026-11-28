/* wip/round4/g-probe.js — 갈래 G 탐침: 시각 × 등불 × 날씨 × 방 렌더 + 방 루마 · 계단 대비 (배포 안 나감).
   node wip/round4/g-probe.js <outdir> [tag]   (NODE_PATH=$(npm root -g)) */
const fs = require('fs'), path = require('path');
const P = require('./probe-lib.js');
const LM = require('../../tools/look-metrics.js');
const out = process.argv[2], tag = process.argv[3] || 'x';
fs.mkdirSync(out, { recursive: true });
const HOURS = (process.env.HOURS || '17,18,19,19.5,20,20.5,21,22,0,3,5,6').split(',').map(Number);
const LANTS = (process.env.LANTS || '0,3,8').split(',').map(Number);
const WEAS = (process.env.WEAS || 'clear,rain').split(',');
const ROOMS = (process.env.ROOMS || 'attic,loft,play').split(',');
function luma(img, x0, y0, x1, y1) {
  let s = 0, n = 0; const { w, bpp, px } = img;
  for (let y = Math.max(0, y0 | 0); y < Math.min(img.h, y1 | 0); y++) for (let x = Math.max(0, x0 | 0); x < Math.min(w, x1 | 0); x++) {
    const i = (y * w + x) * bpp; s += (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255; n++;
  }
  return n ? s / n : 0;
}
(async () => {
  const b = await P.launch(); const rows = [];
  for (const wea of WEAS) for (const lv of LANTS) for (const room of ROOMS) {
    const { ctx, page } = await P.open(b, { lantern: lv, look: { hour: HOURS[0], weather: wea } });
    {
      if (room !== 'attic') { await page.evaluate(r => APP.goRoom(r), room); await page.waitForFunction(r => APP.room === r && APP.scene.stats().view === r, room, { timeout: 20000 }); await page.waitForTimeout(600); }
      for (const h of HOURS) {
        await page.evaluate(h => { APP.scene.setTime(h, true); }, h);
        await page.waitForTimeout(350);
        const f = path.join(out, `${tag}_${room}_${wea}_L${lv}_h${String(h).replace('.', '_')}.png`);
        await page.screenshot({ path: f });
        const img = LM.decodePNG(f);
        const spot = await page.evaluate(id => { const e = document.getElementById(id); if (!e || e.hidden) return null; const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; }, room === 'attic' ? 'btn-stair' : room === 'loft' ? 'btn-loft-stair' : 'x');
        const cv = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; });
        const roomL = luma(img, cv[0], cv[1], cv[2], cv[3]);
        let st = null, ring = null;
        if (spot) { const [l, t, r, bb] = spot, pw = (r - l) * 0.5, ph = (bb - t) * 0.5; st = luma(img, l, t, r, bb); const big = luma(img, l - pw, t - ph, r + pw, bb + ph), A = (r - l) * (bb - t), B = (r - l + 2 * pw) * (bb - t + 2 * ph); ring = (big * B - st * A) / (B - A); }
        const s = await page.evaluate(() => { const x = APP.scene.stats(); return { phase: x.phase, em: x.em, hemi: x.hemi, programs: x.programs }; });
        rows.push({ room, wea, lv, h, roomL: +roomL.toFixed(4), stair: st == null ? null : +st.toFixed(4), ring: ring == null ? null : +ring.toFixed(4), ...s, f: path.basename(f) });
        console.log(JSON.stringify(rows[rows.length - 1]));
      }
    }
    await ctx.close();
  }
  fs.writeFileSync(path.join(out, tag + '.json'), JSON.stringify(rows, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
