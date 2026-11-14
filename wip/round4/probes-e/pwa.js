/* 홈 화면에 두기: http://127.0.0.1:8765 (내보낸 묶음) 에서 Page.getInstallabilityErrors · 목록 · 아이콘 */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const page = await (await b.newContext({ viewport: { width: 360, height: 740 } })).newPage();
  const bad = []; page.on('response', r => { if (r.status() >= 400 && r.url().includes('127.0.0.1')) bad.push(r.status() + ' ' + r.url()); });
  await page.goto('http://127.0.0.1:8765/?intro=0');
  await page.waitForFunction(() => window.APP && APP.scene, null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  const cdp = await page.context().newCDPSession(page);
  const inst = await cdp.send('Page.getInstallabilityErrors');
  const man = await cdp.send('Page.getAppManifest').catch(e => ({ err: e.message }));
  console.log(JSON.stringify({ errors: inst.installabilityErrors, manifestErrors: man.errors, url: man.url, bad }, null, 1));
  await b.close();
  process.exit(inst.installabilityErrors.length ? 1 : 0);
})();
