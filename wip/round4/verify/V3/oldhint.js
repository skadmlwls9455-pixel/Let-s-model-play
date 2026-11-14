/* V3 · 옛 힌트 (11-10 전 산책): 배포판 기록 (prod-save.json · 첫 산책에 '모자의 역사' 힌트) 을 합친 판에서 열고 화면 어디에도 '힌트' · 힌트 글이 없나.
   톡 한 줄 (tapLine) · 어제 메모 · 로그 · 앨범 · 일기 뒷면 · 열람 · 포스터 · aria 까지. 개발 모드 (?dev=1) 에선 보이는가 */
const L = require('./lib.js');
const prod = JSON.parse(L.fs.readFileSync(L.path.join(L.OUT, 'prod-save.json'), 'utf8'));
(async () => {
  const b = await L.launch();
  const out = {};
  for (const q of ['', '&dev=1']) {
    const { ctx, page, log } = await L.open(b, { rec: null, raw: prod, q, today: '2026-11-15' });
    await page.evaluate(() => APP.openAlbum()); await page.waitForTimeout(400);
    const chips = await page.$$eval('#album-sheet .fchip', bs => bs.map(b => b.dataset.f));
    let txt = '';
    for (const f of chips) { await page.click('.fchip[data-f="' + f + '"]'); await page.evaluate(() => document.querySelectorAll('#album-sheet details').forEach(d => { d.open = true; })); await page.waitForTimeout(200); txt += await page.evaluate(() => document.getElementById('album-sheet').textContent); }
    await page.keyboard.press('Escape');
    const more = await page.evaluate(() => {
      let s = document.body.textContent; [].forEach.call(document.querySelectorAll('[aria-label],[title]'), e => { s += ' ' + (e.getAttribute('aria-label') || '') + ' ' + (e.getAttribute('title') || ''); });
      APP.state.trips.forEach(t => { const d = document.createElement('div'); d.innerHTML = APP.receiptHTML(t) + APP.inspectHTML(t); s += d.textContent; });
      const tl = APP.tapLine(); s += ' TAP:' + (tl ? tl.text : '');
      return s;
    });
    txt += more;
    const hit = (txt.match(/.{0,20}(힌트|모자의 역사|따라감|우쭐|덤덤).{0,20}/g) || []);
    out[q || 'player'] = { hits: [...new Set(hit)].slice(0, 10), errors: log.errors };
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ppolppol_v2')).trips[0].hint);
    out[(q || 'player') + ':saved'] = saved;
    await ctx.close();
  }
  console.log(JSON.stringify(out, null, 1));
  L.fs.writeFileSync(L.path.join(L.OUT, 'oldhint.out.json'), JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
