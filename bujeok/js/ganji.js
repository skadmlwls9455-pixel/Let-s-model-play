/* 간지 자료 · 일주 계산.
 * 천간 색: 갑을 푸른 · 병정 붉은 · 무기 황금 · 경신 흰 · 임계 검은 (오행 목화토금수).
 * 일주 번호 i (0 = 갑자 … 59 = 계해): 천간 i % 10, 지지 i % 12.
 */
(function () {
  'use strict';
  var BJ = window.BJ = window.BJ || {};

  var STEMS = [
    { ko: '갑', hj: '甲', el: 'wood',  yang: true  },
    { ko: '을', hj: '乙', el: 'wood',  yang: false },
    { ko: '병', hj: '丙', el: 'fire',  yang: true  },
    { ko: '정', hj: '丁', el: 'fire',  yang: false },
    { ko: '무', hj: '戊', el: 'earth', yang: true  },
    { ko: '기', hj: '己', el: 'earth', yang: false },
    { ko: '경', hj: '庚', el: 'metal', yang: true  },
    { ko: '신', hj: '辛', el: 'metal', yang: false },
    { ko: '임', hj: '壬', el: 'water', yang: true  },
    { ko: '계', hj: '癸', el: 'water', yang: false }
  ];

  var BRANCHES = [
    { ko: '자', hj: '子', animal: 'rat',     name: '쥐',     en: 'rat' },
    { ko: '축', hj: '丑', animal: 'ox',      name: '소',     en: 'ox' },
    { ko: '인', hj: '寅', animal: 'tiger',   name: '호랑이', en: 'tiger' },
    { ko: '묘', hj: '卯', animal: 'rabbit',  name: '토끼',   en: 'rabbit' },
    { ko: '진', hj: '辰', animal: 'dragon',  name: '용',     en: 'dragon' },
    { ko: '사', hj: '巳', animal: 'snake',   name: '뱀',     en: 'snake' },
    { ko: '오', hj: '午', animal: 'horse',   name: '말',     en: 'horse' },
    { ko: '미', hj: '未', animal: 'sheep',   name: '양',     en: 'sheep' },
    { ko: '신', hj: '申', animal: 'monkey',  name: '원숭이', en: 'monkey' },
    { ko: '유', hj: '酉', animal: 'rooster', name: '닭',     en: 'rooster' },
    { ko: '술', hj: '戌', animal: 'dog',     name: '개',     en: 'dog' },
    { ko: '해', hj: '亥', animal: 'pig',     name: '돼지',   en: 'pig' }
  ];

  /* 천간 색 이름과 영어 (이미지 프롬프트용) */
  var ELEMENTS = {
    wood:  { ko: '목', color: '푸른', en: 'blue' },
    fire:  { ko: '화', color: '붉은', en: 'red' },
    earth: { ko: '토', color: '황금', en: 'golden yellow' },
    metal: { ko: '금', color: '흰',   en: 'white' },
    water: { ko: '수', color: '검은', en: 'black' }
  };

  /* 천간마다 캐릭터가 지니는 것 (그림 · 프롬프트 공통) */
  var STEM_ITEMS = [
    { ko: '머리 위 작은 나무',   en: 'a little tree growing on its head' },
    { ko: '머리에 꽂은 꽃',      en: 'a flower on its head' },
    { ko: '등 뒤의 해',          en: 'a big sun shining behind it' },
    { ko: '손에 든 등불',        en: 'holding a small lantern' },
    { ko: '산 모양 고깔',        en: 'a mountain-shaped little hat' },
    { ko: '밀짚모자와 새싹 화분', en: 'a straw hat, holding a sprout pot' },
    { ko: '투구와 쇠 아령',      en: 'a small helmet, lifting an iron dumbbell' },
    { ko: '보석 머리띠',         en: 'a headband with a gem' },
    { ko: '파도 모자',           en: 'a wave-shaped hat' },
    { ko: '우산과 빗방울',       en: 'holding an umbrella in light rain' }
  ];

  /* 일주 물상 — 전통 풀이의 그림을 짧게 (0 갑자 … 59 계해) */
  var IMAGERY = [
    '겨울 물가에 선 큰 나무', '언 땅을 뚫고 핀 들꽃', '숲 위로 떠오르는 아침 해', '봄밤 꽃밭의 등불',
    '물기를 머금은 큰 산', '볕 잘 드는 초여름 밭', '불 속에서 단련되는 쇠', '따뜻한 흙에 묻힌 보석',
    '바위에서 솟아 흐르는 큰 강', '바위틈의 맑은 샘물', '가을 언덕의 큰 나무', '물 위에 뜬 연꽃',
    '겨울 호수를 비추는 해', '겨울밤 곳간을 밝히는 등불', '호랑이가 사는 큰 산', '새싹이 돋는 봄 정원',
    '용의 기운을 품은 무쇠', '불빛에 반짝이는 보석', '한여름 볕 아래 흐르는 강', '마른 밭을 적시는 단비',
    '바위에 뿌리내린 소나무', '찬 바람 속에 핀 국화', '가을 산 너머 붉은 노을', '밤바다를 밝히는 등대',
    '호수를 품은 겨울 산', '봄을 기다리는 겨울 논밭', '숲을 가르는 도끼', '꽃을 다듬는 은가위',
    '물을 다스리는 흑룡', '햇살 속에 내리는 여우비', '한여름의 무성한 나무', '모래밭에 핀 선인장 꽃',
    '가을 들녘을 물들이는 석양', '보석함을 비추는 촛불', '가을 산을 지키는 성', '강가의 기름진 밭',
    '찬물에 씻긴 칼', '언 흙 속에 잠든 보석', '봄 숲을 적시며 흐르는 강', '봄비 맞은 새싹',
    '기름진 땅에 뿌리내린 나무', '초여름 햇살에 핀 꽃', '한낮의 태양', '여름밤 모닥불',
    '광맥을 품은 산', '황금빛 가을 들판', '가을 성을 지키는 쇠', '맑은 물에 씻긴 진주',
    '한겨울 밤바다', '언 들판에 내린 눈', '하늘로 솟은 거목', '봄 들판의 풀꽃',
    '봄 들판 위의 태양', '초여름 밤의 횃불', '불을 품은 화산', '볕에 달궈진 여름 밭',
    '바위처럼 단단한 쇠', '달빛 아래 빛나는 금', '산을 감싸 도는 큰 물', '모든 물이 모이는 바다'
  ];

  /* 지지마다 발밑 물상 (그림 · 프롬프트 공통) */
  var GROUNDS = [
    { ko: '찰랑이는 겨울 물결', en: 'standing on gentle winter waves' },
    { ko: '눈 내린 언 땅',      en: 'on frosty ground with snowflakes' },
    { ko: '풀숲과 작은 나무',   en: 'on a grassy forest floor with tiny trees' },
    { ko: '꽃 핀 봄 들판',      en: 'on a spring meadow with small flowers' },
    { ko: '발밑의 구름',        en: 'standing on a fluffy cloud' },
    { ko: '볕 드는 초여름 땅',   en: 'on sunny early-summer ground' },
    { ko: '발밑의 작은 불꽃',   en: 'with little flames at its feet' },
    { ko: '볕에 마른 땅',       en: 'on sun-baked dry ground' },
    { ko: '단단한 바위',        en: 'standing on rocks' },
    { ko: '가을 이삭',          en: 'among golden autumn grain' },
    { ko: '낙엽 진 가을 언덕',  en: 'on an autumn hill with fallen leaves' },
    { ko: '굽이치는 강물',      en: 'by a flowing river' }
  ];

  function mod(n, m) { return ((n % m) + m) % m; }

  function ilju(i) {
    i = mod(i, 60);
    var s = STEMS[i % 10], b = BRANCHES[i % 12], e = ELEMENTS[s.el];
    return {
      index: i, stem: i % 10, branch: i % 12,
      ko: s.ko + b.ko, hj: s.hj + b.hj,
      el: s.el, color: e.color, colorEn: e.en,
      animal: b.animal, animalKo: b.name, animalEn: b.en,
      title: e.color + ' ' + b.name,              /* 예: 푸른 쥐 */
      imagery: IMAGERY[i],
      item: STEM_ITEMS[i % 10], ground: GROUNDS[i % 12]
    };
  }

  /* 그레고리력 날짜 → 율리우스 일 번호 */
  function jdn(y, m, d) {
    var a = Math.floor((14 - m) / 12), y2 = y + 4800 - a, m2 = m + 12 * a - 3;
    return d + Math.floor((153 * m2 + 2) / 5) + 365 * y2 + Math.floor(y2 / 4) - Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045;
  }

  /* 양력 생일 → 일주 번호. nextDay: 자시(밤 11시 반 이후) 출생을 다음 날로 넘길 때 */
  function iljuFromDate(y, m, d, nextDay) {
    return mod(jdn(y, m, d) + 49 + (nextDay ? 1 : 0), 60);
  }

  /* 해 → 간지 번호 (2027 → 정미). 입춘이 아니라 달력 해 기준 — 부적 머리에 적는 '해당년도' 용 */
  function yearIndex(y) { return mod(y - 4, 60); }

  function findByKo(name) {
    for (var i = 0; i < 60; i++) if (ilju(i).ko === name) return i;
    return -1;
  }

  BJ.ganji = {
    STEMS: STEMS, BRANCHES: BRANCHES, ELEMENTS: ELEMENTS, IMAGERY: IMAGERY, GROUNDS: GROUNDS, STEM_ITEMS: STEM_ITEMS,
    ilju: ilju, iljuFromDate: iljuFromDate, yearIndex: yearIndex, findByKo: findByKo, mod: mod
  };
})();
