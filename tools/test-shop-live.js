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
/* 11-24 다섯째 바퀴: 사는 건 계산대 목록에서만 (시트도 같은 목록). 목록 손잡이 */
const LS = page => page.evaluate(() => APP.shopList);
const lsRows = page => page.evaluate(() => [...document.querySelectorAll('#shop-list .ls-item')].map(e => ({ key: e.dataset.key, off: e.classList.contains('off'), on: e.classList.contains('on'), n: e.querySelector('.ls-n') ? +e.querySelector('.ls-n').textContent : (e.classList.contains('on') ? 1 : 0), text: e.textContent })));
const lsWait = page => page.waitForTimeout(650);   /* 목록이 뜬 뒤 0.6 s 안의 누름은 받지 않는다 */
const lsAdd = async (page, key, minus) => { const plus = await page.$('#shop-list .ls-item[data-key="' + key + '"] .ls-plus'); await page.click('#shop-list .ls-item[data-key="' + key + '"] ' + (plus ? (minus ? '.ls-minus' : '.ls-plus') : '.ls-row'), { force: true }); };   /* 가진 줄은 aria-disabled (낭독기용) — 톡하면 한 줄을 보이니 그대로 누른다 */
const lsBuy = page => page.click('#shop-list .ls-buy');
const lsMsg = page => page.evaluate(() => { const m = document.querySelector('#shop-list .ls-msg'); return m ? m.textContent : ''; });
const purse = page => page.evaluate(() => { const p = document.querySelector('#shop-list .ls-purse'); return p ? p.textContent.replace(/\s+/g, ' ').trim() : ''; });
const setShells = (page, n) => page.evaluate(n => { APP.state.user.shells = n; APP.save(); }, n);
const shot = async (page, name) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.waitForTimeout(400); await page.screenshot({ path: path.join(SHOTS, name + '.png') }); } };

async function goodsRun(browser) {
  console.log('== 잡화점 (시트 · 목록)');
  const { ctx, page } = await open(browser, { shells: 0, q: '&scene=2d' });
  ok(await page.evaluate(() => { const w = APP.wardrobe; APP.wardrobe = undefined; const r = APP.openShop('clothes'); APP.wardrobe = w; return r; }) === false && !(await page.evaluate(() => document.getElementById('shop-sheet').open)), '옷장이 없으면 옷가게는 안 열린다');
  ok(await page.evaluate(() => APP.openShop('goods')) === true, '잡화점 열기');
  let rows = await lsRows(page);
  ok(await page.textContent('#shop-h') === '잡화점' && rows.length === 4 && rows[0].key === 'seed' && rows.filter(x => /^dye:/.test(x.key)).length === 3, '목록: 씨앗 + 그날 염료 셋');
  ok(/조개\s*0/.test(await purse(page)), '목록 위에 가진 조개');
  ok(await page.evaluate(() => { const a = document.activeElement; return !!a && !!a.closest('#shop-sheet'); }), '열면 포커스가 시트 안 (제목 먼저 — 다른 시트와 같다)');
  await lsWait(page);
  await lsAdd(page, 'seed');
  ok((await LS(page)).total === 0 && /조개가 2개 모자라/.test(await lsMsg(page)) && (await U(page)).shells === 0, '조개가 없으면 안 담기고 모자란 수 한 줄');
  await setShells(page, 20); await page.evaluate(() => APP.openShop('goods')); await lsWait(page);
  await shot(page, 'goods-360');
  await lsAdd(page, 'seed'); await lsAdd(page, 'seed');
  let L = await LS(page);
  ok(L.cart.seed === 2 && L.total === 4 && (await U(page)).shells === 20, '담기: 씨앗 둘 (아직 안 나간다)');
  ok(/조개\s*20/.test(await purse(page)) && /담으면 16 남아/.test(await purse(page)), '조개 · 담으면 남는 수');
  await lsAdd(page, 'seed'); await lsAdd(page, 'seed');
  ok((await LS(page)).cart.seed === 3 && /오늘은 이게 다야/.test(await lsMsg(page)), '씨앗은 그날 남은 수 (셋) 까지');
  await lsAdd(page, 'seed', true);
  ok((await LS(page)).cart.seed === 2, '− 로 빼기');
  const dye = rows[1].key;
  for (let i = 0; i < 3; i++) await lsAdd(page, dye);
  L = await LS(page);
  ok(L.cart[dye] === 2 && L.total === 16 && /조개가 2개 모자라/.test(await lsMsg(page)), '담으면 모자라는 것은 안 담긴다');
  await shot(page, 'goods-short-360');
  await page.evaluate(() => { const b = document.querySelector('#shop-list .ls-buy'); b.click(); b.click(); });   /* 사기 두 번 톡 */
  let u = await U(page);
  ok(u.shells === 4 && u.seeds === 3 && u.dyes[dye.slice(4)] === (dye === 'dye:red' ? 3 : 2) && u.future.keep === 1 && u.dyes.later === 4, '사기: 한 번에 계산 (두 번 톡해도 한 번 · 모르는 값 그대로)');
  ok(await page.evaluate(() => /냈어/.test(document.getElementById('shop-list').textContent) && !document.querySelector('#shop-list .ls-buy')), '같은 자리가 영수증으로 (냈어 · 단추 없음)');
  await shot(page, 'goods-paid-360');
  ok(await page.evaluate(() => +document.getElementById('bag-n').textContent) === 4, '조개 꼬리표도 같이');
  await page.waitForTimeout(1700);
  rows = await lsRows(page);
  ok(rows.length === 4 && !(await LS(page)).done && (await LS(page)).total === 0, '1.5 s 뒤 새 목록 (담은 것 없음)');
  await lsWait(page);
  await lsAdd(page, 'seed');
  ok((await LS(page)).cart.seed === 1, '씨앗은 남은 하나까지');
  await page.click('#shop-close');
  ok((await U(page)).shells === 4 && (await U(page)).seeds === 3, '닫으면 담은 것은 버린다 (조개 그대로)');
  await page.evaluate(() => APP.openShop('goods'));
  ok((await LS(page)).total === 0, '다시 열면 담은 것 없음');
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  await page.reload(); await page.waitForFunction(() => window.APP && APP.openShop, null, { timeout: 30000 }); await page.waitForTimeout(800);
  u = await U(page);
  ok(u.shells === 4 && u.seeds === 3 && u.shop.day.seeds === 2 && u.future.keep === 1, '새로고침해도 그대로');
  await page.evaluate(d => { window.__ppolTest.today = d; }, NEXT);
  await page.evaluate(() => APP.openShop('goods'));
  ok((await lsRows(page)).length === 4 && await page.evaluate(() => APP.shopStock('goods').items[0].left) === 3, '다음 날: 씨앗 다시 셋');
  await ctx.close();
}

async function clothesRun(browser) {
  console.log('== 옷가게 (시트 · 목록)');
  const { ctx, page } = await open(browser, { shells: 3, q: '&scene=2d' });
  ok(await page.evaluate(stub) === 6, '대역 옷장 여섯 개');
  ok(await page.evaluate(() => APP.openShop('clothes')) === true && await page.textContent('#shop-h') === '옷가게', '옷가게 열기');
  const stock = await page.evaluate(() => APP.shopStock('clothes').items);
  let rows = await lsRows(page);
  ok(rows.length === 4 && rows.every(x => !x.off) && rows.map(x => x.key).join() === stock.map(x => x.key).join(), '목록: 오늘의 네 벌');
  const look0 = await page.evaluate(() => JSON.stringify(APP.state.settings.player));
  const dear = stock.slice().sort((a, b) => b.price - a.price)[0], cheap = stock.slice().sort((a, b) => a.price - b.price)[0];
  await lsWait(page);
  await lsAdd(page, dear.key);
  ok(!(await LS(page)).cart[dear.key] && /모자라/.test(await lsMsg(page)), '조개가 모자라면 안 담긴다');
  await setShells(page, cheap.price + dear.price - 1); await page.evaluate(() => APP.openShop('clothes')); await lsWait(page);
  await lsAdd(page, cheap.key); await lsAdd(page, dear.key);
  ok(Object.keys((await LS(page)).cart).join() === cheap.key && /모자라/.test(await lsMsg(page)), '합계가 넘으면 둘째는 안 담긴다');
  await lsAdd(page, cheap.key);
  ok(!Object.keys((await LS(page)).cart).length, '한 번 더 톡하면 빠진다 (옷은 하나씩)');
  await lsAdd(page, cheap.key);
  await shot(page, 'clothes-360');
  ok(await page.evaluate(() => JSON.stringify(APP.state.settings.player)) === look0, '담기는 아무것도 바꾸지 않는다');
  /* 옷장이 받지 않으면 조개도 안 나간다 */
  await page.evaluate(() => { window.__own = APP.ownItem; APP.ownItem = () => false; });
  await lsBuy(page);
  let u = await U(page);
  ok(u.shells === cheap.price + dear.price - 1 && !(u.owned || {})[cheap.key] && /못 샀어/.test(await lsMsg(page)), '옷장이 받지 않으면 조개도 안 나간다');
  await page.evaluate(() => { APP.ownItem = window.__own; });
  await lsBuy(page);
  u = await U(page);
  ok(u.shells === dear.price - 1 && u.owned[cheap.key] === DAY && u.shop.got[cheap.key] === DAY, '사기: 조개가 나가고 옷장에 들어온다');
  ok(new RegExp(cheap.name + '(을|를) 샀어').test(await page.textContent('#toast')), '산 것을 한 줄로');
  ok(await page.evaluate(() => window.__said.slice(-1)[0]) === 'clothes|shop.thanks', '가게 주인 줄 (산 뒤)');
  await page.waitForTimeout(1700);
  rows = await lsRows(page);
  ok(rows.find(x => x.key === cheap.key).off && rows.filter(x => x.off).length === 1, '산 줄은 가짐 표시 (담기 안 됨)');
  await shot(page, 'stamp-360');
  await lsWait(page);
  await lsAdd(page, cheap.key);
  ok(!(await LS(page)).cart[cheap.key] && /이미 가지고 있어/.test(await lsMsg(page)), '가진 것은 안 담긴다');
  await page.reload(); await page.waitForFunction(() => window.APP && APP.openShop, null, { timeout: 30000 }); await page.waitForTimeout(800);
  await page.evaluate(stub); await page.evaluate(() => APP.openShop('clothes'));
  rows = await lsRows(page); u = await U(page);
  if (!(u.owned[cheap.key] === DAY && (rows.find(x => x.key === cheap.key) || {}).off)) console.log('   (새로고침 뒤) ' + JSON.stringify({ owned: u.owned, rows: rows.map(x => x.key + (x.off ? '*' : '')), cheap: cheap.key, today: await page.evaluate(() => window.__ppolTest.today) }));
  ok(u.owned[cheap.key] === DAY && u.shells === dear.price - 1 && (rows.find(x => x.key === cheap.key) || {}).off, '새로고침해도 산 옷 · 표시 그대로');
  await page.evaluate(d => { sessionStorage.setItem('__day', d); window.__ppolTest.today = d; APP.openShop('clothes'); }, NEXT);
  rows = await lsRows(page);
  ok(rows.length === 4 && !rows.some(x => x.key === cheap.key) && rows.every(x => !x.off), '다음 날: 산 옷은 빠지고 다른 것이 온다');
  await ctx.close();
}

const cardBtn = async (page, text, wait) => { if (wait !== false) await page.waitForTimeout(700); await page.click('#shop-card button:has-text("' + text + '")'); if (!(await page.$('#shop-card'))) await page.waitForTimeout(650); };   /* 카드가 닫혔으면 0.6 s 쉼 (빠른 두 번 톡 막이) 이 지난 뒤 다음 누름 */
const inScene = page => page.evaluate(() => { const c = document.getElementById('shop-card'); if (!c) return null; const sc = document.getElementById('scene').getBoundingClientRect(), r = c.getBoundingClientRect(), st = document.getElementById('status').getBoundingClientRect(), g = document.getElementById('btn-go'), gr = g.getBoundingClientRect();
  if (sc.height < 560) return { ok: true, small: true };
  const over = st.top <= sc.top + 8 && st.bottom > sc.top, goIn = g.offsetParent && gr.top > sc.top && gr.top < sc.bottom;
  return { ok: (!over || r.top >= st.bottom) && (!goIn || r.bottom <= gr.top) && r.left >= sc.left && r.right <= sc.right + 0.5, r: [r.left, r.top, r.right, r.bottom] }; });
async function roomRun(browser) {
  console.log('== 가게 방 (계산대 목록)');
  const { ctx, page } = await open(browser, { shells: 10, q: SHOTS ? '' : '&scene=2d' });
  await page.evaluate(stub); await page.evaluate(roomStub);
  const stock = await page.evaluate(() => APP.shopStock('clothes').items), look0 = await page.evaluate(() => JSON.stringify(APP.state.settings.player)), raw0 = await page.evaluate(() => localStorage.getItem('ppolppol_v2'));
  await enter(page, 'clothes'); await page.waitForTimeout(150);
  let r = await R(page);
  ok(r.key === 'clothes' && r.mq.length === 4 && r.mq.every((m, i) => m.slot === 'mq' + i && !m.sold && m.parts && m.parts[stock[i].cat] === stock[i].id && Object.keys(m.parts).length === 1 && Array.isArray(m.pos)), '들어가면 마네킹 넷이 오늘의 네 벌');
  ok(r.said.join() === 'clothes|shop.enter', '가게 주인 줄 한 번');
  /* 마네킹: 입어 보기만 (사는 건 계산대) */
  await page.click('#btn-mq-0'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => { const c = document.getElementById('shop-card'); return !!c && c.parentNode.id === 'scene' && c.tagName !== 'DIALOG' && c.classList.contains('tag') && [...c.querySelectorAll('button')].map(b => b.textContent).join() === '입어 보기' && /계산대에서 살 수 있어/.test(c.textContent); }), '마네킹 카드: 입어 보기 · 계산대에서 살 수 있어 (살래 없음)');
  await shot(page, 'room-tag-360');
  await cardBtn(page, '입어 보기');
  r = await R(page);
  ok(r.trying[stock[0].cat] === stock[0].id && r.tried.join() === stock[0].key && r.mq[0].parts === null && r.log.pose.join() === 'twirl', '입어 보기: 내가 갈아입고 · 그 마네킹은 민몸');
  ok(await page.evaluate(() => JSON.stringify(APP.state.settings.player)) === look0 && await page.evaluate(() => localStorage.getItem('ppolppol_v2')) === raw0, '입어 보기는 아무것도 저장하지 않는다');
  await page.click('#btn-room-mirror'); await page.waitForTimeout(300);
  ok((await R(page)).log.close.join() === 'true,false' && (await R(page)).said.includes('clothes|shop.mirror'), '거울: 가까이 · 자세 · 돌아옴');
  /* 계산대 → 목록 */
  await page.waitForTimeout(700);
  await page.click('#btn-room-counter'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => { const c = document.getElementById('shop-card'); return !!c && c.parentNode.id === 'scene' && c.classList.contains('list') && !!c.querySelector('#shop-list') && !document.querySelector('dialog[open]'); }), '계산대 톡 → 장면 안의 목록 카드');
  let rows = await lsRows(page);
  ok(rows.length === 4 && /입어 보는 중/.test(rows.find(x => x.key === stock[0].key).text), '목록: 네 벌 · 입어 보는 것 표시');
  ok((await inScene(page)).ok, '목록 카드는 상태 줄 아래 · 큰 단추 위 · 장면 안');
  ok(/조개\s*10/.test(await purse(page)), '목록 위에 조개 10');
  await shot(page, 'room-list-360');
  await lsWait(page);
  const total = stock[0].price + stock[1].price;
  await lsAdd(page, stock[0].key); await lsAdd(page, stock[1].key);
  let L = await LS(page);
  if (total > 10) ok(Object.keys(L.cart).length < 2 && /모자라/.test(await lsMsg(page)), '모자라면 안 담긴다');
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  ok(!(await page.$('#shop-card')) && (await U(page)).shells === 10, 'Esc: 목록을 닫고 담은 것은 버린다');
  await setShells(page, total + 5);
  await page.waitForTimeout(700); await page.evaluate(() => document.getElementById(document.getElementById('scene').getBoundingClientRect().height < 560 ? 'btn-npc-clothes' : 'btn-room-counter').click()); await page.waitForTimeout(200);   /* 가게 문어 단추는 NPC 갈래가 보이고 숨긴다 — 같은 click 길 (3D 대역 방에선 건물 갈래가 먼저 걸어가게 하므로 계산대로; 문어 톡은 진짜 빌드에서 본다) */
  ok(!!(await page.$('#shop-card.list')), '가게 문어 톡 → 같은 목록');
  await lsWait(page);
  await lsAdd(page, stock[0].key); await lsAdd(page, stock[1].key);
  ok(/담으면 5 남아/.test(await purse(page)), '담으면 5 남아');
  await shot(page, 'room-cart-360');
  await page.evaluate(() => { const b = document.querySelector('#shop-list .ls-buy'); b.click(); b.click(); });
  let u = await U(page); r = await R(page);
  ok(u.shells === 5 && u.owned[stock[0].key] === DAY && u.owned[stock[1].key] === DAY, '사기: 합계만큼 한 번 (두 번 톡해도) · 둘 다 내 것');
  ok(r.log.wear.length === 1 && r.log.wear[0] === stock[0].key && r.mq[0].sold && r.mq[1].sold && !r.mq[2].sold && r.said.includes('clothes|shop.pay'), '입어 보던 것은 입은 채 · 마네킹엔 팔림 · 가게 주인 줄');
  ok(await page.evaluate(() => { const c = document.getElementById('shop-card'); return !!c && /냈어/.test(c.textContent) && !c.querySelector('button'); }), '같은 카드가 영수증 (냈어 · 단추 없음)');
  await shot(page, 'room-paid-360');
  await page.waitForTimeout(1700);
  ok(!(await page.$('#shop-card')), '1.5 s 뒤 영수증이 닫힌다');
  /* 안 사고 나가기 */
  await page.waitForTimeout(700); await page.click('#btn-mq-2'); await cardBtn(page, '입어 보기');
  await page.click('#btn-room-counter'); await lsWait(page); await lsAdd(page, stock[2].key);
  const offs = (await R(page)).log.tryOff.length;
  await enter(page, null); await page.waitForTimeout(150);
  r = await R(page);
  ok(r.key === null && !(await page.$('#shop-card')) && r.log.tryOff.length === offs + 1 && r.said.slice(-1)[0] === 'clothes|shop.leave' && (await U(page)).shells === 5 && !((await U(page)).owned || {})[stock[2].key], '방을 나가면 목록 · 입어 본 것 · 담은 것 다 제자리 (조개 그대로)');
  /* 잡화점 */
  await enter(page, 'goods'); await page.waitForTimeout(150);
  ok((await R(page)).said.slice(-1)[0] === 'goods|goods.enter', '잡화점: 가게 주인 줄');
  let sh = await page.evaluate(() => window.__room.shelf.slice(-1)[0]);
  ok(Array.isArray(sh) && sh.length === 4 && sh[0].type === 'seed' && sh[0].left === 3 && sh.slice(1).every(x => x.type === 'dye' && /^#/.test(x.hex)), '들어가면 선반 그림 = 그날 파는 것 (씨앗 셋 · 염료 셋)');
  await page.click('#btn-shelf-0'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => { const c = document.getElementById('shop-card'); return !!c && !!c.querySelector('.shop-seed') && !c.querySelector('button') && /계산대에서 살 수 있어/.test(c.textContent); }), '선반 톡: 이름 · 계산대에서 살 수 있어 (살래 없음)');
  await shot(page, 'room-shelf-360');
  await page.mouse.click(8, 300);
  await page.waitForTimeout(700); await page.click('#btn-room-counter'); await lsWait(page);
  await lsAdd(page, 'seed'); await lsAdd(page, 'seed');
  await lsBuy(page);
  u = await U(page);
  ok(u.shells === 1 && u.seeds === 3 && (await R(page)).said.slice(-1)[0] === 'goods|shop.pay', '잡화점: 씨앗 둘을 한 번에');
  sh = await page.evaluate(() => window.__room.shelf.slice(-1)[0]);
  ok(sh && sh[0].type === 'seed' && sh[0].left === 1, '산 뒤 선반도 (씨앗 남은 하나)');
  await page.waitForTimeout(1700);
  /* 시스템 글꼴 · 빠른 두 번 톡 · 움직임 줄이기 */
  await page.evaluate(() => { APP.state.settings.pixelFont = false; document.documentElement.setAttribute('data-font', 'system'); });
  await page.click('#btn-room-counter'); await page.waitForTimeout(300);
  const fs1 = await page.evaluate(() => [...document.querySelectorAll('#shop-list .ls-title, #shop-list .ls-name, #shop-list .shell-n, #shop-list .btn, #shop-list .ls-n')].map(e => parseFloat(getComputedStyle(e).fontSize)));
  ok(fs1.length >= 6 && fs1.every(f => f >= 16), '시스템 글꼴: 목록 글자 16px 이상 (' + Math.min.apply(null, fs1) + ')');
  ok(await page.evaluate(() => [...document.querySelectorAll('#shop-list .ls-plus, #shop-list .ls-minus, #shop-list .ls-buy, #shop-list .ls-close')].every(b => b.getBoundingClientRect().height >= 44)), '누를 것 44px 이상');
  await page.keyboard.press('Escape'); await page.evaluate(() => { APP.state.settings.pixelFont = true; document.documentElement.setAttribute('data-font', 'pixel'); });
  await enter(page, 'clothes'); await page.waitForTimeout(150);
  await page.waitForTimeout(700); await page.click('#btn-mq-3'); await page.waitForTimeout(700);
  const b1 = await page.evaluate(() => { const b = [...document.querySelectorAll('#shop-card button')].find(x => x.textContent === '입어 보기'); const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await page.evaluate(b => { const m = document.getElementById('btn-room-counter'); m.style.left = (b[0] - 22) + 'px'; m.style.top = (b[1] - 22) + 'px'; }, b1);   /* 입어 보기 바로 밑에 계산대 단추 */
  await page.mouse.click(b1[0], b1[1]); await page.waitForTimeout(90); await page.mouse.click(b1[0], b1[1]); await page.waitForTimeout(300);
  ok((await R(page)).tried.length === 1 && !(await page.$('#shop-card')), '빠른 두 번 톡: 입어 보기만 되고 밑의 목록은 안 열린다');
  await enter(page, null); await page.waitForTimeout(150);
  await page.evaluate(() => { APP.state.settings.motion = 'reduce'; document.documentElement.setAttribute('data-motion', 'reduce'); window.__gi = []; window.__giOld = APP.goInside; APP.goInside = k => { window.__gi.push(k); document.dispatchEvent(new CustomEvent('ppol:room', { detail: { key: k } })); return Promise.resolve(true); }; });
  await page.evaluate(() => APP.shopGo('clothes')); await page.waitForTimeout(400);
  ok(await page.evaluate(() => window.__gi.join() === 'clothes' && !document.getElementById('shop-sheet').open && APP.shopRoom.key === 'clothes'), '움직임 줄이기에서도 가게 문은 방으로');
  await page.evaluate(() => { APP.goInside = () => Promise.resolve(false); document.dispatchEvent(new CustomEvent('ppol:room', { detail: { key: null } })); });
  await page.waitForTimeout(100);
  await page.evaluate(() => APP.shopGo('goods')); await page.waitForTimeout(400);
  ok(await page.evaluate(() => document.getElementById('shop-sheet').open && !!document.querySelector('#shop-body #shop-list')), '못 들어가면 (2D 처럼) 시트 안의 같은 목록');
  await page.evaluate(() => { document.getElementById('shop-sheet').close(); APP.goInside = window.__giOld; APP.state.settings.motion = 'auto'; document.documentElement.setAttribute('data-motion', 'auto'); });
  await ctx.close();
}

async function sizesRun(browser) {
  console.log('== 화면 크기 (목록)');
  for (const s of [[320, 568, 2], [360, 740, 2], [740, 360, 2], [1280, 800, 1]]) {
    const ctx = await browser.newContext({ viewport: { width: s[0], height: s[1] }, deviceScaleFactor: s[2], locale: 'ko-KR', hasTouch: s[0] < 800, isMobile: s[0] < 800 });
    const { page } = await open(browser, { ctx, shells: 50, q: '&scene=2d' });
    await page.evaluate(stub);
    for (const font of ['pixel', 'system']) {
      await page.evaluate(f => { APP.state.settings.pixelFont = f === 'pixel'; document.documentElement.setAttribute('data-font', f); }, font);
      for (const kind of ['goods', 'clothes']) {
        const opened = await page.evaluate(k => APP.openShop(k), kind);
        await page.waitForTimeout(450);   /* 시트가 다 올라온 뒤 잰다 */
        if (!opened || !(await page.$('#shop-list'))) { ok(false, s[0] + 'x' + s[1] + ' ' + font + ' ' + kind + ': 시트가 열린다 (' + opened + ')'); continue; }
        const m = await page.evaluate(() => { const sh = document.getElementById('shop-sheet'), r = sh.getBoundingClientRect(), L = document.getElementById('shop-list');
          const over = [...L.querySelectorAll('.ls-item, .ls-btns, .ls-head')].filter(e => { const b = e.getBoundingClientRect(); return b.left < r.left - 0.5 || b.right > r.right + 0.5; }).length;
          const buy = L.querySelector('.ls-buy'); buy.scrollIntoView({ block: 'nearest' }); const br = buy.getBoundingClientRect();
          return { over, fs: [...L.querySelectorAll('.ls-name, .shell-n, .btn, .ls-title')].map(e => parseFloat(getComputedStyle(e).fontSize)), small: [...L.querySelectorAll('.ls-name, .shell-n, .btn, .ls-title')].filter(e => parseFloat(getComputedStyle(e).fontSize) < 16).map(e => e.className + ':' + e.textContent.slice(0, 8) + ':' + getComputedStyle(e).fontSize).slice(0, 4), reach: br.bottom <= innerHeight + 0.5 && br.top >= 0, br: [Math.round(br.top), Math.round(br.bottom), innerHeight, Math.round(sh.getBoundingClientRect().bottom), sh.scrollHeight, sh.clientHeight], rows: L.querySelectorAll('.ls-item').length }; });
        if (!(m.fs.every(f => f >= 16) && m.reach)) console.log('   DBG', JSON.stringify({ small: m.small, br: m.br }));
        ok(m.over === 0 && m.rows === 4, s[0] + 'x' + s[1] + ' ' + font + ' ' + kind + ': 줄이 시트 안에');
        ok(m.fs.every(f => f >= 16) && m.reach, s[0] + 'x' + s[1] + ' ' + font + ' ' + kind + ': 글자 16px 이상 · 사기 단추에 닿는다 (' + Math.min.apply(null, m.fs) + ')');
        if (s[0] === 320 && font === 'pixel' && kind === 'goods') await shot(page, 'goods-320');
        await page.click('#shop-close');
      }
    }
    await ctx.close();
  }
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
  await lsWait(A); await lsAdd(A, it.key); await lsBuy(A); await A.waitForTimeout(1700);
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
  ok(await A.evaluate(k => { const e = document.querySelector('#shop-list .ls-item[data-key="' + k + '"]'); return !!e && e.classList.contains('off'); }, it.key), '열린 목록의 가짐 표시도 그대로');
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
  mk('btn-room-mirror', 290, 150); mk('btn-room-counter', 150, 290); mk('btn-npc-clothes', 250, 320); mk('btn-npc-goods', 250, 320);
  for (let i = 0; i < 6; i++) mk('btn-shelf-' + i, 16 + i * 56, 190);
  const L = window.__room = { mq: [], pose: [], close: [], tryOff: [], wear: [] }, T = window.__try = {};
  APP.scene.enterRoom = () => Promise.resolve({ ok: true }); APP.scene.inRoom = () => null;
  APP.scene.roomSlots = k => ({ slots: { mq0: [-1.8, 0.14, -2, 0], mq1: [-0.6, 0.14, -2, 0], mq2: [0.6, 0.14, -2, 0], mq3: [1.8, 0.14, -2, 0], counter: [2, 0, 1, 0] } });
  APP.scene.mannequins = (k, l) => { L.mq.push(JSON.parse(JSON.stringify(l))); };
  L.shelf = []; APP.scene.goodsShelf = l => { L.shelf.push(JSON.parse(JSON.stringify(l))); return 1; };
  APP.scene.playerPose = n => { L.pose.push(n); return Promise.resolve(); };
  APP.scene.playerCloseup = on => { L.close.push(on); return Promise.resolve(); };
  APP.tryOn = (c, id) => { T[c] = id; }; APP.tryOff = c => { L.tryOff.push(c); delete T[c]; }; APP.trying = () => Object.assign({}, T);
  APP.wear = (c, id) => { L.wear.push(c + ':' + id); delete T[c]; return APP.setPlayerPart(c, id); };
}
const enter = (page, key) => page.evaluate(k => document.dispatchEvent(new CustomEvent('ppol:room', { detail: { key: k } })), key);
const R = page => page.evaluate(() => Object.assign({ mq: window.__room.mq.slice(-1)[0], log: window.__room, trying: Object.assign({}, window.__try), said: window.__said.slice() }, APP.shopRoom));
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const T = async f => { const t = Date.now(); await f(browser); console.log('   (' + ((Date.now() - t) / 1000).toFixed(1) + ' s)'); };
  try { if (process.env.ONLY_SIZES) await T(sizesRun); else if (process.env.ONLY_ROOM) await T(roomRun); else { await T(goodsRun); await T(clothesRun); await T(beachRun); await T(tabsRun); await T(roomRun); await T(sizesRun); } }
  catch (e) { fail++; console.log('  ERROR ' + (e && e.stack || e)); }
  await browser.close();
  console.log('\n' + pass + ' passed' + (fail ? ', ' + fail + ' FAILED' : ''));
  process.exit(fail ? 1 : 0);
})();
