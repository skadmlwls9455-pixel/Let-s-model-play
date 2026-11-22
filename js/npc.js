/* js/npc.js — 마을 문어 (11-21 7차 N 갈래 · docs/NPC.md · docs/STORY.md). 전역 NPC, DOM 없음 (node 에서도 돈다 — tools/test-npc.js).
 *
 * 마을 문어는 다락 문어와 다르다: 모델이 아니라 미리 써 둔 대본을 읽는 인물이고, 이름표에 늘 '대본' 이 붙는다 (NPC.tag).
 * 성격은 말투 · 버릇 · 하는 일로만 보인다. 마음 · 바람 · 몸 상태를 말하는 낱말은 쓰지 않는다 (tools/test-brain.js 의 CLAIM_RX · TAP_BAN 을 그대로 건다).
 * 규칙 안에서는 시계도 난수도 부르지 않는다: 날짜와 씨앗은 밖에서 받는다.
 * 말 한 줄 = 풍선 1~2개, 풍선 하나는 28자까지 (14자 두 줄).
 */
var NPC = (function () {
  'use strict';
  var LABEL = '대본';

  /* 가게 문어 셋: 이름 · 몸 색 (다락 문어의 여섯 색과 뚜렷이 다른 색) · 모자 · 말투 · 버릇 */
  var ROSTER = {
    clothes: { id: 'clothes', name: '시침', color: '#3f9c9c', hat: 'beret', shop: '옷가게',
      voice: '짧고 정확하게 말한다. 입은 옷의 소매 · 단 · 끈을 본다', habit: '치수를 눈으로 잰다' },
    goods: { id: 'goods', name: '모아', color: '#cdb94a', hat: 'apron', shop: '잡화점',
      voice: '말이 많고 같은 말을 두 번 한다. 뭐든 세고 적는다', habit: '장부와 목록에 다 적는다' },
    cafe: { id: 'cafe', name: '느루', color: '#a67c62', hat: 'cap', shop: '카페',
      voice: '느리게, 말끝을 늘여 말한다. 바다와 물때 이야기를 한다', habit: '바다 쪽을 본다' }
  };
  var KEEPERS = ['clothes', 'goods', 'cafe'];
  /* 자는 문어 넷 (색만) */
  var SLEEPERS = [
    { id: 'sleep-1', color: '#9fb5a0' }, { id: 'sleep-2', color: '#c8b89a' },
    { id: 'sleep-3', color: '#8898b0' }, { id: 'sleep-4', color: '#d0a0a0' }
  ];
  var SLEEP_SAY = '자고 있어.';   /* 자는 문어를 눌렀을 때: 집 목소리 한 줄 (문어는 말하지 않는다) */

  /* 대사. 한 갈래 = [풍선…]. {theme} · {shells} · {dish} 는 vars 에 그 값이 있을 때만 고른다 */
  var LINES = {
    clothes: {
      'shop.hello': [
        ['어서 와. 선반에 네 벌 걸어 놨어.'],
        ['왔구나. 치수는 눈으로 재 둘게.'],
        ['들어와. 단은 다 다려 놨어.']
      ],
      'shop.thanks': [
        ['조개 받았어. 접어서 줄게.'],
        ['계산 끝. 실밥은 내가 정리했어.'],
        ['네 거야. 주름 안 가게 들고 가.']
      ],
      'shop.none': [
        ['지금은 안 되겠어. 옷은 그대로 걸어 둘게.'],
        ['이번엔 넘어가자. 선반은 또 돌아와.'],
        ['괜찮아. 구경만 해도 돼.']
      ],
      'contest.open': [
        ['무대 열렸어. 입은 그대로 올라가면 돼.'],
        ['무대 조명 켰어. 구경만 해도 돼.'],
        ['옷 대회 날이야. 차례는 따로 없어.'],
        ['이번 주제는 {theme}. 옷깃부터 볼게.']
      ],
      'contest.result': [
        ['잘 봤어. 단추 줄이 반듯했어.'],
        ['끝났어. 색 맞춤을 적어 뒀어.'],
        ['무대 끝. 옷은 그대로 입고 가.'],
        ['수고했어. 조개 {shells}개 받아 가.']
      ],
      talk: [
        ['그 소매, 한 번 접으면 길이가 맞아.'],
        ['나는 지난봄에 깼어.', '깨자마자 가게 먼지부터 털었어.'],
        ['예전엔 마을 옷을 다 내가 고쳤어.', '하루에 서른 벌씩.'],
        ['옆집 문어는 바늘을 쥔 채 잠들었어.', '바늘은 내가 빼 뒀어.'],
        ['신발 끈이 한쪽만 길어. 봐 줄까.']
      ],
      /* 11-21 밤 (걸어 들어가는 가게 · 무대): 박자마다 한마디. 사실만 */
      'shop.enter': [
        ['들어와. 마네킹 넷이 입고 있어.'],
        ['어서 와. 꼬리표는 목에 달아 놨어.'],
        ['문 닫아 줘. 먼지가 옷에 앉아.']
      ],
      'shop.tryon': [
        ['입어 봐. 어깨선부터 볼게.'],
        ['소매 길이 맞네. 한 바퀴 돌아 봐.'],
        ['{item}, 단은 손 안 대도 되겠어.']
      ],
      'shop.mirror': [
        ['거울은 왼쪽이 조금 길게 보여.'],
        ['옷깃 한쪽이 접혔어. 펴고 봐.'],
        ['뒤도 봐. 솔기가 반듯해.']
      ],
      'shop.pay': [
        ['조개 받았어. 꼬리표는 내가 뗄게.'],
        ['계산 끝. 입은 채로 가도 돼.'],
        ['조개 {shells}개 맞아. 영수증 여기.']
      ],
      'shop.leave': [
        ['가는구나. 문은 내가 닫을게.'],
        ['입어 본 옷은 마네킹에 다시 입힐게.'],
        ['조심히 가. 단추 하나 풀렸어.']
      ],
      'contest.poster': [
        ['포스터는 내가 붙였어. 모서리 맞춰서.'],
        ['주말에 무대가 열려. 주제는 포스터에 있어.'],
        ['이번 주제는 {theme}. 포스터에 적었어.']
      ],
      'contest.start': [
        ['시작할게. 걷는 길은 무대 가운데야.'],
        ['심사 자리 앉았어. 줄자는 내려놨어.']
      ],
      'contest.judge': [
        ['다 봤어. 팻말 들게.'],
        ['주제 꼬리표 {n}개 맞았어. 세어 봤어.'],
        ['{n}개. 옷깃부터 신발까지 봤어.']
      ],
      'contest.podium': [
        ['단상에 서. 자리는 순서대로야.'],
        ['끝났어. 조개는 단상에서 줄게.']
      ]
    },
    goods: {
      'shop.hello': [
        ['어서 와 어서 와. 씨앗, 염료, 다 적어 놨어.'],
        ['왔네 왔어. 첫째 씨앗, 둘째 염료, 끝.'],
        ['들어와. 목록 볼래, 선반 볼래.']
      ],
      'shop.thanks': [
        ['조개 받았다. 장부에 한 줄 적는다.'],
        ['됐어 됐어. 팔린 것 칸에 동그라미.'],
        ['자, 네 거. 봉투는 세 번 접었어.']
      ],
      'shop.none': [
        ['어, 그건 안 되네. 장부엔 그대로 둘게.'],
        ['지금은 못 내줘. 목록엔 남겨 놓을게.'],
        ['괜찮아 괜찮아. 구경은 값이 없어.']
      ],
      'contest.open': [
        ['무대 열렸대. 나는 의자 열두 개 놨어.'],
        ['가도 되고 안 가도 돼. 둘 다 적어 둘게.'],
        ['옷 대회래 옷 대회. 공책 새로 꺼냈어.'],
        ['옷 대회래. 주제는 {theme}, 적어 놨어.']
      ],
      'contest.result': [
        ['다 봤어. 공책 한 쪽을 채웠어.'],
        ['박수 열 번 쳤어. 세면서 쳤어.'],
        ['끝났네 끝났어. 의자는 내가 접을게.'],
        ['끝났네. 조개 {shells}개, 세어서 줄게.']
      ],
      talk: [
        ['나는 뭐든 적어. 깬 날도 적었어.', '작년 겨울, 눈 온 날이야.'],
        ['예전엔 배가 오면 짐을 내가 다 셌어.', '상자 이백 개도 셌어.'],
        ['자는 문어는 넷이야. 아침마다 세어 봐.'],
        ['마을 사람들은 배 타고 떠났어.', '떠난 날짜도 장부에 있어.'],
        ['씨앗 서랍이 스물네 칸이야. 다 이름 붙였어.']
      ],
      'goods.enter': [
        ['어서 와 어서 와. 선반 여섯 칸, 다 채웠어.'],
        ['왔네 왔어. 저울은 영점 맞춰 놨어.'],
        ['들어와. 통은 셋, 병은 선반에 있어.']
      ],
      'shop.pay': [
        ['조개 받았다. 장부에 적는다, 한 줄.'],
        ['됐어 됐어. 거스를 것 없이 딱 맞아.'],
        ['조개 {shells}개, 세 번 셌어. 맞아.']
      ],
      'shop.leave': [
        ['가는구나. 나간 시간도 적어 둘게.'],
        ['문 닫으면 종이 울려. 한 번 울려.']
      ],
      'contest.poster': [
        ['포스터 봤어 봤어. 주제 옮겨 적었어.'],
        ['무대는 주말에 열린대. 달력에 동그라미.'],
        ['주제는 {theme}. 공책 첫 줄에 적었어.']
      ],
      'contest.start': [
        ['시작한대 시작해. 연필 깎아 놨어.'],
        ['심사표 석 장, 다 챙겼어.']
      ],
      'contest.judge': [
        ['다 적었어. 팻말 든다.'],
        ['맞은 꼬리표 {n}개. 하나씩 짚어서 셌어.'],
        ['{n}개 {n}개. 표에 적었어.']
      ],
      'contest.podium': [
        ['순서대로 서. 하나, 둘, 셋, 넷.'],
        ['조개는 봉투에 넣어 놨어. 세어서.']
      ]
    },
    cafe: {
      'cafe.hello': [
        ['어서 와… 파도가 낮은 날이야.'],
        ['왔구나… 물때가 막 바뀌었어.'],
        ['앉아… 파도 소리 들리는 자리야.']
      ],
      'cafe.serve': [
        ['다 됐어… 천천히 들어.'],
        ['여기… 김 오르는 거 보이지.'],
        ['나왔어… 잔은 따뜻하게 데워 놨어.']
      ],
      'cafe.gift': [
        ['세 번째네… 만드는 법 적어 줄게.'],
        ['쪽지 하나 줄게… 집 부엌에서도 돼.'],
        ['레시피야… 바다 보면서 적었어.'],
        ['이거 받아… {dish} 만드는 법이야.']
      ],
      'contest.open': [
        ['무대에 불이 켜졌네… 여기서도 보여.'],
        ['옷 대회 날이래… 물때도 맞네.'],
        ['가 봐도 되고… 여기 앉아 있어도 돼.'],
        ['주제는 {theme}… 나는 여기서 볼게.']
      ],
      'contest.result': [
        ['끝났구나… 그새 물이 들어왔어.'],
        ['잘 봤어… 파도도 조용했어.'],
        ['무대 불이 꺼졌네… 잔 하나 데워 둘게.'],
        ['조개 {shells}개래… 주머니에 넣어 가.']
      ],
      talk: [
        ['저 구름… 바다 쪽에서 온 거야.'],
        ['나는 여름 끝에 깼어…', '깨 보니 파도 소리만 있었어.'],
        ['예전엔 새벽 배마다 커피를 날랐어…', '하루 백 잔쯤.'],
        ['부두 밑 문어가 제일 먼저 잠들었어…', '그 뒤로 하나둘.'],
        ['물이 빠지면… 모래에 조개가 보여.']
      ],
      'cafe.order': [
        ['알았어… 물부터 올릴게.'],
        ['다 되면… 쟁반에 올려 둘게.'],
        ['{dish}… 접시부터 데울게.']
      ],
      'cafe.stamp': [
        ['도장 하나… 꾹 눌렀어.'],
        ['카드에 찍었어… 잉크는 바다색이야.'],
        ['{n}번째 도장이야… 칸은 셋이야.']
      ],
      'cafe.record': [
        ['판을 올렸구나… 바늘은 살살 내려와.'],
        ['그 판… 겉장에 모래가 묻어 있어.'],
        ['{title}… 판이 돌기 시작했어.']
      ],
      'contest.poster': [
        ['포스터가 붙었네… 여기서도 보여.'],
        ['무대는 주말에 열려… 주제는 포스터에 있어.'],
        ['주제는 {theme}… 천천히 읽어 봐.']
      ],
      'contest.start': [
        ['시작하네… 무대 불이 켜졌어.'],
        ['심사 자리에 앉았어… 팻말은 무릎에 뒀어.']
      ],
      'contest.judge': [
        ['다 봤어… 팻말 들게.'],
        ['맞은 꼬리표가… {n}개야.'],
        ['{n}개… 걸음마다 하나씩 봤어.']
      ],
      'contest.podium': [
        ['단상에 올라가… 순서대로 서면 돼.'],
        ['끝났어… 조개는 여기 있어.']
      ]
    }
  };

  /* 세계관의 흔적 (docs/STORY.md). 게시판의 낡은 쪽지 넷 (차례대로) · 처음 한 번 보는 세 줄 */
  var NOTICES = [
    { id: 'help', pic: 'help', text: '일손 구해요. 문어라면 누구든.' },
    { id: 'catch', pic: 'catch', text: '올해 풍어. 문어들 덕분입니다.' },
    { id: 'quiet', pic: 'quiet', text: '문어들이 자고 있어요. 부두 근처에선 조용히.' },
    { id: 'leave', pic: 'leave', text: '우리는 떠납니다. 오는 분, 자는 문어들을 부탁해요.' }
  ];
  var INTRO = [
    '도시의 회사에 다녔어. 나만 빼고 다 똑똑한 문어였고, 다들 아주 열심히 일했어.',
    '나는 지쳐서, 조용한 바닷가 마을로 왔어.',
    '다락에 올라가 보니, 문어 하나가 깨어 있었어.'
  ];

  function isObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
  function who(id) { return Object.prototype.hasOwnProperty.call(ROSTER, id) ? ROSTER[id] : null; }
  function tag(id) { var r = who(id); return r ? r.name + ' · ' + LABEL : ''; }   /* 이름표: 늘 '이름 · 대본' */
  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function keys(id) { var L = LINES[id]; return L ? Object.keys(L) : []; }
  function variants(id, key) { var L = LINES[id]; return L && Object.prototype.hasOwnProperty.call(L, key) ? L[key] : []; }
  function fill(s, vars) { return s.replace(/\{(\w+)\}/g, function (m, k) { return String(vars[k]); }); }
  function usable(v, vars) {   /* 빈칸이 있는 갈래는 그 값이 올 때만 */
    return v.every(function (s) { var m = s.match(/\{(\w+)\}/g) || []; return m.every(function (t) { var k = t.slice(1, -1), x = vars[k]; return (typeof x === 'string' && x !== '') || (typeof x === 'number' && isFinite(x)); }); });
  }
  /* line(id, key, vars, seed) → { id, key, name, tag, by: 'script', n(갈래 번호), bubbles: [글…] } | null (모르는 문어 · 그 문어에게 없는 열쇠) */
  function line(id, key, vars, seed) {
    var r = who(id), all = variants(id, key); if (!r || !all.length) return null;
    vars = isObj(vars) ? vars : {};
    var ok = [], i;
    for (i = 0; i < all.length; i++) if (usable(all[i], vars)) ok.push(i);
    if (!ok.length) return null;
    /* 빈칸을 채울 값이 왔으면 그 갈래를 먼저 (주제 · 조개 수를 말해 주려고 넘긴 것이니까) */
    var withVar = ok.filter(function (j) { return /\{\w+\}/.test(all[j].join('')); });
    var pool = withVar.length ? withVar : ok;
    var n = pool[(typeof seed === 'number' && isFinite(seed) ? Math.abs(Math.floor(seed)) : hash(String(seed) + id + key)) % pool.length];
    return { id: id, key: key, name: r.name, tag: tag(id), by: 'script', n: n, bubbles: all[n].map(function (s) { return fill(s, vars); }) };
  }
  /* list(dateKey) → 장면의 npcSet 에 줄 목록 (계약 C6 · C14). 날짜는 받아만 둔다 (날마다 같다 — 깬 문어 셋 · 자는 문어 넷).
     가게 문어는 장면 (V) 이 가게 앞과 그 방 안의 keeper 칸에 알아서 그린다. 자는 문어 하나 (sleep-1) 는 카페 구석 식탁에서 잔다:
     { room: 'cafe', slot: 'nap' } 를 달아 넘긴다 (그 칸을 모르는 장면은 예전 바깥 자리에 그린다) */
  var SLEEP_AT = { 'sleep-1': { room: 'cafe', slot: 'nap' } };
  function list(dateKey) {
    var out = KEEPERS.map(function (id) { var r = ROSTER[id]; return { id: id, color: r.color, hat: r.hat, pose: 'stand' }; });
    SLEEPERS.forEach(function (sl) {
      var e = { id: sl.id, color: sl.color, hat: 'none', pose: 'sleep' }, at = SLEEP_AT[sl.id];
      if (at) { e.room = at.room; e.slot = at.slot; }
      out.push(e);
    });
    return out;
  }
  /* 저장 칸 S.user.story (계약 C8): { intro: 'YYYY-MM-DD' | null, notices: { 쪽지 id: 'YYYY-MM-DD' } }. 모르는 값은 그대로 둔다 */
  function normalize(u) {
    if (!isObj(u)) return u;
    if (!isObj(u.story)) u.story = {};
    var st = u.story;
    if (!(typeof st.intro === 'string' && st.intro)) { if (st.intro !== true) st.intro = null; }
    if (!isObj(st.notices)) st.notices = {};
    return u;
  }
  function seeNotices(u, dateKey) {   /* 게시판을 열었다 → 아직 안 본 쪽지에 날짜. 새로 본 수를 돌려준다 */
    normalize(u); var n = 0;
    NOTICES.forEach(function (x) { if (!u.story.notices[x.id]) { u.story.notices[x.id] = dateKey; n++; } });
    return n;
  }
  function allText() {   /* 검사 · 문서용: 화면에 나오는 글 전부 [{ where, text }] */
    var out = [];
    KEEPERS.forEach(function (id) {
      out.push({ where: id + ' name', text: ROSTER[id].name });
      keys(id).forEach(function (k) { LINES[id][k].forEach(function (v, i) { v.forEach(function (s, j) { out.push({ where: id + ' ' + k + ' ' + i + '.' + j, text: s, npc: id }); }); }); });
    });
    NOTICES.forEach(function (x) { out.push({ where: 'notice ' + x.id, text: x.text }); });
    INTRO.forEach(function (s, i) { out.push({ where: 'intro ' + i, text: s }); });
    out.push({ where: 'sleeper', text: SLEEP_SAY });
    return out;
  }

  return {
    LABEL: LABEL, sleepAt: SLEEP_AT, roster: ROSTER, keepers: KEEPERS, sleepers: SLEEPERS, lines: LINES, notices: NOTICES, intro: INTRO, SLEEP_SAY: SLEEP_SAY,
    who: who, tag: tag, keys: keys, variants: variants, line: line, list: list, normalize: normalize, seeNotices: seeNotices, allText: allText, hash: hash
  };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = NPC;
