/* js/recipes.js - 레시피 (전역 RECIPES). 11-21 7차 (주인: "카페에서 음식을 몇 번 먹으면 … 레시피를 선물하고, 그 메뉴를 집에서도 요리한다").
 *
 * 레시피 북의 요리 다섯 가운데 셋 (해초전 · 계란말이 · 주먹밥) 은 처음부터 열려 있고, 둘 (딸기 케이크 · 과일 꼬치) 은 카페에서 같은 것을
 * 세 번 먹으면 선물로 열린다. 이번 판 전에 부엌 수첩에 줄이 있던 사람은 과일 꼬치를 그대로 만들 수 있다 (만들던 요리를 빼앗지 않는다).
 *
 * - 순수 로직이다. DOM, 저장소, 시계, 타이머, Math.random 을 쓰지 않는다. node 에서도 그대로 로드된다. 날짜는 부르는 쪽이 넘긴다.
 * - 한번 열린 레시피는 다시 잠기지 않는다. 세는 수는 줄지 않는다. 시간 제한 · 놓치는 것 없음.
 * - 모르는 칸 · 모르는 id (나중 빌드) 는 그대로 둔다.
 *
 * 저장 모양 (localStorage ppolppol_v2 의 S.user.recipes):
 *   { <id>: { n: 카페에서 먹은 횟수, got: 'YYYY-MM-DD' | null (선물 받은 날), old?: true (이번 판 전부터 만들던 요리) } }
 */
(function (root) {
  'use strict';

  var IDS = Object.freeze(['jeon2', 'gyeran', 'jumeokbap2', 'kkochi2', 'cake']);
  var ALWAYS = Object.freeze(['jeon2', 'gyeran', 'jumeokbap2']);
  var GIFTS = Object.freeze(['cake', 'kkochi2']);   /* 카페 메뉴 → 선물 레시피 */
  var LEGACY = Object.freeze(['jeon', 'jumeokbap', 'kkochi']);   /* 이번 판 전의 요리 (북엔 없다) */
  var GIFT_AT = 3;
  var N_MAX = 9999;
  var DATE = /^\d{4}-\d{2}-\d{2}$/;

  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function count(v) { return typeof v === 'number' && isFinite(v) && v > 0 ? Math.min(N_MAX, Math.floor(v)) : 0; }
  function day(v) { return typeof v === 'string' && DATE.test(v) ? v : null; }

  /* 저장 값 → 쓸 수 있는 모양 (새 객체). 객체가 아닌 것만 버린다 · 모르는 id 와 모르는 칸은 그대로 */
  function normalize(state) {
    var out = {};
    if (!isObj(state)) return out;
    Object.keys(state).forEach(function (id) {
      var e = state[id];
      if (!isObj(e)) return;
      var c = {};
      Object.keys(e).forEach(function (k) { c[k] = e[k]; });
      c.n = count(e.n); c.got = day(e.got);
      out[id] = c;
    });
    return out;
  }
  function locked(st, id) { return GIFTS.indexOf(id) >= 0 && !(has(st, id) && (st[id].got || st[id].old === true)); }

  /* 카페에서 한 번 먹음 → { state (새 객체), n, gift }. gift 는 딱 한 번: 세 번째에, 그 레시피가 잠겨 있었을 때만.
     선물이 아닌 메뉴 (모르는 id · 늘 열린 요리) 는 세지 않는다 */
  function eat(state, id, today) {
    var st = normalize(state);
    if (GIFTS.indexOf(id) < 0) return { state: st, n: 0, gift: false };
    var e = has(st, id) ? st[id] : (st[id] = { n: 0, got: null });
    var was = locked(st, id);
    e.n = Math.min(N_MAX, e.n + 1);
    var gift = was && e.n >= GIFT_AT;
    if (gift) e.got = day(today) || e.got || '1970-01-01';   /* 날짜를 못 받아도 선물은 남는다 */
    return { state: st, n: e.n, gift: gift };
  }

  /* 북이 시작할 수 있는 요리 (IDS 차례). hadNotebook = 이번 판 전에 부엌 수첩에 줄이 있었다 → 과일 꼬치 */
  function unlocked(state, hadNotebook) {
    var st = normalize(state);
    return IDS.filter(function (id) {
      if (ALWAYS.indexOf(id) >= 0) return true;
      if (id === 'kkochi2' && hadNotebook) return true;
      return !locked(st, id);
    });
  }

  /* 부엌 수첩 (ppolppol_cook_v0 을 읽은 값) 에 이번 판 전의 줄이 있나 */
  function hadNotebook(store) {
    if (!isObj(store) || !Array.isArray(store.book)) return false;
    return store.book.some(function (l) { return isObj(l) && LEGACY.indexOf(l.recipe) >= 0; });
  }

  /* 두 탭: 큰 수 · 이른 선물 날 · old 는 어느 쪽에든 있으면. 선물은 잃지 않는다 */
  function merge(a, b) {
    var A = normalize(a), B = normalize(b), out = {};
    Object.keys(A).concat(Object.keys(B)).forEach(function (id) {
      if (has(out, id)) return;
      var x = has(A, id) ? A[id] : null, y = has(B, id) ? B[id] : null;
      if (!x || !y) { out[id] = x || y; return; }
      var c = {};
      Object.keys(y).forEach(function (k) { c[k] = y[k]; });
      Object.keys(x).forEach(function (k) { c[k] = x[k]; });
      c.n = Math.max(x.n, y.n);
      c.got = x.got && y.got ? (x.got < y.got ? x.got : y.got) : (x.got || y.got);
      if (x.old === true || y.old === true) c.old = true;
      out[id] = c;
    });
    return out;
  }
  function same(a, b) { return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b)); }

  var RECIPES = { IDS: IDS, ALWAYS: ALWAYS, GIFTS: GIFTS, LEGACY: LEGACY, GIFT_AT: GIFT_AT,
    normalize: normalize, eat: eat, unlocked: unlocked, hadNotebook: hadNotebook, merge: merge, same: same };
  if (typeof module !== 'undefined' && module.exports) module.exports = RECIPES;
  root.RECIPES = RECIPES;
})(typeof globalThis !== 'undefined' ? globalThis : this);
