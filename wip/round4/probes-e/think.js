/* 생각 풍선을 진짜 게임에서: node think.js <out.png> <hour> <anchor> <pixel 1|0> <text> */
const P = require('../probe-lib.js');
(async () => {
  const [out, hour, anchor, pix, text] = process.argv.slice(2);
  const b = await P.launch();
  const rec = P.REC(5); rec.settings.pixelFont = pix !== '0';
  const { page } = await P.open(b, { rec, look: { hour: +hour, anchor: anchor || 'center' } });
  await page.waitForTimeout(1500);
  await page.evaluate(t => APP.say(t, 'think', 60000), text || '모자의 역사 생각 중');
  await page.waitForTimeout(800);
  const info = await page.evaluate(() => { const e = document.getElementById('oct-bubble'), q = e.getBoundingClientRect(), s = document.getElementById('scene').getBoundingClientRect(); return { ua: e.getAttribute('data-ua'), tail: e.getAttribute('data-tail'), l: q.left, r: q.right, t: q.top, b: q.bottom, w: q.width, h: q.height, sl: s.left, sr: s.right, st: s.top }; });
  console.log(JSON.stringify(info));
  await page.screenshot({ path: out });
  await b.close();
})();
