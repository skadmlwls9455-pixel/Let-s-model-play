/* ═══════════════════════════════════════════════════════════════════
   뽈뽈 문어 — js/ui-art.js (전역 UIART) · UI 아트 배선 (docs/UI_ART.md)
   app.js 는 작은 훅만 부른다: onRow · onBubble · onState · onInspect · fx. 그림 주소는 icon · iconHTML · iconSrc 로 빌려 준다.
   오늘의 산책(가장 새 목소리 행의 '다음' 그림 next.png) · 앨범(반짝 · '문어의 요즘' 줄 아이콘)은 MutationObserver 로 따라간다. 장면 위 버튼 그림(img[data-icon], 놀이방 문)의 주소도 여기서 채운다.
   플레이어 화면엔 이모지 · 장식 기호가 없다 (주인 11-07): 예전 이모지 자리(방 · 읽기 상태 · 기념품 · 스티커)는 app.js 가 픽셀 아이콘(class ua-both)을 직접 넣는다 — 두 테마 다 보인다 (시스템 16px · 픽셀 32px).
   그 밖의 꾸밈(도구 라벨 아이콘 · 틀 · '다음' · 파티클)은 css/ui-art.css 가 :root[data-font="pixel"] 일 때만 켠다.
   일러스트(illust.*)는 여기서 쓰지 않는다 (타이틀·로딩 흐름은 다른 작업).
   일반 스크립트 · 모듈 없음 · file:// 에서 그대로 동작 (경로는 manifest 규칙대로 고정).
   ═══════════════════════════════════════════════════════════════════ */
var UIART = (function () {
  'use strict';

  var LOG_KIND = { depart: 'depart', peek: 'peek', 'return': 'return', remember: 'remember', hang_poster: 'poster', wrap_up: 'wrapup', stay_home: 'home' };
  var CORNERS = ['hands', 'sea', 'sky', 'signs', 'numbers', 'sounds', 'home', 'mind', 'wild'];
  /* fx 스트립: 8×8 칸 수 (manifest fx.*.frames) */
  var FX = { heart: 2, question: 1, zzz: 3, sparkle: 4, ink: 4 };
  var TICK = 1000 / 12;   /* 12 fps — 장면 입자와 같은 박자 */

  function $(id) { return document.getElementById(id); }
  function app() { return (typeof APP !== 'undefined' && APP) || null; }
  function pixel() { return document.documentElement.getAttribute('data-font') === 'pixel'; }
  function reduced() {
    var a = app(), m = (a && a.state && a.state.settings && a.state.settings.motion) || 'auto';
    if (m === 'reduce') return true;
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* 그림 주소: tools/bundle.js 단일 파일이면 window.ASSETS_INLINE['icon.log.peek'] = { src:'data:…' } 를 (dist/ 기준 상대 경로는 404),
     아니면 지금까지처럼 상대 경로 (http · file:// 그대로). 키 = 'icon.' + 경로의 '/' 를 '.' 로 — bundle.js iconKey() 와 같은 규칙 */
  function iconSrc(path) {
    var m = window.ASSETS_INLINE, a = (m && typeof m === 'object') ? m['icon.' + path.split('/').join('.')] : null;
    return (a && (typeof a === 'string' ? a : a.src)) || ('assets/icons/' + path + '.png');
  }
  /* ── 아이콘 <img>: 16×16 원본을 32px(×2)로. 장식이라 alt="" + aria-hidden — 옆의 글자(라벨·상태 단어)는 그대로 남긴다.
     그림이 안 오면 지운다 (아래 문서 전체 error 캡처 — HTML 문자열로 넣은 것도). 이모지로 되돌리지 않는다 ── */
  function icon(path, cls) {
    var i = document.createElement('img');
    i.className = 'ua-ico' + (cls ? ' ' + cls : '');
    i.src = iconSrc(path);
    i.alt = ''; i.setAttribute('aria-hidden', 'true');
    i.width = 32; i.height = 32; i.draggable = false; i.decoding = 'async';
    return i;
  }
  function iconHTML(path, cls) {
    return '<img class="ua-ico' + (cls ? ' ' + cls : '') + '" src="' + String(iconSrc(path)).replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '" alt="" aria-hidden="true" width="32" height="32" draggable="false" decoding="async">';
  }
  /* 포스터 스티커(SVG <g class="stk"><image>)도 같다: 안 오면 스티커 무리째 지운다 (깨진 그림 표시가 카드 · 앞면 · 2D 벽에 남지 않게).
     한 번 안 온 주소는 기억해 둔다 → app.js posterSVG 가 다음부터 스티커를 아예 넣지 않는다 (iconBad) */
  var BAD = {};
  function hrefOf(t) { return t.getAttribute('src') || t.getAttribute('href') || t.getAttribute('xlink:href') || ''; }
  document.addEventListener('error', function (e) {
    var t = e.target, g;
    if (!t || !t.tagName) return;
    if (t.tagName === 'IMG' && t.classList && t.classList.contains('ua-ico')) { BAD[hrefOf(t)] = 1; if (t.parentNode) t.parentNode.removeChild(t); }
    else if (t.tagName === 'image' && t.closest && (g = t.closest('g.stk'))) { BAD[hrefOf(t)] = 1; if (g.parentNode) g.parentNode.removeChild(g); }
  }, true);
  function iconBad(src) { return !!(src && BAD[src]); }
  function prepend(el, path, cls) {
    if (!el || el.querySelector(':scope > .ua-ico')) return null;
    var img = icon(path, cls);
    el.insertBefore(img, el.firstChild);
    return img;
  }

  /* ── 1 · 2 산책 로그 행 ── */
  function frameRow(row) {
    if (!row.classList.contains('voice') && !row.classList.contains('dialog')) return;
    row.classList.add('ua-frame-dialog');
    var port = row.querySelector('.lport'); if (port) port.classList.add('ua-frame-portrait');
  }
  /* app.js eventRow 끝에서: 도구 라벨 앞에 icon.log.<kind> (픽셀 테마 꾸밈). 읽기 상태 · 방 · 기념품 그림은 app.js 가 이미 넣었다 */
  function onRow(row, ev) {
    if (!row || !ev) return;
    frameRow(row);
    var kind = LOG_KIND[ev.type];
    if (kind) {
      var tool = row.querySelector('.ltool');
      if (tool && prepend(tool, 'log/' + kind, 'ua-log')) { tool.classList.add('ua-tool'); row.classList.add('ua-row'); }
    }
  }
  /* 가장 새 문어 목소리 행에만 '다음' 그림 (next.png ↔ next2.png 0.5 s 깜빡, 축소 모션이면 가만히) */
  var logRaf = 0;
  function syncLog() {
    logRaf = 0;
    var log = $('log'); if (!log) return;
    var rows = log.querySelectorAll('.lrow.voice, .lrow.dialog');
    Array.prototype.forEach.call(rows, frameRow);
    var newest = rows.length ? rows[rows.length - 1] : null;
    Array.prototype.forEach.call(log.querySelectorAll('.lrow.ua-newest'), function (r) { if (r !== newest) r.classList.remove('ua-newest'); });
    if (!newest) return;
    if (!newest.classList.contains('ua-newest')) newest.classList.add('ua-newest');
    if (!newest.querySelector(':scope > .ua-next')) { var n = document.createElement('span'); n.className = 'ua-next'; n.setAttribute('aria-hidden', 'true'); newest.appendChild(n); }
  }

  /* ── 3 · 포스터 열람 기록 · 일기(뒷면): 종이 틀 (app.js openPoster 끝에서). 코너 · 상태 · 기념품 그림은 app.js 가 이미 넣었다 ── */
  function onInspect(trip) {
    var tx = $('pd-text'), back = $('pd-back');
    if (!trip) return;
    if (tx) tx.classList.add('ua-frame-paper');
    var rc = back && back.querySelector('.receipt');
    if (rc) rc.classList.add('ua-frame-paper');
  }

  /* ── 6 · 앨범 맨 위 '문어의 요즘' 줄 → icon.memory.<코너> (app.js 가 줄마다 data-corner 를 단다 — 예전 방 보기처럼 글자를 읽어 맞히지 않는다) ── */
  function syncRecent() {
    var box = $('al-recent'); if (!box) return;
    Array.prototype.forEach.call(box.querySelectorAll('p[data-corner]'), function (el) {
      var c = el.getAttribute('data-corner');
      if (CORNERS.indexOf(c) >= 0 && prepend(el, 'memory/' + c, 'ua-mem')) el.classList.add('ua-ico-line');
    });
  }

  /* ── 4 · 장면 말풍선: say(기본) · think(혼잣생각·메모) · whisper(졸림·잠).
     외침(happy·찾았다·'!')은 따로 그리지 않는다 — 주인 11-07: 가시 테두리 없이 효과음과 작은 통통(data-pop)으로만. kind 'shout' 는 소리 쪽(js/audio.js)이 그대로 쓴다 ── */
  function bubbleSkin(text, kind) {
    if (kind === 'think' || kind === 'memo') return 'think';
    if (kind === 'sleep' || kind === 'sleepy' || kind === 'whisper') return 'whisper';
    return 'say';
  }
  function isShout(text, kind) { return kind === 'happy' || kind === 'excited' || kind === 'shout' || /찾았|!$/.test(String(text || '')); }
  /* 장면 위 버튼들의 보이는 상자와 겹치는 말풍선 → 왼쪽으로 밀 양(px, 음수) · 안 겹치면 0. 버튼 무리마다 따로 잰다:
     오른쪽 위 아이콘 묶음(#scene-ctl: 추억 앨범 · ⚙ 설정 · 소리) 하나, 오른쪽 아래 놀이방 문(#btn-door) 하나 — 둘 다 장면 오른쪽 끝이라 왼쪽으로 비키면 된다.
     r = 밀기 전 풍선 상자. 입장 연출로 숨은 것 · 숨은 버튼은 셈하지 않는다. 2D 무대(app.js keepBubble2D)도 같이 쓴다 */
  function boxesOf(host, sel) {
    if (!host || host.hidden || getComputedStyle(host).visibility === 'hidden') return null;
    var L = Infinity, T = Infinity, B = -Infinity;
    [].forEach.call(sel ? host.querySelectorAll(sel) : [host], function (x) { var q = x.getBoundingClientRect(); if (!q.width) return; L = Math.min(L, q.left); T = Math.min(T, q.top); B = Math.max(B, q.bottom); });
    return L === Infinity ? null : { L: L, T: T, B: B };
  }
  function ctlGroups() {
    var door = $('btn-door');
    return [boxesOf($('scene-ctl'), '.icon-btn:not([hidden]) .snd-box'), door && !door.hidden ? boxesOf(door, '.door-box') : null].filter(Boolean);
  }
  function avoidCtl(r, pad) {
    if (!r) return 0;
    var shift = 0;
    ctlGroups().forEach(function (g) { if (r.bottom <= g.T || r.top >= g.B || r.right <= g.L - pad) return; shift = Math.min(shift, g.L - pad - r.right); });
    return shift;
  }
  /* 비켜 서도 겹치면(좁은 폭에서 문어가 보드·문 앞 = 아이콘 바로 아래일 때 — 꼬리를 문어 위에 두면 더는 못 민다) 말풍선이 보이는 동안 그 말풍선과 겹치는 버튼만 숨긴다
     (css .icon-btn.yield · .scene-door.yield: 투명 · 탭은 아래로 통과 · 키보드 포커스가 가면 다시 보임). 문어의 말이 먼저 읽히게 —
     예전처럼 옅게(0.3) 두면 아이콘 셋(앨범 · 설정 · 소리)이 말풍선 글자 위에 그려졌다. 겹치지 않는 버튼은 그대로. 말풍선이 사라지면 돌아온다.
     r = 비킨 뒤의 풍선 상자 { left, right, top, bottom } (true = 모두 · false = 모두 되돌림) */
  function ctlYield(r) {
    [].forEach.call(document.querySelectorAll('#scene-ctl .icon-btn, #btn-door'), function (btn) {
      var on = false;
      if (r && !btn.hidden) {
        if (r === true) on = true;
        else { var q = (btn.querySelector('.snd-box, .door-box') || btn).getBoundingClientRect(); on = q.width > 0 && r.left < q.right && r.right > q.left && r.top < q.bottom && r.bottom > q.top; }
      }
      if (btn.classList.contains('yield') !== on) btn.classList.toggle('yield', on);
    });
  }
  /* 9-slice 테두리로 넓어진 풍선이 장면 가장자리에서 잘리지 않게 옆으로 민다 (꼬리는 문어 위에 그대로).
     장면 오른쪽 위 아이콘 묶음과 겹치면 그 왼쪽까지 민다 (두 테마 — 시스템 테마 풍선은 꼬리가 없어 가장자리 규칙은 픽셀만). 한도는 같다: 꼬리가 풍선 아랫변 안 */
  function keepInside(b) {
    b.style.marginLeft = ''; b.style.removeProperty('--ua-tail');
    var sc = $('scene'); if (!sc || !b.closest('#scene3d')) return;
    var s = sc.getBoundingClientRect(), r = b.getBoundingClientRect(), pad = 4, shift = 0;
    if (pixel()) { if (r.left < s.left + pad) shift = s.left + pad - r.left; else if (r.right > s.right - pad) shift = s.right - pad - r.right; }
    var cs = avoidCtl(r, pad); if (cs < 0) shift = Math.min(shift, Math.max(cs, s.left + pad - r.left));   /* 아이콘을 피하되 왼쪽 가장자리 밖으로는 안 민다 */
    var lim = Math.max(0, r.width / 2 - 28); shift = even(Math.max(-lim, Math.min(lim, shift)));
    if (shift) { b.style.marginLeft = shift + 'px'; if (pixel()) b.style.setProperty('--ua-tail', (-shift) + 'px'); }
    ctlYield({ left: r.left + shift, right: r.right + shift, top: r.top, bottom: r.bottom });   /* 그래도 겹치는 버튼만 말풍선이 보이는 동안 숨김 */
  }
  var bubTimer = null;
  function onBubble(text, kind) {
    var b = $('oct-bubble'); if (!b || !text) return;
    b.setAttribute('data-ua', bubbleSkin(text, kind));
    b.removeAttribute('data-pop');
    if (isShout(text, kind) && !reduced()) { void b.offsetWidth; b.setAttribute('data-pop', ''); }   /* 다시 붙여야 애니메이션이 처음부터 */
    keepInside(b);
    requestAnimationFrame(function () { if (!b.hidden) keepInside(b); });   /* 장면이 다음 프레임에 풍선을 문어 위로 옮긴 뒤 한 번 더 (첫 0.2 s 동안 아이콘과 겹쳐 보이지 않게) */
    /* 문어가 걸어가도 풍선이 따라가며 가장자리 안에 머물게 (보이는 동안만 5 Hz) */
    clearInterval(bubTimer);
    bubTimer = setInterval(function () { if (b.hidden) { clearInterval(bubTimer); bubTimer = null; ctlYield(false); return; } keepInside(b); }, 200);
    if (kind === 'curious') fx('question');   /* 톡 누름 ('응?') — 픽셀 테마 물음표 파티클 */
  }

  /* ── 5 · 파티클 (DOM 스프라이트, fx.* 8×8 칸 ×2, 12 fps 스텝) — 축소 모션이면 아무것도 안 띄운다 ── */
  var layer = null;
  function fxLayer() {
    var sc = $('scene'); if (!sc) return null;
    if (!layer || layer.parentNode !== sc) { layer = document.createElement('div'); layer.className = 'ua-fx'; layer.setAttribute('aria-hidden', 'true'); sc.appendChild(layer); }
    return layer;
  }
  /* 문어 머리 꼭대기 (#scene 기준 CSS px) — 장면의 투영 도우미 octScreenPos() 를 읽기만 한다 */
  function octPos() {
    var a = app(), sc = a && a.scene, el = $('scene');
    if (!sc || typeof sc.octScreenPos !== 'function' || !el) return null;
    var p; try { p = sc.octScreenPos(); } catch (e) { return null; }
    if (!p || !isFinite(p.x) || !isFinite(p.y)) return null;
    var r = el.getBoundingClientRect();
    return { x: Math.round(p.x - r.left), y: Math.round(p.y - r.top) };
  }
  function even(n) { return Math.round(n / 2) * 2; }   /* 아트 픽셀(×2) 격자에 맞춘다 */
  /* 스프라이트 하나: 바깥 span = 위치·떠오름(12fps 스텝), 안쪽 i = 프레임 스트립 */
  function sprite(host, name, x, y, o) {
    var frames = FX[name] || 1, life = o.life || 1000, delay = o.delay || 0, rise = o.rise || 0;
    var s = document.createElement('span');
    s.className = 'ua-p ua-p-' + name;
    s.style.left = even(x) + 'px'; s.style.top = even(y) + 'px';
    s.style.setProperty('--life', life + 'ms');
    s.style.setProperty('--steps', String(Math.max(1, Math.round(life / TICK))));
    s.style.setProperty('--rise', (-even(rise)) + 'px');
    var i = document.createElement('i');
    i.style.setProperty('--fw', (-frames * 16) + 'px');
    i.style.animationDuration = (o.loop ? (o.frameMs || TICK) * frames : life) + 'ms';
    i.style.animationTimingFunction = 'steps(' + frames + ')';
    i.style.animationIterationCount = o.loop ? 'infinite' : '1';
    s.appendChild(i);
    /* 늦게 나오는 건 늦게 붙인다 (지연 동안 첫 프레임이 미리 보이지 않게) */
    function add() { host.appendChild(s); setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, life + 60); }
    if (delay > 0) setTimeout(add, delay); else add();
    return s;
  }
  function fx(name, opts) {
    opts = opts || {};
    if (!pixel() || reduced() || !FX[name]) return 0;
    if (name === 'sparkle' && opts.el) return sparkleOn(opts.el);
    var host = fxLayer(), p = octPos(); if (!host || !p) return 0;
    if (name === 'heart') {   /* 쓰다듬기: 하트 2–3개가 머리 위로 */
      var n = opts.n || 3, xs = [-12, 2, 14];
      for (var k = 0; k < n; k++) sprite(host, 'heart', p.x + xs[k % 3], p.y - 6 - (k % 2) * 4, { life: 1000, rise: 40, delay: Math.round(k * 2 * TICK), loop: true, frameMs: 3 * TICK });
      return n;
    }
    if (name === 'question') { sprite(host, 'question', p.x + 14, p.y - 10, { life: 1250, rise: 8 }); return 1; }
    if (name === 'zzz') { sprite(host, 'zzz', p.x + 14, p.y - 4, { life: 1500, rise: 24 }); return 1; }
    if (name === 'ink') {   /* 출발: 발밑 먹물 퍼프 */
      var fy = p.y + (opts.dy != null ? opts.dy : 30);
      [-14, 0, 14].forEach(function (dx, j) { sprite(host, 'ink', p.x + dx, fy - (j === 1 ? 4 : 0), { life: Math.round(4 * TICK * 1.5), rise: 4, delay: Math.round(j * TICK) }); });
      return 3;
    }
    if (name === 'sparkle') { sprite(host, 'sparkle', p.x, p.y - 8, { life: 1000, loop: true, frameMs: TICK }); return 1; }
    return 0;
  }
  /* 앨범에 새로 걸린 카드: 모서리 세 곳에서 반짝 (카드 안에 붙여 가로 스크롤을 따라간다) */
  function sparkleOn(card) {
    if (!card || card.dataset.uaSparkled) return 0;
    card.dataset.uaSparkled = '1';
    [[6, 6], [null, 18], [14, null]].forEach(function (xy, j) {
      var s = sprite(card, 'sparkle', 0, 0, { life: 1000, loop: true, frameMs: TICK, delay: Math.round(j * 3 * TICK) });
      s.style.left = ''; s.style.top = '';
      if (j === 0) { s.style.left = '6px'; s.style.top = '6px'; }
      else if (j === 1) { s.style.right = '6px'; s.style.top = '18px'; }
      else { s.style.left = '14px'; s.style.bottom = '10px'; }
      s.classList.add('ua-p-in');
    });
    return 3;
  }
  function syncAlbum() {
    var al = $('album'); if (!al) return;
    Array.prototype.forEach.call(al.querySelectorAll('.pcard.in'), function (c) { fx('sparkle', { el: c }); });
  }

  /* 졸 때 z 하나씩 (한 개의 이미터) · 떠날 때 먹물 */
  var zzzTimer = null;
  function stopZzz() { clearInterval(zzzTimer); zzzTimer = null; }
  function onState(st) {
    if (st === 'sleep') {
      if (!zzzTimer) zzzTimer = setInterval(function () {
        var a = app();
        if (!a || !a.oct || a.oct.state !== 'sleep') { stopZzz(); return; }
        if (!document.hidden) fx('zzz');
      }, 2000);
    } else stopZzz();
    if (st === 'away') fx('ink');
  }

  /* ── 장면 위 버튼 그림 (img[data-icon="ctl/door"]): 주소는 iconSrc 규칙 (단일 파일 번들 = data URI). 안 오면 버튼에 .no-img → 글자 '문' (두 테마 다 보인다 · 이모지는 쓰지 않는다) ── */
  function fillIcons() {
    Array.prototype.forEach.call(document.querySelectorAll('img[data-icon]'), function (img) {
      if (img.getAttribute('src')) return;
      var btn = img.closest('button');
      img.onerror = function () { if (btn) btn.classList.add('no-img'); };
      img.src = iconSrc(img.getAttribute('data-icon'));
    });
  }

  /* ── 관찰자: 로그(▼ · 틀) · 앨범(반짝 · 요즘 줄) ── */
  function observe(id, fn, subtree) {
    var el = $(id); if (!el || typeof MutationObserver === 'undefined') return;
    new MutationObserver(fn).observe(el, { childList: true, subtree: !!subtree });
  }
  function init() {
    observe('log', function () { if (!logRaf) logRaf = requestAnimationFrame(syncLog); }, true);
    observe('al-recent', syncRecent, false);
    observe('album', syncAlbum, false);
    fillIcons(); syncLog(); syncRecent();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  return { onRow: onRow, onBubble: onBubble, onState: onState, onInspect: onInspect, fx: fx, bubbleSkin: bubbleSkin, syncLog: syncLog, syncRecent: syncRecent, avoidCtl: avoidCtl, ctlYield: ctlYield,
    iconSrc: iconSrc, icon: icon, iconHTML: iconHTML, iconBad: iconBad };
})();
