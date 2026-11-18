/* tools/test-claude-sync.js — 모델 산책 받아 오기 (js/app.js claudeSync) 회귀 시험 (빠름 · DOM 없음 · 네트워크 없음).
   11-18 주인: "새 주제인데 이전 포스터랑 그대로 출력되어서 저장되는 경우" — 게임이 탭 둘 (탭 + 설치한 앱) 에 열려 있으면
   받아 오는 사이 다른 탭의 저장이 S 를 통째로 바꿔 (adoptRemote: S = R), 예전 코드는 버려진 객체에 '어디까지 받았나' 를 적었다 → 같은 산책을 또 받아 같은 포스터가 한 번 더 저장됐다.
   app.js 의 진짜 claudeRoom · claudeSync 글을 뽑아 가짜 fetch · importEvents 로 돌린다 (app.js 는 고치지 않는다). */
'use strict';
var fs = require('fs'), path = require('path');
var SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8').split('\n');
function line(re) { for (var i = 0; i < SRC.length; i++) if (re.test(SRC[i])) return i; throw new Error('app.js 에서 못 찾음: ' + re); }
var a = line(/^  var CLAUDE_KEY_RE = /), b = line(/^  function claudeRoom\(\)/), c = line(/^  var claudeSyncing = false;/), d = line(/^  \/\* ── 문어 선물 상자/);
var code = [SRC[a], SRC[b]].concat(SRC.slice(c, d)).join('\n');
var pass = 0, fail = 0;
function ok(cond, label) { if (cond) { pass++; console.log('  ok   ' + label); } else { fail++; console.log('  FAIL ' + label); } }

function world() {
  var KEY = 'k'.repeat(32), server = ['2026-11-17-1.json', '2026-11-17-2.json'], o = { stored: null, fetched: [], imported: [] };
  var env = {
    S: { settings: { claudeRoom: { key: KEY, mcp: 'https://x/api/mcp/' + KEY, last: null } }, trips: [] },
    B: null, busy: false, farPending: null,
    save: function () { o.stored = JSON.stringify(env.S); },
    toast: function () {}, farAsk: function () {},
    importEvents: function (evs) { env.S.trips.push({ id: 'trip_' + env.S.trips.length, file: evs[0].walk }); o.imported.push(evs[0].walk); env.busy = true; setTimeout(function () { env.busy = false; }, 5); return true; },
    setTimeout: function (f, ms) { return setTimeout(f, Math.min(ms, 10)); },   /* 700 ms 기다림 → 10 ms */
    fetch: function (url) {
      var m = /after=([^&]+)/.exec(url), after = m ? decodeURIComponent(m[1]) : null; o.fetched.push(after);
      var names = server.filter(function (n) { return !after || n > after; });
      return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ ok: true, walks: names.map(function (n) { return { file: n, events: [{ type: 'depart', walk: n }] }; }), more: false, far: { state: 'closed' } }); } });
    },
    encodeURIComponent: encodeURIComponent
  };
  o.env = env;
  o.api = new Function('env', 'with (env) {\n' + code + '\nreturn { claudeSync: claudeSync, syncing: function () { return claudeSyncing; } }; }')(env);
  o.settle = function () { return new Promise(function (res) { (function w() { if (o.api.syncing() || env.busy) return setTimeout(w, 5); res(); })(); }); };
  o.saved = function () { return JSON.parse(o.stored); };
  o.files = function () { return o.saved().trips.map(function (t) { return t.file; }).join(','); };
  return o;
}
var ALL = '2026-11-17-1.json,2026-11-17-2.json';

(async function () {
  /* 1. 탭 하나: 산책 둘을 한 번씩 들이고, 다음 동기화는 아무것도 다시 들이지 않는다 */
  var w = world(); w.api.claudeSync(false); await w.settle();
  var cur1 = w.saved().settings.claudeRoom.last; w.api.claudeSync(false); await w.settle();
  ok(w.imported.join() === ALL && w.files() === ALL && cur1 === '2026-11-17-2.json' && w.fetched[1] === '2026-11-17-2.json', '탭 하나: 산책 둘을 한 번씩 · 저장된 자리 = 마지막 파일 (' + cur1 + ') · 다음엔 그 뒤부터 묻는다');

  /* 2. 받아 오는 사이 다른 탭이 저장 (S 가 새 객체로 바뀜) — 예전엔 자리가 버려진 객체에 적혀 다음 동기화가 둘을 또 들였다 */
  w = world(); w.api.claudeSync(false); w.env.S = JSON.parse(JSON.stringify(w.env.S)); await w.settle();
  cur1 = w.saved().settings.claudeRoom.last; w.api.claudeSync(false); await w.settle();
  ok(cur1 === '2026-11-17-2.json', '다른 탭이 중간에 저장해도: 자리가 지금의 저장에 적힌다 (' + cur1 + ')');
  ok(w.imported.join() === ALL && w.files() === ALL, '다른 탭이 중간에 저장해도: 같은 산책을 다시 들이지 않는다 (들인 것 ' + w.imported.length + ' · 저장된 여행 ' + w.saved().trips.length + ')');

  /* 3. 자리를 잃어도 (두 탭이 같은 목록을 받음 · 옛 저장을 불러옴) 이미 들어온 산책 파일은 다시 재생하지 않는다 */
  w = world(); w.api.claudeSync(false); await w.settle();
  w.env.S.settings.claudeRoom.last = null; w.api.claudeSync(false); await w.settle();
  ok(w.imported.join() === ALL && w.files() === ALL && w.saved().settings.claudeRoom.last === '2026-11-17-2.json', '자리를 잃어도: 꼬리표가 있는 산책은 건너뛰고 자리만 다시 맞춘다 (들인 것 ' + w.imported.length + ')');
  ok(w.saved().trips.every(function (t) { return typeof t.walk === 'string' && t.walk.indexOf(t.file) > 0 && t.walk.indexOf('k'.repeat(32)) < 0; }), '여행의 walk 꼬리표: 파일 이름이 들어 있고 방 열쇠는 들어 있지 않다');

  /* 4. 받는 사이 연결이 다른 방으로 바뀌었으면 그 산책을 들이지 않는다 */
  w = world(); w.api.claudeSync(false); w.env.S = JSON.parse(JSON.stringify(w.env.S)); w.env.S.settings.claudeRoom.key = 'z'.repeat(32); await w.settle();
  ok(w.imported.length === 0, '받는 사이 방이 바뀌면 들이지 않는다 (들인 것 ' + w.imported.length + ')');

  console.log('\ntest-claude-sync: ' + pass + ' ok' + (fail ? ', ' + fail + ' FAIL' : ''));
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
