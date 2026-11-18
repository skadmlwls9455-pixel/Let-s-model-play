/* wip/round6/notes/d-shots.js — lane D shots (not shipped). NODE_PATH=$(npm root -g) node wip/round6/notes/d-shots.js layout
   layout: play room with the booth, default view + 180, day + night, 360x740@2 and 412x915@2.625 -> wip/round6/shots/D/ */
const path = require('path'), fs = require('fs');
const P = require('../../round4/probe-lib.js');
const OUT = path.join(P.ROOT, 'wip/round6/shots/D');
async function room(b, o, hour, yaw, pre) {
  const { ctx, page } = await P.open(b, { w: o.w, h: o.h, dpr: o.dpr, look: { hour: hour, lantern: 4 }, lantern: 4 });
  await page.evaluate(async () => { APP.goRoom('play'); });
  await page.waitForFunction(() => APP.scene.view() === 'play' && !APP.scene.motion().door, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  if (yaw) { await page.evaluate(y => APP.scene.setLook({ yaw: y }), yaw); await page.waitForTimeout(600); }
  if (pre) await pre(page);
  const el = await page.$('#scene');
  const buf = await el.screenshot();
  await ctx.close();
  return buf;
}
async function layout() {
  const b = await P.launch(), files = [];
  for (const o of [{ w: 360, h: 740, dpr: 2, k: '360' }, { w: 412, h: 915, dpr: 2.625, k: '412' }]) {
    for (const [hour, hk] of [[14, 'day'], [21, 'night']]) for (const yaw of [0, 180]) {
      const f = path.join(OUT, `_layout-${o.k}-${hk}-${yaw}.png`);
      fs.writeFileSync(f, await room(b, o, hour, yaw)); files.push(f); console.log(f);
    }
  }
  await b.close();
  return files;
}
module.exports = { room };
if (require.main === module) {
  const what = process.argv[2] || 'layout';
  if (what === 'layout') layout().catch(e => { console.error(e); process.exit(1); });
}
/* shots 2..8 (dish, seated, bite, auras) */
async function scene(b, o, fn) {
  const { ctx, page } = await P.open(b, { w: o.w || 360, h: o.h || 740, dpr: o.dpr || 2, look: { hour: o.hour || 14, lantern: 4 }, lantern: 4 });
  const r = await fn(page);
  await ctx.close(); return r;
}
async function toPlay(page) { await page.evaluate(() => APP.goRoom('play')); await page.waitForFunction(() => APP.scene.view() === 'play' && !APP.scene.motion().dq, null, { timeout: 15000 }); await page.waitForTimeout(1200); }
async function shotEl(page) { return (await page.$('#scene')).screenshot(); }
async function rest() {
  const b = await P.launch(), out = {};
  /* dishes: octopus seated (focus), zoom 2x */
  for (const rec of ['jeon', 'jumeokbap', 'kkochi']) {
    out['dish-' + rec] = await scene(b, {}, async page => {
      await toPlay(page);
      await page.evaluate(r => { const s = APP.scene; s.setTableDish({ id: 'shot-' + r, recipe: r, look: { band: 1, plate: r === 'jeon' ? 0 : r === 'kkochi' ? 1 : 2 } }); return s.playerSitTable(); }, rec);
      await page.waitForTimeout(1500);
      await page.evaluate(() => APP.scene.octToTable({ instant: true }));
      await page.evaluate(() => { APP.scene.zoomStep(6); APP.scene.setLook({ focus: 'oct' }); }); await page.waitForTimeout(1500);
      return shotEl(page);
    });
  }
  out.seated = await scene(b, { w: 412, h: 915, dpr: 2.625 }, async page => {
    await toPlay(page);
    await page.evaluate(() => { APP.scene.setTableDish({ id: 's', recipe: 'jeon', look: { band: 1 } }); return APP.scene.playerSitTable(); }); await page.waitForTimeout(1200);
    await page.evaluate(() => APP.scene.octToTable()); await page.waitForTimeout(800);
    return shotEl(page);
  });
  out.bite = await scene(b, {}, async page => {
    await toPlay(page);
    await page.evaluate(() => { APP.scene.setTableDish({ id: 'b', recipe: 'kkochi', look: {} }); return APP.scene.playerSitTable(); }); await page.waitForTimeout(1200);
    await page.evaluate(() => APP.scene.octToTable({ instant: true })); await page.evaluate(() => APP.scene.octTableBeat('eat')); await page.waitForTimeout(500);
    await page.evaluate(() => { APP.scene.zoomStep(6); APP.scene.setLook({ focus: 'oct' }); }); await page.waitForTimeout(1200);
    await page.evaluate(async () => { const s = APP.scene; s.mealBite('oct'); for (let i = 0; i < 200; i++) { await new Promise(r => requestAnimationFrame(r)); if (s.tableInfo().pose.reach === 1) break; } });
    return shotEl(page);
  });
  out['aura-me-attic'] = await scene(b, { hour: 21 }, async page => { await page.evaluate(() => { APP.scene.setAura('me', 'sparkle'); APP.scene.setAura('oct', 'star'); }); await page.waitForTimeout(1500); return shotEl(page); });
  out['aura-me-yard'] = await scene(b, {}, async page => { await page.evaluate(() => APP.goRoom('yard')); await page.waitForFunction(() => APP.scene.view() === 'yard', null, { timeout: 15000 }); await page.waitForTimeout(1500); await page.evaluate(() => APP.scene.setAura('me', 'petal')); await page.waitForTimeout(1200); return shotEl(page); });
  await b.close();
  for (const k of Object.keys(out)) { const f = path.join(OUT, '_' + k + '.png'); fs.writeFileSync(f, out[k]); console.log(f); }
}
module.exports.rest = rest;
if (require.main === module && process.argv[2] === 'rest') rest().catch(e => { console.error(e); process.exit(1); });
