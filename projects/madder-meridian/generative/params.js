// sampleConfig(seed) -> CFG.  The taste lives here; engine.js is only capability.
//
// The axes are the ones that read at 300 px in
// projects/madder-meridian/ANALYSIS.md: the two lattices (bead arc pitch
// along each row, row pitch across the sheet), the waveform, the band gate that
// inverts a slice of the sheet, the ground, the accent, and the knot eye.
// Everything that did not read — the ghost misregistration, the bead tone
// field's noise term, and every scattered ornament — is fixed or barely varied.
//
// Sampling runs in family order; later stages read earlier choices. Guardrails
// CLAMP rather than re-roll, so seeds stay stable across code edits.
//
// The one structural rule this piece forced: EVERY row index is generated from
// ROWS_N. The delivered sketch pins its furniture to a row count of eleven in
// five separate functions, which is what made `rows-few` render as a handsome
// crash. Nothing here may name a row number.

const CANVAS = 3000;

const GROUNDS = [
  {
    name: "bone",
    w: 5,
    dark: false,
    paper: [243, 238, 228],
    ink: [34, 31, 27],
    ghost: [201, 193, 179],
    inkHi: [21, 19, 16],
    paperHi: [252, 249, 240],
    paperSkip: [26, 23, 20],
    fade: [74, 70, 63],
    fadeHi: [52, 49, 44],
    frame: [104, 100, 92],
    frameDark: [70, 67, 60],
    tints: [[238, 234, 222], [231, 227, 215], [242, 239, 229], [247, 243, 233], [250, 246, 238], [225, 225, 219]],
  },
  {
    name: "tea",
    w: 2.5,
    dark: false,
    paper: [231, 220, 199],
    ink: [42, 36, 29],
    ghost: [196, 183, 161],
    inkHi: [26, 22, 18],
    paperHi: [244, 236, 219],
    paperSkip: [32, 27, 22],
    fade: [86, 78, 66],
    fadeHi: [60, 54, 45],
    frame: [112, 102, 86],
    frameDark: [76, 68, 56],
    tints: [[224, 212, 190], [216, 204, 182], [236, 226, 206], [242, 233, 214], [210, 200, 182], [228, 220, 204]],
  },
  {
    name: "night",
    w: 2,
    dark: true,
    paper: [28, 26, 24],
    ink: [238, 233, 222],
    ghost: [72, 68, 62],
    inkHi: [250, 246, 238],
    paperHi: [14, 13, 11],
    paperSkip: [244, 240, 230],
    fade: [168, 162, 150],
    fadeHi: [196, 190, 178],
    frame: [138, 132, 122],
    frameDark: [186, 180, 168],
    tints: [[40, 38, 34], [24, 23, 21], [46, 43, 39], [33, 31, 28], [52, 49, 44], [20, 20, 19]],
  },
  {
    name: "slate",
    w: 1.5,
    dark: true,
    paper: [46, 48, 52],
    ink: [233, 234, 230],
    ghost: [88, 90, 94],
    inkHi: [246, 247, 244],
    paperHi: [30, 32, 35],
    paperSkip: [240, 241, 238],
    fade: [170, 172, 170],
    fadeHi: [198, 200, 198],
    frame: [140, 142, 142],
    frameDark: [188, 190, 190],
    tints: [[56, 58, 62], [40, 42, 46], [62, 64, 68], [50, 52, 56], [68, 70, 74], [36, 38, 42]],
  },
];

// The accent is the piece's name. By the coverage rule it is seasoning at
// delivered strength — two short runs — so what is sampled is not just its hue
// but how much of the cloth it owns.
const ACCENTS = [
  { name: "madder", w: 4, base: [147, 58, 34], light: [178, 98, 62], deep: [108, 30, 20], warm: [162, 64, 36], warmDeep: [118, 34, 22] },
  { name: "indigo", w: 2, base: [44, 64, 112], light: [86, 108, 156], deep: [26, 38, 74], warm: [52, 76, 126], warmDeep: [30, 44, 84] },
  { name: "verdigris", w: 2, base: [42, 104, 92], light: [88, 148, 134], deep: [24, 68, 60], warm: [50, 116, 100], warmDeep: [28, 76, 66] },
  { name: "ochre", w: 1.8, base: [168, 126, 40], light: [202, 168, 86], deep: [118, 84, 20], warm: [180, 138, 48], warmDeep: [126, 92, 24] },
  { name: "plum", w: 1.4, base: [104, 44, 88], light: [144, 82, 126], deep: [70, 26, 58], warm: [116, 52, 98], warmDeep: [78, 30, 64] },
];

const WAVES = [
  { name: "triangle", w: 4 },
  { name: "sine", w: 2.5 },
  { name: "square", w: 2 },
];

function sampleConfig(seed) {
  const { f, i, pick, chance, weighted, shuffle } = makeRng(seed);
  const wpick = (arr) => weighted(arr.map((o) => [o, o.w]));

  // --- 1. ground and accent -------------------------------------------------
  const ground = wpick(GROUNDS);
  const accent = wpick(ACCENTS);

  // --- 2. the across-sheet lattice -----------------------------------------
  const rowScale = weighted([["normal", 5], ["few", 2], ["many", 2], ["dense", 1]]);
  const rowsN =
    rowScale === "few" ? i(4, 6) : rowScale === "many" ? i(15, 20) : rowScale === "dense" ? i(22, 30) : i(9, 13);
  const top = f(300, 380);
  const stepY = (CANVAS - top - 300) / Math.max(1, rowsN - 1);

  // --- 3. the waveform ------------------------------------------------------
  const wave = wpick(WAVES).name;
  // Guardrail: amplitude is expressed as a fraction of the row pitch. Past ~1.0
  // the rows stop being rows. The study read clearly at 0.85, so that is the cap.
  // NOTE: amplitude and row count are NOT independent, and this does not yet
  // know that. See projects/madder-meridian/SEEDS.md — the fix is one clamp here, left
  // unapplied so the committed batch is reproducible from this file.
  const ampFrac = weighted([[f(0.22, 0.42), 4], [f(0.04, 0.12), 2], [f(0.55, 0.92), 2.5]]);
  const amp = stepY * ampFrac;
  const period = f(220, 1200);

  // --- 4. the along-row lattice, as a RATIO ---------------------------------
  // Arc length per period of the wave, which is what the beads are actually
  // spaced along. Expressing pitch as a ratio to it makes the locking band from
  // the study's `bead-lock` cell reachable on purpose.
  const arcPerPeriod = 2 * Math.sqrt((period / 2) * (period / 2) + amp * amp);
  const beadsPerPeriod = weighted([
    [f(7, 11), 4], // as delivered
    [f(2.2, 3.6), 2], // the locking band — beads seek the vertices
    [f(4, 6), 2],
    [f(14, 24), 1.6], // dotted rules
  ]);
  let spacing = arcPerPeriod / beadsPerPeriod;
  spacing = Math.max(14, Math.min(280, spacing));
  // Radius follows pitch, then is capped so neighbouring rows cannot merge.
  let radius = spacing * f(0.32, 0.44);
  radius = Math.min(radius, stepY * 0.3);
  radius = Math.max(4, radius);

  // --- 5. the band gate -----------------------------------------------------
  // Guardrail: bands never cover every row, and never touch.
  const nBands = weighted([[1, 5], [0, 2], [2, 1.6]]);
  const bands = [];
  let cursor = i(0, Math.max(0, rowsN - 3));
  for (let b = 0; b < nBands; b++) {
    const span = Math.min(i(1, Math.max(1, Math.round(rowsN / 4))), rowsN - 2);
    const i0 = Math.min(cursor, rowsN - 1 - span);
    const i1 = Math.min(i0 + span - 1, rowsN - 1);
    if (i0 < 0 || i1 < i0) break;
    if (bands.length && i0 <= bands[bands.length - 1].i1 + 1) break;
    bands.push({ i0, i1, pad: Math.round(Math.min(150, stepY * f(0.45, 0.7))) });
    cursor = i1 + 2 + i(1, 3);
    if (cursor > rowsN - 2) break;
  }
  const banded = new Set();
  for (const b of bands) for (let k = b.i0; k <= b.i1; k++) banded.add(k);
  if (banded.size >= rowsN - 1) {
    // clamp, never re-roll: give the last band back a row
    const last = bands[bands.length - 1];
    if (last && last.i1 > last.i0) last.i1--;
  }

  // --- 6. row roles. Every index generated from rowsN, never named. ---------
  const order = shuffle(Array.from({ length: rowsN }, (_, k) => k));
  const nHeavy = Math.max(1, Math.round(rowsN * f(0.12, 0.24)));
  const heavy = new Set(order.slice(0, nHeavy));
  const nThin = Math.max(1, Math.round(rowsN * f(0.14, 0.3)));
  const thin = new Set(order.slice(nHeavy, nHeavy + nThin));
  const accentRow = order[(nHeavy + nThin) % rowsN];
  const rest = order.filter((k) => !heavy.has(k) && !thin.has(k) && k !== accentRow);
  const faded = new Set(rest.slice(0, Math.max(1, Math.round(rowsN * 0.16))));
  const warmRow = rest.length > 1 ? rest[rest.length - 1] : accentRow;

  const segAt = () => {
    const x0 = f(200, CANVAS - 900);
    return [Math.round(x0), Math.round(x0 + f(400, 900))];
  };

  const rowSpecs = [];
  for (let k = 0; k < rowsN; k++) {
    const isHeavy = heavy.has(k);
    const isThin = thin.has(k);
    const isAccent = k === accentRow;
    rowSpecs.push({
      threadW: isHeavy ? Math.round(f(22, 30)) : isAccent ? Math.round(f(12, 17)) : isThin ? Math.round(f(8, 14)) : 0,
      accentThread: isAccent,
      beadScale: isAccent ? f(0.8, 0.92) : isThin ? f(0.86, 0.96) : 1,
      beadSet: faded.has(k) ? "fade" : "ink",
      redSeg: isAccent || k === warmRow ? segAt() : null,
      redSet: k === warmRow ? "redWarm" : "red",
      shadow: false,
      drifter: chance(0.1),
      ring: chance(0.1),
      strike: false,
      ghost: chance(0.1),
      gap: chance(0.14),
    });
  }
  // the middle row of the first band gets the oxide shadow pass
  if (bands.length) {
    const mid = Math.floor((bands[0].i0 + bands[0].i1) / 2);
    rowSpecs[mid].shadow = true;
    rowSpecs[mid].strike = chance(0.7);
  }

  // --- 7. the eye -----------------------------------------------------------
  const eyeOn = chance(0.85);
  const eye = {
    on: eyeOn,
    x: Math.round(f(700, CANVAS - 700)),
    y: Math.round(f(top + stepY * 0.5, CANVAS - 500)),
    sx: Math.round(f(300, 820)),
    sy: Math.round(f(300, 820)),
    pull: Number(f(0.3, 1.35).toFixed(3)),
    r: Math.round(f(190, 300)),
  };

  // --- 8. the seam ----------------------------------------------------------
  const seam = {
    on: chance(0.82),
    x: Math.round(f(600, CANVAS - 480)),
    shift: Math.round(f(28, 84)),
  };

  // --- 9. the bead tone field. Did NOT read as a family — varied, not sampled
  // for effect.
  const toneNoise = Number(f(0.35, 0.75).toFixed(3));

  // --- 10. press. Seasoning only.
  const press = {
    ghost: [Math.round(f(8, 26)), Math.round(f(-22, -6))],
    mottle: Math.round(f(120, 200)),
    fibres: [Math.round(f(330, 520)), Math.round(f(220, 380))],
    specks: Math.round(f(950, 1700)),
    grain: Number(f(16, 30).toFixed(1)),
    margin: Math.round(f(96, 128)),
  };

  return {
    seed: String(seed),
    canvas: CANVAS,
    randomSeed: i(1, 999999999),
    noiseSeed: i(1, 99999),
    rowsN,
    top: Math.round(top),
    stepY: Math.round(stepY),
    ground,
    accent,
    wave: {
      mode: wave,
      amp: Number((amp * 0.78).toFixed(1)),
      ampVar: Number((amp * 0.42).toFixed(1)),
      period: Number((period * 0.85).toFixed(1)),
      periodVar: Number((period * 0.3).toFixed(1)),
      phaseSpread: Math.round(f(60, 220)),
    },
    beads: {
      spacing: Number((spacing * 0.92).toFixed(2)),
      spacingVar: Number((spacing * 0.14).toFixed(2)),
      radius: Number(radius.toFixed(2)),
      beadsPerPeriod: Number(beadsPerPeriod.toFixed(2)),
    },
    bands,
    rowSpecs,
    accentRow,
    eye,
    seam,
    toneNoise,
    press,
    recipe: {
      ground: ground.name,
      accent: accent.name,
      rows: String(rowsN),
      rowScale,
      wave,
      amp: ampFrac.toFixed(2),
      period: period.toFixed(0),
      bpp: beadsPerPeriod.toFixed(1),
      bands: String(bands.length),
      eye: eyeOn ? "eye" : "no-eye",
      seam: seam.on ? "seam" : "no-seam",
    },
  };
}

function recipeLine(cfg) {
  const r = cfg.recipe;
  return (
    `${r.ground}/${r.accent} · ${r.rows} rows (${r.rowScale}) · ${r.wave} amp ${r.amp} · ` +
    `period ${r.period} · ${r.bpp} beads/period · ${r.bands} band · ${r.eye} · ${r.seam}`
  );
}

if (typeof window !== "undefined") {
  window.sampleConfig = sampleConfig;
  window.recipeLine = recipeLine;
}
