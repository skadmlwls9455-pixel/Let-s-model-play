/* tools/stubs.js — 최소 WORLD + BRAIN 스텁 (§12 계약). 실제 js/world.js, js/brain.js 가 없을 때
   UI(app.js)를 먼저 돌려 보기 위한 것. 결정은 전부 PRNG(mulberry32), 노드 8개, hat→feather 다리.
   브라우저(page.addInitScript)와 node 양쪽에서 로드된다. */
(function (root) {
  'use strict';
  function mk(n) {
    return Object.assign({ odd: false, linger: false, souvenir: null, aliases: [], keywords: [], related: [], tangents: [], wiki: n.name, sticker: n.id, scene: n.corner, memories: [n.name + ' 기억 하나', n.name + ' 기억 둘'], clue: n.name + '에 대한 책장 메모 한 줄.' }, n);
  }
  var nodes = {};
  [
    mk({ id: 'hat', name: '모자', corner: 'hands', emoji: '🎩', aliases: ['햇', '중절모'], keywords: ['챙'], related: ['button'], tangents: [{ to: 'feather', bridge: '모자 장식에 꽂힌 깃털에서' }], souvenir: 'button' }),
    mk({ id: 'feather', name: '깃털', corner: 'sky', emoji: '🪶', aliases: ['깃'], related: ['cloud_names'], tangents: [{ to: 'ink', bridge: '깃펜 끝에 묻은 잉크를 따라가다가' }], souvenir: 'feather' }),
    mk({ id: 'button', name: '단추', corner: 'hands', emoji: '🔘', related: ['hat'], tangents: [{ to: 'shell', bridge: '옛 단추가 조개껍데기로 만들어졌다는 걸 보고' }] }),
    mk({ id: 'shell', name: '조개', corner: 'sea', emoji: '🐚', related: ['octopus_nerves'], tangents: [{ to: 'button', bridge: '조개껍데기 단추를 떠올리며' }], souvenir: 'shell' }),
    mk({ id: 'octopus_nerves', name: '문어 신경계', corner: 'sea', emoji: '🐙', odd: true, related: ['shell'], tangents: [{ to: 'ink', bridge: '먹물 이야기에서' }] }),
    mk({ id: 'ink', name: '잉크', corner: 'signs', emoji: '🖋', related: ['feather'], tangents: [{ to: 'cloud_names', bridge: '잉크 번짐이 구름 같아서' }] }),
    mk({ id: 'cloud_names', name: '구름 이름', corner: 'sky', emoji: '☁', odd: true, related: ['feather'], tangents: [{ to: 'slow_room', bridge: '구름을 보다가 아무것도 안 하고 싶어져서' }] }),
    mk({ id: 'slow_room', name: '느린 글의 방', corner: 'mind', emoji: '📖', linger: true, wiki: null, related: [], tangents: [{ to: 'hat', bridge: '문을 나서며 모자를 집어 들고' }] }),
    mk({ id: 'letter_room', name: '편지의 방', corner: 'home', emoji: '✉', wiki: null, tangents: [{ to: 'hat', bridge: '빈 방을 나와' }] }),
    mk({ id: 'door_out', name: '밖의 문', corner: 'wild', emoji: '🚪', wiki: null, tangents: [{ to: 'hat', bridge: '문 앞에서 돌아와' }] })
  ].forEach(function (n) { nodes[n.id] = n; });

  var WORLD = {
    version: 'stub',
    corners: { hands: { name: '손과 물건', emoji: '🧵', phrase: '손 쪽' }, sea: { name: '바다와 생물', emoji: '🐚', phrase: '바다 쪽' }, sky: { name: '하늘과 날씨', emoji: '🌧', phrase: '하늘 쪽' }, signs: { name: '기호와 언어', emoji: '✒', phrase: '기호 쪽' }, mind: { name: '생각하는 것', emoji: '💭', phrase: '생각 쪽' }, home: { name: '집과 사람', emoji: '🏠', phrase: '집 쪽' }, wild: { name: '들판', emoji: '❔', phrase: '들판 쪽' } },
    nodes: nodes,
    souvenirs: { feather: { name: '깃털', emoji: '🪶', asset: 'souvenir.feather' }, shell: { name: '조개', emoji: '🐚', asset: 'souvenir.shell' }, button: { name: '단추', emoji: '🔘', asset: 'souvenir.button' } },
    homeActivities: [
      { id: 'count_rain', line: '창가에서 빗방울을 세다가 잠들었어', detail: '열일곱까지 셌어.', anchor: 'window', weight: 3 },
      { id: 'nap', line: '담요 속에서 낮잠 잤어', detail: '빗소리가 좋았어.', anchor: 'blanket', weight: 3 },
      { id: 'nothing', line: '…', detail: '', anchor: 'blanket', weight: 0 }
    ],
    reactions: { '폴짝': { emoji: '🎉', lines: ['처음 가 본 데가 있었어'] }, '우쭐': { emoji: '😌', lines: ['끝까지 다 읽었어'] }, '덤덤': { emoji: '😶', lines: ['별일 없는 산책이었어'] }, '졸림': { emoji: '😴', lines: ['많이 걸었어'] } },
    lineTemplates: { followedThenLeft: ['{hint} 보러 갔다가 {mem}에 한눈팔았어'], followedKept: ['{hint}, 끝까지 봤어. {memory}'], noHint: ['오늘은 {mem}. {memory}'], ignored: ['{hint}는 다음에. 오늘은 {mem}가 먼저였어'], linger: ['느린 글의 방에 앉아만 있었어. 읽은 건 없어'] },   /* 11-14: world.js 처럼 데모 줄은 사실만 (주인 O1 b) */
    roomLevels: [
      { lantern: 0, text: '아무것도 없는 다락방. 창문 너머로 빗소리.', item: null }, { lantern: 1, text: '창가에 이끼 화분이 하나 생겼다.', item: 'moss' },
      { lantern: 2, text: '낡은 나무 상자가 책상 대신 놓였다.', item: 'crate' }, { lantern: 3, text: '구석에 양초가 켜졌다. 그림자가 흔들린다.', item: 'candle' },
      { lantern: 4, text: '담요 한 장. 방이 조금 따뜻해졌다.', item: 'blanket' }, { lantern: 5, text: '벽에 포스터들이 붙기 시작했다.', item: 'board' },
      { lantern: 6, text: '비가 잦아들었다. 창밖이 조용하다.', item: null, window: 'drizzle' }, { lantern: 7, text: '창문에 별이 보인다. 많이 밝아졌어.', item: 'shelf', window: 'stars' },
      { lantern: 8, text: '완전히 꾸며진 다락방. 문어의 집.', item: 'curtain' }
    ],
    stickers: { hat: { emoji: '🎩' }, feather: { emoji: '🪶' }, wild: { emoji: '❔' } },
    scenes: ['hands', 'sea', 'sky', 'signs', 'mind', 'home', 'wild'],
    strings: { returnReasons: { enough: '이만 걷기로 했어', tired: '다리가 좀 무거워', linger: '여기서 오래 있었어' } }
  };

  /* ───────── BRAIN ───────── */
  function hashSeed() {
    var s = Array.prototype.slice.call(arguments).join('|'), x = 2166136261;
    for (var i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); }
    return x >>> 0;
  }
  function rng(seed) { var a = seed >>> 0; return function () { a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var PART = /(의|을|를|이|가|은|는|도|에|로|와|과)$/;
  function matchHint(hint) {
    var raw = String(hint || '').trim();
    if (!raw) return { kind: 'none' };
    if (/^https?:\/\//i.test(raw)) return { kind: 'url', url: raw };
    var toks = raw.split(/\s+/).map(function (t) { return t.replace(PART, ''); }).filter(function (t) { return t.length >= 2; });
    var ids = Object.keys(nodes);
    for (var i = 0; i < ids.length; i++) { var n = nodes[ids[i]]; if (n.name === raw) return { kind: 'node', nodeId: n.id, how: 'exact' }; }
    for (var j = 0; j < ids.length; j++) { var m = nodes[ids[j]]; if (toks.some(function (t) { return t === m.name || m.aliases.indexOf(t) >= 0; })) return { kind: 'node', nodeId: m.id, how: 'alias' }; }
    for (var k = 0; k < ids.length; k++) { var q = nodes[ids[k]]; if (toks.some(function (t) { return q.keywords.indexOf(t) >= 0; })) return { kind: 'node', nodeId: q.id, how: 'token' }; }
    return { kind: 'wiki', query: raw };
  }
  function wikiFetch(title, opts) {
    var url = 'https://ko.wikipedia.org/w/api.php?origin=*&action=query&format=json&prop=extracts|pageimages|links&exintro=1&explaintext=1&exsentences=2&piprop=thumbnail&pithumbsize=400&pllimit=50&plnamespace=0&titles=' + encodeURIComponent(title);
    if (typeof fetch !== 'function') return Promise.resolve({ ok: false, reason: 'network' });
    var ctl = typeof AbortController === 'function' ? new AbortController() : null, timer = setTimeout(function () { if (ctl) ctl.abort(); }, 4000), timedOut = false;
    return fetch(url, { signal: ctl ? ctl.signal : undefined }).then(function (r) { return r.json(); }).then(function (d) {
      clearTimeout(timer);
      var pages = d && d.query && d.query.pages; if (!pages) return { ok: false, reason: 'missing' };
      var pg = pages[Object.keys(pages)[0]];
      if (!pg || pg.missing !== undefined || !pg.extract) return { ok: false, reason: 'missing' };
      return { ok: true, title: pg.title || title, extract: String(pg.extract).slice(0, 160), url: 'https://ko.wikipedia.org/wiki/' + encodeURIComponent(pg.title || title), thumb: pg.thumbnail ? { url: pg.thumbnail.source, w: pg.thumbnail.width, h: pg.thumbnail.height } : null, links: (pg.links || []).map(function (l) { return l.title; }) };
    }).catch(function () { clearTimeout(timer); return { ok: false, reason: timedOut ? 'timeout' : 'network' }; });
  }
  function stopFrom(node, first, via, bridge) { return { kind: 'room', id: node.id, name: node.name, emoji: node.emoji, corner: node.corner, first: first, viaTangent: via, bridge: bridge, status: null, note: '', source: null, ms: 0, node: node }; }
  function finishStop(s, res, online) {
    if (s.node.linger || s.id === 'letter_room') { s.status = 'none'; s.note = s.node.linger ? '읽은 건 없어' : '아직 비어 있었어'; return; }
    if (res && res.ok) { s.status = 'read'; s.note = res.extract.slice(0, 90); s.source = { url: res.url, extract: res.extract, thumb: res.thumb, license: 'CC BY-SA 4.0', attribution: 'Wikipedia (ko)' }; return; }
    if (s.node.clue) { s.status = 'builtin'; s.note = s.node.clue; } else { s.status = 'failed'; s.note = '연결이 안 됐어'; }
    if (!online) s.note = '지금은 바깥 글을 못 읽어';
  }
  function build(stops, ctx) {
    var R = ctx.R, counts = { read: 0, builtin: 0, simulated: 0, failed: 0, none: 0 };
    stops.forEach(function (s, i) { s.ms = 4000 + Math.round(R() * 10000); counts[s.status]++; });
    var remIdx = stops.length ? Math.floor(R() * stops.length) : -1;
    if (stops.length > 1 && ctx.follow && remIdx === 0 && R() < 0.6) remIdx = stops.length - 1;
    var rem = stops[remIdx];
    var line = !rem ? '' : rem.node.linger ? WORLD.lineTemplates.linger[0] : ctx.follow ? (remIdx === 0 ? WORLD.lineTemplates.followedKept[0] : WORLD.lineTemplates.followedThenLeft[0]) : ctx.hintNode ? WORLD.lineTemplates.ignored[0] : WORLD.lineTemplates.noHint[0];
    line = line.replace('{hint}', ctx.hintNode ? ctx.hintNode.name : '').replace('{mem}', rem ? rem.name : '').replace('{memory}', rem ? rem.node.memories[Math.floor(R() * rem.node.memories.length)] : '');
    var first = stops.some(function (s) { return s.first; });
    var reaction = first ? '폴짝' : (ctx.follow && stops.every(function (s) { return s.status === 'read'; })) ? '우쭐' : stops.length >= 4 ? '졸림' : '덤덤';
    var souvCand = stops.filter(function (s) { return s.first && s.node.souvenir; });
    var souvenir = souvCand.length && R() < 0.35 ? souvCand[0].node.souvenir : null;
    var pos = { x: Math.round(58 + R() * 24), y: Math.round(18 + R() * 22), rot: Math.round(-14 + R() * 28) };
    var paper = Math.floor(R() * 3);
    var followed = !ctx.hintNode ? 'none' : !ctx.follow ? 'ignored' : (remIdx === 0 ? 'followed' : 'left');
    var visitsDelta = {}, affinityDelta = {};
    stops.forEach(function (s) { visitsDelta[s.id] = (visitsDelta[s.id] || 0) + 1; affinityDelta[s.corner] = (affinityDelta[s.corner] || 0) + 1; });
    if (rem) affinityDelta[rem.corner] += 2;
    var receipt = { stops: stops.map(function (s, i) { return { idx: i, nodeId: s.id, name: s.name, emoji: s.emoji, corner: s.corner, status: s.status, ms: s.ms, note: s.note, source: s.source, first: s.first, viaTangent: s.viaTangent, bridge: s.bridge }; }),
      counts: counts, souvenir: souvenir, rememberedIdx: remIdx, reaction: reaction, reactionEmoji: WORLD.reactions[reaction].emoji, reactionLine: WORLD.reactions[reaction].lines[0], returnReason: ctx.reason };
    var poster = rem ? { type: 'poster', title: rem.name, line: line, sticker: rem.node.sticker, emoji: rem.emoji, scene: rem.node.scene, stickerPos: pos, thumb: rem.source && rem.source.thumb ? { url: rem.source.thumb.url, license: '위키미디어 공용' } : null, paper: paper } : null;
    var t = 0, events = [{ type: 'depart', t: 0, hint: ctx.hintRaw, followHint: !!ctx.follow }];
    stops.forEach(function (s) { t += 2500; var ev = { type: 'peek', t: t, target: { kind: 'room', id: s.id, title: s.name, wiki: s.node.wiki }, status: s.status, ms: s.ms, note: s.note, first: s.first, viaTangent: s.viaTangent }; if (s.bridge) ev.bridge = s.bridge; if (s.source) ev.source = s.source; events.push(ev); });
    t += 2500; events.push({ type: 'return', t: t, reason: ctx.reason });
    if (rem) { t += 800; events.push({ type: 'remember', t: t, stopIdx: remIdx, sticker: poster.sticker, line: line }); }
    t += 600; events.push({ type: 'hang_poster', t: t, posterId: ctx.id || null });
    t += 700; events.push({ type: 'wrap_up', t: t, reaction: reaction });
    return { kind: 'out', by: ctx.by, seed: ctx.seed, hint: { raw: ctx.hintRaw, match: ctx.match, followed: followed, note: followed === 'ignored' ? '오늘은 그쪽 말고 다른 데로 갔어' : null }, events: events, receipt: receipt, poster: poster, visitsDelta: visitsDelta, affinityDelta: affinityDelta, affinityDecay: 0.9, reaction: reaction };
  }
  function homeTrip(ctx) {
    var R = ctx.R, acts = WORLD.homeActivities.filter(function (a) { return a.id !== 'nothing'; }), act = acts[Math.floor(R() * acts.length)];
    var pos = { x: Math.round(58 + R() * 24), y: Math.round(18 + R() * 22), rot: Math.round(-14 + R() * 28) };
    return { kind: 'home', by: ctx.by, seed: ctx.seed, hint: { raw: ctx.hintRaw, match: ctx.match, followed: 'none' },
      events: [{ type: 'stay_home', t: 0, activity: act.id, line: act.line, anchor: act.anchor }, { type: 'wrap_up', t: 2000, reaction: '졸림' }],
      receipt: { stops: [], counts: { read: 0, builtin: 0, simulated: 0, failed: 0, none: 0 }, souvenir: null, rememberedIdx: -1, reaction: '졸림', reactionLine: WORLD.reactions['졸림'].lines[0], activity: act },
      poster: { type: 'note', title: '오늘은 집', line: act.line, detail: act.detail, sticker: 'home', emoji: '🏠', scene: 'home', stickerPos: pos, thumb: null, paper: Math.floor(R() * 3) },
      visitsDelta: {}, affinityDelta: {}, affinityDecay: 0.9, reaction: '졸림' };
  }
  function plan(input) {
    input = input || {};
    var hintRaw = String(input.hint || '').trim(), seed = input.seed == null ? hashSeed(input.dateKey, hintRaw, input.seq, input.name) : input.seed >>> 0;
    var R = rng(seed), state = input.state || {}, visits = state.visits || {}, online = input.online !== false, by = input.by || 'demo';
    var fetcher = typeof input.fetchWiki === 'function' ? input.fetchWiki : wikiFetch;
    var match = matchHint(hintRaw), hour = (input.now ? new Date(input.now) : new Date()).getHours();
    var pStay = Math.min(0.6, 0.12 + (hour <= 5 ? 0.2 : 0) + ((state.todayOut || 0) >= 2 ? 0.25 : 0));
    var ctx = { R: R, by: by, seed: seed, hintRaw: hintRaw, match: match, id: input.id, hintNode: match.kind === 'node' ? nodes[match.nodeId] : null };
    if (R() < pStay) { if (R() < 0.03) return Promise.resolve({ kind: 'empty', by: by, seed: seed, hint: { raw: hintRaw, match: match, followed: 'none' }, events: [{ type: 'empty_turn', t: 0 }], receipt: null, poster: null, visitsDelta: {}, affinityDelta: {}, reaction: null }); return Promise.resolve(homeTrip(ctx)); }
    ctx.follow = ctx.hintNode ? R() < 0.75 : false;
    var ids = Object.keys(nodes).filter(function (i) { return i !== 'door_out' && i !== 'letter_room' && i !== 'slow_room'; });
    var cur = ctx.follow ? ctx.hintNode : nodes[ids[Math.floor(R() * ids.length)]];
    var stops = [stopFrom(cur, !(visits[cur.id] > 0), false, null)], reason = 'enough', pRet = [0.25, 0.45, 0.7, 1.0];
    if (match.kind === 'url') { var door = stopFrom(nodes.door_out, false, false, null); door.status = 'simulated'; door.note = '정적 페이지라 바깥은 못 읽어. 문 앞까지만 갔다 왔어'; door.url = match.url; stops.unshift(door); }
    for (var i = 0; i < 4; i++) {
      if (cur.linger) { reason = 'linger'; break; }
      if (stops.length >= 2 && R() < pRet[Math.min(i, 3)]) break;
      var viaT = R() < 0.4 + i * 0.15, nxt = null, bridge = null;
      if (viaT && cur.tangents.length) { var tg = cur.tangents[Math.floor(R() * cur.tangents.length)]; nxt = nodes[tg.to]; bridge = tg.bridge; }
      else if (cur.related.length) nxt = nodes[cur.related[Math.floor(R() * cur.related.length)]];
      if (!nxt || stops.some(function (s) { return s.id === nxt.id; })) { var cand = ids.filter(function (x) { return !stops.some(function (s) { return s.id === x; }); }); if (!cand.length) break; nxt = nodes[cand[Math.floor(R() * cand.length)]]; viaT = false; bridge = null; }
      stops.push(stopFrom(nxt, !(visits[nxt.id] > 0), viaT, bridge)); cur = nxt;
    }
    ctx.reason = reason;
    var fetches = stops.map(function (s) { return (online && s.node.wiki && !s.node.linger && s.id !== 'letter_room') ? Promise.resolve().then(function () { return fetcher(s.node.wiki); }).catch(function () { return { ok: false, reason: 'network' }; }) : Promise.resolve(null); });
    return Promise.all(fetches).then(function (res) { stops.forEach(function (s, i) { if (s.status !== 'simulated') finishStop(s, res[i], online); }); return build(stops, ctx); });
  }
  function replay(events, meta) {
    meta = meta || {}; var by = meta.by || 'human', seed = meta.seed != null ? meta.seed >>> 0 : hashSeed('replay', JSON.stringify(events)), R = rng(seed);
    var dep = events.filter(function (e) { return e.type === 'depart'; })[0], hintRaw = dep && dep.hint ? String(dep.hint) : '';
    var match = matchHint(hintRaw), ctx = { R: R, by: by, seed: seed, hintRaw: hintRaw, match: match, hintNode: match.kind === 'node' ? nodes[match.nodeId] : null, follow: !!(dep && dep.followHint), reason: 'enough' };
    if (events.some(function (e) { return e.type === 'empty_turn'; })) return { kind: 'empty', by: by, seed: seed, hint: { raw: hintRaw, match: match, followed: 'none' }, events: events, receipt: null, poster: null, visitsDelta: {}, affinityDelta: {}, reaction: null };
    var sh = events.filter(function (e) { return e.type === 'stay_home'; })[0];
    if (sh) { var ht = homeTrip(ctx); ht.events = events; ht.poster.line = sh.line || ht.poster.line; ht.receipt.activity = { id: sh.activity, line: sh.line, detail: '', anchor: sh.anchor || 'window' }; return ht; }
    var stops = events.filter(function (e) { return e.type === 'peek'; }).map(function (ev) {
      var tg = ev.target || {}, node = nodes[tg.id] || mk({ id: tg.id || 'wild_' + (tg.title || 'x'), name: tg.title || tg.url || '어딘가', corner: 'wild', emoji: tg.kind === 'url' ? '🚪' : '❔', wiki: null, clue: '' });
      var s = stopFrom(node, !!ev.first, !!ev.viaTangent, ev.bridge || null);
      s.status = ['read', 'builtin', 'simulated', 'failed', 'none'].indexOf(ev.status) >= 0 ? ev.status : 'failed';
      if (s.status === 'read' && !(ev.source && ev.source.url)) s.status = 'failed';
      s.note = ev.note || ''; if (ev.source) s.source = ev.source; s.ms = ev.ms || 0;
      return s;
    });
    var out = build(stops, ctx); out.events = events;
    var wu = events.filter(function (e) { return e.type === 'wrap_up'; })[0]; if (wu && WORLD.reactions[wu.reaction]) { out.reaction = wu.reaction; out.receipt.reaction = wu.reaction; }
    var rem = events.filter(function (e) { return e.type === 'remember'; })[0]; if (rem && out.poster && rem.line) out.poster.line = rem.line;
    return out;
  }
  var BRAIN = { hashSeed: hashSeed, rng: rng, matchHint: matchHint, wikiFetch: wikiFetch, plan: plan, replay: replay, stub: true };
  root.WORLD = WORLD; root.BRAIN = BRAIN;
  if (typeof module !== 'undefined' && module.exports) module.exports = { WORLD: WORLD, BRAIN: BRAIN };
})(typeof globalThis !== 'undefined' ? globalThis : this);
