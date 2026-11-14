/* 홈 화면 설치: 내보낸 묶음 (node tools/export-site.js <dir>; python3 -m http.server 8766 --bind 127.0.0.1) 에서
   설치 오류 · 목록 · 아이콘 크기 · 서비스 워커 없음 · 새 판이 옛 판에 갇히지 않는지 (두 번째 로드가 네트워크로 가는지) · display-mode standalone 화면 */
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://127.0.0.1:8766/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const bad = []; page.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
  await page.goto(BASE);   // 첫 방문 그대로 (입장 연출 포함)
  await page.waitForFunction(() => window.APP && APP.scene, null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  const cdp = await ctx.newCDPSession(page);
  const inst = await cdp.send('Page.getInstallabilityErrors');
  const man = await cdp.send('Page.getAppManifest');
  const sw = await page.evaluate(async () => navigator.serviceWorker ? (await navigator.serviceWorker.getRegistrations()).length : 'n/a');
  const icons = await page.evaluate(async () => { const m = await (await fetch('manifest.webmanifest')).json(); const out = []; for (const i of m.icons) { const img = new Image(); img.src = i.src; await img.decode().catch(() => {}); out.push(i.src + ' ' + i.sizes + ' -> ' + img.naturalWidth + 'x' + img.naturalHeight + ' ' + i.purpose); } return out; });
  const ct = await page.evaluate(async () => (await fetch('manifest.webmanifest')).headers.get('content-type'));
  console.log(JSON.stringify({ installErrors: inst.installabilityErrors, manifestErrors: man.errors, sw, icons, manifestCT: ct, bad }, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
