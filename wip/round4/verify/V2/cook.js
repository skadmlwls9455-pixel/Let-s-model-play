/* 놀이방 조리대 → 부엌 덮개 → 닫기 · 다시 열기 · 돌린 뒤 · 소리 요청 · 주간 할 일 'kitchen' */
const V = require('./vlib.js');
(async () => {
  const b = await V.launch();
  const W = +(process.argv[2] || 360), H = +(process.argv[3] || 740);
  const rec = V.REC(5, null);
  const ctxAudio = "window.__ac=0; (function(){ var A=window.AudioContext; if(A){ window.AudioContext=function(){ window.__ac++; return new A(); }; } var B=window.webkitAudioContext; if(B){ window.webkitAudioContext=function(){ window.__ac++; return new B(); }; } })();";
  const { ctx, page } = await (async () => {
    const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, locale: 'ko-KR', hasTouch: true, isMobile: true });
    await ctx.addInitScript({ content: 'window.__ppolAwakeMs = 0;' + ctxAudio });
    const page = await ctx.newPage();
    await page.addInitScript({ content: "if (!localStorage.getItem('__seed')) { localStorage.setItem('__seed','1'); localStorage.setItem('ppolppol_v2', " + JSON.stringify(JSON.stringify(rec)) + "); } window.__ppolTest = { today: '2026-11-14' };" });
    return { ctx, page };
  })();
  const reqs = []; ctx.on('request', r => { const u = r.url(); if (/\/(audio|foley)\//.test(u) || /\.(ogg|mp3|wav|m4a)(\?|$)/.test(u)) reqs.push(u); });
  const errs = []; page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push('PE ' + e.message));
  await page.goto('file://' + V.ROOT + '/index.html?intro=0');
  await page.waitForSelector('#btn-go:not(.away)'); await V.idle(page); await page.waitForTimeout(3200);
  const wk0 = await page.evaluate(() => JSON.stringify((APP.state.user && APP.state.user.week) || APP.state.week || null));
  await page.evaluate(() => APP.goRoom('play'));
  await page.waitForFunction(() => { const e = document.getElementById('btn-cook'); return e && !e.hidden && e.getBoundingClientRect().width > 0; }, null, { timeout: 15000 });
  await page.waitForTimeout(900);
  const wk1 = await page.evaluate(() => JSON.stringify((APP.state.user && APP.state.user.week) || APP.state.week || null));
  console.log('week before', wk0, '\nweek after play', wk1);
  const st = () => page.evaluate(() => { const o = document.getElementById('cook-overlay'); const f = o && o.querySelector('iframe'); let inner = null;
    try { const d = f && f.contentDocument; const dl = d && d.getElementById('cook-dlg'); inner = { dlgOpen: !!(dl && dl.open), embed: d.documentElement.className, door: d.getElementById('ck-door') && getComputedStyle(d.getElementById('ck-door')).display }; } catch (e) { inner = 'x ' + e.message; }
    return { ov: !!(o && o.open), room: APP.room, inner, focus: document.activeElement && document.activeElement.id, ac: window.__ac }; });
  let r = await V.tapEl(page, '#btn-cook'); console.log('counter rect', JSON.stringify(r));
  await page.waitForTimeout(2500); console.log('after tap', JSON.stringify(await st()));
  await V.shot(page, 'cook-' + W + '-open.png');
  // 부엌 안 닫기 (진짜 손가락)
  const fr = page.frames().find(f => /cook\.html/.test(f.url()));
  if (fr) {
    const cr = await fr.evaluate(() => { const q = document.querySelector('.ck-close').getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height }; });
    console.log('kitchen close rect', JSON.stringify(cr));
    // 냄비 한 번 만지기: 첫 소품 톡
    const pr = await fr.evaluate(() => [...document.querySelectorAll('.ck-prop')].map(b => { const q = b.getBoundingClientRect(); return { s: b.dataset.spot, x: q.x, y: q.y, w: q.width, h: q.height }; }));
    console.log('props', JSON.stringify(pr));
    if (pr[0]) { await V.tap(page, pr[0].x + pr[0].w / 2, pr[0].y + pr[0].h / 2); await page.waitForTimeout(1500); await V.shot(page, 'cook-' + W + '-prop.png'); console.log('after prop tap', JSON.stringify(await st())); }
    const cr2 = await fr.evaluate(() => { const q = document.querySelector('.ck-close').getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height, t: document.querySelector('.ck-close').textContent }; });
    await V.tap(page, cr2.x + cr2.w / 2, cr2.y + cr2.h / 2); await page.waitForTimeout(1200);
    console.log('after close tap (' + cr2.t + ')', JSON.stringify(await st()));
    // 한 번 더 닫기 (돌아가기였다면)
    const s2 = await st(); if (s2.ov) { const c3 = await fr.evaluate(() => { const q = document.querySelector('.ck-close').getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height, t: document.querySelector('.ck-close').textContent }; }); await V.tap(page, c3.x + c3.w / 2, c3.y + c3.h / 2); await page.waitForTimeout(1200); console.log('second close (' + c3.t + ')', JSON.stringify(await st())); }
  }
  await V.shot(page, 'cook-' + W + '-back.png');
  await V.idle(page); await page.waitForTimeout(700);
  // 다시 열기 → Esc
  await V.tapEl(page, '#btn-cook'); await page.waitForTimeout(1500); console.log('reopen', JSON.stringify(await st()));
  await page.keyboard.press('Escape'); await page.waitForTimeout(800); console.log('after Esc', JSON.stringify(await st()));
  // 돌린 뒤 조리대
  await V.idle(page); await page.waitForTimeout(700);
  for (const a of [90, 180]) {
    await V.twist(page, W / 2, H * 0.45, 70, 0, 90, 20); await page.waitForTimeout(1200);
    r = await V.rect(page, '#btn-cook');
    if (r && r.w && !r.hidden) { await V.tap(page, r.x + r.w / 2, r.y + r.h / 2); await page.waitForTimeout(1500); const s = await st(); console.log('turn', a, JSON.stringify(r), JSON.stringify(s)); if (s.ov) { await page.keyboard.press('Escape'); await page.waitForTimeout(800); } }
    else console.log('turn', a, 'counter hidden', JSON.stringify(r));
    await V.shot(page, 'cook-' + W + '-turn' + a + '.png');
    await V.idle(page); await page.waitForTimeout(700);
  }
  const ls = await page.evaluate(() => Object.keys(localStorage));
  console.log('localStorage keys', ls.join(','));
  console.log('audio requests', reqs.length, reqs.slice(0, 3), 'AudioContext', await page.evaluate(() => window.__ac));
  console.log('errors', errs.length, errs.slice(0, 5));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
