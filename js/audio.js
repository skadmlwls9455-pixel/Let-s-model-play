/* ============================================================
   뽈뽈 문어 — js/audio.js (전역 AUDIO) · 소리 연결
   소리 한 벌은 audio/ (사운드 세션 소유 — 여기서는 읽기만). 연동 규칙은 audio/README.md §3·§4 와 audio/manifest.json 의 rules·map 그대로.
   참고 구현 audio/soundboard.html 의 덕킹·마디선 전환·말풍선 목소리 로직을 게임 상태에 맞게 옮겼다.

   - 꺼진 채로 시작한다 (브라우저 자동재생 정책 + 조용한 게임). 켜면 audio_on 한 번. 설정 = localStorage 'ppolppol_audio' { on, music, sfx }
     켜고 끄는 곳은 설정 시트 › 소리 칸 맨 위 '켜기' 체크 칸 (#set-sound, 화면 낭독기 이름 '소리 켜기' — 주인 11-08: 장면 위 스피커를 설정 안으로). 장면 위엔 소리 단추가 없다.
     켜 둔 채 새로고침하면 첫 탭(어디든)에서 다시 흐른다 — 사용자 동작 없이는 소리를 내지 않는다. 그렇게 탭을 기다리는 동안 체크 칸은 비어 있다 (들리는 대로).
   - 켜기 전에는 audio/ 에 요청을 하나도 보내지 않는다. 켠 뒤에도 지금 필요한 것만: 지금 BGM · 지금 환경음 · 효과음은 처음 쓸 때.
     예외 하나: 말풍선 음절(voice_*) 16개 + 기웃 결과음(peek_*) 11개 (파일 56 KB · 디코드 1 MB 미만) + 움츠림·나감·앉음·끄는 소리 8개(46 KB)는 켠 뒤 2.5초에 한꺼번에 미리 받는다 —
     음절을 처음 받는 데 0.8 s 넘게 걸리면 그 말을 통째로 건너뛰어서 느린 기기에선 첫 말풍선들이 조용했고, 결과음이 늦게 오면 음절과 겹쳤다.
     디코드된 버퍼는 작은 LRU (바이트 한도, 울리는 중인 것은 안 지움).
   - Web Audio 버스 다섯 bgm · amb · sfx_event · sfx_ui · voice → (bgm: 빈 방 트림 → 덕킹 → 부엌 덕킹) (amb: 덕킹 절반 → 부엌 덕킹 절반) → 마스터(밤 -3 dB) → 출력.
     징글의 duck_db 만큼 내리기만 한다 (어택 60~80 ms · 릴리스 0.5~0.9 s). 멈추는 건 방 완성(pause_bgm) 하나. 이벤트 징글은 서로 겹치지 않게 줄을 선다.
   - 못 받은 파일은 15 s → 30 s → … 10분 동안 없는 것으로 (틱마다 다시 받지 않게). 끄면 루프·한 번짜리 소리 모두 제 크기로 닫고 멈춘다.
   - 루프는 AudioBufferSourceNode loopStart/loopEnd (start(t, loop.start)). 집 테마는 한 바퀴 뒤 rest_after_sec 동안 환경음만 → 처음부터.
   - 전환: 장소 = 다음 마디선 1마디 크로스페이드 · 최소 8마디, 시간대 = 4마디 프레이즈 끝 2마디 페이드 → 종 → 새 곡, 날씨 = 환경음 10 s + weather_shift.
   - 변형 고르기·쉼 길이·자장가 바퀴 수 = 날짜 시드 mulberry32 (게임 규칙대로 시드 없는 난수는 쓰지 않는다).
   - file:// 에서는 소리 없음: 브라우저가 file:// 의 fetch·디코드를 막아 manifest 와 파일을 못 읽는다. <audio loop> 폴백은 README 가 금지한
     루프 틈(인코더 패딩·앞뒤 여유분)이 들리고 iOS 는 element.volume 을 무시해 덕킹도 안 돼서 쓰지 않는다. 토글은 기억만 하고, 켜면 한 줄로 말한다.
   - 어떤 실패(파일 없음·디코드 실패·AudioContext 없음)도 게임으로 던지지 않는다. console.warn 은 많아야 한 번.
   - 잠 (PLAYTEST_FIXES D-1): 자장가는 밤(19~6시, init 의 hour)이거나 그 차례 반응이 졸림일 때만. 그 밖엔 집 테마를 그대로 두고 잠들기 소리(sleep_settle)만 작게.
     반응은 state 'sleep' 이벤트의 reaction (키가 있으면 null 이어도 그것 — 시간으로만), 키가 없으면 이번 차례 마무리 줄(wrap_up)에서 들은 반응.
   - 문 끼익: 한 벌에 문 소리가 아직 없어서 여기서 만든다 (door_creak_open · door_creak_close — 사운드 세션의 나무 삐걱과 같은 만듦새, export.py 크기 규칙, 시드 PRNG).
     audio/ 에 파일 요청은 없다. 사운드 세션이 map.interaction.door_open 을 구워 넣으면 그 파일이 먼저다.
   - 시트 소리: dialog.sheet 의 open 속성이 바뀌는 것을 지켜본다 (MutationObserver) → 열면 sheet_open, 닫으면 sheet_close. 닫기 버튼·Esc·바깥 탭·끌어 내리기 모두 같다.
     그래서 앨범·설정 시트는 app.js 훅 없이 소리가 난다. 시트를 여닫는 버튼 자체는 탭 소리를 내지 않는다 (두 번 울리지 않게).
   APP 은 if (window.AUDIO) AUDIO.on('이름', {...}) 한 줄 훅만 부른다 (js/app.js). 이벤트 이름: state · bubble · pet · ceremony · peek · row · lantern · busy · door · room_sheet(= settings_sheet).
   부엌(js/cook.js)은 AUDIO.on('cook', { act, ... }) — 진짜 녹음 층 foley/ (칩튠 한 벌 audio/ 와 따로, 아래 '부엌' 칸). 모르는 이름은 조용히 넘긴다.
   init 선택: { on: true } = 페이지가 켜 달라고 함 (cook.html ?sound=1 — 이 페이지에서만, 저장하지 않는다. 소리는 첫 사용자 동작에서) · { warm: false } = 말풍선 음절을 미리 받지 않음 (말풍선 없는 부엌 페이지)
   ============================================================ */
/* global WORLD */
var AUDIO = (function () {
  'use strict';

  /* ───────────────────────── 설정 · 저장 ───────────────────────── */
  var KEY = 'ppolppol_audio';
  var BASE = 'audio/';
  var BUSES = ['bgm', 'amb', 'sfx_event', 'sfx_ui', 'voice'];
  var BUDGET = 128 * 1024 * 1024;   /* 디코드된 버퍼 한도 (float32 — 집 테마 한 곡 3.5분 ≈ 40 MB, 환경음 한 겹 ≈ 10 MB) */
  var MAX_BUFS = 96;                /* …그리고 개수 한도 (효과음은 작다 — 미리 받는 음절·결과음 35개가 금방 밀려나지 않게. 부엌 한 판이 19개 더) */
  var MAX_SHOTS = 6;                /* 동시에 울리는 한 번짜리 소리 (manifest rules.min_gap_ms) */
  var PEEK_OK = { read: 1, builtin: 1, simulated: 1, failed: 1, none: 1 };
  var PLACE_ROOMS = { door_out: 1, slow_room: 1, letter_room: 1 };   /* 코너가 아니라 방 이름으로 테마가 있는 곳 */
  var STAY_ANCHORS = { door: 1, window: 1, crate: 1, board: 1, blanket: 1, center: 1 };   /* app.js ANCHORS */
  /* 한 벌에 없어서 여기서 만드는 소리 — 지금은 문 끼익 둘 (아래 makeSound). 사운드 세션이 map.interaction.door_open·door_close 를 구워 넣으면 그쪽이 먼저다.
     rate = 스틱-슬립 펄스 빠르기 [처음, knee 에서, 끝] Hz · lean = 크기 포락선 기울기 (sin(π·u^lean)^0.7) · rel = BGM 대비 dB (export.py 규칙) */
  var MADE = {
    door_creak_open: { dur: 0.44, rate: [30, 170, 120], knee: 0.62, lean: 0.75, lpf: 3200, rel: -14 },   /* 끼이익: 틱틱 → 빨라지며 '이익' */
    door_creak_close: { dur: 0.28, rate: [120, 90, 32], knee: 0.5, lean: 1.2, lpf: 2800, rel: -15 }     /* 닫기: 짧게 느려지며 (아직 앱이 부르지 않는다) */
  };
  var CREAK_RES = [[440, 7, 0.35], [587.33, 9, 1], [880, 8, 0.6]];   /* 공명 A4 · D5 · A5 = F 펜타토닉 안 (Hz, Q, 크기) */
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
  /* pageOn: init({ on: true }) (cook.html ?sound=1) 이 이 페이지에서만 켠 것 — 저장된 설정(본 게임과 같이 쓰는 'ppolppol_audio')의 on 은 그대로 둔다.
     링크 하나로 게임 전체의 소리가 켜져 저장되면 안 된다 (소리는 꺼진 채 시작, 켜는 건 설정 › 소리 › 켜기 뿐) */
  var pageOn = false;
  function savePref() { try { localStorage.setItem(KEY, JSON.stringify(pageOn ? { on: false, music: pref.music, sfx: pref.sfx } : pref)); } catch (e) { /* noop */ } }
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
  var gs = { st: null, away: false, departing: false, left: false, placeKey: undefined, sleeping: false, sleepPhase: null, sleepReaction: null, wrapReaction: undefined, stayWindow: false, stayAct: null, skipping: false, wound: false, leaving: false, peekHeard: {} };
  var ctx = null, nd = {}, M = null, byId = {}, groups = {}, manifestP = null, fmt = null;
  var cache = {}, cacheBytes = 0, useTick = 0, requests = 0;
  var slots = { bgm: null, amb: null, layer: null, warm: null, season: null, cook: null }, want = {};   /* cook = 부엌 지글·보글 루프 (sfx_event) */
  var pend = null, rest = null, started = false, starting = false, inited = false, armed = false, btn = null, noteEl = null, toldFile = false;   /* btn · noteEl = 지금 설정 시트의 '켜기' 체크 칸 · 안내 줄 (시트를 열 때마다 새로 그린다) */
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
    Object.keys(MADE).forEach(function (id) {   /* 한 벌에 같은 이름이 생기면 그 파일을 쓴다 */
      if (!byId[id]) byId[id] = { id: id, kind: 'sfx', made: MADE[id], duration: MADE[id].dur + 0.12, min_gap_ms: 300, duck_db: 0 };
    });
    mergeFoley();   /* 부엌 층을 먼저 받았으면 다시 얹는다 */
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
  var pre = {};   /* id → { f, p: Promise<ArrayBuffer> }: 켜 둔 채 부엌을 열면 첫 손길 전에 받아만 둔 첫 소리 (디코드는 AudioContext 가 생긴 뒤 load 에서) */
  function isBad(id) { var b = bad[id]; return !!(b && Date.now() < b.until); }
  function has(x) { return !!(x && (byId[x] || groups[x]) && !isBad(x)); }
  /* 정확한 이름이 먼저 (lantern_3 · chime_day), 아니면 그룹에서 직전과 다른 것 (시드 PRNG).
     못 받은 변형(isBad)은 고르지 않는다 — 둘짜리 그룹(뒤집기 · 불 켜기 · 접시)에서 하나가 없으면 번갈아 조용해지고 고를 때마다 다시 받았다 */
  function pick(x) {
    if (Array.isArray(x)) x = x.length ? x[Math.floor(rnd() * x.length)] : null;
    if (!x) return null;
    if (byId[x]) return x;
    var g = groups[x]; if (!g || !g.length) return null;
    g = g.filter(function (id) { return !isBad(id); });
    if (!g.length) return null;
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
    if (s.kind === 'sfx' && /^(ui_|sheet_|door_|toast|log_line|card_flip|audio_on|album_open|pet_|curious|window_tap)/.test(s.id)) return 'sfx_ui';   /* door_ = 문 끼익 (지금은 여기서 만든 door_creak_*) */
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
  /* base: 그 소리가 든 한 벌의 폴더 (칩튠 한 벌 = BASE 'audio/', 부엌 층 = FOLEY 'foley/') */
  function fetchBuf(path, base) { requests++; return fetch((base == null ? BASE : base) + path).then(function (r) { if (!r.ok) throw new Error(r.status + ' ' + path); return r.arrayBuffer(); }); }
  function load(id) {
    var c = cache[id];
    if (c) { c.used = ++useTick; return c.p; }
    var s = byId[id];
    if (!s || !(s.files || s.made) || !ctx) return Promise.reject(new Error('없음 ' + id));
    if (isBad(id)) return Promise.reject(new Error('잠시 없는 것으로 ' + id));   /* 15 s → 30 s → … 동안은 다시 받지 않는다 */
    var f = s.files && fmt === 'ogg' && s.files.ogg ? 'ogg' : 'm4a';
    var pf = pre[id] && pre[id].f === f ? pre[id].p : null;   /* 첫 손길 전에 받아 둔 바이트 (prefetchCook) */
    delete pre[id];
    var entry = { p: null, buf: null, bytes: 0, used: ++useTick };
    entry.p = (s.made ? Promise.resolve().then(function () { return makeSound(id, s.made); }) : (pf || fetchBuf(s.files[f], s.base)).then(decode).catch(function (e) {
      if (f !== 'ogg' || !s.files.m4a) throw e;
      /* Opus 를 못 읽는 브라우저 (iOS Safari 18.4 미만) → AAC 로 한 번 더, 이후 전부 AAC */
      return fetchBuf(s.files.m4a, s.base).then(decode).then(function (b) { fmt = 'm4a'; return b; });
    })).then(function (b) {
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
  /* 만드는 소리 (MADE): 사운드 세션의 나무 삐걱(audio/src/ambience.py creak)과 같은 만듦새 — 스틱-슬립 펄스열(조금씩 흔들리는 간격·세기, 시드 PRNG)이
     F 펜타토닉 공명(CREAK_RES)을 친다 → 2차 LPF. 크기는 audio/src/export.py 처럼 소리 나는 구간(10 ms 창, 최대 −50 dB 위) RMS = BGM −20 + rel dB,
     피크 −3 dBFS 아래, 끝 30 ms 페이드. 그래서 파일 소리처럼 gain 1 로 틀고 효과음 슬라이더만 곱한다. 한 번 만들면 LRU 에 다른 버퍼처럼 남는다 */
  function biquad(x, b0, b1, b2, a1, a2) {
    var y = new Float32Array(x.length), x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (var i = 0; i < x.length; i++) { var v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; }
    return y;
  }
  function peakBp(x, sr, f, q) { var w = 2 * Math.PI * f / sr, g = 1 / (1 + Math.tan(w / q / 2)); return biquad(x, 1 - g, 0, g - 1, -2 * g * Math.cos(w), 2 * g - 1); }   /* scipy iirpeak (가운데 0 dB) */
  function lowpass(x, sr, f) { var w = 2 * Math.PI * f / sr, c = Math.cos(w), al = Math.sin(w) / Math.SQRT2, a0 = 1 + al; return biquad(x, (1 - c) / 2 / a0, (1 - c) / a0, (1 - c) / 2 / a0, -2 * c / a0, (1 - al) / a0); }   /* 2차 버터워스 */
  function activeRms(y, sr) {
    var win = Math.max(1, Math.round(0.01 * sr)), e = [], mx = 0, m = 0, k = 0;
    for (var w = 0; (w + 1) * win <= y.length; w++) { var s = 0; for (var j = w * win; j < (w + 1) * win; j++) s += y[j] * y[j]; e.push(s / win); mx = Math.max(mx, s / win); }
    e.forEach(function (v) { if (v > mx * 1e-5) { m += v; k++; } });
    return Math.sqrt(m / (k || 1)) || 1e-9;
  }
  function makeSound(id, sp) {
    var sr = ctx.sampleRate, n = Math.ceil((sp.dur + 0.12) * sr), x = new Float32Array(n), y = new Float32Array(n);
    var r = mulberry32(hashStr('ppolppol-audio|' + id)), next = 0, i;
    for (i = 0; i < n; i++) {
      var t = i / sr; if (t > sp.dur) break;
      if (t < next) continue;
      var u = t / sp.dur, k = sp.knee, a = u < k ? u / k : (u - k) / (1 - k), sm = a * a * (3 - 2 * a);
      var rate = u < k ? sp.rate[0] + (sp.rate[1] - sp.rate[0]) * sm : sp.rate[1] + (sp.rate[2] - sp.rate[1]) * sm;
      x[i] = Math.pow(Math.sin(Math.PI * Math.pow(u, sp.lean)), 0.7) * (0.6 + 0.4 * r());
      next = t + (0.94 + 0.12 * r()) / rate;
    }
    CREAK_RES.forEach(function (q) { var z = peakBp(x, sr, q[0], q[1]); for (var j = 0; j < n; j++) y[j] += q[2] * z[j]; });
    y = lowpass(y, sr, sp.lpf);
    var g = dbg(-20 + sp.rel) / activeRms(y, sr), pk = 0, f = Math.round(0.03 * sr);
    for (i = 0; i < n; i++) pk = Math.max(pk, Math.abs(y[i] * g));
    if (pk > dbg(-3)) g *= dbg(-3) / pk;
    for (i = 0; i < n; i++) y[i] *= g * (i >= n - f ? (n - i) / f : 1);
    var buf = ctx.createBuffer(1, n, sr);
    buf.getChannelData(0).set(y);
    return buf;
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
      nd.ckB = ctx.createGain(); nd.ckB.connect(nd.master);   /* 부엌이 열려 있는 동안 음악을 내린다 (ckBed) — 징글 덕킹과 따로 곱해서 서로 안 덮는다 */
      nd.ckA = ctx.createGain(); nd.ckA.connect(nd.master);
      nd.duckBgm = ctx.createGain(); nd.duckBgm.connect(nd.ckB);
      nd.duckAmb = ctx.createGain(); nd.duckAmb.connect(nd.ckA);
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
  function note(id, t, x) {
    var r = { id: id, t: Math.round(t * 1000) / 1000 };
    if (x) { if (x.rate !== 1) r.rate = Math.round(x.rate * 1000) / 1000; if (x.off) r.off = x.off; }   /* 부엌: 빠르기 · 건너뛴 앞부분 */
    played.push(r); if (played.length > 120) played.shift();
  }
  /* o: at (ctx 시각) · gain · bus · always (건너뛰는 중에도) · direct (마스터를 거치지 않음 — 끄는 소리)
        rate (빠르기, 음높이도 같이) · off (파일 앞을 이만큼 건너뛰고) · late (받느라 이만큼(초) 늦으면 버림) · side (이벤트 징글 줄·말풍선 자리와 상관없는 소리 — 부엌) */
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
      if (num(o.late) && now() > (o.at || t0) + o.late) return 0;     /* 처음 받느라 늦은 부엌 소리도 (톡톡이 뭉쳐 울리지 않게) */
      var src = ctx.createBufferSource(); src.buffer = buf;
      var rate = num(o.rate) && o.rate > 0 ? o.rate : 1, off = num(o.off) && o.off > 0 && o.off < buf.duration ? o.off : 0, len = (buf.duration - off) / rate;
      if (rate !== 1) src.playbackRate.value = rate;
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
      var rec = { src: src, gn: gn, end: t + len, direct: !!o.direct };   /* 끌 때 같이 멈춘다 (안 그러면 suspend 에 얼었다가 다음에 켤 때 울린다) */
      live.push(rec);
      src.onended = function () { try { gn.disconnect(); } catch (e) { /* noop */ } var i = live.indexOf(rec); if (i >= 0) live.splice(i, 1); };
      src.start(t, off);
      var end = t + len;
      if (bus === 'sfx_event' && !o.side) evEnd = Math.max(evEnd, end);
      note(id, t, (rate !== 1 || off) ? { rate: rate, off: off } : null);
      return end;
    }).catch(function (e) { if (resv) resv.s = resv.e = -1; warn('소리 파일을 못 틀었어 (' + id + ')', e); return 0; });   /* 못 튼 징글 자리는 비운다 */
    if (bus === 'sfx_event' && !o.side) evP = p;   /* 말풍선 음절은 이게 자리 잡은 뒤에 (처음 받는 기웃 결과음과 겹치지 않게) */
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
  /* 페이드인 = 등전력(sin) 모양을 직선 16토막으로 (setValueCurveAtTime 이 아니라). 곡선 도중에 내리면 Chrome 의 cancelAndHoldAtTime 이
     곡선 값을 못 붙들어 0 근처로 뚝 끊겼다 (불 켠 뒤 1 s 안 뒤집기 · 굽기 바뀐 뒤 0.5 s 안 · 그때 닫기·숨김). 직선이면 지금 값을 붙든다.
     pop = { db, rel }: 다 오른 뒤 db 만큼 더 올랐다가 rel 초에 걸쳐 제 크기로 (부엌 굽기가 바뀌는 순간의 '치익' 한 번) */
  var FADE_SEG = 16;
  function fadeIn(g, t, dur, lv, pop) {
    var p = g.gain;
    try {
      p.setValueAtTime(0, t);
      var top = pop ? lv * dbg(pop.db) : lv;
      if (dur > 0.25 || pop) { for (var i = 1; i <= FADE_SEG; i++) p.linearRampToValueAtTime(top * Math.sin(i / FADE_SEG * Math.PI / 2), t + dur * i / FADE_SEG); }
      else p.linearRampToValueAtTime(lv, t + Math.max(0.02, dur));
      if (pop) p.linearRampToValueAtTime(lv, t + dur + Math.max(0.05, pop.rel));
    } catch (e) { try { p.value = lv; } catch (x) { /* noop */ } }
  }
  /* 그 자리의 크기를 t 에 (fadeIn 일정으로 계산: cancelAndHoldAtTime 이 없는 브라우저(Firefox)가 내리기를 시작하는 값) */
  function levelAt(n, t) {
    var f = n.fi; if (!f) return n.level || 1;
    if (t <= f.t) return 0;
    var top = f.pop ? f.lv * dbg(f.pop.db) : f.lv, u = (t - f.t) / Math.max(0.02, f.dur);
    if (u < 1) return f.dur > 0.25 || f.pop ? top * Math.sin(u * Math.PI / 2) : f.lv * u;
    if (!f.pop) return f.lv;
    var v = (t - f.t - f.dur) / Math.max(0.05, f.pop.rel);
    return v >= 1 ? f.lv : top + (f.lv - top) * v;
  }
  /* eqp: 등전력(cos) 으로 내린다 — 들어오는 쪽 fadeIn 의 sin 과 짝 (서로 상관없는 잡음끼리, 부엌 지글 굽기 바뀜). 아니면 지수로 */
  function fadeOut(n, t, dur, eqp) {
    if (!n || n.dead) return;
    n.dead = true;
    t = Math.max(t || 0, now()); dur = Math.max(0.05, dur || 0.05);
    if (n.endT) { if (t >= n.endT) return; dur = Math.min(dur, Math.max(0.05, n.endT - t)); }   /* 한 바퀴 끝(집 테마)을 넘겨 여유분까지 틀지 않게 */
    /* v0 = t 의 크기. 페이드인(치익 포함)이 아직 도는 중이면 그 일정으로 계산해서 t 에 직접 박는다: Chrome 의 cancelAndHoldAtTime 은 짧은
       직선 토막 한가운데서 엉뚱한 값(0 근처)을 붙들었다. 다 오른 뒤면 지금 값을 붙든다 (집 테마 끝 페이드 같은 setTarget 도 그대로) */
    var p = n.g.gain, pv = +p.value, f = n.fi, fin = !!f && t < f.t + f.dur + (f.pop ? f.pop.rel : 0) + 0.005;
    var v0 = fin ? levelAt(n, t) : isFinite(pv) ? Math.min(n.level || 1, Math.max(0, pv)) : (n.level || 1);
    try {
      if (p.cancelAndHoldAtTime) { p.cancelAndHoldAtTime(t); if (fin) p.setValueAtTime(v0, t); }
      else { p.cancelScheduledValues(t); p.setValueAtTime(v0, t); }   /* 없으면 그때 크기에서 (제 크기로 튀어 오르지 않게) */
      if (eqp) { for (var i = 1; i <= 8; i++) p.linearRampToValueAtTime(v0 * Math.cos(i / 8 * Math.PI / 2), t + dur * i / 8); }
      else p.setTargetAtTime(0, t, dur / 3.5);
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
      src.connect(g); g.connect(nd.bus[o.bus || (slot === 'bgm' ? 'bgm' : 'amb')]);   /* 부엌 루프 = sfx_event (효과음 슬라이더) */
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
      var lv = o.gain == null ? 1 : o.gain, fdur = o.fade == null ? 0.05 : o.fade;
      fadeIn(g, t, fdur, lv, o.pop);
      var endT = 0;
      if (lp && !looping) {   /* 집 테마 한 바퀴 = loop.end 까지. 뒤 1초(이음새 여유분 = 마디 1 복사)는 틀지 않고 끝에서 살짝 닫는다 */
        endT = t + (Math.min(lp.end, buf.duration) - off);
        try { g.gain.setTargetAtTime(0, Math.max(t + (o.fade || 0.05) + 0.01, endT - 0.35), 0.1); } catch (e) { /* noop */ }
        try { src.stop(endT); } catch (e) { /* noop */ }
      }
      var old = slots[slot];
      if (old) fadeOut(old, t, o.xfade == null ? (o.fade || 0.05) : o.xfade, o.eqp);
      var n = { id: id, s: s, src: src, g: g, level: lv, t0: t - (off - base), started: t, band: band, slot: slot, dead: false, endT: endT, fi: { t: t, dur: fdur, lv: lv, pop: o.pop || null } };
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
  /* D-1 (2026-11-07): 산책·집에 있는 날이 끝날 때마다 자장가로 넘어가서, 하루 몇 번이면 가장 많이 듣는 곡이 자장가였다.
     자장가 = 밤(19~6시)이거나 반응이 졸림. 그 밖(낮의 폴짝·우쭐·덤덤·반응 없음)엔 지금 곡을 그대로 두고 잠들기 소리만 작게 */
  var SETTLE_SOFT = 0.6;   /* 낮잠 잠들기 소리 크기 (≈ -4.4 dB) */
  function nightNow() { return bandOf(read(game.hour, null)) === 'night'; }
  function lullabyWanted(r) { return r === '졸림' || nightNow(); }
  function settleHome(live) {
    if (!active()) return;
    clearTimeout(lullTimer);
    gs.sleepPhase = 'home';
    if (live) {   /* 마무리 징글·등불이 끝난 뒤에, 작게. BGM 은 그대로 */
      var setId = ev(['sleep', 'settle']) || 'sleep_settle';
      play(setId, { at: Math.max(now() + 0.05, evEnd + 0.25), always: true, gain: SETTLE_SOFT });
    }
    applyBgm();
  }
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
    ckBed();   /* 부엌을 열고 닫은 것 (act 없이도: 조리대만 보고 있을 때) */
  }

  /* ───────────────────────── 말풍선 목소리 (README §3 표) ───────────────────────── */
  var VSET = { '보통': [['A4', 'C5', 'D5'], 60], '폴짝': [['C5', 'D5', 'F5', 'G5'], 50], '우쭐': [['C5', 'F5', 'A5'], 65], '덤덤': [['A4', 'C5'], 70], '졸림': [['F4', 'G4', 'A4'], 90] };
  var PEEK_GAIN = { read: 0.45, builtin: 0.7 };   /* 읽음(-4 dB 설정)이 다른 결과음보다 6~8 dB 컸다 → 약 -7 dB / 책장 메모 약 -3 dB */
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
    /* 정직: 결과음은 실제 상태 그대로 (다섯 개 모두 같은 길이·리듬). '처음 온 곳' 징글은 2026-11-05 주인 요청으로 뺐다 (산책 중 튀는 실로폰 소리).
       차분하게 (11-05 주인 요청 "찾았다! 소리가 시끄럽고 잦다"): 한 산책에서 같은 결과음은 한 번만, 읽음 소리는 소리 자체도 낮춘다.
       어느 상태든 같은 규칙이라 '실패인데 성공음' 같은 일은 없다 (말풍선·기록이 상태를 보여 준다). */
    if (!gs.peekHeard[st]) { gs.peekHeard[st] = true; play(ev(['peek_status', st]), { gain: PEEK_GAIN[st] == null ? 1 : PEEK_GAIN[st] }); }
    var key = placeKeyOf(d);
    if (key === 'letter_room') play('letter_room', { at: now() + 0.35 });
    if (gs.away || gs.departing) { gs.placeKey = key; trimUpdate(); applyBgm(); }
  }
  function onReturn() {
    gs.away = false; gs.departing = false; gs.left = false; gs.placeKey = undefined; gs.peekHeard = {};
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
        gs.wrapReaction = r || null;   /* 곧 올 잠(state sleep)이 반응을 안 실어 오면 이걸로 자장가를 정한다 (D-1) */
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
      /* 반응: 이벤트에 reaction 키가 있으면 그것 (null·undefined = 시간으로만), 없으면 이번 차례 마무리 줄에서 들은 것 */
      gs.sleepReaction = Object.prototype.hasOwnProperty.call(d, 'reaction') ? (d.reaction || null) : (gs.wrapReaction || null);
      gs.wrapReaction = undefined;
      if (!active()) gs.sleepPhase = null;   /* 켤 때 start() 가 다시 정한다 */
      else if (lullabyWanted(gs.sleepReaction)) startLullaby(prev != null);
      else settleHome(prev != null);
    } else if (prev === 'sleep' && st !== 'sleep') {
      gs.sleeping = false; gs.sleepPhase = null; gs.sleepReaction = null; clearTimeout(lullTimer); clearRest(); applyBgm();
    }
    if (st === 'stay') stayActivity();
  }
  function onCeremony(d) {
    if (d.kind === 'depart') {
      gs.departing = true; gs.placeKey = undefined; gs.peekHeard = {};
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
    if (d.kind === 'sleep' || /zZ/.test(text)) { if (t - lastSnore > 6) { lastSnore = t; play(ev(['sleep', 'snore'])); } return; }   /* 자는 문어를 누름 ('쿨쿨…' — 예전 '…zZ') */
    if (d.kind === 'curious' || text.replace(/\s/g, '') === '?') { play(ev(['interaction', 'look'])); return; }   /* 깨어 있는 문어를 톡 ('응?' — 예전 '?') */
    if (d.kind === 'think') return;            /* 생각 말풍선은 소리 내지 않는다 */
    if (t - moodAt < 1.5) return;
    var syl = (text.match(/[가-힣]/g) || []).length;
    if (!syl || syl > 28 || t - lastSpeak < 0.7) return;   /* 아주 긴 글은 블립 없이 */
    lastSpeak = t;
    speak(text, KIND_MOOD[d.kind] || '보통', d.kind === 'whisper' ? 0.55 : d.kind === 'shout' ? 0.5 : 1);   /* 외침(찾았다!)도 목소리는 작게 — 11-05 */
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
    if (d.on) gs.wrapReaction = undefined;   /* 새 차례: 지난 차례 반응은 잊는다 */
    if (gs.leaving) { gs.leaving = false; if (!d.on && (gs.away || gs.departing)) onReturn(); }   /* 퇴장 의식 뒤 귀가 의식이 안 왔다 */
    if (!d.on) { gs.stayWindow = false; gs.stayAct = null; applyBgm(); }
  }
  /* 문 (놀이방 문 · 앞으로 걸어서 지나가는 방문): 끼익. 사운드 세션이 map.interaction.door_open(또는 ui.door_open · 닫기 door_close)을 구워 넣으면 그걸,
     그 전엔 여기서 만든 door_creak_open · door_creak_close (MADE · makeSound). 시트 소리(sheet_open)와 다르게 들려야 한다 — 주인 11-07 "끼익 열리면서".
     기웃 결과음(peek_simulated '문 너머', peek_failed '닫힌 문 노크')은 정직 규칙상 그 상태 전용이라 빌리지 않는다. 모르는 act 는 조용히 (audio/README.md §4 '문') */
  function onDoor(d) {
    var act = d.act === 'open' || d.act === 'close' ? d.act : null;
    if (!act || !active()) return;
    var I = mp().interaction || {}, U = mp().ui || {}, own = I['door_' + act] || U['door_' + act];
    play(has(own) ? own : 'door_creak_' + act);
  }

  /* ───────────────────────── 부엌: 진짜 녹음 층 (foley/ — 칩튠 한 벌 audio/ 와 따로) ───────────────────────── */
  /* js/cook.js 가 AUDIO.on('cook', { act, ... }) 를 부른다 (docs/COOK_PROTO.md §8). 목록은 foley/manifest.json (파일은 foley/ 기준 cook/<id>.ogg|.m4a) —
     부엌 소리가 처음 필요할 때 받는다: 켠 채로 부엌 act 가 오거나, 켤 때 부엌이 열려 있으면, 또는 켜 둔 채 부엌 페이지를 열면(init: 목록 둘 +
     첫 소리 몇 개의 바이트만 — 소리는 첫 손길 뒤). 그 밖(본 게임만 할 때)엔 요청이 없다.
     act → 소리 (map.cook 의 group, 변형은 직전과 다른 것 — 시드 PRNG, 못 받은 변형은 빼고):
       pick → 팬 들기 · tap → 반죽 톡 (i 0~8 따라 빠르기를 조금씩: 9번째가 +3 반음) · cut → 사각 + 도마 톡 · step → 작은 나무 톡
       sizzle → quiet 뒤 첫 번(불 켜기, band 0): cook_heat_on 한 번 + 그 굽기 루프를 1 s 등전력 페이드인 (팬이 달궈짐)
                굽기가 바뀜(1, 2): 그 굽기 루프로 0.15 s 등전력 크로스페이드 + '치익' 한 번 (새 루프가 +4 dB 까지 올랐다가 0.5 s 에 제 크기로
                — 그림의 기포 터짐과 같은 때)
                탭이 숨었다 돌아와 다시 온 것 (불은 켜진 채): heat_on 없이 그 루프만 0.3 s
       flip → 뒤집기 변형 그대로 (철퍽 봉우리가 파일 0.256 s = arc 착지 그림). 움직임 줄이기면 휙을 건너뛰고 sync.reduced_motion_offset_s 부터
              그 단계 끝 step 의 톡은 철퍽 뒤 0.1 s 에 (뒤집는 순간 울리면 일찍 떨어진 것처럼 들린다)
       quiet → 도는 루프를 0.25 s 에 내리고 멈춘다 (한 번짜리는 끝까지). 뒤집은 바로 뒤에도 온다 — 뒤집기 파일 안에 지글이 잦아드는 꼬리가 있다
       done → 접시가 다 오른 때(+0.4 s, 움직임 줄이기면 바로) 접시 놓기 + 0.15 s 뒤 작은 김 쉬익
       stir · clink · place · lift → 그 소리 (조각 2) · back → lift 를 절반 크기로 · simmer → 루프 (quiet 로 멈춤) · 모르는 act → 조용히
     부엌이 열려 있는 동안 음악·환경음을 내린다 (부엌 덕킹 — 따로 된 노드라 징글 덕킹과 서로 안 덮는다): 열려 있으면 COOK_BED, 지글·보글 루프가
     도는 동안 더 깊게 COOK_SIZZLE. 효과음 크기가 0 이면 내리지 않는다 (들리지 않는 지글 때문에 음악만 줄지 않게).
     나머지는 다른 소리와 같다: 효과음 슬라이더(sfx_event) · 밤 마스터 · 탭 숨김(cook.js 가 quiet, 돌아오면 sizzle) · 첫 동작 잠금 풀기 · 실패는 조용히.
     꺼져 있거나 아직 안 풀렸을 때도 불(band)은 기억한다: 켜지는 순간 부엌이 열려 있고 불이 켜져 있으면 그 지글부터 (불 켠 바로 그 탭이 잠금을 풀었으면 heat_on 도).
     아직 안 풀렸을 때 온 한 번짜리 act 하나(첫 손길의 팬 들기)도 기억했다가, 풀린 뒤 COOK_EARLY 안이면 튼다 */
  var FOLEY = 'foley/';
  var COOK_BED = { bgm: -6, amb: -9 };       /* 부엌이 열려 있으면: 톡톡 · 썰기 · 접시가 음악의 봉우리 위로 올라오게 */
  var COOK_SIZZLE = { bgm: -10, amb: -13 };  /* 지글이 도는 동안: 지글이 냄새 대신이라 음악 아래 깔리지 않게, 비·물방울(잡음 결)이 지글을 덮지 않게 */
  var COOK_FADE = { heat: 1.0, xfade: 0.15, back: 0.3, quiet: 0.25 };
  var COOK_POP = { db: 4, rel: 0.5 };        /* 굽기가 바뀌는 순간의 '치익' */
  var COOK_LAND = 0.4;      /* 접시 공개: 6 그림(12 fps) 중 마지막 = 5 × 83 ms ≈ 0.417 s. 접시 소리 봉우리가 20 ms 쯤이라 그만큼 앞에 */
  var COOK_LATE = 0.3;      /* 처음 받느라 이만큼(초) 늦은 한 번짜리 부엌 소리는 버린다 */
  var COOK_EARLY = 0.3;     /* 잠금이 풀리기 전에 온 한 번짜리 act: 풀린 뒤 이만큼(초) 안이면 튼다 */
  var COOK_FIRST = ['pick', 'tap', 'step'];   /* 켜 둔 채 부엌 페이지를 열면 첫 손길 전에 바이트만 받아 두는 소리 */
  var COOK_NEXT = {         /* 이 act 다음에 곧 쓸 소리를 미리 받는다 (해초전 순서). open = 부엌 층을 처음 받았을 때 */
    open: COOK_FIRST, tap: ['sizzle:heat_on', 'sizzle:0'], sizzle: ['sizzle:1', 'sizzle:2', 'flip'], flip: ['cut', 'done'],
    stir: ['stir', 'place', 'lift', 'clink'], simmer: ['stir', 'clink']
  };
  var FM = null, fmP = null, fmRetry = 0;
  var CK = { band: null, hid: false, at: -1e9, fresh: false, warmed: false, pending: 0, q: Promise.resolve(), bed: 0, early: null, landAt: -1, log: [] };
  function loadFoley() {
    if (FM) return Promise.resolve(true);
    if (fmP) return fmP;
    if (reason || Date.now() < fmRetry) return Promise.resolve(false);
    requests++;
    fmP = fetch(FOLEY + 'manifest.json').then(function (r) { if (!r.ok) throw new Error('foley manifest ' + r.status); return r.json(); })
      .then(function (m) {
        if (!m || !m.map || !m.map.cook || !Array.isArray(m.sounds)) throw new Error('foley manifest 형식');
        FM = m; mergeFoley(); return true;
      })
      .catch(function (e) { fmP = null; fmRetry = Date.now() + 60000; warn('foley/manifest.json 을 못 읽었어 (부엌 소리 없이)', e); return false; });   /* 1분 뒤에 다시 */
    return fmP;
  }
  function mergeFoley() {   /* 부엌 소리를 같은 이름표(byId · groups)에 — 이름이 모두 cook_ 이라 한 벌과 겹치지 않는다 (겹치면 한 벌이 먼저) */
    if (!FM) return;
    FM.sounds.forEach(function (s) {
      if (!s || !s.id || !s.files || byId[s.id]) return;
      s.base = FOLEY;
      byId[s.id] = s;
      var g = s.group || s.id;
      (groups[g] = groups[g] || []).push(s.id);
    });
  }
  function cookOpen() { try { return !!(window.COOK && typeof COOK.isOpen === 'function' && COOK.isOpen()); } catch (e) { return false; } }
  function cookReduced() {   /* 부엌의 움직임 줄이기 (COOK.open({ reduced }) · ?reduced=1 · 기기 설정 · 게임 설정) */
    try { if (window.COOK && typeof COOK.live === 'function') { var l = COOK.live(); if (l && typeof l.reduced === 'boolean') return l.reduced; } } catch (e) { /* noop */ }
    try { return document.documentElement.getAttribute('data-motion') === 'reduce' || !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  function ckMap() { return (FM && FM.map && FM.map.cook) || {}; }
  /* 'tap' → ['cook_pat'] · 'sizzle:0' → ['cook_sizzle_0'] · 'done' → [접시, 김] */
  function ckRef(key) {
    var k = String(key).split(':'), m = ckMap()[k[0]];
    if (!m || k[0].charAt(0) === '_') return [];
    if (k.length > 1) return typeof m[k[1]] === 'string' ? [m[k[1]]] : [];
    if (typeof m === 'string') return [m];
    if (typeof m.id === 'string') return [m.id];
    return [m.plate, m.steam].filter(function (x) { return typeof x === 'string'; });
  }
  function ckIds(keys) {   /* act 키들 → 그 소리 파일 id 들 */
    var out = [];
    (keys || []).forEach(function (key) { ckRef(key).forEach(function (g) { (groups[g] || (byId[g] ? [g] : [])).forEach(function (id) { if (out.indexOf(id) < 0) out.push(id); }); }); });
    return out;
  }
  function ckWarm(keys) {
    if (!FM || !ctx) return;
    ckIds(keys).forEach(function (id) { if (!cache[id] && !isBad(id)) load(id).catch(noop); });
  }
  /* 켜 둔 채(또는 ?sound=1) 부엌 페이지가 열렸다: 첫 손길 전에 목록 둘과 첫 소리 몇 개의 바이트만 받아 둔다 (AudioContext 는 만들지 않는다 —
     소리는 여전히 첫 사용자 동작 뒤). 첫 손길이 곧 팬 들기라 그 소리가 늦거나 사라지지 않게 (느린 망에서는 첫 톡톡까지) */
  function prefetchCook() {
    if (reason || !pref.on) return;
    if (!fmt) fmt = pickFmt();
    loadManifest();
    loadFoley().then(guard(function (ok) {
      if (!ok || !pref.on) return;
      ckIds(COOK_FIRST).forEach(function (id) {
        var s = byId[id]; if (!s || !s.files || cache[id] || pre[id] || isBad(id)) return;
        var f = fmt === 'ogg' && s.files.ogg ? 'ogg' : 'm4a', p = fetchBuf(s.files[f], s.base);
        pre[id] = { f: f, p: p };
        p.catch(function () { if (pre[id] && pre[id].p === p) delete pre[id]; });
      });
    }));
  }
  function ckLog(ev, id, t, fade, pop) { var r = { ev: ev, id: id, t: Math.round(t * 1000) / 1000, fade: fade }; if (pop) r.pop = pop.db; CK.log.push(r); if (CK.log.length > 40) CK.log.shift(); }
  function ckShot(g, o) {
    o = o || {};
    if (!g || !has(g)) return Promise.resolve(0);
    return play(g, { at: o.at, gain: o.gain, rate: o.rate, off: o.off, bus: 'sfx_event', always: true, side: true, late: num(o.late) ? o.late : COOK_LATE });
  }
  /* 부엌 덕킹: 0 없음 · 1 부엌이 열려 있음 (COOK_BED) · 2 지글·보글 루프가 돎 (COOK_SIZZLE). 효과음이 0 이면 내리지 않는다 */
  function ckBed() {
    if (!ctx || !nd.ckB) return;
    var lvl = !pref.on || !cookOpen() || !(curve(vol.sfx_event) > 0) ? 0 : (slots.cook && !slots.cook.dead) || loading.cook ? 2 : 1;
    if (CK.bed === lvl) return;
    var down = lvl > CK.bed, D = lvl === 2 ? COOK_SIZZLE : lvl === 1 ? COOK_BED : null, t = now();
    CK.bed = lvl;
    target(nd.ckB.gain, D ? dbg(D.bgm) : 1, t, down ? 0.25 : 0.35);   /* 내려갈 때 ~0.8 s (불 켜기 페이드인과 같이) · 올라올 때 ~1 s */
    target(nd.ckA.gain, D ? dbg(D.amb) : 1, t, down ? 0.25 : 0.35);
  }
  function ckLoop(id, fade, kind, pop) {
    var t = now() + 0.02;
    ckLog(kind, id, t, fade, pop);
    startSlot('cook', id, { at: t, fade: fade, xfade: fade, eqp: true, bus: 'sfx_event', pop: pop });
    ckBed();
  }
  function ckQuiet() {
    var cur = slots.cook && !slots.cook.dead ? slots.cook : null;
    if (cur || loading.cook) ckLog('stop', cur ? cur.id : loading.cook, now(), COOK_FADE.quiet);
    stopSlot('cook', COOK_FADE.quiet);
    ckBed();
  }
  function ckSizzle(e) {
    var S = ckMap().sizzle; if (!S || typeof S !== 'object') return;
    var id = S[String(e.band)]; if (!has(id)) return;
    var cur = slots.cook && !slots.cook.dead ? slots.cook : null;
    if ((cur && cur.id === id) || loading.cook === id) return;                                /* 같은 굽기가 이미 돈다 */
    if (cur || loading.cook) { ckLoop(id, COOK_FADE.xfade, 'xfade', COOK_POP); return; }    /* 굽기가 바뀜: 빠른 크로스페이드 + 치익 */
    if (e.fresh && e.band === 0) ckShot(S.heat_on, { late: COOK_FADE.heat });               /* 불 켜기: 딸깍 + 화르륵 (처음 받느라 늦어도 팬이 달궈지는 1 s 안이면) */
    ckLoop(id, e.fresh ? COOK_FADE.heat : COOK_FADE.back, e.fresh ? 'start' : 'resume');
  }
  function ckFlip(g) {
    if (!g || !has(g)) return;
    var id = pick(g); if (!id) return;   /* 변형을 먼저 골라 그 파일의 sync 를 본다 (pick 이 직전 것을 기억) */
    var sy = byId[id].sync, off = sy && num(sy.reduced_motion_offset_s) && cookReduced() ? sy.reduced_motion_offset_s : 0;
    CK.landAt = now() + 0.01 + Math.max(0, (sy && num(sy.land_s) ? sy.land_s : 0.256) - off);   /* 철퍽이 들리는 때 (뒤따르는 step 의 톡은 그 뒤에) */
    ckShot(id, { off: off });
  }
  function ckDone() {
    var r = ckRef('done'), t = now() + (cookReduced() ? 0.02 : COOK_LAND);
    if (r[0]) ckShot(r[0], { at: t });
    if (r[1]) ckShot(r[1], { at: t + 0.15 });
  }
  /* 그 act 의 소리를 먼저 (그 파일이 미리 받기보다 앞서 받히고 풀리게), 그다음 곧 쓸 것을 미리 */
  function cookAct(e) {
    if (!active()) return;
    ckDo(e);
    if (!CK.warmed) { CK.warmed = true; ckWarm(COOK_NEXT.open); }
    ckWarm(COOK_NEXT[e.act]);
    ckBed();
  }
  function ckDo(e) {
    var act = e.act, d = e.d, m = ckMap()[act];
    if (act === 'quiet') { ckQuiet(); return; }
    if (act === 'sizzle') { ckSizzle(e); return; }
    if (m == null) return;                                            /* 모르는 act: 조용히 */
    if (Date.now() - e.wall > COOK_LATE * 1000) return;               /* 부엌 층을 처음 받느라 늦었다: 버린다 */
    if (act === 'tap') { ckShot(ckRef('tap')[0], { rate: Math.pow(2, 3 * Math.max(0, Math.min(8, d.i | 0)) / 8 / 12) }); return; }
    if (act === 'flip') { ckFlip(ckRef('flip')[0]); return; }
    if (act === 'done') { ckDone(); return; }
    if (act === 'step' && d.kind === 'flip' && CK.landAt > now()) { ckShot(ckRef('step')[0], { at: CK.landAt + 0.1 }); return; }   /* 철퍽 뒤에 톡 */
    var g = ckRef(act)[0], s = g && (byId[g] || byId[(groups[g] || [])[0]]);
    if (!s) return;
    if (s.loop) { if (!(slots.cook && !slots.cook.dead && slots.cook.id === s.id) && loading.cook !== s.id) ckLoop(s.id, COOK_FADE.heat, 'start'); return; }   /* 보글 (조각 2) */
    ckShot(g, { gain: typeof m === 'object' && num(m.gain) ? m.gain : 1 });
  }
  /* 들어오는 대로 불(band)을 기억하고, 켜져 있으면 바로 (부엌 층을 아직 받는 중이면 받은 뒤에 같은 차례로) */
  function onCook(d) {
    var act = typeof d.act === 'string' ? d.act : '';
    if (!act || act.charAt(0) === '_') return;
    var e = { act: act, d: d, wall: Date.now() };
    if (act === 'sizzle') {
      e.band = Math.max(0, Math.min(2, d.band | 0));
      e.fresh = CK.band === null && !CK.hid;   /* quiet 뒤 첫 번이고, 탭이 숨어서 멈춘 게 아니면 = 불 켜기 */
      CK.band = e.band; CK.hid = false; CK.at = e.wall; CK.fresh = e.fresh;
    } else if (act === 'quiet') {
      CK.hid = CK.band !== null && !!document.hidden;   /* 탭이 숨어서 멈춘 지글: 돌아와 다시 오는 sizzle 은 불 켜기가 아니다 */
      CK.band = null; CK.early = null;
    }
    if (!active()) { if (act !== 'sizzle' && act !== 'quiet' && pref.on && !reason) CK.early = e; return; }   /* 첫 손길(팬 들기)이 잠금을 풀기 전에 왔다 */
    if (FM && !CK.pending) { cookAct(e); return; }
    CK.pending++;
    CK.q = CK.q.then(loadFoley).then(guard(function (ok) { CK.pending--; if (ok) cookAct(e); }), function () { CK.pending--; });
  }
  /* 소리가 켜지는 순간 (start): 부엌 덕킹을 처음부터, 부엌이 열려 있으면 부엌 층을 받고, 불이 켜져 있으면 그 지글부터,
     잠금이 풀리기 바로 전에 온 한 번짜리 소리(COOK_EARLY 안)도 */
  function cookResume() {
    if (nd.ckB) { target(nd.ckB.gain, 1, now(), 0.05); target(nd.ckA.gain, 1, now(), 0.05); }
    CK.bed = 0;
    if (!cookOpen()) { CK.early = null; return; }
    ckBed();
    loadFoley().then(guard(function (ok) {
      var early = CK.early; CK.early = null;
      if (!ok || !active() || !cookOpen()) return;
      var lit = CK.band !== null && !(slots.cook && !slots.cook.dead) && !loading.cook;
      if (lit) ckSizzle({ band: CK.band, fresh: CK.fresh && Date.now() - CK.at < 700 });   /* 불 켠 바로 그 탭이 잠금을 풀었으면 불 켜기 소리도 (미리 받기보다 먼저) */
      if (early && Date.now() - early.wall < COOK_EARLY * 1000) ckDo(early);
      if (!CK.warmed) { CK.warmed = true; ckWarm(COOK_NEXT.open); }
      if (lit) ckWarm(COOK_NEXT.sizzle);
      ckBed();
    }));
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
        case 'door': onDoor(d); break;
        case 'cook': onCook(d); break;   /* 부엌 (js/cook.js) — 진짜 녹음 층 foley/ */
        case 'room_sheet': case 'settings_sheet': roomSheet(d.frag); break;   /* 소리 칸은 이제 설정 시트에 있다 (방 보기는 11-07 에 없앴다 — 옛 이름도 받는다) */
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
    if (cookOpen()) loadFoley();   /* 부엌이 열려 있으면 부엌 목록도 같이 받는다 (첫 톡톡이 늦지 않게) */
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
      if (gs.sleeping && lullabyWanted(gs.sleepReaction)) startLullaby(false);   /* 자고 있을 때 켰다: 같은 규칙 (D-1) — 밤이거나 졸림이면 자장가 */
      else { if (gs.sleeping) gs.sleepPhase = 'home'; applyBgm({ delay: fromUser ? 0.45 : 0 }); }
      clearInterval(tickTimer); tickTimer = setInterval(guard(tick), 1000);
      clearTimeout(warmTimer); warmTimer = setTimeout(guard(warmVoices), 2500);   /* BGM·환경음을 먼저 받고 나서 */
      cookResume();   /* 부엌이 열려 있으면: 부엌 층 · 불이 켜져 있으면 그 지글 */
      if (ctx && ctx.state === 'running') disarm(); else armIfStuck();   /* 아직 멈춰 있으면 다음 탭에서 깨운다 */
      paint();
    }));
  }
  /* 말풍선 음절 16개 + 기웃 결과음 11개 (다 합쳐 56 KB) 를 한 번에 미리. 산책마다 몇 번씩 나는 작은 소리라 처음 받는 지연이 그대로 들렸다
     (음절은 0.8 s 넘으면 말을 건너뛰고, 결과음이 늦으면 음절과 겹친다). 하나씩 차례로 받으면 메인 스레드가 바쁜 기기에선 몇 초씩 걸렸다.
     + 차례 첫 소리 움츠림·나감·앉음 6개와 끄는 소리 2개 (46 KB): 움츠림이 늦게 오면 나감 소리와 겹쳤고, 끄는 소리가 늦으면 멈춘 뒤라 버려진다 */
  var warmTimer = null, noWarm = false;   /* noWarm: init({ warm: false }) — 말풍선 없는 페이지 (cook.html) */
  function warmVoices() {
    if (!active() || noWarm) return;
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
    CK.bed = 0; CK.early = null;   /* 부엌 루프는 아래 자리 닫기에서 같이 멈춘다. 불(band)은 기억한다 — 다시 켜면 cookResume */
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
      if (on === pref.on && (!on || started)) { if (pageOn && on && fromUser) { pageOn = false; savePref(); } paint(); return; }
      pageOn = false; pref.on = on; savePref(); paint();
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
  /* 설정 › 소리 › '켜기' 줄(체크 칸 · 글자)을 누른 건 그 칸이 맡는다 (change → onToggle) — 여기서 먼저 켜면 그 칸이 바로 다시 꺼 버린다.
     키는 칸을 뒤집는 Space 만 그 칸 몫. Enter · Tab · Esc 는 칸을 안 뒤집으니 다른 키처럼 여기서 다시 흐르게 (옛 스피커 단추는 Enter 로도 켜졌다) */
  function rowOwns(e) {
    if (!e || !e.target || !e.target.closest || !e.target.closest('#set-sound-row')) return false;
    return e.type !== 'keydown' || e.key === ' ' || e.key === 'Spacebar';
  }
  function onUnlock(e) {
    if (!pref.on || reason) { disarm(); return; }
    if (rowOwns(e)) return;
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

  /* ───────────────────────── 화면: 설정 시트의 소리 칸 (켜기 · 끄기 · 크기 · 안내) ───────────────────────── */
  /* 소리 칸 아래 한 줄: 소리를 못 내는 곳에서만 왜 그런지 (그때 체크 칸은 기억만 한다). 보통 때는 비운다 — 체크 칸이 곧 말이다 (주인 11-08: 글은 적게) */
  function noteText() {
    if (reason === 'file') return '파일(file://)로 열면 브라우저가 소리를 막아. 웹 주소로 열면 들려.';
    if (reason === 'no-webaudio' || reason === 'no-fetch') return '이 브라우저는 소리를 못 내. 소리 없이도 다 할 수 있어.';
    if (reason === 'manifest') return '소리 목록을 못 읽었어. 소리 없이 계속할게.';
    return '';
  }
  function tellUnavailable() {
    if (toldFile) return; toldFile = true;
    var t = document.getElementById('toast'); if (!t) return;
    t.textContent = reason === 'file' ? '파일로 열면 소리를 못 틀어. 웹 주소로 열면 들려' : noteText();
    t.classList.add('show');
    setTimeout(function () { if (t.textContent && /소리/.test(t.textContent)) t.classList.remove('show'); }, 2800);
  }
  /* 체크 칸은 지금 들리는 대로: 켜 둔 채 새로고침했거나 iOS 가 멈춰 둬서 탭을 기다리는 동안(armed)은 빈 칸 (누르면 켜진다).
     켜는 중(starting)·소리를 못 내는 곳(reason — 기억은 켜짐)은 체크 */
  function isLit() { return pref.on && (!!reason || starting || !armed); }
  function paint() {
    if (btn) btn.checked = isLit();
    if (noteEl) { var t = noteText(); noteEl.textContent = t; noteEl.hidden = !t; }
  }
  /* '켜기' 체크 칸을 바꿨다 (톡 · Space · 글자 톡). 체크 표시는 브라우저가 이미 뒤집었지만 늘 paint() 로 실제 상태에 맞춘다 */
  function onToggle() {
    if (pref.on && !isLit()) {   /* 탭을 기다리던 중(빈 칸으로 보임) → 이 탭이 첫 동작: 다시 흐르게 */
      if (started && ctx) { try { ctx.resume().catch(noop); } catch (x) { /* noop */ } } else start(true);
    } else setEnabled(!pref.on, true);
    paint();
  }
  /* 설정 시트 › 소리 칸 맨 위 줄: 다른 켜고 끄기 줄('픽셀 글꼴' · '포스터 썸네일')과 같은 모양 <label class="set"><span>켜기</span><input type=checkbox></label>.
     보이는 글자는 '켜기' — 바로 위 칸 제목이 '소리' 라 '소리 / 소리' 로 겹쳐 읽히지 않게. 화면 낭독기 이름은 제목 + 글자 = '소리 켜기' (aria-labelledby).
     시트는 열 때마다 새로 그려서 그때마다 새 체크 칸에 묶고 칠한다 */
  function toggleRow() {
    var inp = el('input', { type: 'checkbox', id: 'set-sound', 'aria-labelledby': 'rs-sound set-sound-lbl', 'aria-describedby': 'rs-sound-note' });
    inp.addEventListener('change', guard(onToggle));
    btn = inp;
    var row = el('label', { class: 'set', id: 'set-sound-row' });
    row.appendChild(el('span', { id: 'set-sound-lbl' }, '켜기')); row.appendChild(inp);
    return row;
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
    frag.appendChild(toggleRow());
    frag.appendChild(slider('음악', 'music', 'set-music'));
    frag.appendChild(slider('효과음', 'sfx', 'set-sfx'));
    noteEl = frag.appendChild(el('p', { class: 'help snd-note', id: 'rs-sound-note' }));
    paint();
  }
  function isSheet(x) { return !!(x && x.tagName === 'DIALOG' && x.classList && x.classList.contains('sheet')); }
  /* 시트를 여닫는 버튼: 소리는 시트가 낸다 (bindSheets) — aria-controls 로 시트를 가리키는 버튼 · 시트 안의 닫기 버튼(…-close / '닫기') */
  function sheetButton(b) {
    var c = b.getAttribute('aria-controls');
    if (c && isSheet(document.getElementById(c))) return true;
    return !!b.closest('dialog.sheet') && (/(^|-)close$/.test(b.id || '') || (b.textContent || '').trim() === '닫기');
  }
  function bindClicks() {
    /* 주요 버튼의 작은 소리 (sfx_ui). 다녀와(움츠림 징글)·장면 안(앨범·설정·놀이방 문 아이콘 포함)·시트 여닫기는 빼고.
       설정 › 소리의 '켜기' 체크 칸은 단추가 아니라 여기 안 걸린다 — 켤 때 audio_on · 끌 때 toggle_off 가 그 칸의 소리 */
    document.addEventListener('click', guard(function (e) {
      if (!active()) return;
      var b = e.target && e.target.closest ? e.target.closest('button, summary') : null;
      if (!b || b.disabled || b.closest('#scene, .ck-stage, .ck-verbrow')) return;   /* 부엌 무대(소품)·동사 단추: 그 손길은 부엌 소리(cook act)가 낸다 */
      var id = b.id, U = mp().ui || {};
      if (id === 'btn-go' || id === 'btn-look' || sheetButton(b)) return;   /* btn-look = 옛 방 보기 (7물결에 지움 — 남아 있는 동안만) */
      if (id === 'pd-close') play(U.sheet_close);
      else if (id === 'pd-flip' || id === 'pd-front') play(U.card_flip);
      else if (b.classList.contains('pcard')) play(U.album_open);
      else play(U.tap);
    }), true);
  }
  /* 시트(dialog.sheet — 앨범 · 설정 · 앞으로 생길 시트) 여닫기 = open 속성. 같은 순간에 하나 닫고 하나 열면 여는 소리만 */
  function bindSheets() {
    if (typeof MutationObserver !== 'function' || !document.documentElement) return;
    new MutationObserver(guard(function (recs) {
      if (!active()) return;
      var opened = false, closed = false;
      recs.forEach(function (r) {
        if (!isSheet(r.target)) return;
        var was = r.oldValue !== null, is = r.target.hasAttribute('open');
        if (is && !was) opened = true; else if (!is && was) closed = true;
      });
      var U = mp().ui || {};
      if (opened) play(U.sheet_open); else if (closed) play(U.sheet_close);
    })).observe(document.documentElement, { attributes: true, attributeFilter: ['open'], attributeOldValue: true, subtree: true });
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
      ckBed();   /* 효과음을 0 으로 내렸으면 부엌 덕킹도 푼다 */
    } catch (e) { warn('setVolume', e); }
  }
  function init(opts) {
    try {
      opts = opts || {};
      ['hour', 'weather', 'lantern', 'season'].forEach(function (k) { if (typeof opts[k] === 'function') game[k] = opts[k]; });
      if (typeof opts.base === 'string') BASE = opts.base;
      if (typeof opts.foley === 'string') FOLEY = opts.foley;
      if (opts.warm === false) noWarm = true;
      readGame();
      if (!inited) {
        inited = true;
        loadPref(); syncVol();
        rnd = mulberry32(hashStr('ppolppol-audio|' + todayKey()));
        bindClicks(); bindSheets(); bindVisibility();
      }
      /* 페이지가 켜 달라고 한다 (cook.html ?sound=1): 이 페이지에서만 켠다 — 저장하지 않는다 (pageOn). 그래도 소리는 첫 사용자 동작에서 (arm) */
      if (opts.on === true && !pref.on) { pref.on = true; pageOn = true; paint(); }
      if (pref.on && !reason && !started && !starting) arm();
      if (pref.on && !reason && !started && cookOpen()) prefetchCook();   /* 부엌 페이지: 첫 손길 전에 목록과 첫 소리 바이트만 */
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
      cached: Object.keys(cache).length, cacheMB: Math.round(cacheBytes / 1048576),
      cook: { ready: !!FM, loop: slots.cook && !slots.cook.dead ? slots.cook.id : null, loading: loading.cook || null, band: CK.band, bed: CK.bed,
        duck: nd.ckB ? Math.round(nd.ckB.gain.value * 1000) / 1000 : 1, ambDuck: nd.ckA ? Math.round(nd.ckA.gain.value * 1000) / 1000 : 1,
        pre: Object.keys(pre), pageOn: pageOn, log: CK.log.slice() }   /* 부엌: 도는 루프 · 불 · 덕킹 단계(0 · 1 열림 · 2 지글)와 크기 · 미리 받은 바이트 · 루프 기록(start · xfade · resume · stop) */
    };
  }
  var api = {
    init: init, on: on,
    setEnabled: function (b) { setEnabled(b, false); },
    enabled: function () { return pref.on; },
    setVolume: setVolume, state: state
  };
  /* app.js 가 init 을 안 불러도 설정·탭 대기는 동작하게 (init 은 여러 번 불러도 된다 — 뒤의 것이 게임 값 읽는 함수만 바꾼다) */
  window.addEventListener('load', function () { if (!inited) init({}); });
  return api;
})();
