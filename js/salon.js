/* js/salon.js - 미용실 규칙 (전역 SALON). 스펙: docs/SALON.md (주인 11-08 밤).
 *
 * 몸 색은 사람이 처음 한 번만 고른다. 그 뒤로는 미용실(다락 거울 코너)에서 사람이 색을 내밀고 묻고,
 * 바꿀지는 문어가 정한다.
 *
 * - 순수 로직이다. DOM, 저장소, 시계, 네트워크를 쓰지 않는다. node 에서도 그대로 로드된다 (module.exports).
 *   시각이 필요하면 부르는 쪽이 at(ms) 이나 날짜 키(YYYY-MM-DD, 그 기기의 달력)를 넘긴다.
 * - 데모 대답은 시드로만 정한다: hashSeed('salon', 날짜, 이름, born) 의 mulberry32 첫 값. 무작위 함수, 시계는 쓰지 않는다.
 *   색은 시드에 없다. 그날 그 문어의 답은 어떤 색을 내밀어도 같다 (색 취향을 지어낼 길이 없다).
 * - 모든 물음에 keep(그대로)이 첫째로 있다. 이유를 묻지 않는다. 받은 답은 다시 묻지 않는다.
 * - 코드가 짓는 글은 사실만 쓴다 (취향 말 0건). 데모 문구는 데모 규칙의 대답에만 쓴다.
 *   모델 말은 한 글자도 바꾸지 않는다. 말이 없으면 문어 행이 없다 (데모 문구로 채우지 않는다).
 * - 미용실은 아무것도 주지 않는다. 대답은 취향 점수가 되지 않는다 (여기엔 그런 칸이 없다).
 * - 물음은 로컬 날짜마다 한 번 (대답이 무엇이든). '그대로'라고 한 그 색은 REST_DAYS 일 쉰다.
 *
 * 저장 모양 (localStorage ppolppol_v2 에 덧붙임):
 *   octopus.color   지금 몸 색 (읽는 곳은 이것 하나). settings.octColor 는 그 사본이다.
 *   octopus.colors  바뀐 기록 [{ at, date, color, how: first|salon|dev, by, ask? }] 오래된 것부터
 *   salon.asks      물음 [{ id, date, at, from, offer, offerName, offerKind, offeredBy, status, action, actionRaw,
 *                          by, rule, line, expr, exprRaw, seed, via, model, raw, sent, lateRaw }]
 */
(function (root) {
  'use strict';

  /* ---------- 상수 ---------- */
  var DEFAULT_COLOR = '#e8463c';   /* 첫 실행 창에서 처음 눌려 있는 색 (빨강) */

  function deepFreeze(o) {
    Object.keys(o).forEach(function (k) { if (o[k] && typeof o[k] === 'object') deepFreeze(o[k]); });
    return Object.freeze(o);
  }

  /* 단추와 aria 는 짧은 이름, 문장 속에선 '...색' (조사는 늘 '이') */
  var PRESETS = deepFreeze([
    { hex: '#e8463c', short: '빨강', name: '빨간색' },
    { hex: '#f08a3c', short: '주황', name: '주황색' },
    { hex: '#9a5cc8', short: '보라', name: '보라색' },
    { hex: '#4a86d8', short: '파랑', name: '파란색' },
    { hex: '#4fa868', short: '초록', name: '초록색' },
    { hex: '#f07aa8', short: '분홍', name: '분홍색' }
  ]);
  var FIRST = deepFreeze({ short: '처음', name: '처음 색' });   /* 7번째 병: 처음 색이 프리셋이 아닐 때 (옛 슬라이더 기록) */
  /* 프리셋이 아닌 색의 문장 이름: HSL 색상(도, 반올림)의 윗 끝. 345 부터는 다시 빨간색 */
  var HUES = [[15, '빨간색'], [45, '주황색'], [70, '노란색'], [165, '초록색'], [195, '청록색'], [255, '파란색'], [290, '보라색'], [345, '분홍색'], [360, '빨간색']];
  var EXPRS = ['idle', 'happy', 'curious', 'calm'];

  /* 문어 목소리. 데모 규칙의 대답에만 쓴다 (늘 보이는 '데모' 꼬리표 아래). 결정만 말한다: 이유, 느낌, 사람 칭찬, '오늘은' 없음 */
  var LINES = deepFreeze({
    dye: ['응, 해 볼래.', '그래, 바꿔 볼래.', '이 색 해 볼래.'],
    keep: ['이대로 있을래.', '지금 색 그대로 있을래.', '안 바꿀래.']
  });

  /* 모델 고정 문맥 (도구 설명이나 시스템에 한 번). 하루 한 번, 쉬는 날, 마감, 확률은 넣지 않는다 */
  var CONTEXT = "미용실: 사람이 색 하나를 골라, 네 몸을 그 색으로 바꿔 볼지 물었어. 그대로 두려면 keep, 바꾸려면 dye. " +
    "바꾸면 다음에 또 바꿀 때까지 그 색이야. 이유는 안 써도 돼. 한마디(line)와 얼굴(expr: idle, happy, curious, calm)은 골라도 안 골라도 돼. " +
    "line 은 24자쯤이 말풍선에 맞고, 넘으면 말풍선엔 앞부분과 '…', 기록엔 전부 남아. 어느 쪽이든 게임에서 잃는 건 없어.";

  /* 집 목소리 (모든 모드). 일어난 일만 쓴다. {name} 뒤엔 조사를 붙이지 않는다 */
  var TEXT = deepFreeze({
    sheet: '미용실',                                   /* 시트 제목 */
    group: '몸 색',                                    /* 병 묶음 aria-label */
    ask: '물어보기',
    close: '닫기',
    now: '지금',                                       /* 지금 색 병 아래 */
    first: '처음',                                     /* 처음 색 병 아래 */
    current: '지금 이 색이야.',                         /* 이름 줄: 지금 색 병 */
    resting: '이 색은 며칠 뒤에 물어볼 수 있어.',        /* 이름 줄: 쉬는 색 병 (남은 날 수는 숨긴다) */
    ariaCurrent: '{short}, 지금 색',
    ariaResting: '{short}, 며칠 뒤에 물어볼 수 있어',
    rowAsk: '미용실',                                   /* 로그 행 라벨 1 (집) */
    rowReply: '대답',                                   /* 로그 행 라벨 2 (문어, 말이 있을 때만) */
    rowResult: '몸 색',                                 /* 로그 행 라벨 3 (집) */
    asked: '{color} 어때? 하고 물어봤어.',
    dyed: '{name} 몸이 {color}이 됐어.',
    dyedFirst: '{name} 몸이 처음 색으로 돌아왔어.',
    kept: '색은 그대로야.',
    none: '대답이 없었어. 색은 그대로야.',
    unreadable: '답을 못 읽었어. 색은 그대로야.',
    askedToday: '내일 또 물어볼 수 있어.',               /* 토스트: 오늘 이미 물었음 */
    waiting: '아직 대답을 기다리는 중이야.',             /* 토스트: 대답을 기다리는 중 (모델, 나중) */
    settingsHead: '문어 색',
    settings: '거울 앞에서 {name}에게 물어볼 수 있어.',
    spot: '거울 옆',                                    /* 장면 설명의 자리 */
    desc: '몸은 {color}이야.',                          /* 장면 설명 끝 한 마디 */
    octopus: '문어'                                     /* 이름이 없을 때 */
  });
  /* 행 3 꼬리: 누가 정했나. fallback(아무도 안 고름)과 unknown 은 꼬리가 없다 */
  var TAILS = deepFreeze({ 'demo-rules': '데모 규칙', model: '모델', human: '사람이 정함' });
  /* by 풀이 글 (방 보기를 글로 풀 때). 모델이 고르지 않은 변화를 모델이 골랐다고 쓰지 않는다 */
  var BY_TEXT = deepFreeze({
    player: '처음 고를 때 사람이 고른 색',
    'default': '처음 고를 때 색을 누르지 않아 기본값 그대로',
    migrated: '미용실 전에 사람이 설정에서 고른 색(또는 기본값)',
    'demo-rules': '데모 규칙이 고름',
    model: '모델이 고름',
    human: '사람이 정함',
    dev: '개발용으로 사람이 바로 바꿈',
    fallback: '대답이 없어 그대로 둠',
    unknown: '누가 정했는지 모름'
  });

  var STATUSES = ['done', 'waiting', 'dropped'];
  var ASK_BY = ['demo-rules', 'model', 'human', 'fallback', 'unknown'];
  var CHOOSERS = ['demo-rules', 'model', 'human', 'fallback'];   /* 새 물음의 고른 이 (unknown 은 옛 기록에만) */
  var COLOR_BY = ['player', 'default', 'migrated', 'demo-rules', 'model', 'human', 'dev', 'unknown'];
  var HOWS = ['first', 'salon', 'dev'];
  var OFFER_BY = ['player', 'unknown'];

  var SALON = {
    DEFAULT_COLOR: DEFAULT_COLOR,
    PRESETS: PRESETS,
    FIRST: FIRST,
    P_YES: 0.625,        /* 데모 문어가 '바꾸기'를 고르는 몫 (약 5번에 3번). '그대로'가 이어져도 올리지 않는다 */
    FIRST_DYE: true,     /* 데모 문어의 맨 처음 물음(끝난 물음 0건)은 꼭 '바꾸기' (미용실이 무엇인지 보여 준다). false 면 맨 처음도 시드 길 */
    REST_DAYS: 7,        /* '그대로'라고 한 그 색이 쉬는 날 수. 0 이면 이 규칙이 꺼진다 */
    COUNT_NONE: true,    /* 대답 없음도 그날 물음으로 센다 */
    LINE_SHOW: 24,       /* 말풍선에 보이는 글자 수 (넘으면 앞부분 + '…', 기록엔 전부) */
    MIRROR_LEVEL: 2,     /* 거울이 생기는 등불 칸 수 (장면 ITEM_LEVEL.salon 과 같다) */
    MINE_MS: 60000,      /* 이 탭이 쓴 물음을 기억하는 시간 (merge) */
    EXPRS: Object.freeze(EXPRS.slice()),
    LINES: LINES,
    CONTEXT: CONTEXT,
    TEXT: TEXT,
    TAILS: TAILS,
    BY_TEXT: BY_TEXT
  };

  /* ---------- 작은 도우미 ---------- */
  function isObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
  function finite(x) { return typeof x === 'number' && isFinite(x); }
  function isUint32(x) { return finite(x) && x >= 0 && x <= 4294967295 && Math.floor(x) === x; }
  function isCount(x) { return finite(x) && x >= 0 && Math.floor(x) === x; }
  function hasText(x) { return typeof x === 'string' && /\S/.test(x); }
  function copy(o) { return Object.assign({}, o); }
  function fill(tpl, v) { return String(tpl).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] != null ? String(v[k]) : m; }); }
  function no(reason) { return { ok: false, reason: reason }; }
  function idIn(list, id) { for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === id) return i; return -1; }

  /* ---------- 시드: BRAIN 이 있으면 그것, 없으면 똑같은 사본 (FNV-1a 32bit, '|' 로 이음 + mulberry32) ---------- */
  function fnv1a() {
    var parts = [];
    for (var k = 0; k < arguments.length; k++) parts.push(arguments[k] == null ? '' : String(arguments[k]));
    var s = parts.join('|'), h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h >>> 0;
  }
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function brain() { var B = root.BRAIN; return B && typeof B.hashSeed === 'function' && typeof B.rng === 'function' ? B : null; }
  function hashSeed() { var B = brain(); return B ? B.hashSeed.apply(B, arguments) : fnv1a.apply(null, arguments); }
  function rng(seed) { var B = brain(); return B ? B.rng(seed) : mulberry32(seed); }

  /* ---------- 색 ---------- */
  function isHex(x) { return typeof x === 'string' && /^#[0-9a-fA-F]{6}$/.test(x); }
  function normHex(x) { return isHex(x) ? x.toLowerCase() : null; }
  function presetOf(hex) {
    hex = normHex(hex);
    for (var i = 0; i < PRESETS.length; i++) if (PRESETS[i].hex === hex) return PRESETS[i];
    return null;
  }
  function isPreset(hex) { return !!presetOf(hex); }
  function shortName(hex) { var p = presetOf(hex); return p ? p.short : null; }
  /* 문장 이름. 프리셋이면 표의 이름, 아니면 색상으로. 무채색(채도가 거의 없는 색)은 색상이 없으니 밝기로 부른다 */
  function colorName(hex) {
    var p = presetOf(hex);
    if (p) return p.name;
    hex = normHex(hex);
    if (!hex) return null;
    var n = parseInt(hex.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 510;
    if (d < 16) return l >= 0.85 ? '흰색' : l <= 0.15 ? '검은색' : '회색';
    var h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = Math.round((h * 60 + 360) % 360) % 360;
    for (var i = 0; i < HUES.length; i++) if (h < HUES[i][0]) return HUES[i][1];
    return '빨간색';
  }

  /* ---------- 날짜 (로컬 달력 키. 날 더하기는 키 자체로 해서 시간대, 서머타임이 끼지 않는다) ---------- */
  var KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function isDate(x) { return Object.prototype.toString.call(x) === '[object Date]'; }
  function isKey(k) {
    var m = typeof k === 'string' && KEY_RE.exec(k);
    if (!m) return false;
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
  }
  /* 시각(ms 또는 Date)의 로컬 날짜 키. 앱의 todayKey() 와 같은 달력 (UTC 아님). 시각이 없으면 null (지금을 짐작하지 않는다) */
  function dateKey(at) {
    var d = isDate(at) ? at : finite(at) ? new Date(at) : null;
    if (!d || isNaN(d.getTime())) return null;
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function toKey(t) { return typeof t === 'string' ? (isKey(t) ? t : null) : dateKey(t); }
  function addDays(key, n) {
    var m = KEY_RE.exec(String(key == null ? '' : key));
    if (!m) return null;
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + (n | 0)));
    return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
  }

  /* ---------- 기록 읽기 ---------- */
  function octOf(state) { return (state && isObj(state.octopus)) ? state.octopus : {}; }
  function asksOf(state) { var s = state && state.salon; return isObj(s) && Array.isArray(s.asks) ? s.asks : []; }
  function colorsOf(state) { var c = octOf(state).colors; return Array.isArray(c) ? c : []; }
  function currentColor(state) {
    return normHex(octOf(state).color) || normHex(state && isObj(state.settings) ? state.settings.octColor : null) || DEFAULT_COLOR;
  }
  /* 처음 색: colors 의 첫 'first' 줄. 없으면 null */
  function firstColor(state) {
    var cs = colorsOf(state);
    for (var i = 0; i < cs.length; i++) if (cs[i] && cs[i].how === 'first' && isHex(cs[i].color)) return normHex(cs[i].color);
    return null;
  }
  /* 끝난 물음 수 (status 'done', 누가 답했든) = demoAnswer 의 asksBefore */
  function doneCount(state) { return asksOf(state).filter(function (a) { return a && a.status === 'done'; }).length; }
  /* 그날 물음으로 세는 물음: 기다리는 중이거나 끝남 (COUNT_NONE 이 꺼져 있으면 대답 없음은 빼고) */
  function counts(a) {
    return !!a && (a.status === 'waiting' || (a.status === 'done' && (a.action === 'dye' || a.action === 'keep' || !!SALON.COUNT_NONE)));
  }
  /* 같은 날 물음끼리: at 이 이른 것이 먼저 (at 이 없으면 뒤로, 같으면 id 순) */
  function earlier(a, b) {
    var x = finite(a.at) ? a.at : Infinity, y = finite(b.at) ? b.at : Infinity;
    return x !== y ? x < y : String(a.id) < String(b.id);
  }
  function byAt(list, missing) {   /* 안정 정렬: at 순. at 이 없으면 missing 자리 */
    return list.map(function (x, i) { return [x, i]; }).sort(function (p, q) {
      var a = finite(p[0].at) ? p[0].at : missing, b = finite(q[0].at) ? q[0].at : missing;
      return a !== b ? (a < b ? -1 : 1) : p[1] - q[1];
    }).map(function (p) { return p[0]; });
  }

  /* 오늘 물음 (그날을 정하는 것: done 또는 waiting 가운데 가장 이른 것). 없으면 null */
  function todaysAsk(state, today) {
    var key = toKey(today), best = null;
    if (!key) return null;
    asksOf(state).forEach(function (a) { if (a && a.date === key && counts(a) && (!best || earlier(a, best))) best = a; });
    return best;
  }

  /* 그 색이 다시 열리는 날짜 키. '그대로'(status done, action keep)라고 한 마지막 날 + REST_DAYS.
     today 를 주면 이미 열린 색은 null. 쉼이 없거나(REST_DAYS 0) 그 색에 '그대로'가 없었으면 null.
     대답 없음, 메뉴 밖 답, '바꾸기', dropped 는 쉬게 하지 않는다 */
  function restingUntil(state, hex, today) {
    var days = SALON.REST_DAYS | 0, last = null;
    hex = normHex(hex);
    if (days <= 0 || !hex) return null;
    asksOf(state).forEach(function (a) {
      if (a && a.status === 'done' && a.action === 'keep' && normHex(a.offer) === hex && isKey(a.date) && (!last || a.date > last)) last = a.date;
    });
    if (!last) return null;
    var until = addDays(last, days), key = today == null ? null : toKey(today);
    return key && key >= until ? null : until;
  }

  /* 병 목록: 프리셋 6 + (처음 색이 프리셋이 아니고 지금 색도 아니면) 처음 색 1. 7개를 넘지 않는다.
     today(그날 날짜 키)가 꼭 있어야 한다: 날짜를 못 읽으면 쉬는 색을 알 수 없으니 아무 병도 고를 수 없다 (selectable false — 미용실은 날짜 없이 열리지 않는다) */
  function bottles(state, today) {
    var cur = currentColor(state), key = toKey(today), out = [];
    function bottle(hex, short, name, kind) {
      var current = hex === cur, resting = !!(key && restingUntil(state, hex, key)), base = kind === 'first' ? FIRST.name : short;
      return {
        hex: hex, short: short, name: name, kind: kind, current: current, resting: resting,
        selectable: !!key && !current && !resting,
        note: current ? TEXT.now : kind === 'first' ? TEXT.first : null,        /* 병 아래 작은 글 */
        aria: current ? fill(TEXT.ariaCurrent, { short: base }) : resting ? fill(TEXT.ariaResting, { short: base }) : base,
        say: current ? TEXT.current : resting ? TEXT.resting : name           /* 누르면 이름 줄에 */
      };
    }
    PRESETS.forEach(function (p) { out.push(bottle(p.hex, p.short, p.name, 'preset')); });
    var f = firstColor(state);
    if (f && !presetOf(f) && f !== cur) out.push(bottle(f, FIRST.short, FIRST.name, 'first'));
    return out;
  }

  /* 내밀 수 있는 색인가: 날짜를 읽을 수 있고, 병 목록에 있고, 지금 색이 아니고, 쉬는 색이 아니다 */
  function canOffer(state, today, hex) {
    hex = normHex(hex);
    if (!hex) return no('not_hex');
    if (!toKey(today)) return no('no_date');
    var b = bottles(state, today).filter(function (x) { return x.hex === hex; })[0];
    if (!b) return no('not_bottle');
    if (b.current) return no('current');
    if (b.resting) return no('resting');
    return { ok: true, reason: null, bottle: b };
  }

  /* 문어 쪽 상태. oct 는 문자열(장면 상태 'sleep' 'away' ...) 또는 { state, asleep, away, busy, mirror, lantern }.
     busy 는 산책 중이거나 미용실 연출 중. mirror 를 안 주면 등불 칸(state.room.lantern)으로 본다 */
  function octInfo(state, o) {
    if (typeof o === 'string') o = { state: o };
    o = isObj(o) ? o : {};
    var lantern = finite(o.lantern) ? o.lantern : (state && isObj(state.room) ? state.room.lantern | 0 : 0);
    return {
      mirror: typeof o.mirror === 'boolean' ? o.mirror : lantern >= SALON.MIRROR_LEVEL,
      away: o.away === true || o.state === 'away',
      busy: o.busy === true || o.state === 'busy',
      asleep: o.asleep === true || o.state === 'sleep' || o.state === 'asleep'
    };
  }
  /* 지금 물을 수 있나: { ok, reason }. reason: no_mirror away busy asleep waiting asked_today (no_date: 날짜를 못 읽음).
     순서는 거울 단추 표 (스펙 3.1) 위에서부터: 자는 중이면 '쿨쿨...' 이 토스트보다 먼저다 */
  function canAsk(state, today, oct) {
    var o = octInfo(state, oct);
    if (!o.mirror) return no('no_mirror');
    if (o.away) return no('away');
    if (o.busy) return no('busy');
    if (o.asleep) return no('asleep');
    var key = toKey(today);
    if (!key) return no('no_date');
    var t = todaysAsk(state, key);
    if (t) return no(t.status === 'waiting' ? 'waiting' : 'asked_today');
    return { ok: true, reason: null };
  }

  /* ---------- 대답 ---------- */
  /* 데모 대답. 받는 것은 날짜, 이름, born, asksBefore 뿐이다 (색, 지난 대답, 쓰다듬기, 등불, 시각은 받지 않는다).
     맨 처음 한 번(asksBefore 가 정확히 0)은 꼭 '바꾸기' (미용실이 무엇인지 보여 준다 — FIRST_DYE 가 켜져 있을 때). 그 밖엔 시드 첫 값 < P_YES 면 '바꾸기'.
     asksBefore 가 없거나 깨졌으면(undefined, null, NaN, 음수, 글자) 시드 길로 간다: 수를 빠뜨린 호출이 문어의 '그대로'를 지우지 못하게 */
  function demoAnswer(o) {
    o = isObj(o) ? o : {};
    if (SALON.FIRST_DYE && o.asksBefore === 0) return { action: 'dye', by: 'demo-rules', rule: 'first', seed: null, line: LINES.dye[0], expr: 'happy' };
    var seed = hashSeed('salon', o.dateKey, o.name, String(o.born || 0));
    var action = rng(seed)() < SALON.P_YES ? 'dye' : 'keep';
    var line = LINES[action][Math.floor(rng((seed ^ 0x9e3779b9) >>> 0)() * LINES[action].length)];
    return { action: action, by: 'demo-rules', rule: 'seed', seed: seed, line: line, expr: action === 'dye' ? 'happy' : 'idle' };
  }
  /* 개발용 '다음 미용실 대답': 사람이 정한다. 말도 기쁨도 없다 (얼굴은 보통) */
  function humanAnswer(action) {
    return { action: action === 'dye' || action === 'keep' ? action : null, by: 'human', line: null, expr: null };
  }
  function menuWord(x) {
    if (typeof x !== 'string') return null;
    var w = x.trim().toLowerCase();
    return w === 'dye' || w === 'keep' ? w : null;
  }
  function menuExpr(x) {
    if (typeof x !== 'string') return null;
    var w = x.trim().toLowerCase();
    return EXPRS.indexOf(w) >= 0 ? w : null;
  }
  function rawOf(x) { if (typeof x === 'string') return x; try { return JSON.stringify(x); } catch (e) { return String(x); } }

  /* 모델 답 읽기: { action, actionRaw, line, expr, exprRaw, unreadable, empty, raw }.
     dye/keep 은 대소문자, 앞뒤 공백을 무시한다. 그 밖의 답은 다시 묻지 않는다: action null + actionRaw 에 원문.
     JSON 이 아니면 unreadable (빈 글, 빈칸만 있는 글도: 답은 왔다 — 다시 묻지 않고 원문을 남긴다).
     empty 는 아무것도 안 왔을 때(null, undefined: 전송 실패)뿐이다. 같은 요청을 한 번만 다시 보낼 대상은 그것 하나다.
     line 은 글자 그대로 (없으면 null, 데모 문구로 채우지 않는다). 모르는 expr 은 null + exprRaw */
  function readReply(raw) {
    var out = { action: null, actionRaw: null, line: null, expr: null, exprRaw: null, unreadable: false, empty: false, raw: null };
    if (raw == null) { out.empty = true; return out; }
    var obj = raw;
    if (typeof raw === 'string') {
      out.raw = raw;
      if (!hasText(raw)) { out.unreadable = true; return out; }
      if (menuWord(raw)) { out.action = menuWord(raw); return out; }   /* JSON 없이 메뉴 낱말 하나만 */
      try { obj = JSON.parse(raw); } catch (e) { out.unreadable = true; return out; }
      if (typeof obj === 'string') {
        if (menuWord(obj)) out.action = menuWord(obj); else out.actionRaw = obj;
        return out;
      }
    } else {
      out.raw = rawOf(raw);
    }
    if (!isObj(obj)) { out.unreadable = true; return out; }
    if (obj.action != null) {
      if (menuWord(obj.action)) out.action = menuWord(obj.action); else out.actionRaw = rawOf(obj.action);
    }
    if (hasText(obj.line)) out.line = obj.line;
    if (obj.expr != null) {
      if (menuExpr(obj.expr)) out.expr = menuExpr(obj.expr); else out.exprRaw = rawOf(obj.expr);
    }
    return out;
  }
  /* 사람이 보는 글자 단위 (확장 자소 묶음: 국기, 이어 붙인 이모지, 풀어 쓴 자모가 한 글자). Intl.Segmenter 가 없으면 코드 포인트 (대리 쌍은 안 쪼갠다) */
  var segmenter = null;
  function graphemes(s) {
    try {
      if (!segmenter && typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
      if (segmenter) return Array.from(segmenter.segment(s), function (x) { return x.segment; });
    } catch (e) { segmenter = null; }
    return Array.from(s);
  }
  /* 말풍선 글: 앞 LINE_SHOW 글자(사람이 보는 글자) + '…' (기록과 로그 행엔 전부). 말이 없으면 null */
  function bubble(line) {
    if (!hasText(line)) return null;
    var cs = graphemes(line), max = SALON.LINE_SHOW | 0;
    return cs.length > max ? cs.slice(0, max).join('') + '…' : line;
  }

  /* ---------- 물음 ---------- */
  function newId(state, parts) {
    var have = Object.create(null), asks = asksOf(state);
    asks.forEach(function (a) { if (a && typeof a.id === 'string') have[a.id] = 1; });
    var base = 'ask_' + hashSeed.apply(null, ['ask'].concat(parts, [asks.length])).toString(36), id = base, n = 2;
    while (have[id]) id = base + '_' + (n++);
    return id;
  }
  /* 물음 한 줄을 만든다 (state 는 바꾸지 않는다). o = { at, today, offer, answer }.
     today 를 안 주면 at 의 로컬 날짜. answer 를 안 주면 데모 대답 (asksBefore 는 끝난 물음 수).
     내밀 수 없는 색(지금 색, 쉬는 색, 병에 없는 색)이거나 그날 이미 물었거나 답에 고른 이(by)가 없으면 null.
     고른 이: demo-rules, model 은 결정 + 말 + 얼굴, human(개발용)은 결정만, fallback(아무도 안 고름)은 결정도 말도 얼굴도 없다 (색 그대로).
     'unknown' 은 옛 기록 옮기기(normalize)에만 붙는다: 새 물음이 고른 이 없이 몸 색을 바꾸지 못하게 */
  function makeAsk(state, o) {
    o = isObj(o) ? o : {};
    var at = finite(o.at) ? o.at : null, today = toKey(o.today != null ? o.today : at);
    if (!today) return null;
    var off = canOffer(state, today, o.offer);
    if (!off.ok || todaysAsk(state, today)) return null;
    var oc = octOf(state), b = off.bottle, from = currentColor(state);
    var ans = isObj(o.answer) ? o.answer : demoAnswer({ dateKey: today, name: oc.name, born: oc.born, asksBefore: doneCount(state) });
    var by = ans.by;
    if (CHOOSERS.indexOf(by) < 0) return null;
    var status = ans.status === 'waiting' && by !== 'fallback' ? 'waiting' : 'done';
    if (status === 'waiting' || by === 'fallback') ans = { by: by, via: ans.via, model: ans.model, sent: ans.sent };   /* 받은 것이 없다 (아직, 또는 끝내): 결정도 말도 얼굴도 없다 */
    else if (by === 'human') ans = { by: by, action: ans.action };                                                       /* 사람(개발용)은 결정만: 문어 말, 얼굴, 기쁨이 없다 */
    var action = status === 'done' ? menuWord(ans.action) : null;
    var rule = by === 'demo-rules' && (ans.rule === 'first' || ans.rule === 'seed') ? ans.rule : null;
    var expr = menuExpr(ans.expr);
    return {
      id: newId(state, [at, today, from, b.hex, oc.born]),
      date: today, at: at,
      from: from, offer: b.hex, offerName: b.name, offerKind: b.kind,
      offeredBy: OFFER_BY.indexOf(o.offeredBy) >= 0 ? o.offeredBy : 'player',
      status: status,
      action: action,
      actionRaw: typeof ans.actionRaw === 'string' ? ans.actionRaw : (status === 'done' && !action && hasText(ans.action) ? ans.action : null),
      by: by,
      rule: rule,
      line: hasText(ans.line) ? ans.line : null,
      expr: expr,
      exprRaw: typeof ans.exprRaw === 'string' ? ans.exprRaw : (!expr && hasText(ans.expr) ? ans.expr : null),
      seed: rule === 'seed' && isUint32(ans.seed) ? ans.seed : null,
      via: ans.via === 'sampling' || ans.via === 'tool' ? ans.via : null,
      model: typeof ans.model === 'string' ? ans.model : null,
      raw: typeof ans.raw === 'string' ? ans.raw : null,
      sent: isCount(ans.sent) ? ans.sent : 0,
      lateRaw: null
    };
  }
  /* 내민 색의 문장 이름: 늘 색 값과 병 종류에서 다시 짓는다. 저장된 offerName 글은 믿지 않는다
     (불러오거나 손댄 기록의 글이 모델 요청, 방 보기, 집 목소리 행에 그대로 들어가지 않게 — 요청은 사실만) */
  function offerKindOf(a) { return a.offerKind === 'first' || a.offerKind === 'preset' ? a.offerKind : (presetOf(a.offer) ? 'preset' : 'first'); }
  function offerNameOf(a) { return offerKindOf(a) === 'first' ? FIRST.name : (colorName(a.offer) || ''); }
  /* 지금 몸 색 = colors 마지막 줄 (없으면 그대로). 사본도 맞춘다 */
  function recolor(state) {
    var cs = colorsOf(state);
    if (cs.length && isHex(cs[cs.length - 1].color)) state.octopus.color = normHex(cs[cs.length - 1].color);
    if (isObj(state.settings)) state.settings.octColor = currentColor(state);
  }
  /* 같은 날 그날 물음이 둘 이상이면 가장 이른 것이 정한다. 나머지는 dropped (기록엔 남고 그리지 않는다).
     dropped 물음(이번에 뺀 것, 전에 뺀 것 모두)의 colors 줄은 빼고 몸 색을 다시 정한다 (dropped 는 적용하지 않는다).
     돌려주는 것: { dropped: 이번에 뺀 물음 id, stripped: 뺀 colors 줄 수 } */
  function settle(state) {
    var days = {}, dropped = [], gone = Object.create(null), stripped = 0;
    asksOf(state).forEach(function (a) { if (counts(a) && isKey(a.date)) (days[a.date] = days[a.date] || []).push(a); });
    Object.keys(days).forEach(function (d) {
      var list = days[d];
      if (list.length < 2) return;
      var win = list.reduce(function (w, a) { return earlier(a, w) ? a : w; });
      list.forEach(function (a) { if (a !== win) { a.status = 'dropped'; dropped.push(a.id); } });
    });
    asksOf(state).forEach(function (a) { if (a && a.status === 'dropped' && typeof a.id === 'string') gone[a.id] = a; });
    if (Array.isArray(octOf(state).colors)) {
      var cs = state.octopus.colors, left = cs.filter(function (c) { return !(c && c.how === 'salon' && typeof c.ask === 'string' && c.ask in gone); });
      stripped = cs.length - left.length;
      if (stripped) {
        state.octopus.colors = left;
        if (!left.length) {   /* 남은 줄이 없으면 뺀 물음 가운데 가장 이른 것의 그때 색으로 */
          var back = Object.keys(gone).map(function (k) { return gone[k]; }).filter(function (a) { return isHex(a.from); }).sort(function (a, b) { return earlier(a, b) ? -1 : 1; })[0];
          if (back) state.octopus.color = normHex(back.from);
        }
        recolor(state);
      }
    }
    return { dropped: dropped, stripped: stripped };
  }
  /* 물음을 state 에 쓴다: 물음 한 줄 + ('바꾸기'면) colors 한 줄 + octopus.color + settings.octColor.
     앱은 이 뒤에 save() 를 한 번 부른다 (장면만 연출이 끝날 때까지 옛 색). 같은 id 는 바꿔 쓴다 (두 번 적지 않는다) */
  function commit(state, ask) {
    if (!isObj(state) || !isObj(ask) || typeof ask.id !== 'string') return state;
    if (!isObj(state.salon)) state.salon = { asks: [] };
    if (!Array.isArray(state.salon.asks)) state.salon.asks = [];
    if (!isObj(state.octopus)) state.octopus = {};
    if (!Array.isArray(state.octopus.colors)) state.octopus.colors = [];
    if (!isObj(state.settings)) state.settings = {};
    var asks = state.salon.asks, i = idIn(asks, ask.id);
    if (i >= 0) asks[i] = ask; else asks.push(ask);
    state.octopus.color = currentColor(state);
    if (ask.status === 'done' && ask.action === 'dye' && isHex(ask.offer)) {
      var cs = state.octopus.colors;
      if (!cs.some(function (c) { return c && c.ask === ask.id; })) cs.push({ at: finite(ask.at) ? ask.at : null, date: ask.date, color: normHex(ask.offer), how: 'salon', by: ask.by, ask: ask.id });
      state.octopus.color = normHex(ask.offer);
    }
    state.settings.octColor = state.octopus.color;
    settle(state);
    return state;
  }

  /* 모델 요청 (작게, 400 B 아래). keep 이 늘 첫째. 이유 칸, 지난 대답, 확률, 쉬는 날은 보내지 않는다 */
  function request(state, ask) {
    if (!isObj(ask) || !isHex(ask.offer)) return null;
    var from = normHex(ask.from) || currentColor(state), offer = normHex(ask.offer);
    return {
      v: 1, point: 'salon', id: String(ask.id),
      facts: {
        now: { hex: from, name: colorName(from) },
        offer: { hex: offer, name: offerNameOf({ offer: offer, offerKind: ask.offerKind }) }   /* 이름은 색 값에서 다시 짓는다 (저장된 글을 싣지 않는다) */
      },
      menu: ['keep', 'dye']
    };
  }

  /* 말, 얼굴, 기쁨을 가질 수 없는 고른 이: 사람(개발용)은 결정만, fallback 은 아무도 안 골랐다 (손댄 기록에 말이 있어도 문어 목소리로 보이지 않는다) */
  function mute(ask) { return ask.by === 'human' || ask.by === 'fallback'; }
  /* 로그 행 데이터 (DOM 은 앱). [{ n, label, text, voice, expr, raw, by, tail }]
     1 미용실 (집): 사람이 한 말.  2 대답 (문어, 말이 있을 때만): 고른 이의 말 전부.  3 몸 색 (집): 결과 + 고른 이 꼬리.
     기다리는 중이면 행 1 만, dropped 는 아무것도 그리지 않는다. 색 이름은 색 값에서 다시 짓는다 (저장된 offerName 글을 쓰지 않는다) */
  function rows(ask, octName) {
    if (!isObj(ask) || ask.status === 'dropped') return [];
    var name = hasText(octName) ? octName : TEXT.octopus;
    var first = offerKindOf(ask) === 'first', cname = offerNameOf(ask);
    var out = [{ n: 1, label: TEXT.rowAsk, text: fill(TEXT.asked, { color: cname }), voice: 'house', expr: null, raw: false, by: ask.offeredBy || 'player', tail: null }];
    if (ask.status !== 'done') return out;
    if (hasText(ask.line) && !mute(ask)) out.push({ n: 2, label: TEXT.rowReply, text: ask.line, voice: 'octopus', expr: EXPRS.indexOf(ask.expr) >= 0 ? ask.expr : 'idle', raw: ask.by === 'model', by: ask.by, tail: null });
    var text;
    if (ask.action === 'dye') text = first ? fill(TEXT.dyedFirst, { name: name }) : fill(TEXT.dyed, { name: name, color: cname });
    else if (ask.action === 'keep') text = TEXT.kept;
    else if (ask.by === 'fallback' || ask.by === 'human') text = TEXT.none;   /* 아무것도 안 옴 (개발용 '대답 없음' 포함) */
    else if (ask.by === 'model' && ask.raw != null && readReply(ask.raw).unreadable) text = TEXT.unreadable;
    else text = TEXT.kept;                                                    /* 받았지만 메뉴 밖 */
    out.push({ n: 3, label: TEXT.rowResult, text: text, voice: 'house', expr: null, raw: false, by: ask.by, tail: Object.prototype.hasOwnProperty.call(TAILS, ask.by) ? TAILS[ask.by] : null });
    return out;
  }

  /* 대답 연출에 쓸 것 (장면 salonDye / salonKeep). 얼굴은 고른 이가 준 것 (안 줬으면 idle).
     joy(폴짝, 반짝, 기분 소리)는 happy 를 골랐을 때만, look(거울 보기)은 고른 반응이 있을 때만 (데모, 또는 모델이 expr 를 줌).
     사람(개발용)과 fallback 은 말도 얼굴도 기쁨도 없다 */
  function staging(ask) {
    if (!isObj(ask) || ask.status !== 'done') return null;
    var expr = !mute(ask) && EXPRS.indexOf(ask.expr) >= 0 ? ask.expr : null, dye = ask.action === 'dye';
    return {
      action: ask.action === 'dye' || ask.action === 'keep' ? ask.action : null,
      color: dye ? normHex(ask.offer) : null,
      expr: expr || 'idle',
      joy: expr === 'happy',
      look: dye && (ask.by === 'demo-rules' || (ask.by === 'model' && !!expr)),
      bubble: mute(ask) ? null : bubble(ask.line)
    };
  }

  /* ---------- 다른 탭 합치기 ---------- */
  /* local = 이 탭의 기록, remote = 방금 받은 기록 (normalize 를 지난 것), mine = 이 탭이 쓴 물음 [ask 또는 { ask, at }].
     now(ms) 를 주면 MINE_MS 보다 오래된 mine 은 놓는다. 다른 문어(born 이 다름)면 mine 은 버린다.
     받은 기록에 빠진 내 물음은 colors 줄과 함께 다시 얹고, 같은 날 둘 이상이면 이른 것이 정한다.
     그쪽에 같은 물음이 있으면 그쪽 것 그대로다 (dropped 라도). 단 그쪽은 아직 기다리는 중(waiting)이고 내 것은 끝났으면(done) 내 것으로 바꾼다
     (모델 답을 받은 뒤 다른 탭의 옛 저장이 와도 그 답을 잃지 않게 — 'dye' 면 colors 줄도 같이).
     돌려주는 것: { state, changed, readded, upgraded, dropped, mine }. changed 면 앱이 save() 한다 (state 는 remote 를 바꾸지 않은 새 객체) */
  function merge(local, remote, mine, now) {
    if (!isObj(remote)) return { state: remote, changed: false, readded: [], upgraded: [], dropped: [], mine: [] };
    var out = copy(remote);
    out.octopus = copy(octOf(remote));
    out.octopus.colors = colorsOf(remote).filter(isObj).map(copy);
    out.settings = isObj(remote.settings) ? copy(remote.settings) : {};
    out.salon = isObj(remote.salon) ? copy(remote.salon) : {};
    out.salon.asks = asksOf(remote).filter(isObj).map(copy);
    var same = isObj(local) && (octOf(local).born || 0) === (out.octopus.born || 0);
    var kept = [], readded = [], upgraded = [], lined = false;
    (Array.isArray(mine) ? mine : []).forEach(function (m) {
      var ask = isObj(m) && isObj(m.ask) ? m.ask : m, at = isObj(m) && finite(m.at) ? m.at : (isObj(ask) ? ask.at : null);
      if (!same || !isObj(ask) || typeof ask.id !== 'string') return;
      if (finite(now) && finite(at) && now - at > SALON.MINE_MS) return;
      kept.push(m);
      var j = idIn(out.salon.asks, ask.id);
      if (j >= 0) {
        if (!(out.salon.asks[j].status === 'waiting' && ask.status === 'done')) return;   /* 그쪽에 있으면 (dropped 라도) 그쪽 것 그대로 */
        out.salon.asks[j] = copy(ask);   /* 그쪽은 아직 기다리는 중, 내 것은 답을 받음: 내 것으로 */
        upgraded.push(ask.id);
      } else {
        out.salon.asks.push(copy(ask));
        readded.push(ask.id);
      }
      if (ask.status === 'done' && ask.action === 'dye' && isHex(ask.offer) && !out.octopus.colors.some(function (c) { return c.ask === ask.id; })) {
        var line = colorsOf(local).filter(function (c) { return c && c.ask === ask.id; })[0];
        out.octopus.colors.push(line ? copy(line) : { at: finite(ask.at) ? ask.at : null, date: ask.date, color: normHex(ask.offer), how: 'salon', by: ask.by, ask: ask.id });
        lined = true;
      }
    });
    if (readded.length || upgraded.length) {
      out.salon.asks = byAt(out.salon.asks, Infinity);
      out.octopus.colors = byAt(out.octopus.colors, -Infinity);
      if (lined) recolor(out);
    }
    var st = settle(out);
    return { state: out, changed: readded.length > 0 || upgraded.length > 0 || st.dropped.length > 0 || st.stripped > 0, readded: readded, upgraded: upgraded, dropped: st.dropped, mine: kept };
  }

  /* ---------- 옮기기 ---------- */
  function fixColor(c) {
    var x = copy(c);
    x.color = normHex(c.color);
    x.at = finite(c.at) ? c.at : null;
    x.date = isKey(c.date) ? c.date : null;
    x.by = COLOR_BY.indexOf(c.by) >= 0 ? c.by : 'unknown';   /* 모르는 고른 이를 진짜 고른 이로 올려 주지 않는다 */
    if ('ask' in x && typeof x.ask !== 'string') delete x.ask;
    return x;
  }
  function fixAsk(a) {
    var x = copy(a);
    x.from = normHex(a.from);
    x.offer = normHex(a.offer);
    x.at = finite(a.at) ? a.at : null;
    x.status = STATUSES.indexOf(a.status) >= 0 ? a.status : 'done';
    x.action = a.action === 'dye' || a.action === 'keep' ? a.action : null;
    x.actionRaw = typeof a.actionRaw === 'string' ? a.actionRaw : (!x.action && hasText(a.action) ? a.action : null);
    x.by = ASK_BY.indexOf(a.by) >= 0 ? a.by : 'unknown';
    x.expr = EXPRS.indexOf(a.expr) >= 0 ? a.expr : null;
    x.exprRaw = typeof a.exprRaw === 'string' ? a.exprRaw : (!x.expr && hasText(a.expr) ? a.expr : null);
    x.line = typeof a.line === 'string' ? a.line : null;            /* 글은 한 글자도 안 바꾼다 */
    x.raw = typeof a.raw === 'string' ? a.raw : null;
    x.lateRaw = typeof a.lateRaw === 'string' ? a.lateRaw : null;
    x.offerKind = a.offerKind === 'preset' || a.offerKind === 'first' ? a.offerKind : (presetOf(x.offer) ? 'preset' : 'first');
    x.offerName = offerNameOf(x);                                    /* 색 값에서 다시 짓는다 (불러온 글을 믿지 않는다) */
    x.offeredBy = OFFER_BY.indexOf(a.offeredBy) >= 0 ? a.offeredBy : 'unknown';
    x.rule = x.by === 'demo-rules' && (a.rule === 'first' || a.rule === 'seed') ? a.rule : null;
    x.seed = x.rule === 'seed' && isUint32(a.seed) ? a.seed : null;
    x.via = a.via === 'sampling' || a.via === 'tool' ? a.via : null;
    x.model = typeof a.model === 'string' ? a.model : null;
    x.sent = isCount(a.sent) ? a.sent : 0;
    return x;
  }
  function played(s) {
    var o = octOf(s);
    return hasText(o.name) || (Array.isArray(s.trips) && s.trips.length > 0) || (o.trips | 0) > 0;
  }
  /* 기록 옮기기 (앱의 normalize 가 부른다, v1 옮기기 결과 포함). s 를 고쳐 그대로 돌려준다.
     opts.todayKey (키 또는 키를 주는 함수) 가 있으면 그보다 앞선 waiting 을 '대답 없음'(fallback)으로 닫는다 */
  function normalize(state, opts) {
    var s = isObj(state) ? state : {};
    if (!isObj(s.octopus)) s.octopus = {};
    if (!isObj(s.settings)) s.settings = {};
    var o = s.octopus, tk = opts && (opts.todayKey != null ? opts.todayKey : opts.today);
    var today = toKey(typeof tk === 'function' ? tk() : tk);
    /* 1. colors: '#rrggbb' 이고 how 가 first, salon, dev 인 줄만. at 순 */
    o.colors = byAt((Array.isArray(o.colors) ? o.colors : []).filter(function (c) { return isObj(c) && isHex(c.color) && HOWS.indexOf(c.how) >= 0; }).map(fixColor), -Infinity);
    /* 2. 지금 색: colors 가 있으면 그 마지막 줄이 정한다 (놀이 중엔 늘 같다 — 내보낸 파일에서 color 한 칸만 고쳐 기록 없는 색이 되지 않게, 검증 11-10 W3).
          colors 가 비었으면 octopus.color, 사본, 빨강 순. 사본을 맞춘다 */
    o.color = (o.colors.length ? o.colors[o.colors.length - 1].color : null) || normHex(o.color) || normHex(s.settings.octColor) || DEFAULT_COLOR;
    s.settings.octColor = o.color;
    /* 3. 이미 놀던 기록(이름이나 산책)은 지금 색 그대로 처음 색으로 (새 기록은 비워 두고 첫 실행 창이 넣는다) */
    if (!o.colors.length && played(s)) o.colors.push({ at: finite(o.born) && o.born ? o.born : null, date: null, color: o.color, how: 'first', by: 'migrated' });
    /* 4. 물음: id, 날짜, from, offer 가 깨진 줄은 버린다. 같은 id 는 처음 것만 */
    if (!isObj(s.salon)) s.salon = { asks: [] };
    var seen = Object.create(null);
    s.salon.asks = (Array.isArray(s.salon.asks) ? s.salon.asks : []).filter(function (a) {
      if (!isObj(a) || !hasText(a.id) || !isKey(a.date) || !isHex(a.from) || !isHex(a.offer) || seen[a.id]) return false;
      seen[a.id] = 1;
      return true;
    }).map(fixAsk);
    /* 5. 오늘보다 앞선 waiting 은 대답 없음으로 닫는다 (색 그대로) */
    if (today) s.salon.asks.forEach(function (a) { if (a.status === 'waiting' && a.date < today) { a.status = 'done'; a.action = null; a.by = 'fallback'; } });
    /* 6. 같은 날 그날 물음이 둘 이상이면 이른 것이 정한다 (merge 와 같은 규칙). 'dye' 물음의 빠진 colors 줄은 지어내지 않는다 */
    settle(s);
    /* 7. 미용실 색 줄(how 'salon')의 고른 이는 그 물음이 뒷받침할 때만 믿는다: 같은 id 의 끝난 '바꾸기' 물음이 있고 고른 이와 색이 같아야 한다.
          아니면 by 'unknown' (줄과 색은 그대로 둔다 — 지어내지도 지우지도 않는다). 손으로 써 넣은 { how: 'salon', by: 'model' } 줄을
          방 보기(look)가 모델이 고른 변화로 알리지 않게 (검증 11-10 W4). 놀이가 쓰는 줄은 늘 물음과 함께 적힌다 (commit, merge) */
    var backing = Object.create(null);
    s.salon.asks.forEach(function (a) { backing[a.id] = a; });
    o.colors.forEach(function (c) {
      if (c.how !== 'salon') return;
      var a = typeof c.ask === 'string' ? backing[c.ask] : null;
      if (!(a && a.status === 'done' && a.action === 'dye' && a.by === c.by && a.offer === c.color)) c.by = 'unknown';
    });
    return s;
  }

  /* 방 보기(ppolppol_look_room)의 look. by 는 원래 값 그대로. 물음 목록은 { salon: true } 일 때만 (최근 5, '그대로'도) */
  function look(state, opts) {
    var cs = colorsOf(state), cur = currentColor(state), first = null, changes = [];
    cs.forEach(function (c) {
      if (!isObj(c) || !isHex(c.color)) return;
      if (c.how === 'first') { if (!first) first = c; return; }
      changes.push(c);
    });
    var out = {
      now: { hex: cur, name: colorName(cur) },
      first: first ? { hex: normHex(first.color), name: colorName(first.color), by: first.by } : null,
      changes: changes.slice(-5).map(function (c) { return { date: c.date || null, to: { hex: normHex(c.color), name: colorName(c.color) }, by: c.by }; })
    };
    if (opts && opts.salon) {
      out.asks = asksOf(state).filter(function (a) { return a && a.status === 'done'; }).slice(-5).map(function (a) {
        return { date: a.date, offer: { hex: normHex(a.offer), name: offerNameOf(a) }, action: a.action === 'dye' || a.action === 'keep' ? a.action : null, by: a.by };
      });
    }
    return out;
  }

  /* ---------- 공개 ---------- */
  SALON.isHex = isHex;
  SALON.normHex = normHex;
  SALON.isPreset = isPreset;
  SALON.colorName = colorName;
  SALON.shortName = shortName;
  SALON.dateKey = dateKey;
  SALON.addDays = addDays;
  SALON.firstColor = firstColor;
  SALON.doneCount = doneCount;
  SALON.bottles = bottles;
  SALON.restingUntil = restingUntil;
  SALON.todaysAsk = todaysAsk;
  SALON.canAsk = canAsk;
  SALON.canOffer = canOffer;
  SALON.demoAnswer = demoAnswer;
  SALON.humanAnswer = humanAnswer;
  SALON.makeAsk = makeAsk;
  SALON.commit = commit;
  SALON.request = request;
  SALON.readReply = readReply;
  SALON.bubble = bubble;
  SALON.rows = rows;
  SALON.staging = staging;
  SALON.merge = merge;
  SALON.normalize = normalize;
  SALON.look = look;
  SALON.hashSeed = hashSeed;
  SALON.rng = rng;
  SALON._copy = { hashSeed: fnv1a, rng: mulberry32 };   /* 시험용: BRAIN 이 없을 때 쓰는 사본 */

  root.SALON = SALON;
  if (typeof module !== 'undefined' && module.exports) module.exports = SALON;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
