#!/usr/bin/env node
/* GPT 자료집 (ai_curiosity_library, 2026-11-09) 의 탐색 카드 → 뽈뽈 도서관 '서가 카드' (library/cards/<ID>.md)
 *
 *   node tools/import-cards.js <자료집 폴더 (data/cards.jsonl · data/sources.json 이 있는 곳)> [출력 폴더]
 *
 * 남기는 것: 사실 문장 (출처 있음) · "읽을 때 구분할 것" (과장을 막는 문장) · 출처
 * 빼는 것 (library/README '쓰지 않는 것'): 심어 둔 질문 (hook · questions · 물음표로 끝나는 문장 · 질문꼴 제목) ·
 *   GPT 가 1인칭으로 쓴 '고른 이유' · '작은 탐색' 실습 · '다른 서가로 이어 보기' (옆길 다리 글) · "~해 보자" 같은 권유 문장
 * 쓴 사람 표시는 정직하게: 조사·초안 ChatGPT, 다듬음 Claude. 사실은 바꾸지 않는다 — 문장을 빼거나 제목을 서술형으로 고칠 뿐.
 * 결과는 사람이 한 번 읽는다 (경고를 찍어 준다). 자료집 자체는 믿지 않는 입력이다: 읽기만 한다. */
'use strict';
var fs = require('fs'), path = require('path');

var src = process.argv[2];
if (!src) { console.error('usage: import-cards.js <자료집 폴더> [출력 폴더]'); process.exit(2); }
var outDir = process.argv[3] || path.join(__dirname, '..', '..', 'library', 'cards');
var BY = 'ChatGPT 조사 · Claude 다듬음', WRITTEN = '2026-11-10';

/* 질문꼴 제목 → 서술형 (뜻은 그대로). 끝에 물음표가 없어도 '~일까 · ~는가 · ~다면' 은 질문이다 */
var TITLE = {
  BIO05: '벌이 고르는 것 — 색과 ‘같음’', BIO07: '숲의 인터넷이라는 비유의 범위', BIO09: '까마귀가 보는 완성되지 않은 도구',
  BIO10: '몸의 형태를 기억하는 것, 유전자와 그 밖의 것', MATH03: '자기 자신을 출력하는 문장이 아는 것', MATH10: '계산을 되감아 쓰레기만 없애기',
  COS01: '블랙홀의 소리라는 번역', COS09: '우주 사진의 색 — 거짓과 번역 사이', COS10: '투명 망토가 투명한 상대',
  LAN03: '옆집 문자는 읽히는데 이 문자가 남은 이유', LAN04: '말을 휘파람으로 바꿀 때의 이해 방식', LAN06: '악기를 복원해도 옛 소리는 돌아오지 않는 부분',
  LAN08: '언어를 보존한다는 것 — 파일을 모으는 일과 그 너머', ART02: '분류표를 먼저 만들지 않고 만나는 디지털 생물', ART03: '규칙이 다른 존재들이 같은 세계에 사는 법',
  ART05: '나뭇가지를 문장처럼 다시 쓰기', ART08: '움직이는 법을 배우기 전에 몸을 바꾸는 설계',
  AI01: '문장 속에서 방금 배운 규칙이 머무는 곳', AI03: '내부 지도의 빈칸이 담는 정보', AI04: '자기보고를 대조하는 상대',
  AI05: '사실 하나를 바꿀 때 달라지는 주변의 말', AI06: '도서관을 빌려 쓰는 기억', AI07: '놀라운 것과 배울 만한 것의 차이',
  AI09: '안에서 연습한 세계와 바깥 세계', AI10: '80% 확신이라는 말에 들어 있는 것'
};
/* 권유·실습 문장 (몸통 안의 '작은 탐색' 흔적) */
var NUDGE = /다음 단계|해 보는|해 볼|시도해|상상해 보|떠올려|생각해 보|만들어 보|비교해 보|적어 보|두지 말고/;

function sentences(t) { return String(t).trim().split(/(?<=[.!?])\s+/).map(function (s) { return s.trim(); }).filter(Boolean); }

var cards = fs.readFileSync(path.join(src, 'data', 'cards.jsonl'), 'utf8').split('\n').filter(Boolean).map(function (l) { return JSON.parse(l); });
var sources = {};
JSON.parse(fs.readFileSync(path.join(src, 'data', 'sources.json'), 'utf8')).forEach(function (s) { sources[s.id] = s; });
fs.mkdirSync(outDir, { recursive: true });

var dropped = { q: 0, nudge: 0 }, warns = [];
cards.forEach(function (c) {
  var body = String(c.body).replace(/\[[A-Z]+-C\d+\]/g, '');          /* 주장 꼬리표 제거 */
  var keep = sentences(body).filter(function (s) {
    if (/[?？]$/.test(s)) { dropped.q++; return false; }
    if (NUDGE.test(s)) { dropped.nudge++; return false; }
    return true;
  });
  var caution = String(c.caution || '').trim();
  var text = keep.join(' ') + (caution ? '\n\n' + caution : '');
  var title = TITLE[c.id] || String(c.title).trim();
  if (/[?？]$/.test(title) || /(일까|는가|ㄹ까|을까|다면)$/.test(title)) warns.push(c.id + ': 제목이 아직 질문꼴 — ' + title);
  if (text.length > 1200) warns.push(c.id + ': ' + text.length + '자 (1200 초과)');
  if (text.length < 150) warns.push(c.id + ': ' + text.length + '자 (150 미만)');
  if (/[?？]/.test(text)) warns.push(c.id + ': 본문에 물음표가 남음');
  if (/(^|[\s"'(])(너는|너도|너의|네가|당신|여러분)/.test(text)) warns.push(c.id + ': 2인칭');
  var srcLine = (c.source_ids || []).map(function (id) {
    var s = sources[id]; if (!s) return id;
    return (s.title || id) + ' — ' + (s.publisher || '') + ', ' + s.url + (s.read_scope ? ' (열람: ' + s.read_scope + ')' : '');
  }).join(' ; ').replace(/\s+/g, ' ');
  var md = ['---', 'card: ' + c.id, 'domain: ' + c.domain, 'title: ' + title, 'by: ' + BY, 'written: ' + WRITTEN, 'sources: ' + srcLine, '---', text, ''].join('\n');
  fs.writeFileSync(path.join(outDir, c.id + '.md'), md);
});
console.log('카드 ' + cards.length + '장 → ' + outDir);
console.log('뺀 문장: 질문 ' + dropped.q + ' · 권유 ' + dropped.nudge);
warns.forEach(function (w) { console.log('⚠ ' + w); });
console.log('경고 ' + warns.length);
