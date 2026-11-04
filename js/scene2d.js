/* ============================================================
   뽈뽈 문어 — js/scene2d.js (전역 SCENE2D)
   2D 폴백 장면: 인라인 SVG 레이어 320×240 + DOM 문어 (#oct).
   SCENE3D 와 같은 API (DESIGN.md §13.1). THREE/WebGL 이 없을 때 APP 이 이걸 쓴다.
   1차 구현(app.js 의 scene/octopus 섹션)을 그대로 옮긴 것. 로직은 바꾸지 않았다.
   ============================================================ */
var SCENE2D = (function () {
  'use strict';

  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'text') el.textContent = attrs[k];
      else if (k === 'html') el.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null) el.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c != null) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function hash(s) { s = String(s); var x = 2166136261; for (var i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
  function shade(hex, k) { /* k<0 어둡게 */
    var n = parseInt(hex.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
    var f = function (v) { v = Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k); return ('0' + clamp(v, 0, 255).toString(16)).slice(-2); };
    return '#' + f(r) + f(g) + f(b);
  }

  /* ───────── 플레이스홀더 SVG (320×240 좌표계) ───────── */
  function svgWrap(w, hgt, body) { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + hgt + '" shape-rendering="crispEdges">' + body + '</svg>'; }
  var PH = {
    'bg.room': function () {
      var s = '<rect width="320" height="240" fill="#7a5a3a"/>';
      s += '<rect width="320" height="168" fill="#8c6a48"/>';
      for (var y = 0; y < 168; y += 12) s += '<rect y="' + y + '" width="320" height="1" fill="#7e5f40"/>';
      s += '<polygon points="0,0 320,0 320,26 0,58" fill="#4a3320"/>';
      for (var x = 0; x < 320; x += 24) s += '<rect x="' + x + '" y="168" width="1" height="72" fill="#5a3c1e"/>';
      for (var yy = 168; yy < 240; yy += 10) s += '<rect y="' + yy + '" width="320" height="1" fill="#654425"/>';
      s += '<rect x="286" y="104" width="34" height="100" fill="#2a1a10"/><rect x="284" y="102" width="4" height="102" fill="#4a3320"/><rect x="284" y="102" width="36" height="4" fill="#4a3320"/>';
      s += '<rect x="304" y="150" width="3" height="3" fill="#c9a257"/>';
      s += '<rect x="44" y="40" width="72" height="4" fill="#4a3320"/><rect x="44" y="116" width="72" height="6" fill="#5c4028"/>';
      return svgWrap(320, 240, s);
    },
    window: function (mode) {
      var s = '<rect width="72" height="84" fill="' + (mode === 'stars' ? '#1a2440' : mode === 'drizzle' ? '#5a6a84' : '#4b5a72') + '"/>';
      s += '<rect x="0" y="0" width="72" height="84" fill="none" stroke="#4a3320" stroke-width="4"/>';
      s += '<rect x="34" y="0" width="4" height="84" fill="#4a3320"/><rect x="0" y="40" width="72" height="4" fill="#4a3320"/>';
      if (mode === 'stars') [[12, 14], [26, 8], [52, 18], [60, 30], [18, 58], [48, 66], [40, 24]].forEach(function (p) { s += '<rect x="' + p[0] + '" y="' + p[1] + '" width="2" height="2" fill="#f7f1d8"/>'; });
      return svgWrap(72, 84, s);
    },
    lantern: function (n) {
      var on = n > 0, a = on ? Math.min(1, .35 + n * .08) : 0;
      var s = '<rect x="13" y="0" width="2" height="8" fill="#5c4028"/><rect x="8" y="8" width="12" height="3" fill="#3a2a18"/>';
      s += '<rect x="7" y="11" width="14" height="22" rx="2" fill="' + (on ? '#f0a040' : '#5a4a3a') + '"/>';
      s += '<rect x="10" y="14" width="8" height="14" fill="' + (on ? '#ffd27a' : '#6a5a4a') + '"/>';
      if (on) s += '<ellipse class="glow" cx="14" cy="22" rx="22" ry="20" fill="#f0a040" opacity="' + (a * .5).toFixed(2) + '"/>';
      s += '<rect x="9" y="33" width="10" height="3" fill="#3a2a18"/>';
      return svgWrap(28, 44, s);
    },
    light: function (n) {
      if (!(n > 0)) return svgWrap(320, 240, '');
      var a = Math.min(0.5, 0.18 + n * 0.04);
      return svgWrap(320, 240, '<defs><radialGradient id="phglow" cx="48" cy="40" r="' + (90 + n * 12) + '" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f0a040" stop-opacity="' + a.toFixed(2) + '"/><stop offset="1" stop-color="#cc8030" stop-opacity="0"/></radialGradient></defs><rect width="320" height="240" fill="url(#phglow)"/>');
    },
    'item.moss': function () { return svgWrap(20, 18, '<rect x="4" y="9" width="12" height="9" fill="#b0623a"/><rect x="3" y="8" width="14" height="2" fill="#c47a4c"/><rect x="5" y="4" width="10" height="5" fill="#4f8a3e"/><rect x="7" y="2" width="6" height="3" fill="#6aa552"/><rect x="2" y="6" width="4" height="4" fill="#4f8a3e"/>'); },
    'item.crate': function () { return svgWrap(44, 36, '<rect width="44" height="36" fill="#9a6a3c"/><rect x="2" y="2" width="40" height="32" fill="#b07c48"/><rect x="2" y="16" width="40" height="2" fill="#8a5a30"/><rect x="21" y="2" width="2" height="32" fill="#8a5a30"/><rect x="4" y="30" width="36" height="2" fill="#8a5a30"/>'); },
    'item.candle': function () { return svgWrap(14, 22, '<rect x="2" y="18" width="10" height="4" fill="#6a4a2a"/><rect x="4" y="8" width="6" height="10" fill="#f3e6c8"/><rect x="6" y="6" width="2" height="2" fill="#3a2a18"/><g class="flame"><rect x="5" y="2" width="4" height="5" fill="#f0a040"/><rect x="6" y="0" width="2" height="3" fill="#ffd27a"/></g>'); },
    'item.blanket': function () { return svgWrap(56, 20, '<rect x="0" y="6" width="56" height="14" rx="3" fill="#8a4a52"/><rect x="4" y="4" width="48" height="6" rx="2" fill="#a85c64"/><rect x="8" y="10" width="40" height="2" fill="#9a5058"/><rect x="0" y="18" width="56" height="2" fill="#6a3a40"/>'); },
    'item.board': function () { return svgWrap(72, 56, '<rect width="72" height="56" fill="#5c4028"/><rect x="3" y="3" width="66" height="50" fill="#c49a66"/><rect x="5" y="5" width="62" height="46" fill="#b78c5a" opacity=".6"/>'); },
    'item.shelf': function () { return svgWrap(56, 14, '<rect x="0" y="8" width="56" height="4" fill="#5c4028"/><rect x="0" y="12" width="56" height="2" fill="#3a2a18"/><rect x="6" y="12" width="2" height="2" fill="#3a2a18"/><rect x="48" y="12" width="2" height="2" fill="#3a2a18"/>'); },
    'item.curtain': function () { return svgWrap(80, 20, '<rect x="0" y="0" width="80" height="3" fill="#3a2a18"/><rect x="2" y="3" width="76" height="17" fill="#9a5058"/><rect x="10" y="3" width="2" height="17" fill="#7a4048"/><rect x="24" y="3" width="2" height="17" fill="#7a4048"/><rect x="40" y="3" width="2" height="17" fill="#7a4048"/><rect x="56" y="3" width="2" height="17" fill="#7a4048"/><rect x="70" y="3" width="2" height="17" fill="#7a4048"/>'); }
  };
  /* 320×240 기준 상자. item = 이 소품이 items 에 있을 때만 보임 */
  var LAYERS = [
    { key: 'bg.room', x: 0, y: 0, w: 320, h: 240 },
    { key: 'window', x: 40, y: 22, w: 72, h: 96 },
    { key: 'item.curtain', x: 36, y: 18, w: 80, h: 20, item: 'curtain', cls: 'curtain' },
    { key: 'lantern', x: 36, y: 12, w: 24, h: 36, cls: 'lantern' },
    { key: 'light', x: 0, y: 0, w: 320, h: 240, cls: 'light' },
    { key: 'item.board', x: 212, y: 56, w: 72, h: 56, item: 'board' },
    { key: 'item.shelf', x: 140, y: 60, w: 56, h: 14, item: 'shelf' },
    { key: 'item.moss', x: 56, y: 100, w: 20, h: 18, item: 'moss' },
    { key: 'item.crate', x: 222, y: 116, w: 44, h: 36, item: 'crate' },
    { key: 'item.candle', x: 236, y: 96, w: 14, h: 22, item: 'candle', cls: 'candle' },
    { key: 'item.blanket', x: 92, y: 176, w: 56, h: 20, item: 'blanket' }
  ];
  /* §7.1 표 (발끝 좌표). window 는 창턱 '앞'으로 내렸다 */
  var ANCHORS = { door: [296, 196], window: [90, 138], crate: [214, 150], board: [244, 112], blanket: [120, 186], center: [160, 180] };

  function supported() { return true; }

  function init(container, opts) {
    opts = opts || {};
    var on = opts.on || {};
    var st = { lantern: opts.lantern | 0, items: (opts.items || []).slice(), weather: opts.weather || 'rain', color: opts.color || '#e8463c',
      posters: [], souvenirs: [], reduced: !!opts.reducedMotion, speed: opts.speed > 0 ? opts.speed : 1, octState: 'idle', paused: false, ready: false };
    var assetPath = typeof opts.assetPath === 'function' ? opts.assetPath : function () { return null; };
    var stage = container.querySelector('#stage'), layersEl = container.querySelector('#layers'), fx = container.querySelector('#window-fx');
    var souvRow = container.querySelector('#souvenir-row'), wall = container.querySelector('#wall-posts');
    var octEl = opts.octEl || container.querySelector('#oct'), inner = octEl.querySelector('#oct-inner'), bub = octEl.querySelector('#oct-bubble');
    var oct = { x: 160, y: 180, flip: false, walking: null, anchor: 'window' };
    var layerEls = {}, bubbleTimer = null, unbind = [];
    container.classList.add('mode-2d');

    /* 몸 색: 인라인 SVG 의 빨강/어두운 빨강 채움을 태그해 두고 바꾼다 */
    octEl.querySelectorAll('[fill="#e8463c"]').forEach(function (e) { e.setAttribute('data-c', 'body'); });
    octEl.querySelectorAll('[fill="#d93d33"]').forEach(function (e) { e.setAttribute('data-c', 'dark'); });
    octEl.querySelectorAll('[stroke="#e8463c"]').forEach(function (e) { e.setAttribute('data-c', 'lid'); });
    function setColor(hex) {
      if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return;
      st.color = hex; var dark = shade(hex, -0.12);
      octEl.querySelectorAll('[data-c="body"]').forEach(function (e) { e.setAttribute('fill', hex); });
      octEl.querySelectorAll('[data-c="dark"]').forEach(function (e) { e.setAttribute('fill', dark); });
      octEl.querySelectorAll('[data-c="lid"]').forEach(function (e) { e.setAttribute('stroke', hex); });
    }

    /* ───────── 레이어 ───────── */
    function windowMode() { return st.weather === 'clear' || st.weather === 'snow' ? 'stars' : st.weather === 'drizzle' ? 'drizzle' : 'rain'; }
    function layerAssetKey(L) {
      if (L.key === 'window') return 'window.' + windowMode();
      if (L.key === 'lantern') return st.lantern > 0 ? 'lantern.on' : 'lantern.off';
      if (L.key === 'light') return 'light.lantern' + st.lantern;
      return L.key;
    }
    function layerPlaceholder(L) {
      if (L.key === 'window') return PH.window(windowMode());
      if (L.key === 'lantern') return PH.lantern(st.lantern);
      if (L.key === 'light') return PH.light(st.lantern);
      return PH[L.key] ? PH[L.key]() : svgWrap(L.w, L.h, '');
    }
    function buildLayer(L, animate) {
      var el = h('div', { class: 'layer' + (L.cls ? ' ' + L.cls : '') + (animate ? ' enter' : ''), 'data-key': L.key });
      el.style.cssText = 'left:' + L.x + 'px;top:' + L.y + 'px;width:' + L.w + 'px;height:' + L.h + 'px;z-index:' + (L.key === 'bg.room' ? 0 : L.key === 'light' ? 3 : 2);
      el.innerHTML = layerPlaceholder(L);
      var path = assetPath(layerAssetKey(L));
      if (path) {
        var img = new Image(); img.alt = ''; img.decoding = 'async';
        img.onload = function () { el.classList.add('has-img'); };
        img.onerror = function () { img.remove(); el.classList.remove('has-img'); };
        img.src = path; el.appendChild(img);
      }
      return el;
    }
    function renderLayers(force) {
      if (!layersEl) return;
      var lightOn = st.lantern >= 1;
      LAYERS.forEach(function (L) {
        var want = L.item ? st.items.indexOf(L.item) >= 0 : (L.key === 'light' ? lightOn : true), cur = layerEls[L.key];
        var sig = want ? layerAssetKey(L) : null;
        if (!want) { if (cur) { cur.remove(); delete layerEls[L.key]; } return; }
        if (cur && cur.dataset.sig === sig && !force) return;
        var el = buildLayer(L, st.ready && !cur);
        el.dataset.sig = sig;
        if (cur) cur.replaceWith(el); else layersEl.appendChild(el);
        layerEls[L.key] = el;
      });
      renderWindowFx();
      container.dataset.items = st.items.join(' ');
    }
    function renderWindowFx() {
      if (!fx) return;
      var mode = st.weather;
      if (fx.dataset.mode === mode) return;
      fx.dataset.mode = mode; fx.innerHTML = '';
      var n = mode === 'rain' ? 14 : mode === 'drizzle' ? 6 : mode === 'snow' ? 8 : 0;
      for (var i = 0; i < n; i++) {
        var d = h('div', { class: 'rdrop' + (mode === 'drizzle' ? ' light' : mode === 'snow' ? ' snow' : '') });
        d.style.cssText = 'left:' + Math.floor(Math.random() * 64) + 'px;animation-duration:' + ((mode === 'snow' ? 2.2 : 0.7) + Math.random() * 0.6).toFixed(2) + 's;animation-delay:' + (Math.random() * 2).toFixed(2) + 's';
        fx.appendChild(d);
      }
      if (windowMode() === 'stars') for (var k = 0; k < 7; k++) {
        var s2 = h('div', { class: 'star' });
        s2.style.cssText = 'left:' + Math.floor(Math.random() * 60 + 2) + 'px;top:' + Math.floor(Math.random() * 30 + 2) + 'px;animation-delay:' + (Math.random() * 3).toFixed(2) + 's';
        fx.appendChild(s2);
      }
    }
    function fit() {
      var wdt = container.clientWidth || 320;
      var px = wdt >= 320 ? Math.max(1, Math.floor(wdt / 320)) : wdt / 320;
      if (wdt >= 320 && px * 240 > window.innerHeight * 0.62) px = Math.max(1, Math.floor(window.innerHeight * 0.62 / 240));
      container.style.setProperty('--px', String(px));
    }

    /* ───────── 포스터 벽 · 기념품 ───────── */
    function wallSlotPos() { var n = Math.min(st.posters.length - 1, 4); if (n < 0) n = 0; return [216 + (n % 4) * 16, 62 + Math.floor(n / 4) * 21]; }
    function renderWall() {
      if (!wall) return;
      var all = st.posters, show = all.slice(-5), prev = wall.dataset.n | 0;
      wall.innerHTML = '';
      show.forEach(function (p, i) {
        var b = h('button', { type: 'button', class: 'wall-mini' + (i === show.length - 1 && all.length > prev ? ' landed' : ''), 'aria-label': (p.title || '포스터') + ' 열기', html: p.svg || '' });
        b.style.transform = 'rotate(' + (((hash(p.id) % 7) - 3) * 1.2).toFixed(1) + 'deg)';
        b.addEventListener('click', function () { if (on.posterTap) on.posterTap(p.id); });
        wall.appendChild(b);
      });
      if (all.length > 5) wall.appendChild(h('button', { type: 'button', class: 'wall-more', text: '+' + (all.length - 5), 'aria-label': '앨범으로', onclick: function () { if (on.albumTap) on.albumTap(); } }));
      wall.dataset.n = all.length;
      container.dataset.posters = String(all.length);
    }
    function renderSouvenirs() {
      if (!souvRow) return;
      souvRow.innerHTML = '';
      var shelf = st.items.indexOf('shelf') >= 0;
      st.souvenirs.forEach(function (sv, i) {
        var x = shelf ? 146 + (i % 6) * 9 : 82 + (i % 3) * 10, y = shelf ? 68 - Math.floor(i / 6) * 10 : 116;
        var b = h('button', { type: 'button', class: 'souv', title: sv.name || sv.id, 'aria-label': (sv.name || sv.id) + ' 기념품' });
        if (sv.img) { var img = new Image(); img.alt = ''; img.src = sv.img; img.onerror = function () { img.replaceWith(document.createTextNode(sv.emoji || '•')); }; b.appendChild(img); }
        else b.textContent = sv.emoji || '•';
        b.style.left = x + 'px'; b.style.top = y + 'px';
        b.addEventListener('click', function () { if (on.souvenirTap) on.souvenirTap(sv); });
        souvRow.appendChild(b);
      });
    }

    /* ───────── 문어 ───────── */
    function octPlace(x, y) { oct.x = Math.round(x); oct.y = Math.round(y); octEl.style.transform = 'translate(' + (oct.x - 24) + 'px,' + (oct.y - 48) + 'px)'; }
    function octFlip(f) { oct.flip = !!f; octEl.classList.toggle('flip', oct.flip); }
    function setCarry(onOff) {
      var c = inner.querySelector('.carry-poster');
      if (onOff && !c) inner.appendChild(h('div', { class: 'carry-poster' }));
      if (!onOff && c) c.remove();
    }
    function setOctState(s) {
      st.octState = s;
      octEl.className = octEl.className.replace(/\bst-[a-z]+/g, '').trim() + ' st-' + s + (oct.flip ? ' flip' : '');
      if (s === 'carry') setCarry(true);
      else if (s === 'hang') { setCarry(false); flyPoster(); }
      else setCarry(false);
    }
    function flyPoster() {
      if (!stage || st.reduced) return;
      var fly = h('div', { class: 'fly', html: (st.carrySvg || '') });
      var target = wallSlotPos();
      fly.style.transform = 'translate(' + (oct.x + 6) + 'px,' + (oct.y - 40) + 'px)';
      stage.appendChild(fly);
      requestAnimationFrame(function () { requestAnimationFrame(function () { fly.style.transform = 'translate(' + target[0] + 'px,' + target[1] + 'px)'; }); });
      setTimeout(function () { fly.remove(); }, 520 * st.speed);
    }
    function anchorPos(name) { return ANCHORS[name] || ANCHORS.center; }
    function jumpTo(anchor) { var p = anchorPos(anchor); if (oct.walking) { oct.walking.cancel(); oct.walking = null; } oct.anchor = anchor; octPlace(p[0], p[1]); }
    function moveTo(anchor) {
      var to = anchorPos(anchor), from = [oct.x, oct.y];
      oct.anchor = anchor;
      if (oct.walking) { oct.walking.cancel(); oct.walking = null; }
      var dx = to[0] - from[0], dy = to[1] - from[1], dist = Math.sqrt(dx * dx + dy * dy);
      if (dx !== 0) octFlip(dx < 0);
      function done() { if (on.anchorReached) on.anchorReached(anchor); }
      if (st.reduced || dist < 1) { octPlace(to[0], to[1]); done(); return Promise.resolve(anchor); }
      var dur = dist / 40 * 1000 * st.speed, start = null, raf = 0, cancelled = false;
      var p = new Promise(function (resolve) {
        function step(ts) {
          if (cancelled) return;
          if (start == null) start = ts;
          var k = Math.min(1, (ts - start) / dur);
          octPlace(from[0] + dx * k, from[1] + dy * k);
          if (k < 1) raf = requestAnimationFrame(step); else { oct.walking = null; done(); resolve(anchor); }
        }
        raf = requestAnimationFrame(step);
      });
      oct.walking = { cancel: function () { cancelled = true; cancelAnimationFrame(raf); } };
      return p;
    }
    function pupilsTowards(clientX, clientY) {
      var r = octEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var dx = clamp((clientX - cx) / 200, -1, 1), dy = clamp((clientY - cy) / 200, -1, 1);
      octEl.querySelectorAll('.pupil').forEach(function (p) { p.style.transform = 'translate(' + (dx * 0.8).toFixed(2) + 'px,' + (dy * 0.8).toFixed(2) + 'px)'; });
    }
    function bubble(text, ms) {
      if (!bub) return;
      clearTimeout(bubbleTimer);
      if (!text) { bub.hidden = true; return; }
      bub.textContent = text; bub.hidden = false;
      bubbleTimer = setTimeout(function () { bub.hidden = true; }, ms || 2600);
    }
    function octScreenPos() { var r = octEl.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top }; }

    /* ───────── 입력 ───────── */
    var pressT = null, moved = false;
    function listen(el, ev, fn, o) { el.addEventListener(ev, fn, o); unbind.push(function () { el.removeEventListener(ev, fn, o); }); }
    listen(octEl, 'pointerdown', function (e) { moved = false; clearTimeout(pressT); pressT = setTimeout(function () { if (on.pet) on.pet(); }, 350); e.preventDefault(); });
    listen(octEl, 'pointermove', function () { moved = true; });
    listen(octEl, 'pointerup', function () { clearTimeout(pressT); if (!moved && st.octState !== 'pet' && on.tap) on.tap(); });
    listen(octEl, 'pointercancel', function () { clearTimeout(pressT); });
    listen(container, 'click', function (e) {
      var t = e.target.closest ? e.target.closest('.layer[data-key="window"]') : null;
      if (t && on.windowTap) on.windowTap();
    });
    listen(document, 'pointermove', function (e) { if (e.pointerType !== 'touch' && st.octState !== 'sleep') pupilsTowards(e.clientX, e.clientY); }, { passive: true });
    listen(window, 'resize', fit);
    listen(document, 'visibilitychange', function () { if (!document.hidden) fit(); });

    /* ───────── 초기 렌더 ───────── */
    fit(); setColor(st.color); renderLayers(true); renderWall(); renderSouvenirs();
    st.ready = true;

    return {
      kind: '2d',
      setLantern: function (n) { st.lantern = n | 0; renderLayers(false); },
      setItems: function (items) { st.items = (items || []).slice(); renderLayers(false); renderSouvenirs(); },
      setWeather: function (w) { st.weather = w || 'rain'; renderLayers(false); },
      setTime: function () { /* 2D 는 시각 조명 없음 */ },
      setColor: setColor,
      setOctState: setOctState,
      setCarry: function (svg) { st.carrySvg = svg || ''; },
      moveTo: moveTo, jumpTo: jumpTo,
      setPosters: function (list) { st.posters = (list || []).slice(); renderWall(); },
      setSouvenirs: function (list) { st.souvenirs = (list || []).slice(); renderSouvenirs(); },
      bubble: bubble, lookAt: pupilsTowards, octScreenPos: octScreenPos,
      setReducedMotion: function (r) { st.reduced = !!r; },
      setLook: function () { /* 3D 전용 */ }, setPalette: function () { /* 3D 전용 */ }, paletteName: function () { return 'ramps'; }, palette: function () { return []; }, stats: function () { return { calls: 0 }; },
      refresh: function () { renderLayers(true); renderSouvenirs(); },
      pause: function () { st.paused = true; }, resume: function () { st.paused = false; },
      destroy: function () { unbind.forEach(function (f) { f(); }); unbind = []; if (oct.walking) oct.walking.cancel(); container.classList.remove('mode-2d'); },
      anchors: ANCHORS, placeholders: PH
    };
  }

  return { supported: supported, init: init, PH: PH, ANCHORS: ANCHORS };
})();
