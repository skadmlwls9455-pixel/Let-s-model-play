#!/usr/bin/env node
/* tools/test-scene-perf.js — 장면 성능·탭 판정 회귀 테스트 (js/scene3d.js T1–T4, docs/research/a11y-and-mobile-perf.md 1·2 · furniture-tap-events.md 1·2 · polish-from-starred-repos.md 4)
 *   node tools/test-scene-perf.js        → "N passed, M failed", 실패 있으면 exit 1
 * 앱(app.js) 없이 독립 하네스 (walk-strip.js 와 같은 방식: three + palettes + scene3d 만). requestAnimationFrame 을 손으로 돌린다 →
 * 콜백 시각(ts)을 정확히 16.667 ms(60 Hz) / 8.333 ms(120 Hz) 씩 넣어 프레임 상한·dt 를 결정적으로 잰다. 장면 아래 긴 여백 = 스크롤로 화면 밖 만들기용.
 *   T1 가만히 30fps 인데 비 스텝은 실시간 12/s (예전 홀수 콜백 건너뛰기는 dt 째 버려서 반속도) · 120 Hz 에서도 움직일 땐 60 렌더/s, 가만히 30
 *   T2 pickAt: 포스터 중앙 → 포스터 · 외딴 기념품 12 px 밖 → 기념품 · 빈 바닥 → null · 몸 → 문어 · 히트 구 여백 → 문어 · 두 표적 사이(모호) → null · 바깥 = 문어만 · away = 없음
 *   T3 부팅 셰이더 예열: 첫 바깥 전환에서 프로그램 수가 늘지 않음
 *   T4 화면 밖: 렌더 0 · 비 스텝·출발 의식은 계속 진행 · 돌아오면 다시 렌더 · debugStep 은 화면 밖에서도 정확한 dt 로 렌더
 *   T5 놀이방 (8물결): 지연 생성 · 문 4프레임 + 가로 전환(위아래 0 · 한 프레임 한 장소) · 드로우콜 ≤ 60 · 두 왕복 뒤 셰이더 프로그램 그대로 · 놀이방에 있는 동안 의식이 화면을 안 바꿈 · 누르는 곳 · 모션 감소 컷 · 톡은 캔버스가 받아 문 · 오락기 단추로 (pickAt 'spot') · 2× 확대에도 단추는 보이는 문 조각 위
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

    /* ── T5 놀이방 (8물결): 지연 생성 · 문 4프레임 + 가로 전환(위아래 0, 한 프레임 한 장소) · 드로우콜 ≤ 60 · 셰이더 프로그램 그대로 · 이야기 장소 붙잡기 · 누르는 곳 · 모션 감소 ── */
    await page.evaluate(function () {
      ['atticPlay', 'playAttic', 'machine'].forEach(function (id) { var bt = document.createElement('button'); bt.id = 'hs-' + id; bt.style.cssText = 'position:absolute;right:0;bottom:0;width:44px;height:44px;opacity:0;z-index:10'; document.getElementById('scene').appendChild(bt); });
      SC.hotspots({ atticPlay: document.getElementById('hs-atticPlay'), playAttic: document.getElementById('hs-playAttic'), machine: document.getElementById('hs-machine') });
      window.__frames = function (n) {   /* 손 rAF 한 프레임씩 + 그 프레임의 장소·미끄럼·문 상태 */
        var out = [];
        for (var i = 0; i < n; i++) {
          __raf.run(1, 1000 / 60); var m = SC.motion();
          var vis = ['attic', 'exterior', 'play'].filter(function (nm) { var g = SC.scene.getObjectByName(nm); return g && g.visible; });
          out.push({ v: m.view, sy: m.slideY, su: m.slideUpPx, sx: m.slidePx, nvis: vis.length, da: m.doorAttic, dp: m.doorPlay, dq: m.dq });
        }
        return out;
      };
      window.__hs = function () { var o = {}; ['atticPlay', 'playAttic', 'machine'].forEach(function (id) { var e = document.getElementById('hs-' + id); o[id] = e.hidden ? null : { l: e.offsetLeft, t: e.offsetTop, w: e.offsetWidth, h: e.offsetHeight, spot: e.dataset.spot }; }); return o; };
    });
    var t5 = await page.evaluate(function () { var s = SC.stats(); return { built: s.playBuilt, view: SC.view(), room: SC.room(), hs: __hs(), spot: SC.spotRect('atticPlay') }; });
    ok(t5.built === false && t5.view === 'attic' && t5.room === null, 'T5 놀이방은 처음 들어갈 때까지 안 만든다 (시작 비용 0): built ' + t5.built + ' · view ' + t5.view);
    var sceneBox = await page.evaluate(function () { var r = document.getElementById('scene'); return { w: r.clientWidth, h: r.clientHeight }; });
    var inBox = function (q) { return !!q && q.w >= 44 && q.h >= 44 && q.l >= 0 && q.t >= 0 && q.l + q.w <= sceneBox.w && q.t + q.h <= sceneBox.h; };
    ok(inBox(t5.hs.atticPlay) && t5.hs.atticPlay.spot === 'over' && !t5.hs.playAttic && !t5.hs.machine, 'T5 다락: 다락 문 단추만 3D 문 위 (' + JSON.stringify(t5.hs.atticPlay) + ', 장면 ' + sceneBox.w + '×' + sceneBox.h + ')');
    /* 톡은 캔버스가 받아 그린 순서대로 단추를 누른다 (단추는 그림 위에서 pointer-events: none): 문 가운데 → 'spot' atticPlay */
    var dpk = await page.evaluate(function () { var r = SC.spotRect('atticPlay'); return r && r.client ? SC.pickAt(r.client.x + r.client.w / 2, r.client.y + r.client.h * 0.45) : 'no-rect'; });
    ok(dpk && dpk.kind === 'spot' && dpk.id === 'atticPlay', 'T5 다락 문 그림을 톡 → 문 단추 (pickAt ' + JSON.stringify(dpk) + ')');
    /* 확대(2×): 단추는 화면에 보이는 문 조각 위에만 (예전엔 문 전체 높이를 장면 안으로 옮겨 문 위 바닥까지 덮었다) */
    var zc = await page.evaluate(function () {
      SC.zoomStep(6); __raf.run(6, 1000 / 60);
      var r = SC.spotRect('atticPlay'), W = document.getElementById('scene').clientWidth, H = document.getElementById('scene').clientHeight;
      var out = { r: r && [r.x, r.y, r.w, r.h], art: r && r.art, W: W, H: H };
      if (r && r.mode === 'over') { var a = r.art, vl = Math.max(0, a.l), vt = Math.max(0, a.t), vr = Math.min(W, a.r), vb = Math.min(H, a.b);
        out.ok = r.y >= Math.min(vt, vb - 44) - 1 && r.y + r.h <= Math.max(vb, vt + 44) + 1 && r.x >= Math.min(vl, vr - 44) - 1 && r.x + r.w <= Math.max(vr, vl + 44) + 1; } else out.ok = !r;
      SC.zoomStep(0); __raf.run(6, 1000 / 60); return out;
    });
    ok(zc.ok, 'T5 2× 확대: 다락 문 단추는 보이는 문 조각 위 (44 넓힘만) ' + JSON.stringify(zc));
    await page.evaluate(function () { window.__ev = []; window.__res = null; SC.goRoom('play', { onDoor: function (e) { __ev.push(e.act + ':' + e.room + ':' + e.door + '@' + SC.view()); } }).then(function (r) { __res = r; }); });
    var fr = await page.evaluate(function () { return __frames(90); });
    var ev5 = await page.evaluate(function () { return { ev: __ev, res: __res, hs: __hs() }; });
    var doorSeq = fr.map(function (f) { return f.da; }).filter(function (d, i, a) { return i === 0 || d !== a[i - 1]; }).join('');
    var closeSeq = fr.map(function (f) { return f.dp; }).filter(function (d, i, a) { return i === 0 || d !== a[i - 1]; }).join('');
    var sx = fr.map(function (f) { return f.sx; });
    ok(doorSeq.indexOf('1234') === 0 && closeSeq.indexOf('43210') >= 0, 'T5 문짝 4프레임 열림 (다락 ' + doorSeq + ') → 들어온 문 4프레임 닫힘 (놀이방 ' + closeSeq + ')');
    ok(fr.every(function (f) { return f.sy === 0 && f.su === 0 && f.nvis === 1; }), 'T5 가로 전환: 위아래 움직임 0 · 한 프레임에 한 장소만 (' + fr.filter(function (f) { return f.sy !== 0 || f.su !== 0 || f.nvis !== 1; }).length + ' 프레임 어긋남)');
    ok(Math.min.apply(null, sx) < -20 && Math.max.apply(null, sx) > 20 && sx.every(function (v) { return v === Math.round(v); }), 'T5 다락은 왼쪽으로 나가고 놀이방은 오른쪽에서 들어옴, 정수 아트px (최소 ' + Math.min.apply(null, sx) + ' · 최대 ' + Math.max.apply(null, sx) + ')');
    ok(JSON.stringify(ev5.ev) === JSON.stringify(['open:play:atticPlay@attic', 'close:play:playAttic@play']) && ev5.res && ev5.res.ok && ev5.res.view === 'play', 'T5 문 알림 열림 1 · 닫힘 1 → Promise ' + JSON.stringify(ev5.ev) + ' ' + JSON.stringify(ev5.res));
    await run(10, F60);
    var pl = await page.evaluate(function () { var s = SC.stats(), c = document.getElementById('scene').getBoundingClientRect(); return { calls: s.calls, callsPlay: s.callsPlay, place: SC.place(), view: SC.view(), progs: SC.renderer.info.programs.length, tg: SC.targets().length, pick: (function () { var r = SC.spotRect('machine'), d = SC.spotRect('playAttic'); return { floor: SC.pickAt(c.left + c.width / 2, c.top + c.height * 0.82), machine: r && SC.pickAt(r.client.x + r.client.w / 2, r.client.y + r.client.h / 2), door: d && SC.pickAt(d.client.x + d.client.w / 2, d.client.y + d.client.h / 2) }; })(), osp: SC.octScreenPos(), hs: __hs() }; });
    ok(pl.view === 'play' && pl.place === 'attic', 'T5 놀이방: view play · 이야기 장소(place)는 attic 그대로 (' + pl.view + '/' + pl.place + ')');
    ok(pl.calls <= 60 && pl.callsPlay > 0 && pl.callsPlay <= 60, 'T5 놀이방만 보일 때 드로우콜 ' + pl.calls + ' ≤ 60 (callsPlay ' + pl.callsPlay + ')');
    ok(pl.progs === p0, 'T5 놀이방 첫 방문에도 새 셰이더 프로그램 없음 (부팅 ' + p0 + ' → ' + pl.progs + ')');
    ok(pl.tg === 0 && pl.pick.floor === null && pl.pick.machine && pl.pick.machine.id === 'machine' && pl.pick.door && pl.pick.door.id === 'playAttic' && pl.osp === null, 'T5 놀이방: 톡 표적은 문 · 오락기 단추 칸뿐 (빈 바닥 null) · 숨은 문어 위치 없음 (targets ' + pl.tg + ', pick ' + JSON.stringify(pl.pick) + ', octScreenPos ' + JSON.stringify(pl.osp) + ')');
    ok(!pl.hs.atticPlay && inBox(pl.hs.playAttic) && inBox(pl.hs.machine), 'T5 놀이방: 문·기계 단추 44×44 이상 장면 안 ' + JSON.stringify([pl.hs.playAttic, pl.hs.machine]));
    /* 붙잡기: 놀이방에 있는 동안 출발 의식이 끝까지 돌아도 화면은 놀이방 */
    await page.evaluate(function () { window.__cer5 = 0; SC.departCeremony(function () { window.__cer5++; }); });
    var held = [], doneD = false;
    for (var k5 = 0; k5 < 30 && !doneD; k5++) { held = held.concat(await page.evaluate(function () { return __frames(30).map(function (f) { return f.v; }); })); doneD = await page.evaluate(function () { return window.__cer5 === 1; }); }
    var hp = await page.evaluate(function () { return { place: SC.place(), view: SC.view(), cer: SC.ceremony() }; });
    ok(doneD && held.every(function (v) { return v === 'play'; }) && hp.place === 'exterior' && hp.view === 'play', 'T5 놀이방에 있는 동안 출발 의식이 끝나도 화면은 놀이방 (' + held.length + ' 프레임, place ' + hp.place + ', view ' + hp.view + ')');
    await page.evaluate(function () { window.__res = null; SC.goRoom('attic').then(function (r) { __res = r; }); });
    await run(90, F60);
    var back = await page.evaluate(function () { return { res: __res, view: SC.view(), room: SC.room(), hs: __hs(), progs: SC.renderer.info.programs.length }; });
    ok(back.res && back.res.ok && back.view === 'exterior' && back.room === null && back.hs.atticPlay && back.hs.atticPlay.spot === 'edge' && !back.hs.machine, 'T5 산책 중 놀이방을 나오면 바깥 (view ' + back.view + ') · 다락 문 단추는 가장자리(edge) 모드');
    /* 바깥에서 다시 놀이방 → 나와서 다락으로 → 두 번째 왕복: 프로그램 수 그대로 */
    await page.evaluate(function () { window.__ev = []; SC.goRoom('play', { onDoor: function (e) { __ev.push(e.act + ':' + (e.door || '-') + '@' + SC.view()); } }); });
    await run(90, F60);
    var r2 = await page.evaluate(function () { return { ev: __ev, view: SC.view(), progs: SC.renderer.info.programs.length }; });
    ok(r2.view === 'play' && JSON.stringify(r2.ev) === JSON.stringify(['open:-@exterior', 'close:playAttic@play']), 'T5 바깥(산책 중)에서도 놀이방으로 (문 그림 없이 알림만): ' + JSON.stringify(r2.ev));
    await page.evaluate(function () { SC.setPlace('attic', { instant: true }); SC.setOctState('idle'); SC.jumpTo('center'); SC.goRoom('attic'); });
    await run(90, F60);
    var p5a = await page.evaluate(function () { return { view: SC.view(), progs: SC.renderer.info.programs.length }; });
    await page.evaluate(function () { SC.goRoom('play'); }); await run(90, F60);
    await page.evaluate(function () { SC.goRoom('attic'); }); await run(90, F60);
    var p5b = await page.evaluate(function () { return { view: SC.view(), progs: SC.renderer.info.programs.length }; });
    ok(p5a.view === 'attic' && p5b.view === 'attic' && p5b.progs === p5a.progs && p5a.progs === p0, 'T5 두 번째 왕복 뒤 프로그램 수 그대로 (부팅 ' + p0 + ' → 첫 왕복 ' + p5a.progs + ' → 둘째 ' + p5b.progs + ')');
    /* 모션 감소: 열린 문 한 장 → 컷 (미끄럼 0) → 닫힌 문 */
    await page.evaluate(function () { SC.setReducedMotion(true); SC.goRoom('play'); });
    var rf = await page.evaluate(function () { return __frames(30); });
    var firstPlay = rf.findIndex(function (f) { return f.v === 'play'; });
    ok(rf.every(function (f) { return f.sx === 0 && f.sy === 0; }) && rf[0].v === 'attic' && rf[0].da === 4 && firstPlay > 0 && rf[firstPlay].dp === 0, 'T5 모션 감소: 열린 문 한 장(' + firstPlay + ' 프레임) → 컷, 미끄럼 0, 들어온 문은 닫힌 채');
    await page.evaluate(function () { SC.goRoom('attic'); }); await run(30, F60);
    await page.evaluate(function () { SC.setReducedMotion(false); SC.hotspots({}); ['atticPlay', 'playAttic', 'machine'].forEach(function (id) { var e = document.getElementById('hs-' + id); e.parentNode.removeChild(e); }); SC.setOctState('idle'); SC.jumpTo('center'); });
    await run(60, F60);
    ok(await page.evaluate(function () { return SC.view() === 'attic' && SC.room() === null && SC.place() === 'attic'; }), 'T5 다락으로 돌아옴 (view attic · room null)');

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
