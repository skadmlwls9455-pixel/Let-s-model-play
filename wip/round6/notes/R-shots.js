/* wip/round6/notes/R-shots.js — 레인 R 보고서 그림 (wip/round6/shots/R/). NODE_PATH=$(npm root -g) node wip/round6/notes/R-shots.js
   1 달리기 상태 띠 (준비 · 달리기 · 점프 · 숙이기 · 부딪힘) 360x740@2 — 캔버스를 그 순간 그대로 읽어 화면 배율 k 로 (기기 px 그대로)
   2 달리기 412x915@2.625 · 3 로딩 t 0 / 0.5 / 1.0 s (app.js 붙잡음) 360x740@2 · 4 같은 것 1280x800@1 · 5·6 진짜 부팅 (아무것도 안 붙잡음, CDP 화면 흐름 100 ms 마다) */
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../..'), OUT = path.join(ROOT, 'wip/round6/shots/R'), URL = 'file://' + path.join(ROOT, 'index.html') + '?dev=0&intro=0';
fs.mkdirSync(OUT, { recursive: true });
const REC = JSON.stringify({ v: 2, octopus: { name: '뚜루', born: '2026-11-06T10:00:00.000Z', trips: 0, invites: 3, days: ['2026-11-06', '2026-11-07', '2026-11-08'], affinity: {}, visits: {}, state: 'idle', color: '#e8463c', colors: [{ at: '2026-11-06T10:00:00.000Z', date: '2026-11-06', color: '#e8463c', how: 'first', by: 'player' }] }, room: { lantern: 3, souvenirs: [], posterOrder: [] }, trips: [], notes: {}, curiosityNotes: [], salon: { asks: [] }, settings: { motion: 'auto', thumbs: true, lastSeen: 1762650000000, octColor: '#e8463c', flipped: false, pixelFont: true, albumSeen: 0 } });
async function compose(page, parts, file, gap) {   /* parts = [{ url, w, h }] → 가로로 이어 붙인 PNG (확대 없음) */
  const url = await page.evaluate(async ({ parts, gap }) => {
    const ims = await Promise.all(parts.map(p => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = p; })));
    const W = ims.reduce((a, i) => a + i.width + gap, -gap), H = Math.max(...ims.map(i => i.height));
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H);
    let o = 0; ims.forEach(i => { x.drawImage(i, o, 0); o += i.width + gap; }); return c.toDataURL('image/png');
  }, { parts, gap: gap || 8 });
  fs.writeFileSync(path.join(OUT, file), Buffer.from(url.split(',')[1], 'base64'));
}
async function runner(br, w, h, dpr, file, states) {
  const ctx = await br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, locale: 'ko-KR' });
  await ctx.addInitScript({ content: "window.__ppolAwakeMs = 0; if (!localStorage.getItem('ppolppol_v2')) localStorage.setItem('ppolppol_v2', " + JSON.stringify(REC) + ");" });
  const page = await ctx.newPage(); page.on('pageerror', e => console.log('ERR', e.message));
  console.log('goto', file); await page.goto(URL); await page.waitForFunction(() => window.APP && APP.scene && !APP.goResting, null, { timeout: 30000 }); console.log('booted');
  await page.evaluate(() => APP.goRoom('play')); await page.waitForTimeout(1500);
  await page.evaluate(() => APP.openMachine()); await page.waitForSelector('#runner-dlg[open]'); await page.waitForTimeout(500); console.log('runner open');
  const shots = await page.evaluate(async (want) => {
    const cv = document.getElementById('rn-cv'), L = () => RUNNER.live(), k = L().view.k, out = {};
    const key = (t, k2) => cv.dispatchEvent(new KeyboardEvent(t, { key: k2, bubbles: true, cancelable: true }));
    const frame = () => new Promise(r => setTimeout(r, 50));
    function grab(name) {   /* 문어 둘레 64×56 아트 px 를 k 배 (기기 px 그대로) */
      const v = L().view, sx = 0, sy = Math.max(0, v.G - 50), sw = 64, sh = 56, c = document.createElement('canvas'); c.width = sw * k; c.height = sh * k;
      const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(cv, sx, sy, sw, sh, 0, 0, sw * k, sh * k); out[name] = c.toDataURL();
    }
    const until = async (f, ms) => { const t0 = performance.now(); while (!f() && performance.now() - t0 < (ms || 8000)) await new Promise(r => setTimeout(r, 4)); };
    if (want.includes('ready')) { await frame(); grab('ready'); }
    key('keydown', ' '); await frame(); key('keyup', ' ');
    await until(() => L().ground && L().ticks > 40);
    if (want.includes('run')) { await until(() => L().ground && Math.floor(L().ticks / 5) % 4 === 1); grab('run'); }
    if (want.includes('jump')) { key('keydown', ' '); await until(() => L().y > 256 * 14); grab('jump'); key('keyup', ' '); await until(() => L().ground); }
    if (want.includes('duck')) { key('keydown', 'ArrowDown'); await frame(); await frame(); grab('duck'); key('keyup', 'ArrowDown'); }
    if (want.includes('hit')) { await until(() => L().state === 'over', 30000); await frame(); grab('hit'); }
    return out;
  }, states);
  await compose(page, states.filter(s => shots[s]).map(s => shots[s]), file, 8 * dpr);
  console.log(file, Object.keys(shots).join(' '));
  await ctx.close();
}
async function bootStrip(br, w, h, dpr, file) {
  const ctx = await br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, locale: 'ko-KR' });
  const page = await ctx.newPage(); await page.route(/\/js\/app\.js$/, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto(URL); await page.waitForSelector('#boot .boot-oct'); await page.waitForTimeout(300);
  const parts = [];
  for (const t of [0, 500, 1000]) {
    await page.evaluate(t => { const a = document.querySelector('#boot .boot-oct').getAnimations(); a.forEach(x => { x.pause(); x.currentTime = t; }); }, t);
    const y = await page.evaluate(() => document.querySelector('#boot .boot-oct').getBoundingClientRect().top);
    const b = await page.screenshot({ clip: { x: 0, y: Math.max(0, y - 12), width: w, height: Math.min(h, 39 * Math.max(Math.round(2 * dpr), Math.floor(Math.min(w, h) * dpr / 200)) / dpr + 24) } });
    parts.push('data:image/png;base64,' + b.toString('base64'));
  }
  const pg2 = await ctx.newPage(); await compose(pg2, parts, file, 0);   /* 세로로 쌓는 게 읽기 쉽지만 간단히 가로 */
  console.log(file); await ctx.close();
}
async function realBoot(br, w, h, dpr, file) {   /* CDP 화면 흐름: 그려진 프레임마다 받아 100 ms 간격으로 골라 축소 띠 */
  const ctx = await br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, locale: 'ko-KR' });
  await ctx.addInitScript({ content: 'window.__ppolAwakeMs = 0;' });
  const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page); const frames = [];
  cdp.on('Page.screencastFrame', async f => { frames.push({ t: f.metadata.timestamp, d: f.data }); try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch (e) {} });
  await cdp.send('Page.startScreencast', { format: 'png', maxWidth: Math.round(w / 4), maxHeight: Math.round(h / 4), everyNthFrame: 1 });
  await page.goto(URL);
  await page.waitForFunction(() => { const b = document.getElementById('boot'); return b && getComputedStyle(b).display === 'none'; }, null, { timeout: 30000 });
  await page.waitForTimeout(300); await cdp.send('Page.stopScreencast');
  const t0 = frames.length ? frames[0].t : 0, pick = []; let next = 0;
  frames.forEach(f => { const ms = (f.t - t0) * 1000; if (ms >= next) { pick.push(f); next = ms + 100; } });
  const pg2 = await ctx.newPage(); await compose(pg2, pick.slice(0, 40).map(f => 'data:image/png;base64,' + f.d), file, 2);
  console.log(file, frames.length + ' frames, ' + pick.length + ' picked, span ' + Math.round(((frames[frames.length - 1] || { t: t0 }).t - t0) * 1000) + ' ms');
  await ctx.close();
}
(async () => {
  const br = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  try {
    if (process.env.RUNNER_SHOTS) { await runner(br, 360, 740, 2, '1-runner-states-360x740@2.png', ['ready', 'run', 'jump', 'duck', 'hit']); await runner(br, 412, 915, 2.625, '2-runner-run-412x915@2.625.png', ['run']); }   /* 이 컨테이너에선 멈춰서 기본은 건너뜀 — 달리기 화면은 스모크 R 의 tests/evidence 그림 */
    await bootStrip(br, 360, 740, 2, '3-boot-t0-05-10-360x740@2.png');
    await bootStrip(br, 1280, 800, 1, '4-boot-t0-05-10-1280x800@1.png');
    await realBoot(br, 1280, 800, 1, '5-real-boot-1280x800@1.png');
    await realBoot(br, 360, 740, 2, '6-real-boot-360x740@2.png');
  } finally { await br.close(); }
})();
