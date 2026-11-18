/* wip/round6/notes/R-duck.js — 숙인 문어가 거미줄 아래를 지나는 순간 (실제 판 · 자동 조종) 을 캔버스 그대로 k 배로. NODE_PATH=$(npm root -g) node wip/round6/notes/R-duck.js */
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../..'), OUT = path.join(ROOT, 'wip/round6/shots/R');
const REC = JSON.stringify({ v: 2, octopus: { name: '뚜루', born: '2026-11-06T10:00:00.000Z', trips: 0, invites: 3, days: ['2026-11-06'], affinity: {}, visits: {}, state: 'idle', color: '#e8463c', colors: [{ at: '2026-11-06T10:00:00.000Z', date: '2026-11-06', color: '#e8463c', how: 'first', by: 'player' }] }, room: { lantern: 3, souvenirs: [], posterOrder: [] }, trips: [], notes: {}, curiosityNotes: [], salon: { asks: [] }, settings: { motion: 'auto', thumbs: true, lastSeen: 1762650000000, octColor: '#e8463c', flipped: false, pixelFont: true, albumSeen: 0 } });
async function one(br, w, h, dpr) {
  const ctx = await br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, locale: 'ko-KR' });
  await ctx.addInitScript({ content: "window.__ppolAwakeMs = 0; if (!localStorage.getItem('ppolppol_v2')) localStorage.setItem('ppolppol_v2', " + JSON.stringify(REC) + ");" });
  const p2 = await ctx.newPage(); await p2.goto('file://' + path.join(ROOT, 'index.html') + '?dev=0&intro=0');
  await p2.waitForFunction(() => window.APP && APP.scene && !APP.goResting, null, { timeout: 60000 });
  await p2.evaluate(() => APP.goRoom('play')); await p2.waitForTimeout(1500);
  await p2.evaluate(() => APP.openMachine()); await p2.waitForSelector('#runner-dlg[open]'); await p2.waitForTimeout(500);
  await p2.evaluate(() => {   /* 프레임마다 정확히 한 틱 (가짜 시계) + 그 틱마다 조종 — 느린 기계에서도 같은 판 */
    const cv = document.getElementById('rn-cv'); let ducking = false, holdTo = -1, fake = performance.now(); window.__duck = null;
    const key = (t, k) => cv.dispatchEvent(new KeyboardEvent(t, { key: k, bubbles: true, cancelable: true }));
    const raf = window.requestAnimationFrame.bind(window);
    function pilot() {
      const L = RUNNER.live(); if (!L) return;
      if (L.state === 'ready' || L.state === 'over') { if (L.state === 'over') document.getElementById('rn-again').click(); else { key('keydown', ' '); key('keyup', ' '); } ducking = false; holdTo = -1; return; }
      if (L.state !== 'run') return;
      const X = RUNNER.C.OCT_X + RUNNER.C.OCT_W; let near = null;
      L.obs.forEach(o => { if (o.k !== 'moss' && o.x + o.w > RUNNER.C.OCT_X && (!near || o.x < near.x)) near = o; });
      if (near && near.k === 'web' && ducking && L.duck && !window.__duck && near.x <= RUNNER.C.OCT_X + 2 && near.x + near.w >= RUNNER.C.OCT_X + 12) window.__duckNext = true;
      if (holdTo >= 0 && L.ticks >= holdTo) { key('keyup', ' '); holdTo = -1; }
      if (ducking && (!near || near.k !== 'web')) { key('keyup', 'ArrowDown'); ducking = false; }
      if (!near || holdTo >= 0) return;
      const d = near.x - X;
      if (near.k === 'web') { if (d < 8 && !ducking) { key('keydown', 'ArrowDown'); ducking = true; } return; }
      const hold = { crate: 4, candle: 12, books: 13, crate2: 13, rain: 14 }[near.k] || 8, lead = { candle: 6, crate: 8, rain: 7 }[near.k] || 9;
      if (L.ground && d < lead && d > -4) { key('keydown', ' '); holdTo = L.ticks + hold; }
    }
    window.requestAnimationFrame = function (cb) { return raf(function () {
      if (window.__duckNext && !window.__duck) { window.__duckNext = false; const v = RUNNER.live().view, k = Math.round(v.css * devicePixelRatio), sw = 72, sh = 44, c = document.createElement('canvas'); c.width = sw * k; c.height = sh * k; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(cv, 0, v.G - 36, sw, sh, 0, 0, sw * k, sh * k); window.__duck = c.toDataURL(); }
      pilot(); fake += 1000 / 60; cb(fake); }); };
  });
  await p2.evaluate(() => { const cv = document.getElementById('rn-cv'); cv.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true })); cv.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true })); });
  for (let i = 0; i < 400; i++) {
    const st = await p2.evaluate(() => ({ got: !!window.__duck, t: RUNNER.live().ticks, s: RUNNER.live().state }));
    if (st.got) break;
    if (i % 20 === 0) console.log(' ', w, st.s, st.t);
    await p2.waitForTimeout(1000);
  }
  const url = await p2.evaluate(() => window.__duck);
  const name = 'duck-under-web-' + w + 'x' + h + '@' + dpr + '.png';
  if (url) fs.writeFileSync(path.join('/tmp/claude-0/sp', name), Buffer.from(url.split(',')[1], 'base64'));
  console.log(name, url ? 'ok' : 'none');
  await ctx.close();
}
(async () => { const br = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] }); try { await one(br, 360, 740, 2); await one(br, 412, 915, 2.625); } finally { await br.close(); } })();
