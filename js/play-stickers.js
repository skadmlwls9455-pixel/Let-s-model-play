/* ═══════════════════════════════════════════════════════════════════
   뽈뽈 문어 — js/play-stickers.js (전역 RUNNER_STICKERS · SWIM_STICKERS) · 놀이 반응 스티커 (docs/PLAY_STICKERS.md)

   엔진은 js/cook-stickers.js 의 PPOL_STICKERS — 이 파일은 그 다음에 싣는다. css 는 css/cook-stickers.css 를 같이 쓴다.
   그림: assets/stickers/runner/*.png (머리띠 문어 9종) · assets/stickers/swim/*.png (물안경 문어 9종), node tools/make-stickers.js.

   다락방 달리기 (js/runner.js, 이미 게임에 있음):
     RUNNER_STICKERS.watch() 한 줄이면 자동이다. runner.js 를 고치지 않고 RUNNER.live() (읽기 전용 복사본) 를 지켜보다가
     출발 · 점프 · 숙이기 · 아슬아슬 · 이끼 · 빨라짐 · 콩 · 새 최고 · 또 하기 를 알아채서 달리기 화면(#runner-dlg .rn-stage) 위쪽에 띄운다.
     달리기 창이 닫혀 있으면 0.5초마다 '열렸나' 만 본다 (그리기 고리는 창이 열렸을 때만 돈다).
     직접 부를 수도 있다: RUNNER_STICKERS.cue('jump') · window.dispatchEvent(new CustomEvent('ppol:runner', { detail: { act } }))
   헤엄 (카드 8, 아직 없음):
     카드 8 의 소리 훅 AUDIO.on('swim', { act, who }) 옆에 window.SWIM_STICKERS && SWIM_STICKERS.cue(act, { who, status }) 한 줄.
     act: 'start' · 'flap' · 'bump' · 'ink' · 'end' ({ status: 'played'|'auto'|'cut'|'still' }) · 'pickup' (주머니에 줍기)

   지키는 것 (요리 세트와 같다): 그림뿐·글자 없음 · 기록은 by:'demo-rules' · 문어 기록·두뇌·모델 요청에 안 넣음 ·
   부딪혀도 벌 그림 없음 ('콩' = 어질어질 별, '퐁' = 질끈) · 같은 판 id = 같은 스티커 (시드) · 모션 줄이기면 멈춘 그림.
   일반 스크립트 · 모듈 없음 · file:// 그대로.
   ═══════════════════════════════════════════════════════════════════ */
var RUNNER_STICKERS = (function () {
  'use strict';
  var P = (typeof PPOL_STICKERS !== 'undefined' && PPOL_STICKERS) || (typeof require === 'function' ? { make: require('./cook-stickers.js').make } : null);
  if (!P) return null;

  var CATALOG = {
    dash:   { label: '쌩',     anim: 2, fps: 6, alt: '다리를 번갈아 쌩 달리는 머리띠 문어 스티커' },
    hop:    { label: '폴짝',   anim: 2, fps: 4, alt: '폴짝 뛰어오르는 머리띠 문어 스티커' },
    duck:   { label: '납작',   alt: '납작 엎드려 거미줄 밑을 지나는 머리띠 문어 스티커' },
    phew:   { label: '휴',     alt: '다리로 이마를 훔치는 머리띠 문어 스티커' },
    moss:   { label: '이끼 득', alt: '이끼 한 줌을 번쩍 든 머리띠 문어 스티커' },
    fire:   { label: '활활',   anim: 2, fps: 6, alt: '뒤로 불꽃이 활활 타는 머리띠 문어 스티커' },
    trophy: { label: '최고!',  alt: '트로피를 높이 든 머리띠 문어 스티커' },
    bonk:   { label: '콩',     anim: 2, fps: 4, alt: '콩 부딪혀 머리 위로 별이 도는 머리띠 문어 스티커' },
    again:  { label: '한 판 더', alt: '다리 주먹을 불끈 쥔 머리띠 문어 스티커' }
  };
  /* 조건 키는 요리와 같고 더해서: is{} · atLeast{} · atMost{} */
  var RULES = [
    { on: 'start', pick: ['dash', 'again'], chance: 0.7 },
    { on: 'jump', nth: 1, pick: 'hop' },
    { on: 'jump', every: 6, pick: 'hop', chance: 0.5 },
    { on: 'duck', nth: 1, pick: 'duck' },
    { on: 'duck', every: 4, pick: 'duck', chance: 0.5 },
    { on: 'pass', atMost: { clear: 2 }, pick: 'phew', chance: 0.8 },
    { on: 'moss', nth: 1, pick: 'moss', force: true },
    { on: 'moss', every: 3, pick: 'moss' },
    { on: 'speed', pick: 'fire', force: true },
    { on: 'over', pick: 'bonk' },
    { on: 'best', pick: 'trophy' },
    { on: 'again', pick: ['again', 'dash'] }
  ];
  /* 달리기 화면 틀 위로 걸터앉는 양쪽 모서리 두 자리 — 화면 안(장애물·거미줄·문어)은 거의 가리지 않는다 (위로 44px 삐져나옴, 틀 16px + 화면 4px 만 덮음) */
  var SLOTS = [{ r: '-8px', t: '-44px' }, { l: '-8px', t: '-44px' }];
  var api = P.make({ set: 'runner', catalog: CATALOG, rules: RULES, scripts: {}, big: { over: true, best: true, speed: true }, slots: SLOTS });

  /* ── 자동: RUNNER.live() 지켜보기 ── */
  var OCT_X = 30, OCT_W = 14, SUB = 256, HI = { crate: 9, crate2: 9, candle: 16, books: 20, rain: 7 };
  var SPEED_STEPS = [448, 576, 704];   /* 서브 px/틱 (V0 320 → VMAX 704) — 넘을 때마다 '빨라짐' */
  var prev = null, bestBefore = 0, overlap = null, timer = null, raf = 0, runN = 0;
  function dlg() { return typeof document !== 'undefined' ? document.getElementById('runner-dlg') : null; }
  function stage() { var d = dlg(); return d && d.querySelector('.rn-stage'); }
  function bestNow() { try { return (window.RUNNER && RUNNER.load && (RUNNER.load().best | 0)) || 0; } catch (e) { return 0; } }
  /* 한 번 보기: 앞 모습(prev)과 지금(cur)을 견줘 순간들을 낸다 — DOM 없이 돌아 테스트에서 그대로 쓴다 */
  function diff(a, cur) {
    var out = [];
    if (!cur) return out;
    if (!a) a = { state: 'ready', ground: true, moss: 0, speed: 0, inputs: [], obs: [] };
    if (cur.state === 'run' && a.state !== 'run' && a.state !== 'pause') {
      if (a.state === 'over') out.push(['again', {}]);
      out.push(['start', { runId: 'runner|' + cur.seed + '|' + (runN++) }]);
      bestBefore = bestNow(); overlap = null;
    }
    if (cur.state === 'ready' && a.state === 'over') out.push(['again', {}]);
    if (cur.state === 'run') {
      if (a.ground && !cur.ground) out.push(['jump', {}]);
      var ins = cur.inputs || [], pl = (a.inputs || []).length;
      if (ins.length > pl) for (var i = pl; i < ins.length; i++) if (ins[i] && ins[i].a === 'dd') out.push(['duck', {}]);
      if ((cur.moss | 0) > (a.moss | 0)) out.push(['moss', { moss: cur.moss }]);
      SPEED_STEPS.forEach(function (v, n) { if (a.speed < v && cur.speed >= v) out.push(['speed', { level: n + 1 }]); });
      /* 아슬아슬: 문어 칸을 지나가는 장애물의 가장 좁은 틈 (바닥 장애물 = 문어 발 높이 - 장애물 높이) */
      var y = Math.floor((cur.y | 0) / SUB), over = (cur.obs || []).filter(function (o) { return !o.got && o.k !== 'moss' && o.k !== 'web' && o.x < OCT_X + OCT_W && o.x + o.w > OCT_X; });
      if (over.length) { var c = Math.min.apply(null, over.map(function (o) { return y - (HI[o.k] || 0); })); overlap = overlap == null ? c : Math.min(overlap, c); }
      else if (overlap != null) { out.push(['pass', { clear: overlap }]); overlap = null; }
    }
    if (cur.state === 'over' && a.state !== 'over') {
      out.push(['over', { score: cur.score }]);
      if ((cur.score | 0) > bestBefore && bestBefore > 0) out.push(['best', { score: cur.score }]);
    }
    return out;
  }
  function tick() {
    raf = 0;
    var d = dlg();
    if (!d || !d.open || !window.RUNNER || !RUNNER.live) { prev = null; return; }
    var st = stage(); if (st && api._host !== st) { api.mount(st, { scale: 2 }); api._host = st; }
    var cur = RUNNER.live();
    diff(prev, cur).forEach(function (e) { api.cue(e[0], e[1]); });
    prev = cur;
    raf = requestAnimationFrame(tick);
  }
  function watch() {
    if (timer || typeof window === 'undefined') return api;
    timer = setInterval(function () { var d = dlg(); if (d && d.open && !raf) raf = requestAnimationFrame(tick); }, 500);
    return api;
  }
  function unwatch() { if (timer) clearInterval(timer); timer = null; if (raf) cancelAnimationFrame(raf); raf = 0; prev = null; return api; }
  api.watch = watch; api.unwatch = unwatch;
  api._diff = diff;   /* 테스트용: (앞, 지금) → [[act, detail]] */
  api._reset = function (best) { prev = null; overlap = null; bestBefore = best | 0; runN = 0; };
  return api;
})();

var SWIM_STICKERS = (function () {
  'use strict';
  var P = (typeof PPOL_STICKERS !== 'undefined' && PPOL_STICKERS) || (typeof require === 'function' ? { make: require('./cook-stickers.js').make } : null);
  if (!P) return null;

  var CATALOG = {
    splash: { label: '풍덩',   alt: '풍덩 뛰어드는 물안경 문어 스티커' },
    flap:   { label: '톡',     anim: 2, fps: 4, alt: '다리를 쫙 펴서 헤엄치는 물안경 문어 스티커' },
    bubble: { label: '보글',   anim: 2, fps: 3, alt: '보글보글 거품을 내는 물안경 문어 스티커' },
    bump:   { label: '퐁',     alt: '퐁 부딪혀 눈을 질끈 감은 물안경 문어 스티커' },
    pickup: { label: '주웠다', alt: '조개껍데기를 주워 든 물안경 문어 스티커' },
    jet:    { label: '쓩',     alt: '먹물을 뒤로 뿜으며 앞으로 나가는 물안경 문어 스티커' },
    wave:   { label: '같이 가자', anim: 2, fps: 3, alt: '다리를 흔들며 손짓하는 물안경 문어 스티커' },
    float:  { label: '둥둥',   anim: 2, fps: 2, alt: '눈 감고 둥둥 떠 있는 물안경 문어 스티커' },
    arrive: { label: '도착',   alt: '깃발을 들고 도착한 물안경 문어 스티커' }
  };
  var RULES = [
    { on: 'start', pick: 'splash', force: true },
    { on: 'flap', who: 'me', nth: 1, pick: 'flap' },
    { on: 'flap', who: 'me', every: 6, pick: ['flap', 'bubble'], chance: 0.6 },
    { on: 'flap', who: 'octopus', every: 8, pick: 'wave', chance: 0.5 },
    { on: 'bump', pick: 'bump' },
    { on: 'ink', pick: 'jet' },
    { on: 'pickup', pick: 'pickup' },
    { on: 'end', status: 'played', pick: 'arrive' },
    { on: 'end', pick: 'float' }          /* 저절로·그만·가만히 — 다 둥둥 (벌 없음) */
  ];
  /* 코스 스크립트: 코스 id 는 카드 8 이 정하면 키만 맞춘다 (지금은 자리표시) */
  var COURSES = {
    reef: { name: '산호초', cues: [
      { on: 'flap', who: 'me', nth: 3, pick: 'bubble' },
      { on: 'pickup', pick: 'pickup' },
      { on: 'end', status: 'played', pick: ['arrive', 'wave'] }
    ] },
    kelp: { name: '다시마 숲', cues: [
      { on: 'bump', pick: 'bump', force: true },
      { on: 'flap', who: 'octopus', nth: 2, pick: 'wave' },
      { on: 'end', pick: 'float' }
    ] }
  };
  return P.make({ set: 'swim', catalog: CATALOG, rules: RULES, scripts: COURSES, scriptArg: 'course', scriptLabel: 'course', big: { ink: true, end: true } });
})();

if (typeof module !== 'undefined' && module.exports) module.exports = { RUNNER_STICKERS: RUNNER_STICKERS, SWIM_STICKERS: SWIM_STICKERS };
