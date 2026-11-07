#!/usr/bin/env node
/* tools/test-scene-perf.js — 장면 성능·탭 판정 회귀 테스트 (js/scene3d.js T1–T4, docs/research/a11y-and-mobile-perf.md 1·2 · furniture-tap-events.md 1·2 · polish-from-starred-repos.md 4)
 *   node tools/test-scene-perf.js        → "N passed, M failed", 실패 있으면 exit 1
 * 앱(app.js) 없이 독립 하네스 (walk-strip.js 와 같은 방식: three + palettes + scene3d 만). requestAnimationFrame 을 손으로 돌린다 →
 * 콜백 시각(ts)을 정확히 16.667 ms(60 Hz) / 8.333 ms(120 Hz) 씩 넣어 프레임 상한·dt 를 결정적으로 잰다. 장면 아래 긴 여백 = 스크롤로 화면 밖 만들기용.
 *   T1 가만히 30fps 인데 비 스텝은 실시간 12/s (예전 홀수 콜백 건너뛰기는 dt 째 버려서 반속도) · 120 Hz 에서도 움직일 땐 60 렌더/s, 가만히 30
 *   T2 pickAt: 포스터 중앙 → 포스터 · 외딴 기념품 12 px 밖 → 기념품 · 빈 바닥 → null · 몸 → 문어 · 히트 구 여백 → 문어 · 두 표적 사이(모호) → null · 바깥 = 문어만 · away = 없음
 *   T3 부팅 셰이더 예열: 첫 바깥 전환에서 프로그램 수가 늘지 않음
 *   T4 화면 밖: 렌더 0 · 비 스텝·출발 의식은 계속 진행 · 돌아오면 다시 렌더 · debugStep 은 화면 밖에서도 정확한 dt 로 렌더
 */
'use strict';
var fs = require('fs'), path = require('path'), os = require('os');
var { chromium } = require('playwright');
var ROOT = path.resolve(__dirname, '..');
var W = 360, H = 326;

var fails = 0, passes = 0;
function ok(cond, msg) { if (cond) { passes++; console.log('  ok   ' + msg); } else { fails++; console.error('  FAIL ' + msg); } }

function harness() {
  var u = function (p) { return 'file://' + path.join(ROOT, p); };
  /* 손 rAF: 장면 스크립트보다 먼저. tick(ts) = 지금 대기 중인 콜백을 한 번씩 (브라우저 한 프레임처럼) */
  var raf = 'window.__raf=(function(){var q=new Map(),id=0;window.requestAnimationFrame=function(cb){id++;q.set(id,cb);return id;};window.cancelAnimationFrame=function(h){q.delete(h);};' +
    'var R={ts:1000,tick:function(ts){var cbs=Array.from(q.values());q.clear();cbs.forEach(function(cb){cb(ts);});return cbs.length;},' +
    'run:function(n,dtMs){var c=0;for(var i=0;i<n;i++){R.ts+=dtMs;c+=R.tick(R.ts);}return c;},pending:function(){return q.size;}};return R;})();';
  var html = '<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#1b1522}#scene{position:relative;width:' + W + 'px;height:' + H + 'px;overflow:hidden;background:#1b1522;display:flex;align-items:center;justify-content:center}#scene canvas{display:block;image-rendering:pixelated}#below{height:2400px}</style></head><body><div id="scene"></div><div id="below"></div>' +
    '<script>' + raf + '</script><script src="' + u('vendor/three.min.js') + '"></script><script src="' + u('js/palettes.js') + '"></script><script src="' + u('js/scene3d.js') + '"></script></body></html>';
  var f = path.join(os.tmpdir(), 'ppol-scene-perf-' + process.pid + '.html'); fs.writeFileSync(f, html); return f;
}

(async function () {
  var file = harness();
  var browser = await chromium.launch();
  var ctx = await browser.newContext({ viewport: { width: W, height: 740 }, deviceScaleFactor: 1, locale: 'ko-KR', colorScheme: 'light', reducedMotion: 'no-preference' });
  var page = await ctx.newPage(), errs = [];
  page.on('pageerror', function (e) { errs.push('pageerror: ' + e.message); });
  page.on('console', function (m) { var t = m.text(); if (m.type() === 'error' && !/Failed to load resource|net::|ERR_/.test(t)) errs.push('console.error: ' + t); });
  try {
    await page.goto('file://' + file);
    var init = await page.evaluate(function () {
      if (!window.SCENE3D || !SCENE3D.supported()) return 'no webgl';
      window.SC = SCENE3D.init(document.getElementById('scene'), { lantern: 4, items: ['moss', 'crate', 'candle', 'board', 'shelf'], weather: 'rain', hour: 14, season: 'autumn', look: { pixelSize: 3 } });
      return 'ok';
    });
    if (init !== 'ok') { ok(false, '3D 하네스: ' + init); throw new Error('no scene'); }
    var run = function (n, dtMs) { return page.evaluate(function (a) { return __raf.run(a[0], a[1]); }, [n, dtMs]); };
    var snap = function () { return page.evaluate(function () { var m = SC.motion(), s = SC.stats(); return { rain: m.rainStep, draws: s.draws, offscreen: s.offscreen, moving: m.gait.moving, place: m.place, ceremony: m.ceremony, progs: SC.renderer.info.programs.length }; }); };
    var F60 = 1000 / 60, F120 = 1000 / 120;

    /* ── T3 셰이더 예열: 부팅(첫 프레임들) 프로그램 수 = 첫 바깥 전환 뒤 프로그램 수 ── */
    await run(90, F60);   /* 1.5 s: 첫 프레임 · 초상 워밍업(2번째 프레임) · 디더 쉼 */
    var p0 = (await snap()).progs;
    await page.evaluate(function () { SC.setPlace('exterior', { instant: true }); });
    await run(30, F60);
    var p1 = (await snap()).progs;
    ok(p0 > 0 && p1 === p0, 'T3 첫 바깥 전환에서 새 셰이더 프로그램 없음 (부팅 ' + p0 + ' → 바깥 ' + p1 + ')');
    await page.evaluate(function () { SC.setPlace('attic', { instant: true }); SC.setOctState('idle'); SC.jumpTo('center'); });
    await run(90, F60);   /* 정착 · 디더 쉼 > 0.3 s → 가만히 */

    /* ── T1 프레임 상한 = 시간 기준, 건너뛴 콜백의 시간은 다음 그리는 프레임 dt 로 ── */
    var a = await snap(); var cb = await run(120, F60); var b = await snap();
    ok(cb === 120, 'T1 손 rAF: 콜백 120개가 모두 장면 루프 (' + cb + ')');
    ok(Math.abs((b.rain - a.rain) - 24) <= 1, 'T1 가만히 60 Hz 콜백 120개(2 s): 비 스텝 ' + (b.rain - a.rain) + ' ≈ 24 (12/s 실시간, 예전 반속도 12)');
    ok(Math.abs((b.draws - a.draws) - 60) <= 1, 'T1 가만히 60 Hz: 렌더 ' + (b.draws - a.draws) + ' ≈ 60 (30 fps)');
    a = await snap(); await run(120, F120); b = await snap();
    ok(Math.abs((b.draws - a.draws) - 30) <= 1 && Math.abs((b.rain - a.rain) - 12) <= 1, 'T1 가만히 120 Hz 콜백 120개(1 s): 렌더 ' + (b.draws - a.draws) + ' ≈ 30 · 비 ' + (b.rain - a.rain) + ' ≈ 12');
    await page.evaluate(function () { SC.setOctState('walk'); SC.jumpTo('window'); SC.moveTo('door'); });
    await run(12, F60);   /* 예비 동작 지나 걷는 중 */
    a = await snap(); await run(120, F120); b = await snap();
    ok(a.moving && b.moving, 'T1 (측정 구간 내내 걷는 중)');
    ok(Math.abs((b.draws - a.draws) - 60) <= 1, 'T1 움직일 때 120 Hz 콜백 120개(1 s): 렌더 ' + (b.draws - a.draws) + ' ≈ 60 (120 Hz 폰도 60 fps 상한)');
    a = await snap(); await run(60, F60); b = await snap();
    ok(b.draws - a.draws === 60, 'T1 움직일 때 60 Hz: 콜백마다 렌더 (' + (b.draws - a.draws) + '/60)');
    await page.evaluate(function () { SC.setOctState('idle'); SC.jumpTo('center'); });
    await run(30, F60);

    /* ── T2 탭 판정 ── */
    await page.evaluate(function () {
      SC.setPosters([{ id: 'p1', svg: '' }, { id: 'p2', svg: '' }, { id: 'p3', svg: '' }]); SC.setSouvenirs([{ id: 'sv1' }]);
    });
    await run(4, F60);
    var T = await page.evaluate(function () { return SC.targets(); });
    var cv = await page.evaluate(function () { return document.querySelector('#scene canvas').getBoundingClientRect().toJSON(); });
    function tg(kind, id) { return T.filter(function (t) { return t.kind === kind && (id == null || t.id === id); })[0]; }
    function rectDist(r, x, y) { return Math.hypot(Math.max(r.l - x, 0, x - r.r), Math.max(r.t - y, 0, y - r.b)); }
    var pickAt = function (x, y) { return page.evaluate(function (q) { return SC.pickAt(q[0], q[1]); }, [x, y]); };
    var kinds = T.map(function (t) { return t.kind + ':' + t.id; }).join(' ');
    ok(!!(tg('oct') && tg('window') && tg('poster', 'p2') && tg('souvenir', 'sv1')), 'T2 targets(): ' + kinds);
    var po = tg('poster', 'p2'), r1 = po && await pickAt(po.x, po.y);
    ok(!!r1 && r1.kind === 'poster' && r1.id === 'p2', 'T2 포스터 중앙 → poster p2 (' + JSON.stringify(r1) + ')');
    /* 외딴 기념품 12 px 밖: 다른 표적 사각형과 20 px 넘게 떨어진 쪽을 고른다 (레이는 아무것도 못 맞힘 → 화면 공간 보정) */
    var sv = tg('souvenir', 'sv1'), cand = null;
    if (sv) {
      var R = sv.rect, cy = (R.t + R.b) / 2, cx = (R.l + R.r) / 2;
      [[R.l - 12, cy], [R.r + 12, cy], [cx, R.t - 12], [cx, R.b + 12]].some(function (q) {
        var inCanvas = q[0] > cv.left + 2 && q[0] < cv.right - 2 && q[1] > cv.top + 2 && q[1] < cv.bottom - 2;
        var clear = T.every(function (t) { return t === sv || rectDist(t.rect, q[0], q[1]) > 24; });
        if (inCanvas && clear) { cand = q; return true; } return false;
      });
    }
    var r2 = cand && await pickAt(cand[0], cand[1]);
    ok(!!cand && !!r2 && r2.kind === 'souvenir' && r2.id === 'sv1', 'T2 외딴 기념품 12 px 밖 ' + JSON.stringify(cand && cand.map(Math.round)) + ' → souvenir (' + JSON.stringify(r2) + ')');
    var far = cand && [cand[0] + (cand[0] - (sv.rect.l + sv.rect.r) / 2 > 0 ? 8 : cand[0] - (sv.rect.l + sv.rect.r) / 2 < 0 ? -8 : 0), cand[1] + (cand[1] - (sv.rect.t + sv.rect.b) / 2 > 0 ? 8 : cand[1] - (sv.rect.t + sv.rect.b) / 2 < 0 ? -8 : 0)];
    var r2b = far && await pickAt(far[0], far[1]);
    ok(!!far && r2b === null, 'T2 같은 쪽 20 px 밖 (> 16 px) → null (' + JSON.stringify(r2b) + ')');
    /* 빈 바닥: 캔버스 아래쪽 절반에서 모든 표적과 가장 먼 점 */
    var best = null, bd = -1;
    for (var gy = cv.top + cv.height * 0.6; gy < cv.bottom - 6; gy += 6) for (var gx = cv.left + 6; gx < cv.right - 6; gx += 6) {
      var md = Math.min.apply(null, T.map(function (t) { return rectDist(t.rect, gx, gy); }));
      if (md > bd) { bd = md; best = [gx, gy]; }
    }
    var r3 = best && await pickAt(best[0], best[1]);
    ok(!!best && bd > 30 && r3 === null, 'T2 빈 바닥 ' + JSON.stringify(best && best.map(Math.round)) + ' (표적까지 ' + Math.round(bd) + ' px) → null (' + JSON.stringify(r3) + ')');
    var oc = tg('oct'), r4 = oc && await pickAt(oc.x, oc.y);
    ok(!!r4 && r4.kind === 'oct', 'T2 문어 몸 → oct (' + JSON.stringify(r4) + ')');
    /* 모호: 이웃 포스터 둘 사이 틈 (둘 다 16 px 안, 거리 차 < 4 px) → null */
    var pa = tg('poster', 'p1'), pb = tg('poster', 'p2');
    var mid = pa && pb && [(pa.rect.r + pb.rect.l) / 2, (Math.max(pa.rect.t, pb.rect.t) + Math.min(pa.rect.b, pb.rect.b)) / 2];
    var dd = mid && [rectDist(pa.rect, mid[0], mid[1]), rectDist(pb.rect, mid[0], mid[1])];
    var r5 = mid && await pickAt(mid[0], mid[1]);
    ok(!!mid && Math.abs(dd[0] - dd[1]) < 4 && Math.max(dd[0], dd[1]) <= 16 && (r5 === null || r5.kind === 'poster'), 'T2 포스터 p1·p2 사이 ' + JSON.stringify(mid && mid.map(Math.round)) + ' (거리 ' + (dd ? dd.map(function (d) { return d.toFixed(1); }).join('/') : '?') + ') → ' + JSON.stringify(r5) + ' (빗나가면 null, 레이가 맞으면 그 포스터)');
    /* ② 히트 구 여백: 몸 메시는 빗나가고 히트 구(r 0.67 m)만 맞는 점 → 그래도 문어 (작은 몸 대신 넉넉한 탭). 기본 카메라에선 히트 구가 포스터·기념품과 겹치지 않는다 (보드·창 앵커, 줌 0) */
    var halo = await page.evaluate(function () {
      var hitM = null, body = []; SC.scene.traverse(function (o) { if (o.isMesh && o.userData.kind === 'oct') hitM = o; });
      hitM.parent.traverseVisible(function (o) { if (o.isMesh && o !== hitM && o.material && o.material.visible !== false) body.push(o); });
      var r = document.querySelector('#scene canvas').getBoundingClientRect(), ray = new THREE.Raycaster(), v = new THREE.Vector2(), n = 0, good = 0, bad = null;
      for (var y = r.top + 1; y < r.bottom; y += 3) for (var x = r.left + 1; x < r.right; x += 3) {
        v.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1); ray.setFromCamera(v, SC.camera);
        if (!ray.intersectObject(hitM, false).length || ray.intersectObjects(body, false).length) continue;
        n++; var p = SC.pickAt(x, y); if (p && p.kind === 'oct') good++; else if (!bad) bad = { x: x, y: y, p: p };
      }
      return { n: n, good: good, bad: bad };
    });
    ok(halo.n > 0 && halo.good === halo.n, 'T2 히트 구 여백(몸 밖) → oct: ' + halo.good + '/' + halo.n + ' 점' + (halo.bad ? ' 첫 예외 ' + JSON.stringify(halo.bad) : ''));
    await page.evaluate(function () { SC.setPlace('exterior', { instant: true }); });
    await run(4, F60);
    var ext = await page.evaluate(function (q) { var o = SC.targets().filter(function (t) { return t.kind === 'oct'; })[0]; return { poster: SC.pickAt(q[0], q[1]), oct: o ? SC.pickAt(o.x, o.y) : 'no-target', kinds: SC.targets().map(function (t) { return t.kind; }) }; }, [po.x, po.y]);
    ok((ext.poster === null || ext.poster.kind === 'oct') && ext.oct && ext.oct.kind === 'oct' && ext.kinds.join() === 'oct', 'T2 바깥: 문어만 표적 (포스터 자리 ' + JSON.stringify(ext.poster) + ', 문어 ' + JSON.stringify(ext.oct) + ')');
    await page.evaluate(function () { SC.setOctState('away'); });
    var away = await page.evaluate(function () { var o = SC.motion().gait.at, s = SC.screenOf(o[0], o[1] + 0.3, o[2]), r = document.getElementById('scene').getBoundingClientRect(); return { p: SC.pickAt(r.left + s.x, r.top + s.y), n: SC.targets().length }; });
    ok(away.p === null && away.n === 0, 'T2 바깥 기웃 중(away): 문어 탭 없음 (' + JSON.stringify(away) + ')');
    await page.evaluate(function () { SC.setPlace('attic', { instant: true }); SC.setOctState('idle'); SC.jumpTo('center'); });
    await run(60, F60);

    /* ── T4 화면 밖: 렌더 패스만 건너뛰고 시뮬레이션은 계속 ── */
    await page.evaluate(function () { window.scrollTo(0, 2000); });
    var offOk = await page.waitForFunction(function () { return SC.stats().offscreen === true; }, null, { polling: 50, timeout: 5000 }).then(function () { return true; }, function () { return false; });
    ok(offOk, 'T4 스크롤로 장면이 안 보이면 stats().offscreen = true');
    a = await snap(); await run(120, F60); b = await snap();
    ok(b.draws === a.draws, 'T4 화면 밖 콜백 120개: 렌더 ' + (b.draws - a.draws) + ' = 0');
    ok(Math.abs((b.rain - a.rain) - 24) <= 1, 'T4 화면 밖에도 비 스텝 진행 ' + (b.rain - a.rain) + ' ≈ 24');
    await page.evaluate(function () { window.__cer = 0; SC.departCeremony(function () { window.__cer++; }); });
    var cerT = 0, done = false;
    for (var k = 0; k < 40 && !done; k++) { await run(150, F60); cerT += 2.5; done = await page.evaluate(function () { return window.__cer === 1 && SC.ceremony() === ''; }); }
    var c = await snap();
    ok(done && c.place === 'exterior', 'T4 화면 밖에서 출발 의식이 끝까지 진행 (≤ ' + cerT + ' s, onDone ' + done + ', 장소 ' + c.place + ')');
    ok(c.draws === a.draws, 'T4 의식 내내 렌더 0 (' + (c.draws - a.draws) + ')');
    var d0 = c.draws;
    await page.evaluate(function () { SC.debugStep(1 / 12); SC.debugStep(1 / 12); SC.debugStep(1 / 12); });
    var dbg = await snap();
    ok(dbg.draws - d0 === 3, 'T4 debugStep 은 화면 밖에서도 정확한 dt 로 렌더 (' + (dbg.draws - d0) + '/3)');
    await page.evaluate(function () { SC.resume(); SC.returnCeremony(); window.scrollTo(0, 0); });
    var onOk = await page.waitForFunction(function () { return SC.stats().offscreen === false; }, null, { polling: 50, timeout: 5000 }).then(function () { return true; }, function () { return false; });
    a = await snap(); await run(60, F60); b = await snap();
    ok(onOk && b.draws - a.draws >= 25, 'T4 다시 보이면 렌더 재개 (콜백 60개에 ' + (b.draws - a.draws) + ')');
    var g = await page.evaluate(function () { return { pending: __raf.pending() }; });
    ok(g.pending === 1, 'T4 루프 하나만 대기 (' + g.pending + ')');
    await page.evaluate(function () { SC.destroy(); });
    ok(await page.evaluate(function () { return __raf.pending(); }) === 0, 'destroy: 루프 멈춤');
  } catch (e) {
    ok(false, '예외: ' + (e && e.stack || e));
  }
  ok(errs.length === 0, '콘솔/페이지 에러 없음' + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));
  await browser.close();
  try { fs.unlinkSync(file); } catch (e) { /* noop */ }
  console.log('\n' + passes + ' passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
})();
