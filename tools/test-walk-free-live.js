#!/usr/bin/env node
/* tools/test-walk-free-live.js - 문어가 산책하는 동안 캐릭터가 자유롭게 다니는가 (주인 11-24: "문어 산책 보낸 뒤에 방에만 있지 않고 캐릭터는 캐릭터대로 할 일 할 수 있도록").
 *
 *   NODE_PATH=$(npm root -g) node tools/test-walk-free-live.js [--shots <폴더>]
 *
 *   1 출발 의식 동안: 마당 문 단추가 보이고 goRoom('yard') 가 된다 → 마을 → 카페 방
 *   2 문어가 돌아옴 (캐릭터는 카페): 기록은 그 시각에 저장 (done) · 귀가 장면은 미룬다 (homeWaiting) · 알림 한 줄 · 포스터는 아직 벽에 안 걸림
 *   3 집으로 (카페 → 마을 → 마당 → 다락): 그때 귀가 장면 → 문어 집 · 큰 단추 원래대로 · 포스터 벽에
 *   4 놀이방에 있을 때 돌아옴: 구석 쪽지 · 큰 단추 (데려오기) 로 바로 짧은 귀가
 *   5 기다리는 중 새로 고침: 기록 그대로 · 문어는 집에서 연다
 *   6 다락에 그대로 있으면: 미루지 않는다 (예전과 같다)
 */
'use strict';
var path = require('path'), fs = require('fs');
var chromium = require('playwright').chromium;
var ROOT = path.resolve(__dirname, '..');
var SHOTS = process.argv.indexOf('--shots') >= 0 ? process.argv[process.argv.indexOf('--shots') + 1] : null;
var URL0 = 'file://' + path.join(ROOT, 'index.html') + '?intro=0';
var passes = 0, failures = 0;
function ok(c, msg) { if (c) { passes++; console.log('  ok   ' + msg); } else { failures++; console.log('  FAIL ' + msg); } }
async function open(browser) {
  var ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, locale: 'ko-KR' });
  await ctx.addInitScript(function () { window.__ppolTest = { today: '2026-11-24', forceKind: 'out' };   /* 데모 규칙이 '집에 있을래' 를 고르면 산책이 없다 — 시험은 늘 산책으로 */ window.__ppolAwakeMs = 0; window.__ppolLook = { hour: 14 }; });
  var page = await ctx.newPage(), bag = { errors: [] };
  page.on('pageerror', function (e) { bag.errors.push(e.message); });
  await page.goto(URL0);
  await page.waitForSelector('#name-dialog[open]', { timeout: 40000 }); await page.fill('#name-in', '뚜루'); await page.click('#name-form button[type=submit]');
  await page.waitForSelector('#name-dialog[open]', { state: 'hidden' }); await page.waitForTimeout(2500);
  return { ctx: ctx, page: page, bag: bag };
}
function until(p, fn, ms, arg) { return p.waitForFunction(fn, arg, { timeout: ms || 60000, polling: 200 }).then(function () { return true; }, function () { return false; }); }
function st(p) { return p.evaluate(function () { var s = APP.scene, t = APP.state.trips.slice(-1)[0] || {}, n = document.getElementById('back-note'), go = document.getElementById('btn-go'); return { cer: APP.ceremony, view: s.view(), room: APP.room, area: s.area ? s.area() : null, inRoom: s.inRoom ? s.inRoom() : null, trip: t.status, tripId: t.id, wait: APP.homeWaiting, away: go.classList.contains('away'), note: n && !n.hidden ? document.getElementById('back-note-txt').textContent : '', toast: document.getElementById('toast').classList.contains('show') ? document.getElementById('toast').textContent : '', wall: (APP.state.room.posterOrder || []).length, yardBtn: !document.getElementById('btn-yard').hidden }; }); }
async function shot(p, n) { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await p.waitForTimeout(300); await p.screenshot({ path: path.join(SHOTS, n + '.png') }); }
async function goVillage(p) {
  for (var i = 0; i < 12 && await p.evaluate(function () { return APP.scene.area() !== 'village'; }); i++) { await p.evaluate(function () { if (APP.room !== 'yard') APP.goRoom('yard'); else APP.goPlace('village'); }); await p.waitForTimeout(2500); }
}

async function invite(p) {   /* 큰 단추로 새 산책을 시작 (쉬는 중이면 첫 톡은 깨우기일 수 있다) → 출발 의식까지 */
  for (var i = 0; i < 4; i++) {
    await until(p, function () { return !APP.goResting && !document.querySelector('dialog[open]'); }, 60000); await p.waitForTimeout(700);
    var n = await p.evaluate(function () { return APP.state.trips.length; });
    await p.click('#btn-go');
    if (await until(p, function (k) { return APP.state.trips.length > k && APP.ceremony === 'depart'; }, 15000, n)) return true;
  }
  return false;
}
async function main() {
  var browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var s = await open(browser), p = s.page, r;

  console.log('== 1. 출발 의식 동안 마당으로 · 마을 · 카페');
  var wall0 = (await st(p)).wall;
  await p.click('#btn-go');
  ok(await until(p, function () { return APP.ceremony === 'depart'; }, 15000), '산책 갈래 → 출발 의식');
  r = await st(p);
  ok(r.yardBtn, '출발 의식 동안 마당 문 단추가 보인다');
  await shot(p, 'after-1-depart');
  var g = await p.evaluate(function () { return APP.goRoom('yard'); });
  ok(g && g.ok === true, '출발 의식 동안 goRoom(\'yard\') 가 된다 (' + JSON.stringify(g) + ')');
  r = await st(p);
  ok(r.view === 'yard', '마당에 나왔다');
  await goVillage(p);
  ok((await st(p)).area === 'village', '마을로 갔다');
  var gi = await p.evaluate(function () { return typeof APP.goInside === 'function' ? APP.goInside('cafe') : null; });
  ok(gi === null || await until(p, function () { return APP.scene.inRoom() === 'cafe'; }, 40000), '카페 방에 들어갔다');

  console.log('== 2. 문어가 돌아옴 (캐릭터는 밖)');
  ok(await until(p, function () { var t = APP.state.trips.slice(-1)[0]; return t && t.status === 'done'; }, 120000), '여행 기록이 돌아온 시각에 저장됨 (done)');
  ok(await until(p, function () { return APP.homeWaiting === true; }, 10000), '귀가 장면은 미룬다 (homeWaiting)');
  await p.waitForTimeout(300);
  r = await st(p);
  ok(/돌아왔어/.test(r.toast + r.note), '한 줄: "' + (r.note || r.toast) + '"');
  ok(r.inRoom === 'cafe' && r.cer !== 'return', '캐릭터는 카페에 그대로 · 귀가 의식은 아직');
  ok(await p.evaluate(function () { return document.getElementById('btn-go').textContent.trim(); }) === '보러 갈래?', '큰 단추: "보러 갈래?"');
  await shot(p, 'after-2-cafe-note');
  await p.waitForTimeout(3000);
  r = await st(p);
  ok(r.wait && r.inRoom === 'cafe', '3초 뒤에도 기다린다 (캐릭터를 다락으로 끌고 가지 않는다)');

  console.log('== 3. 집으로 → 그때 귀가 장면');
  await p.evaluate(function () { return APP.goOutside(); }); await until(p, function () { return !APP.scene.inRoom(); }, 30000);
  r = await st(p); ok(r.wait, '카페를 나와 마을: 아직 기다린다');
  await p.evaluate(function () { return APP.goPlace('home'); }); await p.waitForTimeout(2500);
  await p.evaluate(function () { return APP.goRoom('attic'); });
  ok(await until(p, function () { return !APP.room; }, 40000), '다락 (이야기 장소) 으로 들어왔다');
  ok(await until(p, function () { return APP.homeWaiting === false; }, 5000), '기다림이 풀렸다');
  ok(await until(p, function () { return APP.ceremony === 'return' || APP.ceremony === 'leave'; }, 10000), '귀가 장면이 지금 나온다');
  await shot(p, 'after-3-home-scene');
  ok(await until(p, function () { return !document.getElementById('btn-go').classList.contains('away') && !APP.ceremony; }, 90000), '문어가 집에 들어왔다 · 큰 단추 원래대로');
  r = await st(p);
  ok(r.view === 'attic', '다락에 있다');
  ok(s.bag.errors.length === 0, '페이지 오류 없음' + (s.bag.errors.length ? ': ' + s.bag.errors.join(' | ') : ''));
  await shot(p, 'after-4-home');

  console.log('== 4. 놀이방에서 기다리다 큰 단추로 데려오기');
  ok(await invite(p), '다음 산책 출발');
  g = await p.evaluate(function () { return APP.goRoom('play'); });
  ok(g && g.ok, '출발 의식 동안 놀이방으로');
  ok(await until(p, function () { return APP.homeWaiting === true; }, 120000), '돌아옴: 놀이방이라 미룬다');
  r = await st(p);
  ok(/돌아왔어/.test(r.note), '구석 쪽지: "' + r.note + '"');
  await shot(p, 'after-5-play-note');
  await p.click('#btn-go');
  ok(await until(p, function () { return !APP.room && !APP.homeWaiting; }, 30000), '큰 단추 "보러 갈래?": 다락으로 데려간다');
  ok(await until(p, function () { return APP.ceremony === 'return' || APP.ceremony === 'leave'; }, 10000), '…거기서 귀가 장면 (줄이지 않는다)');
  ok(await p.evaluate(function () { return document.getElementById('btn-go').textContent.trim(); }) === '다녀오는 중…', '…장면 동안 큰 단추는 "다녀오는 중…"');
  ok(await until(p, function () { return !document.getElementById('btn-go').classList.contains('away') && !APP.ceremony; }, 90000), '…문어가 집에 들어왔다');

  console.log('== 5. 기다리는 중 새로 고침');
  await p.evaluate(function () { return APP.goRoom('attic'); }); await until(p, function () { return !APP.room; }, 30000);
  var dep5 = await invite(p);
  var g5 = await p.evaluate(function () { return APP.goRoom('yard'); });
  await until(p, function () { return APP.homeWaiting === true; }, 120000);
  ok(await p.evaluate(function () { return APP.homeWaiting === true; }), '마당에서 기다림');
  var id = (await st(p)).tripId, n0 = await p.evaluate(function () { return APP.state.trips.length; });
  await p.reload(); await p.waitForTimeout(3000);
  r = await p.evaluate(function (tid) { var t = APP.state.trips.filter(function (x) { return x.id === tid; })[0]; return { n: APP.state.trips.length, status: t && t.status, away: document.getElementById('btn-go').classList.contains('away'), wait: APP.homeWaiting }; }, id);
  ok(r.n === n0 && r.status === 'done' && !r.away && !r.wait, '새로 고침: 그 여행 기록 그대로 (done) · 문어는 집 · 기다림 없음 (' + JSON.stringify(r) + ')');

  console.log('== 6. 다락에 그대로 있으면 미루지 않는다');
  await p.evaluate(function () { window.__w = false; setInterval(function () { if (APP.homeWaiting) window.__w = true; }, 100); });
  ok(await invite(p), '다음 산책 출발');
  ok(await until(p, function () { var t = APP.state.trips.slice(-1)[0]; return t && t.status === 'done' && !document.getElementById('btn-go').classList.contains('away') && !APP.ceremony; }, 150000), '다락에서 끝까지 지켜봄');
  ok(!(await p.evaluate(function () { return window.__w; })), '한 번도 미루지 않았다');
  ok(s.bag.errors.length === 0, '페이지 오류 없음' + (s.bag.errors.length ? ': ' + s.bag.errors.join(' | ') : ''));
  await browser.close();
  console.log('\n산책 중 자유: 통과 ' + passes + ' · 실패 ' + failures);
  process.exit(failures ? 1 : 0);
}
main().catch(function (e) { console.error(e); process.exit(1); });
