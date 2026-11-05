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
    leftKept: ['{hint} 보러 갔다가 딴 데도 들렀는데, 결국 머리에 남은 건 {hint}', '{hint}에서 시작해 한눈도 팔았지만, 기억에 남은 건 {hint}. {memory}'],
    noHint: ['오늘은 {mem}. {memory}', '발길 닿는 대로 가다 {mem}에 오래 있었어'],
    ignored: ['{hint} 보는 건 다음에. 오늘은 {mem} 쪽이 궁금했어', '{hint} 말고 {mem} 쪽이 끌렸어. {memory}'],
    linger: ['느린 글의 방에 앉아만 있었어. 아무것도 안 읽어도 됐어'],
    door: ['{hint} 문 앞까지 갔다 왔어. 바깥은 못 읽었지만'],
    letter: ['편지의 방 문을 열어 봤어. 아직 비어 있었어'],
    failed: ['{mem} 문은 오늘 안 열렸어. 이름만 기억해 둘래', '{mem}는 못 읽었어. 다음에 다시 가 볼래'],
    wild: ['들판에서 만난 건 {mem}. {memory}', '링크를 따라가다 {mem}에 닿았어']
  };

  var DEFAULT_HOME = [
    { id: 'count_rain', line: '창가에서 빗방울을 세다가 잠들었어', detail: '마흔까지 세고 잊었어. 다시 하나부터.', anchor: 'window', weight: 3, emoji: '🌧' },
    { id: 'reread_poster', line: '어제 포스터 뒷면을 다시 읽었어', detail: '영수증 글씨가 조금 번져 있었어.', anchor: 'crate', weight: 2, emoji: '🧾', minLantern: 1, requiresPoster: true },
    { id: 'nap', line: '담요 속에서 낮잠', detail: '빗소리가 이불 같았어.', anchor: 'blanket', weight: 3, emoji: '😴' },
    { id: 'swap_posters', line: '포스터 위치를 바꿔 봤어', detail: '왼쪽 걸 오른쪽으로. 그게 다야.', anchor: 'board', weight: 1, emoji: '🖼', minLantern: 2, requiresPoster: true, effect: 'rotatePosters' },
    { id: 'watch_moss', line: '이끼 화분을 오래 들여다봤어', detail: '어제보다 조금 더 초록인 것 같아.', anchor: 'window', weight: 2, emoji: '🪴', minLantern: 1 },
    { id: 'nothing', line: '…', detail: '', anchor: 'blanket', weight: 0, emoji: '' }
  ];

  /* §17.1 그때 남긴 메모. 조사 없는 꼴만 쓴다({mem}에 · {next} 쪽으로). 각 60자 이하. 명령문·자격 기준 언급 없음 */
  var MEMO_MAX = 60;
  var DEFAULT_MEMO = {
    lead: {
      followedThenLeft: ['{hint} 보다가 {mem}에 꽂혔어', '{hint}에서 시작했는데 {mem}에 오래 있었어'],
      followedKept: ['{hint} 앞에 오래 있었어', '오늘은 {hint} 하나만 봤어'],
      leftKept: ['한눈은 팔았는데 머리에 남은 건 {hint}'],
      noHint: ['{mem}에 오래 있었어', '발길 닿는 대로 가다 {mem}까지 갔어'],
      ignored: ['{hint} 대신 {mem} 쪽에 갔어'],
      wild: ['길을 벗어나 {mem}까지 갔어'],
      linger: ['느린 글의 방에 앉아만 있었어'],
      letter: ['편지의 방은 아직 비어 있었어'],
      door: ['{hint} 문 앞까지만 갔어'],
      failed: ['{mem} 문이 안 열렸어']
    },
    next: {
      '폴짝': ['내일은 {next} 쪽으로 가 볼까', '내일은 {next} 쪽도 들여다볼까'],
      '우쭐': ['내일은 {next} 쪽으로 더 가 볼까'],
      '덤덤': ['내일은 {next} 쪽으로 가 볼까 말까'],
      '졸림': ['내일은 {next} 쪽으로 천천히 가 볼까']
    },
    nextNone: ['내일은 어디로 갈지 자고 나서 정할래'],
    home: ['내일은 나가 볼까 말까', '내일은 밖에 나가 볼까'],
    revisit: '{hint}? 그거 {n}일 전에 봤잖아. 이번엔 안쪽까지 가 볼게',
    revisitToday: '{hint}? 그거 아까 봤잖아. 이번엔 안쪽까지 가 볼게',
    revisitUndated: '{hint}? 그거 전에 봤잖아. 이번엔 안쪽까지 가 볼게'
  };

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
      todayOut: s.todayOut == null ? 0 : s.todayOut,
      lastVisit: (s.lastVisit && typeof s.lastVisit === 'object') ? s.lastVisit : {},
      /* 벽에 붙은 포스터 수. 안 주면 0 — 없는 포스터를 다시 읽었다고 말하지 않게 */
      posters: (typeof s.posters === 'number' && s.posters > 0 && isFinite(s.posters)) ? Math.floor(s.posters) : 0
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
    var parts = (t.match(/[^.!?。]+[.!?。]*/g) || [t]).map(function (x) { return x.trim(); }).filter(Boolean);
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
  /* 받침에 맞는 조사. 한글로 끝나지 않으면 템플릿에 적힌 조사를 그대로 둔다. */
  var JOSA = { '은': ['은', '는'], '는': ['은', '는'], '이': ['이', '가'], '가': ['이', '가'], '을': ['을', '를'], '를': ['을', '를'], '과': ['과', '와'], '와': ['과', '와'], '으로': ['으로', '로'], '로': ['으로', '로'] };
  function josa(word, particle) {
    var pair = JOSA[particle];
    if (!pair || !word) return particle;
    var code = word.charCodeAt(word.length - 1);
    if (code < 0xAC00 || code > 0xD7A3) return particle;
    var jong = (code - 0xAC00) % 28;
    if (particle === '로' || particle === '으로') return (jong === 0 || jong === 8) ? '로' : '으로';
    return jong === 0 ? pair[1] : pair[0];
  }

  /* ───────── 5.3 힌트 읽기 ───────── */
  var HINT_SEP = /[\s,.·…!?\/()\[\]"'“”‘’:;]+/;
  /* 한 글자 이름(비·눈·별·꿈·차…)이 조사와 붙으면 흔한 다른 낱말이 되는 꼴 — 이건 이름으로 치지 않는다 */
  var ONE_SYLLABLE_SKIP = { '종이': 1, '별로': 1, '실로': 1, '실은': 1, '차도': 1, '종로': 1 };
  /* 띄어 쓴 낱말 그대로 + (한 글자 + 받침에 맞는 조사) 에서 조사를 뗀 한 글자. tokenize 는 2자 이상만 남긴다 */
  function hintWords(hint) {
    var out = [];
    String(hint || '').split(HINT_SEP).forEach(function (w) {
      w = lower(w.trim());
      if (!w) return;
      out.push(w);
      if (ONE_SYLLABLE_SKIP[w]) return;
      for (var i = 0; i < PARTICLES.length; i++) {
        var p = PARTICLES[i];
        if (w.length === p.length + 1 && w.slice(-p.length) === p) {
          var stem = w.charAt(0);
          if (!JOSA[p] || josa(stem, p) === p) out.push(stem);
          break;
        }
      }
    });
    return out;
  }
  /* hay 안에 s 가 낱말로 들어 있나 (힌트 글·URL 공용, 둘 다 소문자). 0 = 아님, 2 = 낱말 첫머리, 1 = 낱말 끝(머리말).
     - 영문만인 s: 앞뒤가 영문이 아닐 때만 (linkedin 안의 ink, rainbow 안의 rain 은 아니다)
     - 그 밖(한글 등), 낱말 첫머리: 붙은 나머지에서 조사를 떼고 없거나·두 글자 이상일 때만
       ('노트북을'의 노트, '에코백'의 에코는 아니다. '구름사진을'의 구름, '모자가게'의 모자는 맞다)
     - 낱말 끝: 한국어 합성어는 끝이 머리말이라 '털모자'·'빨간모자'는 모자다. 뒤에는 조사만. 덜 확실하니 따로(1) 알린다
       ('코스모스'처럼 끝이 우연히 같은 낱말은 NOT_HEAD 로 뺀다) */
  var WORD_CH = /[a-z0-9가-힣]/;
  var HANGUL_ONLY = /^[가-힣]+$/;
  var TAIL_OK = ['들', '만', '랑', '야', '요'];   /* 조사 말고도 흔히 붙는 한 글자: 모자들 · 모자만 · 모자랑 · 모자야 */
  var NOT_HEAD = { '코스모스': 1, '중심지': 1, '도심지': 1, '해수면': 1, '극소수': 1, '선글라스': 1 };
  /* 끝의 조사 하나를 뗀다. 받침에 맞는 조사만 ('북을' → 북, '사이' 는 사+이 가 아니라 그대로) */
  function stripParticle(rest) {
    for (var i = 0; i < PARTICLES.length; i++) {
      var p = PARTICLES[i];
      if (rest.length > p.length && rest.slice(-p.length) === p) {
        var stem = rest.slice(0, -p.length);
        if (!JOSA[p] || josa(stem, p) === p) return stem;
        return rest;
      }
    }
    return rest;
  }
  function bareTail(rest) { return !rest || PARTICLES.indexOf(rest) >= 0 || TAIL_OK.indexOf(rest) >= 0 || TAIL_OK.indexOf(stripParticle(rest)) >= 0; }
  function containsWord(hay, s) {
    if (!s) return 0;
    if (/^[a-z ]+$/.test(s)) return new RegExp('(^|[^a-z])' + s + '([^a-z]|$)').test(hay) ? 2 : 0;
    var found = 0;
    for (var i = hay.indexOf(s); i >= 0; i = hay.indexOf(s, i + 1)) {
      var a = i;
      while (a > 0 && WORD_CH.test(hay.charAt(a - 1))) a--;
      var j = i + s.length, k = j;
      while (k < hay.length && WORD_CH.test(hay.charAt(k))) k++;
      var rest = hay.slice(j, k);
      if (a === i) {
        if (bareTail(rest) || stripParticle(rest).length >= 2) return 2;
      } else if (!found && bareTail(rest) && HANGUL_ONLY.test(hay.slice(a, i)) && !NOT_HEAD[hay.slice(a, j)]) {
        found = 1;
      }
    }
    return found;
  }

  function tokenize(hint) {
    var out = [];
    String(hint || '').split(HINT_SEP).forEach(function (tok) {
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
    var words = hintWords(raw);
    var ids = Object.keys(W.nodes);
    var best = null;
    function offer(id, how, score) {
      if (!best || score > best.score) best = { nodeId: id, how: how, score: score };
    }
    function termsOf(node) {
      return { name: lower(node.name), al: (node.aliases || []).map(lower).filter(Boolean), kw: (node.keywords || []).map(lower).filter(Boolean) };
    }
    /* 다른 방의 띄어 쓴 별칭·키워드('눈 움직임' → 꿈, '비 온 뒤' → 무지개)가 힌트에 그대로 있으면,
       그 안의 한 글자 낱말은 한 글자 방 이름으로 치지 않는다 */
    var phrases = [];
    ids.forEach(function (id) {
      var node = W.nodes[id];
      if (!node || id === 'door_out') return;
      var t = termsOf(node);
      [t.name].concat(t.al, t.kw).forEach(function (p) { if (/\s/.test(p) && containsWord(low, p)) phrases.push({ id: id, p: p }); });
    });
    function wordsOutsidePhrases(id) {
      var h = low;
      phrases.forEach(function (x) { if (x.id !== id) h = h.split(x.p).join(' '); });
      return h === low ? words : hintWords(h);
    }
    /* 같은 단계에서는 별칭(aliases)이 키워드(keywords)보다 앞선다: 먹물은 잉크의 별칭, 문어의 키워드.
       낱말 끝에 붙은 이름·별칭('털모자'·'아기모자'의 모자)은 합성어의 머리말이라 같은 종류의 첫머리 매칭 바로 아래 (250/180).
       키워드는 낱말 끝 매칭을 하지 않는다 */
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i], node = W.nodes[id];
      if (!node || id === 'door_out') continue;
      var tm = termsOf(node), name = tm.name, al = tm.al, kw = tm.kw;
      if (name && name === low) return { kind: 'node', nodeId: id, how: 'exact' };
      var j, cw;
      for (j = 0; j < al.length; j++) if (al[j] === low) offer(id, 'alias', 1000 + al[j].length);
      for (j = 0; j < kw.length; j++) if (kw[j] === low) offer(id, 'alias', 900 + kw[j].length);
      if (name && tokens.indexOf(name) >= 0) offer(id, 'token', 500 + name.length);
      if (name && name.length === 1 && wordsOutsidePhrases(id).indexOf(name) >= 0) offer(id, 'token', 500 + name.length);   /* '비 오는 날' → 비 */
      for (j = 0; j < al.length; j++) if (tokens.indexOf(al[j]) >= 0) offer(id, 'alias', 400 + al[j].length);
      for (j = 0; j < kw.length; j++) if (tokens.indexOf(kw[j]) >= 0) offer(id, 'alias', 350 + kw[j].length);
      if (name && name.length >= 2 && (cw = containsWord(low, name))) offer(id, 'token', (cw === 2 ? 300 : 250) + name.length);
      for (j = 0; j < al.length; j++) if (al[j].length >= 2 && (cw = containsWord(low, al[j]))) offer(id, 'alias', (cw === 2 ? 200 : 180) + al[j].length);
      for (j = 0; j < kw.length; j++) if (kw[j].length >= 2 && containsWord(low, kw[j]) === 2) offer(id, 'alias', 150 + kw[j].length);
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
      var kws = (node.keywords || []).map(lower);
      var cands = [node.name, id.replace(/_/g, ' ')].concat(node.aliases || [], node.keywords || [], node.wiki ? [node.wiki] : []);
      cands.forEach(function (c) {
        c = lower(c);
        if (c.length < 2) return;
        var cw = containsWord(low, c);
        var isKw = kws.indexOf(c) >= 0;
        if (!cw || (cw === 1 && isKw)) return;   /* 낱말 끝 매칭('털모자')은 이름·별칭만 */
        /* 힌트 글과 같은 순서: 이름·별칭 첫머리 > 이름·별칭 낱말 끝(합성어 머리말, '아기모자'의 모자) > 키워드 첫머리. 같은 단계면 긴 쪽 */
        var score = c.length + (cw === 1 ? 150 : isKw ? 100 : 200);
        if (!best || score > best.len) best = { id: id, len: score };
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

  /* 재생 입력이 준 출처는 이 꼴일 때만 믿는다: 위키백과(한국어) 문서 · 위키미디어 공용 사진 (https 만) */
  function isWikiPageUrl(u) { return typeof u === 'string' && /^https:\/\/ko\.wikipedia\.org\/wiki\/\S+$/.test(u); }
  function safeThumb(t) {
    if (!t || typeof t !== 'object' || typeof t.url !== 'string' || !/^https:\/\/upload\.wikimedia\.org\/\S+$/.test(t.url)) return null;
    return { url: t.url, w: (typeof t.w === 'number' && isFinite(t.w)) ? t.w : null, h: (typeof t.h === 'number' && isFinite(t.h)) ? t.h : null };
  }
  /* 재생의 '읽음'을 fetch 결과 꼴로 (출처 주소는 isWikiPageUrl 를 통과한 것만 들어온다). 라이선스·출처 표기는 입력이 아니라 두뇌가 붙인다 */
  function replayRead(title, src, note) {
    return { ok: true, title: title, extract: String(src.extract || note || '').slice(0, 160), url: src.url, thumb: safeThumb(src.thumb), links: [] };
  }

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
  /* 들판(❔)은 방문 기록(visits)에 남지 않아 '처음'인지 알 수 없다 → first:false. 폴짝은 실제로 읽은 들판 걸음일 때만 */
  function makeWildStop(title, opt) {
    opt = opt || {};
    return {
      kind: 'wild', node: null, id: null, title: title, name: title, emoji: '❔', corner: 'wild', first: false,
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
  /* 선호 코너 60% / 아무 코너 30% / 엉뚱한 방 10%. 노드 가중 1/(1+visits)
     avoid: 이번엔 안 가기로 한 방(무시한 힌트 방). 후보에서만 빼고 난수 뽑는 자리는 그대로 */
  function pickStart(state, R, avoid) {
    var W = world();
    state = normalizeState(state);
    var corners = eligibleCorners(W);
    function keep(id) { return id !== avoid; }
    var all = Object.keys(W.nodes).filter(function (id) { return !SPECIAL[id] && W.nodes[id].corner !== 'wild' && keep(id); });
    var r = R();
    var pool = null;
    function weight(id) { return 1 / (1 + (state.visits[id] || 0)); }
    if (r < 0.6) {
      var top = null, topV = 0;
      corners.forEach(function (c) { var v = state.affinity[c] || 0; if (v > topV) { topV = v; top = c; } });
      if (top) pool = nodesIn(W, top).filter(keep);
    } else if (r >= 0.9) {
      pool = all.filter(function (id) { return W.nodes[id].odd; });
    }
    if (!pool || !pool.length) {
      if (corners.length) {
        var ci = Math.floor(R() * corners.length);
        pool = nodesIn(W, corners[ci]).filter(keep);
      }
      if (!pool || !pool.length) pool = all;
    }
    if (!pool.length) return null;
    var pi = pickWeighted(pool, weight, R());
    return pool[pi];
  }
  /* opt.deeper (§17.1 재방문): 같은 힌트 방에 또 왔다 → 한 단계 더 깊게.
     정류장 최소 3개(보통 2개), 처음 걸음들은 아직 안 가 본 related 이웃(없으면 안 가 본 tangents)을 먼저 고른다.
     난수는 보통 길과 같은 자리에서 뽑는다(쓰지 않을 때도) — 결정성만 지키면 되므로 */
  function buildRoute(W, state, R, startId, prefix, maxStops, opt) {
    opt = opt || {};
    var stops = prefix.slice(), used = {}, i;
    for (i = 0; i < stops.length; i++) if (stops[i].id) used[stops[i].id] = true;
    if (opt.avoid) used[opt.avoid] = true;   /* 무시한 힌트 방으로는 샛길로도 들어가지 않는다 */
    var minStops = opt.deeper ? 3 : 2;   /* 보통 길과 똑같이: 2 (앞의 문/들판 정류장 포함) */
    var cur = W.nodes[startId];
    var pDistract = 0.40, reason = 'enough', ladder = [0.25, 0.45, 0.7, 1.0];
    var via = false, bridge = null, guard = 0;
    function unseen(p) { return !((state.visits && state.visits[p.node.id]) > 0) && !p.node.linger && p.node.id !== 'letter_room'; }
    while (cur && guard++ < 12) {
      stops.push(makeLibStop(cur, state, via, bridge));
      used[cur.id] = true;
      if (stops.length >= minStops && cur.linger) { reason = 'linger'; break; }
      if (stops.length >= 2) {
        var rRet = R();
        if (stops.length >= minStops && rRet < ladder[Math.min(stops.length - minStops, ladder.length - 1)]) { reason = stops.length >= 4 ? 'tired' : 'enough'; break; }
      }
      if (stops.length >= maxStops) { reason = 'tired'; break; }
      var distract = R() < pDistract;
      var tang = (cur.tangents || []).filter(function (t) { return t && W.nodes[t.to] && !used[t.to] && t.to !== 'door_out'; })
        .map(function (t) { return { node: W.nodes[t.to], bridge: t.bridge || null, via: true }; });
      var rel = (cur.related || []).filter(function (id) { return W.nodes[id] && !used[id] && id !== 'door_out'; })
        .map(function (id) { return { node: W.nodes[id], bridge: null, via: false }; });
      var pool = null;
      if (opt.deeper && stops.length < minStops) {
        var freshRel = rel.filter(unseen), freshTang = tang.filter(unseen);
        pool = freshRel.length ? freshRel : freshTang.length ? freshTang : null;
        if (!pool) { var keep = rel.concat(tang).filter(function (p) { return !p.node.linger; }); if (keep.length) pool = keep; }
      }
      if (pool) { /* 깊게 고른 자리 */ }
      else if (distract && tang.length) pool = tang;
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
  /* {key}(조사)? 치환 + 남은 { } 제거 + 공백 정리 */
  function fillTemplate(tpl, map) {
    var line = String(tpl || '').replace(/\{(\w+)\}(은|는|이|가|을|를|과|와|으로|로)?/g, function (_, key, particle) {
      var v = map[key];
      v = v == null ? '' : String(v);
      return v + (particle ? josa(v, particle) : '');
    });
    return line.replace(/\{[^}]*\}/g, '').replace(/\s+/g, ' ').replace(/\s+([.,!?…])/g, '$1').replace(/^[.,\s]+/, '').trim();
  }
  function composeLine(kind, ctx, r) {
    ctx = ctx || {};
    var list = templatesFor(kind);
    var idx = Math.min(list.length - 1, Math.floor(asR(r) * list.length));
    return fillTemplate(list[idx], { hint: ctx.hint, mem: ctx.mem, memory: ctx.memory, name: ctx.name });
  }
  function pickMemory(node, r) {
    if (!node || !Array.isArray(node.memories) || !node.memories.length) return '';
    return String(node.memories[Math.min(node.memories.length - 1, Math.floor(asR(r) * node.memories.length))]);
  }
  function drawStickerPos(R) {
    return { x: Math.round(lerp(R(), 58, 82)), y: Math.round(lerp(R(), 18, 40)), rot: Math.round(lerp(R(), -14, 14)) };
  }
  /* 반응 한 줄. lines = 언제 말해도 참인 줄. when.first/missed/long = 그 일이 실제로 있었을 때만 후보에 더한다.
     facts: first(처음 온 방이 있음) · missed(못 읽음·모의가 있음) · long(정류장 4곳 이상). 집에 있는 날은 facts 없음 → lines 만 */
  function pickReactionLine(reaction, r, facts) {
    var W = world();
    var rec = W && W.reactions && W.reactions[reaction];
    if (!rec) return null;
    facts = facts || {};
    var when = (rec.when && typeof rec.when === 'object') ? rec.when : {};
    var list = [];
    ['first', 'missed', 'long'].forEach(function (k) { if (facts[k] && Array.isArray(when[k])) list = list.concat(when[k]); });
    if (Array.isArray(rec.lines)) list = list.concat(rec.lines);
    if (!list.length) return null;
    return String(list[Math.min(list.length - 1, Math.floor(asR(r) * list.length))]);
  }
  function reactionFacts(stops, counts) {
    return {
      first: stops.some(function (s) { return s.first; }),
      missed: ((counts.failed || 0) + (counts.simulated || 0)) > 0,
      long: stops.length >= 4
    };
  }
  function reactionEmoji(reaction) {
    var W = world();
    var rec = W && W.reactions && W.reactions[reaction];
    return (rec && rec.emoji) || { '폴짝': '🎉', '우쭐': '😌', '졸림': '😴', '덤덤': '😶' }[reaction] || '😶';
  }

  /* ───────── 5.9 반응 ───────── */
  function jumpy(stops) {   /* 폴짝할 일이 실제로 있었나: 처음 온 방, 또는 실제로 읽은 들판 걸음 */
    return stops.some(function (s) { return s.first || (s.kind === 'wild' && s.status === 'read'); });
  }
  function proud(stops, followed) {   /* 우쭐할 일: 힌트를 따라가 전부 읽음 */
    return followed === 'followed' && stops.length > 0 && stops.every(function (s) { return s.status === 'read'; });
  }
  function computeReaction(stops, followed, hour, isHome) {
    if (isHome) return '졸림';
    if (jumpy(stops)) return '폴짝';
    if (proud(stops, followed)) return '우쭐';
    if (stops.length >= 4 || hour >= 23 || hour <= 5) return '졸림';
    return '덤덤';
  }
  /* 사람/모델이 고른 반응이 실제로 있었던 일과 맞나. 졸림·덤덤은 아무것도 주장하지 않으니 늘 괜찮다 */
  function reactionFits(reaction, stops, followed) {
    if (reaction === '폴짝') return jumpy(stops);
    if (reaction === '우쭐') return proud(stops, followed);
    return true;
  }

  /* ───────── 힌트 따랐나 ───────── */
  /* 문서 제목 비교용 열쇠: 소문자, 끝의 '(…)' 꼬리·띄어쓰기·밑줄 없이 ('눈 (날씨)' = '눈') */
  function titleKey(t) { return lower(t).replace(/\s*\([^)]*\)\s*$/, '').replace(/[\s_]+/g, ''); }
  /* 힌트가 가리키는 글 제목들: 노드면 이름·위키 제목·별칭(+힌트 글 그대로), 위키 힌트면 그 글 */
  function hintTitleKeys(match, hintNode, hintRaw) {
    var out = [];
    if (match && match.kind === 'node' && hintNode) out = [hintNode.name, hintNode.wiki, hintRaw].concat(hintNode.aliases || []);
    else if (match && match.kind === 'wiki') out = [match.query, hintRaw];
    return out.filter(function (x) { return typeof x === 'string' && x.trim(); }).map(titleKey);
  }
  function computeFollowed(match, intent, follow, stops, hintNode, urlNode, hintRaw) {
    if (!match || match.kind === 'none') return 'none';
    if (match.kind === 'url') {
      var lib = stops.filter(function (s) { return s.kind === 'room'; });
      if (urlNode && lib.length && lib.every(function (s) { return s.corner === urlNode.corner; })) return 'followed';
      return 'left';
    }
    if (!intent) return 'none';
    /* 따르지 않았는데 길에 힌트 방(또는 힌트와 같은 제목의 들판 글)이 있다 → '무시함'이라 하면 "모자 말고 모자"가 된다 */
    var keys = follow ? [] : hintTitleKeys(match, hintNode, hintRaw);
    if (!follow && stops.some(function (s) {
      return (match.kind === 'node' && hintNode && s.id === hintNode.id) || (s.kind === 'wild' && keys.indexOf(titleKey(s.title)) >= 0);
    })) return 'left';
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
        if (s.status === 'none' || s.status === 'simulated' || s.status === 'failed') w *= 0.5;
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

    var followed = computeFollowed(match, ctx.intent, ctx.follow, stops, ctx.hintNode, ctx.urlNode, ctx.hintRaw);

    /* 한 줄 */
    var line = ctx.line || null, lineKind = null;
    if (rem) {
      var memory = '';
      if (rem.kind === 'room') memory = pickMemory(rem.node, rr.rMemory);
      if (!memory && rem.status === 'read' && rem.source) memory = sentences(rem.source.extract, 60);
      if (rem.status === 'failed') lineKind = 'failed';
      else if (rem.kind === 'room' && rem.node.linger) lineKind = 'linger';
      else if (rem.kind === 'room' && rem.node.id === 'letter_room') lineKind = 'letter';
      else if (rem.kind === 'url') lineKind = 'door';
      else if (ctx.intent && ctx.follow) {
        var leftCorner = stops.length > 1 && stops.some(function (s) { return s.corner !== stops[0].corner; });
        lineKind = remIdx === hintStopIdx ? (leftCorner ? 'leftKept' : 'followedKept') : 'followedThenLeft';
      }
      else if (ctx.intent && !ctx.follow && followed === 'ignored') lineKind = 'ignored';
      else if (rem.kind === 'wild' && !ctx.intent) lineKind = 'wild';
      else lineKind = 'noHint';
      if (!line) line = composeLine(lineKind, { hint: hintLabel, mem: rem.name, memory: memory, name: ctx.name }, rr.rTemplate);
    }

    /* 반응: 재생 입력이 고른 반응도 실제로 있었던 일과 맞을 때만 (안 읽었는데 우쭐, 처음 온 데 없는데 폴짝은 안 된다) */
    var reaction = (ctx.reaction && REACTIONS.indexOf(ctx.reaction) >= 0 && reactionFits(ctx.reaction, stops, followed))
      ? ctx.reaction : computeReaction(stops, followed, ctx.hour, false);

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
      reactionEmoji: reactionEmoji(reaction), reactionLine: pickReactionLine(reaction, rr.rReaction, reactionFacts(stops, counts)), returnReason: ctx.reason || null
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
    if (s.aside) ev.aside = s.aside;
    return ev;
  }

  /* ───────── §17.1 메모 (그때 남긴 한 줄 · 방마다 한 줄) ───────── */
  function memoTpl() {
    var W = world(), m = (W && W.memoTemplates) || {};
    var d = DEFAULT_MEMO;
    return {
      lead: Object.assign({}, d.lead, m.lead || {}), next: Object.assign({}, d.next, m.next || {}),
      nextNone: (Array.isArray(m.nextNone) && m.nextNone.length) ? m.nextNone : d.nextNone,
      home: (Array.isArray(m.home) && m.home.length) ? m.home : d.home,
      revisit: m.revisit || d.revisit, revisitToday: m.revisitToday || d.revisitToday, revisitUndated: m.revisitUndated || d.revisitUndated
    };
  }
  function pickStr(list, r) { list = Array.isArray(list) && list.length ? list : ['']; return String(list[Math.min(list.length - 1, Math.floor(asR(r) * list.length))]); }
  /* 60자 넘으면 마침표 앞까지, 그래도 길면 59자 + … */
  function clampText(t, max) {
    t = String(t == null ? '' : t).replace(/\s+/g, ' ').trim();
    max = max || MEMO_MAX;
    if (t.length <= max) return t;
    return t.slice(0, max - 1).replace(/[\s.,]+$/, '') + '…';
  }
  function joinFit(parts, max) {   /* 앞에서부터 '. ' 로 잇되 max 를 넘으면 그 조각은 뺀다 */
    var out = '';
    parts.forEach(function (p) { if (!p) return; var c = out ? out + '. ' + p : p; if (c.length <= max) out = c; });
    return out || clampText(parts.filter(Boolean)[0] || '', max);
  }
  function daysBetween(a, b) {
    var ma = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(a || '')), mb = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(b || ''));
    if (!ma || !mb) return null;
    var da = Date.UTC(+ma[1], +ma[2] - 1, +ma[3]), db = Date.UTC(+mb[1], +mb[2] - 1, +mb[3]);
    return Math.round((db - da) / 86400000);
  }
  function revisitAside(name, lastDate, dateKey) {
    var T = memoTpl(), n = daysBetween(lastDate, dateKey);
    var tpl = n == null || n < 0 ? T.revisitUndated : n === 0 ? T.revisitToday : T.revisit;
    return clampText(fillTemplate(tpl, { hint: name, n: n }), MEMO_MAX);
  }
  /* 방마다 한 줄: 그 방의 기억 조각(문어 말투) → 없으면 실제로 읽은 요약(read) → 없으면 실마리. 지어내지 않는다 */
  function roomNote(s, R) {
    var t = s.node ? pickMemory(s.node, R) : '';
    if (!t && s.status === 'read' && s.source && s.source.extract) t = sentences(s.source.extract, MEMO_MAX);
    if (!t && s.node && s.node.clue) t = sentences(s.node.clue, MEMO_MAX);
    return clampText(t, MEMO_MAX);
  }
  /* 다음 걸음 의도: 기억한 방(없으면 마지막 방)의 이웃 중 이번에 안 간 곳, 덜 밟힌 쪽 가중 */
  function nextIntent(W, stops, rem, state, r) {
    var from = (rem && rem.kind === 'room') ? rem.node : null;
    if (!from) { for (var i = stops.length - 1; i >= 0 && !from; i--) if (stops[i].kind === 'room' && stops[i].node) from = stops[i].node; }
    if (!from) return null;
    var seen = {}; stops.forEach(function (s) { if (s.id) seen[s.id] = 1; });
    var ids = (from.tangents || []).map(function (t) { return t && t.to; }).concat(from.related || []);
    var cands = [];
    ids.forEach(function (id) { if (id && W.nodes[id] && !SPECIAL[id] && !seen[id] && W.nodes[id].corner !== 'wild' && cands.indexOf(id) < 0) cands.push(id); });
    if (!cands.length) return null;
    var pi = pickWeighted(cands, function (id) { return 1 / (1 + ((state.visits && state.visits[id]) || 0)); }, r);
    return W.nodes[cands[pi]];
  }
  function buildOutMemo(stops, out, state, R) {
    var W = world(), T = memoTpl();
    var rem = out.remIdx >= 0 ? stops[out.remIdx] : null;
    var kind = (out.poster && out.poster.lineKind) || 'noHint';
    var rLead = R(), rNext = R(), rIntent = R();
    var lead = rem ? fillTemplate(pickStr(T.lead[kind] || T.lead.noHint, rLead), { hint: out.hint.label || '', mem: rem.name }) : '';
    var nx = nextIntent(W, stops, rem, state, rIntent);
    var next = nx ? fillTemplate(pickStr(T.next[out.reaction] || T.next['덤덤'], rNext), { next: nx.name }) : pickStr(T.nextNone, rNext);
    var notes = {};
    stops.forEach(function (s) {
      if (s.kind !== 'room' || !s.node || s.id === 'door_out' || notes[s.id]) return;
      var t = roomNote(s, R);
      if (t) notes[s.id] = t;
    });
    var tomorrow = joinFit([lead, next], MEMO_MAX);
    if (!tomorrow) return null;
    return { tomorrow: tomorrow, notes: notes };
  }
  function buildHomeMemo(act, R) {
    var T = memoTpl();
    var did = act.memo || String(act.line || '').replace(/[.…\s]+$/, '');
    if (!did || did === '…') return null;
    return { tomorrow: joinFit([did, pickStr(T.home, R())], MEMO_MAX), notes: {} };
  }
  /* 모델·사람이 준 메모(wrap_up.memo)를 정리: 문자열만, 각 60자, 빈 건 버림 */
  function cleanMemo(m) {
    if (!m || typeof m !== 'object') return null;
    var tomorrow = typeof m.tomorrow === 'string' ? clampText(m.tomorrow, MEMO_MAX) : '';
    var notes = {};
    if (m.notes && typeof m.notes === 'object') Object.keys(m.notes).forEach(function (k) {
      var v = m.notes[k];
      if (typeof v === 'string' && v.trim() && /^[\w-]{1,64}$/.test(k)) notes[k] = clampText(v, MEMO_MAX);
    });
    if (!tomorrow && !Object.keys(notes).length) return null;
    return { tomorrow: tomorrow, notes: notes };
  }
  function memoRng(seed) { return rng(((seed >>> 0) ^ 0x6d656d6f) >>> 0); }   /* 'memo' — 길·기억의 난수 순서를 건드리지 않는 별도 줄기 */

  /* ───────── 집 / 빈 차례 ───────── */
  /* 방에 실제로 있는 것만 한다: 등불이 모자라면(이끼 화분 등) 빼고, 포스터가 없으면 포스터 활동을 뺀다.
     자리 바꾸기(effect:'rotatePosters')는 바꿀 짝이 있어야 하니 2장부터. world.js 는 requiresLantern, 옛 데이터는 minLantern */
  function homeActivities(lantern, posters) {
    var W = world();
    var list = (W && Array.isArray(W.homeActivities) && W.homeActivities.length) ? W.homeActivities : DEFAULT_HOME;
    lantern = lantern || 0; posters = posters || 0;
    return list.filter(function (a) {
      if (!a || a.id === 'nothing') return false;
      if (typeof a.minLantern === 'number' && lantern < a.minLantern) return false;
      if (typeof a.requiresLantern === 'number' && lantern < a.requiresLantern) return false;
      if (a.requiresPoster && posters < (a.effect === 'rotatePosters' ? 2 : 1)) return false;
      return true;
    });
  }
  function emptyTrip(base) {
    return {
      kind: 'empty', by: base.by, seed: base.seed, dateKey: base.dateKey, seq: base.seq,
      hint: { raw: base.hintRaw, match: matchHint(base.hintRaw), followed: 'none', note: null },
      events: [{ type: 'empty_turn', t: 0 }],
      receipt: null, poster: null, visitsDelta: {}, affinityDelta: {}, affinityDecay: 0.9, reaction: null, memo: null
    };
  }
  function homeTripFrom(base, act, R) {
    var tWrap = Math.round(lerp(R(), 2000, 4000));
    var pos = drawStickerPos(R);
    var paper = Math.floor(R() * 3);
    var rLine = R();
    var reaction = '졸림';
    var memo = buildHomeMemo(act, memoRng(base.seed));
    var events = [
      { type: 'stay_home', t: 0, activity: act.id, line: act.line, anchor: act.anchor || 'window' },
      { type: 'wrap_up', t: tWrap, reaction: reaction }
    ];
    if (memo) events[1].memo = memo;
    return {
      kind: 'home', by: base.by, seed: base.seed, dateKey: base.dateKey, seq: base.seq,
      hint: { raw: base.hintRaw, match: matchHint(base.hintRaw), followed: 'none', note: null },
      events: events,
      receipt: {
        stops: [], counts: zeroCounts(), souvenir: null, rememberedIdx: -1, reaction: reaction,
        reactionEmoji: reactionEmoji(reaction), reactionLine: pickReactionLine(reaction, rLine, null),   /* 집: 걸은 일·읽은 일이 없으니 lines 만 */
        activity: { id: act.id, line: act.line, detail: act.detail || '', anchor: act.anchor || 'window' }
      },
      poster: {
        type: 'note', title: act.title || '오늘은 집', line: act.line, detail: act.detail || '', back: '오늘은 집. 등불 +1',
        sticker: act.sticker || 'home', emoji: act.emoji || '🏠', scene: 'home', stickerPos: pos, thumb: null, paper: paper
      },
      visitsDelta: {}, affinityDelta: {}, affinityDecay: 0.9, reaction: reaction, memo: memo
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
    /* 테스트 전용 훅: window.__ppolTest = { forceKind:'home'|'empty'|'out' } 가 있을 때만 결과를 강제한다.
       난수는 똑같이 뽑아서(rStay, rEmpty) 훅이 없을 때의 draw 순서와 어긋나지 않게 한다. */
    var forced = (root && root.__ppolTest && typeof root.__ppolTest === 'object') ? root.__ppolTest.forceKind : null;
    if (forced !== 'home' && forced !== 'empty' && forced !== 'out') forced = null;
    var rStay = R();
    var stay = forced ? (forced !== 'out') : (rStay < pStay);
    if (stay) {
      var rEmpty = R();
      var empty = forced ? (forced === 'empty') : (rEmpty < 0.03);
      if (empty) return emptyTrip(base);
      var acts = homeActivities(state.lantern, state.posters);
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
    var avoidId = (match.kind === 'node' && !follow) ? match.nodeId : null;   /* '오늘은 그쪽 말고' → 그 방은 길에서 뺀다 */
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
      startId = pickStart(state, R, avoidId);
    }
    /* §17.1 재방문: 힌트 방을 전에 가 봤다 → 한 단계 더 깊게 + 첫 기웃에 한마디 */
    var revisit = !!(match.kind === 'node' && follow && hintNode && startId === hintNode.id &&
      ((state.visits[hintNode.id] || 0) > 0 || state.lastVisit[hintNode.id]));
    var route = buildRoute(W, state, R, startId, prefix, 5, { deeper: revisit, avoid: avoidId });
    var stops = route.stops;
    if (revisit && stops[0] && stops[0].id === hintNode.id) stops[0].aside = revisitAside(hintNode.name, state.lastVisit[hintNode.id], dateKey);

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
        /* 안 가기로 한 힌트와 같은 글로는 들판 걸음도 하지 않는다 (인덱스 난수는 그대로 r_wildIdx) */
        var skipKeys = (intent && !follow) ? hintTitleKeys(match, hintNode, hintRaw) : [];
        links = links.filter(function (t) {
          if (skipKeys.length && skipKeys.indexOf(titleKey(t)) >= 0) return false;
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
        var memo = buildOutMemo(stops, out, state, memoRng(seed));
        t += gWrap; events.push({ type: 'wrap_up', t: t, reaction: out.reaction });
        if (memo) events[events.length - 1].memo = memo;

        return {
          kind: 'out', by: by, seed: seed, dateKey: dateKey, seq: seq,
          hint: out.hint, events: events, receipt: out.receipt, poster: out.poster,
          visitsDelta: out.visitsDelta, affinityDelta: out.affinityDelta, affinityDecay: 0.9, reaction: out.reaction,
          revisit: revisit ? { nodeId: hintNode.id, last: state.lastVisit[hintNode.id] || null } : null, memo: memo
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
      /* 집에 있는 날엔 처음 온 곳도 읽은 것도 없으니 폴짝·우쭐은 받지 않는다 */
      if (wu && REACTIONS.indexOf(wu.reaction) >= 0 && reactionFits(wu.reaction, [], 'none')) { ht.reaction = wu.reaction; ht.receipt.reaction = wu.reaction; ht.receipt.reactionEmoji = reactionEmoji(wu.reaction); }
      if (wu) wu.reaction = ht.reaction;
      ht.memo = cleanMemo(wu && wu.memo);   /* 재생: 이벤트가 준 메모만. 없으면 말하지 않는다 */
      return ht;
    }

    /* 외출. 재생 입력의 '읽음'·'처음'은 그대로 믿지 않는다 (§5.4.1 정직 표기):
       - 밖의 문(url)은 정적 페이지라 바깥을 읽을 수 없다 → simulated (입력이 failed 면 failed). read 는 없다
       - 방·들판의 read 는 출처가 진짜 ko.wikipedia.org 문서 주소일 때만. 사진은 upload.wikimedia.org 일 때만 싣는다
       - 읽었다던 메모는 읽음이 인정될 때만 쓴다. 아니면 책장 메모·기본 문구
       - 방의 '처음'은 방문 기록(meta.state.visits)이 정하고, 입력은 '처음 아님'만 보탤 수 있다. 들판은 늘 처음 아님
       정리한 상태·메모·출처·처음 여부는 복사해 둔 peek 이벤트에도 다시 써서, 돌려주는 events 도 영수증과 같은 말을 한다 */
    var stops = events.filter(function (e) { return e.type === 'peek'; }).map(function (ev) {
      var tg = ev.target || {};
      var node = tg.id && W && W.nodes ? W.nodes[tg.id] : null;
      var claimedRead = ev.status === 'read';
      var src = (claimedRead && ev.source && isWikiPageUrl(ev.source.url)) ? ev.source : null;
      var s;
      if (tg.kind === 'url' || tg.id === 'door_out' || (!node && tg.url)) {
        s = makeDoorStop(tg.url || '');
        if (ev.status === 'failed') { s.status = 'failed'; s.note = ev.note || '문이 안 열렸어'; }
        else if (ev.note && !claimedRead) s.note = ev.note;
        if (tg.kind !== 'url') ev.target = Object.assign({}, tg, { kind: 'url', url: tg.url || '', title: tg.title || s.name });
      } else if (node) {
        s = makeLibStop(node, state, ev.viaTangent, ev.bridge);
        if (isNoneNode(node)) applyFetch(s, null, true);
        else if (src) applyFetch(s, replayRead(node.wiki || node.name, src, ev.note), true);
        else {
          var st = (ev.status && STATUSES.indexOf(ev.status) >= 0 && !claimedRead) ? ev.status : (node.clue ? 'builtin' : 'failed');
          s.status = st; s.note = (!claimedRead && ev.note) || (st === 'builtin' ? node.clue : st === 'simulated' ? SIMULATED_NOTE : '');
          if (st === 'builtin') s.reason = 'replay';
        }
        if (ev.first === false) s.first = false;
      } else {
        var title = tg.title || tg.wiki || tg.id || '이름 없는 곳';
        s = makeWildStop(title, { viaTangent: !!ev.viaTangent, bridge: ev.bridge || null });
        if (src) applyFetch(s, replayRead(title, src, ev.note), true);
        else {
          s.status = (ev.status && STATUSES.indexOf(ev.status) >= 0 && !claimedRead) ? ev.status : 'simulated';
          s.note = (!claimedRead && ev.note) || (s.status === 'simulated' ? '내용은 읽지 않았어' : '');
        }
      }
      s.ms = typeof ev.ms === 'number' ? ev.ms : 0;
      /* 정리한 그대로 이벤트에도 (로그 줄이 원본의 ✅ 를 보여 주지 않게) */
      ev.status = s.status; ev.note = s.note || ''; ev.first = !!s.first;
      if (s.source) ev.source = { url: s.source.url, extract: s.source.extract, thumb: s.source.thumb, license: s.source.license, attribution: s.source.attribution };
      else delete ev.source;
      if (s.reason) ev.reason = s.reason;
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
    if (wrap) wrap.reaction = out.reaction;   /* 맞지 않아 바뀐 반응도 이벤트에 그대로 */
    return {
      kind: 'out', by: by, seed: seed, dateKey: base.dateKey, seq: base.seq,
      hint: out.hint, events: events, receipt: out.receipt, poster: out.poster,
      visitsDelta: out.visitsDelta, affinityDelta: out.affinityDelta, affinityDecay: 0.9, reaction: out.reaction,
      memo: cleanMemo(wrap && wrap.memo)   /* 재생: wrap_up.memo 가 있을 때만 (MCP 모델이 직접 쓴다) */
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
  BRAIN.cleanMemo = cleanMemo;
  BRAIN.daysBetween = daysBetween;
  BRAIN.MEMO_MAX = MEMO_MAX;
  BRAIN.setWorld = function (w) { BRAIN._world = w || null; };
  BRAIN.STATUSES = STATUSES.slice();
  BRAIN.REACTIONS = REACTIONS.slice();

  root.BRAIN = BRAIN;
  if (typeof module !== 'undefined' && module.exports) module.exports = BRAIN;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
