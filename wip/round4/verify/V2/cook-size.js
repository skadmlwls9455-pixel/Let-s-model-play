/* 부엌 무대 크기: 따로 연 cook.html 과 게임 안 덮개(iframe) 를 폰 크기마다 비교 (무대 캔버스 CSS 크기) */
const V = require('./vlib.js');
(async () => {
  const b = await V.launch();
  for (const [w, h] of [[320, 568], [360, 740], [412, 915]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: +(process.argv[2] || 2), hasTouch: true, isMobile: true, locale: 'ko-KR' });
    const page = await ctx.newPage();
    await page.goto('file://' + V.ROOT + '/cook.html'); await page.waitForTimeout(800);
    await page.click('#ck-door').catch(() => {}); await page.waitForTimeout(1200);
    const sa = await page.evaluate(() => { const c = document.querySelector('.ck-cv'); if (!c) return null; const q = c.getBoundingClientRect(); return [Math.round(q.x), Math.round(q.y), Math.round(q.width), Math.round(q.height)]; });
    await page.screenshot({ path: V.SHOTS + '/cook-standalone-' + w + '.png' });
    console.log(w + 'x' + h, 'standalone stage', JSON.stringify(sa));
    await ctx.close();
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
