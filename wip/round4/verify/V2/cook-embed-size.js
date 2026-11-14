/* 게임 안 부엌 덮개의 무대 크기 (iframe 안 .ck-cv) — node cook-embed-size.js W H DPR. 따로 연 cook.html (cook-size.js) 과 비교 */
const V = require('./vlib.js');
const W = +(process.argv[2] || 320), H = +(process.argv[3] || 568), DPR = +(process.argv[4] || 2);
(async () => {
  const b = await V.launch();
  const { page } = await V.open(b, { w: W, h: H, dpr: DPR, lantern: 5 });
  await page.waitForTimeout(3200);
  await page.evaluate(() => APP.goRoom('play'));
  await page.waitForFunction(() => { const e = document.getElementById('btn-cook'); return e && !e.hidden && e.getBoundingClientRect().width > 0; });
  await page.waitForTimeout(900);
  await V.tapEl(page, '#btn-cook'); await page.waitForTimeout(2500);
  const fr = page.frames().find(f => /cook\.html/.test(f.url()));
  const sz = await fr.evaluate(() => { const c = document.querySelector('.ck-cv'); const q = c.getBoundingClientRect(); return { stage: [Math.round(q.x), Math.round(q.y), Math.round(q.width), Math.round(q.height)], inner: [innerWidth, innerHeight], dpr: devicePixelRatio }; });
  console.log(W + 'x' + H + '@' + DPR, 'embed', JSON.stringify(sz));
  await V.shot(page, 'cook-embed-' + W + '-dpr' + DPR + '.png');
  // 한 번 닫고 다시 열면 크기가 바뀌는가
  await page.keyboard.press('Escape'); await page.waitForTimeout(800); await V.idle(page); await page.waitForTimeout(700);
  await V.tapEl(page, '#btn-cook'); await page.waitForTimeout(1500);
  const sz2 = await fr.evaluate(() => { const q = document.querySelector('.ck-cv').getBoundingClientRect(); return [Math.round(q.x), Math.round(q.y), Math.round(q.width), Math.round(q.height)]; });
  console.log('reopen stage', JSON.stringify(sz2));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
