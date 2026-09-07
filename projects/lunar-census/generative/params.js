// sampleConfig(seed) -> CFG.  The taste lives here; engine.js is only capability.
//
// The axes are the ones that read at 300px in
// projects/lunar-census/ANALYSIS.md: the ink ladder (colours AND their
// quantile distribution, which is the plate's radial geography), lattice scale,
// the sampling ratio and its angular jitter, the gate, the seam, tick
// orientation, and the ground. Everything that did not read — the dust, the
// spatter, the paper fibres, the misregistration ghost — is fixed, or varied
// just enough that two seeds are not identically printed.
//
// Sampling runs in family order, because later stages read earlier choices;
// that is how the guardrails get expressed. Guardrails CLAMP, they never
// re-roll: a re-roll desynchronises the stream and makes seeds unstable across
// code edits.

const CANVAS = 3000;

// ---------------------------------------------------------------------------
// Ladders. Curated as ordered SETS, outermost rung first, because the ladder is
// a ranking: pickInk() reads a tick's rank in the census, and the census is
// built outer-to-inner, so rung order IS radial order. Sampling seven
// independent colours would throw away the thing that makes it a census.
// `g` is the gold-style double overprint, `u` the crimson-style underprint.
// ---------------------------------------------------------------------------
const LADDERS = [
  {
    name: "lunar",
    w: 3,
    night: true,
    rungs: [
      [[88, 100, 118], 0, 0],
      [[60, 138, 120], 0, 0],
      [[178, 138, 52], 0, 0],
      [[164, 82, 44], 0, 0],
      [[174, 56, 68], 0, 1],
      [[238, 231, 210], 0, 0],
      [[212, 160, 50], 1, 0],
    ],
  },
  {
    name: "oxide",
    w: 2,
    night: true,
    rungs: [
      [[96, 104, 108], 0, 0],
      [[70, 118, 124], 0, 0],
      [[142, 126, 74], 0, 0],
      [[178, 96, 42], 0, 0],
      [[146, 48, 40], 0, 1],
      [[236, 226, 206], 0, 0],
      [[198, 138, 62], 1, 0],
    ],
  },
  {
    name: "verdigris",
    w: 2,
    night: true,
    rungs: [
      [[104, 110, 100], 0, 0],
      [[62, 146, 128], 0, 0],
      [[126, 148, 92], 0, 0],
      [[186, 152, 46], 0, 0],
      [[158, 70, 44], 0, 1],
      [[232, 232, 216], 0, 0],
      [[206, 176, 72], 1, 0],
    ],
  },
  {
    name: "ash-rose",
    w: 2,
    night: false,
    rungs: [
      [[118, 108, 108], 0, 0],
      [[150, 116, 124], 0, 0],
      [[186, 132, 112], 0, 0],
      [[172, 96, 68], 0, 0],
      [[132, 44, 58], 0, 1],
      [[240, 230, 220], 0, 0],
      [[214, 150, 92], 1, 0],
    ],
  },
  {
    name: "cobalt",
    w: 2,
    night: true,
    rungs: [
      [[92, 102, 124], 0, 0],
      [[48, 94, 156], 0, 0],
      [[104, 138, 158], 0, 0],
      [[180, 140, 58], 0, 0],
      [[194, 74, 46], 0, 1],
      [[238, 234, 222], 0, 0],
      [[216, 166, 54], 1, 0],
    ],
  },
  {
    name: "graphite",
    w: 1.4,
    night: false,
    rungs: [
      [[112, 110, 106], 0, 0],
      [[92, 90, 88], 0, 0],
      [[132, 128, 120], 0, 0],
      [[74, 72, 70], 0, 0],
      [[168, 54, 48], 0, 1],
      [[238, 236, 230], 0, 0],
      [[196, 170, 118], 1, 0],
    ],
  },
];

// Quantile shapes. The study's three loudest colour cells were exactly these
// three departures from the delivered `steep`.
const DISTS = [
  { name: "steep", w: 4, q: [0.5, 0.17, 0.13, 0.075, 0.055, 0.03, 0.045] },
  { name: "flat", w: 2, q: [1, 1, 1, 1, 1, 1, 1] },
  { name: "reverse", w: 2, q: [0.5, 0.17, 0.13, 0.075, 0.055, 0.03, 0.045], flip: true },
  { name: "sea", w: 1.6, q: [0.86, 0.03, 0.028, 0.026, 0.022, 0.016, 0.022] },
  { name: "banded", w: 1.4, q: [0.30, 0.24, 0.16, 0.11, 0.08, 0.05, 0.06] },
];

// Grounds. The literals in drawPaper()'s pixel loop, plus every grey that has to
// move with them. This pairing is the study's ground-dark caveat made
// structural: invert the sheet on its own and the halftone shadow and the plate
// frame quietly paint dark on dark.
const GROUNDS = [
  {
    name: "bone",
    w: 5,
    dark: false,
    base: 228,
    clamp: [204, 248],
    tint: [5, 1, -7],
    charc: [45, 41, 37],
    paper: [229, 226, 217],
    line: [64, 56, 48],
    frame: [[50, 48, 44, 0.85], [95, 93, 86, 0.42]],
    shadow: [52, 47, 42],
    speck: [52, 48, 42],
    ring: [74, 40, 34],
    echo: [70, 58, 50],
  },
  {
    name: "buff",
    w: 2,
    dark: false,
    base: 214,
    clamp: [188, 236],
    tint: [10, 3, -13],
    charc: [48, 42, 34],
    paper: [226, 220, 204],
    line: [66, 56, 44],
    frame: [[52, 48, 42, 0.85], [98, 92, 80, 0.42]],
    shadow: [56, 48, 40],
    speck: [54, 48, 40],
    ring: [78, 42, 32],
    echo: [72, 60, 48],
  },
  {
    name: "night",
    w: 1.6,
    dark: true,
    base: 50,
    clamp: [26, 76],
    tint: [2, 1, 7],
    charc: [15, 14, 16],
    paper: [232, 228, 216],
    line: [196, 192, 182],
    frame: [[186, 182, 172, 0.75], [128, 126, 120, 0.40]],
    shadow: [18, 17, 19],
    speck: [188, 184, 174],
    ring: [186, 78, 62],
    echo: [156, 150, 140],
  },
  {
    name: "slate",
    w: 1.2,
    dark: true,
    base: 74,
    clamp: [46, 104],
    tint: [-3, 0, 9],
    charc: [22, 22, 26],
    paper: [230, 228, 220],
    line: [200, 198, 190],
    frame: [[192, 190, 182, 0.7], [136, 136, 132, 0.38]],
    shadow: [26, 26, 30],
    speck: [192, 190, 182],
    ring: [192, 92, 74],
    echo: [162, 158, 150],
  },
];

const GATES = [
  { name: "noise", w: 4 },
  { name: "none", w: 2 },
  { name: "wedges", w: 2 },
  { name: "annulus", w: 1.5 },
  { name: "half", w: 1 },
  { name: "checker", w: 1.2 },
];

function lift(c, k) {
  return [c[0] + (255 - c[0]) * k, c[1] + (255 - c[1]) * k, c[2] + (255 - c[2]) * k];
}

function sampleConfig(seed) {
  const { f, i, pick, chance, weighted, shuffle } = makeRng(seed);
  const wpick = (arr) => weighted(arr.map((o) => [o, o.w]));

  // --- 1. ground, first: everything ink-coloured downstream reads it ---------
  const ground = wpick(GROUNDS);

  // --- 2. the ladder --------------------------------------------------------
  // Guardrail: on a dark sheet only ladders marked `night` are in the pool, and
  // their rungs are lifted toward white so the census does not sink into it.
  const ladderSet = wpick(ground.dark ? LADDERS.filter((l) => l.night) : LADDERS);
  const dist = wpick(DISTS);
  const nRungs = weighted([[7, 5], [6, 2], [5, 1.4]]);

  // Drop rungs from the middle, never from the ends: the outer sea and the
  // heart are the two things the piece is about.
  const keep = [];
  for (let k = 0; k < ladderSet.rungs.length; k++) keep.push(k);
  while (keep.length > nRungs) keep.splice(2 + i(0, keep.length - 5), 1);

  let cols = keep.map((k) => ladderSet.rungs[k]);
  let qs = keep.map((k) => dist.q[k] * f(0.88, 1.14));
  if (dist.flip) cols = cols.slice().reverse();

  const qSum = qs.reduce((a, b) => a + b, 0);
  qs = qs.map((q) => q / qSum);
  // Guardrail: there is always a heart. Without a rung under ~6% the innermost
  // ink stops being a coin and the plate loses its centre.
  if (Math.min(...qs) > 0.065) {
    const last = qs.length - 1;
    const give = qs[last] - 0.05;
    qs[last] = 0.05;
    qs[0] += give;
  }

  const ladder = cols.map((r, k) => ({
    c: (ground.dark ? lift(r[0], 0.42) : r[0]).map((v) => Math.round(v)),
    q: Number(qs[k].toFixed(4)),
    g: r[1],
    u: r[2],
  }));

  // --- 3. spheres and extent ------------------------------------------------
  const moonR = Math.round(f(560, 800));
  const cx = 1500 + Math.round(f(-40, 40));
  const cy = 1430 + Math.round(f(-70, 70));
  let rmax = Math.round(f(1130, 1360));
  rmax = Math.max(rmax, Math.round(moonR * 1.55)); // clamp, never re-roll
  rmax = Math.min(rmax, 1360);

  const nSat = weighted([[2, 4], [1, 2], [3, 1.4], [0, 1]]);
  const sats = [];
  const satAngles = shuffle([0.6, 2.0, 3.5, 5.0]).slice(0, nSat);
  for (const a0 of satAngles) {
    const a = a0 + f(-0.35, 0.35);
    const rr = f(rmax * 0.72, rmax * 0.97);
    const r = Math.round(f(78, 190));
    sats.push({
      cx: Math.round(Math.min(2835 - r - 60, Math.max(165 + r + 60, cx + Math.cos(a) * rr))),
      cy: Math.round(Math.min(2835 - r - 60, Math.max(165 + r + 60, cy + Math.sin(a) * rr))),
      r,
      ph: f(0.4, 2.8),
      bow: f(-0.24, 0.24),
    });
  }

  // --- 4. the lattice, and the ratio that samples it ------------------------
  const scale = weighted([["normal", 5], ["coarse", 2], ["fine", 1.6], ["slab", 1]]);
  let gapOut =
    scale === "slab" ? f(58, 82) : scale === "coarse" ? f(34, 52) : scale === "fine" ? f(7.5, 12) : f(15, 25);

  // Guardrail, straight out of the study: `lattice-fine` went pale because
  // hairlines spread over the whole sheet average to grey. Fine lattices are
  // only allowed behind a gate that keeps them somewhere.
  const gateMode = wpick(GATES).name;
  const openGate = gateMode === "none" || gateMode === "half";
  if (openGate) gapOut = Math.min(Math.max(gapOut, 13), 40);

  // step/gap. The delivered plate sits at 1.84. Near 1 the sampling is
  // isotropic; low values comb radially.
  const ratio = f(0.85, 2.45);
  const gapIn = gapOut * f(0.56, 0.72);
  const stepOut = gapOut * ratio;
  const stepIn = gapIn * ratio * f(0.62, 0.82);

  // Angular jitter, as a first-class parameter. The study's phase-lock cell
  // failed BECAUSE this sits at 0.7 — ±35% of a cell is a pre-emptive
  // anti-aliasing filter. Turn it down and the rings can actually lock; so when
  // it is down, the phase increment is locked to something deliberate rather
  // than left at an arbitrary drift.
  const aJit = weighted([[f(0.6, 0.8), 6], [f(0.3, 0.5), 2], [f(0.0, 0.16), 1.6]]);
  const phase = aJit < 0.25 ? pick([0, 0, 1.9416, Math.PI / 2]) : f(0.18, 0.62);

  const lattice = {
    gapIn: Number(gapIn.toFixed(2)),
    gapOut: Number(gapOut.toFixed(2)),
    stepIn: Number(stepIn.toFixed(2)),
    stepOut: Number((stepOut * 0.8).toFixed(2)),
    stepVar: Number((stepOut * 0.4).toFixed(2)),
    phase: Number(phase.toFixed(4)),
    aJit: Number(aJit.toFixed(3)),
    rJit: Number((gapOut / 19).toFixed(3)),
    len0: Number((gapOut * 0.79).toFixed(2)),
    len1: Number((gapOut * 1.42).toFixed(2)),
    wgt0: Number((gapOut * 0.158).toFixed(2)),
    wgt1: Number((gapOut * 0.316).toFixed(2)),
    wgtIn0: Number((gapOut * 0.179).toFixed(2)),
    wgtIn1: Number((gapOut * 0.337).toFixed(2)),
    satK: Number(Math.max(0.5, Math.min(2.2, gapOut / 19)).toFixed(3)),
    satGap: Math.max(5, Math.round(9 * (gapOut / 19))),
    satStep: Math.max(6, Math.round(12 * (gapOut / 19))),
  };

  // --- 5. orientation of the mark ------------------------------------------
  const orientMode = weighted([["around", 5], ["outward", 2], ["skew", 1.6]]);
  const orient = orientMode === "around" ? Math.PI / 2 : orientMode === "outward" ? 0 : f(0.5, 1.1);

  // --- 6. the gate ----------------------------------------------------------
  const gate = {
    mode: gateMode,
    wedges: pick([6, 8, 12, 16]),
    band: [f(0.28, 0.5), f(0.62, 0.86)],
    halfAngle: f(0, Math.PI * 2),
    checkerRing: i(3, 6),
    erode: f(0.75, 1.5),
  };

  // --- 7. the seam ----------------------------------------------------------
  const seamMode = weighted([["woven", 5], ["tight", 2.2], ["flat", 1.5], ["wide", 1.2]]);
  const pinch =
    seamMode === "flat" ? 0 : seamMode === "wide" ? f(380, 680) : seamMode === "tight" ? f(90, 150) : f(170, 290);
  const seam = {
    mode: seamMode,
    mid: Math.round(cy + f(70, 210)),
    tilt: Number(f(-0.055, 0.055).toFixed(4)),
    pinch: Math.round(pinch),
    pull: Number((seamMode === "flat" ? 0 : f(0.6, 1.0)).toFixed(3)),
    // §5c: the stitches and the seating smudge are drawn along seamAt(). They
    // restate the weave in ink, so they leave with it.
    stitches: pinch >= 90,
    stitchGap: [f(110, 170), f(240, 330)],
  };

  // --- 8. light -------------------------------------------------------------
  const az = f(0, Math.PI * 2);
  const el = f(0.5, 0.78);
  const hor = Math.sqrt(1 - el * el);
  const light = {
    lx: Number((Math.cos(az) * hor).toFixed(4)),
    ly: Number((Math.sin(az) * hor).toFixed(4)),
    lz: Number(el.toFixed(4)),
    shAz: Number((az + Math.PI).toFixed(4)),
  };

  // --- 9. ornament ----------------------------------------------------------
  const nRings = weighted([[4, 4], [3, 2], [2, 1.5], [5, 1]]);
  const rings = [];
  const heavyR = f(0.2, 0.32) * rmax;
  for (let k = 0; k < nRings; k++) {
    const t = k / Math.max(1, nRings - 1);
    const R = Math.round(heavyR + t * (rmax * 0.92 - heavyR));
    const heavy = k === 0;
    rings.push({
      r: R,
      passes: heavy ? i(3, 4) : 1,
      w: heavy ? f(40, 58) : f(26, 36),
      col: heavy ? ground.ring : ground.echo,
      a: heavy ? f(130, 168) : f(50, 72),
      ox: f(-10, 10),
      oy: f(-8, 8),
      echo: !heavy,
    });
  }

  const ornament = {
    rings,
    guides: [Math.round(rmax * 0.32), Math.round(rmax * 0.77), Math.round(rmax * 0.99)],
    halftone: chance(ground.dark ? 0.3 : 0.88),
    halftoneCw: Math.round(f(20, 34)),
    zigzag: chance(0.78),
    zigzagY: [Math.round(f(360, 500)), Math.round(f(2500, 2650))],
    construction: chance(0.85),
    ghostDial: chance(0.55),
    legend: chance(0.82),
    seal: chance(0.8),
    orbits: chance(0.85) && sats.length > 0,
    strays: chance(0.8),
    centralMark: chance(0.9),
  };

  // --- 10. press. Seasoning: varied so two seeds are not identically printed,
  // never enough to be mistaken for a family.
  const press = {
    dust: Math.round(f(1500, 2900)),
    spatterSeam: Math.round(f(150, 260)),
    spatterAll: Math.round(f(170, 300)),
    speck: Math.round(f(3400, 5600)),
    grain: Number(f(8, 14).toFixed(2)),
    vignette: Number((ground.dark ? f(0.02, 0.06) : f(0.06, 0.15)).toFixed(3)),
    wash: [Math.round(ground.dark ? f(4, 10) : f(22, 38)), Math.round(ground.dark ? f(3, 7) : f(10, 18))],
  };

  return {
    seed: String(seed),
    canvas: CANVAS,
    rndSeed: i(1, 999999999),
    noiseK: i(1, 999999999),
    cx,
    cy,
    rmax,
    rmin: 26,
    moonR,
    sats,
    ladder,
    ground,
    lattice,
    orient,
    gate,
    seam,
    light,
    ornament,
    press,
    recipe: {
      ink: ladderSet.name,
      dist: dist.name,
      rungs: String(ladder.length),
      scale,
      gap: gapOut.toFixed(0),
      ratio: ratio.toFixed(2),
      jitter: aJit.toFixed(2),
      gate: gateMode,
      seam: seamMode,
      orient: orientMode,
      ground: ground.name,
      sats: String(sats.length),
    },
  };
}

function recipeLine(cfg) {
  const r = cfg.recipe;
  return (
    `${r.ink}/${r.dist} · gap ${r.gap} (${r.scale}) · step/gap ${r.ratio} · jit ${r.jitter} · ` +
    `${r.gate} · ${r.seam} · ${r.orient} · ${r.ground}`
  );
}

if (typeof window !== "undefined") {
  window.sampleConfig = sampleConfig;
  window.recipeLine = recipeLine;
  window.LADDERS = LADDERS;
}
