/* ============================================================
   뽈뽈 문어 — js/app.js (전역 APP)
   DESIGN.md §2 §3 §4 §6 §7 §8 §12.3
   섹션: util · state · migrate · assets · scene(SCENE3D|SCENE2D 브리지) · octopus ·
         invite/reveal · log · posters · album(요즘 · 메모 · 일기) · dialogs(포스터 · 설정 · 이름) · rooms(문어 방 ↔ 놀이방) · tip · demo · boot
   7물결 (주인 11-07): '방 보기' 는 없앴다 → ⚙ 설정 시트 (문어 색 · 내 모습 · 소리 · 모션 · 글꼴 · 기록) · 앨범 (문어의 요즘 · 다음 산책에 가는 메모 · 일기 탭).
   건너뛰기는 큰 버튼에 합쳤다 (나가 있는 동안 #btn-go = "다녀오는 중…" 글자만, 누르면 skip).
   8물결: 다락 안 진짜 문(#btn-door, 3D 문 위 투명 단추) → goRoom('play') → 진짜 놀이방 (오락기 → 다락방 달리기 · 문 → 문어 방). 자세한 규칙은 rooms 섹션
   플레이어가 보는 버튼 · 탭 · 시트 제목에는 글자나 픽셀 그림만 (이모지 · 유니코드 기호 없음 — 주인 11-07 '실제 사용자에게 바로 나간다고 생각해')
   로드 순서: three.min.js → world.js → brain.js → scene3d.js → scene2d.js → app.js (type="module" 금지)
   장면: SCENE = SCENE3D.supported() ? SCENE3D : SCENE2D (§13.1). APP 은 그 API 하나만 본다.
   ============================================================ */
/* global WORLD, BRAIN, SCENE3D, SCENE2D */
var APP = (function () {
  'use strict';

  /* ───────────────────────── util ───────────────────────── */
  var W = (typeof WORLD !== 'undefined') ? WORLD : null;
  var B = (typeof BRAIN !== 'undefined') ? BRAIN : null;
  var STR = (W && W.strings) || {};
  var MEMO_STR = (W && W.memoTemplates) || {};
  var STATUS_LABEL = { read: '읽음', builtin: '책장 메모', simulated: '모의 방문', failed: '못 읽음', none: '앉아만 있었음' };
  var MISS_WORD = { simulated: '모의', failed: '못 읽음' };   /* 들른 곳 사슬에서 이름 뒤 짧은 낱말 */
  var FOLLOW_LABEL = { followed: '따라감', ignored: '무시함', left: '도중에 벗어남', none: '없음' };
  var BY_LABEL = { demo: '데모 두뇌(규칙)', human: '사람이 조작', mcp: '모델(MCP)', legacy: '복원된 기록' };
  var LOG_LABEL = { depart: '출발', peek: '기웃', 'return': '귀가', remember: '기억', hang_poster: '포스터', wrap_up: '마무리', stay_home: '집', empty_turn: '…' };
  var VOICE_LABELS = ['귀가', '기억', '마무리', '집', '인사', '방', '혼잣말', '어제 메모', '지난 메모'];   /* 문어 목소리 행 → 픽셀 테마에서 호박색 탭 + 초상 대화창 (§15.2) */
  /* 문어 목소리 행의 표정 (DESIGN §15.2): 귀가 calm · 기억 curious · 마무리 폴짝/우쭐 happy, 졸림 sleepy, 덤덤 calm · 집 활동 calm (낮잠 sleep) · 빈 차례 sleep · 인사 깨어 있으면 happy / 자는 중 sleep · 방(소품) happy · 말풍선 ♡ pet, ? curious */
  var REACT_EXPR = { '폴짝': 'happy', '우쭐': 'happy', '덤덤': 'calm', '졸림': 'sleepy' };
  var STATE_EXPR = { happy: 'happy', pet: 'pet', sleep: 'sleep', anticipate: 'calm' };   /* 상태의 기본 표정 (SCENE.md 초상·표정) — 대화창 표정은 4 s 뒤 여기로 돌아온다 */
  /* 자는 문어를 누르면 · 깨어 있는 문어를 톡 누르면 (말풍선 + 혼잣말 행). 소리(js/audio.js)는 글자가 아니라 kind('sleep' · 'curious')로 고른다 */
  var SLEEP_SAY = '쿨쿨…', TAP_SAY = '응?';
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
  /* 등불 칸이 켜질 때 문어 목소리로 한 줄 (WORLD.roomLevels 순서) */
  var ITEM_LINE = { 1: '창턱에 이끼 화분을 올려뒀어', 2: '낡은 나무 상자를 끌어다 책상 삼았어', 3: '구석에 양초를 켰어. 그림자가 흔들려', 4: '담요 한 장 깔았어. 좀 따뜻해졌어',
    5: '벽에 포스터 붙일 판을 걸었어', 6: '비가 잦아들었어. 창밖이 조용해', 7: '선반을 달았어. 창문에 별도 보여', 8: '커튼을 쳤어. 이제 진짜 내 다락이야' };
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function dateKey(d) { d = d || new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  /* 테스트 훅: window.__ppolTest.today = 'YYYY-MM-DD' 가 있을 때만 '오늘'을 그 날짜로 (tools/smoke.js 둘째 날). js/runner.js · js/audio.js 도 같은 규칙 */
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
  var toastTimer = null;
  function toast(msg, raw) {   /* <output aria-live=polite> 하나, 한 번에 하나, 2.5초 (UI R21). raw = { part, by }: 그 안의 남의 글(위키 제목 등)만 data-raw */
    var t = $('toast'); if (!t) return;
    var moved = raiseToast(t);
    if (moved && !t.classList.contains('show')) void t.offsetWidth;   /* 옮긴 직후에도 나타나는 전환이 돌게 */
    t.textContent = ''; partRaw(msg, raw && raw.part, raw && raw.by).forEach(function (n) { t.appendChild(n); }); t.classList.add('show');
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
  function quietWarn(text) { var w = $('save-warn'); if (!w) return; if (w.textContent === text && !w.hidden) return; w.textContent = text; w.hidden = false; }

  /* ───────────────────────── state ───────────────────────── */
  /* 스냅 팔레트 (룩 패스 3, settings.palette): 즉흥 램프 또는 js/palettes.js 의 검증 팔레트. 기본값은 SCENE3D.PAL_DEFAULT (docs/LOOK_LOG.md 3행) */
  var PALETTES_UI = [['ramps', '즉흥'], ['apollo', 'Apollo'], ['endesga64', 'Endesga'], ['resurrect64', 'Resurrect']];
  function paletteDefault() { return (typeof SCENE3D !== 'undefined' && SCENE3D.PAL_DEFAULT) || 'ramps'; }
  /* 내 모습 (내 캐릭터 파츠 — docs/PLAYER_PARTS.md §3): 목록·기본값은 장면(SCENE3D.PLAYER_PARTS · PLAYER_DEFAULT)이 주인. 장면 빌드에 아직 없으면 같은 id 의 비상 목록.
     옷방(왼쪽 문)이 생기기 전까지는 설정 시트 '내 모습' 섹션에서 고른다 (PLAYER_PROGRESSION 11-08 메모). 저장은 settings.player = { hair, hairColor, eyes, eyeColor, outfit, shoes, acc } (id) */
  var PLAYER_CATS = [['hair', '머리'], ['hairColor', '머리 색'], ['eyes', '눈'], ['eyeColor', '눈 색'], ['outfit', '옷'], ['shoes', '신발'], ['acc', '악세사리']];
  var PLAYER_FALLBACK = {
    hair: [['bob', '단발'], ['short', '짧은머리'], ['long', '긴생머리'], ['twin', '양갈래'], ['pony', '포니테일'], ['wave', '웨이브']],
    hairColor: [['blonde', '금발', '#ffc16a'], ['brown', '밤갈색', '#9a5a3a'], ['ink', '먹남색', '#1e2a44'], ['silver', '은빛', '#cfc9c0'], ['pink', '분홍', '#de8fa9'], ['lime', '연두', '#a0d070']],
    eyes: [['round', '동그란눈'], ['sleepy', '졸린눈'], ['almond', '아몬드눈'], ['smile', '웃는눈'], ['dot', '점눈']],
    eyeColor: [['dark', '흑갈색', '#4d2b32'], ['hazel', '호두색', '#884b2b'], ['sea', '바다색', '#3c5e8b'], ['leaf', '잎새색', '#468232'], ['honey', '꿀색', '#be772b'], ['violet', '제비꽃', '#7a367b']],
    outfit: [['dress', '원피스'], ['knit', '니트'], ['hoodie', '후드'], ['overall', '멜빵'], ['raincoat', '비옷']],
    shoes: [['flat', '단화'], ['boot', '부츠'], ['sneaker', '운동화'], ['loafer', '로퍼']],
    acc: [['none', '없음'], ['ribbon', '리본'], ['beret', '베레모'], ['glasses', '동글안경'], ['catears', '고양이귀'], ['strawhat', '밀짚모자']]
  };
  var PLAYER_FALLBACK_DEFAULT = { hair: 'bob', hairColor: 'blonde', eyes: 'round', eyeColor: 'dark', outfit: 'dress', shoes: 'flat', acc: 'ribbon' };
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
      octopus: { name: null, born: null, trips: 0, invites: 0, days: [], affinity: {}, visits: {}, state: 'idle' },
      room: { lantern: 0, souvenirs: [], posterOrder: [] },
      trips: [],
      notes: {},   /* §17.1 방마다 최근 메모 1개: { nodeId: { text, tripId, date } } */
      curiosityNotes: [],   /* 호기심 메모 (docs/CURIOSITY_NOTES.md): [{ id:'cn_…', text, about, by, model?, session(여행 id), at, status:'active'|'set_down', setDownAt }] — 오래된 것부터 */
      settings: { motion: 'auto', thumbs: true, lastSeen: null, octColor: '#e8463c', flipped: false, palette: paletteDefault(), pixelFont: true, albumSeen: 0, player: playerDefault() }   /* player: 내 모습 (id 들, normalizePlayer) · albumSeen: 앨범 점 기준 (renderAlbumBtn). 새 기록은 0 = 아직 본 포스터 없음 */
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
    return cut ? JSON.stringify(Object.assign({}, S, { trips: trips })) : null;
  }
  function save() {
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
    if (v1) { S = migrateV1(v1); save(); return S; }
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
    s.v = 2;
    s.octopus = Object.assign(d.octopus, s.octopus || {});
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
    if (!/^#[0-9a-f]{6}$/i.test(s.settings.octColor || '')) s.settings.octColor = '#e8463c';
    if (PALETTES_UI.map(function (p) { return p[0]; }).indexOf(s.settings.palette) < 0) s.settings.palette = paletteDefault();
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
  var ITEM_LEVEL = { moss: 1, crate: 2, candle: 3, blanket: 4, board: 5, shelf: 7, curtain: 8 };
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
      pixelSize: 3, color: S.settings.octColor, lantern: S.room.lantern, items: itemsFor(S.room.lantern), weather: weatherFor(S.room.lantern), hour: hourNow(),
      posters: [], souvenirs: [], reducedMotion: reduced(), speed: speed(), assetPath: assetPath, octEl: $('oct'), look: lookNow(), palette: paletteNow(), season: seasonPref(), player: S.settings.player,
      on: {
        posterTap: function (id) { openPoster(id); },
        souvenirTap: function (sv) { if (sv.tripId && tripById(sv.tripId)) { say((sv.name || sv.id) + ' — 이거 가져온 날', 'happy', 1800, { icon: souvenirIcon(sv.id) }); openPoster(sv.tripId, true); } },   /* 이름 + 말풍선에 기념품 픽셀 그림 */
        albumTap: function () { openAlbum(); },   /* 2D 벽의 '+N' (앨범으로) */
        pet: pet,
        tap: function () { if (oct.state === 'sleep') say(SLEEP_SAY, 'sleep', 1500); else if (!oct.busy && oct.state !== 'pet') say(TAP_SAY, 'curious', 1600); },   /* 글자만 (예전 '…zZ' · '?' 는 기호로 읽혀 뺐다 — 주인 11-07) */
        windowTap: function () {
          if (oct.busy) return;
          if (oct.state === 'sleep') { say(SLEEP_SAY, 'sleep', 1500); return; }   /* 자는 중엔 깨우지 않는다 (쓰다듬기·탭과 같은 말) */
          walkTo('window').then(function () { if (!oct.busy) { octState('idle'); var w = weatherFor(S.room.lantern), hr = new Date().getHours(); say(w === 'clear' ? (hr >= 19 || hr < 6 ? '별이 보여' : '맑네') : w === 'snow' ? '눈이 와' : '비가 와', 'calm', 2000); } });
        },
        anchorReached: function () { /* moveTo 의 Promise 로 받는다 */ },
        place: function () { updateSceneDesc(); },   /* 3D: 의식이 다락 ↔ 집 바깥을 바꾼 순간 (2D 는 runCeremony 의 250 ms 틱이 따라간다). 놀이방에 있는 동안에도 온다 (이야기 장소만 바뀜) */
        door: function (ev) { if (window.AUDIO && ev) AUDIO.on('door', { act: ev.act, room: ev.room }); },   /* 8물결: 방 문이 열리고 닫힐 때 끼익 (장면은 AUDIO 를 부르지 않는다) */
        view: function (v) { syncRoomUI(v); }   /* 8물결: 보이는 장소(다락 · 바깥 · 놀이방)가 바뀐 프레임 */
      }
    };
  }
  var timeTimer = 0;
  function initScene(force2d) {   /* force2d = 3D 를 버리고 2D 로 (sceneLost) */
    var host = $('scene'), opts = sceneOpts();
    if (!force2d && typeof SCENE3D !== 'undefined' && SCENE3D.supported()) {
      opts.onLost = sceneLost;
      try { scene = SCENE3D.init($('scene3d'), opts); sceneMode = '3d'; }
      catch (e) { console.warn('[app] scene3d init 실패 → 2D 폴백', e); scene = null; }
    }
    if (!scene) { scene = SCENE2D.init(host, opts); sceneMode = '2d'; }
    host.classList.toggle('mode-3d', sceneMode === '3d');
    $('scene3d').hidden = sceneMode !== '3d';
    bindSpots();   /* 방 문 · 오락기 단추를 장면에 넘긴다 (자리 · hidden 은 장면이) */
    if (!timeTimer) timeTimer = setInterval(function () { scene.setTime(hourNow()); updateSceneDesc(); checkDay(); }, 60000);   /* 1분마다: 시각 · 자정이 지나면 오늘 칸 넘기기 */
  }
  /* WebGL 컨텍스트를 잃고 3 s 안에 돌아오지 않음 (scene3d 의 opts.onLost, docs/research/a11y-and-mobile-perf.md 3): 검게 멈춘 3D 를 버리고 같은 initScene 경로로 2D 폴백.
     돌아오면 scene3d 가 부르지 않는다 → 3D 그대로. 지금 앱 상태(등불·소품·날씨·벽·선반·문어 자리와 상태)를 새 장면에 다시 그린다. 걸린 의식은 runCeremony 가 새 장면의 빈 이름을 보고 푼다 */
  function sceneLost() {
    if (sceneMode !== '3d' || !scene) return;
    console.warn('[app] WebGL 컨텍스트가 돌아오지 않음 → 2D 폴백');
    if (window.INTRO && ['sky', 'title'].indexOf(INTRO.phase) >= 0) { try { INTRO.dismiss(); } catch (e) { /* 입장 레이어 없음 */ } }   /* 멈춘 하늘에 갇히지 않게 */
    var old = scene; scene = null;
    try { if (typeof old.hotspots === 'function') old.hotspots({}); } catch (e) { /* 단추 묶음 풀기 실패 — 아래에서 손으로 */ }
    try { old.destroy(); } catch (e) { console.warn('[app] scene3d destroy', e); }   /* 돌던 문 작업은 destroy 가 끝낸다 (goRoom 의 Promise 도 풀린다) */
    resetRoomUI();   /* 놀이방에 있었어도 2D 는 다락에서 다시 시작 (쪽지 · 단추 · data-view) */
    var el = $('oct'), stage = $('stage');   /* destroy 가 중간에 멈췄어도 문어 DOM 은 2D 무대로 */
    if (el && stage && el.parentNode !== stage) stage.appendChild(el);
    if (el) { el.classList.remove('overlay3d'); el.style.transform = ''; el.style.display = ''; }   /* 놀이방에서 잃었으면 장면이 숨겨 둔 문어 (display:none) 도 다시 */
    initScene(true);
    renderScene(); renderSouvenirs(); renderWall();
    scene.jumpTo(oct.anchor); scene.setOctState(oct.state === 'carry' ? 'walk' : oct.state);   /* 들고 오던 포스터 그림은 3D 쪽에만 있었다 → 걷는 자세로 */
    PORT.cache = {}; refreshPortraits();   /* 로그 초상도 2D 얼굴로 (한 로그 안에서 섞이지 않게) */
    var pal = $('dv-pal'), sw = $('dv-swatch'), msg = $('dv-msg');
    if (pal) pal.remove();
    if (sw) sw.innerHTML = '';
    if (msg) msg.textContent = '지금은 2D 장면이라 이 슬라이더는 적용 안 돼 (3D 그림이 멈춰서 바꿨어)';
    updateSceneDesc();
    toast('3D 그림이 멈춰서 2D로 바꿨어');
  }
  /* part: 'lantern' 등불만 · 'items' 소품·날씨만 · 생략하면 전부 (귀가 연출에서 둘을 200ms 띄운다) */
  function renderScene(part) {
    var lv = S.room.lantern;
    if (part !== 'items') scene.setLantern(lv);
    if (part !== 'lantern') { scene.setItems(itemsFor(lv)); scene.setWeather(weatherFor(lv)); }
    document.title = (S.octopus.name ? S.octopus.name + ' · ' : '') + roomTitle(lv) + ' · 뽈뽈 문어';
    updateSceneDesc();
  }
  function setOctColor(hex) { if (!/^#[0-9a-f]{6}$/i.test(hex)) return; S.settings.octColor = hex; save(); scene.setColor(hex); refreshPortraits(); }
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
  var ANCHORS = { door: 1, window: 1, crate: 1, board: 1, blanket: 1, center: 1 };
  var oct = { state: 'idle', anchor: 'center', wanderTimer: null, busy: false };
  function anchorName(name) { if (name === 'blanket' && S.room.lantern < 4) return 'center'; return ANCHORS[name] ? name : 'center'; }
  function allowedIdleAnchors() {
    var a = ['window', 'center'];
    if (S.room.lantern >= 2) a.push('crate');
    if (S.room.lantern >= 4) a.push('blanket');
    if (S.room.posterOrder.length) a.push('board');
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
  var SPOT_DESC = { window: '창가', center: '방 가운데', crate: '나무 상자 옆', blanket: '담요 위', board: '포스터 판 앞', door: '문 앞' };
  var DOING_DESC = { idle: '쉬고 있어', stay: '쉬고 있어', sleep: '자고 있어', pet: '쓰다듬받고 있어', happy: '신나 있어', anticipate: '나갈 채비 중이야', hang: '포스터를 붙이고 있어', carry: '포스터를 들고 있어' };
  function partOfDay(hr) { return hr < 5 ? '밤' : hr < 9 ? '아침' : hr < 17 ? '낮' : hr < 19 ? '저녁' : '밤'; }
  function sceneDescText() {
    if (sceneView() === 'play')   /* 놀이방 (8물결): 문어는 다락(또는 산책) — 놀이방엔 오지 않는다 */
      return '놀이방, ' + partOfDay(hourNow()) + '. 다락방 달리기 오락기랑 작은 부엌이 있어. ' + (oct.state === 'away' || sceneCeremony() === 'depart' ? '문어는 산책 나갔어.' : '문어는 다락방에 있어.');
    var lv = S.room.lantern, outside = sceneMode === '3d' && !!scene && typeof scene.place === 'function' && scene.place() === 'exterior';   /* 2D 무대는 바깥을 그리지 않는다 (장소 값만 기억) → 늘 다락 */
    var where = outside ? '집 바깥' : lv ? '등불 ' + lv + '칸 켜진 다락' : '불씨 하나 켜진 다락';   /* 0칸이어도 등불 속 불씨는 켜져 있다 */
    var wx = WX_DESC[weatherFor(lv)], st = oct.state, cname = sceneCeremony();
    /* 출발·귀가 의식은 장면이 스스로 걷고 장소를 바꾼다 (APP 의 oct.state 는 의식이 끝나야 바뀐다) → 의식 이름대로 */
    var who = cname === 'depart' ? '문어는 나가는 중이야.' : cname === 'return' ? '문어는 돌아오는 중이야.'
      : st === 'away' ? '문어는 산책 나갔어.' : st === 'walk' ? '문어는 걸어가는 중이야.'
      : '문어는 ' + (SPOT_DESC[oct.anchor] || '방 가운데') + '에서 ' + (DOING_DESC[st] || '쉬고 있어') + '.';
    return where + ', ' + (wx ? wx + ' ' : '') + partOfDay(hourNow()) + '. ' + who;
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
  }
  var sleepReaction = null;   /* finalPose 가 잠재우기 직전에 넣는다 → 다음 'sleep' 상태 훅 한 번만 */
  var SLEEP_LABEL = '자는 중', DREAM_LABEL = '꿈꾸는 중';

  /* ── 출발·귀가 의식 (DESIGN §15.3 · SCENE.md "바깥·계절·전환"): 다락 문 → 전환 → 현관 → 계단 → 길 → 화면 밖 / 그 거꾸로.
     장면이 dt 로 돌리는 작업 큐라 끝날 때까지 moveTo/setOctState 를 부르지 않는다. 건너뛰기 = 남은 의식을 한 번에 감아 끝낸다(jumpCeremony).
     탭이 숨어 rAF 가 멈추거나 30 s 를 넘기면 역시 감는다 → 바깥에 멈춘 채 남지 않는다. 2D 폴백은 장소 값만 기억하고 다음 틱에 끝난다 ── */
  var cer = { kind: '', seq: 0, ink: false, raf: 0 };
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
    cer.kind = kind; cer.ink = false;
    if (window.AUDIO) AUDIO.on('ceremony', { kind: kind, skip: skipFlag });   /* 소리: 출발·귀가 징글 (js/audio.js) */
    var p = kind === 'peek' ? scene.peekOutside(arg) : scene[CER_FN[kind]]();
    if (kind === 'depart' && sceneMode === '3d') watchDoorExit(my);
    if (skipFlag) jumpCeremony();
    return new Promise(function (resolve) {
      var done = false, iv = null, seen = sceneCeremony() === kind, blank = 0, stuck = 0;
      function fin(cancelled) {
        if (done) return; done = true; clearInterval(iv);
        var ink = cer.seq === my && cer.ink;
        if (cer.seq === my) { cancelAnimationFrame(cer.raf); cer.kind = ''; }
        updateSceneDesc();
        resolve({ ink: ink, cancelled: !!cancelled });
      }
      Promise.resolve(p).then(function () { fin(false); }, function () { fin(false); });
      updateSceneDesc();
      iv = setInterval(function () {
        updateSceneDesc();   /* 의식 중 장소(다락 ↔ 집 바깥)는 장면이 바꾼다 → 250 ms 마다 따라간다 (글자가 바뀔 때만 쓴다) */
        var name = sceneCeremony();
        if (name === kind) { seen = true; blank = 0; }
        else if (name && seen) { fin(true); return; }        /* 끝났으면 p 가 먼저 풀렸다 → 여기 오면 다른 의식이 덮은 것 */
        else if (!name && ++blank > 2) { fin(false); return; }   /* 장면이 조용히 끝냈는데 Promise 를 못 받음 — 흐름은 멈추지 않는다 */
        if (document.hidden || skipFlag || Date.now() - t0 > 30000 * speed()) {
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
      var fact = id === 'letter_room' ? '아직 비어 있었어' : st === 'failed' ? '닫혀 있었어' : st === 'simulated' ? '문 앞까지만' : st === 'none' ? '…' : (ev.first ? '처음 온 곳 · ' : '') + (STATUS_LABEL[st] || '읽음');
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
  function napOver() {
    var l = null;
    S.trips.forEach(function (t) { if (t.status === 'done' && t.kind !== 'empty') l = t; });
    if (!l || !l.endedAt) return true;
    var endDay = hookToday() ? l.date : dateKey(new Date(l.endedAt));   /* 끝난 날 (날짜 훅이 있으면 훅이 정한 그 여행의 날) */
    return endDay !== todayKey() || Date.now() - l.endedAt > NAP_MS;
  }
  /* 스스로 깸: 작은 혼잣말 '…응?' 은 말풍선만 (로그에 남기지 않는다). 말풍선은 졸린 귓속말 모양, 얼굴은 눈을 뜬 curious —
     반쯤 감은 calm·sleepy 는 주인이 '-_-^'(화남)로 읽었다 (DIALOGUE_UI: '…응?' + 눈 뜨기) */
  function selfWake() {
    octState('idle'); S.octopus.state = 'idle'; save();
    bubble('…응?', 1600, 'sleepy'); expressRow('curious');
  }
  var dreamTimer = null;
  function scheduleDreamLabel() {
    clearTimeout(dreamTimer);
    dreamTimer = setTimeout(function () {
      if (oct.state !== 'sleep') return;
      if (!oct.busy && !document.hidden && !lookHook() && napOver()) { selfWake(); return; }   /* 숨은 탭에선 기다렸다가 돌아와서 (깨는 걸 볼 수 있게) */
      var lbl = $('oct-label'); if (lbl) lbl.textContent = lbl.textContent === SLEEP_LABEL ? DREAM_LABEL : SLEEP_LABEL;
      scheduleDreamLabel();
    }, 9000 + uiRng() * 6000);
  }
  function walkTo(anchor, mode) {
    oct.anchor = anchorName(anchor);
    octState(mode || 'walk');
    return scene.moveTo(oct.anchor);
  }
  function stopWander() { clearTimeout(oct.wanderTimer); oct.wanderTimer = null; }
  function scheduleWander() {
    stopWander();
    oct.wanderTimer = setTimeout(function () {
      if (oct.busy || oct.state !== 'idle' || document.hidden) { scheduleWander(); return; }
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
  function thinkLine() {   /* → { text, note } — note = 그때 남긴 메모 그대로 (말풍선에서 그 부분만 남의 글 표시) */
    var pool = recentNotes(); if (!pool.length) return null;
    var n = pool[Math.floor(uiRng() * pool.length)];
    return { text: typeof MEMO_STR.thinking === 'function' ? MEMO_STR.thinking(n.text) : n.text + ' 생각 중', note: n.text, by: rawBy(tripById(n.tripId)) };
  }
  function scheduleThink() {
    clearTimeout(thinkTimer);
    thinkTimer = setTimeout(function () {
      var dlgOpen = !!document.querySelector('dialog[open]');
      if (!oct.busy && oct.state === 'idle' && !document.hidden && !dlgOpen && !lookHook()) {
        var t = thinkLine(); if (t) { bubble(t.text, 3600, 'think', { raw: t.by, rawText: t.note }); expressRow('curious'); }
      }
      scheduleThink();
    }, (20 + uiRng() * 20) * 1000);
  }
  /* kind → 말풍선 모양 (js/ui-art.js) · 말풍선 목소리 (js/audio.js). opt: { icon: 'memory/sea' (말 뒤 픽셀 그림), raw: 'model'|… (남이 쓴 말), rawText: 그중 남의 글 부분 (없으면 전부) } */
  function bubble(text, ms, kind, opt) {
    if (text && inPlay()) return;   /* 놀이방에 있는 동안 문어의 말풍선은 띄우지 않는다 (문어는 다락에 · 말풍선 소리도 없이). 로그 행은 그대로 (say) */
    scene.bubble(text, ms);
    var b = $('oct-bubble');
    if (b && text && !b.hidden && opt) {   /* 장면은 글자만 넣는다 (textContent) → 남의 글 표시 · 그림은 여기서 덧붙인다 (재는 건 그 뒤 UIART.onBubble) */
      if (opt.raw) { b.textContent = ''; withRaw(text, opt.rawText || text, opt.raw).forEach(function (n) { b.appendChild(n); }); }
      var im = opt.icon ? ico(opt.icon, 'ua-bub') : null; if (im) b.appendChild(im);
    }
    if (window.UIART) UIART.onBubble(text, kind); if (window.AUDIO) AUDIO.on('bubble', { text: text, kind: kind }); keepBubble2D();
  }
  /* 2D 무대: 문 앞(무대 오른쪽 끝)에서 말풍선(최대 150px)이 장면 밖으로 잘리지 않게 옆으로 민다 (--bub-dx → css #oct-bubble left, 무대 px).
     보이는 동안 문어가 걸어가도 5 Hz 로 따라간다. 3D 픽셀 말풍선은 js/ui-art.js keepInside 가 맡는다 */
  var bubFit = null;
  function keepBubble2D() {
    clearInterval(bubFit); bubFit = null;
    var b = $('oct-bubble'), sc = $('scene'); if (!b || !sc) return;
    function fit() {
      var UA = window.UIART && UIART.avoidCtl && UIART.ctlYield ? UIART : null;
      if (b.hidden || sceneMode !== '2d') { clearInterval(bubFit); bubFit = null; b.style.removeProperty('--bub-dx'); if (UA && sceneMode === '2d') UA.ctlYield(false); return; }
      var px = parseFloat(getComputedStyle(sc).getPropertyValue('--px')) || 1, cur = parseFloat(b.style.getPropertyValue('--bub-dx')) || 0;
      var s = sc.getBoundingClientRect(), r = b.getBoundingClientRect(), pad = 4, l = r.left - cur * px, rt = r.right - cur * px, dx = 0;
      if (rt > s.right - pad) dx = (s.right - pad - rt) / px; else if (l < s.left + pad) dx = (s.left + pad - l) / px;
      /* 장면 위 버튼(오른쪽 위 묶음: 앨범 · ⚙ · 소리 / 오른쪽 아래 놀이방 문)과 겹치면 그 왼쪽으로 (풍선이 문어 위를 벗어나지 않는 만큼까지 · 왼쪽 가장자리 안) — js/ui-art.js avoidCtl 과 3D 규칙이 같다 */
      var cs = UA ? UA.avoidCtl({ left: l, right: rt, top: r.top, bottom: r.bottom }, pad) : 0;
      if (cs < 0) dx = Math.min(dx, Math.max(cs, s.left + pad - l, -Math.max(0, r.width / 2 - 28)) / px);
      dx = Math.round(dx);
      if (UA) UA.ctlYield({ left: l + dx * px, right: rt + dx * px, top: r.top, bottom: r.bottom });   /* 그래도 겹치는 버튼만 말풍선이 보이는 동안 숨김 (3D 와 같다) */
      if (dx !== cur) { if (dx) b.style.setProperty('--bub-dx', dx + 'px'); else b.style.removeProperty('--bub-dx'); }
    }
    fit();
    if (!b.hidden && sceneMode === '2d') bubFit = setInterval(fit, 200);
  }
  /* 말풍선 + 로그 대화창 행 (§15.2 "?" · "비가 와" · "…좋아"): 장면 위 말풍선과 같은 말을 초상과 함께 오늘 칸에 남긴다 (저장 X — 새로고침하면 사라지는 혼잣말). 바로 앞 행과 같은 말이면 행은 생략.
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
    if (S.octopus.state === 'sleep') { octPlace('blanket'); octState('sleep'); }
    else { octPlace('window'); octState('idle'); }
    scheduleWander();
  }
  function wakeUp() { if (oct.state === 'sleep') { octState('idle'); S.octopus.state = 'idle'; save(); } }
  var petTimer = null;
  function pet() {
    if (oct.busy || oct.state === 'away') return;
    if (oct.state === 'sleep') { say(SLEEP_SAY, 'sleep', 1500); return; }
    octState('pet');
    if (window.UIART) UIART.fx('heart');
    if (window.AUDIO) AUDIO.on('pet');   /* 소리: 쓰다듬기 */
    clearTimeout(petTimer);
    petTimer = setTimeout(function () {
      if (oct.state !== 'pet') return;
      if (uiRng() < 0.7) { octState('idle'); say('…좋아', 'pet', 1800); }   /* 글자만 (예전 하트 기호는 뺐다 — 하트는 픽셀 테마 파티클이 띄운다) */
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
  function setBusy(on) {
    busy = on; oct.busy = on;
    if (!on) { flying = null; if (remoteDirty) { remoteDirty = false; renderAll(); applyMotion(); applyFont(); } }
    var go = $('btn-go'), inp = $('hint-in');
    clearTimeout(skipTimer); skipReady = on ? Date.now() + SKIP_GUARD : 0;
    if (go) {
      go.disabled = false; go.classList.toggle('away', on); go.classList.remove('can-skip');
      if (go.parentNode) go.parentNode.classList.toggle('away', on);
      go.innerHTML = '<span class="go-txt">' + (on ? '다녀오는 중…' : esc(STR.goButton || '뽈뽈 다녀와')) + '</span>';
      if (on) { go.setAttribute('aria-label', '다녀오는 중. 누르면 바로 돌아오게 하기'); skipTimer = setTimeout(function () { if (busy) go.classList.add('can-skip'); }, SKIP_GUARD); }
      else go.removeAttribute('aria-label');
    }
    if (inp) inp.disabled = on;
    if (on) stopWander(); else { ensureAttic(); scheduleWander(); }
    renderBrainTag();
    if (window.AUDIO) AUDIO.on('busy', { on: on });   /* 소리: 건너뛰기 표시 정리 */
  }
  /* #btn-go: 집에 있으면 초대, 나가 있으면 (막 누른 직후가 아니면) 바로 데려오기 */
  function goTap() {
    if (inPlay() || roomJob) {   /* 놀이방이면 먼저 문으로 문어 방에 돌아와서 (8물결). 누른 *그때* 의 뜻대로: 다녀오는 중이었으면 데려오기(건너뛰기)만 — 문을 지나는 사이 산책이 끝났으면 아무것도 안 한다 (새 산책이 되지 않게) */
      var wasBusy = busy;
      backToOctRoom().then(function (ok) {
        if (!ok) return;
        if (wasBusy) { if (busy && Date.now() >= skipReady) skip(); }
        else if (!busy) invite();
      });
      return;
    }
    if (!busy) { invite(); return; }
    if (Date.now() < skipReady) return;
    skip();
  }
  /* 상태 줄 이름 옆 '데모' 표시 (정직 표기, index.html #brain-tag): 데모 두뇌(규칙)가 고르는 동안 늘. 모델(MCP)이 고른 여행을 재생하는 동안만 숨긴다 */
  function renderBrainTag() { var tg = $('brain-tag'); if (tg) tg.hidden = !!(flying && flying.by === 'mcp'); }
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
      now: new Date(), online: navigator.onLine !== false, by: 'demo'
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
  function invite(hintText) {
    if (busy) return Promise.resolve(null);
    if (inPlay() || roomJob) return backToOctRoom().then(function (ok) { return ok ? invite(hintText) : null; });   /* 출발은 문어 방에서 본다: 놀이방이면 문을 지나 돌아온 뒤 (8물결) */
    hideBackNote();
    if (!S.octopus.name) { openNameDialog(); return Promise.resolve(null); }
    checkDay(true);   /* 자정을 넘겨 다시 부르면 어제 로그는 앨범 일기로, 오늘 칸부터 새로 */
    if (!B || typeof B.plan !== 'function') { toast('두뇌(brain.js)가 아직 없어'); return Promise.resolve(null); }
    /* 힌트 칸은 개발 모드에만 있다 (결정 18): 플레이어 산책은 늘 빈 힌트. 두뇌의 힌트 이해는 그대로 둔다 (개발·테스트·MCP 이벤트) */
    var hint = String(hintText == null ? (DEV && $('hint-in') ? $('hint-in').value : '') : hintText).trim();
    var dk = todayKey(), seq = tripsOn(dk).length + 1;
    var seed = B.hashSeed(dk, hint, seq, S.octopus.name);
    var trip = { id: newTripId(seed), date: dk, seq: seq, seed: seed, kind: null, by: 'demo', hint: { raw: hint, match: null, followed: null },
      status: 'running', startedAt: Date.now(), endedAt: null, events: [], receipt: null, poster: null, weather: weatherFor(S.room.lantern) };
    S.trips.push(trip); save();
    if ($('hint-in')) $('hint-in').value = '';
    updateHintHelp();
    setBusy(true); skipFlag = false; flying = trip;
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
      if (trip.status !== 'done') mergePlan(trip, planned);   /* done = 그사이 다른 탭이 데려왔다 (adoptRemote) → 그 기록 그대로 보여 준다 */
      save();
      /* 외출: 움츠림 뒤 출발 의식(다락 문 → 바깥 → 화면 밖) → 끝나면 로그 공개. 바깥은 나가 있는 동안 그대로 (계절 입자). 집·빈 차례는 의식 없음 */
      var lead = trip.kind === 'out' ? departOut() : !fast ? settleOct() : Promise.resolve();
      return lead.then(function () { return reveal(trip); }).then(function () { setBusy(false); return trip; });
    });
  }
  /* 건너뛰기 (큰 버튼 · 나가 있는 동안): 걷던 길은 그 자리에서 도착 (2D·3D 장면의 finishWalk — moveTo 의 Promise 도 지금 풀린다) · 의식은 감고 · 틈은 깨운다 */
  function skip() { skipFlag = true; if (scene && typeof scene.finishWalk === 'function') scene.finishWalk(); if (cer.kind) jumpCeremony(); if (revealing && revealing.wake) revealing.wake(); }
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
  /* 귀가 연출 (UI R25 · GF R15/R18): 로그 끝 → 포스터 올라옴 → 토스트 → 등불 칸 → 200ms 뒤 소품 + 문어 한 줄. 건너뛰기/축소 모션이면 즉시 */
  function startCeremony() {
    if (!revealing) return Promise.resolve();
    if (revealing.ceremony) return revealing.ceremony;
    var d = revealing.deferred, trip = revealing.trip;
    if (!d) { revealing.ceremony = Promise.resolve(); return revealing.ceremony; }
    revealing.deferred = null;
    var fast = skipFlag || reduced(), lit = S.room.lantern > d.prevL, lv = S.room.lantern;
    function wait(ms) { return fast ? Promise.resolve() : sleep(ms * speed()); }
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
      if (lit && ITEM_LINE[lv]) appendLogRow(ensureTodaySection(), logRow('방', ITEM_LINE[lv], 'c-amber', true, 'happy'));
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
        if (fast) { if (wasOut && typeof scene.leaveOutside === 'function') scene.leaveOutside(); if (!jumpCeremony()) abandonCeremony(); bubble('', 0); dropOverlay(); ensureAttic(); octPlace('board'); octState(mode, carryX); noteBack(); return Promise.resolve(); }
        /* (바깥 기웃을 했으면 같은 출구로 퇴장) → 귀가 의식(길 → 계단 → 현관 → 다락 문) → 보드까지 걸어가 포스터 걸기 */
        var back = (hasCeremony() && oct.state === 'away') ? (wasOut ? runCeremony('leave') : Promise.resolve()).then(function () { dropOverlay(); return runCeremony('return'); }) : Promise.resolve();
        return back.then(function () {
          ensureAttic(); octPlace('door');
          noteBack();   /* 놀이방에 있으면 구석 쪽지 "뚜루가 돌아왔어." (문어가 다락 문으로 막 들어온 때 — 8물결) */
          if (skipFlag) { octPlace('board'); octState(mode, carryX); return; }
          octState(mode, carryX);
          return walkTo('board', mode).then(function () { octState(mode, carryX); });
        });
      case 'hang_poster':
        if (!trip.poster) return Promise.resolve();
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
  function finalPose(trip) {
    ensureAttic(); dropOverlay();
    if (trip.kind === 'empty') { octState(S.octopus.state === 'sleep' ? 'sleep' : 'idle'); return; }
    octPlace('blanket');
    var rx = trip.events ? reactionOf(trip) : null;   /* 복구(resumeRunning) 는 { kind } 만 넘긴다 → 반응 없음 */
    sleepReaction = rx ? (rx.r || rx.raw || null) : null;   /* 소리(D-1): 이 차례의 반응을 잠드는 훅에 (네 가지면 그 말, 아니면 받은 말 그대로, 없으면 null) */
    octState('sleep'); sleepReaction = null; S.octopus.state = 'sleep'; save();
  }
  /* 상태 반영: 등불 · 방문 · 취향 · 기념품 · 함께한 날 (한 번만) */
  function commitTrip(trip) {
    if (trip.status === 'done') return;
    var prevL = applyTrip(trip);
    lastNewPoster = trip.poster ? trip.id : null;
    save(); mine.push({ trip: trip, at: Date.now() });
    renderSouvenirs();
    var live = revealing && revealing.trip === trip && !skipFlag && !reduced();
    if (live) revealing.deferred = { prevL: prevL };   /* 상태는 지금 저장, 보이는 건 로그가 끝난 뒤 순서대로 (startCeremony) */
    else { renderStatus(S.room.lantern > prevL); renderScene(); renderAlbum(); if (trip.poster && revealing && revealing.trip === trip) flyToAlbum(trip); }   /* 건너뛰기: 연출 없이 반영하되 새 포스터는 앨범 아이콘으로 (모션 줄이기면 점만) */
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
  function adoptRemote(raw) {
    var R; try { R = normalize(JSON.parse(raw)); } catch (err) { return false; }
    var T = busy ? flying : null, same = (S.octopus.born || 0) === (R.octopus.born || 0), now = Date.now();
    S = R; lastSaved = raw;
    var redo = !!T && carry(T);
    mine = !same ? [] : mine.filter(function (m) {
      if (now - m.at > MINE_MS) return false;
      if (T && m.trip.id === T.id) return true;
      var theirs = tripById(m.trip.id);
      if (!(theirs && theirs.status === 'done') && carry(m.trip)) redo = true;   /* 그쪽도 반영했으면 그쪽 것 그대로 */
      return true;
    });
    if (redo) save();
    return true;
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
    exprTimer = setTimeout(function () { if (oct.state !== 'sleep') scene.setExpression(STATE_EXPR[oct.state] || 'idle'); }, 4000);
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
    parent.appendChild(row); scrollLog();
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
  /* 한 날의 여행들 → 로그 행 (오늘 칸 · 앨범 일기 공용). 다시 그려도 같은 말 (저장된 여행에서만) */
  function dayRows(list) {
    var rows = [];
    list.forEach(function (t) {
      if (t.by === 'legacy') { var lt = (t.poster && t.poster.title) || ''; rows.push(logRow('포스터', appendAll(document.createDocumentFragment(), [document.createTextNode('옛 기록에서 복원된 포스터 · ')].concat(partRaw(lt, lt, 'player'))), '', false)); return; }   /* 옛 제목은 옛 저장 그대로 */
      if (t.status !== 'done') return;
      (t.events || []).forEach(function (ev) { var r = eventRow(t, ev); if (r) rows.push(r); });
      if (!(t.events || []).length && t.poster) rows.push(logRow('포스터', t.poster.line || '', '', false));
      var sr = summaryRow(t); if (sr) rows.push(sr);
    });
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
    dayRows(tripsOn(today)).forEach(function (r) { sec.appendChild(r); });
    log.appendChild(sec);
    if (!log.querySelector('.lrow')) log.appendChild(h('div', { class: 'lempty', text: S.octopus.name ? "아직 아무 데도 안 갔어. '" + (STR.goButton || '뽈뽈 다녀와') + "'를 눌러 봐." : '문어 이름부터 지어 주자.' }));
    logStick = true; scrollLog();
  }
  /* 날이 바뀌었으면 (자정 · 날짜 훅) 오늘 칸을 새로: 인사 · 어제 메모를 다시 짓고 지난 날은 앨범 일기로. 다녀오는 중엔 기다린다.
     soon = 지금 넘겨도 된다 (새로 초대할 때). 아니면 (1분 틱) 방금 끝난 산책은 2분 동안 그대로 보이게 둔다 → 넘겼으면 true */
  function checkDay(soon) {
    if (busy || !logDay || todayKey() === logDay) return false;
    if (!soon) { var last = null; S.trips.forEach(function (t) { if (t.status === 'done' && (!last || (t.endedAt || 0) > (last.endedAt || 0))) last = t; }); if (last && Date.now() - (last.endedAt || 0) < 120000) return false; }
    setDayGreeting(); renderLog(); renderAlbum();
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
    var asleep = S.octopus.state === 'sleep';
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
    s += '<g clip-path="url(#' + uid + 'c)"><rect x="' + sx + '" y="' + sy + '" width="' + sw + '" height="' + sh + '" fill="url(#' + uid + ')"/>' + sceneShapes(trip.seed, sx, sy, sw, sh);
    var sceneHref = opts.inlineScene || (opts.noExternal ? null : scenePath(p.scene));
    if (sceneHref) s += '<image href="' + esc(sceneHref) + '" x="' + sx + '" y="' + sy + '" width="' + sw + '" height="' + sh + '" preserveAspectRatio="xMidYMid slice"/>';
    if (!opts.mini && p.thumb && p.thumb.url && S.settings.thumbs !== false && !note) {
      var th = opts.inlineThumb || (opts.noExternal ? null : p.thumb.url);
      if (th) s += '<g clip-path="url(#' + uid + 't)"><image href="' + esc(th) + '" x="' + (sx + sw * 0.08) + '" y="' + (sy + sh * 0.12) + '" width="' + (sw * 0.5) + '" height="' + (sh * 0.62) + '" preserveAspectRatio="xMidYMid slice"/></g>';
    }
    s += '</g>';
    if (!opts.mini && p.thumb && p.thumb.url && S.settings.thumbs !== false && !note) s += '<text x="' + (sx + 2) + '" y="' + (sy + sh - 3) + '" font-size="' + (w * 0.028) + '" fill="#fff" opacity=".75" font-family="Noto Sans KR, sans-serif">사진: 위키미디어 공용</text>';
    /* 스티커 하나 = 픽셀 아이콘 (예전 이모지 글자 대신 — 주인 11-07): 외출은 기억한 곳의 코너 그림, 집에 있던 날 쪽지는 집, 복원된 옛 포스터는 포스터 그림.
       주소는 iconSrc (단일 파일 번들 = data URI). 16px 원본을 정수 배(16·32·64…)로, 픽셀 그대로. 자리·기울기는 예전 그대로 (stickerPos).
       밖의 파일을 못 읽는 그림(벽 텍스처 · 날아가는 포스터 · PNG 저장)은 data URI 일 때만 (opts.inlineSticker 로 넘겨받거나 번들) */
    var pos = p.stickerPos || { x: 70, y: 28, rot: 0 };
    var stx = sx + sw * (pos.x / 100), sty = sy + sh * (pos.y / 100), want = w * (note ? 0.18 : 0.2), ss = want >= 12 ? 16 * Math.max(1, Math.round(want / 16)) : want >= 6 ? 8 : want;   /* 정수 배 (작은 벽 텍스처는 8px = 반) */
    var stHref = opts.inlineSticker || stickerSrc(trip);
    if (stHref && !/^data:/.test(stHref) && window.UIART && UIART.iconBad && UIART.iconBad(stHref)) stHref = null;   /* 한 번 안 온 그림은 넣지 않는다 (깨진 그림 표시 대신 스티커 없이) */
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
  var CORNER_WORD = { hands: '손', sea: '바다', sky: '하늘', signs: '기호', numbers: '수', sounds: '소리', home: '집', mind: '생각', wild: '들판' };
  function shareLine(trip) {
    if (trip.kind === 'home') return '뽈뽈 · 오늘은 집';
    var ord = tripOrdinal(trip), stops = (trip.receipt && trip.receipt.stops) || [];
    var words = stops.map(function (s) { return s.nodeId === 'door_out' ? '밖' : CORNER_WORD[s.corner] || '들판'; })
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
        var name = icoH(cornerIcon(s.corner, s.nodeId === 'door_out' ? 'url' : null), 'ua-mem') + rawH(s.name || s.title || '', stopRawBy(trip, s.nodeId, null));
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
  var WIKI_SRC = /^https:\/\/ko\.wikipedia\.org\//;
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
      out += '<div class="row"><span class="n">' + (i + 1) + '</span><span>' + iwH(icoH(cornerIcon(s.corner, s.nodeId === 'door_out' ? 'url' : null), 'ua-mem'), rawH(s.name || s.title || '', stopRawBy(trip, s.nodeId, null)), true) +
        ' <span class="st' + (sti ? ' ua-st' : '') + '">' + iwH(sti, esc(STATUS_LABEL[st] || st) + (s.ms ? '\u00a0·\u00a0' + secs(s.ms) : '')) + '</span>' + (s.first ? ' <span class="first-tag">처음 온 곳</span>' : '');   /* 처음 온 곳은 점 없이 따로 — 줄이 바뀌어도 '·' 가 줄 끝·줄 앞에 홀로 남지 않게 */
      if (s.bridge) out += '<span class="bridge">' + esc(s.bridge) + '</span>';
      /* 모델·사람이 쓴 메모(noteBy)는 따옴표 없이, 누가 썼는지 붙여서 — 따옴표는 위키백과 요약에만 (모델 말이 인용문처럼 보이지 않게, MODEL_VOICE) */
      var wikiSrc = st === 'read' && s.source && WIKI_SRC.test(s.source.url || '');
      if (s.note && s.noteBy) out += '<span class="note">' + rawH(s.note, s.noteBy === 'model' ? 'model' : 'human') + ' <span class="dim">· ' + (s.noteBy === 'model' ? '모델' : '사람') + '이 쓴 메모</span></span>';
      else if (s.note) out += '<span class="note">' + (st === 'read' ? '“' + rawH(s.note, 'wiki') + '”' : esc(s.note)) + '</span>';   /* 위키백과 요약 그대로 */
      if (s.noteBy && wikiSrc && s.source.extract) out += '<span class="note">“' + rawH(s.source.extract, 'wiki') + '”</span>';
      if (wikiSrc) out += '<a href="' + esc(s.source.url) + '" target="_blank" rel="noopener">출처: ' + esc(s.source.attribution || 'Wikipedia (ko)') + ' · <span class="ua-iw">' + esc(s.source.license || 'CC BY-SA') + '</span></a>';   /* 예전 ↗ 는 뺐다 — 링크는 새 창. 출처 이름 · 라이선스는 두뇌의 상수(우리 글)라 data-raw 를 달지 않는다 (지킴이가 본다) */
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
    if (!trips.length) { al.appendChild(h('div', { class: 'lempty', text: albumFilter === 'note' ? '아직 쪽지는 없어. 집에 있는 날 하나 써 둘게.' : '아직 붙인 포스터가 없어. 뽈뽈 다녀와를 눌러 봐.' })); return; }
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
  function diaryDays() {
    var today = todayKey(), byDay = {};
    S.trips.forEach(function (t) { if (t.date === today || !(t.status === 'done' || t.by === 'legacy')) return; (byDay[t.date] = byDay[t.date] || []).push(t); });
    return { byDay: byDay, days: Object.keys(byDay).sort().reverse() };
  }
  function hasDiary() { var today = todayKey(); return S.trips.some(function (t) { return t.date !== today && (t.status === 'done' || t.by === 'legacy'); }); }
  function renderDiary() {
    var box = $('album-diary'); if (!box) return;
    box.innerHTML = ''; box.hidden = albumFilter !== 'diary';
    if (box.hidden) return;
    var D = diaryDays(), yest = keyAdd(todayKey(), -1);
    if (!D.days.length) { box.appendChild(h('div', { class: 'lempty', text: '아직 지난 날이 없어' })); return; }
    D.days.forEach(function (d, i) {
      var det = h('details', { class: 'dday', 'data-day': d }, [h('summary', { text: (d === yest ? '어제' : fmtDate(d)) + ' · ' + D.byDay[d].length + '건' })]), filled = false;
      function fill() { if (filled) return; filled = true; var body = h('div', { class: 'dday-rows' }); dayRows(D.byDay[d]).forEach(function (r) { body.appendChild(r); }); det.appendChild(body); }
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
  function renderAll() { renderStatus(false); renderScene(); renderSouvenirs(); renderWall(); renderAlbum(); renderLog(); }

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
    fl.classList.toggle('flip', on);
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
    ['poster-dialog', 'settings-sheet', 'album-sheet', 'name-dialog'].forEach(function (id) {
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
    }, true);
    /* 토스트를 app 의 toast() 를 거치지 않고 띄우는 곳(js/audio.js 의 소리 안내)도: 지금 열린 대화상자(없으면 body)가 아닌 곳에 있으면 옮긴다 */
    var t = $('toast');
    if (t && window.MutationObserver) {
      var lift = function () { if (t.classList.contains('show') && t.parentNode !== (openDialog() || document.body)) raiseToast(t); };
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
  /* ⚙ 설정 시트 (주인 11-07: 방 보기를 없애고 고르는 것만 여기로). 위에서부터 문어 색 · 내 모습(renderPlayerParts) · 소리(js/audio.js 가 room_sheet 훅으로 붙인다) · 모션 · 픽셀 글꼴 · 포스터 썸네일 ·
     기록(작은 한 줄 + 내보내기 · 불러오기 · 전체 초기화 2단계) · 누가 고르나(한 줄) · 팔레트(개발 모드만). 글은 짧게 — 사람들은 읽는 걸 싫어한다 */
  var COLOR_PRESETS = [['빨강', '#e8463c'], ['주황', '#f08a3c'], ['보라', '#9a5cc8'], ['파랑', '#4a86d8'], ['초록', '#4fa868'], ['분홍', '#f07aa8']];
  /* 누가 고르나 (정직 표기): 앞 문장은 '데모' 말풍선과 같은 말. '고른 이:' 줄은 포스터·쪽지를 뒤집은 면(일기)에만 있다 — 앨범의 '일기' 탭(지난 날 로그)과 헷갈리지 않게 자리를 말한다 */
  var WHO_LINE = '지금은 모델이 아니라 미리 만든 규칙이 골라. 고른 이는 포스터와 쪽지 뒷면에 적혀.';
  function statsLine() {
    var reads = S.trips.reduce(function (n, t) { return n + ((t.receipt && t.receipt.counts && t.receipt.counts.read) | 0); }, 0);
    return '산책 ' + S.octopus.trips + ' · 함께한 날 ' + S.octopus.days.length + ' · 읽음 ' + reads;
  }
  function renderSettings() {
    var body = $('set-body'); if (!body) return;
    var frag = document.createDocumentFragment();
    frag.appendChild(h('h3', { text: '문어 색' }));
    var hueIn = h('input', { type: 'range', id: 'set-hue', min: '0', max: '360', step: '1', 'aria-label': '문어 색상' });
    hueIn.value = String(hexHue(S.settings.octColor));
    hueIn.addEventListener('input', function () { setOctColor(hslHex(+hueIn.value, 0.76, 0.57)); swatchOn(); });
    var sw = h('div', { class: 'presets', role: 'group', 'aria-label': '색 프리셋' });
    COLOR_PRESETS.forEach(function (p) {
      var b = h('button', { type: 'button', class: 'preset', 'data-hex': p[1], title: p[0], 'aria-label': p[0] });
      b.style.background = p[1];
      b.addEventListener('click', function () { setOctColor(p[1]); hueIn.value = String(hexHue(p[1])); swatchOn(); });
      sw.appendChild(b);
    });
    function swatchOn() { sw.querySelectorAll('.preset').forEach(function (b) { chipOn(b, b.dataset.hex === S.settings.octColor); }); }
    swatchOn();
    frag.appendChild(h('div', { class: 'set hue-row' }, [hueIn]));
    frag.appendChild(sw);
    renderPlayerParts(frag);   /* 내 모습 — 문어 색 바로 아래 */
    if (window.AUDIO) AUDIO.on('room_sheet', { frag: frag });   /* 소리: 음악·효과음 크기 (js/audio.js — 훅 이름은 예전 그대로) */
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
    body.innerHTML = ''; body.appendChild(frag);
  }
  /* 설정 › 내 모습 (옷방이 생기기 전까지의 자리 — docs/PLAYER_PARTS.md §3 · PLAYER_PROGRESSION 11-08): 줄 순서 머리 · 머리 색 · 눈 · 눈 색 · 옷 · 신발 · 악세사리.
     색은 .preset 동그라미(aria-label 이름), 나머지는 .fchip 글자 칩 (aria-pressed). 누르면 setPlayerPart → 그 줄 칩 · 미리보기 갱신.
     미리보기: 3D 장면이 playerPortrait 를 주면 64×64 캔버스를 96px 로(pixelated) 제목 옆에. 2D 면 한 줄 안내만 (칩은 저장된다). 글자·칩에 이모지·기호 없음 */
  function renderPlayerParts(frag) {
    var P = playerParts(), cfg = S.settings.player, head = h('div', { class: 'set-parts-h' }, [h('h3', { text: '내 모습' })]);
    var port = null;
    if (sceneMode === '3d' && scene && typeof scene.playerPortrait === 'function') { port = h('canvas', { class: 'pl-port', id: 'set-pl-port', width: '64', height: '64', role: 'img', 'aria-label': '내 모습 미리보기' }); head.appendChild(port); }
    frag.appendChild(head);
    if (sceneMode !== '3d') frag.appendChild(h('p', { class: 'help set-parts-note', id: 'set-parts-note', text: '2D 장면에서는 미리보기가 없어. 고른 건 저장돼.' }));
    var wrap = h('div', { class: 'set-parts', id: 'set-parts' }), note = h('p', { class: 'help set-eye-note', id: 'set-eye-note' });
    function drawPort() {   /* 장면 초상은 캐시라 첫 장만 느리다 (≈ 문어 portrait). 못 그리면 캔버스를 치운다 (빈 네모를 두지 않는다) */
      if (!port) return;
      requestAnimationFrame(function () {
        if (!port) return;
        try { var src = scene.playerPortrait({ bg: PORT.bg }), cx = port.getContext('2d'); cx.clearRect(0, 0, 64, 64); if (src) cx.drawImage(src, 0, 0); else throw new Error('빈 초상'); }
        catch (e) { console.warn('[app] playerPortrait', e); if (port.parentNode) port.remove(); port = null; }
      });
    }
    function eyeNote() { note.textContent = (cfg.eyes === 'smile' || cfg.eyes === 'dot') ? '이 눈 모양은 눈 색이 안 보여' : '눈 색은 크게 봐야 잘 보여'; }
    PLAYER_CATS.forEach(function (c) {
      var cat = c[0], isColor = cat === 'hairColor' || cat === 'eyeColor';
      var chips = h('div', { class: 'set-chips' + (isColor ? ' colors' : ''), role: 'group', 'aria-label': c[1] });
      P[cat].forEach(function (x) {
        var b;
        if (isColor) { b = h('button', { type: 'button', class: 'preset pl-color', 'data-part': cat, 'data-id': x.id, 'data-hex': x.hex || null, title: x.name, 'aria-label': x.name }); b.style.background = x.hex || 'var(--panel2)'; }
        else b = h('button', { type: 'button', class: 'fchip', 'data-part': cat, 'data-id': x.id, text: x.name });
        chipOn(b, cfg[cat] === x.id);
        b.addEventListener('click', function () {
          if (!setPlayerPart(cat, x.id)) return;
          cfg = S.settings.player;
          chips.querySelectorAll('[data-id]').forEach(function (q) { chipOn(q, q.dataset.id === cfg[cat]); });
          if (cat === 'eyes') eyeNote();
          drawPort();
        });
        chips.appendChild(b);
      });
      wrap.appendChild(h('div', { class: 'set-part', 'data-part': cat }, [h('span', { class: 'set-part-lbl', text: c[1] }), chips]));
      if (cat === 'eyeColor') wrap.appendChild(note);
    });
    eyeNote();
    frag.appendChild(wrap);
    drawPort();
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
  function openNameDialog() { showDialog($('name-dialog')); setTimeout(function () { $('name-in').focus(); }, 50); }
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
  function importJSON(text) {
    if (busy) { toast('다녀오는 중이라 지금은 못 불러와. 끝나고 다시 해 줘'); return false; }
    var prev = { S: S, g: greetingRow, m: memoRow };
    try {
      var obj = typeof text === 'string' ? JSON.parse(text) : text;
      if (!isObj(obj) || obj.v !== 2 || !isObj(obj.octopus)) throw new Error('format');
      S = normalize(obj); if (S.octopus.state === 'sleep' && napOver()) S.octopus.state = 'idle';   /* 부팅과 같은 낮잠 규칙 */
      setDayGreeting(); renderAll();
    } catch (e) {
      S = prev.S; greetingRow = prev.g; memoRow = prev.m;
      try { renderAll(); } catch (e2) { /* 원래 기록은 저장된 그대로 */ }
      toast('이 파일은 뽈뽈 기록이 아닌 것 같아'); return false;
    }
    mine = [];   /* 바꾼 기록에 예전 여행을 다시 얹지 않게 */
    save(); applyMotion(); applyFont(); octInitial();
    var d = $('settings-sheet'); if (d && d.open) d.close();
    toast('기록을 불러왔어'); return true;
  }
  function resetAll() {
    if (busy) { toast('다녀오는 중이라 지금은 못 지워. 끝나고 다시 해 줘'); return false; }
    store.remove(KEY);
    S = defaults(); mine = []; save(); setDayGreeting(); renderAll(); octInitial();
    var d = $('settings-sheet'); if (d && d.open) d.close();
    openNameDialog();
  }

  /* ───────────────────────── rooms: 문어 방 ↔ 놀이방 (8물결 · 카드 18) ───────────────────────── */
  /* 주인 11-07: "방 클릭하면 캐릭터가 그 방문 앞으로 가면 끼익 열리면서 다른 방으로 넘어가는 류". 세 방 = 왼쪽 옷방(나중) · 가운데 문어 방(다락) · 오른쪽 놀이방.
     다락 오른쪽 바닥 끝에 선 진짜 문(#btn-door — 장면이 3D 문 위에 투명 단추로 맞춘다, aria-label '놀이방') → goRoom('play') → 문이 끼익 열림 → 가로 0.6 s → 놀이방.
     놀이방: 왼쪽 벽 문(#btn-play-door '문어 방') → goRoom('attic') · 뒷벽 오락기(#btn-machine '다락방 달리기') → RUNNER.open (닫으면 오락기로 포커스 · 놀이방 그대로).
     화살표 · 밀어서 넘기기 · 문 앞 질문은 없다. 문어는 놀이방에 오지 않는다 (문어의 방은 다락). 놀이방에서 하는 일은 산책 · 두뇌 · 저장(S)에 닿지 않는다 (0 바이트).
     산책 중(바깥이 보이는 동안)엔 #btn-door 가 장면 오른쪽 아래 픽셀 문 단추(data-spot="edge")라 기다리는 동안 놀이방에 갈 수 있다. 산책은 놀이방에서도 그대로 흐르고(로그 행이 쌓인다),
     장면은 놀이방에 있는 동안 의식이 장소를 바꿔도 화면을 끌고 가지 않는다 (scene3d setPlaceNow). 문어가 돌아오면 구석 쪽지 "뚜루가 돌아왔어." + 보러 가기.
     큰 버튼(뽈뽈 다녀와 · 다녀오는 중…)은 문어 방의 일 → 놀이방이면 먼저 문으로 돌아와서 한다. 새로고침은 늘 문어 방 (지금 방은 저장하지 않는다).
     내 캐릭터 (SCENE.md '내 캐릭터'): walkFirst — 장면의 playerWalkTo(문 앞 앵커 atticPlayDoor · playAtticDoor)가 문 앞까지 걸어가서 풀리면 그때 문이 열린다 (2D 폴백엔 캐릭터가 없어 바로 풀린다) */
  var ROOM_SPOT = { atticPlay: 'btn-door', playAttic: 'btn-play-door', machine: 'btn-machine' };
  var ROOM_BACK = { play: 'btn-play-door', attic: 'btn-door' };   /* 도착한 방에서 포커스를 받을 단추 (들어온 문의 맞은편) */
  var roomJob = null;   /* 지금 도는 문 작업 (Promise) — 끝날 때까지 두 번째 문은 열지 않는다 */
  function sceneView() { return scene && typeof scene.view === 'function' ? scene.view() : (scene && typeof scene.place === 'function' ? scene.place() : 'attic'); }
  function inPlay() { return !!scene && typeof scene.room === 'function' && scene.room() === 'play'; }
  function introUp() { return !!(window.INTRO && ['sky', 'title'].indexOf(INTRO.phase) >= 0); }
  function bindSpots() {
    var map = {};
    Object.keys(ROOM_SPOT).forEach(function (k) { var el = $(ROOM_SPOT[k]); if (el) map[k] = el; });
    if (scene && typeof scene.hotspots === 'function') scene.hotspots(map);
    syncRoomUI();
  }
  /* 보이는 장소 → #scene[data-view] (css: 놀이방이면 문어 머리 위 것 · 2D 다락 그림을 숨긴다) · 장면 이름(aria-label) · 장면 설명. 놀이방을 벗어나면 쪽지는 걷는다 */
  function syncRoomUI(v) {
    v = v || sceneView();
    var sc = $('scene'); if (!sc) return;
    if (sc.getAttribute('data-view') !== v) sc.setAttribute('data-view', v);
    var lbl = v === 'play' ? '놀이방' : '문어의 다락방';
    if (sc.getAttribute('aria-label') !== lbl) sc.setAttribute('aria-label', lbl);
    if (v !== 'play') hideBackNote();
    updateSceneDesc();
  }
  function resetRoomUI() {   /* 장면을 바꿀 때 (sceneLost): 단추는 새 장면이 다시 맡는다 · 그 전까지 놀이방 단추는 숨김 */
    roomJob = null; hideBackNote();
    ['btn-play-door', 'btn-machine'].forEach(function (id) { var b = $(id); if (b) b.hidden = true; });
    var d = $('btn-door'); if (d) { d.hidden = false; d.removeAttribute('data-spot'); ['left', 'top', 'width', 'height', 'right', 'bottom'].forEach(function (k) { d.style[k] = ''; }); }
    var sc = $('scene'); if (sc) { sc.setAttribute('data-view', 'attic'); sc.setAttribute('aria-label', '문어의 다락방'); }
  }
  function goRoom(name, opener, kbd) {   /* → Promise<{ ok, reason?, view, room, place }> (예전 7물결엔 bool). kbd = 키보드 · 화면 낭독기로 눌렀다 (도착한 쪽 단추에 포커스 링) */
    var to = name === 'play' ? 'play' : name === 'attic' || name === 'back' ? 'attic' : null;
    function no(why) { return Promise.resolve({ ok: false, reason: why, view: sceneView(), room: inPlay() ? 'play' : null }); }
    if (!to) return no('unknown');
    if (!scene || typeof scene.goRoom !== 'function') return no('scene');
    if (introUp()) return no('intro');
    if (roomJob) return no('busy');
    var ae = document.activeElement, keep = !ae || ae === document.body || ae === opener || isRoomButton(ae);
    hideTip();
    if (to === 'attic') hideBackNote();
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
    clearTimeout(noteTimer); t.textContent = ''; n.hidden = false;
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
    on('btn-back-see', function (b, k) { goRoom('attic', b, k); });
    document.addEventListener('keydown', function () { var r = document.querySelectorAll('.ring-off'); for (var i = 0; i < r.length; i++) r[i].classList.remove('ring-off'); }, true);   /* 키를 누르면 링은 다시 (키보드로 이어 가는 사람) */
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
    var left = Math.round(clamp(cx - w / 2, 16, Math.max(16, hr.width - 16 - w)));   /* 상태 줄 바깥 상자 기준 (테두리 포함) */
    t.style.left = (left - host.clientLeft) + 'px'; t.style.setProperty('--tip-x', Math.round(clamp(cx - left, 10, Math.max(10, w - 10))) + 'px');   /* left 는 테두리 안쪽(패딩 상자) 기준이라 테두리 폭만큼 뺀다 */
    t.classList.add('show'); anchor.setAttribute('aria-expanded', 'true');
    tipTimer = setTimeout(hideTip, TIP_MS);   /* 읽는 시간이라 --speed(개발용 느리게)와 상관없이 2.5 s */
  }
  /* 닫을 때 자리도 비운다: 가로 화면에서 정한 left 가 남으면 세로로 돌렸을 때 빈 말풍선이 화면 밖으로 나가 옆으로 밀린다 */
  function hideTip() {
    clearTimeout(tipTimer);
    var t = $('tip'); if (t) { t.classList.remove('show'); t.textContent = ''; t.style.left = ''; t.style.removeProperty('--tip-x'); }
    if (tipFor) tipFor.setAttribute('aria-expanded', 'false');
    tipFor = null;
  }
  /* 폰에서(상태 줄이 방 제목을 숨기는 폭) 등불 말풍선 첫 줄 = 방 제목. 넓은 화면은 상태 줄에 이미 보이니 빼고 한 줄만 */
  function hiddenRoomTitle() { var rt = $('room-title'); return rt && rt.textContent && getComputedStyle(rt).display === 'none' ? rt.textContent : ''; }
  function bindTip() {
    $('pips').addEventListener('click', function (e) { tip(e.currentTarget, LANTERN_TIP, hiddenRoomTitle()); });
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
      wakeUp(); demo.t0 = Date.now(); demo.hint = ($('hint-in').value || '').trim(); demo.events = [{ type: 'depart', t: 0, hint: demo.hint, followHint: !!demo.hint }];
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
    wakeUp(); setBusy(true); skipFlag = false; flying = trip; renderBrainTag(); demoSet('start');
    reveal(trip).then(function () { setBusy(false); demoSet('start'); demoMsg('재생 끝 (고른 이: 모델(MCP))'); });
    return true;
  }

  /* ───────────────────────── boot ───────────────────────── */
  function updateHintHelp() {
    var inp = $('hint-in'), help = $('hint-help'); if (!inp || !help) return;
    var v = (inp.value || '').trim();
    help.textContent = /^https?:\/\//i.test(v) ? 'URL은 문 앞까지만 가 볼 수 있어(모의 방문)' : v ? '힌트는 넌지시 흘리는 거야. 따라갈지는 문어가 정해' : (STR.emptyHintHelp || '비워 두면 힌트 없이 나가');
  }
  function bind() {
    /* 힌트 칸: 개발 모드에서만 (index.html 에선 hidden 으로 시작 → 플레이어에겐 자리도 깜빡임도 없다). 결정 18 */
    var hintBox = $('hint-box'); if (hintBox) hintBox.hidden = !DEV;
    $('btn-go').addEventListener('click', goTap);
    $('hint-in').addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); invite(); } });
    $('hint-in').addEventListener('input', updateHintHelp);
    $('hint-in').addEventListener('focus', function () { var r = $('hint-in').getBoundingClientRect(); scene.lookAt(r.left + r.width / 2, r.top); });
    $('hint-in').addEventListener('blur', function () { scene.lookAt(window.innerWidth / 2, window.innerHeight / 2); });
    $('btn-settings').addEventListener('click', openSettings);
    $('set-close').addEventListener('click', function () { $('settings-sheet').close(); });
    bindRooms();   /* 방 문 · 오락기 · 구석 쪽지 (8물결) */
    bindTip();   /* '데모' · 등불 → 작은 말풍선 */
    $('pd-flip').addEventListener('click', flipPoster);
    $('pd-front').addEventListener('click', flipPoster);
    $('pd-close').addEventListener('click', function () { $('poster-dialog').close(); });
    $('pd-save').addEventListener('click', function () { savePNG(); });
    $('pd-copy').addEventListener('click', function () { var t = tripById(openTripId); if (t) copyText(shareLine(t)); });
    $('poster-dialog').addEventListener('click', function (e) { if (clickedOutside(e.currentTarget, e)) e.currentTarget.close(); });
    $('pd-back').addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('.copy[data-share]'); if (b) { e.stopPropagation(); copyText(b.getAttribute('data-share')); } });
    $('settings-sheet').addEventListener('click', function (e) { if (clickedOutside(e.currentTarget, e)) e.currentTarget.close(); });
    $('btn-album').addEventListener('click', openAlbum);
    $('al-close').addEventListener('click', function () { $('album-sheet').close(); });
    $('album-sheet').addEventListener('click', function (e) { if (clickedOutside(e.currentTarget, e)) e.currentTarget.close(); });
    $('album-sheet').addEventListener('close', markAlbumSeen);   /* 열어 둔 사이에 붙은 포스터도 본 것으로 */
    bindDialogs(); watchLogScroll(); bindAlbumPress(); bindSheetDrag('settings-sheet'); bindSheetDrag('album-sheet');
    document.addEventListener('touchstart', function () { /* 빈 리스너: iOS Safari 는 터치 리스너가 있어야 :active(눌림) 모양을 그린다 */ }, { passive: true });
    /* 데모 <details>: 개발 모드에서만 보인다 (index.html 에선 hidden 으로 시작). 접힌 채 시작, 뷰어별로 펼침 기억 (UI R2) */
    var demoEl = $('demo');
    if (demoEl) {
      demoEl.hidden = !DEV;
      if (DEV) { if (uiPref().demoOpen) demoEl.open = true; demoEl.addEventListener('toggle', function () { setUiPref('demoOpen', demoEl.open); }); }
    }
    /* 탭을 떠날 때 저장 · 다른 탭이 저장하면 다시 그린다 (R4, R5) */
    document.addEventListener('visibilitychange', function () { if (document.hidden && S.octopus.name) save(); else if (!document.hidden) checkDay(); });
    window.addEventListener('storage', function (e) {
      if (e.key !== KEY || !e.newValue || e.newValue === lastSaved) return;
      if (!adoptRemote(e.newValue)) return;
      if (busy) { remoteDirty = true; return; }   /* 공개 중엔 로그·등불을 다시 그리지 않는다 → 끝날 때 한 번 (setBusy) */
      renderAll(); applyMotion(); applyFont();
    });
    $('name-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = ($('name-in').value || '').trim(); if (!v) { $('name-in').focus(); return; }
      var first = !S.octopus.name;
      S.octopus.name = v; if (!S.octopus.born) S.octopus.born = Date.now(); save();
      $('name-dialog').close(); renderStatus(false); renderScene();
      if (first) {
        checkDay(true);   /* 앱을 연 채로 자정을 넘겨 이름을 지었으면 먼저 새 날로 넘긴다 (아래 renderLog 가 넘기며 자기소개를 날 인사로 덮지 않게) */
        setGreeting(typeof STR.firstGreeting === 'function' ? STR.firstGreeting(v) : '안녕, 나는 ' + v + '야. 비 오는 다락방에 온 걸 환영해.', 'happy');   /* 문어의 자기소개 (웃는 얼굴) */
        renderLog();
        if (DEV) toast(STR.firstToast || '힌트는 비워 둬도 돼.');   /* 힌트 칸이 있는 개발 모드에서만. 플레이어에겐 힌트 얘기 없음 (결정 18, DIALOGUE_UI: 첫 토스트 지움) */
      }
    });
    $('name-dialog').addEventListener('cancel', function (e) { if (!S.octopus.name) e.preventDefault(); });
    document.querySelectorAll('.fchip[data-f]').forEach(function (b) { b.addEventListener('click', function () { albumFilter = b.dataset.f; document.querySelectorAll('.fchip[data-f]').forEach(function (x) { chipOn(x, x === b); }); renderAlbum(); }); });
    /* 문어·창문·포스터·기념품 입력은 scene 이 받아 on.* 콜백으로 준다 (§13.1) */
    if (DEV) bindLook();   /* 룩 슬라이더는 개발 모드의 데모 패널 안에만 */
    if (window.matchMedia) { var mq = window.matchMedia('(prefers-reduced-motion: reduce)'); if (mq.addEventListener) mq.addEventListener('change', applyMotion); }
    bindDemo();
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
  function boot() {
    var q = new URLSearchParams(location.search), slow = parseFloat(q.get('slow'));
    fillAssetImgs();
    if (slow > 0) document.documentElement.style.setProperty('--speed', String(slow));
    load(); var hk = lookHook(); if (hk && hk.lantern != null) S.room.lantern = clamp(hk.lantern | 0, 0, 8);
    if (S.octopus.state === 'sleep' && napOver()) S.octopus.state = 'idle';   /* 낮잠이 끝났으면(20분 · 날짜가 바뀜) 깬 채로 연다 → 인사 '기다리고 있었어', 창가에서 */
    applyMotion(); applyFont(); initScene(); applyMotion();
    if (typeof scene.setPlace === 'function') scene.setPlace('attic', { instant: true });   /* 늘 다락에서 연다 (running 여행이 남아 있어도 — resumeRunning) */
    renderStatus(false); renderScene(); renderSouvenirs(); renderWall(); renderAlbum();
    bind();
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
    resumeRunning().then(function (kind) { if (kind) finalPose({ kind: kind }); });   /* 빈 차례뿐이면 재우지 않는다 (commitTrip 과 같은 규칙) */
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  /* ───────────────────────── 공개 (§12.3) ───────────────────────── */
  return {
    get state() { return S; },
    save: save, load: load, invite: invite, skip: skip, reveal: reveal,
    renderAll: renderAll, renderStatus: renderStatus, renderScene: renderScene, renderLog: renderLog, renderWall: renderWall, renderAlbum: renderAlbum, renderSouvenirs: renderSouvenirs,
    posterSVG: posterSVG, receiptHTML: receiptHTML, inspectHTML: inspectHTML, openPoster: openPoster, openSettings: openSettings, openAlbum: openAlbum, goRoom: goRoom,
    importEvents: importEvents, exportJSON: exportJSON, importJSON: importJSON,
    oct: oct, walkTo: walkTo, octState: octState, anchors: ANCHORS, placeholders: PH, commitTrip: commitTrip,
    get scene() { return scene; }, get sceneMode() { return sceneMode; }, setOctColor: setOctColor, setPlayerPart: setPlayerPart, playerParts: playerParts, setPalette: setPalette, weatherFor: weatherFor, itemsFor: itemsFor,
    portraitFor: portraitFor, say: say, get portraitCache() { return Object.keys(PORT.cache); },
    setSeason: setSeasonPref, get ceremony() { return cer.kind; },
    get room() { return inPlay() ? 'play' : null; }, openMachine: openMachine   /* 8물결: 놀이방에 있는가 · 오락기 (테스트·도구) */
  };
})();
