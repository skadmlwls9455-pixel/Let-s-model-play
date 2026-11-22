/* js/meal.js - 식탁 규칙 (전역 MEAL). 설계: docs/MEAL.md (주인 11-18 "문어와 같이 먹기 · 효과는 그날 하루").
 *
 * 부엌에서 다 만든 요리가 놀이방 식탁에 올라온다. 내 캐릭터가 앉아 먹고, 문어를 부르면 문어가 그때 정한다 (먹기 · 보기만).
 * 지금은 데모 규칙이 정하고 (모델 길은 docs/MEAL.md 의 약속만 — 이번엔 코드가 없다), 누가 정했는지 늘 적는다.
 *
 * - 순수 로직이다. DOM, 저장소, 시계, 타이머, 네트워크, Math.random 을 쓰지 않는다. node 에서도 그대로 로드된다 (module.exports).
 *   시각이 필요하면 부르는 쪽이 at(ms) 과 날짜 키(YYYY-MM-DD, 그 기기의 달력)를 넘긴다.
 * - 데모 대답은 시드로만: hashSeed('meal', 요리 id, 이름, born) 의 mulberry32 첫 값 < P_EAT 면 먹기. 맨 처음 부름(물은 적 0)은 꼭 먹기.
 *   요리 종류 · 효과 · 시각 · 지난 대답은 넣지 않는다 (요리를 가리는 규칙은 문어에게 없는 입맛을 지어낸다).
 * - 요리 하나에 대답 하나: 같은 요리로 다시 부르면 적힌 대답을 그대로 (다시 뽑지 않는다).
 * - 코드가 짓는 글은 사실만 (마음 · 맛 말 0건). 결정은 '-기로 했어'. 모델 말은 한 글자도 바꾸지 않는다.
 * - 효과는 저장하지 않고 기록에서 끌어낸다: 오늘 먹은 것 가운데 가장 늦은 것 (나 · 문어 따로). 날이 바뀌면 저절로 없다.
 *
 * 저장 모양 (localStorage ppolppol_v2 의 S.user 안 — 없앤 칸 · 바꾼 이름 없음):
 *   user.table  null | { v: 1, id: 'ck_…', recipe, seed, look, day, at }        기다리는 요리 하나
 *   user.meals  [{ id: 'ml_…', dish: 'ck_…', recipe, date, at,                     오래된 것부터 · 지우지 않는다
 *                  ask: null | { at, action: eat|watch|stop|null, by: demo-rules|model|human|fallback, rule?, seed?, model?, line?, raw? },
 *                  ate: null | { at, date, me: true, oct: true|false|null, fx } }]
 */
(function (root) {
  'use strict';

  function deepFreeze(o) {
    Object.keys(o).forEach(function (k) { if (o[k] && typeof o[k] === 'object') deepFreeze(o[k]); });
    return Object.freeze(o);
  }

  /* 요리 (부엌 recipe id → 이름 · 효과). 모르는 요리(나중 빌드)는 기록엔 남고 그리지 않는다 */
  var DISHES = deepFreeze({
    jeon: { name: '해초전', fx: 'sparkle' },
    jumeokbap: { name: '주먹밥', fx: 'star' },
    kkochi: { name: '과일 꼬치', fx: 'petal' },
    /* 11-21 7차: 레시피 북의 새 요리 다섯 (옛 셋은 그대로 안다 — 기다리던 요리 · 옛 기록 · 일기 행이 계속 그려진다) */
    jeon2: { name: '해초전', fx: 'sparkle' },
    gyeran: { name: '계란말이', fx: 'bubble' },
    jumeokbap2: { name: '주먹밥', fx: 'star' },
    kkochi2: { name: '과일 꼬치', fx: 'petal' },
    cake: { name: '딸기 케이크', fx: 'confetti' }
  });
  var FX_NAME = deepFreeze({ sparkle: '반짝이', star: '별', petal: '꽃잎', bubble: '방울', confetti: '색종이' });
  /* 누가 정했나 꼬리. fallback(아무도 안 고름)은 꼬리가 없다 */
  var TAILS = deepFreeze({ 'demo-rules': '데모 규칙', model: '모델', human: '사람이 정함' });
  var BYS = ['demo-rules', 'model', 'human', 'fallback'];
  var ACTIONS = ['eat', 'watch', 'stop'];
  var EXPRS = ['idle', 'happy', 'curious', 'calm'];

  /* 집 목소리 (모든 모드). 일어난 일과 정한 것만. {x}{은} 은 받침에 맞는 조사 (은/는 · 이/가 · 을/를) */
  var TEXT = deepFreeze({
    label: '식탁',                                                  /* 로그 행 라벨 */
    eat: '{name}도 같이 먹기로 했어.',
    watch: '{name}{은} 보기만 하기로 했어.',
    stop: '{name}{은} 다락으로 돌아가기로 했어.',                    /* 모델 길 (나중) */
    none: '대답이 없었어.',
    mealAlone: '{dish}{을} 먹었어. 오늘 하루 {fx}{이} 따라다녀.',
    mealTogether: '{dish}{을} 같이 먹었어. 오늘 하루 둘 다 {fx}{이} 따라다녀.',
    mealAlonePast: '{dish}{을} 먹었어. 그날 하루 {fx}{이} 따라다녔어.',          /* 지난 날 (앨범 일기 — 효과는 그날로 끝났다) */
    mealTogetherPast: '{dish}{을} 같이 먹었어. 그날 하루 둘 다 {fx}{이} 따라다녔어.',
    descDish: '식탁에 {dish}{이} 있어.',
    descSeated: '{name}{은} 식탁 맞은편에 앉아 있어.',
    descFx: '{fx}{이} 따라다녀.',
    ariaTable: '식탁',
    ariaTableDish: '식탁, {dish}',
    ariaEat: '{dish} 먹기',
    ariaSeat: '식탁에 앉기',
    ariaCall: '{name} 부르기',
    octopus: '문어'                                                 /* 이름이 없을 때 */
  });

  var MEAL = {
    DISHES: DISHES,
    FX_NAME: FX_NAME,
    P_EAT: 0.6,          /* 데모 문어가 '먹기'를 고르는 몫 (약 5번에 3번) */
    FIRST_EAT: true,     /* 맨 처음 부름(물은 적 0)은 꼭 '먹기' — 부르면 무엇이 되는지 보여 준다 (미용실의 첫 물음과 같은 생각) */
    MINE_MS: 60000,      /* 이 탭이 쓴 식탁 기록을 기억하는 시간 (merge) */
    SLIM_DAYS: 365,      /* 저장 사본에서 seed · raw 를 빼는 나이 (line 은 안 뺀다) */
    LINE_SHOW: 24,       /* 말풍선에 보이는 글자 수 (모델 길 — 기록엔 전부) */
    TAILS: TAILS,
    TEXT: TEXT
  };

  /* ---------- 작은 도우미 ---------- */
  function isObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
  function finite(x) { return typeof x === 'number' && isFinite(x); }
  function isUint32(x) { return finite(x) && x >= 0 && x <= 4294967295 && Math.floor(x) === x; }
  function hasText(x) { return typeof x === 'string' && /\S/.test(x); }
  function copy(o) { return Object.assign({}, o); }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  var KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
  function isKey(k) { return typeof k === 'string' && KEY_RE.test(k); }

  /* 시드: BRAIN 이 있으면 그것, 없으면 똑같은 사본 (FNV-1a 32bit, '|' 로 이음 + mulberry32 — js/salon.js 와 같다) */
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

  /* 받침 조사 (js/world.js nameJosa 와 같은 규칙): josa('문어', '은') → '문어는', josa('곰', '이') → '곰이'. 끝의 부호는 보지 않는다 */
  var PAIRS = { '은': ['은', '는'], '는': ['은', '는'], '이': ['이', '가'], '가': ['이', '가'], '을': ['을', '를'], '를': ['을', '를'], '과': ['과', '와'], '와': ['과', '와'] };
  function batchim(word) {
    var nm = String(word == null ? '' : word).replace(/[^0-9A-Za-z가-힣]+$/, '');
    if (!nm) return false;
    var last = nm.charAt(nm.length - 1), c = last.charCodeAt(0);
    if (/[0-9]/.test(last)) return '1101001110'.charAt(+last) === '1';
    if (/[A-Za-z]/.test(last)) return /[lmn]$/i.test(nm) || /ng$/i.test(nm);
    return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 > 0;
  }
  function josa(word, particle) {
    var w = String(word == null ? '' : word), p = PAIRS[particle];
    if (!p) return w + (particle || '');
    return w + (batchim(w) ? p[0] : p[1]);
  }
  /* '{name}{은}' → 이름 + 맞는 조사 · '{name}' → 이름 */
  function fill(tpl, v) {
    return String(tpl).replace(/\{(\w+)\}(?:\{(은|이|을|과)\})?/g, function (m, k, p) {
      if (!v || v[k] == null) return m;
      return p ? josa(v[k], p) : String(v[k]);
    });
  }
  function nameOf(n) { return hasText(n) ? String(n) : TEXT.octopus; }
  function dishName(recipe) { return has(DISHES, recipe) ? DISHES[recipe].name : null; }
  function fxOf(recipe) { return has(DISHES, recipe) ? DISHES[recipe].fx : null; }
  function fxName(fx) { return has(FX_NAME, fx) ? FX_NAME[fx] : null; }

  /* ---------- 부엌 result 글 ---------- */
  /* { ppolCook: 'result', v: 1, id, recipe, seed, look, day } (docs/COOK_PROTO.md §9) → { v: 1, id, recipe, seed, look, day } 또는 null.
     look 은 평범한 객체이고 JSON 2048 바이트 이하일 때만 (사본을 담는다 — 보낸 쪽 객체와 엮이지 않게) */
  function normDish(d) {
    if (!isObj(d)) return null;
    if (typeof d.id !== 'string' || !/^ck_[0-9a-z]{1,13}$/.test(d.id)) return null;
    if (typeof d.recipe !== 'string' || !/^[\x21-\x7e]{1,16}$/.test(d.recipe)) return null;
    if (!isUint32(d.seed)) return null;
    if (!isObj(d.look) || Object.getPrototypeOf(d.look) !== Object.prototype && Object.getPrototypeOf(d.look) !== null) return null;
    var json; try { json = JSON.stringify(d.look); } catch (e) { return null; }
    if (typeof json !== 'string' || utf8Len(json) > 2048) return null;
    var day = d.day == null ? '' : d.day;
    if (day !== '' && !isKey(day)) return null;
    return { v: 1, id: d.id, recipe: d.recipe, seed: d.seed, look: JSON.parse(json), day: day };
  }
  function utf8Len(s) { var n = 0; for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); n += c < 0x80 ? 1 : c < 0x800 ? 2 : (c >= 0xD800 && c <= 0xDBFF) ? (i++, 4) : 3; } return n; }

  /* ---------- 기록 ---------- */
  function userOf(state) { return state && isObj(state.user) ? state.user : {}; }
  function mealsOf(state) { var m = userOf(state).meals; return Array.isArray(m) ? m : []; }
  function tableOf(state) { var t = userOf(state).table; return isObj(t) && typeof t.id === 'string' ? t : null; }
  function entryFor(state, dishId) {
    var list = mealsOf(state);
    for (var i = 0; i < list.length; i++) if (isObj(list[i]) && list[i].dish === dishId) return list[i];
    return null;
  }
  function asksBefore(state) { return mealsOf(state).filter(function (m) { return isObj(m) && isObj(m.ask); }).length; }

  /* user.table · user.meals 옮기기 (앱의 userState 가 부른다 — 자주 불려도 같은 결과). 모르는 값(나중 빌드의 recipe · fx · by)은 그대로 둔다.
     객체가 아닌 것만 버린다. 같은 id 는 처음 것만 */
  function normalize(u) {
    if (!isObj(u)) return u;
    if (u.table != null && !(isObj(u.table) && typeof u.table.id === 'string')) u.table = null;
    if (u.table === undefined) u.table = null;
    var seen = Object.create(null), list = [];
    (Array.isArray(u.meals) ? u.meals : []).forEach(function (m) {   /* 같은 id 가 둘이면 먹은 · 물은 쪽 (merge 와 같은 순위) — 자리는 처음 것 */
      if (!isObj(m)) return;
      if (typeof m.id === 'string' && m.id in seen) { var i = seen[m.id]; if (rank(m) > rank(list[i])) list[i] = m; return; }
      if (typeof m.id === 'string') seen[m.id] = list.length;
      list.push(m);
    });
    u.meals = list;
    u.meals.forEach(function (m) {
      if (m.ask != null && !isObj(m.ask)) m.ask = null;
      if (m.ate != null && !isObj(m.ate)) m.ate = null;
      if (m.ask === undefined) m.ask = null;
      if (m.ate === undefined) m.ate = null;
    });
    return u;
  }

  function rank(m) { return (isObj(m.ate) ? 2 : 0) + (isObj(m.ask) ? 1 : 0); }
  function octOfAte(a) { return a.oct === true ? true : a.oct === false ? false : null; }   /* 모르는 값 (나중 빌드) 은 저장엔 그대로, 읽을 땐 '식탁에 없었음' */

  /* ---------- 부를 수 있나 ---------- */
  /* oct = { seated: 내가 식탁에 앉아 있나, away, asleep, busy } (앱이 장면 · 상태에서 채운다).
     돌아온 뒤 깨어 있는 틈은 깨어 있다 (부름은 큰 버튼 같은 초대다). 자는 문어는 깨우지 않는다. 식사 뒤 식탁에 앉아 있는 문어는 집에 있다 */
  function canCall(state, today, oct) {
    var o = isObj(oct) ? oct : {};
    if (!tableOf(state)) return no('no_dish');
    if (o.seated !== true) return no('not_seated');
    if (o.away === true) return no('away');
    if (o.asleep === true) return no('asleep');
    if (o.busy === true) return no('busy');
    return { ok: true, reason: null };
  }
  function no(reason) { return { ok: false, reason: reason }; }

  /* ---------- 대답 ---------- */
  /* 데모 대답. 받는 것은 요리 id, 이름, born, asksBefore 뿐 (요리 종류 · 효과 · 색 · 시각 · 지난 대답 · 쓰다듬기는 받지 않는다).
     asksBefore 가 정확히 0 이면 '먹기' (rule 'first'). 깨진 수는 시드 길로 */
  function demoAnswer(o) {
    o = isObj(o) ? o : {};
    if (MEAL.FIRST_EAT && o.asksBefore === 0) return { action: 'eat', by: 'demo-rules', rule: 'first', seed: null };
    var seed = hashSeed('meal', o.dish, o.name, String(o.born || 0));
    return { action: rng(seed)() < MEAL.P_EAT ? 'eat' : 'watch', by: 'demo-rules', rule: 'seed', seed: seed };
  }
  /* 개발용 (?dev=1 을 직접 붙인 탭만): 사람이 정한다. 결정만 (말 · 얼굴 없음). null = 대답 없음 */
  function humanAnswer(action) { return { action: ACTIONS.indexOf(action) >= 0 ? action : null, by: 'human' }; }

  function askOf(ans, at) {
    var by = BYS.indexOf(ans.by) >= 0 ? ans.by : null;
    if (!by) return null;
    var a = { at: at, action: by === 'fallback' ? null : (ACTIONS.indexOf(ans.action) >= 0 ? ans.action : null), by: by };
    if (by === 'demo-rules') { a.rule = ans.rule === 'first' || ans.rule === 'seed' ? ans.rule : null; if (a.rule === 'seed' && isUint32(ans.seed)) a.seed = ans.seed; }
    if (by === 'model') {
      if (typeof ans.model === 'string') a.model = ans.model;
      if (typeof ans.line === 'string') a.line = ans.line;   /* 한 글자도 안 바꾼다 */
      if (EXPRS.indexOf(ans.expr) >= 0) a.expr = ans.expr;
      if (typeof ans.raw === 'string') a.raw = ans.raw;
    }
    return a;
  }
  function newId(state, dishId, at) {
    var have = Object.create(null);
    mealsOf(state).forEach(function (m) { if (isObj(m) && typeof m.id === 'string') have[m.id] = 1; });
    var base = 'ml_' + hashSeed('meal-id', dishId, at).toString(36), id = base, n = 2;
    while (have[id]) id = base + '_' + (n++);
    return id;
  }
  function ensureMeals(state) {
    if (!isObj(state.user)) state.user = {};
    if (!Array.isArray(state.user.meals)) state.user.meals = [];
    return state.user.meals;
  }
  function entryOf(state, dish, at, today) {
    var e = entryFor(state, dish.id);
    if (e) return e;
    e = { id: newId(state, dish.id, at), dish: dish.id, recipe: dish.recipe, date: today, at: at, ask: null, ate: null };
    ensureMeals(state).push(e);
    return e;
  }

  /* 부름 한 번: 기다리는 요리(dish, 없으면 state 의 table)에 대답을 적는다 (state 를 고친다). 이미 대답이 있으면 그대로 돌려준다 (다시 뽑지 않는다).
     o = { at, today, dish?, answer? } — answer 를 안 주면 데모 대답. → 그 요리의 식탁 기록 (없으면 null) */
  function makeAsk(state, o) {
    o = isObj(o) ? o : {};
    if (!isObj(state)) return null;
    var dish = isObj(o.dish) && typeof o.dish.id === 'string' ? o.dish : tableOf(state), at = finite(o.at) ? o.at : null;
    if (!dish || !isKey(o.today)) return null;
    var old = entryFor(state, dish.id);
    if (old && isObj(old.ask)) return old;
    var oc = isObj(state.octopus) ? state.octopus : {};
    var ans = isObj(o.answer) ? o.answer : demoAnswer({ dish: dish.id, name: oc.name, born: oc.born, asksBefore: asksBefore(state) });
    var ask = askOf(ans, at);
    if (!ask) return null;
    var e = entryOf(state, dish, at, o.today);
    e.ask = ask;
    return e;
  }

  /* 먹기 시작 (state 를 고친다): 그 요리의 기록에 ate 를 적고, 식탁의 요리가 그것이면 비운다.
     o = { at, today, oct: true(같이 먹음) | false(앉아서 봄) | null(식탁에 없음), dish?: 요리 id (없으면 지금 식탁 요리) } → 기록 또는 null.
     이미 먹은 요리면 그대로 돌려준다 (두 번 먹지 않는다) */
  function eat(state, o) {
    o = isObj(o) ? o : {};
    if (!isObj(state) || !isKey(o.today)) return null;
    var t = tableOf(state), id = typeof o.dish === 'string' ? o.dish : (t ? t.id : null);
    if (!id) return null;
    var e = entryFor(state, id);
    if (!e) { if (!t || t.id !== id) return null; e = entryOf(state, t, finite(o.at) ? o.at : null, o.today); }
    if (!isObj(e.ate)) {
      e.ate = { at: finite(o.at) ? o.at : null, date: o.today, me: true, oct: o.oct === true ? true : o.oct === false ? false : null, fx: fxOf(e.recipe) || (t && t.id === id ? fxOf(t.recipe) : null) };
    }
    if (t && t.id === id) state.user.table = null;
    return e;
  }

  /* 오늘의 효과 (기록에서 끌어낸다): 오늘 먹은 것 가운데 가장 늦은 것 — 나는 내가 먹은 것, 문어는 ate.oct === true 인 것.
     그 효과를 이 빌드가 모르면 null (바뀐 효과를 옛 효과로 되돌리지 않는다) → { me, oct } */
  function active(state, today) {
    var me = null, oc = null;
    mealsOf(state).forEach(function (m, i) {
      if (!isObj(m) || !isObj(m.ate) || m.ate.date !== today) return;
      var at = finite(m.ate.at) ? m.ate.at : -Infinity;
      if (m.ate.me !== false && (!me || at >= me.at)) me = { at: at, fx: m.ate.fx, i: i };
      if (m.ate.oct === true && (!oc || at >= oc.at)) oc = { at: at, fx: m.ate.fx, i: i };
    });
    return { me: me && fxName(me.fx) ? me.fx : null, oct: oc && fxName(oc.fx) ? oc.fx : null };
  }

  /* ---------- 글 ---------- */
  function tailOf(by) { return has(TAILS, by) ? TAILS[by] : null; }
  /* 대답 한 줄 { text, tail, voice, raw }: 모델이 말을 줬으면 그 말 그대로 (꼬리 '모델'), 아니면 집 목소리 결정 줄 + 누가 정했나.
     아무도 안 골랐으면 '대답이 없었어.' (꼬리 없음) */
  function decision(ask, name) {
    if (!isObj(ask)) return null;
    var nm = nameOf(name);
    if (ask.by === 'model' && hasText(ask.line)) return { text: ask.line, tail: TAILS.model, voice: 'octopus', raw: true, by: 'model', expr: EXPRS.indexOf(ask.expr) >= 0 ? ask.expr : 'idle' };
    if (ask.by === 'fallback' || !has(TEXT, ask.action) || ACTIONS.indexOf(ask.action) < 0) return { text: TEXT.none, tail: null, voice: 'house', raw: false, by: ask.by, expr: null };
    return { text: fill(TEXT[ask.action], { name: nm }), tail: tailOf(ask.by), voice: 'house', raw: false, by: ask.by, expr: null };
  }
  /* 대답 알림 (대답 박자): { text, tail } — 앱이 [text, ' ', span.lby(tail)] 로 그린다 */
  function toastParts(entry, name) {
    var d = isObj(entry) ? decision(entry.ask, name) : null;
    return d ? { text: d.text, tail: d.tail } : null;
  }
  /* 로그 행 데이터 (DOM 은 앱): [{ n, label, text, voice, raw, by, tail, expr }].
     먹은 기록만 그린다. 1 대답 — 문어가 그 식사에 앉아 있었을 때만 (ate.oct !== null) 이고 대답이 있을 때. 2 식사 — 이 빌드가 아는 요리일 때 */
  function rows(entry, name, today) {   /* today 를 주면 다른 날의 식사는 지난 말 ('그날 하루 … 따라다녔어.') */
    if (!isObj(entry) || !isObj(entry.ate)) return [];
    var out = [], a = entry.ate, oc = octOfAte(a), past = isKey(today) && a.date !== today;
    if (oc !== null && isObj(entry.ask)) {
      var d = decision(entry.ask, name);
      out.push({ n: 1, label: TEXT.label, text: d.text, voice: d.voice, raw: d.raw, by: d.by, tail: d.tail, expr: d.expr });
    }
    var dn = dishName(entry.recipe), fn = fxName(a.fx);
    if (dn && fn) out.push({ n: 2, label: TEXT.label, text: fill(oc === true ? (past ? TEXT.mealTogetherPast : TEXT.mealTogether) : (past ? TEXT.mealAlonePast : TEXT.mealAlone), { dish: dn, fx: fn }), voice: 'house', raw: false, by: null, tail: null, expr: null });
    return out;
  }
  /* 장면 설명 (놀이방, 3D): 식탁의 요리 · 맞은편의 문어 · 내 효과. 없으면 '' */
  function sceneDesc(state, today, name, inTable) {
    var out = [], t = tableOf(state), dn = t ? dishName(t.recipe) : null, fx = active(state, today).me;
    if (dn) out.push(fill(TEXT.descDish, { dish: dn }));
    if (inTable) out.push(fill(TEXT.descSeated, { name: nameOf(name) }));
    if (fx) out.push(fill(TEXT.descFx, { fx: FX_NAME[fx] }));
    return out.join(' ');
  }
  /* 단추 이름 (aria-label) */
  function aria(kind, o) {
    o = isObj(o) ? o : {};
    var dn = o.recipe ? dishName(o.recipe) : null;
    if (kind === 'table') return dn ? fill(o.seated ? TEXT.ariaEat : TEXT.ariaTableDish, { dish: dn }) : TEXT.ariaTable;
    if (kind === 'seat') return TEXT.ariaSeat;
    if (kind === 'call') return fill(TEXT.ariaCall, { name: nameOf(o.name) });
    return '';
  }

  /* ---------- 다른 탭 합치기 ---------- */
  /* local = 이 탭의 기록, remote = 방금 받은 기록, mine = 이 탭이 쓴 것 [{ table?, entry?, at }], now(ms).
     - 기록: id 로 합친다 (같은 문어일 때만 이 탭 것도 — 지우지 않는다). 같은 id 면 ate 있는 쪽, 그다음 ask 있는 쪽.
     - 식탁: 이 탭이 MINE_MS 안에 놓은 요리가 그쪽 것보다 새로우면 이 탭 것. 어느 쪽에서든 먹은 요리면 비운다.
     - 다른 문어(born 이 다름)면 mine 을 버리고 그쪽 것 그대로.
     → { state (remote 를 바꾸지 않은 새 객체), mine (남긴 것), changed (state 가 remote 와 다르다 → 앱이 save) } */
  function merge(local, remote, mine, now) {
    if (!isObj(remote)) return { state: remote, mine: [], changed: false };
    var out = copy(remote), ru = userOf(remote), lu = userOf(local);
    out.user = copy(ru);
    var same = isObj(local) && ((local.octopus && local.octopus.born) || 0) === ((remote.octopus && remote.octopus.born) || 0);
    var list = mealsOf(remote).filter(isObj).map(copy), changed = false, at = Object.create(null);
    list.forEach(function (m, i) { if (typeof m.id === 'string') at[m.id] = i; });
    if (same) mealsOf(local).forEach(function (m) {
      if (!isObj(m) || typeof m.id !== 'string') return;
      if (!(m.id in at)) { at[m.id] = list.length; list.push(copy(m)); changed = true; return; }
      if (rank(m) > rank(list[at[m.id]])) { list[at[m.id]] = copy(m); changed = true; }
    });
    if (changed) list = byAt(list);
    out.user.meals = list;
    var kept = [];
    if (same) (Array.isArray(mine) ? mine : []).forEach(function (m) {
      if (!isObj(m)) return;
      if (finite(now) && finite(m.at) && now - m.at > MEAL.MINE_MS) return;
      kept.push(m);
    });
    var eaten = Object.create(null);
    list.forEach(function (m) { if (isObj(m.ate) && typeof m.dish === 'string') eaten[m.dish] = 1; });
    var table = isObj(ru.table) && typeof ru.table.id === 'string' ? ru.table : null, lt = isObj(lu.table) && typeof lu.table.id === 'string' ? lu.table : null;
    var myTable = lt && kept.some(function (m) { return isObj(m.table) && m.table.id === lt.id; }) ? lt : null;
    if (myTable && !eaten[myTable.id] && (!table || (finite(myTable.at) ? myTable.at : 0) > (finite(table.at) ? table.at : 0))) {
      if (!table || table.id !== myTable.id) changed = true;
      table = myTable;
    }
    if (table && eaten[table.id]) { table = null; changed = changed || !!ru.table; }
    out.user.table = table ? copy(table) : (ru.table === undefined ? undefined : null);
    if (out.user.table === undefined) delete out.user.table;
    return { state: out, mine: kept, changed: changed };
  }
  function byAt(list) {   /* 안정 정렬: at 순 (at 이 없으면 끝) */
    return list.map(function (x, i) { return [x, i]; }).sort(function (p, q) {
      var a = finite(p[0].at) ? p[0].at : Infinity, b = finite(q[0].at) ? q[0].at : Infinity;
      return a !== b ? (a < b ? -1 : 1) : p[1] - q[1];
    }).map(function (p) { return p[0]; });
  }

  /* 저장 사본에서만: 1년 넘은 기록의 ask.seed · ask.raw 를 뺀다. 고른 이의 말(line)은 절대 안 뺀다. 뺄 게 없으면 null */
  function slim(meals, today) {
    if (!Array.isArray(meals) || !isKey(today)) return null;
    var d = new Date(today.replace(/-/g, '/')); d.setDate(d.getDate() - MEAL.SLIM_DAYS);
    var old = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()), n = 0;
    var out = meals.map(function (m) {
      if (!isObj(m) || !isObj(m.ask) || !(typeof m.date === 'string' && m.date < old) || (m.ask.seed == null && m.ask.raw == null)) return m;
      n++; var c = copy(m); c.ask = copy(m.ask); delete c.ask.seed; delete c.ask.raw; return c;
    });
    return n ? out : null;
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /* ---------- 공개 ---------- */
  MEAL.josa = josa;
  MEAL.fill = fill;
  MEAL.dishName = dishName;
  MEAL.fxOf = fxOf;
  MEAL.fxName = fxName;
  MEAL.normDish = normDish;
  MEAL.normalize = normalize;
  MEAL.entryFor = entryFor;
  MEAL.asksBefore = asksBefore;
  MEAL.canCall = canCall;
  MEAL.demoAnswer = demoAnswer;
  MEAL.humanAnswer = humanAnswer;
  MEAL.makeAsk = makeAsk;
  MEAL.eat = eat;
  MEAL.active = active;
  MEAL.rows = rows;
  MEAL.toastParts = toastParts;
  MEAL.sceneDesc = sceneDesc;
  MEAL.aria = aria;
  MEAL.merge = merge;
  MEAL.slim = slim;
  /* ---------- 11-21 7차: 요리 그림 (js/cook-sprites.js COOK_SPR 의 'dish.<id>' · 'table.<id>') ----------
     북의 새 요리만 그림이 있다 (옛 셋은 장면의 예전 모양 그대로). 해초전은 구운 정도 (look.band 0..2) 가 그림 칸이다 */
  var PICS = deepFreeze({ jeon2: 'jeon', gyeran: 'gyeran', jumeokbap2: 'jumeokbap', kkochi2: 'kkochi', cake: 'cake' });
  function pic(recipe, look) {
    if (typeof recipe !== 'string' || !has(PICS, recipe)) return null;
    var f = 0;
    if (recipe === 'jeon2') { var b = isObj(look) && typeof look.band === 'number' && isFinite(look.band) ? Math.floor(look.band) : 0;   /* 부엌의 look = { v: 2, s, plate, band? } — band 가 없으면 첫 칸 */ f = Math.max(0, Math.min(2, b)); }
    return { id: PICS[recipe], frame: f };
  }
  /* 그림 { w, h, d: RGBA } 에서 그릇 줄을 찾는다: 아래쪽 6할 가운데, 가장 넓은 줄의 9할 넘게 넓은 맨 윗줄 (비스듬히 본 접시의 가장 넓은 데).
     그 줄 위가 음식 (한 입에 사라지는 곳) 이고, 그 줄부터 아래는 그릇이라 남는다 */
  function sprOK(spr) { return isObj(spr) && spr.w > 0 && spr.h > 0 && spr.d && spr.d.length >= spr.w * spr.h * 4; }
  function sprBox(spr, below) {   /* below = 이 줄 위쪽만 (음식의 가로 범위) */
    var w = spr.w, h = spr.h, d = spr.d, x0 = w, x1 = -1, rows = [], yN = typeof below === 'number' ? Math.min(h, below) : h;
    for (var y = 0; y < yN; y++) {
      var a = w, b = -1;
      for (var x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] >= 128) { if (x < a) a = x; b = x; }
      rows.push(b < 0 ? 0 : b - a + 1);
      if (b >= 0) { if (a < x0) x0 = a; if (b > x1) x1 = b; }
    }
    return { x0: x0, x1: x1, rows: rows };
  }
  function sprBand(spr) {   /* → [그릇 줄, 띠 끝 줄]: 넓은 줄 (가장 넓은 줄의 9할) 이 가장 길게 이어지는 토막 */
    var B = sprBox(spr), max = 0, h = spr.h, y, a = -1, best = null;
    for (y = 0; y < h; y++) if (B.rows[y] > max) max = B.rows[y];
    if (!max) return null;
    for (y = Math.floor(h * 0.4); y <= h; y++) {
      var wide = y < h && B.rows[y] >= max * 0.9;
      if (wide && a < 0) a = y;
      if (!wide && a >= 0) { if (!best || y - 1 - a > best[1] - best[0]) best = [a, y - 1]; a = -1; }
    }
    return best || [Math.floor(h * 0.7), Math.floor(h * 0.7)];
  }
  function biteLine(spr) { if (!sprOK(spr)) return 0; var b = sprBand(spr); return b ? b[0] : 0; }
  /* 한 입 = 그림을 가로 넷으로 나눈 한 칸 (eaten: 0..3, 왼쪽부터) 의 그릇 줄 위쪽. 큰 그림 (amp 2) 은 가장자리가 이빨 자국처럼 들쭉날쭉 → 새 RGBA 배열 (원본은 그대로) */
  var TEETH = [0, 1, 2, 2, 1, 0];
  function biteMask(spr, eaten, line, amp) {
    if (!sprOK(spr)) return null;
    var w = spr.w, h = spr.h, out = new Uint8ClampedArray(spr.d.length > w * h * 4 ? spr.d.subarray(0, w * h * 4) : spr.d);
    if (!Array.isArray(eaten) || !eaten.length) return out;
    var L = typeof line === 'number' && isFinite(line) ? Math.floor(line) : biteLine(spr), A = amp === 0 ? 0 : amp === 1 ? 1 : 2;
    var B = sprBox(spr, L); if (B.x1 < B.x0) return out;   /* 넷으로 나누는 것은 음식의 폭 (그릇 폭이 아니라) */
    var span = B.x1 - B.x0 + 1, gone = [false, false, false, false];
    eaten.forEach(function (q) { if (q === 0 || q === 1 || q === 2 || q === 3) gone[q] = true; });
    /* 그릇 띠: 그릇 줄부터 넓은 줄이 이어지는 데까지 (비스듬히 본 접시의 윗면). 음식이 그 위에 겹쳐 그려져 있으므로, 먹은 칸의 띠 안쪽은 투명 대신
       그릇 색 (띠 아래 반에서 가장 흔한 색) 으로 메운다 — 줄마다 양 끝 두 칸 (테두리) 과 그림 아래 끝 세 칸 (앞 테) 은 그대로 */
    var band = sprBand(spr), yb = band && band[0] === L ? band[1] : L, fill = null, d0 = spr.d, y, x;
    if (yb - L >= 4) {
      var cnt = {}, best = 0;
      for (y = Math.floor((L + yb) / 2); y <= yb; y++) for (x = 0; x < w; x++) {
        var kk = (y * w + x) * 4; if (d0[kk + 3] < 128) continue;
        var key = d0[kk] + ',' + d0[kk + 1] + ',' + d0[kk + 2]; cnt[key] = (cnt[key] || 0) + 1;
        if (cnt[key] > best) { best = cnt[key]; fill = [d0[kk], d0[kk + 1], d0[kk + 2]]; }
      }
    }
    for (y = 0; y < h; y++) {
      var t = Math.round(TEETH[y % 6] * A / 2), top = fill ? L : L - A, inBand = !!fill && y >= L, e0 = w, e1 = -1;
      if (inBand) for (x = 0; x < w; x++) if (d0[(y * w + x) * 4 + 3] >= 128) { if (x < e0) e0 = x; e1 = x; }
      for (x = 0; x < w; x++) {
        var above = y < top + (fill ? 0 : Math.round(TEETH[x % 6] * A / 2));   /* 그릇 띠가 있으면 윗줄은 곧게 (그릇 뒤 테가 들쭉날쭉하지 않게) */
        if (!above && !(inBand && x >= e0 + 2 && x <= e1 - 2 && y + 3 < h && d0[((y + 3) * w + x) * 4 + 3] >= 128)) continue;   /* 앞 테 (아래 세 칸 안에 그림 끝) 는 그대로 */
        var hit = false;
        for (var q = 0; q < 4 && !hit; q++) {
          if (!gone[q]) continue;
          var lo = B.x0 + Math.floor(span * q / 4) - (q > 0 && !gone[q - 1] ? t : 0), hi = B.x0 + Math.floor(span * (q + 1) / 4) + (q < 3 && !gone[q + 1] ? t : 0);
          if (q === 0) lo = 0; if (q === 3) hi = w;
          hit = x >= lo && x < hi;
        }
        if (!hit) continue;
        var o4 = (y * w + x) * 4;
        if (above) {   /* 둥근 접시의 뒤쪽 반: 띠 가운데를 축으로 접은 자리에 그릇이 있으면 그릇으로 남긴다 (가장자리 두 칸은 그 자리 색 = 테두리) */
          var ym = fill ? Math.round(L + yb - y) : -1, keepIt = false;
          if (ym > yb && ym < h && d0[(ym * w + x) * 4 + 3] >= 128) {
            var m0 = w, m1 = -1, xx; for (xx = 0; xx < w; xx++) if (d0[(ym * w + xx) * 4 + 3] >= 128) { if (xx < m0) m0 = xx; m1 = xx; }
            var mk = (ym * w + x) * 4, rim = x < m0 + 2 || x > m1 - 2 || ym >= h - 1 || d0[((ym + 1) * w + x) * 4 + 3] < 128;
            out[o4] = rim ? d0[mk] : fill[0]; out[o4 + 1] = rim ? d0[mk + 1] : fill[1]; out[o4 + 2] = rim ? d0[mk + 2] : fill[2]; out[o4 + 3] = 255; keepIt = true;
          }
          if (!keepIt) out[o4 + 3] = 0;
        } else if (out[o4 + 3] >= 128) { out[o4] = fill[0]; out[o4 + 1] = fill[1]; out[o4 + 2] = fill[2]; }
      }
    }
    return out;
  }
  /* 11-22 (독립 점검): 한 입은 음식만 줄인다 — 그릇 · 소스 그릇 · 젓가락 · 꼬치 막대는 그대로. 갈래 A 의 그림 색으로 가른다 (요리마다 표):
     keep = 그릇 · 도구 · 소스 색 (안 먹힌다), out = 외곽선 · 겹치는 어두운 색 (곁에 남는 것이 있으면 남고, 아니면 같이 사라진다), 나머지 = 음식.
     한 입 = 음식이 있는 가로 폭의 4분의 1 (나는 오른쪽부터 · 문어는 왼쪽부터), 큰 그림은 경계가 이빨 자국처럼 들쭉날쭉 */
  var BITE_COL = deepFreeze({
    jeon: { keep: ['e8c170', 'de9e41', 'ad7757', '7a4841', 'd7b594', '4d2b32', 'ebede9', 'a8b5b2', '253a5e', '2e0c07', '3c5e8b', 'c2481c', 'fffef2'], out: ['602c2c', '341c27', '884b2b', 'be772b', '10160b'] },
    gyeran: { keep: ['ebede9', 'a4dddb', '253a5e', '73bed3', 'c7cfcc', 'a8b5b2', '3c5e8b', '4f8fba', 'ee2b2b', 'a0123a', '752438', '86d838', '3ea32f', 'd4f56c', '1b5b2b'], out: ['602c2c', '341c27', '884b2b'] },
    jumeokbap: { keep: ['a8ca58', '75a743', '468232', '25562e', 'd0da91', '19332d'], out: ['602c2c', '341c27', '7a4841', '4d2b32'] },
    kkochi: { keep: ['a4dddb', '73bed3', '4f8fba', '253a5e', '3c5e8b', 'ebede9', 'de9e41', 'e8c170'], out: ['602c2c', '341c27', '884b2b', 'be772b'] },
    cake: { keep: ['ebede9', 'a4dddb', '253a5e', 'df84a5', 'c7cfcc', 'a8b5b2', '3c5e8b', 'c65197'], out: ['602c2c', '341c27', '4d2b32', '7a4841'] }
  });
  function hex6(d, k) { return ((1 << 24) + (d[k] << 16) + (d[k + 1] << 8) + d[k + 2]).toString(16).slice(1); }
  function biteFood(spr, eaten, picId, amp, empty) {   /* empty = 다 먹은 그릇 그림 (같은 크기) 이 있으면 지운 자리에 그것이 보인다 (갈래 A 'empty.<id>') */
    if (!sprOK(spr)) return null;
    var tab = typeof picId === 'string' && has(BITE_COL, picId) ? BITE_COL[picId] : null;
    if (!tab) return biteMask(spr, eaten, undefined, amp);   /* 표가 없는 그림: 예전 규칙 */
    var w = spr.w, h = spr.h, d = spr.d, out = new Uint8ClampedArray(d.length > w * h * 4 ? d.subarray(0, w * h * 4) : d);
    if (!Array.isArray(eaten) || !eaten.length) return out;
    var E = sprOK(empty) && empty.w === w && empty.h === h ? empty.d : null;
    var kind = new Uint8Array(w * h), x0 = w, x1 = -1, x, y, i, j, k;   /* 0 빈칸 · 1 남김 · 2 외곽 · 3 음식 */
    for (i = 0; i < w * h; i++) {
      k = i * 4; if (d[k + 3] < 128) continue;
      var c = hex6(d, k);
      kind[i] = tab.keep.indexOf(c) >= 0 ? 1 : tab.out.indexOf(c) >= 0 ? 2 : 3;
      if (kind[i] === 3) { x = i % w; if (x < x0) x0 = x; if (x > x1) x1 = x; }
    }
    if (x1 < x0) return out;
    var A = amp === 0 ? 0 : amp === 1 ? 1 : 2, span = x1 - x0 + 1, gone = [false, false, false, false];
    eaten.forEach(function (q) { if (q === 0 || q === 1 || q === 2 || q === 3) gone[q] = true; });
    function hit(x, y) {
      var t = Math.round(TEETH[y % 6] * A / 2);
      for (var q = 0; q < 4; q++) {
        if (!gone[q]) continue;
        var lo = q === 0 ? -1 : x0 + Math.floor(span * q / 4) - (gone[q - 1] ? 0 : t), hi = q === 3 ? w + 1 : x0 + Math.floor(span * (q + 1) / 4) + (q < 3 && !gone[q + 1] ? t : 0);
        if (x >= lo && x < hi) return true;
      }
      return false;
    }
    if (E && gone[0] && gone[1] && gone[2] && gone[3]) return new Uint8ClampedArray(E.subarray ? E.subarray(0, w * h * 4) : E);   /* 네 입 다 = 다 먹은 그릇 그림 그대로 */
    function nb(i, fn) { var x = i % w, y = (i - x) / w; for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { var xx = x + dx, yy = y + dy; if ((dx || dy) && xx >= 0 && yy >= 0 && xx < w && yy < h && fn(yy * w + xx)) return true; } return false; }
    var left = new Uint8Array(w * h), ate = new Uint8Array(w * h);
    for (i = 0; i < w * h; i++) { left[i] = kind[i]; if ((kind[i] === 3 || (E && kind[i] === 2)) && hit(i % w, (i - i % w) / w)) { left[i] = 0; ate[i] = 1; } }   /* 빈 그릇 그림이 있으면 먹은 칸의 테도 그 그림으로 (그 그림에 그릇 테가 제자리에 있다) */
    /* 외곽선: 먹힌 음식에 닿아 있고, 곁에 남는 것 (그릇 · 남은 음식) 이 없을 때만 같이 사라진다 — 간장 속처럼 음식에 안 닿은 어두운 칸은 그대로 */
    for (i = 0; i < w * h; i++) {
      if (kind[i] !== 2) continue;
      if (nb(i, function (j) { return ate[j] === 1; }) && !nb(i, function (j) { return left[j] === 1 || left[j] === 3; })) { left[i] = 0; ate[i] = 1; }
    }
    /* 떠 있는 것: 처음엔 음식에 닿아 있다가 이제 음식에도 큰 그릇 덩이에도 닿지 않는 조각 (빈 젓가락 · 과일 뒤에서 끊긴 막대 끝) 은 치운다 */
    var comp = new Int32Array(w * h).fill(-1), sizes = [], keeps = [], foodNow = [], touched = [], stack = [];
    for (i = 0; i < w * h; i++) {
      if (!left[i] || comp[i] >= 0) continue;
      var id = sizes.length; sizes.push(0); keeps.push(0); foodNow.push(false); touched.push(false);
      comp[i] = id; stack.push(i);
      while (stack.length) {
        var a = stack.pop(); sizes[id]++; if (left[a] === 1) keeps[id]++; if (left[a] === 3) foodNow[id] = true;
        if (!touched[id] && nb(a, function (j) { return kind[j] === 3; })) touched[id] = true;
        nb(a, function (j) { if (left[j] && comp[j] < 0) { comp[j] = id; stack.push(j); } return false; });
      }
    }
    var main = -1; for (j = 0; j < keeps.length; j++) if (main < 0 || keeps[j] > keeps[main]) main = j;
    for (i = 0; i < w * h; i++) { var cc = comp[i]; if (cc >= 0 && cc !== main && !foodNow[cc] && touched[cc]) { left[i] = 0; ate[i] = 1; } }
    /* 지운 자리: 다 먹은 그릇 그림이 있으면 그것. 없으면 그릇 안쪽 (같은 줄 양쪽 · 같은 열 위아래에 그릇) 만 바로 아래 그릇 칸의 밝은 색으로, 나머지는 빈칸 */
    for (i = 0; i < w * h; i++) {
      if (!kind[i] || left[i]) continue;
      k = i * 4; x = i % w; y = (i - x) / w;
      if (E) { out[k] = E[k]; out[k + 1] = E[k + 1]; out[k + 2] = E[k + 2]; out[k + 3] = E[k + 3]; continue; }
      var src = -1, up = false, l = false, r = false, yy, xx;
      for (yy = y + 1; yy < h && src < 0; yy++) { j = yy * w + x; if (left[j] === 1 && d[j * 4] + d[j * 4 + 1] + d[j * 4 + 2] >= 330) src = j; else if (!kind[j]) break; }
      for (yy = y - 1; yy >= 0 && !up; yy--) { j = yy * w + x; if (left[j] === 1) up = true; else if (!kind[j]) break; }
      for (xx = x - 1; xx >= 0 && !l; xx--) { j = y * w + xx; if (left[j] === 1) l = true; else if (!kind[j]) break; }
      for (xx = x + 1; xx < w && !r; xx++) { j = y * w + xx; if (left[j] === 1) r = true; else if (!kind[j]) break; }
      if (src >= 0 && l && r) { out[k] = d[src * 4]; out[k + 1] = d[src * 4 + 1]; out[k + 2] = d[src * 4 + 2]; out[k + 3] = 255; }
      else out[k + 3] = 0;
    }
    return out;
  }
  MEAL.PICS = PICS; MEAL.pic = pic; MEAL.biteLine = biteLine; MEAL.biteMask = biteMask; MEAL.biteFood = biteFood; MEAL.BITE_COL = BITE_COL;

  MEAL._copy = { hashSeed: fnv1a, rng: mulberry32 };   /* 시험용: BRAIN 이 없을 때 쓰는 사본 */

  root.MEAL = MEAL;
  if (typeof module !== 'undefined' && module.exports) module.exports = MEAL;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
