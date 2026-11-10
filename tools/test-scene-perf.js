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
 *   T7 내 캐릭터 움직이기 (brief MOVE.md): setPlayerInput 화면 축 → 월드 2.2 m/s (11-10 빠릿하게) · 방 안쪽 0.35 미끄러짐 · 상자·조리대·오락기 둘레 +0.25 · 문어 0.6 · null 로 멈춤 · DQ.pending 무시 · 바깥 false · on.playerInput 바뀔 때만 · 발자국 걸음마다 + 2 s 뒤 사라짐 · 놀이방 ≤ 60 · 프로그램 그대로 · 모션 감소 자국 없음
 *   T6 미용실 거울 코너 (docs/SALON.md §9.4): hotspots({ salon }) 단추가 코너 위 (44×44 · over) · 거울 가운데 톡 = spot salon · 옆에 선 문어 톡 = 문어 · 유리 60 % 이상 보임 ·
 *      드로우콜 가만히 ≤ 기준 + 8 · '바꾸기' 중 ≤ 기준 + 16 · ≤ 150 (등불 2·8 × 낮·밤) · 셰이더 프로그램 그대로 · Promise (보통 ≈ 5 s · 모션 줄이기 ≤ 1.5 s · 화면 밖 바로) ·
 *      끝나면 color() · 팔레트 문어 램프가 새 색 · 연출 중 초상 = 연출 전 초상 · 병·물 색상 ±25° (6색 × 낮·밤) · ponder · setColor still ·
 *      코너를 켜도 코너 밖 픽셀 0 개 바뀜 (팔레트 덧칸이 화분·이끼를 안 훔친다, 낮·노을·밤) · 등불 8칸 선반·받침·기념품이 아치를 안 덮음 · 밤 거울 유리 ≤ 창 유리 밝기 ·
 *      대야 첫 칸부터 맑은 물 · 병을 내민 동안 찍은 초상 = 쉬는 초상
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
      window.__pi = []; window.__steps = 0;   /* T7: on.playerInput(allowed) 바뀔 때만 · on.playerStep() 걸음마다 */
      window.SC = SCENE3D.init(document.getElementById('scene'), { lantern: 4, items: ['moss', 'crate', 'candle', 'board', 'shelf'], weather: 'rain', hour: 14, season: 'autumn', look: { pixelSize: 3 },
        on: { playerInput: function (a) { __pi.push(a); }, playerStep: function () { __steps++; } } });
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

    /* ── T6 미용실 거울 코너 (docs/SALON.md §9.4): 누르는 곳 · 톡 우선순위 · 드로우콜 (가만히 ≤ 기준 + 8 · '바꾸기' 중 ≤ 기준 + 16 · 언제나 ≤ 150) · 셰이더 프로그램 그대로 ·
       Promise (모션 줄이기 ≤ 1.5 s · 화면 밖 바로) · 끝나면 몸색·팔레트 문어 램프가 새 색 · 연출 중 초상 = 연출 전 초상 · 병·물 색상 ±25° (6색 × 낮·밤) · 문어가 옆에 서도 유리 60 % 이상 · ponder · setColor still ──
       루프를 멈추고 debugStep 으로 민다 (결정적) · 끝나면 T5 뒤 상태(등불 4 · 소품 · 빨강 · p=3)로 되돌리고 루프를 다시 돈다 */
    var SALON_HEX = ['#e8463c', '#f08a3c', '#9a5cc8', '#4a86d8', '#4fa868', '#f07aa8'];
    var hueOf = function (c) { var r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (d < 1e-6) return null; var h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; return h < 0 ? h + 360 : h; };
    var hexRgb = function (h) { return [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); };
    var dHue = function (c, hex) { var a = hueOf(c), b = hueOf(hexRgb(hex)); if (a == null || b == null) return 999; var d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
    var pal6 = await page.evaluate(function () { return SC.stats().palette; });   /* 코너 없을 때 팔레트 칸 수 (덧칸은 코너가 보일 때만) */
    await page.evaluate(function () {
      SC.setReducedMotion(false); SC.setLook({ pixelSize: 2 });   /* 앱 기본 픽셀 — p=3 이면 병(r 0.05)이 2 아트px 남짓이라 색 판정이 이웃에 걸린다 */
      SC.setLantern(2); SC.setTime(14, true); SC.setItems(['moss', 'crate']); SC.setOctState('idle'); SC.jumpTo('salon');
      var G = SC.motion().salon.geom, X = G.x, WZ = G.wz;   /* 코너 기하는 장면에서 읽는다 (숫자를 베끼지 않는다) */
      window.__sal = { G: G, X: X, WZ: WZ, glassZ: WZ + 0.031, midY: G.yc - 0.16, bottles: [0, 1, 2, 3, 4, 5].map(function (i) { return [Math.round((X + (i - 2.5) * G.gap) * 27) / 27, G.sy + 0.07, G.sz]; }), water: [G.tx, G.wy + 0.001, G.tz] };
      window.__frame = function () {   /* 지금 장면을 1 ms 만 밀어 그리고 캔버스 전체를 읽는다 (애니메이션이 거의 안 움직이는 같은 순간 비교용) */
        SC.debugStep(0.001);
        var gl = SC.renderer.getContext(), cv = SC.renderer.domElement, buf = new Uint8Array(cv.width * cv.height * 4);
        gl.readPixels(0, 0, cv.width, cv.height, gl.RGBA, gl.UNSIGNED_BYTE, buf); return { w: cv.width, h: cv.height, d: buf };
      };
      window.__cornerBox = function () {   /* 코너(거울 · 병 선반 · 그림자 · '처음 색' 병 자리)의 화면 상자 → 캔버스 px (+4 여유) */
        var cv = SC.renderer.domElement, r = cv.getBoundingClientRect(), c = document.getElementById('scene').getBoundingClientRect(), l = 1e9, t = 1e9, R = -1e9, B = -1e9;
        [G.x - 0.37, G.x + 0.50].forEach(function (x) { [0, G.yc + G.ro + 0.08].forEach(function (y) { [-2.5, -2.2].forEach(function (z) { var q = SC.screenOf(x, y, z), px = q.x - (r.left - c.left), py = q.y - (r.top - c.top); l = Math.min(l, px); R = Math.max(R, px); t = Math.min(t, py); B = Math.max(B, py); }); }); });
        return { l: Math.floor(l) - 4, t: Math.floor(t) - 4, r: Math.ceil(R) + 4, b: Math.ceil(B) + 4 };
      };
      window.__outside = function (A, B, box) {   /* 상자 밖에서 다른 픽셀 수 (gl 행은 아래부터) */
        var n = 0;
        for (var y = 0; y < A.h; y++) { var cy = A.h - 1 - y; for (var x = 0; x < A.w; x++) { if (x >= box.l && x <= box.r && cy >= box.t && cy <= box.b) continue; var i = (y * A.w + x) * 4; if (A.d[i] !== B.d[i] || A.d[i + 1] !== B.d[i + 1] || A.d[i + 2] !== B.d[i + 2]) n++; } }
        return n;
      };
      window.__st = function (n, dt) { for (var i = 0; i < (n || 1); i++) SC.debugStep(dt || 1 / 60); return SC.stats().calls; };
      window.__px = function (pts) {   /* 지금 프레임을 그리고 바로 읽는다 (그린 같은 일 안에서 — preserveDrawingBuffer 없이도) */
        SC.debugStep(1 / 60);
        var gl = SC.renderer.getContext(), cv = SC.renderer.domElement, r = cv.getBoundingClientRect(), c = document.getElementById('scene').getBoundingClientRect(), buf = new Uint8Array(4);
        return pts.map(function (q) { var sp = SC.screenOf(q[0], q[1], q[2]), x = Math.floor(sp.x - (r.left - c.left)), y = Math.floor(sp.y - (r.top - c.top)); gl.readPixels(x, cv.height - 1 - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf); return [buf[0], buf[1], buf[2]]; });
      };
      window.__tick = function () { return new Promise(function (r) { setTimeout(r, 0); }); };   /* Promise 의 then 이 돌 틈 */
      window.__dye = async function (hex, o, dt) {   /* '바꾸기' 끝까지 → { max 드로우콜, secs, done } — 박자 가장 짧은 칸이 1/12 s 라 dt 1/12 면 칸마다 한 번은 그린다 */
        var done = null, mx = 0, n = 0; dt = dt || 1 / 12; SC.salonDye(hex, o || {}).then(function (x) { done = x; });
        for (; n < 600; n++) { SC.debugStep(dt); mx = Math.max(mx, SC.stats().calls); if (!SC.motion().salon.active) break; }
        await __tick();
        return { max: mx, secs: +((n + 1) * dt).toFixed(2), active: SC.motion().salon.active, done: done };
      };
    });
    /* 누르는 곳: 단추를 넘기지 않으면 (지금 앱) 거울은 톡을 가로채지 않는다 → 넘기고 setSalonOpen(true) 이면 거울 위 'over' · 거울 가운데 톡 = 'spot' salon · 문어를 누르면 문어 */
    var t6a = await page.evaluate(function () {
      SC.setItems(['moss', 'crate', 'salon']); __st(2);
      var c = document.getElementById('scene').getBoundingClientRect(), m = SC.screenOf(__sal.X, __sal.midY, __sal.glassZ), mc = [c.left + m.x, c.top + m.y];
      var noBtn = SC.pickAt(mc[0], mc[1]);
      var bt = document.createElement('button'); bt.id = 'hs-salon'; bt.style.cssText = 'position:absolute;right:0;bottom:0;width:44px;height:44px;opacity:0;z-index:10'; document.getElementById('scene').appendChild(bt);
      SC.hotspots({ salon: bt }); __st(2);
      var closed = { hidden: bt.hidden, rect: SC.spotRect('salon'), pick: SC.pickAt(mc[0], mc[1]) };
      SC.setSalonOpen(true); __st(2);
      var r = SC.spotRect('salon'), oc = SC.targets().filter(function (t) { return t.kind === 'oct'; })[0];
      return { noBtn: noBtn, closed: closed, open: { hidden: bt.hidden, spot: bt.dataset.spot, l: bt.offsetLeft, t: bt.offsetTop, w: bt.offsetWidth, h: bt.offsetHeight }, art: r && r.art, m: m, W: c.width, H: c.height,
        pick: SC.pickAt(mc[0], mc[1]), octPick: oc ? SC.pickAt(oc.x, oc.y) : 'no-oct', reflect: SC.motion().salon.reflect };
    });
    ok(t6a.noBtn === null || t6a.noBtn.kind !== 'spot', 'T6 단추를 넘기지 않으면 거울은 톡을 안 받는다 (지금 앱 그대로 · ' + JSON.stringify(t6a.noBtn) + ')');
    ok(t6a.closed.hidden && t6a.closed.rect === null && !(t6a.closed.pick && t6a.closed.pick.kind === 'spot'), 'T6 setSalonOpen 전엔 단추 숨김 · 톡 없음');
    var so = t6a.open, sa = t6a.art;
    ok(!so.hidden && so.spot === 'over' && so.w >= 44 && so.h >= 44 && so.l >= 0 && so.t >= 0 && so.l + so.w <= t6a.W && so.t + so.h <= t6a.H && !!sa && t6a.m.x >= sa.l && t6a.m.x <= sa.r && t6a.m.y >= sa.t && t6a.m.y <= sa.b,
      'T6 hotspots({ salon }) 단추가 거울 코너 위 (over · ' + so.w + '×' + so.h + ' · 그림 ' + JSON.stringify(sa) + ')');
    ok(t6a.pick && t6a.pick.kind === 'spot' && t6a.pick.id === 'salon', 'T6 거울 가운데 톡 → spot salon (' + JSON.stringify(t6a.pick) + ')');
    ok(t6a.octPick && t6a.octPick.kind === 'oct', 'T6 문어가 거울 옆에 서 있을 때 문어를 누르면 문어 (' + JSON.stringify(t6a.octPick) + ')');
    ok(t6a.reflect === true, 'T6 문어가 거울 옆이면 거울 속 문어가 보인다');
    /* 문어가 옆에 서도 유리 60 % 이상 보인다 (기본 시점): 유리 면 위 점들을 화면에 찍고 그 자리 레이가 유리보다 먼저 문어 몸에 맞는지 */
    var gv = await page.evaluate(function () {
      var T = THREE, hitM = null, body = []; SC.scene.traverse(function (o) { if (o.isMesh && o.userData.kind === 'oct') hitM = o; });
      hitM.parent.traverseVisible(function (o) { if (o.isMesh && o !== hitM) body.push(o); });
      var cv = SC.renderer.domElement, r = cv.getBoundingClientRect(), c = document.getElementById('scene').getBoundingClientRect(), ray = new T.Raycaster(), v = new T.Vector2(), pl = new T.Plane(new T.Vector3(0, 0, 1), -__sal.glassZ), hp = new T.Vector3(), n = 0, vis = 0;
      var G = __sal.G;
      for (var gx = -0.17; gx <= 0.1701; gx += 0.02) for (var gy = G.y0 + 0.11; gy <= G.yc + 0.1701; gy += 0.02) {
        if (gy > G.yc && gx * gx + (gy - G.yc) * (gy - G.yc) > 0.17 * 0.17) continue;
        var s = SC.screenOf(__sal.X + gx, gy, __sal.glassZ), x = c.left + s.x, y = c.top + s.y;
        v.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1); ray.setFromCamera(v, SC.camera);
        if (!ray.ray.intersectPlane(pl, hp)) continue; n++;
        var gd = hp.distanceTo(ray.ray.origin), hb = ray.intersectObjects(body, false);
        if (!hb.length || hb[0].distance > gd) vis++;
      }
      return { n: n, vis: vis, frac: +(vis / n).toFixed(3) };
    });
    ok(gv.n > 50 && gv.frac >= 0.6, 'T6 문어가 거울 옆(salon)에 서도 유리 ' + Math.round(gv.frac * 100) + ' % 보임 (≥ 60 %, 점 ' + gv.n + ')');
    /* 드로우콜: 기준 = 같은 자리·시각·등불에서 코너 없음 */
    var LV8 = ['moss', 'crate', 'candle', 'blanket', 'board', 'shelf', 'curtain'];
    for (var cfg of [{ lan: 2, items: ['moss', 'crate'], h: 14 }, { lan: 2, items: ['moss', 'crate'], h: 21 }, { lan: 8, items: LV8, h: 14 }, { lan: 8, items: LV8, h: 21 }]) {
      var dc = await page.evaluate(async function (a) {
        SC.setLantern(a.lan); SC.setTime(a.h, true); SC.setColor('#e8463c', { still: true });
        if (a.lan >= 7) SC.setSouvenirs([1, 2, 3, 4, 5, 6, 7, 8].map(function (i) { return { id: 'sv' + i }; }));
        SC.setItems(a.items); SC.jumpTo('salon'); var base = __st(3);
        SC.setItems(a.items.concat(['salon'])); var idleNear = __st(3); SC.jumpTo('center'); var idleFar = __st(3); SC.jumpTo('salon'); __st(2);
        SC.salonOffer('#4fa868'); var offer = __st(3);
        var d = await __dye('#4fa868', { joy: true, look: true });
        return { base: base, idleNear: idleNear, idleFar: idleFar, offer: offer, dye: d.max, ok: !!(d.done && d.done.ok), progs: SC.stats().programs };
      }, cfg);
      var lbl = '등불 ' + cfg.lan + ' · ' + (cfg.h < 19 ? '낮' : '밤');
      ok(dc.idleNear <= dc.base + 8 && dc.idleFar <= dc.base + 8 && dc.offer <= dc.base + 8, 'T6 드로우콜 가만히 (' + lbl + '): 기준 ' + dc.base + ' → 거울 앞 ' + dc.idleNear + ' · 멀리 ' + dc.idleFar + ' · 병 내밈 ' + dc.offer + ' (≤ 기준 + 8)');
      ok(dc.ok && dc.dye <= dc.base + 16 && dc.dye <= 150, 'T6 드로우콜 \'바꾸기\' 중 최대 (' + lbl + '): ' + dc.dye + ' (≤ 기준 ' + dc.base + ' + 16 · ≤ 150)');
      ok(dc.progs === p0, 'T6 셰이더 프로그램 그대로 (' + lbl + ': ' + dc.progs + ' = 부팅 ' + p0 + ')');
    }
    /* 끝나면 몸색 · 팔레트 문어 램프가 새 색 · 대야 치움 · 병 제자리 · keep · offer(null) 뒤도 프로그램 그대로 */
    var t6c = await page.evaluate(async function () {
      SC.setLantern(2); SC.setTime(14, true); SC.setItems(['moss', 'crate', 'salon']); SC.setColor('#e8463c', { still: true }); SC.jumpTo('salon'); __st(2);
      SC.salonOffer('#4a86d8'); __st(2); var offer = SC.motion().salon.offer;
      var d = await __dye('#4a86d8', { joy: true, look: true }, 1 / 20), m = SC.motion().salon, oct = SC.palette().filter(function (g) { return g.name === 'oct'; })[0].colors;
      var kept = null; SC.salonOffer('#f07aa8'); __st(2); var offer2 = SC.motion().salon.offer; SC.salonKeep().then(function (x) { kept = x; }); __st(40, 1 / 30); await __tick();
      var afterKeep = SC.motion().salon; SC.salonOffer('#9a5cc8'); __st(2); SC.salonOffer(null); __st(2);
      return { offer: offer, offer2: offer2, done: d.done, secs: d.secs, color: SC.color(), oct: oct, want: SCENE3D.ramp('#4a86d8', 5, 0.09, [0.004, 0.014]), tub: m.tub, water: m.water, bottle: m.offer, kept: kept, keepOffer: afterKeep.offer, keepActive: afterKeep.active, offNull: SC.motion().salon.offer, progs: SC.stats().programs };
    });
    ok(t6c.offer === '#4a86d8' && t6c.offer2 === '#f07aa8', 'T6 salonOffer(hex) → motion().salon.offer (' + t6c.offer + ' · ' + t6c.offer2 + ')');
    ok(t6c.done && t6c.done.ok && !t6c.done.skipped && t6c.secs >= 4 && t6c.secs <= 6, 'T6 salonDye Promise 풀림 (보통 속도 ' + t6c.secs + ' s · 약 5 s)');
    ok(t6c.color === '#4a86d8' && JSON.stringify(t6c.oct) === JSON.stringify(t6c.want) && !t6c.tub && t6c.water === null && t6c.bottle === null, 'T6 끝나면 color() · 팔레트 문어 램프가 새 색 · 대야·물 없음 · 병 제자리 (' + t6c.color + ' ' + t6c.oct.join(' ') + ')');
    ok(t6c.kept && t6c.kept.ok && t6c.keepOffer === null && !t6c.keepActive && t6c.offNull === null, 'T6 salonKeep() Promise 풀림 · 병 제자리 · salonOffer(null) → offer null');
    ok(t6c.progs === p0, 'T6 salonOffer · salonDye · salonKeep · salonOffer(null) 뒤 셰이더 프로그램 그대로 (' + t6c.progs + ' = ' + p0 + ')');
    /* 연출 중에 찍은 초상 = 연출 전 같은 표정 초상 (기울기·폴짝·흔들기가 초상에 안 샌다) */
    var t6d = await page.evaluate(function () {
      SC.setColor('#e8463c', { still: true }); SC.jumpTo('salon'); SC.setOctState('idle'); SC.setExpression('idle'); __st(90);   /* 앞 검사에서 병을 따라가던 동공이 제자리로 돌아올 때까지 */
      function px(cv) { return Array.prototype.join.call(cv.getContext('2d').getImageData(0, 0, 64, 64).data, ','); }
      var a = px(SC.portrait('idle', { fresh: true })), jump = null, pour = null, hopMax = 0, tiltMax = 0;
      SC.salonOffer('#4fa868'); __st(30); var offerPort = px(SC.portrait('idle', { fresh: true })), offerLook = SC.motion().salon.look; SC.salonOffer(null); __st(90);
      SC.salonDye('#4a86d8', {});
      for (var k = 0; k < 400; k++) {
        SC.debugStep(1 / 30); var m = SC.motion();
        if (m.salon.beat === 'pour' && !pour) pour = px(SC.portrait('idle', { fresh: true }));
        if (m.salon.beat === 'jump') { hopMax = Math.max(hopMax, m.hop); tiltMax = Math.max(tiltMax, Math.abs(m.tilt)); if (m.hop > 0.05 && !jump) jump = px(SC.portrait('idle', { fresh: true })); }
        if (m.salon.beat === 'splash') break;
      }
      SC.salonFinish();
      return { pour: pour === a, jump: jump === a, hopMax: hopMax, hadJump: !!jump, offer: offerPort === a, offerLook: offerLook, other: px(SC.portrait('idle', { fresh: true, color: '#4fa868' })) !== px(SC.portrait('idle', { fresh: true })) };
    });
    ok(t6d.hadJump && t6d.jump && t6d.pour, 'T6 연출 중 초상 = 연출 전 초상 (붓기 · 제자리 폴짝 꼭대기 ' + t6d.hopMax.toFixed(2) + ' r — 픽셀 같음)');
    ok(t6d.other, 'T6 portrait(expr, { color }) 는 그 몸색으로 찍는다 (장면 몸색은 그대로)');
    ok(t6d.offerLook && t6d.offer, 'T6 병을 내민 동안(눈이 병을 따라감) 찍은 초상 = 쉬는 초상 (미용실 눈길이 초상에 안 샌다)');
    /* 모션 줄이기: 1.5 s 이하 (거울 보기 멈춤 0.6 s 포함) · 폴짝·물보라 없음 · 화면 밖이면 바로 끝 */
    var t6e = await page.evaluate(async function () {
      SC.setReducedMotion(true); SC.setColor('#e8463c', { still: true }); SC.jumpTo('salon'); __st(2);
      var done = null, n = 0, hop = 0, spl = false; SC.salonDye('#4fa868', { joy: true, look: true }).then(function (x) { done = x; });
      for (; n < 240 && !done; n++) { SC.debugStep(1 / 60); var m = SC.motion(); hop = Math.max(hop, Math.abs(m.hop)); spl = spl || m.salon.splash; await new Promise(function (r) { setTimeout(r, 0); }); }
      SC.setOctState('ponder'); __st(12); var sqR = SC.motion().squashY; SC.setOctState('idle');
      SC.setReducedMotion(false); __st(2);
      return { secs: +(n / 60).toFixed(2), done: done, hop: hop, spl: spl, color: SC.color(), sqR: sqR };
    });
    ok(t6e.done && t6e.done.ok && t6e.secs <= 1.5 && t6e.color === '#4fa868', 'T6 모션 줄이기: salonDye ' + t6e.secs + ' s ≤ 1.5 (거울 보기 멈춤 0.6 s 포함) · 색 ' + t6e.color);
    ok(t6e.hop === 0 && !t6e.spl && t6e.sqR === 1, 'T6 모션 줄이기: 폴짝 · 물보라 · 움츠림 없음 (hop ' + t6e.hop + ' · ponder squashY ' + t6e.sqR + ')');
    await page.evaluate(function () { window.scrollTo(0, 2000); });
    var offOk6 = await page.waitForFunction(function () { return SC.stats().offscreen === true; }, null, { polling: 50, timeout: 5000 }).then(function () { return true; }, function () { return false; });
    var t6f = await page.evaluate(async function () {
      var done = null; SC.salonDye('#f07aa8', { joy: true }).then(function (x) { done = x; });
      await new Promise(function (r) { setTimeout(r, 0); });
      return { done: done, color: SC.color(), m: SC.motion().salon };
    });
    ok(offOk6 && t6f.done && t6f.done.skipped && t6f.color === '#f07aa8' && !t6f.m.tub && !t6f.m.active, 'T6 화면 밖이면 salonDye 가 바로 끝 상태로 (skipped · 새 색 · 대야 없음)');
    await page.evaluate(function () { window.scrollTo(0, 0); });
    await page.waitForFunction(function () { return SC.stats().offscreen === false; }, null, { polling: 50, timeout: 5000 }).catch(function () {});
    /* ponder (움츠림 scaleY .92) · setColor(hex, { still }) 흔들기 없음 / 그냥 setColor 는 흔든다 */
    var t6g = await page.evaluate(function () {
      SC.setColor('#e8463c', { still: true }); SC.jumpTo('salon'); SC.setOctState('ponder'); __st(12); var sq = SC.motion().squashY;
      SC.setOctState('idle'); __st(40);
      var t1 = 0, t2 = 0, i; SC.setColor('#4a86d8', { still: true }); for (i = 0; i < 24; i++) { SC.debugStep(1 / 60); t1 = Math.max(t1, Math.abs(SC.motion().tilt)); }
      SC.setColor('#e8463c'); for (i = 0; i < 24; i++) { SC.debugStep(1 / 60); t2 = Math.max(t2, Math.abs(SC.motion().tilt)); }
      return { sq: sq, still: t1, wig: t2 };
    });
    ok(t6g.sq <= 0.93 && t6g.still === 0 && t6g.wig > 0, 'T6 setOctState(\'ponder\') 움츠림 (squashY ' + t6g.sq + ') · setColor still 흔들기 없음 (' + t6g.still + '°) · 그냥 setColor 는 흔듦 (' + t6g.wig + '°)');
    /* 코너를 켜도 코너 밖 픽셀은 하나도 안 바뀐다 (팔레트 덧칸이 낮 화분·이끼 올리브를 청록으로 훔치지 않고, 디더 진폭도 그대로) — 등불 2 낮·노을·밤 · 등불 8 낮 · 밤엔 초록 밤 톤 덧칸 */
    var t6h = await page.evaluate(function () {
      var LV8 = ['moss', 'crate', 'candle', 'blanket', 'board', 'shelf', 'curtain'], rows = [];
      [[2, ['moss', 'crate'], 14], [2, ['moss', 'crate'], 18], [2, ['moss', 'crate'], 21], [8, LV8, 14]].forEach(function (c) {
        SC.setLantern(c[0]); SC.setTime(c[2], true); SC.setColor('#e8463c', { still: true }); SC.setItems(c[1]);
        SC.setSouvenirs(c[0] >= 7 ? [1, 2, 3, 4, 5, 6, 7, 8].map(function (i) { return { id: 'sv' + i }; }) : [{ id: 'sv1' }]);
        SC.jumpTo('center'); __st(40, 1 / 30);   /* 디더 쉼 (> 0.3 s) 까지 */
        var best = null;
        for (var tr = 0; tr < 3 && !best; tr++) {
          var A = __frame(); SC.setItems(c[1].concat(['salon'])); var B = __frame(), pal = SC.stats().palette, ex = SC.motion().salon.extra.length; SC.setItems(c[1]); var A2 = __frame(), box = __cornerBox();
          if (__outside(A, A2, box) === 0) best = { outside: __outside(A, B, box), pal: pal, extra: ex };   /* A = A2: 그 사이 애니메이션이 안 움직였다 (비교가 공정하다) */
          __st(7, 1 / 30);
        }
        rows.push({ cfg: 'lantern ' + c[0] + ' ' + c[2] + 'h', r: best });
      });
      return rows;
    });
    ok(t6h.every(function (x) { return x.r && x.r.outside === 0; }), 'T6 코너를 켜도 코너 밖 픽셀 0 개 바뀜 (팔레트 덧칸 · 디더): ' + t6h.map(function (x) { return x.cfg + ' ' + (x.r ? x.r.outside + ' px, 덧칸 ' + x.r.extra : '불안정'); }).join(' · '));
    /* 등불 8칸 선반 (받침 x −0.95) · 기념품이 아치를 덮지 않는다: 틀 바깥 둘레 + 2 아트px 고리의 점마다 카메라 쪽 레이가 선반·기념품에 먼저 맞지 않는다 */
    var t6i = await page.evaluate(function () {
      var LV8 = ['moss', 'crate', 'candle', 'blanket', 'board', 'shelf', 'curtain'], T = THREE, G = __sal.G, out = [];
      SC.setLantern(8); SC.setTime(14, true); SC.setItems(LV8.concat(['salon'])); SC.setSouvenirs([1, 2, 3, 4, 5, 6, 7, 8].map(function (i) { return { id: 'sv' + i }; })); SC.jumpTo('center'); __st(3);
      var occ = []; SC.scene.traverse(function (o) {
        if (!o.isMesh) return; var vis = true, q = o; while (q) { if (!q.visible) vis = false; q = q.parent; } if (!vis) return;
        if (o.userData.kind === 'souvenir') { occ.push(o); return; }
        o.geometry.computeBoundingBox(); var bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
        if (bb.min.y > 1.2 && bb.max.y < 2.0 && bb.max.z < -1.9 && bb.max.x - bb.min.x > 1.2) occ.push(o);   /* 등불 7칸 선반 (1.5 m · y 1.37–1.74, 받침 포함) */
      });
      var dir = new T.Vector3(); SC.camera.getWorldDirection(dir); var ray = new T.Raycaster(), n = 0, hit = 0, rad = G.ro + 2 / 27;
      for (var th = 0; th <= Math.PI + 1e-9; th += Math.PI / 48) [rad, G.ro + 1 / 27].forEach(function (rr) {
        var P = new T.Vector3(G.x + rr * Math.cos(th), G.yc + rr * Math.sin(th), G.wz + G.d); ray.set(P.clone().addScaledVector(dir, -30), dir); n++;
        var hs = ray.intersectObjects(occ, false); if (hs.length && hs[0].distance < 30 - 1e-4) hit++;
      });
      return { occ: occ.length, n: n, hit: hit, top: +(G.yc + G.ro).toFixed(2) };
    });
    ok(t6i.occ >= 9 && t6i.n > 90 && t6i.hit === 0, 'T6 등불 8칸: 선반·받침·기념품 ' + t6i.occ + ' 개가 아치(위 끝 y ' + t6i.top + ')와 그 둘레 2 아트px 를 덮지 않음 (' + t6i.hit + '/' + t6i.n + ' 점 가림)');
    /* 밤 거울 유리는 진짜 창 유리보다 밝지 않다 (둘째 창처럼 뜨지 않게) · 대야는 놓이는 첫 칸부터 맑은 물 (검은 구멍 없음) */
    var t6j = await page.evaluate(function () {
      SC.setLantern(2); SC.setTime(21, true); SC.setItems(['moss', 'crate', 'salon']); SC.setSouvenirs([{ id: 'sv1' }]); SC.setColor('#e8463c', { still: true }); SC.jumpTo('center'); __st(20, 1 / 30);
      var G = __sal.G, gp = [], wp = [];
      for (var gx = -0.12; gx <= 0.1201; gx += 0.04) for (var gy = G.y0 + 0.16; gy <= G.yc + 0.1; gy += 0.05) gp.push([G.x + gx, gy, G.wz + 0.031]);
      for (var z = 0.0; z <= 0.9; z += 0.1) for (var y = 1.2; y <= 2.1; y += 0.15) wp.push([-2.5 + 0.02, y, z]);
      function lum(list) { return list.reduce(function (s, c) { return s + 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }, 0) / list.length; }
      var gl = lum(__px(gp)), wl = lum(__px(wp));
      SC.setTime(14, true); SC.jumpTo('salon'); __st(2); SC.salonDye('#4a86d8', {}); SC.debugStep(1 / 60); var m = SC.motion().salon, first = { beat: m.beat, tub: m.tub, water: m.water }; SC.salonFinish(); SC.setColor('#e8463c', { still: true });
      return { glass: +gl.toFixed(1), win: +wl.toFixed(1), first: first };
    });
    ok(t6j.glass <= t6j.win, 'T6 밤 거울 유리 밝기 ' + t6j.glass + ' ≤ 창 유리 ' + t6j.win + ' (거울이 둘째 창처럼 뜨지 않음)');
    ok(t6j.first.beat === 'tub' && t6j.first.tub && t6j.first.water === 'clear', 'T6 대야가 놓이는 첫 칸부터 맑은 물 (' + JSON.stringify(t6j.first) + ')');
    /* 병·물 색상: 6색 × 낮(14시)·밤(21시) — 병 가운데 아트px · 물 가운데 (물든 뒤) 가 원래 색과 ±25° */
    var hueRows = [];
    for (var hr6 of [14, 21]) {
      var hb = await page.evaluate(function (h) { SC.setTime(h, true); SC.setColor('#e8463c', { still: true }); SC.jumpTo('center'); __st(2); return __px(__sal.bottles); }, hr6);
      for (var hi = 0; hi < 6; hi++) {
        var wpx = await page.evaluate(function (hex) {
          SC.jumpTo('salon'); SC.salonDye(hex, { pause: 0.3 });
          for (var k = 0; k < 200; k++) { SC.debugStep(1 / 12); if (SC.motion().salon.beat === 'jump') break; }
          var w = __px([__sal.water])[0]; SC.salonFinish(); SC.setColor('#e8463c', { still: true }); return w;
        }, SALON_HEX[hi]);
        hueRows.push({ h: hr6, hex: SALON_HEX[hi], bottle: Math.round(dHue(hb[hi], SALON_HEX[hi])), water: Math.round(dHue(wpx, SALON_HEX[hi])), bpx: hb[hi].join(','), wpx: wpx.join(',') });
      }
    }
    var badHue = hueRows.filter(function (r) { return r.bottle > 25 || r.water > 25; });
    ok(badHue.length === 0, 'T6 병·물 색상 ±25° (6색 × 낮·밤): 최대 병 ' + Math.max.apply(null, hueRows.map(function (r) { return r.bottle; })) + '° · 물 ' + Math.max.apply(null, hueRows.map(function (r) { return r.water; })) + '°' + (badHue.length ? ' — 넘침 ' + JSON.stringify(badHue) : ''));
    /* 되돌리기: T5 뒤 상태 (등불 4 · 소품 · 기념품 하나 · 빨강 · p=3 · 단추 풀기) → 루프 다시 */
    await page.evaluate(function () {
      SC.salonFinish(); SC.setSalonOpen(false); SC.hotspots({}); var b = document.getElementById('hs-salon'); if (b) b.parentNode.removeChild(b);
      SC.setColor('#e8463c', { still: true }); SC.setTime(14, true); SC.setLantern(4); SC.setItems(['moss', 'crate', 'candle', 'board', 'shelf']); SC.setSouvenirs([{ id: 'sv1' }]);
      SC.setLook({ pixelSize: 3 }); SC.setOctState('idle'); SC.jumpTo('center'); SC.resume();
    });
    await run(60, F60);
    var t6z = await page.evaluate(function () { var m = SC.motion().salon; return { vis: m.visible, active: m.active, pal: SC.stats().palette, progs: SC.stats().programs }; });
    ok(!t6z.vis && !t6z.active && t6z.pal === pal6 && t6z.progs === p0, 'T6 되돌림: 코너·연출 없음 · 팔레트 덧칸 빠짐 (' + t6z.pal + ' = ' + pal6 + ') · 프로그램 ' + t6z.progs);

    /* ── T7 내 캐릭터 움직이기 (brief MOVE.md · docs/SCENE.md '내 캐릭터 · 움직이기'): setPlayerInput 화면 축 → 월드 · 2.2 m/s · 방 안쪽 0.35 미끄러짐 · 상자 · 문어 0.6 · null 로 멈춤 · DQ.pending 무시 · 바깥 false ·
       on.playerInput 바뀔 때만 · 발자국 걸음마다 + 2 s 뒤 사라짐 · 놀이방 드로우콜 ≤ 60 · 프로그램 그대로 · 모션 감소 자국 없음 · 문 앞 앵커 자리 — 루프를 멈추고 debugStep 1/60 으로 민다 (결정적) ── */
    await page.evaluate(function () {
      SC.pause(); SC.setOctState('idle'); SC.jumpTo('center'); SC.setItems(['moss', 'crate', 'candle', 'board', 'shelf']);
      window.__st = function (n, dt) { for (var i = 0; i < (n || 1); i++) SC.debugStep(dt || 1 / 60); return SC.player(); };
      window.__axes = function () {   /* 화면 오른쪽 · 위(카메라에서 멀어지는) 수평 단위 벡터 — 카메라 행렬에서 */
        var e = SC.camera.matrixWorld.elements, l = Math.hypot(e[0], e[2]), rx = e[0] / l, rz = e[2] / l; return { r: [rx, rz], f: [rz, -rx] };
      };
      window.__push = function (x, z, v, n) { SC.debugPlayerAt(x, z); __st(1); SC.setPlayerInput(v); var p = __st(n); SC.setPlayerInput(null); __st(2); return p; };
      __st(3);
    });
    var AX = await page.evaluate(function () { return __axes(); });
    var t7a = await page.evaluate(function () {
      var n0 = __pi.length, allowed = SC.playerInputAllowed();
      SC.debugPlayerAt(0.9, 0.9); __st(1); var a = SC.player().at; SC.setPlayerInput({ x: 1, y: 0 }); var mid = __st(15), b = __st(15);
      var dur = { walking: mid.walking, moving: mid.moving, input: mid.input, foot: mid.footprints, steps: __steps };
      SC.setPlayerInput(null); var s1 = __st(1), s2 = __st(1);
      var feet = s2.footprints; __st(140); var gone = SC.player().footprints;
      return { allowed: allowed, pi0: __pi.slice(0, n0), from: a, to: b.at, d: [b.at[0] - a[0], b.at[2] - a[2]], dur: dur, stop1: { walking: s1.walking, moving: s1.moving }, stop2: { walking: s2.walking, moving: s2.moving, input: s2.input }, feet: feet, gone: gone, pi: __pi.slice(n0) };
    });
    var dl = Math.hypot(t7a.d[0], t7a.d[1]), dotR = (t7a.d[0] * AX.r[0] + t7a.d[1] * AX.r[1]) / (dl || 1);
    ok(t7a.allowed === true && t7a.pi0.length >= 1 && t7a.pi0[0] === true && t7a.pi0.every(function (v, i) { return i === 0 || v !== t7a.pi0[i - 1]; }), 'T7 다락이 보일 때 playerInputAllowed() true · on.playerInput 은 부팅 때 true 로 시작해 바뀔 때만 (T1~T6 동안 ' + t7a.pi0.length + ' 번, 같은 값 연속 없음)');
    ok(Math.abs(dl - 1.1) < 0.05 && dotR > 0.995 && t7a.d[0] > 0 && t7a.d[1] < 0, 'T7 setPlayerInput({x:1,y:0}) 0.5 s → 화면 오른쪽(+x −z) 으로 ' + dl.toFixed(3) + ' m (≈ 1.1 = 2.2 m/s · 방향 일치 ' + dotR.toFixed(4) + ') ' + JSON.stringify(t7a.d.map(function (v) { return +v.toFixed(3); })));
    ok(t7a.dur.walking && t7a.dur.moving && JSON.stringify(t7a.dur.input) === '[1,0]' && t7a.dur.foot >= 1 && t7a.dur.steps >= 1, 'T7 걷는 동안 player().walking · moving · input [1,0] · 발자국 ' + t7a.dur.foot + ' · on.playerStep ' + t7a.dur.steps);
    ok(!t7a.stop1.walking && !t7a.stop2.walking && !t7a.stop2.moving && t7a.stop2.input === null, 'T7 null 로 놓으면 바로 walking · moving false · input null (' + JSON.stringify(t7a.stop2) + ')');
    ok(t7a.feet >= 3 && t7a.feet <= 5 && t7a.gone === 0, 'T7 발자국: 1.1 m 에 ' + t7a.feet + ' 개 (달리기 보폭 0.55 m 의 절반마다, 3~5) → 2.3 s 뒤 0 개 (' + t7a.gone + ')');
    ok(t7a.pi.length === 0, 'T7 다락 안에서 움직이는 동안 on.playerInput 알림 없음 (바뀔 때만: ' + JSON.stringify(t7a.pi) + ')');
    var t7b = await page.evaluate(function () {
      var up = __push(0.9, 0.9, { x: 0, y: 1 }, 30).at;   /* 문어(0, 0.2)는 r 0.6 — (0.9, 0.9) 에서 멀어지는 쪽(−x −z) 0.6 m 끝 (0.48, 0.48) 은 문어에서 0.55 라 막힌다 → 문어를 창가로 */
      SC.jumpTo('window'); __st(2); var up2 = __push(0.9, 0.9, { x: 0, y: 1 }, 30).at;
      var wall = __push(1.2, 0.5, { x: 0.7071, y: -0.7071 }, 180).at;   /* 월드 +x = 화면 오른쪽 − 위 → +x 벽 (다락 앞쪽은 RF 3.5 까지: 3.5 − 0.35 = 3.15) */
      SC.debugPlayerAt(3.15, 0.5); __st(1); SC.setPlayerInput({ x: 0.5, y: -0.866 }); var slide = __st(30).at; SC.setPlayerInput(null); __st(2);   /* 벽에 비스듬히 → x 는 벽, z 만 간다 */
      var crate = __push(1.9, 0.6, { x: 0.7071, y: 0.7071 }, 150).at;   /* 월드 −z → 상자 (z 면 −0.31, +0.25) */
      var crateIn = __push(1.0, -0.7, { x: 0.7071, y: -0.7071 }, 150).at;   /* 월드 +x → 상자 (x 면 1.48, +0.25) */
      var rest = __push(1.65, -0.1, { x: 0.7071, y: 0.7071 }, 30).at;   /* 쉬는 자리는 상자 둘레 안 4 cm — 더 파고드는 쪽(−z)은 0 */
      var restX = __push(1.65, -0.1, { x: -0.7071, y: 0.7071 }, 30).at;  /* 둘레 안이어도 옆(−x)으로는 간다 */
      SC.jumpTo('center'); __st(2); var oct = __push(0.9, 0.2, { x: -0.7071, y: 0.7071 }, 120).at, octAt = SC.motion().gait.at;
      var doorA = __push(1.7, 1.92, { x: 0.7071, y: -0.7071 }, 60).at;   /* 다락 문 앞 앵커 (RF − 0.55 = 2.95, 1.92) 를 지나 벽까지 */
      return { up: up, up2: up2, wall: wall, slide: slide, crate: crate, crateIn: crateIn, rest: rest, restX: restX, oct: oct, octAt: octAt, doorA: doorA, crateBox: (function () { var m = SC.scene.getObjectByName('attic').children.filter(function (o) { return o.userData && o.userData.decalR === 0.8; })[0]; return m ? [m.position.x, m.position.z] : null; })() };
    });
    var du = [t7b.up2[0] - 0.9, t7b.up2[2] - 0.9], dul = Math.hypot(du[0], du[1]), dotF = (du[0] * AX.f[0] + du[1] * AX.f[1]) / (dul || 1);
    ok(Math.abs(dul - 1.1) < 0.05 && dotF > 0.995 && du[0] < 0 && du[1] < 0, 'T7 {x:0,y:1} 0.5 s → 카메라에서 멀어지는 쪽(−x −z) ' + dul.toFixed(3) + ' m (방향 일치 ' + dotF.toFixed(4) + ')');
    ok(Math.hypot(t7b.up[0], t7b.up[2] - 0.2) >= 0.59, 'T7 같은 입력이라도 가운데 문어(r 0.6) 앞에선 멈춘다: 문어까지 ' + Math.hypot(t7b.up[0], t7b.up[2] - 0.2).toFixed(3) + ' m');
    ok(Math.abs(t7b.wall[0] - 3.15) < 0.011 && Math.abs(t7b.wall[2] - 0.5) < 1e-6, 'T7 +x 벽 쪽으로 3 s 밀어도 방 안쪽 0.35 m (x ' + t7b.wall[0] + ', z 그대로 ' + t7b.wall[2] + ')');
    ok(Math.abs(t7b.slide[0] - 3.15) < 0.011 && t7b.slide[2] > 0.5 + 0.1, 'T7 벽에 비스듬히 밀면 벽을 따라 미끄러진다 (x ' + t7b.slide[0] + ' · z 0.5 → ' + t7b.slide[2] + ')');
    var STEP = 2.2 / 60 + 0.0011;   /* 장애물 앞에서는 한 프레임 걸음(2.2 m/s ÷ 60)보다 가까이 못 붙는다 — plMove 는 겹치는 걸음을 통째로 버린다 */
    var cb = t7b.crateBox, crateZ = cb ? cb[1] + 0.44 + 0.25 : -0.06, crateX = cb ? cb[0] - 0.52 - 0.25 : 1.23;
    ok(!!cb && t7b.crate[2] >= crateZ - 0.0011 && t7b.crate[2] <= crateZ + STEP && Math.abs(t7b.crate[0] - 1.9) < 1e-6, 'T7 상자 쪽(−z)으로 밀어도 상자 둘레 +0.25 에서 멈춤 (z ' + t7b.crate[2] + ' ≥ ' + crateZ.toFixed(3) + ')');
    ok(!!cb && t7b.crateIn[0] <= crateX + 0.0011 && t7b.crateIn[0] >= crateX - STEP && Math.abs(t7b.crateIn[2] + 0.7) < 1e-6, 'T7 상자 쪽(+x)으로 밀어도 x ' + t7b.crateIn[0] + ' ≤ ' + crateX.toFixed(3) + ' (상자 안으로 못 들어감)');
    ok(Math.abs(t7b.rest[2] + 0.1) < 1e-6 && Math.abs(t7b.rest[0] - 1.65) < 1e-6 && t7b.restX[0] < 1.65 - 0.5, 'T7 쉬는 자리(상자 둘레 안 4 cm)에서 상자 쪽은 0 · 옆으로는 간다 (' + JSON.stringify(t7b.rest) + ' / x → ' + t7b.restX[0] + ')');
    var dOct = Math.hypot(t7b.oct[0] - t7b.octAt[0], t7b.oct[2] - t7b.octAt[2]);
    ok(dOct >= 0.55 && dOct <= 0.66 && t7b.oct[0] > 0.5, 'T7 문어 쪽으로 밀어도 0.6 m 안으로 못 들어감 (거리 ' + dOct.toFixed(3) + ' — 문어 그림 자리는 격자 스냅이라 ±0.05)');
    ok(t7b.doorA[0] >= 2.95 && Math.abs(t7b.doorA[2] - 1.92) < 1e-6, 'T7 다락 문 앞 앵커 자리(2.95, 1.92)를 지나갈 수 있다 (x → ' + t7b.doorA[0] + ')');
    /* DQ.pending (문 앞까지 걷는 동안) 스틱 무시 → 문 → 놀이방: 쉬는 자리로 가던 길을 스틱이 끊는다 · 놀이방 드로우콜 ≤ 60 · 문 앞 앵커(−2.45 = 안쪽 경계) · 조리대 · 프로그램 */
    var t7c = await page.evaluate(async function () {
      SC.debugPlayerAt(1.65, -0.1); __st(2); var n0 = __pi.length;
      window.__res = null; SC.goRoom('play', { walkFirst: true }).then(function (r) { __res = r; });
      await new Promise(function (r) { setTimeout(r, 0); });
      __st(3); var dur = SC.player(), al = SC.playerInputAllowed(); SC.setPlayerInput({ x: -1, y: 0 }); var w = [];
      for (var i = 0; i < 150 && SC.player().walking; i++) { __st(1); w.push(SC.player().at); }   /* 쉬는 자리 → 문 앞 2.40 m ≈ 1.4 s (혼자 걷기 1.8 m/s) */
      var arrived = SC.player(); SC.setPlayerInput(null);
      var guard = 0; while (guard++ < 300 && !__res) { __st(1); await new Promise(function (r) { setTimeout(r, 0); }); }
      var entered = SC.player(), piDoor = __pi.slice(n0);
      __st(6); var resting = SC.player(); __st(60); var stay = SC.player(); SC.setPlayerInput({ x: 0, y: -1 }); __st(2); SC.setPlayerInput(null); var cut = __st(2);
      var maxCalls = 0; SC.debugPlayerAt(0.15, 0.45); __st(1); SC.setPlayerInput({ x: 1, y: 0 }); for (i = 0; i < 30; i++) { __st(1); maxCalls = Math.max(maxCalls, SC.stats().calls); } var pf = SC.player(); SC.setPlayerInput(null); __st(2);
      var door = __push(-1.0, -0.33, { x: -0.7071, y: 0.7071 }, 90).at;   /* 월드 −x → 놀이방 문 앞 앵커 (−(PLAY_R 2.8 − 0.35) = −2.45, −0.33) 는 안쪽 경계와 같다 */
      var counter = __push(0.95, -0.3, { x: 0.7071, y: 0.7071 }, 90).at;   /* 월드 −z → 부엌 조리대 (뒷벽 −2.74 + 0.27 + 0.32 = 윗판 z −2.15 까지, +0.25 → −1.90) */
      var machine = __push(-1.8, -0.3, { x: 0.7071, y: 0.7071 }, 90).at;   /* 오락기 (x −1.8 · z −2.74 + 0.54 = −2.20 까지, +0.25 → −1.95) */
      var leg = __push(1.0, -1.0, { x: 0.7071, y: -0.7071 }, 90).at;   /* 월드 +x → ㄱ자 조리대 다리 (legBox x 2.17 부터, −0.25 → 1.92) */
      return { dur: { walking: dur.walking, pending: SC.motion().dq, allowed: al }, w: w, arrived: arrived.at, res: __res, entered: { place: entered.place, group: entered.group, pending: entered.pending, foot: entered.footprints }, piDoor: piDoor,
        resting: { walking: resting.walking, pending: resting.pending, at: resting.at }, stay: { walking: stay.walking, moving: stay.moving, pending: stay.pending, at: stay.at }, leg: leg, cut: { walking: cut.walking, pending: cut.pending, input: cut.input }, maxCalls: maxCalls, foot: pf.footprints, door: door, counter: counter, machine: machine, progs: SC.stats().programs, view: SC.view() };
    });
    ok(t7c.dur.walking && t7c.dur.allowed === false && t7c.w.length > 3 && t7c.w.every(function (p, i) { return i === 0 || p[0] >= t7c.w[i - 1][0] - 1e-9; }) && Math.abs(t7c.arrived[0] - 2.95) < 0.01 && Math.abs(t7c.arrived[2] - 1.92) < 0.01,
      'T7 문 앞까지 걷는 동안(DQ.pending) 스틱(−x) 무시 · playerInputAllowed false → 문 앞 앵커 도착 ' + JSON.stringify(t7c.arrived));
    ok(t7c.res && t7c.res.ok && t7c.view === 'play' && t7c.entered.place === 'play' && t7c.entered.group === 'play' && t7c.entered.foot === 0, 'T7 문을 지나 놀이방: 방이 바뀌면 발자국 0 (' + JSON.stringify(t7c.entered) + ')');
    ok(JSON.stringify(t7c.piDoor) === JSON.stringify([false, true]), 'T7 on.playerInput: 문 앞 걷기 시작에 false → 문이 닫히고 true, 그 사이 알림 없음 (' + JSON.stringify(t7c.piDoor) + ')');
    ok(!t7c.resting.walking && t7c.resting.pending === '' && !t7c.stay.walking && !t7c.stay.moving && t7c.stay.pending === '' && Math.abs(t7c.stay.at[0] + 2.45) < 1e-6 && Math.abs(t7c.stay.at[2] + 0.33) < 1e-6,
      'T7 문을 지난 뒤 들어온 문 앞(−2.45, −0.33)에 그대로 선다 — 쉬는 자리로 혼자 걸어가지 않는다 (11-10 · 1 s 뒤 ' + JSON.stringify(t7c.stay) + ')');
    ok(!t7c.cut.walking && t7c.cut.pending === '' && t7c.cut.input === null, 'T7 문 앞에서 스틱을 밀었다 놓으면 바로 선다 (walking ' + t7c.cut.walking + ' · 남은 걷기 없음)');
    ok(t7c.maxCalls <= 60 && t7c.foot >= 2, 'T7 놀이방에서 발자국 ' + t7c.foot + ' 개 보이며 걸어도 드로우콜 최대 ' + t7c.maxCalls + ' ≤ 60');
    ok(Math.abs(t7c.door[0] + 2.45) < 0.011 && Math.abs(t7c.door[2] + 0.33) < 1e-6, 'T7 놀이방 문 앞 앵커 (−2.45, −0.33) = 안쪽 경계까지 간다 (' + JSON.stringify(t7c.door) + ')');
    ok(t7c.counter[2] >= -1.90 - 0.0011 && t7c.counter[2] <= -1.90 + STEP && t7c.machine[2] >= -1.95 - 0.0011 && t7c.machine[2] <= -1.95 + STEP, 'T7 조리대 · 오락기 둘레 +0.25 에서 멈춤 (z ' + t7c.counter[2] + ' ≥ −1.90 · ' + t7c.machine[2] + ' ≥ −1.95)');
    ok(t7c.leg[0] <= 1.92 + 0.0011 && t7c.leg[0] >= 1.92 - STEP && Math.abs(t7c.leg[2] + 1.0) < 1e-6, 'T7 ㄱ자 조리대 다리 둘레 +0.25 에서 멈춤 (x ' + t7c.leg[0] + ' ≤ 1.92)');
    ok(t7c.progs === p0, 'T7 스틱 · 발자국 · 놀이방 뒤 셰이더 프로그램 그대로 (' + t7c.progs + ' = 부팅 ' + p0 + ' — 발자국 InstancedMesh 변형은 부팅 첫 프레임에)');
    /* 모션 감소: 움직이되 자국 없음 · 바깥이 보이면 false + 알림 false → 다락으로 돌아오면 true */
    var t7d = await page.evaluate(async function () {
      __st(140); SC.setReducedMotion(true); var r = __push(0.15, 0.45, { x: 1, y: 0 }, 30);   /* 앞 검사의 자국이 다 사라진 뒤 (2.1 s) */ var red = { d: Math.hypot(r.at[0] - 0.15, r.at[2] - 0.45), foot: r.footprints, moving: r.moving }; SC.setReducedMotion(false);
      window.__res = null; SC.goRoom('attic').then(function (x) { __res = x; }); var guard = 0; while (guard++ < 120 && !__res) { __st(1); await new Promise(function (q) { setTimeout(q, 0); }); }
      __st(40); var n0 = __pi.length;
      SC.setPlayerInput({ x: 1, y: 0 }); __st(1); SC.setPlace('exterior', { instant: true }); __st(2); var ext = { allowed: SC.playerInputAllowed(), input: SC.player().input, pi: __pi.slice(n0) };
      SC.setPlace('attic', { instant: true }); __st(2); var back = { allowed: SC.playerInputAllowed(), pi: __pi.slice(n0) };
      SC.setOctState('idle'); SC.jumpTo('center'); __st(2); SC.resume();
      return { red: red, ext: ext, back: back, place: SC.player().place, view: SC.view() };
    });
    ok(Math.abs(t7d.red.d - 1.1) < 0.05 && t7d.red.foot === 0 && t7d.red.moving === false, 'T7 모션 감소: 스틱으로 움직이되(' + t7d.red.d.toFixed(3) + ' m) 자국 없음 · 걸음 동작 없음');
    ok(t7d.ext.allowed === false && t7d.ext.input === null && JSON.stringify(t7d.ext.pi) === '[false]' && t7d.back.allowed === true && JSON.stringify(t7d.back.pi) === '[false,true]' && t7d.view === 'attic',
      'T7 바깥이 보이면 playerInputAllowed false · 누르던 입력 놓음 · on.playerInput(false) → 다락으로 돌아오면 true (' + JSON.stringify(t7d.back.pi) + ')');

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
