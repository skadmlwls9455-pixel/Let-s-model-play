/* 일주 부적 공방 — 화면과 상태.
 * 상태(S) 하나를 고치면 → 카드 두 장을 다시 그리고 → 잠시 뒤 이 브라우저에 저장한다.
 */
(function () {
  'use strict';
  var BJ = window.BJ, G = BJ.ganji, C = BJ.card, P = BJ.props, F = BJ.fonts;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function esc(s) { return BJ.draw.esc(s == null ? '' : s); }

  /* ─────────────── 상태 ─────────────── */

  function defaultYear() { var d = new Date(); return d.getMonth() >= 9 ? d.getFullYear() + 1 : d.getFullYear(); }
  function uid() { return 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  var STYLE_KEYS = ['layout', 'font', 'stretch', 'textWeight', 'sizes', 'paper', 'ink', 'rough', 'paperGrain', 'frame', 'rays', 'headerLines',
    'footer', 'sideDots', 'charMode', 'ground', 'charScale', 'theme', 'symmetric', 'seal', 'year', 'yearFmt', 'yearCustom', 'topText', 'bottomText'];

  function fresh() {
    return {
      v: 1, id: uid(), name: '', createdAt: Date.now(), updatedAt: Date.now(),
      ilju: 0, gender: 'f',
      year: defaultYear(), yearFmt: 'num-hj', yearCustom: '',
      layout: 'split', topText: '건강', bottomText: '부적',
      font: 'Poor Story', stretch: 1.34, textWeight: 1.5, sizes: { year: 1, top: 1, bottom: 1 },
      paper: '#F2BE35', ink: '#C93B22', rough: 1, paperGrain: false,
      frame: 'stamp', rays: true, headerLines: true, footer: true, sideDots: true,
      charMode: 'color', ground: false, charScale: 1, charFlip: false,
      theme: 'health', items: [], symmetric: true,
      offsets: {},
      seal: { text: '', where: 'back', style: 'fill', pos: {} },
      back: { frame: true, image: null, mode: 'normal', fit: { dx: 0, dy: 0, s: 1 }, caption: '' },
      worry: '', ideas: null
    };
  }

  function migrate(d) {
    var f = fresh(), out = Object.assign(f, d || {});
    out.sizes = Object.assign(fresh().sizes, d && d.sizes);
    out.seal = Object.assign(fresh().seal, d && d.seal);
    out.seal.pos = out.seal.pos || {};
    out.back = Object.assign(fresh().back, d && d.back);
    out.back.fit = Object.assign({ dx: 0, dy: 0, s: 1 }, out.back.fit);
    out.offsets = out.offsets || {};
    out.items = Array.isArray(out.items) ? out.items.filter(function (it) { return it && P.P[it.prop]; }) : [];
    return out;
  }

  var S = fresh();
  var dirty = false;
  var ui = { view: 'front', sel: null, selSide: 'front', drawerCat: 'deco', customChars: {}, llm: null, running: null };

  function getPath(o, path) { return path.split('.').reduce(function (a, k) { return a == null ? undefined : a[k]; }, o); }
  function setPath(o, path, v) {
    var ks = path.split('.'), last = ks.pop();
    var t = ks.reduce(function (a, k) { if (a[k] == null || typeof a[k] !== 'object') a[k] = {}; return a[k]; }, o);
    t[last] = v;
  }

  /* ─────────────── 계산된 값 ─────────────── */

  function yearText() {
    var y = S.year | 0, gi = G.yearIndex(y), st = G.STEMS[gi % 10], br = G.BRANCHES[gi % 12], el = G.ELEMENTS[st.el];
    switch (S.yearFmt) {
      case 'num': return String(y);
      case 'num-ko': return y + ' ' + st.ko + br.ko + '년';
      case 'hj': return st.hj + br.hj + '年';
      case 'animal': return y + ' ' + el.color + ' ' + br.name + '의 해';
      case 'custom': return S.yearCustom || '';
      case 'none': return '';
      default: return y + ' ' + st.hj + br.hj + '年';
    }
  }

  function layout() { return C.LAYOUTS[S.layout] || C.LAYOUTS.split; }

  function absItems() {
    var lay = layout();
    return S.items.map(function (it) {
      if (!it.slot) return it;
      var pos = lay.slots[it.slot] || [300, 450];
      return { prop: it.prop, x: pos[0] + (it.dx || 0), y: pos[1] + (it.dy || 0), s: it.s, r: it.r, flip: it.flip };
    });
  }

  function renderState() {
    var rf = F.resolve(S.font);
    return Object.assign({}, S, { items: absItems(), fontFamily: rf.family, fontWeight: rf.weight });
  }

  function customChar() { return ui.customChars['char:' + S.ilju + ':' + S.gender] || null; }

  function env(uidTag, extra) {
    var rf = F.resolve(S.font), cc = customChar();
    return Object.assign({
      uid: uidTag,
      yearText: yearText(),
      measure: function (txt, size) { return F.measure(txt, rf.family, rf.weight, size); },
      customChar: cc ? cc.dataURL : null,
      customCharMode: cc ? cc.mode : null,
      backImage: S.back.image || null
    }, extra || {});
  }

  /* ─────────────── 그리기 ─────────────── */

  var frontHost = $('#frontHost'), backHost = $('#backHost');
  var raf = 0;
  function requestRender() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; render(); }); }

  function render() {
    var rs = renderState();
    frontHost.innerHTML = C.front(rs, env('f'));
    backHost.innerHTML = C.back(rs, env('b'));
    $('#backHint').hidden = !!S.back.image;
    updateSel();
    updateWho();
  }

  function updateWho() {
    var info = G.ilju(S.ilju);
    $('#whoLine').textContent = (S.name ? S.name + ' · ' : '') + info.ko + '일주 ' + (S.gender === 'm' ? '남' : '여') + ' · ' + info.title;
  }

  /* ─────────────── 저장 ─────────────── */

  var saveTimer = 0;
  function setSaveState(t) { $('#saveState').textContent = t; }
  function markDirty() {
    dirty = true;
    clearTimeout(saveTimer);
    setSaveState('저장 중…');
    saveTimer = setTimeout(save, 500);
  }
  function save() {
    if (!dirty) return Promise.resolve();
    S.updatedAt = Date.now();
    var copy = JSON.parse(JSON.stringify(S));
    return Promise.all([BJ.store.put('designs', S.id, copy), BJ.store.put('kv', 'current', S.id)])
      .then(function () { dirty = false; setSaveState('저장됨'); })
      .catch(function () { setSaveState('저장 실패 — 보관함에서 백업 파일을 받아 두세요'); });
  }
  window.addEventListener('beforeunload', function () { if (dirty) save(); });

  /* ─────────────── 바꾸기 ─────────────── */

  function change(path, v) {
    setPath(S, path, v);
    if (path === 'ilju' || path === 'gender' || path === 'charMode' || path === 'ink' || path === 'paper') buildGrid();
    if (path === 'ilju' || path === 'gender') { showIljuNow(); syncCustomChar(); }
    if (path === 'font') ensureFont();
    if (path === 'yearFmt') $('#rowYearCustom').hidden = v !== 'custom';
    if (path === 'layout') { ui.sel = null; }
    syncControls();
    requestRender();
    markDirty();
  }

  function ensureFont() {
    var rf = F.resolve(S.font);
    F.ensure(rf.family, rf.weight, yearText() + S.topText + S.bottomText).then(requestRender);
  }

  /* data-bind 로 묶인 입력들 */
  function bindControls() {
    $$('[data-bind]').forEach(function (el) {
      var path = el.getAttribute('data-bind');
      if (el.classList.contains('seg')) {
        el.addEventListener('click', function (e) {
          var b = e.target.closest('button[data-v]');
          if (b) change(path, b.getAttribute('data-v'));
        });
        return;
      }
      var ev = (el.type === 'checkbox' || el.tagName === 'SELECT' || el.type === 'color') ? 'change' : 'input';
      el.addEventListener(ev, function () {
        var v = el.type === 'checkbox' ? el.checked : (el.type === 'range' || el.type === 'number') ? parseFloat(el.value) : el.value;
        if (el.type === 'number' && (isNaN(v) || v < 1900 || v > 2200)) return;
        change(path, v);
      });
    });
  }

  function syncControls() {
    $$('[data-bind]').forEach(function (el) {
      var v = getPath(S, el.getAttribute('data-bind'));
      if (el.classList.contains('seg')) {
        $$('button[data-v]', el).forEach(function (b) { b.classList.toggle('on', String(v) === b.getAttribute('data-v')); });
      } else if (el.type === 'checkbox') {
        el.checked = !!v;
      } else if (document.activeElement !== el) {
        el.value = v == null ? '' : v;
      }
    });
    $('#outStretch').textContent = '×' + (+S.stretch).toFixed(2);
    $('#rowYearCustom').hidden = S.yearFmt !== 'custom';
    $$('#paletteChips .chip').forEach(function (b) { b.classList.toggle('on', b.dataset.paper === S.paper && b.dataset.ink === S.ink); });
    $$('#themeChips .chip').forEach(function (b) { b.classList.toggle('on', b.dataset.theme === S.theme); });
    syncSlots();
    var yf = $('#inYearFmt');
    if (yf) {   /* 표기 예시를 지금 해로 */
      var y = S.year | 0, gi = G.yearIndex(y), st = G.STEMS[gi % 10], br = G.BRANCHES[gi % 12], el2 = G.ELEMENTS[st.el];
      var ex = { 'num-hj': y + ' ' + st.hj + br.hj + '年', 'num-ko': y + ' ' + st.ko + br.ko + '년', hj: st.hj + br.hj + '年', num: String(y), animal: y + ' ' + el2.color + ' ' + br.name + '의 해' };
      $$('option', yf).forEach(function (o) { if (ex[o.value]) o.textContent = ex[o.value]; });
    }
  }

  /* ─────────────── ① 일주 ─────────────── */

  function buildGrid() {
    var h = '';
    for (var i = 0; i < 60; i++) {
      var info = G.ilju(i), mine = ui.customChars['char:' + i + ':' + S.gender];
      h += '<button class="ij' + (i === S.ilju ? ' on' : '') + (mine ? ' mine' : '') + '" data-i="' + i + '" role="option" aria-selected="' + (i === S.ilju) + '" title="' + info.ko + '일주 · ' + info.title + '">' +
        (mine ? '<img alt="" src="' + mine.dataURL + '">' : BJ.chars.svg(i, S.gender, { mode: S.charMode, ink: S.ink, paper: S.paper })) +
        '<span>' + info.ko + '</span></button>';
    }
    $('#iljuGrid').innerHTML = h;
  }

  function showIljuNow() {
    var info = G.ilju(S.ilju);
    $('#iljuNow').innerHTML = '<b>' + info.ko + '일주 (' + info.hj + ')</b> · ' + esc(info.title) + ' <span class="sw sw-' + info.el + '"></span>' +
      '<br><span class="dim">' + esc(info.imagery) + ' · ' + esc(info.item.ko) + '</span>';
  }

  function syncCustomChar() {
    var cc = customChar();
    $('#customCharState').textContent = cc ? '지금 일주에 내 그림이 들어가 있어요.' : '지금은 기본 캐릭터예요.';
    $$('#segCharMode button').forEach(function (b) { b.classList.toggle('on', !!cc && cc.mode === b.dataset.v); });
  }

  /* ─────────────── ③ 장식 ─────────────── */

  var NO_FLIP = { pass: 1, bok: 1, gil: 1, su: 1, hee: 1, daegil: 1 };
  var SLOT_ORDER = ['tl', 'tr', 'hl', 'hr', 'ml', 'mr', 'fl', 'fr', 'bl', 'br'];

  function slotItem(slot, prop) {
    return { slot: slot, prop: prop, dx: 0, dy: 0, s: C.SLOT_SIZE[slot] || 0.7, r: 0, flip: /r$/.test(slot) && !NO_FLIP[prop] };
  }

  function applyTheme(id) {
    var th = C.THEMES[id] || C.THEMES.empty;
    S.items = S.items.filter(function (it) { return !it.slot; });
    SLOT_ORDER.forEach(function (slot) { if (th.slots[slot]) S.items.push(slotItem(slot, th.slots[slot])); });
    S.theme = id;
    ui.sel = null;
  }

  function setSlot(slot, prop) {
    var idx = -1;
    S.items.forEach(function (it, i) { if (it.slot === slot) idx = i; });
    if (!prop) { if (idx >= 0) S.items.splice(idx, 1); return; }
    if (idx >= 0) { S.items[idx].prop = prop; S.items[idx].flip = /r$/.test(slot) && !NO_FLIP[prop]; }
    else S.items.push(slotItem(slot, prop));
  }

  function propOptions() {
    var h = '<option value="">(비움)</option>';
    P.CATS.forEach(function (cat) {
      h += '<optgroup label="' + cat.name + '">';
      Object.keys(P.P).forEach(function (k) { if (P.P[k].cat === cat.id) h += '<option value="' + k + '">' + P.P[k].name + '</option>'; });
      h += '</optgroup>';
    });
    return h;
  }

  function buildSlots() {
    var opts = propOptions(), h = '';
    SLOT_ORDER.forEach(function (slot) {
      h += '<label class="slot"><span>' + C.SLOT_NAMES[slot] + '</span><select data-slot="' + slot + '">' + opts + '</select></label>';
    });
    $('#slotList').innerHTML = h;
    $$('#slotList select').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var slot = sel.dataset.slot, v = sel.value;
        setSlot(slot, v);
        if (S.symmetric && C.SLOT_PAIRS[slot]) setSlot(C.SLOT_PAIRS[slot], v);
        S.theme = '';
        ui.sel = null;
        syncControls(); requestRender(); markDirty();
      });
    });
  }

  function syncSlots() {
    var map = {};
    S.items.forEach(function (it) { if (it.slot) map[it.slot] = it.prop; });
    $$('#slotList select').forEach(function (sel) { sel.value = map[sel.dataset.slot] || ''; });
  }

  function iconSVG(id) {
    return '<svg viewBox="-46 -46 92 92" aria-hidden="true">' + P.render({ prop: id, x: 0, y: 0, s: 1 }, S.ink, '#FFF7E6') + '</svg>';
  }

  function buildDrawer() {
    $('#drawerTabs').innerHTML = P.CATS.map(function (c) { return '<button class="chip' + (c.id === ui.drawerCat ? ' on' : '') + '" data-cat="' + c.id + '" type="button">' + c.name + '</button>'; }).join('');
    var h = '';
    Object.keys(P.P).forEach(function (k) {
      if (P.P[k].cat !== ui.drawerCat) return;
      h += '<button class="prop" data-prop="' + k + '" type="button" title="' + P.P[k].name + '">' + iconSVG(k) + '<span>' + P.P[k].name + '</span></button>';
    });
    $('#drawer').innerHTML = h;
  }

  /* ─────────────── 고르기 · 끌기 ─────────────── */

  var NAMES = { year: '해 (맨 윗줄)', top: '윗줄', bottom: '아랫줄', char: '캐릭터', caption: '뒷면 한 마디', 'seal-front': '낙관', 'seal-back': '낙관', backimg: '뒷면 그림' };
  var SEAL_DEFAULT = { front: { x: 476, y: 846, s: 1 }, back: { x: 470, y: 790, s: 1 } };

  function handle(id) {
    if (!id) return null;
    if (id.indexOf('item:') === 0) {
      var i = +id.slice(5), it = S.items[i];
      if (!it) return null;
      return {
        name: (P.P[it.prop] || {}).name || '장식', item: true,
        get: function () { return it.slot ? [it.dx || 0, it.dy || 0] : [it.x, it.y]; },
        set: function (x, y) { if (it.slot) { it.dx = x; it.dy = y; } else { it.x = x; it.y = y; } },
        scale: function (f) { it.s = clamp((it.s || 1) * f, 0.2, 4); },
        rotate: function (d) { it.r = ((it.r || 0) + d) % 360; },
        flip: function () { it.flip = !it.flip; },
        dup: function () {
          var a = absItems()[i], c = { prop: it.prop, x: a.x + 24, y: a.y + 24, s: it.s, r: it.r, flip: it.flip };
          S.items.push(c); return 'item:' + (S.items.length - 1);
        },
        del: function () { S.items.splice(i, 1); },
        reset: function () { if (it.slot) { it.dx = 0; it.dy = 0; it.s = C.SLOT_SIZE[it.slot] || 0.7; } it.r = 0; }
      };
    }
    if (/^(year|top|bottom|char|caption)$/.test(id)) {
      var o = function () { return (S.offsets[id] = S.offsets[id] || {}); };
      return {
        name: NAMES[id],
        get: function () { return [o().dx || 0, o().dy || 0]; },
        set: function (x, y) { o().dx = x; o().dy = y; },
        scale: function (f) { o().s = clamp((o().s || 1) * f, 0.3, 3); },
        rotate: function (d) { o().r = ((o().r || 0) + d) % 360; },
        flip: id === 'char' ? function () { S.charFlip = !S.charFlip; } : null,
        reset: function () { delete S.offsets[id]; }
      };
    }
    if (id === 'seal-front' || id === 'seal-back') {
      var side = id.slice(5);
      var q = function () { return (S.seal.pos[side] = S.seal.pos[side] || Object.assign({}, SEAL_DEFAULT[side])); };
      return {
        name: NAMES[id],
        get: function () { return [q().x, q().y]; },
        set: function (x, y) { q().x = x; q().y = y; },
        scale: function (f) { q().s = clamp((q().s || 1) * f, 0.4, 3); },
        reset: function () { delete S.seal.pos[side]; }
      };
    }
    if (id === 'backimg') {
      var fit = S.back.fit;
      return {
        name: NAMES[id],
        get: function () { return [fit.dx || 0, fit.dy || 0]; },
        set: function (x, y) { fit.dx = x; fit.dy = y; },
        scale: function (f) { fit.s = clamp((fit.s || 1) * f, 0.2, 3); },
        reset: function () { fit.dx = 0; fit.dy = 0; fit.s = 1; }
      };
    }
    return null;
  }

  function select(id, side) {
    ui.sel = id; ui.selSide = side || ui.selSide;
    updateSel();
  }

  function updateSel() {
    var h = handle(ui.sel);
    $$('.selbox').forEach(function (b) { b.hidden = true; });
    if (!h) { $('#selbar').hidden = true; ui.sel = null; return; }
    var wrap = $('.card-wrap[data-side="' + ui.selSide + '"]'), host = $('.card-host', wrap);
    var els = $$('[data-el="' + ui.sel + '"]', host);
    if (!els.length) { $('#selbar').hidden = true; return; }
    var r0 = wrap.getBoundingClientRect(), box = null;
    els.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (!r.width && !r.height) return;
      box = box ? { l: Math.min(box.l, r.left), t: Math.min(box.t, r.top), r: Math.max(box.r, r.right), b: Math.max(box.b, r.bottom) } : { l: r.left, t: r.top, r: r.right, b: r.bottom };
    });
    var sb = $('.selbox', wrap);
    if (box && wrap.offsetParent !== null) {
      sb.hidden = false;
      sb.style.left = (box.l - r0.left - 4) + 'px'; sb.style.top = (box.t - r0.top - 4) + 'px';
      sb.style.width = (box.r - box.l + 8) + 'px'; sb.style.height = (box.b - box.t + 8) + 'px';
    }
    $('#selbar').hidden = false;
    $('#selName').textContent = h.name;
    $$('#selbar [data-act]').forEach(function (b) {
      var a = b.dataset.act, ok = a === 'smaller' || a === 'bigger' || a === 'reset' ||
        (a === 'rotL' || a === 'rotR') && !!h.rotate || a === 'flip' && !!h.flip || (a === 'dup' || a === 'del') && !!h.item;
      b.hidden = !ok;
    });
  }

  function act(a) {
    var h = handle(ui.sel);
    if (!h) return;
    if (a === 'smaller') h.scale(1 / 1.1);
    else if (a === 'bigger') h.scale(1.1);
    else if (a === 'rotL' && h.rotate) h.rotate(-10);
    else if (a === 'rotR' && h.rotate) h.rotate(10);
    else if (a === 'flip' && h.flip) h.flip();
    else if (a === 'dup' && h.dup) ui.sel = h.dup();
    else if (a === 'del' && h.del) { h.del(); ui.sel = null; }
    else if (a === 'reset') h.reset();
    syncControls(); requestRender(); markDirty();
  }

  function toSvg(svg, e) {
    var pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  var drag = null;
  function bindDrag(host, side) {
    host.addEventListener('pointerdown', function (e) {
      var g = e.target.closest && e.target.closest('[data-el]');
      if (!g) { select(null); return; }
      var id = g.getAttribute('data-el'), h = handle(id), svg = host.querySelector('svg');
      if (!h || !svg) return;
      select(id, side);
      drag = { host: host, h: h, p0: toSvg(svg, e), orig: h.get(), moved: false };
      try { host.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault();
    });
    host.addEventListener('pointermove', function (e) {
      if (!drag || drag.host !== host) return;
      var svg = host.querySelector('svg'), p = toSvg(svg, e), dx = p.x - drag.p0.x, dy = p.y - drag.p0.y;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 3) return;
      drag.moved = true;
      document.body.classList.add('dragging');
      drag.h.set(drag.orig[0] + dx, drag.orig[1] + dy);
      requestRender();
    });
    function end() {
      if (!drag) return;
      var moved = drag.moved;
      drag = null;
      document.body.classList.remove('dragging');
      if (moved) { requestRender(); markDirty(); }
    }
    host.addEventListener('pointerup', end);
    host.addEventListener('pointercancel', end);
    host.addEventListener('wheel', function (e) {
      if (!ui.sel || ui.selSide !== side) return;
      var g = e.target.closest && e.target.closest('[data-el="' + ui.sel + '"]');
      if (!g) return;
      e.preventDefault();
      handle(ui.sel).scale(e.deltaY < 0 ? 1.05 : 1 / 1.05);
      requestRender(); markDirty();
    }, { passive: false });
  }

  /* ─────────────── 올린 그림 ─────────────── */

  function readImage(file, max) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
        var c = document.createElement('canvas');
        c.width = Math.round(w * k); c.height = Math.round(h * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/png'));
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('그림을 읽지 못했어요')); };
      img.src = url;
    });
  }

  function toast(t, ms) {
    var el = $('#toast');
    el.textContent = t; el.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { el.hidden = true; }, ms || 2600);
  }

  /* ─────────────── ⑥ 그림 프롬프트 ─────────────── */

  var STYLE_DEFAULT = 'simple hand-drawn doodle illustration, clean red marker line art on mustard yellow paper, Korean talisman card, cute chibi, flat colors, minimal shading, centered composition, plenty of empty space, no text';
  var NEG_DEFAULT = 'text, letters, watermark, signature, realistic, photo, 3d render, gradient, dark, scary, blurry, messy lines';

  function llmCfg() {
    if (!ui.llm) ui.llm = { engine: 'ollama', urls: {}, models: {}, style: STYLE_DEFAULT, neg: NEG_DEFAULT, n: 2 };
    return ui.llm;
  }
  function saveLlm() { BJ.store.put('kv', 'llm', ui.llm); }

  var HELP = {
    ollama: 'Ollama 를 깔고 한국어가 되는 모델을 하나 받아 두면 돼요 (예: <code>ollama pull gemma3:12b</code> · 가볍게는 <code>gemma3:4b</code> · 한국어 특화 <code>exaone3.5:7.8b</code>). 이 페이지를 <code>http://localhost</code> 로 열면 바로 되고, 다른 주소(배포한 사이트 · 파일로 열기)라면 Ollama 에 그 주소를 허락해 줘야 해요 — README 의 “Ollama 연결” 참고.',
    openai: 'LM Studio 라면 Developer 탭에서 서버를 켜고 “Enable CORS” 를 켜 주세요. 주소는 보통 <code>http://localhost:1234/v1</code>. llama.cpp 서버 · Jan 도 같은 방식이에요.',
    webllm: '설치 없이 이 브라우저 안에서 돌아가요 (크롬 · 엣지 최신판, WebGPU 필요). 처음 한 번 모델(2~3GB)을 받아서 시간이 걸리고, 그다음부터는 빨라요. 작은 모델이라 아이디어가 단순할 수 있어요.',
    rules: 'LLM 없이 고민 속 낱말(건강 · 시험 · 돈 · 연애 …)로 준비된 장면을 골라요. 언제나 되지만 고민에 꼭 맞춘 장면은 아니에요.'
  };

  function syncEngine() {
    var cfg = llmCfg(), eng = cfg.engine, def = BJ.llm.ENGINES.filter(function (e) { return e.id === eng; })[0] || BJ.llm.ENGINES[0];
    $('#inEngine').value = eng;
    $('#rowEngineUrl').hidden = !(eng === 'ollama' || eng === 'openai');
    $('#rowEngineModel').hidden = eng === 'rules';
    $('#inEngineUrl').value = cfg.urls[eng] || def.url;
    $('#inEngineModel').value = cfg.models[eng] || '';
    $('#inEngineModel').placeholder = eng === 'ollama' ? '예: gemma3:12b' : eng === 'webllm' ? '비우면 알아서 골라요' : '서버가 띄운 모델 이름';
    $('#engineHelp').innerHTML = HELP[eng];
    $('#engineBadge').textContent = def.name + (cfg.models[eng] ? ' · ' + cfg.models[eng] : '');
    $('#inStyle').value = cfg.style;
    $('#inNeg').value = cfg.neg;
    $('#inIdeas').value = String(cfg.n || 2);
  }

  function engineConf() {
    var cfg = llmCfg(), eng = cfg.engine, def = BJ.llm.ENGINES.filter(function (e) { return e.id === eng; })[0];
    return { engine: eng, url: cfg.urls[eng] || (def && def.url) || '', model: cfg.models[eng] || '' };
  }

  function llmInput() {
    return { worry: S.worry, ilju: S.ilju, gender: S.gender, yearText: yearText(), topText: S.topText, bottomText: S.bottomText, n: llmCfg().n || 2 };
  }

  function fullPrompt(p) {
    var st = (llmCfg().style || '').trim();
    return (p || '').replace(/[\s,.]+$/, '') + (st ? ', ' + st : '');
  }

  function renderIdeas() {
    var box = $('#ideas'), res = S.ideas;
    if (!res || !res.data) { box.innerHTML = ''; return; }
    var d = res.data, neg = llmCfg().neg || '';
    var h = '<div class="ideas-head"><p>' + esc(d.summary || '') + '</p><span class="dim">' + esc(res.engineName || '') + '</span></div>';
    d.ideas.forEach(function (x, i) {
      h += '<article class="idea">' +
        '<h3><span class="num">' + (i + 1) + '</span>' + esc(x.title) + '</h3>' +
        '<p class="scene">' + esc(x.scene) + '</p>' +
        '<dl>' +
        (x.pose ? '<dt>자세 · 표정</dt><dd>' + esc(x.pose) + '</dd>' : '') +
        (x.props && x.props.length ? '<dt>소품</dt><dd>' + x.props.map(function (p) { return '<span class="tag">' + esc(p) + '</span>'; }).join('') + '</dd>' : '') +
        (x.symbol ? '<dt>바뀐 것</dt><dd>' + esc(x.symbol) + '</dd>' : '') +
        (x.caption ? '<dt>한 마디</dt><dd>' + esc(x.caption) + ' <button class="link" data-cap="' + i + '" type="button">뒷면에 넣기</button></dd>' : '') +
        '</dl>' +
        '<div class="prompt"><div class="prompt-h"><b>레퍼런스 프롬프트</b><button class="btn small" data-copy="p' + i + '" type="button">복사</button></div><code id="p' + i + '">' + esc(fullPrompt(x.prompt_en)) + '</code></div>' +
        (neg ? '<div class="prompt neg"><div class="prompt-h"><b>네거티브</b><button class="btn small ghost" data-copy="n' + i + '" type="button">복사</button></div><code id="n' + i + '">' + esc(neg) + '</code></div>' : '') +
        '</article>';
    });
    h += '<button class="btn ghost small" id="btnCopyAll" type="button">아이디어 전부 글로 복사</button>';
    box.innerHTML = h;
  }

  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(function () { toast('복사했어요'); }, fallback);
    fallback();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = t; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('복사했어요'); } catch (e) { toast('복사가 막혔어요 — 직접 골라 복사해 주세요'); }
      ta.remove();
    }
    return Promise.resolve();
  }

  function ideasAsText() {
    var d = S.ideas && S.ideas.data;
    if (!d) return '';
    var info = G.ilju(S.ilju), lines = ['[' + info.ko + '일주 ' + (S.gender === 'm' ? '남' : '여') + ' · ' + info.title + '] ' + (S.name || ''), '고민: ' + S.worry, d.summary, ''];
    d.ideas.forEach(function (x, i) {
      lines.push((i + 1) + '. ' + x.title, x.scene, '자세: ' + x.pose, '소품: ' + x.props.join(', '), '바뀐 것: ' + x.symbol, '한 마디: ' + x.caption, 'Prompt: ' + fullPrompt(x.prompt_en), 'Negative: ' + (llmCfg().neg || ''), '');
    });
    return lines.join('\n');
  }

  function runIdeas() {
    if (ui.running) { ui.running.abort(); return; }
    var cfg = engineConf(), btn = $('#btnIdeas'), status = $('#llmStatus'), stream = $('#llmStream');
    var ctl = new AbortController(), engName = (BJ.llm.ENGINES.filter(function (e) { return e.id === cfg.engine; })[0] || {}).name;
    ui.running = ctl;
    btn.textContent = '멈추기';
    status.textContent = cfg.engine === 'rules' ? '' : '연결하는 중…';
    status.className = 'llm-status';
    stream.hidden = cfg.engine === 'rules';
    stream.textContent = '';
    BJ.llm.generate(cfg, llmInput(), {
      signal: ctl.signal,
      onStatus: function (t) { status.textContent = t; },
      onToken: function (t, raw) { stream.textContent = raw.slice(-1600); stream.scrollTop = stream.scrollHeight; status.textContent = '쓰는 중… (' + raw.length + '자)'; }
    }).then(function (r) {
      S.ideas = { data: r.data, engine: cfg.engine, engineName: engName + (cfg.model ? ' · ' + cfg.model : ''), at: Date.now() };
      status.textContent = '';
      stream.hidden = true;
      renderIdeas(); markDirty();
    }).catch(function (e) {
      if (e && e.name === 'AbortError') { status.textContent = '멈췄어요.'; return; }
      status.className = 'llm-status err';
      status.textContent = (e && e.message) || '알 수 없는 오류';
      if (cfg.engine !== 'rules') status.textContent += ' — 급하면 엔진을 “LLM 없이”로 바꿔도 돼요.';
    }).then(function () {
      ui.running = null;
      btn.textContent = '그림 아이디어 만들기';
    });
  }

  function bindLlm() {
    $('#inEngine').innerHTML = BJ.llm.ENGINES.map(function (e) { return '<option value="' + e.id + '">' + e.name + '</option>'; }).join('');
    $('#inEngine').addEventListener('change', function () { llmCfg().engine = this.value; syncEngine(); saveLlm(); });
    $('#inEngineUrl').addEventListener('change', function () { llmCfg().urls[llmCfg().engine] = this.value.trim(); syncEngine(); saveLlm(); });
    $('#inEngineModel').addEventListener('change', function () { llmCfg().models[llmCfg().engine] = this.value.trim(); syncEngine(); saveLlm(); });
    $('#inStyle').addEventListener('change', function () { llmCfg().style = this.value; saveLlm(); renderIdeas(); });
    $('#inNeg').addEventListener('change', function () { llmCfg().neg = this.value; saveLlm(); renderIdeas(); });
    $('#inIdeas').addEventListener('change', function () { llmCfg().n = +this.value; saveLlm(); });
    $('#btnModels').addEventListener('click', function () {
      var st = $('#llmStatus');
      st.className = 'llm-status'; st.textContent = '모델 목록을 불러오는 중…';
      BJ.llm.listModels(engineConf()).then(function (list) {
        $('#modelList').innerHTML = list.map(function (m) { return '<option value="' + esc(m) + '">'; }).join('');
        if (!list.length) { st.textContent = '설치된 모델이 없어요. 터미널에서 ollama pull 로 하나 받아 주세요.'; return; }
        if (!llmCfg().models[llmCfg().engine]) { llmCfg().models[llmCfg().engine] = list[0]; syncEngine(); saveLlm(); }
        st.textContent = '연결됨 · 모델 ' + list.length + '개: ' + list.slice(0, 6).join(', ') + (list.length > 6 ? ' …' : '');
      }).catch(function (e) { st.className = 'llm-status err'; st.textContent = e.message; });
    });
    $('#btnIdeas').addEventListener('click', runIdeas);
    $('#btnCopyRaw').addEventListener('click', function () {
      var m = BJ.llm.buildMessages(llmInput());
      copyText('[시스템]\n' + m[0].content + '\n\n[사용자]\n' + m[1].content);
    });
    $('#ideas').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.copy) copyText($('#' + b.dataset.copy).textContent);
      else if (b.dataset.cap != null) {
        var x = S.ideas.data.ideas[+b.dataset.cap];
        S.back.caption = x.caption; syncControls(); requestRender(); markDirty(); toast('뒷면 한 마디에 넣었어요');
      } else if (b.id === 'btnCopyAll') copyText(ideasAsText());
    });
  }

  /* ─────────────── ⑦ 내보내기 ─────────────── */

  var HANJA_RE = /[㐀-鿿豈-﫿]/;
  var SEAL_CHARS = { pass: '合', bok: '福', gil: '吉', su: '壽', hee: '囍', daegil: '大吉' };

  function usedChars(side) {
    var t = side === 'back' ? [S.back.caption] : [yearText(), S.topText, S.bottomText];
    if (S.seal.text && (S.seal.where === 'both' || S.seal.where === side)) t.push(S.seal.text);
    var all = t.join(''), main = '', hanja = '';
    Array.from(all).forEach(function (ch) { if (HANJA_RE.test(ch)) hanja += ch; else main += ch; });
    if (side !== 'back') S.items.forEach(function (it) { if (SEAL_CHARS[it.prop]) hanja += SEAL_CHARS[it.prop]; });
    return { main: main.replace(/\s/g, '') || '가', hanja: hanja };
  }

  function exportSVG(side, opts) {
    opts = opts || {};
    var u = usedChars(side);
    return F.embedCSS(S.font, u.main, u.hanja).then(function (css) {
      var rs = renderState();
      if (opts.blankBack) rs = Object.assign({}, rs, { back: Object.assign({}, rs.back, { caption: '' }), seal: Object.assign({}, rs.seal, { where: 'none' }) });
      var e = env(side === 'front' ? 'xf' : 'xb', { fontCSS: css, backImage: opts.blankBack ? null : S.back.image });
      return side === 'front' ? C.front(rs, e) : C.back(rs, e);
    });
  }

  function fileBase() {
    var info = G.ilju(S.ilju);
    return ('부적_' + (S.name ? S.name.replace(/[\\/:*?"<>|\s]+/g, '_') + '_' : '') + info.ko + (S.gender === 'm' ? '남' : '여')).slice(0, 60);
  }

  function doExport(kind) {
    var scale = +$('#inScale').value || 3, st = $('#outStatus');
    st.className = 'llm-status'; st.textContent = '그리는 중…';
    var job;
    if (kind === 'both') {
      job = Promise.all([exportSVG('front'), exportSVG('back')]).then(function (s) {
        return Promise.all([BJ.exporter.toCanvas(s[0], scale), BJ.exporter.toCanvas(s[1], scale)]);
      }).then(function (cs) { return BJ.exporter.canvasBlob(BJ.exporter.sideBySide(cs[0], cs[1], scale)); })
        .then(function (b) { BJ.exporter.download(b, fileBase() + '_앞뒤.png'); });
    } else {
      job = exportSVG(kind).then(function (svg) { return BJ.exporter.toCanvas(svg, scale); })
        .then(BJ.exporter.canvasBlob).then(function (b) { BJ.exporter.download(b, fileBase() + (kind === 'front' ? '_앞.png' : '_뒤.png')); });
    }
    job.then(function () { st.textContent = '받았어요.'; }).catch(function (e) { st.className = 'llm-status err'; st.textContent = e.message || '내보내지 못했어요'; });
  }

  function doPrint() {
    var st = $('#outStatus');
    st.className = 'llm-status'; st.textContent = '인쇄용으로 그리는 중…';
    Promise.all([exportSVG('front'), exportSVG('back')]).then(function (s) {
      return Promise.all([BJ.exporter.toCanvas(s[0], 4), BJ.exporter.toCanvas(s[1], 4)]);
    }).then(function (cs) {
      var ok = BJ.exporter.print(cs.map(function (c) { return c.toDataURL('image/png'); }), fileBase());
      st.textContent = ok ? '인쇄 창을 열었어요. 배율은 100%(실제 크기)로 맞춰 주세요.' : '팝업이 막혔어요. 주소창 옆에서 팝업을 허용해 주세요.';
    }).catch(function (e) { st.className = 'llm-status err'; st.textContent = e.message; });
  }

  function backTemplate() {
    exportSVG('back', { blankBack: true }).then(function (svg) { return BJ.exporter.toCanvas(svg, 3); })
      .then(BJ.exporter.canvasBlob).then(function (b) { BJ.exporter.download(b, '빈_뒷면_1800x2700.png'); toast('빈 뒷면을 받았어요. 그림판 앱에서 이 위에 그리면 크기가 딱 맞아요.', 3600); })
      .catch(function (e) { toast(e.message); });
  }

  /* ─────────────── 보관함 ─────────────── */

  function openArchive() {
    save().then(function () { return BJ.store.all('designs'); }).then(function (rows) {
      rows.sort(function (a, b) { return (b.value.updatedAt || 0) - (a.value.updatedAt || 0); });
      var h = rows.map(function (r) {
        var d = r.value, info = G.ilju(d.ilju || 0), when = new Date(d.updatedAt || Date.now());
        return '<li class="' + (d.id === S.id ? 'cur' : '') + '"><div class="thumb">' + BJ.chars.svg(d.ilju || 0, d.gender, { mode: d.charMode, ink: d.ink, paper: d.paper }) + '</div>' +
          '<div class="meta"><b>' + esc(d.name || '이름 없음') + '</b><span>' + info.ko + '일주 ' + (d.gender === 'm' ? '남' : '여') + ' · ' + esc((d.topText || '') + ' ' + (d.bottomText || '')) + '</span>' +
          '<span class="dim">' + when.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + (d.worry ? ' · 고민 있음' : '') + (d.back && d.back.image ? ' · 뒷면 그림' : '') + '</span></div>' +
          '<div class="acts"><button class="btn small" data-open="' + d.id + '" type="button">열기</button><button class="btn small ghost" data-dup="' + d.id + '" type="button">복제</button><button class="btn small ghost danger" data-del="' + d.id + '" type="button">지우기</button></div></li>';
      }).join('');
      $('#archiveList').innerHTML = h || '<li class="empty">아직 저장된 부적이 없어요.</li>';
      var dlg = $('#archive');
      if (dlg.showModal) { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', '');
    });
  }

  function loadDesign(d) {
    S = migrate(d);
    dirty = false;
    ui.sel = null;
    BJ.store.put('kv', 'current', S.id);
    afterLoad();
  }

  function afterLoad() {
    syncControls(); buildGrid(); showIljuNow(); syncCustomChar(); renderIdeas(); ensureFont(); render();
    setSaveState(dirty ? '' : '저장됨');
  }

  function newDesign() {
    save().then(function () {
      var keep = {};
      STYLE_KEYS.forEach(function (k) { keep[k] = JSON.parse(JSON.stringify(S[k])); });
      var slotItems = S.items.filter(function (it) { return it.slot; });
      var n = fresh();
      Object.assign(n, keep);
      n.items = JSON.parse(JSON.stringify(slotItems));
      n.ilju = S.ilju; n.gender = S.gender;
      S = n; dirty = false; ui.sel = null;
      afterLoad();
      toast('새 부적 — 꾸밈은 그대로, 신청자 칸은 비웠어요');
    });
  }

  function bindArchive() {
    $('#btnArchive').addEventListener('click', openArchive);
    $('#btnArchiveClose').addEventListener('click', function () { var d = $('#archive'); if (d.close) d.close(); else d.removeAttribute('open'); });
    $('#btnNew').addEventListener('click', newDesign);
    $('#archiveList').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.open) {
        BJ.store.get('designs', b.dataset.open).then(function (d) { if (d) { loadDesign(d); var dl = $('#archive'); if (dl.close) dl.close(); } });
      } else if (b.dataset.dup) {
        BJ.store.get('designs', b.dataset.dup).then(function (d) {
          if (!d) return;
          var c = JSON.parse(JSON.stringify(d));
          c.id = uid(); c.name = (c.name || '이름 없음') + ' (복제)'; c.createdAt = c.updatedAt = Date.now();
          return BJ.store.put('designs', c.id, c).then(openArchive);
        });
      } else if (b.dataset.del) {
        if (!confirm('이 부적을 보관함에서 지울까요? 되돌릴 수 없어요.')) return;
        var id = b.dataset.del;
        BJ.store.del('designs', id).then(function () {
          if (id === S.id) { S.id = uid(); dirty = false; }
          openArchive();
        });
      }
    });
    $('#btnBackup').addEventListener('click', function () {
      save().then(function () { return Promise.all([BJ.store.all('designs'), BJ.store.all('assets'), BJ.store.get('kv', 'llm')]); })
        .then(function (r) {
          var data = { app: 'bujeok-gongbang', v: 1, at: new Date().toISOString(), designs: r[0].map(function (x) { return x.value; }), assets: r[1], llm: r[2] || null };
          var d = new Date(), stamp = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
          BJ.exporter.download(new Blob([JSON.stringify(data)], { type: 'application/json' }), '부적공방_백업_' + stamp + '.json');
        });
    });
    $('#inRestore').addEventListener('change', function () {
      var f = this.files[0];
      this.value = '';
      if (!f) return;
      f.text().then(function (t) {
        var data = JSON.parse(t);
        if (!data || data.app !== 'bujeok-gongbang') throw new Error('부적 공방 백업 파일이 아니에요');
        var jobs = (data.designs || []).map(function (d) {
          return BJ.store.get('designs', d.id).then(function (old) { if (!old || (old.updatedAt || 0) < (d.updatedAt || 0)) return BJ.store.put('designs', d.id, d); });
        });
        (data.assets || []).forEach(function (a) { jobs.push(BJ.store.put('assets', a.key, a.value)); });
        return Promise.all(jobs).then(loadAssets).then(function () {
          buildGrid(); buildFontSelect(); render(); openArchive();
          toast('백업을 불러왔어요 (부적 ' + (data.designs || []).length + '개)');
        });
      }).catch(function (e) { toast(e.message || '불러오지 못했어요', 4000); });
    });
  }

  /* ─────────────── 글꼴 · 그림 자산 ─────────────── */

  function buildFontSelect() {
    var h = F.LIST.map(function (f) { return '<option value="' + f.id + '">' + f.name + '</option>'; }).join('');
    var mine = Object.keys(F.custom);
    if (mine.length) h += '<optgroup label="내 글꼴">' + mine.map(function (id) { return '<option value="custom:' + id + '">' + esc(F.custom[id].name) + '</option>'; }).join('') + '</optgroup>';
    $('#inFont').innerHTML = h;
    $('#inFont').value = S.font;
  }

  function loadAssets() {
    return BJ.store.all('assets').then(function (rows) {
      ui.customChars = {};
      var jobs = [];
      rows.forEach(function (r) {
        var a = r.value;
        if (!a) return;
        if (a.kind === 'char') ui.customChars[r.key] = a;
        if (a.kind === 'font') jobs.push(F.addCustom(a.id, a.name, a.dataURL).catch(function () {}));
      });
      return Promise.all(jobs);
    });
  }

  /* ─────────────── 시작 ─────────────── */

  function buildStatic() {
    $('#paletteChips').innerHTML = C.PALETTES.map(function (p) {
      return '<button class="chip pal" data-paper="' + p.paper + '" data-ink="' + p.ink + '" type="button"><i style="background:' + p.paper + ';border-color:' + p.ink + '"></i>' + p.name + '</button>';
    }).join('');
    $('#themeChips').innerHTML = Object.keys(C.THEMES).map(function (k) { return '<button class="chip" data-theme="' + k + '" type="button">' + C.THEMES[k].name + '</button>'; }).join('');
    var pairs = [['건강', '부적'], ['재물', '부적'], ['합격', '기원'], ['취업', '성공'], ['연애', '대길'], ['만사', '형통'], ['소원', '성취'], ['무병', '장수'], ['가내', '평안'], ['우리막내', '건강만빵']];
    $('#textChips').innerHTML = pairs.map(function (p) { return '<button class="chip" data-top="' + p[0] + '" data-bottom="' + p[1] + '" type="button">' + p[0] + ' / ' + p[1] + '</button>'; }).join('');
    buildSlots(); buildDrawer(); buildFontSelect();
  }

  function bindMisc() {
    /* 탭 */
    $$('.tab').forEach(function (t) {
      t.addEventListener('click', function () {
        $$('.tab').forEach(function (x) { x.classList.toggle('on', x === t); });
        $$('.pane').forEach(function (p) { p.classList.toggle('on', p.dataset.pane === t.dataset.tab); });
        if (t.dataset.tab === 'back' || t.dataset.tab === 'llm') setView(ui.view === 'front' ? 'both' : ui.view);
      });
    });
    $$('.side-tabs .seg-btn').forEach(function (b) { b.addEventListener('click', function () { setView(b.dataset.view); }); });

    $('#iljuGrid').addEventListener('click', function (e) {
      var b = e.target.closest('.ij');
      if (b) change('ilju', +b.dataset.i);
    });
    $('#btnFind').addEventListener('click', function () {
      var v = $('#inBirth').value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) { toast('생일을 먼저 골라 주세요'); return; }
      var p = v.split('-').map(Number), i = G.iljuFromDate(p[0], p[1], p[2], $('#inLate').checked);
      change('ilju', i);
      toast(G.ilju(i).ko + '일주 · ' + G.ilju(i).title);
      var on = $('#iljuGrid .ij.on'); if (on) on.scrollIntoView({ block: 'nearest' });
    });

    $('#textChips').addEventListener('click', function (e) {
      var b = e.target.closest('.chip');
      if (!b) return;
      S.topText = b.dataset.top; S.bottomText = b.dataset.bottom;
      ensureFont(); syncControls(); requestRender(); markDirty();
    });
    $('#themeChips').addEventListener('click', function (e) {
      var b = e.target.closest('.chip');
      if (!b) return;
      applyTheme(b.dataset.theme); syncControls(); requestRender(); markDirty();
    });
    $('#paletteChips').addEventListener('click', function (e) {
      var b = e.target.closest('.chip');
      if (!b) return;
      S.paper = b.dataset.paper; S.ink = b.dataset.ink;
      syncControls(); buildGrid(); buildDrawer(); requestRender(); markDirty();
    });
    $('#drawerTabs').addEventListener('click', function (e) {
      var b = e.target.closest('.chip');
      if (b) { ui.drawerCat = b.dataset.cat; buildDrawer(); }
    });
    $('#drawer').addEventListener('click', function (e) {
      var b = e.target.closest('.prop');
      if (!b) return;
      S.items.push({ prop: b.dataset.prop, x: 300, y: 450, s: 0.8, r: 0, flip: false });
      setView(ui.view === 'back' ? 'front' : ui.view);
      select('item:' + (S.items.length - 1), 'front');
      requestRender(); markDirty();
    });

    $$('#selbar [data-act]').forEach(function (b) { b.addEventListener('click', function () { act(b.dataset.act); }); });
    document.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || !ui.sel) return;
      var h = handle(ui.sel);
      if (!h) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && h.del) { e.preventDefault(); act('del'); }
      else if (e.key === 'Escape') select(null);
      else if (/^Arrow/.test(e.key)) {
        e.preventDefault();
        var d = e.shiftKey ? 10 : 2, p = h.get();
        h.set(p[0] + (e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0), p[1] + (e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0));
        requestRender(); markDirty();
      }
    });
    window.addEventListener('resize', function () { requestRender(); });

    /* 내 캐릭터 그림 */
    $('#inCharFile').addEventListener('change', function () {
      var f = this.files[0];
      this.value = '';
      if (!f) return;
      readImage(f, 1400).then(function (url) {
        var genders = $('#inCharBoth').checked ? ['f', 'm'] : [S.gender];
        return Promise.all(genders.map(function (g) {
          var key = 'char:' + S.ilju + ':' + g, a = { kind: 'char', ilju: S.ilju, gender: g, dataURL: url, mode: 'multiply' };
          ui.customChars[key] = a;
          return BJ.store.put('assets', key, a);
        }));
      }).then(function () { buildGrid(); syncCustomChar(); requestRender(); toast('내 그림으로 바꿨어요'); })
        .catch(function (e) { toast(e.message); });
    });
    $('#segCharMode').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-v]'), cc = customChar();
      if (!b || !cc) return;
      cc.mode = b.dataset.v;
      BJ.store.put('assets', 'char:' + S.ilju + ':' + S.gender, cc);
      syncCustomChar(); requestRender();
    });
    $('#btnCharClear').addEventListener('click', function () {
      var genders = $('#inCharBoth').checked ? ['f', 'm'] : [S.gender];
      Promise.all(genders.map(function (g) { var k = 'char:' + S.ilju + ':' + g; delete ui.customChars[k]; return BJ.store.del('assets', k); }))
        .then(function () { buildGrid(); syncCustomChar(); requestRender(); });
    });

    /* 내 글꼴 */
    $('#inFontFile').addEventListener('change', function () {
      var f = this.files[0];
      this.value = '';
      if (!f) return;
      F.blobToDataURL(f).then(function (url) {
        var id = uid(), name = f.name.replace(/\.[^.]+$/, '');
        return F.addCustom(id, name, url).then(function () {
          return BJ.store.put('assets', 'font:' + id, { kind: 'font', id: id, name: name, dataURL: url });
        }).then(function () { buildFontSelect(); change('font', 'custom:' + id); toast('글꼴을 넣었어요: ' + name); });
      }).catch(function () { toast('글꼴을 읽지 못했어요 (ttf · otf · woff · woff2)'); });
    });

    /* 뒷면 */
    $('#inBackFile').addEventListener('change', function () {
      var f = this.files[0];
      this.value = '';
      if (!f) return;
      readImage(f, 1800).then(function (url) {
        S.back.image = url; S.back.fit = { dx: 0, dy: 0, s: S.back.frame === false ? 1.1 : 0.94 };
        if (S.back.mode !== 'ink') S.back.mode = 'multiply';
        setView(ui.view === 'front' ? 'back' : ui.view);
        syncControls(); requestRender(); markDirty();
      }).catch(function (e) { toast(e.message); });
    });
    $('#btnBackClear').addEventListener('click', function () { S.back.image = null; requestRender(); markDirty(); });
    $('#btnBackTemplate').addEventListener('click', backTemplate);

    /* 내보내기 */
    $$('[data-export]').forEach(function (b) { b.addEventListener('click', function () { doExport(b.dataset.export); }); });
    $('#btnPrint').addEventListener('click', doPrint);

    if (document.fonts) {
      document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', function () { requestRender(); });
    }
  }

  function setView(v) {
    ui.view = v;
    $('#cards').className = 'cards view-' + v;
    $$('.side-tabs .seg-btn').forEach(function (b) { b.classList.toggle('on', b.dataset.view === v); });
    requestRender();
  }

  function init() {
    buildStatic();
    bindControls();
    bindDrag(frontHost, 'front');
    bindDrag(backHost, 'back');
    bindMisc();
    bindLlm();
    bindArchive();
    BJ.store.persist();
    Promise.all([loadAssets(), BJ.store.get('kv', 'llm'), BJ.store.get('kv', 'current')]).then(function (r) {
      ui.llm = r[1] || null;
      llmCfg();
      syncEngine();
      buildFontSelect();
      return r[2] ? BJ.store.get('designs', r[2]) : null;
    }).then(function (d) {
      if (d) S = migrate(d);
      else { S = fresh(); applyTheme('health'); }
      afterLoad();
      return BJ.store.memoryOnly();
    }).then(function (mem) {
      if (mem) toast('이 창에서는 저장이 안 돼요 (사생활 보호 창?). 다 만들면 PNG 로 받아 두세요.', 6000);
    }).catch(function (e) {
      S = fresh(); applyTheme('health'); afterLoad();
      console.error(e);
    });
  }

  BJ.app = { get state() { return S; }, render: render, change: change, applyTheme: applyTheme, select: select, exportSVG: exportSVG };
  init();
})();
