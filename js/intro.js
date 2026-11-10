/* js/intro.js — 입장 레이어 (docs/UI_ART.md "입장").
 *
 * 따로 노는 타이틀 화면이 아니라, 진짜 게임 화면 위에 얹는 얇은 레이어다.
 *  1) 하늘: 장면 카메라가 구름층과 비를 지나 다락으로 내려온다 (SCENE3D.intro, 픽셀 격자 스냅). 장면 밖은 장면 허공색으로 덮어 한 화면처럼 이어진다.
 *  2) 타이틀: 방이 거의 착지할 즈음 "뽈뽈 문어" 로고가 장면 아래 가장자리에 걸쳐 (한 화면 배치에선 방 아래 빈 띠에) 슥 올라온다 (아트 1px 단위 스텝). 빛 알갱이가 깜빡이고, 다 올라오면 반짝 한 번.
 *  3) 누르면: 로고가 살짝 눌렸다가 위로 빠지고, 덮개가 걷히고, 아래 UI 가 차례로 올라온다 → 바로 게임. 첫 실행이면 그다음 이름 짓기.
 * 하늘 단계에서 누르면 바로 착지 + 바로 게임 (기다리게 하지 않는다). Enter · Space · Esc 도 같다.
 *
 * 켜고 끄기: ?intro=0 이면 생략, ?intro=1 이면 강제. 자동화 브라우저(navigator.webdriver)는 기본 생략 — 기존 스모크·룩 샷이 첫 화면에서 바로 이름 창을 기다리기 때문.
 * 하루 한 번 (docs/PLAYTEST_FIXES.md A5-1): 그 날짜에 한 번 입장을 마쳤으면(타이틀을 눌러 들어갔으면) 같은 날 다시 열 때는 연출 없이 바로 게임.
 *   날짜는 앱과 같은 로컬 날짜(YYYY-MM-DD)이고 테스트 날짜 훅 window.__ppolTest.today 를 따른다. 기록은 localStorage 'ppolppol_intro_day' 하나.
 *   저장소가 막혀 있으면 예전처럼 매번 보인다. ?intro=1 은 같은 날에도 강제로 보인다.
 * 모션 감소: 카메라는 바로 착지, 로고·덮개는 페이드만, 알갱이·깜빡임 정지.
 * 계약: INTRO.start(scene, { mode: '3d'|'2d', reduced, host }) → true 면 연출 중 (끝나면 INTRO.onDone 콜백). app.js boot 가 부른다.
 * 이 파일은 <head> 에서 읽어 html.intro-on 을 먼저 붙인다 (UI 가 한 프레임 보였다 사라지는 깜빡임 방지).
 */
var INTRO = (function () {
  'use strict';
  var root = document.documentElement, q = location.search || '';
  var forced = /[?&]intro=1(&|$)/.test(q), off = /[?&]intro=0(&|$)/.test(q);
  var robot = typeof navigator !== 'undefined' && !!navigator.webdriver;
  var DAY_KEY = 'ppolppol_intro_day';
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function todayKey() {   /* app.js todayKey 와 같은 규칙: 테스트 훅이 있으면 그 날짜, 아니면 로컬 날짜 (UTC 아님) */
    var t = window.__ppolTest;
    if (t && typeof t === 'object' && /^\d{4}-\d{2}-\d{2}$/.test(t.today || '')) return t.today;
    var d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function seenToday() { try { return localStorage.getItem(DAY_KEY) === todayKey(); } catch (e) { return false; } }
  function markToday() { try { localStorage.setItem(DAY_KEY, todayKey()); } catch (e) { /* 저장소 없음: 다음에도 보인다 */ } }
  var enabled = !off && (forced || (!robot && !seenToday()));
  if (enabled) {
    root.classList.add('intro-on');
    /* 새로고침 때 브라우저가 예전 스크롤 자리를 load 뒤에 되살리면 start 의 scrollTo(0,0) 를 덮어 장면이 화면 밖으로 밀린다 (덮개 구멍만 남음) → 입장이 켜진 판은 되살리지 않는다 */
    try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) { /* 막힌 환경 */ }
    /* 안전판: 앱이 INTRO.start 를 못 부르면(스크립트 오류 등) 로드 3 s 뒤 덮개를 걷어 화면을 돌려준다 */
    window.addEventListener('load', function () { setTimeout(function () { if (st.phase === 'off') root.classList.remove('intro-on'); }, 3000); });
  }

  var LOGO = { w: 160, h: 41 }, SKY_DUR = 2.2;
  var st = { phase: 'off', scene: null, el: null, s: 2, reduced: false, cbs: [], timers: [], raf: 0, rise: null, ro: null, inert: [], anim: null };

  function asset(key, fallback) { var a = window.ASSETS_INLINE && window.ASSETS_INLINE[key]; return (a && (a.src || (typeof a === 'string' ? a : null))) || fallback; }
  function later(fn, ms) { var id = setTimeout(fn, ms); st.timers.push(id); return id; }
  function speed() { var v = parseFloat(getComputedStyle(root).getPropertyValue('--speed')); return v > 0 ? v : 1; }
  function h(tag, cls, attrs) { var e = document.createElement(tag); if (cls) e.className = cls; if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); }); return e; }

  /* 시드 고정 알갱이 자리 (로고 둘레, 로고 아트 px 기준) — Math.random 쓰지 않는다 */
  var MOTES = [[-10, 6, 0], [150, -6, 380], [70, -12, 760], [168, 30, 1140], [-4, 36, 1520], [118, 44, 260]];

  function build(host) {
    var el = h('div', 'intro', { id: 'intro', 'data-phase': 'sky' });
    var veil = h('div', 'intro-veil', { 'aria-hidden': 'true' }), hole = h('div', 'intro-hole');
    veil.appendChild(hole);
    var title = h('button', 'intro-title', { type: 'button', 'aria-label': '뽈뽈 문어 — 눌러서 들어가기' });
    var logo = h('img', 'intro-logo', { alt: '', src: asset('illust.logo', 'assets/illust/logo.png'), draggable: 'false' });
    var lift = h('span', 'intro-lift');   /* 올라오기·숨쉬기·빠지기 = 이 껍데기의 translate (정수 px) */
    lift.appendChild(logo);
    var mote = asset('fx.mote', 'assets/fx/mote.png'), spark = asset('fx.sparkle', 'assets/fx/sparkle.png');
    MOTES.forEach(function (m) { var d = h('span', 'intro-mote'); d.dataset.x = m[0]; d.dataset.y = m[1]; d.style.animationDelay = (m[2] * speed()) + 'ms'; d.style.backgroundImage = 'url("' + mote + '")'; lift.appendChild(d); });
    var sp = h('span', 'intro-spark'); sp.style.backgroundImage = 'url("' + spark + '")'; lift.appendChild(sp);
    title.appendChild(lift);
    var hint = h('p', 'intro-hint', { 'aria-hidden': 'true' }); hint.textContent = '톡 눌러서 들어가기';
    el.appendChild(veil); el.appendChild(title); el.appendChild(hint);
    document.body.appendChild(el);
    st.el = el; st.hole = hole; st.title = title; st.lift = lift; st.logo = logo; st.hint = hint; st.spark = sp; st.host = host;
    el.addEventListener('pointerdown', function (e) { if (e.button > 0) return; e.preventDefault(); go(); });
    title.addEventListener('click', function (e) { e.preventDefault(); go(); });   /* 키보드 Enter/Space 는 버튼 click 으로 들어온다 */
    document.addEventListener('keydown', onKey, true);
  }
  function onKey(e) {
    if (st.phase === 'off' || st.phase === 'out') return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); go(); }
  }

  /* 장면 사각형에 구멍 · 로고(장면 아래 가장자리에 걸침) · 안내 글자를 맞춘다. 배율은 정수 (1~3).
     한 화면 배치(html[data-layout="one"], 장면 = 화면 전체)에선 아래 가장자리가 화면 끝이라 걸칠 데가 없다 → 방 아래 빈 띠(장면 높이의 68 %)에 로고를 두고,
     안내 글자까지 화면 안에 들어오게 위로 당긴다. 가로로 눕힌 낮은 화면에선 로고가 높이의 26 % 를 넘지 않게 배율을 낮춘다 */
  function layout() {
    if (!st.el || !st.host) return;
    var r = st.host.getBoundingClientRect(), vw = window.innerWidth, one = root.getAttribute('data-layout') === 'one';
    var s = Math.max(1, Math.min(3, Math.floor((Math.min(r.width, vw) - 32) / LOGO.w)));
    if (one) s = Math.max(1, Math.min(s, Math.floor(r.height * 0.26 / LOGO.h)));
    st.s = s; st.el.style.setProperty('--s', s);
    var hs = st.hole.style; hs.left = Math.round(r.left) + 'px'; hs.top = Math.round(r.top) + 'px'; hs.width = Math.round(r.width) + 'px'; hs.height = Math.round(r.height) + 'px';
    var lw = LOGO.w * s, lh = LOGO.h * s, left = Math.round(r.left + (r.width - lw) / 2);
    var top = one ? Math.round(Math.min(r.top + r.height * 0.68, r.bottom - lh - 24 * s - 16)) : Math.round(r.bottom - lh * 0.62);   /* 24 × 배율 = 안내 글자까지 (틈 14 + 글자 10) */
    var ts = st.title.style; ts.left = left + 'px'; ts.top = top + 'px'; ts.width = lw + 'px'; ts.height = lh + 'px';
    st.logo.width = lw; st.logo.height = lh;
    st.lift.querySelectorAll('.intro-mote').forEach(function (d) { d.style.left = (+d.dataset.x * s) + 'px'; d.style.top = (+d.dataset.y * s) + 'px'; });
    st.spark.style.left = (lw - 14 * s) + 'px'; st.spark.style.top = (-6 * s) + 'px';
    st.hint.style.top = Math.round(top + lh + 14 * s) + 'px';
  }
  function setSky() {
    var sky = (st.scene && st.scene.skyHex && st.scene.skyHex()) || '#090a14';
    root.style.setProperty('--intro-sky', sky);
  }
  function setLift(px) { st.lift.style.transform = 'translateY(' + Math.round(px) * st.s + 'px)'; }   /* 아트 px → 정수 CSS px */

  /* 로고 올라오기: 14 아트px 아래에서, 0.56 s, easeOutBack 살짝 (1px 넘쳤다 제자리) — 1px 단위로만 움직인다 */
  function riseLogo() {
    st.phase = 'title'; st.el.dataset.phase = 'title';
    react('curious');   /* 문어가 고개 들어 로고를 본다 */
    if (st.reduced) { setLift(0); st.el.classList.add('risen'); later(showHint, 200); return; }
    var t0 = 0, dur = 560 * speed();
    function step(ts) {
      if (st.phase !== 'title') return;
      if (!t0) t0 = ts;
      var k = Math.min(1, (ts - t0) / dur), c = 1.4, e = 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
      setLift(14 * (1 - e));
      if (k < 1) st.raf = requestAnimationFrame(step); else { setLift(0); st.el.classList.add('risen'); later(showHint, 260 * speed()); later(bob, 900 * speed()); }
    }
    st.raf = requestAnimationFrame(step);
  }
  /* 문어 반응: 자고 있으면 깨우지 않는다 (연출이 문어 상태를 바꾸지 않게) */
  function react(expr) {   /* 지금 얼굴로 판단 — 입장 뒤에 새로고침 귀가(resumeRunning)가 재울 수 있다 */
    var cur = st.scene && st.scene.expression ? st.scene.expression() : null;
    if (!st.asleep && cur !== 'sleep' && cur !== 'sleepy' && st.scene && st.scene.setExpression) st.scene.setExpression(expr);
  }
  function showHint() { if (st.el && st.phase === 'title') st.el.classList.add('hinted'); }
  function bob() {   /* 숨쉬기: 0.7 s 마다 1 아트px 위/아래 (스텝, 보간 없음) */
    if (!st.el || st.phase !== 'title') return;
    var up = st.el.classList.toggle('bob-up'); setLift(up ? -1 : 0);
    later(bob, 700 * speed());
  }

  function start(scene, o) {
    if (!enabled || st.phase !== 'off') return false;
    o = o || {}; st.scene = scene; st.reduced = !!o.reduced;
    st.prevExpr = scene && scene.expression ? scene.expression() : null; st.asleep = st.prevExpr === 'sleep' || st.prevExpr === 'sleepy';
    var host = o.host || document.getElementById('scene');
    if (!host) { root.classList.remove('intro-on'); return false; }
    try { window.scrollTo(0, 0); } catch (e) { /* 스크롤 없는 환경 */ }
    build(host); setSky(); layout();
    /* 장면 자리는 장면이 몇 프레임 그린 뒤에 드러낸다 (그 전 캔버스는 순검정이라 덮개 색과 다르다). 첫 몇 프레임 안에 실제로 그린 허공 색으로 맞춘다 */
    (function settle(n) { requestAnimationFrame(function () { setSky(); if (n <= 2) root.classList.add('intro-live'); if (n > 0) settle(n - 1); }); })(5);   /* 3번째 프레임에 드러낸다 (느린 GPU 는 첫 프레임 셰이더 컴파일 동안 캔버스를 검게 합성한다) */
    st.phase = 'sky'; st.t0 = performance.now();
    if (st.reduced) root.classList.add('intro-reduced');
    /* 아래 UI 는 연출 동안 손이 닿지 않게 (inert) — 레이어만 포커스를 받는다 */
    Array.prototype.forEach.call(document.body.children, function (c) { if (c !== st.el && c.tagName !== 'SCRIPT' && !c.inert) { c.inert = true; st.inert.push(c); } });
    if (typeof ResizeObserver === 'function') { st.ro = new ResizeObserver(layout); st.ro.observe(host); }
    window.addEventListener('resize', layout);
    var landed;
    if (o.mode === '3d' && scene && scene.intro) landed = scene.intro({ dur: SKY_DUR * speed(), hold: true });
    else landed = slide2D(host);
    Promise.resolve(landed);   /* 착지 때 허공 색을 다시 읽지 않는다 (배경색은 연출 중 그대로 · 처음 몇 프레임에서 이미 맞췄다) */
    /* 로고는 방이 거의 다 내려왔을 때 (카메라 진행 52 %, 착지 눌림과 겹치게). 벽시계가 아니라 장면 진행도를 본다 — 느린 기기에선 프레임 dt 가 0.1 s 로 잘려
       카메라가 벽시계보다 늦으므로. 탭이 숨어 프레임이 멈춰도 갇히지 않게 벽시계 2.5배를 안전판으로 둔다 */
    var prog = scene && scene.introProgress;
    if (st.reduced) later(function () { if (st.phase === 'sky') riseLogo(); }, 0);
    else {
      later(function () { if (st.phase === 'sky') riseLogo(); }, SKY_DUR * 2.5 * 1000 * speed());
      (function watch() {
        if (st.phase !== 'sky') return;
        var k = o.mode === '3d' && prog ? prog() : (performance.now() - st.t0) / (SKY_DUR * 1000 * speed());
        if (k >= 0.52) riseLogo(); else st.raf = requestAnimationFrame(watch);
      })();
    }
    /* 자동 포커스는 하지 않는다 (아직 아무 입력이 없으면 브라우저가 포커스 링을 그린다). 키보드는 문서 keydown 으로 받고, Tab 으로 로고 버튼에 갈 수 있다 */
    return true;
  }
  function slide2D(host) {   /* WebGL 없음: 2D 무대를 위에서 내린다 (translate 개별 속성 — 기존 transform 은 그대로) */
    var stage = host.querySelector('#stage');
    if (!stage || st.reduced || !stage.animate) return Promise.resolve();
    var a = stage.animate([{ translate: '0 -110%' }, { translate: '0 3%', offset: 0.8 }, { translate: '0 0' }], { duration: SKY_DUR * 1000 * speed(), easing: 'cubic-bezier(.2,.8,.2,1)' });
    st.anim = a;   /* go() 가 바로 착지시킨다 (3D 의 introSkip 과 같은 몫) */
    return a.finished.catch(function () {});
  }

  /* 들어가기: 하늘 단계면 바로 착지. 로고 눌림(80ms) → 위로 빠지며 사라짐 · 덮개 걷힘 · UI 올라옴 → 정리 */
  function go() {
    if (st.phase === 'off' || st.phase === 'out') return;
    var wasSky = st.phase === 'sky';
    st.phase = 'out'; st.el.dataset.phase = 'out';
    cancelAnimationFrame(st.raf);
    if (st.scene && st.scene.introSkip) st.scene.introSkip();
    if (st.anim) { try { st.anim.finish(); } catch (e) { /* 이미 끝남 */ } st.anim = null; }   /* 2D: 내려오던 무대를 제자리에 (덮개가 걷히는 동안 아래로 미끄러지지 않게) */
    react('happy');   /* 폴짝 두 번 — 반가워. 2.4 s 뒤 원래 표정으로 */
    var sc = st.scene, prev = st.prevExpr;
    if (!st.asleep && sc && sc.setExpression) setTimeout(function () { if (sc.expression && sc.expression() === 'happy') sc.setExpression(prev && prev !== 'curious' ? prev : 'idle'); }, 2400 * speed());
    var sp = speed(), t0 = 0, dur = st.reduced ? 0 : 280 * sp;
    st.el.classList.add('leaving');
    if (!st.reduced && !wasSky) {
      st.lift.classList.add('pressed');
      later(function () {
        st.lift.classList.remove('pressed');
        (function step(ts) { if (!st.el) return; if (!t0) t0 = ts; var k = Math.min(1, (ts - t0) / dur); setLift(-10 * k * k); if (k < 1) requestAnimationFrame(step); })(performance.now());
      }, 80 * sp);
    }
    root.classList.add('intro-reveal');
    requestAnimationFrame(function () { root.classList.remove('intro-on'); });
    later(finish, (st.reduced ? 260 : 760) * sp);
  }
  function finish() {
    st.timers.forEach(clearTimeout); st.timers = [];
    document.removeEventListener('keydown', onKey, true); window.removeEventListener('resize', layout);
    if (st.ro) st.ro.disconnect();
    st.inert.forEach(function (c) { c.inert = false; }); st.inert = [];
    if (st.scene && st.scene.introRelease) st.scene.introRelease();   /* 장면 비네트 복귀 (덮개가 걷힌 뒤) */
    if (st.el && st.el.parentNode) st.el.parentNode.removeChild(st.el);
    root.classList.remove('intro-reveal', 'intro-reduced', 'intro-on', 'intro-live'); root.style.removeProperty('--intro-sky');
    st.el = null; st.phase = 'done';
    markToday();   /* 오늘은 들어왔다 → 같은 날 다시 열면 바로 게임 */
    var cbs = st.cbs; st.cbs = []; cbs.forEach(function (f) { try { f(); } catch (e) { console.error('[intro]', e); } });
  }
  function onDone(fn) { if (st.phase === 'done' || st.phase === 'off') fn(); else st.cbs.push(fn); }

  return { start: start, onDone: onDone, dismiss: go, get phase() { return st.phase; }, get enabled() { return enabled; } };
})();
