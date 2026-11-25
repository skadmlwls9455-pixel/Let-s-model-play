/* 고민 → 뒷면 그림 아이디어 + 레퍼런스용 이미지 프롬프트.
 * 유료 API 를 쓰지 않는다. 고르는 엔진:
 *   ollama  — 내 컴퓨터의 Ollama (http://localhost:11434). 가장 추천.
 *   openai  — OpenAI 호환 로컬 서버 (LM Studio · llama.cpp · Jan …, 예: http://localhost:1234/v1)
 *   webllm  — 브라우저 안에서 바로 (WebGPU, 처음 한 번 모델을 받는다). 실험.
 *   rules   — LLM 없이, 고민 낱말로 고르는 준비된 장면. 언제나 된다.
 * 고민 글은 위 주소 밖으로 나가지 않는다 (주소를 남의 서버로 바꾸지 않는 한).
 */
(function () {
  'use strict';
  var BJ = window.BJ = window.BJ || {};

  var ENGINES = [
    { id: 'ollama', name: 'Ollama (추천)', url: 'http://localhost:11434', model: '' },
    { id: 'openai', name: 'OpenAI 호환 로컬 서버 (LM Studio 등)', url: 'http://localhost:1234/v1', model: '' },
    { id: 'webllm', name: '브라우저 안에서 (WebLLM · 실험)', url: '', model: '' },
    { id: 'rules', name: 'LLM 없이 (준비된 장면)', url: '', model: '' }
  ];

  var SCHEMA = {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      ideas: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' }, scene: { type: 'string' }, pose: { type: 'string' },
            props: { type: 'array', items: { type: 'string' } },
            symbol: { type: 'string' }, caption: { type: 'string' }, prompt_en: { type: 'string' }
          },
          required: ['title', 'scene', 'pose', 'props', 'symbol', 'caption', 'prompt_en']
        }
      }
    },
    required: ['summary', 'ideas']
  };

  var SYSTEM = [
    '너는 사주 상담가 겸 그림 작가를 돕는 그림 기획 도우미다.',
    '작가는 상담 신청자에게 캐릭터 부적을 그려 준다. 앞면에는 신청자의 일주 캐릭터가 있고, 뒷면에는 신청자의 고민이 이미 풀린 순간을 작가가 손으로 그린다.',
    '너의 일: 고민을 읽고 뒷면에 그릴 "고민이 해결된 순간" 장면 아이디어와, 그 장면의 레퍼런스 이미지를 만들 영어 프롬프트를 준다.',
    '',
    '지킬 것',
    '- 주인공은 신청자의 일주 캐릭터다. 주어진 캐릭터 설명(동물 · 색 · 소품)을 그대로 살린다.',
    '- 고민 자체(아픔 · 다툼 · 실패)는 그리지 않는다. 다 풀린 뒤의 밝고 따뜻한 순간을 그린다.',
    '- 고민의 핵심을 한눈에 읽히는 소품 1~3개로 상징한다. 그림 속 글자는 거의 쓰지 않는다.',
    '- 구도는 단순하게: 캐릭터 하나(필요하면 작은 조연 하나) + 소품 몇 개. 손으로 그리기 쉬운 것.',
    '- 무섭거나 슬프거나 위험한 것, 실존 인물 · 브랜드 · 남의 만화 캐릭터는 넣지 않는다.',
    '- 병 · 시험 · 재판처럼 결과를 장담할 수 없는 일은 회복 · 편안함 · 뿌듯함 같은 마음 상태로 그리고, 결과를 약속하지 않는다.',
    '- 고민에 없는 사적인 정보를 지어내지 않는다.',
    '- 한국어 항목은 짧고 쉬운 말로. prompt_en 은 영어로, 그림 내용만 쉼표로 이어서 쓴다 (화풍 문구는 붙이지 않는다).',
    '- JSON 하나로만 답한다. 다른 말은 쓰지 않는다.',
    '',
    'JSON 모양',
    '{"summary": "고민을 한 줄로 (해결된 쪽에서 본 말투)",',
    ' "ideas": [{"title": "장면 제목 (12자 안쪽)", "scene": "장면 설명 2~3문장", "pose": "캐릭터 자세와 표정",',
    '   "props": ["소품", "소품"], "symbol": "무엇이 무엇으로 바뀌었는지 (예: 꽉 막힌 길 → 활짝 열린 문)",',
    '   "caption": "뒷면에 넣을 짧은 한 마디 (15자 안쪽)", "prompt_en": "English image prompt"}]}'
  ].join('\n');

  function buildMessages(input) {
    var d = BJ.chars.describe(input.ilju, input.gender);
    var user = [
      '일주 캐릭터: ' + d.ko,
      '캐릭터 영어 설명: ' + d.en,
      '부적 글자: ' + [input.yearText, input.topText, input.bottomText].filter(Boolean).join(' / '),
      '아이디어 개수: ' + (input.n || 2),
      '고민:',
      '"""',
      String(input.worry || '').trim(),
      '"""'
    ].join('\n');
    return [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }];
  }

  /* ── 응답 읽기 ── */
  function parse(raw) {
    var s = String(raw || '').replace(/<think>[\s\S]*?<\/think>/g, '').replace(/```(?:json)?/g, '');
    var a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a < 0 || b <= a) throw new Error('JSON 을 찾지 못했어요');
    var body = s.slice(a, b + 1), data;
    try { data = JSON.parse(body); }
    catch (e) {
      body = body.replace(/[“”]/g, '"').replace(/,\s*([}\]])/g, '$1');
      data = JSON.parse(body);
    }
    var ideas = Array.isArray(data.ideas) ? data.ideas : (data.title ? [data] : []);
    ideas = ideas.filter(Boolean).map(function (x) {
      return {
        title: str(x.title), scene: str(x.scene), pose: str(x.pose),
        props: Array.isArray(x.props) ? x.props.map(str).filter(Boolean) : (x.props ? String(x.props).split(/[,·]/).map(function (t) { return t.trim(); }).filter(Boolean) : []),
        symbol: str(x.symbol), caption: str(x.caption), prompt_en: str(x.prompt_en || x.prompt)
      };
    });
    if (!ideas.length) throw new Error('아이디어가 비어 있어요');
    return { summary: str(data.summary), ideas: ideas };
  }
  function str(v) { return v == null ? '' : String(v).trim(); }

  /* ── 스트림 읽기 ── */
  function readLines(res, onLine) {
    var reader = res.body.getReader(), dec = new TextDecoder(), buf = '';
    function pump() {
      return reader.read().then(function (r) {
        if (r.done) { if (buf.trim()) onLine(buf); return; }
        buf += dec.decode(r.value, { stream: true });
        var lines = buf.split('\n');
        buf = lines.pop();
        lines.forEach(function (l) { if (l.trim()) onLine(l); });
        return pump();
      });
    }
    return pump();
  }

  function trimSlash(u) { return String(u || '').replace(/\/+$/, ''); }

  function netError(e, cfg) {
    if (e && e.name === 'AbortError') return e;
    var hint = cfg.engine === 'ollama'
      ? '연결이 안 돼요. Ollama 가 켜져 있는지, 그리고 이 사이트 주소를 OLLAMA_ORIGINS 에 넣었는지 봐 주세요 (설정 안내 참고).'
      : '연결이 안 돼요. 로컬 서버가 켜져 있는지, CORS(다른 주소 허용)가 켜져 있는지 봐 주세요.';
    var err = new Error(hint);
    err.cause = e;
    return err;
  }

  /* ── 모델 목록 ── */
  function listModels(cfg) {
    if (cfg.engine === 'ollama') {
      return fetch(trimSlash(cfg.url) + '/api/tags').then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (j) { return (j.models || []).map(function (m) { return m.name; }); })
        .catch(function (e) { throw netError(e, cfg); });
    }
    if (cfg.engine === 'openai') {
      return fetch(trimSlash(cfg.url) + '/models').then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (j) { return (j.data || []).map(function (m) { return m.id; }); })
        .catch(function (e) { throw netError(e, cfg); });
    }
    if (cfg.engine === 'webllm') {
      return loadWebLLM().then(function (w) {
        var ids = w.prebuiltAppConfig.model_list.map(function (m) { return m.model_id; });
        return ids.filter(function (id) { return /q4f16/.test(id) && /(Qwen|gemma|Llama-3\.2|Phi)/i.test(id); });
      });
    }
    return Promise.resolve([]);
  }

  /* ── 엔진별 생성 ── */
  function ollama(cfg, messages, h) {
    var body = { model: cfg.model, messages: messages, stream: true, format: SCHEMA, options: { temperature: 0.8, num_ctx: 4096 }, keep_alive: '10m' };
    return fetch(trimSlash(cfg.url) + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: h.signal })
      .catch(function (e) { throw netError(e, cfg); })
      .then(function (res) {
        if (!res.ok) return res.text().then(function (t) { throw new Error('Ollama 오류 ' + res.status + ': ' + t.slice(0, 200)); });
        var raw = '';
        return readLines(res, function (l) {
          var j; try { j = JSON.parse(l); } catch (e) { return; }
          if (j.error) throw new Error(j.error);
          var t = j.message && j.message.content;
          if (t) { raw += t; h.onToken(t, raw); }
        }).then(function () { return raw; });
      });
  }

  function openai(cfg, messages, h, noFormat) {
    var body = { model: cfg.model || 'local-model', messages: messages, stream: true, temperature: 0.8 };
    if (!noFormat) body.response_format = { type: 'json_schema', json_schema: { name: 'bujeok_ideas', schema: SCHEMA } };
    return fetch(trimSlash(cfg.url) + '/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer local' }, body: JSON.stringify(body), signal: h.signal })
      .catch(function (e) { throw netError(e, cfg); })
      .then(function (res) {
        if (!res.ok) {
          if (!noFormat && (res.status === 400 || res.status === 422)) return openai(cfg, messages, h, true);   /* json_schema 를 모르는 서버 */
          return res.text().then(function (t) { throw new Error('서버 오류 ' + res.status + ': ' + t.slice(0, 200)); });
        }
        var raw = '';
        return readLines(res, function (l) {
          l = l.trim();
          if (l.indexOf('data:') !== 0) return;
          var d = l.slice(5).trim();
          if (d === '[DONE]') return;
          var j; try { j = JSON.parse(d); } catch (e) { return; }
          var t = j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content;
          if (t) { raw += t; h.onToken(t, raw); }
        }).then(function () { return raw; });
      });
  }

  var webllmMod = null, webllmEngine = null, webllmModel = '';
  function loadWebLLM() {
    if (webllmMod) return Promise.resolve(webllmMod);
    return import('https://esm.run/@mlc-ai/web-llm@0.2.79').then(function (m) { webllmMod = m; return m; });
  }
  var WEBLLM_PREFER = ['Qwen3-4B-q4f16_1-MLC', 'Qwen2.5-3B-Instruct-q4f16_1-MLC', 'gemma-2-2b-it-q4f16_1-MLC', 'Llama-3.2-3B-Instruct-q4f16_1-MLC'];

  function webllm(cfg, messages, h) {
    if (!navigator.gpu) return Promise.reject(new Error('이 브라우저는 WebGPU 가 없어서 브라우저 안 모델을 못 돌려요. 크롬 · 엣지 최신판이나 Ollama 를 써 주세요.'));
    return loadWebLLM().then(function (w) {
      var ids = w.prebuiltAppConfig.model_list.map(function (m) { return m.model_id; });
      var model = cfg.model && ids.indexOf(cfg.model) >= 0 ? cfg.model : WEBLLM_PREFER.filter(function (id) { return ids.indexOf(id) >= 0; })[0];
      if (!model) throw new Error('쓸 수 있는 모델을 찾지 못했어요');
      var ready = webllmEngine && webllmModel === model ? Promise.resolve(webllmEngine) :
        w.CreateMLCEngine(model, { initProgressCallback: function (r) { h.onStatus('모델 준비 중 (처음 한 번만 받아요): ' + (r.text || '')); } })
          .then(function (e) { webllmEngine = e; webllmModel = model; return e; });
      return ready.then(function (engine) {
        h.onStatus('생각하는 중…');
        var raw = '';
        var req = { messages: messages, stream: true, temperature: 0.8, response_format: { type: 'json_object', schema: JSON.stringify(SCHEMA) } };
        if (/Qwen3/i.test(model)) req.extra_body = { enable_thinking: false };
        return engine.chat.completions.create(req).then(function (chunks) {
          var it = chunks[Symbol.asyncIterator]();
          function next() {
            if (h.signal && h.signal.aborted) { try { engine.interruptGenerate(); } catch (e) {} return raw; }
            return it.next().then(function (r) {
              if (r.done) return raw;
              var t = r.value.choices && r.value.choices[0] && r.value.choices[0].delta && r.value.choices[0].delta.content;
              if (t) { raw += t; h.onToken(t, raw); }
              return next();
            });
          }
          return next();
        });
      });
    });
  }

  /* ── LLM 없이: 고민 낱말로 장면 고르기 ── */
  var CATS = [
    { id: 'health', words: ['건강', '아프', '아파', '병원', '수술', '입원', '회복', '통증', '허리', '두통', '불면', '잠을', '잠이', '피곤', '다이어트', '체중', '치료', '검사', '약을', '몸이', '컨디션', '병'] },
    { id: 'exam', words: ['시험', '합격', '수능', '공부', '자격증', '면접', '입시', '대학', '성적', '공시', '고시', '토익', '재수', '편입', '논문', '졸업'] },
    { id: 'job', words: ['취업', '이직', '회사', '직장', '상사', '동료', '퇴사', '승진', '연봉', '일자리', '알바', '업무', '야근', '팀장', '출근', '커리어'] },
    { id: 'money', words: ['돈', '빚', '대출', '적자', '월세', '투자', '주식', '코인', '재물', '부자', '저축', '통장', '카드값', '생활비', '이자', '재테크', '금전'] },
    { id: 'love', words: ['연애', '사랑', '짝사랑', '이별', '헤어', '썸', '결혼', '남친', '여친', '남자친구', '여자친구', '소개팅', '배우자', '재회', '고백', '인연', '연인'] },
    { id: 'family', words: ['가족', '엄마', '아빠', '부모', '자식', '아이가', '아들', '딸', '형제', '언니', '오빠', '동생', '시댁', '처가', '남편', '아내', '육아', '임신', '출산', '난임'] },
    { id: 'home', words: ['이사', '집', '청약', '부동산', '전세', '매매', '독립', '방을'] },
    { id: 'business', words: ['사업', '가게', '창업', '매출', '손님', '장사', '폐업', '계약', '거래처', '프리랜서', '고객', '쇼핑몰'] },
    { id: 'mind', words: ['불안', '우울', '걱정', '스트레스', '마음', '외로', '자존감', '번아웃', '무기력', '눈물', '공허', '두려', '예민'] },
    { id: 'people', words: ['친구', '인간관계', '관계', '오해', '싸움', '다툼', '갈등', '화해', '사람들', '눈치', '험담'] },
    { id: 'travel', words: ['여행', '유학', '해외', '비자', '이민', '워홀'] }
  ];

  var SCENES = {
    health: [
      ['훌훌 털고 산책', '{c}가 햇살 가득한 공원길을 가볍게 걸어간다. 손에 들었던 약봉지는 작은 꽃다발로 바뀌어 있다.', '팔을 크게 흔들며 걷는 자세, 개운하게 웃는 얼굴', ['꽃다발', '운동화', '햇살'], '약봉지 → 꽃다발', '몸도 마음도 가뿐하게', '{e} walking lightly on a sunny park path, a medicine bag turned into a small bouquet in its hand, comfy sneakers, warm sunlight'],
      ['푹 자고 일어난 아침', '{c}가 폭신한 이불 속에서 기지개를 켜며 일어난다. 창밖에는 해가 뜨고 머리맡 시계는 조용하다.', '기지개 켜는 자세, 눈 감고 미소', ['폭신한 이불', '떠오르는 해', '조용한 시계'], '뒤척이던 밤 → 개운한 아침', '오늘도 개운하게', '{e} stretching happily in a fluffy bed after a deep sleep, sunrise through the window, a quiet alarm clock'],
      ['튼튼 만세', '{c}가 커다란 하트 방패를 들고 만세를 부른다. 주변에 떠다니던 작은 먹구름은 꽃잎이 되어 흩날린다.', '한 손엔 하트, 한 손은 만세', ['하트 방패', '꽃잎', '반짝이'], '먹구름 → 꽃잎', '튼튼 만세', '{e} cheering with a big heart-shaped shield, tiny dark clouds turning into flower petals around it, sparkles']
    ],
    exam: [
      ['합격 도장 쾅', '{c}가 커다란 종이 위에 둥근 합격 도장을 쾅 찍는다. 연필과 책이 신나서 춤추듯 떠오른다.', '두 손으로 도장을 내리찍는 자세, 뿌듯한 얼굴', ['둥근 도장', '연필', '책'], '빈 답안지 → 꽉 찬 합격 도장', '노력한 만큼 활짝', '{e} stamping a big round seal on a paper with both hands, pencils and books floating happily around, proud face'],
      ['마지막 장을 덮고', '{c}가 두꺼운 책의 마지막 장을 덮고 기지개를 켠다. 책 위에 작은 새싹이 돋아 있다.', '책을 덮으며 기지개, 후련한 표정', ['두꺼운 책', '새싹', '별'], '쌓인 공부 → 돋아난 새싹', '다 피어날 거야', '{e} closing the last page of a thick book and stretching, a small sprout growing on top of the book, little stars'],
      ['꽃길 등굣길', '{c}가 꽃잎이 깔린 길을 가방을 메고 경쾌하게 걸어간다. 길 끝에 활짝 열린 문이 보인다.', '한 발 들고 씩씩하게 걷는 자세', ['꽃길', '책가방', '열린 문'], '막막한 길 → 꽃길 끝 열린 문', '꽃길만 걷자', '{e} walking cheerfully with a school bag on a path covered in flower petals, a wide open door at the end']
    ],
    job: [
      ['새 출입증', '{c}가 새 출입증을 목에 걸고 반짝이는 문 앞에서 손을 흔든다.', '한 손 흔들기, 설레는 얼굴', ['출입증', '반짝이는 문', '서류가방'], '닫힌 문 → 나를 반기는 문', '어서 와, 기다렸어', '{e} wearing a new ID badge, waving in front of a shining open door, holding a small briefcase'],
      ['노을 퇴근길', '{c}가 서류가방을 흔들며 노을 지는 길을 경쾌하게 걸어 나온다. 머리 위로 새들이 날아간다.', '가방을 흔들며 걷는 자세, 홀가분한 얼굴', ['서류가방', '노을', '새'], '야근 → 노을 퇴근', '오늘도 수고했어', '{e} happily walking home at sunset swinging a briefcase, birds flying overhead'],
      ['정리된 책상', '{c}가 깔끔해진 책상 앞에서 따뜻한 차를 들고 웃는다. 쌓였던 서류 더미는 작은 화분이 되었다.', '차를 두 손으로 든 자세, 여유로운 미소', ['찻잔', '화분', '정리된 책상'], '서류 더미 → 작은 화분', '내 자리는 여기', '{e} smiling with a warm cup of tea at a tidy desk, a pile of papers turned into a small potted plant']
    ],
    money: [
      ['꽉 찬 복주머니', '{c}가 엽전이 넘치는 복주머니를 꼭 끌어안고 웃는다. 주머니 끝에서 반짝이가 튀어 오른다.', '주머니를 껴안은 자세, 함박웃음', ['복주머니', '엽전', '반짝이'], '빈 지갑 → 꽉 찬 복주머니', '차곡차곡 든든하게', '{e} hugging a lucky pouch overflowing with old coins, sparkles popping out, big smile'],
      ['영수증 종이비행기', '{c}가 계산서를 종이비행기로 접어 하늘로 날린다. 비행기는 하얀 새가 되어 멀리 날아간다.', '팔을 뻗어 날리는 자세, 시원한 표정', ['종이비행기', '새', '맑은 하늘'], '쌓인 계산서 → 날아가는 새', '훨훨 가벼워져라', '{e} throwing a paper airplane made of bills into the sky, the plane turning into a white bird flying away'],
      ['동전 열매 나무', '{c}가 작은 나무에 물을 준다. 가지마다 동전이 열매처럼 달려 있다.', '물뿌리개를 든 자세, 흐뭇한 얼굴', ['물뿌리개', '동전 열매', '작은 나무'], '메마른 화분 → 동전 열매', '쑥쑥 자라라', '{e} watering a small tree with coins growing like fruit on every branch, holding a watering can']
    ],
    love: [
      ['빨간 실', '{c}의 새끼손가락에 묶인 빨간 실이 멀리 반짝이는 별까지 이어진다.', '손가락을 들어 실을 바라보는 자세, 설레는 얼굴', ['빨간 실', '반짝이는 별', '하트'], '엉킨 실 → 곧게 이어진 실', '닿을 사람에게 닿기를', '{e} looking at a red thread tied to its little finger, the thread leading to a twinkling star far away, small hearts'],
      ['도착한 편지', '{c}가 하트 봉인이 된 편지를 두 손으로 받고 볼이 발그레해진다.', '편지를 가슴에 안은 자세, 수줍은 미소', ['하트 편지', '꽃잎', '반짝이'], '기다림 → 도착한 편지', '마음이 닿았어', '{e} holding a love letter with a heart seal to its chest, shy smile, flower petals around'],
      ['나란히 걷기', '{c}가 작은 짝꿍과 손을 잡고 하트 모양 구름 아래를 나란히 걷는다.', '손잡고 걷는 자세, 편안한 얼굴', ['맞잡은 손', '하트 구름', '길'], '혼자 걷던 길 → 둘이 걷는 길', '같이 걸어서 좋아', '{e} walking hand in hand with a small companion under a heart-shaped cloud']
    ],
    family: [
      ['둥근 밥상', '{c}가 둥근 밥상에 둘러앉은 작은 가족들과 웃으며 밥을 먹는다. 김이 모락모락 난다.', '숟가락을 든 자세, 행복한 얼굴', ['둥근 밥상', '따뜻한 밥', '김'], '서먹한 식탁 → 둘러앉은 밥상', '따뜻한 한 끼', '{e} happily eating with a small family around a round low table, steaming rice bowls'],
      ['큰 우산 아래', '{c}가 큰 우산을 펼쳐 작은 가족들과 함께 쓴다. 우산 밖은 비가 그치고 무지개가 떴다.', '우산을 높이 든 자세, 든든한 얼굴', ['큰 우산', '무지개', '작은 발자국'], '비 오는 날 → 무지개', '우리 집은 맑음', '{e} holding a big umbrella over its little family, the rain stopping and a rainbow appearing'],
      ['꼭 안아 주기', '{c}가 작은 가족을 꼭 안아 준다. 주변에 하트가 퐁퐁 떠오른다.', '두 팔로 감싸 안는 자세, 눈 감고 미소', ['하트', '꽃', '햇살'], '멀어진 마음 → 꼭 안은 품', '늘 곁에 있을게', '{e} giving a warm hug to a small family member, little hearts popping up, soft sunlight']
    ],
    home: [
      ['새 집 열쇠', '{c}가 반짝이는 열쇠를 들고 작은 집 문 앞에 선다. 창문에서 따뜻한 불빛이 새어 나온다.', '열쇠를 들어 보이는 자세, 신난 얼굴', ['열쇠', '작은 집', '따뜻한 창'], '떠도는 짐 → 내 집 열쇠', '어서 와, 내 집', '{e} holding up a shiny key in front of a small cozy house with warm light in the windows'],
      ['짐 다 푼 날', '{c}가 빈 상자 위에 앉아 창밖을 보며 차를 마신다. 창틀에 화분이 놓여 있다.', '상자에 앉아 차 마시는 자세, 느긋한 얼굴', ['빈 상자', '찻잔', '화분'], '쌓인 짐 → 정리 끝', '이제 여기가 우리 집', '{e} sitting on an empty moving box, sipping tea by the window, a potted plant on the sill'],
      ['지붕 위 별', '{c}가 작은 집 지붕 위에 앉아 별을 본다. 굴뚝에서 하트 연기가 오른다.', '무릎을 안고 앉은 자세, 편안한 얼굴', ['지붕', '별', '하트 연기'], '불안한 자리 → 편안한 지붕 아래', '포근한 내 자리', '{e} sitting on the roof of a small house looking at the stars, heart-shaped smoke rising from the chimney']
    ],
    business: [
      ['북적이는 가게', '{c}가 앞치마를 두르고 가게 앞에서 손님들에게 손을 흔든다. 간판에 반짝이가 달렸다.', '손 흔드는 자세, 활짝 웃는 얼굴', ['앞치마', '반짝이는 간판', '작은 손님들'], '텅 빈 가게 → 북적이는 가게', '오늘도 문전성시', '{e} wearing an apron, waving at small customers in front of a cute shop with a sparkling sign'],
      ['오르막 화살표', '{c}가 위로 뻗은 화살표 계단을 경쾌하게 오른다. 계단마다 동전이 반짝인다.', '한 발씩 오르는 자세, 씩씩한 얼굴', ['화살표 계단', '동전', '깃발'], '내리막 → 오르막', '한 계단씩 쑥쑥', '{e} cheerfully climbing stairs shaped like an upward arrow, shiny coins on each step, a small flag at the top'],
      ['도장 꾹 계약서', '{c}가 커다란 종이에 도장을 꾹 찍고 상대와 악수한다.', '악수하는 자세, 뿌듯한 얼굴', ['도장', '종이', '악수'], '망설임 → 맺어진 약속', '좋은 인연, 좋은 거래', '{e} stamping a seal on a big paper and shaking hands with a partner, proud smile']
    ],
    mind: [
      ['구름 위 낮잠', '{c}가 폭신한 구름 위에서 편안하게 낮잠을 잔다. 걱정 구름들은 작은 양떼가 되어 흩어진다.', '대자로 누운 자세, 눈 감고 미소', ['폭신한 구름', '양떼', '햇살'], '걱정 구름 → 양떼', '푹 쉬어도 괜찮아', '{e} napping peacefully on a fluffy cloud, worry clouds turning into a flock of tiny sheep'],
      ['마음 빨래', '{c}가 빨랫줄에 걱정을 널어 말린다. 햇볕에 마른 걱정은 하트가 되어 날아간다.', '빨래집게를 꽂는 자세, 후련한 얼굴', ['빨랫줄', '빨래집게', '하트'], '축축한 걱정 → 보송한 하트', '보송보송 내 마음', '{e} hanging worries on a clothesline to dry in the sun, the dried worries turning into hearts and flying away'],
      ['따뜻한 차 한 잔', '{c}가 담요를 두르고 김이 오르는 차를 마신다. 창밖에는 작은 별들이 떠 있다.', '담요를 두르고 찻잔을 든 자세, 포근한 얼굴', ['담요', '찻잔', '별'], '차가운 밤 → 포근한 밤', '오늘도 잘 버텼어', '{e} wrapped in a blanket, sipping warm tea, little stars outside the window, cozy']
    ],
    people: [
      ['나눠 먹는 떡', '{c}가 친구와 떡을 반으로 나눠 들고 마주 보며 웃는다.', '떡을 내미는 자세, 다정한 얼굴', ['떡', '친구', '하트'], '서먹함 → 나눠 먹는 떡', '반씩 나누면 두 배', '{e} sharing a rice cake split in half with a friend, smiling at each other'],
      ['매듭 풀기', '{c}가 엉킨 실타래를 풀어 예쁜 리본으로 묶는다.', '두 손으로 리본을 묶는 자세, 집중한 얼굴', ['실타래', '리본', '반짝이'], '엉킨 실 → 예쁜 리본', '술술 풀린다', '{e} untangling a messy ball of yarn and tying it into a pretty ribbon'],
      ['같은 우산', '{c}가 친구와 한 우산을 나눠 쓰고 걷는다. 발밑 물웅덩이에 무지개가 비친다.', '우산을 함께 든 자세, 편안한 얼굴', ['우산', '물웅덩이', '무지개'], '각자의 비 → 같이 쓰는 우산', '곁에 있어 줘서 고마워', '{e} sharing one umbrella with a friend, a rainbow reflected in a puddle']
    ],
    travel: [
      ['여권 도장', '{c}가 여권에 찍힌 도장을 자랑하며 캐리어 위에 앉아 있다.', '여권을 펼쳐 보이는 자세, 신난 얼굴', ['여권', '캐리어', '비행기'], '막힌 길 → 열린 하늘길', '어디든 갈 수 있어', '{e} sitting on a suitcase proudly showing a stamped passport, a small airplane in the sky'],
      ['비행기 창가', '{c}가 비행기 창가에 앉아 구름을 내려다본다.', '창에 손을 댄 자세, 설레는 얼굴', ['비행기 창', '구름', '해'], '망설임 → 출발', '좋은 바람이 불어', '{e} looking out of an airplane window at the clouds below, excited'],
      ['지도 위 깃발', '{c}가 커다란 지도 위에 작은 깃발을 꽂는다.', '깃발을 꽂는 자세, 뿌듯한 얼굴', ['지도', '깃발', '나침반'], '흐릿한 길 → 꽂힌 깃발', '내가 가는 곳이 길', '{e} planting a small flag on a big map, a compass nearby']
    ],
    general: [
      ['활짝 열린 문', '{c}가 커다란 문을 활짝 열자 빛과 꽃잎이 쏟아져 들어온다.', '문을 두 손으로 여는 자세, 놀라며 웃는 얼굴', ['큰 문', '빛', '꽃잎'], '닫힌 문 → 활짝 열린 문', '좋은 일이 들어온다', '{e} opening a big door wide, light and flower petals pouring in'],
      ['매듭 풀기', '{c}가 엉킨 실타래를 풀어 예쁜 리본으로 묶는다.', '두 손으로 리본을 묶는 자세, 후련한 얼굴', ['실타래', '리본', '반짝이'], '엉킨 실 → 예쁜 리본', '술술 풀린다', '{e} untangling a messy ball of yarn and tying it into a pretty ribbon'],
      ['떨어진 별 받기', '{c}가 하늘에서 떨어진 별을 두 손으로 받는다. 주변이 반짝인다.', '두 손을 모아 받는 자세, 눈이 반짝이는 얼굴', ['별', '반짝이', '밤하늘'], '바라던 일 → 두 손에 쏙', '소원이 닿았어', '{e} catching a falling star with both hands, sparkles all around, night sky']
    ]
  };

  function rules(input) {
    var text = String(input.worry || ''), scores = [];
    CATS.forEach(function (cat) {
      var n = 0;
      cat.words.forEach(function (w) { if (text.indexOf(w) >= 0) n += w.length > 1 ? 2 : 1; });
      if (n) scores.push([cat.id, n]);
    });
    scores.sort(function (a, b) { return b[1] - a[1]; });
    var cats = scores.length ? scores.map(function (s) { return s[0]; }) : ['general'];
    var info = BJ.ganji.ilju(input.ilju), d = BJ.chars.describe(input.ilju, input.gender);
    var name = info.title + (input.gender === 'm' ? '(남)' : '(여)');
    var n = Math.max(1, Math.min(3, input.n || 2)), seed = BJ.draw.hash(text), ideas = [];
    for (var i = 0; i < n; i++) {
      var cat = cats[i % cats.length], list = SCENES[cat];
      var t = list[(seed + i * 7 + Math.floor(i / cats.length)) % list.length];
      if (ideas.some(function (x) { return x.title === t[0]; })) t = list[(seed + i + 1) % list.length];
      ideas.push({
        title: t[0], scene: t[1].replace(/\{c\}/g, name), pose: t[2], props: t[3].slice(), symbol: t[4], caption: t[5],
        prompt_en: t[6].replace(/\{e\}/g, d.en)
      });
    }
    return { summary: '고민이 다 풀린 뒤의 모습을 그려요 (LLM 없이 고른 장면 — ' + cats.slice(0, 2).map(catName).join(' · ') + ')', ideas: ideas };
  }
  function catName(id) {
    return { health: '건강', exam: '시험 · 합격', job: '일 · 직장', money: '재물', love: '연애', family: '가족', home: '집 · 이사', business: '사업', mind: '마음', people: '관계', travel: '여행', general: '두루' }[id] || id;
  }

  /* cfg = { engine, url, model }, input = { worry, ilju, gender, yearText, topText, bottomText, n }
     h = { onToken(t, raw), onStatus(text), signal } → Promise<{ data, raw }> */
  function generate(cfg, input, h) {
    h = h || {};
    h.onToken = h.onToken || function () {};
    h.onStatus = h.onStatus || function () {};
    if (!String(input.worry || '').trim()) return Promise.reject(new Error('고민 내용을 먼저 적어 주세요'));
    if (cfg.engine === 'rules') return Promise.resolve({ data: rules(input), raw: '' });
    var messages = buildMessages(input), run;
    if (cfg.engine === 'ollama') {
      if (!cfg.model) return Promise.reject(new Error('Ollama 모델을 골라 주세요 (‘모델 불러오기’를 누르면 설치된 모델이 나와요)'));
      h.onStatus('생각하는 중…');
      run = ollama(cfg, messages, h);
    } else if (cfg.engine === 'openai') {
      h.onStatus('생각하는 중…');
      run = openai(cfg, messages, h);
    } else {
      run = webllm(cfg, messages, h);
    }
    return run.then(function (raw) { return { data: parse(raw), raw: raw }; });
  }

  BJ.llm = { ENGINES: ENGINES, SCHEMA: SCHEMA, SYSTEM: SYSTEM, buildMessages: buildMessages, parse: parse, listModels: listModels, generate: generate, rules: rules };
})();
