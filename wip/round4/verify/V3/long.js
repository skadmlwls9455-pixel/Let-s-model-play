/* V3 · 긴 놀이 (소리 기본 꺼짐 · 콘솔 오류 · 화면 글의 기호): 진짜 손가락으로 산책 (끝까지) · 돌리기 · 가구 모드 · 마당 (심기 · 물) · 놀이방 · 달리기 · 부엌 · 2층 재봉틀 · 다시 산책.
   아무 소리 설정도 없는 기록 (기본 = 꺼짐). 모든 단계마다 audio/ · foley/ 요청 · AudioContext · 미디어 재생을 센다.
   NODE_PATH=$(npm root -g) node wip/round4/verify/V3/long.js [hour] */
const L = require('./lib.js');
const HOUR = +(process.argv[2] || 14);
const res = { hour: HOUR, steps: [], symbols: [] };
function step(m, d) { res.steps.push({ m, d }); console.log('-', m, d ? JSON.stringify(d).slice(0, 500) : ''); }
const SPOT = { 'btn-door': 'atticPlay', 'btn-play-door': 'playAttic', 'btn-machine': 'machine', 'btn-salon': 'salon', 'btn-stair': 'atticStair', 'btn-loft-stair': 'loftStair', 'btn-sew': 'sew', 'btn-yard': 'atticYard', 'btn-yard-door': 'yardAttic', 'btn-cook': 'counter' };
for (let i = 0; i < 6; i++) SPOT['btn-plot' + i] = 'plot' + i;
async function spot(page, id) {
  await page.waitForFunction(i => { const b = document.getElementById(i); return b && !b.hidden && b.getBoundingClientRect().width > 0; }, id, { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(300);
  const pt = await page.evaluate(a => {
    const b = document.getElementById(a.id); if (!b || b.hidden) return null;
    const r = b.getBoundingClientRect(), F = [0.5, 0.35, 0.65, 0.2, 0.8, 0.1, 0.9];
    for (const fy of F) for (const fx of F) { const x = r.left + r.width * fx, y = r.top + r.height * fy; const k = APP.scene.pickAt(x, y); if (k && k.kind === 'spot' && k.id === a.k) return [x, y]; }
    return [r.left + r.width / 2, r.top + r.height / 2, 'center'];
  }, { id, k: SPOT[id] });
  if (!pt) throw new Error('spot hidden ' + id);
  await L.tap(page, pt[0], pt[1]);
  return pt;
}
/* 화면 글의 기호: 보이는 글 + aria-label · title (한글 · ASCII · 가운뎃점 · 말줄임 · 숫자 밖) */
const SYM = function (where) {
  var bad = /[^\x20-\x7e가-힣ㄱ-ㆎ·…\s]/g, out = [];
  function vis(e) { var s = getComputedStyle(e); return s.display !== 'none' && s.visibility !== 'hidden'; }
  document.querySelectorAll('body *').forEach(function (e) {
    if (/^(SCRIPT|STYLE|svg|path|TEMPLATE)$/i.test(e.tagName)) return;
    var t = ''; e.childNodes.forEach(function (n) { if (n.nodeType === 3) t += n.nodeValue; });
    ['aria-label', 'title', 'alt'].forEach(function (a) { var v = e.getAttribute(a); if (v) t += ' ' + v; });
    var m = t.match(bad); if (m && vis(e)) out.push(where + ' <' + e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + '> ' + m.join('') + ' | ' + t.trim().slice(0, 80));
  });
  return out;
};
async function sym(page, where) { const s = await page.evaluate(SYM, where); res.symbols.push(...s); for (const fr of page.frames()) if (fr !== page.mainFrame()) { try { res.symbols.push(...(await fr.evaluate(SYM, where + ' (iframe)'))); } catch (e) {} } }
async function sound(page, log, where) { const ac = await page.evaluate(() => window.__ac.length); let acf = 0; for (const fr of page.frames()) { try { acf += await fr.evaluate(() => (window.__ac || []).length); } catch (e) {} } step('sound@' + where, { audioReq: log.audio.length, ac, acFrames: acf, errors: log.errors.length }); }
const room = p => p.evaluate(() => APP.room);
(async () => {
  const b = await L.launch();
  const rec = L.REC(5, null, 14);
  rec.octopus.days = Array.from({ length: 31 }, (_, i) => new Date(Date.UTC(2026, 9, 15 + i)).toISOString().slice(0, 10));
  rec.user = { shells: 40, seeds: 6, dyes: { red: 1 }, days: ['2026-11-13'], earned: [], garden: [null, null, null] };
  const { ctx, page, log } = await L.open(b, { rec, look: { hour: HOUR } });
  await sym(page, 'attic'); await L.shot(page, 'long-' + HOUR + '-attic');
  /* 1. 산책 끝까지 */
  await L.tapSel(page, '#btn-go'); await L.waitIdle(page, 200000).catch(async () => { step('walk slow → skip'); await L.skipAway(page); await L.waitIdle(page); });
  await sym(page, 'after-walk'); await sound(page, log, 'walk');
  /* 2. 돌리기 (두 손가락 비틀기) · 벌리기 */
  await L.twist(page, 180, 380, 70, 0, 120, 24); await page.waitForTimeout(600);
  await L.twist(page, 180, 380, 70, 120, 300, 24); await page.waitForTimeout(600);
  await L.touchPath(page, [[150, 380], [210, 380]], [[110, 380], [250, 380]], 12); await page.waitForTimeout(600);
  step('yaw', await page.evaluate(() => APP.scene.pan ? APP.scene.pan() : null));
  await L.shot(page, 'long-' + HOUR + '-turned');
  /* 3. 가구 모드 (돌린 채로 연다) */
  await L.tapSel(page, '#btn-furn'); await page.waitForTimeout(900);
  await sym(page, 'furn');
  const it = await page.$$('#furn-items button'); if (it[1]) { const r = await it[1].boundingBox(); await L.tap(page, r.x + r.width / 2, r.y + r.height / 2); }
  await page.waitForTimeout(300);
  for (const id of ['#furn-turn', '#furn-big', '#furn-small']) { if (await page.$(id + ':not([hidden])')) await L.tapSel(page, id).catch(() => {}); await page.waitForTimeout(250); }
  await L.touchPath(page, [[200, 420]], [[160, 470]], 10); await page.waitForTimeout(400);
  await L.shot(page, 'long-' + HOUR + '-furn');
  await L.tapSel(page, '#furn-ok'); await page.waitForTimeout(900);
  await sound(page, log, 'furn');
  /* 4. 마당 */
  await page.waitForFunction(() => !APP.goResting);
  try { await spot(page, 'btn-yard'); await page.waitForFunction(() => APP.room === 'yard', null, { timeout: 15000 }); } catch (e) { step('yard door tap failed → goRoom', e.message); await page.evaluate(() => APP.goRoom('yard')); await page.waitForTimeout(3000); }
  step('room', await room(page));
  await page.waitForTimeout(800);
  await sym(page, 'yard'); await L.shot(page, 'long-' + HOUR + '-yard');
  const plots = await page.evaluate(() => [0, 1, 2, 3, 4, 5].map(i => { const b = document.getElementById('btn-plot' + i); return b ? { i, hidden: b.hidden, label: b.getAttribute('aria-label') } : null; }));
  step('plots', plots);
  for (const p of plots) if (p && !p.hidden) { try { await spot(page, 'btn-plot' + p.i); await page.waitForTimeout(700); await spot(page, 'btn-plot' + p.i); await page.waitForTimeout(700); } catch (e) { step('plot fail ' + p.i, e.message); } }
  step('garden', await page.evaluate(() => APP.state.user.garden));
  await sym(page, 'yard-after'); await sound(page, log, 'yard');
  try { await spot(page, 'btn-yard-door'); await page.waitForFunction(() => (APP.room == null || APP.room === 'attic'), null, { timeout: 15000 }); } catch (e) { step('yard back failed', e.message); await page.evaluate(() => APP.goRoom('attic')); await page.waitForTimeout(3000); }
  step('room', await room(page));
  /* 5. 놀이방 · 달리기 */
  await page.waitForTimeout(600);
  try { await spot(page, 'btn-door'); await page.waitForFunction(() => APP.room === 'play', null, { timeout: 15000 }); } catch (e) { step('play door failed', e.message); await page.evaluate(() => APP.goRoom('play')); await page.waitForTimeout(3000); }
  await page.waitForTimeout(800); await sym(page, 'play');
  try { await spot(page, 'btn-machine'); await page.waitForTimeout(1500); } catch (e) { step('machine fail', e.message); }
  await sym(page, 'runner'); await L.shot(page, 'long-' + HOUR + '-runner');
  /* 뛰기 단추를 몇 번 · 끝날 때까지 (최대 40 s) */
  const bt = await page.$$eval('#runner-dialog button, dialog[open] button', bs => bs.map(x => (x.id || '') + ':' + (x.getAttribute('aria-label') || x.textContent.trim())));
  step('runner buttons', bt);
  for (let i = 0; i < 80; i++) {
    const st = await page.evaluate(() => RUNNER.live() && RUNNER.live().state);
    if (st === 'over') break;
    const j = await page.$('#rn-jump, .rn-jump, [id^=rn-j]'); if (j) { const r = await j.boundingBox(); if (r) await L.tap(page, r.x + r.width / 2, r.y + r.height / 2); }
    await page.waitForTimeout(500);
  }
  step('runner state', await page.evaluate(() => { const l = RUNNER.live(); return l && { state: l.state, score: l.score }; }));
  await sym(page, 'runner-over'); await L.shot(page, 'long-' + HOUR + '-runner-over');
  await page.evaluate(() => RUNNER.close()); await page.waitForTimeout(600);
  await sound(page, log, 'runner');
  /* 6. 부엌 (조리대) */
  try { await spot(page, 'btn-cook'); await page.waitForFunction(() => document.getElementById('cook-overlay') && document.getElementById('cook-overlay').open, null, { timeout: 10000 }); } catch (e) { step('cook tap failed', e.message); }
  await page.waitForTimeout(3000);
  await sym(page, 'cook'); await L.shot(page, 'long-' + HOUR + '-cook');
  const fr = page.frames().find(f => /cook\.html/.test(f.url()));
  if (fr) {
    for (let i = 0; i < 12; i++) { const bs = await fr.$$('button:not([disabled])'); const vis = []; for (const x of bs) { const r = await x.boundingBox(); if (r && r.width > 10) vis.push(r); } if (!vis.length) break; const r = vis[i % vis.length]; await L.tap(page, r.x + r.width / 2, r.y + r.height / 2); await page.waitForTimeout(400); }
    await L.shot(page, 'long-' + HOUR + '-cook2');
  } else step('no cook frame');
  await sound(page, log, 'cook');
  await page.evaluate(() => { const o = document.getElementById('cook-overlay'); if (o && o.open) o.close(); }); await page.waitForTimeout(500);
  /* 7. 다락 → 2층 → 재봉틀 */
  try { await spot(page, 'btn-play-door'); await page.waitForFunction(() => (APP.room == null || APP.room === 'attic'), null, { timeout: 15000 }); } catch (e) { await page.evaluate(() => APP.goRoom('attic')); await page.waitForTimeout(3000); }
  await page.waitForTimeout(600);
  try { await spot(page, 'btn-stair'); await page.waitForFunction(() => APP.room === 'loft', null, { timeout: 15000 }); } catch (e) { step('stair failed', e.message); await page.evaluate(() => APP.goRoom('loft')); await page.waitForTimeout(3000); }
  await page.waitForTimeout(800);
  try { await spot(page, 'btn-sew'); await page.waitForTimeout(1200); } catch (e) { step('sew fail', e.message); }
  await sym(page, 'sew'); await L.shot(page, 'long-' + HOUR + '-sew');
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  await sound(page, log, 'loft');
  /* 8. 다락으로 · 다시 산책 (돌린 채) */
  try { await spot(page, 'btn-loft-stair'); await page.waitForFunction(() => (APP.room == null || APP.room === 'attic'), null, { timeout: 15000 }); } catch (e) { await page.evaluate(() => APP.goRoom('attic')); await page.waitForTimeout(3000); }
  await L.twist(page, 180, 380, 70, 0, 200, 20); await page.waitForTimeout(500);
  await L.waitIdle(page); await L.tapSel(page, '#btn-go'); await L.waitIdle(page, 200000).catch(async () => { await L.skipAway(page); await L.waitIdle(page); });
  await sym(page, 'walk2'); await sound(page, log, 'walk2');
  /* 9. 쓰다듬기 (진짜 손가락: 문어 위 끌기 몇 번) */
  const op = await page.evaluate(() => { const o = APP.scene.octScreen ? APP.scene.octScreen() : null; return o; });
  step('octScreen', op);
  res.errors = log.errors; res.warns = [...new Set(log.warns)].slice(0, 20); res.audio = log.audio; res.ac = await page.evaluate(() => window.__ac);
  step('errors', log.errors); step('audio', log.audio); step('ac', res.ac);
  L.fs.writeFileSync(L.path.join(L.OUT, 'long-' + HOUR + '.out.json'), JSON.stringify(res, null, 1));
  await b.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
