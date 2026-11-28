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

  /* 가게 문어 셋: 이름 · 몸 색 (다락 문어의 여섯 색과 뚜렷이 다른 색) · 모자 · 말투 · 버릇. 11-28: 말투 · 버릇은 docs/NPC_BIBLE.md 4절 (여덟이 겹치지 않게) */
  var ROSTER = {
    clothes: { id: 'clothes', name: '시침', color: '#3f9c9c', hat: 'beret', shop: '옷가게',
      voice: '첫말 「흠.」 + 옛 치수 낱말 (치 · 푼 · 자) · 한다체 「-다.」 (길다 · 접는다 · 맞다)', habit: '줄자 없이 눈으로 재고, 한 번 더 잰다' },
    goods: { id: 'goods', name: '모아', color: '#cdb94a', hat: 'apron', shop: '잡화점',
      voice: '같은 말을 두 번 + 끝자리까지 말하는 수 · 되풀이로 맺는다 (받았어 받았어 · 맞아 맞아 · 여섯 척. 여섯 척.)', habit: '소리 내어 센다 · 연필을 찾는다 (머리 위에 있다)' },
    cafe: { id: 'cafe', name: '느루', color: '#a67c62', hat: 'cap', shop: '카페',
      voice: '말줄임표 「…」 (줄의 3분의 2쯤에만) · 끝을 흐린다 「-는데…」 「-고.」 + 허락하는 「-해도 되고」', habit: '구름에 이름을 붙인다 · 잔부터 데운다' }
  };
  /* 11-24 (주인: "지금 집이 비어있는데 각 문어들이 살았으면 좋겠어"): 자던 문어 넷이 깨어 집마다 산다. id 는 예전 그대로 (sleep-1 … — 장면 · 저장이 이 이름을 쓴다).
     낮 (7~17) 엔 집 앞 · 마을의 제 자리, 저녁 (17~21) 엔 집 안 식탁, 밤 (21~7) 엔 집 안 침대에서 잔다 (자리는 장면 — V 의 VILLAGE.where). 몸 색은 자던 때 그대로 */
  ROSTER['sleep-1'] = { id: 'sleep-1', name: '토리', color: '#9fb5a0', hat: 'cap', home: '숲 길 왼쪽 집', day: '마을 문 옆 벤치',
    voice: '첫말 「있잖아,」 · 들은 말 「-대 · -래」 (제 얘기도 「-대」 로 하고 「그건 내 얘기야.」 로 받는다)', habit: '마을 문으로 들어오는 이를 맨 먼저 맞고 소식을 전한다 · 길치' };
  ROSTER['sleep-2'] = { id: 'sleep-2', name: '소금', color: '#c8b89a', hat: 'apron', home: '빈 집이던 집', day: '그 집 현관',
    voice: '소리말 꼬리 「툭.」 「통.」 「쿵.」 (줄의 절반 남짓) · 까닭 없이 한 일만 「-었어.」 (맞췄어 · 갈았어 · 깎았어)', habit: '벽 · 판자 · 문을 두드려 속을 듣는다 · 밤에 몰래 고친다' };
  ROSTER['sleep-3'] = { id: 'sleep-3', name: '몽돌', color: '#8898b0', hat: 'none', home: '광장 오른쪽 집', day: '바닷가 바위',
    voice: '색 · 결 이름을 쉼표로 늘어놓는다 (회색, 흰색, 줄무늬.) · 움직씨 없이 이름씨로 끊는다 (돌 셋. · 빈칸. · 맨 앞.)', habit: '돌을 색 차례로 줄 세운다 · 날마다 모래를 판다 · 처음 본 이는 발부터 본다' };
  ROSTER['sleep-4'] = { id: 'sleep-4', name: '뱃고동', color: '#d0a0a0', hat: 'beret', home: '숲 길 오른쪽 집', day: '부두 발치',
    voice: '첫말 「어이.」 (줄의 절반 안팎) + 크기 견줌 (고래만 한 · 광장만 한 · 산만 한) · 큰소리 「-지.」 (묶었지 · 안 풀리지 · 내 솜씨지)', habit: '손에 닿는 건 다 묶는다 · 저녁엔 리본 묶기를 연습한다' };
  /* 11-24: 마을 미용실 미용사 (미용실 방은 V · 목록과 값은 S · 새 머리 색은 P) */
  ROSTER.stylist = { id: 'stylist', name: '소라', color: '#c75c7a', hat: 'cap', shop: '미용실',
    voice: '맺음말 「끝.」 (줄의 절반 안팎) · 짧은 시킴말 (앉아. · 가만. · 거울 봐.) + 손이 하는 일 「-ㄹ게」', habit: '빗 셋을 머리에 꽂고, 꽂는 차례를 날마다 바꾼다 · 새 색은 제 다리 끝에 먼저 칠한다' };
  var KEEPERS = ['clothes', 'goods', 'cafe'];
  var RESIDENTS = ['sleep-1', 'sleep-2', 'sleep-3', 'sleep-4'];
  /* 예전 이름 (자던 문어 넷 — 색만). 지금도 같은 넷이다 */
  var SLEEPERS = [
    { id: 'sleep-1', color: '#9fb5a0' }, { id: 'sleep-2', color: '#c8b89a' },
    { id: 'sleep-3', color: '#8898b0' }, { id: 'sleep-4', color: '#d0a0a0' }
  ];
  var SLEEP_SAY = '자고 있어.';   /* 밤에 자는 문어를 눌렀을 때: 집 목소리 한 줄 (문어는 말하지 않는다) */

  /* 대사 (11-28 · docs/NPC_BIBLE.md 의 새 목소리 — 여덟이 말투 · 말버릇 · 맺음이 다 다르다). 한 갈래 = [풍선…].
     {theme} · {shells} · {dish} · {item} · {n} · {title} · {color} · {need} 는 vars 에 그 값이 있을 때만 고른다.
     말투 표지는 문어마다 제 것만 (흠. · 자, · 한다체 = 시침 / 되풀이 = 모아 / … · -는데 · -해도 되고 = 느루 / 있잖아 · -대 = 토리 / 툭 · 통 · 쿵 = 소금 /
     색 이름 = 몽돌 / 어이 · -지 · 크기 견줌 = 뱃고동 / 끝. · 시킴말 · -ㄹ게 = 소라) — tools/test-npc.js 가 다른 문어 줄로 새지 않는지 본다 */
  var LINES = {
    clothes: {
      talk: [
        ['흠. 소매가 한 치 길다. 한 번 접는다.'],
        ['두 번 재고 한 번 자른다.', '그게 이 가게 법이다.'],
        ['내 베레는 시침질만 했다.', '깬 봄부터 그대로다.'],
        ['시침은 본바느질 전에 뜨는 땀이다.', '내 이름이 거기서 왔다.'],
        ['소라는 한 번에 자른다.', '나는 두 번 잰다. 그래서 늦다.']
      ],
      'shop.hello': [['흠. 옷깃부터 본다.'], ['선반에 네 벌 걸었다. 단은 다 다렸다.'], ['손님이다. 치수는 눈으로 두 번 잰다.']],
      'shop.thanks': [['조개 받았다. 접어서 건넨다.'], ['계산 끝이다. 실밥은 다 뗐다.'], ['네 옷이다. 주름 없이 접었다.']],
      'shop.none': [['흠. 내놓을 옷이 없다. 선반을 닦는다.'], ['보는 데는 조개가 안 든다.'], ['흠. 이번엔 넘긴다. 선반은 또 돈다.']],
      'contest.open': [
        ['자, 무대가 열렸다.', '옷깃부터 신발까지 본다.'],
        ['자, 주말 무대다. 진행은 나다.', '목소리를 두 치 키운다.'],
        ['자, 조명을 켰다. 차례는 따로 없다.'],
        ['자, 이번 주제는 {theme}.', '옷깃부터 본다.']
      ],
      'contest.result': [['자, 끝이다. 단추 줄이 반듯했다.'], ['흠. 색 맞춤은 표에 남겼다.'], ['자, 무대를 닫는다. 조명도 끈다.'], ['자, 수고했다. 조개 {shells}개다.']],
      'shop.enter': [['흠. 들어온 옷부터 본다.'], ['마네킹 넷이 입고 있다.', '꼬리표는 목에 달았다.'], ['문은 닫는다. 먼지가 옷에 앉는다.']],
      'shop.tryon': [['흠. 어깨선부터 본다.'], ['흠. 왼쪽이 반 푼 처졌다.', '거울 앞에 서면 보인다.'], ['흠. 손댈 데가 없다.', '이 가게에선 드문 말이다.'], ['{item}. 눈으로 두 번 쟀다. 맞다.']],
      'shop.mirror': [['거울은 왼쪽이 한 푼 길게 보인다.'], ['흠. 옷깃 한쪽이 접혔다. 폈다.'], ['뒤도 봤다. 솔기가 반듯하다.']],
      'shop.pay': [['조개 받았다. 꼬리표는 뗐다.'], ['계산 끝이다. 영수증은 접었다.'], ['조개 {shells}개. 맞다. 꼬리표는 뗐다.']],
      'shop.leave': [['문은 내가 닫는다.'], ['입어 본 옷은 마네킹에 다시 입힌다.'], ['흠. 단추 하나가 풀렸다. 채웠다.']],
      'contest.poster': [['포스터는 모서리를 맞춰 붙였다.'], ['자, 주말에 무대가 열린다.', '주제는 포스터에 있다.'], ['자, 이번 주제는 {theme}.', '포스터에 썼다.']],
      'contest.start': [['자, 시작한다. 길은 무대 가운데다.'], ['자, 심사 자리다. 줄자는 내려놨다.']],
      'contest.judge': [['흠. 다 봤다. 팻말을 든다.'], ['흠. 주제 꼬리표 {n}개. 두 번 봤다.'], ['주제 꼬리표 {n}개다.', '옷깃부터 신발까지 봤다.']],
      'contest.podium': [['자, 단상이다. 순서대로 선다.'], ['자, 끝이다. 조개는 단상에서 건넨다.']]
    },
    goods: {
      talk: [['씨앗 스물넷, 염료 여섯. 셌어 셌어.'], ['뱃고동 말로는 백 척.', '장부엔 여섯 척. 여섯 척.'], ['깬 날은 눈 온 날.', '장부 첫 줄에 적었어 적었어.'], ['서랍 스물네 칸, 이름표 스물넷.', '맞아 맞아.']],
      'shop.hello': [['어서 와 어서 와. 씨앗 스물넷, 염료 여섯.'], ['왔네 왔어. 선반 여섯 칸, 다 셌어.'], ['손님 하나, 문 종 한 번. 맞아 맞아.']],
      'shop.thanks': [['받았어 받았어. 장부에 한 줄.'], ['됐어 됐어. 팔린 칸에 동그라미 하나.'], ['여기 여기, 네 거. 봉투는 세 번 접었어.']],
      'shop.none': [['어, 선반이 비었어 비었어.', '빈 칸 여섯, 다 셌어.'], ['이번엔 못 내줘. 목록엔 한 줄 남겨.'], ['구경 한 번, 값은 영. 영이야 영.']],
      'contest.open': [['무대 열렸어 열렸어. 의자 열두 개 놨어.'], ['옷 대회야 옷 대회.', '공책 한 권 새로 꺼냈어.'], ['조명 넷, 의자 열둘. 다 셌어 셌어.'], ['주제는 {theme}.', '첫 줄에 적었어 적었어.']],
      'contest.result': [['다 봤어 다 봤어. 공책 한 쪽 채웠어.'], ['박수 열 번 쳤어. 세면서 쳤어.'], ['끝났네 끝났어. 의자 열둘, 다 접었어.'], ['조개 {shells}개, 세 번 셌어. 맞아 맞아.']],
      'goods.enter': [['어서 와 어서 와. 선반 여섯 칸, 병 열둘.'], ['통 셋, 병 열둘, 손님 하나. 셌어 셌어.']],
      'shop.pay': [['받았어 받았어. 장부에 한 줄, 딱 한 줄.'], ['거스름 영. 딱 맞아 딱 맞아.'], ['받았어 받았어.', '조개 {shells}개, 세 번 셌어.']],
      'shop.leave': [['가네 가네. 문 종, 한 번 울렸어.'], ['나간 손님 하나. 장부에 한 줄 한 줄.']],
      'contest.poster': [['포스터 봤어 봤어.', '글자 열둘, 다 옮겨 적었어.'], ['무대는 주말이야 주말.', '달력에 동그라미 하나.'], ['주제는 {theme}. 공책 첫 줄에 적었어.']],
      'contest.start': [['시작이야 시작. 연필 두 자루 깎아 놨어.'], ['심사표 석 장, 석 장. 다 챙겼어.']],
      'contest.judge': [['다 적었어 다 적었어. 팻말 하나 들었어.'], ['주제 색 {n}개. 하나씩 짚어서 셌어.'], ['주제 색 {n}개, {n}개. 두 번 셌어.']],
      'contest.podium': [['순서대로야. 하나, 둘, 셋, 넷.'], ['조개는 봉투에 있어.', '세어서 넣었어 넣었어.']]
    },
    cafe: {
      talk: [
        ['저 구름은… 꼬리 긴 고래.', '이름은 지금 붙였고.'],
        ['구름 공책이 서른한 쪽인데.', '백 쪽까지 있고…'],
        ['갈매기랑 눈싸움하는데,', '아직 한 번도 안 졌고.'],
        ['내 잔은 없는데…', '계량컵으로 마시고.'],
        ['모아가 또 구름 탓을 하는데…', '구름은 바람 따라가고.']
      ],
      'cafe.hello': [['왔구나…', '잔은 데워 놨는데.'], ['앉아도 되고…', '서서 구름을 봐도 되고.'], ['문은 열어 놨는데…', '물은 막 올렸고.']],
      'cafe.serve': [['나왔어.', '천천히 들어도 되고.'], ['여기… 김이 구름 쪽으로 가는데.'], ['네 잔은 따뜻하게…', '내 건 식혀서 마시고.']],
      'cafe.gift': [['세 번째네.', '만드는 법은 쪽지에 있고.'], ['쪽지 하나. 구름 보면서 썼는데.'], ['레시피야…', '집 부엌에서 해도 되고.'], ['{dish} 만드는 법인데…', '쪽지에 다 있고.']],
      'contest.open': [['무대에 불이 켜졌네…', '여기서도 보이는데.'], ['옷 대회 날인데,', '구름도 무대 쪽으로 가고.'], ['가 봐도 되고…', '여기 앉아 있어도 되고.'], ['주제는 {theme}…', '나는 여기서 보고.']],
      'contest.result': [
        ['끝났구나…', '그새 구름이 둘 지나갔는데.'],
        ['다 봤는데,', '식빵 구름도 같이 봤고.'],
        ['무대 불이 꺼졌네.', '잔은 하나 데워 놨고.'],
        ['조개 {shells}개인데…', '주머니에 넣어 가도 되고.']
      ],
      'cafe.order': [['알았어…', '물부터 올리고.'], ['다 되면 쟁반에 올려 두는데.'], ['{dish}…', '물은 막 올렸고.']],
      'cafe.stamp': [['도장 하나 꾹.', '잉크는 바다색이고.'], ['카드에 찍었는데…', '조금 비뚤고.'], ['도장 {n}개째인데…', '칸은 셋이고.']],
      'cafe.record': [['판을 올렸구나…', '바늘은 살살 내려오는데.'], ['그 판, 겉장에 모래가 묻었는데.'], ['{title}…', '판이 돌기 시작했고.']],
      'contest.poster': [['포스터가 붙었네.', '여기서도 보이고.'], ['무대는 주말인데,', '주제는 포스터에 있고.'], ['주제는 {theme}…', '천천히 읽어도 되고.']],
      'contest.start': [['시작하네.', '무대 불이 켜졌고.'], ['심사 자리인데…', '팻말은 무릎에 뒀고.']],
      'contest.judge': [['다 봤는데…', '팻말은 천천히 들고.'], ['결이 같은 게…', '{n}개인데.'], ['같은 결로 모인 게 {n}개고.']],
      'contest.podium': [['단상에 올라가도 되고…', '자리는 순서대로인데.'], ['끝났는데,', '조개는 여기 있고.']]
    }
  };
  /* 11-24: 집에 사는 문어 넷 · 미용사. talk = 낮 (집 앞 · 마을) · home.first = 처음 만남 · home.again = 그날 처음 다시 만남 · home.in = 저녁 집 안 */
  LINES['sleep-1'] = {
    talk: [
      ['있잖아, 몽돌이 새 돌을 찾았대.', '창턱 맨 끝에 놨대.'],
      ['있잖아, 벤치 셋째 판자가', '밤새 저절로 고쳐졌대.'],
      ['편지는 하루 마흔 통 날랐대.', '아, 그건 내 얘기야.'],
      ['뱃고동 집 문을 또 열었대.', '그것도 내 얘기야. 내 집은 왼쪽.']
    ],
    'home.first': [['있잖아, 새 얼굴이 왔대.', '아, 너구나. 나는 토리.'], ['문으로 들어오는 건', '내가 맨 먼저 맞이해. 나는 토리.']],
    'home.again': [['있잖아, 그 얼굴이 또 왔대.', '아, 너네. 벤치 반은 비었어.'], ['있잖아, 느루 구름이 또 늘었대.', '이번엔 식빵 구름이래.'], ['소식이 셋 모였대.', '아, 모은 건 나야.']],
    'home.in': [['저녁엔 소식지를 써.', '글씨가 깨알 같아서 한 장에 넷.'], ['있잖아, 이 집에 편지 상자가 셋이래.', '아, 우리 집 얘기야.'], ['우표를 식탁에 다 펼쳐 놨대.', '그것도 내가 한 거야.']]
  };
  LINES['sleep-2'] = {
    talk: [['벽 두드렸어. 속이 찼어. 툭.'], ['문틀 맞췄어. 말은 안 했어.'], ['네모는 다 짜. 동그란 건 안 돼. 툭.'], ['못 셋 박았어. 판자 하나 붙였어. 툭.'], ['느루네 덱 판자, 밤에 갈았어. 쿵.']],
    'home.first': [['소금이야. 이 집, 내가 고쳤어. 툭.'], ['빈 집이었어. 문틀부터 맞췄어.', '소금이야.']],
    'home.again': [['경첩에 기름 쳤어. 소리 안 나.'], ['창틀 깎았어. 바람 안 새.'], ['마루 못 하나 박았어. 툭.']],
    'home.in': [['식탁 깎았어. 모서리가 여덟 나왔어. 툭.'], ['연장은 벽에 걸었어. 큰 것부터.'], ['지붕 봤어. 기와 한 장 갈았어. 쿵.']]
  };
  LINES['sleep-3'] = {
    talk: [['회색, 흰색, 줄무늬. 돌 셋.'], ['모래 구덩이. 흰색, 회색.'], ['젖은 돌. 흰색은 회색, 회색은 검정.'], ['뱃고동 소리. 바위까지.'], ['매끈한 건 앞줄. 까끌한 건 뒷줄.']],
    'home.first': [['처음 보는 발. 나는 몽돌.'], ['몽돌. 돌. 광장 오른쪽 집.']],
    'home.again': [['또 그 발.', '흰 돌, 하나 더.'], ['너. 줄무늬 돌. 저기 맨 끝.']],
    'home.in': [['창턱 돌 한 줄. 색 차례.'], ['빨강, 주황, 노랑, 초록.', '파랑 자리, 빈칸.'], ['돌 씻기. 물기 닦기. 다시 줄.']]
  };
  LINES['sleep-4'] = {
    talk: [
      ['어이. 이 매듭은 고래가 당겨도', '안 풀리지. 내가 지었지.'],
      ['배는 백 척 묶었지, 큰 배로만.', '모아 장부엔 여섯 척이지만.'],
      ['어이. 광장만 한 그물 뜨는 중이지.', '벌써 부두 반만 하지.'],
      ['매듭은 다 짓지. 리본만 못 묶지.', '리본은 자꾸 옭매듭이 되지.'],
      ['어이. 손에 닿는 건 다 묶지.', '토리 가방끈도 내가 묶었지.']
    ],
    'home.first': [['어이. 뱃고동이지, 내 이름.', '목소리가 뱃고동만 해서 붙었지.'], ['어이, 못 보던 배지. 나는 뱃고동이지.', '부두 매듭은 다 내 솜씨지.']],
    'home.again': [['어이, 너지. 부두가 다 울렸지.', '울린 건 내 목소리지.'], ['밧줄 한 타래 새로 감았지.', '산만 한 타래지.']],
    'home.in': [['리본 연습 중이지.', '묶으면 아직은 옭매듭이지.'], ['식탁이 그물투성이지.', '앉을 데는 치웠지.'], ['어이. 밧줄은 벽에 감았지.', '고래도 못 끊는 굵기지.']]
  };
  LINES.stylist = {
    talk: [['시침은 두 번 재. 나는 한 번. 끝.'], ['거울 닦고, 병 흔들고, 끝.'], ['새 색은 내 다리 끝에 먼저.', '칠하고, 말리고, 끝.'], ['병 이름은 몽돌 돌 이름 그대로.', '받아 적고, 붙이고, 끝.']],
    'salon.sit': [['앉아. 천 두를게. 가만.'], ['앉아. 빗고, 칠하고, 끝.'], ['고개 들어. 의자 올릴게.']],
    'salon.pick': [['그 병. 흔들어 쓸게.'], ['그 색. 빗질 한 번, 칠 한 번, 끝.'], ['{color}. 뚜껑 열었어. 가만.']],
    'salon.after': [['앞도 뒤도 같은 색이야. 끝.'], ['거울 봐. 끝.'], ['다 칠했어. 천 걷을게.']],
    'salon.short': [['조개가 모자라. 병은 선반에 둘게.'], ['뚜껑 닫을게. 병은 제자리.'], ['조개 {need}개 더. 병은 선반에 둘게.']],
    'salon.leave': [['문턱 있어. 발 들어.'], ['빗 꽂고, 의자 닦고, 끝.'], ['잘 가. 천은 내가 털게.']]
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

  var MUST_SAY = { 'contest.judge': 1, 'contest.result': 1, 'shop.pay': 1 };
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
    /* 수를 알려 주려고 넘긴 열쇠 (심사 · 결과 · 계산) 는 값을 말하는 갈래만. 그 밖에는 값을 말하는 갈래도 다른 갈래와 섞어 돈다 (11-22: 같은 줄만 되풀이되지 않게) */
    var withVar = ok.filter(function (j) { return /\{\w+\}/.test(all[j].join('')); });
    var pool = withVar.length && MUST_SAY[key] ? withVar : ok;
    var n = pool[(typeof seed === 'number' && isFinite(seed) ? Math.abs(Math.floor(seed)) : hash(String(seed) + id + key)) % pool.length];
    return { id: id, key: key, name: r.name, tag: tag(id), by: 'script', n: n, bubbles: all[n].map(function (s) { return fill(s, vars); }) };
  }
  /* list(dateKey, hour) → 장면의 npcSet 에 줄 목록 (계약 C6 · C14). 날짜는 받아만 둔다.
     가게 문어 셋은 장면 (V) 이 가게 앞과 그 방 안 keeper 칸에 그린다. 집에 사는 넷은 room · slot 없이 넘긴다 — 자리는 장면의 시간표 (VILLAGE.where).
     자세만 시각으로: 밤 (21~7) 엔 'sleep', 그 밖엔 'stand'. 미용사는 장면이 미용실 안에 그린다. hour 를 안 주면 낮 (12 시) */
  function phase(hour) { var h = typeof hour === 'number' && isFinite(hour) ? ((hour % 24) + 24) % 24 : 12; return h >= 21 || h < 7 ? 'night' : h >= 17 ? 'evening' : 'day'; }
  function list(dateKey, hour) {
    var ph = phase(hour);
    var out = KEEPERS.map(function (id) { var r = ROSTER[id]; return { id: id, color: r.color, hat: r.hat, pose: 'stand' }; });
    RESIDENTS.forEach(function (id) { var r = ROSTER[id]; out.push({ id: id, color: r.color, hat: r.hat, pose: ph === 'night' ? 'sleep' : 'stand' }); });
    out.push({ id: 'stylist', color: ROSTER.stylist.color, hat: ROSTER.stylist.hat, pose: 'stand' });
    return out;
  }
  /* 집에 사는 문어를 눌렀다 → 할 말의 열쇠 (null = 자고 있다: 집 목소리 '자고 있어.'). 처음이면 home.first, 그날 처음이면 home.again, 저녁엔 home.in, 그 밖엔 talk.
     u = S.user (story.met 에 처음 만난 날 · story.metDay 에 그날 만난 날을 적는다) */
  function residentKey(u, id, dateKey, hour) {
    if (RESIDENTS.indexOf(id) < 0) return null;
    var ph = phase(hour); if (ph === 'night') return null;
    normalize(u); var st = u.story;
    if (!st.met[id]) { st.met[id] = dateKey; st.metDay[id] = dateKey; return 'home.first'; }
    if (st.metDay[id] !== dateKey) { st.metDay[id] = dateKey; return ph === 'evening' ? 'home.in' : 'home.again'; }
    return ph === 'evening' ? 'home.in' : 'talk';
  }
  /* 저장 칸 S.user.story (계약 C8): { intro: 'YYYY-MM-DD' | null, notices: { 쪽지 id: 'YYYY-MM-DD' } }. 모르는 값은 그대로 둔다 */
  function normalize(u) {
    if (!isObj(u)) return u;
    if (!isObj(u.story)) u.story = {};
    var st = u.story;
    if (!(typeof st.intro === 'string' && st.intro)) { if (st.intro !== true) st.intro = null; }
    if (!isObj(st.notices)) st.notices = {};
    if (!isObj(st.met)) st.met = {};   /* 11-24: 집에 사는 문어를 처음 만난 날 */
    if (!isObj(st.metDay)) st.metDay = {};   /* 11-24: 그날 처음 만난 날 (다시 만남 인사를 하루 한 번) */
    return u;
  }
  function seeNotices(u, dateKey) {   /* 게시판을 열었다 → 아직 안 본 쪽지에 날짜. 새로 본 수를 돌려준다 */
    normalize(u); var n = 0;
    NOTICES.forEach(function (x) { if (!u.story.notices[x.id]) { u.story.notices[x.id] = dateKey; n++; } });
    return n;
  }
  function allText() {   /* 검사 · 문서용: 화면에 나오는 글 전부 [{ where, text }] */
    var out = [];
    KEEPERS.concat(RESIDENTS, ['stylist']).forEach(function (id) {
      out.push({ where: id + ' name', text: ROSTER[id].name });
      keys(id).forEach(function (k) { LINES[id][k].forEach(function (v, i) { v.forEach(function (s, j) { out.push({ where: id + ' ' + k + ' ' + i + '.' + j, text: s, npc: id }); }); }); });
    });
    NOTICES.forEach(function (x) { out.push({ where: 'notice ' + x.id, text: x.text }); });
    INTRO.forEach(function (s, i) { out.push({ where: 'intro ' + i, text: s }); });
    out.push({ where: 'sleeper', text: SLEEP_SAY });
    return out;
  }

  return {
    LABEL: LABEL, roster: ROSTER, keepers: KEEPERS, residents: RESIDENTS, phase: phase, residentKey: residentKey, sleepers: SLEEPERS, lines: LINES, notices: NOTICES, intro: INTRO, SLEEP_SAY: SLEEP_SAY,
    who: who, tag: tag, keys: keys, variants: variants, line: line, list: list, normalize: normalize, seeNotices: seeNotices, allText: allText, hash: hash
  };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = NPC;
