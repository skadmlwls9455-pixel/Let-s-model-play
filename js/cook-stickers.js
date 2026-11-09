/* ═══════════════════════════════════════════════════════════════════
   뽈뽈 문어 — js/cook-stickers.js (전역 COOK_STICKERS) · 요리 반응 스티커 (docs/COOK_STICKERS.md)

   요리하는 동안 화면 가장자리에 요리사 모자 쓴 문어 스티커가 톡 떴다 사라진다 (방송 이모트처럼).
   그림 19종: assets/stickers/cook/*.png (32×32, node tools/make-stickers.js). 정수 배(×2 · ×3)로만 띄운다.
   엔진(PPOL_STICKERS)도 이 파일에 있다 — 달리기·헤엄 세트(js/play-stickers.js)가 같이 쓴다 (docs/PLAY_STICKERS.md).

   발동은 자동이다. 요리 놀이(cook.js, 카드 7)가 이미 소리 훅으로 부르는 순간마다 한 줄만 더 부르면 된다:
       window.COOK_STICKERS && COOK_STICKERS.cue(act, detail)
     act: 'start' 판 시작 · 'drop' 재료 떨어뜨림 · 'merge' 합쳐짐 ({tier, ingredient}) · 'full' 냄비 가득
          'done' 요리 완성 ({dish, reason:'full'|'chosen'}) · 'serve' 식탁에 차리기 · 'eat' 네 그릇 톡(냠) · 'idle' 한참 손 안 댐
   또는 window 에 CustomEvent('ppol:cook', { detail: { act, ... } }) 를 쏘아도 같다 (cook.js 가 이 파일을 몰라도 됨).

   무엇을 띄우나:
     1) 지금 만드는 요리의 '요리 스크립트'(RECIPES[dish].cues)에 맞는 줄이 있으면 그것 (먼저 맞는 줄 하나)
     2) 없으면 공통 규칙(RULES)
     같은 줄이 여러 스티커를 주면 판 시드(mulberry32)로 고른다. 확률(chance)도 같은 시드. 시드 없는 난수는 쓰지 않는다.
   요리 스크립트는 begin({ runId, recipe }) 로 고르거나, 도중에 setRecipe(id) / done 의 detail.dish 로 정해진다.

   정직 규칙 (cozy-web-game 중요 1·3, DELEGATION 카드 7):
     - 스티커는 그림뿐, 글자를 띄우지 않는다. 맛 평가·취향 말을 코드가 쓰지 않는다 (카드 7 의 금지 낱말 검사와 같다).
     - 문어가 산책 중일 때 요리하므로 스티커는 '문어가 지금 이렇게 반응했다'가 아니라 놀이 화면의 장식이다.
       그래서 기록(log)에는 by:'demo-rules' 로 남기고, 문어 기록(trips)·두뇌 입력·모델 요청에는 넣지 않는다 (CORE_LOOP_V2 약속 2).
     - 벌·실패 표시 없음: 냄비가 가득 차도 '진땀' 정도. 우는 스티커는 '감동'(반짝 눈물)뿐.
   모션: 등장 250 ms (decelerate) → 머묾 1.4 s → 퇴장 180 ms. 모션 줄이기면 위치 이동 없이 투명도만.
   일반 스크립트 · 모듈 없음 · file:// 그대로. DOM 이 없으면(node 테스트) pick 만 하고 그리지 않는다.
   ═══════════════════════════════════════════════════════════════════ */
/* ── 엔진 (요리·달리기·헤엄 세트가 같이 쓴다. 전역 PPOL_STICKERS.make(cfg) → 세트 하나) ──
   cfg: { set, catalog, rules, scripts?, scriptArg?, scriptLabel?, scriptFrom?(act, d), big?, slots?, base? }
   다른 세트 파일 (js/play-stickers.js) 은 이 파일 다음에 싣는다. */
var PPOL_STICKERS = (function () {
  'use strict';
  /* ── 시드 PRNG (게임과 같은 FNV-1a + mulberry32) ── */
  function hashStr(s) { var x = 2166136261; for (var i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function dateKey(d) { d = d || new Date(); var p = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
  function reduced() {
    if (typeof document === 'undefined') return false;
    var m = document.documentElement.getAttribute('data-motion');
    if (m === 'reduce') return true;
    if (m && m !== 'auto') return false;
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  /* 놓는 자리 6곳 (판 가장자리, 가운데는 비운다) */
  var DEFAULT_SLOTS = [
    { l: '4%', t: '6%' }, { r: '4%', t: '6%' }, { l: '2%', t: '40%' },
    { r: '2%', t: '40%' }, { l: '8%', b: '8%' }, { r: '8%', b: '8%' }
  ];
  var sets = {};

  function make(cfg) {
    var GAP_MS = 900;          /* 스티커 사이 쉬는 틈 (force 는 무시) */
    var MAX_ON_SCREEN = 3;
    var LIFE_MS = 250 + 1400 + 180;

    /* ── 시드 PRNG (게임과 같은 FNV-1a + mulberry32) ── */
    function hashStr(s) { var x = 2166136261; for (var i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
    function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    function dateKey(d) { d = d || new Date(); var p = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }

    var SET = cfg.set, CATALOG = cfg.catalog, RULES = cfg.rules || [], SCRIPTS = cfg.scripts || {};
    var BIG_MOMENT = cfg.big || {};   /* 이 순간들은 쉬는 틈과 상관없이 띄운다 */
    var SLOTS = cfg.slots || DEFAULT_SLOTS;
    var run = null;            /* { id, script, rng, counts, used, lastAt, n } */
    var log = [];
    var host = null, opts = { scale: 0, src: null, now: null };
    var listeners = [];

    function now() { return opts.now ? opts.now() : Date.now(); }
    function begin(o) {
      o = o || {};
      var id = String(o.runId != null ? o.runId : SET + '|' + dateKey() + '|' + log.length), sc = o.script != null ? o.script : o[cfg.scriptArg || 'script'];
      run = { id: id, script: sc && SCRIPTS[sc] ? sc : null, rng: mulberry32(hashStr('ppolppol-' + SET + '-stickers|' + id)), counts: {}, used: {}, lastAt: -1e9, n: 0 };
      return run.id;
    }
    function setScript(id) { if (!run) begin(); run.script = SCRIPTS[id] ? id : null; return run.script; }
    function end() { var r = run; run = null; return r ? r.id : null; }

    function matches(rule, act, d, count, key) {
      if (rule.on !== act) return false;
      if (rule.tier != null && d.tier !== rule.tier) return false;
      if (rule.minTier != null && !(d.tier >= rule.minTier)) return false;
      if (rule.ingredient != null && d.ingredient !== rule.ingredient) return false;
      if (rule.reason != null && d.reason !== rule.reason) return false;
      if (rule.who != null && d.who !== rule.who) return false;
      if (rule.status != null && d.status !== rule.status) return false;
      if (rule.is) for (var k in rule.is) if (d[k] !== rule.is[k]) return false;
      if (rule.atLeast) for (var k2 in rule.atLeast) if (!(d[k2] >= rule.atLeast[k2])) return false;
      if (rule.atMost) for (var k3 in rule.atMost) if (!(d[k3] <= rule.atMost[k3])) return false;
      if (rule.nth != null && count !== rule.nth) return false;
      if (rule.every != null && count % rule.every !== 0) return false;
      if (rule.once && run.used[key]) return false;
      return true;
    }
    function choose(pick) {
      if (!Array.isArray(pick)) return pick;
      return pick[Math.floor(run.rng() * pick.length) % pick.length];
    }

    /* cue: 놀이 순간 하나 → 띄운 스티커 id (안 띄웠으면 null) */
    function cue(act, detail) {
      var d = detail || {};
      if (!act || typeof act !== 'string') return null;
      var arg = cfg.scriptArg || 'script';
      if (act === 'start' || !run) { var b = { runId: d.runId }; b[arg] = d[arg] != null ? d[arg] : d.script; begin(b); }
      if (d[arg] && !run.script) setScript(d[arg]);
      var fromAct = cfg.scriptFrom && cfg.scriptFrom(act, d);   /* 순간이 스크립트를 정해 줄 때 (요리: done 의 dish.id) */
      if (fromAct && SCRIPTS[fromAct]) run.script = fromAct;
      var count = run.counts[act] = (run.counts[act] || 0) + 1;

      var rec = run.script && SCRIPTS[run.script], rule = null, key = null, i;
      if (rec) for (i = 0; i < rec.cues.length; i++) { var k1 = 'r:' + run.script + ':' + i; if (matches(rec.cues[i], act, d, count, k1)) { rule = rec.cues[i]; key = k1; break; } }
      if (!rule) for (i = 0; i < RULES.length; i++) { var k2 = 'g:' + i; if (matches(RULES[i], act, d, count, k2)) { rule = RULES[i]; key = k2; break; } }
      if (!rule) return null;

      /* 확률·고르기는 규칙이 맞을 때마다 같은 순서로 rng 를 쓴다 → 같은 판 id + 같은 순간 순서 = 같은 스티커 */
      var roll = run.rng(), sticker = choose(rule.pick);
      if (rule.chance != null && roll >= rule.chance) return null;
      var t = now();
      if (!rule.force && !BIG_MOMENT[act] && t - run.lastAt < GAP_MS) return null;
      if (!CATALOG[sticker]) return null;

      run.used[key] = true; run.lastAt = t; run.n++;
      var entry = { i: log.length, run: run.id, act: act, sticker: sticker, set: SET, from: key.charAt(0) === 'r' ? (cfg.scriptLabel || 'script') + ':' + run.script : 'rule', by: 'demo-rules', t: t };
      log.push(entry); if (log.length > 200) log.shift();
      show(sticker, { slot: Math.floor(run.rng() * 1000) });
      listeners.forEach(function (fn) { try { fn(entry); } catch (e) { /* 듣는 쪽 오류는 삼킨다 */ } });
      return sticker;
    }

    /* ── 그리기 ── */
    /* anim=true 면 움직이는 스트립 (assets/stickers/<세트>/<id>_anim.png, manifest sticker.<세트>.<id>.anim) */
    function srcOf(id, anim) {
      if (opts.src) return opts.src(id, anim);
      var m = (typeof window !== 'undefined') && (window.ASSETS_INLINE || window.ASSETS), a = m && m['sticker.' + SET + '.' + id + (anim ? '.anim' : '')];
      return (a && (typeof a === 'string' ? a : a.src)) || ((cfg.base || '') + 'assets/stickers/' + SET + '/' + id + (anim ? '_anim' : '') + '.png');
    }
    function mount(el, o) {
      host = el || null; o = o || {};
      if (o.scale) opts.scale = o.scale | 0;
      if (o.src) opts.src = o.src;
      if (o.now) opts.now = o.now;
      if (host && typeof getComputedStyle !== 'undefined' && getComputedStyle(host).position === 'static') host.style.position = 'relative';
      return api;
    }
    function show(id, o) {
      if (!host || typeof document === 'undefined' || !CATALOG[id]) return null;
      o = o || {};
      var live = host.querySelectorAll('.cook-sticker');
      if (live.length >= MAX_ON_SCREEN) live[0].remove();
      var scale = opts.scale || (host.clientWidth && host.clientWidth < 420 ? 2 : 3);
      var used = {}; Array.prototype.forEach.call(live, function (n) { used[n.dataset.slot] = true; });
      var s = (o.slot || 0) % SLOTS.length, tries = 0;
      while (used[s] && tries++ < SLOTS.length) s = (s + 1) % SLOTS.length;
      var p = SLOTS[s], size = 32 * scale, frames = CATALOG[id].anim | 0, img;
      if (frames > 1 && !reduced()) {
        /* 움직이는 스티커: 바깥 칸은 등장·퇴장, 안쪽 칸은 스트립을 4 fps 로 넘긴다 (css steps). 칸 0 = 정지 그림 */
        img = document.createElement('div');
        img.setAttribute('role', 'img'); img.setAttribute('aria-label', CATALOG[id].alt);
        var fr = document.createElement('span'), anim = srcOf(id, true);
        fr.className = 'cook-sticker-frames';
        fr.style.setProperty('--frames', frames); fr.style.setProperty('--w', size + 'px');
        fr.style.setProperty('--ms', Math.round(1000 / (CATALOG[id].fps || 4)) + 'ms');   /* 칸 하나 머무는 시간 (기본 4 fps) */
        fr.style.backgroundImage = 'url("' + anim + '")';
        fr.style.backgroundSize = (size * frames) + 'px ' + size + 'px';
        img.appendChild(fr);
        /* 스트립을 못 받으면 정지 그림으로 (그것도 없으면 아래 onerror 처럼 지운다) */
        var probe = new Image();
        probe.onerror = function () {
          var still = new Image();
          still.onload = function () { fr.classList.add('is-still'); fr.style.backgroundImage = 'url("' + still.src + '")'; fr.style.backgroundSize = size + 'px ' + size + 'px'; };
          still.onerror = function () { img.remove(); };
          still.src = srcOf(id);
        };
        probe.src = anim;
      } else {
        img = document.createElement('img');
        img.src = srcOf(id); img.alt = CATALOG[id].alt; img.width = size; img.height = size;
        img.decoding = 'async'; img.draggable = false;
        img.onerror = function () { img.remove(); };   /* 그림이 없으면 조용히 지운다 (이모지로 대신하지 않는다) */
      }
      img.className = 'cook-sticker' + (reduced() ? ' is-reduced' : '');
      img.dataset.sticker = id; img.dataset.slot = s;
      img.style.width = img.style.height = size + 'px';
      ['l', 'r', 't', 'b'].forEach(function (k) { if (p[k]) img.style[{ l: 'left', r: 'right', t: 'top', b: 'bottom' }[k]] = p[k]; });
      host.appendChild(img);
      setTimeout(function () { img.classList.add('is-out'); }, LIFE_MS - 180);
      setTimeout(function () { img.remove(); }, LIFE_MS + 40);
      return img;
    }

    /* 소리 훅과 같은 모양의 이벤트도 받는다: window.dispatchEvent(new CustomEvent('ppol:<세트>', { detail: { act, ... } })) */
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('ppol:' + SET, function (e) { var d = (e && e.detail) || {}; cue(d.act, d); });
    }

    var api = {
      SET: SET, CATALOG: CATALOG, RULES: RULES, SCRIPTS: SCRIPTS,
      mount: mount, begin: begin, setScript: setScript, end: end, cue: cue, show: show,
      onFire: function (fn) { if (typeof fn === 'function') listeners.push(fn); },
      log: function () { return log.slice(); },
      current: function () { return run ? { id: run.id, script: run.script, fired: run.n } : null; },
      _hash: hashStr
    };
    sets[SET] = api;
    return api;
  }
  return { make: make, sets: sets, hash: hashStr };
})();

/* ── 요리 세트 ── */
var COOK_STICKERS = (function () {
  'use strict';

  /* ── 그림 19종 (라벨은 개발용 · 대체 글은 그림 설명이지 문어의 말이 아니다) ── */
  var CATALOG = {
    thumbs:      { label: '따봉',   alt: '엄지 척 하는 요리사 문어 스티커' },
    moved:       { label: '감동',   alt: '반짝이는 눈물을 흘리는 요리사 문어 스티커' },
    heart_plate: { label: '한 접시', alt: '하트 얹은 접시를 내미는 요리사 문어 스티커' },
    star:        { label: '다 됐다', alt: '별을 높이 든 요리사 문어 스티커' },
    shock:       { label: '깜짝',   alt: '눈이 휘둥그레진 요리사 문어 스티커' },
    taste:       { label: '맛보기', alt: '숟가락을 입에 댄 요리사 문어 스티커' },
    stir:        { label: '휘휘',   anim: 2,   alt: '냄비를 젓는 요리사 문어 스티커' },
    sweat:       { label: '진땀',   alt: '진땀 흘리며 힘주는 요리사 문어 스티커' },
    cheer:       { label: '만세',   anim: 2, fps: 3,   alt: '다리 둘을 번쩍 든 요리사 문어 스티커' },
    peek:        { label: '빼꼼',   alt: '냄비 가장자리 위로 빼꼼 내다보는 요리사 문어 스티커' },
    clap:        { label: '짝짝',   anim: 2,   alt: '다리 둘을 앞에서 맞대고 짝 하고 박수 치는 요리사 문어 스티커' },
    munch:       { label: '냠',     alt: '볼 빵빵하게 오물거리는 요리사 문어 스티커' },
    sleepy:      { label: '꾸벅',   anim: 2, fps: 2,   alt: '꾸벅 조는 요리사 문어 스티커' },
    hmm:         { label: '갸웃',   alt: '고개를 갸웃하는 요리사 문어 스티커' },
    love:        { label: '뿅',     alt: '하트 눈의 요리사 문어 스티커' },
    sprinkle:    { label: '솔솔',   alt: '양념병을 기울여 솔솔 뿌리는 요리사 문어 스티커' },
    busy:        { label: '바빠',   alt: '다리 여러 개로 국자·거품기·뒤집개를 한꺼번에 든 요리사 문어 스티커' },
    ink:         { label: '퓻',     anim: 3, fps: 6,     alt: '깜짝 놀라 먹물을 뿜는 요리사 문어 스티커' },
    flush:       { label: '두근',   anim: 4,   alt: '몸 색이 분홍으로 물든 요리사 문어 스티커' }
  };

  /* ── 공통 규칙: 요리 스크립트에 맞는 줄이 없을 때 ──
     조건 키: on(act) · tier(정확히) · minTier · ingredient · nth(그 act 의 n번째) · every(n번마다) · reason · once
     pick: 스티커 하나 또는 배열(시드로 고름) · chance: 0~1 (기본 1) · force: 쉬는 틈(gap) 무시 */
  var RULES = [
    { on: 'start', pick: ['peek', 'stir'], chance: 0.8 },
    { on: 'drop', nth: 1, pick: 'peek' },
    { on: 'drop', every: 4, pick: ['stir', 'sprinkle', 'hmm', 'busy'], chance: 0.6 },
    { on: 'merge', minTier: 5, pick: ['shock', 'love', 'ink'], force: true },
    { on: 'merge', minTier: 3, pick: ['thumbs', 'clap'], chance: 0.7 },
    { on: 'merge', pick: ['thumbs', 'stir', 'taste'], chance: 0.25 },
    { on: 'full', pick: 'sweat', force: true },
    { on: 'done', reason: 'full', pick: ['star', 'cheer'], force: true },
    { on: 'done', pick: ['star', 'moved', 'cheer', 'flush'], force: true },
    { on: 'serve', pick: 'heart_plate', force: true },
    { on: 'eat', pick: ['munch', 'taste'] },
    { on: 'idle', pick: 'sleepy', once: true }
  ];

  /* ── 요리 스크립트: 요리마다 정해 둔 순간 → 스티커 ──
     id 는 요리 놀이(카드 7)의 dish.id 와 맞춘다. 카드 7 이 실제 id 를 정하면 여기 키만 바꾸면 된다.
     cues 는 위에서부터 보고 먼저 맞는 줄 하나만 쓴다. 맞는 줄이 없으면 공통 규칙으로 내려간다. */
  var RECIPES = {
    seaweed_soup: { name: '미역국', cues: [
      { on: 'drop', ingredient: 'seaweed', nth: 1, pick: 'stir' },
      { on: 'merge', tier: 2, pick: 'taste' },
      { on: 'done', pick: 'moved' },
      { on: 'serve', pick: ['heart_plate', 'munch'] }
    ] },
    scallop_grill: { name: '가리비 구이', cues: [
      { on: 'drop', ingredient: 'scallop', pick: 'sprinkle', chance: 0.5 },
      { on: 'merge', minTier: 3, pick: 'thumbs', force: true },
      { on: 'done', pick: 'star' }
    ] },
    seafood_pancake: { name: '해물 파전', cues: [
      { on: 'merge', tier: 2, pick: 'clap' },
      { on: 'merge', tier: 4, pick: ['shock', 'ink'], force: true },
      { on: 'full', pick: 'sweat', force: true },
      { on: 'done', pick: ['cheer', 'star'] },
      { on: 'serve', pick: 'heart_plate' }
    ] },
    clam_soup: { name: '조개탕', cues: [
      { on: 'drop', every: 3, pick: ['stir', 'busy'] },
      { on: 'merge', minTier: 3, pick: 'taste' },
      { on: 'done', pick: 'moved' },
      { on: 'eat', pick: 'munch' }
    ] },
    shrimp_rice: { name: '새우 볶음밥', cues: [
      { on: 'drop', ingredient: 'shrimp', nth: 1, pick: 'hmm' },
      { on: 'merge', minTier: 3, pick: ['thumbs', 'clap'] },
      { on: 'done', pick: 'cheer' },
      { on: 'serve', pick: 'love' }
    ] },
    star_jelly: { name: '별 젤리', cues: [
      { on: 'merge', minTier: 4, pick: 'love', force: true },
      { on: 'done', pick: ['star', 'flush'] },
      { on: 'serve', pick: ['heart_plate', 'love'] }
    ] }
  };

  var api = PPOL_STICKERS.make({
    set: 'cook', catalog: CATALOG, rules: RULES, scripts: RECIPES,
    scriptArg: 'recipe', scriptLabel: 'recipe',
    scriptFrom: function (act, d) { return act === 'done' && d.dish && d.dish.id; },
    big: { full: true, done: true, serve: true }
  });
  /* 요리 쪽 이름 (카드 7 이 읽은 이름 그대로) */
  api.RECIPES = RECIPES;
  api.setRecipe = api.setScript;
  var cur = api.current;
  api.current = function () { var c = cur(); if (c) c.recipe = c.script; return c; };
  api.make = PPOL_STICKERS.make;
  return api;
})();
if (typeof module !== 'undefined' && module.exports) module.exports = COOK_STICKERS;
