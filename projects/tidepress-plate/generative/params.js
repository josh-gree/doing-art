// sampleConfig(seed) -> CFG.  The taste lives here; engine.js is only capability.
//
// The five axes are the ones that survived the variation study in
// projects/tidepress-plate/ANALYSIS.md: lattice density, wavelength (as a
// RATIO to cell pitch, see below), source geometry, gate, and ink. Everything
// that did not read at 300px — the satellite system, the moire patch, scratch
// and grain counts, the misregistration ghost — is either fixed or varied only
// enough to keep two seeds from looking identically printed.
//
// Sampling happens in family order, because later stages read earlier choices;
// that is how the guardrails get expressed. Guardrails clamp, they never re-roll:
// a re-roll desynchronises the stream and makes seeds unstable across edits.

const CANVAS = 3000;
const MARGIN = 180;

// Palettes are curated as SETS, not sampled per channel. The dot mix is
// { m: per-channel multiplier on the ink ramp, o: offset, s: response to the
// `sep` separation that kicks in above t~0.62 }. Ground is the literals inside
// drawPaper()'s pixel loop — NOT the PAPER constant, which only tints specks.
const PALETTES = [
  {
    name: "charcoal-umber",
    w: 3,
    dark: false,
    ground: { base: 230, n: [18, 10, 18], clamp: [200, 246], tint: [6, 0, -14] },
    ramp: { base: 150, span: -132 },
    mix: { m: [1, 1, 1], o: [5, 2, -5], s: [22, 8, -14] },
    ink: [48, 44, 40],
    paper: [233, 227, 211],
    paperDk: [203, 193, 171],
  },
  {
    name: "prussian-rust",
    w: 2,
    dark: false,
    ground: { base: 231, n: [16, 10, 16], clamp: [202, 246], tint: [4, 2, -10] },
    ramp: { base: 150, span: -132 },
    mix: { m: [0.52, 0.92, 1.02], o: [0, 6, 52], s: [30, 10, -20] },
    ink: [34, 42, 62],
    paper: [232, 228, 216],
    paperDk: [196, 194, 180],
  },
  {
    name: "sanguine",
    w: 2,
    dark: false,
    ground: { base: 232, n: [17, 10, 17], clamp: [203, 247], tint: [9, 1, -12] },
    ramp: { base: 152, span: -128 },
    mix: { m: [1.06, 0.72, 0.6], o: [22, 2, 4], s: [26, -6, -8] },
    ink: [78, 38, 30],
    paper: [236, 226, 210],
    paperDk: [206, 186, 166],
  },
  {
    name: "verdigris",
    w: 1.5,
    dark: false,
    ground: { base: 229, n: [17, 10, 17], clamp: [200, 245], tint: [0, 4, -6] },
    ramp: { base: 148, span: -130 },
    mix: { m: [0.68, 1.0, 0.86], o: [8, 10, 14], s: [10, 24, -4] },
    ink: [36, 58, 52],
    paper: [228, 230, 219],
    paperDk: [190, 198, 184],
  },
  // Dark grounds invert the logic of the piece. They need their own ramp
  // (ink gets LIGHTER with t) and a pale INK constant, or every ring, speck and
  // spatter mark disappears into the ground.
  {
    name: "negative-bone",
    w: 1.5,
    dark: true,
    ground: { base: 44, n: [14, 8, 14], clamp: [22, 66], tint: [6, 0, -14] },
    ramp: { base: 96, span: 150 },
    mix: { m: [1, 1, 1], o: [4, 2, -6], s: [14, 6, -10] },
    ink: [224, 216, 198],
    paper: [38, 34, 30],
    paperDk: [70, 64, 56],
  },
  {
    name: "negative-cyan",
    w: 1,
    dark: true,
    ground: { base: 38, n: [13, 8, 13], clamp: [18, 60], tint: [-4, 2, 10] },
    ramp: { base: 90, span: 156 },
    mix: { m: [0.72, 1.0, 1.04], o: [0, 6, 20], s: [10, 18, -6] },
    ink: [198, 226, 228],
    paper: [26, 34, 38],
    paperDk: [56, 68, 74],
  },
];

function sampleConfig(seedString) {
  const R = makeRng(seedString);
  const { f, i, pick, chance, weighted } = R;

  // ---- 1. ink -------------------------------------------------------------
  const palette = weighted(PALETTES.map((p) => [p, p.w]));

  // ---- 2. lattice ---------------------------------------------------------
  // How many marks. Bands rather than a uniform range, so "ordinary" dominates
  // and the two extremes stay rare enough to be events.
  const latBand = weighted([
    ["coarse", 1],
    ["mid", 4],
    ["fine", 2.5],
    ["ultra", 1.2],
  ]);
  let N = { coarse: () => i(16, 24), mid: () => i(30, 58), fine: () => i(62, 92), ultra: () => i(96, 132) }[latBand]();

  // ---- 3. source geometry -------------------------------------------------
  const sources = weighted([
    ["duet", 4],
    ["solo", 1.2],
    ["grid", 2],
    ["plane", 2],
  ]);

  // ---- 4. wavelength, sampled as a RATIO to cell pitch ---------------------
  // The study's sharpest finding: the lattice is a SAMPLER, so what matters is
  // wavelength / cell pitch, not wavelength. Near ratio 1 the field aliases
  // against the lattice and produces star and rosette structure that no
  // wavelength alone predicts. That band is sampled on purpose, not clamped away.
  const ratioBand = weighted([
    ["alias", 1.6],
    ["tight", 2],
    ["mid", 4],
    ["broad", 2],
  ]);
  const ratio = { alias: () => f(0.95, 1.65), tight: () => f(1.9, 3.0), mid: () => f(3.2, 6.2), broad: () => f(7, 13) }[
    ratioBand
  ]();

  // ---- 5. gate ------------------------------------------------------------
  let gateMode = weighted([
    ["disc", 4],
    ["annulus", 1.5],
    ["none", 1.5],
    ["checker", 1.4],
  ]);

  // GUARDRAIL: an open gate (none/checker) at a fine lattice is grey mush — the
  // marks stop reading as marks and the whole sheet goes flat. Clamp the
  // lattice rather than re-rolling the gate.
  const open = gateMode === "none" || gateMode === "checker";
  if (open && N > 72) N = i(44, 72);

  const cellPitch = (CANVAS - 2 * MARGIN) / N;
  const l1 = Math.min(1250, Math.max(38, ratio * cellPitch));
  const l2 = l1 * f(1.4, 2.3);

  const discR = f(1105, 1235);
  const gate = { mode: gateMode, r: discR, inner: 0, tile: 0 };
  if (gateMode === "annulus") gate.inner = discR * f(0.34, 0.62);
  if (gateMode === "checker") {
    // GUARDRAIL: a tile has to hold enough cells to show the field. Below about
    // six across it reads as noise on a chessboard rather than as a print.
    gate.tile = Math.max(f(6, 11) * cellPitch, 210);
  }

  // ---- 6. placement -------------------------------------------------------
  // The bloom at P1 is the premise of the piece — the dense eye the ripples
  // come from. Keep it on the plate; a sampler that drifts it into the margin
  // has thrown the piece away (§11).
  const P1 = [f(0.4, 0.58), f(0.44, 0.6)];
  const P2 = [f(0.66, 0.82), f(0.2, 0.38)];
  if (chance(0.5)) P2[1] = f(0.64, 0.82);
  const P3 = [f(0.22, 0.36), f(0.66, 0.8)];
  const RC = [0.5, 0.505];

  const gridSize = Math.min(1150, Math.max(480, l1 * f(3, 5.2)));
  const planeAngle = f(0, Math.PI * 2);

  // ---- 7. ornament --------------------------------------------------------
  // GUARDRAIL (§5c): the rim rings and the wide tone arc restate the circular
  // silhouette in ink. With an open gate they contradict the field, and the
  // result reads as a broken plate rather than a new one.
  const closed = gateMode === "disc" || gateMode === "annulus";
  const ornament = {
    rim: closed && chance(0.92),
    plateTone: closed && chance(0.85),
    subSystem: chance(0.72),
    accents: chance(0.9),
    anchor: chance(0.9),
    gridGhost: chance(0.8),
  };

  // ---- 8. press -----------------------------------------------------------
  // None of this read at 300px, so it varies only enough that two seeds are not
  // the same print. It is seasoning and it is sampled like seasoning.
  const press = {
    ghost: [f(10, 26) * (chance(0.5) ? 1 : -1), f(-20, -6)],
    spatter: i(180, 320),
    grain: f(0.7, 1.3),
    erode: f(0.7, 1.3),
    scratches: i(4, 11),
    vignette: f(0.1, 0.24),
    marks: chance(0.85),
  };

  return {
    seed: String(seedString),
    randomSeed: i(1, 999999999),
    noiseSeed: i(1, 999999999),
    canvas: CANVAS,
    margin: MARGIN,
    lattice: { n: N },
    wave: { l1, l2, ratio },
    sources: { mode: sources, p1: P1, p2: P2, p3: P3, rc: RC, gridSize, planeAngle },
    gate,
    palette,
    ornament,
    press,
    recipe: {
      lattice: `${N}²`,
      sources,
      ratio: ratio.toFixed(2),
      gate: gateMode,
      ink: palette.name,
    },
  };
}

function recipeLine(cfg) {
  const r = cfg.recipe;
  return `${r.lattice} · ${r.sources} · λ/pitch ${r.ratio} · ${r.gate} · ${r.ink}`;
}

if (typeof window !== "undefined") {
  window.sampleConfig = sampleConfig;
  window.recipeLine = recipeLine;
  window.PALETTES = PALETTES;
}
