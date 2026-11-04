/* ============================================================
   뽈뽈 문어 — js/audio.js (전역 AUDIO) · 소리 연결
   소리 한 벌은 audio/ (사운드 세션 소유 — 여기서는 읽기만). 연동 규칙은 audio/README.md §3·§4 와 audio/manifest.json 의 rules·map 그대로.
   참고 구현 audio/soundboard.html 의 덕킹·마디선 전환·말풍선 목소리 로직을 게임 상태에 맞게 옮겼다.

   - 꺼진 채로 시작한다 (브라우저 자동재생 정책 + 조용한 게임). 켜면 audio_on 한 번. 설정 = localStorage 'ppolppol_audio' { on, music, sfx }
     켜 둔 채 새로고침하면 첫 탭(어디든)에서 다시 흐른다 — 사용자 동작 없이는 소리를 내지 않는다. 그렇게 탭을 기다리는 동안 토글은 '소리 켜기'.
   - 켜기 전에는 audio/ 에 요청을 하나도 보내지 않는다. 켠 뒤에도 지금 필요한 것만: 지금 BGM · 지금 환경음 · 효과음은 처음 쓸 때.
     예외 하나: 말풍선 음절(voice_*) 16개 + 기웃 결과음(peek_*) 11개 (파일 56 KB · 디코드 1 MB 미만) + 움츠림·나감·앉음·끄는 소리 8개(46 KB)는 켠 뒤 2.5초에 한꺼번에 미리 받는다 —
     음절을 처음 받는 데 0.8 s 넘게 걸리면 그 말을 통째로 건너뛰어서 느린 기기에선 첫 말풍선들이 조용했고, 결과음이 늦게 오면 음절과 겹쳤다.
     디코드된 버퍼는 작은 LRU (바이트 한도, 울리는 중인 것은 안 지움).
   - Web Audio 버스 다섯 bgm · amb · sfx_event · sfx_ui · voice → (bgm: 빈 방 트림 → 덕킹) (amb: 덕킹 절반) → 마스터(밤 -3 dB) → 출력.
     징글의 duck_db 만큼 내리기만 한다 (어택 60~80 ms · 릴리스 0.5~0.9 s). 멈추는 건 방 완성(pause_bgm) 하나. 이벤트 징글은 서로 겹치지 않게 줄을 선다.
   - 못 받은 파일은 15 s → 30 s → … 10분 동안 없는 것으로 (틱마다 다시 받지 않게). 끄면 루프·한 번짜리 소리 모두 제 크기로 닫고 멈춘다.
   - 루프는 AudioBufferSourceNode loopStart/loopEnd (start(t, loop.start)). 집 테마는 한 바퀴 뒤 rest_after_sec 동안 환경음만 → 처음부터.
   - 전환: 장소 = 다음 마디선 1마디 크로스페이드 · 최소 8마디, 시간대 = 4마디 프레이즈 끝 2마디 페이드 → 종 → 새 곡, 날씨 = 환경음 10 s + weather_shift.
   - 변형 고르기·쉼 길이·자장가 바퀴 수 = 날짜 시드 mulberry32 (게임 규칙대로 시드 없는 난수는 쓰지 않는다).
   - file:// 에서는 소리 없음: 브라우저가 file:// 의 fetch·디코드를 막아 manifest 와 파일을 못 읽는다. <audio loop> 폴백은 README 가 금지한
     루프 틈(인코더 패딩·앞뒤 여유분)이 들리고 iOS 는 element.volume 을 무시해 덕킹도 안 돼서 쓰지 않는다. 토글은 기억만 하고, 켜면 한 줄로 말한다.
   - 어떤 실패(파일 없음·디코드 실패·AudioContext 없음)도 게임으로 던지지 않는다. console.warn 은 많아야 한 번.
   APP 은 if (window.AUDIO) AUDIO.on('이름', {...}) 한 줄 훅만 부른다 (js/app.js). 이벤트 이름: state · bubble · pet · ceremony · peek · row · lantern · busy · room_sheet
   ============================================================ */
/* global WORLD */
var AUDIO = (function () {
  'use strict';

  /* ───────────────────────── 설정 · 저장 ───────────────────────── */
  var KEY = 'ppolppol_audio';
  var BASE = 'audio/';
  var BUSES = ['bgm', 'amb', 'sfx_event', 'sfx_ui', 'voice'];
  var BUDGET = 128 * 1024 * 1024;   /* 디코드된 버퍼 한도 (float32 — 집 테마 한 곡 3.5분 ≈ 40 MB, 환경음 한 겹 ≈ 10 MB) */
  var MAX_BUFS = 64;                /* …그리고 개수 한도 (효과음은 작다 — 미리 받는 음절·결과음 27개가 금방 밀려나지 않게) */
  var MAX_SHOTS = 6;                /* 동시에 울리는 한 번짜리 소리 (manifest rules.min_gap_ms) */
  var PEEK_OK = { read: 1, builtin: 1, simulated: 1, failed: 1, none: 1 };
  var PLACE_ROOMS = { door_out: 1, slow_room: 1, letter_room: 1 };   /* 코너가 아니라 방 이름으로 테마가 있는 곳 */
  var STAY_ANCHORS = { door: 1, window: 1, crate: 1, board: 1, blanket: 1, center: 1 };   /* app.js ANCHORS */
  var pref = { on: false, music: 0.8, sfx: 0.8 };
  var vol = { bgm: 0.8, amb: 0.8, sfx_event: 0.8, sfx_ui: 0.8, voice: 0.8 };
  function num(x) { return typeof x === 'number' && isFinite(x); }
  function c01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function loadPref() {
    try {
      var o = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (o && typeof o === 'object') { pref.on = o.on === true; if (num(o.music)) pref.music = c01(o.music); if (num(o.sfx)) pref.sfx = c01(o.sfx); }
    } catch (e) { /* 저장소 없음: 기본값 (꺼짐) */ }
  }
  function savePref() { try { localStorage.setItem(KEY, JSON.stringify(pref)); } catch (e) { /* noop */ } }
  function syncVol() { vol.bgm = vol.amb = pref.music; vol.sfx_event = vol.sfx_ui = vol.voice = pref.sfx; }
  var warned = false;
  function warn(msg, e) { if (warned) return; warned = true; try { console.warn('[audio] ' + msg + ' — 소리 없이 계속해', (e && (e.message || e.name)) || ''); } catch (x) { /* noop */ } }
  function noop() {}
  function guard(fn) { return function () { try { return fn.apply(this, arguments); } catch (e) { warn('내부 오류', e); } }; }

  /* ───────────────────────── 환경 ───────────────────────── */
  var AC = window.AudioContext || window.webkitAudioContext || null;
  var reason = location.protocol === 'file:' ? 'file' : !AC ? 'no-webaudio' : typeof fetch !== 'function' ? 'no-fetch' : '';
  /* 날짜 시드 PRNG (게임과 같은 mulberry32) */
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hashStr(s) { var x = 2166136261; for (var i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
  function todayKey() {
    var t = window.__ppolTest; if (t && typeof t === 'object' && /^\d{4}-\d{2}-\d{2}$/.test(t.today || '')) return t.today;
    var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  var rnd = mulberry32(hashStr('ppolppol-audio|' + todayKey()));
  /* 게임에서 읽는 값 (init 이 덮는다). 시간대는 실제 시계 — 게임의 테스트 훅(__ppolLook.hour)은 app 의 hourNow 를 거쳐 들어온다 */
  var game = {
    hour: function () { var d = new Date(); return d.getHours() + d.getMinutes() / 60; },
    weather: function () { return 'rain'; },
    lantern: function () { return 0; },
    season: function () { return null; }
  };
  function bandOf(h) { h = num(h) ? h : new Date().getHours(); return h >= 6 && h < 9 ? 'dawn' : h >= 9 && h < 17 ? 'day' : h >= 17 && h < 19 ? 'dusk' : 'night'; }
  function seasonOf() { var m = new Date().getMonth() + 1; return m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter'; }
  function read(fn, dflt) { try { var v = fn(); return v == null ? dflt : v; } catch (e) { return dflt; } }

  /* ───────────────────────── 상태 ───────────────────────── */
  var gs = { st: null, away: false, departing: false, left: false, placeKey: undefined, sleeping: false, sleepPhase: null, stayWindow: false, stayAct: null, skipping: false, wound: false, leaving: false };
  var ctx = null, nd = {}, M = null, byId = {}, groups = {}, manifestP = null, fmt = null;
  var cache = {}, cacheBytes = 0, useTick = 0, requests = 0;
  var slots = { bgm: null, amb: null, layer: null, warm: null, season: null }, want = {};
  var pend = null, rest = null, started = false, starting = false, inited = false, armed = false, btn = null, toldFile = false;
  var band = bandOf(null), wx = 'rain', season = seasonOf(), lantern = 0;
  var played = [], lastAt = {}, lastPick = {}, shots = [], live = [], evQ = [], evEnd = 0, evP = Promise.resolve(0), pauseUntil = 0;
  var duckInfo = { db: 0, until: 0, lastDb: 0, lastAt: -1 };
  var returnAt = -99, moodAt = -99, lastSpeak = -99, lastSnore = -99, petN = 0, petT = -99;
  var tickTimer = null, lullTimer = null, pauseTimer = null;
  function readGame() {
    band = bandOf(read(game.hour, null));
    var w = read(game.weather, 'rain'); wx = (w === 'clear' || w === 'drizzle' || w === 'snow') ? w : 'rain';
    var s = read(game.season, null); season = (s === 'spring' || s === 'summer' || s === 'autumn' || s === 'winter') ? s : seasonOf();
    lantern = Math.max(0, Math.min(8, read(game.lantern, 0) | 0));
  }

  /* ───────────────────────── 목록 (manifest) ───────────────────────── */
  function index(m) {
    M = m; byId = {}; groups = {};
    (m.sounds || []).forEach(function (s) {
      if (!s || !s.id || !s.files) return;
      byId[s.id] = s;
      var g = s.group || s.id;
      (groups[g] = groups[g] || []).push(s.id);
    });
  }
  function loadManifest() {
    if (M) return Promise.resolve(true);
    if (manifestP) return manifestP;
    requests++;
    manifestP = fetch(BASE + 'manifest.json').then(function (r) { if (!r.ok) throw new Error('manifest ' + r.status); return r.json(); })
      .then(function (m) { if (!m || !m.map || !Array.isArray(m.sounds)) throw new Error('manifest 형식'); index(m); return true; })
      .catch(function (e) { manifestP = null; warn('audio/manifest.json 을 못 읽었어', e); return false; });
    return manifestP;
  }
  /* 못 받은·못 읽은 파일: 다시 받기는 15 s → 30 s → … 10분 뒤 (그동안 없는 것으로 — 틱마다 ogg+m4a 를 다시 받지 않게) */
  var bad = {};
  function isBad(id) { var b = bad[id]; return !!(b && Date.now() < b.until); }
  function has(x) { return !!(x && (byId[x] || groups[x]) && !isBad(x)); }
  /* 정확한 이름이 먼저 (lantern_3 · chime_day), 아니면 그룹에서 직전과 다른 것 (시드 PRNG) */
  function pick(x) {
    if (Array.isArray(x)) x = x.length ? x[Math.floor(rnd() * x.length)] : null;
    if (!x) return null;
    if (byId[x]) return x;
    var g = groups[x]; if (!g || !g.length) return null;
    if (g.length === 1) return g[0];
    var c = g.filter(function (id) { return id !== lastPick[x]; });
    var p = c[Math.floor(rnd() * c.length)] || c[0];
    lastPick[x] = p;
    return p;
  }
  function mp() { return (M && M.map) || {}; }
  function ev(path) { var o = mp(); for (var i = 0; i < path.length && o != null; i++) o = o[path[i]]; return o; }
  function busFor(s) {
    if (s.kind === 'bgm' || s.kind === 'special' || s.kind === 'place') return 'bgm';
    if (s.kind === 'amb' || s.kind === 'layer') return 'amb';
    if (/^voice_/.test(s.id)) return 'voice';
    if (s.kind === 'sfx' && /^(ui_|sheet_|toast|log_line|card_flip|audio_on|album_open|pet_|curious|window_tap)/.test(s.id)) return 'sfx_ui';
    return 'sfx_event';
  }
  function isHome(id) { return !!(id && byId[id] && byId[id].kind === 'bgm'); }

  /* ───────────────────────── 형식 · 불러오기 · LRU ───────────────────────── */
  function pickFmt() {
    try { var a = document.createElement('audio'), c = a.canPlayType ? a.canPlayType('audio/ogg; codecs=opus') : ''; return (c === 'probably' || c === 'maybe') ? 'ogg' : 'm4a'; }
    catch (e) { return 'm4a'; }
  }
  function decode(ab) {
    return new Promise(function (res, rej) {
      var done = false;
      function ok(b) { if (!done) { done = true; res(b); } }
      function no(e) { if (!done) { done = true; rej(e || new Error('decode')); } }
      try { var p = ctx.decodeAudioData(ab, ok, no); if (p && typeof p.then === 'function') p.then(ok, no); } catch (e) { no(e); }
    });
  }
  function fetchBuf(path) { requests++; return fetch(BASE + path).then(function (r) { if (!r.ok) throw new Error(r.status + ' ' + path); return r.arrayBuffer(); }); }
  function load(id) {
    var c = cache[id];
    if (c) { c.used = ++useTick; return c.p; }
    var s = byId[id];
    if (!s || !s.files || !ctx) return Promise.reject(new Error('없음 ' + id));
    var f = fmt === 'ogg' && s.files.ogg ? 'ogg' : 'm4a';
    var entry = { p: null, buf: null, bytes: 0, used: ++useTick };
    entry.p = fetchBuf(s.files[f]).then(decode).catch(function (e) {
      if (f !== 'ogg' || !s.files.m4a) throw e;
      /* Opus 를 못 읽는 브라우저 (iOS Safari 18.4 미만) → AAC 로 한 번 더, 이후 전부 AAC */
      return fetchBuf(s.files.m4a).then(decode).then(function (b) { fmt = 'm4a'; return b; });
    }).then(function (b) {
      delete bad[id];
      entry.buf = b; entry.bytes = b.length * b.numberOfChannels * 4;
      if (cache[id] === entry) { cacheBytes += entry.bytes; evict(); }
      return b;
    });
    cache[id] = entry;
    entry.p.catch(function (e) {
      if (cache[id] === entry) delete cache[id];
      var b = bad[id] || { n: 0 }; b.n++; b.until = Date.now() + Math.min(600, 15 * Math.pow(2, b.n - 1)) * 1000; bad[id] = b;
      warn('소리 파일을 못 틀었어 (' + id + ')', e);
    });
    return entry.p;
  }
  function inUse(id) {
    if (pend && pend.id === id) return true;
    for (var k in slots) if (slots[k] && !slots[k].dead && slots[k].id === id) return true;
    return false;
  }
  function evict() {
    var n = Object.keys(cache).length;
    if (cacheBytes <= BUDGET && n <= MAX_BUFS) return;
    Object.keys(cache).filter(function (id) { return cache[id].buf && !inUse(id); })
      .sort(function (a, b) { return cache[a].used - cache[b].used; })
      .forEach(function (id) { if (cacheBytes <= BUDGET && n <= MAX_BUFS) return; cacheBytes -= cache[id].bytes; delete cache[id]; n--; });
  }

  /* ───────────────────────── 그래프 ───────────────────────── */
  function ensureCtx() {
    if (ctx) return ctx;
    if (reason) return null;
    try {
      ctx = new AC();
      nd.master = ctx.createGain(); nd.master.gain.value = 0; nd.master.connect(ctx.destination);
      nd.duckBgm = ctx.createGain(); nd.duckBgm.connect(nd.master);
      nd.duckAmb = ctx.createGain(); nd.duckAmb.connect(nd.master);
      nd.trim = ctx.createGain(); nd.trim.connect(nd.duckBgm);   /* 빈 방: 나가 있는 동안 집 테마 -3 dB */
      nd.bus = {};
      BUSES.forEach(function (b) {
        var g = ctx.createGain(); g.gain.value = curve(vol[b]);
        g.connect(b === 'bgm' ? nd.trim : b === 'amb' ? nd.duckAmb : nd.master);
        nd.bus[b] = g;
      });
      /* 멈춤이 풀리면 탭 대기를 거두고, 보이는데 멈춰 있으면(iOS 잠금·전화·다른 앱 소리 = suspended/interrupted) 다음 탭에서 다시 깨운다 */
      ctx.onstatechange = guard(function () {
        if (!ctx) return;
        if (ctx.state === 'running') { if (started) disarm(); }
        else if (ctx.state !== 'closed' && pref.on && !reason && !document.hidden) arm();
      });
    } catch (e) {
      reason = 'no-webaudio'; warn('AudioContext 를 못 만들었어', e);
      try { if (ctx) ctx.close(); } catch (x) { /* noop */ }
      ctx = null; nd = {};
      return null;
    }
    return ctx;
  }
  function now() { return ctx ? ctx.currentTime : 0; }
  function dbg(db) { return Math.pow(10, db / 20); }
  function curve(x) { return x * x; }
  function target(p, v, t, tc) { try { p.cancelScheduledValues(t); p.setTargetAtTime(v, t, tc); } catch (e) { try { p.value = v; } catch (x) { /* noop */ } } }
  function masterLevel() { return pref.on ? (band === 'night' ? dbg(-3) : 1) : 0; }   /* 밤 마스터 -3 dB (rules.loudness.night_master_db) */
  function applyLevels(tc) {
    if (!ctx || !nd.master) return;
    var t = now();
    BUSES.forEach(function (b) { target(nd.bus[b].gain, curve(vol[b]), t, 0.05); });
    target(nd.master.gain, masterLevel(), t, tc || 0.1);
  }
  function active() { return !!(pref.on && started && ctx && M && ctx.state !== 'closed'); }

  /* ───────────────────────── 박자 격자 (지금 BGM 기준) ───────────────────────── */
  function beatsOf(s) { var m = String(s.meter || '4/4'); return /^(3\/4|6\/8)/.test(m) ? 3 : /^2\/4/.test(m) ? 2 : 4; }
  function grid(t, step) { var n = slots.bgm; if (!n || n.dead || !step) return t; var el = t - n.t0; if (el <= 0) return n.t0; return n.t0 + Math.ceil(el / step - 1e-6) * step; }
  function nextBar(t) { var n = slots.bgm; return n && n.s.bar_sec ? grid(t, n.s.bar_sec) : t; }
  function nextBeat(t) { var n = slots.bgm; return n && n.s.bar_sec ? grid(t, n.s.bar_sec / beatsOf(n.s)) : t; }
  function nextPhrase(t) { var n = slots.bgm; return n && n.s.bar_sec ? grid(t, n.s.bar_sec * (n.s.phrase_bars || 4)) : t; }

  /* ───────────────────────── 한 번짜리 소리 · 덕킹 ───────────────────────── */
  function note(id, t) { played.push({ id: id, t: Math.round(t * 1000) / 1000 }); if (played.length > 120) played.shift(); }
  /* o: at (ctx 시각) · gain · bus · always (건너뛰는 중에도) · direct (마스터를 거치지 않음 — 끄는 소리) */
  /* 이벤트 징글 줄 세우기: 받기 전에(매니페스트 길이로) 자리를 잡아 서로 겹치지 않게 (기분+등불, 귀가+등불, 등불+이불…).
     빈 자리가 있으면 앞 예약(시간대 종 등) 사이에도 들어간다. beat0 = 처음 자리도 박에, beat1 = 밀렸으면 박에 · fixed = 이미 걸린 것만 피한다
     받기가 늦으면 순서를 지킨다: 뒤 징글은 앞 징글이 걸릴 때까지(많아야 1.5 s) 기다렸다가 그 뒤로 (움츠림이 나감 뒤에 울리지 않게) */
  var evChain = Promise.resolve(0);
  function fitEv(tt, d, beat0, beat1, fixed) {
    var t0 = now(); evQ = evQ.filter(function (x) { return x.e > t0; });
    if (beat0) tt = nextBeat(tt);
    for (var i = 0; i < 16; i++) {
      var hit = null;
      for (var j = 0; j < evQ.length; j++) { var x = evQ[j]; if ((!fixed || x.fixed) && x.s < tt + d - 0.02 && x.e > tt + 0.02 && (!hit || x.e > hit.e)) hit = x; }
      if (!hit) break;
      tt = hit.e + 0.05; if (beat1) tt = nextBeat(tt);
    }
    return tt;
  }
  function play(x, o) {
    o = o || {};
    if (!ctx || !M || document.hidden) return Promise.resolve(0);
    if (!o.direct && !active()) return Promise.resolve(0);
    var id = pick(x); if (!id) return Promise.resolve(0);
    var s = byId[id], g = s.group || id, bus = o.bus || busFor(s);
    if (gs.skipping && !o.always && bus !== 'sfx_ui') return Promise.resolve(0);   /* 건너뛰는 중엔 귀가·등불만 */
    var t0 = now(), tt = o.at || t0, gap = (s.min_gap_ms || 0) / 1000, beat = s.quantize === 'beat';
    /* 비 오는 날 나감 소리 덧층(depart_rain_extra)은 일부러 겹친다. 시간대 종은 곡 전환에 맞춘 자리 그대로 (다른 것이 피해 간다) */
    var queued = !o.direct && bus === 'sfx_event' && s.kind === 'jingle' && g !== 'depart_rain_extra', d = s.duration || 0.3;
    if (queued && g !== 'chime') tt = fitEv(Math.max(tt, t0 + 0.01), d, beat && !o.at, beat);
    if (gap && lastAt[g] != null && Math.abs(tt - lastAt[g]) < gap) return Promise.resolve(0);
    /* 동시에 6개까지: 새 소리가 시작하는 순간 울리고 있을 것만 센다 (미리 예약한 말풍선 음절은 서로 겹치지 않는다) */
    shots = shots.filter(function (x) { return x.e > t0; });
    var over = shots.filter(function (x) { return x.s <= tt + 0.02 && x.e > tt; }).length;
    if (over >= MAX_SHOTS + (bus === 'sfx_event' ? 2 : 0)) return Promise.resolve(0);
    lastAt[g] = tt;
    shots.push({ s: tt, e: tt + d + 0.05 });
    var resv = null, at = o.at || 0, ready = load(id);
    if (queued) {
      resv = { s: tt, e: tt + d, fixed: g === 'chime' }; evQ.push(resv); evEnd = Math.max(evEnd, resv.e); at = tt;
      var prev = evChain;
      ready = Promise.all([ready, Promise.race([prev, new Promise(function (r) { setTimeout(r, 1500); })])]).then(function (r) { return r[0]; });
    }
    var p = ready.then(function (buf) {
      if (!ctx || (!o.direct && !active())) return 0;
      if (o.direct && (pref.on || ctx.state !== 'running')) return 0;   /* 끄는 소리가 늦게 왔다: 멈춘 뒤라면 다음에 켤 때 울리니 버린다 */
      if (o.at && bus === 'voice' && now() > o.at + 0.08) return 0;   /* 늦은 음절은 버린다 (뭉쳐 울리지 않게) */
      var src = ctx.createBufferSource(); src.buffer = buf;
      var gn = ctx.createGain(); gn.gain.value = o.gain == null ? 1 : o.gain;
      src.connect(gn); gn.connect(o.direct ? ctx.destination : nd.bus[bus]);
      if (o.direct) gn.gain.value *= curve(vol.sfx_ui);
      var t = Math.max(now() + 0.01, at);
      if (beat && !at) t = nextBeat(t);
      if (resv) {   /* 제 예약을 실제로 걸리는 자리로: 이미 걸린 것과 겹치면 그 뒤로 (받기가 늦었으면 박에 맞춰) */
        var late = t > at + 0.02;
        resv.s = resv.e = -1; t = fitEv(t, buf.duration, late && beat, beat, true);
        evQ.push({ s: t, e: t + buf.duration, fixed: true });
      }
      if (!o.direct) {
        if (s.pause_bgm) pauseBgm(t, buf.duration);
        else if (s.duck_db < 0) duck(s.duck_db, t, buf.duration, s.duck_attack_ms, s.duck_release_ms);
      }
      var rec = { src: src, gn: gn, end: t + buf.duration, direct: !!o.direct };   /* 끌 때 같이 멈춘다 (안 그러면 suspend 에 얼었다가 다음에 켤 때 울린다) */
      live.push(rec);
      src.onended = function () { try { gn.disconnect(); } catch (e) { /* noop */ } var i = live.indexOf(rec); if (i >= 0) live.splice(i, 1); };
      src.start(t);
      var end = t + buf.duration;
      if (bus === 'sfx_event') evEnd = Math.max(evEnd, end);
      note(id, t);
      return end;
    }).catch(function (e) { if (resv) resv.s = resv.e = -1; warn('소리 파일을 못 틀었어 (' + id + ')', e); return 0; });   /* 못 튼 징글 자리는 비운다 */
    if (bus === 'sfx_event') evP = p;   /* 말풍선 음절은 이게 자리 잡은 뒤에 (처음 받는 기웃 결과음과 겹치지 않게) */
    if (queued) evChain = p;
    return p;
  }
  /* 덕킹: bgm 을 duck_db, amb 를 그 절반만큼 내렸다가 끝에서 놓는다. 겹치면 더 깊은 쪽 · 더 늦게 끝나는 쪽 */
  function duck(db, t, dur, atkMs, relMs) {
    var atk = Math.min(80, Math.max(60, atkMs || 70)) / 1000, rel = Math.min(900, Math.max(500, relMs || 750)) / 1000, end = t + Math.max(0.1, dur - 0.15);   /* README §4: 어택 60~80 ms · 릴리스 0.5~0.9 s 밖으로 나가지 않게 */
    var deep = now() < duckInfo.until ? Math.min(duckInfo.db, db) : db;
    duckInfo.db = deep; duckInfo.until = Math.max(duckInfo.until, end); duckInfo.lastDb = db; duckInfo.lastAt = Math.round(t * 1000) / 1000;
    if (now() >= pauseUntil) setDuck(nd.duckBgm.gain, dbg(deep), t, atk, duckInfo.until, rel);
    setDuck(nd.duckAmb.gain, dbg(deep / 2), t, atk, duckInfo.until, rel);
  }
  function setDuck(p, lv, t, atk, until, rel) { try { p.cancelScheduledValues(t); p.setTargetAtTime(lv, t, atk / 3); p.setTargetAtTime(1, until, rel / 3); } catch (e) { /* noop */ } }
  /* 방 완성: BGM 일시정지 → room_complete → 같은 곡을 처음부터 (bgm_resume: next_phrase) */
  var pauseFrom = 0;
  function pauseBgm(t, dur) {
    pauseUntil = t + dur; pauseFrom = t;
    duckInfo.lastDb = -99; duckInfo.lastAt = Math.round(t * 1000) / 1000;
    try { var p = nd.duckBgm.gain, a = Math.max(now(), t - 0.08); p.cancelScheduledValues(a); p.setTargetAtTime(0.0001, a, 0.03); } catch (e) { /* noop */ }
    setDuck(nd.duckAmb.gain, dbg(-4.5), t, 0.07, t + dur, 0.9);
    clearTimeout(pauseTimer);
    pauseTimer = setTimeout(guard(resumeAfterPause), Math.max(0, (t + dur - now()) * 1000) + 150);
  }
  function resumeAfterPause() {
    pauseUntil = 0;
    if (!active()) return;
    var t = now() + 0.1, cur = slots.bgm;
    try { var p = nd.duckBgm.gain; p.cancelScheduledValues(now()); p.setValueAtTime(0.0001, now()); p.setTargetAtTime(1, t, 0.03); } catch (e) { /* noop */ }
    /* 멈춰 있던 곡만 처음부터 (그사이 예약된 자장가 등은 그대로 — 바퀴 수 타이머가 그 노드를 본다) */
    if (cur && !cur.dead && byId[cur.id] && cur.started < pauseFrom && gs.sleepPhase !== 'lullaby') startSlot('bgm', cur.id, { at: t, fade: 1.2, xfade: 0.05 });
    else applyBgm();
  }

  /* ───────────────────────── 루프 자리 (bgm · amb · layer · warm · season) ───────────────────────── */
  function epCurve(lv) { var a = new Float32Array(33); for (var i = 0; i <= 32; i++) a[i] = lv * Math.sin(i / 32 * Math.PI / 2); return a; }
  function fadeIn(g, t, dur, lv) {
    try {
      if (dur > 0.25) g.gain.setValueCurveAtTime(epCurve(lv), t, dur);   /* 등전력 (sin) */
      else { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(lv, t + Math.max(0.02, dur)); }
    } catch (e) { try { g.gain.value = lv; } catch (x) { /* noop */ } }
  }
  function fadeOut(n, t, dur) {
    if (!n || n.dead) return;
    n.dead = true;
    t = Math.max(t || 0, now()); dur = Math.max(0.05, dur || 0.05);
    if (n.endT) { if (t >= n.endT) return; dur = Math.min(dur, Math.max(0.05, n.endT - t)); }   /* 한 바퀴 끝(집 테마)을 넘겨 여유분까지 틀지 않게 */
    var p = n.g.gain;
    try {
      if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t); else { p.cancelScheduledValues(t); p.setValueAtTime(n.level || 1, t); }
      p.setTargetAtTime(0, t, dur / 3.5);
    } catch (e) { try { p.value = 0; } catch (x) { /* noop */ } }
    try { n.src.stop(t + dur + 0.1); } catch (e) { /* 이미 멈춤 */ }
  }
  var loading = {};   /* 자리마다 불러오는 중인 것 (그사이 틱이 같은 자리를 또 채우지 않게) */
  function startSlot(slot, id, o) {
    o = o || {};
    var tok = {}; want[slot] = tok;
    var s = byId[id];
    if (!s || !ctx) { loading[slot] = null; return Promise.resolve(null); }
    loading[slot] = id;
    return load(id).then(function (buf) {
      if (want[slot] === tok) loading[slot] = null;
      if (want[slot] !== tok || !active()) return null;
      var src = ctx.createBufferSource(); src.buffer = buf;
      var lp = s.loop && s.loop.end > s.loop.start ? s.loop : null;
      var looping = !!lp && !(slot === 'bgm' && s.kind === 'bgm');   /* 집 테마는 한 바퀴 → 쉼 → 처음부터 */
      if (looping) { src.loop = true; src.loopStart = lp.start; src.loopEnd = Math.min(lp.end, buf.duration); }
      var g = ctx.createGain(); g.gain.value = 0;
      src.connect(g); g.connect(nd.bus[slot === 'bgm' ? 'bgm' : 'amb']);
      var t = Math.max(now() + 0.03, o.at || 0);
      var base = lp ? lp.start : 0, off = num(o.offset) ? o.offset : base;
      /* 마디선 전환인데 디코드가 늦었다: 지금 곡의 다음 마디선으로 (README §4). 같은 곡 다른 옷이면 그만큼 마디를 건너 이어 탄다 */
      if (o.bar && o.at && t > o.at + 0.005) {
        var cb = slots.bgm && !slots.bgm.dead && slots.bgm.s.bar_sec, t2 = nextBar(t);
        if (num(o.offset) && cb && s.bar_sec) { off += Math.round((t2 - o.at) / cb) * s.bar_sec; if (lp && off > lp.end - 4 * s.bar_sec) off = base; }
        t = t2;
      }
      if (off >= buf.duration - 0.25) off = base;
      src.start(t, off);
      var lv = o.gain == null ? 1 : o.gain;
      fadeIn(g, t, o.fade == null ? 0.05 : o.fade, lv);
      var endT = 0;
      if (lp && !looping) {   /* 집 테마 한 바퀴 = loop.end 까지. 뒤 1초(이음새 여유분 = 마디 1 복사)는 틀지 않고 끝에서 살짝 닫는다 */
        endT = t + (Math.min(lp.end, buf.duration) - off);
        try { g.gain.setTargetAtTime(0, Math.max(t + (o.fade || 0.05) + 0.01, endT - 0.35), 0.1); } catch (e) { /* noop */ }
        try { src.stop(endT); } catch (e) { /* noop */ }
      }
      var old = slots[slot];
      if (old) fadeOut(old, t, o.xfade == null ? (o.fade || 0.05) : o.xfade);
      var n = { id: id, s: s, src: src, g: g, level: lv, t0: t - (off - base), started: t, band: band, slot: slot, dead: false, endT: endT };
      if (s.kind === 'place' && s.bar_sec) n.minUntil = t + (s.min_stay_bars || 8) * s.bar_sec;   /* 장소는 최소 8마디 */
      if (slot === 'bgm' && s.kind === 'bgm') src.onended = guard(function () { if (slots.bgm === n) { slots.bgm = null; startRest(s); } });
      slots[slot] = n;
      if (slot === 'bgm') trimUpdate(t, id);
      return n;
    }).catch(function (e) { if (want[slot] === tok) { want[slot] = null; loading[slot] = null; } warn('루프를 못 틀었어 (' + id + ')', e); return null; });
  }
  function stopSlot(slot, fade) { want[slot] = null; loading[slot] = null; if (slots[slot]) { fadeOut(slots[slot], now(), fade); slots[slot] = null; } }

  /* ───────────────────────── 쉼 (rest_after_sec) ───────────────────────── */
  function startRest(s) {
    clearRest();
    var r = (s && Array.isArray(s.rest_after_sec) && s.rest_after_sec.length === 2) ? s.rest_after_sec : [20, 90];
    var sec = r[0] + rnd() * (r[1] - r[0]);
    rest = { until: now() + sec, timer: setTimeout(guard(function () { rest = null; applyBgm(); }), sec * 1000) };
  }
  function clearRest() { if (rest) { clearTimeout(rest.timer); rest = null; } }

  /* ───────────────────────── BGM: 지금 무엇이어야 하나 ───────────────────────── */
  function homeId() {
    var hb = (mp().home_bgm || {})[band] || (mp().home_bgm || {}).day || {};
    var id = hb[wx] || hb.rain;
    return has(id) ? id : null;
  }
  function placeId(key) {
    if (key === 'letter_room') return null;   /* 편지의 방: BGM 없이 (징글 한 번 + 환경음) */
    var pl = mp().places || {};
    var id = pl[key]; if (!has(id)) id = pl.wild;   /* 없거나 못 받은 곡이면 들판 테마로 */
    return has(id) ? id : null;
  }
  function lullId() { var id = ev(['sleep', 'bgm']) || 'special_lullaby'; return has(id) ? id : null; }
  function desired() {
    if (!M) return null;
    if (gs.sleeping) {
      if (gs.sleepPhase === 'lullaby') return lullId();
      if (gs.sleepPhase !== 'home') return null;   /* 자장가 뒤: 환경음만 (밤엔 아침까지) */
    }
    if (gs.away || gs.departing) {
      if (gs.placeKey !== undefined) return placeId(gs.placeKey);
      return rest ? null : homeId();            /* 첫 기웃 전: 집 테마 -3 dB (빈 방) */
    }
    if (gs.stayWindow && (wx === 'rain' || wx === 'drizzle')) { var w = ev(['stay_home_window', wx]); if (has(w)) return w; }
    return rest ? null : homeId();
  }
  /* 빈 방 트림: 나가 있는 동안 집 테마만 -3 dB. 장소 테마로 바뀌는 순간(크로스페이드 시작)에 0 dB 로 */
  function trimUpdate(at, id) {
    if (!ctx || !nd.trim) return;
    if (id === undefined) id = slots.bgm && !slots.bgm.dead ? slots.bgm.id : null;
    target(nd.trim.gain, (gs.away || gs.departing) && isHome(id) ? dbg(-3) : 1, Math.max(now(), at || 0), 0.4);
  }
  function cancelPend() { if (pend) { clearTimeout(pend.timer); pend = null; } }
  function schedule(id, at, fn) {
    if (id) load(id).catch(noop);   /* 마디선까지 미리 받아 둔다 */
    var ms = Math.max(0, (at - now() - 0.3) * 1000);
    pend = { id: id, at: at, timer: setTimeout(guard(function () {
      pend = null;
      if (!active()) return;
      fn(Math.max(at, now() + 0.05));
    }), ms) };
  }
  /* o: delay · phrase (귀가: 다음 프레이즈) · now */
  function applyBgm(o) {
    o = o || {};
    if (!active()) return;
    trimUpdate();
    if (gs.sleeping && gs.sleepPhase === 'lullaby') return;   /* 자장가는 startLullaby 가 맡는다 */
    if (now() < pauseUntil) return;                             /* 방 완성 팡파르 중 */
    var w = desired(), cur = slots.bgm && !slots.bgm.dead ? slots.bgm : null, curId = cur ? cur.id : null;
    if (w === curId) { cancelPend(); return; }
    if (w && loading.bgm === w) return;   /* 곧 시작한다 (받는 중 — 지금 곡이 있어도 같은 곡을 또 걸지 않게) */
    if (pend && pend.id === w) return;
    cancelPend();
    var t = now() + 0.05;
    if (!cur) { if (w) startSlot('bgm', w, { at: t + (o.delay || 0), fade: o.fade || 1.5 }); return; }
    if (isHome(curId) && isHome(w) && cur.band !== band && !gs.skipping) { bandChange(w); return; }
    var bar = cur.s.bar_sec || 2, at;
    if (gs.skipping || o.now) at = t;
    else {
      at = nextBar(t + 0.1);
      if (cur.minUntil && at < cur.minUntil) at = nextBar(cur.minUntil - 0.01);
      if (o.phrase) at = Math.max(at, nextPhrase(t + 0.1));
    }
    var xf = gs.skipping ? 1 : bar;
    var onBar = !(gs.skipping || o.now);
    schedule(w, at, function (at2) {
      var c = slots.bgm && !slots.bgm.dead ? slots.bgm : null;
      if (!w) { if (c) { fadeOut(c, at2, xf); slots.bgm = null; } want.bgm = null; loading.bgm = null; return; }
      if ((c && c.id === w) || loading.bgm === w) return;   /* 그사이 이미 시작했거나 받는 중 */
      var off;
      if (c && isHome(c.id) && isHome(w)) {   /* 같은 곡 다른 옷(날씨): 같은 마디에서 이어 탄다 */
        var nb = byId[w].bar_sec, idx = Math.round((at2 - c.t0) / (c.s.bar_sec || 3));
        if (nb && byId[w].loop) { off = byId[w].loop.start + idx * nb; if (off > byId[w].loop.end - 4 * nb) off = undefined; }
      }
      startSlot('bgm', w, { at: at2, fade: xf, xfade: xf, offset: off, bar: onBar });
    });
  }
  /* 시간대 경계: 지금 4마디 프레이즈 끝 → 2마디 페이드아웃 → 종 → 새 곡을 처음부터 */
  function bandChange(w) {
    var cur = slots.bgm, bar = (cur && cur.s.bar_sec) || 3;
    var at = nextPhrase(now() + 0.1), chime = ev(['events', 'time_of_day_change', band]);
    schedule(w, at, function (at2) {
      var c = slots.bgm && !slots.bgm.dead ? slots.bgm : null;
      if (c) { fadeOut(c, at2, 2 * bar); slots.bgm = null; }
      var ct = at2 + 2 * bar, cs = byId[chime];
      play(chime, { at: ct });
      startSlot('bgm', w, { at: ct + (cs ? cs.duration * 0.6 : 1.5), fade: 1 });
    });
  }

  /* ───────────────────────── 잠: settle → 자장가 2~3바퀴 → 4초 페이드 → 환경음만 ───────────────────────── */
  function startLullaby(live) {
    if (!active()) return;
    var lid = lullId(); if (!lid) return;
    cancelPend(); clearRest(); clearTimeout(lullTimer);
    gs.sleepPhase = 'lullaby';
    var cycles = 2 + (rnd() < 0.5 ? 0 : 1), t = now() + 0.05, at = t;
    if (live) {   /* 마무리 징글·등불이 끝난 뒤에 이불 소리 */
      var setId = ev(['sleep', 'settle']) || 'sleep_settle', ss = byId[setId];
      var st = Math.max(t, evEnd + 0.25);
      if (slots.bgm) { fadeOut(slots.bgm, t, (ss && ss.bgm_fade_out_s) || 3); slots.bgm = null; }
      play(setId, { at: st, always: true });
      at = st + (ss ? ss.duration : 1.1) + 0.3;
    }
    startSlot('bgm', lid, { at: at, fade: 2.5, xfade: 3 }).then(function (n) {
      if (!n) return;
      var L = n.s.loop ? n.s.loop.end - n.s.loop.start : n.src.buffer.duration;
      var end = n.started + cycles * L;
      lullTimer = setTimeout(guard(function () {
        if (slots.bgm !== n || gs.sleepPhase !== 'lullaby') return;
        fadeOut(n, now(), 4); slots.bgm = null;
        gs.sleepPhase = 'quiet';
        afterLullaby();
      }), Math.max(0, (end - 4 - now()) * 1000));
    });
  }
  /* 자장가 뒤 쉼: 밤이면 아침까지 빗소리만, 낮이면 쉼(20~90 s) 뒤 집 테마 */
  function afterLullaby() {
    var sec = 20 + rnd() * 70;
    clearTimeout(lullTimer);
    lullTimer = setTimeout(guard(function () {
      if (!gs.sleeping || gs.sleepPhase !== 'quiet') return;
      if (band !== 'night') { gs.sleepPhase = 'home'; applyBgm(); }
    }), sec * 1000);
  }

  /* ───────────────────────── 환경음: 날씨 바탕 + 덧층 + 등불 온기 + 계절 밤 ───────────────────────── */
  function ambIds() {
    var A = mp().ambience || {}, L = A.layers || {}, ids = {};
    var aw = (A.weather || {})[wx]; ids.amb = typeof aw === 'string' ? aw : aw && aw[band];
    ids.layer = wx === 'snow' ? L.snow : (wx === 'rain' || wx === 'drizzle') ? L[wx] : (band === 'night' ? L.clear_night : null);
    if (season === 'winter' && wx !== 'snow' && band !== 'night') ids.layer = L.winter;
    var lw = A.lantern_warmth || {}, n = lantern;
    ids.warm = (gs.away || gs.departing) ? null : n <= 0 ? null : n <= 3 ? lw['1-3'] : n <= 6 ? lw['4-6'] : lw['7-8'];   /* 등불 탁탁은 다락 안 소리 */
    ids.season = (band === 'night' && (wx === 'clear' || wx === 'drizzle')) ? ((A.season_night || {})[season] || null) : null;
    Object.keys(ids).forEach(function (k) { if (!ids[k] || !byId[ids[k]] || isBad(ids[k])) ids[k] = null; });
    return ids;
  }
  function applyAmb(first) {
    if (!active()) return;
    var ids = ambIds();
    ['amb', 'layer', 'warm', 'season'].forEach(function (k) {
      var cur = slots[k] && !slots[k].dead ? slots[k].id : null;
      if (cur === ids[k] || (ids[k] && loading[k] === ids[k])) return;
      if (!ids[k]) { stopSlot(k, first ? 1 : 6); return; }
      startSlot(k, ids[k], { fade: first ? 2.5 : 10, xfade: first ? 1 : 10 });   /* 날씨: 8~12 s 크로스페이드 */
    });
  }

  /* ───────────────────────── 1초 틱: 시간대 · 날씨 · 계절 · 등불 ───────────────────────── */
  function tick() {
    if (!active() || document.hidden) return;
    var ob = band, ow = wx, os = season, ol = lantern;
    readGame();
    if (band !== ob) {
      applyLevels(2);
      var cur = slots.bgm && !slots.bgm.dead ? slots.bgm : null;
      if (!(cur && isHome(cur.id))) play(ev(['events', 'time_of_day_change', band]));   /* 집 테마 중이면 bandChange 가 종을 울린다 */
      if (gs.sleeping && gs.sleepPhase === 'quiet' && band !== 'night') afterLullaby();
    }
    if (wx !== ow) play(ev(['events', 'weather_change']));
    if (band !== ob || wx !== ow || season !== os || lantern !== ol) applyAmb(false);
    applyBgm();
  }

  /* ───────────────────────── 말풍선 목소리 (README §3 표) ───────────────────────── */
  var VSET = { '보통': [['A4', 'C5', 'D5'], 60], '폴짝': [['C5', 'D5', 'F5', 'G5'], 50], '우쭐': [['C5', 'F5', 'A5'], 65], '덤덤': [['A4', 'C5'], 70], '졸림': [['F4', 'G4', 'A4'], 90] };
  var KIND_MOOD = { shout: '폴짝', happy: '우쭐', calm: '덤덤', whisper: '덤덤', sleep: '졸림', sleepy: '졸림' };
  function speak(text, mood, gain) {
    var set = VSET[mood] || VSET['보통'], notes = set[0], gap = set[1] / 1000;
    var syl = (text.match(/[\uAC00-\uD7A3]/g) || []).length;
    var seq = [], off = 0, k = 0;
    for (var i = 0; i < text.length && seq.length < 14; i++) {
      var c = text.charCodeAt(i);
      if (c < 0xAC00 || c > 0xD7A3) { if (/[.,!?…~]/.test(text.charAt(i))) off += gap * 3; continue; }
      k++;
      if (mood === '졸림' && k % 2 === 0) { off += gap; continue; }   /* 졸림: 두 글자에 하나 */
      var jung = Math.floor(((c - 0xAC00) % 588) / 28);
      var vow = jung >= 8 && jung <= 19 ? 'u' : 'a';   /* 둥근 모음(ㅗㅜㅡ…) = u */
      var nt = notes[(Math.imul(c, 2654435761) >>> 0) % notes.length];
      if (mood === '폴짝' && k >= syl - 1) nt = notes[notes.length - 1];   /* 끝 글자는 가장 높게 */
      if (byId['voice_' + vow + '_' + nt]) seq.push(['voice_' + vow + '_' + nt, off]);
      off += gap + 0.02;
    }
    if (!seq.length) return;
    var asked = now(), uniq = {};
    seq.forEach(function (x) { uniq[x[0]] = 1; });
    /* 음절 파일을 다 받은 뒤 한 번에 예약 → 처음 쓸 때도 리듬이 흐트러지지 않는다. 음절 받기가 너무 늦으면(0.8 s) 그 말은 건너뜀.
       방금 낸 이벤트 소리(기웃 결과음)가 아직 받는 중이면 그게 자리 잡을 때까지 (많아야 0.5 s) 기다렸다가 그 뒤에서 말한다 */
    var evWait = Promise.race([evP, new Promise(function (r) { setTimeout(r, 500); })]);
    Promise.all(Object.keys(uniq).map(load)).then(function () {
      if (now() - asked > 0.8) return;
      return evWait.then(guard(function () {
        if (!active()) return;
        var t = now() + 0.04;
        if (evEnd > t && evEnd - t < 0.6) t = evEnd + 0.03;   /* 기웃 결과음 바로 뒤에서 말한다 */
        seq.forEach(function (x) { play(x[0], { at: t + x[1], gain: gain }); });
      }));
    }).catch(noop);
  }

  /* ───────────────────────── 게임 이벤트 ───────────────────────── */
  function peekInfo(e, skip) {
    var tg = e.target || {}, st = PEEK_OK[e.status] ? e.status : 'failed';   /* 로그 행과 같은 규칙: 모르는 상태 = 못 읽음 */
    var node = tg.id && typeof WORLD !== 'undefined' && WORLD && WORLD.nodes ? WORLD.nodes[tg.id] : null;
    return { status: st, corner: (node && node.corner) || 'wild', roomId: tg.id || null, url: tg.kind === 'url', first: !!e.first && (st === 'read' || st === 'builtin'), skip: skip };
  }
  function placeKeyOf(d) { return d.url ? 'door_out' : (d.roomId && PLACE_ROOMS[d.roomId]) ? d.roomId : (d.corner || 'wild'); }
  function onPeek(d) {
    if (d.skip) gs.skipping = true;
    if (gs.skipping) return;   /* 건너뛰는 중: 소리 없이 곧장 집으로 */
    var st = PEEK_OK[d.status] ? d.status : 'failed';
    /* 정직: 결과음은 실제 상태 그대로 (다섯 개 모두 같은 길이·리듬). 처음 온 곳 징글은 읽음·책장 메모일 때만 */
    play(ev(['peek_status', st]));
    if (d.first && (st === 'read' || st === 'builtin')) play(ev(['events', 'first_place']), { at: now() + 0.35 });
    var key = placeKeyOf(d);
    if (key === 'letter_room') play('letter_room', { at: now() + 0.35 });
    if (gs.away || gs.departing) { gs.placeKey = key; trimUpdate(); applyBgm(); }
  }
  function onReturn() {
    gs.away = false; gs.departing = false; gs.left = false; gs.placeKey = undefined;
    if (active() && now() - returnAt > 8) { returnAt = now(); play(ev(['events', 'return']), { always: true }); }
    trimUpdate(); applyAmb(false); applyBgm({ phrase: true });
  }
  function rememberKey(e, trip) {
    var peeks = (trip.events || []).filter(function (x) { return x && x.type === 'peek'; });
    var p = peeks[e.stopIdx] || peeks[peeks.length - 1];
    return p ? placeKeyOf(peekInfo(p)) : 'wild';
  }
  function stayActivity() {
    if (!active()) return;
    var a = gs.stayAct, sa = ev(['events', 'stay_activities']) || {}, t = now() + 0.2;
    if (a === 'count_rain') { for (var i = 1; i <= 4; i++) play('stay_count_drops_' + i, { at: t + (i - 1) * 0.5 }); }
    else if (a === 'swap_posters' || a === 'rearrange') play(sa.tidy);
    else if (a && a !== 'nap' && a !== 'nothing') play(sa.hum);
  }
  function onRow(d) {
    var e = d.ev || {}, trip = d.trip || {};
    if (d.skip) gs.skipping = true;
    switch (e.type) {
      case 'peek': if (!d.outside) onPeek(peekInfo(e, !!d.skip)); return;
      /* 3D 에서 바깥에 나가 있었으면 앱이 바로 이어서 퇴장 의식(leave) → 귀가 의식(return)을 연다: 귀가 소리·집 BGM 은 문어가 실제로 돌아오는 귀가 의식에서.
         퇴장 의식은 이 훅과 같은 순간에 동기로 불리므로 한 틱 뒤에 보면 안다 (2D·건너뛰기·모션 감소는 의식이 없어 지금처럼 이 줄에서) */
      case 'return': setTimeout(guard(function () { if (!gs.leaving) onReturn(); }), 0); return;
      case 'depart': play(ev(['ui', 'log_line'])); return;
      case 'remember': play((ev(['remember_motif']) || {})[rememberKey(e, trip)] || 'remember_wild'); return;
      case 'hang_poster': if (trip.poster) play(ev(['events', 'hang_poster'])); return;
      case 'wrap_up': {
        var r = e.reaction || trip.reaction, m = r && ev(['moods', r]);
        if (m) { moodAt = now(); play(m); }   /* 기분 징글이 곧 문어 목소리 — 그 말풍선엔 블립을 얹지 않는다 */
        return;
      }
      case 'stay_home': {
        var ra = trip.receipt && trip.receipt.activity;
        var anchor = e.anchor || (ra && ra.anchor) || 'window';
        if (!STAY_ANCHORS[anchor] || (anchor === 'crate' && lantern + 1 < 2)) anchor = 'window';   /* app.js sceneFor 와 같은 규칙: 모르는 자리 · 등불 2칸 전 상자 = 창가 (앱은 commitTrip 으로 한 칸 올린 뒤에 본다) */
        gs.stayAct = e.activity || (ra && ra.id) || null;
        gs.stayWindow = anchor === 'window';
        if (active() && !gs.skipping) {   /* 같은 움츠림, 다른 결말 */
          var t = now(), lead = 0;
          if (!gs.wound) { gs.wound = true; play(ev(['events', 'stay_home', 0]) || 'depart_windup'); lead = 0.8; }   /* 이번 차례에 아직 안 움츠렸으면 (이벤트 재생) */
          play(ev(['events', 'stay_home', 1]) || 'stay_settle', { at: t + lead + 0.02 });
        }
        applyBgm();
        return;
      }
      case 'empty_turn': play(ev(['events', 'empty_turn'])); return;
      default: return;
    }
  }
  function onState(d) {
    var st = d.state, prev = gs.st;
    gs.st = st;
    if (st === 'anticipate') { gs.wound = true; gs.left = false; if (!d.skip) play(ev(['events', 'depart', 0])); }   /* 움츠림 600 ms + 멈춤 200 ms = depart_windup 0.8 s */
    if (st === 'away') {
      if (!gs.away) {
        gs.away = true; gs.departing = false;
        if (!gs.left && !d.skip) play(ev(['events', 'depart', 1]));   /* 의식 없이 나간 경우 (건너뛰기 없는 2D·데모) — 나가는 소리는 한 번만 */
        gs.left = true;
        trimUpdate(); applyAmb(false); applyBgm();
      }
    } else if (st !== 'walk') {
      gs.departing = false;
      if (gs.away) { gs.away = false; gs.placeKey = undefined; trimUpdate(); applyAmb(false); applyBgm({ phrase: true }); }
    }
    if (st === 'sleep' && prev !== 'sleep') {
      gs.sleeping = true; gs.stayWindow = false; gs.placeKey = undefined;
      if (active()) startLullaby(prev != null); else gs.sleepPhase = null;
    } else if (prev === 'sleep' && st !== 'sleep') {
      gs.sleeping = false; gs.sleepPhase = null; clearTimeout(lullTimer); clearRest(); applyBgm();
    }
    if (st === 'stay') stayActivity();
  }
  function onCeremony(d) {
    if (d.kind === 'depart') {
      gs.departing = true; gs.placeKey = undefined;
      if (d.skip) gs.skipping = true;
      if (active() && !gs.skipping && !gs.left) {
        var t = now(), lead = 0;
        if (!gs.wound) { gs.wound = true; play(ev(['events', 'depart', 0])); lead = 0.8; }   /* 이벤트 재생·데모: 움츠림부터 (초대는 계획이 오래 걸려도 이미 움츠렸다) */
        play(ev(['events', 'depart', 1]), { at: t + lead + 0.02 });
        if (wx === 'rain' || wx === 'drizzle') play(ev(['events', 'depart_rain_extra']), { at: t + lead + 0.2 });
      }
      gs.left = true;
      trimUpdate(); applyAmb(false); applyBgm();
    } else if (d.kind === 'leave') gs.leaving = true;
    else if (d.kind === 'return') { gs.leaving = false; onReturn(); }
  }
  function onBubble(d) {
    var text = String(d.text || '');
    if (!text || !active() || gs.skipping) return;
    var t = now();
    if (/zZ/.test(text)) { if (t - lastSnore > 6) { lastSnore = t; play(ev(['sleep', 'snore'])); } return; }
    if (text.replace(/\s/g, '') === '?') { play(ev(['interaction', 'look'])); return; }
    if (d.kind === 'think') return;            /* 생각 말풍선은 소리 내지 않는다 */
    if (t - moodAt < 1.5) return;
    var syl = (text.match(/[가-힣]/g) || []).length;
    if (!syl || syl > 28 || t - lastSpeak < 0.7) return;   /* 아주 긴 글은 블립 없이 */
    lastSpeak = t;
    speak(text, KIND_MOOD[d.kind] || '보통', d.kind === 'whisper' ? 0.55 : 1);
  }
  function onPet() {
    if (!active()) return;
    var t = now();
    if (t - petT > 1.5) { petN = 0; play('pet_squish'); }
    petT = t; petN = Math.min(petN + 1, 5);
    play('pet_stroke_' + petN, { at: t + 0.06 });
    if (petN === 4) play('pet_happy', { at: t + 0.3 });
  }
  function onLantern(d) {
    var n = Math.max(0, Math.min(8, d.n | 0));
    lantern = n;
    /* 7칸까지 F장조 한 칸씩, 8칸 = 방 완성. 한 틱 뒤에: 같은 순간의 귀가 줄(한 틱 미룸)이 먼저 줄을 서게 (귀가 → 등불) */
    if (active() && n >= 1) setTimeout(guard(function () { play(n >= 8 ? ev(['events', 'lantern_8']) : ev(['events', 'lantern', String(n)]), { always: true }); }), 0);
    tick();   /* 6·7·8칸에서 날씨가 바뀐다 */
  }
  function onBusy(d) {
    gs.skipping = false; gs.wound = false;   /* 움츠림은 한 차례에 한 번 (초대는 busy 를 켠 뒤에 움츠린다) */
    if (gs.leaving) { gs.leaving = false; if (!d.on && (gs.away || gs.departing)) onReturn(); }   /* 퇴장 의식 뒤 귀가 의식이 안 왔다 */
    if (!d.on) { gs.stayWindow = false; gs.stayAct = null; applyBgm(); }
  }
  function on(name, d) {
    try {
      d = d || {};
      switch (name) {
        case 'state': onState(d); break;
        case 'bubble': onBubble(d); break;
        case 'pet': onPet(); break;
        case 'ceremony': onCeremony(d); break;
        case 'peek': onPeek(d); break;
        case 'row': onRow(d); break;
        case 'lantern': onLantern(d); break;
        case 'busy': onBusy(d); break;
        case 'room_sheet': roomSheet(d.frag); break;
        default: break;
      }
    } catch (e) { warn('on(' + name + ')', e); }
  }

  /* ───────────────────────── 켜기 · 끄기 ───────────────────────── */
  function start(fromUser) {
    var c = ensureCtx();
    if (!c) { paint(); if (fromUser) tellUnavailable(); return; }
    try { var r = c.resume(); if (r && r.catch) r.catch(noop); } catch (e) { /* noop */ }
    if (!fmt) fmt = pickFmt();
    if (!started) { starting = true; paint(); }
    loadManifest().then(guard(function (ok) {
      starting = false;
      if (!ok) { reason = reason || 'manifest'; paint(); if (fromUser) tellUnavailable(); return; }
      if (!pref.on || started) { paint(); return; }
      started = true;
      readGame();
      applyLevels(0.15);
      /* 방 완성 팡파르 중에 껐다 켰으면 BGM 덕킹이 0 에 남아 있다 (일시정지를 풀 타이머는 끌 때 지웠다) */
      if (nd.duckBgm) { target(nd.duckBgm.gain, 1, now(), 0.05); target(nd.duckAmb.gain, 1, now(), 0.05); }
      duckInfo.until = 0; duckInfo.db = 0;
      if (fromUser) play(ev(['ui', 'audio_on']));
      applyAmb(true);
      if (gs.sleeping) startLullaby(false); else applyBgm({ delay: fromUser ? 0.45 : 0 });
      clearInterval(tickTimer); tickTimer = setInterval(guard(tick), 1000);
      clearTimeout(warmTimer); warmTimer = setTimeout(guard(warmVoices), 2500);   /* BGM·환경음을 먼저 받고 나서 */
      if (ctx && ctx.state === 'running') disarm(); else armIfStuck();   /* 아직 멈춰 있으면 다음 탭에서 깨운다 */
      paint();
    }));
  }
  /* 말풍선 음절 16개 + 기웃 결과음 11개 (다 합쳐 56 KB) 를 한 번에 미리. 산책마다 몇 번씩 나는 작은 소리라 처음 받는 지연이 그대로 들렸다
     (음절은 0.8 s 넘으면 말을 건너뛰고, 결과음이 늦으면 음절과 겹친다). 하나씩 차례로 받으면 메인 스레드가 바쁜 기기에선 몇 초씩 걸렸다.
     + 차례 첫 소리 움츠림·나감·앉음 6개와 끄는 소리 2개 (46 KB): 움츠림이 늦게 오면 나감 소리와 겹쳤고, 끄는 소리가 늦으면 멈춘 뒤라 버려진다 */
  var warmTimer = null;
  function warmVoices() {
    if (!active()) return;
    var ids = (groups.voice_a || []).concat(groups.voice_u || []);
    Object.keys(PEEK_OK).forEach(function (k) { ids = ids.concat(groups[ev(['peek_status', k])] || []); });
    [ev(['events', 'depart', 0]), ev(['events', 'depart', 1]), ev(['events', 'stay_home', 1]), ev(['ui', 'toggle_off'])].forEach(function (x) { if (x) ids = ids.concat(groups[x] || (byId[x] ? [x] : [])); });
    ids.forEach(function (id) { if (!cache[id]) load(id).catch(noop); });
  }
  function stopAll() {
    started = false; starting = false;
    clearInterval(tickTimer); tickTimer = null; cancelPend(); clearRest(); clearTimeout(lullTimer); clearTimeout(pauseTimer); clearTimeout(warmTimer); pauseUntil = 0;
    gs.sleepPhase = null;
    shots = []; evQ = []; evEnd = 0; evChain = Promise.resolve(0);
    if (!ctx || !nd.master) return;
    var t0 = now();
    target(nd.master.gain, 0, t0, 0.08);
    /* 자리마다 제 크기로 닫는다 (마스터만 믿으면 금방 다시 켤 때 옛 곡이 되살아났다가 뚝 끊긴다) */
    Object.keys(slots).forEach(function (k) { want[k] = null; loading[k] = null; if (slots[k]) { fadeOut(slots[k], t0, 0.25); slots[k] = null; } });
    /* 한 번짜리 소리(징글·예약된 종·음절)도 멈춘다 — 안 그러면 suspend 에 얼어 있다가 다음에 켤 때 울린다. 끄는 소리(direct)만 끝까지 */
    live = live.filter(function (x) {
      if (x.direct) return true;
      try { x.gn.gain.cancelScheduledValues(t0); x.gn.gain.setTargetAtTime(0, t0, 0.03); x.src.stop(t0 + 0.2); } catch (e) { /* noop */ }
      return false;
    });
    suspendSoon(600);
  }
  function suspendSoon(ms) {
    setTimeout(guard(function () {
      if (pref.on || !ctx || ctx.state !== 'running') return;
      var e = 0; live.forEach(function (x) { if (x.direct) e = Math.max(e, x.end); });
      if (e > now() + 0.02) { suspendSoon((e - now()) * 1000 + 80); return; }   /* 끄는 소리가 끝난 뒤에 */
      ctx.suspend().catch(noop);
    }), ms);
  }
  function setEnabled(on, fromUser) {
    try {
      on = !!on;
      if (on && reason === 'manifest') { reason = ''; toldFile = false; }   /* 목록을 한 번 못 읽은 건 다시 해 본다 (흔들리는 모바일 망) */
      if (on === pref.on && (!on || started)) { paint(); return; }
      pref.on = on; savePref(); paint();
      if (!on) {
        if (ctx && M && ctx.state === 'running') play(ev(['ui', 'toggle_off']), { direct: true });
        stopAll(); disarm(); return;
      }
      if (reason) { if (fromUser) tellUnavailable(); return; }
      start(!!fromUser);
    } catch (e) { warn('setEnabled', e); }
  }
  /* 켜 둔 채 새로고침: 첫 사용자 동작에서 다시 흐른다 (그 전엔 요청도 소리도 없음) */
  var UNLOCK = ['pointerup', 'keydown', 'touchend', 'mousedown'];
  function onUnlock(e) {
    if (!pref.on || reason) { disarm(); return; }
    if (e && e.target && e.target.closest && e.target.closest('#btn-sound')) return;
    if (started && ctx && ctx.state === 'running') { disarm(); return; }
    if (started && ctx) { try { ctx.resume().catch(noop); } catch (x) { /* noop */ } return; }
    start(false);
  }
  var unlockFn = guard(onUnlock);
  /* 동작 밖의 resume() 은 막히면 약속이 끝나지 않을 수도 있어서(자동재생 정책) 잠시 뒤 상태로 본다 */
  function armIfStuck() {
    setTimeout(guard(function () { if (ctx && ctx.state !== 'running' && ctx.state !== 'closed' && pref.on && !reason && !document.hidden) arm(); }), 400);
  }
  function arm() { if (armed) return; armed = true; UNLOCK.forEach(function (n) { document.addEventListener(n, unlockFn, true); }); paint(); }
  function disarm() { if (!armed) return; armed = false; UNLOCK.forEach(function (n) { document.removeEventListener(n, unlockFn, true); }); paint(); }

  /* ───────────────────────── 화면: 토글 · 안내 · 방 보기 ───────────────────────── */
  function noteText() {
    if (reason === 'file') return '파일로 열면(file://) 브라우저가 소리 파일을 못 읽게 막아서 조용해. 웹 주소로 열면 들려.';
    if (reason === 'no-webaudio' || reason === 'no-fetch') return '이 브라우저는 소리를 못 내. 소리 없이도 다 할 수 있어.';
    if (reason === 'manifest') return '소리 목록을 못 읽었어. 소리 없이 계속할게.';
    return isLit() ? '등불 옆 스피커를 누르면 꺼져.' : '소리는 꺼진 채로 시작해. 등불 옆 스피커를 누르면 켜져.';
  }
  function tellUnavailable() {
    if (toldFile) return; toldFile = true;
    var t = document.getElementById('toast'); if (!t) return;
    t.textContent = reason === 'file' ? '파일로 열면 소리를 못 틀어. 웹 주소로 열면 들려' : noteText();
    t.classList.add('show');
    setTimeout(function () { if (t.textContent && /소리/.test(t.textContent)) t.classList.remove('show'); }, 2800);
  }
  /* 토글은 지금 들리는 대로: 켜 둔 채 새로고침했거나 iOS 가 멈춰 둬서 탭을 기다리는 동안(armed)은 '소리 켜기' (누르면 켜진다).
     켜는 중(starting)·소리를 못 내는 곳(reason — 기억은 켜짐)은 눌린 채 */
  function isLit() { return pref.on && (!!reason || starting || !armed); }
  function paint() {
    if (!btn) return;
    var lit = isLit();
    var lab = lit ? '소리 끄기' : '소리 켜기';
    btn.setAttribute('aria-pressed', lit ? 'true' : 'false');
    btn.setAttribute('aria-label', lab);
    btn.title = reason ? lab + ' · ' + noteText() : lab;
    btn.classList.toggle('na', !!reason);
    var n = document.getElementById('rs-sound-note'); if (n) n.textContent = noteText();
  }
  function bindButton() {
    btn = document.getElementById('btn-sound');
    if (!btn) return;
    btn.addEventListener('click', guard(function (e) {
      if (e) e.preventDefault();
      if (pref.on && !isLit()) {   /* 탭을 기다리던 중('소리 켜기'로 보임) → 이 탭이 첫 동작: 다시 흐르게 */
        if (started && ctx) { try { ctx.resume().catch(noop); } catch (x) { /* noop */ } } else start(true);
        return;
      }
      setEnabled(!pref.on, true);
    }));
    paint();
  }
  function el(tag, attrs, text) {
    var x = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === 'class') x.className = attrs[k]; else x.setAttribute(k, attrs[k]); });
    if (text != null) x.textContent = text;
    return x;
  }
  function slider(label, key, id) {
    var row = el('label', { class: 'set snd-row', for: id });
    var inp = el('input', { type: 'range', id: id, min: '0', max: '100', step: '5', class: 'snd-range', 'aria-label': label + ' 크기' });
    inp.value = String(Math.round(pref[key] * 100));
    var out = el('output', { class: 'snd-val', for: id, 'aria-hidden': 'true' }, inp.value);
    function fill() { inp.style.setProperty('--fill', inp.value + '%'); out.textContent = inp.value; }
    inp.addEventListener('input', guard(function () { fill(); setVolume(key, +inp.value / 100); }));
    inp.addEventListener('change', guard(function () { savePref(); if (key === 'sfx') play(ev(['ui', 'tap'])); }));
    fill();
    row.appendChild(el('span', null, label)); row.appendChild(inp); row.appendChild(out);
    return row;
  }
  function roomSheet(frag) {
    if (!frag || typeof frag.appendChild !== 'function') return;
    frag.appendChild(el('h3', { id: 'rs-sound' }, '소리'));
    frag.appendChild(slider('음악', 'music', 'set-music'));
    frag.appendChild(slider('효과음', 'sfx', 'set-sfx'));
    frag.appendChild(el('p', { class: 'help snd-note', id: 'rs-sound-note' }, noteText()));
  }
  function bindClicks() {
    /* 주요 버튼의 작은 소리 (sfx_ui). 다녀와(움츠림 징글)·스피커(자기 소리)·장면 안은 빼고 */
    document.addEventListener('click', guard(function (e) {
      if (!active()) return;
      var b = e.target && e.target.closest ? e.target.closest('button, summary') : null;
      if (!b || b.disabled || b.closest('#scene')) return;
      var id = b.id, U = mp().ui || {};
      if (id === 'btn-sound' || id === 'btn-go') return;
      if (id === 'btn-look') play(U.sheet_open);
      else if (id === 'rs-close' || id === 'pd-close') play(U.sheet_close);
      else if (id === 'pd-flip' || id === 'pd-front') play(U.card_flip);
      else if (b.classList.contains('pcard')) play(U.album_open);
      else play(U.tap);
    }), true);
  }
  function bindVisibility() {
    document.addEventListener('visibilitychange', guard(function () {
      if (!ctx) return;
      if (document.hidden) { if (ctx.state === 'running') ctx.suspend().catch(noop); }
      else if (pref.on && !reason) { ctx.resume().catch(noop); armIfStuck(); }   /* 켜는 중에 숨겼다 돌아와도. 동작 없이는 안 풀리면(iOS) 다음 탭에서 */
    }));
  }

  /* ───────────────────────── 공개 ───────────────────────── */
  function setVolume(bus, v) {
    try {
      v = c01(+v || 0);
      if (bus === 'music' || bus === 'bgm' || bus === 'amb') { if (bus === 'music') pref.music = v; else vol[bus] = v; if (bus === 'music') syncVol(); }
      else if (bus === 'sfx' || bus === 'sfx_event' || bus === 'sfx_ui' || bus === 'voice') { if (bus === 'sfx') { pref.sfx = v; syncVol(); } else vol[bus] = v; }
      else return;
      if (bus === 'music' || bus === 'sfx') savePref();
      applyLevels(0.05);
    } catch (e) { warn('setVolume', e); }
  }
  function init(opts) {
    try {
      opts = opts || {};
      ['hour', 'weather', 'lantern', 'season'].forEach(function (k) { if (typeof opts[k] === 'function') game[k] = opts[k]; });
      if (typeof opts.base === 'string') BASE = opts.base;
      readGame();
      if (inited) return api;
      inited = true;
      loadPref(); syncVol();
      rnd = mulberry32(hashStr('ppolppol-audio|' + todayKey()));
      bindButton(); bindClicks(); bindVisibility();
      if (pref.on && !reason) arm();
    } catch (e) { warn('init', e); }
    return api;
  }
  function state() {
    try { return snapshot(); } catch (e) { warn('state', e); return { enabled: pref.on, available: !reason, reason: reason || null, started: started, played: [] }; }
  }
  function snapshot() {
    var b = slots.bgm && !slots.bgm.dead ? slots.bgm : null;
    return {
      enabled: pref.on, available: !reason, reason: reason || null, started: started, ctx: ctx ? ctx.state : 'none', fmt: fmt,
      bgm: b ? b.id : null, pending: pend ? pend.id : null, want: active() ? desired() : null,
      amb: ['amb', 'layer', 'warm', 'season'].map(function (k) { return slots[k] && !slots[k].dead ? slots[k].id : null; }).filter(Boolean),
      band: band, weather: wx, season: season, lantern: lantern,
      away: gs.away, departing: gs.departing, place: gs.placeKey === undefined ? null : gs.placeKey, sleeping: gs.sleeping, sleepPhase: gs.sleepPhase,
      resting: !!rest, skipping: gs.skipping, paused: now() < pauseUntil,
      duck: nd.duckBgm ? Math.round(nd.duckBgm.gain.value * 1000) / 1000 : 1, lastDuck: { db: duckInfo.lastDb, at: duckInfo.lastAt },
      master: nd.master ? Math.round(nd.master.gain.value * 1000) / 1000 : 0, time: Math.round(now() * 1000) / 1000,
      played: played.slice(), requests: requests, music: pref.music, sfx: pref.sfx,
      cached: Object.keys(cache).length, cacheMB: Math.round(cacheBytes / 1048576)
    };
  }
  var api = {
    init: init, on: on,
    setEnabled: function (b) { setEnabled(b, false); },
    enabled: function () { return pref.on; },
    setVolume: setVolume, state: state
  };
  /* app.js 가 없거나 init 을 안 불러도 토글은 동작하게 (init 은 여러 번 불러도 된다 — 뒤의 것이 게임 값 읽는 함수만 바꾼다) */
  window.addEventListener('load', function () { if (!inited) init({}); });
  return api;
})();
