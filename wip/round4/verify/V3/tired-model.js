/* V3 · 모델 (MCP 재생 길) 이 귀가 이유 'tired' (낱말이 아니라 열거값) 만 주면 화면은? — 로그 귀가 행 */
const L = require('./lib.js');
(async () => {
  const b = await L.launch();
  const { page } = await L.open(b, { lantern: 5, look: { hour: 14 } });
  await page.evaluate(() => APP.importEvents(JSON.stringify([{ type: 'depart', t: 0, hint: '' }, { type: 'peek', t: 500, target: { kind: 'room', id: 'hat' }, status: 'builtin', ms: 1000 }, { type: 'return', t: 1500, reason: 'tired' },
    { type: 'remember', t: 2000, stopIdx: 0, sticker: 'hat', line: '모자를 봤어' }, { type: 'hang_poster', t: 2500 }, { type: 'wrap_up', t: 3000 }])));
  await page.waitForTimeout(1500); await L.waitIdle(page, 120000); await page.waitForTimeout(500);
  const t = await page.evaluate(() => { const t = APP.state.trips[APP.state.trips.length - 1]; return { by: t.by, ret: (t.events.find(e => e.type === 'return') || {}) }; });
  await page.evaluate(() => APP.openLog()); await page.waitForTimeout(600);
  const rows = await page.evaluate(() => { const all = [...document.querySelectorAll('#log *')].filter(e => e.children.length === 0 && /다리가/.test(e.textContent)); if (all[0]) all[0].scrollIntoView({ block: 'center' }); return all.map(e => e.textContent); });
  await page.waitForTimeout(300); await L.shot(page, 'tired-model-row');
  console.log(JSON.stringify({ t, rows }));
  await b.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
