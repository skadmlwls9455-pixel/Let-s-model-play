/* 생각 풍선: 자리 (장면 가장자리 포함) × 돌린 각 × 두 글꼴 × 낮밤. 풍선 상자가 장면 안에 있는지 · 꼬리 · 그림 */
const V = require('./vlib.js');
(async () => {
  const b = await V.launch();
  const out = [];
  for (const pix of [true, false]) {
    const rec = V.REC(5); rec.settings.pixelFont = pix;
    for (const anchor of ['window', 'door', 'crate', 'blanket']) {
      const { ctx, page } = await V.open(b, { rec, look: { hour: anchor === 'door' ? 21 : 13, anchor } });
      await page.waitForTimeout(1200);
      for (const turn of [0, 1]) {
        if (turn) { await V.twist(page, 180, 330, 70, 0, 120, 20); await page.waitForTimeout(1200); }
        await page.evaluate(() => APP.say('음…', 'think', 60000));
        await page.waitForTimeout(700);
        const info = await page.evaluate(() => { const e = document.getElementById('oct-bubble'); if (!e) return null; const q = e.getBoundingClientRect(), s = document.getElementById('scene').getBoundingClientRect(); const cs = getComputedStyle(e);
          return { kind: e.getAttribute('data-kind') || e.className, tail: e.getAttribute('data-tail'), l: Math.round(q.left), r: Math.round(q.right), t: Math.round(q.top), b: Math.round(q.bottom), w: Math.round(q.width), h: Math.round(q.height), in: q.left >= s.left && q.right <= s.right && q.top >= s.top && q.bottom <= s.bottom, vis: cs.visibility, op: cs.opacity, bi: cs.borderImageSource.slice(0, 60) }; });
        out.push([pix ? 'pixel' : 'plain', anchor, turn ? 'turned' : '0', JSON.stringify(info)].join(' '));
        const name = 'think-' + (pix ? 'px' : 'pl') + '-' + anchor + (turn ? '-t' : '') + '.png';
        if (info && info.w) { const cx = Math.max(0, Math.min(360 - 200, info.l - 60)), cy = Math.max(0, Math.min(740 - 160, info.t - 50)); await page.screenshot({ path: V.SHOTS + '/' + name, clip: { x: cx, y: cy, width: 200, height: 160 } }); }
        // 긴 글
        await page.evaluate(() => APP.say('창밖 빗소리를 오래 듣는 중', 'think', 60000)); await page.waitForTimeout(500);
        const l2 = await page.evaluate(() => { const e = document.getElementById('oct-bubble'); const q = e.getBoundingClientRect(), s = document.getElementById('scene').getBoundingClientRect(); return { l: Math.round(q.left), r: Math.round(q.right), t: Math.round(q.top), w: Math.round(q.width), h: Math.round(q.height), in: q.left >= s.left - 0.5 && q.right <= s.right + 0.5 && q.top >= s.top - 0.5 }; });
        out.push('   long ' + JSON.stringify(l2));
      }
      await ctx.close();
    }
  }
  console.log(out.join('\n'));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
