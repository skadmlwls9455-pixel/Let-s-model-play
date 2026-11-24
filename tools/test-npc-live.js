/* tools/test-npc-live.js — 마을 문어의 말 · 게시판 · 처음 세 줄을 브라우저에서 (11-21 7차 N 갈래).
 *   NODE_PATH=$(npm root -g) node tools/test-npc-live.js
 * V 갈래의 단추와 장면 API 는 여기서 작은 가짜로 넣는다 (계약 C6: #btn-npc-* · #btn-plaza-board · scene.npcSet · scene.npcMark). */
'use strict';
var path = require('path');
var chromium = require('playwright').chromium;
var URL = 'file://' + path.join(__dirname, '..', 'index.html');
var pass = 0, fail = 0;
function ok(c, msg) { if (c) pass++; else { fail++; console.log('  FAIL ' + msg); } }
var SAVE = { octopus: { name: '뽈뽈' }, user: { shells: 5, story: { notices: { help: '2026-11-01', later: 'keep' }, future: [1] } } };

function stubs() {   /* 페이지 안에서 돈다: V 의 단추가 없으면 가짜를 넣고, 있으면 (진짜 장면 — 바깥이 화면에 없을 때는 숨어 있다) 시험 동안 보이게 고정한다 */
  document.addEventListener('DOMContentLoaded', function () {
    var sc = document.getElementById('scene'), css = '';
    ['btn-npc-clothes', 'btn-npc-goods', 'btn-npc-cafe', 'btn-npc-sleep-1', 'btn-plaza-board'].forEach(function (id, i) {
      if (!document.getElementById(id)) {
        var b = document.createElement('button'); b.type = 'button'; b.id = id; b.className = 'scene-spot'; b.setAttribute('aria-label', id); sc.appendChild(b);
      }
      css += '#' + id + ' { display: block !important; visibility: visible !important; pointer-events: auto !important; position: absolute !important; left: ' + (8 + i * 48) + 'px !important; top: 120px !important; transform: none !important; opacity: 1 !important; z-index: 30 !important; }\n';
    });
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  });
}
async function open(browser, q, opt) {
  opt = opt || {};
  var ctx = await browser.newContext({ viewport: { width: opt.w || 360, height: opt.h || 740 }, deviceScaleFactor: opt.d || 2, reducedMotion: opt.reduced ? 'reduce' : 'no-preference' });
  var p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', function (e) { p.errs.push(e.message); });
  if (opt.save) await p.addInitScript(function (s) { if (!localStorage.getItem('ppolppol_v2')) localStorage.setItem('ppolppol_v2', s); }, JSON.stringify(opt.save));
  await p.addInitScript({ content: 'window.__ppolTest = { today: "2026-11-21" };' });
  await p.addInitScript(stubs);
  await p.goto(URL + q);
  await p.waitForFunction(function () { return document.documentElement.classList.contains('booted'); });
  return p;
}
function box(p) {
  return p.evaluate(function () {
    var b = document.getElementById('npc-box'), r = b.getBoundingClientRect(), say = b.querySelector('.npc-say');
    return { hidden: b.hidden || getComputedStyle(b).display === 'none', tag: document.getElementById('npc-tag').textContent, text: document.getElementById('npc-text').textContent,
      live: say.getAttribute('aria-live'), role: b.getAttribute('role'), top: r.top, bottom: r.bottom, left: r.left, right: r.right, vw: innerWidth, vh: innerHeight,
      active: document.activeElement ? document.activeElement.id || document.activeElement.tagName : '', npc: APP.npc, parent: b.parentNode.id || b.parentNode.tagName };
  });
}

(async function () {
  var browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  try {
    /* ── 1. 대사창 (3D) ── */
    var p = await open(browser, '?intro=0', { save: SAVE });
    ok(await p.evaluate(function () { return APP.sceneMode; }) === '3d', '3D 장면');
    await p.evaluate(function () { window.__ppolTest.npcHold = true; if (typeof APP.scene.villageNear === 'function') APP.scene.villageNear = function () { return true; }; });   /* 11-22: 다락에서 시험한다 — 마을 단추의 '멀면 먼저 걸어가기' (V) 는 가까이 있는 것으로   /* 11-22: 확인하는 사이 저절로 넘어가 닫히지 않게 (저절로 넘김은 아래 ?slow 판에서 따로 본다) */
    await p.waitForFunction(function () { return !document.getElementById('toast').classList.contains('show'); }, null, { timeout: 8000 }).catch(function () {});
    var b0 = await box(p);
    ok(b0.hidden && b0.npc === null, '처음엔 대사창이 숨어 있다');
    ok(b0.live === 'polite' && b0.role === 'group', '읽기 영역 aria-live polite · 모달이 아니다');
    await p.evaluate(function () { window.__calls = []; APP.scene.npcSet = function (l) { window.__calls.push(['set', l]); }; APP.scene.npcMark = function (id, on) { window.__calls.push(['mark', id, on]); }; });
    ok(await p.evaluate(function () { return APP.npcSync(true); }) === true, 'scene.npcSet 이 있으면 오늘의 문어들을 넘긴다');   /* 11-22: 진짜 장면 (갈래 V) 이 부팅 때 이미 받았으므로 force 로 다시 넘겨 가로챈다 */
    var set = await p.evaluate(function () { return window.__calls[0][1]; });
    ok(set.length === 7 && set[0].id === 'clothes' && set[0].hat === 'beret' && set[6].pose === 'sleep', 'npcSet 목록 (셋 + 자는 넷)');
    ok(await p.evaluate(function () { return APP.npcSync(); }) === false, '같은 날 두 번 넘기지 않는다');

    await p.evaluate(function () { document.getElementById('btn-settings') && document.getElementById('btn-settings').focus(); window.__focus0 = document.activeElement; window.__r = null; APP.npcSay('clothes', 'shop.hello').then(function (v) { window.__r = v; }); });
    var b1 = await box(p);
    ok(!b1.hidden && b1.tag === '시침 · 대본', '옷가게 문어의 이름표: 시침 · 대본');
    ok(b1.text.length > 0 && b1.npc && b1.npc.key === 'shop.hello', '대본 줄이 보인다');
    ok(b1.left >= 0 && b1.right <= b1.vw && b1.top >= 0 && b1.bottom <= b1.vh, '화면 안에 있다');
    ok(await p.evaluate(function () { return document.activeElement === window.__focus0; }), '포커스를 옮기지 않는다');
    ok(!/[^\u0000-\u007f가-힣ㄱ-ㅎㅏ-ㅣ…·]/.test(b1.tag + b1.text), '이모지 · 기호 없음');
    ok(await p.evaluate(function () { return window.__calls.some(function (c) { return c[0] === 'mark' && c[1] === 'clothes' && c[2] === true; }); }), '말하는 동안 npcMark(id, true)');
    await p.click('#npc-next');
    await p.waitForFunction(function () { return window.__r !== null; });
    ok(await p.evaluate(function () { return window.__r; }) === true && (await box(p)).hidden, '누르면 닫히고 Promise 는 true');
    ok(await p.evaluate(function () { var c = window.__calls[window.__calls.length - 1]; return c[0] === 'mark' && c[2] === false; }), '끝나면 npcMark(id, false)');

    /* 풍선 둘짜리: 누르면 다음 풍선, 한 번 더 누르면 닫힘 */
    var two = await p.evaluate(function () { for (var i = 0; i < 8; i++) { APP.npcSay('goods', 'talk'); if (document.getElementById('npc-box').getAttribute('data-more') === '1') return APP.npc; } return null; });
    ok(!!two && two.i === 0 && two.tag === '모아 · 대본', '풍선 둘짜리 줄');
    await p.click('#npc-next');
    var b2 = await box(p); ok(!b2.hidden && b2.npc && b2.npc.i === 1 && b2.tag === '모아 · 대본', '둘째 풍선에도 이름표');
    await p.click('#npc-next'); ok((await box(p)).hidden, '마지막 풍선에서 누르면 닫힌다');

    /* Esc · 제 것이 아닌 열쇠 · 앞의 말 접기 */
    await p.evaluate(function () { window.__r = null; APP.npcSay('cafe', 'cafe.serve').then(function (v) { window.__r = v; }); });
    ok((await box(p)).tag === '느루 · 대본', '카페 문어 이름표');
    await p.keyboard.press('Escape'); await p.waitForFunction(function () { return window.__r !== null; });
    ok(await p.evaluate(function () { return window.__r; }) === false && (await box(p)).hidden, 'Esc 로 닫힌다 (false)');
    ok(await p.evaluate(function () { return APP.npcSay('cafe', 'shop.hello'); }) === false && (await box(p)).hidden, '제 것이 아닌 열쇠면 아무것도 안 보인다');
    ok(await p.evaluate(function () { return APP.npcSay('sleep-1', 'talk'); }) === false, '자는 문어는 말하지 않는다');
    var rr = await p.evaluate(function () { var a = APP.npcSay('clothes', 'talk'), b = APP.npcSay('goods', 'shop.thanks'); return a.then(function (v) { return [v, APP.npc && APP.npc.id]; }); });
    ok(rr[0] === false && rr[1] === 'goods', '새 말이 오면 앞의 말은 접힌다 (한 번에 하나)');
    await p.keyboard.press('Escape');

    /* 자판: 가게 문어 단추에서 Enter → 말, 다시 Enter → 넘어감. Tab 은 갇히지 않는다 */
    await p.focus('#btn-npc-clothes'); await p.keyboard.press('Enter');
    var b3 = await box(p); ok(!b3.hidden && b3.npc.key === 'talk' && b3.npc.id === 'clothes' && b3.active === 'btn-npc-clothes', '단추에서 Enter → talk 한 줄 (포커스는 단추에 그대로)');
    for (var i = 0; i < 3 && !(await box(p)).hidden; i++) await p.keyboard.press('Enter');
    ok((await box(p)).hidden, 'Enter 를 다시 누르면 넘어가고 닫힌다');
    await p.click('#btn-npc-cafe'); await p.focus('#npc-next');
    var seen = {}; for (i = 0; i < 6; i++) { await p.keyboard.press('Tab'); seen[(await box(p)).active] = 1; }
    ok(Object.keys(seen).length >= 3 && Object.keys(seen).some(function (k) { return k !== 'npc-next'; }), 'Tab 이 대사창에 갇히지 않는다');
    await p.focus('#npc-next'); await p.keyboard.press('Enter');
    var guard = 0; while (!(await box(p)).hidden && guard++ < 3) await p.keyboard.press('Enter');
    ok((await box(p)).hidden, '대사창의 단추에서 Enter 로 닫힌다');

    /* 11-21 밤 (계약 C14): 방이 바뀌면 떠 있던 말은 접힌다 · 카드 (data-npc-avoid) 를 가리지 않는다 */
    var rm = await p.evaluate(function () {
      APP.npcSay('cafe', 'cafe.order'); var shown = !!APP.npc;
      document.dispatchEvent(new CustomEvent('ppol:room', { detail: { key: 'cafe' } }));
      return { shown: shown, folded: APP.npc === null };
    });
    ok(rm.shown && rm.folded, '방이 바뀌면 떠 있던 말은 접힌다');
    var av = await p.evaluate(function () {
      var sc = document.getElementById('scene'), r = sc.getBoundingClientRect(), c = document.createElement('div');
      c.setAttribute('data-npc-avoid', ''); c.style.cssText = 'position:absolute;left:40px;width:200px;height:120px;top:' + (r.height - 140) + 'px;background:#fff'; sc.appendChild(c);
      APP.npcSay('clothes', 'shop.pay', { shells: 12 });
      var b = document.getElementById('npc-box').getBoundingClientRect(), k = c.getBoundingClientRect(), txt = document.getElementById('npc-text').textContent;
      var over = b.right > k.left && b.left < k.right && b.bottom > k.top && b.top < k.bottom; c.remove(); return { over: over, top: b.top, txt: txt };
    });
    ok(!av.over && av.top >= 0 && /12개/.test(av.txt), '카드 (꼬리표 · 영수증) 를 가리지 않는다 · 조개 수를 말한다: ' + JSON.stringify(av));
    await p.keyboard.press('Escape');

    /* 11-22 (점검): 방이 바뀌는 그 틱에 다른 갈래가 부른 말은 접히지 않는다 (먼저 듣는 쪽이어도) · 그 전부터 떠 있던 말만 접힌다 */
    var tick = await p.evaluate(function () {
      APP.npcSay('cafe', 'talk'); var old = APP.npc && APP.npc.key;
      var f = function () { APP.npcSay('clothes', 'shop.enter'); };
      window.addEventListener('ppol:room', f, true);   /* 창에서 먼저 받는 듣는이 = 내 것보다 먼저 도는 다른 갈래 */
      document.dispatchEvent(new CustomEvent('ppol:room', { detail: { key: 'clothes' } }));
      window.removeEventListener('ppol:room', f, true);
      var r = { old: old, now: APP.npc && APP.npc.key };
      document.dispatchEvent(new CustomEvent('ppol:room', { detail: { key: null } })); r.after = APP.npc; return r;
    });
    ok(tick.old === 'talk' && tick.now === 'shop.enter' && tick.after === null, '방이 바뀐 틱에 부른 새 말은 살고, 다음 방 바뀜에 접힌다: ' + JSON.stringify(tick));
    /* 글자 크기: 어느 글꼴 설정에서도 16px 이상 (대사창 · 게시판 · 이야기 세 줄) */
    var fs = await p.evaluate(function () {
      APP.npcSay('goods', 'talk'); APP.openStory();
      var el = document.getElementById('story-intro'); el.hidden = false; document.getElementById('story-line').textContent = '가';
      var sel = ['.npc-tag', '.npc-text', '.story-note p', '.story-h', '.story-line', '.story-skip', '#story-close'], out = {}, root = document.documentElement, was = root.getAttribute('data-font');
      ['pixel', 'plain'].forEach(function (f) { root.setAttribute('data-font', f); sel.forEach(function (q) { var n = document.querySelector(q); out[f + ' ' + q] = n ? parseFloat(getComputedStyle(n).fontSize) : -1; }); });
      if (was == null) root.removeAttribute('data-font'); else root.setAttribute('data-font', was);
      el.hidden = true; document.getElementById('story-line').textContent = ''; document.getElementById('story-sheet').close(); return out;
    });
    ok(Object.keys(fs).every(function (k) { return fs[k] >= 16; }), '글자는 16px 이상 (두 글꼴 설정): ' + JSON.stringify(fs));
    await p.keyboard.press('Escape');
    /* 위로 올라갈 때도 상태 줄을 덮지 않고, 열린 창의 머리와 단추를 피한다 */
    var top1 = await p.evaluate(function () {
      document.getElementById('btn-settings').click();
      return new Promise(function (res) { setTimeout(function () {
        APP.npcSay('clothes', 'talk');
        var b = document.getElementById('npc-box').getBoundingClientRect(), tag = document.getElementById('npc-tag').getBoundingClientRect(), st = document.getElementById('status').getBoundingClientRect();
        var d = document.querySelector('dialog[open]'), h = d && d.querySelector('.dlg-top, h2, h3'), hr = h ? h.getBoundingClientRect() : null;
        var hit = function (a, c) { return a.right > c.left && a.left < c.right && a.bottom > c.top && a.top < c.bottom; };
        res({ status: hit(tag, st) || hit(b, st), head: hr ? hit(b, hr) || hit(tag, hr) : false, top: b.top });
      }, 500); });
    });
    ok(!top1.status && !top1.head, '창이 열려 있을 때 대사창이 상태 줄 · 창 머리를 덮지 않는다: ' + JSON.stringify(top1));
    /* 카드 (칠판 · 레코드) 를 피해 장면 위쪽으로 올라갈 때도 상태 줄 칸 (데모 꼬리표 · 조개 칩 · 오른쪽 위 단추) 을 덮지 않는다 */
    var top2 = await p.evaluate(function () {
      [].forEach.call(document.querySelectorAll('dialog[open]'), function (d) { d.close(); });
      var bag = document.getElementById('btn-bag'); bag.hidden = false;
      var sc = document.getElementById('scene'), r = sc.getBoundingClientRect(), c = document.createElement('div');
      c.setAttribute('data-npc-avoid', ''); c.style.cssText = 'position:absolute;left:0;right:0;height:' + Math.round(r.height * 0.55) + 'px;bottom:0;background:#fff'; sc.appendChild(c);
      APP.npcSay('cafe', 'cafe.serve');
      var b = document.getElementById('npc-box').getBoundingClientRect(), tag = document.getElementById('npc-tag').getBoundingClientRect();
      var hit = function (a, k) { return a.right > k.left && a.left < k.right && a.bottom > k.top && a.top < k.bottom; }, out = { top: b.top, over: [] };
      ['status', 'brain-tag', 'btn-bag', 'scene-ctl'].forEach(function (id) { var e = document.getElementById(id); if (e && !e.hidden && e.offsetWidth) { var k = e.getBoundingClientRect(); if (hit(b, k) || hit(tag, k)) out.over.push(id); } });
      c.remove(); return out;
    });
    ok(top2.top < 200 && top2.over.length === 0, '위로 올라가도 상태 줄 칸 (데모 꼬리표 · 조개 칩 · 단추) 아래에서 멈춘다: ' + JSON.stringify(top2));
    await p.keyboard.press('Escape');
    await p.keyboard.press('Escape'); await p.keyboard.press('Escape');

    /* 11-24 (넷째 점검): 발자국 손잡이 · 큰 단추를 덮지 않는다 */
    var stk = await p.evaluate(function () {
      [].forEach.call(document.querySelectorAll('dialog[open]'), function (d) { d.close(); });
      var s = document.getElementById('stick'), was = s.hidden; s.hidden = false; s.style.setProperty('display', 'block', 'important');
      APP.npcSay('clothes', 'shop.enter');
      var hit = function (a, k) { return a.right > k.left && a.left < k.right && a.bottom > k.top && a.top < k.bottom; };
      var b = document.getElementById('npc-box').getBoundingClientRect(), out = [];
      ['stick', 'btn-go'].forEach(function (id) { var e = document.getElementById(id); if (e && e.offsetWidth && hit(b, e.getBoundingClientRect())) out.push(id); });
      s.hidden = was; s.style.removeProperty('display'); return out;
    });
    ok(stk.length === 0, '대사창이 발자국 손잡이 · 큰 단추를 덮지 않는다: ' + JSON.stringify(stk));
    await p.keyboard.press('Escape');
    /* 시트 위의 대사 글자도 16px 이상 (픽셀 글꼴을 끈 설정) */
    var sf = await p.evaluate(function () {
      var root = document.documentElement, was = root.getAttribute('data-font'); root.setAttribute('data-font', 'plain');
      APP.openStory(); APP.npcSay('goods', 'talk');
      var f = parseFloat(getComputedStyle(document.getElementById('npc-text')).fontSize), par = document.getElementById('npc-box').parentNode.id;
      document.getElementById('story-sheet').close(); if (was == null) root.removeAttribute('data-font'); else root.setAttribute('data-font', was); return { f: f, par: par };
    });
    ok(sf.par === 'story-sheet' && sf.f >= 16, '시트 위의 대사 글자도 16px 이상: ' + JSON.stringify(sf));
    await p.keyboard.press('Escape');

    /* 자는 문어: 알림 한 줄 */
    await p.click('#btn-npc-sleep-1');
    ok(await p.evaluate(function () { var t = document.getElementById('toast'); return t.classList.contains('show') && t.textContent === '자고 있어.'; }) && (await box(p)).hidden, '자는 문어를 누르면 "자고 있어." 한 줄 (대사창 아님)');

    /* ── 2. 게시판 ── */
    await p.click('#btn-plaza-board');
    await p.waitForFunction(function () { return document.getElementById('story-sheet').open; });
    var st = await p.evaluate(function () {
      var d = document.getElementById('story-sheet'), saved = JSON.parse(localStorage.getItem('ppolppol_v2'));
      return { n: d.querySelectorAll('.story-note').length, pics: d.querySelectorAll('canvas.story-pic').length, texts: [].map.call(d.querySelectorAll('.story-note p'), function (x) { return x.textContent; }),
        story: saved.user.story, shells: saved.user.shells, name: saved.octopus.name, h: document.getElementById('story-h').textContent };
    });
    ok(st.n === 4 && st.pics === 4 && st.h === '게시판', '쪽지 넷 · 그림 넷');
    ok(st.texts[0] === '일손 구해요. 문어라면 누구든.' && /부탁해요/.test(st.texts[3]), '쪽지는 이야기 차례대로');
    ok(st.story.notices.help === '2026-11-01' && st.story.notices.leave === '2026-11-21' && st.story.notices.later === 'keep' && st.story.future.length === 1, '본 쪽지 저장 · 예전 값과 모르는 값은 그대로');
    ok(st.shells >= 5 && st.name === '뽈뽈', '다른 저장 값은 그대로');
    await p.evaluate(function () { APP.npcSay('goods', 'shop.hello'); });
    var b4 = await box(p), sheetTop = await p.evaluate(function () { return document.getElementById('story-sheet').getBoundingClientRect().top; });
    var geo = await p.evaluate(function () { var d = document.getElementById('story-sheet'), h = document.getElementById('story-h').getBoundingClientRect(), c = document.getElementById('story-close').getBoundingClientRect(); return { hb: h.bottom, ct: c.top }; });
    ok(!b4.hidden && b4.parent === 'story-sheet' && b4.top >= 0 && (b4.bottom <= sheetTop || (b4.top >= geo.hb && b4.bottom <= geo.ct)), '시트가 열려 있으면 그 위에, 자리가 없으면 시트 머리 아래 · 단추 위에 뜬다: ' + JSON.stringify([b4.top, b4.bottom, sheetTop, geo]));
    ok(await p.evaluate(function () { var b = document.getElementById('npc-box'), r = b.getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!e && b.contains(e); }), '시트 위에서도 누를 수 있다');
    await p.click('#story-close');
    /* 말이 떠 있는 동안 시트가 열리면 그 위로 옮겨 간다 */
    await p.evaluate(function () { APP.npcSay('cafe', 'talk'); APP.openStory(); });
    await p.waitForFunction(function () { return document.getElementById('npc-box').parentNode.id === 'story-sheet'; }, null, { timeout: 3000 }).catch(function () {});
    var b5 = await box(p); ok(!b5.hidden && b5.parent === 'story-sheet' && b5.npc.id === 'cafe', '말하는 중에 시트가 열리면 말이 시트 위로 옮겨 간다');
    await p.keyboard.press('Escape'); ok((await box(p)).hidden && await p.evaluate(function () { return document.getElementById('story-sheet').open; }), 'Esc 는 말만 닫고 시트는 둔다');
    await p.click('#story-close');
    ok(!(await p.evaluate(function () { return document.getElementById('story-sheet').open; })) && (await box(p)).hidden && b4.parent === 'story-sheet' && (await box(p)).parent === 'BODY', '시트를 닫으면 말도 접힌다');
    ok(p.errs.length === 0, '오류 없음: ' + p.errs.join(' | '));
    await p.context().close();

    /* 읽을 시간이 지나면 저절로 넘어간다 (?slow 로 시간을 줄여서 — 상태만 본다) */
    p = await open(browser, '?intro=0&slow=0.02', { save: SAVE });
    var auto = await p.evaluate(function () { return APP.npcSay('cafe', 'cafe.hello'); });
    ok(auto === true && (await box(p)).hidden, '누르지 않아도 읽을 시간이 지나면 닫힌다');
    await p.context().close();

    /* ── 3. 2D: 바깥이 없다 → 아무것도 하지 않는다 ── */
    p = await open(browser, '?intro=0&scene=2d', { save: SAVE });
    ok(await p.evaluate(function () { return APP.sceneMode; }) === '2d', '2D 장면');
    ok(await p.evaluate(function () { return APP.npcSay('clothes', 'shop.hello'); }) === false && (await box(p)).hidden, '2D 에선 npcSay 가 아무것도 안 보인다');
    await p.click('#btn-npc-clothes', { force: true }); ok((await box(p)).hidden, '2D 에선 단추를 눌러도 조용하다');
    ok(await p.evaluate(function () { return APP.openStory(); }) === false && !(await p.evaluate(function () { return document.getElementById('story-sheet').open; })), '2D 에선 게시판도 안 열린다');
    ok(p.errs.length === 0, '2D 오류 없음: ' + p.errs.join(' | '));
    await p.context().close();

    /* ── 4. 처음 세 줄 ── */
    var LINES = ['도시의 회사에 다녔어. 나만 빼고 다 똑똑한 문어였고, 다들 아주 열심히 일했어.', '나는 지쳐서, 조용한 바닷가 마을로 왔어.', '다락에 올라가 보니, 문어 하나가 깨어 있었어.'];
    function story(pg) { return pg.evaluate(function () { var e = document.getElementById('story-intro'); return { hidden: e.hidden, text: document.getElementById('story-line').textContent, name: document.getElementById('name-dialog').open, phase: INTRO.phase }; }); }
    async function toTitle(pg) { await pg.waitForFunction(function () { return INTRO.phase === 'title'; }, null, { timeout: 15000 }); }
    p = await open(browser, '?intro=1&story=1');
    await toTitle(p);
    var s0 = await story(p); ok(s0.hidden && !s0.name, '타이틀까지는 세 줄이 안 보인다');
    await p.mouse.click(180, 400);
    var s1 = await story(p); ok(!s1.hidden && s1.text === LINES[0] && !s1.name && s1.phase === 'title', '타이틀을 누르면 첫 줄 (이름 창보다 먼저)');
    ok(await p.evaluate(function () { return document.getElementById('story-line').getAttribute('aria-live') === 'polite' && !!document.getElementById('story-skip').offsetWidth; }), '낭독 · 건너뛰기 단추');
    await p.mouse.click(180, 300); ok((await story(p)).text === LINES[1], '누르면 둘째 줄');
    await p.keyboard.press('Enter'); ok((await story(p)).text === LINES[2], 'Enter 로 셋째 줄');
    await p.mouse.click(180, 300);
    await p.waitForFunction(function () { return document.getElementById('name-dialog').open; }, null, { timeout: 8000 });
    var s3 = await story(p); ok(s3.name, '세 줄 뒤에 이름 짓기');
    await p.waitForFunction(function () { return document.getElementById('story-intro').hidden; });
    ok(await p.evaluate(function () { return APP.state.user.story.intro; }) === '2026-11-21', '본 날짜를 적는다');
    ok(await p.evaluate(function () { var called = false; var shown = APP.storyIntro(function () { called = true; }); return shown === false && called && document.getElementById('story-intro').hidden; }), '다시 부르면 안 보이고 바로 넘어간다 (한 번만)');
    ok(p.errs.length === 0, '세 줄 오류 없음: ' + p.errs.join(' | '));
    await p.context().close();

    /* 건너뛰기 · Esc · 모션 감소 */
    p = await open(browser, '?intro=1&story=1'); await toTitle(p);
    var ghost = await p.evaluate(function () { INTRO.dismiss(); document.getElementById('story-next').click(); return [document.getElementById('story-intro').hidden, document.getElementById('story-line').textContent]; });
    ok(ghost[0] === false && ghost[1] === LINES[0], '타이틀을 누른 그 손가락의 click 은 첫 줄을 넘기지 않는다');
    ok(!(await story(p)).hidden, '첫 줄');
    await p.focus('#story-skip'); await p.keyboard.press('Enter');   /* 자판으로 건너뛰기 */
    await p.waitForFunction(function () { return document.getElementById('name-dialog').open && document.getElementById('story-intro').hidden; }, null, { timeout: 8000 });
    ok(await p.evaluate(function () { return !!APP.state.user.story.intro; }), '건너뛰어도 본 것으로 적는다');
    await p.context().close();
    p = await open(browser, '?intro=1&story=1', { reduced: true }); await toTitle(p); await p.keyboard.press('Enter');
    var sr = await story(p); ok(!sr.hidden && sr.text === LINES[0], '모션 감소 · 자판: 첫 줄이 그냥 나타난다');
    ok(await p.evaluate(function () { return getComputedStyle(document.getElementById('story-intro')).animationName === 'none'; }), '모션 감소면 나타나는 움직임이 없다');
    await p.keyboard.press('Escape');
    await p.waitForFunction(function () { return document.getElementById('name-dialog').open && document.getElementById('story-intro').hidden; }, null, { timeout: 8000 });
    ok(true, 'Esc 로 건너뛴다');
    await p.context().close();

    /* 이름이 있는 사람 · 자동화 기본값: 안 보인다 (기존 입장 검사 그대로) */
    p = await open(browser, '?intro=1&story=1', { save: SAVE }); await toTitle(p); await p.mouse.click(180, 400);
    await p.waitForFunction(function () { return INTRO.phase === 'done'; }, null, { timeout: 8000 });
    ok((await story(p)).hidden && (await story(p)).text === '', '이름을 지은 사람에겐 안 보인다');
    await p.context().close();
    p = await open(browser, '?intro=1'); await toTitle(p); await p.mouse.click(180, 400);
    await p.waitForFunction(function () { return document.getElementById('name-dialog').open; }, null, { timeout: 8000 });
    ok((await story(p)).hidden, '자동화 브라우저는 ?story=1 없이는 예전 그대로 (타이틀 → 이름 짓기)');
    await p.context().close();
  } catch (e) { fail++; console.log('  FAIL (예외) ' + (e && e.stack || e)); }
  await browser.close();
  console.log('test-npc-live: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
