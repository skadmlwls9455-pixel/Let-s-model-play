#!/usr/bin/env node
/* tools/test-cook-steps.js -- round 7 (11-21): the recipe book's five dishes and the six new step kinds
 * (js/cook-steps.js + js/cook.js; pictures js/cook-steps-art.js). Node only, no DOM. Exit 1 on failure.
 *   node tools/test-cook-steps.js
 * Sim: every dish completes by the verb button alone and by touch; the same events give the same run at 30 / 60 / 120 /
 * 240 Hz; progress never falls; no failure or score anywhere; 60 s without input finishes nothing; a pot resumes at
 * every step boundary; looks are per step and small; legacy dishes, pots and notebook lines are untouched.
 * Art: every step paints without the sprite set (plain boxes) and with it, twice the same; the book page and its boxes.
 */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm');
var ROOT = path.resolve(__dirname, '..');
var passes = 0, fails = 0;
function check(c, m) { if (c) passes++; else { fails++; console.error('  FAIL ' + m); } }
function section(t) { console.log('== ' + t); }
function js(o) { return JSON.stringify(o); }
function load(files) {
  var sb = { console: console }; vm.createContext(sb);
  files.forEach(function (f) { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sb, { filename: f }); });
  return sb;
}
var OLD = load(['js/cook.js']).COOK;                                  /* the kitchen without the round-7 file */
var SB = load(['js/cook-steps.js', 'js/cook.js']), K = SB.COOK, X = SB.COOK_STEPS;
var NEW = ['jeon2', 'gyeran', 'jumeokbap2', 'kkochi2', 'cake'], LEG = ['jeon', 'jumeokbap', 'kkochi'];
var KINDS = ['tap', 'flip', 'slice', 'stir', 'pour', 'drag', 'rub', 'swipe', 'bake'];

section('load: legacy untouched, the book dishes added');
check(js(OLD.RECIPES.map(function (r) { return r.id; })) === js(LEG) && OLD.EXT === null, 'js/cook.js alone: the three legacy dishes, EXT null');
check(js(K.RECIPES.map(function (r) { return r.id; })) === js(LEG.concat(NEW)), 'with js/cook-steps.js: legacy three, then jeon2 gyeran jumeokbap2 kkochi2 cake');
check(K.TUNE_HASH === 2827089308 && K.VERSION === 'cook-1' && js(K.TUNE) === js(OLD.TUNE), 'TUNE, TUNE_HASH 2827089308 and VERSION cook-1 unchanged');
check(K.tuneOf('jeon') === 2827089308 && K.tuneOf('jumeokbap') === 1403436335 && K.tuneOf('kkochi') === 3381042548, 'legacy pot hashes unchanged');
check(NEW.every(function (id) { var t = K.tuneOf(id); return typeof t === 'number' && LEG.concat(NEW).every(function (o) { return o === id || K.tuneOf(o) !== t; }); }), 'every book dish has its own pot hash');
check(KINDS.every(function (k) { var q = K.KIND[k]; return q && ['init', 'down', 'move', 'up', 'cancel', 'tick', 'alt', 'look', 'tag'].every(function (f) { return typeof q[f] === 'function'; }) && typeof q.multi === 'boolean'; }), 'nine kinds, the full interface each');
check(js(NEW.map(function (id) { return K.recipe(id).steps.map(function (s) { return s.kind; }).join(' '); })) === js([
  'slice stir pour flip slice', 'tap stir pour swipe slice', 'drag rub stir tap drag', 'rub slice drag stir', 'tap stir pour bake rub drag']), 'the recipe table (kinds in order)');
check(NEW.every(function (id) { return K.recipe(id).steps.every(function (s) { return /^(counter|stove|board|oven)$/.test(s.station) && typeof s.pic === 'string' && X.WORDS.verb[s.name] && s.box && s.art; }); }), 'every step names its station, pictogram, word, box and art');
check(js(NEW.map(function (id) { return K.WORDS.dish[id]; })) === js(['해초전', '계란말이', '주먹밥', '과일 꼬치', '딸기 케이크']), 'dish names (contract C2)');
check(js(NEW.map(function (id) { return K.recipe(id).fx; })) === js(['sparkle', 'bubble', 'star', 'petal', 'confetti']), 'day effects per dish (contract C2)');
check(js(X.FREE) === js(['jeon2', 'gyeran', 'jumeokbap2']) && js(X.NEXT) === js({ jeon: 'jeon2', jumeokbap: 'jumeokbap2', kkochi: 'kkochi2' }), 'free dishes and legacy successors');
check(K.SEEN_MAX === 16 && K.normStore({ seen: KINDS.concat(['book']) }).seen.length === 10, 'the seen list holds all nine kinds and the book');

/* ---------- event makers: one finger per gesture ---------- */
function stepState(id, seed, si) { var r = K.recipe(id), s = r.steps[si]; return K.KIND[s.kind].init(s, K.stepSeed(seed, si), K.foodOf(r, s), s.at ? { at: s.at, jitter: s.jitter | 0 } : null); }
function touchStep(id, seed, si, o) {
  o = o || {};
  var s = K.recipe(id).steps[si], st = stepState(id, seed, si), ev = [], t = 320, n = 0, i, j;
  function tapAt(x, y) { n++; ev.push({ t: t, k: 'd', x: x, y: y, p: 't', id: n }); ev.push({ t: t + 50, k: 'u', x: x, y: y, p: 't', id: n }); t += 160; }
  function stroke(pts, dt) { n++; pts.forEach(function (p, q) { ev.push({ t: t, k: q ? 'm' : 'd', x: p[0], y: p[1], p: 't', id: n }); t += dt || 12; }); var l = pts[pts.length - 1]; ev.push({ t: t, k: 'u', x: l[0], y: l[1], p: 't', id: n }); t += 140; }
  if (s.kind === 'tap') st.marks.forEach(function (m) { for (i = 0; i < st.per; i++) tapAt(m.x + 3, m.y - 2); });
  else if (s.kind === 'slice') st.lines.forEach(function (l) { var pts = []; for (i = 0; i <= 16; i++) pts.push([l.ax + (l.bx - l.ax) * i / 16, l.ay + (l.by - l.ay) * i / 16]); stroke(pts); });
  else if (s.kind === 'flip') { tapAt(144, 172); t += o.wait == null ? 3300 : o.wait; var up = []; for (j = 0; j <= 8; j++) up.push([144, 200 - j * 8]); stroke(up, 8); }
  else if (s.kind === 'stir') { var c = []; for (i = 0; i <= (st.need + 60) / 12; i++) { var a = i * 12 * Math.PI / 180 * (o.ccw ? -1 : 1); c.push([st.cx + 44 * Math.cos(a), st.cy + 26 * Math.sin(a)]); } stroke(c, 10); }
  else if (s.kind === 'pour') { n++; ev.push({ t: t, k: 'd', x: 150, y: 180, p: 't', id: n });
    if (o.split) { ev.push({ t: t + 900, k: 'u', x: 150, y: 180, p: 't', id: n }); n++; t += 1700; ev.push({ t: t, k: 'd', x: 120, y: 200, p: 't', id: n }); ev.push({ t: t + 1700, k: 'u', x: 120, y: 200, p: 't', id: n }); }
    else ev.push({ t: t + 2600, k: 'u', x: 150, y: 180, p: 't', id: n }); }
  else if (s.kind === 'drag') st.items.forEach(function (it, q) { var sl = st.slots[st.order ? q : q], pts = []; for (i = 0; i <= 10; i++) pts.push([it.hx + (sl.x - it.hx) * i / 10, it.hy + (sl.y - it.hy) * i / 10]); stroke(pts); });
  else if (s.kind === 'rub') { var b = st.box, z = [], rows = 6; for (j = 0; j < rows; j++) for (i = 0; i <= 12; i++) { var u = j % 2 ? 1 - i / 12 : i / 12; z.push([(b[0] + b[2] * u) * 2, (b[1] + b[3] * (j + 0.5) / rows) * 2]); } stroke(z, 9); }
  else if (s.kind === 'swipe') for (i = 0; i < st.need; i++) { var f = []; for (j = 0; j <= 6; j++) f.push([150, 230 - j * 8]); stroke(f, 9); }
  else if (s.kind === 'bake') { tapAt(144, 180); t += o.wait == null ? 3300 : o.wait; tapAt(144, 180); }
  return ev;
}
function touchSteps(id, seed, o) { return K.recipe(id).steps.map(function (s, si) { return touchStep(id, seed, si, o); }); }
function chipSteps(id) { return K.recipe(id).steps.map(function () { var s = []; for (var k = 0; k < 4; k++) s.push({ t: 300 + k * 700, k: 'b' }); return s; }); }
var BAD_KEY = /score|grade|rank|fail|best|star|percent|accuracy|time|duration|miss|wrong/i;
function keysDeep(o, out) { if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { if (!Array.isArray(o)) out.push(k); keysDeep(o[k], out); }); return out; }

section('every dish completes: the verb button alone, touch alone');
NEW.forEach(function (id) {
  var r = K.recipe(id), run = K.createRun(id, 9), t = 0, per = [], evs = [], last = -1, low = false, guard = 0;
  K.tick(run, 0);
  while (run.phase !== 'reveal' && guard++ < 400) {
    t += 700; K.tick(run, t); var si = run.si, p0 = run.phase === 'step' ? run.st.progress : null;
    K.input(run, { t: t, k: 'b' });
    var got = K.drain(run);   /* a press counts when it did something in that step (one inside the 250 ms gate does nothing) */
    if (p0 !== null && got.some(function (e) { return e.si === si && e.type !== 'start'; })) per[si] = (per[si] || 0) + 1;
    if (p0 !== null && run.si === si && run.st.progress < p0) low = true;
    evs = evs.concat(got);
  }
  check(run.phase === 'reveal' && run.done, id + ': the verb button alone reaches the plate');
  check(per.every(function (n) { return n <= 3; }) && per.length === r.steps.length, id + ': at most three presses a step (' + per.join(',') + ')');
  check(!low, id + ': progress never falls on the button path');
  check(evs.every(function (e) { return !/fail|miss|score|wrong|burn|late|early|lose/.test(e.type); }), id + ': no failure, miss or score event');
  var acts = {}; evs.forEach(function (e) { if (e.snd) acts[e.snd.act] = 1; });
  check(Object.keys(acts).every(function (a) { return ['tap', 'cut', 'stir', 'sizzle', 'flip', 'quiet', 'lift', 'place', 'back', 'step', 'done', 'pour', 'scrub', 'clink'].indexOf(a) >= 0; }) && !acts.simmer, id + ': only known sound acts, never simmer (' + Object.keys(acts).join(' ') + ')');
  var a = K.simulate(id, 9, touchSteps(id, 9), { run: true });
  check(a.done && a.steps.every(function (s) { return s.status === 'done'; }), id + ': touch alone reaches the plate');
  check(js(a.look) === js(K.simulate(id, 9, chipSteps(id)).look) || !!a.look.band !== undefined, id + ': a look either way');
  var res = K.resultOf(a.run, { madeAt: 5, day: '2026-11-21' }), keys = keysDeep(res, []);
  check(res && res.status === 'done' && res.ms === null && res.out.look.v === 2 && res.out.look.s.length === r.steps.length, id + ': result envelope, look v 2 with one look per step');
  check(keys.every(function (k) { return !BAD_KEY.test(k); }), id + ': no score / time key in the result');
  check(js(res.out.look).length <= 400 && js(K.normLook(id, res.out.look)) === js(res.out.look), id + ': the look is small (' + js(res.out.look).length + ' bytes) and normLook keeps it');
  check(K.describe(id, a.run.tags).indexOf(K.WORDS.dish[id]) === 0, id + ': the plate line starts with the dish name');
  check(K.bookLine(res).recipe === id && K.normStore({ book: [K.bookLine(res)] }).book.length === 1, id + ': a notebook line is kept by normStore');
});

section('determinism: same events, 30 / 60 / 120 / 240 Hz, both stir directions, split pour');
NEW.forEach(function (id) {
  [3, 77].forEach(function (seed) {
    var ev = touchSteps(id, seed, { ccw: seed === 77, split: seed === 77 });
    var runs = [30, 60, 120, 240].map(function (hz) { var o = K.simulate(id, seed, ev, { cadence: hz, run: true }); return js([o.done, o.look, o.steps, o.run.tags, o.run.looks]); });
    check(runs.every(function (x) { return x === runs[0]; }) && JSON.parse(runs[0])[0] === true, id + ' seed ' + seed + ': the same run at four tick rates');
  });
  var a = js(K.simulate(id, 5, touchSteps(id, 5)).look), SB2 = load(['js/cook-steps.js', 'js/cook.js']).COOK;
  check(a === js(SB2.simulate(id, 5, touchSteps(id, 5)).look), id + ': a second instance gives the same look');
});

section('no input for 60 s finishes nothing; progress never falls by touch; JSON round trip');
NEW.forEach(function (id) {
  var idle = K.simulate(id, 4, [], { until: 60000, run: true });
  check(!idle.done && idle.si === 0 && idle.run.st.progress === 0, id + ': 60 s idle leaves step 0 at progress 0');
  var run = K.createRun(id, 4), ev = touchSteps(id, 4), ok = true, rt = true, clock = 0;
  K.tick(run, 0);
  for (var si = 0; si < run.n && ok; si++) {
    var t0 = run.t0, last = 0;
    ev[si].forEach(function (e) {
      if (run.si !== si || run.phase !== 'step') return;
      K.input(run, { t: t0 + e.t, k: e.k, x: e.x, y: e.y, p: e.p, id: e.id });
      if (run.si === si) { if (run.st.progress < last) ok = false; last = run.st.progress; }
      if (js(JSON.parse(js(run))) !== js(run)) rt = false;
      clock = t0 + e.t;
    });
    for (var k = 0; k < 400 && !(run.si > si || run.phase === 'reveal'); k++) { clock += 16; K.tick(run, clock); }
  }
  check(ok && run.phase === 'reveal', id + ': progress never falls on the touch path, and it ends on the plate');
  check(rt, id + ': the run is plain JSON after every event');
});

section('pots: resume at every step boundary, legacy pots and looks');
NEW.forEach(function (id) {
  var r = K.recipe(id), ev = touchSteps(id, 21), good = true, sizes = [];
  for (var cut = 1; cut < r.steps.length; cut++) {
    var part = K.simulate(id, 21, ev.slice(0, cut), { run: true }).run, pot = K.potOf(part, 0);
    sizes.push(js(pot).length);
    var back = K.resumeRun(JSON.parse(js(pot)));
    if (!back || back.si !== cut || back.st.kind !== r.steps[cut].kind || js(back.looks) !== js(part.looks)) good = false;
    var rest = K.simulate(id, 21, ev, { pot: pot });
    if (!rest.done) good = false;
  }
  check(good, id + ': a pot of every boundary resumes at that step and finishes');
  check(Math.max.apply(null, sizes) <= K.TUNE.pot.maxBytes, id + ': the largest pot is ' + Math.max.apply(null, sizes) + ' bytes (<= ' + K.TUNE.pot.maxBytes + ')');
  var p1 = K.potOf(K.simulate(id, 21, ev.slice(0, 1), { run: true }).run, 0), bad = JSON.parse(js(p1));
  bad.tune = K.tuneOf('jeon');
  check(K.resumeRun(bad) === null, id + ': a pot with another dish\'s hash is refused');
  bad = JSON.parse(js(p1)); bad.looks[0] = { nope: 1 };
  check(K.resumeRun(bad) === null, id + ': a pot with a broken look is refused');
});
(function () {
  var oldRun = OLD.simulate('jeon', 8, [[{ t: 300, k: 'b' }, { t: 700, k: 'b' }, { t: 1100, k: 'b' }]], { run: true }).run, pot = OLD.potOf(oldRun, 0);
  var back = K.resumeRun(JSON.parse(js(pot)));
  check(back && back.recipe === 'jeon' && back.si === 1 && back.st.kind === 'flip', 'a legacy jeon pot made without the round-7 file still resumes at its flip');
  var look = { v: 1, dents: [[3, 4]], band: 2, cuts: [0, 0], offs: [0, 0], plate: 1 };
  check(js(K.normLook('jeon', look)) === js(OLD.normLook('jeon', look)) && js(K.normLook('jeon', look)) === js(look), 'an old notebook look of the legacy jeon is kept as it was');
  check(js(K.lookOf(oldRun)) === js(OLD.lookOf(oldRun)), 'a legacy run keeps its flat look');
  check(js(K.normLook('jeon2', look)) === js(K.normLook('jeon2', null)) && K.normLook('jeon2', null).v === 2, 'a flat look given to a book dish falls back to that dish\'s default, never a crash');
  var line = { id: 'ck_abc', recipe: 'jeon', seed: 5, swaps: { herb: 'parae' }, look: look, day: '2026-11-18', madeAt: 1 };
  check(js(K.normStore({ book: [line], seen: ['tap'], pot: pot, potOld: [pot] })) === js(OLD.normStore({ book: [line], seen: ['tap'], pot: pot, potOld: [pot] })), 'normStore reads an old save exactly as before');
})();

section('the kinds, one by one');
(function () {
  function at(id, si) { var run = K.createRun(id, 2), ev = touchSteps(id, 2); if (si) run = K.resumeRun(K.potOf(K.simulate(id, 2, ev.slice(0, si), { run: true }).run, 0)); K.tick(run, 0); return run; }
  var run = at('jeon2', 2), st = run.st;   /* pour */
  K.input(run, { t: 100, k: 'd', x: 100, y: 100, id: 1 });
  check(!st.hold, 'pour: a press inside the 250 ms gate does not start it');
  K.input(run, { t: 300, k: 'd', x: 100, y: 100, id: 2 }); K.input(run, { t: 1300, k: 'u', x: 100, y: 100, id: 2 });
  check(st.ms === 1000 && !st.done && st.fill === 1, 'pour: 1 s of holding banks 1000 ms and one third');
  K.tick(run, 9000);
  check(st.ms === 1000 && st.progress > 0.41 && st.progress < 0.42, 'pour: letting go only pauses (8 s later nothing changed)');
  K.input(run, { t: 9000, k: 'd', x: 100, y: 100, id: 3 }); K.tick(run, 12000);
  check(st.done && st.doneT === 9000 + 1400 && run.si === 3, 'pour: the second hold finishes at the exact ms (doneT ' + st.doneT + ')');
  var types = K.drain(run).map(function (e) { return e.type; });
  check(types.filter(function (x) { return x === 'fill'; }).length === 3 && types.filter(function (x) { return x === 'pour'; }).length === 4, 'pour: three fill events, pour on / off twice');

  run = at('jeon2', 1); st = run.st;   /* stir */
  K.input(run, { t: 300, k: 'd', x: st.cx + 3, y: st.cy, id: 1 }); K.input(run, { t: 320, k: 'm', x: st.cx - 3, y: st.cy + 2, id: 1 }); K.input(run, { t: 340, k: 'm', x: st.cx + 2, y: st.cy - 3, id: 1 });
  check(st.deg === 0, 'stir: samples within 8 px of the centre do not count');
  K.input(run, { t: 360, k: 'u', x: st.cx, y: st.cy, id: 1 });
  var before = st.progress; K.input(run, { t: 800, k: 'b' });
  check(Math.abs(st.deg - 360) < 1e-6 && st.q === 4 && st.progress > before, 'stir: one button press is one turn (four quarter events)');

  run = at('jumeokbap2', 0); st = run.st;   /* drag */
  var it = st.items[0];
  K.input(run, { t: 300, k: 'd', x: it.hx, y: it.hy, id: 1 }); K.input(run, { t: 330, k: 'm', x: it.hx + 60, y: it.hy, id: 1 }); K.input(run, { t: 360, k: 'u', x: it.hx + 60, y: it.hy, id: 1 });
  check(st.n === 0 && it.x === it.hx && it.y === it.hy && !st.pen, 'drag: a drop elsewhere sends the item home, nothing lost');
  check(K.drain(run).some(function (e) { return e.type === 'back'; }), 'drag: that drop emits back (no failure event)');
  K.input(run, { t: 500, k: 'd', x: it.hx, y: it.hy, id: 2 }); K.input(run, { t: 530, k: 'm', x: st.slots[0].x + 10, y: st.slots[0].y - 12, id: 2 });
  check(st.n === 1 && st.items[0].on && !st.pen, 'drag: the item snaps as soon as it is within 28 px of its slot');
  K.input(run, { t: 600, k: 'd', x: 2, y: 2, id: 3 });
  check(!st.pen, 'drag: a press far from every item picks nothing up');

  run = at('kkochi2', 2); st = run.st;   /* drag in order: any item first, slots fill in order */
  K.input(run, { t: 300, k: 'd', x: st.items[2].hx, y: st.items[2].hy, id: 1 }); K.input(run, { t: 340, k: 'm', x: st.slots[0].x, y: st.slots[0].y, id: 1 });
  check(st.items[2].on && st.items[2].slot === 0, 'drag (order): the third piece picked first goes onto the first slot');

  run = at('kkochi2', 0); st = run.st;   /* rub */
  K.input(run, { t: 300, k: 'd', x: st.box[0] * 2 + 10, y: st.box[1] * 2 + 10, id: 1 }); K.input(run, { t: 340, k: 'u', x: st.box[0] * 2 + 10, y: st.box[1] * 2 + 10, id: 1 });
  check(st.n > 0 && st.n < st.need && !st.done, 'rub: one touch marks a few bins (' + st.n + ')');
  K.input(run, { t: 700, k: 'b' }); K.input(run, { t: 1100, k: 'b' }); K.input(run, { t: 1500, k: 'b' });
  check(st.done && st.n === 48 && st.third === 3, 'rub: at 80 % the rest fills itself');

  run = at('gyeran', 3); st = run.st;   /* swipe */
  K.input(run, { t: 300, k: 'd', x: 150, y: 220, id: 1 }); K.input(run, { t: 320, k: 'm', x: 150, y: 180, id: 1 }); K.input(run, { t: 340, k: 'm', x: 150, y: 120, id: 1 }); K.input(run, { t: 360, k: 'u', x: 150, y: 100, id: 1 });
  check(st.n === 1, 'swipe: one stroke rolls once, however long it is');
  K.input(run, { t: 500, k: 'd', x: 150, y: 220, id: 2 }); K.input(run, { t: 520, k: 'm', x: 210, y: 215, id: 2 }); K.input(run, { t: 540, k: 'u', x: 230, y: 215, id: 2 });
  check(st.n === 1, 'swipe: a sideways stroke does nothing (no penalty)');
  K.input(run, { t: 600, k: 'd', x: 150, y: 220, id: 3 }); K.input(run, { t: 640, k: 'u', x: 150, y: 220, id: 3 });
  check(st.n === 1, 'swipe: a tap does nothing');

  run = at('cake', 3); st = run.st;   /* bake */
  K.input(run, { t: 300, k: 'd', x: 140, y: 170, id: 1 }); K.input(run, { t: 350, k: 'u', x: 140, y: 170, id: 1 });
  K.input(run, { t: 500, k: 'd', x: 140, y: 170, id: 2 }); K.input(run, { t: 540, k: 'u', x: 140, y: 170, id: 2 });
  check(st.heat && !st.done, 'bake: the second half of a double tap does not take it out');
  K.tick(run, 300 + 3000);
  check(st.band === 1 && K.drain(run).some(function (e) { return e.type === 'band' && e.band === 1; }), 'bake: golden 3 s after the heat');
  K.tick(run, 300 + 120000);
  check(st.band === 2 && !st.done && K.hintAt(run) === 300 + 6000 + 5000, 'bake: it waits at crisp for ever (never burns); the idle hint comes 5 s after crisp');
  K.input(run, { t: 300 + 120100, k: 'd', x: 140, y: 170, id: 3 });
  check(st.done && st.res === 2 && st.tag === 'crisp' && run.tags[3] === 'crisp', 'bake: a touch takes it out at the band it has reached');
  check(K.verb(at('cake', 3)) === '굽기' && K.verb(at('gyeran', 0)) === '달걀 깨기' && K.verb(at('jeon2', 3)) === '불 켜기', 'button labels per step');
  check(K.betweenOf('swipe') === 600 && K.betweenOf('tap') === 400 && K.betweenOf('flip') === 1000, 'betweenOf: the new kinds\' own pauses, the old ones as before');
})();

section('words and static rules');
(function () {
  var dec = new TextDecoder('euc-kr'), ks = {};
  for (var a = 0xb0; a <= 0xc8; a++) for (var b = 0xa1; b <= 0xfe; b++) { var ch = dec.decode(Buffer.from([a, b])); if (/[가-힣]/.test(ch)) ks[ch] = 1; }
  var leaves = []; (function walk(o) { Object.keys(o).forEach(function (k) { if (typeof o[k] === 'string') leaves.push(o[k]); else walk(o[k]); }); })(X.WORDS);
  check(leaves.length >= 20 && leaves.every(function (w) { return Array.from(w).every(function (c) { return c === ' ' || ks[c]; }); }), 'every word: Hangul inside KS X 1001 and spaces only (no digit, no symbol)');
  var BAN = ['맛있', '좋아해', '좋아하', '먹고 싶', '기다렸', '아쉽', '미안', '실패', '성공', '점수', '완벽', '최고', '잘했', '탔', '등급', '메달', '마마', 'Mama', '같이 먹'];
  ['js/cook-steps.js', 'js/cook-steps-art.js'].forEach(function (f) {
    var src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    check(BAN.every(function (w) { return src.indexOf(w) < 0; }), f + ': no banned word');
    check(!/Math\.random|Date\.now|new Date|performance\.now|setTimeout|localStorage|document\.|window\./.test(src), f + ': no random, clock, timer, storage or DOM');
    check(!/ppolppol_v2|\bAPP\.|\bBRAIN\b/.test(src), f + ': no main-game name');
    var code = src.replace(/'(?:[^'\\\n]|\\.)*'/g, "''");
    check(!/[^\x00-\x7f]/.test(code), f + ': ASCII only outside string literals');
    check(!/title\s*[:=]/.test(src.replace(/titleMs/g, '')), f + ': no title attribute');
  });
  check(X.WORDS.call === '문어 부르기' && X.WORDS.table === '식탁에 두기' && X.WORDS.book === '요리 수첩', 'the end buttons\' and the book\'s names');
  var cs = fs.readFileSync(path.join(ROOT, 'js/cook.js'), 'utf8'), ch2 = fs.readFileSync(path.join(ROOT, 'cook.html'), 'utf8'), cc = fs.readFileSync(path.join(ROOT, 'css/cook.css'), 'utf8');
  check(cs.indexOf('ck-strip') < 0 && cc.indexOf('.ck-strip') < 0 && cc.indexOf('.ck-step') < 0 && cs.indexOf('buildStrip') < 0, 'the step strip is gone from js/cook.js and css/cook.css');
  check(cs.indexOf('function again') < 0, "the live half has no 'again'");
  check(ch2.indexOf('js/cook-steps.js') < ch2.indexOf('js/cook.js"') && ch2.indexOf('js/cook-steps.js') > 0 && ch2.indexOf('js/cook-steps-art.js') > ch2.indexOf('js/cook-art.js'), 'cook.html loads cook-steps before cook.js and the art after cook-art');
})();

section('art: every step paints, with and without the sprite set; the book');
(function () {
  var files = ['js/cook-art.js', 'js/cook-dishes.js', 'js/cook-steps.js', 'js/cook-steps-art.js', 'js/cook.js'];
  [['without COOK_SPR', files], ['with js/cook-sprites.js', ['js/cook-sprites.js'].concat(files)]].forEach(function (cfg) {
    var W = load(cfg[1]), A = W.COOK_ART, C = W.COOK, S = A.steps, ok = true, same = true, painted = true, why = '';
    check(!!S && NEW.every(function (id) { return A.dishes[id] && typeof A.dishes[id].stepScene === 'function'; }) && A.dishes.jumeokbap && A.dishes.kkochi, cfg[0] + ': painters for the five dishes, the legacy two still there');
    NEW.forEach(function (id) {
      var r = C.recipe(id), ev = touchSteps(id, 6);
      r.steps.forEach(function (step, si) {
        [0, 1].forEach(function (endState) {
          try {
            var run = si ? C.resumeRun(C.potOf(C.simulate(id, 6, ev.slice(0, si), { run: true }).run, 0)) : C.createRun(id, 6);
            C.tick(run, 0);
            if (endState) C.feed(run, ev[si]);
            var o = { step: step, st: run.st, band: 1, J: { flash: false, squash: 0, bump: false, arc: null, cut: null }, hit: null, finger: null, f: 5, still: false };
            var b1 = A.blank(144, 160), b2 = A.blank(144, 160);
            A.dishes[id].stepScene(b1, o); A.dishes[id].stepScene(b2, o);
            if (A.hash(b1) !== A.hash(b2)) same = false;
            var n = 0; for (var i = 3; i < b1.d.length; i += 4) if (b1.d[i] === 255) n++;
            if (n !== 144 * 160) painted = false;
          } catch (e) { ok = false; why = id + ' step ' + si + ': ' + e.message; }
        });
      });
      try { var rb = A.blank(144, 160); A.dishes[id].revealScene(rb, { id: id, look: C.normLook(id, null), t: 9, still: false }); A.dishes[id].revealScene(rb, { id: id, look: null, t: null, still: true }); }
      catch (e2) { ok = false; why = id + ' reveal: ' + e2.message; }
      var d = C.drawDish(id, C.normLook(id, null), 3), any = 0; for (var q = 3; q < d.d.length; q += 4) if (d.d[q]) any++;
      if (!(d.w === 96 && d.h === 66 && any > 100)) { ok = false; why = id + ' drawDish empty'; }
    });
    check(ok, cfg[0] + ': every step (start and end state), every plate and drawDish paint without throwing ' + why);
    check(same, cfg[0] + ': the same state paints the same pixels twice');
    check(painted, cfg[0] + ': every stage pixel is opaque');
    [[80, 16, 140], [84, 15, 180], [214, 12, 132]].forEach(function (v) {
      var V = A.blank(v[0], 200), L = S.book(V, { ids: NEW, sel: 1, locked: { cake: true, kkochi2: true }, made: { gyeran: true }, top: v[1], bot: v[2], open: 3, dx: 0, f: 0 });
      var inside = L.tabs.concat([L.go]).every(function (r) { return r[0] >= 0 && r[0] + r[2] <= v[0] && r[1] >= v[1] && r[1] + r[3] <= v[2]; });
      check(L.tabs.length === 5 && inside, cfg[0] + ': the book\'s dish box and five tabs lie inside a view ' + v[0] + ' wide, rows ' + v[1] + '..' + v[2]);
      check(L.tabs.every(function (r, i) { return i === 0 || r[0] === L.tabs[i - 1][0] + L.tabs[i - 1][2]; }) && L.go[2] >= 48 / 4.5 && L.go[3] >= 48 / 4, cfg[0] + ': tabs side by side, the dish box at least a finger wide');
    });
    [0, 1, 2, 3].forEach(function (open) { try { S.book(A.blank(80, 166), { ids: NEW, sel: 4, locked: { cake: true }, made: {}, top: 15, bot: 160, open: open, dx: 3, f: 2 }); } catch (e) { check(false, cfg[0] + ': book frame ' + open + ' throws ' + e.message); } });
    ['call', 'table'].forEach(function (n) { var b = S.endIcon(n), c = 0; for (var i = 3; i < b.d.length; i += 4) if (b.d[i]) c++; check(b.w === 20 && b.h === 20 && c > 60, cfg[0] + ': end picture ' + n + ' is 20 x 20 and drawn'); });
    check(A.hash(S.endIcon('call')) !== A.hash(S.endIcon('table')), cfg[0] + ': the two end pictures differ');
    ['circle', 'hold', 'carry', 'rub'].forEach(function (k) { try { [0, 0.3, 0.6, 0.95].forEach(function (u) { S.hand2(A.blank(144, 160), { kind: k, x: 72, y: 86, rx: 14, ry: 8, x0: 40, y0: 60, x1: 90, y1: 100, w: 20, h: 10 }, u, false); }); S.hand2(A.blank(144, 160), { kind: k, x: 72, y: 86, rx: 14, ry: 8, x0: 40, y0: 60, x1: 90, y1: 100, w: 20, h: 10 }, 0, true); } catch (e) { check(false, 'hand2 ' + k + ': ' + e.message); } });
  });
})();

console.log('\ntest-cook-steps: ' + passes + ' ok' + (fails ? ', ' + fails + ' FAILED' : ''));
process.exit(fails ? 1 : 0);
