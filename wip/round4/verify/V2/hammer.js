/* 망치 아이콘: 1× · 3× · 밝은 · 어두운 테마 · 픽셀 글꼴 끈 판. 위쪽 바를 잘라 찍는다 */
const V = require('./vlib.js');
(async () => {
  const b = await V.launch();
  for (const [dpr, scheme] of [[1, 'light'], [3, 'light'], [1, 'dark'], [3, 'dark']]) {
    const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: dpr, colorScheme: scheme, hasTouch: true, isMobile: true, locale: 'ko-KR' });
    const page = await ctx.newPage();
    await page.addInitScript({ content: "localStorage.setItem('ppolppol_v2', " + JSON.stringify(JSON.stringify(V.REC(5))) + ");" });
    await page.goto('file://' + V.ROOT + '/index.html?intro=0');
    await page.waitForSelector('#btn-go:not(.away)'); await page.waitForTimeout(1200);
    const info = await page.evaluate(() => { const e = document.getElementById('btn-furn'); const q = e.getBoundingClientRect(); const s = e.querySelector('svg'); const sibs = [...e.parentElement.querySelectorAll('.icon-btn')].map(x => { const r = x.getBoundingClientRect(); const sv = x.querySelector('svg, img'); const sr = sv && sv.getBoundingClientRect(); return x.id + ':' + Math.round(r.width) + 'x' + Math.round(r.height) + (sr ? ' ico ' + sr.width + 'x' + sr.height : ''); });
      return { rect: [q.x, q.y, q.width, q.height], vb: s && s.getAttribute('viewBox'), sr: s && s.getAttribute('shape-rendering'), svgSize: s && [s.getBoundingClientRect().width, s.getBoundingClientRect().height], sibs, theme: document.documentElement.dataset.theme || '', font: document.documentElement.dataset.font }; });
    console.log(dpr, scheme, JSON.stringify(info));
    await page.screenshot({ path: V.SHOTS + '/hammer-' + dpr + 'x-' + scheme + '.png', clip: { x: 180, y: 0, width: 180, height: 48 } });
    await ctx.close();
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
