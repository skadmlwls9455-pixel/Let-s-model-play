/* wip/round7/r5/R/hit-frames.js — 부딪히는 순간 (달리기, 360x740@2) 전후. NODE_PATH=$(npm root -g) node wip/round7/r5/R/hit-frames.js <root> <tag>
   시계를 프레임마다 한 틱으로 묶고 (느린 기계에서도 같은 판) 같은 날짜 · 같은 판 번호 (같은 시드) 로 두 경우를 돈다:
   crate = 아무것도 안 누름 → 첫 상자 · web = 상자는 넘고 거미줄에서 안 숙이는 조종 (실제로는 둘 다 촛대를 뛰어넘다 내려오며 닿았다 → before-/after-candle-air). 그 판이 끝난 틱의 캔버스를 그대로 (k 배, 기기 px) 잘라 저장 */
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const ROOT = path.resolve(process.argv[2] || '.'), TAG = process.argv[3] || 'after', OUT = path.resolve(__dirname);
const REC = JSON.stringify({ v: 2, octopus: { name: '뚜루', born: '2026-11-06T10:00:00.000Z', trips: 0, invites: 3, days: ['2026-11-06'], affinity: {}, visits: {}, state: 'idle', color: '#e8463c', colors: [{ at: '2026-11-06T10:00:00.000Z', date: '2026-11-06', color: '#e8463c', how: 'first', by: 'player' }] }, room: { lantern: 3, souvenirs: [], posterOrder: [] }, trips: [], notes: {}, curiosityNotes: [], salon: { asks: [] }, settings: { motion: 'auto', thumbs: true, lastSeen: 1762650000000, octColor: '#e8463c', flipped: false, pixelFont: true, albumSeen: 0 } });
async function one(br, mode) {
  const ctx = await br.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, locale: 'ko-KR' });
  await ctx.addInitScript({ content: "window.__ppolAwakeMs = 0; window.__ppolTest = { today: '2026-11-04' }; window.__ppolRunner = { hour: 12, month: 11 }; if (!localStorage.getItem('ppolppol_v2')) localStorage.setItem('ppolppol_v2', " + JSON.stringify(REC) + ");" });
  const p = await ctx.newPage();
  await p.goto('file://' + path.join(ROOT, 'index.html') + '?dev=0&intro=0');
  await p.waitForFunction(() => window.APP && APP.scene && !APP.goResting, null, { timeout: 60000 });
  await p.evaluate(() => APP.goRoom('play')); await p.waitForTimeout(1500);
  await p.evaluate(() => APP.openMachine()); await p.waitForSelector('#runner-dlg[open]'); await p.waitForTimeout(500);
  await p.evaluate((mode) => {
    const cv = document.getElementById('rn-cv'); let holdTo = -1, fake = performance.now(), prev = null; window.__shot = null;
    const key = (t, k) => cv.dispatchEvent(new KeyboardEvent(t, { key: k, bubbles: true, cancelable: true }));
    const grab = () => { const L = RUNNER.live(), v = L.view, k = Math.round(v.css * devicePixelRatio), sw = 80, sh = 52, c = document.createElement('canvas'); c.width = sw * k; c.height = sh * k; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(cv, 0, v.G - 44, sw, sh, 0, 0, sw * k, sh * k); return { url: c.toDataURL(), t: L.ticks, hit: (L.obs.filter(o => o.k !== 'moss' && o.x < 60)[0] || {}).k, y: L.y }; };
    function pilot() {
      const L = RUNNER.live(); if (!L || L.state !== 'run' || mode !== 'web') return;
      const X = RUNNER.C.OCT_X + RUNNER.C.OCT_W; let near = null;
      L.obs.forEach(o => { if (o.k !== 'moss' && o.x + o.w > RUNNER.C.OCT_X && (!near || o.x < near.x)) near = o; });
      if (holdTo >= 0 && L.ticks >= holdTo) { key('keyup', ' '); holdTo = -1; }
      if (!near || holdTo >= 0 || near.k === 'web') return;
      const d = near.x - X, hold = { crate: 2, candle: 6, books: 19, crate2: 19, rain: 19 }[near.k] || 8;
      if (L.ground && d < 4 && d > -10) { key('keydown', ' '); holdTo = L.ticks + hold; }
    }
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = function (cb) { return raf(function () { const L = RUNNER.live(); if (L && L.state === 'over' && !window.__shot) window.__shot = grab(); pilot(); fake += 1000 / 60; cb(fake); }); };
    key('keydown', ' '); key('keyup', ' ');
  }, mode);
  await p.waitForFunction(() => !!window.__shot, null, { timeout: 900000, polling: 500 });
  const s = await p.evaluate(() => window.__shot);
  const f = path.join(OUT, TAG + '-' + mode + '-360x740@2.png'); fs.writeFileSync(f, Buffer.from(s.url.split(',')[1], 'base64'));
  console.log(TAG, mode, 'tick', s.t, 'hit', s.hit, 'y', s.y, '→', path.basename(f));
  await ctx.close();
}
(async () => { const br = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] }); try { for (const m of ['crate', 'web']) await one(br, m); } finally { await br.close(); } })();
