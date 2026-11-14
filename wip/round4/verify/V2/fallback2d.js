/* 2D 폴백 (?scene=2d): 방마다 보이는 단추 · 재봉틀 · 조리대 → 부엌 · 오락기 → 달리기 · 망치 · 생각 풍선 · 로딩 문어 걷힘 */
const V = require('./vlib.js');
(async () => {
  const b = await V.launch();
  const rec = V.REC(5);
  const { page } = await V.open(b, { rec, q: '&scene=2d' });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.waitForTimeout(3200);
  const spots = () => page.evaluate(() => ({ mode: APP.sceneMode, room: APP.room, booted: document.documentElement.classList.contains('booted'), bootDisp: getComputedStyle(document.getElementById('boot')).display,
    btns: [...document.querySelectorAll('.scene-spot, .scene-door, .icon-btn')].filter(e => !e.hidden && e.getBoundingClientRect().width > 0 && getComputedStyle(e).visibility !== 'hidden').map(e => e.id) }));
  console.log('attic', JSON.stringify(await spots()));
  await V.shot(page, '2d-attic.png');
  // 망치
  const hb = await V.rect(page, '#btn-furn'); console.log('hammer', JSON.stringify(hb));
  // 생각 풍선
  await page.evaluate(() => APP.say('음…', 'think', 60000)); await page.waitForTimeout(600);
  console.log('think', JSON.stringify(await page.evaluate(() => { const e = document.getElementById('oct-bubble'); const q = e.getBoundingClientRect(); return { cls: e.className, w: q.width, h: q.height, l: q.left, t: q.top }; })));
  await V.shot(page, '2d-think.png');
  // 놀이방 (문 톡)
  const door = await V.rect(page, '#btn-door'); console.log('door', JSON.stringify(door));
  if (door && door.w) { await V.tap(page, door.x + door.w / 2, door.y + door.h / 2); await page.waitForTimeout(2500); }
  console.log('after door', JSON.stringify(await spots()));
  await V.shot(page, '2d-play.png');
  const ck = await V.rect(page, '#btn-cook'); console.log('cook btn', JSON.stringify(ck));
  if (ck && ck.w && !ck.hidden) { await V.tap(page, ck.x + ck.w / 2, ck.y + ck.h / 2); await page.waitForTimeout(2000); console.log('cook open', await page.evaluate(() => document.getElementById('cook-overlay').open)); await page.keyboard.press('Escape'); await page.waitForTimeout(800); }
  await V.idle(page); await page.waitForTimeout(700);
  const mc = await V.rect(page, '#btn-machine'); console.log('machine', JSON.stringify(mc));
  if (mc && mc.w && !mc.hidden) { await V.tap(page, mc.x + mc.w / 2, mc.y + mc.h / 2); await page.waitForTimeout(1500); console.log('runner open', await page.evaluate(() => !!document.querySelector('#runner-dlg[open]'))); await V.shot(page, '2d-runner.png'); await V.tapEl(page, '#rn-close'); await page.waitForTimeout(800); }
  // 다락 → 위층
  await V.idle(page);
  const pd = await V.rect(page, '#btn-play-door'); if (pd && pd.w) { await V.tap(page, pd.x + pd.w / 2, pd.y + pd.h / 2); await page.waitForTimeout(2500); }
  console.log('back', JSON.stringify(await spots()));
  const st = await V.rect(page, '#btn-stair'); console.log('stair', JSON.stringify(st));
  if (st && st.w && !st.hidden) { await V.tap(page, st.x + st.w / 2, st.y + st.h / 2); await page.waitForTimeout(2500); }
  console.log('loft?', JSON.stringify(await spots()));
  await V.shot(page, '2d-loft.png');
  const sw = await V.rect(page, '#btn-sew'); console.log('sew', JSON.stringify(sw));
  if (sw && sw.w && !sw.hidden) { await V.tap(page, sw.x + sw.w / 2, sw.y + sw.h / 2); await page.waitForTimeout(1000); console.log('sew open', await page.evaluate(() => document.getElementById('sew-sheet').open)); await V.shot(page, '2d-sew.png'); }
  console.log('errors', errs.length, errs.slice(0, 5));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
