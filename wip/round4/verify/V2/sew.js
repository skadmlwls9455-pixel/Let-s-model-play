/* 재봉틀: 첫 진짜 톡 · 관성 중 톡 · 돌린 뒤 톡 · 시트 높이 · 세트 도감 접힘 */
const V = require('./vlib.js');
(async () => {
  const b = await V.launch();
  const W = +(process.argv[2] || 360), H = +(process.argv[3] || 740);
  const rec = V.REC(5, null);
  rec.user = { shells: 20, seeds: 2, dyes: { '#5fcde4': 1 }, days: [], garden: [null, null, null] };
  const { page } = await V.open(b, { w: W, h: H, rec, lantern: 5 });
  const errs = []; page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const state = () => page.evaluate(() => { const d = document.getElementById('sew-sheet'); const r = d.getBoundingClientRect(); const det = d.querySelector('details.sew-sets');
    return { open: d.open, hFrac: +(r.height / innerHeight).toFixed(2), top: Math.round(r.top), toast: (document.getElementById('toast') || {}).textContent || '', shells: APP.state.user.shells, dye: APP.state.user.dye || null, setsOpen: det ? det.open : 'none', summary: det ? det.querySelector('summary').textContent : '' }; });
  const close = async () => { await page.evaluate(() => { const d = document.getElementById('sew-sheet'); if (d.open) d.close(); const t = document.getElementById('toast'); if (t) t.textContent = ''; }); await V.idle(page); await page.waitForTimeout(700); };
  await page.waitForTimeout(3200);   // 오늘 선물 알림이 사라지도록
  await page.evaluate(() => APP.goRoom('loft'));
  await page.waitForFunction(() => { const e = document.getElementById('btn-sew'); return e && !e.hidden && e.getBoundingClientRect().width > 0; }, null, { timeout: 15000 });
  await page.waitForTimeout(900);
  // 1) 첫 톡 (CDP 진짜 손가락)
  let r = await V.tapEl(page, '#btn-sew'); console.log('sew rect', JSON.stringify(r));
  await page.waitForTimeout(1000); let s = await state(); console.log('first tap', JSON.stringify(s));
  await V.shot(page, 'sew-' + W + '-open.png');
  // 시트 안 칩 위치에서 한 번 더 톡해서 닫히지 않는지 / 칩 자리에 같은 점이 있는지
  await close();
  // 2) 다시 여러 자리
  for (const [fx, fy] of [[0.15, 0.2], [0.85, 0.85]]) { await V.tapEl(page, '#btn-sew', fx, fy); await page.waitForTimeout(1000); console.log('tap', fx, fy, JSON.stringify(await state())); await close(); }
  // 3) 한 손가락으로 밀고 곧바로 톡 (관성 중)
  await V.touchPath(page, [[180, 400]], [[60, 400]], 4);
  r = await V.rect(page, '#btn-sew'); const pm = await page.evaluate(() => APP.scene.pan && APP.scene.pan().mode);
  if (r && r.w) { await V.tap(page, r.x + r.w / 2, r.y + r.h / 2); await page.waitForTimeout(1000); console.log('after drag, pan mode was', pm, JSON.stringify(await state())); await close(); } else console.log('after drag: btn-sew hidden', JSON.stringify(r));
  // 4) 두 손가락 비틀기 90 · 180 뒤 톡
  for (const ang of [90, 180, 270]) {
    await V.twist(page, W / 2, H * 0.45, 70, 0, 90, 20); await page.waitForTimeout(1200);
    r = await V.rect(page, '#btn-sew');
    const cam = await page.evaluate(() => { const s = APP.scene; return s.camYaw ? s.camYaw() : (s.stats ? JSON.stringify(s.stats()).slice(0, 200) : ''); });
    if (r && r.w && !r.hidden) { await V.tap(page, r.x + r.w / 2, r.y + r.h / 2); await page.waitForTimeout(1000); const st = await state(); console.log('turn', ang, JSON.stringify(r), JSON.stringify(st)); if (st.open) await V.shot(page, 'sew-' + W + '-turn' + ang + '.png'); await close(); }
    else console.log('turn', ang, 'btn-sew not visible', JSON.stringify(r), cam);
  }
  // 5) 세트 도감 펼치기 · 시트 높이
  await page.evaluate(() => { const d = document.getElementById('sew-sheet'); });
  r = await V.rect(page, '#btn-sew');
  if (r && r.w && !r.hidden) { await V.tap(page, r.x + r.w / 2, r.y + r.h / 2); await page.waitForTimeout(900); await V.tapEl(page, 'details.sew-sets > summary'); await page.waitForTimeout(500); console.log('sets opened', JSON.stringify(await state())); await V.shot(page, 'sew-' + W + '-sets.png'); }
  console.log('console errors', errs.length, errs.slice(0, 3));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
