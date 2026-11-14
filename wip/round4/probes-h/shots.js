/* 갈래 H 탐침: 화면 · 말풍선 · 시트 스크린샷 + 말풍선 크기 재기. node wip/round4/probes-h/shots.js <out-dir> [tag]
   NODE_PATH=$(npm root -g). 장면에 띄우는 말풍선은 모델 톡 한 줄처럼 24글자 + '…' (bubble() 와 같은 길: scene.bubble → UIART.onBubble) */
const path = require('path'), fs = require('fs');
const P = require('../probe-lib.js');
const OUT = path.resolve(process.argv[2] || 'shots'); const TAG = process.argv[3] || '';
fs.mkdirSync(OUT, { recursive: true });
const LINE = '책장 맨 위 칸에서 오래된 바다 지도를 한 장 찾았…';
const SIZES = (process.env.SIZES || '360x740,320x568').split(',').map(s => s.split('x').map(Number));
const FONTS = (process.env.FONTS || 'pixel,system').split(',');
(async () => {
  const b = await P.launch();
  const rows = [];
  for (const [w, h] of SIZES) for (const font of FONTS) {
    const rec = P.REC(6, null, 10); rec.settings.pixelFont = font === 'pixel';
    rec.bag = { shells: 14, seeds: { mint: 2 } };
    const { ctx, page } = await P.open(b, { w, h, rec, look: { hour: 12, weather: 'clear' } });
    const shot = async name => { if (font === 'pixel' || name === 'bubble') await page.screenshot({ path: path.join(OUT, `${TAG}${name}-${w}-${font}.png`) }); };
    await shot('main');
    const bub = await page.evaluate(async (line) => {
      APP.scene.bubble(line, 60000); if (window.UIART) UIART.onBubble(line, 'say');
      await new Promise(r => setTimeout(r, 700));
      const e = document.getElementById('oct-bubble'), r = e.getBoundingClientRect(), s = document.getElementById('scene').getBoundingClientRect();
      const lh = parseFloat(getComputedStyle(e).lineHeight) || 0;
      return { w: Math.round(r.width), h: Math.round(r.height), sw: Math.round(s.width), sh: Math.round(s.height), area: +(r.width * r.height / (s.width * s.height) * 100).toFixed(1), in: r.left >= s.left && r.right <= s.right && r.top >= s.top, fs: getComputedStyle(e).fontSize, ff: getComputedStyle(e).fontFamily.split(',')[0] };
    }, LINE);
    rows.push(Object.assign({ size: `${w}x${h}`, font }, bub));
    await shot('bubble');
    await page.evaluate(() => { APP.scene.bubble('', 0); });
    if (font === 'pixel') {
      for (const [name, fn] of [['settings', 'openSettings'], ['album', 'openAlbum']]) {
        await page.evaluate(f => APP[f](), fn); await page.waitForTimeout(500); await shot(name);
        await page.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())); await page.waitForTimeout(300);
      }
      await page.evaluate(() => { const bt = document.getElementById('btn-bag'); bt.hidden = false; bt.click(); }); await page.waitForTimeout(500); await shot('bag');
      await page.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())); await page.waitForTimeout(300);
      await page.evaluate(() => { APP.goRoom('loft'); }); await page.waitForTimeout(2500);
      await page.evaluate(() => { const s = document.getElementById('btn-sew'); s.hidden = false; s.click(); }); await page.waitForTimeout(600); await shot('sew');
    }
    await ctx.close();
  }
  console.log(JSON.stringify(rows, null, 0).replace(/\},\{/g, '},\n{'));
  await b.close();
})();
