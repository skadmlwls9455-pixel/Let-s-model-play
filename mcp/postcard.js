/* mcp/postcard.js — MCP App '산책 엽서' (대화 안에 뜨는 작은 화면)
 *
 *   ppolppol_finish · ppolppol_stay_home 결과에 붙는다 (_meta.ui.resourceUri). 화면은 결과의 saved 파일 이름으로
 *   화면 전용 도구 ppolppol_postcard (visibility ['app'] — 모델은 이 도구를 보지 않는다) 를 불러 엽서 내용을 받는다.
 *   → 모델이 보는 도구 결과 · 토큰은 엽서가 생기기 전과 같다.
 *
 * 엽서에는 기록에 있는 사실만: 들른 곳 · 읽음 상태 · 책 (제목 · 쓴 사람) · 출처, 모델이 쓴 글 (포스터 한 줄 · 한 줄 · 반응 · 메모) 은 쓴 그대로.
 * 코드가 문어 대신 느낌을 쓰지 않는다 (MODEL_VOICE). 화면은 모든 글을 textContent 로만 넣는다 (HTML 로 해석하지 않는다).
 * 꼬리표 (읽음 · 서가 카드 · 출처 …) 는 방의 언어 (i18n.js) 로. 모델이 쓴 글은 어느 언어든 그대로.
 */
'use strict';
var fs = require('fs');
var path = require('path');
var WORLD = require('../js/world.js');
var I18N = require('./i18n.js');

var URI = 'ui://ppolppol/postcard';
var APP_VER = '1.7.5';
var STATUS = ['read', 'builtin', 'simulated', 'failed', 'none'];
var WIKI_RE = new RegExp('^https://(' + I18N.LANGS.join('|') + ')\\.wikipedia\\.org/wiki/\\S+$');

var OCT_SVG = (function () { try { return fs.readFileSync(path.join(__dirname, '..', 'assets', 'oct', 'happy.svg'), 'utf8').replace(/<\?xml[^>]*>/, ''); } catch (e) { return ''; } })();

/* 이벤트 배열 → 엽서 내용 (사실만). meta.lang: 꼬리표의 언어 */
function data(events, meta) {
  meta = meta || {};
  var L = I18N.T(meta.lang), C = L.card;
  var ev = Array.isArray(events) ? events : [];
  var peeks = ev.filter(function (e) { return e && e.type === 'peek'; });
  var home = ev.filter(function (e) { return e && e.type === 'stay_home'; })[0];
  var rem = ev.filter(function (e) { return e && e.type === 'remember'; })[0];
  var wrap = ev.filter(function (e) { return e && e.type === 'wrap_up'; })[0] || {};
  var kind = peeks.length ? 'out' : home ? 'home' : ev.some(function (e) { return e && e.type === 'empty_turn'; }) ? 'empty' : 'out';
  var card = { kind: kind, name: meta.name || null, date: meta.date || null, stops: [] };
  peeks.forEach(function (p) {
    var t = p.target || {}, node = t.id && WORLD.nodes[t.id];
    var s = { title: String(t.title || (node && node.name) || t.url || C.somewhere).slice(0, 80), status: STATUS.indexOf(p.status) >= 0 ? p.status : 'failed' };
    s.label = p.book ? (p.book.card ? C.shelfCard : C.roomBook) : C.status[s.status];
    if (p.book && p.book.title) s.book = { title: String(p.book.title).slice(0, 160), by: String(p.book.by || '').slice(0, 120) };   /* 번역본은 제목 107자 · 옮긴 이 표기 77자까지 간다 (11-10). 전의 40 · 30 은 ko 만 보고 잡은 값이라 번역본의 '옮긴 이' 가 중간에 잘렸다 */
    if (p.status === 'read' && p.source && WIKI_RE.test(p.source.url || '')) s.source = { url: p.source.url, label: p.source.attribution || 'Wikipedia' };
    if (typeof p.note === 'string' && p.note) s.note = p.note;
    card.stops.push(s);
  });
  if (home) {
    var act = (WORLD.homeActivities || []).filter(function (a) { return a.id === home.activity; })[0];
    var tr = act && L.home && L.home[act.id];
    card.home = act ? (tr && typeof tr.memo === 'string' ? tr.memo : act.memo) : C.homeDefault;
    if (typeof home.line === 'string' && home.line) card.homeLine = home.line;
  }
  if (rem && typeof rem.line === 'string' && rem.line) card.poster = rem.line;
  if (typeof wrap.line === 'string' && wrap.line) card.line = wrap.line;
  if (typeof wrap.reaction === 'string' && wrap.reaction) card.reaction = wrap.reaction;
  var note = wrap.note && (typeof wrap.note === 'string' ? wrap.note : wrap.note.text);
  if (typeof note === 'string' && note) card.note = note;
  return card;
}

function appScriptUrl(origin) {
  return origin ? origin.replace(/\/$/, '') + '/vendor/mcp-apps/app-with-deps-' + APP_VER + '.js'
    : 'https://unpkg.com/@modelcontextprotocol/ext-apps@' + APP_VER + '/dist/src/app-with-deps.js';
}

/* 화면 (HTML 한 장). lang 은 꼬리표의 언어 — 글은 전부 textContent 로 넣는다 */
function html(origin, lang) {
  var l = I18N.norm(lang) || 'ko', C = I18N.T(l).card;
  var labels = { title: C.title, loading: C.loading, by: C.by, poss: C.poss, homeDay: C.homeDay, emptyTurn: C.emptyTurn, walk: C.walk,
    quoteL: C.quoteL, quoteR: C.quoteR, wrote: C.wrote, source: C.source, memo: C.memo, reaction: C.reaction, noteLeft: C.noteLeft, fail: C.fail };
  return '<!DOCTYPE html><html lang="' + l + '"><head><meta charset="utf-8"><meta name="color-scheme" content="light dark"><title>' + C.title + '</title><style>' +
    ':root{--bg:#f6efe2;--ink:#3b2a20;--muted:#8a7464;--rim:#d8c6ad;--chip:#efe2cc;--accent:#c8553d}' +
    '@media (prefers-color-scheme:dark){:root{--bg:#2a211c;--ink:#f1e6d6;--muted:#b9a58f;--rim:#4a3a30;--chip:#3a2e26;--accent:#e58a6f}}' +
    'body{margin:0;padding:12px;background:var(--bg);color:var(--ink);font:14px/1.55 system-ui,-apple-system,"Apple SD Gothic Neo","Noto Sans KR","Hiragino Sans","Noto Sans JP",sans-serif}' +
    '.card{border:2px solid var(--rim);border-radius:12px;padding:12px 14px;max-width:520px}' +
    '.top{display:flex;gap:10px;align-items:center}.top svg{width:44px;height:44px;flex:none;image-rendering:pixelated}' +
    'h1{font-size:15px;margin:0}.date{color:var(--muted);font-size:12px}' +
    'ol{margin:10px 0 0;padding-left:20px}li{margin:6px 0}.st{display:inline-block;font-size:11px;padding:1px 6px;border-radius:8px;background:var(--chip);color:var(--muted);margin-left:4px}' +
    '.sub{color:var(--muted);font-size:12px}.poster{margin:12px 0 4px;padding:8px 10px;border-left:3px solid var(--accent);background:var(--chip);border-radius:6px}' +
    '.kv{font-size:13px;margin:4px 0}.kv b{color:var(--muted);font-weight:500;margin-right:6px}.by{color:var(--muted);font-size:11px;margin-top:10px}' +
    'a{color:var(--accent)}#wait{color:var(--muted)}' +
    '</style></head><body><div class="card"><div class="top">' + OCT_SVG + '<div><h1 id="h"></h1><div class="date" id="date"></div></div></div>' +
    '<div id="wait"></div><div id="body" hidden></div>' +
    '<div class="by" id="by"></div></div>' +
    '<script type="module">' +
    'import { App } from ' + JSON.stringify(appScriptUrl(origin)) + ';' +
    'const L=' + JSON.stringify(labels) + ';' +
    'const $=(id)=>document.getElementById(id);' +
    'const el=(t,cls,txt)=>{const e=document.createElement(t);if(cls)e.className=cls;if(txt!=null)e.textContent=String(txt);return e;};' +
    '$("h").textContent=L.title;$("wait").textContent=L.loading;$("by").textContent=L.by;' +
    'const app=new App({name:"ppolppol-postcard",version:"1.0.0"});' +
    'let shown=false;' +
    'function draw(c){if(!c||typeof c!=="object")return;shown=true;$("wait").hidden=true;const b=$("body");b.replaceChildren();b.hidden=false;' +
    '$("h").textContent=(c.name?c.name+L.poss:"")+(c.kind==="home"?L.homeDay:c.kind==="empty"?L.emptyTurn:L.walk);$("date").textContent=c.date||"";' +
    'if(c.kind==="home"){b.append(el("div","kv",c.home||""));if(c.homeLine)b.append(el("div","poster",c.homeLine));}' +
    'if(c.stops&&c.stops.length){const ol=el("ol");for(const s of c.stops){const li=el("li");li.append(el("span","",s.title),el("span","st",s.label));' +
    'if(s.book)li.append(el("div","sub",L.quoteL+s.book.title+L.quoteR+" · "+s.book.by+L.wrote));' +
    'if(s.source){const a=el("a","sub",s.source.label);a.href=s.source.url;a.onclick=(e)=>{e.preventDefault();if(app.openLink)app.openLink({url:s.source.url});};const d=el("div","sub");d.append(L.source,a);li.append(d);}' +
    'if(s.note)li.append(el("div","sub",L.memo+s.note));ol.append(li);}b.append(ol);}' +
    'if(c.poster)b.append(el("div","poster",c.poster));' +
    'if(c.line&&c.line!==c.poster)b.append(el("div","kv",c.line));' +
    'if(c.reaction){const k=el("div","kv");k.append(el("b","",L.reaction),c.reaction);b.append(k);}' +
    'if(c.note){const k=el("div","kv");k.append(el("b","",L.noteLeft),c.note);b.append(k);}}' +
    'async function load(file){try{const r=await app.callServerTool({name:"ppolppol_postcard",arguments:file?{file}:{}});draw(r&&r.structuredContent);}catch(e){$("wait").textContent=L.fail;}}' +
    'app.ontoolresult=(r)=>{let f=null;try{const t=r&&r.content&&r.content[0]&&r.content[0].text;const j=t?JSON.parse(t):null;f=j&&j.saved?String(j.saved).split("/").pop():null;}catch(e){}if(!shown)load(f);};' +
    'await app.connect();' +
    '</script></body></html>';
}

module.exports = { URI: URI, APP_VER: APP_VER, data: data, html: html, appScriptUrl: appScriptUrl };
