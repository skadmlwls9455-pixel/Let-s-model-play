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
  var clean = BJ.draw.clean;

  /* ─────────────── 상태 ─────────────── */

  function defaultYear() { var d = new Date(); return d.getMonth() >= 9 ? d.getFullYear() + 1 : d.getFullYear(); }
  function uid() { return 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  var STYLE_KEYS = ['layout', 'font', 'stretch', 'textWeight', 'sizes', 'paper', 'ink', 'rough', 'paperGrain', 'frame', 'rays', 'headerLines',
    'footer', 'sideDots', 'charMode', 'ground', 'charScale', 'charFlip', 'theme', 'symmetric', 'seal', 'year', 'yearFmt', 'yearCustom', 'topText', 'bottomText', 'offsets'];

  function fresh() {
    return {
      v: 2, id: uid(), name: '', createdAt: Date.now(), updatedAt: Date.now(),
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
      back: { frame: true, image: null, aspect: 0, mode: 'normal', fit: { dx: 0, dy: 0, s: 1 }, caption: '' },
      worry: '', ideas: null
    };
  }

  /* ── 들어오는 값 다듬기: 저장된 것 · 백업 파일 · 다른 판의 값이 깨졌거나 이상해도 앱이 멈추거나 엉뚱한 글자가 화면에 끼지 않게 ── */
  var HEX = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
  var IMG_RE = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+\/=]+$/;
  var FONT_RE = /^data:[\w.+\/-]*;base64,[A-Za-z0-9+\/=]+$/;
  var ID_RE = /^[\w-]{1,40}$/;
  /* 저장된 값이 객체면 글자 · 수로 바꾸지 않는다 ({toString: 'x'} 처럼 바꾸다가 멈추는 값이 있어서) */
  function prim(v) { return v != null && typeof v === 'object' ? undefined : v; }
  function str(v, max) { v = prim(v); return v == null ? '' : clean(String(v)).slice(0, max || 200); }
  function numIn(v, a, b, d) { v = prim(v); v = typeof v === 'symbol' ? NaN : +v; return isFinite(v) ? clamp(v, a, b) : d; }
  function oneOf(v, list, d) { return list.indexOf(v) >= 0 ? v : d; }
  function isHex(v) { return typeof v === 'string' && HEX.test(v); }
  /* 이름표 찾기는 제 것만 ('toString' · '__proto__' · 'constructor' 같은 물려받은 이름은 없는 것으로) */
  var hasOwn = Object.prototype.hasOwnProperty;
  function own(map, k) { return typeof k === 'string' && hasOwn.call(map, k); }

  function cleanItem(it) {
    if (!it || typeof it !== 'object' || !own(P.P, it.prop)) return null;
    var o = { prop: it.prop, s: numIn(it.s, 0.2, 4, 0.7), r: numIn(it.r, -360, 360, 0), flip: !!it.flip };
    if (own(C.SLOT_NAMES, it.slot)) { o.slot = it.slot; o.dx = numIn(it.dx, -1200, 1200, 0); o.dy = numIn(it.dy, -1200, 1200, 0); }
    else { o.x = numIn(it.x, -1200, 1800, 300); o.y = numIn(it.y, -1200, 2100, 450); }
    if (it.s0 != null) o.s0 = numIn(it.s0, 0.2, 4, 0.8);
    return o;
  }
  function cleanOff(o) {
    var r = {};
    if (o.dx != null) r.dx = numIn(o.dx, -1200, 1200, 0);
    if (o.dy != null) r.dy = numIn(o.dy, -1200, 1200, 0);
    if (o.s != null) r.s = numIn(o.s, 0.2, 4, 1);
    if (o.r != null) r.r = numIn(o.r, -360, 360, 0);
    return r;
  }
  function cleanIdeas(x) {
    if (!x || typeof x !== 'object' || !x.data || !Array.isArray(x.data.ideas)) return null;
    var ideas = x.data.ideas.slice(0, 6).map(function (i) {
      if (!i || typeof i !== 'object') return null;
      var t = str(i.title, 60);
      if (!t) return null;
      return {
        title: t, scene: str(i.scene, 800), pose: str(i.pose, 300), symbol: str(i.symbol, 300), caption: str(i.caption, 80), prompt_en: str(i.prompt_en, 2000),
        props: Array.isArray(i.props) ? i.props.slice(0, 8).map(function (p) { return str(p, 40); }).filter(Boolean) : []
      };
    }).filter(Boolean);
    if (!ideas.length) return null;
    return { data: { summary: str(x.data.summary, 300), ideas: ideas }, engine: str(x.engine, 20), engineName: str(x.engineName, 120), at: numIn(x.at, 0, 1e15, 0) };
  }

  function migrate(d) {
    d = d && typeof d === 'object' ? d : {};
    var f = fresh(), out = f;
    out.id = typeof d.id === 'string' && ID_RE.test(d.id) ? d.id : f.id;
    out.name = str(d.name, 40);
    out.createdAt = numIn(d.createdAt, 0, 1e15, f.createdAt);
    out.updatedAt = numIn(d.updatedAt, 0, 1e15, f.updatedAt);
    out.ilju = G.ilju(prim(d.ilju)).index;
    out.gender = d.gender === 'm' ? 'm' : 'f';
    out.year = Math.round(numIn(d.year, 1900, 2200, f.year));
    out.yearFmt = oneOf(d.yearFmt, ['num-hj', 'num-ko', 'hj', 'num', 'animal', 'custom', 'none'], f.yearFmt);
    out.yearCustom = str(d.yearCustom, 30);
    out.layout = own(C.LAYOUTS, d.layout) ? d.layout : f.layout;
    out.topText = d.topText == null ? f.topText : str(d.topText, 24);
    out.bottomText = d.bottomText == null ? f.bottomText : str(d.bottomText, 24);
    /* 글꼴: 목록에 있는 것이거나 내가 올린 글꼴 이름표 (이 브라우저에 없더라도 값은 지켜 둔다 — 다른 창 · 백업에서 들어올 수 있어서) */
    out.font = typeof d.font === 'string' && (F.find(d.font) || /^custom:[\w-]{1,40}$/.test(d.font)) ? d.font : f.font;
    out.stretch = numIn(d.stretch, 0.6, 2.5, f.stretch);
    out.textWeight = numIn(d.textWeight, 0, 10, f.textWeight);
    var sz = d.sizes || {};
    out.sizes = { year: numIn(sz.year, 0.3, 2, 1), top: numIn(sz.top, 0.3, 2, 1), bottom: numIn(sz.bottom, 0.3, 2, 1) };
    out.paper = isHex(d.paper) ? d.paper : f.paper;
    out.ink = isHex(d.ink) ? d.ink : f.ink;
    out.rough = numIn(d.rough, 0, 3, f.rough);
    out.paperGrain = !!d.paperGrain;
    out.frame = oneOf(d.frame, ['stamp', 'cloud', 'simple', 'none'], f.frame);
    ['rays', 'headerLines', 'footer', 'sideDots'].forEach(function (k) { out[k] = d[k] == null ? f[k] : !!d[k]; });
    out.charMode = oneOf(d.charMode, ['color', 'line'], f.charMode);
    out.ground = !!d.ground;
    out.charScale = numIn(d.charScale, 0.3, 3, 1);
    out.charFlip = !!d.charFlip;
    out.theme = own(C.THEMES, d.theme) ? d.theme : '';
    out.symmetric = d.symmetric == null ? true : !!d.symmetric;
    var seen = {};
    out.items = (Array.isArray(d.items) ? d.items : []).map(cleanItem).filter(function (it) {
      if (!it) return false;
      if (it.slot) { if (seen[it.slot]) return false; seen[it.slot] = 1; }
      return true;
    }).slice(0, 300);
    out.offsets = {};
    ['year', 'top', 'bottom', 'char', 'caption'].forEach(function (k) { var o = d.offsets && d.offsets[k]; if (o && typeof o === 'object') out.offsets[k] = cleanOff(o); });
    /* 판 1 (처음 판)은 글자 · 캐릭터의 각도를 그리지 않았다 — 그때 눌러 둔 ↺ ↻ 가 이제 와서 갑자기 기울어 보이지 않게 지운다 */
    if ((numIn(d.v, 0, 100, 1) || 1) < 2) Object.keys(out.offsets).forEach(function (k) { delete out.offsets[k].r; });
    var se = d.seal || {};
    out.seal = { text: str(se.text, 4), where: oneOf(se.where, ['front', 'back', 'both', 'none'], 'back'), style: oneOf(se.style, ['fill', 'line'], 'fill'), pos: {} };
    ['front', 'back'].forEach(function (k) {
      var p = se.pos && se.pos[k];
      if (p && typeof p === 'object') out.seal.pos[k] = { x: numIn(p.x, -1200, 1800, 534), y: numIn(p.y, -1200, 2100, 780), s: numIn(p.s, 0.2, 4, 0.74) };
    });
    var bk = d.back || {}, fit = bk.fit || {};
    out.back = {
      frame: bk.frame == null ? true : !!bk.frame,
      image: typeof bk.image === 'string' && IMG_RE.test(bk.image) ? bk.image : null,
      aspect: numIn(bk.aspect, 0, 100, 0),
      mode: oneOf(bk.mode, ['normal', 'multiply', 'ink'], 'normal'),
      fit: { dx: numIn(fit.dx, -2000, 2000, 0), dy: numIn(fit.dy, -2000, 2000, 0), s: numIn(fit.s, 0.1, 5, 1) },
      caption: str(bk.caption, 40)
    };
    out.worry = str(d.worry, 4000);
    out.ideas = cleanIdeas(d.ideas);
    clampAnchors(out);
    return out;
  }

  /* 무엇이든 카드 안에 붙잡아 둔다 — 기준점(가운데)이 카드 밖으로 나가면 다시는 잡을 수 없어서 */
  var BOX = { x0: 30, x1: 570, y0: 30, y1: 870 };
  function clampAt(base, v, lo, hi) { return clamp(base + v, lo, hi) - base; }
  function textBase(d, id) {
    var lay = C.LAYOUTS[d.layout] || C.LAYOUTS.split;
    if (id === 'caption') return [C.CAPTION.x, C.CAPTION.y];
    if (id === 'char') return [lay.char.x, lay.char.y];
    return [lay[id].x, lay[id].y];
  }
  function clampAnchors(d) {
    var lay = C.LAYOUTS[d.layout] || C.LAYOUTS.split;
    Object.keys(d.offsets).forEach(function (id) {
      var o = d.offsets[id], b = textBase(d, id);
      if (o.dx != null) o.dx = clampAt(b[0], o.dx, BOX.x0, BOX.x1);
      if (o.dy != null) o.dy = clampAt(b[1], o.dy, BOX.y0, BOX.y1);
    });
    d.items.forEach(function (it) {
      if (it.slot) {
        var p = lay.slots[it.slot] || [300, 450];
        it.dx = clampAt(p[0], it.dx || 0, BOX.x0, BOX.x1); it.dy = clampAt(p[1], it.dy || 0, BOX.y0, BOX.y1);
      } else { it.x = clamp(it.x, BOX.x0, BOX.x1); it.y = clamp(it.y, BOX.y0, BOX.y1); }
    });
    Object.keys(d.seal.pos).forEach(function (k) { var p = d.seal.pos[k]; p.x = clamp(p.x, BOX.x0, BOX.x1); p.y = clamp(p.y, BOX.y0, BOX.y1); });
    var f = d.back.fit;
    f.dx = clampAt(300, f.dx, BOX.x0, BOX.x1); f.dy = clampAt(450, f.dy, BOX.y0, BOX.y1);
  }

  var S = fresh();
  var dirty = false;
  var ui = { view: 'front', sel: null, selSide: 'front', drawerCat: 'deco', customChars: {}, llm: null, running: null, runSeq: 0, refocusing: false, lastEngine: null, drawerAdded: null };
  /* 마지막 입력이 키보드였나 (키보드 테두리는 키보드로 왔을 때만 — 스크립트로 옮긴 포커스는 :focus-visible 이 늘 참이라 믿을 수 없어서) */
  var lastInput = 'pointer';
  document.addEventListener('keydown', function (e) { if (!e.altKey && !e.ctrlKey && !e.metaKey) lastInput = 'key'; }, true);
  document.addEventListener('pointerdown', function () { lastInput = 'pointer'; }, true);

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
      return { prop: it.prop, slot: it.slot, x: pos[0] + (it.dx || 0), y: pos[1] + (it.dy || 0), s: it.s, r: it.r, flip: it.flip };
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

  function hostOf(side) { return side === 'back' ? backHost : frontHost; }

  function render() {
    var rs = renderState();
    /* 키보드로 머문 것이 다시 그린 뒤에도 그 자리에 머물게 (고르기는 건드리지 않는다 — Esc 로 푼 것이 되살아나지 않게) */
    var ae = document.activeElement, fid = null, fside = null, cards = $('#cards'), wasKbd = cards.classList.contains('kbd');
    if (ae && ae.getAttribute && ae.getAttribute('data-el') && (frontHost.contains(ae) || backHost.contains(ae))) {
      fid = ae.getAttribute('data-el'); fside = frontHost.contains(ae) ? 'front' : 'back';
    }
    ui.refocusing = !!fid;
    try {
      frontHost.innerHTML = C.front(rs, env('f', { interactive: true }));
      backHost.innerHTML = C.back(rs, env('b', { interactive: true }));
    } finally { ui.refocusing = false; }
    $('#backHint').hidden = !!S.back.image;
    /* 고른 것이 없어졌으면 (안 쓰기 · 비우기 · 지우기) 고르기도 푼다 */
    if (ui.sel && !hostOf(ui.selSide).querySelector('[data-el="' + ui.sel + '"]')) ui.sel = null;
    $$('[data-el][tabindex]', frontHost).concat($$('[data-el][tabindex]', backHost)).forEach(function (g) { g.setAttribute('aria-describedby', 'kbdHelp'); });
    if (fid) { refocus(fid, fside); cards.classList.toggle('kbd', wasKbd); }
    updateSel();
    updateWho();
  }

  function refocus(fid, side) {
    var host = hostOf(side), el = host.querySelector('[data-el="' + fid + '"][tabindex]');
    if (!el && /^item:/.test(fid)) {
      var all = host.querySelectorAll('[data-el^="item:"][tabindex]');
      el = all.length ? all[Math.min(+fid.slice(5) || 0, all.length - 1)] : null;
    }
    if (!el) return;
    ui.refocusing = true;
    try { el.focus({ preventScroll: true }); } catch (e) {} finally { ui.refocusing = false; }
  }

  function updateWho() {
    var info = G.ilju(S.ilju);
    $('#whoLine').textContent = (S.name ? S.name + ' · ' : '') + info.ko + '일주 ' + (S.gender === 'm' ? '남' : '여') + ' · ' + info.title;
  }

  /* ─────────────── 저장 ─────────────── */

  /* 저장은 한 줄로 세워서 차례로 (먼저 시작한 옛 판이 나중에 덮어쓰지 않게).
     rev: 고칠 때마다 1 씩 — 저장하는 사이에 또 고쳤으면 '저장됨'으로 바꾸지 않고 한 번 더 저장한다.
     base: 이 창이 마지막으로 읽거나 쓴 판의 시각 — 저장된 판이 그보다 새것이면 (다른 창 · 백업 불러오기) 덮어쓰지 않는다. */
  var saveTimer = 0, rev = 0, saving = Promise.resolve(), base = { id: null, at: 0 }, stored = false, memMode = false;
  var chan = null;
  try { chan = new BroadcastChannel('bujeok-gongbang'); } catch (e) { chan = null; }

  function setSaveState(t, cls) {
    var el = $('#saveState');
    el.textContent = t;
    el.className = 'save-state' + (cls ? ' ' + cls : '');
    el.title = cls === 'warn' ? '이 창에서는 저장이 안 돼요. 창을 닫으면 사라지니 PNG 나 백업 파일로 받아 두세요.' : cls === 'err' ? '저장하지 못했어요. 보관함에서 백업 파일을 받아 두세요.' : '';
  }
  function setSaved() {
    if (memMode) setSaveState('임시 저장', 'warn');
    else setSaveState(stored ? '저장됨' : '');
  }
  function saveAlert(msg) {
    var el = $('#saveAlert');
    if (!msg) { if (el) el.hidden = true; document.body.classList.toggle('alerting', false); return; }
    if (!el) {
      el = document.createElement('div');
      el.id = 'saveAlert'; el.className = 'save-alert'; el.setAttribute('role', 'alert');
      el.innerHTML = '<p></p><button type="button" class="btn small">닫기</button>';
      el.querySelector('button').addEventListener('click', function () { saveAlert(null); });
      document.body.appendChild(el);
    }
    el.querySelector('p').textContent = msg;
    el.hidden = false;
    /* 화면 아래에 붙어 있는다 (머리 줄 단추를 가리지 않게) — 알림 글은 그 위로 비켜 선다 */
    document.body.classList.toggle('alerting', true);
    document.body.style.setProperty('--alert-h', el.offsetHeight + 'px');
  }
  function markDirty() {
    dirty = true; rev++;
    clearTimeout(saveTimer);
    setSaveState('저장 중…');
    saveTimer = setTimeout(save, 500);
  }

  /* forks: 따로 저장한 부적의 옛 id → 새 자리. 그 사이 줄 서 있던 저장도 새 자리로 가게 (옛 자리에 옛 판을 다시 쓰지 않게).
     gen: 창을 떠나며 바로 쓴 판(flushNow)보다 먼저 줄 선 저장은 버린다.
     remoteAt: 다른 창이 알려 온 저장 시각 (읽어 볼 틈이 없는 flushNow 가 덮어도 되는지 판단할 때) */
  var forks = {}, gen = 0, remoteAt = {};
  function forkName(name) { var SUF = ' (이 창에서 고친 판)'; return str(name || '이름 없음', 40 - SUF.length) + SUF; }
  function retarget(copy) {
    for (var k = 0, fk = forks[copy.id]; fk && k < 20; k++, fk = forks[copy.id]) {
      if (copy.name === fk.oldName) copy.name = fk.name;
      copy.id = fk.id; copy.createdAt = fk.createdAt;
    }
    return copy;
  }
  function post(m) { if (chan) try { chan.postMessage(m); } catch (e) {} }

  function save() {
    clearTimeout(saveTimer);
    if (!dirty) return saving;
    var doc = S, mine = rev, g = gen;
    doc.updatedAt = Date.now();
    var snap = JSON.stringify(doc);
    saving = saving.catch(function () {}).then(function () {
      if (g !== gen) return null;
      var copy = retarget(JSON.parse(snap)), known = base.id === copy.id ? base.at : 0, gone = false;
      return BJ.store.update('designs', copy.id, function (old) {
        if (old && known && (old.updatedAt || 0) > known) return undefined;   /* 저장된 쪽이 더 새 판 */
        gone = !old && !!known;   /* 이 창이 저장했던 부적이 없어졌다 (다른 창에서 지웠다) */
        return copy;
      }).then(function (res) {
        if (res.wrote) {
          if (gone) toast('다른 창에서 지운 부적이에요 — 이 창에서 고친 것으로 다시 저장했어요', 6000);
          return copy;
        }
        /* 다른 창 · 백업에서 더 새로 고친 판이 있다 → 지우지 않고, 이 창에서 고친 것은 따로 저장 */
        var fork = JSON.parse(JSON.stringify(copy));
        fork.id = uid(); fork.name = forkName(copy.name); fork.createdAt = fork.updatedAt = Date.now();
        return BJ.store.put('designs', fork.id, fork).then(function () {
          forks[copy.id] = { id: fork.id, name: fork.name, oldName: copy.name, createdAt: fork.createdAt };
          if (S === doc) {
            S.id = fork.id; S.createdAt = fork.createdAt; S.updatedAt = fork.updatedAt;
            if (S.name === copy.name) S.name = fork.name;   /* 그사이 이름을 또 고쳤으면 그 이름을 둔다 */
            syncControls(); updateWho();
          }
          toast('다른 창이나 백업에서 더 새로 고친 판이 있어서, 이 창에서 고친 것은 “' + fork.name + '”으로 따로 저장했어요.', 7000);
          return fork;
        });
      });
    }).then(function (w) {
      if (!w) return;
      post({ t: 'saved', id: w.id, at: w.updatedAt });
      if (S !== doc) return;   /* 그사이 다른 부적을 열었으면 '지금 만들던 부적'은 그대로 */
      if (base.id !== w.id || w.updatedAt >= base.at) base = { id: w.id, at: w.updatedAt };
      return BJ.store.put('kv', 'current', w.id).then(function () {
        if (S !== doc) return;
        stored = true;
        if (rev === mine) { dirty = false; setSaved(); }
        saveAlert(null);
      });
    }).catch(function (e) {
      setSaveState('저장 실패', 'err');
      var m = (e && e.message) || '이 브라우저에 쓰지 못했어요';
      saveAlert('저장하지 못했어요 — ' + m + (/백업/.test(m) ? '' : '. 보관함에서 백업 파일을 받아 두세요.'));
    });
    return saving;
  }

  /* 창을 닫거나 다른 앱으로 갈 때: 읽어 볼 틈 없이 지금 바로 쓴다 (닫히는 창에서는 읽고-쓰기가 끝까지 간다는 보장이 없어서).
     다른 창이 더 새 판을 저장했다고 알려 왔으면 덮지 않고 따로 저장한다. */
  function flushNow() {
    clearTimeout(saveTimer);
    if (!dirty) return;
    var doc = S, mine = ++rev;
    gen++;   /* 줄 서 있던 저장은 이 판보다 옛것 */
    doc.updatedAt = Date.now();
    var copy = retarget(JSON.parse(JSON.stringify(doc))), known = base.id === copy.id ? base.at : 0;
    if (known && (remoteAt[copy.id] || 0) > known) {
      var oldId = copy.id, oldName = copy.name;
      copy.id = uid(); copy.name = forkName(oldName); copy.createdAt = copy.updatedAt;
      forks[oldId] = { id: copy.id, name: copy.name, oldName: oldName, createdAt: copy.createdAt };
    }
    S.id = copy.id; S.name = copy.name; S.createdAt = copy.createdAt;
    base = { id: copy.id, at: copy.updatedAt };
    dirty = false;
    BJ.store.putNow([['designs', copy.id, copy], ['kv', 'current', copy.id]]).then(function () {
      post({ t: 'saved', id: copy.id, at: copy.updatedAt });
      if (S !== doc) return;
      stored = true;
      if (rev === mine) { setSaved(); saveAlert(null); }
    }, function (e) {
      if (S !== doc) return;
      dirty = true;
      setSaveState('저장 실패', 'err');
      var m = (e && e.message) || '이 브라우저에 쓰지 못했어요';
      saveAlert('저장하지 못했어요 — ' + m + (/백업/.test(m) ? '' : '. 보관함에서 백업 파일을 받아 두세요.'));
    });
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) flushNow(); });
  window.addEventListener('pagehide', flushNow);
  window.addEventListener('beforeunload', flushNow);

  /* 다른 창에서 온 소식:
     saved   — 같은 부적을 저장했다: 여기서 고친 게 없으면 그 판을 불러온다 (고친 게 있으면 저장할 때 따로 저장)
     deleted — 지웠다: 고친 게 없으면 새 부적으로, 있으면 저장할 때 다시 생긴다고 알린다
     assets  — 내 그림 · 글꼴이 바뀌었다: 다시 읽는다
     끄는 중(drag)이면 손을 뗀 다음에 */
  var pendingMsg = null;
  function onChan(m) {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'saved' && typeof m.id === 'string') remoteAt[m.id] = Math.max(remoteAt[m.id] || 0, +m.at || 0);
    if (m.t === 'assets') {
      loadAssets().then(function () { buildFontSelect(); buildGrid(); syncCustomChar(); syncControls(); ensureFont(); requestRender(); }).catch(function () {});
      return;
    }
    if (m.id !== S.id) return;
    if (drag) { pendingMsg = m; return; }
    if (m.t === 'deleted') {
      if (dirty || ui.running) {
        stored = false; base = { id: S.id, at: 0 };
        if (!dirty) setSaved();
        toast('다른 창에서 이 부적을 지웠어요 — 여기서 고친 것은 저장하면 다시 생겨요', 7000);
        return;
      }
      switchTo(nextDesign());
      toast('다른 창에서 이 부적을 지웠어요. 꾸밈은 그대로 둔 새 부적을 열었어요', 6000);
      return;
    }
    if (m.t !== 'saved' || dirty || ui.running) return;
    if (base.id === m.id && m.at <= base.at) return;
    BJ.store.get('designs', m.id).then(function (d) {
      if (!d || dirty || drag || ui.running || d.id !== S.id) return;
      if (!loadDesign(d)) return;
      syncControls(true);   /* 입력칸에 커서가 있어도 새 값으로 (옛 값에 한 글자 더해 덮어쓰지 않게) */
      toast('다른 창에서 고친 내용을 불러왔어요');
    }).catch(function () {});
  }
  if (chan) chan.onmessage = function (ev) { onChan(ev.data); };

  /* ─────────────── 바꾸기 ─────────────── */

  function change(path, v) {
    if (typeof v === 'string') v = clean(v);   /* 붙여 넣은 보이지 않는 제어 문자는 빼고 */
    setPath(S, path, v);
    if (path === 'ilju' || path === 'gender' || path === 'charMode' || path === 'ink' || path === 'paper') buildGrid();
    if (path === 'ink' || path === 'paper') buildDrawer();
    if (path === 'ilju' || path === 'gender') { showIljuNow(); syncCustomChar(); }
    if (path === 'font') ensureFont();
    if (path === 'yearFmt') $('#rowYearCustom').hidden = v !== 'custom';
    if (path === 'layout') { ui.sel = null; clampAnchors(S); }
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
        if (el.type === 'number' && (isNaN(v) || v < 1900 || v > 2200)) { el.setAttribute('aria-invalid', 'true'); return; }
        if (el.type === 'number') el.removeAttribute('aria-invalid');
        change(path, v);
      });
      /* 해를 비우거나 엉뚱한 수를 넣고 나가면, 카드에 실제로 쓰인 해로 되돌린다 */
      if (el.type === 'number') el.addEventListener('change', function () {
        var v = parseFloat(el.value);
        if (isNaN(v) || v < 1900 || v > 2200) { el.value = getPath(S, path); el.removeAttribute('aria-invalid'); toast('해는 1900 ~ 2200 사이로 써 주세요'); }
      });
    });
  }

  /* force: 커서가 있는 칸도 바꾼다 (다른 창에서 고친 판을 불러왔을 때) — 커서 자리는 지킨다 */
  function syncControls(force) {
    $$('[data-bind]').forEach(function (el) {
      var v = getPath(S, el.getAttribute('data-bind'));
      if (el.classList.contains('seg')) {
        $$('button[data-v]', el).forEach(function (b) { var on = String(v) === b.getAttribute('data-v'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      } else if (el.type === 'checkbox') {
        el.checked = !!v;
      } else if (document.activeElement !== el) {
        el.value = v == null ? '' : v;
      } else if (force) {
        var nv = v == null ? '' : String(v);
        if (el.value === nv) return;
        var a = null, b = null;
        try { a = el.selectionStart; b = el.selectionEnd; } catch (e) {}
        el.value = nv;
        try { if (a != null) el.setSelectionRange(Math.min(a, nv.length), Math.min(b, nv.length)); } catch (e) {}
      }
    });
    $('#outStretch').textContent = '×' + (+S.stretch).toFixed(2);
    $('#rowYearCustom').hidden = S.yearFmt !== 'custom';
    $$('#paletteChips .chip').forEach(function (b) { var on = b.dataset.paper === S.paper && b.dataset.ink === S.ink; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    $$('#themeChips .chip').forEach(function (b) { var on = b.dataset.theme === S.theme; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
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

  function otherChar() { return ui.customChars['char:' + S.ilju + ':' + (S.gender === 'm' ? 'f' : 'm')] || null; }
  function syncCustomChar() {
    var cc = customChar(), oc = otherChar();
    $('#customCharState').textContent = cc ? '지금 일주에 내 그림이 들어가 있어요.' : '지금은 기본 캐릭터예요.';
    $$('#segCharMode button').forEach(function (b) { var on = !!cc && cc.mode === b.dataset.v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    /* '여 · 남 같이'는 저장된 그림을 보고 맞춘다: 둘이 같은 그림이거나 아직 아무 그림도 없으면 켜고, 따로 올렸으면 끈다 */
    $('#inCharBoth').checked = (!cc && !oc) || !!(cc && oc && cc.dataURL === oc.dataURL);
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
    $('#drawerTabs').innerHTML = P.CATS.map(function (c) { var on = c.id === ui.drawerCat; return '<button class="chip' + (on ? ' on' : '') + '" data-cat="' + c.id + '" type="button" aria-pressed="' + on + '">' + c.name + '</button>'; }).join('');
    var h = '';
    Object.keys(P.P).forEach(function (k) {
      if (P.P[k].cat !== ui.drawerCat) return;
      h += '<button class="prop" data-prop="' + k + '" type="button" title="' + P.P[k].name + '">' + iconSVG(k) + '<span>' + P.P[k].name + '</span></button>';
    });
    $('#drawer').innerHTML = h;
  }

  /* ─────────────── 고르기 · 끌기 ─────────────── */

  var NAMES = { year: '해 (맨 윗줄)', top: '윗줄', bottom: '아랫줄', char: '캐릭터', caption: '뒷면 한 마디', 'seal-front': '낙관', 'seal-back': '낙관', backimg: '뒷면 그림' };
  function backFitS() { return S.back.frame === false ? 1.1 : 0.94; }

  /* 글자 줄의 실제 크기 (틀 · 옆 장식 · 낙관에 막혀 줄어든 뒤의 크기) — card.js 가 그리는 것과 같은 계산 */
  function fitNow(id) {
    if (!C.textFit || id === 'char') return null;
    var side = id === 'caption' ? 'back' : 'front', r = null;
    try { r = C.textFit(renderState(), side, id, env(side === 'back' ? 'b' : 'f')); } catch (e) { r = null; }
    return r && r.size > 0 ? r : null;
  }
  /* ＋ 로 키워도 막혀서 안 커지면 그 크기는 적어 두지 않는다 (나중에 － 를 여러 번 눌러야 줄어드는 일이 없게).
     － 는 실제로 줄어들 때까지 (예전에 쌓인, 안 보이는 크기는 건너뛴다) */
  function scaleText(id, off, f) {
    var s0 = off.s || 1, before = fitNow(id);
    off.s = clamp(s0 * f, 0.3, 3);
    if (!before) return;
    var after = fitNow(id);
    if (!after) return;
    if (f > 1) {
      if (after.size <= before.size * (1 + (f - 1) * 0.25)) { off.s = s0; blockedToast(); }
      return;
    }
    for (var k = 0; k < 40 && off.s > 0.3 && after.size >= before.size * (1 - (1 - f) * 0.25); k++) {
      off.s = clamp(off.s * f, 0.3, 3);
      after = fitNow(id) || after;
    }
  }
  function blockedToast() {
    var now = Date.now();
    if (now - (blockedToast.at || 0) < 2500) return;
    blockedToast.at = now;
    toast('틀이나 옆 장식 · 낙관에 닿아서 더 커지지 않아요 — 옆 장식을 옮기거나 줄여 보세요');
  }

  function handle(id) {
    if (!id) return null;
    if (id.indexOf('item:') === 0) {
      var i = +id.slice(5), it = S.items[i];
      if (!it) return null;
      return {
        name: (P.P[it.prop] || {}).name || '장식', item: true,
        get: function () { return it.slot ? [it.dx || 0, it.dy || 0] : [it.x, it.y]; },
        set: function (x, y) {
          if (it.slot) { var p = layout().slots[it.slot] || [300, 450]; it.dx = clampAt(p[0], x, BOX.x0, BOX.x1); it.dy = clampAt(p[1], y, BOX.y0, BOX.y1); }
          else { it.x = clamp(x, BOX.x0, BOX.x1); it.y = clamp(y, BOX.y0, BOX.y1); }
        },
        scale: function (f) { it.s = clamp((it.s || 1) * f, 0.2, 4); },
        rotate: function (d) { it.r = ((it.r || 0) + d) % 360; },
        flip: function () { it.flip = !it.flip; },
        dup: function () {
          var a = absItems()[i], c = { prop: it.prop, x: clamp(a.x + 24, BOX.x0, BOX.x1), y: clamp(a.y + 24, BOX.y0, BOX.y1), s: it.s, s0: it.s0 || (it.slot ? C.SLOT_SIZE[it.slot] : 0.8), r: it.r, flip: it.flip };
          S.items.push(c); return 'item:' + (S.items.length - 1);
        },
        del: function () { S.items.splice(i, 1); },
        /* 제자리로: 자리 장식은 처음 자리 · 크기 · 방향, 꺼내 놓은 장식은 처음 크기 · 방향 (놓은 자리는 그대로) */
        reset: function () {
          if (it.slot) { it.dx = 0; it.dy = 0; it.s = C.SLOT_SIZE[it.slot] || 0.7; it.flip = /r$/.test(it.slot) && !NO_FLIP[it.prop]; }
          else { it.s = it.s0 || 0.8; it.flip = false; }
          it.r = 0;
        }
      };
    }
    if (/^(year|top|bottom|char|caption)$/.test(id)) {
      var o = function () { return (S.offsets[id] = S.offsets[id] || {}); };
      return {
        name: NAMES[id],
        get: function () { var c = S.offsets[id] || {}; return [c.dx || 0, c.dy || 0]; },
        set: function (x, y) { var b = textBase(S, id); o().dx = clampAt(b[0], x, BOX.x0, BOX.x1); o().dy = clampAt(b[1], y, BOX.y0, BOX.y1); },
        scale: function (f) { scaleText(id, o(), f); },
        rotate: function (d) { o().r = ((o().r || 0) + d) % 360; },
        flip: id === 'char' ? function () { S.charFlip = !S.charFlip; } : null,
        reset: function () { delete S.offsets[id]; }
      };
    }
    if (id === 'seal-front' || id === 'seal-back') {
      var side = id.slice(5);
      /* 읽기만 할 때는 적어 두지 않는다 — 눌러만 봐도 지금 틀의 기본 자리가 박혀서, 틀을 바꿔도 낙관이 따라가지 않던 일 */
      var q = function () { return (S.seal.pos[side] = S.seal.pos[side] || C.sealPos(S, side)); };
      return {
        name: NAMES[id],
        get: function () { var p = C.sealPos(S, side); return [p.x, p.y]; },
        set: function (x, y) { var p = q(); p.x = clamp(x, BOX.x0, BOX.x1); p.y = clamp(y, BOX.y0, BOX.y1); },
        scale: function (f) { var p = q(); p.s = clamp((p.s || 1) * f, 0.4, 3); },
        reset: function () { delete S.seal.pos[side]; }
      };
    }
    if (id === 'backimg') {
      var fit = S.back.fit, sl = $('#inBackScale');
      return {
        name: NAMES[id],
        get: function () { return [fit.dx || 0, fit.dy || 0]; },
        set: function (x, y) { fit.dx = clampAt(300, x, BOX.x0, BOX.x1); fit.dy = clampAt(450, y, BOX.y0, BOX.y1); },
        /* ⑤ 의 '그림 크기' 밀대와 같은 범위로 (밀대가 끝에 붙어서 다음 손질에 크기가 튀지 않게) */
        scale: function (f) { fit.s = clamp((fit.s || 1) * f, +(sl && sl.min) || 0.4, +(sl && sl.max) || 1.3); },
        reset: function () { fit.dx = 0; fit.dy = 0; fit.s = backFitS(); }
      };
    }
    return null;
  }

  function select(id, side) {
    ui.sel = id; ui.selSide = side || ui.selSide;
    updateSel();
  }

  /* 상자 하나로 감싸기 (cls 가 'focus-only' 면 고르지는 않고 키보드가 머문 자리만) */
  function drawBox(wrap, els, cls) {
    var r0 = wrap.getBoundingClientRect(), box = null;
    els.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (!r.width && !r.height) return;
      box = box ? { l: Math.min(box.l, r.left), t: Math.min(box.t, r.top), r: Math.max(box.r, r.right), b: Math.max(box.b, r.bottom) } : { l: r.left, t: r.top, r: r.right, b: r.bottom };
    });
    var sb = $('.selbox', wrap);
    if (!box || !sb) return;
    sb.hidden = false;
    sb.classList.toggle('focus-only', cls === 'focus-only');
    sb.style.left = (box.l - r0.left - 4) + 'px'; sb.style.top = (box.t - r0.top - 4) + 'px';
    sb.style.width = (box.r - box.l + 8) + 'px'; sb.style.height = (box.b - box.t + 8) + 'px';
  }
  /* 고른 것은 없지만 키보드가 카드 위 요소에 머물러 있으면 그 자리를 보여 준다 (Esc 뒤 · 지운 뒤에도 어디 있는지 보이게) */
  function focusBox() {
    var ae = document.activeElement, id = ae && ae.getAttribute && ae.getAttribute('data-el');
    if (!id || !$('#cards').classList.contains('kbd')) return;
    var wrap = ae.closest('.card-wrap');
    if (!wrap || wrap.offsetParent === null) return;
    drawBox(wrap, $$('[data-el="' + id + '"]', $('.card-host', wrap)), 'focus-only');
  }

  function updateSel() {
    var h = handle(ui.sel);
    $$('.selbox').forEach(function (b) { b.hidden = true; b.classList.toggle('focus-only', false); });
    if (!h) { $('#selbar').hidden = true; ui.sel = null; focusBox(); return; }
    var wrap = $('.card-wrap[data-side="' + ui.selSide + '"]'), host = $('.card-host', wrap);
    var els = $$('[data-el="' + ui.sel + '"]', host);
    /* 안 보이는 카드(앞면만 볼 때의 뒷면 등)의 것은 손잡이를 띄우지 않는다 */
    if (!els.length || wrap.offsetParent === null) { $('#selbar').hidden = true; return; }
    drawBox(wrap, els);
    /* 손잡이 줄이 막 나타났으면 이름은 다음 장면에 (화면 낭독기가 첫 이름을 놓치지 않게) */
    var bar = $('#selbar'), nm = $('#selName'), was = bar.hidden;
    bar.hidden = false;
    if (was) { nm.textContent = ''; requestAnimationFrame(function () { if (!bar.hidden) nm.textContent = h.name; }); }
    else if (nm.textContent !== h.name) nm.textContent = h.name;
    $$('#selbar [data-act]').forEach(function (b) {
      var a = b.dataset.act, ok = a === 'smaller' || a === 'bigger' || a === 'reset' ||
        (a === 'rotL' || a === 'rotR') && !!h.rotate || a === 'flip' && !!h.flip || (a === 'dup' || a === 'del') && !!h.item;
      b.hidden = !ok;
    });
  }

  function act(a) {
    var h = handle(ui.sel);
    if (!h || $('#selbar').hidden) return;
    var ae = document.activeElement, fromBar = !!(ae && ae.closest && ae.closest('#selbar')), id0 = ui.sel, side0 = ui.selSide;
    if (a === 'smaller') h.scale(1 / 1.1);
    else if (a === 'bigger') h.scale(1.1);
    else if (a === 'rotL' && h.rotate) h.rotate(-10);
    else if (a === 'rotR' && h.rotate) h.rotate(10);
    else if (a === 'flip' && h.flip) h.flip();
    else if (a === 'dup' && h.dup) ui.sel = h.dup();
    else if (a === 'del' && h.del) { h.del(); ui.sel = null; }
    else if (a === 'reset') h.reset();
    syncControls(); markDirty();
    if (a === 'del' && fromBar) {
      /* 손잡이 줄의 ✕ 로 지웠으면 포커스가 사라진 단추에 남지 않게 — 그 자리의 다음 장식으로 (고르지는 않는다) */
      render(); refocus(id0, side0);
      $('#cards').classList.toggle('kbd', lastInput === 'key');
      updateSel();
    } else requestRender();
  }

  function toSvg(svg, e) {
    var pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  var drag = null;
  function bindDrag(host, side) {
    host.addEventListener('pointerdown', function (e) {
      if (e.button) return;   /* 왼쪽 단추 · 손가락만 */
      var g = e.target.closest && e.target.closest('[data-el]');
      if (!g) { select(null); return; }
      var id = g.getAttribute('data-el'), h = handle(id), svg = host.querySelector('svg');
      if (!h || !svg) return;
      select(id, side);
      /* 카드를 누르면 입력칸에서 손을 뗀다 — 그래야 화살표 · Delete 가 고른 것에 간다 */
      var f = g.hasAttribute('tabindex') ? g : host.querySelector('[data-el="' + id + '"][tabindex]');
      if (f) { ui.refocusing = true; try { f.focus({ preventScroll: true }); } catch (err) {} finally { ui.refocusing = false; } }
      else { var ae = document.activeElement; if (ae && /^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName)) ae.blur(); }
      $('#cards').classList.remove('kbd');
      drag = { host: host, h: h, p0: toSvg(svg, e), orig: h.get(), moved: false };
      try { host.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault();
    });
    /* 키보드(Tab)로 들어오면 그것을 고른다. 다시 그린 뒤 스크립트가 포커스를 되돌린 것(refocusing)은 건드리지 않는다 */
    host.addEventListener('focusin', function (e) {
      var g = e.target.closest && e.target.closest('[data-el]');
      if (!g || ui.refocusing) return;
      $('#cards').classList.toggle('kbd', lastInput === 'key');
      var id = g.getAttribute('data-el');
      if (ui.sel !== id || ui.selSide !== side) select(id, side);
      else updateSel();
    });
    host.addEventListener('focusout', function (e) {
      if (ui.refocusing || (e.relatedTarget && host.contains(e.relatedTarget))) return;
      $('#cards').classList.remove('kbd');
      if (!ui.sel) updateSel();   /* 키보드가 머문 자리 표시도 지운다 */
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
      /* 끄는 동안 다른 창에서 온 소식은 손을 뗀 다음에 (옮겼으면 저장할 때 따로 저장된다) */
      var pm = pendingMsg; pendingMsg = null;
      if (pm) onChan(pm);
    }
    host.addEventListener('pointerup', end);
    host.addEventListener('pointercancel', end);
    host.addEventListener('wheel', function (e) {
      if (!ui.sel || ui.selSide !== side) return;
      var g = e.target.closest && e.target.closest('[data-el="' + ui.sel + '"]');
      if (!g) return;
      /* 세로로 굴린 만큼만 (가로로 밀기는 무시). 마우스 한 칸(100px) ≈ ×1.05, 트랙패드는 조금씩 */
      if (!e.deltaY || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      var dy = clamp(e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1), -300, 300);
      handle(ui.sel).scale(Math.exp(-dy * 0.0005));
      if (ui.sel === 'backimg') syncControls();
      requestRender(); markDirty();
    }, { passive: false });
  }

  /* ─────────────── 올린 그림 ─────────────── */

  /* → { url: PNG data URL, w, h } */
  function readImage(file, max) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
        if (!w || !h) { URL.revokeObjectURL(url); reject(new Error('그림을 읽지 못했어요')); return; }
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve({ url: c.toDataURL('image/png'), w: c.width, h: c.height });
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('그림을 읽지 못했어요')); };
      img.src = url;
    });
  }

  /* 알림: 보관함 창이 열려 있으면 그 안에 띄운다 (창 뒤에 가려지지 않게) */
  function toast(t, ms) {
    var el = $('#toast'), dlg = $('#archive'), home = dlg && dlg.open ? dlg : document.body;
    if (el.parentNode !== home) home.appendChild(el);
    el.textContent = t; el.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { el.hidden = true; }, ms || Math.max(2600, Math.min(8000, 1600 + String(t).length * 60)));
  }

  /* ─────────────── ⑥ 그림 프롬프트 ─────────────── */

  var STYLE_DEFAULT = 'simple hand-drawn doodle illustration, clean red marker line art on mustard yellow paper, Korean talisman card, cute chibi, flat colors, minimal shading, centered composition, plenty of empty space, no text';
  var NEG_DEFAULT = 'text, letters, watermark, signature, realistic, photo, 3d render, gradient, dark, scary, blurry, messy lines';

  function llmCfg() {
    if (!ui.llm) ui.llm = { engine: 'ollama', urls: {}, models: {}, style: STYLE_DEFAULT, neg: NEG_DEFAULT, n: 2 };
    return ui.llm;
  }
  function saveLlm() {
    return BJ.store.put('kv', 'llm', ui.llm).catch(function (e) { toast((e && e.message) || '설정을 저장하지 못했어요', 5000); });
  }

  var HELP = {
    ollama: 'Ollama 를 깔고 한국어가 되는 모델을 하나 받아 두면 돼요 (예: <code>ollama pull gemma3:12b</code> · 가볍게는 <code>gemma3:4b</code> · 한국어 특화 <code>exaone3.5:7.8b</code>). 이 페이지를 <code>http://localhost</code> 로 열면 바로 되고, 다른 주소(배포한 사이트 · 파일로 열기)라면 Ollama 에 그 주소를 허락해 줘야 해요 — README 의 “Ollama 연결” 참고.',
    openai: 'LM Studio 라면 Developer 탭에서 서버를 켜고 “Enable CORS” 를 켜 주세요. 주소는 보통 <code>http://localhost:1234/v1</code>. llama.cpp 서버 · Jan 도 같은 방식이에요.',
    webllm: '설치 없이 이 브라우저 안에서 돌아가요 (크롬 · 엣지 최신판, WebGPU 필요). 처음 한 번 모델(2~3GB)을 받아서 시간이 걸리고, 그다음부터는 빨라요. 작은 모델이라 아이디어가 단순할 수 있어요.',
    rules: 'LLM 없이 고민 속 낱말(건강 · 시험 · 돈 · 연애 …)로 준비된 장면을 골라요. 언제나 되지만 고민에 꼭 맞춘 장면은 아니에요.'
  };

  function syncEngine() {
    var cfg = llmCfg(), eng = cfg.engine, def = BJ.llm.ENGINES.filter(function (e) { return e.id === eng; })[0] || BJ.llm.ENGINES[0];
    /* 엔진을 바꾸면 앞 엔진의 모델 목록 · 연결 상태는 지운다 */
    if (ui.lastEngine && ui.lastEngine !== eng) {
      $('#modelList').innerHTML = '';
      if (!ui.running) { setStatus(''); countEl().textContent = ''; }
    }
    ui.lastEngine = eng;
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
    var st = (llmCfg().style || '').trim(), body = (p || '').trim().replace(/[\s,.]+$/, '');
    return body ? body + (st ? ', ' + st : '') : st;
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
        /* 모델이 영어 프롬프트를 안 줬으면 (장면 글만 온 경우) 프롬프트 칸은 감춘다 */
        (String(x.prompt_en || '').trim() ? '<div class="prompt"><div class="prompt-h"><b>레퍼런스 프롬프트</b><button class="btn small" data-copy="p' + i + '" type="button">복사</button></div><code id="p' + i + '">' + esc(fullPrompt(x.prompt_en)) + '</code></div>' +
        (neg ? '<div class="prompt neg"><div class="prompt-h"><b>네거티브</b><button class="btn small ghost" data-copy="n' + i + '" type="button">복사</button></div><code id="n' + i + '">' + esc(neg) + '</code></div>' : '') : '') +
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
      lines.push((i + 1) + '. ' + x.title, x.scene || '', '자세: ' + (x.pose || ''), '소품: ' + (x.props || []).join(', '), '바뀐 것: ' + (x.symbol || ''), '한 마디: ' + (x.caption || ''), 'Prompt: ' + fullPrompt(x.prompt_en), 'Negative: ' + (llmCfg().neg || ''), '');
    });
    return lines.join('\n');
  }

  /* 상태 줄(화면 낭독기가 읽는 곳)은 바뀔 때만 쓰고, 글자 수 같은 잦은 숫자는 옆 칸(읽지 않음)에 */
  function setStatus(t, err) {
    var st = $('#llmStatus');
    st.className = 'llm-status' + (err ? ' err' : '');
    if (st.textContent !== t) st.textContent = t;
  }
  function countEl() {
    var c = $('#llmCount');
    if (!c) {
      c = document.createElement('span');
      c.id = 'llmCount'; c.className = 'llm-count'; c.setAttribute('aria-hidden', 'true');
      $('#llmStatus').insertAdjacentElement('afterend', c);
    }
    return c;
  }

  /* 지금 도는 생성을 멈춘다 (다른 부적을 열거나 새 부적을 만들 때 · 멈추기). 늦게 온 답은 runSeq 로 버린다 */
  function stopRun(quiet) {
    var was = !!ui.running;
    if (ui.running) { try { ui.running.abort(); } catch (e) {} }
    ui.running = null; ui.runSeq++;
    $('#btnIdeas').textContent = '그림 아이디어 만들기';
    $('#ideas').removeAttribute('aria-busy');
    countEl().textContent = '';
    $('#llmStream').hidden = true;
    if (was) setStatus(quiet ? '' : '멈췄어요.');
  }

  function runIdeas() {
    if (ui.running) { stopRun(); return; }
    var cfg = engineConf(), btn = $('#btnIdeas'), stream = $('#llmStream'), count = countEl();
    var ctl = new AbortController(), engName = (BJ.llm.ENGINES.filter(function (e) { return e.id === cfg.engine; })[0] || {}).name;
    var runId = ++ui.runSeq, doc = S, writing = false;
    ui.running = ctl;
    btn.textContent = '멈추기';
    setStatus(cfg.engine === 'rules' ? '' : '연결하는 중…');
    count.textContent = '';
    $('#ideas').setAttribute('aria-busy', 'true');
    stream.hidden = cfg.engine === 'rules';
    stream.textContent = '';
    function live() { return runId === ui.runSeq; }
    BJ.llm.generate(cfg, llmInput(), {
      signal: ctl.signal,
      onStatus: function (t) {
        if (!live()) return;
        /* '모델 준비 중 (처음 한 번만 받아요) · 37% · 335MB…' → 앞말만 상태 줄(화면 낭독기가 읽는 곳)에, 바뀌는 숫자는 옆 칸에 */
        t = String(t || '');
        var m = /^(.*?)\s*(?:[:：]|\s·\s)\s*([\s\S]*)$/.exec(t), head = (m ? m[1] : t).replace(/…$/, '').trim() || t.trim();
        setStatus(head === t.trim() ? head : head + '…');
        count.textContent = m ? m[2].replace(/^[\s:：·]+/, '').slice(0, 80) : '';
      },
      onToken: function (t, raw) {
        if (!live()) return;
        stream.textContent = raw.slice(-1600); stream.scrollTop = stream.scrollHeight;
        if (!writing) { writing = true; setStatus('쓰는 중…'); }
        count.textContent = raw.length + '자';
      }
    }).then(function (r) {
      if (!live()) return;
      var res = { data: r.data, engine: cfg.engine, engineName: engName + (cfg.model ? ' · ' + cfg.model : ''), at: Date.now() };
      /* 부탁한 그 부적(이 창에서 따로 저장되어 이름표가 바뀌었어도 같은 부적)에만 넣는다.
         다른 부적을 열면 생성은 멈추니(stopRun) 여기까지 오는 것은 같은 부적뿐 — 다른 부적에 몰래 써 넣지 않는다 */
      if (S === doc) {
        S.ideas = cleanIdeas(res) || res;
        renderIdeas(); markDirty();
        setStatus('아이디어 ' + ((S.ideas.data.ideas || []).length) + '개를 만들었어요.');
      } else setStatus('');
      stream.hidden = true;
    }).catch(function (e) {
      if (!live()) return;
      if (e && e.name === 'AbortError') { setStatus('멈췄어요.'); return; }
      var msg = (e && e.message) || '알 수 없는 오류가 났어요';
      if (cfg.engine !== 'rules') msg += ' — 급하면 엔진을 “LLM 없이”로 바꿔도 돼요.';
      setStatus(msg, true);
      stream.hidden = !stream.textContent;
    }).then(function () {
      if (!live()) return;
      ui.running = null;
      btn.textContent = '그림 아이디어 만들기';
      count.textContent = '';
      $('#ideas').removeAttribute('aria-busy');
    });
  }

  function bindLlm() {
    $('#inEngine').innerHTML = BJ.llm.ENGINES.map(function (e) { return '<option value="' + e.id + '">' + e.name + '</option>'; }).join('');
    $('#inEngine').addEventListener('change', function () { llmCfg().engine = this.value; syncEngine(); saveLlm(); });
    /* 주소는 고친 모양(http:// 붙이기 · 끝의 /api/chat 떼기)으로 저장하고 칸에도 그대로 보여 준다 — 다시 열어도 같은 주소로 */
    $('#inEngineUrl').addEventListener('change', function () {
      var eng = llmCfg().engine, v = this.value.trim();
      if (v) llmCfg().urls[eng] = BJ.llm.normalizeUrl(eng, v); else delete llmCfg().urls[eng];
      syncEngine(); saveLlm();
    });
    $('#inEngineModel').addEventListener('change', function () { llmCfg().models[llmCfg().engine] = this.value.trim(); syncEngine(); saveLlm(); });
    $('#inStyle').addEventListener('change', function () { llmCfg().style = this.value; saveLlm(); renderIdeas(); });
    $('#inNeg').addEventListener('change', function () { llmCfg().neg = this.value; saveLlm(); renderIdeas(); });
    $('#inIdeas').addEventListener('change', function () { llmCfg().n = +this.value; saveLlm(); });
    var EMPTY = {
      ollama: '설치된 모델이 없어요. 터미널에서 ollama pull 로 하나 받아 주세요 (예: ollama pull gemma3:12b).',
      openai: '불러온 모델이 없어요. LM Studio 같은 서버에서 모델을 불러온(Load) 뒤 다시 눌러 주세요.',
      webllm: '이 브라우저에서 돌릴 수 있는 모델을 찾지 못했어요.'
    };
    $('#btnModels').addEventListener('click', function () {
      var eng = llmCfg().engine;
      /* 생성 중에는 상태 줄을 그 생성에 맡기고, 목록 결과는 알림으로 */
      function say(t, err) { if (ui.running) toast(t, err ? 6000 : 0); else setStatus(t, err); }
      if (eng === 'rules') { say('“LLM 없이”는 모델이 필요 없어요.'); return; }
      if (!ui.running) setStatus('모델 목록을 불러오는 중…');
      BJ.llm.listModels(engineConf()).then(function (list) {
        if (llmCfg().engine !== eng) return;   /* 그사이 엔진을 바꿨으면 버린다 */
        list = (list || []).map(String);
        /* 주소 끝에 /v1 이 빠져 있었으면 찾은 주소로 고쳐 둔다 */
        if (eng === 'openai' && BJ.llm.effectiveUrl) {
          var was = engineConf().url, eff = BJ.llm.effectiveUrl('openai', was);
          if (eff && eff !== BJ.llm.normalizeUrl('openai', was)) { llmCfg().urls.openai = eff; syncEngine(); saveLlm(); toast('주소 끝에 /v1 을 붙였어요: ' + eff, 4000); }
        }
        $('#modelList').innerHTML = list.map(function (m) { return '<option value="' + esc(m) + '">'; }).join('');
        if (!list.length) { say(EMPTY[eng] || '모델이 없어요.'); return; }
        /* 비어 있으면 목록의 첫째(엔진 쪽에서 쓸 만한 순서로 준 것)를 넣는다 */
        if (!llmCfg().models[eng]) { llmCfg().models[eng] = list[0]; syncEngine(); saveLlm(); }
        say('연결됨 · 모델 ' + list.length + '개: ' + list.slice(0, 6).join(', ') + (list.length > 6 ? ' …' : ''));
      }).catch(function (e) { if (llmCfg().engine === eng) say((e && e.message) || '모델 목록을 불러오지 못했어요', true); });
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
        var x = S.ideas && S.ideas.data.ideas[+b.dataset.cap];
        if (!x) return;
        /* 뒷면 한 마디 칸과 같은 길이까지만 (모델이 길게 써도 카드 글자가 깨알만 해지지 않게) */
        /* 칸의 maxlength 는 UTF-16 단위로 센다 (이모지 하나 = 2) — 같은 셈으로, 글자를 반으로 쪼개지 않고 */
        var max = +$('#inCaption').maxLength > 0 ? +$('#inCaption').maxLength : 20, full = clean(x.caption || '').trim(), out = '';
        Array.from(full).some(function (ch) { if ((out + ch).length > max) return true; out += ch; return false; });
        S.back.caption = out.trim();
        var cut = out.length < full.length;
        syncControls(); requestRender(); markDirty();
        toast(cut ? '한 마디가 칸보다 길어서 앞부분만 넣었어요 — ⑤ 뒷면에서 다듬어 주세요' : '뒷면 한 마디에 넣었어요', cut ? 5000 : 0);
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
    /* 빼는 것은 SVG 가 접어 버리는 ASCII 빈칸뿐 — U+3000 같은 다른 빈칸은 폭이 글꼴마다 달라서 받아 둔다 (띄어쓰기는 fonts.js 가 넣는다) */
    return { main: main.replace(/[\t\n\r ]/g, '') || '가', hanja: hanja };
  }

  /* → { svg, failed } — failed: 글꼴 일부를 받지 못해 컴퓨터 글꼴로 대신 그려진다 */
  function exportParts(side, opts) {
    opts = opts || {};
    var u = usedChars(side);
    /* 빈 뒷면 틀(그림판용)에는 글자가 없다 — 글꼴을 받지 않는다 */
    var fonts = opts.blankBack ? Promise.resolve({ css: '', failed: false }) : F.embedCSS(S.font, u.main, u.hanja);
    return fonts.then(function (fc) {
      var rs = renderState();
      if (opts.blankBack) rs = Object.assign({}, rs, { back: Object.assign({}, rs.back, { caption: '' }), seal: Object.assign({}, rs.seal, { where: 'none' }) });
      var e = env(side === 'front' ? 'xf' : 'xb', { fontCSS: fc.css, backImage: opts.blankBack ? null : S.back.image });
      return { svg: side === 'front' ? C.front(rs, e) : C.back(rs, e), failed: !!fc.failed };
    });
  }
  function exportSVG(side, opts) { return exportParts(side, opts).then(function (r) { return r.svg; }); }
  var FONT_WARN = '받았어요. 다만 글꼴을 받지 못해 컴퓨터 글꼴로 그려졌어요 — 인터넷 연결을 확인하고 다시 받아 주세요.';

  function fileBase() {
    var info = G.ilju(S.ilju);
    return ('부적_' + (S.name ? S.name.replace(/[\\/:*?"<>|\s]+/g, '_') + '_' : '') + info.ko + (S.gender === 'm' ? '남' : '여')).slice(0, 60);
  }

  function outStatus(t, cls) { var st = $('#outStatus'); st.className = 'llm-status' + (cls ? ' ' + cls : ''); st.textContent = t; }

  function doExport(kind) {
    var scale = +$('#inScale').value || 3, failed = false;
    outStatus('그리는 중…');
    function part(side) { return exportParts(side).then(function (r) { failed = failed || r.failed; return BJ.exporter.toCanvas(r.svg, scale); }); }
    var job;
    if (kind === 'both') {
      job = Promise.all([part('front'), part('back')])
        .then(function (cs) { return BJ.exporter.canvasBlob(BJ.exporter.sideBySide(cs[0], cs[1], scale)); })
        .then(function (b) { BJ.exporter.download(b, fileBase() + '_앞뒤.png'); });
    } else {
      job = part(kind).then(BJ.exporter.canvasBlob).then(function (b) { BJ.exporter.download(b, fileBase() + (kind === 'front' ? '_앞.png' : '_뒤.png')); });
    }
    job.then(function () { if (failed) outStatus(FONT_WARN, 'err'); else outStatus('받았어요.'); })
      .catch(function (e) { outStatus((e && e.message) || '내보내지 못했어요', 'err'); });
  }

  function doPrint() {
    /* 인쇄 창은 누른 그 자리에서 먼저 연다 (다 그린 뒤에 열면 팝업 차단에 걸린다) */
    var w = BJ.exporter.openPrint(fileBase()), failed = false;
    if (!w) { outStatus('팝업이 막혔어요. 주소창 옆에서 팝업을 허용하고 다시 눌러 주세요.', 'err'); return; }
    outStatus('인쇄용으로 그리는 중…');
    Promise.all([exportParts('front'), exportParts('back')]).then(function (r) {
      failed = r[0].failed || r[1].failed;
      return Promise.all([BJ.exporter.toCanvas(r[0].svg, 4), BJ.exporter.toCanvas(r[1].svg, 4)]);
    }).then(function (cs) {
      if (w.closed) { outStatus('인쇄 창이 닫혀서 멈췄어요.'); return; }
      BJ.exporter.print(cs.map(function (c) { return c.toDataURL('image/png'); }), fileBase(), w);
      outStatus((failed ? '글꼴을 받지 못해 컴퓨터 글꼴로 그렸어요 (인터넷 연결 확인). ' : '') + '인쇄 창을 열었어요. 배율은 100%(실제 크기)로 맞춰 주세요.', failed ? 'err' : '');
    }).catch(function (e) {
      try { w.close(); } catch (e2) {}
      outStatus((e && e.message) || '인쇄용으로 그리지 못했어요', 'err');
    });
  }

  function backTemplate() {
    exportParts('back', { blankBack: true }).then(function (r) { return BJ.exporter.toCanvas(r.svg, 3); })
      .then(BJ.exporter.canvasBlob).then(function (b) {
        BJ.exporter.download(b, '빈_뒷면_1800x2700.png');
        toast('빈 뒷면을 받았어요. 그림판 앱에서 이 위에 그리면 크기가 딱 맞아요.', 4000);
      })
      .catch(function (e) { toast((e && e.message) || '빈 뒷면을 만들지 못했어요'); });
  }

  /* ─────────────── 보관함 ─────────────── */

  /* 보관함 목록에 보여 줄 만큼만 (저장된 값을 그대로 HTML 에 넣지 않는다) */
  function peek(v) {
    v = v && typeof v === 'object' ? v : {};
    return {
      name: str(v.name, 40), ilju: G.ilju(prim(v.ilju)).index, gender: v.gender === 'm' ? 'm' : 'f', mode: v.charMode === 'line' ? 'line' : 'color',
      ink: isHex(v.ink) ? v.ink : '#C93B22', paper: isHex(v.paper) ? v.paper : '#F2BE35',
      text: str(v.topText, 24) + ' ' + str(v.bottomText, 24), at: numIn(v.updatedAt, 0, 1e15, 0), worry: !!v.worry, img: !!(v.back && v.back.image)
    };
  }
  function archiveRow(r, d) {
    var info = G.ilju(d.ilju), when = new Date(d.at || Date.now()), key = esc(r.key);
    return '<li class="' + (r.key === S.id ? 'cur' : '') + '"><div class="thumb">' + BJ.chars.svg(d.ilju, d.gender, { mode: d.mode, ink: d.ink, paper: d.paper }) + '</div>' +
      '<div class="meta"><b title="' + esc(d.name || '이름 없음') + '">' + esc(d.name || '이름 없음') + '</b><span>' + info.ko + '일주 ' + (d.gender === 'm' ? '남' : '여') + ' · ' + esc(d.text) + '</span>' +
      '<span class="dim">' + when.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + (d.worry ? ' · 고민 있음' : '') + (d.img ? ' · 뒷면 그림' : '') + '</span></div>' +
      '<div class="acts"><button class="btn small" data-open="' + key + '" type="button">열기</button><button class="btn small ghost" data-dup="' + key + '" type="button">복제</button><button class="btn small ghost danger" data-del="' + key + '" type="button">지우기</button></div></li>';
  }
  function archiveNote() {
    var n = $('#archive .note');
    if (n) n.textContent = memMode
      ? '이 창에서는 저장이 안 돼요 (사생활 보호 창?). 창을 닫으면 사라지니, 다 만들면 PNG 로 받거나 백업 파일을 받아 두세요.'
      : '만든 부적은 이 브라우저에 저절로 저장돼요. 다른 컴퓨터로 옮기거나 혹시 몰라 남겨 두려면 백업 파일을 받아 두세요.';
  }

  /* 보관함은 무슨 일이 있어도 열린다 (한 줄이 깨져도 그 줄만 '읽을 수 없는 부적'으로) */
  function openArchive() {
    var dlg = $('#archive');
    return save().catch(function () {}).then(function () { return BJ.store.all('designs'); }).then(function (rows) {
      /* 줄마다 미리 한 번만 읽어 두고 그 값으로 줄 세운다 (깨진 줄 하나가 정렬을 멈춰 세우지 않게) */
      var list = rows.map(function (r) { var p = null; try { p = peek(r.value); } catch (e) {} return { r: r, p: p }; });
      list.sort(function (a, b) { return (b.p ? b.p.at : 0) - (a.p ? a.p.at : 0); });
      var h = list.map(function (x) {
        var r = x.r;
        try { if (!x.p) throw new Error('bad'); return archiveRow(r, x.p); } catch (e) {
          return '<li class="bad"><div class="meta"><b>읽을 수 없는 부적</b><span class="dim">저장된 값이 깨져 있어요</span></div>' +
            '<div class="acts"><button class="btn small ghost danger" data-del="' + esc(r.key) + '" type="button">지우기</button></div></li>';
        }
      }).join('');
      $('#archiveList').innerHTML = h || '<li class="empty">아직 저장된 부적이 없어요.</li>';
    }).catch(function (e) {
      $('#archiveList').innerHTML = '<li class="empty">보관함을 읽지 못했어요: ' + esc((e && e.message) || '') + '</li>';
    }).then(function () {
      archiveNote();
      if (dlg.showModal) { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', '');
      var t = $('#toast'); if (!t.hidden && t.parentNode !== dlg) dlg.appendChild(t);
    });
  }
  function closeArchive() { var d = $('#archive'); if (d.close) d.close(); else d.removeAttribute('open'); }

  /* 저장된 부적을 편집 화면으로. 그리다가 멈추면 (값이 깨진 부적) 보던 부적으로 돌아가고 false */
  function loadDesign(d) {
    var prev = { S: S, dirty: dirty, stored: stored, base: base, sel: ui.sel }, next;
    try { next = migrate(d); } catch (e) { toast('이 부적을 열지 못했어요 — 저장된 값이 깨져 있어요', 6000); return false; }
    stopRun(true);
    clearTimeout(saveTimer);
    S = next;
    /* 저장된 그 자리(id)를 그대로 쓸 수 있을 때만 '저장됨' (깨진 id 라 새로 붙였으면 아직 저장 안 된 부적) */
    stored = !!(d && typeof d === 'object' && d.id === S.id);
    dirty = false;
    base = { id: S.id, at: stored ? S.updatedAt : 0 };
    ui.sel = null;
    saveAlert(null);
    try { afterLoad(); } catch (e) {
      S = prev.S; dirty = prev.dirty; stored = prev.stored; base = prev.base; ui.sel = prev.sel;
      try { afterLoad(); } catch (e2) {}
      if (dirty) markDirty();
      toast('이 부적을 그리지 못했어요 — 저장된 값이 깨져 있어요', 6000);
      return false;
    }
    if (stored) BJ.store.put('kv', 'current', S.id).catch(function () {});
    return true;
  }

  function afterLoad() {
    /* 이 부적에 쓴 내 글꼴이 이 브라우저(목록)에 없으면: 다른 창에서 막 올렸을 수 있어 저장소를 한 번 더 읽어 보고,
       그래도 없으면 기본 글꼴로 보여 주기만 한다 (부적의 글꼴 값은 그대로 — 몰래 바꿔 저장하지 않는다) */
    var fontMissing = typeof S.font === 'string' && S.font.indexOf('custom:') === 0 && !fontOk(S.font);
    buildFontSelect(); syncControls(); buildGrid(); buildDrawer(); showIljuNow(); syncCustomChar(); renderIdeas(); ensureFont(); render();
    if (dirty) setSaveState('저장 중…'); else setSaved();
    if (fontMissing) {
      var fdoc = S;
      loadAssets().catch(function () {}).then(function () {
        if (S !== fdoc) return;
        buildFontSelect(); syncControls();
        if (fontOk(S.font)) { ensureFont(); requestRender(); return; }
        toast('이 부적에 쓴 내 글꼴이 이 브라우저에 없어서 기본 글꼴로 보여 줘요 — ② 글자에서 글꼴 파일을 다시 올리거나 다른 글꼴을 골라 주세요', 7000);
      });
    }
    /* 예전에 올린 뒷면 그림은 비율을 몰라서 — 한 번 재 둔다 */
    if (S.back.image && !S.back.aspect) {
      var im = new Image(), doc = S;
      im.onload = function () { if (S === doc && S.back.image === im.src && im.naturalHeight) { S.back.aspect = im.naturalWidth / im.naturalHeight; requestRender(); } };
      im.src = S.back.image;
    }
  }

  /* 새 부적: 꾸밈(글자 · 틀 · 색 · 장식 · 놓은 자리 · 뒷면 틀과 처리)은 그대로, 신청자 칸(이름 · 고민 · 아이디어 · 뒷면 그림 · 한 마디)만 비운다 */
  function nextDesign() {
    var keep = {};
    STYLE_KEYS.forEach(function (k) { keep[k] = JSON.parse(JSON.stringify(S[k])); });
    var n = fresh();
    Object.assign(n, keep);
    n.items = JSON.parse(JSON.stringify(S.items));
    n.ilju = S.ilju; n.gender = S.gender;
    n.back = Object.assign(fresh().back, { frame: S.back.frame, mode: S.back.mode, fit: { dx: 0, dy: 0, s: S.back.fit.s } });
    return n;
  }
  function switchTo(n) {
    stopRun(true);
    clearTimeout(saveTimer);
    S = n; dirty = false; stored = false; ui.sel = null;
    base = { id: S.id, at: 0 };
    saveAlert(null);
    afterLoad();
  }
  function newDesign() {
    save().then(function () {
      switchTo(nextDesign());
      toast('새 부적 — 꾸밈은 그대로, 신청자 칸은 비웠어요');
    });
  }

  function bindArchive() {
    $('#btnArchive').addEventListener('click', openArchive);
    $('#btnArchiveClose').addEventListener('click', closeArchive);
    $('#archive').addEventListener('close', function () { var t = $('#toast'); if (t.parentNode !== document.body) document.body.appendChild(t); });
    $('#btnNew').addEventListener('click', newDesign);
    $('#archiveList').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.open) {
        var oid = b.dataset.open;
        /* 지금 부적에 남은 것(막 도착한 아이디어 등)을 먼저 저장하고 연다 — 같은 부적을 다시 열어도 저장된 새 판으로 */
        save().catch(function () {}).then(function () { return BJ.store.get('designs', oid); }).then(function (d) {
          if (!d) { toast('그 부적을 찾지 못했어요'); return openArchive(); }
          if (d.id !== oid) d = Object.assign({}, d, { id: oid });
          if (loadDesign(d)) closeArchive();
        }).catch(function (err) { toast((err && err.message) || '열지 못했어요', 5000); });
      } else if (b.dataset.dup) {
        BJ.store.get('designs', b.dataset.dup).then(function (d) {
          if (!d) return;
          var c = migrate(d), SUF = ' (복제)';
          c.id = uid(); c.name = str(c.name || '이름 없음', 40 - SUF.length) + SUF; c.createdAt = c.updatedAt = Date.now();
          return BJ.store.put('designs', c.id, c).then(openArchive);
        }).catch(function (err) { toast((err && err.message) || '복제하지 못했어요', 5000); });
      } else if (b.dataset.del) {
        if (!confirm('이 부적을 보관함에서 지울까요? 되돌릴 수 없어요.')) return;
        var id = b.dataset.del, wasOpen = id === S.id;
        if (wasOpen) { clearTimeout(saveTimer); dirty = false; }
        saving.catch(function () {}).then(function () { return BJ.store.del('designs', id); }).then(function () {
          post({ t: 'deleted', id: id });   /* 같은 부적을 연 다른 창이 다음 저장 때 되살리지 않게 */
          /* 열려 있던 부적을 지웠으면: 꾸밈은 그대로 둔 새 부적으로 (지운 부적이 다음 저장 때 되살아나지 않게) */
          if (wasOpen && id === S.id) {
            switchTo(nextDesign());
            BJ.store.del('kv', 'current').catch(function () {});
            toast('지웠어요. 꾸밈은 그대로 둔 새 부적을 열었어요');
          }
          return openArchive();
        }).catch(function (err) { toast((err && err.message) || '지우지 못했어요', 5000); });
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
        var data;
        try { data = JSON.parse(t); } catch (e) { throw new Error('백업 파일을 읽지 못했어요 (형식이 깨졌어요)'); }
        if (!data || typeof data !== 'object' || data.app !== 'bujeok-gongbang') throw new Error('부적 공방 백업 파일이 아니에요');
        return restore(data);
      }).catch(function (e) { toast((e && e.message) || '불러오지 못했어요', 6000); })
        .then(function () { return openArchive(); });
    });
  }

  /* ─────────────── 백업 불러오기 ─────────────── */

  /* 백업 속 그림 · 글꼴: 이 앱이 만든 모양인지 확인 */
  function cleanAsset(key, v) {
    if (typeof key !== 'string' || !v || typeof v !== 'object') return null;
    var m = /^char:(\d{1,2}):([fm])$/.exec(key);
    if (m && v.kind === 'char' && +m[1] < 60 && typeof v.dataURL === 'string' && IMG_RE.test(v.dataURL)) {
      return { kind: 'char', ilju: +m[1], gender: m[2], dataURL: v.dataURL, mode: oneOf(v.mode, ['normal', 'multiply', 'ink'], 'multiply'), updatedAt: numIn(v.updatedAt, 0, 1e15, 0) };
    }
    m = /^font:([\w-]{1,40})$/.exec(key);
    if (m && v.kind === 'font' && v.id === m[1] && typeof v.dataURL === 'string' && FONT_RE.test(v.dataURL)) {
      return { kind: 'font', id: v.id, name: str(v.name, 60) || '내 글꼴', dataURL: v.dataURL, updatedAt: numIn(v.updatedAt, 0, 1e15, 0) };
    }
    return null;
  }
  function cleanLlm(L) {
    if (!L || typeof L !== 'object') return null;
    var ids = BJ.llm.ENGINES.map(function (e) { return e.id; }), out = { engine: oneOf(L.engine, ids, 'ollama'), urls: {}, models: {}, style: STYLE_DEFAULT, neg: NEG_DEFAULT, n: 2 };
    ids.forEach(function (k) {
      var u = L.urls && L.urls[k], m = L.models && L.models[k];
      /* 'localhost:11434' · 'HTTP://…' 처럼 적어 둔 주소도 고친 모양으로 지킨다 (버리면 다시 열 때 기본 주소로 몰래 바뀐다) */
      if (typeof u === 'string' && u.trim() && (k === 'ollama' || k === 'openai')) {
        var nu = BJ.llm.normalizeUrl(k, u);
        if (/^https?:\/\/[^\s"'<>]{1,300}$/i.test(nu)) out.urls[k] = nu;
      }
      if (typeof m === 'string' && m.length <= 160) out.models[k] = str(m, 160);
    });
    if (typeof L.style === 'string') out.style = str(L.style, 1500);
    if (typeof L.neg === 'string') out.neg = str(L.neg, 1500);
    out.n = Math.round(numIn(L.n, 1, 3, 2));
    return out;
  }

  /* 부적은 더 새 판만, 그림 · 글꼴은 지금 것이 없거나 백업 쪽이 더 새것일 때만 들인다. 깨진 것은 빼고 세어서 알려 준다 */
  function restore(data) {
    var designs = Array.isArray(data.designs) ? data.designs : [], assets = Array.isArray(data.assets) ? data.assets : [];
    var good = [], bad = 0, goodA = [], badA = 0;
    designs.forEach(function (d) {
      if (!d || typeof d !== 'object' || typeof d.id !== 'string' || !ID_RE.test(d.id)) { bad++; return; }
      try {
        var m = migrate(d);
        /* 시각이 없는 부적은 '아주 옛것'으로 (지금 것을 덮지 않게) */
        m.updatedAt = numIn(d.updatedAt, 0, 1e15, 0); m.createdAt = numIn(d.createdAt, 0, 1e15, m.updatedAt);
        good.push(m);
      } catch (e) { bad++; }
    });
    assets.forEach(function (a) { var c = a && cleanAsset(a.key, a.value); if (c) goodA.push({ key: a.key, value: c }); else badA++; });
    var imported = {}, nNew = 0, nOld = 0, aNew = 0, aKept = 0;
    return save().catch(function () {}).then(function () {
      return Promise.all(good.map(function (d) {
        return BJ.store.update('designs', d.id, function (old) {
          if (old && (old.updatedAt || 0) >= (d.updatedAt || 0)) return undefined;
          return d;
        }).then(function (r) { if (r.wrote) { nNew++; imported[d.id] = d; } else nOld++; });
      }).concat(goodA.map(function (a) {
        return BJ.store.update('assets', a.key, function (old) {
          if (!old) return a.value;
          if (old.dataURL === a.value.dataURL && old.mode === a.value.mode) return undefined;   /* 같은 그림 · 같은 처리 */
          if (old.updatedAt && (a.value.updatedAt || 0) > old.updatedAt) return a.value;       /* 둘 다 시각이 있고 백업이 더 새것 (처리만 바뀐 것도) */
          aKept++; return undefined;                                                          /* 지금 것을 지킨다 */
        }).then(function (r) { if (r.wrote) aNew++; });
      })));
    }).then(loadAssets).then(function () {
      buildGrid(); buildFontSelect(); syncCustomChar(); requestRender();
      /* 같은 부적을 연 다른 창들이 새 판 · 새 그림을 다시 읽게 */
      Object.keys(imported).forEach(function (id) { post({ t: 'saved', id: id, at: imported[id].updatedAt }); });
      if (aNew) post({ t: 'assets' });
      var msgs = ['부적 ' + nNew + '개를 불러왔어요'];
      if (nOld) msgs.push(nOld + '개는 이미 같거나 더 새 판이 있어서 건너뛰었어요');
      if (bad) msgs.push('읽을 수 없는 부적 ' + bad + '개는 뺐어요');
      if (aNew) msgs.push('내 그림 · 글꼴 ' + aNew + '개');
      if (aKept) msgs.push('지금 것과 다른 내 그림 · 글꼴 ' + aKept + '개는 지금 것을 그대로 두었어요');
      if (badA) msgs.push('읽을 수 없는 그림 · 글꼴 ' + badA + '개는 뺐어요');
      /* 열려 있는 부적의 더 새 판이 들어왔으면 편집 화면도 그 판으로 (안 그러면 다음 저장이 옛 판으로 덮는다) */
      var mine = imported[S.id];
      if (mine) {
        clearTimeout(saveTimer);
        if (!dirty || confirm('지금 열린 부적의 더 새 판이 백업에 있어요. 백업 판으로 바꿀까요?\n(취소하면 지금 고친 것은 따로 저장해요)')) {
          loadDesign(mine); msgs.push('열린 부적도 백업의 새 판으로 바꿨어요');
        } else {
          S.id = uid(); S.name = forkName(S.name); base = { id: S.id, at: 0 }; stored = false;
          syncControls(); markDirty();
        }
      }
      toast(msgs.join(' · '), 8000);
      /* 엔진 설정: 고민 글이 가는 주소라서 묻고 바꾼다 */
      var L = cleanLlm(data.llm), cur = cleanLlm(llmCfg()) || llmCfg();
      if (L && JSON.stringify(L) !== JSON.stringify(cur)) {
        /* 바뀌는 연결은 엔진마다 모두 보여 준다 (고른 엔진 말고 다른 엔진의 주소도 함께 바뀌니까) */
        var eng = BJ.llm.ENGINES.filter(function (e) { return e.id === L.engine; })[0], lines = [];
        BJ.llm.ENGINES.forEach(function (e) {
          if (e.id === 'rules') return;
          var nu = L.urls[e.id] || e.url || '', ou = cur.urls[e.id] || e.url || '', nm = L.models[e.id] || '', om = cur.models[e.id] || '';
          if (nu === ou && nm === om) return;
          lines.push('· ' + e.name + (e.id !== 'webllm' ? ' — 주소 ' + nu : '') + (nm ? ' · 모델 ' + nm : ''));
        });
        if (confirm('백업에 그림 아이디어 엔진 설정도 있어요 (쓸 엔진: ' + (eng ? eng.name : L.engine) + ').' +
          (lines.length ? '\n바뀌는 연결:\n' + lines.join('\n') : '') +
          '\n이 설정으로 바꿀까요? 고민 글이 이 주소로 가니, 내가 쓰던 주소인지 꼭 확인해 주세요.')) {
          ui.llm = L; saveLlm(); syncEngine(); renderIdeas();
        }
      }
    });
  }

  /* ─────────────── 글꼴 · 그림 자산 ─────────────── */

  function fontOk(v) { return typeof v === 'string' && (v.indexOf('custom:') === 0 ? own(F.custom, v.slice(7)) : !!F.find(v)); }

  function buildFontSelect() {
    var h = F.LIST.map(function (f) { return '<option value="' + esc(f.id) + '">' + esc(f.name) + '</option>'; }).join('');
    var mine = Object.keys(F.custom);
    if (mine.length) h += '<optgroup label="내 글꼴">' + mine.map(function (id) { return '<option value="custom:' + esc(id) + '">' + esc(F.custom[id].name) + '</option>'; }).join('') + '</optgroup>';
    /* 이 부적의 내 글꼴이 이 브라우저에 없을 때: 값은 지키고, 무엇으로 보이는지 알려 준다 */
    var missing = typeof S.font === 'string' && S.font.indexOf('custom:') === 0 && !fontOk(S.font);
    if (missing) h += '<option value="' + esc(S.font) + '" disabled>내 글꼴 (이 브라우저에 없음 · 기본 글꼴로 보여요)</option>';
    $('#inFont').innerHTML = h;
    $('#inFont').value = fontOk(S.font) || missing ? S.font : F.LIST[0].id;
  }

  function loadAssets() {
    return BJ.store.all('assets').then(function (rows) {
      ui.customChars = {};
      var jobs = [];
      rows.forEach(function (r) {
        var a = cleanAsset(r.key, r.value);
        if (!a) return;
        if (a.kind === 'char') ui.customChars[r.key] = a;
        if (a.kind === 'font' && !F.custom[a.id]) jobs.push(F.addCustom(a.id, a.name, a.dataURL).catch(function () {}));
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
    function openTab(t, focus) {
      $$('.tab').forEach(function (x) { var on = x === t; x.classList.toggle('on', on); x.setAttribute('aria-selected', on ? 'true' : 'false'); x.tabIndex = on ? 0 : -1; });
      $$('.pane').forEach(function (p) { p.classList.toggle('on', p.dataset.pane === t.dataset.tab); });
      /* 탭 줄이 가로로 넘칠 때만, 그 줄 안에서만 옆으로 민다 (페이지는 위아래로 움직이지 않게) — 초점 테두리가 잘리지 않게 12px 여유 */
      var bar = t.parentNode;
      if (bar && bar.scrollWidth > bar.clientWidth + 1) {
        var br = bar.getBoundingClientRect(), tr = t.getBoundingClientRect(), pad = 12;
        if (tr.left - pad < br.left) bar.scrollLeft -= br.left - (tr.left - pad);
        else if (tr.right + pad > br.right) bar.scrollLeft += (tr.right + pad) - br.right;
      }
      if (focus) { try { t.focus({ preventScroll: true }); } catch (e) { t.focus(); } }
      if (t.dataset.tab === 'back' || t.dataset.tab === 'llm') setView(ui.view === 'front' ? 'both' : ui.view);
    }
    $$('.tab').forEach(function (t) {
      t.addEventListener('click', function () { openTab(t); });
    });
    /* 탭 줄: ← → Home End 로 옮겨 다니기 */
    $('.tabs').addEventListener('keydown', function (e) {
      var tabs = $$('.tab'), i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      var j = e.key === 'ArrowRight' ? (i + 1) % tabs.length : e.key === 'ArrowLeft' ? (i - 1 + tabs.length) % tabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1;
      if (j < 0) return;
      e.preventDefault(); e.stopPropagation();
      openTab(tabs[j], true);
    });
    (function () { var on = $('.tab.on') || $('.tab'); $$('.tab').forEach(function (x) { x.setAttribute('aria-selected', x === on ? 'true' : 'false'); x.tabIndex = x === on ? 0 : -1; }); })();
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
      S.items.push({ prop: b.dataset.prop, x: 300, y: 450, s: 0.8, s0: 0.8, r: 0, flip: false });
      setView(ui.view === 'back' ? 'front' : ui.view);
      ui.drawerAdded = 'item:' + (S.items.length - 1);
      select(ui.drawerAdded, 'front');
      requestRender(); markDirty();
    });

    $$('#selbar [data-act]').forEach(function (b) { b.addEventListener('click', function () { act(b.dataset.act); }); });
    /* 손잡이 줄의 보이는 단추 · 보이는 카드 위의 요소 (Tab 차례) */
    function barButtons() { return $$('#selbar [data-act]').filter(function (b) { return !b.hidden; }); }
    function cardEls() {
      return $$('#cards .card-wrap').filter(function (w) { return w.offsetParent !== null; })
        .reduce(function (a, w) { return a.concat($$('[data-el][tabindex]', w)); }, []);
    }
    function selEl() { return ui.sel ? hostOf(ui.selSide).querySelector('[data-el="' + ui.sel + '"][tabindex]') : null; }

    /* 카드 단축키: 포커스가 카드(또는 손잡이 줄)에 있거나 아무 데도 없을 때만.
       입력칸 · 탭 · 다른 단추에 있을 때의 키는 그 칸의 것 (서랍에서 막 꺼낸 장식만 예외) */
    document.addEventListener('keydown', function (e) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      var ae = document.activeElement;
      var inCard = !!(ae && ae.closest && ae.closest('#cards')), inBar = !!(ae && ae.closest && ae.closest('#selbar'));
      var onEl = inCard && !!(ae.getAttribute && ae.getAttribute('data-el'));
      /* 서랍에서 막 꺼낸 장식: 포커스는 서랍 단추에 둔 채(이어서 더 꺼낼 수 있게) 화살표 · ＋ － · Delete · Esc 는 그 장식에 */
      var fromDrawer = !!(ae && ae.closest && ae.closest('#drawer .prop') && ui.sel && ui.sel === ui.drawerAdded);
      var free = !ae || ae === document.body || ae === document.documentElement;
      if (!free && !inCard && !inBar && !fromDrawer) return;

      /* Tab 은 카드 위 요소 사이를 오간다 (지나가며 고른다). 고른 요소에서 Enter → 그 손잡이 줄(－ ＋ ↺ ↻ ⇋ ⧉ ⟲ ✕)로.
         손잡이 줄의 마지막 단추에서 Tab → 다음 요소, 첫 단추에서 Shift+Tab · 손잡이 줄에서 Esc → 그 요소로 돌아간다 */
      if (e.key === 'Tab') {
        var btns = $('#selbar').hidden ? [] : barButtons(), cur = selEl();
        if (!inBar || !btns.length || !cur) return;
        if (e.shiftKey && ae === btns[0]) { e.preventDefault(); cur.focus(); return; }
        if (!e.shiftKey && ae === btns[btns.length - 1]) {
          var all = cardEls(), i = all.indexOf(cur);
          if (i >= 0 && i + 1 < all.length) { e.preventDefault(); all[i + 1].focus(); }
        }
        return;
      }
      if (inBar && e.key === 'Escape') { var back = selEl(); if (back) { e.preventDefault(); back.focus(); } return; }
      if ((inBar || fromDrawer) && (e.key === 'Enter' || e.key === ' ')) return;   /* 단추는 단추대로 */
      /* 카드 위 요소에서 Enter · Space: 아직 안 골랐으면 고르고, 골라 둔 것이면 손잡이 줄로 (페이지가 내려가지 않게 늘 막는다) */
      if (onEl && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        var gid = ae.getAttribute('data-el'), gside = frontHost.contains(ae) ? 'front' : 'back';
        if (ui.sel !== gid || ui.selSide !== gside) { select(gid, gside); return; }
        var first = $('#selbar').hidden ? null : barButtons()[0];
        if (first) first.focus();
        return;
      }
      if (!ui.sel || $('#selbar').hidden) return;
      var h = handle(ui.sel);
      if (!h) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && h.del) { e.preventDefault(); act('del'); }
      else if (e.key === 'Escape') { e.preventDefault(); select(null); }
      else if (e.key === '+' || e.key === '=') { e.preventDefault(); act('bigger'); }
      else if (e.key === '-' || e.key === '_') { e.preventDefault(); act('smaller'); }
      else if (/^Arrow/.test(e.key)) {
        e.preventDefault();
        var d = e.shiftKey ? 10 : 2, p = h.get();
        h.set(p[0] + (e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0), p[1] + (e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0));
        if (ui.sel === 'backimg') syncControls();
        requestRender(); markDirty();
      }
    });
    window.addEventListener('resize', function () { requestRender(); });

    /* 내 캐릭터 그림 */
    /* 그림은 저장이 된 다음에만 화면에 넣는다 (저장이 안 됐는데 들어간 것처럼 보이지 않게) */
    function putChar(key, a) { return BJ.store.put('assets', key, a).then(function () { ui.customChars[key] = a; }); }
    function charDone(p, okMsg) {
      return p.then(function () { if (okMsg) toast(okMsg); }, function (e) { toast((e && e.message) || '저장하지 못했어요', 6000); })
        .then(function () { buildGrid(); syncCustomChar(); requestRender(); post({ t: 'assets' }); });
    }
    $('#inCharFile').addEventListener('change', function () {
      var f = this.files[0];
      this.value = '';
      if (!f) return;
      var il = S.ilju, gs = $('#inCharBoth').checked ? ['f', 'm'] : [S.gender], now = Date.now();
      charDone(readImage(f, 1400).then(function (img) {
        return Promise.all(gs.map(function (g) {
          return putChar('char:' + il + ':' + g, { kind: 'char', ilju: il, gender: g, dataURL: img.url, mode: 'multiply', updatedAt: now });
        }));
      }), '내 그림으로 바꿨어요');
    });
    $('#segCharMode').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-v]'), cc = customChar(), oc = otherChar();
      if (!b || !cc) return;
      /* 여 · 남이 같은 그림을 쓰고 '같이'가 켜져 있으면 둘 다 */
      var keys = ['char:' + S.ilju + ':' + S.gender], now = Date.now();
      if (oc && oc.dataURL === cc.dataURL && $('#inCharBoth').checked) keys.push('char:' + S.ilju + ':' + (S.gender === 'm' ? 'f' : 'm'));
      charDone(Promise.all(keys.map(function (k) { return putChar(k, Object.assign({}, ui.customChars[k], { mode: b.dataset.v, updatedAt: now })); })));
    });
    $('#btnCharClear').addEventListener('click', function () {
      var cc = customChar(), oc = otherChar(), other = S.gender === 'm' ? 'f' : 'm', gs = [S.gender];
      if ($('#inCharBoth').checked && oc) {
        /* 다른 성별 그림이 따로 올린 것이면 물어본다 */
        if (cc && oc.dataURL === cc.dataURL) gs.push(other);
        else if (confirm((other === 'm' ? '남' : '여') + ' 쪽에 따로 올린 그림도 지울까요? (취소하면 지금 성별 것만 지워요)')) gs.push(other);
      }
      charDone(Promise.all(gs.map(function (g) {
        var k = 'char:' + S.ilju + ':' + g;
        return BJ.store.del('assets', k).then(function () { delete ui.customChars[k]; });
      })), '기본 캐릭터로 돌렸어요');
    });

    /* 내 글꼴 */
    $('#inFontFile').addEventListener('change', function () {
      var f = this.files[0];
      this.value = '';
      if (!f) return;
      var id = uid(), name = str(f.name.replace(/\.[^.]+$/, ''), 60) || '내 글꼴';
      F.blobToDataURL(f).then(function (url) {
        return F.addCustom(id, name, url).catch(function () { throw new Error('글꼴을 읽지 못했어요 (ttf · otf · woff · woff2 파일인지 봐 주세요)'); })
          .then(function () {
            return BJ.store.put('assets', 'font:' + id, { kind: 'font', id: id, name: name, dataURL: url, updatedAt: Date.now() })
              .catch(function (e) { F.removeCustom(id); throw e; });   /* 저장이 안 되면 목록에서도 뺀다 */
          });
      }).then(function () { post({ t: 'assets' }); buildFontSelect(); change('font', 'custom:' + id); toast('글꼴을 넣었어요: ' + name); })
        .catch(function (e) { toast((e && e.message) || '글꼴을 넣지 못했어요', 6000); });
    });

    /* 뒷면 */
    $('#inBackFile').addEventListener('change', function () {
      var f = this.files[0];
      this.value = '';
      if (!f) return;
      readImage(f, 1800).then(function (img) {
        S.back.image = img.url; S.back.aspect = img.w / img.h; S.back.fit = { dx: 0, dy: 0, s: backFitS() };
        if (S.back.mode !== 'ink') S.back.mode = 'multiply';
        setView(ui.view === 'front' ? 'back' : ui.view);
        syncControls(); requestRender(); markDirty();
      }).catch(function (e) { toast(e.message); });
    });
    $('#btnBackClear').addEventListener('click', function () { S.back.image = null; S.back.aspect = 0; if (ui.sel === 'backimg') select(null); requestRender(); markDirty(); });
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
    var c = $('#cards');
    ['front', 'back', 'both'].forEach(function (k) { c.classList.toggle('view-' + k, k === v); });
    $$('.side-tabs .seg-btn').forEach(function (b) { var on = b.dataset.view === v; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
    /* 고른 것이 안 보이는 쪽에 있으면 고르기를 푼다 (보이지 않는 것을 몰래 고치지 않게) */
    if (ui.sel) { var w = $('.card-wrap[data-side="' + ui.selSide + '"]'); if (w && w.offsetParent === null) select(null); }
    requestRender();
  }

  /* 위에 붙어 있는 것의 높이 (폰: 미리보기 · 넓은 화면: 머리 줄과 탭 줄).
     조절판 안의 칸이 키보드로 포커스를 받았는데 그 밑에 숨었으면 그만큼만 내린다.
     (문서 전체에 scroll-padding 을 주면, 위에 붙은 미리보기 · 탭 안의 단추로 갈 때도 화면이 튀었다) */
  var stickyTop = 0;
  function fitScrollPad() {
    var stage = $('.stage'), top = $('.topbar'), tabs = $('.tabs'), px = 0;
    function sticky(el) { return el && getComputedStyle(el).position === 'sticky'; }
    if (window.matchMedia('(max-width: 900px)').matches) { if (sticky(stage)) px = stage.offsetHeight + 12; }
    else px = (sticky(top) ? top.offsetHeight : 0) + (sticky(tabs) ? tabs.offsetHeight : 0) + (sticky(top) || sticky(tabs) ? 12 : 0);
    stickyTop = px;
  }
  document.addEventListener('focusin', function (e) {
    var t = e.target;
    if (!stickyTop || lastInput !== 'key' || !t || !t.closest || !t.closest('.panel') || t.closest('.tabs')) return;
    /* 브라우저가 먼저 스크롤한 다음 장면에 본다 */
    requestAnimationFrame(function () {
      if (document.activeElement !== t) return;
      var r = t.getBoundingClientRect();
      if (r.top < stickyTop) window.scrollBy(0, r.top - stickyTop);
    });
  });

  var curKey = null;
  function init() {
    buildStatic();
    bindControls();
    bindDrag(frontHost, 'front');
    bindDrag(backHost, 'back');
    bindMisc();
    bindLlm();
    bindArchive();
    BJ.store.persist();
    fitScrollPad();
    window.addEventListener('resize', fitScrollPad);
    if (window.ResizeObserver) { var ro = new ResizeObserver(fitScrollPad); [$('.stage'), $('.topbar'), $('.tabs')].forEach(function (el) { if (el) ro.observe(el); }); }
    Promise.all([loadAssets().catch(function () {}), BJ.store.get('kv', 'llm').catch(function () { return null; }), BJ.store.get('kv', 'current').catch(function () { return null; }), BJ.store.memoryOnly()]).then(function (r) {
      memMode = !!r[3];
      ui.llm = cleanLlm(r[1]) || null;
      llmCfg();
      syncEngine();
      buildFontSelect();
      curKey = typeof r[2] === 'string' ? r[2] : null;
      return curKey ? BJ.store.get('designs', curKey).catch(function () { return null; }) : null;
    }).then(function (d) {
      if (d != null) {
        S = migrate(d);
        /* 저장된 값의 id 가 깨졌어도 그 자리(열쇠)가 멀쩡하면 그 자리에 다시 쓴다 (같은 부적이 둘로 늘지 않게) */
        if (S.id !== curKey && ID_RE.test(curKey)) S.id = curKey;
        stored = !!(typeof d === 'object' && d.id === curKey && S.id === curKey);
        base = { id: S.id, at: stored ? S.updatedAt : 0 };
      } else { S = fresh(); applyTheme('health'); stored = false; base = { id: S.id, at: 0 }; }
      afterLoad();
      archiveNote();
      if (memMode) toast('이 창에서는 저장이 안 돼요 (사생활 보호 창?). 다 만들면 PNG 나 백업 파일로 받아 두세요.', 8000);
    }).catch(function (e) {
      S = fresh(); applyTheme('health'); stored = false; base = { id: S.id, at: 0 };
      try { afterLoad(); } catch (e2) {}
      console.error(e);
    });
  }

  BJ.app = { get state() { return S; }, render: render, change: change, applyTheme: applyTheme, select: select, exportSVG: exportSVG };
  init();
})();
