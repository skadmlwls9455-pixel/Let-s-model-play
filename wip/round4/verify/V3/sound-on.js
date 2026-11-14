/* V3 · 소리를 켜 둔 기록 (http): 첫 손길 전엔 AudioContext · 재생이 없나 (로딩 · 첫 화면) · 진짜 손가락 쓰다듬기 6번 → pet_happy 없음 · 데모 산책 → mood_ 없음.
   python3 -m http.server 8765 를 저장소 뿌리에서 띄운 뒤: NODE_PATH=$(npm root -g) node wip/round4/verify/V3/sound-on.js */
const L = require('./lib.js');
const BASE = process.env.BASE || 'http://127.0.0.1:8765';
(async () => {
  const b = await L.launch();
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true, locale: 'ko-KR' });
  await ctx.addInitScript({ content: 'window.__ppolAwakeMs = 0;' });
  const reqs = [], errs = [];
  await ctx.addInitScript({ content: '(' + function () {
    window.__ac = []; var g = false; ['pointerdown', 'touchstart', 'keydown', 'click'].forEach(function (t) { addEventListener(t, function () { g = true; }, true); });
    var A = window.AudioContext; if (A) { var W = function () { window.__ac.push({ gesture: g, t: performance.now() }); return Reflect.construct(A, arguments, W); }; W.prototype = A.prototype; window.AudioContext = W; window.webkitAudioContext = W; }
  } + ')();' });
  const rec = L.REC(5, null, 14);
  await ctx.addInitScript({ content: "if (!localStorage.getItem('__seed')) { localStorage.setItem('__seed','1'); localStorage.setItem('ppolppol_v2', " + JSON.stringify(JSON.stringify(rec)) + "); localStorage.setItem('ppolppol_audio', '{\"on\":true,\"music\":0.8,\"sfx\":0.8}'); } window.__ppolTest = { today: '2026-11-14' }; window.__ppolLook = { hour: 14 };" });
  const page = await ctx.newPage();
  page.on('request', r => { const u = r.url(); if (/\/(audio|foley)\//.test(u)) reqs.push({ u: u.replace(/^.*?\/(audio|foley)\//, '$1/'), t: Date.now() }); });
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const t0 = Date.now();
  await page.goto(BASE + '/index.html?intro=0');
  await page.waitForSelector('#btn-go:not(.away)'); await page.waitForTimeout(2500);
  const pre = { ac: await page.evaluate(() => window.__ac.slice()), reqs: reqs.slice(), audio: await page.evaluate(() => window.AUDIO && AUDIO.state ? (s => ({ started: s.started, ctx: s.ctx, played: (s.played || []).length }))(AUDIO.state()) : null) };
  console.log('before gesture', JSON.stringify(pre));
  /* 문어 찾기 (pickAt oct) */
  console.log('state', await page.evaluate(() => APP.state.octopus.state)); const oct = await page.evaluate(() => { const hit = []; for (let y = 150; y < 700; y += 8) for (let x = 20; x < 340; x += 8) { const k = APP.scene.pickAt(x, y); if (k && k.kind === 'oct') hit.push([x, y]); } if (!hit.length) return null; const sx = hit.reduce((a, p) => a + p[0], 0) / hit.length, sy = hit.reduce((a, p) => a + p[1], 0) / hit.length; return [Math.round(sx), Math.round(sy) - 20]; });
  console.log('oct at', oct);
  /* 첫 손길: 문어를 톡 (소리가 깨는 손길) */
  await L.tap(page, oct[0], oct[1]); await page.waitForTimeout(1500);
  const n0 = reqs.length;
  /* 쓰다듬기 6번: 문어 위에서 좌우로 끌기 (진짜 손가락) */
  { const cdp = await ctx.newCDPSession(page); for (let i = 0; i < 6; i++) { const x0 = oct[0], y0 = oct[1] + 20; await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] }); for (let k = 1; k <= 4; k++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + k * 6, y: y0 + k }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(120); } await cdp.detach(); }
  await page.waitForTimeout(2500);
  const st = await page.evaluate(() => { const s = AUDIO.state(); return { started: s.started, ctx: s.ctx, played: (s.played || []).map(p => p.id) }; });
  const pets = st.played.filter(id => /^pet_/.test(id));
  console.log('after pets', JSON.stringify({ pets, happy: st.played.filter(id => /pet_happy/.test(id)), happyReq: reqs.filter(r => /pet_happy/.test(r.u)).length, ac: await page.evaluate(() => window.__ac) }));
  await L.shot(page, 'sound-on-pet');
  console.log('errors', JSON.stringify(errs.filter(e => !/wikipedia|ERR_FAILED|ERR_TUNNEL|ERR_NAME/.test(e))));
  await b.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
