/* 조리대 톡 뒤 브라우저가 같은 손가락의 click 을 부엌 iframe 안에 보내는가 (장면의 click 막은 부모 창에만 있다).
   부엌 '닫기' 단추와 조리대 단추가 겹치는 자리를 진짜 손가락으로 눌러 연다 → 열린 채인가. 처음 열기 · 다시 열기 둘 다 */
const V = require('./vlib.js');
(async () => {
  const b = await V.launch();
  const { page } = await V.open(b, { lantern: 5 });
  await page.waitForTimeout(3200);
  await page.evaluate(() => APP.goRoom('play'));
  await page.waitForFunction(() => { const e = document.getElementById('btn-cook'); return e && !e.hidden && e.getBoundingClientRect().width > 0; });
  await page.waitForTimeout(900);
  const open = () => page.evaluate(() => document.getElementById('cook-overlay').open);
  const counter = await V.rect(page, '#btn-cook'); console.log('counter', JSON.stringify(counter));
  // 처음 열기: 가운데
  await V.tap(page, counter.x + counter.w / 2, counter.y + counter.h / 2); await page.waitForTimeout(2500);
  const fr = page.frames().find(f => /cook\.html/.test(f.url()));
  const close = await fr.evaluate(() => { const q = document.querySelector('.ck-close').getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height }; });
  const props = await fr.evaluate(() => [...document.querySelectorAll('.ck-prop')].map(b => { const q = b.getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height }; }));
  console.log('first open', await open(), 'kitchen close', JSON.stringify(close), 'props', JSON.stringify(props));
  // 겹치는 자리
  const ox = Math.max(counter.x, close.x) + 4, oy = Math.max(counter.y, close.y) + 4;
  const overlap = ox < Math.min(counter.x + counter.w, close.x + close.w) && oy < Math.min(counter.y + counter.h, close.y + close.h);
  console.log('overlap point', ox, oy, overlap);
  await page.keyboard.press('Escape'); await page.waitForTimeout(900); await V.idle(page); await page.waitForTimeout(800);
  const res = [];
  for (let i = 0; i < 3; i++) {
    await V.tap(page, overlap ? ox : counter.x + 6, overlap ? oy : counter.y + 6); await page.waitForTimeout(1500);
    const o = await open(); res.push(o);
    if (o) { await page.keyboard.press('Escape'); await page.waitForTimeout(900); }
    await V.idle(page); await page.waitForTimeout(800);
  }
  console.log('reopen at overlap -> open?', res.join(','));
  // 다시 열고 바로 끓던 냄비 자리 (소품) 위 겹침도
  if (props[0]) {
    const px = Math.max(counter.x, props[0].x) + 4, py = Math.max(counter.y, props[0].y) + 4;
    const ov2 = px < Math.min(counter.x + counter.w, props[0].x + props[0].w) && py < Math.min(counter.y + counter.h, props[0].y + props[0].h);
    console.log('counter/prop overlap', ov2, px, py);
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
