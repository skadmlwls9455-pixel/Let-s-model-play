/* 달리기 (runner-2): 오락기 진짜 톡 → 화면 가득 · 단추 둘 · 다른 UI 없음 · 판 끝 '예전 게임 최고' · 다시 · 닫기. node runner.js W H [dpr] */
const V = require('./vlib.js');
const W = +(process.argv[2] || 360), H = +(process.argv[3] || 740), DPR = +(process.argv[4] || 2);
(async () => {
  const b = await V.launch();
  const rec = V.REC(5);
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, hasTouch: true, isMobile: true, locale: 'ko-KR' });
  await ctx.addInitScript({ content: "window.__ac=0; (function(){ var A=window.AudioContext; if(A){ window.AudioContext=function(){ window.__ac++; return new A(); }; } })();" });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const reqs = []; ctx.on('request', r => { if (/\/(audio|foley)\//.test(r.url())) reqs.push(r.url()); });
  await page.addInitScript({ content: "if(!localStorage.getItem('__seed')){localStorage.setItem('__seed','1'); localStorage.setItem('ppolppol_v2', " + JSON.stringify(JSON.stringify(rec)) + "); localStorage.setItem('ppolppol_runner', JSON.stringify({ v: 1, best: 345, runs: 7 }));} window.__ppolTest = { today: '2026-11-14' };" });
  await page.goto('file://' + V.ROOT + '/index.html?intro=0');
  await page.waitForSelector('#btn-go:not(.away)'); await V.idle(page); await page.waitForTimeout(3200);
  await page.evaluate(() => APP.goRoom('play'));
  await page.waitForFunction(() => { const e = document.getElementById('btn-machine'); return e && !e.hidden && e.getBoundingClientRect().width > 0; }, null, { timeout: 15000 });
  await page.waitForTimeout(900);
  await V.tapEl(page, '#btn-machine'); await page.waitForTimeout(2000);
  const layout = () => page.evaluate(() => {
    const d = document.querySelector('dialog[open]'); if (!d) return { open: false };
    const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
    const items = [...d.querySelectorAll('*')].filter(e => vis(e) && (e.children.length === 0 || e.tagName === 'BUTTON') && e.tagName !== 'svg' && !e.closest('svg') && !(e.tagName === 'BUTTON' && false)).map(e => { const r = e.getBoundingClientRect(); return (e.id || e.className || e.tagName) + '[' + Math.round(r.x) + ',' + Math.round(r.y) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + ']' + (e.textContent.trim() ? ' "' + e.textContent.trim().slice(0, 30) + '"' : ''); });
    const dr = d.getBoundingClientRect(); const live = window.RUNNER && RUNNER.live && RUNNER.live();
    return { open: true, id: d.id, cls: d.className, dlg: [Math.round(dr.x), Math.round(dr.y), Math.round(dr.width), Math.round(dr.height)], items, state: live && live.state, score: live && live.score, ground: live && live.view };
  });
  let L = await layout(); console.log('open', JSON.stringify(L, null, 0));
  await V.shot(page, 'run-' + W + 'x' + H + '-start.png');
  // 단추 크기 · 반투명
  const pads = await page.evaluate(() => ['rn-jump', 'rn-duck', 'rn-close'].map(id => { const e = document.getElementById(id) || document.querySelector('.' + id); if (!e) return id + ':none'; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return id + ' ' + Math.round(r.x) + ',' + Math.round(r.y) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' radius ' + cs.borderRadius + ' bg ' + cs.backgroundColor + ' op ' + cs.opacity; }));
  console.log(pads.join('\n'));
  // 빈 곳 톡 → 아무 일 없음
  await V.tap(page, W / 2, H * 0.4); await page.waitForTimeout(600); console.log('after empty tap state', (await layout()).state);
  // 점프 단추로 출발 → 그대로 두면 부딪힘
  await V.tapEl(page, '#rn-jump'); await page.waitForTimeout(400); console.log('after jump state', (await layout()).state);
  await page.waitForTimeout(1500); await V.shot(page, 'run-' + W + 'x' + H + '-mid.png');
  await page.waitForFunction(() => { const l = RUNNER.live(); return l && l.state !== 'run'; }, null, { timeout: 60000 }).catch(() => console.log('run did not end in 60s'));
  await page.waitForTimeout(1500);
  L = await layout(); console.log('end', JSON.stringify(L));
  await V.shot(page, 'run-' + W + 'x' + H + '-end.png');
  // 다시
  const again = await page.evaluate(() => { const bs = [...document.querySelectorAll('dialog[open] button')].filter(b => b.textContent.trim() === '다시'); if (!bs[0]) return null; const q = bs[0].getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height }; });
  if (again) { await V.tap(page, again.x + again.w / 2, again.y + again.h / 2); await page.waitForTimeout(800); console.log('after 다시', JSON.stringify((await layout()).state)); await V.shot(page, 'run-' + W + 'x' + H + '-again.png'); }
  else console.log('no 다시 button');
  // 닫기
  await V.tapEl(page, '#rn-close'); await page.waitForTimeout(1200);
  console.log('after close', JSON.stringify(await page.evaluate(() => ({ dlg: !!document.querySelector('dialog[open]'), room: APP.room, focus: document.activeElement && document.activeElement.id }))));
  console.log('runner store', await page.evaluate(() => localStorage.getItem('ppolppol_runner')));
  console.log('audio req', reqs.length, 'AudioContext', await page.evaluate(() => window.__ac), 'errors', errs.length, errs.slice(0, 4));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
