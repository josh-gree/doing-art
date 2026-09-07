// Seed-string RNG for tools/sample.mjs.
// This is the same xmur3 + mulberry32 as every project's generative/rng.js.
// The sampler keeps its own copy so that changing a project's engine cannot
// silently move the seeds a batch draws — a trap recorded in
// docs/handover_skills.md §11.
// Seeded RNG. One stream, hashed from a seed string, feeding every choice the
// sampler makes — including p5's own randomSeed/noiseSeed. A single Math.random()
// anywhere downstream and reproducibility is gone.
//
// Classic script, not a module: p5 runs in global mode and starts on the window
// `load` event, so everything has to be a plain global by then.

function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Helpers. These earn their keep: every sampled value in params.js goes through
// one of them, so the stream stays in one place.
function makeRng(seedString) {
  const rnd = mulberry32(xmur3(String(seedString))());
  const f = (a, b) => a + (b - a) * rnd();
  const i = (a, b) => Math.floor(a + (b - a + 1) * rnd());
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const chance = (p) => rnd() < p;
  // Weighted choice over [[value, weight], ...]. Uniform choices are how a
  // sampler ends up producing mud a third of the time (§8); this is the fix.
  const weighted = (pairs) => {
    let total = 0;
    for (const [, w] of pairs) total += w;
    let r = rnd() * total;
    for (const [v, w] of pairs) {
      r -= w;
      if (r <= 0) return v;
    }
    return pairs[pairs.length - 1][0];
  };
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let k = a.length - 1; k > 0; k--) {
      const j = Math.floor(rnd() * (k + 1));
      [a[k], a[j]] = [a[j], a[k]];
    }
    return a;
  };
  return { rnd, f, i, pick, chance, weighted, shuffle };
}

if (typeof window !== "undefined") window.makeRng = makeRng;
if (typeof module !== "undefined" && module.exports) module.exports = { makeRng, xmur3, mulberry32 };
