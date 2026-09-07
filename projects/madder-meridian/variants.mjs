// Variation study for "Madder Meridian" (madder-meridian).
//
// Eleven horizontal rows of charcoal beads, strung at equal ARC LENGTH along
// hand-trembled triangle waves. Three of the rows are overprinted by a charcoal
// band that inverts them to paper beads on black. A knot eye at upper left pulls
// nearby rows toward itself; a basted seam shears everything to its right.
//
// §5a, answered by reading:
//   1. field       — rowY(x, i): triangle wave (period/amp/phase) + two noise
//                    bends + a 2D-Gaussian pull toward EYE + the seam shear.
//                    Every thread, bead and ghost consults it. Second field:
//                    `0.58 * noise + 0.42 * grad` sets every bead's radius and
//                    tone.
//   2. discretizer — TWO lattices. `spacing` (arc length between beads, ~58)
//                    along each row, and ROWS_N / STEP_Y across the sheet.
//                    `spacing` against `period` is the §5b pair.
//   3. gate        — BAND. Rows i0..i1 are not drawn normally at all; a black
//                    rect covers them and they are re-stamped in paper ink.
//                    It is a gate on the SHEET rather than on the marks, and it
//                    is the loudest thing in the file.
//   4. ground      — this time it really is the constant: `background(PAPER[0],
//                    PAPER[1], PAPER[2])`, with mottlePaper() glazing literal
//                    tints over it. Three pieces running the named constant was
//                    a decoy; here it is load-bearing. Count the usages and look
//                    at where they land — that is the rule, not "PAPER is never
//                    the ground".
//
// Rejected by the coverage rule (§5) before spending a cell: drawPools,
// frenchKnots, drawRepairs, drawStrays, drawThreadEnds, registrationMarks,
// accentTicks, slubs, the four single-bead incident indices (drifter, ring,
// strike, ghost), the fibre count, the frame. Each is well under a couple of
// per cent of the frame.
//
// One prediction stated up front, against the handover's advice: misregistration
// ×8 has been the reliable non-reading control on three pieces, and here it
// should READ — ghostPass() re-draws every thread and every bead of the whole
// sheet at alpha 60-80, which is not a detail. So it is entered as a family and
// a finish-texture cell takes the control slot instead.

// ---------- the wave ----------
const TRI = `  const t = ph < 0.5 ? ph * 4 - 1 : 3 - ph * 4;`;
const AMP = `      amp: 68 + 26 * noise(i * 0.33 + 4),`;
const PERIOD = `      period: 396 + 80 * noise(i * 0.83 + 11),`;

// ---------- the two lattices ----------
const SPACING = `      spacing: 55 + 6 * noise(i * 3.1 + 9),`;
const ROWS_N = `const ROWS_N = 11;`;
const STEP_Y = `const STEP_Y = 240;`;
const RADIUS = `      let rad = 22 * (0.55 + 0.85 * field) * random(0.94, 1.06) * r.beadScale;`;

// ---------- the gate ----------
const BAND = `const BAND = {
  i0: 4,
  i1: 6,
  pad: 150
};`;
const BAND_FLAG = `      band: (i >= BAND.i0 && i <= BAND.i1),`;
const BAND_CALL = `  drawBand();`;

// drawBand() re-stamps the covered rows as paper beads by HARDCODED index —
// rows[4], rows[6], rows[5]. Any variant that moves BAND or changes ROWS_N has
// to bring this with it, or the band renders as an empty black rect. With
// ROWS_N = 5 it is worse than empty: rows[5] is undefined, the exception aborts
// draw() where it stands, and every later pass (eye, seam, frame, grain) never
// runs. That still renders, still hashes distinct, and still looks like a bold
// variant — §5c generalised: the furniture has to follow the parameter.
const BAND_ROWS = `  drawBandRow(rows[4], false);
  drawBandRow(rows[6], false);
  drawBandRow(rows[5], true);`;
// And it is not only drawBand. drawRepairs, frenchKnots and drawStrays each
// carry their own table of row indices (up to 9). Five functions pin the
// furniture to a row count of eleven, so ROWS_N is not a free parameter until
// all five come with it. This is the shape of the §5c lesson every time: the
// loudest structural knob always has ornament nailed to its old value.
const REPAIRS = `  const spots = [
    [1, 540],
    [3, 1810],
    [6, 2085],
    [7, 640],
    [9, 1560]
  ];`;
const KNOTS = `  const near = [
    [1, 540],
    [9, 1560],
    [7, 640]
  ];`;
const STRAY_ROWS = `  const rowsIdx = [0, 8, 9];`;

const BAND_ROWS_GENERIC = `  const bmid = Math.floor((BAND.i0 + BAND.i1) / 2);
  for (let bi = BAND.i0; bi <= BAND.i1; bi++) if (bi !== bmid) drawBandRow(rows[bi], false);
  drawBandRow(rows[bmid], true);`;

// ---------- the tone field ----------
const TONE = `      const field = 0.58 * f + 0.42 * grad;`;

// ---------- the eye ----------
const EYE = `const EYE = {
  x: 1060,
  y: 810,
  sx: 360,
  sy: 380,
  pull: 0.55,
  r: 255
};`;

// ---------- ink ----------
const PAPER_C = `const PAPER = [243, 238, 228];`;
const INK_C = `const INK = [34, 31, 27];`;
const GHOST_C = `const GHOST = [201, 193, 179];`;
const INK_SET = `const INK_SET = {
  base: INK,
  hi: [21, 19, 16],
  skip: PAPER
};`;
const PAPER_SET = `const PAPER_SET = {
  base: PAPER,
  hi: [252, 249, 240],
  skip: [26, 23, 20]
};`;
const TINTS = `  const tints = [
    [238, 234, 222],
    [231, 227, 215],
    [242, 239, 229],
    [247, 243, 233],
    [250, 246, 238],
    [225, 225, 219]
  ];`;
const BEADSET = `      beadSet: INK_SET,`;
const THREADCOL = `      threadCol: INK,`;
const FADE_7 = `      r.beadSet = FADE_SET;
    }
    if (i === 10) r.beadSet = FADE_SET;`;

// ---------- ghost and finish ----------
const GHOST_OFF = `  translate(17, -12);`;
const SPECKS = `  specks(1300);`;

export default [
  {
    id: "baseline",
    desc: "as delivered — 11 bead rows, charcoal band over rows 4-6",
    reps: [],
  },

  // ---- family: the waveform ----
  {
    id: "wave-square",
    desc: "triangle wave replaced by a square step — rows become terraces",
    reps: [[TRI, `  const t = ph < 0.5 ? -1 : 1;`]],
  },
  {
    id: "amp-flat",
    desc: "amplitude down 10x — the cloth is ruled, not woven",
    reps: [[AMP, `      amp: 7 + 3 * noise(i * 0.33 + 4),`]],
  },
  {
    id: "amp-tall",
    desc: "amplitude up 3x — rows interleave into a lattice",
    reps: [[AMP, `      amp: 205 + 78 * noise(i * 0.33 + 4),`]],
  },
  {
    id: "period-short",
    desc: "period down 3.3x — steep chevrons, ~3 beads per period",
    reps: [[PERIOD, `      period: 120 + 30 * noise(i * 0.83 + 11),`]],
  },

  // ---- family: the across-sheet lattice ----
  {
    id: "rows-few",
    desc: "5 rows at 520px pitch — the band moves with them",
    reps: [
      [ROWS_N, `const ROWS_N = 5;`],
      [STEP_Y, `const STEP_Y = 520;`],
      [BAND, `const BAND = {\n  i0: 2,\n  i1: 3,\n  pad: 150\n};`],
      [BAND_ROWS, BAND_ROWS_GENERIC],
      [REPAIRS, `  const spots = [\n    [1, 540],\n    [3, 1810],\n    [2, 2085],\n    [4, 640],\n    [0, 1560]\n  ];`],
      [KNOTS, `  const near = [\n    [1, 540],\n    [0, 1560],\n    [4, 640]\n  ];`],
      [STRAY_ROWS, `  const rowsIdx = [0, 3, 4];`],
    ],
  },
  {
    id: "rows-many",
    desc: "26 rows at 100px pitch — the sheet fills with thread",
    reps: [
      [ROWS_N, `const ROWS_N = 26;`],
      [STEP_Y, `const STEP_Y = 100;`],
    ],
  },

  // ---- family: the along-row lattice ----
  {
    id: "beads-fine",
    desc: "bead pitch and radius down ~3.5x — the rows become dotted lines",
    reps: [
      [SPACING, `      spacing: 16 + 2 * noise(i * 3.1 + 9),`],
      [RADIUS, `      let rad = 6.5 * (0.55 + 0.85 * field) * random(0.94, 1.06) * r.beadScale;`],
    ],
  },
  {
    id: "beads-coarse",
    desc: "bead pitch and radius up ~2.6x — boulders on a string",
    reps: [
      [SPACING, `      spacing: 150 + 16 * noise(i * 3.1 + 9),`],
      [RADIUS, `      let rad = 58 * (0.55 + 0.85 * field) * random(0.94, 1.06) * r.beadScale;`],
    ],
  },

  // ---- §5b: the bead pitch against the wave period ----
  {
    id: "bead-lock",
    desc: "pitch driven to ~1/4 of the arc per period — beads seek the vertices",
    reps: [[SPACING, `      spacing: 136,`]],
  },

  // ---- family: the gate (the band) ----
  {
    id: "band-none",
    desc: "no band — eleven uninterrupted rows, the inversion gone",
    reps: [
      [BAND_FLAG, `      band: false,`],
      [BAND_CALL, `  // band removed with the gate`],
    ],
  },
  {
    id: "band-wide",
    desc: "band over rows 2-8 — the sheet is mostly night",
    reps: [
      [BAND, `const BAND = {\n  i0: 2,\n  i1: 8,\n  pad: 150\n};`],
      [BAND_ROWS, BAND_ROWS_GENERIC],
    ],
  },

  // ---- family: the tone field that sizes every bead ----
  {
    id: "tone-grad",
    desc: "noise dropped from the bead field — pure corner-to-corner ramp",
    reps: [[TONE, `      const field = grad;`]],
  },

  // ---- family: the eye ----
  {
    id: "eye-strong",
    desc: "knot pull 3x at 2.5x reach — the whole cloth funnels into it",
    reps: [[EYE, `const EYE = {\n  x: 1060,\n  y: 810,\n  sx: 900,\n  sy: 900,\n  pull: 1.6,\n  r: 255\n};`]],
  },

  // ---- family: palette. The piece is NAMED for the madder, which by the
  // coverage rule is ~4% of the frame in two short runs. This cell does not
  // test that; it tests what the ladder looks like inverted. ----
  {
    id: "red-all",
    desc: "madder promoted from accent to the whole cloth",
    reps: [
      [BEADSET, `      beadSet: RED_SET,`],
      [THREADCOL, `      threadCol: MADDER,`],
      [FADE_7, `      r.beadSet = RED_WARM;\n    }\n    if (i === 10) r.beadSet = RED_WARM;`],
    ],
  },

  // ---- family: the ground. Here PAPER really is the sheet. ----
  {
    id: "ground-dark",
    desc: "night cloth — PAPER and INK swapped, with the glaze tints and sets",
    reps: [
      [PAPER_C, `const PAPER = [28, 26, 24];`],
      [INK_C, `const INK = [238, 233, 222];`],
      [GHOST_C, `const GHOST = [72, 68, 62];`],
      [INK_SET, `const INK_SET = {\n  base: INK,\n  hi: [250, 246, 238],\n  skip: PAPER\n};`],
      [PAPER_SET, `const PAPER_SET = {\n  base: PAPER,\n  hi: [14, 13, 11],\n  skip: [244, 240, 230]\n};`],
      [TINTS, `  const tints = [\n    [40, 38, 34],\n    [24, 23, 21],\n    [46, 43, 39],\n    [33, 31, 28],\n    [52, 49, 44],\n    [20, 20, 19]\n  ];`],
    ],
  },

  // ---- family (NOT a control, on this piece): the ghost pass ----
  {
    id: "ghost-x8",
    desc: "misregistration x8 — predicted to READ here, unlike three pieces before",
    reps: [[GHOST_OFF, `  translate(136, -96);`]],
  },

  // ---- the control: predicted not to read ----
  {
    id: "specks-x7",
    desc: "CONTROL: finish specks multiplied by 7",
    control: true,
    reps: [[SPECKS, `  specks(9100);`]],
  },
];
