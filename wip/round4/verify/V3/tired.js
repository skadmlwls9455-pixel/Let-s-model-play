/* V3 · 코드가 쓴 몸 느낌 줄: 데모 산책이 4곳 넘게 걸으면 귀가 이유 'tired' → 로그 귀가 행 '다리가 좀 무거워' · 일기 줄 '…쯤에서 다리가 무거워졌어'.
   등불 5 · 함께한 날 5 · 14시 · 다락. 건너뛰기로 데모 산책을 거듭해 tired 차례가 나올 때까지 (최대 12) */
const L = require('./lib.js');
(async () => {
  const b = await L.launch();
  const { page, log } = await L.open(b, { lantern: 5, look: { hour: 14 } });
  let found = null;
  for (let i = 0; i < 12 && !found; i++) {
    await page.evaluate(() => { window.__ppolTest = Object.assign(window.__ppolTest || {}, { forceKind: 'out' }); });
    await L.waitIdle(page); await page.click('#btn-go'); await L.skipAway(page); await L.waitIdle(page);
    found = await page.evaluate(() => { const t = APP.state.trips[APP.state.trips.length - 1]; const r = (t.events || []).find(e => e.type === 'return'); return r && r.reason === 'tired' ? { id: t.id, seq: t.seq, date: t.date, stops: t.events.filter(e => e.type === 'peek').length, line: t.reactionLine || (t.receipt || {}).reactionLine, posterLine: t.poster && (t.poster.line || t.poster.title) } : null; });
  }
  console.log('tired trip', JSON.stringify(found));
  if (found) {
    await page.evaluate(() => APP.openLog()); await page.waitForTimeout(600);
    const row = await page.evaluate(() => { const all = [...document.querySelectorAll('#log *')].filter(e => e.children.length === 0 && /다리가/.test(e.textContent)); if (all[0]) all[0].scrollIntoView({ block: 'center' }); return all.map(e => e.closest('li, .row, div').textContent.trim().slice(0, 80)); });
    console.log('log rows', JSON.stringify(row));
    await page.waitForTimeout(400); await L.shot(page, 'tired-log-row');
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    const t = await page.evaluate(id => { const t = APP.state.trips.find(x => x.id === id); const d = document.createElement('div'); d.innerHTML = APP.receiptHTML(t); return (d.textContent.match(/.{0,30}다리가.{0,20}/g) || []); }, found.id);
    console.log('diary', JSON.stringify(t));
    await page.evaluate(id => APP.openPoster(id), found.id).catch(() => {}); await page.waitForTimeout(600);
    await page.evaluate(() => { const b = document.getElementById('pd-flip'); if (b) b.click(); }); await page.waitForTimeout(600);
    await L.shot(page, 'tired-poster-back');
    console.log('tapLine', JSON.stringify(await page.evaluate(() => { document.getElementById('poster-dialog').close(); const l = APP.tapLine(); return l && l.text; })));
  }
  await b.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
