#!/usr/bin/env node
/* tools/test-play.js — 컵 놀이 프로토타입(play.html) 합격 확인 (docs/PLAY_PROTO.md §15). 실패하면 exit 1.
 *   node tools/test-play.js                 # 전부 (http + file://, 본 게임 스모크 A,B,I 포함)
 *   SKIP_MAIN=1 node tools/test-play.js     # 본 게임 회귀(smoke) 빼고
 *   ONLY=boot,round node tools/test-play.js # 그 묶음만 (boot tap round sim honest random slow stale budget idle peek reduced nogl force file metrics layout night main font
 *                                            + 재검증: opening hidebusy chooser twoarms cover letgo dropzone octotap)
 *   SHOTS=/path node tools/test-play.js     # 스크린샷 폴더
 * Playwright 크로미움, 360×740, hasTouch/isMobile, DPR 1. 결정은 시드 PRNG 라 같은 날짜·시드면 같은 결과다 (?date=2026-11-05&seed=t). */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http'), cp = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.env.SHOTS || '/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/play/page/shots';
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const FIX = 'date=2026-11-05&seed=t&fresh=1';
fs.mkdirSync(SHOTS, { recursive: true });

let passes = 0, fails = 0;
function ok(c, m) { if (c) { passes++; console.log('  ok   ' + m); } else { fails++; console.log('  FAIL ' + m); } return !!c; }
function want(name) { return !ONLY.length || ONLY.includes(name); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const FORCE_MS = +(process.env.FORCE_MS || 180000);   /* 헤드리스 2~4 fps 에선 강제 흐름 하나가 실시간 50 s 넘게 걸린다 (프레임 dt 상한 0.1 s) → 넉넉히 */

/* ── 정적 서버 (http 경로) ── */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };
function serve() {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'play.html' : u);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); rsp.end('nf'); return; }
      rsp.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(rsp);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

let browser, BASE;
const FILE = 'file://' + path.join(ROOT, 'play.html');
async function open(q, o) {
  o = o || {};
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1, reducedMotion: o.reduced ? 'reduce' : 'no-preference' });
  if (o.init) await ctx.addInitScript(o.init);
  const page = await ctx.newPage(), errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console.error: ' + m.text()); });
  const url = (o.file ? FILE : BASE + '/play.html') + '?' + FIX + (q ? '&' + q : '');
  await page.goto(url);
  if (!o.nogl) await page.waitForFunction(() => window.__play && window.__play.kit() && window.__play.kit().has('c1'), null, { timeout: 15000 });
  await sleep(300);
  return { ctx, page, errs, close: () => ctx.close() };
}
async function until(page, fn, arg, ms) { try { await page.waitForFunction(fn, arg, { timeout: ms || 15000, polling: 50 }); return true; } catch (e) { return false; } }
async function tg(page) { return page.evaluate(() => { const o = {}; window.__play.kit().targets().forEach((t) => { o[t.id] = t; }); return o; }); }
async function drag(page, from, to, steps) {
  await page.mouse.move(from.x, from.y); await page.mouse.down();
  for (let i = 1; i <= (steps || 10); i++) { await page.mouse.move(from.x + (to.x - from.x) * i / (steps || 10), from.y + (to.y - from.y) * i / (steps || 10)); await sleep(25); }
  await sleep(120); await page.mouse.up();
}
const logOf = (page) => page.evaluate(() => window.__play.log);
const metrics = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__playMetrics, (k, v) => (k === 'sit' ? undefined : v))));
const MENU_IDS = ['lift_one', 'lift_all', 'lift_next', 'two_arms', 'squeeze_in', 'camouflage', 'offer_ball', 'roll_back', 'bat_alone', 'wear_cup_as_hat', 'invite_roll', 'hide_peek', 'cover_ball', 'watch', 'stop'];
function noErr(errs, label) { const real = errs.filter((e) => !/GL Driver Message|GPU stall/.test(e)); ok(real.length === 0, label + ': no page/console errors' + (real.length ? ' → ' + real.slice(0, 3).join(' | ') : '')); }
function uniqueColors(file) { try { return +cp.execFileSync('identify', ['-format', '%k', file]).toString().trim(); } catch (e) { return -1; } }

async function main() {
  const srv = await serve(); BASE = 'http://127.0.0.1:' + srv.address().port;
  browser = await chromium.launch();
  try {
    /* 1. 부팅 · 배치 · 표적 · 글자 */
    if (want('boot') || want('layout')) {
      console.log('[boot] http, 360×740');
      const P = await open('idle=0');
      const shot = path.join(SHOTS, 'play-boot.png'); await P.page.screenshot({ path: shot });
      const n = uniqueColors(shot); ok(n > 30, 'canvas renders the attic (unique colours ' + n + ')');
      const info = await P.page.evaluate(() => ({
        text: document.body.innerText.split('\n').map((s) => s.trim()).filter(Boolean), sw: document.documentElement.scrollWidth, canvas: !!document.querySelector('#scene3d canvas'),
        honestH: document.getElementById('honest').getBoundingClientRect().height, resetHidden: document.getElementById('reset').hidden, title: document.title
      }));
      ok(info.canvas, 'canvas present');
      ok(info.text.length === 2 && info.text.includes('데모 규칙이 고름 · 모델 아님') && info.text.includes('공을 톡 쳐 봐'), 'visible text = one hint + one honest line: ' + JSON.stringify(info.text));
      ok(info.sw <= 360, 'no horizontal scroll (scrollWidth ' + info.sw + ')');
      ok(info.honestH >= 44, 'honest line button ≥ 44px tall (' + info.honestH + ')');
      ok(info.resetHidden, 'reset button hidden before the first touch (chrome stays tiny)');
      const t = await tg(P.page);
      ok(['c1', 'c2', 'c3', 'b1'].every((id) => t[id] && t[id].hit.w >= 44 && t[id].hit.h >= 44), 'cup/ball tap areas ≥ 44px: ' + ['c1', 'c2', 'c3', 'b1'].map((id) => id + ' ' + t[id].hit.w + '×' + t[id].hit.h).join(', '));
      ok(t.c2.y / 740 > 0.55 && t.c2.y / 740 < 0.7, 'cup row at ' + Math.round(t.c2.y / 7.4) + '% of screen height (60–65% target)');
      ok(!t.basket, 'basket not shown before round 1');
      noErr(P.errs, 'boot'); await P.close();
    }

    /* 2. 즉시 반응 + 받아치기 */
    if (want('tap')) {
      console.log('[tap] immediate look, flick → volley');
      const P = await open('idle=0');
      const t = await tg(P.page), b0 = await P.page.evaluate(() => window.__play.kit().state().toys.b1.cell);
      await P.page.mouse.move(t.b1.x, t.b1.y); await P.page.mouse.down();
      const r = await P.page.evaluate(() => { const s = window.__play.kit().state(); return { look: s.look, expr: s.oct.expr, ms: window.__playMetrics.reflexMs.slice(-1)[0] }; });
      ok(r.look === 'b1' && r.expr === 'curious', 'pointerdown on ball → eyes on b1 + curious in the same task (look ' + r.look + ', expr ' + r.expr + ')');
      ok(r.ms <= 100, 'reflex handler time ' + r.ms + ' ms ≤ 100 ms (look target set in the input handler; reflexFrameMs = next painted frame)');
      await P.page.mouse.up();
      /* 장면 시계로 잰다: 헤드리스 크로미움은 3~4 fps 라 실시간은 느리다 → debugStep(1/12) 로 한 칸씩 (폰 60 fps 의 같은 장면 시간) */
      let frames = 0, back = false;
      while (frames < 72 && !back) {
        back = await P.page.evaluate(() => { window.__play.inst().debugStep(1 / 12); return new Promise((r) => setTimeout(() => r(window.__play.log.some((e) => e.action === 'volley') && window.__play.kit().state().toys.b1.cell[1] === 0), 0)); });
        frames++;
      }
      await P.page.evaluate(() => window.__play.inst().resume());
      const dt = Math.round(frames / 12 * 1000);
      ok(back && dt <= 2500, 'ball rolls to the octopus and is batted back to a front cell in ' + dt + ' ms of scene time (≤ 2500)');
      const L = await logOf(P.page);
      ok(L.some((e) => e.by === 'user' && e.action === 'flick') && L.some((e) => e.by === 'playback' && e.action === 'volley'), 'log: user flick + playback volley');
      const m = await metrics(P.page); ok(m.decisions.length === 0, 'volley is a reflex: 0 chooser decisions');
      const b1 = await P.page.evaluate(() => window.__play.kit().state().toys.b1.cell);
      ok(JSON.stringify(b1) !== JSON.stringify(b0), 'ball came back to a different front cell (' + JSON.stringify(b0) + ' → ' + JSON.stringify(b1) + ')');
      noErr(P.errs, 'tap'); await P.close();
    }

    /* 3. 숨기기 → 한 판 (1회차: 마음 바꾸기 · 공 내밀기 · 재터치) */
    if (want('round')) {
      console.log('[round] drag the ball under c2 → one round (speed 0.5)');
      const P = await open('idle=0&speed=0.5');
      const t = await tg(P.page);
      await drag(P.page, t.b1, t.c2);
      const hid = await P.page.evaluate(() => window.__play.log.some((e) => e.by === 'user' && e.action === 'hide'));
      ok(hid, 'user can hide the ball by dragging it onto a cup');
      const started = await until(P.page, () => window.__play.log.some((e) => e.by === 'chooser:demo-rules' && e.point === 'start'), null, 8000);
      ok(started, 'a start decision by chooser:demo-rules after the setup settles');
      const offered = await until(P.page, () => window.__play.log.some((e) => e.action === 'offer_wait'), null, 40000);
      ok(offered, 'round 1 ends with offer_ball (ball pushed to the front, octopus looks at the user)');
      await P.page.screenshot({ path: path.join(SHOTS, 'play-offer.png') });
      const L = await logOf(P.page);
      const dec = L.filter((e) => /^chooser:/.test(e.by));
      ok(dec.every((d) => MENU_IDS.includes(d.action)), 'every decision is a menu action: ' + dec.map((d) => d.point + ':' + d.action).join(', '));
      const st = dec.find((d) => d.point === 'start');
      ok(st && st.action === 'lift_one' && st.considered, 'round 1 start = lift_one with considered (' + (st && st.objects[0]) + ' ~' + (st && st.considered) + ')');
      if (st) {
        const i0 = L.indexOf(L.find((e) => e.action === 'reach' && e.objects[0] === st.considered));
        const i1 = L.findIndex((e, i) => i > i0 && e.action === 'retract' && e.objects[0] === st.considered);
        const i2 = L.findIndex((e, i) => i > i1 && e.action === 'lift' && e.objects[0] === st.objects[0]);
        ok(i0 >= 0 && i1 > i0 && i2 > i1, 'visible change of mind: reach ' + st.considered + ' → retract ' + st.considered + ' → lift ' + st.objects[0] + ' (log ' + [i0, i1, i2] + ')');
      }
      ok(L.some((e) => e.action === 'lift' && /^found:b1/.test(e.result || '')), 'octopus finds b1 (lift result found:b1)');
      const ball = await P.page.evaluate(() => window.__play.kit().state().toys.b1);
      ok(ball.cell[1] === 0 && !ball.cover, 'ball pushed toward the user (front row, cell ' + JSON.stringify(ball.cell) + ')');
      ok(L.every((e) => ['user', 'chooser:demo-rules', 'playback'].includes(e.by)), 'every log row has by ∈ user | chooser:demo-rules | playback');
      const tb = await tg(P.page); await sleep(400);
      await P.page.touchscreen.tap(tb.b1.x, tb.b1.y);
      await sleep(300);
      const m = await metrics(P.page);
      ok(m.offers.offer_ball.shown === 1 && m.offers.offer_ball.retouched10s === 1, 'offer beat measured: shown 1, retouched within 10 s 1 (' + m.offers.offer_ball.ms + ' ms)');
      await until(P.page, () => window.__playMetrics.rounds[0] && window.__playMetrics.rounds[0].t1 != null, null, 8000);
      const m2 = await metrics(P.page), R = m2.rounds[0];
      ok(R && R.calls <= 3 && R.calls === 2 && !R.over, 'round 1 used ' + (R && R.calls) + '/3 decisions (start + end)');
      ok(m2.decisions.every((d) => d.payloadBytes > 0 && d.approxTokens > 0 && d.latencyMs >= 0 && d.chooser && d.retries >= 0), 'each decision records payloadBytes / approxTokens / latencyMs / chooser / retries');
      const vis = await P.page.evaluate(() => ({ reset: !document.getElementById('reset').hidden, hint: getComputedStyle(document.getElementById('hint')).opacity }));
      ok(vis.reset && +vis.hint === 0, 'after first touch: hint faded, reset shown');
      const bk = await P.page.evaluate(() => !!window.__play.kit().targets().find((t) => t.id === 'basket'));
      ok(bk, 'basket with a second ball appears after round 1');
      await P.page.click('#honest'); await sleep(100);
      const rc = await P.page.evaluate(() => ({ t: document.getElementById('receipt').textContent, h: document.getElementById('receipt').hidden }));
      ok(!rc.h && /^방금 고른 것: .+ · 데모 규칙$/.test(rc.t), 'honest line expands to the last decision only: "' + rc.t + '"');
      noErr(P.errs, 'round'); await P.close();
    }

    /* 4. 30판 시뮬 (데모 규칙) */
    if (want('sim')) {
      console.log('[sim] 30 seeded rounds × 6 seeds');
      const P = await open('idle=0');
      for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
        const S = await P.page.evaluate((s) => window.__play.sim(30, { seed: s }), seed);
        const R = S.rounds, decs = [];
        R.forEach((r) => { decs.push(r.start); if (r.end) decs.push(r.end); });
        const r1 = R[0];
        const stopTwice = decs.some((a, i) => i && a === 'stop' && decs[i - 1] === 'stop');
        const surpr = []; R.forEach((r) => { if (r.startKind === 'surprise') surpr.push({ n: r.round, a: r.start }); if (r.endKind === 'surprise') surpr.push({ n: r.round, a: r.end }); });
        const sameSurprise = surpr.some((s, i) => i && s.a === surpr[i - 1].a);
        const dense = R.some((r, i) => surpr.filter((s) => s.n >= r.round && s.n <= r.round + 2).length > 1);
        ok(r1.startKind !== 'surprise' && r1.start !== 'stop' && (!r1.end || (r1.endKind !== 'surprise' && r1.end !== 'stop')), 'seed ' + seed + ': round 1 has no surprise/stop (' + r1.start + ' / ' + r1.end + ')');
        ok(!stopTwice, 'seed ' + seed + ': decline never twice in a row (' + decs.filter((a) => a === 'stop').length + ' stops)');
        ok(!sameSurprise, 'seed ' + seed + ': same surprise never back to back (' + surpr.map((s) => s.a).join(',') + ')');
        ok(!dense, 'seed ' + seed + ': at most 1 surprise per 3 rounds');
        ok(S.ratio.readable >= 0.55, 'seed ' + seed + ': readable ' + Math.round(S.ratio.readable * 100) + '% ≥ 55 (quirk ' + Math.round(S.ratio.quirk * 100) + '%, surprise ' + Math.round(S.ratio.surprise * 100) + '%, stop ' + Math.round(S.ratio.decline * 100) + '%)');
      }
      noErr(P.errs, 'sim'); await P.close();
    }

    /* 5. 정직한 짐작: 지각이 같고 정답만 다르면 같은 선택 */
    if (want('honest')) {
      console.log('[honest] same perception, different truth');
      const P = await open('idle=0');
      const lost = await P.page.evaluate(() => window.__play.honestPair(3));
      ok(lost[0].sit === lost[1].sit, 'lost (moved ×3): the two situations are byte-identical (truth not in payload)');
      ok(JSON.stringify(lost[0].choice) === JSON.stringify(lost[1].choice), 'same action and first cup: ' + JSON.stringify(lost[0].choice));
      ok(!/c1|c3/.test(JSON.parse(lost[0].sit).balls.map((b) => b.at).join()), 'ball perceived as under:? (no cup id)');
      noErr(P.errs, 'honest'); await P.close();
    }

    /* 6. Math.random 없음 */
    if (want('random')) {
      console.log('[random] no Math.random in decision code');
      const src = fs.readFileSync(path.join(ROOT, 'js/play.js'), 'utf8'), s3 = fs.readFileSync(path.join(ROOT, 'js/scene3d.js'), 'utf8');
      ok(!/Math\.random/.test(src), 'js/play.js: 0 Math.random');
      ok(!/Math\.random/.test(s3), 'js/scene3d.js: 0 Math.random');
      const P = await open('idle=0&speed=0.5');
      /* 부팅 뒤에 바꾼다 (three.js 가 메시를 만들 때 uuid 에 쓰므로) — 그 뒤 한 판 동안 결정·연출 어디서도 불리면 안 된다 */
      await P.page.evaluate(() => { window.__mr = 0; Math.random = function () { window.__mr++; throw new Error('Math.random called'); }; });
      const t = await tg(P.page); await drag(P.page, t.b1, t.c2);
      const done = await until(P.page, () => window.__play.state().done.some((d) => d.point === 'start') || window.__play.log.some((e) => e.by === 'chooser:demo-rules' && e.point === 'end'), null, 60000);
      const mr = await P.page.evaluate(() => window.__mr);
      ok(done && mr === 0, 'a full round (hide → decide → lift → end) runs with Math.random throwing (calls ' + mr + ')');
      noErr(P.errs, 'random'); await P.close();
    }

    /* 7. 대기 중 연타 · 사라진 대상 */
    if (want('slow')) {
      console.log('[slow] ?chooser=slow: taps while a decision is pending');
      const P = await open('idle=0&chooser=slow');
      const t = await tg(P.page);
      await drag(P.page, t.b1, t.c2);
      ok(await until(P.page, () => window.__play.state().pending, null, 12000), 'decision pending (800 ms chooser)');
      const t2 = await tg(P.page);
      for (let i = 0; i < 5; i++) { await P.page.touchscreen.tap(i % 2 ? t2.c1.x : t2.c3.x, i % 2 ? t2.c1.y : t2.c3.y); await sleep(60); }
      await until(P.page, () => !window.__play.state().pending && window.__play.log.some((e) => e.by === 'chooser:demo-rules' && e.point === 'start'), null, 8000);
      await sleep(500);
      const m = await metrics(P.page), starts = m.decisions.filter((d) => d.point === 'start');
      ok(starts.length === 1, '5 taps during the pending decision → 1 start decision record (calls ' + (starts[0] && starts[0].calls) + ')');
      ok(starts[0] && starts[0].latencyMs >= 700, 'latency recorded (' + (starts[0] && starts[0].latencyMs) + ' ms)');
      noErr(P.errs, 'slow'); await P.close();
    }
    if (want('stale')) {
      console.log('[stale] ?chooser=stale: target gone → one retry → ponder');
      const P = await open('idle=0&chooser=stale');
      const t = await tg(P.page);
      await drag(P.page, t.b1, t.c2);
      ok(await until(P.page, () => window.__playMetrics.decisions.some((d) => d.point === 'start' && (d.fallback || d.valid)), null, 10000), 'start decision resolved');
      const m = await metrics(P.page), d = m.decisions.find((x) => x.point === 'start');
      ok(d && d.retries === 1 && d.fallback && d.calls === 2, 'stale answer → retries 1, then local ponder (fallback) — calls ' + (d && d.calls) + ', why ' + (d && d.why));
      const L = await logOf(P.page);
      ok(L.some((e) => e.action === 'ponder' && e.by === 'playback' && e.fallback), 'ponder logged as playback with fallback:true (not shown as a choice)');
      ok(!L.some((e) => /^chooser:/.test(e.by) && e.point === 'start'), 'no decision row for the invalid answer');
      noErr(P.errs, 'stale'); await P.close();
    }

    /* 8. 판 예산 */
    if (want('budget')) {
      console.log('[budget] 4 decision points in one round');
      const P = await open('idle=0');
      const r = await P.page.evaluate(async () => { window.__play.setupHidden({ b1: 'c2' }); return window.__play.budgetTest(); });
      ok(r.calls === 3 && r.over === true, 'chooser called 3 times, round.over = true (' + JSON.stringify(r.actions) + ')');
      ok(/ponder\(fallback\)/.test(r.actions[3]), '4th point → local ponder');
      noErr(P.errs, 'budget'); await P.close();
    }

    /* 9. 문어가 먼저 (idle) */
    if (want('idle')) {
      console.log('[idle] ?speed=0.25: initiative after idle, ≤1 per 30 s (scaled), ≤2 in a row');
      const P = await open('speed=0.25');
      const first = await until(P.page, () => window.__play.log.some((e) => e.action === 'initiative'), null, 6000);
      ok(first, 'octopus starts play by itself after idle (first one ~6 s × 0.25)');
      const a = await P.page.evaluate(() => window.__play.log.find((e) => e.action === 'initiative'));
      ok(a && a.chose === 'invite_roll', 'first initiative = invite_roll (opening invite): ' + (a && a.chose));
      await sleep(22000);
      const L = await logOf(P.page), ini = L.filter((e) => e.action === 'initiative');
      ok(ini.length >= 1 && ini.length <= 2, 'without any input: ' + ini.length + ' initiatives (≤ 2 in a row)');
      const gaps = ini.slice(1).map((e, i) => e.t - ini[i].t);
      ok(gaps.every((g) => g >= 30 * 0.25 - 0.2), 'spacing ≥ 30 s × speed: ' + gaps.map((g) => g.toFixed(1)).join(','));
      const ign = L.find((e) => e.action === 'invite_ignored');
      const expr = await P.page.evaluate(() => window.__play.kit().state().oct.expr);
      ok(ign && ['idle', 'calm', 'happy', 'blink', 'curious'].includes(expr), 'ignored invite: takes the ball back calmly, expression ' + expr + ' (no sad face)');
      const m = await metrics(P.page);
      ok(m.initiative.invite_roll.shown >= 1 && m.initiative.invite_roll.ignored >= 1 && m.offers.opening.shown === 1, 'initiative metrics: invite shown ' + m.initiative.invite_roll.shown + ', ignored ' + m.initiative.invite_roll.ignored + ', opening ' + m.offers.opening.shown);
      noErr(P.errs, 'idle'); await P.close();
      const P2 = await open('speed=0.25');
      await until(P2.page, () => window.__play.state().mode === 'invite', null, 8000);
      const t = await tg(P2.page); await P2.page.touchscreen.tap(t.b1.x, t.b1.y); await sleep(400);
      const m2 = await metrics(P2.page);
      ok(m2.initiative.invite_roll.accepted === 1 && m2.offers.opening.retouched10s === 1, 'touching the offered ball accepts the invite (accepted 1, opening retouch 1)');
      noErr(P2.errs, 'idle-accept'); await P2.close();
    }

    /* 10. 숨바꼭질 (hide_peek) */
    if (want('peek')) {
      console.log('[peek] hide_peek → tap tip → other side/cup → tap → pop');
      const P = await open('idle=0&speed=0.5&force=hide_peek');
      ok(await until(P.page, () => window.__play.state().mode === 'hidden' && window.__play.kit().state().tip, null, 15000), 'octopus hides in an empty cup with one arm tip out');
      await sleep(300);
      let t = await tg(P.page); const tip0 = await P.page.evaluate(() => window.__play.kit().state().tip);
      const tp = Object.values(t).find((x) => x.kind === 'tip');
      ok(!!tp, 'tip is a tap target (' + (tp && tp.rect.w) + 'px)');
      await P.page.touchscreen.tap(tp.x, tp.y);
      ok(await until(P.page, (t0) => { const s = window.__play.kit().state().tip; return s && (s.side !== t0.side || s.cup !== t0.cup); }, tip0, 4000), 'first tap: tip goes in and comes out from a different side or cup');
      await sleep(250);
      t = await tg(P.page); const tp2 = Object.values(t).find((x) => x.kind === 'tip');
      await P.page.touchscreen.tap(tp2.x, tp2.y);
      ok(await until(P.page, () => window.__play.kit().state().oct.visible && !window.__play.kit().state().oct.hidden && window.__play.state().mode === 'free', null, 6000), 'second tap: octopus pops out');
      const m = await metrics(P.page); ok(m.initiative.hide_peek.shown === 1 && m.initiative.hide_peek.found === 1, 'hide_peek metrics shown 1 / found 1');
      noErr(P.errs, 'peek'); await P.close();
    }

    /* 11. 모션 감소 */
    if (want('reduced')) {
      console.log('[reduced] prefers-reduced-motion: a full round, no hops');
      const P = await open('idle=0&speed=0.5', { reduced: true });
      const hops = [];
      await P.page.evaluate(() => window.__play.force('lift_one'));
      for (let i = 0; i < 400; i++) {
        const s = await P.page.evaluate(() => ({ hop: window.__play.inst().motion().hop, done: window.__play.state().done.some((d) => d.action === 'lift_one'), red: window.__play.state().reduced }));
        hops.push(s.hop); if (s.done) break; await sleep(60);
      }
      const done = await P.page.evaluate(() => window.__play.state().done.map((d) => d.action));
      ok(done.includes('lift_one'), 'round completes with reduced motion (' + done.join(',') + ')');
      ok(Math.max(...hops) - Math.min(...hops) < 1e-6, 'no hops: body height constant over ' + hops.length + ' samples (Δ ' + (Math.max(...hops) - Math.min(...hops)).toFixed(4) + ')');
      noErr(P.errs, 'reduced'); await P.close();
    }

    /* 12. WebGL 없음 */
    if (want('nogl')) {
      console.log('[nogl] WebGL unavailable → Korean note');
      const P = await open('', { nogl: true, init: () => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (k) { if (/webgl/i.test(k)) return null; return g.apply(this, arguments); }; } });
      await sleep(500);
      const r = await P.page.evaluate(() => ({ note: !document.getElementById('nogl').hidden, text: document.getElementById('nogl').textContent, canvas: !!document.querySelector('#scene3d canvas') }));
      ok(r.note && /3D 장면을 열 수 없어/.test(r.text) && !r.canvas, 'short Korean note, no canvas: "' + r.text + '"');
      await P.page.screenshot({ path: path.join(SHOTS, 'play-nogl.png') });
      noErr(P.errs, 'nogl'); await P.close();
    }

    /* 13. 메뉴 전부 강제 (?force=<id>) */
    if (want('force')) {
      console.log('[force] every menu action can be forced and completes');
      for (const id of MENU_IDS) {
        const P = await open('idle=0&speed=0.25&force=' + id);   /* 0.25: 헤드리스 3~4 fps 에서도 기다리는 박자(내밀기 6 s 등)까지 끝까지 */
        const done = await until(P.page, (a) => window.__play.state().done.some((d) => d.action === a), id, FORCE_MS);
        const s = await P.page.evaluate(() => ({ mode: window.__play.state().mode, done: window.__play.state().done.map((d) => d.action + (d.fallback ? '!' : '')), dec: window.__play.log.filter((e) => /^chooser:/.test(e.by)).map((e) => e.point + ':' + e.action) }));
        ok(done, 'force ' + id + ' → completes (done ' + s.done.join(',') + ' · decisions ' + s.dec.join(',') + ' · mode ' + s.mode + ')');
        if (['squeeze_in', 'camouflage', 'wear_cup_as_hat', 'stop', 'lift_all', 'two_arms', 'offer_ball'].includes(id)) await P.page.screenshot({ path: path.join(SHOTS, 'play-force-' + id + '.png') });
        noErr(P.errs, 'force ' + id); await P.close();
      }
    }

    /* 14. file:// */
    if (want('file')) {
      console.log('[file] file:// boot + one round');
      const P = await open('idle=0&speed=0.25', { file: true });
      const t = await tg(P.page); await drag(P.page, t.b1, t.c3);
      const done = await until(P.page, () => window.__play.state().done.some((d) => d.point === 'start'), null, 60000);
      ok(done, 'file:// works: hide → round completes');
      noErr(P.errs, 'file'); await P.close();
    }

    /* 15. 계측 모양 (situation 허용 키, recent ≤ 3, note ≤ 40, ≤ 1,200 B) */
    if (want('metrics')) {
      console.log('[metrics] situation payload shape');
      const P = await open('idle=0&speed=0.5');
      await P.page.evaluate(() => window.__play.force('lift_all'));
      await until(P.page, () => window.__play.state().done.some((d) => d.action === 'lift_all'), null, 30000);
      await P.page.evaluate(() => window.__play.force('invite_roll'));
      await until(P.page, () => window.__play.state().done.some((d) => d.action === 'invite_roll'), null, 30000);
      const decs = await P.page.evaluate(() => window.__playMetrics.decisions.map((d) => ({ sit: d.sit, bytes: d.payloadBytes, calls: d.calls })));
      const KEYS = ['v', 'id', 'point', 'round', 'cups', 'balls', 'oct', 'last', 'recent', 'facts', 'note', 'menu'];
      ok(decs.length >= 3, decs.length + ' decisions recorded');
      ok(decs.every((d) => Object.keys(d.sit).every((k) => KEYS.includes(k))), 'situation keys ⊆ allowlist (no album, no full history)');
      ok(decs.every((d) => d.sit.recent.length <= 3), 'recent ≤ 3');
      ok(decs.every((d) => d.sit.note == null || d.sit.note.length <= 40), 'note null or ≤ 40 chars');
      ok(decs.every((d) => d.bytes / d.calls <= 1200), 'payload ≤ 1,200 B (max ' + Math.max(...decs.map((d) => d.bytes)) + ')');
      ok(decs.every((d) => d.sit.menu.includes('watch') && d.sit.menu.includes('stop')), 'every menu includes watch and stop');
      ok(decs.every((d) => d.sit.cups.every((c) => c.cell.every(Number.isInteger))), 'positions are grid cells (integers)');
      ok(decs.every((d) => !/love|like|favo|좋아/.test(JSON.stringify(d.sit))), 'no feelings in facts (counts stay counts)');
      fs.writeFileSync(path.join(SHOTS, 'example-situation.json'), JSON.stringify(decs[0].sit));
      noErr(P.errs, 'metrics'); await P.close();
    }

    /* ── 재검증 묶음 (검증에서 나온 문제마다 하나) ── */
    const INV = () => {   /* 보이는 것 = 상태: 자유로운 공이 바닥 컵 발 안에 없다 · 바닥 컵끼리 안 겹친다 · 쉴 때 잡힌 팔 없음 */
      const k = window.__play.kit().state(), s = window.__play.state(), bad = [], T = k.toys;
      const cups = Object.keys(T).filter((id) => T[id].kind === 'cup' && !T[id].on && !T[id].attach && T[id].vis);
      for (let i = 0; i < cups.length; i++) for (let j = i + 1; j < cups.length; j++) { const d = Math.hypot(T[cups[i]].x - T[cups[j]].x, T[cups[i]].z - T[cups[j]].z); if (d < 0.3) bad.push('cups overlap ' + cups[i] + '/' + cups[j]); }
      Object.keys(T).filter((id) => T[id].kind === 'ball' && T[id].vis && !T[id].attach && !T[id].inBasket && !T[id].cover).forEach((b) => cups.forEach((c) => { const d = Math.hypot(T[c].x - T[b].x, T[c].z - T[b].z); if (d < 0.2) bad.push('free ball ' + b + ' inside ' + c + ' d=' + d.toFixed(2)); }));
      if (!s.busy && !s.pending) Object.keys(k.arms).forEach((a) => { if (k.arms[a].mode !== 'tuck') bad.push('arm ' + a + ' held at rest'); });
      return bad;
    };
    if (want('opening')) {
      console.log('[opening] no touch: invite + ignored fetch never put the body in the cup row');
      const P = await open('speed=0.5');
      let min = 9, maxArm = 0, n = 0;
      while (n++ < 900) {
        const s = await P.page.evaluate(() => { const k = window.__play.kit().state(), o = k.oct.at; let m = 9; ['c1', 'c2', 'c3'].forEach((c) => { m = Math.min(m, Math.hypot(k.toys[c].x - o[0], k.toys[c].z - o[1])); }); return { m, arms: Object.values(k.arms).map((a) => a.sx), done: window.__play.log.some((e) => e.action === 'bat_alone') && !window.__play.state().busy }; });
        min = Math.min(min, s.m); maxArm = Math.max(maxArm, ...s.arms, 0); if (s.done) break; await sleep(100);
      }
      const L = await logOf(P.page);
      ok(L.some((e) => e.action === 'invite_ignored') && L.some((e) => e.action === 'bat_alone'), 'opening invite ignored → takes the ball back and bats alone');
      ok(min >= 0.62, 'octopus centre stays ≥ 0.62 m from every cup (min ' + min.toFixed(2) + ' m; head r 0.42 + cup r 0.17 = 0.59)');
      ok(maxArm > 2.6, 'reaches the front-row ball with one long arm through a gap (max stretch ×' + maxArm.toFixed(2) + ')');
      const bad = await P.page.evaluate(INV); ok(!bad.length, 'invariants after the opening: ' + (bad.join('; ') || 'clean'));
      noErr(P.errs, 'opening'); await P.close();
    }
    if (want('hidebusy')) {
      console.log('[hidebusy] hide the ball while the octopus is mid-invite → the hide counts and a round starts');
      for (const delay of [100, 1500]) {
        const P = await open('speed=0.5');
        await until(P.page, () => window.__play.state().episode === 'idle' && window.__play.log.some((e) => e.action === 'initiative'), null, 30000);
        await sleep(delay);
        const t = await tg(P.page); await drag(P.page, t.b1, t.c1);
        const r = await until(P.page, () => window.__play.log.some((e) => e.action === 'round_start'), null, 30000);
        const st = await P.page.evaluate(() => { const s = window.__play.state(); return { hid: Object.keys(s.hid), b1: s.balls.find((b) => b.id === 'b1') }; });
        ok(r && st.hid.includes('b1'), 'hide ' + delay + ' ms into the invite → round starts, b1 tracked as hidden (under ' + (st.b1 && st.b1.under) + ')');
        noErr(P.errs, 'hidebusy ' + delay); await P.close();
      }
    }
    if (want('chooser')) {
      console.log('[chooser] a swapped-in chooser is named honestly; its note is capped at 40 chars');
      const P = await open('idle=0');
      const r = await P.page.evaluate(async () => {
        const long = 'n'.repeat(150);
        window.__play.setChooser({ name: 'model-x', source: 'mcp', choose: (sit) => Promise.resolve({ action: 'watch', note: long }) });
        const honest = document.getElementById('honest').textContent;
        window.__play.setupHidden({ b1: 'c2' });
        await window.__play.decide('start'); await window.__play.decide('start');
        const d = window.__playMetrics.decisions; document.getElementById('honest').click();
        return { honest, receipt: document.getElementById('receipt').textContent, note2: d[d.length - 1].sit.note, by: window.__play.log.filter((e) => /^chooser:/.test(e.by)).map((e) => e.by) };
      });
      ok(r.honest === '모델이 고름 · model-x', 'honest line names the active chooser: "' + r.honest + '"');
      ok(/ · model-x$/.test(r.receipt) && !/데모/.test(r.receipt), 'receipt names it too: "' + r.receipt + '"');
      ok(r.note2 && r.note2.length === 40, 'note sent back is capped at 40 chars (' + (r.note2 && r.note2.length) + ')');
      ok(r.by.every((b) => b === 'chooser:model-x'), 'log rows by chooser:model-x');
      const fb = await P.page.evaluate(async () => { window.__play.setChooser({ name: 'model-x', source: 'mcp', choose: () => Promise.resolve({ action: 'nope' }) }); await window.__play.decide('start'); return { r: document.getElementById('receipt').textContent, last: window.__play.log.slice(-1)[0] }; });
      ok(fb.last.by === 'playback' && fb.last.action === 'ponder' && fb.r === '이번엔 고르지 않음 · 그냥 둘러봄', 'invalid answer → playback ponder, receipt says nothing was chosen ("' + fb.r + '")');
      noErr(P.errs, 'chooser'); await P.close();
    }
    if (want('twoarms')) {
      console.log('[twoarms] both balls end up held clear of the cups');
      const P = await open('idle=0&speed=0.25&force=two_arms');
      let bad = [], n = 0, held = false;
      while (n++ < 2000) {
        const s = await P.page.evaluate(() => { const L = window.__play.log; return { lowered: L.some((e) => e.action === 'lower'), done: window.__play.state().done.some((d) => d.action === 'two_arms') }; });
        if (s.lowered && !held) { held = true; bad = bad.concat(await P.page.evaluate(INV)); }
        if (s.done) break; await sleep(150);
      }
      ok(held, 'two_arms reached the lower step');
      ok(!bad.length, 'after the cups go back down no ball is left inside a cup: ' + (bad.join('; ') || 'clean'));
      const end = await P.page.evaluate(INV); ok(!end.length, 'invariants at the end: ' + (end.join('; ') || 'clean'));
      noErr(P.errs, 'twoarms'); await P.close();
    }
    if (want('cover')) {
      console.log('[cover] cover_ball never slides a cup through another cup');
      const P = await open('idle=0&speed=0.25&force=cover_ball');
      let min = 9, n = 0;
      while (n++ < 2000) {
        const s = await P.page.evaluate(() => { const T = window.__play.kit().state().toys, c = ['c1', 'c2', 'c3']; let m = 9; for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) m = Math.min(m, Math.hypot(T[c[i]].x - T[c[j]].x, T[c[i]].z - T[c[j]].z)); return { m, done: window.__play.state().done.some((d) => d.action === 'cover_ball') }; });
        min = Math.min(min, s.m); if (s.done) break; await sleep(60);
      }
      const st = await P.page.evaluate(() => window.__play.state().balls.find((b) => b.id === 'b1'));
      ok(min >= 0.34, 'cups never overlap while sliding (min centre distance ' + min.toFixed(2) + ' m ≥ 2 × 0.17)');
      ok(st && st.under, 'the ball ends up covered (under ' + (st && st.under) + ')');
      noErr(P.errs, 'cover'); await P.close();
    }
    if (want('letgo')) {
      console.log('[letgo] take the cup from the octopus after it found the ball → state matches what is seen');
      const P = await open('idle=0&speed=0.25&force=lift_one');
      ok(await until(P.page, () => window.__play.log.some((e) => e.action === 'lift' && /^found/.test(e.result || '')) && ['c1', 'c2', 'c3'].some((c) => /^arm:/.test(window.__play.kit().state().toys[c].attach || '')), null, FORCE_MS), 'octopus lifted the cup and found b1 (cup still held)');
      await P.page.evaluate(() => window.__play.inst().pause());   /* 들고 있는 순간에 멈춰 두고 톡 */
      const cup = await P.page.evaluate(() => ['c1', 'c2', 'c3'].find((c) => /^arm:/.test(window.__play.kit().state().toys[c].attach || '')));
      const t = await tg(P.page); await P.page.evaluate(() => window.__play.inst().resume());
      if (cup && t[cup]) await P.page.touchscreen.tap(t[cup].x, t[cup].y); await sleep(1500);
      const bad = await P.page.evaluate(INV), L = await logOf(P.page);
      ok(L.some((e) => e.action === 'let_go'), 'tapping the held cup → let_go');
      ok(!bad.length, 'no free ball drawn inside a cup after the let-go: ' + (bad.join('; ') || 'clean'));
      noErr(P.errs, 'letgo'); await P.close();
    }
    if (want('dropzone')) {
      console.log('[dropzone] release the ball over the top part of a cup → it hides');
      const P = await open('idle=0');
      const t = await tg(P.page), r = t.c2.rect;
      await drag(P.page, t.b1, { x: (r.l + r.r) / 2, y: r.t + 6 });
      const L = await logOf(P.page);
      ok(L.some((e) => e.by === 'user' && e.action === 'hide' && e.objects[1] === 'c2'), 'release 6 px below the cup top hides the ball under c2 (' + L.filter((e) => e.by === 'user').map((e) => e.action).join(',') + ')');
      noErr(P.errs, 'dropzone'); await P.close();
    }
    if (want('octotap')) {
      console.log('[octotap] tap the octopus head where a cup tap box overlaps it → the octopus, not the cup');
      const P = await open('idle=0');
      const pt = await P.page.evaluate(() => {
        const k = window.__play.kit(), w = k.cell(4, 2); k.jumpTo(w[0], w[1]); k.face('camera');
        return new Promise((res) => setTimeout(() => {
          const h = k.headRect(), c2 = k.targets().find((x) => x.id === 'c2');
          for (let y = Math.round(c2.hit.t) + 2; y < c2.rect.t - 3; y++) { const x = Math.round((c2.rect.l + c2.rect.r) / 2); if (y >= h.t && y <= h.b && k.pick(x, y) && k.pick(x, y).id === 'c2') return res({ x, y }); }
          res(null);
        }, 400));
      });
      if (!pt) ok(false, 'found a point on the head inside c2’s tap box'); else {
        await P.page.touchscreen.tap(pt.x, pt.y); await sleep(300);
        const L = await logOf(P.page);
        ok(L.some((e) => e.action === 'tap_oct') && !L.some((e) => e.action === 'peek'), 'tap on the head over c2’s tap box → tap_oct, not peek (' + L.filter((e) => e.by === 'user').map((e) => e.action).join(',') + ')');
      }
      const h = await P.page.evaluate(() => window.__play.kit().headRect());
      const cdp = await P.ctx.newCDPSession(P.page), hx = (h.l + h.r) / 2, hy = (h.t + h.b) / 2;   /* 진짜 터치 (pointerType touch) */
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: hx, y: hy, id: 1 }] }); await sleep(1600);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(300);
      const L2 = await logOf(P.page), lastTwo = L2.filter((e) => e.by === 'user').slice(-1)[0];
      ok(lastTwo && lastTwo.action === 'pet', 'long press = pet only (no extra tap_oct on release): ' + (lastTwo && lastTwo.action));
      noErr(P.errs, 'octotap'); await P.close();
    }

    /* 16. 밤 */
    if (want('night')) {
      const P = await open('idle=0&hour=23');
      await P.page.screenshot({ path: path.join(SHOTS, 'play-night.png') });
      noErr(P.errs, 'night'); await P.close();
    }
  } finally { await browser.close(); srv.close(); }

  /* 17. 본 게임 회귀: index.html 스모크 A,B,I (smoke I 가 바꾸는 증거 PNG 는 되돌린다).
     smoke 는 ok 줄을 stdout, FAIL·CRASH 줄을 stderr 에 쓴다 → 둘을 한 파일(같은 fd)에 쓰인 차례대로 받아,
     실패한 검사 이름을 그 앞 '== 시나리오' 줄과 같이 찍는다. 전체 출력은 SHOTS/smoke/smoke.log */
  if (want('main') && process.env.SKIP_MAIN !== '1') {
    console.log('[main] SMOKE_ONLY=A,B,I node tools/smoke.js');
    const ev = path.join(ROOT, 'tests/evidence/peek-bubble.png'), keep = fs.existsSync(ev) ? fs.readFileSync(ev) : null;
    const logDir = path.join(SHOTS, 'smoke'); fs.mkdirSync(logDir, { recursive: true });
    const logFile = path.join(logDir, 'smoke.log'), fd = fs.openSync(logFile, 'w');
    let r;
    try {
      r = cp.spawnSync('node', ['tools/smoke.js'], { cwd: ROOT, env: Object.assign({}, process.env, { SMOKE_ONLY: 'A,B,I', SHOTS: logDir + '/' }), stdio: ['ignore', fd, fd], timeout: 600000 });
    } finally { fs.closeSync(fd); }
    if (keep) fs.writeFileSync(ev, keep);
    const lines = fs.readFileSync(logFile, 'utf8').split('\n').map((l) => l.trimEnd()), failed = [];
    let sec = '';
    for (const l of lines) {
      const t = l.trim();
      if (/^== /.test(t)) sec = t.slice(3, 51);
      else if (/^(FAIL\b|CRASH:)/.test(t)) failed.push(t.replace(/^FAIL\s+/, '') + (sec ? '   [' + sec + ']' : ''));
    }
    const said = lines.filter(Boolean), tail = said.slice(-1).join('');
    const why = r.error ? ' · ' + (r.error.code || r.error.message) : r.signal ? ' · ' + r.signal : r.status ? ' · exit ' + r.status : '';
    const more = failed.length ? '\n        failing: ' + failed.join('\n        failing: ')
      : r.status !== 0 ? '\n        last lines: ' + said.slice(-6).join('\n                    ') : '';
    ok(r.status === 0 && !failed.length, 'index.html smoke A,B,I passes (' + tail + why + ')' + more + (r.status !== 0 || failed.length ? '\n        log: ' + logFile : ''));
  }
  /* 18. 글꼴 서브셋 */
  if (want('font') || (!ONLY.length)) {
    const py = '/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/pylib';
    if (fs.existsSync(py)) {
      const r = cp.spawnSync('python3', ['tools/subset-fonts.py', '--check'], { cwd: ROOT, env: Object.assign({}, process.env, { PYTHONPATH: py }), encoding: 'utf8' });
      ok(/stale: none/.test(r.stdout || ''), 'font subset covers every new syllable (stale: none)');
    } else console.log('  skip font check (no fontTools path)');
  }
  console.log('\n' + passes + ' passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
