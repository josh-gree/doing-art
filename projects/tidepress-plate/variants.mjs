// Variation study for "Tidepress Plate" (tidepress-plate).
//
// The piece is a 48x48 halftone lattice clipped to a circular plate. Every dot's
// radius comes from fieldValue(): concentric ripples from P1 (wavelength L1)
// interfered with ripples from P2 (L2), plus a Gaussian bloom at P1 and a ridge
// along the P1-P2 segment. That one function is read by three downstream layers
// — radius, ink colour, and whether a dot gets satellites or internal grain —
// so it is where the bold families should live (§5).
//
// Families here: lattice scale, ripple scale, source count/geometry, gate, ink.
// Plus one control I predict will NOT read.
//
// Anchors are whole multi-line blocks wherever a bare number would collide.
// `const N = 48, margin = 180;` appears in BOTH halftone() and gridGhost(), so
// the lattice anchor carries the function signature with it.

const LATTICE = `function halftone() {
  const N = 48,
    margin = 180;`;
const lattice = (n) => `function halftone() {
  const N = ${n},
    margin = 180;`;

const WAVE = `const L1 = 200,
  L2 = 350;`;
const wave = (l1, l2) => `const L1 = ${l1},
  L2 = ${l2};`;

const SOURCE = `  const d1 = Math.sqrt(dx1 * dx1 + dy1 * dy1),
    a1 = Math.atan2(dy1, dx1);`;

const FIELD_SUM = `  return constrain(0.15 + 0.62 * w1 * env1 + w2 * env2 + 0.52 * bloom + ridge + 0.14 * (cl - 0.5), 0.02, 1);`;

const GATE = `if (dRC > 1198) continue;`;
const SOFT_EDGE = `t *= Math.pow(constrain((1198 - dRC) / 130, 0, 1), 0.75); // soft plate edge`;

// The plate rim and the wide tone arc restate the circular silhouette in ink.
// A gate variant that changes the silhouette has to drop them too, or the frame
// still says "circle" and the variant reads as a broken plate rather than a new
// one.
const RIM = `  const rim1 = ringObj(RC.x, RC.y, 1160, 6, 205);
  const rim2 = ringObj(RC.x, RC.y, 1215, 27, 240);
  drawElem(rim1, 14, -10, 0.25);
  drawElem(rim2, 14, -10, 0.25);
  drawElem(rim1, 0, 0, 1);
  drawElem(rim2, 0, 0, 1);`;
const PLATE_TONE = `  plateTone();`;

const INK_RAMP = `  const inkV = 150 - 132 * constrain(t * 1.45, 0, 1);`;
const INK_MIX = `  const R = inkV + 5 + 22 * sep + jw;
  const G = inkV + 2 + 8 * sep + jw * 0.3;
  const bl = inkV - 5 - 14 * sep + jw * 0.5;`;

// PAPER is NOT the ground. drawPaper() paints the sheet from literals inside a
// pixel loop; the PAPER constant only tints erode() specks and paperStroke()
// highlights (2 usages each). A "dark paper" variant that only swaps PAPER is a
// no-op — it has to reach into the pixel loop.
const PAPER_BASE = `      let v = 230 + n1 * 18 + n2 * 10 + n3 * 18;`;
const PAPER_CLAMP = `      v = constrain(v, 200, 246);`;

const GHOST = `  for (const e of accents) drawElem(e, 18, -13, 0.30); // misregistered ghost pass`;

export default [
  {
    id: "baseline",
    desc: "as delivered — 48² lattice, L1 200 / L2 350, circular plate",
    reps: [],
  },

  // ---- family: lattice scale (how many dots) ----
  {
    id: "lat-coarse",
    desc: "lattice 48² → 16² — 200 fat dots instead of 2300",
    reps: [[LATTICE, lattice(16)]],
  },
  {
    id: "lat-fine",
    desc: "lattice 48² → 132² — dots collapse into continuous tone",
    reps: [[LATTICE, lattice(132)]],
  },

  // ---- family: ripple scale (how big the waves are) ----
  {
    id: "wave-broad",
    desc: "L1 200→620, L2 350→1000 — three broad tidal bands",
    reps: [[WAVE, wave(620, 1000)]],
  },
  {
    id: "wave-tight",
    desc: "L1 200→64, L2 350→105 — dense interference, near-moiré",
    reps: [[WAVE, wave(64, 105)]],
  },

  // ---- family: source count and geometry (what shape the field is) ----
  {
    id: "src-solo",
    desc: "one source — P2 interference and the P1–P2 ridge removed",
    reps: [[FIELD_SUM, `  return constrain(0.15 + 0.62 * w1 * env1 + 0.52 * bloom + 0.14 * (cl - 0.5), 0.02, 1);`]],
  },
  {
    id: "src-grid",
    desc: "P1 tiled on an 780px grid — a quilt of ~9 ripple sources",
    reps: [[SOURCE, `  const GS = 780;
  const gx = P1.x + Math.round(dx1 / GS) * GS,
    gy = P1.y + Math.round(dy1 / GS) * GS;
  const ex = x - gx,
    ey = y - gy;
  const d1 = Math.sqrt(ex * ex + ey * ey),
    a1 = Math.atan2(ey, ex);`]],
  },
  {
    id: "src-plane",
    desc: "radial distance → linear projection — plane waves, not rings",
    reps: [[SOURCE, `  const d1 = dx1 * 0.6 + dy1 * 0.8 + 1400,
    a1 = Math.atan2(dy1, dx1);`]],
  },

  // ---- family: gate (what silhouette the field is printed through) ----
  {
    id: "gate-none",
    desc: "no plate — the field runs full bleed to the frame",
    reps: [
      [GATE, `if (false) continue;`],
      [SOFT_EDGE, `t *= 1; // gate removed`],
      [RIM, ""],
      [PLATE_TONE, ""],
    ],
  },
  {
    id: "gate-annulus",
    desc: "plate hollowed to a ring — the bloom and anchor are cut out",
    reps: [[GATE, `if (dRC > 1198 || dRC < 645) continue;`]],
  },
  {
    id: "gate-checker",
    desc: "the field printed through 330px checker tiles",
    reps: [
      [GATE, `if ((Math.floor(x / 330) + Math.floor(y / 330)) % 2 === 0) continue;`],
      [SOFT_EDGE, `t *= 1; // gate replaced by checker`],
      [RIM, ""],
      [PLATE_TONE, ""],
    ],
  },

  // ---- family: ink and ground ----
  {
    id: "ink-negative",
    desc: "dark ground, pale ink — the whole logic of the plate inverted",
    reps: [
      [PAPER_BASE, `      let v = 44 + n1 * 14 + n2 * 8 + n3 * 14;`],
      [PAPER_CLAMP, `      v = constrain(v, 22, 66);`],
      [INK_RAMP, `  const inkV = 96 + 150 * constrain(t * 1.45, 0, 1);`],
      [`const INK = [48, 44, 40];`, `const INK = [224, 216, 198];`],
      [`const PAPER = [233, 227, 211];`, `const PAPER = [38, 34, 30];`],
    ],
  },
  {
    id: "ink-prussian",
    desc: "charcoal/umber duotone → prussian blue with a rust separation",
    reps: [[INK_MIX, `  const R = inkV * 0.52 + 30 * sep + jw;
  const G = inkV * 0.92 + 6 + 10 * sep + jw * 0.3;
  const bl = inkV * 1.02 + 52 - 20 * sep + jw * 0.5;`]],
  },

  // ---- control (§5): predicted NOT to read at thumbnail size ----
  {
    id: "ctl-ghost8",
    desc: "CONTROL: misregistration ghost offset ×8 — predicted invisible",
    control: true,
    reps: [[GHOST, `  for (const e of accents) drawElem(e, 144, -104, 0.30); // misregistered ghost pass`]],
  },
];
