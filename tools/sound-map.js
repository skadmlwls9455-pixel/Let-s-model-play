#!/usr/bin/env node
/* tools/sound-map.js — 행동 → 실제로 재생된 소리 기록 (docs/PLAYTEST_FIXES.md "D. 소리"). 저장소를 http 로 띄우고 소리를 켠 채로 논다.
 *   node tools/sound-map.js [out.json]     → 단계마다 "한 일 → 난 소리 · 그때 BGM" 을 찍고, out.json 에 저장 (생략하면 찍기만)
 * 순서: 소리 켜기 → 문어 톡 → 꾹(쓰다듬기) → 창문 톡 → 방 보기 열기/닫기 → 산책(외출 강제) → 포스터 열기/뒤집기/닫기 → 집에 있기(강제)
 *       → 잠든 문어 톡 → 빈 차례(강제) → 건너뛰기 → 같이 놀기 → 등불 8칸까지. 소리 id 는 AUDIO.state().played (시각으로 단계마다 자른다).
 * 주의: '잠든 문어 톡'은 시작 때 잡은 문어 좌표를 쓴다. 문어가 담요로 옮겨 갔으면 빗맞아 '(없음)'이 나올 수 있다.
 */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); });
const OUT = []; let mark = 0;
(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port + '/index.html';
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, locale: 'ko-KR', hasTouch: true });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.route('https://ko.wikipedia.org/**', r => r.abort());
  async function playedRaw() { return p.evaluate(() => (AUDIO.state().played || []).map(x => [x.id, x.t])); }
  async function played() { return (await playedRaw()).map(x => x[0]); }
  let lastT = -1;
  async function step(name, fn, wait) {
    await fn(); await p.waitForTimeout(wait || 1500);
    const raw = await playedRaw(); const st = await p.evaluate(() => { const s = AUDIO.state(); return { bgm: s.bgm || (s.music && s.music.id) || null, amb: s.amb || null }; });
    const got = raw.filter(x => x[1] > lastT).map(x => x[0]); if (raw.length) lastT = Math.max(lastT, ...raw.map(x => x[1])); OUT.push({ action: name, sounds: got, now: st }); console.log(name.padEnd(28), '→', got.join(', ') || '(없음)', '| bgm', JSON.stringify(st.bgm));
  }
  await p.addInitScript(() => { window.__ppolLook = undefined; });
  await p.goto(base);
  await p.waitForSelector('#name-dialog[open]'); await p.fill('#name-in', '뚜루'); await p.click('#name-form button[type=submit]'); await p.waitForTimeout(800);
  await step('소리 켜기 (스피커 버튼)', () => p.click('#btn-sound'), 3000);
  const oc = await p.evaluate(() => APP.scene.octScreenPos());
  await step('문어 톡', () => p.touchscreen.tap(oc.x, oc.y - 8));
  await step('문어 꾹 (쓰다듬기)', async () => { await p.mouse.move(oc.x, oc.y - 8); await p.mouse.down(); await p.waitForTimeout(600); await p.mouse.up(); }, 2500);
  await step('창문 톡', () => p.touchscreen.tap(60, 70), 4000);
  await step('방 보기 열기', () => p.click('#btn-look'), 800);
  await step('방 보기 닫기', () => p.click('#rs-close'), 800);
  await step('산책 (외출 강제, 끝까지)', async () => { await p.evaluate(() => { window.__ppolTest = { forceKind: 'out' }; }); await p.fill('#hint-in', '바다'); await p.click('#btn-go'); await p.waitForFunction(() => !document.getElementById('btn-go').disabled, null, { timeout: 90000 }); }, 2500);
  await step('포스터 열기', async () => { const c = await p.$('#album .pcard'); if (c) await c.click(); }, 1500);
  await step('포스터 뒤집기', () => p.click('#pd-flip').catch(() => {}), 1000);
  await step('포스터 닫기', () => p.click('#pd-close').catch(() => {}), 1000);
  await step('집에 있기 (강제, 끝까지)', async () => { await p.evaluate(() => { window.__ppolTest = { forceKind: 'home' }; }); await p.click('#btn-go'); await p.waitForFunction(() => !document.getElementById('btn-go').disabled, null, { timeout: 90000 }); }, 4000);
  await step('잠든 문어 톡', () => p.touchscreen.tap(oc.x, oc.y - 8), 1500);
  await step('빈 차례 (강제)', async () => { await p.evaluate(() => { window.__ppolTest = { forceKind: 'empty' }; }); await p.click('#btn-go'); await p.waitForFunction(() => !document.getElementById('btn-go').disabled, null, { timeout: 60000 }); }, 2500);
  await step('산책 건너뛰기', async () => { await p.evaluate(() => { window.__ppolTest = { forceKind: 'out' }; }); await p.click('#btn-go'); await p.waitForSelector('#btn-skip:not([hidden])'); await p.waitForTimeout(300); await p.click('#btn-skip'); await p.waitForFunction(() => !document.getElementById('btn-go').disabled, null, { timeout: 60000 }); }, 2500);
  await step('같이 놀기 열고 몇 번 점프', async () => { await p.click('#btn-look'); await p.waitForTimeout(500); const pl = await p.$('#room-sheet button:has-text("같이 놀기")'); if (pl) { await pl.click(); await p.waitForTimeout(800); for (let i = 0; i < 10; i++) { await p.keyboard.press('Space'); await p.waitForTimeout(400); } } }, 1000);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300); await p.keyboard.press('Escape');
  await step('등불 8칸까지 (건너뛰기 반복)', async () => { await p.evaluate(() => { window.__ppolTest = { forceKind: 'out' }; }); for (let i = 0; i < 5; i++) { await p.click('#btn-go'); await p.waitForSelector('#btn-skip:not([hidden])'); await p.waitForTimeout(200); await p.click('#btn-skip'); await p.waitForFunction(() => !document.getElementById('btn-go').disabled, null, { timeout: 60000 }); } }, 4000);
  const lantern = await p.evaluate(() => APP.state.room.lantern);
  const all = await played();
  if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify({ steps: OUT, lantern, distinct: [...new Set(all)], errs }, null, 1));
  console.log('lantern', lantern, 'errors', errs);
  await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
