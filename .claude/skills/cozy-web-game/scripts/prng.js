// Deterministic seeding helpers for "daily seed" games (same date + same input → same outcome).
// fnv1a: string → uint32.  mulberry32: uint32 → () => [0,1).  Never call Math.random in game logic.
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
function hashSeed(...parts) { return fnv1a(parts.map(String).join('|')); }
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Local date key (NOT toISOString, which is UTC and flips the "day" at 9am KST).
function dateKey(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
// Weighted pick with a PRNG: items [{w, ...}]
function pickWeighted(items, rng, weightOf = x => x.w ?? 1) {
  const total = items.reduce((s, x) => s + weightOf(x), 0);
  let r = rng() * total;
  for (const it of items) { r -= weightOf(it); if (r <= 0) return it; }
  return items[items.length - 1];
}
if (typeof module !== 'undefined') module.exports = { fnv1a, hashSeed, mulberry32, dateKey, pickWeighted };

// Stronger alternative (public domain, bryc/code jshash/PRNGs.md): xmur3 string hash → sfc32 (128-bit state).
// mulberry32 is fine for small games; sfc32 avoids its "skips ~1/3 of 32-bit values" quirk. Warm up 12 rounds.
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return function () { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; };
}
function sfc32(a, b, c, d) {
  return function () {
    a |= 0; b |= 0; c |= 0; d |= 0;
    const t = (((a + b) | 0) + d) | 0; d = (d + 1) | 0;
    a = b ^ (b >>> 9); b = (c + (c << 3)) | 0; c = (c << 21) | (c >>> 11); c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}
function rngFor(seedStr) { const s = xmur3(seedStr); const r = sfc32(s(), s(), s(), s()); for (let i = 0; i < 12; i++) r(); return r; }
if (typeof module !== 'undefined') Object.assign(module.exports, { xmur3, sfc32, rngFor });
