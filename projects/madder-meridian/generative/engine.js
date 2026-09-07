// "Madder Meridian" as a CFG-driven engine.
//
// Derived from projects/madder-meridian/artgarten/sketch.js, which stays in the repo untouched
// as the reference render and the provenance. Everything from g2() down is the
// original — rowY, rowDots, stampDot, blobFill, the tremble/echo/slub thread
// passes, the knot eye, the seam, the paper and finish passes. They carry the
// visual identity and they were not improved. What changed: the two lattices,
// the waveform, the band gate, the ground, the accent and the row roles now
// read from CFG, and every row index is generated from ROWS_N instead of named.
//
// The delivered sketch pins its furniture to eleven rows in five separate
// functions (drawBand, drawSeam, drawRepairs, frenchKnots, drawStrays). That is
// why the study's 5-row variant first rendered as a handsome crash. Making the
// row count a real parameter meant fixing all five.
//
// Global-mode p5: setup/draw are bare globals and p5 auto-starts on window load.

let CFG, WAVE, SETS;
const W = 3000,
  H = 3000;

let PAPER, INK, GHOST, MADDER, MADDER_L, OXIDE;
let FRAME_C, FRAME_DARK, BAND_GLAZE;
let INK_SET, PAPER_SET, RED_SET, RED_WARM, FADE_SET;

const GRAYS = [
  [52, 50, 45],
  [80, 77, 69],
  [110, 106, 96],
  [140, 135, 124],
  [170, 164, 152]
];

let M = 110;
const FIELD = {
  x0: 205,
  y0: 210,
  x1: W - 205,
  y1: H - 210
};
let ROWS_N = 11,
  TOP_Y = 330,
  STEP_Y = 240;
let EYE, BAND, BANDS, SEAM_X;

let rows = [];

function inBand(i) {
  for (let b = 0; b < BANDS.length; b++) if (i >= BANDS[b].i0 && i <= BANDS[b].i1) return true;
  return false;
}

function currentSeed() {
  const q = new URLSearchParams(window.location.search).get("seed");
  if (q) return q;
  const s = Math.random().toString(36).slice(2, 8);
  const url = new URL(window.location.href);
  url.searchParams.set("seed", s);
  history.replaceState(null, "", url); // what you are looking at is always shareable
  return s;
}

function setup() {
  CFG = sampleConfig(window.__SEED__ !== undefined ? window.__SEED__ : currentSeed());
  window.__CFG__ = CFG;
  window.__RECIPE__ = recipeLine(CFG);
  pixelDensity(1);
  const c = createCanvas(CFG.canvas, CFG.canvas);
  c.parent("sketch");
  noLoop();
  const hud = document.getElementById("hud");
  if (hud) hud.textContent = CFG.seed + "  \u2014  " + window.__RECIPE__;
}

function applyConfig() {
  const g = CFG.ground,
    a = CFG.accent;
  PAPER = g.paper;
  INK = g.ink;
  GHOST = g.ghost;
  MADDER = a.base;
  MADDER_L = a.light;
  OXIDE = a.deep;
  FRAME_C = g.frame;
  FRAME_DARK = g.frameDark;
  // The band's internal glaze has to sit against the band, not against the
  // sheet: on a dark ground the band is light and a dark glaze is wrong.
  BAND_GLAZE = g.dark ? [[236, 232, 222], [190, 186, 176]] : [[16, 14, 11], [66, 61, 52]];

  INK_SET = { base: INK, hi: g.inkHi, skip: PAPER };
  PAPER_SET = { base: PAPER, hi: g.paperHi, skip: g.paperSkip };
  RED_SET = { base: a.base, hi: a.deep, skip: PAPER };
  RED_WARM = { base: a.warm, hi: a.warmDeep, skip: PAPER };
  FADE_SET = { base: g.fade, hi: g.fadeHi, skip: PAPER };
  SETS = { ink: INK_SET, paper: PAPER_SET, red: RED_SET, redWarm: RED_WARM, fade: FADE_SET };

  ROWS_N = CFG.rowsN;
  TOP_Y = CFG.top;
  STEP_Y = CFG.stepY;
  M = CFG.press.margin;
  BANDS = CFG.bands;
  BAND = BANDS.length ? BANDS[0] : null;
  EYE = CFG.eye;
  SEAM_X = CFG.seam.x;

  // The waveform is a mode, not a constant. All three keep the same -1..1 range
  // so amplitude means the same thing across them.
  const mode = CFG.wave.mode;
  WAVE =
    mode === "square"
      ? (ph) => (ph < 0.5 ? -1 : 1)
      : mode === "sine"
        ? (ph) => Math.sin(ph * TWO_PI)
        : (ph) => (ph < 0.5 ? ph * 4 - 1 : 3 - ph * 4);
}

function draw() {
  randomSeed(CFG.randomSeed);
  noiseSeed(CFG.noiseSeed);
  applyConfig();
  buildRows();

  background(PAPER[0], PAPER[1], PAPER[2]);
  noStroke();
  mottlePaper();
  fibres(CFG.press.fibres[0]);

  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(FIELD.x0, FIELD.y0, FIELD.x1 - FIELD.x0, FIELD.y1 - FIELD.y0);
  drawingContext.clip();

  ghostPass();

  for (let i = 0; i < ROWS_N; i++) {
    if (rows[i].band) continue;
    if (i === CFG.accentRow) drawPools();
    drawRow(i);
  }

  drawBand();
  if (EYE.on) drawEye();
  drawRepairs();
  frenchKnots();
  drawThreadEnds();
  if (CFG.seam.on) drawSeam();
  registrationMarks();

  drawingContext.restore();

  drawStrays();
  drawFrame();
  fibres(CFG.press.fibres[1]);
  specks(CFG.press.specks);
  grainVignette();
}

function keyPressed() {
  if (key === "r") {
    const url = new URL(window.location.href);
    url.searchParams.set("seed", Math.random().toString(36).slice(2, 8));
    window.location.href = url.toString();
  } else if (key === "s") {
    saveCanvas("madder-meridian-" + CFG.seed, "png");
  }
}

function g2(d, s) {
  return Math.exp(-(d * d) / (2 * s * s));
}

function capc(v) {
  return Math.max(0, Math.min(235, v));
}

/* ---------- row geometry: triangle wave + bend + eye pinch + seam shear ---------- */

function rowY(x, i) {
  const r = rows[i];
  const p = r.period;
  let ph = (((x + r.phase) % p) + p) % p;
  ph /= p;
  const t = WAVE(ph);
  let y = r.y + r.amp * t;
  y += (noise(x * 0.0012 + 7, i * 3.7) - 0.5) * 44;
  y += (noise(x * 0.02 + 100, i * 7.1) - 0.5) * 6;
  const pull = EYE.pull * r.pullScale *
    g2(x - EYE.x, EYE.sx) * g2(r.y - EYE.y, EYE.sy);
  y += (EYE.y - r.y) * pull;
  let s = constrain((x - (SEAM_X - 40)) / 40, 0, 1);
  s = s * s * (3 - 2 * s);
  y += r.seamShift * s;
  return y;
}

function buildRows() {
  rows = [];
  for (let i = 0; i < ROWS_N; i++) {
    const r = {
      i: i,
      y: TOP_Y + i * STEP_Y,
      period: CFG.wave.period + CFG.wave.periodVar * noise(i * 0.83 + 11),
      amp: CFG.wave.amp + CFG.wave.ampVar * noise(i * 0.33 + 4),
      phase: (noise(i * 0.8 + 40) - 0.5) * CFG.wave.phaseSpread,
      seamShift: (noise(i * 2.3 + 200) - 0.5) * CFG.seam.shift,
      spacing: CFG.beads.spacing + CFG.beads.spacingVar * noise(i * 3.1 + 9),
      band: inBand(i),
      pullScale: inBand(i) ? 0.6 : 1.0,
      shadow: false,
      threadCol: INK,
      threadW: 0,
      beadScale: 1,
      beadSet: INK_SET,
      redSeg: null,
      redSet: RED_SET,
      drifterIdx: -1,
      ringIdx: -1,
      strikeIdx: -1,
      ghostIdx: -1,
      gapIdx: -1
    };
    const spec = CFG.rowSpecs[i];
    r.threadW = spec.threadW;
    r.threadCol = spec.accentThread ? MADDER : INK;
    r.beadScale = spec.beadScale;
    r.beadSet = SETS[spec.beadSet];
    r.redSeg = spec.redSeg;
    r.redSet = SETS[spec.redSet];
    r.shadow = spec.shadow;
    r.hasBeads = r.threadW < 20;
    if (spec.drifter) r.drifterIdx = 12 + floor(random(6));
    if (spec.ring) r.ringIdx = 20 + floor(random(6));
    if (spec.strike) r.strikeIdx = 10 + floor(random(28));
    if (spec.ghost) r.ghostIdx = 8 + floor(random(5));
    if (spec.gap) r.gapIdx = 10 + floor(random(40));
    rows.push(r);
    r.dots = r.hasBeads ? rowDots(r) : [];
  }
}

/* beads placed at equal arc-length along the zigzag, sized by a breathing field */
function rowDots(r) {
  const pts = [];
  let acc = 0,
    px = null,
    py = null;
  for (let x = -r.period * 0.55; x <= W + r.period * 0.55; x += 3) {
    const y = rowY(x, r.i);
    if (px !== null) acc += Math.hypot(x - px, y - py);
    if (acc >= r.spacing) {
      acc = 0;
      const dy1 = y - rowY(x - 5, r.i);
      const dy2 = rowY(x + 5, r.i) - y;
      const vtx = dy1 * dy2 < 0;
      const f = noise(x * 0.0026 + 31.7, y * 0.0026 + 11.3);
      const grad = 1 - (x + y) / (2 * W);
      const field = CFG.toneNoise * f + (1 - CFG.toneNoise) * grad;
      let rad = CFG.beads.radius * (0.55 + 0.85 * field) * random(0.94, 1.06) * r.beadScale;
      if (vtx) rad *= 1.26;
      rad *= 1 + 0.30 * g2(x - EYE.x, 640) * g2(y - EYE.y, 640);
      const tone = Math.min(1, 0.2 + 0.8 * field + (vtx ? 0.12 : 0));
      pts.push({
        x: x + random(-5, 5),
        y: y + random(-5, 5),
        r: rad,
        vtx: vtx,
        rot: random(-0.09, 0.09),
        sq: random(0.95, 1.05),
        tone: tone
      });
    }
    px = x;
    py = y;
  }
  return pts;
}

/* ---------- bead stamping ---------- */

function stampDot(x, y, r, tone, C) {
  const rot = random(-0.09, 0.09);
  const sq = random(0.95, 1.05);
  const load = 0.52 + 0.48 * tone;
  const cr = C.base[0] + random(-4, 4);
  const cg = C.base[1] + random(-4, 3);
  const cb = C.base[2] + random(-4, 3);
  fill(cr + 6, cg + 6, cb + 5, 30 * load);
  blobFill(x + r * 0.05, y + r * 0.05, r * 1.12, 3.1, 0.14, rot + 0.03, sq);
  fill(cr, cg, cb, 214 * load);
  blobFill(x, y, r, 0, 0.13, rot, sq);
  fill(C.hi[0], C.hi[1], C.hi[2], 105 * load);
  blobFill(x - r * 0.05, y - r * 0.06, r * 0.93, 7.7, 0.13, rot - 0.02, sq);
  const skips = floor(r * 0.55);
  for (let s = 0; s < skips; s++) {
    const a = random(TWO_PI),
      d = sqrt(random()) * r * 0.8;
    fill(C.skip[0], C.skip[1], C.skip[2], random(14, 40));
    ellipse(x + cos(a) * d, y + sin(a) * d, random(1.6, 5.2), random(1.6, 5.2));
  }
}

function blobFill(x, y, r, off, wob, rot, sq) {
  beginShape();
  const n = 28;
  const cr = cos(rot),
    sr = sin(rot);
  for (let k = 0; k < n; k++) {
    const a = TWO_PI * k / n;
    const q = noise(x * 0.012 + cos(a) * 1.8 + off,
      y * 0.012 + sin(a) * 1.8 - off);
    const rr = r * (1 + (q - 0.5) * wob);
    const px = cos(a) * rr;
    const py = sin(a) * rr * sq;
    vertex(x + px * cr - py * sr, y + px * sr + py * cr);
  }
  endShape(CLOSE);
}

function blobPath(x, y, r, off, wob) {
  beginShape();
  const n = 40;
  for (let k = 0; k < n; k++) {
    const a = TWO_PI * k / n;
    const q = noise(x * 0.012 + cos(a) * 1.8 + off,
      y * 0.012 + sin(a) * 1.8 - off);
    const rr = r * (1 + (q - 0.5) * wob);
    vertex(x + cos(a) * rr, y + sin(a) * rr);
  }
  endShape(CLOSE);
}

function drifter(p) {
  const dx = 110,
    dy = 70;
  const fr = [0.28, 0.55, 0.8];
  const fa = [44, 26, 14];
  const fs = [0.55, 0.68, 0.82];
  noStroke();
  for (let k = 0; k < 3; k++) {
    fill(INK[0], INK[1], INK[2], fa[k]);
    blobFill(p.x + dx * fr[k], p.y + dy * fr[k], p.r * fs[k], 2.0 + k, 0.12,
      random(-0.12, 0.12), random(0.94, 1.06));
  }
  stampDot(p.x + dx, p.y + dy, p.r * 0.9, 0.7, INK_SET);
}

function ringAt(p) {
  noFill();
  stroke(INK[0], INK[1], INK[2], 228);
  strokeWeight(p.r * 0.34);
  blobPath(p.x, p.y, p.r * 0.95, 2.3, 0.09);
  stroke(24, 22, 19, 80);
  strokeWeight(p.r * 0.14);
  blobPath(p.x - p.r * 0.04, p.y - p.r * 0.04, p.r * 0.88, 5.1, 0.09);
  noStroke();
}

function ghostStampAt(p) {
  noStroke();
  fill(INK[0], INK[1], INK[2], 20);
  blobFill(p.x, p.y, p.r * 1.05, 3.1, 0.13, p.rot, p.sq);
  fill(INK[0], INK[1], INK[2], 42);
  blobFill(p.x, p.y, p.r * 0.9, 0, 0.11, p.rot - 0.03, p.sq);
}

function redSegment(r) {
  noStroke();
  for (const p of r.dots) {
    if (p.x <= r.redSeg[0] - 8 || p.x >= r.redSeg[1] + 8) continue;
    fill(80, 24, 15, 115);
    blobFill(p.x + 5, p.y + 5, p.r * 1.02, p.vtx ? 5.0 : 2.2, 0.12, p.rot, p.sq);
    stampDot(p.x, p.y, p.r * 1.04, 1, r.redSet);
  }
}

function drawBeads(r) {
  noStroke();
  const pts = r.dots;
  for (let k = 0; k < pts.length; k++) {
    const p = pts[k];
    if (r.redSeg && p.x > r.redSeg[0] - 8 && p.x < r.redSeg[1] + 8) continue;
    if (r.gapIdx >= 0 && (k === r.gapIdx || k === r.gapIdx + 1)) continue;
    if (k === r.drifterIdx) {
      drifter(p);
      continue;
    }
    if (k === r.ringIdx) {
      ringAt(p);
      continue;
    }
    if (k === r.ghostIdx) {
      ghostStampAt(p);
      continue;
    }
    if (k === r.strikeIdx) {
      stampDot(p.x, p.y, p.r, p.tone, r.beadSet);
      stampDot(p.x + p.r * 0.2, p.y + p.r * 0.12, p.r * 0.97, p.tone, r.beadSet);
      continue;
    }
    stampDot(p.x, p.y, p.r, p.tone, r.beadSet);
  }
  if (r.redSeg) redSegment(r);
}

/* ---------- thread work ---------- */

function tremblePass(x0, x1, i, off, col, wBase, alphaBase, seed, gapT) {
  const step = 11;
  let px = x0,
    py = rowY(x0, i) + off;
  for (let x = x0 + step; x <= x1; x += step) {
    const y = rowY(x, i) + off;
    if (noise(x * 0.02 + seed) > gapT) {
      const a = alphaBase * (0.8 + 0.2 * noise(x * 0.045 + seed * 1.3));
      const w = wBase * (0.85 + 0.3 * noise(x * 0.03 + seed * 2.1));
      stroke(col[0], col[1], col[2], a);
      strokeWeight(w);
      line(px, py, x, y);
    }
    px = x;
    py = y;
  }
}

function echoLine(x0, x1, i, d, col, wBase, alphaBase, seed) {
  const step = 13;
  const yf = (x) => rowY(x, i) + d + (noise(x * 0.013 + seed) - 0.5) * 9;
  let px = x0,
    py = yf(x0);
  for (let x = x0 + step; x <= x1; x += step) {
    const y = yf(x);
    const a = alphaBase * (0.5 + 0.5 * noise(x * 0.05 + seed * 1.7));
    stroke(col[0], col[1], col[2], a);
    strokeWeight(wBase * (0.8 + 0.4 * noise(x * 0.04 + seed * 2.3)));
    line(px, py, x, y);
    px = x;
    py = y;
  }
}

function slubs(i, wt) {
  strokeCap(ROUND);
  let x = FIELD.x0 + random(40, 140);
  while (x < FIELD.x1 - 40) {
    const y = rowY(x, i);
    const y2 = rowY(x + 12, i);
    const ang = Math.atan2(y2 - y, 12);
    push();
    translate(x, y);
    rotate(ang);
    stroke(PAPER[0], PAPER[1], PAPER[2], 90);
    strokeWeight(4);
    line(0, -wt * 0.26, random(10, 20), -wt * 0.26);
    line(0, wt * 0.26, random(10, 20), wt * 0.26);
    pop();
    x += random(130, 220);
  }
}

function wobbleLine(x0, y0, x1, y1, col, w, a, seed) {
  const n = 5;
  let px = x0,
    py = y0;
  for (let k = 1; k <= n; k++) {
    const f = k / n;
    const x = lerp(x0, x1, f) + (noise(k * 0.7 + seed) - 0.5) * 7;
    const y = lerp(y0, y1, f) + (noise(k * 0.7 + seed + 40) - 0.5) * 7;
    stroke(col[0], col[1], col[2], a);
    strokeWeight(w * (0.85 + 0.3 * noise(k * 0.9 + seed * 2)));
    line(px, py, x, y);
    px = x;
    py = y;
  }
}

function wobbleRing(r, col, wBase, alphaBase, seed) {
  const n = 88;
  let px = r,
    py = 0;
  for (let k = 1; k <= n; k++) {
    const a = (k / n) * TWO_PI;
    const rr = r + (noise(Math.cos(a) * 2 + seed, Math.sin(a) * 2 + seed * 1.7) - 0.5) * 24;
    const x = Math.cos(a) * rr,
      y = Math.sin(a) * rr;
    stroke(col[0], col[1], col[2], alphaBase * (0.6 + 0.4 * noise(k * 0.3 + seed * 2.3)));
    strokeWeight(wBase * (0.85 + 0.3 * noise(k * 0.5 + seed * 3.1)));
    line(px, py, x, y);
    px = x;
    py = y;
  }
}

function repairCross(i, x) {
  const y = rowY(x, i);
  wobbleLine(x - 17, y - 17, x + 17, y + 17, MADDER, 6, 210, x * 0.11);
  wobbleLine(x + 17, y - 17, x - 17, y + 17, MADDER, 6, 210, x * 0.17 + 9);
  const y2 = rowY(x + 6, i);
  const ang = Math.atan2(y2 - y, 6) + Math.PI / 2;
  wobbleLine(x - Math.cos(ang) * 30, y - Math.sin(ang) * 30,
    x + Math.cos(ang) * 30, y + Math.sin(ang) * 30, MADDER, 4, 150, x * 0.23 + 3);
}

function threadEnd(tx, ty, baseAng, col) {
  let x = tx,
    y = ty,
    a = baseAng;
  strokeCap(ROUND);
  for (let seg = 0; seg < 4; seg++) {
    const l = random(22, 44);
    stroke(col[0], col[1], col[2], 175);
    strokeWeight(4);
    const nx = x + Math.cos(a) * l,
      ny = y + Math.sin(a) * l;
    line(x, y, nx, ny);
    x = nx;
    y = ny;
    a += random(0.15, 0.4) * (random() < 0.5 ? 1 : -1);
  }
}

function drawRow(i) {
  const r = rows[i];
  if (r.threadW > 0) {
    const heavy = r.threadW >= 20;
    strokeCap(ROUND);
    tremblePass(-100, W + 100, i, 0, r.threadCol, r.threadW * 2.0, 26, 100 + i * 13, 0.10);
    tremblePass(-100, W + 100, i, 0, r.threadCol, r.threadW, 245, 300 + i * 17, 0.15);
    const side = (i % 2 === 0) ? 1 : -1;
    const eCol = (r.threadCol === MADDER) ?
      MADDER_L :
      [capc(r.threadCol[0] + 40), capc(r.threadCol[1] + 38), capc(r.threadCol[2] + 34)];
    echoLine(-80, W + 80, i, (34 + noise(i * 5.3 + 2) * 14) * side, eCol,
      heavy ? 6.5 : 4.5, heavy ? 120 : 90, 500 + i * 31);
    if (heavy) {
      echoLine(-80, W + 80, i, -(60 + noise(i * 4.1 + 8) * 14) * side, eCol, 4.5, 65, 700 + i * 23);
      slubs(i, r.threadW);
    }
  }
  if (r.hasBeads) drawBeads(r);
  if (i === 2) accentTicks();
}

/* basting ticks straddling the madder thread */
function accentTicks() {
  strokeCap(ROUND);
  const off0 = random(0, 180);
  for (let x = FIELD.x0 + 50 + off0; x < FIELD.x1 - 50; x += 180) {
    if (Math.abs(x - EYE.x) < 340) continue;
    const y = rowY(x, CFG.accentRow);
    const y2 = rowY(x + 6, CFG.accentRow);
    const ang = Math.atan2(y2 - y, 6) + Math.PI / 2;
    wobbleLine(x - Math.cos(ang) * 17, y - Math.sin(ang) * 17,
      x + Math.cos(ang) * 17, y + Math.sin(ang) * 17,
      INK, 4.5, 140, x * 0.13);
  }
}

/* madder ink blots gathered at the red thread's sharp turns near the eye */
function drawPools() {
  noStroke();
  const r = rows[CFG.accentRow];
  for (let m = 0; m <= 8; m++) {
    for (let f = 0; f <= 1; f += 0.5) {
      const xx = (m + f) * r.period - r.phase;
      if (xx > FIELD.x0 + 60 && xx < FIELD.x1 - 60 &&
        Math.abs(xx - EYE.x) < 780 && Math.abs(xx - SEAM_X) > 200) {
        const yy = rowY(xx, CFG.accentRow);
        fill(MADDER[0], MADDER[1], MADDER[2], 80);
        ellipse(xx, yy + 3, 46, 22);
        fill(MADDER[0], MADDER[1], MADDER[2], 120);
        ellipse(xx, yy, 18, 11);
      }
    }
  }
}

/* ---------- charcoal band with paper beads ---------- */

function paperEdge(y, dir) {
  stroke(PAPER[0], PAPER[1], PAPER[2], 215);
  strokeWeight(10);
  beginShape();
  for (let x = -30; x <= W + 30; x += 12) {
    vertex(x, y + dir * (noise(x * 0.004, y * 0.013) - 0.5) * 20);
  }
  endShape();
  strokeWeight(20);
  stroke(PAPER[0], PAPER[1], PAPER[2], 80);
  beginShape();
  for (let x = -30; x <= W + 30; x += 14) {
    vertex(x, y + dir * (8 + noise(x * 0.003 + 50, y * 0.011) * 16));
  }
  endShape();
  noStroke();
}

function drawBandRow(r, middle) {
  noStroke();
  if (middle) {
    for (const p of r.dots) {
      fill(OXIDE[0], OXIDE[1], OXIDE[2], 195);
      blobFill(p.x + 14, p.y + 11, p.r * 0.88, p.vtx ? 5.0 : 2.2, 0.12, p.rot + 0.04, p.sq);
    }
  }
  for (let k = 0; k < r.dots.length; k++) {
    const p = r.dots[k];
    if (middle && k === r.strikeIdx) {
      stampDot(p.x, p.y, p.r * 0.94, p.tone, PAPER_SET);
      stampDot(p.x + p.r * 0.2, p.y + p.r * 0.12, p.r * 0.9, p.tone, PAPER_SET);
      continue;
    }
    stampDot(p.x, p.y, p.r * (middle ? 0.94 : 1.0), p.tone, PAPER_SET);
  }
}

function drawBand() {
  for (let b = 0; b < BANDS.length; b++) drawOneBand(BANDS[b]);
}

function drawOneBand(B) {
  const y0 = rows[B.i0].y - B.pad;
  const y1 = rows[B.i1].y + B.pad;
  noStroke();
  fill(INK[0], INK[1], INK[2], 247);
  rect(-40, y0, W + 80, y1 - y0);

  const ctx = drawingContext;
  ctx.save();
  ctx.beginPath();
  ctx.rect(-40, y0, W + 80, y1 - y0);
  ctx.clip();
  for (let i = 0; i < 26; i++) {
    const x = random(W);
    const y = random(y0, y1);
    const rad = 150 + random(330);
    const gl = random() < 0.5 ? BAND_GLAZE[0] : BAND_GLAZE[1];
    fill(gl[0], gl[1], gl[2], random(4, 9));
    ellipse(x, y, rad * 2, rad * random(0.4, 0.9));
  }
  ctx.restore();

  paperEdge(y0, 1);
  paperEdge(y1, -1);

  // Every covered row gets re-stamped, not just three by number.
  const mid = Math.floor((B.i0 + B.i1) / 2);
  for (let bi = B.i0; bi <= B.i1; bi++) if (bi !== mid) drawBandRow(rows[bi], false);
  drawBandRow(rows[mid], true);
  noStroke();
}

/* ---------- the knot eye ---------- */

function drawEye() {
  push();
  translate(EYE.x, EYE.y);
  noStroke();
  fill(PAPER[0], PAPER[1], PAPER[2], 235);
  beginShape();
  for (let a = 0; a < TWO_PI; a += TWO_PI / 48) {
    const rr = EYE.r + (noise(Math.cos(a) * 1.6 + 21, Math.sin(a) * 1.6 + 33) - 0.5) * 70;
    vertex(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  endShape(CLOSE);

  const ES = EYE.r / 255;
  wobbleRing(232 * ES, [120, 116, 106], 3.5, 120, 9.1);
  for (let rr = 62 * ES; rr <= 178 * ES; rr += 58 * ES) wobbleRing(rr, INK, 11.5, 230, rr * 0.7);

  strokeCap(ROUND);
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * TWO_PI + random(-0.1, 0.1);
    const d0 = random(232, 262) * ES;
    const d1 = d0 + random(38, 68) * ES;
    wobbleLine(Math.cos(a) * d0, Math.sin(a) * d0,
      Math.cos(a) * d1, Math.sin(a) * d1, INK, 5.5, 165, 40 + k * 3);
  }
  for (let k = 0; k < 5; k++) {
    const a = random(-PI * 1.05, PI * 0.15);
    const d = random(290, 368) * ES;
    const x = Math.cos(a) * d,
      y = Math.sin(a) * d;
    const l = random(20, 32);
    wobbleLine(x, y, x + l * 0.7, y + l * 0.7, MADDER, 7, 215, 80 + k * 5);
  }
  wobbleLine(-108 * ES, -108 * ES, 108 * ES, 108 * ES, MADDER, 14, 240, 11);
  wobbleLine(108 * ES, -108 * ES, -108 * ES, 108 * ES, MADDER, 14, 240, 77);
  pop();
  noStroke();
}

/* ---------- seam ---------- */

function seamXAt(y) {
  return SEAM_X + (noise(y * 0.002 + 300) - 0.5) * 26;
}

function drawSeam() {
  const yB0 = BAND ? rows[BAND.i0].y - BAND.pad : -1e6;
  const yB1 = BAND ? rows[BAND.i1].y + BAND.pad : -1e6;
  strokeCap(SQUARE);
  for (let y = 120; y < H - 60; y += 230) {
    const sy = y + (noise(y * 0.05 + 400) - 0.5) * 60;
    const sx = seamXAt(sy);
    const inBand = sy > yB0 + 24 && sy < yB1 - 24;
    const tilt = (noise(sy * 0.01 + 500) - 0.5) * 0.5;
    const len = 13 + random(5);
    if (inBand) stroke(PAPER[0], PAPER[1], PAPER[2], 190);
    else stroke(INK[0], INK[1], INK[2], 150);
    strokeWeight(5);
    line(sx - cos(tilt) * len, sy - sin(tilt) * len,
      sx + cos(tilt) * len, sy + sin(tilt) * len);
  }
  stroke(INK[0], INK[1], INK[2], 140);
  strokeWeight(4.5);
  beginShape();
  for (let y = -20; y <= H + 20; y += 14) vertex(seamXAt(y), y);
  endShape();
  stroke(INK[0], INK[1], INK[2], 70);
  strokeWeight(3);
  beginShape();
  for (let y = -20; y <= H + 20; y += 14) vertex(seamXAt(y) + 9, y);
  endShape();
  if (BAND) {
    stroke(PAPER[0], PAPER[1], PAPER[2], 160);
    strokeWeight(5);
    beginShape();
    for (let y = yB0; y <= yB1; y += 14) vertex(seamXAt(y) + 2, y);
    endShape();
  }
  // oxide cross where the seam meets the madder thread
  const sy2 = rowY(SEAM_X, CFG.accentRow);
  for (let k = -1; k <= 1; k++) {
    wobbleLine(SEAM_X - 30, sy2 + k * 34, SEAM_X + 30, sy2 + k * 34, MADDER, 7, 220, 300 + k * 7);
  }
  noStroke();
}

/* ---------- scattered life ---------- */

function drawRepairs() {
  const n = 3 + floor(random(4));
  for (let k = 0; k < n; k++) {
    repairCross(int(random(ROWS_N)), random(FIELD.x0 + 140, FIELD.x1 - 140));
  }
}

/* little madder knots scattered beside the mends */
function frenchKnots() {
  noStroke();
  const near = [];
  for (let k = 0; k < 3; k++) near.push([int(random(ROWS_N)), random(FIELD.x0 + 160, FIELD.x1 - 160)]);
  for (const s of near) {
    const bx = s[1],
      by = rowY(s[1], s[0]);
    for (let k = 0; k < 3; k++) {
      const a = random(TWO_PI),
        d = random(30, 58);
      const x = bx + cos(a) * d,
        y = by + sin(a) * d;
      fill(OXIDE[0], OXIDE[1], OXIDE[2], 200);
      ellipse(x, y, 9, 9);
      fill(MADDER_L[0], MADDER_L[1], MADDER_L[2], 160);
      ellipse(x - 2, y - 2, 4.5, 4.5);
    }
  }
}

/* faint print registration crosses in quiet inter-row zones */
function registrationMarks() {
  stroke(120, 114, 98, 80);
  strokeWeight(3);
  const pts = [
    [2660, 455],
    [420, 2610]
  ];
  const L = 26;
  for (const p of pts) {
    line(p[0] - L, p[1], p[0] + L, p[1]);
    line(p[0], p[1] - L, p[0], p[1] + L);
  }
  noStroke();
}

function drawThreadEnds() {
  for (let k = 0; k < 12; k++) {
    const i = int(random(0, ROWS_N));
    const x = random(FIELD.x0 + 150, FIELD.x1 - 150);
    if (Math.abs(x - EYE.x) < 380 && Math.abs(rows[i].y - EYE.y) < 380) continue;
    const y = rowY(x, i);
    const ang = Math.atan2(rowY(x + 8, i) - rowY(x - 8, i), 16);
    const dir = ang + (random() < 0.5 ? Math.PI : 0) + random(-0.6, 0.6);
    const c = (random() < 0.3) ? MADDER : GRAYS[Math.max(0, int(random(0, 3)))];
    threadEnd(x, y, dir, c);
  }
}

function drawStrays() {
  noStroke();
  const zones = [];
  for (let k = 0; k < 3; k++) zones.push([260 + random(300), 152 + random(50)]);
  const rowsIdx = [int(random(ROWS_N)), int(random(ROWS_N)), int(random(ROWS_N))];
  for (let k = 0; k < 4; k++) {
    const ri = rowsIdx[floor(random(rowsIdx.length))];
    const side = random() < 0.5 ? -1 : 1;
    let zy = rows[ri].y + side * (rows[ri].amp + 76 + random(36));
    zy = constrain(zy, 185, 2815);
    zones.push([200 + random(2200), zy]);
  }
  for (const z of zones) {
    const x = z[0],
      y = z[1];
    const rad = 7 + random(9);
    const a = 45 + random(45);
    fill(INK[0], INK[1], INK[2], a * 0.4);
    blobFill(x + 2, y + 2, rad * 1.1, 3.1, 0.14, random(-0.1, 0.1), random(0.95, 1.05));
    fill(INK[0], INK[1], INK[2], a);
    blobFill(x, y, rad, 1.7, 0.12, random(-0.1, 0.1), random(0.95, 1.05));
  }
  // one oxide-red stray tucked between the two bottom rows
  const rx = 2450 + random(300),
    ry = 2595 + random(45);
  fill(80, 24, 15, 50);
  blobFill(rx + 2, ry + 2, 11, 3.1, 0.14, 0.05, 1.0);
  fill(MADDER[0], MADDER[1], MADDER[2], 130);
  blobFill(rx, ry, 10, 1.7, 0.12, -0.04, 1.02);
}

/* misregistered ghost of the whole plate, offset up-left */
function ghostPass() {
  push();
  translate(CFG.press.ghost[0], CFG.press.ghost[1]);
  for (let i = 0; i < ROWS_N; i++) {
    const r = rows[i];
    if (r.band) continue;
    if (r.threadW > 0) {
      stroke(GHOST[0], GHOST[1], GHOST[2], 60);
      strokeWeight(r.threadW * 0.9);
      const step = 16;
      let px = -100,
        py = rowY(-100, i);
      for (let x = -100 + step; x <= W + 100; x += step) {
        const y = rowY(x, i);
        line(px, py, x, y);
        px = x;
        py = y;
      }
    }
    if (r.hasBeads) {
      noStroke();
      for (const p of r.dots) {
        if (r.redSeg && p.x > r.redSeg[0] - 8 && p.x < r.redSeg[1] + 8) continue;
        fill(GHOST[0], GHOST[1], GHOST[2], 80);
        blobFill(p.x, p.y, p.r * 0.96, p.vtx ? 5.3 : 2.0, 0.12, p.rot + 0.05, p.sq);
      }
    }
  }
  pop();
  noStroke();
}

/* ---------- paper, frame, grain ---------- */

function mottlePaper() {
  noStroke();
  const tints = CFG.ground.tints;
  for (let i = 0; i < CFG.press.mottle; i++) {
    const t = random(tints);
    fill(t[0], t[1], t[2], random(5, 13));
    const s = random(260, 1100);
    ellipse(random(-150, W + 150), random(-150, H + 150), s, s * random(0.55, 1.5));
  }
}

function fibres(n) {
  strokeCap(ROUND);
  for (let i = 0; i < n; i++) {
    const x = random(W),
      y = random(H);
    const a = random(TWO_PI),
      l = random(4, 16);
    if (random() < 0.55) stroke(110, 102, 86, random(3, 9));
    else stroke(252, 248, 240, random(5, 12));
    strokeWeight(random() < 0.85 ? 1.2 : 2.0);
    line(x, y, x + cos(a) * l, y + sin(a) * l);
  }
  noStroke();
  strokeCap(SQUARE);
}

function specks(n) {
  noStroke();
  for (let i = 0; i < n; i++) {
    fill(INK[0], INK[1], INK[2], random(12, 46));
    const s = 1 + random(2.6);
    rect(random(W), random(H), s, s);
  }
}

function drawFrame() {
  noFill();
  stroke(70, 68, 62, 30);
  strokeWeight(44);
  rect(M + 4, M + 6, W - 2 * M - 8, H - 2 * M - 8);
  stroke(FRAME_C[0], FRAME_C[1], FRAME_C[2]);
  strokeWeight(30);
  rect(M, M, W - 2 * M, H - 2 * M);
  stroke(FRAME_DARK[0], FRAME_DARK[1], FRAME_DARK[2], 120);
  strokeWeight(3);
  rect(M - 22, M - 22, W - 2 * (M - 22), H - 2 * (M - 22));
  stroke(FRAME_DARK[0], FRAME_DARK[1], FRAME_DARK[2]);
  strokeWeight(5);
  rect(M + 52, M + 52, W - 2 * (M + 52), H - 2 * (M + 52));
  stroke(FRAME_DARK[0], FRAME_DARK[1], FRAME_DARK[2], 160);
  strokeWeight(3);
  const t = 40,
    g0 = M + 66;
  const corners = [
    [g0, g0, 1, 1],
    [W - g0, g0, -1, 1],
    [g0, H - g0, 1, -1],
    [W - g0, H - g0, -1, -1]
  ];
  for (let c = 0; c < corners.length; c++) {
    const cx = corners[c][0],
      cy = corners[c][1],
      sx = corners[c][2],
      sy = corners[c][3];
    line(cx, cy, cx + sx * t, cy);
    line(cx, cy, cx, cy + sy * t);
  }
  noStroke();
}

function grainVignette() {
  loadPixels();
  const g = pixels;
  for (let i = 0; i < g.length; i += 4) {
    const p = i >> 2;
    const dx = ((p % W) / W) * 2 - 1;
    const dy = (((p / W) | 0) / H) * 2 - 1;
    const r2 = dx * dx + dy * dy;
    const v = 1 - 0.034 * r2 * r2;
    const n = (random() - 0.5) * CFG.press.grain;
    g[i] = g[i] * v + n;
    g[i + 1] = g[i + 1] * v + n;
    g[i + 2] = g[i + 2] * v + n;
  }
  updatePixels();
}
