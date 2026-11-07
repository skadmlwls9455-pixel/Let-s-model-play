/* js/dialogue-stub.js - stand-in DLG: the frozen public dialogue API (card 13 API table, docs/DIALOGUE_UI.md 5.11).
 * main session owns this file; cards 14/15 load it only when window.DLG is missing; card 13's js/dialogue.js must satisfy the same table
 * (check: node tools/test-dialogue-stub.js js/dialogue.js --css css/dialogue.css --level v0).
 * Plain DOM box: no art, no typing effect, one page per line. No storage, no network, no randomness. Works from file://.
 * init(host, opts) say(line) ask(q) endAsk() hold(on) open() current() pending() + word 'dlg' in html[data-ui-busy]. */
if (!window.DLG) window.DLG = (function () {
  'use strict';
  var LABEL = { 'demo-rules': '데모 규칙', model: '모델' };
  var box, tag, txt, next, row, logBtn, dlg, list, nameFn = null;
  var queue = [], cur = null, seen = [], askItem = null, held = false, timer = null, left = 0, t0 = 0;

  function el(name, cls, css, parent) {
    var e = document.createElement(name); if (cls) e.className = cls; if (css) e.style.cssText = css; if (parent) parent.appendChild(e); return e;
  }
  function button(cls, css, parent, label) { var b = el('button', cls, css, parent); b.type = 'button'; if (label) b.setAttribute('aria-label', label); return b; }
  function busy() {   /* own word only: other words (e.g. 'guide') stay as they are */
    var root = document.documentElement, on = held || !!(dlg && dlg.open) || !!(cur && cur.ask && !cur.ended);
    var words = (root.getAttribute('data-ui-busy') || '').split(/\s+/).filter(function (w) { return w && w !== 'dlg'; });
    if (on) words.push('dlg');
    if (words.length) root.setAttribute('data-ui-busy', words.join(' ')); else root.removeAttribute('data-ui-busy');
  }
  function tagOf(l) {   /* name tag text only; l.by itself is never changed */
    if (l.voice !== 'octopus') return '';
    var src = LABEL[l.by] || String(l.by), who = nameFn ? nameFn() : '';
    if (l.by === 'model' && l.model) src += ' · ' + l.model;
    return who ? who + ' · ' + src : src;
  }
  function readMs(l) {   /* DIALOGUE_UI 5.5: 1.5 s + 65 ms per char, 2.5..6 s, octopus x1.25 (max 6 s) */
    var ms = Math.min(6000, Math.max(2500, 1500 + 65 * Array.from(String(l.text)).length));
    return l.voice === 'octopus' ? Math.min(6000, ms * 1.25) : ms;
  }
  function run() { if (held || !left || timer) return; t0 = Date.now(); timer = setTimeout(function () { timer = null; left = 0; end(cur); }, left); }
  function pause() { if (timer) { clearTimeout(timer); timer = null; left = Math.max(1, left - (Date.now() - t0)); } }

  function init(host, opts) {
    if (box) return;
    nameFn = opts && typeof opts.name === 'function' ? opts.name : null;   /* opts.portrait is accepted but not drawn (no art) */
    box = el('div', '', 'position:relative;box-sizing:border-box;min-height:112px;margin-top:12px;padding:20px 12px 8px;border:2px solid #3b2a20;' +
      'background:#fbf4e6;color:#2a1d16;font:16px/24px sans-serif;word-break:keep-all;overflow-wrap:anywhere', host || document.body);
    box.id = 'dbox'; box.setAttribute('role', 'group'); box.setAttribute('aria-label', '대사');
    tag = el('div', 'dlg-tag', 'position:absolute;left:8px;top:-11px;padding:0 6px;background:#3b2a20;color:#fbf4e6;font-size:12px;line-height:20px', box);
    txt = el('p', 'dlg-text', 'margin:0', box);
    next = button('dlg-next', 'position:absolute;left:0;top:0;width:100%;height:100%;margin:0;padding:0;background:transparent;border:0;z-index:1', box, '다음 대사');
    next.onclick = function () { if (!held && cur && !cur.ended && !cur.ask) end(cur); };
    row = el('div', 'dlg-choices', 'position:relative;z-index:2;display:flex;gap:8px;margin-top:8px', box); row.setAttribute('role', 'group');
    logBtn = button('dlg-log', 'position:absolute;right:0;top:-22px;width:44px;height:44px;z-index:2;background:transparent;border:0;font-size:20px', box, '대사 다시 보기');
    logBtn.textContent = '📜'; logBtn.setAttribute('aria-haspopup', 'dialog'); logBtn.onclick = open;
    dlg = el('dialog', '', 'padding:0;border:2px solid #3b2a20;width:calc(100% - 32px);max-width:340px', document.body);
    dlg.id = 'backlog';
    var inner = el('div', '', 'padding:12px', dlg);
    list = el('ol', '', 'margin:0 0 8px;padding-left:20px;max-height:60vh;overflow:auto', inner); list.setAttribute('role', 'log');
    var close = button('', 'min-width:44px;min-height:44px', inner);
    close.textContent = '닫기'; close.onclick = function () { dlg.close(); };
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });   /* backdrop */
    dlg.addEventListener('close', function () { busy(); logBtn.focus(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && cur && cur.ask && !cur.ended && !dlg.open && cur.cancel != null) end(cur, cur.cancel);
    });
  }
  function render() {
    list.innerHTML = '';
    seen.forEach(function (l) {
      var who = l.voice === 'user' ? '너' : tagOf(l);
      el('li', '', l.voice === 'octopus' ? 'border-left:3px solid #c98a2b;padding-left:6px' : '', list).textContent = (who ? who + ': ' : '') + l.text;
    });
    list.scrollTop = list.scrollHeight;
  }
  function show(item) {
    cur = item; seen.push(item);
    tag.textContent = tagOf(item); tag.style.display = tag.textContent ? '' : 'none';
    txt.textContent = item.text == null ? '' : item.text;
    row.innerHTML = ''; next.hidden = !!item.ask;
    if (item.ask) item.choices.forEach(function (c) {
      var b = button('dlg-choice', 'flex:1;min-height:44px', row);
      b.textContent = c.label; b.onclick = function () { end(item, c.id); };
    });
    if (item.pace === 'flow') { left = readMs(item); run(); }
    busy(); if (dlg.open) render();
  }
  function pump() { if (!held && (!cur || cur.ended) && queue.length) show(queue.shift()); }
  function end(item, val) {
    if (!item || item.ended) return;
    item.ended = true;
    if (item === cur) { pause(); left = 0; row.innerHTML = ''; next.hidden = false; }
    var i = queue.indexOf(item); if (i >= 0) queue.splice(i, 1);
    if (item === askItem) askItem = null;
    item.res(val); busy(); pump();
  }

  function say(line) {
    var l = line || {}, voice = l.voice === 'user' ? 'user' : l.voice === 'octopus' && l.by ? 'octopus' : 'house';
    if (l.text == null || l.text === '') return Promise.resolve();
    if (!box) init();
    if (voice === 'user') { seen.push({ voice: 'user', text: l.text, by: l.by }); if (dlg.open) render(); return Promise.resolve(); }
    return new Promise(function (res) {
      queue.push({ voice: voice, text: l.text, by: l.by, model: l.model, pace: l.pace === 'flow' ? 'flow' : 'wait', res: res });
      pump();
    });
  }
  function ask(q) {
    q = q || {};
    if (!box) init();
    if (askItem) end(askItem, null);
    return new Promise(function (res) {
      askItem = { ask: true, voice: q.voice === 'octopus' && q.by ? 'octopus' : 'house', text: q.text, by: q.by, model: q.model,
        choices: (q.choices || []).slice(), cancel: q.cancel, chips: !!q.chips, res: res };
      queue.push(askItem); pump();
    });
  }
  function endAsk() { if (!askItem) return false; end(askItem, null); return true; }
  function hold(on) { held = !!on; if (held) pause(); else { run(); pump(); } busy(); }   /* no box needed */
  function open() { if (!box) init(); render(); if (!dlg.open) dlg.showModal(); list.scrollTop = list.scrollHeight; busy(); }
  function current() { return cur ? { voice: cur.voice, text: cur.text, by: cur.by, page: 1, pages: 1 } : null; }
  function pending() { return queue.length; }

  return { init: init, say: say, ask: ask, endAsk: endAsk, hold: hold, open: open, current: current, pending: pending };
})();
