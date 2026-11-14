/* wip/round4/verify/V2/vlib.js — V2 검증 탐침 도우미 (배포 안 됨). probe-lib 를 감싸고 몇 가지를 더한다. */
const P = require('../../probe-lib.js');
const path = require('path');
const SHOTS = __dirname;
/* 진짜 손가락 톡 (CDP touchStart → touchEnd, 한 점) */
async function tap(page, x, y, holdMs) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  if (holdMs) await page.waitForTimeout(holdMs);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}
async function rect(page, sel) {
  return page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const q = e.getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height, hidden: e.hidden, vis: getComputedStyle(e).visibility, disp: getComputedStyle(e).display }; }, sel);
}
async function tapEl(page, sel, fx, fy) {
  const r = await rect(page, sel); if (!r || !r.w) return null;
  await tap(page, r.x + r.w * (fx == null ? 0.5 : fx), r.y + r.h * (fy == null ? 0.5 : fy)); return r;
}
function shot(page, name) { return page.screenshot({ path: path.join(SHOTS, name) }); }
async function idle(page) { await page.waitForFunction(() => window.APP && !APP.goResting, null, { timeout: 20000 }); }
module.exports = Object.assign({}, P, { tap, rect, tapEl, shot, idle, SHOTS });
