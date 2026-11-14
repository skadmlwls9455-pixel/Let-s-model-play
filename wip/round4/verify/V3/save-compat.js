/* V3 · 배포판 저장 호환: 배포판 (5bb3db8 = 4차 시작 전, 지금 production 과 같은 게임) 에서 기록을 만들고 → 합친 판에서 연다.
   쓰기: OLD=<5bb3db8 체크아웃 폴더> NODE_PATH=$(npm root -g) node wip/round4/verify/V3/save-compat.js */
const L = require('./lib.js');
const OLD = process.env.OLD;
if (!OLD) { console.error('OLD= 를 줘'); process.exit(2); }
const out = { steps: [] };
function note(k, v) { out[k] = v; console.log(k, typeof v === 'string' ? v : JSON.stringify(v)); }

(async () => {
  const b = await L.launch();
  /* 1. 배포판에서: 등불 5 · 함께한 날 14 · 데모 산책 셋 (진짜 길) */
  const rec = L.REC(5, { user: undefined }, 14);
  let { ctx, page, log } = await L.open(b, { root: OLD, rec });
  for (let i = 0; i < 3; i++) { await L.waitIdle(page); await page.click('#btn-go'); await L.skipAway(page); await L.waitIdle(page); await page.waitForTimeout(300); }
  /* 2. 배포판의 앱으로 살림 · 텃밭 셋 · 가구 (15° · 0.85) · 옛 힌트 산책을 넣고 그 판의 save() 로 쓴다 */
  const made = await page.evaluate(function () {
    var S = APP.state;
    var lay = APP.scene.layout ? APP.scene.layout() : {};
    var ids = Object.keys(lay);
    if (ids[0]) { lay[ids[0]] = [+(lay[ids[0]][0] + 0.2).toFixed(3), lay[ids[0]][1], 15, 0.85]; }
    if (ids[1]) { lay[ids[1]] = [lay[ids[1]][0], +(lay[ids[1]][1] - 0.1).toFixed(3), 345, 1.15]; }
    var lay2 = {}; ids.slice(0, 2).forEach(function (k) { lay2[k] = lay[k]; });
    S.room.layout = lay2;
    if (APP.scene.setLayout) APP.scene.setLayout(lay2);
    S.user = S.user || {};
    S.user.shells = 47; S.user.seeds = 2; S.user.dyes = { red: 2, blue: 1, pink: 3 }; S.user.dye = '#4a86d8';
    S.user.garden = [{ color: 'red', water: 2, wateredDay: '2026-11-13' }, { color: 'yellow', water: 1, wateredDay: '2026-11-14' }, { color: 'purple', water: 0, wateredDay: null }];
    /* 옛 힌트 (11-10 전): 첫 산책에 힌트를 적고 날짜를 11-08 로 */
    var t = S.trips[0];
    t.hint = { raw: '모자의 역사', match: { kind: 'node', id: 'hat' }, followed: 'followed', note: '지금은 바깥 글을 못 읽어서 힌트 쪽엔 못 갔어' };
    (t.events || []).forEach(function (e) { if (e.type === 'depart') e.hint = '모자의 역사'; });
    APP.save();
    return { layout: lay2, ids: ids, user: S.user, trips: S.trips.length };
  });
  note('made', made);
  /* runner-1 최고 (배포판의 달리기 저장 그대로 모양) */
  await page.evaluate(function () { var k = 'ppolppol_runner', o = JSON.parse(localStorage.getItem(k) || 'null') || { v: 1, best: 0, runs: 0, day: '', dayN: 0, last: null }; o.best = 340; o.runs = 12; localStorage.setItem(k, JSON.stringify(o)); });
  /* 배포판에서 한 번 다시 열어 그 판이 쓴 기록을 받는다 (그 판이 정돈한 진짜 모양) */
  await page.reload(); await page.waitForSelector('#btn-go:not(.away)'); await page.waitForTimeout(800);
  const prod = await page.evaluate(function () { var o = {}; for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (/^ppolppol/.test(k)) o[k] = localStorage.getItem(k); } return o; });
  note('prodKeys', Object.keys(prod));
  note('oldErrors', log.errors);
  L.fs.writeFileSync(L.path.join(L.OUT, 'prod-save.json'), JSON.stringify(prod, null, 1));
  await ctx.close();

  /* 3. 합친 판에서 연다 (같은 열쇠들 그대로) */
  ({ ctx, page, log } = await L.open(b, { rec: null, raw: prod }));
  await page.waitForTimeout(1500);
  const after = await page.evaluate(function () { var o = {}; for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (/^ppolppol/.test(k)) o[k] = localStorage.getItem(k); } return o; });
  const A = JSON.parse(prod.ppolppol_v2), B = JSON.parse(after.ppolppol_v2);
  /* 깊은 비교: 배포판에 있던 값이 다 그대로인가 (새 열쇠는 덧붙여도 된다) */
  const diffs = [];
  (function walk(a, bb, p) {
    if (a === null || typeof a !== 'object') { if (JSON.stringify(a) !== JSON.stringify(bb)) diffs.push(p + ': ' + JSON.stringify(a) + ' -> ' + JSON.stringify(bb)); return; }
    if (bb === null || typeof bb !== 'object') { diffs.push(p + ': ' + JSON.stringify(a).slice(0, 80) + ' -> ' + JSON.stringify(bb)); return; }
    if (Array.isArray(a)) { if (!Array.isArray(bb)) { diffs.push(p + ': array -> ' + typeof bb); return; } if (bb.length < a.length) diffs.push(p + ': length ' + a.length + ' -> ' + bb.length); a.forEach(function (x, i) { walk(x, bb[i], p + '[' + i + ']'); }); if (bb.length > a.length) diffs.push(p + ': +' + (bb.length - a.length) + ' (' + JSON.stringify(bb.slice(a.length)) + ')'); return; }
    Object.keys(a).forEach(function (k) { if (!(k in bb)) diffs.push(p + '.' + k + ': removed'); else walk(a[k], bb[k], p + '.' + k); });
  })(A, B, '$');
  const added = []; (function add(a, bb, p) { if (!a || !bb || typeof a !== 'object' || typeof bb !== 'object' || Array.isArray(bb)) return; Object.keys(bb).forEach(function (k) { if (!(k in a)) added.push(p + '.' + k + '=' + JSON.stringify(bb[k]).slice(0, 60)); else add(a[k], bb[k], p + '.' + k); }); })(A, B, '$');
  note('v2diffs', diffs);
  note('v2added', added);
  Object.keys(prod).filter(k => k !== 'ppolppol_v2').forEach(k => { if (prod[k] !== after[k]) note('changed:' + k, { before: prod[k], after: after[k] }); });
  /* 보이는 것: 가구 자리 · 텃밭 · 달리기 예전 최고 · 살림 */
  const seen = await page.evaluate(function () {
    var r = { layout: APP.scene.layout ? APP.scene.layout() : null, saved: APP.state.room.layout, garden: APP.state.user.garden, dyes: APP.state.user.dyes, shells: APP.state.user.shells, dye: APP.state.user.dye };
    return r;
  });
  note('seen', seen);
  const layOK = Object.keys(A.room.layout || {}).map(function (id) { var a = A.room.layout[id], s = seen.layout && seen.layout[id]; return id + ': saved ' + JSON.stringify(a) + ' scene ' + JSON.stringify(s); });
  note('layoutCompare', layOK);
  /* 가구 모드를 열고 아무것도 안 하고 저장 → 저장값 그대로? */
  const fm = await page.evaluate(async function () { var b = document.getElementById('btn-furn') || document.querySelector('[id*=furn]'); return b ? b.id : null; });
  note('furnBtn', fm);
  L.fs.writeFileSync(L.path.join(L.OUT, 'save-after-load.json'), JSON.stringify(after, null, 1));
  note('newErrors', log.errors);
  note('audioReq', log.audio);
  await L.shot(page, 'save-loaded-attic');
  await b.close();
  L.fs.writeFileSync(L.path.join(L.OUT, 'save-compat.out.json'), JSON.stringify(out, null, 1));
})().catch(e => { console.error('FAIL', e); process.exit(1); });
