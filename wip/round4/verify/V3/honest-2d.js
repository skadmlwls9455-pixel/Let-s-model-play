/* V3 · 2D 폴백 (?scene=2d): 데모 우쭐 · 덤덤 숨김 · 장면 얼굴 idle · 살림 시트 텃밭 여섯 칸 (2D 만 시트에 남는다) · 소리 꺼짐 · 콘솔 오류 */
const L = require('./lib.js');
const prod = JSON.parse(L.fs.readFileSync(L.path.join(L.OUT, 'prod-save.json'), 'utf8'));
(async () => {
  const b = await L.launch();
  const { page, log } = await L.open(b, { rec: null, raw: prod, q: '&scene=2d', look: { hour: 14 } });
  console.log('mode', await page.evaluate(() => APP.sceneMode));
  await page.evaluate(() => {
    window.__ex = []; const se = APP.scene.setExpression; if (se) APP.scene.setExpression = function (n) { window.__ex.push(n); return se.apply(this, arguments); };
    const so = APP.scene.setOctState; if (so) APP.scene.setOctState = function (n) { window.__ex.push('S:' + n); return so.apply(this, arguments); };
    const plan0 = BRAIN.plan; BRAIN.plan = function () { return plan0.apply(BRAIN, arguments).then(p => { const r = window.__forceRx; if (r && p && p.kind !== 'empty') { p.reaction = r; if (p.receipt) p.receipt.reaction = r; (p.events || []).forEach(e => { if (e.type === 'wrap_up') e.reaction = r; }); } return p; }); };
  });
  for (const [rx, k] of [['우쭐', 'out'], ['덤덤', 'home']]) {
    await page.evaluate(a => { window.__forceRx = a[0]; window.__ppolTest = Object.assign(window.__ppolTest || {}, { forceKind: a[1] }); window.__ex.length = 0; }, [rx, k]);
    await L.waitIdle(page); await L.tapSel(page, '#btn-go'); await L.waitIdle(page, 180000).catch(async () => { await L.skipAway(page); await L.waitIdle(page); });
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => ({ ex: window.__ex.slice(), hit: (document.body.textContent.match(/.{0,10}(우쭐|덤덤).{0,10}/g) || []), sr: (document.getElementById('scene-desc') || {}).textContent }));
    console.log(rx, k, JSON.stringify(r));
  }
  await L.shot(page, 'twod-after');
  /* 살림 시트 · 텃밭 */
  await page.evaluate(() => document.getElementById('btn-bag').click()); await page.waitForTimeout(600);
  const bag = await page.evaluate(() => ({ plots: [...document.querySelectorAll('[id^=bag-plot], .plot, [data-plot]')].map(e => e.getAttribute('aria-label') || e.textContent.trim()).slice(0, 8), text: document.getElementById('bag-sheet') ? document.getElementById('bag-sheet').textContent.slice(0, 400) : null }));
  console.log('bag', JSON.stringify(bag));
  await L.shot(page, 'twod-bag');
  console.log('errors', JSON.stringify(log.errors.filter(e => !/wikipedia|ERR_FAILED/.test(e))), 'audio', log.audio.length, 'ac', await page.evaluate(() => window.__ac.length));
  await b.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
