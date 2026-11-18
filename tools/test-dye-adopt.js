/* tools/test-dye-adopt.js — 옷 색의 옛 칸 맞추기 (js/app.js dyeMirror · dyeAdopt · load 의 미러 길) 회귀 시험 (빠름 · DOM 없음).
   물건마다 따로 물들이는 기록 (user.dyed) 이 생긴 뒤에도, 배포 전부터 열려 있던 옛 빌드 탭 (설치한 앱) 은 예전 칸 user.dye 만 고친다.
   - 저장 직전 (dyeMirror): dye = 지금 입은 옷의 색 · dyeFor = 그 옷
   - 읽은 직후 (dyeAdopt): 받은 dye 가 그 값과 다르면 옛 빌드가 물들였거나 되돌린 것 → 지금 입은 옷의 색으로 받아들인다
   11-18 (합치기 전 검증): 같은 탭 미러로 되살리는 길 (load) 은 저장이 먼저 돌아 옛 탭이 산 색이 지워졌다 · 모르는 꼴의 값은 건드리지 않는다.
   app.js 의 진짜 함수 글을 뽑아 돌린다 (app.js 는 고치지 않는다). */
'use strict';
var fs = require('fs'), path = require('path');
var SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8').split('\n');
function line(re, from) { for (var i = from || 0; i < SRC.length; i++) if (re.test(SRC[i])) return i; throw new Error('app.js 에서 못 찾음: ' + re); }
var a = line(/^  function wornOf\(cat\)/), b = line(/^  function applyDye\(\)/), l0 = line(/^  function load\(\) \{/), l1 = line(/^  \}$/, l0), sv = line(/^  function save\(\) \{/);
var code = [SRC[line(/^  function isObj\(x\)/)], SRC[line(/^  function parseState\(raw\)/)], SRC[line(/^  function seenOf\(o\)/)]].concat(SRC.slice(a, b), SRC.slice(l0, l1 + 1)).join('\n');
var pass = 0, fail = 0;
function ok(cond, label) { if (cond) { pass++; console.log('  ok   ' + label); } else { fail++; console.log('  FAIL ' + label); } }
var BLUE = '#4a86d8', RED = '#c8323a';
function rec(user, outfit, seen) { return { v: 2, settings: { lastSeen: seen || 1000, player: { outfit: outfit || 'dress' } }, user: user }; }
function world(stored, mirrored) {
  var o = { saves: [] };
  var env = {
    S: null, KEY: 'ppolppol_v2', KEY_V1: 'ppolppol_v1', lastSaved: null,
    store: { get: function (k) { return k === 'ppolppol_v2' && stored ? JSON.stringify(stored) : null; } },
    mirrorGet: function () { return mirrored ? JSON.stringify(mirrored) : null; },
    setAsideBroken: function () { return false; }, quietWarn: function () {}, migrateV1: function (x) { return x; }, defaults: function () { return rec({}); },
    normalize: function (s) { return s; },
    save: function () { o.api.dyeMirror(); o.saves.push(JSON.parse(JSON.stringify(env.S))); }   /* 진짜 save 처럼: 먼저 dyeMirror, 그다음 적는다 (아래에서 진짜 글도 본다) */
  };
  o.env = env;
  o.api = new Function('env', 'with (env) {\n' + code + '\nreturn { dyeMirror: dyeMirror, dyeAdopt: dyeAdopt, load: load }; }')(env);
  return o;
}

/* 0. 이 시험의 가짜 save 가 진짜와 같은 차례인지: 진짜 save 는 적기 전에 dyeMirror 를 부른다 */
ok(/^\s*dyeMirror\(\);/.test(SRC[sv + 2]) || /^\s*dyeMirror\(\);/.test(SRC[sv + 1]), '진짜 save() 는 적기 전에 dyeMirror() 를 부른다 (이 시험의 가짜 save 와 같은 차례)');

/* 1. 이 빌드가 쓴 기록: 저장하면 dye = 입은 옷의 색 · dyeFor = 그 옷 → 다시 읽어도 받아들일 것이 없다 */
var w = world(); w.env.S = rec({ dye: null, dyed: { outfit: { dress: BLUE }, shoes: { boot: '#4fa868' }, acc: {} } });
w.api.dyeMirror();
ok(w.env.S.user.dye === BLUE && w.env.S.user.dyeFor === 'dress', '저장 직전: 예전 칸 dye = 입은 옷 (원피스) 의 색 · dyeFor = dress');
ok(w.api.dyeAdopt() === false && w.env.S.user.dyed.outfit.dress === BLUE, '이 빌드가 쓴 기록을 다시 읽으면 바뀌는 것이 없다');

/* 2. 옛 빌드 탭이 물들임 (dye 만 빨강) → 입은 옷의 색으로 받아들인다 · 신발 색은 그대로 */
w = world(); w.env.S = rec({ dye: RED, dyeFor: 'dress', dyed: { outfit: { dress: BLUE }, shoes: { boot: '#4fa868' }, acc: {} } });
ok(w.api.dyeAdopt() === true && w.env.S.user.dyed.outfit.dress === RED && w.env.S.user.dyed.shoes.boot === '#4fa868', '옛 빌드 탭이 물들인 색 (dye 만 바뀜) 을 입은 옷의 색으로 받아들인다 · 신발은 그대로');

/* 3. 옛 빌드 탭이 원래 색으로 돌림 (dye null) → 입은 옷의 색만 지운다 */
w = world(); w.env.S = rec({ dye: null, dyeFor: 'dress', dyed: { outfit: { dress: BLUE, knit: RED }, shoes: {}, acc: {} } });
ok(w.api.dyeAdopt() === true && !('dress' in w.env.S.user.dyed.outfit) && w.env.S.user.dyed.outfit.knit === RED, "옛 빌드 탭의 '원래 색으로' 는 입은 옷의 색만 지운다 (벗어 둔 니트는 그대로)");

/* 4. 옛 빌드 탭이 옷만 갈아입음 (dye 는 그대로 원피스의 파랑) → 니트에 색이 옮겨 붙지 않는다 */
w = world(); w.env.S = rec({ dye: BLUE, dyeFor: 'dress', dyed: { outfit: { dress: BLUE }, shoes: {}, acc: {} } }, 'knit');
ok(w.api.dyeAdopt() === false && !('knit' in w.env.S.user.dyed.outfit), '옷만 갈아입은 기록은 건드리지 않는다 (벗은 옷의 색이 새 옷에 옮겨 붙지 않는다)');

/* 5. 모르는 꼴 (나중 빌드 · 손으로 고친 기록): 저장 → 다시 읽기를 거쳐도 남는다 — 예전엔 '옛 빌드가 되돌렸다' 로 읽고 지웠다 */
w = world(); w.env.S = rec({ dye: null, dyed: { outfit: { knit: 'teal', dress: 'plum' }, shoes: {}, acc: {} } }, 'knit');
w.api.dyeMirror(); var d5 = w.api.dyeAdopt();
ok(d5 === false && w.env.S.user.dyed.outfit.knit === 'teal' && w.env.S.user.dyed.outfit.dress === 'plum', '모르는 꼴의 색 값은 저장 · 다시 읽기를 거쳐도 그대로 (지우지 않는다)');
w = world(); w.env.S = rec({ dye: 'teal', dyeFor: 'dress', dyed: { outfit: { dress: BLUE }, shoes: {}, acc: {} } });
ok(w.api.dyeAdopt() === false && w.env.S.user.dyed.outfit.dress === BLUE, '예전 칸 dye 가 모르는 꼴이면 받아들이지도 지우지도 않는다');

/* 6. 같은 탭 미러로 되살리는 길 (새로고침 직후 저장소가 비었거나 뒤처져 보일 때): 옛 빌드 탭이 물들인 직후의 기록이 미러에 있다 →
      받아들인 뒤에 저장한다. 예전엔 저장 (dyeMirror) 이 먼저 돌아 빨강이 파랑으로 덮였다 (조개는 나간 채) */
var old = rec({ shells: 14, dye: RED, dyeFor: 'dress', dyed: { outfit: { dress: BLUE }, shoes: {}, acc: {} } }, 'dress', 2000);
w = world(null, old); var S6 = w.api.load();
ok(S6 === w.env.S && S6.user.dyed.outfit.dress === RED && S6.user.dye === RED && S6.user.shells === 14, '미러 길 (저장소 빔): 옛 탭이 산 빨강을 받아들인다 (옷 ' + S6.user.dyed.outfit.dress + ' · 조개 ' + S6.user.shells + ')');
ok(w.saves.length === 1 && w.saves[0].user.dyed.outfit.dress === RED && w.saves[0].user.dye === RED, '미러 길: 다시 적은 기록에도 빨강 (저장 ' + w.saves.length + '번)');
w = world(rec({ shells: 20, dye: BLUE, dyeFor: 'dress', dyed: { outfit: { dress: BLUE }, shoes: {}, acc: {} } }, 'dress', 1000), old); S6 = w.api.load();
ok(S6.user.dyed.outfit.dress === RED && S6.user.shells === 14 && w.saves.length === 1, '미러 길 (저장소가 뒤처짐): 더 새로운 미러의 빨강 · 조개 14');
/* 저장소가 더 새로우면 미러를 쓰지 않는다 (예전 그대로) — 받아들이기는 부팅 (boot 의 dyeAdopt) 이 한다 */
w = world(rec({ shells: 14, dye: RED, dyeFor: 'dress', dyed: { outfit: { dress: BLUE }, shoes: {}, acc: {} } }, 'dress', 3000), old); S6 = w.api.load();
ok(S6.settings.lastSeen === 3000 && w.saves.length === 0 && w.api.dyeAdopt() === true && S6.user.dyed.outfit.dress === RED, '저장소가 더 새로우면 그대로 읽고 (저장 0번) 부팅의 dyeAdopt 가 받아들인다');

console.log('\n' + pass + ' ok, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
