/* ============================================================
   뽈뽈 문어 — js/app.js (전역 APP)
   DESIGN.md §2 §3 §4 §6 §7 §8 §12.3
   섹션: util · state · migrate · assets · scene(SCENE3D|SCENE2D 브리지) · salon(미용실 시트 · 묻기 · 연출) · octopus ·
         invite/reveal · log · posters · album(요즘 · 메모 · 일기) · dialogs(포스터 · 설정 · 이름) · rooms(문어 방 ↔ 놀이방) · tip · demo · boot
   7물결 (주인 11-07): '방 보기' 는 없앴다 → ⚙ 설정 시트 (문어 색 · 내 모습 · 소리 · 모션 · 글꼴 · 기록) · 앨범 (문어의 요즘 · 다음 산책에 가는 메모 · 일기 탭).
   건너뛰기는 큰 버튼에 합쳤다 (나가 있는 동안 #btn-go = "다녀오는 중…" 글자만, 누르면 skip).
   8물결: 다락 안 진짜 문(#btn-door, 3D 문 위 투명 단추) → goRoom('play') → 진짜 놀이방 (오락기 → 다락방 달리기 · 문 → 문어 방). 자세한 규칙은 rooms 섹션
   플레이어가 보는 버튼 · 탭 · 시트 제목에는 글자나 픽셀 그림만 (이모지 · 유니코드 기호 없음 — 주인 11-07 '실제 사용자에게 바로 나간다고 생각해')
   로드 순서: three.min.js → world.js → brain.js → salon.js → scene3d.js → scene2d.js → app.js (type="module" 금지)
   장면: SCENE = SCENE3D.supported() ? SCENE3D : SCENE2D (§13.1). APP 은 그 API 하나만 본다.
   미용실 (주인 11-08 밤, docs/SALON.md): 몸 색은 사람이 처음 한 번만 고른다 (이름 창). 그 뒤로는 미용실에서 사람이 색을 내밀고 묻고, 바꿀지는 문어가 정한다.
   색의 출처는 S.octopus.color 하나 (settings.octColor 는 옛 코드용 사본) · 바꾸는 길은 setOctColor(hex, meta) 하나 · 장면은 applyLook 이 따라간다 (미용실 연출 중엔 미룸)
   ============================================================ */
/* global WORLD, BRAIN, SALON, SCENE3D, SCENE2D */
var APP = (function () {
  'use strict';

  /* ───────────────────────── util ───────────────────────── */
  var W = (typeof WORLD !== 'undefined') ? WORLD : null;
  var B = (typeof BRAIN !== 'undefined') ? BRAIN : null;
  var SAL = (typeof SALON !== 'undefined') ? SALON : null;   /* 미용실 규칙 (js/salon.js — DOM 없음). 없으면 몸 색은 예전처럼 빨강 기본값 하나로만 */
  var DEFAULT_COLOR = (SAL && SAL.DEFAULT_COLOR) || '#e8463c';   /* 첫 실행 창에서 처음 눌려 있는 색 (빨강) */
  var STR = (W && W.strings) || {};
  var MEMO_STR = (W && W.memoTemplates) || {};
  var STATUS_LABEL = { read: '읽음', builtin: '책장 메모', simulated: '모의 방문', failed: '못 읽음', none: '앉아만 있었음' };
  var MISS_WORD = { simulated: '모의', failed: '못 읽음' };   /* 들른 곳 사슬에서 이름 뒤 짧은 낱말 */
  var FOLLOW_LABEL = { followed: '따라감', ignored: '무시함', left: '도중에 벗어남', none: '없음' };
  var BY_LABEL = { demo: '데모 두뇌(규칙)', human: '사람이 조작', mcp: '모델(MCP)', legacy: '복원된 기록' };
  var LOG_LABEL = { depart: '출발', peek: '기웃', 'return': '귀가', remember: '기억', hang_poster: '포스터', wrap_up: '마무리', stay_home: '집', empty_turn: '…' };
  var VOICE_LABELS = ['귀가', '기억', '마무리', '집', '인사', '혼잣말', '어제 메모', '지난 메모', '대답'];   /* '방'(등불 소품 줄)은 11-08 부터 집 목소리 사실 문장 (DIALOGUE_UI §4.3) */   /* 문어 목소리 행 → 픽셀 테마에서 호박색 탭 + 초상 대화창 (§15.2) · '대답' = 미용실 행 2 (고른 이의 말, docs/SALON.md §3.7 — '미용실' · '몸 색' 행은 집 목소리) */
  /* 문어 목소리 행의 표정 (DESIGN §15.2): 귀가 calm · 기억 curious · 마무리 폴짝/우쭐 happy, 졸림 sleepy, 덤덤 calm · 집 활동 calm (낮잠 sleep) · 빈 차례 sleep · 인사 깨어 있으면 happy / 자는 중 sleep · 방(소품) happy · 말풍선 … pet (예전 ♡), ? curious */
  var REACT_EXPR = { '폴짝': 'happy', '우쭐': 'happy', '덤덤': 'calm', '졸림': 'sleepy' };
  var STATE_EXPR = { happy: 'happy', pet: 'pet', sleep: 'sleep', anticipate: 'calm' };   /* 상태의 기본 표정 (SCENE.md 초상·표정) — 대화창 표정은 4 s 뒤 여기로 돌아온다 */
  /* 자는 문어를 누르면 · 깨어 있는 문어를 톡 누르면 (말풍선만 — 로그 · 저장에 안 남는다, 11-08). 소리(js/audio.js)는 글자가 아니라 kind('sleep' · 'curious' · 'say')로 고른다.
     깨어 있으면 '응?' 대신 그날 마지막으로 끝낸 차례에 대한 한 줄 (BRAIN.tapLine · 주인 11-08) — 없으면 '응?' */
  var SLEEP_SAY = '쿨쿨…', TAP_SAY = '응?', SLEEP_DOWN_SAY = '지금은 아래층에서 자고 있어.', DOWN_SAY = '지금은 아래층에 있어.', AWAY_SAY = '지금은 산책 나가 있어.';
  var TAP_CLIP = 24;   /* 모델 · 사람이 쓴 톡 한 줄: 화면엔 24글자 + '…' (원문은 기록 그대로) */
  /* 돌아온 뒤 담요에서 깨어 있는 틈 (주인 11-08 '자동으로 쉬는 느낌'): 보이는 다락에서 90 s → 그다음 낮잠. 탭을 떠났거나 · 놀이방 · 창이 열렸거나 · 장면을 아래로 내려 둔 동안은 세지 않고,
     돌아오면 적어도 15 s 는 깨어 있다. 게임 기록엔 저장하지 않는다 (이 탭의 새로고침만 남은 틈을 sessionStorage 로 이어 받는다 — 없으면 차례가 끝난 시각부터 센다).
     졸림으로 마무리한 차례는 틈이 짧다 (25 s): 졸린 채 잠깐 있다가 잔다 — 그래도 '돌아와서 톡 · 읽고 · 한 번 더 톡' 은 된다 */
  var AWAKE_MS = 90000, AWAKE_SLEEPY = 25000, AWAKE_SEEN = 15000, REST_KEY = 'ppolppol_rest';
  /* 화면에 줄일 때 글자 = 사람이 보는 한 글자 (이모지 묶음을 쪼개지 않는다). Intl.Segmenter 가 없으면 코드 포인트 */
  var GSEG = null; try { GSEG = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('ko', { granularity: 'grapheme' }) : null; } catch (e) { GSEG = null; }
  function clipG(s, n) { s = String(s == null ? '' : s); var a = GSEG ? Array.from(GSEG.segment(s), function (x) { return x.segment; }) : Array.from(s); return a.length > n ? a.slice(0, n).join('') + '…' : s; }
  var REACT_WORDS = { '폴짝': 1, '우쭐': 1, '덤덤': 1, '졸림': 1 };   /* 아는 반응 넷 — 화면엔 단어만 (예전 이모지는 뺐다, 주인 11-07) */
  /* 화면에 줄여 보일 때: n 글자(코드 포인트) 넘으면 n 글자 + '…'. 원문은 기록에 그대로 (MODEL_VOICE §3) */
  function clip(s, n) { s = String(s == null ? '' : s); var a = Array.from(s); return a.length > n ? a.slice(0, n).join('') + '…' : s; }
  /* 반응 (MODEL_VOICE §2·§3 · 계약 R1): 모델(by mcp)·사람(데모 조작)이 준 반응은 두뇌가 거르지 않고 넘긴다 → 화면도 그대로.
     네 가지(폴짝·우쭐·덤덤·졸림)면 r, 그 밖의 말이면 raw(화면은 40자 + '…'). 반응이 없으면 둘 다 null → 반응 자리에 아무것도 없다 (지어내지 않는다).
     줄: 모델·사람 차례는 그들이 쓴 줄(trip.reactionLine)만. 코드가 고른 줄(receipt.reactionLine)은 데모 규칙 차례에만 쓴다 */
  var REACT_RAW_SHOW = 40;
  function reactionOf(trip, ev) {
    trip = trip || {};
    var rec = trip.receipt || {}, by = trip.reactionBy || ({ mcp: 'model', human: 'human', demo: 'demo-rules' })[trip.by] || null;
    var given = by === 'model' || by === 'human';
    var r = trip.reaction !== undefined ? trip.reaction : rec.reaction !== undefined ? rec.reaction : (ev ? ev.reaction : null);
    var raw = typeof trip.reactionRaw === 'string' && trip.reactionRaw.trim() ? trip.reactionRaw : null;
    if (!REACT_WORDS[r]) { if (!raw && typeof r === 'string' && r.trim()) raw = r; r = null; }
    var line = given ? (typeof trip.reactionLine === 'string' && trip.reactionLine.trim() ? trip.reactionLine : null)
      : (trip.reactionLine || rec.reactionLine || null);
    return { r: r, raw: raw, word: r || (raw ? clip(raw, REACT_RAW_SHOW) : ''), line: line, by: by, given: given };
  }
  function givenTrip(trip) { return !!trip && (trip.by === 'mcp' || trip.by === 'human'); }   /* 모델·사람이 고른 차례: 코드가 지은 말을 문어의 반응처럼 보이지 않는다 */
  var KEY = 'ppolppol_v2', KEY_V1 = 'ppolppol_v1', KEY_V1_BAK = 'ppolppol_v1_backup';

  function $(id) { return document.getElementById(id); }
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') { if (attrs[k] != null) el.className = attrs[k]; }   /* null 이면 class 를 달지 않는다 (예전엔 class="null") */
      else if (k === 'text') el.textContent = attrs[k];
      else if (k === 'html') el.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null) el.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c != null) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  /* 그림 글자: 플레이어 화면엔 이모지·장식 기호를 쓰지 않는다 (주인 11-07 '실 사용자한테 바로 배포할 거라고 생각하고 이런 건 다 빼').
     자리에는 픽셀 아이콘 (assets/icons/<path>.png 16×16 — 픽셀 테마 32px · 시스템 테마 16px, js/ui-art.js icon/iconHTML 이 주소를 고른다: 단일 파일 번들이면 data URI).
     장식이라 alt="" · aria-hidden, 옆 글자(상태 단어 · 방 이름)는 그대로. 그림이 안 오면 지운다 (이모지로 되돌리지 않는다). UIART 가 없으면 그림 없이 글자만 */
  function ico(path, cls) { return window.UIART && UIART.icon ? UIART.icon(path, 'ua-both' + (cls ? ' ' + cls : '')) : null; }
  function icoH(path, cls) { return window.UIART && UIART.iconHTML ? UIART.iconHTML(path, 'ua-both' + (cls ? ' ' + cls : '')) : ''; }
  /* 기억 코너 아이콘 (icon.memory.<코너>): 방 정류장은 그 방의 코너, 바깥 주소(url)는 문 그림, 그 밖(위키 · 모르는 곳)은 들판 */
  var CORNER_ICONS = { hands: 1, sea: 1, sky: 1, signs: 1, numbers: 1, sounds: 1, home: 1, mind: 1, wild: 1 };
  /* 정류장 한 줄의 그림: 그 방의 픽셀 그림(js/poster-art.js, 32px 그대로)이 있으면 그것, 없으면 예전처럼 주제 아이콘 (주소 문 · 도서관 밖 글).
     방 그림은 32px 원본이라 글꼴 모드와 상관없이 32px 로 둔다 (시스템 글꼴 모드의 16px 로 줄이면 칸이 빠진다) — 줄 높이를 안 밀게 위아래 여백을 뺀다 */
  function stopIcoH(s) {
    var a = (s && s.nodeId !== 'door_out' && window.POSTER_ART && POSTER_ART.forStop) ? POSTER_ART.forStop(s) : null;
    if (a && a.kind === 'room') return '<img class="ua-ico ua-both ua-mem ua-art" src="' + a.src + '" alt="" aria-hidden="true" width="32" height="32" draggable="false" style="width:32px;height:32px;margin:-6px 4px -6px 0;vertical-align:-9px">';
    return icoH(cornerIcon(s && s.corner, s && s.nodeId === 'door_out' ? 'url' : null), 'ua-mem');
  }
  function cornerIcon(corner, kind) { return kind === 'url' ? 'ctl/door' : 'memory/' + (CORNER_ICONS[corner] ? corner : 'wild'); }
  function souvenirIcon(id) { return W && W.souvenirs && W.souvenirs[id] ? 'souvenir/' + id : null; }
  /* 남이 쓴 글 표시 (data-raw): 모델이 쓴 말(MCP) · 사람(데모 조작)이 쓴 말 · 위키백과 글 · 플레이어가 쓴 글은 바이트 그대로 보인다 (docs/MODEL_VOICE.md — 이모지가 있어도 고치지 않는다).
     그 칸에 data-raw="model|human|wiki|player" 를 단다 — 화면 글자 지킴이(tools/smoke.js U)는 이 칸만 빼고 검사한다. 속성만 남의 글이면 data-raw-attr="aria-label" */
  function rawBy(trip) { return trip && trip.by === 'mcp' ? 'model' : trip && trip.by === 'human' ? 'human' : null; }
  function rawSpan(text, by, cls) { return by ? h('span', { 'data-raw': by, class: cls || null, text: text }) : (cls ? h('span', { class: cls, text: text }) : document.createTextNode(String(text == null ? '' : text))); }
  function rawH(text, by) { return by ? '<span data-raw="' + by + '">' + esc(text) + '</span>' : esc(text); }
  /* 우리 문구 안에 끼운 남의 글 (예: "지난번 메모: '…'"): 그 부분만 표시. 못 찾으면 통째로 */
  function withRaw(full, part, by) {
    full = String(full == null ? '' : full);
    var i = by && part ? full.indexOf(part) : -1;
    if (!by) return [document.createTextNode(full)];
    if (i < 0) return [h('span', { 'data-raw': by, text: full })];
    return [document.createTextNode(full.slice(0, i)), h('span', { 'data-raw': by, text: part }), document.createTextNode(full.slice(i + part.length))].filter(function (n) { return n.nodeType !== 3 || n.nodeValue; });
  }
  /* 우리 문구 속에 든 남의 글 조각(위키 문서 제목 · 모델이 준 정류장 이름 — 예: 데모 포스터 한 줄 '설형문자에 오래 있었어')만 표시. 나올 때마다 모두.
     withRaw 와 달리 못 찾으면 표시 없이 우리 글 그대로 (우리 문구를 통째로 남의 글로 보지 않는다) */
  function partRaw(full, part, by) {
    full = String(full == null ? '' : full);
    if (!by || !part || full.indexOf(part) < 0) return [document.createTextNode(full)];
    var out = [], p = 0, i;
    while ((i = full.indexOf(part, p)) >= 0) { if (i > p) out.push(document.createTextNode(full.slice(p, i))); out.push(h('span', { 'data-raw': by, text: part })); p = i + part.length; }
    if (p < full.length) out.push(document.createTextNode(full.slice(p)));
    return out;
  }
  function partRawH(full, part, by) {
    full = String(full == null ? '' : full);
    if (!by || !part || full.indexOf(part) < 0) return esc(full);
    return full.split(part).map(esc).join(rawH(part, by));
  }
  function appendAll(el, nodes) { nodes.forEach(function (n) { el.appendChild(n); }); return el; }
  /* 정류장 이름이 우리 세계 데이터(방 이름)가 아니면 남의 글: 위키 문서 제목 · 모델이 준 제목 · 주소 */
  /* kind 'url' = 로그 행의 바깥 주소(호스트 이름 — 건넨 이의 글). 영수증 · 포스터의 바깥 주소 정류장 이름은 세계 데이터 '밖의 문' 이라 우리 글 */
  function stopRawBy(trip, nodeId, kind) { return kind === 'url' ? (rawBy(trip) || 'player') : (kind === 'room' || (nodeId && nodeOf(nodeId))) ? null : (rawBy(trip) || 'wiki'); }
  /* 고른 칩(앨범 필터 · 팔레트 · 계절 · 색 프리셋): 보이는 .on 과 읽히는 aria-pressed 를 같이 */
  function chipOn(b, on) { b.classList.toggle('on', !!on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); }
  /* 방 이름: 등불 칸수에 따라 (CG R17) */
  /* 등불 0칸에도 등불 안에 작은 불씨가 켜져 있다 (밤에도 다락이 깜깜하지 않게, 결정 14) → 처음 단계 이름도 '어두운' 이 아니다 */
  function roomTitle(lv) { return lv >= 8 ? '문어의 다락' : lv >= 5 ? '살림이 생긴 다락' : lv >= 2 ? '등불 켜진 다락' : '불씨 하나 켜진 다락'; }
  /* 등불 칸이 켜질 때 집 목소리 사실 한 줄 (WORLD.roomLevels 순서 · DIALOGUE_UI §4.3): 문어 초상 없이. 코드가 지은 기분('따뜻해졌어' · '진짜 내 다락') ·
     낮에 틀린 말('별도 보여')은 뺐다 — 데려오기 · 모션 줄이기에서도 이 행이 보이게 된 11-08 부터 */
  var ITEM_LINE = { 1: '창턱에 이끼 화분이 놓였어', 2: '낡은 나무 상자가 책상이 됐어', 3: '구석에 양초가 켜졌어', 4: '담요 한 장이 깔렸어',
    5: '벽에 포스터 판이 걸렸어', 6: '비가 잦아들었어', 7: '선반이 생겼어. 창밖이 맑아', 8: '커튼이 걸렸어' };
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function dateKey(d) { d = d || new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  /* 테스트 훅: window.__ppolTest.today = 'YYYY-MM-DD' 가 있을 때만 '오늘'을 그 날짜로 (tools/smoke.js 둘째 날). js/runner.js · js/audio.js 도 같은 규칙 */
  function hookHint() { var t = window.__ppolTest; if (!(t && typeof t === 'object' && typeof t.hint === 'string')) return ''; var h = t.hint.trim(); delete t.hint; return h; }   /* 테스트 훅: 한 번 쓰고 지운다 (예전 입력 칸이 초대 뒤 비워지던 것과 같게) ·  (플레이어 · 개발 화면 어디에도 입력 칸 없음) */
  function hookToday() { var t = window.__ppolTest; return (t && typeof t === 'object' && /^\d{4}-\d{2}-\d{2}$/.test(t.today || '')) ? t.today : null; }
  function todayKey() { return hookToday() || dateKey(); }
  function keyAdd(key, n) { var p = String(key).split('-'); return dateKey(new Date(+p[0], +p[1] - 1, +p[2] + n)); }
  function fmtDate(key, dots) { var p = String(key || '').split('-'); return dots ? p.join('.') : (p[1] | 0) + '.' + (p[2] | 0); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, Math.max(0, ms)); }); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function hash(s) { return B ? B.hashSeed(String(s)) : (function (str) { var x = 2166136261; for (var i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; })(String(s)); }
  function mkRng(seed) { return B ? B.rng(seed) : (function (a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })(seed >>> 0); }
  var uiRng = mkRng((Date.now() & 0xffffffff) >>> 0);   /* 꾸밈용(산책 시간·시선). 결정은 전부 BRAIN 의 PRNG */
  function reduced() {
    var m = (S && S.settings && S.settings.motion) || 'auto';
    if (m === 'reduce') return true;
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function speed() { var v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--speed')); return v > 0 ? v : 1; }
  function nodeOf(id) { return (W && W.nodes && W.nodes[id]) || null; }
  function cornerName(c) { return (W && W.corners && W.corners[c] && W.corners[c].name) || c; }
  function greetingByHour(hr) { return hr < 6 ? '밤이 깊었네' : hr < 9 ? '좋은 아침' : hr < 17 ? '좋은 오후' : hr < 19 ? '노을이 지네' : '밤이네'; }
  var toastTimer = null, toastRow = false;   /* toastRow: 지금 떠 있는 게 '새 줄 알림'(rowToast)인가 */
  function toast(msg, raw) {   /* <output aria-live=polite> 하나, 한 번에 하나, 2.5초 (UI R21). raw = { part, by }: 그 안의 남의 글(위키 제목 등)만 data-raw */
    var t = $('toast'); if (!t) return;
    clearTimeout(rowTimer); rowWait = null; toastRow = false; t.classList.remove('row');   /* 보통 알림이 새 줄 알림을 밀어낸다 (거꾸로는 아니다 — rowToast) */
    var moved = raiseToast(t);
    if (moved && !t.classList.contains('show')) void t.offsetWidth;   /* 옮긴 직후에도 나타나는 전환이 돌게 */
    t.textContent = ''; partRaw(msg, raw && raw.part, raw && raw.by).forEach(function (n) { t.appendChild(n); }); toastPlace(t); t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2500);
  }
  /* 모달 <dialog> 가 열려 있으면 그 밖은 inert 라 토스트가 대화상자 밑에 깔리고 화면 낭독기에도 안 읽힌다 (복사·저장·불러오기 결과).
     → 열린 대화상자 안으로 옮기고 popover(최상층)로 띄운다. popover 가 없는 브라우저는 대화상자 안(최상층)이라 그대로 위에 보인다. 닫히면 body 로 (bindDialogs) → 옮겼으면 true */
  function openDialog() { var ds = document.querySelectorAll('dialog[open]'); return ds.length ? ds[ds.length - 1] : null; }
  function raiseToast(t) {
    var host = openDialog() || document.body, moved = t.parentNode !== host;
    if (moved) host.appendChild(t);   /* 옮기면 열려 있던 popover 는 저절로 닫힌다 */
    if (host !== document.body && typeof t.showPopover === 'function') { try { if (t.matches(':popover-open')) t.hidePopover(); t.showPopover(); } catch (e) { /* popover 속성 없음 등: 대화상자 안이라 그대로 보인다 */ } }
    return moved;
  }
  /* ── 저장소: localStorage 감지 → 없으면 메모리 (조용히 한 줄). QuotaExceeded 는 오래된 여행의 이벤트를 뺀 저장용 사본으로 다시 시도 — 메모리의 기록은 그대로 (R2–R5) ── */
  var mem = {};
  var storeOK = (function () { try { var k = 'ppolppol_probe'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; } catch (e) { return false; } })();
  var store = {
    get: function (k) { if (storeOK) { try { return localStorage.getItem(k); } catch (e) { /* 아래 */ } } return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
    set: function (k, v) { mem[k] = v; if (!storeOK) return false; localStorage.setItem(k, v); return true; },
    remove: function (k) { delete mem[k]; if (storeOK) { try { localStorage.removeItem(k); } catch (e) { /* noop */ } } }
  };
  /* ── 같은 탭 미러 (window.name, §8): 새로고침 직후 브라우저가 이 원점의 localStorage 스냅숏을 통째로 비워서 주는 경우가 있다
     (크로미움 DOMStorage 경합 — tools/test-resume.js 의 'empty-snapshot'). 그때 load() 가 "새 설치" 로 오해하고 저장하면 기록이 통째로 덮인다.
     window.name 은 탭과 함께 이동해 그 경합이 없으므로 save() 마다 같은 JSON 을 적어 두고, load() 는 둘 중 lastSeen 이 큰 쪽을 쓴다.
     탭 안에서만 살고(다른 탭·다음 방문은 localStorage), 다른 사이트로 가면 브라우저가 지운다 ── */
  var MIRROR_PREFIX = KEY + ':';
  function mirrorSet(json) { try { if (json.length < 2000000) window.name = MIRROR_PREFIX + json; } catch (e) { /* noop */ } }
  function mirrorGet() { try { var n = window.name; return (typeof n === 'string' && n.indexOf(MIRROR_PREFIX) === 0) ? n.slice(MIRROR_PREFIX.length) : null; } catch (e) { return null; } }
  function parseState(raw) { if (!raw) return null; try { var o = JSON.parse(raw); return (o && typeof o === 'object') ? o : null; } catch (e) { return null; } }
  function seenOf(o) { return (o && o.settings && typeof o.settings.lastSeen === 'number') ? o.settings.lastSeen : 0; }
  function isQuota(e) { return !!e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014); }
  function quietWarn(text) { var w = $('save-warn'); if (!w) return; if (w.textContent === text && !w.hidden) return; w.textContent = text; w.hidden = false; warnFit(); }

  /* ───────────────────────── state ───────────────────────── */
  /* 스냅 팔레트 (룩 패스 3, settings.palette): 즉흥 램프 또는 js/palettes.js 의 검증 팔레트. 기본값은 SCENE3D.PAL_DEFAULT (docs/LOOK_LOG.md 3행) */
  var PALETTES_UI = [['ramps', '즉흥'], ['apollo', 'Apollo'], ['endesga64', 'Endesga'], ['resurrect64', 'Resurrect']];
  function paletteDefault() { return (typeof SCENE3D !== 'undefined' && SCENE3D.PAL_DEFAULT) || 'ramps'; }
  /* 내 모습 (내 캐릭터 파츠 — docs/PLAYER_PARTS.md §3): 목록·기본값은 장면(SCENE3D.PLAYER_PARTS · PLAYER_DEFAULT)이 주인. 장면 빌드에 아직 없으면 같은 id 의 비상 목록.
     옷방(왼쪽 문)이 생기기 전까지는 설정 시트 '내 모습' 섹션에서 고른다 (PLAYER_PROGRESSION 11-08 메모). 저장은 settings.player = { hair, hairColor, eyes, eyeColor, nose, mouth, cheek, outfit, shoes, acc } (id). 코 · 입 · 볼은 11-09 에 생겼다 — 옛 기록엔 없어 normalizePlayer 가 기본(세모코 · 미소 · 볼 없음)으로 채운다. 볼터치('blush')는 11-10 에 뺐다 — 저장돼 있던 값은 모르는 id 라 '없음' 이 된다 */
  var PLAYER_CATS = [['hair', '머리'], ['bangs', '앞머리'], ['hairColor', '머리 색'], ['skin', '피부색'], ['eyes', '눈'], ['eyeColor', '눈 색'], ['nose', '코'], ['mouth', '입'], ['cheek', '볼'], ['outfit', '옷'], ['shoes', '신발'], ['acc', '악세사리']];
  var PLAYER_FALLBACK = {
    hair: [['bob', '단발'], ['short', '숏컷'], ['long', '긴생머리'], ['twin', '양갈래'], ['pony', '포니테일'], ['wave', '웨이브']],
    bangs: [['spiky', '삐죽'], ['full', '일자'], ['side', '옆가르마'], ['center', '가운데'], ['see', '시스루']],
    hairColor: [['blonde', '금발', '#ffc16a'], ['brown', '밤갈색', '#9a5a3a'], ['ink', '먹남색', '#1e2a44'], ['silver', '은빛', '#cfc9c0'], ['pink', '분홍', '#de8fa9'], ['lime', '연두', '#a0d070']],
    eyes: [['round', '동그란'], ['sparkle', '반짝'], ['sleepy', '졸린'], ['almond', '또렷'], ['smile', '웃는'], ['dot', '점']],
    eyeColor: [['dark', '흑갈색', '#6a3a30'], ['hazel', '호두색', '#884b2b'], ['sea', '바다색', '#3c5e8b'], ['leaf', '잎새색', '#468232'], ['honey', '꿀색', '#be772b'], ['violet', '제비꽃', '#7a367b']],
    nose: [['none', '없음'], ['dot', '콩코'], ['tri', '세모코']],
    mouth: [['none', '없음'], ['smile', '미소'], ['line', '새침'], ['pout', '뾰로통'], ['open', '활짝'], ['o', '오']],
    cheek: [['none', '없음'], ['freckle', '주근깨']],
    skin: [['peach', '살구', '#ffd096'], ['fair', '밝은', '#ffe2c4'], ['honey', '꿀빛', '#e9b27c'], ['chestnut', '밤빛', '#c48a5c'], ['cocoa', '카카오', '#8f5d3e']],
    outfit: [['dress', '원피스'], ['knit', '니트'], ['hoodie', '후드'], ['overall', '멜빵'], ['raincoat', '비옷'], ['hanbok', '한복'], ['uniform', '교복'], ['varsity', '야구점퍼'], ['flannel', '체크셔츠']],
    shoes: [['flat', '단화'], ['boot', '부츠'], ['sneaker', '운동화'], ['loafer', '로퍼']],
    acc: [['none', '없음'], ['ribbon', '리본'], ['beret', '베레모'], ['glasses', '동글안경'], ['catears', '고양이귀'], ['strawhat', '밀짚모자']]
  };
  var PLAYER_FALLBACK_DEFAULT = { hair: 'bob', bangs: 'spiky', hairColor: 'blonde', skin: 'peach', eyes: 'round', eyeColor: 'dark', nose: 'tri', mouth: 'smile', cheek: 'none', outfit: 'dress', shoes: 'flat', acc: 'ribbon' };
  function playerParts() {   /* → { hair: [{id, name}], hairColor: [{id, name, hex}], … } 범주마다 1개 이상 */
    var P = (typeof SCENE3D !== 'undefined' && isObj(SCENE3D.PLAYER_PARTS)) ? SCENE3D.PLAYER_PARTS : null, out = {};
    PLAYER_CATS.forEach(function (c) {
      var k = c[0], list = P && Array.isArray(P[k]) ? P[k].filter(function (x) { return isObj(x) && typeof x.id === 'string'; }) : [];
      out[k] = list.length ? list : PLAYER_FALLBACK[k].map(function (x) { return { id: x[0], name: x[1], hex: x[2] }; });
    });
    return out;
  }
  function normalizePlayer(cfg) {   /* 아는 범주만 · 모르는 id 는 기본값으로 (장면의 setPlayer 와 같은 규칙) */
    var P = playerParts(), D = (typeof SCENE3D !== 'undefined' && isObj(SCENE3D.PLAYER_DEFAULT)) ? SCENE3D.PLAYER_DEFAULT : PLAYER_FALLBACK_DEFAULT, out = {};
    cfg = isObj(cfg) ? cfg : {};
    PLAYER_CATS.forEach(function (c) {
      var k = c[0], ids = P[k].map(function (x) { return x.id; }), v = cfg[k], d = ids.indexOf(D[k]) >= 0 ? D[k] : ids[0];
      out[k] = (typeof v === 'string' && ids.indexOf(v) >= 0) ? v : d;
    });
    return out;
  }
  function playerDefault() { return normalizePlayer(null); }
  function defaults() {
    return {
      v: 2,
      /* color = 지금 몸 색 (읽는 곳은 이것 하나) · colors = 바뀐 기록 [{ at, date, color, how: first|salon|dev, by, ask? }] 오래된 것부터.
         새 기록은 colors 가 비어 있고 첫 실행 창(이름 저장)이 첫 줄을 넣는다 (docs/SALON.md §7) */
      octopus: { name: null, born: null, trips: 0, invites: 0, days: [], affinity: {}, visits: {}, state: 'idle', color: DEFAULT_COLOR, colors: [] },
      room: { lantern: 0, souvenirs: [], posterOrder: [] },
      trips: [],
      notes: {},   /* §17.1 방마다 최근 메모 1개: { nodeId: { text, tripId, date } } */
      curiosityNotes: [],   /* 호기심 메모 (docs/CURIOSITY_NOTES.md): [{ id:'cn_…', text, about, by, model?, session(여행 id), at, status:'active'|'set_down', setDownAt }] — 오래된 것부터 */
      salon: { asks: [] },   /* 미용실 물음 (js/salon.js 머리말의 모양) — 하루 한 번, 오래된 것부터 */
      /* octColor 는 octopus.color 의 사본 (옛 코드 · 낡은 탭이 없는 값을 빨강으로 읽어 모두의 문어를 몰래 빨갛게 만들지 않게). 앱은 읽지 않는다 */
      settings: { motion: 'auto', thumbs: true, lastSeen: null, octColor: DEFAULT_COLOR, flipped: false, palette: paletteDefault(), pixelFont: true, albumSeen: 0, player: playerDefault() }   /* albumSeen: 앨범 점 기준 (renderAlbumBtn). 새 기록은 0 = 아직 본 포스터 없음 */
    };
  }
  var S = defaults();
  var warned = false, lastSaved = null;
  /* 쿼터 초과 때 쓰는 저장용 사본: 최근 keep 개를 뺀 끝난 여행의 events 만 비운다 (영수증·포스터·요약은 남김). 메모리의 S 는 건드리지 않는다. 비울 게 없으면 null.
     그 여행의 noteOut 도 이미 호기심 메모(S.curiosityNotes, 같은 session)로 옮겨 적혔으면 사본에서 뺀다 — 모델이 쓴 글은 메모 쪽에 원문 그대로 한 벌 남는다
     (noteOut 은 반영할 때 한 번만 읽힌다: applyNotes). 메모 자체는 줄이지도 지우지도 않는다 (원문 보존 · 앨범은 전부 — CURIOSITY_NOTES 원칙 4) */
  var SLIM_KEEP = [100, 30, 10, 1];   /* 점점 작게 — 가장 최근 여행(방금 반영한 것)의 이벤트는 끝까지 남긴다 */
  function slimJSON(keep) {
    var n = S.trips.length, cut = 0, noted = {};
    S.curiosityNotes.forEach(function (x) { noted[x.session] = 1; });
    var trips = S.trips.map(function (t, i) {
      if (i >= n - keep || t.status !== 'done') return t;
      var ev = !!(t.events && t.events.length), no = t.noteOut != null && !!noted[t.id];
      if (!ev && !no) return t;
      cut++; var c = Object.assign({}, t); if (ev) c.events = []; if (no) delete c.noteOut; return c;
    });
    var o = { trips: trips }, salon = slimAsks();
    if (salon) { cut++; o.salon = salon; }
    return cut ? JSON.stringify(Object.assign({}, S, o)) : null;
  }
  /* 미용실 물음 (docs/SALON.md §7.6): 저장 사본에서만 1년 넘은 물음의 seed · raw 를 뺀다. 고른 이의 말(line)은 절대 안 뺀다. 뺄 게 없으면 null */
  function slimAsks() {
    var asks = S.salon && Array.isArray(S.salon.asks) ? S.salon.asks : [], old = keyAdd(todayKey(), -365), n = 0;
    var out = asks.map(function (a) {
      if (!a || typeof a.date !== 'string' || !(a.date < old) || (a.seed == null && a.raw == null)) return a;
      n++; var c = Object.assign({}, a); delete c.seed; delete c.raw; return c;
    });
    return n ? Object.assign({}, S.salon, { asks: out }) : null;
  }
  var trial = false;   /* 11-13 (재검증 C4): 불러오기의 '먼저 그려 보기' 동안은 쓰지 않는다 (renderAll → weekState 가 저장했다 — 검사 · lastSeen 자르기 전에 파일이 저장소 · 다른 탭으로) */
  function save() {
    if (trial) return false;
    S.settings.lastSeen = Math.max(Date.now(), seenOf(S) + 1);   /* 단조 증가: 같은 ms 안의 연속 저장도 순서가 남는다 */
    var json = JSON.stringify(S);
    mirrorSet(json);
    if (!storeOK) { mem[KEY] = json; if (!warned) { warned = true; quietWarn('이 브라우저에선 벽이 오늘만 남아'); } return false; }
    try { localStorage.setItem(KEY, json); lastSaved = json; return true; }
    catch (e) {
      if (isQuota(e)) {
        for (var k = 0, prev = null; k < SLIM_KEEP.length; k++) {
          var slim = slimJSON(SLIM_KEEP[k]); if (!slim || slim === prev) continue; prev = slim;
          try { localStorage.setItem(KEY, slim); lastSaved = slim; return true; } catch (e2) { if (!isQuota(e2)) break; }
        }
      }
      mem[KEY] = json;
      if (!warned) { warned = true; quietWarn('기록을 이 브라우저에 저장하지 못했어. 새로고침하면 사라질 수 있어.'); }
      return false;
    }
  }
  /* 읽을 수 없는(JSON 이 아닌) 기록은 덮어쓰기 전에 ppolppol_v2_corrupt_<시각> 으로 옮겨 둔다 (원래 키는 비움 → 다음 부팅에 또 복사·경고하지 않고, 꽉 찬 저장소에서도 자리가 난다).
     옮기지 못했으면 제자리에 되돌린다 */
  function setAsideBroken(raw) {
    store.remove(KEY);
    try { if (store.set(KEY + '_corrupt_' + Date.now(), raw)) return true; } catch (e) { /* 아래 */ }
    try { store.set(KEY, raw); } catch (e) { /* noop */ }
    return false;
  }
  function load() {
    var raw = store.get(KEY), stored = parseState(raw), mirrored = parseState(mirrorGet());
    var broken = !!raw && !stored, kept = broken && setAsideBroken(raw);
    /* 같은 탭 미러가 더 새롭다(= 새로고침 직후 스냅숏이 비었거나 뒤처졌다) → 미러로 복구하고 localStorage 에 다시 적는다 */
    if (mirrored && (!stored || seenOf(mirrored) > seenOf(stored))) { S = normalize(mirrored); save(); return S; }
    if (stored) { S = normalize(stored); lastSaved = raw; return S; }
    if (broken) quietWarn(kept ? '저장된 기록을 읽지 못했어. 원본은 따로 남겨 뒀어.' : '저장된 기록을 읽지 못했어. 새로 시작할게.');
    var v1 = store.get(KEY_V1);
    if (v1) { S = normalize(migrateV1(v1)); save(); return S; }   /* 옮긴 결과도 normalize 를 지난다 (몸 색 '처음' 줄 · 미용실 칸 — docs/SALON.md §1.4) */
    S = defaults();
    return S;
  }
  /* 개발 모드: 데모 조작 패널(#demo)과 그 안 룩 설정은 플레이어에게 보이지 않는다. ?dev=1 (이 탭 동안 sessionStorage 에 기억) · localhost/127.0.0.1 · file:// 에서만 */
  var DEV_KEY = 'ppolppol_dev';
  var DEV = (function () {
    var q = null; try { q = new URLSearchParams(location.search).get('dev'); } catch (e) { /* 옛 브라우저 */ }
    try { if (q === '1') sessionStorage.setItem(DEV_KEY, '1'); else if (q === '0') sessionStorage.removeItem(DEV_KEY); } catch (e) { /* 저장소 없음: 이 페이지만 */ }
    if (q === '1') return true;
    if (q === '0') return false;
    if (location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return true;
    try { return sessionStorage.getItem(DEV_KEY) === '1'; } catch (e) { return false; }
  })();
  /* 드러내 놓은 개발 모드: 이 탭에 ?dev=1 을 직접 붙였을 때만 (같은 탭 sessionStorage 기억 포함, ?dev=0 이면 끔). file:// · localhost 의 자동 DEV 로는 안 켜진다 —
     README 가 file:// 와 dist/ppolppol.html 을 노는 방법으로 안내하기 때문 (docs/SALON.md §1.2). 미용실이 더하는 개발용 칸(몸 색 바로 바꾸기 · 다음 미용실 대답)만 이걸 본다.
     #demo 패널 · 힌트 칸은 예전 규칙(DEV) 그대로 */
  var DEV_EXPLICIT = (function () {
    var q = null; try { q = new URLSearchParams(location.search).get('dev'); } catch (e) { /* 옛 브라우저 */ }
    if (q === '1') return true;
    if (q === '0') return false;
    try { return sessionStorage.getItem(DEV_KEY) === '1'; } catch (e) { return false; }   /* DEV 가 위에서 ?dev=1 을 이 탭에 적어 둔다 */
  })();
  /* 작은 UI 기억 (데모 펼침 등) — 뷰어별, 기록과 분리 */
  var UI_KEY = 'ppolppol_ui';
  function uiPref() { try { var o = JSON.parse(store.get(UI_KEY) || 'null'); return (o && typeof o === 'object') ? o : {}; } catch (e) { return {}; } }
  function setUiPref(k, v) { var o = uiPref(); o[k] = v; try { store.set(UI_KEY, JSON.stringify(o)); } catch (e) { /* noop */ } }
  function isObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
  /* 붙은 포스터(끝난 여행) 가운데 가장 늦은 endedAt — 앨범 점 기준 (settings.albumSeen) 과 비교한다 */
  function postersEnd(trips) { return (trips || []).reduce(function (m, t) { return t && t.poster && t.status === 'done' ? Math.max(m, t.endedAt || 0) : m; }, 0); }
  function normalize(s) {
    var d = defaults();
    s = s || {};
    var seen0 = isObj(s.settings) ? s.settings.albumSeen : undefined;   /* 합치기 전에: 기본값(0)이 '처음 읽는 옛 기록' 판단을 가리지 않게 */
    var color0 = isObj(s.octopus) ? s.octopus.color : undefined;   /* 같은 까닭: 기본 몸 색(빨강)이 옛 기록의 settings.octColor (미용실 전 설정에서 고른 색)를 가리지 않게 */
    s.v = 2;
    s.octopus = Object.assign(d.octopus, s.octopus || {});
    if (!/^#[0-9a-f]{6}$/i.test(color0 || '')) delete s.octopus.color;   /* 없거나 깨졌으면 SALON.normalize 가 colors 마지막 → 사본 → 빨강 순으로 정한다 */
    s.room = Object.assign(d.room, s.room || {});
    s.settings = Object.assign(d.settings, s.settings || {});
    /* 손으로 고친·반쯤 깨진 기록: 객체가 아닌 여행·이벤트·정류장·기념품은 버린다 (그리다 멈추지 않게) */
    s.trips = Array.isArray(s.trips) ? s.trips.filter(isObj) : [];
    s.trips.forEach(function (t) {
      t.events = Array.isArray(t.events) ? t.events.filter(isObj) : [];
      if (!isObj(t.hint)) t.hint = { raw: '' };
      if (t.receipt != null && !isObj(t.receipt)) t.receipt = null;
      if (t.receipt && t.receipt.stops != null) t.receipt.stops = Array.isArray(t.receipt.stops) ? t.receipt.stops.filter(isObj) : [];
    });
    if (!isObj(s.notes)) s.notes = {};
    s.curiosityNotes = Array.isArray(s.curiosityNotes) ? s.curiosityNotes.filter(function (n) { return isObj(n) && typeof n.id === 'string' && typeof n.text === 'string' && n.text.trim(); }) : [];
    s.curiosityNotes.forEach(function (n) { if (n.status !== 'set_down') { n.status = 'active'; n.setDownAt = null; } if (!isObj(n.about)) n.about = null; });
    /* 앨범 점 기준 (마지막으로 앨범을 연 때까지 붙은 포스터의 endedAt): 처음 읽는 옛 기록은 이미 있는 포스터를 '본 것'으로 → 업데이트만으로 점이 뜨지 않게 */
    /* (새 기록은 defaults() 에서 0 으로 시작해 첫 저장에 같이 적힌다 → 새로고침해도 아직 안 본 포스터의 점이 그대로) */
    if (typeof seen0 !== 'number' || !isFinite(seen0)) s.settings.albumSeen = postersEnd(s.trips);
    if (!Array.isArray(s.octopus.days)) s.octopus.days = [];
    s.room.souvenirs = Array.isArray(s.room.souvenirs) ? s.room.souvenirs.filter(isObj) : [];
    if (!Array.isArray(s.room.posterOrder)) s.room.posterOrder = [];
    if (!isObj(s.octopus.affinity)) s.octopus.affinity = {};
    if (!isObj(s.octopus.visits)) s.octopus.visits = {};
    s.room.lantern = clamp(s.room.lantern | 0, 0, 8);
    if (s.settings.claudeRoom != null && !(isObj(s.settings.claudeRoom) && /^[A-Za-z0-9_-]{32,64}$/.test(s.settings.claudeRoom.key || '') && /^https:\/\/[^\s"<>]+\/api\/mcp\/[A-Za-z0-9_-]{32,64}$/.test(s.settings.claudeRoom.mcp || ''))) s.settings.claudeRoom = null;
    if (PALETTES_UI.map(function (p) { return p[0]; }).indexOf(s.settings.palette) < 0) s.settings.palette = paletteDefault();
    /* 몸 색 · 미용실 (docs/SALON.md §7.2): colors 걸러 내기 · 지금 색(octopus.color, 사본 settings.octColor 도 맞춤) · 이미 놀던 기록은 지금 색 그대로 '처음' 줄 (by migrated) ·
       깨진 물음 버리기 · 오늘보다 앞선 기다림은 대답 없음으로 닫기 · 같은 날 물음이 둘이면 이른 것. 모델 말은 한 글자도 안 바꾼다 */
    if (SAL) SAL.normalize(s, { todayKey: todayKey });
    else {   /* js/salon.js 가 없을 때 (옛 번들 등): 예전 규칙 — 색 하나만 맞춘다 */
      s.octopus.color = /^#[0-9a-f]{6}$/i.test(s.octopus.color || '') ? s.octopus.color.toLowerCase() : /^#[0-9a-f]{6}$/i.test(s.settings.octColor || '') ? s.settings.octColor.toLowerCase() : DEFAULT_COLOR;
      s.settings.octColor = s.octopus.color;
      if (!Array.isArray(s.octopus.colors)) s.octopus.colors = [];
      if (!isObj(s.salon) || !Array.isArray(s.salon.asks)) s.salon = { asks: [] };
    }
    s.settings.player = normalizePlayer(s.settings.player);   /* 옛 기록(player 없음) · 손으로 고친 id 는 기본값으로 */
    return s;
  }

  /* ───────────────────────── migrate v1 → v2 (§8) ───────────────────────── */
  function migrateV1(raw) {
    var d = defaults(), old = null;
    try { old = JSON.parse(raw); } catch (e) { old = null; }
    if (!old) return d;
    var oc = old.octopus || {}, room = old.room || {}, cur = old.currency || {};
    d.octopus.name = oc.name || null;
    d.octopus.born = Date.now();
    d.octopus.trips = oc.total_trips | 0;
    d.octopus.invites = cur.hearts | 0;
    d.room.lantern = clamp(room.light_level | 0, 0, 8);
    (old.posters || []).forEach(function (p, i) {
      var ts = p.ts || Date.now();
      var id = 'trip_legacy_' + (p.id || i);
      d.trips.push({
        id: id, date: dateKey(new Date(ts)), seq: i + 1, seed: hash(id), kind: 'out', by: 'legacy',
        hint: { raw: '', match: { kind: 'none' }, followed: 'none' }, status: 'done', startedAt: ts, endedAt: ts,
        events: [], receipt: null,
        poster: { type: 'poster', title: p.title || '옛 포스터', line: '(복원된 포스터 · 기록 없음)', sticker: null, scene: 'home',
          stickerPos: { x: 70, y: 28, rot: -6 }, thumb: null, paper: 0 }
      });
      d.room.posterOrder.push(id);
    });
    try { store.set(KEY_V1_BAK, raw); store.remove(KEY_V1); } catch (e) { /* 이름 바꾸기 실패해도 진행 */ }
    d.settings.albumSeen = postersEnd(d.trips);   /* 옮겨 온 옛 포스터는 이미 본 것 (업데이트만으로 앨범 점이 뜨지 않게 — normalize 와 같은 규칙) */
    return d;
  }

  /* ───────────────────────── assets (manifest + 인라인 플레이스홀더) ───────────────────────── */
  var DEFAULT_MANIFEST = {
    'bg.room': 'assets/bg/room.svg',
    'window.rain': 'assets/window/rain.svg', 'window.drizzle': 'assets/window/drizzle.svg', 'window.stars': 'assets/window/stars.svg',
    'item.moss': 'assets/items/moss.svg', 'item.crate': 'assets/items/crate.svg', 'item.candle': 'assets/items/candle.svg',
    'item.blanket': 'assets/items/blanket.svg', 'item.board': 'assets/items/board.svg', 'item.shelf': 'assets/items/shelf.svg', 'item.curtain': 'assets/items/curtain.svg'
  };
  for (var li = 0; li <= 8; li++) DEFAULT_MANIFEST['light.lantern' + li] = 'assets/light/lantern' + li + '.svg';
  DEFAULT_MANIFEST['lantern.off'] = 'assets/lantern/off.svg'; DEFAULT_MANIFEST['lantern.on'] = 'assets/lantern/on.svg';
  ['hands', 'sea', 'sky', 'signs', 'numbers', 'sounds', 'home', 'mind', 'wild'].forEach(function (sc) { DEFAULT_MANIFEST['scene.' + sc] = 'assets/scenes/' + sc + '.svg'; });
  if (W && W.souvenirs) Object.keys(W.souvenirs).forEach(function (id) { DEFAULT_MANIFEST['souvenir.' + id] = 'assets/souvenirs/' + id + '.svg'; });
  /* tools/bundle.js 가 만든 단일 파일에서는 window.ASSETS_INLINE (key → {src:'data:…'}) 이 먼저 정의된다 → fetch 없이 그걸 쓴다 */
  window.ASSETS = window.ASSETS || Object.assign({}, DEFAULT_MANIFEST, (window.ASSETS_INLINE && typeof window.ASSETS_INLINE === 'object') ? window.ASSETS_INLINE : {});
  function assetPath(key) {
    var v = window.ASSETS && window.ASSETS[key];
    if (!v) return null;
    if (typeof v === 'string') return v;
    return v.src || v.path || v.file || v.url || null;
  }
  function loadManifest() {
    if (window.ASSETS_INLINE) return Promise.resolve(false);   /* 번들: 이미 인라인됨 */
    if (typeof fetch !== 'function' || location.protocol === 'file:') return Promise.resolve(false);   /* file:// 에서는 내장 기본 매니페스트만 */
    return fetch('assets/manifest.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('manifest'); return r.json(); })
      .then(function (m) {
        var map = (m && m.assets) ? m.assets : m;
        if (!map || typeof map !== 'object') return false;
        Object.keys(map).forEach(function (k) {
          var v = map[k];
          if (typeof v === 'string') window.ASSETS[k] = v;
          else if (v && typeof v === 'object') window.ASSETS[k] = v.src || v.path || v.file || v.url || window.ASSETS[k];
        });
        return true;
      }).catch(function () { return false; });
  }
  var PH = (typeof SCENE2D !== 'undefined' && SCENE2D.PH) || {};   /* 2D 플레이스홀더 SVG 는 js/scene2d.js 로 옮겼다 */

  /* ───────────────────────── scene (SCENE3D | SCENE2D 브리지, §7.0 §13) ───────────────────────── */
  var scene = null, sceneMode = '2d';
  /* salon = 미용실 거울 코너 (docs/SALON.md §2.1): 상자와 같은 날 (두 번째로 초대한 날) 귀가 연출의 소품 순간에 말없이 나타난다 (거울이 생긴 날 문어 줄은 없다 — 복지 MUST 7) */
  var ITEM_LEVEL = { moss: 1, crate: 2, candle: 3, blanket: 4, board: 5, shelf: 7, curtain: 8, salon: (SAL && SAL.MIRROR_LEVEL) || 2 };
  var LOOK_KEY = 'ppolppol_look';
  function itemsFor(lv) { return Object.keys(ITEM_LEVEL).filter(function (k) { return lv >= ITEM_LEVEL[k]; }); }
  /* 날씨: 등불 아크(6 가는 비, 7 맑음) → 8칸 뒤에는 날짜 시드 (1~2월엔 눈) */
  /* 테스트 훅 (tools/look-shots.js): window.__ppolLook = { hour, lantern, weather, octState, anchor, palette, key, fill } — 있을 때만 시각·날씨·등불·초기 자세·팔레트·키/필 비율을 고정 */
  function lookHook() { var h = window.__ppolLook; return (h && typeof h === 'object') ? h : null; }
  function lookNow() { /* 저장된 룩 + 훅의 key/fill (훅 값은 저장하지 않고 장면에만) */
    var o = loadLook(), hk = lookHook();
    if (hk) { if (typeof hk.key === 'number') o.key = hk.key; if (typeof hk.fill === 'number') o.fill = hk.fill; }
    return o;
  }
  function weatherFor(lv) {
    var hk = lookHook(); if (hk && hk.weather) return hk.weather;
    if (lv < 6) return 'rain';
    if (lv < 7) return 'drizzle';
    if (lv < 8) return 'clear';
    var r = mkRng(hash('wx|' + todayKey()))(), m = new Date().getMonth();
    if ((m === 0 || m === 1) && r < 0.35) return 'snow';
    return r < 0.4 ? 'rain' : r < 0.65 ? 'drizzle' : 'clear';
  }
  function hourNow() { var hk = lookHook(); if (hk && typeof hk.hour === 'number') return hk.hour; var d = new Date(); return d.getHours() + d.getMinutes() / 60; }
  function paletteNow() { var hk = lookHook(); return (hk && typeof hk.palette === 'string') ? hk.palette : S.settings.palette; }   /* __ppolLook.palette 는 저장하지 않고 장면에만 */
  function setPalette(name) {
    if (PALETTES_UI.map(function (p) { return p[0]; }).indexOf(name) < 0) return;
    S.settings.palette = name; save(); if (scene) { scene.setPalette(name); refreshPortraits(); }
    document.querySelectorAll('[data-pal]').forEach(function (b) { chipOn(b, b.dataset.pal === name); });
    renderSwatch();
  }
  /* 4갈래 칩 줄 (즉흥 / Apollo / Endesga / Resurrect): 설정 시트(개발 모드에서만) + 데모 패널 공용 */
  function paletteChips(id) {
    var row = h('div', { class: 'filters', role: 'group', 'aria-label': '팔레트', id: id });
    PALETTES_UI.forEach(function (p) {
      var b = h('button', { type: 'button', class: 'fchip' + (S.settings.palette === p[0] ? ' on' : ''), 'aria-pressed': String(S.settings.palette === p[0]), 'data-pal': p[0], text: p[1] });
      b.addEventListener('click', function () { setPalette(p[0]); });
      row.appendChild(b);
    });
    return row;
  }
  function readLook() { try { var o = JSON.parse(store.get(LOOK_KEY) || 'null'); return (o && typeof o === 'object') ? o : {}; } catch (e) { return {}; } }
  /* 룩 설정(픽셀·디더·시점·광·계절 지정)은 데모 패널(개발용)에서만 만든다 → 개발 모드에서만 따른다. 플레이어 화면은 늘 기본값 (저장해 둔 값은 지우지 않는다) */
  function loadLook() { return DEV ? readLook() : {}; }
  function saveLook(o) { try { store.set(LOOK_KEY, JSON.stringify(o)); } catch (e) { /* noop */ } }
  /* 계절 (DESIGN §15.3): 기본 = 실제 날짜(월). 데모 패널 칩으로 지정하면 룩 설정(ppolppol_look.season)에 남는다. 테스트 훅 __ppolLook.season 이 있으면 그게 먼저 (저장 X) */
  var SEASONS_UI = [['auto', '자동'], ['spring', '봄'], ['summer', '여름'], ['autumn', '가을'], ['winter', '겨울']];
  var SEASON_KO = { spring: '봄', summer: '여름', autumn: '가을', winter: '겨울' };
  function validSeason(x) { return ['spring', 'summer', 'autumn', 'winter'].indexOf(x) >= 0 ? x : null; }
  function seasonPref() { var hk = lookHook(); return validSeason(hk && hk.season) || validSeason(loadLook().season) || undefined; }   /* undefined = 자동 (장면이 월로 정한다) */
  function seasonMode() { return (scene && typeof scene.seasonMode === 'function') ? scene.seasonMode() : (seasonPref() || 'auto'); }
  function seasonLine() {
    var cur = (scene && typeof scene.season === 'function') ? scene.season() : null, mode = seasonMode();
    return '계절: ' + (SEASON_KO[cur] || '?') + ' (' + (mode === 'auto' ? '실제 날짜' : '지정') + ')';
  }
  function setSeasonPref(x) {
    var v = validSeason(x) || 'auto', o = readLook();
    if (v === 'auto') delete o.season; else o.season = v;
    saveLook(o);
    if (scene && typeof scene.setSeason === 'function') scene.setSeason(v);
    document.querySelectorAll('[data-season]').forEach(function (b) { chipOn(b, b.dataset.season === v); });
    var ln = $('dv-season-line'); if (ln) ln.textContent = seasonLine();   /* 데모 패널의 계절 한 줄 (예전 방 보기에 있던 것) */
  }
  function seasonChips(id) {   /* 자동 / 봄 / 여름 / 가을 / 겨울 — 데모 패널 (개발용 지정) */
    var row = h('div', { class: 'filters', role: 'group', 'aria-label': '계절', id: id }), cur = seasonMode();
    SEASONS_UI.forEach(function (p) {
      var b = h('button', { type: 'button', class: 'fchip' + (cur === p[0] ? ' on' : ''), 'aria-pressed': String(cur === p[0]), 'data-season': p[0], text: p[1] });
      b.addEventListener('click', function () { setSeasonPref(p[0]); });
      row.appendChild(b);
    });
    return row;
  }
  function sceneOpts() {
    return {
      pixelSize: 3, color: S.octopus.color, lantern: S.room.lantern, items: itemsFor(S.room.lantern), weather: weatherFor(S.room.lantern), hour: hourNow(),
      posters: [], souvenirs: [], reducedMotion: reduced(), speed: speed(), assetPath: assetPath, octEl: $('oct'), look: lookNow(), palette: paletteNow(), season: seasonPref(), player: S.settings.player,
      on: {
        posterTap: function (id) { openPoster(id); },
        souvenirTap: function (sv) { if (sv.tripId && tripById(sv.tripId)) { if (!salonActive) say((sv.name || sv.id) + ' — 이거 가져온 날', 'happy', 1800, { icon: souvenirIcon(sv.id) }); openPoster(sv.tripId, true); } },   /* 이름 + 말풍선에 기념품 픽셀 그림 (미용실 연출 중엔 말풍선 없이 — 문어가 고른 대답을 덮지 않는다) */
        albumTap: function () { openAlbum(); },   /* 2D 벽의 '+N' (앨범으로) */
        pet: pet,
        tap: tapOct,   /* 글자만 (예전 '…zZ' · '?' 는 기호로 읽혀 뺐다 — 주인 11-07). 깨어 있으면 그날 마지막 차례 한 줄 (11-08) */
        windowTap: function () {
          if (oct.busy || salonActive) return;   /* 미용실 연출 중엔 창문으로 걷지 않는다 */
          if (oct.state === 'sleep') { bubble(SLEEP_SAY, 1500, 'sleep'); return; }   /* 자는 중엔 깨우지 않는다 (쓰다듬기·탭과 같은 말 · 말풍선만) */
          walkTo('window').then(function () { if (!oct.busy) { octState('idle'); var w = weatherFor(S.room.lantern), hr = new Date().getHours(); say(w === 'clear' ? (hr >= 19 || hr < 6 ? '별이 보여' : '맑네') : w === 'snow' ? '눈이 와' : '비가 와', 'calm', 2000); } });
        },
        anchorReached: function () { /* moveTo 의 Promise 로 받는다 */ },
        octUp: function (up, an) { if (!up && an) { oct.anchor = an; if (an !== 'blanket' && restPhase() !== 'up') octPlace('blanket'); } updateSceneDesc(); },   /* 11-12: 위층 ↔ 다락으로 옮겨진 문어 — 다락에 놓인 자리를 앱 자리로 · 장면 설명 다시. 11-13 주인 (OW-3 b): 쉬는 차례면 담요로 (위층에 남아 있던 틈 — 내려가는 전환에 가려 보이지 않는다) */
        octResting: function () { return restPhase() === 'awake'; },   /* 11-12 주인 (검증 W3 (b)): 차례 뒤 깨어 있는 틈 (눕으러 가는 중 포함) 엔 위층에 따라 오르지 않는다 — 잠과 같이. 장면이 오르는 순간에 묻는다 (새로고침 · 다른 탭의 차례도 restPhase 가 안다) */
        place: function () { updateSceneDesc(); },   /* 3D: 의식이 다락 ↔ 집 바깥을 바꾼 순간 (2D 는 runCeremony 의 250 ms 틱이 따라간다). 놀이방에 있는 동안에도 온다 (이야기 장소만 바뀜) */
        door: function (ev) { if (window.AUDIO && ev) AUDIO.on('door', { act: ev.act, room: ev.room }); },   /* 8물결: 방 문이 열리고 닫힐 때 끼익 (장면은 AUDIO 를 부르지 않는다) */
        view: function (v) { syncRoomUI(v); if (v === 'loft') questMark('loft'); else if (v === 'play') questMark('kitchen'); },   /* 8물결: 보이는 장소(다락 · 바깥 · 놀이방)가 바뀐 프레임 */
        playerInput: function (allowed) { stickShow(allowed); },
        /* 11-10 인테리어 v0: 가구를 꾹 눌러 옮기면 자리를 저장 (S.room.layout) · 소파 위 노란 점 = 앉기 */
        furnEdit: function (stt) { if (stt && (!furnFrom || furnFrom.id !== stt.id)) furnFrom = { id: stt.id, at: typeof scene.layout === 'function' ? scene.layout()[stt.id] : null }; furnUI(stt); },   /* 배치 모드 시작 · 바뀜 · 끝(null). 들어 올린 순간의 자리 · 각도 · 크기를 적어 둔다 */
        furnMove: function (d) {
          if (!d || !d.id) return; if (!isObj(S.room.layout)) S.room.layout = {}; S.room.layout[d.id] = [d.x, d.z, d.rot | 0, +d.scale || 1]; save();
          var a = furnFrom && furnFrom.id === d.id && Array.isArray(furnFrom.at) ? furnFrom.at : null; furnFrom = null;
          if (!a || [d.x, d.z, d.rot, d.scale].some(function (v, k) { return Math.abs((+v || 0) - (+a[k] || 0)) > 0.001; })) questMark('furn');   /* 11-12 (검증 C12): 든 자리에 그대로 놓으면 '옮겨 놓기' 가 아니다 */
        },
        sofaSpot: function (p) { var b = $('btn-sofa'); if (!b) return; if (!p) { b.hidden = true; return; } b.style.left = (p.x - 22) + 'px'; b.style.top = (p.y - 22) + 'px'; b.hidden = false; },
        playerDoor: function (to) { if (!roomJob && !busyRoomWalk()) goRoom(to === 'attic' ? 'attic' : to === 'loft' ? 'loft' : 'play', $(to === 'attic' ? (roomNow() === 'loft' ? 'btn-loft-stair' : 'btn-play-door') : to === 'loft' ? 'btn-stair' : 'btn-door'), false); },   /* 문에 닿은 채 걸어 들어감 (장면이 한 번만 쏜다) */   /* 11-08 움직이기: 내 캐릭터를 움직일 수 있는 때가 바뀐 프레임 (바뀔 때만 온다) → 발자국 손잡이 hidden */
        playerStep: function () { if (window.AUDIO) AUDIO.on('step', { who: 'player' }); }   /* 내 캐릭터 한 걸음 (장면은 AUDIO 를 부르지 않는다) — js/audio.js 에 'step' 갈래가 생기면 발소리 step_* (지금은 조용히) */
      }
    };
  }
  var timeTimer = 0;
  function initScene(force2d) {   /* force2d = 3D 를 버리고 2D 로 (sceneLost) */
    var host = $('scene'), opts = sceneOpts();
    if (!force2d && typeof SCENE3D !== 'undefined' && SCENE3D.supported()) {
      opts.onLost = sceneLost;
      /* 3D 칸은 숨은 채로 온다 (index.html 의 hidden). 장면을 만들기 *전에* 먼저 드러낸다 (11-11): 숨은 칸은 0×0 으로 재어져 장면이 320×240 어림 크기로 시작하고,
         진짜 크기는 이 작업이 끝난 뒤 ResizeObserver 로 온다 — 그 사이에 boot 가 시작하는 입장 연출이 어림 크기로 하늘을 지었다. 같은 작업 안이라 그 사이에 그려지는 것은 없다.
         init 이 실패하면 바로 도로 숨기고(2D 가 재기 전에), 끝에서 sceneMode 로 한 번 더 맞춘다 */
      var box3 = $('scene3d'); box3.hidden = false;
      try { scene = SCENE3D.init(box3, opts); sceneMode = '3d'; }
      catch (e) { console.warn('[app] scene3d init 실패 → 2D 폴백', e); scene = null; box3.hidden = true; }
      try { if (scene && typeof scene.setOctWear === 'function' && isObj(S.settings.octWear)) scene.setOctWear(S.settings.octWear); } catch (e) { console.warn('[app] setOctWear', e); }   /* 문어가 쓰기로 한 것 */
      try { if (scene && typeof scene.setLayout === 'function' && isObj(S.room.layout)) scene.setLayout(S.room.layout); } catch (e) { console.warn('[app] setLayout', e); }   /* 저장된 가구 자리 */
    }
    if (!scene) { document.documentElement.removeAttribute('data-layout'); scene = SCENE2D.init(host, opts); sceneMode = '2d'; }   /* 2D 는 쌓는 배치 크기로 재야 한다 → 그리기 전에 뗀다 */
    host.classList.toggle('mode-3d', sceneMode === '3d');
    $('scene3d').hidden = sceneMode !== '3d';
    layoutSync();
    salonSpotOn = null;   /* 새 장면: 미용실 단추 허락을 다시 준다 (bindSpots → syncSalonSpot) */
    bindSpots();   /* 방 문 · 오락기 · 미용실 거울 단추를 장면에 넘긴다 (자리 · hidden 은 장면이) */
    stickSync();   /* 발자국 손잡이: 지금 장면이 움직이기를 허락하는가 (2D · API 없음 = 숨김) */
    if (!timeTimer) timeTimer = setInterval(function () { scene.setTime(hourNow()); updateSceneDesc(); checkDay(); }, 60000);   /* 1분마다: 시각 · 자정이 지나면 오늘 칸 넘기기 */
  }
  /* WebGL 컨텍스트를 잃고 3 s 안에 돌아오지 않음 (scene3d 의 opts.onLost, docs/research/a11y-and-mobile-perf.md 3): 검게 멈춘 3D 를 버리고 같은 initScene 경로로 2D 폴백.
     돌아오면 scene3d 가 부르지 않는다 → 3D 그대로. 지금 앱 상태(등불·소품·날씨·벽·선반·문어 자리와 상태)를 새 장면에 다시 그린다. 걸린 의식은 runCeremony 가 새 장면의 빈 이름을 보고 푼다 */
  function sceneLost() {
    if (sceneMode !== '3d' || !scene) return;
    console.warn('[app] WebGL 컨텍스트가 돌아오지 않음 → 2D 폴백');
    if (window.INTRO && ['sky', 'title'].indexOf(INTRO.phase) >= 0) { try { INTRO.dismiss(); } catch (e) { /* 입장 레이어 없음 */ } }   /* 멈춘 하늘에 갇히지 않게 */
    salonFinish();   /* 미용실 연출 중이었으면 끝 상태로 먼저 (기록은 이미 저장 — 새 2D 장면은 새 색 · 행 셋으로 연다) */
    var ssh = $('salon-sheet'); if (ssh && ssh.open) ssh.close();   /* 고르던 병은 옛 장면에만 나와 있었다 — 시트는 닫는다 (기록 0) */
    var old = scene; scene = null;
    try { if (typeof old.hotspots === 'function') old.hotspots({}); } catch (e) { /* 단추 묶음 풀기 실패 — 아래에서 손으로 */ }
    try { old.destroy(); } catch (e) { console.warn('[app] scene3d destroy', e); }   /* 돌던 문 작업은 destroy 가 끝낸다 (goRoom 의 Promise 도 풀린다) */
    resetRoomUI();   /* 놀이방에 있었어도 2D 는 다락에서 다시 시작 (쪽지 · 단추 · data-view) */
    var el = $('oct'), stage = $('stage');   /* destroy 가 중간에 멈췄어도 문어 DOM 은 2D 무대로 */
    if (el && stage && el.parentNode !== stage) stage.appendChild(el);
    if (el) { el.classList.remove('overlay3d'); el.style.transform = ''; el.style.display = ''; }   /* 놀이방에서 잃었으면 장면이 숨겨 둔 문어 (display:none) 도 다시 */
    initScene(true);   /* 새 2D 장면은 sceneOpts().color = 기록의 몸 색으로 시작 (renderScene 끝의 applyLook 이 한 번 더 맞춘다) */
    renderScene(); renderSouvenirs(); renderWall();
    scene.jumpTo(oct.anchor); scene.setOctState(oct.state === 'carry' ? 'walk' : oct.state);   /* 들고 오던 포스터 그림은 3D 쪽에만 있었다 → 걷는 자세로 */
    PORT.cache = {}; refreshPortraits();   /* 로그 초상도 2D 얼굴로 (한 로그 안에서 섞이지 않게) */
    var pal = $('dv-pal'), sw = $('dv-swatch'), msg = $('dv-msg');
    if (pal) pal.remove();
    if (sw) sw.innerHTML = '';
    if (msg) msg.textContent = '지금은 2D 장면이라 이 슬라이더는 적용 안 돼 (3D 그림이 멈춰서 바꿨어)';
    updateSceneDesc();
    var ld = $('look-sheet'); if (ld && ld.open) renderLook();   /* 옷장도: 그림 타일 → 글자 타일 */
    var sd = $('settings-sheet'); if (sd && sd.open) renderSettings();   /* 열려 있던 설정 시트도 2D 모양으로 (3D 미리보기 캔버스 대신 안내 한 줄 — 안 그리면 옛 초상이 남고 칩을 누를 때 조용히 사라진다) */
    toast('3D 그림이 멈춰서 2D로 바꿨어');
  }
  /* ───────────────────────── 한 화면 배치 (주인 11-08) ─────────────────────────
     3D 일 때만 <html data-layout="one">: 장면이 화면을 다 쓰고 상태 쪽지 · 큰 버튼 · 대사 · 알림이 그 위에 얹힌다 (css/style.css 맨 아래 묶음).
     오늘의 산책 목록(#log)은 그때 #log-sheet 안에 산다 — 닫힌 시트 안이라 새 줄은 화면에 안 보이고, 대신 '오늘' 단추의 점 + 한 줄 알림으로 알린다.
     2D 폴백 · 컨텍스트를 잃은 뒤에는 속성을 떼고 목록을 #log-sec 로 돌려놓는다 (예전 쌓는 배치 그대로) */
  function layoutOne() { return document.documentElement.getAttribute('data-layout') === 'one'; }
  function layoutSync() {
    var root = document.documentElement, one = sceneMode === '3d', log = $('log'), home = $(one ? 'log-slot' : 'log-sec'), b = $('btn-today'), d = $('log-sheet');
    if (one) root.setAttribute('data-layout', 'one'); else root.removeAttribute('data-layout');
    if (log && home && log.parentNode !== home) home.appendChild(log);   /* 노드를 그대로 옮긴다 (행 · 스크롤 리스너 · UIART 의 지켜보기가 따라온다) */
    var shelf = $('shelf-today');
    if (shelf && home && shelf.parentNode !== home) home.appendChild(shelf);   /* '오늘의 서가' 도 목록을 따라간다 — 한 화면 배치에선 #log-sec 가 숨어서 서가가 안 보였다 */
    if (b) b.hidden = !one;
    if (!one) { if (d && d.open) d.close(); todayDot(false); dlgShow(false); }
    warnFit();
  }
  /* 저장 경고 띠(#save-warn)가 뜨면 그 높이만큼 장면 틀(#shell)을 줄인다 — 띠 + 100dvh 로 본문이 넘쳐 스크롤이 생기지 않게 */
  function warnFit() {
    var w = $('save-warn'), root = document.documentElement, hh = w && !w.hidden ? Math.ceil(w.getBoundingClientRect().height) : 0;
    if (hh) root.style.setProperty('--warn-h', hh + 'px'); else root.style.removeProperty('--warn-h');
  }
  function logOpen() { var d = $('log-sheet'); return !!(d && d.open); }
  function todayDot(on) {   /* 앨범 단추의 '새 것' 점과 같은 규칙: 숫자 없이 점 하나 + 화면 낭독기용 한마디 */
    var b = $('btn-today'), dot = b && b.querySelector('.ib-dot'), sr = $('today-new');
    if (dot) dot.hidden = !on;
    if (sr) sr.textContent = on ? '새 줄이 있어' : '';
  }
  function openLog() {
    var d = $('log-sheet'), log = $('log'), t = $('toast'); if (!d || !layoutOne()) return;
    clearTimeout(rowTimer); rowWait = null;
    if (t && toastRow) { clearTimeout(toastTimer); t.classList.remove('show'); toastRow = false; }   /* 방금 알린 줄은 이제 목록에서 읽는다 */
    if (!d.open) {
      sheetDragReset(d); d._openedAt = performance.now();
      if (log) [].forEach.call(log.querySelectorAll('.lrow.in'), function (r) { r.classList.remove('in'); });   /* 닫힌 사이에 붙은 행들이 열 때 한꺼번에 등장 애니메이션을 다시 돌지 않게 */
    }
    showDialog(d); todayDot(false); logJump();
  }
  function logJump() {   /* 시트를 열면 가장 새 줄부터 (닫힌 동안엔 display:none 이라 scrollLog 가 잴 게 없었다) */
    var log = $('log'); if (!log) return;
    logStick = true; clearTimeout(logSettle);
    if (window.UIART && UIART.syncLog) UIART.syncLog();
    var top = logSnapTop(log);
    progScrollUntil = Date.now() + 80; logTarget = -1; log.scrollTop = top; logLastY = log.scrollTop;
  }
  /* 새 줄 알림: 시트가 닫혀 있을 때 붙은 행을 한 줄(오늘 그림 + 라벨 · 글, 넘치면 말줄임)로 2.5 s. 한꺼번에 쏟아지면 마지막 줄만 (120 ms 모음).
     혼잣말(say)은 방금 말풍선으로 보였으니 알림도 점도 없이 낭독기용 한 줄(#say-live)만 — 닫힌 시트 안의 #log(role=log)는 읽히지 않는다 */
  var rowTimer = 0, rowWait = null;
  function rowNote(row) {
    if (!layoutOne() || logOpen()) return;
    if (row.dataset.say) { var sl = $('say-live'); if (sl) sl.textContent = '혼잣말 · ' + row.dataset.say; return; }
    todayDot(true);
    rowWait = row; clearTimeout(rowTimer); rowTimer = setTimeout(rowToast, 120);
  }
  function rowLine(src, out) {   /* 행의 글을 한 줄로: 곁줄(.sub) · 그림은 빼고, 남의 글 표시(data-raw)는 그대로 옮긴다 */
    [].forEach.call(src.childNodes, function (n) {
      if (n.nodeType === 3) { out.appendChild(document.createTextNode(n.nodeValue)); return; }
      if (n.nodeType !== 1 || n.hidden || n.classList.contains('sub') || n.classList.contains('sr-only')) return;
      if (n.hasAttribute('data-raw')) { var sp = document.createElement('span'); sp.setAttribute('data-raw', n.getAttribute('data-raw')); sp.textContent = n.textContent; out.appendChild(sp); return; }
      rowLine(n, out);
    });
  }
  function rowToast() {
    var row = rowWait, t = $('toast'); rowWait = null;
    if (!row || !t || !document.body.contains(row) || !layoutOne() || logOpen()) return;
    if (t.classList.contains('show') && !toastRow) return;   /* 보통 알림(저장 · 복사 …)은 밀어내지 않는다. 점은 이미 켜져 있다 */
    var lab = row.querySelector('.ltool'), txt = row.querySelector('.ltext'), src = document.querySelector('#btn-today .snd-box svg'), body = h('span', { class: 't-txt' });
    if (!txt) return;
    if (lab && lab.textContent) body.appendChild(document.createTextNode(lab.textContent + ' · '));
    rowLine(txt, body);
    var moved = raiseToast(t); if (moved && !t.classList.contains('show')) void t.offsetWidth;
    t.textContent = ''; t.classList.add('row');
    if (src) { var ic = src.cloneNode(true); ic.setAttribute('class', 't-ico'); ic.setAttribute('width', '16'); ic.setAttribute('height', '16'); ic.setAttribute('aria-hidden', 'true'); t.appendChild(ic); }
    t.appendChild(body); toastRow = true; toastPlace(t); t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); toastRow = false; }, 2500);
  }
  /* 알림 자리: 기본은 바닥 줄 바로 위(--stack-b). 떠 있는 대사 · '돌아왔어' 쪽지와 겹치면 그 위로 올린다 (--toast-b).
     등장 애니메이션(transform)에 속지 않게 자리는 offset 으로 잰다. 시트 안으로 옮겨 간 알림은 건드리지 않는다 */
  function restRect(el) {
    var x = 0, y = 0, n = el;
    while (n) { x += n.offsetLeft; y += n.offsetTop; var p = n.offsetParent; if (p) { x += p.clientLeft; y += p.clientTop; } n = p; }
    x -= window.pageXOffset; y -= window.pageYOffset;
    return { left: x, top: y, right: x + el.offsetWidth, bottom: y + el.offsetHeight };
  }
  function toastPlace(t) {
    t.style.removeProperty('--toast-b');
    if (!layoutOne() || t.parentNode !== document.body) return;
    var vw = window.innerWidth, vh = window.innerHeight, w = t.offsetWidth, hh = t.offsetHeight, i, pass;
    var obs = [$('dlg-host'), $('back-note')].filter(function (el) { return el && !el.hidden && (el.id !== 'dlg-host' || el.classList.contains('show')); }).map(restRect);
    for (pass = 0; pass < 2; pass++) {
      var b = parseFloat(getComputedStyle(t).bottom) || 0, top = vh - b - hh, left = (vw - w) / 2, up = 0;
      for (i = 0; i < obs.length; i++) if (obs[i].right > left && obs[i].left < left + w && obs[i].bottom > top - 4 && obs[i].top < vh - b + 4) up = Math.max(up, vh - obs[i].top + 8);
      if (!up) break;
      t.style.setProperty('--toast-b', Math.round(up) + 'px');
    }
  }
  function toastRefit() { var t = $('toast'); if (t && t.classList.contains('show')) toastPlace(t); }
  /* 대사 자리 (이번 물결은 자리만 — 실제 대사 흐름은 대사창 v1 물결에서 붙인다. docs/DIALOGUE_UI.md §3.2).
     스텁(js/dialogue-stub.js)은 처음 쓸 때 만든다. APP.dlgDemo 는 개발 모드에서만: 증거 사진 · 자리 점검용 */
  var dlgN = 0, dlgReady = false;
  function dlgHost() {
    var hst = $('dlg-host'); if (!hst || !window.DLG) return null;
    if (!dlgReady) { DLG.init(hst, { name: function () { return S.octopus.name || ''; } }); dlgReady = true; }
    return hst;
  }
  function dlgShow(on) {
    var hst = $('dlg-host'), root = document.documentElement; if (!hst) return;
    hst.classList.toggle('show', !!on); root.classList.toggle('dlg-on', !!on);
    if (on) root.style.setProperty('--dlg-h', Math.ceil(hst.offsetHeight) + 'px'); else root.style.removeProperty('--dlg-h');
    toastRefit();
  }
  function dlgDemo(text, pace) {
    if (!DEV) return null;
    var hst = dlgHost(); if (!hst) return null;
    dlgN++;
    var p = DLG.say({ voice: 'octopus', by: 'demo-rules', text: String(text == null ? '' : text), pace: pace === 'wait' ? 'wait' : 'flow' });
    dlgShow(true);
    return p.then(function () { dlgN = Math.max(0, dlgN - 1); if (!dlgN) dlgShow(false); });
  }
  /* part: 'lantern' 등불만 · 'items' 소품·날씨만 · 생략하면 전부 (귀가 연출에서 둘을 200ms 띄운다) */
  function renderScene(part) {
    var lv = S.room.lantern;
    if (part !== 'items') scene.setLantern(lv);
    if (part !== 'lantern') { scene.setItems(itemsFor(lv)); scene.setWeather(weatherFor(lv)); }
    document.title = (S.octopus.name ? S.octopus.name + ' · ' : '') + roomTitle(lv) + ' · 뽈뽈 문어';
    updateSceneDesc();
    applyLook({ still: true });   /* 장면 몸색이 기록과 다르면 맞춘다 (불러오기 · 초기화 · 다른 탭 · 2D 폴백 · 이름 저장 — 이 길들이 다 여기를 지난다) */
    syncSalonSpot();   /* 거울이 막 생겼으면 (등불 2칸) 미용실 단추를 허락한다 */
  }

  /* ── 몸 색 (docs/SALON.md §1.3): 바꾸는 길은 setOctColor 하나, 장면은 applyLook 이 기록(S.octopus.color)을 따라간다 ──
     meta = { how: 'first'|'salon'|'dev', by, ask?, at? } — 없으면 개발용 기록 { how: 'dev', by: 'dev' } (APP.setOctColor(hex) 한 인자 = 시험 · 개발용).
     first 의 by: player(색을 누름) | default(안 누름) — migrated 는 normalize 만 쓴다. salon 의 by: demo-rules | model | human (미용실 물음은 SALON.commit 이 물음 줄과 함께 한 번에 쓴다).
     모르는 by 는 'unknown' (진짜 고른 이로 올려 주지 않는다) */
  var COLOR_BY = { first: ['player', 'default', 'migrated'], salon: ['demo-rules', 'model', 'human'], dev: ['dev'] };
  function normHex(x) { return typeof x === 'string' && /^#[0-9a-f]{6}$/i.test(x) ? x.toLowerCase() : null; }
  function setOctColor(hex, meta) {
    hex = normHex(hex); if (!hex) return false;
    meta = isObj(meta) ? meta : {};
    var how = COLOR_BY[meta.how] ? meta.how : 'dev', by = COLOR_BY[how].indexOf(meta.by) >= 0 ? meta.by : how === 'dev' ? 'dev' : 'unknown';
    var line = { at: typeof meta.at === 'number' && isFinite(meta.at) ? meta.at : Date.now(), date: todayKey(), color: hex, how: how, by: by };
    if (typeof meta.ask === 'string') line.ask = meta.ask;
    if (!Array.isArray(S.octopus.colors)) S.octopus.colors = [];
    S.octopus.colors.push(line);
    S.octopus.color = hex; S.settings.octColor = hex;   /* 사본도 같이 (옛 코드가 읽는 자리) */
    save();
    applyLook({ still: how !== 'salon' });   /* 흔드는 건 미용실 연출뿐 */
    return true;
  }
  /* 처음 색을 이미 골랐나 (colors 에 'first' 줄). 새 기록 · 전체 초기화 뒤엔 없다 → 첫 실행 창이 색 줄을 보이고 이름 저장 때 한 줄 넣는다 */
  function hasFirstColor() { return (S.octopus.colors || []).some(function (c) { return c && c.how === 'first'; }); }
  /* 미용실 연출 중 (BUILD B: salonStage 가 setSalonActive(true) → 끝에 false). 그동안 장면 몸색은 옛 색 그대로 두고(applyLook 을 미룸 — 기록은 [물어보기] 순간 이미 새 색),
     돌아다니기 · 생각 말풍선 · 쓰다듬기 · 톡 한 줄 · 창문 걷기 · 낮잠 들기를 멈춘다. oct.busy 는 setBusy 가 덮어쓰므로 쓰지 않는다 (docs/SALON.md §3.3) */
  var salonActive = false, lookLater = null;
  function applyLook(opts) {   /* → 장면을 바꿨으면 true */
    if (!scene) return false;
    if (salonActive) { lookLater = Object.assign(lookLater || {}, opts || {}); return false; }   /* 연출이 끝나면 (setSalonActive(false)) 한 번 */
    var want = normHex(S.octopus.color), have = typeof scene.color === 'function' ? normHex(scene.color()) : null;
    if (!want || want === have) return false;
    scene.setColor(want, Object.assign({ still: true }, opts));
    refreshPortraits();
    return true;
  }
  function setSalonActive(on) {
    salonActive = !!on;
    var sc = $('scene'); if (sc) sc.classList.toggle('salon-on', salonActive);   /* 연출 중엔 놀이방 문 단추를 숨긴다 (css · 기술 SHOULD 8) — 거울 단추는 syncSalonSpot 이 */
    syncSalonSpot();
    if (salonActive) {   /* 깨어 있는 틈이 끝나 담요로 눕으러 가던 중이면 그만둔다 (연출이 끝나면 lieDown 이 다시 — 그동안 눕지 않는다) */
      if (rest && rest.lying) { rest.lying = false; clearTimeout(restTimer); restTimer = setTimeout(lieDown, 700); }
      return;
    }
    var o = lookLater; lookLater = null;
    applyLook(o || { still: true });   /* 연출 중에 미룬 것 (다른 탭 · 불러오기) — 연출이 이미 새 색을 칠했으면 할 일 없음 */
  }
  /* 거울 코너가 있나 (등불 SALON.MIRROR_LEVEL 칸부터 — 장면 ITEM_LEVEL.salon 과 같다) */
  function mirrorUp() { return S.room.lantern >= ((SAL && SAL.MIRROR_LEVEL) || 2); }
  /* 이 탭이 쓴 미용실 물음 [{ ask, at }] (SALON.MINE_MS 동안) — 다른 탭이 그걸 받기 전에 만든 저장이 오면 adoptRemote 가 SALON.merge 로 다시 얹는다 (산책의 mine 과 같은 생각).
     [물어보기] 로 물음을 저장한 뒤 rememberAsk(ask) (salonAsk) */
  var mineAsks = [];
  function rememberAsk(ask) { if (isObj(ask) && typeof ask.id === 'string') mineAsks.push({ ask: ask, at: Date.now() }); }

  /* ───────────────────────── salon: 미용실 (docs/SALON.md §3 · 주인 11-08 밤 "대신 이 색으로 염색해볼까? 이런 식으로 미용실") ─────────────────────────
     다락 뒷벽 거울 코너(등불 2칸부터)를 누르면 #salon-sheet: 병 6 (+ 처음 색 1) 가운데 하나를 골라 [물어보기] → 바꿀지는 문어가 정한다 (지금은 데모 규칙 · 나중엔 모델).
     답은 누른 순간 정해 save() 한 번에 쓴다 (SALON.makeAsk · commit). 장면만 연출(salonStage)이 끝날 때까지 옛 색이다 (salonActive 동안 applyLook 을 미룸).
     연출은 결정을 다시 보여 주는 재생일 뿐 — 새로고침 · 다른 탭 · 앨범은 다시 고르지 않고 기록의 행 셋을 그린다. 물음은 하루 한 번 (대답이 무엇이든), '그대로' 한 색은 며칠 쉰다 (SALON).
     마음 바꾸기를 꾸며 내지 않는다: 숨 고르기 · 움츠림은 두 답이 같고, 다가가기는 '바꾸기' 를 고른 뒤뿐. '그대로' 는 담담하게 (시무룩 · 징글 없음). 미용실은 아무것도 주지 않는다 */
  var salonPickHex = null;   /* 시트에서 고른 병 (고를 수 있는 병만 · 없으면 null) */
  var salonRun = null;       /* 지금 연출 중인 물음 { ask, st(SALON.staging), n(보인 행 번호까지), face, t0, expect, iv, wakers, focus, ring, resolve } — 없으면 null */
  var salonNext = null;      /* 개발용 '다음 미용실 대답' (?dev=1 을 직접 붙인 탭만): null = 규칙대로 · 'dye' · 'keep' · 'none' — 한 번 쓰면 규칙대로 */
  var salonSpotOn = null;    /* 장면에 마지막으로 준 setSalonOpen 값 (같으면 다시 부르지 않는다 · 새 장면이면 null) */
  /* 소리 훅 (docs/SALON.md §3.9): pick { color } · ask · answer { action, by, joy } · tub { on } · splash · done { color, joy } · drain. 짝은 소리 세션 몫 (audio.js 는 모르는 이름을 넘긴다) */
  function salonSound(act, extra) { if (window.AUDIO && AUDIO.on) AUDIO.on('salon', Object.assign({ act: act }, extra || {})); }
  function salonAsks() { return S.salon && Array.isArray(S.salon.asks) ? S.salon.asks : []; }
  function asksOn(key) { return salonAsks().filter(function (a) { return a && a.date === key && a.status !== 'dropped'; }); }   /* 그 날의 물음 (다른 탭에 밀린 dropped 는 그리지 않는다 — 내보낸 기록엔 남는다) */
  /* 문어 쪽 상태 (SALON.canAsk): 자는 중 = 장면이 자고 있을 때 (돌아온 뒤 깨어 있는 틈은 깨어 있다) · 나감 · 바쁨 = 산책 중이거나 연출 중 */
  function salonOct() { return { mirror: mirrorUp(), away: oct.state === 'away' || sceneCeremony() === 'depart', busy: busy || !!salonRun, asleep: oct.state === 'sleep' }; }
  /* 거울 단추 허락 (docs/SALON.md §3.1): 거울이 있고 · 산책 중이 아니고 · 문어가 나가 있지 않고 · 연출 중이 아닐 때. 다락이 안 보이는 때(바깥 · 놀이방 · 전환 · 문 · 의식 · 입장)는 장면이 숨긴다.
     자는 중 · 오늘 이미 물었어도 보인다 (누르면 '쿨쿨…' · 토스트) */
  function syncSalonSpot(force) {
    if (!scene || typeof scene.setSalonOpen !== 'function') return;
    var on = !!SAL && mirrorUp() && !busy && !salonRun && !salonActive && oct.state !== 'away' && !furnMode;   /* 가구 배치 중엔 숨긴다 (가구를 들고 있는 손 · 장면 톡은 가구 몫 — 11-10 배치 모드) */
    if (on === salonSpotOn && !force) return;
    try { scene.setSalonOpen(on); salonSpotOn = on; }   /* 장면이 받은 뒤에 적는다: 던졌으면 다음 맞춤 때 다시 준다 (예전엔 먼저 적어서 거울 단추가 새로고침까지 숨었다 — 검증 11-10 E4) */
    catch (e) { console.warn('[app] setSalonOpen', e); }
  }
  function salonRefusal(reason) {   /* 물을 수 없는 까닭 → 말풍선 · 토스트 (기록 0). 거울 없음 · 나감 · 바쁨은 단추가 숨어 있어야 하는 때라 아무 말 없다 */
    if (reason === 'asleep') { bubble(SLEEP_SAY, 1500, 'sleep'); tapSR(SLEEP_SAY); }   /* 깨우지 않는다 · 시트 없음 */
    else if (reason === 'asked_today') toast(SAL.TEXT.askedToday);
    else if (reason === 'waiting') toast(SAL.TEXT.waiting);
  }
  /* 거울 단추 (#btn-salon) → 시트. 문어는 하던 대로 있는다 (걷는 건 '바꾸기' 를 고른 뒤뿐) */
  function openSalon() {
    var d = $('salon-sheet');
    /* 11-11 미용실은 위층: 3D 에서는 문어가 위층에 따라 올라와 있을 때만 연다. 다락(거울 없음)에서는 열리지 않고, 위층인데 문어가 아래층에서 자고 있으면 한 줄만 (깨우지 않는다 · 기록 0) */
    if (sceneMode === '3d' && !octWithMe()) { if (SAL && scene && d && roomNow() === 'loft' && !salonRun && !busy && !roomJob) toast(oct.state === 'sleep' ? SLEEP_DOWN_SAY : oct.state === 'away' ? AWAY_SAY : DOWN_SAY); return false; }   /* 11-12 (검증): 깨어서 아래층에 있을 때도 한 줄 (혼자 올라오게 하지는 않는다) */
    if (!SAL || !scene || !d || salonRun || busy || (inPlay() && !octWithMe()) || roomJob || introUp() || furnMode) return false;   /* 방(놀이방 · 위층)에서는 문어가 따라 올라와 있을 때만 (11-11 미용실은 위층) · furnMode = 가구 배치 중 */
    if (d.open) return true;
    syncFromStore();   /* 다른 탭이 오늘 이미 물었으면 시트 대신 토스트 */
    var r = SAL.canAsk(S, todayKey(), salonOct());
    if (!r.ok) { salonRefusal(r.reason); return false; }
    salonPickHex = null;
    if (typeof scene.salonOffer === 'function') scene.salonOffer(null);
    var nm = $('salon-name'); if (nm) nm.textContent = '';
    renderSalonSheet();
    sheetDragReset(d); d._openedAt = performance.now();
    var sc = $('scene'), top = sc ? Math.floor(sc.getBoundingClientRect().top) : 0;
    if (top < 0) window.scrollBy(0, top);   /* 장면 위쪽이 화면 밖으로 굴러가 있으면 다 보이게 — 시트는 뒤 막 없이 아래에서 올라오고, 거울 · 문어가 그 위에 보여야 한다 */
    showDialog(d);   /* 포커스는 맨 위 제목 (.dlg-top) */
    salonFrame(d);
    return true;
  }
  /* 한 화면 배치 (11-10): 장면이 화면을 다 쓰고 시트는 그 아래쪽을 덮는다. 기본 구도에선 거울 · 거울 옆 문어가 시트 위에 보이지만 (스모크 Y 가 잰다),
     손으로 밀어 둔 화면이면 거울 코너가 시트에 가리거나 위쪽 바 밑에 들어가 있을 수 있다 → 그때만 기본 구도로 되돌린다 (scene.recenter, 0.3 s). 확대는 그대로 둔다.
     48 px × 배율 = 거울 상자 아래로 거울 옆에 선 문어가 더 내려오는 만큼 */
  function salonFrame(d) {
    if (!scene || typeof scene.pan !== 'function' || typeof scene.recenter !== 'function' || typeof scene.spotRect !== 'function') return false;
    var pn = scene.pan(), sp = scene.spotRect('salon'), c = sp && sp.client;
    if (!pn || !(pn.x || pn.y) || !c) return false;
    var bar = layoutOne() ? $('status') : null, lo = bar ? bar.getBoundingClientRect().bottom : 0, hi = d.getBoundingClientRect().top;
    if (c.y >= lo && c.y + c.h + 48 * (pn.zoom || 1) <= hi) return false;
    scene.recenter();
    return true;
  }
  /* 시트를 연 톡에 딸린 click 인가 (바깥 톡으로 치지 않는다): 연 바로 그 톡의 click (시각이 연 때보다 앞) 과, 거울을 두 번 톡 한 둘째 (연 뒤 SHEET_SETTLE 안) —
     예전엔 둘째 톡이 방금 연 시트를 닫았다 (검증 11-10 P6 = E12). 잰 것은 click 의 시각 (= 손가락이 떨어진 때 — 느린 기기에서 click 이 늦게 처리돼도 맞는다 · tapTime).
     시각 기준이 다른 옛 브라우저만 처리하는 지금으로 잰다. 그 뒤의 바깥 톡은 그만두기 그대로. 브라우저가 스스로 하는 바깥 톡 닫기는 이 시트에선 끈다 (bind) */
  function salonOpeningTap(d, e) {
    var at = d._openedAt || 0;
    return !!at && tapTime(e) - at < SHEET_SETTLE;
  }
  /* 병 그림 16×16 (×2 = 32 px, 보이는 칸 36 px 안): 코르크 · 목 · 둥근 몸 · 물약(currentColor = 그 병의 색) · 반짝 한 줄. 글자 없음 (낭독은 aria-label) */
  var BOTTLE_SVG = (function () {
    var R = { ink: [[6, 0, 4, 1], [5, 1, 1, 2], [10, 1, 1, 2], [5, 3, 6, 1], [5, 4, 1, 2], [10, 4, 1, 2], [3, 6, 3, 1], [10, 6, 3, 1], [2, 7, 1, 7], [13, 7, 1, 7], [3, 14, 1, 1], [12, 14, 1, 1], [4, 15, 8, 1]],
      cork: [[6, 1, 4, 2]], glass: [[6, 4, 4, 3], [3, 7, 10, 1]], potion: [[3, 8, 10, 6], [4, 14, 8, 1]], hi: [[4, 9, 1, 2]] };
    var s = '<svg class="bt-art" viewBox="0 0 16 16" width="32" height="32" shape-rendering="crispEdges" aria-hidden="true" focusable="false">';
    Object.keys(R).forEach(function (k) { R[k].forEach(function (q) { s += '<rect class="bt-' + k + '" x="' + q[0] + '" y="' + q[1] + '" width="' + q[2] + '" height="' + q[3] + '"/>'; }); });
    return s + '</svg>';
  })();
  /* 시트 그리기: 병 목록은 SALON.bottles (지금 색 · 쉬는 색 · 처음 색 병 — 7개를 넘지 않는다). 다른 탭이 바꿔 고른 병을 더는 고를 수 없으면 놓는다 */
  function renderSalonSheet() {
    var box = $('salon-bottles'); if (!box || !SAL) return;
    var list = SAL.bottles(S, todayKey()), nm = $('salon-name');
    if (salonPickHex && !list.some(function (b) { return b.hex === salonPickHex && b.selectable; })) { salonPickHex = null; if (nm) nm.textContent = ''; if (scene && typeof scene.salonOffer === 'function') scene.salonOffer(null); }
    box.innerHTML = ''; box.setAttribute('data-n', String(list.length));
    list.forEach(function (b) {
      var btn = h('button', { type: 'button', class: 'bottle', 'data-hex': b.hex, 'data-kind': b.kind, 'aria-pressed': String(b.hex === salonPickHex), 'aria-label': b.aria, 'aria-disabled': b.selectable ? null : 'true', html: BOTTLE_SVG });
      btn.style.color = b.hex;   /* 물약 칸 = currentColor */
      btn.addEventListener('click', function () { salonPick(b.hex); });
      box.appendChild(h('div', { class: 'bcell' + (b.current ? ' now' : '') + (b.resting ? ' rest' : '') }, [btn, h('span', { class: 'bplank', 'aria-hidden': 'true' }), h('span', { class: 'bnote', 'aria-hidden': 'true', text: b.note || '' })]));   /* 병 아래 나무 판 · 작은 글 ('지금' · '처음' — 낭독은 aria-label 이 한다) */
    });
    salonAskState();
  }
  function salonAskState() { var a = $('salon-ask'); if (a) a.setAttribute('aria-disabled', salonPickHex ? 'false' : 'true'); }   /* 고를 수 있는 병을 고르기 전엔 aria-disabled (흐린 글자) */
  /* 병 누르기: 고를 수 있으면 aria-pressed · 이름 줄 '파란색' · 장면에서 그 병이 앞으로 (눈이 따라간다). 지금 색 · 쉬는 색이면 고른 것을 놓고 이름 줄에 그 사실 한 줄 */
  function salonPick(hex) {
    if (!SAL || salonRun) return false;
    var b = SAL.bottles(S, todayKey()).filter(function (x) { return x.hex === SAL.normHex(hex); })[0], nm = $('salon-name');
    if (!b) return false;
    salonPickHex = b.selectable ? b.hex : null;
    /* 시트를 열어 둔 채 날이 바뀌어 병의 쉼이 풀렸으면 (또는 생겼으면) 병을 다시 그린다 — 예전엔 고른 병이 aria-disabled · '며칠 뒤에 …' 라벨 그대로였다 (검증 11-10 E11). 누른 병의 포커스는 새 단추로 */
    var bq = '#salon-bottles .bottle[data-hex="' + b.hex + '"]', be = document.querySelector(bq);
    if (be && ((be.getAttribute('aria-disabled') === 'true') === b.selectable || be.getAttribute('aria-label') !== b.aria)) {
      var hadFocus = document.activeElement === be;
      renderSalonSheet();
      if (hadFocus && (be = document.querySelector(bq))) { try { be.focus({ preventScroll: true }); } catch (e) { be.focus(); } }
    }
    [].forEach.call(document.querySelectorAll('#salon-bottles .bottle'), function (x) { x.setAttribute('aria-pressed', String(x.dataset.hex === salonPickHex)); });
    if (nm) nm.textContent = b.say;   /* role=status: 파란색 · 지금 이 색이야. · 이 색은 며칠 뒤에 물어볼 수 있어. · 처음 색 */
    if (scene && typeof scene.salonOffer === 'function') scene.salonOffer(salonPickHex);
    salonAskState();
    if (b.selectable) salonSound('pick', { color: b.hex });
    return b.selectable;
  }
  /* [물어보기]: 저장소를 다시 읽어 합친 뒤 (두 탭 · 자정 넘김) SALON.canAsk → 답을 정하고 바로 저장 (save 한 번) → 시트를 닫고 연출. 새로고침으로 물음을 무를 수 없다.
     개발용 '다음 대답' 이 걸려 있으면 그 답 (by 'human' — 결정만, 말 · 얼굴 · 기쁨 없음). ring = 키보드로 눌렀다 (연출이 끝나면 거울 단추로 포커스 링과 함께) */
  function salonAsk(ring) {
    var d = $('salon-sheet');
    if (!SAL || !d || !d.open || salonRun || !salonPickHex) return false;
    var hex = salonPickHex, opener = d._opener;
    syncFromStore();
    var today = todayKey(), r = SAL.canAsk(S, today, salonOct());
    if (!r.ok) { d.close(); salonRefusal(r.reason); return false; }
    if (!SAL.canOffer(S, today, hex).ok) {   /* 그새 지금 색 · 쉬는 색이 됐다 (다른 탭) — 고른 것을 놓고 그 사실 한 줄 (다시 고르게) */
      var was = SAL.bottles(S, today).filter(function (x) { return x.hex === hex; })[0];
      renderSalonSheet(); var nm = $('salon-name'); if (nm && was) nm.textContent = was.say;
      return false;
    }
    var dev = DEV_EXPLICIT && salonNext ? SAL.humanAnswer(salonNext === 'none' ? null : salonNext) : undefined;
    var ask = SAL.makeAsk(S, { at: Date.now(), today: today, offer: hex, answer: dev });
    if (!ask) { d.close(); return false; }
    if (dev) { salonNext = null; paintSalonNext(); }
    setSalonActive(true);   /* 저장보다 먼저: 다른 탭 · 다시 그리기가 연출 전에 장면 몸색을 바꾸지 않게 (applyLook 을 미룬다) */
    /* 묻는 그 순간 쓰다듬기 뒤끝을 걷는다 (검증 11-10 E2): 2 s 뒤의 '…' 예약 (pet — 11-13 전엔 '…좋아') 을 지우고, 떠 있던 혼잣말 · 톡 한 줄 · 생각 말풍선을 내린다.
       예전엔 시트가 닫히는 0.25 s 뒤 (salonSettle) 에야 지워서, 물음 바로 뒤에 코드가 쓴 그 말풍선이 뜨고 곧이어 '안 바꿀래.' 가 나올 수 있었다 — 마음을 바꾼 것처럼 읽힌다. 대답 말풍선은 이 뒤에 뜬다 */
    clearTimeout(petTimer); if (oct.state === 'pet') octState('idle');
    var ob = $('oct-bubble'); if (ob && !ob.hidden) bubble('', 0);
    SAL.commit(S, ask); save(); rememberAsk(ask);   /* 물음 한 줄 + ('바꾸기' 면) colors 한 줄 + octopus.color + 사본 — 한 번에 */
    salonSound('ask');
    salonStage(ask, { focus: opener === $('btn-salon'), ring: !!ring });
    d.close();   /* 연출 중이라 내민 병은 그대로 앞에 있다 (close 처리가 salonOffer(null) 을 하지 않는다) */
    return true;
  }
  /* 연출 기다림: ms 뒤 (끝으로 감으면 바로) */
  function stageWait(my, ms) {
    if (salonRun !== my) return Promise.resolve();
    return new Promise(function (res) {
      var t = 0;
      function done() { clearTimeout(t); var i = my.wakers.indexOf(done); if (i >= 0) my.wakers.splice(i, 1); res(); }
      t = setTimeout(done, Math.max(0, ms));
      my.wakers.push(done);
    });
  }
  /* 연출 중 고른 이의 얼굴 (상태가 바뀌어 장면이 기본 얼굴로 돌려도 다시) */
  function stageFace() { if (salonRun && salonRun.face && scene) scene.setExpression(salonRun.face); }
  function relaxFace(ms) { clearTimeout(exprTimer); exprTimer = setTimeout(function () { if (scene && !salonRun && oct.state !== 'sleep') scene.setExpression(STATE_EXPR[oct.state] || 'idle'); }, Math.max(0, ms)); }
  /* 물음 행 DOM (SALON.rows → 집 · 문어 목소리 행). 행 3 꼬리 span.lby = 누가 정했나 (데모 규칙 · 모델 · 사람이 정함 — 아무도 안 골랐으면 없음) */
  function salonRowDOM(ask, r) {
    var row;
    if (r.voice === 'octopus') row = logRow(r.label, rawSpan(r.text, r.raw ? 'model' : null), 'c-amber', false, r.expr || 'idle');   /* 고른 이의 말 원문 (모델 말은 data-raw — 한 글자도 안 바꾼다) */
    else {
      var fr = document.createDocumentFragment(); fr.appendChild(document.createTextNode(r.text));
      if (r.tail) { fr.appendChild(document.createTextNode(' ')); fr.appendChild(h('span', { class: 'lby', text: r.tail })); }   /* 사이 한 칸: 한 줄 알림(rowToast) · 낭독이 '…그대로야.데모 규칙' 으로 붙지 않게 */
      row = logRow(r.label, fr, 'c-amber', false, null);
    }
    row.setAttribute('data-salon', ask.id); row.setAttribute('data-n', String(r.n));
    return row;
  }
  /* 물음 하나의 행들 (upto 번 행까지 — 없으면 연출 중인 물음은 지금 박자까지, 아니면 전부). 두 번 그리지 않는다 */
  function salonRowsDOM(ask, upto) {
    if (!SAL || !ask) return [];
    var lim = upto != null ? upto : (salonRun && salonRun.ask.id === ask.id ? salonRun.n : 3);
    return SAL.rows(ask, S.octopus.name).filter(function (r) { return r.n <= lim; }).map(function (r) { return salonRowDOM(ask, r); });
  }
  function askById(id) { var a = salonAsks(); for (var i = 0; i < a.length; i++) if (a[i] && a[i].id === id) return a[i]; return null; }
  /* 연출 박자에 맞춰 오늘 로그에 행을 붙인다 (upto 번 행까지). 다른 탭이 같은 날 먼저 물어 이 물음이 밀렸으면(dropped) 더 그리지 않는다 */
  function stageRows(my, upto) {
    var a = askById(my.ask.id) || my.ask;
    if (a.status === 'dropped') { my.n = 3; return false; }
    var rows = SAL.rows(a, S.octopus.name).filter(function (r) { return r.n > my.n && r.n <= upto; });
    my.n = Math.max(my.n, upto);
    if (!rows.length) return true;
    var log = $('log'), sec = log && log.querySelector('[data-day="' + a.date + '"]');
    if (!sec && a.date === todayKey()) sec = ensureTodaySection();
    if (sec) rows.forEach(function (r) { appendLogRow(sec, salonRowDOM(a, r)); });
    return true;
  }
  /* 연출 (docs/SALON.md §3.3 · §3.4): 시트 닫힘 → 행 1 → (걷던 걸음 도착 · 쓰다듬기 끝) → 숨 고르기 1.0 s → 움츠림 0.5 s (두 답이 같다) → 대답
     (얼굴 = 고른 이의 expr · 말이 있으면 말풍선 + 행 2) → '바꾸기': 거울 옆으로 → 대야 · 붓기 · 첨벙(새 색) · 털기 · (기쁨) · (거울 보기) · 치움 / '그대로': 병이 제자리로 · 몸을 앞으로
     / 대답 없음: 가만히 · 병이 제자리로 → 행 3. 지킴이: 250 ms 마다 — 탭이 숨으면 · 예상 길이 × 속도 + 4 s 를 넘기면 끝으로 감는다 (salonFinish). → Promise */
  function salonStage(ask, o) {
    o = o || {};
    if (salonRun) salonFinish();
    var st = (SAL && SAL.staging(ask)) || { action: null, color: null, expr: 'idle', joy: false, look: false, bubble: null }, sp = speed(), red = reduced();
    var dye = st.action === 'dye' && !!st.color;
    var my = salonRun = { ask: ask, st: st, n: 0, face: null, t0: Date.now(), wakers: [], iv: 0, focus: !!o.focus, ring: !!o.ring, resolve: null };
    my.expect = 250 + 4000 + 1500 + (dye ? 400 + 7000 + 6500 : 2600);   /* ms (× 속도) — 넘으면 지킴이가 감는다 */
    var done = my.done = new Promise(function (res) { my.resolve = res; });
    setSalonActive(true);   /* 돌아다니기 · 생각 말풍선 · 쓰다듬기 · 톡 한 줄 · 창문 걷기 · 낮잠 들기를 멈춘다 · 거울 단추 · 놀이방 문 숨김 */
    my.iv = setInterval(function () { if (salonRun !== my) { clearInterval(my.iv); return; } if (document.hidden || Date.now() - my.t0 > my.expect * speed() + 4000) salonFinish(); }, 250);
    function live() { return salonRun === my && !!scene; }
    function wait(ms) { return stageWait(my, ms * sp); }
    function beat(ev) {   /* 장면 박자 (salonDye onBeat): 소리 훅 · 반짝 · 새 색이면 로그 초상과 장면 설명도 */
      if (!ev) return;
      if (ev.act === 'done') { refreshPortraits(); updateSceneDesc(); if (ev.skipped) return; }
      if (ev.act === 'joy' && window.UIART && UIART.fx) UIART.fx('sparkle');
      if (ev.act === 'tub') salonSound('tub', { on: !!ev.on });
      else if (ev.act === 'splash' || ev.act === 'drain') salonSound(ev.act);
      else if (ev.act === 'done') salonSound('done', { color: ev.color, joy: !!ev.joy });
    }
    function answer() {   /* 대답을 보이는 순간: 얼굴 = 고른 이의 expr (데모 '바꾸기' happy · '그대로' idle · 사람 · 아무도 = idle). happy 면 장면의 기본 폴짝 2번 */
      my.face = st.expr || 'idle';
      scene.setExpression(my.face);
      if (st.bubble) {   /* 말이 있을 때만 말풍선 (앞 24자 + '…') + 행 2 (전문). 말이 없으면 둘 다 없다 — 데모 문구로 채우지 않는다 */
        var given = ask.by === 'model';
        bubble(st.bubble, clamp(2000 + 90 * Array.from(st.bubble).length, 2600, 4600), 'say', given ? { raw: 'model', rawText: st.bubble, tap: true } : null);
        if (given) { tapGivenBy = 'model'; renderBrainTag(); clearTimeout(tapTagTimer); tapTagTimer = setTimeout(function () { tapGivenBy = null; renderBrainTag(); }, 4700); }   /* 모델 말이 떠 있는 동안 '데모' 꼬리표를 숨긴다 (톡 한 줄과 같은 규칙) */
      }
      stageRows(my, 2);
      salonSound('answer', { action: st.action, by: ask.by, joy: !!st.joy });
    }
    function runDye() {
      if (!live() || typeof scene.salonDye !== 'function') return;
      var p = Promise.resolve(scene.salonDye(st.color, { joy: !!st.joy, look: !!st.look, id: ask.id, onBeat: beat }));
      /* 모션 줄이기: 움직임 없는 칸들이라 (약 1.4 s) 느린 기기에서 프레임이 늦어도 1.6 s 가 지나면 끝 칸으로 (새 색 · 대야 치움) — 리듬은 남기고 기다림은 늘리지 않는다 */
      if (red) p = Promise.race([p, stageWait(my, 1600 * sp)]).then(function () { var m = live() && typeof scene.motion === 'function' ? scene.motion().salon : null; if (m && m.active === 'dye' && typeof scene.salonFinish === 'function') scene.salonFinish(); });
      return p.then(function () { stageFace(); });
    }
    function toMirror() {   /* '바꾸기' 를 고른 뒤에만 거울 옆으로 (말풍선 0.4 s 뒤). 이미 거기면 말풍선 1.6 s 를 기다린다 · 모션 줄이기면 바로 그 자리 (말풍선은 그대로 떠 있다) */
      var there = oct.anchor === 'salon' && oct.state !== 'walk';
      if (red) { if (!there) { octPlace('salon'); octState('idle'); stageFace(); } return Promise.resolve(); }
      if (there) return wait(1600);
      return wait(400).then(function () {
        if (!live()) return;
        var w = walkTo('salon'); stageFace();
        return Promise.race([w, stageWait(my, 7000 * sp)]).then(function () {
          if (!live()) return;
          if (oct.state === 'walk' && typeof scene.finishWalk === 'function') scene.finishWalk();   /* 7 s 안에 못 가면 그 자리로 */
          octState('idle'); stageFace();
        });
      });
    }
    Promise.resolve()
      .then(function () { return wait(red ? 0 : 250); })   /* 시트가 닫힌다 */
      .then(function () { if (!live()) return; stageRows(my, 1); return salonSettle(my); })   /* 행 1 (집 목소리: '파란색 어때? 하고 물어봤어.') · 걷던 걸음은 도착을 기다리고 (4 s) 쓰다듬기는 끝낸다 */
      .then(function () { if (live() && typeof scene.salonClearView === 'function') scene.salonClearView(); return wait(1000); })   /* 숨 고르기 (모션 줄이기에도 리듬은 남긴다) · 11-12 (검증): 내 캐릭터가 문어 · 거울 앞을 가리고 있으면 지금 비켜선다 (두 답이 같다 — 대답이 보이기 전에) */
      .then(function () { if (!live()) return; scene.setOctState('ponder'); return wait(red ? 150 : 500); })   /* 움츠림 (얼굴 idle · 먹물 · 소리 없음 — 두 답이 같다 · 모션 줄이기면 움직임 없이 0.15 s 멈춤만) */
      .then(function () {
        if (!live()) return;
        octState('idle'); answer();
        if (dye) return toMirror().then(runDye);
        if (st.action === 'keep') return wait(st.bubble ? 1600 : 600).then(function () { if (live() && typeof scene.salonKeep === 'function') return scene.salonKeep(); });   /* 병이 제자리로 · 몸을 앞으로 (얼굴은 고른 이의 것 그대로) */
        return wait(st.bubble ? 1600 : 600).then(function () { if (live() && typeof scene.salonOffer === 'function') scene.salonOffer(null); return wait(300); });   /* 대답 없음 · 메뉴 밖: 가만히 · 병만 제자리로 */
      })
      .then(function () { if (live()) stageEnd(my, false); }, function (e) { console.warn('[app] salon stage', e); stageEnd(my, true); });
    return done;
  }
  /* 연출 앞: 쓰다듬는 중이면 끝내고, 걷는 중이면 도착을 기다린다 (최대 4 s, 넘으면 그 자리로 건너뜀) */
  function salonSettle(my) {
    if (oct.state === 'pet') { clearTimeout(petTimer); octState('idle'); }
    if (oct.state !== 'walk') return Promise.resolve();
    return Promise.race([oct.walkP || Promise.resolve(), stageWait(my, 4000 * speed())]).then(function () {
      if (salonRun !== my || !scene) return;
      if (oct.state === 'walk') { if (typeof scene.finishWalk === 'function') scene.finishWalk(); octState('idle'); }
    });
  }
  /* 연출 끝 (fast = 감기: 주 버튼 · 숨은 탭 · 시간 넘김 · 불러오기 · 초기화 · 2D 폴백 — 남은 연출을 한 번에: 새 색 · 대야 치움 · 병 제자리 · 남은 행) */
  function stageEnd(my, fast) {
    if (!my || salonRun !== my) return false;
    salonRun = null; clearInterval(my.iv);
    my.wakers.splice(0).forEach(function (f) { f(); });   /* 기다리던 박자는 풀리고 (뒤 박자는 salonRun 이 바뀐 걸 보고 멈춘다) */
    if (fast && scene) {
      try {
        if (typeof scene.salonFinish === 'function') scene.salonFinish();
        if (oct.state === 'walk' && typeof scene.finishWalk === 'function') scene.finishWalk();
        if (oct.state !== 'sleep' && oct.state !== 'away') octState('idle');
      } catch (e) { console.warn('[app] salonFinish', e); }
    }
    /* 먼저 푼다, 그다음 행 (검증 11-10 E4): 예전엔 행 3 을 붙이다 (행 DOM · UIART.syncLog · 알림) 오류가 나면 salonActive 가 켜진 채 남았다 — salonRun 은 이미 null 이라 다시 감을 길도 없어
       새로고침 전까지 거울 · 문 단추가 숨고 톡 · 쓰다듬기 · 돌아다니기 · 낮잠이 멈췄다. 이제 어느 칸이 실패해도 나머지는 그대로 하고 약속(done)도 푼다 */
    try { setSalonActive(false); }   /* 미룬 몸색 맞춤 (감았으면 여기서 새 색 · 연출이 이미 칠했으면 할 일 없음) · 거울 단추 · 놀이방 문 */
    catch (e) { salonActive = false; console.warn('[app] salon release', e); }
    try { stageRows(my, 3); }   /* 남은 행 (두 번 그리지 않는다) */
    catch (e) { console.warn('[app] salon rows', e); }
    try {
      relaxFace(fast ? 0 : 3000);
      if (my.focus && (!document.activeElement || document.activeElement === document.body)) { var b = $('btn-salon'); if (b && !b.hidden) focusRoomBtn(b, my.ring); }   /* 키보드로 물었으면 거울 단추로 돌아온다 (연출 중엔 숨어 있었다) */
      updateSceneDesc();
    } catch (e) { console.warn('[app] salon end', e); }
    /* 다음 돌아다니기는 대답 뒤 20–40 s (검증 11-10 W10 = P8 의 때 쪽): 연출 중엔 예약이 미뤄지기만 해서 끝나자마자 (1 s 안에) 걸어 나갈 수 있었다 — '안 바꿀래.' 바로 뒤면 돌아서 가 버리는 것처럼 읽힌다.
       두 답 모두 · 예약이 있던 때만 다시 건다 (산책 중 · 고정 앵글엔 예약이 없다) */
    if (oct.wanderTimer) scheduleWander();
    my.resolve({ id: my.ask.id, fast: !!fast });
    return true;
  }
  function salonFinish() { return stageEnd(salonRun, true); }
  /* 개발용 '다음 미용실 대답' (데모 패널 · ?dev=1 을 직접 붙인 탭만 — docs/SALON.md §1.2): 규칙대로 · 바꾸기 · 그대로 · 대답 없음. 고른 답은 by 'human' (사람이 정함) 으로 적힌다 */
  var SALON_NEXT = [['', '규칙대로'], ['dye', '바꾸기'], ['keep', '그대로'], ['none', '대답 없음']];
  function paintSalonNext() { document.querySelectorAll('[data-salon-next]').forEach(function (b) { chipOn(b, (b.dataset.salonNext || null) === salonNext); }); }
  function bindSalonDev() {
    var demoEl = $('demo'), at = $('dev-look');
    if (!DEV_EXPLICIT || !demoEl || !SAL || $('dv-salon')) return;
    var row = h('div', { class: 'filters', role: 'group', 'aria-label': '다음 미용실 대답' });
    SALON_NEXT.forEach(function (p) {
      var b = h('button', { type: 'button', class: 'fchip', 'data-salon-next': p[0], 'aria-pressed': 'false', text: p[1] });
      b.addEventListener('click', function () { salonNext = p[0] || null; paintSalonNext(); });
      row.appendChild(b);
    });
    var box = h('div', { class: 'dv dv-salon', id: 'dv-salon' }, [h('span', { text: '다음 미용실 대답' }), row]);
    if (at && at.parentNode === demoEl) demoEl.insertBefore(box, at); else demoEl.appendChild(box);
    paintSalonNext();
  }
  /* 장면에 보이는 모습(문어 색 · 내 모습)을 S.settings 에 맞춘다 — 불러오기 · 전체 초기화 · 다른 탭의 저장을 받은 뒤 (renderAll 은 장면을 안 건드려 설정 칩은 새 값인데 3D 캐릭터·미리보기는 옛 모습이던 결함, 리뷰 11-08).
     내 모습은 장면의 look 과 다를 때만 다시 만든다(지오메트리 7개 교체) · 문어 색은 setColor 가 싸서 그냥 다시 */
  function syncSceneLook() {
    if (!scene) return;
    try {
      if (typeof applyLook === 'function') applyLook({ still: true });   /* 몸 색은 미용실 쪽 applyLook 이 (S.octopus.color) */
      var have = (typeof scene.player === 'function' && scene.player()) ? JSON.stringify(scene.player().look) : null;
      if (typeof scene.setPlayer === 'function' && have !== JSON.stringify(S.settings.player)) scene.setPlayer(S.settings.player);
    } catch (e) { console.warn('[app] syncSceneLook', e); }
  }
  /* 내 모습 한 칸 바꾸기 (설정 시트 칩): 저장 → 장면이 setPlayer 를 알면 메시 다시 → true. 장면 API 는 이 빌드에 없을 수 있어 typeof 로 지킨다 (2D 는 아무것도 안 그리지만 저장은 된다) */
  function setPlayerPart(cat, id) {
    var P = playerParts();
    if (!P[cat] || !P[cat].some(function (x) { return x.id === id; })) return false;
    var next = Object.assign({}, S.settings.player); next[cat] = id;
    S.settings.player = normalizePlayer(next);
    save();
    if (scene && typeof scene.setPlayer === 'function') { try { scene.setPlayer(S.settings.player); } catch (e) { console.warn('[app] setPlayer', e); } }
    return true;
  }

  /* ───────────────────────── octopus (§7.1 상태 기계 — 그림은 scene 이 그린다) ───────────────────────── */
  var ANCHORS = { door: 1, window: 1, crate: 1, board: 1, blanket: 1, center: 1, salon: 1 };   /* salon = 미용실 거울 옆 (장면 ANCHORS.salon — 거울이 없으면 'center') */
  var oct = { state: 'idle', anchor: 'center', wanderTimer: null, busy: false, walkP: null };
  function anchorName(name) { if (name === 'blanket' && S.room.lantern < 4) return 'center'; if (name === 'salon' && !mirrorUp()) return 'center'; return ANCHORS[name] ? name : 'center'; }
  /* 돌아다니는 곳: 거울이 있으면 거울 옆도 (가끔 지나가면 거울 속 문어가 보인다 — 거울을 찾게 하는 꾸밈일 뿐 결정이 아니다, 기록 없음) */
  function allowedIdleAnchors() {
    var a = ['window', 'center'];
    if (S.room.lantern >= 2) a.push('crate');
    if (S.room.lantern >= 4) a.push('blanket');
    if (S.room.posterOrder.length) a.push('board');
    /* 11-11: 거울은 위층으로 이사했다 — 다락의 빈 벽 앞에 서성이지 않는다 (예전: if (mirrorUp()) a.push('salon')) */
    return a;
  }
  function octPlace(anchor) { oct.anchor = anchorName(anchor); scene.jumpTo(oct.anchor); updateSceneDesc(); }
  function octState(st, extra, quiet) {
    scene.setOctState(st, extra);
    octMirror(st, quiet);
  }
  /* 화면 낭독기용 장면 설명 한 줄 (#scene-desc, docs/research/a11y-and-mobile-perf.md 4): 3D 캔버스는 aria-hidden 이라 장면 칸이 비어 읽힌다.
     장소 · 등불 · 날씨 · 시각대 · 문어 자리와 상태를 지금 값 그대로. 라이브 영역 아님 (사건은 #log 가 읽어 준다). 글자가 바뀔 때만 쓴다 */
  var WX_DESC = { rain: '비 오는', drizzle: '가랑비 오는', clear: '맑은', snow: '눈 오는' };
  var SPOT_DESC = { window: '창가', center: '방 가운데', crate: '나무 상자 옆', blanket: '담요 위', board: '포스터 판 앞', door: '문 앞', salon: (SAL && SAL.TEXT.spot) || '거울 옆' };
  var DOING_DESC = { idle: '쉬고 있어', stay: '쉬고 있어', sleep: '자고 있어', pet: '쓰다듬받고 있어', happy: '통통 뛰고 있어', anticipate: '나갈 채비 중이야', hang: '포스터를 붙이고 있어', carry: '포스터를 들고 있어' };
  function partOfDay(hr) { return hr < 5 ? '밤' : hr < 9 ? '아침' : hr < 17 ? '낮' : hr < 19 ? '저녁' : '밤'; }
  function sceneDescText() {
    if (sceneView() === 'play')   /* 놀이방 (8물결): 문어는 다락(또는 산책) — 놀이방엔 오지 않는다 */
      return '놀이방, ' + partOfDay(hourNow()) + '. 다락방 달리기 오락기랑 작은 부엌이 있어. ' + (oct.state === 'away' || sceneCeremony() === 'depart' ? '문어는 산책 나갔어.' : '문어는 다락방에 있어.');
    var lv = S.room.lantern, outside = sceneMode === '3d' && !!scene && typeof scene.place === 'function' && scene.place() === 'exterior';   /* 2D 무대는 바깥을 그리지 않는다 (장소 값만 기억) → 늘 다락 */
    var loft = !outside && sceneView() === 'loft', up = loft && octWithMe();   /* 11-12 (검증): 위층에서도 다락 · 다락 자리를 읽었다 — 위층이면 위층, 문어가 따라 올라와 있으면 '위층', 아래층에 있으면 '아래층' */
    var where = outside ? '집 바깥' : loft ? '위층 다락 옷방' : lv ? '등불 ' + lv + '칸 켜진 다락' : '불씨 하나 켜진 다락';   /* 0칸이어도 등불 속 불씨는 켜져 있다 */
    var wx = WX_DESC[weatherFor(lv)], st = oct.state, cname = sceneCeremony();
    /* 출발·귀가 의식은 장면이 스스로 걷고 장소를 바꾼다 (APP 의 oct.state 는 의식이 끝나야 바뀐다) → 의식 이름대로 */
    var who = cname === 'depart' ? '문어는 나가는 중이야.' : cname === 'return' ? '문어는 돌아오는 중이야.'
      : st === 'away' ? '문어는 산책 나갔어.' : st === 'walk' ? (loft && !up ? '문어는 아래층에서 걸어가는 중이야.' : '문어는 걸어가는 중이야.')   /* 11-12 (검증): 위층에서 들으면 아래층에서 걷는 줄 몰랐다 */
      : '문어는 ' + (up ? (oct.anchor === 'salon' ? '위층 ' + SPOT_DESC.salon : '위층') : (loft ? '아래층 ' : '') + (SPOT_DESC[oct.anchor] || '방 가운데')) + '에서 ' + (DOING_DESC[st] || '쉬고 있어') + '.';
    /* 몸 색 한 마디 (docs/SALON.md §3.8 — 색이 문어의 일이 됐으니 못 보는 사람도 안다): 집에 있을 때만 · 지금 장면에 보이는 색 (미용실 연출 중엔 첨벙 전까지 옛 색) */
    var home = !cname && st !== 'away', hex = home && SAL ? (scene && typeof scene.color === 'function' ? scene.color() : S.octopus.color) : null, cn = hex ? SAL.colorName(hex) : null;
    return where + ', ' + (wx ? wx + ' ' : '') + partOfDay(hourNow()) + '. ' + who + (cn ? ' ' + SAL.TEXT.desc.replace('{color}', cn) : '');
  }
  function updateSceneDesc() { var el = $('scene-desc'); if (!el) return; var t = sceneDescText(); if (el.textContent !== t) el.textContent = t; }
  /* APP 쪽 상태만 (라벨 · UI 아트). 의식 중엔 장면이 스스로 setOctState 하므로 이것만 부른다. quiet = UIART 훅 생략 (먹물을 이미 문 앞에서 뿌렸을 때) */
  function octMirror(st, quiet) {
    oct.state = st;
    updateSceneDesc();
    var lbl = $('oct-label');
    if (lbl) lbl.textContent = st === 'sleep' ? SLEEP_LABEL : st === 'away' ? '' : st === 'anticipate' ? '출발 중…' : '';   /* 이름표는 글자만 (예전 💤 는 뺐다) */
    if (st === 'sleep') scheduleDreamLabel();
    if (!quiet && window.UIART) UIART.onState(st);   /* zzz · 출발 먹물 (js/ui-art.js) */
    /* 소리: 움츠림·나감·잠 (js/audio.js). 잠들 때는 방금 끝낸 차례의 반응을 같이 (D-1: 자장가는 밤이거나 '졸림' 일 때만 — 고르는 건 audio.js).
       반응이 없는 차례 · 산책 뒤가 아닌 잠(부팅 · 2D 전환)은 null */
    if (window.AUDIO) { var ad = { state: st, skip: skipFlag }; if (st === 'sleep') { ad.reaction = sleepReaction; sleepReaction = null; } AUDIO.on('state', ad); }
    syncSalonSpot();   /* 문어가 나가 있으면 (2D 포함) 거울 단추를 숨긴다 */
  }
  var sleepReaction = null;   /* finalPose 가 잠재우기 직전에 넣는다 → 다음 'sleep' 상태 훅 한 번만 */
  var SLEEP_LABEL = '자는 중';   /* 11-13 (금지선 1): 예전엔 '꿈꾸는 중' 과 번갈았다 — 문어 속 경험을 지어내는 말이라 뺐다 */

  /* ── 출발·귀가 의식 (DESIGN §15.3 · SCENE.md "바깥·계절·전환"): 다락 문 → 전환 → 현관 → 계단 → 길 → 화면 밖 / 그 거꾸로.
     장면이 dt 로 돌리는 작업 큐라 끝날 때까지 moveTo/setOctState 를 부르지 않는다. 건너뛰기 = 남은 의식을 한 번에 감아 끝낸다(jumpCeremony).
     탭이 숨어 rAF 가 멈추거나 30 s 를 넘기면 역시 감는다 → 바깥에 멈춘 채 남지 않는다. 2D 폴백은 장소 값만 기억하고 다음 틱에 끝난다 ── */
  var cer = { kind: '', seq: 0, ink: false, raf: 0, stop: null };
  function hasCeremony() { return !!scene && typeof scene.departCeremony === 'function' && typeof scene.returnCeremony === 'function'; }
  function sceneCeremony() { return (scene && typeof scene.ceremony === 'function') ? scene.ceremony() : ''; }
  function ensureAttic() {   /* 의식이 없는데 바깥이면 즉시 다락으로 (집에 있는 동안 바깥이 보이는 일은 없다) */
    if (!scene || typeof scene.setPlace !== 'function' || sceneCeremony()) return;
    if (typeof scene.place === 'function' && scene.place() !== 'attic') { scene.setPlace('attic', { instant: true }); updateSceneDesc(); }
  }
  function jumpCeremony() {   /* → true 면 의식이 끝났다 (프레임이 못 도는 동안엔 false — 컨텍스트 잃음 등) */
    if (!sceneCeremony()) return true;
    if (typeof scene.debugStep !== 'function') return false;
    /* 모션 감소 동안 새로 시작하는 마디는 0 s → 지금 마디만 0.1 s 스텝으로 마저 감으면 남은 큐가 한 프레임에 끝난다 (onDone 은 그 안에서 불린다) */
    scene.setReducedMotion(true);
    for (var n = 0; sceneCeremony() && n < 120; n++) scene.debugStep(0.1);
    scene.setReducedMotion(reduced());
    if (typeof scene.resume === 'function') scene.resume();
    return !sceneCeremony();
  }
  function letGoCeremony() { if (cer.stop) cer.stop(); }   /* 지금 기다리는 의식을 감지 않고 놓는다 (sceneFor 안에선 cer 가 wrap_up 의 지역 변수라 이걸 부른다) */
  function abandonCeremony() {   /* 감아도 안 끝나면 장면 의식을 버리고 다락으로 — 흐름은 멈추지 않는다 */
    if (scene && typeof scene.cancelCeremony === 'function') scene.cancelCeremony();
    else if (scene && typeof scene.setPlace === 'function') scene.setPlace('attic', { instant: true });
  }
  /* 먹물은 문어가 실제로 현관문을 나설 때 (바깥으로 바뀐 뒤 문어가 다시 보이는 첫 프레임) — 문어 발밑 */
  function watchDoorExit(my) {
    cancelAnimationFrame(cer.raf);
    if (typeof scene.motion !== 'function') return;
    (function tick() {
      if (cer.seq !== my || cer.ink || typeof scene.motion !== 'function') return;   /* 도중에 2D 폴백으로 바뀌면 (sceneLost) 그만 */
      var m = scene.motion();
      if (m.ceremony === 'depart' && m.place === 'exterior' && m.octVisible && !m.trans) { cer.ink = true; if (window.UIART) UIART.fx('ink'); return; }
      if (m.ceremony === 'depart') cer.raf = requestAnimationFrame(tick);
    })();
  }
  /* kind: depart · return · peek(arg = peekOutside 인자) · leave → Promise<{ ink, cancelled }>. cancelled = 다른 의식이 덮어 조용히 취소됨 (데모 조작).
     기웃·퇴장은 앞 의식 뒤에 줄을 서므로(장면 이름이 아직 앞 것) 자기 이름을 한 번 본 뒤에 이름이 바뀌어야 '덮였다' 로 본다. 모션 감소는 장면이 처리(한 프레임 / 기웃 0.4 s) */
  var CER_FN = { depart: 'departCeremony', 'return': 'returnCeremony', peek: 'peekOutside', leave: 'leaveOutside' };
  function runCeremony(kind, arg) {
    if (!hasCeremony() || typeof scene[CER_FN[kind]] !== 'function') return Promise.resolve({ ink: false, cancelled: false });
    var my = ++cer.seq, t0 = Date.now();
    /* quick = 데려온 귀가 (큰 버튼, 11-08): 길·계단은 건너뛰고 다락 문으로 짧게 들어온다 (장면이 0.3 s 전환 + 2배 걸음). 건너뛰기여도 감지 않는다 */
    var quick = kind === 'return' && !!(arg && arg.quick);
    cer.kind = kind; cer.ink = false;
    if (window.AUDIO) AUDIO.on('ceremony', { kind: kind, skip: skipFlag });   /* 소리: 출발·귀가 징글 (js/audio.js) */
    var p = kind === 'peek' ? scene.peekOutside(arg) : quick ? scene.returnCeremony(null, { quick: true }) : scene[CER_FN[kind]]();
    if (kind === 'depart' && sceneMode === '3d') watchDoorExit(my);
    if (skipFlag && !quick) jumpCeremony();
    return new Promise(function (resolve) {
      var done = false, iv = null, seen = sceneCeremony() === kind, blank = 0, stuck = 0;
      function fin(cancelled) {
        if (done) return; done = true; clearInterval(iv);
        if (cer.stop === stop) cer.stop = null;
        var ink = cer.seq === my && cer.ink;
        if (cer.seq === my) { cancelAnimationFrame(cer.raf); cer.kind = ''; }
        updateSceneDesc();
        resolve({ ink: ink, cancelled: !!cancelled });
      }
      function stop() { fin(true); }   /* 걸어서 오던 귀가를 짧은 귀가로 바꿀 때 (sceneFor 'return'): 이 의식은 감지 않고 놓는다 — 장면은 새 의식이 덮는다 */
      cer.stop = stop;
      Promise.resolve(p).then(function () { fin(false); }, function () { fin(false); });
      updateSceneDesc();
      iv = setInterval(function () {
        updateSceneDesc();   /* 의식 중 장소(다락 ↔ 집 바깥)는 장면이 바꾼다 → 250 ms 마다 따라간다 (글자가 바뀔 때만 쓴다) */
        var name = sceneCeremony();
        if (name === kind) { seen = true; blank = 0; }
        else if (name && seen) { fin(true); return; }        /* 끝났으면 p 가 먼저 풀렸다 → 여기 오면 다른 의식이 덮은 것 */
        else if (!name && ++blank > 2) { fin(false); return; }   /* 장면이 조용히 끝냈는데 Promise 를 못 받음 — 흐름은 멈추지 않는다 */
        /* 건너뛰기면 감는다 — 짧은 귀가(quick) · 데려온 귀가가 이미 다락에 들어와 마저 걷는 중(homing)은 빼고 (끝까지 보인다) */
        if (document.hidden || (skipFlag && !quick && !(revealing && revealing.homing)) || Date.now() - t0 > 30000 * speed()) {
          if (jumpCeremony()) stuck = 0;
          else if (++stuck > 3) { abandonCeremony(); fin(false); }   /* 1 s 동안 감아도 그대로 */
        }
      }, 250);
    });
  }
  /* ── 바깥 기웃 (뽈뽈 중 "찾았다!"는 다락이 아니라 바깥에서, SCENE.md "바깥 기웃"): 출발 의식 뒤 기웃마다 peekOutside → 자세를 잡는 순간
     말풍선 + 그 기웃의 로그 행을 같이. 말풍선은 상태대로 정직하게 (읽음/처음 = 외침 · 책장 = 생각 · 모의 = 속삭임 · 실패 = 말). #oct 오버레이는
     나가 있는 동안 .st-away 로 숨으므로 말풍선이 떠 있는 동안만 인라인으로 들어 올린다 (3D 는 #oct-inner 가 없어 말풍선만 보인다) ── */
  var liftTimer = null;
  function liftOverlay(ms) { var el = $('oct'); if (!el) return; el.style.visibility = 'visible'; el.style.opacity = '1'; el.style.transition = 'none'; clearTimeout(liftTimer); liftTimer = setTimeout(dropOverlay, ms + 200); }
  function dropOverlay() { clearTimeout(liftTimer); var el = $('oct'); if (el) { el.style.visibility = ''; el.style.opacity = ''; el.style.transition = ''; } }
  function peekStatus(ev) { return STATUS_LABEL[ev.status] ? ev.status : 'failed'; }   /* 로그 행과 같은 규칙 (모르는 상태 = 못 읽음) */
  function peekBubble(ev, firstN, trip) {
    var ic = stopIcon(ev), st = peekStatus(ev), id = ev.target && ev.target.id;   /* 말 뒤에 그곳의 코너 그림 하나 (예전 이모지 자리 — 말에는 글자만) */
    /* 모델·사람이 고른 산책: '찾았다!' · '처음 와 봤어!' 같은 외침(기쁨)은 코드가 지은 마음이라 쓰지 않는다 — 그 자리에서 남긴 한마디(aside)가 있으면 그것,
       없으면 상태 사실만 담담하게 (로그 행의 상태 글자와 같은 말, 외침·속삭임 모양 없이) */
    if (givenTrip(trip)) {
      if (ev.aside) return { text: clip(ev.aside, REACT_RAW_SHOW), kind: 'say', raw: rawBy(trip) };   /* 그들이 쓴 말 그대로 (40자) */
      var bookT = st === 'builtin' && ev.book && ev.book.title ? (ev.book.card ? '카드 「' : '책 「') + clip(String(ev.book.title), 14) + '」' : null;   /* 뽈뽈 도서관의 책 · 서가 카드를 읽은 곳 */
      var fact = id === 'letter_room' ? '아직 비어 있었어' : st === 'failed' ? '닫혀 있었어' : st === 'simulated' ? '문 앞까지만' : st === 'none' ? '…' : (ev.first ? '처음 온 곳 · ' : '') + (bookT || STATUS_LABEL[st] || '읽음');
      return { text: fact, kind: 'say', icon: st === 'read' || st === 'builtin' ? ic : null };
    }
    if (id === 'letter_room') return { text: '아직 비어 있었어', kind: 'say' };
    if (st === 'failed') return { text: '닫혀 있었어', kind: 'say' };
    if (st === 'simulated') return { text: '문 앞까지만', kind: 'whisper' };
    if (st === 'none') return { text: '…', kind: 'whisper' };
    if (ev.first && (st !== 'read' || firstN % 2 === 0)) return { text: '처음 와 봤어!', kind: 'shout', icon: ic };   /* 처음 온 곳: 읽음이면 '찾았다!' 와 번갈아 */
    if (st === 'read') return { text: '찾았다!', kind: 'shout', icon: ic };
    return { text: '음…', kind: 'think', icon: ic };
  }
  function peeksOutside() { return sceneMode === '3d' && !skipFlag && oct.state === 'away' && typeof scene.peekOutside === 'function' && typeof scene.place === 'function' && scene.place() === 'exterior'; }
  function peekOut(ev, show) {
    var tg = ev.target || {}, nd = tg.id ? nodeOf(tg.id) : null;
    var st = peekStatus(ev);
    var arg = { corner: (nd && nd.corner) || 'wild', roomId: tg.id || null, status: st, first: !!ev.first && (st === 'read' || st === 'builtin') };   /* 처음이어도 실패·빈 방·모의면 기뻐하는 자세 없음 */
    var b = peekBubble(ev, revealing.firstN, revealing.trip); if (ev.first) revealing.firstN++;
    revealing.outside = true;
    var shown = false, raf = 0, sawOff = false;
    function hold() {
      if (shown) return; shown = true; cancelAnimationFrame(raf);
      show();
      if (window.AUDIO) AUDIO.on('peek', { status: st, corner: arg.corner, roomId: arg.roomId, url: tg.kind === 'url', first: arg.first, skip: skipFlag });   /* 소리: 기웃 결과(상태 그대로) + 장소 테마 */
      if (skipFlag || inPlay()) return;   /* 건너뛰면 · 놀이방에 있으면 말풍선 없이 행만 (문어는 놀이방에 오지 않는다 — 8물결) */
      var ms = reduced() ? 900 : 1700;
      liftOverlay(ms); bubble(b.text, ms, b.kind, { raw: b.raw, icon: b.icon });
    }
    if (typeof scene.peek === 'function') (function tick() {   /* 자세를 잡는 첫 프레임 (앞 기웃의 hold 가 남아 있을 수 있어 꺼진 걸 한 번 본 뒤) */
      if (shown) return;
      var pk = scene.peek();
      if (!pk.hold) sawOff = true; else if (sawOff) { hold(); return; }
      raf = requestAnimationFrame(tick);
    })();
    return runCeremony('peek', arg).then(hold);   /* 끝까지 못 봤으면(탭 숨김·건너뛰기) 지금 */
  }

  /* 나가기: 의식 → 'away'. 건너뛰기면 의식 없이 바로 'away' (귀가에서 다락으로 즉시 돌아온다) */
  function departOut() {
    if (skipFlag || !hasCeremony()) { octState('away'); return Promise.resolve(); }
    /* 3D: 장면이 의식 첫 마디에서 스스로 walk → 다락 문까지 걷는다. 2D 폴백: 의식은 값만 바꾸므로 문까지는 여기서 걷는다 */
    var toDoor = sceneMode === '3d' ? Promise.resolve(octMirror('walk', false)) : walkTo('door');
    return toDoor.then(function () { return runCeremony('depart'); }).then(function (r) {
      if (r.cancelled) return;
      if (sceneMode === '3d') octMirror('away', true);   /* 장면이 이미 away (먹물은 문 앞에서 뿌렸다) */
      else octState('away');
    });
  }
  /* 낮잠 (DESIGN §5.9): 산책·집에 있던 날 뒤 담요에서 잠들고, 마지막으로 끝낸 차례(빈 차례 제외)에서 20분이 지나거나 그 뒤 날짜가 바뀌면 스스로 깬다.
     문어 자신의 상태일 뿐 — 타이머·연속 기록·보상 없음. 다음 초대도 깨운다(wakeUp) */
  var NAP_MS = 20 * 60 * 1000;
  /* 쉬게 하는 차례 = 마지막으로 끝낸 빈 차례 아닌 차례 (옛 기록 제외 · 끝난 시각 순, 같으면 뒤의 것) */
  function lastRestTrip() {
    var l = null;
    S.trips.forEach(function (t) { if (t && t.status === 'done' && t.kind !== 'empty' && t.by !== 'legacy' && (!l || (t.endedAt || 0) >= (l.endedAt || 0))) l = t; });
    return l;
  }
  function napOver() {
    var l = lastRestTrip();
    if (!l || !l.endedAt) return true;
    var endDay = hookToday() ? l.date : dateKey(new Date(l.endedAt));   /* 끝난 날 (날짜 훅이 있으면 훅이 정한 그 여행의 날) */
    return endDay !== todayKey() || Date.now() - l.endedAt > NAP_MS;
  }
  /* ── 깨어 있는 틈 (주인 11-08): 돌아오면 (데려왔든 아니든) 담요에서 잠깐 깨어 있다가 눕는다 — 그동안 톡 하면 그 차례 한 줄.
     S.octopus.state 'sleep' = 쉬는 중 (깨어 있는 틈 + 낮잠, 차례를 반영할 때 저장 — 예전 그대로). 틈은 이 탭에서만 센다 (rest — 게임 기록엔 없음, 새로고침만 sessionStorage 로 이어 받는다):
     보이는 다락에서만 줄어들고 (탭을 떠남 · 놀이방 · 창이 열림 · 입장 연출 · 장면을 반 넘게 아래로 내려 둠이면 멈춤) 다시 보이면 적어도 AWAKE_SEEN 은 남긴다.
     눕는 순간 상태 훅 'sleep' 한 번 (그 차례의 반응과 함께 — 자장가 규칙 D-1 그대로). 낮잠 끝(차례 끝 + 20분 · 새 날)은 예전 그대로 ── */
  var rest = null, restTimer = 0, restSeen = null, scrollRest = 0;
  function awakeMs() { var v = window.__ppolAwakeMs; return typeof v === 'number' && v >= 0 && isFinite(v) ? v : AWAKE_MS; }   /* 테스트 훅 (플레이어는 쓰지 않는다) */
  /* 이 차례 뒤 깨어 있는 틈 (ms): 빈 차례 0 · 졸림으로 마무리했으면 (데모 규칙이든 모델 · 사람이 골랐든) 짧게 · 테스트 훅이 더 짧으면 그것 */
  function awakeFor(t) { if (!t || t.kind === 'empty') return 0; var ms = awakeMs(); return reactionOf(t).r === '졸림' ? Math.min(ms, AWAKE_SLEEPY) : ms; }
  function seenMin(t) { return Math.min(AWAKE_SEEN, awakeFor(t)); }
  function wantsAwake(t) { return awakeFor(t) > 0; }
  /* 새로고침 · 다른 탭: 차례가 끝난 지 틈보다 덜 지났으면 깨어 있다 */
  function awakeByClock(t) { return wantsAwake(t) && !napOver() && Date.now() - (t.endedAt || 0) < awakeFor(t); }
  /* 장면이 화면에 반 넘게 보이는가 (로그를 읽으려고 아래로 내려 두면 틈을 세지 않는다). 화면보다 큰 장면이면 화면 높이의 반 */
  function sceneSeen() {
    var sc = $('scene'); if (!sc) return true;
    var r = sc.getBoundingClientRect(), vh = window.innerHeight || document.documentElement.clientHeight || 0;
    if (!r.height || !vh) return true;
    return Math.min(r.bottom, vh) - Math.max(r.top, 0) >= Math.min(r.height, vh) / 2;
  }
  function watching() { return !document.hidden && !inPlay() && !introUp() && !document.querySelector('dialog[open]') && sceneSeen(); }
  /* 이 탭의 새로고침에만 남은 틈을 넘긴다 (sessionStorage — 게임 기록 아님, 다른 탭 · 다른 기기에 안 간다). 읽으면 지운다 */
  function restKeep() {
    if (!rest || rest.lying) return;
    restTick(); if (!rest) return;
    try { sessionStorage.setItem(REST_KEY, JSON.stringify({ id: rest.id, left: Math.max(0, Math.round(rest.left)) })); } catch (e) { /* noop */ }
  }
  function restKept(t) {
    var o = null; try { o = JSON.parse(sessionStorage.getItem(REST_KEY) || 'null'); sessionStorage.removeItem(REST_KEY); } catch (e) { o = null; }
    return o && t && o.id === t.id && typeof o.left === 'number' && o.left > 0 ? Math.min(o.left, awakeFor(t)) : 0;
  }
  function restPhase() {
    var t = lastRestTrip();
    if (S.octopus.state !== 'sleep' || !t || napOver()) return 'up';
    return (rest && rest.id === t.id) || (!rest && oct.state !== 'sleep' && awakeByClock(t)) ? 'awake' : 'nap';
  }
  function clearRest() { clearTimeout(restTimer); restTimer = 0; if (rest) { try { sessionStorage.removeItem(REST_KEY); } catch (e) { /* noop */ } } rest = null; }
  function armRest(t, left) {   /* left 0 = 틈 없이 바로 눕는다 (테스트 훅 0 · 틈이 끝난 뒤 다른 탭) — 그때는 말풍선을 기다리지 않는다 (예전처럼) */
    clearRest(); restSeen = t.id;
    rest = { id: t.id, left: Math.max(0, left), last: Date.now(), away: !watching(), wait: 0, now: !(left > 0), min: seenMin(t) };
    restTick();
  }
  function restTick() {
    clearTimeout(restTimer); restTimer = 0;
    if (!rest) return;
    var now = Date.now(), w = watching();
    if (w) { if (rest.away) { if (!rest.now) rest.left = Math.max(rest.left, rest.min); rest.away = false; } else rest.left -= now - rest.last; }
    else rest.away = true;
    rest.last = now;
    if (rest.left <= 0) { lieDown(); return; }
    restTimer = setTimeout(restTick, w ? Math.max(30, Math.min(1000, rest.left + 20)) : 1000);
  }
  /* 눕기: 다른 차례 · 다녀오는 중이면 버림. 낮잠 시간이 이미 지났으면(오래 떠나 있었음) 깬 채로. 쓰다듬는 중 · 걷는 중 · 말풍선이 떠 있으면 조금 뒤 (최대 8 s).
     담요 자리가 아니면 걸어가서 (6 s 안에 못 가면 그 자리에 놓고) 잠든다 */
  function lieDown() {
    if (!rest) return;
    var t = lastRestTrip(), my = rest.id;
    var other = S.trips.some(function (x) { return x.status === 'running' && x.id !== my; });   /* 새 차례가 시작됐다 (초대는 wakeUp 이 먼저 걷는다) */
    if (!t || t.id !== my || other || oct.state === 'away') { clearRest(); return; }
    if (S.octopus.state !== 'sleep' || napOver()) { clearRest(); if (S.octopus.state === 'sleep') { S.octopus.state = 'idle'; save(); } return; }
    var b = $('oct-bubble');
    if (salonActive) { clearTimeout(restTimer); restTimer = setTimeout(lieDown, 700); return; }   /* 미용실 연출 중엔 눕지 않는다 (끝나면 곧 — 8 s 한도와 따로) */
    if (!rest.now && (oct.state === 'pet' || (b && !b.hidden && b.textContent)) && rest.wait < 8000 && watching()) { rest.wait += 700; clearTimeout(restTimer); restTimer = setTimeout(lieDown, 700); return; }
    if (rest.lying) return;
    rest.lying = true;
    if (!watching()) { sleepNow(t, true); return; }   /* 보는 사람이 없다: 걷지 않고 담요에서 */
    var guard = setTimeout(function () { if (rest && rest.id === my && rest.lying) sleepNow(t, true); }, 6000);
    walkTo('blanket').then(function () { clearTimeout(guard); if (rest && rest.id === my && rest.lying) sleepNow(t); });   /* lying 이 풀렸으면 (미용실 연출이 끼어듦) 눕지 않는다 */
  }
  function sleepNow(t, place) {
    clearRest(); restSeen = t ? t.id : restSeen;
    if (place || octWithMe()) { if (scene && typeof scene.finishWalk === 'function') scene.finishWalk(); restDown(); octPlace('blanket'); }   /* 11-13: 자는 문어는 늘 다락 담요 (위층에서 잠들지 않는다). octWithMe: 틈이 끝나 담요로 걷는 몇 초 사이 날이 바뀌면 (낮잠도 끝 — 쉬는 차례가 아니다) 내가 오를 때 따라 오고, 그 걸음이 위층에서 끝나 place 없이 여기 온다 (재검 RC3-1) */
    if (oct.state === 'sleep') return;
    var rx = t && t.events ? reactionOf(t) : null;
    sleepReaction = rx ? (rx.r || rx.raw || null) : null;   /* 소리(D-1): 이 차례의 반응을 잠드는 훅에 (네 가지면 그 말, 아니면 받은 말 그대로, 없으면 null) */
    octState('sleep'); sleepReaction = null;
    if (S.octopus.state !== 'sleep') { S.octopus.state = 'sleep'; save(); }
    updateSceneDesc();
  }
  /* 11-12 주인 (검증 W3 (b)): 쉬는 문어 (차례 뒤 깨어 있는 틈 · 낮잠) 는 위층에 따라 오르지 않는다 — 잠과 같이.
     11-13 주인 (OW-3 b): 위층에 따라 와 있던 채 차례가 끝나면 (차례 동안 올라옴 · 다른 탭의 차례) 깨어 있는 틈 동안은 그 자리에 둔다 (눈앞에서 사라지지 않게) — 내가 내려가면 담요 (on.octUp).
     잠들 때만 여기서 다락으로 (걸음 · 소리 · 행 없이) */
  function restDown() { if (octWithMe() && typeof scene.octDown === 'function') { scene.octDown(); octPlace('blanket'); } }
  /* 다른 탭이 차례를 끝냈거나 · 이 탭이 다시 보일 때: 쉬는 차례가 바뀌었으면 맞춘다 (틈 안이면 깨어 있게, 지났으면 담요에서 잔다, 날이 바뀌었으면 그대로) */
  function syncRest() {
    if (busy || oct.busy || salonActive || lookHook() || S.trips.some(function (t) { return t.status === 'running'; })) return;
    var t = lastRestTrip();
    if (rest && (!t || rest.id !== t.id || S.octopus.state !== 'sleep')) clearRest();
    if (rest) { restTick(); return; }
    if (S.octopus.state !== 'sleep' && oct.state === 'sleep') { octState('idle'); return; }   /* 다른 탭에서 깼다 (초대 뒤 빈 차례 · 스스로 깸 · 낮잠 끝): 이 탭 문어도 담요에서 조용히 깬다 */
    if (!t || S.octopus.state !== 'sleep' || napOver() || t.id === restSeen) return;
    restSeen = t.id;   /* 11-13: 위층에 따라 와 있으면 틈 안엔 그대로 · 틈이 지났으면 아래 armRest(t, 0) 이 눕히며 담요로 (sleepNow) */
    var byClock = awakeByClock(t);
    if (oct.state === 'sleep') { if (!byClock) return; octPlace('blanket'); octState('idle'); }   /* 이 탭 문어는 앞 낮잠에 자고 있었는데 다른 탭이 새 차례를 막 끝냈다 → 담요에서 깨어 그 틈을 같이 */
    armRest(t, byClock ? Math.max(awakeFor(t) - (Date.now() - (t.endedAt || 0)), seenMin(t)) : 0);
  }
  /* 스스로 깸: 작은 혼잣말 '…응?' 은 말풍선만 (로그에 남기지 않는다). 말풍선은 졸린 귓속말 모양, 얼굴은 눈을 뜬 curious —
     반쯤 감은 calm·sleepy 는 주인이 '-_-^'(화남)로 읽었다 (DIALOGUE_UI: '…응?' + 눈 뜨기) */
  function selfWake() {
    octState('idle'); S.octopus.state = 'idle'; save();
    bubble('…응?', 1600, 'sleepy'); expressRow('curious');
  }
  var dreamTimer = null;
  /* 자는 동안 9–15 s 마다 스스로 깨어날 때인지 본다. 11-13: 이름표는 '자는 중' 그대로 (번갈아 쓰던 '꿈꾸는 중' 은 뺐다 — 이름만 옛날 것) */
  function scheduleDreamLabel() {
    clearTimeout(dreamTimer);
    dreamTimer = setTimeout(function () {
      if (oct.state !== 'sleep') return;
      if (!oct.busy && !salonActive && !document.hidden && !lookHook() && napOver()) { selfWake(); return; }   /* 숨은 탭에선 기다렸다가 돌아와서 (깨는 걸 볼 수 있게) */
      scheduleDreamLabel();
    }, 9000 + uiRng() * 6000);
  }
  function walkTo(anchor, mode) {
    oct.anchor = anchorName(anchor);
    octState(mode || 'walk');
    return (oct.walkP = scene.moveTo(oct.anchor));   /* 지금 걸음 (미용실 연출이 도착을 기다린다 — salonSettle) */
  }
  function stopWander() { clearTimeout(oct.wanderTimer); oct.wanderTimer = null; }
  function scheduleWander() {
    stopWander();
    oct.wanderTimer = setTimeout(function () {
      if (oct.busy || salonActive || oct.state !== 'idle' || document.hidden || rest || octWithMe()) { scheduleWander(); return; }   /* 11-12: 위층에 따라 올라와 있는 동안엔 온 자리에 있는다 (돌아다닐 자리는 다락 것뿐) */   /* 깨어 있는 틈엔 담요에 있는다 · 미용실 연출 중엔 그 자리 */
      var opts = allowedIdleAnchors().filter(function (a) { return a !== oct.anchor; });
      var next = opts[Math.floor(uiRng() * opts.length)] || 'center';
      scheduleWander();   /* 다음 산책은 지금 예약: 걷기가 다른 이동에 끊기면 그 Promise 는 풀리지 않는다 → .then 에서 걸면 산책이 영영 멈춘다 */
      walkTo(next).then(function () { if (!oct.busy) octState('idle'); });
    }, (20 + uiRng() * 20) * 1000);
  }
  /* §17.1 대기 중 생각 말풍선: 20–40 s 마다, 집에서 idle 일 때만, 최근 방 메모 중 하나 ("{note} 생각 중"). 메모가 없으면 아무 말도 안 한다 (지어내지 않음). 말풍선만 — 로그엔 남기지 않는다 */
  var thinkTimer = null;
  function recentNotes() {
    return Object.keys(S.notes || {}).map(function (k) { return S.notes[k]; }).filter(function (n) { return n && typeof n.text === 'string' && n.text; })
      .sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; }).slice(0, 6);
  }
  function thinkLine() {   /* → { text, note } — note = 그때 남긴 메모 (24글자 넘으면 + '…' · 원문은 S.notes 그대로, 말풍선에서 그 부분만 남의 글 표시) */
    var pool = recentNotes(); if (!pool.length) return null;
    var n = pool[Math.floor(uiRng() * pool.length)], note = clipG(n.text, 24);   /* 긴 메모가 말풍선을 여러 줄로 키워 문어를 덮지 않게 (11-08) */
    return { text: typeof MEMO_STR.thinking === 'function' ? MEMO_STR.thinking(note) : note + ' 생각 중', note: note, by: rawBy(tripById(n.tripId)) };
  }
  function scheduleThink() {
    clearTimeout(thinkTimer);
    thinkTimer = setTimeout(function () {
      var dlgOpen = !!document.querySelector('dialog[open]');
      if (!oct.busy && !salonActive && oct.state === 'idle' && !document.hidden && !dlgOpen && !lookHook() && !rest) {   /* 깨어 있는 틈 · 미용실 연출 중엔 생각 말풍선 없음 (톡 한 줄 · 대답 말풍선을 덮지 않게) */
        var t = thinkLine(); if (t) { bubble(t.text, 3600, 'think', { raw: t.by, rawText: t.note }); expressRow('curious'); }
      }
      scheduleThink();
    }, (20 + uiRng() * 20) * 1000);
  }
  /* kind → 말풍선 모양 (js/ui-art.js) · 말풍선 목소리 (js/audio.js). opt: { icon: 'memory/sea' (말 뒤 픽셀 그림), raw: 'model'|… (남이 쓴 말), rawText: 그중 남의 글 부분 (없으면 전부) } */
  /* opt.silent = 소리 없이 (같은 톡 한 줄을 또 누름) · opt.tap = 톡 한 줄 (말풍선에 표시를 남겨 다음 톡이 알아본다) */
  function bubble(text, ms, kind, opt) {
    if (text && inPlay() && !octWithMe()) return;   /* 놀이방에 있는 동안 문어의 말풍선은 띄우지 않는다 (문어는 다락에 · 말풍선 소리도 없이). 로그 행은 그대로 (say) */
    if (tapGivenBy && !(opt && opt.tap)) { tapGivenBy = null; clearTimeout(tapTagTimer); renderBrainTag(); }   /* 모델의 톡 한 줄이 내려가면 '데모' 꼬리표도 돌아온다 */
    scene.bubble(text, ms);
    var b = $('oct-bubble');
    if (b) { if (text && opt && opt.tap) b.setAttribute('data-tap', '1'); else b.removeAttribute('data-tap'); }
    if (b && text && !b.hidden && opt) {   /* 장면은 글자만 넣는다 (textContent) → 남의 글 표시 · 그림은 여기서 덧붙인다 (재는 건 그 뒤 UIART.onBubble) */
      if (opt.raw) { b.textContent = ''; withRaw(text, opt.rawText || text, opt.raw).forEach(function (n) { b.appendChild(n); }); }
      var im = opt.icon ? ico(opt.icon, 'ua-bub') : null; if (im) b.appendChild(im);
    }
    if (window.UIART) UIART.onBubble(text, kind); if (window.AUDIO && !(opt && opt.silent)) AUDIO.on('bubble', { text: text, kind: kind }); keepBubble2D();
  }
  /* ── 톡 한 줄 (주인 11-08 "눌렀을 때 응? 대신 직전에 다녀온 뽈뽈에 대한 짧은 대사 하나") ──
     그날 마지막으로 끝낸 차례(빈 차례 포함 · 옛 기록 제외)의 BRAIN.tapLine. 말풍선만 — 로그 행 · 저장 · 앨범에 안 남고, 난수도 두뇌 입력도 건드리지 않는다.
     규칙이 지은 줄은 '데모' 꼬리표가 보일 때만 · 모델 · 사람이 쓴 줄은 그대로 (24글자 넘으면 + '…') 이고 모델이 쓴 줄이 떠 있는 동안 '데모' 꼬리표를 숨긴다 (모델 재생과 같은 규칙 — 사람 차례는 재생 때처럼 그대로).
     얼굴은 늘 idle (반응을 다시 짓지 않는다). 같은 줄이 떠 있으면 소리 · 얼굴 없이 다시 세우고, 20 s 안에 같은 줄이면 소리 없이. 깨어 있는 톡마다 몸이 2px 톡 (모션 줄이기면 눈 깜빡) */
  var tapShown = null, tapGivenBy = null, tapTagTimer = 0, nudgeTimer = 0, TAP_VOICE_MS = 20000;
  function lastTurn() {
    var best = null;
    S.trips.forEach(function (t) { if (t && t.status === 'done' && t.by !== 'legacy' && (!best || (t.endedAt || 0) >= (best.endedAt || 0))) best = t; });
    if (!best) return null;
    var endDay = hookToday() ? best.date : dateKey(new Date(best.endedAt || 0));   /* 끝난 날 (napOver 와 같은 규칙) */
    return endDay === todayKey() ? best : null;
  }
  function demoTagShown() { var tg = $('brain-tag'); return !!tg && !tg.hidden && /^데모/.test((tg.textContent || '').trim()); }
  function tapLineNow() {
    var t = lastTurn(); if (!t || !B || typeof B.tapLine !== 'function') return null;
    var r = null; try { r = B.tapLine(t); } catch (e) { r = null; }
    if (!r || typeof r.text !== 'string' || !r.text.trim()) return null;
    if (r.by === 'demo-rules') { if (!demoTagShown()) return null; }   /* 규칙이 지은 말은 '데모' 꼬리표 아래에서만 */
    else if (r.by !== 'model' && r.by !== 'human') return null;
    var given = r.by !== 'demo-rules';
    return { trip: t, text: given ? clipG(r.text, TAP_CLIP) : r.text, full: r.text, by: r.by, part: given ? null : (r.part || null), src: r.src || '' };
  }
  function tapNudge() {   /* 톡 받았다는 작은 몸짓: 3D 2px 톡 · 2D 2px · 모션 줄이기면 눈만 한 번 깜빡 (얼굴은 곧 돌아온다) */
    if (!scene) return;
    if (reduced()) {
      var prev = typeof scene.expression === 'function' ? scene.expression() : 'idle';
      if (prev === 'blink' || prev === 'sleep') return;
      scene.setExpression('blink'); clearTimeout(nudgeTimer);
      nudgeTimer = setTimeout(function () { if (scene && typeof scene.expression === 'function' && scene.expression() === 'blink') scene.setExpression(prev); }, 160);
      return;
    }
    if (sceneMode === '3d') { if (typeof scene.nudge === 'function') scene.nudge(); return; }
    var el = $('oct'); if (!el) return;
    el.classList.remove('nudge'); void el.offsetWidth; el.classList.add('nudge');
    clearTimeout(nudgeTimer); nudgeTimer = setTimeout(function () { el.classList.remove('nudge'); }, 260);
  }
  /* 화면 낭독기: 톡 말풍선은 라이브 영역이 아니다 (예전 '응?' 은 로그 행으로 읽혔다) → 같은 말을 보이지 않는 칸(role=status) 하나에 (로그 행 · 저장 없음).
     남이 쓴 말 · 위키 제목은 그 칸에서도 data-raw. 비웠다가 다시 써야 같은 말도 다시 읽는다 */
  var srTimer = 0;
  function tapSR(text, raw, part) {
    var el = $('oct-say');
    if (!el) { el = h('p', { id: 'oct-say', class: 'sr-only', role: 'status', 'aria-live': 'polite' }); document.body.appendChild(el); }
    el.textContent = ''; clearTimeout(srTimer);
    if (!text) return;
    srTimer = setTimeout(function () {
      appendAll(el, raw === 'wiki' ? partRaw(text, part, 'wiki') : raw ? [h('span', { 'data-raw': raw, text: text })] : [document.createTextNode(text)]);
    }, 40);
  }
  function tapOct() {
    if (salonActive) return;   /* 미용실 연출 중: 톡 한 줄 · 몸짓 없음 (문어가 고른 대답을 보이는 중 — 말풍선을 덮지 않는다) */
    if (oct.state === 'sleep') { bubble(SLEEP_SAY, 1500, 'sleep'); tapSR(SLEEP_SAY); return; }   /* 자는 중엔 깨우지 않는다 */
    if (oct.busy || oct.state === 'pet' || oct.state === 'away') return;
    var L = tapLineNow();
    if (!L) { bubble(TAP_SAY, 1600, 'curious'); tapSR(TAP_SAY); expressRow('curious'); tapNudge(); return; }
    var b = $('oct-bubble'), up = !!(b && !b.hidden && b.getAttribute('data-tap') === '1' && tapShown && tapShown.text === L.text);
    var ms = clamp(2000 + 90 * Array.from(L.text).length, 2600, 4600);   /* 읽는 시간 (--speed 와 상관없이) */
    var again = !!(tapShown && tapShown.text === L.text && Date.now() - tapShown.at < TAP_VOICE_MS);
    if (!again) tapShown = { text: L.text, at: Date.now() };
    var given = L.by === 'model' ? 'model' : L.by === 'human' ? 'human' : null;
    bubble(L.text, ms, 'say', { tap: true, silent: up || again, raw: given || (L.part ? 'wiki' : null), rawText: given ? L.text : L.part });
    if (!up) tapSR(L.text, given || (L.part ? 'wiki' : null), L.part);
    /* '데모' 꼬리표는 모델이 쓴 줄이 떠 있는 동안만 숨긴다 (꼬리표가 숨는 건 늘 '모델이 고른 것' 이란 뜻 — 사람(개발용 데모 조작) 차례는 그 재생 때처럼 꼬리표 그대로) */
    if (given === 'model') { tapGivenBy = given; renderBrainTag(); clearTimeout(tapTagTimer); tapTagTimer = setTimeout(function () { tapGivenBy = null; renderBrainTag(); }, ms + 60); }
    if (!up) expressRow('idle');
    tapNudge();
  }
  /* 2D 무대: 문 앞(무대 오른쪽 끝)에서 말풍선(최대 150px)이 장면 밖으로 잘리지 않게 옆으로 민다 (--bub-dx → css #oct-bubble left, 무대 px).
     보이는 동안 문어가 걸어가도 5 Hz 로 따라간다. 3D 픽셀 말풍선은 js/ui-art.js keepInside 가 맡는다 */
  var bubFit = null;
  function keepBubble2D() {
    clearInterval(bubFit); bubFit = null;
    var b = $('oct-bubble'), sc = $('scene'); if (!b || !sc) return;
    function fit() {
      var UA = window.UIART && UIART.avoidCtl && UIART.ctlYield ? UIART : null;
      if (b.hidden || sceneMode !== '2d') { clearInterval(bubFit); bubFit = null; b.style.removeProperty('--bub-dx'); if (sceneMode === '2d') b.style.removeProperty('--bub-dy'); if (UA && sceneMode === '2d') UA.ctlYield(false); return; }
      var px = parseFloat(getComputedStyle(sc).getPropertyValue('--px')) || 1, cur = parseFloat(b.style.getPropertyValue('--bub-dx')) || 0, curY = parseFloat(b.style.getPropertyValue('--bub-dy')) || 0;
      var s = sc.getBoundingClientRect(), r = b.getBoundingClientRect(), pad = 4, l = r.left - cur * px, rt = r.right - cur * px, dx = 0;
      var lift = UA && UA.liftY ? UA.liftY(b) * px : 0, top0 = r.top - curY * px - lift, bot0 = r.bottom - curY * px - lift, need = s.top + pad - top0, dy = need > 0 ? Math.ceil(need / px) : 0;   /* 위쪽에 잘리면 그만큼 아래로 (무대 px — 3D 는 js/ui-art.js keepInside, 11-08). 등장 애니메이션 도중이어도 끝난 자리로 잰다 (아이콘 피하기도) */
      if (dy !== curY) { if (dy) b.style.setProperty('--bub-dy', dy + 'px'); else b.style.removeProperty('--bub-dy'); }
      if (rt > s.right - pad) dx = (s.right - pad - rt) / px; else if (l < s.left + pad) dx = (s.left + pad - l) / px;
      /* 장면 위 버튼(오른쪽 위 묶음: 앨범 · ⚙ — 2D 엔 바깥 집 단추가 없다)과 겹치면 그 왼쪽으로 (풍선이 문어 위를 벗어나지 않는 만큼까지 · 왼쪽 가장자리 안) — js/ui-art.js avoidCtl 과 3D 규칙이 같다 */
      var cs = UA ? UA.avoidCtl({ left: l, right: rt, top: top0, bottom: bot0 }, pad) : 0;
      if (cs < 0) dx = Math.min(dx, Math.max(cs, s.left + pad - l, -Math.max(0, r.width / 2 - 28)) / px);
      dx = Math.round(dx);
      if (UA) UA.ctlYield({ left: l + dx * px, right: rt + dx * px, top: top0 + dy * px, bottom: bot0 + dy * px });   /* 그래도 겹치는 버튼만 말풍선이 보이는 동안 숨김 (3D 와 같다) */
      if (dx !== cur) { if (dx) b.style.setProperty('--bub-dx', dx + 'px'); else b.style.removeProperty('--bub-dx'); }
    }
    fit();
    if (!b.hidden && sceneMode === '2d') bubFit = setInterval(fit, 200);
  }
  /* 말풍선 + 로그 대화창 행 (§15.2 "?" · "비가 와" · "…"): 장면 위 말풍선과 같은 말을 초상과 함께 오늘 칸에 남긴다 (저장 X — 새로고침하면 사라지는 혼잣말). 바로 앞 행과 같은 말이면 행은 생략.
     opt = bubble 의 opt (그림은 말풍선에만) */
  function say(text, expr, ms, opt) {
    bubble(text, ms, expr, opt);
    var today = ensureTodaySection(), last = today.lastElementChild;
    if (last && last.classList.contains('lrow') && last.dataset.say === text) { expressRow(expr); return; }
    var row = logRow('혼잣말', text, 'c-amber', true, expr); row.dataset.say = text;
    appendLogRow(today, row);
  }
  function octInitial() {
    var hk = lookHook();
    if (hk) { octPlace(hk.anchor || 'center'); octState(hk.octState || 'idle'); return; }   /* 고정 앵글: 산책 없음 */
    if (S.octopus.state === 'sleep') {
      octPlace('blanket');
      var t = lastRestTrip(), kept = restKept(t);
      if (t && kept > 0) { octState('idle'); armRest(t, Math.max(kept, seenMin(t))); }   /* 이 탭에서 깨어 있던 틈에 새로고침: 남은 만큼 (창 · 놀이방에서 멈춘 시간은 그대로 멈춘 채) */
      else if (t && awakeByClock(t)) { octState('idle'); armRest(t, Math.max(awakeFor(t) - (Date.now() - (t.endedAt || 0)), seenMin(t))); }   /* 깨어 있는 틈 안에 다시 열었다 */
      else { if (t) restSeen = t.id; octState('sleep'); }
    }
    else { octPlace('window'); octState('idle'); }
    scheduleWander();
  }
  /* 다음 초대가 깨운다 — 깨어 있는 틈이었어도 쉬는 표시를 걷는다 (빈 차례가 끝나며 다시 재우지 않게) */
  function wakeUp() {
    clearRest();
    if (oct.state === 'sleep' || S.octopus.state === 'sleep') { if (oct.state === 'sleep') octState('idle'); S.octopus.state = 'idle'; save(); }
  }
  var petTimer = null;
  function pet() {
    if (oct.busy || salonActive || oct.state === 'away') return;
    if (oct.state === 'sleep') { bubble(SLEEP_SAY, 1500, 'sleep'); tapSR(SLEEP_SAY); return; }   /* 말풍선만 (11-08) — 낭독기엔 보이지 않는 칸으로 */
    octState('pet');
    if (window.UIART) UIART.fx('heart');
    if (window.AUDIO) AUDIO.on('pet');   /* 소리: 쓰다듬기 */
    clearTimeout(petTimer);
    petTimer = setTimeout(function () {
      if (oct.state !== 'pet') return;
      if (uiRng() < 0.7) { octState('idle'); say('…', 'pet', 1800); }   /* 말 없이 '…' 만 (예전 하트 기호는 뺐다 — 하트는 픽셀 테마 파티클이 띄운다). 11-13 (금지선 1): '…좋아' 는 코드가 문어 목소리로 좋다고 말한 것이라 뺐다 */
      else if (rest) octState('idle');   /* 깨어 있는 틈: 담요에서 말없이 그대로 (뽑기는 그대로 — '…' 가 더 잦아지지 않게) */
      else { var opts = allowedIdleAnchors().filter(function (a) { return a !== oct.anchor; }); walkTo(opts[Math.floor(uiRng() * opts.length)] || 'center').then(function () { if (!oct.busy) octState('idle'); }); }
    }, 2000);
  }

  /* ───────────────────────── invite / reveal / commit (§3) ───────────────────────── */
  var busy = false, skipFlag = false, revealing = null;
  var flying = null, remoteDirty = false;   /* 이 탭에서 지금 다녀오는 여행 · 그동안 다른 탭 저장을 받아 다시 그려야 하는지 (bind 의 storage) */
  /* 이 탭이 반영한 여행 [{ trip, at }] — 다른 탭이 그걸 받기 전에 만든 저장이 오면(그쪽에 없음·아직 running) 다시 얹는다 (adoptRemote).
     탭이 셋 이상이면 한 탭이 받았다고 다른 탭의 늦은 저장이 안 오는 게 아니라서, 받았는지 대신 시간(MINE_MS)으로 놓는다 */
  var mine = [], MINE_MS = 60000;
  /* 큰 버튼 하나 (주인 11-07 · 건너뛰기 합침): 나가 있는 동안 #btn-go = "다녀오는 중…" (글자만 · 기호 없음 · 꺼지지 않는다), 누르면 skip.
     막 누른 뒤 SKIP_GUARD 동안은 건너뛰지 않는다 (다녀와를 두 번 톡 → 바로 건너뛰기가 되지 않게). 누를 수 있게 되면 .can-skip (보이는 건 그대로 — 테스트·도구가 기다리는 신호).
     집에 있을 땐 "뽈뽈 다녀와" 글자만 (예전 비구름 이모지는 뺐다) */
  var SKIP_GUARD = 600, skipReady = 0, skipTimer = 0;
  /* 데려온 차례가 막 끝난 뒤의 누름은 새 산책으로 받지 않는다 (검증 11-08: 모션 줄이기면 귀가가 한 프레임이라 두 번 톡의 둘째가 · 귀가 내내 두드리던 손이 새 산책을 냈다):
     끝나고 GO_SETTLE 안 (SKIP_GUARD 의 거울 — 버튼이 '뽈뽈 다녀와' 로 바뀐 걸 보고 누르기엔 너무 이르다) · 그 뒤로도 앞 누름에서 GO_REST 안에 또 누르는 동안 (끝나고 GO_CAP 까지만 — 계속 두드려도 그 뒤엔 받는다).
     귀가를 지켜본 뒤 한 번 누르면 그대로 '뽈뽈 다녀와'. 글자 · 확인 창 없음 (주인 11-08: 말은 적게) */
  var GO_SETTLE = 600, GO_REST = 900, GO_CAP = 2500, lastGo = 0, backAt = 0, broughtBack = false;
  function goRapid(now) { var since = now - backAt; return !busy && broughtBack && since < GO_CAP && (since < GO_SETTLE || now - lastGo < GO_REST); }
  /* 시트(대화상자)가 막 닫힌 뒤의 누름도 받지 않는다 (검증 11-10 E1 = P1): 한 화면 배치에선 큰 버튼이 시트의 [닫기] · [물어보기] 바로 밑이라, 두 번 톡의 둘째가 시트가 사라진 자리의 큰 버튼에 떨어졌다
     — [닫기] 뒤엔 청하지 않은 산책이 나가고, [물어보기] 뒤엔 대답 연출이 한 번에 감겼다. 닫힌 때(sheetShutAt)는 bindDialogs 가 어느 대화상자든 적는다 (설정 · 앨범 · 로그 · 살림 · 포스터 · 달리기 창).
     누른 때는 click 의 시각 (= 손가락이 떨어진 때 — 느린 기기에서 click 이 늦게 처리돼도 맞는다 · 시각 기준이 다른 옛 브라우저는 처리하는 지금). SHEET_SETTLE 뒤의 누름은 평소대로 */
  var SHEET_SETTLE = 600, sheetShutAt = -1e9;
  function tapTime(e) { var now = performance.now(), ts = e && e.timeStamp; return typeof ts === 'number' && ts > 0 && ts <= now + 40 ? ts : now; }
  function afterSheet(e) { return tapTime(e) - sheetShutAt < SHEET_SETTLE; }
  function setBusy(on) {
    if (on && salonRun) salonFinish();   /* 미용실 연출 중에 산책이 시작되면 (데모 조작 · 이벤트 재생) 남은 연출을 끝 상태로 먼저 */
    busy = on; oct.busy = on;
    if (!on) { flying = null; if (remoteDirty) { remoteDirty = false; renderAll(); applyMotion(); applyFont(); syncSceneLook(); } }
    var go = $('btn-go');
    clearTimeout(skipTimer); skipReady = on ? Date.now() + SKIP_GUARD : 0;
    if (go) {
      go.disabled = false; go.classList.toggle('away', on); go.classList.remove('can-skip');
      if (go.parentNode) go.parentNode.classList.toggle('away', on);
      go.innerHTML = '<span class="go-txt">' + (on ? '다녀오는 중…' : esc(STR.goButton || '산책 갈래?')) + '</span>';
      if (on) { go.setAttribute('aria-label', '다녀오는 중. 누르면 바로 돌아오게 하기'); skipTimer = setTimeout(function () { if (busy) go.classList.add('can-skip'); }, SKIP_GUARD); }
      else go.removeAttribute('aria-label');
    }
    if (on) stopWander(); else { ensureAttic(); scheduleWander(); }
    renderBrainTag();
    syncSalonSpot();   /* 산책 중엔 거울 단추를 숨긴다 */
    if (window.AUDIO) AUDIO.on('busy', { on: on });   /* 소리: 건너뛰기 표시 정리 */
  }
  /* #btn-go: 집에 있으면 초대, 나가 있으면 (막 누른 직후가 아니면) 바로 데려오기 */
  function goTap(e) {
    if (afterSheet(e)) return;   /* 시트가 닫힌 바로 뒤 (두 번 톡의 둘째): 초대 · 데려오기 · 연출 감기 어느 것도 하지 않는다 */
    salonFinish();   /* 미용실 연출 중이면 남은 연출을 한 번에 감고 (새 색 · 대야 치움 · 남은 행) 초대는 평소대로 */
    var now = Date.now(), rapid = goRapid(now); lastGo = now;
    if (inPlay() || roomJob) {   /* 놀이방이면 먼저 문으로 문어 방에 돌아와서 (8물결). 누른 *그때* 의 뜻대로: 다녀오는 중이었으면 데려오기(건너뛰기)만 — 문을 지나는 사이 산책이 끝났으면 아무것도 안 한다 (새 산책이 되지 않게) */
      var wasBusy = busy;
      backToOctRoom().then(function (ok) {
        if (!ok) return;
        if (wasBusy) { if (busy && Date.now() >= skipReady) skip(); }
        else if (!busy && !rapid) invite();
      });
      return;
    }
    if (!busy) { if (!rapid) invite(); return; }
    if (Date.now() < skipReady) return;
    skip();
  }
  /* 상태 줄 이름 옆 '데모' 표시 (정직 표기, index.html #brain-tag): 데모 두뇌(규칙)가 고르는 동안 늘. 모델(MCP)이 고른 여행을 재생하는 동안만 숨긴다 */
  /* 모델이 쓴 톡 한 줄이 떠 있는 동안도 숨긴다 (그 말을 '규칙이 골라' 아래 두지 않게 — 11-08. 사람(개발용 데모 조작) 차례는 재생 때처럼 꼬리표 그대로) */
  function renderBrainTag() { var tg = $('brain-tag'); if (tg) tg.hidden = !!(flying && flying.by === 'mcp') || !!tapGivenBy; }
  function tripsOn(key) { return S.trips.filter(function (t) { return t.date === key; }); }
  function newTripId(seed) {
    var base = 'trip_' + (seed >>> 0).toString(36).slice(-4);
    var id = base, n = 2;
    while (S.trips.some(function (t) { return t.id === id; })) id = base + n++;
    return id;
  }
  function brainInput(trip) {
    var recent = S.trips.filter(function (t) { return t.status === 'done' && t.kind; }).slice(-2).map(function (t) { return { kind: t.kind, nStops: (t.receipt && t.receipt.stops && t.receipt.stops.length) || 0 }; });
    var todayOut = tripsOn(trip.date).filter(function (t) { return t.kind === 'out' && t.status === 'done'; }).length;
    return {
      seed: trip.seed, dateKey: trip.date, seq: trip.seq, hint: trip.hint.raw, name: S.octopus.name || '', id: trip.id,
      state: withNotes({ visits: S.octopus.visits, affinity: S.octopus.affinity, lantern: S.room.lantern, lanternLeft: lanternLeft(trip.date), owned: ownedSouvenirs(), recent: recent, todayOut: todayOut, lastVisit: lastVisitMap(trip), posters: wallPosters() }),
      now: new Date(), online: navigator.onLine !== false, by: 'demo',
      shelf: (typeof SHELF !== 'undefined' && SHELF.today && B) ? SHELF.today(trip.date, B, 8) : undefined   /* 큰 도서관 '오늘의 서가' — 데모 문어도 그날 서가에서 걷는다 */
    };
  }
  /* 호기심 메모 넘기기 (계약 R2 · CURIOSITY_NOTES "다음 모델에게 전달하는 모양"): 내려놓지 않은(active) 메모 최근 3개, 새것부터. 내려놓은 메모는 넣지 않고 개수도 알리지 않는다.
     메모가 없으면 필드째 빼서 두뇌 입력이 예전과 똑같다 */
  var NOTES_PASS = 3, NOTE_SHOW = 60;
  function activeNotes(n) { var a = S.curiosityNotes.filter(function (x) { return x.status === 'active'; }); return (n ? a.slice(-n) : a).reverse(); }
  function notesForBrain() {
    return activeNotes(NOTES_PASS).map(function (x) { var o = { id: x.id, text: x.text, about: x.about || null, by: x.by, session: x.session, at: x.at }; if (x.model) o.model = x.model; return o; });
  }
  function withNotes(st) { var nn = notesForBrain(); if (nn.length) st.notes = nn; return st; }
  /* 등불은 초대한 날마다 1칸 (DESIGN §4): 이 여행이 끝나면 칸이 켜지는가 = 아직 8칸이 아니고 그날 끝낸 여행이 없다.
     두뇌는 이걸 '등불 +1' 말에만 쓴다 (난수 순서 그대로). 빈 차례·집에 있는 날도 그날 첫 차례면 켜진다 (§5.2 아무것도 안 해도 된다) */
  function lanternLeft(date) { return S.room.lantern < 8 && S.octopus.days.indexOf(date) < 0; }
  /* 이미 선반·창턱에 있는 기념품 id (중복 없이) → 두뇌는 이번 산책에 들른 방 중 아직 없는 기념품만 후보로 본다 */
  function ownedSouvenirs() { var out = []; S.room.souvenirs.forEach(function (sv) { if (sv && sv.id && out.indexOf(sv.id) < 0) out.push(sv.id); }); return out; }
  /* 두뇌 재생(데모 조작 · 이벤트 JSON)에 넘기는 상태 — 계획과 같은 사실만 */
  function replayState(dk) { return withNotes({ visits: S.octopus.visits, affinity: S.octopus.affinity, lantern: S.room.lantern, lanternLeft: lanternLeft(dk), owned: ownedSouvenirs(), recent: [], todayOut: 0, posters: wallPosters() }); }
  /* 지금 벽에 붙어 있는 포스터 수 (renderWall 과 같은 목록) → 두뇌가 포스터 활동(다시 읽기·자리 바꾸기)을 거른다. 계획·재생 모두 */
  function wallPosters() { return posterTrips().length; }
  /* 방마다 마지막으로 다녀온 날 (저장된 여행의 날짜에서만) → 두뇌의 재방문 판단 (§17.1) */
  function lastVisitMap(except) {
    var m = {};
    S.trips.forEach(function (t) { if (t === except || t.status !== 'done' || !t.receipt || !t.receipt.stops) return; t.receipt.stops.forEach(function (st) { if (st.nodeId && st.nodeId !== 'door_out') m[st.nodeId] = t.date; }); });
    return m;
  }
  /* 재방문 기웃 행에 붙일 기록: 그 방의 최근 메모 + 그때 날씨 (그 여행이 날씨를 저장했을 때만). 이번 여행에 고정 저장 → 다시 그려도 같은 말 */
  function buildRecall(trip) {
    var rc = {};
    (trip.events || []).forEach(function (ev) {
      var tg = ev && ev.type === 'peek' && ev.target; if (!tg || !tg.id || tg.id === 'door_out' || rc[tg.id]) return;
      var prior = null;
      S.trips.forEach(function (t) { if (t !== trip && t.status === 'done' && t.receipt && t.receipt.stops && t.receipt.stops.some(function (st) { return st.nodeId === tg.id; })) prior = t; });
      var n = S.notes[tg.id];
      var o = {};
      if (n && n.text && n.tripId !== trip.id) { o.note = n.text; o.date = n.date; }
      if (prior && prior.weather) { o.weather = prior.weather; o.date = o.date || prior.date; }
      if (o.note || o.weather) rc[tg.id] = o;
    });
    if (Object.keys(rc).length) trip.recall = rc; else delete trip.recall;
  }
  function mergePlan(trip, planned) {
    ['kind', 'by', 'hint', 'events', 'receipt', 'poster', 'visitsDelta', 'affinityDelta', 'affinityDecay', 'reaction', 'reactionRaw', 'reactionBy', 'reactionLine', 'memo', 'revisit', 'noteOut', 'setDown', 'posterHung'].forEach(function (k) { if (planned[k] !== undefined) trip[k] = planned[k]; });
    if (trip.receipt && trip.receipt.stops) trip.receipt.stops.forEach(function (s) { if (s.source && s.source.extract) s.source.extract = String(s.source.extract).slice(0, 160); });
    if (trip.events && trip.events[0] && trip.events[0].type === 'depart') delete trip.events[0].match;
    if (!trip.memo) delete trip.memo;
    if (!trip.revisit) delete trip.revisit;
    ['reactionRaw', 'reactionLine', 'noteOut', 'setDown'].forEach(function (k) { if (trip[k] == null) delete trip[k]; });   /* 없는 건 저장하지 않는다 (옛 기록과 같은 모양) */
    if (trip.posterHung !== false) delete trip.posterHung;   /* false = 모델이 hang_poster 를 내지 않았다 → 벽에 붙이지 않는다 (앨범·일기에는 남는다) */
    buildRecall(trip);
  }
  function invite() {
    if (busy) return Promise.resolve(null);
    salonFinish();   /* 미용실 연출 중이면 끝 상태로 먼저 (주 버튼 · APP.invite) */
    if (inPlay() || roomJob) return backToOctRoom().then(function (ok) { return ok ? invite() : null; });   /* 출발은 문어 방에서 본다: 놀이방이면 문을 지나 돌아온 뒤 (8물결) */
    hideBackNote();
    if (!S.octopus.name) { openNameDialog(); return Promise.resolve(null); }
    checkDay(true);   /* 자정을 넘겨 다시 부르면 어제 로그는 앨범 일기로, 오늘 칸부터 새로 */
    if (!B || typeof B.plan !== 'function') { toast('두뇌(brain.js)가 아직 없어'); return Promise.resolve(null); }
    /* 힌트 칸은 개발 모드에만 있다 (결정 18): 플레이어 산책은 늘 빈 힌트. 두뇌의 힌트 이해는 그대로 둔다 (개발·테스트·MCP 이벤트) */
    var hint = hookHint();   /* 힌트 칸은 없앴다 (주인 11-10) — 사람이 주제를 건넬 길은 없다. 스모크만 테스트 훅으로 두뇌의 옛 길을 탄다 */
    var dk = todayKey(), seq = tripsOn(dk).length + 1;
    var seed = B.hashSeed(dk, hint, seq, S.octopus.name);
    var trip = { id: newTripId(seed), date: dk, seq: seq, seed: seed, kind: null, by: 'demo', hint: { raw: hint, match: null, followed: null },
      status: 'running', startedAt: Date.now(), endedAt: null, events: [], receipt: null, poster: null, weather: weatherFor(S.room.lantern) };
    S.trips.push(trip); save();
    setBusy(true); skipFlag = false; flying = trip; broughtBack = false;
    var woke = oct.state === 'sleep';   /* 낮잠 자는 문어를 깨운 누름 (11-12 주인: 할 일로 세지 않는다 — 아래 questMark) */
    wakeUp();
    bubble('', 0);
    /* 누른 지 400ms 안에 로그에 첫 반응 (UI R19): 움츠리는 동안 '…' 자리표시 */
    var pre = logRow('…', '…', 'typing pre', false); ensureTodaySection().appendChild(pre); scrollLog();
    octState('anticipate');
    /* 예비 동작: 600ms 움츠림 + 200ms 멈춤 → 나간다. 집에 있는 날엔 같은 움츠림이 풀리며 자리에 앉는다 (GF R8) */
    var fast = reduced();
    var windup = sleep(fast ? 50 : 600 * speed()).then(function () { return sleep(fast ? 0 : 200 * speed()); });
    var planP = B.plan(brainInput(trip)).catch(function (e) { console.warn('plan failed', e); return null; });
    return Promise.all([planP, windup]).then(function (res) {
      var planned = res[0];
      if (!planned) {
        S.trips = S.trips.filter(function (t) { return t !== trip; }); save();
        pre.remove(); setBusy(false); settleOct(); toast('두뇌가 잠깐 멈췄어. 다시 한 번 불러 줘');
        return null;
      }
      if (!woke) questMark('ask');   /* 이번 주 할 일: 묻는 것만 센다 (나갈지는 문어가 정한다). 11-12 (검증 F10): 차례가 정해진 뒤에 — 두뇌가 멈춰 없던 일이 된 물음은 세지 않는다. 11-12 주인 (검증 W5 (b)): 자는 문어를 깨운 누름은 세지 않는다 (그 차례 동안 다시 눌러도 초대가 아니다 — busy) */
      if (trip.status !== 'done') mergePlan(trip, planned);   /* done = 그사이 다른 탭이 데려왔다 (adoptRemote) → 그 기록 그대로 보여 준다 */
      save();
      /* 외출: 움츠림 뒤 출발 의식(다락 문 → 바깥 → 화면 밖) → 끝나면 로그 공개. 바깥은 나가 있는 동안 그대로 (계절 입자). 집·빈 차례는 의식 없음 */
      var lead = trip.kind === 'out' ? departOut() : !fast ? settleOct() : Promise.resolve();
      return lead.then(function () { return reveal(trip); }).then(function () { broughtBack = skipFlag; backAt = Date.now(); setBusy(false); return trip; });
    });
  }
  /* 건너뛰기 (큰 버튼 · 나가 있는 동안): 걷던 길은 그 자리에서 도착 (2D·3D 장면의 finishWalk — moveTo 의 Promise 도 지금 풀린다) · 의식은 감고 · 틈은 깨운다 */
  /* 데려오기는 보여 주는 속도만 바꾼다: 산책은 출발 전에 두뇌가 다 정했고 (plan), 반영은 한 번 (commitTrip) — 기록은 안 데려온 것과 같다.
     귀가가 시작되면(homing) 다시 눌러도 그대로 둔다 → 짧은 귀가(문 · 포스터 · 토스트 · 등불, 2초 안)는 끝까지 보인다 (주인 11-08).
     걸어서 오는 중(바깥 퇴장 · 길 · 계단 — R.back)에 누르면 남은 길을 감지 않고 짧은 귀가로 바꾼다 (다락 문으로 들어온다). 다락에 들어온 뒤(R.home: 포스터 들고 걷기 · 걸기 · 마무리 ·
     집에 있는 날)엔 기다림만 없앤다 — 걷던 걸음은 마저 걷는다 (순간이동 없음) */
  function skip() {
    var R = revealing;
    if (R && R.homing) return;
    if (R && R.back) { R.back(); return; }
    skipFlag = true;
    if (R && R.home) { if (R.wake) R.wake(); return; }
    if (scene && typeof scene.finishWalk === 'function') scene.finishWalk();
    if (cer.kind) jumpCeremony();
    if (R && R.wake) R.wake();
  }
  /* 움츠림 → 1.03 overshoot 로 풀기 (2D 는 CSS, 3D 는 idle 복귀). 끝나면 idle */
  function settleOct() {
    var el = $('oct'); octState('idle');
    if (reduced() || !el) return Promise.resolve();
    el.classList.add('settle');
    return sleep(500 * speed()).then(function () { el.classList.remove('settle'); });
  }
  function gapWait(ms) {
    if (skipFlag) return Promise.resolve();
    return new Promise(function (resolve) {
      var t = setTimeout(done, ms);
      function done() { clearTimeout(t); revealing.wake = null; resolve(); }
      revealing.wake = done;
    });
  }
  function reveal(trip) {
    revealing = { trip: trip, wake: null, deferred: null, ceremony: null, outside: false, firstN: 0 };
    var rng = mkRng((trip.seed ^ 0x9e3779b9) >>> 0);
    var evs = trip.events || [];
    var today = ensureTodaySection();
    today.querySelectorAll('.lrow.typing.pre').forEach(function (r) { r.remove(); });
    var typing = null;
    function showTyping() { if (skipFlag) return; typing = logRow('…', '…', 'typing', false); today.appendChild(typing); scrollLog(); }
    function hideTyping() { if (typing) { typing.remove(); typing = null; } }
    var chain = Promise.resolve();
    evs.forEach(function (ev, i) {
      var out = false;
      chain = chain.then(function () {
        out = ev.type === 'peek' && peeksOutside();   /* 바깥 기웃: 걸어가는 시간만큼 틈은 짧게, '…' 는 자세를 잡을 때까지 */
        if (i > 0) { showTyping(); return gapWait((out ? 1100 + rng() * 1300 : 2200 + rng() * 2300) * speed()).then(function () { if (!out || skipFlag) hideTyping(); }); }
      }).then(function () {
        var row = eventRow(trip, ev);
        if (window.AUDIO) AUDIO.on('row', { ev: ev, trip: trip, outside: out && !skipFlag, skip: skipFlag });   /* 소리: 공개되는 이벤트마다 (바깥 기웃은 peek 훅) */
        if (out && !skipFlag) return peekOut(ev, function () { hideTyping(); if (row) appendLogRow(today, row); });
        if (row) appendLogRow(today, row);
        return sceneFor(trip, ev);
      });
    });
    return chain.then(function () {
      hideTyping();
      if (trip.status !== 'done') commitTrip(trip);
      return startCeremony();
    }).then(function () {
      var sr = summaryRow(trip); if (sr) appendLogRow(today, sr);
      revealing = null;
      finalPose(trip);
    });
  }
  /* 귀가 연출 (UI R25 · GF R15/R18): 로그 끝 → 포스터 올라옴 → 토스트 → 등불 칸 → 200ms 뒤 소품 + 집 한 줄.
     데려왔으면 같은 순서를 반 박자로 (≈ 0.9 s · 11-08), 모션 줄이기면 기다림 없이 한꺼번에 (토스트 · 등불 칸 · 소품 줄은 그대로 보인다) */
  function startCeremony() {
    if (!revealing) return Promise.resolve();
    if (revealing.ceremony) return revealing.ceremony;
    var d = revealing.deferred, trip = revealing.trip;
    if (!d) { revealing.ceremony = Promise.resolve(); return revealing.ceremony; }
    revealing.deferred = null;
    var k = reduced() ? 0 : skipFlag ? 0.5 : 1, lit = S.room.lantern > d.prevL, lv = S.room.lantern;
    function wait(ms) { return k ? sleep(ms * k * speed()) : Promise.resolve(); }
    revealing.ceremony = Promise.resolve().then(function () {
      renderAlbum();                                   /* 포스터(정점): 앨범 아이콘으로 날아간다 (앨범을 열면 새 카드만 올라온다) */
      if (!trip.poster) return;
      flyToAlbum(trip);
      return wait(650).then(function () { if (trip.poster.type === 'note') toast('쪽지 한 장 남겼어'); else toast('새 포스터 · ' + (trip.poster.title || ''), { part: trip.poster.title, by: posterTitleRaw(trip) }); return wait(400); });
    }).then(function () {
      renderStatus(lit);                               /* 등불 칸 (8번째는 800ms 블룸) */
      renderScene('lantern');
      return wait(lit && lv >= 8 ? 800 : 500);
    }).then(function () {
      return wait(200);                                /* follow-through: 소품은 칸 뒤 200ms */
    }).then(function () {
      renderScene('items');
      if (lit && ITEM_LINE[lv]) appendLogRow(ensureTodaySection(), logRow('방', ITEM_LINE[lv], 'c-amber', true, null));   /* 집 목소리 (문어 초상 없음) */
    });
    return revealing.ceremony;
  }
  /* 이벤트별 장면 연출. skipFlag 면 즉시 */
  function sceneFor(trip, ev) {
    var fast = skipFlag || reduced();
    switch (ev.type) {
      case 'depart':
        if (oct.state === 'away') return Promise.resolve();   /* 초대: 의식은 공개 전에 끝났다 */
        if (fast) { octState('away'); return Promise.resolve(); }
        return departOut().then(function () { return sleep(400 * speed()); });   /* 이벤트 JSON 재생 등 */
      case 'return':
        commitTrip(trip);
        /* 들고 오는 포스터 = 이 여행의 것 (id: 장면이 걸 때 그 포스터의 벽 칸으로 날린다 — 건너뛰기·데모 재생처럼 벽에 먼저 붙었어도) */
        var mode = trip.poster ? 'carry' : 'walk', carryX = trip.poster ? { svg: posterSVG(trip, 48, 64, { mini: true, noExternal: true }), id: trip.id } : null;
        var wasOut = !!(revealing && revealing.outside);
        /* 큰 버튼으로 데려왔다 (11-08): 귀가를 자르지 않고 짧게 — 바깥에 남은 것(기웃 · 퇴장)은 감고, 다락 문으로 들어와(0.3 s 전환 + 문간에서 나타나 2배로 걸어 나옴) 문 앞에.
           포스터는 머리 위에서 앨범으로 날아간다 (들고 오는 그림 대신). 모션 줄이기면 장면이 한 프레임에 끝낸다. 2D 는 문 앞에서 .settle 한 번 */
        var R = revealing && revealing.trip === trip ? revealing : null;
        var homing = skipFlag && !!R;
        if (homing) R.homing = true;
        var quickHome = function () {   /* 짧은 귀가: 다락 문으로 들어와 문 앞에 선다 (포스터는 머리 위에서 앨범으로 — startCeremony) */
          return runCeremony('return', { quick: true }).then(function () {
            ensureAttic(); octPlace('door'); noteBack(); octState('idle');
            if (sceneMode === '2d') settleOct();
          });
        };
        if (homing && oct.state === 'away' && hasCeremony()) {
          bubble('', 0); dropOverlay(); jumpCeremony();   /* 남은 기웃 · 퇴장 (이 함수 안의 cer 는 wrap_up 의 지역 변수라 쓰지 않는다) */
          return quickHome();
        }
        if (fast) { if (wasOut && typeof scene.leaveOutside === 'function') scene.leaveOutside(); if (!jumpCeremony()) abandonCeremony(); bubble('', 0); dropOverlay(); ensureAttic(); octPlace('board'); octState(mode, carryX); noteBack(); return Promise.resolve(); }
        /* 다락 문으로 들어온 뒤: 보드까지 걸어가 포스터 걸기 (데려왔으면 문 앞에서 그대로 — 짧은 귀가와 같은 끝) */
        var atHome = function () {
          ensureAttic(); octPlace('door');
          noteBack();   /* 놀이방에 있으면 구석 쪽지 "뚜루가 돌아왔어." (문어가 다락 문으로 막 들어온 때 — 8물결) */
          if (R && R.homing) { octState('idle'); if (sceneMode === '2d') settleOct(); return Promise.resolve(); }
          if (R) R.home = true;
          if (skipFlag) { octPlace('board'); octState(mode, carryX); return Promise.resolve(); }
          octState(mode, carryX);
          return walkTo('board', mode).then(function () { octState(mode, carryX); });
        };
        if (!(hasCeremony() && oct.state === 'away')) return Promise.resolve().then(atHome);
        /* (바깥 기웃을 했으면 같은 출구로 퇴장) → 귀가 의식(길 → 계단 → 현관 → 다락 문) → atHome.
           그사이 큰 버튼을 누르면(skip → R.back) 남은 길을 감지 않고 짧은 귀가로 바꾼다 — 바깥 문어는 숨고 0.3 s 전환 뒤 다락 문간에서 나온다.
           이미 다락 문간을 걸어 나오는 중이면 그 걸음을 마저 걷는다 (다시 문간으로 되감지 않는다) */
        return new Promise(function (resolve) {
          var over = false;
          function hurry() {
            if (R) { R.back = null; R.homing = true; }
            skipFlag = true;
            var m = scene && typeof scene.motion === 'function' ? scene.motion() : null;
            if (sceneCeremony() === 'return' && m && m.place === 'attic' && !m.trans) return;   /* 다락 문간에서 걸어 나오는 중: 그대로 (귀가 끝 → atHome 이 데려온 끝으로) */
            over = true;
            letGoCeremony();
            bubble('', 0); dropOverlay();
            quickHome().then(resolve);
          }
          if (R) R.back = hurry;
          (wasOut ? runCeremony('leave') : Promise.resolve()).then(function () {
            if (over) return;
            dropOverlay();
            return runCeremony('return').then(function () {
              if (over) return;
              over = true; if (R) R.back = null;
              atHome().then(resolve);
            });
          });
        });
      case 'hang_poster':
        if (!trip.poster) return Promise.resolve();
        if (revealing && revealing.homing) { renderWall(); return Promise.resolve(); }   /* 데려온 귀가: 문 앞에서 벽에 바로 (보드까지 걸어가 붙이지 않는다) */
        octState('hang');
        return sleep(fast ? 0 : 520 * speed()).then(function () { renderWall(); });
      case 'wrap_up':
        /* 반응이 있을 때만 말풍선 (없으면 말 없이 담담하게 — 반응을 지어내지 않는다). 모델·사람이 쓴 줄은 40자 + '…' 까지 (전체는 로그·일기에) */
        var rx = reactionOf(trip, ev), say1 = rx.line ? (rx.given ? clip(rx.line, REACT_RAW_SHOW) : rx.line) : rx.word;
        if (say1) bubble(say1, 3000, REACT_EXPR[rx.r] || 'say', { raw: rx.line ? (rx.given ? rawBy(trip) : null) : (rx.raw ? (rawBy(trip) || 'model') : null) });   /* 반응은 단어만 (예전 이모지 머리는 뺐다) · 그들이 쓴 줄 · 네 가지 밖의 반응은 그대로 (reactionSayHTML 과 같은 규칙) */
        octState(rx.r === '폴짝' || rx.r === '우쭐' ? 'happy' : 'idle');
        if (trip.status !== 'done') commitTrip(trip);
        var cer = startCeremony();                      /* 로그가 끝났으니 연출 시작 — 문어가 담요로 가는 동안 같이 */
        if (fast) return cer;
        return Promise.all([cer, sleep(900 * speed()).then(function () { if (skipFlag) return; return walkTo('blanket'); })]);   /* 그사이 건너뛰면 걷지 않는다 (finalPose 가 담요에 놓는다) */
      case 'stay_home':
        commitTrip(trip);
        if (revealing && revealing.trip === trip) revealing.home = true;   /* 집에 있는 날: 큰 버튼은 기다림만 없앤다 (자리로 걷던 걸음은 마저 — skip) */
        var anchor = ev.anchor || (trip.receipt && trip.receipt.activity && trip.receipt.activity.anchor) || 'window';
        if (!ANCHORS[anchor]) anchor = 'window';
        if (anchor === 'board' && !S.room.posterOrder.length) anchor = 'crate';
        if (anchor === 'crate' && S.room.lantern < 2) anchor = 'window';
        var go = fast ? (function () { octPlace(anchor); return Promise.resolve(); })() : walkTo(anchor);
        return go.then(function () { octState('stay'); if (trip.poster) return sleep(fast ? 0 : 300 * speed()).then(renderWall); });
      case 'empty_turn':
        commitTrip(trip);
        return Promise.resolve();
      default:
        return Promise.resolve();
    }
  }
  /* 차례가 끝난 자세: 빈 차례는 그대로. 아니면 담요로 — 깨어 있는 틈(AWAKE_MS, 졸림이 아니면)을 주고 그 뒤 눕는다 (lieDown). 틈이 없으면 담요에 닿는 대로 잔다.
     trip 이 기록이 아니면(복구 resumeRunning 의 { kind }) 마지막 쉬는 차례로 */
  function finalPose(trip) {
    ensureAttic(); dropOverlay();
    if (trip.kind === 'empty') { octState(S.octopus.state === 'sleep' ? 'sleep' : 'idle'); return; }
    var t = trip.events ? trip : (lastRestTrip() || trip);
    S.octopus.state = 'sleep'; save();   /* 쉬는 중 (깨어 있는 틈이든 낮잠이든) — 지금 새로고침해도 담요에서 */
    stopWander();
    if (!t.id) { sleepNow(t, true); return; }
    if (!wantsAwake(t)) { armRest(t, 0); return; }   /* 틈이 없다 (테스트 훅 0): 담요에 닿는 대로 잔다 (위층이면 sleepNow 가 다락으로) */
    armRest(t, awakeFor(t));   /* 졸림이면 짧게 */
    var my = t.id;
    walkTo('blanket').then(function () { if (rest && rest.id === my && oct.state === 'walk') octState('idle'); });   /* 이미 담요면 바로 (걸어온 귀가) · 데려왔으면 문에서 걸어간다. 11-13 주인 (OW-3 b): 위층에 따라 와 있으면 장면은 걷지 않는다 (moveTo) — 그 자리에서 틈 · 내려가면 담요 (on.octUp) */
  }
  /* 상태 반영: 등불 · 방문 · 취향 · 기념품 · 함께한 날 (한 번만) */
  function commitTrip(trip) {
    if (trip.status === 'done') return;
    var prevL = applyTrip(trip);
    lastNewPoster = trip.poster ? trip.id : null;
    save(); mine.push({ trip: trip, at: Date.now() });
    renderSouvenirs();
    var live = revealing && revealing.trip === trip;   /* 데려와도 · 모션 줄이기여도 귀가 연출은 한다 (11-08: 박자만 짧게 · 없이 — startCeremony) */
    if (live) revealing.deferred = { prevL: prevL };   /* 상태는 지금 저장, 보이는 건 로그가 끝난 뒤 순서대로 (startCeremony) */
    else { renderStatus(S.room.lantern > prevL); renderScene(); renderAlbum(); }   /* 공개 없이 반영 (새로고침 복구 · 다른 탭) */
    /* 포스터는 hang_poster 연출 뒤에 벽에 붙는다 (공개 중이 아니면 바로) */
    var pendingHang = live && trip.poster && (trip.events || []).some(function (e) { return e.type === 'hang_poster'; });
    if (!pendingHang) renderWall();
  }
  /* commitTrip 의 상태 부분만 (그리기·저장 없음) → 반영 전 등불 칸. 다른 탭 저장을 받아들일 때 그쪽에 빠진 이 탭의 여행을 다시 얹는 데도 쓴다 */
  function applyTrip(trip) {
    var o = S.octopus, prevL = S.room.lantern;
    var decay = typeof trip.affinityDecay === 'number' ? trip.affinityDecay : 0.9;
    /* §17.3 귀가 요약: 반영 전에 '처음 온 방' 수를 센다 (방 = 세계의 방, 밖의 문 제외) */
    var newRooms = Object.keys(trip.visitsDelta || {}).filter(function (k) { return k !== 'door_out' && nodeOf(k) && !(o.visits[k] > 0); }).length;
    Object.keys(o.affinity).forEach(function (k) { o.affinity[k] = Math.round(o.affinity[k] * decay * 1000) / 1000; if (o.affinity[k] < 0.01) delete o.affinity[k]; });
    Object.keys(trip.affinityDelta || {}).forEach(function (k) { o.affinity[k] = (o.affinity[k] || 0) + trip.affinityDelta[k]; });
    Object.keys(trip.visitsDelta || {}).forEach(function (k) { o.visits[k] = (o.visits[k] || 0) + trip.visitsDelta[k]; });
    o.invites++;
    if (trip.kind === 'out') o.trips++;
    /* 등불: 초대한 날마다 1칸 — 그날 처음 끝낸 차례(외출·집·빈 차례 모두)만. 포스터·기념품·메모·방문은 차례마다 그대로 쌓인다. 이미 켜진 칸은 줄이지 않는다 */
    if (o.days.indexOf(trip.date) < 0) { o.days.push(trip.date); S.room.lantern = Math.min(8, S.room.lantern + 1); }
    /* 쪽지 뒷면의 '등불 +1' 은 두뇌가 계획 때(lanternLeft) 쓴 말 — 두 탭이 같은 날 첫 차례를 함께 계획해 다른 탭이 먼저 켰으면 여기선 안 켜졌으니 저장 기록에서도 지운다 */
    if (!(S.room.lantern > prevL) && trip.poster && typeof trip.poster.back === 'string') trip.poster.back = trip.poster.back.replace(/\. 등불 \+1$/, '');
    /* 기념품: 이미 있는 것이면 선반에 하나 더 놓지 않는다 (두 탭이 같은 걸 계획한 경우 등). 일기에는 가져온 그대로 남는다 */
    var sv = trip.receipt && trip.receipt.souvenir, svNew = !!sv && ownedSouvenirs().indexOf(sv) < 0;
    if (svNew) S.room.souvenirs.push({ id: sv, tripId: trip.id, at: Date.now() });
    if (trip.poster && trip.posterHung !== false && S.room.posterOrder.indexOf(trip.id) < 0) S.room.posterOrder.push(trip.id);   /* 고른 이가 붙이지 않은 포스터는 벽에 올리지 않는다 (게임이 대신 붙이지 않는다) */
    if (trip.kind === 'home' && trip.receipt && trip.receipt.activity && trip.receipt.activity.id === 'rearrange' && S.room.posterOrder.length > 1) {
      var po = S.room.posterOrder, a = po.length - 1, b2 = po.length - 2; var tmp = po[a]; po[a] = po[b2]; po[b2] = tmp;
    }
    if (trip.kind !== 'empty') {
      var note = trip.poster && trip.poster.type === 'note';
      trip.summary = { lantern: S.room.lantern > prevL ? 1 : 0, rooms: trip.kind === 'out' ? newRooms : 0, souvenir: svNew ? 1 : 0, poster: trip.poster && !note ? 1 : 0, note: note ? 1 : 0 };
    }
    /* §17.1 방마다 최근 메모 1개 (그때 남긴 것 그대로) */
    if (trip.memo && trip.memo.notes) Object.keys(trip.memo.notes).forEach(function (k) { var tx = trip.memo.notes[k]; if (typeof tx === 'string' && tx) S.notes[k] = { text: tx, tripId: trip.id, date: trip.date }; });
    applyNotes(trip);
    trip.status = 'done'; trip.endedAt = Date.now();
    if (trip.kind !== 'empty') S.octopus.state = 'sleep';   /* 화면은 귀가 연출이 끝나야 잠들지만(finalPose), 지금 새로고침해도 담요에서 자고 있게 (낮잠은 20분쯤 · napOver) */
    capTrips();
    return prevL;
  }
  /* 호기심 메모 반영 (계약 R3 · CURIOSITY_NOTES): 이 차례가 남긴 메모(trip.noteOut — 데모 두뇌는 by 'demo-rules', 불러온 모델 이벤트는 wrap_up.note 그대로)를 새 메모로,
     모델이 내려놓은 메모(trip.setDown — 모델 차례만, 있는 id 만)는 set_down 으로. 글자는 받은 그대로 저장한다 (줄여 보이는 건 화면 몫). 같은 차례를 두 번 반영해도 한 번만 (adoptRemote 의 carry) */
  function cleanAbout(a) { return isObj(a) && (a.kind === 'node' || a.kind === 'object') && typeof a.id === 'string' && /^[\w-]{1,64}$/.test(a.id) ? { kind: a.kind, id: a.id } : null; }
  function noteModel(trip) {
    var no = trip.noteOut, wu = (trip.events || []).filter(function (e) { return e.type === 'wrap_up'; })[0];
    var m = (isObj(no) && no.model) || (wu && wu.model);
    return typeof m === 'string' && m.trim() ? m.trim().slice(0, 80) : null;
  }
  function applyNotes(trip) {
    var no = trip.noteOut, at = new Date().toISOString();
    var text = typeof no === 'string' ? no : (isObj(no) && typeof no.text === 'string' ? no.text : '');
    if (text.trim() && !S.curiosityNotes.some(function (x) { return x.session === trip.id; })) {
      var by = trip.by === 'mcp' ? 'model' : trip.by === 'human' ? 'human' : 'demo-rules';
      var base = 'cn_' + String(trip.id).replace(/^trip_/, ''), id = base, k = 2;
      while (S.curiosityNotes.some(function (x) { return x.id === id; })) id = base + '_' + k++;
      var n = { id: id, text: text, about: cleanAbout(isObj(no) ? no.about : null), by: by, session: trip.id, at: at, status: 'active', setDownAt: null };
      var model = by === 'model' ? noteModel(trip) : null; if (model) n.model = model;   /* 모델 이름은 불러온 기록이 알려 줄 때만 */
      S.curiosityNotes.push(n);
    }
    if (trip.by === 'mcp' && Array.isArray(trip.setDown)) trip.setDown.forEach(function (id) {
      if (typeof id !== 'string') return;
      S.curiosityNotes.forEach(function (x) { if (x.id === id && x.status === 'active' && x.session !== trip.id) { x.status = 'set_down'; x.setDownAt = at; } });
    });
  }
  /* 다른 탭이 저장한 기록을 받아들인다 (R5). 이 탭에서 다녀오는 중인 여행(flying)이 있으면 그 객체를 그대로 끼워 넣어 이 탭의 공개·반영이 이어지게 하고,
     그쪽 기록에 이 탭이 반영한 여행(flying · mine)이 빠져 있으면(그 탭이 이걸 받기 전 사본으로 저장) 여기서 다시 얹어 저장한다 → 어느 탭이 늦게 저장해도 다른 탭의 여행·등불이 지워지지 않는다.
     다른 문어의 기록(born 이 다름 = 다른 탭에서 초기화·불러오기)이면 mine 은 버린다 (지운 기록을 되살리지 않게) */
  function adoptRemote(raw, obj) {
    var R; try { R = normalize(obj || JSON.parse(raw)); } catch (err) { return false; }   /* obj = storage 이벤트가 이미 읽은 것 (11-13 C6) */
    var T = busy ? flying : null, same = (S.octopus.born || 0) === (R.octopus.born || 0), now = Date.now();
    /* 미용실 물음 (docs/SALON.md §7.5): 이 탭이 쓴 물음(mineAsks, 60 s)이 받은 기록에 빠졌으면 colors 줄과 함께 다시 얹고, 같은 날 물음이 둘이면 이른 것이 정한다 (늦은 것은 dropped).
       다른 문어(born 이 다름)면 SALON.merge 가 mine 을 버린다 */
    var sm = SAL ? SAL.merge(S, R, mineAsks, now) : null;
    if (sm) { R = sm.state; mineAsks = sm.mine; }
    S = R; lastSaved = raw;
    var redo = !!T && carry(T);
    mine = !same ? [] : mine.filter(function (m) {
      if (now - m.at > MINE_MS) return false;
      if (T && m.trip.id === T.id) return true;
      var theirs = tripById(m.trip.id);
      if (!(theirs && theirs.status === 'done') && carry(m.trip)) redo = true;   /* 그쪽도 반영했으면 그쪽 것 그대로 */
      return true;
    });
    if (redo || (sm && sm.changed)) save();
    applyLook({ still: true });   /* 다른 탭이 바꾼 몸 색을 따라간다 (산책 중에도 — 다시 그리기는 끝난 뒤지만 몸색은 바로. 미용실 연출 중이면 끝난 뒤) */
    return true;
  }
  /* 다른 탭의 기록을 받아 다시 그린다 (storage 이벤트) → 받았으면 true */
  function takeRemote(raw, obj) {
    if (!adoptRemote(raw, obj)) return false;
    weekTell();   /* 11-11 (검증 W1): 다른 탭이 주를 넘기며 지난주 선물을 넣었고 아직 알리지 못했으면 (그 탭이 가려져 있다) 보이는 이 탭이 알린다 */
    if (busy) { remoteDirty = true; applyGarden(); return true; }   /* 공개 중엔 로그·등불을 다시 그리지 않는다 → 끝날 때 한 번 (setBusy). 11-13: 바깥 밭 (단추 이름 · 심은 것) 만은 지금 — 산책 중에만 떠 있고, 이름만 바꾸면 거둔 꽃이 그대로 그려져 이름과 그림이 엇갈렸다 */
    /* 이 탭이 연출 중인 물음이 방금 밀렸다 (두 탭이 서로 보기 전에 물었고 그쪽이 일렀다 — dropped): 남은 연출을 여기서 접는다 (검증 11-10 E10).
       예전엔 밀린 색으로 걷기 · 대야를 끝까지 한 뒤 몸이 그쪽 색으로 툭 바뀌었다. 감기는 행을 붙이지 않고 (stageRows) 장면 몸색은 기록 (그쪽 답) 으로 맞춘다 */
    if (salonRun) { var mineNow = askById(salonRun.ask.id); if (mineNow && mineNow.status === 'dropped') salonFinish(); }
    renderAll(); applyMotion(); applyFont(); syncSceneLook(); syncRest();   /* 다른 탭이 차례를 끝냈으면 이 탭 문어도 (깨어 있는 틈 · 낮잠) */
    var ss = $('salon-sheet'); if (ss && ss.open && !salonRun) renderSalonSheet();   /* 미용실 시트가 열려 있으면 병을 다시 (다른 탭이 몸 색을 바꿨거나 '그대로' 쉼이 생김) */
    return true;
  }
  /* 저장소를 지금 다시 읽어 다른 탭의 기록을 합친다 (storage 이벤트가 아직 안 왔을 수 있을 때 — 미용실 [물어보기] 순간: 두 탭 · 자정 넘김, docs/SALON.md §7.5).
     이 탭이 마지막으로 쓴 것과 같으면 할 일 없음 → 받았으면 true. 저장소가 없는 브라우저(메모리)는 다른 탭이 없다 */
  function syncFromStore() {
    if (!storeOK) return false;
    var raw = store.get(KEY);
    return !!raw && raw !== lastSaved && takeRemote(raw);
  }
  /* 이 탭의 여행 P 를 방금 받은 기록(S)에 끼운다 → 그쪽에 반영이 없어 여기서 다시 얹었으면 true */
  function carry(P) {
    var at = -1;
    S.trips.forEach(function (t, i) { if (t.id === P.id) at = i; });
    var theirsDone = at >= 0 && S.trips[at].status === 'done';
    if (theirsDone && P.status !== 'done') Object.assign(P, S.trips[at]);   /* 새로 연 탭이 이 여행을 먼저 데려왔다(즉시 귀가) → 그쪽 기록·반영을 따른다 (두 번 반영하지 않게) */
    var redo = P.status === 'done' && !theirsDone;
    if (at >= 0) S.trips[at] = P; else S.trips.push(P);
    if (redo) { var end = P.endedAt; P.status = 'running'; applyTrip(P); if (end) P.endedAt = end; }
    return redo;
  }
  /* 최근 200개를 뺀 여행의 events 를 비운다 (영수증·포스터·요약은 남김). 방금 반영한 여행은 늘 최근 200 안이라 그대로 */
  function capTrips() {
    for (var i = 0; i < S.trips.length - 200; i++) { if (S.trips[i].events && S.trips[i].events.length) S.trips[i].events = []; }
  }
  /* 열었을 때 running 이 남아 있으면 즉시 귀가 (§3-6) → 실제로 한 일의 종류 ('out' | 'home' | 'empty') 또는 false.
     복구 한 줄도 그대로: 나갔다 왔으면 '다녀왔어', 집에만 있었으면 '집에 있었어', 빈 차례뿐이면 말하지 않는다 */
  function resumeRunning() {
    var run = S.trips.filter(function (t) { return t.status === 'running'; });
    if (!run.length) return Promise.resolve(false);
    if (scene && typeof scene.setPlace === 'function') scene.setPlace('attic', { instant: true });   /* 나가 있던 중이었어도 다락에서 연다 (바깥에 멈춰 두지 않는다) */
    var chain = Promise.resolve();
    run.forEach(function (trip) {
      chain = chain.then(function () {
        if (trip.events && trip.events.length && trip.kind) return;
        if (!B) return;
        return B.plan(Object.assign(brainInput(trip), { online: false })).then(function (p) { mergePlan(trip, p); }).catch(function () { trip.kind = 'empty'; trip.events = [{ type: 'empty_turn', t: 0 }]; });
      }).then(function () { commitTrip(trip); });
    });
    return chain.then(function () {
      renderLog();
      var kind = run.some(function (t) { return t.kind === 'out'; }) ? 'out' : run.some(function (t) { return t.kind === 'home'; }) ? 'home' : 'empty';
      if (kind === 'out') appendLogRow(ensureTodaySection(), logRow('귀가', '네가 없는 동안 다녀왔어', 'c-teal', true, 'calm'));
      else if (kind === 'home') appendLogRow(ensureTodaySection(), logRow('집', '네가 없는 동안 집에 있었어', 'c-amber', true, 'calm'));
      return kind;
    });
  }

  /* ───────────────────────── log (§7.4) · 초상 대화창 (§15.2) ───────────────────────── */
  /* 초상 캐시: 표정별 64×64 캔버스 하나 (scene.portrait 는 3D 에서 ≈5–10 ms/장, 첫 장 ≈240 ms). 행마다 복사해 붙인다.
     행이 만들어질 때 캔버스만 만들고(지연), 부팅 두 프레임 뒤부터 rAF 한 번에 모아 그린다. setColor/setPalette 는 캐시를 비우고 보이는 초상을 다시 그린다 */
  var PORT = { cache: {}, queue: [], ready: false, raf: 0, refresh: null, bg: 'navy' };
  function portraitFor(expr) {   /* → 캐시된 64×64 캔버스 (복사하지 말고 drawImage 원본으로만 쓸 것) */
    expr = (scene && scene.EXPRESSIONS && scene.EXPRESSIONS.indexOf(expr) >= 0) ? expr : 'idle';
    var cv = PORT.cache[expr];
    if (!cv) { cv = PORT.cache[expr] = scene.portrait(expr, { bg: PORT.bg }); }
    return cv;
  }
  function drawPortrait(cv) {
    try { var src = portraitFor(cv.dataset.expr), cx = cv.getContext('2d'); cx.clearRect(0, 0, 64, 64); cx.drawImage(src, 0, 0); cv.dataset.drawn = '1'; }
    catch (e) { console.warn('[app] portrait', e); }
  }
  function flushPortraits() {
    PORT.raf = 0;
    var q = PORT.queue; PORT.queue = [];
    q.forEach(function (cv) { if (document.body.contains(cv)) drawPortrait(cv); });
  }
  function schedulePortraits() { if (!PORT.ready || PORT.raf) return; PORT.raf = requestAnimationFrame(flushPortraits); }
  function portraitCanvas(expr) {
    var cv = h('canvas', { class: 'lport-cv', width: '64', height: '64', 'aria-hidden': 'true', 'data-expr': expr });
    PORT.queue.push(cv); schedulePortraits();
    return cv;
  }
  function refreshPortraits() {   /* 몸색·팔레트가 바뀌면 (슬라이더는 연속 입력이라 150 ms 모아서) */
    clearTimeout(PORT.refresh);
    PORT.refresh = setTimeout(function () {
      PORT.cache = {};
      document.querySelectorAll('#log canvas.lport-cv, #album-diary canvas.lport-cv').forEach(function (cv) { PORT.queue.push(cv); });
      schedulePortraits();
    }, 150);
  }
  /* 대화창 행이 나타나면 장면 얼굴도 같은 표정 → 4 s 뒤 상태의 기본 표정으로 (자는 중이면 그대로) */
  var exprTimer = null;
  function expressRow(expr) {
    if (!scene || !expr) return;
    scene.setExpression(expr);
    clearTimeout(exprTimer);
    exprTimer = setTimeout(function () { if (oct.state !== 'sleep') scene.setExpression(salonRun && salonRun.face ? salonRun.face : STATE_EXPR[oct.state] || 'idle'); }, 4000);   /* 미용실 연출 중엔 고른 이의 얼굴로 (연출이 끝나면 relaxFace) */
  }
  /* expr 가 있으면 대화창 행: 왼쪽 초상(64→96 px, 남색 바탕 이중 틀) + 오른쪽 라벨·말. 없으면 도구 라벨 행 (시스템 행) */
  function logRow(label, text, cls, animate, expr) {
    var row = h('div', { class: 'lrow' + (cls ? ' ' + cls : '') + (VOICE_LABELS.indexOf(label) >= 0 ? ' voice' : '') + (expr ? ' dialog' : '') + (animate ? ' in' : '') });
    var tx = h('span', { class: 'ltext' });
    if (typeof text === 'string') tx.textContent = text; else tx.appendChild(text);
    if (expr) {
      row.dataset.expr = expr;
      row.appendChild(h('span', { class: 'lport', 'aria-hidden': 'true' }, [portraitCanvas(expr)]));
      row.appendChild(h('span', { class: 'lbody' }, [h('span', { class: 'ltool', text: label }), tx]));
    } else {
      row.appendChild(h('span', { class: 'ltool', text: label }));
      row.appendChild(tx);
    }
    return row;
  }
  /* 행 추가 + 250ms 등장. 한꺼번에 쏟아질 때(건너뛰기·귀가 복구)만 60ms 스태거, 최대 6행 (GF R11). 대화창 행이면 장면 표정도 맞춘다 */
  var burst = { at: 0, n: 0 };
  function appendLogRow(parent, row) {
    var now = Date.now();
    burst.n = (now - burst.at < 400) ? Math.min(burst.n + 1, 5) : 0; burst.at = now;
    row.classList.add('in'); row.style.setProperty('--i', String(burst.n));
    var empty = $('log') && $('log').querySelector('.lempty'); if (empty) empty.remove();   /* 첫 행이 들어오면 '아직 아무 데도…' 는 뺀다 */
    parent.appendChild(row); scrollLog(); rowNote(row);
    if (row.dataset.expr) expressRow(row.dataset.expr);
  }
  function secs(ms) { return ms ? Math.round(ms / 1000) + '초' : ''; }
  /* 집에 있던 날 '등불 +1' 은 칸이 실제로 켜졌을 때만: 반영된 여행은 저장된 요약 그대로, 반영 전(공개 중)이면 끝나면 켜지는지(lanternLeft — 그날 첫 차례 · 8칸 전).
     요약 없는 옛 기록(초대마다 1칸이던 때 반영)은 지금 8칸이 아니면 그때도 켜졌다 (칸은 줄지 않는다), 8칸이면 모르니 말하지 않는다 */
  function homeLit(trip) {
    if (trip && trip.summary) return trip.summary.lantern > 0;
    if (trip && trip.status !== 'done') return lanternLeft(trip.date);
    return S.room.lantern < 8;
  }
  /* 출발 행 (힌트 없을 때): 집 목소리 '뚜루가 산책 나갔어' (조사를 붙여 문어를 가리킨다 — 플레이어를 부르는 말로 읽히지 않게) */
  function departLine() { var n = S.octopus.name; return typeof STR.departLine === 'function' ? STR.departLine(n) : (n ? n + ' ' : '') + '산책 나갔어'; }
  function stopName(ev) { var tg = ev.target || {}; return tg.title || (tg.url ? tg.url.replace(/^https?:\/\//, '').split('/')[0] : '어딘가'); }
  function stopIcon(ev) { var tg = ev.target || {}, n = tg.id && nodeOf(tg.id); return cornerIcon(n ? n.corner : 'wild', tg.kind); }
  /* 읽기 상태 칸: 픽셀 그림(icon.log.<상태>) + 단어 (예전 ✅ 📚 🧪 ❌ ◌ 는 뺐다 — 단어가 뜻을 말한다) */
  function statusChip(st, tail) {
    var sp = h('span', { class: 'st' }), im = ico('log/' + (STATUS_LABEL[st] ? st : 'failed'), 'ua-status');
    if (im) { sp.classList.add('ua-st'); sp.appendChild(im); }
    sp.appendChild(document.createTextNode((STATUS_LABEL[st] || '못 읽음') + (tail || '')));
    return sp;
  }
  /* 가져온 것 한 줄: 기념품 픽셀 그림 + 이름 */
  function souvenirSub(id) {
    var sv = W && W.souvenirs && W.souvenirs[id], sp = h('span', { class: 'sub' }, ['가져온 것: ']), im = sv ? ico('souvenir/' + id, 'ua-souv') : null;
    if (im) { sp.classList.add('ua-ico-line'); sp.appendChild(h('span', { class: 'ua-iw' }, [im, sv.name])); }   /* 그림 + 이름 한 덩이 */
    else sp.appendChild(document.createTextNode(sv ? sv.name : id));
    return sp;
  }
  /* 지난 메모를 남긴 이: 그 방 메모를 남긴 여행이 모델·사람 차례였으면 그들의 글 */
  function noteAuthor(nodeId, text) {
    var by = null;
    S.trips.forEach(function (t) { if (t.memo && t.memo.notes && t.memo.notes[nodeId] === text) by = rawBy(t); });
    return by;
  }
  function eventRow(trip, ev) {
    var frag = document.createDocumentFragment(), cls = '', expr = null, given = rawBy(trip);
    switch (ev.type) {
      case 'depart':
        cls = 'c-amber';
        if (ev.hint) { frag.appendChild(document.createTextNode('힌트: ')); frag.appendChild(rawSpan(ev.hint, given || 'player')); }   /* 힌트는 건넨 사람의 글 그대로 */
        else frag.appendChild(document.createTextNode(departLine()));   /* 빈 힌트: 집 목소리 사실 한 줄 — 플레이어가 한 말도, 누가 골랐다는 말도 아니다 (고른 이는 '데모' 꼬리표·일기가 말한다) */
        if (trip.hint && trip.hint.note) frag.appendChild(h('span', { class: 'sub', text: trip.hint.note }));
        break;
      case 'peek': {
        var st = ev.status || 'failed', tg = ev.target || {};
        cls = st === 'read' ? 'c-teal' : (st === 'failed' || st === 'simulated') ? 'c-mute' : '';   /* 실패·모의: 같은 모션, 자기 그림, 빨강 없음 */
        var ci = ico(stopIcon(ev), 'ua-mem'), nm = rawSpan(stopName(ev), stopRawBy(trip, tg.id, tg.kind));   /* 그곳의 코너 그림 (예전 방 이모지 자리) + 이름 한 덩이 */
        frag.appendChild(ci ? h('span', { class: 'ua-iwb' }, [ci, nm]) : nm); frag.appendChild(document.createTextNode(' '));
        frag.appendChild(statusChip(st, ev.ms ? ' · ' + secs(ev.ms) : ''));
        if (ev.aside) frag.appendChild(rawSpan(ev.aside, given, 'sub aside'));   /* 모델·사람이 그 자리에서 남긴 한마디는 그대로 · 데모 규칙의 재방문 한마디는 우리 글 */
        if (ev.first) frag.appendChild(h('span', { class: 'sub first', text: '처음 온 곳이야' }));
        if (ev.bridge) frag.appendChild(rawSpan(ev.bridge, given, 'sub'));   /* 모델·사람 재생의 다리 글은 그들이 이벤트에 쓴 것 */
        if (ev.note && ev.noteBy) frag.appendChild(h('span', { class: 'sub' }, [rawSpan(ev.note, ev.noteBy === 'model' ? 'model' : 'human'), ' · ' + (ev.noteBy === 'model' ? '모델' : '사람') + '이 쓴 메모']));   /* 그들의 말은 따옴표 없이 (위키 인용처럼 보이지 않게) */
        else if (ev.note && st !== 'read') frag.appendChild(h('span', { class: 'sub', text: ev.note }));
        else if (ev.note && st === 'read') frag.appendChild(h('span', { class: 'sub' }, ['“', rawSpan(ev.note, 'wiki'), '”']));   /* 위키백과 요약 그대로 */
        recallSubs(trip, ev).forEach(function (t) { frag.appendChild(h('span', { class: 'sub recall' }, withRaw(t.text, t.raw, t.by))); });
        break;
      }
      case 'return': {
        cls = 'c-teal'; expr = 'calm';
        var rr = (STR.returnReasons && STR.returnReasons[ev.reason]) || '';
        frag.appendChild(document.createTextNode('돌아왔어' + (rr ? '. ' + rr : '')));
        if (trip.receipt && trip.receipt.souvenir) frag.appendChild(souvenirSub(trip.receipt.souvenir));
        break;
      }
      case 'remember': {
        cls = 'c-amber'; expr = 'curious';
        var rl = ev.line || (trip.poster && trip.poster.line) || '', rp = remPart(trip, ev.stopIdx);
        if (given && ev.line) frag.appendChild(rawSpan(rl, given));   /* 그들이 쓴 줄은 통째로 */
        else appendAll(frag, partRaw(rl, rp.part, rp.by));            /* 두뇌가 지은 줄: 그 속 정류장 이름(위키 제목 · 모델이 준 제목)만 */
        break;
      }
      case 'hang_poster': if (trip.poster) { frag.appendChild(document.createTextNode('벽에 붙였어 · ')); frag.appendChild(rawSpan(trip.poster.title || '', posterTitleRaw(trip))); } break;
      case 'wrap_up': {
        /* 반응도 줄도 없으면 마무리 행을 만들지 않는다 (코드가 반응을 지어내지 않는다). 모델·사람이 쓴 줄은 그대로. 반응은 단어만 (예전 이모지 머리는 뺐다) */
        var rx = reactionOf(trip, ev);
        if (!rx.word && !rx.line) return null;
        expr = REACT_EXPR[rx.r] || 'calm';
        if (rx.word) frag.appendChild(rawSpan(rx.word, rx.raw ? (given || 'model') : null));
        if (rx.line) { if (rx.word) frag.appendChild(document.createTextNode(' · ')); frag.appendChild(rawSpan(rx.line, rx.given ? given : null)); }
        break;
      }
      case 'stay_home':
        cls = 'c-amber'; expr = ((ev.activity === 'nap') || (trip.receipt && trip.receipt.activity && trip.receipt.activity.id === 'nap')) ? 'sleep' : 'calm';
        frag.appendChild(ev.line ? rawSpan(ev.line, given) : document.createTextNode(givenTrip(trip) ? '…' : '오늘은 집에 있을래'));   /* 모델·사람이 줄 없이 집을 골랐으면 말 없이 (코드가 대신 말하지 않는다) */
        if (trip.receipt && trip.receipt.activity && trip.receipt.activity.detail) frag.appendChild(rawSpan(trip.receipt.activity.detail.split('\n')[0], given, 'sub'));   /* 모델·사람 차례의 뒷면 글은 그들이 쓴 것 (두뇌가 그것만 둔다) */
        frag.appendChild(h('span', { class: 'sub', text: '오늘은 집' + (homeLit(trip) ? '. 등불 +1' : '') }));
        break;
      case 'empty_turn': expr = 'sleep'; frag.appendChild(document.createTextNode('…')); break;
      default: return null;
    }
    var row = logRow(LOG_LABEL[ev.type] || ev.type, frag, cls, false, expr);
    if (window.UIART) UIART.onRow(row, ev, trip);   /* UI 아트: 도구 라벨 아이콘 · 대화창 틀 (js/ui-art.js) */
    return row;
  }
  /* 포스터 제목 = 기억으로 고른 곳의 이름 → 그곳이 세계의 방이 아니면(위키 문서 · 모델이 준 곳) 남의 글 */
  function posterTitleRaw(trip) {
    if (trip && trip.by === 'legacy') return 'player';   /* 옛 기록(v1)에서 옮긴 제목: 플레이어의 옛 저장 그대로 (그때 무엇이 지었는지 모른다 — 고치지 않는다) */
    var r = trip && trip.receipt, s = r && r.stops && r.stops[r.rememberedIdx];
    return s ? stopRawBy(trip, s.nodeId, null) : rawBy(trip);
  }
  /* 기억한 정류장 (remember 이벤트의 stopIdx · 없으면 영수증의 rememberedIdx) → { part: 이름, by: 남의 글이면 누구 } */
  function remPart(trip, idx) {
    var r = trip && trip.receipt, i = typeof idx === 'number' && idx >= 0 ? idx : r ? r.rememberedIdx : -1, st = r && r.stops && i >= 0 ? r.stops[i] : null;
    return st ? { part: st.name || st.title || '', by: stopRawBy(trip, st.nodeId, null) } : { part: '', by: null };
  }
  /* 포스터 한 줄을 모델·사람이 직접 썼나: 그 줄을 실은 이벤트(remember · stay_home)에 그들이 준 줄이 있고 포스터 줄이 그것일 때만.
     안 썼으면 두뇌가 지은 줄(데모 문구 · 활동 목록의 말)이라 우리 글 — 그 안의 정류장 이름만 남의 글 */
  function lineBy(trip) {
    var by = rawBy(trip), p = trip && trip.poster; if (!by || !p) return null;
    return (trip.events || []).some(function (e) { return (e.type === 'remember' || e.type === 'stay_home') && typeof e.line === 'string' && e.line === p.line; }) ? by : null;
  }
  /* 재방문 기웃: "지난번 메모: '…'" · "지난번엔 비가 왔는데" — trip.recall(계획 때 고정)에서만. 없으면 말하지 않는다. → [{ text, raw(남의 글 부분), by }] */
  function recallSubs(trip, ev) {
    var tg = ev.target || {}, rc = trip && trip.recall && tg.id && trip.recall[tg.id];
    if (!rc) return [];
    var out = [];
    if (rc.note && rc.note !== ev.note) out.push({ text: typeof MEMO_STR.lastNote === 'function' ? MEMO_STR.lastNote(rc.note) : "지난번 메모: '" + rc.note + "'", raw: rc.note, by: noteAuthor(tg.id, rc.note) });
    if (rc.weather) {
      var same = trip.weather && trip.weather === rc.weather, tbl = same ? MEMO_STR.sameWeather : MEMO_STR.lastWeather;
      var w = tbl && tbl[rc.weather];
      if (w) out.push({ text: w, raw: null, by: null });
    }
    return out;
  }
  /* §17.3 귀가 요약 한 줄: 해당 없는 항목은 생략. 저장된 trip.summary 에서만 (옛 기록엔 없음) */
  function summaryText(trip) {
    var sm = trip && trip.summary; if (!sm) return '';
    var P = MEMO_STR.summaryParts || {}, parts = [];
    function f(fn, n, alt) { return typeof fn === 'function' ? fn(n) : alt; }
    if (sm.lantern) parts.push(P.lantern || '등불 +1');
    if (sm.rooms) parts.push(f(P.rooms, sm.rooms, '새 방 ' + sm.rooms + '곳'));
    if (sm.souvenir) parts.push(f(P.souvenir, sm.souvenir, '기념품 ' + sm.souvenir));
    if (sm.poster) parts.push(f(P.poster, sm.poster, '포스터 ' + sm.poster));
    if (sm.note) parts.push(f(P.note, sm.note, '쪽지 ' + sm.note));
    if (!parts.length) return '';
    return [MEMO_STR.summaryHead || '오늘 바뀐 것'].concat(parts).join(' · ');
  }
  function summaryRow(trip) { var t = summaryText(trip); if (!t) return null; var r = logRow('요약', t, 'c-mute summary', false); return r; }
  function ensureTodaySection() {
    var log = $('log'), today = log.querySelector('[data-day="' + todayKey() + '"]');
    if (!today) { var e = log.querySelector('.lempty'); if (e) e.remove(); today = h('div', { class: 'lday', 'data-day': todayKey() }); log.appendChild(today); }
    return today;
  }
  /* 자동 스크롤은 읽는 사람이 40px 넘게 위로 올려 두지 않았을 때만 (GF R13) */
  /* 우리가 굴리는 스크롤: logFrom → logTarget. 그 사이를 지나는 스크롤 사건은 우리 것 (바쁜 탭에서 부드러운 스크롤이 길어져도 '손으로 올렸다'로 보지 않게).
     부드러운 스크롤이 도중에 멈췄으면(장면이 바빠서 · 레이아웃이 바뀌어서) 조금 뒤 제자리로 바로 놓는다 */
  /* 우리 스크롤로 보는 건 '아직 가는 중' 일 때만: 길(logFrom..logTo) 위에서 목표 쪽으로만 움직이는 사건. 목표에 닿으면(±2px) 끝 (logTarget = -1) —
     그 뒤 위로 조금(한 행보다 덜) 올린 것도 읽는 사람의 손이다 (예전엔 지난 길 안이라 우리 것으로 보고 다음 행에서 끌어내렸다). 거꾸로 가는 사건도 손 */
  var logStick = true, progScrollUntil = 0, logGap = 0, logTarget = -1, logFrom = 0, logTo = 0, logSettle = 0, logLastY = 0;
  function scrollLog() {
    var log = $('log'); if (!log || !logStick) return;
    var smooth = !reduced() && !(burst.n > 0 && Date.now() - burst.at < 400);   /* 한꺼번에 쏟아질 땐 바로 */
    if (window.UIART && UIART.syncLog) UIART.syncLog();   /* 목소리 행의 대화창 틀(높이가 바뀐다)을 재기 전에 지금 붙인다 (원래는 다음 프레임) */
    var y0 = log.scrollTop; log.style.paddingBottom = '';   /* 지난번 아래 빈칸을 거두면 스크롤이 줄어든 끝으로 붙을 수 있다 → 그 자리도 '우리 길' */
    logLastY = log.scrollTop; logFrom = Math.min(y0, logLastY);
    var top = logTarget = logSnapTop(log);
    logFrom = Math.min(logFrom, top); logTo = Math.max(y0, log.scrollTop, top);
    progScrollUntil = smooth ? 0 : Date.now() + 80;   /* 바로 놓는 스크롤만 잠깐 (부드러운 스크롤은 아래 '가는 중' 규칙으로 가린다) */
    if (log.scrollTo) log.scrollTo({ top: top, behavior: smooth ? 'smooth' : 'auto' }); else log.scrollTop = top;
    clearTimeout(logSettle);
    /* 부드러운 스크롤이 도중에 멈췄으면 제자리로. 그사이 손으로 굴렸으면(logTarget = -1 · logStick false) 건드리지 않는다 */
    logSettle = setTimeout(function () {
      if (logStick && logTarget >= 0 && Math.abs(log.scrollTop - logTarget) > 2) { progScrollUntil = Date.now() + 80; logLastY = log.scrollTop; log.scrollTop = logTarget; }
      else logTarget = -1;
    }, smooth ? 1000 : 120);
  }
  /* 맨 아래(가장 새 행)로 굴릴 자리 — 단, 로그 위 가장자리가 행(특히 초상 대화창)을 가운데서 자르지 않게 (7물결 점검 c: 나가 있는 동안 지난 산책의 대화창이 위에서 반쯤 잘려 보였다).
     위 가장자리에 걸린 행이 있으면: 가장 새 행이 그대로 다 보이는 한 그 행 머리로 올린다. 그래도 안 되면 아래 빈칸을 그만큼 늘려 다음 행 머리에 맞춘다 (잘린 상자 대신 아래 여백).
     행 자리는 offsetTop (#log 가 기준 — 등장 애니메이션의 transform 과 상관없이). logGap = 맨 아래에서 올린 만큼 (손으로 굴렸는지 볼 때 같이 뺀다) */
  function logSnapTop(log) {
    log.style.paddingBottom = '';
    var max = log.scrollHeight - log.clientHeight, view = log.clientHeight, GAP = 2;
    logGap = 0;
    if (max <= 0) return 0;
    var rows = log.querySelectorAll('.lrow'); if (!rows.length) return max;
    var newest = rows[rows.length - 1], nb = newest.offsetTop + newest.offsetHeight;
    for (var i = 0; i < rows.length; i++) {
      var t = rows[i].offsetTop, b = t + rows[i].offsetHeight;
      if (b <= max + 1) continue;          /* 창 위로 다 지나간 행 */
      if (t >= max - 1) return max;        /* 위 가장자리에 걸린 행 없음 */
      var up = Math.max(0, t - GAP);
      if (nb - up <= view || rows[i] === newest) { logGap = max - up; return up; }   /* 걸린 행 머리로 (가장 새 행이 화면보다 크면 그 머리부터) */
      var down = rows[i + 1].offsetTop - GAP, extra = Math.ceil(down - max);
      log.style.paddingBottom = (parseFloat(getComputedStyle(log).paddingBottom) || 0) + extra + 'px';
      return Math.min(down, log.scrollHeight - log.clientHeight);
    }
    return max;
  }
  function watchLogScroll() {
    var log = $('log'); if (!log) return;
    log.addEventListener('scroll', function () {
      var y = log.scrollTop;
      if (Date.now() < progScrollUntil) { if (logTarget >= 0 && Math.abs(y - logTarget) <= 2) logTarget = -1; logLastY = y; return; }   /* 우리가 바로 놓은 스크롤 */
      if (logTarget >= 0) {
        var dir = logTarget >= logLastY ? 1 : -1;
        if (y >= logFrom - 2 && y <= logTo + 2 && (y - logLastY) * dir >= -2) {   /* 아직 우리 스크롤이 목표 쪽으로 가는 중 (늦게 끝나는 부드러운 스크롤) */
          logLastY = y;
          if (Math.abs(y - logTarget) <= 2) logTarget = -1;   /* 닿았다 → 여기서부터는 손 */
          return;
        }
      }
      logTarget = -1;
      logStick = (log.scrollHeight - log.scrollTop - log.clientHeight) <= 40 + logGap;
    }, { passive: true });
  }
  var greetingRow = null;
  /* 한 날의 여행들 (+ 그 날의 미용실 물음) → 로그 행 (오늘 칸 · 앨범 일기 공용). 다시 그려도 같은 말 (저장된 기록에서만).
     물음 행 셋은 여행 차례 사이에 시각(at) 순으로 끼운다 (여행 순서는 그대로 — 물음은 산책 중엔 생기지 않는다). 연출 중인 물음은 지금 박자까지만 */
  function dayRows(list, asks) {
    var rows = [], q = (asks || []).map(function (a, i) { return [a, i]; }).sort(function (x, y) {
      var p = typeof x[0].at === 'number' ? x[0].at : Infinity, r = typeof y[0].at === 'number' ? y[0].at : Infinity;
      return p !== r ? (p < r ? -1 : 1) : x[1] - y[1];
    }).map(function (x) { return x[0]; });
    function flush(before) { while (q.length && (before == null || (typeof q[0].at === 'number' && q[0].at < before))) salonRowsDOM(q.shift()).forEach(function (r) { rows.push(r); }); }
    list.forEach(function (t) {
      if (typeof t.startedAt === 'number') flush(t.startedAt);
      if (t.by === 'legacy') { var lt = (t.poster && t.poster.title) || ''; rows.push(logRow('포스터', appendAll(document.createDocumentFragment(), [document.createTextNode('옛 기록에서 복원된 포스터 · ')].concat(partRaw(lt, lt, 'player'))), '', false)); return; }   /* 옛 제목은 옛 저장 그대로 */
      if (t.status !== 'done') return;
      (t.events || []).forEach(function (ev) { var r = eventRow(t, ev); if (r) rows.push(r); });
      if (!(t.events || []).length && t.poster) rows.push(logRow('포스터', t.poster.line || '', '', false));
      var sr = summaryRow(t); if (sr) rows.push(sr);
    });
    flush(null);   /* 마지막 차례 뒤 (또는 물음만 있는 날) */
    return rows;
  }
  /* 아래 '오늘의 산책' 은 오늘 칸만 (주인 11-07). 지난 날은 앨범 › 일기 (renderDiary). 자정이 지나면 checkDay 가 넘긴다 */
  var logDay = null;
  function renderLog() {
    var log = $('log'); if (!log) return;
    log.innerHTML = '';
    var today = todayKey();
    /* 다른 길(다른 탭 저장 · 산책이 끝날 때 밀린 다시 그리기 · 복구 · 불러오기)로 그리다 자정을 넘겼으면 인사 · 어제 메모부터 새 날로 — 안 그러면 logDay 만 넘어가
       checkDay 가 다시는 안 넘기고 어제 인사가 남는다. 1분 틱의 '방금 끝난 산책 2분' 기다림은 checkDay 쪽 그대로 */
    if (logDay && logDay !== today && S.octopus.name) setDayGreeting();
    logDay = today;
    var sec = h('div', { class: 'lday', 'data-day': today });
    greetRows().forEach(function (g) { sec.appendChild(g); });
    dayRows(tripsOn(today), asksOn(today)).forEach(function (r) { sec.appendChild(r); });   /* 미용실 물음 행도 (연출 중인 물음은 지금 박자까지 — 두 번 그리지 않는다) */
    log.appendChild(sec);
    if (!log.querySelector('.lrow')) log.appendChild(h('div', { class: 'lempty', text: S.octopus.name ? "아직 아무 데도 안 갔어. '" + (STR.goButton || '산책 갈래?') + "'를 눌러 봐." : '문어 이름부터 지어 주자.' }));
    logStick = true; scrollLog();
  }
  /* 날이 바뀌었으면 (자정 · 날짜 훅) 오늘 칸을 새로: 인사 · 어제 메모를 다시 짓고 지난 날은 앨범 일기로. 다녀오는 중엔 기다린다.
     soon = 지금 넘겨도 된다 (새로 초대할 때). 아니면 (1분 틱) 방금 끝난 산책은 2분 동안 그대로 보이게 둔다 → 넘겼으면 true */
  function checkDay(soon) {
    if (busy || !logDay || todayKey() === logDay) return false;
    if (!soon) { var last = null; S.trips.forEach(function (t) { if (t.status === 'done' && (!last || (t.endedAt || 0) > (last.endedAt || 0))) last = t; }); if (last && Date.now() - (last.endedAt || 0) < 120000) return false; }
    setDayGreeting(); renderLog(); renderAlbum(); renderShelf();
    renderBagChip();   /* 11-11 (검증 W1): 주가 바뀐 날이면 여기서 새 주로 (열어 둔 탭 — 안 받은 지난주 선물 넣기 · 꼬리표 점 다시) */
    return true;
  }
  /* 인사 초상: 자는 중이면 자는 얼굴, 깨어 있으면 웃는 얼굴 (반쯤 감은 차분한 얼굴은 화난 '-_-^' 로 읽힌다는 주인 피드백) */
  function setGreeting(text, expr) { greetingRow = logRow('인사', text, 'c-amber', true, expr || 'happy'); }
  var memoRow = null;
  function greetRows() { return [greetingRow, memoRow].filter(Boolean); }
  /* 오늘 칸 머리의 인사 + 어제 메모를 지금 S 의 문어로 다시 (부팅 · 기록 불러오기 · 초기화). 이름이 없으면 둘 다 없음 */
  function setDayGreeting() {
    greetingRow = memoRow = null;
    if (!S.octopus.name) return;
    var t = lastRestTrip(), asleep = S.octopus.state === 'sleep' && !(rest || (oct.state !== 'sleep' && t && awakeByClock(t)));   /* 깨어 있는 틈이면 '…는 다락방에 있어' */
    /* 집 목소리 줄 (문어 초상 없음): '좋은 아침. 뚜루는 다락방에 있어.' / '… 뚜루는 아직 자고 있어.' — 문어가 자기 이름을 부르는 꼴이 되지 않게 (DIALOGUE_UI §3 표) */
    var hello = greetingByHour(new Date().getHours());
    greetingRow = logRow('오늘', typeof STR.dayGreeting === 'function' ? STR.dayGreeting(hello, S.octopus.name, asleep) : hello + '. ' + S.octopus.name + (asleep ? '은 아직 자고 있어.' : '은 다락방에 있어.'), '', true, null);
    setMemoGreeting();
  }
  /* §17.1 새 날의 첫 인사 = 마지막 산책이 남긴 memo.tomorrow 그대로 (다시 짓지 않는다). 오늘 산책이 아직 없을 때만. 메모 없는 옛 기록이면 말하지 않는다 */
  function setMemoGreeting() {
    memoRow = null;
    var today = todayKey(), last = null;
    if (tripsOn(today).length) return;
    S.trips.forEach(function (t) { if (t.status === 'done' && t.by !== 'legacy') last = t; });
    if (!last || !(last.date < today)) return;
    var text = last.memo && typeof last.memo.tomorrow === 'string' && last.memo.tomorrow ? last.memo.tomorrow : null, by = rawBy(last);
    /* memo.tomorrow 가 없으면 그 차례가 남긴 호기심 메모(내려놓지 않은 것)를 그대로 (모델이 wrap_up.note 만 쓴 경우) — 없으면 말하지 않는다 */
    if (!text) { var cn = S.curiosityNotes.filter(function (x) { return x.session === last.id && x.status === 'active'; })[0]; if (cn) { text = clip(cn.text, NOTE_SHOW); by = NOTE_RAW[cn.by] || by; } }
    if (!text) return;
    memoRow = logRow(last.date === keyAdd(today, -1) ? '어제 메모' : '지난 메모', rawSpan(text, by), 'c-amber memo', true, 'calm');   /* 모델·사람이 쓴 메모는 그대로 (data-raw) */
  }

  /* ───────────────────────── posters (§6) ───────────────────────── */
  var PAPER = [['#f3ead6', '#e6d9bd'], ['#e9ecdc', '#d7dcc3'], ['#f0e2e4', '#dfc9cd']];
  var NOTE_PAPER = [['#fbf3c9', '#eadf9e'], ['#dfeee2', '#c3d9c8'], ['#eae4f3', '#d2c8e3']];
  function tripOrdinal(trip) {
    if (trip.kind !== 'out') return null;
    var n = 0;
    for (var i = 0; i < S.trips.length; i++) { if (S.trips[i].kind === 'out') n++; if (S.trips[i] === trip) break; }
    return n;
  }
  /* 한글 한 줄 → 최대 3줄. 공백 우선, 없으면 글자 단위. 마지막 줄만 … */
  function wrapLine(text, maxChars, maxLines) {
    text = String(text || '').trim(); if (!text) return [];
    maxLines = maxLines || 3;
    var out = [], rest = text;
    while (rest.length && out.length < maxLines) {
      if (rest.length <= maxChars || out.length === maxLines - 1) {
        out.push(rest.length > maxChars ? rest.slice(0, maxChars - 1) + '…' : rest); rest = ''; break;
      }
      var cut = rest.lastIndexOf(' ', maxChars);
      if (cut < maxChars * 0.4) cut = maxChars;
      out.push(rest.slice(0, cut).trim()); rest = rest.slice(cut).trim();
    }
    return out;
  }
  function sceneGradient(scene, seed, id) {
    var hue = (hash(scene + '|' + seed) % 360), hue2 = (hue + 28) % 360;
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(' + hue + ',30%,42%)"/><stop offset="1" stop-color="hsl(' + hue2 + ',26%,28%)"/></linearGradient>';
  }
  function sceneShapes(seed, x, y, w, hgt) {
    var r = mkRng(seed >>> 0), s = '';
    for (var i = 0; i < 3; i++) {
      var cx = x + r() * w, cy = y + hgt * (0.35 + r() * 0.5), rr = w * (0.08 + r() * 0.18);
      s += i % 2 ? '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + rr.toFixed(1) + '" fill="#fff" opacity=".12"/>'
                 : '<rect x="' + (cx - rr).toFixed(1) + '" y="' + (cy - rr * .4).toFixed(1) + '" width="' + (rr * 2).toFixed(1) + '" height="' + (rr * .8).toFixed(1) + '" fill="#000" opacity=".14"/>';
    }
    return s;
  }
  function scenePath(scene) { return assetPath('scene.' + (scene || 'home')) || ('assets/scenes/' + encodeURIComponent(scene || 'home') + '.svg'); }
  /* 앞면 SVG. 저장된 데이터만 사용. opts: { mini, inlineScene, inlineThumb } (export 때 data URI 로 치환) */
  function posterSVG(trip, w, hgt, opts) {
    opts = opts || {}; w = w || 300; hgt = hgt || Math.round(w * 4 / 3);
    var p = trip.poster || {}, note = p.type === 'note', uid = 'p' + (trip.seed >>> 0).toString(36) + (opts.mini ? 'm' : '') + w;
    var pal = (note ? NOTE_PAPER : PAPER)[clamp(p.paper | 0, 0, 2)];
    var m = w * 0.06, sx = m, sy = m * 1.3, sw = w - m * 2, sh = hgt * (note ? 0.42 : 0.56);
    var s = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ' + w + ' ' + hgt + '" width="' + w + '" height="' + hgt + '">';
    s += '<defs>' + sceneGradient(p.scene || 'home', trip.seed, uid) + '<clipPath id="' + uid + 'c"><rect x="' + sx + '" y="' + sy + '" width="' + sw + '" height="' + sh + '" rx="' + (w * 0.02) + '"/></clipPath>';
    s += '<clipPath id="' + uid + 't"><rect x="' + (sx + sw * 0.08) + '" y="' + (sy + sh * 0.12) + '" width="' + (sw * 0.5) + '" height="' + (sh * 0.62) + '" rx="' + (w * 0.03) + '"/></clipPath></defs>';
    s += '<rect width="' + w + '" height="' + hgt + '" rx="' + Math.max(1, w * 0.01) + '" fill="' + pal[0] + '"/>';
    s += '<rect x="0.5" y="0.5" width="' + (w - 1) + '" height="' + (hgt - 1) + '" rx="' + Math.max(1, w * 0.01) + '" fill="none" stroke="' + pal[1] + '"/>';
    /* 장면 */
    /* 주제의 픽셀 배경 (js/poster-art.js, data URI) — 있으면 임시 벡터 장면 대신. 작은 포스터(mini: 벽 · 들고 오는 · 날아가는)에도 넣는다 (부드럽게 줄여서) */
    var bg = (window.POSTER_ART && POSTER_ART.sceneSvg) ? POSTER_ART.sceneSvg(p.scene || 'home', sx, sy, sw, sh, !!opts.mini) : '';
    s += '<g clip-path="url(#' + uid + 'c)"><rect x="' + sx + '" y="' + sy + '" width="' + sw + '" height="' + sh + '" fill="url(#' + uid + ')"/>' + (bg || sceneShapes(trip.seed, sx, sy, sw, sh));
    var sceneHref = bg ? null : opts.inlineScene || (opts.noExternal ? null : scenePath(p.scene));
    if (sceneHref) s += '<image href="' + esc(sceneHref) + '" x="' + sx + '" y="' + sy + '" width="' + sw + '" height="' + sh + '" preserveAspectRatio="xMidYMid slice"/>';
    /* 그 방의 픽셀 그림 (js/poster-art.js) — 있으면 위키 사진 대신 이것을 붙인다 (사진은 장면과 따로 놀았다, 주인 11-10). 출처·사진 출처는 일기에 그대로 */
    var art = (!opts.mini && window.POSTER_ART) ? (note ? POSTER_ART.svg(trip, sx + sw * 0.25, sy + sh * 0.08, sw * 0.5, sh * 0.84, W) : POSTER_ART.svg(trip, sx + sw * 0.08, sy + sh * 0.12, sw * 0.5, sh * 0.62, W)) : '';   /* 쪽지 = 그날 집 활동 그림 (가운데) */
    var miniArt = (opts.mini && window.POSTER_ART && POSTER_ART.miniSvg) ? POSTER_ART.miniSvg(trip, sx, sy, sw, sh, W) : '';   /* 작은 포스터: 그 방 그림을 장면 가운데에 (벽에서 포스터끼리 구분되게) */
    if (art || miniArt) s += art || miniArt;
    else if (!opts.mini && p.thumb && p.thumb.url && S.settings.thumbs !== false && !note) {
      var th = opts.inlineThumb || (opts.noExternal ? null : p.thumb.url);
      if (th) s += '<g clip-path="url(#' + uid + 't)"><image href="' + esc(th) + '" x="' + (sx + sw * 0.08) + '" y="' + (sy + sh * 0.12) + '" width="' + (sw * 0.5) + '" height="' + (sh * 0.62) + '" preserveAspectRatio="xMidYMid slice"/></g>';
    }
    s += '</g>';
    if (!art && !opts.mini && p.thumb && p.thumb.url && S.settings.thumbs !== false && !note) s += '<text x="' + (sx + 2) + '" y="' + (sy + sh - 3) + '" font-size="' + (w * 0.028) + '" fill="#fff" opacity=".75" font-family="Noto Sans KR, sans-serif">사진: 위키미디어 공용</text>';
    /* 스티커 하나 = 픽셀 아이콘 (예전 이모지 글자 대신 — 주인 11-07): 외출은 기억한 곳의 코너 그림, 집에 있던 날 쪽지는 집, 복원된 옛 포스터는 포스터 그림.
       주소는 iconSrc (단일 파일 번들 = data URI). 16px 원본을 정수 배(16·32·64…)로, 픽셀 그대로. 자리·기울기는 예전 그대로 (stickerPos).
       밖의 파일을 못 읽는 그림(벽 텍스처 · 날아가는 포스터 · PNG 저장)은 data URI 일 때만 (opts.inlineSticker 로 넘겨받거나 번들) */
    var pos = p.stickerPos || { x: 70, y: 28, rot: 0 };
    var stx = sx + sw * (pos.x / 100), sty = sy + sh * (pos.y / 100), want = w * (note ? 0.18 : 0.2), ss = want >= 12 ? 16 * Math.max(1, Math.round(want / 16)) : want >= 6 ? 8 : want;   /* 정수 배 (작은 벽 텍스처는 8px = 반) */
    /* 방 그림(art)이 붙은 포스터: 주제 스티커가 그림과 겹치고 기울어 계단이 졌다 (주인 11-10) → 오른쪽 가장자리 세로 띠에만 놓고 (그림 칸 밖),
       반 크기 정수 배 (300px 포스터 = 32px) · 기울기 0 (픽셀 그대로). 높이는 저장된 stickerPos.y 그대로라 포스터마다 다르다. 저장 데이터는 안 바꾼다 */
    if (art) { ss = 16 * Math.max(1, Math.round(w * 0.107 / 16)); stx = sx + sw * ((81 + (Math.abs(pos.x | 0) % 7)) / 100); sty = sy + sh * (Math.max(14, Math.min(84, pos.y)) / 100); pos = { x: pos.x, y: pos.y, rot: 0 }; }
    var stHref = opts.inlineSticker || stickerSrc(trip);
    if (stHref && !/^data:/.test(stHref) && window.UIART && UIART.iconBad && UIART.iconBad(stHref)) stHref = null;   /* 한 번 안 온 그림은 넣지 않는다 (깨진 그림 표시 대신 스티커 없이) */
    if (miniArt) stHref = null;   /* 작은 포스터에 방 그림이 있으면 주제 스티커는 뺀다 (둘이 겹쳐 뭉개진다) */
    if (stHref && (!opts.noExternal || /^data:/.test(stHref))) {
      /* 기울기는 <image> 에 (바깥 g.stk 는 새 카드 등장 애니메이션 scale/fade 가 transform 을 덮어쓴다 — 거기 두면 기울기 · 자리가 풀린다) */
      s += '<g class="stk"><image href="' + esc(stHref) + '" x="' + (stx - ss / 2).toFixed(1) + '" y="' + (sty - ss / 2).toFixed(1) + '" width="' + ss.toFixed(1) + '" height="' + ss.toFixed(1) + '" transform="rotate(' + (pos.rot || 0) + ' ' + stx.toFixed(1) + ' ' + sty.toFixed(1) + ')" image-rendering="optimizeSpeed" style="image-rendering:pixelated"/></g>';
    }
    if (opts.mini) {
      s += '<rect x="' + sx + '" y="' + (sy + sh + hgt * 0.08) + '" width="' + (sw * 0.8) + '" height="' + (hgt * 0.05) + '" fill="#5f5849" opacity=".5"/>';
      s += '<rect x="' + sx + '" y="' + (sy + sh + hgt * 0.17) + '" width="' + (sw * 0.55) + '" height="' + (hgt * 0.05) + '" fill="#5f5849" opacity=".5"/></svg>';
      return s;
    }
    /* 한 줄 (Noto Serif KR 600, ≤2줄) — 픽셀 테마에서도 세리프: 카드 크기에 따라 w×0.058 로 비례하는 글자라 픽셀 글꼴은 정수 배가 안 된다 (손글씨 느낌 유지) */
    var lf = w * (note ? 0.062 : 0.058), lines = wrapLine(p.line || '', Math.floor(sw / (lf * 0.95)), 3);
    if (lines.length === 3) { lf *= 0.9; lines = wrapLine(p.line || '', Math.floor(sw / (lf * 0.95)), 3); }
    var ly = sy + sh + lf * 1.6;
    /* 모델·사람이 쓴 한 줄은 줄째 그대로 · 두뇌가 지은 줄은 그 속 정류장 이름(위키 제목 · 모델이 준 제목)만 <tspan data-raw> */
    var lb = lineBy(trip), rp = lb ? { part: '', by: null } : remPart(trip), lineRaw = lb ? ' data-raw="' + lb + '"' : '', lineH = svgLinesH(p.line || '', lines, rp.part, rp.by);
    lines.forEach(function (ln, i) { s += '<text x="' + (w / 2) + '" y="' + (ly + i * lf * 1.5).toFixed(1) + '" text-anchor="middle" font-family="Noto Serif KR, serif" font-weight="600" font-size="' + lf.toFixed(1) + '" fill="#2a2620"' + lineRaw + '>' + (lb ? esc(ln) : lineH[i]) + '</text>'; });
    /* 들른 곳 줄: 한 줄 글과 날짜 사이 빈 곳에 그날 들른 정류장 그림을 순서대로 (일기의 정류장 그대로, js/poster-art.js) */
    if (window.POSTER_ART && POSTER_ART.trailSvg) { var tTop = ly + Math.max(0, lines.length - 1) * lf * 1.5 + lf * 0.4, tBot = hgt - m * 1.1 - w * 0.04; s += POSTER_ART.trailSvg(trip, sx, tTop, sw, tBot - tTop); }
    /* 날짜 · N번째 */
    var ord = tripOrdinal(trip), meta = fmtDate(trip.date, true) + (ord ? ' · ' + ord + '번째 뽈뽈' : note ? ' · 오늘은 집' : '');
    s += '<text x="' + (w / 2) + '" y="' + (hgt - m * 1.1).toFixed(1) + '" text-anchor="middle" font-family="Noto Sans KR, sans-serif" font-size="' + (w * 0.036).toFixed(1) + '" fill="#5f5849">' + esc(meta) + '</text>';
    /* 테이프 / 핀 */
    if (S.room.lantern >= 5) s += '<circle cx="' + (w / 2) + '" cy="' + (m * 0.7) + '" r="' + (w * 0.022) + '" fill="#b8402c"/><circle cx="' + (w / 2 - w * 0.006) + '" cy="' + (m * 0.7 - w * 0.006) + '" r="' + (w * 0.008) + '" fill="#fff" opacity=".7"/>';
    else s += '<rect x="' + (w / 2 - w * 0.09) + '" y="' + (-m * 0.1) + '" width="' + (w * 0.18) + '" height="' + (m * 0.75) + '" fill="#fff" opacity=".45" transform="rotate(-4 ' + (w / 2) + ' ' + (m * 0.3) + ')"/>';
    s += '</svg>';
    return s;
  }
  /* wrapLine 이 나눈 줄마다: 원문 속 그 줄의 자리를 찾아 남의 글 조각(part 가 나오는 곳 — 줄을 넘어가면 줄마다 그 조각)만 <tspan data-raw>. 못 찾는 줄은 글자 그대로 */
  function svgLinesH(full, lines, part, by) {
    var runs = [], cur = 0, i;
    if (by && part) { i = full.indexOf(part); while (i >= 0) { runs.push([i, i + part.length]); i = full.indexOf(part, i + part.length); } }
    return lines.map(function (ln) {
      if (!runs.length) return esc(ln);
      var body = ln, ell = '', at = full.indexOf(body, cur);
      if (at < 0 && ln.slice(-1) === '…') { body = ln.slice(0, -1); ell = '…'; at = full.indexOf(body, cur); }   /* 마지막 줄을 줄였으면 */
      if (at < 0) return esc(ln);
      cur = at + body.length;
      var out = '', q = 0;
      runs.forEach(function (r) { var a = Math.max(r[0], at) - at, b = Math.min(r[1], at + body.length) - at; if (b <= a) return; out += esc(body.slice(q, a)) + '<tspan data-raw="' + by + '">' + esc(body.slice(a, b)) + '</tspan>'; q = b; });
      return out + esc(body.slice(q)) + ell;
    });
  }
  /* 포스터 스티커 그림 주소: 외출 = 스티커 방(없으면 기억한 곳)의 코너, 집에 있던 날 쪽지 = 집, 옛 기록에서 복원 = 포스터 */
  function stickerIcon(trip) {
    var p = trip.poster || {};
    if (trip.by === 'legacy') return 'log/poster';
    if (p.type === 'note') return 'memory/home';
    var nd = p.sticker && nodeOf(p.sticker), r = trip.receipt, rem = r && r.stops && r.stops[r.rememberedIdx];
    return 'memory/' + (CORNER_ICONS[nd && nd.corner] ? nd.corner : CORNER_ICONS[rem && rem.corner] ? rem.corner : 'wild');
  }
  function stickerSrc(trip) { var k = stickerIcon(trip); return STICKER_DATA[k] || (STICKER_BAD[k] ? null : window.UIART && UIART.iconSrc ? UIART.iconSrc(k) : null); }
  /* 스티커 그림을 data URI 로 미리 받아 둔다 (http(s) 에서만 — file:// 은 fetch 가 막히고, 단일 파일 번들은 이미 data URI).
     그림으로 굽는 SVG(3D 벽 텍스처 · 날아가는 포스터)는 밖의 파일을 못 읽어서. 받으면 벽 텍스처를 한 번 다시 굽는다 (boot) */
  var STICKER_KEYS = ['hands', 'sea', 'sky', 'signs', 'numbers', 'sounds', 'home', 'mind', 'wild'].map(function (c) { return 'memory/' + c; }).concat(['log/poster']), STICKER_DATA = {}, STICKER_BAD = {}, stickerWarm = null;
  function warmStickers() {
    if (stickerWarm) return stickerWarm;
    if (!window.UIART || !UIART.iconSrc || !/^https?:$/.test(location.protocol) || typeof fetch !== 'function') return (stickerWarm = Promise.resolve(false));
    stickerWarm = Promise.all(STICKER_KEYS.map(function (k) {
      var src = UIART.iconSrc(k); if (/^data:/.test(src)) return null;
      return fetchAsDataURL(src).then(function (d) { STICKER_DATA[k] = d; }, function () { STICKER_BAD[k] = 1; });   /* 못 받으면 그 스티커는 어디에도 넣지 않는다 (깨진 그림 표시 대신 스티커 없이) */
    })).then(function () { return Object.keys(STICKER_DATA).length > 0; });
    return stickerWarm;
  }
  /* 공유용 한 줄 (CG R14 · 스포일러 없음 · 힌트 · URL · 제목 없음 — 이모지 사슬은 뺐다, 주인 11-07): 들른 곳은 이름이 아니라 그곳의 갈래 낱말만.
     `뽈뽈 #3 · 비 오는 날 · 손 · 바다 · 들판 · 밖` (방 = 코너 낱말, 위키 · 모르는 곳 = 들판, 바깥 주소 = 밖). 날씨는 '… 날' 로 (방 '비' 와 헷갈리지 않게). 집에 있던 날 `뽈뽈 · 오늘은 집` */
  var WX_WORD = { rain: '비 오는 날', drizzle: '가랑비 오는 날', clear: '맑은 날', snow: '눈 오는 날' };
  var CORNER_WORD = { hands: '손', sea: '바다', sky: '하늘', signs: '기호', numbers: '수', sounds: '소리', home: '집', mind: '생각', wild: '서가' };
  function shareLine(trip) {
    if (trip.kind === 'home') return '뽈뽈 · 오늘은 집';
    var ord = tripOrdinal(trip), stops = (trip.receipt && trip.receipt.stops) || [];
    var words = stops.map(function (s) { return s.nodeId === 'door_out' ? '밖' : CORNER_WORD[s.corner] || '서가'; })
      .filter(function (w, i, a) { return i === 0 || w !== a[i - 1]; });   /* 같은 갈래가 잇달아 오면 한 번만 ('손 · 손' 이 틀린 것처럼 읽혀서) */
    return ['뽈뽈 #' + (ord || '?'), WX_WORD[weatherFor(S.room.lantern)] || WX_WORD.rain].concat(words).join(' · ');
  }
  function shareHTML(trip) {
    var line = shareLine(trip);
    return '<div class="share"><code>' + esc(line) + '</code><button type="button" class="copy pressable" data-share="' + esc(line) + '" aria-label="한 줄 복사">복사</button></div>';
  }
  function copyText(text) {
    var done = function () { toast('복사했어'); }, fail = function () { toast('복사가 안 됐어. 길게 눌러 골라 줘'); };
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(done, function () { legacyCopy(text) ? done() : fail(); });
    legacyCopy(text) ? done() : fail(); return Promise.resolve();
  }
  function legacyCopy(text) {
    try { var ta = h('textarea', { 'aria-hidden': 'true' }); ta.value = text; ta.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.appendChild(ta); ta.select(); var ok = document.execCommand && document.execCommand('copy'); ta.remove(); return !!ok; } catch (e) { return false; }
  }
  /* 읽기 상태 수 한 줄: 낱말과 수 사이는 줄바꿈 없는 칸 (320px 에서 '못' / '읽음 0' 으로 갈라지지 않게) */
  function countsLine(c) {
    function kv(k, n) { return k.replace(/ /g, '\u00a0') + '\u00a0' + n; }
    var out = [kv('읽음', c.read | 0)];   /* '읽음' 은 0 이어도 늘 (못 읽은 날을 숨기지 않게) · 나머지는 있을 때만 — 글을 줄이고 320px 에서 한 줄에 */
    [['책장', c.builtin], ['모의', c.simulated], ['못 읽음', c.failed], ['앉아만', c.none]].forEach(function (p) { if (p[1] | 0) out.push(kv(p[0], p[1] | 0)); });
    return out.join(' · ');
  }
  /* 그림 + 낱말은 한 덩이 (320px 에서 그림만 줄 끝에 남지 않게): 짧은 말(기념품 이름 · 상태 낱말)은 ua-iw(줄바꿈 없음), 길 수 있는 말(정류장 이름)은 ua-iwb(덩이째 다음 줄로, 그래도 길면 안에서) */
  function iwH(iconHTML, textHTML, long) { return iconHTML ? '<span class="' + (long ? 'ua-iwb' : 'ua-iw') + '">' + iconHTML + textHTML + '</span>' : textHTML; }
  /* 열람 기록 3~5줄 (§15.1) — 픽셀 게임 아이템 설명처럼. 강조는 색만: 기억 장소 .kw(--accent), 처음 온 곳 .first(--teal) */
  function inspectHTML(trip) {
    var r = trip.receipt, p = trip.poster || {}, lines = [], given = rawBy(trip), lb = lineBy(trip), rp = lb ? null : remPart(trip);
    var lead = '<p class="lead"' + (lb ? ' data-raw="' + lb + '"' : '') + '>' + (lb ? esc(p.line || '') : partRawH(p.line || '', rp.part, rp.by)) + '</p>';   /* 모델·사람이 쓴 한 줄은 그대로 · 두뇌가 지은 줄은 그 속 정류장 이름만 */
    if (trip.by === 'legacy') return lead + '<p class="meta">옛 기록에서 복원된 포스터야. 들른 곳 기록은 남아 있지 않아.</p>';
    if (trip.kind === 'home') {
      var act = (r && r.activity) || {};
      var hi = icoH('log/home', 'ua-log');
      lines.push('<p class="meta' + (hi ? ' ua-ico-line' : '') + '">' + hi + '오늘은 집' + (homeLit(trip) ? ' · 등불 +1' : '') + '</p>');
      if (act.detail || p.detail) lines.push('<p' + (given ? ' data-raw="' + given + '"' : '') + '>' + esc((act.detail || p.detail || '').split('\n')[0]) + '</p>');   /* 모델·사람 차례의 뒷면 글은 그들이 쓴 것 */
      lines.push(reactionSayHTML(trip));
      return lead + lines.join('');
    }
    var stops = (r && r.stops) || [], remIdx = r && r.rememberedIdx >= 0 ? r.rememberedIdx : -1;
    if (stops.length) {
      /* 들른 곳: [코너 그림]이름 · [코너 그림]이름 … (예전 이모지 · ✕ · → 는 뺐다). 못 읽음 · 모의는 이름 뒤 상태 그림 + 짧은 낱말 (보이는 글자 — 그림만으로 두지 않는다).
         정류장마다 한 덩이(.stop): 시스템 테마는 글처럼 흐르고(사이 ' · '), 픽셀 테마는 32px 그림이라 한 줄에 하나씩 (사이 점 .sep 은 숨김 — 줄 끝에 '·' 만 남지 않게, css/ui-art.css) */
      var chain = stops.map(function (s, i) {
        var st = s.status || 'failed', cls = i === remIdx ? 'kw' : s.first ? 'first' : '';
        var name = stopIcoH(s) + rawH(s.name || s.title || '', stopRawBy(trip, s.nodeId, null));
        return '<span class="stop">' + (cls ? '<span class="' + cls + '">' + name + '</span>' : name) +
          (s.first && i !== remIdx ? '<span class="first-chip">처음</span>' : '') +
          (st === 'failed' || st === 'simulated' ? '<span class="miss">' + iwH(icoH('log/' + st, 'ua-status'), esc(MISS_WORD[st])) + '</span>' : '') + '</span>';
      });
      lines.push('<p class="ua-chain">들른 곳: ' + chain.join('<span class="sep"> · </span>') + '</p>');
    }
    var c = (r && r.counts) || {};
    lines.push('<p class="meta">' + countsLine(c) + '</p>');
    lines.push(reactionSayHTML(trip));
    var sv = r && r.souvenir && W && W.souvenirs && W.souvenirs[r.souvenir];
    if (sv || (r && r.souvenir)) { var si = sv ? icoH('souvenir/' + r.souvenir, 'ua-souv') : ''; lines.push('<p class="meta' + (si ? ' ua-ico-line' : '') + '">가져온 것: ' + iwH(si, esc(sv ? sv.name : r.souvenir)) + '</p>'); }
    return lead + lines.join('');
  }
  /* 반응 한 줄 (열람 기록) · 반응 칸 (일기): reactionOf 그대로. 반응도 줄도 없으면 빈 문자열 — 반응 자리를 비워 둔다 */
  function reactionSayHTML(trip) {
    var rx = reactionOf(trip); if (!rx.word && !rx.line) return '';
    var by = rx.line ? (rx.given ? rawBy(trip) : null) : (rx.raw ? (rawBy(trip) || 'model') : null);   /* 그들이 쓴 줄 · 네 가지 밖의 반응은 그대로 */
    return '<p class="say voice"' + (by ? ' data-raw="' + by + '"' : '') + '>' + esc(rx.line || rx.word) + '</p>';
  }
  function reactionKV(trip, withLine) {
    var rx = reactionOf(trip), out = '';
    var rb = rx.raw ? (rawBy(trip) || 'model') : null, lb = rx.given ? rawBy(trip) : null;   /* 네 가지 밖의 반응(원문은 title) · 그들이 쓴 줄은 그대로 */
    if (rx.word) out += '<div class="kv"><span>반응</span><b' + (rb ? ' data-raw="' + rb + '"' : '') + (rx.raw && rx.word !== rx.raw ? ' title="' + esc(rx.raw) + '"' : '') + '>' + esc(rx.word) + '</b></div>';
    if (withLine && rx.line) out += '<p class="dim"' + (lb ? ' data-raw="' + lb + '"' : '') + '>' + esc(rx.line) + '</p>';
    return out;
  }
  /* 뒷면 영수증 HTML (§6.2) — 링크 클릭 가능. 출처 링크는 위키백과(한국어) 주소일 때만 (두뇌도 거르지만 옛 기록·불러온 기록까지) */
  var WIKI_SRC = /^https:\/\/(ko|en|ja|de|fr|es|it|pt|id|hi)\.wikipedia\.org\//;   /* 방의 언어 · 먼 바다 문 (MCP: mcp/i18n.js LANGS 와 같게) */
  function receiptHTML(trip) {
    var r = trip.receipt, p = trip.poster || {}, out = '<div class="receipt">';
    out += '<h3>일기' + (trip.date ? ' · ' + esc(fmtDate(trip.date, true)) : '') + '</h3>';   /* 화면 말은 '일기' (코드 이름 receipt* 는 그대로). 여행 id 는 보이지 않는다 */
    if (trip.by === 'legacy') {
      out += '<p>옛 기록에서 복원된 포스터야. 들른 곳 기록은 남아 있지 않아.</p><div class="hr"></div><p class="by">고른 이: ' + BY_LABEL.legacy + '</p></div>';
      return out;
    }
    if (trip.kind === 'home') {
      var act = (r && r.activity) || {};
      out += '<p class="big-line"' + (lineBy(trip) ? ' data-raw="' + lineBy(trip) + '"' : '') + '>' + esc(p.line || act.line || '') + '</p>';   /* 그들이 쓴 줄일 때만 (고른 활동의 말은 활동 목록 글) */
      out += '<p>오늘은 집' + (homeLit(trip) ? '. 등불 +1' : '') + '</p>';
      if (act.detail) out += '<p' + (rawBy(trip) ? ' data-raw="' + rawBy(trip) + '"' : '') + '>' + esc(act.detail).replace(/\n/g, '<br>') + '</p>';   /* 모델·사람 차례의 뒷면 글은 그들이 쓴 것 */
      if (act.by === 'fallback') out += '<p class="dim">고른 활동은 지금 방에서 못 하는 거라 활동 없이 적었어</p>';   /* 두뇌가 바꾼 것 (MODEL_VOICE §2) */
      out += '<div class="hr"></div>';
      out += reactionKV(trip, givenTrip(trip));   /* 집: 데모 규칙의 줄은 위 열람 기록에만 (예전 그대로), 모델·사람이 쓴 줄은 여기에도 */
      out += shareHTML(trip);
      out += '<p class="by">고른 이: ' + esc(BY_LABEL[trip.by] || trip.by) + '</p></div>';
      return out;
    }
    var hint = trip.hint || {};
    if (hint.raw) out += '<div class="kv"><span>힌트</span><b>' + rawH(hint.raw, rawBy(trip) || 'player') + ' · ' + esc(FOLLOW_LABEL[hint.followed] || hint.followed || '') + '</b></div><div class="hr"></div>';   /* 힌트가 없으면 줄째 뺀다 (플레이어 산책은 늘 빈 힌트, 결정 18) */
    if (r && r.stops) r.stops.forEach(function (s, i) {
      var st = s.status || 'failed';
      var sti = icoH('log/' + (STATUS_LABEL[st] ? st : 'failed'), 'ua-status');   /* 코너 그림 + 이름 + [상태 그림] 상태 단어 (예전 이모지는 뺐다) */
      out += '<div class="row"><span class="n">' + (i + 1) + '</span><span>' + iwH(stopIcoH(s), rawH(s.name || s.title || '', stopRawBy(trip, s.nodeId, null)), true) +
        ' <span class="st' + (sti ? ' ua-st' : '') + '">' + iwH(sti, esc((st === 'builtin' && s.book) ? (s.book.card ? '서가 카드' : '책장의 책') : (STATUS_LABEL[st] || st)) + (s.ms ? '\u00a0·\u00a0' + secs(s.ms) : '')) + '</span>' + (s.first ? ' <span class="first-tag">처음 온 곳</span>' : '');   /* 처음 온 곳은 점 없이 따로 — 줄이 바뀌어도 '·' 가 줄 끝·줄 앞에 홀로 남지 않게 */
      if (s.bridge) out += '<span class="bridge">' + esc(s.bridge) + '</span>';
      /* 모델·사람이 쓴 메모(noteBy)는 따옴표 없이, 누가 썼는지 붙여서 — 따옴표는 위키백과 요약에만 (모델 말이 인용문처럼 보이지 않게, MODEL_VOICE) */
      var wikiSrc = st === 'read' && s.source && WIKI_SRC.test(s.source.url || '');
      if (s.note && s.noteBy) out += '<span class="note">' + rawH(s.note, s.noteBy === 'model' ? 'model' : 'human') + ' <span class="dim">· ' + (s.noteBy === 'model' ? '모델' : '사람') + '이 쓴 메모</span></span>';
      else if (s.note) out += '<span class="note">' + (st === 'read' ? '“' + rawH(s.note, 'wiki') + '”' : esc(s.note)) + '</span>';   /* 위키백과 요약 그대로 */
      if (s.noteBy && wikiSrc && s.source.extract) out += '<span class="note">“' + rawH(s.source.extract, 'wiki') + '”</span>';
      if (st === 'builtin' && s.book) out += '<span class="note dim">「' + esc(s.book.title) + '」 · ' + esc(s.book.by) + ' 씀</span>';   /* 뽈뽈 도서관 — 누가 쓴 자료인지 화면에도 */
      if (wikiSrc) out += '<a href="' + esc(s.source.url) + '" target="_blank" rel="noopener">출처: ' + esc('Wikipedia (' + WIKI_SRC.exec(s.source.url)[1] + ')') + ' · <span class="ua-iw">' + esc(s.source.license || 'CC BY-SA') + '</span></a>';   /* 예전 ↗ 는 뺐다 — 링크는 새 창. 출처 이름은 저장된 attribution 이 아니라 위 검사 (wikiSrc) 를 통과한 주소의 언어로 만든다 — 옛 기록에는 어느 위키를 읽었든 'Wikipedia (ko)' 가 적혀 있다. 라이선스는 두뇌의 상수. 둘 다 우리 글이라 data-raw 를 달지 않는다 (지킴이가 본다) */
      out += '</span></div>';
    });
    out += '<div class="hr"></div>';
    var c = (r && r.counts) || {};
    var sv = r && r.souvenir && W && W.souvenirs && W.souvenirs[r.souvenir];
    var svi = sv ? icoH('souvenir/' + r.souvenir, 'ua-souv') : '';
    out += '<p>' + countsLine(c) + '</p><p' + (svi ? ' class="ua-ico-line"' : '') + '>가져온 것: ' + iwH(svi, sv ? esc(sv.name) : r && r.souvenir ? esc(r.souvenir) : '없음') + '</p>';
    if (r && r.rememberedIdx >= 0 && r.stops[r.rememberedIdx]) {
      /* 고른 이(모델·사람)가 기억할 곳을 안 골랐으면 두뇌가 마지막 곳을 대신 뒀다 (rememberedBy 'fallback') → 고른 것처럼 적지 않는다 (MODEL_VOICE §2) */
      var rs = r.stops[r.rememberedIdx], rsH = rawH(rs.name || '', stopRawBy(trip, rs.nodeId, null));   /* 위키 제목 · 모델이 준 이름은 그대로 */
      if (r.rememberedBy === 'fallback') out += '<div class="kv"><span>포스터에 쓴 곳</span><b>' + rsH + '</b></div><p class="dim">기억할 곳은 고르지 않아서 마지막 곳으로 대신 뒀어</p>';
      else out += '<div class="kv"><span>기억으로 고른 곳</span><b>' + rsH + '</b></div>';
    }
    out += reactionKV(trip, true);
    out += shareHTML(trip);
    out += '<p class="by">고른 이: ' + esc(BY_LABEL[trip.by] || trip.by) + '</p></div>';
    return out;
  }

  /* ───────────────────────── render: status · wall · album · souvenirs ───────────────────────── */
  function renderStatus(bloom) {
    var n = S.room.lantern;
    $('oct-name').textContent = S.octopus.name || '이름 없는 문어';
    /* 등불: `등불 [8칸] n/8` 한 줄 (칸은 CSS 로 그린 점·네모) (단추 — aria-label 만 읽힌다, 누르면 "초대한 날마다 한 칸 켜져"). 산책·함께한 날 수는 설정 › 기록 한 줄 */
    var pips = $('pips'); pips.setAttribute('aria-label', '등불 ' + n + '/8');
    var row = pips.querySelector('.pip-row'), cnt = pips.querySelector('.pips-n');
    if (!row) { pips.innerHTML = ''; pips.appendChild(h('span', { class: 'pips-lbl', 'aria-hidden': 'true', text: '등불' })); row = pips.appendChild(h('span', { class: 'pip-row', 'aria-hidden': 'true' })); cnt = pips.appendChild(h('span', { class: 'pips-n', 'aria-hidden': 'true' })); }
    if (row.children.length !== 8) { row.innerHTML = ''; for (var i = 0; i < 8; i++) row.appendChild(h('span', { class: 'pip', 'aria-hidden': 'true' })); }   /* 칸은 CSS 로 그린다 (글자 없음 — 예전 ○ ● 는 뺐다) */
    Array.prototype.forEach.call(row.children, function (p, i) {
      var on = i < n, was = p.classList.contains('on');
      p.classList.toggle('on', on); if (p.firstChild) p.textContent = '';   /* 옛 DOM 의 ○ ● 글자가 남아 있으면 비운다 */
      if (on && !was && bloom) { p.classList.add('bloom'); p.classList.toggle('last', i === 7); setTimeout(function () { p.classList.remove('bloom', 'last'); }, 1000 * speed()); }
    });
    if (cnt) cnt.textContent = n + '/8';
    var rt = $('room-title'); if (rt) rt.textContent = roomTitle(n);
    if (bloom && window.AUDIO) AUDIO.on('lantern', { n: n });   /* 소리: 등불 칸이 켜지는 순간 (8칸 = 방 완성) */
  }
  function tripById(id) { for (var i = 0; i < S.trips.length; i++) if (S.trips[i].id === id) return S.trips[i]; return null; }
  function posterTrips() { return S.room.posterOrder.map(tripById).filter(function (t) { return t && t.poster && t.status === 'done'; }); }
  function renderWall() {
    scene.setPosters(posterTrips().map(function (t) {
      return { id: t.id, title: t.poster.title || '포스터', titleRaw: t.poster.title ? posterTitleRaw(t) : null, svg: posterSVG(t, 14, 19, { mini: true }), tex: sceneMode === '3d' ? posterSVG(t, 48, 64, { mini: true, noExternal: true }) : null };
    }));
  }
  var albumFilter = 'all', albumFresh = {};
  function renderAlbum() {
    var al = $('album'); if (!al) return;
    al.innerHTML = '';
    var all = S.trips.filter(function (t) { return t.poster && t.status === 'done'; });
    renderAlbumBtn();   /* 첫 포스터(또는 메모 · 지난 날 일기)가 생기기 전엔 앨범 아이콘 자체를 보이지 않는다 (CG R18) */
    renderAlbumRecent(); renderAlbumNotes(); renderDiary();
    al.hidden = albumFilter === 'diary';   /* 일기 탭: 카드 줄 대신 지난 날 로그 */
    if (albumFilter === 'diary') return;
    var trips = all.filter(function (t) { return albumFilter === 'all' || t.poster.type === albumFilter; });
    if (!trips.length) { al.appendChild(h('div', { class: 'lempty', text: albumFilter === 'note' ? '아직 쪽지는 없어. 집에 있는 날 하나 써 둘게.' : "아직 붙인 포스터가 없어. '산책 갈래?'를 눌러 봐." })); return; }
    var newest = null; all.forEach(function (t) { if (t.date === todayKey() && (!newest || (t.endedAt || 0) >= (newest.endedAt || 0))) newest = t; });
    var byDay = {}, days = [];
    trips.forEach(function (t) { if (!byDay[t.date]) { byDay[t.date] = []; days.push(t.date); } byDay[t.date].push(t); });
    days.forEach(function (d) {
      var g = h('div', { class: 'aday' }, [h('span', { class: 'adate', text: fmtDate(d) })]);
      byDay[d].forEach(function (t) {
        var note = t.poster.type === 'note', isNew = !!albumFresh[t.id] || (t.id === lastNewPoster && albumOpen());   /* 올라오는 카드: 앨범을 열 때 지난번 뒤로 붙은 것 · 열려 있는 동안 막 붙은 것 */
        var c = h('button', { type: 'button', class: 'pcard' + (note ? ' note' : '') + (isNew ? ' in' : '') + (newest && t.id === newest.id ? ' newest' : ''), 'data-trip': t.id, 'aria-label': (t.poster.title || '포스터') + ' · ' + (t.poster.line || ''), 'data-raw-attr': rawBy(t) || posterTitleRaw(t) ? 'aria-label' : null, html: note ? posterSVG(t, 84, 112) : posterSVG(t, 108, 144) });   /* 이름표에 모델·사람이 쓴 한 줄 (그대로) */
        if (isNew) c.style.setProperty('--rot', ((mkRng(t.seed >>> 0)() * 6) - 3).toFixed(1) + 'deg');   /* 최종 각도 ±3° (GF R15) */
        c.addEventListener('click', function () { openPoster(t.id); });
        g.appendChild(c);
      });
      al.appendChild(g);
    });
    lastNewPoster = null; albumFresh = {};   /* 새 포스터는 한 번만 올라온다. 저장된 건 즉시 (GF R17) */
    al.scrollLeft = al.scrollWidth;
  }
  /* ── 추억 앨범 시트 · 장면 오른쪽 위 앨범 아이콘 (DESIGN §6.3 · §7.2) ──
     점: 지난번에 앨범을 연 뒤(settings.albumSeen = 그때까지 붙은 포스터의 마지막 endedAt) 포스터가 붙었으면 작은 점 하나. 숫자 없음, 열면(닫을 때도) 사라진다.
     화면 낭독기는 이름 '추억 앨범' 그대로, 설명(aria-describedby)으로 '새로 붙은 포스터가 있어' */
  function albumOpen() { var d = $('album-sheet'); return !!(d && d.open); }
  function posterEnds() { return postersEnd(S.trips); }
  function albumNew() { var seen = S.settings.albumSeen || 0; return S.trips.some(function (t) { return t.poster && t.status === 'done' && (t.endedAt || 0) > seen; }); }
  var flyingPoster = 0;
  function renderAlbumBtn() {
    var b = $('btn-album'); if (!b) return;
    b.hidden = !(S.trips.some(function (t) { return t.poster && t.status === 'done'; }) || S.curiosityNotes.length || hasDiary());
    var on = !flyingPoster && !albumOpen() && albumNew(), dot = b.querySelector('.ib-dot'), d = $('album-new');
    if (dot) dot.hidden = !on;
    if (d) d.textContent = on ? '새로 붙은 포스터가 있어' : '';
  }
  function markAlbumSeen() { var m = posterEnds(); if (m > (S.settings.albumSeen || 0)) { S.settings.albumSeen = m; save(); } renderAlbumBtn(); }
  function openAlbum() {
    var d = $('album-sheet'); if (!d) return;
    if (!d.open) {
      sheetDragReset(d); d._openedAt = performance.now();
      var seen = S.settings.albumSeen || 0;
      albumFresh = {}; S.trips.forEach(function (t) { if (t.poster && t.status === 'done' && (t.endedAt || 0) > seen) albumFresh[t.id] = 1; });
    }
    showDialog(d);
    renderAlbum(); markAlbumSeen();
  }
  /* 새 포스터가 앨범 아이콘으로 날아간다: 문어 머리 위(없으면 장면 가운데)에서 아이콘까지 작은 포스터 하나, 6칸 계단(80 ms × 6 = 480 ms, ≤ 0.6 s).
     칸마다 정수 px(픽셀 테마는 2px 격자)에 서고 사이 값은 없다. 모션 줄이기면 날지 않고 점만. 닿으면 점이 켜진다.
     창(앨범 · 설정 · 포스터 · 놀이방)이 열려 있으면 날지 않는다 — 막 뒤에서 보이지 않게 지나가기만 하니까. 앨범이 열려 있으면 카드가 시트 안에서 올라오고, 다른 창이면 닫았을 때 점이 있다 */
  function flyToAlbum(trip) {
    var b = $('btn-album'), sc = $('scene');
    renderAlbumBtn();
    if (!b || !sc || b.hidden || reduced() || typeof sc.animate !== 'function' || document.querySelector('dialog[open]') || inPlay()) return Promise.resolve();   /* 놀이방에선 날지 않는다 (점만) */
    var box = b.querySelector('.snd-box') || b, sr = sc.getBoundingClientRect(), br = box.getBoundingClientRect();
    if (!sr.width || !br.width) return Promise.resolve();
    var W2 = 16, H2 = 21, g = pixelFont() ? 2 : 1, N = 6, kf = [], pos = null;
    try { pos = scene && typeof scene.octScreenPos === 'function' ? scene.octScreenPos() : null; } catch (e) { pos = null; }
    var x0 = pos && isFinite(pos.x) ? pos.x - sr.left - W2 / 2 : sr.width / 2 - W2 / 2, y0 = pos && isFinite(pos.y) ? pos.y - sr.top - H2 : sr.height * 0.4;
    x0 = clamp(x0, 0, sr.width - W2); y0 = clamp(y0, 0, sr.height - H2);
    var x1 = br.left - sr.left + (br.width - W2) / 2, y1 = br.top - sr.top + (br.height - H2) / 2;
    for (var i = 0; i <= N; i++) {
      var t = i / N, e = 1 - (1 - t) * (1 - t), x = x0 + (x1 - x0) * e, y = y0 + (y1 - y0) * e - 16 * Math.sin(Math.PI * t);
      kf.push({ transform: 'translate(' + Math.round(x / g) * g + 'px, ' + Math.round(y / g) * g + 'px)', offset: t, easing: 'steps(1, end)' });
    }
    var el = h('div', { class: 'album-fly', 'aria-hidden': 'true', html: posterSVG(trip, W2, H2, { mini: true, noExternal: true }) });
    sc.appendChild(el); flyingPoster++; renderAlbumBtn();
    var ms = 480 * speed();
    return new Promise(function (res) {
      var fin = false;
      function done() { if (fin) return; fin = true; el.remove(); flyingPoster = Math.max(0, flyingPoster - 1); renderAlbumBtn(); res(); }
      try { var a = el.animate(kf, { duration: ms, fill: 'forwards' }); a.onfinish = done; a.oncancel = done; } catch (e2) { done(); return; }
      setTimeout(done, ms + 400);   /* 탭이 숨어 애니메이션이 멈춰도 점은 켜진다 */
    });
  }
  /* 호기심 메모 한 줄 (앨범 '남긴 메모'): “남긴 말 그대로” (60자 넘으면 … — 누르면 전체 · 다시 누르면 접기) + 누가 남겼나 · 날짜 · 어느 산책.
     내려놓은 메모는 '내려놓은 메모', 다음 산책 두뇌 입력에 같이 가는 메모(active 최근 3개, notesForBrain 과 같은 목록)는 '다음 산책에 같이 가' 표시를 단다 */
  var NOTE_BY = { model: '문어(모델)가 남김', 'demo-rules': '데모 규칙', human: '사람이 조작' };
  var NOTE_RAW = { model: 'model', human: 'human' };   /* 남의 글 표시 (data-raw) — 데모 규칙 메모는 우리 글이라 검사 대상 */
  function noteWhen(n) {
    var t = tripById(n.session), dk = t ? t.date : (n.at ? dateKey(new Date(n.at)) : ''), ord = t ? tripOrdinal(t) : null;
    return [dk ? fmtDate(dk) : '', ord ? ord + '번째 뽈뽈' : t && t.kind === 'home' ? '집에 있던 날' : ''].filter(Boolean).join(' · ');
  }
  function noteItem(n, next) {
    var full = n.text, short = clip(full, NOTE_SHOW), cut = short !== full, tx, by = NOTE_RAW[n.by] || null;
    function body(t) { return ['“', rawSpan(t, by), '”']; }   /* 남긴 말 그대로 — 모델·사람 메모는 data-raw */
    if (cut) {
      tx = h('button', { type: 'button', class: 'cn-text', 'aria-expanded': 'false' }, body(short));
      tx.addEventListener('click', function () { var on = tx.getAttribute('aria-expanded') !== 'true'; tx.setAttribute('aria-expanded', String(on)); tx.textContent = ''; body(on ? full : short).forEach(function (x) { tx.appendChild(typeof x === 'string' ? document.createTextNode(x) : x); }); });
    } else tx = h('span', { class: 'cn-text' }, body(full));
    var meta = [(NOTE_BY[n.by] || NOTE_BY['demo-rules']) + (n.by === 'model' && n.model ? ' (' + n.model + ')' : ''), noteWhen(n)].filter(Boolean).join(' · ');
    var li = h('li', { class: 'cnote' + (n.status === 'set_down' ? ' down' : ''), 'data-note': n.id }, [tx, h('span', { class: 'cn-meta', text: meta })]);
    if (n.status === 'set_down') li.insertBefore(h('span', { class: 'cn-tag', text: '내려놓은 메모' }), tx);
    else if (next) li.insertBefore(h('span', { class: 'cn-tag next', text: '다음 산책에 같이 가' }), tx);
    return li;
  }
  /* 앨범 '남긴 메모': 메모 전부, 새것부터 (내려놓은 것도 그대로 — 원칙 4). 다음 산책에 같이 가는 것엔 표시 (내려놓기 버튼은 없다 — 내려놓는 건 문어 자신만). 전체 보기에서만 */
  function renderAlbumNotes() {
    var box = $('album-notes'); if (!box) return;
    box.innerHTML = '';
    var all = S.curiosityNotes.slice().reverse();
    if (!all.length || albumFilter !== 'all') return;
    var next = {}; activeNotes(NOTES_PASS).forEach(function (x) { next[x.id] = 1; });
    var ul = h('ul', { class: 'cnote-list' });
    all.forEach(function (n) { ul.appendChild(noteItem(n, !!next[n.id])); });
    box.appendChild(h('h3', { text: '남긴 메모' })); box.appendChild(ul);
  }
  /* 앨범 맨 위 '문어의 요즘' (예전 방 보기에서): 자꾸 가는 코너 · 여러 번 간 방, 많아야 두 줄. 줄마다 그 코너(data-corner) → 픽셀 테마에선 기억 아이콘 (js/ui-art.js) */
  function recentLines() {
    var out = [], tc = topCorners(), tv = topVisited();
    tc.slice(0, tv ? 1 : 2).forEach(function (c) { out.push({ corner: c, text: typeof STR.affinityCorner === 'function' ? STR.affinityCorner(cornerName(c)) : '요즘 ' + cornerName(c) + ' 방을 자꾸 가네' }); });   /* 자꾸 가는 코너 하나 + 여러 번 간 방 하나 (방이 없으면 코너 둘) */
    /* 방 이름을 문장에 넣을 땐 world 의 규칙으로: '느린 글의 방은' ('방 방은' 안 되게) · 숫자 이름 '0' → '0이라는 방은' */
    if (tv) { var nd = nodeOf(tv.id), nm = nd ? nd.name : tv.id; out.push({ corner: nd && nd.corner, text: typeof STR.affinityNode === 'function' ? STR.affinityNode(nm, tv.n) : (/방$/.test(nm) ? nm + '은 ' : nm + ' 방은 ') + tv.n + '번 왔어' }); }
    return out.slice(0, 2);
  }
  function renderAlbumRecent() {
    var box = $('al-recent'); if (!box) return;
    box.innerHTML = '';
    var lines = recentLines();
    box.appendChild(h('h3', { text: '문어의 요즘' }));
    if (!lines.length) box.appendChild(h('p', { class: 'dim', text: '아직 어디가 좋은지 몰라' }));
    lines.forEach(function (l) { box.appendChild(h('p', { 'data-corner': l.corner || null, text: l.text })); });
  }
  /* 앨범 › 일기: 지난 날 로그 (오늘 칸은 아래 '오늘의 산책'). 날마다 접힘, 새 날이 위 · 가장 새 날만 펼쳐 둔다 (나머지 행은 펼칠 때 만든다). 읽기만 */
  /* 지난 날: 산책 날짜와 미용실 물음 날짜를 합친다 (물음만 있는 날도 일기에 — docs/SALON.md §3.7) */
  function diaryDays() {
    var today = todayKey(), byDay = {}, asks = {}, seen = {};
    S.trips.forEach(function (t) { if (t.date === today || !(t.status === 'done' || t.by === 'legacy')) return; (byDay[t.date] = byDay[t.date] || []).push(t); seen[t.date] = 1; });
    salonAsks().forEach(function (a) { if (!a || a.date === today || a.status === 'dropped' || typeof a.date !== 'string') return; (asks[a.date] = asks[a.date] || []).push(a); seen[a.date] = 1; });
    return { byDay: byDay, asks: asks, days: Object.keys(seen).sort().reverse() };
  }
  function hasDiary() { var today = todayKey(); return S.trips.some(function (t) { return t.date !== today && (t.status === 'done' || t.by === 'legacy'); }) || salonAsks().some(function (a) { return a && a.date !== today && a.status !== 'dropped'; }); }
  function renderDiary() {
    var box = $('album-diary'); if (!box) return;
    box.innerHTML = ''; box.hidden = albumFilter !== 'diary';
    if (box.hidden) return;
    var D = diaryDays(), yest = keyAdd(todayKey(), -1);
    if (!D.days.length) { box.appendChild(h('div', { class: 'lempty', text: '아직 지난 날이 없어' })); return; }
    D.days.forEach(function (d, i) {
      var trips = D.byDay[d] || [], asks = D.asks[d] || [];   /* 날 머리 '· N건' = 산책 + 물음 */
      var det = h('details', { class: 'dday', 'data-day': d }, [h('summary', { text: (d === yest ? '어제' : fmtDate(d)) + ' · ' + (trips.length + asks.length) + '건' })]), filled = false;
      function fill() { if (filled) return; filled = true; var body = h('div', { class: 'dday-rows' }); dayRows(trips, asks).forEach(function (r) { body.appendChild(r); }); det.appendChild(body); }
      det.addEventListener('toggle', function () { if (det.open) fill(); });
      if (i === 0) { fill(); det.open = true; }
      box.appendChild(det);
    });
  }
  var lastNewPoster = null;
  /* 앨범 카드 누름 모양 (docs/research/polish-from-starred-repos.md 2 · 수치는 material-web ripple: TOUCH_DELAY_MS 150 · MINIMUM_PRESS_MS 225).
     #album 은 가로 스크롤이라, 엄지로 훑을 때 지나가는 카드마다 눌림이 번쩍이지 않게 :active 대신 .down 을 쓴다 (모양은 css/style.css .pcard.down).
     터치: 150ms 뒤에 붙인다. 그 전에 pointercancel · 스크롤 · 8px 넘는 움직임이 있으면 안 붙인다. 150ms 전에 떼면 뗄 때 붙인다.
     마우스·펜: 바로 붙인다. Space 를 누르는 동안도 (예전 :active 와 같게). 붙으면 최소 225ms 유지하고 뗀다.
     클릭(포스터 열기)·키보드 Enter/Space 는 손대지 않는다 — 모양만 바꾼다. #btn-go 같은 다른 버튼은 그대로 :active */
  var PRESS_DELAY = 150, PRESS_MIN = 225, PRESS_SLOP = 8;
  function bindAlbumPress() {
    var al = $('album'); if (!al) return;
    var p = null;   /* 지금 누르는 카드: { id(포인터 · 'key'), card, x, y, timer, at(.down 붙인 때) } */
    function on(q) { if (!q.at) { q.at = q.card._downAt = performance.now(); q.card.classList.add('down'); } }
    /* 최소 225ms 를 채운 뒤 뗀다 (타이머가 조금 일찍 깨면 남은 만큼 더). 그새 같은 카드를 다시 눌렀으면 그 누름이 뗀다 */
    function off(c, at) {
      if (c._downAt !== at) return;
      var left = PRESS_MIN - (performance.now() - at);
      if (left > 0) setTimeout(function () { off(c, at); }, Math.ceil(left));
      else { c._downAt = 0; c.classList.remove('down'); }
    }
    function end(lift) {
      var q = p; if (!q) return;
      p = null; clearTimeout(q.timer);
      if (lift) on(q);   /* 150ms 전에 뗀 탭도 눌림이 보이게 */
      if (q.at) off(q.card, q.at);
    }
    al.addEventListener('pointerdown', function (e) {
      var card = e.target.closest ? e.target.closest('.pcard') : null;
      end(false);
      if (!card || !al.contains(card) || !e.isPrimary || e.button !== 0) return;
      var q = p = { id: e.pointerId, card: card, x: e.clientX, y: e.clientY, timer: 0, at: 0 };
      if (e.pointerType === 'touch') q.timer = setTimeout(function () { if (p === q) on(q); }, PRESS_DELAY);
      else on(q);
    });
    document.addEventListener('pointermove', function (e) {
      if (p && e.pointerId === p.id && !p.at && Math.hypot(e.clientX - p.x, e.clientY - p.y) > PRESS_SLOP) end(false);
    }, true);
    document.addEventListener('pointerup', function (e) { if (p && e.pointerId === p.id) end(true); }, true);
    document.addEventListener('pointercancel', function (e) { if (p && e.pointerId === p.id) end(false); }, true);
    /* 스크롤: 앨범 자신이나 페이지가 굴러가면 (다른 곳 — 로그 자동 스크롤 같은 — 은 상관없다) */
    document.addEventListener('scroll', function (e) { if (p && p.id !== 'key' && (e.target === document || (e.target.contains && e.target.contains(p.card)))) end(false); }, true);
    al.addEventListener('keydown', function (e) {
      if ((e.key === ' ' || e.key === 'Spacebar') && !e.repeat && e.target.classList && e.target.classList.contains('pcard')) { end(false); p = { id: 'key', card: e.target, timer: 0, at: 0 }; on(p); }
    });
    al.addEventListener('keyup', function (e) { if (p && p.id === 'key' && (e.key === ' ' || e.key === 'Spacebar')) end(false); });
    al.addEventListener('focusout', function () { if (p && p.id === 'key') end(false); });
  }
  function renderSouvenirs() {
    scene.setSouvenirs(S.room.souvenirs.slice(-8).map(function (sv) {
      var def = W && W.souvenirs && W.souvenirs[sv.id];
      return { id: sv.id, tripId: sv.tripId, name: def ? def.name : sv.id, img: assetPath('souvenir.' + sv.id), icon: window.UIART && UIART.iconSrc && def ? UIART.iconSrc('souvenir/' + sv.id) : null };   /* 그림이 안 오면 16×16 기념품 아이콘 (2D 선반 · js/scene2d.js) — 이모지는 쓰지 않는다 */
    }));
  }
  function renderAll() { renderStatus(false); renderScene(); renderSouvenirs(); renderWall(); renderAlbum(); renderLog(); renderShelf(); renderBagChip(); applyGarden(); applyDye(); var bs = $('bag-sheet'); if (bs && bs.open) renderBag(); var sw = $('sew-sheet'); if (sw && sw.open) renderSew(); }   /* 살림(조개 꼬리표 · 바깥 텃밭 · 옷 색)도 — 초기화 · 불러오기 · 다른 탭 뒤 (11-12 검증) · 열린 재봉틀 시트도 (11-11) */
  /* 큰 도서관 '오늘의 서가' — 날짜로 정해지는 8편 (js/shelf.js, MCP 서버와 같은 뽑기). 고른 이가 없는 무작위라 문어 마음을 대신 말하지 않는다 */
  function renderShelf() {
    var box = $('shelf-today'), ul = $('shelf-list'); if (!box || !ul) return;
    if (typeof SHELF === 'undefined' || !SHELF.pool || !SHELF.pool.length || !B) { box.hidden = true; return; }
    ul.innerHTML = SHELF.today(todayKey(), B, 8).map(function (t) {
      return '<li><a href="https://ko.wikipedia.org/wiki/' + encodeURIComponent(t.replace(/ /g, '_')) + '" target="_blank" rel="noopener">' + rawH(t, 'wiki') + '</a></li>';   /* 위키백과 제목 그대로 (남의 글) */
    }).join('');
    box.hidden = false;
  }

  /* ───────────────────────── dialogs: poster · settings · name ───────────────────────── */
  var openTripId = null, flippedOnce = {};
  function openPoster(tripId, back) {
    var t = tripById(tripId); if (!t || !t.poster) return;
    openTripId = tripId;
    var dlg = $('poster-dialog'), fl = $('flipper');
    $('pd-front').innerHTML = posterSVG(t, 300, 400);
    $('pd-text').innerHTML = inspectHTML(t);
    $('pd-back').innerHTML = receiptHTML(t);
    fl.classList.toggle('note', t.poster.type === 'note');
    fl.classList.toggle('again', !!flippedOnce[tripId]);   /* 같은 포스터 두 번째 펼침은 300ms (GF R6) */
    setReceiptOpen(!!back);
    if (back) flippedOnce[tripId] = true;
    $('pd-save').hidden = false;
    var hd = $('pd-h'), tb = t.poster.title ? posterTitleRaw(t) : null;
    if (hd) { hd.textContent = t.poster.title || (t.poster.type === 'note' ? '쪽지' : '포스터'); if (tb) hd.setAttribute('data-raw', tb); else hd.removeAttribute('data-raw'); }   /* 화면 낭독기가 처음 읽는 제목 (보이지 않음) · 위키 제목 · 모델이 준 이름 · 옛 제목은 그대로 */
    if (window.UIART) UIART.onInspect(t);
    dlg.scrollTop = 0;
    showDialog(dlg);
  }
  /* 일기 전체 보기: .flip = 두 칸 아래로 뒷면 일기(코드 이름 receipt, 링크 포함)를 펼친 상태 */
  function setReceiptOpen(on) {
    var fl = $('flipper'), b = $('pd-flip');
    fl.classList.toggle('flip', on); if (on) questMark('diary');
    b.setAttribute('aria-expanded', on ? 'true' : 'false'); b.textContent = on ? '일기 접기' : '일기 전체 보기';
  }
  function flipPoster() {
    var fl = $('flipper'), on = !fl.classList.contains('flip');
    setReceiptOpen(on);
    if (openTripId) { flippedOnce[openTripId] = true; }
    setTimeout(function () { fl.classList.add('again'); }, 600 * speed());   /* 이번 펼침이 끝난 뒤부터 짧게 */
    if (!S.settings.flipped) { S.settings.flipped = true; save(); }
    if (on) setTimeout(function () { var bk = $('pd-back'); if (bk && bk.scrollIntoView) bk.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' }); }, 30);
  }
  /* <dialog> 열기: 연 요소를 기억해 닫힐 때 포커스를 돌려준다. closedby="any" 는 지원 브라우저에서만 */
  function showDialog(dlg) {
    if (!dlg) return;
    dlg._opener = document.activeElement;
    if (!dlg.open) {
      dlg.showModal();
      /* showModal 의 첫 포커스는 첫 버튼 — 픽셀 테마 폰에선 그게 대화상자 아래쪽이라 상자를 끝까지 굴려 놓고, 맨 위로 되돌리면 포커스가 화면 밖에 남는다.
         → 맨 위 제목(.dlg-top, tabindex=-1)에 포커스를 두고 맨 위에서 연다. 화면 낭독기는 제목부터 읽고, 첫 Tab 이 첫 버튼으로 간다 */
      var top = dlg.querySelector('.dlg-top');
      if (top) { try { top.focus({ preventScroll: true }); } catch (e) { top.focus(); } }
      dlg.scrollTop = 0;
    }
    var t = $('toast'); if (t && t.classList.contains('show')) raiseToast(t);   /* 떠 있던 토스트는 새 대화상자 위로 */
  }
  /* 대화상자 바깥(백드롭) 클릭만 닫기: 대화상자 자신의 안쪽 여백을 눌러도 target 이 dialog 라 → 좌표가 상자 밖일 때만 */
  function clickedOutside(d, e) {
    if (e.target !== d) return false;
    var r = d.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  }
  function bindDialogs() {
    var supportsClosedBy = (typeof HTMLDialogElement !== 'undefined') && ('closedBy' in HTMLDialogElement.prototype);
    ['poster-dialog', 'settings-sheet', 'album-sheet', 'look-sheet', 'log-sheet', 'salon-sheet', 'name-dialog'].forEach(function (id) {
      var d = $(id); if (!d) return;
      if (supportsClosedBy && id !== 'name-dialog') d.setAttribute('closedby', 'any');
      d.addEventListener('close', function () {
        var o = d._opener; d._opener = null;
        /* 연 요소가 그사이 다시 그려져 사라졌으면 (앨범을 열어 둔 채 산책이 끝나 카드가 새로 그려짐) 같은 여행의 새 카드로, 그것도 없으면 아직 열린 창의 제목으로 — 포커스가 body 로 빠지지 않게 */
        if (o && !document.contains(o)) {
          var tid = o.getAttribute ? o.getAttribute('data-trip') : null, alt = null;
          if (tid) alt = [].filter.call(document.querySelectorAll('#album .pcard'), function (c) { return c.getAttribute('data-trip') === tid; })[0] || null;
          if (!alt) { var still = [].filter.call(document.querySelectorAll('dialog[open]'), function (x) { return x !== d; }).pop(); alt = still ? still.querySelector('.dlg-top') : null; }
          o = alt;
        }
        if (o && o.focus && document.contains(o) && o !== document.body) { try { o.focus({ preventScroll: true }); } catch (e) { o.focus(); } }
      });
    });
    /* 어느 대화상자든(js/runner.js 의 달리기 창 포함) 닫힐 때 토스트가 그 안에 있었으면 꺼낸다 → body, 다른 대화상자가 아직 열려 있으면 그리로.
       close 는 버블링하지 않아서 document 의 캡처 단계에서 받는다 (닫힌 대화상자 안에 남으면 다음 토스트가 안 보인다) */
    document.addEventListener('close', function (e) {
      var t = $('toast'), d = e.target;
      if (t && d && d.tagName === 'DIALOG' && d.contains(t)) raiseToast(t);
      if (!window.MutationObserver && d && d.tagName === 'DIALOG') sheetShutAt = performance.now();
    }, true);
    /* 대화상자가 닫힌 때를 적는다 (큰 버튼의 SHEET_SETTLE — goTap). close 이벤트는 닫힌 뒤 따로 오는 일(task)이라 바쁜 기기에선 둘째 톡의 click 보다 늦을 수 있다
       → open 속성이 빠지는 것을 지켜본다 (닫은 그 일이 끝나자마자 · 닫기 단추 · 바깥 톡 · Esc · 끌어 닫기 · 코드가 닫음 모두). 나중에 생기는 대화상자(달리기 창)도 본다 */
    if (window.MutationObserver) new MutationObserver(function (recs) {
      var shut = false, opened = false;
      for (var i = 0; i < recs.length; i++) { var x = recs[i].target; if (x && x.tagName === 'DIALOG') { if (x.open) opened = true; else shut = true; } }
      if (shut) sheetShutAt = performance.now();
      /* 창이 열리면 누르고 있던 걷기 키도 놓는다 (창을 떠날 때의 blur 와 같다): stickKeyIgnored 는 창이 열린 뒤의 새 누름만 막아서, 방향키를 누른 채 거울을 누르면 내 캐릭터가 열린 시트 뒤에서 계속 걸었다 (검증 11-10 E9) */
      if (opened && Object.keys(stk.keys).length) { stk.keys = {}; stickRelease(); }
    }).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['open'] });
    /* 토스트를 app 의 toast() 를 거치지 않고 띄우는 곳(js/audio.js 의 소리 안내)도: 지금 열린 대화상자(없으면 body)가 아닌 곳에 있으면 옮긴다 */
    var t = $('toast');
    if (t && window.MutationObserver) {
      var lift = function () {
        if (t.classList.contains('row') && !t.querySelector('.t-txt')) { t.classList.remove('row'); toastRow = false; }   /* 다른 곳(audio.js)이 글을 바꿔 썼으면 한 줄 알림 모양을 벗긴다 */
        if (t.classList.contains('show') && t.parentNode !== (openDialog() || document.body)) raiseToast(t);
      };
      new MutationObserver(lift).observe(t, { attributes: true, attributeFilter: ['class'] });
      /* 대화상자가 새로 열릴 때도: js/runner.js 는 showDialog 를 거치지 않고 showModal 을 바로 부른다 → 떠 있던 토스트가 그 밑에 깔리지 않게 새 대화상자 위로 */
      new MutationObserver(function (ms) { if (ms.some(function (m) { return m.target.tagName === 'DIALOG'; })) lift(); }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
    }
  }
  function svgToDataURI(svg) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); }
  function fetchAsDataURL(url) {
    return fetch(url, { mode: 'cors' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.blob(); })
      .then(function (b) { return new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.onerror = rej; fr.readAsDataURL(b); }); });
  }
  function savePNG() {
    var t = tripById(openTripId); if (!t) return Promise.resolve();
    var btn = $('pd-save'); btn.disabled = true;
    var p = t.poster || {};
    var stk = stickerSrc(t);
    var jobs = [
      (/^data:/.test(scenePath(p.scene)) ? Promise.resolve(scenePath(p.scene)) : fetchAsDataURL(scenePath(p.scene)).catch(function () { return null; })),
      (p.thumb && p.thumb.url && S.settings.thumbs !== false) ? fetchAsDataURL(p.thumb.url).catch(function () { return null; }) : Promise.resolve(null),
      (!stk || /^data:/.test(stk)) ? Promise.resolve(stk) : fetchAsDataURL(stk).catch(function () { return null; })   /* 스티커 픽셀 그림 (그림으로 굽는 SVG 는 밖의 파일을 못 읽는다) */
    ];
    return Promise.all([document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(), jobs[0], jobs[1], jobs[2]]).then(function (res) {
      var svg = posterSVG(t, 600, 800, { inlineScene: res[1], inlineThumb: res[2], inlineSticker: res[3], noExternal: true });
      return new Promise(function (resolve) {
        var img = new Image();
        img.onload = function () {
          var cv = document.createElement('canvas'); cv.width = 600; cv.height = 800;
          cv.getContext('2d').drawImage(img, 0, 0);
          cv.toBlob(function (blob) {
            if (!blob) { resolve(false); return; }
            var url = URL.createObjectURL(blob), a = h('a', { href: url, download: 'ppolppol_' + t.id + '.png' });
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
            resolve(true);
          }, 'image/png');
        };
        img.onerror = function () { resolve(false); };
        img.src = svgToDataURI(svg);
      });
    }).then(function (ok) { btn.disabled = false; toast(ok ? '이미지로 저장했어' : '이미지 저장이 안 됐어'); return ok; });
  }
  function topCorners() {
    var a = S.octopus.affinity || {};
    return Object.keys(a).filter(function (k) { return k !== 'wild' && a[k] > 0.3; }).sort(function (x, y) { return a[y] - a[x]; }).slice(0, 2);
  }
  function topVisited() {
    var v = S.octopus.visits || {}, best = null;
    Object.keys(v).forEach(function (k) { if (k !== 'door_out' && (!best || v[k] > v[best])) best = k; });
    return best && v[best] >= 2 ? { id: best, n: v[best] } : null;
  }
  /* ⚙ 설정 시트 (주인 11-07: 방 보기를 없애고 고르는 것만 여기로). 위에서부터 문어 색(거울이 생긴 뒤 안내 한 줄 — 주인 11-08 밤: 색은 처음 한 번만) · 소리(켜기 · 음악 · 효과음 — js/audio.js 가 room_sheet 훅으로 붙인다. 주인 11-08: 장면 위 스피커를 여기로) · 모션 · 픽셀 글꼴 · 포스터 썸네일 ·
     기록(작은 한 줄 + 내보내기 · 불러오기 · 전체 초기화 2단계) · 누가 고르나(한 줄) · 팔레트(개발 모드만). 글은 짧게 — 사람들은 읽는 걸 싫어한다 */
  /* 몸 색 프리셋 6 (순서 · 값은 js/salon.js PRESETS 하나 — 첫 실행 창 · 개발용 칸 · 미용실 병이 같이 쓴다). short = 단추 · aria 이름, name = 문장 속 이름 */
  var COLOR_PRESETS = (SAL && SAL.PRESETS) || [{ hex: '#e8463c', short: '빨강', name: '빨간색' }, { hex: '#f08a3c', short: '주황', name: '주황색' }, { hex: '#9a5cc8', short: '보라', name: '보라색' },
    { hex: '#4a86d8', short: '파랑', name: '파란색' }, { hex: '#4fa868', short: '초록', name: '초록색' }, { hex: '#f07aa8', short: '분홍', name: '분홍색' }];
  /* 누가 고르나 (정직 표기): 앞 문장은 '데모' 말풍선과 같은 말. '고른 이:' 줄은 포스터·쪽지를 뒤집은 면(일기)과 미용실 로그 줄(꼬리 '데모 규칙' 등)에 있다 — 앨범의 '일기' 탭(지난 날 로그)과 헷갈리지 않게 자리를 말한다 */
  var WHO_LINE = '지금은 모델이 아니라 미리 만든 규칙이 골라. 고른 이는 포스터와 쪽지 뒷면, 미용실 줄에 적혀.';
  /* 설정 › 문어 색 (docs/SALON.md §1.2). 플레이어: 거울 전(등불 0–1칸)엔 칸 자체가 없고, 거울 뒤엔 제목 + 안내 한 줄뿐 (누르는 것 없음 — 색은 처음 한 번만 고르고, 그 뒤엔 미용실에서 문어에게 묻는다).
     ?dev=1 을 직접 붙인 탭(DEV_EXPLICIT)엔 그 아래 '개발용 · 바로 바꾸기' + 옛 슬라이더 + 프리셋 6: 슬라이더 input 은 장면만 미리 보이고(저장 없음),
     change(놓을 때) · 프리셋 누름이 setOctColor(hex, { how: 'dev', by: 'dev' }) 한 번 = 기록 한 줄. 시트를 닫으면 장면은 기록 색으로 (applyLook) */
  function colorRows(frag) {
    var mirror = mirrorUp(), T = SAL ? SAL.TEXT : null;
    if (!mirror && !DEV_EXPLICIT) return;
    frag.appendChild(h('h3', { id: 'set-color-h', text: T ? T.settingsHead : '문어 색' }));
    if (mirror && T) { var nm = S.octopus.name || T.octopus; frag.appendChild(h('p', { class: 'set-color', id: 'set-color', text: T.settings.replace('{name}', function () { return nm; }) })); }   /* 이름은 플레이어 글 그대로 ('$&' 같은 글자도 바꾸지 않게 함수로) */
    if (!DEV_EXPLICIT) return;
    function hueHex() { return hslHex(+hueIn.value, 0.76, 0.57); }
    function swatchOn(cur) { sw.querySelectorAll('.preset').forEach(function (b) { chipOn(b, b.dataset.hex === cur); }); }
    var hueIn = h('input', { type: 'range', id: 'set-hue', min: '0', max: '360', step: '1', 'aria-label': '문어 색상 (개발용)' });
    hueIn.value = String(hexHue(S.octopus.color));
    hueIn.addEventListener('input', function () { if (scene && !salonActive) { scene.setColor(hueHex(), { still: true }); refreshPortraits(); } swatchOn(null); });   /* 미리 보기만 (기록 · 저장 없음 · 미용실 연출 중엔 장면을 건드리지 않는다) */
    hueIn.addEventListener('change', function () { setOctColor(hueHex(), { how: 'dev', by: 'dev' }); swatchOn(S.octopus.color); });   /* 놓을 때 한 번 = 개발용 기록 한 줄 */
    var sw = h('div', { class: 'presets', role: 'group', 'aria-label': '색 프리셋 (개발용)' });
    COLOR_PRESETS.forEach(function (p) {
      var b = h('button', { type: 'button', class: 'preset', 'data-hex': p.hex, title: p.short, 'aria-label': p.short });
      b.style.background = p.hex;
      b.addEventListener('click', function () { setOctColor(p.hex, { how: 'dev', by: 'dev' }); hueIn.value = String(hexHue(p.hex)); swatchOn(S.octopus.color); });
      sw.appendChild(b);
    });
    swatchOn(S.octopus.color);
    frag.appendChild(h('p', { class: 'help set-dev', id: 'set-color-dev', text: '개발용 · 바로 바꾸기' }));
    frag.appendChild(h('div', { class: 'set hue-row' }, [hueIn]));
    frag.appendChild(sw);
  }
  function statsLine() {
    var reads = S.trips.reduce(function (n, t) { return n + ((t.receipt && t.receipt.counts && t.receipt.counts.read) | 0); }, 0);
    return '산책 ' + S.octopus.trips + ' · 함께한 날 ' + S.octopus.days.length + ' · 읽음 ' + reads;
  }
  /* ───── 내 Claude 와 연결 (원격 뽈뽈 방 · mcp/http.js) ─────
     방 열쇠는 서버가 만든다 (/api/room). 사람은 주소를 claude.ai 커넥터에 붙여 넣고, 문어가 대화에서 다녀온 산책은 /api/walks 로 가져와 재생한다 (고른 이: 모델).
     열쇠는 이 기기 기록 (settings.claudeRoom) 에만. 연결 끊기는 이 기기에서 잊는 것이다 (서버의 방은 그대로 — 그렇다고 적는다) */
  var CLAUDE_KEY_RE = /^[A-Za-z0-9_-]{32,64}$/;
  function claudeRoom() { var r = S.settings.claudeRoom; return r && CLAUDE_KEY_RE.test(r.key || '') ? r : null; }
  function claudeSection(frag) {
    frag.appendChild(h('h3', { text: '내 Claude 와 연결' }));
    var r = claudeRoom();
    if (!r) {
      frag.appendChild(h('p', { class: 'set-note', text: 'claude.ai (웹 · 모바일) 의 내 Claude 가 이 문어가 되어 산책해. 다녀온 산책은 여기서 재생돼.' }));
      var mk = h('button', { type: 'button', class: 'btn sm pressable', id: 'set-claude-make', text: '연결할 방 만들기' });
      mk.addEventListener('click', function () {
        mk.disabled = true;
        fetch('/api/room', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: S.octopus.name || '', lang: String(navigator.language || '') }) })   /* lang: 기기 언어 → 방의 언어 (문어가 그 언어로 쓴다) */
          .then(function (res) { return res.ok ? res.json() : null; })
          .then(function (j) {
            if (!j || !j.ok || !CLAUDE_KEY_RE.test(j.key || '')) { toast('지금은 방을 만들 수 없어. 조금 뒤에 다시 해 봐'); mk.disabled = false; return; }
            S.settings.claudeRoom = { key: j.key, mcp: String(j.mcp || ''), last: null }; save(); renderSettings();
          }).catch(function () { toast('지금은 방을 만들 수 없어 (연결 안 됨)'); mk.disabled = false; });
      });
      frag.appendChild(h('div', { class: 'btn-row' }, [mk]));
      return;
    }
    var url = h('input', { type: 'text', id: 'set-claude-url', readonly: 'readonly', 'aria-label': '커넥터 주소' }); url.value = r.mcp;
    var cp = h('button', { type: 'button', class: 'btn sm pressable', text: '주소 복사' });
    cp.addEventListener('click', function () { copyText(r.mcp); });
    frag.appendChild(h('p', { class: 'set-note', text: '커넥터 주소' }));
    frag.appendChild(url);
    frag.appendChild(h('p', { class: 'set-note', text: 'claude.ai › 설정 › 커넥터 › 커스텀 커넥터 추가에 이 주소를 붙여 넣어. 웹에서 한 번 넣으면 모바일 앱에서도 같이 써.' }));
    frag.appendChild(h('p', { class: 'set-note', text: '이 주소를 아는 사람은 이 방에 들어올 수 있어. 남에게 보여 주지 마. 방에는 산책 기록과 메모만 있어.' }));
    /* 방의 언어 — 문어가 남기는 글의 언어. 자동이면 Claude 와 나누는 대화의 언어를 따라간다 (모델이 look_room 의 lang 으로 알려 준다). 고르면 고정 (/api/lang, 모델은 못 바꾼다) */
    var LANG_NAMES = { ko: '한국어', en: 'English', ja: '日本語', de: 'Deutsch', fr: 'Français', es: 'Español', it: 'Italiano', pt: 'Português', id: 'Bahasa Indonesia', hi: 'हिन्दी' }, cur = LANG_NAMES[r.lang] ? r.lang : null;
    /* 첫 칸은 짧게: select 는 가장 긴 option 만큼 넓어져서, '자동 · Claude 대화를 따라감 (지금 한국어)' 는 360 px 폰에서 시트보다 114 px 넓었다. 자동이 무엇인지는 화면에서 이 select 바로 위의 한 줄이 말한다 ('자동이면 Claude 와 나누는 대화의 언어를 따라가') */
    var sel = h('select', { id: 'set-claude-lang', 'aria-label': '방의 언어' }, [h('option', { value: 'auto', text: '자동' + (cur && !r.pin ? ' (지금 ' + LANG_NAMES[cur] + ')' : '') })].concat(Object.keys(LANG_NAMES).map(function (k) { return h('option', { value: k, text: LANG_NAMES[k] }); })));
    sel.value = r.pin && cur ? cur : 'auto';
    sel.addEventListener('change', function () {
      var v = sel.value; sel.disabled = true;
      fetch('/api/lang/' + encodeURIComponent(r.key), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang: v }) })
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (j) { if (!j || !j.ok) { toast('지금은 언어를 바꿀 수 없어'); return; } r.lang = LANG_NAMES[j.lang] ? j.lang : null; r.pin = !!j.pin; save(); toast(j.pin ? '방의 언어를 정했어: ' + LANG_NAMES[j.lang] : '이제 Claude 대화의 언어를 따라가'); })
        .catch(function () { toast('지금은 언어를 바꿀 수 없어 (연결 안 됨)'); })
        .then(function () { sel.disabled = false; renderSettings(); });
    });
    frag.appendChild(h('p', { class: 'set-note', text: '방의 언어 — 문어가 남기는 글의 언어야. 자동이면 Claude 와 나누는 대화의 언어를 따라가.' }));
    frag.appendChild(sel);
    var sy = h('button', { type: 'button', class: 'btn sm pressable', text: '다녀온 산책 가져오기' });
    sy.addEventListener('click', function () { claudeSync(true); });
    var off = h('button', { type: 'button', class: 'btn sm pressable', text: '이 기기에서 연결 끊기' });
    off.addEventListener('click', function () {
      if (off.dataset.armed !== '1') { off.dataset.armed = '1'; off.textContent = '한 번 더 누르면 끊겨 (서버의 방은 남아)'; return; }
      S.settings.claudeRoom = null; save(); renderSettings();
    });
    frag.appendChild(h('div', { class: 'btn-row' }, [cp, sy, off]));
  }
  /* 먼 바다 문: 문어가 제안했으면 사람에게 한 번 (이 탭에서 한 번). 대답은 /api/far 로 — 모델은 이 대답을 대신할 수 없다 */
  var farPending = null, farShown = false;
  function farAsk() {
    var r = claudeRoom(), d = $('far-dialog'); if (!r || !farPending || farShown || !d) return;
    if (busy) return setTimeout(farAsk, 800);
    farShown = true;
    var ln = $('far-line');
    if (farPending.line) { ln.textContent = ''; ln.appendChild(h('span', { 'data-raw': 'model' }, [document.createTextNode(String(farPending.line).slice(0, 200))])); ln.appendChild(document.createTextNode(' · 문어가 쓴 말')); ln.hidden = false; } else ln.hidden = true;
    function answer(open) {
      $('far-open').disabled = $('far-keep').disabled = true;
      fetch('/api/far/' + encodeURIComponent(r.key), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ open: open }) })
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (j) { d.close(); farPending = null; toast(j && j.ok ? (open ? '먼 바다 문을 열었어' : '알았어. 그대로 둘게') : '지금은 대답을 전하지 못했어. 다음에 다시 물을게'); if (!(j && j.ok)) farShown = false; })
        .catch(function () { d.close(); farShown = false; toast('지금은 대답을 전하지 못했어 (연결 안 됨)'); })
        .then(function () { $('far-open').disabled = $('far-keep').disabled = false; });
    }
    $('far-open').onclick = function () { answer(true); };
    $('far-keep').onclick = function () { answer(false); };
    showDialog(d);
  }
  /* 가져오기: 새 산책을 한 개씩 재생한다 (APP.importEvents 와 같은 길 · 고른 이: 모델). 바쁘면 기다린다 */
  var claudeSyncing = false;
  function claudeSync(manual) {
    var r = claudeRoom(); if (!r || claudeSyncing) return;
    claudeSyncing = true;
    var q = r.last ? '?after=' + encodeURIComponent(r.last) : '';
    fetch('/api/walks/' + encodeURIComponent(r.key) + q, { cache: 'no-store' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (j) {
        if (!j || !j.ok) { claudeSyncing = false; if (manual) toast('지금은 가져올 수 없어'); return; }
        if (j.far && j.far.state === 'proposed') farPending = j.far;   /* 먼 바다 문 제안 — 산책 재생이 끝난 뒤 한 번 묻는다 */
        if (typeof j.lang === 'string' || j.lang === null) { r.lang = typeof j.lang === 'string' ? j.lang : null; r.pin = !!j.pin; save(); }   /* 방의 언어 (설정 화면이 보여 준다) */
        var list = (j.walks || []).filter(function (w) { return w && typeof w.file === 'string' && Array.isArray(w.events) && w.events.length; });
        if (!list.length) { claudeSyncing = false; if (manual && !farPending) toast('새로 다녀온 산책이 없어'); farAsk(); return; }
        (function next() {
          var w = list.shift();
          if (!w) { claudeSyncing = false; if (j.more) setTimeout(function () { claudeSync(false); }, 800); else farAsk(); return; }
          (function tryImport() {
            if (busy) return setTimeout(tryImport, 700);
            var ok = importEvents(w.events);
            r.last = w.file; save();   /* 재생에 실패한 기록도 다시 잡지 않게 넘긴다 (그대로 서버에 남아 있다) */
            if (!ok) return next();
            (function waitDone() { if (busy) return setTimeout(waitDone, 700); next(); })();
          })();
        })();
      }).catch(function () { claudeSyncing = false; if (manual) toast('지금은 가져올 수 없어 (연결 안 됨)'); });
  }
  /* ── 문어 선물 상자 (11-10 주인: "선물 상자 화면 · 내밀었을 때 문어의 선택 연출", docs/MINIGAMES.md §6·§7) ──
     사람은 **내밀기만** 한다. 쓸지 말지는 문어가 정한다 — 지금은 데모 규칙(시드: 날짜 · 코스튬 · 몇 번째 내밀기 · 이름)이 고르고, 그 사실을 그대로 적는다 ('데모 규칙이 고름').
     안 써도 시무룩한 연출 · 다시 조르는 문구 없음. 상으로 받은 것(종이 왕관 · 황제 망토)은 다락방 달리기 주간 상을 받았을 때만 상자에 들어온다 */
  var giftPick = null, giftBusy = false;
  function giftAwards() { try { var r = JSON.parse(localStorage.getItem('ppolppol_runner') || '{}'), a = (r.net && r.net.awards) || {}; return { paper_crown: !!(a.paper_crown && a.paper_crown.length), emperor_cape: !!(a.emperor_cape && a.emperor_cape.length) }; } catch (e) { return {}; } }
  function giftList() { var C = (typeof SCENE3D !== 'undefined' && Array.isArray(SCENE3D.COSTUMES)) ? SCENE3D.COSTUMES : [], aw = giftAwards(); return C.filter(function (c) { return !c.award || aw[c.id]; }); }
  function giftWear() { return isObj(S.settings.octWear) ? S.settings.octWear : {}; }
  function giftOffer(id) {   /* id = 코스튬 | null('맨머리도 괜찮아' — 벗어도 된다고 알려 주기) */
    if (giftBusy) return;
    var name = S.octopus.name || '문어', list = giftList(), c = null; list.forEach(function (x) { if (x.id === id) c = x; });
    if (sceneMode !== '3d' || !scene || typeof scene.setOctWear !== 'function') { toast('지금 화면에서는 내밀 수 없어'); return; }
    if (oct.state === 'away' || busy) { toast(name + '가 나가 있어'); return; }
    if (oct.state === 'sleep') { toast(name + '가 자고 있어'); return; }
    var wear = Object.assign({}, giftWear());
    if (!c && !wear.head && !wear.back) { toast(name + '는 아무것도 안 쓰고 있어'); return; }
    var sh = $('settings-sheet'); if (sh && sh.open) sh.close();
    /* 11-11: 문어의 대답은 그날 하루 그대로 선다 — 같은 것을 같은 날 다시 내밀어도 주사위를 새로 굴리지 않는다 (예전엔 내밀 때마다 새 주사위라, 거절해도 몇 번 누르면 '쓰기로 했어' 가 나왔다 = 문어의 선택이 아니었다).
       다른 것은 그날에도 내밀 수 있다. 시드에서 '몇 번째 누름' 을 빼서 같은 날 · 같은 물건이면 답이 같다 */
    var gk = c ? c.id : 'off', ga = isObj(S.settings.giftAsked) && S.settings.giftAsked.day === todayKey() && isObj(S.settings.giftAsked.ids) ? S.settings.giftAsked : (S.settings.giftAsked = { day: todayKey(), ids: {} });   /* ids 없는 기록(손으로 고친 · 남의 빌드) = 오늘 아무것도 안 물어봄 (11-12 검증 C16) */
    if (ga.ids[gk]) { toast('오늘은 이미 물어봤어. 내일 다시 물어볼 수 있어'); return; }
    ga.ids[gk] = 1;
    /* 11-12 (검증 F16): 답은 누른 순간에 정해 물어봤다는 표시와 같은 저장에 (쓰기로 했으면 쓰는 것까지) — 1.3 s 틈에 새로고침해도 물음만 쓰이고 답이 없는 일이 없게. 틈 뒤엔 보여 주기만 */
    var rng = mkRng(B ? B.hashSeed('gift', todayKey(), gk, name) : hash('gift|' + todayKey() + '|' + gk + '|' + name)), yes = rng() < (c ? 0.65 : 0.8), line;
    if (c) {
      if (yes) { wear[c.slot] = c.id; line = name + '가 ' + c.name + (c.slot === 'back' ? ' 두르기로 했어.' : ' 쓰기로 했어.'); }
      else line = name + '는 ' + c.name + (c.slot === 'back' ? ' 안 두르기로 했어.' : ' 안 쓰기로 했어.');
    } else {
      if (yes) { wear = {}; line = name + '가 옷장에 넣어 두기로 했어.'; } else line = name + '는 그대로 쓰고 있기로 했어.';
    }
    if (yes) S.settings.octWear = wear;
    giftBusy = true; S.settings.giftN = (S.settings.giftN | 0) + 1; save();   /* 11-12 (검증 OW-6): questMark('gift') 는 뺐다 — '선물' 은 이번 주 할 일이 아니다 (66c8110). 11-11 (검증 W12): 물어본 것은 바로 저장 — 1.3 s 틈의 새로고침 · 다른 탭이 같은 물음을 또 연출하지 않게 */
    expressRow('curious'); bubble('…', 1200, 'think');   /* 들여다보는 틈 1.3 s — 고르는 과정을 보여 준다 */
    setTimeout(function () {
      giftBusy = false;
      if (yes) { scene.setOctWear(wear); refreshPortraits(); expressRow('happy'); } else expressRow('idle');   /* 11-11 (검증 W2): 안 쓴다는 답은 보통 얼굴로 (반눈 calm 은 시무룩해 보인다 — 미용실 '그대로' 와 같게, docs/SALON.md §3.4) */
      appendLogRow(ensureTodaySection(), logRow('선물', line + ' (데모 규칙이 고름)', 'c-amber', true));
      toast(line);
    }, 1300);
  }
  function renderGift(frag) {
    var list = giftList(), wear = giftWear();
    frag.appendChild(h('h3', { text: '문어 선물 상자' }));
    frag.appendChild(h('p', { class: 'set-note', text: '내밀기만 할 수 있어. 쓸지는 문어가 정해.' }));
    var row = h('div', { class: 'filters gift-chips', role: 'group', 'aria-label': '선물 상자' });
    list.forEach(function (c) {
      var b = h('button', { type: 'button', class: 'fchip', text: c.name + (wear[c.slot] === c.id ? ' · 쓰는 중' : '') });
      chipOn(b, giftPick === c.id);
      b.addEventListener('click', function () { giftPick = giftPick === c.id ? null : c.id; row.querySelectorAll('.fchip').forEach(function (x, i) { chipOn(x, list[i].id === giftPick); }); go.disabled = !giftPick; });
      row.appendChild(b);
    });
    frag.appendChild(row);
    var go = h('button', { type: 'button', class: 'btn sm pressable', id: 'gift-go', text: '내밀기' }); go.disabled = !giftPick;
    go.addEventListener('click', function () { if (giftPick) giftOffer(giftPick); });
    var off = h('button', { type: 'button', class: 'btn sm pressable', id: 'gift-off', text: '옷장에 넣어둘까?' });   /* 11-10 주인: '벗어 볼래? 권하기' 는 어감이 어색 — 주인이 고른 말 '옷장에 넣어둘까?' (벗으라고 시키는 말이 아니라 묻는 말) */
    off.addEventListener('click', function () { giftOffer(null); });
    frag.appendChild(h('div', { class: 'btn-row' }, [go, off]));
  }
  function renderSettings() {
    var body = $('set-body'); if (!body) return;
    var frag = document.createDocumentFragment();
    renderGift(frag);   /* 문어 선물 상자 (맨 위) */
    colorRows(frag);   /* 맨 위 문어 색 (거울 전엔 없음) */
    renderPlayerParts(frag);   /* 내 모습 — 문어 색 바로 아래 */
    if (window.AUDIO) AUDIO.on('room_sheet', { frag: frag });   /* 소리: '켜기' 체크 칸 + 음악·효과음 크기 (js/audio.js — 훅 이름은 예전 그대로) */
    frag.appendChild(h('h3', { text: '화면' }));
    var sel = h('select', { id: 'set-motion' }, [h('option', { value: 'auto', text: '기기 설정 따르기' }), h('option', { value: 'reduce', text: '모션 줄이기' })]);
    sel.value = S.settings.motion || 'auto';
    sel.addEventListener('change', function () { S.settings.motion = sel.value; save(); applyMotion(); });
    frag.appendChild(h('label', { class: 'set' }, [h('span', { text: '모션' }), sel]));
    var pf = h('input', { type: 'checkbox', id: 'set-pixel' }); pf.checked = pixelFont();
    pf.addEventListener('change', function () { S.settings.pixelFont = pf.checked; save(); applyFont(); });
    frag.appendChild(h('label', { class: 'set' }, [h('span', { text: '픽셀 글꼴' }), pf]));
    var cb = h('input', { type: 'checkbox', id: 'set-thumbs' }); cb.checked = S.settings.thumbs !== false;
    cb.addEventListener('change', function () { S.settings.thumbs = cb.checked; save(); renderWall(); renderAlbum(); });
    frag.appendChild(h('label', { class: 'set' }, [h('span', { text: '포스터 썸네일' }), cb]));
    claudeSection(frag);   /* 내 Claude 와 연결 (원격 뽈뽈 방) */
    frag.appendChild(h('h3', { text: '기록' }));
    frag.appendChild(h('p', { class: 'set-stats', id: 'set-stats', text: statsLine() }));
    var file = h('input', { type: 'file', accept: 'application/json,.json', id: 'set-import' });
    file.addEventListener('change', function () { var f = file.files && file.files[0]; if (!f) return; var fr = new FileReader(); fr.onload = function () { importJSON(fr.result); }; fr.readAsText(f); });
    var resetBtn = h('button', { type: 'button', class: 'btn sm danger', id: 'set-reset', text: '전체 초기화' });
    var armed = false, armTimer = null;
    resetBtn.addEventListener('click', function () {
      if (!armed) { armed = true; resetBtn.textContent = '정말? 다시 누르면 지워져'; armTimer = setTimeout(function () { armed = false; resetBtn.textContent = '전체 초기화'; }, 4000); return; }
      clearTimeout(armTimer); resetAll();
    });
    /* 불러오기: 브라우저 글자('파일 선택') 대신 옆 '내보내기'와 같은 버튼. 입력은 그대로(Tab · Space/Enter · change), 링은 라벨에 (css) */
    frag.appendChild(h('div', { class: 'set-data' }, [h('button', { type: 'button', class: 'btn sm', id: 'set-export', text: '내보내기', onclick: exportJSON }), h('label', { class: 'btn sm file-btn' }, ['불러오기', file]), resetBtn]));
    frag.appendChild(h('h3', { text: '누가 고르나', id: 'set-who-h' }));
    frag.appendChild(h('p', { class: 'set-who', id: 'set-who', text: WHO_LINE }));
    /* 팔레트(즉흥·Apollo·Endesga·Resurrect)는 장면 색 실험용 — 플레이어에겐 뜻이 없다 (주인 11-07: '무슨 버튼인지 모르겠어'). 개발 모드에서만 */
    if (DEV) {
      frag.appendChild(h('h3', { text: '팔레트' }));
      frag.appendChild(h('p', { class: 'help', text: sceneMode === '3d' ? '개발용 · 장면 색 팔레트' : '2D 장면에서는 적용 안 돼.' }));
      frag.appendChild(paletteChips('set-pal'));
    }
    /* 맨 아래 조용한 글자 링크 하나: 만든 것들 (credits.html — 부엌 소리 CC BY 크레딧 · CC0 녹음 · 글꼴 · three.js). 글자는 작아도 누르는 곳 44px */
    frag.appendChild(h('p', { class: 'help set-credits' }, [h('a', { href: 'credits.html', id: 'set-credits', text: '만든 것들', style: 'display:inline-block;padding:12px 4px;margin:-6px 0 -12px' })]));
    body.innerHTML = ''; body.appendChild(frag);
  }
  /* 설정 › 내 모습 (docs/PLAYER_PARTS.md §3): 제목 옆 초상(3D 장면이 playerPortrait 를 주면 64×64 캔버스를 96px 로 · 2D 면 한 줄 안내) + 한 줄 = 지금 모습 한마디 · '모습 바꾸기'.
     고르는 건 옷장(#look-sheet · 아래 renderLook)에서 — 11-09 주인 "외관도 이런 느낌 ui로 각 항목별로 고를 수 있게 카테고리 나눠도 좋을 듯". 글자에 이모지·기호 없음 */
  function renderPlayerParts(frag) {
    var head = h('div', { class: 'set-parts-h' }, [h('h3', { text: '내 모습' })]);
    var port = null;
    if (sceneMode === '3d' && scene && typeof scene.playerPortrait === 'function') { port = h('canvas', { class: 'pl-port', id: 'set-pl-port', width: '64', height: '64', role: 'img', 'aria-label': '내 모습 미리보기' }); head.appendChild(port); }
    frag.appendChild(head);
    if (sceneMode !== '3d') frag.appendChild(h('p', { class: 'help set-parts-note', id: 'set-parts-note', text: '2D 장면에서는 미리보기가 없어. 고른 건 저장돼.' }));
    var sum = h('span', { id: 'set-look-sum' }), open = h('button', { type: 'button', class: 'btn sm pressable', id: 'set-look-open', 'aria-haspopup': 'dialog', text: '모습 바꾸기' });
    open.addEventListener('click', openLook);
    frag.appendChild(h('div', { class: 'set set-look' }, [sum, open]));
    function drawPort() {   /* 장면 초상은 캐시라 첫 장만 느리다 (≈ 문어 portrait). 못 그리면 캔버스를 치운다 (빈 네모를 두지 않는다) */
      if (!port) return;
      requestAnimationFrame(function () {
        if (!port) return;
        try { var src = scene.playerPortrait({ bg: PORT.bg }), cx = port.getContext('2d'); cx.clearRect(0, 0, 64, 64); if (src) cx.drawImage(src, 0, 0); else throw new Error('빈 초상'); }
        catch (e) { console.warn('[app] playerPortrait', e); if (port.parentNode) port.remove(); port = null; }
      });
    }
    LOOK.onChange = function () { sum.textContent = lookSummary(); drawPort(); };   /* 옷장이 닫힐 때도 부른다 (bind 의 close) */
    LOOK.onChange();
  }
  /* 내 모습 옷장 (#look-sheet · docs/PLAYER_PARTS.md §3): 왼쪽 갈래 탭 여섯(tablist — 화살표 · Home · End, 고르면 바로 바뀐다) · 가운데 물건 타일(tabpanel) · 오른쪽 전신 미리보기(앞 · 뒤).
     타일 그림 = 지금 모습에서 그 한 가지만 바꿔 입은 내 캐릭터 (scene.playerShot — 갈래마다 구도가 다르다: secs 의 셋째 값). 그래서 하나 고르면 보이는 타일을 다시 그린다 (장면 쪽 캐시라 본 건 바로).
     한 프레임에 6ms 어치만 그려 손가락을 막지 않는다. 색은 .preset 동그라미. 2D 장면이면 그림 없이 글자 타일 + 안내 한 줄 (고른 건 저장된다).
     고른 표시: .on + aria-pressed (chipOn). 타일을 누르면 setPlayerPart → 방의 캐릭터도 바로 바뀐다 */
  var LOOK_TABS = [
    { id: 'hair', name: '머리', icon: 'look/hair', secs: [['hair', '모양', 'hair'], ['bangs', '앞머리', 'head'], ['hairColor', '색']] },
    { id: 'eyes', name: '눈', icon: 'look/eyes', secs: [['eyes', '모양', 'face'], ['eyeColor', '색']] },
    { id: 'face', name: '얼굴', icon: 'look/face', secs: [['skin', '피부색'], ['nose', '코', 'face'], ['mouth', '입', 'face'], ['cheek', '볼', 'face']] },
    { id: 'outfit', name: '옷', icon: 'look/outfit', secs: [['outfit', '옷', 'body']] },
    { id: 'shoes', name: '신발', icon: 'look/shoes', secs: [['shoes', '신발', 'feet']] },
    { id: 'acc', name: '장식', icon: 'look/acc', secs: [['acc', '장식', 'head']] }
  ];
  var LOOK = { tab: 'hair', back: false, raf: 0, queue: [], onChange: null, ro: null };
  function lookCanShot() { return sceneMode === '3d' && !!scene && typeof scene.playerShot === 'function'; }
  function lookNarrow() { return !!(window.matchMedia && window.matchMedia('(max-width: 359px)').matches); }   /* css: 이 폭부터 탭이 위 가로 줄 */
  function lookTab(id) { for (var i = 0; i < LOOK_TABS.length; i++) if (LOOK_TABS[i].id === id) return LOOK_TABS[i]; return LOOK_TABS[0]; }
  function lookCatName(cat) { for (var i = 0; i < PLAYER_CATS.length; i++) if (PLAYER_CATS[i][0] === cat) return PLAYER_CATS[i][1]; return cat; }
  function lookPartName(cat, id) { var l = playerParts()[cat] || []; for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i].name; return ''; }
  function lookSummary() {   /* 설정 줄의 한마디: 머리 · 옷 · 장식 (없음은 뺀다) */
    var c = S.settings.player, out = [];
    ['hair', 'outfit', 'acc'].forEach(function (k) { var n = c[k] === 'none' ? '' : lookPartName(k, c[k]); if (n) out.push(n); });
    return out.join(' · ');
  }
  function lookEyeNote() { var n = $('look-eye-note'), c = S.settings.player; if (n) n.textContent = (c.eyes === 'smile' || c.eyes === 'dot') ? '이 눈 모양은 눈 색이 안 보여' : '눈 색은 크게 봐야 잘 보여'; }
  function lookNow() {   /* 미리보기 아래: 이 갈래에서 지금 고른 것들 */
    var n = $('look-now'); if (!n) return;
    var c = S.settings.player;
    n.textContent = lookTab(LOOK.tab).secs.map(function (sec) { return c[sec[0]] === 'none' ? sec[1] + ' 없음' : lookPartName(sec[0], c[sec[0]]); }).join(' · ');
  }
  function lookDrawStage() {
    var cv = $('look-stage-cv'); if (!cv || !lookCanShot()) return;
    cv.setAttribute('aria-label', LOOK.back ? '내 모습 뒷모습' : '내 모습 앞모습');
    try { var src = scene.playerShot({ frame: LOOK.back ? 'back' : 'full', shared: true }), cx = cv.getContext('2d'); if (!src) throw new Error('빈 전신'); cx.clearRect(0, 0, 64, 96); cx.drawImage(src, 0, 0); }
    catch (e) { console.warn('[app] playerShot', e); }
  }
  function lookThumbStep() {
    LOOK.raf = 0;
    var d = $('look-sheet'), t0 = performance.now();
    if (!d || !d.open || !lookCanShot()) { LOOK.queue = []; return; }
    while (LOOK.queue.length && performance.now() - t0 < 6) {
      var b = LOOK.queue.shift(), cv = b.querySelector('.look-thumb');
      if (!cv || !document.contains(b)) continue;
      try {
        var look = {}; look[b.dataset.part] = b.dataset.id;
        var src = scene.playerShot({ look: look, frame: b._frame || 'head', shared: true });
        if (!src) throw new Error('빈 그림');
        var cx = cv.getContext('2d'); cx.clearRect(0, 0, 32, 32); cx.drawImage(src, 0, 0); cv.dataset.drawn = '1';
      } catch (e) { console.warn('[app] playerShot', e); cv.remove(); }
    }
    if (LOOK.queue.length) LOOK.raf = requestAnimationFrame(lookThumbStep);
  }
  function lookQueueThumbs() {
    var box = $('look-items');
    LOOK.queue = (box && lookCanShot()) ? [].slice.call(box.querySelectorAll('.look-tile')) : [];
    if (LOOK.queue.length && !LOOK.raf) LOOK.raf = requestAnimationFrame(lookThumbStep);
  }
  function lookMoreSync() {   /* 고를 것 칸 아래에 굴릴 것이 남았으면 #look-body.more (css: 아래 가장자리 띠 + 화살) — 굴림 막대를 숨겼으니 '더 있다' 를 이걸로 알린다.
                                 칸 크기가 바뀔 때마다 불리니 탭 줄의 방향(aria-orientation — 좁은 폭에선 가로 줄)도 여기서 맞춘다 */
    var body = $('look-body'), it = $('look-items'), rail = $('look-rail'); if (!body || !it) return;
    if (rail) rail.setAttribute('aria-orientation', lookNarrow() ? 'horizontal' : 'vertical');
    body.classList.toggle('more', it.scrollHeight - it.clientHeight - it.scrollTop > 4);
  }
  function lookPick(cat, id) {
    var was = normalizePlayer(S.settings.player)[cat];
    if (!setPlayerPart(cat, id)) return;
    var box = $('look-items'), c = S.settings.player;
    if (box) box.querySelectorAll('[data-part="' + cat + '"][data-id]').forEach(function (q) { chipOn(q, q.dataset.id === c[cat]); });
    lookEyeNote(); lookNow(); lookDrawStage(); lookQueueThumbs();
    var got = /^(outfit|shoes|acc)$/.test(cat) && c[cat] !== was ? setsCheck() : ''; if (got) toast('세트 도감에 적었어: ' + got);   /* 11-12 (검증 C14): 세트는 옷 · 신발 · 장식이 바뀌었을 때만 본다 (기본 옷이 곧 '다락방 차림' 이라 머리만 바꿔도 적혔다) */
  }
  function lookRenderItems() {
    var box = $('look-items'); if (!box) return;
    var t = lookTab(LOOK.tab), P = playerParts(), c = S.settings.player, shot = lookCanShot(), multi = t.secs.length > 1, frag = document.createDocumentFragment();
    box.setAttribute('aria-labelledby', 'look-tab-' + t.id);
    if (!shot) frag.appendChild(h('p', { class: 'help look-note', id: 'look-note', text: '2D 장면에서는 미리보기가 없어. 고른 건 저장돼.' }));
    t.secs.forEach(function (sec) {
      var cat = sec[0], isColor = cat === 'hairColor' || cat === 'eyeColor';
      if (multi) frag.appendChild(h('h3', { class: 'look-sec', text: sec[1] }));
      var grp = h('div', { class: isColor ? 'look-colors' : 'look-tiles', role: 'group', 'aria-label': multi ? lookCatName(cat) : t.name, 'data-part': cat });
      P[cat].forEach(function (x) {
        var b;
        if (isColor) { b = h('button', { type: 'button', class: 'preset pl-color', 'data-part': cat, 'data-id': x.id, 'data-hex': x.hex || null, title: x.name, 'aria-label': x.name }); b.style.background = x.hex || 'var(--panel2)'; }
        else {
          b = h('button', { type: 'button', class: 'look-tile', 'data-part': cat, 'data-id': x.id }, [shot ? h('canvas', { class: 'look-thumb', width: '32', height: '32', 'aria-hidden': 'true' }) : null, h('span', { class: 'look-name', text: x.name })]);
          b._frame = sec[2];
        }
        chipOn(b, c[cat] === x.id);
        b.addEventListener('click', function () { lookPick(cat, x.id); });
        grp.appendChild(b);
      });
      frag.appendChild(grp);
      if (cat === 'eyeColor') frag.appendChild(h('p', { class: 'help look-eye-note', id: 'look-eye-note' }));
    });
    box.innerHTML = ''; box.appendChild(frag); box.scrollTop = 0;
    lookEyeNote(); lookNow(); lookQueueThumbs(); lookMoreSync();
  }
  function lookSelectTab(id, focus) {
    var rail = $('look-rail'); if (!rail) return;
    LOOK.tab = lookTab(id).id;
    rail.querySelectorAll('.look-tab').forEach(function (b) {
      var on = b.dataset.tab === LOOK.tab;
      b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    });
    lookRenderItems();
  }
  function lookRailKey(e) {   /* tablist: 화살표(세로 · 가로 둘 다) · Home · End — 포커스가 가면 바로 고른다 */
    var n = LOOK_TABS.length, i = LOOK_TABS.indexOf(lookTab(LOOK.tab)), j;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') j = (i + 1) % n;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') j = (i + n - 1) % n;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = n - 1;
    else return;
    e.preventDefault(); e.stopPropagation();
    lookSelectTab(LOOK_TABS[j].id, true);
  }
  function renderLook() {
    var body = $('look-body'); if (!body) return;
    var shot = lookCanShot(), frag = document.createDocumentFragment();
    body.classList.toggle('no-shot', !shot);
    var rail = h('div', { class: 'look-rail', id: 'look-rail', role: 'tablist', 'aria-label': '고를 갈래', 'aria-orientation': lookNarrow() ? 'horizontal' : 'vertical' });
    LOOK_TABS.forEach(function (t) {
      var b = h('button', { type: 'button', class: 'look-tab', id: 'look-tab-' + t.id, role: 'tab', 'data-tab': t.id, 'aria-selected': 'false', 'aria-controls': 'look-items', tabindex: '-1' }, [ico(t.icon, 'look-tab-ico'), h('span', { class: 'look-tab-lbl', text: t.name })]);
      b.addEventListener('click', function () { lookSelectTab(t.id, false); });
      rail.appendChild(b);
    });
    rail.addEventListener('keydown', lookRailKey);
    frag.appendChild(rail);
    var items = h('div', { class: 'look-items', id: 'look-items', role: 'tabpanel' });
    items.addEventListener('scroll', lookMoreSync, { passive: true });
    frag.appendChild(items);
    frag.appendChild(h('div', { class: 'look-more', 'aria-hidden': 'true' }));
    if (LOOK.ro) LOOK.ro.disconnect();
    if (window.ResizeObserver) { LOOK.ro = LOOK.ro || new ResizeObserver(lookMoreSync); LOOK.ro.observe(items); }   /* 시트가 열리며 칸 크기가 정해질 때 · 화면을 돌릴 때 */
    if (shot) {
      var turn = h('button', { type: 'button', class: 'btn sm pressable', id: 'look-turn', text: LOOK.back ? '앞 보기' : '뒤 보기' });
      turn.addEventListener('click', function () { LOOK.back = !LOOK.back; turn.textContent = LOOK.back ? '앞 보기' : '뒤 보기'; lookDrawStage(); });
      frag.appendChild(h('div', { class: 'look-stage' }, [h('canvas', { class: 'look-stage-cv', id: 'look-stage-cv', width: '64', height: '96', role: 'img', 'aria-label': '내 모습 앞모습' }), turn, h('p', { class: 'look-now', id: 'look-now' })]));
    }
    body.innerHTML = ''; body.appendChild(frag);
    lookSelectTab(LOOK.tab, false);
    lookDrawStage();
  }
  function openLook() {
    var d = $('look-sheet'); if (!d) return;
    if (!d.open) { sheetDragReset(d); d._openedAt = performance.now(); LOOK.back = false; questMark('look'); }   /* 열 때마다 제자리 · 앞모습부터 (갈래는 마지막에 보던 대로) */
    renderLook();
    showDialog(d);
    lookMoreSync();
  }
  function openSettings() {
    var d = $('settings-sheet'); if (!d) return;
    if (!d.open) { sheetDragReset(d); d._openedAt = performance.now(); }   /* 열 때마다 제자리에서 (끌어 닫은 뒤에도) */
    renderSettings();
    showDialog(d);
  }
  /* 설정 · 앨범 시트: 손잡이를 아래로 끌어 닫기 (docs/research/polish-from-starred-repos.md 7 · 수치는 vaul constants: 25% · 0.4px/ms · 500ms cubic-bezier(.32,.72,0,1)).
     잡는 곳은 손잡이와 시트 머리 띠뿐이다 (손잡이 ::before 가 시트 맨 위 폭 전체를 덮는다, css/style.css 끝 블록). 굴러가는 본문은 잡지 않는다.
     아래로는 손가락을 1:1 로 따라오고(픽셀 테마는 2px 격자로), 위로는 고무줄처럼 최대 8px 만 간다.
     놓을 때 시트 높이의 25% 이상 끌었거나 아래로 0.4px/ms 넘게 튕겼으면 close(). 아니면 500ms 에 제자리로 (모션 감소면 바로).
     연 뒤 500ms 동안과, 본문이 굴러가 있을 때(scrollTop !== 0)는 무시한다. 닫기 버튼 · Esc · 바깥 탭(clickedOutside · closedby)은 그대로 */
  var SHEET_CLOSE = 0.25, SHEET_FLICK = 0.4, SHEET_LOCK = 500, SHEET_BACK = 500, SHEET_EASE = 'cubic-bezier(.32,.72,0,1)', SHEET_UP = 8;
  var linearEase = null;
  /* cubic-bezier(.32,.72,0,1) 의 값 (시간 x → 진행 y). x 쪽 둘째 점이 0 이라 그 항은 빠진다 */
  function sheetCurve(x) {
    var lo = 0, hi = 1, s = x, u;
    for (var i = 0; i < 30; i++) { u = 1 - s; var xs = 3 * u * u * s * 0.32 + s * s * s; if (Math.abs(xs - x) < 1e-7) break; if (xs < x) lo = s; else hi = s; s = (lo + hi) / 2; }
    u = 1 - s; return 3 * u * u * s * 0.72 + 3 * u * s * s + s * s * s;
  }
  /* 픽셀 테마의 제자리 돌아가기: 같은 500ms 곡선을 한 프레임(16ms)마다 재서 2px 격자로 반올림한 계단 linear().
     돌아가는 동안에도 시트가 격자 밖에 서지 않는다 (--ease-px 와 같은 생각). linear() 가 없으면 2px 씩 고른 steps() */
  function sheetPxEase(from, ms) {
    if (linearEase === null) linearEase = !!(window.CSS && CSS.supports && CSS.supports('transition-timing-function', 'linear(0, 1)'));
    if (!linearEase) return 'steps(' + Math.max(1, Math.round(Math.abs(from) / 2)) + ', jump-end)';
    var n = Math.max(2, Math.round(ms / 16)), out = [], prev = null, t0 = 0;
    for (var k = 1; k <= n; k++) {
      var y = Math.round(from * (1 - sheetCurve(k / n)) / 2) * 2, p = y === 0 ? 1 : 1 - y / from;   /* 칸의 끝에서 잰 값 → 놓자마자 움직인다 */
      if (prev !== null && p !== prev) { out.push(prev + ' ' + (t0 * 100 / n).toFixed(3) + '% ' + ((k - 1) * 100 / n).toFixed(3) + '%'); t0 = k - 1; }
      prev = p;
    }
    out.push(prev + ' ' + (t0 * 100 / n).toFixed(3) + '% 100%');
    return 'linear(' + out.join(', ') + ')';
  }
  function sheetDragReset(d) {
    d.classList.remove('dragging');
    ['transform', 'transition', 'animation'].forEach(function (k) { d.style.removeProperty(k); });
  }
  function bindSheetDrag(id) {   /* 설정 · 추억 앨범 시트 (열 때 d._openedAt) */
    var d = $(id), hd = d && d.querySelector('.handle'); if (!hd) return;
    var g = null, backTimer = 0, eatClickUntil = 0;
    /* 이벤트가 실제로 난 때 — 메인 스레드가 밀려 이벤트가 몰려 와도 속도는 손가락 그대로 */
    function stamp(e) { var t = e.timeStamp; return t > 0 && t < 1e11 ? t : performance.now(); }
    function nowY() { var m = getComputedStyle(d).transform; try { return m && m !== 'none' && typeof DOMMatrix === 'function' ? new DOMMatrix(m).m42 : 0; } catch (err) { return 0; } }
    function place(off) {
      var y = off >= 0 ? off : -SHEET_UP * (1 - 1 / (1 + -off / 40));   /* 위로는 고무줄 */
      y = pixelFont() ? Math.round(y / 2) * 2 : Math.round(y);           /* 픽셀 테마: 2px 격자 */
      d.style.transform = y ? 'translateY(' + y + 'px)' : 'none';
    }
    function settle() { d.style.removeProperty('transition'); d.style.removeProperty('transform'); }
    function track(q, e) {
      var t = stamp(e);
      q.off = q.base + e.clientY - q.y0; q.s.push({ t: t, y: e.clientY });
      while (q.s.length > 2 && t - q.s[0].t > 100) q.s.shift();   /* 속도는 마지막 100ms 로 */
    }
    hd.addEventListener('pointerdown', function (e) {
      if (!d.open || !e.isPrimary || e.button !== 0) return;
      if (g) release({ pointerId: g.id }, true);   /* 떼는 소식을 못 받은 지난 끌기(창 전환 등)는 제자리로 돌리고 새로 */
      if (stamp(e) - (d._openedAt || 0) < SHEET_LOCK || d.scrollTop !== 0) return;   /* 막 열렸거나(손가락이 닿은 때 기준) 본문이 굴러가 있으면 스크롤이 먼저 */
      clearTimeout(backTimer);
      var base = Math.max(0, nowY());   /* 돌아가는 도중에 다시 잡으면 그 자리에서 */
      g = { id: e.pointerId, y0: e.clientY, base: base, off: base, s: [{ t: stamp(e), y: e.clientY }] };
      try { hd.setPointerCapture(e.pointerId); } catch (err) { /* 이미 끝난 포인터 */ }
      /* 여는 애니메이션(sheet-in · dlg-in, fill both)이 transform 을 붙잡고 있어 끈다. 다 끝난 뒤라 모양은 같고, 닫힐 때(sheetDragReset) 되돌린다 */
      d.style.animation = 'none'; d.style.transition = 'none';
      place(base);
      d.classList.add('dragging');
      if (e.pointerType === 'mouse') e.preventDefault();   /* 마우스로 끌 때 글자 선택 없이 */
    });
    hd.addEventListener('pointermove', function (e) { if (g && e.pointerId === g.id) { track(g, e); place(g.off); } });
    function release(e, cancelled) {
      if (!g || e.pointerId !== g.id) return;
      var q = g; g = null;
      if (!cancelled) track(q, e);
      try { if (hd.hasPointerCapture(q.id)) hd.releasePointerCapture(q.id); } catch (err) { /* 없음 */ }
      d.classList.remove('dragging');
      if (Math.abs(q.off - q.base) > 2) eatClickUntil = performance.now() + 400;   /* 끈 뒤 따라오는 click 이 바깥 탭 닫기로 한 번 더 가지 않게 */
      var a = q.s[0], b = q.s[q.s.length - 1], v = b.t > a.t ? (b.y - a.y) / (b.t - a.t) : 0;
      if (!cancelled && q.off > 0 && (q.off >= SHEET_CLOSE * d.offsetHeight || v > SHEET_FLICK)) { d.close(); sheetDragReset(d); return; }
      var ms = reduced() ? 0 : Math.round(SHEET_BACK * speed()), from = nowY();
      if (!ms || !from) { d.style.transition = 'none'; place(0); void d.offsetWidth; settle(); return; }   /* 모션 감소: 바로 제자리 */
      d.style.transition = 'transform ' + ms + 'ms ' + (pixelFont() ? sheetPxEase(from, ms) : SHEET_EASE);
      place(0);
      backTimer = setTimeout(function () { if (!g) settle(); }, ms + 50);
    }
    hd.addEventListener('pointerup', function (e) { release(e, false); });
    hd.addEventListener('pointercancel', function (e) { release(e, true); });
    hd.addEventListener('lostpointercapture', function (e) { release(e, true); });   /* pointerup 뒤에 오면 이미 끝난 끌기라 아무 일 없다 */
    d.addEventListener('close', function () { g = null; clearTimeout(backTimer); sheetDragReset(d); });
    window.addEventListener('click', function (e) {
      if (performance.now() > eatClickUntil || (e.target !== d && e.target !== hd)) return;
      eatClickUntil = 0; e.stopPropagation(); e.preventDefault();
    }, true);
    /* 끈 뒤 따라오는 click 은 다음 누르기보다 먼저 온다. 손가락 끌기는 click 이 안 따라오니, 다음 누르기(바깥 탭 포함)에서 지워 그 탭은 먹지 않는다 */
    window.addEventListener('pointerdown', function () { eatClickUntil = 0; }, true);
  }
  /* ── 이름 창 = 첫 실행 (docs/SALON.md §1.1): 제목 → 한 줄 → 초상 → 몸 색 6칸 → 이름 칸 → [이름 저장] → 정직 줄.
     색 칸을 누르면 창 안 초상만 그 색으로 다시 찍는다 (표정 · 폴짝 없음). 장면 문어는 [이름 저장] 때 한 번 바뀐다 (그 전에 톡톡 갈아 보는 모습이 주인이 말한 '슥슥').
     안 누르고 저장하면 빨강 by 'default', 누르면 by 'player'. 처음 색을 이미 고른 기록(전체 초기화 전)이면 색 줄은 숨는다 (처음 한 번만).
     포커스: 손가락 기기면 제목 (자판이 색 줄을 가리지 않게) · 마우스(pointer: fine)면 예전처럼 이름 칸 */
  var namePick = null;   /* 이 창에서 누른 색 (안 눌렀으면 null = 기본 빨강) */
  function nameColorsEl() { return $('name-colors'); }
  function buildNameColors() {
    var row = nameColorsEl(); if (!row || row.childElementCount) return;
    COLOR_PRESETS.forEach(function (p) {
      var b = h('button', { type: 'button', class: 'preset', 'data-hex': p.hex, 'aria-label': p.short, 'aria-pressed': 'false' });   /* type=button: 아니면 폼이 제출되어 이름 필수 검사가 뜬다 */
      b.style.background = p.hex;
      b.addEventListener('click', function () { namePick = p.hex; markNameColor(p.hex); drawNamePortrait(p.hex); });
      row.appendChild(b);
    });
  }
  function markNameColor(hex) { var row = nameColorsEl(); if (row) row.querySelectorAll('.preset').forEach(function (b) { chipOn(b, b.dataset.hex === hex); }); }
  /* 창 안 초상 (64×64, 웃는 얼굴 · 투명 바탕 · 그 색으로). 장면 몸색은 그대로. 못 그리면(컨텍스트 잃음 · 빈 그림) 예전 작은 픽셀 문어 그림이 대신 남는다 */
  function drawNamePortrait(hex) {
    var cv = $('name-port'), img = document.querySelector('#name-dialog img.oct-pic'), ok = false;
    if (cv) {
      try {
        if (scene && typeof scene.portrait === 'function') {
          var src = scene.portrait('happy', { bg: 'transparent', color: hex }), cx = cv.getContext('2d');
          cx.clearRect(0, 0, cv.width, cv.height); cx.drawImage(src, 0, 0, cv.width, cv.height);
          var px = cx.getImageData(0, 0, cv.width, cv.height).data;
          for (var i = 3; i < px.length && !ok; i += 4) if (px[i]) ok = true;   /* 빈 초상 (3D 컨텍스트를 잃었을 때 장면이 주는 빈 캔버스) 이면 대체 그림 */
        }
      } catch (e) { ok = false; }
      cv.hidden = !ok;
    }
    if (img) img.hidden = ok;
  }
  function openNameDialog() {
    var d = $('name-dialog'), row = nameColorsEl(), pick = !hasFirstColor();
    buildNameColors();
    namePick = null;
    if (row) { row.hidden = !pick; markNameColor(pick ? DEFAULT_COLOR : null); }
    drawNamePortrait(pick ? DEFAULT_COLOR : S.octopus.color);
    showDialog(d);   /* 포커스는 맨 위 제목 (.dlg-top) */
    if (window.matchMedia && window.matchMedia('(pointer: fine)').matches) setTimeout(function () { if (d.open) $('name-in').focus(); }, 50);   /* 마우스 · 트랙패드: 바로 칠 수 있게 이름 칸 */
  }
  function pixelFont() { return !(S && S.settings && S.settings.pixelFont === false); }
  function applyFont() { document.documentElement.setAttribute('data-font', pixelFont() ? 'pixel' : 'system'); }
  function applyMotion() { document.documentElement.setAttribute('data-motion', S.settings.motion || 'auto'); if (scene) scene.setReducedMotion(reduced()); }
  function hexHue(hex) {
    var n = parseInt(String(hex).slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return 0;
    var hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return Math.round(((hh * 60) + 360) % 360);
  }
  function hslHex(hh, s, l) {
    var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((hh / 60) % 2 - 1)), m = l - c / 2, rgb = hh < 60 ? [c, x, 0] : hh < 120 ? [x, c, 0] : hh < 180 ? [0, c, x] : hh < 240 ? [0, x, c] : hh < 300 ? [x, 0, c] : [c, 0, x];
    return '#' + rgb.map(function (v) { return ('0' + Math.round((v + m) * 255).toString(16)).slice(-2); }).join('');
  }
  function exportJSON() {
    var blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob), a = h('a', { href: url, download: 'ppolppol_' + todayKey() + '.json' });
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    return JSON.stringify(S);
  }
  /* 불러오기: 먼저 그려 보고(검사), 되면 그때 저장. 안 되면 원래 기록·화면으로 되돌린다 — 저장된 기록은 건드리지 않는다 */
  var importSeen = 0, importAt = -1e9, IMPORT_HOLD = 1000;   /* 11-13 (재검증 C2): 지키는 건 불러온 뒤 1 s 만 (performance.now — 기기 시계가 뒤로 가도 그대로). 늘 지키면 시계가 뒤로 간 뒤 다른 탭의 초기화를 버리고 옛 기록을 되썼다.
                           11-13: 불러온 순간 (그 기록의 lastSeen, 지금보다 크면 지금) — 불러오기 전에 쓰인 다른 탭 기록의 storage 이벤트가 늦게 와도 불러온 것을 되돌리지 않게 (닫힌 탭의 마지막 저장이 몇 ms 뒤에 와서 옛 밭 · 조개가 돌아왔다).
                           지금으로 자르는 까닭: 시계가 앞선 기기의 파일이면 lastSeen 이 미래라, 그 뒤 다른 탭의 초기화 · 저장을 버리고 이 탭이 옛 기록을 되썼다 */
  function importJSON(text) {
    if (busy) { toast('다녀오는 중이라 지금은 못 불러와. 끝나고 다시 해 줘'); return false; }
    salonFinish();   /* 미용실 연출 중이면 끝 상태로 먼저 (그 물음은 이미 저장돼 있다) */
    var ssh = $('salon-sheet'); if (ssh && ssh.open) ssh.close();
    var prev = { S: S, g: greetingRow, m: memoRow };
    try {
      var obj = typeof text === 'string' ? JSON.parse(text) : text;
      if (!isObj(obj) || obj.v !== 2 || !isObj(obj.octopus)) throw new Error('format');
      S = normalize(obj);
      /* 같은 문어(born 이 같다)의 기록이면 이 기기에서 이미 한 미용실 물음은 남긴다 (검증 11-10 W1): 예전엔 묻기 전에 내보낸 파일을 다시 불러오면 그 물음이 사라졌다 —
         '그대로' 와 그 색의 7일 쉼이 없어지고, 맨 처음 물음 전의 파일이면 '맨 처음은 꼭 바꾸기' 가 다시 살아났다 (문어의 대답을 되감는 길).
         두 탭 합치기와 같은 규칙 (SALON.merge — 시간 제한 없이): 파일에 없는 물음은 colors 줄과 함께 다시 얹고, 같은 날 둘이면 이른 것이 정한다. 다른 문어의 파일은 그대로 들어온다 (merge 가 물음을 버린다) */
      if (SAL) S = SAL.merge(prev.S, S, ((prev.S.salon || {}).asks || []).slice()).state;
      if (S.octopus.state === 'sleep' && napOver()) S.octopus.state = 'idle';   /* 부팅과 같은 낮잠 규칙 */
      trial = true; try { setDayGreeting(); renderAll(); } finally { trial = false; }   /* 11-13 (C4): 그려 보는 동안 저장 없음 — 저장은 아래 검사 뒤 한 번 */
    } catch (e) {
      S = prev.S; greetingRow = prev.g; memoRow = prev.m;
      try { renderAll(); } catch (e2) { /* 원래 기록은 저장된 그대로 */ }
      toast('이 파일은 뽈뽈 기록이 아닌 것 같아'); return false;
    }
    mine = []; mineAsks = [];   /* 바꾼 기록에 예전 여행 · 미용실 물음을 다시 얹지 않게 */
    S.settings.lastSeen = Math.min(seenOf(S), Date.now());   /* 11-13 (재검): 불러온 기록의 lastSeen 도 지금으로 — 미래면 이 탭 미러(window.name)가 그 뒤 다른 탭의 초기화보다 '새것' 으로 남아, 새로고침 때 옛 기록이 돌아와 저장소에 되써졌다 */
    save(); importSeen = Math.min(seenOf(S), Date.now()); importAt = performance.now(); applyMotion(); applyFont(); syncSceneLook();
    clearRest(); if (octWithMe() && typeof scene.octDown === 'function') scene.octDown();   /* 11-13 (마지막 검증): 이 탭의 깨어 있는 틈은 불러온 기록의 것이 아니다 (octInitial 이 시계로 다시 잡는다) · 위층에 따라 와 있던 문어는 다락으로 먼저 — 아니면 다락 자리 좌표로 위층 방 안에 서고, 불러온 기록이 낮잠이면 위층에서 잤다 */
    octInitial();
    applyLook({ still: true });   /* 불러온 몸 색 (renderAll 의 renderScene 이 이미 맞췄으면 할 일 없음) */
    var d = $('settings-sheet'); if (d && d.open) d.close();
    toast('기록을 불러왔어'); return true;
  }
  function resetAll() {
    if (busy) { toast('다녀오는 중이라 지금은 못 지워. 끝나고 다시 해 줘'); return false; }
    salonFinish();   /* 미용실 연출 중이면 끝 상태로 먼저 */
    var ssh = $('salon-sheet'); if (ssh && ssh.open) ssh.close();
    store.remove(KEY); clearRest();   /* 11-13 (재검증 S4): 앞 문어의 깨어 있는 틈도 */
    S = defaults(); mine = []; mineAsks = []; save(); setDayGreeting(); renderAll(); syncSceneLook(); octInitial();   /* renderAll → renderScene → applyLook: 장면 문어도 기본 빨강. 몸 색은 이름 창에서 다시 고른다 */
    var d = $('settings-sheet'); if (d && d.open) d.close();
    openNameDialog();
  }

  /* ───────────────────────── rooms: 문어 방 ↔ 놀이방 (8물결 · 카드 18) ───────────────────────── */
  /* 주인 11-07: "방 클릭하면 캐릭터가 그 방문 앞으로 가면 끼익 열리면서 다른 방으로 넘어가는 류". 세 방 = 왼쪽 옷방(나중) · 가운데 문어 방(다락) · 오른쪽 놀이방.
     다락 오른쪽 바닥 끝에 선 진짜 문(#btn-door — 장면이 3D 문 위에 투명 단추로 맞춘다, aria-label '놀이방') → goRoom('play') → 문이 끼익 열림 → 가로 0.6 s → 놀이방.
     놀이방: 왼쪽 벽 문(#btn-play-door '문어 방') → goRoom('attic') · 뒷벽 오락기(#btn-machine '다락방 달리기') → RUNNER.open (닫으면 오락기로 포커스 · 놀이방 그대로).
     화살표 · 밀어서 넘기기 · 문 앞 질문은 없다. 문어는 놀이방에 오지 않는다 (문어의 방은 다락). 놀이방에서 하는 일은 산책 · 두뇌 · 저장(S)에 닿지 않는다 (0 바이트).
     산책 중(바깥이 보이는 동안)엔 #btn-door 가 장면 왼쪽 아래 픽셀 집 단추(data-spot="edge", 주인 11-08 밤)라 기다리는 동안 놀이방에 갈 수 있다. 산책은 놀이방에서도 그대로 흐르고(로그 행이 쌓인다),
     장면은 놀이방에 있는 동안 의식이 장소를 바꿔도 화면을 끌고 가지 않는다 (scene3d setPlaceNow). 문어가 돌아오면 구석 쪽지 "뚜루가 돌아왔어." + 보러 가기.
     큰 버튼(뽈뽈 다녀와 · 다녀오는 중…)은 문어 방의 일 → 놀이방이면 먼저 문으로 돌아와서 한다. 새로고침은 늘 문어 방 (지금 방은 저장하지 않는다).
     내 캐릭터 (SCENE.md '내 캐릭터'): walkFirst — 장면의 playerWalkTo(문 앞 앵커 atticPlayDoor · playAtticDoor)가 문 앞까지 걸어가서 풀리면 그때 문이 열린다 (2D 폴백엔 캐릭터가 없어 바로 풀린다) */
  var ROOM_SPOT = { atticPlay: 'btn-door', playAttic: 'btn-play-door', machine: 'btn-machine', salon: 'btn-salon', atticStair: 'btn-stair', loftStair: 'btn-loft-stair', sew: 'btn-sew', plot0: 'btn-plot0', plot1: 'btn-plot1', plot2: 'btn-plot2' };   /* salon = 다락 거울 코너 (#btn-salon → 미용실 시트 — 방이 아니라 다락 한 구석, docs/SALON.md §2) */
  var ROOM_BACK = { play: 'btn-play-door', attic: 'btn-door', loft: 'btn-loft-stair' };   /* 도착한 방에서 포커스를 받을 단추 (들어온 문의 맞은편) */
  var furnHinted = false, furnFrom = null;   /* furnFrom = { id, at: [x, z, rot, scale] } 들어 올린 순간 (장면 layout()) */
  /* 가구 배치 모드 화면 (주인 11-10 참고 화면): 위에 '가구 배치 · 이름' + 바꿔 들 가구 칩, 오른쪽 아래에 돌리기 · 크게 · 작게 · 취소 · 놓기. 큰 버튼(뽈뽈 다녀와)은 그동안 숨긴다. 캐릭터는 스틱 · 방향키로 그대로 움직인다 */
  var furnMode = false;
  function furnOpen(on) {   /* 위쪽 바의 소파 아이콘: 배치 모드 켜기 · 끄기 (들고 있던 건 놓는다) */
    if (!scene || typeof scene.furnItems !== 'function') return;
    if (!on && scene.furnEditing && scene.furnEditing()) scene.furnConfirm();
    furnMode = !!on; furnUI(on && scene.furnEditing ? scene.furnEditing() : null);
  }
  function furnUI(stt) {   /* stt = 들고 있는 가구 상태 | null. 모드가 켜져 있으면 가구 줄은 늘 보이고, 고른 게 있을 때만 슬라이더 · 취소 · 놓기 */
    var ui = $('furn-ui'); if (!ui) return;
    if (stt) furnMode = true;
    var on = furnMode && sceneMode === '3d';
    document.documentElement.classList.toggle('furn-on', on);
    syncSalonSpot();   /* 미용실 거울 단추: 가구 배치 중엔 숨김 · 끝나면 다시 */
    ui.hidden = !on; var fb = $('btn-furn'); if (fb) fb.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (!on) return;
    $('furn-title').textContent = stt ? stt.name : '가구를 골라';
    $('furn-tools').hidden = !stt;
    if (stt) { $('furn-rot').value = String(Math.round(stt.rot / 15) * 15 % 360); $('furn-size').value = String(Math.round(stt.scale * 100)); }
    var box = $('furn-items'), items = scene.furnItems ? scene.furnItems() : []; box.textContent = '';
    items.forEach(function (it) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'furn-tile pressable' + (stt && it.id === stt.id ? ' on' : ''); b.setAttribute('aria-pressed', stt && it.id === stt.id ? 'true' : 'false');
      var sw = document.createElement('span'); sw.className = 'furn-sw furn-sw-' + it.id; sw.setAttribute('aria-hidden', 'true');
      var nm = document.createElement('span'); nm.className = 'furn-nm'; nm.textContent = it.name;
      b.appendChild(sw); b.appendChild(nm);
      b.addEventListener('click', function () { if (scene.furnCarry) scene.furnCarry(it.id); });
      box.appendChild(b);
    });
    if (!furnHinted) { furnHinted = true; toast('가구를 고르고, 캐릭터를 움직여 자리를 잡아'); }
  }
  function bindFurn() {
    var fb = $('btn-furn'); if (fb) fb.addEventListener('click', function () { furnOpen(!furnMode); });
    var dn = $('furn-done'); if (dn) dn.addEventListener('click', function () { furnOpen(false); });
    var ok = $('furn-ok'); if (ok) ok.addEventListener('click', function () { if (scene && scene.furnConfirm) scene.furnConfirm(); });
    var no = $('furn-x'); if (no) no.addEventListener('click', function () { if (scene && scene.furnCancel) scene.furnCancel(); });
    var rt = $('furn-rot'); if (rt) rt.addEventListener('input', function () { if (scene && scene.furnSetRot) scene.furnSetRot(+rt.value); });
    [rt, $('furn-size')].forEach(function (el) { if (el) el.addEventListener('change', function () { el.blur(); }); });   /* 슬라이더를 놓으면 포커스도 놓는다 (방향키가 다시 캐릭터로) */
    var sz = $('furn-size'); if (sz) sz.addEventListener('input', function () { if (scene && scene.furnSetScale) scene.furnSetScale(+sz.value / 100); });
  }
  var roomJob = null;   /* 지금 도는 문 작업 (Promise) — 끝날 때까지 두 번째 문은 열지 않는다 */
  function sceneView() { return scene && typeof scene.view === 'function' ? scene.view() : (scene && typeof scene.place === 'function' ? scene.place() : 'attic'); }
  function roomNow() { return scene && typeof scene.room === 'function' ? scene.room() || null : null; }
  function inPlay() { return !!roomNow(); }
  function octWithMe() { return !!(scene && typeof scene.octUp === 'function' && scene.octUp()); }   /* 위층에 문어가 따라 올라와 있다 (미용실) */   /* 문어가 없는 '내 방'(놀이방 · 위층 다락)에 있는가 */
  function introUp() { return !!(window.INTRO && ['sky', 'title'].indexOf(INTRO.phase) >= 0); }
  function bindSpots() {
    var map = {};
    Object.keys(ROOM_SPOT).forEach(function (k) { var el = $(ROOM_SPOT[k]); if (el) map[k] = el; });
    if (scene && typeof scene.hotspots === 'function') scene.hotspots(map);
    syncSalonSpot(true);   /* 거울 단추는 앱이 허락할 때만 'over' (setSalonOpen) */
    syncRoomUI();
  }
  /* 보이는 장소 → #scene[data-view] (css: 놀이방이면 문어 머리 위 것 · 2D 다락 그림을 숨긴다) · 장면 이름(aria-label) · 장면 설명. 놀이방을 벗어나면 쪽지는 걷는다 */
  function syncRoomUI(v) {
    v = v || sceneView();
    var sc = $('scene'); if (!sc) return;
    if (sc.getAttribute('data-view') !== v) sc.setAttribute('data-view', v);
    var lbl = v === 'play' ? '놀이방' : v === 'loft' ? '위층 다락 옷방' : '문어의 다락방';
    if (sc.getAttribute('aria-label') !== lbl) sc.setAttribute('aria-label', lbl);
    if (v !== 'play') hideBackNote();
    updateSceneDesc();
    stickSync();   /* 보이는 장소가 바뀌면 발자국 손잡이도 다시 (장면의 on.playerInput 이 먼저지만, 같은 답을 한 번 더 묻는 건 싸다) */
  }
  function resetRoomUI() {   /* 장면을 바꿀 때 (sceneLost): 단추는 새 장면이 다시 맡는다 · 그 전까지 놀이방 단추는 숨김 */
    roomJob = null; hideBackNote();
    ['btn-play-door', 'btn-machine', 'btn-salon', 'btn-stair', 'btn-loft-stair', 'btn-sew', 'btn-plot0', 'btn-plot1', 'btn-plot2'].forEach(function (id) { var b = $(id); if (b) b.hidden = true; });
    var d = $('btn-door'); if (d) { d.hidden = false; d.removeAttribute('data-spot'); ['left', 'top', 'width', 'height', 'right', 'bottom'].forEach(function (k) { d.style[k] = ''; }); }
    var sc = $('scene'); if (sc) { sc.setAttribute('data-view', 'attic'); sc.setAttribute('aria-label', '문어의 다락방'); }
  }
  function goRoom(name, opener, kbd) {   /* → Promise<{ ok, reason?, view, room, place }> (예전 7물결엔 bool). kbd = 키보드 · 화면 낭독기로 눌렀다 (도착한 쪽 단추에 포커스 링) */
    var to = name === 'play' ? 'play' : name === 'loft' ? 'loft' : name === 'attic' || name === 'back' ? 'attic' : null;
    function no(why) { return Promise.resolve({ ok: false, reason: why, view: sceneView(), room: roomNow() }); }
    if (!to) return no('unknown');
    if (!scene || typeof scene.goRoom !== 'function') return no('scene');
    if (introUp()) return no('intro');
    if (salonActive) return no('salon');   /* 미용실 연출 중엔 놀이방 문을 열지 않는다 (단추도 숨는다 — 기술 SHOULD 8) */
    if (roomJob) return no('busy');
    var ae = document.activeElement, keep = !ae || ae === document.body || ae === opener || isRoomButton(ae);
    hideTip();
    if (to === 'attic') hideBackNote();
    if (furnMode && to !== 'attic') furnOpen(false);   /* 11-12 (검증): 가구 배치는 다락 일 — 다락을 떠나면 '끝내기' 와 같이 끝낸다 (위층까지 따라와 거울 · 큰 버튼을 가린 채 눌러도 아무 일 없는 판이 됐다) */
    var job = roomJob = Promise.resolve(scene.goRoom(to, { walkFirst: true })).then(fin, function (e) { console.warn('[app] goRoom', e); return fin({ ok: false, reason: 'error' }); });
    function fin(r) {
      if (roomJob === job) roomJob = null;
      r = r || { ok: false };
      syncRoomUI();
      if (r.ok) {   /* 들어온 문의 맞은편 단추로 포커스 (누른 단추는 숨어서 포커스가 body 로 떨어진다) — 그사이 다른 곳(설정 등)으로 옮겼으면 두고 */
        var cur = document.activeElement, b = $(ROOM_BACK[to]);
        if (b && !b.hidden && (keep || !cur || cur === document.body) && (!cur || cur === document.body || isRoomButton(cur))) focusRoomBtn(b, !!kbd);
      }
      return r;
    }
    return job;
  }
  /* 도착한 방의 단추로 포커스: 키보드로 왔으면 링, 손가락 · 마우스로 왔으면 링 없이 (장면이 그림 위 톡을 단추 click() 으로 넘기므로 브라우저의 :focus-visible 짐작이 '키보드' 로 기울 수 있다).
     focusVisible 옵션을 모르는 브라우저는 .ring-off (css) — 키를 누르거나 포커스가 떠나면 걷힌다 */
  function focusRoomBtn(b, ring) {
    if (!ring) b.classList.add('ring-off'); else b.classList.remove('ring-off');
    try { b.focus(ring ? { preventScroll: true } : { preventScroll: true, focusVisible: false }); } catch (e) { b.focus(); }
  }
  function kbdClick(e) { return !!e && e.isTrusted && e.detail === 0; }   /* Enter · Space · 화면 낭독기 = 진짜(isTrusted) click 인데 detail 0 — 마우스는 detail ≥ 1, 장면이 대신 누른 톡은 isTrusted false */
  function isRoomButton(el) { return !!el && !!el.id && (el.id === 'btn-back-see' || Object.keys(ROOM_SPOT).some(function (k) { return ROOM_SPOT[k] === el.id; })); }
  /* 놀이방이면 문으로 문어 방(또는 문어가 나가 있으면 바깥)에 돌아온다 → Promise<bool> 이제 놀이방 밖이다. 문이 도는 중이면 끝나길 기다린다 */
  function backToOctRoom() {
    return (roomJob || Promise.resolve()).then(function () {
      if (!inPlay()) return !roomJob;
      return goRoom('attic').then(function () { return !inPlay() && !roomJob; });
    });
  }
  function openMachine(opener, kbd) {   /* 오락기 → 다락방 달리기 창 (js/runner.js 그대로). 닫으면 runner 가 opener(오락기 단추)로 포커스를 돌려준다 · 놀이방은 그대로 */
    if (!inPlay() || roomJob) return false;
    if (!window.RUNNER || typeof RUNNER.open !== 'function') return false;
    hideTip();   /* 구석 쪽지는 그대로 (달리기 창은 모달 — 닫으면 다시 보인다) */
    opener = opener || $('btn-machine');
    if (opener && document.activeElement !== opener && !opener.hidden) focusRoomBtn(opener, !!kbd);   /* 장면이 대신 누른 톡이면 포커스가 오락기에 없다 → 먼저 옮겨 둔다 (창을 닫을 때 브라우저가 돌려주는 자리 = 오락기) */
    RUNNER.open({ opener: opener });
    return true;
  }
  /* 구석 쪽지: 놀이방에 있는 동안 문어가 산책에서 돌아오면 (sceneFor 'return'). 이름 + 조사 (WORLD.strings.backNote) · 보러 가기 = 문으로 다락에.
     놀이방을 벗어나면(어느 길로든) 걷는다. 글은 보인 뒤에 넣는다 (role=status 가 읽어 준다) */
  var noteTimer = 0;
  function noteBack() {
    if (!inPlay()) return;
    var n = $('back-note'), t = $('back-note-txt'); if (!n || !t) return;
    var nm = S.octopus.name || '', txt = typeof STR.backNote === 'function' ? STR.backNote(nm) : (nm || '문어') + ' 돌아왔어.';
    if (!n.hidden && t.textContent === txt) return;
    clearTimeout(noteTimer); t.textContent = ''; n.hidden = false; toastRefit();
    noteTimer = setTimeout(function () {   /* 이름은 따로 (긴 이름은 css 가 줄임표로 — 쪽지가 두 줄을 넘지 않게). 읽어 주는 글은 온전한 문장 그대로 */
      if (n.hidden) return;
      var who = nm || '문어';
      if (txt.indexOf(who) !== 0) { t.textContent = txt; return; }
      var a = document.createElement('span'), b = document.createElement('span');
      a.className = 'bn-name'; a.textContent = who; b.className = 'bn-rest'; b.textContent = txt.slice(who.length);
      t.appendChild(a); t.appendChild(b);
    }, 60);
  }
  function hideBackNote() {
    clearTimeout(noteTimer);
    var n = $('back-note'), t = $('back-note-txt');
    if (n && !n.hidden) { if (n.contains(document.activeElement)) { var d = $('btn-play-door'); if (d && !d.hidden) d.focus({ preventScroll: true }); } n.hidden = true; }
    if (t) t.textContent = '';
  }
  function bindRooms() {
    function on(id, fn) {
      var b = $(id); if (!b) return;
      b.addEventListener('click', function (e) { fn(e.currentTarget, kbdClick(e)); });
      b.addEventListener('blur', function () { b.classList.remove('ring-off'); });
      b.addEventListener('keydown', function (e) { if (e.repeat && (e.key === 'Enter' || e.key === ' ')) e.preventDefault(); });   /* Enter 를 누르고 있으면: 도착한 방의 맞은편 문으로 포커스가 옮겨 가 자동 반복이 그 문을 또 연다 → 반복 키는 삼킨다 */
    }
    on('btn-door', function (b, k) { goRoom('play', b, k); });
    on('btn-play-door', function (b, k) { goRoom('attic', b, k); });
    on('btn-machine', function (b, k) { openMachine(b, k); });
    on('btn-stair', function (b, k) { goRoom('loft', b, k); });
    on('btn-loft-stair', function (b, k) { goRoom('attic', b, k); });
    on('btn-sew', function () { openSew(); });
    [0, 1, 2].forEach(function (i) { on('btn-plot' + i, function () { gardenAct(i); }); var b = $('btn-plot' + i); if (b) b.addEventListener('focus', plotLabels); });   /* 바깥 텃밭 칸 (바깥이 보일 때만 장면이 단추를 올린다) · 포커스 때 이름을 다시 (11-11: 씨앗 수 · 날짜가 바뀌었을 수 있다) */
    on('btn-salon', function () { openSalon(); });   /* 미용실 거울 (그림 위 투명 단추 — 톡은 장면이 그린 순서대로 넘긴다: 문어가 거울 옆이면 문어가 먼저) */
    on('btn-back-see', function (b, k) { goRoom('attic', b, k); });
    document.addEventListener('keydown', function () { var r = document.querySelectorAll('.ring-off'); for (var i = 0; i < r.length; i++) r[i].classList.remove('ring-off'); }, true);   /* 키를 누르면 링은 다시 (키보드로 이어 가는 사람) */
  }

  /* ───────────────────────── stick: 내 캐릭터 움직이기 — 발자국 손잡이(가상 스틱) + 방향키 (주인 11-08) ───────────────────────── */
  /* 주인 11-08: 모바일 게임의 왼쪽 아래 흐린 동그라미 + 발자국 아이콘을 보고 "바닥 톡보다 훨씬 자연스럽다" → 1차 조작 = 장면(#scene) 왼쪽 아래 발자국 손잡이(#stick), 보조 = 방향키 · WASD (데스크톱).
     바닥 톡으로 걷기 · 가상 D패드는 만들지 않는다 (docs/OWNER_DECISIONS.md 11-08). 장면 계약은 docs/SCENE.md '내 캐릭터 › 움직이기': setPlayerInput({ x, y } | null) · playerInputAllowed() · on.playerInput(allowed) · on.playerStep().
     스틱 위에서 시작한 포인터는 스틱만 잡는다 (setPointerCapture — 문어 쪽 손가락 문법(밀기 · 핀치 · 돌려 보기 · 톡)과 안 겹친다, 캔버스로 안 간다). 중심에서의 벡터를 반지름 22px 로 나눠 0..1 로 자르고, 데드존 0.15 안이면 { 0, 0 } (잡고만 있음),
     밖이면 데드존을 뺀 비율 → scene.setPlayerInput({ x, y }) (화면 위 = +y) · 손을 떼면 null (장면이 멈추고 도착 눌림 한 번). 손잡이(와 발자국 그림)는 벡터만큼 (최대 22px, --kx · --ky). 잡고 있는 동안 .on (또렷).
     키보드: 눌린 키 집합 → 합성 벡터(대각선 정규화) → 같은 API, 다 떼면 null. 열린 <dialog> 가 있거나 포커스가 글자 입력 · select · 슬라이더 · 장면 밖 스크롤 영역(#log) 이면 무시 (그땐 preventDefault 도 안 한다 — 시트 안 조작 · 글자 입력 · 로그 굴리기 그대로); 단추 포커스는 무시하지 않는다 (문을 지나면 포커스가 문 단추에 있다). 처리할 땐 preventDefault (페이지 스크롤 방지).
     WASD 는 e.code 로 본다 (한글 자판에서 ㅈㅁㄴㅇ 를 눌러도 같은 자리). 두 입력이 겹치면 스틱이 이긴다 (스틱을 잡은 동안 키는 쌓이기만 하고, 놓으면 키 쪽으로).
     보이기: 장면이 on.playerInput(allowed) 를 바뀔 때만 보낸다 (다락 · 놀이방이 보일 때만 — 바깥 · 입장 연출 · 문 작업 · 전환 · 놀이 kit 중엔 false) → hidden 과 #scene.stick-on (구석 쪽지가 위로 비킨다).
     2D 폴백 · 장면에 API 가 없으면 늘 숨김. 숨을 땐 잡고 있던 손가락 · 키도 놓는다 (멈춤). 설정의 모션 줄이기와 무관하게 쓸 수 있다.
     소리: 장면이 on.playerStep() 을 쏘면 AUDIO.on('step') — js/audio.js 엔 아직 'step' 갈래가 없어 조용하다 (발소리 step_1~4 는 소리 한 벌에 있다 · 소리 세션 몫, BACKLOG '안 불리는 소리 연결') */
  var STICK_R = 22, STICK_DEAD = 0.15, STICK_FULL = 0.5;
  var STICK_KEYS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1], KeyA: [-1, 0], KeyD: [1, 0], KeyW: [0, 1], KeyS: [0, -1] };
  var stk = { allowed: false, pid: null, keys: {}, vec: null, sent: 0, ox: 0, oy: 0 };
  function stickApi() { return !!scene && sceneMode === '3d' && typeof scene.setPlayerInput === 'function'; }
  function stickSend(v) {   /* 장면에 입력 벡터 (같은 값은 다시 안 보낸다 — 키 자동 반복 · 데드존 안 움직임) */
    var nv = v ? { x: +v.x || 0, y: +v.y || 0 } : null;
    var same = (!nv && !stk.vec) || (!!nv && !!stk.vec && nv.x === stk.vec.x && nv.y === stk.vec.y);
    stk.vec = nv;
    if (same || !stickApi()) return;
    stk.sent++;
    try { scene.setPlayerInput(nv ? { x: nv.x, y: nv.y } : null); } catch (e) { console.warn('[app] setPlayerInput', e); }
  }
  function stickKnob(dx, dy) {   /* 손잡이 + 발자국 그림을 벡터만큼 (정수 px, 최대 반지름) */
    var el = $('stick'); if (!el) return;
    if (!dx && !dy) { el.style.removeProperty('--kx'); el.style.removeProperty('--ky'); return; }
    el.style.setProperty('--kx', Math.round(dx) + 'px'); el.style.setProperty('--ky', Math.round(dy) + 'px');
  }
  function stickFromPointer(el, e) {
    var dx = e.clientX - stk.ox, dy = e.clientY - stk.oy, len = Math.hypot(dx, dy);   /* 가운데 = 처음 누른 자리 (떠다니는 스틱) */
    var k = Math.min(1, len / STICK_R);   /* 0..1 */
    stickKnob(len ? dx / len * k * STICK_R : 0, len ? dy / len * k * STICK_R : 0);
    if (!len || k < STICK_DEAD) { stickSend({ x: 0, y: 0 }); return; }   /* 데드존: 잡고만 있다 (멈춤 · 도착 눌림은 놓을 때 한 번) */
    var m = Math.min(1, (k - STICK_DEAD) / (STICK_FULL - STICK_DEAD));   /* 반쯤만 밀어도 제 속도 — 22px 손잡이에서 끝까지 밀어야 빨라지면 답답하다 (주인 11-10) */
    stickSend({ x: dx / len * m, y: -dy / len * m });   /* 화면 위 = +y */
  }
  function busyRoomWalk() { return !!document.querySelector('dialog[open]'); }
  function stickKeyVec() {   /* 눌린 키들의 합성 벡터 (없으면 null · 서로 상쇄면 { 0, 0 }) */
    var x = 0, y = 0, any = false;
    Object.keys(stk.keys).forEach(function (k) { var d = STICK_KEYS[k]; if (d) { x += d[0]; y += d[1]; any = true; } });
    if (!any) return null;
    var l = Math.hypot(x, y); return l ? { x: x / l, y: y / l } : { x: 0, y: 0 };
  }
  function stickRelease(el) {   /* 손을 뗌 (또는 숨김 · 탭을 떠남): 멈춤 · 손잡이 가운데로 · 키가 남아 있으면 그쪽으로 */
    el = el || $('stick');
    if (stk.pid != null) { var pid = stk.pid; stk.pid = null; if (el) { try { el.releasePointerCapture(pid); } catch (e) { /* 이미 풀림 */ } } }
    if (el) { el.classList.remove('on'); stickKnob(0, 0); el.style.removeProperty('left'); el.style.removeProperty('top'); el.style.removeProperty('bottom'); }   /* 제자리(왼쪽 아래)로 */
    stickSend(stickKeyVec());
  }
  function stickKeyIgnored() {   /* 열린 창 · 글자 입력(input · textarea · select · contenteditable · 슬라이더) · 장면 밖 스크롤 영역(#log 등 role=log) 에 포커스가 있으면 방향키를 그대로 둔다 (시트 안 조작 · 로그 굴리기와 안 섞이게).
                                    단추 포커스는 무시하지 않는다 — 방을 옮기면 focusRoomBtn 이 도착한 문 단추에, 시트를 닫으면 브라우저가 연 단추에 포커스를 두므로 단추를 뺐다간 문을 지난 뒤 · 설정을 닫은 뒤 방향키가 아무 일도 안 했다 (리뷰 11-09, 단추는 방향키를 안 쓴다) */
    if (!stk.allowed || !stickApi()) return true;
    if (document.querySelector('dialog[open]')) return true;
    var ae = document.activeElement;
    if (!ae || ae === document.body || ae === document.documentElement) return false;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) || ae.isContentEditable || ae.getAttribute('role') === 'slider') return true;
    var sc = $('scene');
    return !!(ae.closest && (ae.closest('[role="log"]') || (ae.scrollHeight > ae.clientHeight + 1 && !(sc && sc.contains(ae)))));
  }
  function stickKey(e, down) {
    if (!e) return;
    var k = /^Key[WASD]$/.test(e.code || '') ? e.code : e.key;
    if (!STICK_KEYS[k]) return;
    if (down) {
      if (e.ctrlKey || e.metaKey || e.altKey) { if (!stk.keys[k]) return; delete stk.keys[k]; }   /* 수정키 조합(브라우저 단축키)은 새 누름이 아니다 — 이미 눌린 키면 놓은 것으로 (keyup 은 수정키와 상관없이 지운다: 방향키를 누른 채 Ctrl/Cmd 를 누르고 떼면 keyup 이 버려져 손을 뗀 뒤에도 걸었다, 리뷰 11-09) */
      else { if (stickKeyIgnored()) return; if (e.repeat) { if (stk.keys[k]) e.preventDefault(); return; }   /* 자동 반복은 이미 눌린 키만 유지하고 새로 등록하지 않는다 (창이 열린 채 누르고 있던 키가 창이 닫히는 순간 걷게 하지 않게) */
        stk.keys[k] = 1; e.preventDefault();
        var fa = document.activeElement; if (fa && fa.blur && fa.closest && fa.closest('.scene-spot, .scene-door')) fa.blur(); }   /* 걷기 키를 누르면 방 단추(오락기 · 문)의 포커스를 놓는다 — 브라우저가 키 입력에 :focus-visible 노란 테두리를 켰다 (주인 11-10). Tab 으로 옮겨 온 링은 걷기 전까지 그대로 */
    }
    else { if (!stk.keys[k]) return; delete stk.keys[k]; }
    if (stk.pid != null) return;   /* 스틱을 잡고 있으면 스틱이 이긴다 */
    stickSend(stickKeyVec());
  }
  function stickShow(allowed) {   /* 장면의 on.playerInput(allowed) · stickSync: hidden 과 #scene.stick-on. 숨길 땐 다 놓는다 */
    var el = $('stick'), sc = $('scene');
    allowed = !!allowed && stickApi();
    if (!allowed) { stk.keys = {}; stickRelease(el); }
    stk.allowed = allowed;
    if (el && el.hidden !== !allowed) el.hidden = !allowed;
    var zn = $('stick-zone'); if (zn && zn.hidden !== !allowed) zn.hidden = !allowed;
    if (sc && sc.classList.contains('stick-on') !== allowed) sc.classList.toggle('stick-on', allowed);
  }
  function stickSync() { stickShow(stickApi() && typeof scene.playerInputAllowed === 'function' ? !!scene.playerInputAllowed() : false); }
  function bindStick() {
    var el = $('stick'); if (!el) return;
    var zone = $('stick-zone') || el;   /* 누르는 곳은 구역, 보이는 것은 #stick (pointer-events 없음) */
    zone.addEventListener('pointerdown', function (e) {
      if (!stk.allowed || !stickApi() || el.hidden) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (stk.pid != null) return;   /* 두 번째 손가락은 무시 */
      e.preventDefault(); e.stopPropagation();
      stk.pid = e.pointerId;
      try { zone.setPointerCapture(e.pointerId); } catch (err) { /* 캡처 못 함: 그래도 구역 위에서의 move 는 받는다 */ }
      /* 스틱 가운데를 누른 자리로 (장면 안쪽으로 반 칸 여유) */
      var host = el.offsetParent || document.body, hr = host.getBoundingClientRect(), half = el.offsetWidth / 2;
      var cx = Math.max(hr.left + half + 4, Math.min(hr.right - half - 4, e.clientX)), cy = Math.max(hr.top + half + 4, Math.min(hr.bottom - half - 4, e.clientY));
      stk.ox = cx; stk.oy = cy;
      el.style.left = Math.round(cx - hr.left - half) + 'px'; el.style.top = Math.round(cy - hr.top - half) + 'px'; el.style.bottom = 'auto';
      el.classList.add('on');
      stickFromPointer(el, e);
    });
    zone.addEventListener('pointermove', function (e) { if (stk.pid == null || stk.pid !== e.pointerId) return; e.preventDefault(); e.stopPropagation(); stickFromPointer(el, e); });
    function up(e) { if (stk.pid == null || stk.pid !== e.pointerId) return; e.stopPropagation(); stickRelease(el); }
    zone.addEventListener('pointerup', up); zone.addEventListener('pointercancel', up); zone.addEventListener('lostpointercapture', up);
    zone.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });   /* 길게 누르고 있어도 메뉴가 뜨지 않게 */
    document.addEventListener('keydown', function (e) { stickKey(e, true); });
    document.addEventListener('keyup', function (e) { stickKey(e, false); });
    window.addEventListener('blur', function () { stk.keys = {}; stickRelease(el); });   /* 탭 · 창을 떠나면 다 놓는다 (keyup 을 못 받는다) */
    document.addEventListener('visibilitychange', function () { if (document.hidden) { stk.keys = {}; stickRelease(el); } });
  }

  /* ───────────────────────── tip: 상태 줄의 작은 말풍선 ───────────────────────── */
  /* '데모'·등불을 누르면 그 아래 짧은 한 줄 (#tip, role=status · polite). 2.5 s 뒤 사라지고, 같은 것을 다시 누르거나 다른 곳을 누르면 바로 닫힌다.
     모양 전환은 css (모션 줄이기면 그냥 나타난다). 자리: 누른 것 아래 가운데, 상태 줄 안쪽 16px 안 (정수 px).
     말풍선은 큰 버튼(#btn-go) 위에 겹쳐 뜬다 → 떠 있는 동안 말풍선을 누르면 말풍선만 닫히고 아래 버튼은 눌리지 않는다 (css .tip.show 가 탭을 받는다 · bindTip).
     head = 첫 줄 (등불: 폰 폭에서 상태 줄에 안 보이는 방 제목) */
  var TIP_MS = 2500, tipTimer = 0, tipFor = null, tipVW = 0;
  function tip(anchor, text, head) {
    var t = $('tip'), host = $('status'); if (!t || !host || !anchor) return;
    if (tipFor === anchor && t.classList.contains('show')) { hideTip(); return; }
    clearTimeout(tipTimer); tipFor = anchor; tipVW = window.innerWidth;
    t.textContent = '';
    if (head) t.appendChild(h('span', { class: 'tip-head', text: head }));
    t.appendChild(h('span', { class: 'tip-line', text: text }));
    var hr = host.getBoundingClientRect(), ar = anchor.getBoundingClientRect(), w = Math.ceil(t.getBoundingClientRect().width), cx = ar.left + ar.width / 2 - hr.left;
    var sh = layoutOne() && $('shell') ? $('shell').getBoundingClientRect() : hr, lo = sh.left + 16 - hr.left, hi = sh.right - 16 - w - hr.left;   /* 한 화면 배치에선 상태 줄이 좁은 쪽지라 화면(#shell) 폭 안에서 맞춘다 */
    var left = Math.round(clamp(cx - w / 2, lo, Math.max(lo, hi)));   /* 상태 줄 바깥 상자 기준 (테두리 포함) */
    t.style.left = (left - host.clientLeft) + 'px'; t.style.setProperty('--tip-x', Math.round(clamp(cx - left, 10, Math.max(10, w - 10))) + 'px');   /* left 는 테두리 안쪽(패딩 상자) 기준이라 테두리 폭만큼 뺀다 */
    t.style.top = ar.bottom > hr.bottom ? Math.round(ar.bottom - hr.top - host.clientTop + 8) + 'px' : '';   /* 좁은 폰에선 '데모' 꼬리표가 바 아래에 매달려 있다 — 말풍선이 제 꼬리표를 덮지 않게 그 밑으로 (보통은 css 의 바 밑 4px) */
    t.classList.add('show'); anchor.setAttribute('aria-expanded', 'true');
    tipTimer = setTimeout(hideTip, TIP_MS);   /* 읽는 시간이라 --speed(개발용 느리게)와 상관없이 2.5 s */
  }
  /* 닫을 때 자리도 비운다: 가로 화면에서 정한 left 가 남으면 세로로 돌렸을 때 빈 말풍선이 화면 밖으로 나가 옆으로 밀린다 */
  function hideTip() {
    clearTimeout(tipTimer);
    var t = $('tip'); if (t) { t.classList.remove('show'); t.textContent = ''; t.style.left = ''; t.style.top = ''; t.style.removeProperty('--tip-x'); }
    if (tipFor) tipFor.setAttribute('aria-expanded', 'false');
    tipFor = null;
  }
  /* 폰에서(상태 줄이 방 제목을 숨기는 폭) 등불 말풍선 첫 줄 = 방 제목. 넓은 화면은 상태 줄에 이미 보이니 빼고 한 줄만 */
  /* 등불 설명의 첫 줄 = 상태 줄에서 숨긴 것들: 방 제목 · (좁은 폰의 한 화면 배치에서) 등불 숫자 */
  function pipsHead() {
    var out = [], rt = hiddenRoomTitle(), n = document.querySelector('#pips .pips-n');
    if (rt) out.push(rt);
    if (n && n.textContent && getComputedStyle(n).display === 'none') out.push('등불 ' + n.textContent);
    return out.join(' · ');
  }
  function hiddenRoomTitle() { var rt = $('room-title'); return rt && rt.textContent && getComputedStyle(rt).display === 'none' ? rt.textContent : ''; }
  function bindTip() {
    $('pips').addEventListener('click', function (e) { tip(e.currentTarget, LANTERN_TIP, pipsHead()); });
    $('brain-tag').addEventListener('click', function (e) { tip(e.currentTarget, BRAIN_TIP); });
    var t = $('tip');
    /* 말풍선을 누르면 말풍선만 닫는다 — 아래 큰 버튼으로 새지 않게 click 을 여기서 멈춘다. 누르는 동안엔 저절로 닫히지 않는다 (닫히면 손을 뗄 때 아래 버튼이 눌린다) */
    t.addEventListener('pointerdown', function () { clearTimeout(tipTimer); });
    ['pointerup', 'pointercancel'].forEach(function (n) { t.addEventListener(n, function () { clearTimeout(tipTimer); if (tipFor) tipTimer = setTimeout(hideTip, TIP_MS); }); });   /* 길게 누르기 · 끌기로 click 이 안 오면 다시 2.5 s */
    t.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); hideTip(); });
    /* 말풍선 밖을 누르면 닫는다 (같은 단추를 다시 누르는 건 tip 이 · 말풍선 자신은 위 click 이 닫는다) */
    document.addEventListener('pointerdown', function (e) { if (tipFor && !(e.target.closest && e.target.closest('#pips, #brain-tag, #tip'))) hideTip(); }, true);
    /* 화면 폭이 바뀌면(기기 돌리기) 닫는다 — 정해 둔 자리가 새 폭에 맞지 않는다 */
    window.addEventListener('resize', function () { if (tipFor && window.innerWidth !== tipVW) hideTip(); });
  }
  var BRAIN_TIP = '지금은 모델이 아니라 미리 만든 규칙이 골라', LANTERN_TIP = '초대한 날마다 한 칸 켜져';

  /* ───────────────────────── demo controls (§7.6) ───────────────────────── */
  var demo = { phase: 'start', events: [], t0: 0, hint: '', hung: false, wrapped: false };
  function demoSet(phase) {
    demo.phase = phase;
    var on = { start: ['d-depart', 'd-stay'], out: ['d-peek', 'd-return'], back: ['d-poster', 'd-wrap'] }[phase] || [];
    ['d-depart', 'd-stay', 'd-peek', 'd-return', 'd-poster', 'd-wrap'].forEach(function (id) { var b = $(id); if (b) b.disabled = on.indexOf(id) < 0 || busy; });
    if ($('d-import')) $('d-import').disabled = busy || phase !== 'start';
  }
  function demoMsg(t) { var m = $('d-msg'); if (m) m.textContent = t || ''; }
  function demoT() { return Date.now() - demo.t0; }
  function demoFinish(byKind) {
    if (!B || typeof B.replay !== 'function') { demoMsg('두뇌(brain.js)가 없어 재생할 수 없어'); return; }
    var dk = todayKey(), seq = tripsOn(dk).length + 1;
    var meta = { by: byKind || 'human', dateKey: dk, seq: seq, name: S.octopus.name || '', now: new Date(), seed: B.hashSeed(dk, demo.hint, seq, 'human', String(demo.events.length)),
      state: replayState(dk) };
    var planned;
    try { planned = B.replay(demo.events, meta); } catch (e) { demoMsg('재생 실패: ' + e.message); return; }
    var trip = { id: newTripId(meta.seed), date: dk, seq: seq, seed: meta.seed, kind: null, by: meta.by, hint: { raw: demo.hint }, status: 'running', startedAt: demo.t0 || Date.now(), endedAt: null, events: [], receipt: null, poster: null };
    trip.weather = weatherFor(S.room.lantern);
    mergePlan(trip, planned); trip.by = meta.by;   /* events = 두뇌가 정리한 것 (mergePlan) — 로그·영수증이 같은 말을 한다 (§5.4.1) */
    S.trips.push(trip); save();
    skipFlag = true; jumpCeremony(); setBusy(true); flying = trip;
    var today = ensureTodaySection(); today.querySelectorAll('.lrow.demo-live').forEach(function (r) { r.remove(); });
    reveal(trip).then(function () { setBusy(false); demo = { phase: 'start', events: [], t0: 0, hint: '', hung: false, wrapped: false }; demoSet('start'); demoMsg('사람이 조작한 산책이 저장됐어 (고른 이: 사람이 조작)'); renderLog(); });
  }
  function demoLive(ev) { var row = eventRow({ hint: {}, receipt: null, poster: null }, ev); if (row) { row.classList.add('demo-live'); appendLogRow(ensureTodaySection(), row); } }
  function bindDemo() {
    demoSet('start');
    $('d-depart').addEventListener('click', function () {
      if (busy) return;
      skipFlag = false;   /* 앞선 건너뛰기·데모 저장이 남긴 표시 — 이번 출발 의식은 처음부터 */
      wakeUp(); demo.t0 = Date.now(); demo.hint = ''; demo.events = [{ type: 'depart', t: 0, hint: '', followHint: false }];
      demoLive(demo.events[0]); oct.busy = true; stopWander(); demoSet('out');
      if (!hasCeremony()) { walkTo('door').then(function () { octState('away'); }); return; }
      departOut();
    });
    $('d-stay').addEventListener('click', function () {
      if (busy) return;
      demo.t0 = Date.now(); demo.hint = '';
      demo.events = [{ type: 'stay_home', t: 0, activity: 'window_watch', line: '창밖을 그냥 봤어', anchor: 'window' }, { type: 'wrap_up', t: 1500, reaction: '졸림' }];
      demoFinish('human');
    });
    $('d-peek').addEventListener('click', function () {
      var raw = ($('d-peek-in').value || '').trim(); if (!raw) { demoMsg('기웃거릴 곳을 적어 줘'); return; }
      var m = B && B.matchHint ? B.matchHint(raw) : { kind: 'wiki', query: raw }, ev = { type: 'peek', t: demoT(), ms: 3000 + Math.floor(uiRng() * 6000), first: false, viaTangent: demo.events.filter(function (e) { return e.type === 'peek'; }).length > 0 };
      if (m.kind === 'node') { var nd = nodeOf(m.nodeId); ev.target = { kind: 'room', id: m.nodeId, title: nd ? nd.name : m.nodeId, wiki: nd ? nd.wiki : null }; ev.status = nd && (nd.linger || m.nodeId === 'letter_room') ? 'none' : nd && nd.clue ? 'builtin' : 'failed'; ev.note = ev.status === 'builtin' ? nd.clue : ''; ev.first = !(S.octopus.visits[m.nodeId] > 0); }
      else if (m.kind === 'url') { ev.target = { kind: 'url', url: m.url }; ev.status = 'simulated'; ev.note = '정적 페이지라 바깥은 못 읽어. 문 앞까지만 갔다 왔어'; }
      else { ev.target = { kind: 'wild', title: raw }; ev.status = 'simulated'; ev.note = '사람이 고른 곳이라 내용은 읽지 않았어'; }
      demo.events.push(ev); demoLive(ev); $('d-peek-in').value = '';
    });
    $('d-return').addEventListener('click', function () {
      if (!demo.events.some(function (e) { return e.type === 'peek'; })) { demoMsg('한 곳은 기웃거리고 돌아오자'); return; }
      var ev = { type: 'return', t: demoT(), reason: 'enough' }; demo.events.push(ev); demoLive(ev);
      demoSet('back');
      (hasCeremony() ? runCeremony('return') : Promise.resolve()).then(function (r) {
        if (r && r.cancelled) return;
        ensureAttic(); octPlace('door'); walkTo('board', 'carry').then(function () { octState('idle'); });
      });
    });
    $('d-poster').addEventListener('click', function () {
      if (demo.hung) return; demo.hung = true;
      var peeks = demo.events.filter(function (e) { return e.type === 'peek'; }), idx = peeks.length - 1, last = peeks[idx] || {};
      var nd = last.target && last.target.id ? nodeOf(last.target.id) : null;
      demo.events.push({ type: 'remember', t: demoT(), stopIdx: idx, sticker: nd ? (nd.sticker || nd.id) : 'wild', line: '사람이 골라 준 길을 걸었어. ' + (last.target ? (last.target.title || '') : '') });
      demo.events.push({ type: 'hang_poster', t: demoT(), posterId: null });
      $('d-poster').disabled = true; if (demo.wrapped) demoFinish('human');
    });
    $('d-wrap').addEventListener('click', function () {
      if (demo.wrapped) return; demo.wrapped = true;
      demo.events.push({ type: 'wrap_up', t: demoT(), reaction: '덤덤' });
      $('d-wrap').disabled = true; if (demo.hung) demoFinish('human'); else demoMsg('포스터도 누르면 저장돼. 포스터 없이 끝내려면 다시 마무리를 눌러 줘');
      if (!demo.hung) { $('d-wrap').disabled = false; $('d-wrap').onclick = function () { if (demo.wrapped && !demo.hung) { demoFinish('human'); $('d-wrap').onclick = null; } }; }
    });
    $('d-import').addEventListener('click', function () { importEvents($('d-json').value); });
  }
  function importEvents(json) {
    if (busy) return false;
    checkDay(true);   /* 날이 바뀌었으면 오늘 칸부터 (invite 와 같다) */
    var evs;
    try { evs = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { demoMsg('JSON 을 읽을 수 없어: ' + e.message); return false; }
    if (!Array.isArray(evs) || !evs.length) { demoMsg('이벤트 배열이 비어 있어'); return false; }
    if (!B || typeof B.replay !== 'function') { demoMsg('두뇌(brain.js)가 없어'); return false; }
    var dk = todayKey(), seq = tripsOn(dk).length + 1;
    var dep = evs.filter(function (e) { return e && e.type === 'depart'; })[0];
    var meta = { by: 'mcp', dateKey: dk, seq: seq, name: S.octopus.name || '', now: new Date(), seed: B.hashSeed('mcp', dk, seq, JSON.stringify(evs)),
      state: replayState(dk) };
    var planned;
    try { planned = B.replay(evs, meta); } catch (e) { demoMsg('재생 실패: ' + e.message); return false; }
    var trip = { id: newTripId(meta.seed), date: dk, seq: seq, seed: meta.seed, kind: null, by: 'mcp', hint: { raw: dep ? (dep.hint || '') : '' }, status: 'running', startedAt: Date.now(), endedAt: null, events: [], receipt: null, poster: null };
    trip.weather = weatherFor(S.room.lantern);
    mergePlan(trip, planned); trip.by = 'mcp';   /* events = 두뇌가 정리한 것 (입력의 '읽음'·출처를 그대로 보여 주지 않게) */
    S.trips.push(trip); save();
    $('d-json').value = ''; demoMsg('모델(MCP) 이벤트를 재생 중…');
    wakeUp(); setBusy(true); skipFlag = false; flying = trip; broughtBack = false; renderBrainTag(); demoSet('start');
    reveal(trip).then(function () { broughtBack = skipFlag; backAt = Date.now(); setBusy(false); demoSet('start'); demoMsg('재생 끝 (고른 이: 모델(MCP))'); });
    return true;
  }

  /* ───────────────────────── boot ───────────────────────── */
  function bind() {
    $('btn-go').addEventListener('click', goTap);
    bindFurn();
    if ($('btn-sofa')) $('btn-sofa').addEventListener('click', function () { if (scene && typeof scene.playerSit === 'function') scene.playerSit(); });
    $('btn-settings').addEventListener('click', openSettings);
    $('set-close').addEventListener('click', function () { $('settings-sheet').close(); });
    $('settings-sheet').addEventListener('close', function () { applyLook({ still: true }); });   /* 개발용 슬라이더로 미리 보기만 하고 닫았으면 장면은 기록 색으로 */
    buildNameColors();   /* 첫 실행 창의 몸 색 6칸 (js/salon.js PRESETS) */
    bindRooms();   /* 방 문 · 오락기 · 구석 쪽지 (8물결) */
    bindStick();   /* 발자국 손잡이 · 방향키 (11-08 움직이기) */
    bindTip();   /* '데모' · 등불 → 작은 말풍선 */
    $('pd-flip').addEventListener('click', flipPoster);
    $('pd-front').addEventListener('click', flipPoster);
    $('pd-close').addEventListener('click', function () { $('poster-dialog').close(); });
    $('pd-save').addEventListener('click', function () { savePNG(); });
    $('pd-copy').addEventListener('click', function () { var t = tripById(openTripId); if (t) copyText(shareLine(t)); });
    $('poster-dialog').addEventListener('click', function (e) { if (clickedOutside(e.currentTarget, e)) e.currentTarget.close(); });
    $('pd-back').addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('.copy[data-share]'); if (b) { e.stopPropagation(); copyText(b.getAttribute('data-share')); } });
    $('settings-sheet').addEventListener('click', function (e) { if (clickedOutside(e.currentTarget, e)) e.currentTarget.close(); });
    $('look-close').addEventListener('click', function () { $('look-sheet').close(); });
    $('look-sheet').addEventListener('click', function (e) { if (clickedOutside(e.currentTarget, e)) e.currentTarget.close(); });
    $('look-sheet').addEventListener('close', function () { LOOK.queue = []; if (LOOK.onChange) LOOK.onChange(); });   /* 설정 줄의 한마디 · 초상을 새 모습으로 */
    $('btn-album').addEventListener('click', openAlbum);
    $('al-close').addEventListener('click', function () { $('album-sheet').close(); });
    $('album-sheet').addEventListener('click', function (e) { if (clickedOutside(e.currentTarget, e)) e.currentTarget.close(); });
    $('album-sheet').addEventListener('close', markAlbumSeen);   /* 열어 둔 사이에 붙은 포스터도 본 것으로 */
    $('btn-today').addEventListener('click', openLog);
    $('log-close').addEventListener('click', function () { $('log-sheet').close(); });
    $('log-sheet').addEventListener('click', function (e) { if (clickedOutside(e.currentTarget, e)) e.currentTarget.close(); });
    window.addEventListener('resize', function () { warnFit(); toastRefit(); });
    /* 미용실 시트 (docs/SALON.md §3.2): [물어보기] · [닫기] · 바깥 톡 · Esc · 손잡이 끌기. 그만두는 길은 모두 기록 0 · 병은 제자리로 (salonOffer(null)) */
    var ssh = $('salon-sheet');
    if (ssh) {
      $('salon-ask').addEventListener('click', function (e) { salonAsk(kbdClick(e)); });
      $('salon-close').addEventListener('click', function () { ssh.close(); });
      /* 바깥 톡 = 그만두기. 단, 시트를 연 바로 그 톡의 뒤따르는 click 은 빼고: 손가락으로 거울을 누르면 장면이 pointerup 에서 단추를 눌러 시트가 열리고,
         브라우저가 같은 톡의 click 을 한 번 더 보낸다 — 시트가 낮아 거울 자리는 '바깥' 이라 열리자마자 닫혔다 (폰에서 시트가 안 열리던 결함, 검증 11-10). 마우스는 그 click 이 캔버스로 간다 */
      ssh.addEventListener('click', function (e) { if (clickedOutside(e.currentTarget, e) && !salonOpeningTap(e.currentTarget, e)) e.currentTarget.close(); });
    }
    bindDialogs(); watchLogScroll(); bindAlbumPress(); bindSheetDrag('settings-sheet'); bindSheetDrag('album-sheet'); bindSheetDrag('look-sheet'); bindSheetDrag('log-sheet'); bindSheetDrag('salon-sheet');
    /* 미용실 시트의 바깥 톡 닫기는 위의 click 처리 하나만 쓴다: 브라우저가 스스로 하는 것 (closedby="any" — bindDialogs) 은 톡의 시각을 보지 않아, 거울을 두 번 톡 한 둘째 톡에 방금 연 시트를 닫았다 (검증 11-10 P6 = E12).
       연 뒤 잠깐만 꺼 두는 타이머는 프레임이 밀리는 기기에서 둘째 톡보다 먼저 풀렸다 → 이 시트는 늘 'closerequest' (Esc · 뒤로 가기는 그대로 닫는다 · closedby 를 모르는 브라우저는 원래 click 처리뿐) */
    if (ssh && ssh.getAttribute('closedby') != null) ssh.setAttribute('closedby', 'closerequest');
    if (ssh) ssh.addEventListener('close', function () {   /* bindDialogs 의 포커스 돌려주기 뒤 */
      if (!salonRun && scene && typeof scene.salonOffer === 'function') scene.salonOffer(null);   /* 물어보기로 닫은 게 아니면 병은 제자리로 (연출 중엔 내민 병이 연출의 첫 자리) */
      salonPickHex = null; var nm = $('salon-name'); if (nm) nm.textContent = '';
    });
    document.addEventListener('touchstart', function () { /* 빈 리스너: iOS Safari 는 터치 리스너가 있어야 :active(눌림) 모양을 그린다 */ }, { passive: true });
    /* 데모 <details>: 개발 모드에서만 보인다 (index.html 에선 hidden 으로 시작). 접힌 채 시작, 뷰어별로 펼침 기억 (UI R2) */
    var demoEl = $('demo');
    if (demoEl) {
      demoEl.hidden = !DEV;
      if (DEV) { if (uiPref().demoOpen) demoEl.open = true; demoEl.addEventListener('toggle', function () { setUiPref('demoOpen', demoEl.open); }); }
    }
    /* 탭을 떠날 때 저장 · 다른 탭이 저장하면 다시 그린다 (R4, R5) */
    document.addEventListener('visibilitychange', function () { if (document.hidden && S.octopus.name) save(); else if (!document.hidden) { checkDay(); syncRest(); claudeSync(false); } if (rest) restTick(); });   /* 깨어 있는 틈은 보이는 동안만 센다 · Claude 에서 다녀온 산책 */
    setTimeout(function () { claudeSync(false); }, 2500);   /* 열 때 한 번: Claude 에서 다녀온 산책 (연결했을 때만) */
    window.addEventListener('pagehide', restKeep);   /* 새로고침: 남은 틈을 이 탭에 넘긴다 (octInitial 이 읽고 지운다) */
    window.addEventListener('pageshow', function (e) { if (e.persisted) { try { sessionStorage.removeItem(REST_KEY); } catch (err) { /* noop */ } } });   /* 뒤로 가기 캐시에서 돌아왔으면 넘길 것 없음 (틈은 그대로 이어진다) */
    window.addEventListener('scroll', function () { if (rest && !rest.lying) { clearTimeout(scrollRest); scrollRest = setTimeout(restTick, 120); } }, { passive: true });   /* 장면을 다시 올려 보면 곧바로 이어 센다 */
    window.addEventListener('storage', function (e) {
      if (e.key !== KEY || !e.newValue || e.newValue === lastSaved) return;
      var o = parseState(e.newValue);   /* 11-13 (C6): 한 번만 읽어 그대로 넘긴다 */
      if (performance.now() - importAt < IMPORT_HOLD && seenOf(o) < importSeen) return;   /* 11-13: 불러오기 전에 쓰인 기록 (importSeen) — 불러온 직후만 (C2) */
      takeRemote(e.newValue, o);
    });
    $('name-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = ($('name-in').value || '').trim(); if (!v) { $('name-in').focus(); return; }
      var first = !S.octopus.name;
      S.octopus.name = v; if (!S.octopus.born) S.octopus.born = Date.now();
      /* 몸 색은 처음 한 번 (docs/SALON.md §1.1): 이름과 같은 저장 한 번에 — octopus.color · colors 첫 줄 { how: 'first', by } · 사본. 장면 문어는 여기서 한 번 (흔들기 없이) */
      if (!hasFirstColor()) setOctColor(namePick || DEFAULT_COLOR, { how: 'first', by: namePick ? 'player' : 'default' });
      else save();
      $('name-dialog').close(); renderStatus(false); renderScene();
      if (first) {
        checkDay(true);   /* 앱을 연 채로 자정을 넘겨 이름을 지었으면 먼저 새 날로 넘긴다 (아래 renderLog 가 넘기며 자기소개를 날 인사로 덮지 않게) */
        setTimeout(function () { renderBagChip(); dailyGift(); }, 1500);   /* 첫날도 선물 */
        setGreeting(typeof STR.firstGreeting === 'function' ? STR.firstGreeting(v) : '안녕, 나는 ' + v + '야. 비 오는 다락방에 온 걸 환영해.', 'happy');   /* 문어의 자기소개 (웃는 얼굴) */
        renderLog();
      }
    });
    $('name-dialog').addEventListener('cancel', function (e) { if (!S.octopus.name) e.preventDefault(); });
    document.querySelectorAll('.fchip[data-f]').forEach(function (b) { b.addEventListener('click', function () { albumFilter = b.dataset.f; document.querySelectorAll('.fchip[data-f]').forEach(function (x) { chipOn(x, x === b); }); renderAlbum(); }); });
    /* 문어·창문·포스터·기념품 입력은 scene 이 받아 on.* 콜백으로 준다 (§13.1) */
    if (DEV) bindLook();   /* 룩 슬라이더는 개발 모드의 데모 패널 안에만 */
    if (window.matchMedia) { var mq = window.matchMedia('(prefers-reduced-motion: reduce)'); if (mq.addEventListener) mq.addEventListener('change', applyMotion); }
    bindDemo();
    if (DEV) bindSalonDev();   /* '다음 미용실 대답' 은 ?dev=1 을 직접 붙인 탭에서만 (DEV_EXPLICIT — 안에서 본다) */
  }
  /* 데모 <details> 안 룩 슬라이더 (3D 전용, localStorage 'ppolppol_look'). 키/필 = 낮 태양 세기(0.5~4, 기본 3.0)·낮 헤미+필 세기(0~1, 기본 0.36 = 헤미; 필 방향광도 같은 비율) — 다른 시각대엔 비율로 적용 (룩 패스 4) */
  function bindLook() {
    var px = $('dv-px'), di = $('dv-dither'), ol = $('dv-outline'), yw = $('dv-yaw'), ky = $('dv-key'), fl = $('dv-fill'), sw = $('dv-swatch'), msg = $('dv-msg');
    if (!px) return;
    var L = (typeof SCENE3D !== 'undefined' && SCENE3D.LIGHTS) ? SCENE3D.LIGHTS.day : { sunI: 3, hemiI: 0.36 };
    var look = Object.assign({ pixelSize: 3, dither: 0.25, outline: true, yaw: 0, key: L.sunI, fill: L.hemiI }, lookNow());
    px.value = look.pixelSize; di.value = look.dither; ol.checked = look.outline !== false; yw.value = look.yaw; ky.value = look.key; fl.value = look.fill;
    function show() { $('dv-px-v').textContent = px.value; $('dv-dither-v').textContent = (+di.value).toFixed(2); $('dv-yaw-v').textContent = yw.value + '°'; $('dv-key-v').textContent = (+ky.value).toFixed(1); $('dv-fill-v').textContent = (+fl.value).toFixed(2) + ' (키/필 ' + (+fl.value > 0 ? (+ky.value / +fl.value).toFixed(1) : '∞') + ')'; }
    function apply() {
      look = { pixelSize: +px.value, dither: +di.value, outline: ol.checked, yaw: +yw.value, key: +ky.value, fill: +fl.value };
      saveLook(Object.assign(readLook(), look)); show();   /* 같은 키에 있는 계절 지정은 남긴다 */
      if (sceneMode === '3d') scene.setLook(look);
    }
    [px, di, ol, yw, ky, fl].forEach(function (el) { el.addEventListener('input', apply); el.addEventListener('change', apply); });
    show();
    msg.parentNode.insertBefore(h('div', { class: 'dv dv-season' }, [h('span', { text: '계절 (바깥)' }), seasonChips('dv-season')]), msg);   /* 2D 에서도 값은 기억한다 */
    msg.parentNode.insertBefore(h('p', { class: 'help', id: 'dv-season-line', text: seasonLine() }), msg);   /* 지금 계절 (실제 날짜 / 지정) */
    if (sceneMode !== '3d') { msg.textContent = '지금은 2D 장면이라 이 슬라이더는 적용 안 돼 (WebGL 없음 또는 ?scene=2d)'; return; }
    msg.textContent = '3D 룩 조정 (저장됨). 팔레트:';
    sw.parentNode.insertBefore(paletteChips('dv-pal'), sw);
    renderSwatch();
  }
  function renderSwatch() {
    var sw = $('dv-swatch'); if (!sw || sceneMode !== '3d' || !DEV) return;
    sw.innerHTML = '';
    scene.palette().forEach(function (r) {
      var row = h('div', { class: 'swrow', title: r.name });
      r.colors.forEach(function (c) { var d = h('span', { class: 'sw', title: c }); d.style.background = c; row.appendChild(d); });
      sw.appendChild(row);
    });
    var st = scene.stats(); $('dv-msg').textContent = '3D 룩 조정 (저장됨). 팔레트 ' + st.paletteName + ' ' + st.palette + '색 · 칸 간격 ' + st.step + ' · 디더 ' + st.dither + ':';
  }
  /* index.html 의 그림 자리 (img[data-asset]): manifest 키 → 주소 (단일 파일 번들 = data URI, file:// 은 기본 경로). 안 오면 지운다 — 이모지로 되돌리지 않는다 */
  var ASSET_FALLBACK = { 'oct.happy': 'assets/oct/happy.svg' };
  function fillAssetImgs() {
    [].forEach.call(document.querySelectorAll('img[data-asset]'), function (img) {
      if (img.getAttribute('src')) return;
      var k = img.getAttribute('data-asset'), src = assetPath(k) || ASSET_FALLBACK[k];
      if (!src) { img.remove(); return; }
      img.onerror = function () { img.remove(); };
      img.src = src;
    });
  }
  /* ───────────────────────── 살림: 조개 · 들어온 날 선물 · 텃밭 · 염료 (11-10 주인) ─────────────────────────
     · 조개는 내 놀이에서만 (다락방 달리기 한 판 → 2~8개). 문어 산책은 조개를 낳지 않는다.
     · 들어온 날 선물: 그날 처음 열면 조개 3 + 씨앗 1. **연속 출석이 아니라 들어온 날 수만 센다** — 며칠을 쉬어도 끊기는 것 · 잃는 것 없음. 다섯 번째 날마다 조개 10 을 더.
       ("게임 할 시간 없거나 잘 못하는 사람도 재화 일부는 챙기게")
     · 텃밭 세 칸: 씨앗 심기 → 물 두 번(칸마다 하루 한 번) → 꽃 → 거두면 그 색 염료 1. 물을 안 줘도 시들지 않는다 (멈춰 있을 뿐). 꽃 색은 시드 (심은 날 · 칸 · 몇 번째).
     · 염료는 사지 않는다. 옷 물들이기에 1 개 쓴다 (원래 색으로 돌리기는 공짜).
     저장: S.user = { shells, seeds, dyes: { 색: n }, days: [날짜…], giftDay, giftTell: { day, shells, n } (아직 못 알린 오늘 선물 줄 — 11-12), garden: [{ color, water, wateredDay } | null × 3], dye: hex | null, earned: [놀이 판 id…(최근 50)] } */
  var DYES = [['red', '빨강', '#c8323a'], ['yellow', '노랑', '#e8a93a'], ['green', '초록', '#4fa868'], ['blue', '파랑', '#4a86d8'], ['purple', '보라', '#9a5cc8'], ['pink', '분홍', '#f07aa8']];
  function dyeOf(id) { for (var i = 0; i < DYES.length; i++) if (DYES[i][0] === id) return DYES[i]; return null; }
  function userState() {
    var u = isObj(S.user) ? S.user : (S.user = {});
    u.shells = Math.max(0, u.shells | 0); u.seeds = Math.max(0, u.seeds | 0);
    if (!isObj(u.dyes)) u.dyes = {}; if (!Array.isArray(u.days)) u.days = []; if (!Array.isArray(u.earned)) u.earned = [];
    if (!Array.isArray(u.garden)) u.garden = [null, null, null]; while (u.garden.length < 3) u.garden.push(null);
    for (var gi = 0; gi < u.garden.length; gi++) if (u.garden[gi] != null && !(isObj(u.garden[gi]) && typeof u.garden[gi].color === 'string' && u.garden[gi].color)) u.garden[gi] = null;   /* 11-11: 객체가 아닌 칸만 빈 칸으로 (모르는 색은 그대로 둔다 — 나중 빌드가 알 수도 있다). 11-13: 색 글자가 없는 칸도 (심을 때 늘 색을 넣는다 — 거두면 염료 'undefined' 가 생겼다) */
    return u;
  }
  function earnFromPlay(r) {   /* 놀이 한 판 → 조개 (같은 판 id 는 한 번만) */
    if (!r || !r.id) return 0; var u = userState(); if (u.earned.indexOf(r.id) >= 0) return 0;
    var n = clamp(2 + Math.floor((r.score | 0) / 150), 2, 8);
    u.earned.push(r.id); if (u.earned.length > 50) u.earned.splice(0, u.earned.length - 50);
    u.shells += n; save(); renderBagChip(); toast('조개 ' + n + '개 · 이제 ' + u.shells + '개'); questMark('run');
    return n;
  }
  function dailyGift() {   /* 그날 처음 열었을 때 한 번. 11-12 (검증 F19): 선물은 바로, 알림 줄은 볼 수 있을 때 (weekTell — 입장 연출 밑에 깔리거나 다른 알림을 밀어내지 않게, 새로고침해도 이어서) */
    if (!S.octopus.name) return; var u = userState(), dk = todayKey(); if (u.giftDay === dk) return;
    u.giftDay = dk; if (u.days.indexOf(dk) < 0) u.days.push(dk);
    var n = u.days.length, extra = n % 5 === 0 ? 10 : 0;
    u.shells += 3 + extra; u.seeds += 1; u.giftTell = { day: dk, shells: 3 + extra, n: n };
    checkDay(true);   /* 11-13 (재검증 P4): 열어 둔 채 자정을 넘겼으면 '오늘의 산책' 도 같은 때 새 날로 (방금 끝난 산책 2분 기다림보다 선물이 먼저 왔다) */
    weekTell(); save(); renderBagChip();   /* 바로 띄울 수 있으면 알린 뒤의 기록 한 번만 쓴다 (보이는 다른 탭이 같은 줄을 또 띄우지 않게) */
  }
  /* ───────────────────────── 이번 주 할 일 (11-10 주인: "일주일 단위 퀘스트 · 하루 시간 제한은 촉박 · 문어한테 산책 갈지 묻기 · 하나하나 새로고침 3번") ─────────────────────────
     · 주마다(월요일부터) 일곱 가지가 시드로 정해진다. 그중 **다섯 가지**를 하면 주간 선물 (조개 12 + 씨앗 2). 일곱을 다 할 필요 없음.
     · 칸마다 '바꾸기' 3번 (마음에 안 들거나 지금 못 하는 일은 다른 일로 — 진행은 0 부터).
     · 못 해도 잃는 것 없음 · 이어 하기(연속) 없음 · 알림 · 재촉 없음. 주가 바뀌면 새 일곱 가지로 조용히 바뀐다.
     · '문어한테 산책 갈지 묻기' 는 묻는 것만 센다 — 나갈지 집에 있을지는 문어가 정한다. 낮잠 자는 문어를 깨운 누름은 세지 않는다 (주인 11-12, 검증 W5 (b) — 깨어 있는 틈의 문어는 깨어 있다: 센다).
     · 들어온 날만 세는 일 ('이번 주에 사흘 들어오기') 은 뺐다 (주인 11-12, 검증 W4 (b) — 출석 숙제. 들어온 날 기록 user.days · 오늘 선물의 '들어온 날 N일째' 는 그대로). 그 일이 든 옛 주는 모르는 칸처럼 그 칸만 다른 일로 (weekState) — 그 주에 이미 사흘 들어왔으면 한 일 하나로 남긴다 (kept, 검증 OW-1: 받을 선물이 사라지지 않게).
     저장: S.user.week = { key: 그 주 월요일, q: [{ id, n, rr }] × 7, claimed, kept?, keptIds? (11-13: 센 뺀 일 — kept 는 그 수) } */
  var QUESTS = [['ask', '문어한테 산책 갈지 묻기', 2], ['run', '다락방 달리기 한 판', 1], ['water', '텃밭에 물 주기', 2], ['plant', '씨앗 심기', 1], ['harvest', '꽃 거두기', 1], ['furn', '가구 하나 옮겨 놓기', 1],
    ['loft', '위층 옷방 올라가 보기', 1], ['kitchen', '놀이방 들르기', 1], ['look', '내 모습 열어 보기', 1], ['diary', '포스터 일기 펼쳐 보기', 1]];   /* 11-12 (검증 F11): '부엌 방' → 문에 적힌 이름 '놀이방'. 11-12: '선물 상자에서 하나 내밀기' 는 뺐다 — 선물을 내미는 게 조개 벌이가 되면 문어에게 부담 (주인 11-11 '문어가 부담 가질 수도 있으니까') */
  var WEEK_NEED = 5, WEEK_REROLL = 3, WEEK_GIFT = { shells: 12, seeds: 2 };
  function questOf(id) { for (var i = 0; i < QUESTS.length; i++) if (QUESTS[i][0] === id) return QUESTS[i]; return null; }
  function weekKeyOf(dk) { var p = String(dk).split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return dateKey(d); }   /* 그 주 월요일 */
  /* 11-12 (검증 W13 · C19): 지금 할 수 없는 일은 새로 나눠 주지 않는다 — 포스터가 없으면 '포스터 일기', 2D 장면이면 '위층 옷방' · '가구'. 이미 나눠 준 목록은 그대로 */
  function questCan(id) { return id === 'diary' ? S.trips.some(function (t) { return t.poster && t.status === 'done'; }) : id === 'loft' || id === 'furn' ? sceneMode !== '2d' : true; }
  /* taken = 뺄 일 (지금 목록 · 그 칸이 이번 주에 보여 준 일 · 다 한 일). 낼 일이 없으면 '' (그 칸의 바꾸기 단추를 숨긴다) */
  function weekPick(key, slot, rr, taken) {
    var pool = QUESTS.filter(function (q) { return taken.indexOf(q[0]) < 0 && questCan(q[0]); }), rng = mkRng(hash(['week', key, slot, rr, S.octopus.name || ''].join('|')));
    return pool.length ? pool[Math.floor(rng() * pool.length)][0] : '';
  }
  /* 11-11 (검증 W1 · C4): 주가 바뀔 때 다섯 가지를 하고도 안 받은 선물은 버리지 않고 넣어 준다 (새 주와 같은 저장 한 번 — 새로고침 · 두 번 부름 · 다른 탭에도 한 번만: 옛 주가 기록에서 사라지는 것이 곧 넣었다는 표시).
     같은 주면 통째로 새로 만들지 않는다: 받은 표시 · 멀쩡한 칸(진행 · 바꾼 횟수)은 그대로, 모르는 일 · 깨진 칸만 다른 일로 (나중에 일 하나를 빼거나 이름을 바꿔도 그 주가 날아가지 않게).
     저장: week.prev = { shells, seeds, told, from (11-13: 넣어 준 주) } — 지난주 선물을 넣었다는 표시 (그 주 동안 살림에 한 줄 · 알림은 한 번) */
  function weekOk(x) { return isObj(x) && !!questOf(x.id); }
  /* 11-12 (검증 OW-1): 뺀 '사흘 들어오기' 를 그 주에 이미 했으면 (그 주에 들어온 날 셋) 그 하나는 잃지 않는다 — 칸은 다른 일로 바뀌어도 한 일 하나로 센다 (w.kept · 그 줄은 없다).
     11-13 (재검증 C1 · S1 · V1): 뺀 '선물 상자에서 하나 내밀기' (예전 목표 1) 도 같다 — production 기록의 다 한 칸이 점수를 잃었다 */
  var GONE = {
    days: function (w) {   /* 오늘도 들어온 날 (부팅 때 고치면 오늘 선물이 아직 user.days 에 오늘을 안 적었다 — 예전 칸은 그 뒤에 셋을 채웠다) */
      var end = new Date(String(w.key).replace(/-/g, '/')), ds = userState().days, dk = todayKey(); end.setDate(end.getDate() + 6); var ek = dateKey(end);
      return (ds.indexOf(dk) < 0 ? ds.concat(dk) : ds).filter(function (d) { return d >= w.key && d <= ek; }).length >= 3;
    },
    gift: function (w, x) { return (x.n | 0) >= 1; }
  };
  function oldDone(w, x) { return isObj(x) && !weekOk(x) && Object.prototype.hasOwnProperty.call(GONE, x.id) && GONE[x.id](w, x); }
  /* 11-13 (재검증 S2): 뺀 일은 한 주에 한 번만 센다 — 센 일의 이름을 남긴다 (w.keptIds). 옛 탭이 같은 칸을 다시 나눠 줘도 또 세지 않는다.
     keptIds 가 없는 숫자 kept 는 시험 빌드의 기록 — 그 빌드는 '사흘 들어오기' 만 셌다 → ['days'] (S2 로 2 가 됐어도 하나). kept 숫자는 늘 이름 수 (그 빌드 · 옛 검사가 읽는다) */
  function keptOf(w) {
    if (Array.isArray(w.keptIds)) return w.keptIds.filter(function (id, i, a) { return Object.prototype.hasOwnProperty.call(GONE, id) && a.indexOf(id) === i; });
    return (w.kept | 0) > 0 ? ['days'] : [];
  }
  function keptWith(w) { var k = keptOf(w); w.q.forEach(function (x) { if (oldDone(w, x) && k.indexOf(x.id) < 0) k.push(x.id); }); return k; }   /* + 지금 칸에 든 뺀 일로 다 한 것 */
  function weekState() {
    var u = userState(), key = weekKeyOf(todayKey()), w = u.week, taken, i, id, k;
    if (isObj(w) && w.key === key && Array.isArray(w.q)) {
      if (w.q.length !== 7 || !w.q.every(weekOk)) {
        w.q = w.q.slice(0, 7); taken = w.q.filter(weekOk).map(function (x) { return x.id; }); k = keptWith(w); if (k.length) { w.keptIds = k; w.kept = k.length; }
        for (i = 0; i < 7; i++) if (!weekOk(w.q[i])) { id = weekPick(key, i, 0, taken) || QUESTS.filter(function (q) { return taken.indexOf(q[0]) < 0; })[0][0]; taken.push(id); w.q[i] = { id: id, n: 0, rr: 0 }; }
        save();   /* 11-12: 바꾼 칸도 바로 저장 (새 주처럼 — 다음에 열 때 장면이나 포스터가 달라져도 같은 칸) */
      }
      return w;
    }
    var due = isObj(w) && Array.isArray(w.q) && !w.claimed && /^\d{4}-\d{2}-\d{2}$/.test(w.key) && w.q.filter(function (x) { return weekOk(x) && questDone(x); }).length + keptWith(w).length >= WEEK_NEED;   /* 11-12 (OW-1): 바꾸기 전에 주가 지나간 옛 주의 뺀 일도 (11-13: 한 번씩만) */
    var from = due ? w.key : '';
    taken = []; w = u.week = { key: key, q: [], claimed: false };
    for (i = 0; i < 7; i++) { id = i === 0 ? 'ask' : weekPick(key, i, 0, taken) || QUESTS.filter(function (q) { return taken.indexOf(q[0]) < 0; })[0][0]; taken.push(id); w.q.push({ id: id, n: 0, rr: 0 }); }   /* 첫 칸은 늘 '문어한테 산책 갈지 묻기' (바꿀 수는 있다). 11-12: 지킴 — 지금은 닿지 않는다 (2D · 포스터 없음 = 딱 일곱, 검사 없음). 일을 더 빼서 할 수 있는 일이 일곱이 안 되면 빈 칸 대신 남은 일로 */
    if (due) { u.shells += WEEK_GIFT.shells; u.seeds += WEEK_GIFT.seeds; w.prev = { shells: WEEK_GIFT.shells, seeds: WEEK_GIFT.seeds, from: from }; setTimeout(weekTell, 600); }   /* 알림은 조금 뒤에 (살림을 여는 톡이 넘긴 주면 시트가 뜬 다음). 11-13 (C5): from = 넣어 준 그 주 */
    save();   /* 11-12: 나눠 준 목록은 바로 저장 — 다음에 열 때 장면(2D)이나 포스터가 달라져도 같은 목록 */
    return w;
  }
  /* 선물 알림: 볼 수 있을 때 한 번 — 입장 연출 · 가려진 탭 · 떠 있는 다른 알림 · 부팅 2.5 s 뒤의 오늘 선물(giftWait)이 지나간 뒤. 오늘 선물 줄(user.giftTell) 먼저, 그다음 지난주 선물 줄(week.prev).
     띄우면 기록에서 지운다 · told 를 저장한다 (새로고침 · 다른 탭에도 한 번). 지난 날의 오늘 선물 줄은 버린다 (선물은 이미 들어가 있다) */
  var weekTellT = 0, giftWait = false;
  function weekTell() {
    clearTimeout(weekTellT);
    var u = isObj(S.user) ? S.user : {}, w = u.week, p = isObj(w) && isObj(w.prev) && !w.prev.told ? w.prev : null, g = isObj(u.giftTell) ? u.giftTell : null, t = $('toast');
    if (g && g.day !== todayKey()) { delete u.giftTell; g = null; }
    if ((!p && !g) || !S.octopus.name) return;
    if (giftWait || document.hidden || (window.INTRO && ['sky', 'title', 'out'].indexOf(INTRO.phase) >= 0) || (t && t.classList.contains('show'))) { weekTellT = setTimeout(weekTell, 1000); return; }
    if (g) { delete u.giftTell; save(); toast('오늘 선물: 조개 ' + (g.shells | 0) + ' · 씨앗 1 (들어온 날 ' + (g.n | 0) + '일째)'); if (p) weekTellT = setTimeout(weekTell, 1000); return; }
    p.told = 1; save(); toast(prevWord(w) + ' 살림에 넣어 뒀어. 조개 ' + (p.shells | 0) + ' · 씨앗 ' + (p.seeds | 0));
  }
  function prevWord(w) { var f = w.prev.from; return typeof f === 'string' && f && f !== keyAdd(w.key, -7) ? '전에 안 받은 주간 선물은' : '지난주 선물은'; }   /* 11-13 (C5): 몇 주 만에 왔으면 '지난주' 가 아니다 (from 없는 기록 = 시험 빌드: 예전 말 그대로) */
  function questN(x) { return x.n | 0; }
  function questDone(x) { return questN(x) >= questOf(x.id)[2]; }
  function weekDoneN(w) { return w.q.filter(function (x) { return questDone(x); }).length + keptOf(w).length; }   /* + 뺀 일로 이미 한 것 (OW-1) */
  function questMark(id) {   /* 한 일 하나를 적는다 (이번 주 일곱 가지에 있을 때만). 조용히 — 토스트 · 알림 없음, 살림 꼬리표에 작은 점만 */
    if (!S.octopus.name) return;
    var w = weekState(), hit = false;
    w.q.forEach(function (x) { if (x.id === id && !questDone(x)) { x.n = (x.n | 0) + 1; hit = true; } });
    if (hit) { save(); renderBagChip(); if ($('bag-sheet') && $('bag-sheet').open) renderBag(); }
  }
  /* 바꾸기로 나올 일 | '' — 목록에 있는 일 · 그 칸이 이번 주에 보여 준 일(x.seen — 옛 기록엔 없다)은 빼고 (11-12 검증 C11 · F8) */
  function weekSwapTo(w, i) {
    var x = w.q[i], no = w.q.map(function (y) { return y.id; }).concat(Array.isArray(x.seen) ? x.seen : []);
    return weekPick(w.key, i, (x.rr | 0) + 1, no);
  }
  function weekReroll(i) {
    var w = weekState(), x = w.q[i]; if (!x || w.claimed || questDone(x) || (x.rr | 0) >= WEEK_REROLL) return;
    var id = weekSwapTo(w, i); if (!id) return;
    w.q[i] = { id: id, n: 0, rr: (x.rr | 0) + 1, seen: (Array.isArray(x.seen) ? x.seen : []).concat(x.id) }; save(); renderBag();
    focusIn('#bag-body .week-list', i);
  }
  function weekClaim() {
    var w = weekState(), u = userState(); if (w.claimed || weekDoneN(w) < WEEK_NEED) return;
    w.claimed = true; u.shells += WEEK_GIFT.shells; u.seeds += WEEK_GIFT.seeds; save(); renderBag(); renderBagChip();
    var g = $('week-got'); if (g) g.focus();   /* 11-12 (검증 F6): 누른 단추가 사라진 자리 = '받았어' 줄로 */
    toast('주간 선물: 조개 ' + WEEK_GIFT.shells + ' · 씨앗 ' + WEEK_GIFT.seeds);
  }
  /* 시트를 다시 그린 뒤 키보드 자리 (11-12 검증 F6): 목록 i 번째 줄의 단추, 단추가 없어졌으면 그 줄의 글 (tabindex -1) — body 로 떨어지지 않게 */
  function focusIn(sel, i) { var li = document.querySelectorAll(sel + ' > li')[i], el = li && (li.querySelector('button') || li.querySelector('.week-txt')); if (el) el.focus(); }
  function renderWeek(frag) {
    var w = weekState(), done = weekDoneN(w);
    frag.appendChild(h('h3', { text: '이번 주 할 일' }));
    frag.appendChild(h('p', { class: 'set-note', text: '일곱 가지 중 다섯 가지를 하면 선물이 있어 (' + Math.min(done, WEEK_NEED) + '/' + WEEK_NEED + '). 주가 바뀌면 새로 바뀌고, 못 해도 잃는 건 없어.' }));
    /* 11-12 (검증 F5 · F20): 받기 단추는 쪽지 바로 아래 (목록 뒤면 360x740 에서 화면 밖이었다) — 받은 뒤엔 '받았어' 줄이 그 자리. 수량은 한 덩어리로 (320 px 에서 '(조개 / 12' 로 끊기지 않게) */
    if (w.claimed) frag.appendChild(h('p', { class: 'set-note', id: 'week-got', tabindex: '-1', text: '이번 주 선물은 받았어.' }));
    else if (done >= WEEK_NEED) { var c = h('button', { type: 'button', class: 'btn wide pressable', id: 'week-claim' }, ['주간 선물 받기 ', h('span', { class: 'nobr', text: '(조개 ' + WEEK_GIFT.shells + ' · 씨앗 ' + WEEK_GIFT.seeds + ')' })]); c.addEventListener('click', weekClaim); frag.appendChild(c); }
    if (keptOf(w).length) frag.appendChild(h('p', { class: 'set-note', id: 'week-kept', text: '목록에서 빠진 일도 이번 주엔 한 걸로 셌어.' }));   /* 11-12 (OW-1): 다 한 줄이 넷인데 (5/5) 인 까닭. 11-13: 뺀 일이 둘 (사흘 · 선물 상자) — 어느 쪽이든 맞는 말 */
    if (isObj(w.prev)) frag.appendChild(h('p', { class: 'set-note', id: 'week-prev', text: prevWord(w) + ' 살림에 넣어 뒀어 (조개 ' + (w.prev.shells | 0) + ' · 씨앗 ' + (w.prev.seeds | 0) + ').' }));   /* 11-11 (검증 W1): 주가 바뀔 때 넣어 준 선물 — 그 주 동안 */
    var list = h('ul', { class: 'week-list' });
    w.q.forEach(function (x, i) {
      var q = questOf(x.id), n = Math.min(questN(x), q[2]), ok = n >= q[2], left = WEEK_REROLL - (x.rr | 0);
      var li = h('li', { class: 'week-row' + (ok ? ' done' : '') }, [h('span', { class: 'week-txt', tabindex: '-1', text: q[1] }), h('span', { class: 'week-n', text: ok ? '했어' : n + '/' + q[2] })]);
      if (!ok && !w.claimed && left > 0 && weekSwapTo(w, i)) { var b = h('button', { type: 'button', class: 'fchip week-rr', text: '바꾸기 ' + left, 'aria-label': q[1] + ' 다른 일로 바꾸기 (' + left + '번 남음)' }); b.addEventListener('click', function () { weekReroll(i); }); li.appendChild(b); }
      list.appendChild(li);
    });
    frag.appendChild(list);
  }
  function renderBagChip() {   /* 주 먼저 (11-11): 주가 바뀌며 넣은 지난주 선물이 조개 수에 바로 보이게. 11-12 (검증 W8 · F5): 받을 선물이 있으면 이름에도 (점은 눈에만 보인다) */
    var b = $('btn-bag'); if (!b) return; var u = userState(), w = S.octopus.name ? weekState() : null, gift = !!w && !w.claimed && weekDoneN(w) >= WEEK_NEED; b.hidden = !S.octopus.name; var t = $('bag-n'); if (t) t.textContent = '조개 ' + u.shells;
    if (w) b.classList.toggle('has-gift', gift); b.setAttribute('aria-label', '살림, 조개 ' + u.shells + (gift ? ', 주간 선물이 있어' : ''));
    plotLabels();   /* 11-13: 바깥 밭 단추 이름도 — 씨앗 · 밭 · 날이 바뀌는 길(오늘 선물 · 주간 선물 · 다른 탭 · 불러오기 · 초기화)이 다 여기를 지난다 (포커스 없이 훑는 화면 낭독기) */
  }
  /* 11-11: 텃밭 칸 하나를 읽는다 — 모르는 색(손댄 기록 · 나중 빌드의 새 색)이어도 던지지 않는다: 이름 없이 '꽃', 그림은 FL_UNKNOWN (11-13) */
  var FL_UNKNOWN = '#787279';   /* 11-13: 모르는 꽃 색 — 장면 PAL.slate[3] 과 같은 회색 · 염료 어느 색도 아니다 (예전엔 바깥은 노랑, 시트는 분홍과 똑같이 칠해 아는 꽃처럼 보였다) */
  function plotView(g, dk) { if (!g) return null; var d = dyeOf(g.color), w = Math.max(0, Math.min(2, g.water | 0)); return { w: w, name: d ? d[1] : '', hex: d ? d[2] : FL_UNKNOWN, today: g.wateredDay === dk, st: w >= 2 ? (d ? d[1] + ' 꽃' : '꽃') : w === 1 ? '새싹' : '씨앗' }; }
  var PLOT_NTH = ['첫째', '둘째', '셋째'];
  function plotLabel(i, u, dk) {   /* 칸 · 든 것 · 누르면 할 일 (11-11 — 바깥 단추 · 살림 시트 단추가 같은 말) */
    var v = plotView(u.garden[i], dk);
    return '텃밭 ' + PLOT_NTH[i] + ' 칸, ' + (!v ? '빈 칸, ' + (u.seeds > 0 ? '씨앗 심기' : '씨앗이 없어') : v.st + ', ' + (v.w >= 2 ? '거두기' : v.today ? '오늘은 물을 줬어' : '물 주기'));
  }
  function plotLabels() { var u = userState(), dk = todayKey(); [0, 1, 2].forEach(function (i) { var b = $('btn-plot' + i); if (b) b.setAttribute('aria-label', plotLabel(i, u, dk)); }); }
  function applyGarden() {
    plotLabels();
    if (scene && typeof scene.setGarden === 'function') { try { var dk = todayKey(); scene.setGarden(userState().garden.slice(0, 3).map(function (g) { var v = plotView(g, dk); return v ? { color: v.hex, water: v.w } : null; })); } catch (e) { console.warn('[app] setGarden', e); } }
  }
  function gardenAct(i) {
    var u = userState(), g = u.garden[i], dk = todayKey(), v = plotView(g, dk);
    if (!g) { if (u.seeds < 1) { toast('씨앗이 없어. 들어온 날 선물이나 주간 선물로 생겨'); return; } u.seeds--; var rng = mkRng(B ? B.hashSeed('seed', dk, i, u.days.length, u.seeds) : Date.now()); u.garden[i] = { color: DYES[Math.floor(rng() * DYES.length)][0], water: 0, wateredDay: '' }; toast('씨앗을 심었어'); questMark('plant'); }
    else if (v.w >= 2) { u.dyes[g.color] = (u.dyes[g.color] | 0) + 1; u.garden[i] = null; toast(v.name ? v.name + ' 염료 1개를 얻었어' : '꽃을 거뒀어'); questMark('harvest'); }
    else if (g.wateredDay === dk) { toast('오늘은 물을 줬어. 내일 또 줄 수 있어'); return; }
    else { g.water = v.w + 1; g.wateredDay = dk; toast(g.water >= 2 ? '꽃이 피었어' : '물을 줬어'); questMark('water'); }
    save(); renderBag(); applyGarden();
  }
  function applyDye() { if (scene && typeof scene.setPlayerDye === 'function') { try { scene.setPlayerDye(userState().dye || null); } catch (e) { console.warn('[app] setPlayerDye', e); } } }
  function dyeUse(id) {
    var u = userState();
    if (id === null) { u.dye = null; save(); applyDye(); renderBag(); toast('원래 색으로 돌렸어'); return; }
    var d = dyeOf(id); if (!d || (u.dyes[id] | 0) < 1) return;
    u.dyes[id]--; u.dye = d[2]; save(); applyDye(); renderBag(); toast('옷을 ' + d[1] + '으로 물들였어');
  }
  /* 위층 옷방 재봉틀 (11-10 주인: "여기서 사용자가 재화 써서 옷 색도 바꿀 수 있게"): 기른 염료가 있으면 그걸 1 개 쓰고, 없으면 조개 DYE_COST 개로 그 색 옷감을 산다. 원래 색으로 돌리기는 공짜 */
  /* 세트 도감 (11-10 주인 "세트 도감은 완전 찬성"): 옷 · 신발 · 장식 셋을 맞춰 입으면 그 세트가 도감에 적힌다 (뽑기 없음 · 값 없음 — 가진 옷으로 스스로 찾아내는 수집).
     아직 못 찾은 세트는 옷 이름만 보이고 나머지는 '?' (힌트). 찾은 세트는 '다시 입기'. 다 모아도 보상은 없다 (재촉하지 않는다) — 도감이 채워지는 것뿐.
     저장: S.user.sets = { 세트 id: 처음 맞춰 입은 날 } (코드는 '입었다' 는 사실만 적는다) */
  var LOOK_SETS = [['newyear', '설날 나들이', 'hanbok', 'flat', 'ribbon'], ['school', '등굣길', 'uniform', 'loafer', 'glasses'], ['ballgame', '경기 보는 날', 'varsity', 'sneaker', 'beret'],
    ['cabin', '오두막 주말', 'flannel', 'boot', 'strawhat'], ['rainy', '비 오는 날', 'raincoat', 'boot', 'none'], ['attic', '다락방 차림', 'dress', 'flat', 'ribbon'],
    ['garden', '텃밭지기', 'overall', 'boot', 'strawhat'], ['library', '도서관 가는 날', 'knit', 'loafer', 'glasses'], ['sunday', '늦잠 일요일', 'hoodie', 'sneaker', 'catears']];
  function setsFound() { var u = userState(); if (!isObj(u.sets)) u.sets = {}; return u.sets; }
  function setsCheck() {   /* 지금 차림이 어느 세트와 맞으면 적는다 → 새로 찾은 세트 이름 | '' */
    var c = S.settings.player, f = setsFound(), got = ''; if (!isObj(c) || !S.octopus.name) return '';
    LOOK_SETS.forEach(function (q) { if (!f[q[0]] && c.outfit === q[2] && c.shoes === q[3] && c.acc === q[4]) { f[q[0]] = todayKey(); got = q[1]; } });
    if (got) save();
    return got;
  }
  function partName(cat, id) { var P = playerParts(), n = ''; (P[cat] || []).forEach(function (x) { if (x.id === id) n = x.name; }); return n || id; }
  function setWord(q) { return /차림$/.test(q[1]) ? q[1] : q[1] + ' 차림'; }   /* 11-12 (검증 F12): '다락방 차림 차림' 이 되지 않게 */
  function setWear(q) { setPlayerPart('outfit', q[2]); setPlayerPart('shoes', q[3]); setPlayerPart('acc', q[4]); renderSew(); focusIn('#sew-body .week-list', LOOK_SETS.indexOf(q)); toast(setWord(q) + '으로 입었어'); }
  function renderSets(frag) {
    var f = setsFound(), n = LOOK_SETS.filter(function (q) { return f[q[0]]; }).length;   /* 11-12 (검증 C14): 여기서는 적지 않는다 — 옷 · 신발 · 장식을 바꿨을 때만 (lookPick) */
    frag.appendChild(h('h3', { text: '세트 도감 ' + n + '/' + LOOK_SETS.length }));
    frag.appendChild(h('p', { class: 'set-note', text: '옷 · 신발 · 장식을 맞춰 입으면 여기에 적혀. 내 모습에서 이것저것 입어 보며 찾아봐.' }));
    var list = h('ul', { class: 'week-list' });
    LOOK_SETS.forEach(function (q) {
      var ok = !!f[q[0]], li = h('li', { class: 'week-row' + (ok ? '' : ' done') }, [h('span', { class: 'week-txt' }, [h('b', { text: ok ? q[1] : '아직 못 찾은 차림' }), h('br'), h('span', { class: 'week-n', text: partName('outfit', q[2]) + ' · ' + (ok ? partName('shoes', q[3]) + ' · ' + (q[4] === 'none' ? '장식 없음' : partName('acc', q[4])) : '? · ?') })])]);
      if (ok) { var b = h('button', { type: 'button', class: 'fchip week-rr', text: '다시 입기', 'aria-label': setWord(q) + ' 다시 입기' }); b.addEventListener('click', function () { setWear(q); }); li.appendChild(b); }
      list.appendChild(li);
    });
    frag.appendChild(list);
  }
  var DYE_COST = 6;
  function sewDye(id) {
    var u = userState();
    if (id === null) { u.dye = null; save(); applyDye(); renderSew(); toast('원래 색으로 돌렸어'); return; }
    var d = dyeOf(id); if (!d) return;
    if ((u.dyes[id] | 0) > 0) u.dyes[id]--;
    else if (u.shells >= DYE_COST) u.shells -= DYE_COST;
    else { toast('조개가 ' + (DYE_COST - u.shells) + '개 모자라. 다락방 달리기나 들어온 날 선물로 생겨'); return; }
    u.dye = d[2]; save(); applyDye(); renderSew(); renderBagChip(); toast('옷을 ' + d[1] + '으로 물들였어');
  }
  function renderSew() {
    var body = $('sew-body'); if (!body) return; var u = userState(), frag = document.createDocumentFragment();
    frag.appendChild(h('p', { class: 'bag-line', text: '조개 ' + u.shells }));
    frag.appendChild(h('p', { class: 'set-note', text: '기른 염료가 있으면 그걸 하나 쓰고, 없으면 조개 ' + DYE_COST + '개로 물들여. 지금 입은 옷의 큰 색이 바뀌어.' }));
    var row = h('div', { class: 'sew-grid', role: 'group', 'aria-label': '옷 색' });
    DYES.forEach(function (d) {
      var own = u.dyes[d[0]] | 0, cur = u.dye === d[2];
      var b = h('button', { type: 'button', class: 'sew-chip pressable' + (cur ? ' on' : ''), 'aria-pressed': cur ? 'true' : 'false' }, [h('span', { class: 'sew-sw', 'aria-hidden': 'true' }), h('span', { class: 'sew-name', text: d[1] }), h('span', { class: 'sew-cost', text: cur ? '입는 중' : own ? '염료 ' + own : '조개 ' + DYE_COST })]);
      b.querySelector('.sew-sw').style.background = d[2];
      if (!cur) b.addEventListener('click', function () { sewDye(d[0]); });
      row.appendChild(b);
    });
    frag.appendChild(row);
    if (u.dye) { var off = h('button', { type: 'button', class: 'btn wide pressable', text: '원래 색으로 (공짜)' }); off.addEventListener('click', function () { sewDye(null); }); frag.appendChild(off); }
    renderSets(frag);
    body.textContent = ''; body.appendChild(frag);
  }
  /* 11-11 (검증 P4): 위층에서 미용실 시트가 열려 있는 동안 시트가 덮은 높이를 장면에 알려 준다 → 장면이 거울 · 문어를 시트 위로 올린다 (scene.setSheetInset). 시트 크기가 바뀌거나(이름 줄이 두 줄) 닫히면 다시 */
  function salonLiftInit() {
    var d = $('salon-sheet'); if (!d) return;
    function sync() {
      if (!scene || typeof scene.setSheetInset !== 'function') return;
      var sc = $('scene'), inset = d.open && sc && roomNow() === 'loft' ? Math.max(0, sc.getBoundingClientRect().bottom - (window.innerHeight - d.offsetHeight)) : 0;
      try { scene.setSheetInset(inset); } catch (e) { console.warn('[app] setSheetInset', e); }
    }
    if (window.ResizeObserver) new ResizeObserver(sync).observe(d);
    if (window.MutationObserver) new MutationObserver(sync).observe(d, { attributes: true, attributeFilter: ['open'] });
    d.addEventListener('close', sync); window.addEventListener('resize', sync);
  }
  function openSew() { var sh = $('sew-sheet'); if (!sh) return; renderSew(); showDialog(sh); }
  function renderBag() {
    var body = $('bag-body'); if (!body) return; var u = userState(), frag = document.createDocumentFragment(), dk = todayKey();
    weekState();   /* 11-11 (검증 W1): 주 먼저 — 이 톡이 주를 넘기며 지난주 선물을 넣으면 바로 아랫줄 조개 · 씨앗 수에 들어가 있게 */
    frag.appendChild(h('p', { class: 'bag-line', text: '조개 ' + u.shells + ' · 씨앗 ' + u.seeds + ' · 들어온 날 ' + u.days.length + '일' }));
    frag.appendChild(h('p', { class: 'set-note', text: '조개와 씨앗은 다락방 달리기, 들어온 날 선물, 주간 선물에서 생겨. 쉬어도 잃는 건 없어.' }));
    renderWeek(frag);
    frag.appendChild(h('h3', { text: '텃밭' }));
    frag.appendChild(h('p', { class: 'set-note', text: '밭은 집 앞마당에 있어.' + (sceneMode === '3d' ? ' 문어가 산책 나가 바깥이 보일 때는 밭을 바로 톡 해도 돼.' : '') }));   /* 11-11: 2D 엔 바깥 밭 단추가 없다 */
    var plots = h('div', { class: 'bag-plots', role: 'group', 'aria-label': '텃밭' });
    u.garden.slice(0, 3).forEach(function (g, i) {
      var v = plotView(g, dk), st = !v ? '빈 칸' : v.st, act = !v ? '심기' : v.w >= 2 ? '거두기' : v.today ? '내일' : '물 주기';
      var b = h('button', { type: 'button', class: 'bag-plot pressable', 'aria-label': plotLabel(i, u, dk) }, [h('span', { class: 'bag-pot' + (v ? ' st' + v.w : ''), 'aria-hidden': 'true' }), h('span', { class: 'bag-st', text: st }), h('span', { class: 'bag-act', text: act })]);
      if (v && v.w >= 2 && v.hex) b.querySelector('.bag-pot').style.setProperty('--fl', v.hex);
      b.addEventListener('click', function () { gardenAct(i); });
      plots.appendChild(b);
    });
    frag.appendChild(plots);
    frag.appendChild(h('h3', { text: '염료' }));
    var have = DYES.filter(function (d) { return (u.dyes[d[0]] | 0) > 0; });
    frag.appendChild(h('p', { class: 'set-note', text: (have.length ? have.map(function (d) { return d[1] + ' ' + (u.dyes[d[0]] | 0); }).join(' · ') + '. ' : '아직 없어. 꽃을 길러 거두면 생겨. ') + '옷 물들이기는 위층 옷방 재봉틀에서 해.' }));
    body.textContent = ''; body.appendChild(frag); renderBagChip();
  }
  function bagInit() {
    userState(); renderBagChip(); applyDye(); applyGarden();
    var b = $('btn-bag'), sh = $('bag-sheet'); if (!b || !sh) return;
    b.addEventListener('click', function () {
      renderBag(); showDialog(sh);
      /* 11-13 (재검증 V3 · P6): 받을 선물이 있으면 받기 단추가 다 보이게 시트만 조금 굴린다 (320x568 픽셀 글꼴에서 반쯤 밖이었다 — 다 보이면 그대로). 여는 움직임 중이라 시트와 단추의 차이로 잰다 */
      var c = $('week-claim'); if (!c) return; var over = c.getBoundingClientRect().bottom + 8 - (sh.getBoundingClientRect().top + sh.clientTop + sh.clientHeight); if (over > 0) sh.scrollTop += over;
    });
    $('bag-close').addEventListener('click', function () { sh.close(); });
    sh.addEventListener('click', function (e) { if (clickedOutside(e.currentTarget, e)) e.currentTarget.close(); });
    var sw = $('sew-sheet'); if (sw) { $('sew-close').addEventListener('click', function () { sw.close(); }); sw.addEventListener('click', function (e) { if (clickedOutside(e.currentTarget, e)) e.currentTarget.close(); }); }
    salonLiftInit();
    giftWait = true; setTimeout(function () { giftWait = false; dailyGift(); }, 2500);
    weekTell();   /* 11-11 (검증 W1): 지난주 선물 알림을 못 띄운 채 새로고침했으면 이어서 (오늘 선물 알림 뒤에) */
    setInterval(function () { if (!document.hidden) dailyGift(); }, 60000);   /* 11-12 (검증): 열어 둔 채 자정을 넘기면 그날 선물 · 들어온 날이 안 올라갔다 — 1분마다 (그날 한 번만 준다) */
    document.addEventListener('visibilitychange', function () { if (!document.hidden) setTimeout(dailyGift, 400); });
  }
  function boot() {
    var q = new URLSearchParams(location.search), slow = parseFloat(q.get('slow'));
    fillAssetImgs();
    if (slow > 0) document.documentElement.style.setProperty('--speed', String(slow));
    load(); var hk = lookHook(); if (hk && hk.lantern != null) S.room.lantern = clamp(hk.lantern | 0, 0, 8);
    if (S.octopus.state === 'sleep' && napOver()) S.octopus.state = 'idle';   /* 낮잠이 끝났으면(20분 · 날짜가 바뀜) 깬 채로 연다 → 인사 '기다리고 있었어', 창가에서 */
    applyMotion(); applyFont(); initScene(); applyMotion();
    if (typeof scene.setPlace === 'function') scene.setPlace('attic', { instant: true });   /* 늘 다락에서 연다 (running 여행이 남아 있어도 — resumeRunning) */
    renderStatus(false); renderScene(); renderSouvenirs(); renderWall(); renderAlbum(); renderShelf();
    bind(); bagInit();   /* 살림: 조개 · 선물 · 텃밭 · 염료 */
    if (window.AUDIO) AUDIO.init({ hour: hourNow, weather: function () { return weatherFor(S.room.lantern); }, lantern: function () { return S.room.lantern; }, season: function () { return (scene && typeof scene.season === 'function') ? scene.season() : null; } });   /* 소리 (js/audio.js) — 꺼진 채로 시작 */
    if (!storeOK) quietWarn('이 브라우저에선 벽이 오늘만 남아');
    setDayGreeting();
    renderLog();
    octInitial();
    scheduleThink();
    /* 초상은 장면이 두 프레임 그린 뒤부터 (3D 는 2번째 프레임에 idle 을 미리 찍어 셰이더를 데운다) */
    requestAnimationFrame(function () { requestAnimationFrame(function () { PORT.ready = true; flushPortraits(); }); });
    /* 입장 레이어 (js/intro.js): 하늘에서 내려오는 카메라 + 장면 위 타이틀. 타이틀을 누르면 걷히고 바로 게임 — 첫 실행의 이름 짓기는 그다음 */
    var afterIntro = function () { if (!S.octopus.name && !$('name-dialog').open) openNameDialog(); };
    if (window.INTRO && INTRO.start(scene, { mode: sceneMode, reduced: reduced(), host: $('scene') })) INTRO.onDone(afterIntro); else afterIntro();
    loadManifest().then(function (ok) { if (ok) { scene.refresh(); renderSouvenirs(); } });
    warmStickers().then(function (got) { if (got && sceneMode === '3d' && S.room.posterOrder.length) { scene.setPosters([]); renderWall(); } });   /* 벽 텍스처를 스티커 그림과 함께 다시 굽는다 (한 번) */
    resumeRunning().then(function (kind) { if (kind) finalPose({ kind: kind }); });   /* 빈 차례뿐이면 재우지 않는다 (commitTrip 과 같은 규칙) · 아니면 마지막 쉬는 차례로 (깨어 있는 틈부터) */
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  /* ───────────────────────── 공개 (§12.3) ───────────────────────── */
  return {
    get state() { return S; },
    save: save, load: load, invite: invite, skip: skip, reveal: reveal,
    renderAll: renderAll, renderStatus: renderStatus, renderScene: renderScene, renderLog: renderLog, renderWall: renderWall, renderAlbum: renderAlbum, renderSouvenirs: renderSouvenirs,
    posterSVG: posterSVG, receiptHTML: receiptHTML, inspectHTML: inspectHTML, openPoster: openPoster, openSettings: openSettings, openLook: openLook, openAlbum: openAlbum, openLog: openLog, dlgDemo: dlgDemo, goRoom: goRoom,
    importEvents: importEvents, exportJSON: exportJSON, importJSON: importJSON,
    oct: oct, walkTo: walkTo, octState: octState, anchors: ANCHORS, placeholders: PH, commitTrip: commitTrip,
    get scene() { return scene; }, get sceneMode() { return sceneMode; }, earnFromPlay: earnFromPlay, dailyGift: dailyGift, setOctColor: setOctColor, setPlayerPart: setPlayerPart, playerParts: playerParts, setPalette: setPalette, weatherFor: weatherFor, itemsFor: itemsFor,
    portraitFor: portraitFor, say: say, get portraitCache() { return Object.keys(PORT.cache); },
    setSeason: setSeasonPref, get ceremony() { return cer.kind; },
    get room() { return roomNow(); }, openMachine: openMachine,   /* 8물결: 놀이방에 있는가 · 오락기 (테스트·도구) */
    get stick() { return { allowed: stk.allowed, input: stk.vec ? { x: stk.vec.x, y: stk.vec.y } : null, pointer: stk.pid != null, keys: Object.keys(stk.keys), sent: stk.sent }; },   /* 11-08 움직이기 (테스트·도구): 발자국 손잡이 상태 — 보이는가 · 지금 장면에 보낸 벡터 · 손가락 · 눌린 키 */
    /* 11-08 톡 한 줄 · 깨어 있는 틈 (테스트·도구 — 화면엔 안 나온다): 지금 톡 하면 나올 줄 · 장면의 톡 처리 그대로 · 쉬는 단계 ('up' | 'awake' | 'nap') */
    tapLine: function () { var L = tapLineNow(); return L ? { text: L.text, full: L.full, by: L.by, part: L.part, src: L.src, trip: L.trip.id } : null; },
    get goResting() { return goRapid(Date.now()) || afterSheet(); },   /* 지금 큰 버튼을 누르면 '연달아 누름' 으로 받지 않는가 (테스트 · 도구가 다음 초대 전에 기다린다) */
    tapOct: tapOct, restPhase: restPhase, get rest() { return rest ? { id: rest.id, left: Math.max(0, Math.round(rest.left)), away: rest.away } : null; },
    /* 몸 색 · 미용실 (docs/SALON.md — 테스트 · 도구, 화면엔 안 나온다): 장면 몸색을 기록에 맞춤 · 미용실 연출 중 표시 (켜면 돌아다니기 · 톡 한 줄 · 쓰다듬기 · 낮잠 들기를 멈추고 몸색 맞춤을 미룸) ·
       ?dev=1 을 직접 붙인 탭인가 */
    applyLook: applyLook, setSalonActive: setSalonActive, get salonActive() { return salonActive; }, get devExplicit() { return DEV_EXPLICIT; },
    /* 미용실 (테스트 · 도구): 거울 단추와 같은 길로 시트 열기 · 병 고르기 · [물어보기] · 남은 연출 감기 · 지금 연출 중인 물음 { id, n(보인 행), face } | null · 행 DOM */
    openSalon: openSalon, salonPick: salonPick, salonAsk: salonAsk, salonFinish: salonFinish, renderSalonSheet: renderSalonSheet, salonRowsDOM: salonRowsDOM,
    get salonStage() { return salonRun ? { id: salonRun.ask.id, n: salonRun.n, face: salonRun.face, action: salonRun.st.action, done: salonRun.done } : null; }
  };
})();
