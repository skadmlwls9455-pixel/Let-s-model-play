/* 로딩 문어: 스크립트 · 그림을 늦춰 로딩을 보이게 하고, 매 프레임 가까이 빨간 벡터 문어 (#oct-svg) 가 보이는지 · 로딩 문어가 언제 걷히는지 · 걷힌 뒤 빈 화면 틈이 있는지.
   node boot.js [지연ms] [reduce] [q]   (http://127.0.0.1:8765 에 저장소 루트를 띄워 둔다) */
const V = require('./vlib.js');
const DELAY = +(process.argv[2] || 2500), REDUCE = process.argv[3] === 'reduce', Q = process.argv[4] || '?intro=0';
(async () => {
  const b = await V.launch();
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true, locale: 'ko-KR', reducedMotion: REDUCE ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  await page.addInitScript({ content: "localStorage.setItem('ppolppol_v2', " + JSON.stringify(JSON.stringify(V.REC(5))) + ");" +
    "window.__seen=[]; (function tick(){ try { var s=document.getElementById('oct-svg'); var bt=document.getElementById('boot'); var h=document.documentElement; var vis=null; if(s){ var r=s.getBoundingClientRect(); var cs=getComputedStyle(s); var p=s.closest('[hidden]'); vis = r.width>0 && cs.visibility!=='hidden' && cs.display!=='none' && !p && +cs.opacity>0; var o=s; var op=1; while(o&&o.nodeType===1){ op*= +getComputedStyle(o).opacity; o=o.parentElement; } vis = vis && op>0.01; }"
    + " var bv = bt ? getComputedStyle(bt).display!=='none' : null; var oc=document.querySelector('#boot .boot-oct'); var ox = oc ? Math.round(oc.getBoundingClientRect().x) : null; window.__seen.push([Math.round(performance.now()), vis?1:0, bv?1:0, h.classList.contains('booted')?1:0, ox, !!document.querySelector('#scene canvas')]); } catch(e){} requestAnimationFrame(tick); })();" });
  const slow = /\/(js\/(app|scene3d|three[^/]*)\.js|vendor\/three[^/]*\.js)/;
  await page.route('**/*', async route => { const u = route.request().url(); if (slow.test(u)) await new Promise(r => setTimeout(r, DELAY)); route.continue(); });
  const shots = []; let k = 0;
  page.on('load', () => {});
  const go = page.goto('http://127.0.0.1:8765/index.html' + Q);
  const t0 = Date.now();
  while (Date.now() - t0 < DELAY + 9000) {
    await page.waitForTimeout(400);
    try { if (k < 6) { const n = 'boot-' + (REDUCE ? 'reduce-' : '') + (k++) + '.png'; await page.screenshot({ path: V.SHOTS + '/' + n }); shots.push(n); } } catch (e) {}
    const done = await page.evaluate(() => document.documentElement.classList.contains('booted')).catch(() => false);
    if (done && k >= 3) break;
  }
  await go.catch(() => {});
  await page.waitForTimeout(1500);
  const seen = await page.evaluate(() => window.__seen);
  const svgFrames = seen.filter(s => s[1]).length, bootFrames = seen.filter(s => s[2]).length;
  const firstBooted = seen.find(s => s[3]);
  const svgBeforeBoot = seen.filter(s => s[1] && !s[3]).length;
  console.log('frames', seen.length, 'boot visible frames', bootFrames, 'oct-svg visible frames', svgFrames, 'svg visible before booted', svgBeforeBoot, 'booted at', firstBooted && firstBooted[0]);
  console.log('oct x samples', seen.filter((s, i) => i % 15 === 0 && s[2]).map(s => s[4]).slice(0, 20).join(','));
  console.log('svg visible samples', seen.filter(s => s[1]).slice(0, 5).map(s => s.join('/')).join(' '));
  await page.screenshot({ path: V.SHOTS + '/boot-' + (REDUCE ? 'reduce-' : '') + 'after.png' });
  console.log('shots', shots.join(','));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
