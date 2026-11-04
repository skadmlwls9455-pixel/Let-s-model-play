/* js/brain.js — 뽈뽈 문어의 데모 두뇌 (작은 규칙 뭉치). 전역 BRAIN.
 *
 * - 순수 로직 + 위키백과 fetch 도우미. DOM 접근 없음. node 에서도 그대로 로드된다.
 * - 모든 선택은 mulberry32(seed) 만 쓴다. Math.random 금지.
 * - fetch 결과(성공/실패)는 정류장의 "읽기 상태" 표기에만 쓰이고 길 선택을 바꾸지 않는다.
 *   난수 뽑는 순서는 fetch 와 무관하게 고정된다:
 *     1 r_stay → (집) r_empty, r_activity, t_wrap, 스티커 위치 3, paper, r_reactionLine
 *                (외출) r_follow, r_wild, r_wildIdx, pickStart(필요 시), 길 만들기(걸음마다 r_return/r_distract/r_pick),
 *                ms×6, gap×6, g_return, g_remember, g_hang, g_wrap,
 *                r_remember, r_souvenir, r_template, r_memory, 스티커 위치 3, paper, r_reactionLine
 *   그 뒤에야 fetch 를 한다. fetch 결과로 달라지는 건 "들판 걸음" 후보 문서 하나뿐이고,
 *   그 인덱스도 미리 뽑아 둔 r_wildIdx 로 고른다 (floor(r * links.length)).
 * - 설계 명세: docs/DESIGN.md §5, §6.1, §8, §9, §12.2
 */
(function (root) {
  'use strict';

  var WIKI_API = 'https://ko.wikipedia.org/w/api.php';
  var WIKI_PAGE = 'https://ko.wikipedia.org/wiki/';
  var LICENSE = 'CC BY-SA 4.0';
  var ATTRIBUTION = 'Wikipedia (ko)';
  var THUMB_LICENSE = '위키미디어 공용';
  var LINK_EXCLUDE = /^\d+년|^\d+월|목록|동음이의|분류:|틀:|파일:|ISBN|위키/;
  var HANGUL = /[가-힣]/;
  var PARTICLES = ['에서', '으로', '에게', '까지', '부터', '처럼', '이랑', '하고',
    '의', '을', '를', '이', '가', '은', '는', '도', '에', '로', '와', '과'];
  var SPECIAL = { door_out: 1, slow_room: 1, letter_room: 1 };
  var STATUSES = ['read', 'builtin', 'simulated', 'failed', 'none'];
  var REACTIONS = ['폴짝', '우쭐', '졸림', '덤덤'];
  var SIMULATED_NOTE = '정적 페이지라 바깥은 못 읽어. 문 앞까지만 갔다 왔어';
  var IGNORED_NOTE = '오늘은 그쪽 말고 다른 데가 궁금했어';

  var DEFAULT_TEMPLATES = {
    followedThenLeft: ['{hint} 보러 갔다가 {mem}에 한눈팔았어', '{hint}에서 시작했는데 발이 {mem} 쪽으로 갔어'],
    followedKept: ['{hint}, 끝까지 봤어. {memory}', '{hint} 앞에 오래 있었어. {memory}'],
    noHint: ['오늘은 {mem}. {memory}', '발길 닿는 대로 가다 {mem}에 오래 있었어'],
    ignored: ['{hint}는 다음에. 오늘은 {mem}가 궁금했어', '{hint} 말고 {mem} 쪽이 끌렸어. {memory}'],
    linger: ['느린 글의 방에 앉아만 있었어. 아무것도 안 읽어도 됐어'],
    door: ['{hint} 문 앞까지 갔다 왔어. 바깥은 못 읽었지만'],
    letter: ['편지의 방 문을 열어 봤어. 아직 비어 있었어'],
    wild: ['들판에서 {mem}를 만났어. {memory}', '링크를 따라가다 {mem}에 닿았어']
  };

  var DEFAULT_HOME = [
    { id: 'count_rain', line: '창가에서 빗방울을 세다가 잠들었어', detail: '마흔까지 세고 잊었어. 다시 하나부터.', anchor: 'window', weight: 3, emoji: '🌧' },
    { id: 'reread_poster', line: '어제 포스터 뒷면을 다시 읽었어', detail: '영수증 글씨가 조금 번져 있었어.', anchor: 'crate', weight: 2, emoji: '🧾', minLantern: 1 },
    { id: 'nap', line: '담요 속에서 낮잠', detail: '빗소리가 이불 같았어.', anchor: 'blanket', weight: 3, emoji: '😴' },
    { id: 'swap_posters', line: '포스터 위치를 바꿔 봤어', detail: '왼쪽 걸 오른쪽으로. 그게 다야.', anchor: 'board', weight: 1, emoji: '🖼', minLantern: 2 },
    { id: 'watch_moss', line: '이끼 화분을 오래 들여다봤어', detail: '어제보다 조금 더 초록인 것 같아.', anchor: 'window', weight: 2, emoji: '🪴', minLantern: 1 },
    { id: 'nothing', line: '…', detail: '', anchor: 'blanket', weight: 0, emoji: '' }
  ];

  var BRAIN = { _world: null, LICENSE: LICENSE, ATTRIBUTION: ATTRIBUTION, THUMB_LICENSE: THUMB_LICENSE };

  /* ───────── 유틸 ───────── */
  function world() { return BRAIN._world || root.WORLD || null; }
  function lower(s) { return String(s == null ? '' : s).toLowerCase(); }
  function lerp(r, a, b) { return a + r * (b - a); }
  function toDate(x) {
    if (x instanceof Date) return isNaN(x.getTime()) ? new Date() : x;
    if (x == null) return new Date();
    var d = new Date(x);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function localDateKey(now) {
    var d = toDate(now);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function hostOf(url) {
    var m = /^https?:\/\/([^\/?#]+)/i.exec(String(url || ''));
    return m ? m[1].replace(/^www\./, '') : String(url || '');
  }
  function zeroCounts() { return { read: 0, builtin: 0, simulated: 0, failed: 0, none: 0 }; }
  function normalizeState(s) {
    s = s || {};
    return {
      visits: s.visits || {},
      affinity: s.affinity || {},
      lantern: s.lantern == null ? 0 : s.lantern,
      recent: Array.isArray(s.recent) ? s.recent : [],
      todayOut: s.todayOut == null ? 0 : s.todayOut
    };
  }
  /* 가중치 뽑기: r ∈ [0,1) 하나로 결정 */
  function pickWeighted(items, weightOf, r) {
    if (!items || !items.length) return -1;
    var ws = [], total = 0, i;
    for (i = 0; i < items.length; i++) {
      var w = weightOf ? weightOf(items[i], i) : 1;
      w = (typeof w === 'number' && w > 0 && isFinite(w)) ? w : 0;
      ws.push(w); total += w;
    }
    if (total <= 0) return Math.min(items.length - 1, Math.floor(r * items.length));
    var target = r * total, acc = 0;
    for (i = 0; i < items.length; i++) { acc += ws[i]; if (target < acc) return i; }
    return items.length - 1;
  }
  function sentences(text, maxLen) {
    var t = String(text || '').replace(/\s+/g, ' ').trim();
    if (!t) return '';
    var parts = t.split(/(?<=[.!?。])\s+/);
    var out = '';
    for (var i = 0; i < parts.length && i < 2; i++) {
      var cand = out ? out + ' ' + parts[i] : parts[i];
      if (cand.length > maxLen) break;
      out = cand;
    }
    if (!out) out = t.slice(0, maxLen - 1) + '…';
    return out;
  }

  /* ───────── 5.1 시드 · 난수 ───────── */
  /* FNV-1a 32bit. 인자를 '|' 로 이어 붙인 문자열의 UTF-16 코드 단위를 돈다. */
  function hashSeed() {
    var parts = [];
    for (var k = 0; k < arguments.length; k++) parts.push(arguments[k] == null ? '' : String(arguments[k]));
    var s = parts.join('|');
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }
  /* mulberry32 */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function asR(r) { return typeof r === 'function' ? r() : (typeof r === 'number' ? r : 0); }

  /* ───────── 5.3 힌트 읽기 ───────── */
  function tokenize(hint) {
    var out = [];
    String(hint || '').split(/[\s,.·…!?\/()\[\]"'“”‘’:;]+/).forEach(function (tok) {
      tok = tok.trim();
      if (!tok) return;
      var forms = [tok];
      for (var i = 0; i < PARTICLES.length; i++) {
        var p = PARTICLES[i];
        if (tok.length - p.length >= 2 && tok.slice(-p.length) === p) forms.push(tok.slice(0, -p.length));
      }
      forms.forEach(function (f) { if (f.length >= 2 && out.indexOf(f) < 0) out.push(f); });
    });
    return out;
  }

  function matchHint(hint) {
    var raw = (hint == null ? '' : String(hint)).trim();
    if (!raw) return { kind: 'none' };
    if (/^https?:\/\//i.test(raw)) return { kind: 'url', url: raw };
    var W = world();
    if (!W || !W.nodes) return { kind: 'wiki', query: raw };
    var low = lower(raw);
    var tokens = tokenize(raw).map(lower);
    var ids = Object.keys(W.nodes);
    var best = null;
    function offer(id, how, score) {
      if (!best || score > best.score) best = { nodeId: id, how: how, score: score };
    }
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i], node = W.nodes[id];
      if (!node || id === 'door_out') continue;
      var name = lower(node.name);
      var alts = (node.aliases || []).concat(node.keywords || []).map(lower).filter(Boolean);
      if (name && name === low) return { kind: 'node', nodeId: id, how: 'exact' };
      var j;
      for (j = 0; j < alts.length; j++) if (alts[j] === low) offer(id, 'alias', 1000 + alts[j].length);
      if (name && tokens.indexOf(name) >= 0) offer(id, 'token', 500 + name.length);
      for (j = 0; j < alts.length; j++) if (tokens.indexOf(alts[j]) >= 0) offer(id, 'alias', 400 + alts[j].length);
      if (name && name.length >= 2 && low.indexOf(name) >= 0) offer(id, 'token', 300 + name.length);
      for (j = 0; j < alts.length; j++) if (alts[j].length >= 2 && low.indexOf(alts[j]) >= 0) offer(id, 'alias', 200 + alts[j].length);
    }
    if (best) return { kind: 'node', nodeId: best.nodeId, how: best.how };
    return { kind: 'wiki', query: raw };
  }

  /* URL 경로에서 한글/영문 키워드로 노드 찾기 (문 다음 정류장) */
  function nodeFromUrl(url) {
    var W = world();
    if (!W || !W.nodes) return null;
    var s = String(url || '');
    try { s = decodeURIComponent(s); } catch (e) { /* 그대로 */ }
    var low = lower(s.replace(/^https?:\/\//i, '')).replace(/[_\-+]/g, ' ');
    var best = null;
    Object.keys(W.nodes).forEach(function (id) {
      var node = W.nodes[id];
      if (!node || SPECIAL[id] || node.corner === 'wild') return;
      var cands = [node.name, id.replace(/_/g, ' ')].concat(node.aliases || [], node.keywords || [], node.wiki ? [node.wiki] : []);
      cands.forEach(function (c) {
        c = lower(c);
        if (c.length >= 2 && low.indexOf(c) >= 0 && (!best || c.length > best.len)) best = { id: id, len: c.length };
      });
    });
    return best ? W.nodes[best.id] : null;
  }

  /* ───────── 5.4.1 위키 fetch ───────── */
  function filterLinkTitle(t) {
    if (typeof t !== 'string') return false;
    var s = t.trim();
    return s.length >= 2 && s.length <= 12 && HANGUL.test(s) && !LINK_EXCLUDE.test(s);
  }
  function parseWikiResponse(title, data) {
    var pages = data && data.query && data.query.pages;
    if (!pages) return { ok: false, reason: 'missing' };
    var keys = Object.keys(pages);
    if (!keys.length) return { ok: false, reason: 'missing' };
    var page = pages[keys[0]];
    if (!page || page.missing !== undefined || page.invalid !== undefined || page.pageid == null) return { ok: false, reason: 'missing' };
    var extract = String(page.extract || '').replace(/\s+/g, ' ').trim();
    if (!extract) return { ok: false, reason: 'missing' };
    var realTitle = page.title || title;
    var thumb = page.thumbnail && page.thumbnail.source
      ? { url: page.thumbnail.source, w: page.thumbnail.width || null, h: page.thumbnail.height || null } : null;
    var links = (page.links || []).map(function (l) { return l && l.title; }).filter(filterLinkTitle);
    return {
      ok: true, title: realTitle, extract: extract.slice(0, 160),
      url: WIKI_PAGE + encodeURIComponent(String(realTitle).replace(/ /g, '_')),
      thumb: thumb, links: links, license: LICENSE, attribution: ATTRIBUTION
    };
  }
  function wikiFetch(title, opts) {
    opts = opts || {};
    var timeoutMs = opts.timeoutMs == null ? 4000 : opts.timeoutMs;
    if (typeof fetch !== 'function') return Promise.resolve({ ok: false, reason: 'network' });
    var ac = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timedOut = false;
    var timer = setTimeout(function () { timedOut = true; if (ac) ac.abort(); }, timeoutMs);
    if (opts.signal && ac) {
      if (opts.signal.aborted) ac.abort();
      else opts.signal.addEventListener('abort', function () { ac.abort(); });
    }
    var url = WIKI_API + '?action=query&format=json&origin=*&redirects=1&prop=extracts|pageimages|links' +
      '&exintro=1&explaintext=1&exsentences=2&piprop=thumbnail&pithumbsize=480&pllimit=50&plnamespace=0' +
      '&titles=' + encodeURIComponent(String(title));
    var req;
    try {
      req = fetch(url, ac ? { signal: ac.signal } : undefined);
    } catch (e) {
      clearTimeout(timer);
      return Promise.resolve({ ok: false, reason: 'network' });
    }
    return Promise.resolve(req)
      .then(function (res) {
        if (!res || !res.ok) throw new Error('http ' + (res && res.status));
        return res.json();
      })
      .then(function (data) { clearTimeout(timer); return parseWikiResponse(title, data); })
      .catch(function () { clearTimeout(timer); return { ok: false, reason: timedOut ? 'timeout' : 'network' }; });
  }
  BRAIN.wikiUrl = function (title) { return WIKI_PAGE + encodeURIComponent(String(title).replace(/ /g, '_')); };

  /* fetchWiki(stub 가능)를 타임아웃·예외로부터 감싼다. 항상 resolve. */
  function normalizeResult(r) {
    if (!r || typeof r !== 'object') return { ok: false, reason: 'network' };
    if (!r.ok) return { ok: false, reason: r.reason || 'network' };
    return {
      ok: true, title: r.title || '', extract: String(r.extract || '').slice(0, 160), url: r.url || '',
      thumb: (r.thumb && r.thumb.url) ? { url: r.thumb.url, w: r.thumb.w || null, h: r.thumb.h || null } : null,
      links: Array.isArray(r.links) ? r.links.filter(filterLinkTitle) : [],
      license: r.license || LICENSE, attribution: r.attribution || ATTRIBUTION
    };
  }
  function safeFetch(fn, title, ms) {
    return new Promise(function (resolve) {
      var done = false;
      var ac = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var timer = setTimeout(function () {
        if (done) return; done = true;
        if (ac) ac.abort();
        resolve({ ok: false, reason: 'timeout' });
      }, ms);
      var p;
      try { p = Promise.resolve(fn(title, { signal: ac ? ac.signal : undefined, timeoutMs: ms })); }
      catch (e) { p = Promise.reject(e); }
      p.then(function (r) {
        if (done) return; done = true; clearTimeout(timer); resolve(normalizeResult(r));
      }, function (e) {
        if (done) return; done = true; clearTimeout(timer);
        resolve({ ok: false, reason: (e && e.name === 'AbortError') ? 'timeout' : 'network' });
      });
    });
  }
  function runPool(tasks, limit) {
    var results = new Array(tasks.length), next = 0;
    function worker() {
      if (next >= tasks.length) return Promise.resolve();
      var i = next++;
      return Promise.resolve().then(tasks[i])
        .then(function (r) { results[i] = r; }, function () { results[i] = { ok: false, reason: 'network' }; })
        .then(worker);
    }
    var ws = [];
    for (var k = 0; k < Math.min(limit, tasks.length); k++) ws.push(worker());
    return Promise.all(ws).then(function () { return results; });
  }

  /* ───────── 정류장 ───────── */
  function isNoneNode(node) { return !!(node && (node.linger || node.id === 'letter_room' || node.peek === 'none')); }
  function makeLibStop(node, state, viaTangent, bridge) {
    return {
      kind: 'room', node: node, id: node.id, name: node.name, emoji: node.emoji || '📚', corner: node.corner,
      first: node.id === 'door_out' ? false : !((state.visits && state.visits[node.id]) > 0),
      viaTangent: !!viaTangent, bridge: bridge || null, status: null, note: '', source: null, reason: null, ms: 0
    };
  }
  function makeDoorStop(url) {
    var W = world();
    var node = W && W.nodes && W.nodes.door_out;
    return {
      kind: 'url', node: node || null, id: 'door_out', url: url, name: (node && node.name) || '밖의 문',
      emoji: (node && node.emoji) || '🚪', corner: (node && node.corner) || 'door_out', first: false,
      viaTangent: false, bridge: null, status: 'simulated', note: SIMULATED_NOTE, source: null, reason: null, ms: 0
    };
  }
  function makeWildStop(title, opt) {
    opt = opt || {};
    return {
      kind: 'wild', node: null, id: null, title: title, name: title, emoji: '❔', corner: 'wild', first: true,
      viaTangent: !!opt.viaTangent, bridge: opt.bridge || null, fromHint: !!opt.fromHint,
      status: null, note: '', source: null, reason: null, ms: 0
    };
  }
  function applyFetch(stop, res, online) {
    stop.fetchResult = res || null;
    if (stop.kind === 'url') return;
    if (stop.kind === 'room' && isNoneNode(stop.node)) {
      stop.status = 'none';
      stop.note = stop.node.noneNote || (stop.node.linger ? '아무것도 안 읽어도 됐어' : '아직 비어 있었어');
      return;
    }
    if (res && res.ok) {
      stop.status = 'read';
      stop.note = sentences(res.extract, 90);
      stop.source = { url: res.url, extract: res.extract, thumb: res.thumb, license: res.license || LICENSE, attribution: res.attribution || ATTRIBUTION, title: res.title };
      if (stop.kind === 'wild' && res.title) stop.name = res.title;
      return;
    }
    var why = !online ? 'offline' : (stop.kind === 'room' && !stop.node.wiki) ? 'no_wiki' : (res && res.reason) || 'network';
    stop.reason = why;
    if (stop.kind === 'room' && stop.node.clue) {
      stop.status = 'builtin';
      stop.note = stop.node.clue;
    } else {
      stop.status = 'failed';
      stop.note = why === 'missing' ? '위키백과에 그 문서는 없었어' : why === 'timeout' ? '기다렸는데 답이 늦었어' : why === 'offline' ? '지금은 바깥 글을 못 읽어' : '연결이 안 됐어';
    }
  }

  /* ───────── 5.4 길 ───────── */
  function eligibleCorners(W) {
    var ids = Object.keys(W.corners || {});
    return ids.filter(function (c) {
      if (c === 'wild') return false;
      return Object.keys(W.nodes).some(function (id) { return !SPECIAL[id] && W.nodes[id].corner === c; });
    });
  }
  function nodesIn(W, corner) {
    return Object.keys(W.nodes).filter(function (id) { return !SPECIAL[id] && W.nodes[id].corner === corner; });
  }
  /* 선호 코너 60% / 아무 코너 30% / 엉뚱한 방 10%. 노드 가중 1/(1+visits) */
  function pickStart(state, R) {
    var W = world();
    state = normalizeState(state);
    var corners = eligibleCorners(W);
    var all = Object.keys(W.nodes).filter(function (id) { return !SPECIAL[id] && W.nodes[id].corner !== 'wild'; });
    var r = R();
    var pool = null;
    function weight(id) { return 1 / (1 + (state.visits[id] || 0)); }
    if (r < 0.6) {
      var top = null, topV = 0;
      corners.forEach(function (c) { var v = state.affinity[c] || 0; if (v > topV) { topV = v; top = c; } });
      if (top) pool = nodesIn(W, top);
    } else if (r >= 0.9) {
      pool = all.filter(function (id) { return W.nodes[id].odd; });
    }
    if (!pool || !pool.length) {
      if (corners.length) {
        var ci = Math.floor(R() * corners.length);
        pool = nodesIn(W, corners[ci]);
      }
      if (!pool || !pool.length) pool = all;
    }
    if (!pool.length) return null;
    var pi = pickWeighted(pool, weight, R());
    return pool[pi];
  }
  function buildRoute(W, state, R, startId, prefix, maxStops) {
    var stops = prefix.slice(), used = {}, i;
    for (i = 0; i < stops.length; i++) if (stops[i].id) used[stops[i].id] = true;
    var cur = W.nodes[startId];
    var pDistract = 0.40, reason = 'enough', ladder = [0.25, 0.45, 0.7, 1.0];
    var via = false, bridge = null, guard = 0;
    while (cur && guard++ < 12) {
      stops.push(makeLibStop(cur, state, via, bridge));
      used[cur.id] = true;
      if (stops.length >= 2 && cur.linger) { reason = 'linger'; break; }
      if (stops.length >= 2) {
        var pr = ladder[Math.min(stops.length - 2, ladder.length - 1)];
        if (R() < pr) { reason = stops.length >= 4 ? 'tired' : 'enough'; break; }
      }
      if (stops.length >= maxStops) { reason = 'tired'; break; }
      var distract = R() < pDistract;
      var tang = (cur.tangents || []).filter(function (t) { return t && W.nodes[t.to] && !used[t.to] && t.to !== 'door_out'; })
        .map(function (t) { return { node: W.nodes[t.to], bridge: t.bridge || null, via: true }; });
      var rel = (cur.related || []).filter(function (id) { return W.nodes[id] && !used[id] && id !== 'door_out'; })
        .map(function (id) { return { node: W.nodes[id], bridge: null, via: false }; });
      var pool;
      if (distract && tang.length) pool = tang;
      else if (rel.length) pool = rel;
      else if (tang.length) pool = tang;
      else {
        var same = nodesIn(W, cur.corner).filter(function (id) { return !used[id]; });
        if (!same.length) same = Object.keys(W.nodes).filter(function (id) { return !used[id] && !SPECIAL[id] && W.nodes[id].corner !== 'wild'; });
        if (!same.length) break;
        pool = same.map(function (id) { return { node: W.nodes[id], bridge: null, via: false }; });
      }
      var pi = pickWeighted(pool, function (p) { return 1 / (1 + (state.visits[p.node.id] || 0)); }, R());
      var nxt = pool[pi];
      if (nxt.node.corner === cur.corner) pDistract += 0.15; else pDistract = 0.40;
      via = nxt.via; bridge = nxt.bridge; cur = nxt.node;
    }
    return { stops: stops, reason: reason };
  }

  /* ───────── 5.6 한 줄 ───────── */
  function templatesFor(kind) {
    var W = world();
    var t = W && W.lineTemplates && W.lineTemplates[kind];
    if (Array.isArray(t) && t.length) return t;
    return DEFAULT_TEMPLATES[kind] || DEFAULT_TEMPLATES.noHint;
  }
  function composeLine(kind, ctx, r) {
    ctx = ctx || {};
    var list = templatesFor(kind);
    var idx = Math.min(list.length - 1, Math.floor(asR(r) * list.length));
    var line = String(list[idx] || '');
    var map = { hint: ctx.hint, mem: ctx.mem, memory: ctx.memory, name: ctx.name };
    line = line.replace(/\{(\w+)\}/g, function (_, key) {
      var v = map[key];
      return v == null ? '' : String(v);
    });
    line = line.replace(/\{[^}]*\}/g, '').replace(/\s+/g, ' ').replace(/\s+([.,!?…])/g, '$1').replace(/^[.,\s]+/, '').trim();
    return line;
  }
  function pickMemory(node, r) {
    if (!node || !Array.isArray(node.memories) || !node.memories.length) return '';
    return String(node.memories[Math.min(node.memories.length - 1, Math.floor(asR(r) * node.memories.length))]);
  }
  function drawStickerPos(R) {
    return { x: Math.round(lerp(R(), 58, 82)), y: Math.round(lerp(R(), 18, 40)), rot: Math.round(lerp(R(), -14, 14)) };
  }
  function pickReactionLine(reaction, r) {
    var W = world();
    var rec = W && W.reactions && W.reactions[reaction];
    if (!rec || !Array.isArray(rec.lines) || !rec.lines.length) return null;
    return String(rec.lines[Math.min(rec.lines.length - 1, Math.floor(asR(r) * rec.lines.length))]);
  }
  function reactionEmoji(reaction) {
    var W = world();
    var rec = W && W.reactions && W.reactions[reaction];
    return (rec && rec.emoji) || { '폴짝': '🎉', '우쭐': '😌', '졸림': '😴', '덤덤': '😶' }[reaction] || '😶';
  }

  /* ───────── 5.9 반응 ───────── */
  function computeReaction(stops, followed, hour, isHome) {
    if (isHome) return '졸림';
    var anyFirst = stops.some(function (s) { return s.first; });
    var anyWild = stops.some(function (s) { return s.kind === 'wild'; });
    if (anyFirst || anyWild) return '폴짝';
    if (followed === 'followed' && stops.length && stops.every(function (s) { return s.status === 'read'; })) return '우쭐';
    if (stops.length >= 4 || hour >= 23 || hour <= 5) return '졸림';
    return '덤덤';
  }

  /* ───────── 힌트 따랐나 ───────── */
  function computeFollowed(match, intent, follow, stops, hintNode, urlNode) {
    if (!match || match.kind === 'none') return 'none';
    if (match.kind === 'url') {
      var lib = stops.filter(function (s) { return s.kind === 'room'; });
      if (urlNode && lib.length && lib.every(function (s) { return s.corner === urlNode.corner; })) return 'followed';
      return 'left';
    }
    if (!intent) return 'none';
    if (!follow) return 'ignored';
    if (match.kind === 'wiki') {
      return stops.length > 1 ? 'left' : 'followed';
    }
    if (!hintNode || !stops.length || stops[0].id !== hintNode.id) return 'ignored';
    return stops.every(function (s) { return s.corner === hintNode.corner; }) ? 'followed' : 'left';
  }

  /* ───────── 영수증 + 포스터 조립 (plan / replay 공용) ───────── */
  function assemble(ctx) {
    var W = world();
    var stops = ctx.stops, match = ctx.match, rr = ctx.rr;
    var hintLabel = match.kind === 'node' && ctx.hintNode ? ctx.hintNode.name
      : match.kind === 'wiki' ? match.query : match.kind === 'url' ? hostOf(match.url) : '';
    var hintStopIdx = (ctx.intent && ctx.follow) ? 0 : -1;

    /* 기억 고르기 */
    var remIdx = -1;
    if (typeof ctx.remIdx === 'number' && ctx.remIdx >= 0 && ctx.remIdx < stops.length) remIdx = ctx.remIdx;
    else if (stops.length) {
      remIdx = pickWeighted(stops, function (s, i) {
        var w = 1;
        if (s.first) w *= 2.0;
        if (s.status === 'read') w *= 1.3;
        if (s.viaTangent) w *= 1.6;
        if (i === hintStopIdx) w *= 0.7;
        if (s.status === 'none' || s.status === 'simulated') w *= 0.5;
        return w;
      }, rr.rRemember);
    }
    var rem = remIdx >= 0 ? stops[remIdx] : null;

    /* 기념품 */
    var souvenir = null;
    var cands = stops.filter(function (s) {
      return s.kind === 'room' && s.first && s.node.souvenir && (!W.souvenirs || W.souvenirs[s.node.souvenir]);
    });
    if (cands.length && rr.rSouvenir < 0.35) {
      souvenir = cands[Math.min(cands.length - 1, Math.floor((rr.rSouvenir / 0.35) * cands.length))].node.souvenir;
    }

    /* 한 줄 */
    var line = ctx.line || null, lineKind = null;
    if (rem) {
      var memory = '';
      if (rem.kind === 'room') memory = pickMemory(rem.node, rr.rMemory);
      if (!memory && rem.status === 'read' && rem.source) memory = sentences(rem.source.extract, 60);
      if (rem.kind === 'room' && rem.node.linger) lineKind = 'linger';
      else if (rem.kind === 'room' && rem.node.id === 'letter_room') lineKind = 'letter';
      else if (rem.kind === 'url') lineKind = 'door';
      else if (ctx.intent && ctx.follow) lineKind = remIdx === hintStopIdx ? 'followedKept' : 'followedThenLeft';
      else if (ctx.intent && !ctx.follow) lineKind = 'ignored';
      else if (rem.kind === 'wild' && !ctx.intent) lineKind = 'wild';
      else lineKind = 'noHint';
      if (!line) line = composeLine(lineKind, { hint: hintLabel, mem: rem.name, memory: memory, name: ctx.name }, rr.rTemplate);
    }

    /* 반응 */
    var followed = computeFollowed(match, ctx.intent, ctx.follow, stops, ctx.hintNode, ctx.urlNode);
    var reaction = (ctx.reaction && REACTIONS.indexOf(ctx.reaction) >= 0) ? ctx.reaction : computeReaction(stops, followed, ctx.hour, false);

    /* 영수증 */
    var counts = zeroCounts();
    var rstops = stops.map(function (s, i) {
      counts[s.status] = (counts[s.status] || 0) + 1;
      var o = {
        idx: i, nodeId: s.kind === 'room' ? s.id : (s.kind === 'url' ? 'door_out' : null), title: s.kind === 'wild' ? s.title : undefined,
        name: s.name, emoji: s.emoji, corner: s.corner, status: s.status, ms: s.ms, note: s.note || '',
        source: s.source ? { url: s.source.url, extract: s.source.extract, thumb: s.source.thumb, license: s.source.license, attribution: s.source.attribution } : null,
        first: !!s.first, viaTangent: !!s.viaTangent, bridge: s.bridge || null
      };
      if (s.kind === 'url') o.url = s.url;
      if (s.reason) o.reason = s.reason;
      if (s.kind === 'wild') o.wild = true;
      return o;
    });
    var receipt = {
      stops: rstops, counts: counts, souvenir: souvenir, rememberedIdx: remIdx, reaction: reaction,
      reactionEmoji: reactionEmoji(reaction), reactionLine: pickReactionLine(reaction, rr.rReaction), returnReason: ctx.reason || null
    };

    /* 포스터 */
    var poster = null;
    if (rem) {
      var sticker = ctx.sticker || (rem.kind === 'room' ? (rem.node.sticker || rem.node.id) : 'wild');
      var thumb = (rem.status === 'read' && rem.source && rem.source.thumb && rem.source.thumb.url)
        ? { url: rem.source.thumb.url, w: rem.source.thumb.w || null, h: rem.source.thumb.h || null, license: THUMB_LICENSE } : null;
      poster = {
        type: 'poster', title: rem.name, line: line, sticker: sticker, emoji: rem.emoji,
        scene: rem.kind === 'room' ? (rem.node.scene || rem.corner) : 'wild',
        stickerPos: rr.pos, thumb: thumb, paper: rr.paper, lineKind: lineKind
      };
    }

    /* 변화량 */
    var visitsDelta = {}, affinityDelta = {};
    stops.forEach(function (s) {
      if (s.kind === 'room' || s.kind === 'url') visitsDelta[s.id] = (visitsDelta[s.id] || 0) + 1;
      if (s.kind === 'room') affinityDelta[s.corner] = (affinityDelta[s.corner] || 0) + 1;
      if (s.kind === 'wild') affinityDelta.wild = (affinityDelta.wild || 0) + 1;
    });
    if (rem && rem.kind !== 'url') affinityDelta[rem.corner] = (affinityDelta[rem.corner] || 0) + 2;

    var hintNote = null;
    if (followed === 'ignored') hintNote = IGNORED_NOTE;
    else if (match.kind === 'wiki' && !ctx.intent) hintNote = '지금은 바깥 글을 못 읽어서 힌트는 다음에 찾아볼래';

    return {
      hint: { raw: ctx.hintRaw, match: match, followed: followed, note: hintNote, label: hintLabel || null },
      receipt: receipt, poster: poster, visitsDelta: visitsDelta, affinityDelta: affinityDelta, reaction: reaction,
      remIdx: remIdx, line: line, sticker: poster ? poster.sticker : null
    };
  }

  function peekEvent(s, t) {
    var ev = { type: 'peek', t: t, status: s.status, ms: s.ms, note: s.note || '', first: !!s.first, viaTangent: !!s.viaTangent };
    if (s.kind === 'room') ev.target = { kind: 'room', id: s.id, title: s.name, wiki: s.node.wiki || null };
    else if (s.kind === 'url') ev.target = { kind: 'url', url: s.url, title: s.name };
    else ev.target = { kind: 'wild', title: s.title, wiki: s.title };
    if (s.bridge) ev.bridge = s.bridge;
    if (s.source) ev.source = { url: s.source.url, extract: s.source.extract, thumb: s.source.thumb, license: s.source.license, attribution: s.source.attribution };
    if (s.reason) ev.reason = s.reason;
    return ev;
  }

  /* ───────── 집 / 빈 차례 ───────── */
  function homeActivities(lantern) {
    var W = world();
    var list = (W && Array.isArray(W.homeActivities) && W.homeActivities.length) ? W.homeActivities : DEFAULT_HOME;
    return list.filter(function (a) {
      if (!a || a.id === 'nothing') return false;
      if (typeof a.minLantern === 'number' && lantern < a.minLantern) return false;
      return true;
    });
  }
  function emptyTrip(base) {
    return {
      kind: 'empty', by: base.by, seed: base.seed, dateKey: base.dateKey, seq: base.seq,
      hint: { raw: base.hintRaw, match: matchHint(base.hintRaw), followed: 'none', note: null },
      events: [{ type: 'empty_turn', t: 0 }],
      receipt: null, poster: null, visitsDelta: {}, affinityDelta: {}, affinityDecay: 0.9, reaction: null
    };
  }
  function homeTripFrom(base, act, R) {
    var tWrap = Math.round(lerp(R(), 2000, 4000));
    var pos = drawStickerPos(R);
    var paper = Math.floor(R() * 3);
    var rLine = R();
    var reaction = '졸림';
    var events = [
      { type: 'stay_home', t: 0, activity: act.id, line: act.line, anchor: act.anchor || 'window' },
      { type: 'wrap_up', t: tWrap, reaction: reaction }
    ];
    return {
      kind: 'home', by: base.by, seed: base.seed, dateKey: base.dateKey, seq: base.seq,
      hint: { raw: base.hintRaw, match: matchHint(base.hintRaw), followed: 'none', note: null },
      events: events,
      receipt: {
        stops: [], counts: zeroCounts(), souvenir: null, rememberedIdx: -1, reaction: reaction,
        reactionEmoji: reactionEmoji(reaction), reactionLine: pickReactionLine(reaction, rLine),
        activity: { id: act.id, line: act.line, detail: act.detail || '', anchor: act.anchor || 'window' }
      },
      poster: {
        type: 'note', title: act.title || '오늘은 집', line: act.line, detail: act.detail || '', back: '오늘은 집. 등불 +1',
        sticker: act.sticker || 'home', emoji: act.emoji || '🏠', scene: 'home', stickerPos: pos, thumb: null, paper: paper
      },
      visitsDelta: {}, affinityDelta: {}, affinityDecay: 0.9, reaction: reaction
    };
  }

  /* ───────── 5.2 ───────── */
  function stayProbability(state, hour) {
    var p = 0.12;
    if (hour >= 0 && hour <= 5) p += 0.20;
    var rc = state.recent.slice(-2);
    if (rc.length === 2 && rc.every(function (r) { return r && r.kind === 'out' && (r.nStops || 0) >= 4; })) p += 0.15;
    if ((state.todayOut || 0) >= 2) p += 0.25;
    return Math.min(0.6, p);
  }

  /* ───────── plan ───────── */
  function plan(input) {
    return Promise.resolve().then(function () { return planInner(input || {}); });
  }
  function planInner(input) {
    var W = world();
    if (!W || !W.nodes) throw new Error('BRAIN.plan: WORLD.nodes 가 먼저 로드돼야 해');
    var hintRaw = (input.hint == null ? '' : String(input.hint)).trim();
    var name = input.name || '';
    var now = toDate(input.now);
    var dateKey = input.dateKey || localDateKey(now);
    var seq = input.seq == null ? 1 : input.seq;
    var seed = input.seed == null ? hashSeed(dateKey, hintRaw, seq, name) : (input.seed >>> 0);
    var R = rng(seed);
    var state = normalizeState(input.state);
    var online = input.online !== false;
    var by = input.by || 'demo';
    var fetcher = typeof input.fetchWiki === 'function' ? input.fetchWiki : wikiFetch;
    var timeoutMs = input.fetchTimeoutMs || 4000;
    var hour = now.getHours();
    var base = { by: by, seed: seed, dateKey: dateKey, seq: seq, name: name, hintRaw: hintRaw };

    /* 1. 나갈까 */
    var pStay = stayProbability(state, hour);
    if (R() < pStay) {
      if (R() < 0.03) return emptyTrip(base);
      var acts = homeActivities(state.lantern);
      var ai = pickWeighted(acts, function (a) { return a.weight == null ? 1 : a.weight; }, R());
      return homeTripFrom(base, acts[ai] || DEFAULT_HOME[0], R);
    }

    /* 2. 힌트 · 들판 */
    var rFollow = R();
    var match = matchHint(hintRaw);
    var rWild = R(), rWildIdx = R();
    var wildPlanned = online && rWild < 0.3;
    var hintNode = match.kind === 'node' ? W.nodes[match.nodeId] : null;
    var intent = match.kind === 'node' || (match.kind === 'wiki' && online);
    var follow = intent ? rFollow < 0.75 : false;

    /* 3. 출발 노드 */
    var prefix = [], startId = null, urlNode = null;
    if (match.kind === 'url') {
      prefix.push(makeDoorStop(match.url));
      urlNode = nodeFromUrl(match.url);
      startId = urlNode ? urlNode.id : pickStart(state, R);
    } else if (match.kind === 'node' && follow) {
      startId = match.nodeId;
    } else if (match.kind === 'wiki' && intent && follow) {
      prefix.push(makeWildStop(match.query, { viaTangent: false, fromHint: true }));
      startId = pickStart(state, R);
    } else {
      startId = pickStart(state, R);
    }
    var route = buildRoute(W, state, R, startId, prefix, 5);
    var stops = route.stops;

    /* 4. 미리 뽑아 두는 난수 (fetch 와 무관하게 고정) */
    var msArr = [], gaps = [], i;
    for (i = 0; i < 6; i++) msArr.push(Math.round(lerp(R(), 4000, 14000)));
    for (i = 0; i < 6; i++) gaps.push(Math.round(lerp(R(), 2000, 4000)));
    var gReturn = Math.round(lerp(R(), 2000, 4000));
    var gRemember = Math.round(lerp(R(), 500, 1500));
    var gHang = 500 + Math.round(R() * 300);
    var gWrap = Math.round(lerp(R(), 500, 1000));
    var rr = { rRemember: R(), rSouvenir: R(), rTemplate: R(), rMemory: R(), pos: drawStickerPos(R), paper: Math.floor(R() * 3), rReaction: R() };

    /* 5. 읽기 시도 (동시 2개, 각 4초) */
    var tasks = [];
    stops.forEach(function (s) {
      if (!online) return;
      if (s.kind === 'room' && s.node.wiki && !isNoneNode(s.node)) tasks.push({ stop: s, title: s.node.wiki });
      else if (s.kind === 'wild') tasks.push({ stop: s, title: s.title });
    });
    return runPool(tasks.map(function (t) { return function () { return safeFetch(fetcher, t.title, timeoutMs); }; }), 2)
      .then(function (results) {
        tasks.forEach(function (t, k) { applyFetch(t.stop, results[k], online); });
        stops.forEach(function (s) { if (!s.status) applyFetch(s, null, online); });

        /* 6. 들판 걸음 (후보는 직전 정류장의 링크, 인덱스는 미리 뽑은 r) */
        if (!wildPlanned || stops.length >= 5 || route.reason === 'linger') return null;
        var last = stops[stops.length - 1];
        var links = (last.fetchResult && last.fetchResult.ok && last.fetchResult.links) || [];
        links = links.filter(function (t) {
          return !stops.some(function (s) { return (s.kind === 'wild' && s.title === t) || (s.kind === 'room' && s.node.wiki === t); });
        });
        if (!links.length) return null;
        var title = links[Math.min(links.length - 1, Math.floor(rWildIdx * links.length))];
        return safeFetch(fetcher, title, timeoutMs).then(function (res) {
          if (!res.ok) return null;
          var ws = makeWildStop(title, { viaTangent: true, bridge: '위키 링크를 따라 들판으로' });
          applyFetch(ws, res, online);
          stops.push(ws);
          return ws;
        });
      })
      .then(function () {
        stops.forEach(function (s, k) { s.ms = msArr[Math.min(k, msArr.length - 1)]; });
        var out = assemble({
          stops: stops, match: match, intent: intent, follow: follow, hintNode: hintNode, urlNode: urlNode,
          hintRaw: hintRaw, name: name, hour: hour, reason: route.reason, rr: rr
        });

        /* 7. 이벤트 */
        var t = 0, events = [];
        events.push({ type: 'depart', t: 0, hint: hintRaw, followHint: out.hint.followed === 'followed' || out.hint.followed === 'left', match: match, note: out.hint.note || undefined });
        if (!events[0].note) delete events[0].note;
        stops.forEach(function (s, k) { t += gaps[Math.min(k, gaps.length - 1)]; events.push(peekEvent(s, t)); });
        t += gReturn; events.push({ type: 'return', t: t, reason: route.reason });
        if (out.remIdx >= 0) { t += gRemember; events.push({ type: 'remember', t: t, stopIdx: out.remIdx, sticker: out.sticker, line: out.line }); }
        t += gHang; events.push({ type: 'hang_poster', t: t, posterId: input.id || input.tripId || null });
        t += gWrap; events.push({ type: 'wrap_up', t: t, reaction: out.reaction });

        return {
          kind: 'out', by: by, seed: seed, dateKey: dateKey, seq: seq,
          hint: out.hint, events: events, receipt: out.receipt, poster: out.poster,
          visitsDelta: out.visitsDelta, affinityDelta: out.affinityDelta, affinityDecay: 0.9, reaction: out.reaction
        };
      });
  }

  /* ───────── replay: 사람/MCP 이벤트 배열 → Trip ───────── */
  function replay(events, meta) {
    meta = meta || {};
    var W = world();
    events = (Array.isArray(events) ? events : []).filter(function (e) { return e && typeof e.type === 'string'; })
      .map(function (e) { var c = Object.assign({}, e); c.t = typeof c.t === 'number' ? c.t : 0; return c; });
    var by = meta.by || 'human';
    var seed = meta.seed != null ? (meta.seed >>> 0) : hashSeed('replay', by, JSON.stringify(events));
    var R = rng(seed);
    var state = normalizeState(meta.state);
    var now = toDate(meta.now);
    var hour = now.getHours();
    var depart = events.filter(function (e) { return e.type === 'depart'; })[0] || null;
    var hintRaw = String((depart && depart.hint != null ? depart.hint : meta.hint) || '').trim();
    var base = { by: by, seed: seed, dateKey: meta.dateKey || localDateKey(now), seq: meta.seq == null ? 1 : meta.seq, name: meta.name || '', hintRaw: hintRaw };

    if (events.some(function (e) { return e.type === 'empty_turn'; }) && !events.some(function (e) { return e.type === 'peek'; })) {
      var et = emptyTrip(base); et.events = events; return et;
    }
    var sh = events.filter(function (e) { return e.type === 'stay_home'; })[0];
    if (sh && !events.some(function (e) { return e.type === 'peek'; })) {
      var acts = (W && Array.isArray(W.homeActivities) && W.homeActivities.length) ? W.homeActivities : DEFAULT_HOME;
      var act = acts.filter(function (a) { return a && a.id === sh.activity; })[0]
        || { id: sh.activity || 'custom', line: sh.line || '오늘은 집에 있었어', detail: sh.detail || '', anchor: sh.anchor || 'window' };
      if (sh.line) act = Object.assign({}, act, { line: sh.line });
      var ht = homeTripFrom(base, act, R);
      ht.events = events;
      var wu = events.filter(function (e) { return e.type === 'wrap_up'; })[0];
      if (wu && REACTIONS.indexOf(wu.reaction) >= 0) { ht.reaction = wu.reaction; ht.receipt.reaction = wu.reaction; ht.receipt.reactionEmoji = reactionEmoji(wu.reaction); }
      return ht;
    }

    /* 외출 */
    var stops = events.filter(function (e) { return e.type === 'peek'; }).map(function (ev) {
      var tg = ev.target || {};
      var node = tg.id && W && W.nodes ? W.nodes[tg.id] : null;
      var s;
      if (tg.kind === 'url' || (!node && tg.url)) {
        s = makeDoorStop(tg.url || '');
        if (ev.status && STATUSES.indexOf(ev.status) >= 0) s.status = ev.status;
        if (ev.note) s.note = ev.note;
      } else if (node && tg.id !== 'door_out') {
        s = makeLibStop(node, state, ev.viaTangent, ev.bridge);
        if (isNoneNode(node)) applyFetch(s, null, true);
        else if (ev.status === 'read' && ev.source && ev.source.url) applyFetch(s, { ok: true, title: node.wiki || node.name, extract: ev.source.extract || ev.note || '', url: ev.source.url, thumb: ev.source.thumb || null, links: [] }, true);
        else {
          var st = (ev.status && STATUSES.indexOf(ev.status) >= 0 && ev.status !== 'read') ? ev.status : (node.clue ? 'builtin' : 'failed');
          s.status = st; s.note = ev.note || (st === 'builtin' ? node.clue : st === 'simulated' ? SIMULATED_NOTE : '');
          if (st === 'builtin') s.reason = 'replay';
        }
        if (typeof ev.first === 'boolean') s.first = ev.first;
      } else {
        var title = tg.title || tg.wiki || tg.id || '이름 없는 곳';
        s = makeWildStop(title, { viaTangent: !!ev.viaTangent, bridge: ev.bridge || null });
        if (ev.status === 'read' && ev.source && ev.source.url) applyFetch(s, { ok: true, title: title, extract: ev.source.extract || ev.note || '', url: ev.source.url, thumb: ev.source.thumb || null, links: [] }, true);
        else {
          s.status = (ev.status && STATUSES.indexOf(ev.status) >= 0 && ev.status !== 'read') ? ev.status : 'simulated';
          s.note = ev.note || (s.status === 'simulated' ? '내용은 읽지 않았어' : '');
        }
        if (typeof ev.first === 'boolean') s.first = ev.first;
      }
      s.ms = typeof ev.ms === 'number' ? ev.ms : 0;
      return s;
    });

    var match = matchHint(hintRaw);
    var hintNode = match.kind === 'node' ? W.nodes[match.nodeId] : null;
    var urlNode = match.kind === 'url' ? nodeFromUrl(match.url) : null;
    var intent = match.kind === 'node' || match.kind === 'wiki';
    var follow = false;
    if (match.kind === 'node') follow = !!(stops[0] && stops[0].id === match.nodeId);
    else if (match.kind === 'wiki') follow = !!(stops[0] && stops[0].kind === 'wild' && stops[0].title === match.query);
    if (depart && depart.followHint === false) follow = false;

    var rem = events.filter(function (e) { return e.type === 'remember'; })[0] || null;
    var wrap = events.filter(function (e) { return e.type === 'wrap_up'; })[0] || null;
    var ret = events.filter(function (e) { return e.type === 'return'; })[0] || null;
    var rr = { rRemember: R(), rSouvenir: R(), rTemplate: R(), rMemory: R(), pos: drawStickerPos(R), paper: Math.floor(R() * 3), rReaction: R() };
    var out = assemble({
      stops: stops, match: match, intent: intent, follow: follow, hintNode: hintNode, urlNode: urlNode,
      hintRaw: hintRaw, name: base.name, hour: hour, reason: (ret && ret.reason) || null, rr: rr,
      remIdx: rem && typeof rem.stopIdx === 'number' ? rem.stopIdx : undefined,
      line: rem && rem.line ? String(rem.line) : null, sticker: rem && rem.sticker ? String(rem.sticker) : null,
      reaction: wrap && wrap.reaction
    });
    return {
      kind: 'out', by: by, seed: seed, dateKey: base.dateKey, seq: base.seq,
      hint: out.hint, events: events, receipt: out.receipt, poster: out.poster,
      visitsDelta: out.visitsDelta, affinityDelta: out.affinityDelta, affinityDecay: 0.9, reaction: out.reaction
    };
  }

  /* ───────── 공개 ───────── */
  BRAIN.hashSeed = hashSeed;
  BRAIN.rng = rng;
  BRAIN.tokenize = tokenize;
  BRAIN.matchHint = matchHint;
  BRAIN.nodeFromUrl = nodeFromUrl;
  BRAIN.wikiFetch = wikiFetch;
  BRAIN.parseWikiResponse = parseWikiResponse;
  BRAIN.filterLinkTitle = filterLinkTitle;
  BRAIN.plan = plan;
  BRAIN.replay = replay;
  BRAIN.composeLine = composeLine;
  BRAIN.pickStart = pickStart;
  BRAIN.stayProbability = stayProbability;
  BRAIN.computeReaction = computeReaction;
  BRAIN.localDateKey = localDateKey;
  BRAIN.setWorld = function (w) { BRAIN._world = w || null; };
  BRAIN.STATUSES = STATUSES.slice();
  BRAIN.REACTIONS = REACTIONS.slice();

  root.BRAIN = BRAIN;
  if (typeof module !== 'undefined' && module.exports) module.exports = BRAIN;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
