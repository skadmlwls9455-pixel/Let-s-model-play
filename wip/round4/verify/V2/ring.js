/* 손가락으로 장면 단추 → 덮개/시트 → 손가락으로 닫기 뒤 단추에 포커스 링이 남는가 (조리대 · 오락기 · 재봉틀) */
const V = require('./vlib.js');
(async () => {
  const b = await V.launch();
  const { page } = await V.open(b, { lantern: 5 });
  await page.waitForTimeout(3200);
  const ringOf = id => page.evaluate(id => { const e = document.getElementById(id); return { focused: document.activeElement === e, focusVisible: e.matches(':focus-visible'), ringOff: e.classList.contains('ring-off'), outline: getComputedStyle(e).outlineStyle }; }, id);
  await page.evaluate(() => APP.goRoom('play'));
  await page.waitForFunction(() => { const e = document.getElementById('btn-cook'); return e && !e.hidden && e.getBoundingClientRect().width > 0; });
  await page.waitForTimeout(900);
  await V.tapEl(page, '#btn-cook'); await page.waitForTimeout(2500);
  const fr = page.frames().find(f => /cook\.html/.test(f.url()));
  const cr = await fr.evaluate(() => { const q = document.querySelector('.ck-close').getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height }; });
  await V.tap(page, cr.x + cr.w / 2, cr.y + cr.h / 2); await page.waitForTimeout(1000);
  console.log('cook closed by finger:', JSON.stringify(await ringOf('btn-cook')));
  await V.idle(page); await page.waitForTimeout(800);
  // 오락기 (달리기) → 닫기
  await V.tapEl(page, '#btn-machine'); await page.waitForTimeout(2000);
  const rc = await V.rect(page, '.rn-close, #rn-close');
  console.log('runner close rect', JSON.stringify(rc));
  if (rc && rc.w) { await V.tap(page, rc.x + rc.w / 2, rc.y + rc.h / 2); await page.waitForTimeout(1000); }
  console.log('runner closed by finger:', JSON.stringify(await ringOf('btn-machine')));
  await V.shot(page, 'ring-after-runner.png');
  // 재봉틀
  await V.idle(page); await page.evaluate(() => APP.goRoom('attic')); await page.waitForTimeout(1500); await page.evaluate(() => APP.goRoom('loft')); await page.waitForFunction(() => { const e = document.getElementById('btn-sew'); return e && !e.hidden && e.getBoundingClientRect().width > 0; }); await page.waitForTimeout(900);
  await V.tapEl(page, '#btn-sew'); await page.waitForTimeout(1000);
  const cl = await page.evaluate(() => { const bs = [...document.querySelectorAll('#sew-sheet button')].filter(b => /닫기/.test(b.textContent)); const q = bs[bs.length - 1].getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height }; });
  await V.tap(page, cl.x + cl.w / 2, cl.y + cl.h / 2); await page.waitForTimeout(1000);
  console.log('sew closed by finger:', JSON.stringify(await ringOf('btn-sew')), 'active', await page.evaluate(() => document.activeElement && (document.activeElement.id || document.activeElement.tagName)));
  await V.shot(page, 'ring-after-sew.png');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
