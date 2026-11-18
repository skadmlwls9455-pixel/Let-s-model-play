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
  var KEY = 'k'.repeat(32), server = ['2026-11-17-1.json', '2026-11-17-2.json'], o = { stored: null, fetched: [], imported: [], firstSaves: [], remote: null, synced: 0 };
  var env = {
    S: { settings: { claudeRoom: { key: KEY, mcp: 'https://x/api/mcp/' + KEY, last: null } }, trips: [] },
    B: null, busy: false, farPending: null,
    save: function () { o.stored = JSON.stringify(env.S); },
    toast: function () {}, farAsk: function () {},
    /* 진짜 importEvents 처럼: 여행을 넣자마자 한 번 저장한다 (그 첫 저장에 꼬리표 · 자리가 같이 나가는지 본다 — firstSaves) */
    importEvents: function (evs, opt) { var t = { id: 'trip_' + env.S.trips.length, file: evs[0].walk }; if (opt && typeof opt.walk === 'string') t.walk = opt.walk; env.S.trips.push(t); env.save(); o.firstSaves.push(JSON.parse(o.stored)); o.imported.push(evs[0].walk); env.busy = true; setTimeout(function () { env.busy = false; }, 5); return true; },
    /* 저장소를 다시 읽어 다른 탭의 기록을 받는다 (진짜는 adoptRemote: S = R). o.remote 가 있으면 그것이 '다른 탭이 저장해 둔 것' */
    syncFromStore: function () { o.synced++; if (!o.remote) return false; env.S = JSON.parse(JSON.stringify(o.remote)); o.stored = JSON.stringify(env.S); o.remote = null; return true; },
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

  /* 5. (검증 11-18) storage 이벤트를 아직 못 받은 탭: 메모리의 S 는 낡았고 (여행 0 · 자리 없음) 저장소에는 다른 탭이 이미 둘을 들여 놓았다 → 저장소부터 받고, 다시 들이지 않고, 그 탭의 기록을 덮지 않는다 */
  var other = world(); other.api.claudeSync(false); await other.settle();
  var theirs = other.saved(); theirs.user = { shells: 7 };   /* 다른 탭이 그사이 번 조개 */
  w = world(); w.remote = theirs; w.api.claudeSync(false); await w.settle();
  ok(w.synced >= 1 && w.imported.length === 0 && w.files() === ALL && w.saved().user && w.saved().user.shells === 7,
    'storage 이벤트 전의 낡은 탭: 저장소의 기록부터 받는다 — 다시 들이지 않고 (들인 것 ' + w.imported.length + ') 다른 탭의 여행 · 조개가 그대로 (' + w.files() + ' · 조개 ' + (w.saved().user || {}).shells + ')');

  /* 6. 여행의 첫 저장에 꼬리표와 자리가 같이 나간다 (첫 저장 뒤 탭이 닫혀도 다음에 다시 들이지 않게) */
  w = world(); w.api.claudeSync(false); await w.settle();
  ok(w.firstSaves.length === 2 && w.firstSaves.every(function (sv, i) { var t = sv.trips[sv.trips.length - 1]; return typeof t.walk === 'string' && t.walk.indexOf(t.file) > 0 && sv.settings.claudeRoom.last === t.file; }),
    '여행의 첫 저장에 꼬리표 · 자리가 같이 있다 (' + w.firstSaves.map(function (sv) { return sv.settings.claudeRoom.last; }).join(' · ') + ')');

  console.log('\ntest-claude-sync: ' + pass + ' ok' + (fail ? ', ' + fail + ' FAIL' : ''));
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
