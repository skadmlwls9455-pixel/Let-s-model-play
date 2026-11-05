/* js/play.js — 컵 놀이 프로토타입 v1 (play.html 전용, docs/PLAY_PROTO.md)
   전역: PLAYAPP (+ 테스트 훅 window.__play, 계측 window.__playMetrics). app.js / world.js / brain.js 는 부르지 않는다.
   구조 (주인 추가 E): 고르는 일 = chooser.choose(situation) 하나. 지금은 데모 규칙(시드 PRNG)이 고르고,
   나중엔 모델이 같은 메뉴에서 고른다. 고른 행동 하나를 걷기·뻗기·들기·놓기·굴리기·기록으로 재생하는 일은 전부 로컬이다.
   기록 by: 'user' | 'chooser:<name>' | 'playback'. 재생을 새 결정처럼 보이지 않는다 (영수증엔 결정만).
   내장 난수 금지: 모든 변화는 날짜·배치·판 수로 시드한 mulberry32 (§8.1). 주석은 ASCII 나 이미 쓰는 글자만 (글꼴 서브셋). */
var PLAYAPP = (function () {
  'use strict';

  /* ───────── 설정 (URL) ───────── */
  var Q = (function () { try { return new URLSearchParams(location.search); } catch (e) { return { get: function () { return null; } }; } })();
  function qs(k) { return Q.get(k); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  var SPEED = clamp(parseFloat(qs('speed')) || 1, 0.25, 4);      /* 모든 시간 배율 (작을수록 빠름) */
  var DEBUG = qs('debug') === '1';
  var OCTO_SETUP = qs('octoSetup') !== '0';                       /* 0 이면 문어가 배치를 안 바꾼다 (Q1 측정) */
  var IDLE_ON = qs('idle') !== '0';
  var FRESH = qs('fresh') === '1';
  var HOUR = qs('hour') != null && !isNaN(+qs('hour')) ? +qs('hour') : (function () { var d = new Date(); return d.getHours() + d.getMinutes() / 60; })();
  var NIGHT = HOUR >= 21 || HOUR < 6;
  var MQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var RED = qs('reduced') === '1' || !!(MQ && MQ.matches);

  /* ───────── 시드 (FNV-1a + mulberry32, 로컬 날짜) ───────── */
  function fnv1a(s) { var h = 0x811c9dc5; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; }
  function mulberry32(a) { a >>>= 0; return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function dateKey(d) { function p(n) { return (n < 10 ? '0' : '') + n; } return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
  var DAY = qs('date') || dateKey(new Date()), SEED = qs('seed') || '';
  function rngFor(s) { return mulberry32(fnv1a(DAY + '|' + SEED + '|' + s)); }
  var pbN = 0;
  function pbr(tag) { pbN++; return rngFor('pb|' + tag + '|' + pbN)(); }          /* 재생 변화(받아치기 자리, 미끄러짐, 팔 끝 쪽) — 세션 안 순서로 결정적 */
  function shuffled(list, rng) { var a = list.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* ───────── TEMPO (§5) — 초. kit 의 대기는 kit 이 speed 를 곱하므로 그대로 넘긴다. 실시간 타이머는 tm() ───────── */
  var TEMPO = { settle: 1.0, antic: 0.5, pauseMin: 0.3, pauseMax: 0.6, hold: 0.5, holdAll: 0.8, offerWait: 6, inviteWait: 6, hideAuto: 20, squeezeAuto: 20, camoAuto: 15,
    stopMin: 8, idleMin: 8, idleMax: 15, idleFirst: 8, initiativeCooldown: 30, fidgetMin: 2.5, fidgetMax: 4.5, volleyDelay: 0.3, modelTimeout: 8, novelty: 0.8, glance: 0.6, tipSwitch: 0.4, bob: 1.6, retouch: 10 };
  function tm(k) { return TEMPO[k] * SPEED; }
  function now() { return performance.now() / 1000; }

  /* ───────── 글자 (화면에 나오는 한국어는 전부 여기) ───────── */
  var TX = {
    title: '뽈뽈 문어 · 컵 놀이',
    hint: '공을 톡 쳐 봐',
    honest: '데모 규칙이 고름 · 모델 아님', honestModel: '모델이 고름 · ', honestOther: '규칙이 고름 · ', byDemo: '데모 규칙', byForced: '테스트 강제',
    receipt: '방금 고른 것: ', receiptNone: '아직 고른 게 없어', receiptFallback: '이번엔 고르지 않음 · 그냥 둘러봄',
    reset: '처음처럼',
    nogl: '이 기기에서는 3D 장면을 열 수 없어. 다른 브라우저로 열어 줘.', lost: '3D 장면이 잠깐 멈췄어. 새로고침해 줘.',
    scene: '다락방 바닥의 컵 세 개와 공, 그리고 문어',
    /* 재생 말풍선 (로컬 반사, 기록은 playback) */
    found: ['찾았다', '여기 있네'], empty: '어라? 여긴 없네', slip: '앗, 거기 서!', camoFound: '들켰다', pop: '짠', novel: '?', tapOct: '?', two: '둘이네'
  };
  /* chooser 가 고를 수 있는 대사 (선택, 24자 이하). 데모 규칙은 다 쓰기 전엔 반복하지 않는다 */
  var LINES = {
    lift_one: ['이 컵일까', '여기다'], lift_all: ['다 들면 되지'], lift_next: ['어디 갔지'], two_arms: ['하나씩 잡자'],
    squeeze_in: ['여기 딱 맞겠다'], stop: ['지금은 구경할래', '지금은 안 할래', '이따 할래'], offer_ball: ['자'], offer_two: ['하나는 너'],
    wear_cup_as_hat: ['모자 같아', '어때?'], hide_peek: ['쉿']
  };

  /* ───────── 메뉴 (공용: 데모 규칙과 나중의 모델이 같은 것을 본다, §9.4) ───────── */
  var ALL = ['start', 'fork', 'end', 'idle'];
  var MENU = [
    { id: 'lift_one', kind: 'readable', points: ['start'], target: 'cup', label: '컵 하나 들기', needs: 'ballHidden' },
    { id: 'lift_all', kind: 'quirk', points: ['start', 'fork'], target: null, label: '컵 다 들기', needs: 'twoGroups' },
    { id: 'lift_next', kind: 'readable', points: ['fork'], target: null, label: '다음 컵부터 차례로', needs: 'ballLost' },
    { id: 'two_arms', kind: 'readable', points: ['start'], target: null, label: '팔 둘로 두 컵 들기', needs: 'twoHiddenApart' },
    { id: 'squeeze_in', kind: 'surprise', points: ['start'], target: 'cup', label: '컵 속으로 쏙', needs: 'ballHidden' },
    { id: 'camouflage', kind: 'surprise', points: ['start'], target: null, label: '바닥색으로 숨기', needs: 'shuffled2' },
    { id: 'offer_ball', kind: 'readable', points: ['end'], target: 'ball', label: '공을 내밀고 기다리기', needs: 'holdingBall' },
    { id: 'roll_back', kind: 'readable', points: ['end'], target: 'ball', label: '공 굴려 주기', needs: 'holdingBall' },
    { id: 'bat_alone', kind: 'quirk', points: ['end', 'idle'], target: 'ball', label: '혼자 공 톡톡', needs: 'ballReachable' },
    { id: 'wear_cup_as_hat', kind: 'surprise', points: ['end'], target: 'cup', label: '컵을 머리에 써 보기', needs: 'holdingCup' },
    { id: 'invite_roll', kind: 'readable', points: ['idle'], target: 'ball', label: '공 굴려 놓고 기다리기', needs: 'ballOut' },
    { id: 'hide_peek', kind: 'quirk', points: ['idle'], target: 'cup', label: '빈 컵 속에 숨기', needs: 'emptyCup' },
    { id: 'cover_ball', kind: 'quirk', points: ['idle'], target: 'ball', label: '컵으로 공 덮어 두기', needs: 'coverOk' },
    { id: 'watch', kind: 'rest', points: ALL, target: null, label: '그냥 보기', needs: 'always' },
    { id: 'stop', kind: 'decline', points: ALL, target: null, label: '지금은 안 하기', needs: 'always' }
  ];
  var MENU_BY = {}; MENU.forEach(function (m) { MENU_BY[m.id] = m; });
  var KIND = {}; MENU.forEach(function (m) { KIND[m.id] = m.kind; });
  var SURPRISES = MENU.filter(function (m) { return m.kind === 'surprise'; }).map(function (m) { return m.id; });

  /* NEEDS(c) → false | true | [대상 id...]. c = { point, W, P(지각), found, held, session } — 상태는 게임이 센 사실과 지각만 */
  function cupU(W, id) { var g = W.groups.filter(function (x) { return x.id === id; })[0]; return g ? g.cell[0] : 99; }
  function believedCups(c) { var out = []; c.W.balls.forEach(function (b) { if (!b.under) return; var p = c.P[b.id]; if (p && !p.lost && p.m <= 2 && out.indexOf(b.under) < 0) out.push(b.under); }); return out; }
  function anyLost(c) { return c.W.balls.some(function (b) { var p = c.P[b.id]; return b.under && p && (p.lost || p.m > 2); }); }
  function ruledOut(c) { var r = []; Object.keys(c.P).forEach(function (k) { (c.P[k].ruled || []).forEach(function (id) { if (r.indexOf(id) < 0) r.push(id); }); }); return r; }
  var NEEDS = {
    always: function () { return true; },
    ballHidden: function (c) { return c.W.balls.some(function (b) { return b.under; }) && c.W.groups.length ? c.W.groups.map(function (g) { return g.id; }) : false; },
    twoGroups: function (c) { var r = ruledOut(c); return c.W.groups.filter(function (g) { return r.indexOf(g.id) < 0; }).length >= 2 && c.W.balls.some(function (b) { return b.under; }); },
    ballLost: function (c) { var r = ruledOut(c); return c.point === 'fork' && c.W.balls.some(function (b) { return b.under; }) && c.W.groups.some(function (g) { return r.indexOf(g.id) < 0; }); },
    twoHiddenApart: function (c) {
      var hb = c.W.balls.filter(function (b) { return b.under; }); if (hb.length < 2 || c.W.groups.length < 2) return false;
      var bel = believedCups(c); return !(bel.length === 1 && !anyLost(c));      /* 둘 다 같은 컵이라고 아는 경우만 뺀다 */
    },
    shuffled2: function (c) { return c.W.balls.some(function (b) { var p = c.P[b.id]; return b.under && p && p.m >= 2; }); },
    holdingBall: function (c) { return c.found && c.found.length ? c.found.slice() : false; },
    holdingCup: function (c) { return c.held && c.held.length ? c.held.slice() : false; },
    ballReachable: function (c) { if (c.point === 'end') return c.found && c.found.length ? c.found.slice() : false; var f = c.W.balls.filter(function (b) { return b.free; }).map(function (b) { return b.id; }); return f.length ? f : false; },
    ballOut: function (c) { var f = c.W.balls.filter(function (b) { return b.free; }).map(function (b) { return b.id; }); return f.length ? f : false; },
    emptyCup: function (c) {
      if (anyLost(c)) return false;                                               /* 어디 있는지 모르는 공이 있으면 '빈 컵'을 모른다 */
      var bel = believedCups(c), e = c.W.groups.filter(function (g) { return bel.indexOf(g.id) < 0 && !g.top; }).map(function (g) { return g.id; });
      return e.length ? e : false;
    },
    coverOk: function (c) { if (!OCTO_SETUP || !c.session || c.session.userHid || c.session.covers >= 2) return false; var f = c.W.balls.filter(function (b) { return b.free; }).map(function (b) { return b.id; }); return f.length && c.W.groups.length ? f : false; }
  };
  function menuFor(c) {   /* → [{ id, targets? }] (watch·stop 은 늘 있다) */
    var out = [];
    MENU.forEach(function (m) {
      if (m.points.indexOf(c.point) < 0) return;
      var r = NEEDS[m.needs](c); if (!r) return;
      var o = { id: m.id }; if (m.target && Array.isArray(r)) o.targets = r; out.push(o);
    });
    return out;
  }
  function menuStrings(items) { return items.map(function (m) { return m.targets ? m.id + ':' + m.targets.join('|') : m.id; }); }
  function parseMenu(list) { return (list || []).map(function (s) { var i = s.indexOf(':'); return i < 0 ? { id: s } : { id: s.slice(0, i), targets: s.slice(i + 1).split('|') }; }); }

  /* ───────── 상태 ───────── */
  var inst = null, kit = null, stage = null, touchEl = null;
  var BASKET_ON = false, TOUCHED = false, lastInput = now(), lastBob = 0, bootT = now();
  var DAYROUNDS = 0, ROUND = null, LASTKEY = null, SAMERUN = 0;
  var HID = {};                       /* 지각: ball → { by, m(숨긴 뒤 컵 옮김 수), lost, ruled[], t } */
  var SESSION = { userHid: false, covers: 0, seen: { stack: false, two: false, cells: { 2: true, 4: true, 6: true } } };
  var LAST = { by: 'user', act: 'none' }, EVENTS = [], NOTE = null, NOVEL = null;
  var MODE = { name: 'free', until: 0, data: null };
  var EP = { tok: 0, name: null, busy: false, phase: null };
  var PENDING = false, ARM = null;
  var OFFER = null, INVITE = null, COVERED = null;
  var IDLE = { next: TEMPO.idleFirst, last: -1e9, streak: 0, n: 0, afterStop: false };   /* afterStop: '안 할래' 뒤엔 사람이 다시 만지기 전까지 먼저 놀자고 안 한다 */
  var FID = { next: 0, n: 0 };   /* 가만있을 때 작은 몸짓 (재생, 고르지 않음) */
  var DONE = [], LOG = [], LASTDEC = null;
  var STORE_KEY = 'ppolppol_play_v1';
  var M = window.__playMetrics = {
    decisions: [], rounds: [],
    offers: { offer_ball: { shown: 0, retouched10s: 0, ms: [] }, roll_back: { shown: 0, retouched10s: 0, ms: [] }, opening: { shown: 0, retouched10s: 0, ms: [] } },
    initiative: { invite_roll: { shown: 0, accepted: 0, ignored: 0, interrupted: 0 }, hide_peek: { shown: 0, found: 0 }, cover_ball: { shown: 0, found: 0 } },
    setup: { byUser: [], byOctopus: [] }, marks: [], reflexMs: [], reflexFrameMs: [], over: 0,
    tokenMethod: 'ceil(asciiBytes/3) + nonAsciiChars (estimate, not measured)'
  };

  function loadRounds() { if (FRESH) return 0; try { var o = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); if (o && o.day === DAY && o.rounds >= 0) return o.rounds | 0; } catch (e) { /* 저장 불가: 메모리 카운터 */ } return 0; }
  function saveRounds(n) { try { localStorage.setItem(STORE_KEY, JSON.stringify({ day: DAY, rounds: n })); } catch (e) { /* noop */ } }

  /* ───────── 기록 (주인 추가 D) ───────── */
  function tNow() { return +(now() - bootT).toFixed(2); }
  function log(actor, by, action, objects, extra) {
    var e = { t: tNow(), round: ROUND ? ROUND.n : null, actor: actor, by: by, action: action, objects: (objects || []).filter(function (x) { return x != null; }) };
    if (extra) Object.keys(extra).forEach(function (k) { if (extra[k] !== undefined) e[k] = extra[k]; });
    LOG.push(e); if (LOG.length > 500) LOG.splice(0, LOG.length - 500);
    return e;
  }
  function ulog(action, objects, extra) { return log('user', 'user', action, objects, extra); }
  function plog(action, objects, extra) { return log('octopus', 'playback', action, objects, extra); }
  function event(s, replacePrefix) {   /* situation.recent 용 짧은 사실 (영어, ASCII) */
    if (replacePrefix && EVENTS.length && EVENTS[EVENTS.length - 1].indexOf(replacePrefix) === 0) EVENTS[EVENTS.length - 1] = s; else EVENTS.push(s);
    if (EVENTS.length > 12) EVENTS.shift();
  }

  /* ───────── 세계 보기 (kit 상태 → 평범한 데이터) ───────── */
  function world() {
    var s = kit.state(), toys = s.toys, cups = [], balls = [], groups = [];
    function base(id) { var t = toys[id], g = 0; while (t && t.on && toys[t.on] && g++ < 4) t = toys[t.on]; return t; }
    Object.keys(toys).forEach(function (id) { var t = toys[id]; t.id = id; if (t.kind === 'cup') cups.push(t); else if (t.kind === 'ball') balls.push(t); });
    cups.forEach(function (c) { if (!c.on && !c.attach) groups.push({ id: c.id, cell: c.cell, x: c.x, z: c.z, top: null, lift: c.lift }); });
    cups.forEach(function (c) { if (c.on) { var b = base(c.id); groups.forEach(function (g) { if (b && g.id === b.id) g.top = c.id; }); } });
    groups.sort(function (a, b) { return a.cell[0] - b.cell[0] || a.cell[1] - b.cell[1]; });
    var bl = balls.map(function (b) {
      var inPlay = b.id !== 'b2' || BASKET_ON, cb = b.cover && toys[b.cover] ? base(b.cover) : null;
      var under = inPlay && cb && !cb.attach && cb.lift < 3 ? cb.id : null;
      var held = b.attach ? (b.attach.indexOf('arm:') === 0 ? 'arm' : b.attach) : null;
      return { id: b.id, cell: b.cell, x: b.x, z: b.z, under: under, coverRaw: cb ? cb.id : null, held: held, inBasket: !!b.inBasket, inPlay: inPlay, free: inPlay && !cb && !b.inBasket && !held };
    }).filter(function (b) { return b.inPlay; });
    var heldCups = cups.filter(function (c) { return c.attach && c.attach.indexOf('arm:') === 0 && !c.on; }).map(function (c) { return c.id; });
    var hat = cups.filter(function (c) { return c.attach === 'head'; }).map(function (c) { return c.id; })[0] || null;
    return { s: s, toys: toys, cups: cups, groups: groups, balls: bl, heldCups: heldCups, hat: hat, oct: s.oct };
  }
  function perception() {   /* 지각 사본 (chooser 쪽에는 이것만 간다) */
    var P = {}; Object.keys(HID).forEach(function (k) { var h = HID[k]; P[k] = { m: h.m, lost: !!h.lost, ruled: (h.ruled || []).slice() }; }); return P;
  }
  function syncHID(W) {
    W = W || world();
    W.balls.forEach(function (b) {
      if (b.under) { if (!HID[b.id]) HID[b.id] = { by: 'octopus', m: 0, lost: false, ruled: [], t: now() }; }
      else if (HID[b.id] && !b.coverRaw) delete HID[b.id];   /* 컵이 잠깐 들린 동안(들춰 보기)은 지각을 지우지 않는다 */
    });
    Object.keys(HID).forEach(function (k) { if (!W.balls.some(function (b) { return b.id === k; })) delete HID[k]; });
  }
  function trackedOf(P, id) { var p = P[id]; if (!p) return null; return p.lost || p.m > 2 ? 'lost' : p.m === 0 ? 'sure' : 'unsure'; }
  function worstTracked(W, P) { var order = { sure: 0, unsure: 1, lost: 2 }, w = null; W.balls.forEach(function (b) { if (!b.under) return; var t = trackedOf(P, b.id) || 'sure'; if (w == null || order[t] > order[w]) w = t; }); return w; }
  function perceivedAt(P, b) {
    if (b.inBasket) return 'basket';
    if (b.held) return 'held';
    if (b.under) { var t = trackedOf(P, b.id) || 'sure'; return t === 'lost' ? 'under:?' : 'under:' + b.under + (t === 'unsure' ? '?' : ''); }
    return 'cell:' + b.cell[0] + ',' + b.cell[1];
  }
  function setupKeyOf(sit) {   /* 지각한 배치 (진짜 위치가 아니라 situation 에 든 것) */
    return sit.cups.map(function (c) { return c.id + '@' + c.cell.join(',') + (c.on ? '^' + c.on : ''); }).sort().join(';') + '|' + sit.balls.map(function (b) { return b.id + '=' + b.at; }).sort().join(';');
  }

  var NOTE_MAX = 40;   /* chooser 의 자기 메모 상한 (§9.3) */
  /* ───────── situation (보내는 방 설명, §9.3) — 순수 함수: W(배치) + P(지각) + ctx ───────── */
  function octState() { return MODE.name === 'hidden' ? 'hidden:' + (MODE.data && MODE.data.cup) : MODE.name === 'camo' ? 'camo' : MODE.name === 'hat' ? 'hat' : MODE.name === 'stop' ? 'stop' : 'free'; }
  function buildSituation(point, W, P, ctx) {
    ctx = ctx || {};
    var c = { point: point, W: W, P: P, found: ctx.found, held: ctx.held, session: ctx.session || SESSION };
    var items = menuFor(c), facts = {};
    var tr = worstTracked(W, P); if (tr) facts.tracked = tr;
    var mv = 0; Object.keys(P).forEach(function (k) { mv = Math.max(mv, P[k].m || 0); }); if (mv) facts.moves = mv;
    facts.same_setup_runs = ctx.sameRun != null ? ctx.sameRun : SAMERUN;
    var hiddenN = W.balls.filter(function (b) { return b.under; }).length; if (hiddenN) facts.hidden = hiddenN;
    var ro = ruledOut(c); if (ro.length) facts.ruled_out = ro;
    if (ctx.found && ctx.found.length) facts.found = ctx.found.slice();
    if (ctx.novel) facts.novel = ctx.novel;
    if (point === 'idle' && ctx.idleS != null) facts.idle_s = ctx.idleS;
    var sit = {
      v: 1, id: ctx.id || ('r' + (ctx.round || 0) + '.' + point), point: point, round: ctx.round || 0,
      cups: [], balls: W.balls.map(function (b) { return { id: b.id, at: perceivedAt(P, b) }; }),
      oct: { cell: W.oct.cell, state: ctx.octState || 'free' },
      last: ctx.last || { by: 'user', act: 'none' },
      recent: (ctx.recent || []).slice(-3),
      facts: facts,
      note: ctx.note == null ? null : String(ctx.note).slice(0, NOTE_MAX),
      menu: menuStrings(items)
    };
    W.groups.forEach(function (g) { sit.cups.push({ id: g.id, cell: g.cell.slice() }); if (g.top) sit.cups.push({ id: g.top, cell: g.cell.slice(), on: g.id }); });
    (W.heldCups || []).forEach(function (id) { sit.cups.push({ id: id, cell: W.oct.cell.slice(), held: true }); });
    if (W.hat) sit.cups.push({ id: W.hat, cell: W.oct.cell.slice(), hat: true });
    while (JSON.stringify(sit).length > 1200 && sit.recent.length) sit.recent.shift();   /* 상한 1,200 바이트: recent 부터 줄인다 */
    return sit;
  }
  function situationNow(point, extra) {
    var W = world(); syncHID(W);
    extra = extra || {};
    var idleS = point === 'idle' ? Math.round((now() - lastInput) / SPEED) : null;
    return buildSituation(point, W, perception(), {
      id: point === 'idle' ? 'idle' + IDLE.n : 'r' + (ROUND ? ROUND.n : DAYROUNDS) + '.' + point,
      round: ROUND ? ROUND.n : DAYROUNDS, found: extra.found, held: extra.held, novel: point === 'start' ? NOVEL : null, idleS: idleS,
      octState: octState(), last: LAST, recent: EVENTS, note: NOTE
    });
  }

  /* ───────── 계측 (§9.7, 사람에겐 안 보임) ───────── */
  function utf8Bytes(s) { try { return new TextEncoder().encode(s).length; } catch (e) { return unescape(encodeURIComponent(s)).length; } }
  function approxTokens(s) { var a = 0, n = 0; for (var i = 0; i < s.length; i++) { if (s.charCodeAt(i) < 128) a++; else n++; } return Math.ceil(a / 3) + n; }

  /* ───────── 데모 규칙 chooser (§8) — situation 만 본다. 진짜 공 위치는 모른다 ───────── */
  var DEMO_W = {   /* 데모 규칙의 취향. 모델에게는 보내지 않는다 */
    lift_one: function (s) { var t = s.facts.tracked; return t === 'sure' ? 50 : t === 'unsure' ? 40 : 30; },
    lift_all: function (s) { return s.facts.tracked === 'lost' ? 18 : 12; },   /* 스펙 20(놓침 x1.5) 에서 낮춤: 시뮬 목표 readable 60~65 % 를 맞추려고 */
    lift_next: function () { return 50; }, two_arms: function () { return 60; },
    squeeze_in: function () { return 8; }, camouflage: function () { return 7; },
    offer_ball: function () { return 40; }, roll_back: function () { return 35; },
    bat_alone: function (s) { return s.point === 'idle' ? 10 : 12; }, wear_cup_as_hat: function () { return 8; },
    invite_roll: function () { return 35; }, hide_peek: function () { return 25; }, cover_ball: function () { return 20; },
    watch: function (s) { return s.point === 'idle' ? 10 : 3; }, stop: function () { return 5; }
  };
  function makeDemoChooser(label) {
    var mem;
    function reset() { mem = { last: null, lastSurprise: null, surpriseRounds: [], bag: null, bagN: 0, lineBags: {}, run: { id: null, n: 0 }, idleN: 0, lastSetup: null, lastIdle: null }; }
    reset();
    function nextLine(key, rng) {
      var L = LINES[key]; if (!L || !L.length) return null;
      if (!mem.lineBags[key] || !mem.lineBags[key].length) mem.lineBags[key] = shuffled(L, rng);
      return mem.lineBags[key].shift();
    }
    function bag(rng) { if (!mem.bag || !mem.bag.length) { mem.bagN++; mem.bag = shuffled(SURPRISES, rngFor('bag|' + mem.bagN)); } return mem.bag; }
    function cupUs(sit, id) { var c = sit.cups.filter(function (x) { return x.id === id; })[0]; return c ? c.cell[0] : 99; }
    function pickW(items, rng) { var tot = 0; items.forEach(function (x) { tot += x.w; }); var r = rng() * tot; for (var i = 0; i < items.length; i++) { r -= items[i].w; if (r <= 0) return items[i]; } return items[items.length - 1]; }
    function target(sit, it, rng) {
      var ids = it.targets || []; if (!ids.length) return {};
      if (it.id === 'lift_one' || it.id === 'squeeze_in') {
        var byU = ids.slice().sort(function (a, b) { return cupUs(sit, a) - cupUs(sit, b); });
        var hb = sit.balls.filter(function (b) { return /^under:/.test(b.at); })[0];
        if (!hb || hb.at === 'under:?') return { target: byU[0], lost: true };            /* 놓침: 창 쪽(u 작은 쪽)부터 */
        var bel = hb.at.slice(6).replace('?', ''), unsure = /\?$/.test(hb.at);
        if (ids.indexOf(bel) < 0) return { target: byU[0] };
        if (!unsure) {
          var o = { target: bel };
          if (sit.round <= 1 && it.id === 'lift_one' && ids.length > 1) {                 /* 1회차: 옆 컵(창 쪽 먼저)을 같이 비교 — (A) 가 첫 1분에 보이게 */
            var ub = cupUs(sit, bel), nb = ids.filter(function (x) { return x !== bel; }).sort(function (a, b) { return Math.abs(cupUs(sit, a) - ub) - Math.abs(cupUs(sit, b) - ub) || cupUs(sit, a) - cupUs(sit, b); })[0];
            if (nb) o.considered = nb;
          }
          return o;
        }
        var ws = ids.map(function (id) { return { id: id, w: id === bel ? 0.6 : 0.2 }; }), ch = pickW(ws, rng);
        var rest = ws.filter(function (x) { return x.id !== ch.id; }).sort(function (a, b) { return b.w - a.w || cupUs(sit, a.id) - cupUs(sit, b.id); })[0];
        var out = { target: ch.id }; if (it.id === 'lift_one' && rest && rest.w >= 0.3 * ch.w) out.considered = rest.id;
        return out;
      }
      if (it.id === 'hide_peek') return { target: ids[Math.floor(rng() * ids.length)] };
      return { target: ids[0] };
    }
    function decideSync(sit) {
      var rng = mulberry32(fnv1a(DAY + '|' + SEED + '|' + setupKeyOf(sit) + '|' + sit.round + '|' + sit.point + (sit.point === 'idle' ? '|' + mem.idleN : '')));
      var items = parseMenu(sit.menu), r1 = sit.round <= 1, same = (sit.facts.same_setup_runs || 0) >= 1, twoHidden = (sit.facts.hidden || 0) >= 2;
      var recentSurprise = mem.surpriseRounds.some(function (n) { return n >= sit.round - 2 && n <= sit.round; });
      var cand = [];
      items.forEach(function (it) {
        var k = KIND[it.id], w = DEMO_W[it.id] ? DEMO_W[it.id](sit) : 0;
        if (it.id === 'lift_one' && twoHidden && items.some(function (x) { return x.id === 'two_arms'; })) w *= 0.3;   /* 공 둘이면 two_arms 가 lift_one 대신 */
        if (same) { if (k === 'quirk') w *= 2; if (k === 'surprise') w *= it.id === 'wear_cup_as_hat' ? 2.5 : 1.5; if (it.id === 'lift_one') w *= 0.5; }
        if (mem.run.id === it.id && mem.run.n >= 2) w *= 0.3;                            /* 같은 행동 3번째 연속 */
        if (r1 && (sit.point === 'start' || sit.point === 'end' || sit.point === 'fork') && k !== 'readable' && k !== 'quirk') w = 0;   /* 1회차: readable · quirk 만 */
        if (k === 'surprise' && (r1 || recentSurprise || it.id === mem.lastSurprise || bag(rng).indexOf(it.id) < 0)) w = 0;
        if (it.id === 'stop' && (sit.round < 3 || mem.last === 'stop' || sit.facts.novel)) w = 0;   /* 판 수로 오르지 않는다. 연달아 없음 */
        if (sit.point === 'idle' && it.id === mem.lastIdle && it.id !== 'watch') w *= 0.3;           /* 먼저 놀기: 같은 것을 연달아 잘 안 한다 */
        if (w > 0) cand.push({ it: it, w: w });
      });
      var pick = null;
      if (r1 && sit.point === 'start') pick = items.filter(function (x) { return x.id === 'lift_one'; })[0];
      if (r1 && sit.point === 'end') pick = items.filter(function (x) { return x.id === 'offer_ball'; })[0];
      if (sit.point === 'idle' && mem.idleN === 0 && sit.last && sit.last.act === 'none') pick = items.filter(function (x) { return x.id === 'invite_roll'; })[0];   /* 아무도 안 만졌을 때 첫 먼저 놀기 = 여는 초대 */
      if (!pick && sit.point === 'idle' && !mem.covered) pick = items.filter(function (x) { return x.id === 'cover_ball'; })[0];   /* 만져 봤지만 숨긴 적 없으면: 한 번은 컵으로 덮어 보인다 (말 없는 안내) */
      if (!pick) pick = cand.length ? pickW(cand, rng).it : items.filter(function (x) { return x.id === 'watch'; })[0] || items[0];
      var ans = { action: pick.id }, tg = target(sit, pick, rng);
      if (tg.target) ans.target = tg.target; if (tg.considered) ans.considered = tg.considered;
      var lineKey = pick.id === 'offer_ball' && (sit.facts.found || []).length >= 2 ? 'offer_two' : pick.id;
      if (rng() < 0.5) { var ln = nextLine(lineKey, rng); if (ln) ans.line = ln; }              /* 결정의 절반쯤은 말이 없다 */
      /* 기억 (데모 규칙 안에만) */
      if (KIND[pick.id] === 'surprise') { mem.lastSurprise = pick.id; mem.surpriseRounds.push(sit.round); var bg = bag(rng), bi = bg.indexOf(pick.id); if (bi >= 0) bg.splice(bi, 1); }
      mem.run = mem.run.id === pick.id ? { id: pick.id, n: mem.run.n + 1 } : { id: pick.id, n: 1 };
      mem.last = pick.id; if (sit.point === 'idle') { mem.idleN++; mem.lastIdle = pick.id; } if (pick.id === 'cover_ball') mem.covered = true;
      return ans;
    }
    return {
      name: label || 'demo-rules',
      choose: function (sit) { return Promise.resolve(decideSync(sit)); },
      decideSync: decideSync, reset: reset, mem: function () { return mem; }
    };
  }
  var DEMO = makeDemoChooser('demo-rules');
  /* 시험용 chooser: ?chooser=slow (800 ms 늦게) · ?chooser=stale (사라진 대상을 돌려줌) */
  function makeChooser(kind) {
    if (kind === 'slow') return { name: 'demo-rules', source: 'local', choose: function (sit) { return new Promise(function (res) { setTimeout(function () { res(DEMO.decideSync(sit)); }, 800); }); } };
    if (kind === 'stale') return { name: 'demo-rules', source: 'local', choose: function (sit) { var a = DEMO.decideSync(sit); a.target = 'c9'; return Promise.resolve(a); } };
    return { name: 'demo-rules', source: 'local', choose: DEMO.choose };
  }
  var CH = makeChooser(CHOOSER_Q());
  function isDemo(ch) { return !!ch && /^demo-rules/.test(ch.name || '') && (ch.source || 'local') === 'local'; }
  function chLabel(ch) { if (!ch) return '?'; if (ch.label) return String(ch.label); if (ch.name === 'forced') return TX.byForced; return isDemo(ch) ? TX.byDemo : String(ch.name || '?'); }
  function honestText() { if (CH && CH.honest) return String(CH.honest); if (isDemo(CH)) return TX.honest; return (CH && CH.source && CH.source !== 'local' ? TX.honestModel : TX.honestOther) + chLabel(CH); }
  function renderHonest() { var h = document.getElementById('honest'); if (h) h.textContent = honestText(); }
  function CHOOSER_Q() { return qs('chooser'); }
  var FORCE = {};   /* 테스트 훅: { point: action } 한 번씩. 기록은 chooser:forced */

  /* ───────── 결정 (§9.5): 대기 중엔 dirty 만 · 판 예산 3 · 확인 → 한 번 다시 묻기 → ponder ───────── */
  var BUDGET = 3;
  function withTimeout(p, ms) { return new Promise(function (res) { var done = false, t = setTimeout(function () { if (!done) { done = true; res({ __timeout: true }); } }, ms); Promise.resolve(p).then(function (v) { if (!done) { done = true; clearTimeout(t); res(v); } }, function () { if (!done) { done = true; clearTimeout(t); res({ __error: true }); } }); }); }
  function validate(ans, asked, point) {
    if (!ans || typeof ans.action !== 'string') return { ok: false, why: 'shape' };
    var nowSit = situationNow(point, asked.__extra);
    var items = parseMenu(nowSit.menu), it = items.filter(function (x) { return x.id === ans.action; })[0];
    if (!it) return { ok: false, why: 'not-in-menu' };
    if (it.targets) {
      if (!ans.target || it.targets.indexOf(ans.target) < 0) return { ok: false, why: 'target-gone' };
      var a = asked.cups.filter(function (c) { return c.id === ans.target; })[0], b = nowSit.cups.filter(function (c) { return c.id === ans.target; })[0];
      if (a && b && a.cell.join() !== b.cell.join()) return { ok: false, why: 'target-moved' };
    }
    if (JSON.stringify(asked.balls) !== JSON.stringify(nowSit.balls)) return { ok: false, why: 'perception-changed' };
    var out = { action: ans.action };
    if (ans.target) out.target = ans.target;
    if (ans.considered && it.targets && it.targets.indexOf(ans.considered) >= 0 && ans.considered !== ans.target) out.considered = ans.considered;
    if (typeof ans.line === 'string' && ans.line) out.line = ans.line;                         /* 원문 그대로 보관 (자르지 않는다) */
    if (typeof ans.note === 'string') { out.note = ans.note.slice(0, NOTE_MAX); if (ans.note.length > NOTE_MAX) out.noteCut = ans.note.length; }   /* 메모는 40자까지만 다음 결정으로 돌아간다 */
    return { ok: true, ans: out };
  }
  async function decide(point, tok, extra) {
    extra = extra || {};
    if (PENDING) return null;   /* 대기 중: 결정을 쌓지 않는다. 바뀐 배치는 답이 오면 validate() 가 다시 맞춰 본다 */
    var R = ROUND, forced = FORCE[point];
    var ch = forced ? { name: 'forced', source: 'local', choose: function (sit) { var ft = FORCE['__' + point]; delete FORCE[point]; delete FORCE['__' + point]; var it = parseMenu(sit.menu).filter(function (x) { return x.id === forced; })[0]; var a = { action: forced }; if (it && it.targets) a.target = ft && it.targets.indexOf(ft) >= 0 ? ft : forcedTarget(sit, it); return Promise.resolve(a); } } : CH;
    var rec = { t: tNow(), id: null, round: R ? R.n : null, point: point, chooser: ch.name, source: ch.source || 'local', calls: 0, payloadBytes: 0, approxTokens: 0, outBytes: 0, outTokens: 0,
      tokenMethod: 'ascii/3+nonascii', latencyMs: 0, retries: 0, valid: false, fallback: false, usage: null, cache: null, why: null };
    M.decisions.push(rec);
    var result = null;
    PENDING = true; EP.phase = 'deciding';
    try {
      for (var attempt = 0; attempt < 2; attempt++) {
        if (R && R.calls >= BUDGET) { R.over = true; rec.over = true; M.over++; console.log('[play] budget over: round ' + R.n + ' point ' + point + ' -> ponder (local)'); break; }
        var sit = situationNow(point, extra); sit.__extra = extra;
        var js = JSON.stringify(sit, function (k, v) { return k === '__extra' ? undefined : v; });
        var clean = JSON.parse(js);
        rec.id = rec.id || sit.id; rec.payloadBytes += utf8Bytes(js); rec.approxTokens += approxTokens(js); rec.calls++;
        if (attempt) rec.retries = attempt;
        if (R) { R.calls++; R.points.push(point); R.bytes += utf8Bytes(js); R.inTok += approxTokens(js); }
        rec.sit = clean;
        var t0 = performance.now();
        var ans = await withTimeout(ch.choose(clean), TEMPO.modelTimeout * 1000);
        var dt = Math.round(performance.now() - t0); rec.latencyMs += dt; if (R) R.latencyMs += dt;
        var os = JSON.stringify(ans || {}); rec.outBytes += utf8Bytes(os); rec.outTokens += approxTokens(os); if (R) R.outTok += approxTokens(os);
        if (EP.tok !== tok) { rec.discarded = true; return null; }   /* 그새 판이 끝났다 (처음처럼 · 새 배치): 답을 버린다 */
        if (ans && ans.__timeout) { rec.why = 'timeout'; break; }
        var v = validate(ans, sit, point);
        if (v.ok) { result = v.ans; rec.valid = true; rec.answer = v.ans; break; }
        rec.why = v.why;
      }
      if (!result) { result = { action: 'ponder', fallback: true, why: rec.why || 'budget' }; }
      if (result.fallback) { rec.fallback = true; plog(result.action, [], { fallback: true, why: result.why, point: point }); LASTDEC = { fallback: true, t: tNow() }; renderReceipt(); }   /* 기록 = 실제로 하는 것 (ponder) */
      else {
        var by = 'chooser:' + ch.name, e = log('octopus', by, result.action, [result.target], { point: point, id: rec.id, considered: result.considered, line: result.line, note: result.note, noteCut: result.noteCut });
        LASTDEC = { label: (MENU_BY[result.action] || {}).label || result.action, by: chLabel(ch), t: e.t };
        if (typeof result.note === 'string') NOTE = result.note.slice(0, NOTE_MAX);             /* 다음 결정 때 돌려줄 자기 메모 (40자) */
        event('octopus ' + result.action + ' r' + (R ? R.n : DAYROUNDS));
        renderReceipt();
      }
      return result;
    } finally { PENDING = false; if (EP.tok === tok) EP.phase = 'acting'; }
  }
  function forcedTarget(sit, it) {   /* 테스트 강제: 지각한 컵(있으면) 아니면 첫 대상 */
    var ids = it.targets, hb = sit.balls.filter(function (b) { return /^under:/.test(b.at) && b.at !== 'under:?'; })[0];
    if (hb) { var bel = hb.at.slice(6).replace('?', ''); if (ids.indexOf(bel) >= 0) return bel; }
    return ids[0];
  }

  /* ───────── 에피소드 (연출 묶음) ───────── */
  var CANCEL = { cancelled: true };
  function A(tok) { if (EP.tok !== tok) throw CANCEL; }
  async function step(tok, p) { var r = await p; A(tok); return r; }
  function run(name, fn) {
    var tok = ++EP.tok; EP.name = name; EP.busy = true; EP.phase = 'acting';
    return Promise.resolve().then(function () { return fn(tok); }).catch(function (e) { if (e !== CANCEL) console.error('[play] episode ' + name, e); })
      .then(function () { if (EP.tok === tok) { EP.busy = false; EP.name = null; EP.phase = null; } EP.lastEnd = now(); });
  }
  function cancelEpisode(why, skipCup) {   /* 남은 동작은 정리 단계로 (§4 문어가 쥔 장난감 잡기) */
    if (!EP.busy) return;
    EP.tok++; EP.busy = false; EP.name = null; EP.phase = null;
    if (INVITE && !INVITE.touched) M.initiative.invite_roll.interrupted++;   /* 끊긴 초대: 받음도 무시도 아님 */
    kit.reset(); OFFER = null; INVITE = null;
    if (MODE.name === 'hidden' || MODE.name === 'camo' || MODE.name === 'offer' || MODE.name === 'invite') setMode('free');
    if (MODE.name === 'hat') setMode('free');
    snapCups(skipCup); kit.expr('idle');
    if (why) plog('tidy', [], { why: why });
  }
  function setMode(name, o) { MODE = { name: name, since: now(), until: o && o.until || 0, data: o && o.data || null }; }

  /* ───────── 기하 도우미 ───────── */
  function G() { return kit.grid; }
  function cellXZ(u, v) { return kit.cell(u, v); }
  function frontEdge(u) { var c = kit.cell(clamp(Math.round(u), 1, 7), 0), f = G().f; return [c[0] + f[0] * 0.3, c[1] + f[2] * 0.3]; }
  function octXZ() { var o = kit.state().oct; return o.at; }
  function dist2(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
  function rowU(x, z) { var g = G(), dx = x - g.P0[0], dz = z - g.P0[2]; return (dx * g.e[0] + dz * g.e[2]) / g.du + 4; }
  function rowV(x, z) { var g = G(), dx = x - g.P0[0], dz = z - g.P0[2]; return dx * g.f[0] + dz * g.f[2]; }   /* 줄 기준 앞(+)·뒤(-) m */
  function fromUV(u, d) { var g = G(); return [g.P0[0] + g.e[0] * (u - 4) * g.du + g.f[0] * d, g.P0[2] + g.e[2] * (u - 4) * g.du + g.f[2] * d]; }
  function clampFloor(x, z) { var u = clamp(rowU(x, z), -0.4, 8.4), d = clamp(rowV(x, z), -1.0, 0.95); return fromUV(u, d); }
  function freeEvenCells(W, except) {
    W = W || world();
    return [0, 2, 4, 6, 8].filter(function (u) { var c = kit.cell(u, 1); return !W.groups.some(function (g) { return g.id !== except && Math.hypot(g.x - c[0], g.z - c[1]) < 0.2; }); });
  }
  function nearestFreeEven(W, x, z, except) {
    var best = null, bd = 1e9; freeEvenCells(W, except).forEach(function (u) { var c = kit.cell(u, 1), d = Math.hypot(c[0] - x, c[1] - z); if (d < bd) { bd = d; best = u; } }); return best;
  }
  /* 컵 줄 앞(사람 쪽) 공에 팔이 닿아야 할 때: 몸은 컵 줄 뒤(v -0.75)에 두고, 컵에 안 막히는 곧은 줄(틈)로 팔을 길게 뻗는다.
     몸(머리 r .42)이 컵 줄로 들어가면 컵이 몸에 묻히고 눈이 가려진다. kit.approach 는 대상에서만 0.62 m 떨어지고 다른 컵은 모른다 → 앞쪽 공은 여기서 자리를 정한다. */
  var ARM_ROOT = 0.25, ARM_UNIT = 0.82 * 0.42, STAND_V = -0.75;
  function stretchTo(o, p) { return Math.max(0, dist2(o, p) - ARM_ROOT) / ARM_UNIT; }
  function standSpot(x, z) {   /* → [x, z]: 공 u 에서 가까운 순으로, 공까지 곧은 줄이 컵에 안 막히는 컵 줄 뒤 자리 */
    var bu = Math.round(rowU(x, z)), v = clamp(Math.min(STAND_V, rowV(x, z) - 0.6), -1.4, STAND_V), ds = [0, 1, -1, 2, -2, 3, -3, 4, -4];
    for (var i = 0; i < ds.length; i++) {
      var s = fromUV(clamp(bu + ds[i], 0, 8), v);
      if (dist2(s, [x, z]) >= 0.45 && !kit.blocked(s, [x, z], kit.BALL_R)) return s;
    }
    return fromUV(clamp(bu, 0, 8), v);
  }
  async function goReach(tok, b) {   /* 공에 팔이 닿는 자리로 (이미 닿으면 그 자리) → { maxS } (그 공까지 팔 늘이기 상한) */
    var t = kit.state().toys[b]; if (!t) return { maxS: null };
    var o = octXZ(), p = [t.x, t.z];
    var here = rowV(o[0], o[1]) <= STAND_V + 0.05 && dist2(o, p) >= 0.45 && stretchTo(o, p) <= 3.4 && !kit.blocked(o, p, kit.BALL_R);
    var sp = here ? o : standSpot(t.x, t.z);
    if (!here && dist2(o, sp) > 0.08) await step(tok, kit.walkTo(sp[0], sp[1]));
    kit.look(b); await step(tok, kit.face(b));
    return { maxS: clamp(stretchTo(sp, p) + 0.8, 2.6, 4.6) };
  }
  function settleBalls(mode, onlyCup, skipCup) {   /* 바닥 컵 발 안에 든 '자유로운' 공 → 가운데(0.12 m 안)면 덮인 것으로(보이는 그대로), 걸쳐 있으면 밖으로 굴려 뺀다. mode 'eject' 면 늘 뺀다 */
    var T = kit.state().toys, out = { covered: [], ejected: [] }, R = kit.CUP.r0 + kit.BALL_R;
    Object.keys(T).forEach(function (bid) {
      var b = T[bid], done = false; if (b.kind !== 'ball' || b.attach || b.inBasket || !b.vis || (b.cover && T[b.cover])) return;
      Object.keys(T).forEach(function (cid) {
        var c = T[cid]; if (done || c.kind !== 'cup' || c.on || c.attach || !c.vis || (onlyCup && cid !== onlyCup) || cid === skipCup) return;
        var d = Math.hypot(c.x - b.x, c.z - b.z); if (d >= R) return;
        done = true;
        if (mode !== 'eject' && d <= 0.12) { kit.cover(bid, cid); out.covered.push([bid, cid]); return; }
        var dx = b.x - c.x, dz = b.z - c.z, dl = Math.hypot(dx, dz); if (dl < 0.02) { dx = G().f[0]; dz = G().f[2]; dl = 1; }
        kit.roll(bid, clampFloor(c.x + dx / dl * (R + 0.06), c.z + dz / dl * (R + 0.06))); out.ejected.push(bid);
      });
    });
    out.ejected.forEach(function (b) { plog('roll_out', [b]); });
    return out;
  }
  function snapCups(skipCup) {   /* 정리: 바닥 컵을 줄의 짝수 칸에 (겹치지 않게), 떠 있는 공은 방 안에. skipCup = 사람이 지금 들어 올린 컵 (그 컵으론 덮지 않는다) */
    var W = world(), taken = {};
    W.groups.slice().sort(function (a, b) { var ua = rowU(a.x, a.z), ub = rowU(b.x, b.z); return Math.abs(ua - Math.round(ua / 2) * 2) - Math.abs(ub - Math.round(ub / 2) * 2); }).forEach(function (g) {
      var u0 = rowU(g.x, g.z), best = null, bd = 1e9;
      [0, 2, 4, 6, 8].forEach(function (u) { if (taken[u]) return; var d = Math.abs(u - u0) + Math.abs(rowV(g.x, g.z)) * 3; if (d < bd) { bd = d; best = u; } });
      if (best == null) return; taken[best] = true; var c = kit.cell(best, 1);
      if (Math.hypot(c[0] - g.x, c[1] - g.z) > 0.01) kit.prop(g.id, { x: c[0], z: c[1], lift: 0 });
      else kit.prop(g.id, { lift: 0 });
    });
    W.cups.forEach(function (c) { if (c.on) kit.prop(c.id, { lift: 0 }); });
    world().balls.forEach(function (b) { if (b.free) { var p = clampFloor(b.x, b.z); kit.prop(b.id, { x: p[0], z: p[1], lift: 0 }); } });
    settleBalls('cover', null, skipCup).covered.forEach(function (bc) { if (!HID[bc[0]]) HID[bc[0]] = { by: 'drop', m: 0, lost: false, ruled: [], t: now() }; plog('covered', bc, { why: 'tidy' }); });   /* 컵이 제자리로 돌아와 공을 덮었다: 상태 = 보이는 것 */
  }
  function pauseSec() { var r = pbr('pause'), lo = RED ? 0.15 : TEMPO.pauseMin, hi = RED ? 0.3 : TEMPO.pauseMax, s = lo + (hi - lo) * r; if (DAYROUNDS > 3) s *= 0.75; return s; }
  function say(text, ms) { if (!text) return; inst.bubble(text, (ms || 2200) * SPEED); var s = document.getElementById('say'); if (s) s.textContent = text; }
  function sayLine(ch) { if (ch && ch.line) say(ch.line.length > 24 ? ch.line.slice(0, 23) + '…' : ch.line); }   /* 화면만 줄임표, 원문은 기록에 */

  /* ───────── 공통 연출 ───────── */
  async function goWork(tok, u) {
    var p = kit.cell(u == null ? 4 : clamp(Math.round(u), 0, 8), 2);
    var o = octXZ(); if (dist2(o, p) > 0.08) await step(tok, kit.walkTo(p[0], p[1]));
    await step(tok, kit.face([p[0] + G().f[0], p[1] + G().f[2]]));
  }
  function homeSpot() {   /* 문어 자리 (4, 3). 2층 탑이 바로 앞이면 옆으로 두 칸 (눈이 탑에 가리지 않게) */
    var W = world(), tw = function (u) { return W.groups.some(function (g) { return g.top && Math.abs(rowU(g.x, g.z) - u) < 1.3; }); };
    var u = !tw(4) ? 4 : !tw(2) ? 2 : !tw(6) ? 6 : 4; return kit.cell(u, 3);
  }
  async function goHome(tok) {
    var h = homeSpot(), o = octXZ();
    if (dist2(o, h) > 0.08) await step(tok, kit.walkTo(h[0], h[1]));
    kit.face('camera');
  }
  async function antic(tok) {   /* 0.5 초 움츠림 ("이제 간다") — 이때 만지면 판 시작이 풀린다 */
    if (RED) return;
    await step(tok, kit.poseSteps('antic', [{ sx: 1.03, sy: 0.95 }, { sx: 1.05, sy: 0.92 }], TEMPO.antic / 2));
    kit.pose('antic', null);
  }
  var LEAN = { lean: 0.12 };   /* 앞으로 7도 (뻗을 때 몸이 따라간다) */
  async function feint(tok, id, next) {   /* (A) 뻗었다가 거두기: chooser 가 considered 를 줬을 때만. 팔이 컵까지 가서 톡톡 → 멈칫(눈 뜬 채) → 거둠 → 눈이 먼저 다른 컵으로 */
    kit.look(id); kit.pose('lean', LEAN);
    var r = await step(tok, kit.reach('auto', id, 0.85)); plog('reach', [id]);
    if (!r.ok) { kit.pose('lean', null); return; }
    await step(tok, kit.bob(id, 2)); await step(tok, kit.wait(RED ? 0.05 : 0.12)); await step(tok, kit.bob(id, 2));   /* 톡톡 (컵이 2px 두 번 — 1px 은 폰에서 안 보였다) */
    await step(tok, kit.hesitate(r.arm, pauseSec(), { eyes: 'curious' }));
    await step(tok, kit.retract(r.arm)); plog('retract', [id]); kit.pose('lean', null);
    if (next) { kit.look(next); await step(tok, kit.wait(RED ? 0.1 : 0.3)); }   /* 눈이 먼저 간다 */
  }
  function foundIn(cups) { var W = world(); return W.balls.filter(function (b) { return b.coverRaw && cups.indexOf(b.coverRaw) >= 0 && !b.inBasket; }).map(function (b) { return b.id; }); }
  async function liftCups(tok, list, o) {   /* 다가가기 → 멈춤 → 잡기 → 들기. → { cups, found } */
    o = o || {};
    list = list.filter(function (id) { return kit.has(id); });
    if (!list.length) return { cups: [], found: [] };
    var first = list[0]; kit.look(first); kit.pose('lean', LEAN);
    var r = await step(tok, kit.reach('auto', first, 0.5)); plog('reach', [first]);
    if (r.ok) { await step(tok, kit.hesitate(r.arm, o.pause != null ? o.pause : pauseSec(), { eyes: o.eyes || 'curious' })); await step(tok, kit.grab(r.arm, first)); }
    kit.pose('lean', null);
    var before = foundIn(list);
    var L = await step(tok, kit.lift(list));
    var cups = Object.keys(L.arms || {}), found = before.filter(function (b) { return kit.has(b); });
    cups.forEach(function (c) { var f = found.filter(function (b) { return world().balls.some(function (x) { return x.id === b && x.coverRaw === c; }); }); plog('lift', [c], { result: f.length ? 'found:' + f.join(',') : 'empty' }); });
    return { cups: cups, found: found };
  }
  async function lowerBack(tok, cups) {
    var held = world().heldCups.filter(function (c) { return !cups || cups.indexOf(c) >= 0; });
    if (!held.length) return;
    await step(tok, kit.lower(held)); plog('lower', held);
    settleBalls('eject');   /* 내린 컵 밑에 공이 걸리면 굴려 뺀다 (문어가 몰래 덮지 않는다) */
  }
  async function foundJoy(tok, balls) {
    balls.forEach(function (b) { delete HID[b]; });
    kit.look(balls[0]); say(TX.found[Math.floor(pbr('found') * TX.found.length)], 1400);
    plog('found_joy', balls);
    await step(tok, kit.joy()); kit.expr('idle');
  }
  async function releaseBall(tok, b) {   /* 팔에 쥔 공을 그 자리 바닥에 */
    var t = kit.state().toys[b]; if (!t || !t.attach || t.attach.indexOf('arm:') !== 0) return;
    var arm = +t.attach.slice(4); kit.hold(b, null);   /* 그려진 자리(팔 끝)에 놓는다 — state() 의 x·z 는 쥔 동안 갱신되지 않아 컵 밑 옛 자리다 */
    var s = kit.state().toys[b]; var p = clampFloor(s.x, s.z); kit.prop(b, { x: p[0], z: p[1] });
    await step(tok, kit.retract(arm));
  }
  function frontCellNear(u, tag) {   /* 앞자리(v0) 칸 하나: 옆 줄(±1~2), 절반쯤은 컵 앞 */
    var W = world(), cupUs = W.groups.map(function (g) { return Math.round(rowU(g.x, g.z)); });
    var opts = [-2, -1, 1, 2].map(function (d) { return clamp(Math.round(u) + d, 1, 7); }).filter(function (x, i, a) { return a.indexOf(x) === i; });
    var front = opts.filter(function (x) { return cupUs.indexOf(x) >= 0; }), gaps = opts.filter(function (x) { return cupUs.indexOf(x) < 0; });
    var pool = (pbr(tag + 'side') < 0.5 && front.length) || !gaps.length ? front : gaps; if (!pool.length) pool = opts;
    var uu = pool[Math.floor(pbr(tag + 'u') * pool.length)];
    return kit.cell(uu, 0);
  }
  function scanList() { var W = world(), g = W.groups; if (!g.length) return []; var l = g[0].id, r = g[g.length - 1].id; return [l, r, l, r]; }

  /* ───────── 행동 (메뉴 하나 = 로컬 연출 여러 개) ───────── */
  var ACT = {};
  ACT.lift_one = async function (tok, ch, ctx) {
    var T = ch.target, C = ch.considered, P = perception(), lost = Object.keys(P).some(function (k) { return P[k].lost || P[k].m > 2; });
    await goWork(tok);
    sayLine(ch);
    if (lost) { await step(tok, kit.scan(scanList(), 0.25)); }                 /* 놓침: 눈이 좌우로 두 번 */
    if (C && kit.has(C) && C !== T) await feint(tok, C, T);
    var got = await liftCups(tok, [T]);
    return afterLift(tok, got, ctx);
  };
  async function afterLift(tok, got, ctx) {
    if (got.found.length) { await foundJoy(tok, got.found); return endPhase(tok, got.found, got.cups); }
    say(TX.empty, 1600); kit.expr('curious');
    Object.keys(HID).forEach(function (k) { HID[k].lost = true; got.cups.forEach(function (c) { if (HID[k].ruled.indexOf(c) < 0) HID[k].ruled.push(c); }); });
    kit.pose('tilt', { tilt: 7 * Math.PI / 180 }); await step(tok, kit.wait(0.4)); kit.pose('tilt', null); kit.expr('idle');
    await lowerBack(tok, got.cups);
    if (ROUND && !ROUND.forked && Object.keys(HID).length) {
      ROUND.forked = true;
      var ch = await decide('fork', tok); A(tok); if (!ch) return;
      return perform(tok, ch, { point: 'fork' });
    }
    return ACT.ponder(tok, {}, ctx);
  }
  ACT.lift_next = async function (tok, ch) {
    sayLine(ch);
    var ruled = []; Object.keys(HID).forEach(function (k) { (HID[k].ruled || []).forEach(function (c) { if (ruled.indexOf(c) < 0) ruled.push(c); }); });
    var rem = world().groups.filter(function (g) { return ruled.indexOf(g.id) < 0; }).map(function (g) { return g.id; });   /* 창 쪽부터 (u 오름차순) */
    for (var i = 0; i < rem.length; i++) {
      if (!kit.has(rem[i])) continue;
      var got = await liftCups(tok, [rem[i]], { pause: RED ? 0.15 : 0.3 });
      if (got.found.length) { await foundJoy(tok, got.found); return endPhase(tok, got.found, got.cups); }
      Object.keys(HID).forEach(function (k) { HID[k].ruled.push(rem[i]); });
      await lowerBack(tok, got.cups);
    }
    return ACT.ponder(tok, {});
  };
  ACT.lift_all = async function (tok, ch, ctx) {
    var ruled = []; Object.keys(HID).forEach(function (k) { (HID[k].ruled || []).forEach(function (c) { ruled.push(c); }); });
    var list = world().groups.filter(function (g) { return ruled.indexOf(g.id) < 0; }).map(function (g) { return g.id; });
    await goWork(tok); sayLine(ch);
    if (!RED) { await step(tok, kit.poseSteps('antic', [{ sx: 1.04, sy: 0.93 }], 0.2)); kit.pose('antic', null); }   /* 0.2 초 움츠림 */
    var got = await liftCups(tok, list);
    plog('lift_all', got.cups);
    await step(tok, kit.scan(scanList(), 0.2));
    await step(tok, kit.wait(TEMPO.holdAll));
    if (!got.found.length) { Object.keys(HID).forEach(function (k) { HID[k].lost = true; }); say(TX.empty, 1400); await lowerBack(tok, got.cups); return ACT.ponder(tok, {}); }
    var withBall = got.cups.filter(function (c) { return world().balls.some(function (b) { return b.coverRaw === c && got.found.indexOf(b.id) >= 0; }); });
    var empties = got.cups.filter(function (c) { return withBall.indexOf(c) < 0; });
    var towers = world().cups.filter(function (c) { return c.on; }).map(function (c) { return c.on; });
    if (empties.length >= 2 && OCTO_SETUP && pbr('stack') < 0.25 && towers.indexOf(empties[0]) < 0 && towers.indexOf(empties[1]) < 0) {   /* 25 %: 빈 컵 둘을 포개 내려놓는다 (문어가 바꾼 배치) */
      await lowerBack(tok, [empties[0]].concat(empties.slice(2)));
      var on = {}; on[empties[1]] = empties[0];
      await step(tok, kit.lower([empties[1]], { on: on })); plog('lower', [empties[1]], { stacked: empties[1] + '>' + empties[0], setup: true }); M.setup.byOctopus.push(tNow());
    } else if (empties.length) await lowerBack(tok, empties);
    await foundJoy(tok, got.found);
    return endPhase(tok, got.found, withBall);
  };
  ACT.two_arms = async function (tok, ch) {
    var W = world(), P = perception(), picks = [];
    W.balls.filter(function (b) { return b.under; }).forEach(function (b) { var t = trackedOf(P, b.id); if (t !== 'lost' && picks.indexOf(b.under) < 0) picks.push(b.under); });
    W.groups.forEach(function (g) { if (picks.length < 2 && picks.indexOf(g.id) < 0) picks.push(g.id); });   /* 모르면 창 쪽부터 */
    picks = picks.slice(0, 2);
    await goWork(tok); sayLine(ch);
    var got = await liftCups(tok, picks);
    if (!got.found.length) { Object.keys(HID).forEach(function (k) { HID[k].lost = true; }); await lowerBack(tok, got.cups); return ACT.ponder(tok, {}); }
    await foundJoy(tok, got.found);
    for (var i = 0; i < got.found.length; i++) {   /* 팔 끝에 공 하나씩 */
      var b = got.found[i], r = await step(tok, kit.reach('auto', b, 1)); if (r.ok) { kit.hold(b, r.arm); plog('grab', [b]); await step(tok, kit.raise(b, { pull: 0.32, px: 8 })); }   /* 팔 끝에 들어 올려 몸 쪽으로 (컵이 내려와도 밑에 안 남게) */
    }
    if (!RED) await step(tok, kit.poseSteps('spin', [{ tilt: 0.157 }, { tilt: -0.157 }, { tilt: 0.157 }, { tilt: 0 }], 0.12));
    kit.pose('spin', null);
    await lowerBack(tok, got.cups);
    if (got.found.length >= 2 && pbr('slip') < 0.35) {   /* 공 하나가 빠져 2칸 굴러감 → 쫓아감 (재생) */
      var sb = got.found[1]; await releaseBall(tok, sb);
      var st = kit.state().toys[sb], to = clampFloor(st.x + G().e[0] * 0.6, st.z + G().e[2] * 0.6), path = kit.route([st.x, st.z], to);
      say(TX.slip, 1400); plog('slip', [sb]);
      await step(tok, kit.roll(sb, path));
      var back = fromUV(rowU(to[0], to[1]), -0.75); await step(tok, kit.walkTo(back[0], back[1]));
      var r2 = await step(tok, kit.reach('auto', sb, 1)); if (r2.ok) { kit.hold(sb, r2.arm); plog('chase', [sb]); }
    }
    return endPhase(tok, got.found, []);
  };
  ACT.squeeze_in = async function (tok, ch) {
    var c = ch.target; await goWork(tok); sayLine(ch);
    var got = await liftCups(tok, [c]);
    if (got.found.length) {
      got.found.forEach(function (b) { delete HID[b]; });
      plog('found', got.found);
      for (var i = 0; i < got.found.length; i++) { var b = got.found[i], u = rowU(kit.state().toys[b].x, kit.state().toys[b].z); await step(tok, kit.nudge(b, frontEdge(u))); plog('nudge', [b]); }   /* 공은 옆(앞)으로 굴려 두고 */
    }
    await lowerBack(tok, got.cups);
    var r = await step(tok, kit.squeezeInto(c, { tip: 'front' }));
    if (!r.ok) return ACT.ponder(tok, {});
    kit.tipPoke(true); plog('squeeze_in', [c]);
    setMode('hidden', { until: now() + tm('squeezeAuto'), data: { cup: c, tipCup: c, kind: 'squeeze', taps: 0, side: 'front' } });
  };
  ACT.camouflage = async function (tok, ch) {
    var o = octXZ(), side = pbr('camo') < 0.5 ? -1 : 1, to = clampFloor(o[0] + G().e[0] * 0.3 * side, o[1] + G().e[2] * 0.3 * side);
    await step(tok, kit.walkTo(to[0], to[1])); kit.face('camera');
    kit.expr('calm'); kit.pose('camo', { sy: 0.7 });
    await step(tok, kit.camouflage('floor')); plog('camouflage', []);
    setMode('camo', { until: now() + tm('camoAuto') });
  };
  async function tidyHands(tok, ctx) {   /* 끝 지점에서 쥔 것 내려놓기 (컵은 든 자리로, 공은 그 자리 바닥에) */
    if (ctx && ctx.cups && ctx.cups.length) await lowerBack(tok, ctx.cups);
    var W = world(); for (var i = 0; i < W.balls.length; i++) if (W.balls[i].held === 'arm') await releaseBall(tok, W.balls[i].id);
  }
  ACT.watch = async function (tok, ch, ctx) { await tidyHands(tok, ctx); sayLine(ch); kit.look('camera'); kit.expr('idle'); await step(tok, kit.wait(0.3)); };
  ACT.stop = async function (tok, ch, ctx) {   /* 거절: 창 쪽으로 30°, 팔 오므림, calm (밤엔 sleepy). 시무룩 없음 */
    await tidyHands(tok, ctx);
    sayLine(ch);
    kit.expr(NIGHT ? 'sleepy' : 'calm');
    await step(tok, kit.face('camera', { offsetDeg: -30 }));
    await step(tok, kit.tuck(true)); plog('tuck', []);
    setMode('stop', { until: now() + tm('stopMin') }); IDLE.afterStop = true;
    kit.look(null);
  };
  ACT.ponder = async function (tok, ch, ctx) {   /* 안전 동작 (fallback): 물건들을 보고 갸웃 */
    await tidyHands(tok, ctx);
    kit.expr('curious'); kit.pose('tilt', { tilt: 7 * Math.PI / 180 });
    var l = scanList(); if (l.length) await step(tok, kit.scan(l.slice(0, 2), 0.3));
    await step(tok, kit.wait(0.4)); kit.pose('tilt', null); kit.expr('idle');
  };
  /* end: 공을 찾아 쥐고(드러나 있고) 있을 때 */
  async function endPhase(tok, found, cups) {
    var held = world().heldCups.filter(function (c) { return cups.indexOf(c) >= 0; });
    var ch = await decide('end', tok, { found: found, held: held }); A(tok);
    if (!ch) return;
    return perform(tok, ch, { point: 'end', found: found, cups: held });
  }
  function startOffer(kind, ball) {
    OFFER = { kind: kind, ball: ball, t0: now(), touched: false };
    M.offers[kind].shown++;
  }
  ACT.offer_ball = async function (tok, ch, ctx) {
    var b = ch.target || ctx.found[0], others = (ctx.found || []).filter(function (x) { return x !== b; });
    await releaseBall(tok, b);
    kit.look(b); sayLine(ch);
    var t = kit.state().toys[b], dest = frontEdge(rowU(t.x, t.z));
    await step(tok, kit.nudge(b, dest)); plog('nudge', [b], { to: 'front' });
    await lowerBack(tok, ctx.cups);
    kit.look('camera'); kit.expr('idle');
    setMode('offer'); startOffer('offer_ball', b); plog('offer_wait', [b]);
    var touched = await waitFor(tok, TEMPO.offerWait, function () { return OFFER && OFFER.touched; });
    for (var i = 0; i < others.length; i++) await releaseBall(tok, others[i]);   /* 감싸 둔 공은 내려놓는다 */
    setMode('free');
    if (!touched) { plog('offer_end', [b], { touched: false }); await goHome(tok); kit.look(null); }   /* 시무룩 없음: 그냥 자리로 */
  };
  ACT.roll_back = async function (tok, ch, ctx) {
    var list = (ctx.found || [ch.target]).slice(); sayLine(ch);
    for (var i = 0; i < list.length; i++) {
      var b = list[i]; await releaseBall(tok, b);
      var t = kit.state().toys[b], dest = frontCellNear(rowU(t.x, t.z), 'rb');
      kit.look(b); await step(tok, kit.nudge(b, dest)); plog('nudge', [b], { to: 'front-cell' });
    }
    startOffer('roll_back', list[0]);
    await lowerBack(tok, ctx.cups);
    await goHome(tok); kit.look(list[0]);
  };
  async function batThree(tok, b, g) {   /* 공을 몸 앞 0.5 m(공 쪽 곧은 줄 위)로 끌어와 두 팔 사이로 톡톡 세 번 */
    var oc = octXZ(), t = kit.state().toys[b]; if (!t) return;
    var dx = t.x - oc[0], dz = t.z - oc[1], dl = Math.hypot(dx, dz) || 1, spot = [oc[0] + dx / dl * 0.5, oc[1] + dz / dl * 0.5], sd = [-dz / dl, dx / dl];
    if (dist2([t.x, t.z], spot) > 0.05) { await step(tok, kit.nudge(b, spot, { quick: dl < 1, route: false, approach: false, maxS: g && g.maxS })); plog('nudge', [b], { to: 'self' }); }
    for (var i = 0; i < 3; i++) {
      var s = (i % 2 ? -1 : 1) * 0.1, to = [spot[0] + sd[0] * s, spot[1] + sd[1] * s];
      await step(tok, kit.nudge(b, to, { quick: true, route: false, approach: false })); plog('bat', [b]);
    }
  }
  ACT.bat_alone = async function (tok, ch, ctx) {
    var b = ch.target || (ctx.found || [])[0]; sayLine(ch);
    var held = (ctx.found || []).filter(function (x) { return x !== b; });
    await releaseBall(tok, b);
    var g = ctx.point === 'idle' ? await goReach(tok, b) : null;   /* 컵 줄 뒤에서 팔이 닿는 자리로 (줄 안으로 안 들어간다) */
    await batThree(tok, b, g);
    await lowerBack(tok, ctx.cups);
    for (var i = 0; i < held.length; i++) await releaseBall(tok, held[i]);
    var t2 = kit.state().toys[b]; await step(tok, kit.nudge(b, frontCellNear(rowU(t2.x, t2.z), 'ba'))); plog('nudge', [b], { to: 'front-cell' });
    await goHome(tok);
  };
  ACT.wear_cup_as_hat = async function (tok, ch, ctx) {
    var c = ch.target; sayLine(ch);
    var r = await step(tok, kit.wearHat(c)); if (!r.ok) return ACT.ponder(tok, {}, ctx);
    plog('wear_hat', [c], { setup: true }); M.setup.byOctopus.push(tNow());
    await lowerBack(tok, (ctx.cups || []).filter(function (x) { return x !== c; }));
    for (var i = 0; i < (ctx.found || []).length; i++) await releaseBall(tok, ctx.found[i]);
    await step(tok, kit.joy()); kit.expr('idle');
    var o = octXZ(), a = clampFloor(o[0] + G().e[0] * 0.15, o[1] + G().e[2] * 0.15);
    await step(tok, kit.walkTo(a[0], a[1])); await step(tok, kit.walkTo(o[0], o[1])); kit.face('camera');   /* 뒤뚱 두 걸음 */
    setMode('hat', { data: { cup: c } });
  };
  /* idle: 문어가 먼저 (주인 추가 C) */
  ACT.invite_roll = async function (tok, ch) {
    var b = ch.target, t = kit.state().toys[b]; if (!t) return;
    var opening = M.initiative.invite_roll.shown === 0 && !TOUCHED;
    var g = await goReach(tok, b);   /* 몸은 컵 줄 뒤, 팔 하나가 틈으로 길게 (§3 여는 초대) */
    var r = await step(tok, kit.reach('auto', b, 0.5, { approach: false, maxS: g.maxS })); if (r.ok) { await step(tok, kit.hesitate(r.arm, pauseSec(), { eyes: 'curious' })); await step(tok, kit.retract(r.arm)); }
    t = kit.state().toys[b]; var dest = frontEdge(rowU(t.x, t.z));
    await step(tok, kit.nudge(b, dest, { approach: false, maxS: g.maxS + 0.3 })); plog('nudge', [b], { to: 'front' });
    kit.look('camera'); kit.expr('idle');
    M.initiative.invite_roll.shown++; if (opening) { M.offers.opening.shown++; OFFER = { kind: 'opening', ball: b, t0: now(), touched: false }; }
    INVITE = { ball: b, t0: now(), touched: false };
    setMode('invite');
    var touched = await waitFor(tok, TEMPO.inviteWait, function () { return INVITE && INVITE.touched; });
    setMode('free'); INVITE = null;
    if (touched) return;
    M.initiative.invite_roll.ignored++; plog('invite_ignored', [b]);
    kit.expr('idle');   /* 무시돼도 시무룩 없음: 차분히 공을 가져가 혼자 논다 */
    var g2 = await goReach(tok, b);
    await batThree(tok, b, g2); plog('bat_alone', [b]);   /* 같은 틈으로 끌어와 혼자 톡톡 (컵 줄 뒤) */
    var t3 = kit.state().toys[b]; await step(tok, kit.nudge(b, frontCellNear(rowU(t3.x, t3.z), 'inv'))); plog('nudge', [b], { to: 'front-cell' });
    await goHome(tok); kit.expr('idle');
  };
  ACT.hide_peek = async function (tok, ch) {
    var c = ch.target; if (!kit.has(c)) return ACT.ponder(tok, {});
    sayLine(ch);
    var r = await step(tok, kit.squeezeInto(c, { tip: 'front' }));
    if (!r.ok) return ACT.ponder(tok, {});
    plog('hide_in', [c]); M.initiative.hide_peek.shown++;
    setMode('hidden', { until: now() + tm('hideAuto'), data: { cup: c, tipCup: c, kind: 'peek', taps: 0, side: 'front' } });
  };
  function coverPair(W, t) {   /* 공을 덮을 컵 + 빈 칸: 컵이 줄을 따라 미끄러지는 길에 다른 컵이 없는 짝만 (옆 컵을 뚫고 지나가지 않게) */
    var free = freeEvenCells(W, null), best = null;
    W.groups.forEach(function (g) {
      var gu = Math.round(rowU(g.x, g.z));
      free.forEach(function (u) {
        if (u === gu) return;
        var lo = Math.min(u, gu), hi = Math.max(u, gu);
        if (W.groups.some(function (h) { var hu = rowU(h.x, h.z); return h.id !== g.id && hu > lo - 0.5 && hu < hi + 0.5; })) return;
        var sc = Math.hypot(g.x - t.x, g.z - t.z) + Math.abs(u - gu) * 0.15;
        if (!best || sc < best.s) best = { g: g, u: u, s: sc };
      });
    });
    return best;
  }
  ACT.cover_ball = async function (tok, ch) {
    var b = ch.target, W = world(), t = kit.state().toys[b]; if (!t) return;
    var pr = coverPair(W, t); if (!pr) return ACT.ponder(tok, {});
    var g = pr.g, freeU = pr.u, gu = Math.round(rowU(g.x, g.z)), spot = kit.cell(freeU, 1);
    var gr = await goReach(tok, b);
    await step(tok, kit.nudge(b, spot, { approach: false, maxS: gr.maxS + 0.3 })); plog('nudge', [b], { to: 'row' });
    await goWork(tok, (gu + freeU) / 2);
    kit.look(g.id); await step(tok, kit.slide(g.id, spot[0], spot[1], { hide: b })); plog('cover', [b, g.id], { setup: true });
    M.setup.byOctopus.push(tNow()); SESSION.covers++; M.initiative.cover_ball.shown++;
    HID[b] = { by: 'octopus', m: 0, lost: false, ruled: [], t: now() };
    COVERED = { ball: b, cup: g.id };
    await goHome(tok);
    kit.pose('tilt', { tilt: 7 * Math.PI / 180 }); kit.look('camera'); kit.expr('curious');   /* 갸웃하며 사람을 본다 */
    await step(tok, kit.wait(1.0)); kit.pose('tilt', null); kit.expr('idle');
  };
  async function perform(tok, ch, ctx) {
    ctx = ctx || {};
    var fn = ACT[ch.action] || ACT.ponder;
    if (MODE.name === 'stop' && ch.action !== 'stop') { kit.tuck(false); setMode('free'); }
    await fn(tok, ch, ctx);
    DONE.push({ t: tNow(), action: ch.action, point: ctx.point || null, round: ROUND ? ROUND.n : null, fallback: !!ch.fallback });
  }
  function waitFor(tok, sec, pred) {   /* 장면 시간 sec 동안 기다리되 pred 가 참이 되면 바로 (손댐은 50 ms 안에 알아챈다) */
    return new Promise(function (res) {
      var done = false, iv = setInterval(function () {
        if (done) return;
        if (EP.tok !== tok || (pred && pred())) { done = true; clearInterval(iv); res(EP.tok === tok); }
      }, 50);
      kit.wait(sec).then(function () { if (done) return; done = true; clearInterval(iv); res(!!(pred && pred())); });
    }).then(function (r) { A(tok); return r; });
  }

  /* ───────── 판 (§6) ───────── */
  function beginRound() {
    DAYROUNDS++; saveRounds(DAYROUNDS);
    ROUND = { round: DAYROUNDS, n: DAYROUNDS, t0: tNow(), t1: null, calls: 0, decisions: 0, budget: BUDGET, over: false, points: [], bytes: 0, inTok: 0, outTok: 0, latencyMs: 0, cache: null, forked: false };
    M.rounds.push(ROUND);
    plog('round_start', [], { round: ROUND.n });
    return ROUND;
  }
  function endRound(R0) {
    var R = R0 || ROUND; if (!R || R.t1 != null) return;
    R.t1 = tNow(); R.decisions = R.calls;
    console.log('[play] round ' + R.n + ' · decisions ' + R.calls + '/' + R.budget + ' · ' + R.bytes + 'B · ~' + R.inTok + 'tok(est) in · ~' + R.outTok + 'tok(est) out · ' + R.latencyMs + 'ms' + (R.over ? ' · OVER' : ''));
    if (ROUND === R) { ROUND = null; NOVEL = null; }
    if (!BASKET_ON) showBasket(true);
    var rs = document.getElementById('reset'); if (rs) rs.hidden = false;
  }
  async function clearLinger(tok) {   /* 판을 시작하기 전: 숨음 · 위장 · 모자 · 거절 자세를 푼다 (재생) */
    if (MODE.name === 'hidden') await popOutNow(tok, false);
    if (MODE.name === 'camo') await camoOff(tok, false);
    if (MODE.name === 'hat') await hatOff(tok);
    if (MODE.name === 'stop') { kit.tuck(false); setMode('free'); kit.expr('idle'); }
  }
  async function roundEpisode(tok) {
    var W = world(); syncHID(W);
    var R = beginRound();
    try {
      await clearLinger(tok);
      var key = setupKeyOf(situationNow('start'));
      SAMERUN = key === LASTKEY ? SAMERUN + 1 : 0; LASTKEY = key;
      if (SAMERUN >= 1 && BASKET_ON && kit.state().toys.b2 && kit.state().toys.b2.inBasket) { kit.look('basket'); plog('glance_basket', ['basket']); await step(tok, kit.wait(TEMPO.glance)); }
      await antic(tok);
      var ch = await decide('start', tok); A(tok);
      if (!ch) return;
      await perform(tok, ch, { point: 'start' });
    } finally { endRound(R); }
  }

  /* ───────── 반사 (고르지 않음, 로컬, 기록은 playback) ───────── */
  function octFree() { return !EP.busy && !PENDING && (MODE.name === 'free') && !ARM; }
  function volleyEpisode(b) {
    return run('volley', async function (tok) {
      try { await volleyBody(tok, b); } finally { kit.pose('lean', null); }
    });
  }
  async function volleyBody(tok, b) {
    await step(tok, kit.wait(TEMPO.volleyDelay));
    var t = kit.state().toys[b]; if (!t || t.attach || t.cover) return;
    var dest = frontCellNear(rowU(t.x, t.z), 'vol');
    kit.look(b); await step(tok, kit.face(b)); kit.pose('lean', LEAN);
    await step(tok, kit.nudge(b, dest, { poses: RED ? 1 : 3 })); plog('volley', [b]);   /* 몸이 기울고 팔 하나가 3포즈로 뻗어 받아친다 */
    kit.pose('lean', null); kit.look(b);
  }
  function novelty(kind) {
    NOVEL = kind; plog('novelty', [], { kind: kind });
    if (EP.busy) return;
    kit.expr('curious'); kit.pose('novel', { tilt: 7 * Math.PI / 180 }); say(TX.novel, 900);
    setTimeout(function () { kit.pose('novel', null); if (!EP.busy && MODE.name === 'free') kit.expr('idle'); }, TEMPO.novelty * 1000 * SPEED);
  }
  function clearView() {   /* 2층 탑이 문어 바로 앞이면 옆으로 두 칸 비켜서 본다 (눈이 탑에 가리지 않게, 재생) */
    if (!octFree()) return false;
    var W = world(), o = octXZ(), ou = rowU(o[0], o[1]), ov = rowV(o[0], o[1]);
    var tw = W.groups.filter(function (g) { return g.top && Math.abs(rowU(g.x, g.z) - ou) < 1.3 && rowV(g.x, g.z) > ov; })[0]; if (!tw) return false;
    var h = homeSpot(); if (dist2(h, o) < 0.08) return false;
    run('step-aside', async function (tok) { kit.look(tw.top); await step(tok, kit.walkTo(h[0], h[1])); plog('step_aside', [tw.id]); await step(tok, kit.face(tw.id)); kit.look(tw.top); });
    return true;
  }
  function checkNovelty(kind) { if (kind === 'stack' && !SESSION.seen.stack) { SESSION.seen.stack = true; novelty('first_stack'); return; } if (kind === 'two' && !SESSION.seen.two) { SESSION.seen.two = true; novelty('first_two_balls'); return; } if (typeof kind === 'number' && !SESSION.seen.cells[kind]) { SESSION.seen.cells[kind] = true; novelty('cup_cell_' + kind); } }
  async function popOutNow(tok, byUser) {
    var d = MODE.data || {}; setMode('free');
    var r = await step(tok, kit.popOut({ cup: d.tipCup || d.cup })); say(TX.pop, 1200); plog('pop_out', [d.tipCup || d.cup], { by_user: !!byUser });
    if (byUser && d.kind === 'peek') M.initiative.hide_peek.found++;
    void r; await step(tok, kit.wait(0.5)); kit.expr('idle');
    await goHome(tok);
  }
  async function camoOff(tok, byUser) {
    setMode('free'); kit.pose('camo', null);
    await step(tok, kit.camouflage(null)); if (byUser) { say(TX.camoFound, 1400); await step(tok, kit.joy()); }
    plog('camo_off', [], { by_user: !!byUser }); kit.expr('idle');
  }
  async function hatOff(tok) {
    var c = MODE.data && MODE.data.cup; setMode('free'); if (!c || !kit.has(c)) return;
    var W = world(), u = nearestFreeEven(W, octXZ()[0], octXZ()[1], null); if (u == null) u = 0;
    await goWork(tok, u);
    var p = kit.cell(u, 1); await step(tok, kit.takeOffHat(c, p[0], p[1])); plog('hat_off', [c], { setup: true }); settleBalls('eject');
    M.setup.byOctopus.push(tNow());
    await goHome(tok);
  }

  /* ───────── 입력 (#touch 가 모든 포인터를 받는다) ───────── */
  var DOWN = null, petTimer = 0;
  function firstTouch() {
    if (TOUCHED) return; TOUCHED = true;
    var h = document.getElementById('hint'); if (h) h.classList.add('gone');
    var rs = document.getElementById('reset'); if (rs) rs.hidden = false;
  }
  function inR(r, x, y, pad) { pad = pad || 0; return !!r && x >= r.l - pad && x <= r.r + pad && y >= r.t - pad && y <= r.b + pad; }
  function pickAt(x, y) {   /* 보이는 그림이 이긴다: 컵의 넉넉한 탭 상자가 문어 머리에 겹쳐도, 손가락 밑이 문어 머리고 컵 그림이 아니면 문어 */
    var hit = kit.pick(x, y);
    if (hit && (hit.kind === 'cup' || hit.kind === 'basket') && MODE.name !== 'hidden' && inR(kit.headRect(), x, y)) {
      var tr = kit.targets().filter(function (t) { return t.id === hit.id && t.kind === hit.kind; })[0];
      if (!tr || !inR(tr.rect, x, y, 2)) hit = { kind: 'oct', id: 'oct' };
    }
    if (!hit) { var o = inst.pickAt(x, y); if (o && o.kind === 'oct') hit = { kind: 'oct', id: 'oct' }; }
    return hit;
  }
  function reflexLook(hit, x, y) {   /* (A) 즉시: 눈·몸이 만진 물건으로 (한 프레임 안) */
    if (!hit) { kit.look({ x: x, y: y }); return; }
    if (hit.kind === 'oct') { kit.look('camera'); return; }
    kit.look(hit.kind === 'tip' ? hit.id : hit.id);
    if (MODE.name !== 'stop' && MODE.name !== 'hidden' && MODE.name !== 'camo') { var e = kit.state().oct.expr; if (e === 'idle' || e === 'blink' || e === 'calm') kit.expr('curious'); }
    if (!EP.busy && MODE.name === 'free') kit.face(hit.id);
  }
  function onDown(e) {
    if (!kit || DOWN) return;
    var t0 = performance.now(), x = e.clientX, y = e.clientY;
    lastInput = now(); IDLE.streak = 0; firstTouch();
    if (EP.busy && EP.name === 'fidget') softStop();
    var hit = pickAt(x, y);
    reflexLook(hit, x, y);
    M.reflexMs.push(+(performance.now() - t0).toFixed(1));   /* 처리기 시간 */
    requestAnimationFrame(function () { M.reflexFrameMs.push(+(performance.now() - t0).toFixed(1)); });   /* 다음 그린 프레임까지 (장면 루프가 먼저 그린다) */
    IDLE.afterStop = false;
    DOWN = { pid: e.pointerId, hit: hit, x0: x, y0: y, x: x, y: y, t0: now(), moved: false, trail: [[x, y, performance.now()]], drag: null, rub: 0 };
    try { touchEl.setPointerCapture(e.pointerId); } catch (er) { /* noop */ }
    if (hit && hit.kind === 'oct') petTimer = setTimeout(function () { if (DOWN && DOWN.hit && DOWN.hit.kind === 'oct' && !DOWN.moved) pet(); }, 500);
    if (hit && (hit.kind === 'ball') && (OFFER || INVITE)) noteRetouch(hit.id);
    e.preventDefault();
  }
  function noteRetouch(b) {
    var t = now();
    if (OFFER && OFFER.ball === b && !OFFER.touched && t - OFFER.t0 <= TEMPO.retouch) { OFFER.touched = true; var o = M.offers[OFFER.kind]; o.retouched10s++; o.ms.push(Math.round((t - OFFER.t0) * 1000)); if (OFFER.kind === 'offer_ball' || OFFER.kind === 'opening') { kit.expr('happy'); setTimeout(function () { if (MODE.name === 'free' && !EP.busy) kit.expr('idle'); }, 700 * SPEED); } }
    if (INVITE && INVITE.ball === b && !INVITE.touched) { INVITE.touched = true; M.initiative.invite_roll.accepted++; kit.expr('happy'); plog('invite_accepted', [b]); }
  }
  function onMove(e) {
    if (!DOWN || e.pointerId !== DOWN.pid) return;
    var x = e.clientX, y = e.clientY, d = Math.hypot(x - DOWN.x0, y - DOWN.y0);
    DOWN.rub += Math.hypot(x - DOWN.x, y - DOWN.y); DOWN.x = x; DOWN.y = y;
    DOWN.trail.push([x, y, performance.now()]); if (DOWN.trail.length > 8) DOWN.trail.shift();
    lastInput = now();
    if (!DOWN.moved && d > 8) { DOWN.moved = true; beginDrag(); }
    if (DOWN.drag) dragTo(x, y);
    else if (DOWN.hit && DOWN.hit.kind === 'oct' && DOWN.rub > 60) pet();
    else if (!DOWN.hit) kit.look({ x: x, y: y });
  }
  function onUp(e) {
    if (!DOWN || e.pointerId !== DOWN.pid) return;
    clearTimeout(petTimer);
    var D = DOWN; DOWN = null; lastInput = now();
    if (e.type === 'pointercancel') { if (D.drag) dropDrag(D, true); return; }
    if (D.drag) dropDrag(D, false);
    else if (!D.moved && !D.petted) tap(D.hit);   /* 쓰다듬은 손을 뗀 건 톡이 아니다 */
    if (!EP.busy && MODE.name === 'free') setTimeout(function () { if (!DOWN && !EP.busy && MODE.name === 'free') { var ex = kit.state().oct.expr; if (ex === 'curious') kit.expr('idle'); } }, 1500 * SPEED);
  }
  function pet() { if (MODE.name === 'hidden' || (DOWN && DOWN.petted)) return; if (DOWN) DOWN.petted = true; kit.expr('pet'); ulog('pet', ['oct']); setTimeout(function () { if (kit.state().oct.expr === 'pet') kit.expr('idle'); }, 1200); }
  function heldByOct(id) { var t = kit.state().toys[id]; return t && t.attach && t.attach.indexOf('arm:') === 0; }
  function letGo(id, dragging) {   /* 문어가 쥔 장난감을 잡으면 바로 놓는다. 남은 동작은 정리로 (삐지지 않는다). dragging = 사람이 그 컵을 들고 있다 */
    plog('let_go', [id]);
    var skip = dragging ? id : null;
    if (EP.busy) cancelEpisode('let_go', skip); else { kit.reset(); snapCups(skip); }
    if (ROUND) endRound(ROUND);
  }
  function beginDrag() {
    var h = DOWN.hit; if (!h || (h.kind !== 'ball' && h.kind !== 'cup')) return;
    if (MODE.name === 'hidden' && h.kind === 'cup' && MODE.data && (h.id === MODE.data.cup || h.id === MODE.data.tipCup)) return;
    if (MODE.name === 'hat' && MODE.data && h.id === MODE.data.cup) return;
    if (heldByOct(h.id)) letGo(h.id, true);
    else if (EP.busy && EP.name === 'volley' && h.kind === 'ball') cancelEpisode('user');
    var st = kit.state().toys[h.id]; if (!st) return;
    var sc = kit.screenOf(h.id);
    DOWN.drag = { id: h.id, kind: h.kind, gx: sc ? sc.x - DOWN.x0 : 0, gy: sc ? sc.y - DOWN.y0 : 0, from: [st.x, st.z], fromCell: st.cell, wasOn: st.on || null, preview: null, t0: now(), dist: 0 };
    if (h.kind === 'cup' && st.on) kit.prop(h.id, { on: null, x: st.x, z: st.z });
    if (h.kind === 'ball' && st.inBasket) kit.roll(h.id, [st.x, st.z]);   /* 바구니에서 꺼냄 (바닥 높이로) */
    if (h.kind === 'ball' && OFFER && OFFER.ball === h.id) noteRetouch(h.id);
  }
  function dragTo(x, y) {
    var dr = DOWN.drag, W, g;
    if (dr.kind === 'ball') {
      var zg = cupZoneAt(x + dr.gx, y + dr.gy);
      if (zg) { var ff = G().f; kit.prop(dr.id, { x: zg.x + ff[0] * 0.22, z: zg.z + ff[2] * 0.22, lift: 3 }); setPreview(zg.id, 4); return; }   /* 컵 그림 위: 공은 컵 앞 입구에, 컵은 4px 들려 받을 준비 */
      var p = kit.floorAt(x + dr.gx, y + dr.gy, kit.BALL_R); if (!p) return;
      var q = clampFloor(p.x, p.z); kit.prop(dr.id, { x: q[0], z: q[1], lift: 3 });
      W = world(); g = groupUnder(W, q[0], q[1], 0.26, null); setPreview(g && g.id);
    } else {
      var pc = kit.floorAt(x + dr.gx, y + dr.gy, kit.CUP.h / 2); if (!pc) return;
      var u = clamp(rowU(pc.x, pc.z), 0, 8), c = fromUV(u, 0); kit.prop(dr.id, { x: c[0], z: c[1], lift: 2 });
      W = world(); g = groupUnder(W, c[0], c[1], 0.2, dr.id); setPreview(g && stackable(W, dr.id, g) ? g.id : null, 2);
    }
  }
  function setPreview(id, px) { var dr = DOWN && DOWN.drag; if (!dr) return; if (dr.preview && dr.preview !== id && kit.has(dr.preview)) kit.prop(dr.preview, { lift: 0 }); dr.preview = id; if (id) kit.prop(id, { lift: px || 2 }); }
  function cupZoneAt(x, y) {   /* 화면 점이 바닥 컵(탑이면 탑 전체) 그림 위면 그 줄 (옆 6px · 위 10px 여유) */
    var W = world(), T = {}, best = null, bd = 1e9;
    kit.targets().forEach(function (t) { T[t.id] = t; });
    W.groups.forEach(function (g) {
      var r = T[g.id] && T[g.id].rect, tp = g.top && T[g.top] && T[g.top].rect; if (!r) return;
      var l = r.l, rr = r.r, top = tp ? Math.min(r.t, tp.t) : r.t;
      if (x < l - 6 || x > rr + 6 || y < top - 10 || y > r.b + 4) return;
      var d = Math.hypot(x - (l + rr) / 2, y - (top + r.b) / 2); if (d < bd) { bd = d; best = g; }
    });
    return best;
  }
  function groupUnder(W, x, z, r, except) { var best = null, bd = r; W.groups.forEach(function (g) { if (g.id === except) return; var d = Math.hypot(g.x - x, g.z - z); if (d < bd) { bd = d; best = g; } }); return best; }
  function stackable(W, id, g) { if (g.top) return false; return !W.cups.some(function (c) { return c.on === id; }); }   /* 2층까지 */
  function dropDrag(D, cancelled) {
    var dr = D.drag; if (dr.preview && kit.has(dr.preview)) kit.prop(dr.preview, { lift: 0 });
    var W = world(), st = kit.state().toys[dr.id]; if (!st) return;
    var tr = D.trail, a = tr[0], b = tr[tr.length - 1], dt = Math.max(1, b[2] - a[2]), vx = (b[0] - a[0]) / dt * 1000, vy = (b[1] - a[1]) / dt * 1000, sp = Math.hypot(vx, vy);
    if (dr.kind === 'ball') {
      var bk = BASKET_ON ? kit.state().toys.basket : null;
      if (!cancelled && bk && Math.hypot(bk.x - st.x, bk.z - st.z) < 0.28) { kit.putInBasket(dr.id); ulog('put_away', [dr.id, 'basket'], { setup: true }); M.setup.byUser.push(tNow()); return; }
      var g = groupUnder(W, st.x, st.z, 0.26, null);
      if (!cancelled && g) { hideUnder(dr.id, g.id, 'drag'); return; }
      if (!cancelled && sp > 700) { flickRoll(dr.id, vx, vy, sp); return; }
      var d = rowV(st.x, st.z), u = clamp(Math.round(rowU(st.x, st.z)), 0, 8), cell = d > -0.3 ? kit.cell(u, 0) : kit.cell(u, 2);
      if (d > -0.3 && d < 0.3) cell = kit.cell(u, 0);
      kit.prop(dr.id, { x: cell[0], z: cell[1], lift: 0 });
      ulog('move_ball', [dr.id], { setup: true, to: kit.cellOf(cell[0], cell[1]) }); M.setup.byUser.push(tNow());
      LAST = { by: 'user', act: 'move_ball', obj: dr.id };
      maybeVolley(dr.id);
      return;
    }
    /* 컵 */
    var u2 = rowU(st.x, st.z), tg = groupUnder(W, st.x, st.z, 0.2, dr.id), fast = (now() - dr.t0) < 0.25 * SPEED && Math.abs(u2 - rowU(dr.from[0], dr.from[1])) > 1.2;
    var covered = W.balls.filter(function (bb) { return bb.coverRaw === dr.id; }).map(function (bb) { return bb.id; });
    if (!cancelled && tg && stackable(W, dr.id, tg)) {
      kit.prop(dr.id, { on: tg.id, lift: 0 });
      covered.forEach(function (bid) { kit.cover(bid, tg.id); });   /* 탑 위에 놓은 컵 밑 공은 탑 밑으로 */
      ulog('stack', [dr.id, tg.id], { setup: true }); M.setup.byUser.push(tNow()); LAST = { by: 'user', act: 'stack', obj: dr.id };
      event('user stacked ' + dr.id + ' on ' + tg.id);
      countMoves(fast); checkNovelty('stack'); armIfHidden('stack'); if (!ARM) clearView();
      return;
    }
    var fu = nearestFreeEven(world(), st.x, st.z, dr.id); if (fu == null) fu = Math.round(rowU(dr.from[0], dr.from[1]));
    var c = kit.cell(fu, 1); kit.prop(dr.id, { x: c[0], z: c[1], lift: 0 });
    var moved = Math.hypot(c[0] - dr.from[0], c[1] - dr.from[1]) > 0.05 || dr.wasOn;
    var cov = cancelled ? [] : settleBalls('cover', dr.id).covered;   /* 컵을 공 위에 놓았다 = 숨겼다 (보이는 그대로) */
    cov.forEach(function (bc) { HID[bc[0]] = { by: 'user', m: 0, lost: false, ruled: [], t: now() }; SESSION.userHid = true; COVERED = null; ulog('hide', bc, { setup: true, how: 'cup' }); LAST = { by: 'user', act: 'hide', obj: bc[0] }; event('user hid ' + bc[0]); });
    if (cov.length) { if (moved) ulog(dr.wasOn ? 'unstack' : 'move_cup', [dr.id], { setup: true, to: [fu, 1] }); M.setup.byUser.push(tNow()); armRound('hide'); return; }
    if (!moved) return;
    ulog(dr.wasOn ? 'unstack' : 'move_cup', [dr.id], { setup: true, to: [fu, 1], fast: fast || undefined }); M.setup.byUser.push(tNow());
    countMoves(fast); checkNovelty(fu); armIfHidden('shuffle');
  }
  function countMoves(fast) {
    var any = false; Object.keys(HID).forEach(function (k) { HID[k].m += fast ? 2 : 1; any = true; });
    if (any) { var n = 0; Object.keys(HID).forEach(function (k) { n = Math.max(n, HID[k].m); }); LAST = { by: 'user', act: 'shuffle', n: n }; event('user moved cups x' + n, 'user moved cups'); }
  }
  function armIfHidden(reason) { if (Object.keys(HID).some(function (k) { return HID[k] && world().balls.some(function (b) { return b.id === k && b.under; }); })) armRound(reason); }
  function armRound(reason) {
    if (EP.busy && EP.phase !== 'deciding') cancelEpisode('new-setup');   /* 결정 대기 중이면 그대로: 답이 오면 validate() 가 바뀐 배치를 보고 한 번 다시 묻는다 */
    ARM = { t: now(), reason: reason };
    kit.pose('antic', null);
  }
  function hideUnder(bid, gid, how) {   /* 컵이 4px 들리고 공이 들어가고 톡 내려앉는다 */
    kit.cover(bid, gid);                 /* 먼저 덮고 (놓는 순간부터 숨은 공) */
    armRound('hide');                    /* 하던 연출 정리 — 정리(kit.reset)가 아래 폴짝을 끊지 않게 폴짝보다 먼저 */
    var gt = kit.state().toys[gid]; if (gt) kit.cupHop(gid, gt.x, gt.z, { hide: bid, px: 4 });
    HID[bid] = { by: 'user', m: 0, lost: false, ruled: [], t: now() };
    SESSION.userHid = true; COVERED = null;
    ulog('hide', [bid, gid], { setup: true, how: how }); M.setup.byUser.push(tNow());
    LAST = { by: 'user', act: 'hide', obj: bid }; event('user hid ' + bid);
    if (Object.keys(HID).length >= 2) checkNovelty('two');
    if (MODE.name === 'free' && !EP.busy) { kit.expr('curious'); kit.look(gid); }   /* 다 봤다. 큰 눈 */
  }
  function maybeVolley(b) {
    var t = kit.state().toys[b], o = octXZ(); if (!t) return;
    if (Math.hypot(t.x - o[0], t.z - o[1]) < 0.75 && octFree()) volleyEpisode(b);
  }
  function rollTo(b, path, then) {   /* 사람이 민 공: 컵에 막히면 발치에 멈추고 컵이 폴짝 덮는다 (우연한 숨기기) */
    var t = kit.state().toys[b], to = path[path.length - 1], blk = kit.blocked([t.x, t.z], to);
    if (blk) {
      kit.roll(b, blk.stop).then(function (r) {
        if (!r.ok || !kit.has(blk.id)) return;
        var W = world(), g = W.groups.filter(function (x) { return x.id === blk.id; })[0]; if (!g) return;
        hideUnder(b, g.id, 'tap');
      });
      return;
    }
    kit.roll(b, to).then(function (r) { if (r.ok && then) then(); });
  }
  function flickRoll(b, vx, vy, sp) {
    var t = kit.state().toys[b], s0 = kit.screenOf(b); if (!t || !s0) return;
    var p0 = kit.floorAt(s0.x, s0.y, kit.BALL_R), p1 = kit.floorAt(s0.x + vx * 0.05, s0.y + vy * 0.05, kit.BALL_R); if (!p0 || !p1) return;
    var dx = p1.x - p0.x, dz = p1.z - p0.z, dl = Math.hypot(dx, dz) || 1, L = clamp(sp / 700 * 0.6, 0.6, 1.5);
    var to = clampFloor(t.x + dx / dl * L, t.z + dz / dl * L);
    ulog('flick', [b], { setup: true }); M.setup.byUser.push(tNow()); LAST = { by: 'user', act: 'flick', obj: b };
    rollTo(b, [to], function () { maybeVolley(b); });
  }
  function tap(hit) {
    if (!hit) return;
    var W = world();
    if (hit.kind === 'tip' || (hit.kind === 'cup' && MODE.name === 'hidden' && MODE.data && (hit.id === MODE.data.cup || hit.id === MODE.data.tipCup))) return hiddenTap(hit.kind, hit.id);
    if (hit.kind === 'oct') return tapOct();
    if (hit.kind === 'ball') {
      if (heldByOct(hit.id)) return letGo(hit.id);
      var t = kit.state().toys[hit.id]; if (!t) return;
      if (t.inBasket) { takeFromBasket(hit.id); return; }
      if (EP.busy && EP.name === 'volley') cancelEpisode('user');
      ulog('flick', [hit.id]); LAST = { by: 'user', act: 'flick', obj: hit.id };
      var o = octXZ(), d = rowV(t.x, t.z) - rowV(o[0], o[1]), to;
      if (d - 0.55 > 0.15) to = fromUV(rowU(t.x, t.z), rowV(t.x, t.z) - (d - 0.55));   /* 제 줄을 따라 문어 쪽으로 */
      else to = kit.cell(clamp(Math.round(rowU(t.x, t.z)), 1, 7), 0);                    /* 이미 문어 앞이면 사람 쪽으로 */
      rollTo(hit.id, [to], function () { maybeVolley(hit.id); });
      return;
    }
    if (hit.kind === 'cup') {
      if (heldByOct(hit.id)) return letGo(hit.id);
      if (MODE.name === 'hat' && MODE.data && MODE.data.cup === hit.id) return run('hat-off', function (tok) { return hatOff(tok); });
      var g = W.groups.filter(function (x) { return x.id === hit.id || x.top === hit.id; })[0]; if (!g) return;
      var under = W.balls.filter(function (b) { return b.under === g.id; }).map(function (b) { return b.id; });
      kit.peekCup(g.id);
      ulog('peek', [g.id], { saw: under.length ? under.join(',') : 'empty' }); LAST = { by: 'user', act: 'peek', obj: g.id }; event('user peeked ' + g.id);
      under.forEach(function (b) { if (HID[b]) { HID[b].m = 0; HID[b].lost = false; HID[b].ruled = []; } });   /* 같이 봤다 */
      if (COVERED && COVERED.cup === g.id && under.indexOf(COVERED.ball) >= 0) {
        M.initiative.cover_ball.found++; ulog('found', [COVERED.ball, g.id], { cover_ball: true }); plog('caught', [COVERED.ball], { cover_ball: true }); COVERED = null;
        if (!EP.busy && MODE.name === 'free') { kit.expr('happy'); say(TX.camoFound, 1200); setTimeout(function () { if (!EP.busy) kit.expr('idle'); }, 900 * SPEED); }
      }
      return;
    }
    if (hit.kind === 'basket') { var bb = W.balls.filter(function (b) { return b.inBasket; })[0]; if (bb) takeFromBasket(bb.id); }
  }
  function takeFromBasket(b) {
    var c = kit.cell(7, 0); kit.roll(b, c);
    ulog('take_ball', [b, 'basket'], { setup: true }); M.setup.byUser.push(tNow()); LAST = { by: 'user', act: 'take_ball', obj: b };
    if (!SESSION.seen.twoOut && octFree() && MODE.name === 'free') {   /* 공이 둘: 눈이 두 공을 번갈아 (재생, 처음 한 번) */
      SESSION.seen.twoOut = true;
      run('two-balls', async function (tok) { await step(tok, kit.scan(['b1', b, 'b1', b], 0.3)); say(TX.two, 1200); kit.expr('happy'); plog('glance', ['b1', b]); await step(tok, kit.wait(0.6)); kit.expr('idle'); kit.look(b); });
    }
  }
  function tapOct() {
    ulog('tap_oct', ['oct']);
    if (MODE.name === 'camo') return run('camo-found', function (tok) { return camoOff(tok, true); });
    if (MODE.name === 'hat') return run('hat-off', function (tok) { return hatOff(tok); });
    if (MODE.name === 'stop') return;   /* 쉬는 중: 눈만 따라온다 */
    say(TX.tapOct, 900); kit.expr('curious'); kit.look('camera');
  }
  function hiddenTap(kind, cup) {
    var d = MODE.data || {};
    ulog(kind === 'tip' ? 'tap_tip' : 'peek', [cup]);
    if (kind === 'cup' && d.kind === 'squeeze') return run('pop', function (tok) { return popOutNow(tok, true); });
    if (EP.busy && EP.name === 'tip') return;
    d.taps = (d.taps || 0) + 1;
    if (kind === 'cup' || d.taps >= 2) { return run('pop', function (tok) { return popOutNow(tok, true); }); }
    return run('tip', async function (tok) {   /* 끝이 쏙 들어갔다가 400 ms 뒤 다른 쪽(또는 옆 빈 컵)에서 */
      kit.tipIn(); plog('tip_in', [d.tipCup]);
      await step(tok, kit.wait(TEMPO.tipSwitch));
      var W = world(), cu = Math.round(rowU.apply(null, (function () { var g = W.groups.filter(function (x) { return x.id === d.cup; })[0]; return g ? [g.x, g.z] : [0, 0]; })()));
      var nb = W.groups.filter(function (g) { var gu = Math.round(rowU(g.x, g.z)); return g.id !== d.cup && Math.abs(gu - cu) <= 2 && !g.top && !W.balls.some(function (b) { return b.under === g.id; }); })[0];
      var sides = ['left', 'right', 'back'].filter(function (s) { return s !== d.side; }), side = sides[Math.floor(pbr('tip') * sides.length)];
      if (nb && pbr('tipcup') < 0.5) { d.tipCup = nb.id; d.side = 'front'; await step(tok, kit.tipOut(nb.id, 'front')); plog('tip_out', [nb.id], { other_cup: true }); }
      else { d.side = side; await step(tok, kit.tipOut(d.tipCup, side)); plog('tip_out', [d.tipCup], { side: side }); }
      MODE.until = now() + tm('hideAuto');
    });
  }

  /* ───────── 시계 (100 ms) ───────── */
  function tick() {
    if (!kit) return;
    var t = now();
    if (!TOUCHED && !EP.busy && t - lastBob > TEMPO.bob * SPEED) { lastBob = t; var b1 = kit.state().toys.b1; if (b1 && !b1.cover && !b1.attach) { kit.bob('b1'); if (MODE.name === 'free') kit.look('b1'); } }
    /* 숨음 · 위장: 스스로 나온다 */
    if (MODE.name === 'hidden' && MODE.until && t > MODE.until && !EP.busy) run('pop-auto', function (tok) { return popOutNow(tok, false); });
    if (MODE.name === 'camo' && MODE.until && t > MODE.until && !EP.busy) run('camo-auto', function (tok) { return camoOff(tok, false); });
    /* 판: 숨긴 채 가라앉으면 (손 뗀 뒤 1.0 초) */
    if (ARM && !DOWN && !EP.busy && !PENDING && t - lastInput >= tm('settle')) {
      if (MODE.name === 'stop' && t < MODE.until) { /* 거절 최소 시간 */ }
      else {
        var W = world(); syncHID(W);
        if (W.balls.some(function (b) { return b.under; })) { ARM = null; run('round', roundEpisode); }
        else if (!W.s.jobs.some(function (j) { return /^(hop|roll|slide):/.test(j); }) || t - ARM.t > 4) ARM = null;   /* 컵이 아직 내려앉는 중이면 기다린다 */
      }
    }
    /* 먼저 놀기 (주인 추가 C): 손 놓은 지 8~15 초(시드), 30 초에 1번, 사람 입력 없이 연달아 2번까지 */
    if (IDLE_ON && !ARM && !DOWN && !EP.busy && !PENDING && !IDLE.afterStop && (MODE.name === 'free' || (MODE.name === 'stop' && t > MODE.until))) {
      var idleFor = t - lastInput, cool = t - IDLE.last;
      if (idleFor >= IDLE.next * SPEED && cool >= tm('initiativeCooldown') && IDLE.streak < 2) {
        IDLE.last = t; IDLE.streak++; IDLE.next = TEMPO.idleMin + (TEMPO.idleMax - TEMPO.idleMin) * rngFor('idle|' + (IDLE.n + 1))();
        run('idle', async function (tok) {
          if (MODE.name === 'stop') { kit.tuck(false); setMode('free'); kit.expr('idle'); }
          var ch = await decide('idle', tok); A(tok); IDLE.n++;
          if (!ch) return;
          plog('initiative', [], { chose: ch.action });
          await perform(tok, ch, { point: 'idle' });
        });
      }
    }
    /* 가만있을 때 작은 몸짓 (재생, 고르지 않음): 마지막 입력·동작에서 2.5~4.5 초(시드)마다. 손대면 바로 그친다 */
    if (IDLE_ON && TOUCHED && !ARM && !DOWN && octFree() && t - lastInput < 45 * SPEED && t - Math.max(lastInput, EP.lastEnd || 0) >= FID.next * SPEED) {   /* 45 초 넘게 아무도 없으면 쉰다 */ FID.next = TEMPO.fidgetMin + (TEMPO.fidgetMax - TEMPO.fidgetMin) * pbr('fid'); fidget(); }
    if (DEBUG) renderDebug();
  }
  var FIDGETS = ['pat', 'glance', 'wave', 'pat', 'glance'];
  function softStop() {   /* 몸짓만 멈춘다 (장난감 굴림·폴짝은 그대로) */
    EP.tok++; EP.busy = false; EP.name = null; EP.phase = null; FID.arm = null;
    var A0 = kit.state().arms;   /* 몸짓 중엔 다른 팔이 안 잡혀 있다 (octFree 일 때만 시작) → 뻗던 팔은 몸짓 것 */
    Object.keys(A0).forEach(function (a) { if (A0[a].mode !== 'tuck' && !A0[a].holds) { kit.cancel('arm' + a); kit.retract(+a); } });
    kit.pose('fid', null); kit.pose('lean', null);
  }
  function fidget() {
    var W = world(), o = octXZ(), kind = FIDGETS[Math.floor(pbr('fidk') * FIDGETS.length)];
    var near = W.groups.slice().sort(function (a, b) { return Math.hypot(a.x - o[0], a.z - o[1]) - Math.hypot(b.x - o[0], b.z - o[1]); })[0];
    var free = W.balls.filter(function (b) { return b.free; }).map(function (b) { return b.id; });
    FID.n++;
    run('fidget', async function (tok) {
      if (kind === 'pat' && near && Math.hypot(near.x - o[0], near.z - o[1]) < 1.25) {   /* 가까운 컵을 팔로 톡톡 (컵이 1px 두 번) */
        var id = near.top || near.id; kit.look(id);
        var r = await step(tok, kit.reach('auto', id, 0.9, { approach: false })); if (!r.ok) return; FID.arm = r.arm;
        await step(tok, kit.bob(near.id, 1)); await step(tok, kit.wait(0.15)); await step(tok, kit.bob(near.id, 1));
        plog('pat', [id], { ambient: true });
        await step(tok, kit.retract(r.arm)); FID.arm = null; kit.look(free[0] || 'camera'); return;
      }
      if (kind === 'wave') {   /* 팔 하나를 사람 쪽으로 들어 꼼지락 */
        kit.look('camera'); var cp = kit.state().oct.at, up = [cp[0] + G().f[0] * 0.35, 0.55, cp[1] + G().f[2] * 0.35];
        var r2 = await step(tok, kit.reach('auto', up, 0.9, { approach: false })); if (!r2.ok) return; FID.arm = r2.arm;
        await step(tok, kit.hesitate(r2.arm, 0.5, { eyes: false }));
        await step(tok, kit.retract(r2.arm)); FID.arm = null; return;
      }
      var list = free.concat(W.groups.map(function (g) { return g.top || g.id; })).slice(0, 3); list.push(free[0] || 'camera');   /* 눈으로 장난감들을 한 번 훑기 + 몸 살짝 */
      kit.pose('fid', { tilt: (FID.n % 2 ? 1 : -1) * 0.07 }); await step(tok, kit.scan(list, 0.35)); kit.pose('fid', null);
    });
  }

  /* ───────── 화면 (HTML 띠) ───────── */
  function renderReceipt() {
    var r = document.getElementById('receipt'); if (!r) return;
    r.textContent = !LASTDEC ? TX.receiptNone : LASTDEC.fallback ? TX.receiptFallback : TX.receipt + LASTDEC.label + ' · ' + LASTDEC.by;
  }
  function renderDebug() {
    var d = document.getElementById('dbg'); if (!d) return;
    var R = M.rounds[M.rounds.length - 1], last = M.decisions[M.decisions.length - 1];
    var ob = M.offers.offer_ball, rb = M.offers.roll_back;
    d.firstChild.textContent = 'round ' + (R ? R.n + ' dec ' + R.calls + '/' + R.budget + (R.over ? ' OVER' : '') + ' ' + R.bytes + 'B ~' + R.inTok + 'tok(est)' : '-') +
      '\nlast ' + (last ? last.point + ' ' + (last.answer ? last.answer.action : last.fallback ? 'ponder' : '-') + ' ' + last.payloadBytes + 'B ' + last.latencyMs + 'ms r' + last.retries : '-') +
      '\noffer retouch ' + ob.retouched10s + '/' + ob.shown + ' roll ' + rb.retouched10s + '/' + rb.shown + '\ninvite ' + M.initiative.invite_roll.accepted + '/' + M.initiative.invite_roll.shown +
      '\nmode ' + MODE.name + ' ep ' + (EP.name || '-') + '\nseed ' + DAY + (SEED ? '|' + SEED : '');
  }
  function showBasket(on) { BASKET_ON = !!on; if (!kit) return; kit.prop('basket', { vis: BASKET_ON }); var b2 = kit.state().toys.b2; if (b2) kit.prop('b2', { vis: BASKET_ON }); }
  function noGL(err, text) {
    var n = document.getElementById('nogl'); if (n) { n.textContent = text || TX.nogl; n.hidden = false; }
    ['bar', 'hint'].forEach(function (id) { var el = document.getElementById(id); if (el) el.hidden = true; });
    if (err) console.warn('[play] 3D off', err && err.message);
  }
  function layout() {
    ['c1', 'c2', 'c3', 'b1', 'b2', 'basket'].forEach(function (id) { if (kit.has(id)) kit.remove(id); });
    kit.addCup('c1', 'navy', 2); kit.addCup('c2', 'moss', 4); kit.addCup('c3', 'rose', 6);
    kit.addBasket('basket', 8); kit.addBall('b1', 'amber', 5); kit.addBall('b2', 'sky', 'basket');
    showBasket(DAYROUNDS >= 1);
    var h = kit.cell(4, 3); kit.jumpTo(h[0], h[1]); kit.face('camera'); kit.look('b1'); kit.expr('idle');
  }
  function resetAll(hook) {   /* '처음처럼': 판으로 세지 않는다. hook = 테스트 훅이 부름 (사람 기록 안 남김) */
    EP.tok++; EP.busy = false; EP.name = null; PENDING = false; ARM = null; ROUND = null;
    kit.reset(); setMode('free'); HID = {}; OFFER = null; INVITE = null; COVERED = null; NOVEL = null;
    layout(); if (!hook) { ulog('reset', []); LAST = { by: 'user', act: 'reset' }; event('user reset'); }
  }

  /* ───────── 부팅 ───────── */
  function boot() {
    document.title = TX.title;
    var hint = document.getElementById('hint'); if (hint) hint.textContent = TX.hint;
    var hon = document.getElementById('honest'), rs = document.getElementById('reset'), rc = document.getElementById('receipt');
    if (hon) { hon.textContent = honestText(); hon.addEventListener('click', function () { var open = rc.hidden; rc.hidden = !open; hon.setAttribute('aria-expanded', open ? 'true' : 'false'); renderReceipt(); }); }
    if (rs) { rs.textContent = TX.reset; rs.addEventListener('click', function () { resetAll(); }); }
    stage = document.getElementById('scene3d'); touchEl = document.getElementById('touch');
    if (stage) stage.setAttribute('aria-label', TX.scene);
    if (RED) document.documentElement.setAttribute('data-motion', 'reduce');
    if (DEBUG) { var d = document.createElement('div'); d.id = 'dbg'; d.appendChild(document.createElement('pre')); var fb = document.createElement('button'); fb.type = 'button'; fb.textContent = 'fun'; fb.addEventListener('click', function () { var last = M.decisions[M.decisions.length - 1]; M.marks.push({ t: tNow(), round: ROUND ? ROUND.n : DAYROUNDS, lastDecision: last ? last.id : null }); }); d.appendChild(fb); document.body.appendChild(d); }
    if (typeof SCENE3D === 'undefined' || !SCENE3D.supported()) return noGL();
    DAYROUNDS = loadRounds();
    try {
      inst = SCENE3D.init(stage, { color: '#e8463c', items: [], lantern: 6, hour: HOUR, weather: 'clear', reducedMotion: RED, speed: SPEED, octEl: document.getElementById('oct'), onLost: function () { noGL(new Error('context lost'), TX.lost); } });
      inst.setLook({ zoom: 3 });
      kit = inst.play();
    } catch (e) { return noGL(e); }
    if (MQ && MQ.addEventListener) MQ.addEventListener('change', function (ev) { if (qs('reduced') === '1') return; RED = ev.matches; inst.setReducedMotion(RED); document.documentElement.toggleAttribute('data-motion', false); if (RED) document.documentElement.setAttribute('data-motion', 'reduce'); });
    layout();
    touchEl.addEventListener('pointerdown', onDown);
    touchEl.addEventListener('pointermove', onMove);
    touchEl.addEventListener('pointerup', onUp);
    touchEl.addEventListener('pointercancel', onUp);
    touchEl.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.addEventListener('touchstart', function () { }, { passive: true });
    setInterval(tick, 100);
    if (qs('force')) setTimeout(function () { force(qs('force')); }, 200);
  }

  /* ───────── 테스트 훅 (window.__play) ───────── */
  function setupHidden(spec) {   /* { b1: 'c2', b2: 'c3', moves: 0 } — 드래그 없이 숨긴 배치 (사람이 한 것으로 기록) */
    Object.keys(spec).forEach(function (b) {
      if (b === 'moves') return;
      if (b === 'b2') showBasket(true);
      kit.prop(b, { x: kit.state().toys[spec[b]].x, z: kit.state().toys[spec[b]].z });
      kit.cover(b, spec[b]);
      HID[b] = { by: 'user', m: spec.moves || 0, lost: false, ruled: [], t: now() };
      SESSION.userHid = true;
      ulog('hide', [b, spec[b]], { setup: true, how: 'hook' }); LAST = { by: 'user', act: 'hide', obj: b }; event('user hid ' + b);
    });
    if (spec.moves) { LAST = { by: 'user', act: 'shuffle', n: spec.moves }; event('user moved cups x' + spec.moves, 'user moved cups'); }
  }
  var START_ACTS = ['lift_one', 'lift_all', 'two_arms', 'squeeze_in', 'camouflage', 'watch', 'stop'];
  var END_ACTS = ['offer_ball', 'roll_back', 'wear_cup_as_hat'];
  var IDLE_ACTS = ['invite_roll', 'hide_peek', 'cover_ball', 'bat_alone'];
  function force(id) {
    if (!kit) return false;
    resetAll(true); TOUCHED = true; lastInput = now();
    if (DAYROUNDS < 1) { DAYROUNDS = 1; saveRounds(1); }   /* 1회차 강제 규칙을 피한다 (판 수는 사실대로 오른다) */
    showBasket(true);
    if (START_ACTS.indexOf(id) >= 0) {
      if (id === 'two_arms') setupHidden({ b1: 'c1', b2: 'c3' });
      else setupHidden({ b1: 'c2', moves: id === 'camouflage' ? 2 : 0 });
      FORCE.start = id; ARM = { t: now() - 9, reason: 'force' }; lastInput = now() - 9; return true;
    }
    if (id === 'lift_next') { setupHidden({ b1: 'c3', moves: 3 }); FORCE.start = 'lift_one'; FORCE.fork = 'lift_next'; FORCE.__start = 'c1'; ARM = { t: now() - 9 }; lastInput = now() - 9; return true; }
    if (END_ACTS.indexOf(id) >= 0) { setupHidden({ b1: 'c2' }); FORCE.start = 'lift_one'; FORCE.end = id; ARM = { t: now() - 9 }; lastInput = now() - 9; return true; }
    if (IDLE_ACTS.indexOf(id) >= 0) {
      if (id === 'cover_ball') SESSION.userHid = false;
      FORCE.idle = id;
      run('idle', async function (tok) { var ch = await decide('idle', tok); A(tok); IDLE.n++; if (ch) { plog('initiative', [], { chose: ch.action, forced: true }); await perform(tok, ch, { point: 'idle' }); } });
      return true;
    }
    return false;
  }
  function sim(n, o) {   /* 30판 시드 시뮬 (§8.5 목표 비율). 별도 데모 chooser — 지금 세션 기억을 건드리지 않는다 */
    o = o || {}; n = n || 30;
    var ch = makeDemoChooser('demo-rules'), out = [], rng = rngFor('sim|' + (o.seed || ''));
    var cupsBase = [{ id: 'c1', cell: [2, 1], x: 0, z: 0, top: null }, { id: 'c2', cell: [4, 1], top: null }, { id: 'c3', cell: [6, 1], top: null }];
    var lastKey = null, same = 0;
    for (var r = 1; r <= n; r++) {
      var roll = rng(), tracked = roll < 0.5 ? 'sure' : roll < 0.8 ? 'unsure' : 'lost', two = r >= 2 && rng() < 0.15, sameSetup = r >= 2 && rng() < 0.2;   /* 시뮬 분포: 그대로 50 · 긴가민가 30 · 놓침 20 %, 같은 배치 반복 20 %, 공 둘 15 % */
      var hideCup = sameSetup && out.length ? out[out.length - 1].hideCup : ['c1', 'c2', 'c3'][Math.floor(rng() * 3)];
      var m = tracked === 'sure' ? 0 : tracked === 'unsure' ? 1 + Math.floor(rng() * 2) : 3;
      var balls = [{ id: 'b1', cell: [4, 1], under: hideCup, free: false }];
      if (two) balls.push({ id: 'b2', cell: [6, 1], under: hideCup === 'c3' ? 'c1' : 'c3', free: false });
      var W = { groups: cupsBase, balls: balls, heldCups: [], hat: null, oct: { cell: [4, 3] } }, P = {};
      balls.forEach(function (b) { P[b.id] = { m: m, lost: false, ruled: [] }; });
      var s = buildSituation('start', W, P, { round: r, id: 'r' + r + '.start', session: { userHid: true, covers: 0 }, recent: [], last: { by: 'user', act: m ? 'shuffle' : 'hide', n: m || undefined } });
      var key = setupKeyOf(s); same = key === lastKey ? same + 1 : 0; lastKey = key; s.facts.same_setup_runs = same;
      var a = ch.decideSync(s), rec = { round: r, tracked: tracked, start: a.action, startKind: KIND[a.action], target: a.target || null, considered: a.considered || null, hideCup: hideCup, end: null, endKind: null };
      if (/^(lift_one|lift_all|two_arms|lift_next)$/.test(a.action)) {
        var W2 = { groups: cupsBase.filter(function (g) { return g.id !== hideCup; }), balls: [{ id: 'b1', cell: [4, 1], under: null, free: false, held: 'arm' }], heldCups: [hideCup], hat: null, oct: { cell: [4, 2] } };
        var s2 = buildSituation('end', W2, {}, { round: r, id: 'r' + r + '.end', found: ['b1'], held: [hideCup], session: { userHid: true, covers: 0 } });
        var e = ch.decideSync(s2); rec.end = e.action; rec.endKind = KIND[e.action];
      }
      out.push(rec);
    }
    var starts = out.map(function (x) { return x.startKind; }), cnt = {}; starts.forEach(function (k) { cnt[k] = (cnt[k] || 0) + 1; });
    return { rounds: out, ratio: { readable: (cnt.readable || 0) / n, quirk: (cnt.quirk || 0) / n, surprise: (cnt.surprise || 0) / n, decline: (cnt.decline || 0) / n, rest: (cnt.rest || 0) / n } };
  }
  function honestPair(moves) {   /* 지각이 같고 정답만 다른 두 상황 → situation 문자열과 데모 선택 */
    var W1 = world(); var res = [];
    ['c1', 'c3'].forEach(function (truth) {
      var W = JSON.parse(JSON.stringify({ groups: W1.groups, balls: W1.balls, heldCups: [], hat: null, oct: W1.oct }));
      W.balls.forEach(function (b) { if (b.id === 'b1') { b.under = truth; b.free = false; b.cell = W.groups.filter(function (g) { return g.id === truth; })[0].cell; } });
      var P = { b1: { m: moves, lost: false, ruled: [] } };
      var s = buildSituation('start', W, P, { round: 4, id: 'r4.start', session: { userHid: true, covers: 0 }, recent: ['user hid b1', 'user moved cups x' + moves], last: { by: 'user', act: 'shuffle', n: moves } });
      var c = makeDemoChooser(); res.push({ truth: truth, sit: JSON.stringify(s), choice: c.decideSync(JSON.parse(JSON.stringify(s))) });
    });
    return res;
  }
  window.__play = {
    get log() { return LOG; }, metrics: M, kit: function () { return kit; }, inst: function () { return inst; },
    get chooser() { return CH; }, demo: DEMO, MENU: MENU, TEMPO: TEMPO, KIND: KIND,
    state: function () { var W = kit ? world() : null; return { mode: MODE.name, modeData: MODE.data, busy: EP.busy, episode: EP.name, phase: EP.phase, pending: PENDING, armed: !!ARM, round: ROUND ? ROUND.n : null, dayRounds: DAYROUNDS, hid: JSON.parse(JSON.stringify(HID)), basket: BASKET_ON, touched: TOUCHED, done: DONE.slice(), offer: OFFER, invite: INVITE, idle: { next: IDLE.next, streak: IDLE.streak, n: IDLE.n, last: IDLE.last }, oct: W && W.oct, balls: W && W.balls, groups: W && W.groups, reduced: RED, speed: SPEED, note: NOTE }; },
    situation: function (point, extra) { return situationNow(point || 'start', extra); },
    buildSituation: buildSituation, menuFor: menuFor, setupHidden: setupHidden,
    sim: sim, honestPair: honestPair, force: force, reset: function () { resetAll(); },
    decide: function (point) { var tok = EP.tok; return decide(point, tok); },
    setChooser: function (c) { CH = c; renderHonest(); }, makeChooser: makeChooser, approxTokens: approxTokens, honestText: honestText,
    arm: function () { ARM = { t: now() - 9 }; lastInput = now() - 9; }, round: function () { return ROUND; },
    budgetTest: async function () {   /* 한 판에 결정 지점 4개를 억지로 → chooser 3번, over, 4번째는 ponder */
      var R = beginRound(), tok = ++EP.tok, out = []; EP.busy = true; EP.name = 'budget-test';
      var pts = ['start', 'fork', 'end', 'end'], before = M.decisions.length;
      for (var i = 0; i < pts.length; i++) { var ch = await decide(pts[i], tok, pts[i] === 'end' ? { found: ['b1'], held: [] } : {}); out.push(ch ? ch.action + (ch.fallback ? '(fallback)' : '') : null); }
      EP.busy = false; EP.name = null; endRound(R);
      return { calls: R.calls, over: R.over, actions: out, recs: M.decisions.slice(before).map(function (d) { return { point: d.point, calls: d.calls, fallback: d.fallback, over: !!d.over }; }) };
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  return { TEMPO: TEMPO, MENU: MENU, NEEDS: NEEDS, buildSituation: buildSituation, makeDemoChooser: makeDemoChooser };
})();
