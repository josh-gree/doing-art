// Variation study for "Lunar Census, Plate IV" (lunar-census).
//
// The piece is a radial census: buildCensus() walks rings from RMAX=1330 inward
// to RMIN=26, laying short tangential ticks along each ring. Every tick's colour
// comes from pickInk(u) where u is the tick's RANK in the census (i / N) — and
// because the rings are built outer-to-inner, rank is radius. LADDER's seven
// quantiles are therefore not a palette, they are the radial geography of the
// whole plate: slate owns the outer half, gold the last 4.5% at the heart.
//
// §5a, answered by reading:
//   1. field       — u = i/N (rank ≈ radius), read by LADDER; and shadeAt(),
//                    read by every tick inside M.r for colour, alpha and length.
//   2. discretizer — `gap` (radial, 19/12) and `step` (tangential, ~35/16) in
//                    buildCensus. Their RATIO is the §5b family (see ratio-one).
//   3. gate        — the vnoise `continue` that erodes ticks outside M.r*1.06.
//                    It is the only thing giving the outer cloud a silhouette.
//   4. ground      — NOT the PAPER constant (6 usages, all tinting marks).
//                    drawPaper() paints the sheet from literals in a pixel loop:
//                    `var v = 228 + n1 * 26 + ...`, clamped to 204..248.
//
// Rejected by the coverage rule (§5) without spending a cell: dust() (2200 dots
// at ~4px), spatterAll (~470 specks), speckGrain/grainPass, the paper fibre
// pass, legend, seal, registration marks, ghostDial, zigzag amplitude, the
// stitch spacing. Each is under a couple of per cent of the frame.
//
// Every anchor below was `grep -c`'d first. `var base = th + HALF_PI + tilt;`
// appears in BOTH buildCensus() and satelliteCensus() with identical
// indentation, so RADIAL carries the preceding tilt block with it.

// ---------- the ink ladder (the field's read-out) ----------
const rung = (c, q, g, u) => `{\n  c: [${c.join(", ")}],\n  q: ${q},\n  g: ${g},\n  u: ${u}\n}`;
const ladder = (rungs) => `var LADDER = [${rungs.map((r) => rung(...r)).join(", ")}];`;

const SLATE = [88, 100, 118],
  JADE = [60, 138, 120],
  OCHRE = [178, 138, 52],
  RUST = [164, 82, 44],
  CRIM = [174, 56, 68],
  CREAM = [238, 231, 210],
  GOLD = [212, 160, 50];

const LADDER_BASE = ladder([
  [SLATE, "0.500", 0, 0],
  [JADE, "0.170", 0, 0],
  [OCHRE, "0.130", 0, 0],
  [RUST, "0.075", 0, 0],
  [CRIM, "0.055", 0, 1],
  [CREAM, "0.030", 0, 0],
  [GOLD, "0.045", 1, 0],
]);

// ---------- the lattice ----------
const LATTICE = `    var gap = inS ? 12 : 19;
    var step = inS ? 16 : (28 + 14 * vnoise(ring * 0.16, 3.7));`;
const lattice = (gIn, gOut, sIn, sOut, sVar) => `    var gap = inS ? ${gIn} : ${gOut};
    var step = inS ? ${sIn} : (${sOut} + ${sVar} * vnoise(ring * 0.16, 3.7));`;

// Tick size travels with the lattice, or a scale family reads as a density
// family: at gap 7 the baseline 15-27px ticks overlap into felt.
const TICKSIZE = `      var ln = rndr(15, 27),
        wg = rndr(3, 6);
      if (inS) {
        ln *= 0.9;
        wg = rndr(3.4, 6.4);
      }`;
const ticksize = (l0, l1, w0, w1, wi0, wi1) => `      var ln = rndr(${l0}, ${l1}),
        wg = rndr(${w0}, ${w1});
      if (inS) {
        ln *= 0.9;
        wg = rndr(${wi0}, ${wi1});
      }`;

const PHASE = `    var phase = ring * 0.37;`;

// ---------- the gate ----------
const WTH = `        var wth = 0.06 + 0.11 * vnoise(cs * 0.55 + 2, sn * 0.55 + 2) + ring * 0.015;
        if (wth > 0.22) wth = 0.22;`;
const GATE = `        if (vnoise(cs * 1.2 + 21 + ring * 0.05, sn * 1.2 + 21) < wth) continue;`;

// ---------- tick orientation ----------
const RADIAL = `      var tilt = (vnoise(x * 0.0013 + 9, y * 0.0013 + 9) - 0.5) * 2.0 +
        rndr(-0.06, 0.06) + 0.1 * Math.sin(th * 4 + r * 0.01);
      var base = th + HALF_PI + tilt;`;

// ---------- the seam ----------
const PIN = `    y: y - d * pin * 0.88,`;
const SEAM_CONST = `var MID_S = 1565,
  TILT = 0.030,
  T_PINCH = 245;`;
// §5c: the stitches and the seating smudge are drawn ALONG seamAt(). Unweave the
// plate and leave them in and the ink still says "seam" while the field does not.
const SEAM_ORNAMENT = `  seatSmudge();
  stitches();`;

// ---------- ground and light ----------
const PAPER_BASE = `      var v = 228 + n1 * 26 + n2 * 11 + Math.sin(y * 0.055 + Math.sin(x * 0.01) * 2) * 2;`;
const PAPER_CLAMP = `      v = Math.min(248, Math.max(204, v));`;
const INK_CONST = `var PAPER = [229, 226, 217],
  CHARC = [45, 41, 37];`;
const LIGHT = `var LX = -0.45,
  LY = -0.60,
  LZ = 0.66;`;

// ---------- the control ----------
const RING_OFFSET = `      ox: opt.ox + rndr(-off, off),
      oy: opt.oy + rndr(-off, off),`;
const GOLD_UNDER = `      line(t.x - ca2 + 1.6, t.y - sa2 + 2.2, t.x + ca2 + 1.6, t.y + sa2 + 2.2);`;
const CRIM_UNDER = `      line(t.x - ca2 + 1.4, t.y - sa2 + 1.8, t.x + ca2 + 1.4, t.y + sa2 + 1.8);`;

export default [
  {
    id: "baseline",
    desc: "as delivered — slate sea to gold heart, woven through the seam",
    reps: [],
  },

  // ---- family: the ladder (what the field is read out as) ----
  {
    id: "ladder-flat",
    desc: "seven equal rungs — every ink owns a seventh of the census",
    reps: [[LADDER_BASE, ladder([
      [SLATE, "0.143", 0, 0],
      [JADE, "0.143", 0, 0],
      [OCHRE, "0.143", 0, 0],
      [RUST, "0.143", 0, 0],
      [CRIM, "0.143", 0, 1],
      [CREAM, "0.143", 0, 0],
      [GOLD, "0.143", 1, 0],
    ])]],
  },
  {
    id: "ladder-slate",
    desc: "scarcity pushed hard — slate owns 90%, the ladder is a jewelled core",
    reps: [[LADDER_BASE, ladder([
      [SLATE, "0.900", 0, 0],
      [JADE, "0.020", 0, 0],
      [OCHRE, "0.020", 0, 0],
      [RUST, "0.020", 0, 0],
      [CRIM, "0.015", 0, 1],
      [CREAM, "0.010", 0, 0],
      [GOLD, "0.015", 1, 0],
    ])]],
  },
  {
    id: "ladder-reverse",
    desc: "the ladder inverted — gold sea, slate heart",
    reps: [[LADDER_BASE, ladder([
      [GOLD, "0.500", 1, 0],
      [CREAM, "0.170", 0, 0],
      [CRIM, "0.130", 0, 1],
      [RUST, "0.075", 0, 0],
      [OCHRE, "0.055", 0, 0],
      [JADE, "0.030", 0, 0],
      [SLATE, "0.045", 0, 0],
    ])]],
  },

  // ---- family: lattice scale (how many ticks, how big) ----
  {
    id: "lattice-coarse",
    desc: "3.5x coarser rings and ticks — a few hundred heavy dashes",
    reps: [
      [LATTICE, lattice(42, 66, 56, 96, 44)],
      [TICKSIZE, ticksize(50, 90, 9, 18, 10, 19)],
    ],
  },
  {
    id: "lattice-fine",
    desc: "2.7x finer — the census as hairline felt, ~100k ticks",
    reps: [
      [LATTICE, lattice(5, 7, 6.5, 11, 5)],
      [TICKSIZE, ticksize(6, 11, 1.2, 2.4, 1.4, 2.6)],
    ],
  },

  // ---- §5b: the two scales that beat against each other ----
  {
    id: "ratio-one",
    desc: "tangential step driven down to the radial gap — sampling ratio 1",
    reps: [[LATTICE, lattice(12, 19, 12, 19, 0)]],
  },
  {
    id: "phase-lock",
    desc: "every ring starts at the same angle — rings stop being independent",
    reps: [[PHASE, `    var phase = ring * 0;`]],
  },

  // ---- family: the gate (the silhouette of the outer cloud) ----
  {
    id: "gate-open",
    desc: "erosion off — the census fills its disc to RMAX, full bleed",
    reps: [[GATE, `        if (false) continue;`]],
  },
  {
    id: "gate-wedges",
    desc: "gate swapped for twelve wedges — the cloud becomes a rosette",
    reps: [
      [GATE, `        if (Math.floor((((th % TWO_PI) + TWO_PI) % TWO_PI) / (Math.PI / 6)) % 2 === 0) continue;`],
    ],
  },

  // ---- family: the seam (the global deformation) ----
  {
    id: "seam-flat",
    desc: "unwoven — no pinch, and the stitches that restate it removed (§5c)",
    reps: [
      [PIN, `    y: y - d * pin * 0.0,`],
      [SEAM_ORNAMENT, `  // seam ornament removed with the weave`],
    ],
  },
  {
    id: "seam-wide",
    desc: "pinch widened 3.7x and pulled to 1.0 — the plate collapses into the weave",
    reps: [
      [SEAM_CONST, `var MID_S = 1565,\n  TILT = 0.030,\n  T_PINCH = 900;`],
      [PIN, `    y: y - d * pin * 1.0,`],
    ],
  },

  // ---- family: geometry of the mark ----
  {
    id: "tick-radial",
    desc: "ticks turned 90 degrees — the census combs outward instead of around",
    reps: [[RADIAL, `      var tilt = (vnoise(x * 0.0013 + 9, y * 0.0013 + 9) - 0.5) * 2.0 +\n        rndr(-0.06, 0.06) + 0.1 * Math.sin(th * 4 + r * 0.01);\n      var base = th + tilt;`]],
  },

  // ---- family: ground (the boldest single edit in the file) ----
  {
    id: "ground-dark",
    desc: "night plate — the pixel-loop literals inverted, shadow ink deepened",
    reps: [
      [PAPER_BASE, `      var v = 52 + n1 * 26 + n2 * 11 + Math.sin(y * 0.055 + Math.sin(x * 0.01) * 2) * 2;`],
      [PAPER_CLAMP, `      v = Math.min(78, Math.max(26, v));`],
      [INK_CONST, `var PAPER = [229, 226, 217],\n  CHARC = [16, 15, 14];`],
    ],
  },

  // ---- family: light (17% of the frame, at full alpha — borderline by §5) ----
  {
    id: "light-flip",
    desc: "light moved to the lower right — the moon's tonal geography rebuilt",
    reps: [[LIGHT, `var LX = 0.55,\n  LY = 0.55,\n  LZ = 0.63;`]],
  },

  // ---- the control: predicted NOT to read (§5, and it has now failed 3x) ----
  {
    id: "misreg-x8",
    desc: "CONTROL: every overprint offset multiplied by 8",
    control: true,
    reps: [
      [RING_OFFSET, `      ox: opt.ox * 8 + rndr(-off, off),\n      oy: opt.oy * 8 + rndr(-off, off),`],
      [GOLD_UNDER, `      line(t.x - ca2 + 12.8, t.y - sa2 + 17.6, t.x + ca2 + 12.8, t.y + sa2 + 17.6);`],
      [CRIM_UNDER, `      line(t.x - ca2 + 11.2, t.y - sa2 + 14.4, t.x + ca2 + 11.2, t.y + sa2 + 14.4);`],
    ],
  },
];
