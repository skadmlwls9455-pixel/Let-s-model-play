/* js/cook-steps.js -- round 7 (11-21): the recipe book's five dishes as data, and six new step kinds for the kitchen
 * simulation. One global COOK_STEPS. No DOM, no clock, no random calls, file:// safe, runs in node. Load it BEFORE
 * js/cook.js: cook.js appends RECIPES to its own list and calls install(h) with its closed helpers. Without this file
 * the kitchen still works with its three legacy dishes (the old node suites load js/cook.js alone on purpose).
 *
 * Nothing here can fail a player: progress never falls, there is no miss event, no score and no time limit; the verb
 * button (run input k 'b') finishes every step in at most three presses.
 *
 * UNITS as in js/cook.js: step data is in art px on the 144 x 160 stage (food centre 72, 86); step state and pointer
 * samples are logical px (art x 2); time is integer ms on the step clock; looks are small integers.
 *
 * RECIPE  { id, v2: true, tier, at, ings: [ing ids], fx (the day effect's name, for the book page), steps: [...] }
 *   v2 = looks are kept per step: COOK.lookOf(run) = { v: 2, s: [look per step], plate, band? } (band = the last flip or
 *   bake band, for the dish picture). A legacy recipe keeps its flat look.
 * STEP    { kind, station ('counter' | 'stove' | 'board'), name (WORDS.verb key: the button's aria-label), pic (the
 *   book's pictogram id), box { cx, cy, w, h, rx: [..], ry: [..], inset } (the food box, as TUNE.food), kind numbers,
 *   art { ... } (what js/cook-steps-art.js draws: sprite ids of js/cook-sprites.js and where) }.
 * KINDS   (state besides the shared fields of js/cook.js base(); hand = { x, y } logical ints of the finger or null)
 *   stir   cx, cy (logical centre), need (deg), deg (accumulated, either direction), q (quarter turns emitted), pen, hand.
 *          events: turn { i, snd stir } every quarter turn. look { turns }.
 *   pour   need (ms of holding), ms (banked), hold { id, at } | null, shown (ms now), fill 0..3 (thirds reached).
 *          events: pour { on, snd pour | quiet }, fill { i }. Letting go only pauses. look { fill: 3 }.
 *   drag   items [{ x, y, hx, hy, on, slot }], slots [{ x, y, by }], order (slots fill in order), n placed, pen, hand.
 *          events: lift { i, snd lift }, place { i, k, snd place }, back { i, snd back } (a drop elsewhere: the item is
 *          home again at once, the live half lets it glide). look { n }.
 *   rub    cols, rows, bins [0|1], n, need (80 %), third 0..3, pen, hand. events: rub { n, x, y, snd scrub },
 *          coat { i } at each third. look { bins }.
 *   swipe  need, n, dir 'up', stroke. events: roll { i, snd flip }. look { n }.
 *   bake   bandMs, heat, heatAt, band 0..2, res. First touch = heat on; the band rises every bandMs and waits at 2; a
 *          touch at least minMs later takes it out at the band of that moment. events: heat { band 0, say, snd clink },
 *          band { band, say }, out { band, snd lift }. look { band }, tag soft | golden | crisp.
 */
var COOK_STEPS = (function () {
  'use strict';

  function freeze(o) {
    if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); Object.keys(o).forEach(function (k) { freeze(o[k]); }); }
    return o;
  }

  /* every number of the new kinds (kept out of COOK.TUNE: TUNE_HASH and every legacy pot stay as they were) */
  var NUM = freeze({
    stir: { turns: 3, rMin: 8, quarter: 90 },          /* samples closer than 8 logical px to the centre do not count */
    pour: { ms: 2400, parts: 3 },                      /* about 2.4 s of holding in total */
    drag: { reach: 64, snap: 28 },                     /* pick up within 64 logical px of an item; snap within 28 of its slot */
    rub: { cols: 8, rows: 6, r: 14, cover: 0.8, seg: 8, parts: 3 },
    swipe: { strokes: 3, flick: 32, cone: 45 },
    bake: { bandMs: 3000, minMs: 600, crispHintMs: 5000 },
    between: { swipe: 600, bake: 600, pour: 600 }      /* ms a finished step of that kind stays on screen (else TUNE.betweenMs) */
  });

  var WORDS = freeze({
    dish: { jeon2: '해초전', gyeran: '계란말이', jumeokbap2: '주먹밥', kkochi2: '과일 꼬치', cake: '딸기 케이크' },
    verb: { chop: '썰기', stir: '젓기', pour: '붓기', flip: '뒤집기', heat: '불 켜기', crack: '달걀 깨기', roll: '말기', scoop: '밥 담기',
      sprinkle: '깨 뿌리기', press: '모양 잡기', wrap: '김 붙이기', wash: '씻기', thread: '꼬치에 끼우기', glaze: '시럽 입히기',
      bake: '굽기', out: '꺼내기', spread: '크림 바르기', top: '딸기 올리기' },
    book: '요리 수첩', call: '문어 부르기', table: '식탁에 두기'
  });

  var BOX = { cx: 72, cy: 86, w: 64, h: 48, rx: [29], ry: [19], inset: 3 };   /* the legacy food box (stage centre) */
  function box(o) { var b = { cx: BOX.cx, cy: BOX.cy, w: BOX.w, h: BOX.h, rx: BOX.rx, ry: BOX.ry, inset: BOX.inset }; for (var k in o) b[k] = o[k]; return b; }
  var EGGS = [[-24, -40], [0, -44], [24, -40]];         /* three eggs behind the bowl, from the box centre (art px) */
  var CRACK = { kind: 'tap', marks: 3, hits: 2, at: EGGS, jitter: 0, station: 'counter', name: 'crack', pic: 'step.crack', box: box({ rx: [30], ry: [22] }) };
  function crack(mix) { var s = {}; for (var k in CRACK) s[k] = CRACK[k]; s.art = { type: 'crack', bowl: [72, 98], mix: mix }; return s; }
  function stir(turns, name, pic, art, station, c) {
    return { kind: 'stir', turns: turns, station: station || 'counter', name: name, pic: pic, box: box({ cx: c[0], cy: c[1], rx: [24], ry: [14] }), art: art };
  }

  var RECIPES = freeze([
    { id: 'jeon2', v2: true, tier: 1, at: 'pan', fx: 'sparkle', ings: ['flour', 'water', 'greens', 'oil'], steps: [
      { kind: 'slice', lines: 3, cross: false, station: 'board', name: 'chop', pic: 'step.slice', box: box({ rx: [32], ry: [13] }), art: { type: 'cuts', spr: 'greens' } },
      stir(3, 'stir', 'step.stir', { type: 'bowl', bowl: [72, 98], mix: 'mix.jeon' }, 'counter', [72, 86]),
      { kind: 'pour', station: 'stove', name: 'pour', pic: 'step.pour', box: box({}), art: { type: 'pour', pan: 'round', spr: 'jeon.pan', at: [72, 86], frames: [-1, 0, 1, 2], rest: 2 } },
      { kind: 'flip', band: 3000, station: 'stove', name: 'flip', pic: 'step.flip', box: box({}), art: { type: 'flip', pan: 'round', spr: 'jeon.pan', at: [72, 86], bands: [2, 3, 4] } },
      { kind: 'slice', lines: 2, cross: true, station: 'board', name: 'chop', pic: 'step.slice', box: box({}), art: { type: 'cross', spr: 'jeon.pan', at: [72, 86], bands: [2, 3, 4] } }] },
    { id: 'gyeran', v2: true, tier: 1, at: 'pan', fx: 'bubble', ings: ['egg', 'salt', 'oil'], steps: [
      crack('mix.egg'),
      stir(3, 'stir', 'step.stir', { type: 'bowl', bowl: [72, 98], mix: 'mix.egg' }, 'counter', [72, 86]),
      { kind: 'pour', station: 'stove', name: 'pour', pic: 'step.pour', box: box({}), art: { type: 'pour', pan: 'square', spr: 'gyeran.pan', at: [72, 86], frames: [-1, 0, 1, 2], rest: 3 } },
      { kind: 'swipe', strokes: 3, dir: 'up', station: 'stove', name: 'roll', pic: 'step.roll', box: box({}), art: { type: 'roll', pan: 'square', spr: 'gyeran.pan', at: [72, 86], from: 3 } },
      { kind: 'slice', lines: 3, cross: false, station: 'board', name: 'chop', pic: 'step.slice', box: box({ rx: [34], ry: [16] }), art: { type: 'cuts', spr: 'gyeran.board' } }] },
    { id: 'jumeokbap2', v2: true, tier: 1, at: 'bowl', fx: 'star', ings: ['rice', 'salt', 'sesame', 'gim'], steps: [
      { kind: 'drag', station: 'counter', name: 'scoop', pic: 'step.scoop', box: box({ cy: 96 }), items: [[72, 52], [72, 52], [72, 52]], slots: [[72, 98], [72, 98], [72, 98]], order: true,
        art: { type: 'scoop', pot: [72, 62], bowl: [72, 110], item: 'paddle' } },
      { kind: 'rub', station: 'counter', name: 'sprinkle', pic: 'step.sprinkle', box: box({ cy: 98, w: 56, h: 36 }), art: { type: 'sprinkle', pot: [72, 62], bowl: [72, 110], tool: 'shaker', mix: 'mix.rice' } },
      stir(2, 'stir', 'step.stir', { type: 'bowl', pot: [72, 62], bowl: [72, 110], mix: 'mix.rice' }, 'counter', [72, 98]),
      { kind: 'tap', marks: 3, hits: 2, at: [[-13, 6], [13, 6], [0, -11]], jitter: 0, station: 'board', name: 'press', pic: 'step.press', box: box({ rx: [24], ry: [20] }), art: { type: 'press', spr: 'rice.shape', at: [72, 92] } },
      { kind: 'drag', station: 'board', name: 'wrap', pic: 'step.wrap', box: box({}), items: [[98, 62]], slots: [[72, 90]], order: true,
        art: { type: 'wrap', spr: 'rice.shape', at: [72, 92], item: 'gim' } }] },
    { id: 'kkochi2', v2: true, tier: 1, at: 'board', fx: 'petal', ings: ['berry', 'grape', 'tang', 'sugar'], steps: [
      { kind: 'rub', station: 'counter', name: 'wash', pic: 'step.wash', box: box({ cy: 84, w: 60, h: 36 }), art: { type: 'wash', basin: [72, 92], spr: 'fruit.wash', at: [72, 86] } },
      { kind: 'slice', lines: 2, cross: false, station: 'board', name: 'chop', pic: 'step.slice', box: box({ rx: [34], ry: [18] }), art: { type: 'cuts', spr: 'fruit.board' } },
      { kind: 'drag', station: 'board', name: 'thread', pic: 'step.thread', box: box({}), items: [[48, 64], [72, 60], [96, 64]], slots: [[56, 102], [72, 102], [88, 102]], order: true,
        art: { type: 'thread', skewer: [72, 104], item: 'fruit.piece' } },
      stir(2, 'glaze', 'step.glaze', { type: 'glaze', pot: [72, 96], spr: 'kkochi.coat', at: [72, 80] }, 'stove', [72, 84])] },
    { id: 'cake', v2: true, tier: 1, at: 'oven', fx: 'confetti', ings: ['egg', 'flour', 'sugar', 'cream', 'berry'], steps: [
      crack('mix.cake'),
      stir(3, 'stir', 'step.stir', { type: 'bowl', bowl: [72, 98], mix: 'mix.cake' }, 'counter', [72, 86]),
      { kind: 'pour', station: 'counter', name: 'pour', pic: 'step.pour', box: box({}), art: { type: 'pour', pan: 'none', spr: 'tin', at: [72, 92], frames: [0, 1, 2, 3], rest: 3 } },
      { kind: 'bake', band: 3000, station: 'oven', name: 'bake', pic: 'step.bake', box: box({}), art: { type: 'oven', spr: 'oven', at: [72, 102] } },
      { kind: 'rub', station: 'board', name: 'spread', pic: 'step.spread', box: box({ cy: 76, w: 56, h: 30 }), art: { type: 'spread', spr: 'cake.base', at: [72, 98] } },
      { kind: 'drag', station: 'board', name: 'top', pic: 'step.top', box: box({}), items: [[46, 124], [72, 128], [98, 124]], slots: [[58, 76], [72, 72], [86, 76]], order: false,
        art: { type: 'top', spr: 'cake.base', at: [72, 98], item: 'berry.top' } }] }
  ]);
  /* a legacy dish and the book dish that took its place (the book opens on it; its stamp counts old lines too) */
  var NEXT = freeze({ jeon: 'jeon2', jumeokbap: 'jumeokbap2', kkochi: 'kkochi2' });
  var FREE = freeze(['jeon2', 'gyeran', 'jumeokbap2']);   /* the book's dishes that need no gift (contract C2) */

  function recipe(id) { for (var i = 0; i < RECIPES.length; i++) if (RECIPES[i].id === id) return RECIPES[i]; return null; }
  /* what a pot of this recipe is hashed with: its steps and every number above */
  function tuneText(id) { var r = recipe(id); return r ? JSON.stringify(r.steps) + '|' + JSON.stringify(NUM) : null; }
  function isInt(v) { return typeof v === 'number' && isFinite(v) && Math.floor(v) === v; }
  function clampI(v, lo, hi, d) { return isInt(v) ? Math.max(lo, Math.min(hi, v)) : d; }
  function one(lk, key) { return !!lk && typeof lk === 'object' && !Array.isArray(lk) && Object.keys(lk).length === 1 && isInt(lk[key]); }

  function turnsOf(step) { return clampI(step.turns, 1, 9, NUM.stir.turns); }
  function strokesOf(step) { return clampI(step.strokes, 1, 9, NUM.swipe.strokes); }
  function itemsOf(step) { return Array.isArray(step.items) ? step.items.length : 0; }
  var BINS = NUM.rub.cols * NUM.rub.rows;

  /* a finished step's look: the default, and whether a saved one is valid (null / undefined = not one of these kinds) */
  function defaultLook(step) {
    switch (step.kind) {
      case 'stir': return { turns: turnsOf(step) };
      case 'pour': return { fill: NUM.pour.parts };
      case 'drag': return { n: itemsOf(step) };
      case 'rub': return { bins: BINS };
      case 'swipe': return { n: strokesOf(step) };
      case 'bake': return { band: 1 };
      default: return null;
    }
  }
  function validLook(step, lk) {
    switch (step.kind) {
      case 'stir': return one(lk, 'turns') && lk.turns === turnsOf(step);
      case 'pour': return one(lk, 'fill') && lk.fill === NUM.pour.parts;
      case 'drag': return one(lk, 'n') && lk.n === itemsOf(step);
      case 'rub': return one(lk, 'bins') && lk.bins === BINS;
      case 'swipe': return one(lk, 'n') && lk.n === strokesOf(step);
      case 'bake': return one(lk, 'band') && lk.band >= 0 && lk.band <= 2;
      default: return null;
    }
  }
  function validTag(kind, tg, bands) {
    if (kind === 'bake') return bands.indexOf(tg) >= 0;
    if (kind === 'stir' || kind === 'pour' || kind === 'drag' || kind === 'rub' || kind === 'swipe') return tg === null;
    return null;
  }
  function between(kind) { return typeof NUM.between[kind] === 'number' ? NUM.between[kind] : null; }
  /* the button's label for a step right now (a WORDS.verb string), or '' */
  function verb(step, st) {
    if (!step) return '';
    var k = step.name;
    if (st && st.kind === 'flip') k = st.heat ? 'flip' : 'heat';
    if (st && st.kind === 'bake') k = st.heat ? 'out' : 'bake';
    return WORDS.verb[k] || '';
  }
  function hintAt(st) {   /* step ms when the idle hand is due for a kind that waits on purpose, else undefined */
    if (st.kind === 'bake' && st.heat) return st.heatAt + 2 * st.bandMs + NUM.bake.crispHintMs;
    return undefined;
  }

  /* install(h): h = { KIND, base, rise, emit, boxOf, clampInt, dist, ri, BANDS, bandWords } from js/cook.js */
  function install(h) {
    var KIND = h.KIND, base = h.base, rise = h.rise, emit = h.emit, boxOf = h.boxOf, dist = h.dist, ri = h.ri, SC = 2;
    function at(s) { return { x: ri(s.x), y: ri(s.y) }; }

    /* ---------- stir: circles around the centre, either direction; wobble and ellipses are fine ---------- */
    function angOf(st, s) {
      var dx = s.x - st.cx, dy = s.y - st.cy;
      return dx * dx + dy * dy < NUM.stir.rMin * NUM.stir.rMin ? null : Math.atan2(dy, dx) * 180 / Math.PI;
    }
    function stirBy(st, deg, t) {
      if (st.done || !(deg > 0)) return;
      st.deg = Math.min(st.need, st.deg + deg); st.prog = t;
      var q = Math.floor(st.deg / NUM.stir.quarter + 1e-6);
      while (st.q < q) { emit(st, 'turn', { i: st.q, snd: { act: 'stir', i: st.q } }); st.q++; }
      rise(st, st.deg / st.need, t);
    }
    KIND.stir = {
      multi: false, sayHalf: true,
      init: function (step, seed, food) {
        return base('stir', { box: boxOf(food), cx: food.cx * SC, cy: food.cy * SC, need: turnsOf(step) * 360, deg: 0, q: 0, pen: null, hand: null });
      },
      down: function (st, s) { if (st.done) return; st.pen = { id: s.id, a: angOf(st, s) }; st.hand = at(s); },
      move: function (st, s) {
        var p = st.pen; if (!p || p.id !== s.id) return;
        st.hand = at(s);
        var a = angOf(st, s); if (a === null) { p.a = null; return; }
        if (p.a !== null) { var d = a - p.a; if (d > 180) d -= 360; else if (d < -180) d += 360; stirBy(st, Math.abs(d), s.t); }
        p.a = a;
      },
      up: function (st, s) { if (st.pen && st.pen.id === s.id) { st.pen = null; st.hand = null; } },
      cancel: function (st, s) { if (!s || (st.pen && st.pen.id === s.id)) { st.pen = null; st.hand = null; } },
      tick: function () {},
      alt: function (st, t) { stirBy(st, 360, t); },   /* one press = one turn */
      look: function (st) { return { turns: Math.round(st.need / 360) }; },
      tag: function () { return null; }
    };

    /* ---------- pour: press and hold anywhere; letting go only pauses. Time based: the fill at step ms t is
       ms + (t - hold.at), read by tick, so any frame rate gives the same end (doneT is the exact ms) ---------- */
    function pourRise(st, t) {
      if (st.done) return;
      var cur = Math.min(st.need, st.ms + (st.hold ? Math.max(0, t - st.hold.at) : 0)), part = st.need / NUM.pour.parts;
      if (cur > st.shown) { st.shown = cur; st.prog = t; }
      var n = Math.min(NUM.pour.parts, Math.floor(cur / part + 1e-6));
      while (st.fill < n) { emit(st, 'fill', { i: st.fill }); st.fill++; }
      if (cur >= st.need) {
        var end = st.hold ? Math.min(t, st.hold.at + (st.need - st.ms)) : t;
        if (st.hold) emit(st, 'pour', { on: false, snd: { act: 'quiet' } });
        st.ms = st.need; st.shown = st.need; st.hold = null; st.prog = end;
        rise(st, 1, end);
      } else rise(st, cur / st.need, t);
    }
    function pourStop(st) {
      if (!st.hold) return;
      st.ms = Math.min(st.need, st.shown); st.hold = null;
      emit(st, 'pour', { on: false, snd: { act: 'quiet' } });
    }
    KIND.pour = {
      multi: false, sayHalf: true,
      init: function (step, seed, food) {
        return base('pour', { box: boxOf(food), need: clampI(step.ms, 300, 60000, NUM.pour.ms), ms: 0, shown: 0, fill: 0, hold: null });
      },
      down: function (st, s) {
        if (st.done || st.hold) return;
        st.hold = { id: s.id, at: s.t };
        emit(st, 'pour', { on: true, snd: { act: 'pour' } });
      },
      move: function () {},
      up: function (st, s) { if (st.hold && st.hold.id === s.id) { pourRise(st, s.t); pourStop(st); } },
      cancel: function (st, s) { if (!s || (st.hold && st.hold.id === s.id)) pourStop(st); },
      tick: function (st, t) { pourRise(st, t); },
      alt: function (st, t) {   /* one press = one third */
        if (st.done) return;
        pourRise(st, t); if (st.done) return;
        if (st.hold) st.hold.at = t;
        st.ms = Math.min(st.need, st.shown + Math.ceil(st.need / NUM.pour.parts));
        pourRise(st, t);
      },
      look: function () { return { fill: NUM.pour.parts }; },
      tag: function () { return null; }
    };

    /* ---------- drag: carry each item to a slot. It snaps as soon as it is within snap of a free slot (order: the next
       slot only); a drop elsewhere sends it home. Any item may be picked first ---------- */
    function freeSlot(st, it) {
      var best = -1, bd = 0;
      for (var k = 0; k < st.slots.length; k++) {
        if (st.slots[k].by >= 0) continue;
        if (st.order) return k;
        var d = dist(it.x, it.y, st.slots[k].x, st.slots[k].y);
        if (best < 0 || d < bd) { best = k; bd = d; }
      }
      return best;
    }
    function place(st, i, k, t) {
      var it = st.items[i], sl = st.slots[k];
      it.on = true; it.slot = k; it.x = sl.x; it.y = sl.y; sl.by = i; st.n++; st.prog = t;
      if (st.pen && st.pen.i === i) { st.pen = null; st.hand = null; }
      emit(st, 'place', { i: i, k: k, snd: { act: 'place', i: st.n - 1 } });
      rise(st, st.n / st.items.length, t);
    }
    function tryPlace(st, i, t) {
      var it = st.items[i], k = freeSlot(st, it);
      if (k < 0 || dist(it.x, it.y, st.slots[k].x, st.slots[k].y) > NUM.drag.snap) return false;
      place(st, i, k, t);
      return true;
    }
    function goHome(st, quiet) {
      var p = st.pen; if (!p) return;
      var it = st.items[p.i];
      st.pen = null; st.hand = null;
      if (it && !it.on) { it.x = it.hx; it.y = it.hy; emit(st, 'back', { i: p.i, snd: quiet ? null : { act: 'back' } }); }
    }
    KIND.drag = {
      multi: false, sayHalf: false,
      init: function (step, seed, food) {
        var items = (step.items || []).map(function (p) { return { x: p[0] * SC, y: p[1] * SC, hx: p[0] * SC, hy: p[1] * SC, on: false, slot: -1 }; });
        var slots = (step.slots || []).map(function (p) { return { x: p[0] * SC, y: p[1] * SC, by: -1 }; });
        return base('drag', { box: boxOf(food), items: items, slots: slots, order: !!step.order, n: 0, pen: null, hand: null });
      },
      down: function (st, s) {
        if (st.done) return;
        goHome(st, true);
        var best = -1, bd = 0;
        for (var i = 0; i < st.items.length; i++) {
          var it = st.items[i]; if (it.on) continue;
          var d = dist(s.x, s.y, it.x, it.y);
          if (best < 0 || d < bd) { best = i; bd = d; }
        }
        if (best < 0 || bd > NUM.drag.reach) return;
        st.pen = { id: s.id, i: best }; st.hand = at(s);
        st.items[best].x = ri(s.x); st.items[best].y = ri(s.y);
        emit(st, 'lift', { i: best, snd: { act: 'lift' } });
        tryPlace(st, best, s.t);
      },
      move: function (st, s) {
        var p = st.pen; if (!p || p.id !== s.id || st.done) return;
        st.hand = at(s); st.items[p.i].x = ri(s.x); st.items[p.i].y = ri(s.y);
        tryPlace(st, p.i, s.t);
      },
      up: function (st, s) {
        var p = st.pen; if (!p || p.id !== s.id) return;
        st.items[p.i].x = ri(s.x); st.items[p.i].y = ri(s.y);
        if (st.done || !tryPlace(st, p.i, s.t)) goHome(st, false);
      },
      cancel: function (st, s) { if (!s || (st.pen && st.pen.id === s.id)) goHome(st, true); },
      tick: function () {},
      alt: function (st, t) {   /* one press = the next item goes to its slot */
        if (st.done) return;
        var i = st.pen ? st.pen.i : -1;
        if (i < 0) for (var j = 0; j < st.items.length; j++) if (!st.items[j].on) { i = j; break; }
        if (i < 0) return;
        var k = freeSlot(st, st.items[i]); if (k >= 0) place(st, i, k, t);
      },
      look: function (st) { return { n: st.items.length }; },
      tag: function () { return null; }
    };

    /* ---------- rub: back and forth over the food. A grid of bins over the food box; the finger marks every bin whose
       centre is within r of it (and along the way from the last sample); at cover the rest fills itself ---------- */
    function rubThirds(st) {
      var n = Math.min(NUM.rub.parts, Math.floor(st.n * NUM.rub.parts / st.need + 1e-6));
      while (st.third < n) { emit(st, 'coat', { i: st.third }); st.third++; }
    }
    function rubMark(st, x, y) {
      var b = st.box, cw = b[2] * SC / st.cols, chh = b[3] * SC / st.rows, x0 = b[0] * SC, y0 = b[1] * SC, r2 = NUM.rub.r * NUM.rub.r, added = 0;
      for (var j = 0; j < st.rows; j++) for (var i = 0; i < st.cols; i++) {
        var k = j * st.cols + i; if (st.bins[k]) continue;
        var dx = x0 + (i + 0.5) * cw - x, dy = y0 + (j + 0.5) * chh - y;
        if (dx * dx + dy * dy <= r2) { st.bins[k] = 1; st.n++; added++; }
      }
      return added;
    }
    function rubDone(st, added, x, y, t) {
      if (!added) return;
      st.prog = t;
      emit(st, 'rub', { n: added, x: ri(x), y: ri(y), snd: { act: 'scrub' } });
      if (st.n >= st.need) { for (var k = 0; k < st.bins.length; k++) st.bins[k] = 1; st.n = st.bins.length; }
      rubThirds(st);
      rise(st, Math.min(1, st.n / st.need), t);
    }
    function rubTo(st, s) {
      var p = st.pen; if (!p) return;
      st.hand = at(s);
      if (st.done) return;
      var added = 0, d = p.x === null ? 0 : dist(p.x, p.y, s.x, s.y), n = Math.max(1, Math.ceil(d / NUM.rub.seg));
      for (var i = 1; i <= n; i++) {
        var u = i / n;
        added += rubMark(st, p.x === null ? s.x : p.x + (s.x - p.x) * u, p.x === null ? s.y : p.y + (s.y - p.y) * u);
      }
      p.x = s.x; p.y = s.y;
      rubDone(st, added, s.x, s.y, s.t);
    }
    KIND.rub = {
      multi: false, sayHalf: true,
      init: function (step, seed, food) {
        var bins = []; for (var i = 0; i < BINS; i++) bins.push(0);
        return base('rub', { box: boxOf(food), cols: NUM.rub.cols, rows: NUM.rub.rows, bins: bins, n: 0, need: Math.ceil(BINS * NUM.rub.cover), third: 0, pen: null, hand: null });
      },
      down: function (st, s) { if (st.done) return; st.pen = { id: s.id, x: null, y: null }; rubTo(st, s); },
      move: function (st, s) { if (st.pen && st.pen.id === s.id) rubTo(st, s); },
      up: function (st, s) { if (st.pen && st.pen.id === s.id) { rubTo(st, s); st.pen = null; st.hand = null; } },
      cancel: function (st, s) { if (!s || (st.pen && st.pen.id === s.id)) { st.pen = null; st.hand = null; } },
      tick: function () {},
      alt: function (st, t) {   /* one press = a third of the bins, in reading order */
        if (st.done) return;
        var want = Math.ceil(st.need / NUM.rub.parts), added = 0;
        for (var k = 0; k < st.bins.length && added < want; k++) if (!st.bins[k]) { st.bins[k] = 1; st.n++; added++; }
        rubDone(st, added, (st.box[0] + st.box[2] / 2) * SC, (st.box[1] + st.box[3] / 2) * SC, t);
      },
      look: function (st) { return { bins: st.bins.length }; },
      tag: function () { return null; }
    };

    /* ---------- swipe: N short strokes one way (up). The flip's flick test, once per stroke ---------- */
    function roll(st, t) {
      if (st.done) return;
      st.n++; st.prog = t;
      emit(st, 'roll', { i: st.n - 1, snd: { act: 'flip', band: 1 } });
      rise(st, st.n / st.need, t);
    }
    function swipeTest(st, s) {
      var k = st.stroke; if (!k || k.id !== s.id || k.used || st.done) return;
      var along = k.y0 - s.y, side = Math.abs(s.x - k.x0);
      if (along >= NUM.swipe.flick && Math.atan2(side, along) <= NUM.swipe.cone * Math.PI / 180 + 1e-9) { k.used = true; roll(st, s.t); }
    }
    KIND.swipe = {
      multi: false, sayHalf: false,
      init: function (step, seed, food) { return base('swipe', { box: boxOf(food), need: strokesOf(step), n: 0, dir: 'up', stroke: null, hand: null }); },
      down: function (st, s) { if (st.done) return; st.stroke = { id: s.id, x0: s.x, y0: s.y, used: false }; st.hand = at(s); },
      move: function (st, s) { if (st.stroke && st.stroke.id === s.id) { st.hand = at(s); swipeTest(st, s); } },
      up: function (st, s) { if (st.stroke && st.stroke.id === s.id) { swipeTest(st, s); st.stroke = null; st.hand = null; } },
      cancel: function (st, s) { if (!s || (st.stroke && st.stroke.id === s.id)) { st.stroke = null; st.hand = null; } },
      tick: function () {},
      alt: function (st, t) { roll(st, t); },
      look: function (st) { return { n: st.need }; },
      tag: function () { return null; }
    };

    /* ---------- bake: touch = heat on; the band rises soft -> golden -> crisp and waits there (it never burns); a
       touch at least minMs later takes it out at the band it has reached ---------- */
    function bakeOn(st, t) {
      st.heat = true; st.heatAt = t; st.band = 0; st.prog = t;
      emit(st, 'heat', { band: 0, say: h.bandWords[0], snd: { act: 'clink' } });
      rise(st, 0.5, t);
    }
    function bakeOut(st, t) {
      if (t - st.heatAt < NUM.bake.minMs) return;   /* the second half of a double tap is not a decision */
      st.res = st.band; st.tag = h.BANDS[st.band]; st.prog = t;
      emit(st, 'out', { band: st.band, snd: { act: 'lift' } });
      rise(st, 1, t);
    }
    KIND.bake = {
      multi: false, sayHalf: false,
      init: function (step, seed, food) {
        return base('bake', { box: boxOf(food), bandMs: clampI(step.band, 500, 60000, NUM.bake.bandMs), heat: false, heatAt: null, band: 0, res: null });
      },
      down: function (st, s) { if (st.done) return; if (!st.heat) bakeOn(st, s.t); else bakeOut(st, s.t); },
      move: function () {},
      up: function () {},
      cancel: function () {},
      tick: function (st, t) {
        if (!st.heat || st.done) return;
        var nb = Math.min(h.BANDS.length - 1, Math.floor((t - st.heatAt) / st.bandMs));
        while (st.band < nb) { st.band++; emit(st, 'band', { band: st.band, say: h.bandWords[st.band] }); }
      },
      alt: function (st, t) { if (st.done) return; if (!st.heat) bakeOn(st, t); else bakeOut(st, t); },
      look: function (st) { return { band: st.res === null ? 0 : st.res }; },
      tag: function (st) { return st.res === null ? null : h.BANDS[st.res]; }
    };
    return true;
  }

  return { NUM: NUM, WORDS: WORDS, RECIPES: RECIPES, NEXT: NEXT, FREE: FREE, KINDS: ['stir', 'pour', 'drag', 'rub', 'swipe', 'bake'],
    recipe: recipe, tuneText: tuneText, defaultLook: defaultLook, validLook: validLook, validTag: validTag, between: between,
    verb: verb, hintAt: hintAt, install: install };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = COOK_STEPS;
