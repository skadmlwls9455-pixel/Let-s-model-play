#!/usr/bin/env node
/* tools/smoke.js — Playwright 스모크 (§12.3). 실패하면 exit 1.
 *   node tools/smoke.js            # js/world.js, js/brain.js 가 있으면 그대로, 없으면 tools/stubs.js 주입
 *   SMOKE_STUBS=1 node tools/smoke.js   # 스텁 강제 주입
 *   SHOTS=/path node tools/smoke.js     # 스크린샷 폴더 변경
 * 추가 시나리오: E 강제 집에 있는 날(window.__ppolTest.forceKind='home'), F v1→v2 마이그레이션(과제 페이로드),
 *   H 이틀째 메모 인사·재방문·귀가 요약(window.__ppolTest.today='YYYY-MM-DD'), I 출발·귀가 의식(바깥 장면)·건너뛰기·나가 있는 중 새로고침,
 *   W 낮잠에서 스스로 깸(20분 · 새 날) · 인사 초상, V 데모 조작 패널은 개발 모드(?dev=1 · localhost · file://)에서만,
 *   P 플레이어 화면(?dev=0): 힌트 칸 없이 산책 한 번 · 출발 행·일기에 힌트 얘기 없음 (결정 18),
 *   L 추억 앨범 아이콘(장면 오른쪽 위 · 점 · 날아가는 포스터 · 320 px 이름) · 이름 창 정직 표기, N 호기심 메모(저장 → 다음 산책 입력 · 모델 메모 · 내려놓기),
 *   M 반응은 모델·사람이 준 그대로 (안 주면 없음 · 네 가지 밖의 말 · 코드 줄 없음),
 *   S 7물결(주인 11-07): 플레이어 화면에 '방 보기' 없음 · ⚙ 설정(문어 색 · 내 모습(11-08 파츠 v0) · 소리 · 화면 · 기록 · 누가 고르나) · 등불·데모 말풍선 · 큰 버튼 건너뛰기(두 번 톡 보호) ·
 *     놀이방 문 → (8물결) 놀이방 → 오락기 → 달리기 창이 열린 채로 산책이 끝까지 (문 소리 훅 · 잠들 때 반응 훅 · 구석 쪽지) · 자정 넘김 → 오늘 칸만 · 앨범(문어의 요즘 · 일기 탭: 지난 날, 새 날 먼저).
 *   J 8물결: 다락 안 놀이방 문(투명 단추) → 진짜 놀이방 · 오락기 → 달리기 · 키보드 왕복 · 산책 중 놀이방(끌려 나가지 않음 · 구석 쪽지 · 보러 가기) · 두뇌 입력 0 · 모션 줄이기 컷 · 새로고침 · 2D.
 *   SMOKE_ONLY=H,I node tools/smoke.js   # 그 시나리오만
 * 등불은 초대한 날마다 1칸 (DESIGN §4): 같은 날 두 번째 초대는 칸을 켜지 않는다 → 날을 넘기는 곳은 window.__ppolTest.today 로.
 * 시나리오: 이름 → 힌트 '모자의 역사' → 초대 → 건너뛰기 → 앨범 1·벽 1·등불 1 → 새로고침 → 그대로 →
 *           카드 탭 → 앞면 → 뒤집기 → 일기(뒷면) 정류장 ≥2 → 스크린샷 (라이트/다크/앞면/뒷면)
 * 위키 fetch 는 page.route 로 가짜 응답: (A) 성공+썸네일+링크, (B) 문서 없음, (C) 요청 중단.
 */
'use strict';
var fs = require('fs'), path = require('path');
var { chromium } = require('playwright');

var ROOT = path.resolve(__dirname, '..');
var INDEX = 'file://' + path.join(ROOT, 'index.html');
var DEV = INDEX + '?dev=1';   /* 데모 조작 패널(#demo)을 쓰는 시나리오: file:// 도 개발 모드지만 드러내 놓고 */
function dayAfter(n) { var d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
var SHOTS = process.env.SHOTS || '/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/build/shots/';
var haveReal = fs.existsSync(path.join(ROOT, 'js/world.js')) && fs.existsSync(path.join(ROOT, 'js/brain.js'));
var useStubs = !haveReal || process.env.SMOKE_STUBS === '1';
fs.mkdirSync(SHOTS, { recursive: true });

var fails = 0, passes = 0;
function ok(cond, msg) { if (cond) { passes++; console.log('  ok   ' + msg); } else { fails++; console.error('  FAIL ' + msg); } }
function must(cond, msg) { ok(cond, msg); if (!cond) throw new Error('assertion: ' + msg); }

var WIKI_OK = {
  query: { pages: { '1': { pageid: 1, title: '모자', extract: '테스트용 요약: 모자. 가짜 위키 응답이라 실제 내용이 아니다. 세 번째 문장은 잘려야 한다.',
    thumbnail: { source: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30"><rect width="40" height="30" fill="#5a7"/></svg>'), width: 40, height: 30 },
    links: [{ ns: 0, title: '깃털' }, { ns: 0, title: '밀짚' }, { ns: 0, title: '1990년' }, { ns: 0, title: '모자 목록' }] } } }
};
var WIKI_MISSING = { query: { pages: { '-1': { title: 'x', missing: '' } } } };

/* 장면 공통 조회: 3D(canvas) 와 2D(DOM) 어느 쪽이든 같은 답. 벽 포스터 수 · 소품 존재 */
function wallCount(page) { return page.evaluate(function () { var sc = document.getElementById('scene'), h3 = document.getElementById('scene3d'); return sc.classList.contains('mode-3d') ? (parseInt(h3.dataset.posters, 10) || 0) : document.querySelectorAll('#wall-posts .wall-mini').length; }); }
function hasItem(page, item) { return page.evaluate(function (it) { var sc = document.getElementById('scene'), h3 = document.getElementById('scene3d'); return sc.classList.contains('mode-3d') ? (h3.dataset.items || '').split(' ').indexOf(it) >= 0 : !!document.querySelector('#layers .layer[data-key="item.' + it + '"]'); }, item); }
function routeWiki(page, mode) {
  return page.route('https://ko.wikipedia.org/**', function (route) {
    if (mode === 'abort') return route.abort('failed');
    var body = mode === 'ok' ? WIKI_OK : WIKI_MISSING;
    if (mode === 'ok') { var t = decodeURIComponent((route.request().url().match(/titles=([^&]+)/) || [])[1] || '모자'); body = JSON.parse(JSON.stringify(WIKI_OK)); body.query.pages['1'].title = t; body.query.pages['1'].extract = body.query.pages['1'].extract.replace('모자', t); }   /* 제목마다 그 제목의 가짜 요약 (조사 없음) */
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
  });
}
/* 로그가 문어를 '성과·보고서를 내는 조사원'으로 그리지 않는지 (정직 표기). 막는 것: '결과' · '리서치' · '보고' 전부
   (보고서 · 보고했어 · 보고 드려 · 보고를 올렸어 · 탐험 보고 · 오늘의 보고 · 보고 내용 · 칸이 갈린 <b>보고</b>했어 까지).
   빼 주는 것은 동사 보다 + 고 하나: 목적어 뒤 '…를/을/걸/만 보고' 가 띄어쓰기·문장부호·끝으로 끝날 때 (뒤에 '드리다' 가 오면 보고드리다라 안 뺀다), '보고 싶'.
   world.js 다리 문구의 '보고' 20곳이 전부 이 꼴이다 (2026-11 확인). 다리 문구는 날짜 시드로 그날 로그에 나오므로 [A] 에서 WORLD 문구 전부를 같은 검사로 한 번 더 돌린다 */
function reportFramed(s) {
  var t = String(s).replace(/([을를걸만]) 보고(?=$|[\s,.…!?”’)](?!드[리려립릴렸]))/g, '$1 ◇').replace(/보고 싶/g, '◇ 싶');
  return /결과|리서치|보고/.test(t);
}
/* 페이지 안에서 돈다: #log 를 보이는 줄 단위로. 인라인 칸(<b>·<a>·span)은 이어 붙이고, 블록 칸(.ltool · .sub 같은 display 가 inline 이 아닌 것)과 행 경계에서 끊는다.
   textContent 는 다리 문구 칸 '…걸 보고' 와 다음 칸 '하늘…' 을 '보고하늘' 로 붙이고, 텍스트 노드를 하나씩 보면 '<b>보고</b>했어' 를 놓친다 */
function logLines() {
  var log = document.getElementById('log'), out = [], cur = '', curBox = null, w, n, b;
  if (!log) return out;
  function box(x) { for (var e = x.parentElement; e && e !== log; e = e.parentElement) { var d = getComputedStyle(e).display; if (d !== 'inline' && d !== 'contents') return e; } return log; }
  w = document.createTreeWalker(log, NodeFilter.SHOW_TEXT);
  while ((n = w.nextNode())) { b = box(n); if (b !== curBox) { if (cur.trim()) out.push(cur.trim()); cur = ''; curBox = b; } cur += n.nodeValue; }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
/* 페이지 안에서 돈다: WORLD 의 문자열 전부 (다리 문구 · 메모 · 집 활동 · 반응 …) — 어느 날이든 로그에 나올 수 있는 세계 문구 */
function worldStrings() {
  var out = [];
  (function walk(o, d) { if (typeof o === 'string') out.push(o); else if (o && typeof o === 'object' && d < 12) Object.keys(o).forEach(function (k) { walk(o[k], d + 1); }); })(window.WORLD, 0);
  return out;
}
/* running 여행 복구 한 줄 (app.js resumeRunning): 복구된 여행 종류마다. 빈 차례뿐이면 말하지 않는다 */
var AWAY_ROWS = { out: ['귀가 · 네가 없는 동안 다녀왔어'], home: ['집 · 네가 없는 동안 집에 있었어'], empty: [] };
function watchErrors(page, bag) {
  page.on('pageerror', function (e) { bag.push('pageerror: ' + e.message); });
  page.on('console', function (m) {
    if (m.type() !== 'error') return;
    var t = m.text();
    if (/Failed to load resource|ERR_FILE_NOT_FOUND|ERR_|fonts\.g|net::/.test(t)) { bag.ignored.push(t); return; }   /* 에셋/폰트 404 는 폴백 설계 */
    bag.push('console.error: ' + t);
  });
}
async function newPage(browser, wikiMode, initScripts) {
  var ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1, locale: 'ko-KR', colorScheme: 'light' });
  var page = await ctx.newPage();
  var bag = []; bag.ignored = [];
  watchErrors(page, bag);
  if (useStubs) {
    await page.addInitScript({ path: path.join(ROOT, 'tools/stubs.js') });
    /* 실제 모듈이 있는데 스텁을 강제한 경우: 페이지의 world.js/brain.js 요청을 빈 스크립트로 바꿔 스텁이 덮어써지지 않게 */
    if (haveReal) await page.route(/\/js\/(world|brain)\.js$/, function (route) { return route.fulfill({ status: 200, contentType: 'application/javascript', body: '/* stubbed by tools/smoke.js */' }); });
  }
  for (var s of (initScripts || [])) await page.addInitScript(s);
  await routeWiki(page, wikiMode);
  return { ctx: ctx, page: page, bag: bag };
}
async function pickName(page, hint) {
  /* 이름에 따라 시드가 바뀐다. 오늘 시드로 '외출'이 되는 이름을 고른다(집에 있는 날도 정당한 결말이지만 일기 정류장 ≥2 를 보려고).
     hint: 그 산책에 넣을 힌트 (기본 '모자의 역사'; 플레이어 화면 P 는 힌트 칸이 없으니 '') */
  return page.evaluate(async function (hint) {
    var names = ['뚜루', '안개', '삐죠', '구름', '조약돌', '먹물', '단추', '파도', '이끼', '별'];
    var d = new Date(), dk = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    for (var n of names) {
      var seed = BRAIN.hashSeed(dk, hint, 1, n);
      var t = await BRAIN.plan({ seed: seed, dateKey: dk, seq: 1, hint: hint, name: n, state: { visits: {}, affinity: {}, lantern: 0, recent: [], todayOut: 0 }, now: d, online: false, by: 'demo' });
      if (t.kind === 'out' && t.receipt && t.receipt.stops.length >= 2) return n;
    }
    return names[0];
  }, hint == null ? '모자의 역사' : hint);
}
async function waitIdle(page, ms) {
  await page.waitForFunction(function () { var b = document.getElementById('btn-go'); return b && !b.classList.contains('away'); }, null, { timeout: ms || 30000 });
}
/* 8물결: 그림 위 문 · 오락기 단추는 pointer-events: none (톡은 장면이 받아 그린 순서대로 단추를 누른다). 진짜 손가락처럼 그 단추 칸 안에서
   장면이 그 단추로 고르는 자리(3D = pickAt 'spot', 2D = 문어가 아닌 그림)를 찾아 마우스로 누른다 — 문 앞에 문어가 서 있으면 문어 몸은 피한다 */
async function clickSpot(pg, sel) {
  var pt = await pg.evaluate(function (sel) {
    var b = document.querySelector(sel); b.scrollIntoView({ block: 'nearest' });
    var r = b.getBoundingClientRect(), oct = document.getElementById('oct'), id = { 'btn-door': 'atticPlay', 'btn-play-door': 'playAttic', 'btn-machine': 'machine' }[b.id], F = [0.5, 0.35, 0.65, 0.2, 0.8, 0.1, 0.9];
    for (var i = 0; i < F.length; i++) for (var j = 0; j < F.length; j++) {
      var x = r.left + r.width * F[j], y = r.top + r.height * F[i];
      if (APP.sceneMode === '3d') { var k = APP.scene.pickAt(x, y); if (k && k.kind === 'spot' && k.id === id) return [x, y]; }
      else { var e = document.elementFromPoint(x, y); if (e && e.closest('#stage') && !(oct && oct.contains(e))) return [x, y]; }
    }
    return [r.left + r.width / 2, r.top + r.height / 2];
  }, sel);
  await pg.mouse.click(pt[0], pt[1]);
}
/* 나가 있는 동안 큰 버튼(#btn-go = "다녀오는 중…" 글자만)을 누르면 바로 데려온다 (예전 #btn-skip — 주인 11-07 에 합침).
   막 누른 직후 0.6 s 는 건너뛰지 않으니(두 번 톡 보호) .can-skip 을 기다렸다가, 확인과 누르기를 페이지 안 한 틱에서 한다 (그사이 산책이 끝나 새 초대가 되지 않게).
   빨리 끝나는 차례(빈 차례)는 can-skip 전에 끝날 수 있다 → 그때는 누르지 않고 끝난 걸로 본다 */
async function skipAway(page, timeout) {
  await page.waitForFunction(function () {
    var b = document.getElementById('btn-go'); if (!b) return false;
    if (!b.classList.contains('away')) return true;
    if (b.classList.contains('can-skip')) { b.click(); return true; }
    return false;
  }, null, { timeout: timeout || 30000, polling: 50 });   /* 30 s: 부하 큰 기계(4코어에 부하 7)에선 10 s 가 모자랐다 */
}
/* 추억 앨범은 장면 오른쪽 위 아이콘(#btn-album)으로 여는 시트 (#album-sheet) — 카드·필터는 그 안에 있다. 카드 수 세기(#album .pcard)는 닫힌 채로도 된다 */
async function openAlbum(page) {
  if (await page.$('#album-sheet[open]')) return;
  await page.click('#btn-album');
  await page.waitForSelector('#album-sheet[open]');
}
async function closeAlbum(page) {
  if (!(await page.$('#album-sheet[open]'))) return;
  await page.click('#al-close');
  await page.waitForSelector('#album-sheet[open]', { state: 'hidden' });
}
async function openCard(page, sel) {
  await openAlbum(page);
  await page.click(sel || '#album .pcard');
  await page.waitForSelector('#poster-dialog[open]');
}
async function closePoster(page, keepAlbum) {
  await page.click('#pd-close');
  await page.waitForSelector('#poster-dialog[open]', { state: 'hidden' });
  if (!keepAlbum) await closeAlbum(page);
}

async function scenarioMain(browser) {
  console.log('\n== A. 성공 응답 (extract + thumb + links) · 핵심 루프');
  var s = await newPage(browser, 'ok');
  var page = s.page;
  await page.goto(DEV);
  await page.waitForSelector('#name-dialog[open]');
  var name = await pickName(page);
  await page.fill('#name-in', name);
  await page.click('#name-form button[type=submit]');
  await page.waitForSelector('#name-dialog[open]', { state: 'hidden' });
  ok((await page.textContent('#oct-name')).trim() === name, '이름 저장: ' + name);
  ok(await page.$('#log .lrow'), '첫 인사 로그 있음');
  ok((await page.textContent('#toast')).indexOf('비워 둬도') >= 0, '첫 실행 토스트');
  await page.screenshot({ path: path.join(SHOTS, 'phone-light-start.png') });

  await page.fill('#hint-in', '모자의 역사');
  await page.click('#btn-go');
  await page.waitForSelector('#btn-go.away', { timeout: 10000 });
  ok((await page.textContent('#btn-go')).indexOf('다녀오는 중') >= 0, '나가 있는 동안 버튼 라벨');
  ok(await page.evaluate(function () { return APP.state.trips.length === 1 && APP.state.trips[0].status === 'running'; }), 'running 여행이 저장됨');
  await page.waitForSelector('#log .lrow.typing, #log .lrow.c-amber', { timeout: 10000 });
  await page.waitForTimeout(1200);
  await page.click('#btn-go');   /* 큰 버튼 = 바로 데려오기 (0.6 s 지난 뒤) */
  await waitIdle(page);
  var st = await page.evaluate(function () {
    var t = APP.state.trips[0];
    return { kind: t.kind, status: t.status, lantern: APP.state.room.lantern, trips: APP.state.octopus.trips, invites: APP.state.octopus.invites, days: APP.state.octopus.days.length,
      stops: t.receipt ? t.receipt.stops.length : 0, read: t.receipt ? t.receipt.counts.read : 0, hasPoster: !!t.poster, octState: APP.state.octopus.state, firstPeek: (t.events.filter(function (e) { return e.type === 'peek'; })[0] || {}).target,
      hintFollowed: t.hint && t.hint.followed, hintNote: t.hint && t.hint.note };
  });
  console.log('   trip:', JSON.stringify(st));
  must(st.kind === 'out' && st.status === 'done', '여행 kind=out, done');
  ok(st.lantern === 1, '등불 1칸');
  ok(st.trips === 1 && st.invites === 1 && st.days === 1, '여행 1 · 초대 1 · 함께한 날 1');
  ok(st.stops >= 2, '정류장 ≥2 (' + st.stops + ')');
  ok(st.read >= 1, '성공 응답이면 read ≥1 (' + st.read + ')');
  /* 데모 두뇌는 힌트를 넷에 셋쯤 따른다 (날짜 시드 — 문어를 조종하지 않는다). 그래서 날마다 갈린다: 따른 날 → 첫 정류장 hat, 안 따른 날 → hat 은 길에서 빠지고 메모가 남는다 (test-brain 과 같은 약속) */
  if (st.hintFollowed === 'ignored') ok(st.firstPeek && st.firstPeek.id !== 'hat' && !!st.hintNote, "힌트 '모자의 역사' 를 오늘은 안 따름 → hat 없이 · 메모 '" + st.hintNote + "'");
  else ok(st.firstPeek && st.firstPeek.id === 'hat', "힌트 '모자의 역사' → 첫 정류장 hat (" + st.hintFollowed + ')');
  ok(st.octState === 'sleep', '마무리 뒤 문어 sleep');
  ok((await page.$$('#album .pcard')).length === 1, '앨범 카드 1개');
  ok((await wallCount(page)) === 1, '벽 썸네일 1개');
  ok((await page.$$('#pips .pip.on')).length === 1, '상태줄 pip 1개 켜짐');
  ok((await page.getAttribute('#pips', 'aria-label')) === '등불 1/8', 'pips aria-label');
  var strip = await page.evaluate(function () {
    var st = document.getElementById('status'), r = st.getBoundingClientRect(), tg = document.getElementById('brain-tag'), tr = tg && tg.getBoundingClientRect(), who = st.querySelector('.who').getBoundingClientRect();
    return { h: r.height, txt: st.textContent.replace(/\s+/g, ' ').trim(), rows: st.querySelectorAll('.srow').length, nameTop: document.getElementById('oct-name').getBoundingClientRect().top, pipsTop: document.getElementById('pips').getBoundingClientRect().top, demo: !!document.getElementById('chip-demo'), stat: !!document.getElementById('stat-trips'),
      tag: tg && !tg.hidden && tr.width > 0 && tr.right <= who.right + 0.5 ? tg.querySelector('[aria-hidden="true"]').textContent : null, tagSr: tg ? (tg.querySelector('.sr-only') || {}).textContent : null, tagFs: tg ? parseFloat(getComputedStyle(tg).fontSize) : 0 };
  });
  console.log('   strip:', JSON.stringify(strip));
  ok(strip.h <= 44 && strip.rows === 1 && Math.abs(strip.nameTop - strip.pipsTop) < 12, '상태 줄 한 줄 ≤44px (' + strip.h + 'px)');
  ok(/등불/.test(strip.txt) && /1\/8/.test(strip.txt) && !strip.demo && !strip.stat && !/여행|함께한 날/.test(strip.txt), "상태 줄: '등불 … 1/8', 예전 데모 두뇌 칩·여행·함께한 날 없음");
  ok(strip.tag === '데모' && strip.tagSr === '데모 규칙이 움직이는 중' && strip.tagFs <= 11, "이름 옆 작은 '데모' 표시 (" + strip.tagFs + "px, 화면 낭독기 '데모 규칙이 움직이는 중')");
  ok((await page.getAttribute('#hint-in', 'placeholder')) === '주제나 링크를 슬쩍 건네줘', '힌트 자리표시 문구');
  ok((await page.$$('#log .lrow')).length >= 5, '로그 행 ≥5');
  await page.waitForTimeout(200);
  var dlg = await page.evaluate(function () {
    var rows = document.querySelectorAll('#log .lrow.dialog'), cv = document.querySelector('#log .lrow.dialog canvas.lport-cv'); if (!cv) return { rows: rows.length, cv: false };
    var d = cv.getContext('2d').getImageData(0, 0, 64, 64).data, n = 0, colors = {}; for (var i = 0; i < d.length; i += 4) { if (d[i + 3] > 0) n++; colors[d[i] + ',' + d[i + 1] + ',' + d[i + 2]] = 1; }
    return { rows: rows.length, cv: true, exprs: Array.prototype.map.call(rows, function (r) { return r.dataset.expr; }), drawn: n, colors: Object.keys(colors).length, hidden: cv.getAttribute('aria-hidden'), css: getComputedStyle(cv).width, sceneExpr: APP.scene.expression(), cache: APP.portraitCache };
  });
  console.log('   dialog:', JSON.stringify(dlg));
  ok(dlg.cv && dlg.rows >= 3 && dlg.drawn > 64 * 64 * 0.5 && dlg.colors >= 3 && dlg.hidden === 'true' && dlg.css === '96px', '여행 뒤 대화창 행 + 초상 캔버스 (그려짐, aria-hidden, 96px)');
  ok(dlg.exprs && dlg.exprs.indexOf('calm') >= 0 && dlg.exprs.indexOf('curious') >= 0, '귀가 calm · 기억 curious 표정 행');
  ok(await hasItem(page, 'moss'), '등불 1 → 이끼 화분');
  var sc3 = await page.evaluate(function () { return { mode: APP.sceneMode, stats: APP.scene.stats(), webgl: !!(document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl')) }; });
  console.log('   scene:', JSON.stringify(sc3));
  ok(sc3.mode === (sc3.webgl ? '3d' : '2d'), '장면 모드 = WebGL 유무에 맞음 (' + sc3.mode + ')');
  if (sc3.mode === '3d') { ok(sc3.stats.calls > 0 && sc3.stats.calls <= 150, '3D 드로우콜 ≤150 (' + sc3.stats.calls + ')'); ok(sc3.stats.palette <= 72, '팔레트 ≤72색 (' + sc3.stats.palette + ' · ' + sc3.stats.paletteName + ')'); }
  var logText = await page.textContent('#log');
  var logLinesNow = await page.evaluate(logLines);   /* 보이는 줄마다: textContent 는 이웃 칸을 띄어쓰기 없이 붙인다 ('…걸 보고' + '하늘…') */
  var stChips = await page.evaluate(function () { return [].map.call(document.querySelectorAll('#log .ltext .st'), function (x) { return { w: x.textContent, img: !!x.querySelector('img.ua-ico.ua-both') }; }); });
  ok(stChips.length >= 1 && stChips.every(function (x) { return /^(읽음|책장 메모|모의 방문|못 읽음|앉아만 있었음)/.test(x.w) && x.img; }) && !/[\u2190-\u27BF]|[\uD83C-\uD83E][\uDC00-\uDFFF]/.test(logText),
    '로그 읽기 상태: 픽셀 그림 + 단어 (이모지 없음 — 주인 11-07) ' + JSON.stringify(stChips.slice(0, 2)));
  /* UI 아트 (css/ui-art.css · js/ui-art.js, docs/UI_ART.md) — 픽셀 모드 */
  var ua = await page.evaluate(function () {
    var sheet = Array.prototype.filter.call(document.styleSheets, function (x) { return /css\/ui-art\.css$/.test(x.href || ''); })[0], rules = 0;
    try { rules = sheet ? sheet.cssRules.length : 0; } catch (e) { rules = -1; }   /* file:// 에서는 cssRules 를 못 읽는다 → 아래 탐침으로 */
    var probe = document.createElement('span'); probe.className = 'ua-fx'; document.body.appendChild(probe);
    var probeDisp = getComputedStyle(probe).display; probe.remove();   /* ui-art.css 가 있으면 픽셀 모드 block · 시스템 모드 none, 없으면 inline */
    var voice = document.querySelector('#log .lrow.voice.ua-frame-dialog');
    var tool = document.querySelector('#log .lrow .ltool.ua-tool'), img = tool && tool.querySelector('img.ua-ico');
    var st = document.querySelector('#log .ltext .st.ua-st'), stImg = st && st.querySelector('img.ua-ico');
    function vis(el) { var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; }
    return { font: document.documentElement.getAttribute('data-font'), uiart: typeof UIART === 'object' && typeof UIART.onRow === 'function', rules: rules,
      probe: probeDisp, voice: !!voice, voiceBorder: voice ? getComputedStyle(voice).borderImageSource : '', newest: document.querySelectorAll('#log .lrow.ua-newest > .ua-next').length,
      img: !!img, imgOk: !!(img && img.complete && img.naturalWidth === 16), imgW: img ? img.getBoundingClientRect().width : 0,
      alt: img ? img.getAttribute('alt') : null, hidden: img ? img.getAttribute('aria-hidden') : null,
      label: tool ? tool.textContent.trim() : '', labelVis: tool ? vis(tool) : false,
      stImg: !!(stImg && stImg.naturalWidth === 16), stWord: st ? st.textContent.replace(/[^가-힣]/g, '') : '' };
  });
  console.log('   ui-art:', JSON.stringify(ua));
  ok(ua.uiart && (ua.rules > 10 || (ua.rules === -1 && ua.probe !== 'inline')), 'css/ui-art.css · js/ui-art.js 로드됨 (UIART, 탐침 display ' + ua.probe + ') — 콘솔 에러 0 은 아래 [A] 에서');
  if (ua.font === 'pixel') {
    ok(ua.voice && /frame_dialog\.png/.test(ua.voiceBorder), '목소리 행에 대화창 틀 클래스 (.ua-frame-dialog → ui.frame.dialog)');
    ok(ua.newest === 1, '▼ 는 가장 새 목소리 행 하나에만 (' + ua.newest + ')');
    ok(ua.img && ua.imgOk && ua.imgW === 32 && (ua.alt || ua.hidden === 'true') && ua.label.length >= 1 && ua.labelVis, '로그 행 아이콘 img(16→32px, alt/aria-hidden) + 보이는 라벨 (' + ua.label + ')');
    ok(ua.stImg && ua.stWord.length >= 2, '읽기 상태 칩: 아이콘 + 상태 단어 (' + ua.stWord + ')');
  }
  var harvest = logLinesNow.filter(reportFramed);
  ok(logLinesNow.length >= 5 && !harvest.length, "로그 " + logLinesNow.length + "줄에 '결과/리서치/보고' 같은 성과·보고 틀 없음 (동사 '…걸 보고' 만 괜찮음)" + (harvest.length ? ': ' + JSON.stringify(harvest.slice(0, 3)) : ''));
  var wStr = await page.evaluate(worldStrings), wBad = wStr.filter(reportFramed);   /* 오늘 시드가 안 고른 다리 문구까지 — 날짜와 상관없이 같은 검사 */
  ok(wStr.length > 0 && !wBad.length, 'WORLD 문구 ' + wStr.length + '개 전부 성과·보고 틀 없음' + (wBad.length ? ': ' + JSON.stringify(wBad.slice(0, 3)) : ''));

  console.log('\n== 새로고침 → 그대로');
  await page.waitForTimeout(1000);   /* file:// 원점의 localStorage 커밋이 새로고침과 겹치지 않게 (3D 렌더로 바쁜 탭에서는 300ms 로는 간헐 실패) */
  await page.reload();
  await page.waitForSelector('#btn-go:not(.away)');
  ok((await page.$$('#album .pcard')).length === 1, '새로고침 후 앨범 카드 1개');
  ok((await wallCount(page)) === 1, '새로고침 후 벽 썸네일 1개');
  ok((await page.$$('#pips .pip.on')).length === 1, '새로고침 후 등불 1칸');
  ok((await page.$$('#log .lrow')).length >= 5, '새로고침 후 로그가 trips 에서 다시 그려짐');
  ok(await page.evaluate(function () { return document.getElementById('oct').className.indexOf('st-sleep') >= 0; }), '새로고침 후 문어는 자고 있음');
  await page.screenshot({ path: path.join(SHOTS, 'phone-light.png') });

  console.log('\n== 앨범 아이콘 → 카드 탭 → 모달 앞면 → 뒤집기 → 일기');
  await openCard(page);
  ok(await page.$('#pd-front svg'), '앞면 SVG');
  ok(!(await page.evaluate(function () { return document.getElementById('flipper').classList.contains('flip'); })), '처음엔 앞면');
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(SHOTS, 'poster-front.png') });
  ok((await page.textContent('#pd-flip')) === '일기 전체 보기', "버튼 '일기 전체 보기' (화면 말은 영수증 대신 일기)");
  await page.click('#pd-flip');
  await page.waitForTimeout(reducedWait(700));
  ok(await page.evaluate(function () { return document.getElementById('flipper').classList.contains('flip'); }), '뒤집기 → .flip');
  var dh = await page.evaluate(function () { return { h3: document.querySelector('#pd-back .receipt h3').textContent, id: APP.state.trips[0].id, btn: document.getElementById('pd-flip').textContent }; });
  ok(/^일기 · \d{4}\.\d{2}\.\d{2}$/.test(dh.h3) && dh.h3.indexOf(dh.id) < 0 && dh.btn === '일기 접기', "뒷면 머리 '" + dh.h3 + "' (여행 id 없음) · 버튼 '일기 접기'");
  var rows = await page.$$('#pd-back .receipt .row');
  ok(rows.length >= 2, '영수증 정류장 ≥2 (' + rows.length + ')');
  var back = await page.textContent('#pd-back');
  ok(back.indexOf('고른 이: 데모 두뇌(규칙)') >= 0, "영수증 '고른 이: 데모 두뇌(규칙)'");
  ok(back.indexOf('힌트') >= 0 && /따라감|무시함|도중에 벗어남/.test(back), '영수증 힌트 따름 표기');
  ok((await page.$$('#pd-back .receipt a[href^="https://ko.wikipedia.org"]')).length >= 1, 'read 항목에 출처 링크');
  await page.screenshot({ path: path.join(SHOTS, 'receipt-back.png') });
  await closePoster(page);

  console.log('\n== 다크 모드 · ⚙ 설정');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(SHOTS, 'phone-dark.png') });
  await page.click('#btn-settings');
  await page.waitForSelector('#settings-sheet[open]');
  var rs = await page.textContent('#set-body');
  ok(/미리 만든 규칙/.test(rs) && /고른 이/.test(rs), "설정 '누가 고르나': 규칙이 고른다 · 고른 이는 일기에 (정직 표기)");
  ok((await page.textContent('#set-stats')) === '산책 1 · 함께한 날 1 · 읽음 ' + st.read, '설정 › 기록 한 줄: 산책 1 · 함께한 날 1 · 읽음 ' + st.read);
  await page.screenshot({ path: path.join(SHOTS, 'settings-dark.png') });
  await page.click('#set-close');
  await page.emulateMedia({ colorScheme: 'light' });

  console.log('\n== 두 번째 초대 (같은 힌트, seq 2 → 다른 시드)');
  await page.fill('#hint-in', '모자의 역사');
  await page.click('#btn-go');
  await skipAway(page);
  await waitIdle(page);
  var two = await page.evaluate(function () { var t = APP.state.trips; return { n: t.length, seeds: t.map(function (x) { return x.seed; }), lantern: APP.state.room.lantern, days: APP.state.octopus.days.length, invites: APP.state.octopus.invites, sm: t[1].summary }; });
  ok(two.n === 2 && two.seeds[0] !== two.seeds[1], '같은 힌트 두 번 → 다른 시드');
  ok(two.lantern === 1 && two.invites === 2 && (!two.sm || !two.sm.lantern), '같은 날 두 번째 초대 → 등불 그대로 1칸 (초대한 날마다 1칸), 초대 수는 2 · 요약에 등불 없음');
  ok(two.days === 1, '같은 날 → 함께한 날 그대로 1');
  ok((await page.$$('#album .pcard')).length >= 1, '앨범 카드 ≥1');

  console.log('\n== 이벤트 JSON 불러오기 (by: mcp)');
  var evs = [{ type: 'depart', t: 0, hint: '' }, { type: 'peek', t: 1000, target: { kind: 'room', id: 'hat', title: '모자' }, status: 'builtin', ms: 4000, note: '책장 메모' },
    { type: 'peek', t: 2000, target: { kind: 'url', url: 'https://example.org/x' }, status: 'simulated', ms: 0 }, { type: 'return', t: 3000, reason: 'enough' },
    { type: 'remember', t: 3500, stopIdx: 0, sticker: 'hat', line: '모델이 보낸 산책' }, { type: 'hang_poster', t: 4000 }, { type: 'wrap_up', t: 4500, reaction: '덤덤' }];
  await page.click('#demo summary');
  await page.fill('#d-json', JSON.stringify(evs));
  await page.click('#d-import');
  await skipAway(page);
  await waitIdle(page);
  var mcp = await page.evaluate(function () { var t = APP.state.trips[APP.state.trips.length - 1]; return { by: t.by, kind: t.kind, stops: t.receipt.stops.length, st: t.receipt.stops.map(function (s) { return s.status; }), lantern: APP.state.room.lantern }; });
  ok(mcp.by === 'mcp' && mcp.kind === 'out' && mcp.stops === 2, 'MCP 재생: by=mcp, 정류장 2');
  ok(mcp.st.indexOf('read') < 0, "MCP 재생: 읽지 않은 것을 '읽음' 으로 올리지 않음");
  await openCard(page, '#album .pcard:last-child');
  ok((await page.textContent('#pd-back')).indexOf('고른 이: 모델(MCP)') >= 0, "영수증 '고른 이: 모델(MCP)'");
  await closePoster(page);
  /* 읽음이 확인된 정류장에서 모델이 쓴 메모는 따옴표 없이 '모델이 쓴 메모' 로, 따옴표는 위키백과 요약에만 (모델 말이 인용문처럼 보이지 않게) */
  var nb = await page.evaluate(function () {
    var t = { by: 'mcp', kind: 'out', date: '2026-11-07', seq: 9, hint: { raw: '' }, receipt: { stops: [{ name: '모자', status: 'read', ms: 1000, note: '오래된 물건이라 놀랐어', noteBy: 'model',
      source: { url: 'https://ko.wikipedia.org/wiki/%EB%AA%A8%EC%9E%90', extract: '모자는 머리에 쓰는 물건이다.' } }], counts: { read: 1 } } };
    var d = document.createElement('div'); d.innerHTML = APP.receiptHTML(t);
    return [].map.call(d.querySelectorAll('.row .note'), function (e) { return e.textContent; });
  });
  ok(nb.length === 2 && nb[0].indexOf('“') < 0 && /모델이 쓴 메모/.test(nb[0]) && nb[1] === '“모자는 머리에 쓰는 물건이다.”', "일기: 모델 메모는 따옴표 없이 '모델이 쓴 메모', 위키 요약만 따옴표 " + JSON.stringify(nb));

  console.log('\n== 데모 조작 (사람)');
  ok(await page.evaluate(function () { return document.getElementById('d-peek').disabled && !document.getElementById('d-depart').disabled; }), '출발 전: 출발만 활성');
  await page.click('#d-depart');
  ok(await page.evaluate(function () { return !document.getElementById('d-peek').disabled && document.getElementById('d-depart').disabled; }), '나간 뒤: 기웃/귀가 활성');
  await page.fill('#d-peek-in', '깃털'); await page.click('#d-peek');
  await page.click('#d-return');
  ok(await page.evaluate(function () { return !document.getElementById('d-poster').disabled && !document.getElementById('d-wrap').disabled; }), '귀가 뒤: 포스터/마무리 활성');
  await page.click('#d-poster'); await page.click('#d-wrap');
  await waitIdle(page);
  var hum = await page.evaluate(function () { var t = APP.state.trips[APP.state.trips.length - 1]; return { by: t.by, kind: t.kind, lantern: APP.state.room.lantern }; });
  ok(hum.by === 'human' && hum.kind === 'out', '사람이 조작한 여행 저장 (by=human)');

  console.log('\n== 집에 있는 날 · 빈 차례 (이벤트 재생, 다음 날)');
  await page.evaluate(function (d) { window.__ppolTest = { today: d }; }, dayAfter(1));   /* 새 날 → 그날 첫 차례라 등불이 켜진다 */
  await page.fill('#d-json', JSON.stringify([{ type: 'stay_home', t: 0, activity: 'count_rain', line: '창가에서 빗방울을 세다가 잠들었어', anchor: 'window' }, { type: 'wrap_up', t: 2000, reaction: '졸림' }]));
  await page.click('#d-import'); await skipAway(page); await waitIdle(page);
  var home = await page.evaluate(function () { var t = APP.state.trips[APP.state.trips.length - 1]; return { kind: t.kind, type: t.poster && t.poster.type, trips: APP.state.octopus.trips, lantern: APP.state.room.lantern, log: document.getElementById('log').textContent }; });
  ok(home.kind === 'home' && home.type === 'note', '집에 있는 날 → 쪽지');
  ok(home.log.indexOf('오늘은 집. 등불 +1') >= 0 && !/미안|아쉽/.test(home.log), "로그 '오늘은 집. 등불 +1', 사과 문구 없음");
  await openAlbum(page);
  await page.click('.fchip[data-f="note"]');
  ok((await page.$$('#album .pcard.note')).length >= 1, '앨범 필터 쪽지 → 쪽지 카드');
  await page.click('#album .pcard.note'); await page.waitForSelector('#poster-dialog[open]');
  ok((await page.textContent('#pd-back')).indexOf('오늘은 집. 등불 +1') >= 0, "쪽지 뒷면 '오늘은 집. 등불 +1'");
  await page.screenshot({ path: path.join(SHOTS, 'note-front.png') });
  await closePoster(page, true); await page.click('.fchip[data-f="all"]'); await closeAlbum(page);
  var before = await page.evaluate(function () { return { l: APP.state.room.lantern, n: APP.state.trips.length, tr: APP.state.octopus.trips }; });
  await page.fill('#d-json', JSON.stringify([{ type: 'empty_turn', t: 0 }]));
  await page.click('#d-import'); await waitIdle(page);
  var empty = await page.evaluate(function () { var t = APP.state.trips[APP.state.trips.length - 1]; return { kind: t.kind, poster: t.poster, l: APP.state.room.lantern, n: APP.state.trips.length, tr: APP.state.octopus.trips }; });
  ok(empty.kind === 'empty' && !empty.poster && empty.l === before.l && empty.n === before.n + 1 && empty.tr === before.tr, '빈 차례 (같은 날 두 번째 차례): 포스터 없음, 등불 그대로, 여행 수 그대로');
  await page.evaluate(function (d) { window.__ppolTest = { today: d }; }, dayAfter(2));
  await page.fill('#d-json', JSON.stringify([{ type: 'empty_turn', t: 0 }]));
  await page.click('#d-import'); await waitIdle(page);
  var empty2 = await page.evaluate(function () { return { l: APP.state.room.lantern, days: APP.state.octopus.days.length }; });
  ok(empty2.l === Math.min(8, before.l + 1) && empty2.days === 3, '빈 차례도 그날 첫 차례면 등불 +1 (아무것도 안 해도 된다) · 함께한 날 3');
  await page.evaluate(function () { delete window.__ppolTest; });
  ok((await page.evaluate(function () { return document.documentElement.scrollWidth; })) <= 360, '가로 스크롤 없음 (360px)');

  console.log('\n== 내보내기 JSON 형식');
  var exp = await page.evaluate(function () { var s = JSON.stringify(APP.state); return JSON.parse(s).v; });
  ok(exp === 2, 'state.v === 2');
  ok(await page.evaluate(function () { return typeof APP.posterSVG(APP.state.trips[0], 300, 400) === 'string' && APP.posterSVG(APP.state.trips[0]).indexOf('<svg') === 0; }), 'APP.posterSVG 문자열');
  reportErrors(s.bag, 'A');
  await s.ctx.close();
}
function reducedWait(ms) { return ms; }
function reportErrors(bag, label) {
  ok(bag.length === 0, '[' + label + '] 페이지 에러/콘솔 에러 0' + (bag.length ? ': ' + bag.join(' | ') : ''));
  if (bag.ignored.length) console.log('   (무시한 리소스 404: ' + bag.ignored.length + '건, 예: ' + bag.ignored[0].slice(0, 80) + ')');
}

async function scenarioFail(browser, mode, label) {
  console.log('\n== ' + label);
  var s = await newPage(browser, mode);
  var page = s.page;
  await page.goto(INDEX);
  await page.waitForSelector('#name-dialog[open]');
  var name = await pickName(page);
  await page.fill('#name-in', name);
  await page.click('#name-form button[type=submit]');
  await page.fill('#hint-in', '모자의 역사');
  await page.click('#btn-go');
  await skipAway(page);
  await waitIdle(page);
  var r = await page.evaluate(function () { var t = APP.state.trips[0]; return { kind: t.kind, st: t.receipt ? t.receipt.stops.map(function (x) { return x.status; }) : [], lantern: APP.state.room.lantern }; });
  console.log('   statuses:', JSON.stringify(r.st));
  ok(r.kind === 'out', 'kind=out');
  ok(r.st.indexOf('read') < 0, 'fetch 실패 → read 없음 (정직하게 builtin/failed)');
  ok(r.st.length >= 2 && r.st.every(function (x) { return ['builtin', 'failed', 'none', 'simulated'].indexOf(x) >= 0; }), '상태값이 허용 집합 안');
  ok(r.lantern === 1, '실패해도 등불은 켜진다');
  await openCard(page);
  await page.click('#pd-flip');
  var back = await page.textContent('#pd-back');
  var rst = await page.evaluate(function () { return [].map.call(document.querySelectorAll('#pd-back .receipt .row .st'), function (x) { return x.textContent; }); });
  ok(rst.length >= 1 && !rst.some(function (x) { return /^읽음/.test(x); }), "영수증 정류장에 '읽음' 없음 (" + rst.join(' / ') + ')');
  ok(/책장 메모|못 읽음/.test(back), "영수증에 '책장 메모' 또는 '못 읽음' (상태는 단어 + 픽셀 그림)");
  if (mode === 'missing') await page.screenshot({ path: path.join(SHOTS, 'receipt-missing.png') });
  reportErrors(s.bag, label);
  await s.ctx.close();
}

async function scenarioMigrate(browser) {
  console.log('\n== D. v1 → v2 마이그레이션 · running 복구 · 축소 모션');
  var v1 = { octopus: { name: '옛문어', total_trips: 3 }, room: { light_level: 2 }, currency: { raindrops: 40, hearts: 4 }, posters: [{ id: 'pa', title: 'arxiv.org', ts: Date.now() - 86400000 * 2 }, { id: 'pb', title: '오늘의 탐험', ts: Date.now() - 86400000 }] };
  var s = await newPage(browser, 'ok', [{ content: "localStorage.setItem('ppolppol_v1', " + JSON.stringify(JSON.stringify(v1)) + ');' }]);
  var page = s.page;
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(INDEX);
  await page.waitForSelector('#btn-go:not(.away)');
  var m = await page.evaluate(function () { return { name: APP.state.octopus.name, trips: APP.state.octopus.trips, invites: APP.state.octopus.invites, lantern: APP.state.room.lantern, n: APP.state.trips.length, by: APP.state.trips[0].by, line: APP.state.trips[0].poster.line, bak: !!localStorage.getItem('ppolppol_v1_backup'), v1: localStorage.getItem('ppolppol_v1'), v2: !!localStorage.getItem('ppolppol_v2') }; });
  ok(m.name === '옛문어' && m.trips === 3 && m.invites === 4 && m.lantern === 2, '이름·여행·초대(hearts)·등불 이전');
  ok(m.n === 2 && m.by === 'legacy' && m.line.indexOf('복원된 포스터') >= 0, '옛 포스터 → legacy 여행 (정직한 문구)');
  ok(m.bak && !m.v1 && m.v2, 'ppolppol_v1 → ppolppol_v1_backup 로 이름만 바꿈, v2 저장');
  ok((await page.$$('#album .pcard')).length === 2, '복원 포스터 카드 2개');
  /* 오늘의 산책은 오늘 칸만 (주인 11-07) — 지난 날(옛 포스터 둘)은 앨범 › 일기, 새 날이 위 */
  var dd = await page.evaluate(function () {
    var past = document.querySelectorAll('#log .lday:not([data-day="' + document.querySelector('#log .lday').dataset.day + '"]), #log details').length;
    APP.openAlbum(); document.querySelector('#album-sheet .fchip[data-f="diary"]').click();
    var days = [].map.call(document.querySelectorAll('#album-diary details.dday'), function (d) { return d.dataset.day; }), rows = document.querySelectorAll('#album-diary .dday[open] .lrow').length;
    document.querySelector('#album-sheet .fchip[data-f="all"]').click(); document.getElementById('album-sheet').close();
    return { past: past, days: days, rows: rows };
  });
  ok(dd.past === 0 && dd.days.length === 2 && dd.days[0] > dd.days[1] && dd.rows >= 1, '지난 날 로그는 아래 오늘 칸에 없고 앨범 › 일기에 (새 날 먼저 · 가장 새 날 펼침) ' + JSON.stringify(dd));
  ok(!(await page.$('#name-dialog[open]')), '이름이 있으니 이름 모달 없음');
  /* running 여행 심어 두고 새로고침 → 즉시 귀가 */
  await page.evaluate(async function () {
    var dk = new Date(); dk = dk.getFullYear() + '-' + String(dk.getMonth() + 1).padStart(2, '0') + '-' + String(dk.getDate()).padStart(2, '0');
    var seed = BRAIN.hashSeed(dk, '', 1, APP.state.octopus.name);
    var t = await BRAIN.plan({ seed: seed, dateKey: dk, seq: 1, hint: '', name: APP.state.octopus.name, state: { visits: {}, affinity: {}, lantern: 2, recent: [], todayOut: 0 }, now: new Date(), online: false, by: 'demo' });
    APP.state.trips.push(Object.assign({ id: 'trip_run1', date: dk, seq: 1, seed: seed, status: 'running', startedAt: Date.now() - 60000, endedAt: null }, t));
    return { saved: APP.save(), kind: t.kind, n: APP.state.trips.length, stored: (JSON.parse(localStorage.getItem('ppolppol_v2') || '{}').trips || []).map(function (x) { return x.id + ':' + x.status; }) };
  }).then(function (inj) { console.log('   injected:', JSON.stringify(inj)); });
  await page.waitForTimeout(1000);   /* 위와 같은 이유 */
  await page.reload();
  await page.waitForSelector('#btn-go:not(.away)');
  await page.waitForFunction(function () { return APP.state.trips.every(function (t) { return t.status === 'done'; }); });
  var rr = await page.evaluate(function () {
    var sv = null; try { sv = JSON.parse(localStorage.getItem('ppolppol_v2') || 'null'); } catch (e) {}
    var run = sv && sv.trips ? sv.trips.filter(function (t) { return t.id === 'trip_run1'; })[0] : null;
    return { lantern: APP.state.room.lantern, invites: APP.state.octopus.invites, log: document.getElementById('log').textContent, oct: document.getElementById('oct').className, kind: run ? run.kind : null,
      away: [].filter.call(document.querySelectorAll('#log .lrow'), function (row) { return row.textContent.indexOf('네가 없는 동안') >= 0; }).map(function (row) { var tl = row.querySelector('.ltool'), tx = row.querySelector('.ltext'); return (tl ? tl.textContent : '?') + ' · ' + (tx ? tx.textContent : row.textContent); }) };
  });
  console.log('   resume:', JSON.stringify({ lantern: rr.lantern, invites: rr.invites, kind: rr.kind, away: rr.away, oct: rr.oct.trim(), tail: rr.log.slice(-60) }));
  ok(rr.lantern === 3 && rr.invites === 5, 'running 여행 즉시 귀가 처리 (등불 +1, 초대 +1)');
  /* 심은 여행은 오늘 시드대로라 외출일 수도 집일 수도 빈 차례일 수도 있다 → 복구된 여행 종류(localStorage)에 맞는 한 줄 */
  ok(JSON.stringify(rr.away) === JSON.stringify(AWAY_ROWS[rr.kind] || ['?']), '복구 한 줄이 복구된 여행 종류(' + rr.kind + ')대로: ' + JSON.stringify(rr.away) + ' — 기대 ' + JSON.stringify(AWAY_ROWS[rr.kind] || ['?']));
  ok(rr.oct.indexOf('st-sleep') >= 0 || rr.oct.indexOf('st-idle') >= 0, '복구 뒤 문어 상태 유효 (' + rr.oct.trim() + ')');
  /* 축소 모션에서도 초대 한 번 (즉시 이동 경로) */
  await page.fill('#hint-in', 'https://example.org/page');
  ok((await page.textContent('#hint-help')).indexOf('모의 방문') >= 0, 'URL 힌트 도움말');
  /* 그날 시드가 집·빈 차례면 URL 정류장도 건너뛰기도 시험이 안 된다 → 이 초대만 외출로 강제 (brain.js 테스트 훅, plan 때 읽음 · 난수 순서 그대로) */
  await page.evaluate(function () { window.__ppolTest = { forceKind: 'out' }; });
  await page.click('#btn-go');
  await skipAway(page);
  await waitIdle(page);
  var u = await page.evaluate(function () { delete window.__ppolTest; var t = APP.state.trips[APP.state.trips.length - 1]; return { kind: t.kind, st: t.receipt ? t.receipt.stops.map(function (x) { return x.status; }) : [] }; });
  ok(u.kind === 'out' && u.st[0] === 'simulated', 'URL 힌트 → 외출 · 첫 정류장 simulated(모의 방문) (' + JSON.stringify(u) + ')');
  await page.screenshot({ path: path.join(SHOTS, 'phone-reduced-motion.png') });
  reportErrors(s.bag, 'D');
  await s.ctx.close();
}

/* (a) 강제 집에 있는 날: window.__ppolTest={forceKind:'home'} 는 BRAIN.plan 이 훅이 있을 때만 존중한다 */
async function scenarioForcedHome(browser) {
  console.log('\n== E. 강제 집에 있는 날 (window.__ppolTest.forceKind=home)');
  var s = await newPage(browser, 'ok', [{ content: "window.__ppolTest = { forceKind: 'home' };" }]);
  var page = s.page;
  await page.goto(INDEX);
  await page.waitForSelector('#name-dialog[open]');
  await page.fill('#name-in', '집문어');
  await page.click('#name-form button[type=submit]');
  await page.waitForSelector('#name-dialog[open]', { state: 'hidden' });
  var before = await page.evaluate(function () { return { l: APP.state.room.lantern, tr: APP.state.octopus.trips, inv: APP.state.octopus.invites }; });
  await page.fill('#hint-in', '모자의 역사');
  await page.click('#btn-go');
  await skipAway(page);
  await waitIdle(page);
  var r = await page.evaluate(function () {
    var t = APP.state.trips[APP.state.trips.length - 1];
    return { kind: t.kind, status: t.status, type: t.poster && t.poster.type, line: t.poster && t.poster.line, act: t.receipt && t.receipt.activity && t.receipt.activity.id,
      l: APP.state.room.lantern, tr: APP.state.octopus.trips, inv: APP.state.octopus.invites, oct: document.getElementById('oct').className,
      log: document.getElementById('log').textContent, cards: document.querySelectorAll('#album .pcard.note').length };
  });
  r.wall = await wallCount(page);
  console.log('   home:', JSON.stringify({ kind: r.kind, type: r.type, act: r.act, line: r.line }));
  must(r.kind === 'home' && r.status === 'done', '강제 집 → kind=home, done');
  ok(r.type === 'note' && r.line && r.line.length > 0, '쪽지 카드 (poster.type=note, 한 줄 있음)');
  ok(r.l === before.l + 1, '등불 +1 (' + before.l + ' → ' + r.l + ')');
  ok(r.tr === before.tr, '여행 횟수 그대로 (' + r.tr + ')');
  ok(r.inv === before.inv + 1, '초대 +1');
  ok(r.cards === 1 && r.wall === 1, '앨범 쪽지 1 · 벽 1');
  ok(r.log.indexOf('오늘은 집. 등불 +1') >= 0, "로그 '오늘은 집. 등불 +1'");
  ok(!/미안|죄송|아쉽|못 나가/.test(r.log), '사과·아쉬움 문구 없음');
  ok(r.oct.indexOf('st-away') < 0, '집에 있는 날 문어는 방을 떠나지 않음 (' + r.oct.trim() + ')');
  /* 훅이 없으면 강제되지 않는다: 같은 시드로 훅 없이 계산 → 강제값과 무관한 보통 결과 */
  var plain = await page.evaluate(async function () {
    var t = APP.state.trips[APP.state.trips.length - 1];
    var inp = { seed: t.seed, dateKey: t.date, seq: t.seq, hint: t.hint.raw, name: APP.state.octopus.name, state: { visits: {}, affinity: {}, lantern: 0, recent: [], todayOut: 0 }, now: new Date(), online: false };
    window.__ppolTest = { forceKind: 'out' }; var out = await BRAIN.plan(inp);
    delete window.__ppolTest; var a = await BRAIN.plan(inp), b = await BRAIN.plan(inp);
    return { out: out.kind, same: JSON.stringify(a.events) === JSON.stringify(b.events), plainKind: a.kind };
  });
  ok(plain.out === 'out', "forceKind:'out' → kind=out");
  ok(plain.same, '훅 제거 뒤 결정적 (같은 입력 → 같은 events)');
  reportErrors(s.bag, 'E');
  await s.ctx.close();
}

/* (b) v1 마이그레이션 — 과제에 적힌 그대로의 페이로드 */
async function scenarioMigrateExact(browser) {
  console.log('\n== F. v1 → v2 마이그레이션 (뚜루 · total_trips 3 · light_level 2 · hearts 4 · 포스터 1)');
  var v1 = { octopus: { name: '뚜루', total_trips: 3 }, room: { light_level: 2 }, currency: { hearts: 4 }, posters: [{ id: 'p1', title: '옛 포스터', ts: 1 }] };
  var s = await newPage(browser, 'ok', [{ content: "localStorage.setItem('ppolppol_v1', " + JSON.stringify(JSON.stringify(v1)) + ');' }]);
  var page = s.page;
  await page.goto(INDEX);
  await page.waitForSelector('#btn-go:not(.away)');
  var m = await page.evaluate(function () {
    var t = APP.state.trips[0];
    return { name: APP.state.octopus.name, trips: APP.state.octopus.trips, invites: APP.state.octopus.invites, lantern: APP.state.room.lantern,
      n: APP.state.trips.length, by: t && t.by, kind: t && t.kind, line: t && t.poster && t.poster.line, title: t && t.poster && t.poster.title, events: t && t.events.length, receipt: t && t.receipt,
      pips: document.querySelectorAll('#pips .pip.on').length, pipsN: (document.querySelector('#pips .pips-n') || {}).textContent, nameEl: document.getElementById('oct-name').textContent,
      rsStats: (function () { APP.openSettings(); var t = document.getElementById('set-stats').textContent; document.getElementById('settings-sheet').close(); return t; })(),
      bak: localStorage.getItem('ppolppol_v1_backup'), v1: localStorage.getItem('ppolppol_v1'), cards: document.querySelectorAll('#album .pcard').length, nameDlg: !!document.querySelector('#name-dialog[open]') };
  });
  ok(m.name === '뚜루' && m.nameEl === '뚜루', '이름 뚜루 유지');
  ok(m.lantern === 2 && m.pips === 2 && m.pipsN === '2/8', '등불 2 (light_level) · pip 2 · 2/8');
  ok(m.trips === 3 && /^산책 3 · /.test(m.rsStats), '여행 3 (total_trips) — 설정 › 기록 한 줄 (' + m.rsStats + ')');
  ok(m.invites === 4, '초대 4 (hearts)');
  ok(m.n === 1 && m.by === 'legacy' && m.kind === 'out' && m.events === 0 && m.receipt === null, '옛 포스터 1 → by:legacy, events 없음, receipt 없음');
  ok(m.title === '옛 포스터' && m.line === '(복원된 포스터 · 기록 없음)', "legacy 카드 한 줄 '(복원된 포스터 · 기록 없음)'");
  ok(m.cards === 1 && !m.nameDlg, '앨범 카드 1 · 이름 모달 없음');
  ok(m.bak && JSON.parse(m.bak).octopus.name === '뚜루' && m.v1 === null, 'ppolppol_v1 → ppolppol_v1_backup (내용 보존)');
  await openCard(page);
  var front = await page.textContent('#pd-front');
  ok(front.indexOf('복원된 포스터') >= 0, '앞면에 복원 문구');
  await page.click('#pd-flip');
  await page.waitForTimeout(700);
  var back = await page.textContent('#pd-back');
  ok(back.indexOf('기록은 남아 있지 않아') >= 0 && !/읽음 ·|\d초/.test(back), '뒷면: 기록 없음 정직 표기, 읽음 주장 없음');
  ok(back.indexOf('고른 이') >= 0, "뒷면 '고른 이' 표기");
  await closePoster(page);
  reportErrors(s.bag, 'F');
  await s.ctx.close();
}

/* H. §17.1 이틀째 · §17.3 귀가 요약: window.__ppolTest.today 로 날짜를 넘긴다 (훅이 있을 때만 app 이 존중)
   1일째 외출 → 요약 행 · 메모 저장 → 2일째 새로고침 → 첫 인사 = 어제 memo.tomorrow 그대로 → 같은 힌트 재방문 → 기웃 행 한마디 · 지난번 메모 · 날씨 */
async function scenarioDay2(browser) {
  console.log('\n== H. 이틀째 메모 인사 · 재방문 · 귀가 요약 (§17.1 · §17.3)');
  var DAY1 = '2026-11-03', DAY2 = '2026-11-04';
  /* 날짜 훅은 init 스크립트에만 둔다 (localStorage 에 두지 않는다): file:// 새로고침 직후 문서가 원점 localStorage 를 통째로 빈 것으로 보는
     크로미움 경합(tools/test-resume.js 'empty-snapshot') 이 나면 '__smoke_today' 도 같이 사라져 2일째가 1일째로 돌아갔다 (H 간헐 실패의 원인).
     app 은 같은 탭 미러(window.name)로 기록을 살리지만 테스트 입력은 거기 없다. 2일째 init 스크립트는 무조건 덮어쓰고, 1일째 것은 비어 있을 때만 쓴다 → 실행 순서와 무관 */
  var s = await newPage(browser, 'ok', [{ content: "window.__ppolTest = window.__ppolTest || { today: '" + DAY1 + "', forceKind: 'out' };" }]);
  var page = s.page;
  await page.goto(INDEX);
  await page.waitForSelector('#name-dialog[open]');
  /* 두 날 모두 힌트를 따라 모자에서 시작하는 이름 */
  var name = await page.evaluate(async function (days) {
    var names = ['뚜루', '안개', '삐죠', '구름', '조약돌', '먹물', '단추', '파도', '이끼', '별', '솔방울', '종이배'];
    for (var n of names) {
      var good = true;
      for (var d of days) {
        var t = await BRAIN.plan({ seed: BRAIN.hashSeed(d, '모자의 역사', 1, n), dateKey: d, seq: 1, hint: '모자의 역사', name: n, state: { visits: { hat: 1 }, affinity: {}, lantern: 0, recent: [], todayOut: 0 }, now: new Date(), online: false, by: 'demo' });
        if (!(t.kind === 'out' && t.receipt.stops[0].nodeId === 'hat')) { good = false; break; }
      }
      if (good) return n;
    }
    return names[0];
  }, [DAY1, DAY2]);
  await page.fill('#name-in', name);
  await page.click('#name-form button[type=submit]');
  await page.waitForSelector('#name-dialog[open]', { state: 'hidden' });
  async function goTrip() {
    await page.fill('#hint-in', '모자의 역사');
    await page.click('#btn-go');
    await skipAway(page);
    await waitIdle(page);
    await page.waitForTimeout(300);
  }
  function summaryOf(t) {
    var sm = t.summary, p = ['오늘 바뀐 것'];
    if (sm.lantern) p.push('등불 +1'); if (sm.rooms) p.push('새 방 ' + sm.rooms + '곳'); if (sm.souvenir) p.push('기념품 ' + sm.souvenir); if (sm.poster) p.push('포스터 ' + sm.poster); if (sm.note) p.push('쪽지 ' + sm.note);
    return p.join(' · ');
  }
  await goTrip();
  var d1 = await page.evaluate(function () {
    var t = APP.state.trips[APP.state.trips.length - 1], rows = document.querySelectorAll('#log .lday[data-day="' + t.date + '"] .lrow'), last = rows[rows.length - 1];
    return { date: t.date, kind: t.kind, memo: t.memo, weather: t.weather, summary: t.summary, stops: t.receipt.stops.map(function (x) { return x.nodeId; }), notes: APP.state.notes,
      lastLabel: last && last.querySelector('.ltool').textContent, lastText: last && last.querySelector('.ltext').textContent, lastDialog: last && last.classList.contains('dialog') };
  });
  console.log('   day1:', JSON.stringify({ date: d1.date, stops: d1.stops, memo: d1.memo && d1.memo.tomorrow, weather: d1.weather, summary: d1.lastText }));
  must(d1.date === DAY1 && d1.kind === 'out', '1일째 외출 (날짜 훅 ' + DAY1 + ')');
  ok(d1.memo && typeof d1.memo.tomorrow === 'string' && d1.memo.tomorrow.length > 0 && d1.memo.tomorrow.length <= 60, 'trip.memo.tomorrow (≤60): ' + (d1.memo && d1.memo.tomorrow));
  ok(d1.notes.hat && d1.notes.hat.text === d1.memo.notes.hat && d1.notes.hat.date === DAY1, 'state.notes.hat = {text, tripId, date}');
  ok(d1.weather === 'rain', '1일째 trip.weather 저장 (' + d1.weather + ')');
  ok(d1.lastLabel === '요약' && !d1.lastDialog && d1.lastText === summaryOf(d1), '귀가 요약 시스템 행: ' + d1.lastText);
  ok(/^오늘 바뀐 것 · 등불 \+1 · 새 방 \d+곳 · (기념품 1 · )?포스터 1$/.test(d1.lastText), '요약 형식 (등불·새 방·포스터, 0 항목 생략)');

  /* 2일째 */
  await page.addInitScript({ content: "window.__ppolTest = { today: '" + DAY2 + "', forceKind: 'out' };" });
  await page.reload();
  await page.waitForSelector('#btn-go:not(.away)');
  await page.waitForTimeout(400);
  var g = await page.evaluate(function (d) {
    var sec = document.querySelector('#log .lday[data-day="' + d + '"]'), rows = sec ? sec.querySelectorAll('.lrow') : [];
    return [].map.call(rows, function (r) { return { label: r.querySelector('.ltool').textContent, text: r.querySelector('.ltext').textContent, expr: r.dataset.expr || null, dialog: r.classList.contains('dialog') }; });
  }, DAY2);
  console.log('   day2 greeting:', JSON.stringify(g));
  ok(g.length === 2 && g[0].label === '오늘', '2일째: 시각 인사 행 (집 목소리 \'오늘\')');
  ok(g[1] && g[1].label === '어제 메모' && g[1].text === d1.memo.tomorrow, '2일째 첫 인사 = 어제 memo.tomorrow 그대로');
  ok(g[1] && g[1].dialog && g[1].expr === 'calm', "메모 인사는 문어 대화창 행 (초상 'calm')");
  await page.evaluate(function () { var r = document.querySelector('#log .lrow.memo'); if (r) r.scrollIntoView({ block: 'center' }); });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(SHOTS, 'phone-day2-greeting.png') });

  await goTrip();
  var d2 = await page.evaluate(function (d) {
    var t = APP.state.trips[APP.state.trips.length - 1], sec = document.querySelector('#log .lday[data-day="' + d + '"]');
    var peek = [].filter.call(sec.querySelectorAll('.lrow'), function (r) { return r.querySelector('.ltool').textContent === '기웃'; })[0];
    var rows = sec.querySelectorAll('.lrow'), last = rows[rows.length - 1];
    if (peek) peek.scrollIntoView({ block: 'center' });
    return { date: t.date, stops: t.receipt.stops.map(function (x) { return x.nodeId; }), aside: (t.events.filter(function (e) { return e.type === 'peek'; })[0] || {}).aside, recall: t.recall, weather: t.weather,
      peekSubs: peek ? [].map.call(peek.querySelectorAll('.sub'), function (x) { return x.textContent; }) : [], summary: t.summary, lastLabel: last.querySelector('.ltool').textContent, lastText: last.querySelector('.ltext').textContent,
      greetStill: !!sec.querySelector('.lrow.memo'), notesHat: APP.state.notes.hat };
  }, DAY2);
  console.log('   day2:', JSON.stringify({ stops: d2.stops, aside: d2.aside, subs: d2.peekSubs, summary: d2.lastText }));
  must(d2.date === DAY2 && d2.stops[0] === 'hat', '2일째 같은 힌트 → 다시 모자');
  ok(d2.stops.length >= 3, '재방문: 한 단계 더 깊게 (정류장 ' + d2.stops.length + ' ≥ 3)');
  ok(d2.aside === '모자? 그거 1일 전에 봤잖아. 이번엔 안쪽까지 가 볼게' && d2.peekSubs.indexOf(d2.aside) >= 0, '첫 기웃 행: "' + d2.aside + '"');
  ok(d2.peekSubs.indexOf("지난번 메모: '" + d1.memo.notes.hat + "'") >= 0, "기웃 행: 지난번 메모: '" + d1.memo.notes.hat + "'");
  ok(d2.peekSubs.indexOf('지난번에도 비가 왔어') >= 0 || d2.peekSubs.some(function (x) { return /^지난번엔 /.test(x); }), '기웃 행: 그때 날씨 한 줄');
  ok(d2.lastLabel === '요약' && d2.lastText === summaryOf({ summary: d2.summary }), '2일째 귀가 요약: ' + d2.lastText);
  ok(d2.notesHat && d2.notesHat.date === DAY2, 'state.notes.hat 최신 것으로 갱신');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SHOTS, 'phone-day2-revisit.png') });
  await page.evaluate(function () { var l = document.getElementById('log'); l.scrollTop = l.scrollHeight; });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(SHOTS, 'phone-day2-summary.png') });
  /* 다시 그려도 같은 말 (recall 은 계획 때 고정) */
  await page.reload();
  await page.waitForSelector('#btn-go:not(.away)');
  var again = await page.evaluate(function (d) {
    var sec = document.querySelector('#log .lday[data-day="' + d + '"]');
    var peek = [].filter.call(sec.querySelectorAll('.lrow'), function (r) { return r.querySelector('.ltool').textContent === '기웃'; })[0];
    return { subs: peek ? [].map.call(peek.querySelectorAll('.sub'), function (x) { return x.textContent; }) : [], memoRow: !!sec.querySelector('.lrow.memo'), summaries: sec.querySelectorAll('.lrow.summary').length };
  }, DAY2);
  ok(again.subs.indexOf("지난번 메모: '" + d1.memo.notes.hat + "'") >= 0 && !again.memoRow && again.summaries === 1, '새로고침 뒤: 지난번 메모 그대로 · 오늘 산책이 있으니 메모 인사 없음 · 요약 1행');
  reportErrors(s.bag, 'H');
  await s.ctx.close();
}

/* I. 출발·귀가 의식 (DESIGN §15.3): 외출 초대 → 나가 있는 동안 바깥 → 귀가 의식 → 다락 → 포스터 걸림.
   건너뛰기 = 의식을 감아 다락으로. 나가 있는 중 새로고침 → 바깥을 한 번도 안 보이고 다락에서 즉시 귀가 */
var PLACE_PROBE = "window.__lsLen0 = (function () { try { return localStorage.length; } catch (e) { return -1; } })(); window.__placeLog = []; (function poll() { try { if (window.APP && APP.scene && APP.scene.place) { var p = APP.scene.place(), L = window.__placeLog; if (L[L.length - 1] !== p) L.push(p); } } catch (e) {} setTimeout(poll, 16); })();";
/* 크로미움은 localStorage 쓰기를 브라우저 프로세스로 늦게 넘긴다. 넘어가기 전에 새로고침하면 새 문서가 예전 스냅숏을 읽는다 (CI 11-07: ls0 1, 지정 전 값).
   같은 file:// 저장소를 보는 둘째 쪽(앱을 안 띄우는 JSON 파일)에서 값이 보일 때까지 기다린다. 끝내 안 보이면 저장이 정말 안 된 것 → false */
async function waitCommitted(ctx, key, test, ms) {
  var probe = await ctx.newPage(), until = Date.now() + (ms || 5000), seen = false;
  try {
    await probe.goto('file://' + path.join(ROOT, 'assets/manifest.json'));
    while (!seen && Date.now() < until) {
      seen = await probe.evaluate(function (a) { try { return localStorage.getItem(a); } catch (e) { return null; } }, key).then(test);
      if (!seen) await probe.waitForTimeout(100);
    }
  } finally { await probe.close(); }
  return seen;
}
function hasLabel(page, label) { return page.evaluate(function (lb) { return [].some.call(document.querySelectorAll('#log .lrow .ltool'), function (e) { return e.textContent === lb; }); }, label); }
async function scenarioCeremony(browser) {
  console.log('\n== I. 출발·귀가 의식 · 바깥 장면 (§15.3)');
  var s = await newPage(browser, 'ok', [{ content: "window.__ppolTest = { forceKind: 'out' };" }, { content: PLACE_PROBE }]);
  var page = s.page;
  await page.goto(INDEX + '?slow=0.5&dev=1');   /* --speed 0.5: 공개 간격·의식 모두 절반 · 데모 패널(계절 칩, I-4) */
  await page.waitForSelector('#name-dialog[open]');
  await page.fill('#name-in', await pickName(page));
  await page.click('#name-form button[type=submit]');
  await page.waitForSelector('#name-dialog[open]', { state: 'hidden' });
  var mode = await page.evaluate(function () {
    window.__ink = []; window.__bub = [];
    if (window.UIART) { var ob = UIART.onBubble; UIART.onBubble = function (text, kind) { if (text) window.__bub.push({ text: text, kind: kind, skin: UIART.bubbleSkin(text, kind), place: APP.scene.place(), state: APP.oct.state, peekRows: [].filter.call(document.querySelectorAll('#log .lrow .ltool'), function (e) { return e.textContent === '기웃'; }).length, ov: getComputedStyle(document.getElementById('oct')).visibility }); return ob.apply(this, arguments); }; }
    if (window.UIART) { var f = UIART.fx; UIART.fx = function (n) { if (n === 'ink') window.__ink.push({ place: APP.scene.place(), m: APP.scene.motion ? APP.scene.motion() : null }); return f.apply(this, arguments); }; }
    return APP.sceneMode;
  });
  ok(await page.evaluate(function () { return APP.scene.place() === 'attic'; }), '처음엔 다락 (' + mode + ')');
  await page.fill('#hint-in', '모자의 역사');
  await page.click('#btn-go');
  if (mode === '3d') {
    await page.waitForFunction(function () { return APP.scene.ceremony() === 'depart'; }, null, { timeout: 10000 });
    ok(!(await hasLabel(page, '출발')), '출발 의식 동안엔 아직 공개 전 (출발 행 없음)');
  }
  await page.waitForFunction(function () { return APP.oct.state === 'away' && APP.scene.place() === 'exterior'; }, null, { timeout: 20000 });
  await page.waitForFunction(function () { return [].some.call(document.querySelectorAll('#log .lrow .ltool'), function (e) { return e.textContent === '출발'; }); }, null, { timeout: 10000 });
  var away = await page.evaluate(function () { return { place: APP.scene.place(), cer: APP.scene.ceremony(), oct: document.getElementById('oct').className, busy: document.getElementById('btn-go').classList.contains('away'), ink: window.__ink, log: window.__placeLog.slice() }; });
  console.log('   away:', JSON.stringify({ place: away.place, cer: away.cer, oct: away.oct.trim(), ink: away.ink.map(function (x) { return x.place + (x.m ? '/vis=' + x.m.octVisible + '/door=' + x.m.door : ''); }), log: away.log }));
  ok(away.place === 'exterior' && away.cer === '' && away.busy && /st-away/.test(away.oct), '나가 있는 동안 바깥 장면 유지 (의식 끝, 공개 중)');
  if (mode === '3d') ok(away.ink.length === 1 && away.ink[0].place === 'exterior' && away.ink[0].m.octVisible, '먹물은 한 번, 문어가 현관문을 나설 때 (바깥 · 문어 보임)');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SHOTS, 'phone-away-exterior.png') });
  /* 바깥 기웃: 자세를 잡는 순간 말풍선 + 그 기웃 행 (3D) */
  if (mode === '3d') {
    await page.waitForFunction(function () { return window.__bub.some(function (b) { return b.state === 'away'; }); }, null, { timeout: 30000 });
    await page.screenshot({ path: path.join(ROOT, 'tests/evidence/peek-bubble.png') });
    await page.screenshot({ path: path.join(SHOTS, 'phone-peek-bubble.png') });
  }
  /* 건너뛰지 않고 끝까지: 귀가 의식 → 다락 → 보드 → 포스터 */
  if (mode === '3d') await page.waitForFunction(function () { return APP.scene.ceremony() === 'return'; }, null, { timeout: 60000 });
  await page.waitForFunction(function () { return APP.scene.place() === 'attic' && APP.oct.state !== 'away'; }, null, { timeout: 60000 });
  await waitIdle(page);
  await page.waitForTimeout(400);
  var back = await page.evaluate(function () { var t = APP.state.trips[0]; return { place: APP.scene.place(), status: t.status, kind: t.kind, poster: !!t.poster, oct: APP.state.octopus.state, log: window.__placeLog.slice() }; });
  console.log('   back:', JSON.stringify(back));
  ok(back.status === 'done' && back.kind === 'out' && back.place === 'attic', '귀가 → 다락, 여행 done');
  ok(back.log.join('>') === 'attic>exterior>attic', '장소 순서 다락 → 바깥 → 다락 (' + back.log.join('>') + ')');
  ok(back.poster && (await wallCount(page)) === 1, '포스터가 벽에 걸림');
  ok(back.oct === 'sleep', '마무리 뒤 잠듦');
  var bub = await page.evaluate(function () { return { all: window.__bub, peeks: APP.state.trips[0].events.filter(function (e) { return e.type === 'peek'; }).map(function (e) { return (e.target && e.target.id) + ':' + e.status + (e.first ? ':first' : ''); }) }; });
  var awayB = bub.all.filter(function (b) { return b.state === 'away'; });
  console.log('   peeks:', JSON.stringify(bub.peeks), ' bubbles(away):', JSON.stringify(awayB.map(function (b) { return b.place + '|' + b.kind + '|' + b.text + '|rows=' + b.peekRows + '|' + b.ov; })));
  if (mode === '3d') {
    ok(awayB.length === bub.peeks.length && awayB.every(function (b) { return b.place === 'exterior' && ['shout', 'think', 'whisper', 'say'].indexOf(b.kind) >= 0; }), '기웃마다 바깥에서 말풍선 (shout/think/whisper/say) — ' + awayB.length + '/' + bub.peeks.length);
    ok(awayB.every(function (b, i) { return b.peekRows === i + 1; }), '기웃 행은 말풍선과 같은 순간에 (n번째 말풍선 때 기웃 행 n개)');
    ok(awayB.every(function (b) { return b.ov === 'visible'; }), '나가 있는 동안에도 말풍선 오버레이가 보임 (.st-away 들어 올림)');
    ok(awayB.every(function (b) { return b.skin === (b.kind === 'shout' ? 'say' : b.kind); }), 'UI 아트 말풍선 모양 = 상태별 종류 (외침은 가시 없이 보통 풍선, 11-07)');
  }
  ok(!bub.all.some(function (b) { return b.place === 'attic' && /찾았다/.test(b.text); }), "다락에선 '찾았다' 말풍선 없음");
  await page.screenshot({ path: path.join(SHOTS, 'phone-returned-attic.png') });

  console.log('\n== I-2. 출발 의식 중 건너뛰기 → 다락');
  await page.evaluate(function () { window.__placeLog = [APP.scene.place()]; });
  await page.fill('#hint-in', '');
  await page.click('#btn-go');
  if (mode === '3d') await page.waitForFunction(function () { return APP.scene.ceremony() === 'depart'; }, null, { timeout: 10000 });
  await skipAway(page);
  await waitIdle(page);
  var sk = await page.evaluate(function () { var t = APP.state.trips[APP.state.trips.length - 1]; return { place: APP.scene.place(), cer: APP.scene.ceremony(), status: t.status, kind: t.kind, oct: APP.state.octopus.state, posters: APP.state.room.posterOrder.length }; });
  console.log('   skip:', JSON.stringify(sk));
  ok(sk.place === 'attic' && sk.cer === '' && sk.status === 'done', '건너뛰기: 의식을 감고 다락에서 끝남');
  ok((await wallCount(page)) === sk.posters, '건너뛰기 뒤 벽 포스터 = 저장된 포스터 수 (' + sk.posters + ')');

  console.log('\n== I-3. 나가 있는 중 새로고침 → 다락에서 즉시 귀가 (바깥 안 보임)');
  await page.click('#btn-go');
  await page.waitForFunction(function () { return APP.oct.state === 'away' && APP.scene.place() === 'exterior'; }, null, { timeout: 20000 });
  ok(await page.evaluate(function () { return APP.state.trips.some(function (t) { return t.status === 'running'; }); }), '바깥에 나가 있는 동안 running 여행 저장됨');
  await page.reload();
  await page.waitForSelector('#btn-go:not(.away)');
  await page.waitForFunction(function () { return APP.state.trips.every(function (t) { return t.status === 'done'; }); }, null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  var rl = await page.evaluate(function () { return { log: window.__placeLog.slice(), place: APP.scene.place(), text: document.getElementById('log').textContent, oct: document.getElementById('oct').className, busy: document.getElementById('btn-go').classList.contains('away'), n: APP.state.trips.length }; });
  console.log('   reload:', JSON.stringify({ log: rl.log, place: rl.place, oct: rl.oct.trim(), trips: rl.n }));
  ok(rl.n === 3, '새로고침 뒤 여행 3건 그대로 (미러 복구 포함)');
  ok(rl.log.indexOf('exterior') < 0 && rl.place === 'attic', '새로고침 뒤 바깥은 한 번도 안 보임 (' + rl.log.join('>') + ')');
  ok(rl.text.indexOf('네가 없는 동안 다녀왔어') >= 0 && /st-(sleep|idle)/.test(rl.oct) && !rl.busy, "'네가 없는 동안 다녀왔어' · 문어 유효 · 버튼 활성");

  console.log('\n== I-4. 계절: 데모 패널 한 줄 · 지정 (룩 설정에 저장)');
  var mo = new Date().getMonth() + 1, KO = mo >= 3 && mo <= 5 ? '봄' : mo >= 6 && mo <= 8 ? '여름' : mo >= 9 && mo <= 11 ? '가을' : '겨울';
  async function seasonLine() { return page.textContent('#dv-season-line'); }   /* 예전 방 보기 한 줄 → 데모 패널 (개발용) */
  var l1 = await seasonLine();
  ok(l1 === '계절: ' + KO + ' (실제 날짜)', '데모 패널: "' + l1 + '"');
  await page.click('#demo summary');
  ok((await page.$$('#dv-season .fchip')).length === 5 && (await page.textContent('#dv-season .fchip.on')) === '자동', '데모 패널 계절 칩 5 (자동 켜짐)');
  var other = KO === '겨울' ? ['summer', '여름'] : ['winter', '겨울'];
  await page.click('#dv-season .fchip[data-season="' + other[0] + '"]');
  var ov = await page.evaluate(function () { return { season: APP.scene.season(), mode: APP.scene.seasonMode(), saved: JSON.parse(localStorage.getItem('ppolppol_look') || '{}').season }; });
  ok(ov.season === other[0] && ov.mode === other[0] && ov.saved === other[0], '지정 → scene.setSeason · ppolppol_look.season 저장 (' + JSON.stringify(ov) + ')');
  ok((await seasonLine()) === '계절: ' + other[1] + ' (지정)', '데모 패널: 계절: ' + other[1] + ' (지정)');
  var keysBefore = await page.evaluate(function () { return localStorage.length; });
  var committed = await waitCommitted(s.ctx, 'ppolppol_look', function (v) { try { return JSON.parse(v || '{}').season === other[0]; } catch (e) { return false; } });
  await page.reload();
  await page.waitForSelector('#btn-go:not(.away)');
  var ov2 = await page.evaluate(function () { var on = document.querySelector('#dv-season .fchip.on'); return { season: APP.scene.season(), on: on ? on.dataset.season : null, ls0: window.__lsLen0 }; });
  /* 룩 설정(ppolppol_look)은 기록과 달리 탭 미러가 없다 → 크로미움 저장소 경합(H 원인과 같은 것: 페이지 안에선 써졌는데 브라우저 쪽 저장소로 안 넘어감)이 나면 지정이 사라지는 게 정상.
     그 표시: (1) 다른 탭(probe)이 5초 안에 못 봄, 또는 (2) 새로고침 직후 키 수가 그 전보다 적음 — 계절 코드가 지울 수 없는 다른 키(ppolppol_ui)까지 같이 사라진다. 그때만 건너뛰고, 넘어간 판에선 늘 검사한다 (#41) */
  if (!committed || ov2.ls0 < keysBefore) console.log('   (크로미움 저장소 경합: probe ' + (committed ? '봄' : '못 봄') + ' · 키 ' + keysBefore + ' → ' + ov2.ls0 + ' — 룩 설정 유지 검사 건너뜀)');
  else ok(ov2.season === other[0] && ov2.on === other[0], '새로고침 뒤에도 지정 계절 유지 (' + JSON.stringify(ov2) + ')');
  if (!(await page.evaluate(function () { return document.getElementById('demo').open; }))) await page.click('#demo summary');
  await page.click('#dv-season .fchip[data-season="auto"]');
  var ov3 = await page.evaluate(function () { return { mode: APP.scene.seasonMode(), saved: JSON.parse(localStorage.getItem('ppolppol_look') || '{}').season }; });
  ok(ov3.mode === 'auto' && ov3.saved === undefined && (await seasonLine()) === '계절: ' + KO + ' (실제 날짜)', '자동으로 되돌림 → 실제 날짜 (' + JSON.stringify(ov3) + ')');
  reportErrors(s.bag, 'I');
  await s.ctx.close();
}

/* I-5. 입장 레이어(js/intro.js, ?intro=1 강제 — 자동화 브라우저는 기본 생략)가 켜진 채로: 하늘 → 타이틀 탭 → 이름 → 외출 의식 → 바깥 기웃 → 건너뛰기 → 다락.
   나가 있는 중 새로고침하면 입장 레이어가 다시 뜨는 동안에도 다락에서 즉시 귀가 (바깥 안 보임) */
async function scenarioCeremonyIntro(browser) {
  console.log('\n== I-5. 입장 레이어 켠 채 의식 (?intro=1)');
  var s = await newPage(browser, 'ok', [{ content: "window.__ppolTest = { forceKind: 'out' };" }, { content: PLACE_PROBE }]);
  var page = s.page;
  await page.goto(INDEX + '?intro=1&slow=0.5');
  var on = await page.waitForSelector('#intro', { timeout: 10000 }).then(function () { return true; }, function () { return false; });
  ok(on && await page.evaluate(function () { return INTRO.phase !== 'off' && APP.scene.place() === 'attic'; }), '입장 레이어 시작 (다락)');
  if (on) { await page.waitForTimeout(600); await page.click('#intro', { force: true }); }
  await page.waitForFunction(function () { return !window.INTRO || INTRO.phase === 'done' || INTRO.phase === 'off'; }, null, { timeout: 15000 });
  await page.waitForSelector('#name-dialog[open]', { timeout: 10000 });
  await page.fill('#name-in', await pickName(page));
  await page.click('#name-form button[type=submit]');
  await page.waitForSelector('#name-dialog[open]', { state: 'hidden' });
  var mode = await page.evaluate(function () { window.__bub = []; if (window.UIART) { var ob = UIART.onBubble; UIART.onBubble = function (t, k) { if (t) window.__bub.push({ t: t, k: k, place: APP.scene.place(), state: APP.oct.state }); return ob.apply(this, arguments); }; } return APP.sceneMode; });
  await page.fill('#hint-in', '모자의 역사');
  await page.click('#btn-go');
  await page.waitForFunction(function () { return APP.oct.state === 'away' && APP.scene.place() === 'exterior'; }, null, { timeout: 20000 });
  if (mode === '3d') await page.waitForFunction(function () { return window.__bub.some(function (b) { return b.state === 'away' && b.place === 'exterior'; }); }, null, { timeout: 30000 });
  ok(true, '입장 뒤 출발 의식 → 바깥' + (mode === '3d' ? ' → 바깥 기웃 말풍선' : ''));
  await skipAway(page);
  await waitIdle(page);
  var r = await page.evaluate(function () { return { place: APP.scene.place(), cer: APP.scene.ceremony(), st: APP.state.trips[0].status, oct: APP.state.octopus.state }; });
  ok(r.place === 'attic' && r.cer === '' && r.st === 'done' && r.oct === 'sleep' && (await wallCount(page)) === 1, '건너뛰기 → 다락 · 포스터 1 · 잠 (' + JSON.stringify(r) + ')');
  await page.click('#btn-go');
  await page.waitForFunction(function () { return APP.oct.state === 'away' && APP.scene.place() === 'exterior'; }, null, { timeout: 20000 });
  await page.reload();
  await page.waitForFunction(function () { return window.APP && APP.state.trips.length === 2 && APP.state.trips.every(function (t) { return t.status === 'done'; }); }, null, { timeout: 15000 });
  var mid = await page.evaluate(function () { return { intro: window.INTRO ? INTRO.phase : 'none', log: window.__placeLog.slice() }; });
  if (await page.$('#intro')) await page.click('#intro', { force: true });
  await page.waitForSelector('#btn-go:not(.away)', { timeout: 15000 });
  await page.waitForTimeout(800);
  var rl = await page.evaluate(function () { return { log: window.__placeLog.slice(), place: APP.scene.place(), text: document.getElementById('log').textContent }; });
  console.log('   reload(intro):', JSON.stringify({ introAtResume: mid.intro, log: rl.log }));
  ok(rl.log.indexOf('exterior') < 0 && rl.place === 'attic' && rl.text.indexOf('네가 없는 동안 다녀왔어') >= 0, '입장 레이어 중 새로고침 복구: 다락에서 즉시 귀가, 바깥 안 보임');
  reportErrors(s.bag, 'I-5');
  await s.ctx.close();
}

/* G. 2D 폴백 (?scene=2d): 같은 API 로 초대 한 번 — 레이어 DOM · 벽 · 문어 클래스 */
async function scenario2D(browser) {
  console.log('\n== G. 2D 폴백 (?scene=2d)');
  var s = await newPage(browser, 'ok');
  var page = s.page;
  await page.goto(INDEX + '?scene=2d');
  await page.waitForSelector('#name-dialog[open]');
  await page.fill('#name-in', await pickName(page));
  await page.click('#name-form button[type=submit]');
  await page.waitForSelector('#name-dialog[open]', { state: 'hidden' });
  ok(await page.evaluate(function () { return APP.sceneMode === '2d' && document.getElementById('scene').classList.contains('mode-2d') && !document.getElementById('scene').classList.contains('mode-3d'); }), '2D 모드로 내려감');
  ok(await page.$('#layers .layer[data-key="bg.room"]'), '2D 배경 레이어 있음');
  /* 등불 0칸에도 등불 속 작은 불씨 (결정 14 — 3D 와 같은 뜻): 정수 좌표 · crispEdges · Apollo 호박 램프만 */
  var ember0 = await page.evaluate(function () {
    var L = document.querySelector('#layers .layer[data-key="ember"]'), sv = L && L.querySelector('svg'); if (!sv) return null;
    var rs = Array.prototype.slice.call(sv.querySelectorAll('rect')), fills = {};
    rs.forEach(function (r) { var f = r.getAttribute('fill') || (r.parentNode.getAttribute && r.parentNode.getAttribute('fill')); if (f) fills[f.toLowerCase()] = 1; });
    return { n: rs.length, ints: rs.every(function (r) { return ['x', 'y', 'width', 'height'].every(function (a) { return /^\d+$/.test(r.getAttribute(a) || ''); }); }), crisp: sv.getAttribute('shape-rendering'), fills: Object.keys(fills), title: document.getElementById('room-title').textContent };
  });
  console.log('   ember0:', JSON.stringify(ember0));
  ok(ember0 && ember0.n >= 3 && ember0.ints && ember0.crisp === 'crispEdges' && ember0.fills.every(function (f) { return ['#be772b', '#de9e41', '#e8c170'].indexOf(f) >= 0; }), '2D 등불 0칸: 등불 속 불씨 레이어 (정수 좌표 · crispEdges · Apollo 호박)');
  ok(ember0 && ember0.title === '불씨 하나 켜진 다락', "등불 0칸 방 제목 '불씨 하나 켜진 다락' (" + (ember0 && ember0.title) + ')');
  ok(await page.evaluate(function () { function vis(id) { var e = document.getElementById(id), r = e && e.getBoundingClientRect(); return !!r && r.width >= 44 && r.height >= 44; } return vis('btn-settings') && vis('btn-door') && vis('btn-sound'); }), '2D 폴백에도 ⚙ 설정 · 놀이방 문 · 소리 (누르는 곳 44px)');
  await page.fill('#hint-in', '모자의 역사');
  await page.click('#btn-go');
  await skipAway(page);
  await page.waitForSelector('#btn-go:not(.away)', { timeout: 30000 });
  ok((await page.evaluate(function () { return APP.state.room.lantern; })) === 1, '2D 폴백에서도 등불 1');
  ok(!(await page.$('#layers .layer[data-key="ember"]')), '2D 등불 1칸: 불씨 레이어 없음 (등불이 켜졌다)');
  ok((await wallCount(page)) === 1 && !!(await page.$('#wall-posts .wall-mini')), '2D 벽 썸네일 1개 (DOM)');
  ok(await hasItem(page, 'moss'), '2D 이끼 화분 레이어');
  ok(await page.evaluate(function () { return /st-(sleep|idle)/.test(document.getElementById('oct').className); }), '2D 문어 상태 클래스');
  await page.waitForTimeout(200);
  var dlg2 = await page.evaluate(function () {
    var cv = document.querySelector('#log .lrow.dialog canvas.lport-cv'); if (!cv) return { cv: false };
    var d = cv.getContext('2d').getImageData(0, 0, 64, 64).data, n = 0; for (var i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
    return { cv: true, drawn: n, expr: cv.dataset.expr, ex: document.getElementById('oct').className.match(/ex-[a-z]+/) + '', svg: typeof APP.scene.portraitSVG === 'function' && APP.scene.portraitSVG('happy').indexOf('<svg') === 0 };
  });
  console.log('   dialog2d:', JSON.stringify(dlg2));
  ok(dlg2.cv && dlg2.drawn > 64 * 64 * 0.5 && dlg2.svg, '2D 폴백: 대화창 행 + SVG 얼굴 초상 캔버스 그려짐');
  await page.screenshot({ path: path.join(SHOTS, 'phone-2d-fallback.png') });
  ok(s.bag.length === 0, '2D 폴백 콘솔/페이지 에러 없음' + (s.bag.length ? ' → ' + s.bag.join(' | ') : ''));
  await s.ctx.close();
}
/* W. 낮잠 (DESIGN §5.9): 산책 뒤 담요에서 잠들고 → 바로 새로고침해도 자고 있음 → 마지막 산책이 20분 넘게 지났거나 날짜가 바뀌면 스스로 깨어 있다.
   같은 페이지에서도 낮잠이 끝나면 깬다 (꿈 라벨 틱) — 작은 혼잣말 '…응?' 은 말풍선만, 로그엔 없음. 자는 동안 창문을 누르면 '쿨쿨…' (예전 '…zZ').
   인사 초상: 처음 인사 · 깨어 있는 날 인사 = 웃는 얼굴(happy), 자는 중 = 자는 얼굴(sleep). 2D 장면(?scene=2d)이라 창문 레이어를 바로 누른다 */
async function scenarioWake(browser) {
  console.log('\n== W. 낮잠에서 스스로 깸 · 인사 초상 (§5.9)');
  var BUB = "window.__bubs = []; (function w() { if (window.UIART && !UIART.__w) { UIART.__w = 1; var o = UIART.onBubble; UIART.onBubble = function (t, k) { if (t) window.__bubs.push(t); return o.apply(this, arguments); }; } else setTimeout(w, 5); })();";
  var s = await newPage(browser, 'ok', [{ content: "window.__ppolTest = window.__ppolTest || { forceKind: 'out' };" }, { content: BUB }]);
  var page = s.page;
  await page.goto(INDEX + '?scene=2d');
  await page.waitForSelector('#name-dialog[open]');
  await page.fill('#name-in', '낮잠문어');
  await page.click('#name-form button[type=submit]');
  await page.waitForSelector('#name-dialog[open]', { state: 'hidden' });
  function greet() { return page.evaluate(function () { var r = document.querySelector('#log .lday:last-child .lrow'); return { label: r && r.querySelector('.ltool').textContent, text: r && r.querySelector('.ltext').textContent, expr: r && r.dataset.expr, oct: document.getElementById('oct').className, st: APP.state.octopus.state }; }); }
  var g0 = await greet();
  ok(g0.label === '인사' && g0.expr === 'happy' && /^안녕, 나는 /.test(g0.text), '처음 인사는 문어의 자기소개 · 웃는 얼굴 (' + g0.expr + ' · ' + g0.text + ')');
  async function walk() {
    await page.click('#btn-go');
    await page.waitForFunction(function () { var g = document.getElementById('btn-go'); if (g && g.classList.contains('can-skip')) { g.click(); return true; } return g && !g.classList.contains('away'); }, null, { timeout: 30000, polling: 100 });
    await waitIdle(page);
  }
  await walk();
  await page.waitForTimeout(1000);   /* file:// localStorage 커밋 (A 와 같은 이유) */
  await page.reload(); await waitIdle(page);
  var g1 = await greet();
  ok(/st-sleep/.test(g1.oct) && g1.label === '오늘' && /[은는] 아직 자고 있어/.test(g1.text) && !g1.expr, '산책 직후 새로고침: 자고 있음 · 집 목소리 "…는 아직 자고 있어" (문어 초상 없음: ' + g1.text + ')');
  await page.evaluate(function () { window.__bubs = []; document.querySelector('#layers .layer[data-key="window"]').click(); });
  await page.waitForTimeout(300);
  var wt = await page.evaluate(function () { return { b: window.__bubs.slice(), oct: document.getElementById('oct').className }; });
  ok(wt.b.indexOf('쿨쿨…') >= 0 && /st-sleep/.test(wt.oct), "자는 동안 창문 탭 → '쿨쿨…' (예전 '…zZ'), 깨우지 않음");
  await page.evaluate(function () { var t = APP.state.trips[APP.state.trips.length - 1]; t.endedAt -= 21 * 60000; APP.save(); });
  await page.waitForTimeout(1000);
  await page.reload(); await waitIdle(page);
  var g2 = await greet();
  ok(/st-idle/.test(g2.oct) && g2.st === 'idle', '마지막 산책 21분 전 → 새로고침 → 깨어 있음 (' + g2.oct.trim() + ')');
  ok(g2.label === '오늘' && /[은는] 다락방에 있어/.test(g2.text) && g2.text.indexOf('기다리고') < 0 && !g2.expr, "깬 날 인사: 집 목소리 '…는 다락방에 있어' · '기다리고 있었어' 없음 (" + g2.text + ')');
  await walk();
  var n0 = await page.evaluate(function () { window.__bubs = []; var t = APP.state.trips[APP.state.trips.length - 1]; t.endedAt -= 21 * 60000; return document.querySelectorAll('#log .lrow').length; });
  var woke = await page.waitForFunction(function () { return APP.oct.state === 'idle'; }, null, { timeout: 25000 }).then(function () { return true; }, function () { return false; });
  var lw = await page.evaluate(function () { return { ex: APP.scene.expression(), b: window.__bubs.slice(), n: document.querySelectorAll('#log .lrow').length, log: document.getElementById('log').textContent, saved: JSON.parse(localStorage.getItem('ppolppol_v2')).octopus.state }; });
  ok(woke && lw.saved === 'idle', '같은 페이지: 낮잠이 끝나면 스스로 깸 (저장도 idle)');
  ok(lw.b.indexOf('…응?') >= 0 && lw.n === n0 && lw.log.indexOf('…응?') < 0, "깰 때 혼잣말 '…응?' 은 말풍선만 (로그 행 그대로 " + lw.n + ')');
  ok(lw.ex === 'curious', "깰 때 얼굴은 눈을 뜬 curious (반쯤 감은 calm·sleepy 아님): " + lw.ex);
  await walk();
  await page.addInitScript({ content: "window.__ppolTest = { forceKind: 'out', today: '" + dayAfter(1) + "' };" });
  await page.waitForTimeout(1000);
  await page.reload(); await waitIdle(page);
  ok(/st-idle/.test((await greet()).oct), '날짜가 바뀌면 산책 직후여도 깨어 있음');
  /* 등불 정직 (§4): 두 탭이 같은 날 첫 차례를 함께 계획하면 둘 다 쪽지 뒷면에 '+1' 을 쓴다 → 다른 탭이 먼저 켜 이 차례가 안 켜졌으면 저장 기록에서도 '+1' 을 지운다 */
  var lose = await page.evaluate(function () {
    var dk = APP.state.octopus.days[0], l0 = APP.state.room.lantern;
    var t = { id: 'trip_race', date: dk, seq: 9, seed: 9, kind: 'home', by: 'demo', hint: { raw: '' }, status: 'running', startedAt: Date.now(), endedAt: null, events: [], receipt: { activity: { id: 'hum' } }, poster: { type: 'note', title: '오늘은 집', line: '…', detail: '', back: '오늘은 집. 등불 +1' }, visitsDelta: {}, affinityDelta: {} };
    APP.state.trips.push(t); APP.commitTrip(t);
    return { back: t.poster.back, lit: t.summary.lantern, same: APP.state.room.lantern === l0 };
  });
  ok(lose.back === '오늘은 집' && lose.lit === 0 && lose.same, "그날 칸이 이미 켜졌으면 쪽지 뒷면에 '등불 +1' 을 남기지 않음 (" + lose.back + ')');
  reportErrors(s.bag, 'W');
  await s.ctx.close();
}

/* 배포 주소처럼 보이는 가짜 호스트 O 로 저장소 파일을 그대로 낸다 (localhost·file:// 가 아니라 app.js DEV 가 기본 꺼짐) */
function routeRepo(page, O) {
  return page.route(O + '/**', function (route) {
    var p = decodeURIComponent(new URL(route.request().url()).pathname), f = path.join(ROOT, p === '/' ? 'index.html' : p);
    if (f.indexOf(ROOT) !== 0 || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return route.fulfill({ status: 404, body: '' });
    var ct = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2' }[path.extname(f)] || 'application/octet-stream';
    return route.fulfill({ status: 200, contentType: ct, body: fs.readFileSync(f) });
  });
}
/* V. 데모 조작 패널(#demo, 개발용)은 플레이어 화면에 없다: ?dev=1(이 탭 동안 기억) · localhost/127.0.0.1 · file:// 에서만.
   플레이어 화면은 패널에서 저장한 룩·계절 지정을 따르지 않는다 (저장은 그대로 둔다). 배포 주소처럼 보이게 가짜 호스트로 저장소 파일을 그대로 낸다 */
async function scenarioDevPanel(browser) {
  console.log('\n== V. 데모 조작 패널은 개발 모드에서만');
  var O = 'http://ppolppol.example';
  var s = await newPage(browser, 'ok', [{ content: "if (!localStorage.getItem('__v_look')) { localStorage.setItem('__v_look', '1'); localStorage.setItem('ppolppol_look', JSON.stringify({ season: 'winter', pixelSize: 2 })); }" }]);
  var page = s.page;
  await routeRepo(page, O);
  function look() { return page.evaluate(function () { var d = document.getElementById('demo'); return { shown: !!d && !d.hidden && d.getBoundingClientRect().height > 0, season: APP.scene.seasonMode ? APP.scene.seasonMode() : 'auto', kept: JSON.parse(localStorage.getItem('ppolppol_look') || '{}').season }; }); }
  await page.goto(O + '/index.html'); await page.waitForFunction(function () { return window.APP && APP.scene; });
  var a = await look();
  ok(!a.shown, '배포 주소: 데모 조작 패널 안 보임');
  ok(a.season === 'auto' && a.kept === 'winter', '배포 주소: 저장된 계절 지정을 따르지 않음 (' + a.season + '), 저장은 남김 (' + a.kept + ')');
  await page.goto(O + '/index.html?dev=1'); await page.waitForFunction(function () { return window.APP && APP.scene; });
  var b = await look();
  ok(b.shown && b.season === 'winter', '?dev=1: 패널 보임 · 계절 지정 따름 (' + b.season + ')');
  await page.goto(O + '/index.html'); await page.waitForFunction(function () { return window.APP && APP.scene; });
  ok((await look()).shown, '?dev=1 은 이 탭 동안 기억 (sessionStorage)');
  reportErrors(s.bag, 'V');
  await s.ctx.close();
}

/* P. 플레이어 화면 (주인 결정 18): 힌트 칸 없이 버튼 줄만. http 가짜 호스트 + ?dev=0 (개발 모드 강제로 끔).
   힌트 라벨·입력·도움말 안 보임 · 버튼 줄이 초대 바 맨 위(빈 자리 없음, 픽셀·시스템 글꼴) · 첫 토스트에 힌트 얘기 없음 ·
   #btn-go 로 산책 한 번 끝까지 → hint.raw '' · 출발 행에 '힌트'·'네가 골라봐' 없음(집 목소리 '… 산책 나갔어') · 일기에 힌트 줄 없음 · 등불 0칸 방 제목 */
async function scenarioPlayer(browser) {
  console.log('\n== P. 플레이어 화면: 힌트 칸 없음 (?dev=0)');
  var O = 'http://ppolppol.example';
  var s = await newPage(browser, 'ok');
  var page = s.page;
  await routeRepo(page, O);
  await page.goto(O + '/index.html?dev=0');
  await page.waitForSelector('#name-dialog[open]', { timeout: 20000 });
  function inviteBox() {
    return page.evaluate(function () {
      function shown(el) { if (!el) return false; var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; }
      var inv = document.getElementById('invite'), row = inv.querySelector('.btn-row'), ir = inv.getBoundingClientRect(), rr = row.getBoundingClientRect();
      return { input: shown(document.getElementById('hint-in')), label: shown(inv.querySelector('label[for="hint-in"]')), help: shown(document.getElementById('hint-help')),
        gap: Math.round(rr.top - ir.top - parseFloat(getComputedStyle(inv).paddingTop)), bottom: Math.round(ir.bottom - rr.bottom - parseFloat(getComputedStyle(inv).paddingBottom)),
        font: document.documentElement.getAttribute('data-font'), docW: document.documentElement.scrollWidth, vw: innerWidth };
    });
  }
  var ib = await inviteBox();
  console.log('   invite:', JSON.stringify(ib));
  ok(!ib.input && !ib.label && !ib.help, '플레이어 화면: 힌트 라벨·입력·도움말 안 보임');
  ok(ib.gap === 0 && ib.bottom === 0 && ib.docW <= ib.vw, '플레이어 화면(' + ib.font + '): 초대 바 = 버튼 줄만 (위 빈 자리 ' + ib.gap + 'px, 가로 스크롤 없음)');
  await page.evaluate(function () { document.documentElement.setAttribute('data-font', 'system'); });
  var ibs = await inviteBox();
  ok(!ibs.input && ibs.gap === 0 && ibs.docW <= ibs.vw, '플레이어 화면(system): 초대 바 = 버튼 줄만 (위 빈 자리 ' + ibs.gap + 'px)');
  await page.evaluate(function () { document.documentElement.setAttribute('data-font', 'pixel'); });
  var name = await pickName(page, '');
  await page.fill('#name-in', name);
  await page.click('#name-form button[type=submit]');
  await page.waitForSelector('#name-dialog[open]', { state: 'hidden' });
  await page.waitForTimeout(150);
  var toastT = await page.evaluate(function () { var t = document.getElementById('toast'); return t && !t.hidden ? t.textContent : ''; });
  ok(!/힌트|네가 골라/.test(toastT), '플레이어 화면: 첫 실행 토스트에 힌트 얘기 없음 (' + JSON.stringify(toastT) + ')');
  var t0 = await page.evaluate(function () { return { title: document.getElementById('room-title').textContent, desc: document.getElementById('scene-desc').textContent, doc: document.title }; });
  ok(t0.title === '불씨 하나 켜진 다락' && !/어두운|꺼진/.test(t0.desc + t0.doc), "등불 0칸: 방 제목 '불씨 하나 켜진 다락' · 장면 설명·문서 제목에 '어두운/꺼진' 없음 (" + t0.desc + ')');
  await page.click('#btn-go');
  await page.waitForSelector('#btn-go.away', { timeout: 10000 });
  await page.waitForTimeout(1200);
  await skipAway(page);
  await waitIdle(page);
  var tr = await page.evaluate(function () { var t = APP.state.trips[0]; return { n: APP.state.trips.length, kind: t.kind, status: t.status, raw: t.hint && t.hint.raw, by: t.by, lantern: APP.state.room.lantern }; });
  console.log('   trip:', JSON.stringify(tr));
  must(tr.n === 1 && tr.status === 'done', '#btn-go 로 산책 한 번 끝까지 (done)');
  ok(tr.raw === '' && tr.by === 'demo', "플레이어 산책은 hint.raw '' · 고른 이 demo");
  ok(tr.lantern === 1, '플레이어 산책 뒤 등불 1칸');
  var dep = await page.evaluate(function () {
    var r = Array.prototype.filter.call(document.querySelectorAll('#log .lrow'), function (x) { var l = x.querySelector('.ltool'); return l && /출발/.test(l.textContent); })[0];
    return r ? r.querySelector('.ltext').textContent : null;
  });
  ok(tr.kind !== 'out' || (dep !== null && !/힌트|네가 골라/.test(dep) && dep.indexOf(name) === 0 && /^.+[이가] 산책 나갔어/.test(dep)), "출발 행: '힌트'·'네가 골라봐' 없이 집 목소리 한 줄 (" + dep + ')');
  var logAll = await page.textContent('#log');
  ok(!/네가 골라|힌트:/.test(logAll), "로그 어디에도 '네가 골라봐'·'힌트:' 없음");
  await openCard(page);
  await page.click('#pd-flip');
  await page.waitForTimeout(reducedWait(700));
  var bk = await page.evaluate(function () { return { keys: Array.prototype.map.call(document.querySelectorAll('#pd-back .receipt .kv > span:first-child'), function (x) { return x.textContent; }), text: document.getElementById('pd-back').textContent }; });
  ok(bk.keys.indexOf('힌트') < 0 && !/힌트/.test(bk.text), '일기에 힌트 줄 없음 (' + bk.keys.join(', ') + ')');
  ok(bk.text.indexOf('고른 이: 데모 두뇌(규칙)') >= 0, "일기 '고른 이: 데모 두뇌(규칙)' 그대로");
  await page.screenshot({ path: path.join(SHOTS, 'player-receipt.png') });
  await closePoster(page);
  await page.screenshot({ path: path.join(SHOTS, 'player-invite.png') });
  await page.waitForTimeout(1000);
  await page.goto(O + '/index.html');   /* ?dev 없이 다시: 배포 주소는 기본 플레이어 화면 */
  await page.waitForSelector('#btn-go:not(.away)');
  ok(!(await inviteBox()).input, '배포 주소 다시 열기: 힌트 칸 여전히 숨김');
  reportErrors(s.bag, 'P');
  await s.ctx.close();
}

/* L. 추억 앨범 아이콘 (DESIGN §6.3 · §7.2): 앨범은 페이지 흐름에서 빠지고 장면 오른쪽 위 묶음(앨범 · 소리)의 아이콘으로 연다.
   첫 화면 정직 표기(이름 창) · 첫 포스터 전엔 아이콘 숨김 · 산책 뒤 새 포스터 점(숫자 없음) + 아이콘으로 날아가는 포스터(≤0.6 s, 정수 px 계단) ·
   Enter 로 열기 · 포커스 · 필터 · 포스터 창 · Esc 로 닫으면 아이콘으로 포커스 · 열면 점 사라짐(새로고침 뒤에도) · 모션 줄이기면 날지 않고 점만 ·
   320–412 px 픽셀·시스템 테마에서 1–4 글자 이름이 안 잘리고 가로 스크롤 없음 */
async function scenarioAlbumIcon(browser) {
  console.log('\n== L. 추억 앨범 아이콘 · 첫 화면 정직 표기 · 좁은 폭 이름');
  var s = await newPage(browser, 'ok', [{ content: "window.__ppolTest = { forceKind: 'out' };" }]);
  var page = s.page;
  await page.goto(INDEX);
  await page.waitForSelector('#name-dialog[open]');
  var hon = await page.evaluate(function () { var p = document.querySelector('#name-dialog .honest'); return { lines: [].map.call(p.querySelectorAll('.ln'), function (x) { return x.textContent; }), text: p.textContent }; });
  ok(JSON.stringify(hon.lines) === JSON.stringify(['지금은 미리 만든 규칙으로', '움직이는 체험판이야.']) && !/MCP|모델/.test(hon.text), "이름 창 정직 표기: '지금은 미리 만든 규칙으로 / 움직이는 체험판이야.' (MCP 설명 없음) — " + JSON.stringify(hon.lines));
  ok(!(await page.$('#album-sec')) && !!(await page.$('#log-sec')), '페이지 흐름에 앨범 칸(#album-sec) 없음 · 로그는 그대로');
  await page.fill('#name-in', '뚜루'); await page.click('#name-form button[type=submit]');
  await page.waitForSelector('#name-dialog[open]', { state: 'hidden' });
  var b0 = await page.evaluate(function () { var b = document.getElementById('btn-album'); return { hidden: b.hidden, inCtl: !!b.closest('#scene #scene-ctl'), sound: !!document.getElementById('btn-sound').closest('#scene-ctl'), gear: !!document.getElementById('btn-settings').closest('#scene-ctl'),
    order: [].map.call(document.querySelectorAll('#scene-ctl .icon-btn'), function (x) { return x.id; }).join(','), statusIcons: document.querySelectorAll('#status #btn-album, #status #btn-sound, #status #btn-settings').length }; });
  ok(b0.hidden && b0.inCtl && b0.sound && b0.gear && b0.order === 'btn-album,btn-settings,btn-sound' && b0.statusIcons === 0, '첫 포스터 전엔 앨범 아이콘 숨김 · 앨범 · ⚙ · 소리 = 장면 오른쪽 위 묶음 · 상태 줄엔 아이콘 없음 ' + JSON.stringify(b0));
  var rs = await page.evaluate(function () { APP.openSettings(); var t = document.getElementById('set-body').textContent; document.getElementById('settings-sheet').close(); return t; });
  ok(/누가 고르나/.test(rs) && /모델이 아니라 미리 만든 규칙이 골라/.test(rs) && /고른 이는 포스터와 쪽지 뒷면/.test(rs) && !/MCP/.test(rs), "설정 '누가 고르나' 한 줄: 규칙이 고른다 · 고른 이는 포스터·쪽지 뒷면 (MCP 같은 말 없이 — 이름 창과 같다)");
  /* 날아가는 포스터 관찰: #scene 에 붙었다 떨어지는 .album-fly, 붙는 순간의 애니메이션 길이·칸 위치 */
  await page.evaluate(function () {
    window.__fly = [];
    new MutationObserver(function (ms) { ms.forEach(function (m) {
      [].forEach.call(m.addedNodes, function (n) { if (!n.classList || !n.classList.contains('album-fly')) return; var a = n.getAnimations ? n.getAnimations()[0] : null; window.__fly.push({ add: performance.now(), dur: a ? a.effect.getTiming().duration : null, kf: a ? a.effect.getKeyframes().map(function (k) { return k.transform; }) : [] }); });
      [].forEach.call(m.removedNodes, function (n) { if (n.classList && n.classList.contains('album-fly')) window.__fly.push({ gone: performance.now() }); });
    }); }).observe(document.getElementById('scene'), { childList: true });
  });
  await page.click('#btn-go'); await page.waitForSelector('#btn-go.away'); await page.waitForTimeout(800); await skipAway(page); await waitIdle(page);
  await page.waitForTimeout(1000);
  var a1 = await page.evaluate(function () {
    var b = document.getElementById('btn-album'), r = b.getBoundingClientRect(), dot = b.querySelector('.ib-dot'), sc = document.getElementById('scene').getBoundingClientRect();
    return { hidden: b.hidden, w: r.width, h: r.height, label: b.getAttribute('aria-label'), dot: !dot.hidden && dot.getBoundingClientRect().width > 0, desc: document.getElementById('album-new').textContent,
      corner: r.right <= sc.right + 0.5 && r.top >= sc.top - 0.5 && sc.right - r.right < 50 + 88 && r.top - sc.top < 50 && document.getElementById('scene-ctl').getBoundingClientRect().right > sc.right - 10, fly: window.__fly.slice(), font: document.documentElement.getAttribute('data-font') };
  });
  console.log('   album icon:', JSON.stringify({ w: a1.w, h: a1.h, dot: a1.dot, fly: a1.fly }));
  ok(!a1.hidden && a1.w >= 44 && a1.h >= 44 && a1.label === '추억 앨범' && a1.corner, "앨범 아이콘: 장면 오른쪽 위 · 누르는 곳 44×44 · aria-label '추억 앨범'");
  ok(a1.dot && a1.desc === '새로 붙은 포스터가 있어', '산책 뒤 새 포스터 점 (숫자 없음) + 화면 낭독기 설명');
  var f = a1.fly[0] || {}, g = a1.font === 'pixel' ? 2 : 1;
  var snapped = (f.kf || []).length >= 4 && f.kf.every(function (t) { var m = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(t || ''); return m && +m[1] % g === 0 && +m[2] % g === 0; });
  ok(a1.fly.length === 2 && a1.fly[1].gone && f.dur > 0 && f.dur <= 600 && snapped, '새 포스터가 아이콘으로 날아감: ' + f.dur + 'ms ≤ 600 · 칸마다 ' + g + 'px 격자 (' + (f.kf || []).length + '칸) · 끝나면 사라짐');
  /* 장면 말풍선은 아이콘 묶음의 보이는 상자와 겹치면 그 왼쪽으로 비켜 선다 (UIART.avoidCtl — 3D keepInside · 2D keepBubble2D 공용) */
  var av = await page.evaluate(function () {
    var q = document.querySelector('#scene-ctl #btn-album .snd-box').getBoundingClientRect(), L = Math.min.apply(null, [].map.call(document.querySelectorAll('#scene-ctl .icon-btn:not([hidden]) .snd-box'), function (x) { return x.getBoundingClientRect().left; }));
    return { over: UIART.avoidCtl({ left: L - 100, right: L + 10, top: q.top + 2, bottom: q.bottom + 40 }, 4), below: UIART.avoidCtl({ left: L - 100, right: L + 10, top: q.bottom + 1, bottom: q.bottom + 60 }, 4), clear: UIART.avoidCtl({ left: L - 120, right: L - 5, top: q.top, bottom: q.bottom }, 4) };
  });
  ok(Math.round(av.over) === -14 && av.below === 0 && av.clear === 0, '말풍선 ↔ 아이콘 묶음: 겹치면 상자 왼쪽 4px 까지 비킴 · 안 겹치면 그대로 ' + JSON.stringify(av));
  /* 새 플레이어의 첫 새로고침: 앨범을 안 열었으면 점은 그대로 — 첫 저장부터 settings.albumSeen 0 이 적혀 있어 '옛 기록'으로 오인해 본 것으로 치지 않는다 */
  var sv0 = await page.evaluate(function () { var o = JSON.parse(localStorage.getItem('ppolppol_v2') || '{}'); return o.settings && 'albumSeen' in o.settings ? o.settings.albumSeen : 'none'; });
  await page.reload(); await page.waitForSelector('#btn-go:not(.away)'); await page.waitForTimeout(300);
  var rl = await page.evaluate(function () { return { dot: !document.querySelector('#btn-album .ib-dot').hidden, seen: APP.state.settings.albumSeen }; });
  ok(sv0 === 0 && rl.dot && rl.seen === 0, '앨범을 안 연 채 새로고침: 점 그대로 (저장된 albumSeen 0) ' + JSON.stringify({ saved: sv0, after: rl }));
  /* 키보드: Enter 로 열기 → 포커스 제목 · 점 사라짐 · 필터 · 포스터 창 · Esc → 아이콘으로 */
  await page.focus('#btn-album'); await page.keyboard.press('Enter');
  await page.waitForSelector('#album-sheet[open]');
  var a2 = await page.evaluate(function () { return { focus: document.activeElement && document.activeElement.id, dot: !document.querySelector('#btn-album .ib-dot').hidden, cards: document.querySelectorAll('#album-sheet #album .pcard').length,
    chips: [].map.call(document.querySelectorAll('#album-sheet .fchip[data-f]'), function (c) { return c.textContent; }), notes: !!document.querySelector('#album-notes .cnote') }; });
  ok(a2.focus === 'al-h' && !a2.dot && a2.cards === 1 && a2.chips.join('/') === '전체/포스터/쪽지/일기', 'Enter 로 열림 · 포커스는 시트 제목 · 점 사라짐 · 카드 1 · 필터 전체/포스터/쪽지/일기');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(SHOTS, 'album-sheet.png') });
  await page.click('#album-sheet .fchip[data-f="note"]');
  var fn = await page.evaluate(function () { return { cards: document.querySelectorAll('#album .pcard').length, empty: (document.querySelector('#album .lempty') || {}).textContent || '', pressed: document.querySelector('.fchip[data-f="note"]').getAttribute('aria-pressed') }; });
  await page.click('#album-sheet .fchip[data-f="poster"]');
  var fp = await page.evaluate(function () { return document.querySelectorAll('#album .pcard').length; });
  await page.click('#album-sheet .fchip[data-f="all"]');
  ok(fn.cards === 0 && /쪽지/.test(fn.empty) && fn.pressed === 'true' && fp === 1, '필터: 쪽지 0장(빈 문구) · 포스터 1장');
  await page.click('#album .pcard'); await page.waitForSelector('#poster-dialog[open]');
  ok(!!(await page.$('#pd-front svg')) && !!(await page.$('#album-sheet[open]')), '카드 → 포스터 창 (앨범 시트 위에)');
  await closePoster(page, true);
  ok(await page.evaluate(function () { return document.activeElement && document.activeElement.classList.contains('pcard'); }), '포스터 창 닫으면 포커스는 카드로');
  await page.keyboard.press('Escape');
  await page.waitForSelector('#album-sheet[open]', { state: 'hidden' });
  ok(await page.evaluate(function () { return document.activeElement && document.activeElement.id === 'btn-album'; }), 'Esc 로 닫으면 포커스는 앨범 아이콘으로');
  await page.waitForTimeout(1000);
  await page.reload(); await page.waitForSelector('#btn-go:not(.away)');
  ok(await page.evaluate(function () { var b = document.getElementById('btn-album'); return !b.hidden && b.querySelector('.ib-dot').hidden; }), '새로고침 뒤: 아이콘 그대로 · 점 없음 (본 것으로 저장)');
  /* 모션 줄이기: 날지 않고 점만 */
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(function () {
    window.__fly2 = 0;
    new MutationObserver(function (ms) { ms.forEach(function (m) { [].forEach.call(m.addedNodes, function (n) { if (n.classList && n.classList.contains('album-fly')) window.__fly2++; }); }); }).observe(document.getElementById('scene'), { childList: true });
  });
  await page.click('#btn-go'); await skipAway(page); await waitIdle(page);
  await page.waitForTimeout(600);
  var a3 = await page.evaluate(function () { return { fly: window.__fly2, dot: !document.querySelector('#btn-album .ib-dot').hidden, poster: !!APP.state.trips[APP.state.trips.length - 1].poster }; });
  ok(!a3.poster || (a3.fly === 0 && a3.dot), '모션 줄이기: 날아가는 포스터 없음 · 점은 켜짐 ' + JSON.stringify(a3));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  /* 앨범을 연 채 산책이 끝나면: 막 뒤로 날지 않는다 · 새 카드는 시트 안에서 · 열린 동안 점 없음 · 닫으면 본 것 (빠르게: --speed 0.1) */
  await page.evaluate(function () {
    document.documentElement.style.setProperty('--speed', '0.1'); window.__fly3 = 0;
    new MutationObserver(function (ms) { ms.forEach(function (m) { [].forEach.call(m.addedNodes, function (n) { if (n.classList && n.classList.contains('album-fly')) window.__fly3++; }); }); }).observe(document.getElementById('scene'), { childList: true });
  });
  var n4 = await page.evaluate(function () { return APP.state.trips.length; });
  await page.click('#btn-go'); await page.waitForSelector('#btn-go.away');
  await page.evaluate(function () { APP.openAlbum(); });
  await waitIdle(page, 60000); await page.waitForTimeout(600);   /* 앨범을 연 채 끝까지 걷는 산책은 HEAD 에서도 22–23 s — 30 s 는 바쁜 기계에서 빠듯했다 (검증 7b: 3번 중 2번 시간 초과로 뒤 시나리오까지 멈춤) */
  var a4 = await page.evaluate(function () { var t = APP.state.trips[APP.state.trips.length - 1]; return { fly: window.__fly3, open: document.getElementById('album-sheet').open, dot: !document.querySelector('#btn-album .ib-dot').hidden, poster: !!t.poster, cards: document.querySelectorAll('#album .pcard').length }; });
  await closeAlbum(page);
  var a4b = await page.evaluate(function () { document.documentElement.style.removeProperty('--speed'); return { dot: !document.querySelector('#btn-album .ib-dot').hidden, seen: APP.state.settings.albumSeen }; });
  var nPost = await page.evaluate(function () { return APP.state.trips.filter(function (t) { return t.poster && t.status === 'done'; }).length; });
  ok(!a4.poster || (a4.fly === 0 && a4.open && !a4.dot && a4.cards === nPost && !a4b.dot), '앨범을 연 채 산책이 끝남: 막 뒤로 날지 않음 · 새 카드는 시트 안에 · 점 없음 · 닫아도 점 없음 ' + JSON.stringify({ a4: a4, after: a4b, trips: n4 + 1 }));
  /* 좁은 폭: 1–4 글자 이름 · 두 테마 · 가로 스크롤 없음 · 아이콘 묶음은 화면 안 */
  var fit = [];
  for (var w of [320, 340, 360, 375, 412]) {
    await page.setViewportSize({ width: w, height: 740 });
    for (var font of ['pixel', 'system']) {
      var r = await page.evaluate(async function (font) {
        document.documentElement.setAttribute('data-font', font);
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
        var out = { cut: [], docW: 0, ctlRight: 0 }, keep = APP.state.octopus.name;
        for (var n of ['별', '뚜루', '조약돌', '조약돌이']) {
          APP.state.octopus.name = n; APP.renderStatus(false);
          await new Promise(function (res) { requestAnimationFrame(function () { requestAnimationFrame(res); }); });
          var el = document.getElementById('oct-name');
          if (el.scrollWidth > el.clientWidth + 0.5 || el.textContent !== n) out.cut.push(n);
        }
        APP.state.octopus.name = keep; APP.renderStatus(false);
        out.docW = document.documentElement.scrollWidth; out.ctlRight = Math.max(document.getElementById('scene-ctl').getBoundingClientRect().right, document.getElementById('btn-door').getBoundingClientRect().right);
        return out;
      }, font);
      fit.push({ w: w, font: font, cut: r.cut, docW: r.docW, ctl: Math.round(r.ctlRight) });
      if (w === 320 && font === 'pixel') await page.screenshot({ path: path.join(SHOTS, 'status-320-pixel.png'), clip: { x: 0, y: 0, width: 320, height: 420 } });
    }
  }
  var bad = fit.filter(function (x) { return x.cut.length || x.docW > x.w || x.ctl > x.w; });
  ok(!bad.length, '320–412 px · 픽셀·시스템: 1–4 글자 이름 안 잘림 · 가로 스크롤 없음 · 아이콘 묶음 · 놀이방 문 화면 안' + (bad.length ? ' ✗ ' + JSON.stringify(bad) : ''));
  await page.evaluate(function () { document.documentElement.setAttribute('data-font', 'pixel'); });
  await page.setViewportSize({ width: 360, height: 740 });
  reportErrors(s.bag, 'L');
  await s.ctx.close();
}

/* N. 호기심 메모 (docs/CURIOSITY_NOTES.md · 계약 R2/R3): 데모 산책의 메모(by demo-rules) 저장 → 다음 산책 두뇌 입력 state.notes 에 그대로 ·
   모델 이벤트(wrap_up.note · setDown) 불러오기 → 모델 메모 저장(글 그대로 · 모델 이름) · 내려놓은 메모는 다음 입력에서 빠지고 '다음 산책에 같이 가' 표시도 없고 앨범에 '내려놓은 메모' ·
   메모를 내려놓는 버튼은 없다 · 새로고침 뒤 그대로 · 메모 없는 옛 기록도 열린다 */
async function scenarioNotes(browser) {
  console.log('\n== N. 호기심 메모: 저장 → 다음 산책 입력 · 모델 메모 · 내려놓기');
  var s = await newPage(browser, 'ok', [{ content: "window.__ppolTest = { forceKind: 'out' };" }]);
  var page = s.page;
  await page.goto(DEV);
  await page.waitForSelector('#name-dialog[open]');
  /* 오늘 첫 산책이 메모(noteOut)를 남기는 이름 — 메모를 쓰지 않는 날도 정당하지만 여기선 이어지는 걸 보려고 */
  var name = await page.evaluate(async function () {
    var names = ['뚜루', '안개', '삐죠', '구름', '조약돌', '먹물', '단추', '파도', '이끼', '별', '솔방울', '종이배'];
    var d = new Date(), dk = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    for (var n of names) {
      var t = await BRAIN.plan({ seed: BRAIN.hashSeed(dk, '', 1, n), dateKey: dk, seq: 1, hint: '', name: n, state: { visits: {}, affinity: {}, lantern: 0, recent: [], todayOut: 0, lanternLeft: true }, now: d, online: false, by: 'demo' });
      if (t.kind === 'out' && t.noteOut && t.noteOut.text) return n;
    }
    return names[0];
  });
  await page.fill('#name-in', name); await page.click('#name-form button[type=submit]');
  await page.waitForSelector('#name-dialog[open]', { state: 'hidden' });
  await page.evaluate(function () {
    window.__planIn = []; window.__replayIn = [];
    var p0 = BRAIN.plan, r0 = BRAIN.replay;
    BRAIN.plan = function (inp) { window.__planIn.push(JSON.parse(JSON.stringify((inp && inp.state && inp.state.notes) || null))); return p0.apply(this, arguments); };
    BRAIN.replay = function (evs, meta) { window.__replayIn.push(JSON.parse(JSON.stringify((meta && meta.state && meta.state.notes) || null))); return r0.apply(this, arguments); };
  });
  async function walk() { await page.click('#btn-go'); await skipAway(page); await waitIdle(page); await page.waitForTimeout(200); }
  await walk();
  var n1 = await page.evaluate(function () { var t = APP.state.trips[APP.state.trips.length - 1]; return { trip: { id: t.id, noteOut: t.noteOut || null }, notes: APP.state.curiosityNotes.slice(), first: window.__planIn[0] }; });
  console.log('   walk1:', JSON.stringify({ name: name, noteOut: n1.trip.noteOut, notes: n1.notes.length }));
  ok(n1.first === null, '첫 산책: 메모가 없으니 두뇌 입력에 notes 필드 없음 (예전과 같은 입력)');
  must(n1.trip.noteOut && n1.notes.length === 1, '데모 산책의 메모가 저장됨 (curiosityNotes 1)');
  var c1 = n1.notes[0];
  ok(/^cn_/.test(c1.id) && c1.text === n1.trip.noteOut.text && c1.by === 'demo-rules' && c1.session === n1.trip.id && c1.status === 'active' && c1.setDownAt === null && typeof c1.at === 'string' && !c1.model
    && JSON.stringify(c1.about) === JSON.stringify(n1.trip.noteOut.about), "메모 모양: id cn_… · 글 그대로 · by 'demo-rules' · session = 여행 id · active · about 그대로 · model 없음");
  await walk();
  var in2 = await page.evaluate(function () { return window.__planIn[window.__planIn.length - 1]; });
  ok(Array.isArray(in2) && in2.length >= 1 && in2[0].id === c1.id && in2[0].text === c1.text && in2[0].by === 'demo-rules' && in2[0].session === c1.session && !('status' in in2[0]),
    '다음 산책 두뇌 입력 state.notes 에 지난 메모 (id·글·작성 주체·세션 그대로, status 없음)');
  /* 모델 이벤트: 긴 메모(70자) + 첫 메모 내려놓기 + 없는 id · 숫자는 무시 */
  var LONG = '조개를 귀에 대면 소리가 나. 다른 소리 나는 것도 궁금해. 바람 소리, 파도 소리, 그리고 비 오는 날의 지붕 소리까지 다 듣고 싶어';
  var evs = [{ type: 'depart', t: 0, hint: '' }, { type: 'peek', t: 1000, target: { kind: 'room', id: 'hat', title: '모자' }, status: 'builtin', ms: 3000 },
    { type: 'return', t: 2000, reason: 'enough' }, { type: 'remember', t: 2500, stopIdx: 0, sticker: 'hat', line: '모델이 고른 모자' }, { type: 'hang_poster', t: 3000 },
    { type: 'wrap_up', t: 3500, reaction: '덤덤', note: { text: LONG, about: { kind: 'node', id: 'hat' } }, setDown: [c1.id, 'cn_nope', 7], model: 'claude-test' }];
  await page.click('#demo summary').catch(function () {});
  await page.evaluate(function () { document.getElementById('demo').open = true; });
  await page.fill('#d-json', JSON.stringify(evs)); await page.click('#d-import');
  await skipAway(page); await waitIdle(page);
  var m = await page.evaluate(function () { var t = APP.state.trips[APP.state.trips.length - 1]; return { by: t.by, id: t.id, notes: APP.state.curiosityNotes.slice(), rin: window.__replayIn[window.__replayIn.length - 1] }; });
  var cm = m.notes.filter(function (x) { return x.session === m.id; })[0] || {}, d1 = m.notes.filter(function (x) { return x.id === c1.id; })[0] || {};
  console.log('   mcp:', JSON.stringify({ notes: m.notes.map(function (x) { return x.id + ':' + x.by + ':' + x.status; }) }));
  ok(Array.isArray(m.rin) && m.rin.some(function (x) { return x.id === c1.id; }), '모델 이벤트 재생 입력에도 active 메모 (내려놓기 전)');
  ok(cm.by === 'model' && cm.text === LONG && cm.model === 'claude-test' && cm.about && cm.about.id === 'hat' && cm.status === 'active', "모델 메모: by 'model' · 70자 글 그대로 저장 · 모델 이름 · about hat");
  ok(d1.status === 'set_down' && typeof d1.setDownAt === 'string' && m.notes.filter(function (x) { return x.status === 'set_down'; }).length === 1, '모델이 내려놓은 메모만 set_down (없는 id · 숫자는 무시)');
  await walk();
  var in3 = await page.evaluate(function () { return window.__planIn[window.__planIn.length - 1]; });
  ok(Array.isArray(in3) && in3.length <= 3 && in3[0].id === cm.id && !in3.some(function (x) { return x.id === c1.id; }) && in3[0].model === 'claude-test',
    '다음 입력: 내려놓은 메모 빠짐 · 새것부터 (모델 메모 먼저, 모델 이름 포함) · 최대 3 — ' + JSON.stringify((in3 || []).map(function (x) { return x.id + ':' + x.by; })));
  /* 앨범 '남긴 메모': 다음 산책에 같이 가는 메모(active 최근 ≤3 = 두뇌 입력과 같은 목록)에 표시 (예전 방 보기 '우리 방의 지난 메모') */
  await openAlbum(page);
  var rs = await page.evaluate(function (ids) {
    var items = [].map.call(document.querySelectorAll('#album-notes .cnote'), function (li) { var tg = li.querySelector('.cn-tag'); return { id: li.dataset.note, text: li.querySelector('.cn-text').textContent, meta: li.querySelector('.cn-meta').textContent, tag: tg ? tg.textContent : '' }; });
    var next = items.filter(function (x) { return x.tag === '다음 산책에 같이 가'; }).map(function (x) { return x.id; });
    var btns = [].filter.call(document.querySelectorAll('#settings-sheet button, #album-sheet button'), function (b) { return /내려놓/.test(b.textContent); }).length;
    return { items: items, next: next, btns: btns, last: (window.__planIn[window.__planIn.length - 1] || []).map(function (x) { return x.id; }), downNext: next.indexOf(ids.down) >= 0 };
  }, { down: c1.id });
  var mi = rs.items.filter(function (x) { return x.id === cm.id; })[0] || {};
  ok(rs.next.length >= 1 && rs.next.length <= 3 && !rs.downNext && rs.btns === 0 && rs.next.indexOf(cm.id) >= 0, "앨범 '남긴 메모': '다음 산책에 같이 가' 표시 ≤3 (내려놓은 메모엔 없음) · 내려놓기 버튼 없음 " + JSON.stringify(rs.next));
  ok(mi.text === '“' + Array.from(LONG).slice(0, 60).join('') + '…”' && /^문어\(모델\)가 남김 \(claude-test\) · \d+\.\d+ · \d+번째 뽈뽈$/.test(mi.meta), "모델 메모: 60자 + '…' · '문어(모델)가 남김' · 날짜 · 몇 번째 뽈뽈 — " + mi.meta);
  ok(rs.items.some(function (x) { return /^데모 규칙 · /.test(x.meta); }) || rs.items.every(function (x) { return x.id === cm.id; }), "데모 메모는 '데모 규칙' 으로 표시");
  await page.click('#album-notes .cnote[data-note="' + cm.id + '"] button.cn-text');
  ok((await page.textContent('#album-notes .cnote[data-note="' + cm.id + '"] .cn-text')) === '“' + LONG + '”', '누르면 전체 글 (원문 그대로)');
  await page.screenshot({ path: path.join(SHOTS, 'album-next-notes.png') });
  await closeAlbum(page);
  await openAlbum(page);
  var al = await page.evaluate(function (ids) {
    var items = [].map.call(document.querySelectorAll('#album-notes .cnote'), function (li) { return { id: li.dataset.note, tag: (li.querySelector('.cn-tag') || {}).textContent || '' }; });   /* 표시는 '내려놓은 메모' 또는 '다음 산책에 같이 가' (S · 위 블록) */
    return { n: items.length, all: APP.state.curiosityNotes.length, down: items.filter(function (x) { return x.id === ids.down; })[0], tags: items.filter(function (x) { return x.tag === '내려놓은 메모'; }).length };
  }, { down: c1.id });
  ok(al.n === al.all && al.down && al.down.tag === '내려놓은 메모' && al.tags === 1, "앨범 '남긴 메모': 메모 전부 (" + al.n + ") · 내려놓은 메모에만 '내려놓은 메모' 표시");
  await page.click('#album-sheet .fchip[data-f="poster"]');
  ok(!(await page.$('#album-notes .cnote')), '포스터 필터에선 메모 목록 숨김');
  await page.click('#album-sheet .fchip[data-f="all"]');
  await page.screenshot({ path: path.join(SHOTS, 'album-notes.png') });
  await closeAlbum(page);
  /* 새로고침 → 그대로 */
  var before = await page.evaluate(function () { return JSON.stringify(APP.state.curiosityNotes); });
  await page.waitForTimeout(1000);
  await page.reload(); await page.waitForSelector('#btn-go:not(.away)');
  ok((await page.evaluate(function () { return JSON.stringify(APP.state.curiosityNotes); })) === before, '새로고침 뒤 메모·상태 그대로');
  /* 메모 없는 옛 기록 (curiosityNotes · albumSeen · 새 여행 필드 없음) → 새 탭에서 앱보다 먼저 심는다 (열린 탭은 떠날 때 제 기록을 다시 저장한다) → 열린다 · 메모 [] · 옛 포스터에 점 없음 */
  var oldJSON = await page.evaluate(function () {
    var o = JSON.parse(JSON.stringify(APP.state)); delete o.curiosityNotes; delete o.settings.albumSeen;
    o.trips.forEach(function (t) { delete t.noteOut; delete t.setDown; delete t.reactionBy; delete t.reactionRaw; delete t.reactionLine; });
    return JSON.stringify(o);
  });
  reportErrors(s.bag, 'N');
  await s.ctx.close();
  var s2 = await newPage(browser, 'ok', [{ content: "if (!sessionStorage.getItem('__oldSave')) { sessionStorage.setItem('__oldSave', '1'); localStorage.setItem('ppolppol_v2', " + JSON.stringify(oldJSON) + "); }" }]);
  await s2.page.goto(DEV); await s2.page.waitForSelector('#btn-go:not(.away)');
  var old = await s2.page.evaluate(function () { var b = document.getElementById('btn-album'); return { notes: APP.state.curiosityNotes, btn: !b.hidden, dot: !b.querySelector('.ib-dot').hidden, trips: APP.state.trips.length, rows: document.querySelectorAll('#log .lrow').length }; });
  ok(Array.isArray(old.notes) && old.notes.length === 0 && old.btn && !old.dot && old.trips >= 4 && old.rows >= 5, '메모 없는 옛 기록: 그대로 열림 · 메모 [] · 앨범 아이콘 있음 · 옛 포스터엔 점 없음 ' + JSON.stringify({ trips: old.trips, rows: old.rows, dot: old.dot }));
  reportErrors(s2.bag, 'N2');
  await s2.ctx.close();
}

/* M. 반응은 고른 이의 것 그대로 (MODEL_VOICE §2·§3 · 계약 R1): 모델(by mcp) 집에 있는 날 '폴짝' → '폴짝' 그대로, 코드가 지은 줄 없음 ·
   반응을 안 주면 반응 자리가 비어 있음(마무리 행 · 일기 반응 칸 · 열람 기록 반응 줄 없음) · 네 가지 밖의 말(40자 넘음) + 모델이 쓴 줄 → 그대로(40자 + '…') ·
   데모 조작(사람)의 '졸림' → 그대로, 코드 줄 없음 */
async function scenarioReactions(browser) {
  console.log('\n== M. 반응: 모델·사람이 준 그대로 · 안 주면 없음');
  var s = await newPage(browser, 'ok');
  var page = s.page;
  await page.goto(DEV);
  await page.waitForSelector('#name-dialog[open]');
  await page.fill('#name-in', '뚜루'); await page.click('#name-form button[type=submit]');
  await page.waitForSelector('#name-dialog[open]', { state: 'hidden' });
  await page.evaluate(function () { document.getElementById('demo').open = true; });
  async function importEvs(evs) {
    await page.fill('#d-json', JSON.stringify(evs)); await page.click('#d-import');
    await skipAway(page).catch(function () {});
    await waitIdle(page); await page.waitForTimeout(200);
  }
  /* 이 여행의 로그 행 · 열람 기록 · 일기를 여행 객체에서 바로 그려 본다 (화면과 같은 함수) */
  function view() {
    return page.evaluate(function () {
      var t = APP.state.trips[APP.state.trips.length - 1], rows = [].filter.call(document.querySelectorAll('#log .lrow'), function (r) { var l = r.querySelector('.ltool'); return l && l.textContent === '마무리'; });
      var box = document.createElement('div'); box.innerHTML = APP.receiptHTML(t);
      var kv = [].filter.call(box.querySelectorAll('.kv'), function (k) { return k.firstChild.textContent === '반응'; })[0];
      var ins = document.createElement('div'); ins.innerHTML = APP.inspectHTML(t);
      return { trip: { by: t.by, kind: t.kind, reaction: t.reaction, raw: t.reactionRaw || null, by2: t.reactionBy || null, line: t.reactionLine || null }, wrapRows: rows.length,
        lastRow: rows.length ? rows[rows.length - 1].querySelector('.ltext').textContent : null, lastExpr: rows.length ? rows[rows.length - 1].dataset.expr : null,
        kv: kv ? kv.querySelector('b').textContent : null, kvTitle: kv ? kv.querySelector('b').getAttribute('title') : null, dims: [].map.call(box.querySelectorAll('p.dim'), function (p) { return p.textContent; }),
        say: (ins.querySelector('.say') || {}).textContent || null, back: box.textContent };
    });
  }
  var W0 = await page.evaluate(function () { return [].concat.apply([], Object.keys((WORLD && WORLD.reactions) || {}).map(function (k) { var r = WORLD.reactions[k], w = r.when || {}; return [].concat.apply([].concat(r.lines || [], r.home || []), Object.keys(w).map(function (q) { return w[q]; })).filter(function (x) { return typeof x === 'string'; }); })); });
  function noCodeLine(v) { return !W0.some(function (l) { return l && (v.back.indexOf(l) >= 0 || (v.lastRow || '').indexOf(l) >= 0 || (v.say || '').indexOf(l) >= 0); }); }
  /* 1. 모델 · 집 · 폴짝 */
  await importEvs([{ type: 'stay_home', t: 0, activity: 'nap', line: '담요 속에서 낮잠' }, { type: 'wrap_up', t: 2000, reaction: '폴짝' }]);
  var v1 = await view();
  console.log('   mcp home 폴짝:', JSON.stringify({ trip: v1.trip, row: v1.lastRow, kv: v1.kv, say: v1.say }));
  ok(v1.trip.by === 'mcp' && v1.trip.kind === 'home' && v1.trip.reaction === '폴짝' && v1.trip.by2 === 'model', "모델 집에 있는 날 '폴짝' → 기록도 '폴짝' (reactionBy model)");
  ok(v1.lastRow === '폴짝' && v1.lastExpr === 'happy' && v1.kv === '폴짝' && v1.say === '폴짝' && !v1.dims.length && noCodeLine(v1), "로그 '폴짝' (단어만 — 이모지 없음) · 일기 반응 '폴짝' · 코드가 지은 반응 줄 없음");
  /* 2. 모델 · 반응 생략 */
  var rowsBefore = v1.wrapRows;
  await importEvs([{ type: 'stay_home', t: 0, activity: 'nap', line: '담요 속에서 낮잠' }, { type: 'wrap_up', t: 2000 }]);
  var v2 = await view();
  ok(v2.trip.reaction === null && !v2.trip.raw && v2.trip.by2 === null, '반응을 안 주면 기록에도 반응 없음 (지어내지 않음)');
  ok(v2.wrapRows === rowsBefore && v2.kv === null && v2.say === null && !v2.dims.length, '반응 자리 비움: 마무리 행 없음 · 일기 반응 칸 없음 · 열람 기록 반응 줄 없음');
  /* 3. 모델 · 외출 · 네 가지 밖의 반응(40자 넘음) + 모델이 쓴 줄 */
  var RAW = '오늘은 좀 묘했어 그런데 나쁘지 않았어 다음에도 이런 날이면 좋겠다 정말로', LINE = '모자 안쪽 띠가 제일 재밌었어';
  await importEvs([{ type: 'depart', t: 0, hint: '' }, { type: 'peek', t: 1000, target: { kind: 'room', id: 'hat', title: '모자' }, status: 'builtin', ms: 3000 }, { type: 'return', t: 2000, reason: 'enough' },
    { type: 'remember', t: 2500, stopIdx: 0, sticker: 'hat', line: '모델이 고른 모자' }, { type: 'hang_poster', t: 3000 }, { type: 'wrap_up', t: 3500, reaction: RAW, line: LINE }]);
  var v3 = await view(), clip40 = Array.from(RAW).slice(0, 40).join('') + '…';
  console.log('   mcp raw:', JSON.stringify({ trip: v3.trip, row: v3.lastRow, kv: v3.kv }));
  ok(v3.trip.reaction === null && v3.trip.raw === RAW && v3.trip.line === LINE, '네 가지 밖의 반응은 reactionRaw 에 원문 그대로 · 모델이 쓴 줄은 reactionLine 그대로');
  ok(v3.lastRow === clip40 + ' · ' + LINE && v3.lastExpr === 'calm' && v3.kv === clip40 && v3.kvTitle === RAW && v3.dims.indexOf(LINE) >= 0 && v3.say === LINE, "로그·일기: 40자 + '…' (원문은 title) · 모델이 쓴 줄 그대로");
  /* 4. 데모 조작(사람) · 집 · 졸림 */
  await page.click('#d-stay'); await waitIdle(page); await page.waitForTimeout(200);
  var v4 = await view();
  ok(v4.trip.by === 'human' && v4.trip.reaction === '졸림' && v4.trip.by2 === 'human' && v4.lastRow === '졸림' && !v4.dims.length && noCodeLine(v4), "사람(데모 조작)이 준 '졸림' 그대로 · 코드 줄 없음 (" + v4.lastRow + ')');
  /* 5. 데모 두뇌(규칙) 산책은 예전처럼 반응 + 줄 (reactionBy demo-rules) */
  await page.evaluate(function () { window.__ppolTest = { forceKind: 'home' }; });
  await page.click('#btn-go'); await skipAway(page); await waitIdle(page);
  await page.evaluate(function () { delete window.__ppolTest; });
  var v5 = await view();
  ok(v5.trip.by === 'demo' && v5.trip.by2 === 'demo-rules' && !!v5.trip.reaction && v5.lastRow && v5.lastRow.indexOf(v5.trip.reaction) >= 0, "데모 두뇌 차례: 반응은 예전처럼 (reactionBy 'demo-rules') — " + v5.lastRow);
  reportErrors(s.bag, 'M');
  await s.ctx.close();
}

/* R. 다락방 달리기 (js/runner.js): 놀이방 문(#btn-door) → 놀이방 → 오락기(#btn-machine, 8물결) → 6초 스크립트 탭 → 부딪힘 또는 닫기 → 저장된 판의 simulate() 점수 = 화면 점수.
 *   SwiftShader(WebGL 강제, look-shots 와 같은 인자) · 360×740 @2x · 스크린샷 tests/evidence/runner-{start,mid,over}.png
 *   실제 판 기록은 tests/evidence/runner-live-run.json 에 남겨 node tools/test-runner.js 가 다시 시뮬한다. */
async function scenarioRunner() {
  console.log('\n== R. 다락방 달리기 (같이 놀기)');
  var EVD = path.join(ROOT, 'tests/evidence'); fs.mkdirSync(EVD, { recursive: true });
  var br = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  try {
    var ctx = await br.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, locale: 'ko-KR', colorScheme: 'light' });
    var page = await ctx.newPage(), bag = []; bag.ignored = [];
    watchErrors(page, bag);
    if (useStubs) await page.addInitScript({ path: path.join(ROOT, 'tools/stubs.js') });
    await routeWiki(page, 'ok');
    await page.goto(INDEX);
    await page.waitForSelector('#name-dialog[open]');
    await page.fill('#name-in', '뚜루'); await page.click('#name-form button[type=submit]');
    await page.waitForSelector('#name-dialog[open]', { state: 'hidden' });
    await page.waitForTimeout(600);
    must(await page.$('#scene #btn-door'), '장면에 놀이방 문 (#btn-door)');
    /* 8물결: 다락 안 놀이방 문 → 놀이방 → '다락방 달리기' 오락기 (#btn-machine) → 달리기 창 */
    await clickSpot(page, '#btn-door');
    await page.waitForFunction(function () { var m = document.getElementById('btn-machine'); return APP.scene.view() === 'play' && m && !m.hidden; }, null, { timeout: 20000 });
    await clickSpot(page, '#btn-machine');
    await page.waitForSelector('#runner-dlg[open]');
    await page.waitForTimeout(400);
    var info = await page.evaluate(function () {
      var cv = document.getElementById('rn-cv'), r = cv.getBoundingClientRect(), L = RUNNER.live();
      var b = [].map.call(document.querySelectorAll('#runner-dlg button:not([hidden])'), function (x) { var q = x.getBoundingClientRect(); return q.width && q.height ? Math.min(q.width, q.height) : 99; });
      return { w: r.width, h: r.height, dpr: devicePixelRatio, focus: document.activeElement && document.activeElement.id, state: L.state, sprites: L.sprites, phase: L.phase, season: L.season, minBtn: Math.min.apply(null, b), docW: document.documentElement.scrollWidth };
    });
    console.log('   start:', JSON.stringify(info));
    ok(info.state === 'ready' && info.focus === 'rn-cv', '준비 상태 · 캔버스에 포커스');
    ok(Number.isInteger(info.w * info.dpr / 192) && info.w * info.dpr / 192 >= 2 && Math.abs(info.h * 192 - info.w * 108) < 1, '캔버스 192×108 정수 배 (' + (info.w * info.dpr / 192) + '×, 장치 px)');
    ok(info.sprites === 'portrait', '문어 스프라이트 = 장면 초상 캡처');
    ok(info.minBtn >= 44, '보이는 버튼 ≥ 44px (' + info.minBtn + ')');
    ok(info.docW <= 360, '가로 스크롤 없음');
    await page.screenshot({ path: path.join(EVD, 'runner-start.png') });

    /* 6초 스크립트 탭: 처음 셋은 Playwright 실제 입력(스페이스·점프 버튼 포인터), 그 뒤는 페이지 안 자동 조종이 실제 keydown/keyup 을 캔버스에 보낸다 */
    var t0 = Date.now();
    await page.keyboard.down(' '); await page.waitForTimeout(90); await page.keyboard.up(' ');
    await page.waitForTimeout(600);
    var jb = await (await page.$('#rn-jump')).boundingBox();
    await page.mouse.move(jb.x + jb.width / 2, jb.y + jb.height / 2); await page.mouse.down(); await page.waitForTimeout(150); await page.mouse.up();
    await page.evaluate(function () {
      var cv = document.getElementById('rn-cv'), busy = 0, ducking = false;
      function key(type, k) { cv.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true, cancelable: true })); }
      window.__rnPilot = setInterval(function () {
        var L = RUNNER.live(); if (!L || L.state !== 'run') { clearInterval(window.__rnPilot); return; }
        var X = RUNNER.C.OCT_X + RUNNER.C.OCT_W, sp = L.speed / 256, near = null;
        L.obs.forEach(function (o) { if (o.k !== 'moss' && o.x + o.w > RUNNER.C.OCT_X && (!near || o.x < near.x)) near = o; });
        if (ducking && (!near || near.k !== 'web')) { key('keyup', 'ArrowDown'); ducking = false; }
        if (!near || Date.now() < busy) return;
        var d = near.x - X;
        if (near.k === 'web') { if (d < 12 * sp && !ducking) { key('keydown', 'ArrowDown'); ducking = true; } return; }
        var hold = { crate: 60, candle: 200, books: 220, crate2: 220, rain: 240 }[near.k] || 120, lead = { candle: 7, crate: 9 }[near.k] || 10;
        if (L.ground && d < lead * sp && d > -4) { key('keydown', ' '); busy = Date.now() + hold + 120; setTimeout(function () { key('keyup', ' '); }, hold); }
      }, 16);
    });
    await page.waitForTimeout(Math.max(0, 1500 - (Date.now() - t0)));
    if ((await page.evaluate(function () { return RUNNER.live().state; })) === 'run') await page.screenshot({ path: path.join(EVD, 'runner-mid.png') });
    await page.waitForTimeout(Math.max(0, 3200 - (Date.now() - t0)));
    if ((await page.evaluate(function () { var L = RUNNER.live(); return L.state === 'run' && L.obs.length >= 2; }))) await page.screenshot({ path: path.join(EVD, 'runner-mid.png') });
    var rest = 6000 - (Date.now() - t0); if (rest > 0) await page.waitForFunction(function () { return RUNNER.live().state === 'over'; }, null, { timeout: rest }).catch(function () {});
    var midObs = await page.evaluate(function () { clearInterval(window.__rnPilot); return RUNNER.live().ticks; });
    var ended = await page.evaluate(function () { return RUNNER.live().state; });
    if (ended !== 'over') { await page.click('#rn-close'); await page.waitForSelector('#runner-dlg[open]', { state: 'hidden' }); }
    else await page.waitForTimeout(600);
    var res = await page.evaluate(function () {
      var st = JSON.parse(localStorage.getItem('ppolppol_runner') || 'null'), run = st && st.last;
      var shown = document.getElementById('rn-score').textContent;
      var sim = run && RUNNER.simulate(run.seed, run.inputs, { night: run.night, until: run.end === 'hit' ? null : run.ticks });
      return { run: run, best: st && st.best, shown: shown, sim: sim, verify: run ? RUNNER.verify(run) : false, focus: document.activeElement && document.activeElement.id };
    });
    console.log('   run: end=' + (res.run && res.run.end) + ' ticks=' + (res.run && res.run.ticks) + ' inputs=' + (res.run && res.run.inputs.length) + ' saved=' + (res.run && res.run.score) + ' shown=' + res.shown + ' sim=' + JSON.stringify(res.sim) + ' (6초 동안 ' + midObs + ' 틱)');
    must(res.run && res.run.version === 'runner-1' && res.run.inputs.length >= 2, 'localStorage ppolppol_runner 에 판 기록 (seed·inputs·score·version)');
    ok(res.sim.score === res.run.score && String(res.sim.score) === res.shown, 'simulate() 점수 = 저장 점수 = 화면 점수 (' + res.shown + ')');
    ok(res.verify, 'RUNNER.verify(기록) 통과');
    ok(res.best >= res.run.score, '최고 기록 저장');
    if (ended !== 'over') ok(res.focus === 'btn-machine', '닫으면 오락기(놀이방)로 포커스가 돌아감');
    fs.writeFileSync(path.join(EVD, 'runner-live-run.json'), JSON.stringify(Object.assign({ displayed: res.shown }, res.run), null, 1));

    /* 게임 오버 화면: 입력 없이 한 판 (첫 상자에 부딪힘) */
    if (ended === 'over') await page.click('#rn-again'); else await clickSpot(page, '#btn-machine');
    await page.waitForFunction(function () { return RUNNER.live() && RUNNER.live().state === 'ready'; });
    await page.focus('#rn-cv'); await page.keyboard.press(' ');
    await page.waitForFunction(function () { return RUNNER.live().state === 'over'; }, null, { timeout: 15000 });
    await page.waitForTimeout(700);
    var ov = await page.evaluate(function () {
      var st = JSON.parse(localStorage.getItem('ppolppol_runner')), run = st.last;
      return { final: document.getElementById('rn-final').textContent, best: document.getElementById('rn-final-best').textContent, again: document.activeElement && document.activeElement.id, shown: document.getElementById('rn-score').textContent, sim: RUNNER.simulate(run.seed, run.inputs, { night: run.night }).score, saved: run.score, end: run.end };
    });
    console.log('   over:', JSON.stringify(ov));
    ok(/또 할래\?/.test(await page.textContent('#rn-again')) && /그만/.test(await page.textContent('#rn-stop')), '게임 오버: "또 할래?" / "그만"');
    ok(ov.again === 'rn-again' && /최고/.test(ov.best), '게임 오버: 최고 기록 표시 · "또 할래?" 에 포커스');
    ok(ov.end === 'hit' && ov.sim === ov.saved && String(ov.sim) === ov.shown, '부딪힌 판도 재시뮬 점수 = 화면 점수 (' + ov.shown + ')');
    await page.screenshot({ path: path.join(EVD, 'runner-over.png') });
    await page.click('#rn-stop');
    await page.waitForSelector('#runner-dlg[open]', { state: 'hidden' });
    reportErrors(bag, 'R');
    await ctx.close();
  } finally { await br.close(); }
}

/* S. 7물결 (주인 11-07 · docs/OWNER_DECISIONS.md '주인 답 (11-07)'): 방 보기는 없앴다 → ⚙ 설정 시트 · 앨범(문어의 요즘 · 다음 산책 메모 · 일기 탭) ·
   등불을 누르면 "초대한 날마다 한 칸 켜져" (폰 폭에선 첫 줄에 방 제목) · 건너뛰기는 큰 버튼에 (나가 있는 동안 "다녀오는 중…" 글자만 — 기호 없음) · 놀이방 문(임시) → 달리기 창, 그동안 산책은 그대로 이어진다 ·
   잠들 때 소리 훅에 그 차례의 반응 (D-1 자장가). 플레이어 화면 = 가짜 http 호스트 + ?dev=0 · --speed 0.4 (공개 간격·의식이 빨리) · 날짜 훅으로 사흘 */
var AUDIO_SPY = "window.__aud = []; (function w() { if (window.AUDIO && !AUDIO.__spy) { AUDIO.__spy = 1; var o = AUDIO.on; AUDIO.on = function (n, d) { if (n === 'door' || n === 'state') window.__aud.push({ n: n, d: JSON.parse(JSON.stringify(d || {})), has: !!d && 'reaction' in d }); return o.apply(this, arguments); }; } else if (!window.AUDIO) setTimeout(w, 5); })();";
async function scenarioWave7(browser) {
  console.log('\n== S. 7물결: 방 보기 없음 · ⚙ 설정 · 등불 말풍선 · 큰 버튼 건너뛰기 · 놀이방 문 · 앨범 일기');
  var O = 'http://ppolppol.example', DAY1 = '2026-11-03', DAY2 = '2026-11-04', DAY3 = '2026-11-05', SPEED = 0.4;
  var s = await newPage(browser, 'ok', [{ content: "window.__ppolTest = window.__ppolTest || { today: '" + DAY1 + "', forceKind: 'out' };" }, { content: AUDIO_SPY }]);
  var page = s.page;
  await routeRepo(page, O);
  await page.goto(O + '/index.html?dev=0&slow=' + SPEED);
  await page.waitForSelector('#name-dialog[open]', { timeout: 20000 });
  await page.fill('#name-in', '뚜루'); await page.click('#name-form button[type=submit]');
  await page.waitForSelector('#name-dialog[open]', { state: 'hidden' });

  /* 1. 플레이어 화면에 '방 보기' 가 어디에도 없다 */
  var nv = await page.evaluate(function () {
    function shown(el) { if (!el) return false; var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; }
    var g = document.getElementById('btn-settings'), gr = g.getBoundingClientRect();
    return { text: document.body.innerText.indexOf('방 보기') >= 0, ids: ['btn-look', 'btn-skip', 'room-sheet', 'rs-body', 'rs-play'].filter(function (id) { return !!document.getElementById(id); }), api: typeof APP.openRoomSheet,
      inv: [].filter.call(document.querySelectorAll('#invite button'), shown).map(function (b) { return b.id; }), demo: !shown(document.getElementById('demo')),
      gear: { label: g.getAttribute('aria-label'), w: gr.width, h: gr.height, inCtl: !!g.closest('#scene-ctl') }, door: (function () { var d = document.getElementById('btn-door'), r = d.getBoundingClientRect(), sc = document.getElementById('scene').getBoundingClientRect(), sp = APP.scene.spotRect('atticPlay'); return { label: d.getAttribute('aria-label'), w: r.width, h: r.height, spot: d.dataset.spot, popup: d.hasAttribute('aria-haspopup'), inside: r.left >= sc.left && r.right <= sc.right && r.top >= sc.top && r.bottom <= sc.bottom, over: !!sp && sp.mode === 'over' && Math.abs(sp.client.x - r.left) < 1.5 && Math.abs(sp.client.y - r.top) < 1.5, img: !!d.querySelector('img.door-ico[src]') && d.querySelector('img.door-ico').naturalWidth === 16 }; })() };
  });
  console.log('   player:', JSON.stringify(nv));
  ok(!nv.text && !nv.ids.length && nv.api === 'undefined' && nv.inv.join() === 'btn-go' && nv.demo, "플레이어 화면: '방 보기' 글자·버튼·시트 없음 · 따로 된 건너뛰기 없음 · 초대 바는 큰 버튼 하나");
  ok(nv.gear.label === '설정' && nv.gear.inCtl && nv.gear.w >= 44 && nv.gear.h >= 44, "⚙ 설정 아이콘: 장면 오른쪽 위 묶음 · aria-label '설정' · 누르는 곳 44px");
  ok(nv.door.label === '놀이방' && nv.door.w >= 44 && nv.door.h >= 44 && nv.door.spot === 'over' && nv.door.over && nv.door.inside && !nv.door.popup && nv.door.img, "놀이방 문 (8물결): 다락 안 3D 문 위 투명 단추 (data-spot over · 장면 안 · aria-label '놀이방' · 44px 이상 · 창을 여는 단추가 아님) · 바깥용 16×16 픽셀 그림은 그대로 실림 " + JSON.stringify(nv.door));
  /* 1b. 문 앞(장면 오른쪽 위 묶음 바로 아래)에서 긴 말: 비켜 서도 말풍선과 겹치는 버튼은 말풍선이 보이는 동안 숨는다 (투명 · 탭 통과) — 겹치지 않는 버튼은 그대로.
         예전엔 묶음 전체를 0.3 으로 옅게만 해서 아이콘(이번 물결에 ⚙ 이 늘어 셋)이 말풍선 글자 위에 그려졌다. 말풍선이 사라지면 모두 돌아온다 */
  await page.evaluate(function () { return Promise.race([APP.walkTo('door'), new Promise(function (r) { setTimeout(r, 6000); })]); });
  await page.evaluate(function () { APP.say('여기 창문 너머로 빗소리가 들려. 오늘은 어디 갈까 생각 중이야', 'happy', 1600); });
  await page.waitForTimeout(700);
  function ctlOps() { return page.evaluate(function () {
    var bb = document.getElementById('oct-bubble'), q = bb.hidden ? null : bb.getBoundingClientRect();
    return [].map.call(document.querySelectorAll('#scene-ctl .icon-btn:not([hidden]), #btn-door'), function (btn) {
      var z = btn.querySelector('.snd-box, .door-box').getBoundingClientRect(), op = 1, e = btn; while (e && e !== document.body) { op *= +getComputedStyle(e).opacity; e = e.parentElement; }
      return { id: btn.id, over: !!q && q.left < z.right && q.right > z.left && q.top < z.bottom && q.bottom > z.top, op: +op.toFixed(2), pe: getComputedStyle(btn).pointerEvents, spot: btn.dataset.spot || '' };
    });
  }); }
  var yo = await ctlOps();
  ok(yo.some(function (x) { return x.over; }) && yo.every(function (x) { return x.over ? x.op === 0 && x.pe === 'none' : x.op === 1; }), '문 앞 긴 말: 말풍선과 겹치는 버튼만 숨김 (글자 위에 아이콘이 안 그려짐) · 나머지는 그대로 ' + JSON.stringify(yo));
  await page.waitForFunction(function () { return document.getElementById('oct-bubble').hidden; }, null, { timeout: 8000 });
  /* 되돌림은 ui-art 의 0.2 s 타이머 + 0.25 s 페이드 — 전체 스모크처럼 CPU 가 바쁘면 타이머와 애니메이션 프레임이 늦으므로 (표시는 걷혔는데 페이드가 아직 0 에 머문 회차가 있었다)
     고정 0.4 s 대신 다 돌아올 때까지 최대 3 s 기다린다. 영영 안 돌아오면 아래 검사가 잡는다 */
  await page.waitForFunction(function () {
    if (document.querySelector('.yield')) return false;
    return [].every.call(document.querySelectorAll('#scene-ctl .icon-btn:not([hidden]), #btn-door'), function (btn) { var op = 1, e = btn; while (e && e !== document.body) { op *= +getComputedStyle(e).opacity; e = e.parentElement; } return op === 1; });
  }, null, { timeout: 3000 }).catch(function () {});
  var yb = await ctlOps();
  ok(yb.every(function (x) { return x.op === 1 && (x.pe !== 'none' || x.spot === 'over'); }) && !(await page.$('.yield')), '말풍선이 사라지면 버튼이 모두 돌아옴 (3D 문 위 투명 문 단추는 원래 pointer-events: none — 톡은 장면이 받는다) ' + JSON.stringify(yb.map(function (x) { return x.id + ':' + x.op; })));
  await page.evaluate(function () { return Promise.race([APP.walkTo('center'), new Promise(function (r) { setTimeout(r, 6000); })]); });

  /* 2. ⚙ 설정 시트: 문어 색 · 소리(js/audio.js) · 화면 · 기록 · 누가 고르나 (플레이어에겐 팔레트 없음) */
  await page.click('#btn-settings'); await page.waitForSelector('#settings-sheet[open]');
  var st = await page.evaluate(function () {
    var b = document.getElementById('set-body');
    return { hs: [].map.call(b.querySelectorAll('h3'), function (x) { return x.textContent; }), hue: !!document.getElementById('set-hue'), presets: b.querySelectorAll('.presets .preset').length,
      music: !!document.getElementById('set-music'), sfx: !!document.getElementById('set-sfx'), motion: !!document.getElementById('set-motion'), pixel: !!document.getElementById('set-pixel'), thumbs: !!document.getElementById('set-thumbs'),
      stats: (document.getElementById('set-stats') || {}).textContent, data: [].map.call(b.querySelectorAll('.set-data .btn'), function (x) { return x.textContent.trim(); }), dataH: [].map.call(b.querySelectorAll('.set-data .btn'), function (x) { return Math.round(x.getBoundingClientRect().height); }),
      who: (document.getElementById('set-who') || {}).textContent, pal: !!b.querySelector('[data-pal]'), focus: document.activeElement && document.activeElement.id, text: document.getElementById('settings-sheet').innerText };
  });
  console.log('   settings:', JSON.stringify({ hs: st.hs, stats: st.stats, data: st.data, who: st.who }));
  ok(st.hs[0] === '문어 색' && st.hue && st.presets === 6, '설정: 맨 위 문어 색 (색 슬라이더 + 프리셋 6)');

  /* 2b. 내 모습 (내 캐릭터 파츠 v0 · docs/PLAYER_PARTS.md §3 — 옷방이 생기기 전까지 여기): 문어 색 바로 아래 h3 · 7줄 (머리 · 머리 색 · 눈 · 눈 색 · 옷 · 신발 · 악세사리) · 줄마다 켜진 칩 하나 ·
         색 줄은 .preset 동그라미(aria-label 이름) · 나머지는 .fchip 글자 칩(aria-pressed) · 이모지·기호 없음 · 미리보기 캔버스는 3D + playerPortrait 있을 때만 (96px · pixelated), 2D 면 한 줄 안내 */
  var pp = await page.evaluate(function () {
    var b = document.getElementById('set-body'), sec = document.getElementById('set-parts'), hs = [].map.call(b.querySelectorAll('h3'), function (x) { return x.textContent; });
    var rows = sec ? [].map.call(sec.querySelectorAll('.set-part'), function (r) {
      var chips = [].slice.call(r.querySelectorAll('[data-id]'));
      return { cat: r.dataset.part, lbl: (r.querySelector('.set-part-lbl') || {}).textContent, n: chips.length, on: chips.filter(function (c) { return c.getAttribute('aria-pressed') === 'true' && c.classList.contains('on'); }).length,
        kind: chips.every(function (c) { return c.classList.contains(/Color$/.test(r.dataset.part) ? 'preset' : 'fchip'); }), named: chips.every(function (c) { return /Color$/.test(r.dataset.part) ? !!c.getAttribute('aria-label') && !!c.title : !!c.textContent.trim(); }),
        tall: chips.every(function (c) { return c.getBoundingClientRect().height >= 32; }) };
    }) : [];
    var port = document.getElementById('set-pl-port'), pr = port ? port.getBoundingClientRect() : null;
    return { hs: hs, idx: hs.indexOf('내 모습'), rows: rows, mode: APP.sceneMode, setFn: typeof APP.scene.setPlayer, portFn: typeof APP.scene.playerPortrait, port: !!port, portW: pr ? Math.round(pr.width) : 0, portPx: port ? /pixelated|crisp-edges/.test(getComputedStyle(port).imageRendering) : false,
      note2d: !!document.getElementById('set-parts-note'), eyeNote: (document.getElementById('set-eye-note') || {}).textContent, emoji: /\p{Extended_Pictographic}/u.test(sec ? sec.parentNode.innerText : ''), look: APP.scene.player && APP.scene.player() ? APP.scene.player().look : undefined, saved: APP.state.settings.player };
  });
  console.log('   parts:', JSON.stringify({ idx: pp.idx, rows: pp.rows.map(function (r) { return r.lbl + ':' + r.n; }), mode: pp.mode, setFn: pp.setFn, portFn: pp.portFn, port: pp.port, saved: pp.saved }));
  var PARTS_CATS = 'hair,hairColor,eyes,eyeColor,outfit,shoes,acc', PARTS_LBL = '머리/머리 색/눈/눈 색/옷/신발/악세사리';
  ok(pp.idx === 1 && pp.rows.map(function (r) { return r.cat; }).join() === PARTS_CATS && pp.rows.map(function (r) { return r.lbl; }).join('/') === PARTS_LBL, "설정 › 내 모습: 문어 색 바로 아래 · 7줄 (머리 · 머리 색 · 눈 · 눈 색 · 옷 · 신발 · 악세사리) " + JSON.stringify(pp.rows.map(function (r) { return r.lbl; })));
  ok(pp.rows.length === 7 && pp.rows.every(function (r) { return r.n >= 4 && r.on === 1 && r.kind && r.named && r.tall; }), '내 모습: 줄마다 칩 4개 이상 · 켜진 칩 하나(aria-pressed) · 색은 .preset(aria-label·title 이름) · 나머지 .fchip 글자 · 보이는 높이 32px 이상 ' + JSON.stringify(pp.rows.map(function (r) { return [r.n, r.on, r.kind, r.named, r.tall]; })));
  ok(!pp.emoji && pp.saved && Object.keys(pp.saved).join() === PARTS_CATS && pp.saved.hair === 'bob' && pp.saved.acc === 'ribbon', '내 모습: 이모지 0 · settings.player 기본값 (단발 · 리본, 키 7개) ' + JSON.stringify(pp.saved));
  if (pp.mode === '3d') ok(pp.port === (pp.portFn === 'function') && (!pp.port || (pp.portW === 96 && pp.portPx)) && !pp.note2d, '내 모습 미리보기: 3D 에서 playerPortrait 가 있으면 96px pixelated 캔버스, 없으면 생략 (portFn ' + pp.portFn + ' · port ' + pp.port + ' ' + pp.portW + 'px)');
  else ok(!pp.port && pp.note2d, '내 모습 미리보기: 2D 장면에서는 캔버스 없이 한 줄 안내만');
  await page.click('#set-parts .set-part[data-part="hair"] .fchip[data-id="long"]');
  await page.click('#set-parts .set-part[data-part="eyeColor"] .preset[data-id="sea"]');
  await page.click('#set-parts .set-part[data-part="eyes"] .fchip[data-id="smile"]');
  var pc = await page.evaluate(function () {
    var on = function (cat) { var q = document.querySelector('#set-parts .set-part[data-part="' + cat + '"] [aria-pressed="true"]'); return q ? q.dataset.id : null; };
    var stored = JSON.parse(localStorage.getItem('ppolppol_v2')).settings.player, lk = (APP.scene.player && APP.scene.player()) ? APP.scene.player().look : undefined;
    return { saved: APP.state.settings.player, stored: stored, on: [on('hair'), on('eyeColor'), on('eyes'), on('hairColor')], ons: document.querySelectorAll('#set-parts [aria-pressed="true"]').length, look: lk, setFn: typeof APP.scene.setPlayer, eyeNote: document.getElementById('set-eye-note').textContent };
  });
  console.log('   parts click:', JSON.stringify(pc));
  ok(pc.saved.hair === 'long' && pc.saved.eyeColor === 'sea' && pc.saved.eyes === 'smile' && pc.saved.hairColor === 'blonde' && pc.stored && pc.stored.hair === 'long' && pc.stored.eyeColor === 'sea' && pc.stored.eyes === 'smile',
    '내 모습: 긴생머리 · 바다색 눈 · 웃는눈 칩 → settings.player 에 저장 (localStorage ppolppol_v2) · 안 누른 줄은 그대로');
  ok(pc.on.join() === 'long,sea,smile,blonde' && pc.ons === 7 && /눈 색이 안 보여/.test(pc.eyeNote), '내 모습: 누른 칩만 켜짐 (줄마다 하나, 전체 7) · 웃는눈이면 눈 색 안내 한 줄 ' + JSON.stringify(pc.on));
  if (pp.mode === '3d' && pc.setFn === 'function') ok(pc.look && pc.look.hair === 'long' && pc.look.eyeColor === 'sea' && pc.look.eyes === 'smile', '내 모습 (3D): scene.player().look 이 고른 대로 ' + JSON.stringify(pc.look));
  else console.log('   (skip) scene.setPlayer 없음 (' + pp.mode + ' · ' + pc.setFn + ') → look 검사 건너뜀');
  /* 새로고침 = 같은 저장소를 읽는 새 탭: 고른 모습이 그대로 · 장면도 그 모습으로 시작 (3D + player().look 이 있을 때) */
  var P2 = await s.ctx.newPage(); watchErrors(P2, s.bag);
  if (useStubs) { await P2.addInitScript({ path: path.join(ROOT, 'tools/stubs.js') }); if (haveReal) await P2.route(/\/js\/(world|brain)\.js$/, function (route) { return route.fulfill({ status: 200, contentType: 'application/javascript', body: '/* stubbed by tools/smoke.js */' }); }); }
  await P2.addInitScript({ content: "window.__ppolTest = { today: '" + DAY1 + "', forceKind: 'out' };" });
  await routeWiki(P2, 'ok'); await routeRepo(P2, O);
  await P2.goto(O + '/index.html?dev=0&slow=' + SPEED);
  await P2.waitForFunction(function () { return window.APP && APP.state.octopus.name === '뚜루'; }, null, { timeout: 20000 });
  await P2.click('#btn-settings'); await P2.waitForSelector('#settings-sheet[open]');
  var pr2 = await P2.evaluate(function () {
    var on = function (cat) { var q = document.querySelector('#set-parts .set-part[data-part="' + cat + '"] [aria-pressed="true"]'); return q ? q.dataset.id : null; };
    var lk = (APP.scene.player && APP.scene.player()) ? APP.scene.player().look : undefined;
    return { saved: APP.state.settings.player, on: [on('hair'), on('eyeColor'), on('eyes')], look: lk, mode: APP.sceneMode, setFn: typeof APP.scene.setPlayer };
  });
  await P2.close();
  console.log('   parts reload:', JSON.stringify(pr2));
  ok(pr2.saved.hair === 'long' && pr2.saved.eyeColor === 'sea' && pr2.saved.eyes === 'smile' && pr2.on.join() === 'long,sea,smile', '내 모습: 새로 연 탭에서도 고른 모습 그대로 (저장 · 칩 켜짐)');
  if (pr2.mode === '3d' && pr2.setFn === 'function') ok(pr2.look && pr2.look.hair === 'long' && pr2.look.eyes === 'smile', '내 모습 (3D): 새로 연 탭의 장면이 저장된 모습으로 시작 (opts.player) ' + JSON.stringify(pr2.look));
  await page.click('#set-parts .set-part[data-part="hair"] .fchip[data-id="bob"]');
  await page.click('#set-parts .set-part[data-part="eyeColor"] .preset[data-id="dark"]');
  await page.click('#set-parts .set-part[data-part="eyes"] .fchip[data-id="round"]');   /* 뒤 검사·스크린샷은 기본 모습으로 */

  ok(st.music && st.sfx, '설정: 소리 칸 (js/audio.js 가 붙인 음악 · 효과음 크기)');
  ok(st.motion && st.pixel && st.thumbs, '설정: 모션 · 픽셀 글꼴 · 포스터 썸네일');
  ok(st.stats === '산책 0 · 함께한 날 0 · 읽음 0' && st.data.join('/') === '내보내기/불러오기/전체 초기화' && st.dataH.every(function (x) { return x >= 44; }), '설정 › 기록: 작은 한 줄 + 내보내기 · 불러오기 · 전체 초기화 (보이는 높이 44px 넘음 ' + st.dataH.join('/') + ')');
  ok(/미리 만든 규칙/.test(st.who) && /고른 이는 포스터와 쪽지 뒷면/.test(st.who) && !/MCP|일기/.test(st.who) && !st.pal && st.focus === 'set-h' && !/방 보기/.test(st.text), "설정: '누가 고르나' 한 줄 (MCP 같은 말 없이 · 고른 이는 포스터·쪽지 뒷면) · 플레이어에겐 팔레트 없음 · 포커스는 시트 제목 · '방 보기' 없음");
  await page.click('#set-body .presets .preset[data-hex="#4a86d8"]');
  var c1 = await page.evaluate(function () { return { saved: APP.state.settings.octColor, on: (document.querySelector('#set-body .presets .preset.on') || {}).dataset, hue: +document.getElementById('set-hue').value, stored: JSON.parse(localStorage.getItem('ppolppol_v2')).settings.octColor }; });
  await page.evaluate(function () { var h = document.getElementById('set-hue'); h.value = '120'; h.dispatchEvent(new Event('input', { bubbles: true })); });
  var c2 = await page.evaluate(function () { return { saved: APP.state.settings.octColor, on: document.querySelectorAll('#set-body .presets .preset.on').length }; });   /* .presets = 문어 색 묶음만 (내 모습의 색 칩도 .preset) */
  ok(c1.saved === '#4a86d8' && c1.on && c1.on.hex === '#4a86d8' && c1.hue > 200 && c1.hue < 230 && c1.stored === '#4a86d8', '문어 색: 프리셋 파랑 → 저장 · 칩 켜짐 · 슬라이더도 파랑 (' + c1.hue + '°)');
  ok(/^#[0-9a-f]{6}$/.test(c2.saved) && c2.saved !== '#4a86d8' && c2.on === 0, '문어 색: 슬라이더 120° → 초록 계열로 저장 (' + c2.saved + ') · 프리셋 칩 꺼짐');
  await page.click('#set-body .presets .preset[data-hex="#e8463c"]');
  await page.click('#set-reset');
  var rz = await page.evaluate(function () { return { t: document.getElementById('set-reset').textContent, name: APP.state.octopus.name }; });
  ok(/정말/.test(rz.t) && rz.name === '뚜루', '전체 초기화는 2단계 (한 번 누르면 묻기만)');
  var wide = [];
  for (var w of [320, 360, 412]) {
    await page.setViewportSize({ width: w, height: 740 });
    for (var font of ['pixel', 'system']) {
      var r = await page.evaluate(function (font) { document.documentElement.setAttribute('data-font', font); var d = document.getElementById('settings-sheet'); return { sheet: d.scrollWidth - d.clientWidth, doc: document.documentElement.scrollWidth }; }, font);
      wide.push({ w: w, font: font, sheet: r.sheet, doc: r.doc });
      if (w === 320 && font === 'pixel') await page.screenshot({ path: path.join(SHOTS, 'settings-320.png') });
    }
  }
  await page.evaluate(function () { document.documentElement.setAttribute('data-font', 'pixel'); });
  await page.setViewportSize({ width: 360, height: 740 });
  var badW = wide.filter(function (x) { return x.sheet > 0 || x.doc > x.w; });
  ok(!badW.length, '설정 시트 320–412 px · 픽셀·시스템: 가로 넘침 없음' + (badW.length ? ' ✗ ' + JSON.stringify(badW) : ''));
  await page.keyboard.press('Escape'); await page.waitForSelector('#settings-sheet[open]', { state: 'hidden' });
  ok(await page.evaluate(function () { return document.activeElement && document.activeElement.id === 'btn-settings'; }), 'Esc 로 닫으면 포커스는 ⚙ 로');

  /* 3. 등불 · 데모를 누르면 작은 말풍선 (2.5 s · 다시 누르면 닫힘 · polite · 모션 줄이기면 그냥) · 폰 폭에선 첫 줄 = 방 제목 (상태 줄에서 숨긴 것)
        말풍선은 큰 버튼 위에 겹친다 → 말풍선을 누르면 말풍선만 닫히고 산책은 나가지 않는다 · 가로에서 띄운 뒤 세로로 돌려도 옆으로 밀리지 않는다 */
  function tipNow() { return page.evaluate(function () { var t = document.getElementById('tip'), r = t.getBoundingClientRect(), p = document.getElementById('pips').getBoundingClientRect(); return { text: t.textContent, head: (t.querySelector('.tip-head') || {}).textContent || '', line: (t.querySelector('.tip-line') || {}).textContent || '', room: document.getElementById('room-title').textContent, show: t.classList.contains('show'), role: t.getAttribute('role'), live: t.getAttribute('aria-live'), left: r.left, right: r.right, top: r.top, pb: p.bottom, vw: innerWidth, docW: document.documentElement.scrollWidth, exp: document.getElementById('pips').getAttribute('aria-expanded') }; }); }
  await page.click('#pips'); await page.waitForTimeout(300);
  var t1 = await tipNow();
  console.log('   tip:', JSON.stringify(t1));
  ok(t1.line === '초대한 날마다 한 칸 켜져' && t1.head === t1.room && t1.room.length > 0 && t1.show && t1.role === 'status' && t1.live === 'polite' && t1.exp === 'true', "등불 누름 → 말풍선 '" + t1.head + "' / '초대한 날마다 한 칸 켜져' (360 px: 첫 줄 방 제목 · role=status · polite)");
  ok(t1.left >= 15.5 && t1.right <= t1.vw - 15.5 && t1.top >= t1.pb - 0.5 && t1.docW <= t1.vw, '말풍선은 등불 아래 · 화면 안 16px 여백 · 가로 스크롤 없음');
  /* 다시 누르기는 페이지 안 한 틱에서 (느린 기계에서 page.click 이 2.5 s 를 넘겨 저절로 닫힌 뒤 다시 여는 일이 없게) */
  var t2 = await page.evaluate(function () { var t = document.getElementById('tip'), was = t.classList.contains('show'); document.getElementById('pips').click(); return { was: was, show: t.classList.contains('show'), text: t.textContent, exp: document.getElementById('pips').getAttribute('aria-expanded') }; });
  ok(t2.was && !t2.show && t2.text === '' && t2.exp === 'false', '같은 등불을 다시 누르면 닫힘');
  /* 저절로 닫히는 시각은 페이지 안에서 잰다 (부하에 상관없이) */
  var auto = await page.evaluate(function () { return new Promise(function (res) { var t = document.getElementById('tip'), t0 = performance.now(); document.getElementById('pips').click(); var at2 = null; setTimeout(function () { at2 = t.classList.contains('show'); }, 2000); var mo = new MutationObserver(function () { if (!t.classList.contains('show')) { mo.disconnect(); res({ ms: Math.round(performance.now() - t0), at2: at2 }); } }); mo.observe(t, { attributes: true, attributeFilter: ['class'] }); }); });
  ok(auto.at2 === true && auto.ms >= 2450 && auto.ms < 4500, '2.5 s 뒤 저절로 닫힘 (2 s 에는 아직 보임 · ' + auto.ms + ' ms)');
  /* 말풍선 자체를 누르면: 말풍선만 닫히고 아래 큰 버튼은 눌리지 않는다 (산책 안 나감) */
  await page.click('#pips'); await page.waitForTimeout(200);
  var tq = await page.evaluate(function () { var r = document.getElementById('tip').getBoundingClientRect(), g = document.getElementById('btn-go').getBoundingClientRect(), x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2); return { x: x, y: y, overGo: r.bottom > g.top && r.top < g.bottom, n: APP.state.trips.length }; });
  await page.mouse.click(tq.x, tq.y); await page.waitForTimeout(300);
  var tq2 = await page.evaluate(function () { return { n: APP.state.trips.length, away: document.getElementById('btn-go').classList.contains('away'), show: document.getElementById('tip').classList.contains('show') }; });
  ok(tq.overGo && tq2.n === tq.n && !tq2.away && !tq2.show, '큰 버튼 위에 겹친 말풍선을 누르면 말풍선만 닫힘 (산책 안 나감) ' + JSON.stringify({ overGo: tq.overGo, trips: tq.n + '→' + tq2.n, away: tq2.away }));
  /* 가로(740)에서 띄운 말풍선: 열린 채 세로로 돌리면 닫히고, 저절로 닫힌 뒤 돌려도 빈 말풍선이 화면 밖에 남지 않는다 */
  await page.setViewportSize({ width: 740, height: 360 }); await page.waitForTimeout(150);
  await page.click('#pips'); await page.waitForTimeout(150);
  await page.setViewportSize({ width: 360, height: 740 }); await page.waitForTimeout(200);
  var rot1 = await page.evaluate(function () { return { doc: document.documentElement.scrollWidth, show: document.getElementById('tip').classList.contains('show') }; });
  await page.setViewportSize({ width: 740, height: 360 }); await page.waitForTimeout(150);
  await page.evaluate(function () { document.getElementById('pips').click(); });
  await page.waitForFunction(function () { return !document.getElementById('tip').classList.contains('show'); }, null, { timeout: 6000 });
  await page.setViewportSize({ width: 360, height: 740 }); await page.waitForTimeout(200);
  var rot2 = await page.evaluate(function () { var t = document.getElementById('tip'), r = t.getBoundingClientRect(); return { doc: document.documentElement.scrollWidth, right: Math.round(r.right), left: t.style.left }; });
  ok(!rot1.show && rot1.doc <= 360 && rot2.doc <= 360 && rot2.right <= 360 && rot2.left === '', '가로에서 띄운 말풍선 → 세로로 돌려도 가로 스크롤 없음 (열린 채면 닫힘 · 닫힌 뒤엔 자리도 비움) ' + JSON.stringify({ rot1: rot1, rot2: rot2 }));
  await page.click('#brain-tag'); await page.waitForTimeout(50);
  var bt = await tipNow();
  ok(bt.show && bt.text === '지금은 모델이 아니라 미리 만든 규칙이 골라', "'데모' 누름 → 정직한 한 줄 (" + bt.text + ')');
  var hit = await page.evaluate(function () { function at(id, dy) { var r = document.getElementById(id).getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2 + dy); return !!(e && e.closest('#' + id)); } return { tag: at('brain-tag', -19) && at('brain-tag', 19), pips: at('pips', -19) && at('pips', 19) }; });
  ok(hit.tag && hit.pips, "'데모'·등불 누르는 곳 위아래 44px (보이는 크기는 그대로) " + JSON.stringify(hit));
  await page.mouse.click(180, 600);   /* 다른 곳을 누르면 닫힘 */
  ok(!(await tipNow()).show, '다른 곳을 누르면 말풍선 닫힘');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.click('#pips');
  var rm = await page.evaluate(function () { var cs = getComputedStyle(document.getElementById('tip')); return { op: cs.opacity, dur: cs.transitionDuration, tf: cs.transform }; });
  ok(rm.op === '1' && /^0s(, 0s)*$/.test(rm.dur) && rm.tf === 'none', '모션 줄이기: 말풍선이 움직임 없이 바로 ' + JSON.stringify(rm));
  await page.screenshot({ path: path.join(SHOTS, 'lantern-tip.png'), clip: { x: 0, y: 200, width: 360, height: 220 } });
  await page.mouse.click(180, 600); await page.emulateMedia({ reducedMotion: 'no-preference' });

  /* 4. 큰 버튼 건너뛰기: 나가 있는 동안 "다녀오는 중…" 글자만 (꺼지지 않음 · 44px · 기호 없음 — 주인 11-07) · 바로 한 번 더 톡은 무시 · 0.6 s 뒤(.can-skip) 누르면 바로 데려옴 */
  await page.dblclick('#btn-go');   /* 두 번 톡: 첫 톡이 초대, 바로 이은 둘째 톡(0.6 s 안)은 건너뛰기가 되면 안 된다 */
  var a0 = await page.evaluate(function () { var b = document.getElementById('btn-go'), r = b.getBoundingClientRect(); return { away: b.classList.contains('away'), dis: b.disabled, txt: b.textContent, h: r.height, w: r.width, label: b.getAttribute('aria-label'), skip: !!document.getElementById('btn-skip') }; });
  var g0 = await page.evaluate(function () { return { running: APP.state.trips.some(function (t) { return t.status === 'running'; }), away: document.getElementById('btn-go').classList.contains('away'), can: document.getElementById('btn-go').classList.contains('can-skip') }; });
  console.log('   away button:', JSON.stringify({ a0: a0, g0: g0 }));
  ok(a0.away && !a0.dis && /^다녀오는 중…/.test(a0.txt) && a0.h >= 44 && !a0.skip && /바로/.test(a0.label || ''), "나가 있는 동안 큰 버튼: '다녀오는 중…' · 꺼지지 않음 · 44px 넘음 · 따로 된 건너뛰기 없음");
  ok(g0.running && g0.away && !g0.can, '바로 한 번 더 톡 (0.6 s 안): 건너뛰지 않음 (두 번 톡 보호)');
  await page.waitForSelector('#btn-go.can-skip', { timeout: 5000 });
  var a1 = await page.evaluate(function () { var b = document.getElementById('btn-go'); return { txt: b.textContent, sk: !!b.querySelector('.go-skip, .emo, img'), sym: /[\u2190-\u21FF\u2300-\u23FF\u25A0-\u27BF\u2B00-\u2BFF\uFE0F]|[\uD83C-\uD83E][\uDC00-\uDFFF]/.test(b.textContent + (b.getAttribute('aria-label') || '')) }; });
  ok(a1.txt === '다녀오는 중…' && !a1.sk && !a1.sym, "0.6 s 뒤에도 '다녀오는 중…' 글자만 (⏩ 같은 기호 · 이모지 없음) " + JSON.stringify(a1.txt));
  /* 나가 있는 동안 등불 말풍선을 누르면 말풍선만 닫힌다 (아래 큰 버튼 = 건너뛰기가 눌리지 않는다) */
  await page.evaluate(function () { document.getElementById('pips').click(); });
  var tw = await page.evaluate(function () { var r = document.getElementById('tip').getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; });
  await page.mouse.click(tw.x, tw.y); await page.waitForTimeout(200);
  var tw2 = await page.evaluate(function () { return { away: document.getElementById('btn-go').classList.contains('away'), st: APP.state.trips[APP.state.trips.length - 1].status, show: document.getElementById('tip').classList.contains('show') }; });
  ok(tw2.away && tw2.st === 'running' && !tw2.show, '나가 있는 동안 말풍선을 눌러도 건너뛰지 않음 (말풍선만 닫힘) ' + JSON.stringify(tw2));
  await page.screenshot({ path: path.join(SHOTS, 'away-skip-button.png') });
  var tS = Date.now(); await page.click('#btn-go'); await waitIdle(page);
  var k1 = await page.evaluate(function () { var t = APP.state.trips[APP.state.trips.length - 1]; return { n: APP.state.trips.length, st: t.status, kind: t.kind, txt: document.getElementById('btn-go').textContent }; });
  ok(k1.n === 1 && k1.st === 'done' && k1.kind === 'out' && Date.now() - tS < 15000 && k1.txt === '뽈뽈 다녀와', "0.6 s 뒤 큰 버튼 → 바로 데려옴 (여행 1 · done · 버튼은 다시 '뽈뽈 다녀와' 글자만)");

  /* 5. 놀이방 (8물결): 산책 중 바깥이 보이는 동안 #btn-door = 장면 오른쪽 아래 픽셀 문 단추(data-spot edge) → 놀이방 → 오락기 → 달리기 창을 연 채로 산책이 끝까지 ·
        문 소리 훅 open · close (놀이방) · 잠들 때 반응 훅 (D-1) · 창을 닫으면 오락기로 포커스 · 놀이방 그대로 · 구석 쪽지 → 보러 가기 → 다락 (포커스는 다락 문) */
  await page.evaluate(function () { window.__aud.length = 0; });
  await page.click('#btn-go');
  await page.waitForFunction(function () { var d = document.getElementById('btn-door'); return APP.oct.state === 'away' && APP.scene.view() === 'exterior' && !d.hidden && d.dataset.spot === 'edge'; }, null, { timeout: 30000 });
  var r0 = await page.evaluate(function () { return document.querySelectorAll('#log .lrow').length; });
  var ed = await page.evaluate(function () { var d = document.getElementById('btn-door'), r = d.getBoundingClientRect(), sc = document.getElementById('scene').getBoundingClientRect(), q = d.querySelector('.door-box').getBoundingClientRect(); return { w: r.width, h: r.height, edge: sc.right - r.right < 8 && r.bottom <= sc.bottom + 0.5, box: q.width, img: d.querySelector('img.door-ico').naturalWidth === 16 }; });
  ok(ed.w >= 44 && ed.h >= 44 && ed.edge && ed.box >= 30 && ed.img, '산책 중 바깥이 보이는 동안: 놀이방 문은 장면 오른쪽 아래 픽셀 문 단추 (44px · 16×16 그림) ' + JSON.stringify(ed));
  var av = await page.evaluate(function () { var q = document.querySelector('#btn-door .door-box').getBoundingClientRect(); return { door: UIART.avoidCtl({ left: q.left - 100, right: q.left + 10, top: q.top + 2, bottom: q.bottom - 2 }, 4), clear: UIART.avoidCtl({ left: q.left - 120, right: q.left - 5, top: q.top, bottom: q.bottom }, 4) }; });
  ok(Math.round(av.door) === -14 && av.clear === 0, '말풍선 ↔ 바깥의 놀이방 문 단추: 겹치면 문 상자 왼쪽 4px 까지 비킴 ' + JSON.stringify(av));
  await page.click('#btn-door');
  await page.waitForFunction(function () { var m = document.getElementById('btn-machine'); return APP.scene.view() === 'play' && m && !m.hidden; }, null, { timeout: 20000 });
  var d0 = await page.evaluate(function () { return { running: APP.state.trips.some(function (t) { return t.status === 'running'; }), door: window.__aud.filter(function (a) { return a.n === 'door'; }).map(function (a) { return a.d.act + ':' + a.d.room; }), focus: document.activeElement && document.activeElement.id, place: APP.scene.place() }; });
  ok(d0.running && d0.door.join() === 'open:play,close:play' && d0.focus === 'btn-play-door' && d0.place === 'exterior', "산책 중 놀이방으로: 문 소리 훅 door { act: 'open' } → { act: 'close' } (room 'play') · 포커스는 놀이방 문 · 이야기 장소는 바깥 그대로 " + JSON.stringify(d0));
  await clickSpot(page, '#btn-machine');
  await page.waitForSelector('#runner-dlg[open]');
  ok(await page.evaluate(function () { return RUNNER.live() && RUNNER.live().state === 'ready'; }), '오락기 → 다락방 달리기 창 (준비)');
  await page.waitForFunction(function () { return APP.state.trips.every(function (t) { return t.status === 'done'; }) && !document.getElementById('btn-go').classList.contains('away'); }, null, { timeout: 120000 });
  await page.waitForTimeout(300);
  var d1 = await page.evaluate(function () {
    var t = APP.state.trips[APP.state.trips.length - 1], r = t.reaction !== undefined ? t.reaction : (t.receipt || {}).reaction, four = ['폴짝', '우쭐', '덤덤', '졸림'].indexOf(r) >= 0;
    var want = four ? r : (typeof t.reactionRaw === 'string' && t.reactionRaw.trim() ? t.reactionRaw : (typeof r === 'string' && r.trim() ? r : null));
    var sl = window.__aud.filter(function (a) { return a.n === 'state' && a.d.state === 'sleep'; });
    return { open: document.getElementById('runner-dlg').open, rows: document.querySelectorAll('#log .lrow').length, st: t.status, oct: APP.state.octopus.state, sleep: sl.length, has: sl.length ? sl[sl.length - 1].has : false, got: sl.length ? sl[sl.length - 1].d.reaction : undefined, want: want, view: APP.scene.view() };
  });
  console.log('   door walk:', JSON.stringify(Object.assign({ rows0: r0 }, d1)));
  ok(d1.open && d1.st === 'done' && d1.rows > r0 + 2 && d1.view === 'play', '달리기 창을 연 채로 산책이 끝까지 (로그 행 ' + r0 + ' → ' + d1.rows + ' · 창은 그대로 · 놀이방 그대로)');
  ok(d1.oct === 'sleep' && d1.sleep >= 1 && d1.has && d1.got === d1.want, "잠들 때 소리 훅 state { state: 'sleep', reaction: " + JSON.stringify(d1.got) + ' } = 이 차례의 반응');
  await page.screenshot({ path: path.join(SHOTS, 'runner-over-walk.png') });
  await page.keyboard.press('Escape'); await page.waitForSelector('#runner-dlg[open]', { state: 'hidden' });
  var d2 = await page.evaluate(function () { var n = document.getElementById('back-note'); return { focus: document.activeElement && document.activeElement.id, view: APP.scene.view(), note: !n.hidden, txt: document.getElementById('back-note-txt').textContent }; });
  ok(d2.focus === 'btn-machine' && d2.view === 'play', '달리기 창을 닫으면 포커스는 오락기로 · 놀이방 그대로 ' + JSON.stringify(d2));
  ok(d2.note && d2.txt === '뚜루가 돌아왔어.', "놀이방에 있는 동안 문어가 돌아옴 → 구석 쪽지 '뚜루가 돌아왔어.' " + JSON.stringify(d2.txt));
  await page.click('#btn-back-see');
  await page.waitForFunction(function () { return APP.scene.view() === 'attic' && !APP.scene.room() && document.activeElement && document.activeElement.id === 'btn-door'; }, null, { timeout: 20000 }).catch(function () {});
  var d3 = await page.evaluate(function () { return { view: APP.scene.view(), focus: document.activeElement && document.activeElement.id, note: !document.getElementById('back-note').hidden, door: window.__aud.filter(function (a) { return a.n === 'door'; }).length }; });
  ok(d3.view === 'attic' && d3.focus === 'btn-door' && !d3.note && d3.door === 4, '보러 가기 → 문으로 다락 (쪽지는 걷힘 · 포커스는 다락 문 · 문 소리 넷) ' + JSON.stringify(d3));

  /* 6. 자정 넘김: 1분 틱(여기선 화면 돌아옴)에 오늘 칸만 · 지난 날은 앨범 › 일기 (새 날 먼저 · 읽기만) · 문어의 요즘
     6a. 다른 탭(B): 자정 뒤 이 탭이 산책이 아닌 것(문어 색)을 저장하면 B 는 저장 이벤트로 다시 그리며 넘긴다 → 인사 · 어제 메모가 1분 틱으로 넘긴 이 탭과 같다
         (예전엔 renderLog 가 날짜만 넘기고 인사는 어제 것 · 어제 메모 없음, 그 뒤 1분 틱도 다시 넘기지 않았다) */
  var B = await s.ctx.newPage(); watchErrors(B, s.bag);
  if (useStubs) { await B.addInitScript({ path: path.join(ROOT, 'tools/stubs.js') }); if (haveReal) await B.route(/\/js\/(world|brain)\.js$/, function (route) { return route.fulfill({ status: 200, contentType: 'application/javascript', body: '/* stubbed by tools/smoke.js */' }); }); }
  await B.addInitScript({ content: "window.__ppolTest = { today: '" + DAY1 + "', forceKind: 'out' };" });
  await routeWiki(B, 'ok'); await routeRepo(B, O);
  await B.goto(O + '/index.html?dev=0&slow=' + SPEED);
  await B.waitForFunction(function () { return window.APP && APP.state.octopus.name === '뚜루' && document.querySelector('#log .lrow'); }, null, { timeout: 20000 });
  await B.evaluate(function (d) { window.__ppolTest.today = d; }, DAY2);
  await page.evaluate(function (d) { window.__ppolTest.today = d; APP.setOctColor('#f08a3c'); }, DAY2);
  await B.waitForFunction(function (d) { var x = document.querySelector('#log .lday'); return x && x.dataset.day === d; }, DAY2, { timeout: 5000 });
  var bRows = await B.evaluate(function () { return [].map.call(document.querySelectorAll('#log .lrow .ltool'), function (x) { return x.textContent; }); });
  await B.close();
  await page.evaluate(function (d) { window.__ppolTest.today = d; APP.state.trips.forEach(function (t) { if (t.endedAt) t.endedAt -= 180000; }); document.dispatchEvent(new Event('visibilitychange')); }, DAY2);
  var lg = await page.evaluate(function () { var secs = document.querySelectorAll('#log .lday'); return { days: [].map.call(secs, function (x) { return x.dataset.day; }), labels: [].map.call(document.querySelectorAll('#log .lrow .ltool'), function (x) { return x.textContent; }) }; });
  ok(lg.days.join() === DAY2 && lg.labels[0] === '오늘' && lg.labels.indexOf('기웃') < 0, '자정이 지나면 아래 로그는 새 날 칸만 (인사부터, 어제 산책 행 없음) ' + JSON.stringify(lg.labels));
  ok(bRows.join() === lg.labels.join() && bRows[1] === '어제 메모', '다른 탭이 자정 뒤에 저장해도(저장 이벤트로 다시 그림) 새 날 인사 · 어제 메모로 넘김 = 1분 틱으로 넘긴 탭과 같음 ' + JSON.stringify({ B: bRows, A: lg.labels }));
  await page.click('#btn-go'); await skipAway(page); await waitIdle(page);
  await page.evaluate(function (d) { window.__ppolTest.today = d; }, DAY3);
  await page.click('#btn-go');   /* 새 날 첫 초대가 오늘 칸을 넘긴다 (1분 틱을 기다리지 않고) */
  var lg3 = await page.evaluate(function () { return [].map.call(document.querySelectorAll('#log .lday'), function (x) { return x.dataset.day; }); });
  await skipAway(page); await waitIdle(page);
  ok(lg3.join() === DAY3, '새 날에 초대하면 그 자리에서 오늘 칸을 새로 (' + lg3.join() + ')');
  await openAlbum(page);
  await page.click('#album-sheet .fchip[data-f="diary"]');
  var di = await page.evaluate(function () {
    var dd = document.querySelectorAll('#album-diary details.dday'), open = document.querySelectorAll('#album-diary details.dday[open]');
    return { days: [].map.call(dd, function (d) { return d.dataset.day; }), sums: [].map.call(dd, function (d) { return d.querySelector('summary').textContent; }), open: [].map.call(open, function (d) { return d.dataset.day; }),
      rows: document.querySelectorAll('#album-diary .dday[open] .lrow').length, ctrls: document.querySelectorAll('#album-diary .dday-rows :is(button, input, select, textarea, a[href])').length,
      cards: !document.getElementById('album').hidden, notes: document.querySelectorAll('#album-notes .cnote').length, pressed: document.querySelector('.fchip[data-f="diary"]').getAttribute('aria-pressed') };
  });
  console.log('   diary:', JSON.stringify(di));
  ok(di.days.join() === [DAY2, DAY1].join() && /^어제 · 1건$/.test(di.sums[0]) && di.open.join() === DAY2 && di.rows >= 4, "앨범 › 일기: 지난 날만, 새 날 먼저 ('어제 · 1건' 펼침 · 행 " + di.rows + ')');
  ok(di.ctrls === 0 && !di.cards && di.notes === 0 && di.pressed === 'true', '일기 탭: 읽기만 (누를 것 없음) · 카드·메모는 숨김');
  await page.click('#album-diary details.dday[data-day="' + DAY1 + '"] summary');
  var d1rows = await page.evaluate(function (d) { return document.querySelectorAll('#album-diary details.dday[data-day="' + d + '"] .lrow').length; }, DAY1);
  ok(d1rows >= 8, '접힌 날을 펼치면 그날 행 (' + DAY1 + ': 산책 둘 · ' + d1rows + '행)');
  await page.setViewportSize({ width: 320, height: 740 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(SHOTS, 'album-diary-320.png') });
  var dw = await page.evaluate(function () { var d = document.getElementById('album-sheet'); return { sheet: d.scrollWidth - d.clientWidth, doc: document.documentElement.scrollWidth }; });
  ok(dw.sheet <= 0 && dw.doc <= 320, '320 px: 앨범 일기 가로 넘침 없음 ' + JSON.stringify(dw));
  await page.setViewportSize({ width: 360, height: 740 });
  await page.click('#album-sheet .fchip[data-f="all"]');
  var rc = await page.evaluate(function () {
    var box = document.getElementById('al-recent'), act = APP.state.curiosityNotes.filter(function (x) { return x.status === 'active'; }).length;
    return { h: (box.querySelector('h3') || {}).textContent, ps: [].map.call(box.querySelectorAll('p'), function (p) { return p.textContent; }), top: box.getBoundingClientRect().top < document.getElementById('album').getBoundingClientRect().top,
      next: document.querySelectorAll('#album-notes .cn-tag.next').length, want: Math.min(3, act), cards: document.querySelectorAll('#album .pcard').length };
  });
  console.log('   recent:', JSON.stringify(rc));
  ok(rc.h === '문어의 요즘' && rc.ps.length >= 1 && rc.ps.length <= 2 && rc.top, "앨범 맨 위 '문어의 요즘' 한두 줄 (" + rc.ps.join(' / ') + ')');
  ok(rc.next === rc.want && rc.cards === 4, "남긴 메모: '다음 산책에 같이 가' 표시 = active 최근 " + rc.want + '개 · 카드 4');
  await page.screenshot({ path: path.join(SHOTS, 'album-recent.png') });
  await closeAlbum(page);
  ok(!(await page.evaluate(function () { return document.body.innerText.indexOf('방 보기') >= 0; })), "끝까지 어디에도 '방 보기' 없음");
  reportErrors(s.bag, 'S');
  await s.ctx.close();
}
/* J. 8물결 놀이방 (카드 18 · 주인 11-07 "방 클릭하면 … 그 방문 앞으로 가면 끼익 열리면서 다른 방으로"): 플레이어 화면(가짜 http 호스트 + ?dev=0).
 *   다락 안 놀이방 문(#btn-door — 3D 문 위 투명 단추, 장면 안 · 44px 이상) → 문 소리 open 한 번 → 가로 전환(위아래 움직임 없음 · 정수 px) → 놀이방 ('문어 방' · '다락방 달리기' 단추) → close.
 *   오락기 → 달리기 창 → 닫으면 오락기로 포커스 · 놀이방 그대로 · 키보드 Tab/Enter 왕복 · 저장(S)은 놀이방에서 한 일로 1 바이트도 안 바뀐다.
 *   놀이방에서 큰 버튼 → 먼저 문으로 다락 → 출발. 산책 중 바깥의 문 단추 → 놀이방 → 로그 행은 계속 쌓이고 화면은 끌려 나가지 않는다 → 문어가 돌아오면 구석 쪽지 → 보러 가기 → 다락.
 *   두뇌 입력은 놀이방을 모른다. 모션 줄이기 = 미끄럼 없이 컷. 셰이더 프로그램 수는 두 번째 왕복 뒤 그대로. 새로고침 = 문어 방. 2D 폴백(?scene=2d) = 문 그림 + 컷 + 놀이방 그림 */
async function scenarioWave8(browser) {
  console.log('\n== J. 8물결: 다락 안 놀이방 문 · 진짜 놀이방 · 오락기 · 산책 중 놀이방 · 구석 쪽지 · 2D');
  var O = 'http://ppolppol.example', DAY1 = '2026-11-08', SPEED = 0.4;
  var SPY = "window.__ev = []; window.__plans = []; (function w() { if (window.AUDIO && !AUDIO.__spy8) { AUDIO.__spy8 = 1; var o = AUDIO.on; AUDIO.on = function (n, d) { if (n === 'door' || n === 'ceremony') window.__ev.push({ n: n, act: d && (d.act || d.kind), room: d && d.room, view: window.APP && APP.scene && APP.scene.view ? APP.scene.view() : '' }); return o.apply(this, arguments); }; } else if (!window.AUDIO) setTimeout(w, 5); })();" +
    " (function b() { if (window.BRAIN && !BRAIN.__spy8) { BRAIN.__spy8 = 1; var p = BRAIN.plan; BRAIN.plan = function (inp) { try { var c = Object.assign({}, inp); delete c.now; window.__plans.push(JSON.stringify(c)); } catch (e) {} return p.apply(this, arguments); }; } else if (!window.BRAIN) setTimeout(b, 5); })();";
  var s = await newPage(browser, 'ok', [{ content: "window.__ppolTest = window.__ppolTest || { today: '" + DAY1 + "', forceKind: 'out' };" }, { content: SPY }]);
  var page = s.page;
  await routeRepo(page, O);
  await page.route(O + '/api/**', function (route) { return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }); });
  await page.goto(O + '/index.html?dev=0&slow=' + SPEED);
  await page.waitForSelector('#name-dialog[open]', { timeout: 20000 });
  await page.fill('#name-in', '뚜루'); await page.click('#name-form button[type=submit]');
  await page.waitForSelector('#name-dialog[open]', { state: 'hidden' });
  await page.waitForTimeout(600);
  function spots() { return page.evaluate(function () {
    var sc = document.getElementById('scene').getBoundingClientRect(), ctl = document.getElementById('scene-ctl').getBoundingClientRect();
    function r(id) { var e = document.getElementById(id), q = e.getBoundingClientRect(); return { label: e.getAttribute('aria-label'), hidden: e.hidden, spot: e.dataset.spot || '', w: Math.round(q.width), h: Math.round(q.height), inside: q.left >= sc.left - 0.5 && q.right <= sc.right + 0.5 && q.top >= sc.top - 0.5 && q.bottom <= sc.bottom + 0.5, ctl: q.left < ctl.right && q.right > ctl.left && q.top < ctl.bottom && q.bottom > ctl.top, popup: e.getAttribute('aria-haspopup') }; }
    return { view: APP.scene.view(), room: APP.scene.room(), place: APP.scene.place(), door: r('btn-door'), pdoor: r('btn-play-door'), mach: r('btn-machine'), oct: getComputedStyle(document.getElementById('oct')).display !== 'none' && getComputedStyle(document.getElementById('oct')).visibility !== 'hidden',
      label: document.getElementById('scene').getAttribute('aria-label'), desc: document.getElementById('scene-desc').textContent, focus: document.activeElement && document.activeElement.id, programs: APP.scene.stats().programs };
  }); }
  function inPlay() { return page.waitForFunction(function () { var m = document.getElementById('btn-machine'); return APP.scene.view() === 'play' && APP.scene.room() === 'play' && m && !m.hidden && document.activeElement && document.activeElement.id === 'btn-play-door'; }, null, { timeout: 20000 }); }
  function inAttic() { return page.waitForFunction(function () { var d = document.getElementById('btn-door'); return APP.scene.view() !== 'play' && !APP.scene.room() && !d.hidden && document.activeElement && document.activeElement.id === 'btn-door'; }, null, { timeout: 20000 }); }
  /* 프레임마다 장면 움직임을 적는다 (가로 전환 · 한 프레임 한 장소 · 위아래 움직임 없음) */
  function watchMotion() { return page.evaluate(function () { window.__mo = []; (function f() { var m = APP.scene.motion(); window.__mo.push({ view: m.view, dq: m.dq, x: m.slidePx, up: m.slideUpPx, axis: m.transAxis, da: m.doorAttic, dp: m.doorPlay }); if (window.__mo.length < 400) window.__moRaf = requestAnimationFrame(f); })(); }); }
  function stopMotion() { return page.evaluate(function () { cancelAnimationFrame(window.__moRaf); return window.__mo; }); }

  /* 1. 다락: 문 단추는 3D 문 위 (장면 안 · 44px 이상 · 그 자리가 장면이 투영한 문 상자) */
  var a0 = await spots(), sp0 = await page.evaluate(function () { return APP.scene.spotRect('atticPlay'); });
  var S0 = await page.evaluate(function () { return localStorage.getItem('ppolppol_v2'); });
  console.log('   attic:', JSON.stringify({ door: a0.door, sp: sp0 && sp0.art, view: a0.view, programs: a0.programs }));
  ok(a0.view === 'attic' && a0.door.label === '놀이방' && !a0.door.hidden && a0.door.spot === 'over' && a0.door.w >= 44 && a0.door.h >= 44 && a0.door.inside && !a0.door.ctl && !a0.door.popup, "다락: 놀이방 문 단추 = 3D 문 위 투명 단추 (aria-label '놀이방' · 44px 이상 · 장면 안 · 오른쪽 위 묶음과 안 겹침)");
  ok(!!sp0 && sp0.mode === 'over' && sp0.art.r - sp0.art.l >= 8 && sp0.art.b - sp0.art.t >= 30 && a0.pdoor.hidden && a0.mach.hidden, '3D 문이 화면에 보인다 (투영 상자 ' + (sp0 ? (sp0.art.r - sp0.art.l) + '×' + (sp0.art.b - sp0.art.t) : '-') + ' px) · 놀이방 단추는 숨음');
  await page.locator('#scene').screenshot({ path: path.join(SHOTS, 'w8-attic-door.png') });

  /* 2. 문 톡 → 문 소리 open (다락이 보일 때) → 가로 전환 → 놀이방 → close */
  await page.evaluate(function () { window.__ev.length = 0; });
  await watchMotion();
  await clickSpot(page, '#btn-door');
  await inPlay();
  var mo = await stopMotion(), p1 = await spots();
  var ev1 = await page.evaluate(function () { return window.__ev.filter(function (e) { return e.n === 'door'; }); });
  var slid = mo.filter(function (m) { return m.x; }), views = mo.map(function (m) { return m.view; }).filter(function (v, i, a) { return i === 0 || a[i - 1] !== v; });
  console.log('   enter:', JSON.stringify({ ev: ev1, frames: mo.length, slid: slid.length, xs: slid.map(function (m) { return m.x; }).slice(0, 12), views: views, door: mo.map(function (m) { return m.da; }).filter(function (v, i, a) { return i === 0 || a[i - 1] !== v; }) }));
  ok(ev1.length === 2 && ev1[0].act === 'open' && ev1[0].room === 'play' && ev1[0].view === 'attic' && ev1[1].act === 'close' && ev1[1].view === 'play', "문 소리 훅: 다락이 보일 때 door { act: 'open', room: 'play' } 한 번 → 놀이방에서 { act: 'close' } 한 번 " + JSON.stringify(ev1.map(function (e) { return e.act + '@' + e.view; })));
  ok(mo.every(function (m) { return !m.up; }) && slid.every(function (m) { return m.axis === 'x' && Math.round(m.x) === m.x; }) && views.join('>') === 'attic>play', '전환: 가로로만 (위아래 0 · 정수 px) · 다락 → 놀이방 한 번 바뀜 (한 프레임엔 한 장소) ' + views.join('>'));
  ok(p1.view === 'play' && p1.room === 'play' && p1.place === 'attic' && p1.door.hidden && !p1.pdoor.hidden && !p1.mach.hidden && p1.pdoor.label === '문어 방' && p1.mach.label === '다락방 달리기' && p1.mach.popup === 'dialog'
    && [p1.pdoor, p1.mach].every(function (b) { return b.spot === 'over' && b.w >= 44 && b.h >= 44 && b.inside && !b.ctl; }), "놀이방: '문어 방' 문 · '다락방 달리기' 오락기 단추 (44px 이상 · 장면 안) · 다락 문 단추는 숨음 · 이야기 장소는 다락 그대로");
  ok(!p1.oct && p1.label === '놀이방' && /^놀이방/.test(p1.desc) && /다락방에 있어/.test(p1.desc) && p1.focus === 'btn-play-door', '놀이방엔 문어가 없다 (이름표 · 말풍선 숨김) · 장면 이름 · 설명 · 포커스는 놀이방 문 ' + JSON.stringify(p1.desc));
  await page.locator('#scene').screenshot({ path: path.join(SHOTS, 'w8-play.png') });

  /* 3. 오락기 → 달리기 창 → 한 판 → 닫으면 오락기로 포커스 · 놀이방 그대로 · 저장(S) 그대로 */
  await clickSpot(page, '#btn-machine'); await page.waitForSelector('#runner-dlg[open]');
  await page.focus('#rn-cv'); await page.keyboard.press(' '); await page.waitForTimeout(600); await page.keyboard.press(' ');
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape'); await page.waitForSelector('#runner-dlg[open]', { state: 'hidden' });
  var p2 = await spots(), S1 = await page.evaluate(function () { return { s: localStorage.getItem('ppolppol_v2'), r: !!localStorage.getItem('ppolppol_runner') }; });
  ok(p2.focus === 'btn-machine' && p2.view === 'play' && !p2.mach.hidden, '달리기 창을 닫으면 포커스는 오락기 · 놀이방 그대로');
  ok(S1.s === S0 && S1.r, '놀이방에서 한 일(문 · 오락기 · 달리기 한 판)은 문어 저장(ppolppol_v2)을 한 바이트도 바꾸지 않는다 (달리기는 제 열쇠만)');

  /* 4. 키보드 왕복: Shift+Tab → 놀이방 문 · Enter → 다락 (포커스 다락 문) · Enter → 놀이방 (포커스 놀이방 문) · 셰이더 프로그램 수 그대로 */
  await page.keyboard.press('Shift+Tab'); var kf = await page.evaluate(function () { return document.activeElement && document.activeElement.id; });
  await page.keyboard.press('Enter'); await inAttic();
  var k1 = await spots();
  await page.keyboard.press('Enter'); await inPlay();
  await page.keyboard.press('Enter'); await inAttic();
  var k2 = await spots();
  ok(kf === 'btn-play-door' && k1.view === 'attic' && k1.focus === 'btn-door' && k2.focus === 'btn-door' && k1.oct, '키보드: Tab 으로 놀이방 문 · Enter 로 다락 (포커스는 다락 문) · Enter 로 다시 놀이방 · 다락에선 문어가 다시 보인다');
  ok(k2.programs === k1.programs && k1.programs === p1.programs, '셰이더 프로그램 수: 첫 방문 ' + p1.programs + ' → 왕복 뒤 ' + k1.programs + ' → 두 번째 왕복 뒤 ' + k2.programs);
  ok((await page.evaluate(function () { return localStorage.getItem('ppolppol_v2'); })) === S0, '문 왕복 세 번 뒤에도 문어 저장 그대로');

  /* 5. 놀이방에서 큰 버튼 (뽈뽈 다녀와): 먼저 문으로 다락 → 그다음 출발 (출발 의식은 다락에서 보인다) */
  await page.keyboard.press('Enter'); await inPlay();
  await page.evaluate(function () { window.__ev.length = 0; });
  await page.click('#btn-go');
  await page.waitForFunction(function () { return document.getElementById('btn-go').classList.contains('away'); }, null, { timeout: 20000 });
  var g1 = await page.evaluate(function () { return { ev: window.__ev.map(function (e) { return e.n + ':' + e.act + '@' + e.view; }), view: APP.scene.view(), room: APP.scene.room() }; });
  ok(g1.ev.slice(0, 2).join() === 'door:open@play,door:close@attic' && !g1.room && g1.view !== 'play', '놀이방에서 큰 버튼 → 먼저 문으로 다락 (문 소리 open · close) → 출발 ' + JSON.stringify(g1.ev));

  /* 6. 산책 중: 바깥이 보이는 동안 문 단추(오른쪽 아래) → 놀이방. 로그 행이 쌓이고, 화면은 끌려 나가지 않는다 → 문어가 돌아오면 구석 쪽지 */
  await page.waitForFunction(function () { var d = document.getElementById('btn-door'); return APP.scene.view() === 'exterior' && !d.hidden && d.dataset.spot === 'edge'; }, null, { timeout: 30000 });
  var e0 = await spots();
  ok(e0.door.spot === 'edge' && e0.door.w >= 44 && e0.door.h >= 44 && e0.door.inside && !e0.door.ctl, '산책 중 바깥: 놀이방 문 단추는 장면 오른쪽 아래 (44px · 오른쪽 위 묶음과 안 겹침)');
  await page.locator('#scene').screenshot({ path: path.join(SHOTS, 'w8-exterior-door.png') });
  await page.click('#btn-door'); await inPlay();
  var w0 = await page.evaluate(function () {
    window.__left = []; window.__inPlay = true;
    (function f() { if (!window.__inPlay) return; var v = APP.scene.view(); if (v !== 'play') window.__left.push(v); requestAnimationFrame(f); })();
    return { rows: document.querySelectorAll('#log .lrow').length, place: APP.scene.place(), running: APP.state.trips.some(function (t) { return t.status === 'running'; }) };
  });
  await page.waitForFunction(function () { return !document.getElementById('back-note').hidden && document.getElementById('back-note-txt').textContent; }, null, { timeout: 90000 });
  var w1 = await page.evaluate(function () {
    var n = document.getElementById('back-note'), b = document.getElementById('btn-back-see').getBoundingClientRect(), sc = document.getElementById('scene').getBoundingClientRect(), ctl = document.getElementById('scene-ctl').getBoundingClientRect(), q = n.getBoundingClientRect();
    return { rows: document.querySelectorAll('#log .lrow').length, place: APP.scene.place(), view: APP.scene.view(), left: window.__left.slice(), txt: document.getElementById('back-note-txt').textContent, role: document.getElementById('back-note-txt').getAttribute('role'), btn: { t: document.getElementById('btn-back-see').textContent, w: Math.round(b.width), h: Math.round(b.height) },
      inside: q.left >= sc.left && q.right <= sc.right && q.bottom <= sc.bottom + 0.5, ctl: q.left < ctl.right && q.right > ctl.left && q.top < ctl.bottom && q.bottom > ctl.top, oct: getComputedStyle(document.getElementById('oct')).display, bub: !document.getElementById('oct-bubble').hidden && getComputedStyle(document.getElementById('oct')).display !== 'none' };
  });
  console.log('   in play during walk:', JSON.stringify({ w0: w0, w1: w1 }));
  ok(w0.running && w0.place === 'exterior' && w1.rows > w0.rows && w1.place === 'attic' && w1.view === 'play' && !w1.left.length, '산책은 놀이방에서도 그대로 (로그 행 ' + w0.rows + ' → ' + w1.rows + ' · 이야기 장소 바깥 → 다락) · 화면은 한 번도 놀이방을 떠나지 않음');
  ok(w1.txt === '뚜루가 돌아왔어.' && w1.role === 'status' && w1.btn.t === '보러 가기' && w1.btn.h >= 44 && w1.btn.w >= 44 && w1.inside && !w1.ctl && !w1.bub, "구석 쪽지: '뚜루가 돌아왔어.' (조사 · 기호 없음 · role=status) + '보러 가기' (44px) · 장면 안 · 오른쪽 위 묶음과 안 겹침 · 문어 말풍선은 놀이방에 안 뜬다");
  await page.locator('#scene').screenshot({ path: path.join(SHOTS, 'w8-note.png') });
  var plans = await page.evaluate(function () { return window.__plans.slice(); });
  var KEYS = 'by,dateKey,hint,id,name,online,seed,seq,state', SKEYS = ['affinity', 'lantern', 'lanternLeft', 'lastVisit', 'notes', 'owned', 'posters', 'recent', 'todayOut', 'visits'];
  var pOk = plans.length >= 1 && plans.every(function (j) { var o = JSON.parse(j); return Object.keys(o).sort().join() === KEYS && Object.keys(o.state).every(function (k) { return SKEYS.indexOf(k) >= 0; }) && !/runner|play|놀이방|오락기|달리기/.test(j); });
  ok(pOk, '두뇌 입력은 놀이방을 모른다 (알던 칸만 · 달리기 · 놀이방 낱말 0) — 두뇌 호출 ' + plans.length + '번');
  await page.click('#btn-back-see');
  await inAttic();
  await page.evaluate(function () { window.__inPlay = false; });
  var w2 = await spots(), n2 = await page.evaluate(function () { return !document.getElementById('back-note').hidden; });
  ok(w2.view === 'attic' && w2.oct && !n2 && w2.focus === 'btn-door', '보러 가기 → 문으로 다락 (쪽지는 걷힘 · 문어가 보인다 · 포커스는 다락 문)');
  await page.waitForFunction(function () { return !document.getElementById('btn-go').classList.contains('away'); }, null, { timeout: 60000 });

  /* 7. 모션 줄이기: 열린 문 한 장 → 컷 (미끄럼 없음) · 문 소리 open · close 는 그대로 */
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.waitForTimeout(200);
  await page.evaluate(function () { window.__ev.length = 0; });
  await watchMotion();
  await clickSpot(page, '#btn-door'); await inPlay();
  var rm = await stopMotion(), rev = await page.evaluate(function () { return window.__ev.filter(function (e) { return e.n === 'door'; }).map(function (e) { return e.act; }); });
  ok(rm.every(function (m) { return !m.x && !m.up; }) && rm.some(function (m) { return m.da === 4; }) && rev.join() === 'open,close', '모션 줄이기: 미끄럼 없이 컷 · 열린 문 한 장 · 문 소리 open · close ' + JSON.stringify({ frames: rm.length, door: rm.map(function (m) { return m.da; }).filter(function (v, i, a) { return i === 0 || a[i - 1] !== v; }) }));
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  /* 8. 새로고침 = 늘 문어 방 (지금 방은 저장하지 않는다) */
  await page.reload();
  await page.waitForFunction(function () { return window.APP && APP.scene && typeof APP.scene.view === 'function' && !document.getElementById('btn-door').hidden; }, null, { timeout: 20000 });
  var rl = await spots();
  ok(rl.view === 'attic' && !rl.room && rl.door.spot === 'over' && rl.pdoor.hidden && rl.mach.hidden && !(await page.evaluate(function () { return APP.scene.stats().playBuilt; })), '새로고침 → 문어 방 (놀이방은 들어가기 전까지 짓지 않는다)');

  /* 8b. 놀이방에서 '다녀오는 중…' (데려오기) 을 눌렀는데 문을 지나는 사이 산책이 끝나면: 새 산책이 되지 않는다 (누른 그때의 뜻 = 데려오기) */
  await page.click('#btn-go');
  await page.waitForFunction(function () { var d = document.getElementById('btn-door'); return APP.scene.view() === 'exterior' && !d.hidden && d.dataset.spot === 'edge'; }, null, { timeout: 30000 });
  await page.click('#btn-door'); await inPlay();
  await page.waitForFunction(function () { return document.getElementById('btn-go').classList.contains('can-skip'); }, null, { timeout: 20000 });
  var r8 = await page.evaluate(function () { var n0 = APP.state.trips.length; document.getElementById('btn-go').click(); APP.skip(); return n0; });   /* 큰 버튼 → 문이 열리기 시작 · 그사이 산책이 끝난다 */
  await page.waitForFunction(function () { return !APP.scene.room() && APP.scene.view() !== 'play'; }, null, { timeout: 20000 });
  await page.waitForTimeout(2500);
  var r8b = await page.evaluate(function () { return { n: APP.state.trips.length, running: APP.state.trips.filter(function (t) { return t.status === 'running'; }).length, away: document.getElementById('btn-go').classList.contains('away') }; });
  ok(r8b.n === r8 && !r8b.running && !r8b.away, "놀이방에서 '다녀오는 중…' 을 눌렀는데 문을 지나는 사이 산책이 끝나면 새 산책이 되지 않는다 " + JSON.stringify({ before: r8, after: r8b }));
  reportErrors(s.bag, 'J');
  await s.ctx.close();

  /* 9. 2D 폴백 (?scene=2d): 다락 문 그림 위 단추 → 컷 → 놀이방 그림 (오락기 · 문) → 달리기 → 문어 방 */
  var s2 = await newPage(browser, 'ok', [{ content: "window.__ppolTest = { today: '" + DAY1 + "' };" }, { content: SPY }]);
  var p = s2.page;
  await routeRepo(p, O);
  await p.addInitScript({ content: "try { if (!localStorage.getItem('ppolppol_v2')) localStorage.setItem('ppolppol_v2', JSON.stringify({ v: 2, octopus: { name: '안개' } })); } catch (e) {}" });
  await p.goto(O + '/index.html?dev=0&scene=2d');
  await p.waitForFunction(function () { return window.APP && APP.sceneMode === '2d' && !document.getElementById('btn-door').hidden; }, null, { timeout: 20000 });
  await p.waitForTimeout(500);
  var t0 = await p.evaluate(function () { var d = document.getElementById('btn-door').getBoundingClientRect(), L = document.querySelector('#layers .layer[data-key="door.play"]'), q = L && L.getBoundingClientRect(); return { w: d.width, h: d.height, spot: document.getElementById('btn-door').dataset.spot, drawn: !!q && d.left <= q.left + 1 && d.right >= q.right - 1 && d.top <= q.top + 1 && d.bottom >= q.bottom - 1 }; });
  ok(t0.spot === 'over' && t0.w >= 44 && t0.h >= 44 && t0.drawn, '2D: 다락 벽에 놀이방 문 그림 · 그 위 단추 (44px 이상) ' + JSON.stringify(t0));
  /* 2D 문어가 문 앞(가운데 · 상자 자리)에 서 있으면 그 몸을 누른 톡은 문어 몫 (문 단추는 그림 위에서 pointer-events: none · 그린 순서대로) */
  for (var an of ['center', 'crate']) {
    await p.evaluate(function (a) { APP.scene.jumpTo(a); window.__ev.length = 0; }, an); await p.waitForTimeout(300);
    var oc = await p.evaluate(function () { var r = document.getElementById('oct').getBoundingClientRect(), x = r.left + r.width * 0.62, y = r.top + r.height * 0.55, e = document.elementFromPoint(x, y); return { x: x, y: y, oct: !!(e && e.closest('#oct')) }; });
    await p.mouse.click(oc.x, oc.y); await p.waitForTimeout(500);
    var oc2 = await p.evaluate(function () { return { view: APP.scene.view(), door: window.__ev.filter(function (e) { return e.n === 'door'; }).length }; });
    ok(oc.oct && oc2.view === 'attic' && !oc2.door, '2D: 문 앞(' + an + ')의 문어를 누르면 문어 (맨 위 요소 #oct · 놀이방으로 가지 않음) ' + JSON.stringify({ top: oc.oct, after: oc2 }));
  }
  await p.evaluate(function () { APP.scene.jumpTo('window'); window.__ev.length = 0; }); await p.waitForTimeout(300);
  await clickSpot(p, '#btn-door');
  await p.waitForFunction(function () { return APP.scene.view() === 'play' && !document.getElementById('btn-machine').hidden && document.activeElement && document.activeElement.id === 'btn-play-door'; }, null, { timeout: 5000 });
  var t1 = await p.evaluate(function () { var pl = document.getElementById('play2d'); return { bg: !!pl && !pl.hidden && !!pl.querySelector('svg'), layers: getComputedStyle(document.getElementById('layers')).visibility, oct: getComputedStyle(document.getElementById('oct')).visibility, ev: window.__ev.filter(function (e) { return e.n === 'door'; }).map(function (e) { return e.act + ':' + e.room; }), mach: document.getElementById('btn-machine').getBoundingClientRect().height }; });
  ok(t1.bg && t1.layers === 'hidden' && t1.oct === 'hidden' && t1.ev.join() === 'open:play,close:play' && t1.mach >= 44, '2D: 컷으로 놀이방 그림 (다락 그림 · 문어 숨김) · 문 소리 open · close · 오락기 단추 ' + JSON.stringify(t1));
  await p.locator('#scene').screenshot({ path: path.join(SHOTS, 'w8-2d-play.png') });
  await clickSpot(p, '#btn-machine'); await p.waitForSelector('#runner-dlg[open]');
  await p.keyboard.press('Escape'); await p.waitForSelector('#runner-dlg[open]', { state: 'hidden' });
  ok(await p.evaluate(function () { return document.activeElement && document.activeElement.id === 'btn-machine' && APP.scene.view() === 'play'; }), '2D: 오락기 → 달리기 → 닫으면 오락기로 포커스 · 놀이방 그대로');
  await clickSpot(p, '#btn-play-door');
  await p.waitForFunction(function () { return APP.scene.view() === 'attic' && !document.getElementById('btn-door').hidden && document.activeElement && document.activeElement.id === 'btn-door'; }, null, { timeout: 5000 });
  ok(await p.evaluate(function () { return getComputedStyle(document.getElementById('layers')).visibility === 'visible' && document.getElementById('play2d').hidden; }), '2D: 문어 방으로 (다락 그림이 다시 · 포커스는 다락 문)');
  reportErrors(s2.bag, 'J 2D');
  await s2.ctx.close();
}
/* U. 플레이어 화면 글자 지킴이 (주인 11-07: "개발자용이 아니라 실 사용자한테 바로 배포할 거라고 생각하고 이모티콘 같은 건 다 빼").
 *   플레이어 화면(가짜 http 호스트 + ?dev=0)을 상태마다 돌며 — 입장 · 이름 창 · 첫 인사 · 등불/데모 말풍선 · 설정 · 나가 있는 중(말풍선) · 산책 뒤 로그(읽음 · 책장 · 모의 · 못 읽음 · 앉아만) ·
 *   잠 · 포스터 앞면/열람 기록/일기(외출 · 집 · 모델) · 복사 토스트 · 앨범 칩 넷(전체 · 포스터 · 쪽지 · 일기, 날 펼치기) · 놀이방 문 → 놀이방(문 · 오락기 포커스) → 달리기(준비 · 달리는 중 · 끝 · 랭킹) ·
 *   산책 중 바깥의 놀이방 문 단추 · 산책 중 놀이방 · 구석 쪽지(두 테마) · 2D 장면(기념품 그림 실패 · 기념품 누름 · 2D 놀이방) —
 *   보이는 글자 노드 · aria-label · title · placeholder · alt · SVG 글자 · ::before/::after content · 목록 표시(::marker) 에 이모지나 허용 목록 밖 기호가 있으면 실패. 두 글꼴 테마(픽셀 · 시스템) 다.
 *   허용: 한글 · ASCII · 공백 · 문장부호 · … ‘ ’ “ ” — – (~ ! ? : ( ) / % + 는 ASCII). 그 밖(✅ 📚 🎉 💤 ▲ ✕ ↗ → ● ♡ …)은 실패.
 *   빼는 것: 개발용(#demo · #hint-box)과 [data-raw] 표시가 붙은 칸(속성만이면 data-raw-attr) — 모델이 쓴 말 · 위키백과 글 · 사람이 쓴 이름(랭킹 닉네임)은 바이트 그대로 보여야 해서 (docs/MODEL_VOICE.md).
 *   그 대신 data-raw 칸은 원문만이어야 한다: 안에 요소가 없고 글자가 기록(APP.state)의 원문 · 넣은 닉네임의 한 조각 (우리 문구가 숨어 들어가면 실패). data-raw-attr 속성은 원문을 지운 나머지를 검사.
 *   그래서 이 시나리오는 일부러 이모지가 든 모델 말 · 위키 요약 · 닉네임 · 기호가 든 위키 제목 · 모델이 고른 이름 · 옛 기록 제목을 넣고, 그 글이 그대로(data-raw 안에) 보이는지도 본다.
 *   ASCII 도 허용 목록만 (영숫자 . , ! ? : ; ' " ( ) / % + ~ - 와 '#숫자'): '* … >>' · '…zZ' · '^^' 같은 글자 꾸밈도 실패. 목록 기호(::marker)는 숫자 차례만.
 *   더 지나는 상태: 설정 초기화 한 번 · 내보내기 · 불러오기 실패/성공 · 모델의 집에 있는 날(줄 없는 반응) · 빈 차례 · 저장 실패 · 달리기 쉬는 중 · 올리기 실패/이미 올림/됨 ·
 *   2D 문어 톡(깨어 · 잠) · 쓰다듬기 · 창문 · 오프라인 산책 · 아이콘 404(스티커 깨진 그림 없음) · 옛 기록(v1) · 깨진 기록 · 저장소 막힘. 로그를 조금 올리면 끌어내리지 않는지도.
 *   잠깐 보였다 사라지는 것(말풍선 · 토스트 · 타자 행)과 보이는 동안 바뀐 속성(aria-label · title …)은 문서 전체 MutationObserver 가 바뀌는 순간마다 같은 검사를 한다 */
function glyphGuardInit() {
  /* 허용 글자: 공백 · 한글 · 영숫자 · 문장부호 . , ! ? : ; ' " ( ) / % + ~ - · … ‘ ’ “ ” — –. '#' 은 바로 뒤에 숫자가 올 때만 (공유 한 줄 '뽈뽈 #3').
     그 밖의 ASCII(* > < ^ = _ | [ ] { } @ $ & ` \)도 장식으로 본다 (예: '* 뽈뽈 다녀와 >>'). 글자 이모티콘('…zZ' · '^^' · '<3' · ':)')도 실패 */
  var BAD = /[^\sA-Za-z0-9.,!?:;'"()\/%+~\-ᄀ-ᇿ㄰-㆏가-힣·…‘’“”—–]/gu;
  var EMOTE = /zZ|Zz|\^\^|<3|[:;]-?[()]|T_T|>_</g;
  function badOf(text) { var s = String(text == null ? '' : text).replace(/#(?=\d)/g, ''); return (s.match(BAD) || []).concat(s.match(EMOTE) || []); }
  var SKIP = 'script, style, noscript, template, #demo, #hint-box, [data-raw]';
  var ATTRS = ['aria-label', 'title', 'placeholder', 'alt', 'aria-valuetext', 'aria-roledescription', 'data-share'];
  /* 목록 표시(::marker): 숫자 · 글자 차례만 (순위 1 2 3). 점 · 동그라미 · 펼침 세모 · 글자 목록 기호('★ ')는 실패 */
  var MARK_OK = /^(none|decimal|decimal-leading-zero|lower-alpha|upper-alpha|lower-latin|upper-latin|lower-roman|upper-roman|hangul|hangul-consonant|korean-hangul-formal|korean-hanja-informal|korean-hanja-formal)$/;
  function where(el) {
    var cn = typeof el.className === 'string' ? el.className : (el.className && el.className.baseVal) || '';
    var s = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (cn.trim() ? '.' + cn.trim().split(/\s+/).slice(0, 2).join('.') : '');
    var p = el.parentElement, k = 0; while (p && !p.id && k < 6) { p = p.parentElement; k++; }
    return (p && p.id ? '#' + p.id + ' ' : '') + s;
  }
  function push(out, seen, kind, el, chars, text) {
    var key = kind + '|' + where(el) + '|' + text; if (seen[key]) return; seen[key] = 1;
    out.push({ kind: kind, at: where(el), chars: chars, text: String(text).replace(/\s+/g, ' ').slice(0, 70) });
  }
  function check(out, seen, kind, el, text) {
    var m = badOf(text); if (!m.length) return;
    push(out, seen, kind, el, Array.from(new Set(m)).join(''), text);
  }
  function textsIn(root, out, seen) {
    if (root.nodeType === 3) { var pe = root.parentElement; if (pe && !pe.closest(SKIP)) check(out, seen, 'text', pe, root.nodeValue); return; }
    if (root.nodeType !== 1 || root.closest(SKIP)) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), n;
    while ((n = w.nextNode())) { var p = n.parentElement; if (p && !p.closest(SKIP)) check(out, seen, 'text', p, n.nodeValue); }
  }
  /* 남의 글(data-raw) 칸은 원문 그대로만: 안에 요소가 없고, 글자가 기록에 있는 원문(모델 · 사람이 쓴 말 · 위키 글 · 위키 / 모델이 준 정류장 이름 · 옛 제목 ·
     시나리오가 넣은 닉네임)의 한 조각이어야 한다 (줄인 것은 끝 '…' 를 빼고). 우리 문구가 data-raw 안에 숨어 검사를 피하지 못하게 (예: 출처 링크의 ' · ' 와 라이선스).
     속성만 남의 글(data-raw-attr)이면 그 속성에서 원문을 지운 나머지를 검사한다 */
  var extra = [];
  function sources() {
    var out = extra.slice(), S = window.APP && APP.state, N = (window.WORLD && WORLD.nodes) || {};
    function add(v) { if (typeof v === 'string' && v.trim()) out.push(v); }
    function room(id) { return !!(id && N[id]); }
    if (!S) return out;
    (S.trips || []).forEach(function (t) {
      var given = t.by === 'mcp' || t.by === 'human', r = t.receipt || {};
      (r.stops || []).forEach(function (s) { if (!room(s.nodeId)) { add(s.name); add(s.title); } if (s.source) add(s.source.extract); if (s.noteBy || s.status === 'read') add(s.note); if (given) add(s.bridge); });
      (t.events || []).forEach(function (e) {
        var tg = e.target || {};
        if (!room(tg.id)) { add(tg.title); add(tg.url); }
        if (e.noteBy || e.status === 'read') add(e.note);
        if (e.source) add(e.source.extract);
        add(e.hint);
        if (given) { add(e.aside); add(e.line); add(e.bridge); add(e.detail); add(e.reaction); if (e.note && typeof e.note === 'object') add(e.note.text); }
      });
      if (t.hint) add(t.hint.raw);
      if (given) {
        add(t.reactionRaw); add(t.reactionLine);
        if (r.activity) { add(r.activity.line); add(r.activity.detail); }
        if (t.poster) { add(t.poster.line); add(t.poster.detail); add(t.poster.title); }
        if (t.memo && t.memo.notes) Object.keys(t.memo.notes).forEach(function (k) { add(t.memo.notes[k]); });
      }
      if (t.by === 'legacy' && t.poster) add(t.poster.title);
    });
    (S.curiosityNotes || []).forEach(function (n) { if (n.by === 'model' || n.by === 'human') add(n.text); });
    return out;
  }
  function fromSource(text, src) {
    var t = String(text == null ? '' : text); if (!t) return true;
    var probe = [t]; if (t.slice(-1) === '…') probe.push(t.slice(0, -1));
    return probe.some(function (p) { return p && src.some(function (s) { return s.indexOf(p) >= 0; }); });
  }
  function rawIn(root, out, seen, src) {
    if (!root || root.nodeType !== 1) return;
    var els = [].slice.call(root.querySelectorAll('[data-raw]')); if (root.matches('[data-raw]')) els.unshift(root);
    els.forEach(function (el) {
      if (el.closest('#demo, #hint-box')) return;
      if (el.children.length) push(out, seen, 'data-raw', el, '요소', '안에 요소가 있음: ' + el.innerHTML.slice(0, 60));
      else if (!fromSource(el.textContent, src)) push(out, seen, 'data-raw', el, '원문 아님', el.textContent);
    });
  }
  function minusSources(v, src) {
    var s = String(v);
    src.slice().sort(function (a, b) { return b.length - a.length; }).forEach(function (x) { if (x && s.indexOf(x) >= 0) s = s.split(x).join(' '); });
    return s;
  }
  function attrCheck(out, seen, el, a, src) {
    var v = el.getAttribute(a); if (!v || el.closest(SKIP)) return;
    var rawAttr = (el.getAttribute('data-raw-attr') || '').split(/\s+/);   /* 속성만 남의 글 (예: 앨범 카드 이름표에 위키 제목 · 모델이 쓴 한 줄) */
    check(out, seen, '@' + a, el, rawAttr.indexOf(a) >= 0 ? minusSources(v, src) : v);
  }
  function scan() {
    var out = [], seen = {}, src = sources();
    check(out, seen, 'title', document.documentElement, document.title);
    textsIn(document.body, out, seen);
    rawIn(document.body, out, seen, src);
    [document.documentElement].concat([].slice.call(document.body.querySelectorAll('*'))).forEach(function (el) {
      if (el.closest('#demo, #hint-box')) return;
      ATTRS.forEach(function (a) { attrCheck(out, seen, el, a, src); });
      ['::before', '::after'].forEach(function (p) {
        var c = getComputedStyle(el, p).content;
        if (!c || c === 'none' || c === 'normal') return;
        (c.match(/"(?:[^"\\]|\\.)*"/g) || []).forEach(function (q) { check(out, seen, p, el, q.slice(1, -1)); });
      });
      var cs = getComputedStyle(el);
      if (cs.display === 'list-item' && cs.listStyleImage === 'none') {
        var mk = getComputedStyle(el, '::marker').content, lt = cs.listStyleType;
        if (mk && mk !== 'none' && mk !== 'normal') (mk.match(/"(?:[^"\\]|\\.)*"/g) || []).forEach(function (q) { check(out, seen, '::marker', el, q.slice(1, -1)); });
        if (mk !== 'none' && lt !== 'none') {
          if (/^["']/.test(lt)) push(out, seen, '::marker', el, lt, '목록 기호 글자 ' + lt);
          else if (!MARK_OK.test(lt)) push(out, seen, '::marker', el, lt, '목록 기호 ' + lt);
        }
      }
    });
    /* 깨진 그림: 그려지는 것만 (안 오면 숨기고 글자로 바꾸는 것 — 놀이방 문 .no-img — 은 빼고) */
    [].forEach.call(document.querySelectorAll('img'), function (im) { if (im.complete && im.getAttribute('src') && !im.naturalWidth && !im.closest('#demo') && im.getClientRects().length) out.push({ kind: 'img', at: where(im), chars: '', text: '깨진 그림 ' + String(im.getAttribute('src')).slice(0, 50) }); });
    return out;
  }
  /* SVG 안 그림(포스터 스티커 · 장면): 주소마다 Image 로 다시 받아 본다 → 안 오는 주소 목록 (깨진 그림 표시가 남았는지) */
  function svgBroken() {
    var hs = [].map.call(document.querySelectorAll('svg image'), function (im) { return im.getAttribute('href') || im.getAttribute('xlink:href') || ''; }).filter(function (x) { return x && !/^data:/.test(x); });
    hs = hs.filter(function (x, i) { return hs.indexOf(x) === i; });
    return Promise.all(hs.map(function (x) { return new Promise(function (r) { var i = new Image(); i.onload = function () { r(null); }; i.onerror = function () { r(x); }; i.src = x; }); })).then(function (a) { return a.filter(Boolean); });
  }
  /* 두 테마: 지금 테마 · 다른 테마 (글자는 같고 ::before/::after · 보이는 칸만 다르다) */
  function scanBoth() {   /* 테마를 잠깐 바꿨다 되돌린다 — 굴러가 있던 칸(로그 · 시트)의 스크롤 자리는 같은 틱 안에 되돌려 앱이 '손으로 굴렸다'로 보지 않게 */
    var root = document.documentElement, was = root.getAttribute('data-font') || 'pixel', other = was === 'pixel' ? 'system' : 'pixel', res = [];
    var keep = [].filter.call(document.querySelectorAll('#log, dialog[open], #album, #album-diary'), function (e) { return e.scrollTop || e.scrollLeft; }).map(function (e) { return [e, e.scrollTop, e.scrollLeft]; });
    var pb = document.getElementById('log') && document.getElementById('log').style.paddingBottom;
    scan().forEach(function (x) { x.theme = was; res.push(x); });
    root.setAttribute('data-font', other);
    scan().forEach(function (x) { if (!res.some(function (y) { return y.kind === x.kind && y.at === x.at && y.text === x.text; })) { x.theme = other; res.push(x); } });
    root.setAttribute('data-font', was);
    if (document.getElementById('log')) document.getElementById('log').style.paddingBottom = pb;
    keep.forEach(function (k) { k[0].scrollTop = k[1]; k[0].scrollLeft = k[2]; });
    return res;
  }
  var live = [], liveSeen = {}, bubbles = [];
  function watch() {
    new MutationObserver(function (ms) {
      var src = null;
      ms.forEach(function (m) {
        var t = m.type === 'characterData' ? m.target.parentElement : m.target;
        if (!t || !t.isConnected) return;
        if (!src) src = sources();
        if (m.type === 'attributes') { if (ATTRS.indexOf(m.attributeName) >= 0 && !t.closest('#demo, #hint-box')) attrCheck(live, liveSeen, t, m.attributeName, src); return; }   /* 보이는 동안 바뀐 aria-label · title 도 */
        textsIn(t, live, liveSeen);
        rawIn(t.nodeType === 1 ? t : t.parentElement, live, liveSeen, src);
        if (m.type === 'childList') [].forEach.call(m.addedNodes, function (n) { if (n.nodeType === 1) ATTRS.forEach(function (a) { attrCheck(live, liveSeen, n, a, src); }); });
      });
      var b = document.getElementById('oct-bubble');   /* 본 말풍선 (덮개: 바깥 기웃 말풍선이 실제로 지나갔는지) */
      if (b && !b.hidden && b.textContent) { var k = b.textContent + (b.querySelector('img.ua-ico') ? ' [그림 ' + b.querySelector('img.ua-ico').getAttribute('src').split('/').pop().slice(0, 24) + ']' : ''); if (bubbles.indexOf(k) < 0) bubbles.push(k); }
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  /* 오늘의 산책 로그: 위 가장자리가 행(초상 대화창)을 가운데서 자르는지 (7물결 점검 c). 스크롤 · 행 수가 1.5 s 멈춘 상태마다 잰다
     (부드러운 스크롤 · 등장 애니메이션 중간은 빼고 — 앱은 스크롤이 도중에 멈추면 1 s 뒤 제자리에 놓는다) */
  var lw = 0, lwLast = '', lwSame = 0, lwRes = [];
  function logState() {
    var log = document.getElementById('log'); if (!log || !log.offsetParent) return null;
    var rows = log.querySelectorAll('.lrow'); if (!rows.length) return null;
    var lr = log.getBoundingClientRect(), top = lr.top + log.clientTop, bottom = top + log.clientHeight;
    var cut = [].filter.call(rows, function (r) { var q = r.getBoundingClientRect(); return q.top < top - 1 && q.bottom > top + 1; }).map(function (r) { return (r.querySelector('.ltool') || {}).textContent || '?'; });
    var nq = rows[rows.length - 1].getBoundingClientRect();
    return { cut: cut, newestFull: nq.bottom <= bottom + 1 && nq.top >= top - 1, newestTall: nq.height > log.clientHeight, st: Math.round(log.scrollTop), n: rows.length, sh: log.scrollHeight };
  }
  function logWatch(on) {
    clearInterval(lw); lw = 0; lwLast = '';
    if (on) lw = setInterval(function () {
      var q = logState(); if (!q) return;
      var key = q.st + '|' + q.n + '|' + q.sh + '|' + innerWidth + '|' + document.documentElement.getAttribute('data-font');
      lwSame = key === lwLast ? lwSame + 1 : 0; lwLast = key;
      if (lwSame >= 5 && (!lwRes.length || lwRes[lwRes.length - 1].key !== key)) { q.key = key; q.w = innerWidth; q.font = document.documentElement.getAttribute('data-font'); lwRes.push(q); }
    }, 300);
  }
  /* 다시 그린 뒤 로그가 자리 잡기를 기다린다: 잘린 행 없음 · 가장 새 행 다 보임 · 스크롤 0.3 s 그대로 — 그때의 상태. ms 안에 안 되면 마지막 상태 (= 실패).
     앱은 부드러운 스크롤이 멈추면 1 s 뒤 제자리에 놓으니 ms 는 그보다 넉넉히 (바쁜 기계에서 400 ms 만 보고 실패하던 것 — 검증 7b) */
  function logSettle(ms) {
    return new Promise(function (res) {
      var t0 = Date.now(), last = null, same = 0;
      (function tick() {
        var q = logState(), good = !!q && !q.cut.length && (q.newestFull || q.newestTall);
        same = q && last && q.st === last.st && q.n === last.n ? same + 1 : 0; last = q;
        if ((good && same >= 2) || Date.now() - t0 > ms) { if (q) q.waited = Date.now() - t0; res(q); return; }
        setTimeout(tick, 150);
      })();
    });
  }
  window.__glyph = { scan: scan, scanBoth: scanBoth, live: live, bubbles: bubbles, bad: BAD, logState: logState, logWatch: logWatch, logRes: lwRes, logSettle: logSettle, svgBroken: svgBroken, extra: extra, sources: sources };
  if (document.documentElement) watch(); else document.addEventListener('DOMContentLoaded', watch);
}
async function scenarioGlyphs(browser) {
  console.log('\n== U. 플레이어 화면 글자: 이모지 · 장식 기호 없음 (픽셀 아이콘이나 글자만)');
  var O = 'http://ppolppol.example', DAY1 = '2026-11-03', DAY2 = '2026-11-04', SPEED = 0.4;
  var WIKI_EMO = ' 머리 위 🎩 이야기.';   /* 위키 요약에 든 이모지 — 출처 글이라 그대로 보여야 한다 (data-raw 안) */
  var NICK = '문어왕🐙', NICKS = [NICK, '뚜루'];   /* 랭킹 닉네임 — 다른 사람이 쓴 이름이라 그대로 (data-raw 안) */
  var WT = 'C♯ (음)';                    /* 기호가 든 진짜 위키 문서 제목 — 데모 산책이 기억한 곳이 이 문서면 (우리 문구 속 제목만 data-raw) */
  var WILD = '고래🐋';                   /* 모델이 고른 들판 정류장 이름 (이모지 그대로) */
  var GUARD = { content: '(' + glyphGuardInit.toString() + ')();' };
  var s = await newPage(browser, 'ok', [{ content: "window.__ppolTest = window.__ppolTest || { today: '" + DAY1 + "', forceKind: 'out' };" }, GUARD]);
  var page = s.page, found = [], states = 0, extraOk = [];
  await routeRepo(page, O);
  async function wikiRoute(pg) {
    await pg.route('https://ko.wikipedia.org/**', function (route) {
      var t = decodeURIComponent((route.request().url().match(/titles=([^&]+)/) || [])[1] || '모자'), body = JSON.parse(JSON.stringify(WIKI_OK));
      body.query.pages['1'].title = t; body.query.pages['1'].extract = t + WIKI_EMO + ' 가짜 위키 응답이라 실제 내용이 아니다.';
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
    });
  }
  await wikiRoute(page);
  var submitMode = '503';
  await page.route(O + '/api/runner/**', function (route) {
    var u = new URL(route.request().url()), p = u.pathname.replace(/^.*\/api\/runner\//, '');
    if (p === 'submit') {
      if (submitMode === 'dup') return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'duplicate' }) });
      if (submitMode === 'ok') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, runId: 'abcdef123456', rank: 3, week: '2026-W45', nick: '뚜루' }) });
      return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
    }
    var j = p === 'seed' ? { ok: true, token: 'tok', seed: 12345, night: false, week: '2026-W45' } : p === 'top' ? { ok: true, top: [{ rank: 1, nick: NICK, score: 321 }, { rank: 2, nick: '뚜루', score: 12 }] } : null;
    return route.fulfill(j ? { status: 200, contentType: 'application/json', body: JSON.stringify(j) } : { status: 503, contentType: 'application/json', body: '{}' });
  });
  async function scan(label, pg) {
    states++;
    var r = await (pg || page).evaluate(function (nicks) { if (!window.__glyph) return null; nicks.forEach(function (n) { if (window.__glyph.extra.indexOf(n) < 0) window.__glyph.extra.push(n); }); return window.__glyph.scanBoth(); }, NICKS);
    if (!r) { found.push({ label: label, kind: 'guard', at: '', chars: '', text: '검사기 없음' }); return; }
    r.forEach(function (x) { x.label = label; if (!found.some(function (y) { return y.kind === x.kind && y.at === x.at && y.text === x.text; })) found.push(x); });
  }
  var liveAll = [], bubAll = [];   /* 문서 관찰자의 기록은 페이지를 옮기면 사라진다 → 옮기기 전에 모은다 */
  async function collectLive(pg) {
    var r = await (pg || page).evaluate(function () { return window.__glyph ? { live: window.__glyph.live.splice(0), bubbles: window.__glyph.bubbles.splice(0) } : { live: [], bubbles: [] }; });
    liveAll = liveAll.concat(r.live); r.bubbles.forEach(function (b) { if (bubAll.indexOf(b) < 0) bubAll.push(b); });
  }
  async function walkAndScan(label, w, font) {   /* 끝까지 걷게 둔다 (바깥 기웃 말풍선 · 귀가 연출까지) — 잠깐 보인 것은 문서 관찰자가 본다. w · font: 이 산책 동안의 폭 · 테마 (로그 잘림 검사) */
    if (w) await page.setViewportSize({ width: w, height: 740 });
    if (font) await page.evaluate(function (f) { document.documentElement.setAttribute('data-font', f); }, font);
    await page.evaluate(function () { window.__glyph.logWatch(true); });
    await page.click('#btn-go'); await page.waitForSelector('#btn-go.away', { timeout: 10000 });
    for (var i = 0; i < 40; i++) { await page.waitForTimeout(700); if (i % 4 === 0) await scan(label + ' (나가 있는 중)'); if (!(await page.$('#btn-go.away'))) break; }
    await page.evaluate(function () { window.__glyph.logWatch(false); });
    await page.evaluate(function () { document.documentElement.setAttribute('data-font', 'pixel'); });
    if (w) await page.setViewportSize({ width: 360, height: 740 });
    await skipAway(page).catch(function () {}); await waitIdle(page); await page.waitForTimeout(400);
  }
  async function importAndWait(evs, label, w) {
    if (w) await page.setViewportSize({ width: w, height: 740 });
    must(await page.evaluate(function (e) { return APP.importEvents(e); }, evs), label + ' 재생 시작');
    for (var k = 0; k < 40; k++) { await page.waitForTimeout(700); if (k % 4 === 0) await scan(label + ' (나가 있는 중)'); if (!(await page.$('#btn-go.away'))) break; }
    await skipAway(page).catch(function () {}); await waitIdle(page); await page.waitForTimeout(400);
    if (w) await page.setViewportSize({ width: 360, height: 740 });
  }
  function toastSays(re) { return page.waitForFunction(function (src) { var t = document.getElementById('toast'); return t && t.classList.contains('show') && new RegExp(src).test(t.textContent); }, re.source, { timeout: 5000 }).then(function () { return true; }, function () { return false; }); }

  /* 1. 입장 (?intro=1 — 자동화 브라우저는 기본 생략) → 이름 창 */
  await page.goto(O + '/index.html?dev=0&intro=1&slow=' + SPEED);
  await page.waitForSelector('#intro .intro-title', { timeout: 20000 }).catch(function () {});
  await page.waitForTimeout(600);
  await scan('입장');
  await page.click('#intro .intro-title').catch(function () {});
  await page.waitForSelector('#name-dialog[open]', { timeout: 20000 });
  await page.waitForTimeout(300);
  await scan('이름 창');
  await page.fill('#name-in', '뚜루'); await page.click('#name-form button[type=submit]');
  await page.waitForSelector('#name-dialog[open]', { state: 'hidden' });
  await page.waitForTimeout(500);
  await scan('첫 인사');
  /* 2. 말풍선 둘 · 설정 (초기화 한 번 누름 · 내보내기 · 불러오기 실패 / 성공) */
  await page.click('#pips'); await page.waitForTimeout(250); await scan('등불 말풍선');
  await page.click('#brain-tag'); await page.waitForTimeout(250); await scan('데모 말풍선');
  await page.click('#brain-tag'); await page.waitForTimeout(100);
  await page.click('#btn-settings'); await page.waitForSelector('#settings-sheet[open]'); await scan('설정');
  await page.click('#set-reset'); await page.waitForTimeout(150); await scan('설정 · 초기화 한 번 누름 (다시 누르면 지워짐)');
  var dl = page.waitForEvent('download', { timeout: 4000 }).catch(function () { return null; });
  await page.click('#set-export'); await dl; await scan('설정 · 내보내기');
  await page.setInputFiles('#set-import', { name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{ "v": 2, 깨진 파일') });
  var badT = await toastSays(/아닌 것 같아/); await scan('설정 · 불러오기 실패');
  var good = await page.evaluate(function () { return JSON.stringify(APP.state); });
  await page.setInputFiles('#set-import', { name: 'ok.json', mimeType: 'application/json', buffer: Buffer.from(good) });
  var goodT = await toastSays(/불러왔어/); await scan('설정 · 불러오기 됨');
  ok(badT && goodT, '설정: 불러오기 실패 · 성공 토스트가 떴다 (그 글자도 검사)');
  await page.waitForSelector('#settings-sheet[open]', { state: 'hidden', timeout: 3000 }).catch(function () {});
  if (await page.$('#settings-sheet[open]')) { await page.click('#set-close'); await page.waitForSelector('#settings-sheet[open]', { state: 'hidden' }); }
  /* 3. 외출 (데모 두뇌, 위키 읽음) · 집에 있는 날 (쪽지) */
  await walkAndScan('외출', 360, 'pixel');
  await page.waitForFunction(function () { return APP.oct.state === 'sleep'; }, null, { timeout: 8000 }).catch(function () {});
  await scan('외출 뒤 (로그 · 잠)');
  await page.evaluate(function () { window.__ppolTest.forceKind = 'home'; });
  await walkAndScan('집에 있는 날', 320, 'system');
  await page.evaluate(function () { window.__ppolTest.forceKind = 'out'; });
  /* 4. 모델(MCP) 차례: 모델이 쓴 말에 이모지 (그대로 보여야 한다) + 읽기 상태 다섯 가지 + 모델이 고른 들판(이름에 이모지)을 기억 → 새 포스터 토스트의 제목도 그대로 */
  var M = { aside: '챙이 넓어 🎩', note: '안쪽 띠가 좋아 🧵', line: '모자 생각 🎩', raw: '두근 ✨', rline: '좋았어 😌', memo: '다음엔 바다 🐚' };
  var evs = [{ type: 'depart', t: 0, hint: '' },
    { type: 'peek', t: 1000, target: { kind: 'room', id: 'hat', title: '모자' }, status: 'builtin', ms: 3000, aside: M.aside, note: M.note },
    { type: 'peek', t: 1500, target: { kind: 'url', url: 'https://example.org/x' }, status: 'simulated', ms: 0 },
    { type: 'peek', t: 2000, target: { kind: 'room', id: 'shell', title: '조개' }, status: 'failed', ms: 1200 },
    { type: 'peek', t: 2500, target: { kind: 'room', id: 'slow_room', title: '느린 글의 방' }, status: 'none', ms: 2000 },
    { type: 'peek', t: 3000, target: { kind: 'room', id: 'rain', title: '비' }, status: 'read', ms: 2000 },
    { type: 'peek', t: 3200, target: { kind: 'wild', title: WILD }, status: 'read', ms: 1500 },
    { type: 'return', t: 3500, reason: 'enough' }, { type: 'remember', t: 3700, stopIdx: 5, sticker: 'hat', line: M.line }, { type: 'hang_poster', t: 4000 },
    { type: 'wrap_up', t: 4500, reaction: M.raw, line: M.rline, note: { text: M.memo, about: { kind: 'node', id: 'shell' } }, model: 'claude-test' }];
  await page.setViewportSize({ width: 412, height: 740 });
  await page.evaluate(function () { window.__glyph.logWatch(true); });
  await importAndWait(evs, '모델 차례');
  await page.evaluate(function () { window.__glyph.logWatch(false); }); await page.setViewportSize({ width: 360, height: 740 });
  await scan('모델 차례 뒤');
  /* 모델의 집에 있는 날: 쪽지 한 줄 · 뒷면 글에 이모지 · 반응은 네 가지 밖의 말(줄 없이) → 마무리 말풍선이 그 말 그대로 (data-raw) */
  var MH = { line: '창밖만 봤어 🌧', detail: '빗방울 셋 💧', raw: '두근두근 ✨' };
  await importAndWait([{ type: 'stay_home', t: 0, line: MH.line, detail: MH.detail, anchor: 'window' }, { type: 'wrap_up', t: 1500, reaction: MH.raw }], '모델 집에 있는 날');
  await scan('모델 집에 있는 날 뒤');
  /* 빈 차례 (모델이 아무것도 안 함) */
  await importAndWait([{ type: 'empty_turn', t: 0 }], '빈 차례');
  await scan('빈 차례 뒤');
  /* 5. 읽는 사람이 로그를 조금(한 행보다 덜 — 60px) 올리면 다음 행이 와도 그 자리 그대로 (GF R13 · 검증 7b: 예전엔 우리 스크롤 길 안이라고 보고 끌어내렸다) */
  await page.setViewportSize({ width: 360, height: 740 });
  await page.click('#btn-go'); await page.waitForSelector('#btn-go.away', { timeout: 10000 });
  var yready = await page.waitForFunction(function () {
    var l = document.getElementById('log'), g = window.__yk || (window.__yk = { y: -1, n: 0 }), y = l.scrollTop;
    g.n = Math.abs(y - g.y) < 1 ? g.n + 1 : 0; g.y = y;
    return l.scrollHeight - l.clientHeight > 120 && g.n >= 5 && !!document.querySelector('#btn-go.away');
  }, null, { timeout: 20000, polling: 150 }).then(function () { return true; }, function () { return false; });
  var yk = { ready: yready };
  if (yready) {
    var ya = await page.evaluate(function () { var l = document.getElementById('log'); l.scrollBy(0, -60); return { y: Math.round(l.scrollTop), n: l.querySelectorAll('.lrow').length }; });
    yk.y0 = ya.y;
    yk.row = await page.waitForFunction(function (n) { return document.querySelectorAll('#log .lrow').length > n; }, ya.n, { timeout: 20000, polling: 100 }).then(function () { return true; }, function () { return false; });
    await page.waitForTimeout(1600);
    yk.y1 = await page.evaluate(function () { return Math.round(document.getElementById('log').scrollTop); });
    await page.evaluate(function () { var l = document.getElementById('log'); l.scrollTop = l.scrollHeight; });   /* 읽는 사람이 다시 맨 아래로 → 다시 따라간다 */
  }
  console.log('   로그 조금 올림:', JSON.stringify(yk));
  ok(yk.ready && yk.row && Math.abs(yk.y1 - yk.y0) <= 4, '로그를 60px 올려 두면 다음 행이 와도 끌어내리지 않음 (' + yk.y0 + ' → ' + yk.y1 + ')');
  await skipAway(page).catch(function () {}); await waitIdle(page); await page.waitForTimeout(400);
  /* 데모 산책이 기억한 곳이 기호가 든 위키 문서였다면 (우리 문구 속 제목만 data-raw — 로그 기억 행 · 포스터 앞면 글 · 열람 첫 줄 · 일기 '기억으로 고른 곳' · 카드 이름표 · 제목) */
  var wt = await page.evaluate(function (T) {
    var t = APP.state.trips.filter(function (x) { return x.kind === 'out' && x.by === 'demo' && x.receipt && x.status === 'done' && x.poster && x.receipt.rememberedIdx >= 0; })[0];
    if (!t) return null;
    var st = t.receipt.stops[t.receipt.rememberedIdx], old = st.name;
    (t.events || []).forEach(function (e) { if (e.type === 'peek' && e.target && e.target.id && e.target.id === st.nodeId) e.target = { kind: 'wild', title: T }; });
    st.name = T; st.title = T; st.nodeId = null; st.corner = 'wild';
    t.poster.title = T; t.poster.line = old && (t.poster.line || '').indexOf(old) >= 0 ? t.poster.line.split(old).join(T) : T + '에 오래 있었어';
    (t.events || []).forEach(function (e) { if (e.type === 'remember') e.line = t.poster.line; });
    APP.save(); APP.renderAll();
    return { id: t.id, line: t.poster.line };
  }, WT);
  must(wt, '데모 산책 하나를 위키 문서 ' + WT + ' 를 기억한 산책으로 (' + JSON.stringify(wt) + ')');
  await page.waitForTimeout(500);
  await scan('위키 제목에 기호 (로그)');
  /* 로그 잘림 (7물결 점검 c): 산책 동안 멈춘 상태마다 + 지금 로그를 폭 셋 × 테마 둘로 다시 그려서 — 다시 그린 뒤 자리 잡기를 3 s 까지 기다린다 */
  var cutRes = await page.evaluate(function () { return window.__glyph.logRes.slice(); });
  for (var cw of [320, 360, 412]) for (var cf of ['pixel', 'system']) {
    await page.setViewportSize({ width: cw, height: 740 });
    await page.evaluate(function (f) { document.documentElement.setAttribute('data-font', f); APP.renderLog(); }, cf);
    var q = await page.evaluate(function () { return window.__glyph.logSettle(3000).then(function (x) { if (x) { x.w = innerWidth; x.font = document.documentElement.getAttribute('data-font'); x.key = 'renderLog'; } return x; }); });
    if (q) cutRes.push(q);
    if (cw === 320 && cf === 'pixel') await page.locator('#log-sec').screenshot({ path: path.join(SHOTS, 'log-snap-320.png') });
  }
  await page.evaluate(function () { document.documentElement.setAttribute('data-font', 'pixel'); });
  await page.setViewportSize({ width: 360, height: 740 });
  var cutBad = cutRes.filter(function (x) { return x.cut.length || (!x.newestFull && !x.newestTall); });
  var combos = {}; cutRes.forEach(function (x) { combos[x.w + ' ' + x.font] = (combos[x.w + ' ' + x.font] || 0) + 1; });
  console.log('   로그 멈춘 상태 ' + cutRes.length + '곳: ' + JSON.stringify(combos));
  ok(cutRes.length >= 8 && Object.keys(combos).length >= 6 && !cutBad.length, '오늘의 산책 로그: 위 가장자리에 반쯤 잘린 행 없음 · 가장 새 행은 다 보임 (나가 있는 중 · 다시 그림, 320/360/412 · 두 테마)' + (cutBad.length ? ' ✗ ' + JSON.stringify(cutBad.slice(0, 4)) : ''));
  var mt = await page.evaluate(function (A) {
    var raws = [].map.call(document.querySelectorAll('[data-raw]'), function (e) { return e.textContent + '|' + (e.getAttribute('title') || ''); }).join('\n');
    var mcp = APP.state.trips.filter(function (x) { return x.by === 'mcp'; });
    var all = {}; APP.state.trips.forEach(function (x) { (x.receipt && x.receipt.stops || []).forEach(function (q) { all[q.status] = 1; }); });
    return { by: mcp.map(function (x) { return x.kind; }), st: Object.keys(all), shown: Object.keys(A).filter(function (k) { return raws.indexOf(A[k]) >= 0 || raws.indexOf(A[k].slice(0, 6)) >= 0; }) };
  }, Object.assign({}, M, { hLine: MH.line, hDetail: MH.detail, wild: WILD, wiki: WT }));
  console.log('   model:', JSON.stringify(mt));
  ok(mt.by.indexOf('out') >= 0 && mt.by.indexOf('home') >= 0 && ['read', 'builtin', 'simulated', 'failed', 'none'].every(function (x) { return mt.st.indexOf(x) >= 0; }), '로그에 읽기 상태 다섯 가지 (읽음 · 책장 · 모의 · 못 읽음 · 앉아만 — ' + mt.st.join(',') + ') · 모델 차례 외출 · 집');
  ok(['aside', 'note', 'raw', 'rline', 'hLine', 'hDetail', 'wild', 'wiki'].every(function (k) { return mt.shown.indexOf(k) >= 0; }), '모델이 쓴 말 · 모델이 고른 이름 · 위키 제목(이모지 · 기호 포함)은 고치지 않고 그대로 보임 — data-raw 칸 (' + mt.shown.join(',') + ')');
  /* 6. 포스터: 앞면 · 열람 기록 · 일기 — 카드마다 (외출 · 쪽지 · 모델 · 위키 제목) · 복사 토스트. 스티커 기울기는 <image> 에 (새 카드 등장 애니메이션이 덮어쓰지 않게) */
  await openAlbum(page); await scan('앨범 전체');
  var stk = await page.evaluate(function () {
    var gs = [].slice.call(document.querySelectorAll('#album .pcard svg g.stk'));
    return { n: gs.length, inN: document.querySelectorAll('#album .pcard.in svg g.stk').length, bad: gs.filter(function (g) { var im = g.querySelector('image'); return g.getAttribute('transform') || !im || !/^rotate\(/.test(im.getAttribute('transform') || ''); }).length };
  });
  ok(stk.n >= 3 && !stk.bad, '포스터 스티커: 바깥 g.stk 엔 transform 없음 · 기울기는 <image> 에 (' + JSON.stringify(stk) + ')');
  var nCards = await page.evaluate(function () { return document.querySelectorAll('#album .pcard').length; });
  for (var c = 0; c < nCards; c++) {
    await page.click('#album .pcard >> nth=' + c); await page.waitForSelector('#poster-dialog[open]'); await page.waitForTimeout(300);
    await scan('포스터 ' + (c + 1) + ' 앞면');
    await page.click('#pd-flip'); await page.waitForTimeout(600); await scan('포스터 ' + (c + 1) + ' 일기');
    if (c === 0) { await page.click('#pd-copy'); await page.waitForTimeout(250); await scan('복사 토스트'); }
    await closePoster(page, true);
  }
  var share = await page.evaluate(function () { return [].map.call(document.querySelectorAll('#album .pcard'), function (c) { return c.getAttribute('data-trip'); }).map(function (id) { APP.openPoster(id, true); var b = document.querySelector('#pd-back [data-share]'); var v = b ? b.getAttribute('data-share') : ''; document.getElementById('poster-dialog').close(); return v; }); });
  console.log('   공유 한 줄:', JSON.stringify(share));
  ok(share.length && share.every(function (x) { return /^뽈뽈 (#\d+ · (비|가랑비|눈) 오는 날|#\d+ · 맑은 날|· 오늘은 집)/.test(x) && x.indexOf(WT) < 0 && x.indexOf(WILD) < 0 && x.indexOf('모자') < 0; }), '공유 한 줄은 갈래 낱말만 (정류장 이름 · 위키 제목 · 모델이 준 이름 없음, 스포일러 없음)');
  for (var f of ['poster', 'note', 'all']) { await page.click('#album-sheet .fchip[data-f="' + f + '"]'); await page.waitForTimeout(150); await scan('앨범 ' + f); }
  await closeAlbum(page);
  /* 저장 실패 (저장소가 꽉 찼거나 막힘): 조용한 한 줄 */
  await page.evaluate(function () { window.__setItem = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new Error('막힘'); }; APP.save(); });
  await page.waitForTimeout(200); await scan('저장 실패 한 줄');
  await page.evaluate(function () { Storage.prototype.setItem = window.__setItem; });
  /* 7. 다음 날: 앨범 › 일기 (날 머리 · 펼치기) */
  await page.evaluate(function (d) { window.__ppolTest.today = d; APP.state.trips.forEach(function (t) { if (t.endedAt) t.endedAt -= 180000; }); document.dispatchEvent(new Event('visibilitychange')); }, DAY2);
  await page.waitForTimeout(300);
  await scan('다음 날 (어제 메모)');
  await openAlbum(page);
  await page.click('#album-sheet .fchip[data-f="diary"]'); await page.waitForTimeout(200);
  await scan('앨범 일기 (펼침)');
  await page.click('#album-diary details.dday summary'); await page.waitForTimeout(150); await scan('앨범 일기 (접힘)');
  await closeAlbum(page);
  /* 8. 놀이방 (8물결): 다락 문 → 놀이방 (문 · 오락기 단추, 키보드 포커스) → 오락기 → 달리기: 준비 · 달리는 중 · 쉬는 중(창을 가림) · 끝(랭킹 · 닉네임) · 올리기 (서버 503 · 이미 올린 판 409 · 됨) */
  async function inPlayRoom(pg) { await (pg || page).waitForFunction(function () { var m = document.getElementById('btn-machine'); return APP.scene.view() === 'play' && m && !m.hidden && !document.getElementById('btn-play-door').hidden; }, null, { timeout: 20000 }); await (pg || page).waitForTimeout(300); }
  async function inAttic(pg) { await (pg || page).waitForFunction(function () { var d = document.getElementById('btn-door'); return APP.scene.view() !== 'play' && !APP.scene.room() && !d.hidden; }, null, { timeout: 20000 }); await (pg || page).waitForTimeout(200); }
  await page.focus('#btn-door'); await page.keyboard.press('Enter');
  await inPlayRoom(); await scan('놀이방 (문 포커스)');
  await page.keyboard.press('Tab'); await page.waitForTimeout(150); await scan('놀이방 (오락기 포커스)');
  /* 시스템 테마 · 320 px 에서도 놀이방 한 번 (scan 은 두 테마를 다 보지만 폭은 지금 폭) */
  await page.setViewportSize({ width: 320, height: 740 }); await page.waitForTimeout(400); await scan('놀이방 (320)');
  await page.setViewportSize({ width: 360, height: 740 }); await page.waitForTimeout(300);
  await clickSpot(page, '#btn-machine'); await page.waitForSelector('#runner-dlg[open]'); await page.waitForTimeout(500);
  await scan('달리기 준비');
  await page.focus('#rn-cv'); await page.keyboard.press(' '); await page.waitForTimeout(200);
  await page.evaluate(function () { Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return true; } }); document.dispatchEvent(new Event('visibilitychange')); });   /* 창을 가림 → 쉬는 중 */
  await page.waitForTimeout(200);
  var paused = await page.evaluate(function () { return RUNNER.live().state; });
  await scan('달리기 쉬는 중');
  await page.evaluate(function () { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await page.focus('#rn-cv'); await page.keyboard.press(' '); await page.waitForTimeout(150);
  await scan('달리기 중');
  await page.waitForFunction(function () { return RUNNER.live().state === 'over'; }, null, { timeout: 15000 });
  await page.waitForTimeout(900);
  var top = await page.evaluate(function () { var n = document.querySelector('#rn-top10 .rn-top-nick'); return n ? { text: n.textContent, raw: !!n.closest('[data-raw]') } : null; });
  await scan('달리기 끝 (랭킹)');
  ok(top && top.text === NICK && top.raw, '랭킹 닉네임(다른 사람이 쓴 이름)은 그대로 · data-raw (' + JSON.stringify(top) + ')');
  async function submit(mode, re) {
    submitMode = mode;
    await page.click('#rn-submit');
    return page.waitForFunction(function (src) { var m = document.getElementById('rn-net-msg'); return m && new RegExp(src).test(m.textContent); }, re.source, { timeout: 6000 }).then(function () { return true; }, function () { return false; });
  }
  var sub = { paused: paused };
  sub.e503 = await submit('503', /못 올렸어/); await scan('달리기 · 올리기 실패 (서버)');
  sub.dup = await submit('dup', /벌써 올렸어/); await scan('달리기 · 이미 올린 판');
  await page.waitForFunction(function () { var b = document.getElementById('rn-again'); return b && !b.disabled; }, null, { timeout: 3000 }).catch(function () {});
  await page.click('#rn-again'); await page.waitForTimeout(300);
  await page.focus('#rn-cv'); await page.keyboard.press(' ');
  await page.waitForFunction(function () { return RUNNER.live().state === 'over'; }, null, { timeout: 15000 });
  await page.waitForTimeout(600);
  sub.ok = await submit('ok', /등이야/); await page.waitForTimeout(300); await scan('달리기 · 올림 (등수)');
  ok(sub.paused === 'pause' && sub.e503 && sub.dup && sub.ok, '달리기: 쉬는 중 · 올리기 실패 · 이미 올린 판 · 올림 화면을 지나며 검사 (' + JSON.stringify(sub) + ')');
  await page.click('#rn-stop'); await page.waitForSelector('#runner-dlg[open]', { state: 'hidden' });
  await page.waitForTimeout(200); await scan('놀이방 (달리기를 닫음 · 오락기 포커스)');
  await clickSpot(page, '#btn-play-door'); await inAttic(); await scan('놀이방에서 문어 방으로');
  /* 8b. 산책 중 놀이방: 바깥이 보이는 동안 장면 오른쪽 아래 문 단추 → 놀이방 → 문어가 돌아오면 구석 쪽지 → 보러 가기 (scan 이 상태마다 두 테마를 다 본다) */
  for (var nf of ['pixel']) {
    await page.click('#btn-go');
    await page.waitForFunction(function () { var d = document.getElementById('btn-door'); return APP.scene.view() === 'exterior' && !d.hidden && d.dataset.spot === 'edge'; }, null, { timeout: 30000 });
    await page.waitForTimeout(200); await scan('바깥 (놀이방 문 단추 · ' + nf + ')');
    await page.click('#btn-door'); await inPlayRoom(); await scan('산책 중 놀이방 (' + nf + ')');
    await page.waitForFunction(function () { return !document.getElementById('back-note').hidden && document.getElementById('back-note-txt').textContent; }, null, { timeout: 90000 });
    await scan('구석 쪽지 (' + nf + ')');
    await page.focus('#btn-back-see'); await scan('구석 쪽지 · 보러 가기 포커스 (' + nf + ')');
    await page.keyboard.press('Enter'); await inAttic();
    await page.waitForFunction(function () { return !document.getElementById('btn-go').classList.contains('away'); }, null, { timeout: 60000 });
    await page.waitForTimeout(300); await scan('보러 가기 뒤 다락 (' + nf + ')');
  }
  /* 9. 2D 장면: 기념품 그림이 안 오면 · 기념품을 누르면 (말풍선 + 일기) · 깨어 있는 문어 톡 · 꾹(쓰다듬기) · 창문 · 오프라인 산책 뒤 자는 문어 톡 · 창문 */
  var tid = await page.evaluate(function () { var t = APP.state.trips.filter(function (x) { return x.kind === 'out' && x.status === 'done'; })[0]; APP.state.room.souvenirs.push({ id: 'shell', tripId: t.id }); APP.save(); return t.id; });
  await page.route(O + '/assets/souvenirs/**', function (route) { return route.fulfill({ status: 404, body: '' }); });
  await page.waitForTimeout(600);
  await collectLive();
  await page.goto(O + '/index.html?dev=0&scene=2d&slow=' + SPEED);
  await page.waitForFunction(function () { return window.APP && APP.sceneMode === '2d' && document.querySelector('#souvenir-row button'); }, null, { timeout: 15000 });
  await page.waitForTimeout(800);
  await scan('2D 장면 (기념품 그림 실패)');
  await page.evaluate(function () { document.querySelector('#souvenir-row button').click(); });   /* 2D 무대에선 문어(#oct)가 선반 위에 겹칠 수 있다 */
  await page.waitForSelector('#poster-dialog[open]'); await page.waitForTimeout(300);
  await scan('2D 기념품 누름');
  await page.click('#pd-close');
  async function octPress(holdMs) {
    await page.evaluate(function () { var o = document.getElementById('oct'), r = o.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2; o.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x, clientY: y, pointerType: 'mouse' })); });
    await page.waitForTimeout(holdMs);
    await page.evaluate(function () { var o = document.getElementById('oct'); o.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'mouse' })); });
  }
  await page.waitForFunction(function () { return !APP.oct.busy; }, null, { timeout: 8000 }).catch(function () {});
  var tap = {};
  await octPress(30); await page.waitForTimeout(250);
  tap.awake = await page.evaluate(function () { var b = document.getElementById('oct-bubble'); return b.hidden ? '' : b.textContent; });
  await scan('2D 깨어 있는 문어 톡');
  await page.waitForTimeout(1800);
  await octPress(500); await page.waitForTimeout(2300); await scan('2D 쓰다듬기');
  await page.waitForFunction(function () { return !APP.oct.busy && APP.oct.state !== 'pet'; }, null, { timeout: 8000 }).catch(function () {});
  await page.evaluate(function () { document.querySelector('#layers .layer[data-key="window"]').click(); });
  await page.waitForTimeout(2500); await scan('2D 창문 (깨어 있음)');
  await s.ctx.setOffline(true);   /* 오프라인 산책 (위키를 못 읽음) → 담요에서 잠 */
  await page.click('#btn-go'); await page.waitForSelector('#btn-go.away', { timeout: 10000 });
  await page.waitForTimeout(1500); await scan('2D 오프라인 산책 (나가 있는 중)');
  await skipAway(page).catch(function () {}); await waitIdle(page);
  await s.ctx.setOffline(false);
  await page.waitForFunction(function () { return APP.oct.state === 'sleep' && !APP.oct.busy; }, null, { timeout: 15000 }).catch(function () {});
  await page.waitForTimeout(800);
  await octPress(30); await page.waitForTimeout(250);
  tap.asleep = await page.evaluate(function () { var b = document.getElementById('oct-bubble'); return b.hidden ? '' : b.textContent; });
  await scan('2D 자는 문어 톡');
  await page.waitForTimeout(1700);
  await page.evaluate(function () { document.querySelector('#layers .layer[data-key="window"]').click(); });
  await page.waitForTimeout(300); await scan('2D 창문 (자는 중)');
  await clickSpot(page, '#btn-door'); await inPlayRoom(); await scan('2D 놀이방');
  await clickSpot(page, '#btn-play-door'); await inAttic(); await scan('2D 놀이방에서 문어 방으로');
  console.log('   문어 톡:', JSON.stringify(tap));
  ok(tap.awake === '응?' && tap.asleep === '쿨쿨…', "문어 톡: 깨어 있으면 '응?' · 자면 '쿨쿨…' (글자만 — 예전 '?' · '…zZ')");
  /* 10. 아이콘이 안 오면 (나쁜 배포 · 끊긴 망): 포스터 스티커는 깨진 그림 표시 없이 빠진다 (카드 · 앞면 · 2D 벽) */
  await collectLive();
  await page.route(O + '/assets/icons/**', function (route) { return route.fulfill({ status: 404, body: '' }); });
  await page.goto(O + '/index.html?dev=0&slow=' + SPEED);
  await page.waitForFunction(function () { return window.APP && APP.scene; }, null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  await openAlbum(page); await page.waitForTimeout(600);
  var brokenA = await page.evaluate(function () { return window.__glyph.svgBroken(); });
  await page.click('#album .pcard >> nth=0'); await page.waitForSelector('#poster-dialog[open]'); await page.waitForTimeout(600);
  var brokenF = await page.evaluate(function () { return window.__glyph.svgBroken(); });
  await scan('아이콘 404 · 포스터 앞면');
  await closePoster(page);
  console.log('   아이콘 404 뒤 깨진 SVG 그림:', JSON.stringify({ album: brokenA, front: brokenF }));
  ok(!brokenA.length && !brokenF.length, '아이콘이 안 와도 포스터 스티커에 깨진 그림 표시 없음 (앨범 카드 · 앞면)');
  await page.unroute(O + '/assets/icons/**');
  await collectLive();
  reportErrors(s.bag, 'U');
  await s.ctx.close();

  /* 11. 따로 연 페이지: 옛 기록(v1)의 포스터 제목에 이모지 (옛 저장 그대로 — data-raw) · 깨진 기록 · 저장소가 막힌 브라우저 */
  async function side(label, init, fn) {
    var p2 = await newPage(browser, 'ok', [{ content: init }, GUARD]);
    await routeRepo(p2.page, O); await wikiRoute(p2.page);
    await p2.page.goto(O + '/index.html?dev=0&slow=' + SPEED);
    await p2.page.waitForFunction(function () { return window.APP && APP.scene; }, null, { timeout: 15000 });
    await p2.page.waitForTimeout(800);
    await fn(p2.page);
    await collectLive(p2.page);
    reportErrors(p2.bag, 'U ' + label);
    await p2.ctx.close();
  }
  var LEG = { octopus: { name: '옛문어', total_trips: 3 }, room: { light_level: 2 }, currency: { hearts: 4 }, posters: [{ id: 'pa', title: '🎩 모자의 역사', ts: Date.now() - 2 * 864e5 }, { id: 'pb', title: '오늘의 탐험 ✨', ts: Date.now() - 864e5 }] };
  await side('옛 기록', "if (!localStorage.getItem('__lg')) { localStorage.setItem('__lg', '1'); localStorage.setItem('ppolppol_v1', " + JSON.stringify(JSON.stringify(LEG)) + '); }', async function (p) {
    await scan('옛 기록 (첫 화면)', p);
    await p.click('#btn-album'); await p.waitForSelector('#album-sheet[open]'); await p.waitForTimeout(300);
    await scan('옛 기록 · 앨범', p);
    await p.click('#album .pcard >> nth=0'); await p.waitForSelector('#poster-dialog[open]'); await p.waitForTimeout(300);
    await scan('옛 기록 · 포스터 앞면', p);
    await p.click('#pd-flip'); await p.waitForTimeout(500); await scan('옛 기록 · 일기', p);
    await p.click('#pd-close'); await p.waitForSelector('#poster-dialog[open]', { state: 'hidden' });
    await p.click('#album-sheet .fchip[data-f="diary"]'); await p.waitForTimeout(200);
    await p.evaluate(function () { [].forEach.call(document.querySelectorAll('#album-diary details.dday'), function (d) { d.open = true; }); });
    await p.waitForTimeout(300);
    var legRaw = await p.evaluate(function () { return [].map.call(document.querySelectorAll('#album-diary [data-raw]'), function (e) { return e.getAttribute('data-raw') + ':' + e.textContent; }); });
    await scan('옛 기록 · 앨범 일기', p);
    console.log('   옛 제목:', JSON.stringify(legRaw));
    extraOk.push(['옛 기록의 포스터 제목은 옛 저장 그대로 (data-raw player): ' + JSON.stringify(legRaw), legRaw.indexOf('player:오늘의 탐험 ✨') >= 0 && legRaw.indexOf('player:🎩 모자의 역사') >= 0]);
  });
  await side('깨진 기록', "if (!localStorage.getItem('__bk')) { localStorage.setItem('__bk', '1'); localStorage.setItem('ppolppol_v2', '{\"v\":2,\"octopus\":{\"name\":\"깨'); }", async function (p) {
    await scan('깨진 기록 (첫 화면)', p);
  });
  await side('저장소 막힘', "Storage.prototype.setItem = function () { throw new Error('막힘'); };", async function (p) {
    await scan('저장소 막힘 (첫 화면)', p);
    var nm = await p.$('#name-dialog[open]');
    if (nm) { await p.fill('#name-in', '뚜루'); await p.click('#name-form button[type=submit]'); await p.waitForTimeout(400); }
    var warn = await p.evaluate(function () { var w = document.getElementById('save-warn'); return w && !w.hidden ? w.textContent : ''; });
    await scan('저장소 막힘 (조용한 한 줄)', p);
    extraOk.push(['저장소가 막힌 브라우저: 조용한 한 줄이 보였다 (' + warn + ')', !!warn]);
  });
  extraOk.forEach(function (x) { ok(x[1], x[0]); });

  var bubs = bubAll;
  console.log('   본 말풍선: ' + JSON.stringify(bubs));
  ok(bubs.some(function (b) { return /^(찾았다!|처음 와 봤어!|음…|읽음|책장 메모)/.test(b) && /\[그림/.test(b); }) && bubs.some(function (b) { return /이거 가져온 날 \[그림/.test(b); }),
    '바깥 기웃 말풍선 · 기념품 말풍선: 말 뒤에 픽셀 그림 (이모지 대신)');
  ok(bubs.indexOf(MH.raw) >= 0, '모델이 준 네 가지 밖의 반응(줄 없이)은 마무리 말풍선에 그대로 (' + MH.raw + ')');
  var live = liveAll;
  live.forEach(function (x) { x.label = '잠깐 보인 글자'; if (!found.some(function (y) { return y.at === x.at && y.text === x.text; })) found.push(x); });
  console.log('   상태 ' + states + '곳 × 테마 둘 · 잠깐 보인 글자 검사 ' + live.length + '건');
  found.forEach(function (x) { console.log('   ✗ [' + x.label + '] ' + (x.theme || '') + ' ' + x.kind + ' ' + x.at + ' «' + x.chars + '» ' + x.text); });
  ok(!found.length, '플레이어 화면 어디에도 이모지 · 장식 기호 없음 · 남의 글 칸엔 원문만 (상태 ' + states + '곳 · 픽셀/시스템 테마)' + (found.length ? ' — ' + found.length + '건' : ''));
}
(async function main() {
  console.log('smoke: ' + (useStubs ? 'tools/stubs.js 주입' : '실제 js/world.js + js/brain.js') + ' · ' + INDEX);
  var browser = await chromium.launch();
  try {
    var only = String(process.env.SMOKE_ONLY || '').toUpperCase().split(/[,\s]+/).filter(Boolean);   /* SMOKE_ONLY=H,I → 그 시나리오만 */
    var all = [['A', function () { return scenarioMain(browser); }], ['B', function () { return scenarioFail(browser, 'missing', 'B. 문서 없음(missing) 응답'); }],
      ['C', function () { return scenarioFail(browser, 'abort', 'C. 요청 중단(abort)'); }], ['D', function () { return scenarioMigrate(browser); }],
      ['E', function () { return scenarioForcedHome(browser); }], ['F', function () { return scenarioMigrateExact(browser); }], ['G', function () { return scenario2D(browser); }],
      ['H', function () { return scenarioDay2(browser); }], ['I', function () { return scenarioCeremony(browser).then(function () { return scenarioCeremonyIntro(browser); }); }],
      ['W', function () { return scenarioWake(browser); }], ['V', function () { return scenarioDevPanel(browser); }], ['P', function () { return scenarioPlayer(browser); }],
      ['L', function () { return scenarioAlbumIcon(browser); }], ['N', function () { return scenarioNotes(browser); }], ['M', function () { return scenarioReactions(browser); }],
      ['R', function () { return scenarioRunner(); }], ['S', function () { return scenarioWave7(browser); }], ['J', function () { return scenarioWave8(browser); }], ['U', function () { return scenarioGlyphs(browser); }]];
    for (var sc of all) {   /* 한 시나리오가 터져도 (부하 큰 기계의 시간 초과 등) 뒤 시나리오는 돈다 — 터진 것은 실패 하나로 센다 */
      if (only.length && only.indexOf(sc[0]) < 0) continue;
      try { await sc[1](); } catch (e) { fails++; console.error('\nCRASH in ' + sc[0] + ': ' + (e && e.stack || e)); }
    }
  } catch (e) {
    fails++; console.error('\nCRASH: ' + (e && e.stack || e));
  } finally {
    await browser.close();
  }
  console.log('\n' + passes + ' passed, ' + fails + ' failed · shots → ' + SHOTS);
  process.exit(fails ? 1 : 0);
})();
