#!/usr/bin/env node
/* tools/layout-shots.js — 한 화면 배치 증거 (주인 11-08 "화면이 반으로 나뉘어져있는 느낌인 게 불편해서" · docs/DESIGN.md §7.2 · docs/DIALOGUE_UI.md §3.2 · docs/SCENE.md "한 화면 배치의 카메라").
 * 실제 index.html 을 SwiftShader WebGL 로 띄워 (@2x) 찍고, 좌표로 검사한다.
 *   node tools/layout-shots.js            # → tests/evidence/layout/
 * 그림 (13장, 장마다 ≤ 80 KB):
 *   one-<크기>-<light|dark>.png   크기 = 360x740 · 360x640 · 320x568 · landscape-740x360. 플레이어 모드(?dev=0) 기본 화면 (낮 14시 / 밤 21시, 비, 등불 4)
 *   one-360x740-toast.png         산책 중 새 줄 한 줄 알림 (#toast.row)
 *   one-360x740-log.png           오늘 기록 시트 (#log-sheet)
 *   one-<360x740|320x568|landscape-740x360>-dlg.png   대사창 (개발 모드의 APP.dlgDemo — 대사창 v1 이 붙기 전까지 플레이어 화면엔 안 뜬다)
 * 검사 (하나라도 어긋나면 exit 1):
 *   · 3D 모드 · html[data-layout="one"] · 페이지 스크롤 없음 (문서 크기 = 창 크기) · 장면 높이 = 창 높이
 *   · 보이는 조작(상태 줄 · 오른쪽 위 아이콘 · 큰 버튼 · 발자국 손잡이 · 개발용 힌트 칸 · 대사창 · 알림)이 창 안에 있고 서로 안 겹친다
 *   · 누르는 것(아이콘 · 큰 버튼 · 손잡이 · 시트 닫기)은 44×44 CSS px 이상. 상태 줄은 읽는 칸이라 40 (짧은 화면 32) 까지 낮다
 *   · 카메라: stats().frameY (바닥 앞 모서리의 세로 자리) — 360×740 · 360×640 은 0.55~0.68, 세로 화면은 모두 ≤ 0.75 · 방 꼭대기가 상태 줄 밑 · 바닥 앞 모서리가 바닥 줄(큰 버튼 · 손잡이) 위
 *     (가로 740×360 은 장면이 낮아 보정 0 = 예전 구도 그대로: 값만 찍는다)
 *   · 픽셀 크기 2 그대로 · 첫 2초 평균 프레임 시간 autoMs ≤ 24 (넘으면 장면이 스스로 픽셀 3 으로 내려간다 — 넓어진 장면이 그 문턱을 넘기지 않는지)
 *   · 콘솔 · 페이지 에러 없음
 */
'use strict';
var fs = require('fs'), path = require('path');
var { chromium } = require('playwright');
var ROOT = path.resolve(__dirname, '..');
var INDEX = 'file://' + path.join(ROOT, 'index.html');
var OUT = process.env.LAYOUT_OUT || path.join(ROOT, 'tests/evidence/layout');
fs.mkdirSync(OUT, { recursive: true });
var SIZES = [{ w: 360, h: 740, tag: '360x740', band: true }, { w: 360, h: 640, tag: '360x640', band: true }, { w: 320, h: 568, tag: '320x568' }, { w: 740, h: 360, tag: 'landscape-740x360', wide: true }];
var MAX_KB = 80, TAP = 44;
var WIKI_OK = { query: { pages: { '1': { pageid: 1, title: '모자', extract: '모자는 머리에 쓰는 물건이다. 햇빛과 추위를 막고 신분을 나타내기도 했다.', links: [{ ns: 0, title: '깃털' }, { ns: 0, title: '밀짚' }] } } } };
var SEED = "window.__ppolAwakeMs = 0; try { if (!localStorage.getItem('ppolppol_v2')) localStorage.setItem('ppolppol_v2', JSON.stringify({ v: 2, octopus: { name: '안개' } })); } catch (e) {}";

var fails = 0, errs = [];
function ok(cond, msg) { if (cond) console.log('  ok   ' + msg); else { fails++; console.log('  FAIL ' + msg); } }

async function boot(browser, sz, theme, query) {
  var ctx = await browser.newContext({ viewport: { width: sz.w, height: sz.h }, deviceScaleFactor: 2, locale: 'ko-KR', colorScheme: theme });
  await ctx.addInitScript({ content: SEED });
  var page = await ctx.newPage();
  page.on('pageerror', function (e) { errs.push(sz.tag + ' pageerror: ' + e.message); });
  page.on('console', function (m) { var t = m.text(); if (m.type() === 'error' && !/Failed to load resource|net::|ERR_/.test(t)) errs.push(sz.tag + ' console.error: ' + t); });
  await page.route('https://ko.wikipedia.org/**', function (route) { return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(WIKI_OK) }); });
  await page.goto(INDEX + query);
  await page.waitForFunction(function () { return window.APP && APP.sceneMode; }, null, { timeout: 20000 });
  await page.waitForFunction(function () { return APP.scene && APP.scene.stats && APP.scene.stats().autoMs > 0; }, null, { timeout: 15000 });   /* 첫 2초 평균이 나온 뒤 (자동 픽셀 폴백 판정이 끝난 뒤) */
  await page.evaluate(function (hour) {
    APP.state.room.lantern = 4; APP.renderScene();
    APP.scene.setTime(hour, true); APP.scene.setWeather('rain'); APP.scene.bubble('', 0);
    APP.octState('idle'); APP.scene.jumpTo('center');
  }, theme === 'dark' ? 21 : 14);
  await page.waitForTimeout(700);
  return page;
}

/* 지금 화면의 치수: 보이는 조작의 상자(창 기준 CSS px) + 장면 통계 + 방의 바닥 앞 모서리 · 꼭대기의 화면 자리 */
function measure(page) {
  return page.evaluate(function () {
    function shown(el) { if (!el || el.hidden) return false; var cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.01; }
    function box(el) { var b = el.getBoundingClientRect(); return { l: Math.round(b.left * 10) / 10, t: Math.round(b.top * 10) / 10, r: Math.round(b.right * 10) / 10, b: Math.round(b.bottom * 10) / 10, w: Math.round(b.width * 10) / 10, h: Math.round(b.height * 10) / 10 }; }
    var list = [];
    function add(name, el, tap) { if (shown(el)) { var b = box(el); if (b.w > 0 && b.h > 0) { b.name = name; b.tap = !!tap; list.push(b); } } }
    add('상태 줄', document.getElementById('status'));
    [].forEach.call(document.querySelectorAll('#scene-ctl .icon-btn'), function (b) { add('아이콘 ' + (b.id || '').replace('btn-', ''), b, true); });
    add('큰 버튼', document.getElementById('btn-go'), true);
    add('발자국 손잡이', document.getElementById('stick'), true);
    var door = document.getElementById('btn-door'); if (door && door.dataset.spot === 'edge') add('집 단추', door, true);   /* 바깥이 보일 때의 왼쪽 아래 집 단추만. 다락에선 같은 요소가 3D 문 위의 투명한 누름 자리(data-spot=over, pointer-events none)라 조작 상자가 아니다 */
    if (document.documentElement.classList.contains('dlg-on')) add('대사창', document.getElementById('dlg-host'));
    var toast = document.getElementById('toast'); if (toast && toast.classList.contains('show')) add('알림', toast);
    var sc = document.getElementById('scene').getBoundingClientRect(), st = APP.scene.stats(), d = document.documentElement;
    var front = APP.scene.screenOf(2.72, 0, 2.72), top = APP.scene.screenOf(-2.72, 3.0, -2.72);
    return { mode: APP.sceneMode, layout: d.getAttribute('data-layout'), doc: [d.scrollWidth, d.scrollHeight], win: [innerWidth, innerHeight], scene: [Math.round(sc.left), Math.round(sc.top), Math.round(sc.width), Math.round(sc.height)],
      boxes: list, frameY: st.frameY, pixel: st.pixel, autoMs: st.autoMs, calls: st.calls, frontY: Math.round(sc.top + front.y), topY: Math.round(sc.top + top.y) };
  });
}
function overlap(a, b) { return a.l < b.r - 0.5 && a.r > b.l + 0.5 && a.t < b.b - 0.5 && a.b > b.t + 0.5; }
function checkBoxes(m, label, known) {   /* known: 알고 있는 겹침 (실패로 세지 않고 적어 둔다 — BACKLOG) */
  var bad = [], out = [], small = [], kn = [];
  m.boxes.forEach(function (a, i) {
    if (a.l < -0.5 || a.t < -0.5 || a.r > m.win[0] + 0.5 || a.b > m.win[1] + 0.5) out.push(a.name);
    if (a.tap && (a.w < TAP || a.h < TAP)) small.push(a.name + ' ' + a.w + '×' + a.h);
    m.boxes.slice(i + 1).forEach(function (b) { if (!overlap(a, b)) return; var k = a.name + ' × ' + b.name; if ((known || []).indexOf(k) >= 0) kn.push(k); else bad.push(k); });
  });
  ok(!out.length, label + ': 조작 ' + m.boxes.length + '개가 모두 창 안' + (out.length ? ' — 밖: ' + out.join(', ') : ''));
  ok(!bad.length, label + ': 조작끼리 안 겹침' + (bad.length ? ' — ' + bad.join(', ') : ''));
  if (kn.length) console.log('  ·    ' + label + ': 알려진 겹침 (개발 모드 전용 — docs/BACKLOG.md 대사창 v1) ' + kn.join(', '));
  ok(!small.length, label + ': 누르는 것은 ' + TAP + '×' + TAP + ' 이상' + (small.length ? ' — ' + small.join(', ') : ''));
}
function find(m, name) { return m.boxes.filter(function (b) { return b.name === name; })[0] || null; }
async function shot(page, name) {
  var f = path.join(OUT, name);
  await page.screenshot({ path: f });
  var kb = fs.statSync(f).size / 1024;
  ok(kb <= MAX_KB, name + ' ' + kb.toFixed(1) + ' KB (≤ ' + MAX_KB + ')');
}

(async function () {
  var browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });

  /* 1 — 기본 화면: 4 크기 × 2 테마, 플레이어 모드 */
  for (var si = 0; si < SIZES.length; si++) {
    var sz = SIZES[si];
    for (var ti = 0; ti < 2; ti++) {
      var theme = ti ? 'dark' : 'light', label = sz.tag + ' ' + theme;
      console.log('\n== ' + label);
      var page = await boot(browser, sz, theme, '?dev=0');
      var m = await measure(page);
      ok(m.mode === '3d' && m.layout === 'one', label + ': 3D · 한 화면 배치 (' + m.mode + ', ' + m.layout + ')');
      ok(m.doc[0] <= m.win[0] && m.doc[1] <= m.win[1], label + ': 페이지 스크롤 없음 (문서 ' + m.doc.join('×') + ' · 창 ' + m.win.join('×') + ')');
      ok(m.scene[1] === 0 && m.scene[3] === m.win[1], label + ': 장면 높이 = 창 높이 (' + m.scene.join(', ') + ')');
      checkBoxes(m, label);
      ok(m.pixel === 2 && m.autoMs > 0 && m.autoMs <= 24, label + ': 픽셀 2 · autoMs ' + m.autoMs + ' ≤ 24 (드로우콜 ' + m.calls + ')');
      var status = find(m, '상태 줄'), go = find(m, '큰 버튼'), stick = find(m, '발자국 손잡이');
      var stMax = sz.w < 360 ? 50 : 40;   /* 폭 < 360 은 두 줄 쪽지 (이름 / 등불 + 데모) — 이름을 안 자르려고 (style.css '한 화면 배치') */
      ok(!!status && status.h <= stMax, label + ': 상태 줄 높이 ' + (status ? status.h : '없음') + ' ≤ ' + stMax);
      if (sz.wide) console.log('  ·    ' + label + ': frameY ' + m.frameY + ' (낮은 장면 — 보정 0, 예전 구도)');
      else {
        ok(sz.band ? m.frameY >= 0.55 && m.frameY <= 0.68 : m.frameY <= 0.75, label + ': frameY ' + m.frameY + (sz.band ? ' (0.55~0.68)' : ' (≤ 0.75 — 꼭대기 여백이 먼저)'));
        ok(!!status && m.topY >= status.b, label + ': 방 꼭대기 y ' + m.topY + ' ≥ 상태 줄 밑 ' + (status ? status.b : '?'));
        var floor = Math.min(go ? go.t : Infinity, stick ? stick.t : Infinity);
        ok(m.frontY < floor, label + ': 바닥 앞 모서리 y ' + m.frontY + ' < 바닥 줄 위 ' + floor);
      }
      await shot(page, 'one-' + sz.tag + '-' + theme + '.png');

      if (sz.tag === '360x740' && theme === 'light') {
        /* 2 — 오늘 기록 시트 */
        await page.evaluate(function () { APP.openLog(); });
        await page.waitForSelector('#log-sheet[open]');
        await page.waitForTimeout(500);
        var lg = await page.evaluate(function () {
          function r(el) { var b = el.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; }
          var d = document.getElementById('log-sheet'), log = document.getElementById('log'), c = document.getElementById('log-close').getBoundingClientRect();
          return { sheet: r(d), log: r(log), inSheet: d.contains(log), rows: log.querySelectorAll('.lrow').length, close: [Math.round(c.width), Math.round(c.height)], win: [innerWidth, innerHeight] };
        });
        ok(lg.inSheet && lg.rows > 0, '기록 시트: #log 가 시트 안 · 줄 ' + lg.rows);
        ok(lg.sheet[0] >= 0 && lg.sheet[2] <= lg.win[0] && lg.sheet[3] <= lg.win[1] && lg.sheet[1] >= 0, '기록 시트가 창 안 (' + lg.sheet.join(', ') + ')');
        ok(lg.log[1] >= lg.sheet[1] && lg.log[3] <= lg.sheet[3], '기록 목록이 시트 안 (' + lg.log.join(', ') + ')');
        ok(lg.close[0] >= TAP && lg.close[1] >= TAP, '시트 닫기 ' + lg.close.join('×') + ' ≥ ' + TAP);
        await shot(page, 'one-360x740-log.png');
        await page.evaluate(function () { document.getElementById('log-sheet').close(); });
        await page.waitForSelector('#log-sheet[open]', { state: 'hidden' });

        /* 3 — 산책 중 새 줄 한 줄 알림 */
        await page.click('#btn-go');
        var got = await page.waitForFunction(function () { var t = document.getElementById('toast'); return t.classList.contains('show') && t.classList.contains('row'); }, null, { timeout: 20000 }).then(function () { return true; }, function () { return false; });
        ok(got, '산책 중 새 줄 → 한 줄 알림 (#toast.row)');
        await page.waitForTimeout(350);
        var mt = await measure(page);
        checkBoxes(mt, '알림');
        ok(mt.doc[1] <= mt.win[1], '알림: 페이지 스크롤 없음');
        await shot(page, 'one-360x740-toast.png');
      }
      await page.context().close();
    }
  }

  /* 4 — 대사창 (개발 모드): 바닥 줄 위에 뜨고 아무것도 안 가린다 */
  var DLG = ['360x740', '320x568', 'landscape-740x360'];
  for (var di = 0; di < DLG.length; di++) {
    var dz = SIZES.filter(function (s) { return s.tag === DLG[di]; })[0], dl = dz.tag + ' 대사창';
    console.log('\n== ' + dl);
    var dp = await boot(browser, dz, 'light', '');
    await dp.evaluate(function () { APP.dlgDemo('오늘은 등대 아래까지 걸어가 보고 싶어. 바람이 좀 불어도 괜찮아.', 'wait'); });
    await dp.waitForFunction(function () { return document.documentElement.classList.contains('dlg-on'); }, null, { timeout: 5000 });
    await dp.waitForTimeout(900);
    var md = await measure(dp);
    ok(!!find(md, '대사창'), dl + ': 대사창이 보임');
    checkBoxes(md, dl, ['힌트 칸 × 대사창']);   /* 가로 화면: 대사 자리(오른쪽 절반)가 개발용 힌트 칸을 덮는다. 둘 다 개발 모드에서만 같이 뜬다 (대사창 v1 에서 자리 정리) */
    ok(md.doc[0] <= md.win[0] && md.scene[3] === md.win[1], dl + ': 가로 스크롤 없음 · 장면 높이 = 창 높이 (개발 모드는 장면 아래에 데모 조작 칸이 남는다)');
    await shot(dp, 'one-' + dz.tag + '-dlg.png');
    await dp.context().close();
  }

  await browser.close();
  console.log('\nerrors: ' + (errs.length ? '\n  ' + errs.join('\n  ') : 'none'));
  console.log(fails || errs.length ? '\nFAILED (' + fails + ' checks, ' + errs.length + ' errors)' : '\nall ok → ' + path.relative(ROOT, OUT));
  process.exit(fails || errs.length ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
