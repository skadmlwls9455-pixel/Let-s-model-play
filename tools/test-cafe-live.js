#!/usr/bin/env node
/* tools/test-cafe-live.js - 카페 화면 시험 (브라우저). 실패하면 exit 1.
 *
 *   NODE_PATH=$(npm root -g) node tools/test-cafe-live.js [--shots <폴더>] [--3d] [--sprites]
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
 *  12 진짜 카페 방 (방 갈래가 합쳐진 빌드에서만, 11 대신): 마을 → 문 → 같은 차례를 진짜 장면으로 · 먹다 만 접시가 기다린다
 *  11 카페 방 (갈래 W · V · T 의 장면 함수는 대역): 칠판 카드 → 주문 → 만드는 중 → 쟁반 → 들고 가 앉기 → 접시 세 번 → 도장 카드 → 레시피 · 끊김 셋 · 레코드 선반 카드
 */
'use strict';
var path = require('path'), fs = require('fs');
var chromium = require('playwright').chromium;
var ROOT = path.resolve(__dirname, '..');
var SHOTS = process.argv.indexOf('--shots') >= 0 ? process.argv[process.argv.indexOf('--shots') + 1] : null, D3 = process.argv.indexOf('--3d') >= 0, SPRITES = process.argv.indexOf('--sprites') >= 0;
var URL0 = 'file://' + path.join(ROOT, 'index.html') + '?intro=0' + (D3 ? '' : '&scene=2d');
var passes = 0, failures = 0;
function ok(c, msg) { if (c) { passes++; console.log('  ok   ' + msg); } else { failures++; console.log('  FAIL ' + msg); } }
var INIT = function () {
  window.__ppolTest = { today: '2026-11-21' }; window.__ppolAwakeMs = 0; window.__ac = 0;
  ['AudioContext', 'webkitAudioContext'].forEach(function (k) { var A = window[k]; if (!A) return; var W = function () { window.__ac++; return new A(); }; W.prototype = A.prototype; window[k] = W; });
};
async function open(browser, opts, url) {
  var ctx = await browser.newContext(opts || { viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, locale: 'ko-KR' });
  await ctx.addInitScript(INIT);
  var page = await ctx.newPage(), bag = { errors: [], audio: [] };
  page.on('pageerror', function (e) { bag.errors.push(e.message); });
  page.on('request', function (r) { if (/\/(audio|foley)\//.test(r.url())) bag.audio.push(r.url()); });
  await page.goto(url || URL0);
  if (await page.locator('#name-dialog[open]').count() || await page.waitForSelector('#name-dialog[open]', { timeout: 8000 }).then(function () { return true; }, function () { return false; })) {
    await page.fill('#name-in', '뚜루'); await page.click('#name-form button[type=submit]'); await page.waitForSelector('#name-dialog[open]', { state: 'hidden' });
  }
  await page.waitForTimeout(400);
  if (SPRITES && !(await page.evaluate(function () { return !!window.COOK_SPR; }))) await page.addScriptTag({ path: path.join(ROOT, 'js', 'cook-sprites.js') });   /* --sprites: 음식 그림 (갈래 A) 을 얹어서 찍는다 — 식탁 갈래 (T) 가 합쳐지면 index.html 이 스스로 싣는다 */
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

/* 12. 진짜 카페 방 (갈래 W 의 방 · V 의 가구와 단추 · T 의 들기 · 그림 놓기가 합쳐진 빌드에서만): 마을 → 문 → 방 안의 차례를 진짜 장면으로 */
async function realRoom(p, s) {
  console.log('== 12. 진짜 카페 방: 들어가기 → 칠판 → 주문 → 쟁반 → 들고 가 앉기 → 접시 → 도장 → 일어나기 → 레코드 → 나가기');
  function st() { return p.evaluate(function () { var sc = APP.scene, d = sc.debugSprites ? sc.debugSprites() : { props: {}, carry: null }, card = document.getElementById('cafe-card'), pb = document.getElementById('btn-cafe-plate'); return { inRoom: sc.inRoom(), ui: APP.cafe, props: d.props || {}, carry: d.carry, sat: sc.cafeSeated ? sc.cafeSeated() : null, shells: APP.state.user.shells, st: JSON.parse(JSON.stringify(APP.state.user.cafe || null)), card: !card.hidden, mode: card.getAttribute('data-mode'), dlg: document.querySelectorAll('dialog[open]').length, plate: !pb.hidden, tray: !document.getElementById('cafe-tray').hidden }; }); }
  function tap(id) { return p.evaluate(function (i) { document.getElementById(i).click(); }, id); }   /* 장면 단추: 멀면 갈래 V · W 가 먼저 걸어가게 한 뒤 다시 누른다 */
  function until(fn, ms) { return p.waitForFunction(fn, null, { timeout: ms || 40000 }).then(function () { return true; }, function () { return false; }); }
  for (var i = 0; i < 12 && await p.evaluate(function () { return APP.scene.area() !== 'village'; }); i++) { await p.evaluate(function () { if (APP.room !== 'yard') APP.goRoom('yard'); else APP.goPlace('village'); }); await p.waitForTimeout(2500); }
  await shells(p, 60);
  await p.evaluate(function () { return APP.goInside('cafe'); });
  ok(await until(function () { return APP.scene.inRoom() === 'cafe'; }), '마을에서 카페 방으로 들어왔다');
  await p.waitForTimeout(1500);
  var r = await st();
  ok(r.ui.stage === null && !r.card && !r.plate && Object.keys(r.props).length === 0, '들어옴: 아무것도 뜨지 않는다');
  await tap('btn-cafe-menu');
  ok(await until(function () { return APP.cafe.card === 'menu'; }), '칠판 단추: 걸어가서 칠판 확대 카드');
  r = await st();
  ok(r.dlg === 0 && await p.locator('#cafe-card .cafe-item').count() === 3, '카드는 dialog 가 아니다 · 메뉴 셋');
  await shot(p, '21-real-board');
  await p.locator('#cafe-card .cafe-item').nth(1).click(); await p.waitForSelector('#cafe-card .sew-ask'); await p.waitForTimeout(700);
  var br = await p.evaluate(function () { document.querySelector('#cafe-card .sew-yes').click(); return { shells: APP.state.user.shells, stage: APP.cafe.stage, card: !document.getElementById('cafe-card').hidden }; });
  ok(br.shells === 55 && br.stage === 'brew' && !br.card, '"시킬래": 조개 55 · 지킴이가 만드는 중');
  ok(await until(function () { return APP.cafe.stage === 'ready'; }, 8000), '쟁반이 나왔다');
  r = await st();
  ok(r.props['cafe-tray'] && r.props['cafe-tray'].visible !== false, '받는 자리에 쟁반 그림 (' + (r.props['cafe-tray'] && r.props['cafe-tray'].id) + ')');
  await shot(p, '22-real-tray');
  await tap('btn-cafe-counter');
  ok(await until(function () { return APP.cafe.stage === 'carry' || APP.cafe.stage === 'eat'; }), '카운터 단추: 쟁반을 집어 들었다');
  ok(await until(function () { return APP.cafe.stage === 'eat' && APP.scene.cafeSeated(); }), '내 자리에 앉았다');
  await p.waitForTimeout(600);
  r = await st();
  ok(r.carry === null && !r.props['cafe-tray'] && r.props['cafe-plate'] && r.props['cafe-plate'].frame === 0 && r.plate && !r.tray, '접시를 식탁에 내려놓았다 · 접시 단추가 보인다 · 아래 쟁반 판은 없다');
  ok(await p.evaluate(function () { var b = document.getElementById('btn-cafe-plate'), q = b.getBoundingClientRect(), e = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return !!e && e.id === 'btn-cafe-plate'; }), '접시 단추가 맨 위에 있다 (눌린다)');
  await shot(p, '23-real-plate');
  await p.click('#btn-cafe-plate'); await p.waitForTimeout(200);
  r = await st(); ok(r.st.tray.left === 2 && r.props['cafe-plate'].frame === 1, '접시를 누름: 한 입');
  await p.click('#btn-cafe-plate'); await p.waitForTimeout(200); await p.click('#btn-cafe-plate'); await p.waitForTimeout(300);
  r = await st();
  ok(r.st.eaten.cake === 1 && !r.plate && r.card && r.mode === 'stamp' && r.st.tray.left === 0, '세 입: 도장 카드');
  ok(await p.evaluate(function () { var x = (APP.state.user.recipes || {}).cake; return x ? x.n : -1; }) === 1, '레시피 갈래가 한 번 셌다');
  await shot(p, '24-real-stamp');
  await until(function () { return document.getElementById('cafe-card').hidden; }, 6000);
  await tap('btn-cafe-seat');
  ok(await until(function () { return !APP.cafe.seated; }, 15000), '자리 단추: 일어났다');
  await p.waitForTimeout(800);
  r = await st(); ok(!r.props['cafe-plate'] && r.st.tray === null, '빈 접시는 치웠다');
  /* 먹다 만 접시는 기다린다: 시키고 → 받고 → 한 입 → 문으로 나갔다가 다시 */
  await tap('btn-cafe-menu'); await until(function () { return APP.cafe.card === 'menu'; });
  await p.locator('#cafe-card .cafe-item').nth(2).click(); await p.waitForSelector('#cafe-card .sew-ask'); await p.waitForTimeout(700); await p.click('#cafe-card .sew-yes');
  await until(function () { return APP.cafe.stage === 'ready'; }, 8000); await tap('btn-cafe-counter');
  await until(function () { return APP.cafe.stage === 'eat' && APP.scene.cafeSeated(); }); await p.waitForTimeout(400);
  await p.click('#btn-cafe-plate'); await p.waitForTimeout(200);
  await p.evaluate(function () { return APP.goOutside(); });
  ok(await until(function () { return APP.scene.inRoom() !== 'cafe'; }), '문으로 나왔다');
  await p.waitForTimeout(800);
  r = await st();
  ok(!r.ui.seated && r.ui.stage === null && !r.plate && r.st.tray.id === 'kkochi' && r.st.tray.left === 2 && r.shells === 51, '나감: 자리는 끝나고 · 먹다 만 꼬치는 기록에 남는다');
  await p.evaluate(function () { return APP.goInside('cafe'); }); await until(function () { return APP.scene.inRoom() === 'cafe'; }); await p.waitForTimeout(1500);
  r = await st();
  ok(r.ui.stage === 'eat' && r.props['cafe-plate'] && r.props['cafe-plate'].frame === 1 && r.plate, '다시 들어옴: 먹다 만 접시가 식탁에서 기다린다');
  await tap('btn-cafe-plate'); await until(function () { return APP.cafe.seated && APP.scene.cafeSeated(); }); await p.waitForTimeout(600);
  await p.click('#btn-cafe-plate'); await p.waitForTimeout(200); await p.click('#btn-cafe-plate'); await p.waitForTimeout(2600);
  ok((await st()).st.eaten.kkochi === 1, '앉아서 마저 먹었다');
  await tap('btn-cafe-seat'); await until(function () { return !APP.cafe.seated; }, 15000);
  /* 끊김 (11-22 검증): 걷기가 막혀 앉지 못함 — 진짜 장면의 cafeSit 을 '못 앉음' 으로 바꿔 둔다. 그래도 값을 낸 음식은 먹을 수 있다 */
  await p.evaluate(function () { var s = APP.scene; window.__realSit = s.cafeSit; s.cafeSit = function (on) { return on ? Promise.resolve(false) : window.__realSit(on); }; });
  await tap('btn-cafe-menu'); await until(function () { return APP.cafe.card === 'menu'; });
  await p.locator('#cafe-card .cafe-item').nth(0).click(); await p.waitForSelector('#cafe-card .sew-ask'); await p.waitForTimeout(700); await p.click('#cafe-card .sew-yes');
  await until(function () { return APP.cafe.stage === 'ready'; }, 8000); await tap('btn-cafe-counter');
  ok(await until(function () { return APP.cafe.stage === 'eat'; }, 15000), '앉기가 막힘: 그래도 내려놓는다');
  await p.waitForTimeout(400); r = await st();
  ok(r.carry === null && !r.ui.seated && r.props['cafe-plate'] && r.plate, '…손은 비고 · 커피가 식탁에 · 누를 단추가 있다');
  for (var q = 0; q < 3; q++) { await p.click('#btn-cafe-plate'); await p.waitForTimeout(200); }
  ok((await st()).st.eaten.coffee === 1, '…서서 다 마셨다');
  await p.evaluate(function () { APP.scene.cafeSit = function (on) { return on ? new Promise(function () {}) : window.__realSit(on); }; });   /* 걷다가 걸려 끝나지 않음 */
  await tap('btn-cafe-menu'); await until(function () { return APP.cafe.card === 'menu'; });
  await p.locator('#cafe-card .cafe-item').nth(0).click(); await p.waitForSelector('#cafe-card .sew-ask'); await p.waitForTimeout(700); await p.click('#cafe-card .sew-yes');
  await until(function () { return APP.cafe.stage === 'ready'; }, 8000); await tap('btn-cafe-counter'); await p.waitForTimeout(300);
  ok((await st()).ui.stage === 'carry', '앉기가 끝나지 않음: 들고 있는 동안');
  ok(await until(function () { return APP.cafe.stage === 'eat'; }, 16000), '…12초 뒤에는 내려놓는다');
  r = await st(); ok(r.carry === null && r.props['cafe-plate'] && r.plate, '…손은 비고 · 커피가 식탁에');
  for (q = 0; q < 3; q++) { await p.click('#btn-cafe-plate'); await p.waitForTimeout(200); }
  ok((await st()).st.eaten.coffee === 2, '…서서 다 마셨다');
  await p.evaluate(function () { APP.scene.cafeSit = window.__realSit; });
  /* 레코드 구석 */
  await tap('btn-cafe-lp');
  ok(await until(function () { return APP.cafe.card === 'lp'; }), '레코드 단추: 걸어가서 선반 확대 카드');
  await shot(p, '25-real-rack');
  await p.locator('#cafe-card .lp-sleeve').nth(1).click(); await p.waitForTimeout(300);
  r = await st();
  ok(r.ui.lp === 'clair' && !r.ui.sound && r.ui.music.made === 0, '재킷: 판이 올라간다 · 소리 설정이 꺼져 있어 소리는 없다');
  await p.click('#cafe-card-close'); await p.waitForTimeout(1200);
  ok((await st()).ui.lp === 'clair', '카드를 닫아도 방 안에서는 판이 돈다');
  await shot(p, '26-real-disc');
  await p.evaluate(function () { return APP.goOutside(); }); await until(function () { return APP.scene.inRoom() !== 'cafe'; }); await p.waitForTimeout(600);
  r = await st();
  ok(r.ui.lp === null && r.ui.music.playing === null, '방을 나오면 판이 멈춘다');
  ok(s.bag.errors.length === 0 && s.bag.audio.length === 0, '페이지 오류 없음 · audio/ foley/ 요청 0' + (s.bag.errors.length ? ': ' + s.bag.errors.join(' | ') : ''));
}

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
  ok(await page.locator('#cafe-body .cafe-item').nth(1).locator('.cafe-dots i.on').count() === 2 && await page.locator('#cafe-body .cafe-item').nth(0).locator('.cafe-dots:not(.none)').count() === 0, '두 번 먹음: 케이크 칸 점 둘 · 커피 칸은 점 없음');
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
  ok(c.tray && await page.getAttribute('button#cafe-eat', 'aria-label') === '커피 마시기', '커피: 세 모금 (단추 이름 "커피 마시기")');
  await shot(page, '05-coffee');
  await eatAll(page);
  ok((await cafe(page)).st.eaten.coffee === 1, '커피 세 모금: 다 마심');
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
  ok(await page.locator('#lp-body .lp-sleeve[aria-pressed="true"]').count() === 0 && await page.$eval('#lp-now', function (e) { return e.textContent; }) === '', '…시트의 판 · 곡 이름도 내려간다');
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

  console.log('== 11. 카페 방 (갈래 W · V · T 대역): 칠판 → 주문 → 쟁반 → 들고 가 앉기 → 접시 → 도장 → 레코드 → 끊김');
  var bR = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var sR = await open(bR, null, URL0.replace('&scene=2d', '')), pr = sR.page, r;   /* 3D 장면 (화면을 다 쓴다 — 카드가 장면 안에 뜬다) */
  var REAL = await pr.evaluate(function () { return typeof APP.goInside === 'function' && typeof APP.scene.inRoom === 'function' && typeof APP.scene.roomSlots === 'function'; });   /* 방 갈래 (W · V) 가 합쳐진 빌드인가 */
  if (REAL) { console.log('   (진짜 방이 있는 빌드 — 대역 대신 12 에서 진짜 방으로 확인한다)'); await realRoom(pr, sR); }
  else {
  await stubs(pr);
  await pr.evaluate(function () {
    window.__room = { key: null, props: {}, carry: null, sat: false, rec: null, sitMs: 150 };
    var s = APP.scene, R = window.__room;
    s.inRoom = function () { return R.key; };
    s.roomSlots = function () { return { menu: [0, 1.5, -2], pickup: { x: 1, y: 1, z: -1 }, table: [0, 0.8, 0], seat: [0, 0, 0.5], keeper: [1.5, 1, -2], turntable: [-2, 1, 0], lp: [-2, 1, 0.5] }; };
    s.project = function (x, y, z) { return { x: 180 + x * 50, y: 260 + z * 50 }; };
    s.spriteProp = function (name, pos, id, frame) { if (pos) R.props[name] = { pos: pos, id: id, frame: frame }; else delete R.props[name]; };
    s.playerCarry = function (id) { R.carry = id; };
    s.cafeSit = function (on) { return new Promise(function (res) { setTimeout(function () { if (R.key !== 'cafe') { res(false); return; } R.sat = !!on; document.dispatchEvent(new CustomEvent('ppol:cafe-seat', { detail: { on: !!on } })); res(true); }, on ? R.sitMs : 0); }); };
    s.cafeCup = function (on) { R.cup = !!on; }; s.cafeRecord = function (on, col) { R.rec = on ? col : null; };
    [['btn-cafe-menu', 'openCafe', 40, 80], ['btn-cafe-counter', 'cafeCounterTap', 110, 80], ['btn-cafe-seat', 'cafeSeatTap', 180, 80], ['btn-cafe-lp', 'openRecords', 250, 80]].forEach(function (d) {
      var b = document.getElementById(d[0]) || document.createElement('button'); b.id = d[0]; b.type = 'button'; b.className = 'scene-spot'; b.hidden = false; b.setAttribute('aria-label', d[0]);
      b.style.cssText = 'transform:translate(' + d[2] + 'px,' + d[3] + 'px);z-index:20'; if (!b.parentNode) { b.addEventListener('click', function () { APP[d[1]](); }); document.getElementById('scene').appendChild(b); }
    });
    window.__enter = function (k) { R.key = k; if (!k) R.sat = false; document.dispatchEvent(new CustomEvent('ppol:room', { detail: { key: k } })); };
  });
  function room(p) { return p.evaluate(function () { var card = document.getElementById('cafe-card'), pb = document.getElementById('btn-cafe-plate'); return { ui: APP.cafe, R: JSON.parse(JSON.stringify(window.__room)), st: JSON.parse(JSON.stringify(APP.state.user.cafe || null)), shells: APP.state.user.shells, card: !card.hidden, mode: card.getAttribute('data-mode'), dlg: document.querySelectorAll('dialog[open]').length, plate: !pb.hidden, plateName: pb.getAttribute('aria-label'), tray: !document.getElementById('cafe-tray').hidden, toast: document.getElementById('toast').classList.contains('show') ? document.getElementById('toast').textContent : '', counter: document.getElementById('btn-cafe-counter').getAttribute('aria-label') }; }); }
  async function roomOrder(p, idx) { await p.click('#btn-cafe-menu'); await p.waitForSelector('#cafe-card:not([hidden]) .cafe-item'); await p.locator('#cafe-card .cafe-item').nth(idx).click(); await p.waitForSelector('#cafe-card .sew-ask'); await p.waitForTimeout(700); await p.click('#cafe-card .sew-yes'); }
  await shells(pr, 60);
  await pr.evaluate(function () { window.__enter('cafe'); });
  r = await room(pr);
  ok(r.ui.stage === null && !r.card && !r.plate, '방에 들어옴: 아무것도 뜨지 않는다');
  await pr.click('#btn-cafe-menu'); await pr.waitForSelector('#cafe-card:not([hidden]) .cafe-item');
  r = await room(pr);
  ok(r.card && r.mode === 'menu' && r.dlg === 0 && await pr.locator('#cafe-card .cafe-item').count() === 3 && await pr.locator('#cafe-card .cafe-band').count() === 0, '칠판 단추: 장면 안 카드에 메뉴 셋 (dialog 아님 · 그림 띠 없음)');
  ok(await pr.evaluate(function () { var c = document.getElementById('cafe-card').getBoundingClientRect(), s = document.getElementById('scene').getBoundingClientRect(); return c.left >= s.left && c.right <= s.right + 1 && c.top >= s.top && c.bottom <= s.bottom + 1; }), '카드는 장면 안에 다 들어온다');
  await shot(pr, '11-room-board');
  await pr.keyboard.press('Escape');
  r = await room(pr);
  ok(!r.card && await pr.evaluate(function () { return document.activeElement && document.activeElement.id; }) === 'btn-cafe-menu', 'Esc: 카드가 닫히고 포커스는 칠판 단추로');
  await pr.click('#btn-cafe-counter'); await pr.waitForTimeout(100);
  ok((await room(pr)).mode === 'menu' && (await room(pr)).card, '시킨 것이 없을 때 카운터 단추: 칠판이 열린다');
  await pr.click('#cafe-card-close');
  await pr.click('#btn-cafe-menu');
  await pr.evaluate(function () { document.querySelectorAll('#cafe-card .cafe-item')[1].click(); document.querySelector('#cafe-card .sew-yes').click(); });   /* 칸을 누르고 바로 그 자리의 '시킬래' (느린 3D 에서도 0.6초 안이 되게 한 번에) */
  ok((await room(pr)).shells === 60 && (await room(pr)).card, '물음이 뜬 뒤 0.6초 안의 누름은 받지 않는다 (카드에서도)');
  await pr.waitForTimeout(700);
  /* 느린 3D 에서도 '만드는 중' (1.5초) 안에 보도록 누름과 읽기를 한 번에 */
  var br = await pr.evaluate(function () { document.querySelector('#cafe-card .sew-yes').click(); var a = { shells: APP.state.user.shells, card: !document.getElementById('cafe-card').hidden, stage: APP.cafe.stage, tray: !!window.__room.props['cafe-tray'], left: APP.state.user.cafe.tray.left }; document.getElementById('btn-cafe-counter').click(); a.after = APP.cafe.stage; return a; });
  ok(br.shells === 55 && !br.card && br.stage === 'brew' && !br.tray && br.left === 3, '"시킬래": 조개 55 · 카드 닫힘 · 지킴이가 만드는 중 (쟁반은 아직)');
  ok(br.after === 'brew', '만드는 중의 카운터 단추: 아무 일도 없다');
  await pr.waitForFunction(function () { return APP.cafe.stage === 'ready'; }, null, { timeout: 5000 });
  r = await room(pr);
  ok(r.R.props['cafe-tray'] && r.R.props['cafe-tray'].pos.x === 1 && r.counter === '쟁반 가져가기', '받는 자리에 쟁반 · 카운터 단추 이름 "쟁반 가져가기"');
  await pr.evaluate(function () { window.__room.sitMs = 600; });
  await pr.click('#btn-cafe-counter'); await pr.waitForTimeout(150);
  r = await room(pr);
  ok(r.ui.stage === 'carry' && r.R.carry && !r.R.props['cafe-tray'] && r.counter === 'btn-cafe-counter', '집어 듦: 내 캐릭터가 쟁반을 들고 걷는다 (playerCarry) · 받는 자리는 빈다');
  await pr.waitForFunction(function () { return APP.cafe.stage === 'eat'; }, null, { timeout: 5000 });
  r = await room(pr);
  ok(r.R.carry === null && r.R.sat && r.ui.seated && r.R.props['cafe-plate'] && r.R.props['cafe-plate'].frame === 0 && r.plate && r.plateName === '딸기 케이크 먹기' && !r.tray, '앉음: 접시를 식탁에 내려놓았다 · 접시 단추 "딸기 케이크 먹기" · 아래 쟁반 판은 없다');
  await shot(pr, '12-room-plate');
  await pr.click('#btn-cafe-plate'); r = await room(pr);
  ok(r.R.props['cafe-plate'].frame === 1 && r.st.tray.left === 2, '접시를 누름: 한 입 (그림 1단계)');
  await pr.click('#btn-cafe-plate'); await pr.click('#btn-cafe-plate'); await pr.waitForTimeout(150);
  r = await room(pr);
  ok(r.st.eaten.cake === 1 && !r.plate && r.R.props['cafe-plate'].frame === 3 && r.card && r.mode === 'stamp' && await pr.locator('#cafe-card .cafe-dots i.on').count() === 1, '세 입: 빈 접시 · 도장 카드에 도장 하나');
  ok(await pr.evaluate(function () { return window.__rec.cake.n; }) === 1 && JSON.stringify(await pr.evaluate(function () { return window.__said.map(function (x) { return x[1]; }); })) === JSON.stringify(['cafe.hello', 'cafe.hello', 'cafe.hello', 'cafe.order', 'cafe.serve', 'cafe.stamp']), 'recipeEat 한 번 · 지킴이 말 차례 (hello · order · serve · stamp)');
  ok(await pr.evaluate(function () { var r = document.getElementById('cafe-card').getBoundingClientRect(); return r.height < 120 && r.width < 320; }), '도장 카드는 작다 (늘어나지 않는다)');
  await shot(pr, '13-room-stamp');
  await pr.waitForFunction(function () { return document.getElementById('cafe-card').hidden; }, null, { timeout: 5000 });
  await pr.click('#btn-cafe-seat'); await pr.waitForTimeout(100);
  r = await room(pr);
  ok(!r.ui.seated && !r.R.props['cafe-plate'] && r.st.tray === null && r.ui.stage === null, '일어남: 빈 접시는 치운다');
  /* 세 번째에 레시피 */
  await pr.evaluate(function () { APP.state.user.cafe.eaten.cake = 2; window.__rec.cake.n = 2; window.__room.sitMs = 100; APP.save(); });
  await roomOrder(pr, 1); await pr.waitForFunction(function () { return APP.cafe.stage === 'ready'; }); await pr.click('#btn-cafe-counter'); await pr.waitForFunction(function () { return APP.cafe.stage === 'eat' && APP.cafe.seated; });
  for (n = 0; n < 3; n++) await pr.click('#btn-cafe-plate');
  await pr.waitForTimeout(150); r = await room(pr);
  ok(r.toast === '딸기 케이크 레시피를 받았어. 집 조리대의 책에 생겼어.' && r.st.gifts.cake === '2026-11-21' && await pr.locator('#cafe-card .cafe-dots i.on').count() === 3, '세 번째: 도장 셋 · 레시피 한 줄');
  await shot(pr, '14-room-gift');
  await pr.click('#btn-cafe-seat'); await pr.waitForTimeout(2400);
  /* 끊김 1: 만드는 중에 문으로 나감 */
  await pr.click('#btn-cafe-menu'); await pr.waitForSelector('#cafe-card:not([hidden]) .cafe-item'); await pr.locator('#cafe-card .cafe-item').nth(2).click(); await pr.waitForSelector('#cafe-card .sew-ask'); await pr.waitForTimeout(700);
  await pr.evaluate(function () { document.querySelector('#cafe-card .sew-yes').click(); window.__enter(null); }); await pr.waitForTimeout(1800);
  r = await room(pr);
  ok(r.ui.stage === null && !r.R.props['cafe-tray'] && !r.plate && r.st.tray.id === 'kkochi' && r.st.tray.left === 3 && r.shells === 60 - 5 - 5 - 4, '만드는 중에 나감: 연출은 걷히고 · 낸 값만큼 접시가 기록에 남는다');
  await pr.evaluate(function () { window.__enter('cafe'); });
  r = await room(pr);
  ok(r.ui.stage === 'eat' && r.R.props['cafe-plate'] && r.R.props['cafe-plate'].frame === 0 && r.plate && !r.ui.seated, '다시 들어옴: 접시가 식탁에서 기다린다 (아직 서 있다)');
  await pr.click('#btn-cafe-plate'); await pr.waitForFunction(function () { return APP.cafe.seated; });
  ok((await room(pr)).st.tray.left === 3, '서서 접시를 누름: 먼저 앉는다 (아직 먹지 않는다)');
  await pr.click('#btn-cafe-plate');
  ok((await room(pr)).st.tray.left === 2, '앉아서 누름: 한 입');
  await pr.click('#btn-cafe-menu'); await pr.waitForTimeout(100);
  ok(!(await room(pr)).card, '먹던 것이 있을 때 칠판: 새로 시키지 않는다');
  /* 끊김 2: 먹다가 일어남 → 접시는 식탁에 */
  await pr.click('#btn-cafe-seat'); await pr.waitForTimeout(100);
  r = await room(pr);
  ok(!r.ui.seated && r.R.props['cafe-plate'] && r.R.props['cafe-plate'].frame === 1 && r.plate && r.st.tray.left === 2, '먹다가 일어남: 먹다 만 접시가 식탁에 남는다');
  /* 끊김 3: 들고 가다 방을 나감 */
  await pr.click('#btn-cafe-plate'); await pr.waitForFunction(function () { return APP.cafe.seated; }); await pr.click('#btn-cafe-plate'); await pr.click('#btn-cafe-plate'); await pr.waitForTimeout(2500); await pr.click('#btn-cafe-seat');
  await pr.evaluate(function () { window.__room.sitMs = 1500; });
  await roomOrder(pr, 0); await pr.waitForFunction(function () { return APP.cafe.stage === 'ready'; }); await pr.click('#btn-cafe-counter'); await pr.waitForTimeout(200);
  await pr.evaluate(function () { window.__enter(null); }); await pr.waitForTimeout(1700);
  r = await room(pr);
  ok(r.R.carry === null && r.ui.stage === null && !r.ui.seated && Object.keys(r.R.props).length === 0 && r.st.tray.id === 'coffee' && r.st.tray.left === 3, '들고 가다 나감: 손은 비고 · 커피는 기록에 남는다');
  await pr.evaluate(function () { window.__room.sitMs = 100; window.__enter('cafe'); });
  await pr.click('#btn-cafe-plate'); await pr.waitForFunction(function () { return APP.cafe.seated; });
  ok((await room(pr)).plateName === '커피 마시기', '커피: 접시 단추 이름 "커피 마시기"');
  for (n = 0; n < 3; n++) await pr.click('#btn-cafe-plate');
  r = await room(pr);
  ok(r.st.eaten.coffee === 1 && !r.card, '커피 세 모금: 도장 카드는 없다');
  /* 끊김 4 (11-22 검증): 걷기가 막혀 앉지 못함 — cafeSit 이 false 로 끝나거나 끝나지 않는다. 그래도 값을 낸 음식은 먹을 수 있다 */
  await pr.evaluate(function () { window.__room.sitFail = 'false'; var s = APP.scene, R = window.__room, orig = s.cafeSit; window.__origSit = orig; s.cafeSit = function (on) { if (!on) return orig(on); return R.sitFail === 'hang' ? new Promise(function () {}) : Promise.resolve(false); }; });
  await roomOrder(pr, 1); await pr.waitForFunction(function () { return APP.cafe.stage === 'ready'; }); await pr.click('#btn-cafe-counter');
  await pr.waitForFunction(function () { return APP.cafe.stage === 'eat'; }, null, { timeout: 5000 });
  r = await room(pr);
  ok(r.R.carry === null && !r.ui.seated && r.R.props['cafe-plate'] && r.plate, '앉기가 막힘 (false): 손은 비고 · 접시는 식탁에 · 접시 단추가 있다');
  await pr.click('#btn-cafe-plate'); r = await room(pr);
  ok(r.st.tray.left === 2, '…서서 먹는다 (한 입)');
  await pr.click('#btn-cafe-plate'); await pr.click('#btn-cafe-plate'); await pr.waitForTimeout(2600);
  ok((await room(pr)).st.eaten.cake === 4 && (await room(pr)).st.tray.left === 0, '…끝까지 먹었다');
  await pr.evaluate(function () { window.__room.sitFail = 'hang'; });
  await roomOrder(pr, 0); await pr.waitForFunction(function () { return APP.cafe.stage === 'ready'; }); await pr.click('#btn-cafe-counter');
  await pr.waitForTimeout(300);
  ok((await room(pr)).ui.stage === 'carry', '앉기가 끝나지 않음: 들고 있는 동안');
  await pr.waitForFunction(function () { return APP.cafe.stage === 'eat'; }, null, { timeout: 15000 });
  r = await room(pr);
  ok(r.R.carry === null && r.R.props['cafe-plate'] && r.plate, '…12초 뒤에는 내려놓는다 (접시가 식탁에)');
  for (n = 0; n < 3; n++) await pr.click('#btn-cafe-plate');
  ok((await room(pr)).st.eaten.coffee === 2, '…서서 다 마셨다');
  await pr.evaluate(function () { APP.scene.cafeSit = window.__origSit; window.__room.sitFail = null; });
  /* 레코드 구석 */
  await pr.click('#btn-cafe-lp'); await pr.waitForSelector('#cafe-card:not([hidden]) .lp-sleeve');
  r = await room(pr);
  ok(r.mode === 'lp' && r.dlg === 0 && await pr.locator('#cafe-card .lp-sleeve').count() === 8 && await pr.locator('#cafe-card #lp-deck').count() === 0 && await pr.locator('#cafe-card #lp-sound').count() === 1, '레코드 단추: 선반 확대 카드 (재킷 여덟 · 스피커 단추 · 판은 방에서 돈다)');
  await shot(pr, '15-room-rack');
  await pr.locator('#cafe-card .lp-sleeve').nth(1).click();
  r = await room(pr);
  ok(r.ui.lp === 'clair' && /^#[0-9a-f]{6}$/.test(r.R.rec || '') && !r.ui.sound && r.ui.music.made === 0, '재킷: 방의 판이 돈다 (cafeRecord 에 재킷 색 ' + r.R.rec + ') · 소리 설정이 꺼져 있어 소리는 없다');
  await pr.click('#cafe-card-close'); await pr.waitForTimeout(600);
  ok((await room(pr)).ui.lp === 'clair', '카드를 닫아도 방 안에서는 판이 계속 돈다');
  await pr.click('#btn-cafe-lp'); await pr.click('#cafe-card #lp-sound'); await pr.waitForTimeout(500);
  r = await room(pr);
  ok(r.ui.sound && r.ui.music.playing === 'clair', '스피커 단추: 소리 설정을 켜면 그 곡이 난다');
  await pr.click('#cafe-card-close');
  await pr.evaluate(function () { window.__enter(null); }); await pr.waitForTimeout(100);
  r = await room(pr);
  ok(r.ui.lp === null && r.R.rec === null && r.ui.music.playing === null && !r.ui.seated, '문으로 나감: 판 · 소리 · 자리가 끝난다');
  await pr.evaluate(function () { AUDIO.setEnabled(false); APP.openCafe(); }); await pr.waitForTimeout(200);
  ok(await pr.locator('#cafe-sheet[open]').count() === 1 && !(await room(pr)).card, '방 밖: 예전 시트가 열린다');
  ok(sR.bag.errors.length === 0 && sR.bag.audio.length === 0, '페이지 오류 없음 · audio/ foley/ 요청 0' + (sR.bag.errors.length ? ': ' + sR.bag.errors.join(' | ') : ''));
  }
  await bR.close();

  console.log('== 10. 3D 폰 화면: 쟁반이 큰 단추에 가리지 않는다');
  var b3 = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var sizes = [[360, 740], [320, 568]];
  for (var i = 0; i < sizes.length; i++) {
    var c3 = await b3.newContext({ viewport: { width: sizes[i][0], height: sizes[i][1] }, deviceScaleFactor: 2, locale: 'ko-KR' });
    await c3.addInitScript(INIT);
    var p3 = await c3.newPage(); await p3.goto(URL0.replace('&scene=2d', ''));
    await p3.waitForSelector('#name-dialog[open]', { timeout: 20000 }); await p3.fill('#name-in', '뚜루'); await p3.click('#name-form button[type=submit]'); await p3.waitForTimeout(600);
    /* 바깥 지도 (갈래 W · V) 가 합쳐진 빌드에서는 카페가 마을에만 있다 (마을 밖에서는 자리가 바로 끝난다) → 마을로 간 뒤에 시킨다 */
    if (await p3.evaluate(function () { return typeof APP.goPlace === 'function' && typeof APP.scene.area === 'function'; })) {
      for (var tries = 0; tries < 12 && await p3.evaluate(function () { return APP.scene.area() !== 'village'; }); tries++) {
        await p3.evaluate(function () { if (APP.room !== 'yard') APP.goRoom('yard'); else APP.goPlace('village'); }); await p3.waitForTimeout(2500);
      }
      ok(await p3.evaluate(function () { return APP.scene.area(); }) === 'village', sizes[i][0] + ' 폭: 마을에 왔다');
    }
    await shells(p3, 20); await orderItem(p3, 1); await p3.waitForTimeout(200);
    var hit = await p3.evaluate(function () { function at(id) { var r = document.getElementById(id).getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!e && !!e.closest('#' + id); } return { mode: APP.sceneMode, stand: at('cafe-stand'), eat: at('cafe-eat') }; });
    ok(hit.stand && hit.eat, sizes[i][0] + ' 폭 (' + hit.mode + '): 먹기 · 일어나기가 맨 위에 있다');
    if (i === 0) await shot(p3, '10-tray-3d');
    await c3.close();
  }
  await b3.close();

  console.log('\n카페 화면: 통과 ' + passes + ' · 실패 ' + failures);
  process.exit(failures ? 1 : 0);
}
main().catch(function (e) { console.error(e); process.exit(1); });
