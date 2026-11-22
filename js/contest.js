/* js/contest.js - 주말 콘테스트 규칙 (전역 CONTEST). 설계: docs/CONTEST.md (주인 11-21 "주말마다 콘테스트 … 주제랑 요소에 맞게 점수 … 조개").
 *
 * - 순수 로직이다. DOM, 저장소, 시계, 타이머, 네트워크, Math.random 을 쓰지 않는다. node 에서도 그대로 로드된다 (module.exports).
 *   날짜는 부르는 쪽이 날짜 키 (YYYY-MM-DD, 그 기기의 달력) 로 넘긴다.
 * - 주 = 월요일 날짜 키 (앱의 weekKeyOf 와 같다). 토 · 일에만 열린다. 주제는 주 번호로만 정해진다 (열두 주제, 같은 주제는 적어도 9주 뒤).
 * - 채점은 규칙이다 (화면에 '채점 규칙' 꼬리표). 더하기만 있고 빼기는 없다. 같은 주 · 같은 차림 = 같은 점수.
 * - 경쟁자 셋은 주마다 옷 목록에서 시드로 뽑고 같은 함수로 채점한다. 누구나 조개를 받는다 (12 · 8 · 5 · 3).
 * - 하루 한 번: 그날 이미 나갔으면 적힌 결과를 그대로 돌려준다 (다시 뽑지 않는다).
 *
 * 저장 모양 (localStorage ppolppol_v2 의 S.user 안 — 새 칸 하나, 모르는 값은 그대로 둔다):
 *   user.contest = { v: 1, weeks: { '<월요일 키>': { theme: id, days: { '<날짜 키>': {
 *     v: 1, at, theme, total, parts: [{ what, points, max }], rank: 1..4, shells, paid: boolean,
 *     look: [{ cat, id }], rivals: [{ k, color, total, parts, look: [{ cat, id }] }] } } } } }
 */
(function (root) {
  'use strict';

  function deepFreeze(o) {
    Object.keys(o).forEach(function (k) { if (o[k] && typeof o[k] === 'object') deepFreeze(o[k]); });
    return Object.freeze(o);
  }
  function isObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
  function hashSeed() {   /* FNV-1a (인자를 '|' 로 이어서) */
    var s = Array.prototype.join.call(arguments, '|'), h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  }
  function rng(seed) {   /* mulberry32 */
    var a = seed >>> 0;
    return function () { a = (a + 0x6d2b79f5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  /* 꼬리표 (COMMON C4 의 고정 목록). 이름은 읽어 주기 글에만 쓴다 (화면엔 그림) */
  var STYLES = ['cute', 'cool', 'cosy', 'sporty', 'neat', 'sea', 'flower', 'star', 'warm', 'fresh'];
  var TAG_NAME = deepFreeze({
    cute: '귀여운', cool: '멋진', cosy: '느긋한', sporty: '운동', neat: '단정한', sea: '바다', flower: '꽃', star: '별', warm: '따뜻한', fresh: '산뜻한',
    'c-red': '빨강', 'c-orange': '주황', 'c-yellow': '노랑', 'c-green': '초록', 'c-blue': '파랑', 'c-purple': '보라', 'c-pink': '분홍', 'c-brown': '갈색', 'c-white': '하양', 'c-black': '검정'
  });
  var COLOR_HEX = deepFreeze({
    'c-red': '#c8323a', 'c-orange': '#e8803a', 'c-yellow': '#e8a93a', 'c-green': '#4fa868', 'c-blue': '#4a86d8',
    'c-purple': '#9a5cc8', 'c-pink': '#f07aa8', 'c-brown': '#9a5a3a', 'c-white': '#f4efe2', 'c-black': '#2a2438'
  });

  /* 열두 주제. 네 개씩 세 묶음 (순서 = 묶음 0 · 1 · 2): 묶음 안에서만 섞으므로 같은 주제 사이는 적어도 9주 */
  var THEMES = deepFreeze([
    { id: 'beach', title: '바닷가 산책', tags: ['sea', 'fresh'], color: 'c-blue' },
    { id: 'winter', title: '따뜻한 겨울', tags: ['warm', 'cosy'], color: 'c-white' },
    { id: 'night', title: '별 보는 밤', tags: ['star', 'cool'], color: 'c-purple' },
    { id: 'garden', title: '꽃밭 물 주기', tags: ['flower', 'fresh', 'warm'], color: 'c-green' },
    { id: 'rain', title: '비 오는 날', tags: ['cosy', 'neat'], color: 'c-yellow' },
    { id: 'run', title: '달리기 대회', tags: ['sporty', 'cool'], color: 'c-orange' },
    { id: 'flower', title: '꽃놀이', tags: ['flower', 'cute'], color: 'c-pink' },
    { id: 'book', title: '가을 책방', tags: ['neat', 'warm'], color: 'c-red' },
    { id: 'forest', title: '숲길 소풍', tags: ['fresh', 'sporty'], color: 'c-green' },
    { id: 'nap', title: '다락방 낮잠', tags: ['cosy', 'cute'], color: 'c-brown' },
    { id: 'fest', title: '여름 축제', tags: ['cute', 'star', 'sea'], color: 'c-yellow' },
    { id: 'neat', title: '단정한 하루', tags: ['neat', 'cool'], color: 'c-black' }
  ]);
  var GROUP = 4, CYCLE = 12;
  function themeById(id) { for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return THEMES[i]; return null; }

  var SHELLS = [12, 8, 5, 3];                       /* 1 · 2 · 3 · 4등 */
  var PTS = deepFreeze({ stage: 8, tag: 8, pieceMax: 16, themeMax: 56, color: 6, colorMax: 18, match2: 6, match3: 12, dye: 6 });
  var RIVAL_HATS = ['bow', 'cap', 'flower'];         /* 경쟁자 셋의 머리 장식 (알아보기 쉽게 — 채점과 무관) */
  var RIVAL_P = [0.8, 0.55, 0.3];                   /* 경쟁자가 칸마다 주제에 맞는 것을 고를 확률 (센 · 중간 · 가벼운) */
  var RIVAL_COLORS = ['#e07a5f', '#8f7fd0', '#6fa35a', '#d07fa8', '#5b8fd0', '#e09a4a'];   /* 가게 문어 셋 (청록 · 노랑 · 갈색) 과 안 겹치는 색 */

  /* 집 목소리: 제목 · 한 줄 결과만 */
  var TEXT = deepFreeze({
    title: '주말 콘테스트', label: '콘테스트', closed: '주말에 열려.', rule: '채점 규칙',
    enter: '나가기', change: '옷 갈아입기', skip: '넘기기', close: '닫기',
    rank: '{n}등', log: '{n}등 · 조개 {s}', logFull: '콘테스트 {n}등 · 조개 {s}',
    ariaWant: '이번 주 주제에 맞는 것', ariaMe: '지금 내 차림', ariaRival: '참가 문어 {n}', ariaJudge: '심사 {n}',
    partTheme: '주제', partColor: '색', partMatch: '어울림', ariaStars: '별 {n}개', ariaTotal: '{n}점', me: '나'
  });
  function fill(s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] != null ? String(v[k]) : ''; }); }

  /* ── 날짜 ── */
  function dayNum(dk) {   /* 'YYYY-MM-DD' → 1970-01-01 부터의 날 수 (달력 그대로, 시간대 없음) | null */
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dk)); if (!m) return null;
    var t = Date.UTC(+m[1], +m[2] - 1, +m[3]), d = new Date(t);
    if (d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null;
    return Math.round(t / 864e5);
  }
  function keyOf(n) { var d = new Date(n * 864e5), p = function (v) { return (v < 10 ? '0' : '') + v; }; return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()); }
  function themeAt(idx) {   /* 주 번호 (1970-01-05 월요일 = 0) → 주제 */
    var pos = ((idx % CYCLE) + CYCLE) % CYCLE, block = Math.floor(idx / CYCLE), g = Math.floor(pos / GROUP);
    var r = rng(hashSeed('contest-order', block, g)), a = [0, 1, 2, 3], i, j, t;
    for (i = a.length - 1; i > 0; i--) { j = Math.floor(r() * (i + 1)); t = a[i]; a[i] = a[j]; a[j] = t; }
    return THEMES[g * GROUP + a[pos % GROUP]];
  }
  function week(dk) {
    var n = dayNum(dk); if (n == null) return null;
    var dow = ((n + 4) % 7 + 7) % 7, mon = n - (dow + 6) % 7;   /* 0 = 일 … 6 = 토 */
    return { key: keyOf(mon), open: dow === 6 || dow === 0, theme: themeAt(Math.floor((mon - 4) / 7)) };
  }

  /* ── 채점 ── worn = [{ cat, id, tags: [], dye?: 'c-…' }] (입은 것만). 빼기는 없다 */
  function tagsOf(p) { return p && Array.isArray(p.tags) ? p.tags : []; }
  function score(worn, theme, seed) {
    var list = (Array.isArray(worn) ? worn : []).filter(function (p) { return isObj(p) && p.id != null; });
    var th = 0, col = 0, dye = 0, cnt = {}, best = null, bestN = 0;
    list.forEach(function (p) {
      var tg = tagsOf(p), n = 0;
      theme.tags.forEach(function (t) { if (tg.indexOf(t) >= 0) n++; });
      th += Math.min(PTS.pieceMax, n * PTS.tag);
      if (tg.indexOf(theme.color) >= 0 || p.dye === theme.color) col += PTS.color;
      if (p.dye === theme.color) dye = PTS.dye;
      STYLES.forEach(function (s) { if (tg.indexOf(s) >= 0) cnt[s] = (cnt[s] || 0) + 1; });
    });
    STYLES.forEach(function (s) {   /* 가장 많이 겹친 느낌 (같으면 주제가 바라는 것 먼저, 그다음 목록 순) */
      var c = cnt[s] || 0, want = theme.tags.indexOf(s) >= 0, bw = best != null && theme.tags.indexOf(best) >= 0;
      if (c > bestN || (c === bestN && c > 0 && want && !bw)) { best = s; bestN = c; }
    });
    var parts = [
      { what: 'stage', points: PTS.stage, max: PTS.stage },
      { what: 'theme', points: Math.min(PTS.themeMax, th), max: PTS.themeMax },
      { what: 'color', points: Math.min(PTS.colorMax, col), max: PTS.colorMax },
      { what: 'match', points: bestN >= 3 ? PTS.match3 : bestN === 2 ? PTS.match2 : 0, max: PTS.match3, tag: bestN >= 2 ? best : null },
      { what: 'dye', points: dye, max: PTS.dye }
    ];
    var total = parts.reduce(function (a, p) { return a + p.points; }, 0);
    return { total: Math.max(0, Math.min(100, total)), parts: parts, tie: rng(hashSeed('contest-tie', seed))() };
  }
  function part(res, what) { var ps = (res && res.parts) || []; for (var i = 0; i < ps.length; i++) if (ps[i] && ps[i].what === what) return ps[i]; return { what: what, points: 0, max: 1 }; }
  function stars(points, max) { return Math.max(1, Math.min(3, 1 + Math.round(2 * points / Math.max(1, max)))); }
  /* 심사 카드 셋 (그림 + 별 1~3): 주제 꼬리표 · 주제 색 (물들임 포함) · 어울림 */
  function cards(res, theme) {
    var t = part(res, 'theme'), c = part(res, 'color'), d = part(res, 'dye'), m = part(res, 'match');
    return [
      { what: 'theme', icon: theme.tags[0], stars: stars(t.points, PTS.themeMax) },
      { what: 'color', icon: theme.color, stars: stars(c.points + d.points, PTS.colorMax + PTS.dye) },
      { what: 'match', icon: m.tag || 'match', stars: stars(m.points, PTS.match3) }
    ];
  }

  /* ── 경쟁자 ── catalog = [{ key, items: [{ id, tags }] }] (입는 칸만). 주마다 같은 셋 */
  function fits(it, theme) { var tg = tagsOf(it); return tg.indexOf(theme.color) >= 0 || theme.tags.some(function (t) { return tg.indexOf(t) >= 0; }); }
  function rivals(weekKey, catalog, theme, salt) {
    var cats = (Array.isArray(catalog) ? catalog : []).filter(function (c) { return isObj(c) && Array.isArray(c.items) && c.items.length; });
    var cr = rng(hashSeed('contest-rival-color', weekKey, salt)), pool = RIVAL_COLORS.slice(), out = [];
    for (var k = 0; k < 3; k++) {
      var r = rng(hashSeed('contest-rival', weekKey, k, salt)), look = [];
      cats.forEach(function (c) {   /* 칸마다 하나 (뽑기 수는 늘 둘 — 목록이 바뀌어도 다른 칸의 뽑기가 밀리지 않게) */
        var a = r(), b = r(), good = c.items.filter(function (it) { return fits(it, theme); });
        var from = a < RIVAL_P[k] && good.length ? good : c.items, it = from[Math.floor(b * from.length)];
        if (it && it.id != null) look.push({ cat: c.key, id: it.id, tags: tagsOf(it).slice() });
      });
      var res = score(look, theme, hashSeed('contest-rival-tie', weekKey, k, salt));
      out.push({ k: k, color: pool.splice(Math.floor(cr() * pool.length), 1)[0], look: look, total: res.total, parts: res.parts, tie: res.tie });
    }
    return out;
  }

  /* ── 저장 ── */
  function normalize(u) {   /* u = S.user. 없거나 깨진 칸만 기본값으로 — 모르는 값은 그대로 */
    if (!isObj(u)) return u;
    if (!isObj(u.contest)) u.contest = { v: 1, weeks: {} };
    if (!isObj(u.contest.weeks)) u.contest.weeks = {};
    Object.keys(u.contest.weeks).forEach(function (k) { var w = u.contest.weeks[k]; if (isObj(w) && !isObj(w.days)) w.days = {}; });
    return u;
  }
  function entryOk(e) { return isObj(e) && e.rank === Math.floor(e.rank) && e.rank >= 1 && e.rank <= 4; }
  function shellsOf(e) { return isObj(e) && typeof e.shells === 'number' && e.shells >= 0 && e.shells === Math.floor(e.shells) ? e.shells : entryOk(e) ? SHELLS[e.rank - 1] : 0; }   /* 깨진 수는 등수의 조개로 */
  function today(u, dk) {
    var w = week(dk); if (!w || !isObj(u) || !isObj(u.contest) || !isObj(u.contest.weeks)) return null;
    var W = u.contest.weeks[w.key], e = isObj(W) && isObj(W.days) ? W.days[dk] : null;
    return entryOk(e) ? e : null;
  }
  function slim(look) { return look.map(function (p) { return { cat: p.cat, id: p.id }; }); }
  /* 나가기. o = { catalog, salt (문어 born 등 — 저장마다 다른 경쟁자), at (ms, 부르는 쪽 시계) }.
     → null (닫힌 날) | { rank, shells, replay, entry }. replay = 그날 이미 나갔다 (적힌 것 그대로). 조개는 부르는 쪽이 entry.paid 를 보고 한 번만 준다 */
  function enter(u, dk, worn, o) {
    var w = week(dk); if (!w || !w.open || !isObj(u)) return null;
    normalize(u); o = o || {};
    var had = today(u, dk); if (had) return { rank: had.rank, shells: shellsOf(had), replay: true, entry: had };
    var W0 = u.contest.weeks[w.key];
    if (W0 != null && (!isObj(W0) || (isObj(W0.days) && W0.days[dk] != null))) return null;   /* 모르는 모양의 값이 그 자리에 있으면 덮어쓰지 않는다 */
    var list = (Array.isArray(worn) ? worn : []).filter(function (p) { return isObj(p) && p.id != null; });
    var mine = score(list, w.theme, hashSeed('contest-me', w.key, o.salt, list.map(function (p) { return p.cat + ':' + p.id + ':' + (p.dye || ''); }).join(',')));
    var rv = rivals(w.key, o.catalog, w.theme, o.salt);
    var rank = 1 + rv.filter(function (r) { return r.total > mine.total; }).length;   /* 동점은 내가 앞 */
    var e = {
      v: 1, at: typeof o.at === 'number' ? o.at : 0, theme: w.theme.id, total: mine.total, parts: mine.parts, rank: rank, shells: SHELLS[rank - 1], paid: false,
      look: slim(list), rivals: rv.map(function (r) { return { k: r.k, color: r.color, total: r.total, parts: r.parts, look: slim(r.look) }; })
    };
    var W = u.contest.weeks[w.key]; if (!isObj(W)) W = u.contest.weeks[w.key] = { theme: w.theme.id, days: {} };
    if (!isObj(W.days)) W.days = {};
    W.days[dk] = e;
    return { rank: rank, shells: e.shells, replay: false, entry: e };
  }
  /* 무대 순서 (낮은 점수부터 — 내가 동점이면 앞 등수) → [{ who: 'me' | 0 | 1 | 2, total, rank }] 등수 순 */
  function board(e) {
    var rows = [{ who: 'me', total: e.total | 0, o: -1 }].concat((Array.isArray(e.rivals) ? e.rivals : []).map(function (r, i) { return { who: i, total: (r && r.total) | 0, o: i }; }));
    rows.sort(function (a, b) { return b.total - a.total || a.o - b.o; });
    return rows.map(function (r, i) { return { who: r.who, total: r.total, rank: i + 1 }; });
  }
  /* 두 탭: 주 · 날을 합친다 (같은 날이 양쪽에 있으면 조개를 준 쪽, 그다음 먼저 나간 쪽 — 준 표시는 한쪽이라도 있으면 남는다). → 새 contest 객체 */
  function merge(a, b) {
    var A = isObj(a) ? a : { v: 1, weeks: {} }, Bc = isObj(b) ? b : { v: 1, weeks: {} }, out = {}, k;
    for (k in Bc) if (Object.prototype.hasOwnProperty.call(Bc, k)) out[k] = Bc[k];
    for (k in A) if (Object.prototype.hasOwnProperty.call(A, k) && !(k in out)) out[k] = A[k];
    var wa = isObj(A.weeks) ? A.weeks : {}, wb = isObj(Bc.weeks) ? Bc.weeks : {}, weeks = {};
    Object.keys(wb).concat(Object.keys(wa)).forEach(function (wk) {
      if (Object.prototype.hasOwnProperty.call(weeks, wk)) return;
      var x = wa[wk], y = wb[wk];
      if (!isObj(x) || !isObj(y)) { weeks[wk] = isObj(y) ? y : isObj(x) ? x : (y !== undefined ? y : x); return; }
      var W = {}, j; for (j in y) if (Object.prototype.hasOwnProperty.call(y, j)) W[j] = y[j];
      for (j in x) if (Object.prototype.hasOwnProperty.call(x, j) && !(j in W)) W[j] = x[j];
      var dx = isObj(x.days) ? x.days : {}, dy = isObj(y.days) ? y.days : {}, days = {};
      Object.keys(dy).concat(Object.keys(dx)).forEach(function (dk) {
        if (Object.prototype.hasOwnProperty.call(days, dk)) return;
        var p = dx[dk], q = dy[dk];
        if (!entryOk(p) || !entryOk(q)) { days[dk] = entryOk(q) ? q : entryOk(p) ? p : (q !== undefined ? q : p); return; }
        var keep = (!!p.paid !== !!q.paid) ? (p.paid ? p : q) : ((p.at || 0) < (q.at || 0) ? p : q);
        if ((p.paid || q.paid) && !keep.paid) keep.paid = true;
        days[dk] = keep;
      });
      W.days = days; weeks[wk] = W;
    });
    out.weeks = weeks; if (out.v == null) out.v = 1;
    return out;
  }
  function logLine(e, full) { return fill(full ? TEXT.logFull : TEXT.log, { n: e.rank, s: shellsOf(e) }); }

  /* ── 픽셀 그림 (글자 격자 + 팔레트. '.' = 비침). 그리기는 앱이 한다 ── */
  var PAL = deepFreeze({
    k: '#2a2438', w: '#f4efe2', b: '#4a86d8', B: '#2f5fa8', y: '#e8a93a', Y: '#f6d36a', r: '#c8323a', R: '#8f2430', p: '#f07aa8', P: '#c85a88',
    g: '#4fa868', G: '#2f7a4a', o: '#e8803a', n: '#9a5a3a', N: '#6a3a26', v: '#9a5cc8', V: '#4a3478', s: '#cfc9c0', S: '#8a8494',
    c: '#bfe3f0', d: '#1e2a44', e: '#f3d9a4', E: '#d9b377', l: '#a8d98a', m: '#fff6c8'
  });
  var ART = deepFreeze({
    tag: {
      cute: ['.........', 'pp.....pp', 'ppp...ppp', 'pPppkppPp', 'pPpkkkpPp', 'pPppkppPp', 'ppp...ppp', 'pp.....pp', '.........'],
      cool: ['.........', '.........', 'kkkkkkkkk', 'kddk.kddk', 'kdbk.kdbk', '.kk...kk.', '.........', '.........', '.........'],
      cosy: ['..S..S...', '.S..S....', '..S..S...', 'nnnnnn...', 'nNnnnnnn.', 'nNnnnn.n.', 'nNnnnnnn.', 'nnnnnn...', '.nnnn....'],
      sporty: ['.........', '..ww.....', '..wwo....', '.owwwo...', '.oowwwoo.', 'oooooooo.', 'ooooooooo', 'kkkkkkkkk', '.........'],
      neat: ['bb.....bb', 'bbb...bbb', 'bbbbrbbbb', '.bbrrrbb.', '...rrr...', '...rRr...', '...rrr...', '....r....', '.........'],
      sea: ['.........', '..bb.....', '.b..b....', 'b....b..b', 'bbbbbbbbb', 'cBBBBcBBB', 'BBcBBBBcB', 'BBBBBBBBB', '.........'],
      flower: ['...ppp...', '..ppppp..', '.pppyppp.', '.ppyyypp.', '.pppyppp.', '..ppppp..', '...pgp...', '..ggg....', '....g....'],
      star: ['....y....', '....y....', '...yYy...', 'yyyyYyyyy', '.yyYYYyy.', '..yyyyy..', '..yyyyy..', '.yyy.yyy.', '.y.....y.'],
      warm: ['....o....', '.o..o..o.', '..oyyyo..', '..yYYyy..', 'ooyYyyyoo', '..yyyyy..', '..oyyyo..', '.o..o..o.', '....o....'],
      fresh: ['......gg.', '....gggg.', '...ggGgg.', '..ggGggg.', '.ggGgggg.', '.gGgggg..', '.Ggggg...', 'G.ggg....', 'G........'],
      match: ['.........', '.yy...yy.', 'yyyy.yyyy', 'yyyyyyyyy', 'yyyyyyyyy', '.yyyyyyy.', '..yyyyy..', '...yyy...', '....y....'],
      swatch: ['.kkkkkkk.', 'kxxxxxxxk', 'kxwxxxxxk', 'kxxxxxxxk', 'kxxxxxxxk', 'kxxxxxxxk', 'kxxxxxxxk', 'kxxxxxxxk', '.kkkkkkk.']
    },
    star: ['...y...', '...y...', 'yyyYyyy', '.yYYYy.', '..yyy..', '.yy.yy.', '.y...y.'],
    /* 문어 (x = 몸 색 · X = 짙은 테두리 · h = 밝은 윤기 — 몸 색에서 만든다). octHat = 머리 위 장식 (비치지 않는 칸만 덮는다) */
    oct: [
      '....XXXXXXXX....', '..XXxxxxxxxxXX..', '.XxxhhxxxxxxxxX.', '.XxhxxxxxxxxxxX.', 'XxxxxxxxxxxxxxxX', 'XxxkkxxxxxxkkxxX', 'XxxkwxxxxxxkwxxX',
      'XxxxxxxxxxxxxxxX', 'XxxxxxxxxxxxxxxX', 'XxxxxxxxxxxxxxxX', 'XxxXXxxXXxxXXxxX', 'XxxXXxxXXxxXXxxX', '.XX..XX..XX..XX.'
    ],
    octHat: {
      bow: ['.........pp.pp..', '.........ppPpp..', '.........pp.pp..'],
      flower: ['...p............', '..pyp...........', '...p............'],
      cap: ['....bbbbbbbb....', '..bbbbbbbbbbBBBB'],
      star: ['..........y.....', '.........yYy....', '..........y.....']
    },
    theme: {
      beach: [
        'cccccccccccccccc', 'ccccccccccccYYcc', 'cccccccccccYYYYc', 'cccccccccccYYYYc', 'ccccccccccccYYcc', 'cccccccccccccccc', 'bbbbbbbbbbbbbbbb', 'bbwwbbbbbbwwbbbb',
        'bbbbbbwwbbbbbbww', 'BBBBBBBBBBBBBBBB', 'wwBBBwwwwBBBBwww', 'eewwweeeewwwweee', 'eeeeeeeeeeeeeeee', 'eeeppeeeeeeeEeee', 'eepPPpeeeeeeeeee', 'eeeeeeeeEeeeeeee'
      ],
      winter: [
        'dddddddddddddddd', 'ddwddddddddddwdd', 'ddddddkkkkdddddd', 'dwddddkkkkdddddd', 'dddddkkkkkkddwdd', 'ddddddwwwwdddddd', 'dddddwkwwkwddddd', 'dddddwwoowwdddwd',
        'ddwddrrrrrrddddd', 'ddddwwwwrrwwdddd', 'dddwwwwwrwwwwddd', 'dddwwwkwwwwwwddd', 'dwdwwwwwwwwwwdwd', 'ddddwwwkwwwwdddd', 'wwwwwwwwwwwwwwww', 'wwwwwwwwwwwwwwww'
      ],
      night: [
        'VVVVVVVVVVVVVVVV', 'VVVVVVVVVVmmVVVV', 'VVmVVVVVVmmVVVVV', 'VVVVVVVVmmmVVVVV', 'VVVVVVVVmmmVVVmV', 'VVVVVmVVmmmmVVVV', 'VVVVVVVVVmmmmmVV', 'VmVVVVVVVVmmmVVV',
        'VVVVVVVVVVVVVVVV', 'VVVVmVVVVVVVVmVV', 'VVVVVVVVVVVVVVVV', 'VVVVVVVVGGVVVVVV', 'VGGVVVVGGGGVVVGG', 'GGGGVVGGGGGGVGGG', 'GGGGGGGGGGGGGGGG', 'GGGGGGGGGGGGGGGG'
      ],
      garden: [
        'cccccccccccccccc', 'cccccccccccccccc', 'ccccccccccSSSccc', 'cccccccccSSSSScS', 'ccccccccbcSSSSSc', 'cccccccbccSSSScc', 'ccccccbcbccccccc', 'cccpcccccbcccycc',
        'ccpypcccccccyoyc', 'cccpccccrccccycc', 'cccgcccryrcccgcc', 'ccggccccgrccggcc', 'lllgllllgllllgll', 'llllllllllllllll', 'nnnnnnnnnnnnnnnn', 'nNnnnNnnnnNnnnNn'
      ],
      rain: [
        'SSSSSSSSSSSSSSSS', 'SScSSSSSSSScSSSS', 'SScSSSyyyySSSScS', 'SSSSyyyyyyyySScS', 'SSSyyYyyyyYyySSS', 'SSyyyYyyyyYyyySS', 'SSyyyYyyyyYyyySS', 'SSSSSSSkSSSSSSSS',
        'ScSSSSSkSSSScSSS', 'ScSSSSSkSSSScSSS', 'SSSScSSkSSSSSSSS', 'SSSScSSkSkSSSScS', 'SSSSSSSSkkSSSScS', 'SSSSSSSSSSSSSSSS', 'bbbcbbbbbbbcbbbb', 'bbbbbbcbbbbbbbbb'
      ],
      run: [
        'cccccccccccccccc', 'cccccccccccccccc', 'ccrcycbcrcycbccc', 'cccccccccccccccc', 'cccccccccccccccc', 'cccccwwccccccccc', 'cccccwwwcccccccc', 'ccccowwwwocccccc',
        'ccccoowwwwoooccc', 'cccooooooooooccc', 'cccooooooooooocc', 'ccckkkkkkkkkkkcc', 'cccccccccccccccc', 'oooooooooooooooo', 'owwowwowwowwowwo', 'oooooooooooooooo'
      ],
      flower: [
        'cccccccccccccccc', 'cccppcccccccpccc', 'ccppppccccccccpc', 'cccppcccppcccccc', 'ccccccccppppcccc', 'cpcccccpppyppccc', 'cccccccppyyyppcc', 'ccccpccpppyppccc',
        'cccccccccppppccc', 'ccpcccccccgccccp', 'ccccccccccgccccc', 'cccccccccggccpcc', 'cccccccccgcccccc', 'llllllllllllllll', 'lplllllllllllpll', 'llllllplllllllll'
      ],
      book: [
        'eeeeeeeeeeeeeeee', 'eeeoeeeeeeeeeree', 'eeeeeeeeeoeeeeee', 'eeeeeeeeeeeeeeee', 'eeeeereeeeeeeeoe', 'eeeeeeeeeeeeeeee', 'eerrrrrreebbbeee', 'eerwwwwreebbbeee',
        'eerwkkwreebbbgge', 'eerwwwwreebbbgge', 'eerwkkwreebbbgge', 'eerwwwwreebbbgge', 'eerrrrrreebbbgge', 'nnnnnnnnnnnnnnnn', 'nNNNNNNNNNNNNNNn', 'nnnnnnnnnnnnnnnn'
      ],
      forest: [
        'cccccccccccccccc', 'ccccccgccccccccc', 'cccccgggcccccccc', 'ccccgggggccccgcc', 'cccgggGgggccgggc', 'ccccgggggccggggg', 'cccgggGgggccgGgc', 'ccgggggggggggggg',
        'ccccccnccccccncc', 'ccccccnccccccncc', 'lllllllllllllnll', 'lllleeeeelllllll', 'llleeeeeeeelllll', 'lleeeeEeeeeeelll', 'leeeeeeeeEeeeeel', 'eeeeeeeeeeeeeeee'
      ],
      nap: [
        'NNNNNNNNNNNNNNNN', 'NnnnnnnnnnnnnnnN', 'NnnnnnnnnnnnnnnN', 'Nnnnnnnnnnmmnnnn', 'Nnnnnnnnnmmnnnnn', 'Nnnnnnnnnmmnnnnn', 'Nnnnnnnnnnmmmnnn', 'Nnnnnnnnnnnnnnnn',
        'Nnnnnnnnnnnnnnnn', 'Nnwwwwnnnnnnnnnn', 'Nwwwwwwppppppppn', 'Nwwwwwwppppppppp', 'NnwwwwpppPpppPpp', 'Nnnppppppppppppp', 'NNNNNNNNNNNNNNNN', 'NNNNNNNNNNNNNNNN'
      ],
      fest: [
        'dddddddddddddddd', 'dddydddddddddddd', 'ddyyyddddddpdddd', 'dddyddddddpdpddd', 'ddddddddddddpddd', 'dddddddcdddddddd', 'ddddddcdcddddddd', 'dddddddcdddddddd',
        'kkkkkkkkkkkkkkkk', 'drrddyyddbbddppd', 'drrddyyddbbddppd', 'ddrdddyddddbdddp', 'dddddddddddddddd', 'dddddddddddddddd', 'BBBBBBBBBBBBBBBB', 'BcBBBBcBBBBBcBBB'
      ],
      neat: [
        'ssssssssssssssss', 'ssssssssssssssss', 'sswwwssssssswwws', 'sswwwwsssswwwwss', 'ssswwwwkkwwwwsss', 'sssswwkkkkwwssss', 'ssswwwwkkwwwwsss', 'sswwwwwkkwwwwwss',
        'sswwwwwkkwwwwwss', 'sswwwwkkkkwwwwss', 'sswwwwkkkkwwwwss', 'sswwwwwkkwwwwwss', 'sswwwwwwwwwwwwss', 'sswwwwwwkwwwwwss', 'sswwwwwwwwwwwwss', 'ssssssssssssssss'
      ]
    }
  });
  /* 그림 하나 → { w, h, rows, pal }. kind: 'theme' (id) | 'tag' (꼬리표 · 색 꼬리표는 색 네모) | 'star' | 'oct' (tint = 몸 색) */
  function art(kind, id, tint) {
    var rows = null, pal = PAL;
    if (kind === 'theme') rows = ART.theme[id];
    else if (kind === 'star') rows = ART.star;
    else if (kind === 'oct') {
      rows = ART.oct; tint = tint || '#8a8494';
      var hat = id != null && ART.octHat[id];
      if (hat) rows = rows.map(function (r, j) { var o = hat[j]; if (!o) return r; var out = ''; for (var i = 0; i < r.length; i++) out += o.charAt(i) !== '.' ? o.charAt(i) : r.charAt(i); return out; });
    }
    else if (kind === 'tag') { if (COLOR_HEX[id]) { rows = ART.tag.swatch; tint = COLOR_HEX[id]; } else rows = ART.tag[id]; }
    if (!rows) return null;
    return { w: rows[0].length, h: rows.length, rows: rows, pal: pal, tint: tint || null };
  }

  var API = {
    THEMES: THEMES, STYLES: STYLES, TAG_NAME: TAG_NAME, COLOR_HEX: COLOR_HEX, SHELLS: SHELLS, PTS: PTS, TEXT: TEXT, PAL: PAL,
    RIVAL_HATS: RIVAL_HATS, hashSeed: hashSeed, rng: rng, fill: fill, themeById: themeById, themeAt: themeAt,
    week: week, score: score, cards: cards, stars: stars, rivals: rivals, enter: enter, today: today, board: board,
    normalize: normalize, merge: merge, shellsOf: shellsOf, logLine: logLine, art: art
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.CONTEST = API;
})(typeof window !== 'undefined' ? window : globalThis);
