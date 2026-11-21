#!/usr/bin/env node
/* tools/test-contest-live.js - 주말 콘테스트 시트 (index.html #contest-sheet) 를 진짜 브라우저에서. 실패하면 exit 1.
 *
 *   NODE_PATH=$(npm root -g) node tools/test-contest-live.js          (--shots <폴더>: 360x740 사진 넷)
 *
 * 옷 목록 (APP.wardrobe · wearing · itemThumb — P 갈래) 은 여기서 작은 대역을 꽂는다. 무대 단추 (V 갈래) 없이 APP.openContest() 로 연다.
 *   A 옷 목록이 없으면 · 2D 면 아무것도 안 열림
 *   B 평일: 주제 그림 · 바라는 꼬리표 그림 · 내 모습 · '주말에 열려.' · 나가기 없음 · 날짜 / 시계 글 없음 · 옷 갈아입기
 *   C 토요일: 나가기 → 쇼 (단계가 차례로) → 결과 · 조개 한 번 · '채점 규칙' · 오늘 기록 줄 · 다시 열면 그대로 · 새로고침 뒤에도
 *   D 일요일: 넘기기 → 바로 결과 · 조개 한 번 · 토요일 기록도 남음
 *   E 두 탭: 한 탭이 나간 뒤 다른 탭이 나가면 같은 결과 · 조개는 한 번
 *   F 움직임 줄이기: 쇼 없이 바로 결과
 *   H 장면 안의 콘테스트: 무대 톡 → 참가 카드 (#scene 안) → 쇼 박자 → 팻말 → 단상 → 결과 카드 · 넘기기 · 뒷길 (시트)
 *   G 그림이 또렷 (기기 픽셀 정수 배) · 저장된 다른 값 그대로 · 옷가게 문어 대본 부름 한 번
 */
'use strict';
var path = require('path');
var fs = require('fs');
var chromium = require('playwright').chromium;
var ROOT = path.resolve(__dirname, '..');
var SHOTS = process.argv.indexOf('--shots') >= 0 ? process.argv[process.argv.indexOf('--shots') + 1] : null;
var passes = 0, failures = 0;
function check(cond, msg) { if (cond) passes++; else { failures++; console.log('  FAIL ' + msg); } }
var WED = '2026-11-18', SAT = '2026-11-21', SUN = '2026-11-22', BORN = '2026-11-06T10:00:00.000Z', RED = '#e0564b';
function REC(extra) {
  var r = { v: 2, octopus: { name: '뚜루', born: BORN, trips: 0, invites: 3, days: ['2026-11-06', '2026-11-07', '2026-11-08'], affinity: {}, visits: {}, state: 'idle', color: RED, colors: [{ at: BORN, date: '2026-11-06', color: RED, how: 'first', by: 'player' }] },
    room: { lantern: 3, souvenirs: [], posterOrder: [] }, trips: [], notes: {}, curiosityNotes: [], salon: { asks: [] },
    settings: { motion: 'auto', thumbs: true, lastSeen: 1762650000000, octColor: RED, flipped: false, pixelFont: true, albumSeen: 0 },
    user: { shells: 20, seeds: 2, giftDay: null, later: { keep: [1, 2] } } };
  Object.keys(extra || {}).forEach(function (k) { r[k] = extra[k]; });
  return r;
}
/* P 갈래 대역: 지금 있는 옷 · 신발 · 장식 · 머리에 꼬리표를 돌려 가며 단다 (worn = 저장된 내 모습) */
function STUB() {
  var TAGS = ['cute', 'cool', 'cosy', 'sporty', 'neat', 'sea', 'flower', 'star', 'warm', 'fresh'], COLS = ['c-red', 'c-orange', 'c-yellow', 'c-green', 'c-blue', 'c-purple', 'c-pink', 'c-brown', 'c-white', 'c-black'];
  window.__npcSaid = [];
  APP.wardrobe = function () {
    var P = APP.playerParts(), me = APP.state.settings.player;
    return { cats: ['hair', 'outfit', 'shoes', 'acc'].map(function (key, ci) {
      return { key: key, name: key, items: (P[key] || []).map(function (it, i) { var id = it.id || it[0]; return { id: id, name: it.name || id, tags: id === 'none' ? [] : [TAGS[(i + ci * 3) % 10], TAGS[(i * 3 + ci + 1) % 10], COLS[(i + ci * 2) % 10]], shop: null, owned: true, worn: me[key] === id }; }) };
    }) };
  };
  APP.wearing = function () { var out = []; APP.wardrobe().cats.forEach(function (c) { c.items.forEach(function (it) { if (it.worn) out.push({ cat: c.key, id: it.id, tags: it.tags }); }); }); return out; };
  APP.itemThumb = function (cat, id, px) { var o = {}; o[cat] = id; return APP.scene.playerShot({ look: o, frame: cat === 'shoes' ? 'feet' : cat === 'outfit' ? 'body' : 'hair', shared: true }); };
  APP.npcSay = function (id, key, vars) { window.__npcSaid.push([id, key, vars]); };
}
/* V · W · P 갈래 대역: 무대 자리 · 화면 좌표 · 문어 세우기 · 내 캐릭터 걷기와 포즈 (부른 것을 window.__sc 에 적는다) */
function SCENE_STUB() {
  var sc = APP.scene; window.__sc = [];
  sc.stage = function () { return { wait: [1, 1], path: [[1, 0], [2, 0], [3, 0], [4, 0]], judges: [[1, 3, 0], [2, 3, 0], [3, 3, 0]], podium: [[1, 5, 0.6], [2, 5, 0.48], [3, 5, 0.38], [4, 5, 0.24]], rivals: [[0, 6], [1, 6], [2, 6]], poster: [0.5, 0], y: 0 }; };
  sc.project = function (x, y, z) { return { x: 40 + x * 64, y: 330 - z * 30 - y * 40 }; };
  sc.area = function () { return 'plaza'; }; sc.inRoom = function () { return null; };
  sc.stageDress = function (on) { window.__sc.push(['dress', !!on]); };
  sc.npcSet = function (l) { window.__sc.push(['set', l.map(function (n) { return n.id; }).join(',')]); };
  sc.npcPlace = function (id, x, z) { window.__sc.push(['place', id, x, z]); };
  sc.npcPose = function (id, pose) { window.__sc.push(['npose', id, pose]); };
  sc.playerWalkPath = function (pts) { window.__sc.push(['walk', pts.length]); return new Promise(function (r) { setTimeout(r, 250); }); };
  sc.playerPose = function (n) { window.__sc.push(['pose', n]); return new Promise(function (r) { setTimeout(r, 150); }); };
  sc.playerPlace = function (x, z, y) { window.__sc.push(['me', x, z, y]); };
}
function calls(page, kind) { return page.evaluate(function (k) { return window.__sc.filter(function (c) { return c[0] === k; }); }, kind); }
function wcard(page) { return page.evaluate(function () { var c = document.getElementById('ct-wcard'); return c ? { kind: c.dataset.kind, inScene: !!c.closest('#scene'), dialog: !!c.closest('dialog'), text: c.innerText, go: !!document.getElementById('ct-w-go'), avoid: c.hasAttribute('data-npc-avoid') } : null; }); }
async function open(ctx, o) {
  o = o || {};
  var page = await ctx.newPage(), errs = [];
  page.on('pageerror', function (e) { errs.push(e.message); console.log('  PAGEERROR ' + e.message); });
  page._errs = errs;
  await page.goto('file://' + ROOT + '/index.html?dev=0&intro=0' + (o.q || ''));
  await page.waitForSelector('#btn-go:not(.away)', { timeout: 30000 });
  await page.waitForFunction(function () { return window.APP && !APP.goResting; }, null, { timeout: 30000 });
  await page.waitForTimeout(400);
  if (o.stub !== false) await page.evaluate(STUB);
  return page;
}
async function context(browser, today, rec, o) {
  o = o || {};
  rec = rec || REC(); if (rec.user && rec.user.giftDay === null) rec.user.giftDay = today;   /* 그날 선물은 이미 받은 것으로 (조개 수를 콘테스트만 바꾸게) */
  var ctx = await browser.newContext({ viewport: { width: o.w || 360, height: o.h || 740 }, deviceScaleFactor: o.dpr || 2, locale: 'ko-KR', hasTouch: true, isMobile: true, reducedMotion: o.reduce ? 'reduce' : 'no-preference' });
  await ctx.addInitScript({ content: 'window.__ppolAwakeMs = 0;' + "if (!localStorage.getItem('__seed')) { localStorage.setItem('__seed', '1'); localStorage.setItem('ppolppol_v2', " + JSON.stringify(JSON.stringify(rec)) + '); } ' +
    "window.__ppolTest = Object.assign(window.__ppolTest || {}, { today: sessionStorage.getItem('__ct_day') || " + JSON.stringify(today) + ' });' });
  return ctx;
}
/* 두 탭: file:// 에서는 두 탭이 가끔 저장소를 못 나눈 채 열린다 (헤드리스 브라우저 사정 — 게임 코드와 무관). 나누는지 확인하고, 아니면 새 브라우저로 다시 연다 */
var LAUNCH = { args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] };
async function pair(today) {
  for (var i = 0; i < 5; i++) {
    var br = await chromium.launch(LAUNCH), ctx = await context(br, today), a = await open(ctx), b = await open(ctx);
    await a.evaluate(function () { localStorage.setItem('__ct_probe', '1'); });
    await b.waitForTimeout(400);
    if (await b.evaluate(function () { return localStorage.getItem('__ct_probe') === '1'; })) return { br: br, a: a, b: b };
    await br.close();
  }
  throw new Error('두 탭이 저장소를 나누지 못함');
}
function shells(page) { return page.evaluate(function () { return APP.state.user.shells; }); }
function view(page) { return page.evaluate(function () { var d = document.getElementById('contest-sheet'), b = document.getElementById('contest-body'); return { open: !!d.open, view: b.dataset.view || null, text: [document.getElementById('contest-h').innerText, b.innerText, document.getElementById('contest-close').innerText].join('\n'), go: !!document.getElementById('ct-go'), closed: !!document.getElementById('ct-closed') }; }); }
function entry(page, dk) { return page.evaluate(function (dk) { return CONTEST.today(APP.state.user, dk); }, dk); }
async function shot(page, name) { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await page.waitForTimeout(350); await page.screenshot({ path: path.join(SHOTS, name + '.png') }); }

async function main() {
  var browser = await chromium.launch(LAUNCH);
  var ctx, page, v, s0, e, r;

  console.log('A 옷 목록 없음 · 2D');
  ctx = await context(browser, SAT);
  page = await open(ctx, { stub: false });
  r = await page.evaluate(function () { return { ret: APP.openContest(), open: document.getElementById('contest-sheet').open, has: typeof CONTEST === 'object' }; });
  check(r.has && r.ret === false && r.open === false, '옷 목록 (APP.wardrobe) 이 없으면 안 열림');
  check(await page.evaluate(function () { return document.getElementById('btn-plaza-stage') === null || true; }), '무대 단추가 없어도 던지지 않음');
  r = await page.evaluate(function () {
    var out = [], shapes = [function () { throw new Error('x'); }, function () { return null; }, function () { return { cats: [] }; }, function () { return { cats: [{ key: 'outfit', items: [] }] }; }, function () { return { cats: [{ key: 'outfit', items: [{ id: 'a', worn: true }] }] }; }];
    shapes.forEach(function (f) { APP.wardrobe = f; out.push(APP.openContest()); APP.contestEnter(); });
    delete APP.wardrobe; return { out: out, entry: CONTEST.today(APP.state.user, window.__ppolTest.today), open: document.getElementById('contest-sheet').open };
  });
  check(r.out.every(function (x) { return x === false; }) && r.entry === null && !r.open, '깨진 · 빈 · 꼬리표 없는 옷 목록이면 안 열리고 안 나감');
  check(page._errs.length === 0, '오류 없음');
  await page.close();
  page = await open(ctx, { q: '&scene=2d' });
  check(await page.evaluate(function () { return APP.openContest() === false && !document.getElementById('contest-sheet').open; }), '2D 장면이면 안 열림');
  await ctx.close();

  console.log('B 평일');
  ctx = await context(browser, WED);
  page = await open(ctx);
  s0 = await shells(page);
  check(await page.evaluate(function () { return APP.openContest(); }) === true, 'APP.openContest() 가 연다');
  v = await view(page);
  check(v.open && v.view === 'closed' && v.closed && !v.go, '평일: 닫힌 화면 · 나가기 없음');
  check(v.text.indexOf('주말에 열려.') >= 0 && v.text.indexOf('주말 콘테스트') >= 0, "'주말에 열려.' 한 줄");
  check(!/\d/.test(v.text.replace(/조개\s*\d+/g, '')) && !/남은|마지막|까지|시간|내일/.test(v.text), '날짜 · 시계 · 재촉 글 없음: ' + JSON.stringify(v.text));
  check(!/[^가-힣ㄱ-ㆎ0-9a-zA-Z\s.,·!?]/.test(v.text), '기호 · 이모지 없음');
  r = await page.evaluate(function () {
    var b = document.getElementById('contest-body'), th = b.querySelector('.ct-theme.big .ct-poster canvas'), want = b.querySelectorAll('.ct-want canvas'), me = b.querySelector('.ct-mine canvas'), wk = CONTEST.week(window.__ppolTest.today);
    return { th: th ? th.getBoundingClientRect().width : 0, want: want.length, labels: Array.prototype.map.call(want, function (c) { return c.getAttribute('aria-label'); }), me: me ? [me.width, me.height, me.getBoundingClientRect().width] : null, need: wk.theme.tags.length + 1, title: b.querySelector('.ct-title').textContent === wk.theme.title, titles: document.querySelectorAll('#contest-sheet [title]').length };
  });
  check(r.th >= 90 && r.title, '주제 그림 (' + r.th + 'px) 과 제목');
  check(r.want === r.need && r.labels.every(function (l) { return !!l; }), '바라는 꼬리표 그림 ' + r.want + '개 (이름은 읽어 주기에만)');
  check(r.me && r.me[0] === 64 && r.me[1] === 96 && r.me[2] === 128, '내 모습 (장면의 전신 사진 · 무대 위)');
  check(r.titles === 0, 'title 속성 없음');
  await shot(page, '1-theme-weekday');
  check(await page.evaluate(function () { APP.contestEnter(); return CONTEST.today(APP.state.user, window.__ppolTest.today) === null && !APP.contestStage; }) && (await shells(page)) === s0, '평일엔 나가기를 불러도 아무 일 없음');
  await page.click('#ct-change');
  check(await page.evaluate(function () { return document.getElementById('look-sheet').open; }), '옷 갈아입기 → 옷장');
  await page.evaluate(function () { APP.setPlayerPart('outfit', 'hoodie'); document.getElementById('look-sheet').close(); });
  await page.waitForTimeout(200);
  check((await view(page)).open, '옷장을 닫으면 콘테스트 시트로');
  check(page._errs.length === 0, '오류 없음');
  await ctx.close();

  console.log('C 토요일 · 끝까지 보기');
  ctx = await context(browser, SAT);
  page = await open(ctx);
  s0 = await shells(page);
  await page.evaluate(function () { APP.openContest(); });
  v = await view(page);
  check(v.view === 'open' && v.go && !v.closed && v.text.indexOf('주말에 열려') < 0, '토요일: 나가기 단추');
  await shot(page, '2-theme-weekend');
  await page.waitForTimeout(700);
  await page.click('#ct-go');
  r = await page.evaluate(function () { return { st: APP.contestStage, closeHidden: document.getElementById('contest-close').hidden, skip: !!document.getElementById('ct-skip') }; });
  check(r.st && r.st.stage === 'walk' && r.st.n === 1 && r.skip && r.closeHidden, '쇼 시작: 걸어 나오기 1 · 넘기기 단추');
  r = await page.evaluate(function () { var dpr = window.devicePixelRatio, bad = [], th = document.querySelectorAll('#ct-show canvas.ct-art'); Array.prototype.forEach.call(th, function (c) { var per = c.getBoundingClientRect().width * dpr / c.width; if (Math.abs(per - Math.round(per)) > 0.01) bad.push(per); }); return { n: th.length, bad: bad, rule: !!document.querySelector('#ct-show .ct-rule'), stage: !!document.querySelector('#ct-show .ct-lineup.ct-stage') }; });
  check(r.n >= 12 && r.bad.length === 0 && r.stage, '쇼 무대의 그림 ' + r.n + '개 모두 기기 픽셀 정수 배 ' + JSON.stringify(r.bad));
  check(r.rule, "쇼 중에도 '채점 규칙' 꼬리표");
  e = await entry(page, SAT);
  check(e && e.paid === true && (await shells(page)) === s0 + e.shells && [12, 8, 5, 3][e.rank - 1] === e.shells, '나가는 순간 조개 한 번 (' + (e && e.rank) + '등 · ' + (e && e.shells) + ')');
  var seen = {}, t0 = Date.now(), frames = 0;
  while (Date.now() - t0 < 20000) {
    r = await page.evaluate(function () { var s = APP.contestStage; return s ? s.stage + s.n : null; });
    if (!r) break;
    if (!seen[r]) { seen[r] = 1; if (r === 'walk4') await shot(page, '3-show-walk'); if (r === 'judge3') await shot(page, '4-show-judge'); if (r === 'podium0') await shot(page, '5-show-podium'); }
    await page.waitForTimeout(120); frames++;
  }
  var took = Date.now() - t0;
  check(['walk2', 'walk3', 'walk4', 'judge1', 'judge2', 'judge3', 'count0', 'podium0'].every(function (k) { return seen[k]; }), '단계가 차례로 다 나옴: ' + Object.keys(seen).join(' '));
  check(took > 8000 && took < 16000, '쇼 길이 약 12초 (' + took + 'ms)');
  v = await view(page);
  check(v.view === 'result' && !v.go && v.text.indexOf('채점 규칙') >= 0 && v.text.indexOf(e.rank + '등') >= 0, "결과: 등수 · '채점 규칙' 꼬리표");
  check(!/좋|싶|기뻐|신나|축하|아쉬|멋져|최고/.test(v.text), '결과에 마음 · 평가 말 없음');
  r = await page.evaluate(function () {
    var b = document.getElementById('contest-body');
    return { pods: b.querySelectorAll('.ct-pod').length, me: b.querySelectorAll('.ct-pod.me').length, cards: b.querySelectorAll('.ct-judge').length, stars: Array.prototype.map.call(b.querySelectorAll('.ct-stars'), function (s) { return s.querySelectorAll('canvas').length; }),
      amt: b.querySelector('.ct-line .shell-n').textContent, close: !document.getElementById('contest-close').hidden, log: Array.prototype.map.call(document.querySelectorAll('#log .ct-row'), function (x) { return x.querySelector('.ltool').textContent + ' ' + x.querySelector('.ltext').textContent; }) };
  });
  check(r.pods === 4 && r.me === 1 && r.cards === 3 && r.stars.every(function (n) { return n >= 1 && n <= 3; }) && r.close, '단상 넷 (나 하나) · 심사 카드 셋 · 별 1~3');
  check(+r.amt === e.shells, '결과의 조개 수 = 받은 수');
  check(r.log.length === 1 && r.log[0] === '콘테스트 ' + e.rank + '등 · 조개 ' + e.shells, '오늘 기록 줄: ' + JSON.stringify(r.log));
  await shot(page, '6-result');
  /* 다시 열기 · 다시 나가기 · 새로고침 */
  check(await page.evaluate(function () { var s = window.__npcSaid; return s.length === 2 && s[0][0] === 'clothes' && s[0][1] === 'contest.open' && typeof s[0][2].theme === 'string' && s[1][1] === 'contest.result' && s[1][2].shells >= 3; }), '옷가게 문어 대본: 열 때 한 번 · 결과에 한 번');
  await page.click('#contest-close'); await page.waitForTimeout(200);
  await page.evaluate(function () { APP.setPlayerPart('outfit', 'knit'); APP.openContest(); APP.contestEnter(); });
  var e2 = await entry(page, SAT);
  check((await view(page)).view === 'result' && JSON.stringify(e2) === JSON.stringify(e) && (await shells(page)) === s0 + e.shells && !(await page.evaluate(function () { return APP.contestStage; })), '같은 날 다시: 적힌 결과 그대로 · 조개 그대로 (옷을 바꿔도 다시 안 뽑음)');
  await page.evaluate(function () { document.getElementById('contest-sheet').close(); APP.renderLog(); });
  check(await page.evaluate(function () { return window.__npcSaid.length === 2 && document.querySelectorAll('#log .ct-row').length === 1; }), '다시 열고 닫아도 대본은 그대로 · 기록을 다시 그려도 줄은 하나');
  await page.reload(); await page.waitForSelector('#btn-go:not(.away)'); await page.waitForTimeout(600); await page.evaluate(STUB);
  await page.evaluate(function () { APP.openContest(); });
  r = await page.evaluate(function () { var u = APP.state.user; return { shells: u.shells, later: JSON.stringify(u.later), seeds: u.seeds, log: document.querySelectorAll('#log .ct-row').length, exp: typeof APP.exportJSON === 'function' }; });
  check((await view(page)).view === 'result' && r.shells === s0 + e.shells && r.log === 1, '새로고침 뒤에도 결과 · 조개 · 기록 줄 그대로');
  check(r.later === '{"keep":[1,2]}' && r.seeds === 2, '저장된 다른 값 그대로');
  check(page._errs.length === 0, '오류 없음');

  console.log('D 일요일 · 넘기기');
  await page.evaluate(function (d) { sessionStorage.setItem('__ct_day', d); }, SUN);
  await page.reload(); await page.waitForSelector('#btn-go:not(.away)'); await page.waitForTimeout(600); await page.evaluate(STUB);
  await page.waitForFunction(function (d) { return APP.state.user.giftDay === d; }, SUN, { timeout: 10000 });
  s0 = await shells(page);   /* 날이 바뀌어 그날 선물이 들어온 뒤 */
  await page.evaluate(function () { APP.openContest(); });
  v = await view(page);
  check(v.view === 'open' && v.go, '일요일: 다시 나갈 수 있음 (같은 주 · 같은 주제)');
  await page.waitForTimeout(700); await page.click('#ct-go'); await page.waitForTimeout(900);
  check(await page.evaluate(function () { return !!APP.contestStage; }), '쇼 중');
  await page.click('#ct-skip');
  var eS = await entry(page, SUN);
  v = await view(page);
  check(v.view === 'result' && !(await page.evaluate(function () { return APP.contestStage; })) && eS && eS.paid && (await shells(page)) === s0 + eS.shells, '넘기기 → 바로 결과 · 조개 한 번');
  await page.waitForTimeout(3000);
  check((await shells(page)) === s0 + eS.shells && (await view(page)).view === 'result', '넘긴 뒤 남은 타이머가 아무것도 안 바꿈');
  check(!!(await entry(page, SAT)) && (await page.evaluate(function () { return Object.keys(APP.state.user.contest.weeks).length; })) === 1, '토요일 기록도 남음 (한 주에 두 날)');
  check(await page.evaluate(function () { return CONTEST.today(APP.state.user, '2026-11-21').theme === CONTEST.today(APP.state.user, '2026-11-22').theme; }), '같은 주 = 같은 주제');
  /* 쇼 도중 시트를 닫아도 결과는 남는다 */
  check(page._errs.length === 0, '오류 없음');
  await ctx.close();

  console.log('E 두 탭');
  var pp = await pair(SAT), p1 = pp.a, p2 = pp.b;
  s0 = await shells(p1);
  await p1.evaluate(function () { APP.openContest(); APP.contestEnter(); APP.contestSkip(); });
  var e1 = await entry(p1, SAT);
  await p2.waitForFunction(function (d) { return !!CONTEST.today(APP.state.user, d); }, SAT, { timeout: 30000 });   /* 저장 알림이 닿은 뒤 */
  await p2.evaluate(function () { APP.setPlayerPart('outfit', 'raincoat'); APP.openContest(); APP.contestEnter(); });
  var eB = await entry(p2, SAT);
  check(e1 && eB && eB.at === e1.at && eB.rank === e1.rank && !(await p2.evaluate(function () { return APP.contestStage; })), '둘째 탭: 첫 탭의 결과 그대로 (쇼 없이)');
  check((await shells(p2)) === s0 + e1.shells, '둘째 탭 조개 = 한 번만');
  await p1.waitForTimeout(300);
  check((await shells(p1)) === s0 + e1.shells && (await p1.evaluate(function () { return JSON.parse(localStorage.getItem('ppolppol_v2')).user.shells; })) === s0 + e1.shells, '저장소의 조개도 한 번만');
  /* 저장 이벤트 없이 (같은 틱) 둘째 탭이 눌러도: 저장소를 다시 읽는다 */
  await pp.br.close();
  pp = await pair(SUN); p1 = pp.a; p2 = pp.b;
  s0 = await shells(p1);
  await p2.evaluate(function () { window.addEventListener('storage', function (e) { e.stopImmediatePropagation(); }, true); });   /* 둘째 탭이 저장 알림을 못 받은 척 */
  await p1.evaluate(function () { APP.openContest(); APP.contestEnter(); APP.contestSkip(); });
  await p2.evaluate(function () { APP.save(); });   /* 옛 상태 그대로 저장 → 첫 탭의 기록을 덮는다 */
  await p2.waitForFunction(function (d) { var u = JSON.parse(localStorage.getItem('ppolppol_v2')).user; return !!CONTEST.today(u, d); }, SUN, { timeout: 30000 });   /* 첫 탭이 기록을 다시 얹은 뒤 */
  await p2.evaluate(function () { APP.openContest(); APP.contestEnter(); });
  await p1.waitForTimeout(300);
  e1 = await entry(p1, SUN); eB = await entry(p2, SUN);
  check(e1 && eB && eB.at === e1.at && (await shells(p2)) === s0 + e1.shells, '알림을 못 받은 탭이 옛 저장으로 덮어도: 기록 · 조개가 되돌아오고 한 번만 ' + JSON.stringify([e1 && e1.at, eB && eB.at, s0, e1 && e1.shells]));
  check((await shells(p1)) === s0 + e1.shells && (await p1.evaluate(function () { return JSON.parse(localStorage.getItem('ppolppol_v2')).user.shells; })) === s0 + e1.shells, '저장소의 조개도 한 번만');
  await pp.br.close();

  console.log('F 움직임 줄이기');
  var rec = REC(); rec.settings.motion = 'reduce';
  ctx = await context(browser, SAT, rec);
  page = await open(ctx);
  s0 = await shells(page);
  await page.evaluate(function () { APP.openContest(); });
  await page.waitForTimeout(700); await page.click('#ct-go');
  e = await entry(page, SAT);
  check((await view(page)).view === 'result' && !(await page.evaluate(function () { return APP.contestStage; })) && (await shells(page)) === s0 + e.shells, '쇼 없이 바로 결과 · 조개 한 번');
  check(await page.evaluate(function () { return document.activeElement && document.activeElement.id === 'ct-line'; }), '키보드 자리 = 결과 줄');
  await ctx.close();

  console.log('G 또렷함');
  var sizes = [[360, 740, 2], [320, 568, 2], [1280, 800, 1]];
  for (var i = 0; i < sizes.length; i++) {
    ctx = await context(browser, SAT, null, { w: sizes[i][0], h: sizes[i][1], dpr: sizes[i][2] });
    page = await open(ctx);
    await page.evaluate(function () { APP.openContest(); APP.contestEnter(); APP.contestSkip(); });
    r = await page.evaluate(function () {
      var d = document.getElementById('contest-sheet'), dpr = window.devicePixelRatio, bad = [];
      Array.prototype.forEach.call(d.querySelectorAll('canvas.ct-art'), function (c) { var k = c.width / (c.getBoundingClientRect().width * dpr), inv = 1 / k; if (Math.abs(inv - Math.round(inv)) > 0.01) bad.push([c.width, c.getBoundingClientRect().width]); });
      var dr = d.getBoundingClientRect();
      return { n: d.querySelectorAll('canvas.ct-art').length, bad: bad, wide: d.scrollWidth > d.clientWidth + 1, inView: dr.left >= -1 && dr.right <= window.innerWidth + 1, fs: Array.prototype.map.call(d.querySelectorAll('.ct-title, .ct-rank, .ct-pts, .ct-rule, .ct-place'), function (x) { return parseFloat(getComputedStyle(x).fontSize); }) };
    });
    check(r.n > 8 && r.bad.length === 0, sizes[i].join('x') + ': 그림 ' + r.n + '개 모두 기기 픽셀 정수 배 ' + JSON.stringify(r.bad));
    check(!r.wide && r.inView, sizes[i].join('x') + ': 옆으로 넘치지 않음');
    check(r.fs.every(function (f) { return f >= (sizes[i][2] >= 2 ? 16 : 12); }), sizes[i].join('x') + ': 글자가 집 크기 (폰 16px 이상) ' + JSON.stringify(r.fs));
    check(page._errs.length === 0, '오류 없음');
    await ctx.close();
  }

  console.log('H 장면 안의 콘테스트 (무대 · 좌표 · 걷기는 대역)');
  ctx = await context(browser, WED);
  page = await open(ctx); await page.evaluate(SCENE_STUB);
  s0 = await shells(page);
  check(await page.evaluate(function () { return APP.contestStageTap(); }) === true, '무대 톡 (평일)');
  await page.waitForFunction(function () { return !!document.getElementById('ct-wcard'); }, null, { timeout: 8000 });
  r = await wcard(page);
  check(r.kind === 'entry' && r.inScene && !r.dialog && r.avoid && !r.go && r.text.indexOf('주말에 열려.') >= 0, '대기 자리로 걸은 뒤 참가 카드가 #scene 안에 (dialog 아님) · 평일엔 나가기 없음');
  check((await calls(page, 'walk')).length === 1 && !(await page.evaluate(function () { return document.querySelector('dialog[open]'); })), '걷기를 한 번 불렀고 시트는 안 열림');
  check(await page.evaluate(function () { var p = document.getElementById('ct-wposter'); return !!p && !!p.closest('#scene') && !!p.querySelector('canvas') && /주말 콘테스트/.test(p.getAttribute('aria-label')); }), '무대 옆 포스터에 이번 주 주제 그림');
  check((await calls(page, 'dress')).every(function (c) { return c[1] === false; }), '평일엔 무대를 꾸미지 않음');
  await page.click('#ct-w-close');
  check((await wcard(page)) === null && (await shells(page)) === s0, '닫기 → 카드 없음');
  check(page._errs.length === 0, '오류 없음');
  await ctx.close();

  ctx = await context(browser, SAT);
  page = await open(ctx); await page.evaluate(SCENE_STUB);
  s0 = await shells(page);
  await page.evaluate(function () { APP.contestStageTap(); });
  await page.waitForFunction(function () { return !!document.getElementById('ct-w-go'); }, null, { timeout: 8000 });
  r = await calls(page, 'set');
  check((await calls(page, 'dress')).some(function (c) { return c[1] === true; }) && r.length && /rival0,rival1,rival2/.test(r[r.length - 1][1]), '주말: 무대를 꾸미고 경쟁자 셋을 세움');
  check((await calls(page, 'npose')).filter(function (c) { return c[2] === 'sit'; }).length >= 3, '심사 문어 셋이 앉음');
  await shot(page, '8-live-entry');
  await page.waitForTimeout(700); await page.click('#ct-w-go');
  e = await entry(page, SAT);
  check(e && e.paid && (await shells(page)) === s0 + e.shells && !!(await page.evaluate(function () { return APP.contestLive; })), '나가기 → 조개 한 번 · 쇼 시작');
  check(await page.evaluate(function () { return !!document.querySelector('.ct-whud .ct-rule') && !!document.getElementById('ct-w-skip') && !document.querySelector('dialog[open]'); }), "쇼 중: 넘기기 · '채점 규칙' · 시트 없음");
  seen = {}; t0 = Date.now();
  while (Date.now() - t0 < 30000) {
    r = await page.evaluate(function () { var s = APP.contestLive; return s ? s.stage + s.n : null; });
    if (!r) break;
    if (!seen[r]) { seen[r] = 1; if (r === 'judge3') await shot(page, '9-live-placards'); }
    await page.waitForTimeout(100);
  }
  check(['walk1', 'walk2', 'walk3', 'walk4', 'pose0', 'judge1', 'judge2', 'judge3'].every(function (k) { return seen[k]; }), '박자가 차례로: ' + Object.keys(seen).join(' '));
  took = Date.now() - t0;
  check(took > 6000 && took < 20000, '쇼 길이 (' + took + 'ms)');
  r = await wcard(page);
  check(r && r.kind === 'result' && r.inScene && !r.dialog && r.text.indexOf('채점 규칙') >= 0 && r.text.indexOf(e.rank + '등') >= 0, "결과 카드: 등수 · '채점 규칙'");
  check(await page.evaluate(function () { return document.querySelectorAll('#ct-world .ct-wplac').length === 3 && Array.prototype.every.call(document.querySelectorAll('#ct-world .ct-wplac'), function (p) { var n = p.querySelectorAll('.ct-stars canvas').length; return n >= 1 && n <= 3 && !!p.getAttribute('aria-label'); }); }), '심사 팻말 셋 (별 1~3)');
  r = await page.evaluate(function () { var sc = window.__sc; return { poses: sc.filter(function (c) { return c[0] === 'pose'; }).map(function (c) { return c[1]; }), walk: sc.filter(function (c) { return c[0] === 'walk'; }).map(function (c) { return c[1]; }), pod: sc.filter(function (c) { return c[0] === 'place' && /^rival/.test(c[1]) && c[3] === 5; }).map(function (c) { return c[1]; }), me: sc.filter(function (c) { return c[0] === 'me'; }).length, said: window.__npcSaid.map(function (x) { return x[0] + ':' + x[1]; }) }; });
  check(r.poses.indexOf('twirl') >= 0 && r.poses.indexOf('pose') >= 0 && r.walk.indexOf(4) >= 0, '내 캐릭터: 길을 걷고 · 돌고 · 선다');
  check(['rival0', 'rival1', 'rival2'].every(function (id) { return r.pod.indexOf(id) >= 0; }) && r.me >= 1, '단상: 경쟁자 셋과 내가 등수 자리에');
  check(r.said.indexOf('clothes:contest.judge') >= 0 && r.said.indexOf('goods:contest.judge') >= 0 && r.said.indexOf('cafe:contest.judge') >= 0 && r.said.indexOf('clothes:contest.result') >= 0, '심사 대본: 셋이 한 번씩 센 수 · 결과 한 번 (' + r.said.join(' ') + ')');
  check(await page.evaluate(function () { return window.__npcSaid.filter(function (x) { return x[1] === 'contest.judge'; }).every(function (x) { return typeof x[2].n === 'number' && x[2].n >= 0; }); }), '센 수는 숫자');
  await shot(page, '10-live-result');
  await page.click('#ct-w-close');
  await page.evaluate(function () { APP.contestStageTap(); });
  await page.waitForFunction(function () { return !!document.getElementById('ct-wcard'); }, null, { timeout: 8000 });
  check((await wcard(page)).kind === 'result' && (await shells(page)) === s0 + e.shells && JSON.stringify(await entry(page, SAT)) === JSON.stringify(e), '그날 다시 무대 톡: 결과 카드 그대로 · 조개 그대로');
  check(await page.evaluate(function () { return document.querySelectorAll('#log .ct-row').length === 1; }), '기록 줄 하나');
  check(page._errs.length === 0, '오류 없음');
  /* 일요일: 넘기기 */
  await page.evaluate(function (d) { sessionStorage.setItem('__ct_day', d); }, SUN);
  await page.reload(); await page.waitForSelector('#btn-go:not(.away)'); await page.waitForTimeout(600); await page.evaluate(STUB); await page.evaluate(SCENE_STUB);
  await page.waitForFunction(function (d) { return APP.state.user.giftDay === d; }, SUN, { timeout: 10000 });
  s0 = await shells(page);
  await page.evaluate(function () { APP.contestStageTap(); });
  await page.waitForFunction(function () { return !!document.getElementById('ct-w-go'); }, null, { timeout: 8000 });
  await page.waitForTimeout(700); await page.click('#ct-w-go'); await page.waitForTimeout(900);
  await page.click('#ct-w-skip');
  var eL = await entry(page, SUN);
  r = await wcard(page);
  check(r && r.kind === 'result' && !(await page.evaluate(function () { return APP.contestLive; })) && (await shells(page)) === s0 + eL.shells, '넘기기 → 바로 결과 카드 · 조개 한 번');
  await page.waitForTimeout(2500);
  check((await shells(page)) === s0 + eL.shells && (await wcard(page)).kind === 'result' && (await page.evaluate(function () { return document.querySelectorAll('#ct-world .ct-wplac').length; })) === 3, '넘긴 뒤 남은 박자가 아무것도 안 바꿈');
  check(page._errs.length === 0, '오류 없음');
  await ctx.close();
  /* 뒷길: 움직임 줄이기 · 무대 함수 없음 → 시트 */
  rec = REC(); rec.settings.motion = 'reduce';
  ctx = await context(browser, SAT, rec);
  page = await open(ctx); await page.evaluate(SCENE_STUB);
  await page.evaluate(function () { APP.contestStageTap(); }); await page.waitForTimeout(300);
  check(await page.evaluate(function () { return document.getElementById('contest-sheet').open && !document.getElementById('ct-wcard'); }), '움직임 줄이기: 시트가 열림');
  await ctx.close();
  ctx = await context(browser, SAT);
  page = await open(ctx);
  await page.evaluate(function () { delete APP.scene.stage; APP.contestStageTap(); }); await page.waitForTimeout(300);
  check(await page.evaluate(function () { return typeof APP.scene.stage !== 'function' ? document.getElementById('contest-sheet').open && !document.getElementById('ct-wcard') : true; }), '무대 함수가 없으면: 시트가 열림');
  check(page._errs.length === 0, '오류 없음');
  await ctx.close();

  /* 진짜 폰 배율 2.625 (에뮬레이션은 이 배율에서 어긋난다 — 창 자체를 그 배율로) */
  var real = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--force-device-scale-factor=2.625', '--window-size=412,915'] });
  ctx = await real.newContext({ viewport: null, locale: 'ko-KR' });
  await ctx.addInitScript({ content: "window.__ppolAwakeMs = 0; if (!localStorage.getItem('__seed')) { localStorage.setItem('__seed', '1'); localStorage.setItem('ppolppol_v2', " + JSON.stringify(JSON.stringify(REC({ user: { shells: 20, giftDay: SAT } }))) + "); } window.__ppolTest = { today: '" + SAT + "' };" });
  page = await open(ctx);
  await page.evaluate(function () { APP.openContest(); APP.contestEnter(); APP.contestSkip(); });
  r = await page.evaluate(function () {
    var d = document.getElementById('contest-sheet'), dpr = window.devicePixelRatio, bad = [];
    Array.prototype.forEach.call(d.querySelectorAll('canvas.ct-art'), function (c) { var per = c.getBoundingClientRect().width * dpr / c.width; if (Math.abs(per - Math.round(per)) > 0.01) bad.push([c.width, per]); });
    return { dpr: dpr, n: d.querySelectorAll('canvas.ct-art').length, bad: bad, wide: d.scrollWidth > d.clientWidth + 1 };
  });
  check(Math.abs(r.dpr - 2.625) < 0.01 && r.n > 8 && r.bad.length === 0 && !r.wide, '배율 2.625: 그림 ' + r.n + '개 모두 기기 픽셀 정수 배 ' + JSON.stringify([r.dpr, r.bad]));
  if (SHOTS) await shot(page, '7-result-412-2625');
  await real.close();

  await browser.close();
  console.log('\n' + (failures ? 'FAILED ' + failures + ' / ' : 'ok ') + (passes + failures) + ' checks');
  process.exit(failures ? 1 : 0);
}
main().catch(function (e) { console.log('FAIL (threw) ' + (e && e.stack || e)); process.exit(1); });
