#!/usr/bin/env node
/* tools/smoke.js — Playwright 스모크 (§12.3). 실패하면 exit 1.
 *   node tools/smoke.js            # js/world.js, js/brain.js 가 있으면 그대로, 없으면 tools/stubs.js 주입
 *   SMOKE_STUBS=1 node tools/smoke.js   # 스텁 강제 주입
 *   SHOTS=/path node tools/smoke.js     # 스크린샷 폴더 변경
 * 추가 시나리오: E 강제 집에 있는 날(window.__ppolTest.forceKind='home'), F v1→v2 마이그레이션(과제 페이로드),
 *   H 이틀째 메모 인사·재방문·귀가 요약(window.__ppolTest.today='YYYY-MM-DD'), I 출발·귀가 의식(바깥 장면)·건너뛰기·나가 있는 중 새로고침.
 *   SMOKE_ONLY=H,I node tools/smoke.js   # 그 시나리오만
 * 시나리오: 이름 → 힌트 '모자의 역사' → 초대 → 건너뛰기 → 앨범 1·벽 1·등불 1 → 새로고침 → 그대로 →
 *           카드 탭 → 앞면 → 뒤집기 → 영수증 정류장 ≥2 → 스크린샷 (라이트/다크/앞면/뒷면)
 * 위키 fetch 는 page.route 로 가짜 응답: (A) 성공+썸네일+링크, (B) 문서 없음, (C) 요청 중단.
 */
'use strict';
var fs = require('fs'), path = require('path');
var { chromium } = require('playwright');

var ROOT = path.resolve(__dirname, '..');
var INDEX = 'file://' + path.join(ROOT, 'index.html');
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
async function pickName(page) {
  /* 이름에 따라 시드가 바뀐다. 오늘 시드로 '외출'이 되는 이름을 고른다(집에 있는 날도 정당한 결말이지만 영수증 정류장 ≥2 를 보려고). */
  return page.evaluate(async function () {
    var names = ['뚜루', '안개', '삐죠', '구름', '조약돌', '먹물', '단추', '파도', '이끼', '별'];
    var d = new Date(), dk = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    for (var n of names) {
      var seed = BRAIN.hashSeed(dk, '모자의 역사', 1, n);
      var t = await BRAIN.plan({ seed: seed, dateKey: dk, seq: 1, hint: '모자의 역사', name: n, state: { visits: {}, affinity: {}, lantern: 0, recent: [], todayOut: 0 }, now: d, online: false, by: 'demo' });
      if (t.kind === 'out' && t.receipt && t.receipt.stops.length >= 2) return n;
    }
    return names[0];
  });
}
async function waitIdle(page) {
  await page.waitForFunction(function () { var b = document.getElementById('btn-go'); return b && !b.disabled; }, null, { timeout: 30000 });
}

async function scenarioMain(browser) {
  console.log('\n== A. 성공 응답 (extract + thumb + links) · 핵심 루프');
  var s = await newPage(browser, 'ok');
  var page = s.page;
  await page.goto(INDEX);
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
  await page.waitForSelector('#btn-skip:not([hidden])', { timeout: 10000 });
  ok((await page.textContent('#btn-go')).indexOf('다녀오는 중') >= 0, '나가 있는 동안 버튼 라벨');
  ok(await page.evaluate(function () { return APP.state.trips.length === 1 && APP.state.trips[0].status === 'running'; }), 'running 여행이 저장됨');
  await page.waitForSelector('#log .lrow.typing, #log .lrow.c-amber', { timeout: 10000 });
  await page.waitForTimeout(1200);
  await page.click('#btn-skip');
  await waitIdle(page);
  var st = await page.evaluate(function () {
    var t = APP.state.trips[0];
    return { kind: t.kind, status: t.status, lantern: APP.state.room.lantern, trips: APP.state.octopus.trips, invites: APP.state.octopus.invites, days: APP.state.octopus.days.length,
      stops: t.receipt ? t.receipt.stops.length : 0, read: t.receipt ? t.receipt.counts.read : 0, hasPoster: !!t.poster, octState: APP.state.octopus.state, firstPeek: (t.events.filter(function (e) { return e.type === 'peek'; })[0] || {}).target };
  });
  console.log('   trip:', JSON.stringify(st));
  must(st.kind === 'out' && st.status === 'done', '여행 kind=out, done');
  ok(st.lantern === 1, '등불 1칸');
  ok(st.trips === 1 && st.invites === 1 && st.days === 1, '여행 1 · 초대 1 · 함께한 날 1');
  ok(st.stops >= 2, '정류장 ≥2 (' + st.stops + ')');
  ok(st.read >= 1, '성공 응답이면 read ≥1 (' + st.read + ')');
  ok(st.firstPeek && st.firstPeek.id === 'hat', "힌트 '모자의 역사' → 첫 정류장 hat");
  ok(st.octState === 'sleep', '마무리 뒤 문어 sleep');
  ok((await page.$$('#album .pcard')).length === 1, '앨범 카드 1개');
  ok((await wallCount(page)) === 1, '벽 썸네일 1개');
  ok((await page.$$('#pips .pip.on')).length === 1, '상태줄 pip 1개 켜짐');
  ok((await page.getAttribute('#pips', 'aria-label')) === '등불 1/8', 'pips aria-label');
  var strip = await page.evaluate(function () { var st = document.getElementById('status'), r = st.getBoundingClientRect(); return { h: r.height, txt: st.textContent.replace(/\s+/g, ' ').trim(), rows: st.querySelectorAll('.srow').length, nameTop: document.getElementById('oct-name').getBoundingClientRect().top, pipsTop: document.getElementById('pips').getBoundingClientRect().top, demo: !!document.getElementById('chip-demo'), stat: !!document.getElementById('stat-trips') }; });
  console.log('   strip:', JSON.stringify(strip));
  ok(strip.h <= 44 && strip.rows === 1 && Math.abs(strip.nameTop - strip.pipsTop) < 12, '상태 줄 한 줄 ≤44px (' + strip.h + 'px)');
  ok(/등불/.test(strip.txt) && /1\/8/.test(strip.txt) && !strip.demo && !strip.stat && !/여행|함께한 날/.test(strip.txt), "상태 줄: '등불 … 1/8', 데모 두뇌 칩·여행·함께한 날 없음");
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
  ok(/✅ 읽음|📚 책장 메모|❌ 못 읽음|🧪 모의 방문|◌/.test(logText), '로그에 읽기 상태 아이콘');
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
  ok(!/결과|리서치|보고/.test(logText), "로그에 '결과/리서치/보고' 없음");

  console.log('\n== 새로고침 → 그대로');
  await page.waitForTimeout(1000);   /* file:// 원점의 localStorage 커밋이 새로고침과 겹치지 않게 (3D 렌더로 바쁜 탭에서는 300ms 로는 간헐 실패) */
  await page.reload();
  await page.waitForSelector('#btn-go:not([disabled])');
  ok((await page.$$('#album .pcard')).length === 1, '새로고침 후 앨범 카드 1개');
  ok((await wallCount(page)) === 1, '새로고침 후 벽 썸네일 1개');
  ok((await page.$$('#pips .pip.on')).length === 1, '새로고침 후 등불 1칸');
  ok((await page.$$('#log .lrow')).length >= 5, '새로고침 후 로그가 trips 에서 다시 그려짐');
  ok(await page.evaluate(function () { return document.getElementById('oct').className.indexOf('st-sleep') >= 0; }), '새로고침 후 문어는 자고 있음');
  await page.screenshot({ path: path.join(SHOTS, 'phone-light.png') });

  console.log('\n== 카드 탭 → 모달 앞면 → 뒤집기 → 영수증');
  await page.click('#album .pcard');
  await page.waitForSelector('#poster-dialog[open]');
  ok(await page.$('#pd-front svg'), '앞면 SVG');
  ok(!(await page.evaluate(function () { return document.getElementById('flipper').classList.contains('flip'); })), '처음엔 앞면');
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(SHOTS, 'poster-front.png') });
  await page.click('#pd-flip');
  await page.waitForTimeout(reducedWait(700));
  ok(await page.evaluate(function () { return document.getElementById('flipper').classList.contains('flip'); }), '뒤집기 → .flip');
  var rows = await page.$$('#pd-back .receipt .row');
  ok(rows.length >= 2, '영수증 정류장 ≥2 (' + rows.length + ')');
  var back = await page.textContent('#pd-back');
  ok(back.indexOf('고른 이: 데모 두뇌(규칙)') >= 0, "영수증 '고른 이: 데모 두뇌(규칙)'");
  ok(back.indexOf('힌트') >= 0 && /따라감|무시함|도중에 벗어남/.test(back), '영수증 힌트 따름 표기');
  ok((await page.$$('#pd-back .receipt a[href^="https://ko.wikipedia.org"]')).length >= 1, 'read 항목에 출처 링크');
  await page.screenshot({ path: path.join(SHOTS, 'receipt-back.png') });
  await page.click('#pd-close');
  await page.waitForSelector('#poster-dialog[open]', { state: 'hidden' });

  console.log('\n== 다크 모드 · 방 보기');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(SHOTS, 'phone-dark.png') });
  await page.click('#btn-look');
  await page.waitForSelector('#room-sheet[open]');
  var rs = await page.textContent('#rs-body');
  ok(rs.indexOf('데모 두뇌') >= 0, '방 보기에 데모 두뇌 설명');
  ok(/여행\s*1/.test(rs) && /함께한 날\s*1/.test(rs), '방 보기 통계에 여행 1 · 함께한 날 1');
  ok(rs.indexOf('창가에 이끼 화분') >= 0, '방 보기 등불 1 문구');
  await page.screenshot({ path: path.join(SHOTS, 'room-sheet-dark.png') });
  await page.click('#rs-close');
  await page.emulateMedia({ colorScheme: 'light' });

  console.log('\n== 두 번째 초대 (같은 힌트, seq 2 → 다른 시드)');
  await page.fill('#hint-in', '모자의 역사');
  await page.click('#btn-go');
  await page.waitForSelector('#btn-skip:not([hidden])');
  await page.click('#btn-skip');
  await waitIdle(page);
  var two = await page.evaluate(function () { var t = APP.state.trips; return { n: t.length, seeds: t.map(function (x) { return x.seed; }), lantern: APP.state.room.lantern, days: APP.state.octopus.days.length }; });
  ok(two.n === 2 && two.seeds[0] !== two.seeds[1], '같은 힌트 두 번 → 다른 시드');
  ok(two.lantern === 2, '등불 2칸 (집이든 외출이든 +1)');
  ok(two.days === 1, '같은 날 → 함께한 날 그대로 1');
  ok((await page.$$('#album .pcard')).length >= 1, '앨범 카드 ≥1');

  console.log('\n== 이벤트 JSON 불러오기 (by: mcp)');
  var evs = [{ type: 'depart', t: 0, hint: '' }, { type: 'peek', t: 1000, target: { kind: 'room', id: 'hat', title: '모자' }, status: 'builtin', ms: 4000, note: '책장 메모' },
    { type: 'peek', t: 2000, target: { kind: 'url', url: 'https://example.org/x' }, status: 'simulated', ms: 0 }, { type: 'return', t: 3000, reason: 'enough' },
    { type: 'remember', t: 3500, stopIdx: 0, sticker: 'hat', line: '모델이 보낸 산책' }, { type: 'hang_poster', t: 4000 }, { type: 'wrap_up', t: 4500, reaction: '덤덤' }];
  await page.click('#demo summary');
  await page.fill('#d-json', JSON.stringify(evs));
  await page.click('#d-import');
  await page.waitForSelector('#btn-skip:not([hidden])');
  await page.click('#btn-skip');
  await waitIdle(page);
  var mcp = await page.evaluate(function () { var t = APP.state.trips[APP.state.trips.length - 1]; return { by: t.by, kind: t.kind, stops: t.receipt.stops.length, st: t.receipt.stops.map(function (s) { return s.status; }), lantern: APP.state.room.lantern }; });
  ok(mcp.by === 'mcp' && mcp.kind === 'out' && mcp.stops === 2, 'MCP 재생: by=mcp, 정류장 2');
  ok(mcp.st.indexOf('read') < 0, 'MCP 재생: 읽지 않은 것을 ✅ 로 올리지 않음');
  await page.click('#album .pcard:last-child');
  await page.waitForSelector('#poster-dialog[open]');
  ok((await page.textContent('#pd-back')).indexOf('고른 이: 모델(MCP)') >= 0, "영수증 '고른 이: 모델(MCP)'");
  await page.click('#pd-close');

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

  console.log('\n== 집에 있는 날 · 빈 차례 (이벤트 재생)');
  await page.fill('#d-json', JSON.stringify([{ type: 'stay_home', t: 0, activity: 'count_rain', line: '창가에서 빗방울을 세다가 잠들었어', anchor: 'window' }, { type: 'wrap_up', t: 2000, reaction: '졸림' }]));
  await page.click('#d-import'); await page.waitForSelector('#btn-skip:not([hidden])'); await page.click('#btn-skip'); await waitIdle(page);
  var home = await page.evaluate(function () { var t = APP.state.trips[APP.state.trips.length - 1]; return { kind: t.kind, type: t.poster && t.poster.type, trips: APP.state.octopus.trips, lantern: APP.state.room.lantern, log: document.getElementById('log').textContent }; });
  ok(home.kind === 'home' && home.type === 'note', '집에 있는 날 → 쪽지');
  ok(home.log.indexOf('오늘은 집. 등불 +1') >= 0 && !/미안|아쉽/.test(home.log), "로그 '오늘은 집. 등불 +1', 사과 문구 없음");
  await page.click('.fchip[data-f="note"]');
  ok((await page.$$('#album .pcard.note')).length >= 1, '앨범 필터 쪽지 → 쪽지 카드');
  await page.click('#album .pcard.note'); await page.waitForSelector('#poster-dialog[open]');
  ok((await page.textContent('#pd-back')).indexOf('오늘은 집. 등불 +1') >= 0, "쪽지 뒷면 '오늘은 집. 등불 +1'");
  await page.screenshot({ path: path.join(SHOTS, 'note-front.png') });
  await page.click('#pd-close'); await page.click('.fchip[data-f="all"]');
  var before = await page.evaluate(function () { return { l: APP.state.room.lantern, n: APP.state.trips.length, tr: APP.state.octopus.trips }; });
  await page.fill('#d-json', JSON.stringify([{ type: 'empty_turn', t: 0 }]));
  await page.click('#d-import'); await waitIdle(page);
  var empty = await page.evaluate(function () { var t = APP.state.trips[APP.state.trips.length - 1]; return { kind: t.kind, poster: t.poster, l: APP.state.room.lantern, n: APP.state.trips.length, tr: APP.state.octopus.trips }; });
  ok(empty.kind === 'empty' && !empty.poster && empty.l === Math.min(8, before.l + 1) && empty.n === before.n + 1 && empty.tr === before.tr, '빈 차례: 포스터 없음, 등불 +1, 여행 수 그대로');
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
  await page.waitForSelector('#btn-skip:not([hidden])');
  await page.click('#btn-skip');
  await waitIdle(page);
  var r = await page.evaluate(function () { var t = APP.state.trips[0]; return { kind: t.kind, st: t.receipt ? t.receipt.stops.map(function (x) { return x.status; }) : [], lantern: APP.state.room.lantern }; });
  console.log('   statuses:', JSON.stringify(r.st));
  ok(r.kind === 'out', 'kind=out');
  ok(r.st.indexOf('read') < 0, 'fetch 실패 → ✅ read 없음 (정직하게 builtin/failed)');
  ok(r.st.length >= 2 && r.st.every(function (x) { return ['builtin', 'failed', 'none', 'simulated'].indexOf(x) >= 0; }), '상태값이 허용 집합 안');
  ok(r.lantern === 1, '실패해도 등불은 켜진다');
  await page.click('#album .pcard');
  await page.waitForSelector('#poster-dialog[open]');
  await page.click('#pd-flip');
  var back = await page.textContent('#pd-back');
  ok(back.indexOf('✅') < 0, '영수증에 ✅ 없음');
  ok(back.indexOf('📚') >= 0 || back.indexOf('❌') >= 0, '영수증에 📚 또는 ❌');
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
  await page.waitForSelector('#btn-go:not([disabled])');
  var m = await page.evaluate(function () { return { name: APP.state.octopus.name, trips: APP.state.octopus.trips, invites: APP.state.octopus.invites, lantern: APP.state.room.lantern, n: APP.state.trips.length, by: APP.state.trips[0].by, line: APP.state.trips[0].poster.line, bak: !!localStorage.getItem('ppolppol_v1_backup'), v1: localStorage.getItem('ppolppol_v1'), v2: !!localStorage.getItem('ppolppol_v2') }; });
  ok(m.name === '옛문어' && m.trips === 3 && m.invites === 4 && m.lantern === 2, '이름·여행·초대(hearts)·등불 이전');
  ok(m.n === 2 && m.by === 'legacy' && m.line.indexOf('복원된 포스터') >= 0, '옛 포스터 → legacy 여행 (정직한 문구)');
  ok(m.bak && !m.v1 && m.v2, 'ppolppol_v1 → ppolppol_v1_backup 로 이름만 바꿈, v2 저장');
  ok((await page.$$('#album .pcard')).length === 2, '복원 포스터 카드 2개');
  ok(await page.$('#log details.lday'), '지난 날 로그는 details 로 접힘');
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
  await page.waitForSelector('#btn-go:not([disabled])');
  await page.waitForFunction(function () { return APP.state.trips.every(function (t) { return t.status === 'done'; }); });
  var rr = await page.evaluate(function () { return { lantern: APP.state.room.lantern, invites: APP.state.octopus.invites, log: document.getElementById('log').textContent, oct: document.getElementById('oct').className }; });
  console.log('   resume:', JSON.stringify({ lantern: rr.lantern, invites: rr.invites, oct: rr.oct.trim(), tail: rr.log.slice(-60) }));
  ok(rr.lantern === 3 && rr.invites === 5, 'running 여행 즉시 귀가 처리 (등불 +1, 초대 +1)');
  ok(rr.log.indexOf('네가 없는 동안 다녀왔어') >= 0, "'네가 없는 동안 다녀왔어' 로그");
  ok(rr.oct.indexOf('st-sleep') >= 0 || rr.oct.indexOf('st-idle') >= 0, '복구 뒤 문어 상태 유효 (' + rr.oct.trim() + ')');
  /* 축소 모션에서도 초대 한 번 (즉시 이동 경로) */
  await page.fill('#hint-in', 'https://example.org/page');
  ok((await page.textContent('#hint-help')).indexOf('모의 방문') >= 0, 'URL 힌트 도움말');
  await page.click('#btn-go');
  await page.waitForSelector('#btn-skip:not([hidden])');
  await page.click('#btn-skip');
  await waitIdle(page);
  var u = await page.evaluate(function () { var t = APP.state.trips[APP.state.trips.length - 1]; return { kind: t.kind, st: t.receipt ? t.receipt.stops.map(function (x) { return x.status; }) : [] }; });
  ok(u.kind !== 'out' || u.st[0] === 'simulated', 'URL 힌트 → 첫 정류장 simulated(🧪) (' + JSON.stringify(u) + ')');
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
  await page.waitForSelector('#btn-skip:not([hidden])');
  await page.click('#btn-skip');
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
  await page.waitForSelector('#btn-go:not([disabled])');
  var m = await page.evaluate(function () {
    var t = APP.state.trips[0];
    return { name: APP.state.octopus.name, trips: APP.state.octopus.trips, invites: APP.state.octopus.invites, lantern: APP.state.room.lantern,
      n: APP.state.trips.length, by: t && t.by, kind: t && t.kind, line: t && t.poster && t.poster.line, title: t && t.poster && t.poster.title, events: t && t.events.length, receipt: t && t.receipt,
      pips: document.querySelectorAll('#pips .pip.on').length, pipsN: (document.querySelector('#pips .pips-n') || {}).textContent, nameEl: document.getElementById('oct-name').textContent,
      rsStats: (function () { APP.openRoomSheet(false); var t = document.querySelector('#rs-body .stats').textContent; document.getElementById('room-sheet').close(); return t; })(),
      bak: localStorage.getItem('ppolppol_v1_backup'), v1: localStorage.getItem('ppolppol_v1'), cards: document.querySelectorAll('#album .pcard').length, nameDlg: !!document.querySelector('#name-dialog[open]') };
  });
  ok(m.name === '뚜루' && m.nameEl === '뚜루', '이름 뚜루 유지');
  ok(m.lantern === 2 && m.pips === 2 && m.pipsN === '2/8', '등불 2 (light_level) · pip 2 · 2/8');
  ok(m.trips === 3 && /여행\s*3/.test(m.rsStats), '여행 3 (total_trips) — 방 보기 통계');
  ok(m.invites === 4, '초대 4 (hearts)');
  ok(m.n === 1 && m.by === 'legacy' && m.kind === 'out' && m.events === 0 && m.receipt === null, '옛 포스터 1 → by:legacy, events 없음, receipt 없음');
  ok(m.title === '옛 포스터' && m.line === '(복원된 포스터 · 기록 없음)', "legacy 카드 한 줄 '(복원된 포스터 · 기록 없음)'");
  ok(m.cards === 1 && !m.nameDlg, '앨범 카드 1 · 이름 모달 없음');
  ok(m.bak && JSON.parse(m.bak).octopus.name === '뚜루' && m.v1 === null, 'ppolppol_v1 → ppolppol_v1_backup (내용 보존)');
  await page.click('#album .pcard');
  await page.waitForSelector('#poster-dialog[open]');
  var front = await page.textContent('#pd-front');
  ok(front.indexOf('복원된 포스터') >= 0, '앞면에 복원 문구');
  await page.click('#pd-flip');
  await page.waitForTimeout(700);
  var back = await page.textContent('#pd-back');
  ok(back.indexOf('기록은 남아 있지 않아') >= 0 && back.indexOf('✅') < 0, '뒷면: 기록 없음 정직 표기, 읽음 주장 없음');
  ok(back.indexOf('고른 이') >= 0, "뒷면 '고른 이' 표기");
  await page.click('#pd-close');
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
    await page.waitForSelector('#btn-skip:not([hidden])', { timeout: 10000 });
    await page.click('#btn-skip');
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
  await page.waitForSelector('#btn-go:not([disabled])');
  await page.waitForTimeout(400);
  var g = await page.evaluate(function (d) {
    var sec = document.querySelector('#log .lday[data-day="' + d + '"]'), rows = sec ? sec.querySelectorAll('.lrow') : [];
    return [].map.call(rows, function (r) { return { label: r.querySelector('.ltool').textContent, text: r.querySelector('.ltext').textContent, expr: r.dataset.expr || null, dialog: r.classList.contains('dialog') }; });
  }, DAY2);
  console.log('   day2 greeting:', JSON.stringify(g));
  ok(g.length === 2 && g[0].label === '인사', '2일째: 시각 인사 행');
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
  await page.waitForSelector('#btn-go:not([disabled])');
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
function hasLabel(page, label) { return page.evaluate(function (lb) { return [].some.call(document.querySelectorAll('#log .lrow .ltool'), function (e) { return e.textContent === lb; }); }, label); }
async function scenarioCeremony(browser) {
  console.log('\n== I. 출발·귀가 의식 · 바깥 장면 (§15.3)');
  var s = await newPage(browser, 'ok', [{ content: "window.__ppolTest = { forceKind: 'out' };" }, { content: PLACE_PROBE }]);
  var page = s.page;
  await page.goto(INDEX + '?slow=0.5');   /* --speed 0.5: 공개 간격·의식 모두 절반 */
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
  var away = await page.evaluate(function () { return { place: APP.scene.place(), cer: APP.scene.ceremony(), oct: document.getElementById('oct').className, busy: document.getElementById('btn-go').disabled, ink: window.__ink, log: window.__placeLog.slice() }; });
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
    ok(awayB.every(function (b) { return b.skin === b.kind; }), 'UI 아트 말풍선 모양 = 상태별 종류');
  }
  ok(!bub.all.some(function (b) { return b.place === 'attic' && /찾았다/.test(b.text); }), "다락에선 '찾았다' 말풍선 없음");
  await page.screenshot({ path: path.join(SHOTS, 'phone-returned-attic.png') });

  console.log('\n== I-2. 출발 의식 중 건너뛰기 → 다락');
  await page.evaluate(function () { window.__placeLog = [APP.scene.place()]; });
  await page.fill('#hint-in', '');
  await page.click('#btn-go');
  if (mode === '3d') await page.waitForFunction(function () { return APP.scene.ceremony() === 'depart'; }, null, { timeout: 10000 });
  await page.waitForSelector('#btn-skip:not([hidden])');
  await page.click('#btn-skip');
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
  await page.waitForSelector('#btn-go:not([disabled])');
  await page.waitForFunction(function () { return APP.state.trips.every(function (t) { return t.status === 'done'; }); }, null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  var rl = await page.evaluate(function () { return { log: window.__placeLog.slice(), place: APP.scene.place(), text: document.getElementById('log').textContent, oct: document.getElementById('oct').className, busy: document.getElementById('btn-go').disabled, n: APP.state.trips.length }; });
  console.log('   reload:', JSON.stringify({ log: rl.log, place: rl.place, oct: rl.oct.trim(), trips: rl.n }));
  ok(rl.n === 3, '새로고침 뒤 여행 3건 그대로 (미러 복구 포함)');
  ok(rl.log.indexOf('exterior') < 0 && rl.place === 'attic', '새로고침 뒤 바깥은 한 번도 안 보임 (' + rl.log.join('>') + ')');
  ok(rl.text.indexOf('네가 없는 동안 다녀왔어') >= 0 && /st-(sleep|idle)/.test(rl.oct) && !rl.busy, "'네가 없는 동안 다녀왔어' · 문어 유효 · 버튼 활성");

  console.log('\n== I-4. 계절: 방 보기 한 줄 · 데모 패널 지정 (룩 설정에 저장)');
  var mo = new Date().getMonth() + 1, KO = mo >= 3 && mo <= 5 ? '봄' : mo >= 6 && mo <= 8 ? '여름' : mo >= 9 && mo <= 11 ? '가을' : '겨울';
  async function seasonLine() { await page.click('#btn-look'); await page.waitForSelector('#room-sheet[open]'); var t = await page.textContent('#rs-season'); await page.click('#rs-close'); return t; }
  var l1 = await seasonLine();
  ok(l1 === '계절: ' + KO + ' (실제 날짜)', '방 보기: "' + l1 + '"');
  await page.click('#demo summary');
  ok((await page.$$('#dv-season .fchip')).length === 5 && (await page.textContent('#dv-season .fchip.on')) === '자동', '데모 패널 계절 칩 5 (자동 켜짐)');
  var other = KO === '겨울' ? ['summer', '여름'] : ['winter', '겨울'];
  await page.click('#dv-season .fchip[data-season="' + other[0] + '"]');
  var ov = await page.evaluate(function () { return { season: APP.scene.season(), mode: APP.scene.seasonMode(), saved: JSON.parse(localStorage.getItem('ppolppol_look') || '{}').season }; });
  ok(ov.season === other[0] && ov.mode === other[0] && ov.saved === other[0], '지정 → scene.setSeason · ppolppol_look.season 저장 (' + JSON.stringify(ov) + ')');
  ok((await seasonLine()) === '계절: ' + other[1] + ' (지정)', '방 보기: 계절: ' + other[1] + ' (지정)');
  await page.reload();
  await page.waitForSelector('#btn-go:not([disabled])');
  var ov2 = await page.evaluate(function () { var on = document.querySelector('#dv-season .fchip.on'); return { season: APP.scene.season(), on: on ? on.dataset.season : null, ls0: window.__lsLen0 }; });
  /* 룩 설정(ppolppol_look)은 기록과 달리 탭 미러가 없다 → 크로미움 빈 스냅숏 경합(H 원인과 같은 것)이 나면 지정이 사라지는 게 정상. 그때만 건너뛴다 */
  if (ov2.ls0 === 0) console.log('   (새로고침 직후 localStorage 빈 스냅숏 경합 — 룩 설정 유지 검사 건너뜀)');
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
  await page.click('#btn-skip');
  await waitIdle(page);
  var r = await page.evaluate(function () { return { place: APP.scene.place(), cer: APP.scene.ceremony(), st: APP.state.trips[0].status, oct: APP.state.octopus.state }; });
  ok(r.place === 'attic' && r.cer === '' && r.st === 'done' && r.oct === 'sleep' && (await wallCount(page)) === 1, '건너뛰기 → 다락 · 포스터 1 · 잠 (' + JSON.stringify(r) + ')');
  await page.click('#btn-go');
  await page.waitForFunction(function () { return APP.oct.state === 'away' && APP.scene.place() === 'exterior'; }, null, { timeout: 20000 });
  await page.reload();
  await page.waitForFunction(function () { return window.APP && APP.state.trips.length === 2 && APP.state.trips.every(function (t) { return t.status === 'done'; }); }, null, { timeout: 15000 });
  var mid = await page.evaluate(function () { return { intro: window.INTRO ? INTRO.phase : 'none', log: window.__placeLog.slice() }; });
  if (await page.$('#intro')) await page.click('#intro', { force: true });
  await page.waitForSelector('#btn-go:not([disabled])', { timeout: 15000 });
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
  await page.fill('#hint-in', '모자의 역사');
  await page.click('#btn-go');
  await page.waitForSelector('#btn-skip:not([hidden])', { timeout: 10000 });
  await page.click('#btn-skip');
  await page.waitForSelector('#btn-go:not([disabled])', { timeout: 30000 });
  ok((await page.evaluate(function () { return APP.state.room.lantern; })) === 1, '2D 폴백에서도 등불 1');
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
/* R. 다락방 달리기 (js/runner.js): 방 보기 → 같이 놀기 → 6초 스크립트 탭 → 부딪힘 또는 닫기 → 저장된 판의 simulate() 점수 = 화면 점수.
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
    await page.click('#btn-look');
    await page.waitForSelector('#room-sheet[open]');
    must(await page.$('#room-sheet #rs-play'), '방 보기 시트에 "같이 놀기" 버튼');
    await page.click('#rs-play');
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
    if (ended !== 'over') ok(res.focus === 'rs-play', '닫으면 "같이 놀기" 버튼으로 포커스가 돌아감');
    fs.writeFileSync(path.join(EVD, 'runner-live-run.json'), JSON.stringify(Object.assign({ displayed: res.shown }, res.run), null, 1));

    /* 게임 오버 화면: 입력 없이 한 판 (첫 상자에 부딪힘) */
    if (ended === 'over') await page.click('#rn-again'); else await page.click('#rs-play');
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
(async function main() {
  console.log('smoke: ' + (useStubs ? 'tools/stubs.js 주입' : '실제 js/world.js + js/brain.js') + ' · ' + INDEX);
  var browser = await chromium.launch();
  try {
    var only = String(process.env.SMOKE_ONLY || '').toUpperCase().split(/[,\s]+/).filter(Boolean);   /* SMOKE_ONLY=H,I → 그 시나리오만 */
    var all = [['A', function () { return scenarioMain(browser); }], ['B', function () { return scenarioFail(browser, 'missing', 'B. 문서 없음(missing) 응답'); }],
      ['C', function () { return scenarioFail(browser, 'abort', 'C. 요청 중단(abort)'); }], ['D', function () { return scenarioMigrate(browser); }],
      ['E', function () { return scenarioForcedHome(browser); }], ['F', function () { return scenarioMigrateExact(browser); }], ['G', function () { return scenario2D(browser); }],
      ['H', function () { return scenarioDay2(browser); }], ['I', function () { return scenarioCeremony(browser).then(function () { return scenarioCeremonyIntro(browser); }); }], ['R', function () { return scenarioRunner(); }]];
    for (var sc of all) if (!only.length || only.indexOf(sc[0]) >= 0) await sc[1]();
  } catch (e) {
    fails++; console.error('\nCRASH: ' + (e && e.stack || e));
  } finally {
    await browser.close();
  }
  console.log('\n' + passes + ' passed, ' + fails + ' failed · shots → ' + SHOTS);
  process.exit(fails ? 1 : 0);
})();
