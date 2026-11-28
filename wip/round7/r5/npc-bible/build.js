/* bible-src/build.js — cast.js + prose.md → ../bible.md. node bible-src/build.js (검사를 먼저 돌리고, 실패가 있으면 문서를 만들지 않는다) */
'use strict';
var fs = require('fs'), path = require('path');
var DIR = __dirname, R4 = path.join(DIR, '..', '..', '..', '..');
var CAST = require('./cast.js'), RES = require('./check.js'), NPC0 = require(path.join(R4, 'js', 'npc.js'));
if (RES.fail) { console.log('검사 실패 ' + RES.fail + ' — 문서를 만들지 않는다'); process.exit(1); }
var HAT = { none: '없음', beret: '베레', apron: '앞치마', cap: '캡 (우편 모자)', pencil: '연필 꽂은 머리 (새)', toque: '구름 모자 (새)', rope: '밧줄 머리띠 (새)', combs: '빗 셋 꽂은 머리 (새)' };
var PROP = { tape: '줄자', mug: '김 나는 잔', satchel: '편지 가방', hammer: '망치', pebble: '줄무늬 돌' };
function q(b) { return '「' + b.join(' / ') + '」'; }
function pct(x) { return Math.round(x * 100) + ' %'; }

/* 2. 한눈에 */
var glance = ['| 이름 · id | 한 줄 | 키워드 셋 | 머리 | 버릇 말 |', '|---|---|---|---|---|'].concat(CAST.map(function (c) {
  return '| **' + c.name + '** `' + c.id + '`' + (c.was !== c.name ? ' (지금 ' + c.was + ')' : '') + ' | ' + c.oneLine + ' | ' + c.keywords.join(' · ') + ' | ' + HAT[c.hat] + ' | ' + c.tic + ' |';
})).join('\n');

/* 4. 시트 */
var sheets = CAST.map(function (c, i) {
  var o = [];
  o.push('### 4.' + (i + 1) + ' ' + c.name + ' `' + c.id + '` — ' + c.role, '');
  o.push('| 칸 | 내용 |', '|---|---|');
  o.push('| 이름 | **' + c.name + '**' + (c.was !== c.name ? ' (지금 이름 ' + c.was + ' — 바꾸는 까닭은 10절)' : ' (그대로)') + ' · 이름표 `' + c.name + ' · 대본` · 몸 색 `' + c.color + '` (그대로) |');
  o.push('| 모자 | `' + c.hat + '` ' + HAT[c.hat] + (c.hat !== c.hatWas ? ' — 지금 `' + c.hatWas + '` 에서 바꿈' : ' — 그대로') + (c.prop ? ' · 손 소품 (둘째 차례) `' + c.prop + '` ' + PROP[c.prop] : '') + ' |');
  o.push('| 한 줄 | ' + c.oneLine + ' |');
  o.push('| 입덕 포인트 | ' + c.hook + ' |');
  o.push('| 키워드 셋 | ' + c.keywords.join(' · ') + ' |');
  o.push('| 말투 · 끝맺음 | ' + c.ending + ' |');
  o.push('| 말투 · 박자 | ' + c.rhythm + ' |');
  o.push('| 말투 · 버릇 말 | ' + c.tic + ' |');
  o.push('| 행동 | 버릇: ' + c.habit + '<br>가만히 있을 때: ' + c.idle + '<br>누르면: ' + c.tap + '<br>서는 꼴: ' + c.spot + '<br>수 버릇: ' + c.number + ' · 감각: ' + c.sense + ' |');
  o.push('| 결핍 | ' + c.lack + ' |');
  o.push('| 꿈 | ' + c.dream + ' |');
  o.push('| 반전 | ' + c.gap + ' |');
  o.push('| 관계 | ' + c.relations.join('<br>') + ' |');
  var n = Object.keys(c.lines).reduce(function (s, k) { return s + c.lines[k].length; }, 0);
  o.push('', '**대사 — 새 대본 ' + n + '줄 (`LINES[\'' + c.id + '\']` 에 그대로)**', '', '| 열쇠 | 갈래 (적힌 차례대로 돈다) |', '|---|---|');
  Object.keys(c.lines).forEach(function (k) { o.push('| `' + k + '` | ' + c.lines[k].map(q).join('<br>') + ' |'); });
  o.push('', '**친밀도 씨앗 셋 — 나중 물결 (지금은 구현하지 않는다 · 저장은 `S.user.story` 아래)**', '');
  c.affinity.forEach(function (a, j) {
    var ls = c.extra.filter(function (x) { return x.seed === j + 1; });
    o.push((j + 1) + '. ' + a + (ls.length ? '<br>줄: ' + ls.map(function (x) { return (x.give ? '(' + x.give + '에게 주는 쪽에서) ' : '') + q(x.b); }).join(' · ') : ''));
  });
  return o.join('\n');
}).join('\n\n');

/* 5. 겹침 */
var COLS = [['키워드 1', function (c) { return c.keywords[0]; }], ['키워드 2', function (c) { return c.keywords[1]; }], ['키워드 3', function (c) { return c.keywords[2]; }],
  ['끝맺음', function (c) { return c.ending; }], ['버릇 말', function (c) { return c.tic; }], ['박자', function (c) { return c.rhythm; }], ['수 버릇', function (c) { return c.number; }], ['감각', function (c) { return c.sense; }],
  ['버릇 행동', function (c) { return c.habit; }], ['가만히 있을 때', function (c) { return c.idle; }], ['누르면', function (c) { return c.tap; }], ['머리', function (c) { return '`' + c.hat + '`'; }],
  ['결핍 (물건)', function (c) { return c.lack.split(/[.(]/)[0]; }], ['꿈 (물건)', function (c) { return c.dream.split(/[.(]/)[0]; }]];
var columns = ['| 칸 | ' + CAST.map(function (c) { return c.name; }).join(' | ') + ' |', '|---|' + CAST.map(function () { return '---'; }).join('|') + '|'].concat(COLS.map(function (col) {
  return '| **' + col[0] + '** | ' + CAST.map(function (c) { return col[1](c); }).join(' | ') + ' |';
})).join('\n');
function same(a, b, col, k) { var x = col[1](a), y = col[1](b); return x === y || (k < 3 && x.slice(0, 2) === y.slice(0, 2)); }
var worst = 0;
var kwAll = function (c) { return c.keywords; };
var matrix = ['|  | ' + CAST.map(function (c) { return c.name; }).join(' | ') + ' |', '|---|' + CAST.map(function () { return '---'; }).join('|') + '|'].concat(CAST.map(function (a) {
  return '| **' + a.name + '** | ' + CAST.map(function (b) {
    if (a === b) return '·';
    var n = COLS.filter(function (col, k) { return same(a, b, col, k); }).length;
    kwAll(a).forEach(function (x) { kwAll(b).forEach(function (y) { if (x === y || x.slice(0, 2) === y.slice(0, 2)) n++; }); });   /* 키워드는 칸을 가리지 않고 스물넷 낱말끼리도 */
    if (n > worst) worst = n; return String(n);
  }).join(' | ') + ' |';
})).join('\n');
if (worst) { console.log('겹침 표에 같은 값이 있다 (' + worst + ')'); process.exit(1); }
matrix += '\n\n스물여덟 짝 모두 0 이다 (`bible-src/build.js` 가 `cast.js` 의 값으로 센다). 머리 (`hat`) 여덟도 모두 다르다.';
var st = {}; RES.stats.forEach(function (s) { st[s.id] = s; });
var stats = ['| 문어 | 줄 (대본 + 씨앗) | 풍선 / 줄 | 글자 / 풍선 | 글자 / 줄 | 문장 / 풍선 | 말버릇이 든 줄 | 수가 든 줄 | 제 표지가 걸리는 줄 |', '|---|---|---|---|---|---|---|---|---|'].concat(CAST.map(function (c) {
  var s = st[c.id];
  return '| ' + c.name + ' | ' + s.lines + ' (' + s.script + ' + ' + (s.lines - s.script) + ') | ' + s.bubblesPerLine.toFixed(2) + ' | ' + s.charsPerBubble.toFixed(1) + ' | ' + s.charsPerLine.toFixed(1) + ' | ' + s.sentPerBubble.toFixed(2) + ' | ' + pct(s.tic) + ' | ' + pct(s.num) + ' | ' + RES.blind[c.name] + ' |';
})).join('\n');

/* 7. REWRITE LIST */
var NOT_CALLED = { clothes: ['contest.poster'], goods: ['shop.leave', 'contest.open', 'contest.result', 'contest.start', 'contest.podium', 'contest.poster'], cafe: ['contest.open', 'contest.result', 'contest.start', 'contest.podium', 'contest.poster'] };
var KEYNOTE = {
  'contest.judge': '값 든 갈래마다 제가 센 것의 이름 + `{n}개` (시험)', 'contest.result': '값 든 갈래에 `{shells}개` (시험)', 'shop.pay': '값 든 갈래에 `{shells}개`', 'salon.short': '`{need}개` 갈래 하나 (시험)',
  'shop.hello': '방이 없을 때의 시트 뒷길', 'shop.thanks': '방이 없을 때의 시트 뒷길', 'shop.none': '시트 뒷길 · 내놓을 물건이 없을 때 (`shopStock` 이 빈 때) — 조개가 모자란다는 말이 아니다', 'home.first': '스스로 이름을 대는 줄 (두 갈래 모두 이름이 든다 · 저녁 집 안에서도 불릴 수 있어 낮 자리를 말하지 않는다) — 「처음 … 나는 ○○. ○○ 집.」 틀을 버림', 'home.again': '그날 처음 다시 만남 — 「또 봤네 · 너구나」 틀을 버림', 'home.in': '저녁 집 안 — 「저녁엔 ○○을 ○○.」 틀은 토리의 한 줄뿐 (넷이 같은 첫말로 시작하지 않게)',
  'salon.pick': '`{color}` 는 색 이름 그대로 (소라가 색 이름을 지어 말하지 않는다)', 'cafe.gift': '`{dish}` · 세 번째 손님일 때', 'contest.open': '`{theme}` 갈래 하나', 'contest.poster': '`{theme}` 갈래 하나', 'shop.tryon': '`{item}` 갈래 하나', 'cafe.order': '`{dish}` 갈래 하나', 'cafe.stamp': '`{n}` 갈래 하나', 'cafe.record': '`{title}` 갈래 하나'
};
var VOICE = {
  clothes: '「-어 · -ㄹ게」 를 모두 한다체 「-다.」 로. 뒷정리 약속 (「내가 뗄게」) 은 한 일로 (「뗐다」). 판정 줄 첫말 「흠.」, 무대 줄 (`contest.*`) 첫말 「자,」. 치수는 치 · 푼 · 자. 권유 (「입어 봐」) 는 쓰지 않는다 — 시킴말은 소라 것.',
  goods: '한다체 (「적는다 · 든다」) 와 들은 말 「-대 · -래」 를 뺀다 (시침 · 토리 것). 되풀이를 `talk` 에도 넣고, 수는 끝자리까지. 「적어 뒀어」 대신 센 수를 말한다. 말줄임표 없음.',
  cafe: '「…」 는 줄의 3분의 2쯤에만. 끝을 「-는데 · -고」 로 흐리고, 둘째 풍선은 구름으로 샌다. 물때 · 파도 낱말을 구름으로 바꾼다. 「-해도 되고」 허락은 느루만.',
  'sleep-1': '물음표 퀴즈와 세기를 버린다 (세기는 모아 것). 첫말 「있잖아,」, 끝 「-대 · -래」, 제 얘기는 「그건 내 얘기야.」 로 받는다. 늘 풍선 둘.',
  'sleep-2': '모든 줄의 「툭.」 을 절반 남짓으로 줄이고 툭 · 통 · 쿵 셋으로 나눈다. 권유 (「두드려 봐」) 를 뺀다. 한 일만 「-었어.」 로, 세 토막.',
  'sleep-3': '이름 조약 → 몽돌. 「…」 와 물때 낱말을 뺀다 (느루 것이었다). 움직씨 없이 이름씨로 끊고 색 이름을 늘어놓는다. 권유 (「파 봐」) 를 뺀다.',
  'sleep-4': '이름 그물 → 뱃고동. 숫자 (기둥 스무 개 · 여섯 척 · 여덟 바퀴 · 코 백 개) 를 크기 견줌으로 바꾼다. 끝을 「-지.」 로, 「어이.」 는 절반 안팎, 늘 풍선 둘. 「알려 줄까」 물음을 뺀다.',
  stylist: '시킴말 + 쉼표로 잇는 손 순서 + 「끝.」. 손이 하는 일만 「-ㄹ게」. 「이번엔 넘어가자」 (시침과 같던 줄) · 숫자 (병 열두 개) · 칭찬 말을 뺀다. 색 이름은 `{color}` 로만.'
};
var rewrite = CAST.map(function (c) {
  var o = ['### ' + c.name + ' `' + c.id + '`' + (c.was !== c.name ? ' (지금 ' + c.was + ')' : ''), '', '바꾸는 방향: ' + VOICE[c.id], '', '| 열쇠 | 지금 불리나 | 갈래 (지금 → 새) | 지금 첫 갈래 | 새 첫 갈래 | 메모 |', '|---|---|---|---|---|---|'];
  NPC0.keys(c.id).forEach(function (k) {
    var old = NPC0.variants(c.id, k), nw = c.lines[k], nc = (NOT_CALLED[c.id] || []).indexOf(k) >= 0;
    o.push('| `' + k + '` | ' + (nc ? '아니오 (열쇠는 시험이 요구)' : '예') + ' | ' + old.length + ' → ' + nw.length + ' | ' + q(old[0]) + ' | ' + q(nw[0]) + ' | ' + (KEYNOTE[k] || '') + ' |');
  });
  return o.join('\n');
}).join('\n\n');
var nKeys = CAST.reduce(function (n, c) { return n + Object.keys(c.lines).length; }, 0), nVar = CAST.reduce(function (n, c) { return n + Object.keys(c.lines).reduce(function (s, k) { return s + c.lines[k].length; }, 0); }, 0);
rewrite = '열쇠 ' + nKeys + '개 · 갈래 ' + nVar + '줄 (지금 ' + CAST.reduce(function (n, c) { return n + NPC0.keys(c.id).reduce(function (s, k) { return s + NPC0.variants(c.id, k).length; }, 0); }, 0) + '줄) 을 모두 다시 쓴다. 「지금 불리나」 는 감사 (`audit.md`) 와 `r4/js/app.js` 를 본 것이다 (미용실 열쇠는 `r4` 에서 묶였다).\n\n' + rewrite;

/* 9. 검사 */
var check = [
  '- 줄 ' + RES.total + '개 (대본 ' + nVar + ' + 씨앗 ' + (RES.total - nVar) + ') 를 풍선마다 건다: `CLAIM_RX` · `TAP_BAN` (`r4/tools/test-brain.js` 에서 글자 그대로 읽음) · `PRESS_RX` · `MODEL_RX` (`r4/tools/test-npc.js` 에서 읽음) · 이번 판의 금지 (빨리 · 놓치 · 마지막 · 꼭 와 · 또 와 · 다시 와 · 기다릴게 · 생각 · 느낌 · 모델 · 다락) · 식에 안 걸려도 뜻으로 걸리는 낱말 (걱정 · 졸려 · 꿈 · 소원 · 기억 · 예뻐 · 어울 · 부탁 · 몰라 …) · 28자 (빈칸은 넉 자로) · 풍선 1~2 · 반말 · 글자 규칙 (한글 · 숫자 · 마침표 · 쉼표 · 말줄임표 · 가운뎃점만).',
  '- 말투 표지 ' + Object.keys(RES.markShare).length + '가지가 제 문어 줄에만 나오는지 (다른 일곱의 줄에 하나라도 있으면 실패): ' + Object.keys(RES.markShare).map(function (k) { return k + ' ' + RES.markShare[k]; }).join(' · ') + '.',
  '- 말버릇 (첫 표지) 이 줄의 20~80 % 에만 붙는지 · 문어마다 줄 여덟 이상 · 같은 줄이 두 번 없는지 · 열쇠가 `r4` 와 딱 같은지.',
  '- **진짜 시험**: 새 대본 · 이름 · 모자를 `r4` 의 `NPC` 에 끼우고 (`bible-src/sandbox/`) `r4/tools/test-npc.js` 를 그대로 돌렸다. 고친 것은 시험 안 모자 목록 세 곳에 새 id 넷을 더한 것뿐이다. 결과: `' + RES.real + '`.',
  '- 합계: `bible check: ' + RES.pass + ' passed, ' + RES.fail + ' failed`.',
  '- 한계: 표지 검사는 정규식이라, 표지 없는 줄 (소금 · 몽돌의 절반쯤) 이 누구 것인지는 재지 못한다. 그 줄들은 문장 꼴과 낱말로 갈린다고 본 것이고 사람 눈으로 가린 시험은 하지 않았다. 장면 (새 머리 · 몸짓) 은 그려 보지 않았다.'
].join('\n');

var nameLines = function (nm) { var n = 0; CAST.forEach(function (c) { Object.keys(c.lines).forEach(function (k) { c.lines[k].forEach(function (v) { if (v.join(' ').indexOf(nm) >= 0) n++; }); }); }); return n; };
var out = fs.readFileSync(path.join(DIR, 'prose.md'), 'utf8')
  .replace('<!--TOTAL-->', String(RES.total)).replace('<!--TOTAL2-->', String(RES.total)).replace('<!--GLANCE-->', glance).replace('<!--SHEETS-->', sheets).replace('<!--COLUMNS-->', columns).replace('<!--MATRIX-->', matrix)
  .replace('<!--STATS-->', stats).replace('<!--REWRITE-->', rewrite).replace('<!--CHECK-->', check)
  .replace('<!--NUM-goods-->', pct(st.goods.num)).replace('<!--NUM-sleep-4-->', pct(st['sleep-4'].num))
  .replace('<!--NAMELINES-->', '대본에서 몽돌 ' + nameLines('몽돌') + '줄 · 뱃고동 ' + nameLines('뱃고동') + '줄');
if (/<!--/.test(out)) { console.log('안 채운 자리가 있다'); process.exit(1); }
fs.writeFileSync(path.join(DIR, '..', 'bible.md'), out);
/* 문서의 낫표 줄이 모두 cast.js 안에 있는지 (손으로 쓴 글 속 인용이 원본과 어긋나지 않게) */
var known = {}; CAST.forEach(function (c) { Object.keys(c.lines).forEach(function (k) { c.lines[k].forEach(function (v) { known[v.join(' / ')] = 1; v.forEach(function (s) { known[s] = 1; }); }); }); c.extra.forEach(function (x) { known[x.b.join(' / ')] = 1; x.b.forEach(function (s) { known[s] = 1; }); }); });
NPC0.allText().forEach(function (t) { known[t.text] = 1; }); Object.keys(NPC0.lines).forEach(function (id) { Object.keys(NPC0.lines[id]).forEach(function (k) { NPC0.lines[id][k].forEach(function (v) { known[v.join(' / ')] = 1; }); }); });
var stray = [], re = /「([^」]*)」/g, m, body = out.slice(0, out.indexOf('## 11. 고침 기록'));   /* 고침 기록은 옛 줄을 인용하니 뺀다 */
while ((m = re.exec(body))) { var t = m[1]; if (/[.…]$/.test(t) && !known[t]) stray.push(t); }
console.log('bible.md ' + out.split('\n').length + '줄 · 낫표 줄 가운데 원본 밖: ' + (stray.length ? stray.join(' | ') : '없음'));
