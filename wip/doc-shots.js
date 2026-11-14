// Re-take the ten doc captures (docs/shots/cook/) with a fake clock. usage: node doc-shots.js <repo root> <out dir>
// Same plan and names as cook-slice1/final/shots-retake.js + opening.js (11-08), timings adjusted for the 1 s pan hold.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const ROOT = path.resolve(process.argv[2]), OUT = path.resolve(process.argv[3]);
fs.mkdirSync(OUT, { recursive: true });
const URL = 'file://' + ROOT + '/cook.html?seed=12';
async function session(b, vp, plan) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.clock.install({ time: new Date('2026-11-10T10:00:00') });
  await page.goto(URL);
  const cdp = await ctx.newCDPSession(page);
  const go = ms => page.clock.runFor(ms);
  const rect = () => page.evaluate(() => { const r = document.querySelector('.ck-cv').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
  const at = async (lx, ly) => { const r = await rect(); return [r[0] + lx * r[2] / 288, r[1] + ly * r[3] / 320]; };
  const touch = (type, p) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [{ x: p[0], y: p[1], id: 1 }] : [] });
  const tap = async (lx, ly) => { const p = await at(lx, ly); await touch('touchStart', p); await go(30); await touch('touchEnd'); };
  const live = () => page.evaluate(() => COOK.live());
  const shot = name => page.screenshot({ path: path.join(OUT, name) });
  await go(900);
  await plan({ page, go, at, touch, tap, live, shot });
  console.log(vp.width + 'x' + vp.height, errs.length ? 'ERRORS ' + JSON.stringify(errs) : 'no page errors');
  await ctx.close();
}
async function squashShot(t, lx, ly, name) {
  await t.go(400);
  const s0 = (await t.live()).stats.squash;
  await t.touch('touchStart', await t.at(lx, ly));
  for (let i = 0; i < 40 && (await t.live()).stats.squash === s0; i++) await t.go(8);
  await t.shot(name);
  await t.touch('touchEnd');
}
async function pickPan(t) { const r = await t.page.evaluate(() => { const r = document.querySelector('.ck-prop').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); await t.touch('touchStart', r); await t.go(30); await t.touch('touchEnd'); }
(async () => {
  const b = await chromium.launch();
  await session(b, { width: 360, height: 740 }, async t => {
    await t.shot('01-counter-360x740.png');
    await pickPan(t); await t.go(300);
    let l = await t.live(); console.log('title', l.kind, JSON.stringify(l.title));
    await t.shot('01b-tap-title-360x740.png');
    await t.go(1100);
    l = await t.live(); const m = l.st.marks;
    for (const i of [0, 0, 0, 1, 1]) { await t.tap(m[i].x + (i ? 3 : -2), m[i].y + 2); await t.go(150); }
    await squashShot(t, m[1].x - 2, m[1].y - 3, '02-tap-mid-360x740.png');
    console.log('tap mid', JSON.stringify((await t.live()).stats));
    await t.go(300);
    for (const i of [2, 2, 2]) { await t.tap(m[i].x + 2, m[i].y - 1); await t.go(150); }
    await t.go(1300);
    l = await t.live(); console.log('now', l.kind, l.phase);
    await t.tap(144, 176); await t.go(3700);
    await t.shot('03-flip-golden-360x740.png');
    l = await t.live(); console.log('band', l.band);
    const p0 = await t.at(144, 236); await t.touch('touchStart', p0);
    for (let k = 1; k <= 6; k++) {
      await t.go(16); await t.touch('touchMove', await t.at(144 + k, 236 - k * 16)); await new Promise(r => setTimeout(r, 40));
      if ((await t.live()).stats.flips) break;
    }
    await t.go(30); await t.shot('04-flip-arc-360x740.png');
    await t.touch('touchEnd');
    await t.go(2100);
    l = await t.live(); console.log('now', l.kind, l.phase, l.look && l.look.band);
    const L0 = l.st.lines[0];
    let p = await t.at(L0.ax - 10, L0.ay); await t.touch('touchStart', p);
    for (let k = 1; k <= 20; k++) { await t.go(16); await t.touch('touchMove', await t.at(L0.ax - 10 + k * 7.4, L0.ay + Math.round(Math.sin(k) * 2))); await new Promise(r => setTimeout(r, 20)); }
    await t.touch('touchEnd'); await t.go(500);
    l = await t.live(); const L1 = l.st.lines[1];
    p = await t.at(L1.ax, L1.ay - 10); await t.touch('touchStart', p);
    for (let k = 1; k <= 9; k++) { await t.go(16); await t.touch('touchMove', await t.at(L1.ax + 1, L1.ay - 10 + k * 7.4)); await new Promise(r => setTimeout(r, 20)); }
    await new Promise(r => setTimeout(r, 60)); await t.go(30);
    await t.shot('05-slice-mid-360x740.png');
    for (let k = 10; k <= 20; k++) { await t.go(16); await t.touch('touchMove', await t.at(L1.ax + 1, L1.ay - 10 + k * 7.4)); }
    await t.touch('touchEnd');
    await t.go(1300);
    await t.shot('06-reveal-360x740.png');
    l = await t.live(); console.log('reveal', l.screen, JSON.stringify(l.look));
    await t.tap(144, 150); await t.go(800);
    await t.shot('07-counter-plate-360x740.png');
    l = await t.live(); console.log('back', l.screen);
  });
  await session(b, { width: 320, height: 568 }, async t => {
    await t.shot('08-counter-320x568.png');
    await pickPan(t); await t.go(1400);
    const l = await t.live(), m = l.st.marks;
    for (const i of [0, 0, 1, 1]) { await t.tap(m[i].x + 1, m[i].y + 1); await t.go(150); }
    await squashShot(t, m[2].x, m[2].y, '09-tap-320x568.png');
  });
  await b.close();
})().catch(e => { console.log('ERR', e); process.exit(1); });
