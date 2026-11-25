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

  /* ── 오류: 사람에게 보이는 글은 언제나 한국어 문장 하나 (서버가 준 글은 그 뒤에 붙인다) ── */
  function noop() {}
  function koError(msg, cause) {
    var e = new Error(msg);
    e.bj = true;
    if (cause !== undefined) e.cause = cause;
    return e;
  }
  function abortError() {
    var e;
    try { e = new DOMException('멈췄어요', 'AbortError'); }
    catch (x) { e = new Error('멈췄어요'); e.name = 'AbortError'; }
    return e;
  }
  function isAbort(e) { return !!e && e.name === 'AbortError'; }

  /* p 를 기다리되 signal 이 멈추면 바로 AbortError. p 자체는 뒤에서 계속 돌 수 있다. */
  function abortable(p, signal) {
    if (!signal) return p;
    if (signal.aborted) { p.then(noop, noop); return Promise.reject(abortError()); }
    return new Promise(function (resolve, reject) {
      function onAbort() { reject(abortError()); }
      signal.addEventListener('abort', onAbort);
      p.then(function (v) {
        signal.removeEventListener('abort', onAbort);
        if (signal.aborted) reject(abortError()); else resolve(v);
      }, function (e) {
        signal.removeEventListener('abort', onAbort);
        reject(signal.aborted ? abortError() : e);
      });
    });
  }

  /* 마지막 그물: 내가 만든 한국어 오류가 아니면 한국어 머리말을 붙인다 */
  function finalError(e, signal) {
    if (isAbort(e) || (signal && signal.aborted)) return abortError();
    if (e && e.bj) return e;
    return koError('알 수 없는 문제가 생겼어요' + tail(excerpt((e && e.message) || e)), e);
  }

  function excerpt(t, n) {
    t = String(t == null ? '' : t).replace(/\s+/g, ' ').trim();
    var a = Array.from(t), max = n || 200;
    return a.length > max ? a.slice(0, max).join('') + '…' : t;
  }
  function tail(d) { return d ? ': ' + d : '.'; }

  function errorText(v) {
    if (v == null) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'object') {
      if (typeof v.message === 'string' && v.message) return v.message;
      if (v.error != null) return errorText(v.error);
      if (typeof v.detail === 'string') return v.detail;
      try { return JSON.stringify(v); } catch (e) { return ''; }
    }
    return String(v);
  }
  /* HTTP 오류 본문 → 짧은 한 줄 (JSON 이면 그 안의 메시지, HTML 이면 태그를 걷어 낸 글) */
  function bodyText(t) {
    t = String(t == null ? '' : t);
    var j = null;
    try { j = JSON.parse(t); } catch (e) {}
    if (j && typeof j === 'object') {
      var m = errorText(j.error != null ? j.error : j.detail != null ? j.detail : j);
      if (m) return excerpt(m);
    }
    if (/<[a-z!\/][^>]*>/i.test(t)) t = t.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]*>/g, ' ');
    return excerpt(t);
  }

  var E_DROP = '연결이 중간에 끊겼어요 — 서버가 꺼지거나 멈췄는지 보고 다시 해 주세요.';
  var E_CUT = '답이 길이 한도에 걸려 중간에 끊겼어요 — 아이디어 개수를 줄이거나 다시 해 주세요.';
  var E_PARSE = '답이 JSON 모양이 아니거나 중간에 끊겼어요 — 다시 해 보거나 아이디어 개수를 줄여 주세요.';
  var E_EMPTY = '모델이 빈 답을 보냈어요 — 다시 해 보거나 다른 모델을 골라 주세요.';
  var E_NO_IDEAS = '답에 쓸 만한 아이디어가 없어요 — 다시 해 보거나 다른 모델을 골라 주세요.';

  /* 서버가 보낸 오류 글 가운데 자주 나오는 것은 할 일을 알려 준다 (status: HTTP 오류 응답이면 그 번호) */
  function specialError(engine, d, status) {
    if (!d) return null;
    var st = status ? ' (HTTP ' + status + ')' : '';
    if (/no models? (?:are |is )?loaded|model (?:is )?not loaded|load a model/i.test(d))
      return koError('서버에 불러온 모델이 없어요' + st + ' — LM Studio 등에서 모델을 불러온(Load) 뒤 다시 해 주세요' + tail(d));
    if (/\bmodel\b[^.]*\bnot found|not found[^.]*\bmodel\b|try pulling/i.test(d))
      return koError((engine === 'ollama' ? 'Ollama 에' : '서버에') + ' 그 모델이 없어요' + st + ' — ‘모델 불러오기’로 있는 모델을 골라 주세요' + tail(d));
    if (/context (?:size|length|window)|n_ctx|maximum context|too many tokens|prompt is too long|exceeds? (?:the )?(?:context|maximum)/i.test(d))
      return koError('모델이 한 번에 읽을 수 있는 길이(context)를 넘었어요' + st + ' — 서버에서 context 길이를 4096 이상으로 늘리거나 아이디어 개수를 줄여 주세요' + tail(d));
    return null;
  }
  /* 주소는 닿았지만 그 엔진의 API 가 아닌 곳 (404 · LM Studio 의 “Unexpected endpoint” 등) */
  function notHere(engine, status, d) {
    var st = status ? ' (HTTP ' + status + ')' : '';
    var e = engine === 'ollama'
      ? koError('그 주소에서 Ollama 를 찾지 못했어요' + st + ' — 주소가 http://localhost:11434 처럼 Ollama 를 가리키는지 봐 주세요' + tail(d))
      : koError('그 주소에서 OpenAI 호환 API 를 찾지 못했어요' + st + ' — 주소가 http://localhost:1234/v1 처럼 /v1 로 끝나는지 봐 주세요' + tail(d));
    if (engine === 'openai') e.bjRetryV1 = true;
    return e;
  }
  function badShape(engine) {
    var e = engine === 'ollama'
      ? koError('그 주소의 답이 Ollama 답 모양이 아니에요 — 주소가 http://localhost:11434 처럼 Ollama 를 가리키는지 봐 주세요.')
      : koError('그 주소의 답이 OpenAI 호환 API 답 모양이 아니에요 — 주소가 http://localhost:1234/v1 처럼 적혀 있는지 봐 주세요.');
    if (engine === 'openai') e.bjRetryV1 = true;
    return e;
  }
  function httpError(engine, status, text) {
    var d = bodyText(text);
    var sp = specialError(engine, d, status);
    if (sp) return sp;
    if (status === 404 || (engine === 'openai' && status === 405) || /unexpected endpoint/i.test(d)) return notHere(engine, status, d);
    if (status === 401 || status === 403) return koError('서버가 요청을 막았어요 (HTTP ' + status + ') — 이 앱은 API 키 없이 도는 로컬 서버만 써요' + tail(d));
    return koError((engine === 'ollama' ? 'Ollama 가' : '서버가') + ' HTTP ' + status + ' 오류로 답했어요' + tail(d));
  }
  /* 200 으로 왔지만 본문이나 스트림 안에 든 오류 */
  function serverSaid(engine, v, mid) {
    var d = excerpt(errorText(v));
    var sp = specialError(engine, d);
    if (sp) return sp;
    if (/unexpected endpoint/i.test(d)) return notHere(engine, 0, d);
    return koError((engine === 'ollama' ? 'Ollama 가' : '서버가') + (mid ? ' 답하는 중에 오류를 보냈어요' : ' 오류를 보냈어요') + tail(d));
  }

  /* ── 주소 ── listModels 와 generate 가 같이 쓴다 */
  function engineDef(id) { return ENGINES.filter(function (e) { return e.id === id; })[0]; }

  /* 'localhost:11434' → 'http://localhost:11434', 끝의 / 와 /api · /api/chat · /api/tags · /chat/completions · /models 는 떼어 낸다.
     Ollama 는 /v1 도 뗀다 (Ollama 고유 API 는 뿌리에 있다). */
  function normalizeUrl(engine, url) {
    var u = String(url == null ? '' : url).trim();
    if (!u) { var d = engineDef(engine); u = (d && d.url) || ''; }
    if (!u) return '';
    u = u.replace(/^(https?):\/*/i, function (m, s) { return s.toLowerCase() + '://'; });
    if (!/^[a-z][a-z0-9+.\-]*:\/\//i.test(u)) u = 'http://' + u.replace(/^\/+/, '');
    var p;
    try { p = new URL(u); } catch (e) { return u.replace(/\/+$/, ''); }
    if (p.protocol !== 'http:' && p.protocol !== 'https:') return u.replace(/\/+$/, '');
    var path = p.pathname, prev;
    do {
      prev = path;
      path = path.replace(/\/+$/, '').replace(/\/(?:api\/(?:chat|tags|generate)|api|chat\/completions|completions|models)$/i, '');
      if (engine === 'ollama') path = path.replace(/\/v1$/i, '');
    } while (path !== prev);
    return p.origin + path;
  }
  function baseUrl(cfg) {
    var u = normalizeUrl(cfg.engine, cfg.url), ok = false;
    try { var p = new URL(u); ok = (p.protocol === 'http:' || p.protocol === 'https:') && !!p.hostname; } catch (e) {}
    if (!ok) {
      var d = engineDef(cfg.engine);
      throw koError('서버 주소 모양이 이상해요 (' + excerpt(cfg.url || u, 60) + ') — ' + ((d && d.url) || 'http://localhost:11434') + ' 처럼 적어 주세요.');
    }
    return u;
  }
  /* OpenAI 호환: /models 가 없고 /v1/models 가 답한 주소는 기억해 두고 /v1 을 붙여서 쓴다 */
  var oaFound = {};
  function effectiveUrl(engine, url) {
    var u = normalizeUrl(engine, url);
    return (engine === 'openai' && oaFound[u]) || u;
  }

  /* ── 요청 ── 연결/CORS 안내는 fetch 가 TypeError 로 실패했을 때만 (HTTP 답이 왔다면 서버에는 닿은 것) */
  function connError(engine, url, cause) {
    var s = engine === 'ollama'
      ? '연결이 안 돼요. Ollama 가 켜져 있는지, 그리고 이 사이트 주소를 OLLAMA_ORIGINS 에 넣었는지 봐 주세요 (설정 안내 참고).'
      : '연결이 안 돼요. 로컬 서버가 켜져 있는지, CORS(다른 주소 허용)가 켜져 있는지 봐 주세요.';
    try {
      var u = new URL(url);
      if (location.protocol === 'https:' && u.protocol === 'http:' && !/^(?:localhost|127(?:\.\d+){3}|\[::1\])$/i.test(u.hostname) && !/\.localhost$/i.test(u.hostname))
        s += ' 이 페이지는 https 라서 localhost 가 아닌 http 주소는 브라우저가 막아요 — 페이지를 http 로 열거나 localhost 주소를 써 주세요.';
    } catch (e) {}
    return koError(s, cause);
  }
  function send(engine, url, opts, signal) {
    if (signal && signal.aborted) return Promise.reject(abortError());
    var o = {}, k;
    for (k in (opts || {})) o[k] = opts[k];
    if (signal) o.signal = signal;
    return Promise.resolve().then(function () { return fetch(url, o); }).catch(function (e) {
      if (isAbort(e) || (signal && signal.aborted)) throw abortError();
      if (e && e.name === 'TypeError') throw connError(engine, url, e);
      throw koError('요청을 보내지 못했어요' + tail(excerpt((e && e.message) || e)), e);
    });
  }
  /* soft: 오류 응답의 본문은 못 읽어도 상태 코드로 충분하니 '' 로 */
  function readText(res, signal, soft) {
    return res.text().catch(function (e) {
      if (isAbort(e) || (signal && signal.aborted)) throw abortError();
      if (soft) return '';
      throw koError(E_DROP, e);
    });
  }
  /* 목록 요청은 멈추기 단추가 없으니 오래 걸리면 스스로 그만둔다 */
  function withTimeout(ms, fn) {
    var ctl = typeof AbortController === 'function' ? new AbortController() : null, late = false;
    var timer = ctl && setTimeout(function () { late = true; ctl.abort(); }, ms);
    return fn(ctl && ctl.signal).then(function (v) { clearTimeout(timer); return v; }, function (e) {
      clearTimeout(timer);
      if (late && isAbort(e)) throw koError('서버가 ' + Math.round(ms / 1000) + '초 동안 답하지 않았어요 — 서버가 켜져 있는지, 주소가 맞는지 봐 주세요.');
      throw e;
    });
  }

  /* ── 스트림 읽기 ── 줄마다 onLine. 읽다가 끊기면 한국어로, 멈추면 AbortError 로 */
  function readLines(res, onLine, signal) {
    if (!res.body || typeof res.body.getReader !== 'function') {
      return readText(res, signal).then(function (t) {
        t.split('\n').forEach(function (l) { l = l.replace(/\r$/, ''); if (l.trim()) onLine(l); });
      });
    }
    var reader = res.body.getReader(), dec = new TextDecoder(), buf = '';
    function cancel() { try { reader.cancel().catch(noop); } catch (e) {} }
    function fail(e) {
      if (isAbort(e) || (signal && signal.aborted)) throw abortError();
      throw koError(E_DROP, e);
    }
    function handle(r) {
      if (signal && signal.aborted) throw abortError();
      if (r.done) { buf += dec.decode(); if (buf.trim()) onLine(buf.replace(/\r$/, '')); return; }
      buf += dec.decode(r.value, { stream: true });
      var lines = buf.split('\n');
      buf = lines.pop();
      for (var i = 0; i < lines.length; i++) {
        var l = lines[i].replace(/\r$/, '');
        if (l.trim()) onLine(l);
      }
      return step();
    }
    function step() { return reader.read().then(handle, fail); }
    return step().catch(function (e) { cancel(); throw e; });
  }

  /* ── 응답 읽기 ── */
  /* s[i] 의 { 또는 [ 와 짝이 맞는 닫는 괄호 자리 (문자열 안의 괄호는 세지 않는다). 끝까지 안 닫히면 -1 */
  function closeAt(s, i) {
    var depth = 0, inStr = false, esc = false;
    for (var j = i; j < s.length; j++) {
      var c = s.charAt(j);
      if (inStr) {
        if (esc) esc = false;
        else if (c === '\\') esc = true;
        else if (c === '"') inStr = false;
        continue;
      }
      if (c === '"') inStr = true;
      else if (c === '{' || c === '[') depth++;
      else if (c === '}' || c === ']') { depth--; if (depth === 0) return j; if (depth < 0) return -1; }
    }
    return -1;
  }
  function nextSolid(s, i) {
    while (i < s.length && /\s/.test(s.charAt(i))) i++;
    return s.charAt(i);
  }
  /* 문자열 밖의 꼬리 쉼표 빼기, 구분자로 쓰인 굽은 따옴표만 " 로, 문자열 안 줄바꿈은 \n 으로, 문자열 밖 // · 주석 빼기 */
  function repairJson(t) {
    var out = '', mode = 0, last = '';   /* mode 0: 밖, 1: "…" 안, 2: 굽은 따옴표 문자열 안 */
    for (var i = 0; i < t.length; i++) {
      var c = t.charAt(i);
      if (mode === 0) {
        if (c === '"') { mode = 1; out += c; last = c; continue; }
        if ((c === '“' || c === '”') && /[{\[,:]/.test(last)) { mode = 2; out += '"'; last = '"'; continue; }
        if (c === ',' && /[}\]]/.test(nextSolid(t, i + 1))) continue;
        if (c === '/' && t.charAt(i + 1) === '/') { while (i < t.length && t.charAt(i) !== '\n') i++; continue; }
        if (c === '/' && t.charAt(i + 1) === '*') { var z = t.indexOf('*/', i + 2); i = z < 0 ? t.length : z + 1; continue; }
        out += c;
        if (!/\s/.test(c)) last = c;
        continue;
      }
      if (c === '\\') { out += c + t.charAt(i + 1); i++; continue; }
      if (mode === 1 && c === '"') { mode = 0; out += c; last = c; continue; }
      if (mode === 2 && (c === '“' || c === '”' || c === '"')) {
        var nx = nextSolid(t, i + 1);
        if (nx === '' || /[:,}\]]/.test(nx)) { mode = 0; out += '"'; last = '"'; continue; }
        if (c === '"') { out += '\\"'; continue; }
        out += c;
        continue;
      }
      if (c === '\n') { out += '\\n'; continue; }
      if (c === '\r') { out += '\\r'; continue; }
      if (c === '\t') { out += '\\t'; continue; }
      if (c < ' ') { out += '\\u' + ('000' + c.charCodeAt(0).toString(16)).slice(-4); continue; }
      out += c;
    }
    return out;
  }
  function looseJson(t) {
    try { return JSON.parse(t); } catch (e) {}
    var r = repairJson(t);
    try { return JSON.parse(r); } catch (e) {}
    return undefined;
  }
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

  function str(v) {
    if (v == null) return '';
    if (Array.isArray(v)) return v.map(str).filter(Boolean).join(' ');
    if (typeof v === 'object') return '';
    return String(v).trim();
  }
  function shortTitle(s) {
    var line = s.split(/[\n.!?。]/)[0].trim() || s;
    if (Array.from(line).length <= 12) return line;
    var cut = Array.from(line).slice(0, 12).join(''), sp = cut.lastIndexOf(' ');
    if (sp >= 6) cut = cut.slice(0, sp);
    return cut.replace(/[\s,·]+$/, '') + '…';
  }
  function toIdea(x) {
    if (typeof x === 'string' || typeof x === 'number') {
      var s = String(x).trim();
      if (!s) return null;
      return { title: shortTitle(s), scene: s, pose: '', props: [], symbol: '', caption: '', prompt_en: '' };
    }
    if (!isObj(x)) return null;
    var title = str(x.title);
    if (!title) return null;
    var props = Array.isArray(x.props) ? x.props.map(str).filter(Boolean)
      : (typeof x.props === 'string' ? x.props.split(/[,·、]/).map(function (t) { return t.trim(); }).filter(Boolean) : []);
    return { title: title, scene: str(x.scene), pose: str(x.pose), props: props, symbol: str(x.symbol), caption: str(x.caption), prompt_en: str(x.prompt_en || x.prompt) };
  }
  function ideasOf(list) { return list.map(toIdea).filter(Boolean); }

  /* 모델 답에서 JSON 을 찾는다: 생각 블록을 걷어 내고, 여는 { 마다 짝 맞는 괄호까지 잘라 읽어 본다.
     ideas 배열이 든 첫 덩어리를 쓰고, 없으면 가장 큰 바깥 덩어리(아이디어 하나짜리)를 쓴다. */
  function parse(raw) {
    var s = String(raw == null ? '' : raw);
    if (!s.trim()) throw koError(E_EMPTY);
    var closeRe = /<\/(?:think|thinking|reasoning)>/gi, m, cut = -1;
    while ((m = closeRe.exec(s))) cut = m.index + m[0].length;
    if (cut >= 0) s = s.slice(cut);
    var open = s.search(/<(?:think|thinking|reasoning)>/i);
    if (open >= 0) s = s.slice(0, open);

    var sawIdeas = false, best = null, bestLen = -1, covered = -1;
    var first = s.search(/[\[{]/);
    if (first >= 0 && s.charAt(first) === '[') {   /* 아이디어 배열만 온 경우 */
      var ae = closeAt(s, first), arr = ae > 0 ? looseJson(s.slice(first, ae + 1)) : undefined;
      if (Array.isArray(arr)) {
        var ai = ideasOf(arr);
        if (ai.length) return { summary: '', ideas: ai };
        if (arr.length) sawIdeas = true;
      }
    }
    for (var i = s.indexOf('{'); i >= 0; i = s.indexOf('{', i + 1)) {
      var end = closeAt(s, i), top = i > covered;
      if (end < 0) { if (top) covered = s.length; continue; }
      if (top) covered = end;
      var obj = looseJson(s.slice(i, end + 1));
      if (!isObj(obj)) continue;
      var list = Array.isArray(obj.ideas) ? obj.ideas : isObj(obj.ideas) ? [obj.ideas] : null;
      if (list) {
        sawIdeas = true;
        var ideas = ideasOf(list);
        if (ideas.length) return { summary: str(obj.summary), ideas: ideas };
        continue;
      }
      if (top && end + 1 - i > bestLen) { best = obj; bestLen = end + 1 - i; }
    }
    if (best) {
      var one = toIdea(best);
      if (one) return { summary: str(best.summary), ideas: [one] };
    }
    throw koError(sawIdeas ? E_NO_IDEAS : E_PARSE);
  }

  /* ── 모델 목록 ── 빈 목록은 [] (안내 글은 앱이 엔진에 맞게) */
  function listModels(cfg) {
    cfg = cfg || {};
    var p;
    try {
      if (cfg.engine === 'ollama') p = ollamaModels(baseUrl(cfg));
      else if (cfg.engine === 'openai') p = openaiModels(baseUrl(cfg));
      else if (cfg.engine === 'webllm') p = webllmModels();
      else p = Promise.resolve([]);
    } catch (e) { p = Promise.reject(e); }
    return p.catch(function (e) { throw finalError(e, null); });
  }
  function uniqNames(list) {
    var seen = {}, out = [];
    list.forEach(function (m) {
      var id = typeof m === 'string' ? m : m && (m.id || m.name || m.model);
      id = id == null ? '' : String(id).trim();
      if (id && !seen[id]) { seen[id] = 1; out.push(id); }
    });
    return out;
  }
  function ollamaModels(base) {
    return withTimeout(20000, function (signal) {
      return send('ollama', base + '/api/tags', {}, signal).then(function (res) {
        return readText(res, signal, !res.ok).then(function (t) {
          if (!res.ok) throw httpError('ollama', res.status, t);
          var j = null;
          try { j = JSON.parse(t); } catch (e) {}
          if (isObj(j) && j.error != null) throw serverSaid('ollama', j.error);
          if (!isObj(j) || !Array.isArray(j.models)) throw badShape('ollama');
          return uniqNames(j.models);
        });
      });
    });
  }
  function oaModelsAt(url) {
    return withTimeout(20000, function (signal) {
      return send('openai', url + '/models', {}, signal).then(function (res) {
        return readText(res, signal, !res.ok).then(function (t) {
          if (!res.ok) throw httpError('openai', res.status, t);
          var j = null;
          try { j = JSON.parse(t); } catch (e) {}
          if (isObj(j) && j.error != null) throw serverSaid('openai', j.error);
          var arr = Array.isArray(j) ? j : isObj(j) ? (Array.isArray(j.data) ? j.data : Array.isArray(j.models) ? j.models : null) : null;
          if (!arr) throw badShape('openai');
          return uniqNames(arr);
        });
      });
    });
  }
  function openaiModels(base) {
    return oaModelsAt(base).then(function (list) { delete oaFound[base]; return list; }, function (e) {
      if (!(e && e.bjRetryV1) || /\/v1$/i.test(base)) throw e;
      return oaModelsAt(base + '/v1').then(function (list) { oaFound[base] = base + '/v1'; return list; }, function () { throw e; });
    });
  }

  /* ── 엔진별 생성 ── 모두 { raw, cut } 로 끝난다 (cut: 길이 한도로 끊김) */
  function ollama(base, cfg, messages, h) {
    var body = { model: cfg.model, messages: messages, stream: true, format: SCHEMA, options: { temperature: 0.8, num_ctx: 4096 }, keep_alive: '10m' };
    return send('ollama', base + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, h.signal)
      .then(function (res) {
        if (!res.ok) return readText(res, h.signal, true).then(function (t) { throw httpError('ollama', res.status, t); });
        var raw = '', reason = '', good = 0, junk = 0;
        return readLines(res, function (l) {
          var j;
          try { j = JSON.parse(l); } catch (e) { junk++; return; }
          if (!isObj(j)) { junk++; return; }
          good++;
          if (j.error != null) throw serverSaid('ollama', j.error, raw.length > 0);
          var t = j.message && j.message.content;
          if (typeof t === 'string' && t) { raw += t; h.onToken(t, raw); }
          if (j.done) reason = j.done_reason || 'stop';
        }, h.signal).then(function () {
          if (!good && junk) throw badShape('ollama');
          return { raw: raw, cut: reason === 'length' };
        });
      });
  }

  /* SSE 한 줄씩: data: {...} · data: [DONE] · event: error · 옛 서버들의 error: {...} 줄 · 스트림 안 {"error":…} */
  function sseReader(h) {
    var st = { raw: '', finish: '', ev: '', seen: 0, lines: 0 };
    st.line = function (l) {
      var line = l.trim();
      if (!line || line.charAt(0) === ':') return;
      st.lines++;
      var m = /^([a-z_]+):\s?([\s\S]*)$/i.exec(line), d;
      if (m) {
        var field = m[1].toLowerCase();
        if (field === 'event') { st.ev = m[2].trim().toLowerCase(); return; }
        if (field === 'error') { st.seen++; throw serverSaid('openai', jsonOr(m[2]), st.raw.length > 0); }
        if (field !== 'data') return;
        d = m[2].trim();
      } else d = line;
      if (d === '[DONE]') { st.ev = ''; st.seen++; return; }
      var j;
      try { j = JSON.parse(d); } catch (e) {
        if (st.ev === 'error') { st.seen++; throw serverSaid('openai', d, st.raw.length > 0); }
        return;
      }
      st.seen++;
      if (st.ev === 'error' || (isObj(j) && j.error != null)) throw serverSaid('openai', isObj(j) && j.error != null ? j.error : j, st.raw.length > 0);
      st.ev = '';
      var c = isObj(j) && Array.isArray(j.choices) ? j.choices[0] : null;
      if (!c) return;
      var t = c.delta && c.delta.content;
      if (t == null && c.message) t = c.message.content;
      if (t == null && typeof c.text === 'string') t = c.text;
      if (typeof t === 'string' && t) { st.raw += t; h.onToken(t, st.raw); }
      if (c.finish_reason) st.finish = c.finish_reason;
    };
    return st;
  }
  function jsonOr(t) { try { return JSON.parse(t); } catch (e) { return t; } }

  function oaChat(url, cfg, messages, h, noFormat) {
    var body = { model: cfg.model || 'local-model', messages: messages, stream: true, temperature: 0.8 };
    if (!noFormat) body.response_format = { type: 'json_schema', json_schema: { name: 'bujeok_ideas', schema: SCHEMA } };
    return send('openai', url + '/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer local' }, body: JSON.stringify(body) }, h.signal)
      .then(function (res) {
        if (!res.ok) {
          return readText(res, h.signal, true).then(function (t) {
            if (!noFormat && (res.status === 400 || res.status === 422)) return oaChat(url, cfg, messages, h, true);   /* json_schema 를 모르는 서버 */
            throw httpError('openai', res.status, t);
          });
        }
        var sse = sseReader(h), ct = String(res.headers.get('content-type') || '').toLowerCase();
        function done() {
          if (!sse.seen) {
            if (sse.lines) throw badShape('openai');
            throw koError(E_EMPTY);
          }
          return { raw: sse.raw, cut: sse.finish === 'length' };
        }
        if (/json/.test(ct) && !/event-stream|ndjson/.test(ct)) {
          /* 스트림이 아닌 한 덩어리 답: 오류이거나, stream 을 무시한 서버 */
          return readText(res, h.signal).then(function (t) {
            var j = null;
            try { j = JSON.parse(t); } catch (e) {}
            if (isObj(j)) {
              if (j.error != null) throw serverSaid('openai', j.error);
              var c = Array.isArray(j.choices) ? j.choices[0] : null, content = c && c.message ? c.message.content : c && c.text;
              if (typeof content !== 'string') throw badShape('openai');
              if (content) h.onToken(content, content);
              return { raw: content, cut: !!c && c.finish_reason === 'length' };
            }
            t.split('\n').forEach(function (l) { sse.line(l.replace(/\r$/, '')); });
            return done();
          });
        }
        return readLines(res, sse.line, h.signal).then(done);
      });
  }
  function openai(base, cfg, messages, h) {
    var url = oaFound[base] || base;
    return oaChat(url, cfg, messages, h, false).catch(function (e) {
      if (!(e && e.bjRetryV1) || /\/v1$/i.test(url) || (h.signal && h.signal.aborted)) throw e;
      return oaChat(url + '/v1', cfg, messages, h, false).then(function (r) { oaFound[base] = url + '/v1'; return r; }, function (e2) {
        throw isAbort(e2) || !(e2 && e2.bjRetryV1) ? e2 : e;
      });
    });
  }

  /* ── WebLLM (브라우저 안) ──
     GPU 확인 → 모듈 받기 → 모델 올리기 → 생성. 어느 단계에서든 멈추면 곧바로 AbortError.
     받던 모듈/모델은 뒤에서 마저 받아 두고, 다음에 같은 모델이면 그 진행 중인 것을 다시 쓴다. */
  var WEBLLM_URL = 'https://esm.run/@mlc-ai/web-llm@0.2.79';
  var WEBLLM_PREFER = ['Qwen3-4B-q4f16_1-MLC', 'Qwen2.5-3B-Instruct-q4f16_1-MLC', 'gemma-2-2b-it-q4f16_1-MLC', 'Llama-3.2-3B-Instruct-q4f16_1-MLC'];
  var E_WEBGPU = '이 브라우저는 WebGPU 가 없어서 브라우저 안 모델을 못 돌려요. 크롬 · 엣지 최신판이나 Ollama 를 써 주세요.';
  var webllmMod = null, webllmImport = null;
  var webllmEngine = null, webllmModel = '', webllmLoading = null, webllmBusy = Promise.resolve();
  var webllmWatch = null, webllmLast = '';

  /* navigator.gpu 가 있어도 쓸 수 있는 GPU(adapter)가 없으면 못 돌린다. f16: shader-f16 을 쓸 수 있는지 */
  function gpuInfo() {
    var gpu = typeof navigator !== 'undefined' ? navigator.gpu : null;
    if (!gpu || typeof gpu.requestAdapter !== 'function') return Promise.reject(koError(E_WEBGPU));
    var timer, late = new Promise(function (resolve) { timer = setTimeout(function () { resolve(null); }, 20000); });
    var ask = Promise.resolve().then(function () { return gpu.requestAdapter({ powerPreference: 'high-performance' }); });
    return Promise.race([ask, late]).then(function (ad) {
      clearTimeout(timer);
      if (!ad) throw koError(E_WEBGPU);
      var f16 = false;
      try { f16 = !!(ad.features && typeof ad.features.has === 'function' && ad.features.has('shader-f16')); } catch (e) {}
      return { f16: f16 };
    }, function (e) { clearTimeout(timer); throw koError(E_WEBGPU, e); });
  }
  function loadWebLLM() {
    if (webllmMod) return Promise.resolve(webllmMod);
    if (!webllmImport) {
      webllmImport = Promise.resolve().then(function () { return import(WEBLLM_URL); }).then(function (m) {
        if (!m || typeof m.CreateMLCEngine !== 'function' || !m.prebuiltAppConfig) throw new Error('WebLLM module has no CreateMLCEngine');
        webllmMod = m;
        webllmImport = null;
        return m;
      }).catch(function (e) {
        webllmImport = null;
        throw koError('WebLLM 모듈을 받지 못했어요 — 인터넷 연결을 확인해 주세요.', e);
      });
    }
    return webllmImport;
  }
  function webllmRecords(w) {
    var list = w && w.prebuiltAppConfig && w.prebuiltAppConfig.model_list;
    return Array.isArray(list) ? list.filter(function (r) { return r && typeof r.model_id === 'string'; }) : [];
  }
  /* 이 앱의 글(한국어 1,200자 남짓 + JSON 답)을 다룰 수 있는 대화 모델만, 고를 만한 순서로 */
  function usableWebllm(w, f16) {
    var q = f16 ? /q4f16/ : /q4f32/;
    var ids = webllmRecords(w).filter(function (r) {
      var id = r.model_id, ctx = r.overrides && r.overrides.context_window_size;
      if (!q.test(id) || !/(Qwen|gemma|Llama-3\.2|Phi)/i.test(id)) return false;
      if (/-1k$/i.test(id) || (typeof ctx === 'number' && ctx > 0 && ctx < 4096)) return false;
      if (r.model_type === 1 || r.model_type === 2 || /vision|embed/i.test(id)) return false;
      if (/Coder|Math/i.test(id) || /^phi-(?:1_5|2)-/i.test(id)) return false;
      if (!f16 && Array.isArray(r.required_features) && r.required_features.indexOf('shader-f16') >= 0) return false;
      return true;
    }).map(function (r) { return r.model_id; });
    var prefer = WEBLLM_PREFER.map(function (id) { return f16 ? id : id.replace('q4f16', 'q4f32'); }).filter(function (id) { return ids.indexOf(id) >= 0; });
    return prefer.concat(ids.filter(function (id) { return prefer.indexOf(id) < 0; }));
  }
  function webllmModels() {
    return gpuInfo().then(function (gpu) {
      return loadWebLLM().then(function (w) { return usableWebllm(w, gpu.f16); });
    });
  }
  function pickWebllm(w, wanted, f16) {
    var ids = webllmRecords(w).map(function (r) { return r.model_id; });
    wanted = String(wanted || '').trim();
    if (wanted) {
      var alt = !f16 && /q4f16/.test(wanted) ? wanted.replace(/q4f16/g, 'q4f32') : '';
      if (alt && ids.indexOf(alt) >= 0) return alt;
      if (ids.indexOf(wanted) >= 0) return wanted;
    }
    return usableWebllm(w, f16)[0] || '';
  }
  function progressText(r) {
    var t = String((r && r.text) || ''), p = r && typeof r.progress === 'number' && isFinite(r.progress) ? r.progress : null;
    if (p == null) { var m = /(\d{1,3})% completed/.exec(t); if (m) p = +m[1] / 100; }
    var mb = /(\d+(?:\.\d+)?)\s*MB (?:fetched|loaded)/i.exec(t);
    var s = '모델 준비 중 (처음 한 번만 받아요)';
    if (p != null) s += ' · ' + Math.max(0, Math.min(100, Math.round(p * 100))) + '%';
    if (mb) s += ' · ' + Math.round(+mb[1]) + 'MB';
    return s + '…';
  }
  /* 진행 글은 지금 기다리는 실행 하나에만 보낸다 (멈춘 실행의 상태 글을 덮지 않게). 1초에 한 번쯤만. */
  function onWebllmProgress(r) {
    var s = progressText(r), w = webllmWatch, now = Date.now();
    webllmLast = s;
    if (!w || s === w.shown || (w.at && now - w.at < 1000 && !/ 100%/.test(s))) return;
    w.shown = s; w.at = now;
    try { w.onStatus(s); } catch (e) {}
  }
  /* 모델 하나에 CreateMLCEngine 은 한 번만: 진행 중이면 그 약속을 같이 기다린다 */
  function ensureEngine(w, model) {
    if (webllmLoading && webllmLoading.model === model) return webllmLoading.promise;
    if (!webllmLoading && webllmEngine && webllmModel === model) return Promise.resolve(webllmEngine);
    var before = Promise.all([webllmLoading ? webllmLoading.promise.then(noop, noop) : null, webllmBusy]);
    var entry = { model: model, promise: null };
    entry.promise = before.then(function () {
      if (webllmEngine && webllmModel === model) return webllmEngine;
      var old = webllmEngine;
      webllmEngine = null; webllmModel = '';
      var free = old && typeof old.unload === 'function' ? Promise.resolve().then(function () { return old.unload(); }).then(noop, noop) : Promise.resolve();
      return free.then(function () {
        return w.CreateMLCEngine(model, { initProgressCallback: onWebllmProgress });
      }).then(function (engine) { webllmEngine = engine; webllmModel = model; return engine; });
    });
    webllmLoading = entry;
    webllmLast = '';
    function clear() { if (webllmLoading === entry) webllmLoading = null; }
    entry.promise.then(clear, clear);
    return entry.promise;
  }
  function waitEngine(w, model, h) {
    var watch = { onStatus: h.onStatus, shown: '', at: 0 };
    webllmWatch = watch;
    var p = ensureEngine(w, model);
    if (webllmLoading) { watch.shown = webllmLast || '모델 준비 중 (처음 한 번만 받아요)…'; h.onStatus(watch.shown); }
    function off() { if (webllmWatch === watch) webllmWatch = null; }
    return abortable(p, h.signal).then(function (e) { off(); return e; }, function (e) { off(); throw e; });
  }
  /* 생성: 멈추면 interruptGenerate() 를 바로 부르고 AbortError 로 끝낸다.
     WebLLM 은 스트림을 끝까지 읽어야 모델 잠금을 푸니, 멈춘 뒤에도 남은 조각은 뒤에서 마저 읽어 버린다. */
  function webllmChat(engine, model, messages, h) {
    var sig = h.signal, raw = '', finish = '', stopped = false, it = null, drained = 0;
    var req = { messages: messages, stream: true, temperature: 0.8, response_format: { type: 'json_object', schema: JSON.stringify(SCHEMA) } };
    if (/Qwen3/i.test(model)) req.extra_body = { enable_thinking: false };
    function interrupt() {
      try { var r = engine.interruptGenerate(); if (r && typeof r.then === 'function') r.then(noop, noop); } catch (e) {}
    }
    function onAbort() { stopped = true; interrupt(); }
    if (sig) sig.addEventListener('abort', onAbort);
    function drain() {
      interrupt();
      if (++drained > 4096) return Promise.resolve();   /* 멈추라는 말을 끝내 안 듣는 엔진이면 그만 읽는다 */
      return Promise.resolve().then(function () { return it.next(); }).then(function (r) { if (r && !r.done) return drain(); }, noop);
    }
    function next() {
      if (stopped) return drain().then(function () { throw abortError(); });
      return it.next().then(function (r) {
        if (stopped) return drain().then(function () { throw abortError(); });
        if (!r || r.done) return { raw: raw, cut: finish === 'length' };
        var c = r.value && r.value.choices && r.value.choices[0];
        if (c) {
          var t = c.delta && c.delta.content;
          if (typeof t === 'string' && t) { raw += t; h.onToken(t, raw); }
          if (c.finish_reason) finish = c.finish_reason;
        }
        return next();
      });
    }
    var gen = Promise.resolve().then(function () { return engine.chat.completions.create(req); }).then(function (chunks) {
      it = chunks[Symbol.asyncIterator]();
      return next();
    });
    var settled = gen.then(noop, noop);
    webllmBusy = Promise.all([webllmBusy, settled]).then(noop);
    var out = abortable(gen, sig);
    function cleanup() { if (sig) sig.removeEventListener('abort', onAbort); }
    out.then(cleanup, cleanup);
    return out;
  }
  function webllmError(e, sig) {
    if (isAbort(e) || (sig && sig.aborted)) return abortError();
    if (e && e.bj) return e;
    var name = String((e && e.name) || ''), msg = String((e && e.message) || e || '');
    if (/WebGPUNotAvailable|WebGPUNotFound/.test(name) || /compatible GPU|WebGPU is not supported|Cannot find WebGPU/i.test(msg)) return koError(E_WEBGPU, e);
    if (/ShaderF16|FeatureSupport/.test(name) || /shader-f16/i.test(msg)) return koError('이 GPU 는 이 모델에 필요한 기능(shader-f16)을 못 써요 — 모델 칸을 비우거나 이름에 q4f32 가 든 모델을 골라 주세요.', e);
    if (/DeviceLost/.test(name) || /device (?:was )?lost|out of memory|\bOOM\b/i.test(msg)) return koError('GPU 메모리가 모자라서 모델을 올리지 못했어요 — 더 작은 모델을 골라 주세요.', e);
    if (/ContextWindowSizeExceeded/.test(name) || /context window/i.test(msg)) return koError('고민 글이 이 모델이 한 번에 읽을 수 있는 길이를 넘었어요 — 고민을 줄이거나 다른 모델을 골라 주세요.', e);
    if (/QuotaExceeded/.test(name) || /quota/i.test(msg)) return koError('브라우저 저장 공간이 모자라서 모델을 받지 못했어요 — 저장 공간을 비우거나 더 작은 모델을 골라 주세요.', e);
    if (name === 'TypeError' && /fetch|network|load failed/i.test(msg)) return koError('모델 파일을 받다가 연결이 끊겼어요 — 인터넷 연결을 확인하고 다시 해 주세요.', e);
    return koError('브라우저 안 모델에서 문제가 생겼어요' + tail(excerpt(msg)), e);
  }
  function webllm(cfg, messages, h) {
    var sig = h.signal;
    return abortable(gpuInfo(), sig).then(function (gpu) {
      if (!webllmMod) h.onStatus('WebLLM 모듈을 받는 중…');
      return abortable(loadWebLLM(), sig).then(function (w) {
        var model = pickWebllm(w, cfg.model, gpu.f16);
        if (!model) throw koError('쓸 수 있는 브라우저 모델을 찾지 못했어요 — Ollama 나 “LLM 없이”를 써 주세요.');
        return waitEngine(w, model, h).then(function (engine) {
          if (sig && sig.aborted) throw abortError();
          h.onStatus('생각하는 중…');
          return webllmChat(engine, model, messages, h);
        });
      });
    }).catch(function (e) { throw webllmError(e, sig); });
  }

  /* ── LLM 없이: 고민 낱말로 장면 고르기 ──
     낱말: '글자' 또는 { w: 낱말, re: 정규식(뒤에 오는 글자 조건), wt: 점수(기본 2, 한 글자 1),
                         start: 낱말 머리에서만, notAfter: 바로 앞에 오면 안 되는 글자들 }.
     긴 낱말부터 찾고, 찾은 자리는 지워서 짧은 낱말이 그 안에서 다시 걸리지 않게 한다 (남자친구 ⊃ 친구). */
  var CATS = [
    { id: 'health', words: ['건강', { w: '아프', re: '아프(?!리카)' }, { w: '아파', re: '아파(?!트)' }, '병원', '대학병원', '수술', '입원', '회복', '통증', '허리', '두통', '불면', '잠을', '잠이', '피곤', '다이어트', '체중', '치료', '검사',
      { w: '약을', notAfter: '계예절요공협조규서언도비확특해선위밀집' }, '몸이', '컨디션', '감기', '독감', '감기약', '약국', '처방', '복용', '진통제', '수면제', '영양제', '치과', '사랑니', '탈모', '비염', '아토피', '갱년기', '시력', '당뇨', '혈압',
      { w: '병', re: '병(?=\\s*(?:이|을|은|에|도|때문|으로|세|명|치레))', start: true, wt: 1 }, '지병', '불치병', '난치병', '심장병',
      { w: '암', re: '암(?=\\s*(?:이|을|은|으로|진단|수술|투병|환자|치료|판정|검사|센터|병동|래요|이래|이에요|이라))', start: true, wt: 2 }, '위암', '폐암', '간암', '유방암', '대장암', '갑상선암', '췌장암', '자궁암'] },
    { id: 'exam', words: [{ w: '시험', re: '시험(?!관)' }, '합격', '수능', '공부', '자격증', '면접', '입시', '대학', '대학원', '성적', '공시', { w: '고시', re: '고시(?!원|텔)' }, '토익',
      { w: '재수', re: '재수(?!\\s*(?:가|도|는)?\\s*(?:없|있|좋|나쁘|옴|붙|털))' }, '편입', '논문', '졸업', '모의고사', '학점', '내신', '수험'] },
    { id: 'job', words: ['취업', '이직', '회사', '직장', { w: '상사', re: '상사(?!병)' }, '동료', '퇴사', '승진', '연봉', '일자리', '알바', '업무', '야근', '팀장', '출근', '퇴근', '커리어',
      '취준', '취직', '구직', '실직', '해고', '사표', '월급', '직업', '이력서', '자소서', '인턴', '부장', '공무원', '경력'] },
    { id: 'money', words: [{ w: '돈', re: '돈(?!가스|까스|독|벌레|키호테|부리)', notAfter: '혼정마', wt: 2 }, { w: '빚', re: '빚(?!어|었|는다|고\\s*있)', wt: 2 }, '대출', '적자', '월세', '투자', '주식',
      { w: '코인', re: '코인(?!\\s*(?:노래|빨래|세탁))' }, '재물', { w: '부자', re: '부자(?!\\s*(?:관계|사이|지간|간))' }, '저축', '통장', '카드값', '생활비', { w: '이자', re: '이자(?!카야)', start: true }, '재테크', '금전',
      '용돈', '가난', '파산', '연체', '적금', '경제적', '로또', '복권', '세금'] },
    { id: 'love', words: ['연애', { w: '사랑', re: '사랑(?!니)' }, '짝사랑', '이별', { w: '헤어지', re: '헤어[지져졌진질짐]' }, { w: '썸', re: '썸(?!네일|머|씽)', wt: 2 }, '결혼', '남친', '여친', '남자친구', '여자친구', '소개팅', '배우자', '재회', '고백', '인연', '연인',
      '애인', '데이트', '상사병', '약혼', '권태기', '프러포즈', '프로포즈', { w: '바람피', re: '바람\\s*(?:을\\s*)?피' }] },
    { id: 'family', words: ['가족', '엄마', '아빠', '부모', '자식', '아이가', '아들', { w: '딸', re: '딸(?!기|꾹|랑|려|리|린|릴|렸)', wt: 2 }, '형제', '언니', '오빠', '동생', '시댁', '처가', '남편', '아내', '육아', '임신', '출산', '난임',
      '시험관', '자녀', '어머니', '아버지', '할머니', '할아버지', '시어머니', '시부모', '장모', '며느리', '사위', '조카', { w: '아기', re: '아기(?!자기)' }, '아이들', '애들', '이혼', '효도', '명절',
      { w: '부자사이', re: '부자\\s*(?:관계|사이|지간|간)' }] },
    { id: 'home', words: [{ w: '이사', re: '이사(?!님|장|회|진)' }, { w: '집', re: '집(?!중|착|단|게|회|합|필|사|계|념|요하)', notAfter: '편모수채고밥술맛찻빵옷꽃떡횟소징결밀응운특시문', wt: 1 }, '청약', '부동산', { w: '전세', re: '전세(?!계)' }, '매매', '독립', { w: '방을', start: true },
      '아파트', '원룸', '자취', '자취방', '이삿짐', '보증금', '고시원', '하숙', '분양', '층간소음'] },
    { id: 'business', words: ['사업', { w: '가게', re: '가게(?!\\s*(?:되|됐|돼|될|된|해\\s*주|해\\s*줘|만들|할\\s*수))' }, '창업', '매출', '손님', '장사', '폐업', '계약', '거래처', '프리랜서', '고객', '쇼핑몰',
      '자영업', '개업', '매장', '단골', '납품'] },
    { id: 'mind', words: ['불안', '우울', { w: '걱정', wt: 1 }, { w: '스트레스', wt: 1 }, { w: '마음', wt: 1 }, '외로', '자존감', '번아웃', '무기력', '눈물', '공허', { w: '두려', wt: 1 }, { w: '두렵', wt: 1 }, '예민',
      '자신감', '공황', { w: '짜증', wt: 1 }, '슬퍼', '슬픔', { w: '지쳐', wt: 1 }, { w: '지친', wt: 1 }, '멘탈', '트라우마', '화병', '분노', '열등감', '자책', { w: '무서', wt: 1 }] },
    { id: 'people', words: ['친구', '인간관계', '대인관계', '관계', '오해', '싸움', '다툼', '갈등', '화해', '사람들', '눈치', '험담',
      '왕따', '따돌림', '괴롭힘', '괴롭혀', '괴롭히', '동창', '뒷담', '절교', '배신', '이웃', '사회생활'] },
    { id: 'travel', words: ['여행', '유학', '해외', '비자', '이민', '워홀', '출국', '항공권', '휴가', '어학연수'] }
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

  var KEYS = null;
  function keys() {
    if (KEYS) return KEYS;
    KEYS = [];
    CATS.forEach(function (cat, ci) {
      cat.words.forEach(function (x) {
        var o = typeof x === 'string' ? { w: x } : x;
        KEYS.push({
          cat: cat.id, ci: ci, w: o.w, len: Array.from(o.w).length,
          wt: o.wt != null ? o.wt : (Array.from(o.w).length > 1 ? 2 : 1),
          re: new RegExp(o.re || o.w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          start: !!o.start, notAfter: o.notAfter || ''
        });
      });
    });
    KEYS.sort(function (a, b) { return b.len - a.len || a.ci - b.ci; });
    return KEYS;
  }
  var BLANK = '\uE000';   /* 찾은 자리를 덮는 글자: 어떤 낱말과도, 낱말 경계와도 안 맞는다 */
  function keyOk(text, p, k) {
    var prev = p > 0 ? text.charAt(p - 1) : '';
    if (k.start && prev && !/[\s.,!?~…'"“”‘’()\[\]{}<>·:;\/\-]/.test(prev)) return false;
    if (k.notAfter && prev && k.notAfter.indexOf(prev) >= 0) return false;
    return true;
  }
  /* 고민 글 → { 분야: 점수 }. 같은 길이끼리는 앞에 나온 낱말이 먼저 (계약을 → 계약, 약을 아님). */
  function scoreCats(worry) {
    var text = String(worry || '');
    if (text.normalize) text = text.normalize('NFC');
    var list = keys(), scores = {}, counted = {}, i = 0;
    while (i < list.length) {
      var len = list[i].len, hits = [];
      for (; i < list.length && list[i].len === len; i++) {
        var k = list[i], m;
        k.re.lastIndex = 0;
        while ((m = k.re.exec(text))) {
          if (!m[0]) { k.re.lastIndex++; continue; }
          if (keyOk(text, m.index, k)) hits.push({ p: m.index, l: m[0].length, k: k });
        }
      }
      if (!hits.length) continue;
      hits.sort(function (a, b) { return a.p - b.p || a.k.ci - b.k.ci; });
      var end = -1, out = '', from = 0;
      hits.forEach(function (x) {
        if (x.p < end) return;
        end = x.p + x.l;
        out += text.slice(from, x.p) + new Array(x.l + 1).join(BLANK);
        from = end;
        var id = x.k.cat + '|' + x.k.w;
        if (!counted[id]) { counted[id] = 1; scores[x.k.cat] = (scores[x.k.cat] || 0) + x.k.wt; }
      });
      text = out + text.slice(from);
    }
    return scores;
  }

  /* 고른 분야를 돌아가며 장면을 하나씩. 같은 분야를 다시 쓰면 그 분야의 다음 장면 (겹치지 않게). */
  function pickScene(list, base, used) {
    for (var k = 0; k < list.length; k++) {
      var t = list[(base + k) % list.length];
      if (!used[t[0]]) return t;
    }
    return null;
  }
  function rules(input) {
    input = input || {};
    var text = String(input.worry || ''), scores = scoreCats(text);
    var ranked = Object.keys(scores).map(function (id) { return [id, scores[id], CATS.map(function (c) { return c.id; }).indexOf(id)]; })
      .sort(function (a, b) { return b[1] - a[1] || a[2] - b[2]; }).map(function (s) { return s[0]; });
    var cats = ranked.length ? ranked : ['general'];
    var info = BJ.ganji.ilju(input.ilju), d = BJ.chars.describe(input.ilju, input.gender);
    var name = info.title + (input.gender === 'm' ? '(남)' : '(여)');
    var n = Math.floor(+input.n || 2);
    n = Math.max(1, Math.min(3, n));
    var seed = BJ.draw.hash(text), ideas = [], used = {};
    for (var i = 0; i < n; i++) {
      var t = pickScene(SCENES[cats[i % cats.length]], seed + Math.floor(i / cats.length), used) || pickScene(SCENES.general, seed + i, used);
      if (!t) break;
      used[t[0]] = 1;
      ideas.push({
        title: t[0], scene: t[1].replace(/\{c\}/g, name), pose: t[2], props: t[3].slice(), symbol: t[4], caption: t[5],
        prompt_en: t[6].replace(/\{e\}/g, d.en)
      });
    }
    var shown = cats.slice(0, Math.max(2, Math.min(n, cats.length)));
    return { summary: '고민이 다 풀린 뒤의 모습을 그려요 (LLM 없이 고른 장면 — ' + shown.map(catName).join(' · ') + ')', ideas: ideas };
  }
  function catName(id) {
    return { health: '건강', exam: '시험 · 합격', job: '일 · 직장', money: '재물', love: '연애', family: '가족', home: '집 · 이사', business: '사업', mind: '마음', people: '관계', travel: '여행', general: '두루' }[id] || id;
  }

  /* cfg = { engine, url, model }, input = { worry, ilju, gender, yearText, topText, bottomText, n }
     h = { onToken(t, raw), onStatus(text), signal } → Promise<{ data, raw }>
     실패하면 언제나 Error: message 는 한국어 문장 하나. 멈추면 name === 'AbortError' (어느 엔진이든 곧바로). */
  function generate(cfg, input, h) {
    h = h || {};
    cfg = cfg || {};
    input = input || {};
    var hh = {
      onToken: typeof h.onToken === 'function' ? h.onToken : noop,
      onStatus: typeof h.onStatus === 'function' ? h.onStatus : noop,
      signal: h.signal || null
    };
    if (!String(input.worry || '').trim()) return Promise.reject(koError('고민 내용을 먼저 적어 주세요'));
    if (hh.signal && hh.signal.aborted) return Promise.reject(abortError());
    if (cfg.engine === 'rules') {
      try { return Promise.resolve({ data: rules(input), raw: '' }); }
      catch (e) { return Promise.reject(finalError(e, null)); }
    }
    var messages, run;
    try { messages = buildMessages(input); } catch (e) { return Promise.reject(finalError(e, null)); }
    if (cfg.engine === 'ollama') {
      if (!String(cfg.model || '').trim()) return Promise.reject(koError('Ollama 모델을 골라 주세요 (‘모델 불러오기’를 누르면 설치된 모델이 나와요)'));
      run = Promise.resolve().then(function () {
        var base = baseUrl(cfg);
        hh.onStatus('생각하는 중…');
        return ollama(base, cfg, messages, hh);
      });
    } else if (cfg.engine === 'openai') {
      run = Promise.resolve().then(function () {
        var base = baseUrl(cfg);
        hh.onStatus('생각하는 중…');
        return openai(base, cfg, messages, hh);
      });
    } else {
      run = webllm(cfg, messages, hh);
    }
    return abortable(run, hh.signal).then(function (r) {
      var data;
      try { data = parse(r.raw); }
      catch (e) { throw r.cut ? koError(E_CUT, e) : e; }
      return { data: data, raw: r.raw };
    }).catch(function (e) { throw finalError(e, hh.signal); });
  }

  BJ.llm = {
    ENGINES: ENGINES, SCHEMA: SCHEMA, SYSTEM: SYSTEM, buildMessages: buildMessages, parse: parse, listModels: listModels, generate: generate, rules: rules,
    normalizeUrl: normalizeUrl, effectiveUrl: effectiveUrl
  };
})();
