/* js/cook.js -- the kitchen (wave 9, slice 1: jeon). One global COOK. No modules, file:// safe.
 *   Top half: DOM-free simulation. It runs in a node vm (tools/test-cook.js): no clock and no random calls,
 *   so the same events give the same run at any frame rate. Bottom half (after the 'live' marker): the dialog.
 *   docs/COOK_PROTO.md: recipe table, TUNE numbers, sound acts, how to hook into the main game.
 *
 * ======================= CONTRACT (for the live half and js/cook-art.js) =======================
 * UNITS  logical px: the stage is 288 x 320 (input x/y and all st geometry). art px = logical / 2 (stage 144 x 160;
 *   drawing and every look value). Time: integer ms (the sim rounds what it is given). Angles: degrees, a positive
 *   angle turns clockwise on screen (y grows downward).
 * CLOCK  Give tick/input a visible clock: vis = base + (now - since), frozen while the tab is hidden. Best: one clock
 *   that never resets (the sim keeps each step's origin in run.t0; step clock = t - run.t0). A clock that restarts at
 *   0 when run.si changes also works: a backward jump re-bases run.t0 / run.doneAt, the step clock just continues.
 *   ?slow=4 = pass vis / 4. The first tick/input after createRun/resumeRun sets the origin of the first step.
 * LOOP   every frame: COOK.tick(run, vis); evs = COOK.drain(run) -> juice / sound / aria; draw from run.st.
 *   every pointer sample (coalesced samples in order): rec = COOK.input(run, ev). input() ticks to ev.t first
 *   (tick-then-input), so calling tick yourself before it is allowed and changes nothing (tick is idempotent).
 *   ev = { t: vis ms, k: 'd'|'m'|'u'|'c'|'b', x, y: logical px, p: 't'|'m'|'n', id: pointerId }.
 *   k 'c' with no id cancels every open pointer (send it on hidden and on shown again). k 'b' = verb button.
 *   The sim applies: the TUNE.gateMs gate for new pointers and 'b'; only pointers pressed in this step count;
 *   flip and slice follow the first finger only; tap counts every pointerdown. The host applies TUNE.edgeCss.
 *   rec = { si, t (step clock), k, x, y, p, id } or null. ?rec=1: push rec into window.__cookRec =
 *   { recipe, seed, steps: [[rec minus si, ...] per si], pot (the saved pot of a resumed dish, else null) };
 *   COOK.simulate(recipe, seed, steps, { pot }) replays it.
 * RUN    plain JSON (JSON round trip gives an equal object). Read it, never write it.
 *   v 1, ver VERSION, id 'ck_...', recipe 'jeon', seed uint32, swaps { herb: 'parae'|'tot' }, plate 0..2,
 *   n steps, si current step 0..n-1 (n once revealed), phase 'step' | 'between' (a step just finished, inputs
 *   ignored for COOK.betweenOf(kind): TUNE.betweenMs, a flip TUNE.flip.betweenMs) | 'reveal' (dish done), done (true once the last step is finished, already in
 *   its 'between'), t0 / t / doneAt (caller clock ms), looks[] + tags[] (one per finished step), st (current step
 *   state; in 'between' and 'reveal' the finished one), ptr (internal), ev (queue: use COOK.drain).
 * STEP STATE (run.st) shared: kind, progress 0..1 (never falls), half, done, doneT (step ms), tag, prog (step ms
 *   of the last progress; idle hints count from here), box [x, y, w, h] art px of the food box on the stage
 *   ([40, 62, 64, 48]: food centre (72, 86) - [32, 24], same as cook-art GEO.box0).
 *   tap:   marks [{ x, y (logical), n 0..per }] (draw left = per - n), per 3, need 9, hits 0..9, dents [[x, y]]
 *          food box px (0 <= x < 64, 0 <= y < 48; at most 9; stage art px = box[0] + x, box[1] + y), shape 0..2
 *          (batter: lump / half spread / round flat; it grows at hits 3 and 6; outline radii rx[shape], ry[shape]),
 *          press { id, x, y, next } held finger or null, last (step ms of the last counted hit).
 *   flip:  heat (bool), heatAt (step ms) or null, band 0..2 colour now (0 soft, 1 golden, 2 crisp; it rises every
 *          bandMs after heat-on and waits at 2), res (band it was flipped at) or null, bandMs 3000,
 *          stroke { id, x0, y0, t0, b0 } or null. The jeon colour on screen is band (res once flipped).
 *   slice: lines [{ ax, ay, bx, by (logical), len (A to B, logical: the food's size along the line + 3 art px at
 *          each end, at most 128), ux, uy, off (art px, -4..4), bins [0|1 x 40] knife score along
 *          A to B, n painted bins, cut (bool), how null|'drag'|'cross'|'b', ang (cut angle, multiple of 6,
 *          -30..30), ws, as (internal) }], cur (lit guide; one at a time), band (half width, logical px),
 *          hand { x, y } logical ints of the knife hand or null, pen (internal).
 * LOOK   ints only, set when a step finishes. run.looks[si]: tap { dents }, flip { band }, slice { cuts, offs }.
 *   COOK.lookOf(run) merges them: { v: 1, dents, band, cuts, offs, plate }. Dents are food box px (64 x 48);
 *   cuts[i] is the angle of cut i against its guide (line 0 horizontal, line 1 vertical: cook-art GEO.cross),
 *   offs[i] the guide's offset in art px across the line (down for line 0, right for line 1).
 * EVENTS COOK.drain(run) -> [{ type, si, ... }]. snd = the payload for AUDIO.on('cook', snd); say = aria text.
 *   run:   start { kind, say }, step { kind, tag, snd step }, quiet { snd quiet } (after every step), reveal { dish,
 *          say (plate description), snd done }.
 *   tap:   hit { i 0..8, m mark, x, y, auto, b, snd tap }, pat { x, y } (merged within 90 ms), dust { x, y } (off the
 *          food), shape { n }, half { say }, done { tag, say }.
 *   flip:  heat { band 0, say, snd sizzle }, band { band, say, snd sizzle }, nudge {} (a press after heat-on: the
 *          jeon hops 1 frame), flip { band, lift 1..3 (arc height), snd flip }, half {}, done { tag, say }.
 *   slice: score { i, n } (new knife score), cut { i, ang, how, say?, snd cut }, line { i } (next guide lit),
 *          half {}, done { tag, say }.
 *   Juice for every event is live/art work (TUNE.juice). The sim never emits failure or miss events.
 * HELPERS COOK.verb(run) button label, COOK.hintAt(run) step ms when the idle ghost hand is due (null = none),
 *   COOK.describe(recipe, tags), COOK.potOf(run, at), COOK.resumeRun(pot), COOK.resultOf(run, { madeAt, day }),
 *   COOK.bookLine(result), COOK.normStore(obj), COOK.bookAdd(store, line), COOK.seedFor(day, dayN),
 *   COOK.runIdFor(day, dayN, nonce) (nonce: random or a counter, never a clock), COOK.fxSeed(seed, si)
 *   (particles: COOK.mulberry32(..) gives uint32).
 * ART    COOK.drawDish(recipe, look, seed, w, h) -> { w, h, d: Uint8ClampedArray } never throws (default 96 x 66).
 *   If a global COOK_ART.dish exists it paints a blank img of that size in place: COOK_ART.dish(img, look, { herb,
 *   recipe, seed, swaps }) with a checked look (COOK_ART.dishSmall instead when img is smaller than COOK_ART.GEO.dish).
 *   If the painter throws, a plain stub dish is drawn (Apollo colours only, integer geometry).
 * =================================================================================================
 */
var COOK = (function () {
  'use strict';
  var VERSION = 'cook-1';

  /* ---------- TUNE: every number in one place. pot.tune = hash32(JSON.stringify(TUNE)): any change here quietly
     drops a half-made dish saved by an older build (it is at most one step, so nothing is lost). ---------- */
  var TUNE = deepFreeze({
    stage: { w: 288, h: 320, scale: 2, edge: 8 },   /* logical px; art px = logical / scale; targets sit >= edge art px inside */
    food: {   /* art px on the stage (= js/cook-art.js GEO.food / GEO.box0): centre, food box w x h (dents are box px),
                 outline radii per batter stage (lump / half / round flat), dents sit >= inset px inside the outline */
      batter: { cx: 72, cy: 86, w: 64, h: 48, rx: [21, 25, 29], ry: [14, 16, 19], inset: 3 },
      jeon: { cx: 72, cy: 86, w: 64, h: 48, rx: [29], ry: [19], inset: 3 }   /* same box as the batter: dents carry over */
    },
    dish: { w: 96, h: 66 },   /* drawDish() default buffer (= cook-art GEO.dish) */
    gateMs: 250,        /* a step ignores new pointers and the verb button for its first 250 ms */
    titleMs: 600,       /* title tag (live): 600 ms, a tap dismisses it */
    betweenMs: 400,     /* finished step: last mark + 'step' sound, then the next step starts (flip: flip.betweenMs) */
    idleMs: 5000,       /* no progress for 5 s: one ghost hand (live; on touch the verb button shows from then on) */
    edgeCss: 24,        /* live: a touch that starts within 24 CSS px of the screen's left/right edge is ignored */
    fps: 12,            /* stepped reactions: squash, steam, bubbles, particles */
    reveal: { frames: 6, stepPx: 2, focusMs: 450 },  /* plate rises 6 frames at 12 fps, 2 art px a frame; focus after 450 ms */
    calmMs: 500,        /* live: back on the counter, a press that began within 500 ms (a double tap on the plate) starts nothing */
    sndGapMs: 120,      /* live: the same act at most every 120 ms (except tap, step, done, pick, quiet; tap is already 90 ms apart) */
    simTail: 3000,      /* simulate(): keep ticking this long after a step's last event (a held finger keeps tapping) */
    tap: {
      reach: 80,        /* logical px from the nearest unfinished mark; farther = a dust speck, not counted */
      mergeMs: 90,      /* two counted taps closer than 90 ms are one (no penalty) */
      holdMs: 400,      /* held finger: first auto tap 400 ms after the press ... */
      everyMs: 250,     /* ... then every 250 ms, on a fixed schedule with catch-up (frame rate free) */
      at: [[-14, -5], [15, -6], [1, 8]],  /* mark spots, art px from the food centre (= cook-art GEO.markBase) */
      jitter: 3,        /* seeded +-3 art px per mark (stays on the drawn batter) */
      shapeAt: [3, 6],  /* the batter spreads one stage at hit 3 and at hit 6 */
      dents: 9,         /* at most 9 dents */
      catchUp: 40       /* tick() catches up at most 40 auto taps (10 s of hold) per call, then skips ahead on the same grid */
    },
    flip: {
      bandMs: 3000,     /* after heat-on: soft 0-3 s, golden 3-6 s, crisp from 6 s on (it waits there) */
      flick: 32,        /* an upward stroke of >= 32 logical px from where it was pressed ... */
      cone: 45,         /* ... within +-45 deg of straight up flips; speed does not matter */
      lift: [0.5, 1.2], /* arc height (art only): px per ms of the flick; below 0.5 = 1, below 1.2 = 2, else 3 */
      crispHintMs: 5000,/* after heat-on the only idle hint is 5 s after crisp */
      teach: 3,         /* live: 3 presses after heat-on that do not flip -> the up-swipe hand once more (not an idle hint) */
      betweenMs: 1000   /* the flipped jeon stays in the pan this long before the board: the arc lands at 250 ms, then about
                           750 ms (9 frames) of the landing burst, boil and steam in the pan (betweenOf) */
    },
    slice: {
      len: 128,         /* longest guide, logical px (64 art px); the band below is sized from it */
      over: 3,          /* a guide reaches 3 art px past the food at each end: (radius + 3) x 2 along its own axis, at most
                           len (jeon: 64 art px across, 44 down), so a stroke over the whole food cuts the line */
      bins: 40,         /* the guide is split into 40 bins ... */
      cover: 0.8,       /* ... a line is cut at 80 % of them */
      bandMin: 24,      /* band half width = max(24, 0.25 x len) */
      bandK: 0.25,
      axis: 40,         /* a pair of samples paints only when it moves within +-40 deg of the guide axis */
      step: 4,          /* spatial resampler: keep a sample only after 4 logical px of travel */
      cross: [0.15, 0.85],   /* a stroke crossing the guide inside 15-85 % of its length ... */
      crossDeg: 50,     /* ... at >= 50 deg cuts the whole line, straight */
      crossMin: 16,     /* the crossing chord must be >= 16 px long (a tap is not a cut) */
      hist: 6,          /* the crossing chord starts up to 6 kept samples back */
      dirSegs: 4,       /* direction of travel = chord over the last 4 kept segments (about 16 px): finger jitter does not stop the paint */
      lsMin: 4,         /* least-squares angle from 4 samples up; fewer = first to last point */
      angStep: 6,       /* cut angle rounds to 6 deg steps ... */
      slant: 12,        /* ... |angle| >= 12 = slanted, else straight */
      angMax: 30,       /* drawn cut angle stays within +-30 deg */
      jitter: 4,        /* seeded +-4 art px guide offset */
      gap: 16           /* parallel guides (no cross): 16 art px apart */
    },
    juice: { rim: 1, squash: 2, parts: [3, 6], life: [4, 6], shake: 1, shakeFrames: 2, hop: 1 },   /* frames at 12 fps / art px (live) */
    book: { max: 300, show: 30 },   /* notebook keeps the newest 300 lines (the screen, later, shows 30) */
    pot: { maxBytes: 2048 }
  });

  /* ---------- WORDS: every Korean string the kitchen shows or says (only the design's vocabulary, KS X 1001) ---------- */
  var WORDS = deepFreeze({
    kitchen: '부엌', close: '닫기', back: '돌아가기', resume: '이어서', go: '보러 가기',
    dish: { jeon: '해초전' },
    title: { tap: '톡톡', flip: '뒤집기', slice: '썰기' },
    verb: { tap: '톡톡', heat: '불 켜기', flip: '뒤집기', slice: '썰기', again: '다시' },
    band: ['보들보들', '노릇노릇', '바삭바삭'],
    half: '반쯤', line: '한 줄', done: '다 됐어',
    cooked: ['보들보들하게 구웠어', '노릇노릇 구웠어', '바삭바삭하게 구웠어'],
    cut: { straight: '반듯하게 썰었어', slant: '어슷하게 썰었어' }
  });

  /* ---------- RECIPES: pure data; ids are ASCII. Slice 2 adds miyeok (at 'pot': slice, stir, place) and
     jumeokbap (at 'jar': stir, tap, place) here in the same shape, once KIND.stir and KIND.place exist. ---------- */
  var RECIPES = deepFreeze([
    { id: 'jeon', tier: 1, at: 'pan', ings: ['batter'], swap: { herb: ['parae', 'tot'] }, steps: [
      { kind: 'tap', marks: 3, hits: 3, food: 'batter' },
      { kind: 'flip', band: 3000 },
      { kind: 'slice', lines: 2, cross: true, food: 'jeon' }] }
  ]);
  /* counter props that work now, in focus order (the counter draws only these; slice 2 adds pot and jar) */
  var PROPS = deepFreeze([{ id: 'pan', recipe: 'jeon' }]);
  var BANDS = ['soft', 'golden', 'crisp'];
  var TUNE_HASH = hash32(JSON.stringify(TUNE));

  /* ---------- small helpers ---------- */
  function deepFreeze(o) {
    if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); Object.keys(o).forEach(function (k) { deepFreeze(o[k]); }); }
    return o;
  }
  function hash32(str) { str = String(str); var h = 0x811c9dc5; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; }
  function mulberry32(a) {   /* uint32 per call (no division) */
    a = a >>> 0;
    return function () { a = (a + 0x6D2B79F5) | 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return (t ^ (t >>> 14)) >>> 0; };
  }
  function num(v) { return typeof v === 'number' && isFinite(v) ? (v === 0 ? 0 : v) : null; }   /* finite number, never -0 */
  function z(v) { return v === 0 ? 0 : v; }                                                       /* -0 -> 0 (JSON keeps no -0) */
  function ri(v) { return Math.round(v) + 0; }
  function isInt(v) { return typeof v === 'number' && isFinite(v) && Math.floor(v) === v; }
  function clampInt(v, lo, hi, dflt) { return isInt(v) ? Math.max(lo, Math.min(hi, v)) : dflt; }
  function dist(ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); }
  function clone(o) { return o == null ? null : JSON.parse(JSON.stringify(o)); }
  function toU32(seed) {
    if (typeof seed === 'number' && isFinite(seed)) return seed >>> 0;
    if (typeof seed === 'string' && /^\d{1,10}$/.test(seed)) return Number(seed) >>> 0;
    return hash32(String(seed));
  }
  function emit(q, type, extra) {
    var e = { type: type };
    if (extra) for (var k in extra) if (extra[k] !== undefined && extra[k] !== null) e[k] = extra[k];
    q.ev.push(e);
    return e;
  }
  var DAY_RE = /^\d{4}-\d{2}-\d{2}$/, ID_RE = /^ck_[0-9a-z]{1,13}$/;

  /* ---------- seeds ---------- */
  function seedFor(day, dayN) { return hash32(day + '|cook|' + dayN); }
  /* run id: nonce = a per-dish random number (crypto) or a per-device counter, never a clock: an id next to madeAt
     must not give away how long the dish took (design 4.1: no time anywhere in the result or the book) */
  function runIdFor(day, dayN, nonce) { return 'ck_' + hash32(day + '|' + dayN + '|' + nonce).toString(36); }
  function stepSeed(seed, si) { return hash32(seed + '|' + si); }
  function fxSeed(seed, si) { return hash32('cook|' + seed + '|' + si + '|fx'); }
  function recipe(id) { for (var i = 0; i < RECIPES.length; i++) if (RECIPES[i].id === id) return RECIPES[i]; return null; }
  function swapsFor(r, seed) {
    r = typeof r === 'string' ? recipe(r) : r;
    var out = {}; if (!r || !r.swap) return out;
    Object.keys(r.swap).sort().forEach(function (k) { var list = r.swap[k]; out[k] = clone(list[hash32(toU32(seed) + '|swap|' + k) % list.length]); });
    return out;
  }
  function plateFor(seed) { return hash32(toU32(seed) + '|plate') % 3; }
  function ingredientsOf(r, swaps) {
    var out = r.ings.slice();
    Object.keys(swaps || {}).sort().forEach(function (k) { out = out.concat(swaps[k]); });
    return out;
  }
  function boxOf(food) { return [food.cx - (food.w >> 1), food.cy - (food.h >> 1), food.w, food.h]; }

  /* ---------- shared step state ---------- */
  function base(kind, o) {
    var st = { kind: kind, progress: 0, half: false, done: false, doneT: null, tag: null, prog: 0, ev: [] };
    for (var k in o) st[k] = o[k];
    return st;
  }
  /* progress only rises; 'half' and 'done' fire once each */
  function rise(st, to, t) {
    if (st.done) return;
    to = to < 0 ? 0 : to > 1 ? 1 : to;
    if (!(to > st.progress)) return;
    st.progress = to;
    if (!st.half && to >= 0.5) { st.half = true; emit(st, 'half', KIND[st.kind].sayHalf ? { say: WORDS.half } : null); }
    if (to >= 1) { st.done = true; st.doneT = t; emit(st, 'done', { tag: st.tag, say: WORDS.done }); }
  }

  var KIND = {};

  /* ---------- KIND.tap: pat the batter flat. 3 marks x 3 hits, any finger, any speed, hold works too ----------
   * Every pointerdown counts (two fingers alternating overlap by tens of ms). The nearest unfinished mark within
   * reach takes the hit. A held finger (the latest pressed) auto-taps on a fixed schedule from holdMs, every
   * everyMs, caught up by tick(): the same samples give the same dents at any frame rate. */
  function dentOf(st, x, y) {   /* fingertip -> food box px, pulled inside the batter outline as it is right now */
    var sc = TUNE.stage.scale, w = st.box[2], h = st.box[3], cx = w / 2, cy = h / 2, k = Math.min(st.shape, st.rx.length - 1);
    var ax = Math.max(1, st.rx[k] - st.inset), ay = Math.max(1, st.ry[k] - st.inset);
    var dx = x / sc - st.box[0] - cx, dy = y / sc - st.box[1] - cy, r = Math.sqrt((dx / ax) * (dx / ax) + (dy / ay) * (dy / ay));
    if (r > 1) { dx /= r; dy /= r; }
    return [(cx + (dx < 0 ? Math.ceil(dx) : Math.floor(dx))) | 0, (cy + (dy < 0 ? Math.ceil(dy) : Math.floor(dy))) | 0];
  }
  function tapHit(st, x, y, t, how) {
    if (st.done) return false;
    var T = TUNE.tap;
    if (how !== 'b' && st.last !== null && t - st.last < T.mergeMs) { emit(st, 'pat', { x: ri(x), y: ri(y) }); return false; }
    var best = -1, bd = 0;
    for (var i = 0; i < st.marks.length; i++) {
      var mk = st.marks[i]; if (mk.n >= st.per) continue;
      var d = dist(x, y, mk.x, mk.y); if (best < 0 || d < bd) { best = i; bd = d; }
    }
    if (best < 0) return false;
    if (bd > T.reach) { emit(st, 'dust', { x: ri(x), y: ri(y) }); return false; }
    st.marks[best].n++; st.hits++; st.last = t; st.prog = t;
    if (st.dents.length < T.dents) st.dents.push(dentOf(st, x, y));   /* before the shape grows: the dent is where it was pressed */
    emit(st, 'hit', { i: st.hits - 1, m: best, x: ri(x), y: ri(y), auto: how === 'auto', b: how === 'b', snd: { act: 'tap', i: st.hits - 1 } });
    var sh = st.hits >= T.shapeAt[1] ? 2 : st.hits >= T.shapeAt[0] ? 1 : 0;
    if (sh !== st.shape) { st.shape = sh; emit(st, 'shape', { n: sh }); }
    rise(st, st.hits / st.need, t);
    return true;
  }
  KIND.tap = {
    multi: true, sayHalf: true,
    init: function (step, seed, food) {
      var T = TUNE.tap, sc = TUNE.stage.scale, rng = mulberry32(seed), j = T.jitter, marks = [];
      var nm = clampInt(step.marks, 1, T.at.length, T.at.length), per = clampInt(step.hits, 1, 9, 3);
      for (var i = 0; i < nm; i++) {
        var ox = (rng() % (2 * j + 1)) - j, oy = (rng() % (2 * j + 1)) - j;
        marks.push({ x: (food.cx + T.at[i][0] + ox) * sc, y: (food.cy + T.at[i][1] + oy) * sc, n: 0 });
      }
      return base('tap', { box: boxOf(food), rx: (food.rx || [food.w >> 1]).slice(), ry: (food.ry || [food.h >> 1]).slice(), inset: food.inset || 0, marks: marks, per: per, need: per * nm, hits: 0, dents: [], shape: 0, last: null, press: null });
    },
    down: function (st, s) {
      if (st.done) return;
      st.press = { id: s.id, x: s.x, y: s.y, next: s.t + TUNE.tap.holdMs };   /* the latest pressed finger holds */
      tapHit(st, s.x, s.y, s.t, 'tap');
    },
    move: function (st, s) { if (st.press && st.press.id === s.id) { st.press.x = s.x; st.press.y = s.y; } },
    up: function (st, s) { if (st.press && st.press.id === s.id) st.press = null; },
    cancel: function (st, s) { if (!s || (st.press && st.press.id === s.id)) st.press = null; },
    tick: function (st, t) {
      var p = st.press, every = TUNE.tap.everyMs, n = 0;
      while (p && !st.done && t >= p.next) {
        if (++n > TUNE.tap.catchUp) { p.next += every * (Math.floor((t - p.next) / every) + 1); break; }   /* a huge time jump: skip ahead, same grid */
        tapHit(st, p.x, p.y, p.next, 'auto'); p.next += every;
      }
    },
    alt: function (st, t) {   /* one press = the next mark gets its 3 hits, dents at the mark centre */
      if (st.done) return;
      for (var i = 0; i < st.marks.length; i++) {
        var mk = st.marks[i];
        if (mk.n < st.per) { for (var k = st.per - mk.n; k > 0; k--) tapHit(st, mk.x, mk.y, t, 'b'); return; }
      }
    },
    look: function (st) { return { dents: clone(st.dents) }; },
    tag: function () { return null; }
  };

  /* ---------- KIND.flip: no target, no gauge. First press = heat on; the colour rises soft -> golden -> crisp every
   * bandMs and waits at crisp. An upward stroke (>= flick px, within cone of up) flips at the band of the moment it
   * was pressed. Taps never flip (a tap after heat-on only nudges the jeon). The press that turned the heat on does
   * not flip. Verb button: 1st = heat on, 2nd = flip at the band now. ---------- */
  function heatOn(st, t) {
    st.heat = true; st.heatAt = t; st.band = 0; st.prog = t;
    emit(st, 'heat', { band: 0, say: WORDS.band[0], snd: { act: 'sizzle', band: 0 } });
    rise(st, 0.5, t);
  }
  function doFlip(st, band, t, lift) {
    st.res = band; st.band = band; st.stroke = null; st.prog = t; st.tag = BANDS[band];
    emit(st, 'flip', { band: band, lift: lift, snd: { act: 'flip', band: band } });
    rise(st, 1, t);
  }
  function flick(st, s) {
    var k = st.stroke; if (!k || k.id !== s.id || st.done) return;
    var up = k.y0 - s.y, side = Math.abs(s.x - k.x0), F = TUNE.flip;
    if (up >= F.flick && Math.atan2(side, up) <= F.cone * Math.PI / 180 + 1e-9) {
      var v = up / Math.max(1, s.t - k.t0);
      doFlip(st, k.b0, s.t, v >= F.lift[1] ? 3 : v >= F.lift[0] ? 2 : 1);
    }
  }
  KIND.flip = {
    multi: false, sayHalf: false,
    init: function (step, seed, food) {
      return base('flip', { box: boxOf(food), bandMs: clampInt(step.band, 500, 60000, TUNE.flip.bandMs), heat: false, heatAt: null, band: 0, res: null, stroke: null });
    },
    down: function (st, s) {
      if (st.done) return;
      if (!st.heat) { heatOn(st, s.t); st.stroke = null; return; }
      emit(st, 'nudge', {});
      st.stroke = { id: s.id, x0: s.x, y0: s.y, t0: s.t, b0: st.band };
    },
    move: function (st, s) { flick(st, s); },
    up: function (st, s) { flick(st, s); if (st.stroke && st.stroke.id === s.id) st.stroke = null; },
    cancel: function (st) { st.stroke = null; },
    tick: function (st, t) {
      if (!st.heat || st.done) return;
      var nb = Math.min(BANDS.length - 1, Math.floor((t - st.heatAt) / st.bandMs));
      while (st.band < nb) { st.band++; emit(st, 'band', { band: st.band, say: WORDS.band[st.band], snd: { act: 'sizzle', band: st.band } }); }
    },
    alt: function (st, t) { if (st.done) return; if (!st.heat) heatOn(st, t); else doFlip(st, st.band, t, 2); },
    look: function (st) { return { band: st.res === null ? 0 : st.res }; },
    tag: function (st) { return st.res === null ? null : BANDS[st.res]; }
  };

  /* ---------- KIND.slice: follow the lit guide (any direction, any speed, lift and continue), or slash across it.
   * Follow: the guide has 40 bins; a pair of resampled samples inside the band, moving within +-axis deg of the guide,
   * paints the bins between their projections; 80 % painted = cut. Across: a stroke crossing inside 15-85 % of the
   * guide at >= crossDeg cuts the whole line, straight. Angle (the shape the hand leaves): principal axis (least
   * squares) of the in-band samples of each stroke part, weighted by its length along the guide, rounded to 6 deg;
   * |angle| >= 12 = slant. Step tag: 'slant' when at least half of the lines are slanted. ---------- */
  function sliceLine(ax, ay, bx, by, off) {
    var len = dist(ax, ay, bx, by), bins = [];
    for (var i = 0; i < TUNE.slice.bins; i++) bins.push(0);
    return { ax: ax, ay: ay, bx: bx, by: by, len: len, ux: z((bx - ax) / len), uy: z((by - ay) / len), off: off, bins: bins, n: 0, cut: false, how: null, ang: 0, ws: 0, as: 0 };
  }
  function proj(L, x, y) { var dx = x - L.ax, dy = y - L.ay; return { u: z(dx * L.ux + dy * L.uy), v: z(dy * L.ux - dx * L.uy) }; }
  function inBand(st, L, P) { return Math.abs(P.v) <= st.band && P.u >= -st.band && P.u <= L.len + st.band; }
  function subAdd(sub, P) {
    if (sub.n === 0) { sub.fu = P.u; sub.fv = P.v; sub.lo = P.u; sub.hi = P.u; }
    sub.n++; sub.su += P.u; sub.sv += P.v; sub.suu += P.u * P.u; sub.svv += P.v * P.v; sub.suv += P.u * P.v;
    sub.lu = P.u; sub.lv = P.v; if (P.u < sub.lo) sub.lo = P.u; if (P.u > sub.hi) sub.hi = P.u;
  }
  function subEnd(L, sub) {   /* fold one stroke part into the line's weighted angle */
    var S2 = TUNE.slice, phi = null, w = sub.hi - sub.lo;
    if (sub.n >= S2.lsMin) {
      var n = sub.n, mu = sub.su / n, mv = sub.sv / n;
      phi = 0.5 * Math.atan2(2 * (sub.suv / n - mu * mv), (sub.suu / n - mu * mu) - (sub.svv / n - mv * mv)) * 180 / Math.PI;
    } else if (sub.n >= 2 && (sub.lu !== sub.fu || sub.lv !== sub.fv)) {
      phi = Math.atan2(sub.lv - sub.fv, sub.lu - sub.fu) * 180 / Math.PI;
      if (phi > 90) phi -= 180; else if (phi <= -90) phi += 180;
    }
    if (phi === null || !(w > 0) || Math.abs(phi) > S2.axis) return;   /* parts that cross the band steeply do not steer the angle */
    L.ws = z(L.ws + w); L.as = z(L.as + w * phi);
  }
  function quantAng(phi) {
    var S2 = TUNE.slice, q = Math.round(phi / S2.angStep) * S2.angStep;
    return Math.max(-S2.angMax, Math.min(S2.angMax, q)) | 0;
  }
  function paint(L, a, b) {
    var N = L.bins.length, lo = Math.min(a, b), hi = Math.max(a, b), half = 0.5 / N, added = 0;
    for (var i = 0; i < N; i++) { var c = (i + 0.5) / N; if (!L.bins[i] && c >= lo - half && c <= hi + half) { L.bins[i] = 1; L.n++; added++; } }
    return added;
  }
  function sliceNeed() { return Math.ceil(TUNE.slice.bins * TUNE.slice.cover); }
  function sliceRise(st, t) {
    var cuts = 0, L = st.lines[st.cur];
    st.lines.forEach(function (l) { if (l.cut) cuts++; });
    rise(st, (cuts + (L && !L.cut ? Math.min(1, L.n / sliceNeed()) : 0)) / st.lines.length, t);
  }
  function cutLine(st, how, t) {
    var L = st.lines[st.cur], pen = st.pen;
    if (!L || L.cut) return;
    if (pen && pen.sub) { if (how === 'drag') subEnd(L, pen.sub); pen.sub = null; }
    L.cut = true; L.how = how;
    L.ang = how === 'drag' && L.ws > 0 ? quantAng(L.as / L.ws) : 0;   /* a slash across or the button cuts straight */
    for (var i = 0; i < L.bins.length; i++) L.bins[i] = 1;
    L.n = L.bins.length; st.prog = t;
    var cuts = 0, slants = 0;
    st.lines.forEach(function (l) { if (l.cut) { cuts++; if (Math.abs(l.ang) >= TUNE.slice.slant) slants++; } });
    var last = cuts >= st.lines.length;
    emit(st, 'cut', { i: st.cur, ang: L.ang, how: how, say: last ? null : WORDS.line, snd: { act: 'cut', i: st.cur } });
    if (last) st.tag = slants * 2 >= st.lines.length ? 'slant' : 'straight';
    else { st.cur++; if (pen) pen.nocross = true; emit(st, 'line', { i: st.cur }); }
    sliceRise(st, t);
  }
  function sliceSeg(st, px, py, qx, qy, t) {
    var L = st.lines[st.cur], pen = st.pen, S2 = TUNE.slice;
    if (!L || L.cut) return;
    var P = proj(L, px, py), Q = proj(L, qx, qy), inP = inBand(st, L, P), inQ = inBand(st, L, Q);
    if (inQ) {   /* in-band samples feed the angle; leaving the band closes the stroke part */
      if (!pen.sub) { pen.sub = { n: 0, su: 0, sv: 0, suu: 0, svv: 0, suv: 0, fu: 0, fv: 0, lu: 0, lv: 0, lo: 0, hi: 0 }; if (inP) subAdd(pen.sub, P); }
      subAdd(pen.sub, Q);
    } else if (pen.sub) { subEnd(L, pen.sub); pen.sub = null; }
    if (Math.abs(P.v) <= st.band && Math.abs(Q.v) <= st.band) {
      var hb = pen.hist[Math.max(0, pen.hist.length - S2.dirSegs)] || [px, py], mx = qx - hb[0], my = qy - hb[1], m = Math.sqrt(mx * mx + my * my);
      if (m < S2.step) { mx = qx - px; my = qy - py; m = Math.sqrt(mx * mx + my * my); }   /* a turn on the spot: use the last segment */
      if (m > 0 && Math.abs(mx * L.ux + my * L.uy) / m >= Math.cos(S2.axis * Math.PI / 180)) {
        var added = paint(L, P.u / L.len, Q.u / L.len);
        if (added) { st.prog = t; emit(st, 'score', { i: st.cur, n: added }); }
      }
    }
    if (!pen.nocross && ((P.v < 0 && Q.v >= 0) || (P.v > 0 && Q.v <= 0))) {
      var uc = P.u + (Q.u - P.u) * (P.v / (P.v - Q.v)), h0 = pen.hist[0];
      if (uc >= S2.cross[0] * L.len && uc <= S2.cross[1] * L.len && h0) {
        var cx = qx - h0[0], cy = qy - h0[1], cl = Math.sqrt(cx * cx + cy * cy);
        if (cl >= S2.crossMin && Math.abs(cx * L.ux + cy * L.uy) / cl <= Math.cos(S2.crossDeg * Math.PI / 180)) { cutLine(st, 'cross', t); return; }
      }
    }
    if (L.n >= sliceNeed()) cutLine(st, 'drag', t);
    else sliceRise(st, t);
  }
  function sliceSample(st, s) {
    var pen = st.pen; if (!pen) return;
    st.hand = { x: ri(s.x), y: ri(s.y) };
    if (st.done) return;
    if (pen.x !== null && dist(pen.x, pen.y, s.x, s.y) < TUNE.slice.step) return;   /* spatial resampler */
    var px = pen.x, py = pen.y;
    pen.x = s.x; pen.y = s.y;
    if (px !== null) sliceSeg(st, px, py, s.x, s.y, s.t);
    pen.hist.push([s.x, s.y]); if (pen.hist.length > TUNE.slice.hist) pen.hist.shift();
  }
  function sliceEnd(st) {
    var pen = st.pen; if (!pen) return;
    var L = st.lines[st.cur];
    if (pen.sub && L && !L.cut) subEnd(L, pen.sub);
    st.pen = null; st.hand = null;
  }
  KIND.slice = {
    multi: false, sayHalf: false,
    init: function (step, seed, food) {
      var S2 = TUNE.slice, sc = TUNE.stage.scale, rng = mulberry32(seed), n = clampInt(step.lines, 1, 3, 2), lines = [];
      var cx = food.cx * sc, cy = food.cy * sc, j = S2.jitter;
      var rx = food.rx ? food.rx[food.rx.length - 1] : food.w >> 1, ry = food.ry ? food.ry[food.ry.length - 1] : food.h >> 1;
      var hx = Math.min(S2.len, 2 * (rx + S2.over) * sc) / 2, hy = Math.min(S2.len, 2 * (ry + S2.over) * sc) / 2;   /* half guide, logical */
      for (var i = 0; i < n; i++) {
        var off = (rng() % (2 * j + 1)) - j;
        if (step.cross && n === 2) lines.push(i === 0 ? sliceLine(cx - hx, cy + off * sc, cx + hx, cy + off * sc, off) : sliceLine(cx + off * sc, cy - hy, cx + off * sc, cy + hy, off));
        else { var x = cx + ((2 * i - (n - 1)) * S2.gap / 2 + off) * sc; lines.push(sliceLine(x, cy - hy, x, cy + hy, off)); }
      }
      return base('slice', { box: boxOf(food), lines: lines, cur: 0, band: Math.max(S2.bandMin, S2.bandK * S2.len), hand: null, pen: null });
    },
    down: function (st, s) {
      sliceEnd(st);
      if (st.done) return;
      st.pen = { id: s.id, x: null, y: null, hist: [], sub: null, nocross: false };
      sliceSample(st, s);
    },
    move: function (st, s) { if (st.pen && st.pen.id === s.id) sliceSample(st, s); },
    up: function (st, s) { if (st.pen && st.pen.id === s.id) { sliceSample(st, s); sliceEnd(st); } },
    cancel: function (st, s) { if (!s || (st.pen && st.pen.id === s.id)) sliceEnd(st); },
    tick: function () {},
    alt: function (st, t) { if (!st.done) cutLine(st, 'b', t); },   /* one press = the lit line, cut straight */
    look: function (st) { return { cuts: st.lines.map(function (l) { return l.ang; }), offs: st.lines.map(function (l) { return l.off; }) }; },
    tag: function (st) { return st.tag; }
  };

  /* ---------- run state machine ---------- */
  /* how long a finished step of this kind stays on screen ('between') before the next one starts */
  function betweenOf(kind) { var k = TUNE[kind]; return k && typeof k.betweenMs === 'number' ? k.betweenMs : TUNE.betweenMs; }
  function initStep(run, si) {
    var r = recipe(run.recipe), step = r.steps[si], food = TUNE.food[step.food] || TUNE.food[r.id] || TUNE.food.jeon;
    return KIND[step.kind].init(step, stepSeed(run.seed, si), food);
  }
  function newRun(r, seed, id) {
    return { v: 1, ver: VERSION, id: typeof id === 'string' && ID_RE.test(id) ? id : 'ck_' + hash32(r.id + '|' + seed).toString(36),
      recipe: r.id, seed: seed, swaps: swapsFor(r, seed), plate: plateFor(seed), n: r.steps.length, si: 0, phase: 'step', done: false,
      t0: null, t: null, doneAt: null, looks: [], tags: [], st: null, ptr: { live: [], prim: null }, ev: [] };
  }
  function startEv(run) { var k = run.st.kind; emit(run, 'start', { si: run.si, kind: k, say: WORDS.title[k] }); }
  function createRun(recipeId, seed, opts) {
    try {
      var r = recipe(recipeId); if (!r) return null;
      var run = newRun(r, toU32(seed), opts && opts.id);
      run.st = initStep(run, 0); startEv(run);
      return run;
    } catch (e) { return null; }
  }
  /* move the step's events to the run queue (tagged with si); a finished step freezes its look and tag */
  function settle(run) {
    var st = run.st; if (!st) return;
    while (st.ev.length) { var e = st.ev.shift(); e.si = run.si; run.ev.push(e); }
    if (run.phase !== 'step' || !st.done) return;
    var K = KIND[st.kind];
    run.looks.push(K.look(st)); run.tags.push(K.tag(st));
    run.phase = 'between'; run.doneAt = run.t0 + st.doneT; run.ptr = { live: [], prim: null };
    if (run.looks.length >= run.n) run.done = true;
    emit(run, 'step', { si: run.si, kind: st.kind, tag: K.tag(st), snd: { act: 'step', kind: st.kind } });
    emit(run, 'quiet', { si: run.si, snd: { act: 'quiet' } });
  }
  function advance(run) {
    var start = run.doneAt + betweenOf(run.st.kind);
    run.doneAt = null; run.ptr = { live: [], prim: null };
    if (run.si + 1 >= run.n) {
      run.si = run.n; run.phase = 'reveal';
      emit(run, 'reveal', { si: run.n, dish: run.recipe, say: describe(run.recipe, run.tags), snd: { act: 'done', dish: run.recipe } });
      return;
    }
    run.si++; run.phase = 'step'; run.t0 = start;   /* exact origin: frame-rate free */
    run.st = initStep(run, run.si); startEv(run);
  }
  function tick(run, t) {
    if (!run || typeof run !== 'object' || !run.st) return run;
    t = num(t); if (t === null) return run;
    t = Math.round(t) + 0;
    if (run.t !== null && t < run.t) {   /* the caller's clock went back (restarted at 0, or an early sample): re-base it, */
      var back = t - run.t;              /* so the step clock (t - t0) never runs backwards and never stalls */
      if (run.t0 !== null) run.t0 += back;
      if (run.doneAt !== null) run.doneAt += back;
    }
    run.t = t;
    if (run.t0 === null) run.t0 = t;
    for (var guard = 0; guard <= run.n; guard++) {
      if (run.phase === 'step') { var K = KIND[run.st.kind]; if (K.tick) K.tick(run.st, t - run.t0); settle(run); }
      if (run.phase === 'between' && t >= run.doneAt + betweenOf(run.st.kind)) { advance(run); continue; }
      break;
    }
    return run;
  }
  function pid(v) { return typeof v === 'number' && isFinite(v) ? z(v) : typeof v === 'string' ? v.slice(0, 32) : 0; }
  function drop(list, id) { var i = list.indexOf(id); if (i >= 0) list.splice(i, 1); }
  function input(run, ev) {
    if (!run || typeof run !== 'object' || !run.st || !ev || typeof ev !== 'object') return null;
    var k = ev.k;
    if (k !== 'd' && k !== 'm' && k !== 'u' && k !== 'c' && k !== 'b') return null;
    var x = num(ev.x), y = num(ev.y);
    if ((k === 'd' || k === 'm' || k === 'u') && (x === null || y === null)) return null;
    var t = num(ev.t); if (t === null) t = run.t === null ? 0 : run.t;
    tick(run, t);
    t = run.t;
    var all = k === 'c' && ev.id == null, id = all ? null : pid(ev.id), p = ev.p === 't' || ev.p === 'm' ? ev.p : 'n';
    var rec = { si: run.si, t: t - run.t0, k: k, x: x === null ? 0 : x, y: y === null ? 0 : y, p: p, id: id };
    if (run.phase !== 'step') return rec;
    var st = run.st, K = KIND[st.kind], ptr = run.ptr, rel = t - run.t0, s = { x: rec.x, y: rec.y, t: rel, p: p, id: id };
    if (k === 'd') {
      if (rel < TUNE.gateMs) return rec;                                  /* step start: new pointers wait */
      if (!K.multi) { if (ptr.prim !== null && ptr.prim !== id) return rec; ptr.prim = id; }   /* one finger */
      if (ptr.live.indexOf(id) < 0) ptr.live.push(id);
      K.down(st, s);
    } else if (k === 'm' || k === 'u') {
      if (ptr.live.indexOf(id) < 0 || (!K.multi && ptr.prim !== id)) return rec;   /* only pointers pressed in this step */
      if (k === 'm') K.move(st, s);
      else { K.up(st, s); drop(ptr.live, id); if (ptr.prim === id) ptr.prim = null; }
    } else if (k === 'c') {
      if (all) { K.cancel(st, null); run.ptr = { live: [], prim: null }; }
      else if (ptr.live.indexOf(id) >= 0) { K.cancel(st, s); drop(ptr.live, id); if (ptr.prim === id) ptr.prim = null; }
    } else {
      if (rel < TUNE.gateMs) return rec;
      K.alt(st, rel);
    }
    settle(run);
    return rec;
  }
  function drain(run) { if (!run || !Array.isArray(run.ev)) return []; var out = run.ev; run.ev = []; return out; }

  /* ---------- replay: per-step event lists on each step's own clock, ticked at a fixed cadence ---------- */
  function feed(run, evs, opts) {
    if (!run || run.phase !== 'step') return run;
    opts = opts || {};
    var hz = num(opts.cadence), dt = 1000 / (hz && hz > 0 ? Math.max(1, Math.min(1000, hz)) : 60), si = run.si, list = Array.isArray(evs) ? evs : [];
    if (run.t0 === null) tick(run, num(opts.t0) === null ? 0 : opts.t0);
    var origin = run.t0, frame = run.t, last = run.t;
    function frames(until) {   /* frame ticks up to 'until'; stops where the next step would start */
      while (frame + dt <= until) {
        frame += dt;
        if (run.phase === 'between' && Math.round(frame) >= run.doneAt + betweenOf(run.st.kind)) return false;
        tick(run, frame);
      }
      return true;
    }
    for (var i = 0; i < list.length; i++) {
      var e = list[i], et = e && typeof e === 'object' ? num(e.t) : null;
      if (et === null) continue;
      var at = Math.max(last, Math.round(origin + et));
      if (run.phase === 'between' && at >= run.doneAt + betweenOf(run.st.kind)) break;   /* the rest belongs to no step */
      if (!frames(at)) break;
      input(run, { t: at, k: e.k, x: e.x, y: e.y, p: e.p, id: e.id });
      last = run.t;
    }
    if (run.phase === 'step' && run.si === si) {
      var end = Math.max(last + TUNE.simTail, origin + Math.max(0, Math.min(600000, num(opts.until) || 0)));   /* at most 10 min of ticks */
      frames(end);
      if (run.phase === 'step' && run.si === si) tick(run, end);
    }
    return run;
  }
  function summary(run) {
    var r = recipe(run.recipe);
    return { done: run.done, si: run.si,
      steps: r.steps.map(function (s, i) { return { kind: s.kind, status: i < run.tags.length ? 'done' : 'open', tag: i < run.tags.length ? run.tags[i] : null }; }),
      look: lookOf(run) };
  }
  /* simulate(recipeId, seed, steps, { cadence 1..1000 Hz, t0, until (<= 10 min), run, pot }) -> { done, si, steps, look }
     (+ run if opts.run). opts.pot (a saved pot, as in a ?rec=1 recording of a resumed dish) starts from resumeRun(pot):
     steps before pot.si stay empty and are skipped; recipe and seed must match the pot. */
  function simulate(recipeId, seed, steps, opts) {
    opts = opts || {};
    try {
      var run = opts.pot ? resumeRun(opts.pot) : createRun(recipeId, seed, opts.id ? { id: opts.id } : null);
      if (run && opts.pot && (run.recipe !== recipeId || run.seed !== toU32(seed))) run = null;
      if (!run) return { done: false, si: 0, steps: [], look: null };
      tick(run, num(opts.t0) === null ? 0 : opts.t0);
      var list = Array.isArray(steps) ? steps : [];
      for (var si = run.si; si < run.n; si++) {
        if (run.phase !== 'step' || run.si !== si) break;
        feed(run, list[si], opts);
        if (run.phase !== 'between') break;
        tick(run, run.doneAt + betweenOf(run.st.kind));
      }
      var out = summary(run);
      if (opts.run) out.run = run;
      return out;
    } catch (e) { return { done: false, si: 0, steps: [], look: null }; }
  }

  /* ---------- looks, results, words ---------- */
  function lookOf(run) {
    var out = { v: 1 };
    (run.looks || []).forEach(function (lk) { for (var k in lk) out[k] = clone(lk[k]); });
    out.plate = run.plate;
    return out;
  }
  function describe(recipeId, tags) {   /* plate description for screen readers: food facts only */
    var r = recipe(recipeId); if (!r) return '';
    var parts = [WORDS.dish[r.id]];
    r.steps.forEach(function (s, i) {
      var tg = tags && tags[i], b = BANDS.indexOf(tg);
      if (s.kind === 'flip' && b >= 0) parts.push(WORDS.cooked[b]);
      if (s.kind === 'slice' && WORDS.cut[tg]) parts.push(WORDS.cut[tg]);
    });
    return parts.join('. ') + '.';
  }
  function verb(run) {   /* the verb button label right now */
    if (!run || !run.st) return '';
    if (run.phase === 'reveal') return WORDS.verb.again;
    var st = run.st;
    if (st.kind === 'flip') return st.heat ? WORDS.verb.flip : WORDS.verb.heat;
    return WORDS.verb[st.kind] || '';
  }
  function hintAt(run) {   /* step ms when the idle ghost hand is due, or null (after heat-on: only crisp + 5 s) */
    if (!run || run.phase !== 'step' || !run.st || run.st.done) return null;
    var st = run.st;
    if (st.kind === 'flip' && st.heat) return st.heatAt + (BANDS.length - 1) * st.bandMs + TUNE.flip.crispHintMs;
    return st.prog + TUNE.idleMs;
  }
  /* result envelope: ms is always null, status only 'done'; no score, time or hand/button field anywhere */
  function resultOf(run, ctx) {
    try {
      if (!run || !run.done) return null;
      var r = recipe(run.recipe); if (!r || run.tags.length !== r.steps.length) return null;
      ctx = ctx || {};
      var madeAt = num(ctx.madeAt), day = typeof ctx.day === 'string' && DAY_RE.test(ctx.day) ? ctx.day : '';
      return { v: 1, id: run.id, by: 'user', game: 'cook', status: 'done', ms: null,
        out: { dish: { id: r.id, name: WORDS.dish[r.id], tier: r.tier, ingredients: ingredientsOf(r, run.swaps) },
          recipe: r.id, seed: run.seed, swaps: clone(run.swaps),
          steps: r.steps.map(function (s, i) { return { kind: s.kind, status: 'done', tag: run.tags[i] }; }),
          look: lookOf(run), madeAt: madeAt === null ? null : Math.round(madeAt), day: day } };
    } catch (e) { return null; }
  }
  function bookLine(result) {
    if (!result || !result.out) return null;
    var o = result.out;
    return { id: result.id, recipe: o.recipe, seed: o.seed, swaps: clone(o.swaps), look: clone(o.look), day: o.day, madeAt: o.madeAt };
  }

  /* ---------- saving: a pot holds only finished steps (resume restarts the current step) ---------- */
  function potOf(run, at) {
    if (!run || !run.st || run.done || run.phase === 'reveal') return null;
    var a = num(at);
    return { ver: VERSION, tune: TUNE_HASH, runId: run.id, seed: run.seed, recipe: run.recipe, swaps: clone(run.swaps),
      si: run.looks.length, looks: clone(run.looks), tags: run.tags.slice(), at: a === null ? null : Math.round(a) };
  }
  function isIntIn(v, lo, hi) { return isInt(v) && v >= lo && v <= hi; }
  function sameKeys(o, keys) { return o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).sort().join() === keys.slice().sort().join(); }
  function allOf(a, fn) {   /* like Array#every, but a hole in the array fails (every() skips holes) */
    if (!Array.isArray(a)) return false;
    for (var i = 0; i < a.length; i++) if (!(i in a) || !fn(a[i])) return false;
    return true;
  }
  function validLook(r, si, lk) {
    var step = r.steps[si], food = TUNE.food[step.food] || TUNE.food[r.id] || TUNE.food.jeon;
    if (step.kind === 'tap') {
      return sameKeys(lk, ['dents']) && Array.isArray(lk.dents) && lk.dents.length <= TUNE.tap.dents && allOf(lk.dents, function (d) {
        return Array.isArray(d) && d.length === 2 && allOf(d, function () { return true; }) && isIntIn(d[0], 0, food.w - 1) && isIntIn(d[1], 0, food.h - 1); });
    }
    if (step.kind === 'flip') return sameKeys(lk, ['band']) && isIntIn(lk.band, 0, BANDS.length - 1);
    if (step.kind === 'slice') {
      var n = clampInt(step.lines, 1, 3, 2), S2 = TUNE.slice;
      return sameKeys(lk, ['cuts', 'offs']) && Array.isArray(lk.cuts) && Array.isArray(lk.offs) && lk.cuts.length === n && lk.offs.length === n &&
        allOf(lk.cuts, function (a) { return isIntIn(a, -S2.angMax, S2.angMax) && a % S2.angStep === 0; }) &&
        allOf(lk.offs, function (o) { return isIntIn(o, -S2.jitter, S2.jitter); });
    }
    return false;
  }
  function validTag(kind, tg) {
    if (kind === 'tap') return tg === null;
    if (kind === 'flip') return BANDS.indexOf(tg) >= 0;
    if (kind === 'slice') return tg === 'straight' || tg === 'slant';
    return false;
  }
  /* resumeRun(pot | JSON text) -> run at the start of step pot.si, or null (old build, other tune, broken) */
  function resumeRun(pot) {
    try {
      if (typeof pot === 'string') pot = JSON.parse(pot);
      if (!pot || typeof pot !== 'object' || Array.isArray(pot)) return null;
      if (pot.ver !== VERSION || pot.tune !== TUNE_HASH) return null;
      var r = recipe(pot.recipe); if (!r) return null;
      if (!isIntIn(pot.seed, 0, 4294967295)) return null;
      var si = pot.si;
      if (!isIntIn(si, 0, r.steps.length - 1)) return null;
      if (!Array.isArray(pot.looks) || !Array.isArray(pot.tags) || pot.looks.length !== si || pot.tags.length !== si) return null;
      if (JSON.stringify(swapsFor(r, pot.seed)) !== JSON.stringify(pot.swaps)) return null;
      for (var i = 0; i < si; i++) if (!validLook(r, i, pot.looks[i]) || !validTag(r.steps[i].kind, pot.tags[i])) return null;
      if (pot.runId != null && !(typeof pot.runId === 'string' && ID_RE.test(pot.runId))) return null;
      var run = newRun(r, pot.seed, pot.runId);
      run.looks = clone(pot.looks); run.tags = clone(pot.tags); run.si = si;
      run.st = initStep(run, si); startEv(run);
      return run;
    } catch (e) { return null; }
  }
  /* the saved key: { v, day, dayN, seen, pot, book } (newest book line first, at most TUNE.book.max) */
  function normStore(o) {
    var out = { v: 1, day: '', dayN: 0, seen: [], pot: null, book: [] };
    try {
      if (typeof o === 'string') o = JSON.parse(o);
      if (!o || typeof o !== 'object' || Array.isArray(o)) return out;
      if (typeof o.day === 'string' && DAY_RE.test(o.day)) out.day = o.day;
      if (isIntIn(o.dayN, 0, 1e6)) out.dayN = o.dayN;
      if (Array.isArray(o.seen)) o.seen.forEach(function (k) { if (typeof k === 'string' && /^[a-z]{2,8}$/.test(k) && out.seen.indexOf(k) < 0 && out.seen.length < 8) out.seen.push(k); });
      if (o.pot && typeof o.pot === 'object' && !Array.isArray(o.pot)) out.pot = o.pot;   /* checked by resumeRun */
      if (Array.isArray(o.potOld)) {   /* 11-15: pots that could not be resumed, kept as they were (newest first, at most 4) */
        var old = o.potOld.filter(function (p) {
          if (!p || typeof p !== 'object' || Array.isArray(p)) return false;
          try { return utf8Len(JSON.stringify(p)) <= TUNE.pot.maxBytes; } catch (e) { return false; }
        }).slice(0, 4);
        if (old.length) out.potOld = old;
      }
      if (Array.isArray(o.book)) out.book = o.book.filter(function (l) {
        return l && typeof l === 'object' && typeof l.id === 'string' && typeof l.recipe === 'string' && isIntIn(l.seed, 0, 4294967295) && l.look && typeof l.look === 'object';
      }).slice(0, TUNE.book.max);
    } catch (e) { /* broken key: start empty */ }
    return out;
  }
  function utf8Len(str) {   /* UTF-8 bytes of a string (no TextEncoder in every sandbox) */
    var n = 0;
    for (var i = 0; i < str.length; i++) { var c = str.charCodeAt(i); n += c < 0x80 ? 1 : c < 0x800 ? 2 : c >= 0xd800 && c < 0xdc00 ? (i++, 4) : 3; }
    return n;
  }
  function bookAdd(store, line) {
    store = store && Array.isArray(store.book) ? store : normStore(store);
    if (!line || typeof line.id !== 'string') return store;
    store.book = [line].concat(store.book.filter(function (l) { return l && l.id !== line.id; })).slice(0, TUNE.book.max);
    return store;
  }

  /* ---------- dish picture: pixel buffer, integer geometry only (no trig: same pixels on every engine) ---------- */
  var HEX = {}, PLATES = [['#ebede9', '#a8b5b2'], ['#a4dddb', '#4f8fba'], ['#df84a5', '#a23e8c']];
  var JEON = ['#e8c170', '#de9e41', '#be772b'], JEON_EDGE = '#884b2b', HERB = { parae: ['#75a743', '#468232'], tot: ['#19332d', '#25562e'] };
  var TAN6 = [0, 108, 218, 333, 456, 591];   /* round(1024 x tan(k x 6 deg)), k = 0..5 */
  function rgb(h) { if (!HEX[h]) { var n = parseInt(h.slice(1), 16); HEX[h] = [n >> 16 & 255, n >> 8 & 255, n & 255]; } return HEX[h]; }
  function blank(w, h) { return { w: w, h: h, d: new Uint8ClampedArray(w * h * 4) }; }
  function put(img, x, y, h) {
    if (x < 0 || y < 0 || x >= img.w || y >= img.h) return;
    var c = rgb(h), i = (y * img.w + x) * 4; img.d[i] = c[0]; img.d[i + 1] = c[1]; img.d[i + 2] = c[2]; img.d[i + 3] = 255;
  }
  function inEll(x, y, cx, cy, rx, ry) { var dx = 2 * x + 1 - 2 * cx, dy = 2 * y + 1 - 2 * cy; return dx * dx * ry * ry + dy * dy * rx * rx <= 4 * rx * rx * ry * ry; }
  function defaultLook(r) {
    var out = { v: 1 };
    r.steps.forEach(function (s) {
      if (s.kind === 'tap') out.dents = [];
      if (s.kind === 'flip') out.band = 1;
      if (s.kind === 'slice') { var n = clampInt(s.lines, 1, 3, 2), z0 = []; for (var i = 0; i < n; i++) z0.push(0); out.cuts = z0.slice(); out.offs = z0.slice(); }
    });
    out.plate = 0;
    return out;
  }
  /* any look -> a valid look of that recipe (unknown v or broken parts -> the default shape) */
  function normLook(recipeId, look) {
    var r = recipe(recipeId); if (!r) return null;
    var out = defaultLook(r);
    if (!look || typeof look !== 'object' || look.v !== 1) return out;
    r.steps.forEach(function (s, si) {
      var part = {};
      if (s.kind === 'tap') part.dents = look.dents; else if (s.kind === 'flip') part.band = look.band; else if (s.kind === 'slice') { part.cuts = look.cuts; part.offs = look.offs; }
      if (validLook(r, si, part)) for (var k in part) out[k] = clone(part[k]);
    });
    if (isIntIn(look.plate, 0, PLATES.length - 1)) out.plate = look.plate;
    return out;
  }
  function stubDish(img, r, L, seed) {
    var w = img.w, h = img.h, pc = PLATES[L.plate], i, x, y;
    var prx = (w >> 1) - 1, pry = (h >> 1) - 1, cx = w >> 1, cy = h >> 1;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      if (!inEll(x, y, cx, cy, prx, pry)) continue;
      put(img, x, y, inEll(x, y, cx, cy, prx - 1, pry - 1) ? pc[0] : pc[1]);
    }
    if (r.id !== 'jeon') return;
    var food = TUNE.food.jeon, jrx = Math.max(2, (prx * 3) >> 2), jry = Math.max(2, (pry * 3) >> 2), jx0 = cx - jrx, jy0 = cy - jry;
    var col = JEON[L.band] || JEON[1];
    for (y = cy - jry; y <= cy + jry; y++) for (x = cx - jrx; x <= cx + jrx; x++) {
      if (!inEll(x, y, cx, cy, jrx, jry)) continue;
      put(img, x, y, inEll(x, y, cx, cy, jrx - 1, jry - 1) ? col : JEON_EDGE);
    }
    var herb = HERB[swapsFor(r, seed).herb] || HERB.parae, rng = mulberry32(hash32(seed + '|herb'));
    for (i = 0; i < 7; i++) {
      var hx = cx - jrx + 2 + rng() % Math.max(1, 2 * jrx - 3), hy = cy - jry + 2 + rng() % Math.max(1, 2 * jry - 3);
      if (inEll(hx, hy, cx, cy, jrx - 2, jry - 2)) put(img, hx, hy, herb[i & 1]);
    }
    (L.dents || []).forEach(function (d) {
      var dx = jx0 + Math.floor(d[0] * 2 * jrx / food.w), dy = jy0 + Math.floor(d[1] * 2 * jry / food.h);
      if (inEll(dx, dy, cx, cy, jrx - 1, jry - 1)) put(img, dx, dy, JEON_EDGE);
    });
    (L.cuts || []).forEach(function (a, li) {   /* the gap between pieces, in the plate colour */
      var tq = TAN6[Math.min(5, Math.abs(a) / 6 | 0)] * (a < 0 ? -1 : 1), off = Math.floor((L.offs[li] || 0) * jrx / (food.w >> 1)), k;
      if (li === 0) { for (k = -jrx; k <= jrx; k++) { x = cx + k; y = cy + off + ((tq * k + 512) >> 10); if (inEll(x, y, cx, cy, jrx - 1, jry - 1)) put(img, x, y, pc[0]); } }
      else { for (k = -jry; k <= jry; k++) { y = cy + k; x = cx + off - ((tq * k + 512) >> 10); if (inEll(x, y, cx, cy, jrx - 1, jry - 1)) put(img, x, y, pc[0]); } }
    });
  }
  function drawDish(recipeId, look, seed, w, h) {
    w = clampInt(w, 8, 256, TUNE.dish.w); h = clampInt(h, 8, 256, TUNE.dish.h);
    var img = blank(w, h);
    try {
      var r = recipe(recipeId); if (!r) return img;
      var L = normLook(r.id, look), sd = toU32(seed);
      var art = typeof COOK_ART !== 'undefined' && COOK_ART && typeof COOK_ART.dish === 'function' ? COOK_ART : null;
      if (art) {
        var G = art.GEO || {}, sw = swapsFor(r, sd), small = G.dish && (w < G.dish.w || h < G.dish.h) && typeof art.dishSmall === 'function';
        try { (small ? art.dishSmall : art.dish)(img, clone(L), { herb: sw.herb, recipe: r.id, seed: sd, swaps: sw });
          if (img.w === w && img.h === h && img.d && img.d.length === w * h * 4) return img; }
        catch (e) { /* the painter failed: draw the stub below */ }
        img = blank(w, h);
      }
      stubDish(img, r, L, sd);
    } catch (e2) { img = blank(w, h); }
    return img;
  }

  var API = {
    VERSION: VERSION, TUNE: TUNE, TUNE_HASH: TUNE_HASH, WORDS: WORDS, RECIPES: RECIPES, PROPS: PROPS, KIND: KIND, BANDS: BANDS,
    hash32: hash32, mulberry32: mulberry32, seedFor: seedFor, runIdFor: runIdFor, stepSeed: stepSeed, fxSeed: fxSeed,
    recipe: recipe, swapsFor: swapsFor, plateFor: plateFor, betweenOf: betweenOf,
    createRun: createRun, resumeRun: resumeRun, input: input, tick: tick, drain: drain, feed: feed, simulate: simulate,
    lookOf: lookOf, normLook: normLook, resultOf: resultOf, bookLine: bookLine, potOf: potOf, normStore: normStore, bookAdd: bookAdd,
    verb: verb, describe: describe, hintAt: hintAt, drawDish: drawDish
  };
  if (typeof document === 'undefined' || typeof window === 'undefined') return API;   /* node: the simulation only */

  /* ───────── live ───────── */
  /* LIVE HALF (browser only; node returned above). One modal <dialog>, built on the first open. 11-15 close-up
   * (wip/round5/cook-spec.md): no counter screen and no visible words. Opening goes straight into a step (or resumes the
   * saved one); every step change slides the view sideways to the next station (tap -> counter, flip -> stove, slice ->
   * board, reveal -> plate). One canvas fills the dialog edge to edge: the 144 x 160 stage is blitted into a W x H view
   * whose bleed COOK_ART.view paints in stage coordinates (fit: one art px = k device px). HUD: step strip and close
   * (top), the quiet chip (bottom centre); all three are pixel icons with aria-labels.
   * Input (6.2, 6.3): one visible clock that freezes while the tab is hidden (sim t = visible ms / slow). Every pointer
   * sample goes through input() (it ticks first), every frame runs tick() + drain(). The host drops touches that start
   * within TUNE.edgeCss of the screen's left / right edge. Juice is drawn from drained events on a 12 fps grid; sound
   * goes to AUDIO.on('cook', snd) and the haptic to HAPTICS.buzz(name) in the same handler (or on the named frame);
   * aria-live gets the say words only. The same acts go to the reaction stickers when js/cook-stickers.js is loaded.
   * Storage: one key (opts.storeKey, default 'ppolppol_cook'); the pot is saved at step boundaries, on hidden, pagehide,
   * close and again; a pot that cannot be resumed moves to potOld unchanged; a finished dish adds one book line.
   * open() never throws. */
  var KEY0 = 'ppolppol_cook';
  var KEY_RE = /^ppolppol_cook(_[a-z0-9]{1,16})?$/;          /* only the kitchen's own keys (never the main save) */
  /* 11-15 layout (spec 2.1; not in TUNE, so saved pots stay valid): VIEW_W art px across, stage rows ROWS between the HUD
     and the chip, MID their centre, ZMAX CSS px per art px at most, HUD 8 + 48 + 8, chip 64 at 16 from the bottom */
  var LAY = { VIEW_W: 80, ROWS: [28, 132], MID: 80, ZMAX: 6, HUD: 64, CHIP: 64, CHIPB: 16, STICK_ROW: 44, PAD: 8, CLOSE: 48, HIT: 56, NOTE: 44 };
  var FMS = 1000 / TUNE.fps;                                  /* one 12 fps frame */
  var ART_W = TUNE.stage.w / TUNE.stage.scale, ART_H = TUNE.stage.h / TUNE.stage.scale;
  var FOOD_X = TUNE.food.batter.cx, FOOD_Y = TUNE.food.batter.cy;   /* food centre on the stage (art px) */
  var STATION = { tap: 'counter', flip: 'stove', slice: 'board' };
  var SLIDE_AT = [0.40, 0.75, 0.94];                          /* slide offset per 12 fps frame, as a share of STRIDE */
  var AGAIN_MS = 900;                                         /* the result chip ignores presses until then */
  var SND_FREE = { tap: 1, step: 1, done: 1, pick: 1, quiet: 1 };   /* acts that skip the 120 ms gap (a counted tap is >= 90 ms
                                                                         after the last one already: TUNE.tap.mergeMs) */
  var D = null, L = null, kbd = false, curKey = KEY0;

  function art() { return typeof COOK_ART !== 'undefined' && COOK_ART && typeof COOK_ART.tapScene === 'function' ? COOK_ART : null; }
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function focusEl(x) { if (!x || typeof x.focus !== 'function') return; try { x.focus({ preventScroll: true }); } catch (e) { try { x.focus(); } catch (e2) { /* gone */ } } }
  function shownEl(x) { return !!x && typeof x.focus === 'function' && document.contains(x) && !x.hidden && !x.disabled && (typeof x.checkVisibility !== 'function' || x.checkVisibility()); }

  /* last input modality: a key press makes the chip visible and focused at step start (design 2.4) */
  function setKbd(on) { kbd = on; if (D) D.dlg.classList.toggle('ck-kbd', on); }   /* ck-kbd: focus rings show after key input only */
  document.addEventListener('keydown', function (e) { if (e.key !== 'Shift' && e.key !== 'Control' && e.key !== 'Alt' && e.key !== 'Meta') setKbd(true); }, true);
  document.addEventListener('pointerdown', function () { setKbd(false); }, true);

  /* ---------- storage: re-read before every write (like js/runner.js); every failure is silent ---------- */
  function readStore() { var raw = null; try { raw = window.localStorage.getItem(curKey); } catch (e) { raw = null; } return normStore(raw); }
  function writeStore(o) { try { window.localStorage.setItem(curKey, JSON.stringify(o)); return true; } catch (e) { return false; } }
  function patchStore(fn) { var o = readStore(); try { fn(o); } catch (e) { return false; } return writeStore(o); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function dateKey(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function today() {   /* opts.day, then the test hook window.__ppolTest.today (same rule as js/runner.js), then the local date */
    if (L && L.day) return L.day;
    var h = window.__ppolTest;
    if (h && typeof h === 'object' && DAY_RE.test(h.today || '')) return h.today;
    return dateKey(new Date());
  }
  function urlOpt(name) { try { return new URLSearchParams(window.location.search).get(name); } catch (e) { return null; } }
  function wantReduced(v) {
    if (v === true || v === false) return v;
    try {
      if (document.documentElement.getAttribute('data-motion') === 'reduce') return true;
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { return false; }
  }

  /* ---------- clocks: vis = visible ms (frozen while hidden); sim t = vis / slow and never runs backwards ---------- */
  function vis(at) { var c = L.clock; return c.base + (c.since === null ? 0 : Math.max(0, at - c.since)); }
  function simT(at) { var t = vis(at == null ? performance.now() : at) / L.slow; if (t < L.lastT) t = L.lastT; L.lastT = t; return t; }
  function evAt(e) {   /* design 6.2: the event's own time when it is sane (WebKit may use another origin), else now */
    var p = performance.now(), ts = e && e.timeStamp;
    return typeof ts === 'number' && isFinite(ts) && Math.abs(ts - p) < 1000 ? ts : p;
  }
  function freeze() { var c = L.clock; if (c.since !== null) { c.base = vis(performance.now()); c.since = null; } }
  function thaw() { var c = L.clock; if (c.since === null) c.since = performance.now(); }

  /* ---------- sound, haptics, words ---------- */
  function sound(snd) {
    if (!L || !snd || typeof snd.act !== 'string') return;
    if (!SND_FREE[snd.act]) {
      var p = performance.now(), last = L.sndAt[snd.act];
      if (last != null && p - last < TUNE.sndGapMs) return;
      L.sndAt[snd.act] = p;
    }
    try { if (window.AUDIO && AUDIO.on) AUDIO.on('cook', clone(snd)); } catch (e) { /* sound is a bonus */ }
  }
  /* 11-15 haptics (spec 7.2): tap (a counted hit, heat-on), flip (the landing frame), cut (a line), done (the plate
     landing). Called in the same handler or on the same frame as the picture, never from a timer; js/haptics.js decides
     whether anything buzzes (setting, support, activation). stats.buzz counts the attempts */
  function buzz(name) {
    if (!L) return;
    if (L.stats.buzz[name] != null) L.stats.buzz[name]++;
    try { if (typeof HAPTICS !== 'undefined') HAPTICS.buzz(name); } catch (e) { /* a bonus, like sound */ }
  }
  /* reaction stickers (js/cook-stickers.js, docs/COOK_STICKERS.md): optional pictures, never needed. The kitchen hands
     them its cooking moments under the act names of the sound table: handle() every sim event that carries a sound act,
     pick() the new dish (at open and at again). They mount on D.stick, a strip under the HUD that never takes a touch and
     that screen readers do not see; fit() sizes it (one sticker px = n device px) and hides it where it would reach the
     food (spec 5.4). Whatever goes wrong in there stays in there. */
  var stickOn = null;   /* the COOK_STICKERS object now mounted on D.stick */
  function sticker(snd) {
    try {
      var stk = window.COOK_STICKERS;
      if (!stk || typeof stk.cue !== 'function' || !D || !L || !snd || typeof snd.act !== 'string') return;
      if (stickOn !== stk) { if (typeof stk.mount === 'function') stk.mount(D.stick, { scale: 2 }); stickOn = stk; }
      var d = clone(snd);
      if (snd.act === 'pick' && L.run) d.runId = L.run.seed;
      if (!stk.cue(snd.act, d)) return;
      var kids = D.stick.children, slot = kids.length ? kids[kids.length - 1].getAttribute('data-slot') : null;
      for (var i = kids.length - 2; i >= 0 && slot !== null; i--) {   /* one picture a corner: a new one takes the place of the one there */
        if (kids[i].getAttribute('data-slot') === slot) kids[i].remove();
      }
    } catch (e) { /* decoration only */ }
  }
  function unstick() { try { if (D && D.stick) D.stick.textContent = ''; } catch (e) { /* decoration only */ } }
  function say(text) {   /* one polite line; cleared first so the same words are read again */
    if (!D || !text) return;
    if (L) { L.said.push(text); if (L.said.length > 32) L.said.shift(); }
    var node = D.say;
    node.textContent = '';
    clearTimeout(say.timer);
    say.timer = setTimeout(function () { node.textContent = text; }, 60);
  }

  /* ---------- juice: queued reactions on a 12 fps grid (frame = floor((t - at) / FMS)), particles, ghost hand ---------- */
  function fxAdd(o, si, at) { o.at = at == null ? L.lastT : at; o.si = si; L.fxq.push(o); if (L.fxq.length > 24) L.fxq.shift(); L.dirty = true; }
  function burst(kind, x, y, lo, hi, spread) {   /* 1 x 1 art px, integer velocities, gravity 1 px per frame^2 */
    if (L.reduced || !L.prng) return;
    var r = L.prng, n = lo + r() % (hi - lo + 1);
    for (var i = 0; i < n; i++) L.parts.push({ x: x | 0, y: y | 0, vx: (r() % (2 * spread + 1)) - spread, vy: -1 - (r() % 3), k: kind, life: 4 + r() % 3, at: L.lastT });
    if (L.parts.length > 48) L.parts.splice(0, L.parts.length - 48);
    L.stats.parts += n;
  }
  function juiceAt(t) {
    var J = { flash: false, squash: 0, bump: false, arc: null, cut: null, shake: null, rise: TUNE.reveal.frames - 1 }, keep = [], si = L.run ? L.run.si : -1;
    for (var i = 0; i < L.fxq.length; i++) {
      var q = L.fxq[i], fr = Math.max(0, Math.floor((t - q.at) / FMS)), on = true;
      if (q.si !== si) continue;   /* a reaction never leaks into the next step */
      if (q.k === 'hit') { if (fr === 0) J.flash = true; else if (fr <= 2 && !L.reduced) J.squash = fr; on = fr <= 2; }
      else if (q.k === 'flash') { if (fr === 0) J.flash = true; on = fr < 1; }
      else if (q.k === 'bump') { if (fr === 0) { if (L.reduced) J.flash = true; else J.bump = true; } on = fr < 1; }
      else if (q.k === 'arc') { if (!L.reduced && fr <= 3) J.arc = { f: fr, lift: q.lift }; on = fr <= 3; }
      else if (q.k === 'cut') { if (fr <= 1) J.cut = q.i; on = fr < 2; }   /* two frames: the cut sound's crunch lands 70-130 ms in */
      else if (q.k === 'shake') { if (!L.reduced && fr >= q.from && fr <= q.from + 1) J.shake = fr === q.from ? [q.dx, q.dy] : [-q.dx, -q.dy]; on = fr <= q.from + 1; }
      else if (q.k === 'rise') { J.rise = L.reduced ? TUNE.reveal.frames - 1 : Math.min(TUNE.reveal.frames - 1, fr); on = fr < TUNE.reveal.frames - 1; }
      if (on) keep.push(q);
    }
    L.fxq = keep;
    return J;
  }
  function handSpec(kind) {
    var run = L.run, st = run && run.st, G = art().GEO;
    if (!st || run.phase === 'reveal') return null;
    if (kind === 'tap') {
      if (st.kind !== 'tap') return { kind: 'tap', x: G.food.cx, y: G.food.cy };
      for (var i = 0; i < st.marks.length; i++) if (st.marks[i].n < st.per) return { kind: 'tap', x: st.marks[i].x >> 1, y: st.marks[i].y >> 1 };
      return null;
    }
    if (kind === 'flick') {   /* 11-15: the flick demo starts at the up-arrow (GEO.flipArrow), so glyph and hand agree */
      var fa = G.flipArrow;
      return fa ? { kind: 'flick', x: fa[0], y: fa[1] } : { kind: 'flick', x: G.food.cx, y: G.food.cy + 14 };
    }
    if (kind === 'slice') {
      var ln = st.lines && st.lines[st.cur];
      return ln && !ln.cut ? { kind: 'line', x0: ln.ax >> 1, y0: ln.ay >> 1, x1: ln.bx >> 1, y1: ln.by >> 1 } : null;
    }
    return null;
  }
  function startHand(kind, why, seenKey) {   /* one ghost hand: the 4-frame motion three times (about 1 s), a still pose when
                                                reduced. It stays until progress or its own end (a press that changes nothing
                                                does not wipe it); seenKey = the step kind a finished demo marks as seen */
    var spec = handSpec(kind); if (!spec) return;
    L.hint = { spec: spec, at: L.lastT, dur: 12 * FMS, why: why, seen: seenKey || null }; L.dirty = true; L.stats.hints++;
  }
  function markSeen(k) {
    if (!L || L.seen.indexOf(k) >= 0) return;
    L.seen.push(k);
    patchStore(function (o) { if (o.seen.indexOf(k) < 0) o.seen.push(k); });
  }
  function maybeDemo() {   /* first time this device sees a step kind: one ghost hand titleMs after the step start (no text);
                              the kind counts as seen once that demo has played to its end, or once the step is done */
    var run = L.run; if (!run || run.phase !== 'step' || L.demoAt === run.si || L.hint) return;
    L.demoAt = run.si;
    var k = run.st.kind;
    if (L.seen.indexOf(k) >= 0 || run.st.progress > 0) return;
    startHand(k === 'flip' ? 'tap' : k, 'demo', k === 'flip' ? null : k);   /* flip: first the heat-on tap; the up-swipe demo follows heat-on */
  }
  function checkIdle(run) {   /* no progress for 5 s: one ghost hand, and from then on the chip shows (design 2.3, 2.4) */
    if (L.hint || L.titleUntil) return;
    var due = hintAt(run); if (due === null) return;
    var key = run.si + '|' + due;
    if (L.hintKey === key || run.t - run.t0 < due) return;
    L.hintKey = key;
    var st = run.st;
    startHand(st.kind === 'flip' ? (st.heat ? 'flick' : 'tap') : st.kind, 'idle');
    L.stats.idle++;
    if (!L.shown) { L.shown = true; updVerb(); }
  }

  /* ---------- sim events -> juice, sound, haptics, words, saving ---------- */
  function handle(evs) {
    if (!L || !evs || !evs.length) return;
    var words = [];
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      if (e.snd) { sound(e.snd); sticker(e.snd); }
      if (e.say) words.push(e.say);
      onEvent(e);
      if (!L) return;
    }
    if (words.length) say(words.join(' '));
    L.dirty = true;
    updVerb();
  }
  var PROGRESS = { hit: 1, heat: 1, flip: 1, score: 1, cut: 1 };   /* a ghost hand gives way to these (the hand is doing it) */
  function onEvent(e) {
    var run = L.run, st = run && run.st, G = art().GEO, d, ln;
    if (PROGRESS[e.type] && L.hint) { L.hint = null; L.dirty = true; }
    switch (e.type) {
      case 'start': onStart(e); break;
      case 'hit':
        L.fx++; fxAdd({ k: 'hit' }, e.si); buzz('tap');
        d = st && st.kind === 'tap' && st.dents[e.i];
        burst('drop', d ? st.box[0] + d[0] : e.x >> 1, d ? st.box[1] + d[1] : e.y >> 1, 3, 6, 2);
        break;
      case 'pat': L.fx++; fxAdd({ k: 'flash' }, e.si); break;
      case 'dust': L.fx++; L.dust.push([e.x >> 1, e.y >> 1]); if (L.dust.length > 12) L.dust.shift(); break;
      case 'heat':
        L.fx++; fxAdd({ k: 'flash' }, e.si); L.nudges = 0; buzz('tap');
        if (L.seen.indexOf('flip') < 0) startHand('flick', 'demo', 'flip');   /* seen once it has played to its end */
        break;
      case 'nudge':   /* a press after heat-on that did not flip: the jeon hops; a few of them (with no hand showing) -> the
                         up-swipe hand once more and the chip shows; at most twice a step, so it never nags */
        L.fx++; fxAdd({ k: 'bump' }, e.si);
        if (!L.hint && ++L.nudges >= TUNE.flip.teach && L.taught < 2) { L.nudges = 0; L.taught++; startHand('flick', 'teach'); L.stats.teach++; L.shown = true; }
        break;
      case 'flip':
        L.fx++; L.finger = null; L.stats.flips++; L.nudges = 0;
        fxAdd({ k: 'arc', lift: e.lift }, e.si);
        L.landAt = L.lastT + 3 * FMS;   /* art: the landing frame (arc frame 3) is fl 0; the bloom carries onto the board */
        if (L.reduced) { L.landBuzz = null; buzz('flip'); } else L.landBuzz = L.landAt;   /* the haptic lands with the jeon */
        burst('crumb', G.food.cx - 22, G.food.cy + 4, 2, 3, 2); burst('crumb', G.food.cx + 22, G.food.cy + 4, 2, 3, 2);
        fxAdd({ k: 'shake', from: 3, dx: 0, dy: 1 }, e.si);
        break;
      case 'score': L.fx++; break;
      case 'cut':
        L.fx++; fxAdd({ k: 'cut', i: e.i }, e.si); buzz('cut');
        ln = st && st.kind === 'slice' && st.lines[e.i];
        if (ln) burst('crumb', (ln.ax + ln.bx) >> 2, (ln.ay + ln.by) >> 2, 3, 4, 2);
        break;
      case 'step': onStepEnd(e); break;
      case 'reveal': onReveal(e); break;
      default: break;
    }
  }
  function onStart(e) {
    var run = L.run, r = recipe(run.recipe);
    L.prng = mulberry32(fxSeed(run.seed, run.si));
    if (run.si === 0 || e.kind === 'flip') { L.landAt = null; L.landBuzz = null; }   /* a resumed dish can start at the flip */
    L.parts = []; L.dust = []; L.finger = null; L.hint = null; L.demoAt = -1; L.nudges = 0; L.taught = 0;
    L.titleUntil = (run.t0 != null ? run.t0 : L.lastT) + TUNE.titleMs;   /* no title any more: the demo hand still waits for it */
    stripOn(run.si);
    if (L.noSlide) { L.noSlide = false; return; }   /* open, resume and again place the station themselves */
    var prev = r && e.si > 0 ? r.steps[e.si - 1].kind : null;
    if (!prev || STATION[prev] === STATION[e.kind]) return;
    var lk = lookOf(run);
    if (prev === 'tap') startSlide('counter', 'stove', run.t0, { station: 'counter' }, { station: 'stove', pan: false }, 'pan');
    else startSlide('stove', 'board', run.t0, { station: 'stove', pan: true, heat: true, band: lk.band }, { station: 'board' }, 'jeon');
  }
  function hideTitle() { if (L.titleUntil) { L.titleUntil = 0; L.dirty = true; } }   /* a press ends the wait for the first-time demo */
  function onStepEnd(e) {
    if (e.kind === 'slice') fxAdd({ k: 'shake', from: 0, dx: 1, dy: 0 }, e.si);
    markSeen(e.kind);
    L.finger = null; L.hint = null;
    if (L.run.doneAt != null) L.nextAt = L.run.doneAt + betweenOf(e.kind);   /* when the next step or the plate comes, exactly */
    if (L.run.done) finish(); else savePot();
  }
  function onReveal(e) {
    var at = L.nextAt != null && L.nextAt <= L.lastT ? L.nextAt : L.lastT;
    L.screen = 'reveal'; L.revealAt = at; L.chipAt = at + TUNE.reveal.focusMs; L.againAt = at + AGAIN_MS; L.chipOn = false; L.down = {};
    L.hint = null; L.parts = []; L.titleUntil = 0;
    fxAdd({ k: 'rise' }, e.si, at); fxAdd({ k: 'shake', from: TUNE.reveal.frames - 1, dx: 0, dy: 1 }, e.si, at);
    if (L.reduced) { L.doneBuzz = null; buzz('done'); } else L.doneBuzz = at + 5 * FMS;   /* REV2 t 5: the plate lands */
    stripOn(L.run.n);
    startSlide('board', 'plate', at, { station: 'board' }, { station: 'plate' }, 'cut');
    if (L.finished !== L.run.id) finish();
  }
  function finish() {   /* the dish is done: book line (newest first), clear the pot, hand the result to the host */
    var run = L.run; if (!run || !run.done || L.finished === run.id) return;
    L.finished = run.id;
    var res = resultOf(run, { madeAt: Date.now(), day: L.runDay || today() });
    if (!res) return;
    var line = bookLine(res);
    patchStore(function (o) { o.pot = null; bookAdd(o, line); });
    if (typeof L.onResult === 'function') { try { L.onResult(clone(res)); } catch (e) { /* the host's own problem */ } }
  }
  function savePot() {
    if (!L || !L.run || L.run.done) return;
    var pot = potOf(L.run, Date.now());
    if (pot) patchStore(function (o) { o.pot = pot; });
  }

  /* ---------- stations and slides (spec 4) ---------- */
  function stationNow() {
    var run = L && L.run;
    if (!run) return 'counter';
    return run.phase === 'reveal' ? 'plate' : STATION[run.st.kind] || 'counter';
  }
  function copyBuf(b) { return { w: b.w, h: b.h, d: new Uint8ClampedArray(b.d) }; }
  function baseOf(o) {   /* a still station picture (COOK_ART.base), or null when the art has none */
    var A = art(); if (typeof A.base !== 'function') return null;
    var run = L.run, lk = run ? lookOf(run) : {}, b = A.blank(ART_W, ART_H), p = {}, k;
    for (k in o) p[k] = o[k];
    p.f = 0; p.still = true; p.look = lk; p.herb = run ? run.swaps.herb : 'parae'; p.seed = run ? fxSeed(run.seed, 0) & 0x7fffffff : 0;
    try { A.base(b, p); } catch (e) { return null; }
    return b;
  }
  /* outO / inO: base options for the two stations; carry: what rides on screen ('pan', 'jeon', 'cut') or null. Without
     COOK_ART.base the outgoing scene is the last painted frame and the incoming one the live scene, with no carry */
  function startSlide(from, to, t0, outO, inO, carry, snapshot) {
    if (L.reduced) { L.slide = null; return; }
    var A = art(), out = snapshot || (outO ? baseOf(outO) : null), inb = inO ? baseOf(inO) : null;
    if (!out) out = copyBuf(L.buf);
    L.slide = { from: from, to: to, t0: t0, out: out, inb: inb, carry: inb && carry && typeof A.carry === 'function' ? carry : null };
    L.stats.slides++; L.dirty = true;
  }
  function slideAt(t) {   /* { f, s } of the slide now, or null once it is over (f >= 3) */
    var sl = L.slide; if (!sl) return null;
    var f = Math.max(0, Math.floor((t - sl.t0) / FMS));
    if (f >= SLIDE_AT.length) return null;
    return { f: f, s: Math.round(L.stride * SLIDE_AT[f]) };
  }

  /* ---------- view composition: one W x H canvas, the stage blitted in at (ox, oy) (spec 2.4) ---------- */
  function bgFor(station, ox, oy) {   /* COOK_ART.view of one station at one place, cached (a few entries) */
    var key = station + '|' + L.W + '|' + L.H + '|' + ox + '|' + oy, c = L.bgc, i;
    for (i = 0; i < c.length; i++) if (c[i].key === key) return c[i].b;
    var A = art(), b = A.blank(L.W, L.H);
    A.view(b, { station: station, ox: ox, oy: oy, x0: 0, x1: L.W });
    c.unshift({ key: key, b: b }); if (c.length > 8) c.length = 8;
    return b;
  }
  /* paint columns x0..x1-1 of V: the station's bleed, then the stage interior (x 2..141, y 2..157) of src at (ox, oy).
     Without COOK_ART.view the bleed repeats the interior's edge rows and columns (spec 14 fallback) */
  function layer(V, station, src, ox, oy, x0, x1) {
    var A = art(), W = V.w, H = V.h, d = V.d, s = src.d, x, y, sx, sy, a, b2;
    x0 = Math.max(0, x0 | 0); x1 = Math.min(W, x1 | 0); if (x1 <= x0) return;
    if (typeof A.view === 'function') {
      var bg = bgFor(station, ox, oy).d;
      for (y = 0; y < H; y++) d.set(bg.subarray((y * W + x0) * 4, (y * W + x1) * 4), (y * W + x0) * 4);
      var lo = Math.max(x0, ox + 2), hi = Math.min(x1, ox + ART_W - 2);
      if (hi > lo) for (sy = 2; sy < ART_H - 2; sy++) {
        y = sy + oy; if (y < 0 || y >= H) continue;
        d.set(s.subarray((sy * ART_W + lo - ox) * 4, (sy * ART_W + hi - ox) * 4), (y * W + lo) * 4);
      }
      return;
    }
    for (y = 0; y < H; y++) {
      sy = Math.min(ART_H - 3, Math.max(2, y - oy));
      for (x = x0; x < x1; x++) {
        sx = Math.min(ART_W - 3, Math.max(2, x - ox)); a = (sy * ART_W + sx) * 4; b2 = (y * W + x) * 4;
        d[b2] = s[a]; d[b2 + 1] = s[a + 1]; d[b2 + 2] = s[a + 2]; d[b2 + 3] = 255;
      }
    }
  }
  function shakeView(V, dx, dy) {   /* the whole view moves (edge repeat), so the stage and its bleed never tear (R7) */
    var A = art();
    if (typeof A.shake === 'function' && A.shake.length >= 4) { A.shake(V, dx, dy, 0); return; }
    var src = new Uint8ClampedArray(V.d), W = V.w, H = V.h;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var sx = Math.min(W - 1, Math.max(0, x - dx)), sy = Math.min(H - 1, Math.max(0, y - dy)), si = (sy * W + sx) * 4, ti = (y * W + x) * 4;
      V.d[ti] = src[si]; V.d[ti + 1] = src[si + 1]; V.d[ti + 2] = src[si + 2]; V.d[ti + 3] = src[si + 3];
    }
  }
  function composeSlide(V, sl, sp) {
    var A = art(), W = V.w, ox = L.ox, oy = L.oy, s = sp.s, seam = ox + FOOD_X + Math.floor(L.stride / 2) - s;
    layer(V, sl.from, sl.out, ox - s, oy, 0, seam);
    layer(V, sl.to, sl.inb || L.buf, ox - s + L.stride, oy, seam, W);
    if (sl.carry) {
      var run = L.run, lk = run ? lookOf(run) : {};
      try {
        A.carry(V, { what: sl.carry, x: ox + FOOD_X, y: oy + FOOD_Y, lift: 2, shadow: true, herb: run ? run.swaps.herb : 'parae',
          dents: lk.dents || [], band: lk.band == null ? 1 : lk.band, look: lk, seed: run ? fxSeed(run.seed, 0) & 0x7fffffff : 0 });
      } catch (e) { /* the scenes still slide */ }
    }
  }

  /* ---------- HUD: strip, close, chip ---------- */
  function verbKey(run) {
    if (!run || !run.st) return 'tap';
    if (run.phase === 'reveal') return 'again';
    if (run.st.kind === 'flip') return run.st.heat ? 'flip' : 'heat';
    return run.st.kind;
  }
  function iconOf(name) {   /* an unknown icon falls back to 'tap' (spec 14) */
    var A = art(), list = A.ICONS || [];
    try { return A.icon(list.indexOf(name) >= 0 ? name : 'tap'); } catch (e) { return A.icon('tap'); }
  }
  function updVerb() {
    if (!D || !L) return;
    var run = L.run, on = !!run && (L.screen !== 'reveal' || L.chipOn), label = on ? verb(run) : '', key = verbKey(run);
    if (D.verb.hidden !== !on) D.verb.hidden = !on;
    if ((D.verb.getAttribute('aria-label') || '') !== label) D.verb.setAttribute('aria-label', label);
    if (D.verbCv.ckName !== key) { D.verbCv.ckName = key; D.verbCv.ckIcon = iconOf(key); D.verbCv.ckN = 0; sizeIcons(); }
    D.verb.classList.toggle('ck-shown', on && L.shown);
  }
  function buildStrip(r) {
    D.strip.textContent = '';
    r.steps.forEach(function (s) {
      var cv = el('canvas', { width: '16', height: '16' });
      cv.ckIcon = iconOf(s.kind); cv.ckN = 0;
      D.strip.appendChild(el('span', { class: 'ck-step' }, [cv]));
    });
    sizeIcons();
  }
  function drawIcon(cv, n) {   /* the 16 x 16 icon at device resolution: every art px an exact n x n block, so the browser maps
                                  backing pixels 1:1 (a CSS upscale of a 16 x 16 canvas drops or doubles columns at DPR 2.625) */
    if (!cv.ckIcon || cv.ckN === n) return;
    var c = null; try { c = cv.getContext('2d'); } catch (e) { c = null; }
    if (!c) return;
    var s = cv.ckIcon, W = 16 * n, im, d, x, y, i, o;
    cv.width = W; cv.height = W; im = c.createImageData(W, W); d = im.data;
    for (y = 0; y < W; y++) for (x = 0; x < W; x++) {
      i = (((y / n) | 0) * 16 + ((x / n) | 0)) * 4; o = (y * W + x) * 4;
      d[o] = s.d[i]; d[o + 1] = s.d[i + 1]; d[o + 2] = s.d[i + 2]; d[o + 3] = s.d[i + 3];
    }
    c.putImageData(im, 0, 0); cv.ckN = n;
  }
  /* every HUD icon at a whole number of device px per icon px (strip and close floor(2 dpr), chip floor(3 dpr)), every
     edge on a device px: the box sizes and offsets below are all rounded to device px (DPR 2.625 too) */
  function sizeIcons() {
    if (!D || !L) return;
    var dpr = L.dpr || window.devicePixelRatio || 1, n2 = Math.max(1, Math.floor(2 * dpr + 1e-6)), n3 = Math.max(1, Math.floor(3 * dpr + 1e-6));
    var dev = function (v) { return Math.round(v * dpr) / dpr; }, p2 = 16 * n2 / dpr, p3 = 16 * n3 / dpr, pad = dev(LAY.PAD);
    function place(cv, n, px, box) {   /* centred in a box (the border is a shadow: no layout offset) */
      drawIcon(cv, n); cv.style.width = px + 'px'; cv.style.height = px + 'px';
      var off = (Math.round((dev(box) - px) / 2 * dpr) / dpr) + 'px';
      cv.style.left = off; cv.style.top = off;
    }
    Array.prototype.forEach.call(D.strip.children, function (sp, i) {
      var cv = sp.firstChild; drawIcon(cv, n2); cv.style.width = p2 + 'px'; cv.style.height = p2 + 'px';
      sp.style.marginTop = (Math.round((dev(48) - p2) / 2 * dpr) / dpr) + 'px';
      sp.style.marginLeft = pad + 'px';
    });
    D.strip.style.paddingRight = pad + 'px';
    place(D.closeCv, n2, p2, LAY.CLOSE);
    place(D.verbCv, n3, p3, LAY.CHIP);
  }
  /* strip states (5.1): done steps at full opacity, the current one raised with the amber line, upcoming ones at 45 % */
  function stripOn(si) { Array.prototype.forEach.call(D.strip.children, function (c, i) { c.classList.toggle('on', i === si); c.classList.toggle('done', i < si); }); }

  /* ---------- input plumbing ---------- */
  function send(ev) {
    var run = L && L.run; if (!run) return;
    var rec = input(run, ev);
    if (rec && L.rec && rec.si < run.n) {
      var R = window.__cookRec;
      if (R && R.steps && R.steps[rec.si]) R.steps[rec.si].push({ t: rec.t, k: rec.k, x: rec.x, y: rec.y, p: rec.p, id: rec.id });
    }
    L.dirty = true;   /* hand-followed tools (the knife) move at display rate even when a sample adds no event */
    handle(drain(run));
  }
  function logical(e) {   /* client px -> logical 288 x 320 through the canvas and the stage origin (spec 2.2) */
    var r = L.rect || (L.rect = D.cv.getBoundingClientRect()), c = L.css || 1;
    return { x: ((e.clientX - r.left) / c - L.ox) * TUNE.stage.scale, y: ((e.clientY - r.top) / c - L.oy) * TUNE.stage.scale };
  }
  function ptype(e) { return e.pointerType === 'touch' ? 't' : e.pointerType === 'mouse' ? 'm' : 'n'; }
  function follow(id, q) {   /* the spatula follows the finger of a stroke after heat-on (display rate, art px) */
    var st = L.run && L.run.st;
    if (!st || st.kind !== 'flip' || !st.stroke || st.stroke.id !== id || st.done) return;
    L.finger = [Math.round(q.x / TUNE.stage.scale), Math.round(q.y / TUNE.stage.scale) - 6]; L.dirty = true;
  }
  function onDown(e, routed) {   /* routed: a stroke that began on the quiet chip belongs to the stage */
    if (!L) return;
    if (!routed && e.target && e.target.closest && e.target.closest('button')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    hideTitle();   /* a ghost hand stays until progress or its own end: a press that changes nothing does not wipe it */
    if (L.screen === 'reveal') { e.preventDefault(); return; }   /* the plate is only to look at: pressing it does nothing */
    if (L.screen !== 'step' || !L.run) return;
    if (e.pointerType !== 'mouse' && (e.clientX < TUNE.edgeCss || e.clientX > window.innerWidth - TUNE.edgeCss)) return;   /* OS back swipe */
    e.preventDefault();
    try { D.stage.setPointerCapture(e.pointerId); } catch (x) { /* synthetic or ended pointer */ }
    L.rect = D.cv.getBoundingClientRect();
    var q = logical(e);
    L.down[e.pointerId] = true;
    send({ t: simT(evAt(e)), k: 'd', x: q.x, y: q.y, p: ptype(e), id: e.pointerId });
    if (L) follow(e.pointerId, q);
  }
  function onMove(e) {
    if (!L || !L.down[e.pointerId] || L.screen !== 'step' || !L.run) return;
    var list = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : null, p = ptype(e), q = null;
    if (!list || !list.length) list = [e];
    for (var i = 0; i < list.length; i++) {
      q = logical(list[i]);
      send({ t: simT(evAt(list[i])), k: 'm', x: q.x, y: q.y, p: p, id: e.pointerId });
      if (!L) return;
    }
    if (q) follow(e.pointerId, q);
  }
  function onUp(e) {
    if (!L || L.screen === 'reveal' || !L.down[e.pointerId]) return;
    delete L.down[e.pointerId];
    var q = logical(e);
    send({ t: simT(evAt(e)), k: 'u', x: q.x, y: q.y, p: ptype(e), id: e.pointerId });
    if (L) { L.finger = null; L.dirty = true; }
  }
  function onCancel(e) {   /* pointercancel keeps all progress (never a penalty) */
    if (!L || !L.down[e.pointerId]) return;
    delete L.down[e.pointerId];
    send({ t: simT(evAt(e)), k: 'c', id: e.pointerId });
    if (L) { L.finger = null; L.dirty = true; }
  }
  function onVerb(e) {   /* the chip: the browser's own press only (Enter / Space / click), no dialog-wide keys */
    if (!L) return;
    var shownBy = L.rowPress, t = simT(evAt(e)); L.rowPress = false;
    if (shownBy && e && e.detail > 0) { updVerb(); return; }   /* the finger / mouse press that showed the quiet chip does not act */
    if (L.screen === 'reveal') { if (L.chipOn && t >= L.againAt) again(); return; }   /* again: only after 900 ms */
    L.shown = true;
    if (L.screen === 'step' && L.run) { hideTitle(); send({ t: t, k: 'b' }); }
    updVerb();
  }
  function quietVerb() { return !!D && !!L && !D.verb.hidden && !L.shown && document.activeElement !== D.verb; }
  function onRowDown(e) {   /* a finger or mouse press on the quiet (invisible) chip never does the verb: it shows the chip (a
                               visible reaction) and the stroke goes to the stage, so a thumb flick that starts on it still
                               flips and a stray tap there never flips or cuts. Keyboard and screen-reader presses (a click
                               with no pointer press) act at once. */
    if (!L || L.screen !== 'step' || !quietVerb()) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    L.rowPress = true; L.shown = true; L.stats.rowPress++; updVerb(); L.dirty = true;
    onDown(e, true);
  }
  function cancelAll() { if (L && L.run) { L.down = {}; L.finger = null; send({ t: simT(), k: 'c' }); } }

  /* ---------- a dish: open straight into it (resume or new), and again (spec 3.1, 3.6) ---------- */
  function nonce(o) {   /* run id salt: a random number (crypto), never a clock; without crypto, the book length */
    try { var a = new Uint32Array(2); window.crypto.getRandomValues(a); return a[0].toString(36) + a[1].toString(36); }
    catch (e) { return 'b' + o.book.length; }
  }
  function begin(isAgain) {
    var r = RECIPES[0], o = readStore(), day = today(), run = null, pot = null;
    o.seen.forEach(function (k) { if (L.seen.indexOf(k) < 0) L.seen.push(k); });
    if (!isAgain && o.pot) {
      run = resumeRun(o.pot);
      if (run && run.recipe === r.id) pot = clone(o.pot);
      else {   /* old build, other tune or broken: kept as it was in potOld (newest first), never resumed */
        run = null;
        o.potOld = [o.pot].concat(o.potOld || []).slice(0, 4); o.pot = null;
        writeStore(o); L.stats.potOld++;
      }
    }
    if (!run) {
      if (o.day !== day) { o.day = day; o.dayN = 0; }
      o.dayN = Math.min(1e6, o.dayN + 1);
      run = createRun(r.id, L.seed !== null ? L.seed : seedFor(day, o.dayN), { id: runIdFor(day, o.dayN, nonce(o)) });
      if (!run) return false;
      o.pot = potOf(run, Date.now());
      writeStore(o);
    }
    sound({ act: 'pick', dish: r.id });
    L.run = run; L.runDay = day; L.screen = 'step'; L.shown = false; L.finished = null; L.hintKey = null; L.hint = null; L.nextAt = null;
    L.fxq = []; L.parts = []; L.dust = []; L.down = {}; L.finger = null; L.rowPress = false; L.nudges = 0; L.chipOn = false; L.doneBuzz = null;
    sticker({ act: 'pick', dish: r.id });   /* here, not beside the sound above: the run (its seed) has to exist first */
    if (L.rec) {   /* a resumed dish keeps its pot: COOK.simulate(recipe, seed, steps, { pot }) replays it */
      var steps = []; for (var i = 0; i < run.n; i++) steps.push([]);
      window.__cookRec = { recipe: run.recipe, seed: run.seed, steps: steps, pot: pot };
    }
    buildStrip(r);
    L.noSlide = true;   /* the first start of a dish places its station without a slide */
    tick(run, simT());
    handle(drain(run));
    L.noSlide = false;
    if (kbd) { L.shown = true; updVerb(); focusEl(D.verb); } else focusEl(D.stage);
    return true;
  }
  function again() {   /* the result chip after 900 ms: a new dish; the plate leaves, a fresh pan arrives (no carry) */
    if (!L || L.screen !== 'reveal') return;
    var snap = copyBuf(L.buf);
    unstick();
    if (!begin(true)) return;
    startSlide('plate', 'counter', L.run.t0, null, null, null, snap);   /* the live tap scene comes in */
  }

  /* ---------- layout (spec 2.2): one art px = k device px; the stage's band of interest sits between HUD and chip ---------- */
  function fit() {
    if (!L || !D) return;
    var A = art(), dpr = window.devicePixelRatio || 1, cs = null;
    var vw = D.dlg.clientWidth || window.innerWidth, vhAll = D.dlg.clientHeight || window.innerHeight, vh = vhAll, vv = window.visualViewport;
    if (vv && vv.height > 0 && vv.height < vh) vh = vv.height;
    try { cs = window.getComputedStyle(D.probe); } catch (e) { cs = null; }
    function pad(k) { var v = cs ? parseFloat(cs[k]) : 0; return isFinite(v) && v > 0 ? Math.min(200, v) : 0; }
    var sT = pad('paddingTop'), sR = pad('paddingRight'), sB = pad('paddingBottom'), sL = pad('paddingLeft');
    var hudB = sT + LAY.HUD, chipTop = vh - sB - LAY.CHIPB - LAY.CHIP, usable = chipTop - hudB;
    var k = Math.max(1, Math.min(Math.floor(vw * dpr / LAY.VIEW_W + 0.01), Math.floor(usable * dpr / (LAY.ROWS[1] - LAY.ROWS[0]) + 0.01), Math.floor(LAY.ZMAX * dpr + 0.01)));
    var css = k / dpr, W = Math.max(1, Math.ceil(vw / css - 1e-9)), H = Math.max(1, Math.ceil(Math.max(vh, vhAll) / css - 1e-9));
    var ox = Math.round(vw / 2 / css) - FOOD_X, oy = Math.round((hudB + chipTop) / 2 / css) - LAY.MID;
    function dev(v) { return Math.round(v * dpr) / dpr; }
    if (!L.view || L.W !== W || L.H !== H) {
      D.cv.width = W; D.cv.height = H;
      L.view = A.blank(W, H); L.img = D.ctx.createImageData(W, H); L.bgc = [];
    }
    L.k = k; L.dpr = dpr; L.css = css; L.W = W; L.H = H; L.ox = ox; L.oy = oy; L.stride = W + 8; L.rect = null;
    L.hudB = hudB; L.chipTop = chipTop; L.safe = [sT, sR, sB, sL]; L.vw = vw; L.vh = vh;
    D.cv.style.width = (W * k / dpr) + 'px'; D.cv.style.height = (H * k / dpr) + 'px';
    var sim = D.sim.style;
    sim.left = (ox * css) + 'px'; sim.top = (oy * css) + 'px'; sim.width = (ART_W * css) + 'px'; sim.height = (ART_H * css) + 'px';
    var top0 = dev(Math.max(LAY.PAD, sT + LAY.PAD)), left0 = dev(Math.max(LAY.PAD, sL + LAY.PAD)), right0 = dev(Math.max(LAY.PAD, sR + LAY.PAD)), ring = dev((LAY.HIT - LAY.CLOSE) / 2);
    D.dlg.style.setProperty('--ck-px2', dev(2) + 'px');
    D.strip.style.left = left0 + 'px'; D.strip.style.top = top0 + 'px'; D.strip.style.height = dev(48) + 'px';
    D.close.style.left = dev(vw - right0 + ring - LAY.HIT) + 'px'; D.close.style.top = (top0 - ring) + 'px';   /* left: on a device px */
    D.close.style.width = dev(LAY.HIT) + 'px'; D.close.style.height = dev(LAY.HIT) + 'px'; D.close.style.padding = ring + 'px';
    D.verb.style.left = dev(Math.round((vw - LAY.CHIP) / 2)) + 'px'; D.verb.style.top = dev(chipTop) + 'px';
    D.verb.style.width = dev(LAY.CHIP) + 'px'; D.verb.style.height = dev(LAY.CHIP) + 'px';
    D.note.style.left = left0 + 'px'; D.note.style.right = right0 + 'px'; D.note.style.top = dev(hudB + LAY.PAD) + 'px';
    /* stickers (5.4): one sticker px = n device px (n = floor(2 dpr)); the engine draws at 2 CSS px a sticker px, so the
       layer is zoomed by n / dpr / 2 and its own lengths are given before the zoom. Shown only above STICK_ROW */
    var n2 = Math.max(1, Math.floor(2 * dpr + 1e-6)), s = 32 * n2 / dpr, z = n2 / dpr / 2, st = D.stick.style;
    var showStick = hudB + 4 + s + 8 <= (LAY.STICK_ROW + oy) * css;
    D.stick.hidden = !showStick;
    st.zoom = Math.abs(z - 1) < 1e-9 ? '' : String(z);
    st.top = (dev(hudB + 4) / z) + 'px'; st.left = '0px'; st.width = (vw / z) + 'px'; st.height = (s / z) + 'px';
    st.setProperty('--ck-s0', (left0 / z) + 'px'); st.setProperty('--ck-s1', (right0 / z) + 'px');
    sizeIcons();
    L.dirty = true;
  }
  function refit() { try { if (isOpen()) fit(); return isOpen(); } catch (e) { return false; } }

  /* ---------- frame loop ---------- */
  function update() {
    var t = simT(), run = L.run;
    if (run) { tick(run, t); handle(drain(run)); if (!L) return; run = L.run; }
    if (L.titleUntil && t >= L.titleUntil) L.titleUntil = 0;
    if (L.screen === 'step' && run && run.phase === 'step') {
      if (!L.titleUntil && L.demoAt !== run.si) maybeDemo();
      checkIdle(run);
    }
    if (L.hint && t - L.hint.at >= L.hint.dur) { if (L.hint.seen) markSeen(L.hint.seen); L.hint = null; L.dirty = true; }
    if (L.landBuzz != null && t >= L.landBuzz) { L.landBuzz = null; buzz('flip'); }   /* the landing frame (arc frame 3) */
    if (L.screen === 'reveal') {
      if (L.doneBuzz != null && t >= L.doneBuzz) { L.doneBuzz = null; buzz('done'); }
      if (!L.chipOn && t >= L.chipAt) {   /* 450 ms: the again chip shows (not quiet); by key it takes focus */
        L.chipOn = true; L.shown = true; updVerb();
        focusEl(kbd ? D.verb : D.stage);
      }
    }
    if (L.auto) autoStep(t);
    var jf = frameSig(t);
    if (jf !== L.jf) { L.jf = jf; L.dirty = true; }
  }
  /* redraw when any 12 fps frame changes: the global grid (bubbles, flames), every reaction's own frame count from its
     start, the slide frame, and the art's own counters (fh, fbc, fl, t: each runs from its event, so each is painted once
     per frame, never held a frame and then skipped) */
  function frameSig(t) {
    var s = Math.floor(t / FMS) >>> 0, i, fx;
    for (i = 0; i < L.fxq.length; i++) s = (Math.imul(s, 31) + Math.floor((t - L.fxq[i].at) / FMS)) >>> 0;
    for (i = 0; i < L.parts.length; i++) s = (Math.imul(s, 31) + Math.floor((t - L.parts[i].at) / FMS)) >>> 0;
    if (L.hint) s = (Math.imul(s, 31) + Math.floor((t - L.hint.at) / FMS)) >>> 0;
    if (L.slide) s = (Math.imul(s, 31) + 0x51 + Math.floor((t - L.slide.t0) / FMS)) >>> 0;
    if (!L.reduced && L.run) {
      fx = fxNow(L.run, t);
      [fx.fh, fx.fbc, fx.fl, fx.t].forEach(function (v) { s = (Math.imul(s, 31) + (v == null ? 0x5bd1 : v + 1)) >>> 0; });
    }
    return s;
  }
  var FL_MAX = 48;   /* the landing counter stops at 4 s (the art's landing bloom ends at 36): no more redraws for it */
  function fxNow(run, t) {   /* frame counters for the art's stateless heat effects (12 fps); null = not known */
    var st = run && run.st, o = { seed: run ? fxSeed(run.seed, 0) & 0x7fffffff : null, fh: null, fbc: null, fl: null, t: null };
    if (st && st.kind === 'flip' && st.heat && st.heatAt != null && run.t0 != null) {
      var ms = t - run.t0 - st.heatAt;
      o.fh = Math.max(0, Math.floor(ms / FMS));
      if (st.band > 0) o.fbc = Math.max(0, Math.floor((ms - st.band * st.bandMs) / FMS));
    }
    if (L.landAt != null && t >= L.landAt && L.screen === 'step' && run && run.phase !== 'reveal') o.fl = Math.min(FL_MAX, Math.floor((t - L.landAt) / FMS));   /* the pan and the board only */
    if (run && run.phase === 'reveal' && !L.reduced) o.t = Math.max(0, Math.floor((t - L.revealAt) / FMS));
    return o;
  }
  function paintStage(b, J, t, bare) {   /* the stage scene into the 144 x 160 buffer; bare: no particles and no hand (slides) */
    var A = art(), run = L.run, f = L.reduced ? 0 : Math.floor(t / FMS), fx = fxNow(run, t);
    if (!run) return;
    if (run.phase === 'reveal') A.revealScene(b, { geo: 'close', look: lookOf(run), herb: run.swaps.herb, f: J.rise, t: fx.t, seed: fx.seed, still: L.reduced });
    else {
      var st = run.st, herb = run.swaps.herb, d0 = run.looks[0] && run.looks[0].dents ? run.looks[0].dents : [];
      if (st.kind === 'tap') A.tapScene(b, { shape: st.shape, dents: st.dents, marks: st.marks, per: st.per, herb: herb, flash: J.flash, squash: J.squash, dust: L.dust, f: f });
      else if (st.kind === 'flip') {
        A.flipScene(b, { heat: st.heat, band: st.band, res: J.arc ? null : st.res, arc: J.arc, herb: herb, dents: d0,
          spatula: L.finger && !J.arc ? L.finger : undefined, arrow: st.heat && st.res === null ? (L.reduced ? 0 : (f >> 2) & 1) : null,
          bump: J.bump, flash: J.flash, still: L.reduced, f: f, seed: fx.seed, fh: fx.fh, fbc: fx.fbc, fl: fx.fl });
      } else if (st.kind === 'slice') {
        A.sliceScene(b, { band: run.looks[1] ? run.looks[1].band : 1, herb: herb, dents: d0, lines: st.lines, cur: st.cur, flash: J.cut, hand: st.hand, f: f, seed: fx.seed, fl: fx.fl, still: L.reduced });
      }
    }
    if (J.squash) L.stats.squash++;
    if (J.arc) L.stats.arc++;
    if (L.parts.length) {
      var list = [];
      L.parts = L.parts.filter(function (p) {
        var a = Math.floor((t - p.at) / FMS); if (a > p.life) return false;
        var x = p.x + p.vx * a, y = p.y + p.vy * a + ((a * (a - 1)) >> 1);
        if (x >= 2 && y >= 2 && x < ART_W - 2 && y < ART_H - 2) list.push({ x: x, y: y, k: p.k, a: a, life: p.life });
        return true;
      });
      if (!bare) A.particles(b, list);
    }
    if (L.hint && !bare) {
      var h = L.hint, hf = Math.floor((t - h.at) / FMS) % 4, o = {};
      for (var key in h.spec) o[key] = h.spec[key];
      o.f = L.reduced ? 0 : hf; o.still = L.reduced;
      A.hand(b, o);
    }
  }
  function render() {
    if (!L.dirty || !L.view) return;
    L.dirty = false; L.frames++;
    var t = L.lastT, J = juiceAt(t), sp = slideAt(t), sl = sp ? L.slide : null, V = L.view;
    if (!sp) L.slide = null;
    if (sl) {
      if (!sl.inb) paintStage(L.buf, J, t, true);   /* the live scene comes in (again, or no station bases in the art) */
      composeSlide(V, sl, sp);
    } else {
      paintStage(L.buf, J, t, false);
      layer(V, stationNow(), L.buf, L.ox, L.oy, 0, V.w);
    }
    if (J.shake) { shakeView(V, J.shake[0], J.shake[1]); L.stats.shake++; }
    L.img.data.set(V.d);
    D.ctx.putImageData(L.img, 0, 0);
  }
  function frame() {
    if (!L) return;
    var me = L;
    try { update(); if (L === me) render(); } catch (e) { me.err++; }
    if (L === me) me.raf = window.requestAnimationFrame(frame);
  }
  function autoStep(t) {   /* tests: the chip path with short pauses through the current dish; it stops on the plate */
    var a = L.auto, run = L.run;
    if (L.screen === 'step' && run && run.phase === 'step') {
      if (run.t - run.t0 >= TUNE.gateMs + 50 && t >= a.next) { a.next = t + 300; send({ t: t, k: 'b' }); }
      return;
    }
    if (L.screen === 'reveal') L.auto = null;
  }

  /* ---------- dialog (spec 2.5) ---------- */
  function build() {
    if (D) return;
    var d = {};
    d.cv = el('canvas', { class: 'ck-cv', width: String(LAY.VIEW_W), height: String(ART_H), 'aria-hidden': 'true' });
    d.sim = el('div', { class: 'ck-sim', 'aria-hidden': 'true' });       /* the invisible 288 x 320 logical box */
    d.stick = el('div', { class: 'ck-stick', 'aria-hidden': 'true' });   /* reaction stickers mount here: sticker() */
    d.stage = el('div', { class: 'ck-stage', tabindex: '-1' }, [d.cv, d.sim, d.stick]);
    d.strip = el('div', { class: 'ck-strip ck-paper', 'aria-hidden': 'true' });
    d.closeCv = el('canvas', { width: '16', height: '16', 'aria-hidden': 'true' });
    d.close = el('button', { type: 'button', class: 'ck-close', 'aria-label': WORDS.close }, [el('span', { class: 'ck-chip ck-paper', 'aria-hidden': 'true' }, [d.closeCv])]);
    d.closeCv.ckIcon = null; d.closeCv.ckN = 0;
    d.hud = el('div', { class: 'ck-hud' }, [d.strip, d.close]);
    d.verbCv = el('canvas', { width: '16', height: '16', 'aria-hidden': 'true' });
    d.verb = el('button', { type: 'button', class: 'ck-verb ck-paper', 'aria-label': '', hidden: '' }, [d.verbCv]);
    d.noteT = el('p', { class: 'ck-note-t' });
    d.noteGo = el('button', { type: 'button', class: 'ck-note-go' });
    d.note = el('div', { class: 'ck-note', hidden: '' }, [d.noteT, d.noteGo]);
    d.say = el('p', { class: 'ck-say', 'aria-live': 'polite' });
    d.probe = el('div', { class: 'ck-probe', 'aria-hidden': 'true' });
    d.dlg = el('dialog', { class: 'ck-dlg', id: 'cook-dlg', 'aria-label': WORDS.dish.jeon }, [d.stage, d.hud, d.verb, d.note, d.say, d.probe]);
    d.ctx = d.cv.getContext('2d');
    document.body.appendChild(d.dlg);
    D = d;
    d.close.addEventListener('click', function (e) { if (L && e && e.detail === 0) L.closeKbd = true; close(); });   /* detail 0: a key or a screen reader */
    d.verb.addEventListener('click', onVerb);
    d.noteGo.addEventListener('click', noticeGo);
    d.dlg.addEventListener('cancel', function () { if (L) L.closeKbd = true; });   /* Esc: closed by key */
    d.dlg.addEventListener('close', onClosed);
    d.dlg.addEventListener('keydown', function (e) {   /* a held Enter / Space presses once (design 2.3, test L11) */
      if (e.repeat && (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar')) { e.preventDefault(); e.stopPropagation(); }
    }, true);
    d.dlg.addEventListener('pointerdown', function () { if (L) { L.downAt = performance.now(); L.rowPress = false; } }, true);   /* every press, first */
    d.verb.addEventListener('pointerdown', function (e) { try { onRowDown(e); } catch (x) { if (L) L.err++; } }, true);
    d.stage.addEventListener('pointerdown', function (e) { try { onDown(e); } catch (x) { if (L) L.err++; } });
    d.stage.addEventListener('pointermove', function (e) { try { onMove(e); } catch (x) { if (L) L.err++; } });
    d.stage.addEventListener('pointerup', function (e) { try { onUp(e); } catch (x) { if (L) L.err++; } });
    d.stage.addEventListener('pointercancel', function (e) { try { onCancel(e); } catch (x) { if (L) L.err++; } });
    d.stage.addEventListener('lostpointercapture', function (e) {   /* an up that never came: free the finger (flip and slice follow one) */
      try { if (L && L.down[e.pointerId]) onCancel(e); } catch (x) { if (L) L.err++; }
    });
    d.stage.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    d.dlg.addEventListener('contextmenu', function (e) { if (e.target === d.cv) e.preventDefault(); });
    window.addEventListener('resize', function () { try { if (L) fit(); } catch (e) { if (L) L.err++; } });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', function () { try { if (L) fit(); } catch (e) { if (L) L.err++; } });
    document.addEventListener('visibilitychange', function () {
      if (!L) return;
      try {
        if (document.hidden) { cancelAll(); freeze(); savePot(); sound({ act: 'quiet' }); }
        else {
          thaw(); cancelAll(); L.dirty = true;
          var st = L.run && L.run.phase === 'step' ? L.run.st : null;   /* the pan is still on: the sizzle comes back (quiet stopped it) */
          if (st && st.kind === 'flip' && st.heat && !st.done) sound({ act: 'sizzle', band: st.band });
        }
      } catch (e) { L.err++; }
    });
    window.addEventListener('pagehide', function () { try { if (L) savePot(); } catch (e) { /* storage */ } });
  }
  function settle0(me) {   /* closing work for one open: save, quiet, stop the loop (runs once per open) */
    if (!me || me.closed) return;
    me.closed = true;
    var keep = L; L = me;
    try { savePot(); } catch (e) { /* storage */ }
    sound({ act: 'quiet' });
    L = keep;
    try { window.cancelAnimationFrame(me.raf); } catch (e) { /* none */ }
    clearTimeout(say.timer);
    unstick();
    document.documentElement.classList.remove('ck-open');
  }
  function onClosed() {
    if (!L || (D && D.dlg.open)) return;   /* a late close event after a new open is not ours */
    var me = L, byKey = !!(me.closeKbd || kbd);
    settle0(me);
    L = null;
    D.note.hidden = true;
    if (!me.after) {   /* focus back to the opener, else the play-room door, else the main button (design 3.3) */
      var list = [me.opener, document.getElementById('btn-play-door'), document.getElementById('btn-go')];
      for (var i = 0; i < list.length; i++) if (shownEl(list[i])) { focusEl(list[i]); break; }
    }
    if (typeof me.onClose === 'function') { try { me.onClose({ kbd: byKey }); } catch (e) { /* host */ } }
    if (typeof me.after === 'function') { try { me.after(); } catch (e) { /* host */ } }
  }
  function close() { try { if (D && D.dlg.open) D.dlg.close(); } catch (e) { /* already closed */ } }
  function isOpen() { return !!(L && D && D.dlg.open); }
  function open(opts) {
    try {
      opts = opts || {};
      if (isOpen()) return true;
      if (!art()) return false;
      build();
      if (typeof D.dlg.showModal !== 'function') return false;
      if (L) { settle0(L); L = null; }
      curKey = typeof opts.storeKey === 'string' && KEY_RE.test(opts.storeKey) ? opts.storeKey : KEY0;
      var slow = num(opts.slow) || num(parseFloat(urlOpt('slow'))) || 1, seed = opts.seed;
      L = { opener: opts.opener || document.activeElement, day: typeof opts.day === 'string' && DAY_RE.test(opts.day) ? opts.day : null,
        reduced: wantReduced(opts.reduced), slow: Math.max(0.25, Math.min(16, slow)), rec: !!(opts.rec || urlOpt('rec') === '1'),
        seed: seed === undefined || seed === null || seed === '' ? null : toU32(seed),
        palette: typeof opts.palette === 'string' ? opts.palette.slice(0, 16) : null,
        onResult: opts.onResult, onClose: opts.onClose, after: null, closed: false, closeKbd: false,
        clock: { base: 0, since: document.hidden ? null : performance.now() }, lastT: 0, jf: -1,
        run: null, runDay: null, screen: 'step', seen: [], shown: false, finished: null,
        fx: 0, fxq: [], parts: [], dust: [], prng: null, hint: null, hintKey: null, demoAt: -1, titleUntil: 0, finger: null,
        down: {}, rect: null, sndAt: {}, said: [], note: null, auto: null, revealAt: 0, chipAt: 0, againAt: 0, chipOn: false,
        downAt: 0, rowPress: false, nudges: 0, taught: 0, landAt: null, landBuzz: null, doneBuzz: null, nextAt: null, noSlide: false, slide: null,
        stats: { parts: 0, squash: 0, shake: 0, arc: 0, hints: 0, idle: 0, flips: 0, teach: 0, rowPress: 0, slides: 0, potOld: 0, buzz: { tap: 0, flip: 0, cut: 0, done: 0 } },
        frames: 0, err: 0, dirty: true, buf: art().blank(ART_W, ART_H), view: null, img: null, bgc: [], raf: 0,
        k: 1, css: 1, dpr: 1, W: 0, H: 0, ox: 0, oy: 0, stride: 8, hudB: 0, chipTop: 0, safe: [0, 0, 0, 0], vw: 0, vh: 0 };
      if (L.palette && /^[a-z0-9-]+$/.test(L.palette)) D.dlg.setAttribute('data-palette', L.palette); else D.dlg.removeAttribute('data-palette');
      D.note.hidden = true; D.say.textContent = ''; D.strip.textContent = ''; D.closeCv.ckIcon = iconOf('close'); D.closeCv.ckN = 0;
      D.verbCv.ckName = null;
      document.documentElement.classList.add('ck-open');
      setKbd(kbd);
      D.dlg.showModal();
      fit();
      if (!begin(false)) throw new Error('no dish');
      L.raf = window.requestAnimationFrame(frame);
      return true;
    } catch (e) {
      try { if (L) settle0(L); L = null; if (D && D.dlg.open) D.dlg.close(); document.documentElement.classList.remove('ck-open'); } catch (e2) { /* nothing more to undo */ }
      return false;
    }
  }

  /* ---------- the notice slot (dormant: nothing calls it; it shows words, so any use needs the owner): under the HUD,
     it never moves the canvas or takes focus ---------- */
  function notice(o) {
    try {
      if (!isOpen()) return false;
      o = o || {};
      var text = String(o.text || '').slice(0, 80), short = String(o.short || o.text || '').slice(0, 40);
      if (!text) return false;
      L.note = { text: text, short: short, fn: typeof o.fn === 'function' ? o.fn : null };
      D.noteT.textContent = text;
      D.noteGo.textContent = String(o.label || WORDS.go).slice(0, 20);
      D.note.hidden = false;
      say(text);
      return true;
    } catch (e) { return false; }
  }
  function noticeGo() {   /* save the pot, close, and run fn at the end of the close event (opener focus is skipped) */
    if (!L) return;
    try { savePot(); } catch (e) { /* storage */ }
    sound({ act: 'quiet' });
    L.after = L.note && L.note.fn ? L.note.fn : function () {};
    close();
  }

  /* ---------- data in and out (the main game's export / import carries the notebook; the pot never travels) ---------- */
  function exportData(key) {   /* key (optional): another kitchen key, e.g. cook.html's; anything else is refused */
    var keep = curKey;
    try { if (key != null && !(typeof key === 'string' && KEY_RE.test(key))) return null; if (key) curKey = key; var o = readStore(); return { v: 1, seen: o.seen.slice(), book: clone(o.book) }; }
    catch (e) { return null; } finally { curKey = keep; }
  }
  function importData(obj, key) {
    var keep = curKey;
    try {
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
      if (key != null && !(typeof key === 'string' && KEY_RE.test(key))) return false;
      if (key) curKey = key;
      var inc = normStore(obj), o = readStore();
      o.book = inc.book; o.pot = null;
      inc.seen.forEach(function (k) { if (o.seen.indexOf(k) < 0 && o.seen.length < 8) o.seen.push(k); });
      return writeStore(o);
    } catch (e) { return false; } finally { curKey = keep; }
  }

  /* ---------- test hooks (spec 14) ---------- */
  function live() {
    if (!L) return { screen: 'closed', recipe: null, si: null, kind: null, phase: null, progress: 0, done: false, tag: null, band: null, quiet: true, fx: 0,
      station: null, slide: null, view: null, verb: '', stick: false };
    var run = L.run, st = run && run.st, sp = slideAt(L.lastT), sl = L.slide;
    return { screen: L.screen, recipe: run ? run.recipe : null, si: run ? run.si : null, kind: st && run.phase !== 'reveal' ? st.kind : null,
      phase: run ? run.phase : null, progress: st ? st.progress : 0, done: run ? !!run.done : false, tag: st ? st.tag : null,
      band: st && st.kind === 'flip' ? st.band : null, quiet: !(L.shown || document.activeElement === D.verb), fx: L.fx,
      verb: D.verb.hidden ? '' : D.verb.getAttribute('aria-label') || '', hint: L.hint ? L.hint.why : null, title: false, note: !D.note.hidden,
      station: stationNow(), slide: sp && sl ? { from: sl.from, to: sl.to, f: sp.f, s: sp.s, carry: sl.carry } : null,
      view: { k: L.k, css: L.css, W: L.W, H: L.H, ox: L.ox, oy: L.oy, hudB: L.hudB, chipTop: L.chipTop, safe: L.safe.slice() },
      stick: !D.stick.hidden, chip: L.chipOn, t0: run ? run.t0 : null, revealAt: L.screen === 'reveal' ? L.revealAt : null,
      k: L.k, css: L.css, tight: false, reduced: L.reduced, slow: L.slow, frames: L.frames, err: L.err, said: L.said.slice(),
      stats: clone(L.stats), seed: run ? run.seed : null, id: run ? run.id : null, look: run ? lookOf(run) : null,
      st: st ? clone(st) : null, pending: !!(run && !run.done), key: curKey, seen: L.seen.slice() };
  }
  function auto(on) { if (!isOpen()) return false; L.auto = on ? { next: 0 } : null; return true; }

  API.open = open; API.close = close; API.isOpen = isOpen; API.notice = notice; API.refit = refit;
  API.exportData = exportData; API.importData = importData; API.live = live; API.auto = auto;

  return API;
})();
