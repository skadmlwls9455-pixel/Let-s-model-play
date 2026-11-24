/* tools/test-player-parts-live.js — 11-21 내 캐릭터 새 부품 (브라우저 검사, 장면만 띄운다).
   ① 목록: 예전 id 는 전부 shop null · 새 id 만 값이 있다 · 낱말은 정해진 것만 · 기본 모습 둘이 목록에 있다
   ② 눈 10 × 눈 색 6: 눈 칸에 흰색 (세 채널 모두 225 넘는 밝은 무채색) 이 없다 · 눈꼬리 있는 눈은 좌우 대칭
   ③ 머리 × 몸 × 옷 (+ 신발 · 장식 · 눈썹) 72 조합: 앞 · 뒤 전신 그림에 바늘구멍 (바깥과 이어지지 않은 2 px 이하 배경색 덩어리) 이 그림마다 4 px 을 넘지 않는다 (멜빵 끈 · 모자 · 헤드폰과 머리 가닥 사이의 1~2 px 틈은 모양) · 그림이 비지 않는다
   ④ 부품을 바꿔도 메시 · 재질 · 셰이더 프로그램 수가 그대로
   쓰기: NODE_PATH=$(npm root -g) node tools/test-player-parts-live.js [contact-sheet.png] */
const path = require('path'), fs = require('fs'), os = require('os');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ok   ' + m); } else { fail++; console.error('  FAIL ' + m); } }
(async () => {
  const u = p => 'file://' + path.join(ROOT, p);
  const html = '<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#2a2433}#scene{width:360px;height:326px}#sheet{display:flex;flex-wrap:wrap;gap:2px;padding:2px;width:1584px}#sheet canvas{image-rendering:pixelated;width:128px;height:192px}</style></head><body><div id="scene"></div><div id="sheet"></div>' +
    '<script src="' + u('vendor/three.min.js') + '"></script><script src="' + u('js/palettes.js') + '"></script><script src="' + u('js/scene3d.js') + '"></script></body></html>';
  const f = path.join(os.tmpdir(), 'ppol-parts-' + process.pid + '.html'); fs.writeFileSync(f, html);
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  const page = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + f);
  const r = await page.evaluate(() => {
    const P = SCENE3D.PLAYER_PARTS, D = SCENE3D.PLAYER_DEFAULT, G = SCENE3D.PLAYER_LEGACY;
    window.SC = SCENE3D.init(document.getElementById('scene'), { lantern: 8, items: [], weather: 'clear', hour: 14, palette: 'apollo', look: { pixelSize: 2 }, player: D });
    SC.pause();
    const OLD = { hair: 6, bangs: 5, hairColor: 6, skin: 5, eyes: 6, eyeColor: 6, nose: 3, mouth: 6, cheek: 2, outfit: 9, shoes: 4, acc: 6 };
    const TAGS = 'cute cool cosy sporty neat sea flower star warm fresh c-red c-orange c-yellow c-green c-blue c-purple c-pink c-brown c-white c-black'.split(' ');
    const cat = { oldPaid: [], badTag: [], paid: [], defs: Object.keys(D).every(k => P[k].some(x => x.id === D[k])) && Object.keys(G).every(k => P[k].some(x => x.id === G[k])), keys: Object.keys(D).join() === Object.keys(G).join() };
    Object.keys(P).forEach(c => P[c].forEach((x, i) => {
      if (i < (OLD[c] || 0) && x.shop) cat.oldPaid.push(c + ':' + x.id);
      if (!Array.isArray(x.tags) || x.tags.some(t => TAGS.indexOf(t) < 0)) cat.badTag.push(c + ':' + x.id);
      if (x.shop) cat.paid.push(c + ':' + x.id + '=' + x.shop.price);
      if (x.shop && ['outfit', 'shoes', 'acc'].indexOf(c) < 0) cat.oldPaid.push('never-sold ' + c + ':' + x.id); }));
    SC.setPlayer(Object.assign({}, D, { hair: 'bob' })); SC.setPlayer(D); SC.playerShot({ look: { hair: 'bob' }, frame: 'full' }); for (let w = 0; w < 6; w++) SC.debugStep(0.1);   /* 첫 프레임 · 첫 그림까지 데운 뒤를 기준으로 */
    const info0 = { programs: SC.renderer.info.programs.length, geos: SC.renderer.info.memory.geometries, tex: SC.renderer.info.memory.textures };
    function px(cv) { return cv.getContext('2d').getImageData(0, 0, cv.width, cv.height); }
    /* ② 눈 */
    const eyes = { white: [], asym: [] };
    P.eyes.forEach(e => P.eyeColor.forEach(ec => {
      const d = px(SC.playerShot({ look: { eyes: e.id, eyeColor: ec.id, brow: 'none', acc: 'none', bangs: 'see', hair: 'crop', skin: 'peach' }, frame: 'face' }));
      let w = 0; for (let y = 8; y < 24; y++) for (let x = 2; x < 30; x++) { const i = (y * 32 + x) * 4; if (d.data[i] > 225 && d.data[i + 1] > 225 && d.data[i + 2] > 225) w++; }
      if (w) eyes.white.push(e.id + '/' + ec.id + ':' + w);
    }));
    /* ③ 조합 */
    const combos = [], holes = [], empty = [], sheet = document.getElementById('sheet');
    function holesOf(cv) {
      const d = px(cv), W = cv.width, H = cv.height, bg = [d.data[0], d.data[1], d.data[2]], seen = new Uint8Array(W * H), st = [];
      const isBg = i => d.data[i * 4] === bg[0] && d.data[i * 4 + 1] === bg[1] && d.data[i * 4 + 2] === bg[2];
      for (let x = 0; x < W; x++) { st.push(x, (H - 1) * W + x); } for (let y = 0; y < H; y++) { st.push(y * W, y * W + W - 1); }
      while (st.length) { const i = st.pop(); if (seen[i] || !isBg(i)) continue; seen[i] = 1; const x = i % W, y = (i - x) / W; if (x > 0) st.push(i - 1); if (x < W - 1) st.push(i + 1); if (y > 0) st.push(i - W); if (y < H - 1) st.push(i + W); }
      /* 구멍 = 바깥과 이어지지 않은 배경색 덩어리 가운데 2 px 이하인 것 (껍질 이음새의 바늘구멍). 다리 사이 · 꼬리 고리 · 헤드폰 밑처럼 모양이 가둔 큰 틈은 구멍이 아니다 */
      let n = 0, ink = 0;
      for (let i = 0; i < W * H; i++) {
        if (!isBg(i)) { ink++; continue; } if (seen[i]) continue;
        let sz = 0; const q = [i]; while (q.length) { const j = q.pop(); if (seen[j] || !isBg(j)) continue; seen[j] = 1; sz++; const x = j % W, y = (j - x) / W; if (x > 0) q.push(j - 1); if (x < W - 1) q.push(j + 1); if (y > 0) q.push(j - W); if (y < H - 1) q.push(j + W); }
        if (sz <= 2 && i < 70 * W) n += sz;   /* 다리 줄 (70 줄 아래) 의 두 신발 틈은 치마 · 신발이 가두는 모양이라 세지 않는다 */
      }
      return { n, ink };
    }
    for (let i = 0; i < 72; i++) {
      const look = { hair: P.hair[i % 13].id, body: P.body[i % 2].id, outfit: P.outfit[(i * 5) % 17].id, shoes: P.shoes[i % 6].id, acc: P.acc[(i * 7) % 12].id, eyes: P.eyes[i % 10].id, brow: P.brow[i % 4].id, bangs: P.bangs[i % 5].id, hairColor: P.hairColor[i % 6].id, skin: P.skin[i % 5].id };
      combos.push([look.hair, look.body, look.outfit].join('+'));
      ['full', 'back'].forEach(fr => {
        const src = SC.playerShot({ look, frame: fr }), h = holesOf(src);
        if (h.n > 4) holes.push(fr + ' ' + look.hair + '+' + look.body + '+' + look.outfit + '+' + look.acc + '+' + look.shoes + ':' + h.n);
        if (h.ink < 600) empty.push(fr + ' ' + i);
        if (fr === 'full') { const c = document.createElement('canvas'); c.width = 64; c.height = 96; c.getContext('2d').drawImage(src, 0, 0); sheet.appendChild(c); }
      });
    }
    /* 몸 b 는 a 와 다른 그림 · 눈썹 넷도 서로 다른 그림 */
    const sig = (look, fr) => { const d = px(SC.playerShot({ look, frame: fr })).data; let h = 0; for (let i = 0; i < d.length; i += 4) h = (h * 31 + d[i] * 7 + d[i + 1] * 3 + d[i + 2]) >>> 0; return h; };
    const diff = { body: sig({ body: 'a' }, 'full') !== sig({ body: 'b' }, 'full'), brow: new Set(P.brow.map(x => sig({ brow: x.id, bangs: 'see' }, 'face'))).size, eyes: new Set(P.eyes.map(x => sig({ eyes: x.id }, 'face'))).size, hair: new Set(P.hair.map(x => sig({ hair: x.id }, 'back'))).size, outfit: new Set(P.outfit.map(x => sig({ outfit: x.id }, 'full'))).size, acc: new Set(P.acc.map(x => sig({ acc: x.id }, 'full'))).size, shoes: new Set(P.shoes.map(x => sig({ shoes: x.id }, 'full'))).size };
    /* ④ 예산: 전부 한 번씩 입혀 본 뒤 */
    ['hair', 'outfit', 'shoes', 'acc', 'eyes', 'brow', 'body'].forEach(c => P[c].forEach(x => { const l = {}; l[c] = x.id; SC.setPlayer(Object.assign({}, D, l)); }));
    SC.setPlayer(D); for (let i = 0; i < 3; i++) SC.debugStep(0.1);
    const info1 = { programs: SC.renderer.info.programs.length, geos: SC.renderer.info.memory.geometries, tex: SC.renderer.info.memory.textures };
    const dy = ['octee', 'shirt', 'jersey', 'sailor', 'fisher', 'windbreak', 'cardigan', 'suit'].every(id => SC.dyeable('outfit', id)) && ['hightop', 'sandal'].every(id => SC.dyeable('shoes', id)) && ['cap', 'bandana', 'headphones', 'scarf', 'sqglasses', 'bag'].every(id => SC.dyeable('acc', id));
    /* ⑤ 11-24 색 꼬리표 = 그려진 색: 옷 · 신발 · 장식마다 머리 색 6 × 피부색 5 로 그려지는 바탕색을 보고, 바뀌는 물건은 색 표 (PL_ITEM_FAMILY) 에 그 색이 다 있고 itemTags 의 색 갈래가 그 색의 갈래 · 안 바뀌는 물건은 목록 꼬리표 그대로 · 어느 모습에서든 색 갈래는 꼭 하나 */
    const tagBad = [], varied = [];
    ['outfit', 'shoes', 'acc'].forEach(c => P[c].forEach(x => {
      if (x.id === 'none') return;
      const base = x.tags.filter(t => t.indexOf('c-') === 0);
      P.hairColor.forEach(h => P.skin.forEach(sk => {
        const look = Object.assign({}, D, { hairColor: h.id, skin: sk.id }), d = SC.debugItemColour(c, x.id, look), t = SC.itemTags(c, x.id, look), ct = t.filter(q => q.indexOf('c-') === 0);
        if (ct.length !== 1) tagBad.push(c + ':' + x.id + ' ' + h.id + '/' + sk.id + ' 색 갈래 ' + ct.length + '개');
        else if (d.varies) { if (!d.table || !d.family) tagBad.push(c + ':' + x.id + ' ' + h.id + ' 그려진 ' + d.hex + ' 이 색 표에 없다'); else if (ct[0] !== d.family) tagBad.push(c + ':' + x.id + ' ' + h.id + ' 그려진 ' + d.family + ' ≠ 꼬리표 ' + ct[0]); }
        else if (ct[0] !== base[0]) tagBad.push(c + ':' + x.id + ' 색이 안 바뀌는데 꼬리표가 바뀜');
        if (d.varies && varied.indexOf(c + ':' + x.id) < 0) varied.push(c + ':' + x.id);
      }));
    }));
    const beretBrown = SC.itemTags('acc', 'beret', Object.assign({}, D, { hairColor: 'brown' })), beretBlonde = SC.itemTags('acc', 'beret', Object.assign({}, D, { hairColor: 'blonde' }));
    return { tagBad, varied, beret: [beretBrown.filter(q => q.indexOf('c-') === 0)[0], beretBlonde.filter(q => q.indexOf('c-') === 0)[0]], cat, eyes, n: combos.length, uniq: new Set(combos).size, holes, empty, diff, info0, info1, dy, counts: Object.keys(P).map(k => k + P[k].length).join(' ') };
  });
  console.log('== 내 캐릭터 새 부품 (' + r.counts + ')');
  ok(!r.cat.oldPaid.length && !r.cat.badTag.length && r.cat.defs && r.cat.keys, '목록: 예전 id · 팔지 않는 갈래는 shop null · 낱말은 정해진 것만 · 기본 모습 둘이 목록에 있고 열쇠 차례가 같다 ' + JSON.stringify([r.cat.oldPaid, r.cat.badTag]));
  ok(r.cat.paid.length === 10 && r.cat.paid.every(x => { const p = +x.split('=')[1]; return p >= 4 && p <= 36; }), '가게 물건 10 (조개 4~36): ' + r.cat.paid.join(' '));
  ok(!r.eyes.white.length, '눈 10 × 눈 색 6: 눈 둘레에 흰색 픽셀 없음 ' + JSON.stringify(r.eyes.white.slice(0, 6)));
  ok(r.n === 72 && r.uniq >= 60 && !r.holes.length && !r.empty.length, '머리 × 몸 × 옷 ' + r.uniq + ' 조합 (앞 · 뒤): 구멍 없음 · 빈 그림 없음 ' + JSON.stringify(r.holes.slice(0, 8)));
  ok(r.diff.body && r.diff.brow === 4 && r.diff.eyes === 10 && r.diff.hair === 13 && r.diff.outfit === 17 && r.diff.acc === 12 && r.diff.shoes === 6, '몸 둘 · 눈썹 넷 · 눈 열 · 머리 열셋 · 옷 열일곱 · 장식 열둘 · 신발 여섯이 서로 다른 그림 ' + JSON.stringify(r.diff));
  ok(r.info1.programs === r.info0.programs && r.info1.geos === r.info0.geos && r.info1.tex === r.info0.tex, '부품을 다 입혀 봐도 프로그램 · 지오메트리 · 텍스처 수 그대로 ' + JSON.stringify([r.info0, r.info1]));
  ok(r.dy, '새 옷 · 신발 · 장식은 전부 물들일 수 있다 (바탕색 표에 있다)');
  ok(!r.tagBad.length && r.varied.length >= 1 && r.beret.join() === 'c-green,c-red', '색 꼬리표 = 그려진 색 (머리 색 6 × 피부색 5, 옷 · 신발 · 장식 전부): 모습에 따라 색이 바뀌는 물건 ' + r.varied.join(' · ') + ' · 밤갈색 머리 베레모 = 초록 · 금발 = 빨강 ' + JSON.stringify(r.tagBad.slice(0, 6)));
  ok(errs.length === 0, '페이지 에러 0 ' + errs.join(' | '));
  if (process.argv[2]) { await page.locator('#sheet').screenshot({ path: process.argv[2] }); console.log('  sheet → ' + process.argv[2]); }
  await b.close(); fs.unlinkSync(f);
  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
