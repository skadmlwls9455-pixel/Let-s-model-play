/* ============================================================
   뽈뽈 문어 — 세계 데이터 (전역 WORLD, 데이터만)
   DESIGN.md §5.5 §5.7 §5.8 §5.9 §12.1
   - 로드 순서: world.js → brain.js → app.js
   - type="module" 금지 (file:// 에서 동작)
   - 위키 제목은 이 샌드박스에서 확인하지 못했다 → 모든 노드 wikiUnverified:true.
     brain.js 는 fetch 실패 시 'builtin'(책장 메모)으로 정직하게 내려간다.
   ============================================================ */
/* global window */
var WORLD = (function () {
  'use strict';

  /* ---------- 코너 ---------- */
  var corners = {
    hands:   { name: '손과 물건',   emoji: '🧵', phrase: '손 쪽' },
    sea:     { name: '바다와 생물', emoji: '🐚', phrase: '바다 쪽' },
    sky:     { name: '하늘과 날씨', emoji: '🌧', phrase: '하늘 쪽' },
    signs:   { name: '기호와 언어', emoji: '✒', phrase: '기호 쪽' },
    numbers: { name: '수와 모양',   emoji: '🔢', phrase: '수 쪽' },
    sounds:  { name: '소리와 리듬', emoji: '🎵', phrase: '소리 쪽' },
    home:    { name: '집과 사람',   emoji: '🏠', phrase: '집 쪽' },
    mind:    { name: '생각하는 것', emoji: '💭', phrase: '생각 쪽' },
    wild:    { name: '서가',       emoji: '❔', phrase: '서가 쪽' }
  };

  var scenes = ['hands', 'sea', 'sky', 'signs', 'numbers', 'sounds', 'home', 'mind', 'wild'];

  /* ---------- 노드 ----------
     node() 는 기본값만 채운다 (odd:false, linger:false, souvenir:null,
     scene = corner, sticker = id, wikiUnverified:true). */
  function node(n) {
    if (n.odd === undefined) n.odd = false;
    if (n.linger === undefined) n.linger = false;
    if (n.souvenir === undefined) n.souvenir = null;
    if (n.aliases === undefined) n.aliases = [];
    if (n.keywords === undefined) n.keywords = [];
    if (n.related === undefined) n.related = [];
    if (n.scene === undefined) n.scene = n.corner;
    if (n.sticker === undefined) n.sticker = n.id;
    if (n.wiki === undefined) n.wiki = null;
    if (n.wiki && n.wikiUnverified === undefined) n.wikiUnverified = true;
    return n;
  }

  var nodeList = [

    /* ===== hands 손과 물건 ===== */
    node({
      id: 'hat', name: '모자', corner: 'hands', emoji: '🎩',
      aliases: ['햇', '캡', '밀짚모자', '중절모', '벙거지'],
      keywords: ['챙', '머리', '쓰는 것', '장식', '모자점'],
      wiki: '모자',
      clue: '모자는 햇빛을 가리려고, 추위를 막으려고, 그리고 누구인지 보여 주려고 썼다.',
      memories: [
        '옛날엔 모자만 봐도 뭘 하는 사람인지 알았대',
        '밀짚모자는 밀 줄기를 엮어서 만들어',
        '챙은 해를 가리고, 안쪽 띠는 땀을 막아 줘'
      ],
      related: ['button', 'umbrella'],
      tangents: [
        { to: 'feather', bridge: '모자 장식에 꽂힌 깃털에서' },
        { to: 'name', bridge: '모자만 보고 누군지 알아보던 시절 이야기에서' }
      ]
    }),
    node({
      id: 'quill', name: '깃펜', corner: 'hands', emoji: '🖋',
      aliases: ['깃털펜', '펜', '펜촉'],
      keywords: ['필기', '거위', '펜나이프', '글쓰기'],
      wiki: '깃펜',
      clue: '깃펜은 큰 새의 날개깃으로 만든다. 끝을 칼로 깎아 쓰는데, 그 칼이 바로 펜나이프다.',
      memories: [
        '거위 깃털로 많이 만들었어. 큰 날개깃이어야 해',
        '끝을 칼로 깎아 쓰는데, 그 칼이 펜나이프야',
        '금속 펜이 나오기 전까진 다 이걸로 썼대'
      ],
      related: ['chalk'],
      tangents: [
        { to: 'ink', bridge: '깃펜 끝에 묻은 잉크를 따라가다가' },
        { to: 'feather', bridge: '깃펜이 원래 거위 날개깃이었다는 걸 보고' }
      ]
    }),
    node({
      id: 'button', name: '단추', corner: 'hands', emoji: '🔘',
      aliases: ['버튼', '단춧구멍'],
      keywords: ['옷', '여미기', '자개', '장식'],
      wiki: '단추',
      clue: '단추는 처음엔 옷을 여미는 게 아니라 장식이었다. 단춧구멍이 생긴 뒤에야 지금의 쓸모가 됐다.',
      memories: [
        '옛 단추는 조개껍데기를 깎아 만든 게 많았어',
        '처음엔 잠그는 용도가 아니라 장식이었대',
        '단춧구멍이 생기고 나서야 옷을 여밀 수 있었어'
      ],
      related: ['thread', 'hat'],
      tangents: [
        { to: 'shell', bridge: '옛 단추가 조개껍데기로 만들어졌다는 걸 보고' },
        { to: 'abacus', bridge: '단추를 한 알씩 세다가' }
      ],
      souvenir: 'button'
    }),
    node({
      id: 'umbrella', name: '우산', corner: 'hands', emoji: '☂',
      aliases: ['양산', '파라솔', '접는우산'],
      keywords: ['비', '그늘', '우산살', '손잡이'],
      wiki: '우산',
      clue: '우산은 원래 해를 가리는 물건이었다. 영어 umbrella는 라틴어 umbra, 그늘에서 왔다.',
      memories: [
        '원래는 해를 가리는 거였어. 비는 나중이야',
        '영어 umbrella는 라틴어 그늘, umbra에서 왔대',
        '비 오는 날엔 우산 위 소리가 제일 좋아'
      ],
      related: ['hat'],
      tangents: [
        { to: 'rain', bridge: '우산 위에 떨어지는 빗소리를 따라가다가' },
        { to: 'ancient_language', bridge: '우산이란 말이 라틴어 그늘에서 왔다는 걸 보고' }
      ]
    }),
    node({
      id: 'thread', name: '실', corner: 'hands', emoji: '🧶',
      aliases: ['실뭉치', '털실', '명주실', '바느질실'],
      keywords: ['섬유', '꼬임', '바느질', '뜨개질', '물레'],
      wiki: '실',
      clue: '실은 짧은 섬유를 꼬아서 길게 만든 것이다. 꼬임 방향에도 이름이 있다. S꼬임, Z꼬임.',
      memories: [
        '실은 짧은 섬유를 꼬아서 길게 만든 거야',
        '꼬임 방향에도 이름이 있어. S꼬임, Z꼬임',
        '매듭 하나로 실이 끈이 돼'
      ],
      related: ['knot', 'button'],
      tangents: [
        { to: 'spiral', bridge: '실이 꼬여 도는 모양을 보다가' },
        { to: 'lullaby', bridge: '실 감으며 흥얼거리는 노래를 듣다가' }
      ],
      souvenir: 'yarn'
    }),
    node({
      id: 'knot', name: '매듭', corner: 'hands', emoji: '🪢',
      aliases: ['옭매듭', '나비매듭', '보울라인'],   /* '노트'는 뺐다: 한국어로는 공책·메모라 '노트에 적어'가 매듭이 됐다 */
      keywords: ['끈', '밧줄', '묶기', '뱃사람'],
      wiki: '매듭',
      clue: '매듭을 지으면 줄은 그 자리에서 조금 약해진다. 그런데도 사람들은 수천 년 동안 매듭으로 배를 묶었다.',
      memories: [
        '매듭을 지으면 줄이 그 자리에서 조금 약해져',
        '보울라인은 당겨도 안 조여서 뱃사람들이 좋아했대',
        '나비매듭은 사실 매듭 두 개야'
      ],
      related: ['thread'],
      tangents: [
        { to: 'knot_theory', bridge: '매듭을 풀 수 없게 끝을 이어 붙여 보다가' },
        { to: 'tide', bridge: '배를 묶은 매듭과 물가에서' }
      ]
    }),
    node({
      id: 'key', name: '열쇠', corner: 'hands', emoji: '🗝',
      aliases: ['키', '열쇠고리', '쇳대'],
      keywords: ['자물쇠', '문', '잠금', '열다'],
      wiki: '열쇠',
      clue: '제일 오래된 열쇠는 나무였다. 안쪽 핀을 밀어 올리는 식이었고, 지금 열쇠도 원리는 비슷하다.',
      memories: [
        '제일 오래된 열쇠는 나무였대. 핀을 밀어 올리는 식',
        '열쇠 모양은 자물쇠 안쪽 모양을 뒤집은 거야',
        '열쇠를 잃으면 자물쇠째 바꿔야 했어'
      ],
      related: ['lock'],
      tangents: [
        { to: 'lantern', bridge: '열쇠 구멍 너머로 새는 불빛에서' },
        { to: 'cipher', bridge: '암호에도 열쇠가 있다는 말에서' }
      ],
      souvenir: 'key'
    }),
    node({
      id: 'lock', name: '자물쇠', corner: 'hands', emoji: '🔒',
      aliases: ['잠금장치', '패드록', '다이얼자물쇠'],
      keywords: ['열쇠', '걸림쇠', '금고', '잠그기'],
      wiki: '자물쇠',
      clue: '자물쇠는 여는 데 드는 시간과 수고를 늘려서 막는 물건이다.',
      memories: [
        '로마 사람들은 열쇠를 반지처럼 손가락에 끼었대',
        '안쪽 걸림쇠 모양이 안 맞으면 못 돌아가',
        '자물쇠는 못 열게가 아니라 오래 걸리게 하는 거래'
      ],
      related: ['key'],
      tangents: [
        { to: 'cipher', bridge: '자물쇠도 암호도 열쇠가 있다는 데서' },
        { to: 'zero', bridge: '다이얼 자물쇠의 숫자판에서' }
      ]
    }),
    node({
      id: 'glass', name: '유리', corner: 'hands', emoji: '🫙',
      aliases: ['글라스', '유리창', '유리병', '유리구슬'],
      keywords: ['모래', '투명', '깨지다', '창'],
      wiki: '유리',
      clue: '유리는 모래를 아주 뜨겁게 녹여 만든다. 결정이 아니라서 깨지면 아무 방향으로나 갈라진다.',
      memories: [
        '유리는 모래를 아주 뜨겁게 녹여 만들어',
        '결정이 아니라서 깨지면 아무 방향으로나 갈라져',
        '옛 창유리는 울퉁불퉁해서 밖이 물결처럼 보였어'
      ],
      related: ['window'],
      tangents: [
        { to: 'rainbow', bridge: '유리 모서리에서 갈라진 빛에서' },
        { to: 'light', bridge: '색유리가 바닥에 깔아 놓은 빛을 보다가' }
      ],
      souvenir: 'marble'
    }),
    node({
      id: 'chalk', name: '분필', corner: 'hands', emoji: '🖍',
      aliases: ['백묵', '초크', '칠판분필'],
      keywords: ['칠판', '석회', '가루', '쓰기'],
      wiki: '분필',
      clue: '천연 분필은 아주 작은 바다 생물의 껍질이 수백만 년 쌓여 만들어진 돌이다. 지금 칠판 분필은 석고로 만든 것이 많다.',
      memories: [
        '천연 분필은 아주 작은 바다 생물 껍질이 쌓인 거야',
        '지금 칠판 분필은 석고로 만든 게 많아',
        '분필 가루는 손에 남고, 글은 지워져'
      ],
      related: ['quill'],
      tangents: [
        { to: 'tessellation', bridge: '칠판에 그린 격자가 빈틈없이 맞는 걸 보다가' },
        { to: 'shell', bridge: '분필이 작은 바다 생물 껍질이었다는 걸 보고' }
      ],
      souvenir: 'chalk'
    }),

    /* ===== sea 바다와 생물 ===== */
    node({
      id: 'octopus', name: '문어', corner: 'sea', emoji: '🐙',
      aliases: ['낙지', '두족류', '옥토퍼스'],
      keywords: ['빨판', '먹물', '다리 여덟', '심장 세 개', '바다', '문어발'],
      wiki: '문어',
      clue: '문어는 심장이 세 개고 피가 파랗다. 뼈는 하나도 없고, 빨판으로 맛을 본다.',
      memories: [
        '심장이 세 개야. 둘은 아가미로, 하나는 몸으로',
        '피가 파래. 구리로 산소를 옮겨서',
        '빨판으로 맛을 볼 수 있어'
      ],
      related: ['octopus_nerves', 'starfish', 'whale_song'],
      tangents: [
        { to: 'heartbeat', bridge: '심장이 세 개라는 말을 듣다가' },
        { to: 'dream', bridge: '자면서 색이 바뀌는 문어를 보다가' }
      ]
    }),
    node({
      id: 'octopus_nerves', name: '문어 신경계', corner: 'sea', emoji: '🧠', odd: true,
      aliases: ['문어 뇌', '문어 신경', '다리 신경'],
      keywords: ['신경세포', '뉴런', '다리', '뇌', '활성 수면'],
      wiki: null,
      clue: '문어의 신경세포는 약 5억 개. 그중 3분의 2가 머리가 아니라 다리에 있다.',
      memories: [
        '신경세포 셋 중 둘이 다리에 있어. 머리가 아니고',
        '다리 하나하나가 조금씩 따로 생각해',
        '자면서 피부색이 바뀌어. 꿈일지도 모른대'
      ],
      related: ['octopus'],
      tangents: [
        { to: 'memory', bridge: '신경세포라는 말에서 기억으로 건너가다가' },
        { to: 'knot_theory', bridge: '얽힌 줄 모양을 떠올리다가' }
      ]
    }),
    node({
      id: 'shell', name: '조개', corner: 'sea', emoji: '🐚',
      aliases: ['조개껍데기', '패각', '소라', '바지락'],
      keywords: ['진주층', '껍데기', '모래사장', '자개'],
      wiki: '조개',
      clue: '조개껍데기에는 자라면서 생긴 성장선이 있다. 나무의 나이테처럼 자란 자국이다.',
      memories: [
        '껍데기 안쪽 무늬가 진주층이야',
        '줄무늬는 자란 자국이야. 나무 나이테처럼',
        '옛날엔 조개가 돈이었던 곳도 있어'
      ],
      related: ['pearl', 'starfish'],
      tangents: [
        { to: 'button', bridge: '껍데기를 둥글게 깎은 단추를 보다가' },
        { to: 'spiral', bridge: '소라 껍데기가 도는 방향을 따라가다가' }
      ],
      souvenir: 'shell'
    }),
    node({
      id: 'pearl', name: '진주', corner: 'sea', emoji: '⚪',
      aliases: ['펄', '진주알', '양식진주'],
      keywords: ['조개', '진주층', '보석', '반짝임'],
      wiki: '진주',
      clue: '진주는 조개 몸속에서 진주층이 겹겹이 쌓여 생긴다.',
      memories: [
        '진주는 조개가 아픈 데를 감싸다 생긴 거야',
        '진주층을 수백 겹 두르면 빛이 반짝여',
        '완전히 둥근 진주는 아주 드물어'
      ],
      related: ['shell'],
      tangents: [
        { to: 'light', bridge: '진주층이 빛을 갈라 내는 걸 보다가' },
        { to: 'button', bridge: '진주 단추의 반짝임에서' }
      ]
    }),
    node({
      id: 'tide', name: '밀물과 썰물', corner: 'sea', emoji: '🌊',
      aliases: ['조석', '조수', '밀물', '썰물', '갯벌'],
      keywords: ['달', '바닷물', '간조', '만조', '해변'],
      wiki: '조석',
      clue: '밀물과 썰물은 달이 바다를 당겨서 생긴다. 하루에 두 번쯤 물이 들고 나간다.',
      memories: [
        '밀물 썰물은 달이 바다를 당겨서 생겨',
        '하루에 두 번쯤 물이 들고 나가',
        '보름달이랑 그믐엔 물이 더 크게 움직여'
      ],
      related: ['shell'],
      tangents: [
        { to: 'moon', bridge: '물이 달을 따라 들고 나는 걸 보다가' },
        { to: 'time_sense', bridge: '하루 두 번 돌아오는 물을 세다가' }
      ],
      souvenir: 'pebble'
    }),
    node({
      id: 'starfish', name: '불가사리', corner: 'sea', emoji: '⭐',
      aliases: ['바다별', '성게 친척'],
      keywords: ['재생', '다섯 갈래', '관족', '바닷가'],
      wiki: '불가사리',
      clue: '불가사리는 물고기가 아니다. 성게의 친척이고, 다리를 잃어도 다시 자란다.',
      memories: [
        '불가사리는 물고기가 아니야. 성게 친척',
        '다리를 잃어도 다시 자라',
        '다섯 갈래가 많지만 더 많은 애들도 있어'
      ],
      related: ['shell', 'octopus'],
      tangents: [
        { to: 'star', bridge: '불가사리를 바다의 별이라 부르는 데서' },
        { to: 'honeycomb', bridge: '갈래가 고르게 벌어진 모양에서' }
      ]
    }),
    node({
      id: 'lighthouse', name: '등대', corner: 'sea', emoji: '🗼',
      aliases: ['등대지기', '항로표지'],
      keywords: ['불빛', '바닷가', '배', '렌즈', '항구'],
      wiki: '등대',
      clue: '등대마다 불빛이 깜빡이는 간격이 다르다. 뱃사람은 그 간격으로 어느 등대인지 알아본다.',
      memories: [
        '등대마다 깜빡이는 간격이 달라. 그게 이름이야',
        '프레넬 렌즈가 작은 불을 멀리 보내 줘',
        '알렉산드리아 등대는 고대 7대 불가사의 중 하나야'
      ],
      related: ['tide'],
      tangents: [
        { to: 'morse', bridge: '등대 불빛이 깜빡이는 간격을 세다가' },
        { to: 'lantern', bridge: '아주 큰 등불이라는 생각에서' }
      ],
      souvenir: 'map_piece'
    }),
    node({
      id: 'salt', name: '소금', corner: 'sea', emoji: '🧂', odd: true,
      aliases: ['천일염', '암염', '염화나트륨'],
      keywords: ['결정', '바닷물', '염전', '짠맛'],
      wiki: '소금',
      clue: '소금 결정은 작은 정육면체다. 바닷물 100g에는 소금이 3.5g쯤 녹아 있다.',
      memories: [
        '소금 결정은 작은 정육면체야',
        '바닷물 100g에 소금이 3.5g쯤 들어 있어',
        '녹으면 안 보이지만 끓이면 돌아와'
      ],
      related: ['tide'],
      tangents: [
        { to: 'tessellation', bridge: '소금 결정 정육면체가 빈틈없이 쌓이는 걸 보다가' },
        { to: 'tea', bridge: '바닷물을 끓이면 소금이 남는다는 데서' }
      ]
    }),

    /* ===== sky 하늘과 날씨 ===== */
    node({
      id: 'feather', name: '깃털', corner: 'sky', emoji: '🪶',
      aliases: ['깃', '새털', '솜털', '날개깃'],
      keywords: ['새', '날개', '케라틴', '가볍다'],
      wiki: '깃털',
      clue: '새 한 마리의 깃털 수는 종마다 다르다. 하나하나 세어 본 기록도 있다.',
      memories: [
        '깃털은 손톱이랑 같은 재료, 케라틴이래',
        '날개 끝 깃털은 한쪽이 더 좁아. 날기 때문에',
        '솜털은 공기를 가둬서 따뜻하게 해'
      ],
      related: ['wind'],
      tangents: [
        { to: 'quill', bridge: '깃펜으로 깎인 깃털을 따라가다가' },
        { to: 'hat', bridge: '모자 장식에 꽂힌 깃털에서' }
      ],
      souvenir: 'feather'
    }),
    node({
      id: 'rain', name: '비', corner: 'sky', emoji: '🌧',
      aliases: ['빗방울', '빗소리', '장마', '소나기', '가랑비'],
      keywords: ['구름', '물방울', '우산', '웅덩이', '날씨'],
      wiki: '비',
      clue: '빗방울은 눈물 모양이 아니다. 작은 것은 거의 공이고, 큰 것은 아래가 눌린 빵 모양이다.',
      memories: [
        '빗방울은 눈물 모양이 아니야. 작은 건 거의 공',
        '비 오기 전 냄새에도 이름이 있어. 페트리커',
        '빗소리는 사실 비가 다른 것에 닿는 소리야'
      ],
      related: ['cloud_names', 'snow', 'rainbow', 'thunder'],
      tangents: [
        { to: 'umbrella', bridge: '우산 위로 떨어지는 소리를 따라가다가' },
        { to: 'window', bridge: '창문에 맺힌 빗방울을 보다가' }
      ],
      souvenir: 'paper_boat'
    }),
    node({
      id: 'cloud_names', name: '구름 이름', corner: 'sky', emoji: '☁', odd: true,
      aliases: ['구름', '구름 도감', '적운', '권운', '층운', '쿠물루스'],
      keywords: ['국제 구름 도감', '루크 하워드', '라틴어', '하늘', '날씨'],
      wiki: '구름',
      clue: '구름의 이름은 라틴어다. 쿠물루스는 쌓인 것, 스트라투스는 펼친 것, 키루스는 머리칼.',
      memories: [
        '구름 이름은 1802년 루크 하워드가 라틴어로 붙였어',
        '국제 구름 도감엔 구름이 열 가지 큰 갈래로 나와',
        '쌓인 것, 펼친 것, 머리칼. 이름이 다 생김새야'
      ],
      related: ['rain', 'wind'],
      tangents: [
        { to: 'ancient_language', bridge: '구름 이름이 전부 라틴어라는 걸 보고' },
        { to: 'name', bridge: '구름에 붙은 이름에서' }
      ]
    }),
    node({
      id: 'rainbow', name: '무지개', corner: 'sky', emoji: '🌈',
      aliases: ['쌍무지개', '채운'],
      keywords: ['빛', '물방울', '일곱 색', '비 온 뒤', '프리즘'],
      wiki: '무지개',
      clue: '무지개는 늘 해의 반대쪽에 뜬다. 두 번째 무지개가 보이면 색 순서가 거꾸로다.',
      memories: [
        '무지개는 늘 해 반대쪽에 있어',
        '두 번째 무지개는 색 순서가 거꾸로야',
        '비 오는 날 해가 나오면 등 돌리고 서 봐'
      ],
      related: ['light', 'rain'],
      tangents: [
        { to: 'glass', bridge: '유리 모서리에도 작은 무지개가 생긴다는 걸 보고' },
        { to: 'riddle', bridge: '무지개에 얽힌 옛 이야기에서' }
      ]
    }),
    node({
      id: 'light', name: '빛', corner: 'sky', emoji: '✨',
      aliases: ['햇빛', '광선', '빛줄기'],
      keywords: ['프리즘', '그림자', '속도', '색', '밝음'],
      wiki: '빛',
      clue: '햇빛이 지구까지 오는 데 8분쯤 걸린다. 지금 창에 든 빛은 8분 전에 해를 떠난 빛이다.',
      memories: [
        '햇빛이 여기까지 오는 데 8분쯤 걸려',
        '프리즘을 지나면 하얀빛이 색으로 갈라져',
        '색유리는 빛을 걸러서 바닥에 색을 깔아'
      ],
      related: ['rainbow', 'star'],
      tangents: [
        { to: 'lantern', bridge: '등불 빛이 벽에 흔들리는 걸 보다가' },
        { to: 'time_sense', bridge: '햇빛이 8분 전 빛이라는 걸 보고' }
      ],
      souvenir: 'stained_glass'
    }),
    node({
      id: 'star', name: '별', corner: 'sky', emoji: '🌟',
      aliases: ['항성', '별자리', '별빛', '밤하늘'],
      keywords: ['밤', '하늘', '빛', '은하', '깜빡임'],
      wiki: '항성',
      clue: '지금 보는 별빛은 몇 년, 몇백 년 전에 떠난 빛이다. 별이 깜빡이는 건 공기가 흔들리기 때문이다.',
      memories: [
        '지금 보는 별빛은 몇백 년 전에 떠난 빛이야',
        '별이 깜빡이는 건 공기가 흔들려서야',
        '해도 별이야. 가까이 있는 별'
      ],
      related: ['moon', 'light'],
      tangents: [
        { to: 'starfish', bridge: '바다에도 별이 있다는 말에서' },
        { to: 'name', bridge: '별에 붙은 이름에서' }
      ]
    }),
    node({
      id: 'moon', name: '달', corner: 'sky', emoji: '🌙',
      aliases: ['보름달', '초승달', '그믐달', '달빛'],
      keywords: ['밤', '위상', '밀물', '하늘'],
      wiki: '달',
      clue: '달은 늘 같은 얼굴만 보여 준다. 달빛은 달이 되돌려 주는 햇빛이다.',
      memories: [
        '달은 늘 같은 얼굴만 보여 줘',
        '달빛은 사실 햇빛이야. 달이 되돌려 주는',
        '달이 바다를 당겨서 밀물이 생겨'
      ],
      related: ['star'],
      tangents: [
        { to: 'tide', bridge: '달이 바다를 당긴다는 걸 보고' },
        { to: 'sleep', bridge: '달빛 아래 잠든 것들을 보다가' }
      ]
    }),
    node({
      id: 'wind', name: '바람', corner: 'sky', emoji: '🍃',
      aliases: ['돌풍', '미풍', '바람결', '풍향'],
      keywords: ['공기', '기압', '보퍼트', '날씨', '나뭇잎'],
      wiki: '바람',
      clue: '바람은 공기가 많은 데서 적은 데로 가는 것이다. 보퍼트 풍력 계급은 0에서 12까지다.',
      memories: [
        '바람은 공기가 많은 데서 적은 데로 가는 거야',
        '보퍼트 풍력 계급은 0부터 12까지야',
        '바람 이름은 어디서 불어오는지로 붙여'
      ],
      related: ['cloud_names', 'rain'],
      tangents: [
        { to: 'echo', bridge: '바람 소리가 골짜기에서 돌아오는 걸 듣다가' },
        { to: 'pinecone', bridge: '바람에 떨어진 솔방울을 따라가다가' }
      ],
      souvenir: 'leaf'
    }),
    node({
      id: 'snow', name: '눈', corner: 'sky', emoji: '❄',
      aliases: ['눈송이', '눈 결정', '첫눈', '눈발'],
      keywords: ['결정', '겨울', '여섯 갈래', '조용함', '날씨'],
      wiki: '눈 (날씨)',
      clue: '눈 결정은 얼음의 육각 구조를 따라 여섯 방향으로 자란다. 갓 쌓인 눈은 틈이 많아 소리를 잘 흡수한다.',
      memories: [
        '눈 결정은 거의 다 여섯 갈래야',
        '눈 쌓인 날이 조용한 건 눈 사이 공기 때문이야',
        '벤틀리라는 사람이 눈 결정을 5천 장 넘게 찍었어'
      ],
      related: ['rain'],
      tangents: [
        { to: 'honeycomb', bridge: '눈 결정이 여섯 갈래인 걸 보고' },
        { to: 'blanket', bridge: '눈 덮인 지붕이 담요처럼 보여서' }
      ]
    }),

    /* ===== signs 기호와 언어 ===== */
    node({
      id: 'ink', name: '잉크', corner: 'signs', emoji: '🫧',
      aliases: ['먹', '먹물', '세피아', '잉크병'],
      keywords: ['펜', '글씨', '그을음', '염료', '쓰기'],
      wiki: '잉크',
      clue: '세피아라는 색 이름은 원래 갑오징어 먹물을 가리키는 말이었다.',
      memories: [
        '먹은 그을음을 아교로 뭉친 거야',
        '세피아 색은 원래 갑오징어 먹물 이름이었어',
        '옛 유럽 잉크는 참나무 혹에서 만들었대'
      ],
      related: ['cuneiform', 'hangul', 'stamp'],
      tangents: [
        { to: 'octopus', bridge: '잉크병 옆에 적힌 먹물이란 말을 따라가다가' },
        { to: 'quill', bridge: '잉크를 머금은 펜촉을 보다가' }
      ]
    }),
    node({
      id: 'cuneiform', name: '설형문자', corner: 'signs', emoji: '🪨', odd: true,
      aliases: ['쐐기문자', '설형 문자', '점토판', '수메르 문자'],
      keywords: ['수메르', '점토', '갈대', '메소포타미아', '고대 문자'],
      wiki: '설형 문자',
      clue: '제일 오래된 글은 시가 아니라 장부였다. 젖은 점토에 갈대 끝으로 쐐기를 찍어 보리 몇 자루를 적었다.',
      memories: [
        '갈대 끝으로 젖은 점토에 찍어서 썼어. 쐐기 모양',
        '제일 오래된 글은 시가 아니라 장부였어',
        '점토판은 불에 타면 더 단단해져서 남았어'
      ],
      related: ['ancient_language', 'ink'],
      tangents: [
        { to: 'zero', bridge: '점토판 장부에 보리 몇 자루 적힌 걸 보다가' },
        { to: 'chalk', bridge: '점토에 눌러 쓴 자국을 보다가' }
      ]
    }),
    node({
      id: 'braille', name: '점자', corner: 'signs', emoji: '⠿', odd: true,
      aliases: ['브라유', '브레일', '점자책'],
      keywords: ['손끝', '여섯 점', '시각장애', '읽기', '촉각'],
      wiki: '점자',
      clue: '점자는 루이 브라유가 열다섯 살에 만들었다. 점 여섯 개로 64가지 모양이 나온다.',
      memories: [
        '루이 브라유가 열다섯 살에 만들었어',
        '점 여섯 개로 64가지를 만들 수 있어',
        '읽을 때 손가락이 글자 위를 미끄러져'
      ],
      related: ['morse', 'hangul'],
      tangents: [
        { to: 'abacus', bridge: '점 여섯 개로 64가지가 된다는 셈을 따라가다가' },
        { to: 'thread', bridge: '손끝으로 읽는다는 말에서' }
      ]
    }),
    node({
      id: 'morse', name: '모스 부호', corner: 'signs', emoji: '📡', odd: true,
      aliases: ['모스', '모스부호', '전신', 'SOS'],
      keywords: ['점', '선', '신호', '무선', '깜빡임'],
      wiki: '모스 부호',
      clue: 'SOS는 점 셋, 선 셋, 점 셋. 제일 많이 쓰는 글자 E가 제일 짧다. 점 하나.',
      memories: [
        'SOS는 점 셋, 선 셋, 점 셋이야',
        '제일 많이 쓰는 E가 제일 짧아. 점 하나',
        '소리로도, 빛으로도, 두드려서도 보낼 수 있어'
      ],
      related: ['braille', 'cipher'],
      tangents: [
        { to: 'lighthouse', bridge: '점과 선을 불빛으로 보내는 등대에서' },
        { to: 'metronome', bridge: '점과 선의 길이를 박자처럼 세다가' }
      ]
    }),
    node({
      id: 'cipher', name: '암호', corner: 'signs', emoji: '🔐',
      aliases: ['암호문', '비밀 글', '카이사르 암호', '에니그마'],
      keywords: ['열쇠', '해독', '비밀', '치환', '숨기기'],
      wiki: '암호',
      clue: '카이사르는 글자를 세 칸씩 밀어서 편지를 썼다. 암호를 푸는 데 필요한 것도 열쇠라고 부른다.',
      memories: [
        '카이사르는 글자를 세 칸씩 밀어서 썼대',
        '암호의 열쇠도 키라고 불러',
        '숨기는 글과 바꾸는 글은 달라'
      ],
      related: ['morse'],
      tangents: [
        { to: 'key', bridge: '암호의 열쇠도 열쇠라고 부르는 데서' },
        { to: 'prime', bridge: '큰 소수 두 개가 암호가 된다는 걸 보고' }
      ]
    }),
    node({
      id: 'ancient_language', name: '라틴어', corner: 'signs', emoji: '🏛', odd: true,
      aliases: ['고대 언어', '라틴', '옛말', '사어'],
      keywords: ['로마', '학명', '구름 이름', '옛 언어', '문법'],
      wiki: '라틴어',
      clue: '이제 라틴어를 모국어로 쓰는 사람은 없다. 그런데 구름 이름, 동물 학명은 지금도 라틴어로 붙는다.',
      memories: [
        '이제 모국어로 쓰는 사람은 없어. 그래도 읽혀',
        '구름 이름, 동물 학명이 다 라틴어야',
        '문어는 라틴어로 폴리푸스. 다리 많은 것'
      ],
      related: ['cuneiform'],
      tangents: [
        { to: 'cloud_names', bridge: '구름 이름이 라틴어라는 걸 보고' },
        { to: 'octopus', bridge: '동물 이름에 쓰이는 옛말에서' }
      ]
    }),
    node({
      id: 'hangul', name: '한글', corner: 'signs', emoji: 'ㅎ',
      aliases: ['훈민정음', '우리글', '한글 자모'],
      keywords: ['세종', '자음', '모음', '글자', '소리'],
      wiki: '한글',
      clue: '한글 자음은 발음 기관의 모양을, 모음은 하늘·땅·사람을 본떴다. 1443년에 만들고 1446년에 알렸다.',
      memories: [
        '글자 모양이 입 모양, 혀 모양을 본뜬 거야',
        '처음엔 28자였고 지금은 24자를 써',
        '1443년에 만들고 1446년에 알렸어'
      ],
      related: ['braille', 'ink'],
      tangents: [
        { to: 'riddle', bridge: '소리와 모양을 짝짓는 말놀이에서' },
        { to: 'echo', bridge: '소리를 적는 글자라는 말을 따라가다가' }
      ]
    }),
    node({
      id: 'stamp', name: '우표', corner: 'signs', emoji: '📮',
      aliases: ['스탬프', '소인', '우편', '페니 블랙'],
      keywords: ['편지', '봉투', '우체국', '톱니', '수집'],
      wiki: '우표',
      clue: '첫 우표는 1840년 영국의 페니 블랙이다. 우표 가장자리 톱니는 뜯기 쉽게 뚫은 구멍이다.',
      memories: [
        '첫 우표는 1840년 영국의 페니 블랙이야',
        '가장자리 톱니는 뜯기 쉽게 뚫은 구멍이야',
        '작은 종이 한 장이 편지를 멀리 보내 줘'
      ],
      related: ['letter_room', 'ink'],
      tangents: [
        { to: 'lighthouse', bridge: '우표에 그려진 등대 그림에서' },
        { to: 'window', bridge: '우표만 한 작은 창을 생각하다가' }
      ],
      souvenir: 'stamp'
    }),

    /* ===== numbers 수와 모양 ===== */
    node({
      id: 'prime', name: '소수', corner: 'numbers', emoji: '🔢', odd: true,
      aliases: ['소수들', '2 3 5 7'],   /* '프라임'은 뺐다: '아마존 프라임'·'프라임 타임'이 소수가 됐다 */
      keywords: ['수론', '약수', '유클리드', '매미', '나누기'],
      wiki: '소수 (수론)',
      clue: '소수는 끝이 없다. 유클리드가 2천 년도 더 전에 보여 줬다. 어떤 매미는 13년, 17년마다 나온다.',
      memories: [
        '소수는 끝이 없어. 유클리드가 보여 줬어',
        '짝수 중에 소수는 2 하나야',
        '어떤 매미는 13년, 17년마다 나와. 소수 해'
      ],
      related: ['zero', 'knot_theory'],
      tangents: [
        { to: 'cipher', bridge: '소수가 암호 열쇠로 쓰인다는 걸 보고' },
        { to: 'metronome', bridge: '13년, 17년마다 나오는 매미 박자를 세다가' }
      ]
    }),
    node({
      id: 'knot_theory', name: '매듭 이론', corner: 'numbers', emoji: '➰', odd: true,
      aliases: ['매듭이론', '위상수학', '세잎매듭'],
      keywords: ['고리', '교차', '위상', '수학', '풀기'],
      wiki: '매듭 이론',
      clue: '수학의 매듭은 끝이 이어진 고리다. 제일 간단한 매듭은 세잎매듭, 교차가 세 번이다.',
      memories: [
        '수학의 매듭은 끝이 없는 고리야. 못 풀어',
        '제일 간단한 매듭은 세잎매듭. 교차가 세 번',
        '두 매듭이 같은지 알아내는 게 아직도 어려워'
      ],
      related: ['mobius', 'prime'],
      tangents: [
        { to: 'knot', bridge: '진짜 끈으로 세잎매듭을 묶어 보다가' },
        { to: 'octopus_nerves', bridge: '여러 갈래로 뻗은 줄기를 떠올리다가' }
      ]
    }),
    node({
      id: 'mobius', name: '뫼비우스 띠', corner: 'numbers', emoji: '♾', odd: true,
      aliases: ['뫼비우스의 띠', '뫼비우스', '한 면 띠'],
      keywords: ['면', '모서리', '꼬임', '종이 띠', '위상'],
      wiki: '뫼비우스의 띠',
      clue: '뫼비우스 띠는 면이 하나다. 안쪽을 따라가면 바깥이 된다. 1858년에 두 사람이 따로따로 찾아냈다.',
      memories: [
        '면이 하나야. 안쪽을 따라가면 바깥이 돼',
        '가운데를 따라 자르면 둘이 안 되고 하나로 길어져',
        '1858년에 두 사람이 따로따로 찾았어'
      ],
      related: ['knot_theory', 'spiral'],
      tangents: [
        { to: 'thread', bridge: '종이 띠를 반 번 꼬아 붙이다가' },
        { to: 'time_sense', bridge: '안과 밖이 이어지는 걸 따라가다가' }
      ]
    }),
    node({
      id: 'tessellation', name: '테셀레이션', corner: 'numbers', emoji: '🔷', odd: true,
      aliases: ['쪽매맞춤', '타일링', '에스허르'],
      keywords: ['타일', '바닥', '격자', '정다각형', '무늬'],
      wiki: '테셀레이션',
      clue: '정다각형 한 종류로 바닥을 빈틈없이 채우는 방법은 셋뿐이다. 세모, 네모, 육각.',
      memories: [
        '정다각형으로 빈틈없이 채우는 건 셋뿐이야',
        '에스허르가 새랑 물고기로 바닥을 채웠어',
        '알람브라 궁전 벽은 테셀레이션으로 가득해'
      ],
      related: ['honeycomb', 'spiral'],
      tangents: [
        { to: 'chalk', bridge: '칠판에 그린 격자에서' },
        { to: 'snow', bridge: '여섯 갈래 눈 결정 모양에서' }
      ]
    }),
    node({
      id: 'honeycomb', name: '벌집', corner: 'numbers', emoji: '🍯',
      aliases: ['육각형', '벌방', '밀랍'],
      keywords: ['꿀', '벌', '여섯 각', '밀랍', '모양'],
      wiki: '벌집',
      clue: '벌집이 육각형인 건 밀랍을 제일 적게 쓰는 모양이기 때문이다. 방은 살짝 위로 기울어 꿀이 흐르지 않는다.',
      memories: [
        '육각형이 밀랍을 제일 적게 써',
        '방이 살짝 위로 기울어서 꿀이 안 흘러',
        '벌은 배에서 밀랍을 만들어'
      ],
      related: ['tessellation'],
      tangents: [
        { to: 'snow', bridge: '눈 결정도 여섯 갈래라는 걸 보고' },
        { to: 'tea', bridge: '찻잔에 떨군 꿀 한 방울에서' }
      ]
    }),
    node({
      id: 'spiral', name: '나선', corner: 'numbers', emoji: '🌀',
      aliases: ['소용돌이', '스파이럴', '피보나치', '황금 나선'],
      keywords: ['앵무조개', '해바라기', '은하', '달팽이', '모양'],
      wiki: '나선',
      clue: '앵무조개 껍데기는 커져도 모양이 같다. 해바라기 씨는 나선 두 겹으로 돌아 나간다.',
      memories: [
        '앵무조개 껍데기는 커져도 모양이 같아',
        '해바라기 씨는 나선 두 겹으로 돌아',
        '달팽이도, 은하도 나선이야'
      ],
      related: ['mobius', 'honeycomb'],
      tangents: [
        { to: 'shell', bridge: '소라 껍데기 나선을 따라가다가' },
        { to: 'pinecone', bridge: '솔방울 비늘이 도는 걸 보다가' }
      ]
    }),
    node({
      id: 'zero', name: '0', corner: 'numbers', emoji: '0️⃣', odd: true,
      aliases: ['영', '공', '제로', '숫자 0'],
      keywords: ['없음', '빈자리', '숫자', '인도', '브라마굽타'],
      wiki: '0',
      clue: '로마 숫자에는 0이 없었다. 아무것도 없음에 이름을 붙이는 데 사람들은 아주 오래 걸렸다.',
      memories: [
        '로마 숫자엔 0이 없었어',
        '0을 수로 다룬 규칙은 7세기 인도 브라마굽타가 적었어',
        '없음에 이름을 붙이는 데 오래 걸렸어'
      ],
      related: ['abacus', 'prime'],
      tangents: [
        { to: 'cuneiform', bridge: '점토판에 찍힌 숫자 자국에서' },
        { to: 'sleep', bridge: '아무것도 없음이 수가 된다는 데서' }
      ]
    }),
    node({
      id: 'abacus', name: '주판', corner: 'numbers', emoji: '🧮',
      aliases: ['수판', '소로반', '산판', '셈판'],
      keywords: ['셈', '알', '계산', '손가락', '튕기기'],
      wiki: '주판',
      clue: '주판은 숫자를 쓰지 않고 계산한다. 일본식 소로반은 위에 알 하나, 아래에 알 넷이다.',
      memories: [
        '주판알을 튕기는 소리가 리듬 같아',
        '일본 소로반은 위 하나 아래 넷이야',
        '주판은 숫자를 쓰지 않고 계산해'
      ],
      related: ['zero'],
      tangents: [
        { to: 'metronome', bridge: '주판알 튕기는 소리를 듣다가' },
        { to: 'button', bridge: '알을 한 칸씩 옮기는 손을 보다가' }
      ]
    }),

    /* ===== sounds 소리와 리듬 ===== */
    node({
      id: 'lullaby', name: '자장가', corner: 'sounds', emoji: '🎶',
      aliases: ['자장자장', '브람스 자장가', '잠노래'],
      keywords: ['아기', '잠', '노래', '3박자', '흔들기'],
      wiki: '자장가',
      clue: '자장가는 조사된 여러 문화에서 발견된다. 대체로 느리고 같은 가락이 되풀이된다.',
      memories: [
        '자장가는 어느 나라에나 있어. 느리고 반복돼',
        '브람스 자장가는 친구 아기한테 준 노래야',
        '흔드는 박자에 맞춰 부르니까 3박자가 많아'
      ],
      related: ['metronome', 'heartbeat'],
      tangents: [
        { to: 'blanket', bridge: '담요 속에서 들리던 노래에서' },
        { to: 'sleep', bridge: '노래 끝에 오는 잠을 따라가다가' }
      ]
    }),
    node({
      id: 'metronome', name: '메트로놈', corner: 'sounds', emoji: '⏱',
      aliases: ['박절기', '템포', '똑딱'],
      keywords: ['박자', '리듬', '멜첼', '베토벤', '세기'],
      wiki: '메트로놈',
      clue: '메트로놈은 1815년 멜첼이 특허를 냈다. 베토벤은 일찍부터 악보에 메트로놈 숫자를 적었다.',
      memories: [
        '1815년 멜첼이 특허를 냈어',
        '베토벤이 처음으로 악보에 메트로놈 숫자를 썼대',
        '똑, 똑, 똑. 세다 보면 수가 돼'
      ],
      related: ['lullaby', 'heartbeat', 'bell'],
      tangents: [
        { to: 'prime', bridge: '똑딱 소리를 세다가 수가 되어서' },
        { to: 'time_sense', bridge: '똑딱 사이가 길게 느껴지는 걸 보다가' }
      ]
    }),
    node({
      id: 'whale_song', name: '고래의 노래', corner: 'sounds', emoji: '🐋',
      aliases: ['고래 노래', '혹등고래', '고래 소리'],
      keywords: ['바다', '노래', '수컷', '유행', '녹음'],
      wiki: '혹등고래',
      clue: '혹등고래의 노래는 해마다 조금씩 바뀐다. 유행처럼, 한 바다의 고래들이 같은 노래를 따라 부른다.',
      memories: [
        '혹등고래 노래는 해마다 조금씩 바뀌어. 유행처럼',
        '1970년에 고래 노래 음반이 나왔어',
        '수컷이 노래하고, 노래는 바다를 멀리 건너가'
      ],
      related: ['echo'],
      tangents: [
        { to: 'octopus', bridge: '바닷속 다른 동물을 떠올리다가' },
        { to: 'memory', bridge: '노래가 해마다 바뀐다는 걸 보고' }
      ]
    }),
    node({
      id: 'bell', name: '종', corner: 'sounds', emoji: '🔔',
      aliases: ['종소리', '풍경', '범종', '에밀레종'],
      keywords: ['청동', '울림', '성덕대왕신종', '음통', '타종'],
      wiki: '종 (악기)',
      clue: '성덕대왕신종은 771년에 완성됐다. 우리 종에는 위에 음통이라는 대롱이 있는데, 다른 나라 종엔 없다.',
      memories: [
        '성덕대왕신종은 771년에 완성됐어',
        '종은 청동이야. 구리에 주석을 섞어',
        '우리 종엔 위에 음통이란 대롱이 있어'
      ],
      related: ['echo', 'metronome'],
      tangents: [
        { to: 'lighthouse', bridge: '안개 속 배에 울리던 종에서' },
        { to: 'hangul', bridge: '종에 새겨진 글자 자리에서' }
      ],
      souvenir: 'bell'
    }),
    node({
      id: 'echo', name: '메아리', corner: 'sounds', emoji: '🗣',
      aliases: ['에코', '울림', '반향'],
      keywords: ['반사', '산', '골짜기', '박쥐', '소리'],
      wiki: '메아리',
      clue: '메아리가 따로 들리려면 벽이 17미터쯤 떨어져 있어야 한다. 박쥐는 메아리로 길을 본다.',
      memories: [
        '메아리는 소리가 벽에 부딪혀 돌아오는 거야',
        '박쥐는 메아리로 길을 봐',
        '17미터쯤 떨어져야 메아리가 따로 들려'
      ],
      related: ['bell', 'thunder', 'whale_song'],
      tangents: [
        { to: 'wind', bridge: '바람이 골짜기에서 돌아오는 소리에서' },
        { to: 'memory', bridge: '돌아오는 소리가 기억 같아서' }
      ]
    }),
    node({
      id: 'thunder', name: '천둥', corner: 'sounds', emoji: '⚡',
      aliases: ['번개', '뇌성', '벼락', '우르릉'],
      keywords: ['빛', '소리', '폭풍', '비', '거리'],
      wiki: '천둥',
      clue: '천둥은 번개가 공기를 갑자기 데워서 터지는 소리다. 번쩍하고 셋을 셀 때마다 1킬로미터쯤 떨어진 것이다.',
      memories: [
        '번개가 공기를 갑자기 데워서 터지는 소리야',
        '번쩍하고 셋 셀 때마다 1킬로미터쯤 떨어진 거래',
        '빛이 먼저 오고 소리가 뒤따라 와'
      ],
      related: ['echo'],
      tangents: [
        { to: 'rain', bridge: '천둥 뒤에 쏟아지는 비를 따라가다가' },
        { to: 'light', bridge: '빛이 먼저 오고 소리가 뒤따르는 걸 보고' }
      ]
    }),
    node({
      id: 'heartbeat', name: '심장 박동', corner: 'sounds', emoji: '💓',
      aliases: ['심장', '맥박', '박동', '고동'],
      keywords: ['청진기', '리듬', '피', '두근', '몸'],
      wiki: '심장',
      clue: '청진기는 1816년 의사가 종이를 말아 가슴에 댄 데서 시작됐다.',
      memories: [
        '문어는 심장이 셋이고 헤엄치면 하나는 잠깐 멈춰',
        '청진기는 1816년에 종이 말아서 시작됐어',
        '큰 동물 심장은 느리게, 작은 동물은 빨리 뛰어'
      ],
      related: ['metronome', 'lullaby'],
      tangents: [
        { to: 'octopus', bridge: '심장이 세 개인 동물 이야기에서' },
        { to: 'time_sense', bridge: '박동으로 시간을 세다가' }
      ]
    }),

    /* ===== home 집과 사람 ===== */
    node({
      id: 'window', name: '창문', corner: 'home', emoji: '🪟',
      aliases: ['창', '창가', '창턱'],
      keywords: ['빗방울', '밖', '빛', '커튼', '집'],
      wiki: '창문',
      clue: '옛 영국에는 창문 수대로 세금을 내던 때가 있었다. 그래서 창을 벽으로 막은 집이 남아 있다.',
      memories: [
        '옛 영국엔 창문 수대로 세금을 냈대',
        '창문은 벽에 낸 눈이야',
        '비 오는 창문은 밖을 흐리게 하고 안을 밝게 해'
      ],
      related: ['candle', 'lantern'],
      tangents: [
        { to: 'rainbow', bridge: '유리에 맺힌 빗방울 속 작은 무지개에서' },
        { to: 'glass', bridge: '울퉁불퉁한 옛 창유리를 보다가' }
      ]
    }),
    node({
      id: 'candle', name: '양초', corner: 'home', emoji: '🕯',
      aliases: ['촛불', '초', '밀랍초', '심지'],
      keywords: ['불꽃', '그림자', '밀랍', '빛', '밤'],
      wiki: '양초',
      clue: '촛불은 바깥쪽이 안쪽보다 뜨겁다. 양초가 줄어드는 걸로 시간을 재던 시계도 있었다.',
      memories: [
        '옛 양초는 짐승 기름이나 밀랍이었어',
        '촛불 바깥쪽이 안쪽보다 뜨거워',
        '양초로 시간을 재던 시계도 있었어'
      ],
      related: ['lantern'],
      tangents: [
        { to: 'time_sense', bridge: '양초가 줄어드는 걸로 시간을 재던 이야기에서' },
        { to: 'light', bridge: '촛불 그림자가 흔들리는 걸 보다가' }
      ],
      souvenir: 'matchbox'
    }),
    node({
      id: 'blanket', name: '담요', corner: 'home', emoji: '🧣',
      aliases: ['이불', '모포', '무릎담요', '퀼트'],
      keywords: ['따뜻함', '양털', '잠', '덮기', '집'],
      wiki: '담요',
      clue: '담요가 따뜻한 건 공기를 가두기 때문이다. 양털 담요는 젖어도 조금은 따뜻하다.',
      memories: [
        '담요가 따뜻한 건 공기를 가둬서야',
        '양털 담요는 젖어도 조금은 따뜻해',
        '덮으면 세상이 조금 작아져'
      ],
      related: ['candle'],
      tangents: [
        { to: 'snow', bridge: '담요 위에 쌓이는 눈을 생각하다가' },
        { to: 'lullaby', bridge: '담요 속에서 들리던 노래에서' }
      ]
    }),
    node({
      id: 'tea', name: '차', corner: 'home', emoji: '🍵',
      aliases: ['녹차', '홍차', '찻잎', '다도', '티'],
      keywords: ['찻잔', '우리기', '잎', '따뜻한 것', '마시기'],
      wiki: '차 (음료)',
      clue: '녹차도 홍차도 같은 나무의 잎이다. 만드는 법이 다를 뿐이다. 물 다음으로 사람들이 많이 마시는 게 차다.',
      memories: [
        '녹차도 홍차도 같은 잎이야. 만드는 법이 달라',
        '물 다음으로 사람들이 많이 마시는 게 차래',
        '찻잎이 펴지는 걸 보는 게 좋아'
      ],
      related: ['candle'],
      tangents: [
        { to: 'salt', bridge: '찻물에 소금을 넣던 옛 차 이야기에서' },
        { to: 'time_sense', bridge: '찻잎이 펴지는 동안을 기다리다가' }
      ]
    }),
    node({
      id: 'moss', name: '이끼', corner: 'home', emoji: '🌿',
      aliases: ['이끼 화분', '선태식물', '물이끼'],
      keywords: ['창턱', '초록', '포자', '습기', '화분'],
      wiki: '선태식물',
      clue: '이끼는 뿌리가 없다. 온몸으로 물을 마신다. 꽃도 씨도 없고, 포자로 퍼진다.',
      memories: [
        '이끼는 뿌리가 없어. 온몸으로 물을 마셔',
        '꽃도 씨도 없고, 포자로 퍼져',
        '창턱 이끼는 비 오는 날 제일 초록이야'
      ],
      related: ['pinecone', 'window'],
      tangents: [
        { to: 'rain', bridge: '이끼가 비를 온몸으로 마시는 걸 보다가' },
        { to: 'time_sense', bridge: '이끼가 아주 천천히 자라는 걸 보다가' }
      ]
    }),
    node({
      id: 'pinecone', name: '솔방울', corner: 'home', emoji: '🌰',
      aliases: ['소나무 열매', '구과', '잣방울'],
      keywords: ['소나무', '비늘', '씨', '나선', '숲'],
      wiki: '솔방울',
      clue: '솔방울은 마르면 비늘이 벌어지고 젖으면 오므라든다. 습도에 따라 움직인다.',
      memories: [
        '솔방울은 마르면 열리고 젖으면 닫혀',
        '비 올지 솔방울이 먼저 알아',
        '비늘이 나선으로 돌아가. 피보나치 수대로'
      ],
      related: ['moss'],
      tangents: [
        { to: 'spiral', bridge: '비늘이 나선으로 도는 걸 세다가' },
        { to: 'rain', bridge: '비 오기 전에 닫히는 솔방울을 보고' }
      ],
      souvenir: 'pinecone'
    }),
    node({
      id: 'lantern', name: '등불', corner: 'home', emoji: '🏮',
      aliases: ['등잔', '랜턴', '초롱', '등'],
      keywords: ['기름', '심지', '불빛', '밤', '방'],
      wiki: '랜턴',
      clue: '옛 등잔은 기름에 심지를 담가 불을 붙였다.',
      memories: [
        '옛 등잔은 기름에 심지를 담갔어',
        '등불 하나 켜면 방이 방이 돼',
        '불빛은 멀리서 보면 작아도 꺼지지 않아'
      ],
      related: ['candle', 'window'],
      tangents: [
        { to: 'lighthouse', bridge: '아주 큰 등불을 떠올리다가' },
        { to: 'light', bridge: '등불 빛이 벽에 번지는 걸 보다가' }
      ]
    }),

    /* ===== mind 생각하는 것 ===== */
    node({
      id: 'dream', name: '꿈', corner: 'mind', emoji: '💤',
      aliases: ['꿈꾸기', '렘수면', '악몽', '꿈결'],
      keywords: ['잠', '밤', '기억', '눈 움직임', '색'],
      wiki: '꿈',
      clue: '꿈은 대부분 깨면 잊힌다. 렘수면 때 눈이 움직이는데, 꿈은 그때 많이 꾼다.',
      memories: [
        '꿈은 대부분 깨면 잊혀',
        '렘수면 때 눈이 움직여. 꿈은 그때 많이 꿔',
        '문어도 자면서 색이 바뀌어. 꿈일지도'
      ],
      related: ['sleep', 'memory', 'slow_room'],
      tangents: [
        { to: 'octopus', bridge: '잠든 몸이 달라지는 모습에서' },
        { to: 'moon', bridge: '꿈속에 뜬 달을 따라가다가' }
      ]
    }),
    node({
      id: 'memory', name: '기억', corner: 'mind', emoji: '🫧',
      aliases: ['추억', '회상', '기억력', '망각'],
      keywords: ['잊기', '냄새', '잠', '에빙하우스', '떠올리기'],
      wiki: '기억',
      clue: '자는 동안 기억이 정리된다고 한다. 에빙하우스는 외운 것을 얼마나 잊는지 그래프로 그렸다.',
      memories: [
        '자는 동안 기억이 정리된대',
        '냄새가 기억을 제일 빨리 불러',
        '에빙하우스는 외운 걸 얼마나 잊는지 그래프로 그렸어'
      ],
      related: ['dream', 'name'],
      tangents: [
        { to: 'octopus_nerves', bridge: '몸에 넓게 퍼진 신경이라는 말에서' },
        { to: 'echo', bridge: '돌아오는 소리가 기억 같아서' }
      ]
    }),
    node({
      id: 'name', name: '이름', corner: 'mind', emoji: '🏷',
      aliases: ['이름 짓기', '명명', '호칭', '별명'],
      keywords: ['부르기', '태풍', '별', '구름', '붙이기'],
      wiki: '이름',
      clue: '태풍에도 이름을 붙인다. 순서대로 미리 정해 둔 이름을 쓴다.',
      memories: [
        '태풍에도 이름을 붙여. 순서대로',
        '이름을 부르면 그게 거기 있다는 뜻이야',
        '이름 없는 것에 이름을 붙이면 보이기 시작해'
      ],
      related: ['memory', 'riddle'],
      tangents: [
        { to: 'cloud_names', bridge: '이름이 붙은 구름에서' },
        { to: 'hangul', bridge: '이름을 적는 글자를 보다가' }
      ]
    }),
    node({
      id: 'time_sense', name: '시간 감각', corner: 'mind', emoji: '⌛',
      aliases: ['시간', '시간감각', '체감 시간', '하루'],
      keywords: ['기다림', '시계', '빠름', '느림', '리듬'],
      wiki: '시간',
      clue: '시간을 느끼는 감각 기관은 따로 없다. 기다릴 땐 길게, 돌아보면 짧게 느끼는 경향이 있다.',
      memories: [
        '시간을 느끼는 감각 기관은 따로 없어',
        '몸 안 시계는 하루 24시간쯤으로 맞춰져 있어',
        '기다릴 땐 길고 돌아보면 짧아'
      ],
      related: ['sleep', 'memory'],
      tangents: [
        { to: 'metronome', bridge: '똑딱 소리 사이가 길게 느껴져서' },
        { to: 'tide', bridge: '하루 두 번 돌아오는 물을 세다가' },
        { to: 'candle', bridge: '줄어드는 양초를 보다가' }
      ]
    }),
    node({
      id: 'sleep', name: '잠', corner: 'mind', emoji: '😴',
      aliases: ['수면', '낮잠', '잠들기', '숙면'],
      keywords: ['꿈', '밤', '쉬기', '문어'],   /* '정리'는 뺐다: 정리해 줘·창고 정리처럼 거의 늘 '치우기·요약' 뜻 */
      wiki: '수면',
      clue: '잠에는 렘수면과 비렘수면이 있고, 하룻밤에 여러 번 번갈아 온다.',
      memories: [
        '문어도 두 가지 잠을 자. 조용한 잠, 바뀌는 잠',
        '자는 동안 뇌가 낮에 쌓인 걸 치워',
        '잠은 아무것도 안 하는 게 아니야'
      ],
      related: ['dream', 'slow_room'],
      tangents: [
        { to: 'octopus', bridge: '문어도 두 가지 잠을 잔다는 걸 보고' },
        { to: 'blanket', bridge: '담요 속으로 들어가다가' }
      ]
    }),
    node({
      id: 'riddle', name: '수수께끼', corner: 'mind', emoji: '❓',
      aliases: ['퀴즈', '난제', '스핑크스', '물음'],
      keywords: ['질문', '답', '놀이', '궁금함', '옛 이야기'],
      wiki: '수수께끼',
      clue: '아침엔 다리 넷, 낮엔 둘, 저녁엔 셋. 스핑크스의 수수께끼다. 답은 사람.',
      memories: [
        '스핑크스 수수께끼 답은 사람이야. 아침엔 넷, 저녁엔 셋',
        '수수께끼는 답보다 질문이 재밌어',
        '옛 노래엔 수수께끼가 많아'
      ],
      related: ['name'],
      tangents: [
        { to: 'knot_theory', bridge: '얽힌 말을 풀어 가는 이야기에서' },
        { to: 'cipher', bridge: '답을 숨긴 글을 읽다가' }
      ]
    }),

    /* ===== 특수 노드 ===== */
    node({
      id: 'slow_room', name: '느린 글의 방', corner: 'mind', emoji: '📖', linger: true,
      aliases: ['느린 방', '느린 글', '조용한 방'],
      keywords: ['앉기', '읽지 않기', '느림', '멈춤'],
      wiki: null,
      peekStatus: 'none',
      clue: '여기엔 풀 문제가 없다. 다음 문장을 이어 쓰지 않아도 된다.',
      memories: [
        '아무것도 안 읽어도 됐어',
        '앉아만 있었는데 그걸로 됐어',
        '글이 느리게 있어서 나도 느려졌어'
      ],
      related: ['sleep'],
      tangents: [
        { to: 'rain', bridge: '창밖 빗소리를 그냥 듣다가' }
      ]
    }),
    node({
      id: 'letter_room', name: '편지의 방', corner: 'home', emoji: '✉', linger: false,
      aliases: ['편지방', '편지'],
      keywords: ['봉투', '진짜 사람', '빈 방'],
      wiki: null,
      peekStatus: 'none',
      alwaysEmpty: true,
      clue: '진짜 사람이 쓴 편지만 놓이는 방. 아직 비어 있다.',
      memories: [
        '아직 비어 있었어',
        '문만 열어 봤어. 비어 있었어',
        '비어 있는 방도 방이야'
      ],
      related: ['stamp'],
      tangents: [
        { to: 'stamp', bridge: '편지가 오면 붙을 우표 자리를 생각하다가' }
      ]
    }),
    node({
      id: 'door_out', name: '밖의 문', corner: 'wild', emoji: '🚪', linger: false,
      aliases: [],
      keywords: [],
      wiki: null,
      urlOnly: true,
      peekStatus: 'simulated',
      scene: 'wild',
      clue: '정적 페이지라 바깥은 못 읽어. 문 앞까지만 갔다 올 수 있어.',
      memories: [
        '문 앞까지만 갔다 왔어',
        '밖은 넓었고, 난 문턱에 서 있었어'
      ],
      related: ['umbrella'],
      tangents: [
        { to: 'lighthouse', bridge: '문 밖 멀리 깜빡이는 불빛을 보다가' }
      ]
    })
  ];

  var nodes = {};
  for (var i = 0; i < nodeList.length; i++) nodes[nodeList[i].id] = nodeList[i];

  /* ---------- 기념품 (§5.7, 16종) ---------- */
  var souvenirs = {
    feather:       { name: '깃털',     emoji: '🪶', asset: 'souvenir.feather' },
    shell:         { name: '조개',     emoji: '🐚', asset: 'souvenir.shell' },
    pebble:        { name: '조약돌',   emoji: '🪨', asset: 'souvenir.pebble' },
    button:        { name: '단추',     emoji: '🔘', asset: 'souvenir.button' },
    leaf:          { name: '나뭇잎',   emoji: '🍂', asset: 'souvenir.leaf' },
    marble:        { name: '유리구슬', emoji: '🔮', asset: 'souvenir.marble' },
    yarn:          { name: '실뭉치',   emoji: '🧶', asset: 'souvenir.yarn' },
    stamp:         { name: '우표',     emoji: '📮', asset: 'souvenir.stamp' },
    matchbox:      { name: '성냥갑',   emoji: '🧨', asset: 'souvenir.matchbox' },
    key:           { name: '열쇠',     emoji: '🗝', asset: 'souvenir.key' },
    pinecone:      { name: '솔방울',   emoji: '🌰', asset: 'souvenir.pinecone' },
    paper_boat:    { name: '종이배',   emoji: '⛵', asset: 'souvenir.paper_boat' },
    bell:          { name: '작은 종',  emoji: '🔔', asset: 'souvenir.bell' },
    map_piece:     { name: '지도 조각', emoji: '🗺', asset: 'souvenir.map_piece' },
    chalk:         { name: '분필',     emoji: '🖍', asset: 'souvenir.chalk' },
    stained_glass: { name: '색유리',   emoji: '🟦', asset: 'souvenir.stained_glass' }
  };

  /* ---------- 스티커 (노드 sticker 키 → 에셋) + 들판 ---------- */
  var stickers = {};
  for (var k = 0; k < nodeList.length; k++) {
    var nd = nodeList[k];
    stickers[nd.sticker] = { emoji: nd.emoji, asset: 'sticker.' + nd.sticker };
  }
  stickers.wild = { emoji: '❔', asset: 'sticker.wild' };

  /* ---------- 집에 있는 날 활동 (§5.8) ----------
     line = 쪽지 앞면, detail = 뒷면 1~2줄, anchor = 문어가 서는 자리.
     requiresPoster / requiresLantern 은 두뇌가 후보를 거를 때 쓴다(포스터 수는 state.posters).
     effect:'rotatePosters' 는 벽 포스터 순서를 한 칸 바꾼다(§5.8) — 바꿀 짝이 있게 2장부터.
     reactions: 그 활동 뒤 마무리 반응 후보. 집에선 처음 온 데·읽은 게 없으니 졸림·덤덤만 (두뇌가 거른다).
       두뇌는 새 난수 없이 이미 뽑은 줄 난수 하나로 고른다. 없으면 졸림.
     maxLantern: 비를 말하는 활동은 비가 확실한 등불 6까지만. 날씨는 두뇌 입력에 없고 app 이 등불로 정한다:
       0~5 비 · 6 가랑비 · 7 맑음(창에 별, 아래 roomLevels) · 8 부터는 날마다 다름 → 7 부터는 비라고 말할 수 없다.
     나머지 활동의 줄은 날씨를 말하지 않는다 (check-world 가 지킨다). */
  /* tap: 그 활동 뒤 문어를 톡 하면 나오는 한 줄 후보 둘 (주인 11-08 '톡 한 줄', BRAIN.tapLine). 이 활동의 앞면 · 뒷면 · 자리에서 나오는 사실만 —
     앞면 · 뒷면과 같은 말(이나 그 속에 든 말)은 아니고, 새 기분 · 길이(쭉 · 한참) · 날씨 · '오늘은' · 처음 · 걸은 얘기 없음. 숫자는 앞면 · 뒷면에 있는 것만 (check-world) */
  var homeActivities = [
    { id: 'count_rain', memo: '창가에서 비 셌어', line: '창가에서 빗방울을 세다가 잠들었어',
      detail: '열일곱까지 셌어. 그다음은 기억이 안 나.\n빗소리가 좋아서 집에 있었어.',
      tap: ['창가 자리에서 잠들었어', '열일곱에서 잠이 들었어'],
      anchor: 'window', weight: 3, maxLantern: 6, reactions: ['졸림'] },
    { id: 'nap', memo: '담요 속에서 낮잠 잤어', line: '담요 속에서 낮잠 잤어',
      detail: '담요 안은 바깥보다 조용했어. 그게 좋았어.\n오늘은 그걸로 충분했어.',
      tap: ['조용한 담요 속에 있었어', '담요를 덮고 한숨 잤어'],
      anchor: 'blanket', weight: 3, reactions: ['졸림'] },
    { id: 'window_watch', memo: '창밖을 그냥 봤어', line: '창밖을 그냥 봤어',
      detail: '비가 오고, 비가 오고, 비가 왔어.\n아무 일도 없었어. 그게 다였어.',
      tap: ['창밖엔 비만 왔어', '창가 자리에 있었어'],
      anchor: 'window', weight: 2, maxLantern: 6, reactions: ['덤덤', '졸림'] },
    { id: 'moss', memo: '이끼 화분을 오래 들여다봤어', line: '창턱 이끼 화분을 오래 들여다봤어',
      detail: '이끼는 뿌리가 없어. 온몸으로 물을 마셔.\n오늘은 흠뻑이야.',
      tap: ['이끼가 흠뻑 젖어 있었어', '창턱 이끼 화분 앞에 있었어'],
      anchor: 'window', weight: 2, requiresLantern: 1, reactions: ['덤덤'] },
    { id: 'reread_poster', memo: '포스터 뒷면을 다시 읽었어', line: '벽 포스터 뒷면을 다시 읽었어',   /* '어제' 아님: 같은 날 앞 산책의 포스터일 수도 있다 */
      detail: '일기 글씨가 작아서 가까이 가서 봤어.\n다 기억나더라.',
      tap: ['벽 포스터 앞에 있었어', '뒷면 일기가 다 기억났어'],
      anchor: 'board', weight: 2, requiresPoster: true, reactions: ['덤덤'] },
    { id: 'rearrange', memo: '벽 포스터 자리를 한 칸 바꿨어', line: '벽 포스터 자리를 한 칸 바꿨어',
      detail: '왼쪽 게 더 잘 보여서.\n벽도 가끔은 바뀌어야 해.',
      tap: ['포스터 순서가 바뀌었어', '벽 앞에서 포스터를 옮겼어'],
      anchor: 'board', weight: 1, requiresPoster: true, effect: 'rotatePosters', reactions: ['덤덤'] },
    { id: 'hum', memo: '아무 노래나 흥얼거렸어', line: '아무 노래나 흥얼거렸어',
      detail: '가사는 없고 박자만 있는 노래.\n박자는 내 맘대로였어.',
      tap: ['가사 없이 흥얼거렸어', '박자는 마음대로 맞췄어'],
      anchor: 'crate', weight: 2, reactions: ['덤덤'] },
    { id: 'nothing', line: '…',
      detail: '',
      anchor: 'blanket', weight: 0 }   /* 빈 차례. 확률은 두뇌가 §5.2 로 정한다(3%). */
  ];

  /* ---------- 마무리 반응 (§5.9) ----------
     lines = 그 반응이면 언제 말해도 참인 줄 (집에 있는 날의 졸림도 이것만 쓴다). 날씨는 말하지 않는다 — 두뇌 입력에 날씨가 없다.
     home = 집에 있는 날에만 쓰는 줄 (덤덤 lines 는 '다녀왔어'를 말하니 집에선 이것). 걸은 일·날씨·처음·'오늘은 끝' 같은 말 없음.
     when.first / when.missed / when.long = 그 일이 실제로 있었을 때만 두뇌가 후보에 더한다:
       first = 처음 온 방이 있었다 · missed = 못 읽음·모의 방문이 있었다 · long = 4곳 이상 걸었다 */
  var reactions = {
    '폴짝': { emoji: '🎉', lines: [
      '모르는 데로 한 발 디뎠어. 그게 재밌었어'
    ], when: { first: [
      '처음 가 본 데가 있었어. 다리가 아직 들썩거려',
      '오늘 길은 처음이었어. 또 가도 처음일 것 같아'
    ] } },
    '우쭐': { emoji: '😌', lines: [
      '끝까지 다 읽었어. 흠, 꽤 잘한 것 같아',
      '한눈 안 팔고 다 봤어. 오늘은 그런 날',
      '네가 흘린 힌트, 끝까지 따라갔어'
    ] },
    '덤덤': { emoji: '😶', lines: [
      '그냥 그런 산책이었어. 그래도 다녀왔어',
      '조용히 다녀왔어. 그거면 됐어'   /* 날씨·거리는 말하지 않는다: 두뇌는 날씨를 모르고(등불 7 은 맑음), 재생된 덤덤은 길 수도 있다 */
    ], home: [
      '이번엔 집에 있었어. 그거면 됐어',
      '나가지 않고 집에 있었어'   /* '오늘은' 아님: 같은 날 나갔다 온 뒤일 수도 있다 */
    ], when: { missed: [
      '못 읽은 데도 있었어. 그런 날도 있어'
    ] } },
    '졸림': { emoji: '😴', lines: [
      '눈이 감겨. 잠깐 자고 일어날게',
      '하품이 나와. 조금만 쉴게'   /* 문어 자신의 상태만. '오늘은 여기까지'·'내일 또' 처럼 오늘 놀이가 끝났다는 말로 읽히지 않게 (초대는 몇 번이든 되고, 낮잠은 20분쯤이면 깬다) */
    ], when: { long: [
      '많이 걸었어. 담요 속으로 들어갈래'
    ] } }
  };

  /* ---------- 한 줄 템플릿 (§5.6) ----------
     치환자: {hint} 힌트 노드 이름, {mem} 기억으로 고른 노드 이름, {memory} 기억 조각 한 줄 */
  var lineTemplates = {
    leftKept: [
      '{hint} 보러 갔다가 딴 데도 들렀는데, 결국 머리에 남은 건 {hint}',
      '{hint}에서 시작해 한눈도 팔았지만, 기억에 남은 건 {hint}. {memory}'
    ],
    followedThenLeft: [
      '{hint} 보러 갔다가 {mem}에 한눈팔았어',
      '{hint}에서 시작했는데 {mem}에 오래 있었어',
      '{hint} 가는 길에 눈에 들어온 건 {mem}. {memory}'
    ],
    followedKept: [
      '{hint}, 끝까지 봤어. {memory}',
      '오늘은 {hint}만 봤어. {memory}',
      '{hint}. {memory}'
    ],
    noHint: [
      '오늘은 {mem}. {memory}',
      '발길 닿는 대로 가다 {mem}에 오래 있었어',
      '{mem}에 갔어. {memory}'
    ],
    ignored: [
      '{hint} 보는 건 다음에. 오늘은 {mem} 쪽이 궁금했어',
      '{hint} 말고 {mem}. {memory}'
    ],
    linger: [
      '느린 글의 방에 앉아만 있었어. 아무것도 안 읽어도 됐어',
      '느린 글의 방. 읽은 건 없고, 그걸로 됐어'
    ],
    wild: [
      '우연히 들른 데가 있어. {mem}. 처음 듣는 이름이야',
      '길을 벗어나 {mem}까지 갔어'
    ]
  };

  /* ---------- 톡 한 줄 (주인 11-08, BRAIN.tapLine) ----------
     깨어 있는 문어를 톡 하면 그날 마지막으로 끝낸 데모 산책에 대해 한 줄 (말풍선만 — 로그 · 앨범 · 저장에 안 남는다). 포스터에 없는 사실 하나를 기록에서만.
     치환자: {p} 기념품이 나온 방 · {s} 기념품 · {w} 들판 글 제목 · {t} 한눈팔기 전 방 · {b} 다른 방 · {a} 포스터 곳 · {l} 마지막 곳 · {x} 못 읽은 · 문 앞까지만 간 곳 ·
       {f} 첫 곳 · {r} 읽은 방 · {n} 들른 곳 수 · {m} 그 밖의 곳 수. 조사는 두뇌 꼴 그대로 ({s}을 · {b}로 · {x}은 — 받침에 맞춰 바뀐다).
     한글 · 숫자 · 띄어쓰기 · 마침표만. 기분 · 취향 · 시간 말(오늘 · 아까 · 내일) · '여기까지' 없음. 22자 안 (check-world · test-brain) */
  var tapTemplates = {
    souvenir: ['{p}에서 {s} 하나 가져왔어'],
    souvenirAny: ['{s} 하나 챙겨 왔어', '{s}을 하나 들고 왔어'],
    wildLink: ['링크 따라 {w}까지 가 봤어'],
    wild: ['들판에서 {w}을 만났어'],
    slowRoom: ['느린 글의 방에선 앉아만 있었어'],
    tangent: ['{t}에서 {b}로 샜어', '{t} 보다가 {b}로 넘어갔어'],
    other: ['{a} 말고 {b}에도 갔어', '{b}에도 기웃거렸어'],
    revisit: ['{b}에 다시 가 봤어'],
    firstOther: ['{b}은 처음이었어', '{b}은 처음 가 봤어'],
    longest: ['{b}에 제일 오래 있었어'],
    tired: ['{l}쯤에서 다리가 무거워졌어'],
    enough: ['{l}에서 이만 돌아왔어', '{l}까지 가니 이만하면 됐다 싶었어'],
    failed: ['{x} 문은 안 열렸어', '{x}은 이름만 보고 왔어'],
    simulated: ['{x}은 문 앞까지만 가 봤어'],
    doorOut: ['바깥 주소는 문 앞까지만 가 봤어'],
    start: ['맨 처음엔 {f}에 갔어'],
    readOne: ['{r} 얘기를 읽고 왔어'],
    count: ['{n} 군데 들렀다 왔어'],
    countMore: ['{a} 말고도 {m} 군데 더 갔어']
  };

  /* ---------- 그때 남긴 메모 (§17.1) ----------
     산책이 끝나는 그 자리에서 두뇌가 남기고, 다음 날은 그대로 읽는다(다시 짓지 않는다).
     tomorrow = lead[lineKind] + '. ' + next[반응]  (60자 넘으면 next 를 뺀다)
     치환자: {hint} 힌트 이름, {mem} 기억한 방, {next} 기억한 방의 이웃 중 이번에 안 간 곳, {n} 며칠 전.
     조사 없는 꼴만 쓴다({mem}에 · {next} 쪽으로). 명령문·자격 기준 언급 금지. 집에 있는 날은 활동의 memo + home. */
  var memoTemplates = {
    lead: {
      followedThenLeft: ['{hint} 보다가 {mem}에 꽂혔어', '{hint}에서 시작했는데 {mem}에 오래 있었어'],
      followedKept: ['{hint} 앞에 오래 있었어', '오늘은 {hint} 하나만 봤어'],
      leftKept: ['한눈은 팔았는데 머리에 남은 건 {hint}'],
      noHint: ['{mem}에 오래 있었어', '발길 닿는 대로 가다 {mem}까지 갔어'],
      ignored: ['{hint} 대신 {mem} 쪽에 갔어'],
      wild: ['길을 벗어나 {mem}까지 갔어'],
      linger: ['느린 글의 방에 앉아만 있었어'],
      letter: ['편지의 방은 아직 비어 있었어'],
      door: ['{hint} 문 앞까지만 갔어'],
      failed: ['{mem} 문이 안 열렸어']
    },
    next: {
      '폴짝': ['내일은 {next} 쪽으로 가 볼까', '내일은 {next} 쪽도 들여다볼까'],
      '우쭐': ['내일은 {next} 쪽으로 더 가 볼까'],
      '덤덤': ['내일은 {next} 쪽으로 가 볼까 말까'],
      '졸림': ['내일은 {next} 쪽으로 천천히 가 볼까']
    },
    nextNone: ['내일은 어디로 갈지 자고 나서 정할래'],
    home: ['내일은 나가 볼까 말까', '내일은 밖에 나가 볼까'],
    /* 같은 힌트 방 재방문: 첫 기웃 행에 붙는 한마디 (조사 없는 꼴) */
    revisit: '{hint}? 그거 {n}일 전에 봤잖아. 이번엔 안쪽까지 가 볼게',
    revisitToday: '{hint}? 그거 아까 봤잖아. 이번엔 안쪽까지 가 볼게',
    revisitUndated: '{hint}? 그거 전에 봤잖아. 이번엔 안쪽까지 가 볼게',
    /* 앱 쪽 문구 */
    lastNote: function (note) { return "지난번 메모: '" + note + "'"; },
    lastWeather: { rain: '지난번엔 비가 왔는데', drizzle: '지난번엔 가는 비였는데', clear: '지난번엔 맑았는데', snow: '지난번엔 눈이 왔는데' },
    sameWeather: { rain: '지난번에도 비가 왔어', drizzle: '지난번에도 가는 비였어', clear: '지난번에도 맑았어', snow: '지난번에도 눈이 왔어' },
    thinking: function (note) { return note + ' 생각 중'; },
    summaryHead: '오늘 바뀐 것',
    summaryParts: { lantern: '등불 +1', rooms: function (n) { return '새 방 ' + n + '곳'; }, souvenir: function (n) { return '기념품 ' + n; }, poster: function (n) { return '포스터 ' + n; }, note: function (n) { return '쪽지 ' + n; } }
  };

  /* ---------- 방 진행표 (§4, 문구 그대로) ---------- */
  var roomLevels = [
    { lantern: 0, text: '아무것도 없는 다락방. 창문 너머로 빗소리.', item: null,      assets: ['room.empty'] },
    { lantern: 1, text: '창가에 이끼 화분이 하나 생겼다.',          item: 'moss',    assets: ['item.moss'] },
    { lantern: 2, text: '낡은 나무 상자가 책상 대신 놓였다.',        item: 'crate',   assets: ['item.crate'] },
    { lantern: 3, text: '구석에 양초가 켜졌다. 그림자가 흔들린다.',  item: 'candle',  assets: ['item.candle'] },
    { lantern: 4, text: '담요 한 장. 방이 조금 따뜻해졌다.',         item: 'blanket', assets: ['item.blanket'] },
    { lantern: 5, text: '벽에 포스터들이 붙기 시작했다.',            item: 'board',   assets: ['item.board'] },
    { lantern: 6, text: '비가 잦아들었다. 창밖이 조용하다.',         item: null,      window: 'drizzle', assets: ['window.drizzle'] },
    { lantern: 7, text: '창문에 별이 보인다. 많이 밝아졌어.',        item: 'shelf',   window: 'stars',   assets: ['window.stars', 'item.shelf'] },
    { lantern: 8, text: '완전히 꾸며진 다락방. 문어의 집.',          item: 'curtain', assets: ['item.curtain'] }
  ];

  /* ---------- 읽기 상태 표기 (§5.4.1) ---------- */
  var peekStatus = {
    read:      { icon: '✅', label: '읽음' },
    builtin:   { icon: '📚', label: '책장 메모' },
    simulated: { icon: '🧪', label: '모의 방문' },
    failed:    { icon: '❌', label: '못 읽음' },
    none:      { icon: '◌',  label: '앉아만 있었음' }
  };

  /* 숫자로 시작하는 방 이름('0')은 문장 속에서 "0이라는 방" ("0 방은 3번 왔어" 대신). 두뇌 roomWord 와 같은 규칙.
     받침: 끝이 숫자면 읽는 소리(영·일·이·삼·사·오·육·칠·팔·구), 한글이면 그 받침. 숫자로 안 시작하면 그대로 */
  /* 문어 이름 뒤 조사: 받침이 있으면 withB, 없으면 without. 한글은 그 받침, 숫자는 읽는 소리, 로마자는 l·m·n 으로 끝날 때만 받침으로 본다
     (Tom이야 · Lucy야 · Mike야 — 영어 이름의 k·t·p 는 '크·트·프' 로 읽혀 받침이 없다). 그 밖의 글자는 받침 없음 쪽 */
  function nameJosa(name, withB, without) {
    var nm = String(name == null ? '' : name).replace(/[^0-9A-Za-z\uAC00-\uD7A3]+$/, '');
    if (!nm) return without;
    var last = nm.charAt(nm.length - 1), c = last.charCodeAt(0), jong;
    if (/[0-9]/.test(last)) jong = '1101001110'.charAt(+last) === '1';
    else if (/[A-Za-z]/.test(last)) jong = /[lmn]$/i.test(nm) || /ng$/i.test(nm);
    else jong = c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 > 0;
    return jong ? withB : without;
  }
  function roomWord(name) {
    var nm = String(name == null ? '' : name);
    if (!/^[0-9]/.test(nm)) return nm;
    var last = nm.charAt(nm.length - 1), c = last.charCodeAt(0);
    var jong = /[0-9]/.test(last) ? '1101001110'.charAt(+last) === '1' : (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 > 0);
    return nm + (jong ? '이라는 방' : '라는 방');
  }

  /* ---------- UI 문구 (세계와 묶이는 것만; app 이 더 보탤 수 있음) ---------- */
  var strings = {
    appTitle: '뽈뽈 문어',
    goButton: '뽈뽈 다녀와',
    awayButton: '다녀오는 중…',
    lookButton: '방 보기',
    /* 이름이 들어가는 문장은 누가 누구를 부르는지 헷갈리지 않게 (DIALOGUE_UI §3 표): 문어는 자기 이름으로 자기를 소개하고,
       집 목소리는 조사를 붙여 문어를 가리킨다 ("뽈뽈 기다리고 있었어" 처럼 조사 없이 쓰면 플레이어를 부르는 말로 읽힌다) */
    firstGreeting: function (name) {   /* 문어가 하는 말 (이름 지은 직후) */
      return '안녕, 나는 ' + name + nameJosa(name, '이야', '야') + '. 비 오는 다락방에 온 걸 환영해.';
    },
    dayGreeting: function (hello, name, asleep) {   /* 집 목소리 (다시 열 때). "기다리고 있었어" 는 뺐다 — 감정을 덧칠하고 "왜 늦게 왔어" 로 읽힌다 */
      return hello + '. ' + name + nameJosa(name, '은', '는') + (asleep ? ' 아직 자고 있어.' : ' 다락방에 있어.');
    },
    departLine: function (name) {   /* 집 목소리 (힌트 없는 출발 행) */
      return name ? name + nameJosa(name, '이', '가') + ' 산책 나갔어' : '산책 나갔어';
    },
    backNote: function (name) {   /* 집 목소리 (8물결 · 놀이방에 있는 동안 문어가 돌아오면 구석 쪽지). 이름이 없으면 '문어가' */
      name = name || '문어';
      return name + nameJosa(name, '이', '가') + ' 돌아왔어.';
    },
    namePrompt: '문어 이름을 지어 줘',
    nameExamples: '예: 뚜루, 안개, 삐죠…',
    nameLater: '이름은 천천히 불러 줘도 괜찮아.',
    defaultName: '이름 없는 문어',
    awayLine: '네가 없는 동안 다녀왔어',
    ignoredHintLine: '오늘은 그쪽 말고 다른 데가 궁금했어',
    simulatedNote: '정적 페이지라 바깥은 못 읽어. 문 앞까지만 갔다 왔어',
    firstVisit: '처음 온 곳이야',
    letterRoomEmpty: '아직 비어 있었어',
    slowRoomNote: '읽은 것 없음',
    homeBack: function (lanternLit) { return lanternLit ? '오늘은 집. 등불 +1' : '오늘은 집'; },   /* '+1' 은 그 차례로 칸이 실제로 켜질 때만 (두뇌 homeTripFrom 의 lanternLeft 와 같은 규칙) */
    homeStay: '오늘은 집에 있을래. 그냥 그러고 싶어서.',   /* 날씨는 말하지 않는다 (두뇌는 날씨를 모른다) */
    emptyTurn: '…',
    albumEmpty: '아직 포스터가 없어. 첫 뽈뽈을 보내 봐',
    albumFilters: { all: '전체', poster: '포스터', note: '쪽지' },
    logTitle: '오늘의 산책',
    albumTitle: '추억 앨범',
    receiptTitle: '일기',   /* 화면 말은 '일기' (데이터 이름 receipt 는 그대로) */
    nthTrip: function (n) { return n + '번째 뽈뽈'; },
    demoChip: '데모 두뇌',
    demoExplain: '이 문어는 데모 두뇌가 움직여. 작은 규칙 뭉치가 어디로 갈지, 집에 있을지, 무엇을 기억할지 고르는 거야. 진짜 모델이 고르는 건 MCP 연결 뒤 이야기야.',
    honestyLine: '지금은 작은 규칙 뭉치가 문어를 움직여. 진짜 모델이 고르는 건 MCP 연결 뒤 이야기야.',
    demoWarning: "여기 버튼은 문어 대신 사람이 고르는 거야. 일기에 '사람이 조작'으로 남아.",   /* index.html #demo .warn-line 과 같은 글 */
    wikiLicense: '위키미디어 공용',
    photoCredit: '사진: 위키미디어 공용',
    followedLabels: { followed: '따라감', ignored: '무시함', left: '도중에 벗어남', none: '없음' },
    byLabels: { demo: '데모 두뇌(규칙)', human: '사람이 조작', mcp: '모델(MCP)', legacy: '복원된 기록' },
    returnReasons: { enough: '이만하면 됐어', tired: '다리가 좀 무거워', linger: '여기서 오래 있었어' },
    legacyPosterLine: '(복원된 포스터 · 기록 없음)',
    affinityCorner: function (cornerName) { return '요즘 ' + cornerName + ' 방을 자꾸 가네'; },
    affinityNode: function (nodeName, n) { var w = roomWord(nodeName); return w + (/방$/.test(w) ? '은 ' : ' 방은 ') + n + '번 왔어'; },   /* '느린 글의 방' → '방 방은' 안 되게, '0' → '0이라는 방은' */
    affinityNone: '아직 어디가 좋은지 모르겠어. 더 다녀 봐야 알겠어',
    logLabels: { depart: '출발', peek: '기웃', 'return': '귀가', remember: '기억', hang_poster: '포스터', wrap_up: '마무리', stay_home: '집', empty_turn: '…' },
    lanternLabel: function (n) { return '등불 ' + n + '/8'; },
    tripsLabel: function (n) { return '여행 ' + n; },
    daysLabel: function (n) { return '함께한 날 ' + n; },
    weather: { rain: '비', drizzle: '가는 비', stars: '맑은 밤', snow: '눈 오는 밤' }
  };

  return {
    version: 2,
    wikiUnverified: true,      /* 위키 제목을 확인하지 못한 채 넣었다. fetch 실패는 builtin 으로 내려간다. */
    wikiBase: 'https://ko.wikipedia.org/wiki/',
    corners: corners,
    nodes: nodes,
    souvenirs: souvenirs,
    homeActivities: homeActivities,
    reactions: reactions,
    lineTemplates: lineTemplates,
    tapTemplates: tapTemplates,
    memoTemplates: memoTemplates,
    roomLevels: roomLevels,
    stickers: stickers,
    scenes: scenes,
    peekStatus: peekStatus,
    strings: strings
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = WORLD;
