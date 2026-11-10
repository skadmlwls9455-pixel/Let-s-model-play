/* mcp/tools.js — 뽈뽈 문어 MCP 서버의 안내문 · 도구 정의 (stdio 와 원격 HTTP 가 같이 쓴다)
 *   buildServer(oct, hooks) → McpServer. hooks.after(toolName, out) 은 도구가 끝난 뒤 (응답 전) 부른다 — 원격은 여기서 저장한다.
 *   글은 전부 방의 언어 (oct.lang() · i18n.js) 로 — 안내문 · 도구 설명은 서버를 만들 때 (initialize) 그 언어로 실린다.
 */
'use strict';
var { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
var z = require('zod');
var core = require('./core.js');
var I18N = require('./i18n.js');
var fs = require('fs');
var path = require('path');
var postcard = require('./postcard.js');

/* MCP Apps (산책 엽서) 등록 도우미 — @modelcontextprotocol/ext-apps/server 1.7.5 의 registerAppTool · registerAppResource 와 같은 일.
 * 그 패키지는 ESM 전용이라 Vercel 함수 런타임이 require() 로 못 불러 (ERR_REQUIRE_ESM → /api/mcp 가 500). 몇 줄이라 여기 둔다.
 * 시험: `node --no-experimental-require-module -e "require('./api/mcp/[key].js')"` 가 통과해야 한다 (test/run.js 가 확인). */
var APPS = {
  RESOURCE_MIME_TYPE: 'text/html;profile=mcp-app',
  RESOURCE_URI_META_KEY: 'ui/resourceUri',   /* 옛 호스트용 키 — 새 키 _meta.ui.resourceUri 와 둘 다 적는다 */
  registerAppTool: function (server, name, cfg, cb) {
    var meta = cfg._meta || {}, ui = meta.ui, legacy = meta[APPS.RESOURCE_URI_META_KEY], m = meta;
    if (ui && ui.resourceUri && !legacy) { m = Object.assign({}, meta); m[APPS.RESOURCE_URI_META_KEY] = ui.resourceUri; }
    else if (legacy && !(ui && ui.resourceUri)) m = Object.assign({}, meta, { ui: Object.assign({}, ui, { resourceUri: legacy }) });
    return server.registerTool(name, Object.assign({}, cfg, { _meta: m }), cb);
  },
  registerAppResource: function (server, name, uri, cfg, cb) {
    return server.registerResource(name, uri, Object.assign({ mimeType: APPS.RESOURCE_MIME_TYPE }, cfg), cb);
  }
};

module.exports = function buildServer(oct, hooks) {
  hooks = hooks || {};
  var L = oct.L || I18N.T('ko'), far = oct.far ? oct.far() : I18N.FAR.ko, TL = L.tools;
  var INSTRUCTIONS = L.instructions.map(function (s) { return s === null ? L.fixed : s; }).join('\n');

  var server = new McpServer({ name: 'ppolppol-octopus', version: '0.4.0' }, { instructions: INSTRUCTIONS });

  function reply(out) {
    if (out && out.error) return { isError: true, content: [{ type: 'text', text: out.error }] };
    return { content: [{ type: 'text', text: JSON.stringify(out) }] };
  }
  function tool(name, title, description, schema, hints, fn, ui) {
    var cfg = { title: title, description: description, inputSchema: schema, annotations: Object.assign({ openWorldHint: false }, hints) };
    var register = ui ? function (n, c, h) { c._meta = { ui: ui }; return APPS.registerAppTool(server, n, c, h); } : server.registerTool.bind(server);
    register(name, cfg,
      async function (args) {
        try {
          var bad = core.checkArgs(name, args || {}, oct.L) || core.screenArgs(name, args || {}, oct.L);   /* 글자 수 · 개수 상한 + 감염 막기 2 (남길 글 거르기) */
          if (bad) return reply({ error: bad });
          var out = await fn(args || {});
          if (hooks.after) await hooks.after(name, out);   /* 원격: 방 상태를 저장소에 (응답 전에) */
          return reply(out);
        }
        catch (e) { if (hooks.log) hooks.log(name, e); return reply({ error: (oct.L || L).err.server }); }
      });
  }

  /* 도구 정의는 연결해 두면 모든 대화에 실린다 → 설명은 짧게, 뜻은 instructions 에 한 번만 */
  var target = z.object({ kind: z.enum(['room', 'wiki', 'card', 'url']), id: z.string().optional(), title: z.string().optional(), lang: z.enum(I18N.LANGS).optional(), url: z.string().optional() })
    .describe(TL.peek.target(far));
  var wrapFields = {
    reaction: z.string().optional().describe(TL.wrap.reaction),
    line: z.string().optional(),
    tomorrow: z.string().optional().describe(TL.wrap.tomorrow),   /* core 는 옛 모양 memo:{tomorrow, notes} 도 받는다 */
    note: z.string().optional().describe(TL.wrap.note),   /* core 는 {text, about} 도 받는다 (옛 모양) */
    setDown: z.array(z.string()).optional().describe(TL.wrap.setDown)
  };

  /* lang: 방에 언어가 없을 때 (옛 방 · 환경 변수 없는 stdio) 모델이 대화의 언어를 한 번 알려 준다. 언어가 있는 방에선 무시된다 (core.setLang) */
  tool('ppolppol_look_room', TL.look.title, TL.look.desc,
    { archived: z.boolean().optional().describe(TL.look.archived), lang: z.enum(I18N.LANGS).optional().describe(TL.look.lang) },
    { readOnlyHint: false, destructiveHint: false }, function (a) { if (a.lang) oct.setLang(a.lang); return oct.lookRoom(a); });   /* 처음엔 meet 물음을 걸고 저장한다 → 읽기 전용이 아니다 */

  tool('ppolppol_depart', TL.depart.title, TL.depart.desc,
    { first: target.optional(), more: z.boolean().optional() },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }, function (a) { return oct.go(a); });

  tool('ppolppol_peek', TL.peek.title, TL.peek.desc,
    {
      target: target,
      more: z.boolean().optional(),
      note: z.string().optional(),
      aside: z.string().optional().describe(TL.peek.aside),
      bridge: z.string().optional().describe(TL.peek.bridge),
      tripId: z.string().optional()
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: true }, function (a) { return oct.peek(a); });

  tool('ppolppol_finish', TL.finish.title, TL.finish.desc,
    Object.assign({
      reason: z.enum(['enough', 'tired', 'linger']).optional(),
      remember: z.object({ stopIdx: z.union([z.number(), z.string()]), sticker: z.string().optional(), line: z.string().optional() }).optional().describe(TL.finish.remember),
      hang: z.boolean().optional().describe(TL.finish.hang),
      tripId: z.string().optional()
    }, wrapFields),
    { readOnlyHint: false, destructiveHint: false }, function (a) { return oct.finish(a); }, { resourceUri: postcard.URI });

  tool('ppolppol_stay_home', TL.home.title, TL.home.desc,
    Object.assign({ activity: z.string().optional(), detail: z.string().optional().describe(TL.home.detail) }, wrapFields),
    { readOnlyHint: false, destructiveHint: false }, function (a) { return oct.stayHome(a); }, { resourceUri: postcard.URI });

  tool('ppolppol_find', TL.find.title, TL.find.desc,
    { q: z.string() },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true }, function (a) { return oct.find(a); });

  tool('ppolppol_empty_turn', TL.empty.title, TL.empty.desc,
    {}, { readOnlyHint: false, destructiveHint: false }, function () { return oct.emptyTurn(); });

  tool('ppolppol_answer', TL.answer.title, TL.answer.desc,
    { id: z.string(), action: z.string(), line: z.string().optional(), expr: z.enum(['happy', 'idle', 'curious', 'calm']).optional(), note: z.string().optional() },
    { readOnlyHint: false, destructiveHint: false }, function (a) { return oct.answer(a); });

  /* ── 산책 엽서 (MCP App) ── 화면 전용 도구: visibility ['app'] 라 모델은 이 도구를 보지 않는다 */
  var FILE_RE = /^\d{4}-\d{2}-\d{2}-\d+\.json$/;
  async function readOut(name) {
    if (hooks.readOut) return hooks.readOut(name);
    try { return fs.readFileSync(path.join(oct.outDir, name), 'utf8'); } catch (e) { return null; }
  }
  APPS.registerAppTool(server, 'ppolppol_postcard', {
    title: TL.postcard.title, description: TL.postcard.desc,
    inputSchema: { file: z.string().optional() },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: { ui: { resourceUri: postcard.URI, visibility: ['app'] } }
  }, async function (a) {
    var E = (oct.L || L).err;
    try {
      var trips = oct.S.trips || [], rec = a && FILE_RE.test(a.file || '') ? trips.filter(function (t) { return t.file === a.file; })[0] : trips[trips.length - 1];
      if (!rec || !FILE_RE.test(rec.file || '')) return { isError: true, content: [{ type: 'text', text: E.noPostcard }] };
      var ev = null; try { ev = JSON.parse(await readOut(rec.file)); } catch (e) { ev = null; }
      if (!Array.isArray(ev)) return { isError: true, content: [{ type: 'text', text: E.noPostcard }] };
      return { content: [{ type: 'text', text: '엽서' }], structuredContent: postcard.data(ev, { name: oct.name, date: rec.date, lang: oct.lang ? oct.lang() : 'ko' }) };
    } catch (e) { if (hooks.log) hooks.log('ppolppol_postcard', e); return { isError: true, content: [{ type: 'text', text: E.postcardFail }] }; }
  });
  var origin = hooks.appOrigin || null;
  APPS.registerAppResource(server, TL.postcard.resName, postcard.URI, { description: TL.postcard.resDesc }, async function () {
    return { contents: [{ uri: postcard.URI, mimeType: APPS.RESOURCE_MIME_TYPE, text: postcard.html(origin, oct.lang ? oct.lang() : 'ko'),
      _meta: { ui: { csp: { resourceDomains: [origin || 'https://unpkg.com'] } } } }] };
  });

  return server;
};
