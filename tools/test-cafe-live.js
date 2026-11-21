#!/usr/bin/env node
/* tools/test-cafe-live.js - 카페 화면 시험 (브라우저). 실패하면 exit 1.
 *
 *   NODE_PATH=$(npm root -g) node tools/test-cafe-live.js [--shots <폴더>] [--3d]
 *
 * 마을 (갈래 V · W) 없이 APP.openCafe() · APP.openRecords() 로 연다. 갈래 T · N 은 대역 (APP.recipeEat · APP.npcSay).
 *   1 처음: 쟁반 없음 · AudioContext 0 · audio/ foley/ 요청 0
 *   2 메뉴: 셋 · 값 · 모자라면 묻지 않음 · 물음 뒤 0.6초 안의 누름은 받지 않음 · '시킬래' 뒤에만 조개가 나감
 *   3 먹기: 세 번 톡 · recipeEat 한 번 · 일어나기
 *   4 레시피 선물: 세 번째에 한 줄 + 지킴이 (npcSay 대역) · 네 번째엔 없음 · 대역이 없으면 받았다는 말이 없음
 *   5 먹다 만 것: 다시 내준다 (값을 또 받지 않는다) · 새로고침 뒤에도
 *   6 레코드, 소리 꺼짐: 판은 돌고 AudioContext 0 · 스피커 단추
 *   7 레코드, 소리 켬: 스피커 단추 → 한 곡 · 다른 재킷 → 그 곡만 · 다시 누르면 멈춤 · 시트 닫기 · 탭 숨김 · 부엌 열림에 멈춤
 *   8 켜 둔 채 새로고침: 누르기 전에는 AudioContext 0
 *   9 글 · 그림: 기호 없음 · 그림 px 이 기기 px 의 정수 배 (2 · 2.625)
 */
'use strict';
var path = require('path'), fs = require('fs');
var chromium = require('playwright').chromium;
var ROOT = path.resolve(__dirname, '..');
var SHOTS = process.argv.indexOf('--shots') >= 0 ? process.argv[process.argv.indexOf('--shots') + 1] : null, D3 = process.argv.indexOf('--3d') >= 0;
var URL0 = 'file://' + path.join(ROOT, 'index.html') + '?intro=0' + (D3 ? '' : '&scene=2d');
var passes = 0, failures = 0;
function ok(c, msg) { if (c) { passes++; console.log('  ok   ' + msg); } else { failures++; console.log('  FAIL ' + msg); } }
var INIT = function () {
  window.__ppolTest = { today: '2026-11-21' }; window.__ppolAwakeMs = 0; window.__ac = 0;
  ['AudioContext', 'webkitAudioContext'].forEach(function (k) { var A = window[k]; if (!A) return; var W = function () { window.__ac++; return new A(); }; W.prototype = A.prototype; window[k] = W; });
};
async function open(browser, opts) {
  var ctx = await browser.newContext(opts || { viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, locale: 'ko-KR' });
  await ctx.addInitScript(INIT);
  var page = await ctx.newPage(), bag = { errors: [], audio: [] };
  page.on('pageerror', function (e) { bag.errors.push(e.message); });
  page.on('request', function (r) { if (/\/(audio|foley)\//.test(r.url())) bag.audio.push(r.url()); });
  await page.goto(URL0);
  if (await page.locator('#name-dialog[open]').count() || await page.waitForSelector('#name-dialog[open]', { timeout: 8000 }).then(function () { return true; }, function () { return false; })) {
    await page.fill('#name-in', '뚜루'); await page.click('#name-form button[type=submit]'); await page.waitForSelector('#name-dialog[open]', { state: 'hidden' });
  }
  await page.waitForTimeout(400);
  await page.evaluate(function () { APP.dailyGift(); });   /* 그날 선물 (조개 +3) 을 먼저 받아 둔다 — 검사 중간에 조개 수가 바뀌지 않게 */
  await page.waitForTimeout(100);
  return { ctx: ctx, page: page, bag: bag };
}
function stubs(page) {
  return page.evaluate(function () {
    window.__rec = {}; window.__said = [];
    APP.recipeEat = function (id) { var x = window.__rec[id] || (window.__rec[id] = { n: 0, got: false }); x.n++; var g = x.n === 3 && !x.got; if (g) x.got = true; return { n: x.n, gift: g }; };
    APP.npcSay = function (id, key, vars) { window.__said.push([id, key, vars && vars.dish || '']); };
  });
}
function shells(page, n) { return page.evaluate(function (v) { if (v != null) { APP.state.user.shells = v; APP.save(); } return APP.state.user.shells; }, n == null ? null : n); }
function cafe(page) { return page.evaluate(function () { return { ui: APP.cafe, st: JSON.parse(JSON.stringify(APP.state.user.cafe || null)), ac: window.__ac, tray: !document.getElementById('cafe-tray').hidden, toast: document.getElementById('toast').textContent, toastOn: document.getElementById('toast').classList.contains('show') }; }); }
async function orderItem(page, idx) {
  await page.evaluate(function () { APP.openCafe(); });
  await page.waitForSelector('#cafe-sheet[open]');
  await page.locator('#cafe-body .cafe-item').nth(idx).click();
  await page.waitForSelector('#cafe-body .sew-ask');
  await page.waitForTimeout(700);
  await page.click('#cafe-body .sew-yes');
  await page.waitForSelector('#cafe-sheet[open]', { state: 'hidden' });
}
async function eatAll(page) { for (var i = 0; i < 3; i++) { await page.click('button#cafe-eat'); await page.waitForTimeout(80); } }
async function shot(page, name) { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await page.waitForTimeout(350); await page.screenshot({ path: path.join(SHOTS, name + '.png') }); }

async function main() {
  var browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  var s = await open(browser), page = s.page, c, n;

  console.log('== 1. 처음');
  c = await cafe(page);
  ok(await page.evaluate(function () { return !!window.CAFE && !!window.CAFE_MUSIC && typeof APP.openCafe === 'function' && typeof APP.openRecords === 'function'; }), 'CAFE · CAFE_MUSIC · APP.openCafe · APP.openRecords');
  ok(!c.tray && c.ac === 0 && !c.ui.seated, '쟁반 없음 · AudioContext 0');
  await stubs(page);

  console.log('== 2. 메뉴');
  await shells(page, 4);
  await page.evaluate(function () { APP.openCafe(); });
  await page.waitForSelector('#cafe-sheet[open]');
  var items = await page.$$eval('#cafe-body .cafe-item', function (els) { return els.map(function (e) { return e.textContent.replace(/\s+/g, ' ').trim(); }); });
  ok(items.length === 3 && /커피.*조개 2/.test(items[0]) && /딸기 케이크.*조개 5/.test(items[1]) && /과일 꼬치.*조개 4/.test(items[2]), '메뉴 셋과 값: ' + items.join(' | '));
  await page.locator('#cafe-body .cafe-item').nth(1).click();
  await page.waitForTimeout(150);
  c = await cafe(page);
  ok(!c.ui.ask && await shells(page) === 4 && /모자라/.test(c.toast), '조개 4 로 케이크: 묻지 않고 "모자라" (' + c.toast.trim() + ')');
  await shells(page, 20);
  await page.evaluate(function () { APP.openCafe(); });
  await shot(page, '01-menu');
  await page.locator('#cafe-body .cafe-item').nth(1).click();
  await page.waitForSelector('#cafe-body .sew-ask');
  var askTxt = await page.$eval('#cafe-ask-line', function (e) { return e.textContent; });
  ok(/딸기 케이크/.test(askTxt) && /시킬까\?/.test(askTxt) && await shells(page) === 20, '물음 줄 (' + askTxt.trim() + ') · 아직 조개 그대로');
  ok(await page.evaluate(function () { return document.activeElement && document.activeElement.classList.contains('sew-no'); }), '포커스는 "그만" 에');
  await page.click('#cafe-body .sew-yes');
  ok(await shells(page) === 20 && await page.locator('#cafe-sheet[open]').count() === 1, '물음이 뜬 뒤 0.6초 안의 누름은 받지 않는다');
  await page.waitForTimeout(700);
  await page.click('#cafe-body .sew-no');
  ok(await shells(page) === 20 && await page.locator('#cafe-body .cafe-item').count() === 3, '"그만": 조개 그대로, 메뉴로');
  await page.locator('#cafe-body .cafe-item').nth(1).click(); await page.waitForTimeout(700); await page.click('#cafe-body .sew-yes');
  await page.waitForSelector('#cafe-sheet[open]', { state: 'hidden' });
  c = await cafe(page);
  ok(await shells(page) === 15 && c.tray && c.ui.seated && c.st.tray.id === 'cake' && c.st.tray.left === 3, '"시킬래": 조개 15 · 쟁반에 케이크 세 입');
  ok(await page.$eval('#bag-n', function (e) { return e.textContent; }) === '15', '살림 꼬리표 15');
  ok(JSON.stringify(await page.evaluate(function () { return window.__said; })) === JSON.stringify([['cafe', 'cafe.hello', ''], ['cafe', 'cafe.hello', ''], ['cafe', 'cafe.serve', '딸기 케이크']]), '지킴이 말은 npcSay 로만 (hello · serve)');
  await shot(page, '02-served');

  console.log('== 3. 먹기');
  ok(await page.getAttribute('button#cafe-eat', 'aria-label') === '딸기 케이크 먹기', '먹기 단추 이름');
  var w0 = await page.$eval('#cafe-eat canvas', function (cv) { var d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, n = 0; for (var i = 3; i < d.length; i += 4) if (d[i]) n++; return n; });
  await page.click('button#cafe-eat'); await page.waitForTimeout(60);
  var w1 = await page.$eval('#cafe-eat canvas', function (cv) { var d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, n = 0; for (var i = 3; i < d.length; i += 4) if (d[i]) n++; return n; });
  ok(w1 < w0 && (await cafe(page)).st.tray.left === 2, '한 입: 그림이 줄어든다 (' + w0 + ' → ' + w1 + 'px)');
  await shot(page, '03-bite');
  await page.click('button#cafe-eat'); await page.waitForTimeout(60); await page.click('button#cafe-eat'); await page.waitForTimeout(60);
  c = await cafe(page);
  ok(c.st.eaten.cake === 1 && c.st.tray.left === 0 && await page.locator('button#cafe-eat').count() === 0, '세 입: 다 먹은 수 1 · 먹기 단추 없음');
  ok((await page.evaluate(function () { return window.__rec.cake.n; })) === 1 && !/레시피/.test(c.toast), 'recipeEat("cake") 한 번 · 선물 줄 없음');
  ok(c.ac === 0 && s.bag.audio.length === 0, '소리 꺼짐: AudioContext 0 · audio/ foley/ 요청 0');
  await page.click('#cafe-stand');
  c = await cafe(page);
  ok(!c.tray && !c.ui.seated && c.st.tray === null, '일어나기: 쟁반 치움');

  console.log('== 4. 레시피 선물');
  await shells(page, 80);
  await orderItem(page, 1); await eatAll(page); await page.click('#cafe-stand');
  await page.evaluate(function () { APP.openCafe(); }); await page.waitForSelector('#cafe-sheet[open]');
  ok(await page.locator('#cafe-body .cafe-item').nth(1).locator('.cafe-dots i.on').count() === 2 && await page.locator('#cafe-body .cafe-item').nth(0).locator('.cafe-dots').count() === 0, '두 번 먹음: 케이크 칸 점 둘 · 커피 칸은 점 없음');
  await page.click('#cafe-close');
  await orderItem(page, 1); await eatAll(page);
  c = await cafe(page);
  ok(c.toastOn && c.toast === '딸기 케이크 레시피를 받았어. 집 조리대의 책에 생겼어.', '세 번째: ' + c.toast);
  ok(c.st.gifts.cake === '2026-11-21', '받은 날 기록');
  ok((await page.evaluate(function () { return window.__said.filter(function (x) { return x[1] === 'cafe.gift'; }); })).length === 1, '지킴이의 선물 말 한 번 (npcSay)');
  await shot(page, '04-gift');
  await page.click('#cafe-stand'); await page.waitForTimeout(2700);
  await orderItem(page, 1); await eatAll(page);
  c = await cafe(page);
  ok(!c.toastOn && c.st.eaten.cake === 4 && (await page.evaluate(function () { return window.__said.filter(function (x) { return x[1] === 'cafe.gift'; }); })).length === 1, '네 번째: 선물 없음');
  await page.click('#cafe-stand');
  await page.evaluate(function () { delete APP.recipeEat; delete APP.npcSay; });
  for (n = 0; n < 3; n++) { await orderItem(page, 2); await eatAll(page); await page.click('#cafe-stand'); }
  c = await cafe(page);
  ok(c.st.eaten.kkochi === 3 && !c.st.gifts.kkochi2 && !/레시피/.test(c.toastOn ? c.toast : ''), '레시피 갈래 (T) 가 없으면 세기만 하고 받았다고 말하지 않는다');
  await stubs(page);

  console.log('== 5. 먹다 만 것');
  n = await shells(page);
  await orderItem(page, 2); await page.click('button#cafe-eat'); await page.click('#cafe-stand');
  c = await cafe(page);
  ok(!c.tray && c.st.tray && c.st.tray.left === 2 && await shells(page) === n - 4, '한 입 먹고 일어남: 두 입 남은 채 기록');
  await page.evaluate(function () { APP.openCafe(); });
  c = await cafe(page);
  ok(c.tray && c.ui.seated && await page.locator('#cafe-sheet[open]').count() === 0 && await shells(page) === n - 4, '카운터에 다시 가면 그 접시를 다시 낸다 (값을 또 받지 않는다)');
  await page.reload(); await page.waitForTimeout(900); await stubs(page);
  await page.evaluate(function () { APP.openCafe(); });
  c = await cafe(page);
  ok(c.tray && c.st.tray.left === 2 && c.st.eaten.cake === 4, '새로고침 뒤에도 기록 · 접시 그대로');
  await page.click('button#cafe-eat'); await page.click('button#cafe-eat'); await page.click('#cafe-stand');
  await orderItem(page, 0);
  c = await cafe(page);
  ok(c.tray && await page.locator('div#cafe-eat[role=img]').count() === 1 && await page.getAttribute('#cafe-eat', 'aria-label') === '커피', '커피: 잔 그림만 (먹기 단추 아님)');
  await shot(page, '05-coffee');
  await page.evaluate(function () { APP.cafeSeatTap(); });
  ok(!(await cafe(page)).tray, '자리 단추를 다시 누르면 일어난다');

  console.log('== 6. 레코드 (소리 꺼짐)');
  await page.evaluate(function () { APP.openRecords(); }); await page.waitForSelector('#lp-sheet[open]');
  ok(await page.locator('#lp-body .lp-sleeve').count() === 8 && await page.locator('#lp-sound').count() === 1, '재킷 여덟 장 · 스피커 단추 (이름 "' + await page.getAttribute('#lp-sound', 'aria-label') + '")');
  var names = await page.$$eval('#lp-body .lp-sleeve', function (els) { return els.map(function (e) { return e.getAttribute('aria-label'); }); });
  ok(names.every(function (x) { return /^[가-힣0-9 ]+, [가-힣]+$/.test(x); }) && await page.$eval('#lp-body .lp-shelf', function (e) { return e.textContent.trim() === ''; }), '재킷에는 글자가 없고 이름은 aria-label: ' + names.slice(0, 3).join(' / '));
  await shot(page, '06-shelf');
  var d0 = await page.$eval('#lp-disc', function (cv) { return cv.toDataURL(); });
  await page.locator('#lp-body .lp-sleeve').nth(1).click(); await page.waitForTimeout(500);
  c = await cafe(page);
  var d1 = await page.$eval('#lp-disc', function (cv) { return cv.toDataURL(); });
  ok(c.ui.lp === 'clair' && !c.ui.sound && c.ac === 0 && c.ui.music.playing === null, '소리 꺼짐: 판은 올라가고 소리는 없다 (AudioContext 0)');
  ok(d0 !== d1 && await page.$eval('#lp-now', function (e) { return e.textContent; }) === '달빛 · 드뷔시' && c.st.lp.clair === 1, '판 그림이 바뀌고 곡 이름 한 줄 · 튼 기록');
  await page.waitForTimeout(350);
  ok(await page.$eval('#lp-disc', function (cv) { return cv.toDataURL(); }) !== d1, '판이 돈다');
  await shot(page, '07-playing-silent');
  await page.locator('#lp-body .lp-sleeve').nth(1).click();
  ok((await cafe(page)).ui.lp === null, '같은 재킷을 다시 누르면 내린다');

  console.log('== 7. 레코드 (소리 켬)');
  await page.locator('#lp-body .lp-sleeve').nth(0).click();
  await page.click('#lp-sound'); await page.waitForTimeout(1300);
  c = await cafe(page);
  ok(await page.evaluate(function () { return AUDIO.enabled(); }) && await page.locator('#lp-sound').count() === 0, '스피커 단추: 게임의 소리 설정이 켜진다 · 단추는 사라진다');
  ok(c.ui.sound && c.ui.music.playing === 'lullaby' && c.ui.music.scheduled > 0 && c.ui.music.ctx === 'running', '자장가가 난다 (예약한 음 ' + c.ui.music.scheduled + ', ' + c.ui.music.ctx + ')');
  var ac1 = c.ac;
  await page.locator('#lp-body .lp-sleeve').nth(4).click(); await page.waitForTimeout(300);
  c = await cafe(page);
  ok(c.ui.music.playing === 'entertainer' && c.ui.lp === 'entertainer' && c.ac === ac1 + 1, '다른 재킷: 그 곡 하나만');
  await page.locator('#lp-body .lp-sleeve').nth(4).click(); await page.waitForTimeout(200);
  c = await cafe(page);
  ok(c.ui.music.playing === null && c.ui.lp === null, '다시 누르면 멈춘다');
  await page.locator('#lp-body .lp-sleeve').nth(2).click(); await page.click('#lp-close'); await page.waitForTimeout(200);
  ok((await cafe(page)).ui.music.playing === null, '시트를 닫으면 멈춘다 (바깥 지도가 없을 때 — 있으면 마을을 벗어날 때)');
  await page.evaluate(function () { APP.openRecords(); }); await page.locator('#lp-body .lp-sleeve').nth(2).click();
  ok((await cafe(page)).ui.music.playing === 'traumerei', '다시 틀기');
  await page.evaluate(function () { Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return true; } }); document.dispatchEvent(new Event('visibilitychange')); });
  ok((await cafe(page)).ui.music.playing === null, '탭을 숨기면 멈춘다');
  await page.evaluate(function () { delete document.hidden; });
  await page.locator('#lp-body .lp-sleeve').nth(3).click();
  await page.evaluate(function () { APP.scene.area = function () { return 'village'; }; document.getElementById('lp-sheet').close(); });
  await page.waitForTimeout(600);
  ok((await cafe(page)).ui.music.playing === 'prelude', '마을 안 (scene.area 대역): 시트를 닫아도 계속 난다');
  await page.evaluate(function () { APP.scene.area = function () { return 'road'; }; }); await page.waitForTimeout(600);
  ok((await cafe(page)).ui.music.playing === null, '마을을 벗어나면 멈춘다');
  await page.evaluate(function () { APP.scene.area = function () { return 'village'; }; APP.openRecords(); }); await page.locator('#lp-body .lp-sleeve').nth(3).click();
  await page.evaluate(function () { document.getElementById('lp-sheet').close(); document.getElementById('cook-overlay').showModal(); }); await page.waitForTimeout(600);
  ok((await cafe(page)).ui.music.playing === null, '부엌 (전체 화면 놀이) 이 열리면 멈춘다');
  await page.evaluate(function () { document.getElementById('cook-overlay').close(); delete APP.scene.area; });
  await page.evaluate(function () { APP.openRecords(); }); await page.locator('#lp-body .lp-sleeve').nth(5).click();
  await page.evaluate(function () { AUDIO.setEnabled(false); }); await page.waitForTimeout(600);
  c = await cafe(page);
  ok(c.ui.music.playing === null && c.ui.lp === 'elise' && await page.locator('#lp-sound').count() === 1, '설정에서 소리를 끄면 소리만 멈추고 판은 돈다 · 스피커 단추가 다시 나온다');
  ok(s.bag.audio.length === 0, 'audio/ foley/ 요청 0 (음악은 파일 없이 만든다)');
  await page.click('#lp-close');

  console.log('== 8. 켜 둔 채 새로고침');
  await page.evaluate(function () { AUDIO.setEnabled(true); });
  await page.reload(); await page.waitForTimeout(900);
  await page.evaluate(function () { APP.openRecords(); }); await page.waitForTimeout(300);
  c = await cafe(page);
  ok(await page.evaluate(function () { return AUDIO.enabled(); }) && c.ui.music.made === 0 && c.ui.music.playing === null, '소리가 켜져 있어도 재킷을 누르기 전에는 음악 AudioContext 를 만들지 않는다');
  await page.locator('#lp-body .lp-sleeve').nth(6).click(); await page.waitForTimeout(400);
  c = await cafe(page);
  ok(c.ui.music.playing === 'arabesque' && c.ui.music.made === 1, '재킷을 누르면 바로 난다');
  await shot(page, '08-playing');
  await page.locator('#lp-body .lp-sleeve').nth(6).click(); await page.click('#lp-close');
  await page.evaluate(function () { AUDIO.setEnabled(false); });

  console.log('== 9. 글 · 그림');
  await page.evaluate(function () { APP.openCafe(); }); await page.waitForSelector('#cafe-sheet[open]');
  var txt = await page.evaluate(function () { return document.getElementById('cafe-sheet').innerText + ' ' + document.getElementById('lp-sheet').textContent; });
  ok(/^[가-힣0-9\s·?.,]+$/.test(txt), '보이는 글: 한글 · 숫자 · 기본 문장부호뿐');
  ok(await page.evaluate(function () { return !document.querySelector('#cafe-sheet [title], #lp-sheet [title], #cafe-tray [title]'); }), 'title 속성 없음');
  async function crisp(pg) { return pg.evaluate(function () { var d = window.devicePixelRatio, bad = []; document.querySelectorAll('canvas.cafe-pic').forEach(function (cv) { var k = parseFloat(cv.style.width) * d / cv.width; if (Math.abs(k - Math.round(k)) > 0.01 || k < 1) bad.push(cv.width + '→' + k); }); return { n: document.querySelectorAll('canvas.cafe-pic').length, bad: bad, d: d }; }); }
  var cr = await crisp(page);
  ok(cr.n >= 3 && cr.bad.length === 0, '배율 2: 그림 ' + cr.n + '장 모두 정수 배');
  ok(s.bag.errors.length === 0, '페이지 오류 없음' + (s.bag.errors.length ? ': ' + s.bag.errors.join(' | ') : ''));
  await s.ctx.close(); await browser.close();

  var b2 = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--force-device-scale-factor=2.625', '--window-size=412,915'] });
  var s2 = await open(b2, { viewport: null, locale: 'ko-KR' });
  await shells(s2.page, 20);
  await s2.page.evaluate(function () { APP.openCafe(); }); await s2.page.waitForSelector('#cafe-sheet[open]');
  cr = await crisp(s2.page);
  ok(cr.d === 2.625 && cr.n >= 3 && cr.bad.length === 0, '배율 2.625: 그림 ' + cr.n + '장 모두 정수 배' + (cr.bad.length ? ' — ' + cr.bad.join(' ') : ''));
  await shot(s2.page, '09-menu-412');
  await s2.page.click('#cafe-close'); await s2.page.evaluate(function () { APP.openRecords(); }); await s2.page.waitForSelector('#lp-sheet[open]');
  cr = await crisp(s2.page);
  ok(cr.bad.length === 0, '배율 2.625: 레코드 시트 그림도 정수 배');
  ok(s2.bag.errors.length === 0, '페이지 오류 없음 (412)');
  await b2.close();

  console.log('\n카페 화면: 통과 ' + passes + ' · 실패 ' + failures);
  process.exit(failures ? 1 : 0);
}
main().catch(function (e) { console.error(e); process.exit(1); });
