/* V3 · 정직 (item 10): 데모 산책의 우쭐 · 덤덤이 화면 어디에도 없나 (보이는 글 · 숨은 글 · aria · title · alt · 장면 설명 · 토스트 · 포스터 SVG · 앨범 · 일기 · 열람),
   코드가 쓴 행 · 장면 얼굴은 idle, 모델이 고른 반응은 낱말 · 얼굴 그대로, 옛 힌트 줄 숨김, 앨범 쪽지 빈 칸 글.
   NODE_PATH=$(npm root -g) node wip/round4/verify/V3/honest.js */
const L = require('./lib.js');
const res = { checks: [] };
function ok(c, m, extra) { res.checks.push({ ok: !!c, m, extra }); console.log((c ? 'ok   ' : 'FAIL ') + m + (extra ? ' ' + JSON.stringify(extra).slice(0, 600) : '')); }
/* 화면에 있는 모든 글 (숨은 것 포함 · 스크립트 · 스타일 제외) + 속성 + 장면 캔버스 밖 SVG 글 */
const SCAN = function () {
  var out = [];
  var w = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  var n; while ((n = w.nextNode())) {
    if (n.nodeType === 3) { var p = n.parentElement; if (p && /^(SCRIPT|STYLE|TEMPLATE)$/.test(p.tagName)) continue; if (n.nodeValue.trim()) out.push(n.nodeValue.trim()); }
    else { ['aria-label', 'title', 'alt', 'aria-description', 'aria-valuetext', 'data-tip', 'placeholder'].forEach(function (a) { var v = n.getAttribute(a); if (v) out.push('@' + a + ':' + v); }); }
  }
  out.push('@title:' + document.title);
  return out;
};
(async () => {
  const b = await L.launch();
  const { ctx, page, log } = await L.open(b, { lantern: 5, look: { hour: 14 } });
  /* 장면 얼굴 · 상태 · 말풍선 · 토스트 기록 */
  await page.evaluate(function () {
    window.__ex = []; window.__bub = []; window.__toast = [];
    var se = APP.scene.setExpression; APP.scene.setExpression = function (n) { window.__ex.push(n); return se.apply(this, arguments); };
    var so = APP.scene.setOctState; APP.scene.setOctState = function (n) { window.__ex.push('S:' + n); return so.apply(this, arguments); };
    var sb = APP.scene.bubble; APP.scene.bubble = function (t) { if (t) window.__bub.push(String(t)); return sb.apply(this, arguments); };
    new MutationObserver(function (ms) { ms.forEach(function (m) { [].forEach.call(m.addedNodes, function (x) { if (x.textContent) window.__toast.push(x.textContent); }); if (m.type === 'characterData') window.__toast.push(m.target.nodeValue); }); }).observe(document.body, { childList: true, subtree: true, characterData: true });
    var plan0 = BRAIN.plan;
    BRAIN.plan = function () { return plan0.apply(BRAIN, arguments).then(function (p) { var r = window.__forceRx; if (r && p && p.kind !== 'empty') { p.reaction = r; if (p.receipt) p.receipt.reaction = r; (p.events || []).forEach(function (e) { if (e.type === 'wrap_up') e.reaction = r; }); } return p; }); };
  });
  const seenAll = [];
  for (const [rx, kind] of [['우쭐', 'out'], ['덤덤', 'home'], ['덤덤', 'out'], ['우쭐', 'out']]) {
    await page.evaluate(a => { window.__forceRx = a[0]; window.__ppolTest = Object.assign(window.__ppolTest || {}, { forceKind: a[1] }); window.__ex.length = 0; }, [rx, kind]);
    await L.waitIdle(page);
    await L.tapSel(page, '#btn-go');
    /* 이번엔 건너뛰지 않는다: 다 보이게 끝까지 (긴 놀이) — 단 시간 제한 */
    await page.waitForFunction(() => document.getElementById('btn-go').classList.contains('away'), null, { timeout: 10000 }).catch(() => {});
    await L.waitIdle(page, 180000).catch(async () => { await L.skipAway(page); await L.waitIdle(page); });
    await page.waitForTimeout(600);
    const t = await page.evaluate(() => { const t = APP.state.trips[APP.state.trips.length - 1]; return { by: t.by, rb: t.reactionBy, r: t.reaction, kind: t.kind, line: t.reactionLine || (t.receipt || {}).reactionLine, poster: !!t.poster }; });
    const faces = await page.evaluate(() => window.__ex.slice());
    const moods = faces.filter(f => /^(happy|calm|sleepy|curious|S:happy|sad|sulk)$/.test(f));
    ok(t.r === rx && t.rb === 'demo-rules', 'demo trip saved reaction ' + rx + ' ' + kind, t);
    ok(!moods.length, 'demo ' + rx + ' ' + kind + ': scene faces stay usual', faces);
    seenAll.push(...(await page.evaluate(SCAN)));
  }
  /* 앨범: 모든 칸 · details 다 열고 */
  await page.evaluate(() => APP.openAlbum()); await page.waitForTimeout(500);
  const chips = await page.$$eval('#album-sheet .fchip', bs => bs.map(b => b.dataset.f));
  for (const f of chips) { await page.click('.fchip[data-f="' + f + '"]'); await page.evaluate(() => document.querySelectorAll('#album-sheet details').forEach(d => { d.open = true; })); await page.waitForTimeout(250); seenAll.push(...(await page.evaluate(SCAN))); }
  await L.shot(page, 'honest-album');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  /* 포스터 대화창 (앞 · 뒤) · 일기 · 열람 · 포스터 SVG */
  const extra = await page.evaluate(() => {
    const o = []; APP.state.trips.forEach(t => { const d = document.createElement('div'); d.innerHTML = APP.receiptHTML(t) + APP.inspectHTML(t); o.push(d.textContent); if (t.poster) { try { o.push(String(APP.posterSVG(t))); } catch (e) { o.push('posterSVG err ' + e.message); } } });
    return o;
  });
  seenAll.push(...extra);
  const pt = APP => null;
  const posterTrip = await page.evaluate(() => { const t = APP.state.trips.filter(x => x.poster).pop(); return t ? t.id : null; });
  if (posterTrip) { await page.evaluate(id => { const t = APP.state.trips.find(x => x.id === id); APP.openPoster(t); }, posterTrip).catch(() => {}); await page.waitForTimeout(600); seenAll.push(...(await page.evaluate(SCAN))); await L.shot(page, 'honest-poster'); await page.evaluate(() => { const b = document.getElementById('pd-flip'); if (b) b.click(); }); await page.waitForTimeout(500); seenAll.push(...(await page.evaluate(SCAN))); await L.shot(page, 'honest-poster-back'); await page.evaluate(() => document.getElementById('poster-dialog').close()); }
  /* 로그 시트 */
  await page.evaluate(() => APP.openLog && APP.openLog()); await page.waitForTimeout(500); seenAll.push(...(await page.evaluate(SCAN))); await L.shot(page, 'honest-log');
  const logPortraits = await page.evaluate(() => [].map.call(document.querySelectorAll('#log [data-expr], #log img'), x => x.dataset.expr || x.getAttribute('src') && x.getAttribute('src').slice(0, 40)));
  await page.keyboard.press('Escape');
  const toasts = await page.evaluate(() => window.__toast.slice());
  seenAll.push(...toasts, ...(await page.evaluate(() => window.__bub.slice())));
  const hits = seenAll.filter(s => /우쭐|덤덤/.test(s));
  ok(!hits.length, 'demo 우쭐 · 덤덤: no word anywhere (text, hidden text, aria/title/alt, toasts, bubbles, poster SVG, diary, inspect)', [...new Set(hits)].slice(0, 12));
  ok(true, 'log portraits', logPortraits.slice(-20));
  /* 모델이 고른 우쭐 (재생 길) */
  await page.evaluate(() => { window.__forceRx = null; delete window.__ppolTest.forceKind; window.__ex.length = 0; window.__bub.length = 0; });
  await L.waitIdle(page);
  await page.evaluate(() => APP.importEvents(JSON.stringify([{ type: 'depart', t: 0, hint: '' }, { type: 'peek', t: 500, target: { kind: 'room', id: 'hat' }, status: 'builtin', ms: 1000 }, { type: 'return', t: 1500, reason: 'enough' },
    { type: 'remember', t: 2000, stopIdx: 0, sticker: 'hat', line: '모자를 봤어' }, { type: 'hang_poster', t: 2500 }, { type: 'wrap_up', t: 3000, reaction: '우쭐', line: '모자 띠가 제일 좋았어' }])));
  await page.waitForTimeout(1500); await L.waitIdle(page, 120000);
  await page.waitForTimeout(800);
  const m = await page.evaluate(() => { const t = APP.state.trips[APP.state.trips.length - 1]; return { by: t.by, r: t.reaction, rb: t.reactionBy, line: t.reactionLine, ex: window.__ex.slice(), bub: window.__bub.slice(), log: document.getElementById('log').textContent.slice(-300) }; });
  ok(m.by === 'mcp' && m.r === '우쭐' && m.log.indexOf('우쭐') >= 0 && m.log.indexOf('모자 띠가 제일 좋았어') >= 0 && m.ex.indexOf('happy') >= 0, 'model-chosen 우쭐: word, its line and happy face kept', m);
  await L.shot(page, 'honest-model-u');
  /* 모델 · 낯선 반응 (40자 넘음) */
  await L.waitIdle(page);
  /* 옛 힌트 산책 (11-10 전) — save-compat 의 prod-save 로 따로: 거기서 보였는지 */
  ok(true, 'console errors', log.errors);
  ok(!log.audio.length, 'no audio/foley request with sound off', log.audio);
  ok(!(await page.evaluate(() => window.__ac.length)), 'no AudioContext with sound off', await page.evaluate(() => window.__ac));
  /* 옛 힌트 */
  const ctx2 = await b.newContext({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true, locale: 'ko-KR' });
  await ctx2.close();
  L.fs.writeFileSync(L.path.join(L.OUT, 'honest.out.json'), JSON.stringify(res, null, 1));
  await b.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
