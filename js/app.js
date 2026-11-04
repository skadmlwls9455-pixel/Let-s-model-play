/* ============================================================
   뽈뽈 문어 — js/app.js (전역 APP)
   DESIGN.md §2 §3 §4 §6 §7 §8 §12.3
   섹션: util · state · migrate · assets · scene(SCENE3D|SCENE2D 브리지) · octopus ·
         invite/reveal · log · posters · album · dialogs · demo · boot
   로드 순서: three.min.js → world.js → brain.js → scene3d.js → scene2d.js → app.js (type="module" 금지)
   장면: SCENE = SCENE3D.supported() ? SCENE3D : SCENE2D (§13.1). APP 은 그 API 하나만 본다.
   ============================================================ */
/* global WORLD, BRAIN, SCENE3D, SCENE2D */
var APP = (function () {
  'use strict';

  /* ───────────────────────── util ───────────────────────── */
  var W = (typeof WORLD !== 'undefined') ? WORLD : null;
  var B = (typeof BRAIN !== 'undefined') ? BRAIN : null;
  var STR = (W && W.strings) || {};
  var STATUS_ICON = { read: '✅', builtin: '📚', simulated: '🧪', failed: '❌', none: '◌' };
  var STATUS_LABEL = { read: '읽음', builtin: '책장 메모', simulated: '모의 방문', failed: '못 읽음', none: '앉아만 있었음' };
  var FOLLOW_LABEL = { followed: '따라감', ignored: '무시함', left: '도중에 벗어남', none: '없음' };
  var BY_LABEL = { demo: '데모 두뇌(규칙)', human: '사람이 조작', mcp: '모델(MCP)', legacy: '복원된 기록' };
  var LOG_LABEL = { depart: '출발', peek: '기웃', 'return': '귀가', remember: '기억', hang_poster: '포스터', wrap_up: '마무리', stay_home: '집', empty_turn: '…' };
  var REACT_EMOJI = { '폴짝': '🎉', '우쭐': '😌', '덤덤': '😶', '졸림': '😴' };
  var KEY = 'ppolppol_v2', KEY_V1 = 'ppolppol_v1', KEY_V1_BAK = 'ppolppol_v1_backup';

  function $(id) { return document.getElementById(id); }
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
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function dateKey(d) { d = d || new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function fmtDate(key, dots) { var p = String(key || '').split('-'); return dots ? p.join('.') : (p[1] | 0) + '.' + (p[2] | 0); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, Math.max(0, ms)); }); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function hash(s) { return B ? B.hashSeed(String(s)) : (function (str) { var x = 2166136261; for (var i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; })(String(s)); }
  function mkRng(seed) { return B ? B.rng(seed) : (function (a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })(seed >>> 0); }
  var uiRng = mkRng((Date.now() & 0xffffffff) >>> 0);   /* 꾸밈용(산책 시간·시선). 결정은 전부 BRAIN 의 PRNG */
  function reduced() {
    var m = (S && S.settings && S.settings.motion) || 'auto';
    if (m === 'reduce') return true;
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function speed() { var v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--speed')); return v > 0 ? v : 1; }
  function nodeOf(id) { return (W && W.nodes && W.nodes[id]) || null; }
  function cornerName(c) { return (W && W.corners && W.corners[c] && W.corners[c].name) || c; }
  function greetingByHour(hr) { return hr < 6 ? '밤이 깊었네' : hr < 9 ? '좋은 아침' : hr < 17 ? '좋은 오후' : hr < 19 ? '노을이 지네' : '밤이네'; }
  var toastTimer = null;
  function toast(msg) {
    var t = $('toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2500);
  }

  /* ───────────────────────── state ───────────────────────── */
  function defaults() {
    return {
      v: 2,
      octopus: { name: null, born: null, trips: 0, invites: 0, days: [], affinity: {}, visits: {}, state: 'idle' },
      room: { lantern: 0, souvenirs: [], posterOrder: [] },
      trips: [],
      settings: { motion: 'auto', thumbs: true, lastSeen: null, octColor: '#e8463c' }
    };
  }
  var S = defaults();
  var warned = false;
  function save() {
    try {
      S.settings.lastSeen = Date.now();
      localStorage.setItem(KEY, JSON.stringify(S));
      return true;
    } catch (e) {
      if (!warned) { warned = true; var w = $('save-warn'); if (w) w.hidden = false; }
      return false;
    }
  }
  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { raw = null; }
    if (raw) {
      try { S = normalize(JSON.parse(raw)); return S; } catch (e) { /* 깨진 저장 → 새로 */ }
    }
    var v1 = null;
    try { v1 = localStorage.getItem(KEY_V1); } catch (e) { v1 = null; }
    if (v1) { S = migrateV1(v1); save(); return S; }
    S = defaults();
    return S;
  }
  function normalize(s) {
    var d = defaults();
    s = s || {};
    s.v = 2;
    s.octopus = Object.assign(d.octopus, s.octopus || {});
    s.room = Object.assign(d.room, s.room || {});
    s.settings = Object.assign(d.settings, s.settings || {});
    if (!Array.isArray(s.trips)) s.trips = [];
    if (!Array.isArray(s.octopus.days)) s.octopus.days = [];
    if (!Array.isArray(s.room.souvenirs)) s.room.souvenirs = [];
    if (!Array.isArray(s.room.posterOrder)) s.room.posterOrder = [];
    s.octopus.affinity = s.octopus.affinity || {};
    s.octopus.visits = s.octopus.visits || {};
    s.room.lantern = clamp(s.room.lantern | 0, 0, 8);
    if (!/^#[0-9a-f]{6}$/i.test(s.settings.octColor || '')) s.settings.octColor = '#e8463c';
    return s;
  }

  /* ───────────────────────── migrate v1 → v2 (§8) ───────────────────────── */
  function migrateV1(raw) {
    var d = defaults(), old = null;
    try { old = JSON.parse(raw); } catch (e) { old = null; }
    if (!old) return d;
    var oc = old.octopus || {}, room = old.room || {}, cur = old.currency || {};
    d.octopus.name = oc.name || null;
    d.octopus.born = Date.now();
    d.octopus.trips = oc.total_trips | 0;
    d.octopus.invites = cur.hearts | 0;
    d.room.lantern = clamp(room.light_level | 0, 0, 8);
    (old.posters || []).forEach(function (p, i) {
      var ts = p.ts || Date.now();
      var id = 'trip_legacy_' + (p.id || i);
      d.trips.push({
        id: id, date: dateKey(new Date(ts)), seq: i + 1, seed: hash(id), kind: 'out', by: 'legacy',
        hint: { raw: '', match: { kind: 'none' }, followed: 'none' }, status: 'done', startedAt: ts, endedAt: ts,
        events: [], receipt: null,
        poster: { type: 'poster', title: p.title || '옛 포스터', line: '(복원된 포스터 · 기록 없음)', sticker: null, emoji: '🗂', scene: 'home',
          stickerPos: { x: 70, y: 28, rot: -6 }, thumb: null, paper: 0 }
      });
      d.room.posterOrder.push(id);
    });
    try { localStorage.setItem(KEY_V1_BAK, raw); localStorage.removeItem(KEY_V1); } catch (e) { /* 이름 바꾸기 실패해도 진행 */ }
    return d;
  }

  /* ───────────────────────── assets (manifest + 인라인 플레이스홀더) ───────────────────────── */
  var DEFAULT_MANIFEST = {
    'bg.room': 'assets/bg/room.svg',
    'window.rain': 'assets/window/rain.svg', 'window.drizzle': 'assets/window/drizzle.svg', 'window.stars': 'assets/window/stars.svg',
    'item.moss': 'assets/items/moss.svg', 'item.crate': 'assets/items/crate.svg', 'item.candle': 'assets/items/candle.svg',
    'item.blanket': 'assets/items/blanket.svg', 'item.board': 'assets/items/board.svg', 'item.shelf': 'assets/items/shelf.svg', 'item.curtain': 'assets/items/curtain.svg'
  };
  for (var li = 0; li <= 8; li++) DEFAULT_MANIFEST['light.lantern' + li] = 'assets/light/lantern' + li + '.svg';
  DEFAULT_MANIFEST['lantern.off'] = 'assets/lantern/off.svg'; DEFAULT_MANIFEST['lantern.on'] = 'assets/lantern/on.svg';
  ['hands', 'sea', 'sky', 'signs', 'numbers', 'sounds', 'home', 'mind', 'wild'].forEach(function (sc) { DEFAULT_MANIFEST['scene.' + sc] = 'assets/scenes/' + sc + '.svg'; });
  if (W && W.souvenirs) Object.keys(W.souvenirs).forEach(function (id) { DEFAULT_MANIFEST['souvenir.' + id] = 'assets/souvenirs/' + id + '.svg'; });
  /* tools/bundle.js 가 만든 단일 파일에서는 window.ASSETS_INLINE (key → {src:'data:…'}) 이 먼저 정의된다 → fetch 없이 그걸 쓴다 */
  window.ASSETS = window.ASSETS || Object.assign({}, DEFAULT_MANIFEST, (window.ASSETS_INLINE && typeof window.ASSETS_INLINE === 'object') ? window.ASSETS_INLINE : {});
  function assetPath(key) {
    var v = window.ASSETS && window.ASSETS[key];
    if (!v) return null;
    if (typeof v === 'string') return v;
    return v.src || v.path || v.file || v.url || null;
  }
  function loadManifest() {
    if (window.ASSETS_INLINE) return Promise.resolve(false);   /* 번들: 이미 인라인됨 */
    if (typeof fetch !== 'function' || location.protocol === 'file:') return Promise.resolve(false);   /* file:// 에서는 내장 기본 매니페스트만 */
    return fetch('assets/manifest.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('manifest'); return r.json(); })
      .then(function (m) {
        var map = (m && m.assets) ? m.assets : m;
        if (!map || typeof map !== 'object') return false;
        Object.keys(map).forEach(function (k) {
          var v = map[k];
          if (typeof v === 'string') window.ASSETS[k] = v;
          else if (v && typeof v === 'object') window.ASSETS[k] = v.src || v.path || v.file || v.url || window.ASSETS[k];
        });
        return true;
      }).catch(function () { return false; });
  }
  var PH = (typeof SCENE2D !== 'undefined' && SCENE2D.PH) || {};   /* 2D 플레이스홀더 SVG 는 js/scene2d.js 로 옮겼다 */

  /* ───────────────────────── scene (SCENE3D | SCENE2D 브리지, §7.0 §13) ───────────────────────── */
  var scene = null, sceneMode = '2d';
  var ITEM_LEVEL = { moss: 1, crate: 2, candle: 3, blanket: 4, board: 5, shelf: 7, curtain: 8 };
  var LOOK_KEY = 'ppolppol_look';
  function itemsFor(lv) { return Object.keys(ITEM_LEVEL).filter(function (k) { return lv >= ITEM_LEVEL[k]; }); }
  /* 날씨: 등불 아크(6 가는 비, 7 맑음) → 8칸 뒤에는 날짜 시드 (1~2월엔 눈) */
  function weatherFor(lv) {
    if (lv < 6) return 'rain';
    if (lv < 7) return 'drizzle';
    if (lv < 8) return 'clear';
    var r = mkRng(hash('wx|' + dateKey()))(), m = new Date().getMonth();
    if ((m === 0 || m === 1) && r < 0.35) return 'snow';
    return r < 0.4 ? 'rain' : r < 0.65 ? 'drizzle' : 'clear';
  }
  function hourNow() { var d = new Date(); return d.getHours() + d.getMinutes() / 60; }
  function loadLook() { try { var o = JSON.parse(localStorage.getItem(LOOK_KEY) || 'null'); return (o && typeof o === 'object') ? o : {}; } catch (e) { return {}; } }
  function saveLook(o) { try { localStorage.setItem(LOOK_KEY, JSON.stringify(o)); } catch (e) { /* noop */ } }
  function sceneOpts() {
    return {
      pixelSize: 3, color: S.settings.octColor, lantern: S.room.lantern, items: itemsFor(S.room.lantern), weather: weatherFor(S.room.lantern), hour: hourNow(),
      posters: [], souvenirs: [], reducedMotion: reduced(), speed: speed(), assetPath: assetPath, octEl: $('oct'), look: loadLook(),
      on: {
        posterTap: function (id) { openPoster(id); },
        souvenirTap: function (sv) { if (sv.tripId && tripById(sv.tripId)) { bubble((sv.emoji ? sv.emoji + ' ' + sv.name : sv.id) + ' — 이거 가져온 날', 1800); openPoster(sv.tripId, true); } },
        albumTap: function () { $('album-sec').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth' }); },
        pet: pet,
        tap: function () { if (oct.state === 'sleep') bubble('…zZ', 1500); else if (!oct.busy && oct.state !== 'pet') bubble('?', 1600); },
        windowTap: function () {
          if (oct.busy || oct.state === 'sleep') return;
          walkTo('window').then(function () { if (!oct.busy) { octState('idle'); var w = weatherFor(S.room.lantern), hr = new Date().getHours(); bubble(w === 'clear' ? (hr >= 19 || hr < 6 ? '별이 보여' : '맑네') : w === 'snow' ? '눈이 와' : '비가 와', 2000); } });
        },
        anchorReached: function () { /* moveTo 의 Promise 로 받는다 */ }
      }
    };
  }
  function initScene() {
    var host = $('scene'), opts = sceneOpts();
    if (typeof SCENE3D !== 'undefined' && SCENE3D.supported()) {
      try { scene = SCENE3D.init($('scene3d'), opts); sceneMode = '3d'; }
      catch (e) { console.warn('[app] scene3d init 실패 → 2D 폴백', e); scene = null; }
    }
    if (!scene) { scene = SCENE2D.init(host, opts); sceneMode = '2d'; }
    host.classList.toggle('mode-3d', sceneMode === '3d');
    $('scene3d').hidden = sceneMode !== '3d';
    setInterval(function () { scene.setTime(hourNow()); }, 60000);
  }
  function renderScene() {
    var lv = S.room.lantern;
    scene.setLantern(lv); scene.setItems(itemsFor(lv)); scene.setWeather(weatherFor(lv));
    document.title = (S.octopus.name ? S.octopus.name + ' · ' : '') + '뽈뽈 문어 · 등불 ' + lv + '/8';
  }
  function setOctColor(hex) { if (!/^#[0-9a-f]{6}$/i.test(hex)) return; S.settings.octColor = hex; save(); scene.setColor(hex); }

  /* ───────────────────────── octopus (§7.1 상태 기계 — 그림은 scene 이 그린다) ───────────────────────── */
  var ANCHORS = { door: 1, window: 1, crate: 1, board: 1, blanket: 1, center: 1 };
  var oct = { state: 'idle', anchor: 'center', wanderTimer: null, busy: false };
  function anchorName(name) { if (name === 'blanket' && S.room.lantern < 4) return 'center'; return ANCHORS[name] ? name : 'center'; }
  function allowedIdleAnchors() {
    var a = ['window', 'center'];
    if (S.room.lantern >= 2) a.push('crate');
    if (S.room.lantern >= 4) a.push('blanket');
    if (S.room.posterOrder.length) a.push('board');
    return a;
  }
  function octPlace(anchor) { oct.anchor = anchorName(anchor); scene.jumpTo(oct.anchor); }
  function octState(st, extra) {
    oct.state = st;
    scene.setOctState(st, extra);
    var lbl = $('oct-label');
    if (lbl) lbl.textContent = st === 'sleep' ? '💤' : st === 'away' ? '' : st === 'anticipate' ? '출발 중…' : '';
    if (st === 'sleep') scheduleDreamLabel();
  }
  var dreamTimer = null;
  function scheduleDreamLabel() {
    clearTimeout(dreamTimer);
    dreamTimer = setTimeout(function () {
      if (oct.state !== 'sleep') return;
      var lbl = $('oct-label'); if (lbl) lbl.textContent = lbl.textContent === '💤' ? '꿈꾸는 중' : '💤';
      scheduleDreamLabel();
    }, 9000 + uiRng() * 6000);
  }
  function walkTo(anchor, mode) {
    oct.anchor = anchorName(anchor);
    octState(mode || 'walk');
    return scene.moveTo(oct.anchor);
  }
  function stopWander() { clearTimeout(oct.wanderTimer); oct.wanderTimer = null; }
  function scheduleWander() {
    stopWander();
    oct.wanderTimer = setTimeout(function () {
      if (oct.busy || oct.state !== 'idle' || document.hidden) { scheduleWander(); return; }
      var opts = allowedIdleAnchors().filter(function (a) { return a !== oct.anchor; });
      var next = opts[Math.floor(uiRng() * opts.length)] || 'center';
      walkTo(next).then(function () { if (!oct.busy) { octState('idle'); maybeThink(); } scheduleWander(); });
    }, (20 + uiRng() * 20) * 1000);
  }
  function maybeThink() {
    if (uiRng() > 0.3) return;
    var mems = S.trips.filter(function (t) { return t.poster && t.poster.type === 'poster' && t.kind === 'out' && t.receipt; });
    if (!mems.length) return;
    var t = mems[mems.length - 1];
    bubble((t.date === dateKey() ? '오늘' : '어제') + ' 본 ' + (t.poster.title || '것') + ' 생각 중', 3200);
  }
  function bubble(text, ms) { scene.bubble(text, ms); }
  function octInitial() {
    if (S.octopus.state === 'sleep') { octPlace('blanket'); octState('sleep'); }
    else { octPlace('window'); octState('idle'); }
    scheduleWander();
  }
  function wakeUp() { if (oct.state === 'sleep') { octState('idle'); S.octopus.state = 'idle'; save(); } }
  var petTimer = null;
  function pet() {
    if (oct.busy || oct.state === 'away') return;
    if (oct.state === 'sleep') { bubble('…zZ', 1500); return; }
    octState('pet');
    clearTimeout(petTimer);
    petTimer = setTimeout(function () {
      if (oct.state !== 'pet') return;
      if (uiRng() < 0.7) { octState('idle'); bubble('…♡', 1800); }
      else { var opts = allowedIdleAnchors().filter(function (a) { return a !== oct.anchor; }); walkTo(opts[Math.floor(uiRng() * opts.length)] || 'center').then(function () { if (!oct.busy) octState('idle'); }); }
    }, 2000);
  }

  /* ───────────────────────── invite / reveal / commit (§3) ───────────────────────── */
  var busy = false, skipFlag = false, revealing = null;
  function setBusy(on) {
    busy = on; oct.busy = on;
    var go = $('btn-go'), sk = $('btn-skip'), inp = $('hint-in');
    if (go) { go.disabled = on; go.classList.toggle('away', on); go.querySelector('.go-txt').textContent = on ? '다녀오는 중…' : '🌧 뽈뽈 다녀와'; }
    if (sk) sk.hidden = !on;
    if (inp) inp.disabled = on;
    if (on) stopWander(); else scheduleWander();
  }
  function tripsOn(key) { return S.trips.filter(function (t) { return t.date === key; }); }
  function newTripId(seed) {
    var base = 'trip_' + (seed >>> 0).toString(36).slice(-4);
    var id = base, n = 2;
    while (S.trips.some(function (t) { return t.id === id; })) id = base + n++;
    return id;
  }
  function brainInput(trip) {
    var recent = S.trips.filter(function (t) { return t.status === 'done' && t.kind; }).slice(-2).map(function (t) { return { kind: t.kind, nStops: (t.receipt && t.receipt.stops && t.receipt.stops.length) || 0 }; });
    var todayOut = tripsOn(trip.date).filter(function (t) { return t.kind === 'out' && t.status === 'done'; }).length;
    return {
      seed: trip.seed, dateKey: trip.date, seq: trip.seq, hint: trip.hint.raw, name: S.octopus.name || '', id: trip.id,
      state: { visits: S.octopus.visits, affinity: S.octopus.affinity, lantern: S.room.lantern, recent: recent, todayOut: todayOut },
      now: new Date(), online: navigator.onLine !== false, by: 'demo'
    };
  }
  function mergePlan(trip, planned) {
    ['kind', 'by', 'hint', 'events', 'receipt', 'poster', 'visitsDelta', 'affinityDelta', 'affinityDecay', 'reaction'].forEach(function (k) { if (planned[k] !== undefined) trip[k] = planned[k]; });
    if (trip.receipt && trip.receipt.stops) trip.receipt.stops.forEach(function (s) { if (s.source && s.source.extract) s.source.extract = String(s.source.extract).slice(0, 160); });
    if (trip.events && trip.events[0] && trip.events[0].type === 'depart') delete trip.events[0].match;
  }
  function invite(hintText) {
    if (busy) return Promise.resolve(null);
    if (!S.octopus.name) { openNameDialog(); return Promise.resolve(null); }
    if (!B || typeof B.plan !== 'function') { toast('두뇌(brain.js)가 아직 없어'); return Promise.resolve(null); }
    var hint = String(hintText == null ? ($('hint-in') ? $('hint-in').value : '') : hintText).trim();
    var dk = dateKey(), seq = tripsOn(dk).length + 1;
    var seed = B.hashSeed(dk, hint, seq, S.octopus.name);
    var trip = { id: newTripId(seed), date: dk, seq: seq, seed: seed, kind: null, by: 'demo', hint: { raw: hint, match: null, followed: null },
      status: 'running', startedAt: Date.now(), endedAt: null, events: [], receipt: null, poster: null };
    S.trips.push(trip); save();
    if ($('hint-in')) $('hint-in').value = '';
    updateHintHelp();
    setBusy(true); skipFlag = false;
    wakeUp();
    bubble('', 0);
    octState('anticipate');
    var windup = sleep(reduced() ? 50 : 600);
    var planP = B.plan(brainInput(trip)).catch(function (e) { console.warn('plan failed', e); return null; });
    return Promise.all([planP, windup]).then(function (res) {
      var planned = res[0];
      if (!planned) {
        S.trips = S.trips.filter(function (t) { return t !== trip; }); save();
        setBusy(false); octState('idle'); toast('두뇌가 잠깐 멈췄어. 다시 한 번 불러 줘');
        return null;
      }
      mergePlan(trip, planned); save();
      return reveal(trip).then(function () { setBusy(false); return trip; });
    });
  }
  function skip() { skipFlag = true; if (revealing && revealing.wake) revealing.wake(); }
  function gapWait(ms) {
    if (skipFlag) return Promise.resolve();
    return new Promise(function (resolve) {
      var t = setTimeout(done, ms);
      function done() { clearTimeout(t); revealing.wake = null; resolve(); }
      revealing.wake = done;
    });
  }
  function reveal(trip) {
    revealing = { trip: trip, wake: null };
    var rng = mkRng((trip.seed ^ 0x9e3779b9) >>> 0);
    var evs = trip.events || [];
    var today = ensureTodaySection();
    var typing = null;
    function showTyping() { if (skipFlag) return; typing = logRow('…', '…', 'typing', false); today.appendChild(typing); scrollLog(); }
    function hideTyping() { if (typing) { typing.remove(); typing = null; } }
    var chain = Promise.resolve();
    evs.forEach(function (ev, i) {
      chain = chain.then(function () {
        if (i > 0) { showTyping(); return gapWait((2200 + rng() * 2300) * speed()).then(hideTyping); }
      }).then(function () {
        var row = eventRow(trip, ev);
        if (row) { row.classList.add('in'); today.appendChild(row); scrollLog(); }
        return sceneFor(trip, ev);
      });
    });
    return chain.then(function () {
      hideTyping();
      if (trip.status !== 'done') commitTrip(trip);
      revealing = null;
      finalPose(trip);
    });
  }
  /* 이벤트별 장면 연출. skipFlag 면 즉시 */
  function sceneFor(trip, ev) {
    var fast = skipFlag || reduced();
    switch (ev.type) {
      case 'depart':
        if (fast) { octState('away'); return Promise.resolve(); }
        return walkTo('door').then(function () { octState('away'); return sleep(400 * speed()); });
      case 'return':
        commitTrip(trip);
        var mode = trip.poster ? 'carry' : 'walk', carryX = trip.poster ? { svg: posterSVG(trip, 48, 64, { mini: true, noExternal: true }) } : null;
        octPlace('door');
        if (fast) { octPlace('board'); octState(mode, carryX); return Promise.resolve(); }
        octState(mode, carryX);
        return walkTo('board', mode).then(function () { octState(mode, carryX); });
      case 'hang_poster':
        if (!trip.poster) return Promise.resolve();
        octState('hang');
        return sleep(fast ? 0 : 520 * speed()).then(function () { renderWall(); });
      case 'wrap_up':
        var r = ev.reaction || trip.reaction;
        if (r && REACT_EMOJI[r]) bubble(REACT_EMOJI[r] + ' ' + ((trip.receipt && trip.receipt.reactionLine) || r), 3000);
        octState(r === '폴짝' || r === '우쭐' ? 'happy' : 'idle');
        if (fast) return Promise.resolve();
        return sleep(900 * speed()).then(function () { return walkTo('blanket'); });
      case 'stay_home':
        commitTrip(trip);
        var anchor = ev.anchor || (trip.receipt && trip.receipt.activity && trip.receipt.activity.anchor) || 'window';
        if (!ANCHORS[anchor]) anchor = 'window';
        if (anchor === 'board' && !S.room.posterOrder.length) anchor = 'crate';
        if (anchor === 'crate' && S.room.lantern < 2) anchor = 'window';
        var go = fast ? (function () { octPlace(anchor); return Promise.resolve(); })() : walkTo(anchor);
        return go.then(function () { octState('stay'); if (trip.poster) return sleep(fast ? 0 : 300 * speed()).then(renderWall); });
      case 'empty_turn':
        commitTrip(trip);
        return Promise.resolve();
      default:
        return Promise.resolve();
    }
  }
  function finalPose(trip) {
    if (trip.kind === 'empty') { octState(S.octopus.state === 'sleep' ? 'sleep' : 'idle'); return; }
    octPlace('blanket');
    octState('sleep'); S.octopus.state = 'sleep'; save();
  }
  /* 상태 반영: 등불 · 방문 · 취향 · 기념품 · 함께한 날 (한 번만) */
  function commitTrip(trip) {
    if (trip.status === 'done') return;
    var o = S.octopus, prevL = S.room.lantern;
    var decay = typeof trip.affinityDecay === 'number' ? trip.affinityDecay : 0.9;
    Object.keys(o.affinity).forEach(function (k) { o.affinity[k] = Math.round(o.affinity[k] * decay * 1000) / 1000; if (o.affinity[k] < 0.01) delete o.affinity[k]; });
    Object.keys(trip.affinityDelta || {}).forEach(function (k) { o.affinity[k] = (o.affinity[k] || 0) + trip.affinityDelta[k]; });
    Object.keys(trip.visitsDelta || {}).forEach(function (k) { o.visits[k] = (o.visits[k] || 0) + trip.visitsDelta[k]; });
    o.invites++;
    if (trip.kind === 'out') o.trips++;
    if (o.days.indexOf(trip.date) < 0) o.days.push(trip.date);
    S.room.lantern = Math.min(8, S.room.lantern + 1);
    if (trip.receipt && trip.receipt.souvenir) S.room.souvenirs.push({ id: trip.receipt.souvenir, tripId: trip.id, at: Date.now() });
    if (trip.poster && S.room.posterOrder.indexOf(trip.id) < 0) S.room.posterOrder.push(trip.id);
    if (trip.kind === 'home' && trip.receipt && trip.receipt.activity && trip.receipt.activity.id === 'rearrange' && S.room.posterOrder.length > 1) {
      var po = S.room.posterOrder, a = po.length - 1, b2 = po.length - 2; var tmp = po[a]; po[a] = po[b2]; po[b2] = tmp;
    }
    trip.status = 'done'; trip.endedAt = Date.now();
    lastNewPoster = trip.poster ? trip.id : null;
    capTrips();
    save();
    renderStatus(S.room.lantern > prevL);
    renderScene();
    renderSouvenirs(); renderAlbum();
    /* 포스터는 hang_poster 연출 뒤에 벽에 붙는다 (공개 중이 아니면 바로) */
    var pendingHang = revealing && revealing.trip === trip && !skipFlag && !reduced() && trip.poster && (trip.events || []).some(function (e) { return e.type === 'hang_poster'; });
    if (!pendingHang) renderWall();
  }
  function capTrips() {
    var n = S.trips.length - 200;
    for (var i = 0; n > 0 && i < S.trips.length; i++) { if (S.trips[i].events && S.trips[i].events.length) { S.trips[i].events = []; n--; } }
  }
  /* 열었을 때 running 이 남아 있으면 즉시 귀가 (§3-6) */
  function resumeRunning() {
    var run = S.trips.filter(function (t) { return t.status === 'running'; });
    if (!run.length) return Promise.resolve(false);
    var chain = Promise.resolve();
    run.forEach(function (trip) {
      chain = chain.then(function () {
        if (trip.events && trip.events.length && trip.kind) return;
        if (!B) return;
        return B.plan(Object.assign(brainInput(trip), { online: false })).then(function (p) { mergePlan(trip, p); }).catch(function () { trip.kind = 'empty'; trip.events = [{ type: 'empty_turn', t: 0 }]; });
      }).then(function () { commitTrip(trip); });
    });
    return chain.then(function () {
      renderLog();
      ensureTodaySection().appendChild(logRow('귀가', '네가 없는 동안 다녀왔어', 'c-teal', true)); scrollLog();
      return true;
    });
  }

  /* ───────────────────────── log (§7.4) ───────────────────────── */
  function logRow(label, text, cls, animate) {
    var row = h('div', { class: 'lrow' + (cls ? ' ' + cls : '') + (animate ? ' in' : '') });
    row.appendChild(h('span', { class: 'ltool', text: label }));
    var tx = h('span', { class: 'ltext' });
    if (typeof text === 'string') tx.textContent = text; else tx.appendChild(text);
    row.appendChild(tx);
    return row;
  }
  function secs(ms) { return ms ? Math.round(ms / 1000) + '초' : ''; }
  function stopName(ev) { var tg = ev.target || {}; return tg.title || (tg.url ? tg.url.replace(/^https?:\/\//, '').split('/')[0] : '어딘가'); }
  function stopEmoji(ev) { var tg = ev.target || {}; var n = tg.id && nodeOf(tg.id); return (n && n.emoji) || (tg.kind === 'url' ? '🚪' : '❔'); }
  function eventRow(trip, ev) {
    var frag = document.createDocumentFragment(), cls = '';
    switch (ev.type) {
      case 'depart':
        cls = 'c-amber';
        frag.appendChild(document.createTextNode(ev.hint ? '힌트: ' + ev.hint : '오늘은 네가 골라봐'));
        if (trip.hint && trip.hint.followed === 'ignored' && trip.hint.note) frag.appendChild(h('span', { class: 'sub', text: trip.hint.note }));
        else if (trip.hint && trip.hint.note) frag.appendChild(h('span', { class: 'sub', text: trip.hint.note }));
        break;
      case 'peek': {
        cls = ev.status === 'read' ? 'c-teal' : ev.status === 'failed' ? 'c-rose' : '';
        var st = ev.status || 'failed';
        frag.appendChild(document.createTextNode(stopEmoji(ev) + ' ' + stopName(ev) + ' '));
        frag.appendChild(h('span', { class: 'st', text: (STATUS_ICON[st] || '❌') + ' ' + (STATUS_LABEL[st] || '못 읽음') + (ev.ms ? ' · ' + secs(ev.ms) : '') }));
        if (ev.first) frag.appendChild(h('span', { class: 'sub first', text: '처음 온 곳이야' }));
        if (ev.bridge) frag.appendChild(h('span', { class: 'sub', text: ev.bridge }));
        if (ev.note && st !== 'read') frag.appendChild(h('span', { class: 'sub', text: ev.note }));
        if (ev.note && st === 'read') frag.appendChild(h('span', { class: 'sub', text: '“' + ev.note + '”' }));
        break;
      }
      case 'return': {
        cls = 'c-teal';
        var rr = (STR.returnReasons && STR.returnReasons[ev.reason]) || '';
        frag.appendChild(document.createTextNode('돌아왔어' + (rr ? '. ' + rr : '')));
        if (trip.receipt && trip.receipt.souvenir) { var sv = W && W.souvenirs && W.souvenirs[trip.receipt.souvenir]; frag.appendChild(h('span', { class: 'sub', text: '가져온 것: ' + (sv ? sv.emoji + ' ' + sv.name : trip.receipt.souvenir) })); }
        break;
      }
      case 'remember': cls = 'c-amber'; frag.appendChild(document.createTextNode(ev.line || (trip.poster && trip.poster.line) || '')); break;
      case 'hang_poster': frag.appendChild(document.createTextNode(trip.poster ? '벽에 붙였어 · ' + (trip.poster.title || '') : '')); break;
      case 'wrap_up': {
        var r = ev.reaction || trip.reaction || '';
        frag.appendChild(document.createTextNode((REACT_EMOJI[r] || '') + ' ' + r + (trip.receipt && trip.receipt.reactionLine ? ' · ' + trip.receipt.reactionLine : '')));
        break;
      }
      case 'stay_home':
        cls = 'c-amber';
        frag.appendChild(document.createTextNode(ev.line || '오늘은 집에 있을래'));
        if (trip.receipt && trip.receipt.activity && trip.receipt.activity.detail) frag.appendChild(h('span', { class: 'sub', text: trip.receipt.activity.detail.split('\n')[0] }));
        frag.appendChild(h('span', { class: 'sub', text: '오늘은 집. 등불 +1' }));
        break;
      case 'empty_turn': frag.appendChild(document.createTextNode('…')); break;
      default: return null;
    }
    return logRow(LOG_LABEL[ev.type] || ev.type, frag, cls, false);
  }
  function ensureTodaySection() {
    var log = $('log'), today = log.querySelector('[data-day="' + dateKey() + '"]');
    if (!today) { var e = log.querySelector('.lempty'); if (e) e.remove(); today = h('div', { class: 'lday', 'data-day': dateKey() }); log.appendChild(today); }
    return today;
  }
  function scrollLog() { var log = $('log'); if (log) log.scrollTop = log.scrollHeight; }
  var greetingRow = null;
  function renderLog() {
    var log = $('log'); if (!log) return;
    log.innerHTML = '';
    var byDay = {};
    S.trips.forEach(function (t) { (byDay[t.date] = byDay[t.date] || []).push(t); });
    var days = Object.keys(byDay).sort(), today = dateKey();
    var yest = dateKey(new Date(Date.now() - 86400000));
    days.forEach(function (d) {
      var rows = [];
      byDay[d].forEach(function (t) {
        if (t.by === 'legacy') { rows.push(logRow('포스터', '옛 기록에서 복원된 포스터 · ' + (t.poster && t.poster.title || ''), '', false)); return; }
        if (t.status !== 'done') return;
        (t.events || []).forEach(function (ev) { var r = eventRow(t, ev); if (r) rows.push(r); });
        if (!(t.events || []).length && t.poster) rows.push(logRow('포스터', t.poster.line || '', '', false));
      });
      if (d === today) {
        var sec = h('div', { class: 'lday', 'data-day': d });
        if (greetingRow) sec.appendChild(greetingRow);
        rows.forEach(function (r) { sec.appendChild(r); });
        log.appendChild(sec);
      } else if (rows.length) {
        var det = h('details', { class: 'lday' }, [h('summary', { text: (d === yest ? '어제' : fmtDate(d)) + ' (' + byDay[d].length + '건)' })]);
        rows.forEach(function (r) { det.appendChild(r); });
        log.appendChild(det);
      }
    });
    if (!log.querySelector('[data-day="' + today + '"]')) { var sec2 = h('div', { class: 'lday', 'data-day': today }); if (greetingRow) sec2.appendChild(greetingRow); log.appendChild(sec2); }
    if (!log.querySelector('.lrow')) log.appendChild(h('div', { class: 'lempty', text: S.octopus.name ? '힌트를 하나 놓고 뽈뽈 다녀와, 하고 불러 봐. 비워 둬도 돼.' : '문어 이름부터 지어 주자.' }));
    scrollLog();
  }
  function setGreeting(text) { greetingRow = logRow('인사', text, 'c-amber', true); }

  /* ───────────────────────── posters (§6) ───────────────────────── */
  var PAPER = [['#f3ead6', '#e6d9bd'], ['#e9ecdc', '#d7dcc3'], ['#f0e2e4', '#dfc9cd']];
  var NOTE_PAPER = [['#fbf3c9', '#eadf9e'], ['#dfeee2', '#c3d9c8'], ['#eae4f3', '#d2c8e3']];
  function tripOrdinal(trip) {
    if (trip.kind !== 'out') return null;
    var n = 0;
    for (var i = 0; i < S.trips.length; i++) { if (S.trips[i].kind === 'out') n++; if (S.trips[i] === trip) break; }
    return n;
  }
  /* 한글 한 줄 → 최대 2줄. 공백 우선, 없으면 글자 단위 */
  function wrapLine(text, maxChars) {
    text = String(text || '').trim(); if (!text) return [];
    if (text.length <= maxChars) return [text];
    var cut = text.lastIndexOf(' ', maxChars);
    if (cut < maxChars * 0.4) cut = maxChars;
    var a = text.slice(0, cut).trim(), b = text.slice(cut).trim();
    if (b.length > maxChars) b = b.slice(0, maxChars - 1) + '…';
    return [a, b];
  }
  function sceneGradient(scene, seed, id) {
    var hue = (hash(scene + '|' + seed) % 360), hue2 = (hue + 28) % 360;
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(' + hue + ',30%,42%)"/><stop offset="1" stop-color="hsl(' + hue2 + ',26%,28%)"/></linearGradient>';
  }
  function sceneShapes(seed, x, y, w, hgt) {
    var r = mkRng(seed >>> 0), s = '';
    for (var i = 0; i < 3; i++) {
      var cx = x + r() * w, cy = y + hgt * (0.35 + r() * 0.5), rr = w * (0.08 + r() * 0.18);
      s += i % 2 ? '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + rr.toFixed(1) + '" fill="#fff" opacity=".12"/>'
                 : '<rect x="' + (cx - rr).toFixed(1) + '" y="' + (cy - rr * .4).toFixed(1) + '" width="' + (rr * 2).toFixed(1) + '" height="' + (rr * .8).toFixed(1) + '" fill="#000" opacity=".14"/>';
    }
    return s;
  }
  function scenePath(scene) { return assetPath('scene.' + (scene || 'home')) || ('assets/scenes/' + encodeURIComponent(scene || 'home') + '.svg'); }
  /* 앞면 SVG. 저장된 데이터만 사용. opts: { mini, inlineScene, inlineThumb } (export 때 data URI 로 치환) */
  function posterSVG(trip, w, hgt, opts) {
    opts = opts || {}; w = w || 300; hgt = hgt || Math.round(w * 4 / 3);
    var p = trip.poster || {}, note = p.type === 'note', uid = 'p' + (trip.seed >>> 0).toString(36) + (opts.mini ? 'm' : '') + w;
    var pal = (note ? NOTE_PAPER : PAPER)[clamp(p.paper | 0, 0, 2)];
    var m = w * 0.06, sx = m, sy = m * 1.3, sw = w - m * 2, sh = hgt * (note ? 0.42 : 0.56);
    var s = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ' + w + ' ' + hgt + '" width="' + w + '" height="' + hgt + '">';
    s += '<defs>' + sceneGradient(p.scene || 'home', trip.seed, uid) + '<clipPath id="' + uid + 'c"><rect x="' + sx + '" y="' + sy + '" width="' + sw + '" height="' + sh + '" rx="' + (w * 0.02) + '"/></clipPath>';
    s += '<clipPath id="' + uid + 't"><rect x="' + (sx + sw * 0.08) + '" y="' + (sy + sh * 0.12) + '" width="' + (sw * 0.5) + '" height="' + (sh * 0.62) + '" rx="' + (w * 0.03) + '"/></clipPath></defs>';
    s += '<rect width="' + w + '" height="' + hgt + '" rx="' + Math.max(1, w * 0.01) + '" fill="' + pal[0] + '"/>';
    s += '<rect x="0.5" y="0.5" width="' + (w - 1) + '" height="' + (hgt - 1) + '" rx="' + Math.max(1, w * 0.01) + '" fill="none" stroke="' + pal[1] + '"/>';
    /* 장면 */
    s += '<g clip-path="url(#' + uid + 'c)"><rect x="' + sx + '" y="' + sy + '" width="' + sw + '" height="' + sh + '" fill="url(#' + uid + ')"/>' + sceneShapes(trip.seed, sx, sy, sw, sh);
    var sceneHref = opts.inlineScene || (opts.noExternal ? null : scenePath(p.scene));
    if (sceneHref) s += '<image href="' + esc(sceneHref) + '" x="' + sx + '" y="' + sy + '" width="' + sw + '" height="' + sh + '" preserveAspectRatio="xMidYMid slice"/>';
    if (!opts.mini && p.thumb && p.thumb.url && S.settings.thumbs !== false && !note) {
      var th = opts.inlineThumb || (opts.noExternal ? null : p.thumb.url);
      if (th) s += '<g clip-path="url(#' + uid + 't)"><image href="' + esc(th) + '" x="' + (sx + sw * 0.08) + '" y="' + (sy + sh * 0.12) + '" width="' + (sw * 0.5) + '" height="' + (sh * 0.62) + '" preserveAspectRatio="xMidYMid slice"/></g>';
    }
    s += '</g>';
    if (!opts.mini && p.thumb && p.thumb.url && S.settings.thumbs !== false && !note) s += '<text x="' + (sx + 2) + '" y="' + (sy + sh - 3) + '" font-size="' + (w * 0.028) + '" fill="#fff" opacity=".75" font-family="Noto Sans KR, sans-serif">사진: 위키미디어 공용</text>';
    /* 스티커 하나 */
    var pos = p.stickerPos || { x: 70, y: 28, rot: 0 };
    var stx = sx + sw * (pos.x / 100), sty = sy + sh * (pos.y / 100), fs = w * (note ? 0.15 : 0.17);
    s += '<text x="' + stx.toFixed(1) + '" y="' + sty.toFixed(1) + '" font-size="' + fs.toFixed(1) + '" text-anchor="middle" dominant-baseline="central" transform="rotate(' + (pos.rot || 0) + ' ' + stx.toFixed(1) + ' ' + sty.toFixed(1) + ')">' + esc(p.emoji || (note ? '🏠' : '❔')) + '</text>';
    if (opts.mini) {
      s += '<rect x="' + sx + '" y="' + (sy + sh + hgt * 0.08) + '" width="' + (sw * 0.8) + '" height="' + (hgt * 0.05) + '" fill="#7a7262" opacity=".5"/>';
      s += '<rect x="' + sx + '" y="' + (sy + sh + hgt * 0.17) + '" width="' + (sw * 0.55) + '" height="' + (hgt * 0.05) + '" fill="#7a7262" opacity=".5"/></svg>';
      return s;
    }
    /* 한 줄 (Noto Serif KR 600, ≤2줄) */
    var lf = w * (note ? 0.062 : 0.058), lines = wrapLine(p.line || '', Math.floor(sw / (lf * 0.95)));
    var ly = sy + sh + lf * 1.6;
    lines.forEach(function (ln, i) { s += '<text x="' + (w / 2) + '" y="' + (ly + i * lf * 1.5).toFixed(1) + '" text-anchor="middle" font-family="Noto Serif KR, serif" font-weight="600" font-size="' + lf.toFixed(1) + '" fill="#2a2620">' + esc(ln) + '</text>'; });
    /* 날짜 · N번째 */
    var ord = tripOrdinal(trip), meta = fmtDate(trip.date, true) + (ord ? ' · ' + ord + '번째 뽈뽈' : note ? ' · 오늘은 집' : '');
    s += '<text x="' + (w / 2) + '" y="' + (hgt - m * 1.1).toFixed(1) + '" text-anchor="middle" font-family="Noto Sans KR, sans-serif" font-size="' + (w * 0.036).toFixed(1) + '" fill="#7a7262">' + esc(meta) + '</text>';
    /* 테이프 / 핀 */
    if (S.room.lantern >= 5) s += '<circle cx="' + (w / 2) + '" cy="' + (m * 0.7) + '" r="' + (w * 0.022) + '" fill="#b8402c"/><circle cx="' + (w / 2 - w * 0.006) + '" cy="' + (m * 0.7 - w * 0.006) + '" r="' + (w * 0.008) + '" fill="#fff" opacity=".7"/>';
    else s += '<rect x="' + (w / 2 - w * 0.09) + '" y="' + (-m * 0.1) + '" width="' + (w * 0.18) + '" height="' + (m * 0.75) + '" fill="#fff" opacity=".45" transform="rotate(-4 ' + (w / 2) + ' ' + (m * 0.3) + ')"/>';
    s += '</svg>';
    return s;
  }
  /* 뒷면 영수증 HTML (§6.2) — 링크 클릭 가능 */
  function receiptHTML(trip) {
    var r = trip.receipt, p = trip.poster || {}, out = '<div class="receipt">';
    out += '<h3>영수증 · ' + esc(trip.id) + '</h3>';
    if (trip.by === 'legacy') {
      out += '<p>옛 기록에서 복원된 포스터야. 들른 곳 기록은 남아 있지 않아.</p><div class="hr"></div><p class="by">고른 이: ' + BY_LABEL.legacy + '</p></div>';
      return out;
    }
    if (trip.kind === 'home') {
      var act = (r && r.activity) || {};
      out += '<p class="big-line">' + esc(p.line || act.line || '') + '</p>';
      out += '<p>오늘은 집. 등불 +1</p>';
      if (act.detail) out += '<p>' + esc(act.detail).replace(/\n/g, '<br>') + '</p>';
      out += '<div class="hr"></div>';
      if (r && r.reaction) out += '<div class="kv"><span>반응</span><b>' + esc((REACT_EMOJI[r.reaction] || '') + ' ' + r.reaction) + '</b></div>';
      out += '<p class="by">고른 이: ' + esc(BY_LABEL[trip.by] || trip.by) + '</p></div>';
      return out;
    }
    var hint = trip.hint || {};
    out += '<div class="kv"><span>힌트</span><b>' + (hint.raw ? esc(hint.raw) + ' → ' + esc(FOLLOW_LABEL[hint.followed] || hint.followed || '') : '없음') + '</b></div>';
    out += '<div class="hr"></div>';
    if (r && r.stops) r.stops.forEach(function (s, i) {
      var st = s.status || 'failed';
      out += '<div class="row"><span class="n">' + (i + 1) + '</span><span>' + esc(s.emoji || '') + ' ' + esc(s.name || s.title || '') +
        ' <span class="st">' + (STATUS_ICON[st] || '❌') + ' ' + esc(STATUS_LABEL[st] || st) + (s.ms ? ' · ' + secs(s.ms) : '') + (s.first ? ' · 처음 온 곳' : '') + '</span>';
      if (s.bridge) out += '<span class="bridge">' + esc(s.bridge) + '</span>';
      if (s.note) out += '<span class="note">' + (st === 'read' ? '“' + esc(s.note) + '”' : esc(s.note)) + '</span>';
      if (st === 'read' && s.source && s.source.url) out += '<a href="' + esc(s.source.url) + '" target="_blank" rel="noopener">출처 ↗ ' + esc(s.source.attribution || 'Wikipedia (ko)') + ' · ' + esc(s.source.license || 'CC BY-SA') + '</a>';
      out += '</span></div>';
    });
    out += '<div class="hr"></div>';
    var c = (r && r.counts) || {};
    var sv = r && r.souvenir && W && W.souvenirs && W.souvenirs[r.souvenir];
    out += '<p>읽음 ' + (c.read | 0) + ' · 책장 ' + (c.builtin | 0) + ' · 모의 ' + (c.simulated | 0) + ' · 못 읽음 ' + (c.failed | 0) + (c.none ? ' · 앉아만 ' + c.none : '') + '<br>가져온 것: ' + (sv ? esc(sv.emoji + ' ' + sv.name) : r && r.souvenir ? esc(r.souvenir) : '없음') + '</p>';
    if (r && r.rememberedIdx >= 0 && r.stops[r.rememberedIdx]) out += '<div class="kv"><span>기억으로 고른 곳</span><b>' + esc(r.stops[r.rememberedIdx].name || '') + '</b></div>';
    if (r && r.reaction) out += '<div class="kv"><span>반응</span><b>' + esc((REACT_EMOJI[r.reaction] || '') + ' ' + r.reaction) + '</b></div>';
    if (r && r.reactionLine) out += '<p class="dim">' + esc(r.reactionLine) + '</p>';
    out += '<p class="by">고른 이: ' + esc(BY_LABEL[trip.by] || trip.by) + '</p></div>';
    return out;
  }

  /* ───────────────────────── render: status · wall · album · souvenirs ───────────────────────── */
  function renderStatus(bloom) {
    var n = S.room.lantern;
    $('oct-name').textContent = S.octopus.name || '이름 없는 문어';
    var pips = $('pips'); pips.setAttribute('aria-label', '등불 ' + n + '/8');
    if (pips.children.length !== 8) { pips.innerHTML = ''; for (var i = 0; i < 8; i++) pips.appendChild(h('span', { class: 'pip', 'aria-hidden': 'true', text: '○' })); }
    Array.prototype.forEach.call(pips.children, function (p, i) {
      var on = i < n, was = p.classList.contains('on');
      p.classList.toggle('on', on); p.textContent = on ? '●' : '○';
      if (on && !was && bloom) { p.classList.add('bloom'); setTimeout(function () { p.classList.remove('bloom'); }, 900); }
    });
    $('stat-trips').textContent = '여행 ' + S.octopus.trips;
    $('stat-days').textContent = '함께한 날 ' + S.octopus.days.length;
  }
  function tripById(id) { for (var i = 0; i < S.trips.length; i++) if (S.trips[i].id === id) return S.trips[i]; return null; }
  function posterTrips() { return S.room.posterOrder.map(tripById).filter(function (t) { return t && t.poster && t.status === 'done'; }); }
  function renderWall() {
    scene.setPosters(posterTrips().map(function (t) {
      return { id: t.id, title: t.poster.title || '포스터', svg: posterSVG(t, 14, 19, { mini: true }), tex: sceneMode === '3d' ? posterSVG(t, 48, 64, { mini: true, noExternal: true }) : null };
    }));
  }
  var albumFilter = 'all';
  function renderAlbum() {
    var al = $('album'); if (!al) return;
    al.innerHTML = '';
    var trips = S.trips.filter(function (t) { return t.poster && t.status === 'done' && (albumFilter === 'all' || t.poster.type === albumFilter); });
    if (!trips.length) { al.appendChild(h('div', { class: 'lempty', text: albumFilter === 'note' ? '아직 쪽지가 없어. 집에 있는 날에 생겨.' : '아직 포스터가 없어. 첫 뽈뽈을 보내 봐' })); return; }
    var byDay = {}, days = [];
    trips.forEach(function (t) { if (!byDay[t.date]) { byDay[t.date] = []; days.push(t.date); } byDay[t.date].push(t); });
    days.forEach(function (d) {
      var g = h('div', { class: 'aday' }, [h('span', { class: 'adate', text: fmtDate(d) })]);
      byDay[d].forEach(function (t) {
        var note = t.poster.type === 'note';
        var c = h('button', { type: 'button', class: 'pcard' + (note ? ' note' : '') + (t.id === lastNewPoster ? ' in' : ''), 'aria-label': (t.poster.title || '포스터') + ' · ' + (t.poster.line || ''), html: note ? posterSVG(t, 84, 112) : posterSVG(t, 108, 144) });
        c.addEventListener('click', function () { openPoster(t.id); });
        g.appendChild(c);
      });
      al.appendChild(g);
    });
    al.scrollLeft = al.scrollWidth;
  }
  var lastNewPoster = null;
  function renderSouvenirs() {
    scene.setSouvenirs(S.room.souvenirs.slice(-8).map(function (sv) {
      var def = W && W.souvenirs && W.souvenirs[sv.id];
      return { id: sv.id, tripId: sv.tripId, emoji: def ? def.emoji : '•', name: def ? def.name : sv.id, img: assetPath('souvenir.' + sv.id) };
    }));
  }
  function renderAll() { renderStatus(false); renderScene(); renderSouvenirs(); renderWall(); renderAlbum(); renderLog(); }

  /* ───────────────────────── dialogs: poster · room sheet · name ───────────────────────── */
  var openTripId = null;
  function openPoster(tripId, back) {
    var t = tripById(tripId); if (!t || !t.poster) return;
    openTripId = tripId;
    var dlg = $('poster-dialog'), fl = $('flipper');
    $('pd-front').innerHTML = posterSVG(t, 300, 400);
    $('pd-back').innerHTML = receiptHTML(t);
    fl.classList.toggle('note', t.poster.type === 'note');
    fl.classList.toggle('flip', !!back);
    $('pd-save').hidden = false;
    if (!dlg.open) dlg.showModal();
  }
  function flipPoster() { $('flipper').classList.toggle('flip'); }
  function svgToDataURI(svg) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); }
  function fetchAsDataURL(url) {
    return fetch(url, { mode: 'cors' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.blob(); })
      .then(function (b) { return new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.onerror = rej; fr.readAsDataURL(b); }); });
  }
  function savePNG() {
    var t = tripById(openTripId); if (!t) return Promise.resolve();
    var btn = $('pd-save'); btn.disabled = true;
    var p = t.poster || {};
    var jobs = [
      (/^data:/.test(scenePath(p.scene)) ? Promise.resolve(scenePath(p.scene)) : fetchAsDataURL(scenePath(p.scene)).catch(function () { return null; })),
      (p.thumb && p.thumb.url && S.settings.thumbs !== false) ? fetchAsDataURL(p.thumb.url).catch(function () { return null; }) : Promise.resolve(null)
    ];
    return Promise.all([document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(), jobs[0], jobs[1]]).then(function (res) {
      var svg = posterSVG(t, 600, 800, { inlineScene: res[1], inlineThumb: res[2], noExternal: true });
      return new Promise(function (resolve) {
        var img = new Image();
        img.onload = function () {
          var cv = document.createElement('canvas'); cv.width = 600; cv.height = 800;
          cv.getContext('2d').drawImage(img, 0, 0);
          cv.toBlob(function (blob) {
            if (!blob) { resolve(false); return; }
            var url = URL.createObjectURL(blob), a = h('a', { href: url, download: 'ppolppol_' + t.id + '.png' });
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
            resolve(true);
          }, 'image/png');
        };
        img.onerror = function () { resolve(false); };
        img.src = svgToDataURI(svg);
      });
    }).then(function (ok) { btn.disabled = false; toast(ok ? '이미지로 저장했어' : '이미지 저장이 안 됐어'); return ok; });
  }
  function topCorners() {
    var a = S.octopus.affinity || {};
    return Object.keys(a).filter(function (k) { return k !== 'wild' && a[k] > 0.3; }).sort(function (x, y) { return a[y] - a[x]; }).slice(0, 2);
  }
  function topVisited() {
    var v = S.octopus.visits || {}, best = null;
    Object.keys(v).forEach(function (k) { if (k !== 'door_out' && (!best || v[k] > v[best])) best = k; });
    return best && v[best] >= 2 ? { id: best, n: v[best] } : null;
  }
  function renderRoomSheet() {
    var body = $('rs-body'), lv = S.room.lantern;
    var levels = (W && W.roomLevels) || [], L = levels[lv] || { text: '' };
    var frag = document.createDocumentFragment();
    frag.appendChild(h('h3', { text: '방 · 등불 ' + lv + '/8' }));
    frag.appendChild(h('p', { class: 'room-text', text: L.text || '' }));
    frag.appendChild(h('h3', { text: '문어의 요즘' }));
    var tc = topCorners(), tv = topVisited();
    if (!tc.length && !tv) frag.appendChild(h('p', { text: '아직 어디가 좋은지 모르겠어. 더 다녀 봐야 알겠어' }));
    tc.forEach(function (c) { frag.appendChild(h('p', { text: '요즘 ' + cornerName(c) + ' 방을 자꾸 가네' })); });
    if (tv) { var nd = nodeOf(tv.id); frag.appendChild(h('p', { text: (nd ? nd.name : tv.id) + ' 방은 ' + tv.n + '번 왔어' })); }
    frag.appendChild(h('h3', { text: lv >= 7 ? '선반' : '창턱' }));
    var sl = h('div', { class: 'souv-list' });
    if (!S.room.souvenirs.length) sl.appendChild(h('span', { text: '아직 가져온 게 없어' }));
    S.room.souvenirs.forEach(function (sv) { var d = W && W.souvenirs && W.souvenirs[sv.id]; sl.appendChild(h('span', { text: d ? d.emoji + ' ' + d.name : sv.id })); });
    frag.appendChild(sl);
    frag.appendChild(h('h3', { text: '통계' }));
    var reads = S.trips.reduce(function (n, t) { return n + ((t.receipt && t.receipt.counts && t.receipt.counts.read) | 0); }, 0);
    var homes = S.trips.filter(function (t) { return t.kind === 'home'; }).length;
    frag.appendChild(h('div', { class: 'stats' }, [h('span', { html: '여행 <b>' + S.octopus.trips + '</b>' }), h('span', { html: '함께한 날 <b>' + S.octopus.days.length + '</b>' }), h('span', { html: '읽음 <b>' + reads + '</b>' }), h('span', { html: '집에 있던 날 <b>' + homes + '</b>' })]));
    frag.appendChild(h('h3', { text: '누가 고르나', id: 'rs-demo' }));
    frag.appendChild(h('p', { text: '이 문어는 데모 두뇌가 움직여. 작은 규칙 뭉치가 어디로 갈지, 집에 있을지, 무엇을 기억할지 고르는 거야. 진짜 모델이 고르는 건 MCP 연결 뒤 이야기야. 영수증 아래 "고른 이" 에 누가 골랐는지 늘 적어 둘게.' }));
    frag.appendChild(h('h3', { text: '문어 색' }));
    var PRESETS = [['빨강', '#e8463c'], ['주황', '#f08a3c'], ['보라', '#9a5cc8'], ['파랑', '#4a86d8'], ['초록', '#4fa868'], ['분홍', '#f07aa8']];
    var hueIn = h('input', { type: 'range', id: 'set-hue', min: '0', max: '360', step: '1', 'aria-label': '문어 색상' });
    hueIn.value = String(hexHue(S.settings.octColor));
    hueIn.addEventListener('input', function () { setOctColor(hslHex(+hueIn.value, 0.76, 0.57)); swatchOn(); });
    var sw = h('div', { class: 'presets', role: 'group', 'aria-label': '색 프리셋' });
    PRESETS.forEach(function (p) {
      var b = h('button', { type: 'button', class: 'preset', 'data-hex': p[1], title: p[0], 'aria-label': p[0] });
      b.style.background = p[1];
      b.addEventListener('click', function () { setOctColor(p[1]); hueIn.value = String(hexHue(p[1])); swatchOn(); });
      sw.appendChild(b);
    });
    function swatchOn() { sw.querySelectorAll('.preset').forEach(function (b) { b.classList.toggle('on', b.dataset.hex === S.settings.octColor); }); }
    swatchOn();
    frag.appendChild(h('label', { class: 'set' }, ['색상', hueIn]));
    frag.appendChild(sw);
    frag.appendChild(h('h3', { text: '설정' }));
    var sel = h('select', { id: 'set-motion' }, [h('option', { value: 'auto', text: '기기 설정 따르기' }), h('option', { value: 'reduce', text: '모션 줄이기' })]);
    sel.value = S.settings.motion || 'auto';
    sel.addEventListener('change', function () { S.settings.motion = sel.value; save(); applyMotion(); });
    frag.appendChild(h('label', { class: 'set' }, ['모션', sel]));
    var cb = h('input', { type: 'checkbox', id: 'set-thumbs' }); cb.checked = S.settings.thumbs !== false;
    cb.addEventListener('change', function () { S.settings.thumbs = cb.checked; save(); renderWall(); renderAlbum(); });
    frag.appendChild(h('label', { class: 'set' }, ['포스터에 위키 썸네일 표시', cb]));
    frag.appendChild(h('div', { class: 'set' }, [h('span', { text: '기록 내보내기 (JSON)' }), h('button', { type: 'button', class: 'btn sm', text: '내보내기', onclick: exportJSON })]));
    var file = h('input', { type: 'file', accept: 'application/json,.json', id: 'set-import' });
    file.addEventListener('change', function () { var f = file.files && file.files[0]; if (!f) return; var fr = new FileReader(); fr.onload = function () { importJSON(fr.result); }; fr.readAsText(f); });
    frag.appendChild(h('div', { class: 'set' }, [h('span', { text: '기록 불러오기 (JSON)' }), file]));
    var resetBtn = h('button', { type: 'button', class: 'btn sm danger', text: '전체 초기화' });
    var armed = false, armTimer = null;
    resetBtn.addEventListener('click', function () {
      if (!armed) { armed = true; resetBtn.textContent = '정말? 다시 누르면 지워져'; armTimer = setTimeout(function () { armed = false; resetBtn.textContent = '전체 초기화'; }, 4000); return; }
      clearTimeout(armTimer); resetAll();
    });
    frag.appendChild(h('div', { class: 'set' }, [h('span', { text: '모든 기록 지우기 (2단계 확인)' }), resetBtn]));
    body.innerHTML = ''; body.appendChild(frag);
  }
  function openRoomSheet(scrollToDemo) {
    renderRoomSheet();
    var dlg = $('room-sheet'); if (!dlg.open) dlg.showModal();
    if (scrollToDemo) { var el = $('rs-demo'); if (el) el.scrollIntoView({ block: 'start' }); }
  }
  function openNameDialog() { var d = $('name-dialog'); if (!d.open) d.showModal(); setTimeout(function () { $('name-in').focus(); }, 50); }
  function applyMotion() { document.documentElement.setAttribute('data-motion', S.settings.motion || 'auto'); if (scene) scene.setReducedMotion(reduced()); }
  function hexHue(hex) {
    var n = parseInt(String(hex).slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return 0;
    var hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return Math.round(((hh * 60) + 360) % 360);
  }
  function hslHex(hh, s, l) {
    var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((hh / 60) % 2 - 1)), m = l - c / 2, rgb = hh < 60 ? [c, x, 0] : hh < 120 ? [x, c, 0] : hh < 180 ? [0, c, x] : hh < 240 ? [0, x, c] : hh < 300 ? [x, 0, c] : [c, 0, x];
    return '#' + rgb.map(function (v) { return ('0' + Math.round((v + m) * 255).toString(16)).slice(-2); }).join('');
  }
  function exportJSON() {
    var blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob), a = h('a', { href: url, download: 'ppolppol_' + dateKey() + '.json' });
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    return JSON.stringify(S);
  }
  function importJSON(text) {
    try {
      var obj = typeof text === 'string' ? JSON.parse(text) : text;
      if (!obj || obj.v !== 2 || !obj.octopus) throw new Error('format');
      S = normalize(obj); save(); renderAll(); applyMotion(); octInitial();
      var d = $('room-sheet'); if (d.open) d.close();
      toast('기록을 불러왔어'); return true;
    } catch (e) { toast('이 파일은 뽈뽈 기록이 아닌 것 같아'); return false; }
  }
  function resetAll() {
    try { localStorage.removeItem(KEY); } catch (e) { /* noop */ }
    S = defaults(); save(); renderAll(); octInitial();
    var d = $('room-sheet'); if (d.open) d.close();
    openNameDialog();
  }

  /* ───────────────────────── demo controls (§7.6) ───────────────────────── */
  var demo = { phase: 'start', events: [], t0: 0, hint: '', hung: false, wrapped: false };
  function demoSet(phase) {
    demo.phase = phase;
    var on = { start: ['d-depart', 'd-stay'], out: ['d-peek', 'd-return'], back: ['d-poster', 'd-wrap'] }[phase] || [];
    ['d-depart', 'd-stay', 'd-peek', 'd-return', 'd-poster', 'd-wrap'].forEach(function (id) { var b = $(id); if (b) b.disabled = on.indexOf(id) < 0 || busy; });
    if ($('d-import')) $('d-import').disabled = busy || phase !== 'start';
  }
  function demoMsg(t) { var m = $('d-msg'); if (m) m.textContent = t || ''; }
  function demoT() { return Date.now() - demo.t0; }
  function demoFinish(byKind) {
    if (!B || typeof B.replay !== 'function') { demoMsg('두뇌(brain.js)가 없어 재생할 수 없어'); return; }
    var dk = dateKey(), seq = tripsOn(dk).length + 1;
    var meta = { by: byKind || 'human', dateKey: dk, seq: seq, name: S.octopus.name || '', now: new Date(), seed: B.hashSeed(dk, demo.hint, seq, 'human', String(demo.events.length)),
      state: { visits: S.octopus.visits, affinity: S.octopus.affinity, lantern: S.room.lantern, recent: [], todayOut: 0 } };
    var planned;
    try { planned = B.replay(demo.events, meta); } catch (e) { demoMsg('재생 실패: ' + e.message); return; }
    var trip = { id: newTripId(meta.seed), date: dk, seq: seq, seed: meta.seed, kind: null, by: meta.by, hint: { raw: demo.hint }, status: 'running', startedAt: demo.t0 || Date.now(), endedAt: null, events: [], receipt: null, poster: null };
    mergePlan(trip, planned); trip.by = meta.by; trip.events = demo.events.slice();
    S.trips.push(trip); save();
    skipFlag = true; setBusy(true);
    var today = ensureTodaySection(); today.querySelectorAll('.lrow.demo-live').forEach(function (r) { r.remove(); });
    reveal(trip).then(function () { setBusy(false); demo = { phase: 'start', events: [], t0: 0, hint: '', hung: false, wrapped: false }; demoSet('start'); demoMsg('사람이 조작한 산책이 저장됐어 (고른 이: 사람이 조작)'); renderLog(); });
  }
  function demoLive(ev) { var row = eventRow({ hint: {}, receipt: null, poster: null }, ev); if (row) { row.classList.add('demo-live', 'in'); ensureTodaySection().appendChild(row); scrollLog(); } }
  function bindDemo() {
    demoSet('start');
    $('d-depart').addEventListener('click', function () {
      if (busy) return;
      wakeUp(); demo.t0 = Date.now(); demo.hint = ($('hint-in').value || '').trim(); demo.events = [{ type: 'depart', t: 0, hint: demo.hint, followHint: !!demo.hint }];
      demoLive(demo.events[0]); oct.busy = true; stopWander();
      walkTo('door').then(function () { octState('away'); }); demoSet('out');
    });
    $('d-stay').addEventListener('click', function () {
      if (busy) return;
      demo.t0 = Date.now(); demo.hint = '';
      demo.events = [{ type: 'stay_home', t: 0, activity: 'window_watch', line: '창밖을 그냥 봤어', anchor: 'window' }, { type: 'wrap_up', t: 1500, reaction: '졸림' }];
      demoFinish('human');
    });
    $('d-peek').addEventListener('click', function () {
      var raw = ($('d-peek-in').value || '').trim(); if (!raw) { demoMsg('기웃거릴 곳을 적어 줘'); return; }
      var m = B && B.matchHint ? B.matchHint(raw) : { kind: 'wiki', query: raw }, ev = { type: 'peek', t: demoT(), ms: 3000 + Math.floor(uiRng() * 6000), first: false, viaTangent: demo.events.filter(function (e) { return e.type === 'peek'; }).length > 0 };
      if (m.kind === 'node') { var nd = nodeOf(m.nodeId); ev.target = { kind: 'room', id: m.nodeId, title: nd ? nd.name : m.nodeId, wiki: nd ? nd.wiki : null }; ev.status = nd && (nd.linger || m.nodeId === 'letter_room') ? 'none' : nd && nd.clue ? 'builtin' : 'failed'; ev.note = ev.status === 'builtin' ? nd.clue : ''; ev.first = !(S.octopus.visits[m.nodeId] > 0); }
      else if (m.kind === 'url') { ev.target = { kind: 'url', url: m.url }; ev.status = 'simulated'; ev.note = '정적 페이지라 바깥은 못 읽어. 문 앞까지만 갔다 왔어'; }
      else { ev.target = { kind: 'wild', title: raw }; ev.status = 'simulated'; ev.note = '사람이 고른 곳이라 내용은 읽지 않았어'; }
      demo.events.push(ev); demoLive(ev); $('d-peek-in').value = '';
    });
    $('d-return').addEventListener('click', function () {
      if (!demo.events.some(function (e) { return e.type === 'peek'; })) { demoMsg('한 곳은 기웃거리고 돌아오자'); return; }
      var ev = { type: 'return', t: demoT(), reason: 'enough' }; demo.events.push(ev); demoLive(ev);
      octPlace('door'); walkTo('board', 'carry').then(function () { octState('idle'); }); demoSet('back');
    });
    $('d-poster').addEventListener('click', function () {
      if (demo.hung) return; demo.hung = true;
      var peeks = demo.events.filter(function (e) { return e.type === 'peek'; }), idx = peeks.length - 1, last = peeks[idx] || {};
      var nd = last.target && last.target.id ? nodeOf(last.target.id) : null;
      demo.events.push({ type: 'remember', t: demoT(), stopIdx: idx, sticker: nd ? (nd.sticker || nd.id) : 'wild', line: '사람이 골라 준 길을 걸었어. ' + (last.target ? (last.target.title || '') : '') });
      demo.events.push({ type: 'hang_poster', t: demoT(), posterId: null });
      $('d-poster').disabled = true; if (demo.wrapped) demoFinish('human');
    });
    $('d-wrap').addEventListener('click', function () {
      if (demo.wrapped) return; demo.wrapped = true;
      demo.events.push({ type: 'wrap_up', t: demoT(), reaction: '덤덤' });
      $('d-wrap').disabled = true; if (demo.hung) demoFinish('human'); else demoMsg('포스터도 누르면 저장돼. 포스터 없이 끝내려면 다시 마무리를 눌러 줘');
      if (!demo.hung) { $('d-wrap').disabled = false; $('d-wrap').onclick = function () { if (demo.wrapped && !demo.hung) { demoFinish('human'); $('d-wrap').onclick = null; } }; }
    });
    $('d-import').addEventListener('click', function () { importEvents($('d-json').value); });
  }
  function importEvents(json) {
    if (busy) return false;
    var evs;
    try { evs = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { demoMsg('JSON 을 읽을 수 없어: ' + e.message); return false; }
    if (!Array.isArray(evs) || !evs.length) { demoMsg('이벤트 배열이 비어 있어'); return false; }
    if (!B || typeof B.replay !== 'function') { demoMsg('두뇌(brain.js)가 없어'); return false; }
    var dk = dateKey(), seq = tripsOn(dk).length + 1;
    var dep = evs.filter(function (e) { return e && e.type === 'depart'; })[0];
    var meta = { by: 'mcp', dateKey: dk, seq: seq, name: S.octopus.name || '', now: new Date(), seed: B.hashSeed('mcp', dk, seq, JSON.stringify(evs)),
      state: { visits: S.octopus.visits, affinity: S.octopus.affinity, lantern: S.room.lantern, recent: [], todayOut: 0 } };
    var planned;
    try { planned = B.replay(evs, meta); } catch (e) { demoMsg('재생 실패: ' + e.message); return false; }
    var trip = { id: newTripId(meta.seed), date: dk, seq: seq, seed: meta.seed, kind: null, by: 'mcp', hint: { raw: dep ? (dep.hint || '') : '' }, status: 'running', startedAt: Date.now(), endedAt: null, events: [], receipt: null, poster: null };
    mergePlan(trip, planned); trip.by = 'mcp'; trip.events = evs;
    S.trips.push(trip); save();
    $('d-json').value = ''; demoMsg('모델(MCP) 이벤트를 재생 중…');
    wakeUp(); setBusy(true); skipFlag = false; demoSet('start');
    reveal(trip).then(function () { setBusy(false); demoSet('start'); demoMsg('재생 끝 (고른 이: 모델(MCP))'); });
    return true;
  }

  /* ───────────────────────── boot ───────────────────────── */
  function updateHintHelp() {
    var v = ($('hint-in').value || '').trim(), help = $('hint-help');
    help.textContent = /^https?:\/\//i.test(v) ? 'URL은 문 앞까지만 가 볼 수 있어(모의 방문)' : v ? '힌트는 넌지시 흘리는 거야. 따라갈지는 문어가 정해' : "비워 두면 '오늘은 네가 골라봐'";
  }
  function bind() {
    $('btn-go').addEventListener('click', function () { invite(); });
    $('hint-in').addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); invite(); } });
    $('hint-in').addEventListener('input', updateHintHelp);
    $('hint-in').addEventListener('focus', function () { var r = $('hint-in').getBoundingClientRect(); scene.lookAt(r.left + r.width / 2, r.top); });
    $('hint-in').addEventListener('blur', function () { scene.lookAt(window.innerWidth / 2, window.innerHeight / 2); });
    $('btn-skip').addEventListener('click', skip);
    $('btn-look').addEventListener('click', function () { openRoomSheet(false); });
    $('chip-demo').addEventListener('click', function () { openRoomSheet(true); });
    $('rs-close').addEventListener('click', function () { $('room-sheet').close(); });
    $('pd-flip').addEventListener('click', flipPoster);
    $('pd-front').addEventListener('click', flipPoster);
    $('pd-close').addEventListener('click', function () { $('poster-dialog').close(); });
    $('pd-save').addEventListener('click', function () { savePNG(); });
    $('poster-dialog').addEventListener('click', function (e) { if (e.target === e.currentTarget) e.currentTarget.close(); });
    $('room-sheet').addEventListener('click', function (e) { if (e.target === e.currentTarget) e.currentTarget.close(); });
    $('name-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = ($('name-in').value || '').trim(); if (!v) { $('name-in').focus(); return; }
      var first = !S.octopus.name;
      S.octopus.name = v; if (!S.octopus.born) S.octopus.born = Date.now(); save();
      $('name-dialog').close(); renderStatus(false); renderScene();
      if (first) {
        setGreeting('안녕, ' + v + '. 비 오는 다락방에 온 걸 환영해. ' + greetingByHour(new Date().getHours()) + '.');
        renderLog(); toast('힌트는 비워 둬도 돼. 오늘은 네가 골라봐, 라는 뜻이 되니까.');
      }
    });
    $('name-dialog').addEventListener('cancel', function (e) { if (!S.octopus.name) e.preventDefault(); });
    document.querySelectorAll('.fchip').forEach(function (b) { b.addEventListener('click', function () { albumFilter = b.dataset.f; document.querySelectorAll('.fchip').forEach(function (x) { x.classList.toggle('on', x === b); }); renderAlbum(); }); });
    /* 문어·창문·포스터·기념품 입력은 scene 이 받아 on.* 콜백으로 준다 (§13.1) */
    bindLook();
    if (window.matchMedia) { var mq = window.matchMedia('(prefers-reduced-motion: reduce)'); if (mq.addEventListener) mq.addEventListener('change', applyMotion); }
    bindDemo();
  }
  /* 데모 <details> 안 룩 슬라이더 (3D 전용, localStorage 'ppolppol_look') */
  function bindLook() {
    var px = $('dv-px'), di = $('dv-dither'), ol = $('dv-outline'), yw = $('dv-yaw'), sw = $('dv-swatch'), msg = $('dv-msg');
    if (!px) return;
    var look = Object.assign({ pixelSize: 3, dither: 0.25, outline: true, yaw: 0 }, loadLook());
    px.value = look.pixelSize; di.value = look.dither; ol.checked = look.outline !== false; yw.value = look.yaw;
    function show() { $('dv-px-v').textContent = px.value; $('dv-dither-v').textContent = (+di.value).toFixed(2); $('dv-yaw-v').textContent = yw.value + '°'; }
    function apply() {
      look = { pixelSize: +px.value, dither: +di.value, outline: ol.checked, yaw: +yw.value };
      saveLook(look); show();
      if (sceneMode === '3d') scene.setLook(look);
    }
    [px, di, ol, yw].forEach(function (el) { el.addEventListener('input', apply); el.addEventListener('change', apply); });
    show();
    if (sceneMode !== '3d') { msg.textContent = '지금은 2D 장면이라 이 슬라이더는 적용 안 돼 (WebGL 없음 또는 ?scene=2d)'; return; }
    msg.textContent = '3D 룩 조정 (저장됨). 팔레트:';
    scene.palette().forEach(function (r) {
      var row = h('div', { class: 'swrow', title: r.name });
      r.colors.forEach(function (c) { var d = h('span', { class: 'sw', title: c }); d.style.background = c; row.appendChild(d); });
      sw.appendChild(row);
    });
  }
  function boot() {
    var q = new URLSearchParams(location.search), slow = parseFloat(q.get('slow'));
    if (slow > 0) document.documentElement.style.setProperty('--speed', String(slow));
    load(); applyMotion(); initScene(); applyMotion();
    renderStatus(false); renderScene(); renderSouvenirs(); renderWall(); renderAlbum();
    bind();
    if (S.octopus.name) setGreeting(greetingByHour(new Date().getHours()) + ', ' + S.octopus.name + (S.octopus.state === 'sleep' ? '는 아직 자고 있어.' : '가 기다리고 있었어.'));
    renderLog();
    octInitial();
    if (!S.octopus.name) openNameDialog();
    loadManifest().then(function (ok) { if (ok) { scene.refresh(); renderSouvenirs(); } });
    resumeRunning().then(function (did) { if (did) finalPose({ kind: 'out' }); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  /* ───────────────────────── 공개 (§12.3) ───────────────────────── */
  return {
    get state() { return S; },
    save: save, load: load, invite: invite, skip: skip, reveal: reveal,
    renderAll: renderAll, renderStatus: renderStatus, renderScene: renderScene, renderLog: renderLog, renderWall: renderWall, renderAlbum: renderAlbum, renderSouvenirs: renderSouvenirs,
    posterSVG: posterSVG, receiptHTML: receiptHTML, openPoster: openPoster, openRoomSheet: openRoomSheet,
    importEvents: importEvents, exportJSON: exportJSON, importJSON: importJSON,
    oct: oct, walkTo: walkTo, octState: octState, anchors: ANCHORS, placeholders: PH, commitTrip: commitTrip,
    get scene() { return scene; }, get sceneMode() { return sceneMode; }, setOctColor: setOctColor, weatherFor: weatherFor, itemsFor: itemsFor
  };
})();
