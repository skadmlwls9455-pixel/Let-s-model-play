#!/usr/bin/env node
/* 가게 시트 · 바닷가 조개 — 진짜 브라우저에서 (11-21 7차 갈래 S). NODE_PATH=$(npm root -g) node tools/test-shop-live.js [--shots]
   옷장 (캐릭터 갈래의 APP.wardrobe · ownItem) 은 여기서 여섯 개짜리 대역으로 끼운다 (있던 옷 id 에 값만 붙인다 — 그 갈래가 합쳐져도 이 시험은 대역으로 돈다).
   본다: 두 시트 열기 · 입어 보기 · 확인 줄 (0.6 s 규칙) · 사기 · 모자람 · 씨앗 하루 셋 · 새로고침 · 날 바뀜 · 가게 주인 줄 · 조개 줍기 · 다른 탭 */
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), SHOTS = process.argv.includes('--shots') ? path.join(ROOT, 'wip', 'round7', 'shots', 'S') : null;
const DAY = '2026-11-21', NEXT = '2026-11-22', BORN = '2026-11-06T10:00:00.000Z', RED = '#e0564b';
let pass = 0, fail = 0;
function ok(c, name) { if (c) pass++; else { fail++; console.log('  FAIL ' + name); } }
function rec(shells) {
  return { v: 2, octopus: { name: '뚜루', born: BORN, trips: 0, invites: 3, days: ['2026-11-06', '2026-11-07', '2026-11-08'], affinity: {}, visits: {}, state: 'idle', color: RED, colors: [{ at: BORN, date: '2026-11-06', color: RED, how: 'first', by: 'player' }] },
    room: { lantern: 3, souvenirs: [], posterOrder: [] }, trips: [], notes: {}, curiosityNotes: [], salon: { asks: [] },
    settings: { motion: 'auto', thumbs: true, lastSeen: 1762650000000, octColor: RED, flipped: false, pixelFont: true, albumSeen: 0 },
    user: { shells: shells, seeds: 1, dyes: { red: 1, later: 4 }, days: [DAY], giftDay: DAY, future: { keep: 1 } } };
}
/* 대역 옷장: 옷 · 신발 · 악세사리에서 지금 안 입은 것 둘씩에 값을 붙인다 */
function stub() {
  const P = APP.playerParts(), worn = APP.state.settings.player || {}, prices = [4, 9, 14, 6, 22, 30]; let n = 0, PR = JSON.parse(sessionStorage.getItem('__pr') || 'null');   /* 새로고침 뒤에도 같은 여섯 개 */
  if (!PR) { PR = {}; ['outfit', 'shoes', 'acc'].forEach(k => P[k].filter(x => x.id !== 'none' && x.id !== worn[k] && !(k === 'outfit' && x.id === 'dress')).slice(0, 2).forEach(x => { PR[k + ':' + x.id] = prices[n++]; })); sessionStorage.setItem('__pr', JSON.stringify(PR)); }
  const owned = () => (APP.state.user && APP.state.user.owned) || {};
  APP.wardrobe = () => ({ cats: ['outfit', 'shoes', 'acc'].map(k => ({ key: k, name: k, items: P[k].map(x => ({ id: x.id, name: x.name, tags: [], shop: PR[k + ':' + x.id] ? { price: PR[k + ':' + x.id] } : null, owned: !PR[k + ':' + x.id] || !!owned()[k + ':' + x.id], worn: worn[k] === x.id })) })) });
  APP.ownItem = (c, i) => { const u = APP.state.user; if (!u.owned) u.owned = {}; u.owned[c + ':' + i] = window.__ppolTest.today; APP.save(); return true; };
  window.__said = []; APP.npcSay = (id, key) => { window.__said.push(id + '|' + key); };
  return Object.keys(PR).length;
}
async function open(browser, o) {
  o = o || {};
  const ctx = o.ctx || await browser.newContext({ viewport: { width: o.w || 360, height: o.h || 740 }, deviceScaleFactor: o.dpr || 2, locale: 'ko-KR', hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => { fail++; console.log('  PAGEERROR ' + e.message); });
  await page.addInitScript({ content: "if (!localStorage.getItem('__seed')) { localStorage.setItem('__seed', '1'); localStorage.setItem('ppolppol_v2', " + JSON.stringify(JSON.stringify(rec(o.shells == null ? 0 : o.shells))) + "); } window.__ppolAwakeMs = 0; window.__ppolTest = { today: sessionStorage.getItem('__day') || '" + DAY + "' };" });
  await page.goto('file://' + ROOT + '/index.html?dev=0&intro=0' + (o.q || ''));
  await page.waitForSelector('#btn-go:not(.away)', { timeout: 30000 });
  await page.waitForFunction(() => window.APP && !APP.goResting, null, { timeout: 30000 });
  await page.waitForTimeout(600);
  return { ctx, page };
}
const U = page => page.evaluate(() => JSON.parse(JSON.stringify(APP.state.user)));
const tiles = page => page.evaluate(() => [...document.querySelectorAll('#shop-body .shop-tile')].map(b => ({ key: b.dataset.key, own: !!b.querySelector('.sew-cost.own'), text: b.textContent, pic: !!b.querySelector('.shop-thumb, .shop-seed, .shop-dye') })));
const setShells = (page, n) => page.evaluate(n => { APP.state.user.shells = n; APP.save(); APP.openShop(document.getElementById('shop-h').textContent === '옷가게' ? 'clothes' : 'goods'); }, n);
const tile = (page, key) => page.click('#shop-body .shop-tile[data-key="' + key + '"]');
const yes = async (page, wait) => { if (wait !== false) await page.waitForTimeout(700); await page.click('#shop-body .sew-yes'); };
/* 같은 자리 두 번 톡: 칸을 누르자마자 (0.6 s 안) 살래를 누른다 */
const dbl = (page, key) => page.evaluate(k => { document.querySelector('#shop-body .shop-tile[data-key="' + k + '"]').click(); const y = document.querySelector('#shop-body .sew-yes'); if (y) y.click(); }, key);
const shot = async (page, name) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.waitForTimeout(400); await page.screenshot({ path: path.join(SHOTS, name + '.png') }); } };

async function goodsRun(browser) {
  console.log('== 잡화점');
  const { ctx, page } = await open(browser, { shells: 0, q: '&scene=2d' });   /* 잡화점은 장면이 필요 없다 → 2D 로 (빠르고, 2D 폴백에서도 도는지 같이 본다) */
  ok(await page.evaluate(() => { const w = APP.wardrobe; APP.wardrobe = undefined; const r = APP.openShop('clothes'); APP.wardrobe = w; return r; }) === false && !(await page.evaluate(() => document.getElementById('shop-sheet').open)), '옷장이 없으면 옷가게는 안 열린다');
  ok(await page.evaluate(() => APP.openShop('goods')) === true, '잡화점 열기');
  let t = await tiles(page);
  ok(await page.textContent('#shop-h') === '잡화점' && t.length === 4 && t[0].key === 'seed' && t.filter(x => /^dye:/.test(x.key)).length === 3 && t.every(x => x.pic), '씨앗 + 염료 색 셋, 칸마다 그림');
  const dye = t[1].key;
  await tile(page, dye);
  ok(!(await page.$('#shop-body .shop-ask')) && (await U(page)).shells === 0 && /모자라/.test(await page.textContent('#toast')), '조개가 없으면 묻지 않고 모자란 수만');
  await setShells(page, 20);
  /* 윗줄 칸을 두 번 톡: 둘째가 줄어든 시트의 바깥에 떨어져 닫히면 안 된다 */
  const sb = await page.evaluate(() => { const r = document.querySelector('#shop-body .shop-tile').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + 20 }; });
  await page.mouse.click(sb.x, sb.y); await page.mouse.click(sb.x, sb.y);
  ok(await page.evaluate(() => document.getElementById('shop-sheet').open) && !!(await page.$('#shop-body .shop-ask')) && (await U(page)).shells === 20, '칸을 두 번 톡해도 시트가 닫히지 않는다');
  ok(await page.evaluate(p => { const r = document.getElementById('shop-sheet').getBoundingClientRect(); return p.y >= r.top; }, sb), '묻는 동안 시트 높이가 줄지 않는다');
  await page.waitForTimeout(700); await page.click('#shop-body .sew-no');
  await shot(page, 'goods-360');
  await dbl(page, 'seed');
  ok(!!(await page.$('#shop-body .shop-ask')) && !(await page.$('#shop-body .shop-grid')) && (await U(page)).shells === 20, '누르면 먼저 묻는다 (아직 안 나간다)');
  ok(await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('sew-no')), '포커스는 그만에');
  ok((await U(page)).shells === 20 && !!(await page.$('#shop-body .shop-ask')), '뜬 지 0.6 s 안의 살래는 안 받는다');
  await page.waitForTimeout(700); await page.click('#shop-body .sew-no');
  ok((await U(page)).shells === 20 && !!(await page.$('#shop-body .shop-grid')), '그만 → 그대로');
  for (let i = 0; i < 3; i++) { await tile(page, 'seed'); await yes(page); }
  let u = await U(page);
  ok(u.shells === 14 && u.seeds === 4 && u.shop.day.key === DAY && u.shop.day.seeds === 3, '씨앗 셋: 조개 6 · 씨앗 +3');
  t = await tiles(page);
  ok(t[0].own && /내일/.test(t[0].text), '다 산 씨앗 칸은 내일');
  await tile(page, 'seed');
  ok(!(await page.$('#shop-body .shop-ask')) && /오늘은 이게 다야/.test(await page.textContent('#toast')) && (await U(page)).shells === 14, '넷째 씨앗은 없다');
  await tile(page, dye); await yes(page);
  u = await U(page);
  const dc = dye.slice(4);
  ok(u.shells === 8 && u.dyes[dc] === (dc === 'red' ? 2 : 1) && u.dyes.later === 4 && u.future.keep === 1, '염료 사기 (모르는 값은 그대로)');
  ok(await page.evaluate(() => +document.getElementById('bag-n').textContent) === 8, '조개 꼬리표도 같이');
  await page.reload(); await page.waitForFunction(() => window.APP && APP.openShop, null, { timeout: 30000 }); await page.waitForTimeout(800);
  u = await U(page);
  ok(u.shells === 8 && u.seeds === 4 && u.shop.day.seeds === 3 && u.future.keep === 1, '새로고침해도 그대로');
  await page.evaluate(() => APP.openShop('goods'));
  ok((await tiles(page))[0].own, '새로고침 뒤에도 씨앗 칸은 내일');
  /* 날이 바뀌면 */
  await page.evaluate(d => { window.__ppolTest.today = d; document.dispatchEvent(new Event('visibilitychange')); }, NEXT);
  await page.waitForTimeout(800);
  t = await tiles(page);
  ok(!t[0].own && t.length === 4, '다음 날: 열어 둔 선반이 새로 (씨앗 다시)');
  await ctx.close();
}

async function clothesRun(browser) {
  console.log('== 옷가게');
  const { ctx, page } = await open(browser, { shells: 3 });
  ok(await page.evaluate(stub) === 6, '대역 옷장 여섯 개');
  ok(await page.evaluate(() => APP.openShop('clothes')) === true && await page.textContent('#shop-h') === '옷가게', '옷가게 열기');
  let t = await tiles(page);
  const d3 = await page.evaluate(() => APP.sceneMode === '3d');
  ok(t.length === 4 && t.every(x => !x.own) && (!d3 || t.every(x => x.pic)), '옷 네 개' + (d3 ? ', 칸마다 그림' : ''));
  const stock = await page.evaluate(() => APP.shopStock('clothes').items), look0 = await page.evaluate(() => JSON.stringify(APP.state.settings.player));
  const dear = stock.slice().sort((a, b) => b.price - a.price)[0], cheap = stock.slice().sort((a, b) => a.price - b.price)[0];
  await shot(page, 'clothes-360');
  await tile(page, dear.key);
  ok(!!(await page.$('#shop-body .shop-ask')) && (!d3 || !!(await page.$('#shop-body canvas.shop-try'))), '누르면 입어 본 그림과 물음');
  ok(await page.evaluate(() => JSON.stringify(APP.state.settings.player)) === look0 && (await U(page)).shells === 3, '입어 보기는 아무것도 안 바꾼다');
  await shot(page, 'tryon-360');
  await yes(page);
  let u = await U(page);
  ok(u.shells === 3 && !(u.owned || {})[dear.key] && !u.shop.got[dear.key] && !!(await page.$('#shop-body .shop-ask')) && /모자라/.test(await page.textContent('#toast')), '모자라면 안 사진다 (물음은 그대로)');
  await page.click('#shop-body .sew-no');
  /* 옷장이 받지 않으면 (false) 조개도 안 나간다 */
  await page.evaluate(() => { window.__own = APP.ownItem; APP.ownItem = () => false; });
  await setShells(page, cheap.price + 2);
  await tile(page, cheap.key); await yes(page);
  u = await U(page);
  ok(u.shells === cheap.price + 2 && !u.shop.got[cheap.key] && !(u.owned || {})[cheap.key], '옷장이 받지 않으면 조개도 안 나간다');
  await page.evaluate(() => { APP.ownItem = window.__own; });
  await setShells(page, cheap.price + 2);
  await dbl(page, cheap.key);
  ok((await U(page)).shells === cheap.price + 2, '0.6 s 안의 살래는 안 받는다');
  await yes(page);
  u = await U(page);
  ok(u.shells === 2 && u.owned[cheap.key] === DAY && u.shop.got[cheap.key] === DAY, '사기: 조개가 나가고 옷장에 들어온다');
  ok(new RegExp(cheap.name + '(을|를) 샀어. 내 모습에서 입어 봐.').test(await page.textContent('#toast')), '산 것을 한 줄로');
  await page.waitForFunction(k => !!document.querySelector('#shop-body .shop-tile[data-key="' + k + '"] .sew-cost.own'), cheap.key, { timeout: 8000 }).catch(() => {});   /* 산 뒤 선반이 다시 그려질 때까지 */
  t = await tiles(page);
  ok(t.length === 4 && (t.find(x => x.key === cheap.key) || {}).own && t.filter(x => x.own).length === 1, '산 칸에 있음 표시 (선반은 그대로)');
  await shot(page, 'stamp-360');
  await tile(page, cheap.key);
  ok((await page.textContent('#shop-body .sew-yes')) === '입을래', '가진 옷은 입을지 묻는다');
  await yes(page);
  ok(await page.evaluate(k => { const p = k.split(':'); return APP.state.settings.player[p[0]] === p[1]; }, cheap.key) && (await U(page)).shells === 2, '입을래 → 입는다 (조개는 그대로)');
  ok(await page.evaluate(() => window.__said.join()) === 'clothes|shop.hello,clothes|shop.hello,clothes|shop.hello,clothes|shop.thanks', '가게 주인 줄: 열 때 인사 · 산 뒤 한 번 (입기 · 모자람 · 그만에는 없다)');
  await page.click('#shop-close');
  /* 새로고침 → 대역을 다시 끼워도 산 것은 그대로 */
  await page.reload(); await page.waitForFunction(() => window.APP && APP.openShop, null, { timeout: 30000 }); await page.waitForTimeout(800);
  await page.evaluate(stub); await page.evaluate(() => APP.openShop('clothes'));
  t = await tiles(page); u = await U(page);
  if (!(u.owned[cheap.key] === DAY && u.shells === 2 && (t.find(x => x.key === cheap.key) || {}).own)) console.log('   (새로고침 뒤) ' + JSON.stringify({ owned: u.owned, shells: u.shells, tiles: t.map(x => x.key + (x.own ? '*' : '')), cheap: cheap.key }));
  ok(u.owned[cheap.key] === DAY && u.shells === 2 && (t.find(x => x.key === cheap.key) || {}).own, '새로고침해도 산 옷 · 표시 그대로');
  await page.evaluate(d => { sessionStorage.setItem('__day', d); window.__ppolTest.today = d; APP.openShop('clothes'); }, NEXT);
  t = await tiles(page);
  ok(t.length === 4 && !t.some(x => x.key === cheap.key) && t.every(x => !x.own), '다음 날: 산 옷은 빠지고 다른 것이 온다');
  await ctx.close();
}

async function beachRun(browser) {
  console.log('== 바닷가 조개');
  const { ctx, page } = await open(browser, { shells: 0 });
  await page.evaluate(() => { window.__bs = []; APP.scene.beachShells = l => { window.__bs.push(l.slice()); }; APP.beachSync(true); });   /* 진짜 장면은 부팅 때 이미 받았다 → 다시 보내게 */
  let st = await page.evaluate(() => ({ sent: window.__bs.slice(-1)[0], left: APP.beachLeft }));
  ok(st.left.length === 3 && JSON.stringify(st.sent) === JSON.stringify(st.left), '그날의 세 자리를 장면에 알린다');
  const no = [0, 1, 2, 3, 4].find(i => !st.left.includes(i));
  ok(await page.evaluate(i => APP.beachPick(i), no) === false && (await U(page)).shells === 0, '오늘 없는 자리는 안 주워진다');
  ok(await page.evaluate(i => APP.beachPick(i), st.left[0]) === true, '줍기');
  let u = await U(page);
  ok(u.shells === 1 && u.beach.day === DAY && u.beach.picked.length === 1 && /조개 1개를 주웠어/.test(await page.textContent('#toast')), '조개 +1 · 적어 둔다');
  ok(JSON.stringify(await page.evaluate(() => window.__bs.slice(-1)[0])) === JSON.stringify(st.left.slice(1)), '주운 자리는 숨는다');
  ok(await page.evaluate(i => APP.beachPick(i), st.left[0]) === false && (await U(page)).shells === 1, '같은 자리 두 번은 안 된다');
  await page.evaluate(d => { window.__ppolTest.today = d; document.dispatchEvent(new Event('visibilitychange')); }, NEXT);
  await page.waitForTimeout(800);
  ok((await page.evaluate(() => window.__bs.slice(-1)[0])).length === 3 && (await page.evaluate(() => APP.beachLeft)).length === 3, '다음 날 다시 셋');
  ok(!(await page.evaluate(() => /남|개 더|\/ ?3/.test(document.getElementById('scene').textContent || ''))), '남은 수를 세는 글 없음');
  await ctx.close();
}

async function tabsRun(browser) {
  console.log('== 두 탭');
  /* 다른 탭의 늦은 저장 = storage 이벤트. 헤드리스 file:// 에서는 두 쪽의 저장소 스냅숏이 갈리는 일이 있어 (시험 환경의 경합), 브라우저가 보낼 이벤트를 그대로 만들어 넣는다:
     사기 전의 기록을 (조금 바꿔) 저장소에 쓰고 알린다 → 앱이 그것을 받아들인 뒤 (S 가 통째로 바뀐다) 제 영수증을 다시 얹어야 한다 */
  const { ctx, page: A } = await open(browser, { shells: 40, q: '&scene=2d' });
  await A.evaluate(stub);
  const stale = await A.evaluate(() => localStorage.getItem('ppolppol_v2'));
  await A.evaluate(() => APP.openShop('clothes'));
  const it = (await A.evaluate(() => APP.shopStock('clothes').items))[0];
  await tile(A, it.key); await yes(A);
  ok((await U(A)).owned[it.key] === DAY && (await U(A)).shells === 40 - it.price, '탭 A 가 산다');
  const left = await A.evaluate(() => APP.beachLeft);
  await A.evaluate(i => APP.beachPick(i), left[0]);
  await A.evaluate(raw => { const o = JSON.parse(raw); o.user.seeds = 7; const v = JSON.stringify(o); localStorage.setItem('ppolppol_v2', v); window.dispatchEvent(new StorageEvent('storage', { key: 'ppolppol_v2', newValue: v, storageArea: localStorage })); }, stale);
  await A.waitForTimeout(1300);
  const a = await U(A);
  ok(a.seeds === 7 && a.shells === 40 - it.price + 1, '탭 A 가 다른 탭의 기록을 받고, 이 탭이 산 것 · 주운 것은 조개 변화와 함께 다시 얹는다 (공짜 옷 · 잃은 조개 없음)');
  ok(a.shop.got[it.key] === DAY && a.owned[it.key] === DAY, '산 옷은 사라지지 않는다 (영수증 · 옷장)');
  ok(a.beach.day === DAY && a.beach.picked.indexOf(left[0]) >= 0 && (await A.evaluate(() => APP.beachLeft)).length === 2, '주운 자리도 다시 나오지 않는다');
  await A.evaluate(raw => { const v = localStorage.getItem('ppolppol_v2'); window.dispatchEvent(new StorageEvent('storage', { key: 'ppolppol_v2', newValue: v, storageArea: localStorage })); });
  await A.waitForTimeout(1300);
  ok((await U(A)).shells === 40 - it.price + 1, '같은 기록을 또 받아도 두 번 얹지 않는다');
  const saved = JSON.parse(await A.evaluate(() => localStorage.getItem('ppolppol_v2')));
  ok(saved.user.shop.got[it.key] === DAY && saved.user.owned[it.key] === DAY, '저장에도 다시 적힌다');
  ok(await A.evaluate(k => !!document.querySelector('#shop-body .shop-tile[data-key="' + k + '"] .sew-cost.own'), it.key), '열린 선반의 표시도 그대로');
  /* 불러오기 (같은 탭) 뒤에 가게를 열어도 방금 산 것을 다시 얹지 않는다 */
  await A.evaluate(raw => { const o = JSON.parse(raw); o.user.seeds = 3; APP.importJSON(JSON.stringify(o)); }, stale);
  await A.evaluate(() => APP.openShop('clothes'));
  const im = await U(A);
  ok(im.seeds === 3 && !(im.owned || {})[it.key] && !((im.shop || {}).got || {})[it.key], '불러온 기록에는 얹지 않는다');
  await A.evaluate(() => document.getElementById('shop-sheet').close());
  /* 다른 문어의 기록 (초기화 뒤 새로 시작한 탭) 이면 얹지 않는다 */
  await A.evaluate(raw => { const o = JSON.parse(raw); o.octopus.born = '2026-11-20T00:00:00.000Z'; delete o.user.owned; delete o.user.shop; const v = JSON.stringify(o); localStorage.setItem('ppolppol_v2', v); window.dispatchEvent(new StorageEvent('storage', { key: 'ppolppol_v2', newValue: v, storageArea: localStorage })); }, stale);
  await A.waitForTimeout(1300);
  const z = await U(A);
  ok(!(z.owned || {})[it.key] && !((z.shop || {}).got || {})[it.key], '다른 문어의 기록에는 얹지 않는다');
  await ctx.close();
}

/* 가게 방 (걸어 들어가는 옷가게 · 잡화점): 방 · 단추 · 마네킹 · 입어 보기는 다른 갈래 것이라 여기서 대역으로 끼운다 (계약 C9~C11 의 이름 그대로). 누름은 진짜 누름 */
function roomStub() {
  const sc = document.getElementById('scene'), mk = (id, x, y) => { const old = document.getElementById(id); if (old) { old.hidden = false; old.style.cssText = 'left:' + x + 'px;top:' + y + 'px;outline:2px dashed #0a0'; return; } const b = document.createElement('button'); b.type = 'button'; b.id = id; b.className = 'scene-spot'; b.setAttribute('aria-label', id); b.style.cssText = 'left:' + x + 'px;top:' + y + 'px;outline:2px dashed #0a0'; sc.appendChild(b); };
  for (let i = 0; i < 4; i++) mk('btn-mq-' + i, 24 + i * 80, 230);
  mk('btn-room-mirror', 290, 150); mk('btn-room-counter', 150, 290);
  for (let i = 0; i < 6; i++) mk('btn-shelf-' + i, 16 + i * 56, 190);
  const L = window.__room = { mq: [], pose: [], close: [], tryOff: [], wear: [] }, T = window.__try = {};
  APP.scene.enterRoom = () => Promise.resolve({ ok: true }); APP.scene.inRoom = () => null;
  APP.scene.roomSlots = k => ({ slots: { mq0: [-1.8, 0.14, -2, 0], mq1: [-0.6, 0.14, -2, 0], mq2: [0.6, 0.14, -2, 0], mq3: [1.8, 0.14, -2, 0], counter: [2, 0, 1, 0] } });
  APP.scene.mannequins = (k, l) => { L.mq.push(JSON.parse(JSON.stringify(l))); };
  APP.scene.playerPose = n => { L.pose.push(n); return Promise.resolve(); };
  APP.scene.playerCloseup = on => { L.close.push(on); return Promise.resolve(); };
  APP.tryOn = (c, id) => { T[c] = id; }; APP.tryOff = c => { L.tryOff.push(c); delete T[c]; }; APP.trying = () => Object.assign({}, T);
  APP.wear = (c, id) => { L.wear.push(c + ':' + id); delete T[c]; return APP.setPlayerPart(c, id); };
}
const enter = (page, key) => page.evaluate(k => document.dispatchEvent(new CustomEvent('ppol:room', { detail: { key: k } })), key);
const R = page => page.evaluate(() => Object.assign({ mq: window.__room.mq.slice(-1)[0], log: window.__room, trying: Object.assign({}, window.__try), said: window.__said.slice() }, APP.shopRoom));
const cardBtn = async (page, text, wait) => { if (wait !== false) await page.waitForTimeout(700); await page.click('#shop-card button:has-text("' + text + '")'); };
async function roomRun(browser) {
  console.log('== 가게 방');
  const { ctx, page } = await open(browser, { shells: 10, q: SHOTS ? '' : '&scene=2d' });
  await page.evaluate(stub); await page.evaluate(roomStub);
  const stock = await page.evaluate(() => APP.shopStock('clothes').items), look0 = await page.evaluate(() => JSON.stringify(APP.state.settings.player)), raw0 = await page.evaluate(() => localStorage.getItem('ppolppol_v2'));
  await enter(page, 'clothes'); await page.waitForTimeout(150);
  let r = await R(page);
  ok(r.key === 'clothes' && r.mq.length === 4 && r.mq.every((m, i) => m.slot === 'mq' + i && !m.sold && m.parts && m.parts[stock[i].cat] === stock[i].id && Object.keys(m.parts).length === 1 && Array.isArray(m.pos) && m.pos[1] === 0.14), '들어가면 마네킹 넷이 오늘의 네 벌');
  ok(r.said.join() === 'clothes|shop.enter', '가게 주인 줄 한 번');
  /* 마네킹 톡 → 꼬리표 카드 (dialog 가 아니라 장면 안의 요소) */
  await page.evaluate(() => { document.getElementById('btn-mq-0').click(); document.querySelector('#shop-card button').click(); });   /* 같은 자리 두 번 톡 */
  ok((await R(page)).tried.length === 0 && !!(await page.$('#shop-card')), '카드가 뜬 지 0.6 s 안의 누름은 안 받는다');
  await page.mouse.click(8, 300); await page.click('#btn-mq-0');
  ok(await page.evaluate(() => { const c = document.getElementById('shop-card'); return !!c && c.parentNode.id === 'scene' && c.tagName !== 'DIALOG' && !document.querySelector('dialog[open]') && c.classList.contains('tag'); }), '꼬리표 카드는 장면 안의 요소');
  ok(await page.evaluate(n => { const c = document.getElementById('shop-card'), t = [...c.querySelectorAll('button')].map(b => b.textContent).join(); const a = document.getElementById('btn-mq-0').getBoundingClientRect(), b = c.getBoundingClientRect(), s = document.getElementById('scene').getBoundingClientRect(); return t === '입어 보기,살래' && c.textContent.includes(n) && (s.height < 560 || ((b.bottom <= a.top + 1 || b.top >= a.bottom - 1) && b.left >= s.left && b.right <= s.right + 0.5 && b.top >= s.top));   /* 자리는 3D 장면 (방이 있는 쪽) 에서만 잰다 */ }, stock[0].name), '카드: 이름 · 값 · 입어 보기 / 살래, 마네킹 바로 위 · 장면 안');
  ok(await page.evaluate(() => { const c = document.getElementById('shop-card').getBoundingClientRect(), st = document.getElementById('status').getBoundingClientRect(), g = document.getElementById('btn-go'), gr = g.getBoundingClientRect(); const sc = document.getElementById('scene').getBoundingClientRect(), over = st.top <= sc.top + 8 && st.bottom > sc.top, goIn = g.offsetParent && gr.top > sc.top && gr.top < sc.bottom; if (sc.height < 560) return true;   /* 방은 3D 장면에만 있다 (2D 는 시트로 간다) */
    return (!over || c.top >= st.bottom) && (!goIn || c.bottom <= gr.top) && c.top >= sc.top && c.bottom <= sc.bottom + 0.5; }), '카드는 위 상태 줄 아래 · 큰 단추 위');
  ok(await page.evaluate(() => { const sc = APP.scene; if (typeof sc.player !== 'function' || typeof sc.project !== 'function' || document.getElementById('scene').getBoundingClientRect().height < 560) return true;
    const pi = sc.player(), f = sc.project(pi.at[0], 0, pi.at[2]), hd = sc.project(pi.at[0], pi.height || 1.5, pi.at[2]), s = document.getElementById('scene').getBoundingClientRect(), r = document.getElementById('shop-card').getBoundingClientRect();
    const c = [r.left - s.left, r.top - s.top, r.right - s.left, r.bottom - s.top], half = Math.max(24, (f.y - hd.y) * 0.45);
    return !(c[1] < f.y && c[3] > hd.y && c[0] < f.x + half && c[2] > f.x - half); }), '카드가 내 캐릭터 몸을 덮지 않는다');
  await shot(page, 'room-tag-360');
  await cardBtn(page, '입어 보기');
  r = await R(page);
  ok(r.trying[stock[0].cat] === stock[0].id && r.tried.join() === stock[0].key && r.mq[0].parts === null && !r.mq[0].sold && r.mq[1].parts && r.log.pose.join() === 'twirl' && r.card === null, '입어 보기: 내가 갈아입고 한 바퀴 · 그 마네킹은 민몸');
  ok(await page.evaluate(() => JSON.stringify(APP.state.settings.player)) === look0 && await page.evaluate(() => localStorage.getItem('ppolppol_v2')) === raw0 && (await U(page)).shells === 10, '입어 보기는 아무것도 저장하지 않는다');
  await page.click('#btn-room-mirror'); await page.waitForTimeout(300);
  r = await R(page);
  ok(r.log.close.join() === 'true,false' && r.log.pose.join() === 'twirl,pose' && r.said.includes('clothes|shop.mirror'), '거울: 가까이 · 자세 · 돌아옴');
  /* 둘째 것은 입어 보지 않고 살래 → 계산대의 영수증 */
  await page.click('#btn-mq-1'); await cardBtn(page, '살래');
  const total = stock[0].price + stock[1].price;
  ok(await page.evaluate(t => { const c = document.getElementById('shop-card'); return !!c && c.classList.contains('receipt') && c.querySelectorAll('.shop-rc-list li').length === 2 && c.querySelector('.shop-rc-sum .shell-n').textContent === String(t) && document.activeElement && document.activeElement.textContent === '그만'; }, total), '영수증: 고른 둘 · 합계 · 포커스는 그만');
  ok(await page.evaluate(() => { const c = document.getElementById('shop-card').getBoundingClientRect(), st = document.getElementById('status').getBoundingClientRect(); const sc = document.getElementById('scene').getBoundingClientRect(); return !(st.top <= sc.top + 8 && st.bottom > sc.top) || c.top >= st.bottom; }), '영수증도 상태 줄 아래');
  await shot(page, 'room-receipt-360');
  await cardBtn(page, '살래');
  r = await R(page);
  ok((await U(page)).shells === 10 && !!(await page.$('#shop-card.receipt')) && /모자라/.test(await page.textContent('#toast')) && !((await U(page)).owned || {})[stock[0].key], '모자라면 안 사진다 (영수증은 그대로)');
  await cardBtn(page, '그만');
  r = await R(page);
  ok(r.card === null && r.basket.join() === stock[0].key, '그만: 입어 보지 않고 고른 것만 내려놓는다');
  await page.evaluate(n => { APP.state.user.shells = n; APP.save(); }, total + 5);
  await page.click('#btn-mq-1'); await page.waitForTimeout(700);
  await page.evaluate(() => { [...document.querySelectorAll('#shop-card button')].pop().click(); const b = [...document.querySelectorAll('#shop-card.receipt button')].pop(); if (b) b.click(); });   /* 살래 → 영수증이 뜨자마자 살래 */
  ok((await U(page)).shells === total + 5, '영수증도 뜬 지 0.6 s 안의 살래는 안 받는다');
  await cardBtn(page, '살래');
  let u = await U(page); r = await R(page);
  ok(u.shells === 5 && u.owned[stock[0].key] === DAY && u.owned[stock[1].key] === DAY && u.shop.got[stock[0].key] === DAY, '계산: 합계만큼 조개가 나가고 둘 다 내 것');
  ok(r.log.wear.length === 2 && r.basket.length === 0 && r.mq[0].sold && r.mq[0].parts === null && r.mq[1].sold && !r.mq[2].sold && r.said.includes('clothes|shop.pay'), '입은 채 · 마네킹엔 팔림 표 · 가게 주인 줄');
  ok(JSON.parse(await page.evaluate(() => localStorage.getItem('ppolppol_v2'))).user.owned[stock[1].key] === DAY, '저장됐다');
  await page.waitForTimeout(900);
  await page.click('#btn-mq-0');
  ok(/입고 있어|입을래/.test(await page.textContent('#shop-card')) && !/살래/.test(await page.textContent('#shop-card')), '팔린 마네킹의 카드에는 살래가 없다');
  /* 안 사고 나가기 */
  await page.click('#btn-mq-2'); await cardBtn(page, '입어 보기');
  const offs = (await R(page)).log.tryOff.length;
  await enter(page, null); await page.waitForTimeout(150);   /* 가게 주인 줄은 대사 갈래가 방 바뀜을 처리한 다음 틱에 */
  r = await R(page);
  ok(r.key === null && r.log.tryOff.length === offs + 1 && r.log.tryOff.slice(-1)[0] === stock[2].cat && r.basket.length === 0 && r.said.slice(-1)[0] === 'clothes|shop.leave' && !(u.owned || {})[stock[2].key], '안 사고 나가면 제자리로 (가게 주인 줄)');
  ok((await U(page)).shells === 5, '나가도 조개는 그대로');
  /* 다음 날 다시 들어가면 새 네 벌 */
  await page.evaluate(d => { window.__ppolTest.today = d; }, NEXT);
  await enter(page, 'clothes');
  r = await R(page);
  ok(r.mq.every(m => !m.sold && m.parts) && !r.mq.some(m => m.parts[stock[0].cat] === stock[0].id || m.parts[stock[1].cat] === stock[1].id), '다음 날: 팔림 표가 걷히고 다른 옷이 온다');
  await page.evaluate(d => { window.__ppolTest.today = d; }, DAY);
  /* 잡화점 */
  await enter(page, 'goods');
  ok((await R(page)).said.slice(-1)[0] === 'goods|goods.enter', '잡화점: 가게 주인 줄');
  await page.click('#btn-shelf-2');
  ok(!!(await page.$('#shop-card .shop-seed')), '짝수 선반은 씨앗');
  await page.mouse.click(8, 300);
  await page.click('#btn-shelf-0');
  ok(await page.evaluate(() => { const c = document.getElementById('shop-card'); return !!c && c.parentNode.id === 'scene' && !!c.querySelector('.shop-seed') && [...c.querySelectorAll('button')].map(b => b.textContent).join() === '그만,살래'; }), '선반 톡 → 꼬리표 카드 (씨앗 봉투 · 그만 / 살래)');
  await shot(page, 'room-shelf-360');
  await cardBtn(page, '살래');
  u = await U(page);
  ok(u.shells === 3 && u.seeds === 2 && !(await page.$('#shop-card')) && (await R(page)).said.slice(-1)[0] === 'goods|shop.pay', '살래 → 조개 2 · 씨앗 +1 · 카드가 접힌다');
  await page.click('#btn-shelf-5');
  ok(!!(await page.$('#shop-card .shop-dye')) && await page.evaluate(() => document.getElementById('shop-card').hasAttribute('data-npc-avoid')), '홀수 선반은 염료 (카드는 대사창이 피하게 표시)');
  await cardBtn(page, '살래');
  ok((await U(page)).shells === 3 && !!(await page.$('#shop-card')), '염료 (6) 는 모자라면 안 사진다');
  await page.mouse.click(8, 300);
  ok(!(await page.$('#shop-card')), '카드 밖을 누르면 접힌다');
  await ctx.close();
}

async function sizesRun(browser) {
  console.log('== 화면 크기');
  for (const s of [[320, 568, 2], [360, 740, 2], [1280, 800, 1]]) {
    const ctx = await browser.newContext({ viewport: { width: s[0], height: s[1] }, deviceScaleFactor: s[2], locale: 'ko-KR', hasTouch: s[0] < 600, isMobile: s[0] < 600 });
    const { page } = await open(browser, { ctx, shells: 50 });
    await page.evaluate(stub);
    for (const kind of ['goods', 'clothes']) {
      await page.evaluate(k => APP.openShop(k), kind);
      const m = await page.evaluate(() => { const sh = document.getElementById('shop-sheet'), r = sh.getBoundingClientRect(), over = [...sh.querySelectorAll('.shop-tile, .bag-line')].filter(e => { const b = e.getBoundingClientRect(); return b.left < r.left - 0.5 || b.right > r.right + 0.5 || e.scrollWidth > e.clientWidth + 1; }).length;
        return { over, w: r.width, vw: innerWidth, small: [...sh.querySelectorAll('.shop-tile')].filter(e => e.getBoundingClientRect().height < 44).length, fs: [...sh.querySelectorAll('.sew-name, .shell-n')].map(e => parseFloat(getComputedStyle(e).fontSize)) }; });
      ok(m.over === 0 && m.w <= m.vw + 0.5, s[0] + ' ' + kind + ': 칸이 시트 안에');
      ok(m.small === 0 && m.fs.every(f => f >= 12), s[0] + ' ' + kind + ': 누를 칸 44px 이상 · 글자 크기 그대로 (' + Math.min.apply(null, m.fs) + ')');
      if (kind === 'clothes') { const k = (await tiles(page))[0].key; await tile(page, k); const fit = await page.evaluate(() => { const sh = document.getElementById('shop-sheet'), y = sh.querySelector('.sew-yes').getBoundingClientRect(); sh.querySelector('.sew-yes').scrollIntoView({ block: 'nearest' }); const y2 = sh.querySelector('.sew-yes').getBoundingClientRect(); return y2.bottom <= innerHeight + 0.5 && y2.top >= 0 && y.width > 0; }); ok(fit, s[0] + ': 입어 보기의 살래 단추에 닿는다'); if (s[0] === 320) await shot(page, 'tryon-320'); await page.waitForTimeout(650); await page.click('#shop-body .sew-no'); }
      await page.click('#shop-close');
    }
    await ctx.close();
  }
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const T = async f => { const t = Date.now(); await f(browser); console.log('   (' + ((Date.now() - t) / 1000).toFixed(1) + ' s)'); };
  try { if (process.env.ONLY_ROOM) await T(roomRun); else { await T(goodsRun); await T(clothesRun); await T(beachRun); await T(tabsRun); await T(roomRun); await T(sizesRun); } }
  catch (e) { fail++; console.log('  ERROR ' + (e && e.stack || e)); }
  await browser.close();
  console.log('\n' + pass + ' passed' + (fail ? ', ' + fail + ' FAILED' : ''));
  process.exit(fail ? 1 : 0);
})();
