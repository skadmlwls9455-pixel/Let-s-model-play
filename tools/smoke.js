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
 *   S 7물결(주인 11-07): 플레이어 화면에 '방 보기' 없음 · ⚙ 설정(문어 색 · 내 모습(11-09 옷장 시트 — 설정엔 요약 줄 + 모습 바꾸기) · 소리 · 화면 · 기록 · 누가 고르나) · 소리 켜기는 설정 › 소리 맨 위 '켜기' 체크 칸 (11-08 — 장면 위 스피커 없음) · 등불·데모 말풍선 · 큰 버튼 건너뛰기(두 번 톡 보호) ·
 *     놀이방 문 → (8물결) 놀이방 → 오락기 → 달리기 창이 열린 채로 산책이 끝까지 (문 소리 훅 · 잠들 때 반응 훅 · 구석 쪽지) · 자정 넘김 → 오늘 칸만 · 앨범(문어의 요즘 · 일기 탭: 지난 날, 새 날 먼저).
 *   J 8물결: 다락 안 놀이방 문(투명 단추) → 진짜 놀이방 · 오락기 → 달리기 · 키보드 왕복 · 산책 중 놀이방(끌려 나가지 않음 · 구석 쪽지 · 보러 가기) · 두뇌 입력 0 · 모션 줄이기 컷 · 새로고침 · 2D.
 *   T 톡 한 줄(주인 11-08: 깨어 있으면 그 차례 한 줄 · 말풍선만 · 모델 줄은 그대로 24자 + … · 다음 날 · 빈 차례 '응?') · 깨어 있는 틈 → 잠 훅 한 번 · 장면 말풍선 맞추기(T-2),
 *   K 다녀오는 중… 을 눌러 데려오기: 기록은 안 데려온 것과 같다 · 짧은 귀가(문 · 토스트 · 등불 · 방 줄) · 두 번 눌러도 그대로 · 모션 줄이기 · 모델 차례.
 *   O 한 화면 배치(주인 11-08 · 3D 일 때 data-layout=one): 장면이 창을 다 씀 · 오늘의 산책 쪽지(단추 · Enter · Esc · 바깥 톡) · 닫아 둔 사이 새 줄 = 점 + 한 줄 알림(data-raw 그대로) ·
 *     혼잣말은 낭독기 한 줄만 · 대사 자리(APP.dlgDemo, 개발 모드) · 3D 가 멈추면 위아래 배치(2D) · 플레이어 화면 스크롤 없음 · 저장 경고 띠. 치수 · 사진은 tools/layout-shots.js
 *   O (둘째 묶음 — 같은 글자로 같이 돈다) 첫 실행 몸 색 (주인 11-08 밤 · docs/SALON.md §1): 이름 창 색 6칸 · 창 안 초상만 미리 보기 · 저장 때 장면 한 번 · by player/default · 320 px 높이 ·
 *     옛 기록 by migrated · 전체 초기화 → 다시 고름 · 설정 개발용 '바로 바꾸기'는 ?dev=1 탭만 (input 은 미리 보기 · change 한 번 = 기록 한 줄).
 *   Y 미용실 (주인 11-08 밤 · docs/SALON.md §3): 거울 단추 (손가락 톡으로도 열린 채 · 놀이방 · 위층 옷방 · 가구 배치 중엔 숨음) · 병 시트 (뒤 막 없음 · 지금 색 · 고르기 · 그만두기 = 기록 0) · 폭 · 테마 12 가지 ·
 *     밀어 둔 화면은 기본 구도로 · 묻기 → 행이 박자에 맞춰 (닫힌 쪽지 안 + 한 줄 알림) · 장면은 끝까지 옛 색 · 하루 한 번 (토스트) · 데모 시드 답 · 연출 중 새로고침 · '그대로' 한 색 7일 쉼 ·
 *     모션 줄이기 4.5 s · 연출 중 주 버튼 · 자는 문어 '쿨쿨…' · 앨범 일기 · 옷 물들이기(재봉틀)와 몸 색은 따로 · 개발용 '다음 대답' (?dev=1 만) · 2D.
 *   X 바깥 텃밭 (검증 11-11): 흙 · 심은 것을 톡 하면 그 칸 (세 크기) · 울타리 자리 문어 · 키보드 · 단추 이름 · 2D 글 · 모르는 꽃 색 · 다른 탭 · 불러오기 · 초기화 뒤 살림 · 씨앗 그림 · 울타리.
 *   (모든 문맥은 window.__ppolAwakeMs = 0 으로 시작 — 예전 시나리오는 '산책 직후 잠'. T · K 가 덮는다)
 *   SMOKE_ONLY=H,I node tools/smoke.js   # 그 시나리오만
 *   SMOKE_THROTTLE=4 node tools/smoke.js # 페이지 CPU 를 4배 늦춘다 (느린 CI 러너 흉내 — 시간에 기대는 검사의 경합을 여기서 다시 낸다)
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
var THROTTLE = +process.env.SMOKE_THROTTLE || 0;
fs.mkdirSync(SHOTS, { recursive: true });

var fails = 0, passes = 0;
function ok(cond, msg) { if (cond) { passes++; console.log('  ok   ' + msg); } else { fails++; console.error('  FAIL ' + msg); } }
/* '전체 초기화' 는 4 초 안에 두 번 눌러야 한다 (첫 누름은 '정말?' 로 무장 — js/app.js 의 4000 ms). 바쁜 기계에서는 Playwright 의 click 두 번
   사이가 4 초를 넘겨 (6~10 초까지 봤다) 무장이 풀리고 초기화가 안 일어나, 뒤따르는 이름 창 기다림이 시간 초과로 죽었다 (11-10 · 게임 버그가 아니라
   이 시험이 느린 기계에 약했던 것). 두 누름을 evaluate 한 번 안에서 한다: 첫 누름 → 무장 글 확인 → 바로 한 번 더 */
async function resetTwice(pg) {
  try { return await pg.evaluate(function () { var b = document.getElementById('set-reset'); b.click(); var armed = /정말/.test(b.textContent); b.click(); return armed; }); }
  catch (e) { return null; }   /* 초기화가 쪽을 다시 그리며 evaluate 가 끊겨도 된다 — 결과는 뒤의 이름 창 기다림이 본다 */
}
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
  /* 11-08 깨어 있는 틈: 돌아온 뒤 90 s 깨어 있다가 잔다 — 예전 시나리오는 '산책 직후 잠' 을 보므로 훅 0 으로 (이 문맥의 모든 탭. 새 시나리오 T · K 는 페이지 init 으로 덮는다) */
  await ctx.addInitScript({ content: 'window.__ppolAwakeMs = 0;' });
  var page = await ctx.newPage();
  if (THROTTLE > 1) { try { await (await ctx.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: THROTTLE }); } catch (e) { console.log('   (CPU 늦추기 실패: ' + e.message + ')'); } }
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
/* 한 화면 배치(3D): 로그는 '오늘의 산책' 쪽지(#log-sheet) 안에 있다 — 닫힌 쪽지 안의 로그는 크기가 없어서, 로그의 모양 · 자리(아이콘 폭 · 잘림 · 스크롤)를 재는 검사는 쪽지를 열고 잰다.
   여닫는 길은 플레이어와 같이 오늘 단추(#btn-today) · 닫기 단추(#log-close). 위아래 배치(2D)에선 아무것도 안 한다. 돌려주는 값: 한 화면 배치인지 */
async function logSheetOf(pg, on) {
  var st = await pg.evaluate(function () { var d = document.getElementById('log-sheet'); return { one: document.documentElement.getAttribute('data-layout') === 'one', open: !!(d && d.open) }; });
  if (!st.one || st.open === on) return st.one;
  if (on) { await pg.click('#btn-today'); await pg.waitForSelector('#log-sheet[open]', { timeout: 5000 }); }
  else { await pg.click('#log-close'); await pg.waitForFunction(function () { return !document.querySelector('#log-sheet[open]'); }, null, { timeout: 5000 }); }
  return true;
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
  /* 큰 버튼이 '뽈뽈 다녀와' 로 돌아오고, 막 데려온 뒤 연달아 누름으로 받지 않는 짧은 틈(APP.goResting — 모션 줄이기면 귀가가 한 프레임이라 다음 초대가 그 안에 온다)도 지난 뒤 */
  await page.waitForFunction(function () { var b = document.getElementById('btn-go'); return b && !b.classList.contains('away') && !(window.APP && APP.goResting); }, null, { timeout: ms || 30000 });
}
/* 8물결: 그림 위 문 · 오락기 단추는 pointer-events: none (톡은 장면이 받아 그린 순서대로 단추를 누른다). 진짜 손가락처럼 그 단추 칸 안에서
   장면이 그 단추로 고르는 자리(3D = pickAt 'spot', 2D = 문어가 아닌 그림)를 찾아 마우스로 누른다 — 문 앞에 문어가 서 있으면 문어 몸은 피한다 */
async function clickSpot(pg, sel) {
  var pt = await pg.evaluate(function (sel) {
    var b = document.querySelector(sel); b.scrollIntoView({ block: 'nearest' });
    var r = b.getBoundingClientRect(), oct = document.getElementById('oct'), id = { 'btn-door': 'atticPlay', 'btn-play-door': 'playAttic', 'btn-machine': 'machine', 'btn-salon': 'salon' }[b.id], F = [0.5, 0.35, 0.65, 0.2, 0.8, 0.1, 0.9];
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
  await page.screenshot({ path: path.join(SHOTS, 'phone-light-start.png') });

  await page.evaluate(function (h) { window.__ppolTest = Object.assign(window.__ppolTest || {}, { hint: h }); }, '모자의 역사');   /* 힌트 칸은 없앴다 (11-10) — 두뇌의 옛 길은 테스트 훅으로만 */
  await page.click('#btn-go');
  await page.waitForSelector('#btn-go.away', { timeout: 10000 });
  ok((await page.textContent('#btn-go')).indexOf('다녀오는 중') >= 0, '나가 있는 동안 버튼 라벨');
  ok(await page.evaluate(function () { return APP.state.trips.length === 1 && APP.state.trips[0].status === 'running'; }), 'running 여행이 저장됨');
  /* 한 화면 배치 (주인 11-08): 3D 에선 기록(#log)이 닫힌 '오늘 기록' 시트 안에 있어 눈에 안 보인다 — 줄이 '생겼는지'(attached)만 기다린다. 2D 폴백에선 예전처럼 보이는 자리 */
  await page.waitForSelector('#log .lrow.typing, #log .lrow.c-amber', { state: 'attached', timeout: 10000 });
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
      tag: tg && !tg.hidden && tr.width > 0 && tr.left >= r.left - 0.5 && tr.right <= r.right + 0.5 && tr.top >= r.top - 0.5 && tr.bottom <= r.bottom + 24 ? tg.querySelector('[aria-hidden="true"]').textContent : null, tagSr: tg ? (tg.querySelector('.sr-only') || {}).textContent : null, tagFs: tg ? parseFloat(getComputedStyle(tg).fontSize) : 0 };
  });
  console.log('   strip:', JSON.stringify(strip));
  ok(strip.h <= 44 && strip.rows === 1 && Math.abs(strip.nameTop - strip.pipsTop) < 12, '상태 줄 한 줄 ≤44px (' + strip.h + 'px)');
  ok(/등불/.test(strip.txt) && /1\/8/.test(strip.txt) && !strip.demo && !strip.stat && !/여행|함께한 날/.test(strip.txt), "상태 줄: '등불 … 1/8', 예전 데모 두뇌 칩·여행·함께한 날 없음");
  ok(strip.tag === '데모' && strip.tagSr === '데모 규칙이 움직이는 중' && strip.tagFs <= 11, "상태 줄(좁으면 바로 아래)의 작은 '데모' 표시 (" + strip.tagFs + "px, 화면 낭독기 '데모 규칙이 움직이는 중')");
  ok(!(await page.$('#hint-in')) && !(await page.$('#hint-box')), '힌트 칸은 개발 화면에도 없다 (11-10 에 없앰)');
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
  /* UI 아트 (css/ui-art.css · js/ui-art.js, docs/UI_ART.md) — 픽셀 모드. 한 화면 배치에선 쪽지를 열고 잰다 (아이콘 폭 · 보이는 라벨) */
  await logSheetOf(page, true);
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
  await logSheetOf(page, false);
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
  /* 연결된 방이 있으면 설정에 '방의 언어' 고르기가 생긴다 (다국어 11-10). select 는 가장 긴 option 만큼 넓어져서, 첫 칸 '자동 · Claude 대화를 따라감 (지금 한국어)' 가
     360 px 에서 시트보다 114 px 넓었고 시트가 옆으로 밀렸다 → 가장 긴 이름 (Bahasa Indonesia) 으로 잰다. 방은 이 검사 동안만 넣는다 (저장하지 않고 서버에 묻지 않는다) */
  await page.waitForSelector('#settings-sheet[open]', { state: 'hidden' });
  await page.evaluate(function () { APP.state.settings.claudeRoom = { key: new Array(41).join('k'), mcp: 'https://example.invalid/api/mcp/k', last: null, lang: 'id', pin: false }; });
  await page.click('#btn-settings');
  await page.waitForSelector('#set-claude-lang');
  var lp = await page.evaluate(function () {
    var d = document.getElementById('settings-sheet'), sel = document.getElementById('set-claude-lang'), cs = getComputedStyle(d);
    var o = { first: sel.options[0].text, n: sel.options.length, sel: Math.round(sel.getBoundingClientRect().width), room: Math.round(d.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)), side: d.scrollWidth - d.clientWidth };
    APP.state.settings.claudeRoom = null;   /* 되돌린다 (저장한 적 없음 — 아래 saved 가 본다) */
    o.saved = !!(JSON.parse(localStorage.getItem('ppolppol_v2') || '{}').settings || {}).claudeRoom;
    return o;
  });
  ok(lp.first === '자동 (지금 Bahasa Indonesia)' && lp.n === 11 && lp.sel <= lp.room && lp.side === 0 && !lp.saved, "설정 › 방의 언어 고르기 (연결된 방 · 자동 + 가장 긴 이름 · 360 px): 시트 안에 들어가고 시트가 옆으로 밀리지 않음 " + JSON.stringify(lp));
  await page.click('#set-close');
  await page.waitForSelector('#settings-sheet[open]', { state: 'hidden' });

  console.log('\n== 두 번째 초대 (같은 힌트, seq 2 → 다른 시드)');
  await page.evaluate(function (h) { window.__ppolTest = Object.assign(window.__ppolTest || {}, { hint: h }); }, '모자의 역사');   /* 힌트 칸은 없앴다 (11-10) — 두뇌의 옛 길은 테스트 훅으로만 */
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
  /* 출처 이름은 읽은 위키의 것 (다국어 11-10): 일기는 저장된 attribution 이 아니라 주소의 언어로 적는다 — 옛 기록에는 ja · en … 을 읽고도 'Wikipedia (ko)' 가 적혀 있다. ko 와 라이선스는 그대로 */
  var sl = await page.evaluate(function () {
    function stop(l, saved) { return { name: 'T', status: 'read', ms: 1000, note: 'x', source: { url: 'https://' + l + '.wikipedia.org/wiki/Hat', extract: 'x', license: 'CC BY-SA 4.0', attribution: saved } }; }
    var t = { by: 'mcp', kind: 'out', date: '2026-11-10', seq: 9, hint: { raw: '' }, receipt: { stops: [stop('ja', 'Wikipedia (ko)'), stop('en', 'Wikipedia (ko)'), stop('hi'), stop('ko', 'Wikipedia (ko)')], counts: { read: 4 } } };
    var d = document.createElement('div'); d.innerHTML = APP.receiptHTML(t);
    return [].map.call(d.querySelectorAll('.row a'), function (a) { return a.textContent; });
  });
  ok(sl.join(' | ') === ['ja', 'en', 'hi', 'ko'].map(function (l) { return '출처: Wikipedia (' + l + ') · CC BY-SA 4.0'; }).join(' | '), '일기: 출처 이름은 읽은 위키의 것 (저장된 이름이 달라도 주소의 언어로) ' + JSON.stringify(sl));

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
  var home = await page.evaluate(function () { var t = APP.state.trips[APP.state.trips.length - 1]; return { id: t.id, kind: t.kind, type: t.poster && t.poster.type, trips: APP.state.octopus.trips, lantern: APP.state.room.lantern, log: document.getElementById('log').textContent }; });
  ok(home.kind === 'home' && home.type === 'note', '집에 있는 날 → 쪽지');
  ok(home.log.indexOf('오늘은 집. 등불 +1') >= 0 && !/미안|아쉽/.test(home.log), "로그 '오늘은 집. 등불 +1', 사과 문구 없음");
  await openAlbum(page);
  await page.click('.fchip[data-f="note"]');
  ok((await page.$$('#album .pcard.note')).length >= 1, '앨범 필터 쪽지 → 쪽지 카드');
  /* 이 차례의 쪽지를 연다 (data-trip) — 앨범의 첫 쪽지가 아니다. 위 '두 번째 초대' 는 종류를 정해 두지 않아서 그날 시드와 시각에 따라 집에 있는 날이 된다
     (js/brain.js stayProbability: 0~5시엔 +0.20 — CI 11-10 05:45 UTC 가 그랬다). 그러면 그 쪽지가 앨범에 먼저 있고, 그 뒷면은 '오늘은 집' 뿐이다 (그날 등불은 첫 초대가 이미 켰다) */
  await page.click('#album .pcard.note[data-trip="' + home.id + '"]'); await page.waitForSelector('#poster-dialog[open]');
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
  await page.evaluate(function (h) { window.__ppolTest = Object.assign(window.__ppolTest || {}, { hint: h }); }, '모자의 역사');   /* 힌트 칸은 없앴다 (11-10) — 두뇌의 옛 길은 테스트 훅으로만 */
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
  await page.evaluate(function (h) { window.__ppolTest = Object.assign(window.__ppolTest || {}, { hint: h }); }, 'https://example.org/page');   /* 힌트 칸은 없앴다 (11-10) — 두뇌의 옛 길은 테스트 훅으로만 */
  /* 그날 시드가 집·빈 차례면 URL 정류장도 건너뛰기도 시험이 안 된다 → 이 초대만 외출로 강제 (brain.js 테스트 훅, plan 때 읽음 · 난수 순서 그대로) */
  await page.evaluate(function () { window.__ppolTest = Object.assign(window.__ppolTest || {}, { forceKind: 'out' }); });
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
  await page.evaluate(function (h) { window.__ppolTest = Object.assign(window.__ppolTest || {}, { hint: h }); }, '모자의 역사');   /* 힌트 칸은 없앴다 (11-10) — 두뇌의 옛 길은 테스트 훅으로만 */
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
    await page.evaluate(function (h) { window.__ppolTest = Object.assign(window.__ppolTest || {}, { hint: h }); }, '모자의 역사');   /* 힌트 칸은 없앴다 (11-10) — 두뇌의 옛 길은 테스트 훅으로만 */
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
/* 초기 스크립트 (문서가 시작될 때, 페이지 스크립트보다 먼저 돈다) 에서는 localStorage 를 건드리지 않는다. 11-10 까지는 여기서 localStorage.length 를 읽어 두었다
   (__lsLen0 — I-4 가 흔들려서 들여다보려던 것, 11-04). 그런데 크로미움에서는 바로 그 읽기가 그 문서의 저장소를 흔들었다: 문서가 빈 저장소로 시작하거나
   그 문서가 쓴 값이 브라우저 쪽으로 넘어가지 않아서, 새로고침하면 지정 계절이 사라졌다 (11-10 에 따로 재 봄: 읽으면 새 문맥 60번 중 17번, 안 읽으면 40번 중 0번).
   게임은 그렇게 일찍 저장소를 읽지 않는다 — 시험이 만든 경합이었다 */
var PLACE_PROBE = "window.__placeLog = []; (function poll() { try { if (window.APP && APP.scene && APP.scene.place) { var p = APP.scene.place(), L = window.__placeLog; if (L[L.length - 1] !== p) L.push(p); } } catch (e) {} setTimeout(poll, 16); })();";
/* 크로미움은 localStorage 쓰기를 브라우저 프로세스로 늦게 넘긴다. 넘어가기 전에 새로고침하면 새 문서가 예전 스냅숏을 읽는다 (CI 11-07: ls0 1, 지정 전 값).
   같은 file:// 저장소를 보는 둘째 쪽(앱을 안 띄우는 JSON 파일)에서 값이 보일 때까지 기다린다. 끝내 안 보이면 저장이 정말 안 된 것 → false.
   (11-10: 그 CI 실패의 원인은 PLACE_PROBE 의 저장소 읽기였다 — 위. 이 기다림은 둘째 쪽에서도 값이 보이는지 확인하는 것으로 남긴다) */
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
    /* '출발' 행이 공개되는 바로 그 순간의 장면 상태를 페이지 안에서 적어 둔다. 밖에서 행을 본 뒤 다시 물으면 그사이(다음 이벤트까지 0.55~1.2 s, --speed 0.5)에
       첫 바깥 기웃이 시작돼 있을 수 있다 — 느린 러너(소프트웨어 렌더 · 한 화면 배치로 커진 장면)에선 늘 그랬다 (CI 11-10: cer 'peek'). 재현: taskset -c 0 */
    window.__dep = null;
    new MutationObserver(function () {
      if (window.__dep || ![].some.call(document.querySelectorAll('#log .lrow .ltool'), function (e) { return e.textContent === '출발'; })) return;
      window.__dep = { place: APP.scene.place(), cer: APP.scene.ceremony(), oct: document.getElementById('oct').className, busy: document.getElementById('btn-go').classList.contains('away'), state: APP.oct.state };
    }).observe(document.getElementById('log'), { childList: true, subtree: true, characterData: true });
    return APP.sceneMode;
  });
  ok(await page.evaluate(function () { return APP.scene.place() === 'attic'; }), '처음엔 다락 (' + mode + ')');
  await page.evaluate(function (h) { window.__ppolTest = Object.assign(window.__ppolTest || {}, { hint: h }); }, '모자의 역사');   /* 힌트 칸은 없앴다 (11-10) — 두뇌의 옛 길은 테스트 훅으로만 */
  await page.click('#btn-go');
  if (mode === '3d') {
    await page.waitForFunction(function () { return APP.scene.ceremony() === 'depart'; }, null, { timeout: 10000 });
    ok(!(await hasLabel(page, '출발')), '출발 의식 동안엔 아직 공개 전 (출발 행 없음)');
  }
  await page.waitForFunction(function () { return APP.oct.state === 'away' && APP.scene.place() === 'exterior'; }, null, { timeout: 20000 });
  await page.waitForFunction(function () { return !!window.__dep; }, null, { timeout: 10000 });
  var away = await page.evaluate(function () { var d = window.__dep; return { place: d.place, cer: d.cer, oct: d.oct, busy: d.busy, state: d.state, now: { place: APP.scene.place(), cer: APP.scene.ceremony(), busy: document.getElementById('btn-go').classList.contains('away') }, ink: window.__ink, log: window.__placeLog.slice() }; });
  console.log('   away:', JSON.stringify({ place: away.place, cer: away.cer, oct: away.oct.trim(), now: away.now, ink: away.ink.map(function (x) { return x.place + (x.m ? '/vis=' + x.m.octVisible + '/door=' + x.m.door : ''); }), log: away.log }));
  /* 출발 행이 공개된 순간: 출발 의식은 끝났고(cer '') 바깥 · 나가 있는 중. 그 뒤로도(지금) 바깥 그대로 — 그사이 시작된 바깥 기웃('peek')은 공개의 일부다 */
  ok(away.place === 'exterior' && away.cer === '' && away.busy && away.state === 'away' && /st-away/.test(away.oct) && away.now.place === 'exterior' && away.now.busy && (away.now.cer === '' || away.now.cer === 'peek'), '나가 있는 동안 바깥 장면 유지 (의식 끝, 공개 중)');
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
  await page.evaluate(function (h) { window.__ppolTest = Object.assign(window.__ppolTest || {}, { hint: h }); }, '');   /* 힌트 칸은 없앴다 (11-10) — 두뇌의 옛 길은 테스트 훅으로만 */
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
  var committed = await waitCommitted(s.ctx, 'ppolppol_look', function (v) { try { return JSON.parse(v || '{}').season === other[0]; } catch (e) { return false; } });
  await page.reload();
  await page.waitForSelector('#btn-go:not(.away)');
  var ov2 = await page.evaluate(function () { var on = document.querySelector('#dv-season .fchip.on'); return { season: APP.scene.season(), on: on ? on.dataset.season : null }; });
  /* 룩 설정(ppolppol_look)은 기록과 달리 탭 미러가 없다 → 저장소만 믿고 새로고침을 넘는다. 11-10 까지는 '크로미움 저장소 경합' 이 보이면 이 검사를 건너뛰었다 (#41).
     그 경합은 이 시험의 초기 스크립트가 localStorage 를 읽어서 생긴 것이었고 (위 PLACE_PROBE), 이제 읽지 않으니 늘 검사한다. 둘째 쪽이 5초 안에 값을 못 본 것도 실패다 */
  ok(committed && ov2.season === other[0] && ov2.on === other[0], '새로고침 뒤에도 지정 계절 유지 (' + JSON.stringify(ov2) + (committed ? '' : ' · 둘째 쪽이 5초 안에 못 봄') + ')');
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
  await page.evaluate(function (h) { window.__ppolTest = Object.assign(window.__ppolTest || {}, { hint: h }); }, '모자의 역사');   /* 힌트 칸은 없앴다 (11-10) — 두뇌의 옛 길은 테스트 훅으로만 */
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
  ok(await page.evaluate(function () { function vis(id) { var e = document.getElementById(id), r = e && e.getBoundingClientRect(); return !!r && r.width >= 44 && r.height >= 44; } return vis('btn-settings') && vis('btn-door') && !document.getElementById('btn-sound'); }), '2D 폴백에도 ⚙ 설정 · 놀이방 문 (누르는 곳 44px) · 장면 위 소리 단추 없음 (설정 안으로, 11-08)');
  await page.evaluate(function (h) { window.__ppolTest = Object.assign(window.__ppolTest || {}, { hint: h }); }, '모자의 역사');   /* 힌트 칸은 없앴다 (11-10) — 두뇌의 옛 길은 테스트 훅으로만 */
  await page.click('#btn-go');
  await skipAway(page);
  await page.waitForSelector('#btn-go:not(.away)', { timeout: 30000 });
  ok((await page.evaluate(function () { return APP.state.room.lantern; })) === 1, '2D 폴백에서도 등불 1');
  ok(!(await page.$('#layers .layer[data-key="ember"]')), '2D 등불 1칸: 불씨 레이어 없음 (등불이 켜졌다)');
  ok((await wallCount(page)) === 1 && !!(await page.$('#wall-posts .wall-mini')), '2D 벽 썸네일 1개 (DOM)');
  ok(await hasItem(page, 'moss'), '2D 이끼 화분 레이어');
  ok(await page.waitForFunction(function () { return /st-(sleep|idle)/.test(document.getElementById('oct').className); }, null, { timeout: 12000 }).then(function () { return true; }, function () { return false; }), '2D 문어 상태 클래스 (데려온 귀가 뒤 문에서 담요로 걸어간 다음 — 11-08)');
  await page.waitForTimeout(200);
  var dlg2 = await page.evaluate(function () {
    var cv = document.querySelector('#log .lrow.dialog canvas.lport-cv'); if (!cv) return { cv: false };
    var d = cv.getContext('2d').getImageData(0, 0, 64, 64).data, n = 0; for (var i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
    return { cv: true, drawn: n, expr: cv.dataset.expr, ex: document.getElementById('oct').className.match(/ex-[a-z]+/) + '', svg: typeof APP.scene.portraitSVG === 'function' && APP.scene.portraitSVG('happy').indexOf('<svg') === 0 };
  });
  console.log('   dialog2d:', JSON.stringify(dlg2));
  ok(dlg2.cv && dlg2.drawn > 64 * 64 * 0.5 && dlg2.svg, '2D 폴백: 대화창 행 + SVG 얼굴 초상 캔버스 그려짐');
  /* 설정 › 내 모습 (2D): 안내 한 줄 · 미리보기 캔버스 없음 · '모습 바꾸기' → 옷장은 그림 없는 글자 타일 + 안내 한 줄, 전신 칸 없음 · 타일을 누르면 저장은 된다 (2D setPlayer 는 모습만 기억) */
  await page.click('#btn-settings'); await page.waitForSelector('#settings-sheet[open]');
  var p2s = await page.evaluate(function () { return { note: !!document.getElementById('set-parts-note'), port: !!document.getElementById('set-pl-port'), sum: (document.getElementById('set-look-sum') || {}).textContent }; });
  await page.click('#set-look-open'); await page.waitForSelector('#look-sheet[open]');
  await page.click('#look-items .look-tile[data-part="hair"][data-id="twin"]');
  var p2d = await page.evaluate(function () {
    var p = APP.scene.player && APP.scene.player(), d = document.getElementById('look-sheet'), it = document.getElementById('look-items'), on = it.querySelector('[data-part="hair"][aria-pressed="true"]'), tiles = it.querySelectorAll('.look-tile');
    return { tabs: d.querySelectorAll('[role=tab]').length, tiles: tiles.length, names: [].every.call(tiles, function (b) { return !!(b.querySelector('.look-name') || {}).textContent; }), canvases: d.querySelectorAll('canvas').length,
      note: (document.getElementById('look-note') || {}).textContent, noShot: document.getElementById('look-body').classList.contains('no-shot'), stage: !!document.getElementById('look-stage-cv') || !!document.getElementById('look-turn'), on: on ? on.dataset.id : null,
      over: d.scrollWidth - d.clientWidth, vover: d.scrollHeight - d.clientHeight, doc: document.documentElement.scrollWidth - window.innerWidth,
      saved: APP.state.settings.player.hair, stored: JSON.parse(localStorage.getItem('ppolppol_v2')).settings.player.hair, look: p ? p.look.hair : null };
  });
  ok(p2s.note && !p2s.port && p2s.sum === '단발 · 원피스 · 리본', '2D 내 모습 (설정): 안내 한 줄 · 미리보기 캔버스 없음 · 요약 줄 ' + JSON.stringify(p2s));
  ok(p2d.tabs === 6 && p2d.tiles === 11 && p2d.names && p2d.canvases === 0 && /미리보기가 없어/.test(p2d.note || '') && p2d.noShot && !p2d.stage && p2d.over <= 0 && p2d.vover <= 0 && p2d.doc <= 0,
    '2D 옷장: 갈래 탭 6 · 그림 없는 글자 타일 11 (머리 6 + 앞머리 5, 11-10) + 안내 한 줄 · 전신 칸 없음 · 넘침 없음 ' + JSON.stringify(p2d));
  ok(p2d.on === 'twin' && p2d.saved === 'twin' && p2d.stored === 'twin' && p2d.look === 'twin', '2D 옷장: 타일을 누르면 켜지고 저장 (2D 장면도 look 기억) ' + JSON.stringify([p2d.on, p2d.saved, p2d.stored, p2d.look]));
  await page.screenshot({ path: path.join(SHOTS, 'phone-2d-look.png') });
  await page.click('#look-close'); await page.waitForSelector('#look-sheet[open]', { state: 'hidden' });
  await page.waitForFunction(function (t) { return document.getElementById('set-look-sum').textContent === t; }, '양갈래 · 원피스 · 리본', { timeout: 3000 }).catch(function () {});   /* close 이벤트는 닫힌 뒤 한 박자 늦게 온다 — 요약 줄은 그때 바뀐다 */
  var p2c = await page.evaluate(function () { return { sum: document.getElementById('set-look-sum').textContent, under: document.getElementById('settings-sheet').open, focus: document.activeElement && document.activeElement.id }; });
  ok(p2c.sum === '양갈래 · 원피스 · 리본' && p2c.under && p2c.focus === 'set-look-open', "2D 옷장: '다 골랐어' → 설정으로 돌아옴 · 요약 줄이 새 모습 " + JSON.stringify(p2c));
  await page.click('#set-close'); await page.waitForSelector('#settings-sheet[open]', { state: 'hidden' });
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

/* L. 추억 앨범 아이콘 (DESIGN §6.3 · §7.2): 앨범은 페이지 흐름에서 빠지고 장면 오른쪽 위 묶음(앨범 · 설정)의 아이콘으로 연다.
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
  var b0 = await page.evaluate(function () { var b = document.getElementById('btn-album'); return { hidden: b.hidden, inCtl: !!b.closest('#scene #scene-ctl'), sound: !!document.querySelector('#btn-sound, .sound-btn'), gear: !!document.getElementById('btn-settings').closest('#scene-ctl'),
    order: [].map.call(document.querySelectorAll('#scene-ctl .icon-btn'), function (x) { return x.id; }).join(','), statusIcons: document.querySelectorAll('#status #btn-album, #status #btn-settings, #status .icon-btn').length,
    one: document.documentElement.getAttribute('data-layout') === 'one', today: !document.getElementById('btn-today').hidden }; });
  /* 한 화면 배치 (주인 11-08 · 3D): 묶음 맨 앞에 '오늘의 산책' 쪽지 단추가 하나 더 있다 (2D 폴백에선 숨는다 — 목록이 페이지에 그대로 있으므로) */
  ok(b0.hidden && b0.inCtl && !b0.sound && b0.gear && b0.order === 'btn-today,btn-furn,btn-album,btn-settings' && b0.today === b0.one && b0.statusIcons === 0, '첫 포스터 전엔 앨범 아이콘 숨김 · [오늘의 산책 (한 화면 배치만 보임)] 가구 (11-10) · 앨범 · ⚙ = 장면 오른쪽 위 묶음 (소리는 설정 안, 11-08) · 상태 줄엔 아이콘 없음 ' + JSON.stringify(b0));
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
  /* 11-10 위쪽 바: 아이콘이 넷이라 360 폭에선 한 칸 40×44 (css ≤379 — 이름이 안 잘리게), 380 부터 44×44. 폭마다 재는 건 아래 '좁은 폭' 검사 */
  ok(!a1.hidden && a1.w === 40 && a1.h >= 44 && a1.label === '추억 앨범' && a1.corner, "앨범 아이콘: 장면 오른쪽 위 · 누르는 곳 40×44 (360 폭 · " + a1.w + '×' + a1.h + ") · aria-label '추억 앨범'");
  ok(a1.dot && a1.desc === '새로 붙은 포스터가 있어', '산책 뒤 새 포스터 점 (숫자 없음) + 화면 낭독기 설명');
  var f = a1.fly[0] || {}, g = a1.font === 'pixel' ? 2 : 1;
  var snapped = (f.kf || []).length >= 4 && f.kf.every(function (t) { var m = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(t || ''); return m && +m[1] % g === 0 && +m[2] % g === 0; });
  ok(a1.fly.length === 2 && a1.fly[1].gone && f.dur > 0 && f.dur <= 600 && snapped, '새 포스터가 아이콘으로 날아감: ' + f.dur + 'ms ≤ 600 · 칸마다 ' + g + 'px 격자 (' + (f.kf || []).length + '칸) · 끝나면 사라짐');
  /* 장면 말풍선은 아이콘 묶음의 보이는 상자와 겹치면 그 왼쪽으로 비켜 선다 (UIART.avoidCtl — 3D keepInside · 2D keepBubble2D 공용) */
  var av = await page.evaluate(function () {
    var q = document.querySelector('#scene-ctl #btn-album .snd-box').getBoundingClientRect(), L = Math.min.apply(null, [].map.call(document.querySelectorAll('#scene-ctl .icon-btn:not([hidden]) .snd-box'), function (x) { return x.getBoundingClientRect().left; }));
    var o = { one: document.documentElement.getAttribute('data-layout') === 'one', over: UIART.avoidCtl({ left: L - 100, right: L + 10, top: q.top + 2, bottom: q.bottom + 40 }, 4), below: UIART.avoidCtl({ left: L - 100, right: L + 10, top: q.bottom + 1, bottom: q.bottom + 60 }, 4), clear: UIART.avoidCtl({ left: L - 120, right: L - 5, top: q.top, bottom: q.bottom }, 4) };
    if (o.one) {   /* 위 띠 = 상태 줄 + 아이콘 묶음. 풍선이 어느 상자와 옆으로 겹치면 그 상자 밑 + 4px 가 위 한계, 둘 사이 틈에 다 들어가면 0 */
      var st = document.getElementById('status').getBoundingClientRect();
      o.band = UIART.topBand({ left: L + 6, right: L + 40 }, 4) - (q.bottom + 4); o.bandSt = UIART.topBand({ left: st.left + 10, right: st.left + 60 }, 4) - (st.bottom + 4);   /* 묶음하고만 · 상태 줄하고만 겹치는 풍선 */
      o.both = UIART.topBand({ left: st.right - 20, right: L + 10 }, 4) - (Math.max(st.bottom, q.bottom) + 4);   /* 둘 다 걸치면 더 낮은 쪽 밑 */
      o.gapW = Math.round(L - st.right); o.gap = o.gapW > 12 ? UIART.topBand({ left: st.right + 5, right: L - 5 }, 4) : 0;
    }
    return o;
  });
  /* 한 화면 배치: 옆으로 비킬 틈이 없어 (왼쪽엔 상태 줄) 묶음은 옆 비킴 무리에서 빠지고, 위 띠를 아래로 비킨다 (UIART.topBand). 2D 폴백은 예전처럼 왼쪽으로 */
  if (av.one) ok(av.over === 0 && av.below === 0 && av.clear === 0 && Math.abs(av.band) < 0.5 && Math.abs(av.bandSt) < 0.5 && Math.abs(av.both) < 0.5 && av.gap === 0, '말풍선 ↔ 위 띠 (한 화면 배치): 옆으로 안 밀고 · 겹치는 상자 밑 4px 가 위 한계 (둘 다 걸치면 더 낮은 쪽) · 상태 줄과 묶음 사이 틈(' + av.gapW + 'px)에선 그대로 ' + JSON.stringify(av));
  else ok(Math.round(av.over) === -14 && av.below === 0 && av.clear === 0, '말풍선 ↔ 아이콘 묶음: 겹치면 상자 왼쪽 4px 까지 비킴 · 안 겹치면 그대로 ' + JSON.stringify(av));
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
  for (var w of [320, 340, 360, 375, 380, 412, 420, 480]) {
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
        var bs = [].filter.call(document.querySelectorAll('#scene-ctl .icon-btn'), function (x) { return !x.hidden && getComputedStyle(x).display !== 'none'; }).map(function (x) { return x.getBoundingClientRect(); });
        out.btnN = bs.length; out.btnW = Math.min.apply(null, bs.map(function (q) { return q.width; })); out.btnH = Math.min.apply(null, bs.map(function (q) { return q.height; }));
        out.ctlLeft = document.getElementById('scene-ctl').getBoundingClientRect().left; out.stRight = Math.max.apply(null, [].map.call(document.querySelectorAll('#oct-name, #pips'), function (x) { return x.getBoundingClientRect().right; }));
        return out;
      }, font);
      fit.push({ w: w, font: font, cut: r.cut, docW: r.docW, ctl: Math.round(r.ctlRight), btnN: r.btnN, btnW: r.btnW, btnH: r.btnH, over: Math.round(r.stRight - r.ctlLeft) });
      if (w === 320 && font === 'pixel') await page.screenshot({ path: path.join(SHOTS, 'status-320-pixel.png'), clip: { x: 0, y: 0, width: 320, height: 420 } });
    }
  }
  /* 아이콘 넷(오늘 · 가구 · 앨범 · 설정)의 누르는 곳: 높이는 늘 44, 폭은 380 부터 44 · 340–379 는 40 · 그 아래는 36 (css 11-10 위쪽 바). 이름 · 등불은 아이콘 묶음 밑으로 들어가지 않는다 */
  var bad = fit.filter(function (x) { return x.cut.length || x.docW > x.w || x.ctl > x.w || x.btnN !== 4 || x.btnH < 44 || x.btnW !== (x.w >= 380 ? 44 : x.w >= 340 ? 40 : 36) || x.over > 0; });
  ok(!bad.length && fit.length === 16, '320–480 px · 픽셀·시스템: 1–4 글자 이름 안 잘림 · 가로 스크롤 없음 · 아이콘 넷 (높이 44 · 폭 44/40/36) · 이름 · 등불이 묶음과 안 겹침 · 놀이방 문 화면 안' + (bad.length ? ' ✗ ' + JSON.stringify(bad) : ''));
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
  ok(nv.gear.label === '설정' && nv.gear.inCtl && nv.gear.w === 40 && nv.gear.h >= 44, "⚙ 설정 아이콘: 장면 오른쪽 위 묶음 · aria-label '설정' · 누르는 곳 40×44 (360 폭 — 아이콘 넷, 380 부터 44×44 · 시나리오 L 이 폭마다 잰다) " + nv.gear.w + '×' + nv.gear.h);
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
  /* 11-08: 말풍선은 이제 아이콘 옆까지 끝까지 비켜 선다 (한도는 꼬리만 — js/ui-art.js keepInside) → 보통은 아무 버튼과도 겹치지 않는다. 그래도 겹치면 그 버튼만 숨는다 */
  ok(yo.every(function (x) { return x.over ? x.op === 0 && x.pe === 'none' : x.op === 1; }), '문 앞 긴 말: 말풍선이 아이콘 옆으로 비켜 서고, 그래도 겹치는 버튼만 숨김 (글자 위에 아이콘이 안 그려짐) · 나머지는 그대로 ' + JSON.stringify(yo));
  await page.waitForFunction(function () { return document.getElementById('oct-bubble').hidden; }, null, { timeout: 8000 });
  /* 되돌림은 ui-art 의 0.2 s 타이머 + 0.25 s 페이드 — 전체 스모크처럼 CPU 가 바쁘면 타이머와 애니메이션 프레임이 늦으므로 (표시는 걷혔는데 페이드가 아직 0 에 머문 회차가 있었다)
     고정 0.4 s 대신 다 돌아올 때까지 최대 3 s 기다린다. 영영 안 돌아오면 아래 검사가 잡는다 */
  await page.waitForFunction(function () {
    if (document.querySelector('.yield')) return false;
    return [].every.call(document.querySelectorAll('#scene-ctl .icon-btn:not([hidden]), #btn-door'), function (btn) { var op = 1, e = btn; while (e && e !== document.body) { op *= +getComputedStyle(e).opacity; e = e.parentElement; } return op === 1; });
  }, null, { timeout: 3000 }).catch(function () {});
  var yb = await ctlOps();
  ok(yb.every(function (x) { return x.op === 1 && (x.pe !== 'none' || x.spot === 'over'); }) && !(await page.$('.yield')), '말풍선이 사라지면 버튼이 모두 돌아옴 (3D 문 위 투명 문 단추는 원래 pointer-events: none — 톡은 장면이 받는다) ' + JSON.stringify(yb.map(function (x) { return x.id + ':' + x.op; })));
  /* 1c. 비켜 설 수 없을 때 (검증 11-08 — 이제 말풍선은 보통 아이콘 옆으로 비켜 서서 숨기기 길은 위에서 안 쓰인다): ⚙ 를 장면 안쪽으로 밀어 두면 (시험용 CSS)
         긴 말풍선이 장면 왼쪽 끝까지 가도 못 피한다 → 겹친 그 버튼만 말풍선이 보이는 동안 숨는다 · 말풍선이 사라지면 돌아온다 */
  await page.evaluate(function () { var st = document.createElement('style'); st.id = 'smoke-ovl'; st.textContent = '#btn-settings { margin-right: 120px !important; }'; document.head.appendChild(st); APP.say('여기 창문 너머로 빗소리가 들려. 오늘은 어디 갈까 생각 중이야', 'happy', 1600); });
  await page.waitForTimeout(700);
  var yf = await ctlOps();
  var yOne = await page.evaluate(function () { return document.documentElement.getAttribute('data-layout') === 'one'; });
  /* 한 화면 배치 (11-10): 말풍선은 옆이 아니라 **위 띠 아래로** 비킨다 (js/ui-art.js topBand — 띠의 상자가 어디 있든 그 밑) → ⚙ 를 안쪽으로 밀어도 안 겹치고 아무것도 안 숨는다.
     숨기기 길(.yield)은 이 배치에선 놀이방 문에만 남으므로, 규칙 자체는 아래에서 ctlYield 를 바로 불러 본다 */
  if (yOne) ok(yf.every(function (x) { return !x.over && x.op === 1; }), '한 화면 배치: ⚙ 를 안쪽으로 밀어도 말풍선이 띠 아래로 비켜 서서 아무 버튼과도 안 겹침 · 아무것도 안 숨음 ' + JSON.stringify(yf));
  else ok(yf.some(function (x) { return x.id === 'btn-settings' && x.over && x.op === 0 && x.pe === 'none'; }) && yf.every(function (x) { return x.over ? x.op === 0 && x.pe === 'none' : x.op === 1; }), '못 비켜 서면 겹친 버튼만 말풍선이 보이는 동안 숨는다 (⚙ 를 안쪽으로 민 시험) ' + JSON.stringify(yf));
  await page.waitForFunction(function () { return document.getElementById('oct-bubble').hidden; }, null, { timeout: 8000 }).catch(function () {});
  await page.evaluate(function () { var st = document.getElementById('smoke-ovl'); if (st) st.remove(); });
  await page.waitForFunction(function () { return !document.querySelector('.yield'); }, null, { timeout: 3000 }).catch(function () {});
  ok(!(await page.$('.yield')), '그 말풍선이 사라지면 ⚙ 도 돌아온다');
  if (yOne) {
    /* 숨기기 규칙 자체 (말풍선이 없을 때 직접): ⚙ 상자와 겹치는 풍선 상자를 주면 ⚙ 만 숨고(투명 · 탭 통과), false 를 주면 돌아온다 */
    await page.evaluate(function () { var q = document.querySelector('#btn-settings .snd-box').getBoundingClientRect(); UIART.ctlYield({ left: q.left + 4, right: q.left + 20, top: q.top + 4, bottom: q.bottom + 30 }); });   /* ⚙ 상자 안쪽만 (옆 단추 상자는 16px 떨어져 있다) */
    await page.waitForFunction(function () { return +getComputedStyle(document.getElementById('btn-settings')).opacity === 0; }, null, { timeout: 3000 }).catch(function () {});   /* 0.25 s 로 옅어진다 — 바쁜 기계에선 프레임이 늦다 */
    var yd = await ctlOps(), ydCls = await page.evaluate(function () { return [].map.call(document.querySelectorAll('.yield'), function (x) { return x.id; }).join(','); });
    await page.evaluate(function () { UIART.ctlYield(false); });
    await page.waitForFunction(function () { return +getComputedStyle(document.getElementById('btn-settings')).opacity === 1; }, null, { timeout: 3000 }).catch(function () {});
    var ye = await ctlOps();
    ok(ydCls === 'btn-settings' && yd.every(function (x) { return x.id === 'btn-settings' ? x.op === 0 && x.pe === 'none' : x.op === 1; }) && ye.every(function (x) { return x.op === 1; }) && !(await page.$('.yield')),
      '숨기기 규칙 (ctlYield 직접): 겹친 ⚙ 만 투명 · 탭 통과, 나머지는 그대로 · 풀면 돌아옴 ' + JSON.stringify({ cls: ydCls, on: yd.map(function (x) { return x.id + ':' + x.op + ':' + x.pe; }), off: ye.map(function (x) { return x.id + ':' + x.op; }) }));
  }
  await page.evaluate(function () { return Promise.race([APP.walkTo('center'), new Promise(function (r) { setTimeout(r, 6000); })]); });

  /* 2. ⚙ 설정 시트: (문어 색 — 거울이 생긴 뒤 안내 한 줄만) · 소리(js/audio.js) · 화면 · 기록 · 누가 고르나 (플레이어에겐 팔레트 없음)
        몸 색은 첫 실행 창에서 처음 한 번만 고른다 (주인 11-08 밤 · docs/SALON.md §1.2): 플레이어 설정엔 색 슬라이더 · 프리셋이 없다 (?dev=0 · 배포 주소). 개발용 칸은 시나리오 O */
  await page.click('#btn-settings'); await page.waitForSelector('#settings-sheet[open]');
  var st = await page.evaluate(function () {
    var b = document.getElementById('set-body');
    return { hs: [].map.call(b.querySelectorAll('h3'), function (x) { return x.textContent; }), hue: !!document.getElementById('set-hue'), presets: b.querySelectorAll('.presets .preset').length, colorLine: !!document.getElementById('set-color'), lantern: APP.state.room.lantern,
      music: !!document.getElementById('set-music'), sfx: !!document.getElementById('set-sfx'), motion: !!document.getElementById('set-motion'), pixel: !!document.getElementById('set-pixel'), thumbs: !!document.getElementById('set-thumbs'),
      stats: (document.getElementById('set-stats') || {}).textContent, data: [].map.call(b.querySelectorAll('.set-data .btn'), function (x) { return x.textContent.trim(); }), dataH: [].map.call(b.querySelectorAll('.set-data .btn'), function (x) { return Math.round(x.getBoundingClientRect().height); }),
      who: (document.getElementById('set-who') || {}).textContent, pal: !!b.querySelector('[data-pal]'), focus: document.activeElement && document.activeElement.id, text: document.getElementById('settings-sheet').innerText };
  });
  console.log('   settings:', JSON.stringify({ hs: st.hs, stats: st.stats, data: st.data, who: st.who }));
  ok(st.lantern < 2 && st.hs.indexOf('문어 색') < 0 && !st.colorLine && !st.hue && st.presets === 0 && st.hs.indexOf('내 모습') === 1, "설정 (거울 전 · 등불 " + st.lantern + "칸): '문어 색' 칸 자체가 없다 (제목도 안내 줄도) · 색 슬라이더 · 프리셋 없음 — 색은 첫 실행 창에서 처음 한 번, 그 뒤엔 미용실 거울 앞에서 · '내 모습' 은 둘째 제목 " + JSON.stringify(st.hs));

  /* 2b. 내 모습 (docs/PLAYER_PARTS.md §3 · 주인 11-09 옷장): 설정에는 요약 한 줄 + '모습 바꾸기' 단추만 — 고르기는 그 단추가 여는 옷장 시트(#look-sheet)에서.
         문어 색 바로 아래 h3 · 미리보기 캔버스는 3D + playerPortrait 있을 때만 (64px · pixelated), 2D 면 한 줄 안내 · 이모지·기호 없음 */
  var PARTS_CATS = 'hair,bangs,hairColor,skin,eyes,eyeColor,nose,mouth,cheek,outfit,shoes,acc', LOOK_PARTS = 'hair,bangs,hairColor,eyes,eyeColor,skin,nose,mouth,cheek,outfit,shoes,acc', LOOK_IDS = ['hair', 'eyes', 'face', 'outfit', 'shoes', 'acc'];
  var pp = await page.evaluate(function () {
    var b = document.getElementById('set-body'), hs = [].map.call(b.querySelectorAll('h3'), function (x) { return x.textContent; });
    var port = document.getElementById('set-pl-port'), pr = port ? port.getBoundingClientRect() : null, open = document.getElementById('set-look-open'), sum = document.getElementById('set-look-sum'), row = open ? open.parentNode : null;
    return { hs: hs, idx: hs.indexOf('내 모습'), sum: sum ? sum.textContent : null, open: open ? open.textContent.trim() : null, pop: open ? open.getAttribute('aria-haspopup') : null, openH: open ? Math.round(open.getBoundingClientRect().height) : 0, chips: b.querySelectorAll('[data-part]').length,
      mode: APP.sceneMode, setFn: typeof APP.scene.setPlayer, portFn: typeof APP.scene.playerPortrait, shotFn: typeof APP.scene.playerShot, port: !!port, portW: pr ? Math.round(pr.width) : 0, portPx: port ? /pixelated|crisp-edges/.test(getComputedStyle(port).imageRendering) : false,
      note2d: !!document.getElementById('set-parts-note'), emoji: /\p{Extended_Pictographic}/u.test(row ? row.innerText : ''), saved: APP.state.settings.player };
  });
  console.log('   look row:', JSON.stringify({ idx: pp.idx, sum: pp.sum, open: pp.open, openH: pp.openH, mode: pp.mode, setFn: pp.setFn, portFn: pp.portFn, shotFn: pp.shotFn, port: pp.port, saved: pp.saved }));
  ok(pp.idx === 1 && pp.sum === '단발 · 원피스 · 리본' && pp.open === '모습 바꾸기' && pp.pop === 'dialog' && pp.openH >= 32 && pp.chips === 0,
    "설정 › 내 모습: 문어 색 바로 아래 · 요약 한 줄 (단발 · 원피스 · 리본) + '모습 바꾸기' 단추 (aria-haspopup=dialog · 높이 32px 이상) · 고르는 칩은 설정 안에 없음 " + JSON.stringify([pp.idx, pp.sum, pp.open, pp.pop, pp.openH, pp.chips]));
  ok(!pp.emoji && pp.saved && Object.keys(pp.saved).join() === PARTS_CATS && pp.saved.hair === 'bob' && pp.saved.bangs === 'spiky' && pp.saved.hairColor === 'blonde' && pp.saved.skin === 'peach' && pp.saved.acc === 'ribbon' && pp.saved.nose === 'tri' && pp.saved.mouth === 'smile' && pp.saved.cheek === 'none', '내 모습: 이모지 0 · settings.player 기본값 (단발 · 삐죽 앞머리 · 금발 · 살구 피부 · 리본 · 세모코 · 미소 · 볼 없음 — 앞머리 · 피부색은 11-10 에 생겼다, 키 12개) ' + JSON.stringify(pp.saved));
  if (pp.mode === '3d') ok(pp.port === (pp.portFn === 'function') && (!pp.port || (pp.portW === 64 && pp.portPx)) && !pp.note2d, '내 모습 미리보기: 3D 에서 playerPortrait 가 있으면 64px pixelated 캔버스, 없으면 생략 (portFn ' + pp.portFn + ' · port ' + pp.port + ' ' + pp.portW + 'px)');
  else ok(!pp.port && pp.note2d, '내 모습 미리보기: 2D 장면에서는 캔버스 없이 한 줄 안내만');

  /* 2b-1. 옷장 시트 (설정 위에 겹쳐 뜬다): 갈래 탭 여섯(tablist) · 고를 것(tabpanel — 그림 타일 / 색 동그라미) · 3D 면 전신 미리보기(앞 · 뒤). 2D 면 글자 타일 + 안내 한 줄.
           그림 검사는 3D + scene.playerShot 이 있을 때만 (CAN_SHOT) */
  var CAN_SHOT = pp.mode === '3d' && pp.shotFn === 'function';
  function portSig(pg) {   /* 설정 줄의 미리보기 그림 지문 — 두 프레임 기다린 뒤 (다시 그리기는 rAF) */
    return pg.evaluate(function () {
      return new Promise(function (res) { requestAnimationFrame(function () { requestAnimationFrame(function () {
        var cv = document.getElementById('set-pl-port'); if (!cv) return res(null);
        var d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, hsh = 0, ink = 0;
        for (var i = 0; i < d.length; i += 4) { if (d[i + 3] > 0) ink++; hsh = (hsh * 31 + d[i] * 3 + d[i + 1] * 5 + d[i + 2] * 7 + d[i + 3]) >>> 0; }
        res({ ink: ink, h: hsh });
      }); }); });
    });
  }
  function lookWait(pg) {   /* 3D: 보이는 타일 그림이 다 그려질 때까지 (한 프레임에 6ms 어치씩 그린다) */
    if (!CAN_SHOT) return pg.waitForTimeout(60);
    return pg.waitForFunction(function () { var t = document.querySelectorAll('#look-items .look-tile'); return t.length > 0 && [].every.call(t, function (b) { var c = b.querySelector('.look-thumb'); return !c || c.dataset.drawn === '1'; }); }, null, { timeout: 20000 }).catch(function () {});
  }
  async function lookTabGo(pg, id) { await pg.click('#look-tab-' + id); await lookWait(pg); }
  function lookRead(pg) {
    return pg.evaluate(function () {
      function sig(cv) { try { var d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, hsh = 0, ink = 0; for (var i = 0; i < d.length; i += 4) { if (d[i + 3] > 0) ink++; hsh = (hsh * 31 + d[i] * 3 + d[i + 1] * 5 + d[i + 2] * 7 + d[i + 3]) >>> 0; } return { ink: ink, h: hsh }; } catch (e) { return { ink: -1, h: 0 }; } }
      function px(el) { return /pixelated|crisp-edges/.test(getComputedStyle(el).imageRendering); }
      var sheet = document.getElementById('look-sheet'), body = document.getElementById('look-body'), rail = document.getElementById('look-rail'), it = document.getElementById('look-items'), cv = document.getElementById('look-stage-cv'),
        turn = document.getElementById('look-turn'), now = document.getElementById('look-now'), note = document.getElementById('look-note'), eye = document.getElementById('look-eye-note'), close = document.getElementById('look-close');
      var tabs = [].map.call(rail.querySelectorAll('[role=tab]'), function (t) { var r = t.getBoundingClientRect(), ic = t.querySelector('.look-tab-ico'); return { id: t.dataset.tab, name: t.textContent.trim(), sel: t.getAttribute('aria-selected'), ti: t.tabIndex, ctl: t.getAttribute('aria-controls'), w: Math.round(r.width), h: Math.round(r.height), ico: !!ic && ic.getBoundingClientRect().width >= 16 }; });
      var groups = [].map.call(it.querySelectorAll('[role=group]'), function (g) {
        var bs = [].slice.call(g.querySelectorAll('[data-id]')), color = g.classList.contains('look-colors'), on = bs.filter(function (b) { return b.getAttribute('aria-pressed') === 'true' && b.classList.contains('on'); });
        var th = bs.map(function (b) { return b.querySelector('canvas.look-thumb'); }).filter(Boolean), sg = th.map(sig), seen = {}; sg.forEach(function (x) { seen[x.h] = 1; });
        return { part: g.dataset.part, color: color, label: g.getAttribute('aria-label'), n: bs.length, on: on.length, onId: on[0] ? on[0].dataset.id : null,
          kind: bs.every(function (b) { return b.dataset.part === g.dataset.part && (color ? b.classList.contains('preset') && b.classList.contains('pl-color') : b.classList.contains('look-tile')); }),
          named: bs.every(function (b) { return color ? !!b.getAttribute('aria-label') && !!b.title : !!(b.querySelector('.look-name') || {}).textContent; }),
          tall: bs.every(function (b) { var r = b.getBoundingClientRect(); return r.height >= 32 && r.width >= 32; }),
          thumbs: th.length, drawn: th.filter(function (c) { return c.dataset.drawn === '1'; }).length, ink: sg.length ? Math.min.apply(null, sg.map(function (x) { return x.ink; })) : 0, distinct: Object.keys(seen).length, sigs: sg.map(function (x) { return x.h; }),
          thW: th[0] ? th[0].clientWidth : 0, thPx: th[0] ? px(th[0]) : false };
      });
      var cs = cv ? sig(cv) : null, kr = close.getBoundingClientRect();
      return { open: sheet.open, under: document.getElementById('settings-sheet').open, focus: document.activeElement ? document.activeElement.id : null, rail: { role: rail.getAttribute('role'), label: rail.getAttribute('aria-label'), ori: rail.getAttribute('aria-orientation') }, tabs: tabs,
        sel: tabs.filter(function (t) { return t.sel === 'true'; }).map(function (t) { return t.id; }).join(), zero: tabs.filter(function (t) { return t.ti === 0; }).map(function (t) { return t.id; }).join(),
        panel: { role: it.getAttribute('role'), by: it.getAttribute('aria-labelledby') }, secs: [].map.call(it.querySelectorAll('h3.look-sec'), function (x) { return x.textContent; }), groups: groups,
        note2d: note ? note.textContent : null, noShot: body.classList.contains('no-shot'), more: body.classList.contains('more'), room: it.scrollHeight - it.clientHeight - it.scrollTop,
        stage: cv ? { w: cv.width, h: cv.height, cw: cv.clientWidth, ch: cv.clientHeight, px: px(cv), role: cv.getAttribute('role'), label: cv.getAttribute('aria-label'), ink: cs.ink, sig: cs.h } : null,
        turn: turn ? turn.textContent.trim() : null, now: now ? now.textContent : null, eye: eye ? eye.textContent : null, close: close.textContent.trim(), closeIn: kr.top >= 0 && kr.bottom <= window.innerHeight + 0.5,
        emoji: /\p{Extended_Pictographic}/u.test(sheet.innerText), canvases: sheet.querySelectorAll('canvas').length };
    });
  }
  async function lookUntil(pg, fn) { var x; for (var i = 0; i < 80; i++) { x = await lookRead(pg); if (fn(x)) break; await pg.waitForTimeout(100); } return x; }
  function lookOn(x) { return x.groups.map(function (g) { return g.on === 1 ? g.onId : '?' + g.on; }).join(); }
  var port0 = await portSig(page);
  await page.click('#set-look-open'); await page.waitForSelector('#look-sheet[open]'); await lookWait(page);
  var lookSt = { hair: await lookRead(page) };
  for (var lookI = 1; lookI < LOOK_IDS.length; lookI++) { await lookTabGo(page, LOOK_IDS[lookI]); lookSt[LOOK_IDS[lookI]] = await lookRead(page); }
  var lookAll = LOOK_IDS.map(function (id) { return lookSt[id]; }), lookGroups = [].concat.apply([], lookAll.map(function (x) { return x.groups; })), stage0 = lookSt.hair.stage;
  console.log('   look:', JSON.stringify({ focus: lookSt.hair.focus, rail: lookSt.hair.rail, tabs: lookSt.hair.tabs.map(function (t) { return t.name + ' ' + t.w + 'x' + t.h; }), groups: lookGroups.map(function (g) { return g.part + ':' + g.n + (g.thumbs ? ' 그림 ' + g.drawn + ' 서로 다른 ' + g.distinct + ' 잉크≥' + g.ink : ''); }),
    stage: stage0, now: lookAll.map(function (x) { return x.now; }), more: lookAll.map(function (x) { return [x.more, x.room]; }) }));
  ok(lookSt.hair.open && lookSt.hair.under && lookSt.hair.focus === 'look-h' && lookSt.hair.close === '다 골랐어' && lookSt.hair.closeIn, "옷장: '모습 바꾸기' → 설정 위에 옷장 시트 · 포커스는 제목으로 · 아래 '다 골랐어' 단추가 화면 안 " + JSON.stringify([lookSt.hair.focus, lookSt.hair.close, lookSt.hair.closeIn]));
  ok(lookSt.hair.rail.role === 'tablist' && lookSt.hair.rail.label === '고를 갈래' && lookSt.hair.rail.ori === 'vertical' && lookSt.hair.tabs.map(function (t) { return t.id; }).join() === LOOK_IDS.join() && lookSt.hair.tabs.map(function (t) { return t.name; }).join('/') === '머리/눈/얼굴/옷/신발/장식'
    && lookSt.hair.tabs.every(function (t) { return t.ctl === 'look-items' && t.ico && t.w >= 44 && t.h >= 44; }), '옷장 갈래 탭: tablist(360px 에선 세로) · 머리 · 눈 · 얼굴 · 옷 · 신발 · 장식 · 탭마다 픽셀 그림 + 이름 · 44px 이상 ' + JSON.stringify(lookSt.hair.tabs.map(function (t) { return [t.name, t.w, t.h, t.ico]; })));
  ok(LOOK_IDS.every(function (id) { var x = lookSt[id]; return x.sel === id && x.zero === id && x.panel.role === 'tabpanel' && x.panel.by === 'look-tab-' + id; }), '옷장 갈래 탭: 누른 탭 하나만 aria-selected · tabindex 0 (나머지 -1) · 고를 것 칸(tabpanel)의 이름 = 그 탭 ' + JSON.stringify(lookAll.map(function (x) { return [x.sel, x.zero, x.panel.by]; })));
  ok(lookGroups.map(function (g) { return g.part; }).join() === LOOK_PARTS && lookGroups.map(function (g) { return g.label; }).join('/') === '머리/앞머리/머리 색/눈/눈 색/피부색/코/입/볼/옷/신발/장식' && lookAll.map(function (x) { return x.secs.join('+'); }).join('/') === '모양+앞머리+색/모양+색/피부색+코+입+볼///',
    '옷장: 여섯 갈래에 열두 가지 (머리: 모양 · 앞머리 · 색 / 눈: 모양 · 색 / 얼굴: 피부색 · 코 · 입 · 볼 / 옷 / 신발 / 장식) · 묶음마다 이름(role=group) · 한 가지뿐인 갈래엔 작은 제목 없음 ' + JSON.stringify([lookGroups.map(function (g) { return g.label; }), lookAll.map(function (x) { return x.secs.join('+'); })]));
  ok(lookGroups.length === 12 && lookGroups.every(function (g) { return g.n >= (g.part === 'cheek' ? 2 : 3) && g.on === 1 && g.kind && g.named && g.tall; }), '옷장: 묶음마다 고를 것 3개 이상 (볼은 없음 · 주근깨 둘 — 볼터치는 11-10 에 뺐다) · 켜진 것 하나(.on + aria-pressed) · 색은 .preset(aria-label·title 이름) · 나머지는 이름 있는 타일 · 32px 이상 ' + JSON.stringify(lookGroups.map(function (g) { return [g.part, g.n, g.on, g.kind, g.named, g.tall]; })));
  ok(lookAll.every(function (x) { return !x.emoji; }) && lookSt.eyes.eye === '눈 색은 크게 봐야 잘 보여', '옷장: 이모지 0 · 눈 갈래엔 눈 색 안내 한 줄 (' + lookSt.eyes.eye + ')');
  if (CAN_SHOT) {
    var lookTiles = lookGroups.filter(function (g) { return !g.color; });
    ok(lookAll.every(function (x) { return !x.noShot && x.note2d === null; }) && lookTiles.length === 10 && lookTiles.every(function (g) { return g.thumbs === g.n && g.drawn === g.n && g.thW === 64 && g.thPx && g.ink > 40 && g.distinct === g.n; }) && lookGroups.every(function (g) { return !g.color || g.thumbs === 0; }),
      '옷장 (3D): 타일마다 그림 (32×32 → 64px pixelated · 다 그려짐 · 빈 그림 없음 · 한 묶음 안에서 서로 다른 그림) · 색 동그라미엔 그림 없음 ' + JSON.stringify(lookTiles.map(function (g) { return [g.part, g.thumbs, g.drawn, g.distinct, g.ink, g.thW]; })));
    ok(stage0 && stage0.w === 64 && stage0.h === 96 && stage0.cw === 128 && stage0.ch === 192 && stage0.px && stage0.role === 'img' && stage0.label === '내 모습 앞모습' && stage0.ink > 300 && lookSt.hair.turn === '뒤 보기', '옷장 (3D): 전신 미리보기 64×96 → 128×192px pixelated · role=img 앞모습 · 그려짐 · 뒤 보기 단추 ' + JSON.stringify(stage0));
    ok(lookAll.map(function (x) { return x.now; }).join(' / ') === '단발 · 삐죽 · 금발 / 동그란 · 흑갈색 / 살구 · 세모코 · 미소 · 볼 없음 / 원피스 / 단화 / 리본', '옷장 (3D): 미리보기 아래 한 줄 = 그 갈래에서 지금 고른 것 ' + JSON.stringify(lookAll.map(function (x) { return x.now; })));
    await page.click('#look-turn'); var lookBack = await lookRead(page);
    await page.click('#look-turn'); var lookFront = await lookRead(page);
    ok(lookBack.turn === '앞 보기' && lookBack.stage.label === '내 모습 뒷모습' && lookBack.stage.ink > 300 && lookBack.stage.sig !== stage0.sig && lookFront.turn === '뒤 보기' && lookFront.stage.label === '내 모습 앞모습' && lookFront.stage.sig === stage0.sig,
      "옷장 (3D): '뒤 보기' → 뒷모습 그림 + 단추는 '앞 보기' · 다시 누르면 처음 앞모습 그대로 " + JSON.stringify([lookBack.turn, lookBack.stage.label, lookFront.turn, lookFront.stage.label]));
  } else {
    ok(lookAll.every(function (x) { return x.noShot && /미리보기가 없어/.test(x.note2d || '') && !x.stage && x.turn === null && x.canvases === 0; }), '옷장 (2D): 그림 없는 글자 타일 + 안내 한 줄 · 전신 칸 없음');
  }
  /* 키보드: 탭 줄에서 화살표(세로 · 가로) · Home · End — 포커스가 가면 바로 고른다 · 끝에서 처음으로 돈다 */
  await lookTabGo(page, 'hair'); await page.focus('#look-tab-hair');
  var lookKeys = [];
  for (var lookKey of ['ArrowDown', 'End', 'ArrowDown', 'ArrowUp', 'Home', 'ArrowRight', 'ArrowLeft']) {
    await page.keyboard.press(lookKey);
    lookKeys.push(await page.evaluate(function () { var s = document.querySelector('#look-rail [aria-selected="true"]'); return (s ? s.dataset.tab : '?') + '|' + (document.activeElement ? document.activeElement.id : '') + '|' + document.getElementById('look-items').getAttribute('aria-labelledby') + '|' + document.getElementById('look-sheet').open; }));
  }
  ok(lookKeys.join(' ') === ['eyes', 'acc', 'hair', 'acc', 'hair', 'eyes', 'hair'].map(function (id) { return id + '|look-tab-' + id + '|look-tab-' + id + '|true'; }).join(' '), '옷장 키보드: ↓ 눈 · End 장식 · ↓ 머리(돈다) · ↑ 장식 · Home 머리 · → 눈 · ← 머리 — 포커스와 고른 탭이 같이 간다 ' + JSON.stringify(lookKeys.map(function (k) { return k.split('|')[0]; })));
  /* '더 있다' 띠: 고를 것 칸에 굴릴 것이 남았을 때만 #look-body.more — 끝까지 굴리면 꺼지고, 올리면 다시 */
  var moreTab = LOOK_IDS.filter(function (id) { return lookSt[id].room > 4; })[0];
  ok(lookAll.every(function (x) { return x.more === (x.room > 4); }) && !!moreTab, "옷장: 굴릴 것이 남은 갈래에만 '더 있다' 띠 (#look-body.more) " + JSON.stringify(lookAll.map(function (x) { return [x.sel, x.more, x.room]; })));
  if (moreTab) {
    await lookTabGo(page, moreTab);
    await page.evaluate(function () { var it = document.getElementById('look-items'); it.scrollTop = it.scrollHeight; });
    await page.waitForFunction(function () { return !document.getElementById('look-body').classList.contains('more'); }, null, { timeout: 3000 }).catch(function () {});
    var moreEnd = await page.evaluate(function () { var it = document.getElementById('look-items'), r = { more: document.getElementById('look-body').classList.contains('more'), top: it.scrollTop }; it.scrollTop = 0; return r; });
    await page.waitForFunction(function () { return document.getElementById('look-body').classList.contains('more'); }, null, { timeout: 3000 }).catch(function () {});
    var moreTop = await page.evaluate(function () { return document.getElementById('look-body').classList.contains('more'); });
    ok(!moreEnd.more && moreEnd.top > 4 && moreTop, "옷장 (" + moreTab + "): 끝까지 굴리면 '더 있다' 띠가 꺼지고 · 맨 위로 오면 다시 켜진다 " + JSON.stringify([moreEnd, moreTop]));
  }
  /* 고르기: 타일 · 색을 누르면 바로 저장 · 방의 캐릭터 · 전신 미리보기 · 아래 한 줄 · 보이는 타일 그림이 같이 바뀐다 */
  await lookTabGo(page, 'hair');
  if (CAN_SHOT) {
    var hairSig0 = (await lookRead(page)).groups[0].sigs;
    await page.click('#look-items .preset[data-part="hairColor"][data-id="pink"]');
    var hairPink = await lookUntil(page, function (x) { return x.groups[0].sigs.every(function (s, i) { return s !== hairSig0[i]; }); });
    await page.click('#look-items .preset[data-part="hairColor"][data-id="blonde"]');
    var hairBack = await lookUntil(page, function (x) { return x.groups[0].sigs.join() === hairSig0.join(); });
    ok(hairPink.groups[0].sigs.every(function (s, i) { return s !== hairSig0[i]; }) && hairPink.now === '단발 · 삐죽 · 분홍' && hairPink.stage.sig !== stage0.sig && hairBack.groups[0].sigs.join() === hairSig0.join() && hairBack.stage.sig === stage0.sig,
      '옷장 (3D): 머리 색을 바꾸면 보이는 머리 타일 여섯 장이 전부 그 색으로 다시 그려진다 (전신 · 아래 한 줄도) · 되돌리면 그림도 제자리 ' + JSON.stringify([hairPink.now, lookOn(hairPink), lookOn(hairBack)]));
  }
  await page.click('#look-items .look-tile[data-part="hair"][data-id="long"]');
  var pickHair = await lookRead(page);
  await lookTabGo(page, 'eyes');
  await page.click('#look-items .preset[data-part="eyeColor"][data-id="sea"]');
  await page.click('#look-items .look-tile[data-part="eyes"][data-id="smile"]');
  var pickEyes = await lookRead(page);
  await lookTabGo(page, 'face');
  var pickFace = await lookRead(page);
  var pc = await page.evaluate(function () {
    var stored = JSON.parse(localStorage.getItem('ppolppol_v2')).settings.player, cur = (APP.scene.player && APP.scene.player()) ? APP.scene.player().look : undefined;
    return { saved: APP.state.settings.player, stored: stored, look: cur, setFn: typeof APP.scene.setPlayer };
  });
  console.log('   look pick:', JSON.stringify({ hair: lookOn(pickHair), eyes: lookOn(pickEyes), now: [pickHair.now, pickEyes.now], eye: pickEyes.eye, saved: pc.saved, look: pc.look }));
  ok(pc.saved.hair === 'long' && pc.saved.eyeColor === 'sea' && pc.saved.eyes === 'smile' && pc.saved.hairColor === 'blonde' && pc.stored && pc.stored.hair === 'long' && pc.stored.eyeColor === 'sea' && pc.stored.eyes === 'smile',
    '옷장: 긴생머리 · 바다색 눈 · 웃는 눈 → settings.player 에 저장 (localStorage ppolppol_v2) · 안 누른 것은 그대로');
  ok(lookOn(pickHair) === 'long,spiky,blonde' && lookOn(pickEyes) === 'smile,sea' && /눈 색이 안 보여/.test(pickEyes.eye || ''), '옷장: 누른 것만 켜짐 (묶음마다 하나) · 웃는 눈이면 눈 색 안내가 바뀐다 ' + JSON.stringify([lookOn(pickHair), lookOn(pickEyes), pickEyes.eye]));
  if (pp.mode === '3d' && pc.setFn === 'function') ok(pc.look && pc.look.hair === 'long' && pc.look.eyeColor === 'sea' && pc.look.eyes === 'smile', '옷장 (3D): scene.player().look 이 고른 대로 ' + JSON.stringify(pc.look));
  else console.log('   (skip) scene.setPlayer 없음 (' + pp.mode + ' · ' + pc.setFn + ') → look 검사 건너뜀');
  if (CAN_SHOT) ok(pickHair.stage.sig !== stage0.sig && pickEyes.stage.sig !== pickHair.stage.sig && pickHair.now === '긴생머리 · 삐죽 · 금발' && pickEyes.now === '웃는 · 바다색' && pickFace.groups.every(function (g, i) { return g.drawn === g.n && g.sigs.every(function (s, j) { return s !== lookSt.face.groups[i].sigs[j]; }); }),
    '옷장 (3D): 고르면 전신 미리보기 · 아래 한 줄이 바뀌고 (머리 · 눈) · 다른 갈래의 타일 그림도 지금 모습(긴생머리 · 웃는 눈)으로 그려진다 ' + JSON.stringify([pickHair.now, pickEyes.now]));
  if (CAN_SHOT) await page.click('#look-turn');   /* 뒷모습인 채로 닫는다 — 다시 열면 앞모습부터 (2d 에서 본다) */
  await page.click('#look-close'); await page.waitForSelector('#look-sheet[open]', { state: 'hidden' });
  await page.waitForFunction(function (t) { return document.getElementById('set-look-sum').textContent === t; }, '긴생머리 · 원피스 · 리본', { timeout: 3000 }).catch(function () {});   /* close 이벤트는 닫힌 뒤 한 박자 늦게 온다 — 요약 줄은 그때 바뀐다 */
  var port1 = await portSig(page);
  var lookClosed = await page.evaluate(function () { return { under: document.getElementById('settings-sheet').open, sum: document.getElementById('set-look-sum').textContent, focus: document.activeElement && document.activeElement.id }; });
  ok(lookClosed.under && lookClosed.sum === '긴생머리 · 원피스 · 리본' && lookClosed.focus === 'set-look-open', "옷장: '다 골랐어' → 옷장만 닫히고 설정은 그대로 · 요약 줄이 새 모습 · 포커스는 '모습 바꾸기' 로 " + JSON.stringify(lookClosed));
  if (port0 && port1) ok(port0.ink > 0 && port1.h !== port0.h, '옷장을 닫으면 설정의 미리보기 그림도 새 모습으로 다시 그려진다');
  /* 새로고침 = 같은 저장소를 읽는 새 탭: 고른 모습이 그대로 · 장면도 그 모습으로 시작 (3D + player().look 이 있을 때) */
  var P2 = await s.ctx.newPage(); watchErrors(P2, s.bag);
  if (useStubs) { await P2.addInitScript({ path: path.join(ROOT, 'tools/stubs.js') }); if (haveReal) await P2.route(/\/js\/(world|brain)\.js$/, function (route) { return route.fulfill({ status: 200, contentType: 'application/javascript', body: '/* stubbed by tools/smoke.js */' }); }); }
  await P2.addInitScript({ content: "window.__ppolTest = { today: '" + DAY1 + "', forceKind: 'out' };" });
  await routeWiki(P2, 'ok'); await routeRepo(P2, O);
  await P2.goto(O + '/index.html?dev=0&slow=' + SPEED);
  await P2.waitForFunction(function () { return window.APP && APP.state.octopus.name === '뚜루'; }, null, { timeout: 20000 });
  await P2.click('#btn-settings'); await P2.waitForSelector('#settings-sheet[open]');
  var sum2 = await P2.evaluate(function () { return document.getElementById('set-look-sum').textContent; });
  await P2.click('#set-look-open'); await P2.waitForSelector('#look-sheet[open]');
  var pr2 = await P2.evaluate(function () {
    var on = function (cat) { var q = document.querySelector('#look-items [data-part="' + cat + '"][aria-pressed="true"]'); return q ? q.dataset.id : null; };
    var cur = (APP.scene.player && APP.scene.player()) ? APP.scene.player().look : undefined, tab = document.querySelector('#look-rail [aria-selected="true"]').dataset.tab, hair = on('hair');
    document.getElementById('look-tab-eyes').click();   /* 탭 누름은 그 자리에서 다시 그린다 → 바로 읽어도 된다 */
    return { saved: APP.state.settings.player, tab: tab, on: [hair, on('eyeColor'), on('eyes')], look: cur, mode: APP.sceneMode, setFn: typeof APP.scene.setPlayer };
  });
  pr2.sum = sum2;
  await P2.close();
  console.log('   look reload:', JSON.stringify(pr2));
  ok(pr2.saved.hair === 'long' && pr2.saved.eyeColor === 'sea' && pr2.saved.eyes === 'smile' && pr2.sum === '긴생머리 · 원피스 · 리본' && pr2.tab === 'hair' && pr2.on.join() === 'long,sea,smile', '내 모습: 새로 연 탭에서도 고른 모습 그대로 (저장 · 요약 줄 · 옷장의 켜진 타일 — 옷장은 첫 갈래 머리부터)');
  if (pr2.mode === '3d' && pr2.setFn === 'function') ok(pr2.look && pr2.look.hair === 'long' && pr2.look.eyes === 'smile', '내 모습 (3D): 새로 연 탭의 장면이 저장된 모습으로 시작 (opts.player) ' + JSON.stringify(pr2.look));
  /* 2c. 불러오기 · 전체 초기화 · 옛 저장 부팅 (리뷰 11-08: importJSON·resetAll 이 renderAll 만 불러 설정 칩은 새 값인데 3D 캐릭터·미리보기는 옛 모습이었다).
         저장소를 공유하지 않는 새 컨텍스트에서 — storage 이벤트로 본 탭 기록을 흔들지 않게 */
  var s3 = await newPage(browser, 'ok', [{ content: "window.__ppolTest = { today: '" + DAY1 + "', forceKind: 'out' };" }]);
  await routeRepo(s3.page, O);
  await s3.page.goto(O + '/index.html?dev=0&slow=' + SPEED);
  await s3.page.waitForSelector('#name-dialog[open]', { timeout: 20000 });
  await s3.page.fill('#name-in', '뚜루'); await s3.page.click('#name-form button[type=submit]');
  await s3.page.waitForSelector('#name-dialog[open]', { state: 'hidden' });
  var io = await s3.page.evaluate(function () {
    function look() { var p = APP.scene.player && APP.scene.player(); return p ? [p.look.hair, p.look.hairColor, p.look.acc].join() : 'none'; }
    APP.setPlayerPart('hair', 'twin'); APP.setPlayerPart('hairColor', 'pink'); APP.setPlayerPart('acc', 'catears');
    var txt = JSON.stringify(APP.state), exported = look();   /* 내보내기 = 이 기록의 JSON */
    APP.setPlayerPart('hair', 'bob'); APP.setPlayerPart('hairColor', 'blonde'); APP.setPlayerPart('acc', 'ribbon');
    var before = look(), r = APP.importJSON(txt), after = look(), sv = APP.state.settings.player;
    return { mode: APP.sceneMode, exported: exported, before: before, r: r, after: after, saved: [sv.hair, sv.hairColor, sv.acc].join() };
  });
  console.log('   import:', JSON.stringify(io));
  ok(io.r === true && io.exported === 'twin,pink,catears' && io.before === 'bob,blonde,ribbon' && io.saved === 'twin,pink,catears' && (io.mode !== '3d' || io.after === 'twin,pink,catears'), '불러오기: settings.player 와 장면 look 이 같이 바뀐다 (양갈래 · 분홍 · 고양이귀) ' + io.after);
  /* 전체 초기화 = 설정 시트의 단추 두 번 (첫 탭은 '정말?' 무장) */
  await s3.page.click('#btn-settings'); await s3.page.waitForSelector('#settings-sheet[open]');
  await resetTwice(s3.page);
  await s3.page.waitForSelector('#name-dialog[open]', { timeout: 10000 });
  var rs = await s3.page.evaluate(function () { var p = APP.scene.player && APP.scene.player(), d = SCENE3D.PLAYER_DEFAULT; return { mode: APP.sceneMode, reset: p ? [p.look.hair, p.look.hairColor, p.look.acc].join() : 'none', def: [d.hair, d.hairColor, d.acc].join(), sameDef: JSON.stringify(APP.state.settings.player) === JSON.stringify(d) }; });
  console.log('   reset:', JSON.stringify(rs));
  ok(rs.sameDef && (rs.mode !== '3d' || rs.reset === rs.def), '전체 초기화: settings.player 와 장면 look 이 기본값으로 · 이름 대화창 ' + rs.reset);
  /* 옛 저장(settings.player 가 문자열/없음)으로 부팅 → 그 칸만 기본값, 기록은 그대로 */
  await s3.page.evaluate(function () { var k = 'ppolppol_v2', o = JSON.parse(localStorage.getItem(k)); o.octopus.name = '뚜루'; o.settings.player = 'bob'; localStorage.setItem(k, JSON.stringify(o)); });
  await s3.page.reload();
  await s3.page.waitForFunction(function () { return window.APP && APP.state && APP.scene; }, null, { timeout: 20000 });
  var old = await s3.page.evaluate(function () { var p = APP.scene.player && APP.scene.player(); return { sameDef: JSON.stringify(APP.state.settings.player) === JSON.stringify(SCENE3D.PLAYER_DEFAULT), look: p ? p.look.hair : null, name: APP.state.octopus.name }; });
  ok(old.sameDef && old.look === 'bob' && old.name === '뚜루', '옛 저장(settings.player 가 문자열) 부팅: 내 모습만 기본값으로, 기록은 그대로 ' + JSON.stringify(old));
  ok(s3.bag.length === 0, '[S 불러오기·초기화] 페이지 에러/콘솔 에러 0' + (s3.bag.length ? ' → ' + s3.bag.join(' | ') : ''));
  await s3.ctx.close();
  /* 2d. 옷장 다시 열기 → 마지막에 보던 갈래 · 앞모습부터 → 기본 모습으로 되돌린다 (뒤 검사·스크린샷은 기본 모습으로) → 320–412 px · 픽셀·시스템 · 여섯 갈래 넘침 검사 → Esc 는 옷장만 닫는다 */
  await page.click('#set-look-open'); await page.waitForSelector('#look-sheet[open]'); await lookWait(page);
  var lookRe = await lookRead(page);
  ok(lookRe.sel === 'face' && lookRe.focus === 'look-h' && (!CAN_SHOT || (lookRe.turn === '뒤 보기' && lookRe.stage.label === '내 모습 앞모습')), '옷장을 다시 열면: 마지막에 보던 갈래(얼굴) 그대로 · 미리보기는 앞모습부터 ' + JSON.stringify([lookRe.sel, lookRe.turn, lookRe.stage && lookRe.stage.label]));
  await lookTabGo(page, 'eyes');
  await page.click('#look-items .preset[data-part="eyeColor"][data-id="dark"]');
  await page.click('#look-items .look-tile[data-part="eyes"][data-id="round"]');
  await lookTabGo(page, 'hair');
  await page.click('#look-items .look-tile[data-part="hair"][data-id="bob"]');
  var lookDef = await lookRead(page);
  if (CAN_SHOT) ok(lookDef.stage.sig === stage0.sig && lookDef.now === '단발 · 삐죽 · 금발', '옷장 (3D): 기본 모습으로 되돌리면 전신 미리보기도 처음 그림 그대로 (' + lookDef.now + ')');
  var lookWide = [];
  for (var lookW of [320, 360, 412]) {
    await page.setViewportSize({ width: lookW, height: 740 });
    for (var lookFont of ['pixel', 'system']) {
      await page.evaluate(function (f) { document.documentElement.setAttribute('data-font', f); }, lookFont);
      for (var lookT of LOOK_IDS) {
        await page.click('#look-tab-' + lookT);
        await page.waitForFunction(function (narrow) { var b = document.getElementById('look-body'), it = document.getElementById('look-items'), r = document.getElementById('look-rail'); return r.getAttribute('aria-orientation') === (narrow ? 'horizontal' : 'vertical') && b.classList.contains('more') === (it.scrollHeight - it.clientHeight - it.scrollTop > 4); }, lookW < 360, { timeout: 3000 }).catch(function () {});
        var lookM = await page.evaluate(function () {
          var d = document.getElementById('look-sheet'), b = document.getElementById('look-body'), it = document.getElementById('look-items'), rail = document.getElementById('look-rail'), k = document.getElementById('look-close').getBoundingClientRect(), dr = d.getBoundingClientRect(), cols = {}, tabs = [].slice.call(rail.querySelectorAll('[role=tab]'));
          [].forEach.call(it.querySelectorAll('.look-tile'), function (t) { cols[Math.round(t.getBoundingClientRect().left)] = 1; });
          var names = [].map.call(it.querySelectorAll('.look-name'), function (n) { return n.scrollWidth - n.clientWidth; }).concat(tabs.map(function (t) { return t.scrollWidth - t.clientWidth; }));
          return { sheet: d.scrollWidth - d.clientWidth, v: d.scrollHeight - d.clientHeight, doc: document.documentElement.scrollWidth, items: it.scrollWidth - it.clientWidth, name: Math.max.apply(null, names.concat([0])),
            closeIn: k.top >= 0 && k.bottom <= window.innerHeight + 0.5 && k.left >= 0 && k.right <= window.innerWidth + 0.5, inView: dr.left >= -0.5 && dr.right <= window.innerWidth + 0.5 && dr.top >= -0.5,
            ori: rail.getAttribute('aria-orientation'), cols: Object.keys(cols).length, tabMin: Math.round(Math.min.apply(null, tabs.map(function (t) { var r = t.getBoundingClientRect(); return Math.min(r.width, r.height); })) * 10) / 10,
            moreOk: b.classList.contains('more') === (it.scrollHeight - it.clientHeight - it.scrollTop > 4) };
        });
        lookM.w = lookW; lookM.font = lookFont; lookM.tab = lookT; lookWide.push(lookM);
      }
      if (lookFont === 'pixel' && lookW !== 412) { await lookTabGo(page, 'hair'); await page.waitForTimeout(350); await page.screenshot({ path: path.join(SHOTS, 'look-' + lookW + '.png') }); }
    }
  }
  await page.evaluate(function () { document.documentElement.setAttribute('data-font', 'pixel'); });
  await page.setViewportSize({ width: 360, height: 740 });
  await page.waitForFunction(function () { return document.getElementById('look-rail').getAttribute('aria-orientation') === 'vertical'; }, null, { timeout: 3000 }).catch(function () {});
  var lookBad = lookWide.filter(function (x) { return x.sheet > 0 || x.v > 0 || x.doc > x.w || x.items > 0 || x.name > 0 || !x.closeIn || !x.inView || !x.moreOk || x.ori !== (x.w < 360 ? 'horizontal' : 'vertical') || x.tabMin < 44 || (CAN_SHOT && x.cols !== 2); });
  console.log('   look wide:', JSON.stringify(lookWide.filter(function (x) { return x.tab === 'hair'; }).map(function (x) { return [x.w, x.font, x.ori, x.cols, x.tabMin]; })));
  ok(lookWide.length === 36 && !lookBad.length, '옷장 320–412 px · 픽셀·시스템 · 여섯 갈래: 가로·세로 넘침 없음 · 이름 안 잘림 · 닫기 단추가 화면 안 · 탭 44px 이상 · 타일 두 줄(3D) · 320 px 에선 탭이 가로 줄 (aria-orientation 도 따라간다)' + (lookBad.length ? ' ✗ ' + JSON.stringify(lookBad.slice(0, 6)) : ''));
  await page.keyboard.press('Escape'); await page.waitForSelector('#look-sheet[open]', { state: 'hidden' });
  await page.waitForFunction(function (t) { return document.getElementById('set-look-sum').textContent === t; }, '단발 · 원피스 · 리본', { timeout: 3000 }).catch(function () {});   /* close 이벤트는 닫힌 뒤 한 박자 늦게 온다 — 요약 줄은 그때 바뀐다 */
  var port2 = await portSig(page);
  var lookEnd = await page.evaluate(function () { return { under: document.getElementById('settings-sheet').open, sum: document.getElementById('set-look-sum').textContent, focus: document.activeElement && document.activeElement.id, def: JSON.stringify(APP.state.settings.player) === JSON.stringify(SCENE3D.PLAYER_DEFAULT) }; });
  ok(lookEnd.under && lookEnd.sum === '단발 · 원피스 · 리본' && lookEnd.focus === 'set-look-open' && lookEnd.def && (!port0 || (!!port2 && port2.h === port0.h)), "Esc 는 맨 위 옷장만 닫는다 (설정은 그대로) · 요약 줄 · 미리보기 · 저장이 기본 모습으로 · 포커스는 '모습 바꾸기' 로 " + JSON.stringify(lookEnd));

  ok(st.music && st.sfx, '설정: 소리 칸 (js/audio.js 가 붙인 음악 · 효과음 크기)');
  /* 소리 켜기·끄기 (주인 11-08 "환경 설정에서 음량 음소거 하게"): 장면 위 스피커는 없고, 설정 › 소리 칸 맨 위 '켜기' 체크 칸 하나 — AUDIO 상태와 같이 간다 */
  function sndNow() { return page.evaluate(function () {
    var c = document.getElementById('set-sound'), row = c && c.closest('label'), h = document.getElementById('rs-sound'), r = row && row.getBoundingClientRect(), n = document.getElementById('rs-sound-note');
    return { ctl: [].map.call(document.querySelectorAll('#scene-ctl button'), function (x) { return x.id; }).join(','), speaker: !!document.querySelector('#btn-sound, .sound-btn, #scene-ctl [aria-label*="소리"]'),
      has: !!c, type: c && c.type, name: row && row.textContent.trim(), cls: row && row.className, first: !!h && !!row && h.nextElementSibling === row && !!(row.compareDocumentPosition(document.getElementById('set-music')) & Node.DOCUMENT_POSITION_FOLLOWING) && !!(row.compareDocumentPosition(document.getElementById('set-sfx')) & Node.DOCUMENT_POSITION_FOLLOWING),
      checked: c && c.checked, en: AUDIO.enabled(), avail: AUDIO.state().available, focusable: !!c && c.tabIndex >= 0 && !c.disabled, h: r ? Math.round(r.height) : 0, note: n ? (n.hidden ? '' : n.textContent) : null };
  }); }
  var sn0 = await sndNow();
  sn0.axName = await page.getByRole('checkbox', { name: '소리 켜기', exact: true }).count();   /* 화면 낭독기 이름 = 칸 제목 '소리' + 글자 '켜기' (aria-labelledby) */
  console.log('   sound:', JSON.stringify(sn0));
  /* 한 화면 배치 (11-10)엔 맨 앞에 '오늘의 산책' 쪽지 단추가 하나 더 있다 (2D 폴백엔 없다 — 목록이 페이지에 그대로 보여서) */
  ok(!sn0.speaker && (sn0.ctl === 'btn-album,btn-settings' || (yOne && sn0.ctl === 'btn-today,btn-furn,btn-album,btn-settings')), '장면 오른쪽 위 묶음에 소리 단추 없음 (' + (yOne ? '오늘의 산책 · 가구 · ' : '') + '앨범 · 설정뿐) — ' + sn0.ctl);
  ok(sn0.has && sn0.type === 'checkbox' && sn0.name === '켜기' && sn0.axName === 1 && sn0.cls === 'set' && sn0.first && sn0.focusable && sn0.h >= 44, "설정 › 소리 맨 위 '켜기' 체크 칸 ('소리 / 소리' 겹침 없이 · 낭독 이름 '소리 켜기' · 음악 · 효과음 위 · 다른 켜고 끄기 줄과 같은 모양 · Tab 으로 감 · 줄 높이 " + sn0.h + 'px)');
  ok(sn0.avail && sn0.checked === false && sn0.en === false && sn0.note === '', '처음엔 빈 칸 = 꺼짐 (AUDIO 와 같음) · 보통 때 안내 줄 없음');
  await page.click('#set-sound');
  await page.waitForFunction(function () { var x = AUDIO.state(); return x.started && x.ctx === 'running'; }, null, { timeout: 15000 }).catch(function () {});
  var sn1 = await sndNow();
  await page.keyboard.press('Space');   /* 포커스는 체크 칸에 남아 있다 → 키보드로 끈다 */
  await page.waitForTimeout(300);
  var sn2 = await sndNow();
  ok(sn1.checked === true && sn1.en === true && sn2.checked === false && sn2.en === false && sn2.note === '', '체크 칸 톡 → 켜짐 (AUDIO 켜짐 · 체크) · Space → 꺼짐 (빈 칸) — ' + JSON.stringify({ on: [sn1.checked, sn1.en], off: [sn2.checked, sn2.en] }));
  ok(st.motion && st.pixel && st.thumbs, '설정: 모션 · 픽셀 글꼴 · 포스터 썸네일');
  ok(st.stats === '산책 0 · 함께한 날 0 · 읽음 0' && st.data.join('/') === '내보내기/불러오기/전체 초기화' && st.dataH.every(function (x) { return x >= 44; }), '설정 › 기록: 작은 한 줄 + 내보내기 · 불러오기 · 전체 초기화 (보이는 높이 44px 넘음 ' + st.dataH.join('/') + ')');
  ok(/미리 만든 규칙/.test(st.who) && /고른 이는 포스터와 쪽지 뒷면/.test(st.who) && !/MCP|일기/.test(st.who) && !st.pal && st.focus === 'set-h' && !/방 보기/.test(st.text), "설정: '누가 고르나' 한 줄 (MCP 같은 말 없이 · 고른 이는 포스터·쪽지 뒷면) · 플레이어에겐 팔레트 없음 · 포커스는 시트 제목 · '방 보기' 없음");
  /* 문어 색은 설정에서 못 바꾼다 (미용실 2부: 색은 거울 앞에서 문어에게 묻는다 — 시나리오 Y · tools/test-salon.js). 여기엔 슬라이더 · 프리셋 · 개발용 칸이 없고, 처음 색 기록 한 줄 그대로다 (?dev=1 을 직접 붙인 탭의 개발용 칸은 scenarioFirstColor) */
  var c1 = await page.evaluate(function () { var b = document.getElementById('set-body'), c = APP.state.octopus.colors || []; return { hue: !!document.getElementById('set-hue'), dev: !!document.getElementById('set-color-dev'), presets: b.querySelectorAll('.presets .preset, .preset[data-hex]').length, n: c.length, how: c[0] && c[0].how, color: APP.state.octopus.color, saved: APP.state.settings.octColor, stored: JSON.parse(localStorage.getItem('ppolppol_v2')).octopus.color, scene: String(APP.scene.color()).toLowerCase() }; });
  ok(!c1.hue && !c1.dev && c1.presets === 0 && c1.n === 1 && c1.how === 'first' && c1.color === '#e8463c' && c1.saved === c1.color && c1.stored === c1.color && c1.scene === c1.color, '문어 색: 설정엔 바꾸는 칸이 없다 (슬라이더 · 프리셋 · 개발용 칸 0) · 처음 색 기록 한 줄 그대로 ' + JSON.stringify(c1));
  await page.click('#set-reset');
  var rz = await page.evaluate(function () { return { t: document.getElementById('set-reset').textContent, name: APP.state.octopus.name }; });
  ok(/정말/.test(rz.t) && rz.name === '뚜루', '전체 초기화는 2단계 (한 번 누르면 묻기만)');
  /* 거울이 생긴 뒤(등불 2칸)의 설정엔 '문어 색' 제목 + 안내 한 줄이 있다 (누르는 것 없음) — 그 줄까지 넣고 폭을 잰다. 등불은 잠깐만 2칸으로 (저장하지 않는다) */
  await page.keyboard.press('Escape'); await page.waitForSelector('#settings-sheet[open]', { state: 'hidden' });
  var mz = await page.evaluate(function () { var keep = APP.state.room.lantern; APP.state.room.lantern = 2; return { lantern: keep }; });
  await page.click('#btn-settings'); await page.waitForSelector('#settings-sheet[open]');
  mz.row = await page.evaluate(function () { var b = document.getElementById('set-body'), l = document.getElementById('set-color'), h = document.getElementById('set-color-h'); return { hs: [].map.call(b.querySelectorAll('h3'), function (x) { return x.textContent; }), line: l ? l.textContent : '', hue: !!document.getElementById('set-hue'), presets: b.querySelectorAll('.preset[data-hex]').length, h: h ? h.textContent : '', next: !!l && !!h && h.nextElementSibling === l, ctrls: l ? l.querySelectorAll('button, input, select, a').length : -1, dev: !!document.getElementById('set-color-dev') }; });
  ok(mz.lantern < 2 && mz.row.h === '문어 색' && mz.row.hs.indexOf('문어 색') >= 0 && mz.row.hs.indexOf('문어 색') < mz.row.hs.indexOf('내 모습') && mz.row.next && mz.row.line === '거울 앞에서 뚜루에게 물어볼 수 있어.' && !/\p{Extended_Pictographic}/u.test(mz.row.line) && mz.row.ctrls === 0 && !mz.row.hue && mz.row.presets === 0 && !mz.row.dev, "설정 (등불 2칸 = 거울 뒤): '문어 색' 제목 ('내 모습' 위) + 바로 아래 '거울 앞에서 뚜루에게 물어볼 수 있어.' 한 줄 · 누르는 것 · 색 슬라이더 · 프리셋 · 개발용 칸 없음 " + JSON.stringify(mz.row));
  var wide = [];
  for (var w of [320, 360, 412]) {
    await page.setViewportSize({ width: w, height: 740 });
    for (var font of ['pixel', 'system']) {
      var r = await page.evaluate(function (font) { document.documentElement.setAttribute('data-font', font); var d = document.getElementById('settings-sheet'); return { sheet: d.scrollWidth - d.clientWidth, doc: document.documentElement.scrollWidth }; }, font);
      wide.push({ w: w, font: font, sheet: r.sheet, doc: r.doc });
      if (w === 320 && font === 'pixel') await page.screenshot({ path: path.join(SHOTS, 'settings-320.png') });
    }
  }
  await page.evaluate(function (lv) { document.documentElement.setAttribute('data-font', 'pixel'); APP.state.room.lantern = lv; }, mz.lantern);   /* 잠깐 2칸으로 놓았던 등불을 되돌린다 (저장한 적 없음) */
  await page.setViewportSize({ width: 360, height: 740 });
  var badW = wide.filter(function (x) { return x.sheet > 0 || x.doc > x.w; });
  ok(!badW.length, '설정 시트 (문어 색 안내 줄 포함) 320–412 px · 픽셀·시스템: 가로 넘침 없음' + (badW.length ? ' ✗ ' + JSON.stringify(badW) : ''));
  await page.keyboard.press('Escape'); await page.waitForSelector('#settings-sheet[open]', { state: 'hidden' });
  ok(await page.evaluate(function () { return document.activeElement && document.activeElement.id === 'btn-settings'; }), 'Esc 로 닫으면 포커스는 ⚙ 로');

  /* 3. 등불 · 데모를 누르면 작은 말풍선 (2.5 s · 다시 누르면 닫힘 · polite · 모션 줄이기면 그냥) · 폰 폭에선 첫 줄 = 방 제목 (상태 줄에서 숨긴 것)
        말풍선은 큰 버튼 위에 겹친다 → 말풍선을 누르면 말풍선만 닫히고 산책은 나가지 않는다 · 가로에서 띄운 뒤 세로로 돌려도 옆으로 밀리지 않는다 */
  function tipNow() { return page.evaluate(function () { var t = document.getElementById('tip'), r = t.getBoundingClientRect(), p = document.getElementById('pips').getBoundingClientRect(); return { text: t.textContent, head: (t.querySelector('.tip-head') || {}).textContent || '', line: (t.querySelector('.tip-line') || {}).textContent || '', room: document.getElementById('room-title').textContent, show: t.classList.contains('show'), role: t.getAttribute('role'), live: t.getAttribute('aria-live'), left: r.left, right: r.right, top: r.top, pb: p.bottom, vw: innerWidth, docW: document.documentElement.scrollWidth, exp: document.getElementById('pips').getAttribute('aria-expanded'), pl: document.getElementById('pips').getAttribute('aria-label'), numOff: getComputedStyle(document.querySelector('#pips .pips-n')).display === 'none' }; }); }
  await page.click('#pips'); await page.waitForTimeout(300);
  var t1 = await tipNow();
  console.log('   tip:', JSON.stringify(t1));
  /* 한 화면 배치 (11-10)는 폭 ≤ 419 에서 쪽지의 등불 숫자(n/8)도 숨긴다 → 숨긴 것은 설명 머리에 그대로 붙는다: '방 제목 · 등불 n/8' (app.js pipsHead) */
  var t1Head = t1.numOff ? t1.room + ' · ' + t1.pl : t1.room;
  ok(yOne === t1.numOff, '등불 숫자: 한 화면 배치 360 px 에선 쪽지에서 숨김 · 2D 폴백에선 보임 (' + JSON.stringify({ one: yOne, numOff: t1.numOff }) + ')');
  ok(t1.line === '초대한 날마다 한 칸 켜져' && t1.head === t1Head && t1.room.length > 0 && /^등불 \d\/8$/.test(t1.pl) && t1.show && t1.role === 'status' && t1.live === 'polite' && t1.exp === 'true', "등불 누름 → 말풍선 '" + t1.head + "' / '초대한 날마다 한 칸 켜져' (360 px: 첫 줄 = 쪽지에서 숨긴 것 — 방 제목" + (t1.numOff ? ' · 등불 수' : '') + ' · role=status · polite)');
  ok(t1.left >= 15.5 && t1.right <= t1.vw - 15.5 && t1.top >= t1.pb - 0.5 && t1.docW <= t1.vw, '말풍선은 등불 아래 · 화면 안 16px 여백 · 가로 스크롤 없음');
  /* 다시 누르기는 페이지 안 한 틱에서 (느린 기계에서 page.click 이 2.5 s 를 넘겨 저절로 닫힌 뒤 다시 여는 일이 없게) */
  var t2 = await page.evaluate(function () { var t = document.getElementById('tip'), was = t.classList.contains('show'); document.getElementById('pips').click(); return { was: was, show: t.classList.contains('show'), text: t.textContent, exp: document.getElementById('pips').getAttribute('aria-expanded') }; });
  ok(t2.was && !t2.show && t2.text === '' && t2.exp === 'false', '같은 등불을 다시 누르면 닫힘');
  /* 저절로 닫히는 시각은 페이지 안에서 잰다 (부하에 상관없이) */
  var auto = await page.evaluate(function () { return new Promise(function (res) { var t = document.getElementById('tip'), t0 = performance.now(); document.getElementById('pips').click(); var at2 = null; setTimeout(function () { at2 = t.classList.contains('show'); }, 2000); var mo = new MutationObserver(function () { if (!t.classList.contains('show')) { mo.disconnect(); res({ ms: Math.round(performance.now() - t0), at2: at2 }); } }); mo.observe(t, { attributes: true, attributeFilter: ['class'] }); }); });
  ok(auto.at2 === true && auto.ms >= 2450 && auto.ms < 4500, '2.5 s 뒤 저절로 닫힘 (2 s 에는 아직 보임 · ' + auto.ms + ' ms)');
  /* 말풍선 자체를 누르면: 말풍선만 닫히고 아래 큰 버튼은 눌리지 않는다 (산책 안 나감) */
  await page.click('#pips'); await page.waitForTimeout(200);
  var tq = await page.evaluate(function () { var r = document.getElementById('tip').getBoundingClientRect(), g = document.getElementById('btn-go').getBoundingClientRect(), x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2), e = document.elementFromPoint(x, y); return { x: x, y: y, overGo: r.bottom > g.top && r.top < g.bottom, onTip: !!(e && e.closest('#tip')), overScene: (function () { var sc = document.getElementById('scene').getBoundingClientRect(); return x >= sc.left && x <= sc.right && y >= sc.top && y <= sc.bottom; })(), n: APP.state.trips.length }; });   /* overScene: 말풍선이 장면 그림 위에 떠 있다 (DOM 으로는 상태 쪽지의 자식) */
  await page.mouse.click(tq.x, tq.y); await page.waitForTimeout(300);
  var tq2 = await page.evaluate(function () { return { n: APP.state.trips.length, away: document.getElementById('btn-go').classList.contains('away'), show: document.getElementById('tip').classList.contains('show') }; });
  /* 한 화면 배치 (11-10): 말풍선은 위 쪽지 아래(장면 위)에 뜨고 큰 버튼은 맨 아래라 서로 안 겹친다 → 누름을 말풍선이 받는지 · 그 밑(장면)으로 새지 않는지만 본다 */
  if (yOne) ok(!tq.overGo && tq.onTip && tq.overScene && tq2.n === tq.n && !tq2.away && !tq2.show, '한 화면 배치: 말풍선은 큰 버튼과 안 겹침 · 말풍선을 누르면 말풍선만 닫힘 (산책 안 나감) ' + JSON.stringify({ overGo: tq.overGo, onTip: tq.onTip, trips: tq.n + '→' + tq2.n, away: tq2.away }));
  else ok(tq.overGo && tq2.n === tq.n && !tq2.away && !tq2.show, '큰 버튼 위에 겹친 말풍선을 누르면 말풍선만 닫힘 (산책 안 나감) ' + JSON.stringify({ overGo: tq.overGo, trips: tq.n + '→' + tq2.n, away: tq2.away }));
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
  /* '데모' 누르는 곳은 말풍선이 닫혀 있을 때 잰다 (열린 말풍선은 꼬리표 바로 밑에 떠서 그 아래쪽 누르는 곳을 덮는다 — 말풍선도 누르면 닫힌다) */
  var tagHit = await page.evaluate(function () { var r = document.getElementById('brain-tag').getBoundingClientRect(); function at(y) { var e = document.elementFromPoint(r.left + r.width / 2, y); return !!(e && e.closest('#brain-tag')); } return at(r.top - 5) && at(r.top + 37); });
  await page.click('#brain-tag'); await page.waitForTimeout(50);
  var bt = await tipNow();
  ok(bt.show && bt.text === '지금은 모델이 아니라 미리 만든 규칙이 골라', "'데모' 누름 → 정직한 한 줄 (" + bt.text + ')');
  var hit = await page.evaluate(function () { function at(id, dy) { var r = document.getElementById(id).getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2 + dy); return !!(e && e.closest('#' + id)); } /* 11-10 위쪽 바: 좁은 폰(≤419)에선 '데모' 꼬리표가 바 아래 왼쪽에 매달려 있다 — 위는 바(이름)라 누르는 곳을 위로 6px 만, 나머지는 아래로 뻗는다 (꼬리표 윗변 −6 … +38 = 44px) */
    var tg = document.getElementById('brain-tag').getBoundingClientRect(), st = document.getElementById('status').getBoundingClientRect(), th = tg.height / 2;
    var tp = document.getElementById('tip').getBoundingClientRect();
    return { tag: at('brain-tag', 0) && at('brain-tag', -th + 1) && at('brain-tag', th - 1) && tp.top >= tg.bottom, pips: at('pips', -19) && at('pips', 19), hang: tg.top >= st.bottom && tg.top - st.bottom <= 6 && tg.width > 0 && tg.left >= 0 }; });
  ok(tagHit && hit.tag && hit.pips && hit.hang, "'데모'·등불 누르는 곳 위아래 44px (보이는 크기는 그대로 · '데모' 는 바 바로 아래에 매달려 늘 보인다 — 제 말풍선이 떠도 안 가려짐) " + JSON.stringify({ zone: tagHit, open: hit }));
  await page.mouse.click(180, 600);   /* 다른 곳을 누르면 닫힘 */
  ok(!(await tipNow()).show, '다른 곳을 누르면 말풍선 닫힘');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.click('#pips');
  var rm = await page.evaluate(function () { var cs = getComputedStyle(document.getElementById('tip')); return { op: cs.opacity, dur: cs.transitionDuration, tf: cs.transform }; });
  ok(rm.op === '1' && /^0s(, 0s)*$/.test(rm.dur) && rm.tf === 'none', '모션 줄이기: 말풍선이 움직임 없이 바로 ' + JSON.stringify(rm));
  await page.screenshot({ path: path.join(SHOTS, 'lantern-tip.png'), clip: { x: 0, y: yOne ? 0 : 200, width: 360, height: 220 } });   /* 한 화면 배치: 쪽지 · 말풍선이 장면 맨 위 */
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
  ok(k1.n === 1 && k1.st === 'done' && k1.kind === 'out' && Date.now() - tS < 15000 && k1.txt === '산책 갈래?', "0.6 s 뒤 큰 버튼 → 바로 데려옴 (여행 1 · done · 버튼은 다시 '뽈뽈 다녀와' 글자만)");

  /* 5. 놀이방 (8물결): 산책 중 바깥이 보이는 동안 #btn-door = 장면 왼쪽 아래 픽셀 집 단추(data-spot edge, 주인 11-08 밤) → 놀이방 → 오락기 → 달리기 창을 연 채로 산책이 끝까지 ·
        문 소리 훅 open · close (놀이방) · 잠들 때 반응 훅 (D-1) · 창을 닫으면 오락기로 포커스 · 놀이방 그대로 · 구석 쪽지 → 보러 가기 → 다락 (포커스는 다락 문) */
  await page.evaluate(function () { window.__aud.length = 0; });
  await page.click('#btn-go');
  await page.waitForFunction(function () { var d = document.getElementById('btn-door'); return APP.oct.state === 'away' && APP.scene.view() === 'exterior' && !d.hidden && d.dataset.spot === 'edge'; }, null, { timeout: 30000 });
  var r0 = await page.evaluate(function () { return document.querySelectorAll('#log .lrow').length; });
  var ed = await page.evaluate(function () {
    var d = document.getElementById('btn-door'), r = d.getBoundingClientRect(), sc = document.getElementById('scene'), s = sc.getBoundingClientRect(), cs = getComputedStyle(sc), q = d.querySelector('.door-box').getBoundingClientRect(), g = document.querySelector('#btn-settings .snd-box').getBoundingClientRect();   /* 맨 오른쪽 ⚙ (앨범 아이콘이 있으면 그 왼쪽에 하나 더) */
    var gap = [q.left - s.left - parseFloat(cs.borderLeftWidth), s.bottom - parseFloat(cs.borderBottomWidth) - q.bottom], gear = [s.right - parseFloat(cs.borderRightWidth) - g.right, g.top - s.top - parseFloat(cs.borderTopWidth)];
    return { w: r.width, h: r.height, corner: r.right < s.left + s.width / 2 && r.top > s.top + s.height / 2, gap: gap.map(Math.round), gear: gear.map(Math.round), box: q.width, img: d.querySelector('img.door-ico').naturalWidth === 16, icon: d.querySelector('img.door-ico').getAttribute('data-icon') };
  });
  ok(ed.w >= 44 && ed.h >= 44 && ed.corner && ed.gap[0] === 8 && ed.gap[1] === 8 && ed.box >= 30 && ed.img && ed.icon === 'ctl/home', '산책 중 바깥이 보이는 동안: 놀이방 가는 단추는 장면 왼쪽 아래 빨간 지붕 집 (44px · 16×16 그림 · 보이는 상자는 틀에서 8px 안쪽 — 설정 아이콘은 11-10 부터 위쪽 바 안의 납작한 그림이라 간격을 견주지 않는다) ' + JSON.stringify(ed));
  var av = await page.evaluate(function () { var q = document.querySelector('#btn-door .door-box').getBoundingClientRect(); return { door: UIART.avoidCtl({ left: q.right - 10, right: q.right + 100, top: q.top + 2, bottom: q.bottom - 2 }, 4), clear: UIART.avoidCtl({ left: q.right + 5, right: q.right + 120, top: q.top, bottom: q.bottom }, 4) }; });
  ok(Math.round(av.door) === 14 && av.clear === 0, '말풍선 ↔ 바깥의 집 단추 (왼쪽 아래): 겹치면 상자 오른쪽 4px 까지 비킴 ' + JSON.stringify(av));
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
  var b0Col = await B.evaluate(function () { return String(APP.scene.color()).toLowerCase(); });
  await page.evaluate(function (d) { window.__ppolTest.today = d; APP.setOctColor('#f08a3c'); }, DAY2);   /* 한 인자 = 개발용 기록 (how dev) — 몸 색을 바꾸는 저장 */
  await B.waitForFunction(function (d) { var x = document.querySelector('#log .lday'); return x && x.dataset.day === d; }, DAY2, { timeout: 5000 });
  var bRows = await B.evaluate(function () { return [].map.call(document.querySelectorAll('#log .lrow .ltool'), function (x) { return x.textContent; }); });
  /* 다른 탭의 장면 몸색도 저장 이벤트로 따라온다 (adoptRemote → applyLook, 흔들기 없이) · 이 탭 기록엔 개발용 한 줄 { how: 'dev', by: 'dev' } + 사본 */
  var bCol = await B.waitForFunction(function () { return String(APP.scene.color()).toLowerCase() === '#f08a3c'; }, null, { timeout: 5000 }).then(function () { return true; }, function () { return false; });
  var bSt = await B.evaluate(function () { return { color: APP.state.octopus.color, copy: APP.state.settings.octColor, n: APP.state.octopus.colors.length }; });
  await B.close();
  var aDev = await page.evaluate(function () { var c = APP.state.octopus.colors, sv = JSON.parse(localStorage.getItem('ppolppol_v2')); return { first: c[0], last: c[c.length - 1], n: c.length, color: APP.state.octopus.color, copy: APP.state.settings.octColor, saved: sv.octopus.color, savedCopy: sv.settings.octColor, scene: String(APP.scene.color()).toLowerCase() }; });
  ok(aDev.n === 2 && aDev.first.how === 'first' && aDev.first.by === 'default' && aDev.last.how === 'dev' && aDev.last.by === 'dev' && aDev.last.color === '#f08a3c' && aDev.last.date === DAY2 && aDev.color === '#f08a3c' && aDev.copy === '#f08a3c' && aDev.saved === '#f08a3c' && aDev.savedCopy === '#f08a3c' && aDev.scene === '#f08a3c',
    "APP.setOctColor(hex) 한 인자 = 개발용 기록 한 줄 { how: 'dev', by: 'dev' } (처음 색 줄은 by 'default' — 이름 창에서 색을 안 누름) · octopus.color · 사본 settings.octColor · 저장 · 장면 " + JSON.stringify({ first: aDev.first && aDev.first.by, last: aDev.last }));
  ok(b0Col === '#e8463c' && bCol && bSt.color === '#f08a3c' && bSt.copy === '#f08a3c' && bSt.n === 2, '다른 탭: 몸 색이 저장 이벤트로 따라온다 (장면 ' + b0Col + ' → #f08a3c · 기록 · 사본) ' + JSON.stringify(bSt));
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
/* O. 첫 실행 몸 색 (주인 11-08 밤 "처음에 선택한 이후로는 사용자가 못 바꾸게" · docs/SALON.md §1 · §9.3):
 *   이름 창 = 제목 → 한 줄 → 초상 → 몸 색 6칸(type=button · aria-pressed · 짧은 이름) → 이름 칸 → 저장 → 정직 줄. 처음엔 빨강이 눌린 채.
 *   손가락 기기면 포커스는 제목(링 없음), 마우스면 이름 칸. 파랑을 누르면 창 안 초상만 바뀌고(장면 문어는 빨강 그대로) 폼은 제출되지 않는다.
 *   저장 → octopus.color 파랑 · colors[0] { how: first, by: player } · 사본 · 장면 문어 파랑 → 새로고침해도 같다. 색을 안 누르면 by 'default'.
 *   320×568 두 글꼴: 창 스크롤 없음 · 정직 줄 보임 · 색 줄 한 줄 / 320×460: [이름 저장] 보임.
 *   미용실 전에 놀던 기록(settings.octColor 만)은 지금 색 그대로 by 'migrated' (이름 창 없음) · 설정엔 거울 뒤 안내 한 줄. 전체 초기화 → 같은 창 · 색도 다시.
 *   설정의 개발용 '바로 바꾸기'(슬라이더 + 프리셋 6)는 ?dev=1 을 직접 붙인 탭만 (file:// 자동 개발 모드로는 안 보임): input 10번은 장면 미리 보기만, change 1번 = 기록 한 줄 */
async function scenarioFirstColor(browser) {
  console.log('\n== O. 첫 실행 몸 색: 이름 창 색 6칸 · 처음 한 번만 · 설정 안내 한 줄 · 개발용 칸은 ?dev=1 탭만');
  var O = 'http://ppolppol.example', bag = [], BLUE = '#4a86d8', RED = '#e8463c', GREEN = '#4fa868';
  bag.ignored = [];
  async function open(o) {   /* o = { touch, w, h, init: [initScript] } — 손가락 기기(hasTouch · isMobile)면 (pointer: coarse) */
    var ctx = await browser.newContext({ viewport: { width: o.w || 360, height: o.h || 740 }, deviceScaleFactor: 1, locale: 'ko-KR', colorScheme: 'light', hasTouch: !!o.touch, isMobile: !!o.touch });
    await ctx.addInitScript({ content: 'window.__ppolAwakeMs = 0;' });
    var page = await ctx.newPage(); watchErrors(page, bag);
    if (useStubs) { await page.addInitScript({ path: path.join(ROOT, 'tools/stubs.js') }); if (haveReal) await page.route(/\/js\/(world|brain)\.js$/, function (route) { return route.fulfill({ status: 200, contentType: 'application/javascript', body: '/* stubbed by tools/smoke.js */' }); }); }
    for (var s of (o.init || [])) await page.addInitScript(s);
    await routeWiki(page, 'ok'); await routeRepo(page, O);
    return { ctx: ctx, page: page };
  }
  function dlg(pg) { return pg.evaluate(function () {
    var d = document.getElementById('name-dialog'), f = document.getElementById('name-form'), dr = d.getBoundingClientRect(), row = document.getElementById('name-colors');
    var bs = [].map.call(row.querySelectorAll('button'), function (b) { var q = b.getBoundingClientRect(); return { hex: b.dataset.hex, type: b.type, label: b.getAttribute('aria-label'), pressed: b.getAttribute('aria-pressed'), top: Math.round(q.top), w: Math.round(q.width), h: Math.round(q.height) }; });
    var hon = f.querySelector('.honest').getBoundingClientRect(), sub = f.querySelector('button[type=submit]').getBoundingClientRect(), cv = document.getElementById('name-port'), img = f.querySelector('img.oct-pic');
    var px = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, sum = 0; for (var i = 0; i < px.length; i += 4) sum += px[i] * 3 + px[i + 1] * 5 + px[i + 2] * 7;
    return { open: d.open, order: [].filter.call(f.children, function (e) { return !e.hidden && e.getBoundingClientRect().height > 0; }).map(function (e) { return e.id || e.className.split(' ')[0] || e.tagName.toLowerCase(); }).join(' > '),
      role: row.getAttribute('role'), group: row.getAttribute('aria-label'), bs: bs, oneRow: bs.every(function (b) { return b.top === bs[0].top; }), rowW: Math.round(row.scrollWidth), rowCW: Math.round(row.clientWidth),
      focus: document.activeElement && (document.activeElement.id || document.activeElement.tagName), outline: getComputedStyle(document.getElementById('name-h')).outlineStyle,
      scrolls: d.scrollHeight > d.clientHeight + 1, honest: hon.top >= 0 && hon.bottom <= innerHeight && hon.bottom <= dr.bottom + 0.5, submit: sub.top >= 0 && sub.bottom <= innerHeight && sub.bottom <= dr.bottom + 0.5,
      docW: document.documentElement.scrollWidth, vw: innerWidth, portrait: !cv.hidden && (!img || img.hidden), sum: sum, scene: String(APP.scene.color()).toLowerCase(), name: APP.state.octopus.name, colors: APP.state.octopus.colors.length };
  }); }
  function rec(pg) { return pg.evaluate(function () { var sv = JSON.parse(localStorage.getItem('ppolppol_v2') || 'null'), so = (sv && sv.octopus) || {}; return { color: APP.state.octopus.color, colors: APP.state.octopus.colors, copy: APP.state.settings.octColor, saved: so.color, savedN: Array.isArray(so.colors) ? so.colors.length : null, savedCopy: sv && sv.settings && sv.settings.octColor, scene: String(APP.scene.color()).toLowerCase(), dlg: !!document.querySelector('#name-dialog[open]'), today: APP.state.octopus.colors.length && APP.state.octopus.colors[0].date }; }); }
  async function nameIt(pg, nm) { await pg.fill('#name-in', nm); await pg.click('#name-form button[type=submit]'); await pg.waitForSelector('#name-dialog[open]', { state: 'hidden' }); }
  function todayKeyIn(pg) { return pg.evaluate(function () { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }); }

  /* 1. 손가락 기기 (360×740): 순서 · 빨강 눌림 · 포커스 제목 (링 없음) · 파랑 → 창 초상만 · 저장 → 파랑 by player · 새로고침 */
  var A = await open({ touch: true }), pa = A.page;
  await pa.goto(O + '/index.html?dev=0');
  await pa.waitForSelector('#name-dialog[open]', { timeout: 20000 });
  await pa.waitForTimeout(200);
  var d0 = await dlg(pa);
  console.log('   dialog:', JSON.stringify({ order: d0.order, bs: d0.bs.map(function (b) { return b.label + ':' + b.pressed; }), focus: d0.focus, portrait: d0.portrait }));
  ok(d0.order === 'name-h > name-lead > name-pic > name-colors > name-in > btn > honest', '이름 창 순서: 제목 → 한 줄 → 초상 → 색 줄 → 이름 칸 → 저장 → 정직 줄 (' + d0.order + ')');
  ok(d0.role === 'group' && d0.group === '몸 색' && d0.bs.length === 6 && d0.bs.every(function (b) { return b.type === 'button' && b.w === 36 && b.h === 36; }) && d0.bs.map(function (b) { return b.label; }).join() === '빨강,주황,보라,파랑,초록,분홍',
    "색 6칸: group '몸 색' · button[type=button] 36 px · aria-label 짧은 이름 (화면엔 라벨 · 이름 줄 없음)");
  ok(d0.bs.map(function (b) { return b.pressed; }).join() === 'true,false,false,false,false,false' && d0.oneRow && d0.portrait && d0.scene === RED && d0.colors === 0, '처음엔 빨강이 눌린 채 · 한 줄 · 창 안 초상 (대체 그림은 숨김) · 장면 문어 빨강 · 아직 기록 없음');
  ok(d0.focus === 'name-h' && d0.outline === 'none', '손가락 기기: 열 때 포커스는 제목 (자판이 색 줄을 가리지 않게) · 제목에 링 없음 (' + d0.focus + ')');
  await pa.evaluate(function () { window.__sub = 0; window.__inv = 0; document.getElementById('name-form').addEventListener('submit', function () { window.__sub++; }, true); document.getElementById('name-in').addEventListener('invalid', function () { window.__inv++; }); });
  await pa.tap('#name-colors .preset[data-hex="' + BLUE + '"]');
  await pa.waitForTimeout(150);
  var d1 = await dlg(pa), sub1 = await pa.evaluate(function () { return { sub: window.__sub, inv: window.__inv }; });
  ok(d1.open && sub1.sub === 0 && sub1.inv === 0 && d1.name === null && d1.colors === 0, '파랑을 눌러도 폼은 제출되지 않는다 (이름 필수 검사 없음 · 기록 없음) ' + JSON.stringify(sub1));
  ok(d1.bs.map(function (b) { return b.pressed; }).join() === 'false,false,false,true,false,false' && d1.sum !== d0.sum && d1.portrait && d1.scene === RED, '파랑 → aria-pressed 파랑 · 창 안 초상만 다시 찍힘 (픽셀 바뀜) · 장면 문어는 빨강 그대로 (' + d1.scene + ')');
  await pa.screenshot({ path: path.join(SHOTS, 'first-color-blue.png') });
  var today = await todayKeyIn(pa);
  await nameIt(pa, '뚜루');
  await pa.waitForTimeout(150);
  var r1 = await rec(pa);
  console.log('   saved:', JSON.stringify(r1));
  ok(r1.color === BLUE && r1.copy === BLUE && r1.colors.length === 1 && r1.colors[0].how === 'first' && r1.colors[0].by === 'player' && r1.colors[0].color === BLUE && r1.colors[0].date === today && typeof r1.colors[0].at === 'number',
    "저장: octopus.color 파랑 · colors[0] { how: 'first', by: 'player', date: 오늘 } · 사본 settings.octColor 같음");
  ok(r1.saved === BLUE && r1.savedCopy === BLUE && r1.savedN === 1 && r1.scene === BLUE && !r1.dlg, '이름과 함께 한 번에 저장 · 장면 문어는 저장 때 한 번 파랑으로');
  await pa.reload(); await pa.waitForSelector('#btn-go:not(.away)'); await pa.waitForTimeout(300);
  var r2 = await rec(pa);
  ok(!r2.dlg && r2.color === BLUE && r2.colors.length === 1 && r2.colors[0].by === 'player' && r2.scene === BLUE, '새로고침해도 같다 (이름 창 없음 · 파랑 · 기록 한 줄)');
  await A.ctx.close();

  /* 2. 320×568 두 글꼴: 스크롤 없음 · 정직 줄 · 색 한 줄 · 가로 스크롤 없음 / 320×460: 저장 보임. 색을 안 누르고 저장 → 빨강 by default */
  var C = await open({ touch: true, w: 320, h: 568 }), pc = C.page;
  await pc.goto(O + '/index.html?dev=0');
  await pc.waitForSelector('#name-dialog[open]', { timeout: 20000 });
  var fit = [];
  for (var hgt of [568, 460]) {
    await pc.setViewportSize({ width: 320, height: hgt });
    for (var font of ['pixel', 'system']) {
      await pc.evaluate(function (f) { document.documentElement.setAttribute('data-font', f); return document.fonts && document.fonts.ready; }, font);
      await pc.waitForTimeout(250);
      var q = await dlg(pc);
      fit.push({ h: hgt, font: font, scrolls: q.scrolls, honest: q.honest, submit: q.submit, oneRow: q.oneRow, rowFits: q.rowW <= q.rowCW, docW: q.docW });
      if (font === 'pixel') await pc.screenshot({ path: path.join(SHOTS, 'first-color-320x' + hgt + '.png') });
    }
  }
  console.log('   fit:', JSON.stringify(fit));
  var f568 = fit.filter(function (x) { return x.h === 568; }), f460 = fit.filter(function (x) { return x.h === 460; });
  ok(f568.every(function (x) { return !x.scrolls && x.honest && x.oneRow && x.rowFits && x.docW <= 320; }), '320×568 픽셀 · 시스템: 창이 스크롤되지 않고 정직 줄이 보임 · 색 6칸 한 줄 (줄바꿈 · 넘침 없음) · 가로 스크롤 없음');
  ok(f460.every(function (x) { return x.submit && x.oneRow; }), '320×460 픽셀 · 시스템: [이름 저장]이 화면 안');
  await pc.evaluate(function () { document.documentElement.setAttribute('data-font', 'pixel'); });
  await pc.setViewportSize({ width: 320, height: 568 });
  await nameIt(pc, '안개');
  var r3 = await rec(pc);
  ok(r3.color === RED && r3.colors.length === 1 && r3.colors[0].how === 'first' && r3.colors[0].by === 'default' && r3.colors[0].color === RED && r3.scene === RED, "색을 안 누르고 저장 → 빨강 { how: 'first', by: 'default' }");
  await C.ctx.close();

  /* 3. 마우스 (pointer: fine): 열 때 포커스는 이름 칸 (예전처럼) */
  var M = await open({ touch: false }), pm = M.page;
  await pm.goto(O + '/index.html?dev=0');
  await pm.waitForSelector('#name-dialog[open]', { timeout: 20000 });
  var mf = await pm.waitForFunction(function () { return document.activeElement && document.activeElement.id === 'name-in'; }, null, { timeout: 3000 }).then(function () { return true; }, function () { return false; });
  ok(mf, '마우스(pointer: fine): 열 때 포커스는 이름 칸');
  await M.ctx.close();

  /* 4. 미용실 전에 놀던 기록 (settings.octColor 만, 옛 설정 슬라이더 색) → 지금 색 그대로 by 'migrated' · 이름 창 없음 · 설정엔 거울 뒤 안내 한 줄 (등불 3칸) · 개발용 칸 없음.
        전체 초기화 → 같은 이름 창이 색 줄과 함께 다시 (빨강 눌림 · 장면도 빨강) → 초록을 골라 저장 */
  var OLD = { v: 2, octopus: { name: '옛문어', born: 1762600000000, trips: 2, invites: 3, days: ['2026-11-01', '2026-11-02', '2026-11-03'], affinity: {}, visits: {}, state: 'idle' }, room: { lantern: 3, souvenirs: [], posterOrder: [] }, trips: [], notes: {}, curiosityNotes: [],
    settings: { motion: 'auto', thumbs: true, lastSeen: 1762650000000, octColor: '#c06040', flipped: false, pixelFont: true, albumSeen: 0 } };
  var D = await open({ touch: false, init: [{ content: "if (!localStorage.getItem('__o_seed')) { localStorage.setItem('__o_seed', '1'); localStorage.setItem('ppolppol_v2', " + JSON.stringify(JSON.stringify(OLD)) + '); }' }] }), pd = D.page;
  await pd.goto(O + '/index.html?dev=0');
  await pd.waitForSelector('#btn-go:not(.away)', { timeout: 20000 }); await pd.waitForTimeout(300);
  var r4 = await rec(pd);
  console.log('   migrated:', JSON.stringify(r4));
  ok(!r4.dlg && r4.color === '#c06040' && r4.copy === '#c06040' && r4.colors.length === 1 && r4.colors[0].how === 'first' && r4.colors[0].by === 'migrated' && r4.colors[0].color === '#c06040' && r4.colors[0].at === 1762600000000 && r4.colors[0].date === null && r4.scene === '#c06040',
    "미용실 전 기록: 지금 색(옛 설정 색 #c06040) 그대로 { how: 'first', by: 'migrated', at: born, date: null } · 장면도 그 색 · 이름 창 없음");
  var s4 = await pd.evaluate(function () { APP.openSettings(); var b = document.getElementById('set-body'), o = { h: (document.getElementById('set-color-h') || {}).textContent, line: (document.getElementById('set-color') || {}).textContent, dev: !!document.getElementById('set-color-dev'), hue: !!document.getElementById('set-hue'), presets: b.querySelectorAll('.preset').length, who: (document.getElementById('set-who') || {}).textContent }; return o; });
  ok(s4.h === '문어 색' && s4.line === '거울 앞에서 옛문어에게 물어볼 수 있어.' && !s4.dev && !s4.hue && s4.presets === 0, "설정 (등불 3칸 · 배포 주소): '문어 색' + 안내 한 줄뿐 · 색 슬라이더 · 프리셋 · 개발용 칸 없음 " + JSON.stringify(s4));
  ok(s4.who === '지금은 모델이 아니라 미리 만든 규칙이 골라. 고른 이는 포스터와 쪽지 뒷면, 미용실 줄에 적혀.', "설정 '누가 고르나': 고른 이는 포스터와 쪽지 뒷면, 미용실 줄에 (" + s4.who + ')');
  await resetTwice(pd);
  await pd.waitForSelector('#name-dialog[open]', { timeout: 10000 });
  await pd.waitForTimeout(200);
  var d5 = await dlg(pd);
  ok(!(await pd.$('#name-colors[hidden]')) && d5.bs.map(function (b) { return b.pressed; }).join() === 'true,false,false,false,false,false' && d5.colors === 0 && d5.scene === RED && d5.name === null, '전체 초기화 → 같은 이름 창 · 색 줄도 다시 (빨강 눌림 · 기록 비움 · 장면 문어 빨강)');
  await pd.click('#name-colors .preset[data-hex="' + GREEN + '"]');
  await nameIt(pd, '새문어');
  var r5 = await rec(pd);
  ok(r5.color === GREEN && r5.colors.length === 1 && r5.colors[0].by === 'player' && r5.scene === GREEN, '초기화 뒤 다시 고른 색 (초록 · by player)');
  await D.ctx.close();

  /* 5. 개발용 '바로 바꾸기': file:// (자동 개발 모드 — #demo 패널은 보임)이라도 ?dev=1 을 직접 붙이지 않으면 없다 */
  var F = await open({ touch: false }), pf = F.page;
  await pf.goto(INDEX);
  await pf.waitForSelector('#name-dialog[open]', { timeout: 20000 });
  await nameIt(pf, '뚜루');
  var f1 = await pf.evaluate(function () { var keep = APP.state.room.lantern; APP.state.room.lantern = 2; APP.openSettings(); var b = document.getElementById('set-body'), o = { line: !!document.getElementById('set-color'), dev: !!document.getElementById('set-color-dev'), hue: !!document.getElementById('set-hue'), presets: b.querySelectorAll('.preset').length, demo: !document.getElementById('demo').hidden, explicit: APP.devExplicit }; APP.state.room.lantern = keep; document.getElementById('settings-sheet').close(); return o; });
  ok(f1.line && !f1.dev && !f1.hue && f1.presets === 0 && f1.demo && f1.explicit === false, "file:// (자동 개발 모드, #demo 는 보임): ?dev=1 이 없으면 '바로 바꾸기' · 슬라이더 · 프리셋 없음 " + JSON.stringify(f1));
  /* ?dev=1 을 직접 붙인 탭: '개발용 · 바로 바꾸기' + 슬라이더 + 프리셋 6 (거울 전에도). input 10번 = 장면 미리 보기만, change 1번 = 기록 한 줄 · 프리셋 = 한 줄 · 미리 보기만 하고 닫으면 기록 색으로 */
  await pf.goto(INDEX + '?dev=1');
  await pf.waitForSelector('#btn-go:not(.away)', { timeout: 20000 });
  await pf.click('#btn-settings'); await pf.waitForSelector('#settings-sheet[open]');
  var g0 = await pf.evaluate(function () { var b = document.getElementById('set-body'); return { h: (document.getElementById('set-color-h') || {}).textContent, dev: (document.getElementById('set-color-dev') || {}).textContent, line: !!document.getElementById('set-color'), hue: !!document.getElementById('set-hue'), presets: b.querySelectorAll('.preset').length, explicit: APP.devExplicit, n: APP.state.octopus.colors.length, lantern: APP.state.room.lantern }; });
  ok(g0.explicit && g0.h === '문어 색' && g0.dev === '개발용 · 바로 바꾸기' && g0.hue && g0.presets === 6 && !g0.line && g0.lantern < 2, "?dev=1 탭: '문어 색' 아래 '개발용 · 바로 바꾸기' + 슬라이더 + 프리셋 6 (거울 전이라 안내 줄은 없음) " + JSON.stringify(g0));
  var g1 = await pf.evaluate(function () {
    var h = document.getElementById('set-hue'), seen = [], saved0 = localStorage.getItem('ppolppol_v2');
    for (var i = 1; i <= 10; i++) { h.value = String(i * 30); h.dispatchEvent(new Event('input', { bubbles: true })); seen.push(String(APP.scene.color()).toLowerCase()); }
    var mid = { n: APP.state.octopus.colors.length, color: APP.state.octopus.color, sameSave: localStorage.getItem('ppolppol_v2') === saved0, scenes: seen.filter(function (c, k) { return seen.indexOf(c) === k; }).length };
    h.dispatchEvent(new Event('change', { bubbles: true }));
    var c = APP.state.octopus.colors;
    return { mid: mid, n: c.length, last: c[c.length - 1], color: APP.state.octopus.color, scene: String(APP.scene.color()).toLowerCase(), saved: JSON.parse(localStorage.getItem('ppolppol_v2')).octopus.colors.length };
  });
  console.log('   dev slider:', JSON.stringify(g1));
  ok(g1.mid.n === g0.n && g1.mid.color === RED && g1.mid.sameSave && g1.mid.scenes >= 8, '개발용 슬라이더 input 10번: 장면만 미리 보임 (색 ' + g1.mid.scenes + '가지) · 기록 · 저장 그대로');
  ok(g1.n === g0.n + 1 && g1.last.how === 'dev' && g1.last.by === 'dev' && g1.last.color === g1.color && g1.scene === g1.color && g1.saved === g1.n, "change 1번 → 기록 한 줄 { how: 'dev', by: 'dev' } · 장면 = 기록 색 (" + g1.color + ')');
  await pf.click('#set-body .preset[data-hex="' + BLUE + '"]');
  var g2 = await pf.evaluate(function () { var c = APP.state.octopus.colors; return { n: c.length, last: c[c.length - 1], on: (document.querySelector('#set-body .preset.on') || {}).dataset }; });
  ok(g2.n === g1.n + 1 && g2.last.how === 'dev' && g2.last.color === BLUE && g2.on && g2.on.hex === BLUE, '개발용 프리셋 파랑 → 한 줄 더 · 칩 켜짐');
  await pf.evaluate(function () { var h = document.getElementById('set-hue'); h.value = '300'; h.dispatchEvent(new Event('input', { bubbles: true })); });
  var pv = await pf.evaluate(function () { return String(APP.scene.color()).toLowerCase(); });
  await pf.click('#set-close'); await pf.waitForSelector('#settings-sheet[open]', { state: 'hidden' });
  /* dialog 의 close 이벤트는 닫힌 뒤 따로 오는 일(task)이라 (open 속성은 먼저 빠진다) 그 이벤트가 장면을 되돌릴 때까지 기다린다 (3 s 안) */
  await pf.waitForFunction(function (c) { return String(APP.scene.color()).toLowerCase() === c; }, BLUE, { timeout: 3000 }).catch(function () {});
  var g3 = await pf.evaluate(function () { return { scene: String(APP.scene.color()).toLowerCase(), color: APP.state.octopus.color, n: APP.state.octopus.colors.length }; });
  ok(pv !== BLUE && g3.scene === BLUE && g3.color === BLUE && g3.n === g2.n, '미리 보기만 하고 닫으면 장면은 기록 색으로 (기록 그대로) ' + JSON.stringify({ preview: pv, after: g3.scene }));
  /* 같은 탭은 ?dev=1 을 기억 (sessionStorage) · ?dev=0 이면 끔 */
  await pf.goto(INDEX); await pf.waitForSelector('#btn-go:not(.away)', { timeout: 20000 });
  var e1 = await pf.evaluate(function () { APP.openSettings(); var o = { explicit: APP.devExplicit, dev: !!document.getElementById('set-color-dev') }; document.getElementById('settings-sheet').close(); return o; });
  await pf.goto(INDEX + '?dev=0'); await pf.waitForSelector('#btn-go:not(.away)', { timeout: 20000 });
  var e0 = await pf.evaluate(function () { APP.openSettings(); var o = { explicit: APP.devExplicit, dev: !!document.getElementById('set-color-dev'), h: !!document.getElementById('set-color-h') }; document.getElementById('settings-sheet').close(); return o; });
  ok(e1.explicit && e1.dev && !e0.explicit && !e0.dev && !e0.h, '?dev=1 은 이 탭 동안 기억 · ?dev=0 이면 개발용 칸 없음 (거울 전이라 문어 색 칸 자체도 없음) ' + JSON.stringify({ remembered: e1, off: e0 }));
  await F.ctx.close();
  reportErrors(bag, 'O');
}

/* Y. 미용실 (주인 11-08 밤 "대신 이 색으로 염색해볼까? 이런 식으로 미용실" · docs/SALON.md §3 · §9.3): 플레이어 화면(가짜 http 호스트 + ?dev=0), 날짜는 훅 (__ppolTest.today — 이 탭 sessionStorage 로 새로고침에도).
 *   등불 2칸: 거울 단추(#btn-salon)가 거울 위 (44×44 이상 · over) · items 에 salon · 장면 설명 끝에 몸 색 · 놀이방 · 산책 중엔 숨음 · 등불 1칸엔 없음.
 *   톡 → 시트 (포커스 제목 · 뒤 막 없음 두 테마) · 지금 색 병 aria-disabled + '지금' · 파랑 → 장면 병이 앞으로 · 닫기 · Esc → 병 제자리 · 기록 0.
 *   폭 · 테마 (320×568 · 360×640 · 412×780 × 픽셀 · 시스템 × 밝음 · 어둠): 가로 스크롤 0 · 병 6 한 줄 · 시트 글자에 이모지 · 기호 없음 · 거울 단추 상자와 거울 옆 문어가 시트 윗변보다 위.
 *   첫 물음 (11-09 · 보통 속도): 행이 박자에 맞춰 (행 1 → 대답 → 몸 색 + 꼬리 '데모 규칙') · 장면은 첨벙까지 옛 색 · 연출 중 거울 단추 · 놀이방 문 숨김 · 기록 { how: 'salon', by: 'demo-rules', ask }.
 *   다시 톡 → 토스트 '내일 또 물어볼 수 있어.' (시트 없음). 11-10: 답 = SALON.demoAnswer(…, asksBefore 1) = '그대로' · 연출 중 새로고침 → 행 셋이 한 번씩 · 연출 없음 · 색 그대로 →
 *   그 병은 11-10 … 11-16 쉬고 11-17 에 열림 (시트: aria-disabled · 이름 줄). 11-11 모션 줄이기: [물어보기] → 행 3 까지 4.5 s 안 · 걷기 · 폴짝 · 물보라 없음.
 *   11-12: 연출 중 주 버튼 → 끝 상태로 감기고 (새 색 · 대야 없음 · 행 셋) 초대가 간다 → 돌아와 자는 문어: 거울 톡 = '쿨쿨…' 만. 앨범 '일기': 물음만 있는 지난 날 · 행 셋.
 *   file://: ?dev=1 없으면 '다음 미용실 대답' · '바로 바꾸기' 없음 (등불 1칸엔 거울 단추 · 소품도 없음) · ?dev=1 이면 있음 · 2D 장면에서 '그대로' → by 'human' · 문어 행 없음 · 꼬리 '사람이 정함' · '바꾸기' → 2D 몸 색도 */
async function scenarioSalon(browser) {
  console.log('\n== Y. 미용실: 거울 단추 · 병 시트 · 묻기 · 연출 · 하루 한 번 · 7일 쉼 · 로그 · 일기 · 모션 줄이기 · 주 버튼 · 폭 · 테마 · 개발용 다음 대답 · 2D');
  var O = 'http://ppolppol.example', bag = []; bag.ignored = [];
  var RED = '#e8463c', ORANGE = '#f08a3c', BLUE = '#4a86d8', GREEN = '#4fa868', PINK = '#f07aa8', BORN = 1762600000000;
  var D1 = '2026-11-09', D2 = '2026-11-10', D3 = '2026-11-11', D4 = '2026-11-12';
  var GUARD = { content: '(' + glyphGuardInit.toString() + ')();' };
  function REC(lv) {
    return { v: 2, octopus: { name: '뚜루', born: BORN, trips: 0, invites: lv, days: ['2026-11-06', '2026-11-07', '2026-11-08'].slice(0, lv), affinity: {}, visits: {}, state: 'idle', color: RED,
      colors: [{ at: BORN, date: '2026-11-06', color: RED, how: 'first', by: 'player' }] }, room: { lantern: lv, souvenirs: [], posterOrder: [] }, trips: [], notes: {}, curiosityNotes: [], salon: { asks: [] },
      settings: { motion: 'auto', thumbs: true, lastSeen: 1762650000000, octColor: RED, flipped: false, pixelFont: true, albumSeen: 0 } };
  }
  async function open(o) {   /* o = { w, h, dark, rec, file, touch } — 기록을 한 번 심고 (새로고침엔 그대로), 날짜 훅은 이 탭 sessionStorage 에서. touch = 손가락 기기 (hasTouch · isMobile) */
    var ctx = await browser.newContext({ viewport: { width: o.w || 360, height: o.h || 740 }, deviceScaleFactor: 1, locale: 'ko-KR', colorScheme: o.dark ? 'dark' : 'light', hasTouch: !!o.touch, isMobile: !!o.touch });
    await ctx.addInitScript({ content: 'window.__ppolAwakeMs = 0;' });
    var page = await ctx.newPage(); watchErrors(page, bag);
    if (useStubs) { await page.addInitScript({ path: path.join(ROOT, 'tools/stubs.js') }); if (haveReal) await page.route(/\/js\/(world|brain)\.js$/, function (route) { return route.fulfill({ status: 200, contentType: 'application/javascript', body: '/* stubbed by tools/smoke.js */' }); }); }
    await page.addInitScript({ content: "if (!localStorage.getItem('__y_seed')) { localStorage.setItem('__y_seed', '1'); localStorage.setItem('ppolppol_v2', " + JSON.stringify(JSON.stringify(o.rec || REC(2))) + '); } ' +
      "window.__ppolTest = { today: sessionStorage.getItem('__y_day') || '" + D1 + "' };" });
    await page.addInitScript(GUARD);
    await routeWiki(page, 'ok'); if (!o.file) await routeRepo(page, O);
    return { ctx: ctx, page: page };
  }
  function setDay(pg, d) { return pg.evaluate(function (d) { sessionStorage.setItem('__y_day', d); window.__ppolTest.today = d; }, d); }
  /* 11-11: 미용실은 위층으로 이사했다 — 거울을 쓰려면 계단으로 위층에 오른다. 문어가 깨어서 집에 있으면 따라 올라오고 (scene.octUp), 그때만 거울 단추가 뜬다. 새로 열거나 새로고침한 뒤마다 부른다 */
  async function up(pg) {
    await pg.evaluate(function () { return APP.goRoom('loft'); });
    return pg.waitForFunction(function () { return APP.room === 'loft' && APP.scene.octUp && APP.scene.octUp() && !document.getElementById('btn-salon').hidden; }, null, { timeout: 15000 }).then(function () { return true; }, function () { return false; });
  }
  function st(pg) { return pg.evaluate(function () {
    var b = document.getElementById('btn-salon'), d = document.getElementById('salon-sheet'), S = APP.state, m = (APP.scene.motion && APP.scene.motion().salon) || {}, bb = document.getElementById('oct-bubble'), t = document.getElementById('toast');
    var rows = [].map.call(document.querySelectorAll('#log .lrow[data-salon]'), function (r) {
      var x = r.querySelector('.ltext'), by = x && x.querySelector('.lby'), tx = x ? x.textContent : '';
      return { id: r.getAttribute('data-salon'), n: +r.getAttribute('data-n'), label: (r.querySelector('.ltool') || {}).textContent, text: (by ? tx.slice(0, tx.length - by.textContent.length) : tx).replace(/\s+$/, ''), full: tx, tail: by ? by.textContent : null, voice: r.classList.contains('voice'), raw: !!r.querySelector('[data-raw]'), expr: r.dataset.expr || null };
    });
    var stair = document.getElementById('btn-stair');
    return { btn: { hidden: b.hidden, spot: b.dataset.spot || null, w: b.offsetWidth, h: b.offsetHeight }, open: d.open, stage: APP.salonStage ? { id: APP.salonStage.id, n: APP.salonStage.n, face: APP.salonStage.face } : null, active: APP.salonActive,
      door: getComputedStyle(document.getElementById('btn-door')).visibility, stair: stair ? getComputedStyle(stair).visibility : 'hidden', user: JSON.stringify(S.user || null), clothes: APP.scene.playerDye ? APP.scene.playerDye() : null, row: t.classList.contains('show') && t.classList.contains('row'), offer: m.offer || null, tub: !!m.tub, splash: !!m.splash, beat: m.beat || '', sceneColor: String(APP.scene.color()).toLowerCase(), color: S.octopus.color, copy: S.settings.octColor,
      colors: S.octopus.colors.map(function (c) { return { how: c.how, by: c.by, color: c.color, ask: c.ask || null }; }), asks: S.salon.asks.map(function (a) { return { id: a.id, date: a.date, action: a.action, by: a.by, line: a.line, offer: a.offer, status: a.status }; }),
      saved: ((JSON.parse(localStorage.getItem('ppolppol_v2') || '{}').salon || {}).asks || []).length, rows: rows, oct: APP.oct.state, toast: t.classList.contains('show') ? t.textContent : '', bubble: bb && !bb.hidden ? bb.textContent : '' };
  }); }
  function rowsOf(s, id) { return s.rows.filter(function (r) { return r.id === id; }); }
  function sheet(pg) { return pg.evaluate(function () {
    var d = document.getElementById('salon-sheet'), nm = document.getElementById('salon-name'), a = document.getElementById('salon-ask');
    return { open: d.open, focus: document.activeElement && document.activeElement.id, ask: a.getAttribute('aria-disabled'), name: nm.textContent, nameH: nm.offsetHeight, offer: (APP.scene.motion().salon || {}).offer || null,
      bs: [].map.call(d.querySelectorAll('.bcell'), function (c) { var b = c.querySelector('.bottle'), n = c.querySelector('.bnote'); return { hex: b.dataset.hex, label: b.getAttribute('aria-label'), dis: b.getAttribute('aria-disabled'), pressed: b.getAttribute('aria-pressed'), type: b.type, w: b.offsetWidth, h: b.offsetHeight, note: n.textContent, noteShown: n.offsetHeight > 0 && !!n.textContent }; }) };
  }); }
  async function openSheet(pg) { if (!(await pg.$('#salon-sheet[open]'))) { await pg.evaluate(function () { APP.openSalon(); }); await pg.waitForSelector('#salon-sheet[open]', { timeout: 5000 }); } await pg.waitForTimeout(200); }
  function waitStageEnd(pg, ms) { return pg.waitForFunction(function () { return !APP.salonStage; }, null, { timeout: ms || 45000, polling: 100 }).then(function () { return true; }, function () { return false; }); }
  /* 문어를 그 자리에 세운다. 걷던 걸음은 먼저 끝낸다 (finishWalk) — jumpTo 만 부르면 도착 폴짝 도중이던 걸음이 취소되면서 장면의 oct.hop 이 떠 있는 채로 남는다 (js/scene3d.js jumpTo — 미용실 밖의 숨은 결함, 보고만) */
  function park(pg, anchor) { return pg.evaluate(function (a) { if (APP.scene.finishWalk) APP.scene.finishWalk(); APP.scene.jumpTo(a); APP.oct.anchor = a; APP.octState('idle'); }, anchor); }
  function spotOf(pg) { return pg.evaluate(function () { var r = APP.scene.spotRect('salon'), b = document.getElementById('btn-salon'); return !b.hidden && r && r.client ? { x: r.client.x + r.client.w / 2, y: r.client.y + r.client.h / 2 } : null; }); }

  /* 1. 등불 2칸 (11-09): 거울 단추 · items · 장면 설명 · 놀이방에선 숨음 */
  var A = await open({}), pa = A.page;
  await pa.goto(O + '/index.html?dev=0');
  await pa.waitForSelector('#btn-go:not(.away)', { timeout: 20000 }); await pa.waitForTimeout(800);
  /* 다락(거실)에는 거울이 없다: 단추는 숨고 시트는 열리지 않는다 → 위층에 오르면 문어가 따라오고 단추가 뜬다 */
  var a0 = await pa.evaluate(function () { var r = APP.openSalon(), o = { hidden: document.getElementById('btn-salon').hidden, opened: r, sheet: document.getElementById('salon-sheet').open, up: APP.scene.octUp() }; if (o.sheet) document.getElementById('salon-sheet').close(); return o; });
  var upOk = await up(pa); await pa.waitForTimeout(400);
  ok(a0.hidden && !a0.opened && !a0.sheet && !a0.up && upOk, '다락에선 거울 단추가 숨고 미용실 시트가 열리지 않는다 → 위층에 오르면 문어가 따라 올라오고 단추가 뜬다 ' + JSON.stringify(a0));
  var b0 = await pa.evaluate(function () { var r = APP.scene.spotRect('salon'), b = document.getElementById('btn-salon'), q = b.getBoundingClientRect(); return { r: r && { mode: r.mode, art: r.art, c: r.client }, q: { x: Math.round(q.left), y: Math.round(q.top), w: Math.round(q.width), h: Math.round(q.height) }, hidden: b.hidden, spot: b.dataset.spot, desc: document.getElementById('scene-desc').textContent, label: b.getAttribute('aria-label'), ctl: b.getAttribute('aria-controls'), mode: APP.sceneMode }; });
  console.log('   mirror button:', JSON.stringify(b0));
  ok(!b0.hidden && b0.spot === 'over' && b0.q.w >= 44 && b0.q.h >= 44 && b0.r && b0.r.mode === 'over' && Math.abs(b0.r.c.x - b0.q.x) <= 1 && Math.abs(b0.r.c.y - b0.q.y) <= 1 && b0.label === '미용실' && b0.ctl === 'salon-sheet',
    "등불 2칸 · 위층: 거울 단추 #btn-salon 이 거울 코너 위 (over · " + b0.q.w + '×' + b0.q.h + " · aria-label '미용실' · aria-controls salon-sheet)");
  ok(await hasItem(pa, 'salon'), "장면 items 에 'salon' (상자와 같은 날 — 등불 2칸)");
  ok(/몸은 빨간색이야\.$/.test(b0.desc), '장면 설명 끝에 몸 색 한 마디 (' + b0.desc + ')');
  await pa.evaluate(function () { return APP.goRoom('attic'); });
  var down = await pa.waitForFunction(function () { return APP.room === null && document.getElementById('btn-salon').hidden && !APP.scene.octUp(); }, null, { timeout: 10000 }).then(function () { return true; }, function () { return false; });
  var back = await up(pa);
  ok(down && back, '아래층으로 내려오면 문어도 다락으로 돌아가고 거울 단추가 숨는다 · 다시 오르면 따라 올라오고 단추가 보인다');
  /* 위층 옷방: 재봉틀은 내 캐릭터의 옷을 물들인다 (S.user.dye → scene.setPlayerDye) — 문어 몸 색 · 색 기록 · 물음 기록은 그대로 (둘은 따로다). 재봉틀 단추와 거울 단추가 같이 보인다 */
  var inLoft = await pa.evaluate(function () { return APP.room === 'loft' && !document.getElementById('btn-salon').hidden && !document.getElementById('btn-sew').hidden; });
  var o0 = await st(pa);
  await pa.evaluate(function () { if (!APP.state.user) APP.state.user = {}; APP.state.user.shells = 6; document.getElementById('btn-sew').click(); });   /* 조개 6 = 옷감 한 번 값 (메모리만) */
  await pa.waitForSelector('#sew-sheet[open]', { timeout: 5000 }); await pa.waitForTimeout(200);
  await pa.evaluate(function () { var c = [].filter.call(document.querySelectorAll('#sew-sheet .sew-chip'), function (x) { return /파랑/.test(x.textContent); })[0]; if (c) c.click(); });
  await pa.waitForTimeout(300);
  var o1 = await st(pa);
  await pa.evaluate(function () { var c = [].filter.call(document.querySelectorAll('#sew-sheet button'), function (x) { return /원래 색으로/.test(x.textContent); })[0]; if (c) c.click(); document.getElementById('sew-sheet').close(); });   /* 옷은 원래 색으로 (공짜) */
  await pa.waitForTimeout(200);
  var o2 = await st(pa);
  ok(inLoft, '위층에선 재봉틀 단추와 거울 단추가 같이 보인다');
  ok(o1.clothes === BLUE && o0.clothes !== BLUE && o1.color === RED && o1.sceneColor === RED && o1.copy === RED && o1.colors.length === 1 && o1.asks.length === 0 && !o2.clothes && o2.color === RED,
    '재봉틀로 옷을 파랑으로 물들여도 문어 몸 색 · 색 기록 · 물음 기록은 그대로 (옷 ' + o0.clothes + ' → ' + o1.clothes + ' → ' + o2.clothes + ' · 문어 ' + o1.sceneColor + ')');

  /* 2. 톡 → 시트: 포커스 제목 · 뒤 막 없음 (두 테마) · 지금 색 병 · 파랑 고르기 → 장면 병이 앞으로 · 닫기 · Esc → 병 제자리 · 기록 0 */
  await clickSpot(pa, '#btn-salon');
  await pa.waitForSelector('#salon-sheet[open]', { timeout: 5000 }); await pa.waitForTimeout(300);
  var h0 = await sheet(pa);
  var bd = await pa.evaluate(function () {
    var d = document.getElementById('salon-sheet'), out = {};
    ['pixel', 'system'].forEach(function (f) { document.documentElement.setAttribute('data-font', f); var c = getComputedStyle(d, '::backdrop'); out[f] = [c.backgroundColor, c.backgroundImage, c.backdropFilter].join(' / '); });
    document.documentElement.setAttribute('data-font', 'pixel'); return out;
  });
  console.log('   sheet:', JSON.stringify({ focus: h0.focus, bs: h0.bs.map(function (b) { return b.label + (b.dis ? '!' : '') + (b.note ? '[' + b.note + ']' : ''); }), ask: h0.ask, backdrop: bd }));
  ok(h0.open && h0.focus === 'salon-h', '거울 톡 → 미용실 시트 · 포커스는 제목 (' + h0.focus + ')');
  ok(/^rgba\(0, 0, 0, 0\) \/ none \/ none$/.test(bd.pixel) && /^rgba\(0, 0, 0, 0\) \/ none \/ none$/.test(bd.system), '미용실 시트만 뒤 막 없음 (픽셀 · 시스템 테마 둘 다: 배경 투명 · 무늬 없음 · backdrop-filter none) ' + JSON.stringify(bd));
  ok(h0.bs.length === 6 && h0.bs.every(function (b) { return b.type === 'button' && b.w === 36 && b.h === 36; }) && h0.bs.map(function (b) { return b.hex; }).join() === [RED, ORANGE, '#9a5cc8', BLUE, GREEN, PINK].join(),
    '병 6 (빨강 주황 보라 파랑 초록 분홍) · button[type=button] · 보이는 칸 36 px');
  var hit = await pa.evaluate(function () {   /* 누르는 곳 44 px: 보이는 칸 밖 3 px (위 · 아래 · 바깥 옆)도 그 병 · 병 사이 간격 8 px */
    var bs = document.querySelectorAll('#salon-bottles .bottle'), a = bs[0].getBoundingClientRect(), b = bs[1].getBoundingClientRect(), z = bs[5].getBoundingClientRect();
    function at(x, y) { var e = document.elementFromPoint(x, y); return e && e.closest('.bottle') ? e.closest('.bottle').dataset.hex : null; }
    return { gap: Math.round(b.left - a.right), up: at(a.left + 18, a.top - 3), down: at(a.left + 18, a.bottom + 3), left: at(a.left - 3, a.top + 18), right: at(z.right + 3, z.top + 18), hexes: [bs[0].dataset.hex, bs[5].dataset.hex] };
  });
  ok(hit.gap === 8 && hit.up === hit.hexes[0] && hit.down === hit.hexes[0] && hit.left === hit.hexes[0] && hit.right === hit.hexes[1], '병 사이 간격 8 px · 누르는 곳은 보이는 칸보다 넓다 (밖 3 px 도 그 병 — 44 px) ' + JSON.stringify(hit));
  ok(h0.bs[0].dis === 'true' && h0.bs[0].label === '빨강, 지금 색' && h0.bs[0].noteShown && h0.bs[0].note === '지금' && h0.bs.slice(1).every(function (b) { return !b.dis && !b.note; }) && h0.ask === 'true' && h0.name === '' && h0.nameH >= 20,
    "지금 색 병: aria-disabled · '빨강, 지금 색' · 아래 '지금' · [물어보기] aria-disabled · 이름 줄은 비어도 한 줄 높이 (" + h0.nameH + ' px)');
  await pa.click('#salon-bottles .bottle[data-hex="' + BLUE + '"]'); await pa.waitForTimeout(250);
  var h1 = await sheet(pa);
  ok(h1.offer === BLUE && h1.name === '파란색' && h1.ask === 'false' && h1.bs[3].pressed === 'true', "파랑 → aria-pressed · 이름 줄 '파란색' · [물어보기] 켜짐 · scene.motion().salon.offer = " + h1.offer);
  await pa.click('#salon-bottles .bottle[data-hex="' + RED + '"]', { force: true }); await pa.waitForTimeout(200);   /* aria-disabled 병도 누를 수 있다 (누르면 이름 줄이 까닭을 말한다) — Playwright 는 aria-disabled 를 '꺼짐' 으로 봐서 force */
  var h2 = await sheet(pa);
  ok(h2.name === '지금 이 색이야.' && h2.ask === 'true' && h2.offer === null && h2.bs.every(function (b) { return b.pressed === 'false'; }), "지금 색 병을 누르면 이름 줄 '지금 이 색이야.' · 고른 병 놓음 · [물어보기] 다시 꺼짐");
  await pa.click('#salon-bottles .bottle[data-hex="' + BLUE + '"]');
  await pa.click('#salon-close'); await pa.waitForSelector('#salon-sheet[open]', { state: 'hidden' }); await pa.waitForTimeout(250);
  var c1 = await st(pa);
  await openSheet(pa); await pa.click('#salon-bottles .bottle[data-hex="' + GREEN + '"]');
  await pa.keyboard.press('Escape'); await pa.waitForSelector('#salon-sheet[open]', { state: 'hidden' }); await pa.waitForTimeout(250);
  var c2 = await st(pa);
  ok(!c1.open && c1.offer === null && !c2.open && c2.offer === null && c2.asks.length === 0 && c2.saved === 0 && c2.color === RED, '[닫기] · Esc 로 그만두면 병은 제자리 (offer null) · 기록 0 · 몸 색 그대로');
  /* 손잡이를 아래로 끌어 닫기 (설정 · 앨범 시트와 같은 길 — 연 뒤 0.5 s 는 잠겨 있다) · 바깥 톡 (마우스) 도 그만두기 */
  await openSheet(pa); await pa.click('#salon-bottles .bottle[data-hex="' + ORANGE + '"]'); await pa.waitForTimeout(650);
  var hd = await pa.evaluate(function () { var q = document.querySelector('#salon-sheet > .handle').getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2, h: document.getElementById('salon-sheet').offsetHeight }; });
  await pa.mouse.move(hd.x, hd.y); await pa.mouse.down();
  for (var dq = 1; dq <= 6; dq++) { await pa.mouse.move(hd.x, hd.y + hd.h * 0.8 * dq / 6); await pa.waitForTimeout(40); }
  await pa.mouse.up(); await pa.waitForTimeout(400);
  var c3 = await st(pa);
  await openSheet(pa); await pa.click('#salon-bottles .bottle[data-hex="' + PINK + '"]'); await pa.waitForTimeout(450);
  await pa.mouse.click(40, 110); await pa.waitForTimeout(400);
  var c4 = await st(pa);
  ok(!c3.open && c3.offer === null && c3.asks.length === 0 && !c4.open && c4.offer === null && c4.asks.length === 0 && c4.saved === 0 && c4.color === RED, '손잡이를 끌어 닫아도 · 바깥을 눌러도 그만두기 (병 제자리 · 기록 0) ' + JSON.stringify({ drag: !c3.open, outside: !c4.open }));
  /* 2t. 손가락 (폰): 거울을 손가락으로 톡 → 시트가 열린 채로 남는다. 장면이 pointerup 에서 단추를 눌러 시트를 열면 브라우저가 같은 톡의 click 을 한 번 더 보내는데,
         시트가 낮아 그 자리가 '바깥' 이라 열리자마자 닫히던 결함 (검증 11-10 — 마우스로만 재던 탓에 안 잡혔다). 병도 손가락으로 고르고, 나중의 바깥 톡은 그만두기 (기록 0) */
  var T = await open({ touch: true }), pt = T.page;
  await pt.goto(O + '/index.html?dev=0');
  await pt.waitForSelector('#btn-go:not(.away)', { timeout: 20000 }); await pt.waitForTimeout(800); await up(pt); await pt.waitForTimeout(300);
  var tp = await spotOf(pt);
  if (tp) await pt.touchscreen.tap(tp.x, tp.y);
  await pt.waitForTimeout(700);
  var t1 = await sheet(pt);
  if (t1.open) await pt.tap('#salon-bottles .bottle[data-hex="' + BLUE + '"]');
  await pt.waitForTimeout(300);
  var t2 = await sheet(pt);
  await pt.touchscreen.tap(40, 110); await pt.waitForTimeout(600);   /* 시트 밖 (장면 왼쪽 위) */
  var t3 = await st(pt);
  ok(!!tp && t1.open && t1.focus === 'salon-h', '손가락 톡으로 거울을 누르면 시트가 열린 채로 남는다 (뒤따르는 click 이 닫지 않는다) ' + JSON.stringify({ at: tp, open: t1.open }));
  ok(t2.open && t2.name === '파란색' && t2.offer === BLUE && !t3.open && t3.offer === null && t3.asks.length === 0 && t3.saved === 0, '손가락으로 병을 고르고 · 나중의 바깥 톡은 그만두기 (병 제자리 · 기록 0) ' + JSON.stringify({ name: t2.name, closed: !t3.open }));
  await T.ctx.close();

  /* 3. 폭 · 테마: 320×568 · 360×640 · 412×780 × 픽셀 · 시스템 × 밝음 · 어둠 — 가로 스크롤 0 · 병 한 줄 · 시트 글자 (U 규칙) · 거울 상자 · 거울 옆 문어가 시트 윗변보다 위 */
  var fits = [];
  for (var vp of [[320, 568], [360, 640], [412, 780]]) {
    for (var font of ['pixel', 'system']) {
      for (var dark of [false, true]) {
        await pa.setViewportSize({ width: vp[0], height: vp[1] }); await pa.emulateMedia({ colorScheme: dark ? 'dark' : 'light' });
        await pa.evaluate(function (f) { document.documentElement.setAttribute('data-font', f); window.scrollTo(0, 0); }, font);
        await park(pa, 'salon');
        await pa.waitForTimeout(400);
        await openSheet(pa); await pa.evaluate(function () { APP.salonPick('#4a86d8'); }); await pa.waitForTimeout(250);
        var q = await pa.evaluate(function () {
          var d = document.getElementById('salon-sheet'), top = d.getBoundingClientRect().top, sp = APP.scene.spotRect('salon'), oc = APP.sceneMode === '3d' ? (APP.scene.targets().filter(function (t) { return t.kind === 'oct'; })[0] || {}).rect : { b: document.getElementById('oct').getBoundingClientRect().bottom };
          var tops = [].map.call(d.querySelectorAll('.bottle'), function (b) { return Math.round(b.getBoundingClientRect().top); });
          var g = window.__glyph ? window.__glyph.scan().filter(function (x) { return /salon|bottle|bnote|bcell/.test(x.at); }).map(function (x) { return x.at + ' ' + x.chars; }) : ['검사기 없음'];
          return { top: Math.round(top), spotB: sp && sp.client ? Math.round(sp.client.y + sp.client.h) : null, octB: oc && isFinite(oc.b) ? Math.round(oc.b) : null, docW: document.documentElement.scrollWidth, vw: innerWidth, oneRow: tops.every(function (t) { return t === tops[0]; }), glyph: g };
        });
        q.k = vp.join('x') + ' ' + font + ' ' + (dark ? 'dark' : 'light');
        fits.push(q);
        if (vp[0] === 320 && !dark) await pa.screenshot({ path: path.join(SHOTS, 'salon-sheet-320x568-' + font + '.png') });
      }
    }
  }
  console.log('   fit:', JSON.stringify(fits.map(function (f) { return f.k + ': top ' + f.top + ' · 단추 아래 ' + f.spotB + ' · 문어 아래 ' + f.octB + (f.docW > f.vw ? ' · 가로 ' + f.docW : '') + (f.oneRow ? '' : ' · 두 줄'); })));
  ok(fits.every(function (f) { return f.docW <= f.vw; }), '12 가지 폭 · 글꼴 · 테마 모두 가로 스크롤 0');
  ok(fits.every(function (f) { return f.oneRow; }), '병 6 은 어느 폭이든 한 줄');
  ok(fits.every(function (f) { return f.glyph.length === 0; }), '시트 글자 · aria-label · 장식에 이모지 · 기호 없음 (두 테마, U 규칙) ' + JSON.stringify(fits.filter(function (f) { return f.glyph.length; }).map(function (f) { return f.k + ' ' + f.glyph.join(','); })));
  ok(fits.every(function (f) { return f.spotB !== null && f.spotB < f.top && f.octB !== null && f.octB < f.top; }), '거울 단추 상자 아래 끝 · 거울 옆에 선 문어가 시트 윗변보다 위 (12 가지 모두)');
  /* 병 7개 (처음 색이 프리셋이 아니고 지금 색도 아니면 '처음 색' 병 하나 더): 320 px 은 4 + 3 · 360 px 은 한 줄 (메모리만 바꿔 본다 — 저장 안 함) */
  var seven = [];
  await pa.evaluate(function () { APP.state.octopus.colors[0].color = '#c06040'; });
  for (var w7 of [320, 360]) {
    await pa.setViewportSize({ width: w7, height: 640 }); await pa.evaluate(function () { document.documentElement.setAttribute('data-font', 'pixel'); });
    await pa.waitForTimeout(250); await openSheet(pa); await pa.evaluate(function () { APP.renderSalonSheet(); });
    seven.push(await pa.evaluate(function () {
      var bs = [].map.call(document.querySelectorAll('#salon-bottles .bottle'), function (b) { return Math.round(b.getBoundingClientRect().top); }), rows = bs.filter(function (t, i) { return bs.indexOf(t) === i; });
      var last = document.querySelector('#salon-bottles .bcell:last-child');
      return { n: bs.length, perRow: rows.map(function (t) { return bs.filter(function (x) { return x === t; }).length; }).join('+'), note: last.querySelector('.bnote').textContent, label: last.querySelector('.bottle').getAttribute('aria-label'), docW: document.documentElement.scrollWidth, vw: innerWidth };
    }));
    if (w7 === 320) await pa.screenshot({ path: path.join(SHOTS, 'salon-sheet-7-320.png') });
  }
  await pa.evaluate(function () { APP.state.octopus.colors[0].color = '#e8463c'; APP.renderSalonSheet(); });
  ok(seven[0].n === 7 && seven[0].perRow === '4+3' && seven[1].perRow === '7' && seven[0].note === '처음' && seven[0].label === '처음 색' && seven.every(function (x) { return x.docW <= x.vw; }),
    "처음 색이 프리셋이 아니면 일곱째 '처음 색' 병 (아래 '처음'): 320 px 은 4 + 3 · 360 px 은 한 줄 " + JSON.stringify(seven));
  await pa.keyboard.press('Escape'); await pa.waitForSelector('#salon-sheet[open]', { state: 'hidden' });
  await pa.setViewportSize({ width: 360, height: 740 }); await pa.emulateMedia({ colorScheme: 'light' });
  await pa.evaluate(function () { document.documentElement.setAttribute('data-font', 'pixel'); window.scrollTo(0, 0); });
  await pa.waitForTimeout(300);
  /* 3p. 한 화면 배치 (11-10): 장면이 화면을 다 쓰고 시트는 그 아래쪽을 덮는다 → 화면을 아래로 끝까지 밀어 둔 채 거울을 누르면 거울 옆 문어가 시트에 가렸다.
         그때만 기본 구도로 되돌린다 (app.js salonFrame → scene.recenter) — 조금 민 화면 (거울이 시트 위 띠 안)은 그대로 둔다 */
  if (await pa.evaluate(function () { return APP.sceneMode === '3d' && typeof APP.scene.pan === 'function' && typeof APP.scene.recenter === 'function'; })) {
    async function drag(dx, dy) { var x0 = 220, y0 = 470; await pa.mouse.move(x0, y0); await pa.mouse.down(); for (var q = 1; q <= 8; q++) { await pa.mouse.move(x0 + dx * q / 8, y0 + dy * q / 8); await pa.waitForTimeout(30); } await pa.mouse.up(); await pa.waitForTimeout(900); }
    function frame() { return pa.evaluate(function () { var d = document.getElementById('salon-sheet'), sp = APP.scene.spotRect('salon'), oc = (APP.scene.targets().filter(function (t) { return t.kind === 'oct'; })[0] || {}).rect, pn = APP.scene.pan(); return { open: d.open, top: Math.round(d.getBoundingClientRect().top), spotB: sp && sp.client ? Math.round(sp.client.y + sp.client.h) : null, octB: oc && isFinite(oc.b) ? Math.round(oc.b) : null, pan: [Math.round(pn.x), Math.round(pn.y)] }; }); }
    await park(pa, 'salon');
    await drag(0, 260);
    var pn0 = await frame(), pp = await spotOf(pa);
    if (pp) await pa.mouse.click(pp.x, pp.y);
    await pa.waitForSelector('#salon-sheet[open]', { timeout: 5000 }).catch(function () {});
    await pa.waitForFunction(function () { var p = APP.scene.pan(); return !p.mode && !p.x && !p.y; }, null, { timeout: 5000 }).catch(function () {});
    var pn1 = await frame();
    await pa.keyboard.press('Escape'); await pa.waitForSelector('#salon-sheet[open]', { state: 'hidden' });
    console.log('   pan:', JSON.stringify({ dragged: pn0, opened: pn1 }));
    ok(pn0.pan[1] > 20 && pn1.open && pn1.pan.join() === '0,0' && pn1.spotB < pn1.top && pn1.octB < pn1.top, '아래로 밀어 둔 화면에서 거울을 누르면 기본 구도로 돌아와 거울 · 거울 옆 문어가 시트 위에 보인다 ' + JSON.stringify({ dragged: pn0.pan, octBefore: pn0.octB, opened: pn1 }));
    await drag(-40, 0);
    var pn2 = await frame();
    await openSheet(pa); await pa.waitForTimeout(600);
    var pn3 = await frame();
    await pa.keyboard.press('Escape'); await pa.waitForSelector('#salon-sheet[open]', { state: 'hidden' });
    ok(pn2.pan[0] !== 0 && pn3.pan.join() === pn2.pan.join() && pn3.spotB < pn3.top, '조금 민 화면 (거울이 시트 위에 그대로 보임)은 되돌리지 않는다 ' + JSON.stringify({ before: pn2.pan, after: pn3.pan }));
    await pa.evaluate(function () { APP.scene.recenter(); }); await pa.waitForTimeout(600);
  }
  /* 3f. 가구 배치 중 (11-10 배치 모드 — 장면 톡 · 캐릭터 앞은 가구 몫): 거울 단추가 숨고 시트가 열리지 않는다. 끝내면 다시 보인다 */
  if (await pa.$('#btn-furn:not([hidden])')) {
    await pa.click('#btn-furn'); await pa.waitForTimeout(400);
    var fm = await pa.evaluate(function () { var b = document.getElementById('btn-salon'), r = APP.openSalon(), o = { on: document.documentElement.classList.contains('furn-on'), hidden: b.hidden, opened: r, sheet: document.getElementById('salon-sheet').open }; if (o.sheet) document.getElementById('salon-sheet').close(); return o; });
    await pa.click('#btn-furn'); await pa.waitForTimeout(400);
    var fm2 = await pa.evaluate(function () { return { on: document.documentElement.classList.contains('furn-on'), hidden: document.getElementById('btn-salon').hidden }; });
    ok(fm.on && fm.hidden && !fm.opened && !fm.sheet && !fm2.on && !fm2.hidden, '가구 배치 중엔 거울 단추가 숨고 미용실 시트가 열리지 않는다 · 끝내면 다시 보인다 ' + JSON.stringify([fm, fm2]));
  }

  /* 4. 첫 물음 (11-09, 보통 속도): 답은 바로 저장 · 시트 닫힘 · 장면은 첨벙까지 옛 색 · 행은 박자에 맞춰 · 연출 중 단추 숨김 */
  await pa.waitForFunction(function () { return !document.getElementById('toast').classList.contains('show'); }, null, { timeout: 6000 }).catch(function () {});   /* 떠 있는 보통 알림(가구 배치 안내)은 새 줄 알림을 밀어내지 않는다 → 걷힌 뒤에 묻는다 */
  await openSheet(pa); await pa.click('#salon-bottles .bottle[data-hex="' + BLUE + '"]');
  var u0 = await st(pa);   /* 묻기 전의 살림 · 옷 색 */
  await pa.click('#salon-ask');
  var a0 = await st(pa), t0 = Date.now(), seq = [], firstAt = {}, flipAt = 0, tubSeen = false, bubbleSeen = '', hiddenAll = true, notices = [];
  for (var k = 0; k < 400; k++) {
    var s = await st(pa), el = Date.now() - t0, id = a0.asks[0] && a0.asks[0].id;
    rowsOf(s, id).forEach(function (r) { if (!(r.n in firstAt)) firstAt[r.n] = el; });
    if (!flipAt && s.sceneColor === BLUE) flipAt = el;
    if (s.tub) tubSeen = true;
    if (s.bubble && !bubbleSeen) bubbleSeen = s.bubble;
    if (s.row && s.toast && notices.indexOf(s.toast) < 0) notices.push(s.toast);
    if (s.stage && (!s.btn.hidden || s.door !== 'hidden' || s.stair !== 'hidden')) hiddenAll = false;
    if (!s.stage) break;
    await pa.waitForTimeout(120);
  }
  for (var kn = 0; kn < 10 && !notices.some(function (x) { return x.indexOf('몸 색 · ') === 0; }); kn++) {   /* 행 3 의 알림은 행이 붙고 120 ms 뒤에 뜬다 (연출이 끝난 바로 뒤) */
    await pa.waitForTimeout(100); var sn = await st(pa); if (sn.row && sn.toast && notices.indexOf(sn.toast) < 0) notices.push(sn.toast);
  }
  var a1 = await st(pa), id1 = a0.asks[0] && a0.asks[0].id, r1 = rowsOf(a1, id1);
  console.log('   first ask:', JSON.stringify({ at: firstAt, flip: flipAt, rows: r1.map(function (r) { return r.n + ' ' + r.label + ' ' + r.text + (r.tail ? ' [' + r.tail + ']' : ''); }), bubble: bubbleSeen }));
  ok(a0.asks.length === 1 && a0.saved === 1 && a0.color === BLUE && a0.copy === BLUE && a0.sceneColor === RED && !a0.open && a0.active && !!a0.stage, '[물어보기]: 물음 · 몸 색을 바로 한 번에 저장 · 시트 닫힘 · 장면 문어는 아직 빨강 (연출이 끝날 때까지 옛 색)');
  ok(hiddenAll, '연출 중엔 거울 단추 · 놀이방 문 단추 · 위층 계단 단추가 숨는다');
  ok(firstAt[1] !== undefined && firstAt[2] > firstAt[1] && firstAt[3] > firstAt[2] && flipAt > firstAt[2] && flipAt <= firstAt[3] && tubSeen, '행이 박자에 맞춰 붙는다: 행 1 → (숨 고르기 · 움츠림) → 대답 → (대야 · 첨벙에서 파랑) → 몸 색 ' + JSON.stringify(firstAt) + ' · 첨벙 ' + flipAt + ' ms');
  ok(r1.length === 3 && r1[0].label === '미용실' && r1[0].text === '파란색 어때? 하고 물어봤어.' && !r1[0].voice && r1[1].label === '대답' && r1[1].text === '응, 해 볼래.' && r1[1].voice && r1[1].expr === 'happy' && !r1[1].raw &&
    r1[2].label === '몸 색' && r1[2].text === '뚜루 몸이 파란색이 됐어.' && r1[2].tail === '데모 규칙', "행 셋: '미용실' 파란색 어때? 하고 물어봤어. → '대답' 응, 해 볼래. (문어 목소리 · 웃는 초상) → '몸 색' 뚜루 몸이 파란색이 됐어. + 꼬리 '데모 규칙'");
  var lastC = a1.colors[a1.colors.length - 1];
  ok(a1.color === BLUE && a1.sceneColor === BLUE && lastC.how === 'salon' && lastC.by === 'demo-rules' && lastC.ask === id1 && a1.asks[0].action === 'dye' && a1.asks[0].by === 'demo-rules' && !a1.active && !a1.stage && !a1.btn.hidden && a1.door !== 'hidden' && !a1.tub,
    "끝: 몸 색 파랑 · colors 마지막 { how: 'salon', by: 'demo-rules', ask } · 대야 없음 · 거울 단추 · 놀이방 문 다시");
  ok(bubbleSeen === '응, 해 볼래.', '대답 말풍선 (' + bubbleSeen + ')');
  /* 한 화면 배치 (11-10): 로그는 닫힌 '오늘의 산책' 쪽지 안에 있다 → 행이 붙을 때마다 화면엔 한 줄 알림 (라벨 · 글). 결과 문장과 꼬리 사이는 한 칸 (알림 · 낭독이 '됐어.데모 규칙' 으로 붙지 않게) */
  var one4 = await pa.evaluate(function () { return document.documentElement.getAttribute('data-layout') === 'one'; });
  console.log('   notices:', JSON.stringify(notices));
  if (one4) ok(notices.some(function (x) { return x.indexOf('미용실 · 파란색 어때?') === 0; }) && notices.some(function (x) { return x.indexOf('몸 색 · 뚜루 몸이') === 0; }), '한 화면 배치: 행이 붙을 때마다 한 줄 알림 (미용실 · … / 몸 색 · …) ' + JSON.stringify(notices));
  ok(r1[2].full === '뚜루 몸이 파란색이 됐어. 데모 규칙', "결과 문장과 고른 이 꼬리 사이는 한 칸 ('" + r1[2].full + "')");
  var lab4 = await pa.evaluate(function () {   /* 라벨 '미용실' (세 글자) 이 좁은 라벨 칸에서 '미용 / 실' 로 꺾이지 않는다 (픽셀 · 시스템 글꼴) — 쪽지를 열고 잰다 */
    var d = document.getElementById('log-sheet'), was = d && d.open, out = {};
    if (d && !was && document.documentElement.getAttribute('data-layout') === 'one') d.showModal();
    ['pixel', 'system'].forEach(function (f) { document.documentElement.setAttribute('data-font', f); out[f] = [].map.call(document.querySelectorAll('#log .lrow[data-salon] .ltool'), function (t) { var c = getComputedStyle(t), lh = parseFloat(c.lineHeight) || parseFloat(c.fontSize) * 1.4; return t.textContent + ':' + (t.getBoundingClientRect().height <= lh * 1.5 ? 1 : 2); }).join(','); });
    document.documentElement.setAttribute('data-font', 'pixel'); if (d && !was && d.open) d.close();
    return out;
  });
  ok(lab4.pixel === '미용실:1,대답:1,몸 색:1' && lab4.system === '미용실:1,대답:1,몸 색:1', '미용실 행의 라벨은 한 줄 (픽셀 · 시스템) ' + JSON.stringify(lab4));
  ok(a1.user === u0.user && a0.user === u0.user && a1.clothes === u0.clothes, '미용실은 살림(조개 · 씨앗 · 염료)과 내 캐릭터 옷 색을 건드리지 않는다 (묻기 전 = 묻자마자 = 연출 뒤) ' + a1.user);

  /* 5. 같은 날 다시 톡 → 토스트만 (시트 없음) */
  await clickSpot(pa, '#btn-salon'); await pa.waitForTimeout(400);
  var a2 = await st(pa);
  ok(!a2.open && a2.toast === '내일 또 물어볼 수 있어.' && a2.asks.length === 1, "오늘 이미 물었으면 거울 톡 = 토스트 '내일 또 물어볼 수 있어.' (시트 없음 · 기록 그대로)");

  /* 6. 11-10: 답 = 데모 규칙 시드 ('그대로') · 연출 중 새로고침 → 행 셋이 한 번씩 · 연출 없음 · 색 그대로 */
  await setDay(pa, D2);
  var want2 = await pa.evaluate(function (d) { return SALON.demoAnswer({ dateKey: d, name: '뚜루', born: APP.state.octopus.born, asksBefore: 1 }); }, D2);
  await openSheet(pa); await pa.click('#salon-bottles .bottle[data-hex="' + GREEN + '"]'); await pa.click('#salon-ask');
  await pa.waitForFunction(function () { return APP.salonStage && APP.salonStage.n >= 1; }, null, { timeout: 5000 });
  var mid = await st(pa);
  await pa.reload(); await pa.waitForSelector('#btn-go:not(.away)', { timeout: 20000 }); await pa.waitForTimeout(900); await up(pa);
  var a3 = await st(pa), ask2 = a3.asks[1] || {}, r2 = rowsOf(a3, ask2.id);
  console.log('   11-10:', JSON.stringify({ want: want2, ask: ask2, rows: r2.map(function (r) { return r.n + ' ' + r.text + (r.tail ? ' [' + r.tail + ']' : ''); }), midRows: rowsOf(mid, ask2.id).length }));
  ok(want2.action === 'keep' && ask2.action === want2.action && ask2.line === want2.line && ask2.by === 'demo-rules' && ask2.date === D2, "11-10 답 = SALON.demoAnswer({ dateKey, name, born, asksBefore: 1 }) ('" + want2.action + "' · " + want2.line + ')');
  ok(rowsOf(mid, ask2.id).length < 3 && r2.length === 3 && r2.map(function (r) { return r.n; }).join() === '1,2,3' && r2[0].text === '초록색 어때? 하고 물어봤어.' && r2[1].text === want2.line && r2[2].text === '색은 그대로야.' && r2[2].tail === '데모 규칙',
    "연출 중 새로고침 → 행 셋이 한 번씩 (초록색 어때? · " + want2.line + " · 색은 그대로야. + '데모 규칙')");
  ok(!a3.stage && !a3.active && !a3.tub && a3.color === BLUE && a3.sceneColor === BLUE && !a3.rows.some(function (r) { return r.id === id1; }), '새로고침은 연출을 다시 하지 않는다 · 몸 색 그대로 (파랑) · 지난 날 행은 오늘 칸에 없다');

  /* 7. 그 병은 11-10 … 11-16 쉬고 11-17 에 열린다 (시트: aria-disabled · 이름 줄 · [물어보기] 꺼짐) */
  await setDay(pa, D3);
  await openSheet(pa);
  var g0 = await sheet(pa), gb = g0.bs.filter(function (b) { return b.hex === GREEN; })[0] || {};
  await pa.click('#salon-bottles .bottle[data-hex="' + GREEN + '"]', { force: true }); await pa.waitForTimeout(200);
  var g1 = await sheet(pa);
  var rest = await pa.evaluate(function (G) { var out = {}; ['2026-11-10', '2026-11-13', '2026-11-16', '2026-11-17'].forEach(function (d) { out[d] = SALON.bottles(APP.state, d).filter(function (b) { return b.hex === G; })[0].resting; }); return out; }, GREEN);
  ok(gb.dis === 'true' && gb.label === '초록, 며칠 뒤에 물어볼 수 있어' && g1.name === '이 색은 며칠 뒤에 물어볼 수 있어.' && g1.ask === 'true' && g1.offer === null, "'그대로' 한 초록 병: aria-disabled · '초록, 며칠 뒤에 물어볼 수 있어' · 이름 줄 '이 색은 며칠 뒤에 물어볼 수 있어.' (남은 날 수는 숨김)");
  ok(rest['2026-11-10'] && rest['2026-11-13'] && rest['2026-11-16'] && !rest['2026-11-17'], '쉼: 11-10 … 11-16 쉬고 11-17 에 열림 ' + JSON.stringify(rest));

  /* 8. 11-11 모션 줄이기: [물어보기] → 행 3 까지 4.5 s 안 · 걷기 · 폴짝 · 물보라 없음 */
  await pa.keyboard.press('Escape'); await pa.waitForSelector('#salon-sheet[open]', { state: 'hidden' });
  await pa.click('#btn-settings'); await pa.waitForSelector('#settings-sheet[open]'); await pa.selectOption('#set-motion', 'reduce'); await pa.click('#set-close'); await pa.waitForSelector('#settings-sheet[open]', { state: 'hidden' });
  await park(pa, 'window');   /* 거울에서 떨어진 곳에서 묻는다 (모션 줄이기면 걷지 않고 그 자리로) */
  await openSheet(pa); await pa.click('#salon-bottles .bottle[data-hex="' + PINK + '"]');
  await pa.evaluate(function () {
    var Y = window.__ys = { walk: false, hop: 0, splash: false, t0: 0, t3: 0, id: null };
    document.getElementById('salon-ask').addEventListener('click', function () { if (!Y.t0) Y.t0 = performance.now(); }, true);
    Y.iv = setInterval(function () {
      if (!Y.t0) return;
      var s = APP.salonStage; if (s && !Y.id) Y.id = s.id;
      if (APP.oct.state === 'walk') Y.walk = true;
      var m = APP.scene.motion(); Y.hop = Math.max(Y.hop, Math.abs(m.hop || 0)); if (m.salon && m.salon.splash) Y.splash = true;
      if (Y.id && !Y.t3 && document.querySelector('#log .lrow[data-salon="' + Y.id + '"][data-n="3"]')) Y.t3 = performance.now();
    }, 25);
    /* 행 3 이 붙는 순간은 지켜보기로도 잰다 (붙는 그 일(task) 안에서 불린다): 연출이 끝난 바로 뒤 25 ms 틱이 돌기 전에 아래에서 값을 읽어 가면 t3 가 0 으로 남던 경합 (검증 11-10, 바쁜 기계) */
    var have = [].map.call(document.querySelectorAll('#log .lrow[data-salon][data-n="3"]'), function (r) { return r.getAttribute('data-salon'); });
    Y.mo = new MutationObserver(function () { if (!Y.t0 || Y.t3) return; var r = [].filter.call(document.querySelectorAll('#log .lrow[data-salon][data-n="3"]'), function (x) { return have.indexOf(x.getAttribute('data-salon')) < 0; })[0]; if (r) Y.t3 = performance.now(); });
    Y.mo.observe(document.getElementById('log'), { childList: true, subtree: true });
  });
  await pa.click('#salon-ask');
  var rEnd = await waitStageEnd(pa, 20000);
  var ys = await pa.evaluate(function () { var Y = window.__ys; clearInterval(Y.iv); Y.mo.disconnect(); return { walk: Y.walk, hop: Y.hop, splash: Y.splash, t0: Y.t0, t3: Y.t3, id: Y.id }; }), a4 = await st(pa), ask3 = a4.asks[2] || {};
  console.log('   reduced:', JSON.stringify({ ms: Math.round(ys.t3 - ys.t0), walk: ys.walk, hop: ys.hop, splash: ys.splash, ask: ask3.action + ' ' + ask3.line }));
  ok(rEnd && ys.t3 > 0 && ys.t3 - ys.t0 <= 4500, '모션 줄이기: [물어보기] → 행 3 까지 ' + Math.round(ys.t3 - ys.t0) + ' ms (4.5 s 안)');
  ok(!ys.walk && ys.hop === 0 && !ys.splash, '모션 줄이기: 걷기 · 폴짝 · 물보라 없음 (리듬만 남는다)');
  ok(ask3.action === 'dye' && a4.color === PINK && a4.sceneColor === PINK, "11-11 '바꾸기' → 분홍 (장면도)");
  var gives = await pa.evaluate(function () { var S = APP.state; return { lantern: S.room.lantern, days: S.octopus.days.length, souvenirs: S.room.souvenirs.length, invites: S.octopus.invites, trips: S.trips.length, affinity: Object.keys(S.octopus.affinity).length, notes: S.curiosityNotes.length }; });
  ok(gives.lantern === 2 && gives.days === 2 && gives.souvenirs === 0 && gives.invites === 2 && gives.trips === 0 && gives.affinity === 0 && gives.notes === 0, '미용실은 아무것도 주지 않는다: 물음 셋 뒤에도 등불 · 함께한 날 · 기념품 · 초대 수 · 취향 · 메모 그대로 ' + JSON.stringify(gives));
  await pa.click('#btn-settings'); await pa.waitForSelector('#settings-sheet[open]'); await pa.selectOption('#set-motion', 'auto'); await pa.click('#set-close'); await pa.waitForSelector('#settings-sheet[open]', { state: 'hidden' });

  /* 9. 11-12: 연출 중 주 버튼 → 남은 연출을 한 번에 (새 색 · 대야 없음 · 행 셋) · 초대는 평소대로 → 돌아와 자는 문어는 거울 톡에 '쿨쿨…' 만 */
  await setDay(pa, D4);
  var want4 = await pa.evaluate(function (d) { return SALON.demoAnswer({ dateKey: d, name: '뚜루', born: APP.state.octopus.born, asksBefore: 3 }); }, D4);
  await openSheet(pa); await pa.click('#salon-bottles .bottle[data-hex="' + ORANGE + '"]'); await pa.click('#salon-ask');
  await pa.waitForFunction(function () { return APP.salonStage && APP.salonStage.n >= 2; }, null, { timeout: 8000 }).catch(function () {});
  /* 연출 중 문어 톡 · 쓰다듬기: 아무 일도 없다 (톡 한 줄 · 하트 · 쓰다듬 상태 없음 — 문어가 고른 대답을 덮지 않는다) */
  var q9 = await pa.evaluate(function () { var b = document.getElementById('oct-bubble'), o = (APP.scene.targets ? APP.scene.targets() : []).filter(function (t) { return t.kind === 'oct'; })[0]; return { on: !!APP.salonStage, bubble: b && !b.hidden ? b.textContent : '', x: o ? o.x : null, y: o ? o.y : null }; });
  if (q9.on && q9.x != null) { await pa.mouse.move(q9.x, q9.y); await pa.mouse.down(); await pa.waitForTimeout(450); await pa.mouse.up(); }
  var q9b = await pa.evaluate(function () { APP.tapOct(); var b = document.getElementById('oct-bubble'); return { on: !!APP.salonStage, bubble: b && !b.hidden ? b.textContent : '', state: APP.oct.state, line: APP.tapLine ? (APP.tapLine() || {}).text || '' : '' }; });
  if (q9.on && q9b.on) ok(q9b.state !== 'pet' && (q9b.bubble === q9.bubble || q9b.bubble === '') && (!q9b.line || q9b.bubble !== q9b.line), '연출 중 문어를 누르고 있거나 톡 해도 쓰다듬기 · 톡 한 줄이 없다 ' + JSON.stringify({ state: q9b.state, bubble: q9b.bubble }));
  await pa.click('#btn-go');
  var a5 = await st(pa), ask4 = a5.asks[3] || {}, r4 = rowsOf(a5, ask4.id), col4 = want4.action === 'dye' ? ORANGE : PINK;
  ok(!a5.stage && !a5.active && !a5.tub && r4.length === (want4.line ? 3 : 2) && r4[r4.length - 1].n === 3 && a5.color === col4 && a5.sceneColor === col4,
    '연출 중 주 버튼 → 끝 상태로 감김 (행 ' + r4.map(function (r) { return r.n; }).join() + ' · 몸 색 ' + a5.sceneColor + ' · 대야 없음)');
  var went = await pa.waitForSelector('#btn-go.away', { timeout: 5000 }).then(function () { return true; }, function () { return false; });
  ok(went, '…그리고 초대는 평소대로 (다녀오는 중…)');
  await skipAway(pa); await waitIdle(pa);
  await pa.waitForFunction(function () { return APP.oct.state === 'sleep'; }, null, { timeout: 15000 }).catch(function () {});
  await pa.evaluate(function () { if (APP.oct.state !== 'sleep') APP.octState('sleep'); });   /* 빈 차례였으면 (자지 않는다) 잠든 문어로 */
  await pa.waitForTimeout(400);
  /* 11-11: 자는 문어는 위층에 따라 올라오지 않는다. 위층 거울 단추는 보이고, 누르면 한 줄만 (깨우지 않음 · 시트 없음 · 기록 0) */
  await pa.evaluate(function () { return APP.goRoom('loft'); });
  await pa.waitForFunction(function () { return APP.room === 'loft' && !document.getElementById('btn-salon').hidden; }, null, { timeout: 15000 }).catch(function () {});
  await pa.waitForFunction(function () { return !document.getElementById('toast').classList.contains('show'); }, null, { timeout: 8000 }).catch(function () {});
  var z0 = await st(pa), zUp = await pa.evaluate(function () { return APP.scene.octUp(); });
  await clickSpot(pa, '#btn-salon'); await pa.waitForTimeout(300);
  var z1 = await st(pa);
  ok(z0.oct === 'sleep' && !zUp && !z0.btn.hidden && !z1.open && z1.toast === '지금은 아래층에서 자고 있어.' && z1.oct === 'sleep' && z1.asks.length === z0.asks.length, "자는 문어: 위층에 따라 올라오지 않는다 · 거울 단추는 보이고, 누르면 '지금은 아래층에서 자고 있어.' 한 줄만 (깨우지 않음 · 시트 없음 · 기록 그대로)");
  await pa.evaluate(function () { return APP.goRoom('attic'); }); await pa.waitForFunction(function () { return APP.room === null; }, null, { timeout: 10000 }).catch(function () {});

  /* 10. 앨범 '일기': 물음만 있는 지난 날 (11-10) · 날 머리 '· 1건' · 행 셋 */
  await openAlbum(pa); await pa.click('.fchip[data-f="diary"]'); await pa.waitForTimeout(300);
  if (await pa.$('#album-diary details[data-day="' + D2 + '"]:not([open])')) await pa.click('#album-diary details[data-day="' + D2 + '"] > summary');
  await pa.waitForTimeout(300);
  var dy = await pa.evaluate(function (d) {
    var det = document.querySelector('#album-diary details[data-day="' + d + '"]'); if (!det) return null;
    var rows = [].map.call(det.querySelectorAll('.lrow[data-salon]'), function (r) { return r.getAttribute('data-n') + ' ' + (r.querySelector('.ltool') || {}).textContent; });
    return { sum: det.querySelector('summary').textContent, rows: rows, trips: det.querySelectorAll('.lrow:not([data-salon])').length };
  }, D2);
  console.log('   diary 11-10:', JSON.stringify(dy));
  ok(dy && /· 1건$/.test(dy.sum) && dy.rows.join('|') === '1 미용실|2 대답|3 몸 색' && dy.trips === 0, "앨범 '일기': 물음만 있는 지난 날도 나오고 (· 1건) 행 셋 (미용실 · 대답 · 몸 색)");
  await closeAlbum(pa);
  await A.ctx.close();

  /* 10b. 다른 탭 (docs/SALON.md §7.5): 탭 B 가 병을 고른 채 시트를 열어 둔 사이 탭 A 가 먼저 묻는다 → B 의 [물어보기] 는 저장소를 다시 읽고 묻지 않는다 (시트 닫힘 · 토스트 · 물음은 A 것 하나 · B 장면도 그 색).
          그 뒤 낡은 기록(물음 없음)이 저장소에 덮여 써지면 A 는 60 s 안의 제 물음 · 색 줄을 다시 얹어 저장한다 (SALON.merge 의 mine) */
  var W = await open({}), wa = W.page;
  async function tabOf(ctx) {
    var pg = await ctx.newPage(); watchErrors(pg, bag);
    if (useStubs) { await pg.addInitScript({ path: path.join(ROOT, 'tools/stubs.js') }); if (haveReal) await pg.route(/\/js\/(world|brain)\.js$/, function (route) { return route.fulfill({ status: 200, contentType: 'application/javascript', body: '/* stubbed by tools/smoke.js */' }); }); }
    await pg.addInitScript({ content: "window.__ppolAwakeMs = 0; window.__ppolTest = { today: sessionStorage.getItem('__y_day') || '" + D1 + "' };" });
    await routeWiki(pg, 'ok'); await routeRepo(pg, O);
    return pg;
  }
  await wa.goto(O + '/index.html?dev=0'); await wa.waitForSelector('#btn-go:not(.away)', { timeout: 20000 });
  await wa.waitForFunction(function (d) { return APP.state.user && APP.state.user.giftDay === d && !document.getElementById('toast').classList.contains('show'); }, D1, { timeout: 10000 }).catch(function () {});   /* 그날 선물 알림(살림, 열고 2.5 s 뒤)이 지나간 뒤에 — 둘째 탭은 이미 받은 날이라 알림이 없다 */
  await up(wa);
  var wb = await tabOf(W.ctx);
  await wb.goto(O + '/index.html?dev=0'); await wb.waitForSelector('#btn-go:not(.away)', { timeout: 20000 }); await wb.waitForTimeout(500); await up(wb);
  await openSheet(wb); await wb.evaluate(function (h) { APP.salonPick(h); }, BLUE);
  await openSheet(wa); await wa.evaluate(function (h) { APP.salonPick(h); APP.salonAsk(); APP.salonFinish(); }, GREEN);
  await wb.waitForTimeout(600);
  await wb.evaluate(function () { document.getElementById('salon-ask').click(); });
  await wb.waitForTimeout(600);
  var tb = await st(wb), ta = await st(wa);
  ok(ta.asks.length === 1 && ta.asks[0].offer === GREEN && ta.asks[0].action === 'dye' && tb.asks.length === 1 && tb.asks[0].id === ta.asks[0].id && !tb.open && !tb.stage && tb.toast === '내일 또 물어볼 수 있어.' && tb.color === GREEN && tb.sceneColor === GREEN,
    "다른 탭이 오늘 먼저 물었으면 이 탭의 [물어보기] 는 묻지 않는다 (시트 닫힘 · '내일 또 물어볼 수 있어.' · 물음 하나 · 몸 색은 그 탭의 답) " + JSON.stringify({ b: { asks: tb.asks.length, toast: tb.toast, color: tb.sceneColor, open: tb.open } }));
  await wb.evaluate(function (RED) {   /* 낡은 탭의 저장 흉내: 물음 · 미용실 색 줄이 없는 기록을 더 새 것처럼 덮어쓴다 */
    var o = JSON.parse(localStorage.getItem('ppolppol_v2'));
    o.salon.asks = []; o.octopus.colors = o.octopus.colors.filter(function (c) { return c.how !== 'salon'; }); o.octopus.color = RED; o.settings.octColor = RED; o.settings.lastSeen = Date.now() + 50;
    localStorage.setItem('ppolppol_v2', JSON.stringify(o));
  }, RED);
  var kept = await wa.waitForFunction(function () { var sv = JSON.parse(localStorage.getItem('ppolppol_v2') || '{}'); return ((sv.salon || {}).asks || []).length === 1 && sv.octopus.color !== '#e8463c'; }, null, { timeout: 5000 }).then(function () { return true; }, function () { return false; });
  var ta2 = await st(wa);
  ok(kept && ta2.asks.length === 1 && ta2.asks[0].offer === GREEN && ta2.color === GREEN && ta2.sceneColor === GREEN && ta2.saved === 1 && ta2.colors[ta2.colors.length - 1].how === 'salon' && ta2.colors[ta2.colors.length - 1].ask === ta2.asks[0].id,
    '낡은 기록이 덮어써도 방금 한 물음 · 그 색 줄은 다시 얹혀 저장된다 (하루 한 번 · 색의 출처 하나) ' + JSON.stringify({ asks: ta2.asks.length, color: ta2.color, saved: ta2.saved }));
  await W.ctx.close();

  /* 11. file:// (자동 개발 모드 — #demo 는 보임): 등불 1칸엔 거울 없음 · ?dev=1 이 없으면 '다음 미용실 대답' · '바로 바꾸기' 없음 → ?dev=1&scene=2d: 있음 · '그대로' (사람이 정함) · '바꾸기' (2D 몸 색) */
  var F = await open({ file: true, rec: REC(1) }), pf = F.page;
  await pf.goto(INDEX); await pf.waitForSelector('#btn-go:not(.away)', { timeout: 20000 }); await pf.waitForTimeout(600);
  await pf.evaluate(function () { return APP.goRoom('loft'); }); await pf.waitForFunction(function () { return APP.room === 'loft' && APP.scene.octUp(); }, null, { timeout: 15000 }).catch(function () {});   /* 등불 1칸: 위층에 올라와도 (문어가 따라와도) 거울은 아직 없다 */
  var f0 = await pf.evaluate(function () { APP.openSettings(); var o = { btn: document.getElementById('btn-salon').hidden, dv: !!document.getElementById('dv-salon'), dev: !!document.getElementById('set-color-dev'), demo: !document.getElementById('demo').hidden, explicit: APP.devExplicit }; document.getElementById('settings-sheet').close(); return o; });
  ok(f0.btn && !(await hasItem(pf, 'salon')) && !f0.dv && !f0.dev && f0.demo && !f0.explicit, "등불 1칸: 거울 단추 · 소품 없음 · file:// 에서 ?dev=1 이 없으면 '다음 미용실 대답' · '바로 바꾸기' 없음 (#demo 는 보임) " + JSON.stringify(f0));
  await pf.evaluate(function (r) { return APP.importJSON(JSON.stringify(r)); }, REC(2));
  await pf.goto(INDEX + '?dev=1&scene=2d'); await pf.waitForSelector('#btn-go:not(.away)', { timeout: 20000 }); await pf.waitForTimeout(600);
  var f1 = await pf.evaluate(function () { APP.openSettings(); var o = { mode: APP.sceneMode, btn: !document.getElementById('btn-salon').hidden, spot: document.getElementById('btn-salon').dataset.spot, dv: !!document.getElementById('dv-salon'), chips: [].map.call(document.querySelectorAll('[data-salon-next]'), function (b) { return b.textContent + ':' + b.getAttribute('aria-pressed'); }).join(','), dev: (document.getElementById('set-color-dev') || {}).textContent }; document.getElementById('settings-sheet').close(); return o; });
  ok(f1.mode === '2d' && f1.btn && f1.spot === 'over' && f1.dv && f1.chips === '규칙대로:true,바꾸기:false,그대로:false,대답 없음:false' && f1.dev === '개발용 · 바로 바꾸기', "?dev=1 (2D): 거울 단추 · '다음 미용실 대답' (규칙대로 · 바꾸기 · 그대로 · 대답 없음) · '바로 바꾸기' " + JSON.stringify(f1));
  await pf.click('#demo summary').catch(function () {});
  await pf.evaluate(function () { document.getElementById('demo').open = true; });
  await pf.click('[data-salon-next="keep"]');
  await openSheet(pf); await pf.click('#salon-bottles .bottle[data-hex="' + BLUE + '"]'); await pf.click('#salon-ask');
  var e1 = await waitStageEnd(pf, 30000), k1 = await st(pf), hk = k1.asks[k1.asks.length - 1] || {}, rk = rowsOf(k1, hk.id);
  var chipBack = await pf.evaluate(function () { return (document.querySelector('[data-salon-next][aria-pressed="true"]') || {}).textContent; });
  ok(e1 && hk.by === 'human' && hk.action === 'keep' && hk.line === null && rk.map(function (r) { return r.n; }).join() === '1,3' && rk[1].text === '색은 그대로야.' && rk[1].tail === '사람이 정함' && k1.color === RED && chipBack === '규칙대로',
    "개발용 '다음 대답: 그대로' → by 'human' · 문어 행 · 말풍선 없음 · 꼬리 '사람이 정함' · 한 번 쓰면 '규칙대로' 로 " + JSON.stringify({ by: hk.by, rows: rk.map(function (r) { return r.n + ' ' + r.text + ' [' + r.tail + ']'; }), chip: chipBack }));
  await setDay(pf, D2);
  await pf.click('[data-salon-next="dye"]');
  await openSheet(pf); await pf.click('#salon-bottles .bottle[data-hex="' + GREEN + '"]'); await pf.click('#salon-ask');
  var e2 = await waitStageEnd(pf, 40000), k2 = await st(pf), hd = k2.asks[k2.asks.length - 1] || {}, rd = rowsOf(k2, hd.id);
  ok(e2 && hd.by === 'human' && hd.action === 'dye' && rd.map(function (r) { return r.n; }).join() === '1,3' && rd[1].text === '뚜루 몸이 초록색이 됐어.' && rd[1].tail === '사람이 정함' && k2.color === GREEN && k2.sceneColor === GREEN,
    "2D 장면 · 개발용 '바꾸기' → 대야 연출 뒤 2D 문어도 초록 · 행 1 · 3 (사람이 정함) " + JSON.stringify({ scene: k2.sceneColor, rows: rd.map(function (r) { return r.n + ' ' + r.text; }) }));
  await F.ctx.close();
  reportErrors(bag, 'Y');
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
  /* 11-08 움직이기 — 발자국 손잡이(#stick, 장면 왼쪽 아래 가상 스틱): 자리 · 크기 · 겹침 · 글자(이모지 0) · 장면 API 유무 */
  function stickInfo(pg) { return (pg || page).evaluate(function () {
    var st = document.getElementById('stick'), q = st.getBoundingClientRect(), sc = document.getElementById('scene').getBoundingClientRect(), ctl = document.getElementById('scene-ctl').getBoundingClientRect();
    function ov(id) { var e = document.getElementById(id); if (!e || e.hidden) return false; var box = e.querySelector('.door-box'), r = box && box.getBoundingClientRect().width ? box.getBoundingClientRect() : e.getBoundingClientRect(); return r.width > 0 && q.left < r.right && q.right > r.left && q.top < r.bottom && q.bottom > r.top; }
    var ico = st.querySelector('.stick-ico'), sticks = window.APP && APP.stick;
    return { hidden: st.hidden, w: Math.round(q.width), h: Math.round(q.height), left: Math.round(q.left - sc.left), bottom: Math.round(sc.bottom - q.bottom),
      inside: q.left >= sc.left - 0.5 && q.right <= sc.right + 0.5 && q.top >= sc.top - 0.5 && q.bottom <= sc.bottom + 0.5, ctl: q.left < ctl.right && q.right > ctl.left && q.top < ctl.bottom && q.bottom > ctl.top,
      door: ov('btn-door'), pdoor: ov('btn-play-door'), mach: ov('btn-machine'), note: ov('back-note'), edge: !document.getElementById('btn-door').hidden && document.getElementById('btn-door').dataset.spot === 'edge',
      text: st.textContent.replace(/\s+/g, ''), icon: !!ico && ico.complete && ico.naturalWidth > 0 && getComputedStyle(ico).display !== 'none', noImg: st.classList.contains('no-img'), aria: st.getAttribute('aria-hidden'),
      pe: getComputedStyle(st).pointerEvents, ta: getComputedStyle(st).touchAction, zone: (function () { var z = document.getElementById('stick-zone'); if (!z) return null; var zr = z.getBoundingClientRect(), zs = getComputedStyle(z); return { hidden: z.hidden, aria: z.getAttribute('aria-hidden'), pe: zs.pointerEvents, ta: zs.touchAction, covers: zr.left <= q.left && zr.right >= q.right && zr.top <= q.top && zr.bottom >= q.bottom, text: z.textContent }; })(), api: typeof APP.scene.setPlayerInput === 'function', allowed: !!(sticks && sticks.allowed), view: APP.scene.view(), mode: APP.sceneMode };
  }); }
  /* 프레임마다: 스틱과 바깥의 집 단추(edge)가 같은 프레임에 둘 다 보이는 일이 없는지 · 보이는 장소별로 스틱이 보인 프레임 수 */
  function watchBoth() { return page.evaluate(function () { window.__both = { frames: 0, both: 0, byView: {} }; (function f() { var st = document.getElementById('stick'), d = document.getElementById('btn-door'), v = APP.scene.view(), b = window.__both, sv = !st.hidden, dv = !d.hidden && d.dataset.spot === 'edge'; b.frames++; if (sv && dv) b.both++; var k = b.byView[v] = b.byView[v] || { n: 0, stick: 0, edge: 0 }; k.n++; if (sv) k.stick++; if (dv) k.edge++; window.__bothRaf = requestAnimationFrame(f); })(); }); }
  function stopBoth() { return page.evaluate(function () { cancelAnimationFrame(window.__bothRaf); return window.__both; }); }
  /* 스틱 가운데를 누르고 (dx, dy) 만큼 끌어 ms 동안 잡고 있다가 놓는다 → 잡는 중 · 놓은 뒤의 스틱 · 캐릭터 상태 */
  async function dragStick(dx, dy, ms) {
    var c = await page.evaluate(function () { var r = document.getElementById('stick').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    function snap() { return page.evaluate(function () { var st = document.getElementById('stick'), k = st.querySelector(st.classList.contains('no-img') ? '.stick-txt' : '.stick-ico'), s = APP.stick;   /* 손잡이 = 발자국 그림 (회색 네모 손잡이는 11-10 에 뺐다) */ return { on: st.classList.contains('on'), input: s.input, pointer: s.pointer, knob: getComputedStyle(k).transform, pl: APP.scene.player(), view: APP.scene.view(), doorEv: window.__ev.filter(function (e) { return e.n === 'door'; }).length }; }); }
    await page.mouse.move(c[0], c[1]); await page.mouse.down(); await page.mouse.move(c[0] + dx, c[1] + dy, { steps: 4 });
    await page.waitForTimeout(150);
    var mid = await snap();
    await page.waitForTimeout(ms);
    await page.mouse.up(); await page.waitForTimeout(200);
    var end = await snap();
    return { mid: mid, end: end };
  }
  function dist2(a, b) { return a && b ? Math.hypot((a[0] || 0) - (b[0] || 0), (a[2] || 0) - (b[2] || 0)) : NaN; }

  /* 1. 다락: 문 단추는 3D 문 위 (장면 안 · 44px 이상 · 그 자리가 장면이 투영한 문 상자) */
  var a0 = await spots(), sp0 = await page.evaluate(function () { return APP.scene.spotRect('atticPlay'); });
  /* 살림(11-10): 저장의 user 칸(조개 · 씨앗 · 들어온 날 선물)은 놀이방에서 한 일로 바뀐다 (달리기 한 판 → 조개 · 부팅 2.5 s 뒤 오늘 선물) → 문어 쪽(user 를 뺀 나머지)이 한 바이트도 안 바뀌는지를 본다.
     저장할 때마다 찍히는 시각 도장(settings.lastSeen)도 뺀다 — 조개를 적으며 save() 가 한 번 돌기 때문. 문어 · 방 · 산책 · 그 밖의 설정은 그대로여야 한다 */
  function saveParts() { return page.evaluate(function () { var o = JSON.parse(localStorage.getItem('ppolppol_v2')), u = o.user || null; delete o.user; if (o.settings) delete o.settings.lastSeen; return { rest: JSON.stringify(o), user: u, keys: Object.keys(o).join() }; }); }
  var SV0 = await saveParts(), S0 = SV0.rest;
  console.log('   attic:', JSON.stringify({ door: a0.door, sp: sp0 && sp0.art, view: a0.view, programs: a0.programs }));
  ok(a0.view === 'attic' && a0.door.label === '놀이방' && !a0.door.hidden && a0.door.spot === 'over' && a0.door.w >= 44 && a0.door.h >= 44 && a0.door.inside && !a0.door.ctl && !a0.door.popup, "다락: 놀이방 문 단추 = 3D 문 위 투명 단추 (aria-label '놀이방' · 44px 이상 · 장면 안 · 오른쪽 위 묶음과 안 겹침)");
  ok(!!sp0 && sp0.mode === 'over' && sp0.art.r - sp0.art.l >= 8 && sp0.art.b - sp0.art.t >= 30 && a0.pdoor.hidden && a0.mach.hidden, '3D 문이 화면에 보인다 (투영 상자 ' + (sp0 ? (sp0.art.r - sp0.art.l) + '×' + (sp0.art.b - sp0.art.t) : '-') + ' px) · 놀이방 단추는 숨음');
  await page.locator('#scene').screenshot({ path: path.join(SHOTS, 'w8-attic-door.png') });

  /* 1b. 발자국 손잡이 (11-08 움직이기): 다락이 보이면 장면 왼쪽 아래에 보인다 (hidden false · 44px 이상 · 장면 안 · 오른쪽 위 묶음 · 문 단추와 안 겹침 · 손가락을 받는다 · 글자는 '걷기' 뿐).
     끌면 APP.scene.player().at 이 바뀌고 놓으면 멈춘다 · 끄는 동안 장면 톡(문)은 안 난다 · 방향키 · WASD 도 같은 입력, 열린 창이 있으면 무시 */
  var st0 = await stickInfo();
  console.log('   stick(attic):', JSON.stringify(st0));
  var stickApi = st0.api;
  if (!stickApi) console.log('   (skip) 장면에 setPlayerInput 이 아직 없음 — 스틱 보임 · 끌기 · 키보드 검사는 건너뜀 (숨김 · 글자 검사만)');
  /* 11-10 떠다니는 스틱: 손가락은 보이지 않는 구역(#stick-zone, 장면 왼쪽 아래)이 받고 #stick 은 그림만 (pointer-events none) */
  ok(/^(걷기)?$/.test(st0.text) && st0.aria === 'true' && st0.pe === 'none' && !!st0.zone && st0.zone.aria === 'true' && st0.zone.text === '' && (!stickApi || (!st0.zone.hidden && st0.zone.pe === 'auto' && st0.zone.ta === 'none' && st0.zone.covers)),
    "스틱: 글자는 '걷기' 폴백뿐 (이모지 0) · aria-hidden · 그림은 pointer-events none · 누르는 구역(#stick-zone)이 그림을 덮고 pointer-events auto · touch-action none " + JSON.stringify({ text: st0.text, icon: st0.icon, noImg: st0.noImg, zone: st0.zone }));
  if (stickApi) {
    ok(!st0.hidden && st0.allowed && st0.w >= 44 && st0.h >= 44 && st0.inside && !st0.ctl && !st0.door && !st0.edge && st0.left >= 8 && st0.bottom >= 8 && (st0.icon || st0.noImg), '다락: 스틱이 왼쪽 아래에 보인다 (' + st0.w + '×' + st0.h + ' · 장면 안 · 오른쪽 위 묶음 · 문 단추와 안 겹침 · 집 단추는 숨음 · 발자국 그림)');
    await page.evaluate(function () { window.__ev.length = 0; if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
    var at0 = await page.evaluate(function () { return APP.scene.player().at; });
    var dg = await dragStick(-30, 0, 350);   /* 왼쪽(문 반대쪽)으로 — 오른쪽으로 끌면 캐릭터가 문 앞에 서서 아래 문 톡의 pick 을 가린다 */
    var moved = dist2(at0, dg.end.pl.at);
    console.log('   drag:', JSON.stringify({ at0: at0, mid: { input: dg.mid.input, walking: dg.mid.pl.walking, knob: dg.mid.knob }, end: { at: dg.end.pl.at, input: dg.end.input, walking: dg.end.pl.walking }, moved: Math.round(moved * 1000) / 1000 }));
    ok(dg.mid.on && dg.mid.pointer && dg.mid.input && dg.mid.input.x < -0.9 && Math.abs(dg.mid.input.y) < 0.05 && dg.mid.knob !== 'none' && dg.mid.view === 'attic', '스틱을 왼쪽으로 끌면: .on · 손가락 잡음 · 장면에 { x: -1, y: 0 } · 손잡이가 움직인다 ' + JSON.stringify(dg.mid.input));
    ok(moved > 0.05 && !dg.end.on && !dg.end.pointer && dg.end.input === null && dg.end.view === 'attic' && !dg.end.doorEv, '끄는 동안 내 캐릭터가 걸었다 (' + Math.round(moved * 100) / 100 + ' m) · 놓으면 null · .on 해제 · 장면 톡(문 · 밀기)은 안 났다');
    await page.locator('#scene').screenshot({ path: path.join(SHOTS, 'w8-stick.png') });
    await page.keyboard.down('ArrowUp'); await page.waitForTimeout(120);
    var k0 = await page.evaluate(function () { return { s: APP.stick, w: APP.scene.player().walking }; });
    await page.keyboard.down('d'); await page.waitForTimeout(80);
    var k1 = await page.evaluate(function () { return APP.stick; });
    await page.keyboard.up('ArrowUp'); await page.keyboard.up('d'); await page.waitForTimeout(80);
    var k2 = await page.evaluate(function () { return APP.stick; });
    ok(k0.s.input && Math.abs(k0.s.input.y - 1) < 1e-6 && k0.s.input.x === 0 && k1.input && Math.abs(k1.input.x - Math.SQRT1_2) < 1e-6 && Math.abs(k1.input.y - Math.SQRT1_2) < 1e-6 && k2.input === null && !k2.keys.length, '키보드: 위 화살표 = { 0, 1 } · + D(e.code) = 대각선 정규화 · 다 떼면 null ' + JSON.stringify({ up: k0.s.input, diag: k1.input, off: k2.input }));
    await page.click('#btn-settings'); await page.waitForSelector('#settings-sheet[open]');
    await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(80);
    var k3 = await page.evaluate(function () { return APP.stick; });
    await page.keyboard.up('ArrowLeft'); await page.keyboard.press('Escape'); await page.waitForSelector('#settings-sheet[open]', { state: 'hidden' }); await page.waitForTimeout(100);
    ok(k3.input === null && !k3.keys.length, '열린 창(설정 시트)이 있으면 방향키는 스틱 입력이 아니다');
    await page.evaluate(function () { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });   /* 시트를 닫으면 포커스가 설정 단추로 돌아온다 → 아래 문 톡의 '도착한 쪽 단추 포커스' 규칙(포커스가 딴 데 있으면 안 옮긴다)이 원래 흐름(body)대로 돌게 */
  }

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
  var stP = await stickInfo();
  console.log('   stick(play):', JSON.stringify({ hidden: stP.hidden, allowed: stP.allowed, ctl: stP.ctl, pdoor: stP.pdoor, mach: stP.mach }));
  if (stickApi) ok(!stP.hidden && stP.allowed && stP.inside && !stP.ctl && !stP.pdoor && !stP.mach && !stP.edge, '놀이방: 스틱이 보인다 (장면 안 · 오른쪽 위 묶음 · 문어 방 문 · 오락기 단추와 안 겹침)');
  if (stickApi) {   /* 11-09 리뷰 고침: 문으로 도착한 뒤(포커스 = 문 단추) 방향키가 걷는다 · 방향키를 누른 채 수정키를 눌렀다 떼도 키가 남지 않는다 · 로그에 포커스가 있으면 방향키는 로그 몫 */
    var kf0 = await page.evaluate(function () { return document.activeElement && document.activeElement.id; });
    await page.keyboard.down('ArrowDown'); await page.waitForTimeout(150);
    var kd = await page.evaluate(function () { return { s: APP.stick, w: APP.scene.player().walking, ae: document.activeElement && document.activeElement.id }; });
    await page.keyboard.up('ArrowDown'); await page.waitForTimeout(80);
    ok(kf0 === 'btn-play-door' && kd.s.input && kd.s.input.y === -1 && kd.w && kd.ae !== 'btn-play-door' && kd.ae !== 'btn-machine', '문으로 도착해 포커스가 문 단추에 있어도 방향키로 걷는다 · 걷기 키를 누르면 방 단추의 포커스를 놓는다 (11-10 — 포커스 링이 걷는 내내 켜져 있지 않게) ' + JSON.stringify({ focus: kf0, after: kd.ae, input: kd.s.input, walking: kd.w }));
    await page.keyboard.down('ArrowRight'); await page.waitForTimeout(60); await page.keyboard.down('Control'); await page.keyboard.up('ArrowRight'); await page.keyboard.up('Control'); await page.waitForTimeout(300);
    var km = await page.evaluate(function () { return { s: APP.stick, w: APP.scene.player().walking }; });
    ok(!km.s.keys.length && km.s.input === null && !km.w, '방향키를 누른 채 Ctrl 을 눌렀다 떼도 키가 남지 않는다 (keyup 은 수정키와 상관없이 지운다) ' + JSON.stringify(km));
    /* 한 화면 배치 (11-10): 로그는 '오늘의 산책' 쪽지 시트 안에 있다 — 닫힌 시트 안의 #log 는 포커스를 못 받으므로 시트를 열고 본다 (2D 폴백은 페이지에 그대로 있다) */
    var klOne = await page.evaluate(function () { var one = document.documentElement.getAttribute('data-layout') === 'one'; if (one) APP.openLog(); return one; });
    if (klOne) await page.waitForSelector('#log-sheet[open]');
    await page.evaluate(function () { document.getElementById('log').focus(); });
    var klAe = await page.evaluate(function () { return document.activeElement && document.activeElement.id; });
    await page.keyboard.down('ArrowDown'); await page.waitForTimeout(80);
    var kl = await page.evaluate(function () { return APP.stick; });
    await page.keyboard.up('ArrowDown');
    ok(klAe === 'log' && kl.input === null && !kl.keys.length, '로그(#log)에 포커스가 있으면 방향키는 스틱 입력이 아니다 (로그 굴리기' + (klOne ? ' · 오늘의 산책 쪽지 안' : '') + ') — 포커스 ' + klAe);
    if (klOne) { await page.evaluate(function () { document.getElementById('log-sheet').close(); }); await page.waitForFunction(function () { return !document.querySelector('dialog[open]'); }); }
    await page.evaluate(function () { var d = document.getElementById('btn-play-door'); if (d) d.focus({ preventScroll: true }); APP.scene.debugPlayerAt(0.15, 0.45); });   /* 원래 흐름으로 (포커스 = 놀이방 문 · 쉬는 자리) */
  }
  await page.locator('#scene').screenshot({ path: path.join(SHOTS, 'w8-play.png') });

  /* 3. 오락기 → 달리기 창 → 한 판 → 닫으면 오락기로 포커스 · 놀이방 그대로 · 저장(S) 그대로 */
  await clickSpot(page, '#btn-machine'); await page.waitForSelector('#runner-dlg[open]');
  await page.focus('#rn-cv'); await page.keyboard.press(' '); await page.waitForTimeout(600); await page.keyboard.press(' ');
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape'); await page.waitForSelector('#runner-dlg[open]', { state: 'hidden' });
  var p2 = await spots(), SV1 = await saveParts(), S1 = { s: SV1.rest, r: await page.evaluate(function () { return !!localStorage.getItem('ppolppol_runner'); }) };
  ok(p2.focus === 'btn-machine' && p2.view === 'play' && !p2.mach.hidden, '달리기 창을 닫으면 포커스는 오락기 · 놀이방 그대로');
  ok(S1.s === S0 && S1.r && /octopus/.test(SV0.keys) && /room/.test(SV0.keys) && /trips/.test(SV0.keys) && /settings/.test(SV0.keys), '놀이방에서 한 일(문 · 오락기 · 달리기 한 판)은 문어 저장(ppolppol_v2 의 문어 · 방 · 산책 · 설정 — user 칸과 저장 시각 도장을 뺀 전부)을 한 바이트도 바꾸지 않는다 (달리기는 제 열쇠만)');
  var sh0 = SV0.user ? SV0.user.shells | 0 : 0, sh1 = SV1.user ? SV1.user.shells | 0 : -1, ern = SV1.user && SV1.user.earned ? SV1.user.earned.length : 0;
  ok(SV1.user && sh1 >= sh0 && sh1 - sh0 <= 8 + 13 && ern <= 1 && (ern === 0 || sh1 - sh0 >= 2), '살림: 바뀐 건 user 칸뿐 — 달리기 한 판이 기록됐으면 조개 2–8 (한 판 한 번) · 오늘 선물은 많아야 한 번 ' + JSON.stringify({ shells: [sh0, sh1], earned: ern, giftDay: SV1.user && SV1.user.giftDay }));

  /* 4. 키보드 왕복: Shift+Tab → 놀이방 문 · Enter → 다락 (포커스 다락 문) · Enter → 놀이방 (포커스 놀이방 문) · 셰이더 프로그램 수 그대로 */
  /* 오락기에서 Shift+Tab: 가방 칩(#btn-bag, 11-10 살림 — 문과 오락기 사이에 있다)을 지나 놀이방 문으로 */
  var kfSeen = [], kf = '';
  for (var kfi = 0; kfi < 2 && kf !== 'btn-play-door'; kfi++) { await page.keyboard.press('Shift+Tab'); kf = await page.evaluate(function () { return document.activeElement && document.activeElement.id; }); kfSeen.push(kf); }
  console.log('   Shift+Tab:', kfSeen.join(' → '));
  await page.keyboard.press('Enter'); await inAttic();
  var k1 = await spots();
  await page.keyboard.press('Enter'); await inPlay();
  await page.keyboard.press('Enter'); await inAttic();
  var k2 = await spots();
  ok(kf === 'btn-play-door' && kfSeen.join() === 'btn-bag,btn-play-door' && k1.view === 'attic' && k1.focus === 'btn-door' && k2.focus === 'btn-door' && k1.oct, '키보드: Shift+Tab 으로 (가방 칩을 지나) 놀이방 문 · Enter 로 다락 (포커스는 다락 문) · Enter 로 다시 놀이방 · 다락에선 문어가 다시 보인다');
  ok(k2.programs === k1.programs && k1.programs === p1.programs, '셰이더 프로그램 수: 첫 방문 ' + p1.programs + ' → 왕복 뒤 ' + k1.programs + ' → 두 번째 왕복 뒤 ' + k2.programs);
  ok((await saveParts()).rest === S0, '문 왕복 세 번 뒤에도 문어 저장 그대로 (user 칸을 뺀 전부)');

  /* 5. 놀이방에서 큰 버튼 (뽈뽈 다녀와): 먼저 문으로 다락 → 그다음 출발 (출발 의식은 다락에서 보인다) */
  await page.keyboard.press('Enter'); await inPlay();
  await page.evaluate(function () { window.__ev.length = 0; });
  await watchBoth();   /* 여기부터 바깥이 보일 때까지: 스틱과 집 단추가 같은 프레임에 둘 다 보이는 일이 없는지 */
  await page.click('#btn-go');
  await page.waitForFunction(function () { return document.getElementById('btn-go').classList.contains('away'); }, null, { timeout: 20000 });
  var g1 = await page.evaluate(function () { return { ev: window.__ev.map(function (e) { return e.n + ':' + e.act + '@' + e.view; }), view: APP.scene.view(), room: APP.scene.room() }; });
  ok(g1.ev.slice(0, 2).join() === 'door:open@play,door:close@attic' && !g1.room && g1.view !== 'play', '놀이방에서 큰 버튼 → 먼저 문으로 다락 (문 소리 open · close) → 출발 ' + JSON.stringify(g1.ev));

  /* 6. 산책 중: 바깥이 보이는 동안 집 단추(왼쪽 아래) → 놀이방. 로그 행이 쌓이고, 화면은 끌려 나가지 않는다 → 문어가 돌아오면 구석 쪽지 */
  await page.waitForFunction(function () { var d = document.getElementById('btn-door'); return APP.scene.view() === 'exterior' && !d.hidden && d.dataset.spot === 'edge'; }, null, { timeout: 30000 });
  var e0 = await spots(), stE = await stickInfo(), both = await stopBoth();
  ok(e0.door.spot === 'edge' && e0.door.w >= 44 && e0.door.h >= 44 && e0.door.inside && !e0.door.ctl, '산책 중 바깥: 놀이방 가는 집 단추는 장면 왼쪽 아래 (44px · 오른쪽 위 묶음과 안 겹침)');
  console.log('   stick(exterior):', JSON.stringify({ hidden: stE.hidden, allowed: stE.allowed, edge: stE.edge, both: both.both, frames: both.frames, byView: both.byView }));
  ok(stE.hidden && !stE.allowed && stE.edge && both.frames > 10 && both.both === 0 && (!both.byView.exterior || !both.byView.exterior.stick) && (!stickApi || (both.byView.play && both.byView.play.stick > 0)), '바깥이 보일 땐 스틱은 숨고 집 단추만 — 놀이방 → 다락 → 바깥 ' + both.frames + ' 프레임 동안 둘 다 보인 프레임 0 · 바깥에서 스틱 0 프레임');
  await page.locator('#scene').screenshot({ path: path.join(SHOTS, 'w8-exterior-door.png') });
  await page.click('#btn-door'); await inPlay();
  /* 행 수는 진짜 행만 센다 (11-12): '…' 쓰는 중 자리 행(.lrow.typing)은 다음 행이 오면 그 자리를 대신한다 — 놀이방에 들어간 순간 그 자리 행이 떠 있으면 귀가 행이 와도 수가 그대로라 맞고 틀림이 기계 속도에 달렸다 */
  var w0 = await page.evaluate(function () {
    window.__left = []; window.__inPlay = true;
    (function f() { if (!window.__inPlay) return; var v = APP.scene.view(); if (v !== 'play') window.__left.push(v); requestAnimationFrame(f); })();
    return { rows: document.querySelectorAll('#log .lrow:not(.typing)').length, place: APP.scene.place(), running: APP.state.trips.some(function (t) { return t.status === 'running'; }) };
  });
  await page.waitForFunction(function () { return !document.getElementById('back-note').hidden && document.getElementById('back-note-txt').textContent; }, null, { timeout: 90000 });
  var w1 = await page.evaluate(function () {
    var n = document.getElementById('back-note'), b = document.getElementById('btn-back-see').getBoundingClientRect(), sc = document.getElementById('scene').getBoundingClientRect(), ctl = document.getElementById('scene-ctl').getBoundingClientRect(), q = n.getBoundingClientRect();
    return { rows: document.querySelectorAll('#log .lrow:not(.typing)').length, place: APP.scene.place(), view: APP.scene.view(), left: window.__left.slice(), txt: document.getElementById('back-note-txt').textContent, role: document.getElementById('back-note-txt').getAttribute('role'), btn: { t: document.getElementById('btn-back-see').textContent, w: Math.round(b.width), h: Math.round(b.height) },
      inside: q.left >= sc.left && q.right <= sc.right && q.bottom <= sc.bottom + 0.5, ctl: q.left < ctl.right && q.right > ctl.left && q.top < ctl.bottom && q.bottom > ctl.top, oct: getComputedStyle(document.getElementById('oct')).display, bub: !document.getElementById('oct-bubble').hidden && getComputedStyle(document.getElementById('oct')).display !== 'none' };
  });
  console.log('   in play during walk:', JSON.stringify({ w0: w0, w1: w1 }));
  ok(w0.running && w0.place === 'exterior' && w1.rows > w0.rows && w1.place === 'attic' && w1.view === 'play' && !w1.left.length, '산책은 놀이방에서도 그대로 (로그 행 ' + w0.rows + ' → ' + w1.rows + ' · 이야기 장소 바깥 → 다락) · 화면은 한 번도 놀이방을 떠나지 않음');
  ok(w1.txt === '뚜루가 돌아왔어.' && w1.role === 'status' && w1.btn.t === '보러 가기' && w1.btn.h >= 44 && w1.btn.w >= 44 && w1.inside && !w1.ctl && !w1.bub, "구석 쪽지: '뚜루가 돌아왔어.' (조사 · 기호 없음 · role=status) + '보러 가기' (44px) · 장면 안 · 오른쪽 위 묶음과 안 겹침 · 문어 말풍선은 놀이방에 안 뜬다");
  var stN = await stickInfo();
  if (stickApi) ok(!stN.hidden && !stN.note, '구석 쪽지가 떠 있어도 놀이방 스틱과 안 겹친다 (쪽지가 스틱 위로 올라간다) ' + JSON.stringify({ stick: { left: stN.left, bottom: stN.bottom }, overlap: stN.note }));
  await page.locator('#scene').screenshot({ path: path.join(SHOTS, 'w8-note.png') });
  var plans = await page.evaluate(function () { return window.__plans.slice(); });
  /* 큰 도서관 (11-10): 입력에 '오늘의 서가' shelf (문서 제목 글자열 몇 개) 가 하나 더 있다 — 위키 문서 제목뿐, 놀이방 · 살림(조개) 은 여전히 모른다 */
  var KEYS = 'by,dateKey,hint,id,name,online,seed,seq,shelf,state', SKEYS = ['affinity', 'lantern', 'lanternLeft', 'lastVisit', 'notes', 'owned', 'posters', 'recent', 'todayOut', 'visits'];
  var pOk = plans.length >= 1 && plans.every(function (j) { var o = JSON.parse(j); return Object.keys(o).sort().join() === KEYS && Array.isArray(o.shelf) && o.shelf.length >= 1 && o.shelf.length <= 8 && o.shelf.every(function (t) { return typeof t === 'string' && !!t; }) && !/shells|seeds|조개|user/.test(j) && Object.keys(o.state).every(function (k) { return SKEYS.indexOf(k) >= 0; }) && !/runner|play|놀이방|오락기|달리기/.test(j); });
  ok(pOk, '두뇌 입력은 놀이방 · 살림을 모른다 (알던 칸 + 오늘의 서가 제목 ≤ 8 · 달리기 · 놀이방 · 조개 낱말 0) — 두뇌 호출 ' + plans.length + '번');
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
  var st2 = await stickInfo(p);
  ok(st2.hidden && !st2.allowed && st2.mode === '2d', '2D 폴백: 발자국 손잡이는 늘 숨김 (내 캐릭터가 없다)');
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
    ((S.salon && S.salon.asks) || []).forEach(function (a) { if (a && a.by === 'model') add(a.line); });   /* 미용실: 모델이 준 대답 말 (행 2 · 말풍선 — 그대로) */
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
      else if (el.closest('#shelf-list')) { if (!(window.SHELF && SHELF.pool.indexOf(el.textContent) >= 0)) push(out, seen, 'data-raw', el, '서가에 없는 제목', el.textContent); }   /* 큰 도서관 '오늘의 서가' (11-10): 위키백과 제목 그대로 = js/shelf.js 후보 목록의 한 줄과 글자 하나까지 같아야 한다 */
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
    for (var i = 0; i < 40; i++) { await page.waitForTimeout(700); if (i === 6) await logSheet(true); if (i % 4 === 0) await scan(label + ' (나가 있는 중)'); if (!(await page.$('#btn-go.away'))) break; }
    await page.evaluate(function () { window.__glyph.logWatch(false); });
    await logSheet(false);
    await page.evaluate(function () { document.documentElement.setAttribute('data-font', 'pixel'); });
    if (w) await page.setViewportSize({ width: 360, height: 740 });
    await skipAway(page).catch(function () {}); await waitIdle(page); await page.waitForTimeout(400);
  }
  async function importAndWait(evs, label, w) {
    if (w) await page.setViewportSize({ width: w, height: 740 });
    must(await page.evaluate(function (e) { return APP.importEvents(e); }, evs), label + ' 재생 시작');
    for (var k = 0; k < 40; k++) { await page.waitForTimeout(700); if (k === 6) await logSheet(true); if (k % 4 === 0) await scan(label + ' (나가 있는 중)'); if (!(await page.$('#btn-go.away'))) break; }
    await logSheet(false);
    await skipAway(page).catch(function () {}); await waitIdle(page); await page.waitForTimeout(400);
    if (w) await page.setViewportSize({ width: 360, height: 740 });
  }
  function logSheet(on) { return logSheetOf(page, on); }   /* 나가 있는 동안 앞쪽은 쪽지를 닫은 채(새 줄 알림의 글자도 문서 관찰자가 본다), 뒤쪽(4 s 뒤)은 열고 본다 */
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
  /* 옷장 (설정 › 내 모습 › 모습 바꾸기): 여섯 갈래의 탭 이름 · 타일 이름 · 색 이름(aria-label · title) · 안내 줄 */
  await page.click('#set-look-open'); await page.waitForSelector('#look-sheet[open]');
  for (var lookTab of [['hair', '머리'], ['eyes', '눈'], ['face', '얼굴'], ['outfit', '옷'], ['shoes', '신발'], ['acc', '장식']]) { await page.click('#look-tab-' + lookTab[0]); await page.waitForTimeout(120); await scan('옷장 · ' + lookTab[1]); }
  await page.click('#look-close'); await page.waitForSelector('#look-sheet[open]', { state: 'hidden' });
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
  var yOne = await logSheet(true);   /* 한 화면 배치: 로그는 쪽지 안 — 열어 두고 잰다 (닫힌 쪽지 안의 로그는 크기가 없다) */
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
  ok(yk.ready && yk.row && Math.abs(yk.y1 - yk.y0) <= 4, '로그를 60px 올려 두면 다음 행이 와도 끌어내리지 않음 (' + yk.y0 + ' → ' + yk.y1 + ')' + (yOne ? ' · 오늘의 산책 쪽지 안' : ''));
  await logSheet(false);
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
  var cutOne = await logSheet(true);   /* 한 화면 배치: 쪽지를 연 채 폭 · 테마를 바꿔 가며 다시 그린다 */
  for (var cw of [320, 360, 412]) for (var cf of ['pixel', 'system']) {
    await page.setViewportSize({ width: cw, height: 740 });
    await page.evaluate(function (f) { document.documentElement.setAttribute('data-font', f); APP.renderLog(); }, cf);
    var q = await page.evaluate(function () { return window.__glyph.logSettle(3000).then(function (x) { if (x) { x.w = innerWidth; x.font = document.documentElement.getAttribute('data-font'); x.key = 'renderLog'; } return x; }); });
    if (q) cutRes.push(q);
    if (cw === 320 && cf === 'pixel') await page.locator(cutOne ? '#log-sheet' : '#log-sec').screenshot({ path: path.join(SHOTS, 'log-snap-320.png') });
  }
  await logSheet(false);
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
  /* 8b. 산책 중 놀이방: 바깥이 보이는 동안 장면 왼쪽 아래 집 단추 → 놀이방 → 문어가 돌아오면 구석 쪽지 → 보러 가기 (scan 이 상태마다 두 테마를 다 본다) */
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
/* ── 11-08 주인: "눌렀을 때 응? 대신 문어가 직전에 다녀온 뽈뽈에 대한 짧은 대사 하나" · "다녀오는 중 버튼을 한 번 더 누르면 애가 자동으로 집으로 쉬는 느낌" ──
   소리 훅 · 말풍선 기록 (페이지 안): AUDIO.on 의 state · bubble · ceremony · lantern 만 값과 함께, UIART.onBubble 의 글자 */
var TAP_SPY = "window.__aud = []; window.__bubs = []; (function w() { if (window.AUDIO && !AUDIO.__tk) { AUDIO.__tk = 1; var o = AUDIO.on; AUDIO.on = function (n, d) { var keep = n === 'state' || n === 'bubble' || n === 'ceremony' || n === 'lantern'; window.__aud.push({ n: n, d: keep && d ? JSON.parse(JSON.stringify(d)) : null, t: performance.now() }); return o.apply(this, arguments); }; } if (window.UIART && !UIART.__tk) { UIART.__tk = 1; var u = UIART.onBubble; UIART.onBubble = function (t, k) { if (t) window.__bubs.push(t); return u.apply(this, arguments); }; } if (!(window.AUDIO && AUDIO.__tk && window.UIART && UIART.__tk)) setTimeout(w, 5); })();";
function bubbleNow(page) { return page.evaluate(function () { var b = document.getElementById('oct-bubble'); return b && !b.hidden ? b.textContent : ''; }); }
async function nameOct(page, nm) {
  await page.waitForSelector('#name-dialog[open]', { timeout: 20000 });
  await page.fill('#name-in', nm); await page.click('#name-form button[type=submit]');
  await page.waitForSelector('#name-dialog[open]', { state: 'hidden' });
  await page.waitForTimeout(300);
}
async function scenarioTapLine(browser) {
  console.log('\n== T. 톡 한 줄 (말풍선만) · 데려와도 짧은 귀가 뒤 깨어 있는 틈 → 낮잠 (주인 11-08)');
  var s = await newPage(browser, 'ok', [{ content: "window.__ppolAwakeMs = 9000; window.__ppolTest = window.__ppolTest || { forceKind: 'out' };" }, { content: TAP_SPY }]);
  var page = s.page;
  await page.clock.install({ time: new Date(2026, 10, 8, 14, 0, 0) });   /* 낮 14시 (밤이면 졸림 → 틈이 짧다) · 시간은 그대로 흐른다 */
  await page.goto(INDEX + '?dev=0');
  await nameOct(page, '톡문어');
  /* 1. 산책 전: '응?' · 로그 행 없음 */
  var r0 = await page.evaluate(function () { var n = document.querySelectorAll('#log .lrow').length; APP.tapOct(); return { b: document.getElementById('oct-bubble').textContent, rows: document.querySelectorAll('#log .lrow').length - n, line: APP.tapLine(), awake: window.__ppolAwakeMs }; });
  ok(r0.awake === 9000, '시험 훅: 이 시나리오는 깨어 있는 틈 9 s (공통 0 을 덮음)');
  ok(r0.b === '응?' && r0.rows === 0 && r0.line === null, "산책 전 톡 → '응?' · 말풍선만 (로그 행 +" + r0.rows + ')');
  /* 2. 산책 → 큰 버튼으로 데려옴 → 깨어 있는 틈 */
  await page.click('#btn-go'); await skipAway(page); await waitIdle(page);
  await page.waitForTimeout(250);
  var a1 = await page.evaluate(function () { var t = APP.state.trips[APP.state.trips.length - 1]; return { phase: APP.restPhase(), oct: APP.oct.state, anchor: APP.oct.anchor, saved: APP.state.octopus.state, line: APP.tapLine(), reaction: t.reaction, poster: t.poster && t.poster.line, sleeps: window.__aud.filter(function (a) { return a.n === 'state' && a.d.state === 'sleep'; }).length }; });
  console.log('   돌아온 뒤:', JSON.stringify(a1));
  ok(a1.phase === 'awake' && /^(idle|walk)$/.test(a1.oct) && a1.saved === 'sleep' && a1.sleeps === 0, '데려온 뒤 곧장 자지 않는다: 깨어 있는 틈 (저장은 쉬는 중 · 잠 훅 아직 0)');
  ok(a1.line && a1.line.by === 'demo-rules' && a1.line.text && a1.line.text !== a1.poster, '데모 산책 톡 한 줄이 있다 (포스터 한 줄과 다름): ' + (a1.line && a1.line.text));
  /* 3. 톡 다섯 번: 그 줄 · 로그 행 · 저장 · 기록 그대로 · 소리는 한 번 · '데모' 꼬리표 보임 · 몸이 톡 */
  var r3 = await page.evaluate(function () {
    return new Promise(function (res) {
      var rows = document.querySelectorAll('#log .lrow').length, st = JSON.stringify(APP.state), ls = localStorage.getItem('ppolppol_v2');
      window.__aud = []; APP.tapOct(); APP.tapOct(); APP.tapOct();
      var b = document.getElementById('oct-bubble'), text = b.hidden ? '' : b.textContent, sr = document.getElementById('oct-say');
      setTimeout(function () { var srText = sr ? sr.textContent : null; APP.tapOct(); setTimeout(function () { APP.tapOct();
        res({ text: text, rows: document.querySelectorAll('#log .lrow').length - rows, sameState: JSON.stringify(APP.state) === st, sameLS: localStorage.getItem('ppolppol_v2') === ls,
          voice: window.__aud.filter(function (a) { return a.n === 'bubble'; }).length, tag: !document.getElementById('brain-tag').hidden, tapAttr: b.getAttribute('data-tap'),
          sr: srText, srLive: sr ? sr.getAttribute('aria-live') + '/' + sr.getAttribute('role') + '/' + sr.className : null, srLog: !!(sr && sr.closest('#log')) });
      }, 120); }, 160);
    });
  });
  console.log('   톡:', JSON.stringify(r3));
  ok(r3.text === a1.line.text && r3.tapAttr === '1', '깨어 있는 문어를 톡 → 그 차례 한 줄이 말풍선에 (' + r3.text + ')');
  ok(r3.rows === 0 && r3.sameState && r3.sameLS, '톡 다섯 번: 로그 행 · 상태 · 저장 그대로 (말풍선만 — 결과물 없음 · 두뇌 입력 그대로)');
  ok(r3.voice === 1, '같은 줄을 다시 눌러도 목소리는 한 번 (' + r3.voice + ')');
  ok(r3.tag, "데모 규칙이 지은 줄은 '데모' 꼬리표가 보이는 동안");
  ok(r3.sr === r3.text && r3.srLive === 'polite/status/sr-only' && !r3.srLog, '화면 낭독기: 같은 한 줄을 보이지 않는 칸(role=status · aria-live polite)에 — 로그 행 아님 (' + JSON.stringify([r3.sr, r3.srLive]) + ')');
  /* 3a. 톡마다 몸이 작게 톡: 담요에서 가만히 있을 때 잰다 (걸으며 통통하는 몸짓과 섞이지 않게). 장면 시계는 손으로 1/60 s 씩 — 기계가 바빠 프레임이 느려도 같은 값 */
  await page.waitForFunction(function () { var m = APP.scene.motion ? APP.scene.motion() : null; return APP.oct.state === 'idle' && APP.restPhase() === 'awake' && !!m && !(m.gait && m.gait.moving); }, null, { timeout: 20000 }).catch(function () {});
  var hp = await page.evaluate(function () {
    var sc = APP.scene; if (typeof sc.debugStep !== 'function') return null;
    function peak(n) { var m = -1; for (var i = 0; i < n; i++) { sc.debugStep(1 / 60); m = Math.max(m, sc.motion().hop); } return m; }
    function settle(n) { for (var i = 0; i < n; i++) sc.debugStep(1 / 60); return sc.motion().hop; }
    var base = peak(4); APP.tapOct(); var tap = peak(4); var after = settle(40); sc.resume();   /* 2px 위로 90 ms → 0.67 s 뒤엔 제자리 */
    return { base: base, tap: tap, after: after, oct: APP.oct.state, phase: APP.restPhase() };
  });
  ok(hp && hp.oct === 'idle' && hp.tap - hp.base >= 0.02 && hp.after - hp.base < 0.02, '톡마다 몸이 작게 톡 (담요에서 가만히 · 3D 2px 위로 90 ms → 제자리: hop ' + JSON.stringify(hp) + ')');
  /* 4. 틈이 끝나면 담요에서 잠 — 잠 훅 한 번 · 이 차례의 반응 */
  var slept = await page.waitForFunction(function () { return APP.oct.state === 'sleep'; }, null, { timeout: 25000 }).then(function () { return true; }, function () { return false; });
  await page.waitForTimeout(400);
  var r4 = await page.evaluate(function () { var sl = window.__aud.filter(function (a) { return a.n === 'state' && a.d.state === 'sleep'; }); APP.tapOct(); return { n: sl.length, rx: sl.length ? sl[0].d.reaction : undefined, phase: APP.restPhase(), b: document.getElementById('oct-bubble').textContent, anchor: APP.oct.anchor }; });
  ok(slept && r4.n === 1 && r4.rx === a1.reaction && r4.phase === 'nap', "틈이 끝나면 눕는다: 잠 훅 한 번 { state: 'sleep', reaction: " + JSON.stringify(r4.rx) + ' } (' + r4.n + ' · ' + r4.phase + ' · ' + r4.anchor + ')');
  ok(r4.b === '쿨쿨…', "자는 동안 톡 → '쿨쿨…'");
  /* 5. 틈 안에서 새로고침: 깨어 있음 · 인사 '다락방에 있어' · 같은 줄 */
  await page.evaluate(function () { var t = APP.state.trips[APP.state.trips.length - 1]; t.endedAt = Date.now() - 500; APP.state.octopus.state = 'sleep'; APP.save(); });
  await page.addInitScript({ content: 'window.__ppolAwakeMs = 60000;' });
  await page.waitForTimeout(1000);
  await page.reload(); await waitIdle(page); await page.waitForTimeout(400);
  var r5 = await page.evaluate(function () { var g = document.querySelector('#log .lday:last-child .lrow .ltext'); APP.tapOct(); return { phase: APP.restPhase(), oct: APP.oct.state, greet: g ? g.textContent : '', b: document.getElementById('oct-bubble').textContent, line: APP.tapLine() }; });
  ok(r5.phase === 'awake' && r5.oct === 'idle' && /다락방에 있어/.test(r5.greet) && r5.b === a1.line.text, "틈 안에 새로고침: 깨어 담요 위 · 인사 '…다락방에 있어' · 톡 한 줄 같음 (" + r5.greet + ')');
  /* 6. 다음 날: 오늘 끝낸 차례가 없으니 '응?' */
  await page.addInitScript({ content: "window.__ppolTest = { forceKind: 'out', today: '" + dayAfter(1) + "' };" });
  await page.reload(); await waitIdle(page); await page.waitForTimeout(300);
  var r6 = await page.evaluate(function () { APP.tapOct(); return { b: document.getElementById('oct-bubble').textContent, line: APP.tapLine(), oct: APP.oct.state }; });
  ok(r6.b === '응?' && r6.line === null && r6.oct !== 'sleep', "다음 날 톡 → '응?' (어제 한 줄은 '어제 메모' 몫)");
  /* 7. 모델 차례: 그들이 쓴 마무리 줄만 — 24글자 + '…' · data-raw="model" · 기록 그대로 · 그동안 '데모' 꼬리표 숨김 */
  var LONG = '모자 안쪽 띠가 땀을 막는 거래 🎩 그럼 모자는 머리를 지키는 걸까 날씨를 지키는 걸까 다음엔 그쪽으로';
  ok(await page.evaluate(function (L) { return APP.importEvents([{ type: 'depart', t: 0, hint: '' }, { type: 'peek', t: 1, target: { kind: 'room', id: 'hat' }, status: 'builtin', aside: '챙이 넓네' }, { type: 'return', t: 2, reason: 'enough' }, { type: 'remember', t: 3, stopIdx: 0, line: '모자 보러 갔어' }, { type: 'hang_poster', t: 4 }, { type: 'wrap_up', t: 5, reaction: '덤덤', line: L }]); }, LONG), '모델 이벤트 재생 시작');
  await skipAway(page); await waitIdle(page); await page.waitForTimeout(3300);   /* 마무리 말풍선이 내려간 뒤 */
  var r7 = await page.evaluate(function () {
    APP.tapOct();
    var b = document.getElementById('oct-bubble'), raw = b.querySelector('[data-raw="model"]'), t = APP.state.trips[APP.state.trips.length - 1], wu = t.events.filter(function (e) { return e.type === 'wrap_up'; })[0];
    return { text: b.textContent, raw: raw ? raw.textContent : null, tagHidden: document.getElementById('brain-tag').hidden, line: wu.line, by: t.by, ms: 0 };
  });
  var want7 = Array.from(LONG).slice(0, 24).join('') + '…';
  ok(r7.text === want7 && r7.raw === want7 && r7.line === LONG && r7.by === 'mcp', "모델 차례 톡: 그들이 쓴 마무리 줄 그대로 24글자 + '…' (data-raw=model · 기록은 원문 그대로): " + r7.text);
  ok(r7.tagHidden, "모델이 쓴 줄이 떠 있는 동안 '데모' 꼬리표를 숨긴다 (규칙이 고른 말처럼 보이지 않게)");
  await page.waitForFunction(function () { return document.getElementById('oct-bubble').hidden; }, null, { timeout: 8000 }).catch(function () {});
  await page.waitForTimeout(200);
  ok(!(await page.evaluate(function () { return document.getElementById('brain-tag').hidden; })), "말풍선이 내려가면 '데모' 꼬리표가 돌아온다");
  /* 8. 말을 안 쓴 모델 차례 · 빈 차례 → '응?' */
  ok(await page.evaluate(function () { return APP.importEvents([{ type: 'depart', t: 0, hint: '' }, { type: 'peek', t: 1, target: { kind: 'room', id: 'hat' }, status: 'builtin', aside: '모자?' }, { type: 'return', t: 2, reason: 'enough' }, { type: 'wrap_up', t: 3, reaction: '덤덤' }]); }), '말 없는 모델 이벤트 재생 시작');
  await skipAway(page); await waitIdle(page); await page.waitForTimeout(3300);
  var r8 = await page.evaluate(function () { APP.tapOct(); return { b: document.getElementById('oct-bubble').textContent, line: APP.tapLine() }; });
  ok(r8.b === '응?' && r8.line === null, "마무리 말을 안 쓴 모델 차례 → '응?' (기웃 한마디 · 기억 줄을 대신 말하지 않는다)");
  await page.evaluate(function () { window.__ppolTest.forceKind = 'empty'; });
  await page.click('#btn-go'); await skipAway(page).catch(function () {}); await waitIdle(page); await page.waitForTimeout(300);
  var r9 = await page.evaluate(function () { APP.tapOct(); var t = APP.state.trips[APP.state.trips.length - 1]; return { kind: t.kind, b: document.getElementById('oct-bubble').textContent, line: APP.tapLine() }; });
  ok(r9.kind === 'empty' && r9.b === '응?' && r9.line === null, "빈 차례 뒤 톡 → '응?' (그 차례는 아무것도 쓰지 않았다)");
  reportErrors(s.bag, 'T');
  await s.ctx.close();
  await scenarioTapFit(browser);
  await scenarioAwakeMore(browser);
}
/* T-3. 깨어 있는 틈 더 (검증 11-08): 창 · 숨은 탭 · 장면을 아래로 내려 둔 동안 멈춤 → 돌아오면 적어도 틈만큼 · 그동안 초대 → 다음 차례 · 졸림은 25 s 까지 ·
   새로고침은 이 탭의 남은 틈을 이어 받는다 (sessionStorage, 게임 기록엔 없음) · 다른 탭이 차례를 끝내면 앞 낮잠에 자던 이 탭 문어도 깨어 같은 틈 */
async function scenarioAwakeMore(browser) {
  console.log('\n== T-3. 깨어 있는 틈: 멈춤 · 초대 · 졸림 25 s · 새로고침 · 두 탭 (검증 11-08)');
  var s = await newPage(browser, 'ok', [{ content: "window.__ppolAwakeMs = 6000; window.__ppolTest = window.__ppolTest || { forceKind: 'out' };" }, { content: TAP_SPY }]);
  var page = s.page;
  await page.clock.install({ time: new Date(2026, 10, 8, 14, 0, 0) });   /* 낮 14시 · 시간은 그대로 흐른다 */
  await page.goto(INDEX + '?dev=0');
  await nameOct(page, '틈문어');
  function sleeps(pg) { return (pg || page).evaluate(function () { return window.__aud.filter(function (a) { return a.n === 'state' && a.d.state === 'sleep'; }).length; }); }
  function asleep(pg, ms) { return (pg || page).waitForFunction(function () { return APP.oct.state === 'sleep'; }, null, { timeout: ms || 60000 }).then(function () { return true; }, function () { return false; }); }
  async function bringBack(pg) { pg = pg || page; await pg.click('#btn-go'); await skipAway(pg); await waitIdle(pg, 90000); }
  /* 1. 앨범이 열린 동안 멈춤 */
  await bringBack();
  var p0 = await page.evaluate(function () { return APP.restPhase(); });
  await page.click('#btn-album'); await page.waitForSelector('#album-sheet[open]');
  await page.waitForTimeout(8000);
  var p1 = await page.evaluate(function () { return { phase: APP.restPhase(), oct: APP.oct.state, rest: APP.rest }; }), n1 = await sleeps();
  await page.click('#al-close'); await page.waitForSelector('#album-sheet[open]', { state: 'hidden' });
  var t1 = Date.now(), z1 = await asleep(), dt1 = Date.now() - t1, n2 = await sleeps();
  ok(p0 === 'awake' && p1.phase === 'awake' && p1.oct !== 'sleep' && n1 === 0, '앨범이 열린 8 s (틈 6 s 보다 김) 동안 틈이 줄지 않는다 ' + JSON.stringify(p1));
  ok(z1 && dt1 >= 5000 && n2 === 1, '앨범을 닫으면 적어도 틈만큼 (6 s) 더 깨어 있다가 잠 훅 한 번 (' + dt1 + ' ms · ' + n2 + ')');
  /* 2. 탭이 숨은 동안 멈춤 */
  await bringBack();
  await page.evaluate(function () { Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return true; } }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: function () { return 'hidden'; } }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(8000);
  var h1 = await page.evaluate(function () { return { phase: APP.restPhase(), oct: APP.oct.state }; }), hn1 = await sleeps();
  var t2 = Date.now();
  await page.evaluate(function () { delete document.hidden; delete document.visibilityState; document.dispatchEvent(new Event('visibilitychange')); });
  var z2 = await asleep(), dt2 = Date.now() - t2, hn2 = await sleeps();
  ok(h1.phase === 'awake' && h1.oct !== 'sleep' && hn1 === 1, '탭이 숨은 8 s 동안 틈이 줄지 않는다 ' + JSON.stringify(h1));
  ok(z2 && dt2 >= 5000 && hn2 === 2, '다시 보이면 적어도 틈만큼 깨어 있다가 잠 훅 한 번 더 (' + dt2 + ' ms · ' + hn2 + ')');
  /* 3. 로그를 읽으려고 장면을 아래로 내려 둔 동안 멈춤 */
  await bringBack();
  await page.evaluate(function () { document.body.style.paddingBottom = '3000px'; var r = document.getElementById('scene').getBoundingClientRect(); window.scrollTo(0, window.scrollY + r.bottom + 10); });
  await page.waitForTimeout(8000);
  var c1 = await page.evaluate(function () { return { phase: APP.restPhase(), oct: APP.oct.state, sceneBottom: Math.round(document.getElementById('scene').getBoundingClientRect().bottom) }; }), cn1 = await sleeps();
  await page.evaluate(function () { window.scrollTo(0, 0); document.body.style.paddingBottom = ''; });
  var z3 = await asleep(), cn2 = await sleeps();
  ok(c1.phase === 'awake' && c1.oct !== 'sleep' && c1.sceneBottom <= 0 && cn1 === 2 && z3 && cn2 === 3, '장면을 아래로 내려 둔 8 s 동안 틈이 줄지 않고, 다시 올려 보면 이어 센 뒤 잠 ' + JSON.stringify(c1));
  /* 4. 틈 안에서 초대 → 다음 차례가 바로 · 틈은 걷힘 · 그 차례 뒤 새 틈 · 끊긴 틈은 잠 훅을 내지 않는다 */
  await bringBack();
  var w0 = await page.evaluate(function () { return { phase: APP.restPhase(), n: APP.state.trips.length }; });
  await page.waitForTimeout(1000);
  await page.click('#btn-go'); await page.waitForSelector('#btn-go.away', { timeout: 10000 });
  var w1 = await page.evaluate(function () { return { n: APP.state.trips.length, saved: APP.state.octopus.state, rest: APP.rest }; });
  await skipAway(page); await waitIdle(page, 90000);
  var w2 = await page.evaluate(function () { return APP.restPhase(); }), wn = await sleeps();
  ok(w0.phase === 'awake' && w1.n === w0.n + 1 && w1.rest === null && w1.saved === 'idle', '틈 안에서 초대: 다음 차례가 바로 · 틈은 걷힘 · 저장은 깬 상태 ' + JSON.stringify(w1));
  ok(w2 === 'awake' && wn === 3, '그 차례 뒤엔 새 틈 · 끊긴 틈은 잠 훅을 내지 않는다 (' + w2 + ' · 잠 훅 ' + wn + ')');
  /* 5. 졸림으로 마무리한 차례도 잠깐 깨어 있다 — 틈은 25 s 까지 (훅이 60 s 여도) */
  await page.evaluate(function () { window.__ppolAwakeMs = 60000; });
  await page.waitForTimeout(1000);
  ok(await page.evaluate(function () { return APP.importEvents(JSON.stringify([{ type: 'stay_home', t: 0, activity: 'nap', line: '담요 속에서 낮잠 잤어' }, { type: 'wrap_up', t: 1500, reaction: '졸림', line: '눈이 감겨' }])); }), '졸림 집 차례 재생 시작');
  await skipAway(page); await waitIdle(page, 90000);
  var zz = await page.evaluate(function () { return { phase: APP.restPhase(), rest: APP.rest, oct: APP.oct.state }; });
  ok(zz.phase === 'awake' && zz.rest && zz.rest.left > 0 && zz.rest.left <= 25000 && zz.oct !== 'sleep', '졸림으로 마무리한 차례 뒤에도 깨어 있는 틈 — 25 s 까지 (훅 60 s): ' + JSON.stringify(zz));
  /* 6. 새로고침: 이 탭의 남은 틈을 이어 받는다 (앨범으로 멈췄던 만큼) — sessionStorage · 읽으면 지움 · 게임 기록엔 없음 */
  await page.waitForTimeout(1000);
  await bringBack();
  await page.click('#btn-album'); await page.waitForSelector('#album-sheet[open]');
  await page.waitForTimeout(12000);
  await page.click('#al-close'); await page.waitForSelector('#album-sheet[open]', { state: 'hidden' });
  var b6 = await page.evaluate(function () { var t = APP.state.trips[APP.state.trips.length - 1]; return { left: APP.rest ? APP.rest.left : -1, clock: 60000 - (Date.now() - t.endedAt) }; });
  await page.addInitScript({ content: 'window.__ppolAwakeMs = 60000;' });
  await page.reload(); await waitIdle(page); await page.waitForTimeout(300);
  var r6 = await page.evaluate(function () { var g = JSON.parse(localStorage.getItem('ppolppol_v2') || '{}'), t = g.trips[g.trips.length - 1]; return { phase: APP.restPhase(), left: APP.rest ? APP.rest.left : -1, clock: 60000 - (Date.now() - t.endedAt), kept: sessionStorage.getItem('ppolppol_rest'), inSave: /"left"|"rest"/.test(JSON.stringify(g.octopus)) }; });
  ok(r6.phase === 'awake' && r6.left > r6.clock + 5000 && Math.abs(r6.left - b6.left) < 5000 && r6.kept === null && !r6.inSave, '틈 안에 새로고침: 앨범으로 멈췄던 만큼 남은 틈을 이어 받는다 (sessionStorage · 읽으면 지움 · 게임 기록엔 없음) ' + JSON.stringify({ before: b6, after: r6 }));
  /* 7. 두 탭: 이 탭(B) 문어는 앞 낮잠에 자는 중 → 다른 탭(A)이 차례를 끝내면 B 문어도 담요에서 깨어 그 틈 · B 에서 톡하면 A 차례의 한 줄 */
  await page.evaluate(function () { window.__ppolAwakeMs = 1500; });
  await page.waitForTimeout(1000);
  await bringBack();
  var bz = await asleep(page, 60000);
  await page.evaluate(function () { window.__ppolAwakeMs = 30000; });
  var nowB = await page.evaluate(function () { return Date.now(); });
  var A = await s.ctx.newPage(); watchErrors(A, s.bag);
  await A.clock.install({ time: new Date(nowB) });   /* 두 탭이 같은 시계 (끝난 시각을 서로 잰다) */
  await A.addInitScript({ content: "window.__ppolTest = { forceKind: 'out' };" });
  await routeWiki(A, 'ok');
  await A.goto(INDEX + '?dev=0'); await A.waitForSelector('#btn-go'); await A.waitForTimeout(500);
  await bringBack(A);
  var tw = await page.waitForFunction(function () { return APP.restPhase() === 'awake' && APP.oct.state !== 'sleep'; }, null, { timeout: 15000 }).then(function () { return true; }, function () { return false; });
  var r7 = await page.evaluate(function () { var L = APP.tapLine(); APP.tapOct(); var b = document.getElementById('oct-bubble'); return { phase: APP.restPhase(), oct: APP.oct.state, anchor: APP.oct.anchor, rest: APP.rest, line: L && L.text, b: b.hidden ? '' : b.textContent, last: APP.state.trips[APP.state.trips.length - 1].id }; });
  ok(bz && tw && r7.line && r7.b === r7.line && r7.rest && r7.rest.id === r7.last, '두 탭: 자던 이 탭 문어도 다른 탭이 끝낸 차례 뒤 담요에서 깨어 있다 · 톡 → 그 차례 한 줄 ' + JSON.stringify(r7));
  await A.close();
  reportErrors(s.bag, 'T-3');
  await s.ctx.close();
}
/* T-2. 말풍선 맞추기 (3D): 폰 세 폭 × 두 테마 × 앵커 여섯 × 줄 셋 — 풍선이 장면 칸 안 4px 안쪽에 · 많이 내려오면 꼬리 없음 */
async function scenarioTapFit(browser) {
  console.log('\n== T-2. 장면 말풍선 맞추기 (3D · 320 / 360 / 412 · 픽셀 · 시스템 · 라이트 / 다크)');
  var LINES = ['테셀레이션 보다가 뫼비우스 띠로 넘어갔어', Array.from('ㅋㅋ 이건 좀 웃겼어 그런데 다음엔 바다 쪽으로 가 볼래').slice(0, 24).join('') + '…', '처음 가 본 데가 있었어. 다리가 아직 들썩거려 그리고 또 갈래'];
  var ANCH = ['window', 'center', 'crate', 'blanket', 'board', 'door'], VPS = [[320, 568], [360, 740], [412, 915]], bad = [], n = 0, tailBad = 0, slid = 0;
  for (var vi = 0; vi < VPS.length; vi++) {
    var vp = VPS[vi];
    for (var scheme of (vi === 0 ? ['light', 'dark'] : ['light'])) {
      var ctx = await browser.newContext({ viewport: { width: vp[0], height: vp[1] }, deviceScaleFactor: 1, locale: 'ko-KR', colorScheme: scheme });
      await ctx.addInitScript({ content: 'window.__ppolAwakeMs = 0;' });
      var page = await ctx.newPage(), bag = []; bag.ignored = []; watchErrors(page, bag);
      await routeWiki(page, 'ok');
      await page.goto(INDEX + '?dev=0'); await nameOct(page, '풍선');
      await page.evaluate(function () { APP.state.room.lantern = 8; APP.renderScene(); APP.walkTo = APP.walkTo; });
      for (var theme of ['pixel', 'system']) {
        await page.evaluate(function (f) { document.documentElement.setAttribute('data-font', f); }, theme);
        for (var a of ANCH) for (var li = 0; li < LINES.length; li++) {
          var r = await page.evaluate(function (o) {
            return new Promise(function (res) {
              APP.scene.jumpTo(o.a); APP.say(o.t, 'say', 8000);
              setTimeout(function () { requestAnimationFrame(function () { requestAnimationFrame(function () {
                var b = document.getElementById('oct-bubble'), s = document.getElementById('scene').getBoundingClientRect(), r = b.getBoundingClientRect(), dy = parseFloat(b.style.getPropertyValue('--bub-dy')) || 0;
                res({ l: r.left - s.left, r: s.right - r.right, t: r.top - s.top, b: s.bottom - r.bottom, w: Math.round(r.width), h: Math.round(r.height), dy: dy, tail: b.getAttribute('data-tail'), hidden: b.hidden });
              }); }); }, 520);   /* 순간이동 뒤 5 Hz 다시 맞추기가 두 번 돈 다음 (바쁜 기계에선 첫 프레임이 옛 자리를 잴 수 있다) */
            });
          }, { a: a, t: LINES[li] });
          n++;
          if (r.hidden || r.l < 3.5 || r.r < 3.5 || r.t < 3.5 || r.b < 0) bad.push(vp[0] + 'x' + vp[1] + ' ' + scheme + ' ' + theme + ' ' + a + ' L' + li + ' ' + JSON.stringify(r));
          if (r.dy) slid++;
          if (theme === 'pixel' && ((r.dy > 12) !== (r.tail === 'off'))) tailBad++;
          var shot = (vp[0] === 320 && theme === 'pixel' && a === 'board' && li === 0 && scheme === 'light') ? 'fit-board-320x568-pixel.png'
            : (vp[0] === 320 && theme === 'system' && a === 'door' && li === 1 && scheme === 'light') ? 'fit-door-320-system.png'
            : (vp[0] === 412 && theme === 'pixel' && a === 'blanket' && li === 2) ? 'fit-blanket-412-pixel.png'
            : (vp[0] === 320 && theme === 'pixel' && a === 'board' && li === 2 && scheme === 'dark') ? 'fit-board-320x568-pixel-dark.png' : null;
          if (shot) await page.screenshot({ path: path.join(SHOTS, shot) });
        }
      }
      ok(!bag.length, '[T-2 ' + vp.join('x') + ' ' + scheme + '] 페이지 에러 0' + (bag.length ? ': ' + bag.join(' | ') : ''));
      await ctx.close();
    }
  }
  console.log('   배치 ' + n + '곳 · 아래로 민 것 ' + slid + (bad.length ? ' · 밖: ' + bad.slice(0, 4).join(' | ') : ''));
  ok(n >= 140 && bad.length === 0, '말풍선이 장면 칸 안 (가장자리 4px 안쪽 — 위 · 옆 · 아래) · 폰 세 폭 · 두 테마 · 앵커 여섯 · 22자 · 24+… · 40자 (' + n + '곳, 밖 ' + bad.length + ')');
  ok(tailBad === 0, '픽셀 꼬리는 12px 넘게 내려왔을 때만 뺀다 (' + tailBad + ')');
}
/* K. 데려오기: 기록은 안 데려온 것과 바이트 하나까지 같다 · 짧은 귀가(문 · 토스트 · 등불)가 보인다 · 두 번 눌러도 그대로 · 모션 줄이기 */
async function scenarioBringBack(browser) {
  console.log('\n== K. 다녀오는 중… 을 눌러 데려오기: 같은 기록 · 짧은 귀가 · 그 뒤 깨어 있는 틈 (주인 11-08)');
  var DAY = '2026-11-05';
  async function run(mode) {   /* mode: 'watch' 끝까지 · 'bring' 누를 수 있게 되자마자 데려오기 · 'reduce' 모션 줄이기 + 데려오기 */
    var ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1, locale: 'ko-KR', colorScheme: 'light', reducedMotion: mode === 'reduce' ? 'reduce' : 'no-preference' });
    await ctx.addInitScript({ content: "window.__ppolAwakeMs = 3000; window.__ppolTest = { forceKind: 'out', today: '" + DAY + "' };" });
    await ctx.addInitScript({ content: TAP_SPY });
    var page = await ctx.newPage(), bag = []; bag.ignored = []; watchErrors(page, bag);
    await page.clock.install({ time: new Date(2026, 10, 5, 14, 0, 0) });   /* 같은 시각에 계획 (시각 → 반응) */
    await routeWiki(page, 'ok');
    await page.goto(INDEX + '?dev=0' + (mode === 'watch' ? '&slow=0.2' : '')); await nameOct(page, '데려와');
    await page.evaluate(function () {
      window.__tl = []; window.__fly = 0; var t0 = performance.now();
      new MutationObserver(function (ms) { ms.forEach(function (m) { m.addedNodes.forEach(function (x) { if (x.classList && x.classList.contains('album-fly')) window.__fly++; }); }); }).observe(document.getElementById('scene'), { childList: true, subtree: true });
      document.getElementById('btn-go').addEventListener('click', function () { window.__tl.push({ k: 'click', t: performance.now() - t0, away: document.getElementById('btn-go').classList.contains('away') }); }, true);
      new MutationObserver(function () { window.__tl.push({ k: 'flip', t: performance.now() - t0, away: document.getElementById('btn-go').classList.contains('away') }); }).observe(document.getElementById('btn-go'), { attributes: true, attributeFilter: ['class'] });
      window.__retFrames = 0; (function fr() { if (APP.ceremony === 'return') window.__retFrames++; requestAnimationFrame(fr); })();
      (function tick() { var tst = document.getElementById('toast'), pip = document.querySelector('#pips .pip.on'); window.__tl.push({ k: 'tick', t: performance.now() - t0, cer: APP.ceremony, toast: tst && tst.classList.contains('show') ? tst.textContent : '', pip: !!pip, away: document.getElementById('btn-go').classList.contains('away'), oct: APP.oct.state }); if (window.__tl.length < 3000) setTimeout(tick, 25); })();
    });
    await page.click('#btn-go');
    var dbl = null;
    if (mode !== 'watch') {
      await page.waitForSelector('#btn-go.can-skip', { timeout: 10000 });
      await page.waitForFunction(function () { return APP.scene.ceremony() === '' && APP.oct.state === 'away'; }, null, { timeout: 15000, polling: 50 }).catch(function () {});   /* 나간 뒤 (바깥) */
      if (mode === 'reduce') {
        /* 모션 줄이기: 귀가가 한 프레임이라 두 번 톡의 둘째는 버튼이 '뽈뽈 다녀와' 로 돌아온 뒤에 온다 → 새 산책이 되면 안 된다 (둘째 톡 = 돌아온 바로 그때, 페이지 안에서) */
        dbl = await page.evaluate(function () { return new Promise(function (res) {
          var go = document.getElementById('btn-go'), n0 = APP.state.trips.length, t0 = performance.now(), second = -1;
          var mo = new MutationObserver(function () { if (second < 0 && !go.classList.contains('away')) { second = performance.now() - t0; go.click(); } });
          mo.observe(go, { attributes: true, attributeFilter: ['class'] });
          go.click();
          setTimeout(function () { mo.disconnect(); res({ n0: n0, n: APP.state.trips.length, second: Math.round(second), away: go.classList.contains('away') }); }, 1500);
        }); });
      } else {
        await page.click('#btn-go');
        await page.waitForFunction(function () { return APP.ceremony === 'return'; }, null, { timeout: 4000, polling: 20 }).catch(function () {});
        await page.evaluate(function () { document.getElementById('btn-go').click(); });   /* 귀가 중 한 번 더 */
      }
    }
    await waitIdle(page, 90000); await page.waitForTimeout(300);
    var out = await page.evaluate(function () {
      var S = JSON.parse(JSON.stringify(APP.state)), t = S.trips[S.trips.length - 1];
      delete t.startedAt; delete t.endedAt;
      S.room.souvenirs.forEach(function (x) { delete x.at; }); S.curiosityNotes.forEach(function (x) { delete x.at; });
      var o = S.octopus;
      return { trip: t, room: S.room, oct: { trips: o.trips, invites: o.invites, days: o.days, affinity: o.affinity, visits: o.visits, state: o.state }, notes: S.notes, cn: S.curiosityNotes, ntrips: S.trips.length,
        tl: window.__tl, fly: window.__fly, retFrames: window.__retFrames, phase: APP.restPhase(), octNow: APP.oct.state, rows: [].map.call(document.querySelectorAll('#log .lrow .ltool'), function (x) { return x.textContent; }),
        roomRow: [].filter.call(document.querySelectorAll('#log .lrow'), function (r) { return r.querySelector('.ltool').textContent === '방'; }).map(function (r) { return { text: r.querySelector('.ltext').textContent, expr: r.dataset.expr || '' }; }),
        sleeps: window.__aud.filter(function (a) { return a.n === 'state' && a.d.state === 'sleep'; }).length };
    });
    out.page = page; out.ctx = ctx; out.bag = bag; out.dbl = dbl;
    return out;
  }
  var A = await run('watch'), Bq = await run('bring');
  function same(x, y) { return JSON.stringify(x) === JSON.stringify(y); }
  ok(A.trip.kind === 'out' && same(A.trip, Bq.trip), '데려와도 산책 기록은 같다 (시작 · 끝 시각만 빼고 바이트 그대로)' + (same(A.trip, Bq.trip) ? '' : ' — ' + JSON.stringify(A.trip).slice(0, 120) + ' vs ' + JSON.stringify(Bq.trip).slice(0, 120)));
  ok(same(A.room, Bq.room) && same(A.oct, Bq.oct) && same(A.notes, Bq.notes) && same(A.cn, Bq.cn) && A.ntrips === Bq.ntrips && A.ntrips === 1, '데려와도 방 · 등불 · 기념품 · 방문 · 취향 · 메모 · 호기심 메모가 같다');
  /* 데려온 쪽의 시간표 (누른 순간부터) */
  var tl = Bq.tl, clicks = tl.filter(function (x) { return x.k === 'click' && x.away; }), c0 = clicks.length ? clicks[0].t : 0;
  function first(f) { for (var i = 0; i < tl.length; i++) if (tl[i].k === 'tick' && tl[i].t >= c0 && f(tl[i])) return Math.round(tl[i].t - c0); return -1; }
  var tRet = first(function (x) { return x.cer === 'return'; }), tToast = first(function (x) { return /^새 포스터 · /.test(x.toast); }), tPip = first(function (x) { return x.pip; }), tDone = (function () { for (var i = 0; i < tl.length; i++) if (tl[i].k === 'flip' && tl[i].t >= c0 && !tl[i].away) return Math.round(tl[i].t - c0); return -1; })();
  console.log('   데려오기 시간표 (ms, 누른 뒤): 귀가 ' + tRet + ' · 토스트 ' + tToast + ' · 등불 ' + tPip + ' · 버튼 ' + tDone + ' · 누름 ' + clicks.length);
  ok(clicks.length >= 2, '나가 있는 동안 두 번 눌렀다 (데려오기 + 귀가 중 한 번 더)');
  /* 폰(60 fps)에선 귀가 ≈ 0.7 s · 토스트 ≈ 1 s · 버튼 ≈ 2 s. 헤드리스 소프트웨어 GL · 다른 일로 바쁜 기계에선 프레임과 타이머가 늦어(장면 dt 상한 0.1 s) 벽시계로는 몇 배까지 늘어난다 →
     짧은 귀가인지는 프레임 수로 (긴 귀가 = 길 · 계단 · 현관 ≈ 8 s 장면 시간 = 80 프레임 넘게, 짧은 귀가 ≈ 0.7 s = 7~45 프레임), 벽시계는 순서와 넉넉한 상한만 */
  ok(tRet >= 0 && tRet <= 3000, '누르면 곧 다락 문으로 귀가가 시작된다 (' + tRet + ' ms)');
  /* 아래 한도: 짧은 귀가는 장면 시간 ≈ 0.55 s 이고 장면 dt 상한이 0.1 s 라 기계가 바빠도 5 프레임 넘게 걸린다 — 귀가 중 한 번 더 누른 게 의식을 감아 버리면 1~2 프레임 */
  ok(Bq.retFrames >= 5 && Bq.retFrames <= 45, '귀가 의식은 짧은 판 (다락 문 0.3 s 전환 + 문간에서 2배 걸음 — 길 · 계단 없음) · 귀가 중 한 번 더 눌러도 감기지 않는다: ' + Bq.retFrames + ' 프레임');
  ok(tToast > tRet && tToast <= 12000 && tPip >= tToast, "짧은 귀가에 '새 포스터 · …' 토스트 → 등불 칸 (토스트 " + tToast + ' · 등불 ' + tPip + ' ms)');
  ok(tDone >= tPip && tDone <= 16000, '버튼은 짧은 귀가 뒤 돌아온다 (' + tDone + ' ms · 귀가 중 한 번 더 눌러도 새 산책 없음: 차례 ' + Bq.ntrips + ')');
  ok(Bq.fly >= 1 && Bq.phase === 'awake' && Bq.sleeps === 0, '포스터가 앨범으로 날아가고 · 문어는 깨어 있다 (잠 훅 아직 0 · ' + Bq.phase + ')');
  ok(Bq.roomRow.length === 1 && Bq.roomRow[0].text === '창턱에 이끼 화분이 놓였어' && !Bq.roomRow[0].expr, "데려와도 '방' 줄 — 집 목소리 사실 문장, 문어 초상 없음 (" + JSON.stringify(Bq.roomRow) + ')');
  var sl = await Bq.page.waitForFunction(function () { return window.__aud.filter(function (a) { return a.n === 'state' && a.d.state === 'sleep'; }).length >= 1; }, null, { timeout: 15000 }).then(function () { return true; }, function () { return false; });
  await Bq.page.waitForTimeout(800);
  var nSleep = await Bq.page.evaluate(function () { return window.__aud.filter(function (a) { return a.n === 'state' && a.d.state === 'sleep'; }).length; });
  ok(sl && nSleep === 1, '틈이 끝나면 잠 훅 한 번 (' + nSleep + ')');
  [A, Bq].forEach(function (x, i) { ok(!x.bag.length, '[K ' + (i ? '데려옴' : '끝까지') + '] 페이지 에러 0' + (x.bag.length ? ': ' + x.bag.join(' | ') : '')); });
  await A.ctx.close(); await Bq.ctx.close();
  /* 모션 줄이기: 날아가지 않아도 토스트 · 등불 칸 · 방 줄은 보인다 */
  var R = await run('reduce');
  var toastR = R.tl.some(function (x) { return x.k === 'tick' && /^새 포스터 · /.test(x.toast); }), pipR = R.tl.some(function (x) { return x.k === 'tick' && x.pip; });
  ok(R.fly === 0 && toastR && pipR && R.roomRow.length === 1, "모션 줄이기 + 데려오기: 앨범으로 날지 않지만 토스트 · 등불 칸 · '방' 줄은 보인다 (fly " + R.fly + ')');
  ok(R.dbl && R.dbl.second >= 0 && R.dbl.second < 900 && R.dbl.n === R.dbl.n0 && !R.dbl.away && R.ntrips === 1, '모션 줄이기 + 두 번 톡: 둘째 톡(버튼이 돌아온 바로 그때)은 새 산책이 되지 않는다 ' + JSON.stringify(R.dbl));
  ok(!R.bag.length, '[K 모션 줄이기] 페이지 에러 0' + (R.bag.length ? ': ' + R.bag.join(' | ') : ''));
  await R.ctx.close();
  /* 모델(MCP) 차례를 데려와도 기록은 같다 */
  var EV = [{ type: 'depart', t: 0, hint: '' }, { type: 'peek', t: 1000, target: { kind: 'room', id: 'hat' }, status: 'builtin', ms: 3000, aside: '챙이 넓네' }, { type: 'peek', t: 2000, target: { kind: 'room', id: 'shell' }, status: 'builtin', ms: 2000 }, { type: 'return', t: 3000, reason: 'enough' }, { type: 'remember', t: 3500, stopIdx: 1, line: '조개 줄무늬를 셌어' }, { type: 'hang_poster', t: 4000 }, { type: 'wrap_up', t: 4500, reaction: '덤덤', line: '조용히 다녀왔어' }];
  async function model(bring) {   /* bring: false 끝까지 (빠르게) · true 나가자마자 데려오기 · 'returning' 길을 걸어 오는 중에 데려오기 (보통 속도) */
    var ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1, locale: 'ko-KR' });
    await ctx.addInitScript({ content: "window.__ppolAwakeMs = 0; window.__ppolTest = { today: '" + DAY + "' };" });
    var page = await ctx.newPage(), bag = []; bag.ignored = []; watchErrors(page, bag);
    await page.clock.install({ time: new Date(2026, 10, 5, 14, 0, 0) });
    await routeWiki(page, 'ok');
    await page.goto(INDEX + '?dev=0' + (bring ? '' : '&slow=0.2')); await nameOct(page, '데려와');
    await page.evaluate(function (e) { APP.importEvents(e); }, EV);
    var rp = null;
    if (bring === true) await skipAway(page);
    if (bring === 'returning') rp = await page.evaluate(function () { return new Promise(function (res) {
      /* 바깥 길에서 집으로 걸어 오는 중 (귀가 의식 · 바깥 · 문어가 보임)에 큰 버튼 — 프레임마다 문어 자리 · 귀가 의식 프레임 수 */
      var go = document.getElementById('btn-go'), log = [], pressed = false, frames = 0, t0 = performance.now();
      (function f() {
        var m = APP.scene.motion ? APP.scene.motion() : {};
        if (!pressed && APP.ceremony === 'return' && m.place === 'exterior' && m.octVisible) { pressed = true; go.click(); }
        if (pressed) { var k = APP.oct.anchor + '/' + APP.oct.state + '/' + m.place; if (log[log.length - 1] !== k) log.push(k); if (APP.ceremony === 'return') frames++; }
        if (pressed && !go.classList.contains('away')) { res({ log: log, frames: frames }); return; }
        if (performance.now() - t0 > 150000) { res({ timeout: true, pressed: pressed, log: log.slice(-6) }); return; }
        requestAnimationFrame(f);
      })();
    }); });
    await waitIdle(page, 90000); await page.waitForTimeout(200);
    var t = await page.evaluate(function () { var S = JSON.parse(JSON.stringify(APP.state)), t = S.trips[S.trips.length - 1]; delete t.startedAt; delete t.endedAt; return { t: t, lantern: S.room.lantern, visits: S.octopus.visits }; });
    await ctx.close();
    return { r: t, bag: bag, rp: rp };
  }
  var M1 = await model(false), M2 = await model(true), M3 = await model('returning');
  ok(M1.r.t.by === 'mcp' && same(M1.r, M2.r), '모델 차례를 데려와도 기록이 같다 (큰 버튼은 모델에게 아무것도 보내지 않는다 — 보이는 속도만)');
  var rl = (M3.rp && M3.rp.log) || [], atDoor = rl.some(function (x) { return /^door\/.*\/attic$/.test(x); }), atBoard = rl.some(function (x) { return /^board\//.test(x); });
  ok(M3.rp && !M3.rp.timeout && atDoor && !atBoard && M3.rp.frames >= 5 && M3.rp.frames <= 45, '길을 걸어 오는 중에 데려와도 자르지 않는다: 짧은 귀가로 다락 문에 들어와 문 앞 (보드 앞에 툭 나타나지 않음) · 귀가 ' + (M3.rp && M3.rp.frames) + ' 프레임 · ' + JSON.stringify(rl.slice(0, 6)));
  ok(same(M1.r, M3.r), '길을 걸어 오는 중에 데려와도 기록이 같다');
  ok(!M1.bag.length && !M2.bag.length && !M3.bag.length, '[K 모델] 페이지 에러 0' + (M3.bag.length ? ': ' + M3.bag.join(' | ') : ''));
}
/* ── O. 한 화면 배치 (주인 11-08: "문어 대사가 아래에 슥 뜨고 실제로는 방 움직이고 돌아다니는 쪽으로 … 화면이 반으로 나뉘어져있는 느낌인 게 불편해서") ──
   3D 일 때만 <html data-layout="one">: 장면이 창을 다 쓰고 상태 쪽지(위) · 큰 버튼(아래)이 그 위에 얹힌다. 오늘의 산책은 쪽지(#log-sheet — 단추 · Enter · Esc · 바깥 톡).
   쪽지를 닫아 둔 사이의 새 줄은 점(숫자 없음) + 한 줄 알림(남의 글 표시 data-raw 그대로), 열어 둔 동안엔 둘 다 없음. 혼잣말은 말풍선으로 보였으니 낭독기 한 줄(#say-live)만.
   대사 자리(#dlg-host — 개발 모드의 APP.dlgDemo, 플레이어 화면에선 아무것도 안 뜸). 3D 그림이 3 s 넘게 멈추면 위아래 배치(2D)로 되돌아가고 목록도 제자리로.
   플레이어 화면(?dev=0)은 스크롤이 없고, 저장 경고 띠가 떠도 그 높이만큼 장면이 줄어 스크롤이 안 생긴다. 네 화면 크기의 치수 · 증거 사진은 tools/layout-shots.js */
async function scenarioLayoutOne(browser) {
  console.log('\n== O. 한 화면 배치 (3D): 장면이 창을 다 씀 · 오늘의 산책 쪽지 · 새 줄 점 + 알림 · 대사 자리 · 3D 가 멈추면 위아래 배치 · 저장 경고 띠');
  var O = 'http://ppolppol.example', DAY1 = '2026-11-03', SPEED = 0.4;
  var HOOK = { content: "window.__ppolTest = window.__ppolTest || { today: '" + DAY1 + "', forceKind: 'out' };" };
  function layOf(pg) {
    return pg.evaluate(function () {
      function rc(id) { var e = document.getElementById(id); if (!e) return null; var r = e.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), r: Math.round(r.right), b: Math.round(r.bottom) }; }
      function shown(id) { var e = document.getElementById(id); if (!e) return false; var r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; }
      var root = document.documentElement, log = document.getElementById('log'), bt = document.getElementById('btn-today'), t = document.getElementById('toast'), d = document.getElementById('log-sheet');
      var dot = bt && bt.querySelector('.ib-dot'), dh = document.getElementById('dlg-host'), w = document.getElementById('save-warn'), rows = log ? log.querySelectorAll('.lrow') : [];
      var last = rows.length ? rows[rows.length - 1].getBoundingClientRect() : null, lr = log ? log.getBoundingClientRect() : null;
      return { one: root.getAttribute('data-layout'), mode: APP.sceneMode, vw: innerWidth, vh: innerHeight, docW: root.scrollWidth, docH: root.scrollHeight,
        scene: rc('scene'), status: rc('status'), go: rc('btn-go'), stick: rc('stick'), sheetBox: rc('log-sheet'), host: rc('dlg-host'), warn: w && !w.hidden ? rc('save-warn') : null,
        logIn: log && log.parentNode.id, logShown: shown('log'), secShown: shown('log-sec'), today: !!bt && !bt.hidden && shown('btn-today'), hint: shown('hint-in'),
        dot: !!(dot && !dot.hidden), sr: (document.getElementById('today-new') || {}).textContent || '', sheet: !!(d && d.open),
        newest: !!(last && lr && last.top >= lr.top - 1 && last.bottom <= lr.bottom + 1),
        dlg: !!(dh && dh.classList.contains('show')), dlgOn: root.classList.contains('dlg-on'), dlgH: root.style.getPropertyValue('--dlg-h'), warnH: root.style.getPropertyValue('--warn-h'),
        toast: { show: t.classList.contains('show'), row: t.classList.contains('row'), ico: !!t.querySelector('svg.t-ico'), txt: (t.querySelector('.t-txt') || {}).textContent || '', all: t.textContent, box: rc('toast') },
        rows: rows.length, ae: document.activeElement && document.activeElement.id, say: (document.getElementById('say-live') || {}).textContent || '' };
    });
  }
  function apart(a, b) { return !a || !b || a.r <= b.x || b.r <= a.x || a.b <= b.y || b.b <= a.y; }
  function sheetShut(pg) { return pg.waitForFunction(function () { return !document.querySelector('#log-sheet[open]'); }, null, { timeout: 5000 }); }
  function rowToastGone(pg) { return pg.waitForFunction(function () { var t = document.getElementById('toast'); return !t.classList.contains('show'); }, null, { timeout: 10000 }); }

  var s = await newPage(browser, 'ok', [HOOK]);
  var page = s.page;
  function lay() { return layOf(page); }
  await routeRepo(page, O);
  await page.goto(O + '/index.html?dev=1&slow=' + SPEED);
  await nameOct(page, '뚜루');
  await page.waitForSelector('#btn-go:not(.away)');

  /* 1. 틀: 장면이 창을 다 쓰고 나머지는 그 위에. 목록은 닫힌 쪽지 안, 예전 목록 칸은 안 보임 */
  var L = await lay();
  console.log('   틀:', JSON.stringify({ one: L.one, mode: L.mode, scene: L.scene, status: L.status, go: L.go, stick: L.stick, logIn: L.logIn, doc: [L.docW, L.docH] }));
  must(L.one === 'one' && L.mode === '3d', '3D 장면이면 <html data-layout="one"> (' + L.one + ' · ' + L.mode + ')');
  ok(L.scene.x === 0 && L.scene.y === 0 && L.scene.w === L.vw && L.scene.h === L.vh && L.docW <= L.vw, '장면이 창을 다 쓴다 (' + L.scene.w + '×' + L.scene.h + ' / ' + L.vw + '×' + L.vh + ') · 가로 스크롤 없음');
  ok(L.status.y >= 0 && L.status.b < L.vh / 2 && L.go.y > L.vh / 2 && L.go.b <= L.vh && L.go.r <= L.vw && L.go.w >= 44 && L.go.h >= 44 && apart(L.go, L.stick), '상태 쪽지는 위 · 큰 버튼은 아래 (창 안 · 44px 이상 · 발자국 손잡이와 안 겹침)');
  ok(L.logIn === 'log-slot' && !L.logShown && !L.secShown && L.today && !L.sheet && !L.dot && L.sr === '', '오늘의 산책 목록은 닫힌 쪽지(#log-slot) 안 · 예전 목록 칸은 안 보임 · 오늘 단추 보임(점 없음)');
  ok(!L.dlg && !L.dlgOn && L.dlgH === '', '대사 자리는 대사가 있을 때만 (지금은 숨김)');

  /* 2. 쪽지 열고 닫기: 단추 → 닫기 단추(포커스가 단추로 돌아옴) · Enter → Esc · 바깥 톡 */
  await page.click('#btn-today'); await page.waitForSelector('#log-sheet[open]');
  L = await lay();
  ok(L.sheet && L.logShown && L.ae === 'log-h' && L.sheetBox.b <= L.vh + 1 && L.sheetBox.w <= L.vw, '오늘 단추 → 쪽지가 열리고 목록이 보인다 (포커스는 제목 — ' + L.ae + ')');
  await page.click('#log-close'); await sheetShut(page);
  L = await lay();
  ok(!L.sheet && !L.logShown && L.ae === 'btn-today', '닫기 → 쪽지 닫힘 · 포커스는 오늘 단추로 (' + L.ae + ')');
  await page.keyboard.press('Enter'); await page.waitForSelector('#log-sheet[open]');
  await page.keyboard.press('Escape'); await sheetShut(page);
  L = await lay();
  ok(!L.sheet && L.ae === 'btn-today', '키보드: Enter 로 열고 Esc 로 닫기 · 포커스는 오늘 단추로 (' + L.ae + ')');
  await page.click('#btn-today'); await page.waitForSelector('#log-sheet[open]'); await page.waitForTimeout(450);
  var sb = (await lay()).sheetBox;
  await page.mouse.click(Math.round(sb.x + sb.w / 2), Math.max(4, Math.round(sb.y / 2)));
  var outShut = await sheetShut(page).then(function () { return true; }, function () { return false; });
  ok(outShut && sb.y > 40, '쪽지 바깥(위쪽 장면)을 톡 → 닫힘 (쪽지 위 가장자리 y ' + sb.y + ')');
  if (!outShut) { await page.evaluate(function () { document.getElementById('log-sheet').close(); }); await sheetShut(page); }

  /* 3. 닫아 둔 사이 새 줄: 점 + 한 줄 알림 (오늘 그림 + 글) — 큰 버튼 · 상태 쪽지와 안 겹침 */
  await rowToastGone(page).catch(function () {});
  await page.evaluate(function (h) { window.__ppolTest = Object.assign(window.__ppolTest || {}, { hint: h }); }, '모자의 역사');   /* 힌트 칸은 없앴다 (11-10) — 두뇌의 옛 길은 테스트 훅으로만 */
  await page.click('#btn-go'); await page.waitForSelector('#btn-go.away', { timeout: 10000 });
  var gotRow = await page.waitForFunction(function () { var t = document.getElementById('toast'); return t.classList.contains('show') && t.classList.contains('row'); }, null, { timeout: 15000, polling: 50 }).then(function () { return true; }, function () { return false; });
  L = await lay();
  console.log('   새 줄 알림:', JSON.stringify(L.toast), '점', L.dot, '·', L.sr);
  ok(gotRow && L.toast.ico && L.toast.txt.length > 0 && L.dot && L.sr === '새 줄이 있어', '쪽지를 닫아 둔 사이 새 줄 → 오늘 단추에 점(낭독기: 새 줄이 있어) + 한 줄 알림(오늘 그림 + 글 «' + L.toast.txt.slice(0, 24) + '»)');
  ok(gotRow && apart(L.toast.box, L.go) && apart(L.toast.box, L.status) && L.toast.box.x >= 0 && L.toast.box.r <= L.vw && L.toast.box.b <= L.vh, '한 줄 알림은 창 안 · 큰 버튼 · 상태 쪽지와 안 겹침 (' + JSON.stringify(L.toast.box) + ')');
  await page.screenshot({ path: path.join(SHOTS, 'one-row-toast.png') });

  /* 4. 나가 있는 중에 쪽지를 열면: 점 · 알림이 바로 사라지고, 열어 둔 동안 오는 줄은 목록에서 바로 읽는다 (점 · 알림 없음 · 가장 새 줄이 보임) */
  await page.click('#btn-today'); await page.waitForSelector('#log-sheet[open]');
  L = await lay();
  ok(L.sheet && !L.dot && L.sr === '' && !(L.toast.show && L.toast.row), '쪽지를 열면 점 · 한 줄 알림이 사라진다');
  var n0 = L.rows;
  var more = await page.waitForFunction(function (n) { return document.querySelectorAll('#log .lrow').length > n; }, n0, { timeout: 20000, polling: 100 }).then(function () { return true; }, function () { return false; });
  /* 줄은 붙은 뒤에 글이 채워지며 키가 큰다 (기웃 → 읽은 글) → 목록이 다시 따라 내려갈 때까지 잠깐(≤0.5 s) 아래가 잘려 보인다. 자리 잡은 상태를 본다:
     가장 새 줄이 다 보이고 스크롤이 0.3 s 그대로 (8 s 안에 그런 상태가 없으면 따라가지 못한 것) */
  var settled = await page.evaluate(function () {
    return new Promise(function (res) {
      var t0 = Date.now(), last = -1, same = 0;
      (function tick() {
        var l = document.getElementById('log'), rs = l.querySelectorAll('.lrow'), q = rs[rs.length - 1].getBoundingClientRect(), r = l.getBoundingClientRect();
        var full = q.top >= r.top - 1 && q.bottom <= r.bottom + 1, st = Math.round(l.scrollTop);
        same = st === last ? same + 1 : 0; last = st;
        if (full && same >= 2) { res({ ok: true, ms: Date.now() - t0 }); return; }
        if (Date.now() - t0 > 8000) { res({ ok: false, st: st, sh: l.scrollHeight, ch: l.clientHeight, row: [Math.round(q.top - r.top), Math.round(q.height)] }); return; }
        setTimeout(tick, 150);
      })();
    });
  });
  L = await lay();
  ok(more && !L.dot && !(L.toast.show && L.toast.row) && settled.ok, '쪽지를 열어 둔 동안 온 줄: 점 · 알림 없음 · 목록이 따라 내려가 가장 새 줄이 다 보임 (' + n0 + ' → ' + L.rows + '줄' + (settled.ok ? '' : ' ✗ ' + JSON.stringify(settled)) + ')');
  await page.screenshot({ path: path.join(SHOTS, 'one-log-sheet.png') });
  await page.click('#log-close'); await sheetShut(page);
  await skipAway(page).catch(function () {}); await waitIdle(page);
  var dotBack = await page.waitForFunction(function () { var d = document.querySelector('#btn-today .ib-dot'); return d && !d.hidden; }, null, { timeout: 15000 }).then(function () { return true; }, function () { return false; });
  ok(dotBack, '닫은 뒤 돌아오며 붙은 줄 → 점이 다시 켜짐');
  await page.click('#btn-today'); await page.waitForSelector('#log-sheet[open]');
  L = await lay();
  ok(!L.dot && L.sr === '', '다시 열면 점이 꺼짐');
  await page.click('#log-close'); await sheetShut(page);
  await page.waitForTimeout(600);

  /* 5. 혼잣말: 말풍선으로 보였으니 점 · 알림 없이 낭독기 한 줄만 (닫힌 쪽지 안의 role=log 는 읽히지 않는다) */
  await rowToastGone(page).catch(function () {});
  var r0 = (await lay()).rows;
  await page.evaluate(function () { APP.say('바람이 좋다'); });
  await page.waitForTimeout(500);
  L = await lay();
  ok(L.say === '혼잣말 · 바람이 좋다' && !L.dot && !(L.toast.show && L.toast.row) && L.rows === r0 + 1, '혼잣말: 낭독기 한 줄(#say-live «' + L.say + '») · 점 · 알림 없음 · 목록엔 한 줄 남음');

  /* 6. 모델이 쓴 말(이모지 포함)이 한 줄 알림에 뜰 때도 남의 글 표시(data-raw) 안에 원문 그대로 — 알림이 뜰 때마다 적어 둔다 */
  var ASIDE = '챙이 넓어 🎩', NOTE = '안쪽 띠가 좋아 🧵';
  await page.evaluate(function () {
    window.__rowT = [];
    var t = document.getElementById('toast');
    new MutationObserver(function () {
      if (!t.classList.contains('row') || !t.classList.contains('show')) return;
      var raw = [].map.call(t.querySelectorAll('[data-raw]'), function (e) { return e.getAttribute('data-raw') + '|' + e.textContent; });
      var c = t.cloneNode(true); [].forEach.call(c.querySelectorAll('[data-raw]'), function (e) { e.remove(); });
      var k = raw.join('¦') + '¦¦' + c.textContent;
      if (window.__rowT.indexOf(k) < 0) window.__rowT.push(k);
    }).observe(t, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  });
  must(await page.evaluate(function (e) { return APP.importEvents(e); }, [{ type: 'depart', t: 0, hint: '' },
    { type: 'peek', t: 800, target: { kind: 'room', id: 'hat', title: '모자' }, status: 'builtin', ms: 2500, aside: ASIDE, note: NOTE },
    { type: 'return', t: 4500, reason: 'enough' }, { type: 'wrap_up', t: 5500, reaction: '두근 ✨', line: '좋았어 😌' }]), '모델 차례 재생 시작');
  await page.waitForSelector('#btn-go.away', { timeout: 10000 }).catch(function () {});
  for (var i = 0; i < 40; i++) { await page.waitForTimeout(500); if (!(await page.$('#btn-go.away'))) break; }
  await waitIdle(page); await page.waitForTimeout(800);
  var rowT = await page.evaluate(function () { return window.__rowT; });
  console.log('   모델 차례 동안 뜬 한 줄 알림:', JSON.stringify(rowT));
  var EMO = /[\u{1F300}-\u{1FAFF}✨]/u;
  var rawOk = rowT.some(function (k) { return k.split('¦¦')[0].split('¦').some(function (r) { return /^model\|/.test(r) && EMO.test(r); }); });
  var leak = rowT.filter(function (k) { return EMO.test(k.split('¦¦')[1] || ''); });
  ok(rowT.length >= 1 && rawOk && !leak.length, '모델이 쓴 말이 뜬 한 줄 알림: 남의 글 표시(data-raw="model") 안에 원문 그대로 · 표시 밖엔 이모지 없음' + (leak.length ? ' ✗ ' + JSON.stringify(leak) : ''));

  /* 7. 대사 자리 (개발 모드의 APP.dlgDemo — 진짜 대사창은 다음 물결): 아래에서 뜨고 큰 버튼 · 손잡이를 밀어 올리지 않고 덮지도 않는다. 대사를 누르면 끝나고 자리도 사라진다 */
  await rowToastGone(page).catch(function () {});
  var DTEXT = '오늘은 등대 아래까지 걸어가 보고 싶어. 바람이 좀 불어도 괜찮아.';
  var dStart = await page.evaluate(function (t) { window.__dlgDone = false; var p = APP.dlgDemo(t, 'wait'); if (!p) return false; p.then(function () { window.__dlgDone = true; }); return true; }, DTEXT);
  await page.waitForTimeout(400);
  L = await lay();
  var dTxt = await page.evaluate(function () { var x = document.querySelector('#dlg-host .dlg-text'); return x ? x.textContent : ''; });
  console.log('   대사 자리:', JSON.stringify({ host: L.host, dlgH: L.dlgH, go: L.go, stick: L.stick }));
  ok(dStart && L.dlg && L.dlgOn && /^\d+px$/.test(L.dlgH) && dTxt === DTEXT, '대사 자리: APP.dlgDemo → #dlg-host 가 뜨고 html.dlg-on · --dlg-h (' + L.dlgH + ') · 대사 글 그대로');
  ok(L.host && L.host.y > L.vh / 2 && L.host.b <= L.vh && L.host.x >= 0 && L.host.r <= L.vw && apart(L.host, L.status), '대사 자리는 창 아래쪽 (창 안 · 상태 쪽지와 안 겹침 — ' + JSON.stringify(L.host) + ')');
  await page.screenshot({ path: path.join(SHOTS, 'one-dialogue.png') });
  await page.click('#dlg-host .dlg-next');
  var dDone = await page.waitForFunction(function () { return window.__dlgDone === true; }, null, { timeout: 5000 }).then(function () { return true; }, function () { return false; });
  L = await lay();
  ok(dDone && !L.dlg && !L.dlgOn && L.dlgH === '', '대사를 누르면 끝난다 → 대사 자리가 사라지고 --dlg-h 도 지워짐');

  /* 8. 3D 그림이 멈추면 (컨텍스트를 잃고 3 s 안에 안 돌아옴) 위아래 배치(2D)로: 속성이 떨어지고 목록은 제자리 · 열려 있던 쪽지는 닫힘 · 오늘 단추 숨김 */
  await page.click('#btn-today'); await page.waitForSelector('#log-sheet[open]');
  var lost = await page.evaluate(function () {
    var c = document.querySelector('#scene3d canvas'); if (!c) return 'no canvas';
    var gl = c.getContext('webgl2') || c.getContext('webgl'); if (!gl) return 'no context';
    var x = gl.getExtension('WEBGL_lose_context'); if (!x) return 'no extension';
    x.loseContext(); return 'lost';
  });
  var fell = await page.waitForFunction(function () { return APP.sceneMode === '2d'; }, null, { timeout: 12000 }).then(function () { return true; }, function () { return false; });
  await page.waitForTimeout(500);
  L = await lay();
  console.log('   3D 멈춤:', lost, JSON.stringify({ one: L.one, mode: L.mode, logIn: L.logIn, sheet: L.sheet, today: L.today, scene: L.scene, status: L.status, toast: L.toast.all }));
  ok(lost === 'lost' && fell && L.one === null && L.logIn === 'log-sec' && L.logShown && L.secShown && !L.sheet && !L.today && !L.dot, '3D 그림이 멈추면 2D · 위아래 배치로: data-layout 없음 · 목록은 #log-sec 로 · 쪽지 닫힘 · 오늘 단추 숨김');
  ok(L.scene.h < L.vh && L.status.y >= L.scene.b - 1 && /3D 그림이 멈춰서 2D로 바꿨어/.test(L.toast.all), '위아래 배치: 상태 줄은 장면 아래 (장면 높이 ' + L.scene.h + ') · 알림 «3D 그림이 멈춰서 2D로 바꿨어»');
  await page.screenshot({ path: path.join(SHOTS, 'one-fallback-2d.png') });
  reportErrors(s.bag, 'O');
  await s.ctx.close();

  /* 9. 플레이어 화면 (?dev=0): 같은 배치 · 스크롤 없음 · 힌트 칸 없음 · APP.dlgDemo 는 아무것도 안 띄움. 저장 경고 띠가 뜨면 그 높이만큼 장면이 줄고 스크롤은 여전히 없음 */
  var s2 = await newPage(browser, 'ok', [HOOK]);
  var p2 = s2.page;
  await routeRepo(p2, O);
  await p2.goto(O + '/index.html?dev=0');
  await nameOct(p2, '뚜루');
  await p2.waitForSelector('#btn-go:not(.away)');
  var P = await layOf(p2);
  var pDemo = await p2.evaluate(function () { return APP.dlgDemo('x', 'wait') === null && !document.getElementById('dlg-host').classList.contains('show'); });
  ok(P.one === 'one' && P.scene.w === P.vw && P.scene.h === P.vh && P.docW <= P.vw && P.docH <= P.vh && !P.hint && !P.warn && P.warnH === '', '플레이어 화면: 한 화면 배치 · 세로 · 가로 스크롤 없음 (' + P.docW + '×' + P.docH + ' / ' + P.vw + '×' + P.vh + ') · 힌트 칸 없음');
  ok(pDemo, '플레이어 화면: APP.dlgDemo 는 아무것도 안 띄운다 (개발 모드 전용)');
  await p2.evaluate(function () { window.__setItem = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new Error('막힘'); }; APP.save(); });
  await p2.waitForTimeout(300);
  P = await layOf(p2);
  console.log('   저장 경고 띠:', JSON.stringify({ warn: P.warn, warnH: P.warnH, scene: P.scene, doc: [P.docW, P.docH], go: P.go }));
  ok(P.warn && P.warn.h > 0 && P.warnH === P.warn.h + 'px' && P.scene.y === P.warn.b && P.scene.h === P.vh - P.warn.h && P.docH <= P.vh && P.go.b <= P.vh, '저장 경고 띠가 뜨면 그 높이(' + P.warnH + ')만큼 장면이 줄어든다 · 스크롤 없음 · 큰 버튼은 창 안');
  await p2.screenshot({ path: path.join(SHOTS, 'one-save-warn.png') });
  await p2.evaluate(function () { Storage.prototype.setItem = window.__setItem; });
  reportErrors(s2.bag, 'O-2');
  await s2.ctx.close();
}

/* X. 바깥 텃밭 (검증 11-11): 흙 · 심은 것을 톡 하면 그 칸 (세 크기 · 칸마다 흙 격자 · 진짜 손가락) · 울타리 자리에 선 문어를 톡 하면 밭이 아니라 문어 ·
   키보드(단추 · Enter · 링이 제 칸 위) · 단추 이름(칸 · 든 것 · 누르면 할 일, 바뀔 때마다) · 2D 에선 '밭을 바로 톡' 글이 없다 · 모르는 꽃 색이어도 살림이 열리고 물 · 거두기 ·
   다른 탭 · 불러오기 · 전체 초기화 뒤 꼬리표 · 점 · 열린 살림 · 재봉틀 시트 · 바깥 밭 · 씨앗이 보인다(칸 상자 안 픽셀 차) · 울타리가 밭 밖 · 심은 것 지오메트리가 버릴 목록에 (늘지 않게) */
async function scenarioGarden(browser) {
  console.log('\n== X. 바깥 텃밭: 톡한 칸 · 울타리의 문어 · 키보드 · 단추 이름 · 2D 글 · 모르는 색 · 다른 탭 · 불러오기 · 초기화 · 씨앗 그림 · 울타리');
  var O = 'http://ppolppol.example', bag = []; bag.ignored = [];
  var RED = '#e8463c', BORN = 1762600000000, DAY = '2026-11-11', NEXT = '2026-11-12', WK = '2026-11-09';
  var WAIT = +process.env.SMOKE_WAIT || 180000;   /* '그 상태가 될 때까지' 의 넉넉한 끝 (검사가 아니다) */
  var WEEK5 = { key: WK, q: [{ id: 'ask', n: 2, rr: 0 }, { id: 'run', n: 1, rr: 0 }, { id: 'water', n: 2, rr: 0 }, { id: 'plant', n: 1, rr: 0 }, { id: 'harvest', n: 1, rr: 0 }, { id: 'furn', n: 0, rr: 0 }, { id: 'loft', n: 0, rr: 0 }], claimed: false };
  function USER(o) { return Object.assign({ shells: 10, seeds: 60, dyes: {}, days: [DAY], earned: [], garden: [null, null, null], giftDay: DAY }, o || {}); }
  function REC(user) {
    var r = { v: 2, octopus: { name: '뚜루', born: BORN, trips: 0, invites: 3, days: ['2026-11-06', '2026-11-07', '2026-11-08'], affinity: {}, visits: {}, state: 'idle', color: RED,
      colors: [{ at: BORN, date: '2026-11-06', color: RED, how: 'first', by: 'player' }] }, room: { lantern: 3, souvenirs: [], posterOrder: [] }, trips: [], notes: {}, curiosityNotes: [], salon: { asks: [] },
      settings: { motion: 'auto', thumbs: true, lastSeen: 1762650000000, octColor: RED, flipped: false, pixelFont: true, albumSeen: 0 } };
    if (user) r.user = user;
    return r;
  }
  /* 기록은 문맥에 한 번만 심는다 (둘째 탭엔 그대로) · 날짜 훅 · 낮 맑음 (그림 비교가 시각 · 날씨에 흔들리지 않게) · 장면 위치는 장면의 투영으로 (__xp: 월드 → 클라이언트 px) */
  async function ctxOf(o) {
    var ctx = await browser.newContext({ viewport: { width: o.w || 360, height: o.h || 740 }, deviceScaleFactor: 1, locale: 'ko-KR', colorScheme: 'light', hasTouch: true, isMobile: true });
    await ctx.addInitScript({ content: 'window.__ppolAwakeMs = 0;' });
    await ctx.addInitScript({ content: "if (!localStorage.getItem('__x_seed')) { localStorage.setItem('__x_seed', '1'); localStorage.setItem('ppolppol_v2', " + JSON.stringify(JSON.stringify(o.rec)) + '); } ' +
      "window.__ppolTest = { today: sessionStorage.getItem('__x_day') || '" + DAY + "' }; window.__ppolLook = { hour: 13, weather: 'clear' };" +
      "window.__xp = function (w) { var s = APP.scene.spotRect('plot0') || APP.scene.spotRect('plot1') || APP.scene.spotRect('plot2'), q = APP.scene.screenOf(w[0], w[1], w[2]); return [s.client.x - s.x + q.x, s.client.y - s.y + q.y]; };" });
    return ctx;
  }
  async function tab(ctx, q) {
    var page = await ctx.newPage(); watchErrors(page, bag);
    page.setDefaultNavigationTimeout(WAIT);
    if (useStubs) { await page.addInitScript({ path: path.join(ROOT, 'tools/stubs.js') }); if (haveReal) await page.route(/\/js\/(world|brain)\.js$/, function (route) { return route.fulfill({ status: 200, contentType: 'application/javascript', body: '/* stubbed by tools/smoke.js */' }); }); }
    await routeWiki(page, 'ok'); await routeRepo(page, O);
    await page.goto(O + '/index.html?dev=0' + (q || ''));
    await page.waitForSelector('#btn-go:not(.away)', { timeout: WAIT });
    return page;
  }
  /* 산책 중과 같게: 앱 · 장면 문어는 'away' (돌아다니지 않고 안 보인다) · 바깥을 바로 → 밭 단추 셋이 올라올 때까지 */
  async function outside(pg) {
    await pg.evaluate(function () { APP.oct.state = 'away'; APP.scene.setOctState('away'); APP.scene.setPlace('exterior', { instant: true }); });
    await pg.waitForFunction(function () { return APP.scene.view() === 'exterior' && [0, 1, 2].every(function (i) { return !document.getElementById('btn-plot' + i).hidden; }); }, null, { timeout: WAIT });
  }
  function frames(pg) { return pg.evaluate(function () { return new Promise(function (res) { var n = 0; (function f() { if (++n > 6) res(); else requestAnimationFrame(f); })(); }); }); }
  function planted(pg) { return pg.waitForFunction(function () { var g = APP.state.user.garden, i = [0, 1, 2].filter(function (k) { return !!g[k]; }); return i.length ? i.join('+') : false; }, null, { timeout: 20000, polling: 50 }).then(function (h) { return h.jsonValue(); }, function () { return 'none'; }); }
  function sceneG(pg) { return pg.evaluate(function () { return APP.scene.garden().map(function (g) { return g ? g.water : null; }); }); }
  function labels(pg) { return pg.evaluate(function () { return [0, 1, 2].map(function (i) { return document.getElementById('btn-plot' + i).getAttribute('aria-label'); }); }); }
  function sheetLabels(pg) { return pg.evaluate(function () { var sh = document.getElementById('bag-sheet'); if (!sh.open) document.getElementById('btn-bag').click(); var o = [].map.call(document.querySelectorAll('#bag-body .bag-plot'), function (b) { return b.getAttribute('aria-label'); }); document.getElementById('bag-close').click(); return o; }); }

  /* 1. 세 크기: 흙 격자 (칸마다 7×7) · 씨앗 · 새싹 · 꽃을 톡 → 그 칸 · 진짜 손가락 톡 (가운데 · 네 모서리) */
  for (var vp of [[320, 568], [360, 740], [412, 915]]) {
    var tag = vp.join('x'), c1 = await ctxOf({ w: vp[0], h: vp[1], rec: REC(USER()) }), p1 = await tab(c1);
    await outside(p1);
    var gr = await p1.evaluate(function () {
      APP.scene.setGarden([null, null, null]);
      var d = APP.scene.plotsDebug(), F = [-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9], out = { n: 0, wrong: [] };
      d.c.forEach(function (c, i) { F.forEach(function (a) { F.forEach(function (b) {
        var p = __xp([c[0] + a * d.half, c[1], c[2] + b * d.half]), k = APP.scene.pickAt(p[0], p[1]), got = k ? (k.kind === 'spot' ? k.id : k.kind) : null;
        out.n++; if (got !== 'plot' + i) out.wrong.push(i + '@' + a + ',' + b + '>' + got + '(' + Math.round(p[0]) + ',' + Math.round(p[1]) + ')');
      }); }); });
      return out;
    });
    ok(gr.n === 147 && !gr.wrong.length, tag + ': 흙 위 ' + gr.n + '곳을 톡 하면 그 칸 (틀린 곳 ' + gr.wrong.length + (gr.wrong.length ? ': ' + gr.wrong.slice(0, 8).join(' ') : '') + ')');
    var pl = await p1.evaluate(function () {   /* 심은 것: 씨앗 둔덕 · 팻말 / 새싹 줄기 · 잎 / 꽃송이 · 줄기 (흙 윗면에서 잰 높이) */
      var d = APP.scene.plotsDebug(), o = d.origin, PTS = { 0: [[0, 0.05, 0], [0.17, 0.27, -0.15], [0.16, 0.12, -0.16]], 1: [[0, 0.12, 0], [0.09, 0.12, 0]], 2: [[0, 0.56, 0], [0, 0.3, 0], [0.09, 0.25, 0]] }, out = { n: 0, wrong: [] };
      [0, 1, 2].forEach(function (w) {
        APP.scene.setGarden([0, 1, 2].map(function () { return { color: '#4a86d8', water: w }; }));
        d.c.forEach(function (c, i) { PTS[w].forEach(function (q) { var p = __xp([c[0] + q[0], c[1] + q[1], c[2] + q[2]]), k = APP.scene.pickAt(p[0], p[1]), got = k ? (k.kind === 'spot' ? k.id : k.kind) : null; out.n++; if (got !== 'plot' + i) out.wrong.push('w' + w + ':' + i + '@' + q.join(',') + '>' + got); }); });
      });
      APP.scene.setGarden([null, null, null]); return out;
    });
    ok(!pl.wrong.length, tag + ': 씨앗 · 새싹 · 꽃 (' + pl.n + '곳)을 톡 하면 그 칸 (틀린 곳 ' + pl.wrong.length + (pl.wrong.length ? ': ' + pl.wrong.join(' ') : '') + ')');
    var taps = await p1.evaluate(function () { var d = APP.scene.plotsDebug(), out = []; d.c.forEach(function (c, i) { [[0, 0], [-0.75, -0.75], [0.75, -0.75], [-0.75, 0.75], [0.75, 0.75]].forEach(function (f) { var p = __xp([c[0] + f[0] * d.half, c[1], c[2] + f[1] * d.half]); out.push({ i: i, f: f.join(','), x: p[0], y: p[1] }); }); }); return out; });
    var bad = [];
    for (var t of taps) {
      await p1.evaluate(function () { APP.state.user.garden = [null, null, null]; APP.state.user.seeds = 60; APP.scene.setGarden([null, null, null]); });
      await p1.touchscreen.tap(t.x, t.y);
      var got = await planted(p1); if (got !== String(t.i)) bad.push(t.i + '@' + t.f + '>' + got);
    }
    ok(!bad.length, tag + ': 진짜 손가락으로 흙 ' + taps.length + '곳 (칸마다 가운데 · 네 모서리) → 그 칸에 심었다' + (bad.length ? ' — 틀림: ' + bad.join(' ') : ''));

    if (vp[0] === 412) {   /* 2. 문어가 정말 울타리 자리(numbers, 첫째 칸 옆)에 서 있을 때: 몸을 톡 → 밭이 아니라 문어 (산책 중이라 아무 일 없음) */
      var oc = await p1.evaluate(async function () {
        APP.scene.setGarden([null, null, null]);
        await APP.scene.peekOutside({ corner: 'numbers', status: 'builtin' });
        var pk = APP.scene.peek(), d = APP.scene.plotsDebug(), sp = APP.scene.extSpot('numbers'), g = __xp([d.origin[0] + sp.x, d.origin[1] + 0.02, d.origin[2] + sp.z]), h = APP.scene.octScreenPos();
        var pts = [0.3, 0.5, 0.7].map(function (f) { return [g[0] + (h.x - g[0]) * f, g[1] + (h.y - g[1]) * f]; });
        var withOct = pts.map(function (p) { var k = APP.scene.pickAt(p[0], p[1]); return k ? (k.kind === 'spot' ? k.id : k.kind) : null; });
        return { pk: pk, pts: pts, withOct: withOct, sentinel: __xp(d.c[2]) };
      });
      for (var q of oc.pts) await p1.touchscreen.tap(q[0], q[1]);
      await p1.touchscreen.tap(oc.sentinel[0], oc.sentinel[1]);   /* 셋째 칸 톡이 들어온 뒤면 앞의 톡도 다 처리됐다 */
      var after = await p1.waitForFunction(function () { var g = APP.state.user.garden; return g[2] ? g.map(function (x) { return x ? 1 : 0; }).join('') : false; }, null, { timeout: 20000, polling: 50 }).then(function (h) { return h.jsonValue(); }, function () { return 'none'; });
      var without = await p1.evaluate(function (pts) { APP.scene.setOctState('away'); return pts.map(function (p) { var k = APP.scene.pickAt(p[0], p[1]); return k ? (k.kind === 'spot' ? k.id : k.kind) : null; }); }, oc.pts);
      console.log('   울타리 자리 문어:', JSON.stringify({ peek: [oc.pk.on, oc.pk.key, oc.pk.onSpot], pts: oc.pts.map(function (p) { return p.map(Math.round); }), withOct: oc.withOct, withoutOct: without, garden: after }));
      ok(oc.pk.on && oc.pk.key === 'numbers' && oc.pk.onSpot, '문어가 울타리 자리(numbers)에 서 있다');
      ok(oc.withOct.every(function (k) { return !/^plot/.test(k || ''); }) && after === '001', '울타리 자리에 선 문어 몸을 세 번 톡 → 밭은 그대로 (톡 표적 ' + JSON.stringify(oc.withOct) + ' · 밭 ' + after + ' = 셋째 칸 확인 톡만)');
    }

    if (vp[0] === 360) {
      /* 3. 키보드: 단추 셋 · 링(단추 상자)의 가운데가 제 칸 흙에 가장 가깝고 제 칸 가운데를 품는다 · Enter 는 그 칸 */
      var kb = await p1.evaluate(function () {
        var d = APP.scene.plotsDebug(), cs = d.c.map(function (c) { return __xp(c); });
        return [0, 1, 2].map(function (i) { var r = document.getElementById('btn-plot' + i).getBoundingClientRect(), mx = r.left + r.width / 2, my = r.top + r.height / 2, near = 0;
          cs.forEach(function (c, j) { if (Math.hypot(c[0] - mx, c[1] - my) < Math.hypot(cs[near][0] - mx, cs[near][1] - my)) near = j; });
          return { near: near, inside: cs[i][0] >= r.left && cs[i][0] <= r.right && cs[i][1] >= r.top && cs[i][1] <= r.bottom }; });
      });
      ok(kb.every(function (k, i) { return k.near === i && k.inside; }), '단추 셋의 링이 저마다 제 칸 위: ' + JSON.stringify(kb));
      var kbad = [];
      for (var ki = 0; ki < 3; ki++) {
        await p1.evaluate(function (i) { APP.state.user.garden = [null, null, null]; APP.state.user.seeds = 60; APP.scene.setGarden([null, null, null]); document.getElementById('btn-plot' + i).focus(); }, ki);
        await p1.keyboard.press('Enter');
        var kg = await planted(p1); if (kg !== String(ki)) kbad.push(ki + '>' + kg);
      }
      ok(!kbad.length, '키보드: 단추에 포커스 + Enter → 그 칸에 심었다' + (kbad.length ? ' — 틀림: ' + kbad.join(' ') : ''));

      /* 4. 단추 이름: 칸 · 든 것 · 누르면 할 일. 바깥 단추와 살림 시트 단추가 같은 말, 바뀔 때마다 */
      await p1.evaluate(function (d) { var u = APP.state.user; u.garden = [null, null, null]; u.seeds = 1; u.giftDay = d; APP.save(); APP.renderAll(); document.getElementById('btn-plot0').focus(); }, DAY);   /* 오늘 선물은 받은 날로 (매분 선물이 씨앗을 늘리지 않게) */
      var L0 = await labels(p1), S0 = await sheetLabels(p1);
      await p1.keyboard.press('Enter'); await planted(p1);
      var L1 = await labels(p1), S1 = await sheetLabels(p1);
      await p1.evaluate(function () { document.getElementById('btn-plot0').focus(); });
      await p1.keyboard.press('Enter'); await p1.waitForFunction(function () { return APP.state.user.garden[0].water === 1; }, null, { timeout: WAIT });
      var L2 = await labels(p1);
      await p1.evaluate(function (d) { sessionStorage.setItem('__x_day', d); window.__ppolTest.today = d; APP.state.user.giftDay = d; APP.save(); document.getElementById('btn-plot1').focus(); document.getElementById('btn-plot0').focus(); }, NEXT);   /* 다음 날: 포커스만으로도 이름이 새로 */
      var L3 = await labels(p1);
      await p1.keyboard.press('Enter'); await p1.waitForFunction(function () { return APP.state.user.garden[0].water === 2; }, null, { timeout: WAIT });
      var L4 = await labels(p1), S4 = await sheetLabels(p1), fl = await p1.evaluate(function () { var c = APP.state.user.garden[0].color; return { red: '빨강', yellow: '노랑', green: '초록', blue: '파랑', purple: '보라', pink: '분홍' }[c]; });
      await p1.evaluate(function () { document.getElementById('btn-plot0').focus(); });
      await p1.keyboard.press('Enter'); await p1.waitForFunction(function () { return !APP.state.user.garden[0]; }, null, { timeout: WAIT });
      var L5 = await labels(p1);
      console.log('   단추 이름:', JSON.stringify({ L0: L0, L1: L1, L2: L2[0], L3: L3[0], L4: L4[0], L5: L5[0], S4: S4 }));
      ok(L0[0] === '텃밭 첫째 칸, 빈 칸, 씨앗 심기' && L0[2] === '텃밭 셋째 칸, 빈 칸, 씨앗 심기' && JSON.stringify(S0) === JSON.stringify(L0), '빈 밭 (씨앗 1): «' + L0[0] + '» · 살림 시트 단추도 같은 이름');
      ok(L1[0] === '텃밭 첫째 칸, 씨앗, 물 주기' && L1[1] === '텃밭 둘째 칸, 빈 칸, 씨앗이 없어' && JSON.stringify(S1) === JSON.stringify(L1), '심은 뒤: «' + L1[0] + '» · 씨앗이 떨어진 빈 칸 «' + L1[1] + '» · 시트도 같음');
      ok(L2[0] === '텃밭 첫째 칸, 새싹, 오늘은 물을 줬어', '물 준 날: «' + L2[0] + '»');
      ok(L3[0] === '텃밭 첫째 칸, 새싹, 물 주기', '다음 날 (포커스 때 다시): «' + L3[0] + '»');
      ok(!!fl && L4[0] === '텃밭 첫째 칸, ' + fl + ' 꽃, 거두기' && S4[0] === L4[0], '꽃: «' + L4[0] + '» · 시트도 같음');
      ok(L5[0] === '텃밭 첫째 칸, 빈 칸, 씨앗이 없어', '거둔 뒤: «' + L5[0] + '»');

      /* 5. 그림: 씨앗 칸은 빈 칸과 칸 상자 안에서 눈에 띄게 다르다 (빈 칸끼리 차 = 잡음 바닥) · 울타리 끝 기둥은 첫째 칸 테 밖 */
      async function boxPng(i) { var r = await p1.evaluate(function (i) { var s = APP.scene.spotRect('plot' + i), a = s.art, ox = s.client.x - s.x, oy = s.client.y - s.y; return { x: Math.floor(a.l + ox), y: Math.floor(a.t + oy), width: Math.ceil(a.r - a.l), height: Math.ceil(a.b - a.t) }; }, i); await frames(p1); return (await p1.screenshot({ clip: r })).toString('base64'); }
      function pxDiff(a, b) { return p1.evaluate(async function (ab) {
        function load(s) { return new Promise(function (res) { var im = new Image(); im.onload = function () { res(im); }; im.src = 'data:image/png;base64,' + s; }); }
        var A = await load(ab[0]), B = await load(ab[1]), cv = document.createElement('canvas'); cv.width = A.width; cv.height = A.height; var x = cv.getContext('2d');
        x.drawImage(A, 0, 0); var da = x.getImageData(0, 0, cv.width, cv.height).data; x.clearRect(0, 0, cv.width, cv.height); x.drawImage(B, 0, 0); var db = x.getImageData(0, 0, cv.width, cv.height).data, n = 0;
        for (var i = 0; i < da.length; i += 4) if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 30) n++;
        return n; }, [a, b]); }
      await p1.evaluate(function () { APP.scene.setGarden([null, null, null]); });
      var e1 = await boxPng(1), e2 = await boxPng(1);
      await p1.evaluate(function () { APP.scene.setGarden([null, { color: '#c8323a', water: 0 }, null]); });
      var s1 = await boxPng(1), noise = await pxDiff(e1, e2), seedPx = await pxDiff(e1, s1);
      await p1.evaluate(function () { APP.scene.setGarden([null, null, null]); });
      ok(seedPx >= 100 + noise, '씨앗을 심은 칸은 빈 칸과 칸 상자 안 ' + seedPx + ' px 다르다 (100 px 이상 — 예전 4×3 px 점 둔덕은 42 px · 빈 칸끼리 잡음 ' + noise + ' px)');
      var dbg = await p1.evaluate(function () { return APP.scene.plotsDebug(); });
      ok(dbg.fence[0] + 0.04 < dbg.c[0][0] - dbg.frame, '울타리 끝 기둥(x ' + (dbg.fence[0] + 0.04).toFixed(2) + ' 까지)은 첫째 칸 테(x ' + (dbg.c[0][0] - dbg.frame).toFixed(2) + ' 부터) 밖');

      /* 6. 심은 것 지오메트리: 장면을 버릴 때 같이 놓는 목록(keep)에 있고, 다시 지어도 목록이 늘지 않는다 · 같은 밭 · 같은 옷 색이면 renderAll 이 다시 짓지 않는다 */
      var kp = await p1.evaluate(function () {
        var S = [[{ color: '#c8323a', water: 2 }, null, null], [null, { color: '#4a86d8', water: 1 }, { color: '#4a86d8', water: 0 }]];
        APP.scene.setGarden(S[0]); var a = APP.scene.plotsDebug();
        for (var i = 0; i < 10; i++) APP.scene.setGarden(S[i & 1]);
        var b = APP.scene.plotsDebug(); APP.state.user.garden = [{ color: 'green', water: 1, wateredDay: '' }, null, null]; APP.renderAll(); var c = APP.scene.plotsDebug();
        for (var j = 0; j < 3; j++) APP.renderAll();
        var e = APP.scene.plotsDebug(); return { a: a, b: b, c: c, e: e };
      });
      ok(kp.a.plants && kp.a.plants.kept && kp.b.plants.kept && kp.b.disposables === kp.a.disposables, '심은 것 지오메트리는 버릴 목록에 있고 (' + (kp.a.plants && kp.a.plants.kept) + ') 열 번 다시 지어도 목록 길이 그대로 (' + kp.a.disposables + ' → ' + kp.b.disposables + ')');
      ok(kp.e.plants && kp.c.plants && kp.e.plants.id === kp.c.plants.id && kp.e.playerGeo === kp.c.playerGeo && kp.e.disposables === kp.c.disposables, 'renderAll 세 번: 같은 밭 · 같은 옷 색이면 심은 것 · 내 캐릭터를 다시 짓지 않는다');
    }
    await c1.close();
  }

  /* 7. 2D: 살림 시트에 '밭을 바로 톡' 글이 없다 (3D 엔 있다) */
  var c2 = await ctxOf({ rec: REC(USER()) }), p2 = await tab(c2, '&scene=2d'), p3 = await tab(c2);
  function noteOf(pg) { return pg.evaluate(function () { document.getElementById('btn-bag').click(); var t = [].map.call(document.querySelectorAll('#bag-body .set-note'), function (x) { return x.textContent; }).filter(function (x) { return /밭은/.test(x); })[0] || ''; document.getElementById('bag-close').click(); return { mode: APP.sceneMode, t: t }; }); }
  var n2 = await noteOf(p2), n3 = await noteOf(p3);
  ok(n2.mode === '2d' && n2.t === '밭은 집 앞마당에 있어.' && n3.mode === '3d' && /밭을 바로 톡 해도 돼/.test(n3.t), '2D 시트: «' + n2.t + '» · 3D 시트에는 바로 톡 한 줄');
  await c2.close();

  /* 8. 모르는 꽃 색 (손댄 기록 · 나중 빌드): 살림이 열리고 · 꽃으로 보이고 · 물 · 거두기가 되고 · 저장된 색은 그대로 · 객체가 아닌 칸만 빈 칸 */
  var c4 = await ctxOf({ rec: REC(USER({ garden: [{ color: 'teal', water: 2, wateredDay: '' }, 'junk', { color: 'teal', water: 1, wateredDay: '' }] })) }), p4 = await tab(c4);
  var u1 = await p4.evaluate(function () {
    document.getElementById('btn-bag').click();
    var sh = document.getElementById('bag-sheet'), o = { open: sh.open, labels: [].map.call(document.querySelectorAll('#bag-body .bag-plot'), function (b) { return b.getAttribute('aria-label'); }), scene: APP.scene.garden().map(function (g) { return g ? g.water : null; }), saved: JSON.parse(localStorage.getItem('ppolppol_v2')).user.garden };
    var bp = document.querySelectorAll('#bag-body .bag-plot'); if (bp.length < 3) return o;   /* 시트가 못 그려졌으면 여기서 (아래 ok 가 실패로 적는다) */
    bp[2].click(); o.watered = JSON.parse(JSON.stringify(APP.state.user.garden[2]));
    document.querySelectorAll('#bag-body .bag-plot')[0].click();
    o.harvested = APP.state.user.garden[0]; o.dyes = JSON.parse(JSON.stringify(APP.state.user.dyes)); o.toast = document.getElementById('toast').textContent; o.mem1 = APP.state.user.garden[1];
    document.getElementById('bag-close').click(); return o;
  });
  console.log('   모르는 색:', JSON.stringify(u1));
  ok(u1.open && u1.labels[0] === '텃밭 첫째 칸, 꽃, 거두기' && u1.labels[1] === '텃밭 둘째 칸, 빈 칸, 씨앗 심기' && u1.labels[2] === '텃밭 셋째 칸, 새싹, 물 주기' && JSON.stringify(u1.scene) === '[2,null,1]',
    '모르는 색 «teal»: 살림이 열린다 · 꽃 · 새싹으로 보이고 이름도 («' + u1.labels[0] + '») · 바깥 밭에도 [' + u1.scene + '] · 객체가 아닌 칸은 빈 칸');
  ok(u1.watered && u1.watered.color === 'teal' && u1.watered.water === 2 && u1.harvested === null && u1.dyes.teal === 1 && u1.toast === '염료 1개를 얻었어', '물 주기 → 꽃 (색 «' + (u1.watered && u1.watered.color) + '» 그대로) · 거두기 → 염료 teal 1 · 알림 «' + u1.toast + '»');
  await c4.close();

  /* 9. 다른 탭 · 불러오기 · 전체 초기화 뒤 화면이 기록을 따른다 (꼬리표 조개 수 · 점 · 열린 살림 · 열린 재봉틀 시트 · 바깥 밭) */
  var c5 = await ctxOf({ rec: REC(USER({ shells: 10, week: WEEK5 })) }), pa = await tab(c5), pb = await tab(c5);
  await pa.evaluate(function () { document.getElementById('btn-bag').click(); });
  var a0 = await pa.evaluate(function () { var b = document.getElementById('btn-bag'); return { dot: b.classList.contains('has-gift'), chip: document.getElementById('bag-n').textContent, open: document.getElementById('bag-sheet').open }; });
  var b0 = await pb.evaluate(function () {
    document.getElementById('btn-bag').click(); document.querySelectorAll('#bag-body .bag-plot')[0].click(); APP.earnFromPlay({ id: 'x-run-1', score: 0 });
    var c = document.getElementById('week-claim'), had = !!c; if (c) c.click(); document.getElementById('bag-close').click();
    return { had: had, shells: APP.state.user.shells };
  });
  var a1 = await pa.waitForFunction(function (n) {
    var b = document.getElementById('btn-bag'), line = (document.querySelector('#bag-body .bag-line') || {}).textContent || '', g = APP.scene.garden();
    return b.textContent.trim() === '조개 ' + n && !b.classList.contains('has-gift') && /^조개 /.test(line) && line.indexOf('조개 ' + n + ' ') === 0 && !!g[0] && document.getElementById('bag-sheet').open && { chip: b.textContent.trim(), line: line, garden: g.map(function (x) { return x ? x.water : null; }), plot0: document.querySelector('#bag-body .bag-plot').getAttribute('aria-label') };
  }, b0.shells, { timeout: WAIT, polling: 100 }).then(function (h) { return h.jsonValue(); }, function () { return null; });
  if (!a1) console.log('   다른 탭 뒤 A:', JSON.stringify(await pa.evaluate(function () { var b = document.getElementById('btn-bag'); return { chip: b.textContent.trim(), dot: b.classList.contains('has-gift'), line: (document.querySelector('#bag-body .bag-line') || {}).textContent, garden: APP.scene.garden(), saved: APP.state.user.shells }; })));
  ok(a0.dot && a0.chip === '조개 10' && a0.open && b0.had && !!a1 && a1.plot0 === '텃밭 첫째 칸, 씨앗, 물 주기', '다른 탭이 심고 · 조개를 벌고 · 주간 선물을 받으면 이 탭의 꼬리표(«' + (a1 && a1.chip) + '» · 점 꺼짐) · 열린 살림(«' + (a1 && a1.line) + '») · 바깥 밭(' + (a1 && JSON.stringify(a1.garden)) + ')이 따라온다');
  await pa.evaluate(function () { document.getElementById('bag-close').click(); document.getElementById('btn-sew').click(); });
  var b1 = await pb.evaluate(function () { APP.earnFromPlay({ id: 'x-run-2', score: 0 }); return APP.state.user.shells; });
  var a2 = await pa.waitForFunction(function (n) { var sh = document.getElementById('sew-sheet'), l = (document.querySelector('#sew-body .bag-line') || {}).textContent || ''; return sh.open && l === '조개 ' + n && l; }, b1, { timeout: WAIT, polling: 100 }).then(function (h) { return h.jsonValue(); }, function () { return null; });
  if (!a2) console.log('   재봉틀 시트:', JSON.stringify(await pa.evaluate(function () { return { open: document.getElementById('sew-sheet').open, line: (document.querySelector('#sew-body .bag-line') || {}).textContent, shells: APP.state.user.shells }; })));
  ok(!!a2, '열어 둔 재봉틀 시트도 다른 탭의 조개 수를 따라온다 («' + a2 + '» = 조개 ' + b1 + ')');
  await pa.evaluate(function () { document.getElementById('sew-close').click(); });
  await pb.close();
  /* 불러오기: 조개 40 · 다섯 가지 한 주 · 셋째 칸에 꽃 → 꼬리표 · 점 · 바깥 밭 / 살림이 없는 기록 → 조개 0 · 빈 밭 */
  var im1 = await pa.evaluate(function (rec) { var r = APP.importJSON(JSON.stringify(rec)), b = document.getElementById('btn-bag'); return { r: r, chip: b.textContent.trim(), dot: b.classList.contains('has-gift'), hidden: b.hidden, garden: APP.scene.garden().map(function (g) { return g ? g.water : null; }) }; },
    REC(USER({ shells: 40, week: WEEK5, garden: [null, null, { color: 'green', water: 2, wateredDay: '' }] })));
  ok(im1.r && im1.chip === '조개 40' && im1.dot && !im1.hidden && JSON.stringify(im1.garden) === '[null,null,2]', '불러오기 뒤: 꼬리표 «' + im1.chip + '» · 점 ' + im1.dot + ' · 바깥 밭 ' + JSON.stringify(im1.garden));
  var im2 = await pa.evaluate(function (rec) { var r = APP.importJSON(JSON.stringify(rec)), b = document.getElementById('btn-bag'); return { r: r, chip: b.textContent.trim(), dot: b.classList.contains('has-gift'), garden: APP.scene.garden().map(function (g) { return g ? g.water : null; }) }; }, REC(null));
  ok(im2.r && im2.chip === '조개 0' && !im2.dot && JSON.stringify(im2.garden) === '[null,null,null]', '살림이 없는 기록을 불러오면: «' + im2.chip + '» · 점 없음 · 빈 밭');
  /* 전체 초기화: 이름 창 위에 꼬리표가 남지 않고 · 바깥 밭이 빈다 · 새 이름 뒤에도 빈 밭 · 꼬리표는 새 조개 수 */
  await pa.evaluate(function (rec) { APP.importJSON(JSON.stringify(rec)); }, REC(USER({ shells: 40, garden: [{ color: 'red', water: 1, wateredDay: '' }, { color: 'blue', water: 2, wateredDay: '' }, null] })));
  var r0 = await pa.evaluate(function () { document.getElementById('btn-bag').click(); document.querySelectorAll('#bag-body .bag-plot')[2].click(); document.getElementById('bag-close').click(); return APP.scene.garden().map(function (g) { return g ? g.water : null; }); });   /* 셋째 칸에 심어 (gardenAct 가 직접 그린다) 바깥에 세 칸 다 있는 데서 초기화 */
  await pa.evaluate(function () { APP.openSettings(); });
  await resetTwice(pa);
  await pa.waitForSelector('#name-dialog[open]', { timeout: WAIT });
  var r1 = await pa.evaluate(function () { var b = document.getElementById('btn-bag'); return { hidden: b.hidden, garden: APP.scene.garden().map(function (g) { return g ? g.water : null; }) }; });
  await pa.fill('#name-in', '구름'); await pa.click('#name-form button[type=submit]');
  var r2 = await pa.waitForFunction(function () { var b = document.getElementById('btn-bag'); return !b.hidden && APP.state.user && b.textContent.trim() === '조개 ' + APP.state.user.shells && { chip: b.textContent.trim(), garden: APP.scene.garden().map(function (g) { return g ? g.water : null; }), saved: APP.state.user.garden }; }, null, { timeout: WAIT, polling: 100 }).then(function (h) { return h.jsonValue(); }, function () { return null; });
  ok(JSON.stringify(r0) === '[1,2,0]' && r1.hidden && JSON.stringify(r1.garden) === '[null,null,null]', '전체 초기화: 이름 창 위에 꼬리표가 안 보이고 바깥 밭(전 ' + JSON.stringify(r0) + ')이 빈다 (' + JSON.stringify(r1) + ')');
  ok(!!r2 && JSON.stringify(r2.garden) === '[null,null,null]' && JSON.stringify(r2.saved) === '[null,null,null]', '새 이름 뒤: 꼬리표 «' + (r2 && r2.chip) + '» · 바깥 밭도 기록도 빈 밭');
  await c5.close();
  reportErrors(bag, 'X');
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
      ['O', function () { return scenarioFirstColor(browser); }], ['Y', function () { return scenarioSalon(browser); }],   /* 미용실: 첫 실행 몸 색은 글자 O 의 둘째 묶음 (O 의 첫 묶음 = 한 화면 배치 scenarioLayoutOne 은 아래 줄 — SMOKE_ONLY=O 면 둘 다 돈다, 따로 try/catch) · Y = 미용실 */
      ['R', function () { return scenarioRunner(); }], ['S', function () { return scenarioWave7(browser); }], ['J', function () { return scenarioWave8(browser); }], ['U', function () { return scenarioGlyphs(browser); }],
      ['T', function () { return scenarioTapLine(browser); }], ['K', function () { return scenarioBringBack(browser); }], ['O', function () { return scenarioLayoutOne(browser); }],
      ['X', function () { return scenarioGarden(browser); }]];   /* X = 바깥 텃밭 · 살림 다시 그리기 (검증 11-11) */
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
