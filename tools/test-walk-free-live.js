#!/usr/bin/env node
/* tools/test-walk-free-live.js - 문어가 산책하는 동안 캐릭터가 자유롭게 다니는가 (주인 11-24: "문어 산책 보낸 뒤에 방에만 있지 않고 캐릭터는 캐릭터대로 할 일 할 수 있도록").
 *
 *   NODE_PATH=$(npm root -g) node tools/test-walk-free-live.js [--shots <폴더>]
 *
 *   1 출발 의식 동안: 마당 문 단추가 보이고 goRoom('yard') 가 된다 → 마을 → 카페 방
 *   2 문어가 돌아옴 (캐릭터는 카페): 기록은 그 시각에 저장 (done) · 귀가 장면은 미룬다 (homeWaiting) · 알림 한 줄 · 큰 단추 '보러 갈래?' (읽는 이름도 그 말로 시작)
 *     · 장면 설명도 '돌아왔어' · 포스터는 아직 벽에 안 걸림 · 설정의 불러오기 · 지우기 거절 글이 다락으로 가라고 말함
 *   3 집으로 (카페 → 마을 → 마당 → 다락): 그때 귀가 장면 (멀어지는 걸음 없이 귀가 길만) → 문어 집 · 큰 단추 원래대로 · 포스터 벽에
 *   4 놀이방에 있을 때 돌아옴: 구석 쪽지 · 큰 단추 ('보러 갈래?') 는 다락으로 데려가고 거기서 귀가 장면 전부 (데려오기로 줄이지 않는다 — 의식 훅의 skip 이 false)
 *   5 기다리는 중 새로 고침: 기록 그대로 · 문어는 집에서 연다
 *   6 다락에 그대로 있으면: 미루지 않는다 (예전과 같다)
 *   7 탭 둘: 기다리는 동안 다른 탭이 저장해도 여행은 그대로 · 낡은 사본의 늦은 저장 (60 초 안) 엔 여행을 다시 얹는다 · 다른 탭이 전체 초기화하면 새 기록에 옛 산책을 다시 넣지 않는다
 *     · 돌아온 지 오래된 (60 초 뒤) 여행이 빠진 기록 (옛 파일 불러오기) 에도 다시 넣지 않는다 (검토 11-24)
 *   8 산책 중 놀이방에서 혼자 먹기: 요리를 들고 가서 앉아 먹는 것이 끊기지 않는다 (검토 11-24)
 *   9 출발 의식 중 마당에 나갔다 바로 돌아오기: 문간을 지나는 문어 위에 서지 않는다 · 그 뒤 산책은 다락에서 끝까지
 *   위키 요청은 대역 (smoke 의 routeWiki 처럼) — 두뇌가 느린 망에 묶이지 않게
 */
'use strict';
var path = require('path'), fs = require('fs');
var chromium = require('playwright').chromium;
var ROOT = path.resolve(__dirname, '..');
var SHOTS = process.argv.indexOf('--shots') >= 0 ? process.argv[process.argv.indexOf('--shots') + 1] : null;
var URL0 = 'file://' + path.join(ROOT, 'index.html') + '?intro=0';
var WIKI_OK = { query: { pages: { '1': { pageid: 1, title: '모자', extract: '모자는 머리에 쓰는 물건이다. 햇빛과 추위를 막는다.', links: [{ ns: 0, title: '깃털' }, { ns: 0, title: '밀짚' }] } } } };
var passes = 0, failures = 0;
function ok(c, msg) { if (c) { passes++; console.log('  ok   ' + msg); } else { failures++; console.log('  FAIL ' + msg); } }
async function context(browser) {
  var ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, locale: 'ko-KR' });
  await ctx.addInitScript(function () { window.__ppolTest = { today: '2026-11-24', forceKind: 'out' };   /* 데모 규칙이 '집에 있을래' 를 고르면 산책이 없다 — 시험은 늘 산책으로 */ window.__ppolAwakeMs = 0; window.__ppolLook = { hour: 14 }; });
  await ctx.route('https://ko.wikipedia.org/**', function (route) { return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(WIKI_OK) }); });
  return ctx;
}
async function page(ctx, bag, name) {
  var p = await ctx.newPage();
  p.on('pageerror', function (e) { bag.errors.push(e.message); });
  await p.goto(URL0);
  if (name) { await p.waitForSelector('#name-dialog[open]', { timeout: 40000 }); await p.fill('#name-in', name); await p.click('#name-form button[type=submit]'); await p.waitForSelector('#name-dialog[open]', { state: 'hidden' }); }
  else await p.waitForFunction(function () { return window.APP && APP.scene && document.documentElement.classList.contains('booted'); }, null, { timeout: 40000 });
  await p.waitForTimeout(2500);
  return p;
}
function until(p, fn, ms, arg) { return p.waitForFunction(fn, arg, { timeout: ms || 60000, polling: 200 }).then(function () { return true; }, function () { return false; }); }
function st(p) { return p.evaluate(function () { var s = APP.scene, t = APP.state.trips.slice(-1)[0] || {}, n = document.getElementById('back-note'), go = document.getElementById('btn-go'), pw = document.querySelector('[data-posters]'); return { cer: APP.ceremony, view: s.view(), room: APP.room, area: s.area ? s.area() : null, inRoom: s.inRoom ? s.inRoom() : null, trip: t.status, tripId: t.id, poster: !!t.poster && t.posterHung !== false, wait: APP.homeWaiting, away: go.classList.contains('away'), goTxt: go.textContent.trim(), goName: go.getAttribute('aria-label') || '', note: n && !n.hidden ? document.getElementById('back-note-txt').textContent : '', toast: document.getElementById('toast').classList.contains('show') ? document.getElementById('toast').textContent : '', posters: pw ? +pw.dataset.posters : -1, desc: (document.getElementById('scene-desc') || {}).textContent || '', yardBtn: !document.getElementById('btn-yard').hidden }; }); }
async function shot(p, n) { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await p.waitForTimeout(300); await p.screenshot({ path: path.join(SHOTS, n + '.png') }); }
async function goVillage(p) {
  for (var i = 0; i < 12 && await p.evaluate(function () { return APP.scene.area() !== 'village'; }); i++) { await p.evaluate(function () { if (APP.room !== 'yard') APP.goRoom('yard'); else APP.goPlace('village'); }); await p.waitForTimeout(2500); }
}
async function invite(p) {   /* 큰 단추로 새 산책을 시작 (쉬는 중이면 첫 톡은 깨우기일 수 있다) → 출발 의식까지. 한 번 시작된 차례는 다시 누르지 않는다 (누르면 데려오기가 된다) */
  for (var i = 0; i < 4; i++) {
    await until(p, function () { return !APP.goResting && !document.querySelector('dialog[open]'); }, 60000); await p.waitForTimeout(700);
    var n = await p.evaluate(function () { return APP.state.trips.length; });
    await p.click('#btn-go');
    if (await until(p, function (k) { return APP.state.trips.length > k; }, 5000, n)) return until(p, function () { return APP.ceremony === 'depart'; }, 30000);
  }
  return false;
}
function cerSpy(p) { return p.evaluate(function () { window.__cers = []; if (!window.AUDIO || window.__spyOn) return; window.__spyOn = 1; var on0 = AUDIO.on; AUDIO.on = function (n, d) { if (n === 'ceremony' && d) window.__cers.push({ kind: d.kind, skip: !!d.skip }); return on0.apply(this, arguments); }; }); }
async function main() {
  var browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  var bag = { errors: [] }, ctx = await context(browser), p = await page(ctx, bag, '뚜루'), r;

  console.log('== 1. 출발 의식 동안 마당으로 · 마을 · 카페');
  var wall0 = (await st(p)).posters;
  ok(wall0 >= 0, '벽 포스터 수를 읽는다 (' + wall0 + ')');
  await p.click('#btn-go');
  ok(await until(p, function () { return APP.ceremony === 'depart'; }, 30000), '산책 갈래 → 출발 의식');
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
  ok(await until(p, function () { var t = APP.state.trips.slice(-1)[0]; return t && t.status === 'done'; }, 150000), '여행 기록이 돌아온 시각에 저장됨 (done)');
  ok(await until(p, function () { return APP.homeWaiting === true; }, 10000), '귀가 장면은 미룬다 (homeWaiting)');
  await p.waitForTimeout(300);
  r = await st(p);
  ok(/돌아왔어/.test(r.toast + r.note), '한 줄: "' + (r.note || r.toast) + '"');
  ok(r.inRoom === 'cafe' && r.cer !== 'return', '캐릭터는 카페에 그대로 · 귀가 의식은 아직');
  ok(r.goTxt === '보러 갈래?' && r.goName.indexOf('보러 갈래?') === 0, '큰 단추: "보러 갈래?" · 읽는 이름도 그 말로 시작 ("' + r.goName + '")');
  ok(/돌아왔어/.test(r.desc) && !/산책 나갔어/.test(r.desc), '장면 설명도 돌아왔다고 ("' + r.desc + '")');
  ok(r.posters === wall0, '포스터는 아직 벽에 안 걸림 (' + r.posters + ')');
  var rf = await p.evaluate(function () { var t = document.getElementById('toast'); return { imp: APP.importJSON('{}') === false ? t.textContent : '' }; });
  ok(/돌아왔어/.test(rf.imp) && /다락/.test(rf.imp) && !/다녀오는 중/.test(rf.imp), '불러오기 거절 글이 다락으로 가라고 말함 ("' + rf.imp + '")');
  await shot(p, 'after-2-cafe-note');
  await p.waitForTimeout(3000);
  r = await st(p);
  ok(r.wait && r.inRoom === 'cafe', '3초 뒤에도 기다린다 (캐릭터를 다락으로 끌고 가지 않는다)');

  console.log('== 3. 집으로 → 그때 귀가 장면');
  await cerSpy(p);
  await p.evaluate(function () { return APP.goOutside(); }); await until(p, function () { return !APP.scene.inRoom(); }, 30000);
  r = await st(p); ok(r.wait, '카페를 나와 마을: 아직 기다린다');
  await p.evaluate(function () { return APP.goPlace('home'); }); await p.waitForTimeout(2500);
  r = await st(p); ok(!r.wait || /돌아왔어/.test(r.note), '마당: 구석 쪽지가 다시 ("' + r.note + '")');
  await p.evaluate(function () { return APP.goRoom('attic'); });
  ok(await until(p, function () { return !APP.room; }, 40000), '다락 (이야기 장소) 으로 들어왔다');
  ok(await until(p, function () { return APP.homeWaiting === false; }, 5000), '기다림이 풀렸다');
  ok(await until(p, function () { return APP.ceremony === 'return'; }, 10000), '귀가 장면이 지금 나온다');
  await shot(p, 'after-3-home-scene');
  ok(await until(p, function () { return !document.getElementById('btn-go').classList.contains('away') && !APP.ceremony; }, 90000), '문어가 집에 들어왔다 · 큰 단추 원래대로');
  var c3 = await p.evaluate(function () { return window.__cers; });
  ok(c3.length && c3.every(function (c) { return c.kind === 'return' && !c.skip; }), '다락에서 본 장면은 귀가 길만 (멀어지는 걸음 없음 · 줄이지 않음): ' + JSON.stringify(c3));
  r = await st(p);
  ok(r.view === 'attic', '다락에 있다');
  ok(await until(p, function (w) { var e = document.querySelector('[data-posters]'), t = APP.state.trips.slice(-1)[0]; return !!e && +e.dataset.posters === w + (t && t.poster && t.posterHung !== false ? 1 : 0); }, 8000, wall0), '포스터가 이제 벽에 (' + (await st(p)).posters + ')');
  ok(bag.errors.length === 0, '페이지 오류 없음' + (bag.errors.length ? ': ' + bag.errors.join(' | ') : ''));
  await shot(p, 'after-4-home');

  console.log('== 4. 놀이방에서 기다리다 큰 단추로 데려오기');
  ok(await invite(p), '다음 산책 출발');
  g = await p.evaluate(function () { return APP.goRoom('play'); });
  ok(g && g.ok, '출발 의식 동안 놀이방으로');
  ok(await until(p, function () { return APP.homeWaiting === true; }, 150000), '돌아옴: 놀이방이라 미룬다');
  await until(p, function () { return !!document.getElementById('back-note-txt').textContent; }, 3000);
  r = await st(p);
  ok(/돌아왔어/.test(r.note), '구석 쪽지: "' + r.note + '"');
  await shot(p, 'after-5-play-note');
  await cerSpy(p);
  await p.click('#btn-go');
  ok(await until(p, function () { return !APP.room && !APP.homeWaiting; }, 30000), '큰 단추 "보러 갈래?": 다락으로 데려간다');
  ok(await until(p, function () { return APP.ceremony === 'return'; }, 10000), '…거기서 귀가 장면');
  ok(await p.evaluate(function () { return document.getElementById('btn-go').textContent.trim(); }) === '다녀오는 중…', '…장면 동안 큰 단추는 "다녀오는 중…"');
  ok(await until(p, function () { return !document.getElementById('btn-go').classList.contains('away') && !APP.ceremony; }, 90000), '…문어가 집에 들어왔다');
  var c4 = await p.evaluate(function () { return window.__cers; });
  ok(c4.length && c4.every(function (c) { return !c.skip; }) && c4.some(function (c) { return c.kind === 'return'; }), '…줄이지 않은 귀가 (의식 훅 skip 모두 false): ' + JSON.stringify(c4));

  console.log('== 5. 기다리는 중 새로 고침');
  await p.evaluate(function () { return APP.goRoom('attic'); }); await until(p, function () { return !APP.room; }, 30000);
  ok(await invite(p), '다음 산책 출발');
  var g5 = await p.evaluate(function () { return APP.goRoom('yard'); });
  ok(g5 && g5.ok && await until(p, function () { return APP.room === 'yard'; }, 20000), '출발 의식 동안 마당으로');
  ok(await until(p, function () { return APP.homeWaiting === true; }, 150000), '마당에서 기다림');
  var id = (await st(p)).tripId, n0 = await p.evaluate(function () { return APP.state.trips.length; });
  await p.reload(); await p.waitForTimeout(3000);
  r = await p.evaluate(function (tid) { var t = APP.state.trips.filter(function (x) { return x.id === tid; })[0]; return { n: APP.state.trips.length, status: t && t.status, away: document.getElementById('btn-go').classList.contains('away'), wait: APP.homeWaiting }; }, id);
  ok(r.n === n0 && r.status === 'done' && !r.away && !r.wait, '새로 고침: 그 여행 기록 그대로 (done) · 문어는 집 · 기다림 없음 (' + JSON.stringify(r) + ')');

  console.log('== 6. 다락에 그대로 있으면 미루지 않는다');
  await p.evaluate(function () { window.__w = false; setInterval(function () { if (APP.homeWaiting) window.__w = true; }, 100); });
  ok(await invite(p), '다음 산책 출발');
  ok(await until(p, function () { var t = APP.state.trips.slice(-1)[0]; return t && t.status === 'done' && !document.getElementById('btn-go').classList.contains('away') && !APP.ceremony; }, 150000), '다락에서 끝까지 지켜봄');
  ok(!(await p.evaluate(function () { return window.__w; })), '한 번도 미루지 않았다');
  ok(bag.errors.length === 0, '페이지 오류 없음' + (bag.errors.length ? ': ' + bag.errors.join(' | ') : ''));
  await ctx.close();

  console.log('== 7. 탭 둘 (같은 기록)');
  var KEY = 'ppolppol_v2';
  function stale(pg, raw) { return pg.evaluate(function (a) { var s = JSON.parse(a.raw); s.settings.lastSeen = Date.now(); localStorage.setItem(a.k, JSON.stringify(s)); }, { raw: raw, k: KEY }); }   /* 그 여행이 생기기 전의 기록을 다른 탭이 쓴다 (낡은 사본의 늦은 저장) */
  function stored(pg, tid) { return pg.evaluate(function (a) { var s = JSON.parse(localStorage.getItem(a.k) || 'null'), t = s && s.trips.filter(function (x) { return x.id === a.tid; })[0]; return s ? { n: s.trips.length, status: t ? t.status : null, lantern: s.room.lantern, posters: s.room.posterOrder.length, invites: s.octopus.invites, wait: APP.homeWaiting, away: document.getElementById('btn-go').classList.contains('away'), mem: APP.state.trips.some(function (x) { return x.id === a.tid; }) } : null; }, { k: KEY, tid: tid }); }
  var bag7 = { errors: [] }, ctx7 = await context(browser), a = await page(ctx7, bag7, '뚜루');
  var rec0 = await a.evaluate(function (k) { return localStorage.getItem(k); }, KEY);
  ok(await invite(a), '탭 A: 산책 출발');
  ok((await a.evaluate(function () { return APP.goRoom('yard'); })).ok, '탭 A: 마당으로');
  ok(await until(a, function () { return APP.homeWaiting === true; }, 150000), '탭 A: 귀가 장면을 기다린다');
  var tA = (await st(a)).tripId;
  var b = await page(ctx7, bag7, null);
  /* 같은 문어의 다른 탭이 저장 (설정 한 칸) → 기다리는 여행은 기록에 그대로 */
  await b.click('#btn-settings'); await b.waitForSelector('#settings-sheet[open]', { timeout: 10000 }); await b.waitForTimeout(700);
  await b.evaluate(function () { document.getElementById('set-thumbs').click(); });   /* 설정 한 칸 = 같은 문어의 저장 */
  await a.waitForTimeout(1200);
  var keep = await a.evaluate(function (tid) { var s = JSON.parse(localStorage.getItem('ppolppol_v2') || 'null'), t = s && s.trips.filter(function (x) { return x.id === tid; })[0]; return { status: t && t.status, wait: APP.homeWaiting }; }, tA);
  ok(keep.status === 'done' && keep.wait === true, '같은 문어 탭 B 가 저장해도: 여행은 기록에 그대로 (done) · A 는 계속 기다림 (' + JSON.stringify(keep) + ')');
  /* 낡은 사본의 늦은 저장 (그 여행이 없는 기록) 이 돌아온 지 60 초 안에 오면: 기다리던 탭이 여행을 다시 얹는다 (잃지 않는다 · 두 번 세지 않는다) */
  var was = await stored(a, tA);
  await stale(b, rec0); await a.waitForTimeout(1500);
  var back = await stored(a, tA);
  ok(back.status === 'done' && back.wait === true && back.n === was.n && back.invites === was.invites && back.lantern === was.lantern && back.posters === was.posters, '낡은 사본이 덮어써도 (60 초 안): 여행을 다시 얹음 · 수는 그대로 (' + JSON.stringify(back) + ')');
  /* 다른 탭이 전체 초기화 (다른 문어) → 새 기록에 옛 산책이 들어가지 않는다 */
  await b.evaluate(function () { var r = document.getElementById('set-reset'); r.click(); r.click(); });   /* 전체 초기화 (두 번 눌러야 지운다) */
  await b.waitForTimeout(500);
  ok(await until(a, function () { return APP.homeWaiting === false && !document.getElementById('btn-go').classList.contains('away'); }, 30000), '탭 A: 기다림이 끝나고 큰 단추 원래대로 (남은 장면은 빨리 감음)');
  await a.waitForTimeout(1500);
  var rec = await a.evaluate(function (tid) { var s = JSON.parse(localStorage.getItem('ppolppol_v2') || 'null'); return s ? { n: s.trips.length, has: s.trips.some(function (x) { return x.id === tid; }), lantern: s.room.lantern, posters: s.room.posterOrder.length, name: s.octopus.name || '', aTrips: APP.state.trips.length } : null; }, tA);
  ok(rec && !rec.has && rec.n === 0 && rec.lantern === 0 && rec.posters === 0 && rec.aTrips === 0, '초기화한 기록에 옛 산책 · 등불 · 포스터가 다시 들어가지 않음 (' + JSON.stringify(rec) + ')');
  ok(bag7.errors.length === 0, '페이지 오류 없음' + (bag7.errors.length ? ': ' + bag7.errors.join(' | ') : ''));
  await ctx7.close();

  console.log('== 7b. 탭 둘: 돌아온 지 오래된 여행이 빠진 기록 (다른 탭이 옛 파일을 불러옴)');
  var bag7b = { errors: [] }, ctx7b = await context(browser), a2 = await page(ctx7b, bag7b, '뚜루');
  var rec1 = await a2.evaluate(function (k) { return localStorage.getItem(k); }, KEY), base1 = JSON.parse(rec1);
  ok(await invite(a2), '탭 A: 산책 출발');
  ok((await a2.evaluate(function () { return APP.goRoom('yard'); })).ok, '탭 A: 마당으로');
  ok(await until(a2, function () { return APP.homeWaiting === true; }, 150000), '탭 A: 귀가 장면을 기다린다');
  var tA2 = (await st(a2)).tripId;
  await a2.evaluate(function (tid) { APP.state.trips.forEach(function (x) { if (x.id === tid) x.endedAt -= 120000; }); }, tA2);   /* 돌아온 지 2분 지난 것으로 (기다림은 몇 시간일 수도 있다) */
  var b2 = await page(ctx7b, bag7b, null);
  await stale(b2, rec1);
  ok(await until(a2, function () { return APP.homeWaiting === false && !document.getElementById('btn-go').classList.contains('away'); }, 30000), '탭 A: 기다림이 끝나고 큰 단추 원래대로');
  await a2.waitForTimeout(1500);
  var old = await stored(a2, tA2);
  ok(old && old.status === null && !old.mem && old.n === base1.trips.length && old.lantern === base1.room.lantern && old.posters === base1.room.posterOrder.length && old.invites === base1.octopus.invites, '일부러 바꾼 기록 (60 초 뒤): 옛 산책을 다시 얹지 않음 (' + JSON.stringify(old) + ')');
  ok(bag7b.errors.length === 0, '페이지 오류 없음' + (bag7b.errors.length ? ': ' + bag7b.errors.join(' | ') : ''));
  await ctx7b.close();

  console.log('== 8. 산책 중 놀이방에서 혼자 먹기');
  var bag8 = { errors: [] }, ctx8 = await context(browser), m = await page(ctx8, bag8, '뚜루');
  ok(await invite(m), '산책 출발');
  ok((await m.evaluate(function () { return APP.goRoom('play'); })).ok && await until(m, function () { return APP.room === 'play' && !document.getElementById('btn-table').hidden; }, 20000), '출발 의식 동안 놀이방으로');
  await m.evaluate(function () { APP.cookMsgTest({ ppolCook: 'result', v: 1, id: 'ck_walk1', recipe: 'gyeran', seed: 5, look: { band: 1 }, day: '2026-11-24' }); });
  ok(await until(m, function () { return !!(APP.state.user.table && APP.state.user.table.id === 'ck_walk1'); }, 5000), '요리가 기록 · 식탁에');
  ok(await m.evaluate(function () { return APP.cookServe('table'); }) === true, '산책 중에도 요리를 들고 간다 (cookServe table)');
  ok(await until(m, function () { return !APP.mealBusy(); }, 30000), '…내려놓음');
  await m.evaluate(function () { APP.mealTableTap(document.getElementById('btn-table')); });
  ok(await until(m, function () { return APP.scene.tableInfo && APP.scene.tableInfo().me === 'seated'; }, 10000), '식탁에 앉음');
  await m.evaluate(function () { window.__close = false; setInterval(function () { var c = document.getElementById('meal-close'); if (c && !c.hidden) window.__close = true; }, 100); APP.mealTableTap(document.getElementById('btn-table')); });
  await m.waitForTimeout(1500);
  var mid = await m.evaluate(function () { return { meal: APP.meal, busy: APP.state.trips.slice(-1)[0].status }; });
  ok(mid.meal && mid.meal.stage === 'eating', '1.5 초 뒤에도 먹는 중 (끊기지 않음 · ' + JSON.stringify(mid) + ')');
  ok(await until(m, function () { return !APP.meal; }, 60000), '…다 먹음');
  var ate = await m.evaluate(function () { var e = (APP.state.user.meals || []).filter(function (x) { return x.dish === 'ck_walk1'; })[0]; return { ate: e && e.ate ? e.ate : null, close: window.__close }; });
  ok(ate.ate && ate.close, '먹은 기록과 큰 그림 (' + JSON.stringify(ate) + ')');
  ok(bag8.errors.length === 0, '페이지 오류 없음' + (bag8.errors.length ? ': ' + bag8.errors.join(' | ') : ''));
  await ctx8.close();

  console.log('== 9. 출발 의식 중 마당에 나갔다 바로 돌아오기');
  var bag9 = { errors: [] }, ctx9 = await context(browser), q = await page(ctx9, bag9, '뚜루');
  ok(await invite(q), '산책 출발');
  ok((await q.evaluate(function () { return APP.goRoom('yard'); })).ok && await q.waitForFunction(function () { return APP.room === 'yard'; }, null, { timeout: 20000, polling: 50 }).then(function () { return true; }, function () { return false; }), '마당으로');
  var g9 = await q.evaluate(function () { return APP.goRoom('attic'); });
  ok(g9 && g9.ok, '출발 의식 중에도 다락으로 돌아온다 (' + JSON.stringify(g9 && { ok: g9.ok, reason: g9.reason }) + ')');
  await q.waitForFunction(function () { return !APP.room; }, null, { timeout: 20000, polling: 50 }).catch(function () {});
  var m9 = await q.evaluate(function () { var m = APP.scene.motion(), a = m.player && m.player.at, o = m.gait.at; return { cer: m.ceremony, vis: m.octVisible, place: m.place, d: a && o ? +Math.hypot(a[0] - o[0], a[2] - o[2]).toFixed(2) : null, pl: a, oct: o }; });
  if (m9.cer === 'depart' && m9.vis && m9.place === 'attic') ok(m9.d !== null && m9.d >= 0.3, '문어가 문간을 지나는 중이면 그 위에 서지 않는다 (사이 ' + m9.d + ' m · ' + JSON.stringify(m9) + ')');
  else ok(true, '문어는 이미 나갔다 — 겹칠 것 없음 (' + JSON.stringify({ cer: m9.cer, vis: m9.vis, place: m9.place }) + ')');
  ok(await until(q, function () { var t = APP.state.trips.slice(-1)[0]; return t && t.status === 'done' && !document.getElementById('btn-go').classList.contains('away') && !APP.ceremony; }, 180000), '다락에서 끝까지 (산책 · 귀가)');
  ok(bag9.errors.length === 0, '페이지 오류 없음' + (bag9.errors.length ? ': ' + bag9.errors.join(' | ') : ''));
  await ctx9.close();

  await browser.close();
  console.log('\n산책 중 자유: 통과 ' + passes + ' · 실패 ' + failures);
  process.exit(failures ? 1 : 0);
}
main().catch(function (e) { console.error(e); process.exit(1); });
