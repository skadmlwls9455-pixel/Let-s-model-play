/* V3 · 배포판 기록으로: 가구 모드 (건드리지 않고 저장 · 취소 · 돌리기) · 내보내기 → 초기화 → 불러오기 · 달리기 예전 최고. save-compat.js 가 만든 prod-save.json 을 쓴다 */
const L = require('./lib.js');
const prod = JSON.parse(L.fs.readFileSync(L.path.join(L.OUT, 'prod-save.json'), 'utf8'));
const res = {};
function note(k, v) { res[k] = v; console.log(k, typeof v === 'string' ? v : JSON.stringify(v)); }
const lay = p => p.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('ppolppol_v2')).room.layout));
(async () => {
  const b = await L.launch();
  const { ctx, page, log } = await L.open(b, { rec: null, raw: prod });
  const before = await lay(page);
  note('layout0', before);
  /* 1. 망치 → 아무것도 안 하고 저장하기 */
  await L.tapSel(page, '#btn-furn'); await page.waitForTimeout(900);
  await L.shot(page, 'furn-open-prod');
  note('furnOn', await page.evaluate(() => document.body.classList.contains('furn') || !!document.querySelector('#furn-ui:not([hidden])')));
  await L.tapSel(page, '#furn-ok'); await page.waitForTimeout(900);
  note('layoutAfterSaveUntouched', await lay(page));
  /* 2. 담요 고르기 → 돌리기 → 취소 */
  await page.waitForFunction(() => !APP.goResting);
  await L.tapSel(page, '#btn-furn'); await page.waitForTimeout(900);
  const strip = await page.$$eval('#furn-items button', bs => bs.map(x => x.textContent.trim() + '|' + (x.getAttribute('aria-label') || '')));
  note('strip', strip);
  const sb = await page.$$('#furn-items button');
  if (sb[0]) { const r = await sb[0].boundingBox(); await L.tap(page, r.x + r.width / 2, r.y + r.height / 2); await page.waitForTimeout(400); }
  const rowVisible = await page.evaluate(() => { const r = document.getElementById('furn-row'); return r && !r.hidden; });
  note('selRowVisible', rowVisible);
  if (rowVisible) { await L.tapSel(page, '#furn-turn'); await page.waitForTimeout(400); }
  note('sceneAfterTurn', await page.evaluate(() => JSON.stringify(APP.scene.layout())));
  await L.tapSel(page, '#furn-x'); await page.waitForTimeout(900);
  note('layoutAfterCancel', await lay(page));
  note('sceneAfterCancel', await page.evaluate(() => JSON.stringify(APP.scene.layout())));
  /* 3. 소파 고르기 → 돌리기 → 저장하기 (15° 에서 90° 씩: 무엇이 저장되나) */
  await page.waitForFunction(() => !APP.goResting);
  await L.tapSel(page, '#btn-furn'); await page.waitForTimeout(900);
  const sb2 = await page.$$('#furn-items button');
  const labels = await page.$$eval('#furn-items button', bs => bs.map(x => x.dataset.id || x.textContent.trim()));
  const si = labels.findIndex(t => /sofa|소파/.test(t));
  if (si >= 0) { const r = await sb2[si].boundingBox(); await L.tap(page, r.x + r.width / 2, r.y + r.height / 2); await page.waitForTimeout(400); await L.tapSel(page, '#furn-turn'); await page.waitForTimeout(400); }
  await L.shot(page, 'furn-sofa-turned');
  await L.tapSel(page, '#furn-ok'); await page.waitForTimeout(900);
  note('layoutAfterSofaTurn', await lay(page));
  /* 4. 내보내기 (설정 시트의 단추 — 내려받기) */
  await page.waitForFunction(() => !APP.goResting);
  await L.tapSel(page, '#btn-settings'); await page.waitForTimeout(600);
  const dl = page.waitForEvent('download', { timeout: 10000 });
  await page.click('#set-export');
  const d = await dl; const fp = L.path.join(L.OUT, 'export.json'); await d.saveAs(fp);
  const exp = L.fs.readFileSync(fp, 'utf8');
  const E = JSON.parse(exp);
  note('export', { name: d.suggestedFilename(), bytes: exp.length, gardenLen: E.user.garden.length, trips: E.trips.length, layout: E.room.layout, hintKept: E.trips.some(t => t.hint && t.hint.raw === '모자의 역사') });
  /* 5. 전체 초기화 (두 번 누름) */
  await page.click('#set-reset'); await page.waitForTimeout(200); await page.click('#set-reset'); await page.waitForTimeout(1200);
  const afterReset = await page.evaluate(() => ({ name: APP.state.octopus.name, trips: APP.state.trips.length, nameDlg: document.getElementById('name-dialog').open, keys: Object.keys(localStorage).filter(k => /^ppolppol/.test(k)), runner: localStorage.getItem('ppolppol_runner') }));
  note('afterReset', afterReset);
  await L.shot(page, 'after-reset');
  /* 이름 창을 닫고 (이름 짓기) 불러오기 */
  await page.evaluate(() => { const d = document.getElementById('name-dialog'); const i = d.querySelector('input[type=text], input:not([type])'); if (i) { i.value = '새문어'; i.dispatchEvent(new Event('input', { bubbles: true })); } const f = d.querySelector('form'); const ok = d.querySelector('button[type=submit], .primary'); if (ok) ok.click(); else if (f) f.requestSubmit(); });
  await page.waitForTimeout(1000);
  await page.waitForFunction(() => !APP.goResting, null, { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => APP.openSettings()); await page.waitForTimeout(500);
  await page.setInputFiles('#set-import', fp); await page.waitForTimeout(1500);
  const back = await page.evaluate(() => localStorage.getItem('ppolppol_v2'));
  const B = JSON.parse(back);
  const same = JSON.stringify(Object.assign({}, E, { settings: Object.assign({}, E.settings, { lastSeen: 0 }) })) === JSON.stringify(Object.assign({}, B, { settings: Object.assign({}, B.settings, { lastSeen: 0 }) }));
  note('importSame', same);
  if (!same) { const ks = []; Object.keys(E).forEach(k => { if (JSON.stringify(E[k]) !== JSON.stringify(B[k])) ks.push(k); }); note('importDiffKeys', ks); }
  note('toast', await page.evaluate(() => (document.querySelector('.toast, #toast') || {}).textContent || ''));
  /* 6. 달리기 예전 최고 */
  note('runnerStore', await page.evaluate(() => localStorage.getItem('ppolppol_runner')));
  note('errors', log.errors); note('audio', log.audio); note('ac', await page.evaluate(() => window.__ac));
  L.fs.writeFileSync(L.path.join(L.OUT, 'save-flow.out.json'), JSON.stringify(res, null, 1));
  await b.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
