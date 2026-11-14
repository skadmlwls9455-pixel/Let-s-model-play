/* 가로 폰 (740x360): 달리는 중 기둥 바깥 (어두운 옆) 을 손가락으로 톡하면 판이 닫히거나 멈추는가 */
const V = require('./vlib.js');
(async () => {
  const b = await V.launch();
  const { page } = await V.open(b, { w: 740, h: 360, lantern: 5 });
  await page.waitForTimeout(3200);
  await page.evaluate(() => APP.goRoom('play'));
  await page.waitForFunction(() => { const e = document.getElementById('btn-machine'); return e && !e.hidden && e.getBoundingClientRect().width > 0; });
  await page.waitForTimeout(900);
  await V.tapEl(page, '#btn-machine'); await page.waitForTimeout(1500);
  await V.tapEl(page, '#rn-jump'); await page.waitForTimeout(300);
  const st = () => page.evaluate(() => ({ open: !!document.querySelector('#runner-dlg[open]'), state: RUNNER.live() && RUNNER.live().state, ticks: RUNNER.live() && RUNNER.live().ticks }));
  console.log('running', JSON.stringify(await st()));
  await V.tap(page, 60, 180); await page.waitForTimeout(500);
  console.log('after side tap (left dark area)', JSON.stringify(await st()));
  await V.tap(page, 700, 330); await page.waitForTimeout(500);
  console.log('after side tap (right bottom, where 산책 갈래 shows through)', JSON.stringify(await st()));
  await V.shot(page, 'run-740x360-sidetap.png');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
